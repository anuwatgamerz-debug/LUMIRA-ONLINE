// LUMIRA ONLINE - Phase 1 server (pixel MMORPG)
// node server.js  ->  http://<host>:3400
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = +process.env.PORT || 3400;
const DATA = path.join(__dirname, 'data', 'db.json');
const PUB = path.join(__dirname, 'public');
const TICK = 100;

// ---------------------------------------------------------------- data
const ITEMS = {
  1: { n: 'ยาแดง', ty: 'use', heal: 45, buy: 50 },
  2: { n: 'ยาส้ม', ty: 'use', heal: 110, buy: 160 },
  3: { n: 'ยาฟ้า', ty: 'use', sp: 40, buy: 400 },
  10: { n: 'เยลลี่', ty: 'etc', sell: 8 },
  11: { n: 'กระดองปู', ty: 'etc', sell: 20 },
  12: { n: 'หนามกระบองเพชร', ty: 'etc', sell: 30 },
  13: { n: 'เศษกระดูกเก่า', ty: 'etc', sell: 55 },
  14: { n: 'ใบไม้วิเศษ', ty: 'etc', sell: 18 },
  15: { n: 'คริสตัลวิญญาณ', ty: 'etc', sell: 48 },
  20: { n: 'มีดสั้น', ty: 'eq', slot: 'wpn', atk: 10, buy: 100 },
  21: { n: 'ดาบไม้', ty: 'eq', slot: 'wpn', atk: 18, buy: 600 },
  22: { n: 'ดาบเหล็ก', ty: 'eq', slot: 'wpn', atk: 32, buy: 2400 },
  23: { n: 'เขี้ยวพระจันทร์', ty: 'eq', slot: 'wpn', atk: 45, sell: 3000 },
  30: { n: 'เสื้อผ้าฝ้าย', ty: 'eq', slot: 'arm', def: 2, buy: 80 },
  31: { n: 'เสื้อหนัง', ty: 'eq', slot: 'arm', def: 6, buy: 1000 },
  40: { n: 'หมวกแก๊ป', ty: 'eq', slot: 'head', def: 2, buy: 500 },
  41: { n: 'มงกุฎเจลลอป', ty: 'eq', slot: 'head', def: 5, sell: 1500 },
};
for (const k in ITEMS) { const it = ITEMS[k]; it.id = +k; if (!it.sell) it.sell = Math.floor((it.buy || 10) / 4); }
const SHOP = [1, 2, 3, 20, 21, 22, 30, 31, 40];
const EQ_SLOTS = ['wpn', 'arm', 'head'], STATS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];

const MOBS = {
  jellop:   { n: 'เจลลอป', lv: 1, hp: 40, atk: [3, 5], def: 0, flee: 2, exp: 6, spd: 2.2, aggro: 0, drops: [[10, .6], [1, .08]], z: 2 },
  crab:     { n: 'ปูทราย', lv: 4, hp: 95, atk: [6, 9], def: 2, flee: 6, exp: 16, spd: 2.4, aggro: 0, drops: [[11, .5], [1, .1]], z: 4 },
  leafling: { n: 'ลีฟลิง', lv: 6, hp: 130, atk: [8, 12], def: 2, flee: 10, exp: 25, spd: 2.8, aggro: 0, drops: [[14, .55], [2, .05]], z: 5 },
  cactimp:  { n: 'อิมป์กระบองเพชร', lv: 8, hp: 170, atk: [11, 15], def: 3, flee: 10, exp: 36, spd: 2.6, aggro: 1, drops: [[12, .5], [40, .03]], z: 6 },
  dunewolf: { n: 'อัศวินกระดูก', lv: 11, hp: 280, atk: [15, 21], def: 4, flee: 14, exp: 66, spd: 3.6, aggro: 1, drops: [[13, .45], [21, .04]], z: 8 },
  mosshog:  { n: 'จอมเวทกระดูก', lv: 13, hp: 360, atk: [18, 24], def: 6, flee: 12, exp: 85, spd: 3.0, aggro: 1, drops: [[15, .45], [31, .03]], z: 8 },
  kingjel:  { n: 'ราชาเจลลอป', lv: 16, hp: 2200, atk: [26, 36], def: 8, flee: 15, exp: 700, spd: 2.0, aggro: 1, boss: 1, drops: [[41, .35], [23, .15], [2, 1]], z: 14 },
};

// ---------------------------------------------------------------- maps
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
// tiles: 0 sand 1 grass 2 water 3 wall 4 path 5 tree 6 rock 7 cactus 8 portal 9 roof 10 floor(plaza) 11 flower 12 bridge
const SOLID = new Set([2, 3, 5, 6, 7, 9]);
const MAPS = {};
function mkMap(id, name, w, h, fill) { const t = new Array(w * h).fill(fill); return { id, name, w, h, t, portals: [], npcs: [], spawns: [], bossSpawn: null, props: [] }; }
function set(m, x, y, v) { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.t[y * m.w + x] = v; }
function get(m, x, y) { if (x < 0 || y < 0 || x >= m.w || y >= m.h) return 3; return m.t[y * m.w + x]; }
function rect(m, x0, y0, x1, y1, v) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(m, x, y, v); }
function border(m, v) { for (let x = 0; x < m.w; x++) { set(m, x, 0, v); set(m, x, m.h - 1, v); } for (let y = 0; y < m.h; y++) { set(m, 0, y, v); set(m, m.w - 1, y, v); } }
function building(m, x, y, w, h, k) { rect(m, x, y, x + w - 1, y + h - 2, 9); rect(m, x, y + h - 1, x + w - 1, y + h - 1, 3); m.props.push({ k: k || 'home_A', x, y, w, h }); }

