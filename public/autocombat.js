'use strict';
// ============================================================ ELYNDRA ONLINE — AUTO combat settings, Auto Skill, Auto Potion
// Extends the existing AUTO (combat.js) instead of replacing it: the same 'attack' / 'cast' / 'use' / 'pick' messages a
// player sends by hand, at a calm pace (one request per tick, per-skill back-off). The server still validates every
// cast (ownership, SP, cooldown, range, line of sight, alive) and every potion (item exists, alive, cooldown, need).
// Settings are stored on the character (server 'autocfg'); AUTO itself always starts OFF after login.
const AC_DEF = {
  target: 'quest', range: 12, chase: true, cont: true, retarget: true, loot: true, avoidBoss: false, lootQuest: false,
  basic: true, skills: {},
  hpOn: false, hpAt: 40, hpItem: 1, hpFall: true, spOn: false, spAt: 25, spItem: 3, spFall: true,
};
let ACFG = JSON.parse(JSON.stringify(AC_DEF));
const AC = { loaded: false, lastSkill: '', lastCastT: 0, skip: {}, potT: 0, potWait: 0, saveT: 0, tab: 'fight' };
const HP_ITEMS = [1, 2, 5], SP_ITEMS = [3, 6], POT_HUE = { sp: 'hue-rotate(200deg) saturate(1.3)' };

// ---- skill kinds -> which conditions make sense
function skKind(sk) { return sk.heal ? 'heal' : sk.buff ? 'buff' : sk.spRestore ? 'sp' : sk.type === 'area' ? 'area' : sk.type === 'target' ? 'attack' : 'self'; }
const COND = {
  ready: 'ทุกครั้งที่พร้อม', tgtHp: 'HP เป้าหมายต่ำกว่า X%', myHp: 'HP เราต่ำกว่า X%', mySp: 'SP เรามากกว่า X%', spLow: 'SP เราต่ำกว่า X%',
  enemies: 'ศัตรูรอบตัว ≥ X', buff: 'เมื่อบัฟหมด', boss: 'เฉพาะบอส', nonboss: 'ไม่ใช่บอส', quest: 'เฉพาะมอนเควส',
};
const KIND_COND = { attack: ['ready', 'tgtHp', 'mySp', 'boss', 'nonboss', 'quest'], area: ['enemies', 'mySp', 'ready'], heal: ['myHp'], buff: ['buff', 'ready'], sp: ['spLow'], self: ['ready'] };
const KIND_DEF = { attack: ['ready', 50], area: ['enemies', 2], heal: ['myHp', 50], buff: ['buff', 50], sp: ['spLow', 30], self: ['ready', 50] };
const KIND_TH = { attack: 'โจมตี', area: 'โจมตีรอบตัว', heal: 'ฟื้นฟู', buff: 'บัฟ', sp: 'ฟื้น SP', self: 'ใช้กับตัวเอง' };
function skCfg(sid) { // every owned skill has an entry; new ones start OFF (the player turns them on)
  const sk = SK[sid]; if (!sk) return null;
  let c = ACFG.skills[sid]; const k = skKind(sk);
  if (!c) c = ACFG.skills[sid] = { on: false, pr: Object.keys(ACFG.skills).length + 1, cond: KIND_DEF[k][0], val: KIND_DEF[k][1] };
  if (!KIND_COND[k].includes(c.cond)) c.cond = KIND_DEF[k][0];
  return c;
}
const ownedSkills = () => Object.keys((me && me.sk) || {}).filter(id => SK[id]);

// ---- load / save (per character, on the server)
function acLoad() { if (AC.loaded || !me) return; AC.loaded = true; if (me.auto) ACFG = Object.assign(JSON.parse(JSON.stringify(AC_DEF)), me.auto, { skills: Object.assign({}, me.auto.skills || {}) }); acPanel(); }
function acSave() { clearTimeout(AC.saveT); AC.saveT = setTimeout(() => send({ t: 'autocfg', cfg: ACFG }), 400); acPanel(); }

