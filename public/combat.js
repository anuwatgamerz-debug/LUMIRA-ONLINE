'use strict';
// ============================================================ LUMIRA ONLINE — combat UI
// Target system, combat wheel, 6-slot skill hotbar, cooldown overlays, interact button, combat toasts.
// The server decides everything that matters (range, line of sight, SP, cooldown, damage); this file
// only does input, quick pre-checks for instant feedback, and display. Shares state with game.js.
let SK = {}, MELEE_R = 1.6;           // skill definitions + basic attack reach, from 'welcome'
const cdEnd = {}, cdLen = {};         // per-skill cooldown as reported by the server (performance.now() ms)
let gcdEnd = 0, gcdLen = 1;
let lastHit = 0, lastMyHitT = 0;      // mob I hit most recently (target priority #2), time of my last hit
// TARGET_KEEP must exceed what can be on screen (portrait phones show ~20 tiles above/below), or a monster
// you can see and tap would be dropped the moment it's selected
const TARGET_RANGE = 10, TARGET_KEEP = 26;
const SKICON = { bash: 'skill', heal: 'sk_heal', bolt: 'sk_bolt', focus: 'sk_focus', cleave: 'sk_cleave', twin: 'sk_twin' }; // pixel fallback
const SKART = { bash: 'sk_bash', heal: 'sk_heal', bolt: 'sk_bolt', focus: 'sk_focus', cleave: 'sk_cleave', twin: 'sk_twin' }; // art orbs (ui_icons atlas)
// draw a skill's icon on an element: art orb when the atlas is loaded, pixel icon otherwise
function skillIcon(el, sid) {
  if (HUD.sprite(el, SKART[sid])) return true;
  el.style.backgroundSize = el.style.backgroundPosition = ''; el.style.backgroundImage = `url(${HUD.iconURL(SKICON[sid] || 'skill')})`; return false;
}
const SK_TYPE = { target: 'เป้าหมาย', self: 'ใช้กับตัวเอง', area: 'รอบตัว' };
const FAIL_MSG = { sp: 'SP ไม่เพียงพอ', range: 'อยู่นอกระยะ (Out of range)', los: 'มีสิ่งกีดขวางบังอยู่', target: 'เป้าหมายไม่ถูกต้อง', own: 'ยังไม่ได้เรียนสกิลนี้', dead: 'หมดสติอยู่', notarget: 'ไม่มีศัตรูในระยะ', bad: 'สกิลไม่ถูกต้อง' };
const slotEl = [1, 2, 3, 4, 5, 6].map(i => $('sk' + i));
const myEnt = () => ents.get(myId);
const cheb = (a, b) => Math.max(Math.abs(a.tx - b.tx), Math.abs(a.ty - b.ty)); // server positions, same metric as the server

// ------------------------------------------------------------ feedback
let toastT = 0;
function toast(msg) { const t = $('ctoast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1100); }
function anim(b, cls) { if (!b) return; b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls); }
const press = b => anim(b, 'press'), shake = b => anim(b, 'shake');
// Wheel buttons act on pointerdown: a second finger tapping while the joystick is held never produces a
// 'click' (the browser treats it as a multi-touch gesture), and pressing on touch-down also feels faster.
// 'click' stays as the fallback for keyboard / element.click(); the timestamp stops a tap firing twice.
let ghostUntil = 0; // a press acted on pointerdown may open a window; its trailing click must not hit what is now under the finger
function onPress(el, fn) {
  el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; el._pd = performance.now(); ghostUntil = el._pd + 500; fn(); });
  el.addEventListener('click', () => { if (performance.now() - (el._pd || 0) > 700) fn(); });
}
addEventListener('click', e => { if (performance.now() < ghostUntil && e.target.closest('.win')) { e.stopPropagation(); e.preventDefault(); } }, true);