(function buildTown() {
  const m = mkMap('solkara', 'โซลคารา (เมืองหลวง)', 44, 34, 0);
  border(m, 3);
  rect(m, 2, 15, 41, 17, 4); rect(m, 20, 2, 22, 31, 4);
  rect(m, 15, 11, 27, 21, 10);
  rect(m, 19, 14, 23, 18, 2); set(m, 21, 16, 2);
  building(m, 4, 4, 7, 5, 'tavern'); building(m, 12, 4, 6, 4, 'home_A'); building(m, 27, 4, 7, 5, 'church'); building(m, 35, 5, 5, 4, 'blacksmith');
  building(m, 4, 23, 6, 5, 'market'); building(m, 30, 23, 8, 5, 'barracks'); building(m, 12, 25, 5, 4, 'home_B');
  for (const [x, y] of [[14, 10], [28, 10], [14, 22], [28, 22], [9, 13], [33, 19]]) set(m, x, y, 5);
  for (let i = 0; i < 20; i++) { const r = rng(77 + i); const x = 2 + Math.floor(r() * 40), y = 2 + Math.floor(r() * 30); if (get(m, x, y) === 0) set(m, x, y, 11); }
  set(m, 43, 16, 8); set(m, 42, 16, 4); set(m, 21, 33, 8); set(m, 21, 32, 4);
  m.portals = [{ x: 43, y: 16, to: 'plains', tx: 2, ty: 22 }, { x: 21, y: 33, to: 'woods', tx: 25, ty: 2 }];
  m.npcs = [
    { id: 'iris', n: 'ไอริส', x: 21, y: 12, look: 'iris', label: '[เควส] ไอริส' },
    { id: 'shop', n: 'พ่อค้าซาฮีร์', x: 16, y: 19, look: 'merchant', label: '[ร้านค้า] ซาฮีร์' },
    { id: 'heal', n: 'นางพยาบาลมีน่า', x: 26, y: 19, look: 'nurse', label: '[ฮีลฟรี] มีน่า' },
    { id: 'warp', n: 'นักเดินทางคาเรน', x: 26, y: 13, look: 'warper', label: '[วาร์ป] คาเรน' },
    { id: 'sell', n: 'นักสะสมโบราณ', x: 16, y: 13, look: 'sage', label: '[รับซื้อของ] ปราชญ์' },
  ];
  m.spawn = { x: 21, y: 20 };
  m.town = 1;
  MAPS[m.id] = m;
})();

(function buildPlains() {
  const m = mkMap('plains', 'ทุ่งทรายสีทอง (Lv 1-10)', 64, 46, 0);
  const r = rng(2026);
  border(m, 6);
  for (let i = 0; i < 90; i++) { const x = 1 + Math.floor(r() * 62), y = 1 + Math.floor(r() * 44); set(m, x, y, r() < .55 ? 7 : 6); }
  for (let i = 0; i < 40; i++) { const x = 1 + Math.floor(r() * 62), y = 1 + Math.floor(r() * 44); set(m, x, y, 11); }
  rect(m, 40, 30, 47, 35, 2); rect(m, 41, 29, 46, 36, 2); rect(m, 39, 32, 48, 33, 2);
  rect(m, 1, 21, 20, 23, 4); rect(m, 0, 22, 1, 22, 4);
  set(m, 0, 22, 8);
  m.portals = [{ x: 0, y: 22, to: 'solkara', tx: 41, ty: 16 }];
  m.spawns = [['jellop', 22, 4, 2, 34, 44], ['crab', 16, 10, 2, 44, 44], ['cactimp', 9, 36, 2, 62, 44], ['dunewolf', 5, 44, 2, 62, 28]];
  m.bossSpawn = { type: 'kingjel', x: 52, y: 10, every: 600 };
  m.spawn = { x: 3, y: 22 };
  MAPS[m.id] = m;
})();

(function buildWoods() {
  const m = mkMap('woods', 'ป่าโอเอซิส (Lv 5-15)', 52, 52, 1);
  const r = rng(4242);
  border(m, 5);
  for (let i = 0; i < 260; i++) { const x = 1 + Math.floor(r() * 50), y = 1 + Math.floor(r() * 50); set(m, x, y, 5); }
  for (let i = 0; i < 50; i++) { const x = 1 + Math.floor(r() * 50), y = 1 + Math.floor(r() * 50); set(m, x, y, 11); }
  rect(m, 14, 26, 37, 30, 2); rect(m, 24, 26, 26, 30, 12);
  rect(m, 24, 1, 26, 51, 4); rect(m, 24, 26, 26, 30, 12);
  rect(m, 23, 0, 27, 0, 5); set(m, 25, 0, 8);
  m.portals = [{ x: 25, y: 0, to: 'solkara', tx: 21, ty: 31 }];
  m.spawns = [['jellop', 10, 2, 4, 50, 24], ['leafling', 18, 2, 6, 50, 25], ['mosshog', 10, 2, 32, 50, 50], ['crab', 6, 2, 31, 50, 50]];
  m.spawn = { x: 25, y: 2 };
  MAPS[m.id] = m;
})();

// ---------------------------------------------------------------- db
const BAK = DATA + '.bak';
function loadDb() {
  if (!fs.existsSync(DATA)) return { accounts: {} };
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
  catch (e) {
    // never start with an empty db over a broken file: the next save would wipe every account
    console.error(`[db] ${DATA} is unreadable: ${e.message}`);
    try { const b = JSON.parse(fs.readFileSync(BAK, 'utf8')); fs.copyFileSync(DATA, DATA + '.corrupt'); console.error(`[db] loaded backup ${BAK} (broken file kept as db.json.corrupt)`); return b; }
    catch (e2) { console.error('[db] no usable backup either - fix data/db.json and restart'); process.exit(1); }
  }
}
let db = loadDb();
if (!db || typeof db !== 'object') db = {};
if (!db.accounts || typeof db.accounts !== 'object') db.accounts = {};
let dirty = false;
function saveDb() {
  if (!dirty) return;
  dirty = false;
  const tmp = DATA + '.tmp';
  try {
    fs.mkdirSync(path.dirname(DATA), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(db));
    if (fs.existsSync(DATA)) fs.copyFileSync(DATA, BAK);
    fs.renameSync(tmp, DATA);
  } catch (e) { dirty = true; console.error('[db] save failed:', e.message); }
}
setInterval(saveDb, 15000);
// same scrypt params as the old scryptSync call, so existing hashes still match
function hashPw(pw, salt, cb) { crypto.scrypt(pw, salt, 32, (e, k) => cb(e, k && k.toString('hex'))); }
function samePw(a, b) { const x = Buffer.from(a, 'hex'), y = Buffer.from(String(b), 'hex'); return x.length === y.length && crypto.timingSafeEqual(x, y); }

