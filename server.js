// ELYNDRA ONLINE - server (pixel MMORPG). Internal names (LUMIRA_DATA, map id 'lumira', save keys) stay as they are.
// node server.js  ->  http://<host>:3400
// Game content (maps, monsters, NPCs, classes, quests, items, drops, shops) lives in content/; this file is the
// engine: networking, characters, combat, monster AI, quests and the game loop.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const C = require('./content');
const createQuests = require('./engine/quests');
const createStatus = require('./engine/status');

const CFG = require('./engine/config'); // NODE_ENV, PORT, HOST, DATABASE_PATH, SESSION_SECRET ... (.env / environment)
const L = require('./engine/log');
const createStore = require('./engine/store');
const RL = require('./engine/limits')();
const PWD = require('./engine/password')(CFG.bcryptCost);
const PORT = CFG.port;
const DATA = CFG.dataJson; // legacy db.json (read once by the migration, never written again)
const PUB = path.join(__dirname, 'public');
const TICK = 100;
if (C.report.err.length) { console.error('[content] errors:\n  ' + C.report.err.join('\n  ')); process.exit(1); }
for (const w of C.report.warn) console.warn('[content]', w);

// ---------------------------------------------------------------- data (from content/)
const { ITEMS, MOBS, MAPS, SKILLS, CLASSES, QUESTS, SHOPS, RECIPES, LV, EQ_SLOTS, slotFits, WEAPON_TYPES, ARMOR_TYPES } = C;
const SHOP = SHOPS.legacy.items; // the original shop list (old clients buy without opening a shop first)
const STATS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
const MAX_LV = LV.MAX_LEVEL;
const SKILL_IDS = Object.keys(SKILLS);
const GCD = 400; // global cooldown between any two skills
const MELEE = 1.6; // basic attack reach (tiles, Chebyshev)
const HOT_DEFAULT = ['bash', 'heal', null, null, null, null];
const clsOf = c => CLASSES[c.cls] || CLASSES.adventurer;
const lineOf = c => C.lineage(clsOf(c).id);
// first-class skills level with the job level, the six basics with the base level (as before);
// second-class skills (tier 2) are learned and raised with skill points (c.sk2 = { id: level })
const sk2 = c => (c.sk2 && typeof c.sk2 === 'object' ? c.sk2 : (c.sk2 = {}));
const skLv = (c, sk) => sk.tier === 2 ? (sk2(c)[sk.id] | 0) : sk.cls ? Math.min(10, 1 + Math.floor(((c.jlv || 1) - 1) / 4)) : Math.min(10, 1 + Math.floor((c.lv - sk.lv) / 4));
const ownsSkill = (c, id) => Object.hasOwn(SKILLS, id) && (SKILLS[id].tier === 2 ? lineOf(c).includes(SKILLS[id].cls) && (sk2(c)[id] | 0) > 0 : c.lv >= SKILLS[id].lv && (!SKILLS[id].cls || lineOf(c).includes(SKILLS[id].cls)));
// skill points: one per job level of the second class (Job 1 = 1 point). Third class will add its own pool.
const skPoints = c => (clsOf(c).tier === 2 ? c.jlv | 0 : clsOf(c).tier > 2 ? 50 : 0);
const skSpent = c => Object.entries(sk2(c)).reduce((n, [id, l]) => n + (SKILLS[id] && SKILLS[id].tier === 2 ? l | 0 : 0), 0);
// passives of learned second-class skills: summed per level ({ defPct, hpPct, atkPct, ... })
function passiveOf(c, k) { let v = 0; for (const [id, l] of Object.entries(sk2(c))) { const S = SKILLS[id]; if (S && S.passive && S.passive[k] && l > 0 && lineOf(c).includes(S.cls)) v += S.passive[k] * l; } return v; }
// reset (prepared for a future NPC / item): refunds every point, keeps nothing on the hotbar that is gone
function resetSkills2(c) { c.sk2 = {}; c.hot = c.hot.map(id => (id && SKILLS[id] && SKILLS[id].tier === 2 ? null : id)); }
const skillsFor = c => SKILL_IDS.filter(id => !SKILLS[id].cls || lineOf(c).includes(SKILLS[id].cls));

// ---------------------------------------------------------------- maps
const { SOLID, get } = C;
const SPAWN = { map: 'lumira', x: 25, y: 20 };      // new characters start in Lumira Village
const OLD_HOME = { map: 'solkara', x: 21, y: 20 };   // save point of characters made before the village existed

// ---------------------------------------------------------------- db (SQLite: engine/store.js)
// First start with an old data/db.json: it is backed up, imported and verified (engine/migrate.js), then left alone.
// If elyndra.db goes missing after a migration, refuse to start rather than silently going back to the old JSON.
function openStore() {
  const f = CFG.databasePath;
  if (!fs.existsSync(f) && fs.existsSync(DATA)) {
    if (fs.existsSync(DATA + '.migrated') && !CFG.allowRemigrate) { console.error(`[db] ${f} is missing but ${path.basename(DATA)} was already migrated — restore elyndra.db from data/backups/ (or set ALLOW_REMIGRATE=1 to import the old JSON again)`); process.exit(1); }
    try { require('./engine/migrate').migrate(DATA, f, { backupDir: CFG.backupDir, log: m => console.log(m) }); }
    catch (e) { console.error('[db] migration failed — db.json untouched:', e.message); process.exit(1); }
  }
  try { return createStore(f); } catch (e) { console.error('[db] cannot open database:', e.message); process.exit(1); }
}
const store = openStore();
// in memory: accounts by login (each with chars[]), guilds by name — the game reads these; the store persists them
const db = { accounts: Object.fromEntries(store.loadAccounts()), guilds: store.loadGuilds() };
for (const login of CFG.admins) { const a = db.accounts[login]; if (a && a.role !== 'ADMIN') { store.setRole(a, 'ADMIN'); console.log(`[db] ${login} -> ADMIN (ADMIN_ACCOUNTS)`); } }
let dirty = false; const dirtyChars = new Set(); // characters changed while offline (guild kick, mail ...) are saved too
const markChar = c => { if (c) { dirtyChars.add(c); dirty = true; } };
// save every online character + marked ones in one transaction (not the whole database)
function saveDb() {
  if (!dirty) return;
  dirty = false;
  const list = new Set(dirtyChars); for (const p of players.values()) if (p.c) list.add(p.c);
  try { store.tx(() => { store.saveChars([...list]); store.saveGuilds(db.guilds); }); dirtyChars.clear(); }
  catch (e) { dirty = true; L.error('db_save_failed', { err: e.message }); }
}
// characters that must be on disk now (trade, mail claim, GM grant): one transaction, all or nothing
function commitChars(list) { store.tx(() => { store.saveChars(list); store.saveGuilds(db.guilds); }); for (const c of list) dirtyChars.delete(c); }
setInterval(saveDb, 15000);
// automatic backup (BACKUP_HOURS, default 24; 0 = off): VACUUM INTO data/backups/elyndra-YYYY-MM-DD-HHMM.db
function backupNow(tag) { try { const f = store.backup(CFG.backupDir, CFG.backupKeep, tag); store.meta('last_backup', Date.now()); L.log('db_backup', { file: path.basename(f) }); return f; } catch (e) { L.error('db_backup_failed', { err: e.message }); return null; } }
if (CFG.backupHours > 0) { const due = () => Date.now() - (+store.meta('last_backup') || 0) > CFG.backupHours * 3600e3; if (due()) setTimeout(() => backupNow('auto'), 5000); setInterval(() => { if (due()) backupNow('auto'); }, 3600e3).unref(); }
// same scrypt params as the old scryptSync call, so existing hashes still match
// failed logins per account: 10 wrong passwords within 10 minutes lock the account's login for 5 minutes
const loginFails = new Map(), LOGIN_MAX_FAILS = 10, LOGIN_LOCK_MS = 300000;
setInterval(() => { const now = Date.now(); for (const [u, f] of loginFails) if (now - f.t > 600000 && !(f.lock > now)) loginFails.delete(u); }, 60000);
// ---- account ids: the old a-z0-9_ ids or an e-mail address (both stored lower-case as the account key).
// Guest and Google accounts use keys with a ':' (guest:..., google:...) so a password login can never reach them.
const EMAIL_RE = /^[a-z0-9._%+-]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
const validId = u => (/^[a-z0-9_]{3,16}$/.test(u) || (u.length <= 80 && EMAIL_RE.test(u)));
const ID_ERR = 'ใส่อีเมล หรือไอดี (a-z 0-9 _ ยาว 3-16 ตัว)';
// ---- "remember me" sessions: random tokens, only their sha256 is stored with the account (max 5, 30 days)
const SESSION_MS = 30 * 864e5, sha = t => crypto.createHash('sha256').update(String(t)).digest('hex');
// session tokens: random 24 bytes; only an HMAC (SESSION_SECRET) of the token is stored (old sessions: sha256)
const tokHash = t => 'h1:' + crypto.createHmac('sha256', CFG.sessionSecret).update(String(t)).digest('hex');
function issueToken(p, u) {
  const a = db.accounts[u]; if (!a) return;
  const tok = crypto.randomBytes(24).toString('hex');
  store.addSession(a, tokHash(tok), Date.now() + SESSION_MS);
  send(p, { t: 'session', u, tok, guest: !!a.guest });
}
function tokenOk(a, tok) {
  if (!a || typeof tok !== 'string' || tok.length < 16 || tok.length > 128) return false;
  const want = [tokHash(tok), sha(tok)];
  return store.sessionsOf(a).some(r => want.some(h => h.length === r.h.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(r.h))));
}
const revokeToken = (a, tok) => { for (const h of [tokHash(tok), sha(tok)]) store.removeSession(a, h); };
// ---- guests: limited per address so nobody can flood the database
const guestBy = new Map(), GUEST_PER_HOUR = 6;
const cleanLook = m => ({ hair: Math.max(0, Math.min(5, m.hair | 0)), hc: Math.max(0, Math.min(8, m.hc | 0)), cc: Math.max(0, Math.min(4, m.cc | 0)), sex: m.sex ? 1 : 0 });
const validName = n => /^[A-Za-z0-9ก-๙ _]{2,14}$/.test(n);
// portraits (public/portraits.js — same registry as the client): only listed ids, never a URL
const POR = require('./public/portraits.js');
// chosen portrait for a new character: a valid id, or a default for its body type; undefined = invalid id sent
const pickPortrait = (m, look, name) => m.portrait == null || m.portrait === '' ? POR.portraitFallback(look, name) : POR.portraitAllowed(String(m.portrait), null) ? String(m.portrait) : undefined;
function guestName() { for (let i = 0; i < 50; i++) { const n = 'Guest' + (1000 + Math.floor(Math.random() * 9000)); if (!nameTaken(n)) return n; } return 'Guest' + Date.now() % 1e6; }
// ---- Google sign-in: enabled only when a client id is configured (env GOOGLE_CLIENT_ID or data/google-client-id.txt);
// the ID token is verified by Google's tokeninfo endpoint, the account key is google:<subject>
function googleId() { if (process.env.GOOGLE_CLIENT_ID) return process.env.GOOGLE_CLIENT_ID.trim(); try { return fs.readFileSync(path.join(path.dirname(DATA), 'google-client-id.txt'), 'utf8').trim() || null; } catch (e) { return null; } }
function verifyGoogle(cred, cb) {
  const cid = googleId(); if (!cid) return cb(null);
  require('https').get('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(cred).slice(0, 4000)), res => {
    let b = ''; res.on('data', d => { b += d; if (b.length > 20000) res.destroy(); });
    res.on('end', () => { try { const j = JSON.parse(b); const ok = res.statusCode === 200 && j.aud === cid && /^(https:\/\/)?accounts\.google\.com$/.test(j.iss) && +j.exp * 1000 > Date.now() && j.sub; cb(ok ? j : null); } catch (e) { cb(null); } });
  }).on('error', () => cb(null)).setTimeout(8000, function () { this.destroy(); });
}

// ---------------------------------------------------------------- formulas
const expNext = LV.expNext;
const jobNext = c => LV.jobNext(c.jlv || 1, clsOf(c).tier);
// buffs are runtime-only (non-enumerable, so they never reach the save file)
const buffsOf = c => { if (!Object.hasOwn(c, '_b')) Object.defineProperty(c, '_b', { value: {}, writable: true, enumerable: false }); return c._b; };
function buffSum(c, k) { let s = 0; const now = Date.now(), B = buffsOf(c); for (const id in B) { if (B[id].until < now) { delete B[id]; continue; } s += B[id][k] || 0; } return s; }
function derive(c) {
  const eq = c.eq || {}, K = clsOf(c);
  const gear = ['wpn', 'arm', 'head', 'acc1', 'acc2'].map(s => ITEMS[eq[s]]).filter(Boolean);
  const add = k => gear.reduce((s, it) => s + (it[k] || 0), 0);
  const st = {}; for (const k of STATS) st[k] = c.st[k] + add(k); // accessories add stats without touching the base stats
  const w = ITEMS[eq.wpn], wt = w && w.id >= 200 ? WEAPON_TYPES[w.wt] : null; // original items keep their original feel
  c.maxhp = Math.round(((40 + st.vit * 8 + c.lv * 12) * K.hp + add('hp')) * (1 + passiveOf(c, 'hpPct') / 100));
  c.maxsp = Math.round((12 + st.int * 4 + c.lv * 2) * K.sp) + add('sp');
  const low = c.hp > 0 && c.maxhp && c.hp < c.maxhp * 0.5 ? passiveOf(c, 'lowAtk') : 0;
  c.atk = Math.round((4 + st.str * 2 + c.lv + add('atk')) * K.atk * (1 + buffSum(c, 'atk')) * (1 + (passiveOf(c, 'atkPct') + low) / 100));
  c.matk = Math.round((st.int * 3 + c.lv * 2 + 12 + add('matk')) * K.matk * (1 + buffSum(c, 'matk')) * (1 + passiveOf(c, 'matkPct') / 100));
  c.def = Math.round((Math.floor(st.vit / 2) + add('def')) * (1 + buffSum(c, 'def')) * (1 + passiveOf(c, 'defPct') / 100));
  c.mdef = Math.floor(st.int / 2) + add('mdef');
  c.hit = c.lv + st.dex * 2 + passiveOf(c, 'hit') + buffSum(c, 'hit');
  const arm = ITEMS[eq.arm], at = arm && ARMOR_TYPES[arm.at];
  c.flee = Math.round((c.lv + st.agi * 2 + add('flee') + passiveOf(c, 'flee') + (at && arm.id >= 300 ? at.flee || 0 : 0)) * (1 + buffSum(c, 'flee')));
  // gear modifiers (item identity): flee / crit flat, aspdPct = attack interval shortened by that percent (capped)
  c.aspd = Math.round(Math.max(380, 1400 - st.agi * 14 - st.dex * 4 + (wt ? wt.aspd || 0 : 0)) * (1 - buffSum(c, 'aspd')) * (1 - Math.min(0.3, (add('aspdPct') + passiveOf(c, 'aspdPct')) / 100)));
  c.crit = Math.floor(st.luk * 0.4) + 1 + (K.crit || 0) + (wt ? wt.crit || 0 : 0) + add('crit') + passiveOf(c, 'crit') + buffSum(c, 'crit');
  c.range = (w && w.range ? w.range : MELEE) + (w && w.range > MELEE ? Math.min(4, buffSum(c, 'range')) : 0); // Eagle Eye: ranged weapons only
  if (c.hp > c.maxhp) c.hp = c.maxhp;
  if (c.sp > c.maxsp) c.sp = c.maxsp;
}
function newChar(name, look, portraitId) {
  const c = {
    name, look, portraitId: portraitId || POR.portraitFallback(look, name), lv: 1, exp: 0, zeny: 300, pts: 10, st: { str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 },
    map: SPAWN.map, x: SPAWN.x, y: SPAWN.y, inv: [{ id: 1, q: 10 }], eq: { wpn: 20, arm: 30 }, q: { step: 0, k: 0 }, hp: 1, sp: 1, hot: HOT_DEFAULT.slice(),
    cls: 'adventurer', jlv: 1, jexp: 0, save: { ...SPAWN }, store: [], bank: 0, qs: { a: { mq1: { s: 0, k: 0, f: [] } }, d: {}, t: 'mq1', fl: {} },
  };
  derive(c); c.hp = c.maxhp; c.sp = c.maxsp;
  return c;
}
const validSpot = (s) => s && MAPS[s.map] && walkable(MAPS[s.map], Math.round(s.x), Math.round(s.y));
// fill anything an older/hand-edited save may be missing, so the game loop never trips on it
function fixChar(c) {
  if (!POR.portraitAllowed(c.portraitId, c)) c.portraitId = POR.portraitFallback(c.look, c.name); // saves from before portraits: a stable default, no new character needed
  const st = c.st = Object.assign({ str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 }, c.st);
  for (const k in st) st[k] = Math.max(1, Math.min(LV.STAT_CAP, +st[k] || 5));
  c.lv = Math.max(1, Math.min(MAX_LV, c.lv | 0 || 1)); c.exp = c.lv >= MAX_LV ? 0 : Math.max(0, +c.exp || 0);
  c.zeny = Math.max(0, +c.zeny || 0); c.pts = Math.max(0, c.pts | 0);
  c.look = c.look && typeof c.look === 'object' ? c.look : { hair: 0, hc: 0, cc: 0, sex: 0 };
  c.look.hair = Math.max(0, Math.min(5, c.look.hair | 0)); c.look.hc = Math.max(0, Math.min(8, c.look.hc | 0)); c.look.cc = Math.max(0, Math.min(4, c.look.cc | 0)); c.look.sex = c.look.sex ? 1 : 0;
  c.inv = Array.isArray(c.inv) ? c.inv.filter(s => s && ITEMS[s.id] && s.q > 0) : [];
  c.eq = c.eq && typeof c.eq === 'object' ? c.eq : {};
  for (const sl in c.eq) if (!EQ_SLOTS.includes(sl) || !slotFits(ITEMS[c.eq[sl]], sl)) delete c.eq[sl];
  c.q = c.q && typeof c.q === 'object' ? c.q : { step: 0, k: 0 }; c.q.step |= 0; c.q.k |= 0;
  if (!CLASSES[c.cls] || CLASSES[c.cls].status !== 'open') c.cls = 'adventurer';
  c.jlv = Math.max(1, Math.min(LV.JOB_CAP[clsOf(c).tier] || 50, c.jlv | 0 || 1)); c.jexp = Math.max(0, +c.jexp || 0);
  c.hot = Array.from({ length: 6 }, (_, i) => (Array.isArray(c.hot) ? c.hot : HOT_DEFAULT)[i] || null).map(id => (id && Object.hasOwn(SKILLS, id) ? id : null));
  { const S2 = sk2(c); for (const id in S2) { const S = SKILLS[id]; if (!S || S.tier !== 2) { delete S2[id]; continue; } S2[id] = Math.max(0, Math.min(S.maxLv, S2[id] | 0)); if (!S2[id]) delete S2[id]; } if (skSpent(c) > skPoints(c) && clsOf(c).tier === 2) resetSkills2(c); }
  if (typeof c.hp !== 'number' || isNaN(c.hp)) c.hp = 1;
  if (typeof c.sp !== 'number' || isNaN(c.sp)) c.sp = 0;
  if (!validSpot(c.save)) c.save = { ...OLD_HOME };
  c.store = Array.isArray(c.store) ? c.store.filter(s => s && ITEMS[s.id] && s.q > 0) : [];
  c.bank = Math.max(0, +c.bank || 0);
  Q.st(c); for (const id of Object.keys(c.qs.a)) if (!QUESTS[id]) delete c.qs.a[id];
  if (!(Number.isFinite(c.x) && Number.isFinite(c.y)) || !validSpot(c)) { c.map = c.save.map; c.x = c.save.x; c.y = c.save.y; }
  derive(c);
  return c;
}

