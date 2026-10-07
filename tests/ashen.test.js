'use strict';
// Milestone 4 tests: Region 3 "Ashen Frontier" (Lv40-65): maps (town, fields, dungeons, reachability), monsters,
// elites, bosses with the fire area attacks, Tier 3 gear, chapter 3 story, side/daily quests, shops, recipes, audio,
// client art references (environments, world sprites, monster sheets, item icons). Runs over the real WebSocket
// protocol against the test server.
const fs = require('fs');
const path = require('path');
const H = require('./harness');
const { sleep, login, me, myPos, cheb } = H;
const C = require(path.join(H.ROOT, 'content'));
const G = require(path.join(H.ROOT, 'engine', 'mapgen'));
const AR = require(path.join(H.ROOT, 'public', 'audio-registry.js'));
const UI = require(path.join(H.ROOT, 'public', 'assets', 'ui', 'ui.json'));
const META = require(path.join(H.ROOT, 'public', 'assets', 'meta.json'));
const WORLD = require(path.join(H.ROOT, 'public', 'assets', 'world', 'world.json'));

const DONE15 = Object.fromEntries(Array.from({ length: 15 }, (_, i) => ['mq' + (i + 1), 1]));
const SEEDS = {
  a_gate38: H.mkChar('AGateLow', { lv: 38, map: 'beast_valley', x: 66, y: 26 }),
  a_gate41: H.mkChar('AGateOk', { lv: 41, map: 'beast_valley', x: 66, y: 26 }),
  a_mq16: H.mkChar('AStory', { lv: 40, map: 'verdant_haven', x: 21, y: 14, qs: { a: {}, d: DONE15, t: null, fl: { mq4: 'guard', mq11: 'spare' } } }),
  a_shop: H.mkChar('AShop', { lv: 48, map: 'emberhold', x: 15, y: 41, zeny: 60000 }),
  a_fee: H.mkChar('AFee', { lv: 45, map: 'solkara', x: 26, y: 15, zeny: 20000 }),
  a_beacon: H.mkChar('ABeacon', { lv: 43, map: 'ash_plains', x: 24, y: 16, st: { str: 40, agi: 60, vit: 80, int: 5, dex: 40, luk: 5 }, eq: { wpn: 247, arm: 325 }, qs: { a: { mq17: { s: 1, k: 0, f: [] } }, d: { ...DONE15, mq16: 1 }, t: 'mq17', fl: { mq4: 'guard', mq11: 'spare' } } }),
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
// tiles reachable on foot from the map's spawn point
function reach(m) {
  const walk = (x, y) => !G.SOLID.has(G.get(m, x, y)), seen = new Uint8Array(m.w * m.h), q = [[m.spawn.x, m.spawn.y]]; seen[m.spawn.y * m.w + m.spawn.x] = 1;
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= m.w || b >= m.h || seen[b * m.w + a] || !walk(a, b)) continue; seen[b * m.w + a] = 1; q.push([a, b]); } }
  return (x, y) => !!seen[y * m.w + x];
}