// ---------------------------------------------------------------- formulas
const expNext = lv => Math.floor(18 * Math.pow(lv, 1.85) + 10);
function derive(c) {
  const eq = c.eq || {};
  const w = ITEMS[eq.wpn], a = ITEMS[eq.arm], hd = ITEMS[eq.head];
  c.maxhp = 40 + c.st.vit * 8 + c.lv * 12;
  c.maxsp = 12 + c.st.int * 4 + c.lv * 2;
  c.atk = 4 + c.st.str * 2 + c.lv + (w ? w.atk : 0);
  c.def = Math.floor(c.st.vit / 2) + (a ? a.def : 0) + (hd ? hd.def : 0);
  c.hit = c.lv + c.st.dex * 2;
  c.flee = c.lv + c.st.agi * 2;
  c.aspd = Math.max(380, 1400 - c.st.agi * 14 - c.st.dex * 4);
  c.crit = Math.floor(c.st.luk * 0.4) + 1;
  if (c.hp > c.maxhp) c.hp = c.maxhp;
  if (c.sp > c.maxsp) c.sp = c.maxsp;
}
function newChar(name, look) {
  const c = {
    name, look, lv: 1, exp: 0, zeny: 300, pts: 10, st: { str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 },
    map: 'solkara', x: 21, y: 20, inv: [{ id: 1, q: 10 }], eq: { wpn: 20, arm: 30 }, q: { step: 0, k: 0 }, hp: 1, sp: 1,
  };
  derive(c); c.hp = c.maxhp; c.sp = c.maxsp;
  return c;
}
// fill anything an older/hand-edited save may be missing, so the game loop never trips on it
function fixChar(c) {
  const st = c.st = Object.assign({ str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 }, c.st);
  for (const k in st) st[k] = Math.max(1, Math.min(99, +st[k] || 5));
  c.lv = Math.max(1, Math.min(99, c.lv | 0 || 1)); c.exp = Math.max(0, +c.exp || 0);
  c.zeny = Math.max(0, +c.zeny || 0); c.pts = Math.max(0, c.pts | 0);
  c.look = c.look || { hair: 0, hc: 0, cc: 0, sex: 0 };
  c.inv = Array.isArray(c.inv) ? c.inv.filter(s => s && ITEMS[s.id] && s.q > 0) : [];
  c.eq = c.eq && typeof c.eq === 'object' ? c.eq : {};
  for (const sl in c.eq) if (!ITEMS[c.eq[sl]] || ITEMS[c.eq[sl]].slot !== sl) delete c.eq[sl];
  c.q = c.q && typeof c.q === 'object' ? c.q : { step: 0, k: 0 }; c.q.step |= 0; c.q.k |= 0;
  if (typeof c.hp !== 'number' || isNaN(c.hp)) c.hp = 1;
  if (typeof c.sp !== 'number' || isNaN(c.sp)) c.sp = 0;
  const m = MAPS[c.map];
  if (!m || !(Number.isFinite(c.x) && Number.isFinite(c.y)) || !walkable(m, Math.round(c.x), Math.round(c.y))) { c.map = 'solkara'; c.x = 21; c.y = 20; }
  derive(c);
  return c;
}

// ---------------------------------------------------------------- world state
let NID = 1;
const players = new Map(); // id -> player
const mobs = new Map();
const drops = new Map();
const nameTaken = n => Object.values(db.accounts).some(a => a.char && a.char.name.toLowerCase() === n.toLowerCase());

function walkable(m, x, y) { return !SOLID.has(get(m, x, y)); }
function occupiedByNpc(m, x, y) { return m.npcs.some(n => n.x === x && n.y === y); }
function findPath(m, sx, sy, tx, ty, max = 600) {
  sx = Math.round(sx); sy = Math.round(sy);
  if (!walkable(m, tx, ty) || occupiedByNpc(m, tx, ty)) return null;
  const key = (x, y) => y * m.w + x;
  const open = [[sx, sy]], came = new Map(), g = new Map([[key(sx, sy), 0]]);
  const h = (x, y) => Math.max(Math.abs(x - tx), Math.abs(y - ty));
  const f = new Map([[key(sx, sy), h(sx, sy)]]);
  let n = 0;
  while (open.length && n++ < max) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (f.get(key(...open[i])) < f.get(key(...open[bi]))) bi = i;
    const [x, y] = open.splice(bi, 1)[0];
    if (x === tx && y === ty) { const p = [[x, y]]; let k = key(x, y); while (came.has(k)) { k = came.get(k); p.unshift([k % m.w, Math.floor(k / m.w)]); } p.shift(); return p; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!walkable(m, nx, ny) || occupiedByNpc(m, nx, ny)) continue;
      if (dx && dy && (!walkable(m, x + dx, y) || !walkable(m, x, y + dy))) continue;
      const nk = key(nx, ny), ng = g.get(key(x, y)) + (dx && dy ? 1.41 : 1);
      if (!g.has(nk) || ng < g.get(nk)) { g.set(nk, ng); f.set(nk, ng + h(nx, ny)); came.set(nk, key(x, y)); if (!open.some(o => o[0] === nx && o[1] === ny)) open.push([nx, ny]); }
    }
  }
  return null;
}
function randFree(m, z) { z = z || [1, 1, m.w - 2, m.h - 2]; for (let i = 0; i < 400; i++) { const x = z[0] + Math.floor(Math.random() * (z[2] - z[0] + 1)), y = z[1] + Math.floor(Math.random() * (z[3] - z[1] + 1)); const t = get(m, x, y); if (walkable(m, x, y) && t !== 8 && t !== 4 && Math.hypot(x - m.spawn.x, y - m.spawn.y) > 6) return [x, y]; } return [m.spawn.x, m.spawn.y]; }

function spawnMob(mapId, type, x, y) {
  const m = MAPS[mapId], d = MOBS[type];
  if (x == null) { const sp = m.spawns.find(s => s[0] === type); [x, y] = randFree(m, sp && sp.length > 2 ? sp.slice(2) : null); }
  const mob = { id: NID++, kind: 'm', type, map: mapId, x, y, hx: x, hy: y, hp: d.hp, maxhp: d.hp, path: null, target: null, nextAtk: 0, nextWander: Date.now() + Math.random() * 4000, dmg: new Map() };
  mobs.set(mob.id, mob);
  return mob;
}
for (const id in MAPS) for (const [type, n] of MAPS[id].spawns) for (let i = 0; i < n; i++) spawnMob(id, type);
const bossTimer = {};

