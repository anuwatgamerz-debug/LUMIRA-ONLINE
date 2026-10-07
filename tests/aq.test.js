'use strict';
// UX + Quest Navigation tests (Playwright): login screen, compact target HUD, NPC nameplates, Auto Quest
// (talk / kill / collect / return / multi-map route / pathing around obstacles), manual cancel, death,
// completion and the "no route / missing target" stops. Skipped cleanly when Playwright isn't installed.
const H = require('./harness');
const { sleep } = H;
function loadPlaywright() {
  try { return require('playwright'); } catch (e) { }
  try { const root = require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); return require(root + '/playwright'); } catch (e) { }
  return null;
}
const STRONG = { lv: 14, cls: 'vanguard', eq: { wpn: 22, arm: 31 }, st: { str: 30, agi: 20, vit: 25, int: 5, dex: 20, luk: 5 }, hp: 9999, sp: 9999 };
const SEEDS = {
  aq_talk: H.mkChar('AqTalk', { ...STRONG, map: 'lumira', x: 40, y: 30, qs: { a: { mq1: { s: 0, k: 0 } }, d: {}, t: 'mq1' } }),
  aq_kill: H.mkChar('AqKill', { ...STRONG, map: 'beginner_meadow', x: 10, y: 24, qs: { a: { mq2: { s: 1, k: 0 } }, d: { mq1: 1 }, t: 'mq2' } }),
  aq_coll: H.mkChar('AqColl', { ...STRONG, map: 'beginner_meadow', x: 12, y: 24, qs: { a: { mq2: { s: 3, k: 0 } }, d: { mq1: 1 }, t: 'mq2' } }),
  aq_back: H.mkChar('AqBack', { ...STRONG, map: 'beginner_meadow', x: 6, y: 24, inv: [{ id: 100, q: 5 }], qs: { a: { mq2: { s: 4, k: 0 } }, d: { mq1: 1 }, t: 'mq2' } }),
  aq_route: H.mkChar('AqRoute', { ...STRONG, map: 'lumira', x: 22, y: 20, qs: { a: {}, d: { mq1: 1 } } }),
  aq_ui: H.mkChar('AqUi', { ...STRONG, map: 'lumira', x: 22, y: 20, qs: { a: { mq2: { s: 1, k: 0 } }, d: { mq1: 1 }, t: 'mq2' } }),
};
const DESK = { viewport: { width: 1280, height: 800 } };
async function open(b, opts, srv) {
  const ctx = await b.newContext(opts), pg = await ctx.newPage(); pg.errs = [];
  pg.on('pageerror', e => pg.errs.push(e.message)); await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await pg.goto(srv.http + '/'); return pg;
}
async function loginAs(b, opts, srv, u) {
  const pg = await open(b, opts, srv);
  await pg.fill('#u', u); await pg.fill('#p', H.PW); await pg.click('#go'); await H.uiEnter(pg);
  await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && typeof ents !== 'undefined' && ents.has(myId) && GUIDE, null, { timeout: 10000 });
  await pg.waitForTimeout(800); return pg;
}
const st = pg => pg.evaluate(() => ({ map: map && map.id, on: AQ.on, phase: AQ.phase, qs: me.qs.a, q: me.q, dlg: $('wDlg').style.display === 'block', toast: $('ctoast').textContent, pos: ents.get(myId) ? [Math.round(ents.get(myId).tx), Math.round(ents.get(myId).ty)] : null }));
async function waitFor(pg, fn, ms, arg) { const t = Date.now(); while (Date.now() - t < ms) { if (await pg.evaluate(fn, arg).catch(() => false)) return true; await sleep(400); } return false; }

