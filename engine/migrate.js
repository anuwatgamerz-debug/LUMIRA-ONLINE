'use strict';
// ============================================================ db.json -> SQLite migration (used by the server on first start
// and by scripts/migrate-db-json-to-sqlite.js). Never deletes db.json. See docs/DATABASE_MIGRATION_PLAN.md §7.
const fs = require('fs'), path = require('path');
const createStore = require('./store');

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const items = l => (Array.isArray(l) ? l : []).filter(s => s && Number.isFinite(+s.id) && s.q > 0).map(s => [s.id | 0, s.q | 0]);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// summary of what must survive, per character (compared before / after)
function fingerprint(c) {
  const qs = c.qs || {};
  return {
    name: c.name, lv: c.lv | 0 || 1, exp: +c.exp || 0, cls: c.cls || 'adventurer', jlv: c.jlv | 0 || 1, zeny: Math.max(0, Math.floor(+c.zeny || 0)), bank: Math.max(0, Math.floor(+c.bank || 0)),
    inv: items(c.inv), store: items(c.store), eq: Object.entries(c.eq || {}).filter(([, v]) => v).map(([k, v]) => [k, v | 0]).sort(),
    sk2: Object.entries(c.sk2 || {}).filter(([, v]) => v > 0).map(([k, v]) => [k, v | 0]).sort(),
    qa: Object.entries(qs.a || {}).map(([k, a]) => [k, a.s | 0, a.k | 0]).sort(), qd: Object.keys(qs.d || {}).sort(), q: [((c.q || {}).step) | 0, ((c.q || {}).k) | 0],
    portrait: c.portraitId || null, guild: c.guild || '',
  };
}

function migrate(jsonPath, dbPath, opts = {}) {
  const log = opts.log || (() => { });
  const backupDir = opts.backupDir || path.join(path.dirname(dbPath), 'backups');
  if (fs.existsSync(dbPath)) throw new Error(`${dbPath} already exists — refusing to overwrite`);
  fs.mkdirSync(backupDir, { recursive: true });
  const t0 = stamp();
  // 1. backup
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const bak = path.join(backupDir, `db-json-${t0}.json`); fs.writeFileSync(bak, raw);
  // 2. read + validate
  const src = JSON.parse(raw), accounts = src && src.accounts && typeof src.accounts === 'object' ? src.accounts : {};
  const report = { at: new Date().toISOString(), source: jsonPath, backup: bak, target: dbPath, warnings: [], before: {}, after: {}, ok: false };
  const seen = new Set(), list = [];
  for (const [login, a] of Object.entries(accounts)) {
    if (!a || typeof a !== 'object') { report.warnings.push(`account ${login}: not an object — skipped`); continue; }
    const c = a.char && typeof a.char === 'object' && typeof a.char.name === 'string' && a.char.name ? a.char : null;
    if (!c) report.warnings.push(`account ${login}: no character`);
    else {
      let n = c.name, i = 2; while (seen.has(n.toLowerCase())) n = `${c.name.slice(0, 12)}${i++}`;
      if (n !== c.name) { report.warnings.push(`character name "${c.name}" duplicated — renamed to "${n}"`); c.name = n; }
      seen.add(n.toLowerCase());
      if (!c.map) { c.map = 'lumira'; c.x = 25; c.y = 20; report.warnings.push(`${c.name}: no position — set to the village`); }
      const bad = (c.inv || []).length - items(c.inv).length + (c.store || []).length - items(c.store).length; if (bad > 0) report.warnings.push(`${c.name}: ${bad} empty/invalid item slot(s) dropped`);
    }
    list.push([login.toLowerCase(), a, c]);
  }
  const fp = new Map(list.filter(x => x[2]).map(([l, , c]) => [l, fingerprint(c)]));
  report.before = { accounts: list.length, characters: fp.size, guilds: Object.keys(src.guilds || {}).length, zeny: [...fp.values()].reduce((s, f) => s + f.zeny + f.bank, 0), items: [...fp.values()].reduce((s, f) => s + f.inv.length + f.store.length, 0) };
  // 3-5. create + import (temp file, one transaction)
  const tmp = dbPath + '.importing'; for (const f of [tmp, tmp + '-wal', tmp + '-shm']) try { fs.unlinkSync(f); } catch (e) { }
  let S = createStore(tmp);
  try {
    S.tx(() => {
      for (const [login, a, c] of list) {
        const acc = S.insertAccount({ login, alg: a.hash ? (a.alg || 'scrypt') : '', salt: a.salt || '', hash: a.hash || '', guest: a.guest, google: a.google, role: a.role, created: +a.created || Date.now() });
        for (const t of Array.isArray(a.tokens) ? a.tokens : []) if (t && t.h && t.exp > Date.now()) S.S('INSERT OR IGNORE INTO sessions (account_id, token_hash, created_at, expires_at) VALUES (?,?,?,?)').run(acc.id, String(t.h), Date.now(), +t.exp);
        if (c) S.insertChar(acc, c, 1);
      }
      S.saveGuilds(src.guilds || {});
      S.meta('migrated_from', 'db.json'); S.meta('migrated_at', report.at);
    });
    // 6-7. verify by reading everything back
    const back = S.loadAccounts(), bad = [];
    for (const [login, f] of fp) {
      const a = back.get(login), c = a && a.chars[0];
      if (!c) { bad.push(`${login}: character missing`); continue; }
      const g = fingerprint(c);
      for (const k of Object.keys(f)) if (!same(f[k], g[k])) bad.push(`${login}/${f.name}: ${k} differs (${JSON.stringify(f[k]).slice(0, 80)} vs ${JSON.stringify(g[k]).slice(0, 80)})`);
    }
    const cnt = S.counts(), G = S.loadGuilds();
    report.after = { accounts: cnt.accounts, characters: cnt.characters, guilds: Object.keys(G).length, zeny: [...back.values()].flatMap(a => a.chars).reduce((s, c) => s + (c.zeny | 0) + (c.bank | 0), 0), items: cnt.items };
    for (const k of ['accounts', 'characters', 'guilds', 'zeny', 'items']) if (report.before[k] !== report.after[k]) bad.push(`${k}: ${report.before[k]} before, ${report.after[k]} after`);
    report.errors = bad; report.ok = !bad.length;
    S.close(); S = null;
    if (!report.ok) throw new Error('verification failed:\n  ' + bad.slice(0, 20).join('\n  '));
    for (const f of [tmp + '-wal', tmp + '-shm']) try { fs.unlinkSync(f); } catch (e) { }
    fs.renameSync(tmp, dbPath);
    fs.writeFileSync(jsonPath + '.migrated', `migrated to ${path.basename(dbPath)} at ${report.at}\nThis db.json is kept as a legacy backup and is no longer written.\n`);
  } catch (e) {
    if (S) try { S.close(); } catch (e2) { }
    for (const f of [tmp, tmp + '-wal', tmp + '-shm']) try { fs.unlinkSync(f); } catch (e2) { }
    report.ok = false; report.error = e.message;
    fs.writeFileSync(path.join(backupDir, `migration-report-${t0}.json`), JSON.stringify(report, null, 1));
    throw e;
  }
  report.reportFile = path.join(backupDir, `migration-report-${t0}.json`);
  fs.writeFileSync(report.reportFile, JSON.stringify(report, null, 1));
  log(`[db] migrated ${report.after.accounts} accounts / ${report.after.characters} characters from ${path.basename(jsonPath)} to ${path.basename(dbPath)} (report ${path.basename(report.reportFile)})`);
  return report;
}
module.exports = { migrate, fingerprint };