// ---------------------------------------------------------------- world state
let NID = 1;
const players = new Map(); // id -> player
const mobs = new Map();
const drops = new Map();
const ST = createStatus({ now: () => Date.now(), dotHit: (m, o, d, k) => dotHit(m, o, d, k), MOBS });
const nameTaken = n => store.nameTaken(n); // UNIQUE index on characters.name_key (deleted characters free their name)

function walkable(m, x, y) { return !SOLID.has(get(m, x, y)); }
function occupiedByNpc(m, x, y) { return m.npcs.some(n => n.x === x && n.y === y); }
// A* over the tile grid with a binary heap (the bigger maps need long paths for tap-to-move). max = node budget.
function findPath(m, sx, sy, tx, ty, max = 3000) {
  sx = Math.round(sx); sy = Math.round(sy);
  if (!walkable(m, tx, ty) || occupiedByNpc(m, tx, ty)) return null;
  const W = m.w, N = W * m.h, start = sy * W + sx, goal = ty * W + tx;
  const g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = [], hf = []; // heap of node ids, ordered by f
  const push = (k, f) => { heap.push(k); hf.push(f); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= hf[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; [hf[p], hf[i]] = [hf[i], hf[p]]; i = p; } };
  const pop = () => { const top = heap[0], lk = heap.pop(), lf = hf.pop(); if (heap.length) { heap[0] = lk; hf[0] = lf; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let b = i; if (l < heap.length && hf[l] < hf[b]) b = l; if (r < heap.length && hf[r] < hf[b]) b = r; if (b === i) break; [heap[b], heap[i]] = [heap[i], heap[b]]; [hf[b], hf[i]] = [hf[i], hf[b]]; i = b; } } return top; };
  const h = (x, y) => Math.max(Math.abs(x - tx), Math.abs(y - ty)) + 0.41 * Math.min(Math.abs(x - tx), Math.abs(y - ty));
  g[start] = 0; push(start, h(sx, sy));
  let n = 0;
  while (heap.length && n++ < max) {
    const k = pop(); if (closed[k]) continue; closed[k] = 1;
    const x = k % W, y = (k - x) / W;
    if (k === goal) { const p = []; let c = k; while (c !== start) { p.unshift([c % W, Math.floor(c / W)]); c = came[c]; } return p; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!walkable(m, nx, ny) || occupiedByNpc(m, nx, ny)) continue;
      if (dx && dy && (!walkable(m, x + dx, y) || !walkable(m, x, y + dy))) continue;
      const nk = ny * W + nx; if (closed[nk]) continue;
      const ng = g[k] + (dx && dy ? 1.41 : 1);
      if (ng < g[nk]) { g[nk] = ng; came[nk] = k; push(nk, ng + h(nx, ny)); }
    }
  }
  return null;
}
const inSafe = (m, x, y) => (m.safe || []).some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
// a free spawn tile: walkable, not a road/portal, away from the map entrance, from players and from other monsters
const SPACING = 1.6, PLAYER_GAP = 5;
function randFree(m, z, allowSafe) {
  z = z || [1, 1, m.w - 2, m.h - 2];
  const near = []; for (const o of mobs.values()) if (o.map === m.id) near.push(o);
  const pl = []; for (const p of players.values()) if (p.c && p.c.map === m.id) pl.push(p.c);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 300; i++) {
    const x = z[0] + Math.floor(Math.random() * (z[2] - z[0] + 1)), y = z[1] + Math.floor(Math.random() * (z[3] - z[1] + 1)); const t = get(m, x, y);
    if (!walkable(m, x, y) || t === 8 || t === 4 || Math.hypot(x - m.spawn.x, y - m.spawn.y) <= 6 || occupiedByNpc(m, x, y)) continue;
    if (!allowSafe && inSafe(m, x, y)) continue;
    if (pass === 0 && (near.some(o => Math.hypot(o.x - x, o.y - y) < SPACING) || pl.some(c => Math.hypot(c.x - x, c.y - y) < PLAYER_GAP))) continue;
    return [x, y];
  }
  return [m.spawn.x, m.spawn.y];
}

function spawnMob(mapId, type, x, y, o = {}) {
  const m = MAPS[mapId], d = MOBS[type];
  if (x == null) { const sp = m.spawns.find(s => s.mob === type); [x, y] = randFree(m, sp ? sp.zone : null, m.town); }
  const mob = Object.assign({ id: NID++, kind: 'm', type, map: mapId, x, y, hx: x, hy: y, hp: d.hp, maxhp: d.hp, path: null, target: null, nextAtk: 0, nextWander: Date.now() + Math.random() * 4000, dmg: new Map(), phase: 0, skillAt: Date.now() + 6000 }, o);
  mobs.set(mob.id, mob);
  return mob;
}
for (const id in MAPS) for (const s of MAPS[id].spawns) for (let i = 0; i < s.n; i++) spawnMob(id, s.mob);
const bossTimer = {};