async function run(srv, R) {
  const pw = loadPlaywright(); if (!pw) { R.skipped('Auto Quest browser tests', 'playwright not installed'); return; }
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => pw.chromium.launch());
  try {
    // ---------------- login
    console.log('-- Login screen');
    for (const [w, h, mob] of [[360, 800, 1], [390, 844, 1], [430, 932, 1], [844, 390, 1], [768, 1024, 1], [1280, 800, 0]]) {
      const pg = await open(b, { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: !!mob, hasTouch: !!mob }, srv); await pg.waitForTimeout(500);
      const r = await pg.evaluate(() => { const b = document.querySelector('#login .box').getBoundingClientRect(), u = $('u').getBoundingClientRect(), g = $('go').getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, bt: b.bottom, w: b.width, uh: u.height, gh: g.height, W: innerWidth, H: innerHeight, eye: !!$('peye'), rem: !!$('rem') }; });
      const portrait = h > w, ratio = r.w / r.W;
      R.ok(r.l >= 0 && r.r <= r.W && r.t >= 0 && r.bt <= r.H && r.gh >= 26 && r.eye && r.rem && (!portrait || w > 700 || (ratio >= 0.84 && ratio <= 0.94)) && !pg.errs.length,
        `login responsive ${w}x${h}: panel on screen${portrait && w < 700 ? ' (' + Math.round(ratio * 100) + '% wide)' : ''}, show/hide + remember ID`, JSON.stringify(r));
      await pg.context().close();
    }
    {
      const pg = await open(b, DESK, srv);
      await pg.fill('#u', 'aq_talk'); await pg.fill('#p', 'wrong-pass');
      await pg.click('#peye'); const shown = await pg.$eval('#p', e => e.type); await pg.click('#peye'); const hidden = await pg.$eval('#p', e => e.type);
      await pg.press('#p', 'Enter'); const busy = await pg.$eval('#go', e => e.disabled);
      await pg.waitForFunction(() => !$('go').disabled, null, { timeout: 6000 }).catch(() => { });
      const err = await pg.$eval('#err', e => e.textContent), bh = await pg.$eval('#err', e => e.getBoundingClientRect().height);
      R.ok(shown === 'text' && hidden === 'password', 'login: password show / hide toggle');
      R.ok(busy, 'login: Enter submits and the button is disabled while the request runs (loading state)');
      R.ok(err === 'อีเมล/ไอดี หรือรหัสผ่านไม่ถูกต้อง' && bh < 40 && !(await pg.$eval('#go', e => e.disabled)), 'login error: short message, button usable again', err);
      await pg.context().close();
    }
    // ---------------- HUD: target panel + NPC nameplates
    console.log('-- Target HUD / NPC labels');
    {
      const pg = await loginAs(b, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, srv, 'aq_ui');
      const r = await pg.evaluate(() => { const l = targetList(30); const id = l[0]; if (id) setTarget(id); tgPlaceT = 0; placeTarget(); const t = $('tgt').getBoundingClientRect(), m = $('mm').getBoundingClientRect(); return { id, on: $('tgt').classList.contains('on'), t: [t.left, t.top, t.right, t.bottom, t.width, t.height], mm: [m.bottom, m.right], W: innerWidth, H: innerHeight }; });
      const [l, t, rr, bt, w, h] = r.t, cx = r.W / 2, cy = r.H / 2;
      R.ok(r.on && t >= r.mm[0] && Math.abs(rr - r.mm[1]) < 6 && w <= 270 && h <= 90 && !(cx > l && cx < rr && cy > t && cy < bt), 'target HUD: compact (≤270x90), under the minimap, never over the screen centre', JSON.stringify(r));
      const lab = () => pg.evaluate(() => { const out = []; for (const n of map.npcs) { const L = labels.find(q => q[4] === 'npc' && q[2] === n.label); if (L) out.push([n.id, L[0] - (n.x + 0.5) * TP, L[1] - ((n.y + 0.5) * TP + 12)]); } return out; });
      const a = await lab();
      R.ok(a.length >= 3 && a.every(([, dx, dy]) => dx === 0 && dy === 6), 'NPC nameplates are anchored to the NPC (centre x, under the feet)', JSON.stringify(a.slice(0, 4)));
      await pg.evaluate(() => send({ t: 'move', x: 30, y: 26 })); await pg.waitForTimeout(2500);
      const b2 = await lab();
      R.ok(b2.length >= 3 && b2.every(([, dx, dy]) => dx === 0 && dy === 6), 'NPC nameplates stay on their NPC after the camera moves', JSON.stringify(b2.slice(0, 4)));
      // quest tracker: text opens the log, ▶ starts auto quest, gold markers exist
      await pg.tap('#qt'); const logOpen = await pg.$eval('#wQuest', e => e.style.display === 'block'); await pg.evaluate(() => closeWins());
      await pg.tap('#qauto'); await pg.waitForTimeout(900); const s1 = await st(pg);
      R.ok(logOpen && s1.on && /AUTO QUEST/.test(await pg.$eval('#qt', e => e.textContent)), 'quest tracker: text opens the quest log, ▶ starts Auto Quest with a status line', JSON.stringify(s1));
      R.ok(await pg.evaluate(() => questMarkTargets().length > 0 && !!aqArrowTarget()), 'quest markers (minimap / map) and the direction arrow have a target');
      // manual control always wins
      await pg.evaluate(() => { joy = { id: 99, cx: 0, cy: 0, R: 50, dx: 1, dy: 0 }; walkTick(); joy = null; }); await pg.waitForTimeout(300);
      R.ok(!(await st(pg)).on, 'cancel with the joystick: Auto Quest pauses');
      await pg.tap('#qauto'); await pg.waitForTimeout(500); await pg.keyboard.down('d'); await pg.waitForTimeout(350); await pg.keyboard.up('d'); await pg.waitForTimeout(300);
      R.ok(!(await st(pg)).on, 'cancel with WASD: Auto Quest pauses');
      // death: stop, then ask after respawn
      await pg.tap('#qauto'); await pg.waitForTimeout(300);
      await pg.evaluate(() => { me.hp = 0; }); await pg.waitForTimeout(900); const dead = await st(pg);
      await pg.evaluate(() => { me.hp = me.maxhp; }); await pg.waitForTimeout(900);
      R.ok(!dead.on && await pg.$eval('#aqask', e => e.style.display === 'block'), 'death stops Auto Quest; after respawn it asks "ดำเนินภารกิจต่อหรือไม่?" (no auto walk)');
      await pg.click('#aqNo');
      // stops: no route / monster missing / NPC missing / quest complete
      const stopWith = async (setup, want) => { await pg.evaluate(setup); await pg.evaluate(() => { AQ.on = false; aqStart(); }); await pg.waitForTimeout(700); const s = await st(pg); return !s.on && s.toast.includes(want) ? '' : JSON.stringify(s); };
      const saved = await pg.evaluate(() => JSON.stringify(GUIDE));
      let r1 = await stopWith(() => { for (const k in GUIDE.portals) GUIDE.portals[k] = GUIDE.portals[k].map(p => Object.assign({}, p, { locked: true })); }, 'ไม่พบเส้นทาง');
      R.ok(!r1, 'no route to the target: Auto Quest stops with "ไม่พบเส้นทางไปยังเป้าหมาย"', r1);
      await pg.evaluate(s => { GUIDE = JSON.parse(s); }, saved);
      r1 = await stopWith(() => { delete GUIDE.spawns.sprout; }, 'ไม่พบมอนสเตอร์'); R.ok(!r1, 'monster missing: stops with a short message', r1);
      await pg.evaluate(s => { GUIDE = JSON.parse(s); me.qs.a = { mq3: { s: 2, k: 0, n: 1, d: 'x' } }; me.qs.t = 'mq3'; delete GUIDE.npcs['solkara:archivist']; }, saved);
      r1 = await stopWith(() => { }, 'ไม่พบ NPC'); R.ok(!r1, 'NPC missing: stops with a short message', r1);
      await pg.evaluate(s => { GUIDE = JSON.parse(s); me.qs.a = { mq2: { s: 1, k: 0, n: 6, d: 'x' } }; me.qs.t = 'mq2'; AQ.on = false; aqStart(); }, saved); await pg.waitForTimeout(400);
      await pg.evaluate(() => { me.qs.a = {}; me.qs.t = null; me.q = { step: 9, k: 0 }; }); await pg.waitForTimeout(900);
      const done = await st(pg); R.ok(!done.on && /สำเร็จ/.test(done.toast), 'quest completed: Auto Quest stops and says so', JSON.stringify(done));
      R.ok(!pg.errs.length, 'HUD / Auto Quest UI: no page errors', JSON.stringify(pg.errs));
      await pg.context().close();
    }
    // ---------------- Auto Quest end to end (server-authoritative walking and combat)
    console.log('-- Auto Quest');
    {
      const pg = await loginAs(b, DESK, srv, 'aq_talk'); await pg.click('#qauto');
      let solid = 0; const watch = setInterval(async () => { const bad = await pg.evaluate(() => { const e = ents.get(myId); return e ? SOLID_T.has(map.t[Math.round(e.ty) * map.w + Math.round(e.tx)]) : false; }).catch(() => false); if (bad) solid++; }, 300);
      const ok = await waitFor(pg, () => $('wDlg').style.display === 'block', 30000);
      clearInterval(watch); const s = await st(pg);
      R.ok(ok && s.map === 'lumira', 'talk-to-NPC quest: walks to the NPC and opens the conversation (player confirms)', JSON.stringify(s));
      R.ok(solid === 0, 'pathfinding: never walks through buildings / trees / water on the way', 'solid samples ' + solid);
      await pg.context().close();
    }
    {
      const pg = await loginAs(b, DESK, srv, 'aq_kill'); await pg.click('#qauto');
      const ok = await waitFor(pg, () => me.qs.a.mq2 && (me.qs.a.mq2.s > 1 || me.qs.a.mq2.k >= 2), 45000); const s = await st(pg);
      R.ok(ok, 'kill quest: finds the quest monster, targets it and fights with the normal combat (count goes up)', JSON.stringify(s));
      await pg.context().close();
    }
    {
      const pg = await loginAs(b, DESK, srv, 'aq_coll'); await pg.click('#qauto');
      const ok = await waitFor(pg, () => me.qs.a.mq2 && (me.qs.a.mq2.s > 3 || me.qs.a.mq2.k >= 1), 60000); const s = await st(pg);
      R.ok(ok, 'collect quest: hunts the monsters that drop the item and loots it (count goes up)', JSON.stringify(s));
      await pg.context().close();
    }
    {
      const pg = await loginAs(b, DESK, srv, 'aq_back'); await pg.click('#qauto');
      const ok = await waitFor(pg, () => map.id === 'lumira' && $('wDlg').style.display === 'block', 45000); const s = await st(pg);
      R.ok(ok, 'return to NPC: walks back through the portal to the quest NPC and opens the turn-in dialogue', JSON.stringify(s));
      await pg.context().close();
    }
    {
      const pg = await loginAs(b, DESK, srv, 'aq_route'); await pg.click('#qauto');
      const ok = await waitFor(pg, () => map.id === 'plains', 45000); const s = await st(pg);
      R.ok(ok, 'multi-map routing: lumira → solkara → plains through the portals (no teleport)', JSON.stringify(s));
      await pg.context().close();
    }
  } finally { await b.close(); }
}
module.exports = { run, SEEDS };
