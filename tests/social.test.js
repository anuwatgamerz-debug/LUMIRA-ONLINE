'use strict';
// Social systems: rankings, player info, party (invite / accept / chat / leader rules / EXP share / leave),
// guilds (create / invite / chat / saved / kick), trade (request, offers, lock, confirm, swap, cancel, distance),
// and the browser side (tap a player -> menu, rank board).
const H = require('./harness');
const { sleep, login, me } = H;
function loadPlaywright() {
  try { return require('playwright'); } catch (e) { }
  try { const root = require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); return require(root + '/playwright'); } catch (e) { }
  return null;
}
const SPOT = { map: 'woods', y: 8, lv: 15, cls: 'vanguard', eq: { wpn: 22, arm: 31 }, st: { str: 40, agi: 20, vit: 20, int: 5, dex: 30, luk: 5 } };
const SEEDS = {
  so_a: H.mkChar('SoAlpha', { ...SPOT, x: 22, zeny: 9000, inv: [{ id: 1, q: 5 }, { id: 151, q: 1 }], kills: 120, bkills: 3 }),
  so_b: H.mkChar('SoBravo', { ...SPOT, x: 24, zeny: 500, inv: [{ id: 10, q: 4 }], kills: 40 }),
  so_c: H.mkChar('SoCharlie', { ...SPOT, map: 'lumira', x: 22, y: 20, lv: 3 }),
  so_ui: H.mkChar('SoUi', { ...SPOT, map: 'lumira', x: 24, y: 20 }),
  so_ui2: H.mkChar('SoUiTwo', { ...SPOT, map: 'lumira', x: 25, y: 21 }),
};
const SPY = () => { window.__sent = []; const S = WebSocket.prototype.send; WebSocket.prototype.send = function (d) { try { window.__sent.push(JSON.parse(d)); } catch (e) { } return S.call(this, d); }; };

