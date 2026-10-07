'use strict';
// ============================================================ ELYNDRA ONLINE — persistent storage (SQLite)
// node:sqlite (built into Node >= 22.5): synchronous, real transactions, WAL. The game keeps characters in memory as
// plain objects (player.c) exactly as before; this module turns them into rows and back.
//   * one account -> up to N characters (slot 1..N)
//   * every write that must not half-happen (trade, mail claim, GM grants, deleting a character) runs in ONE transaction
//   * nothing is dropped: character fields without a column go to characters.extra (json)
// See docs/DATABASE_MIGRATION_PLAN.md.
const fs = require('fs'), path = require('path');
{ // node:sqlite prints an "experimental" warning on some Node versions — hide only that one
  const emit = process.emitWarning;
  process.emitWarning = function (w, ...a) { const s = String((w && w.message) || w); if (/SQLite/i.test(s)) return; return emit.call(this, w, ...a); };
}
const { DatabaseSync } = require('node:sqlite');

const SCHEMA_VERSION = 1;
const ROLES = ['PLAYER', 'GM', 'ADMIN'];
// character fields with their own column/table; anything else (except derived combat stats) is kept in `extra`
const CHAR_KNOWN = new Set(['name', 'look', 'portraitId', 'lv', 'exp', 'cls', 'jlv', 'jexp', 'pts', 'st', 'sk2', 'map', 'x', 'y', 'dir', 'save', 'hp', 'sp', 'inv', 'eq', 'store', 'zeny', 'bank', 'q', 'qs', 'guild', 'kills', 'bkills', 'hot', 'auto', 'created']);
const DERIVED = new Set(['maxhp', 'maxsp', 'atk', 'def', 'hit', 'flee', 'aspd', 'crit', 'matk', 'mdef', 'range']);
const STATS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY, login TEXT NOT NULL UNIQUE, pw_alg TEXT NOT NULL DEFAULT '', pw_salt TEXT NOT NULL DEFAULT '', pw_hash TEXT NOT NULL DEFAULT '',
  guest INTEGER NOT NULL DEFAULT 0, google TEXT, role TEXT NOT NULL DEFAULT 'PLAYER' CHECK (role IN ('PLAYER','GM','ADMIN')),
  char_slots INTEGER NOT NULL DEFAULT 3, created_at INTEGER NOT NULL, last_login_at INTEGER, extra TEXT);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_acct ON sessions(account_id);
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), slot INTEGER NOT NULL,
  name TEXT NOT NULL, name_key TEXT UNIQUE, cls TEXT NOT NULL DEFAULT 'adventurer', lv INTEGER NOT NULL DEFAULT 1, exp REAL NOT NULL DEFAULT 0,
  jlv INTEGER NOT NULL DEFAULT 1, jexp REAL NOT NULL DEFAULT 0, pts INTEGER NOT NULL DEFAULT 0,
  zeny INTEGER NOT NULL DEFAULT 0 CHECK (zeny >= 0), bank INTEGER NOT NULL DEFAULT 0 CHECK (bank >= 0),
  hp REAL NOT NULL DEFAULT 1, sp REAL NOT NULL DEFAULT 0, map TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, dir INTEGER NOT NULL DEFAULT 0,
  save_map TEXT, save_x REAL, save_y REAL, portrait_id TEXT, look TEXT NOT NULL, hot TEXT, guild TEXT NOT NULL DEFAULT '',
  kills INTEGER NOT NULL DEFAULT 0, bkills INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, deleted_at INTEGER, deleted_name TEXT, extra TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS characters_slot ON characters(account_id, slot) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS character_stats (
  char_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  str INTEGER NOT NULL, agi INTEGER NOT NULL, vit INTEGER NOT NULL, int INTEGER NOT NULL, dex INTEGER NOT NULL, luk INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS inventory_items (
  char_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE, container TEXT NOT NULL CHECK (container IN ('inv','store')),
  pos INTEGER NOT NULL, item_id INTEGER NOT NULL, qty INTEGER NOT NULL CHECK (qty > 0), data TEXT, PRIMARY KEY (char_id, container, pos));
CREATE TABLE IF NOT EXISTS equipment (
  char_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE, slot TEXT NOT NULL, item_id INTEGER NOT NULL, PRIMARY KEY (char_id, slot));
CREATE TABLE IF NOT EXISTS skills (
  char_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE, skill_id TEXT NOT NULL, lv INTEGER NOT NULL, PRIMARY KEY (char_id, skill_id));
CREATE TABLE IF NOT EXISTS quests (
  char_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE, step INTEGER NOT NULL DEFAULT 0, k INTEGER NOT NULL DEFAULT 0, tracked TEXT, flags TEXT);
CREATE TABLE IF NOT EXISTS quest_progress (
  char_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE, quest_id TEXT NOT NULL, state TEXT NOT NULL CHECK (state IN ('active','done')),
  stage INTEGER, k INTEGER, f TEXT, done_value INTEGER, PRIMARY KEY (char_id, quest_id, state));
CREATE TABLE IF NOT EXISTS auto_settings (char_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE, cfg TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS guilds (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, master_name TEXT NOT NULL, notice TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS guild_members (
  guild_id INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE, char_name TEXT NOT NULL, lv INTEGER NOT NULL DEFAULT 1, pos INTEGER NOT NULL,
  PRIMARY KEY (guild_id, char_name));
CREATE TABLE IF NOT EXISTS friendships (
  id INTEGER PRIMARY KEY, char_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE, friend_char_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted')), created_at INTEGER NOT NULL, UNIQUE (char_id, friend_char_id), CHECK (char_id <> friend_char_id));
CREATE TABLE IF NOT EXISTS blocks (
  char_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE, blocked_char_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL, PRIMARY KEY (char_id, blocked_char_id), CHECK (char_id <> blocked_char_id));
CREATE TABLE IF NOT EXISTS mail (
  id INTEGER PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('system','player','market','gm')), sender_char_id INTEGER, sender_name TEXT NOT NULL,
  receiver_char_id INTEGER NOT NULL REFERENCES characters(id), subject TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL, read_at INTEGER, expires_at INTEGER, claimed_at INTEGER, deleted_at INTEGER);
CREATE INDEX IF NOT EXISTS mail_to ON mail(receiver_char_id);
CREATE TABLE IF NOT EXISTS mail_attachments (
  id INTEGER PRIMARY KEY, mail_id INTEGER NOT NULL REFERENCES mail(id), item_id INTEGER, qty INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  gold INTEGER NOT NULL DEFAULT 0 CHECK (gold >= 0), data TEXT);
CREATE TABLE IF NOT EXISTS market_listings (
  id INTEGER PRIMARY KEY, seller_char_id INTEGER NOT NULL REFERENCES characters(id), item_instance_id INTEGER, item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0), price INTEGER NOT NULL CHECK (price > 0), created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','cancelled','expired')), buyer_char_id INTEGER, closed_at INTEGER, data TEXT);
CREATE INDEX IF NOT EXISTS market_active ON market_listings(status, item_id);
CREATE TABLE IF NOT EXISTS bans (
  id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), reason TEXT NOT NULL, created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL, expires_at INTEGER, lifted_at INTEGER, lifted_by TEXT);
CREATE INDEX IF NOT EXISTS bans_acct ON bans(account_id);
CREATE TABLE IF NOT EXISTS mutes (
  id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), reason TEXT NOT NULL, created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL, expires_at INTEGER, lifted_at INTEGER, lifted_by TEXT);
CREATE INDEX IF NOT EXISTS mutes_acct ON mutes(account_id);
CREATE TABLE IF NOT EXISTS gm_audit_log (
  id INTEGER PRIMARY KEY, at INTEGER NOT NULL, gm TEXT NOT NULL, gm_role TEXT NOT NULL, action TEXT NOT NULL, target TEXT, reason TEXT, detail TEXT, ok INTEGER NOT NULL DEFAULT 1);
CREATE TRIGGER IF NOT EXISTS gm_audit_no_update BEFORE UPDATE ON gm_audit_log BEGIN SELECT RAISE(ABORT, 'gm_audit_log is append-only'); END;
CREATE TRIGGER IF NOT EXISTS gm_audit_no_delete BEFORE DELETE ON gm_audit_log BEGIN SELECT RAISE(ABORT, 'gm_audit_log is append-only'); END;
`;

const J = v => (v === undefined || v === null ? null : JSON.stringify(v));
const P = (s, d) => { if (s == null) return d; try { return JSON.parse(s); } catch (e) { return d; } };
const hide = (o, k, v) => Object.defineProperty(o, k, { value: v, writable: true, enumerable: false, configurable: true });

function open(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const qc = db.prepare('PRAGMA quick_check').all().map(r => Object.values(r)[0]);
  if (qc.length !== 1 || qc[0] !== 'ok') { db.close(); throw new Error('database integrity check failed: ' + qc.slice(0, 5).join('; ')); }
  db.exec(SCHEMA);
  const v = db.prepare("SELECT v FROM meta WHERE k = 'schema_version'").get();
  if (!v) db.prepare("INSERT INTO meta (k, v) VALUES ('schema_version', ?)").run(String(SCHEMA_VERSION));
  return db;
}

module.exports = function createStore(file) {
  const db = open(file);
  const st = {}; const S = sql => st[sql] || (st[sql] = db.prepare(sql));
  let depth = 0;
  // run fn inside one transaction (nested calls join the outer one); throws -> everything rolled back
  function tx(fn) {
    if (depth) return fn();
    db.exec('BEGIN IMMEDIATE'); depth++;
    try { const r = fn(); depth--; db.exec('COMMIT'); return r; } catch (e) { depth--; try { db.exec('ROLLBACK'); } catch (e2) { } throw e; }
  }

  // ---------------------------------------------------------------- characters: object <-> rows
  function writeChar(c) {
    const id = c._id; if (!id) throw new Error('character has no id');
    const extra = {}; for (const k of Object.keys(c)) if (!CHAR_KNOWN.has(k) && !DERIVED.has(k)) extra[k] = c[k];
    const sv = c.save || {};
    S(`UPDATE characters SET name=?, name_key=?, cls=?, lv=?, exp=?, jlv=?, jexp=?, pts=?, zeny=?, bank=?, hp=?, sp=?, map=?, x=?, y=?, dir=?,
       save_map=?, save_x=?, save_y=?, portrait_id=?, look=?, hot=?, guild=?, kills=?, bkills=?, extra=? WHERE id=?`).run(
      c.name, c.name.toLowerCase(), c.cls || 'adventurer', c.lv | 0 || 1, +c.exp || 0, c.jlv | 0 || 1, +c.jexp || 0, c.pts | 0, Math.max(0, Math.floor(+c.zeny || 0)), Math.max(0, Math.floor(+c.bank || 0)),
      +c.hp || 0, +c.sp || 0, String(c.map), +c.x || 0, +c.y || 0, c.dir | 0, sv.map || null, sv.x ?? null, sv.y ?? null, c.portraitId || null,
      J(c.look || {}), Array.isArray(c.hot) ? J(c.hot) : null, c.guild || '', c.kills | 0, c.bkills | 0, Object.keys(extra).length ? J(extra) : null, id);
    const s = c.st || {}; S('INSERT OR REPLACE INTO character_stats (char_id, str, agi, vit, int, dex, luk) VALUES (?,?,?,?,?,?,?)').run(id, ...STATS.map(k => s[k] | 0 || 1));
    S('DELETE FROM inventory_items WHERE char_id = ?').run(id);
    const ins = S('INSERT INTO inventory_items (char_id, container, pos, item_id, qty, data) VALUES (?,?,?,?,?,?)');
    for (const [box, list] of [['inv', c.inv], ['store', c.store]]) (list || []).forEach((it, i) => { if (!it || !(it.q > 0)) return; const { id: iid, q, ...more } = it; ins.run(id, box, i, iid | 0, q | 0, Object.keys(more).length ? J(more) : null); });
    S('DELETE FROM equipment WHERE char_id = ?').run(id);
    for (const [sl, iid] of Object.entries(c.eq || {})) if (iid) S('INSERT INTO equipment (char_id, slot, item_id) VALUES (?,?,?)').run(id, sl, iid | 0);
    S('DELETE FROM skills WHERE char_id = ?').run(id);
    for (const [sk, lv] of Object.entries(c.sk2 || {})) if (lv > 0) S('INSERT INTO skills (char_id, skill_id, lv) VALUES (?,?,?)').run(id, sk, lv | 0);
    const qs = c.qs || {}, q = c.q || {};
    S('INSERT OR REPLACE INTO quests (char_id, step, k, tracked, flags) VALUES (?,?,?,?,?)').run(id, q.step | 0, q.k | 0, qs.t || null, J(qs.fl || {}));
    S('DELETE FROM quest_progress WHERE char_id = ?').run(id);
    const qp = S('INSERT INTO quest_progress (char_id, quest_id, state, stage, k, f, done_value) VALUES (?,?,?,?,?,?,?)');
    for (const [qid, a] of Object.entries(qs.a || {})) qp.run(id, qid, 'active', a.s | 0, a.k | 0, J(a.f || []), null);
    for (const [qid, v] of Object.entries(qs.d || {})) qp.run(id, qid, 'done', null, null, null, +v || 1);
    if (c.auto) S('INSERT OR REPLACE INTO auto_settings (char_id, cfg) VALUES (?,?)').run(id, J(c.auto)); else S('DELETE FROM auto_settings WHERE char_id = ?').run(id);
  }
  function readChar(r) {
    const id = r.id, extra = P(r.extra, {});
    const c = Object.assign({}, extra, {
      name: r.name, look: P(r.look, {}), portraitId: r.portrait_id || undefined, lv: r.lv, exp: r.exp, cls: r.cls, jlv: r.jlv, jexp: r.jexp, pts: r.pts,
      map: r.map, x: r.x, y: r.y, dir: r.dir, hp: r.hp, sp: r.sp, zeny: r.zeny, bank: r.bank, guild: r.guild, kills: r.kills, bkills: r.bkills,
      hot: P(r.hot, null), created: r.created_at,
    });
    if (!c.portraitId) delete c.portraitId;
    if (r.save_map) c.save = { map: r.save_map, x: r.save_x, y: r.save_y };
    const s = S('SELECT * FROM character_stats WHERE char_id = ?').get(id); c.st = s ? Object.fromEntries(STATS.map(k => [k, s[k]])) : undefined;
    c.inv = []; c.store = [];
    for (const it of S('SELECT * FROM inventory_items WHERE char_id = ? ORDER BY container, pos').all(id)) (it.container === 'inv' ? c.inv : c.store).push(Object.assign({ id: it.item_id, q: it.qty }, P(it.data, {})));
    c.eq = {}; for (const e of S('SELECT slot, item_id FROM equipment WHERE char_id = ?').all(id)) c.eq[e.slot] = e.item_id;
    c.sk2 = {}; for (const k of S('SELECT skill_id, lv FROM skills WHERE char_id = ?').all(id)) c.sk2[k.skill_id] = k.lv;
    const q = S('SELECT * FROM quests WHERE char_id = ?').get(id) || {};
    c.q = { step: q.step | 0, k: q.k | 0 };
    c.qs = { a: {}, d: {}, fl: P(q.flags, {}) }; if (q.tracked) c.qs.t = q.tracked;
    for (const p of S('SELECT * FROM quest_progress WHERE char_id = ?').all(id)) { if (p.state === 'active') c.qs.a[p.quest_id] = { s: p.stage | 0, k: p.k | 0, f: P(p.f, []) }; else c.qs.d[p.quest_id] = p.done_value; }
    const au = S('SELECT cfg FROM auto_settings WHERE char_id = ?').get(id); if (au) c.auto = P(au.cfg, undefined);
    hide(c, '_id', id); hide(c, '_slot', r.slot); hide(c, '_acct', r.account_id);
    return c;
  }
  const readAccount = r => {
    const a = { id: r.id, login: r.login, alg: r.pw_alg, salt: r.pw_salt, hash: r.pw_hash, guest: r.guest ? 1 : 0, google: r.google || undefined, role: r.role, slots: r.char_slots, created: r.created_at, lastLogin: r.last_login_at };
    if (!a.google) delete a.google;
    a.chars = S('SELECT * FROM characters WHERE account_id = ? AND deleted_at IS NULL ORDER BY slot').all(r.id).map(readChar);
    return a;
  };

  const api = {
    file, db, tx, S,
    // ---------------------------------------------------------------- accounts
    loadAccounts() { const m = new Map(); for (const r of S('SELECT * FROM accounts').all()) m.set(r.login, readAccount(r)); return m; },
    insertAccount(a) {
      const r = S('INSERT INTO accounts (login, pw_alg, pw_salt, pw_hash, guest, google, role, char_slots, created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
        a.login, a.alg || '', a.salt || '', a.hash || '', a.guest ? 1 : 0, a.google ? String(a.google) : null, ROLES.includes(a.role) ? a.role : 'PLAYER', a.slots || 3, a.created || Date.now());
      a.id = Number(r.lastInsertRowid); a.role = ROLES.includes(a.role) ? a.role : 'PLAYER'; a.slots = a.slots || 3; a.chars = a.chars || []; return a;
    },
    saveAccount(a) { S('UPDATE accounts SET login=?, pw_alg=?, pw_salt=?, pw_hash=?, guest=?, google=?, role=?, char_slots=?, last_login_at=? WHERE id=?').run(a.login, a.alg || '', a.salt || '', a.hash || '', a.guest ? 1 : 0, a.google ? String(a.google) : null, a.role, a.slots || 3, a.lastLogin || null, a.id); },
    setRole(a, role) { if (!ROLES.includes(role)) throw new Error('bad role'); S('UPDATE accounts SET role=? WHERE id=?').run(role, a.id); a.role = role; },
    // ---------------------------------------------------------------- sessions (token hashes only)
    sessionsOf(a) { return S('SELECT token_hash h, expires_at exp FROM sessions WHERE account_id = ? AND expires_at > ?').all(a.id, Date.now()); },
    addSession(a, h, exp, keep = 5) {
      tx(() => {
        S('DELETE FROM sessions WHERE account_id = ? AND expires_at <= ?').run(a.id, Date.now());
        S('INSERT INTO sessions (account_id, token_hash, created_at, expires_at) VALUES (?,?,?,?)').run(a.id, h, Date.now(), exp);
        S('DELETE FROM sessions WHERE account_id = ? AND id NOT IN (SELECT id FROM sessions WHERE account_id = ? ORDER BY id DESC LIMIT ?)').run(a.id, a.id, keep);
      });
    },
    removeSession(a, h) { S('DELETE FROM sessions WHERE account_id = ? AND token_hash = ?').run(a.id, h); },
    clearSessions(a) { S('DELETE FROM sessions WHERE account_id = ?').run(a.id); },
    // ---------------------------------------------------------------- characters
    // new character in a free slot; the UNIQUE name_key makes a duplicate name fail even if two requests race
    insertChar(a, c, slot) {
      return tx(() => {
        const r = S(`INSERT INTO characters (account_id, slot, name, name_key, map, x, y, look, created_at) VALUES (?,?,?,?,?,?,?,?,?)`).run(a.id, slot, c.name, c.name.toLowerCase(), String(c.map), +c.x || 0, +c.y || 0, J(c.look || {}), c.created || Date.now());
        hide(c, '_id', Number(r.lastInsertRowid)); hide(c, '_slot', slot); hide(c, '_acct', a.id); writeChar(c); return c;
      });
    },
    saveChars(list) { const cs = list.filter(c => c && c._id); if (cs.length) tx(() => { for (const c of cs) writeChar(c); }); return cs.length; },
    nameTaken(name) { return !!S('SELECT 1 FROM characters WHERE name_key = ?').get(String(name).toLowerCase()); },
    // soft delete: the row stays (support / rollback), the name and the slot are freed, items stay attached to the dead row
    deleteChar(c) { S('UPDATE characters SET deleted_at = ?, deleted_name = name, name_key = NULL WHERE id = ?').run(Date.now(), c._id); },
    charById(id) { const r = S('SELECT * FROM characters WHERE id = ?').get(id); return r ? readChar(r) : null; },
    charIdByName(name) { const r = S('SELECT id, account_id FROM characters WHERE name_key = ?').get(String(name).toLowerCase()); return r || null; },
    // ---------------------------------------------------------------- guilds (whole set; a handful of rows)
    loadGuilds() {
      const G = {};
      for (const g of S('SELECT * FROM guilds').all()) {
        const mem = S('SELECT char_name, lv FROM guild_members WHERE guild_id = ? ORDER BY pos').all(g.id);
        G[g.name] = { name: g.name, master: g.master_name, members: mem.map(m => m.char_name), created: g.created_at, lv: Object.fromEntries(mem.map(m => [m.char_name, m.lv])) };
        if (g.notice) G[g.name].notice = g.notice;
      }
      return G;
    },
    saveGuilds(G) {
      tx(() => {
        S('DELETE FROM guild_members').run(); S('DELETE FROM guilds').run();
        for (const g of Object.values(G || {})) {
          const r = S('INSERT INTO guilds (name, master_name, notice, created_at) VALUES (?,?,?,?)').run(g.name, g.master, g.notice || null, g.created || Date.now());
          const gid = Number(r.lastInsertRowid); (g.members || []).forEach((n, i) => S('INSERT OR IGNORE INTO guild_members (guild_id, char_name, lv, pos) VALUES (?,?,?,?)').run(gid, n, (g.lv && g.lv[n]) | 0 || 1, i));
        }
      });
    },
    // ---------------------------------------------------------------- bans / mutes
    activeBan(acctId) { return S('SELECT * FROM bans WHERE account_id = ? AND lifted_at IS NULL AND (expires_at IS NULL OR expires_at > ?) ORDER BY id DESC LIMIT 1').get(acctId, Date.now()) || null; },
    addBan(acctId, reason, by, expires) { return Number(S('INSERT INTO bans (account_id, reason, created_by, created_at, expires_at) VALUES (?,?,?,?,?)').run(acctId, reason, by, Date.now(), expires || null).lastInsertRowid); },
    liftBan(acctId, by) { return S('UPDATE bans SET lifted_at = ?, lifted_by = ? WHERE account_id = ? AND lifted_at IS NULL').run(Date.now(), by, acctId).changes; },
    activeMute(acctId) { return S('SELECT * FROM mutes WHERE account_id = ? AND lifted_at IS NULL AND (expires_at IS NULL OR expires_at > ?) ORDER BY id DESC LIMIT 1').get(acctId, Date.now()) || null; },
    addMute(acctId, reason, by, expires) { return Number(S('INSERT INTO mutes (account_id, reason, created_by, created_at, expires_at) VALUES (?,?,?,?,?)').run(acctId, reason, by, Date.now(), expires || null).lastInsertRowid); },
    liftMute(acctId, by) { return S('UPDATE mutes SET lifted_at = ?, lifted_by = ? WHERE account_id = ? AND lifted_at IS NULL').run(Date.now(), by, acctId).changes; },
    listBans(limit = 50) { return S('SELECT b.*, a.login FROM bans b JOIN accounts a ON a.id = b.account_id ORDER BY b.id DESC LIMIT ?').all(limit); },
    listMutes(limit = 50) { return S('SELECT m.*, a.login FROM mutes m JOIN accounts a ON a.id = m.account_id ORDER BY m.id DESC LIMIT ?').all(limit); },
    // ---------------------------------------------------------------- GM audit log (append-only: triggers refuse UPDATE / DELETE)
    audit(e) { S('INSERT INTO gm_audit_log (at, gm, gm_role, action, target, reason, detail, ok) VALUES (?,?,?,?,?,?,?,?)').run(Date.now(), e.gm, e.role, e.action, e.target || null, e.reason || null, e.detail ? J(e.detail) : null, e.ok === false ? 0 : 1); },
    auditList(limit = 50) { return S('SELECT * FROM gm_audit_log ORDER BY id DESC LIMIT ?').all(limit); },
    // ---------------------------------------------------------------- friends / blocks (foundation)
    isBlocked(charId, byCharId) { return !!S('SELECT 1 FROM blocks WHERE char_id = ? AND blocked_char_id = ?').get(byCharId, charId); },
    block(charId, otherId) { tx(() => { S('INSERT OR IGNORE INTO blocks (char_id, blocked_char_id, created_at) VALUES (?,?,?)').run(charId, otherId, Date.now()); S('DELETE FROM friendships WHERE (char_id = ? AND friend_char_id = ?) OR (char_id = ? AND friend_char_id = ?)').run(charId, otherId, otherId, charId); }); },
    unblock(charId, otherId) { return S('DELETE FROM blocks WHERE char_id = ? AND blocked_char_id = ?').run(charId, otherId).changes; },
    blocksOf(charId) { return S('SELECT c.id, c.name FROM blocks b JOIN characters c ON c.id = b.blocked_char_id WHERE b.char_id = ?').all(charId); },
    friendRequest(charId, otherId) {
      return tx(() => {
        const back = S('SELECT status FROM friendships WHERE char_id = ? AND friend_char_id = ?').get(otherId, charId);
        if (back) { S("UPDATE friendships SET status = 'accepted' WHERE char_id = ? AND friend_char_id = ?").run(otherId, charId); S("INSERT OR REPLACE INTO friendships (char_id, friend_char_id, status, created_at) VALUES (?,?,'accepted',?)").run(charId, otherId, Date.now()); return 'accepted'; }
        S("INSERT OR IGNORE INTO friendships (char_id, friend_char_id, status, created_at) VALUES (?,?,'pending',?)").run(charId, otherId, Date.now()); return 'pending';
      });
    },
    friendRemove(charId, otherId) { return S('DELETE FROM friendships WHERE (char_id = ? AND friend_char_id = ?) OR (char_id = ? AND friend_char_id = ?)').run(charId, otherId, otherId, charId).changes; },
    friendsOf(charId) {
      return {
        friends: S("SELECT c.id, c.name FROM friendships f JOIN characters c ON c.id = f.friend_char_id WHERE f.char_id = ? AND f.status = 'accepted' AND c.deleted_at IS NULL").all(charId),
        incoming: S("SELECT c.id, c.name FROM friendships f JOIN characters c ON c.id = f.char_id WHERE f.friend_char_id = ? AND f.status = 'pending' AND c.deleted_at IS NULL").all(charId),
        outgoing: S("SELECT c.id, c.name FROM friendships f JOIN characters c ON c.id = f.friend_char_id WHERE f.char_id = ? AND f.status = 'pending' AND c.deleted_at IS NULL").all(charId),
      };
    },
    // ---------------------------------------------------------------- mail (foundation; attachments move inside one transaction)
    mailInsert(m, atts) {
      return tx(() => {
        const r = S('INSERT INTO mail (kind, sender_char_id, sender_name, receiver_char_id, subject, body, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?)').run(m.kind, m.from || null, m.fromName, m.to, m.subject, m.body || '', Date.now(), m.expires || null);
        const id = Number(r.lastInsertRowid);
        for (const a of atts || []) S('INSERT INTO mail_attachments (mail_id, item_id, qty, gold) VALUES (?,?,?,?)').run(id, a.item || null, a.qty | 0, a.gold | 0);
        return id;
      });
    },
    mailList(charId) {
      return S('SELECT * FROM mail WHERE receiver_char_id = ? AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > ?) ORDER BY id DESC LIMIT 100').all(charId, Date.now())
        .map(m => ({ ...m, atts: S('SELECT item_id, qty, gold FROM mail_attachments WHERE mail_id = ?').all(m.id) }));
    },
    mailGet(id) { const m = S('SELECT * FROM mail WHERE id = ?').get(id); if (m) m.atts = S('SELECT item_id, qty, gold FROM mail_attachments WHERE mail_id = ?').all(id); return m || null; },
    mailRead(id, charId) { S('UPDATE mail SET read_at = COALESCE(read_at, ?) WHERE id = ? AND receiver_char_id = ?').run(Date.now(), id, charId); },
    // claim: mark claimed only if still unclaimed (changes === 1) — the caller saves the character in the same transaction
    mailMarkClaimed(id, charId) { return S('UPDATE mail SET claimed_at = ?, read_at = COALESCE(read_at, ?) WHERE id = ? AND receiver_char_id = ? AND claimed_at IS NULL').run(Date.now(), Date.now(), id, charId).changes === 1; },
    // ---------------------------------------------------------------- meta / backup / stats
    meta(k, v) { if (v === undefined) { const r = S('SELECT v FROM meta WHERE k = ?').get(k); return r ? r.v : null; } S('INSERT OR REPLACE INTO meta (k, v) VALUES (?,?)').run(k, String(v)); },
    counts() { const n = t => S(`SELECT COUNT(*) n FROM ${t}`).get().n; return { accounts: n('accounts'), characters: S('SELECT COUNT(*) n FROM characters WHERE deleted_at IS NULL').get().n, items: n('inventory_items'), guilds: n('guilds') }; },
    ping() { return S('SELECT 1 ok').get().ok === 1; },
    // consistent copy while running (VACUUM INTO), keeps the newest `keep` files
    backup(dir, keep = 20, tag = '') {
      fs.mkdirSync(dir, { recursive: true });
      const d = new Date(), pad = n => String(n).padStart(2, '0');
      let f = path.join(dir, `elyndra-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${tag ? '-' + tag : ''}.db`);
      for (let i = 2; fs.existsSync(f); i++) f = f.replace(/(-\d+)?\.db$/, `-${i}.db`);
      db.exec(`VACUUM INTO '${f.replace(/'/g, "''")}'`);
      const all = fs.readdirSync(dir).filter(x => /^elyndra-.*\.db$/.test(x)).map(x => ({ x, t: fs.statSync(path.join(dir, x)).mtimeMs })).sort((a, b) => b.t - a.t);
      for (const o of all.slice(keep)) try { fs.unlinkSync(path.join(dir, o.x)); } catch (e) { }
      return f;
    },
    close() { try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch (e) { } db.close(); },
  };
  return api;
};
module.exports.ROLES = ROLES;
module.exports.SCHEMA_VERSION = SCHEMA_VERSION;
