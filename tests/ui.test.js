'use strict';
// Browser tests (Playwright + Chromium). Phase 1: responsive layout + HUD/joystick/chat. Phase 2: combat wheel,
// target system, skills, cooldowns, touch/keyboard conflicts. Skipped cleanly when Playwright isn't installed.
const H = require('./harness');
const { sleep } = H;

function loadPlaywright() {
  try { return require('playwright'); } catch (e) { }
  try { const root = require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); return require(root + '/playwright'); } catch (e) { }
  return null;
}
// browser accounts stand on the Oasis Woods road (always walkable; upper half has only passive jellop/leafling),
// away from the server suite's accounts on the plains so the two suites never fight over the same monsters
const FIELD = { lv: 8, map: 'woods', x: 25, y: 12, eq: {}, st: { str: 1, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 } };
const SEEDS = {
  u_mob: H.mkChar('UMob', { ...FIELD }),
  u_desk: H.mkChar('UDesk', { ...FIELD }),
  u_nosp: H.mkChar('UNoSp', { ...FIELD, sp: 0 }),
  u_nopot: H.mkChar('UNoPot', { ...FIELD, inv: [{ id: 10, q: 2 }] }),
  u_frag: H.mkChar('UFrag', { ...FIELD, hp: 1, st: { str: 1, agi: 1, vit: 1, int: 5, dex: 5, luk: 1 } }),
};
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const DESK = { viewport: { width: 1280, height: 800 } };
const VPS = [['360x800', 360, 800, 3, 1], ['390x844', 390, 844, 3, 1], ['430x932', 430, 932, 3, 1], ['844x390', 844, 390, 3, 1], ['640x360', 640, 360, 2, 1], ['tablet 768x1024', 768, 1024, 2, 1], ['desktop 1280x800', 1280, 800, 1, 0]];

