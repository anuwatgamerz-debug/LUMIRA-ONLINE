'use strict';
// Content loader: builds every open map from content/maps, attaches NPCs / nodes / spawns from the registries,
// and validates all cross references (a broken reference stops the server at start-up with a clear message
// instead of failing in the middle of a game).
const G = require('../engine/mapgen');
const { REGIONS, MAPS_META, LINKS } = require('./world');
const { ITEMS, RARITY, EQ_SLOTS, slotFits, WEAPON_TYPES, ARMOR_TYPES } = require('./items');
const { MOBS, FAMILIES, DROP_TIERS } = require('./monsters');
const { SKILLS } = require('./skills');
const { CLASSES, lineage, childrenOf } = require('./classes');
const { QUESTS, LEGACY_IRIS } = require('./quests');
const { NPCS, INJURED } = require('./npcs');
const { SHOPS } = require('./shops');
const { RECIPES } = require('./recipes');
const LV = require('./levels');

function buildMaps() {
  const MAPS = {};
  for (const meta of Object.values(MAPS_META)) {
    if (meta.status !== 'open') continue;
    const m = require('./maps/' + meta.id)(G);
    Object.assign(m, { region: meta.region, kind: meta.kind, lv: meta.lv, env: meta.env, music: meta.music, bgm: meta.bgm, ambient: meta.ambient, town: meta.town ? 1 : 0 });
    m.spawns = (m.spawns || []).map(s => Array.isArray(s) ? { mob: s[0], n: s[1], zone: s.slice(2), legacy: 1 } : s);
    if (m.bossSpawn) m.bosses.push({ mob: m.bossSpawn.type, x: m.bossSpawn.x, y: m.bossSpawn.y, every: m.bossSpawn.every });
    m.npcs = NPCS.filter(n => n.map === m.id).map(n => Object.assign({}, n, { label: n.label || n.n }));
    for (const nd of m.nodes) if ([5, 6, 7, 11].includes(G.get(m, nd.x, nd.y))) G.set(m, nd.x, nd.y, m.id === 'old_mine' ? 0 : 1); // a node never sits inside a tree/rock
    for (const [mp, id, x, y] of INJURED) if (mp === m.id) m.nodes.push({ id, k: 'injured', n: 'ทหารบาดเจ็บ', x, y, quest: 1, respawn: 2 });
    MAPS[m.id] = m;
  }
  return MAPS;
}

