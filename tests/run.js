'use strict';
// npm test  -> server suite + browser suite (browser suite needs Playwright; skipped if it isn't installed)
// node tests/run.js server|world|ui|art  -> one suite only (server also runs world)
const H = require('./harness');
const server = require('./server.test');
const world = require('./world.test');
const art = require('./art.test');
let ui = null; try { ui = require('./ui.test'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }

(async () => {
  const only = process.argv[2];
  const accounts = {};
  for (const [u, ch] of Object.entries({ ...server.SEEDS, ...world.SEEDS, ...art.SEEDS, ...(ui ? ui.SEEDS : {}) })) accounts[u] = H.account(ch);
  const srv = await H.startServer(accounts, 3400 + 100 + Math.floor(Math.random() * 400));
  const reps = [];
  try {
    if (!only || only === 'server') { console.log('\n=== server suite ==='); const r = H.reporter('server'); reps.push(r); await server.run(srv, r); }
    if (!only || only === 'world' || only === 'server') { console.log('\n=== world suite (Milestone 1) ==='); const r = H.reporter('world'); reps.push(r); await world.run(srv, r); }
    if (!only || only === 'art') { console.log('\n=== art suite (LUMIRA art bible) ==='); const r = H.reporter('art'); reps.push(r); await art.run(srv, r); }
    if ((!only || only === 'ui') && ui) { console.log('\n=== browser suite ==='); const r = H.reporter('browser'); reps.push(r); await ui.run(srv, r); }
  } catch (e) { console.error('suite crashed:', e); reps.push({ title: 'crash', pass: 0, fail: 1, skip: 0 }); }
  finally { await srv.stop(); }
  console.log('\n=== summary ===');
  let failed = 0; for (const r of reps) { console.log(`${r.title}: ${r.pass} passed, ${r.fail} failed, ${r.skip} skipped`); failed += r.fail; }
  if (!srv.alive || /\[fatal\]/.test(srv.log())) { console.log('server log shows a fatal error:\n' + srv.log()); failed++; }
  process.exit(failed ? 1 : 0);
})();
