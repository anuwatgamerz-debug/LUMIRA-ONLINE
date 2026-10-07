'use strict';
// Lightweight load check (Pre-Public Foundation, Phase 16): 10 / 25 / 50 simulated players on one server with the
// SQLite database. Each bot: logs in, walks around the field, chats now and then and attacks the nearest monster.
// Not a 1000-player benchmark — it checks that the new database layer has no obvious errors under real traffic.
//   node tests/load.js            (10, 25, 50)      node tests/load.js 25      (one size)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const H = require('./harness');
const SIZES = process.argv[2] ? [+process.argv[2]] : [10, 25, 50];
const SECS = +(process.env.LOAD_SECS || 20);
const SPOTS = [['plains', 20, 20], ['woods', 24, 24], ['greenwood', 20, 20], ['beginner_meadow', 20, 18]];

function cpuMem(pid) { try { const [c, r] = execSync(`ps -o %cpu=,rss= -p ${pid}`).toString().trim().split(/\s+/); return { cpu: +c, rssMB: Math.round(+r / 1024) }; } catch (e) { return { cpu: 0, rssMB: 0 }; } }

async function runSize(n) {
  const accounts = {};
  for (let i = 0; i < n; i++) { const [map, x, y] = SPOTS[i % SPOTS.length]; accounts['load' + i] = H.account(H.mkChar('Load' + i, { lv: 8, map, x: x + (i % 5), y: y + ((i / 5) | 0) % 5, hp: 99999 })); }
  const srv = await H.startServer(accounts, 4400 + Math.floor(Math.random() * 500));
  const pid = srv.pid;
  const res = { players: n, loginMs: [], loginErr: 0, sent: 0, recv: 0, hits: 0, chats: 0, errors: 0 };
  const bots = [];
  try {
    // log in (staggered a little, like players arriving)
    await Promise.all(Array.from({ length: n }, async (_, i) => {
      await H.sleep(i * 40); const t0 = Date.now();
      try { const c = await H.login(srv.ws, 'load' + i); res.loginMs.push(Date.now() - t0); bots.push(c); } catch (e) { res.loginErr++; }
    }));
    const tEnd = Date.now() + SECS * 1000; let peak = { cpu: 0, rssMB: 0 };
    const loops = bots.map((c, i) => (async () => {
      let k = 0;
      while (Date.now() < tEnd) {
        const pos = H.myPos(c) || [20, 20];
        if (k % 3 === 0) { c.send({ t: 'move', x: pos[0] + ((Math.random() * 7) | 0) - 3, y: pos[1] + ((Math.random() * 7) | 0) - 3 }); res.sent++; }
        const mobs = H.mobsOf(c).filter(m => m.hp > 0); if (mobs.length) { const m = mobs.sort((a, b) => H.cheb([a.x, a.y], pos) - H.cheb([b.x, b.y], pos))[0]; c.send({ t: 'attack', id: m.id }); res.sent++; }
        if (k % 10 === 5) { c.send({ t: 'chat', m: 'load test ' + i + ' ' + k }); res.sent++; res.chats++; }
        k++; await H.sleep(500 + Math.random() * 300);
      }
    })());
    const mon = setInterval(() => { const u = cpuMem(pid); peak = { cpu: Math.max(peak.cpu, u.cpu), rssMB: Math.max(peak.rssMB, u.rssMB) }; }, 1000);
    await Promise.all(loops); clearInterval(mon);
    for (const c of bots) { res.recv += c.msgs.length; res.hits += c.msgs.filter(m => m.t === 'fx' && m.k === 'hit').length; }
    res.peakCpu = peak.cpu; res.peakRssMB = peak.rssMB;
    for (const c of bots) c.close(); await H.sleep(1200);
    // after everyone left: every character is in the database, the file is healthy, no server errors
    const rows = H.sql(srv, 'SELECT COUNT(*) n FROM characters WHERE deleted_at IS NULL')[0].n, ic = H.sql(srv, 'PRAGMA integrity_check')[0].integrity_check;
    res.dbChars = rows; res.integrity = ic;
    res.errors = srv.log().split('\n').filter(l => /"lvl":"error"|\[fatal\]|SQLITE_|database is locked/i.test(l)).length;
    res.alive = srv.alive();
  } finally { await srv.stop(); }
  const s = res.loginMs.sort((a, b) => a - b); res.loginP50 = s[(s.length / 2) | 0] || 0; res.loginMax = s[s.length - 1] || 0; delete res.loginMs;
  return res;
}

(async () => {
  const out = [];
  for (const n of SIZES) { process.stdout.write(`load ${n} players (${SECS}s)... `); const r = await runSize(n); out.push(r); console.log(JSON.stringify(r)); }
  const bad = out.filter(r => r.loginErr || r.errors || r.integrity !== 'ok' || r.dbChars !== r.players || !r.alive);
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'out', 'load.json'), JSON.stringify(out, null, 1));
  console.log(bad.length ? `LOAD: ${bad.length} size(s) with problems` : 'LOAD: all sizes OK');
  process.exit(bad.length ? 1 : 0);
})();