// ---------------------------------------------------------------- net helpers
function send(p, o) { if (p.ws.readyState === 1) p.ws.send(JSON.stringify(o)); }
function bcast(mapId, o) { const s = JSON.stringify(o); for (const p of players.values()) if (p.c.map === mapId && p.ws.readyState === 1) p.ws.send(s); }
function bcastAll(o) { const s = JSON.stringify(o); for (const p of players.values()) if (p.ws.readyState === 1) p.ws.send(s); }
function me(p) {
  const c = p.c; derive(c);
  const now = Date.now(), B = buffsOf(c);
  send(p, { t: 'me', c: { name: c.name, lv: c.lv, exp: c.exp, next: expNext(c.lv), zeny: c.zeny, pts: c.pts, st: c.st, hp: c.hp, maxhp: c.maxhp, sp: c.sp, maxsp: c.maxsp, atk: c.atk, def: c.def, hit: c.hit, flee: c.flee, aspd: c.aspd, crit: c.crit,
    matk: c.matk, mdef: c.mdef, rng: c.range, inv: c.inv, eq: c.eq, q: c.q, look: c.look, portraitId: c.portraitId, hot: c.hot, sk: Object.fromEntries(skillsFor(c).filter(id => ownsSkill(c, id)).map(id => [id, skLv(c, SKILLS[id])])),
    skp: [skPoints(c), skSpent(c)], cls: clsOf(c).id, guest: !!(db.accounts[p.acct] || {}).guest, role: (db.accounts[p.acct] || {}).role || 'PLAYER', guild: c.guild || '', kills: c.kills || 0, bkills: c.bkills || 0, jlv: c.jlv, jexp: c.jexp, jnext: jobNext(c), bank: c.bank, save: c.save.map, qs: Q.view(c), npcq: npcMarks(c), maxlv: MAX_LV, auto: c.auto || null,
    buffs: Object.entries(B).filter(([, b]) => b.until > now).map(([id, b]) => ({ id, th: b.th, ms: b.until - now })) } });
}
function sys(p, m, col) { send(p, { t: 'sys', m, col }); }
function mapInfo(m) {
  return { id: m.id, name: m.name, w: m.w, h: m.h, t: m.t, portals: m.portals, props: m.props, deco: m.deco, town: !!m.town, env: m.env, region: m.region, lv: m.lv, music: m.music, bgm: m.bgm, ambient: m.ambient, safe: m.safe,
    npcs: m.npcs.map(({ id, n, x, y, look, label, role, cls }) => ({ id, n, x, y, look, label, role, cls })), nodes: m.nodes.map(({ id, k, n, x, y }) => ({ id, k, n, x, y })) };
}
function warp(p, mapId, x, y) {
  if (p.wave && p.wave.map !== mapId) endWave(p, false);
  if (p.c.map !== mapId) SOC.onWarp(p);
  p.c.map = mapId; p.c.x = x; p.c.y = y; p.path = null; p.target = null; p.pick = null; p.pendingSkill = false; p.noChase = false; p.shop = null; p.station = null; p.npcGo = null; p.nodeGo = null;
  send(p, { t: 'map', map: mapInfo(MAPS[mapId]), x, y });
  me(p);
  Q.onMove(p);
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
const countItem = (c, id) => c.inv.reduce((n, s) => n + (s.id === id ? s.q : 0), 0);
function takeItem(c, id, q) { for (let i = c.inv.length - 1; i >= 0 && q > 0; i--) { const s = c.inv[i]; if (s.id !== id) continue; const n = Math.min(q, s.q); delSlot(c, i, n); q -= n; } return q <= 0; }

// ---------------------------------------------------------------- quests
// original Iris chain (kept as it was: c.q = {step, k})
const IRIS = [
  { txt: 'ปราบ เจลลอป 10 ตัว ที่ทุ่งทรายสีทอง (ทางออกตะวันออก)', mob: 'jellop', n: 10, zeny: 300, exp: 120, item: [1, 10] },
  { txt: 'ปราบ ปูทราย 8 ตัว ที่ทุ่งทรายสีทอง', mob: 'crab', n: 8, zeny: 600, exp: 400, item: [2, 5] },
  { txt: 'ปราบ ลีฟลิง 10 ตัว ที่ป่าโอเอซิส (ทางออกใต้)', mob: 'leafling', n: 10, zeny: 1000, exp: 900, item: [21, 1] },
  { txt: 'ปราบ ราชาเจลลอป บอสแห่งทุ่งทราย (มุมขวาบน)', mob: 'kingjel', n: 1, zeny: 3000, exp: 3000, item: [31, 1] },
];
const Q = createQuests(C, {
  sys, count: countItem, take: takeItem, give: (c, id, q) => addItem(c, id, q),
  mail: (p, id, q) => { p.c.store.push({ id, q }); sys(p, `กระเป๋าเต็ม: ส่ง ${ITEMS[id].n} x${q} ไปที่คลังเก็บของแล้ว`, '#ffb36b'); },
  exp: (p, e) => gainExp(p, e), jexp: (p, e) => gainJob(p, e), changeClass: (p, id) => changeClass(p, id),
  changed: (p) => { dirty = true; p.meDue = true; }, startWave: (p, id) => startWave(p, id), fx: (p, k) => bcast(p.c.map, { t: 'fx', k, id: p.id, v: 0 }),
});
// quest marks for NPCs on the player's map: id -> 'avail' | 'turnin' | 'progress' | 'lv'
function npcMarks(c) {
  const m = MAPS[c.map], out = {}; if (!m) return out;
  for (const n of m.npcs) { const l = Q.forNpc(c, m.id + ':' + n.id); const k = l.find(x => x.what === 'turnin') || l.find(x => x.what === 'avail') || l.find(x => x.what === 'progress') || l.find(x => x.what === 'lv'); if (k) out[n.id] = k.what; }
  if (out.iris == null && m.id === 'solkara') { const qd = IRIS[c.q.step]; if (qd) out.iris = c.q.k >= qd.n ? 'turnin' : 'progress'; }
  return out;
}
function changeClass(p, id) {
  const c = p.c, K = CLASSES[id]; if (!K) return;
  c.cls = id; c.jlv = 1; c.jexp = 0; derive(c); c.hp = c.maxhp; c.sp = c.maxsp;
  for (const sid of skillsFor(c)) if (SKILLS[sid].cls === id && ownsSkill(c, sid) && !c.hot.includes(sid)) { const free = c.hot.indexOf(null); if (free >= 0) c.hot[free] = sid; }
  p.knows = new Set(skillsFor(c).filter(s => ownsSkill(c, s)));
  bcast(c.map, { t: 'fx', k: 'lvup', id: p.id, cls: id });
  bcastAll({ t: 'sys', m: `🎉 ${c.name} ได้เปลี่ยนอาชีพเป็น ${K.th} (${K.en})!`, col: '#ffd34d' });
  send(p, { t: 'skills', skills: skillDefs(c) });
}
const skillDefs = c => Object.fromEntries(skillsFor(c).map(id => {
  const S = SKILLS[id], { n, th, range, sp, cd, lv, d, cls, fx, element, castSound, hitSound, tier, job, maxLv, up, r, sig, cast, auto, needs } = S;
  // area-at-target skills behave like target skills on the client (they need a monster in range); heal/buff/spRestore: kind only (AUTO settings)
  const type = S.at === 'target' ? 'target' : S.type;
  return [id, { n, th, type, range, sp, cd, lv, d, cls, fx, element, castSound, hitSound, tier, job, maxLv, up, r, sig, cast, auto, needs, icon: tier === 2 ? 'assets/skills/' + id + '.webp' : undefined,
    heal: S.heal ? 1 : 0, spRestore: S.spRestore ? 1 : 0, buff: S.buff ? { id: S.buff.id } : undefined, aoe: S.at === 'target' ? 1 : 0 }];
}));

// ---------------------------------------------------------------- combat
function gainExp(p, e) {
  const c = p.c; if (c.lv >= MAX_LV) { c.exp = 0; return; }
  c.exp += e;
  let up = false;
  while (c.lv < MAX_LV && c.exp >= expNext(c.lv)) { c.exp -= expNext(c.lv); c.lv++; c.pts += LV.statPointsAt(c.lv); up = true; }
  if (c.lv >= MAX_LV) c.exp = 0;
  if (up) {
    derive(c); c.hp = c.maxhp; c.sp = c.maxsp; bcast(c.map, { t: 'fx', k: 'lvup', id: p.id }); sys(p, `เลเวลอัพ! ตอนนี้ Lv ${c.lv} (+${LV.statPointsAt(c.lv)} แต้มสเตตัส)`, '#ffd34d');
    for (const id of skillsFor(c)) if (ownsSkill(c, id) && !c.hot.includes(id) && !p.knows?.has(id)) {
      const free = c.hot.indexOf(null); if (free >= 0) c.hot[free] = id;
      sys(p, `เรียนรู้สกิลใหม่: ${SKILLS[id].th} (${SKILLS[id].n})${free >= 0 ? ` → ช่อง ${free + 1}` : ' — ใส่ในช่องได้จากหน้าต่างสกิล'}`, '#9fe7ff');
    }
    p.knows = new Set(skillsFor(c).filter(id => ownsSkill(c, id)));
    if (c.lv === 10 && c.cls === 'adventurer') sys(p, 'ถึง Lv 10 แล้ว! ไปพบครูอาชีพเพื่อทำบททดสอบเปลี่ยนอาชีพ (ถามแอสเตอร์ที่หมู่บ้านลูมิร่า)', '#ffd34d');
    p.meDue = true;
  }
}
function gainJob(p, e) {
  const c = p.c; let need = jobNext(c); if (!need) return;
  c.jexp += e;
  while (need && c.jexp >= need) { c.jexp -= need; c.jlv++; sys(p, `Job Lv ${c.jlv}! สกิลอาชีพแรงขึ้น`, '#9fe7ff'); need = jobNext(c); }
  if (!need) c.jexp = 0;
}
// timed rate events (content/events.js): refreshed every minute, announced when they start / end
const EV = require('./content/events');
let EVR = EV.rates(), evIds = EV.active().map(e => e.id).join();
setInterval(() => {
  EVR = EV.rates(); const now = EV.active(), ids = now.map(e => e.id).join(); if (ids === evIds) return; evIds = ids;
  bcastAll({ t: 'sys', m: now.length ? `[อีเวนต์] เริ่มแล้ว: ${now.map(e => e.th).join(' · ')}` : '[อีเวนต์] อีเวนต์จบแล้ว', col: '#ffd34d' });
}, 60000);
function rollDrops(d) {
  const out = [];
  for (const t of C.DROP_TIERS) for (const [id, ch] of d.drops[t] || []) if (Math.random() < Math.min(1, ch * EVR.drop)) out.push(id);
  return out;
}
function mobDie(mob, killer) {
  const d = MOBS[mob.type];
  mobs.delete(mob.id);
  bcast(mob.map, { t: 'fx', k: 'die', id: mob.id });
  // exp split by damage share among present players
  let total = 0; for (const v of mob.dmg.values()) total += v;
  for (const [pid, v] of mob.dmg) {
    const p = players.get(pid); if (!p || p.c.map !== mob.map) continue;
    const share = Math.max(d.exp ? 1 : 0, Math.round(d.exp * EVR.exp * v / total));
    if (share) for (const [o, e] of SOC.shareExp(p, share, mob.map)) { gainExp(o, e); if (o !== p) me(o); } // party members nearby share it
    SOC.onKill(p, !!d.boss);
    if (d.jexp) gainJob(p, Math.max(1, Math.round(d.jexp * EVR.jexp * v / total)));
    const q = IRIS[p.c.q.step];
    if (q && q.mob === mob.type && p.c.q.k < q.n) { p.c.q.k++; sys(p, `[เควส] ${d.n} ${p.c.q.k}/${q.n}${p.c.q.k >= q.n ? ' - กลับไปหาไอริส!' : ''}`, '#8fe38f'); }
    const w = ITEMS[p.c.eq.wpn]; Q.onKill(p, mob.type, { wt: w && w.wt });
    me(p);
  }
  // drops: rolled here, each tier separately; owner keeps first pick for 6s
  const owner = killer ? killer.id : null;
  if (!mob.noLoot) for (const id of rollDrops(d)) {
    const dr = { id: NID++, kind: 'd', item: id, map: mob.map, x: Math.round(mob.x) + (Math.random() < .5 ? 0 : (Math.random() < .5 ? 1 : -1)), y: Math.round(mob.y), owner, until: Date.now() + 6000, expire: Date.now() + 90000 };
    if (!walkable(MAPS[mob.map], dr.x, dr.y)) dr.x = Math.round(mob.x);
    drops.set(dr.id, dr);
  }
  if (mob.wave) { const p = players.get(mob.wave); if (p && p.wave) p.wave.left.delete(mob.id); }
  if (mob.minion) return;
  if (d.boss) {
    for (const o of [...mobs.values()]) if (o.minion === mob.id) { mobs.delete(o.id); bcast(o.map, { t: 'fx', k: 'die', id: o.id }); }
    const B = MAPS[mob.map].bosses.find(b => b.mob === mob.type), mins = Math.round((B ? B.every : 600) / 60);
    bcastAll({ t: 'sys', m: `[BOSS] ${d.n} ถูกปราบโดย ${killer ? killer.c.name : '???'}! จะกลับมาอีกใน ${mins} นาที`, col: '#ff7a7a' });
    if (killer) killer.c.zeny += d.legacy ? 500 : Math.round(d.lv * 40);
    bossTimer[mob.map + ':' + mob.type] = Date.now() + (B ? B.every : 600) * 1000;
  } else if (!mob.wave) {
    setTimeout(() => spawnMob(mob.map, mob.type), d.respawn ? d.respawn * 1000 * (0.8 + Math.random() * 0.4) : 8000 + Math.random() * 8000);
  }
}
const ELEM = { holy: { undead: 2, void: 2, demon: 1.6, spirit: 0.6 }, fire: { plant: 1.5, insect: 1.3, ice: 1.5, aquatic: 0.6 }, water: { desert: 1.4, elemental: 1.2, aquatic: 0.5 },
  wind: { aquatic: 1.4, machine: 1.3, insect: 1.2, elemental: 0.8 }, shadow: { spirit: 1.4, holy: 1.3, beast: 1.1, undead: 0.5, void: 0.5, demon: 0.6 } };
// skill=true marks the hit as a skill for the client; opts.sure (default = skill) skips the hit roll, opts.magic uses MATK
function playerAttack(p, mob, mult = 1, skill = false, opts = {}) {
  const c = p.c, d = MOBS[mob.type], sure = opts.sure ?? skill;
  const hitc = Math.min(97, Math.max(10, 82 + c.hit - d.flee - d.lv));
  let dmg = 0, crit = false;
  const el = (opts.element && ELEM[opts.element] && ELEM[opts.element][d.family]) || 1;
  const mk = ST.marked(mob), taken = 1 + (mk ? mk.taken : 0), def = d.def * (1 + ST.deb(mob, 'def')); // Hunter Mark / Soul Mark, Curse / Acid
  if (opts.magic) {
    dmg = Math.max(1, Math.round(c.matk * (0.9 + Math.random() * 0.2) * mult * el * taken - (d.mdef || d.def) * 0.5));
  } else if (sure || Math.random() * 100 < hitc) {
    crit = opts.crit || !!(mk && mk.crit) || (!skill && Math.random() * 100 < c.crit);
    dmg = Math.max(1, Math.round(c.atk * (0.85 + Math.random() * 0.3) * mult * el * taken * (crit ? 1.5 : 1) - (crit ? 0 : def)));
  }
  if (d.dummy && !Q.st(c).a.cls_ranger && !mob.hitOk) dmg = Math.min(dmg, Math.max(0, mob.hp - 1)); // training targets only fall for the Ranger trial
  mob.hp -= dmg;
  mob.dmg.set(p.id, (mob.dmg.get(p.id) || 0) + dmg);
  if (!mob.target && !d.dummy) mob.target = p.id;
  mob.hitAt = Date.now();
  if (d.assist) callHelp(mob, p);
  bcast(c.map, { t: 'fx', k: 'hit', from: p.id, to: mob.id, dmg, crit, skill });
  if (mob.hp <= 0) { mobDie(mob, p); p.target = null; }
  return dmg;
}
// damage over time ticks (poison / burn / curse ...): credited to the player who applied it
function dotHit(mob, owner, dmg, kind) {
  if (!mobs.has(mob.id)) return; const p = players.get(owner); dmg = Math.min(dmg, mob.hp);
  mob.hp -= dmg; if (p) mob.dmg.set(p.id, (mob.dmg.get(p.id) || 0) + dmg);
  bcast(mob.map, { t: 'fx', k: 'hit', from: owner, to: mob.id, dmg, dot: kind });
  if (mob.hp <= 0) { mobDie(mob, p && p.c.map === mob.map ? p : null); if (p && p.target === mob.id) p.target = null; }
}
// assist / pack: same-family monsters nearby join the fight
function callHelp(mob, p) {
  const d = MOBS[mob.type];
  for (const o of mobs.values()) if (o !== mob && o.map === mob.map && !o.target && MOBS[o.type].family === d.family && Math.hypot(o.x - mob.x, o.y - mob.y) <= d.assist) o.target = p.id;
}
// tiles that block attacks/projectiles (walls, roofs, trees, rocks); water and cactus don't
const BLOCK_LOS = new Set([3, 5, 6, 9]);
function los(m, x0, y0, x1, y1) {
  const ax = Math.round(x0), ay = Math.round(y0), bx = Math.round(x1), by = Math.round(y1);
  // diagonal neighbour: blocked when both corner tiles are blocked (no hitting through a wall corner)
  if (Math.abs(bx - ax) === 1 && Math.abs(by - ay) === 1 && BLOCK_LOS.has(get(m, bx, ay)) && BLOCK_LOS.has(get(m, ax, by))) return false;
  const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 4);
  for (let i = 1; i < n; i++) {
    const x = Math.round(x0 + dx * i / n), y = Math.round(y0 + dy * i / n);
    if ((x === ax && y === ay) || (x === bx && y === by)) continue;
    if (BLOCK_LOS.has(get(m, x, y))) return false;
  }
  return true;
}
const reach = (c, mob) => Math.max(Math.abs(mob.x - c.x), Math.abs(mob.y - c.y));
// why a player can't hit this mob right now ('' = can)
function hitBlock(c, mob, range) {
  if (!mob || mob.map !== c.map || mob.hp <= 0) return 'target';
  if (reach(c, mob) > range) return 'range';
  if (!los(MAPS[c.map], c.x, c.y, mob.x, mob.y)) return 'los';
  return '';
}
function failMsg(p, s, r, extra) { // throttled so packet spam can't turn into reply spam
  const now = Date.now(); if (now - (p.failAt || 0) < 150) return false;
  p.failAt = now; send(p, { t: 'castfail', s, r, ...extra }); return false;
}
// all skill rules live here: alive, owned, class line, weapon, cooldown, SP, target, range, line of sight
const UP = { mult: 0.1, heal: 0.12, dur: 0.15, buff: 0.15 }; // second-class skill growth per level (one thing only)
const growth = (sk, lv, key) => (sk.tier === 2 && sk.up === key ? 1 + UP[key] * (lv - 1) : 1);
// party members on the same map within r tiles (always includes the caster)
function partyNear(p, r) { const out = [p]; if (p.party) for (const o of players.values()) if (o !== p && o.party === p.party && !o.dead && o.c.map === p.c.map && Math.hypot(o.c.x - p.c.x, o.c.y - p.c.y) <= r) out.push(o); return out; }
function castSkill(p, sid, tid, legacy) {
  const c = p.c, now = Date.now();
  sid = String(sid);
  if (!Object.hasOwn(SKILLS, sid)) return failMsg(p, sid.slice(0, 16), 'bad');
  const sk = SKILLS[sid];
  if (p.dead || c.hp <= 0) return failMsg(p, sid, 'dead');
  if (sk.type === 'passive') return failMsg(p, sid, 'passive');
  if (!ownsSkill(c, sid)) return failMsg(p, sid, 'own', { lv: sk.lv, job: sk.job });
  if (sk.needs) { const w = ITEMS[c.eq.wpn]; if (!w || !sk.needs.includes(w.wt)) return failMsg(p, sid, 'weapon', { need: sk.needs }); }
  const ready = Math.max(p.cd[sid] || 0, p.gcd || 0);
  if (now < ready) return failMsg(p, sid, 'cd', { ms: ready - now });
  const spCost = Math.max(0, Math.round(sk.sp * (1 - Math.min(0.5, buffSum(c, 'spCut')))));
  if (c.sp < spCost) return failMsg(p, sid, 'sp');
  const lv = skLv(c, sk), lvm = sk.tier === 2 ? growth(sk, lv, 'mult') : 1 + 0.05 * (lv - 1);
  let mob = null, area = null, allies = null, fallen = null;
  if (sk.type === 'target' || (sk.type === 'area' && sk.at === 'target')) {
    mob = mobs.get(tid); if (legacy && !mob) mob = mobs.get(p.target);
    const why = hitBlock(c, mob, sk.range);
    if (why === 'range' && legacy) { p.target = mob.id; p.pendingSkill = true; return false; } // old client: walk in, then cast
    if (why) return failMsg(p, sid, why);
    if (sk.type === 'area') { area = [...mobs.values()].filter(mb => mb.map === c.map && mb.hp > 0 && Math.hypot(mb.x - mob.x, mb.y - mob.y) <= sk.r); mob = null; }
  } else if (sk.type === 'area') {
    area = [...mobs.values()].filter(mb => !hitBlock(c, mb, sk.range));
    if (!area.length) return failMsg(p, sid, 'notarget');
  } else if (sk.type === 'party') allies = partyNear(p, sk.r || 6);
  else if (sk.type === 'revive') {
    let best = 1e9; for (const o of players.values()) if (o.dead && o !== p && o.c.map === c.map) { const d = Math.hypot(o.c.x - c.x, o.c.y - c.y); if (d <= sk.range && d < best) { best = d; fallen = o; } }
    if (!fallen) return failMsg(p, sid, 'notarget');
  } else if (sk.type === 'ground') {
    const mine = [...devices.values()].filter(d => d.owner === p.id && d.skill === sid);
    if (mine.length >= (sk.turret ? 1 : 2)) removeDevice(mine[0]); // oldest one goes
  }
  c.sp -= spCost; p.cd[sid] = now + sk.cd; p.gcd = now + GCD;
  bcast(c.map, { t: 'fx', k: 'cast', id: p.id, s: sid, to: mob ? mob.id : 0, x: sk.at === 'target' && tid ? (mobs.get(tid) || {}).x : undefined, y: sk.at === 'target' && tid ? (mobs.get(tid) || {}).y : undefined, ms: sk.cast || 0 });
  send(p, { t: 'cd', s: sid, ms: sk.cd, g: GCD });
  const resolve = () => {
    if (!players.has(p.id) || p.dead || c.hp <= 0) return;
    if (sk.cast) { // charged skills land only if the target is still there
      if (mob && hitBlock(c, mob, sk.range + 1)) return send(p, { t: 'castfail', s: sid, r: 'target' });
      if (area) area = area.filter(mb => mobs.has(mb.id) && mb.map === c.map);
    }
    const opts = { magic: sk.magic, element: sk.element, crit: sk.crit };
    if (mob) {
      p.nextAtk = now + c.aspd;
      if (sk.dash) { const dx = c.x - mob.x, dy = c.y - mob.y, l = Math.hypot(dx, dy) || 1, tx = Math.round(mob.x + dx / l), ty = Math.round(mob.y + dy / l); if (walkable(MAPS[c.map], tx, ty)) { c.x = tx; c.y = ty; p.path = null; } }
      if (sk.mult || sk.tier !== 2) skillHit(p, mob, sk, lv, lvm, { sure: !sk.hits, ...opts });
      else if (sk.tier === 2) applyOnHit(p, mob, sk, lv, 0);
      if (sk.pierce) for (const mb of [...mobs.values()]) if (mb !== mob && mb.map === c.map && mb.hp > 0 && onLine(c, mob, mb, sk.range)) skillHit(p, mb, sk, lv, lvm * 0.8, opts);
      if (sk.chain) { let from = mob, f = 1; const hit = new Set([mob.id]); for (let i = 0; i < sk.chain.n; i++) { f *= sk.chain.fall; let nx = null, nd = sk.chain.r; for (const mb of mobs.values()) if (!hit.has(mb.id) && mb.map === c.map && mb.hp > 0) { const d = Math.hypot(mb.x - from.x, mb.y - from.y); if (d <= nd) { nd = d; nx = mb; } } if (!nx) break; hit.add(nx.id); bcast(c.map, { t: 'fx', k: 'chain', from: from.id, to: nx.id }); skillHit(p, nx, sk, lv, lvm * f, opts); from = nx; } }
      if (sk.taunt) for (const o of mobs.values()) if (o.map === c.map && Math.hypot(o.x - c.x, o.y - c.y) < 4 && !MOBS[o.type].dummy) o.target = p.id;
      if (sk.slow && mobs.has(mob.id) && sk.tier !== 2) mob.slowUntil = now + sk.slow;
    } else if (area) {
      p.nextAtk = now + c.aspd;
      for (const mb of area) if (mobs.has(mb.id)) {
        if (sk.mult || sk.tier !== 2) for (let i = 0; i < (sk.tier === 2 ? sk.hits || 1 : 1) && mobs.has(mb.id); i++) skillHit(p, mb, sk, lv, lvm, { ...opts, element: sk.elements ? sk.elements[i % sk.elements.length] : sk.element }, i > 0);
        else applyOnHit(p, mb, sk, lv, 0);
        if (sk.taunt && mobs.has(mb.id) && !MOBS[mb.type].dummy) mb.target = p.id;
      }
    }
    for (const o of allies || [p]) {
      const oc = o.c, healMul = growth(sk, lv, 'heal') * (1 + passiveOf(c, 'healPct') / 100);
      if (sk.lowest && allies && o !== allies.reduce((a, b) => (b.c.hp / b.c.maxhp < a.c.hp / a.c.maxhp ? b : a))) continue;
      if (sk.heal) { const before = oc.hp; oc.hp = Math.min(oc.maxhp, oc.hp + Math.round((oc.maxhp * sk.heal.pct + c.st.int * sk.heal.int) * (sk.tier === 2 ? healMul : lvm))); bcast(c.map, { t: 'fx', k: 'heal', id: o.id, v: oc.hp - before }); }
      if (sk.barrier) { const v = Math.round((oc.maxhp * sk.barrier.pct + c.st.int * sk.barrier.int) * healMul); buffsOf(oc)['barrier_' + sid] = { id: 'barrier_' + sid, th: 'บาเรีย', absorb: v, until: now + sk.barrier.ms }; bcast(c.map, { t: 'fx', k: 'buff', id: o.id, s: sid }); }
      if (sk.buff) giveBuff(o, sk, lv, c);
      if (o !== p) me(o);
    }
    if (sk.spRestore) { const before = c.sp; c.sp = Math.min(c.maxsp, c.sp + Math.round(c.maxsp * sk.spRestore * lvm)); bcast(c.map, { t: 'fx', k: 'heal', id: p.id, sp: c.sp - before }); }
    if (sk.cleanse) ST.cleanse(c, buffsOf);
    if (fallen && fallen.dead) { const fc = fallen.c; fallen.dead = false; derive(fc); fc.hp = Math.max(1, Math.round(fc.maxhp * sk.revive * growth(sk, lv, 'heal'))); fc.sp = Math.max(fc.sp, Math.round(fc.maxsp * 0.2)); bcast(c.map, { t: 'fx', k: 'revive', id: fallen.id, by: p.id }); sys(fallen, `${c.name} ชุบชีวิตคุณ!`, '#ffe39a'); me(fallen); }
    if (sk.trap || sk.turret) placeDevice(p, sk, lv);
    me(p);
  };
  if (sk.cast) { setTimeout(resolve, sk.cast); me(p); } else resolve();
  return true;
}
// one damaging hit of a skill with every second-class modifier (rage, execute, backstab, drain, statuses)
function skillHit(p, mob, sk, lv, mult, opts, repeat) {
  const c = p.c, d = MOBS[mob.type];
  if (sk.tier !== 2) { for (let i = 0; i < (sk.hits || 1) && mobs.has(mob.id); i++) playerAttack(p, mob, (sk.mult || 1) * mult, true, opts); return; }
  let m = sk.mult * mult;
  if (sk.rage) m *= 1 + sk.rage * Math.max(0, 1 - c.hp / c.maxhp);
  if (sk.backstab && mob.target && mob.target !== p.id) m *= sk.backstab;
  const hits = sk.type === 'area' ? 1 : sk.hits || 1;
  for (let i = 0; i < hits && mobs.has(mob.id); i++) {
    let mm = m; if (sk.execute && mob.hp / mob.maxhp < sk.execute.below) mm *= sk.execute.mult;
    const dmg = playerAttack(p, mob, mm, true, { ...opts, sure: true, dot: sk.dot ? 1 : 0 });
    if (sk.drain && dmg > 0) { const heal = Math.round(dmg * (sk.drain + passiveOf(c, 'drainPct') / 100)); const b = c.hp; c.hp = Math.min(c.maxhp, c.hp + heal); if (c.hp > b) bcast(c.map, { t: 'fx', k: 'heal', id: p.id, v: c.hp - b }); }
    if (!repeat && i === 0 && mobs.has(mob.id)) applyOnHit(p, mob, sk, lv, dmg);
  }
}
// statuses a second-class skill leaves on a monster (durations grow with 'dur' skills)
function applyOnHit(p, mob, sk, lv, dmg) {
  if (!mobs.has(mob.id) || MOBS[mob.type].dummy) return;
  const g = growth(sk, lv, 'dur'), base = dmg || Math.round(p.c.atk * (sk.mult || 1));
  if (sk.stun) ST.stun(mob, sk.stun * g);
  if (sk.slow) ST.slow(mob, sk.slow * g);
  if (sk.dot) ST.dot(mob, p.id, sk.dot.k, sk.dot.ms * g, Math.max(1, Math.round(base * sk.dot.pct)));
  if (sk.debuff) ST.debuff(mob, sk.debuff.atk, sk.debuff.def, sk.debuff.ms * g);
  if (sk.mark) ST.mark(mob, p.id, sk.mark.taken, sk.mark.crit, sk.mark.ms * g);
  if (sk.taunt) mob.target = p.id;
}
// is mb near the line from the caster through the target (Piercing Shot)?
function onLine(c, t, mb, range) {
  const dx = t.x - c.x, dy = t.y - c.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const px = mb.x - c.x, py = mb.y - c.y, along = px * ux + py * uy, off = Math.abs(px * uy - py * ux);
  return along > 0 && along <= range && off <= 1.0;
}
function giveBuff(o, sk, lv, caster) {
  const g = growth(sk, lv, 'buff'), dur = growth(sk, lv, 'dur') * (1 + passiveOf(caster, 'durPct') / 100), b = Object.assign({}, sk.buff);
  for (const k in b) if (typeof b[k] === 'number' && !['ms', 'stealth', 'evade', 'range'].includes(k)) b[k] = +(b[k] * g).toFixed(3);
  b.until = Date.now() + Math.round(sk.buff.ms * dur);
  buffsOf(o.c)[sk.buff.id] = b;
  if (b.stealth) for (const m of mobs.values()) if (m.target === o.id && !MOBS[m.type].boss) { m.target = null; m.path = null; }
  derive(o.c); bcast(o.c.map, { t: 'fx', k: 'buff', id: o.id, s: sk.id });
}
// ---- devices: traps / mines / turrets (lightweight: a position, an owner, a timer)
const devices = new Map();
function placeDevice(p, sk, lv) {
  const c = p.c, T = sk.trap || sk.turret, id = NID++;
  const dv = { id, skill: sk.id, owner: p.id, map: c.map, x: Math.round(c.x), y: Math.round(c.y), until: Date.now() + T.ms * growth(sk, lv, 'dur'), lv, kind: sk.turret ? 'turret' : T.k, next: Date.now() + 600 };
  devices.set(id, dv); bcast(c.map, { t: 'fx', k: 'dev', id, kind: dv.kind, x: dv.x, y: dv.y, ms: dv.until - Date.now(), by: p.id });
}
function removeDevice(dv, boom) { devices.delete(dv.id); bcast(dv.map, { t: 'fx', k: 'devx', id: dv.id, boom: boom ? 1 : 0 }); }
function deviceTick(now) {
  for (const dv of [...devices.values()]) {
    const p = players.get(dv.owner), sk = SKILLS[dv.skill];
    if (!p || p.c.map !== dv.map || now > dv.until) { removeDevice(dv); continue; }
    const devMul = 1 + passiveOf(p.c, 'devicePct') / 100, lvm = growth(sk, dv.lv, 'mult') * devMul;
    if (sk.turret) {
      if (now < dv.next) continue; dv.next = now + sk.turret.every;
      let best = null, bd = sk.turret.range; for (const mb of mobs.values()) if (mb.map === dv.map && mb.hp > 0 && !MOBS[mb.type].dummy) { const d = Math.max(Math.abs(mb.x - dv.x), Math.abs(mb.y - dv.y)); if (d <= bd && los(MAPS[dv.map], dv.x, dv.y, mb.x, mb.y)) { bd = d; best = mb; } }
      if (best) { bcast(dv.map, { t: 'fx', k: 'devshot', id: dv.id, to: best.id }); playerAttack(p, best, sk.turret.mult * lvm, true, { sure: true }); }
      continue;
    }
    const T = sk.trap, hit = [...mobs.values()].filter(mb => mb.map === dv.map && mb.hp > 0 && !MOBS[mb.type].dummy && Math.hypot(mb.x - dv.x, mb.y - dv.y) <= T.r);
    if (!hit.length || now < dv.next) continue;
    removeDevice(dv, 1);
    const g = growth(sk, dv.lv, 'dur');
    for (const mb of hit) {
      const dmg = T.mult ? playerAttack(p, mb, T.mult * lvm, true, { sure: true }) : 0;
      if (!mobs.has(mb.id)) continue;
      if (T.stun) ST.stun(mb, T.stun * g);
      if (T.dot) ST.dot(mb, p.id, T.dot.k, T.dot.ms * g, Math.max(1, Math.round((dmg || p.c.atk) * T.dot.pct)));
    }
  }
}
const stealthed = c => buffSum(c, 'stealth') > 0;
function mobAttack(mob, p, magic) {
  const d = MOBS[mob.type], c = p.c, mul = (mob.atkMul || 1) * (1 + ST.deb(mob, 'atk')); // Curse of Weakness / Taunt / Smoke Veil
  const hitc = Math.min(95, Math.max(5, 80 + d.lv * 2 - c.flee));
  let dmg = 0;
  if (magic) dmg = Math.max(1, Math.round(d.matk * mul * (0.9 + Math.random() * 0.2) - c.mdef * 0.5));
  else if (Math.random() * 100 < hitc) dmg = Math.max(1, Math.round((d.atk[0] + Math.random() * (d.atk[1] - d.atk[0])) * mul - c.def));
  hurtPlayer(p, dmg, mob.id, magic);
}
function hurtPlayer(p, dmg, from, magic) {
  const c = p.c; if (p.dead) return;
  const [d2, how] = ST.incoming(c, dmg, buffsOf, buffSum); dmg = d2;
  c.hp -= dmg;
  bcast(c.map, { t: 'fx', k: 'hit', from, to: p.id, dmg, magic: magic ? 1 : 0, how: how || undefined });
  if (c.hp <= 0) {
    c.hp = 0; p.dead = true; p.path = null; p.target = null;
    const loss = c.lv <= 5 ? 0 : Math.floor(expNext(c.lv) * 0.01); c.exp = Math.max(0, c.exp - loss); // beginner protection: no exp loss up to Lv5
    bcast(c.map, { t: 'fx', k: 'pdie', id: p.id });
    sys(p, `คุณหมดสติ... ${loss ? `เสีย EXP ${loss}` : 'ไม่เสีย EXP (ผู้เริ่มต้น)'} - กดปุ่มฟื้นที่จุดเซฟ`, '#ff7a7a');
    for (const m of mobs.values()) if (m.target === p.id) m.target = null;
    if (p.wave) endWave(p, false);
  }
  me(p);
}