// ------------------------------------------------------------ target system
function setTarget(id) { selected = id; updTarget(); }
function clearTarget() { selected = 0; updTarget(); }
// candidates in range, best first: attacking me > last mob I hit > nearest (ties by id so stacked mobs cycle stably)
function targetList(range = TARGET_RANGE) {
  const m = myEnt(); if (!m) return [];
  const list = [];
  for (const [id, e] of ents) if (e.kind === 'm' && e.hp > 0) { const d = Math.hypot(e.tx - m.tx, e.ty - m.ty); if (d <= range) list.push([id, e, d]); }
  const rank = ([id, e]) => e.tg === myId ? 0 : id === lastHit ? 1 : 2;
  list.sort((a, b) => rank(a) - rank(b) || a[2] - b[2] || a[0] - b[0]);
  return list.map(x => x[0]);
}
// While the player keeps pressing Target/Tab, keep the previous order (monsters move, so re-sorting every
// press would skip some and break Shift+Tab); gone ones drop out, newcomers join the end.
let cyc = [], cycT = 0;
function cycleTarget(dir = 1) {
  const fresh = targetList(), t = performance.now();
  cyc = t - cycT > 2500 ? fresh : cyc.filter(id => fresh.includes(id)).concat(fresh.filter(id => !cyc.includes(id)));
  cycT = t;
  const l = cyc; if (!l.length) { toast('ไม่มีมอนสเตอร์ใกล้ๆ'); return 0; }
  const i = l.indexOf(selected);
  setTarget(i < 0 ? l[0] : l[(i + dir + l.length) % l.length]);
  return selected;
}
let tgPic = 0;
function drawMobPic(type) {
  const g = $('tgpic').getContext('2d'), nm = 'm_' + type, L = META.lpc[nm], P = META.px[nm], im = img(nm);
  if (!im || (!L && !P)) return false;
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 64);
  if (P) { const s = Math.min(1, 64 / P.fw); g.drawImage(im, 0, 2 * P.fh, P.fw, P.fh, (64 - P.fw * s) / 2, (64 - P.fh * s) / 2 + 6 * s, P.fw * s, P.fh * s); }
  else { const c = L.cell, o = (c - 64) / 2; g.drawImage(im, o, (L.anims.walk[0] + 2) * c + o, 64, 64, 0, 0, 64, 64); }
  return true;
}
function updTarget() {
  const e = selected && ents.get(selected), P = $('tgt');
  if (!e || e.kind !== 'm') { P.classList.remove('on'); tgPic = 0; return; }
  P.classList.add('on');
  const info = MOBN[e.type] || {}, pc = Math.max(0, Math.min(100, e.hp / e.maxhp * 100));
  $('tgName').textContent = info.n || e.type; $('tgLv').textContent = 'Lv ' + (info.lv ?? '?');
  $('tgHp').style.width = pc + '%'; $('tgHpT').textContent = `${Math.max(0, e.hp)} / ${e.maxhp} (${Math.ceil(pc)}%)`;
  const m = myEnt(), d = m ? cheb(m, e) : 0;
  const st = [info.boss ? 'บอส' : info.aggro ? 'ดุร้าย' : 'ไม่ก้าวร้าว'];
  if (e.tg === myId) st.unshift('<span class="hot">กำลังโจมตีคุณ</span>');
  st.push(d <= MELEE_R ? 'ในระยะโจมตี' : `<span class="far">ห่าง ${Math.round(d)} ช่อง</span>`);
  $('tgSt').innerHTML = st.join(' · ');
  if (tgPic !== selected && drawMobPic(e.type)) tgPic = selected;
}
$('tgX').onclick = clearTarget;
onPress($('bTgt'), () => { if (me && me.hp > 0 && cycleTarget()) press($('bTgt')); });