// ---- target choice used by the AUTO loop (combat.js): mode + range + boss filter, quest monsters through Auto Quest
function acPickTarget() {
  const m = ents.get(myId); if (!m) return 0;
  const ok = e => e.kind === 'm' && e.hp > 0 && !(ACFG.avoidBoss && MOBN[e.type] && MOBN[e.type].boss) && !(MOBN[e.type] && MOBN[e.type].dummy && AQ && AQ.on);
  const list = targetList(ACFG.range).filter(id => ok(ents.get(id)));
  if (typeof aqPickTarget === 'function' && typeof AQ !== 'undefined' && AQ.on) { const q = aqPickTarget(list); if (q) return q; } // Auto Quest: its own priority (quest mob, then attackers)
  if (ACFG.target === 'aggro') { const a = list.find(id => ents.get(id).tg === myId); if (a) return a; }
  if (ACFG.target === 'quest') { const qm = questMobs(); const f = list.find(id => qm.includes(ents.get(id).type)); if (f) return f; }
  return list[0] || 0;
}
function questMobs() { const o = typeof aqObjective === 'function' ? aqObjective() : null; return o && o.type === 'kill' ? o.mobs : []; }
function enemiesNear(r) { const m = ents.get(myId); let n = 0; if (m) for (const e of ents.values()) if (e.kind === 'm' && e.hp > 0 && Math.max(Math.abs(e.tx - m.tx), Math.abs(e.ty - m.ty)) <= r) n++; return n; }

// ---- Auto Skill: highest priority usable skill whose condition holds; one request per tick
function acSkillTick() {
  if (!auto || !me || me.hp <= 0) return false;
  const t = performance.now(); if (t < gcdEnd) return false;
  const tg = selected && ents.get(selected), m = ents.get(myId); if (!m) return false;
  const list = ownedSkills().map(id => [id, skCfg(id)]).filter(([, c]) => c && c.on).sort((a, b) => a[1].pr - b[1].pr);
  for (const [sid, c] of list) {
    const sk = SK[sid]; if (t < (cdEnd[sid] || 0) || t < (AC.skip[sid] || 0) || me.sp < sk.sp) continue;
    const k = skKind(sk), hp = me.hp / me.maxhp * 100, sp = me.sp / Math.max(1, me.maxsp) * 100;
    let pass = true;
    switch (c.cond) {
      case 'myHp': pass = hp < c.val; break;
      case 'mySp': pass = sp > c.val; break;
      case 'spLow': pass = sp < c.val; break;
      case 'enemies': pass = enemiesNear(Math.max(1.5, sk.range || 1.8)) >= c.val; break;
      case 'buff': pass = !(me.buffs || []).some(b => sk.buff && b.id === sk.buff.id); break;
      case 'tgtHp': pass = !!tg && tg.hp / tg.maxhp * 100 < c.val; break;
      case 'boss': pass = !!tg && !!(MOBN[tg.type] && MOBN[tg.type].boss); break;
      case 'nonboss': pass = !!tg && !(MOBN[tg.type] && MOBN[tg.type].boss); break;
      case 'quest': pass = !!tg && questMobs().includes(tg.type); break;
    }
    if (k === 'buff' && c.cond === 'ready') pass = pass && !(me.buffs || []).some(b => sk.buff && b.id === sk.buff.id); // a buff is never recast while it runs
    if (!pass) continue;
    let id = 0;
    if (sk.type === 'target') { if (!tg || tg.kind !== 'm' || tg.hp <= 0) continue; if (cheb(m, tg) > sk.range + 0.15) continue; id = selected; }
    if (sk.type === 'area' && !enemiesNear(Math.max(1.5, sk.range || 1.8))) continue;
    AC.lastSkill = sid; AC.lastCastT = t; AC.skip[sid] = t + 700; // never re-ask before the server answered
    send({ t: 'cast', s: sid, id }); return true;
  }
  return false;
}
// cast refused (SP / range / cooldown / line of sight...): skip that skill for a moment, no toast spam
function acCastFailed(m) { if (m.s && m.s === AC.lastSkill && performance.now() - AC.lastCastT < 1500) { AC.skip[m.s] = performance.now() + (m.r === 'cd' && m.ms ? m.ms : 1500); return true; } return false; }