// record what the page sends and receives (except snapshots) so tests can assert on real protocol traffic
const SPY = () => {
  window.__sent = []; window.__recv = []; window.__errs = [];
  addEventListener('pointerdown', e => { window.__pd = { x: e.clientX, y: e.clientY, tgt: e.target.id || e.target.tagName, type: e.pointerType }; }, true);
  const S = WebSocket.prototype.send; WebSocket.prototype.send = function (d) { try { window.__sent.push(JSON.parse(d)); } catch (e) { } return S.call(this, d); };
  const O = window.WebSocket;
  window.WebSocket = function (...a) { const w = new O(...a); w.addEventListener('message', e => { try { const m = JSON.parse(e.data); if (m.t !== 's') window.__recv.push(m); } catch (er) { } }); return w; };
  window.WebSocket.prototype = O.prototype; window.WebSocket.OPEN = 1;
};
async function open(b, opts, srv) {
  const ctx = await b.newContext(opts); await ctx.addInitScript(SPY);
  const pg = await ctx.newPage(); pg.errs = [];
  pg.on('pageerror', e => pg.errs.push(e.message)); await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await pg.goto(srv.http + '/'); return pg;
}
async function loginAs(b, opts, srv, u) {
  const pg = await open(b, opts, srv);
  await pg.fill('#u', u); await pg.fill('#p', H.PW); await pg.click('#go'); await H.uiEnter(pg);
  await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && typeof ents !== 'undefined' && ents.size > 0, null, { timeout: 8000 });
  await pg.waitForTimeout(800); return pg;
}
async function register(b, opts, srv, tag) {
  const pg = await open(b, opts, srv); await pg.click('#tReg');
  const name = tag + (Date.now() % 1e4);
  await pg.fill('#u', 'r' + name.toLowerCase()); await pg.fill('#p', 'pass1234'); await pg.fill('#cn', name); await pg.click('#go'); await H.uiEnter(pg);
  await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block', null, { timeout: 8000 });
  // the first map bake can take a moment on a busy machine: wait until the minimap shows the real position
  await pg.waitForFunction(() => typeof ents !== 'undefined' && ents.has(myId) && /^\d+,\d+$/.test(document.getElementById('mmxy2').textContent) && document.getElementById('mmxy2').textContent !== '0,0', null, { timeout: 8000 }).catch(() => { });
  await pg.waitForTimeout(1000); pg.name = name; return pg;
}
// page-side helpers (game.js / combat.js globals are reachable from evaluate)
const sent = (pg, f) => pg.evaluate(f => window.__sent.filter(new Function('m', 'return ' + f)), f);
const recv = (pg, f) => pg.evaluate(f => window.__recv.filter(new Function('m', 'return ' + f)), f);
const mark = pg => pg.evaluate(() => [window.__sent.length, window.__recv.length]);
const sentSince = (pg, k, f) => pg.evaluate(([k, f]) => window.__sent.slice(k).filter(new Function('m', 'return ' + f)), [k, f]);
const recvSince = (pg, k, f) => pg.evaluate(([k, f]) => window.__recv.slice(k).filter(new Function('m', 'return ' + f)), [k, f]);
// screen point (CSS px) on a monster's body that isn't covered by HUD
const mobPoint = (pg, pick) => pg.evaluate(pick => {
  const P = new Function('e', 'd', 'return ' + (pick || 'true'));
  const m = ents.get(myId), [ox, oy] = viewOrigin(), out = [];
  for (const [id, e] of ents) {
    if (e.kind !== 'm') continue;
    const d = Math.max(Math.abs(e.tx - m.tx), Math.abs(e.ty - m.ty)); if (!P(e, d)) continue;
    if (e.moving || Math.hypot(e.tx - e.x, e.ty - e.y) > 0.05) continue; // walking: would move away before the tap lands
    if ([...ents.values()].some(o => o !== e && o.kind !== 'p' && Math.hypot(o.x - e.x, o.y - e.y) < 1.2)) continue; // another monster/loot right there: ambiguous tap
    const x = ((e.x + 0.5) * TP + ox) * Z / DPR, y = ((e.y + 0.5) * TP + 12 - 18 + oy) * Z / DPR;
    if (x < 20 || y < 20 || x > innerWidth - 20 || y > innerHeight - 20) continue;
    // browsers snap a finger press onto a nearby button ("touch adjustment"), so keep clear of the HUD
    const cvs = document.getElementById('game');
    if ([[0, 0], [18, 0], [-18, 0], [0, 18], [0, -18], [13, 13], [-13, 13], [13, -13], [-13, -13]].some(([a, b]) => document.elementFromPoint(x + a, y + b) !== cvs)) continue;
    out.push({ id, x, y, d });
  }
  out.sort((a, b) => a.d - b.d); return out[0] || null;
}, pick);
async function findMob(pg, pick, ms = 8000) { const t0 = Date.now(); for (;;) { const p = await mobPoint(pg, pick); if (p || Date.now() - t0 > ms) return p; await pg.waitForTimeout(400); } }
const center = (pg, sel) => pg.$eval(sel, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
const pos = pg => pg.evaluate(() => { const e = ents.get(myId); return [Math.round(e.tx), Math.round(e.ty)]; });
async function waitFor(pg, fn, arg, ms = 10000) { try { await pg.waitForFunction(fn, arg, { timeout: ms }); return true; } catch (e) { return false; } }
// tap (touch) or click a monster; on the second tap the old chase-attack starts
async function tapMob(pg, pt, touch) { if (touch) await pg.touchscreen.tap(pt.x, pt.y); else await pg.mouse.click(pt.x, pt.y); await pg.waitForTimeout(120); }
// get next to a monster: select it, tap it again (chase), wait for my first swing
const pointOf = (pg, id) => pg.evaluate(id => { const e = ents.get(id); if (!e) return null; const [ox, oy] = viewOrigin(); return { id, x: ((e.x + 0.5) * TP + ox) * Z / DPR, y: ((e.y + 0.5) * TP + 12 - 18 + oy) * Z / DPR }; }, id);
async function engage(pg, touch, pick) {
  for (let i = 0; i < 6; i++) {
    const pt = await findMob(pg, pick, 4000); if (!pt) continue;
    await tapMob(pg, pt, touch);
    if (await pg.evaluate(() => selected) !== pt.id) { await pg.evaluate(() => { clearTarget(); closeWins(); }); continue; }
    const now = await pointOf(pg, pt.id); if (!now) continue;
    const [k] = await mark(pg); await tapMob(pg, now, touch);
    if (!(await sentSince(pg, k, `m.t === 'attack' && m.id === ${pt.id} && !m.n`)).length) { await pg.evaluate(() => clearTarget()); continue; }
    if (await waitFor(pg, id => window.__recv.some(m => m.t === 'fx' && m.k === 'hit' && m.from === myId && m.to === id), pt.id, 20000)) return pt.id;
  }
  return 0;
}

async function responsive(b, srv, R) {
  for (const [n, w, h, dpr, mob] of VPS) {
    const pg = await register(b, { viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: !!mob, hasTouch: !!mob }, srv, 'v' + w);
    // big gold number (widest top bar) + target panel shown, measured in the same tick so the combat UI can't hide it first
    await pg.evaluate(() => { me.zeny = 9999999; updHud(); });
    const r = await pg.evaluate(() => {
      document.getElementById('tgt').classList.add('on'); if (typeof placeTarget === 'function') { tgPlaceT = 0; placeTarget(); }
      const box = el => { const e = el.getBoundingClientRect(); return { id: el.id, l: e.left, t: e.top, r: e.right, b: e.bottom, round: el.classList.contains('rb') }; };
      const els = ['pstat', 'topbar', 'mm', 'quest', 'joy', 'chat', 'tgt'].map(id => box(document.getElementById(id)));
      const btns = [...document.querySelectorAll('#acts .rb')].map(box);
      const all = [...els, ...btns], ov = [];
      const circ = a => ({ x: (a.l + a.r) / 2, y: (a.t + a.b) / 2, r: (a.r - a.l) / 2 });
      const hit = (a, b) => {
        if (a.round && b.round) { const A = circ(a), B = circ(b); return Math.hypot(A.x - B.x, A.y - B.y) < A.r + B.r - 0.5; }
        if (a.round || b.round) { const c = circ(a.round ? a : b), q = a.round ? b : a; const dx = Math.max(q.l - c.x, 0, c.x - q.r), dy = Math.max(q.t - c.y, 0, c.y - q.b); return Math.hypot(dx, dy) < c.r - 0.5; }
        return a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
      };
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (hit(all[i], all[j])) ov.push(all[i].id + '×' + all[j].id);
      const off = all.filter(a => a.l < -0.5 || a.t < -0.5 || a.r > innerWidth + 0.5 || a.b > innerHeight + 0.5).map(a => a.id);
      const bar = document.getElementById('topbar').getBoundingClientRect();
      const clipped = [...document.getElementById('topbar').children].filter(c => c.offsetParent && (c.getBoundingClientRect().left < bar.left - 1 || c.getBoundingClientRect().right > bar.right + 1)).map(c => c.id || c.className);
      const atk = document.getElementById('bAtk').getBoundingClientRect().width, sk = document.getElementById('sk1').getBoundingClientRect().width, sm = document.getElementById('bPot').getBoundingClientRect().width;
      const tgtShown = document.getElementById('tgt').getBoundingClientRect().width > 0;
      const skin = document.body.classList.contains('skin') && document.getElementById('pstat').classList.contains('art') && !document.getElementById('tgt').classList.contains('art') && document.getElementById('bAtk').classList.contains('skinned'); // target uses the compact HUD (not the big art frame)
      return { ov, off, clipped, atk, sk, sm, tgtShown, skin, wheel: document.getElementById('acts').getBoundingClientRect().width, W: innerWidth };
    });
    const ratio = r.atk / r.sk;
    R.ok(r.skin, `responsive ${n}: art skin active (status frame, wheel art; compact target HUD)`);
    R.ok(r.tgtShown && !r.ov.length && !r.off.length && !r.clipped.length && !pg.errs.length, `responsive ${n}: no overlap (incl. target panel) / off-screen / clipped bar / errors`, JSON.stringify({ tgt: r.tgtShown, ov: r.ov, off: r.off, clipped: r.clipped, errs: pg.errs }));
    R.ok(ratio >= 1.25 && ratio <= 1.5 && r.sm < r.sk && r.sk >= 36, `responsive ${n}: attack ${r.atk.toFixed(0)}px = ${ratio.toFixed(2)}× skill ${r.sk.toFixed(0)}px, small ${r.sm.toFixed(0)}px, wheel ${(r.wheel / r.W * 100).toFixed(0)}% of width`);
    await pg.screenshot({ path: require('path').join(require('os').tmpdir(), `lumira-${w}x${h}.png`) });
    await pg.context().close();
  }
}

async function phase1(b, srv, R) {
  const ph = await register(b, PHONE, srv, 'Ph');
  const cdp = await ph.context().newCDPSession(ph);
  const xy = () => ph.evaluate(() => document.getElementById('mmxy2').textContent.split(',').map(Number));
  const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const p0 = await xy();
  const zone = await ph.$eval('#joyzone', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width * 0.6, y: r.top + r.height * 0.5 }; });
  await tp('touchStart', [{ x: zone.x, y: zone.y, id: 1 }]);
  const jpos = await center(ph, '#joy');
  R.ok(Math.abs(jpos.x - zone.x) < 3 && Math.abs(jpos.y - zone.y) < 3, 'P1 floating joystick base jumps under the finger');
  for (let i = 1; i <= 5; i++) { await tp('touchMove', [{ x: zone.x + i * 8, y: zone.y, id: 1 }]); await ph.waitForTimeout(30); }
  await ph.waitForTimeout(1500); const p1 = await xy();
  R.ok(p1[0] > p0[0] + 2 && Math.abs(p1[1] - p0[1]) <= 1, `P1 touch joystick right moves the player east (${p0} -> ${p1})`);
  await tp('touchEnd', []); await ph.waitForTimeout(300);
  const jr = await ph.$eval('#joy', e => [e.style.left, e.style.top, e.classList.contains('act')]);
  R.ok(jr[0] === '' && jr[1] === '' && !jr[2], 'P1 joystick returns to rest position on release');
  await ph.waitForTimeout(900); const p2 = await xy(); await ph.waitForTimeout(600); const p3 = await xy();
  R.ok(p2[0] === p3[0] && p2[1] === p3[1], 'P1 player stops after release');
  await tp('touchStart', [{ x: zone.x, y: zone.y, id: 1 }]); for (let i = 1; i <= 5; i++) { await tp('touchMove', [{ x: zone.x - i * 7, y: zone.y - i * 7, id: 1 }]); await ph.waitForTimeout(30); }
  await ph.waitForTimeout(900); await tp('touchEnd', []); await ph.waitForTimeout(800); const p4 = await xy();
  R.ok(p4[0] < p3[0] && p4[1] < p3[1], `P1 diagonal joystick moves up-left (${p3} -> ${p4})`);
  for (const [btn, win] of [['#pport', 'wStat'], ['#bEquip', 'wEquip'], ['#bBag', 'wBag'], ['#bMap', 'wMap'], ['#mm', 'wMap'], ['#quest', 'wQuest'], ['#bMore', 'wMore'], ['#log', 'wChat'], ['#bSkill', 'wSkill']]) {
    await ph.tap(btn); await ph.waitForTimeout(150);
    R.ok(await ph.$eval('#' + win, e => e.style.display === 'block'), `P1 tap ${btn} opens ${win}`);
    await ph.evaluate(() => document.querySelectorAll('.win').forEach(w => { w.style.display = 'none'; }));
  }
  await ph.tap('#bMore'); await ph.waitForTimeout(100); const nMore = await ph.$$eval('#moregrid button', x => x.length);
  await ph.tap('#moregrid button:nth-child(7)'); await ph.waitForTimeout(100);
  R.ok(nMore >= 12 && await ph.$eval('#wParty', e => e.style.display === 'block'), 'P1 More menu opens Party');
  await ph.evaluate(() => document.querySelectorAll('.win').forEach(w => { w.style.display = 'none'; }));
  await ph.tap('#bMore'); await ph.tap('#moregrid button:nth-child(11)'); await ph.waitForTimeout(100);
  await ph.tap('#wSet .seg[data-k=zoom] button[data-v=far]'); await ph.tap('#wSet .seg[data-k=fps] button[data-v=true]'); await ph.waitForTimeout(700);
  const saved = await ph.evaluate(() => JSON.parse(localStorage.getItem('lmo_set')));
  R.ok(saved.zoom === 'far' && saved.fps === true && /FPS/.test(await ph.textContent('#fps')), 'P1 settings apply + persist, FPS counter shows');
  const dk = await register(b, DESK, srv, 'Dk');
  const d0 = await dk.evaluate(() => document.getElementById('mmxy2').textContent.split(',').map(Number));
  await dk.keyboard.down('s'); await dk.waitForTimeout(800); await dk.keyboard.up('s'); await dk.waitForTimeout(700);
  const d1 = await dk.evaluate(() => document.getElementById('mmxy2').textContent.split(',').map(Number));
  R.ok(d1[1] > d0[1] && d1[0] === d0[0], `P1 WASD still walks (${d0} -> ${d1})`);
  await dk.keyboard.press('Enter'); await dk.waitForTimeout(100);
  R.ok(await dk.$eval('#wChat', e => e.style.display === 'block') && await dk.evaluate(() => document.activeElement.id) === 'ci', 'P1 Enter opens chat with input focused');
  await dk.click('#chtabs button[data-ch=world]'); await dk.fill('#ci', 'hello world'); await dk.keyboard.press('Enter'); await ph.waitForTimeout(500);
  R.ok((await ph.textContent('#log')).includes('[โลก] ' + dk.name + ': hello world'), 'P1 world chat reaches the other player');
  await dk.waitForTimeout(800); await dk.click('#chtabs button[data-ch=whisper]'); await dk.fill('#wto', ph.name); await dk.fill('#ci', 'psst'); await dk.click('#cs'); await ph.waitForTimeout(500);
  R.ok((await ph.textContent('#log')).includes('[กระซิบ] จาก ' + dk.name + ': psst'), 'P1 whisper reaches the target');
  R.ok((await dk.textContent('#chlist')).includes('ถึง ' + ph.name + ': psst'), 'P1 whisper echoed to sender');
  await dk.waitForTimeout(800); await dk.click('#chtabs button[data-ch=local]'); await dk.fill('#ci', 'local hi'); await dk.keyboard.press('Enter'); await ph.waitForTimeout(500);
  R.ok((await ph.textContent('#log')).includes(dk.name + ': local hi'), 'P1 local chat still works');
  await dk.click('#chtabs button[data-ch=party]'); R.ok(await dk.$eval('#ci', e => e.disabled), 'P1 party tab input disabled (no party yet)');
  R.ok(!ph.errs.length && !dk.errs.length, 'P1 no page errors', JSON.stringify([...ph.errs, ...dk.errs]));
  await ph.context().close(); await dk.context().close();
}