// ------------------------------------------------------------ basic attack
function doAttack() {
  if (!me || me.hp <= 0) return;
  const b = $('bAtk');
  let e = selected && ents.get(selected);
  if (!e) { // no target: nearest monster within a sensible range (never NPCs/players)
    const l = targetList(8); if (!l.length) { toast('ไม่มีมอนสเตอร์ใกล้ๆ'); shake(b); return; }
    setTarget(l[0]); e = ents.get(selected);
  }
  const m = myEnt(); if (!m) return;
  if (cheb(m, e) > MELEE_R + 0.15) { toast('อยู่นอกระยะโจมตี (Out of range)'); shake(b); return; }
  press(b); send({ t: 'attack', id: selected, n: 1 });
}
onPress($('bAtk'), doAttack);

// ------------------------------------------------------------ skills
function useSlot(i) {
  if (!me || me.hp <= 0) return;
  const sid = me.hot && me.hot[i], b = slotEl[i];
  if (!sid) { openSkills(i); return; }
  const sk = SK[sid]; if (!sk) return;
  if (!me.sk || !me.sk[sid]) { toast(`ปลดล็อกที่ Lv ${sk.lv}`); shake(b); return; }
  if (performance.now() < Math.max(cdEnd[sid] || 0, gcdEnd)) { shake(b); return; } // server would refuse it anyway
  if (me.sp < sk.sp) { toast('SP ไม่เพียงพอ'); shake(b); return; }
  let id = 0;
  if (sk.type === 'target') {
    let e = selected && ents.get(selected);
    if (!e) { const l = targetList(Math.max(sk.range + 2, 8)); if (!l.length) { toast('เลือกเป้าหมายก่อน'); shake(b); return; } setTarget(l[0]); e = ents.get(selected); }
    const m = myEnt(); if (m && cheb(m, e) > sk.range + 0.15) { toast('อยู่นอกระยะสกิล (Out of range)'); shake(b); return; }
    id = selected;
  }
  press(b); send({ t: 'cast', s: sid, id });
}
slotEl.forEach((b, i) => {
  onPress(b, () => useSlot(i));
  // desktop drag & drop from the skills window
  b.addEventListener('dragover', e => e.preventDefault());
  b.addEventListener('drop', e => { e.preventDefault(); const s = e.dataTransfer.getData('text/skill'); if (s) assignSkill(s, i); });
});
function onCd(m) { // server confirmed a cast: start the overlay from its numbers
  const t = performance.now();
  if (m.s) { cdEnd[m.s] = t + m.ms; cdLen[m.s] = m.ms; }
  if (m.g) { gcdEnd = Math.max(gcdEnd, t + m.g); gcdLen = m.g; }
}
function onCastFail(m) {
  if (m.r === 'cd' && SK[m.s] && m.ms) { cdEnd[m.s] = performance.now() + m.ms; cdLen[m.s] = Math.max(cdLen[m.s] || 0, m.ms); }
  const b = m.s === 'attack' ? $('bAtk') : slotEl[(me && me.hot || []).indexOf(m.s)];
  shake(b);
  if (m.r !== 'cd') toast(m.r === 'own' && m.lv ? `ปลดล็อกที่ Lv ${m.lv}` : FAIL_MSG[m.r] || 'ใช้ไม่ได้ตอนนี้');
}
function renderHotbar() {
  if (!me) return;
  slotEl.forEach((b, i) => {
    const sid = me.hot && me.hot[i], sk = sid && SK[sid], i0 = b.querySelector('.pi');
    b.classList.toggle('empty', !sk);
    b.classList.toggle('lock', !!sk && !(me.sk && me.sk[sid]));
    i0.style.backgroundImage = ''; i0.style.backgroundSize = i0.style.backgroundPosition = '';
    b.classList.toggle('skinned', sk ? skillIcon(i0, sid) : HUD.sprite(i0, 'slot_empty')); // art orb / empty orb frame
    b.querySelector('.ssp').textContent = sk && sk.sp ? sk.sp : '';
    b.querySelector('.slv').textContent = sk && me.sk && me.sk[sid] ? 'Lv' + me.sk[sid] : '';
    b.title = sk ? `${sk.th} (${sk.n}) · SP ${sk.sp}` : 'ช่องว่าง — แตะเพื่อใส่สกิล';
  });
}
let lastCdTxt = [];
function combatFrame() { // cooldown overlays; cheap, only touches slots that are cooling down
  if (!me) return;
  const t = performance.now();
  for (let i = 0; i < 6; i++) {
    const sid = me.hot && me.hot[i], b = slotEl[i];
    const own = sid ? (cdEnd[sid] || 0) : 0, end = Math.max(own, sid ? gcdEnd : 0), rem = end - t;
    if (rem > 0) {
      const tot = own >= gcdEnd ? cdLen[sid] || 1 : gcdLen;
      b.classList.add('cd'); b.style.setProperty('--p', Math.min(1, rem / tot).toFixed(3));
      const txt = own > t && rem > 150 ? (rem / 1000).toFixed(1) : '';
      if (lastCdTxt[i] !== txt) { b.querySelector('.cdt').textContent = txt; lastCdTxt[i] = txt; }
    } else if (b.classList.contains('cd')) { b.classList.remove('cd'); b.querySelector('.cdt').textContent = ''; lastCdTxt[i] = ''; }
  }
}