// ---------------------------------------------------------------- Vanguard trial: waves at Lumira's east gate
const WAVES = { lumira_gate: { map: 'lumira', zone: [44, 18, 47, 22], waves: [['raider', 3], ['raider', 4], ['raider', 5]] } };
function startWave(p, id) {
  const W = WAVES[id]; if (!W) return 'ไม่มีบททดสอบนี้';
  if (p.c.map !== W.map) return 'บททดสอบนี้ต้องทำที่หมู่บ้านลูมิร่า';
  if (p.wave) return 'บททดสอบกำลังดำเนินอยู่!';
  p.wave = { id, map: W.map, n: 0, left: new Set(), next: Date.now() + 1500 };
  sys(p, '[บททดสอบ] ผู้รุกรานระลอก 1/3 กำลังมาทางประตูตะวันออก!', '#ffb36b');
  return '';
}
function waveTick(p, now) {
  const w = p.wave, W = WAVES[w.id]; if (!w || now < w.next || w.left.size) return;
  if (w.n >= W.waves.length) { p.wave = null; sys(p, '[บททดสอบ] ป้องกันหมู่บ้านสำเร็จ!', '#8fe38f'); Q.onWave(p, w.id, true); return; }
  const [mob, n] = W.waves[w.n++];
  for (let i = 0; i < n; i++) { const [x, y] = randFree(MAPS[W.map], W.zone, true); const mb = spawnMob(W.map, mob, x, y, { wave: p.id, target: p.id, noLoot: w.n < 3 }); w.left.add(mb.id); }
  if (w.n > 1) sys(p, `[บททดสอบ] ระลอก ${w.n}/${W.waves.length}!`, '#ffb36b');
  w.next = now + 2500;
}
function endWave(p, ok) {
  const w = p.wave; if (!w) return; p.wave = null;
  for (const id of w.left) { const mb = mobs.get(id); if (mb) { mobs.delete(id); bcast(mb.map, { t: 'fx', k: 'die', id }); } }
  if (!ok) Q.onWave(p, w.id, false);
}

// ---------------------------------------------------------------- npc dialogs
const npcAt = (m, id) => m.npcs.find(n => n.id === id);
function npcTalk(p, npcId, act, arg, arg2) {
  const m = MAPS[p.c.map], npc = npcAt(m, npcId); if (!npc) return;
  if (Math.max(Math.abs(npc.x - p.c.x), Math.abs(npc.y - p.c.y)) > 4) return sys(p, 'อยู่ไกลเกินไป เดินเข้าไปใกล้ก่อน');
  const c = p.c, key = m.id + ':' + npc.id;
  const dlg = (text, opts = []) => send(p, { t: 'dlg', npc: npc.id, name: npc.n, text, opts, role: npc.role });
  // quest lines first: picking one, or the NPC has something to hand in
  if (act === 'q') { const r = Q.talk(p, key, arg, arg2); if (r) { me(p); return dlg(r.text, (r.opts || []).filter(o => o[0])); } }
  const ql = Q.forNpc(c, key).filter(x => x.what !== 'progress' || QUESTS[x.id].giver === key);
  const qopts = ql.map(x => [`q:${x.id}`, (x.what === 'turnin' ? '✔ ' : x.what === 'avail' ? '❗ ' : x.what === 'lv' ? `🔒 (Lv ${x.lv}) ` : '… ') + QUESTS[x.id].th]);
  const turnin = ql.some(x => x.what === 'turnin' || x.what === 'avail');
  if (npc.id === 'iris') {
    const q = IRIS[c.q.step];
    if (!q) return dlg('ขอบคุณที่ช่วยโซลคารานะ นักผจญภัย!\nเรื่องราวบทต่อไปกำลังจะมาเร็วๆ นี้... (Phase 2)');
    if (act === 'done' && c.q.k >= q.n) {
      const ri = ITEMS[q.item[0]], stacks = ri.ty !== 'eq' && c.inv.some(s => s.id === ri.id);
      if (!stacks && c.inv.length + (ri.ty === 'eq' ? q.item[1] : 1) > 40) return dlg('กระเป๋าของเจ้าเต็มแล้ว เคลียร์ช่องว่างก่อนแล้วค่อยมารับรางวัลนะ');
      c.zeny += q.zeny; gainExp(p, q.exp); addItem(c, q.item[0], q.item[1]);
      c.q.step++; c.q.k = 0; dirty = true; me(p);
      return dlg(`เยี่ยมมาก! รับรางวัล ${q.zeny} Zeny, EXP ${q.exp} และ ${ITEMS[q.item[0]].n} x${q.item[1]}\n\n${IRIS[c.q.step] ? 'ภารกิจถัดไป: ' + IRIS[c.q.step].txt : 'เจ้าผ่านบททดสอบทั้งหมดแล้ว!'}`);
    }
    if (c.q.k >= q.n) return dlg('เจ้าทำภารกิจสำเร็จแล้ว! รับรางวัลเลยไหม?', [['done', 'รับรางวัล']]);
    const intro = c.q.step === 0 ? 'ยินดีต้อนรับสู่ โซลคารา เมืองหลวงแห่งเอลินดรา!\nดวงดาวตกลงมาเมื่อคืน และมอนสเตอร์รอบเมืองก็ดุร้ายขึ้น...\n\n' : '';
    return dlg(`${intro}ภารกิจ: ${q.txt}\nความคืบหน้า: ${c.q.k}/${q.n}\n\n(แตะพื้นเพื่อเดิน แตะมอนเพื่อโจมตี)`);
  }
  const say = npc.say ? npc.say[Math.floor(Math.random() * npc.say.length)] : '';
  switch (npc.role) {
    case 'heal': { const hv = c.maxhp - c.hp, sv = c.maxsp - c.sp; c.hp = c.maxhp; c.sp = c.maxsp; me(p); bcast(c.map, { t: 'fx', k: 'heal', id: p.id, v: hv, sp: sv }); return dlg('ฟื้นฟู HP/SP ให้เต็มแล้วค่ะ ระวังตัวด้วยนะคะ~', qopts); }
    case 'teleport': case 'gate': {
      if (act === 'go') {
        const t = (npc.dest || []).find(d => d[0] === arg); if (!t) return;
        if (t[4] && c.lv < t[4]) return dlg(`ปลายทางนี้ต้องการ Lv ${t[4]} ขึ้นไป`);
        const fee = warpFee(c, npc, t[0]); if (c.zeny < fee) return dlg(`ค่าเดินทาง ${fee} Zeny — Zeny ไม่พอ`);
        if (fee) { c.zeny -= fee; me(p); sys(p, `จ่ายค่าเดินทาง ${fee} Zeny`); dirty = true; }
        send(p, { t: 'dlgclose' }); return warp(p, t[0], t[1], t[2]);
      }
      return dlg(npc.role === 'gate' ? (say || 'ประตูดันเจี้ยน') : (c.lv <= WARP_FREE_LV ? `จะไปที่ไหนดี? นักผจญภัย Lv ${WARP_FREE_LV} ลงมาไปส่งฟรี!` : 'จะไปที่ไหนดี? (มีค่าเดินทาง)'), [...qopts, ...npc.dest.map(d => { const fee = warpFee(c, npc, d[0]); return [`go:${d[0]}`, d[3] + (d[4] && c.lv < d[4] ? ' 🔒' : fee ? ` · ${fee}z` : '')]; })]);
    }
    case 'shop': case 'sell':
      if (act === 'shop' || (!turnin && act == null)) return openShop(p, npc);
      return dlg(say || 'ต้องการอะไรไหม?', [...qopts, ['shop', npc.role === 'sell' ? 'ขายของ' : 'ซื้อของ']]);
    case 'inn':
      if (act === 'save') { c.save = { map: m.id, x: npc.x, y: npc.y + 1 }; dirty = true; me(p); return dlg('บันทึกจุดเกิดที่นี่แล้ว! ถ้าหมดสติหรือใช้คัมภีร์กลับบ้าน จะกลับมาที่นี่', qopts); }
      if (act === 'rest') { if (c.zeny < npc.rest) return dlg('Zeny ไม่พอค่าห้องจ้ะ'); c.zeny -= npc.rest; const hv = c.maxhp - c.hp, sv = c.maxsp - c.sp; c.hp = c.maxhp; c.sp = c.maxsp; me(p); bcast(c.map, { t: 'fx', k: 'heal', id: p.id, v: hv, sp: sv }); return dlg('หลับสบายไหม? พลังกลับมาเต็มแล้ว'); }
      return dlg(say || 'ยินดีต้อนรับ!', [...qopts, ['save', 'บันทึกจุดเกิดที่นี่'], ['rest', `พักผ่อน (${npc.rest} Zeny)`]]);
    case 'storage': if (act === 'open' || !turnin) { p.station = 'storage:' + npc.id; return send(p, { t: 'storage', items: c.store, max: 100 }); } return dlg('คลังเก็บของ', [...qopts, ['open', 'เปิดคลัง']]);
    case 'bank': p.station = 'bank:' + npc.id; return send(p, { t: 'bankui', bank: c.bank, zeny: c.zeny });
    case 'craft': case 'smith':
      if (act === 'open' || !turnin) { p.station = npc.station + ':' + npc.id; return send(p, { t: 'craftui', station: npc.station, name: npc.n, recipes: Object.values(RECIPES).filter(r => r.station === npc.station).map(r => r.id) }); }
      return dlg(say || 'ต้องการสร้างอะไร?', [...qopts, ['open', 'เปิดโต๊ะช่าง']]);
    case 'board': {
      const daily = Object.values(QUESTS).filter(q => q.giver === key);
      const lines = daily.map(q => `• ${q.th} ${Q.done(c, q.id) ? '(วันนี้ทำแล้ว)' : c.qs.a[q.id] ? '(กำลังทำ)' : q.req.lv && c.lv < q.req.lv ? `(Lv ${q.req.lv}+)` : q.req.max && c.lv > q.req.max ? '(เลเวลเกิน)' : ''}`).join('\n');
      return dlg(`กระดานประกาศ — เควสประจำวัน (รีเซ็ตทุกวัน)\n${lines || 'ยังไม่มีประกาศ'}`, qopts);
    }
    case 'master': {
      const K = CLASSES[npc.cls], kids = C.childrenOf(K.id).map(id => CLASSES[id]);
      const head = `${say}\n\nอาชีพ: ${K.th} (${K.en}) — ${K.role}\n${K.d}\nเงื่อนไข: Lv ${K.reqLv}+ และยังเป็นนักผจญภัย`;
      if (c.cls === npc.cls) return dlg(`${say}\nเจ้าคือ ${K.th} แล้ว — อาชีพขั้นที่ 2 (เลือกได้ 1 ทาง):\n${kids.map(k => `• ${k.th} (${k.en}) — ${k.role}\n  ${k.d}`).join('\n')}\nเงื่อนไข: Lv ${kids[0].reqLv}+ และ Job Lv ${kids[0].reqJob}+ (ตอนนี้ Lv ${c.lv} / Job ${c.jlv})`, qopts);
      if (kids.some(k => k.id === c.cls)) return dlg(`${say}\nเจ้าเป็น ${CLASSES[c.cls].th} แล้ว — ฝึกสกิลด้วยแต้มสกิลในหน้าต่างสกิล`, qopts);
      if (c.cls !== 'adventurer') return dlg(`${say}\nเจ้าเลือกเส้นทางอื่นไปแล้ว`, qopts);
      return dlg(head, qopts);
    }
    case 'event': {
      const on = EV.active(), r = EVR;
      return dlg(on.length ? `อีเวนต์ที่กำลังจัดอยู่:\n${on.map(e => '• ' + e.th).join('\n')}\n\nตัวคูณตอนนี้: EXP ×${r.exp} · Job ×${r.jexp} · ดรอป ×${r.drop}` : `${say || ''}\n\nตอนนี้ยังไม่มีอีเวนต์ที่เปิดอยู่`.trim(), qopts);
    }
    default: return dlg(say || '...', qopts);
  }
}
function openShop(p, npc) {
  const c = p.c;
  if (npc.role === 'sell') { p.shop = null; return send(p, { t: 'shop', mode: 'sell', name: npc.n }); }
  const S = SHOPS[npc.shop]; p.shop = npc.shop;
  const disc = clsOf(c).shopDiscount || 0;
  send(p, { t: 'shop', mode: 'buy', name: S.th, items: S.items.map(id => ({ id, n: ITEMS[id].n, price: Math.ceil(ITEMS[id].buy * (1 - disc)) })) });
}
function nodeAt(m, id) { return m.nodes.find(n => n.id === id); }
function useNode(p, nd) {
  const c = p.c, now = Date.now(); p.nodeCd = p.nodeCd || {};
  if (Math.max(Math.abs(nd.x - c.x), Math.abs(nd.y - c.y)) > 1.6) return sys(p, 'เดินเข้าไปใกล้กว่านี้');
  const seen = [...mobs.values()].some(o => o.map === c.map && o.target === p.id && o.hp > 0) || (!stealthed(c) && [...mobs.values()].some(o => o.map === c.map && MOBS[o.type].aggro && Math.hypot(o.x - c.x, o.y - c.y) < 4));
  const r = Q.nodeUse(p, nd, { seen });
  if (r && r.msg) return sys(p, r.msg, '#ffb36b');
  if (r && r.done) { me(p); return; }
  if (!r && nd.quest) return sys(p, nd.k === 'injured' ? 'ทหารคนนี้บาดเจ็บ... ครูเคลริกอาจต้องการให้เจ้าช่วย' : `${nd.n} — ตอนนี้ยังไม่มีอะไรให้ทำ`, '#b9a98e');
  const key = c.map + ':' + nd.id; if ((p.nodeCd[key] || 0) > now) return sys(p, `${nd.n} — ยังไม่ฟื้น รออีก ${Math.ceil((p.nodeCd[key] - now) / 1000)} วิ`, '#b9a98e');
  const item = (r && r.item) || nd.item; if (!item) return;
  if (!addItem(c, item)) return sys(p, 'กระเป๋าเต็ม');
  p.nodeCd[key] = now + (nd.respawn || 30) * 1000;
  send(p, { t: 'nodecd', id: nd.id, ms: (nd.respawn || 30) * 1000 });
  bcast(c.map, { t: 'fx', k: 'gather', id: p.id, node: nd.id });
  sys(p, `ได้รับ ${ITEMS[item].n}`, '#c8f7c5');
  if (r && r.after) r.after(); else Q.onItems(p);
  dirty = true; me(p);
}
function craft(p, rid) {
  const c = p.c, r = RECIPES[rid]; if (!r) return;
  if (!p.station || p.station.split(':')[0] !== r.station) return sys(p, 'ต้องสร้างที่โต๊ะช่างที่เหมาะสม');
  const npc = npcAt(MAPS[c.map], p.station.split(':')[1]); if (!npc || Math.max(Math.abs(npc.x - c.x), Math.abs(npc.y - c.y)) > 4) return sys(p, 'อยู่ไกลโต๊ะช่างเกินไป');
  for (const [it, n] of r.in) if (countItem(c, it) < n) return sys(p, `วัตถุดิบไม่พอ: ${ITEMS[it].n} ${countItem(c, it)}/${n}`, '#ff8b8b');
  if (c.zeny < r.zeny) return sys(p, 'Zeny ไม่พอ');
  for (const [it, n] of r.in) takeItem(c, it, n);
  if (!addItem(c, r.out[0], r.out[1])) { for (const [it, n] of r.in) addItem(c, it, n); return sys(p, 'กระเป๋าเต็ม'); }
  c.zeny -= r.zeny; dirty = true;
  sys(p, `สร้างสำเร็จ: ${ITEMS[r.out[0]].n} x${r.out[1]}`, '#c8f7c5'); bcast(c.map, { t: 'fx', k: 'gather', id: p.id });
  Q.onCraft(p, rid); Q.onItems(p); me(p);
}
// can this character wear the item? '' = yes, otherwise the reason
function equipBlock(c, it) {
  if (it.req && c.lv < it.req) return `ต้องการ Lv ${it.req}`;
  const line = lineOf(c);
  if (it.cls && !it.cls.some(k => line.includes(k))) return `อาชีพนี้สวมไม่ได้ (${it.cls.map(k => CLASSES[k].th).join(' / ')})`;
  if (it.id >= 200 && it.slot === 'wpn' && it.wt && !line.some(k => (CLASSES[k].weapons || []).includes(it.wt)) ) return `อาชีพนี้ใช้ ${WEAPON_TYPES[it.wt].th} ไม่ได้`;
  return '';
}