function validate(MAPS) {
  const err = [], warn = [];
  const walk = (m, x, y) => !G.SOLID.has(G.get(m, x, y));
  const npcKey = new Set(NPCS.map(n => n.map + ':' + n.id));
  const nodeKinds = new Set(); for (const m of Object.values(MAPS)) for (const nd of m.nodes) nodeKinds.add(nd.k);
  for (const m of Object.values(MAPS)) {
    if (m.w !== MAPS_META[m.id].w || m.h !== MAPS_META[m.id].h) err.push(`${m.id}: size ${m.w}x${m.h} differs from the registry`);
    if (!walk(m, m.spawn.x, m.spawn.y)) err.push(`${m.id}: spawn point not walkable`);
    for (const p of m.portals) {
      const to = MAPS_META[p.to]; if (!to) { err.push(`${m.id}: portal to unknown map ${p.to}`); continue; }
      if (to.status === 'open') { const t = MAPS[p.to]; if (!walk(t, p.tx, p.ty)) err.push(`${m.id}: portal lands on a blocked tile ${p.to} ${p.tx},${p.ty}`); }
      else if (!p.req || !p.req.locked) err.push(`${m.id}: portal to planned map ${p.to} must be locked`);
      if (!LINKS.some(([a, b]) => (a === m.id && b === p.to) || (b === m.id && a === p.to))) warn.push(`${m.id}: portal ${p.to} not listed in LINKS`);
    }
    m.npcs.forEach((n, i) => {
      if (!walk(m, n.x, n.y) || G.get(m, n.x, n.y) === 8) err.push(`${m.id}: NPC ${n.id} stands on a blocked/portal tile`);
      for (let j = 0; j < i; j++) { const o = m.npcs[j]; if (Math.max(Math.abs(o.x - n.x), Math.abs(o.y - n.y)) < 2) err.push(`${m.id}: NPCs ${o.id} and ${n.id} are crammed together`); }
      if (n.shop && !SHOPS[n.shop]) err.push(`${m.id}: NPC ${n.id} unknown shop ${n.shop}`);
      for (const d of n.dest || []) if (!MAPS[d[0]] || !walk(MAPS[d[0]], d[1], d[2])) err.push(`${m.id}: NPC ${n.id} teleports to a bad spot ${d}`);
      if (n.cls && !CLASSES[n.cls]) err.push(`${m.id}: NPC ${n.id} unknown class ${n.cls}`);
    });
    for (const s of m.spawns) {
      if (!MOBS[s.mob]) err.push(`${m.id}: spawn of unknown monster ${s.mob}`);
      const [x0, y0, x1, y1] = s.zone; let free = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (walk(m, x, y)) free++;
      if (free < s.n * 3) err.push(`${m.id}: spawn zone of ${s.mob} too small (${free} free tiles for ${s.n})`);
      if (m.id === 'beginner_meadow' && MOBS[s.mob] && MOBS[s.mob].aggro) err.push(`${m.id}: aggressive ${s.mob} in a beginner area`);
    }
    for (const b of m.bosses) { if (!MOBS[b.mob] || !MOBS[b.mob].boss) err.push(`${m.id}: boss ${b.mob} is not a boss`); if (!walk(m, b.x, b.y)) err.push(`${m.id}: boss spot blocked`); }
    for (const nd of m.nodes) { if (!walk(m, nd.x, nd.y)) err.push(`${m.id}: node ${nd.id} blocked`); if (nd.item && !ITEMS[nd.item]) err.push(`${m.id}: node ${nd.id} unknown item`); }
  }
  for (const n of NPCS) if (!MAPS[n.map]) err.push(`NPC ${n.id} on a map that isn't open: ${n.map}`);
  const itemOk = id => !!ITEMS[id];
  for (const [id, s] of Object.entries(SHOPS)) for (const it of s.items) { if (!itemOk(it)) err.push(`shop ${id}: unknown item ${it}`); else if (!ITEMS[it].buy) err.push(`shop ${id}: ${it} has no buy price`); }
  for (const r of Object.values(RECIPES)) for (const [it] of [r.out, ...r.in]) if (!itemOk(it)) err.push(`recipe ${r.id}: unknown item ${it}`);
  for (const d of Object.values(MOBS)) for (const t of DROP_TIERS) for (const [it] of d.drops[t] || []) if (!itemOk(it)) err.push(`drops ${d.id}: unknown item ${it}`);
  for (const s of Object.values(SKILLS)) if (s.cls && !CLASSES[s.cls]) err.push(`skill ${s.id}: unknown class`);
  { const { VFX_DEF } = require('../public/vfx.js'); for (const s of Object.values(SKILLS)) for (const k of ['castVfx', 'projectileVfx', 'hitVfx', 'areaVfx']) if (s[k] && !VFX_DEF[s[k]]) err.push(`skill ${s.id}: unknown ${k} ${s[k]}`); }
  for (const it of Object.values(ITEMS)) for (const c of it.cls || []) if (!CLASSES[c]) err.push(`item ${it.id}: unknown class ${c}`);
  const npcOk = v => typeof v === 'string' ? npcKey.has(v) : Object.values(v).every(x => npcKey.has(x));
  for (const qd of Object.values(QUESTS)) {
    if (!npcKey.has(qd.giver)) err.push(`quest ${qd.id}: unknown giver ${qd.giver}`);
    if (qd.req.quest && !QUESTS[qd.req.quest]) err.push(`quest ${qd.id}: unknown required quest`);
    if (qd.cls && !CLASSES[qd.cls]) err.push(`quest ${qd.id}: unknown class`);
    for (const [it] of [...(qd.reward.items || []), ...Object.values(qd.reward.byFlag || {}).flat()]) if (!itemOk(it)) err.push(`quest ${qd.id}: reward item ${it}`);
    for (const s of qd.stages) {
      if (s.npc && !npcOk(s.npc)) err.push(`quest ${qd.id} stage ${s.i}: unknown npc`);
      if (s.mob && !MOBS[s.mob]) err.push(`quest ${qd.id} stage ${s.i}: unknown monster ${s.mob}`);
      if (s.item && !itemOk(s.item)) err.push(`quest ${qd.id} stage ${s.i}: unknown item ${s.item}`);
      if (s.node && !nodeKinds.has(s.node)) err.push(`quest ${qd.id} stage ${s.i}: no map has nodes of kind ${s.node}`);
      if (s.recipe && !RECIPES[s.recipe]) err.push(`quest ${qd.id} stage ${s.i}: unknown recipe`);
      if (s.map && !MAPS[s.map]) err.push(`quest ${qd.id} stage ${s.i}: unknown map`);
      for (const [it] of [...(s.take || []), ...(s.give || [])]) if (!itemOk(it)) err.push(`quest ${qd.id} stage ${s.i}: item ${it}`);
    }
  }
  for (const c of Object.values(CLASSES)) if (c.tier === 1 && c.status === 'open' && (!QUESTS[c.quest] || QUESTS[c.quest].cls !== c.id)) err.push(`class ${c.id}: change quest missing`);
  return { err, warn };
}

const MAPS = buildMaps();
const report = validate(MAPS);
module.exports = { MAPS, REGIONS, MAPS_META, LINKS, ITEMS, RARITY, EQ_SLOTS, slotFits, WEAPON_TYPES, ARMOR_TYPES, MOBS, FAMILIES, DROP_TIERS, SKILLS, CLASSES, lineage, childrenOf,
  QUESTS, LEGACY_IRIS, NPCS, SHOPS, RECIPES, LV, SOLID: G.SOLID, get: G.get, report };
