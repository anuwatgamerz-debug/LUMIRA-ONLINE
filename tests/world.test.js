'use strict';
// World expansion tests (Milestone 1): content registries, level cap / EXP curve, portals, spawns, drops, NPCs,
// shops, quests, class change, equipment rules, headgear visuals, save/load, map change, death and respawn.
// Runs over the real WebSocket protocol against the throwaway server started by tests/run.js.
const path = require('path');
const H = require('./harness');
const { sleep, login, me, myPos, mobsOf, cheb } = H;
const C = require(path.join(H.ROOT, 'content'));

const STRONG = { str: 99, agi: 40, vit: 60, int: 30, dex: 60, luk: 10 };
const SEEDS = {
  w_cap: H.mkChar('WCap', { lv: 149, exp: C.LV.expNext(149) - 3, map: 'plains', x: 20, y: 22, st: STRONG, eq: { wpn: 22 } }),
  w_max: H.mkChar('WMax', { lv: 150, exp: 999, map: 'plains', x: 20, y: 22 }),
  w_walk: H.mkChar('WWalk', { lv: 6, map: 'lumira', x: 45, y: 20 }),
  w_lock: H.mkChar('WLock', { lv: 15, map: 'beginner_meadow', x: 60, y: 36 }),
  w_lvgate: H.mkChar('WLvGate', { lv: 15, map: 'moonlit_creek', x: 60, y: 45 }),
  w_lvok: H.mkChar('WLvOk', { lv: 20, map: 'moonlit_creek', x: 60, y: 45 }),
  w_drop: H.mkChar('WDrop', { lv: 30, map: 'beginner_meadow', x: 14, y: 14, st: STRONG, eq: { wpn: 22 }, hp: 5000 }),
  w_shop: H.mkChar('WShop', { lv: 8, map: 'lumira', x: 31, y: 10, zeny: 5000 }),
  w_mq1: H.mkChar('WMq', { lv: 2, map: 'lumira', x: 16, y: 10, qs: { a: { mq1: { s: 0, k: 0, f: [] } }, d: {}, t: 'mq1', fl: {} }, save: { map: 'lumira', x: 25, y: 20 } }),
  w_crater: H.mkChar('WCrater', { lv: 3, map: 'beginner_meadow', x: 40, y: 12, qs: { a: { mq1: { s: 1, k: 0, f: [] } }, d: {}, t: 'mq1', fl: {} }, save: { map: 'lumira', x: 15, y: 10 }, inv: [{ id: 1, q: 5 }, { id: 7, q: 1 }] }),
  w_cls9: H.mkChar('WClsNine', { lv: 9, map: 'lumira', x: 9, y: 21 }),
  w_rng: H.mkChar('WRanger', { lv: 12, map: 'lumira', x: 9, y: 21, inv: [{ id: 1, q: 5 }] }),
  w_cer: H.mkChar('WCeremony', { lv: 12, map: 'lumira', x: 9, y: 21, inv: [{ id: 102, q: 4 }], qs: { a: { cls_ranger: { s: 4, k: 0, f: [] } }, d: {}, t: 'cls_ranger', fl: {} } }),
  w_eq: H.mkChar('WEquip', { lv: 12, map: 'lumira', x: 20, y: 24, inv: [{ id: 304, q: 1 }, { id: 350, q: 1 }, { id: 353, q: 1 }, { id: 450, q: 1 }, { id: 205, q: 1 }, { id: 212, q: 1 }, { id: 400, q: 1 }, { id: 402, q: 1 }] }),
  w_save: H.mkChar('WSave', { lv: 11, map: 'lumira', x: 7, y: 11, zeny: 900, inv: [{ id: 104, q: 6 }, { id: 101, q: 2 }] }),
  w_die: H.mkChar('WDie', { lv: 10, map: 'moonlit_creek', x: 28, y: 24, hp: 1, st: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, eq: {}, save: { map: 'lumira', x: 8, y: 10 } }),
  w_baby: H.mkChar('WBaby', { lv: 3, map: 'greenwood', x: 24, y: 22, hp: 9999 }),
  w_tp: H.mkChar('WTp', { lv: 6, map: 'lumira', x: 29, y: 16 }),
};