// ------------------------------------------------------------ skills window: assign to slots (tap, or drag on desktop)
let assignPick = null, assignSlot = -1;
function assignSkill(sid, slot) {
  if (!me || !SK[sid] || !(me.sk && me.sk[sid])) { toast('ใส่ได้เฉพาะสกิลที่เรียนแล้ว'); return; }
  const h = me.hot.slice(); for (let i = 0; i < 6; i++) if (h[i] === sid) h[i] = null; // one slot per skill
  h[slot] = sid; me.hot = h; renderHotbar(); send({ t: 'hot', h });
  assignPick = null; assignSlot = -1;
  if ($('wSkill').style.display === 'block') renderSkills();
}
function clearSlot(slot) { const h = me.hot.slice(); h[slot] = null; me.hot = h; renderHotbar(); send({ t: 'hot', h }); renderSkills(); }
function openSkills(slot) { closeWins(); assignSlot = slot ?? -1; assignPick = null; renderSkills(); $('wSkill').style.display = 'block'; }
function renderSkills() {
  const body = $('skillbody'); body.innerHTML = '';
  const hint = document.createElement('div'); hint.className = 'note'; hint.style.marginBottom = '6px';
  hint.textContent = assignSlot >= 0 ? `เลือกสกิลเพื่อใส่ในช่อง ${assignSlot + 1}` : assignPick ? `เลือกช่องสำหรับ ${SK[assignPick].th}` : 'แตะสกิลแล้วเลือก "ตั้งเป็นช่อง 1-6" (คอมพิวเตอร์ลากสกิลไปวางที่ช่องได้)';
  body.appendChild(hint);
  // hotbar preview
  const row = document.createElement('div'); row.className = 'hotrow';
  for (let i = 0; i < 6; i++) {
    const sid = me.hot[i], b = document.createElement('button'); b.className = 'hs' + (assignSlot === i ? ' on' : '');
    b.innerHTML = `<span class="num">${i + 1}</span>`; if (sid) { const ic = document.createElement('i'); ic.className = 'pi'; skillIcon(ic, sid); b.appendChild(ic); }
    b.onclick = () => { if (assignPick) assignSkill(assignPick, i); else { assignSlot = assignSlot === i ? -1 : i; renderSkills(); } };
    b.addEventListener('dragover', e => e.preventDefault());
    b.addEventListener('drop', e => { e.preventDefault(); const s = e.dataTransfer.getData('text/skill'); if (s) assignSkill(s, i); });
    row.appendChild(b);
  }
  body.appendChild(row);
  const l = document.createElement('div'); l.className = 'list';
  for (const sid in SK) {
    const sk = SK[sid], lv = me.sk && me.sk[sid], d = document.createElement('div');
    d.className = 'li skli' + (lv ? '' : ' locked') + (assignPick === sid ? ' on' : '');
    d.draggable = !!lv; d.addEventListener('dragstart', e => e.dataTransfer.setData('text/skill', sid));
    const ic = document.createElement('i'); ic.className = 'pi'; skillIcon(ic, sid); d.appendChild(ic);
    const slot = me.hot.indexOf(sid);
    d.insertAdjacentHTML('beforeend', `<div class="grow"><b>${esc(sk.th)}</b> <small>${esc(sk.n)}</small> ${lv ? `<small class="num" style="color:#ffe39a">Lv${lv}</small>` : `<small style="color:#ff8b8b">ปลดล็อก Lv ${sk.lv}</small>`}<br><small style="color:var(--dim)">${esc(sk.d)}<br>${SK_TYPE[sk.type]}${sk.range ? ` · ระยะ ${sk.range < 2 ? 'ประชิด' : sk.range + ' ช่อง'}` : ''} · SP ${sk.sp} · คูลดาวน์ ${sk.cd / 1000} วิ${slot >= 0 ? ` · อยู่ช่อง ${slot + 1}` : ''}</small></div>`);
    d.onclick = () => { if (!lv) { toast(`ปลดล็อกที่ Lv ${sk.lv}`); return; } if (assignSlot >= 0) assignSkill(sid, assignSlot); else { assignPick = assignPick === sid ? null : sid; renderSkills(); } };
    l.appendChild(d);
    if (assignPick === sid) { // "set as slot" picker
      const pick = document.createElement('div'); pick.className = 'slotpick';
      pick.innerHTML = '<span>ตั้งเป็นช่อง</span>';
      for (let i = 0; i < 6; i++) { const b = document.createElement('button'); b.className = 'num'; b.textContent = i + 1; b.onclick = e => { e.stopPropagation(); assignSkill(sid, i); }; pick.appendChild(b); }
      if (slot >= 0) { const b = document.createElement('button'); b.textContent = 'เอาออก'; b.onclick = e => { e.stopPropagation(); assignPick = null; clearSlot(slot); }; pick.appendChild(b); }
      l.appendChild(pick);
    }
  }
  body.appendChild(l);
}
$('bSkill').onclick = () => { if ($('wSkill').style.display === 'block') closeWins(); else openSkills(-1); };

