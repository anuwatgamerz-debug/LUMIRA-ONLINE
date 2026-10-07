'use strict';
// Pre-Public Foundation: SQLite store + migration, password hashing, sessions, rate limits, character ownership,
// multi-character accounts, GM roles / commands / ban / mute / audit log, friends / blocks, mail, market schema,
// transactions + rollback, backups, production HTTPS config, /health.
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const H = require('./harness');
const { sleep } = H;
const createStore = require('../engine/store');
const { migrate } = require('../engine/migrate');
const SPOT = { map: 'lumira', x: 24, y: 21 };
const SEEDS = {
  pp_admin: Object.assign(H.account(H.mkChar('PpAdmin', { ...SPOT })), { role: 'ADMIN' }),
  pp_gm: Object.assign(H.account(H.mkChar('PpGm', { ...SPOT, x: 23 })), { role: 'GM' }),
  pp_a: H.account(H.mkChar('PpAlpha', { ...SPOT, zeny: 1000, inv: [{ id: 1, q: 10 }, { id: 22, q: 1 }] })),
  pp_b: H.account(H.mkChar('PpBravo', { ...SPOT, x: 25, zeny: 50 })),
  pp_old: H.account(H.mkChar('PpLegacy', { ...SPOT })), // scrypt hash -> upgraded to bcrypt on login
};
const get = (url, headers = {}) => new Promise(r => { const u = new URL(url); http.get({ host: u.hostname, port: u.port, path: u.pathname, headers }, res => { let b = ''; res.on('data', d => { b += d; }); res.on('end', () => r({ code: res.statusCode, h: res.headers, body: b })); }).on('error', e => r({ code: 0, err: e.message })); });
async function conn(url, msg, until = m => m.t === 'welcome' || m.t === 'err' || m.t === 'chars') { const c = H.client(url); await c.open; c.send(msg); const r = await c.wait(until, 8000); return [c, r]; }
const sys = (c, re, ms = 2000) => c.wait(m => m.t === 'sys' && re.test(m.m), ms);