async function walkTo(c, x, y, ms = 9000) {
  c.send({ t: 'move', x, y }); const t0 = Date.now();
  while (Date.now() - t0 < ms) { const p = myPos(c); if (p && cheb(p, [x, y]) < 0.6) return true; await sleep(150); }
  return false;
}
async function talk(c, id, a) { const k = c.msgs.length; if (a) c.send({ t: 'npcAct', id, a }); else c.send({ t: 'npc', id }); for (let i = 0; i < 40; i++) { const m = c.msgs.slice(k).find(m => m.t === 'dlg' || m.t === 'shop' || m.t === 'storage' || m.t === 'craftui' || m.t === 'bankui'); if (m) return m; await sleep(100); } return null; }
const myTuple = c => c.snap && c.snap.p.find(x => x[0] === c.id);

async function run(srv, R) {
  const ok = R.ok, URL = srv.ws;
  // ---------------------------------------------------------------- content / registries
  ok(C.report.err.length === 0, 'content registries validate (portals, NPC spots, spawns, items, quests, drops)', C.report.err.join('; '));
  const newMobs = Object.values(C.MOBS).filter(m => !m.legacy && !m.dummy && m.behavior !== 'boss');
  const bosses = Object.values(C.MOBS).filter(m => m.boss && !m.legacy);
  ok(newMobs.length >= 20 && bosses.length >= 2, `monster registry: ${newMobs.length} new monsters + ${bosses.length} new bosses`);
  const fields = ['id', 'n', 'lv', 'family', 'hp', 'sp', 'atk', 'def', 'matk', 'mdef', 'spd', 'aspd', 'range', 'aggro', 'exp', 'jexp', 'respawn', 'drops', 'skills', 'element', 'size', 'behavior'];
  ok(newMobs.every(m => fields.every(f => m[f] !== undefined)), 'every monster has the full data set (stats, ranges, exp/jobExp, drops, element, size, behavior)');
  const behaviors = new Set(Object.values(C.MOBS).map(m => m.behavior));
  ok(['passive', 'aggressive', 'assist', 'coward', 'ranged', 'caster', 'healer', 'pack', 'boss'].every(b => behaviors.has(b)), 'all 9 AI behaviors are used', [...behaviors].join(','));
  const sig = newMobs.map(m => [m.hp, m.atk[0], m.atk[1], m.def].join('/'));
  ok(new Set(sig).size === sig.length, 'no two monsters share copy-pasted stats');
  ok(Object.keys(C.MAPS_META).length >= 40 && C.REGIONS.length === 8 && Object.values(C.MAPS_META).filter(m => m.town).length >= 8, `world registry: ${Object.keys(C.MAPS_META).length} maps in ${C.REGIONS.length} regions, ${Object.values(C.MAPS_META).filter(m => m.town).length} cities`);
  const metaFields = ['id', 'name', 'region', 'lv', 'w', 'h', 'env', 'music', 'status'];
  ok(Object.values(C.MAPS_META).every(m => metaFields.every(f => m[f] !== undefined)) && Object.values(C.MAPS).every(m => m.spawn && m.portals && m.npcs && m.spawns && m.nodes && m.safe), 'every map has id/name/region/level/size/env/music + spawn point, portals, NPCs, spawns, nodes, safe zones');
  ok(['lumira', 'solkara', 'beginner_meadow', 'greenwood', 'moonlit_creek', 'old_mine'].every(id => C.MAPS[id]), 'Lv1-30 slice maps are open: Lumira Village, Elyndra Capital, Beginner Meadow, Greenwood, Moonlit Creek, Old Mine');
  const first = Object.values(C.CLASSES).filter(k => k.tier === 1), second = Object.values(C.CLASSES).filter(k => k.tier === 2);
  ok(first.length === 6 && first.every(k => k.status === 'open' && C.QUESTS[k.quest]) && second.length === 12 && Object.values(C.CLASSES).some(k => k.tier === 3), 'class tree: Adventurer -> 6 first classes (open, each with its own quest) -> 12 second -> advanced');
  ok(new Set(first.map(k => C.QUESTS[k.quest].stages.map(s => s.k).join('>'))).size >= 5, 'class change quests differ per class (defend / shoot targets / rune crystals / heal / sneak / craft)');
  const nroles = new Set(C.NPCS.filter(n => n.map === 'solkara').map(n => n.role));
  ok(['shop', 'heal', 'inn', 'storage', 'smith', 'craft', 'board', 'master', 'teleport', 'guild', 'arena', 'bank', 'auction', 'gate', 'event', 'lore'].every(r => nroles.has(r)), 'capital has every NPC role (shops, inn, healer, smith, storage, board, masters, teleport, guild hall, arena, bank, auction, gate, event, lore)');
  const items = Object.values(C.ITEMS);
  ok(['sword', 'greatsword', 'dagger', 'bow', 'staff', 'mace', 'spear', 'wand', 'device'].every(w => items.some(i => i.wt === w)) && ['light', 'medium', 'heavy', 'robe'].every(a => items.some(i => i.at === a)) && ['ring', 'necklace', 'bracelet', 'charm'].every(a => items.some(i => i.ak === a)), 'equipment covers all weapon / armor / accessory types');
  ok([0, 1, 2, 3].every(r => items.some(i => i.ty === 'eq' && i.rar === r)) && !items.some(i => i.rar === 4 && i.buy), 'rarity Common..Epic in play, Legendary never sold in shops');
  ok(Object.values(C.SHOPS).every(s => s.items.every(id => C.ITEMS[id].buy && (C.ITEMS[id].rar || 0) <= 1)) && items.every(i => !i.buy || i.sell <= i.buy / 2), 'economy: shops sell Common/Uncommon only, nothing sells back above half price');
  // ---------------------------------------------------------------- level cap / EXP curve
  const E = C.LV.expNext, d1 = E(11) - E(10), d2 = E(31) - E(30), d3 = E(121) - E(120);
  ok(E(1) === 28 && E(150) === 0 && C.LV.MAX_LEVEL === 150, 'level cap 150 (Lv1 needs 28 EXP as before, nothing past 150)');
  ok(d1 < d2 && d2 < d3 && E(60) / E(30) > 4 && E(120) / E(60) > 5, 'EXP curve is non-linear and steeper in later bands', `${E(10)} ${E(30)} ${E(60)} ${E(90)} ${E(120)} ${E(149)}`);
  {
    const c = await login(URL, 'w_max'); ok(me(c).lv === 150 && me(c).exp === 0 && me(c).next === 0, 'a Lv150 save stays capped (exp 0)'); c.close();
    const k = await login(URL, 'w_cap');
    const pos = myPos(k), mob = mobsOf(k).filter(m => m.type === 'jellop').sort((a, b) => cheb([a.x, a.y], pos) - cheb([b.x, b.y], pos))[0];
    if (mob) { k.send({ t: 'attack', id: mob.id }); await k.wait(m => m.t === 'fx' && m.k === 'die' && m.id === mob.id, 20000); await sleep(400); }
    ok(me(k).lv === 150 && me(k).exp === 0, 'gaining EXP at Lv149 reaches Lv150 and stops there', JSON.stringify({ lv: me(k).lv, exp: me(k).exp }));
    k.close();
  }
  // ---------------------------------------------------------------- portals / map change
  {
    const c = await login(URL, 'w_walk'); c.send({ t: 'move', x: 49, y: 20 });
    const m = await c.wait(m => m.t === 'map' && m.map.id === 'beginner_meadow', 8000);
    ok(!!m && m.x === 1 && m.y === 24, 'walking onto the village east portal leads to Beginner Meadow (spawnX/Y from the portal)');
    ok(m && m.map.npcs.length >= 1 && Array.isArray(m.map.nodes) && m.map.env === 'meadow', 'map packet carries NPCs, nodes and environment of the new map');
    c.close();
    const l = await login(URL, 'w_lock'); l.send({ t: 'move', x: 63, y: 36 });
    const s = await l.wait(m => m.t === 'sys' && /ยังไม่เปิด/.test(m.m), 6000); await sleep(600);
    ok(!!s && !l.msgs.some(m => m.t === 'map' && m.map.id !== 'beginner_meadow'), 'portal to a planned map is locked (message, no map change)');
    l.close();
    const g = await login(URL, 'w_lvgate'); g.send({ t: 'move', x: 63, y: 46 });
    const gs = await g.wait(m => m.t === 'sys' && /Lv 18/.test(m.m), 6000); await sleep(500);
    ok(!!gs && !g.msgs.some(m => m.t === 'map' && m.map.id === 'old_mine'), 'level-gated portal refuses a Lv15 player (Old Mine needs Lv18)');
    g.close();
    const o = await login(URL, 'w_lvok'); o.send({ t: 'move', x: 63, y: 46 });
    ok(!!await o.wait(m => m.t === 'map' && m.map.id === 'old_mine', 6000), 'level-gated portal lets a Lv20 player into the Old Mine');
    // AOI: the snapshot holds only monsters of the player's map
    await sleep(500); const types = new Set(mobsOf(o).map(m => m.type)), mine = new Set(C.MAPS.old_mine.spawns.map(s => s.mob).concat(C.MAPS.old_mine.bosses.map(b => b.mob)));
    ok(types.size > 0 && [...types].every(t => mine.has(t)), 'snapshot carries only monsters of the current map', [...types].join(','));
    o.close();
    const t = await login(URL, 'w_tp'); const dl = await talk(t, 'warp');
    ok(dl && dl.t === 'dlg' && dl.opts.some(o => o[0] === 'go:greenwood' && /🔒/.test(o[1])), 'teleport NPC lists destinations and marks level-locked ones');
    await talk(t, 'warp', 'go:greenwood'); await sleep(400);
    ok(!t.msgs.some(m => m.t === 'map' && m.map.id === 'greenwood'), 'teleport refuses a destination above the player level');
    t.send({ t: 'npcAct', id: 'warp', a: 'go:beginner_meadow' }); ok(!!await t.wait(m => m.t === 'map' && m.map.id === 'beginner_meadow', 3000), 'teleport NPC warps to an allowed map');
    t.close();
  }
  // ---------------------------------------------------------------- spawns / drops / beginner protection
  {
    const c = await login(URL, 'w_drop'); await sleep(300);
    const M = C.MAPS.beginner_meadow, ms = mobsOf(c);
    ok(ms.length > 0 && ms.every(m => !C.SOLID.has(C.get(M, Math.round(m.x), Math.round(m.y)))), 'monsters stand on walkable tiles only');
    const starts = Object.values(C.MAPS).every(mp => mp.spawns.every(s => C.MOBS[s.mob] && s.n > 0));
    ok(starts && ms.every(m => !C.MOBS[m.type].aggro), 'beginner meadow has only non-aggressive monsters');
    let got = null; const k0 = c.msgs.length;
    for (let i = 0; i < 10 && !got; i++) {
      const pos = myPos(c), mob = mobsOf(c).filter(m => m.type === 'dewslime').sort((a, b) => cheb([a.x, a.y], pos) - cheb([b.x, b.y], pos))[0]; if (!mob) { await sleep(800); continue; }
      c.send({ t: 'attack', id: mob.id }); const died = await c.wait(m => m.t === 'fx' && m.k === 'die' && m.id === mob.id, 15000); if (!died) continue;
      await sleep(250); const d = c.snap.d.find(x => Math.abs(x[2] - mob.x) <= 2 && Math.abs(x[3] - mob.y) <= 2); if (d) got = d;
    }
    const table = C.MOBS.dewslime.drops, all = [].concat(...C.DROP_TIERS.map(t => table[t] || [])).map(x => x[0]);
    ok(!!got && all.includes(got[1]), 'server-rolled drops come from the monster drop table', JSON.stringify(got));
    if (got) { c.send({ t: 'pick', id: got[0] }); ok(!!await c.wait(m => m.t === 'sys' && /ได้รับ/.test(m.m), 6000), 'drop can be picked up'); }
    ok(me(c).jexp > 0 || me(c).jlv > 1, 'kills grant job EXP');
    c.close();
    const b = await login(URL, 'w_baby'); const k1 = b.msgs.length; await sleep(4000);
    ok(!b.msgs.slice(k1).some(m => m.t === 'fx' && m.k === 'hit' && m.to === b.id), 'beginner protection: Lv3 player is not attacked first by aggressive monsters');
    b.close();
  }
  // ---------------------------------------------------------------- NPC / shop
  {
    const c = await login(URL, 'w_shop'); const s = await talk(c, 'weapon');
    ok(s && s.t === 'shop' && s.mode === 'buy' && s.items.some(i => i.id === 202), 'weapon merchant opens its own shop list');
    const z0 = me(c).zeny; c.send({ t: 'buy', id: 202, q: 1 }); await sleep(300);
    ok(me(c).zeny === z0 - C.ITEMS[202].buy && me(c).inv.some(x => x.id === 202), 'buying from the opened shop works');
    c.send({ t: 'buy', id: 22, q: 1 }); await sleep(300); ok(me(c).zeny === z0 - C.ITEMS[202].buy, 'items not in this shop cannot be bought');
    c.close();
  }
  // ---------------------------------------------------------------- main quest flow (mq1)
  {
    const c = await login(URL, 'w_mq1');
    ok(me(c).npcq.elder === 'turnin', 'quest giver is marked for the player');
    const d1 = await talk(c, 'elder'); ok(d1 && d1.opts.some(o => o[0] === 'q:mq1'), 'elder offers the main quest line', JSON.stringify(d1 && d1.opts));
    const d2 = await talk(c, 'elder', 'q:mq1'); await sleep(200);
    ok(d2 && /หลุมดาวตก/.test(d2.text) && me(c).qs.a.mq1.s === 1, 'talking advances the quest to the next stage (visit the crater)');
    c.close();
    const w = await login(URL, 'w_crater');
    await walkTo(w, 46, 10); await sleep(400);
    ok(me(w).qs.a.mq1 && me(w).qs.a.mq1.s === 2, 'visiting the crater completes the visit stage');
    w.send({ t: 'node', id: 'shard' }); await w.wait(m => m.t === 'sys' && /เศษรูน/.test(m.m), 5000); await sleep(300);
    ok(me(w).inv.some(s => s.id === 150) && me(w).qs.a.mq1.s === 3, 'gathering the shard node gives the quest item and advances');
    const ri = me(w).inv.findIndex(s => s.id === 7); w.send({ t: 'use', i: ri, id: 7 });
    ok(!!await w.wait(m => m.t === 'map' && m.map.id === 'lumira', 3000), 'return scroll warps to the save point');
    await sleep(300); const fin = await talk(w, 'elder', 'q:mq1'); await sleep(300);
    ok(fin && !me(w).qs.a.mq1 && me(w).qs.d.includes('mq1') && me(w).inv.some(s => s.id === 351) && !me(w).inv.some(s => s.id === 150), 'turning in completes the quest: rewards given, quest item taken', JSON.stringify(me(w).qs));
    ok(me(w).npcq.elder === 'lv' || me(w).npcq.elder === 'avail', 'next main quest becomes visible on the elder');
    w.close();
  }
  // ---------------------------------------------------------------- class change
  {
    const c9 = await login(URL, 'w_cls9'); const d = await talk(c9, 'm_ranger');
    ok(d && d.opts.some(o => /Lv 10/.test(o[1])) && !d.opts.some(o => /❗/.test(o[1])), 'Lv9 cannot take a class change quest (shown as locked)');
    c9.close();
    const r = await login(URL, 'w_rng'); await talk(r, 'm_ranger', 'q:cls_ranger'); const acc = await talk(r, 'm_ranger', 'q:cls_ranger:yes'); await sleep(300);
    ok(acc && me(r).qs.a.cls_ranger && me(r).qs.a.cls_ranger.s === 1 && me(r).inv.some(s => s.id === 202), 'class quest accepted: intro done, training bow handed over');
    const bi = me(r).inv.findIndex(s => s.id === 202); r.send({ t: 'use', i: bi, id: 202 }); await sleep(300);
    ok(me(r).eq.wpn === 202 && me(r).rng >= 6, 'bow equipped: basic attack range 6');
    // shoot the training targets from range
    for (let i = 0; i < 24 && me(r).qs.a.cls_ranger.s === 1; i++) {
      const pos = myPos(r), tg = mobsOf(r).filter(m => m.type === 'target').sort((a, b) => cheb([a.x, a.y], pos) - cheb([b.x, b.y], pos))[0]; if (!tg) { await sleep(500); continue; }
      r.send({ t: 'attack', id: tg.id }); await r.wait(m => m.t === 'fx' && m.k === 'die' && m.id === tg.id, 8000); await sleep(200);
    }
    ok(me(r).qs.a.cls_ranger.s === 2, 'Ranger trial: shooting 5 targets with a bow advances the class quest', JSON.stringify(me(r).qs.a.cls_ranger));
    r.close();
    const cer = await login(URL, 'w_cer'); const sk0 = Object.keys(cer.msgs.find(m => m.t === 'welcome').skills).length;
    await talk(cer, 'm_ranger', 'q:cls_ranger'); const sk = await cer.wait(m => m.t === 'skills', 3000); await sleep(300);
    ok(me(cer).cls === 'ranger' && me(cer).jlv === 1 && !me(cer).inv.some(s => s.id === 102), 'ceremony changes the class to Ranger (items taken, job level reset)');
    ok(sk && Object.keys(sk.skills).length > sk0 && Object.keys(me(cer).sk).some(id => id.startsWith('r_')), 'Ranger skills are learned and sent to the client');
    ok(!!cer.msgs.find(m => m.t === 'fx' && m.k === 'lvup' && m.cls === 'ranger'), 'class change effect is broadcast');
    const d2 = await talk(cer, 'm_vanguard').catch(() => null);
    ok(!Object.keys(me(cer).qs.a).some(id => id.startsWith('cls_')), 'a classed character has no class quest left open');
    cer.close();
  }
  // ---------------------------------------------------------------- equipment rules + headgear visuals
  {
    const c = await login(URL, 'w_eq'); const idx = id => me(c).inv.findIndex(s => s.id === id);
    c.send({ t: 'use', i: idx(304), id: 304 }); const f = await c.wait(m => m.t === 'eqfail', 2000);
    ok(f && me(c).eq.arm !== 304, 'heavy armor for Vanguard Lv14 is refused for a Lv12 Adventurer', f && f.r);
    c.send({ t: 'use', i: idx(212), id: 212 }); await sleep(300); ok(me(c).eq.wpn !== 212, 'class-only weapon (Artisan device) is refused');
    c.send({ t: 'use', i: idx(205), id: 205 }); await sleep(300); ok(me(c).eq.wpn === 205, 'a Lv10 sword that allows Adventurers is equipped');
    c.send({ t: 'use', i: idx(400), id: 400 }); await sleep(200); c.send({ t: 'use', i: idx(402), id: 402 }); await sleep(300);
    ok(me(c).eq.acc1 === 400 && me(c).eq.acc2 === 402, 'two accessories fill both accessory slots');
    c.send({ t: 'use', i: idx(350), id: 350 }); await sleep(400);
    ok(me(c).eq.head === 350 && myTuple(c)[10] === 350, 'headgear equip: the snapshot shows the hat on the character');
    c.send({ t: 'use', i: idx(353), id: 353 }); await sleep(400);
    ok(me(c).eq.head === 353 && myTuple(c)[10] === 353 && me(c).inv.some(s => s.id === 350), 'headgear change: the new helmet replaces the hat immediately');
    c.send({ t: 'use', i: idx(450), id: 450 }); await sleep(400);
    ok(me(c).eq.chead === 450 && me(c).eq.head === 353 && myTuple(c)[10] === 450, 'costume headgear shows over the stat helmet (stats kept)');
    c.send({ t: 'unequip', s: 'chead' }); await sleep(300); c.send({ t: 'unequip', s: 'head' }); await sleep(400);
    ok(!me(c).eq.head && !me(c).eq.chead && myTuple(c)[10] === 0, 'headgear unequip: the visual disappears');
    c.close();
  }
  // ---------------------------------------------------------------- inn save point, storage, crafting, save / load
  {
    const c = await login(URL, 'w_save'); await talk(c, 'inn', 'save'); await sleep(200);
    ok(me(c).save === 'lumira', 'inn sets the save point');
    await walkTo(c, 43, 35); await sleep(200); const so = await talk(c, 'storage');
    ok(so && so.t === 'storage', 'storage keeper opens the storage');
    const i0 = me(c).inv.findIndex(s => s.id === 101); c.send({ t: 'store', a: 'put', i: i0, id: 101, q: 2 }); const stg = await c.next(m => m.t === 'storage', 2000);
    ok(stg && stg.items.some(s => s.id === 101) && !me(c).inv.some(s => s.id === 101), 'items go into storage');
    await walkTo(c, 44, 24); const cu = await talk(c, 'craft');
    ok(cu && cu.t === 'craftui' && cu.recipes.includes('tea'), 'craft NPC opens its recipes');
    c.send({ t: 'craft', r: 'tea' }); await sleep(400);
    ok(me(c).inv.some(s => s.id === 8) && me(c).inv.find(s => s.id === 104).q === 3, 'crafting consumes materials and makes the item');
    c.close(); await sleep(500);
    const c2 = await login(URL, 'w_save');
    ok(me(c2).save === 'lumira' && me(c2).inv.some(s => s.id === 8), 'character save/load: save point, crafted item and bag survive a re-login');
    const so2 = await walkTo(c2, 43, 35) && await talk(c2, 'storage'); ok(so2 && so2.items.some(s => s.id === 101), 'storage contents survive a re-login');
    c2.close();
  }
  // ---------------------------------------------------------------- death and respawn at the save point
  {
    const c = await login(URL, 'w_die'); let died = null;
    for (let i = 0; i < 5 && !died; i++) {
      const pos = myPos(c), mob = mobsOf(c).filter(m => !C.MOBS[m.type].dummy).sort((a, b) => cheb([a.x, a.y], pos) - cheb([b.x, b.y], pos))[0]; if (!mob) { await sleep(800); continue; }
      c.send({ t: 'attack', id: mob.id }); died = await c.wait(m => m.t === 'fx' && m.k === 'pdie' && m.id === c.id, 20000);
    }
    ok(!!died, 'a 1 HP character dies in a fight');
    if (died) {
      const mpP = c.next(m => m.t === 'map', 3000); c.send({ t: 'respawn' }); const mp = await mpP; await sleep(200);
      ok(mp && mp.map.id === 'lumira' && mp.x === 8 && mp.y === 10 && me(c).hp > 0 && me(c).hp <= Math.ceil(me(c).maxhp * 0.6), 'respawn returns to the save point with half HP', JSON.stringify({ map: mp && mp.map.id, x: mp && mp.x, y: mp && mp.y, hp: me(c).hp, max: me(c).maxhp }));
    }
    c.close();
  }
}

module.exports = { SEEDS, run };