// ---------------------------------------------------------------- net helpers
function send(p, o) { if (p.ws.readyState === 1) p.ws.send(JSON.stringify(o)); }
function bcast(mapId, o) { const s = JSON.stringify(o); for (const p of players.values()) if (p.c.map === mapId && p.ws.readyState === 1) p.ws.send(s); }
function bcastAll(o) { const s = JSON.stringify(o); for (const p of players.values()) if (p.ws.readyState === 1) p.ws.send(s); }
function me(p) {
  const c = p.c; derive(c);
  send(p, { t: 'me', c: { name: c.name, lv: c.lv, exp: c.exp, next: expNext(c.lv), zeny: c.zeny, pts: c.pts, st: c.st, hp: c.hp, maxhp: c.maxhp, sp: c.sp, maxsp: c.maxsp, atk: c.atk, def: c.def, hit: c.hit, flee: c.flee, aspd: c.aspd, crit: c.crit, inv: c.inv, eq: c.eq, q: c.q, look: c.look } });
}
function sys(p, m, col) { send(p, { t: 'sys', m, col }); }
function mapInfo(m) { return { id: m.id, name: m.name, w: m.w, h: m.h, t: m.t, portals: m.portals, npcs: m.npcs, props: m.props, town: !!m.town }; }
function warp(p, mapId, x, y) {
  p.c.map = mapId; p.c.x = x; p.c.y = y; p.path = null; p.target = null; p.pick = null;
  send(p, { t: 'map', map: mapInfo(MAPS[mapId]), x, y });
  me(p);
}

// ---------------------------------------------------------------- inventory
function addItem(c, id, q = 1) {
  const it = ITEMS[id]; if (!it) return false;
  if (it.ty !== 'eq') { const s = c.inv.find(s => s.id === id); if (s) { s.q += q; return true; } }
  if (c.inv.length + (it.ty === 'eq' ? q : 1) > 40) return false;
  if (it.ty === 'eq') for (let i = 0; i < q; i++) c.inv.push({ id, q: 1 }); else c.inv.push({ id, q });
  return true;
}
function delSlot(c, i, q = 1) { const s = c.inv[i]; if (!s) return; s.q -= q; if (s.q <= 0) c.inv.splice(i, 1); }

// ---------------------------------------------------------------- quests (Iris chain)
const QUESTS = [
  { txt: 'ปราบ เจลลอป 10 ตัว ที่ทุ่งทรายสีทอง (ทางออกตะวันออก)', mob: 'jellop', n: 10, zeny: 300, exp: 120, item: [1, 10] },
  { txt: 'ปราบ ปูทราย 8 ตัว ที่ทุ่งทรายสีทอง', mob: 'crab', n: 8, zeny: 600, exp: 400, item: [2, 5] },
  { txt: 'ปราบ ลีฟลิง 10 ตัว ที่ป่าโอเอซิส (ทางออกใต้)', mob: 'leafling', n: 10, zeny: 1000, exp: 900, item: [21, 1] },
  { txt: 'ปราบ ราชาเจลลอป บอสแห่งทุ่งทราย (มุมขวาบน)', mob: 'kingjel', n: 1, zeny: 3000, exp: 3000, item: [31, 1] },
];

// ---------------------------------------------------------------- combat
function gainExp(p, e) {
  const c = p.c; c.exp += e;
  let up = false;
  while (c.exp >= expNext(c.lv) && c.lv < 99) { c.exp -= expNext(c.lv); c.lv++; c.pts += 5; up = true; }
  if (up) { derive(c); c.hp = c.maxhp; c.sp = c.maxsp; bcast(c.map, { t: 'fx', k: 'lvup', id: p.id }); sys(p, `เลเวลอัพ! ตอนนี้ Lv ${c.lv} (+5 แต้มสเตตัส)`, '#ffd34d'); }
}
function mobDie(mob, killer) {
  const d = MOBS[mob.type];
  mobs.delete(mob.id);
  bcast(mob.map, { t: 'fx', k: 'die', id: mob.id });
  // exp split by damage share among present players
  let total = 0; for (const v of mob.dmg.values()) total += v;
  for (const [pid, v] of mob.dmg) {
    const p = players.get(pid); if (!p || p.c.map !== mob.map) continue;
    const share = Math.max(1, Math.round(d.exp * v / total));
    gainExp(p, share);
    const q = QUESTS[p.c.q.step];
    if (q && q.mob === mob.type && p.c.q.k < q.n) { p.c.q.k++; sys(p, `[เควส] ${d.n} ${p.c.q.k}/${q.n}${p.c.q.k >= q.n ? ' - กลับไปหาไอริส!' : ''}`, '#8fe38f'); }
    me(p);
  }
  // drops
  const owner = killer ? killer.id : null;
  for (const [id, ch] of d.drops) if (Math.random() < ch) {
    const dr = { id: NID++, kind: 'd', item: id, map: mob.map, x: Math.round(mob.x) + (Math.random() < .5 ? 0 : (Math.random() < .5 ? 1 : -1)), y: Math.round(mob.y), owner, until: Date.now() + 6000, expire: Date.now() + 90000 };
    if (!walkable(MAPS[mob.map], dr.x, dr.y)) dr.x = Math.round(mob.x);
    drops.set(dr.id, dr);
  }
  if (d.boss) {
    bcastAll({ t: 'sys', m: `[BOSS] ${d.n} ถูกปราบโดย ${killer ? killer.c.name : '???'}! จะกลับมาอีกใน 10 นาที`, col: '#ff7a7a' });
    if (killer) killer.c.zeny += 500;
    bossTimer[mob.map] = Date.now() + MAPS[mob.map].bossSpawn.every * 1000;
  } else {
    setTimeout(() => spawnMob(mob.map, mob.type), 8000 + Math.random() * 8000);
  }
}
function playerAttack(p, mob, mult = 1, skill = false) {
  const c = p.c, d = MOBS[mob.type];
  const hitc = Math.min(97, Math.max(10, 82 + c.hit - d.flee - d.lv));
  let dmg = 0, crit = false;
  if (skill || Math.random() * 100 < hitc) {
    crit = !skill && Math.random() * 100 < c.crit;
    dmg = Math.max(1, Math.round(c.atk * (0.85 + Math.random() * 0.3) * mult * (crit ? 1.5 : 1) - (crit ? 0 : d.def)));
  }
  mob.hp -= dmg;
  mob.dmg.set(p.id, (mob.dmg.get(p.id) || 0) + dmg);
  if (!mob.target) mob.target = p.id;
  bcast(c.map, { t: 'fx', k: 'hit', from: p.id, to: mob.id, dmg, crit, skill });
  if (mob.hp <= 0) { mobDie(mob, p); p.target = null; }
}
function mobAttack(mob, p) {
  const d = MOBS[mob.type], c = p.c;
  const hitc = Math.min(95, Math.max(5, 80 + d.lv * 2 - c.flee));
  let dmg = 0;
  if (Math.random() * 100 < hitc) dmg = Math.max(1, Math.round(d.atk[0] + Math.random() * (d.atk[1] - d.atk[0]) - c.def));
  c.hp -= dmg;
  bcast(c.map, { t: 'fx', k: 'hit', from: mob.id, to: p.id, dmg });
  if (c.hp <= 0) {
    c.hp = 0; p.dead = true; p.path = null; p.target = null;
    const loss = Math.floor(expNext(c.lv) * 0.01); c.exp = Math.max(0, c.exp - loss);
    bcast(c.map, { t: 'fx', k: 'pdie', id: p.id });
    sys(p, `คุณหมดสติ... เสีย EXP ${loss} - กดปุ่มฟื้นที่เมือง`, '#ff7a7a');
    for (const m of mobs.values()) if (m.target === p.id) m.target = null;
  }
  me(p);
}

