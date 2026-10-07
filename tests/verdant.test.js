'use strict';
// Milestone 1 + 2 tests: cleanup (job caps, login lockout, teleport fee, event registry, elites) and Region 2
// "Verdant Wilds" (Lv20-45): maps, monsters, elites, bosses, gear tier, story chain, side/daily quests, shops,
// recipes, audio and art references. Runs over the real WebSocket protocol against the test server.
const path = require('path');
const H = require('./harness');
const { sleep, login, me, myPos, cheb } = H;
const C = require(path.join(H.ROOT, 'content'));
const EV = require(path.join(H.ROOT, 'content', 'events'));
const AR = require(path.join(H.ROOT, 'public', 'audio-registry.js'));
const UI = require(path.join(H.ROOT, 'public', 'assets', 'ui', 'ui.json'));

const SEEDS = {
  v_gate15: H.mkChar('VGateLow', { lv: 15, map: 'greenwood', x: 35, y: 4 }),
  v_gate22: H.mkChar('VGateOk', { lv: 22, map: 'greenwood', x: 35, y: 4 }),
  v_fee: H.mkChar('VFee', { lv: 25, map: 'solkara', x: 26, y: 15, zeny: 5000 }),
  v_job: H.mkChar('VJob', { lv: 30, cls: 'ranger', jlv: 50, map: 'solkara', x: 21, y: 20 }),
  v_lock: H.mkChar('VLock', { lv: 5, map: 'lumira', x: 25, y: 20 }),
  v_mq10: H.mkChar('VStory', { lv: 25, map: 'solkara', x: 15, y: 31, qs: { a: {}, d: { mq1: 1, mq2: 1, mq3: 1, mq4: 1, mq5: 1, mq6: 1, mq7: 1, mq8: 1, mq9: 1 }, t: null, fl: { mq4: 'guard' } } }),
  v_haven: H.mkChar('VHaven', { lv: 32, map: 'verdant_haven', x: 19, y: 42, zeny: 20000 }),
};

async function talk(c, id, a, ms = 9000) {
  const k = c.msgs.length; if (a) c.send({ t: 'npcAct', id, a }); else c.send({ t: 'npc', id });
  const t0 = Date.now(); while (Date.now() - t0 < ms) { const m = c.msgs.slice(k).find(m => m.t === 'dlg' || m.t === 'shop'); if (m) return m; await sleep(100); }
  return null;
}
async function walkTo(c, x, y, ms = 9000) {
  c.send({ t: 'move', x, y }); const t0 = Date.now();
  while (Date.now() - t0 < ms) { const p = myPos(c); if (p && cheb(p, [x, y]) < 0.6) return true; if (c.msgs.some(m => m.t === 'map')) return true; await sleep(150); }
  return false;
}