async function run(srv, R) {
  const URL = srv.ws, ok = R.ok;
  const A = await login(URL, 'so_a'), B = await login(URL, 'so_b'), Cc = await login(URL, 'so_c');
  // ---------------- rankings
  A.send({ t: 'rank', k: 'kills' }); const rk = await A.wait(m => m.t === 'rank', 2000);
  const vals = rk ? rk.rows.map(r => parseInt(String(r[1]).replace(/\D/g, ''), 10)) : [];
  ok(rk && Object.keys(rk.cats).length >= 5 && vals.every((v, i) => i === 0 || vals[i - 1] >= v) && rk.mine && rk.rows.some(r => r[0] === 'SoAlpha'), 'rankings: 5 categories, sorted high to low, my own rank shown', JSON.stringify(rk && { cats: rk.cats, mine: rk.mine, top: rk.rows.slice(0, 3) }));
  A.send({ t: 'rank', k: 'level' }); const rl = await A.next(m => m.t === 'rank' && m.k === 'level', 2000);
  ok(rl && rl.rows.length >= 3, 'rankings: level board');
  A.send({ t: 'pinfo', id: B.id }); const pi = await A.wait(m => m.t === 'pinfo', 2000);
  ok(pi && pi.name === 'SoBravo' && pi.lv === 15, 'player info (tap a player)', JSON.stringify(pi));
  // ---------------- party
  A.send({ t: 'party', a: 'invite', id: B.id }); const inv = await B.wait(m => m.t === 'invite' && m.kind === 'party', 2000);
  ok(inv && inv.name === 'SoAlpha', 'party: the invited player gets the invite');
  B.send({ t: 'party', a: 'accept' }); const pa = await A.wait(m => m.t === 'party' && m.members && m.members.length === 2, 2000), pb = await B.wait(m => m.t === 'party' && m.members && m.members.length === 2, 2000);
  ok(pa && pb && pa.leader === A.id, 'party: accept -> both see 2 members, inviter is the leader');
  B.send({ t: 'party', a: 'invite', id: Cc.id }); const notLeader = await Cc.wait(m => m.t === 'invite' && m.kind === 'party', 800);
  ok(!notLeader, 'party: only the leader can invite');
  await sleep(750); A.send({ t: 'chat', ch: 'party', m: 'สวัสดีปาร์ตี้' });
  const pc = await B.wait(m => m.t === 'chat' && m.ch === 'party', 1500), pcC = await Cc.wait(m => m.t === 'chat' && m.ch === 'party', 600);
  ok(pc && !pcC, 'party chat reaches party members only');
  // EXP share: A kills monsters, B (nearby, not attacking) also gains EXP
  const e0 = me(B).exp, l0 = me(B).lv;
  for (let i = 0; i < 6; i++) {
    const pos = H.myPos(A), mob = H.mobsOf(A).filter(x => x.type === 'jellop' || x.type === 'leafling').sort((a, b) => H.cheb([a.x, a.y], pos) - H.cheb([b.x, b.y], pos))[0]; if (!mob) { await sleep(800); continue; }
    A.send({ t: 'attack', id: mob.id }); await A.wait(m => m.t === 'fx' && m.k === 'die' && m.id === mob.id, 9000);
    await sleep(400); if (me(B).exp !== e0 || me(B).lv !== l0) break;
  }
  ok(me(B).exp !== e0 || me(B).lv !== l0, 'party EXP share: a nearby member gains EXP from the leader\'s kills', `${e0} -> ${me(B).exp}`);
  ok((me(A).kills || 0) > 120, 'kill counter goes up for the ranking', String(me(A).kills));
  B.send({ t: 'party', a: 'leave' }); const gone = await A.wait(m => m.t === 'party' && !m.id, 2000);
  ok(!!gone, 'party: a 2-member party is disbanded when one leaves');
  // ---------------- guild
  await sleep(300); A.msgs.length = 0;
  A.send({ t: 'guild', a: 'create', name: 'Moonblade' }); const g1 = await A.wait(m => m.t === 'guild' && m.g, 2000);
  ok(g1 && g1.g.name === 'Moonblade' && g1.g.master === 'SoAlpha' && me(A).zeny === 9000 - 5000, 'guild: created (Lv10+, 5,000 Zeny)', JSON.stringify(g1 && g1.g));
  Cc.send({ t: 'guild', a: 'create', name: 'Lowbies' }); await sleep(400); ok(!me(Cc).guild, 'guild: below Lv10 cannot create');
  A.send({ t: 'guild', a: 'invite', id: B.id }); const gi = await B.wait(m => m.t === 'invite' && m.kind === 'guild', 2000);
  B.send({ t: 'guild', a: 'accept' }); const gb = await B.wait(m => m.t === 'guild' && m.g && m.g.members.length === 2, 2000);
  await sleep(300); ok(gi && gb && me(B).guild === 'Moonblade', 'guild: invite + accept', JSON.stringify({ gi: !!gi, gb: !!gb, g: me(B).guild }));
  await sleep(750); B.send({ t: 'chat', ch: 'guild', m: 'hello guild' }); const gcm = await A.wait(m => m.t === 'chat' && m.ch === 'guild', 1500);
  ok(!!gcm, 'guild chat reaches guild members');
  B.close(); await sleep(500); let B2 = await login(URL, 'so_b');
  ok(me(B2).guild === 'Moonblade', 'guild membership is saved (re-login)');
  A.send({ t: 'guild', a: 'kick', name: 'SoBravo' }); await sleep(500);
  ok(!me(B2).guild, 'guild: the master can remove a member');
  // ---------------- trade
  A.send({ t: 'trade', a: 'req', id: Cc.id }); await sleep(400); ok(!(Cc.msgs.find(m => m.t === 'invite' && m.kind === 'trade')), 'trade: refused when the players are far apart / on other maps');
  { const pa = H.myPos(A) || [22, 8]; B2.send({ t: 'move', x: Math.round(pa[0]) + 1, y: Math.round(pa[1]) }); A.send({ t: 'move', x: Math.round(pa[0]), y: Math.round(pa[1]) }); await sleep(3500); }
  A.send({ t: 'trade', a: 'req', id: B2.id }); const ti = await B2.wait(m => m.t === 'invite' && m.kind === 'trade', 2000);
  B2.send({ t: 'trade', a: 'accept' }); const tw = await A.wait(m => m.t === 'trade' && m.id, 2000);
  ok(ti && tw && tw.with === 'SoBravo', 'trade: request + accept opens the trade on both sides');
  A.send({ t: 'trade', a: 'offer', items: [{ id: 1, q: 2 }, { id: 151, q: 1 }], zeny: 300 });
  B2.send({ t: 'trade', a: 'offer', items: [{ id: 10, q: 3 }], zeny: 0 });
  await sleep(400); const tv = A.last('trade');
  ok(tv.mine.items.length === 1 && tv.mine.items[0].id === 1 && tv.mine.zeny === 300 && tv.theirs.items[0].id === 10, 'trade: offers sync both ways; quest items are not tradeable', JSON.stringify(tv));
  A.send({ t: 'trade', a: 'lock' }); await sleep(200); B2.send({ t: 'trade', a: 'offer', items: [{ id: 10, q: 4 }], zeny: 0 }); await sleep(300);
  ok(!A.last('trade').lock.me, 'trade: changing an offer cancels the locks');
  A.send({ t: 'trade', a: 'confirm' }); await sleep(300); ok(!!A.last('trade').id, 'trade: cannot confirm before both lock');
  A.send({ t: 'trade', a: 'lock' }); B2.send({ t: 'trade', a: 'lock' }); await sleep(300);
  const za = me(A).zeny, zb = me(B2).zeny, a1 = me(A).inv.find(s => s.id === 1).q;
  A.send({ t: 'trade', a: 'confirm' }); B2.send({ t: 'trade', a: 'confirm' }); const done = await A.wait(m => m.t === 'trade' && m.done, 2000); await sleep(400);
  ok(done && me(A).zeny === za - 300 && me(B2).zeny === zb + 300 && me(A).inv.find(s => s.id === 1).q === a1 - 2 && me(B2).inv.find(s => s.id === 1).q === 2 && me(A).inv.find(s => s.id === 10).q === 4 && !me(B2).inv.some(s => s.id === 10),
    'trade: both confirm -> items and Zeny swap exactly', JSON.stringify({ za, zb, a: me(A).zeny, b: me(B2).zeny }));
  A.send({ t: 'trade', a: 'req', id: B2.id }); await B2.wait(m => m.t === 'invite' && m.kind === 'trade' && B2.msgs.indexOf(m) > B2.msgs.length - 6, 2000); B2.send({ t: 'trade', a: 'accept' }); await A.next(m => m.t === 'trade' && m.id, 2000);
  B2.close(); const cancel = await A.wait(m => m.t === 'trade' && !m.id && m.msg, 3000);
  ok(!!cancel, 'trade: cancelled when the other player leaves (nothing changes)');
  A.close(); Cc.close();

  // ---------------- browser: tap a player -> menu; rank board
  const pw = loadPlaywright(); if (!pw) { R.skipped('social browser tests', 'Playwright not installed'); return; }
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => pw.chromium.launch());
  try {
    const other = await login(URL, 'so_ui2');
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await ctx.addInitScript(SPY);
    const pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await pg.goto(srv.http + '/'); await pg.fill('#u', 'so_ui'); await pg.fill('#p', H.PW); await pg.click('#go'); await H.uiEnter(pg);
    await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && typeof ents !== 'undefined' && [...ents.values()].some(e => e.kind === 'p' && e.name === 'SoUiTwo'), null, { timeout: 10000 });
    await pg.waitForTimeout(1500);
    const pt = await pg.evaluate(() => { const [id, e] = [...ents].find(([, e]) => e.kind === 'p' && e.name === 'SoUiTwo'); const [ox, oy] = viewOrigin(), r = $('game').getBoundingClientRect(); return { id, x: r.left + ((e.x + 0.5) * TP + ox) * Z / DPR, y: r.top + ((e.y + 0.5) * TP + 12 - 20 + oy) * Z / DPR }; });
    await pg.touchscreen.tap(pt.x, pt.y); await pg.waitForTimeout(700);
    const menu = await pg.evaluate(() => ({ on: $('pmenu').style.display === 'block', btn: [...document.querySelectorAll('#pmenu button')].map(b => b.dataset.a) }));
    ok(menu.on && ['info', 'whisper', 'trade', 'party', 'guild'].every(a => menu.btn.includes(a)), 'tap another player: menu with info / whisper / trade / party / guild', JSON.stringify(menu));
    await pg.click('#pmenu button[data-a=party]'); const inv = await other.wait(m => m.t === 'invite' && m.kind === 'party', 2000);
    ok(!!inv, 'menu "ชวนเข้าปาร์ตี้" sends a real invite');
    await pg.touchscreen.tap(pt.x, pt.y); await pg.waitForTimeout(500); await pg.click('#pmenu button[data-a=whisper]'); await pg.waitForTimeout(300);
    ok(await pg.evaluate(() => $('wChat').style.display === 'block' && chTab === 'whisper' && $('wto').value === 'SoUiTwo'), 'menu "กระซิบ" opens whisper chat to that player');
    await pg.evaluate(() => { closeWins(); openRank(); }); await pg.waitForFunction(() => document.querySelectorAll('#rankbody .rk').length > 0, null, { timeout: 4000 }).catch(() => { });
    const rk = await pg.evaluate(() => ({ rows: document.querySelectorAll('#rankbody .rk').length, tabs: document.querySelectorAll('#ranktabs button').length, w: $('wRank').getBoundingClientRect().width / innerWidth }));
    ok(rk.rows >= 3 && rk.tabs >= 5 && rk.w <= 1, 'rank board window: tabs + rows (mobile)', JSON.stringify(rk));
    ok(!pg.errs.length, 'social UI: no page errors', JSON.stringify(pg.errs));
    other.close(); await ctx.close();
  } finally { await b.close(); }
}
module.exports = { run, SEEDS };
