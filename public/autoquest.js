'use strict';
// ============================================================ LUMIRA ONLINE — Auto Quest / Quest Navigation
// A high-level controller on top of the systems that already exist (it never moves, fights or loots by itself):
//   * walking: asks the server to walk to a tile / NPC / node ({t:'move'}, {t:'npc'}, {t:'node'}) — the server
//     runs its own A* on the collision grid, so paths go around buildings, trees, water and walls;
//   * other maps: shortest route over the portal graph (GUIDE.portals), walking through every portal in turn;
//   * fighting: the normal target + attack messages (the same as tapping a monster); AUTO combat keeps working and
//     prefers the quest's monsters while a kill objective is active (aqPickTarget);
//   * NPCs: walks there and opens the conversation — accepting / rewards stay with the player.
// Any manual input (joystick, WASD, tap-to-walk, cancel button, a choice dialogue) pauses it at once.
let GUIDE = null;
const AQ = { on: false, key: '', phase: '', stepT: 0, sentT: 0, sentKey: '', lastPos: '', stillT: 0, retries: 0, talkKey: '', talks: 0, nodeIdx: 0, wanderT: 0, resumeAsk: false, lastStage: '' };

// ---- what the tracked quest wants right now
function aqObjective() {
  if (!me) return null;
  const t = me.qs && me.qs.t, a = t && me.qs.a[t], qd = t && QDEF[t];
  if (a && qd) {
    const s = qd.stages[a.s]; if (!s) return null;
    const o = { qid: t, si: a.s, k: s.k, n: a.n, have: a.k, d: a.d, label: qd.th, first: a.s === 0 };
    if (s.k === 'kill') return Object.assign(o, { type: 'kill', mobs: [s.mob] });
    if (s.k === 'visit') return Object.assign(o, { type: 'place', map: s.map, x: s.x, y: s.y, r: s.r || 2 });
    if (s.k === 'gather' || s.k === 'interact' || s.k === 'heal' || s.k === 'sneak') return Object.assign(o, { type: 'node', node: s.node });
    if (s.k === 'collect') {
      if (a.k >= a.n) return Object.assign(o, { type: 'wait' });
      const nodes = GUIDE && Object.entries(GUIDE.nodes).find(([k, l]) => l.some(q => q[4] === s.item));
      if (nodes) return Object.assign(o, { type: 'node', node: nodes[0] });
      const mobs = (GUIDE && GUIDE.drops[s.item]) || []; if (mobs.length) return Object.assign(o, { type: 'kill', mobs, collect: s.item });
      return Object.assign(o, { type: 'none' });
    }
    if (s.npc) return Object.assign(o, { type: 'npc', npc: s.npc, back: !o.first });
    return Object.assign(o, { type: 'none' });
  }
  // the first trial (Iris): kill steps, then back to Iris
  const st = me.q && me.q.step; if (!GUIDE || st == null || st >= GUIDE.legacy.length) return null;
  const [mob, n] = GUIDE.legacy[st], o = { qid: 'legacy', si: st, n, have: me.q.k, label: 'บททดสอบของไอริส' };
  return me.q.k >= n ? Object.assign(o, { type: 'npc', npc: GUIDE.legacyNpc, back: true }) : Object.assign(o, { type: 'kill', mobs: [mob] });
}
// candidate places for an objective: [{map, x, y, r}]
function aqPlaces(o) {
  if (!o || !GUIDE) return [];
  if (o.type === 'npc') { const n = GUIDE.npcs[o.npc]; return n ? [{ map: n[0], x: n[1], y: n[2], r: 1, npc: n[3] }] : []; }
  if (o.type === 'place') return [{ map: o.map, x: o.x, y: o.y, r: o.r }];
  if (o.type === 'node') return (GUIDE.nodes[o.node] || []).map(q => ({ map: q[0], x: q[1], y: q[2], r: 1, node: q[3] }));
  if (o.type === 'kill') { const out = []; for (const mb of o.mobs) for (const z of GUIDE.spawns[mb] || []) out.push({ map: z[0], x: (z[1] + z[3]) / 2, y: (z[2] + z[4]) / 2, r: Math.max(2, (z[3] - z[1]) / 2), zone: z.slice(1), mob: mb }); return out; }
  return [];
}
// gold markers for the minimap / map windows (also used while auto quest is off)
function questMarkTargets() { const o = aqObjective(); return aqPlaces(o); }
// shortest portal route from the current map to any of the goal maps: list of portals to walk through
function aqRoute(goals) {
  if (!map || !GUIDE) return null; if (goals.has(map.id)) return [];
  const prev = { [map.id]: null }, q = [map.id];
  while (q.length) {
    const m = q.shift();
    for (const p of GUIDE.portals[m] || []) {
      if (p.locked || (p.lv && me.lv < p.lv) || p.to in prev || !GUIDE.portals[p.to]) continue;
      prev[p.to] = [m, p]; if (goals.has(p.to)) { const path = []; let c = p.to; while (prev[c]) { path.unshift(prev[c][1]); c = prev[c][0]; } return path; }
      q.push(p.to);
    }
  }
  return null;
}
const aqWalk = (x, y) => !!map && x >= 0 && y >= 0 && x < map.w && y < map.h && !SOLID_T.has(map.t[y * map.w + x]);
function aqSend(key, msg, every = 2600) { // resend the same order only now and then (the server keeps walking)
  const t = performance.now(); if (AQ.sentKey === key && t - AQ.sentT < every) return; AQ.sentKey = key; AQ.sentT = t; send(msg);
}
function aqStatus(s) { if (AQ.phase !== s) { AQ.phase = s; updQuestTrack(); } }
function aqStart() {
  if (!me || me.hp <= 0) return;
  const o = aqObjective(); if (!o) { toast('ไม่มีภารกิจที่ติดตามอยู่'); return; }
  Object.assign(AQ, { on: true, phase: '', sentKey: '', retries: 0, stillT: performance.now(), talks: 0, talkKey: '', resumeAsk: false, lastStage: o.qid + ':' + o.si });
  if (o.type === 'none') { aqStop('ภารกิจขั้นนี้ต้องทำเอง: ' + (o.d || '')); return; }
  toast('▶ AUTO QUEST'); aqTick(); updQuestTrack();
}
function aqStop(msg) { const was = AQ.on; AQ.on = false; AQ.phase = ''; if (msg) { toast(msg); log(msg, '#ffd34d'); } if (was) updQuestTrack(); }
function aqPause() { if (!AQ.on) return; aqStop('Auto Quest หยุดชั่วคราว'); }
// target choice while a kill objective is active: 1 quest monster nearest, 2 anything attacking me
function aqPickTarget(list) {
  const o = AQ.on && aqObjective(); if (!o || o.type !== 'kill') return list[0];
  const m = ents.get(myId); if (!m) return list[0];
  let best = 0, bd = 1e9;
  for (const [id, e] of ents) if (e.kind === 'm' && e.hp > 0 && o.mobs.includes(e.type)) { const d = Math.hypot(e.tx - m.tx, e.ty - m.ty); if (d < bd) { bd = d; best = id; } }
  if (best) return best;
  for (const [id, e] of ents) if (e.kind === 'm' && e.hp > 0 && e.tg === myId) return id;
  return 0;
}
function aqTick() {
  if (!AQ.on || !me || !map) return;
  if (me.hp <= 0) { AQ.on = false; AQ.resumeAsk = true; AQ.phase = ''; updQuestTrack(); return; }
  if ($('wDlg').style.display === 'block') { aqStatus('รอผู้เล่นยืนยัน...'); return; } // a conversation is open: the player reads / chooses
  const o = aqObjective();
  if (!o) { aqStop('ภารกิจสำเร็จ! ✔'); return; }
  const sk = o.qid + ':' + o.si;
  if (sk !== AQ.lastStage) { // objective changed: the old one is complete
    if (o.qid === AQ.lastStage.split(':')[0]) toast('Objective Complete ✔'); else { aqStop('ภารกิจสำเร็จ! แตะ ▶ อีกครั้งเพื่อเริ่มภารกิจถัดไป'); return; }
    AQ.lastStage = sk; AQ.talks = 0; AQ.retries = 0; AQ.sentKey = '';
  }
  if (o.type === 'wait') { aqStatus('กำลังตรวจสอบ...'); return; }
  if (o.type === 'none') { aqStop('ภารกิจขั้นนี้ต้องทำเอง: ' + (o.d || '')); return; }
  const places = aqPlaces(o); if (!places.length) { aqStop(o.type === 'npc' ? 'ไม่พบ NPC เป้าหมาย' : o.type === 'kill' ? 'ไม่พบมอนสเตอร์เป้าหมาย' : 'ไม่พบเป้าหมาย'); return; }
  const goals = new Set(places.map(p => p.map)), route = aqRoute(goals);
  if (!route) { aqStop('ไม่พบเส้นทางไปยังเป้าหมาย'); return; }
  const e = ents.get(myId); if (!e) return;
  const pos = Math.round(e.tx) + ',' + Math.round(e.ty), t = performance.now();
  if (pos !== AQ.lastPos) { AQ.lastPos = pos; AQ.stillT = t; }
  if (route.length) { // walk to the next portal; arriving on it changes the map (server side)
    const p = route[0]; aqStatus(o.back ? 'กำลังกลับไปส่งภารกิจ...' : 'กำลังเดินทาง...');
    aqSend('portal:' + map.id + ':' + p.x + ',' + p.y, { t: 'move', x: p.x, y: p.y });
    if (t - AQ.stillT > 6000) { AQ.sentKey = ''; AQ.stillT = t; if (++AQ.retries > 4) aqStop('ไม่พบเส้นทางไปยังเป้าหมาย'); }
    return;
  }
  const here = places.filter(p => p.map === map.id);
  if (o.type === 'npc') {
    const n = here[0], d = Math.max(Math.abs(n.x - e.tx), Math.abs(n.y - e.ty));
    aqStatus(o.back ? 'กำลังกลับไปส่งภารกิจ...' : 'กำลังไปหา NPC...');
    if (d <= 3) {
      if (AQ.talkKey !== sk) { AQ.talkKey = sk; AQ.talks = 0; }
      if (t - AQ.sentT > 3500) { if (++AQ.talks > 2) { aqStop('ถึง NPC แล้ว — คุยต่อเพื่อทำภารกิจ'); return; } AQ.sentKey = ''; aqSend('npc:' + n.npc, { t: 'npc', id: n.npc }, 3500); }
      return;
    }
    aqSend('npc:' + n.npc, { t: 'npc', id: n.npc }, 4000);
    if (t - AQ.stillT > 7000) { AQ.sentKey = ''; AQ.stillT = t; if (++AQ.retries > 4) aqStop('ไม่พบเส้นทางไปยังเป้าหมาย'); }
    return;
  }
  if (o.type === 'place') {
    const p = here[0]; aqStatus('กำลังเดินทาง...');
    aqSend('place:' + p.x + ',' + p.y, { t: 'move', x: p.x, y: p.y }, 3000);
    if (t - AQ.stillT > 7000) { AQ.sentKey = ''; AQ.stillT = t; if (++AQ.retries > 4) aqStop('ไม่พบเส้นทางไปยังเป้าหมาย'); }
    return;
  }
  if (o.type === 'node') {
    aqStatus('กำลังเก็บของ...');
    const list = here.slice().sort((a, b) => Math.hypot(a.x - e.tx, a.y - e.ty) - Math.hypot(b.x - e.tx, b.y - e.ty));
    const nd = list[AQ.nodeIdx % list.length];
    aqSend('node:' + nd.node, { t: 'node', id: nd.node }, 3200);
    if (t - AQ.stillT > 4500) { AQ.nodeIdx++; AQ.sentKey = ''; AQ.stillT = t; } // used / empty: try the next one
    return;
  }
  if (o.type === 'kill') {
    // already fighting a quest monster (or something hitting me)?
    const cur = selected && ents.get(selected);
    if (cur && cur.kind === 'm' && cur.hp > 0 && (o.mobs.includes(cur.type) || cur.tg === myId)) { aqStatus('กำลังต่อสู้...'); aqSend('atk:' + selected, { t: 'attack', id: selected }, 3000); return; }
    const d = nearest('d', 3); if (d) { aqSend('pick:' + d, { t: 'pick', id: d }, 1500); return; }
    const id = aqPickTarget([]);
    if (id) { setTarget(id); aqStatus('กำลังต่อสู้...'); AQ.sentKey = ''; aqSend('atk:' + id, { t: 'attack', id }, 3000); return; }
    // no quest monster in sight: walk into (another part of) its spawn area
    aqStatus('กำลังหาเป้าหมาย...');
    if (t - AQ.wanderT > 5000 || t - AQ.stillT > 3000) {
      AQ.wanderT = t; AQ.stillT = t;
      const z = here[Math.floor(Math.random() * here.length)].zone;
      for (let i = 0; i < 40; i++) { const x = z[0] + Math.floor(Math.random() * (z[2] - z[0] + 1)), y = z[1] + Math.floor(Math.random() * (z[3] - z[1] + 1)); if (aqWalk(x, y)) { AQ.sentKey = ''; aqSend('wander', { t: 'move', x, y }, 0); break; } }
    }
  }
}
setInterval(aqTick, 600);

