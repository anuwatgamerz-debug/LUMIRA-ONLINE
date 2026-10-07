'use strict';
// ============================================================ ELYNDRA ONLINE — configuration (environment + optional .env)
// .env (never committed) is read at start; real environment variables win. See .env.example.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
function loadDotEnv(file) {
  let txt; try { txt = fs.readFileSync(file, 'utf8'); } catch (e) { return; }
  for (const line of txt.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line); if (!m || line.trim().startsWith('#')) continue;
    let v = m[2]; if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
loadDotEnv(path.join(ROOT, '.env'));
const E = process.env, bool = v => /^(1|true|yes|on)$/i.test(String(v || ''));
const env = E.NODE_ENV === 'production' ? 'production' : 'development';
const legacy = E.ELYNDRA_DATA || E.LUMIRA_DATA; // old variable: path of db.json (tests and old setups)
const dataJson = legacy ? path.resolve(legacy) : path.join(ROOT, 'data', 'db.json');
const databasePath = E.DATABASE_PATH ? path.resolve(E.DATABASE_PATH) : path.join(path.dirname(dataJson), 'elyndra.db');
// session secret: required in production; in development a random one is kept in data/.session-secret
function sessionSecret() {
  if (E.SESSION_SECRET && E.SESSION_SECRET.length >= 16) return E.SESSION_SECRET;
  if (env === 'production') { console.error('[config] SESSION_SECRET (16+ chars) is required when NODE_ENV=production'); process.exit(1); }
  const f = path.join(path.dirname(databasePath), '.session-secret');
  try { const s = fs.readFileSync(f, 'utf8').trim(); if (s.length >= 16) return s; } catch (e) { }
  const s = crypto.randomBytes(32).toString('hex'); try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s, { mode: 0o600 }); } catch (e) { } return s;
}
// admin accounts: ADMIN_ACCOUNTS="login1,login2" and/or data/admins.txt (one login per line) — roles live in the database,
// this only promotes the listed logins to ADMIN at start (it never demotes anyone)
function admins() {
  const l = String(E.ADMIN_ACCOUNTS || '').split(',');
  try { l.push(...fs.readFileSync(path.join(path.dirname(databasePath), 'admins.txt'), 'utf8').split(/\r?\n/)); } catch (e) { }
  return [...new Set(l.map(s => s.trim().toLowerCase()).filter(s => s && !s.startsWith('#')))];
}
module.exports = {
  env, isProd: env === 'production', root: ROOT,
  port: +E.PORT || 3400, host: E.HOST || (env === 'production' && bool(E.TRUST_PROXY) ? '127.0.0.1' : '0.0.0.0'),
  publicUrl: E.PUBLIC_URL || '', trustProxy: bool(E.TRUST_PROXY), forceHttps: E.FORCE_HTTPS ? bool(E.FORCE_HTTPS) : env === 'production',
  dataJson, databasePath, backupDir: path.join(path.dirname(databasePath), 'backups'), backupKeep: +E.BACKUP_KEEP || 20, backupHours: E.BACKUP_HOURS === undefined ? 24 : +E.BACKUP_HOURS,
  allowRemigrate: bool(E.ALLOW_REMIGRATE),
  // rate limits per IP (tests raise them; production keeps the defaults)
  rl: { loginIp: +E.RL_LOGIN_IP || 30, registerIp: +E.RL_REGISTER_IP || 5, tokenIp: +E.RL_TOKEN_IP || 60, newcharIp: +E.RL_NEWCHAR_IP || 20 }, bcryptCost: Math.max(4, Math.min(15, +E.BCRYPT_COST || 12)),
  sessionSecret: sessionSecret(), admins: admins(),
};