async function run(srv, R) {
  const ok = R.ok, URL = srv.ws;
  // ---------------------------------------------------------------- maps
  const A = Object.values(C.MAPS).filter(m => m.region === 'ashen');
  const town = A.filter(m => m.town), fields = A.filter(m => m.kind === 'field'), dung = A.filter(m => m.kind === 'dungeon');
  ok(town.length === 1 && fields.length >= 4 && dung.length >= 2, `Ashen Frontier open: ${town.length} town, ${fields.length} fields, ${dung.length} dungeons`);
  ok(new Set(A.map(m => m.env)).size >= 6 && A.every(m => AR.MUSIC[m.bgm] && AR.AMBIENT[m.ambient]), 'each Ashen map has its own environment and registered music + ambience');
  const worldSrc = fs.readFileSync(path.join(H.ROOT, 'public', 'world.js'), 'utf8');
  ok(A.every(m => new RegExp(`\\n\\s*${m.env}: \\{`).test(worldSrc)) && /lava: 1/.test(worldSrc) && /function drawEmbers/.test(worldSrc), 'client draws every Ashen environment (ash tone, lava, embers)');
  {
    const bad = [];
    for (const m of A) { const ok2 = reach(m); for (const p of m.portals) if (!ok2(p.x, p.y)) bad.push(`${m.id} portal ${p.to}`); for (const b of m.bosses) if (!ok2(b.x, b.y)) bad.push(`${m.id} boss`); for (const n of [...m.nodes, ...m.npcs]) if (!ok2(n.x, n.y)) bad.push(`${m.id} ${n.id}`); }
    ok(!bad.length, 'every portal, boss spot, node and NPC of the Ashen maps is reachable on foot from the map entry', bad.join(', '));
  }
  ok(C.MAPS.beast_valley.portals.some(p => p.to === 'ash_plains' && p.req && p.req.lv === 40 && !p.req.locked) && C.MAPS.emberhold.portals.some(p => p.to === 'volcanic_road' && p.req.lv === 46),
    'Beast Valley → Ash Plains opens at Lv 40; deeper Ashen maps are level-gated');
  ok(['solkara', 'verdant_haven'].every(t => C.NPCS.some(n => n.map === t && n.role === 'teleport' && n.dest.some(d => d[0] === 'emberhold'))), 'teleporters in the capital and Verdant Haven go to Emberhold');
  // ---------------------------------------------------------------- monsters
  const am = Object.values(C.MOBS).filter(m => m.region === 'ashen'), an = am.filter(m => !m.boss && !m.elite);
  ok(an.length >= 18 && new Set(an.map(m => m.family)).size >= 8 && new Set(an.map(m => m.behavior)).size >= 6, `Ashen monsters: ${an.length} (${new Set(an.map(m => m.family)).size} families, ${new Set(an.map(m => m.behavior)).size} behaviors)`);
  ok(am.every(m => m.lv >= 40 && m.lv <= 65) && an.every(m => Object.values(C.MAPS).some(mp => mp.spawns.some(s => s.mob === m.id))), 'every Ashen monster is Lv40-65 and spawns somewhere');
  ok(an.every(m => m.drops.common.length && m.drops.common.every(([id]) => C.ITEMS[id] && id >= 500)), 'every Ashen monster drops its own Region 3 materials');
  ok(am.every(m => !m.spr.startsWith('m_') || (META.px[m.spr] || META.lpc[m.spr])) && am.filter(m => m.spr.startsWith('m_lpc2_')).every(m => fs.existsSync(path.join(H.ROOT, 'public', 'assets', m.spr + '.png'))), 'every Ashen monster sheet is registered and on disk');
  ok(new Set(am.filter(m => m.spr.startsWith('m_lpc2_')).map(m => m.spr)).size >= 10, 'Ashen humanoids have their own LPC sheets (orcs, troll, salamander, cultists, herald …)');
  const ab = am.filter(m => m.boss), fb = ab.filter(b => fields.some(f => f.bosses.some(x => x.mob === b.id))), db = ab.filter(b => dung.some(f => f.bosses.some(x => x.mob === b.id)));
  ok(fb.length >= 2 && db.length >= 2 && ab.every(b => b.phases && b.phases.length >= 2 && b.skills.length >= 3 && b.minions && b.drops.veryRare.length && b.bgm === 'bgm_boss_ashen'), `bosses: ${fb.length} field + ${db.length} dungeon, each with phases, skill pattern, minions, a rare drop and the Ashen boss theme`);
  ok(am.filter(m => m.elite).length >= 4, 'Ashen Frontier has its own elites');
  const srvSrc = fs.readFileSync(path.join(H.ROOT, 'server.js'), 'utf8');
  ok(am.some(m => m.skills.includes('eruption')) && am.some(m => m.skills.includes('flame_nova')) && /eruption: \{/.test(srvSrc) && /flame_nova: \{/.test(srvSrc), 'fire area attacks (eruption / flame_nova) used by Ashen bosses + elites and known to the server');
  // ---------------------------------------------------------------- items
  const t3 = Object.values(C.ITEMS).filter(i => i.ty === 'eq' && i.req >= 46 && i.req <= 65);
  ok(t3.length >= 40 && ['sword', 'greatsword', 'dagger', 'bow', 'staff', 'mace', 'spear', 'wand', 'device'].every(w => t3.some(i => i.wt === w)) && [0, 1, 2, 3].every(r => t3.some(i => i.rar === r)), `Tier 3 gear (Lv46-65): ${t3.length} pieces, every weapon type, Common..Epic`);
  { const pw = i => i.atk + (i.matk || 0), t2 = Object.values(C.ITEMS).filter(i => i.slot === 'wpn' && i.req >= 30 && i.req <= 45);
    ok(t3.filter(i => i.slot === 'wpn').every(i => t2.filter(o => o.wt === i.wt && o.rar <= i.rar).every(o => pw(i) > pw(o))), 'every Tier 3 weapon beats Tier 2 weapons of the same type and rarity'); }
  ok(Object.keys(C.ITEMS).every(id => id in UI.items_lpc.map), 'every item (incl. Region 3) has an icon in the item atlas');
  ok(['tree_dead_01', 'tree_dead_02', 'tree_ash_01', 'rock_basalt_01', 'rock_lava_01', 'veg_ashgrass_01', 'veg_ember_bush_01'].every(k => WORLD[k] && fs.existsSync(path.join(H.ROOT, 'public', 'assets', WORLD[k].path + '.png'))), 'Ashen world sprites (dead trees, basalt, lava rocks, ash grass) are registered and on disk');
  // ---------------------------------------------------------------- quests, shops, recipes
  const main = ['mq16', 'mq17', 'mq18', 'mq19', 'mq20', 'mq21'];
  ok(main.every((id, i) => C.QUESTS[id] && C.QUESTS[id].type === 'main' && (i === 0 ? C.QUESTS[id].req.quest === 'mq15' : C.QUESTS[id].req.quest === main[i - 1])), 'main story chapter 3: mq16 → mq21 chained after chapter 2');
  const kinds = new Set(main.flatMap(id => C.QUESTS[id].stages.map(s => s.k)));
  ok(['talk', 'visit', 'kill', 'gather', 'choice', 'deliver', 'interact'].every(k => kinds.has(k)), 'chapter 3 mixes dialogue, travel, beacons, investigation, a choice, bosses and both dungeons', [...kinds].join(','));
  ok(main.flatMap(id => C.QUESTS[id].stages).some(s => s.mob === 'pyrelord') && main.flatMap(id => C.QUESTS[id].stages).some(s => s.mob === 'ashherald'), 'chapter 3 sends the player through the Fire Cavern and the Ruined Fortress');
  const aq = Object.values(C.QUESTS).filter(q => /^emberhold:|^ash_plains:|^volcanic_road:/.test(q.giver));
  ok(aq.filter(q => q.type !== 'main' && q.repeat !== 'daily').length >= 6 && aq.filter(q => q.repeat === 'daily').length >= 2, 'Ashen side quests + daily notices');
  ok(Object.values(C.RECIPES).filter(r => [r.out, ...r.in].some(([id]) => id >= 500)).length >= 10, 'Ashen crafting recipes (Tier 3 gear, charms, mineral water)');
  ok(['e_weapon', 'e_armor', 'e_general', 'camp3'].every(s => C.SHOPS[s]) && new Set(C.NPCS.filter(n => n.map === 'emberhold').map(n => n.role)).size >= 10, 'Emberhold has full NPC services (shops, inn, healer, smith, craft, storage, teleport, board, quests)');
  ok(Object.values(AR.MUSIC).some(m => m.id === 'bgm_boss_ashen') && ['bgm_volcanic_road', 'bgm_molten_lake', 'bgm_ruined_fortress'].every(k => AR.MUSIC[k]), 'Ashen music: boss theme + map themes registered');
  // ---------------------------------------------------------------- gameplay over the protocol
  {
    const lo = await login(URL, 'a_gate38'); await walkTo(lo, 69, 26, 5000); await sleep(600);
    ok(!lo.msgs.some(m => m.t === 'map' && m.map.id === 'ash_plains'), 'Lv 38 cannot enter the Ash Plains'); lo.close();
    const hi = await login(URL, 'a_gate41'); hi.send({ t: 'move', x: 69, y: 26 });
    const mp = await hi.wait(m => m.t === 'map' && m.map.id === 'ash_plains', 8000);
    ok(!!mp && mp.map.npcs.some(n => n.id === 'scout'), 'Lv 41 walks from Beast Valley into the Ash Plains (scout camp there)'); hi.close();
  }
  {
    const s = await login(URL, 'a_mq16'); const d = await talk(s, 'elder');
    ok(d && d.opts.some(o => o[0] === 'q:mq16'), 'Elder Silvana offers chapter 3 after chapter 2 at Lv 40', JSON.stringify(d && d.opts)); s.close();
  }
  {
    const f = await login(URL, 'a_fee'); const d = await talk(f, 'warp');
    const opt = d && d.opts.find(o => o[0] === 'go:emberhold');
    ok(!!opt, 'capital teleporter offers Emberhold', JSON.stringify(d && d.opts));
    const z0 = me(f).zeny; f.send({ t: 'npcAct', id: 'warp', a: 'go:emberhold' });
    const mp = await f.wait(m => m.t === 'map' && m.map.id === 'emberhold', 4000); await sleep(300);
    ok(!!mp && me(f).zeny === z0 - (40 + C.MAPS.emberhold.lv[0] * 6) * 2 && mp.map.npcs.length >= 14, 'teleport to Emberhold (cross-region fee) — the town is full of NPCs', `${z0} -> ${me(f).zeny}`);
    f.close();
  }
  {
    const h = await login(URL, 'a_shop'); const sh = await talk(h, 'weapon', 'shop');
    ok(sh && sh.t === 'shop' && sh.items.some(i => i.id === 247) && sh.items.every(i => (C.ITEMS[i.id].rar || 0) <= 1), 'Emberhold weapon shop sells Tier 3 Common/Uncommon only');
    const z0 = me(h).zeny; h.send({ t: 'buy', id: 247, q: 1 }); await sleep(400);
    ok(me(h).zeny === z0 - C.ITEMS[247].buy && me(h).inv.some(s => s.id === 247), 'buying Tier 3 gear works');
    h.close();
  }
  {
    // light the three beacons of mq17 (interact stage): each beacon counts once, the third advances the quest
    const b = await login(URL, 'a_beacon');
    const beacons = C.MAPS.ash_plains.nodes.filter(n => n.k === 'beacon');
    for (const nd of beacons) { b.send({ t: 'node', id: nd.id }); const t0 = Date.now(); while (Date.now() - t0 < 12000) { const q = me(b).qs && me(b).qs.a.mq17; if (!q || q.s > 1 || q.k >= beacons.indexOf(nd) + 1) break; await sleep(200); } }
    await sleep(400);
    const q = me(b).qs.a.mq17;
    ok(q && q.s === 2, 'lighting all 3 signal beacons in the Ash Plains completes that story step', JSON.stringify(q));
    b.close();
  }
}
module.exports = { run, SEEDS };
