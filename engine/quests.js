'use strict';
// Quest engine. Quest state lives on the character: c.qs = { a: {id: {s, k, f:[node ids]}}, d: {id: day|1}, t: tracked id, fl: {flag: value} }
// The server passes in the few world functions it needs (items, exp, messages), so this file has no
// knowledge of sockets or maps.
const today = () => { const d = new Date(Date.now() + 7 * 3600e3); return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); };
module.exports = function createQuests(C, api) {
  const { QUESTS, ITEMS, CLASSES } = C;
  const st = c => (c.qs = c.qs && typeof c.qs === 'object' ? c.qs : {}, c.qs.a = c.qs.a || {}, c.qs.d = c.qs.d || {}, c.qs.fl = c.qs.fl || {}, c.qs);
  const stageOf = (c, id) => { const a = st(c).a[id]; return a && QUESTS[id] ? QUESTS[id].stages[a.s] : null; };
  const npcOf = (c, s) => (typeof s.npc === 'string' ? s.npc : s.npc[st(c).fl[s.flagKey || 'mq4'] || Object.keys(s.npc)[0]]);
  const sayOf = (c, s) => (s.say && typeof s.say === 'object' ? s.say[st(c).fl.mq4] || Object.values(s.say)[0] : s.say);
  const done = (c, id) => { const v = st(c).d[id]; return !!v && (QUESTS[id].repeat !== 'daily' || v >= today()); };
  function available(c, id) {
    const qd = QUESTS[id], s = st(c); if (!qd || s.a[id] || done(c, id)) return false;
    const r = qd.req || {};
    if (r.lv && c.lv < r.lv) return false; if (r.max && c.lv > r.max) return false;
    if (r.quest && !s.d[r.quest]) return false;
    if (r.cls && (c.cls || 'adventurer') !== r.cls) return false;
    if (r.oneOf === 'class' && Object.keys(s.a).some(k => QUESTS[k] && QUESTS[k].type === 'class')) return false;
    return true;
  }
  // can the quest be picked up but not yet (for "Lv X needed" hints)
  const blockedByLevel = (c, id) => { const qd = QUESTS[id], s = st(c); if (!qd || s.a[id] || done(c, id)) return 0; const r = qd.req || {}; if (r.quest && !s.d[r.quest]) return 0; if (r.cls && (c.cls || 'adventurer') !== r.cls) return 0; return r.lv && c.lv < r.lv ? r.lv : 0; };
  function accept(p, id) {
    const c = p.c; if (!available(c, id)) return false;
    st(c).a[id] = { s: 0, k: 0, f: [] }; if (!st(c).t) st(c).t = id;
    api.sys(p, `[เควสใหม่] ${QUESTS[id].th}`, '#ffd34d');
    enter(p, id); return true;
  }
  function hasRoom(c, items) { let need = 0; for (const [id, q] of items) { const it = ITEMS[id]; if (it.ty === 'eq') need += q; else if (!c.inv.some(s => s.id === id)) need++; } return c.inv.length + need <= 40; }
  // stage reached: show its text, and check things that may already be true (items in the bag, level)
  function enter(p, id) {
    const s = stageOf(p.c, id); if (!s) return;
    if (s.say && !['talk', 'deliver', 'choice'].includes(s.k)) api.sys(p, sayOf(p.c, s), '#e8d9a8');
    if (s.k === 'collect' || s.k === 'gather') checkItems(p, id);
    if (s.k === 'visit') checkVisit(p, id);
    api.changed(p);
  }
  // finish the current stage: take/give items, then move on (or complete the quest)
  function advance(p, id) {
    const c = p.c, qd = QUESTS[id], a = st(c).a[id], s = qd.stages[a.s];
    if (s.give && !hasRoom(c, s.give)) { api.sys(p, 'กระเป๋าเต็ม — เคลียร์ช่องว่างก่อน', '#ff8b8b'); return false; }
    for (const [it, n] of s.take || []) api.take(c, it, n);
    if (s.k === 'deliver') api.take(c, s.item, s.n);
    for (const [it, n] of s.give || []) api.give(c, it, n);
    a.s++; a.k = 0; a.f = [];
    if (a.s >= qd.stages.length) return complete(p, id);
    api.sys(p, `[เควส] ${qd.th}: ${qd.stages[a.s].d}`, '#8fe38f');
    enter(p, id); return true;
  }
  function complete(p, id) {
    const c = p.c, qd = QUESTS[id], s = st(c), R = qd.reward || {};
    const items = [...(R.items || []), ...((R.byFlag && R.byFlag[s.fl.mq4]) || [])];
    delete s.a[id]; s.d[id] = qd.repeat === 'daily' ? today() : 1; if (s.t === id) s.t = Object.keys(s.a)[0] || null;
    if (R.zeny) c.zeny += R.zeny;
    for (const [it, n] of items) if (!api.give(c, it, n)) api.mail(p, it, n);
    api.sys(p, `[เควสสำเร็จ] ${qd.th} — รางวัล${R.exp ? ` EXP ${R.exp}` : ''}${R.zeny ? ` · ${R.zeny} Zeny` : ''}${items.map(([it, n]) => ` · ${ITEMS[it].n} x${n}`).join('')}`, '#ffd34d');
    if (R.exp) api.exp(p, R.exp); if (R.jexp) api.jexp(p, R.jexp);
    if (qd.cls) api.changeClass(p, qd.cls);
    api.changed(p, true);
    return true;
  }
  function checkItems(p, id) {
    const s = stageOf(p.c, id); if (!s || (s.k !== 'collect' && s.k !== 'gather')) return;
    const have = api.count(p.c, s.item); st(p.c).a[id].k = Math.min(have, s.n);
    if (have >= s.n) advance(p, id);
  }
  function checkVisit(p, id) {
    const s = stageOf(p.c, id), c = p.c;
    if (s && s.k === 'visit' && c.map === s.map && Math.hypot(c.x - s.x, c.y - s.y) <= s.r) advance(p, id);
  }
  // ---- events from the game
  function onKill(p, mob, info = {}) {
    for (const id of Object.keys(st(p.c).a)) {
      const s = stageOf(p.c, id); if (!s || s.k !== 'kill' || s.mob !== mob) continue;
      if (s.bow && info.wt !== 'bow') { api.sys(p, 'ต้องสวมธนูขณะยิงเป้า ถึงจะนับ', '#ffb36b'); continue; }
      const a = st(p.c).a[id]; a.k++;
      api.sys(p, `[เควส] ${s.d} ${Math.min(a.k, s.n)}/${s.n}`, '#8fe38f');
      if (a.k >= s.n) advance(p, id); else api.changed(p);
    }
  }
  function onItems(p) { for (const id of Object.keys(st(p.c).a)) checkItems(p, id); }
  function onMove(p) { for (const id of Object.keys(st(p.c).a)) { const s = stageOf(p.c, id); if (s && s.k === 'visit') checkVisit(p, id); } }
  function onCraft(p, rid) {
    for (const id of Object.keys(st(p.c).a)) { const s = stageOf(p.c, id); if (s && s.k === 'craft' && s.recipe === rid) { const a = st(p.c).a[id]; if (++a.k >= (s.n || 1)) advance(p, id); else api.changed(p); } }
  }
  function onWave(p, wid, ok) {
    for (const id of Object.keys(st(p.c).a)) { const s = stageOf(p.c, id); if (s && s.k === 'wave' && s.id === wid) { if (ok) advance(p, id); else api.sys(p, 'บททดสอบล้มเหลว — กลับไปคุยกับครูเพื่อเริ่มใหม่', '#ff8b8b'); } }
  }
  // a node the player touched: what does it do for their quests? returns {item?} or a refusal text
  function nodeUse(p, node, ctx) {
    const c = p.c;
    for (const id of Object.keys(st(c).a)) {
      const s = stageOf(c, id), a = st(c).a[id]; if (!s || s.node !== node.k) continue;
      if (s.k === 'gather') { if (api.count(c, s.item) >= s.n) continue; return { item: s.item, after: () => checkItems(p, id) }; }
      if (s.k === 'interact') { if (a.f.includes(node.id)) return { msg: 'จุดนี้ทำไปแล้ว' }; a.f.push(node.id); a.k = a.f.length; api.sys(p, `[เควส] ${node.n} ${a.k}/${s.n}`, '#8fe38f'); if (a.k >= s.n) advance(p, id); else api.changed(p); return { done: 1 }; }
      if (s.k === 'heal') {
        if (a.f.includes(node.id)) return { msg: 'ทหารคนนี้ได้รับการรักษาแล้ว' };
        if (api.count(c, s.item) < 1) return { msg: `ต้องมี ${ITEMS[s.item].n}` };
        api.take(c, s.item, 1); a.f.push(node.id); a.k = a.f.length; api.sys(p, `[เควส] รักษาแล้ว ${a.k}/${s.n}`, '#8fe38f'); api.fx(p, 'heal');
        if (a.k >= s.n) advance(p, id); else api.changed(p); return { done: 1 };
      }
      if (s.k === 'sneak') { if (ctx.seen) return { msg: 'โจรเห็นเจ้า! สลัดพวกมันให้หลุดก่อน แล้วค่อยลองใหม่ (ลองใช้ม่านควัน หรือเข้าทางที่ไม่มียาม)' }; return { item: s.item, after: () => advance(p, id) }; }
    }
    return null;
  }
  // quests this NPC has something for: [{id, what: 'avail'|'turnin'|'progress'|'lv'}]
  function forNpc(c, key) {
    const out = [];
    for (const qd of Object.values(QUESTS)) {
      const a = st(c).a[qd.id];
      if (a) { const s = qd.stages[a.s]; if (s && s.npc && npcOf(c, s) === key) out.push({ id: qd.id, what: 'turnin' }); else if (qd.giver === key) out.push({ id: qd.id, what: 'progress' }); }
      else if (qd.giver === key) { if (available(c, qd.id)) out.push({ id: qd.id, what: 'avail' }); else { const lv = blockedByLevel(c, qd.id); if (lv) out.push({ id: qd.id, what: 'lv', lv }); } }
    }
    return out;
  }
  // player picked a quest line in an NPC dialog. returns {text, opts}
  function talk(p, key, id, arg) {
    const c = p.c, qd = QUESTS[id]; if (!qd) return null;
    const a = st(c).a[id];
    if (!a) {
      if (qd.giver !== key) return null;
      if (!available(c, id)) { const lv = blockedByLevel(c, id); return { text: lv ? `เควสนี้ต้องการ Lv ${lv}` : 'ยังรับเควสนี้ไม่ได้' }; }
      if (arg !== 'yes') { const s0 = qd.stages[0]; return { text: `【${qd.th}】\n${s0.k === 'talk' && sayOf(c, s0) ? sayOf(c, s0) : s0.d}`, opts: [[`q:${id}:yes`, 'รับเควส'], ['', 'ไว้ก่อน']] }; }
      accept(p, id);
      const s0 = qd.stages[0];
      if (s0.k === 'talk' && npcOf(c, s0) === key) { if (!advance(p, id)) return { text: 'กระเป๋าเต็ม' }; return { text: `รับเควสแล้ว!\nภารกิจ: ${stageText(c, id)}` }; }
      return { text: `รับเควสแล้ว!\nภารกิจ: ${s0.d}` };
    }
    const s = qd.stages[a.s];
    if (!s.npc || npcOf(c, s) !== key) return { text: `${qd.th}\nภารกิจตอนนี้: ${s.d}` };
    if (s.k === 'talk') {
      for (const [it, n] of s.take || []) if (api.count(c, it) < n) return { text: `ยังขาด ${ITEMS[it].n} (${api.count(c, it)}/${n})` };
      const say = sayOf(c, s); if (!advance(p, id)) return { text: 'กระเป๋าเต็ม — เคลียร์ช่องว่างก่อน' };
      return { text: (say || 'ขอบใจมาก') + (st(c).a[id] ? `\n\nภารกิจถัดไป: ${stageText(c, id)}` : '') };
    }
    if (s.k === 'deliver') {
      if (api.count(c, s.item) < s.n) return { text: `ยังขาด ${ITEMS[s.item].n} (${api.count(c, s.item)}/${s.n})` };
      const say = sayOf(c, s); if (!advance(p, id)) return { text: 'กระเป๋าเต็ม — เคลียร์ช่องว่างก่อน' };
      return { text: (say || 'ได้รับของแล้ว ขอบใจมาก!') + (st(c).a[id] ? `\n\nภารกิจถัดไป: ${stageText(c, id)}` : '') };
    }
    if (s.k === 'choice') {
      const pick = s.opts.find(o => o[0] === arg);
      if (!pick) return { text: s.d, opts: s.opts.map(([f, l]) => [`q:${id}:${f}`, l]) };
      st(c).fl[id] = pick[0]; st(c).fl[s.flagKey || id] = pick[0]; advance(p, id);
      return { text: `เจ้าเลือก: ${pick[1]}\n\nภารกิจถัดไป: ${stageText(c, id)}` };
    }
    if (s.k === 'wave') { const r = api.startWave(p, s.id); return { text: r || 'ผู้รุกรานกำลังมาจากประตูตะวันออก! เตรียมตัว!' }; }
    return { text: s.d };
  }
  const stageText = (c, id) => { const s = stageOf(c, id); return s ? s.d : ''; };
  // compact quest state for the client (log + tracker + NPC marks)
  function view(c) {
    const s = st(c), a = {};
    for (const [id, v] of Object.entries(s.a)) { const qd = QUESTS[id], sg = qd && qd.stages[v.s]; if (!sg) continue; a[id] = { s: v.s, k: sg.k === 'collect' || sg.k === 'gather' ? Math.min(api.count(c, sg.item), sg.n) : v.k, n: sg.n || 1, d: sg.d }; }
    return { a, d: Object.keys(s.d).filter(id => done(c, id)), t: s.t && a[s.t] ? s.t : Object.keys(a)[0] || null };
  }
  function abandon(p, id) { const qd = QUESTS[id]; if (!qd || !st(p.c).a[id] || qd.type === 'main') return false; delete st(p.c).a[id]; if (st(p.c).t === id) st(p.c).t = null; api.changed(p); return true; }
  function track(p, id) { if (st(p.c).a[id]) { st(p.c).t = id; api.changed(p); } }
  return { st, available, accept, advance, onKill, onItems, onMove, onCraft, onWave, nodeUse, forNpc, talk, view, abandon, track, done, today, stageOf };
};