async function run(srv, R) {
  const ok = R.ok, URL = srv.ws;
  // ---------------------------------------------------------------- M1: cleanup
  ok(C.LV.JOB_CAP[0] === 10 && C.LV.JOB_CAP[1] === 40 && C.LV.JOB_CAP[2] === 50 && C.LV.JOB_CAP[3] === 70, 'job level caps: Adventurer 10 / first class 40 / second class 50 / third class 70');
  ok(EV.EVENTS.length >= 3 && EV.EVENTS.every(e => e.id && e.th) && JSON.stringify(EV.rates()) === JSON.stringify({ exp: 1, jexp: 1, drop: 1 }), 'event registry: events are data (content/events.js), all off by default → rates ×1');
  {
    const e = { enabled: true, days: [6], hours: [20, 22], exp: 2 }, sat21 = new Date(2026, 9, 10, 21, 0), sat19 = new Date(2026, 9, 10, 19, 0), sun21 = new Date(2026, 9, 11, 21, 0);
    ok(EV.isActive(e, sat21) && !EV.isActive(e, sat19) && !EV.isActive(e, sun21) && !EV.isActive({ ...e, enabled: false }, sat21), 'event windows: weekday + hour range + enabled flag');
  }
  const elites = Object.values(C.MOBS).filter(m => m.elite);
  ok(elites.length >= 4 && elites.every(m => m.skills.length && m.respawn >= 300 && Object.values(C.MAPS).some(mp => mp.spawns.some(s => s.mob === m.id && s.n === 1))), `elite monsters: ${elites.length}, each rare (1 per map, long respawn) with its own skills`);
  ok(!C.ITEMS[1].aspdPct && Object.values(C.ITEMS).some(i => i.crit) && Object.values(C.ITEMS).some(i => i.aspdPct) && Object.values(C.ITEMS).some(i => i.flee), 'item identity: gear modifiers crit / aspdPct / flee exist (older items unchanged)');
  // job cap applied to an existing save above the new cap
  { const j = await login(URL, 'v_job'); ok(me(j).jlv === 40, 'first-class save with Job Lv 50 is capped to 40 on login', String(me(j).jlv)); j.close(); }
  // login lockout per account (10 wrong passwords in 10 minutes)
  {
    for (let round = 0; round < 2; round++) { const b = H.client(URL); await b.open; for (let i = 0; i < 5; i++) { b.send({ t: 'login', u: 'v_lock', p: 'wrong' + i }); await sleep(220); } await Promise.race([b.closed, sleep(1500)]); b.close(); }
    const c = H.client(URL); await c.open; c.send({ t: 'login', u: 'v_lock', p: H.PW }); const r = await c.wait(m => m.t === 'err' || m.t === 'welcome', 4000);
    ok(r && r.t === 'err' && /ลองใหม่/.test(r.m), 'login locked for a while after 10 wrong passwords (even with the right one)', JSON.stringify(r)); c.close();
  }
  // teleport fee (money sink): cross-region trip costs zeny, shown in the menu
  {
    const f = await login(URL, 'v_fee'); const d = await talk(f, 'warp');
    const opt = d && d.opts.find(o => o[0] === 'go:verdant_haven');
    ok(!!opt && /\d+z/.test(opt[1]), 'teleport menu shows the fee and offers Verdant Haven', JSON.stringify(d && d.opts));
    const z0 = me(f).zeny; f.send({ t: 'npcAct', id: 'warp', a: 'go:verdant_haven' });
    const mp = await f.wait(m => m.t === 'map' && m.map.id === 'verdant_haven', 4000); await sleep(300);
    const fee = (40 + C.MAPS.verdant_haven.lv[0] * 6) * 2;
    ok(!!mp && me(f).zeny === z0 - fee, `teleport to another region charges ${fee}z`, `${z0} -> ${me(f).zeny}`);
    f.close();
  }
  // ---------------------------------------------------------------- M2: Verdant Wilds content
  const V = Object.values(C.MAPS).filter(m => m.region === 'verdant');
  const town = V.filter(m => m.town), fields = V.filter(m => m.kind === 'field'), dung = V.filter(m => m.kind === 'dungeon');
  ok(town.length === 1 && fields.length >= 5 && dung.length >= 1, `Verdant Wilds open: ${town.length} town, ${fields.length} fields, ${dung.length} dungeon`);
  ok(new Set(V.map(m => m.env)).size >= 6 && V.every(m => AR.MUSIC[m.bgm] && AR.AMBIENT[m.ambient]), 'each Verdant map has its own environment (light / trees / ground) and registered music + ambience');
  const vm = Object.values(C.MOBS).filter(m => m.region === 'verdant'), vn = vm.filter(m => !m.boss && !m.elite);
  ok(vn.length >= 20 && new Set(vn.map(m => m.family)).size >= 7 && new Set(vn.map(m => m.behavior)).size >= 6, `Verdant monsters: ${vn.length} (${new Set(vn.map(m => m.family)).size} families, ${new Set(vn.map(m => m.behavior)).size} behaviors)`);
  ok(vm.every(m => m.lv >= 22 && m.lv <= 45) && vn.every(m => Object.values(C.MAPS).some(mp => mp.spawns.some(s => s.mob === m.id))), 'every Verdant monster is Lv22-45 and spawns somewhere');
  ok(vn.every(m => m.drops.common.length && m.drops.common.every(([id]) => C.ITEMS[id])), 'every Verdant monster drops its own materials');
  const vb = vm.filter(m => m.boss), fieldBoss = vb.filter(b => fields.some(f => f.bosses.some(x => x.mob === b.id))), dungBoss = vb.filter(b => dung.some(f => f.bosses.some(x => x.mob === b.id)));
  ok(fieldBoss.length >= 1 && dungBoss.length >= 1 && vb.every(b => b.phases && b.phases.length >= 2 && b.skills.length >= 2 && b.minions && b.drops.veryRare.length), `bosses: ${fieldBoss.length} field + ${dungBoss.length} dungeon, each with phases, skill pattern, minions and a rare drop`);
  ok(vm.filter(m => m.elite).length >= 3, 'Verdant has its own elites');
  const t2 = Object.values(C.ITEMS).filter(i => i.ty === 'eq' && i.req >= 30 && i.req <= 45);
  ok(t2.length >= 30 && ['sword', 'greatsword', 'dagger', 'bow', 'staff', 'mace', 'spear', 'wand', 'device'].every(w => t2.some(i => i.wt === w)) && [0, 1, 2, 3].every(r => t2.some(i => i.rar === r)), `Tier 2 gear (Lv30-45): ${t2.length} pieces, every weapon type, Common..Epic`);
  ok(Object.keys(C.ITEMS).every(id => id in UI.items_lpc.map), 'every item (incl. new ones) has an icon in the item atlas');
  const vq = Object.values(C.QUESTS).filter(q => /^verdant_haven:|^deep_forest:|^beast_valley:/.test(q.giver) || q.id === 'mq10');
  const main = ['mq10', 'mq11', 'mq12', 'mq13', 'mq14', 'mq15'];
  ok(main.every((id, i) => C.QUESTS[id] && C.QUESTS[id].type === 'main' && (i === 0 ? C.QUESTS[id].req.quest === 'mq9' : C.QUESTS[id].req.quest === main[i - 1])), 'main story chapter 2: mq10 → mq15 chained after chapter 1');
  const kinds = new Set(main.flatMap(id => C.QUESTS[id].stages.map(s => s.k)));
  ok(['talk', 'visit', 'kill', 'gather', 'choice', 'deliver', 'interact'].every(k => kinds.has(k)), 'chapter 2 mixes dialogue, travel, investigation, choice, delivery, bosses and the dungeon', [...kinds].join(','));
  ok(vq.filter(q => q.type !== 'main' && q.repeat !== 'daily').length >= 6 && vq.filter(q => q.repeat === 'daily').length >= 1, 'Verdant side quests + daily notices');
  ok(Object.values(C.RECIPES).filter(r => C.ITEMS[r.out[0]].req >= 28 || r.out[0] === 9).length >= 8, 'Verdant crafting recipes (Tier 2 gear + tonic)');
  ok(['h_weapon', 'h_armor', 'h_general'].every(s => C.SHOPS[s]) && C.NPCS.filter(n => n.map === 'verdant_haven').map(n => n.role).filter((r, i, a) => a.indexOf(r) === i).length >= 10, 'Verdant Haven has full NPC services (shops, inn, healer, smith, craft, storage, teleport, board, quests)');
  ok(C.MAPS.greenwood.portals.some(p => p.to === 'deep_forest' && p.req && p.req.lv === 20 && !p.req.locked) && C.MAPS.beast_valley.portals.some(p => p.to === 'ash_plains' && p.req.locked), 'Greenwood → Deep Forest opens at Lv 20; the road to Region 3 stays locked');
  // gameplay: the Greenwood gate
  {
    const lo = await login(URL, 'v_gate15'); await walkTo(lo, 35, 0, 5000); await sleep(600);
    ok(!lo.msgs.some(m => m.t === 'map' && m.map.id === 'deep_forest'), 'Lv 15 cannot enter the Deep Forest'); lo.close();
    const hi = await login(URL, 'v_gate22'); hi.send({ t: 'move', x: 35, y: 0 });
    const mp = await hi.wait(m => m.t === 'map' && m.map.id === 'deep_forest', 8000);
    ok(!!mp && mp.map.npcs.some(n => n.id === 'warden'), 'Lv 22 walks through the gate into the Deep Forest (camp warden there)'); hi.close();
  }
  // welcome carries the elite flag for the client marker
  { const c = H.client(URL); await c.open; c.send({ t: 'login', u: 'v_haven', p: H.PW }); const w = await c.wait(m => m.t === 'welcome', 5000); ok(w && w.mobs && w.mobs.leafchief && w.mobs.leafchief.elite && !w.mobs.vinesnake.elite, 'client gets elite flags (gold ring + ★ name)'); c.close(); }
  // story start in the capital
  {
    const s = await login(URL, 'v_mq10'); const d = await talk(s, 'archivist');
    ok(d && d.opts.some(o => o[0] === 'q:mq10'), 'archivist offers chapter 2 after chapter 1', JSON.stringify(d && d.opts));
    s.close();
  }
  // Verdant Haven shop sells Tier 2
  {
    const h = await login(URL, 'v_haven'); const sh = await talk(h, 'weapon', 'shop');
    ok(sh && sh.t === 'shop' && sh.items.some(i => i.id === 229) && sh.items.every(i => (C.ITEMS[i.id].rar || 0) <= 1), 'Verdant Haven weapon shop sells Tier 2 Common/Uncommon only');
    const z0 = me(h).zeny; h.send({ t: 'buy', id: 229, q: 1 }); await sleep(400);
    ok(me(h).zeny === z0 - C.ITEMS[229].buy && me(h).inv.some(s => s.id === 229), 'buying Tier 2 gear works');
    h.close();
  }
}
module.exports = { run, SEEDS };