// ---- Auto Potion: below the threshold only; the player's choice first, then the other potions they really own
function invCount(id) { return (me.inv || []).filter(s => s.id === id).reduce((a, s) => a + s.q, 0); }
function pickPotion(kind) {
  const fixed = kind === 'hp' ? ACFG.hpItem : ACFG.spItem, fall = kind === 'hp' ? ACFG.hpFall : ACFG.spFall, pool = kind === 'hp' ? HP_ITEMS : SP_ITEMS;
  const need = kind === 'hp' ? me.maxhp - me.hp : me.maxsp - me.sp, val = id => (kind === 'hp' ? ITEMS[id].heal : ITEMS[id].sp) || 0;
  const usable = id => ITEMS[id] && invCount(id) > 0 && (!ITEMS[id].req || me.lv >= ITEMS[id].req);
  if (fixed && usable(fixed)) return fixed;
  if (fixed && !fall) return 0;
  // best fit: the smallest potion that covers what is missing, else the biggest one we have (least waste)
  const own = pool.filter(usable).sort((a, b) => val(a) - val(b)); if (!own.length) return 0;
  return own.find(id => val(id) >= need) || own[own.length - 1];
}
function acPotionTick() {
  if (!auto || !me || me.hp <= 0) return false;
  const t = performance.now(); if (t < AC.potT || t < AC.potWait) return false;
  for (const kind of ['hp', 'sp']) {
    const on = kind === 'hp' ? ACFG.hpOn : ACFG.spOn, at = kind === 'hp' ? ACFG.hpAt : ACFG.spAt;
    const pc = kind === 'hp' ? me.hp / me.maxhp * 100 : me.sp / Math.max(1, me.maxsp) * 100;
    if (!on || pc >= at) continue;
    const id = pickPotion(kind); if (!id) continue;
    const i = me.inv.findIndex(s => s.id === id); if (i < 0) continue;
    AC.potT = t + 650; send({ t: 'use', i, id, auto: 1 }); return true;
  }
  return false;
}
function acUseFailed(m) { AC.potWait = performance.now() + (/คูลดาวน์/.test(m.r || '') ? 300 : 1200); }
setInterval(() => { if (!auto || !me) return; acLoad(); if (!acPotionTick()) acSkillTick(); }, 250);

// ---- AUTO button: tap = on/off (as before), long press / right click = settings
(function wireAutoButton() {
  const b = $('bAuto'); let timer = 0, long = false;
  b.onclick = null;
  b.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; long = false; clearTimeout(timer); timer = setTimeout(() => { long = true; openAutoCfg(); }, 550); });
  const up = () => { clearTimeout(timer); };
  b.addEventListener('pointerup', e => { up(); if (!long && (e.pointerType !== 'mouse' || e.button === 0)) { b._pd = performance.now(); ghostUntil = b._pd + 500; toggleAuto(); } });
  b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  b.addEventListener('click', () => { if (performance.now() - (b._pd || 0) > 700 && !long) toggleAuto(); });
  b.addEventListener('contextmenu', e => { e.preventDefault(); openAutoCfg(); });
})();
$('acGear').onclick = e => { e.stopPropagation(); openAutoCfg(); };

// ---- small status chip next to AUTO
function acPanel() {
  const p = $('acQuick'); if (!p) return;
  p.classList.toggle('on', !!auto);
  const sk = ownedSkills().some(id => ACFG.skills[id] && ACFG.skills[id].on);
  p.querySelector('.s').classList.toggle('off', !sk); p.querySelector('.h').classList.toggle('off', !ACFG.hpOn); p.querySelector('.p').classList.toggle('off', !ACFG.spOn);
  p.querySelector('.hv').textContent = ACFG.hpOn ? ACFG.hpAt + '%' : 'OFF'; p.querySelector('.pv').textContent = ACFG.spOn ? ACFG.spAt + '%' : 'OFF'; p.querySelector('.sv').textContent = sk ? 'ON' : 'OFF';
}
setInterval(() => { if (me) { acLoad(); acPanel(); } }, 1000);