async function phase2Mobile(b, srv, R) {
  const pg = await loginAs(b, PHONE, srv, 'u_mob');
  const cdp = await pg.context().newCDPSession(pg);
  const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  R.ok(await pg.$$eval('#acts .rb.sk', x => x.length) === 6 && await pg.$eval('#sk1', e => !e.classList.contains('empty') && !!e.querySelector('.pi').style.backgroundImage), 'C1 combat wheel has 6 skill slots, slot 1 shows its icon');
  R.ok(await pg.$eval('#sk1 .key', e => e.textContent) === '1' && await pg.$eval('#sk1 .ssp', e => e.textContent) === '8' && /Lv/.test(await pg.$eval('#sk1 .slv', e => e.textContent)), 'C2 slot shows shortcut number, SP cost and skill level');
  R.ok(await pg.$eval('#sk3', e => e.classList.contains('empty')), 'C3 unassigned slot is clearly empty');
  // 1. touch target
  let pt = await findMob(pg, 'd > 4');
  const diag = [];
  for (let i = 0; i < 3 && pt; i++) {
    await tapMob(pg, pt, true); if (await pg.evaluate(() => selected) === pt.id) break;
    diag.push(await pg.evaluate(([pt]) => ({ pt, sel: selected, sent: window.__sent.slice(-3), now: (() => { const e = ents.get(pt.id); if (!e) return 'gone'; const [ox, oy] = viewOrigin(); return [((e.x + 0.5) * TP + ox) * Z / DPR, ((e.y + 0.5) * TP + 12 - 18 + oy) * Z / DPR, e.moving]; })(), cam: [cam.x, cam.y], pick: pickAt(pt.x, pt.y).best, joy: !!joy, dpr: [DPR, Z, innerWidth, cv.getBoundingClientRect().width], ev: window.__pd }), [pt]));
    await pg.evaluate(() => { clearTarget(); closeWins(); window.__sent.length = 0; }); pt = await findMob(pg, 'd > 4');
  }
  if (pt) {
    R.ok(await pg.evaluate(() => selected) === pt.id, 'T1 tap a monster selects it (touch)', JSON.stringify(diag));
    const panel = await pg.evaluate(() => !ents.get(selected) ? {} : ({ on: document.getElementById('tgt').classList.contains('on'), name: document.getElementById('tgName').textContent, lv: document.getElementById('tgLv').textContent, hp: document.getElementById('tgHpT').textContent, st: document.getElementById('tgSt').textContent, want: MOBN[ents.get(selected).type].n }));
    R.ok(panel.on && panel.name === panel.want && /^Lv \d+/.test(panel.lv) && /^\d+%$/.test(panel.hp) && panel.st.length > 0, 'T2 target panel: name, level, HP and %, status', JSON.stringify(panel));
    R.ok(!(await sent(pg, "m.t === 'attack'")).length, 'T3 first tap only targets (no attack sent)');
    // out of range: attack button refuses with feedback, no packet
    const [k] = await mark(pg); await pg.tap('#bAtk'); await pg.waitForTimeout(150);
    R.ok(/นอกระยะ/.test(await pg.textContent('#ctoast')) && !(await sentSince(pg, k, "m.t === 'attack'")).length, 'T4 Attack with target out of range -> "Out of range", nothing sent');
    // skill out of range
    await pg.waitForTimeout(1200);
    const dist = await pg.evaluate(() => { const e = ents.get(selected), m = ents.get(myId); return e ? Math.max(Math.abs(e.tx - m.tx), Math.abs(e.ty - m.ty)) : -1; });
    const [k2] = await mark(pg); await pg.tap('#sk1'); await pg.waitForTimeout(150);
    if (dist > 2) R.ok(/นอกระยะ/.test(await pg.textContent('#ctoast')) && !(await sentSince(pg, k2, "m.t === 'cast'")).length, `T5 skill with target out of range (${dist.toFixed(1)} tiles) -> "Out of range", nothing sent`);
    else R.skipped('T5 skill out of range', `target wandered into range (${dist})`);
  } else R.skipped('touch targeting', 'no visible monster');
  // target button: cycles through nearby monsters, best first
  const ids = []; for (let i = 0; i < 4; i++) { await pg.tap('#bTgt'); await pg.waitForTimeout(120); ids.push(await pg.evaluate(() => selected)); }
  const nearby = await pg.evaluate(() => targetList().length);
  R.ok(ids.every(Boolean) && new Set(ids).size >= Math.min(2, nearby), `T6 Target button selects and cycles (${new Set(ids).size} distinct of ${nearby} nearby)`);
  R.ok(await pg.evaluate(() => { const l = targetList(); return l.every(id => ents.get(id).kind === 'm' && ents.get(id).hp > 0); }), 'T7 target list contains only live monsters (no NPC/players)');
  await pg.tap('#tgX'); R.ok(await pg.evaluate(() => selected) === 0 && !(await pg.$eval('#tgt', e => e.classList.contains('on'))), 'T8 ✕ on the target panel clears the target');
  // UI tap over the world never moves the player; joystick drag over a monster never targets it
  let [k] = await mark(pg); await pg.tap('#bTgt'); await pg.waitForTimeout(150);
  R.ok(!(await sentSince(pg, k, "m.t === 'move'")).length, 'T9 tapping a HUD button does not leak a tap to the map');
  await pg.tap('#tgX'); pt = await findMob(pg);
  if (pt) {
    const zone = await pg.$eval('#joyzone', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 }; });
    await tp('touchStart', [{ x: zone.x, y: zone.y, id: 1 }]);
    for (let i = 1; i <= 8; i++) { await tp('touchMove', [{ x: zone.x + (pt.x - zone.x) * i / 8, y: zone.y + (pt.y - zone.y) * i / 8, id: 1 }]); await pg.waitForTimeout(25); }
    await tp('touchEnd', []); await pg.waitForTimeout(400);
    R.ok(await pg.evaluate(() => selected) === 0, 'T10 dragging the joystick across a monster does not target it');
  }
  // engage: second tap = walk in and attack; then wheel actions in range
  const tgt = await engage(pg, true, "e.type === 'leafling' && d < 9") || await engage(pg, true, 'd < 9');
  R.ok(!!tgt, 'T11 tap the selected monster again -> walks in and attacks (old behaviour kept)');
  if (tgt) {
    await pg.waitForTimeout(400);
    [k] = await mark(pg); await pg.tap('#bAtk'); await pg.waitForTimeout(200);
    R.ok((await sentSince(pg, k, "m.t === 'attack' && m.n === 1")).length === 1, 'T12 Attack button in range sends a server-validated attack');
    // skill in range -> server cooldown -> overlay with countdown -> clears
    await pg.waitForTimeout(500); [k, ] = await mark(pg); const [, r0] = await mark(pg);
    await pg.tap('#sk1');
    const gotCd = await waitFor(pg, r0 => window.__recv.slice(r0).some(m => m.t === 'cd' && m.s === 'bash'), r0, 3000);
    await pg.waitForTimeout(120);
    const ov = await pg.evaluate(() => ({ cd: document.getElementById('sk1').classList.contains('cd'), t: document.querySelector('#sk1 .cdt').textContent, p: getComputedStyle(document.getElementById('sk1')).getPropertyValue('--p') }));
    R.ok(gotCd && ov.cd && /^\d\.\d$/.test(ov.t) && +ov.p > 0, `S1 skill cast -> server cooldown -> dark overlay + countdown "${ov.t}"`);
    // spam while cooling down: client holds, server would refuse anyway
    [k] = await mark(pg); const spam = await pg.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 10; i++) document.getElementById('sk1').dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })); return performance.now() - t0; });
    R.ok((await sentSince(pg, k, "m.t === 'cast'")).length === 0, `S2 spamming a cooling-down skill (10 presses in ${spam.toFixed(0)}ms) sends nothing`);
    await pg.waitForTimeout(1500);
    R.ok(!(await pg.$eval('#sk1', e => e.classList.contains('cd'))), 'S3 overlay disappears when the skill is ready');
    // attack spam: hits stay limited by attack speed
    const [, r1] = await mark(pg); for (let i = 0; i < 10; i++) await pg.tap('#bAtk');
    await pg.waitForTimeout(1000);
    const hits = (await recvSince(pg, r1, "m.t === 'fx' && m.k === 'hit' && m.from === myId && !m.skill")).length;
    R.ok(hits <= 2, `S4 attack spam (10 taps) -> ${hits} swing(s) in 1s`);
    // numbers live 1s, so check right when the next hit (mine or the monster's) arrives
    const shown = await pg.evaluate(() => new Promise(res => {
      const n0 = window.__recv.length, t0 = performance.now();
      (function poll() { const h = window.__recv.slice(n0).find(m => m.t === 'fx' && m.k === 'hit'); if (h) return res(fx.some(f => f.k === 'num' && f.id === h.to)); if (performance.now() - t0 > 8000) return res(null); setTimeout(poll, 30); })();
    }));
    if (shown === null) R.skipped('S5 floating damage numbers', 'no hit within 8s'); else R.ok(shown, 'S5 floating damage number appears for a real server hit');
    // joystick + attack / skill at the same time (two fingers)
    const zone = await pg.$eval('#joyzone', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 }; });
    for (const [btn, what] of [['#bAtk', 'attack'], ['#sk2', 'skill']]) {
      const bc = await center(pg, btn); [k] = await mark(pg); const toast0 = await pg.evaluate(() => document.getElementById('ctoast').className);
      await tp('touchStart', [{ x: zone.x, y: zone.y, id: 1 }]);
      for (let i = 1; i <= 4; i++) { await tp('touchMove', [{ x: zone.x - i * 10, y: zone.y, id: 1 }]); await pg.waitForTimeout(40); }
      await tp('touchStart', [{ x: zone.x - 40, y: zone.y, id: 1 }, { x: bc.x, y: bc.y, id: 2 }]);
      await tp('touchEnd', [{ x: zone.x - 40, y: zone.y, id: 1 }]);
      await pg.waitForTimeout(300); await tp('touchEnd', []); await pg.waitForTimeout(300);
      const moves = (await sentSince(pg, k, "m.t === 'move'")).length, acted = (await sentSince(pg, k, what === 'attack' ? "m.t === 'attack'" : "m.t === 'cast'")).length;
      const toasted = await pg.evaluate(() => document.getElementById('ctoast').classList.contains('on'));
      R.ok(moves > 0 && (acted > 0 || toasted) && !pg.errs.length, `C${what === 'attack' ? 4 : 5} joystick + ${what} together: both inputs handled (moves=${moves}, ${what}=${acted || 'feedback'})`);
    }
    // keep fighting until it dies -> target cleared
    await pg.waitForTimeout(300); const id = await pg.evaluate(() => selected) || tgt;
    if (await pg.evaluate(() => selected) !== id) await pg.evaluate(id => setTarget(id), id);
    const p = await mobPoint(pg, `true`); if (p && p.id === id) await tapMob(pg, p, true);
    else await pg.evaluate(id => send({ t: 'attack', id }), id);
    const dead = await waitFor(pg, id => window.__recv.some(m => m.t === 'fx' && m.k === 'die' && m.id === id), id, 40000);
    await pg.waitForTimeout(300);
    R.ok(dead && await pg.evaluate(id => selected !== id, id) && !(await pg.$eval('#tgt', e => e.classList.contains('on'))), 'T13 monster dies -> target and panel cleared');
  }
  // floating combat text kinds + cap (render-path check with server-shaped messages)
  const ft = await pg.evaluate(() => {
    const e = ents.get(myId); const nums = () => fx.filter(f => f.k === 'num').map(f => f.v);
    fx.length = 0;
    onFx({ k: 'hit', from: 0, to: myId, dmg: 245, crit: true }); onFx({ k: 'hit', from: 0, to: myId, dmg: 0 }); onFx({ k: 'heal', id: myId, v: 120 }); onFx({ k: 'heal', id: myId, sp: 30 });
    const kinds = nums();
    const stacks = fx.filter(f => f.k === 'num').map(f => f.stack);
    for (let i = 0; i < 200; i++) onFx({ k: 'hit', from: 0, to: myId, dmg: i + 1 });
    return { kinds, stacks, n: fx.filter(f => f.k === 'num').length, pool: typeof fxPool !== 'undefined' };
  });
  R.ok(ft.kinds.join('|') === 'CRIT 245|MISS|+120|+30 SP', 'F1 floating text: "CRIT 245", "MISS", "+120", "+30 SP"', ft.kinds.join('|'));
  R.ok(ft.stacks.join() === '0,1,2,3', 'F2 numbers landing together are stacked, not drawn on top of each other', ft.stacks.join());
  R.ok(ft.n <= 40 && ft.pool, `F3 floating numbers capped (${ft.n} after 200 hits) and pooled`);
  // potion button
  const q0 = +await pg.textContent('#potq'); await pg.tap('#bPot'); await pg.waitForTimeout(500);
  R.ok(+await pg.textContent('#potq') === q0 - 1, `P1 potion button uses one potion (${q0} -> ${await pg.textContent('#potq')})`);
  // skills window: tap skill -> "set as slot" -> slot 3; saved by the server
  await pg.tap('#sk3'); await pg.waitForTimeout(150);
  R.ok(await pg.$eval('#wSkill', e => e.style.display === 'block') && /ช่อง 3/.test(await pg.textContent('#skillbody .note')), 'A1 tapping an empty slot opens the skills window for that slot');
  await pg.tap('#tgX').catch(() => { }); await pg.evaluate(() => closeWins());
  // Skills may have folded into "More" on this phone (wide gold number) - open it the way a player would
  if (await pg.$eval('#bSkill', e => !!e.offsetParent)) await pg.tap('#bSkill'); else { await pg.tap('#bMore'); await pg.tap('#moregrid button:nth-child(2)'); }
  await pg.waitForTimeout(150);
  const items = await pg.$$('#skillbody .skli'); await items[2].tap(); await pg.waitForTimeout(150); // bolt
  await pg.tap('#skillbody .slotpick button:nth-child(4)'); await pg.waitForTimeout(400);           // "3"
  R.ok(await pg.evaluate(() => me.hot[2]) === 'bolt' && !(await pg.$eval('#sk3', e => e.classList.contains('empty'))), 'A2 tap skill -> "ตั้งเป็นช่อง" 3 -> slot 3 filled');
  R.ok((await recv(pg, "m.t === 'me' && m.c.hot && m.c.hot[2] === 'bolt'")).length > 0, 'A3 hotbar change confirmed by the server (saved on the character)');
  R.ok(!pg.errs.length, 'C6 no page errors on mobile', JSON.stringify(pg.errs));
  await pg.context().close();
}