// ---------------------------------------------------------------- ws handling
// behind a reverse proxy (Caddy, TRUST_PROXY=1) the client address / scheme come from X-Forwarded-*; otherwise the socket
const clientIp = req => { const s = (req.socket && req.socket.remoteAddress) || '?'; if (!CFG.trustProxy) return s; const f = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); return f || s; };
const isHttps = req => !!(req.socket && req.socket.encrypted) || (CFG.trustProxy && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https');
const isLocal = req => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(String(req.headers.host || ''));
const SEC_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' };
const server = http.createServer((req, res) => {
  for (const [k, v] of Object.entries(SEC_HEADERS)) res.setHeader(k, v);
  // production: plain HTTP -> HTTPS (localhost development stays on HTTP); HSTS once on HTTPS
  if (CFG.forceHttps && !isHttps(req) && !isLocal(req)) { const host = String(req.headers.host || '').replace(/[^A-Za-z0-9.:\-\[\]]/g, ''); res.writeHead(301, { Location: `https://${host}${String(req.url || '/')}` }); return res.end(); }
  if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  let u;
  try { u = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (u.includes('\0')) { res.writeHead(400); return res.end(); }
  // health check for uptime monitors: no secrets, no admin data
  if (u === '/health') { let dbok = false; try { dbok = store.ping(); } catch (e) { } res.writeHead(dbok ? 200 : 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(JSON.stringify({ status: dbok ? 'ok' : 'degraded', uptime: Math.round(process.uptime()), database: dbok ? 'ok' : 'error', playersOnline: players.size })); }
  if (u === '/api/config') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }); return res.end(JSON.stringify({ name: 'ELYNDRA ONLINE', google: googleId() })); }
  if (u === '/') u = '/index.html';
  const f = path.join(PUB, path.normalize(u).replace(/^(\.\.[\/\\])+/, ''));
  if (!f.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  // still 'no-cache' (always revalidate, so a new build shows up at once), but with an ETag an unchanged file
  // costs a 304 instead of a full download on every visit (the UI art is a few hundred KB)
  fs.stat(f, (se, st) => {
    if (se || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp', '.css': 'text/css', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' }[path.extname(f)] || 'application/octet-stream';
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' }); return res.end(); }
    fs.readFile(f, (e, b) => {
      if (e) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', ETag: etag });
      res.end(b);
    });
  });
});
const wss = new WebSocketServer({ server, maxPayload: 4096 });
const conns = new Set();
wss.on('connection', (ws, req) => {
  const p = { id: NID++, ws, ip: req ? clientIp(req) : '?', c: null, acct: null, path: null, target: null, nextAtk: 0, msgs: 0, lastChat: 0, authBusy: false, authFails: 0, abuse: 0, cd: {}, gcd: 0 };
  conns.add(p);
  // without a listener, a protocol error (e.g. a message over maxPayload) is thrown and kills the process
  ws.on('error', e => console.error('[ws]', e.message));
  ws.on('message', raw => {
    if (++p.msgs > 40) { if (p.msgs === 41 && ++p.abuse % 5 === 1) L.warn('ws_abuse', { u: p.acct, ip: p.ip, n: p.abuse }); return; } // rate limit (reset each second)
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    try { handle(p, m); } catch (e) { console.error(e); }
  });
  ws.on('close', () => { conns.delete(p); logout(p); });
});
setInterval(() => { for (const p of conns) p.msgs = 0; }, 1000);
function logout(p) {
  if (!p.c) return;
  SOC.onLeave(p);
  if (p.wave) endWave(p, false);
  markChar(p.c);
  players.delete(p.id);
  bcast(p.c.map, { t: 'fx', k: 'leave', id: p.id });
  for (const mb of mobs.values()) if (mb.target === p.id) mb.target = null;
  p.c = null;
}
// ------------------------------------------------------------ AUTO settings (per character)
const POTION_CD = 500;
const AUTO_TARGET = ['quest', 'near', 'aggro'], AUTO_COND = ['ready', 'tgtHp', 'myHp', 'mySp', 'spLow', 'enemies', 'buff', 'boss', 'nonboss', 'quest'];
function sanitizeAuto(a) {
  if (!a || typeof a !== 'object') return null;
  const num = (v, lo, hi, d) => { v = +v; return Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d; };
  const b = v => !!v, id = v => (Number.isInteger(+v) && ITEMS[+v] && ITEMS[+v].ty === 'use' ? +v : 0);
  const sk = {};
  for (const [k, v] of Object.entries(a.skills || {}).slice(0, 40)) {
    if (!SKILLS[k] || !v || typeof v !== 'object') continue;
    sk[k] = { on: b(v.on), pr: num(v.pr, 1, 20, 5), cond: AUTO_COND.includes(v.cond) ? v.cond : 'ready', val: num(v.val, 1, 99, 50) };
  }
  return {
    target: AUTO_TARGET.includes(a.target) ? a.target : 'quest', range: num(a.range, 4, 20, 12),
    chase: a.chase !== false, cont: a.cont !== false, retarget: a.retarget !== false, loot: a.loot !== false, avoidBoss: b(a.avoidBoss), lootQuest: b(a.lootQuest),
    basic: a.basic !== false, skills: sk,
    hpOn: b(a.hpOn), hpAt: num(a.hpAt, 10, 90, 40), hpItem: +a.hpItem === 0 ? 0 : id(a.hpItem) || 1, hpFall: a.hpFall !== false,
    spOn: b(a.spOn), spAt: num(a.spAt, 10, 90, 25), spItem: +a.spItem === 0 ? 0 : id(a.spItem) || 3, spFall: a.spFall !== false,
  };
}
// navigation data for Auto Quest (client side): where NPCs stand, where monsters spawn, which nodes / monsters give an
// item, and every portal of every open map (with its lock / level gate) so the client can route across maps.
// Movement itself stays server-authoritative: the client only asks the server to walk to a tile / NPC / node.
const GUIDE = (() => {
  const npcs = {}, spawns = {}, nodes = {}, portals = {}, drops = {};
  for (const m of Object.values(MAPS)) {
    for (const n of m.npcs) npcs[m.id + ':' + n.id] = [m.id, n.x, n.y, n.id, n.label || n.n];
    for (const s of m.spawns) (spawns[s.mob] = spawns[s.mob] || []).push([m.id, ...s.zone]);
    for (const b of m.bosses || []) (spawns[b.mob] = spawns[b.mob] || []).push([m.id, b.x - 2, b.y - 2, b.x + 2, b.y + 2]);
    for (const nd of m.nodes) (nodes[nd.k] = nodes[nd.k] || []).push([m.id, nd.x, nd.y, nd.id, nd.item || 0]);
    portals[m.id] = m.portals.map(pt => ({ to: pt.to, x: pt.x, y: pt.y, tx: pt.tx, ty: pt.ty, lv: (pt.req && pt.req.lv) || 0, locked: !!(pt.req && (pt.req.locked || pt.req.quest)) }));
  }
  for (const mb of Object.values(MOBS)) for (const t of Object.values(mb.drops || {})) for (const [it] of t) (drops[it] = drops[it] || []).push(mb.id);
  return { npcs, spawns, nodes, portals, drops, legacy: [['jellop', 10], ['crab', 8], ['leafling', 10], ['kingjel', 1]], legacyNpc: 'solkara:iris' };
})();
// social: rankings, party, guild, trade (engine/social.js)
const SOC = require('./engine/social')({ players, send, sys, getDb: () => db, setDirty: () => { dirty = true; }, commitChars, markChar, isBlocked: (from, to) => !!(from.c && to.c && from.c._id && to.c._id && store.isBlocked(from.c._id, to.c._id)), limit: (k, n, w) => RL.hit(k, n, w), log: L, ITEMS, addItem, countItem, takeItem, me, MAPS, itemsChanged: p => Q.onItems(p) });
setInterval(() => SOC.tick(), 500);
const MAIL = require('./engine/mail')({ store, ITEMS, addItem, countItem, takeItem, L });
const GM = require('./engine/gm')({ store, db, players, send, sys, bcastAll, MAPS, ITEMS, QUESTS, L, warp: (p, m, x, y) => warp(p, m, x, y), walkable, addItem, me, derive, commitChars, logout: p => logout(p), backupNow, mail: MAIL, Q, MAX_LV });
const muted = p => { if (p.mute && p.mute.expires_at && p.mute.expires_at <= Date.now()) p.mute = null; return p.mute; };
// friends / blocks (foundation: chat commands + messages; the friend window comes later)
function socialCmd(p, m) {
  const c = p.c, name = String(m.name || '').trim().slice(0, 14), other = name && store.charIdByName(name);
  const done = t => sys(p, t, '#9fe7ff');
  if (m.t === 'block') {
    if (m.a === 'list') return send(p, { t: 'blocks', list: store.blocksOf(c._id) });
    if (!other || other.id === c._id) return done('ไม่พบผู้เล่นชื่อนี้');
    if (m.a === 'remove') { store.unblock(c._id, other.id); return done(`เลิกบล็อก ${name} แล้ว`); }
    store.block(c._id, other.id); return done(`บล็อก ${name} แล้ว — จะไม่ได้รับกระซิบ/คำขอจากผู้เล่นนี้`);
  }
  if (m.a === 'list') return send(p, { t: 'friends', ...store.friendsOf(c._id) });
  if (!other || other.id === c._id) return done('ไม่พบผู้เล่นชื่อนี้');
  if (m.a === 'remove') { store.friendRemove(c._id, other.id); return done(`ลบ ${name} ออกจากเพื่อนแล้ว`); }
  if (!RL.hit('friend:' + c._id, 20, 3600e3)) return done('ส่งคำขอเป็นเพื่อนบ่อยเกินไป');
  if (store.isBlocked(c._id, other.id) || store.isBlocked(other.id, c._id)) return done('ไม่สามารถส่งคำขอถึงผู้เล่นนี้ได้'); // blocked: nothing reaches them
  const r = store.friendRequest(c._id, other.id), o = [...players.values()].find(x => x.c && x.c._id === other.id);
  if (r === 'accepted') { done(`${name} เป็นเพื่อนกับคุณแล้ว`); if (o) sys(o, `${c.name} เป็นเพื่อนกับคุณแล้ว`, '#9fe7ff'); }
  else { done(`ส่งคำขอเป็นเพื่อนถึง ${name} แล้ว`); if (o) sys(o, `${c.name} ขอเป็นเพื่อน — พิมพ์ /friend ${c.name} เพื่อตอบรับ`, '#9fe7ff'); }
}
const CHAT_CMD = { '/block': ['block', 'add'], '/unblock': ['block', 'remove'], '/friend': ['friend', 'req'], '/unfriend': ['friend', 'remove'], '/friends': ['friend', 'list'], '/blocks': ['block', 'list'] };
// static game data the client needs once (monster visuals, world map, quest texts, classes, recipes)
// skill -> visual effect ids for every skill (other players' skills too), from content/skills.js
const VFX_BIND = Object.fromEntries(Object.entries(SKILLS).filter(([, s]) => s.castVfx || s.projectileVfx || s.hitVfx || s.areaVfx).map(([id, s]) => [id, [s.castVfx || 0, s.projectileVfx || 0, s.hitVfx || 0, s.areaVfx || 0, s.areaVfx ? s.r || s.range || 2 : 0]]));
function welcomeData(c) {
  return {
    items: ITEMS, rarity: C.RARITY,
    mobs: Object.fromEntries(Object.entries(MOBS).map(([k, v]) => [k, { n: v.n, lv: v.lv, boss: !!v.boss, elite: !!v.elite, aggro: !!v.aggro, family: v.family, fam: C.FAMILIES[v.family] ? C.FAMILIES[v.family].th : '', behavior: v.behavior, element: v.element, size: v.size, spr: v.spr, tint: v.tint, scale: v.scale, range: v.range, d: v.d, bgm: v.bgm, spawnSound: v.spawnSound, idleSound: v.idleSound, attackSound: v.attackSound, hitSound: v.hitSound, deathSound: v.deathSound }])),
    skills: skillDefs(c), melee: MELEE, vfx: VFX_BIND,
    classes: Object.fromEntries(Object.values(CLASSES).map(k => [k.id, { th: k.th, en: k.en, tier: k.tier, parent: k.parent, reqLv: k.reqLv, status: k.status, role: k.role, d: k.d }])),
    world: { regions: C.REGIONS, maps: C.MAPS_META, links: C.LINKS },
    quests: Object.fromEntries(Object.values(QUESTS).map(q => [q.id, { th: q.th, type: q.type, giver: q.giver, stages: q.stages.map(s => ({ k: s.k, d: s.d, n: s.n || 1, npc: typeof s.npc === 'string' ? s.npc : undefined, mob: s.mob, item: s.item, node: s.node, map: s.map, x: s.x, y: s.y, r: s.r })), lv: q.req.lv || 1 }])),
    guide: GUIDE,
    recipes: RECIPES,
  };
}
// ---------------------------------------------------------------- accounts: characters, ban check, character select
const CHAR_NAME_ERR = 'ชื่อตัวละคร 2-14 ตัวอักษร (ไทย/อังกฤษ/ตัวเลข)';
const ipOf = p => p.ip || '?';
const banText = b => `บัญชีนี้ถูกระงับ: ${b.reason}${b.expires_at ? ` (ถึง ${new Date(b.expires_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })})` : ' (ถาวร)'}`;
function charCard(c) { return { id: c._id, slot: c._slot, name: c.name, lv: c.lv, cls: c.cls || 'adventurer', clsTh: (CLASSES[c.cls] || {}).th || 'นักผจญภัย', jlv: c.jlv || 1, map: c.map, mapName: (MAPS[c.map] || {}).name || c.map, portraitId: c.portraitId || POR.portraitFallback(c.look, c.name), look: c.look }; }
function sendChars(p, sel) { const a = db.accounts[p.acct]; if (!a) return; send(p, { t: 'chars', list: a.chars.map(charCard), max: a.slots || 3, guest: !!a.guest, sel: sel || 0 }); }
// a new character in the first free slot (also used by sign-up). The database's UNIQUE name index settles races.
function createChar(a, name, look, portrait) {
  name = String(name || '').trim();
  if (!validName(name)) return { err: CHAR_NAME_ERR };
  if (nameTaken(name)) return { err: 'ชื่อตัวละครนี้มีคนใช้แล้ว' };
  const used = new Set(a.chars.map(c => c._slot)); let slot = 0; for (let i = 1; i <= (a.slots || 3); i++) if (!used.has(i)) { slot = i; break; }
  if (!slot) return { err: `สร้างตัวละครได้สูงสุด ${a.slots || 3} ตัวต่อบัญชี` };
  const c = newChar(name, look, portrait);
  try { store.insertChar(a, c, slot); } catch (e) { return { err: /UNIQUE/.test(e.message) ? 'ชื่อตัวละครนี้มีคนใช้แล้ว' : 'สร้างตัวละครไม่สำเร็จ' }; }
  a.chars.push(c); a.chars.sort((x, y) => x._slot - y._slot);
  return { c };
}
// a new account + its first character in one transaction (nothing is kept if either fails)
function createAccount(login, fields, name, look, portrait) {
  const a = Object.assign({ login, chars: [], created: Date.now() }, fields); let r;
  try { store.tx(() => { store.insertAccount(a); r = createChar(a, name, look, portrait); if (r.err) throw new Error(r.err); }); }
  catch (e) { return { err: r && r.err ? r.err : /UNIQUE/.test(e.message) ? 'ไอดีนี้มีคนใช้แล้ว' : 'สร้างบัญชีไม่สำเร็จ' }; }
  db.accounts[login] = a; return { a, c: r.c };
}
// authenticated: check bans, then the character select (new client: m.cs) or straight into a character (old clients)
function authed(p, u, m, fresh) {
  const a = db.accounts[u]; if (!a) return;
  const ban = store.activeBan(a.id);
  if (ban) { L.warn('login_banned', { u, ip: ipOf(p) }); send(p, { t: 'err', code: 'banned', m: banText(ban) }); return; }
  p.acct = u; a.lastLogin = Date.now(); try { store.saveAccount(a); } catch (e) { }
  if (m.rem) issueToken(p, u);
  if (m.cs && !fresh) return sendChars(p);
  const c = fresh || a.chars[0];
  if (!c) return sendChars(p);
  enterWorld(p, u, c);
}
function enterWorld(p, u, ch) {
  const a = db.accounts[u];
  for (const o of players.values()) if (o.acct === u) { // one character per account in the world
    send(o, { t: 'err', m: 'มีการล็อกอินจากที่อื่น' });
    logout(o); // drop the old session now; its socket can take up to 30s to finish closing
    o.ws.close();
  }
  p.acct = u; p.c = fixChar(ch); p.knows = new Set(skillsFor(p.c).filter(id => ownsSkill(p.c, id)));
  p.mute = store.activeMute(a.id);
  if (p.c.hp <= 0) { p.c.hp = Math.floor(p.c.maxhp / 2); p.c.map = p.c.save.map; p.c.x = p.c.save.x; p.c.y = p.c.save.y; }
  players.set(p.id, p); markChar(p.c);
  send(p, Object.assign({ t: 'welcome', id: p.id, charId: p.c._id }, welcomeData(p.c)));
  warp(p, p.c.map, p.c.x, p.c.y); SOC.onLogin(p);
  bcastAll({ t: 'sys', m: `${p.c.name} เข้าสู่โลก Elyndra`, col: '#9ad0ff' });
  if (p.c.qs.a.mq1 && p.c.qs.a.mq1.s === 0) sys(p, 'คุยกับ ผู้ใหญ่บ้านมาเรน (บ้านทางเหนือของลานหมู่บ้าน) เพื่อเริ่มการผจญภัย', '#ffd34d');
  else if (p.c.q.step === 0 && p.c.q.k === 0 && p.c.map === 'solkara') sys(p, 'คุยกับ ไอริส ที่ลานกลางเมืองเพื่อรับภารกิจแรก', '#ffd34d');
}
// a fixed bcrypt hash so a wrong id costs the same time as a wrong password (no account probing by timing)
const DUMMY = { alg: 'scrypt', salt: 'nosuchaccount', hash: '00'.repeat(32) }; PWD.hash(crypto.randomBytes(8).toString('hex')).then(h => Object.assign(DUMMY, h), () => { });
function loginFail(p, u, why) {
  const f = loginFails.get(u) || { n: 0, t: Date.now() }; if (Date.now() - f.t > 600000) { f.n = 0; f.t = Date.now(); } f.n++; loginFails.set(u, f);
  if (f.n >= LOGIN_MAX_FAILS) f.lock = Date.now() + LOGIN_LOCK_MS;
  L.warn('login_failed', { u, ip: ipOf(p), why, n: f.n });
  send(p, { t: 'err', m: 'อีเมล/ไอดี หรือรหัสผ่านไม่ถูกต้อง' });
  if (++p.authFails >= 5) p.ws.close();
}
const pwErr = pw => pw.length < 4 ? 'รหัสผ่านต้องยาว 4 ตัวขึ้นไป' : pw.length > 64 || PWD.tooLong(pw) ? 'รหัสผ่านยาวเกินไป' : '';

