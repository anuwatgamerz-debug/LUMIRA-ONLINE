'use strict';
// ELYNDRA character portraits: registry + assets, create with a portrait, save / load / login again, old characters,
// invalid ids and URLs refused, change portrait, locked portraits, HUD / party / inspect, missing-image fallback,
// mobile (360 / 390 / 430) and desktop create screens.
const fs = require('fs'), path = require('path');
const H = require('./harness');
const P = require('../public/portraits.js');
function loadPlaywright() {
  try { return require('playwright'); } catch (e) { }
  try { const root = require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); return require(root + '/playwright'); } catch (e) { }
  return null;
}
const SPOT = { map: 'lumira', x: 23, y: 22 };
const SEEDS = {
  po_old: H.mkChar('PoOldHero', { ...SPOT, lv: 12, look: { hair: 1, hc: 2, cc: 0, sex: 1 } }), // made before portraits: no portraitId
  po_bad: H.mkChar('PoBadSave', { ...SPOT, portraitId: 'https://evil.example/x.png' }),
  po_a: H.mkChar('PoAlpha', { ...SPOT, portraitId: 'portrait_005' }),
  po_b: H.mkChar('PoBravo', { ...SPOT, x: 24, portraitId: 'portrait_008' }),
};
async function conn(url, msg) { const c = H.client(url); await c.open; c.send(msg); const r = await c.wait(m => m.t === 'welcome' || m.t === 'err', 6000); if (r && r.t === 'welcome') await c.wait(m => m.t === 'me', 3000); return [c, r]; }