// ---- settings window
function itemIconHTML(id, cls = '') { return `<i class="aci ${cls}" style="background-image:url(${itemIconURL(id)})"></i>`; }
function openAutoCfg() { if (!me) return; acLoad(); closeWins(); renderAutoCfg(); $('wAuto').style.display = 'block'; }
function renderAutoCfg() {
  const B = $('autobody'), T = AC.tab;
  document.querySelectorAll('#actabs button').forEach(b => b.classList.toggle('on', b.dataset.t === T));
  const tog = (k, lab, v = ACFG[k]) => `<label class="acrow tg ${v ? 'on' : ''}"><input type="checkbox" data-k="${k}" ${v ? 'checked' : ''}><span class="sw"></span>${lab}</label>`;
  const slider = (k, lab, lo, hi, unit) => `<div class="acrow sl"><span>${lab}</span><input type="range" min="${lo}" max="${hi}" step="1" data-k="${k}" value="${ACFG[k]}"><b class="num" data-v="${k}">${ACFG[k]}${unit}</b></div>`;
  let h = '';
  if (T === 'fight') {
    h += tog('_auto', 'เปิด AUTO', auto);
    h += `<div class="acsub">เลือกเป้าหมาย</div><div class="acradio">${[['quest', 'มอนสเตอร์ Quest ก่อน'], ['near', 'มอนสเตอร์ใกล้ที่สุด'], ['aggro', 'มอนสเตอร์ที่โจมตีเราก่อน']].map(([v, l]) => `<label class="${ACFG.target === v ? 'on' : ''}"><input type="radio" name="actg" value="${v}" ${ACFG.target === v ? 'checked' : ''}>${l}</label>`).join('')}</div>`;
    h += slider('range', 'ระยะค้นหา', 4, 20, ' ช่อง');
    h += tog('chase', 'เดินเข้าหาเป้าหมายอัตโนมัติ') + tog('cont', 'โจมตีต่อเนื่อง') + tog('retarget', 'เปลี่ยนเป้าหมายเมื่อมอนตาย') + tog('loot', 'เก็บของหลังฆ่ามอน') + `<div class="acdanger">${tog('avoidBoss', 'หลีกเลี่ยง Boss')}</div>`;
  } else if (T === 'skill') {
    h += tog('basic', 'โจมตีปกติ (Basic Attack)');
    const own = ownedSkills().sort((a, b) => skCfg(a).pr - skCfg(b).pr);
    if (!own.length) h += '<div class="note">ยังไม่มีสกิล</div>';
    h += '<div class="note">ลำดับเลขน้อย = ใช้ก่อน · Server ตรวจ SP/คูลดาวน์/ระยะทุกครั้ง ใช้ไม่ได้จะข้ามไปสกิลถัดไป</div>';
    for (const sid of own) {
      const sk = SK[sid], c = skCfg(sid), k = skKind(sk);
      const conds = KIND_COND[k].map(v => `<option value="${v}" ${c.cond === v ? 'selected' : ''}>${COND[v]}</option>`).join('');
      const needX = ['tgtHp', 'myHp', 'mySp', 'spLow', 'enemies'].includes(c.cond);
      h += `<div class="acsk ${c.on ? 'on' : ''}" data-s="${sid}"><i class="pi aski" data-sid="${sid}"></i><div class="grow"><b>${esc(sk.th || sk.n)}</b> <small>Lv ${me.sk[sid]} · ${KIND_TH[k]} · SP ${sk.sp}</small>
        <div class="acc"><select data-sc="cond">${conds}</select>${needX ? `<input type="number" data-sc="val" min="1" max="99" value="${c.val}">${c.cond === 'enemies' ? 'ตัว' : '%'}` : ''}</div></div>
        <div class="acpr"><button data-sc="up" aria-label="เลื่อนขึ้น">▲</button><b class="num">${c.pr}</b><button data-sc="down" aria-label="เลื่อนลง">▼</button></div>
        <label class="acrow tg sm ${c.on ? 'on' : ''}"><input type="checkbox" data-sc="on" ${c.on ? 'checked' : ''}><span class="sw"></span></label></div>`;
    }
  } else if (T === 'pot') {
    const sel = (k, pool) => `<select data-k="${k}"><option value="0" ${ACFG[k] === 0 ? 'selected' : ''}>อัตโนมัติ (ประหยัดที่สุด)</option>${pool.map(id => `<option value="${id}" ${ACFG[k] === id ? 'selected' : ''}>${esc(ITEMS[id].n)} (+${ITEMS[id].heal || ITEMS[id].sp})</option>`).join('')}</select>`;
    const box = (kind, pool) => {
      const on = kind === 'hp' ? 'hpOn' : 'spOn', at = kind === 'hp' ? 'hpAt' : 'spAt', it = kind === 'hp' ? 'hpItem' : 'spItem', fb = kind === 'hp' ? 'hpFall' : 'spFall', cur = ACFG[it] || pool[0];
      return `<div class="acpot ${ACFG[on] ? 'on' : ''}"><div class="acph">${itemIconHTML(cur)}<b>${kind === 'hp' ? 'HP POTION' : 'SP POTION'}</b></div>${tog(on, kind === 'hp' ? 'ใช้ยา HP อัตโนมัติ' : 'ใช้ยา SP อัตโนมัติ')}
        ${slider(at, (kind === 'hp' ? 'HP' : 'SP') + ' ต่ำกว่า', 10, 90, '%')}<div class="acrow">ยา ${sel(it, pool)}</div>
        <div class="acrow own">${pool.map(id => `<span>${itemIconHTML(id)}<b class="num">${invCount(id)}</b></span>`).join('')}</div>${tog(fb, 'หากยาชนิดนี้หมด ให้ใช้ชนิดอื่นที่มี')}</div>`;
    };
    h += box('hp', HP_ITEMS) + box('sp', SP_ITEMS) + '<div class="note">ใช้ยาเฉพาะเมื่อต่ำกว่าเกณฑ์ · เซิร์ฟเวอร์ตรวจคูลดาวน์และจำนวนยาจริงทุกครั้ง</div>';
  } else {
    h += tog('loot', 'เก็บของที่ดรอปอัตโนมัติ') + tog('lootQuest', 'เก็บเฉพาะของเควส') + '<div class="note">ระบบเก็บของขั้นสูง (กรองตามความหายาก) จะเพิ่มภายหลัง</div>';
  }
  B.innerHTML = h;
  B.querySelectorAll('.aski').forEach(i => skillIcon(i, i.dataset.sid));
  B.querySelectorAll('input[type=checkbox][data-k]').forEach(i => i.onchange = () => { const k = i.dataset.k; if (k === '_auto') { if (i.checked !== auto) toggleAuto(); } else ACFG[k] = i.checked; acSave(); renderAutoCfg(); });
  B.querySelectorAll('input[type=range]').forEach(i => { i.oninput = () => { ACFG[i.dataset.k] = +i.value; const v = B.querySelector(`[data-v="${i.dataset.k}"]`); if (v) v.textContent = i.value + (i.dataset.k === 'range' ? ' ช่อง' : '%'); }; i.onchange = () => acSave(); });
  B.querySelectorAll('input[name=actg]').forEach(i => i.onchange = () => { ACFG.target = i.value; acSave(); renderAutoCfg(); });
  B.querySelectorAll('select[data-k]').forEach(s => s.onchange = () => { ACFG[s.dataset.k] = +s.value; acSave(); renderAutoCfg(); });
  B.querySelectorAll('.acsk').forEach(row => {
    const sid = row.dataset.s, c = skCfg(sid);
    row.querySelector('[data-sc=on]').onchange = e => { c.on = e.target.checked; acSave(); renderAutoCfg(); };
    row.querySelector('[data-sc=cond]').onchange = e => { c.cond = e.target.value; acSave(); renderAutoCfg(); };
    const v = row.querySelector('[data-sc=val]'); if (v) v.onchange = () => { c.val = Math.max(1, Math.min(99, +v.value || 1)); acSave(); };
    const move = d => { const own = ownedSkills().sort((a, b) => skCfg(a).pr - skCfg(b).pr), i = own.indexOf(sid), j = i + d; if (j < 0 || j >= own.length) return; own.splice(j, 0, own.splice(i, 1)[0]); own.forEach((id, n) => { skCfg(id).pr = n + 1; }); acSave(); renderAutoCfg(); };
    row.querySelector('[data-sc=up]').onclick = () => move(-1); row.querySelector('[data-sc=down]').onclick = () => move(1);
  });
}
document.querySelectorAll('#actabs button').forEach(b => b.onclick = () => { AC.tab = b.dataset.t; renderAutoCfg(); });