async function run(srv, R) {
  const ok = R.ok, URL = srv.ws;
  // ---------------------------------------------------------------- store: schema, constraints, transactions, backup
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ely-store-')), S = createStore(path.join(dir, 'elyndra.db'));
    const tables = S.S("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(r => r.name);
    const need = ['accounts', 'characters', 'character_stats', 'inventory_items', 'equipment', 'skills', 'quests', 'quest_progress', 'auto_settings', 'guilds', 'guild_members', 'friendships', 'blocks', 'mail', 'mail_attachments', 'market_listings', 'bans', 'mutes', 'gm_audit_log', 'sessions'];
    ok(need.every(t => tables.includes(t)), 'SQLite schema: all tables (accounts … market_listings, bans, mutes, gm_audit_log)', need.filter(t => !tables.includes(t)).join());
    ok(S.S('PRAGMA journal_mode').get().journal_mode === 'wal' && S.S('PRAGMA foreign_keys').get().foreign_keys === 1, 'WAL mode + foreign keys on');
    const a = S.insertAccount({ login: 'unit_a', alg: 'bcrypt', hash: 'x' });
    const c = S.insertChar(a, Object.assign(H.mkChar('UnitOne', { zeny: 500, inv: [{ id: 1, q: 3 }], qs: { a: { mq2: { s: 1, k: 2, f: [] } }, d: { mq1: 1 }, fl: { x: 1 } }, sk2: { kn_bash: 3 }, auto: { target: 'near' } })), 1);
    const back = S.loadAccounts().get('unit_a').chars[0];
    ok(back.zeny === 500 && back.inv[0].q === 3 && back.qs.a.mq2.k === 2 && back.qs.d.mq1 === 1 && back.sk2.kn_bash === 3 && back.auto.target === 'near', 'save / load: gold, inventory, quests, skills, AUTO settings round-trip');
    let dup = false; try { S.insertChar(a, H.mkChar('UNITONE'), 2); } catch (e) { dup = /UNIQUE/.test(e.message); }
    ok(dup, 'database constraint: character names are unique (case-insensitive)');
    let neg = false; try { S.S('UPDATE characters SET zeny = -5 WHERE id = ?').run(c._id); } catch (e) { neg = /CHECK/.test(e.message); }
    ok(neg, 'database constraint: gold can never go negative');
    c.zeny = 999; try { S.tx(() => { S.saveChars([c]); throw new Error('boom'); }); } catch (e) { }
    ok(S.loadAccounts().get('unit_a').chars[0].zeny === 500, 'rollback: a failed transaction leaves nothing half-written');
    S.audit({ gm: 'x', role: 'ADMIN', action: 'test' }); let del = false, upd = false;
    try { S.S('DELETE FROM gm_audit_log').run(); } catch (e) { del = /append-only/.test(e.message); } try { S.S("UPDATE gm_audit_log SET action = 'y'").run(); } catch (e) { upd = /append-only/.test(e.message); }
    ok(del && upd, 'gm_audit_log is append-only (UPDATE / DELETE refused by the database)');
    let mk = 0; try { S.S('INSERT INTO market_listings (seller_char_id, item_id, quantity, price, created_at, expires_at) VALUES (?,?,?,?,?,?)').run(c._id, 1, 2, 100, Date.now(), Date.now() + 1e6); mk++; S.S('INSERT INTO market_listings (seller_char_id, item_id, quantity, price, created_at, expires_at) VALUES (?,?,?,?,?,?)').run(c._id, 1, 2, 0, Date.now(), Date.now()); } catch (e) { if (/CHECK/.test(e.message)) mk++; }
    ok(mk === 2 && S.S("SELECT status FROM market_listings").get().status === 'active', 'market_listings schema ready (status, price > 0 checked)');
    const f1 = S.backup(path.join(dir, 'backups'), 2); S.backup(path.join(dir, 'backups'), 2); S.backup(path.join(dir, 'backups'), 2);
    const files = fs.readdirSync(path.join(dir, 'backups'));
    ok(/elyndra-\d{4}-\d{2}-\d{2}-\d{4}/.test(path.basename(f1)) && files.length === 2, 'backup: elyndra-YYYY-MM-DD-HHMM.db, old ones cleaned up (keep N)');
    const B = createStore(path.join(dir, 'backups', files[0])); ok(B.loadAccounts().get('unit_a').chars[0].name === 'UnitOne', 'backup file is a working database'); B.db.close();
    S.close(); fs.rmSync(dir, { recursive: true, force: true });
  }
  // ---------------------------------------------------------------- migration from db.json
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ely-mig-')), json = path.join(dir, 'db.json');
    const accts = { m_one: H.account(H.mkChar('MigOne', { lv: 33, zeny: 4321, bank: 99, inv: [{ id: 1, q: 7 }, { id: 22, q: 1 }], store: [{ id: 3, q: 2 }], eq: { wpn: 22, arm: 30 }, sk2: { kn_bash: 2 }, qs: { a: { mq3: { s: 2, k: 1, f: [] } }, d: { mq1: 1, mq2: 1 }, t: 'mq3', fl: {} }, guild: 'Moon' })), m_two: H.account(H.mkChar('MigTwo', {})) };
    accts.m_one.tokens = [{ h: 'f'.repeat(64), exp: Date.now() + 1e7 }];
    fs.writeFileSync(json, JSON.stringify({ accounts: accts, guilds: { Moon: { name: 'Moon', master: 'MigOne', members: ['MigOne'], created: 1, lv: { MigOne: 33 } } } }));
    const before = fs.readFileSync(json, 'utf8');
    const r = migrate(json, path.join(dir, 'elyndra.db'));
    ok(r.ok && r.before.accounts === 2 && r.after.characters === 2 && r.before.zeny === r.after.zeny && r.before.items === r.after.items, `migration verified: accounts ${r.after.accounts}, characters ${r.after.characters}, items ${r.after.items}, gold ${r.after.zeny}`);
    const S = createStore(path.join(dir, 'elyndra.db')), c = S.loadAccounts().get('m_one').chars[0];
    ok(c.inv.length === 2 && c.store[0].q === 2 && c.eq.wpn === 22, 'inventory, storage and equipment migrated');
    ok(c.qs.a.mq3.s === 2 && c.qs.d.mq2 === 1 && c.qs.t === 'mq3' && c.sk2.kn_bash === 2, 'quests and skills migrated');
    ok(c.zeny === 4321 && c.bank === 99 && c.lv === 33 && S.loadGuilds().Moon.members[0] === 'MigOne' && S.sessionsOf(S.loadAccounts().get('m_one')).length === 1, 'gold, bank, level, guild and sessions migrated');
    S.close();
    ok(fs.readFileSync(json, 'utf8') === before && fs.existsSync(json + '.migrated') && fs.readdirSync(path.join(dir, 'backups')).some(f => /^db-json-/.test(f)) && fs.readdirSync(path.join(dir, 'backups')).some(f => /^migration-report-/.test(f)), 'db.json untouched + backed up + migration report written');
    let again = false; try { migrate(json, path.join(dir, 'elyndra.db')); } catch (e) { again = /refusing/.test(e.message); } ok(again, 'migration never overwrites an existing database');
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // server refuses to silently re-import an old db.json when elyndra.db went missing after a migration
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ely-gone-')); fs.writeFileSync(path.join(dir, 'db.json'), '{"accounts":{}}'); fs.writeFileSync(path.join(dir, 'db.json.migrated'), 'x');
    const out = require('child_process').spawnSync(process.execPath, [path.join(H.ROOT, 'server.js')], { env: { ...process.env, LUMIRA_DATA: path.join(dir, 'db.json'), PORT: '0' }, timeout: 8000 }).stderr.toString();
    ok(/was already migrated/.test(out), 'missing elyndra.db after migration: server stops instead of loading old data');
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // ---------------------------------------------------------------- passwords + sessions
  {
    const [c, w] = await conn(URL, { t: 'register', u: 'pp_new', p: 'pass1234', name: 'PpNewbie', cs: 1 });
    const row = H.sql(srv, "SELECT pw_alg, pw_hash FROM accounts WHERE login = 'pp_new'")[0];
    ok(w.t === 'welcome' && row.pw_alg === 'bcrypt' && /^\$2b\$/.test(row.pw_hash) && !row.pw_hash.includes('pass1234'), 'new passwords: bcrypt (no plaintext / MD5 / SHA)'); c.close();
    const [c2, w2] = await conn(URL, { t: 'login', u: 'pp_old', p: H.PW }); await sleep(400);
    const r2 = H.sql(srv, "SELECT pw_alg, pw_hash FROM accounts WHERE login = 'pp_old'")[0];
    ok(w2.t === 'welcome' && r2.pw_alg === 'bcrypt' && /^\$2b\$/.test(r2.pw_hash), 'old scrypt password still works and is upgraded to bcrypt', JSON.stringify([w2 && w2.t, w2 && w2.m, r2])); c2.close(); await sleep(300);
    const [c3, w3] = await conn(URL, { t: 'login', u: 'pp_old', p: H.PW }); ok(w3.t === 'welcome', 'login again after the upgrade'); c3.close();
    const [c4, w4] = await conn(URL, { t: 'login', u: 'pp_old', p: 'wrong-password' }); ok(w4.t === 'err' && /ไม่ถูกต้อง/.test(w4.m), 'invalid login refused (same message for unknown id / wrong password)'); c4.close();
    const [c5, w5] = await conn(URL, { t: 'register', u: 'pp_long', p: 'ก'.repeat(30), name: 'PpLong' }); ok(w5.t === 'err', 'passwords over 72 bytes refused (bcrypt limit) instead of silently cut'); c5.close();
    const [c6, w6] = await conn(URL, { t: 'login', u: 'pp_a', p: H.PW, rem: 1, cs: 1 }); const ses = await c6.wait(m => m.t === 'session', 2000); c6.close(); await sleep(200);
    const [c7, w7] = await conn(URL, { t: 'tlogin', u: 'pp_b', tok: ses.tok }); ok(w7.t === 'err' && w7.code === 'session', 'a session token only works for its own account (no account spoofing)'); c7.close();
    const [c8, w8] = await conn(URL, { t: 'tlogin', u: 'pp_a', tok: ses.tok, cs: 1 }); ok(w8.t === 'chars' && w8.list[0].name === 'PpAlpha', 'remembered session -> character select of that account'); c8.close();
  }
  // ---------------------------------------------------------------- multi-character accounts + ownership
  {
    const [c, w] = await conn(URL, { t: 'login', u: 'pp_new', p: 'pass1234', cs: 1 });
    ok(w.t === 'chars' && w.list.length === 1 && w.max === 3 && w.list[0].portraitId && w.list[0].mapName, 'login -> character select (portrait, name, level, class, job, map), 3 slots');
    c.send({ t: 'newchar', name: 'PpSecond', sex: 1, portrait: 'portrait_004' }); const l2 = await c.next(m => m.t === 'chars', 3000);
    c.send({ t: 'newchar', name: 'PpThird' }); const l3 = await c.next(m => m.t === 'chars', 3000);
    c.send({ t: 'newchar', name: 'PpFourth' }); const e4 = await c.wait(m => m.t === 'charerr', 3000);
    ok(l2.list.length === 2 && l2.list[1].portraitId === 'portrait_004' && l3.list.length === 3 && e4 && /สูงสุด 3/.test(e4.m), 'create characters up to 3 slots, each with its own portrait; 4th refused');
    c.send({ t: 'newchar', name: 'ppalpha' }); const dupe = await c.next(m => m.t === 'charerr', 3000); ok(dupe && /มีคนใช้แล้ว/.test(dupe.m), 'character names stay unique across accounts');
    const other = H.sql(srv, "SELECT c.id FROM characters c JOIN accounts a ON a.id = c.account_id WHERE a.login = 'pp_a'")[0].id;
    c.send({ t: 'enter', id: other }); const spoof = await c.next(m => m.t === 'charerr' || m.t === 'welcome', 3000);
    ok(spoof && spoof.t === 'charerr', "entering another account's character id is refused (ownership checked by the server)");
    const third = l3.list[2];
    c.send({ t: 'delchar', id: third.id, name: 'wrong', confirm: 1 }); const d1 = await c.next(m => m.t === 'charerr', 3000);
    c.send({ t: 'delchar', id: third.id, name: third.name }); const d2 = await c.next(m => m.t === 'charerr', 3000);
    c.send({ t: 'delchar', id: third.id, name: third.name, confirm: 1 }); const d3 = await c.next(m => m.t === 'chars', 3000);
    ok(d1 && d2 && d3 && d3.list.length === 2 && !d3.list.some(x => x.id === third.id), 'delete needs the exact name + confirmation; then the character is gone');
    ok(H.sql(srv, 'SELECT deleted_name, name_key FROM characters WHERE id = ?', third.id)[0].name_key === null, 'deleted character kept for support (soft delete), its name freed');
    c.send({ t: 'enter', id: l2.list[1].id }); const wel = await c.wait(m => m.t === 'welcome', 3000), me1 = await c.wait(m => m.t === 'me', 3000);
    ok(wel && me1.c.name === 'PpSecond' && me1.c.portraitId === 'portrait_004', 'enter the world with the chosen character');
    c.send({ t: 'charsel' }); const back = await c.next(m => m.t === 'chars', 3000); ok(back && back.list.length === 2, 'back to the character select without logging out');
    c.close(); await sleep(300);
  }
  // ---------------------------------------------------------------- GM roles, commands, ban / mute, audit log
  {
    const adm = await H.login(URL, 'pp_admin'), gm = await H.login(URL, 'pp_gm'), A = await H.login(URL, 'pp_a'), B = await H.login(URL, 'pp_b');
    ok(H.me(adm).role === 'ADMIN' && H.me(gm).role === 'GM' && H.me(A).role === 'PLAYER', 'roles come from the database (PLAYER / GM / ADMIN)');
    A.send({ t: 'chat', m: '/gm gold PpAlpha 999999' }); const den = await sys(A, /ไม่พบคำสั่ง/); await sleep(300);
    ok(den && H.me(A).zeny === 1000 && !B.msgs.some(m => m.t === 'chat' && /\/gm/.test(m.m)), 'a player cannot run GM commands (and they are not posted to chat)');
    A.send({ t: 'admin', a: 'accounts' }); ok(!(await A.wait(m => m.t === 'admin', 800)), 'admin views refused for players');
    gm.send({ t: 'chat', m: '/gm gold PpAlpha 100' }); const gd = await sys(gm, /ต้องเป็น ADMIN/); ok(!!gd, 'GM cannot use ADMIN-only economy commands');
    adm.send({ t: 'chat', m: '/gm gold PpAlpha 250' }); await A.wait(m => m.t === 'me' && m.c.zeny === 1250, 3000);
    ok(H.me(A).zeny === 1250 && H.sql(srv, "SELECT zeny FROM characters WHERE name = 'PpAlpha'")[0].zeny === 1250, 'ADMIN /gm gold: applied and saved at once');
    adm.send({ t: 'chat', m: '/gm item PpAlpha 2 3' }); await sleep(500); ok(H.me(A).inv.some(s => s.id === 2 && s.q >= 3), '/gm item');
    adm.send({ t: 'chat', m: '/gm level PpBravo 7' }); await sleep(500); ok(H.me(B).lv === 7, '/gm level');
    adm.send({ t: 'chat', m: '/gm quest PpBravo mq2 done' }); await sleep(500); ok(H.sql(srv, "SELECT 1 FROM quest_progress q JOIN characters c ON c.id = q.char_id WHERE c.name = 'PpBravo' AND q.quest_id = 'mq2' AND q.state = 'done'").length === 1, '/gm quest');
    gm.send({ t: 'chat', m: '/gm summon PpBravo' }); await sleep(600); ok(H.myPos(B) && H.cheb(H.myPos(B), H.myPos(gm)) <= 1, '/gm summon brings the player to the GM');
    gm.send({ t: 'chat', m: '/gm teleport lumira 20 20' }); await sleep(600); const gp = H.myPos(gm); ok(gp && gp[0] === 20 && gp[1] === 20, '/gm teleport');
    gm.send({ t: 'chat', m: '/gm announce ทดสอบประกาศ' }); ok(!!(await sys(B, /ทดสอบประกาศ/)), '/gm announce reaches everyone');
    gm.send({ t: 'chat', m: '/gm who' }); ok(!!(await sys(gm, /ออนไลน์/)), '/gm who');
    gm.send({ t: 'chat', m: '/gm inspect PpAlpha' }); const ins = await gm.wait(m => m.t === 'gminfo', 2000); ok(ins && ins.account.login === 'pp_a' && ins.char.zeny === 1250, '/gm inspect (inventory, account)');
    // mute
    gm.send({ t: 'chat', m: '/gm mute PpBravo 30m spam' }); await sys(B, /ห้ามแชท/);
    B.send({ t: 'chat', m: 'hello local' }); B.send({ t: 'chat', ch: 'world', m: 'hello world' }); B.send({ t: 'chat', ch: 'whisper', to: 'PpAlpha', m: 'psst' }); await sleep(500);
    ok(!A.msgs.some(m => m.t === 'chat' && m.from === 'PpBravo') && B.alive !== false, 'mute: local / world / whisper blocked, the player stays in game');
    gm.send({ t: 'chat', m: '/gm unmute PpBravo' }); await sys(B, /แชทได้แล้ว/); B.send({ t: 'chat', m: 'back again' }); ok(!!(await A.wait(m => m.t === 'chat' && m.m === 'back again', 2000)), 'unmute: chat works again');
    // ban
    gm.send({ t: 'chat', m: '/gm ban PpBravo 1d cheating' }); const kicked = await B.wait(m => m.t === 'err' && m.code === 'kicked', 3000);
    const [b2, wb] = await conn(URL, { t: 'login', u: 'pp_b', p: H.PW });
    ok(kicked && wb.t === 'err' && wb.code === 'banned' && /cheating/.test(wb.m), 'ban: kicked at once, login refused with the reason'); b2.close();
    const banRow = H.sql(srv, "SELECT b.* FROM bans b JOIN accounts a ON a.id = b.account_id WHERE a.login = 'pp_b'")[0];
    ok(banRow && banRow.reason === 'cheating' && banRow.created_by === 'pp_gm' && banRow.expires_at > Date.now() + 23 * 3600e3, 'ban record: reason, createdBy, createdAt, expiresAt');
    gm.send({ t: 'chat', m: '/gm unban @pp_b' }); await sleep(400); const [b3, wb3] = await conn(URL, { t: 'login', u: 'pp_b', p: H.PW }); ok(wb3.t === 'welcome', 'unban: can log in again'); b3.close();
    gm.send({ t: 'chat', m: '/gm ban @pp_admin perm x' }); ok(!!(await sys(gm, /ADMIN ไม่ได้/)), 'a GM cannot ban an ADMIN');
    const log = H.sql(srv, 'SELECT gm, action, target, reason FROM gm_audit_log ORDER BY id');
    ok(['gold', 'item', 'level', 'quest', 'summon', 'teleport', 'announce', 'mute', 'unmute', 'ban', 'unban', 'inspect'].every(a => log.some(r => r.action === a)) && log.some(r => r.action === 'gold' && r.gm.startsWith('pp_gm') && r.reason === 'no permission'), 'GM audit log: every command (who, action, target, reason, time), refused ones too');
    adm.send({ t: 'admin', a: 'audit' }); const al = await adm.wait(m => m.t === 'admin' && m.a === 'audit', 2000); ok(al && al.data.length >= 10, 'GM window: audit log view (read only)');
    adm.send({ t: 'admin', a: 'overview' }); const ov = await adm.wait(m => m.t === 'admin' && m.a === 'overview', 2000); ok(ov && ov.data.accounts >= 5 && ov.data.online >= 3, 'GM window: server stats');
    // mail: GM compensation -> claim once (transaction)
    adm.send({ t: 'chat', m: '/gm mail PpAlpha 3 2 500 ของชดเชย' }); await sys(A, /จดหมายใหม่/);
    A.send({ t: 'mail', a: 'list' }); const ml = await A.wait(m => m.t === 'mail', 2000); const mail = ml && ml.list[0];
    ok(mail && mail.kind === 'gm' && mail.atts[0].item === 3 && mail.atts[0].gold === 500, 'system / GM mail with item + gold attachment');
    const z0 = H.me(A).zeny; A.send({ t: 'mail', a: 'claim', id: mail.id }); await A.wait(m => m.t === 'me' && m.c.zeny === z0 + 500, 3000);
    A.send({ t: 'mail', a: 'claim', id: mail.id }); const twice = await sys(A, /รับของในจดหมายนี้ไปแล้ว/);
    ok(H.me(A).zeny === z0 + 500 && H.me(A).inv.some(s => s.id === 3) && twice, 'claim: items + gold once only (second claim refused)');
    ok(H.sql(srv, "SELECT zeny FROM characters WHERE name = 'PpAlpha'")[0].zeny === z0 + 500, 'claim saved in the same transaction');
    // player mail: the server checks ownership, removes the item and creates the attachment together
    A.send({ t: 'mail', a: 'send', to: 'PpGm', subject: 'hi', item: 999, qty: 5 }); const nf = await sys(A, /ไม่มีไอเทม/);
    A.send({ t: 'mail', a: 'send', to: 'PpGm', subject: 'hi', item: 1, qty: 500 }); const nf2 = await sys(A, /ไม่มีไอเทม/);
    const q0 = H.me(A).inv.find(s => s.id === 1).q; A.send({ t: 'mail', a: 'send', to: 'PpGm', subject: 'gift', item: 1, qty: 2, gold: 10 }); await sys(A, /ส่งจดหมายแล้ว/);
    gm.send({ t: 'mail', a: 'list' }); const gml = await gm.wait(m => m.t === 'mail', 2000);
    ok(nf && nf2 && H.me(A).inv.find(s => s.id === 1).q === q0 - 2 && gml.list.some(x => x.kind === 'player' && x.atts[0].qty === 2 && x.atts[0].gold === 10), 'player mail: items not owned refused; owned items moved into the attachment');
    // friends / blocks
    A.send({ t: 'chat', m: '/block PpGm' }); await sys(A, /บล็อก PpGm/);
    gm.send({ t: 'chat', ch: 'whisper', to: 'PpAlpha', m: 'hey' }); const wb1 = await sys(gm, /ไม่สามารถส่งข้อความ/);
    gm.send({ t: 'friend', a: 'req', name: 'PpAlpha' }); const fb = await sys(gm, /ไม่สามารถส่งคำขอ/);
    ok(wb1 && fb && !A.msgs.some(m => m.t === 'chat' && m.m === 'hey'), 'blocked player: whispers and friend requests do not arrive');
    A.send({ t: 'chat', m: '/unblock PpGm' }); await sys(A, /เลิกบล็อก/);
    gm.send({ t: 'friend', a: 'req', name: 'PpAlpha' }); await sys(A, /ขอเป็นเพื่อน/); A.send({ t: 'friend', a: 'req', name: 'PpGm' }); await sys(A, /เป็นเพื่อนกับคุณแล้ว/);
    A.send({ t: 'friend', a: 'list' }); const fl = await A.wait(m => m.t === 'friends', 2000); ok(fl && fl.friends.some(f => f.name === 'PpGm'), 'friend request -> accept -> friends list');
    for (const c of [adm, gm, A, B]) c.close(); await sleep(400);
  }
  // ---------------------------------------------------------------- /health
  {
    const h = await get(srv.http + '/health'); const j = JSON.parse(h.body || '{}');
    ok(h.code === 200 && j.status === 'ok' && j.database === 'ok' && typeof j.uptime === 'number' && typeof j.playersOnline === 'number' && Object.keys(j).length === 4, '/health: status, uptime, database, players online — nothing else');
    ok(h.h['x-content-type-options'] === 'nosniff', 'security headers');
  }
  // ---------------------------------------------------------------- production config: HTTPS redirect, proxy, secret, rate limits
  {
    let died = ''; try { await H.startServer({}, 3400 + 500 + Math.floor(Math.random() * 90), { NODE_ENV: 'production', SESSION_SECRET: '' }); } catch (e) { died = e.message; }
    ok(/SESSION_SECRET/.test(died), 'production refuses to start without SESSION_SECRET');
    const P = await H.startServer({ rl_a: H.account(H.mkChar('RlAlpha', { ...SPOT })) }, 3400 + 600 + Math.floor(Math.random() * 90), { NODE_ENV: 'production', SESSION_SECRET: 'x'.repeat(40) , TRUST_PROXY: '0', RL_LOGIN_IP: '30', RL_REGISTER_IP: '5' });
    try {
      const r1 = await get(P.http.replace('localhost', '127.0.0.1') + '/', { Host: 'play.example.com' });
      ok(r1.code === 301 && r1.h.location === 'https://play.example.com/', 'production: http -> https redirect');
      const r2 = await get(P.http + '/'); ok(r2.code === 200, 'localhost development is never redirected');
      // fake a TLS proxy only when TRUST_PROXY is on: here it is off, so a forged header must not help
      const r3 = await get(P.http.replace('localhost', '127.0.0.1') + '/', { Host: 'play.example.com', 'X-Forwarded-Proto': 'https' });
      ok(r3.code === 301, 'X-Forwarded-Proto is ignored unless TRUST_PROXY=1');
      // login rate limit per IP: 30 tries / 10 min
      let lim2 = false; for (let i = 0; i < 40 && !lim2; i++) { const [cc, w] = await conn(P.ws, { t: 'login', u: 'rl_a', p: 'x' + i }); if (w && /บ่อยเกินไป|หลายครั้ง/.test(w.m)) lim2 = true; cc.close(); }
      ok(lim2, 'brute force: repeated failed logins are rate limited (per IP / per account)');
      let reg = 0; for (let i = 0; i < 7; i++) { const [cc, w] = await conn(P.ws, { t: 'register', u: 'rlreg' + i, p: 'pass1234', name: 'RlReg' + i }); if (w && /บ่อยเกินไป/.test(w.m)) reg++; cc.close(); }
      ok(reg >= 2, 'sign-up rate limit: 5 accounts per IP per hour');
    } finally { await P.stop(); }
  }
  // ---------------------------------------------------------------- client: wss:// follows https:
  {
    const g = fs.readFileSync(path.join(H.ROOT, 'public/game.js'), 'utf8');
    ok(/location\.protocol === 'https:' \? 'wss:\/\/' : 'ws:\/\/'/.test(g) && /cs: 1/.test(g), 'client builds wss:// on https pages (ws:// on http) and asks for the character select');
    ok(fs.existsSync(path.join(H.ROOT, 'deploy/Caddyfile')) && fs.existsSync(path.join(H.ROOT, '.env.example')) && !fs.readFileSync(path.join(H.ROOT, '.gitignore'), 'utf8').includes('\n!.env\n'), 'Caddyfile + .env.example present, .env ignored by git');
  }
}
module.exports = { run, SEEDS };