// ---------------------------------------------------------------- npc dialogs
function npcTalk(p, npcId, act, arg) {
  const m = MAPS[p.c.map], npc = m.npcs.find(n => n.id === npcId); if (!npc) return;
  if (Math.max(Math.abs(npc.x - p.c.x), Math.abs(npc.y - p.c.y)) > 4) return sys(p, 'อยู่ไกลเกินไป เดินเข้าไปใกล้ก่อน');
  const c = p.c;
  const dlg = (text, opts = []) => send(p, { t: 'dlg', npc: npc.id, name: npc.n, text, opts });
  if (npc.id === 'iris') {
    const q = QUESTS[c.q.step];
    if (!q) return dlg('ขอบคุณที่ช่วยโซลคารานะ นักผจญภัย!\nเรื่องราวบทต่อไปกำลังจะมาเร็วๆ นี้... (Phase 2)');
    if (act === 'done' && c.q.k >= q.n) {
      const ri = ITEMS[q.item[0]], stacks = ri.ty !== 'eq' && c.inv.some(s => s.id === ri.id);
      if (!stacks && c.inv.length + (ri.ty === 'eq' ? q.item[1] : 1) > 40) return dlg('กระเป๋าของเจ้าเต็มแล้ว เคลียร์ช่องว่างก่อนแล้วค่อยมารับรางวัลนะ');
      c.zeny += q.zeny; gainExp(p, q.exp); addItem(c, q.item[0], q.item[1]);
      c.q.step++; c.q.k = 0; dirty = true; me(p);
      return dlg(`เยี่ยมมาก! รับรางวัล ${q.zeny} Zeny, EXP ${q.exp} และ ${ITEMS[q.item[0]].n} x${q.item[1]}\n\n${QUESTS[c.q.step] ? 'ภารกิจถัดไป: ' + QUESTS[c.q.step].txt : 'เจ้าผ่านบททดสอบทั้งหมดแล้ว!'}`);
    }
    if (c.q.k >= q.n) return dlg('เจ้าทำภารกิจสำเร็จแล้ว! รับรางวัลเลยไหม?', [['done', 'รับรางวัล']]);
    const intro = c.q.step === 0 ? 'ยินดีต้อนรับสู่ โซลคารา เมืองหลวงแห่งเอลินดรา!\nดวงดาวตกลงมาเมื่อคืน และมอนสเตอร์รอบเมืองก็ดุร้ายขึ้น...\n\n' : '';
    return dlg(`${intro}ภารกิจ: ${q.txt}\nความคืบหน้า: ${c.q.k}/${q.n}\n\n(แตะพื้นเพื่อเดิน แตะมอนเพื่อโจมตี)`);
  }
  if (npc.id === 'heal') { c.hp = c.maxhp; c.sp = c.maxsp; me(p); bcast(c.map, { t: 'fx', k: 'heal', id: p.id }); return dlg('ฟื้นฟู HP/SP ให้เต็มแล้วค่ะ ระวังตัวด้วยนะคะ~'); }
  if (npc.id === 'warp') {
    if (act === 'go') { const t = { plains: ['plains', 3, 22], woods: ['woods', 25, 2] }[arg]; if (t) { send(p, { t: 'dlgclose' }); return warp(p, t[0], t[1], t[2]); } }
    return dlg('จะไปที่ไหนดี? ไปส่งฟรี!', [['go:plains', 'ทุ่งทรายสีทอง (Lv 1-10)'], ['go:woods', 'ป่าโอเอซิส (Lv 5-15)']]);
  }
  if (npc.id === 'shop') return send(p, { t: 'shop', mode: 'buy', items: SHOP.map(id => ({ id, n: ITEMS[id].n, price: ITEMS[id].buy })) });
  if (npc.id === 'sell') return send(p, { t: 'shop', mode: 'sell' });
}

// ---------------------------------------------------------------- ws handling
const server = http.createServer((req, res) => {
  let u;
  try { u = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (u.includes('\0')) { res.writeHead(400); return res.end(); }
  if (u === '/') u = '/index.html';
  const f = path.join(PUB, path.normalize(u).replace(/^(\.\.[\/\\])+/, ''));
  if (!f.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    const ext = path.extname(f);
    res.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp', '.css': 'text/css' }[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(b);
  });
});
const wss = new WebSocketServer({ server, maxPayload: 4096 });
const conns = new Set();
wss.on('connection', ws => {
  const p = { id: NID++, ws, c: null, acct: null, path: null, target: null, nextAtk: 0, msgs: 0, lastChat: 0, authBusy: false, authFails: 0 };
  conns.add(p);
  // without a listener, a protocol error (e.g. a message over maxPayload) is thrown and kills the process
  ws.on('error', e => console.error('[ws]', e.message));
  ws.on('message', raw => {
    if (++p.msgs > 40) return; // rate limit (reset each second)
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    try { handle(p, m); } catch (e) { console.error(e); }
  });
  ws.on('close', () => { conns.delete(p); logout(p); });
});
setInterval(() => { for (const p of conns) p.msgs = 0; }, 1000);
function logout(p) {
  if (!p.c) return;
  db.accounts[p.acct].char = p.c; dirty = true;
  players.delete(p.id);
  bcast(p.c.map, { t: 'fx', k: 'leave', id: p.id });
  for (const mb of mobs.values()) if (mb.target === p.id) mb.target = null;
  p.c = null;
}