function handle(p, m) {
  if (!p.c && p.acct && db.accounts[p.acct]) { // ---- signed in, at the character select
    const a = db.accounts[p.acct];
    if (m.t === 'chars') return sendChars(p);
    if (m.t === 'enter') { const c = a.chars.find(x => x._id === (m.id | 0)); if (!c) { L.warn('char_spoof', { u: p.acct, id: m.id, ip: ipOf(p) }); return send(p, { t: 'charerr', m: 'ไม่พบตัวละครนี้ในบัญชีของคุณ' }); } return enterWorld(p, p.acct, c); }
    if (m.t === 'newchar') {
      if (!RL.hit('newchar:' + a.id, 10, 3600e3) || !RL.hit('newchar-ip:' + ipOf(p), CFG.rl.newcharIp, 3600e3)) return send(p, { t: 'charerr', m: 'สร้างตัวละครบ่อยเกินไป ลองใหม่ภายหลัง' });
      const look = cleanLook(m), name = String(m.name || '').trim(), por = pickPortrait(m, look, name); if (!por) return send(p, { t: 'charerr', m: 'ภาพตัวละครไม่ถูกต้อง เลือกใหม่อีกครั้ง' });
      const r = createChar(a, name, look, por); if (r.err) return send(p, { t: 'charerr', m: r.err });
      L.log('char_created', { u: p.acct, char: r.c.name }); return sendChars(p, r.c._id);
    }
    if (m.t === 'delchar') { // two steps on the client + the exact name typed again; checked here
      const c = a.chars.find(x => x._id === (m.id | 0)); if (!c) return send(p, { t: 'charerr', m: 'ไม่พบตัวละครนี้ในบัญชีของคุณ' });
      if (!m.confirm || String(m.name || '').trim().toLowerCase() !== c.name.toLowerCase()) return send(p, { t: 'charerr', m: 'พิมพ์ชื่อตัวละครให้ตรงเพื่อยืนยันการลบ' });
      if (!RL.hit('delchar:' + a.id, 5, 3600e3)) return send(p, { t: 'charerr', m: 'ลบตัวละครบ่อยเกินไป ลองใหม่ภายหลัง' });
      if ([...players.values()].some(o => o.c === c)) return send(p, { t: 'charerr', m: 'ตัวละครนี้กำลังออนไลน์อยู่' });
      const G = c.guild && db.guilds[c.guild]; if (G) { G.members = G.members.filter(n => n !== c.name); if (!G.members.length) delete db.guilds[c.guild]; else if (G.master === c.name) G.master = G.members[0]; }
      store.tx(() => { store.deleteChar(c); store.saveGuilds(db.guilds); }); a.chars = a.chars.filter(x => x !== c);
      L.log('char_deleted', { u: p.acct, char: c.name, id: c._id }); send(p, { t: 'chardel', id: c._id }); return sendChars(p);
    }
    if (m.t === 'revoke') { revokeToken(a, String(m.tok || '')); return; }
    return;
  }
  if (!p.c) {
    if (m.t === 'register' || m.t === 'login') {
      const u = String(m.u || '').trim().toLowerCase(), pw = String(m.p || '');
      if (!validId(u)) return send(p, { t: 'err', m: ID_ERR });
      if (m.t === 'register' && pwErr(pw)) return send(p, { t: 'err', m: pwErr(pw) }); // login: any wrong password counts as a failed try (rate limit / lock)
      if (pw.length > 200) return send(p, { t: 'err', m: 'อีเมล/ไอดี หรือรหัสผ่านไม่ถูกต้อง' });
      if (p.authBusy) return; // one password check at a time per connection
      if (m.t === 'register') {
        if (!RL.hit('reg-ip:' + ipOf(p), CFG.rl.registerIp, 3600e3)) { L.warn('rate_limit', { what: 'register', ip: ipOf(p) }); return send(p, { t: 'err', m: 'สมัครบ่อยเกินไป ลองใหม่ภายหลัง' }); }
        if (db.accounts[u]) return send(p, { t: 'err', m: 'ไอดีนี้มีคนใช้แล้ว' });
        const name = String(m.name || '').trim();
        if (!validName(name)) return send(p, { t: 'err', m: CHAR_NAME_ERR });
        if (nameTaken(name)) return send(p, { t: 'err', m: 'ชื่อตัวละครนี้มีคนใช้แล้ว' });
        const look = cleanLook(m);
        const portrait = pickPortrait(m, look, name); if (!portrait) return send(p, { t: 'err', m: 'ภาพตัวละครไม่ถูกต้อง เลือกใหม่อีกครั้ง' });
        p.authBusy = true;
        PWD.hash(pw).then(h => {
          p.authBusy = false;
          if (p.ws.readyState !== 1 || p.c) return;
          // re-check: another connection may have taken the id/name while we were hashing
          if (db.accounts[u]) return send(p, { t: 'err', m: 'ไอดีนี้มีคนใช้แล้ว' });
          const r = createAccount(u, h, name, look, portrait); if (r.err) return send(p, { t: 'err', m: r.err });
          L.log('account_created', { u, ip: ipOf(p) });
          authed(p, u, m, r.c);
        }, () => { p.authBusy = false; send(p, { t: 'err', m: 'สมัครไม่สำเร็จ ลองใหม่อีกครั้ง' }); });
      } else {
        const a = db.accounts[u], lf = loginFails.get(u);
        if (!RL.hit('login-ip:' + ipOf(p), CFG.rl.loginIp, 600e3)) { L.warn('rate_limit', { what: 'login', ip: ipOf(p) }); return send(p, { t: 'err', m: 'ลองเข้าสู่ระบบบ่อยเกินไป รอสักครู่แล้วลองใหม่' }); }
        if (lf && lf.lock > Date.now()) return send(p, { t: 'err', m: `ใส่รหัสผิดหลายครั้ง ลองใหม่ใน ${Math.ceil((lf.lock - Date.now()) / 60000)} นาที` });
        p.authBusy = true;
        // check a password even for unknown ids so response time doesn't reveal which ids exist
        PWD.verify(a && a.hash ? a : DUMMY, pw).then(ok => {
          p.authBusy = false;
          if (p.ws.readyState !== 1 || p.c) return;
          if (!a || !ok || db.accounts[u] !== a) return loginFail(p, u, a ? 'password' : 'unknown');
          loginFails.delete(u);
          if (PWD.needsUpgrade(a)) PWD.hash(pw).then(h => { Object.assign(a, h); store.saveAccount(a); L.log('password_upgraded', { u }); }, () => { });
          authed(p, u, m);
        }, () => { p.authBusy = false; send(p, { t: 'err', m: 'เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง' }); });
      }
    } else if (m.t === 'tlogin') { // remembered session (also how a guest comes back)
      if (!RL.hit('tlogin-ip:' + ipOf(p), CFG.rl.tokenIp, 600e3)) return send(p, { t: 'err', m: 'ลองเข้าสู่ระบบบ่อยเกินไป รอสักครู่แล้วลองใหม่' });
      const u = String(m.u || '').slice(0, 96), a = Object.hasOwn(db.accounts, u) ? db.accounts[u] : null;
      if (!a || !tokenOk(a, m.tok)) { L.warn('session_rejected', { u, ip: ipOf(p) }); return send(p, { t: 'err', m: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', code: 'session' }); }
      authed(p, u, Object.assign({}, m, { rem: 0 }));
    } else if (m.t === 'guest') {
      const ip = ipOf(p), now = Date.now(), list = (guestBy.get(ip) || []).filter(t => now - t < 3600000);
      if (list.length >= GUEST_PER_HOUR) return send(p, { t: 'err', m: 'สร้างบัญชี Guest บ่อยเกินไป ลองใหม่ภายหลัง' });
      let name = String(m.name || '').trim(); if (!validName(name) || nameTaken(name)) name = guestName();
      const gPortrait = pickPortrait(m, cleanLook(m), name); if (!gPortrait) return send(p, { t: 'err', m: 'ภาพตัวละครไม่ถูกต้อง เลือกใหม่อีกครั้ง' });
      list.push(now); guestBy.set(ip, list);
      let u; do { u = 'guest:' + crypto.randomBytes(8).toString('hex'); } while (db.accounts[u]);
      const r = createAccount(u, { guest: 1 }, name, cleanLook(m), gPortrait); if (r.err) return send(p, { t: 'err', m: r.err });
      authed(p, u, Object.assign({}, m, { rem: 1 }), r.c);
    } else if (m.t === 'glogin') {
      if (!googleId()) return send(p, { t: 'err', m: 'ยังไม่ได้เปิดใช้การเข้าสู่ระบบด้วย Google บนเซิร์ฟเวอร์นี้' });
      if (p.authBusy) return; p.authBusy = true;
      verifyGoogle(m.cred, j => {
        p.authBusy = false; if (p.ws.readyState !== 1 || p.c) return;
        if (!j) return send(p, { t: 'err', m: 'ยืนยันบัญชี Google ไม่สำเร็จ ลองใหม่อีกครั้ง' });
        const u = 'google:' + j.sub; let fresh = null;
        if (!db.accounts[u]) {
          const name = String(m.name || '').trim();
          if (!name) return send(p, { t: 'needchar', via: 'google', email: j.email || '' });
          if (!validName(name)) return send(p, { t: 'err', m: CHAR_NAME_ERR });
          if (nameTaken(name)) return send(p, { t: 'err', m: 'ชื่อตัวละครนี้มีคนใช้แล้ว' });
          const gp = pickPortrait(m, cleanLook(m), name); if (!gp) return send(p, { t: 'err', m: 'ภาพตัวละครไม่ถูกต้อง เลือกใหม่อีกครั้ง' });
          const r = createAccount(u, { google: j.email || 1 }, name, cleanLook(m), gp); if (r.err) return send(p, { t: 'err', m: r.err });
          fresh = r.c;
        }
        authed(p, u, m, fresh);
      });
    }
    return;
  }
  if (m.t === 'revoke') { const a = db.accounts[p.acct]; if (a) revokeToken(a, String(m.tok || '')); return; }
  if (m.t === 'charsel') { logout(p); return sendChars(p); } // back to the character select (session stays)
  if (m.t === 'bind') { // a guest keeps the character and gets a normal e-mail / id + password login
    const a = db.accounts[p.acct], u = String(m.u || '').trim().toLowerCase(), pw = String(m.p || '');
    if (!a || !a.guest) return sys(p, 'บัญชีนี้ไม่ใช่บัญชี Guest', '#ff8b8b');
    if (!validId(u)) return send(p, { t: 'bindres', ok: false, m: ID_ERR });
    if (pwErr(pw)) return send(p, { t: 'bindres', ok: false, m: pwErr(pw) });
    if (db.accounts[u]) return send(p, { t: 'bindres', ok: false, m: 'อีเมล/ไอดีนี้มีคนใช้แล้ว' });
    if (p.authBusy) return; p.authBusy = true;
    PWD.hash(pw).then(h => {
      p.authBusy = false; if (!p.c || db.accounts[p.acct] !== a) return;
      if (db.accounts[u]) return send(p, { t: 'bindres', ok: false, m: 'อีเมล/ไอดีนี้มีคนใช้แล้ว' });
      const old = a.login; Object.assign(a, h, { login: u }); delete a.guest;
      try { store.tx(() => { store.saveAccount(a); store.clearSessions(a); }); } catch (e) { Object.assign(a, { login: old, guest: 1 }); return send(p, { t: 'bindres', ok: false, m: 'อีเมล/ไอดีนี้มีคนใช้แล้ว' }); }
      delete db.accounts[old]; db.accounts[u] = a; p.acct = u;
      L.log('guest_bound', { u });
      send(p, { t: 'bindres', ok: true, u, m: 'ผูกบัญชีสำเร็จ! ครั้งหน้าเข้าเกมด้วยอีเมล/ไอดีนี้ได้เลย' }); issueToken(p, u); me(p);
    }, () => { p.authBusy = false; });
    return;
  }
  const c = p.c, map = MAPS[c.map];
  if (m.t === 'chat') {
    const raw = String(m.m || '').trim();
    if (/^\/gm(\s|$)/i.test(raw) && GM.run(p, raw)) return;
    const cc = CHAT_CMD[raw.split(/\s+/)[0].toLowerCase()]; if (cc) return socialCmd(p, { t: cc[0], a: cc[1], name: raw.split(/\s+/).slice(1).join(' ') });
    const mu = muted(p); if (mu) return sys(p, `คุณถูกห้ามแชท${mu.expires_at ? ' ถึง ' + new Date(mu.expires_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : ''}: ${mu.reason}`, '#ff8b8b');
    if (!RL.hit('chatmin:' + p.acct, 40, 60000)) { L.warn('chat_flood', { u: p.acct }); return sys(p, 'ส่งข้อความเร็วเกินไป พักสักครู่', '#ff8b8b'); }
  }
  if (m.t === 'admin') { GM.view(p, m); return; }
  if (m.t === 'friend' || m.t === 'block') return socialCmd(p, m);
  if (m.t === 'mail') {
    const a = String(m.a || 'list');
    if (a === 'claim') { const e = MAIL.claim(p, m.id); if (e) sys(p, e, '#ffb36b'); else { sys(p, 'รับของจากจดหมายแล้ว', '#8fe38f'); me(p); } }
    else if (a === 'read') MAIL.read(c, m.id);
    else if (a === 'send') {
      if (!RL.hit('mail:' + c._id, 10, 3600e3)) return sys(p, 'ส่งจดหมายบ่อยเกินไป');
      const to = store.charIdByName(String(m.to || '')); const e = MAIL.sendFromPlayer(p, to && to.id, m.subject, m.body, m.item, m.qty, m.gold);
      if (typeof e === 'string') return sys(p, e, '#ffb36b'); sys(p, 'ส่งจดหมายแล้ว', '#8fe38f'); me(p);
      const o = [...players.values()].find(x => x.c && to && x.c._id === to.id); if (o) sys(o, `📬 จดหมายใหม่จาก ${c.name}`, '#ffd34d');
    }
    return send(p, { t: 'mail', list: MAIL.list(c) });
  }
  if (SOC.handle(p, m)) return; // rankings / party / guild / trade / party+guild chat
  if (p.dead && m.t !== 'respawn' && m.t !== 'chat') { if (m.t === 'cast' || m.t === 'attack') failMsg(p, String(m.s || 'attack').slice(0, 16), 'dead'); return; }
  switch (m.t) {
    case 'move': {
      const x = m.x | 0, y = m.y | 0;
      p.target = null; p.pick = null; p.npcGo = null; p.nodeGo = null; p.pendingSkill = false;
      const pa = findPath(map, c.x, c.y, x, y);
      p.path = pa;
      break;
    }
    case 'attack': {
      // m.n = attack button: only swings if the target is already in reach (no auto-walk);
      // without it (tap a selected mob / AUTO) the old chase-and-attack behaviour is kept
      const mob = mobs.get(m.id);
      if (!mob || mob.map !== c.map) { if (m.n) failMsg(p, 'attack', 'target'); break; }
      if (p.target !== mob.id) p.pendingSkill = false;
      p.pick = null; p.npcGo = null; p.nodeGo = null;
      if (m.n) {
        const why = hitBlock(c, mob, c.range); if (why) { p.target = null; failMsg(p, 'attack', why); break; }
        p.target = mob.id; p.noChase = true; p.path = null;
        if (Date.now() >= p.nextAtk) { p.nextAtk = Date.now() + c.aspd; playerAttack(p, mob); }
      } else { p.target = mob.id; p.noChase = false; }
      break;
    }
    case 'skill': castSkill(p, 'bash', m.id, true); break; // legacy Bash message
    case 'cast': castSkill(p, m.s, m.id); break;
    case 'learn': { // learn / raise a second-class skill with a skill point
      const sid = String(m.s || ''), S = Object.hasOwn(SKILLS, sid) ? SKILLS[sid] : null;
      const why = !S || S.tier !== 2 ? 'bad' : !lineOf(c).includes(S.cls) ? 'class' : (c.jlv | 0) < S.job && clsOf(c).id === S.cls ? 'job' : (sk2(c)[sid] | 0) >= S.maxLv ? 'max' : skSpent(c) >= skPoints(c) ? 'points' : '';
      if (why) return send(p, { t: 'learnfail', s: sid.slice(0, 20), r: why, job: S && S.job });
      const first = !sk2(c)[sid]; sk2(c)[sid] = (sk2(c)[sid] | 0) + 1;
      if (first && S.type !== 'passive' && !c.hot.includes(sid)) { const free = c.hot.indexOf(null); if (free >= 0) c.hot[free] = sid; }
      p.knows = new Set(skillsFor(c).filter(id => ownsSkill(c, id)));
      derive(c); dirty = true; send(p, { t: 'skills', skills: skillDefs(c) }); me(p);
      sys(p, `${first ? 'เรียน' : 'อัป'}สกิล ${S.th} Lv ${sk2(c)[sid]}`, '#9fe7ff');
      return;
    }
    case 'portrait': { // change portrait (free for now; locked ones need an unlock). Only registry ids are accepted.
      const id = String(m.id || '').slice(0, 40);
      if (!POR.portraitAllowed(id, c)) { send(p, { t: 'portraitfail', m: POR.portraitOf(id) ? 'ภาพนี้ยังไม่ปลดล็อก' : 'ไม่พบภาพนี้' }); break; }
      c.portraitId = id; dirty = true; me(p); break;
    }
    case 'hot': { // hotbar: 6 slots of owned-or-locked skill ids / null
      if (!Array.isArray(m.h)) return;
      const seen = new Set(); // learned skills only, each in at most one slot
      c.hot = Array.from({ length: 6 }, (_, i) => { const id = m.h[i]; if (typeof id !== 'string' || !ownsSkill(c, id) || SKILLS[id].type === 'passive' || seen.has(id)) return null; seen.add(id); return id; });
      dirty = true; me(p);
      break;
    }
    case 'pick': { const d = drops.get(m.id); if (d && d.map === c.map) { p.pick = d.id; p.target = null; p.path = findPath(map, c.x, c.y, d.x, d.y) || []; } break; }
    case 'npc': {
      const npc = npcAt(map, m.id); if (!npc) return;
      if (Math.max(Math.abs(npc.x - c.x), Math.abs(npc.y - c.y)) <= 3) return npcTalk(p, npc.id);
      // walk next to npc
      let best = null; for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) { const pa = findPath(map, c.x, c.y, npc.x + dx, npc.y + dy); if (pa && (!best || pa.length < best.length)) best = pa; }
      p.path = best; p.target = null; p.npcGo = npc.id; p.nodeGo = null;
      break;
    }
    case 'npcAct': { const [act, arg, arg2] = String(m.a || '').split(':'); npcTalk(p, String(m.id), act, arg, arg2); break; }
    case 'node': {
      const nd = nodeAt(map, String(m.id)); if (!nd) return;
      if (Math.max(Math.abs(nd.x - c.x), Math.abs(nd.y - c.y)) <= 1.5) return useNode(p, nd);
      let best = null; for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 0]]) { const pa = findPath(map, c.x, c.y, nd.x + dx, nd.y + dy); if (pa && (!best || pa.length < best.length)) best = pa; }
      p.path = best; p.target = null; p.nodeGo = nd.id; p.npcGo = null;
      break;
    }
    case 'quest': { // log actions: track / abandon
      const id = String(m.id || '');
      if (m.a === 'track') Q.track(p, id); else if (m.a === 'abandon' && Q.abandon(p, id)) sys(p, 'ยกเลิกเควสแล้ว');
      me(p); break;
    }
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
        if (o !== p && store.isBlocked(c._id, o.c._id)) return sys(p, 'ไม่สามารถส่งข้อความถึงผู้เล่นนี้ได้'); // the receiver blocked you
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
        if (it.req && c.lv < it.req) return sys(p, `ต้องการ Lv ${it.req}`);
        if (it.recall) { delSlot(c, m.i | 0); dirty = true; sys(p, 'คัมภีร์เรืองแสง... กลับสู่จุดเซฟ'); return warp(p, c.save.map, c.save.x, c.save.y); }
        // potions: shared cooldown, and never drunk when they would restore nothing (AUTO or a mis-tap)
        const fail = r => { send(p, { t: 'usefail', id: it.id, r }); if (!m.auto) sys(p, r, '#ffb36b'); };
        if ((it.heal || it.sp) && Date.now() < (p.nextPot || 0)) return fail('ยังใช้ยาไม่ได้ (คูลดาวน์)');
        if ((it.heal || it.sp) && (!it.heal || c.hp >= c.maxhp) && (!it.sp || c.sp >= c.maxsp)) return fail(it.heal && !it.sp ? 'HP เต็มอยู่แล้ว' : it.sp && !it.heal ? 'SP เต็มอยู่แล้ว' : 'HP/SP เต็มอยู่แล้ว');
        if (it.heal || it.sp) p.nextPot = Date.now() + POTION_CD;
        const hp0 = c.hp, sp0 = c.sp;
        if (it.heal) c.hp = Math.min(c.maxhp, c.hp + it.heal);
        if (it.sp) c.sp = Math.min(c.maxsp, c.sp + it.sp);
        delSlot(c, m.i | 0); bcast(c.map, { t: 'fx', k: 'heal', id: p.id, v: c.hp - hp0, sp: c.sp - sp0 }); me(p);
      } else if (it.ty === 'eq') {
        const why = equipBlock(c, it); if (why) { sys(p, `สวม ${it.n} ไม่ได้: ${why}`, '#ff8b8b'); return send(p, { t: 'eqfail', id: it.id, r: why }); }
        const sl = it.slot === 'acc' ? (!c.eq.acc1 ? 'acc1' : !c.eq.acc2 ? 'acc2' : 'acc1') : it.slot;
        const old = c.eq[sl]; c.eq[sl] = s.id; c.inv.splice(m.i | 0, 1); if (old) addItem(c, old); me(p); dirty = true;
      } else if (it.ty === 'quest') sys(p, `${it.n}: ${it.d || 'ไอเทมเควส'}`, '#b9a98e');
      break;
    }
    case 'unequip': { const sl = String(m.s); if (!EQ_SLOTS.includes(sl)) return; if (c.eq[sl] && c.inv.length < 40) { addItem(c, c.eq[sl]); delete c.eq[sl]; me(p); dirty = true; } break; }
    case 'autocfg': { // AUTO settings: stored per character (validated + size-limited), applied by the client
      const v = sanitizeAuto(m.cfg); if (!v) return; c.auto = v; dirty = true; break;
    }
    case 'drop': { const i = m.i | 0; if (c.inv[i] && (m.id == null || c.inv[i].id === m.id) && ITEMS[c.inv[i].id].ty !== 'quest') { const q = Math.max(1, Math.min(c.inv[i].q, (m.q | 0) || c.inv[i].q)); delSlot(c, i, q); dirty = true; me(p); Q.onItems(p); } break; }
    case 'stat': { const k = String(m.s); if (STATS.includes(k) && c.pts > 0 && c.st[k] < LV.STAT_CAP) { c.pts--; c.st[k]++; me(p); dirty = true; } break; }
    case 'buy': {
      const id = m.id | 0, q = Math.max(1, Math.min(99, m.q | 0));
      // shop opened from an NPC: its own list; old clients (no shop opened): the original list, in town
      const list = p.shop ? SHOPS[p.shop].items : (map.town ? SHOP : null);
      if (!list || !list.includes(id)) return;
      const cost = Math.ceil(ITEMS[id].buy * (1 - (p.shop ? clsOf(c).shopDiscount || 0 : 0))) * q;
      if (c.zeny < cost) return sys(p, 'Zeny ไม่พอ');
      if (!addItem(c, id, q)) return sys(p, 'กระเป๋าเต็ม');
      c.zeny -= cost; me(p); dirty = true; sys(p, `ซื้อ ${ITEMS[id].n} x${q} (${cost} Zeny)`);
      Q.onItems(p);
      break;
    }
    case 'sell': {
      if (!map.town) return; const i = m.i | 0, s = c.inv[i]; if (!s || (m.id != null && s.id !== m.id)) return; const q = Math.max(1, Math.min(s.q, m.q | 0 || s.q));
      if (ITEMS[s.id].ty === 'quest') return sys(p, 'ไอเทมเควสขายไม่ได้');
      const gain = ITEMS[s.id].sell * q; delSlot(c, i, q); c.zeny += gain; me(p); dirty = true; sys(p, `ขายได้ ${gain} Zeny`);
      break;
    }
    case 'store': { // storage: a=put|take, i = slot index, q = amount
      if (!p.station || !p.station.startsWith('storage:')) return;
      const npc = npcAt(map, p.station.split(':')[1]); if (!npc || Math.max(Math.abs(npc.x - c.x), Math.abs(npc.y - c.y)) > 4) return;
      const from = m.a === 'put' ? c.inv : c.store, i = m.i | 0, s = from[i]; if (!s || (m.id != null && s.id !== m.id)) return;
      const q = Math.max(1, Math.min(s.q, m.q | 0 || s.q));
      if (m.a === 'put') { if (ITEMS[s.id].ty === 'quest') return sys(p, 'ไอเทมเควสฝากไม่ได้'); const t = ITEMS[s.id].ty !== 'eq' && c.store.find(x => x.id === s.id); if (!t && c.store.length >= 100) return sys(p, 'คลังเต็ม'); delSlot(c, i, q); if (t) t.q += q; else c.store.push({ id: s.id, q }); }
      else { if (!addItem(c, s.id, q)) return sys(p, 'กระเป๋าเต็ม'); s.q -= q; if (s.q <= 0) c.store.splice(i, 1); Q.onItems(p); }
      dirty = true; me(p); send(p, { t: 'storage', items: c.store, max: 100 });
      break;
    }
    case 'bank': {
      if (!p.station || !p.station.startsWith('bank:')) return;
      const z = Math.max(0, Math.floor(+m.z || 0)); if (!z) return;
      if (m.a === 'dep') { if (c.zeny < z) return; c.zeny -= z; c.bank += z; } else if (m.a === 'wd') { if (c.bank < z) return; c.bank -= z; c.zeny += z; } else return;
      dirty = true; me(p); send(p, { t: 'bankui', bank: c.bank, zeny: c.zeny });
      break;
    }
    case 'craft': craft(p, String(m.r || '')); break;
    case 'respawn': {
      if (!p.dead) return; p.dead = false; derive(c); c.hp = Math.floor(c.maxhp / 2); c.sp = Math.floor(c.maxsp / 2);
      warp(p, c.save.map, c.save.x, c.save.y); break;
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
// teleport NPC fee (a money sink): free up to Lv 15 and for dungeon gates; otherwise grows with the destination's level,
// double when it crosses into another region
const WARP_FREE_LV = 15;
function warpFee(c, npc, to) {
  if (npc.role === 'gate' || c.lv <= WARP_FREE_LV) return 0;
  const dm = MAPS[to]; if (!dm) return 0;
  const base = 40 + dm.lv[0] * 6; return dm.region !== MAPS[c.map].region ? base * 2 : base;
}
// portal requirements: { lv } / { quest } / { locked } (planned maps)
function portalBlock(c, pt) {
  const r = pt.req; if (!r) return '';
  if (r.locked) return `${pt.label || 'เส้นทางนี้'} — พื้นที่นี้ยังไม่เปิด`;
  if (r.lv && c.lv < r.lv) return `ต้องการ Lv ${r.lv} ขึ้นไปเพื่อเข้า ${MAPS[pt.to] ? MAPS[pt.to].name : pt.to}`;
  if (r.quest && !Q.done(c, r.quest)) return `ต้องทำเควส "${QUESTS[r.quest].th}" ให้สำเร็จก่อน`;
  return '';
}
const AOE_SKILLS = { quake: { r: 2.6, mult: 1.4, ms: 900 }, root_slam: { r: 2.0, mult: 1.8, ms: 1100 }, spore: { r: 3.4, mult: 1.0, ms: 1200, self: 1 } };
// boss / elite actions: phases (stronger/faster), area slam with a warning circle, summoning helpers, charge
function bossTick(mob, d, tgt, now) {
  const r = mob.hp / mob.maxhp;
  for (let i = mob.phase; i < (d.phases || []).length; i++) if (r <= d.phases[i].at) {
    const ph = d.phases[i]; mob.phase = i + 1; mob.atkMul = ph.atk || 1; mob.spdMul = ph.spd || 1;
    bcast(mob.map, { t: 'sys', m: `[BOSS] ${ph.msg}`, col: '#ff7a7a' }); bcast(mob.map, { t: 'fx', k: 'phase', id: mob.id });
    if (d.minions) for (let k = 0; k < 2; k++) { const [x, y] = randFree(MAPS[mob.map], [Math.round(mob.x) - 4, Math.round(mob.y) - 4, Math.round(mob.x) + 4, Math.round(mob.y) + 4], true); spawnMob(mob.map, d.minions, x, y, { minion: mob.id, target: tgt.id, noLoot: 1 }); }
  }
  if (now < mob.skillAt) return;
  mob.skillAt = now + (mob.phase >= 2 ? 6500 : 9000);
  const sk = d.skills.filter(s => s !== 'summon'); if (!sk.length) return;
  const pick = sk[Math.floor(Math.random() * sk.length)];
  if (pick === 'charge' && Math.hypot(tgt.c.x - mob.x, tgt.c.y - mob.y) > 3) { mob.x = tgt.c.x + (mob.x > tgt.c.x ? 1 : -1); mob.y = tgt.c.y; if (!walkable(MAPS[mob.map], Math.round(mob.x), Math.round(mob.y))) { mob.x = tgt.c.x; mob.y = tgt.c.y; } mob.path = null; bcast(mob.map, { t: 'fx', k: 'charge', id: mob.id }); return; }
  // area attacks: warn first (circle on the ground), hit everyone still inside when it lands.
  // quake: on the target, root_slam: small and heavy on the target, spore: wide ring around the monster itself
  const S = AOE_SKILLS[pick] || AOE_SKILLS.quake, self = S.self;
  const ax = self ? mob.x : tgt.c.x, ay = self ? mob.y : tgt.c.y, R = S.r;
  bcast(mob.map, { t: 'fx', k: 'aoe', id: mob.id, x: ax, y: ay, r: R, ms: S.ms });
  setTimeout(() => {
    if (!mobs.has(mob.id)) return;
    for (const p of players.values()) if (!p.dead && p.c.map === mob.map && Math.hypot(p.c.x - ax, p.c.y - ay) <= R) hurtPlayer(p, Math.max(1, Math.round(d.atk[1] * S.mult * (mob.atkMul || 1) - p.c.def)), mob.id);
  }, S.ms);
}
const snapCache = new Map();
let last = Date.now();
setInterval(() => {
  const now = Date.now(), dt = Math.min(0.25, (now - last) / 1000); last = now;
  const busy = new Set(); for (const p of players.values()) busy.add(p.c.map);
  // players
  for (const p of players.values()) {
    const c = p.c; if (p.dead) continue;
    const pe = { x: c.x, y: c.y, path: p.path, dir: c.dir };
    // chase target
    if (p.target) {
      const mob = mobs.get(p.target);
      if (!mob || mob.map !== c.map) { p.target = null; p.pendingSkill = false; }
      else {
        const d = reach(c, mob), inReach = d <= c.range && los(MAPS[c.map], c.x, c.y, mob.x, mob.y);
        if (inReach) {
          pe.path = null;
          if (p.pendingSkill) { p.pendingSkill = false; castSkill(p, 'bash', mob.id); }
          else if (now >= p.nextAtk) { p.nextAtk = now + c.aspd; playerAttack(p, mob); }
        } else if (p.noChase) {
          if (d > 12) p.target = null; // attack-button target wandered off; stop tracking it
        } else if (!pe.path || !pe.path.length || (p.chaseAt || 0) < now) {
          pe.path = findPath(MAPS[c.map], c.x, c.y, Math.round(mob.x), Math.round(mob.y), 300);
          if (pe.path && pe.path.length) pe.path.pop();
          p.chaseAt = now + 500;
          if (!pe.path) p.target = null;
        }
      }
    }
    const tile0 = Math.round(c.x) + ',' + Math.round(c.y);
    stepToward(pe, (4.6 + c.st.agi * 0.02) * (1 + Math.max(-0.5, Math.min(0.6, buffSum(c, 'spd')))), dt);
    c.x = pe.x; c.y = pe.y; p.path = pe.path; if (pe.dir != null) c.dir = pe.dir;
    if (tile0 !== Math.round(c.x) + ',' + Math.round(c.y)) Q.onMove(p);
    // arrived at npc / node
    if (p.npcGo && (!p.path || !p.path.length)) { const id = p.npcGo; p.npcGo = null; npcTalk(p, id); }
    if (p.nodeGo && (!p.path || !p.path.length)) { const nd = nodeAt(MAPS[c.map], p.nodeGo); p.nodeGo = null; if (nd) useNode(p, nd); }
    // pick up
    if (p.pick && (!p.path || !p.path.length)) {
      const d = drops.get(p.pick); p.pick = null;
      if (d && Math.max(Math.abs(d.x - c.x), Math.abs(d.y - c.y)) <= 1.5) {
        if (d.owner && d.owner !== p.id && now < d.until) sys(p, 'ไอเทมนี้ยังเป็นของคนอื่นอยู่');
        else if (addItem(c, d.item)) { drops.delete(d.id); bcast(c.map, { t: 'fx', k: 'pick', id: d.id, by: p.id, item: d.item }); sys(p, `ได้รับ ${ITEMS[d.item].n}`, '#c8f7c5'); Q.onItems(p); me(p); dirty = true; }
        else sys(p, 'กระเป๋าเต็ม');
      }
    }
    // portal
    if (!p.path || !p.path.length) {
      const map = MAPS[c.map]; const pt = map.portals.find(o => o.x === Math.round(c.x) && o.y === Math.round(c.y));
      if (pt) {
        const why = portalBlock(c, pt);
        if (!why) warp(p, pt.to, pt.tx, pt.ty);
        else if ((p.portalMsg || 0) < now) {
          p.portalMsg = now + 1500; sys(p, why, '#ffb36b');
          const back = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [pt.x + dx, pt.y + dy]).find(([x, y]) => walkable(map, x, y) && get(map, x, y) !== 8);
          if (back) p.path = [back];
        }
      }
    }
    if (p.wave) waveTick(p, now);
    // regen
    if (!p.regenAt || now > p.regenAt) {
      p.regenAt = now + (MAPS[c.map].town ? 2000 : 6000);
      const before = c.hp + c.sp;
      c.hp = Math.min(c.maxhp, c.hp + Math.max(1, Math.floor(c.maxhp * 0.03)));
      c.sp = Math.min(c.maxsp, c.sp + Math.max(1, Math.floor(c.maxsp * 0.04)));
      if (c.hp + c.sp !== before) me(p);
    }
    // regeneration buffs (Healing Mist, Repair Drone): % of MaxHP every second
    if (now >= (p.rgAt || 0)) { p.rgAt = now + 1000; const rg = buffSum(c, 'regen'); if (rg > 0 && c.hp < c.maxhp) { const b = c.hp; c.hp = Math.min(c.maxhp, c.hp + Math.max(1, Math.round(c.maxhp * rg))); bcast(c.map, { t: 'fx', k: 'heal', id: p.id, v: c.hp - b, regen: 1 }); p.meDue = true; } }
    if (p.meDue) { p.meDue = false; me(p); }
  }
  // mobs (maps nobody is on are frozen: they just heal back up)
  for (const mob of mobs.values()) {
    const d = MOBS[mob.type];
    if (!busy.has(mob.map)) { mob.target = null; mob.path = null; mob.hp = mob.maxhp; continue; }
    if (d.dummy) { if (mob.hp < mob.maxhp && now - (mob.hitAt || 0) > 8000) mob.hp = mob.maxhp; continue; }
    if (ST.tick(mob)) continue; // stunned (or just died to a damage-over-time tick)
    let tgt = mob.target ? players.get(mob.target) : null;
    if (!tgt) mob.target = null; // target logged out: let the next attacker re-aggro it
    const leash = d.boss ? 16 : 14;
    if (tgt && (tgt.dead || tgt.c.map !== mob.map || Math.hypot(tgt.c.x - mob.x, tgt.c.y - mob.y) > leash || (stealthed(tgt.c) && !d.boss))) { mob.target = null; tgt = null; }
    if (!tgt && d.aggro && !(mob.fleeUntil > now)) {
      // beginner protection: Lv1-5 players are never attacked first; town safe zones are safe
      for (const p of players.values()) if (!p.dead && p.c.map === mob.map && p.c.lv > 5 && !stealthed(p.c) && !(inSafe(MAPS[mob.map], p.c.x, p.c.y) && !mob.wave) && Math.hypot(p.c.x - mob.x, p.c.y - mob.y) < d.aggro) { mob.target = p.id; tgt = p; if (d.assist) callHelp(mob, p); break; }
    }
    if (mob.wave && !tgt) { const o = players.get(mob.wave); if (o && !o.dead && o.c.map === mob.map) { mob.target = o.id; tgt = o; } }
    // healer: patch up hurt friends nearby
    if (d.heals && now > (mob.healAt || 0)) {
      mob.healAt = now + 3500;
      const f = [...mobs.values()].find(o => o.map === mob.map && o.hp < o.maxhp * 0.7 && Math.hypot(o.x - mob.x, o.y - mob.y) <= 4 && !MOBS[o.type].dummy);
      if (f) { const v = Math.round(f.maxhp * 0.15); f.hp = Math.min(f.maxhp, f.hp + v); bcast(mob.map, { t: 'fx', k: 'mheal', from: mob.id, to: f.id, v }); }
    }
    // coward: runs away when badly hurt
    if (tgt && d.fleeAt && mob.hp < mob.maxhp * d.fleeAt && !(mob.fleeUntil > now)) {
      mob.fleeUntil = now + 3500; const dx = mob.x - tgt.c.x, dy = mob.y - tgt.c.y, l = Math.hypot(dx, dy) || 1, M = MAPS[mob.map];
      const tx = Math.round(mob.x + dx / l * 6), ty = Math.round(mob.y + dy / l * 6);
      mob.path = walkable(M, tx, ty) ? findPath(M, mob.x, mob.y, tx, ty, 200) : null;
    }
    const slow = mob.slowUntil > now ? 0.5 : 1, spdMul = (mob.spdMul || 1) * slow;
    if (mob.fleeUntil > now) { stepToward(mob, d.spd * 1.3 * slow, dt); continue; }
    if (tgt) {
      const dist = Math.max(Math.abs(tgt.c.x - mob.x), Math.abs(tgt.c.y - mob.y)), range = d.range || 1.5;
      const ranged = range > 2;
      if (d.boss || d.elite) bossTick(mob, d, tgt, now);
      if (dist <= range && (!ranged || los(MAPS[mob.map], mob.x, mob.y, tgt.c.x, tgt.c.y))) {
        mob.path = null;
        if (now >= mob.nextAtk) {
          if (ranged) bcast(mob.map, { t: 'fx', k: 'mshot', from: mob.id, to: tgt.id, magic: d.magic ? 1 : 0 });
          mobAttack(mob, tgt, !!d.magic); mob.nextAtk = now + d.aspd;
        }
      } else if (!mob.path || !mob.path.length || (mob.repath || 0) < now) { mob.path = findPath(MAPS[mob.map], mob.x, mob.y, Math.round(tgt.c.x), Math.round(tgt.c.y), 250); if (mob.path) mob.path.pop(); mob.repath = now + 700; }
    } else if (now > mob.nextWander) {
      mob.nextWander = now + 3000 + Math.random() * 5000;
      const m = MAPS[mob.map];
      const tx = Math.round(mob.hx + (Math.random() * 10 - 5)), ty = Math.round(mob.hy + (Math.random() * 10 - 5));
      // a mob dragged far away by a chase gets a bigger search budget so it can walk back home
      const far = Math.max(Math.abs(mob.x - mob.hx), Math.abs(mob.y - mob.hy)) > 10;
      if (walkable(m, tx, ty) && get(m, tx, ty) !== 8 && (!inSafe(m, tx, ty) || m.town)) mob.path = findPath(m, mob.x, mob.y, tx, ty, far ? 600 : 150);
      if (mob.hp < mob.maxhp) mob.hp = Math.min(mob.maxhp, mob.hp + Math.ceil(mob.maxhp * 0.05));
      if (!tgt) { mob.dmg.clear(); mob.phase = 0; mob.atkMul = 1; mob.spdMul = 1; }
    }
    stepToward(mob, (tgt ? d.spd * 1.25 : d.spd * 0.6) * spdMul, dt);
  }
  deviceTick(now);
  // boss respawn
  for (const id in MAPS) for (const bs of MAPS[id].bosses) {
    const k = id + ':' + bs.mob;
    const alive = [...mobs.values()].some(m => m.map === id && m.type === bs.mob && !m.minion);
    if (!alive && (bossTimer[k] || 0) < now) {
      bossTimer[k] = Infinity;
      spawnMob(id, bs.mob, bs.x, bs.y);
      bcastAll({ t: 'sys', m: `[BOSS] ${MOBS[bs.mob].n} ปรากฏตัวที่ ${MAPS[id].name}!`, col: '#ff7a7a' });
    }
  }
  // drops expire
  for (const d of drops.values()) if (now > d.expire) { drops.delete(d.id); bcast(d.map, { t: 'fx', k: 'pick', id: d.id }); }
  // snapshots: only the player's map, and only entities near them (area of interest). Players standing in the
  // same 8x8 block share one serialized snapshot.
  const per = {};
  for (const p of players.values()) { const k = p.c.map; (per[k] = per[k] || { p: [], m: [], d: [] }).p.push([p.id, p.c.name, +p.c.x.toFixed(2), +p.c.y.toFixed(2), p.c.dir | 0, p.c.hp, p.c.maxhp, p.c.lv, p.c.look, p.c.eq.wpn || 0, p.c.eq.chead || p.c.eq.head || 0, p.dead ? 1 : 0, p.c.cls, p.c.eq.arm || 0, p.c.guild || '', p.party || 0]); }
  for (const mob of mobs.values()) { const s = per[mob.map]; if (s) s.m.push([mob.id, mob.type, +mob.x.toFixed(2), +mob.y.toFixed(2), mob.dir | 0, mob.hp, mob.maxhp, mob.target || 0, ST.bits(mob)]); }
  for (const d of drops.values()) { const s = per[d.map]; if (s) s.d.push([d.id, d.item, d.x, d.y]); }
  snapCache.clear();
  for (const p of players.values()) {
    if (p.ws.readyState !== 1) continue;
    const s = per[p.c.map], bx = Math.floor(p.c.x / 8), by = Math.floor(p.c.y / 8), key = p.c.map + ':' + bx + ':' + by;
    let out = snapCache.get(key);
    if (!out) {
      const x0 = bx * 8 - AOI, x1 = bx * 8 + 8 + AOI, y0 = by * 8 - AOI, y1 = by * 8 + 8 + AOI, near = e => e[2] >= x0 && e[2] <= x1 && e[3] >= y0 && e[3] <= y1;
      out = JSON.stringify({ t: 's', p: s.p.filter(near), m: s.m.filter(near), d: s.d.filter(near) });
      snapCache.set(key, out);
    }
    p.ws.send(out);
  }
}, TICK);
const AOI = 30; // tiles of view around the player's 8x8 block

