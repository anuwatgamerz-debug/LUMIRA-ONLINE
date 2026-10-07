// ============================================================ ELYNDRA ONLINE — game events -> sounds
// The only place that decides which sound goes with which game event. game.js reports what already happened
// (server messages, map changes, the local player's state) through SND.*; nothing here changes gameplay.
// Combat results (hits, crits, deaths, drops) only sound when the server's message arrives.
(function () {
  'use strict';
  const A = window.AUDIO, REG = window.AUDIO_REG, L = REG.LINKS;
  const fam = type => (MOBN[type] && MOBN[type].family) || 'slime';
  const monSnd = (type, kind) => (MOBN[type] && MOBN[type][kind + 'Sound']) || `mon_${fam(type)}_${kind}`;
  const at = e => (e ? { x: e.x, y: e.y } : {});
  const myWeapon = () => { const w = me && me.eq && ITEMS[me.eq.wpn]; return L.weapon[(w && w.wt) || 'none'] || L.weapon.sword; };
  const weaponOf = e => { const w = e && e.wpn && ITEMS[e.wpn]; return L.weapon[(w && w.wt) || 'none'] || L.weapon.sword; };
  const skillSnd = (sk, which) => { // registry link on the skill, else by element / effect kind
    if (!sk) return null; if (sk[which + 'Sound']) return sk[which + 'Sound'];
    const kind = sk.element || (sk.fx === 'arrow' ? 'arrow' : sk.type === 'area' ? 'area' : sk.type === 'self' ? 'buff' : 'slash');
    const p = L.skillKind[kind] || L.skillKind.slash; return which === 'cast' ? p[0] : p[1];
  };
  const lastCast = {}; // caster id -> {s, t}: the next skill hit from them uses that skill's hit sound

  function onMap(m, first) {
    A.playBGM(m.bgm || 'bgm_heartland_field'); A.playAmbient(m.ambient || L.envAmbient[m.env] || null);
    if (!first) A.playSFX('portal_enter');
    const em = m.portals.map(p => ({ id: 'portal_idle', x: p.x, y: p.y }));
    for (const n of m.npcs) if (n.role === 'smith') em.push({ id: 'smith_hammer', x: n.x, y: n.y, every: 1700 });
    for (const [nm, x, y] of m.deco || []) if ((nm === 'p_tent' || nm === 'prop_tent_01' || nm === 'prop_campfire_01') && !m.town) em.push({ id: 'campfire', x, y });
    A.setEmitters(em);
    boss = null; A.bossLeave(); A.eventEnd();
    questAvailT = performance.now() + 900;
  }
  let questAvailT = 0;
  function onMe(prev, cur) {
    if (!prev) return;
    // quests: accepted / progress / completed (from the quest state the server sends)
    const pa = (prev.qs && prev.qs.a) || {}, ca = (cur.qs && cur.qs.a) || {}, done = new Set((cur.qs && cur.qs.d) || []);
    for (const id in ca) if (!pa[id]) A.playSFX('quest_accept');
    for (const id in pa) if (!ca[id] && done.has(id)) { A.playSFX('quest_complete'); setTimeout(() => A.playSFX('quest_reward'), 700); }
    for (const id in ca) if (pa[id] && (ca[id].k > pa[id].k || ca[id].s > pa[id].s)) A.playSFX('quest_progress');
    if (cur.q && prev.q && cur.q.k > prev.q.k) A.playSFX('quest_progress');
    if (cur.q && prev.q && cur.q.step > prev.q.step) A.playSFX('quest_complete');
    // equipment
    for (const k of ['wpn', 'arm', 'head', 'acc1', 'acc2', 'chead']) { const a = prev.eq[k], b = cur.eq[k]; if (a !== b) { A.playSFX(b ? 'equip' : 'unequip'); break; } }
    if ((cur.jlv || 1) > (prev.jlv || 1) && cur.cls === prev.cls) A.playSFX('job_level');
    if (prev.hp <= 0 && cur.hp > 0) A.playSFX('respawn');
    if (cur.zeny > prev.zeny && !(document.getElementById('wShop').style.display === 'block')) A.playSFX('coin');
    if (performance.now() > questAvailT && questAvailT && cur.npcq && Object.values(cur.npcq).includes('avail')) { questAvailT = 0; A.playSFX('quest_available'); }
  }
  function onFx(m) {
    const t = performance.now();
    if (m.k === 'hit') {
      const a = ents.get(m.from), e = ents.get(m.to);
      if (m.from === myId) {
        if (m.skill) { const lc = lastCast[myId], sk = lc && t - lc.t < 900 && SK[lc.s]; A.playSFX(skillSnd(sk, 'hit') || (m.crit ? 'hit_critical' : 'hit_normal')); }
        else { const [sw, hit] = myWeapon(); A.playSFX(sw); if (!m.dmg) A.playSFX('miss'); else A.playSFX(m.crit ? 'hit_critical' : hit); }
        if (e && e.kind === 'm' && m.dmg) A.playSFX(monSnd(e.type, 'hit'), Object.assign({ vol: 0.6 }, at(e)));
      } else if (m.to === myId) {
        if (a && a.kind === 'm') A.playSFX(monSnd(a.type, 'attack'), at(a));
        A.playSFX(m.dmg ? 'damage_taken' : 'miss');
      } else if (a && a.kind === 'p') { const [, hit] = weaponOf(a); if (m.dmg) A.playSFX(hit, Object.assign({ vol: 0.45, prio: 0 }, at(e || a))); }
      else if (a && a.kind === 'm' && m.dmg) A.playSFX(monSnd(a.type, 'attack'), Object.assign({ vol: 0.5 }, at(a)));
    } else if (m.k === 'cast') {
      const sk = SK[m.s], a = ents.get(m.id); lastCast[m.id] = { s: m.s, t };
      A.playSFX(skillSnd(sk, 'cast') || 'skill_slash_cast', m.id === myId ? {} : Object.assign({ vol: 0.5, prio: 1 }, at(a)));
    } else if (m.k === 'die') { // server confirmed the kill
      const e = ents.get(m.id); if (e && e.kind === 'm') A.playSFX(monSnd(e.type, 'death'), at(e));
      if (e && boss && boss.id === m.id) { boss = null; A.bossLeave(); }
    } else if (m.k === 'lvup') {
      if (m.id === myId) A.playSFX(m.cls ? 'class_change' : 'level_up'); else { const e = ents.get(m.id); A.playSFX('level_up', Object.assign({ vol: 0.35, prio: 1 }, at(e))); }
    } else if (m.k === 'heal') { if (m.id === myId && (m.v > 0 || m.sp > 0) && !(lastCast[myId] && t - lastCast[myId].t < 400)) A.playSFX('heal'); }
    else if (m.k === 'mheal') { const e = ents.get(m.to); A.playSFX('heal', Object.assign({ vol: 0.35, prio: 0 }, at(e))); }
    else if (m.k === 'pdie') { if (m.id === myId) A.playSFX('player_death'); }
    else if (m.k === 'pick') {
      if (m.by === myId) { const it = ITEMS[m.item] || {}; A.playSFX(['pickup_normal', 'pickup_normal', 'pickup_rare', 'pickup_epic', 'pickup_legendary'][it.rar | 0] || 'pickup_normal'); }
    } else if (m.k === 'gather') {
      if (m.id === myId) { const nd = m.node && map && (map.nodes || []).find(n => n.id === m.node); const k = nd && nd.k; A.playSFX(k === 'herb' || k === 'flower' || k === 'root' ? 'gather_herb' : k === 'ore' || k === 'crystal' ? 'gather_ore' : k === 'shrine' ? 'node_shrine' : 'gather_generic'); }
    } else if (m.k === 'aoe') A.playSFX('boss_warning');
    else if (m.k === 'phase') A.playSFX('boss_phase');
  }
  function onMsg(m) {
    if (m.t === 'castfail' || m.t === 'eqfail') A.playSFX('ui_error');
    else if (m.t === 'sys' && /\[บททดสอบ\] ผู้รุกรานระลอก 1/.test(m.m)) { A.playSFX('wave_start'); A.eventMusic('bgm_event_trial'); }
    else if (m.t === 'sys' && /\[บททดสอบ\] (ป้องกันหมู่บ้านสำเร็จ|.*ล้มเหลว)/.test(m.m)) A.eventEnd();
  }
  // per frame: listener position, footsteps by distance walked, boss encounter music, a few monster voices
  let walked = 0, lastPos = null, boss = null, bossSeen = 0, idleT = 0, frameT = 0;
  function onFrame(t) {
    const e = ents.get(myId); if (!e || !map) return;
    A.setListener(e.x, e.y);
    if (lastPos) {
      const d = Math.hypot(e.x - lastPos[0], e.y - lastPos[1]); if (d < 2) walked += d;
      if (!e.moving) walked = Math.min(walked, 0.6);
      if (walked >= 1.25 && e.moving) { walked = 0; A.playSFX('footstep_' + terrain(e)); }
    }
    lastPos = [e.x, e.y];
    if (t - frameT < 400) return; frameT = t;
    // boss encounter: a boss close by switches the music; leaving it (or its death) brings the map music back
    let b = null, bd = 1e9;
    for (const [id, o] of ents) if (o.kind === 'm' && MOBN[o.type] && MOBN[o.type].boss) { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; b = { id, type: o.type }; } }
    if (b && bd < 13) {
      bossSeen = t;
      if (!boss || boss.id !== b.id) { boss = b; A.bossEnter(MOBN[b.type].bgm || 'bgm_boss_common'); A.playSFX(MOBN[b.type].spawnSound || 'boss_spawn'); }
    } else if (boss && (!b || bd > 20 || t - bossSeen > 4000)) { boss = null; A.bossLeave(); }
    // monsters: now and then one nearby monster makes its sound (never a crowd)
    if (t > idleT) {
      idleT = t + 2500 + Math.random() * 3500;
      const near = []; for (const o of ents.values()) if (o.kind === 'm' && !(MOBN[o.type] && MOBN[o.type].boss)) { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < 9) near.push([d, o]); }
      near.sort((x, y) => x[0] - y[0]); const pick = near[Math.floor(Math.random() * Math.min(3, near.length))];
      if (pick) A.playSFX(monSnd(pick[1].type, 'idle'), at(pick[1]));
    }
  }
  function terrain(e) {
    const env = map.env; if (env === 'cave' || env === 'heartwood') return 'cave'; if (env === 'snow') return 'snow';
    const v = map.t[Math.round(e.y) * map.w + Math.round(e.x)];
    if ((v === 3 || v === 9 || v === 0) && map.town) return 'dirt';
    return L.terrain[v] || 'grass';
  }

  // ---------------- UI sounds: delegated, so no button needs its own sound code
  const SILENT = '#acts, #joyzone, #game'; // combat wheel / joystick / world have their own sounds
  document.addEventListener('pointerdown', ev => {
    try {
      const b = ev.target.closest && ev.target.closest('button, .slot, .li, .tb, #pport, #mm, #quest, #log'); if (!b || b.closest(SILENT)) return;
      if (b.closest('#dlgopts')) return A.playSFX(b.classList.contains('ghost') ? 'ui_cancel' : 'ui_confirm');
      if (b.matches('.x')) return; // the window closing makes its own sound
      if (b.closest('#shoplist') && b.tagName === 'BUTTON') return A.playSFX(/ขาย/.test(b.textContent) ? 'sell' : 'buy');
      if (b.closest('.tabs2, #chtabs, .seg')) return A.playSFX('ui_tab');
      A.playSFX('ui_click');
    } catch (e) { }
  }, true);
  document.addEventListener('pointerover', ev => { try { if (ev.pointerType === 'mouse' && ev.target.closest && ev.target.closest('.tb, #moregrid button')) A.playSFX('ui_hover', { vol: 0.5 }); } catch (e) { } }, true);
  // windows opening / closing
  const winState = new Map();
  const mo = new MutationObserver(list => {
    try {
      for (const r of list) {
        const w = r.target; if (!w.classList || !w.classList.contains('win')) continue;
        const open = w.style.display === 'block', was = !!winState.get(w); if (open === was) continue; winState.set(w, open);
        if (open) A.playSFX(w.id === 'wBag' || w.id === 'wEquip' ? 'inventory_open' : 'ui_open'); else A.playSFX('ui_close');
      }
    } catch (e) { }
  });
  for (const w of document.querySelectorAll('.win')) { winState.set(w, w.style.display === 'block'); mo.observe(w, { attributes: true, attributeFilter: ['style'] }); }

  // ---------------- settings window: sound section
  function bindSettings() {
    const S = A.settings();
    document.querySelectorAll('#sndset input[type=range]').forEach(r => {
      const k = r.dataset.k; r.value = S[k]; const out = r.parentNode.querySelector('output'); if (out) out.textContent = S[k] + '%';
      r.oninput = () => { const fn = { master: 'setMasterVolume', music: 'setMusicVolume', sfx: 'setSFXVolume', ambient: 'setAmbientVolume' }[k]; const v = A[fn](r.value); if (out) out.textContent = v + '%'; };
      r.onchange = () => { if (k === 'sfx') A.playSFX('ui_confirm'); };
    });
    const mb = document.getElementById('sndmute'); if (mb) { mb.classList.toggle('on', S.muted); mb.textContent = S.muted ? 'เปิดเสียง' : 'ปิดเสียงทั้งหมด'; mb.onclick = () => { if (A.settings().muted) A.unmute(); else A.mute(); bindSettings(); }; }
    const note = document.getElementById('sndnote'); if (note) { const st = A.state(); note.textContent = !st.supported ? 'เบราว์เซอร์นี้เล่นเสียงไม่ได้ — เกมยังเล่นได้ตามปกติ' : st.unlocked ? '' : 'แตะหน้าจอหนึ่งครั้งเพื่อเปิดเสียง (ข้อจำกัดของเบราว์เซอร์มือถือ)'; }
  }
  document.getElementById('bSet') && document.getElementById('bSet').addEventListener('click', () => setTimeout(bindSettings, 0));
  bindSettings();

  window.SND = { map: onMap, me: onMe, fx: onFx, msg: onMsg, frame: onFrame, bindSettings };
})();
