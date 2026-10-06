'use strict';
// Test harness: runs server.js against a throwaway database (LUMIRA_DATA) so data/db.json is never touched.
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), { spawn } = require('child_process');
const ROOT = path.join(__dirname, '..');
const WebSocket = require(path.join(ROOT, 'node_modules', 'ws'));
const PW = 'pass1234';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// character shaped like a real save; the server's fixChar() fills anything left out
function mkChar(name, o = {}) {
  return Object.assign({
    name, look: { hair: 0, hc: 0, cc: 0, sex: 0 }, lv: 1, exp: 0, zeny: 5000, pts: 0,
    st: { str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 }, map: 'solkara', x: 21, y: 20,
    inv: [{ id: 1, q: 10 }], eq: { wpn: 20, arm: 30 }, q: { step: 0, k: 0 }, hp: 9999, sp: 9999,
  }, o);
}
function account(char) { const salt = crypto.randomBytes(12).toString('hex'); return { salt, hash: crypto.scryptSync(PW, salt, 32).toString('hex'), char, created: Date.now() }; }

async function startServer(accounts, port) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumira-test-'));
  const db = path.join(dir, 'db.json');
  fs.writeFileSync(db, JSON.stringify({ accounts }));
  const proc = spawn(process.execPath, [path.join(ROOT, 'server.js')], { env: { ...process.env, PORT: String(port), LUMIRA_DATA: db }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; proc.stdout.on('data', d => { log += d; }); proc.stderr.on('data', d => { log += d; });
  let exited = false; proc.once('exit', () => { exited = true; });
  const t0 = Date.now(); while (!/running/.test(log)) { if (exited || Date.now() - t0 > 8000) throw new Error('server did not start:\n' + log); await sleep(50); }
  return {
    port, http: `http://localhost:${port}`, ws: `ws://localhost:${port}`, dir, db, log: () => log, alive: () => !exited,
    async stop() { if (!exited) { proc.kill('SIGTERM'); await new Promise(r => proc.once('exit', r)); } fs.rmSync(dir, { recursive: true, force: true }); },
  };
}

// minimal protocol client: records every message (except snapshots, only the latest is kept)
function client(url) {
  const ws = new WebSocket(url); const msgs = []; let waiters = []; let snap = null;
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.t === 's') snap = m; else msgs.push(m);
    waiters = waiters.filter(w => !(w.f(m) && (w.r(m), true)));
  });
  ws.on('error', () => { });
  const c = {
    ws, msgs, get snap() { return snap; },
    send: o => ws.readyState === 1 && ws.send(JSON.stringify(o)),
    // resolves with the first matching message (already received or future), or null after ms
    wait: (f, ms = 3000) => new Promise(r => { const found = msgs.find(f); if (found) return r(found); const w = { f, r }; waiters.push(w); setTimeout(() => { waiters = waiters.filter(x => x !== w); r(null); }, ms); }),
    next: (f, ms = 3000) => new Promise(r => { const w = { f, r }; waiters.push(w); setTimeout(() => { waiters = waiters.filter(x => x !== w); r(null); }, ms); }),
    last: t => [...msgs].reverse().find(m => m.t === t),
    count: (f, since = 0) => msgs.slice(since).filter(f).length,
    closed: new Promise(r => ws.on('close', r)), open: new Promise(r => ws.on('open', r)),
    close() { try { ws.close(); } catch (e) { } },
  };
  return c;
}
async function login(url, u) {
  const c = client(url); await c.open; c.send({ t: 'login', u, p: PW });
  const w = await c.wait(m => m.t === 'welcome' || m.t === 'err', 5000);
  if (!w || w.t !== 'welcome') throw new Error('login failed for ' + u + ': ' + JSON.stringify(w));
  c.id = w.id; await c.wait(m => m.t === 'me'); await sleep(300); // let the first snapshots arrive
  return c;
}
const me = c => c.last('me').c;
const myPos = c => { const p = c.snap && c.snap.p.find(x => x[0] === c.id); return p ? [p[2], p[3]] : null; };
const mobsOf = c => (c.snap ? c.snap.m : []).map(([id, type, x, y, dir, hp, maxhp, tg]) => ({ id, type, x, y, hp, maxhp, tg }));
const cheb = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));

// simple reporter
function reporter(title) {
  const r = { title, pass: 0, fail: 0, skip: 0, rows: [] };
  r.ok = (cond, name, detail) => { r.rows.push([cond ? 'PASS' : 'FAIL', name, detail]); cond ? r.pass++ : r.fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${!cond && detail ? '  -> ' + detail : ''}`); return cond; };
  r.skipped = (name, why) => { r.rows.push(['SKIP', name, why]); r.skip++; console.log(`SKIP ${name} (${why})`); };
  return r;
}

module.exports = { ROOT, PW, sleep, mkChar, account, startServer, client, login, me, myPos, mobsOf, cheb, reporter };