function enterWorld(p, u) {
  const a = db.accounts[u];
  for (const o of players.values()) if (o.acct === u) {
    send(o, { t: 'err', m: 'มีการล็อกอินจากที่อื่น' });
    logout(o); // drop the old session now; its socket can take up to 30s to finish closing
    o.ws.close();
  }
  p.acct = u; p.c = fixChar(a.char);
  if (p.c.hp <= 0) { p.c.hp = Math.floor(p.c.maxhp / 2); p.c.map = 'solkara'; p.c.x = 21; p.c.y = 20; }
  players.set(p.id, p);
  send(p, { t: 'welcome', id: p.id, items: ITEMS, mobs: Object.fromEntries(Object.entries(MOBS).map(([k, v]) => [k, { n: v.n, lv: v.lv, boss: !!v.boss }])) });
  warp(p, p.c.map, p.c.x, p.c.y);
  bcastAll({ t: 'sys', m: `${p.c.name} เข้าสู่โลก Elyndra`, col: '#9ad0ff' });
  if (p.c.q.step === 0 && p.c.q.k === 0) sys(p, 'คุยกับ ไอริส ที่ลานกลางเมืองเพื่อรับภารกิจแรก', '#ffd34d');
}

function handle(p, m) {
  if (!p.c) {
    if (m.t === 'register' || m.t === 'login') {
      const u = String(m.u || '').trim().toLowerCase(), pw = String(m.p || '');
      if (!/^[a-z0-9_]{3,16}$/.test(u)) return send(p, { t: 'err', m: 'ไอดีต้องเป็น a-z 0-9 _ ยาว 3-16 ตัว' });
      if (pw.length < 4 || pw.length > 64) return send(p, { t: 'err', m: 'รหัสผ่านต้องยาว 4 ตัวขึ้นไป' });
      if (p.authBusy) return; // one password check at a time per connection
      if (m.t === 'register') {
        if (db.accounts[u]) return send(p, { t: 'err', m: 'ไอดีนี้มีคนใช้แล้ว' });
        const name = String(m.name || '').trim();
        if (!/^[A-Za-z0-9ก-๙ _]{2,14}$/.test(name)) return send(p, { t: 'err', m: 'ชื่อตัวละคร 2-14 ตัวอักษร (ไทย/อังกฤษ/ตัวเลข)' });
        if (nameTaken(name)) return send(p, { t: 'err', m: 'ชื่อตัวละครนี้มีคนใช้แล้ว' });
        const salt = crypto.randomBytes(12).toString('hex');
        const look = { hair: Math.max(0, Math.min(5, m.hair | 0)), hc: Math.max(0, Math.min(7, m.hc | 0)), cc: Math.max(0, Math.min(4, m.cc | 0)), sex: m.sex ? 1 : 0 };
        p.authBusy = true;
        hashPw(pw, salt, (e, hash) => {
          p.authBusy = false;
          if (e || p.ws.readyState !== 1 || p.c) return;
          // re-check: another connection may have taken the id/name while we were hashing
          if (db.accounts[u]) return send(p, { t: 'err', m: 'ไอดีนี้มีคนใช้แล้ว' });
          if (nameTaken(name)) return send(p, { t: 'err', m: 'ชื่อตัวละครนี้มีคนใช้แล้ว' });
          db.accounts[u] = { salt, hash, char: newChar(name, look), created: Date.now() };
          dirty = true; saveDb();
          enterWorld(p, u);
        });
      } else {
        const a = db.accounts[u];
        p.authBusy = true;
        // hash even for unknown ids so response time doesn't reveal which ids exist
        hashPw(pw, a ? a.salt : 'nosuchaccount', (e, hash) => {
          p.authBusy = false;
          if (e || p.ws.readyState !== 1 || p.c) return;
          if (!a || db.accounts[u] !== a || !samePw(hash, a.hash)) {
            send(p, { t: 'err', m: 'ไอดีหรือรหัสผ่านไม่ถูกต้อง' });
            if (++p.authFails >= 5) p.ws.close();
            return;
          }
          enterWorld(p, u);
        });
      }
    }
    return;
  }
  const c = p.c, map = MAPS[c.map];
  if (p.dead && m.t !== 'respawn' && m.t !== 'chat') return;
  switch (m.t) {
    case 'move': {
      const x = m.x | 0, y = m.y | 0;
      p.target = null; p.pick = null; p.npcGo = null; p.pendingSkill = false;
      const pa = findPath(map, c.x, c.y, x, y);
      p.path = pa;
      break;
    }
    case 'attack': { const mob = mobs.get(m.id); if (mob && mob.map === c.map) { if (p.target !== mob.id) p.pendingSkill = false; p.target = mob.id; p.pick = null; } break; }
    case 'skill': {
      // the mob the player just tapped wins over an older target
      let mob = mobs.get(m.id); if (!mob || mob.map !== c.map) mob = mobs.get(p.target);
      if (!mob || mob.map !== c.map) return sys(p, 'เลือกเป้าหมายก่อน (แตะมอน)');
      if (c.sp < 8) return sys(p, 'SP ไม่พอ');
      if (Date.now() < (p.skillAt || 0)) return; // global cooldown so the skill can't be spammed every message
      if (Math.max(Math.abs(mob.x - c.x), Math.abs(mob.y - c.y)) > 1.6) { p.target = mob.id; p.pendingSkill = true; return; }
      c.sp -= 8; playerAttack(p, mob, 2.2, true); p.nextAtk = p.skillAt = Date.now() + c.aspd; me(p);
      break;
    }
    case 'pick': { const d = drops.get(m.id); if (d && d.map === c.map) { p.pick = d.id; p.target = null; p.path = findPath(map, c.x, c.y, d.x, d.y) || []; } break; }
    case 'npc': {
      const npc = map.npcs.find(n => n.id === m.id); if (!npc) return;
      if (Math.max(Math.abs(npc.x - c.x), Math.abs(npc.y - c.y)) <= 3) return npcTalk(p, npc.id);
      // walk next to npc
      let best = null; for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) { const pa = findPath(map, c.x, c.y, npc.x + dx, npc.y + dy); if (pa && (!best || pa.length < best.length)) best = pa; }
      p.path = best; p.target = null; p.npcGo = npc.id;
      break;
    }
    case 'npcAct': { const [act, arg] = String(m.a || '').split(':'); npcTalk(p, String(m.id), act, arg); break; }
    case 'chat': {
      const msg = String(m.m || '').slice(0, 120).trim(); if (!msg) return;
      if (Date.now() - p.lastChat < 700) return sys(p, 'พิมพ์เร็วเกินไป รอสักครู่แล้วส่งใหม่', '#ff8b8b');
      const ch = m.ch === 'world' || m.ch === 'whisper' ? m.ch : 'local'; // old clients send no ch -> local
      if (ch === 'world') {
        if (Date.now() - (p.lastWorld || 0) < 3000) return sys(p, 'แชทโลกส่งได้ทุก 3 วินาที');
        p.lastWorld = p.lastChat = Date.now();
        bcastAll({ t: 'chat', ch, id: p.id, from: c.name, m: msg });
      } else if (ch === 'whisper') {
        const to = String(m.to || '').trim().toLowerCase();
        const o = [...players.values()].find(o => o.c.name.toLowerCase() === to);
        if (!o) return sys(p, `ไม่พบผู้เล่นชื่อ "${String(m.to || '').slice(0, 14)}" ที่ออนไลน์อยู่`);
        p.lastChat = Date.now();
        const pkt = { t: 'chat', ch, id: p.id, from: c.name, to: o.c.name, m: msg };
        send(o, pkt); if (o !== p) send(p, pkt);
      } else {
        p.lastChat = Date.now();
        bcast(c.map, { t: 'chat', id: p.id, from: c.name, m: msg });
      }
      break;
    }
    case 'use': {
      const s = c.inv[m.i | 0]; if (!s || (m.id != null && s.id !== m.id)) return; const it = ITEMS[s.id];
      if (it.ty === 'use') {
        if (it.heal) c.hp = Math.min(c.maxhp, c.hp + it.heal);
        if (it.sp) c.sp = Math.min(c.maxsp, c.sp + it.sp);
        delSlot(c, m.i | 0); bcast(c.map, { t: 'fx', k: 'heal', id: p.id }); me(p);
      } else if (it.ty === 'eq') {
        const old = c.eq[it.slot]; c.eq[it.slot] = s.id; c.inv.splice(m.i | 0, 1); if (old) addItem(c, old); me(p); dirty = true;
      }
      break;
    }
    case 'unequip': { const sl = String(m.s); if (!EQ_SLOTS.includes(sl)) return; if (c.eq[sl] && c.inv.length < 40) { addItem(c, c.eq[sl]); delete c.eq[sl]; me(p); dirty = true; } break; }
    case 'drop': { const i = m.i | 0; if (c.inv[i] && (m.id == null || c.inv[i].id === m.id)) { delSlot(c, i, c.inv[i].q); me(p); } break; }
    case 'stat': { const k = String(m.s); if (STATS.includes(k) && c.pts > 0 && c.st[k] < 99) { c.pts--; c.st[k]++; me(p); dirty = true; } break; }
    case 'buy': {
      if (!map.town) return; const id = m.id | 0, q = Math.max(1, Math.min(99, m.q | 0));
      if (!SHOP.includes(id)) return; const cost = ITEMS[id].buy * q;
      if (c.zeny < cost) return sys(p, 'Zeny ไม่พอ');
      if (!addItem(c, id, q)) return sys(p, 'กระเป๋าเต็ม');
      c.zeny -= cost; me(p); dirty = true; sys(p, `ซื้อ ${ITEMS[id].n} x${q} (${cost} Zeny)`);
      break;
    }
    case 'sell': {
      if (!map.town) return; const i = m.i | 0, s = c.inv[i]; if (!s || (m.id != null && s.id !== m.id)) return; const q = Math.max(1, Math.min(s.q, m.q | 0 || s.q));
      const gain = ITEMS[s.id].sell * q; delSlot(c, i, q); c.zeny += gain; me(p); dirty = true; sys(p, `ขายได้ ${gain} Zeny`);
      break;
    }
    case 'respawn': {
      if (!p.dead) return; p.dead = false; derive(c); c.hp = Math.floor(c.maxhp / 2); c.sp = Math.floor(c.maxsp / 2);
      warp(p, 'solkara', 21, 20); break;
    }
  }
}