// ------------------------------------------------------------ potion / interact
onPress($('bPot'), () => { if (!me || me.hp <= 0) return; const i = me.inv.findIndex(s => s.id === 1); if (i >= 0) { press($('bPot')); send({ t: 'use', i, id: 1 }); } else toast('ไม่มียาแดง'); });
function updPotion() { const pot = me.inv.find(s => s.id === 1), q = pot ? pot.q : 0; $('potq').textContent = q; $('bPot').classList.toggle('dis', !q); $('bPot').disabled = !q; }
let intT = null;
function interactTarget() { // nearby NPC wins when you're right next to it or it's closer than the drop
  const m = myEnt(); if (!m || !map) return null;
  let npc = null, nd = 2.6; for (const n of map.npcs) { const d = Math.max(Math.abs(n.x - m.tx), Math.abs(n.y - m.ty)); if (d < nd) { nd = d; npc = n; } }
  let drop = 0, dd = 3.5; for (const [id, e] of ents) if (e.kind === 'd') { const d = Math.hypot(e.tx - m.tx, e.ty - m.ty); if (d < dd) { dd = d; drop = id; } }
  if (npc && (!drop || nd <= 1.6 || nd <= dd)) return { k: 'n', id: npc.id };
  return drop ? { k: 'd', id: drop } : null;
}
onPress($('bInt'), () => {
  if (!me || me.hp <= 0) return;
  const it = interactTarget(); if (!it) { toast('ไม่มีของหรือ NPC ใกล้ๆ'); return; }
  press($('bInt')); send(it.k === 'n' ? { t: 'npc', id: it.id } : { t: 'pick', id: it.id });
});