function syncChars() { if (players.size) dirty = true; }
function shutdown() { syncChars(); dirty = true; saveDb(); try { store.close(); } catch (e) { } process.exit(0); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// remote-safe restart: creating the file RESTART-REQUEST next to server.js saves every player and exits;
// RUN-SERVER.bat / the scheduled task starts the server again (used for updates without a desktop session)
const RESTART_FLAG = path.join(__dirname, 'RESTART-REQUEST');
setInterval(() => { if (!fs.existsSync(RESTART_FLAG)) return; try { fs.unlinkSync(RESTART_FLAG); } catch (e) { } console.log('[admin] restart requested - saving and exiting'); shutdown(); }, 3000);
// last resort: keep player progress before the process dies (START-LUMIRA-ONLINE.bat restarts it)
process.on('uncaughtException', e => { console.error('[fatal]', e); L.error('server_error', { err: e.message, stack: String(e.stack || '').split('\n').slice(0, 4).join(' | ') }); try { syncChars(); dirty = true; saveDb(); store.close(); } catch (e2) { } process.exit(1); });
setInterval(syncChars, 30000);
server.on('error', e => { console.error(`[http] ${e.code === 'EADDRINUSE' ? 'port ' + PORT + ' is already in use' : e.message}`); process.exit(1); });
server.listen(PORT, CFG.host, () => { console.log(`ELYNDRA ONLINE running on http://localhost:${PORT} (${CFG.env}, ${CFG.host}, node ${process.version}, db ${path.basename(CFG.databasePath)})`); L.log('server_start', { env: CFG.env, port: PORT, host: CFG.host, node: process.version, ...store.counts() }); });