// ---- after death: ask before walking off again
let aqWasDead = false;
setInterval(() => {
  if (!me) return; const dead = me.hp <= 0;
  if (dead && AQ.on) { AQ.on = false; AQ.resumeAsk = true; AQ.phase = ''; updQuestTrack(); }
  if (aqWasDead && !dead && AQ.resumeAsk) { AQ.resumeAsk = false; $('aqask').style.display = 'block'; }
  aqWasDead = dead;
}, 400);
$('aqYes').onclick = () => { $('aqask').style.display = 'none'; aqStart(); };
$('aqNo').onclick = () => { $('aqask').style.display = 'none'; };

// ---- tracker controls: ▶ starts / stops, the objective text opens the quest log
$('qauto').addEventListener('click', ev => { ev.stopPropagation(); if (AQ.on) aqStop('ยกเลิก Auto Quest'); else aqStart(); });
$('qt').addEventListener('click', ev => { ev.stopPropagation(); if ($('bQuest')) $('bQuest').click(); });

// ---- direction arrow (works without auto quest too): points at the objective, or at the portal to take
function aqArrowTarget() {
  const o = aqObjective(), places = aqPlaces(o); if (!places.length || !map) return null;
  const goals = new Set(places.map(p => p.map)), route = aqRoute(goals); if (!route) return null;
  const e = ents.get(myId); if (!e) return null;
  if (route.length) return { x: route[0].x, y: route[0].y, txt: `${route.length} แผนที่`, portal: 1 };
  const here = places.filter(p => p.map === map.id).sort((a, b) => Math.hypot(a.x - e.tx, a.y - e.ty) - Math.hypot(b.x - e.tx, b.y - e.ty))[0];
  const dist = Math.hypot(here.x - e.tx, here.y - e.ty); if (dist <= (here.r || 1) + 1.5) return null;
  return { x: here.x, y: here.y, txt: `${o.type === 'npc' ? 'NPC' : o.type === 'kill' ? 'มอนสเตอร์' : 'เป้าหมาย'} ${Math.round(dist * 2)}m` };
}
function drawQuestArrow(A2D, S) {
  if (!me || !map || me.hp <= 0 || HUD.S.qArrow === false) return;
  const tg = aqArrowTarget(); const e = ents.get(myId); if (!tg || !e) return;
  const [X, Y] = A2D((e.x + 0.5) * TP, (e.y + 0.5) * TP - 8), [TX, TY] = A2D((tg.x + 0.5) * TP, (tg.y + 0.5) * TP);
  const a = Math.atan2(TY - Y, TX - X), R = 44 * S, px = X + Math.cos(a) * R, py = Y + Math.sin(a) * R;
  ctx.save(); ctx.translate(px, py); ctx.rotate(a);
  ctx.fillStyle = AQ.on ? '#ffd34d' : '#ffe39acc'; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2 * S;
  ctx.beginPath(); ctx.moveTo(10 * S, 0); ctx.lineTo(-6 * S, -7 * S); ctx.lineTo(-2 * S, 0); ctx.lineTo(-6 * S, 7 * S); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.font = `600 ${9 * S}px Mitr,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3 * S; ctx.strokeStyle = '#1a0f22';
  const lx = X + Math.cos(a) * (R + 18 * S), ly = Y + Math.sin(a) * (R + 14 * S);
  ctx.strokeText(tg.txt, lx, ly); ctx.fillStyle = '#fff3cf'; ctx.fillText(tg.txt, lx, ly);
}