async function run(srv, R) {
  const ok = R.ok, URL = srv.ws, PUB = path.join(H.ROOT, 'public');
  // ---------------------------------------------------------------- registry + files
  ok(P.PORTRAITS.length >= 8 && P.PORTRAITS.length <= 12 && P.PORTRAITS.every(p => p.type === 'NORMAL'), `registry: ${P.PORTRAITS.length} starter portraits, all NORMAL`);
  ok(P.PORTRAITS.every(p => ['full', 'thumb', 'hud'].every(s => fs.existsSync(path.join(PUB, P.portraitSrc(p.id, s))))) && fs.existsSync(path.join(PUB, 'assets/portraits/portrait_default.png')), 'every portrait has full / thumbnail / HUD versions + a default image');
  const big = P.PORTRAITS.map(p => fs.statSync(path.join(PUB, P.portraitSrc(p.id, 'thumb'))).size);
  ok(Math.max(...big) < 40000, `gallery thumbnails are small (largest ${Math.max(...big)} B)`);
  ok(P.PORTRAITS.every(p => fs.existsSync(path.join(PUB, 'assets/import/portraits', p.id + '.png'))), 'original source images kept in assets/import/portraits/');
  ok(new Set(P.PORTRAITS.map(p => p.sex)).size === 2 && new Set(P.PORTRAITS.map(p => p.style)).size >= 5, 'mixed set: men / women and several styles (filters only)');
  ok(P.PORTRAIT_TYPES.join() === 'NORMAL,RARE,EVENT,ACHIEVEMENT,CLASS', 'portrait types ready: NORMAL RARE EVENT ACHIEVEMENT CLASS');
  ok(!P.portraitAllowed('portrait_999', null) && !P.portraitAllowed('https://x/y.png', null) && P.portraitAllowed('portrait_001', null), 'only registry ids are allowed, never a URL');
  ok(P.portraitFallback({ sex: 1 }, 'Abc') === P.portraitFallback({ sex: 1 }, 'Abc') && P.portraitOf(P.portraitFallback({ sex: 1 }, 'Abc')).sex === 'f', 'fallback for old saves is stable and matches the body type');
  // ---------------------------------------------------------------- server: create / save / load
  {
    const [c, w] = await conn(URL, { t: 'register', u: 'po_new', p: 'pass1234', name: 'PoNewbie', sex: 1, hair: 0, hc: 0, cc: 0, portrait: 'portrait_006' });
    ok(w && w.t === 'welcome' && H.me(c).portraitId === 'portrait_006', 'create character with a portrait');
    c.close(); await H.sleep(400);
    const db = JSON.parse(fs.readFileSync(srv.db, 'utf8'));
    ok(db.accounts.po_new && db.accounts.po_new.char.portraitId === 'portrait_006', 'portraitId saved in the character data');
    const [c2] = await conn(URL, { t: 'login', u: 'po_new', p: 'pass1234' });
    ok(H.me(c2).portraitId === 'portrait_006', 'logout / login again: same portrait'); c2.close();
    const [c3, w3] = await conn(URL, { t: 'register', u: 'po_x1', p: 'pass1234', name: 'PoHacker', portrait: 'https://random-site.com/image.png' });
    ok(w3 && w3.t === 'err' && /ภาพ/.test(w3.m), 'create with a URL as portrait: refused'); c3.close();
    const [c4, w4] = await conn(URL, { t: 'register', u: 'po_x2', p: 'pass1234', name: 'PoNoPick', sex: 0 });
    ok(w4 && w4.t === 'welcome' && P.portraitOf(H.me(c4).portraitId) && P.portraitOf(H.me(c4).portraitId).sex === 'm', 'no portrait sent: a default for the body type'); c4.close();
    const [g, wg] = await conn(URL, { t: 'guest', sex: 1, portrait: 'portrait_002' });
    ok(wg && wg.t === 'welcome' && H.me(g).portraitId === 'portrait_002', 'guest characters keep the portrait too'); g.close();
  }
  {
    const [c, w] = await conn(URL, { t: 'login', u: 'po_old', p: H.PW });
    const pid = w && w.t === 'welcome' && H.me(c).portraitId;
    ok(pid && P.portraitOf(pid) && P.portraitOf(pid).sex === 'f', `old character without portraitId logs in fine and gets a default (${pid})`); c.close();
    const [c2, w2] = await conn(URL, { t: 'login', u: 'po_bad', p: H.PW });
    ok(w2 && w2.t === 'welcome' && P.portraitOf(H.me(c2).portraitId), 'a save holding a URL is repaired to a real portrait'); c2.close();
  }
  // ---------------------------------------------------------------- change portrait + party / inspect
  {
    const A = await H.login(URL, 'po_a'), B = await H.login(URL, 'po_b');
    A.send({ t: 'portrait', id: 'portrait_007' }); const m1 = await A.next(m => m.t === 'me', 2000);
    ok(m1 && m1.c.portraitId === 'portrait_007', 'change portrait after creation (free)');
    A.send({ t: 'portrait', id: 'https://evil.example/a.png' }); const f1 = await A.wait(m => m.t === 'portraitfail', 2000);
    A.send({ t: 'portrait', id: 'portrait_999' }); const f2 = await A.next(m => m.t === 'portraitfail', 2000);
    ok(f1 && f2 && H.me(A).portraitId === 'portrait_007', 'invalid id / URL refused, portrait unchanged');
    const st0 = JSON.stringify(H.me(A).st) + H.me(A).atk + H.me(A).def; A.send({ t: 'portrait', id: 'portrait_001' }); const m2 = await A.next(m => m.t === 'me', 2000);
    ok(m2 && JSON.stringify(m2.c.st) + m2.c.atk + m2.c.def === st0, 'portrait has no effect on stats');
    A.send({ t: 'pinfo', id: B.id }); const pi = await A.wait(m => m.t === 'pinfo' && m.id === B.id, 2000);
    ok(pi && pi.portraitId === 'portrait_008', 'inspect player carries the portrait');
    A.send({ t: 'party', a: 'invite', id: B.id }); await B.wait(m => m.t === 'invite', 2000); B.send({ t: 'party', a: 'accept' });
    const pv = await A.wait(m => m.t === 'party' && m.members && m.members.length === 2, 3000);
    ok(pv && pv.members.find(x => x.id === B.id).portraitId === 'portrait_008' && pv.members.find(x => x.id === A.id).portraitId === 'portrait_001', 'party member cards carry each portrait');
    B.send({ t: 'party', a: 'leave' }); await H.sleep(200); A.close(); B.close(); await H.sleep(300);
  }
  // ---------------------------------------------------------------- browser
  const pw = loadPlaywright(); if (!pw) { R.skipped('portrait browser tests', 'Playwright not installed'); return; }
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => pw.chromium.launch());
  const open = async (vp) => { const ctx = await b.newContext(vp), pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort()); await pg.goto(srv.http + '/'); await pg.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 7000 }).catch(() => { }); await pg.evaluate(() => localStorage.clear()); return pg; };
  try {
    let n = 0;
    for (const [w, h] of [[360, 800], [390, 844], [430, 932]]) {
      const pg = await open({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await pg.click('#tReg'); await pg.waitForTimeout(500);
      const lay = await pg.evaluate(() => { const g = $('go').getBoundingClientRect(), c = document.querySelector('#crgal .pcell').getBoundingClientRect(), hud = $('crhud').getBoundingClientRect(); return { goIn: g.bottom <= innerHeight + 1 && g.top >= 0, cell: Math.min(c.width, c.height), n: document.querySelectorAll('#crgal .pcell').length, hud: hud.width > 0, sel: document.querySelectorAll('#crgal .pcell.on').length }; });
      ok(lay.goIn && lay.n === 8 && lay.hud && lay.sel === 1 && lay.cell >= 28, `${w}x${h}: create screen fits (button on screen), 8 portraits, one preselected, live HUD preview (cell ${Math.round(lay.cell)} px)`);
      if (w === 390) {
        await pg.click('#crgal .pfil button[data-f="f"]'); const fem = await pg.evaluate(() => [...document.querySelectorAll('#crgal .pcell')].map(x => x.dataset.id));
        ok(fem.length === 4 && fem.every(id => P.portraitOf(id).sex === 'f'), 'filter "หญิง" shows only those portraits (filter only)');
        await pg.click('#crgal .pfil button[data-f="all"]');
        await pg.fill('#cn', 'X'); await pg.click('#go'); const e1 = await pg.evaluate(() => $('crerr').textContent);
        await pg.fill('#cn', 'Bad<Name>'); await pg.click('#go'); const e2 = await pg.evaluate(() => $('crerr').textContent);
        ok(/2-14/.test(e1) && /ไทย/.test(e2) , 'name checks on the same screen (too short / bad characters), no reload');
        await pg.click('#crgal .pcell[data-id="portrait_004"]'); const pv = await pg.evaluate(() => $('crimg').getAttribute('src'));
        ok(/hud\/portrait_004/.test(pv), 'tap a portrait: the HUD preview changes at once');
        await pg.click('#crgal .pcell[data-id="portrait_004"]'); await pg.waitForTimeout(300);
        ok(await pg.evaluate(() => getComputedStyle($('pbig')).display === 'flex' && /full\/portrait_004/.test(document.querySelector('#pbig .pfull').src)), 'tap the selected one again: big preview with the HUD sample');
        await pg.click('#pbig .px');
        await pg.fill('#cn', 'PoBrowser'); await pg.fill('#u', 'po_browser'); await pg.fill('#p', 'pass1234'); await pg.click('#go');
        await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && me, null, { timeout: 9000 }); await pg.waitForTimeout(800);
        const hud = await pg.evaluate(() => ({ id: me.portraitId, src: $('pimg').getAttribute('src'), vis: getComputedStyle($('pimg')).display, fit: getComputedStyle($('pimg')).objectFit, r: getComputedStyle($('pimg')).borderRadius, inside: (() => { const a = $('pimg').getBoundingClientRect(), f = $('pport').getBoundingClientRect(); return a.left >= f.left - 1 && a.right <= f.right + 1 && a.top >= f.top - 1 && a.bottom <= f.bottom + 1; })() }));
        ok(hud.id === 'portrait_004' && /hud\/portrait_004/.test(hud.src) && hud.vis === 'block' && hud.fit === 'cover' && hud.r === '50%' && hud.inside, 'in game: HUD shows the chosen portrait, round mask, object-fit cover, inside the frame');
        await pg.click('#pport'); await pg.waitForTimeout(300); await pg.click('#bPortChange'); await pg.waitForTimeout(300);
        await pg.click('#portgal .pcell[data-id="portrait_007"]'); await pg.click('#portSave'); await pg.waitForTimeout(800);
        const ch = await pg.evaluate(() => ({ id: me.portraitId, hud: $('pimg').getAttribute('src'), msg: $('portmsg').textContent }));
        ok(ch.id === 'portrait_007' && /portrait_007/.test(ch.hud) && /บันทึก/.test(ch.msg), 'change portrait in game: saved and the HUD updates');
        const miss = await pg.evaluate(async () => {
          const i = new Image(); PORTRAIT.setImg(i, 'portrait_999', 'hud'); const a = i.getAttribute('src');
          const k = new Image(); k.onerror = () => { k.src = PORTRAIT.DEFAULT; }; k.src = 'assets/portraits/hud/missing_file.webp'; await new Promise(r => setTimeout(r, 700));
          return { a, k: k.getAttribute('src'), w: k.naturalWidth };
        });
        ok(/portrait_default/.test(miss.a) && /portrait_default/.test(miss.k) && miss.w > 0, 'unknown id or missing file -> default portrait, no crash');
        const lock = await pg.evaluate(async () => {
          PORTRAIT.list.push({ id: 'portrait_rare_test', sex: 'f', style: 'mage', type: 'RARE', th: 'test' }); closeWins(); openPortraitWin();
          const c = document.querySelector('#portgal .pcell[data-id="portrait_rare_test"]'); const r = { lock: c && c.classList.contains('lock'), icon: c && c.textContent.includes('🔒') };
          c && c.click(); r.sel = !!document.querySelector('#portgal .pcell.on[data-id="portrait_rare_test"]'); PORTRAIT.list.pop(); closeWins(); return r;
        });
        ok(lock.lock && lock.icon && !lock.sel, 'locked portrait (RARE, not unlocked): 🔒 shown and cannot be picked');
        ok(!pg.errs.length, 'no page errors (create / HUD / change) ' + pg.errs.join(' | '));
        n++;
      }
      await pg.context().close();
    }
    {
      const pg = await open({ viewport: { width: 1280, height: 720 } });
      await pg.click('#tReg'); await pg.waitForTimeout(500);
      const d = await pg.evaluate(() => { const A = document.querySelector('.crA').getBoundingClientRect(), B = document.querySelector('.crB').getBoundingClientRect(), g = $('go').getBoundingClientRect(), img = document.querySelector('#crgal .pcell').getBoundingClientRect(); return { side: B.left > A.right - 2, goIn: g.bottom <= innerHeight + 1, cell: img.width }; });
      ok(d.side && d.goIn && d.cell < 160, `desktop / landscape: preview + options left, gallery right, not oversized (cell ${Math.round(d.cell)} px)`);
      await pg.context().close();
    }
  } finally { await b.close(); }
}
module.exports = { run, SEEDS };