async function phase2Desktop(b, srv, R) {
  const pg = await loginAs(b, DESK, srv, 'u_desk');
  const pt = await findMob(pg, 'd > 1.5', 15000);
  if (pt) { await tapMob(pg, pt, false); R.ok(await pg.evaluate(() => selected) === pt.id, 'D1 mouse click selects a monster'); }
  else R.skipped('mouse click select', 'no visible monster');
  // cycling needs at least two monsters in range; monsters wander, so wait for that instead of assuming it
  const two = await waitFor(pg, () => targetList().length >= 2, null, 20000);
  const seq = []; for (let i = 0; i < 3; i++) { await pg.keyboard.press('Tab'); await pg.waitForTimeout(80); seq.push(await pg.evaluate(() => selected)); }
  // Shift+Tab steps back from the current target; if that monster wandered out of range (or died) in between,
  // there is nothing to step back from and the cycle restarts at the head of the list — that's correct too
  await pg.keyboard.press('Shift+Tab'); const [back, gone] = await pg.evaluate(cur => [selected, !targetList().includes(cur)], seq[2]);
  if (two) R.ok(seq.every(Boolean) && new Set(seq).size > 1 && (back === seq[1] || gone), `D2 Tab cycles targets, Shift+Tab goes back (${seq.join(',')} <- ${back}${gone ? ', last target left range' : ''})`);
  else R.skipped('D2 Tab cycling', 'fewer than 2 monsters in range for 20s');
  await pg.keyboard.press('i'); await pg.waitForTimeout(100); await pg.keyboard.press('Escape');
  R.ok(await pg.$eval('#wBag', e => e.style.display !== 'block') && await pg.evaluate(() => selected) !== 0, 'D3 Esc closes an open window first (target kept)');
  await pg.keyboard.press('Escape'); R.ok(await pg.evaluate(() => selected) === 0, 'D4 Esc again clears the target');
  // Space = attack (out of range -> feedback), 2 = skill slot 2 (First Aid, self)
  await pg.keyboard.press('Tab'); let [k] = await mark(pg); await pg.keyboard.press(' '); await pg.waitForTimeout(150);
  R.ok((await sentSince(pg, k, "m.t === 'attack'")).length > 0 || /นอกระยะ/.test(await pg.textContent('#ctoast')), 'D5 Space triggers the attack button');
  [k] = await mark(pg); await pg.keyboard.press('2'); await pg.waitForTimeout(300);
  R.ok((await sentSince(pg, k, "m.t === 'cast' && m.s === 'heal'")).length === 1, 'D6 key 2 casts the skill in slot 2');
  // chat focused: game keys do nothing
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(100); [k] = await mark(pg);
  for (const key of ['1', '2', '3', ' ', 'w', 'a', 'Tab', 'q', 'r']) await pg.keyboard.press(key);
  await pg.waitForTimeout(400);
  const leak = await sentSince(pg, k, "['cast','attack','move','use'].includes(m.t)");
  R.ok(!leak.length && /123/.test(await pg.inputValue('#ci')), 'D7 typing in chat never fires skills/attack/movement', JSON.stringify(leak));
  await pg.keyboard.press('Escape'); await pg.evaluate(() => { document.getElementById('ci').value = ''; closeWins(); });
  // desktop drag & drop: skill from the window onto wheel slot 4
  await pg.keyboard.press('k'); await pg.waitForTimeout(150);
  await pg.dragAndDrop('#skillbody .skli:nth-of-type(6)', '#sk4').catch(() => { });
  await pg.waitForTimeout(400);
  R.ok(await pg.evaluate(() => me.hot[3]) !== null && !(await pg.$eval('#sk4', e => e.classList.contains('empty'))), `D8 drag a skill from the window onto slot 4 (${await pg.evaluate(() => me.hot[3])})`);
  await pg.evaluate(() => closeWins());
  // map change while targeting
  await pg.keyboard.press('Tab'); const had = await pg.evaluate(() => selected);
  await pg.evaluate(() => send({ t: 'move', x: 25, y: 0 })); // up the road to the town portal
  const changed = await waitFor(pg, () => map && map.id === 'solkara', null, 12000); await pg.waitForTimeout(300);
  R.ok(!!had && changed && await pg.evaluate(() => selected) === 0 && !(await pg.$eval('#tgt', e => e.classList.contains('on'))), 'D9 changing map clears the target');
  R.ok(!pg.errs.length, 'D10 no page errors on desktop', JSON.stringify(pg.errs));
  await pg.context().close();
}