// ---------------------------------------------------------------- game loop
function stepToward(e, spd, dt) {
  if (!e.path || !e.path.length) return false;
  const [tx, ty] = e.path[0];
  const dx = tx - e.x, dy = ty - e.y, dist = Math.hypot(dx, dy), mv = spd * dt;
  if (dist <= mv) { e.x = tx; e.y = ty; e.path.shift(); } else { e.x += dx / dist * mv; e.y += dy / dist * mv; }
  e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
  return true;
}
let last = Date.now();
setInterval(() => {
  const now = Date.now(), dt = Math.min(0.25, (now - last) / 1000); last = now;
  // players
  for (const p of players.values()) {
    const c = p.c; if (p.dead) continue;
    const pe = { x: c.x, y: c.y, path: p.path, dir: c.dir };
    // chase target
    if (p.target) {
      const mob = mobs.get(p.target);
      if (!mob || mob.map !== c.map) { p.target = null; p.pendingSkill = false; }
      else {
        const d = Math.max(Math.abs(mob.x - c.x), Math.abs(mob.y - c.y));
        if (d <= 1.6) {
          pe.path = null;
          if (p.pendingSkill && c.sp >= 8) { p.pendingSkill = false; c.sp -= 8; playerAttack(p, mob, 2.2, true); p.nextAtk = p.skillAt = now + c.aspd; me(p); }
          else if (now >= p.nextAtk) { playerAttack(p, mob); p.nextAtk = now + c.aspd; }
        } else if (!pe.path || !pe.path.length || (p.chaseAt || 0) < now) {
          pe.path = findPath(MAPS[c.map], c.x, c.y, Math.round(mob.x), Math.round(mob.y), 300);
          if (pe.path && pe.path.length) pe.path.pop();
          p.chaseAt = now + 500;
          if (!pe.path) p.target = null;
        }
      }
    }
    stepToward(pe, 4.6 + c.st.agi * 0.02, dt);
    c.x = pe.x; c.y = pe.y; p.path = pe.path; if (pe.dir != null) c.dir = pe.dir;
    // arrived at npc
    if (p.npcGo && (!p.path || !p.path.length)) { const id = p.npcGo; p.npcGo = null; npcTalk(p, id); }
    // pick up
    if (p.pick && (!p.path || !p.path.length)) {
      const d = drops.get(p.pick); p.pick = null;
      if (d && Math.max(Math.abs(d.x - c.x), Math.abs(d.y - c.y)) <= 1.5) {
        if (d.owner && d.owner !== p.id && now < d.until) sys(p, 'ไอเทมนี้ยังเป็นของคนอื่นอยู่');
        else if (addItem(c, d.item)) { drops.delete(d.id); bcast(c.map, { t: 'fx', k: 'pick', id: d.id }); sys(p, `ได้รับ ${ITEMS[d.item].n}`, '#c8f7c5'); me(p); dirty = true; }
        else sys(p, 'กระเป๋าเต็ม');
      }
    }
    // portal
    if (!p.path || !p.path.length) {
      const map = MAPS[c.map]; const pt = map.portals.find(o => o.x === Math.round(c.x) && o.y === Math.round(c.y));
      if (pt) warp(p, pt.to, pt.tx, pt.ty);
    }
    // regen
    if (!p.regenAt || now > p.regenAt) {
      p.regenAt = now + (MAPS[c.map].town ? 2000 : 6000);
      const before = c.hp + c.sp;
      c.hp = Math.min(c.maxhp, c.hp + Math.max(1, Math.floor(c.maxhp * 0.03)));
      c.sp = Math.min(c.maxsp, c.sp + Math.max(1, Math.floor(c.maxsp * 0.04)));
      if (c.hp + c.sp !== before) me(p);
    }
  }
  // mobs
  for (const mob of mobs.values()) {
    const d = MOBS[mob.type];
    let tgt = mob.target ? players.get(mob.target) : null;
    if (!tgt) mob.target = null; // target logged out: let the next attacker re-aggro it
    if (tgt && (tgt.dead || tgt.c.map !== mob.map || Math.hypot(tgt.c.x - mob.x, tgt.c.y - mob.y) > 14)) { mob.target = null; tgt = null; }
    if (!tgt && d.aggro) {
      for (const p of players.values()) if (!p.dead && p.c.map === mob.map && Math.hypot(p.c.x - mob.x, p.c.y - mob.y) < 5) { mob.target = p.id; tgt = p; break; }
    }
    if (tgt) {
      const dist = Math.max(Math.abs(tgt.c.x - mob.x), Math.abs(tgt.c.y - mob.y));
      if (dist <= 1.5) { mob.path = null; if (now >= mob.nextAtk) { mobAttack(mob, tgt); mob.nextAtk = now + (d.boss ? 1300 : 1600); } }
      else if (!mob.path || !mob.path.length || (mob.repath || 0) < now) { mob.path = findPath(MAPS[mob.map], mob.x, mob.y, Math.round(tgt.c.x), Math.round(tgt.c.y), 250); if (mob.path) mob.path.pop(); mob.repath = now + 700; }
    } else if (now > mob.nextWander) {
      mob.nextWander = now + 3000 + Math.random() * 5000;
      const m = MAPS[mob.map];
      const tx = Math.round(mob.hx + (Math.random() * 10 - 5)), ty = Math.round(mob.hy + (Math.random() * 10 - 5));
      // a mob dragged far away by a chase gets a bigger search budget so it can walk back home
      const far = Math.max(Math.abs(mob.x - mob.hx), Math.abs(mob.y - mob.hy)) > 10;
      if (walkable(m, tx, ty) && get(m, tx, ty) !== 8) mob.path = findPath(m, mob.x, mob.y, tx, ty, far ? 600 : 150);
      if (mob.hp < mob.maxhp) mob.hp = Math.min(mob.maxhp, mob.hp + Math.ceil(mob.maxhp * 0.05));
      if (!tgt) mob.dmg.clear();
    }
    stepToward(mob, tgt ? d.spd * 1.25 : d.spd * 0.6, dt);
  }
  // boss respawn
  for (const id in MAPS) {
    const bs = MAPS[id].bossSpawn; if (!bs) continue;
    const alive = [...mobs.values()].some(m => m.map === id && m.type === bs.type);
    if (!alive && (bossTimer[id] || 0) < now) {
      bossTimer[id] = Infinity;
      spawnMob(id, bs.type, bs.x, bs.y);
      bcastAll({ t: 'sys', m: `[BOSS] ${MOBS[bs.type].n} ปรากฏตัวที่ ${MAPS[id].name}!`, col: '#ff7a7a' });
    }
  }
  // drops expire
  for (const d of drops.values()) if (now > d.expire) { drops.delete(d.id); bcast(d.map, { t: 'fx', k: 'pick', id: d.id }); }
  // snapshot per map
  const per = {};
  for (const p of players.values()) { const k = p.c.map; (per[k] = per[k] || { p: [], m: [], d: [] }).p.push([p.id, p.c.name, +p.c.x.toFixed(2), +p.c.y.toFixed(2), p.c.dir | 0, p.c.hp, p.c.maxhp, p.c.lv, p.c.look, p.c.eq.wpn || 0, p.c.eq.head || 0, p.dead ? 1 : 0]); }
  for (const mob of mobs.values()) { const s = per[mob.map]; if (s) s.m.push([mob.id, mob.type, +mob.x.toFixed(2), +mob.y.toFixed(2), mob.dir | 0, mob.hp, mob.maxhp]); }
  for (const d of drops.values()) { const s = per[d.map]; if (s) s.d.push([d.id, d.item, d.x, d.y]); }
  for (const k in per) per[k] = JSON.stringify({ t: 's', ...per[k] }); // serialize once per map, not once per player
  for (const p of players.values()) { const s = per[p.c.map]; if (s && p.ws.readyState === 1) p.ws.send(s); }
}, TICK);

function syncChars() { for (const p of players.values()) db.accounts[p.acct].char = p.c; if (players.size) dirty = true; }
function shutdown() { syncChars(); dirty = true; saveDb(); process.exit(0); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// last resort: keep player progress before the process dies (START-LUMIRA-ONLINE.bat restarts it)
process.on('uncaughtException', e => { console.error('[fatal]', e); try { syncChars(); dirty = true; saveDb(); } catch (e2) { } process.exit(1); });
setInterval(syncChars, 30000);
server.on('error', e => { console.error(`[http] ${e.code === 'EADDRINUSE' ? 'port ' + PORT + ' is already in use' : e.message}`); process.exit(1); });
server.listen(PORT, () => console.log(`LUMIRA ONLINE running on http://localhost:${PORT}`));
