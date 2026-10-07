'use strict';
// structured log lines (one JSON object per line on stdout -> logs/server.log). Secrets are never written:
// passwords, tokens, credentials and hashes are removed, long values cut.
const SECRET = /^(p|pw|pass|password|tok|token|cred|credential|hash|salt|secret|sessionSecret)$/i;
function clean(v, d = 0) {
  if (v == null || typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.length > 200 ? v.slice(0, 200) + '…' : v;
  if (d > 3) return '…';
  if (Array.isArray(v)) return v.slice(0, 20).map(x => clean(x, d + 1));
  if (typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = SECRET.test(k) ? '[redacted]' : clean(x, d + 1); return o; }
  return String(v);
}
function log(ev, fields = {}, level = 'info') { try { console.log(JSON.stringify(Object.assign({ t: new Date().toISOString(), lvl: level, ev }, clean(fields)))); } catch (e) { } }
module.exports = { log, warn: (ev, f) => log(ev, f, 'warn'), error: (ev, f) => log(ev, f, 'error'), clean };