async function phase2States(b, srv, R) {
  // SP not enough
  const ns = await loginAs(b, PHONE, srv, 'u_nosp');
  let [k] = await ns.evaluate(() => [window.__sent.length]); await ns.tap('#sk2'); await ns.waitForTimeout(150);
  R.ok(/SP ไม่เพียงพอ/.test(await ns.textContent('#ctoast')) && await ns.$eval('#sk2', e => e.classList.contains('nosp')) && !(await sentSince(ns, k, "m.t === 'cast'")).length, 'E1 SP too low -> "SP ไม่เพียงพอ", slot marked unavailable, nothing sent');
  const shook = await ns.$eval('#sk2', e => e.classList.contains('shake'));
  R.ok(shook, 'E2 slot gives a small shake as feedback');
  await ns.context().close();
  // no potions
  const np = await loginAs(b, PHONE, srv, 'u_nopot');
  R.ok(await np.textContent('#potq') === '0' && await np.$eval('#bPot', e => e.disabled && e.classList.contains('dis')), 'E3 no potions -> shows 0 and is disabled');
  await np.context().close();
  // death mid-combat
  const fr = await loginAs(b, PHONE, srv, 'u_frag');
  // walk into the nearest leafling (it hits back; 1 HP doesn't last). Retarget if it dies first.
  let died = false;
  for (let i = 0; i < 4 && !died; i++) {
    await fr.evaluate(() => { const m = ents.get(myId), l = [...ents].filter(([, e]) => e.kind === 'm' && e.type !== 'jellop').sort((a, b) => Math.hypot(a[1].tx - m.tx, a[1].ty - m.ty) - Math.hypot(b[1].tx - m.tx, b[1].ty - m.ty)); if (l.length) { setTarget(l[0][0]); send({ t: 'attack', id: l[0][0] }); } });
    died = await waitFor(fr, () => document.body.classList.contains('cs-dead'), null, 20000);
  }
  if (died) {
    [k] = await fr.evaluate(() => [window.__sent.length]);
    await fr.evaluate(() => { useSlot(0); useSlot(1); doAttack(); });
    await fr.waitForTimeout(300);
    R.ok(await fr.evaluate(() => selected) === 0 && !(await sentSince(fr, k, "m.t === 'cast' || m.t === 'attack'")).length && await fr.$eval('#dead', e => e.style.display === 'block'), 'E4 player dies mid-combat -> target cleared, wheel disabled, no actions sent');
  } else R.skipped('death mid-combat', 'did not die in time');
  await fr.context().close();
}