// ------------------------------------------------------------ combat state + periodic UI refresh
function combatState() {
  if (!me) return 'idle'; if (me.hp <= 0) return 'dead';
  const e = myEnt(), tn = now();
  if (e && e.castT && tn - e.castT < 0.5) return 'casting';
  if (e && e.atkT && tn - e.atkT < 0.6) return 'attacking';
  if (e && e.hurtT && tn - e.hurtT < 0.3) return 'hit';
  return selected ? 'targeting' : 'idle';
}
setInterval(() => {
  if (!me || !map) return;
  const st = combatState(); if (document.body.dataset.cs !== st) { document.body.dataset.cs = st; document.body.classList.toggle('cs-dead', st === 'dead'); }
  const m = myEnt();
  // drop a target that died / despawned / walked out of reach
  if (selected && (!ents.has(selected) || (m && cheb(m, ents.get(selected)) > TARGET_KEEP))) clearTarget(); else updTarget();
  // unavailable states on the hotbar
  const e = selected && ents.get(selected);
  slotEl.forEach((b, i) => {
    const sid = me.hot && me.hot[i], sk = sid && SK[sid];
    b.classList.toggle('nosp', !!sk && me.sp < sk.sp);
    b.classList.toggle('oor', !!(sk && sk.type === 'target' && e && m && cheb(m, e) > sk.range + 0.15));
  });
  // interact button context
  const it = interactTarget(), k = it ? it.k : '';
  if (intT !== k) {
    intT = k; $('bInt').classList.toggle('dis', !it);
    $('bInt').dataset.icon = k === 'n' ? 'interact' : 'loot'; $('intL').textContent = k === 'n' ? 'คุย' : 'เก็บ'; HUD.applyIcons($('acts'));
  }
}, 150);

// target panel on the art frame: the same elements, placed on the frame's cleaned areas (boxes come from ui.json)
function skinTarget() {
  const t = HUD.UI.man && HUD.UI.man.target; if (!t || !t.boxes) return;
  const P = $('tgt'); P.classList.add('art'); P.style.setProperty('--ar', `${t.w} / ${t.h}`); P.style.backgroundImage = `url(assets/ui/${t.file})`;
  const put = (el, b) => Object.assign(el.style, { left: b[0] + '%', top: b[1] + '%', width: b[2] + '%', height: b[3] + '%' });
  put($('tgpic'), t.boxes.portrait); put($('tgLv'), t.boxes.level); put($('tgName'), t.boxes.name);
  put(P.querySelector('.bar'), t.boxes.hp); put($('tgSt'), t.boxes.status); put($('tgX'), t.boxes.close);
}
// art skin arrived after login: repaint the hotbar, joystick knob and target panel
addEventListener('uiskin', () => { renderHotbar(); HUD.sprite($('knob'), 'joy_knob'); skinTarget(); });
if (HUD.UI.man) { HUD.sprite($('knob'), 'joy_knob'); skinTarget(); }

// ------------------------------------------------------------ AUTO (simple; full auto-combat is Phase 3)
$('bAuto').onclick = null; onPress($('bAuto'), toggleAuto);
let autoAtk = 0, autoSent = 0;
setInterval(() => {
  if (!auto || !me || me.hp <= 0) return;
  if (me.hp < me.maxhp * 0.35) { const i = me.inv.findIndex(s => s.id === 1); if (i >= 0) send({ t: 'use', i, id: 1 }); }
  const d = nearest('d', 3); if (d) { send({ t: 'pick', id: d }); return; }
  if (!selected || !ents.has(selected)) { const l = targetList(14); if (!l.length) return; setTarget(l[0]); }
  const t = performance.now();
  // (re)start the server-side chase when the target changed or nothing has landed for a while
  if (autoAtk !== selected || (t - lastMyHitT > 3000 && t - autoSent > 3000)) { autoAtk = selected; autoSent = t; send({ t: 'attack', id: selected }); }
}, 700);