// final mobile polish: quest tracker fold, joystick weight, narrow top bar, mini chat, EXP text, safe area
async function phaseA(b, srv, R) {
  const pg = await register(b, { viewport: { width: 360, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, srv, 'Pa');
  const qh = () => pg.evaluate(() => document.getElementById('quest').getBoundingClientRect().height);
  const h0 = await qh();
  await pg.tap('#qtog'); await pg.waitForTimeout(150);
  const h1 = await qh(), win = await pg.$eval('#wQuest', e => e.style.display);
  const col = await pg.evaluate(() => ({ c: document.getElementById('quest').classList.contains('col'), t: document.getElementById('qtitle').textContent, p: document.getElementById('qprog').textContent, s: JSON.parse(localStorage.getItem('lmo_set')).qCol }));
  R.ok(col.c && col.s === true && h1 < h0 * 0.75 && win !== 'block' && col.t && /\d+\/\d+/.test(col.p), `A-UI quest tracker folds to icon + short name + progress (${h0.toFixed(0)}px -> ${h1.toFixed(0)}px, "${col.t}" ${col.p}) and remembers it`);
  await pg.reload(); await pg.fill('#u', 'r' + pg.name.toLowerCase()); await pg.fill('#p', 'pass1234'); await pg.click('#go'); await H.uiEnter(pg);
  await waitFor(pg, () => document.getElementById('hud').style.display === 'block'); await pg.waitForTimeout(600);
  R.ok(await pg.evaluate(() => document.getElementById('quest').classList.contains('col')), 'A-UI folded quest tracker stays folded after reload');
  await pg.tap('#quest'); await pg.waitForTimeout(150);
  R.ok(!await pg.evaluate(() => document.getElementById('quest').classList.contains('col')) && await pg.$eval('#wQuest', e => e.style.display) !== 'block', 'A-UI tapping a folded tracker unfolds it (no window)');
  await pg.tap('#qt'); await pg.waitForTimeout(150);
  R.ok(await pg.$eval('#wQuest', e => e.style.display) === 'block', 'A-UI tapping the expanded tracker body opens the quest log');
  await pg.evaluate(() => document.querySelectorAll('.win').forEach(w => { w.style.display = 'none'; }));
  const j = await pg.evaluate(() => { const j = document.getElementById('joy'), z = document.getElementById('joyzone'); return { op: +getComputedStyle(j).opacity, w: j.getBoundingClientRect().width, zw: z.getBoundingClientRect().width, rem: parseFloat(getComputedStyle(document.documentElement).fontSize) }; });
  R.ok(j.op >= 0.35 && j.op <= 0.5 && j.zw > j.w * 1.5, `A-UI joystick idle opacity ${j.op}, visual ${j.w.toFixed(0)}px inside a ${j.zw.toFixed(0)}px touch zone`);
  const tb = await pg.evaluate(() => [...document.querySelectorAll('#topbar .tb')].filter(e => e.offsetParent).map(e => e.id));
  R.ok(tb.join() === 'bSkill,bEquip,bBag,bQuest,bMap,bMore', 'A-UI narrow top bar = Skills, Equipment, Bag, Quest, Map, More', tb.join());
  await pg.tap('#bMore'); await pg.waitForTimeout(100);
  const more = await pg.evaluate(() => [...document.querySelectorAll('#moregrid button')].map(b => b.textContent).join('|'));
  R.ok(['ปาร์ตี้', 'กิลด์', 'ออโต้', 'ตั้งค่า'].every(t => more.includes(t)), 'A-UI Party / Guild / Auto / Settings reachable from More');
  await pg.evaluate(() => document.querySelectorAll('.win').forEach(w => { w.style.display = 'none'; }));
  await pg.evaluate(() => { for (let i = 0; i < 6; i++) addChat('sys', 'line ' + i); });
  const lg = await pg.evaluate(() => [...document.querySelectorAll('#log div')].map(d => +getComputedStyle(d).opacity));
  R.ok(lg.length === 3 && lg[0] < lg[2], `A-UI mini chat shows 3 newest lines, older ones faded (${lg.join(', ')})`);
  const xp = await pg.evaluate(() => { me.exp = 7; me.next = 28; updHud(); return [document.getElementById('xpt').textContent, document.getElementById('hX2') ? document.getElementById('hX2').textContent : document.getElementById('hX').textContent, document.querySelector('#pstat .bar.xp').getBoundingClientRect().height, document.querySelector('#pstat .bar.hp').getBoundingClientRect().height]; });
  R.ok(xp[0] === '7 / 28' && xp[1] === '25.0%' && xp[2] <= xp[3], `A-UI EXP bar shows "${xp[0]}" + ${xp[1]}, no taller than HP (${xp[2].toFixed(1)} <= ${xp[3].toFixed(1)}px)`);
  const sb = await pg.evaluate(() => { const r = document.getElementById('acts').getBoundingClientRect(); return innerHeight - r.bottom; });
  R.ok(sb >= 10, `A-UI combat wheel keeps ${sb.toFixed(0)}px off the bottom edge (safe-area floor)`);
  R.ok(!pg.errs.length, 'A-UI no page errors', JSON.stringify(pg.errs));
  await pg.context().close();
}

// audio system: unlock on first gesture, map music switching, boss override + resume, limits, missing files, settings
async function audioTests(b, srv, R) {
  const ctx = await b.newContext({ ...PHONE }); await ctx.addInitScript(SPY);
  const pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await pg.goto(srv.http + '/');
  const S = () => pg.evaluate(() => AUDIO.state());
  let st = await S();
  R.ok(st.supported && !st.unlocked && st.ctx === 'none', 'AUDIO no AudioContext / no sound before the first user gesture (no autoplay error)', JSON.stringify(st));
  const d = await pg.evaluate(() => AUDIO.settings());
  R.ok(d.master === 80 && d.music === 60 && d.sfx === 80 && d.ambient === 50 && !d.muted, 'AUDIO default volumes: master 80 / music 60 / sfx 80 / ambient 50');
  await pg.click('#tReg'); const name = 'Snd' + (Date.now() % 1e4);
  await pg.fill('#u', 'r' + name.toLowerCase()); await pg.fill('#p', 'pass1234'); await pg.fill('#cn', name); await pg.tap('#go');
  await waitFor(pg, () => document.getElementById('hud').style.display === 'block'); await pg.waitForTimeout(1500);
  st = await S();
  R.ok(st.unlocked && st.ctx === 'running' && st.playing === 'bgm_lumira_village' && st.ambient === 'amb_village', 'AUDIO unlocks on the first tap, then village music + ambient start', JSON.stringify({ u: st.unlocked, c: st.ctx, p: st.playing, a: st.ambient }));
  const t0 = st.track, n0 = st.tracks;
  await pg.evaluate(() => AUDIO.playBGM('bgm_lumira_village')); await pg.waitForTimeout(300); st = await S();
  R.ok(st.track === t0 && st.tracks === n0, 'AUDIO same BGM again does not restart the track');
  // real map change through the east portal
  await pg.evaluate(() => send({ t: 'move', x: 49, y: 20 }));
  const changed = await waitFor(pg, () => map && map.id === 'beginner_meadow', null, 12000); await pg.waitForTimeout(1600); st = await S();
  R.ok(changed && st.playing === 'bgm_beginner_meadow' && st.ambient === 'amb_meadow' && st.played.portal_enter >= 1, 'AUDIO map change crossfades to the new map music + ambient (portal sound plays)', JSON.stringify({ p: st.playing, a: st.ambient, pe: st.played.portal_enter }));
  const mapTrack = st.track;
  await pg.evaluate(() => AUDIO.bossEnter('bgm_boss_thornwood')); await pg.waitForTimeout(1500); st = await S();
  R.ok(st.playing === 'bgm_boss_thornwood' && st.parked.includes('bgm_beginner_meadow'), 'AUDIO boss encounter overrides the map music (map track kept, paused)', JSON.stringify({ p: st.playing, parked: st.parked }));
  await pg.evaluate(() => AUDIO.bossLeave()); await pg.waitForTimeout(2000); st = await S();
  R.ok(st.playing === 'bgm_beginner_meadow' && st.track === mapTrack && !st.overrides.length, 'AUDIO after the boss the map music resumes (same track, not restarted)', JSON.stringify({ p: st.playing, t: st.track, mt: mapTrack }));
  // limits
  const lim = await pg.evaluate(() => {
    const d0 = AUDIO.state().dropped.cooldown; for (let i = 0; i < 50; i++) AUDIO.playSFX('hit_critical');
    const ids = Object.keys(AUDIO_REG.SFX).filter(id => !AUDIO_REG.SFX[id].loop); let peak = 0; for (const id of ids) { AUDIO.playSFX(id); peak = Math.max(peak, AUDIO.state().voices); }
    let mon = 0; for (const f of AUDIO_REG.FAMILIES) AUDIO.playSFX(`mon_${f}_death`, { x: 0, y: 0 });
    return { cd: AUDIO.state().dropped.cooldown - d0, peak, max: AUDIO.LIMIT.sfx };
  });
  R.ok(lim.cd >= 49 && lim.peak <= lim.max, `AUDIO SFX rate limits: 50 rapid repeats -> ${50 - lim.cd} played; ${lim.peak} voices at most (limit ${lim.max})`);
  // missing files fall back to the placeholder
  const miss = await pg.evaluate(async () => {
    AUDIO_REG.SFX.test_missing = Object.assign({}, AUDIO_REG.SFX.ui_click, { id: 'test_missing', file: 'sfx/ui/does_not_exist.mp3', cd: 0 });
    AUDIO_REG.MUSIC.test_bgm = Object.assign({}, AUDIO_REG.MUSIC.bgm_greenwood, { id: 'test_bgm', file: 'music/town/does_not_exist.mp3' });
    AUDIO.preload(['test_missing']); AUDIO.playBGM('test_bgm'); await new Promise(r => setTimeout(r, 1800));
    const ok = AUDIO.playSFX('test_missing'), s = AUDIO.state(); AUDIO.playBGM(map.bgm); return { ok, missing: s.missing, playing: s.playing };
  });
  R.ok(miss.ok && miss.missing.includes('test_missing') && miss.missing.includes('test_bgm') && miss.playing === 'test_bgm', 'AUDIO missing audio files fall back to the placeholder (no error, still plays)', JSON.stringify(miss));
  // settings window: sliders + mute, saved and restored after reload
  await pg.evaluate(() => { document.getElementById('bSet').click(); });
  await pg.waitForTimeout(200);
  await pg.evaluate(() => { const set = (k, v) => { const r = document.querySelector(`#sndset input[data-k=${k}]`); r.value = v; r.dispatchEvent(new Event('input')); }; set('master', 55); set('music', 30); set('sfx', 70); set('ambient', 20); });
  await pg.tap('#sndmute'); await pg.waitForTimeout(200);
  const s1 = await pg.evaluate(() => AUDIO.settings());
  R.ok(s1.master === 55 && s1.music === 30 && s1.sfx === 70 && s1.ambient === 20 && s1.muted, 'AUDIO settings sliders + mute change the volumes');
  await pg.reload(); await pg.waitForTimeout(500);
  const s2 = await pg.evaluate(() => { document.getElementById('hud').style.display = 'block'; document.getElementById('bSet').click(); return { s: AUDIO.settings(), ui: document.querySelector('#sndset input[data-k=music]').value, mute: document.getElementById('sndmute').textContent }; });
  R.ok(s2.s.master === 55 && s2.s.music === 30 && s2.s.sfx === 70 && s2.s.ambient === 20 && s2.s.muted && s2.ui === '30' && /เปิดเสียง/.test(s2.mute), 'AUDIO volume / mute settings persist across reload', JSON.stringify(s2));
  await pg.evaluate(() => { AUDIO.unmute(); for (const k of ['master', 'music', 'sfx', 'ambient']) AUDIO['set' + { master: 'Master', music: 'Music', sfx: 'SFX', ambient: 'Ambient' }[k] + 'Volume'](AUDIO.defaults()[k]); });
  R.ok(!pg.errs.length, 'AUDIO no page errors', JSON.stringify(pg.errs));
  await ctx.close();
  // background tab: suspend / resume without duplicating music
  const p2 = await register(b, PHONE, srv, 'Bg'); await p2.tap('#mm'); await p2.waitForTimeout(800);
  const bg = await p2.evaluate(async () => {
    const before = AUDIO.state(); const hide = v => { Object.defineProperty(document, 'hidden', { value: v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); };
    hide(true); await new Promise(r => setTimeout(r, 400)); const mid = AUDIO.state(); hide(false); await new Promise(r => setTimeout(r, 600)); const after = AUDIO.state();
    return { b: [before.ctx, before.track, before.tracks], m: mid.ctx, a: [after.ctx, after.track, after.tracks] };
  });
  R.ok(bg.m === 'suspended' && bg.a[0] === 'running' && bg.a[1] === bg.b[1] && bg.a[2] === bg.b[2], 'AUDIO background tab suspends audio; returning resumes the same music (no second copy)', JSON.stringify(bg));
  await p2.context().close();
}

async function run(srv, R) {
  const pw = loadPlaywright();
  if (!pw) { R.skipped('browser suite', 'Playwright not installed (npm i -D playwright)'); return; }
  const b = await pw.chromium.launch();
  try {
    const only = process.env.UI_ONLY; // e.g. UI_ONLY=phase2Mobile to repeat one section
    const S = [['responsive (Phase 1 + 2 layout)', responsive], ['Phase 1 HUD / joystick / chat', phase1], ['Phase 2 mobile touch', phase2Mobile], ['Phase 2 desktop keyboard/mouse', phase2Desktop], ['Phase 2 SP / potion / death states', phase2States], ['Phase A final mobile polish', phaseA], ['Audio system', audioTests]];
    for (const [name, fn] of S) if (!only || only === fn.name) { console.log('-- ' + name); await fn(b, srv, R); }
  } finally { await b.close(); }
}

module.exports = { SEEDS, run };
