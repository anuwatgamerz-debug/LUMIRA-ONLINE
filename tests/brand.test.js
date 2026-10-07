'use strict';
// ELYNDRA ONLINE rebrand + login tests: e-mail ids, "remember me" session tokens (never the password), guests,
// guest -> account binding, Google sign-in switch, metadata / PWA / favicon, splash, responsive login, level badge.
const fs = require('fs'), path = require('path');
const H = require('./harness');
const { sleep, me } = H;
function loadPlaywright() {
  try { return require('playwright'); } catch (e) { }
  try { const root = require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); return require(root + '/playwright'); } catch (e) { }
  return null;
}
const SEEDS = {
  'br_mail@elyndra.test': H.mkChar('BrMail', { lv: 5, map: 'lumira', x: 25, y: 20 }),
  br_lv: H.mkChar('BrLevel', { lv: 45, map: 'lumira', x: 25, y: 20 }),
  br_lv150: H.mkChar('BrMax', { lv: 150, map: 'lumira', x: 25, y: 20 }),
};
const get = (srv, p) => new Promise(r => require('http').get(srv.http + p, res => { let b = ''; res.on('data', d => { b += d; }); res.on('end', () => r({ code: res.statusCode, type: res.headers['content-type'], body: b })); }).on('error', () => r({ code: 0 })));
async function conn(url, msg, until = m => m.t === 'welcome' || m.t === 'err' || m.t === 'needchar') { const c = H.client(url); await c.open; c.send(msg); const r = await c.wait(until, 6000); return [c, r]; }

async function run(srv, R) {
  const ok = R.ok, URL = srv.ws, PUB = path.join(H.ROOT, 'public');
  // ---------------------------------------------------------------- branding files / metadata
  const html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
  ok(/<title>ELYNDRA ONLINE/.test(html) && /og:title" content="ELYNDRA ONLINE"/.test(html) && /og:image" content="assets\/branding\/og-cover.jpg"/.test(html) && /twitter:card/.test(html) && /apple-mobile-web-app-title" content="ELYNDRA"/.test(html), 'browser title, description, Open Graph, Twitter and Apple metadata say ELYNDRA ONLINE');
  const man = JSON.parse(fs.readFileSync(path.join(PUB, 'manifest.webmanifest'), 'utf8'));
  ok(man.name === 'ELYNDRA ONLINE' && man.short_name === 'ELYNDRA' && man.icons.every(i => fs.existsSync(path.join(PUB, i.src))), 'PWA manifest: ELYNDRA ONLINE / ELYNDRA with existing icons');
  const B = f => fs.existsSync(path.join(PUB, 'assets/branding', f));
  ok(['elyndra-logo.png', 'elyndra-logo-small.png', 'elyndra-logo-horizontal.png', 'elyndra-emblem.png', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'cover-desktop.webp', 'cover-mobile.webp', 'login-bg-desktop.webp', 'login-bg-mobile.webp', 'og-cover.jpg'].every(B), 'branding assets: logo (3 sizes), emblem, favicon, app icons, covers, login backgrounds, social image');
  ok(!/LUMIRA/i.test(html.replace(/<!--[\s\S]*?-->/g, '')), 'index.html (everything the player sees before the game) has no LUMIRA left');
  {
    const m = await get(srv, '/manifest.webmanifest'), f = await get(srv, '/assets/branding/favicon.ico'), c = await get(srv, '/api/config');
    ok(m.code === 200 && /manifest\+json/.test(m.type) && f.code === 200 && /icon/.test(f.type), 'server serves the manifest and favicon with the right types');
    const j = JSON.parse(c.body || '{}'); ok(c.code === 200 && j.name === 'ELYNDRA ONLINE' && j.google === null, 'api/config: game name + Google sign-in switched off (no client id configured)');
  }
  // ---------------------------------------------------------------- accounts
  {
    const [c, w] = await conn(URL, { t: 'login', u: 'BR_MAIL@elyndra.test', p: H.PW });
    ok(w && w.t === 'welcome', 'e-mail login works (case-insensitive)'); c.close();
    const [c2, w2] = await conn(URL, { t: 'register', u: 'new.player@elyndra.test', p: 'pass1234', name: 'MailHero', rem: 1 });
    const ses = await c2.wait(m => m.t === 'session', 3000);
    ok(w2 && w2.t === 'welcome' && ses && ses.u === 'new.player@elyndra.test' && /^[0-9a-f]{48}$/.test(ses.tok), 'register with an e-mail; "remember me" returns a session token (not the password)');
    c2.close(); await sleep(300);
    const [c3, w3] = await conn(URL, { t: 'tlogin', u: ses.u, tok: ses.tok });
    ok(w3 && w3.t === 'welcome', 'remembered session logs in without the password');
    c3.send({ t: 'revoke', tok: ses.tok }); await sleep(300); c3.close(); await sleep(300);
    const [c4, w4] = await conn(URL, { t: 'tlogin', u: ses.u, tok: ses.tok });
    ok(w4 && w4.t === 'err' && w4.code === 'session', 'logout revokes the session token'); c4.close();
    const [c5, w5] = await conn(URL, { t: 'tlogin', u: ses.u, tok: 'f'.repeat(48) });
    ok(w5 && w5.t === 'err', 'a forged token is refused'); c5.close();
    const [c6, w6] = await conn(URL, { t: 'register', u: 'bad mail@x', p: 'pass1234', name: 'Nope' });
    ok(w6 && w6.t === 'err' && /อีเมล/.test(w6.m), 'invalid e-mail / id rejected with a short message'); c6.close();
    const rows = H.sql(srv, 'SELECT token_hash FROM sessions');
    ok(rows.length > 0 && !JSON.stringify(rows).includes(ses.tok) && rows.every(r => /^h1:[0-9a-f]{64}$/.test(r.token_hash) || /^[0-9a-f]{64}$/.test(r.token_hash)), 'tokens are stored hashed only (HMAC)');
  }
  // guests
  {
    const [g, w] = await conn(URL, { t: 'guest', sex: 1, hair: 2, hc: 3, cc: 1 });
    const ses = await g.wait(m => m.t === 'session', 3000), m0 = await g.wait(m => m.t === 'me', 3000);
    ok(w && w.t === 'welcome' && ses && ses.guest && /^guest:/.test(ses.u) && m0 && m0.c.guest && /^Guest\d+/.test(m0.c.name), 'Guest: plays at once with an automatic character + a device token');
    g.close(); await sleep(300);
    const [g2, w2] = await conn(URL, { t: 'tlogin', u: ses.u, tok: ses.tok });
    ok(w2 && w2.t === 'welcome', 'Guest comes back with the device token');
    const [, wp] = await conn(URL, { t: 'login', u: ses.u, p: 'anything' });
    ok(wp && wp.t === 'err', 'a guest account can never be reached with a password login');
    g2.send({ t: 'bind', u: 'bound_guest', p: 'secret99' }); const br = await g2.wait(m => m.t === 'bindres', 4000), ns = await g2.wait(m => m.t === 'session' && m.u === 'bound_guest', 3000);
    ok(br && br.ok && ns && !ns.guest, 'Guest binds to an id + password and keeps playing'); const name = me(g2).name; g2.close(); await sleep(400);
    const [g3, w3] = await conn(URL, { t: 'login', u: 'bound_guest', p: 'secret99' }); const m3 = w3 && w3.t === 'welcome' && await g3.wait(m => m.t === 'me', 3000);
    ok(m3 && m3.c.name === name && !m3.c.guest, 'the bound account logs in with the password and has the same character'); g3.close();
  }
  { const [c, w] = await conn(URL, { t: 'glogin', cred: 'x' }); ok(w && w.t === 'err' && /Google/.test(w.m), 'Google sign-in answers clearly when it is not configured (no fake success)'); c.close(); }
  // ---------------------------------------------------------------- browser
  const pw = loadPlaywright(); if (!pw) { R.skipped('login browser tests', 'Playwright not installed'); return; }
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => pw.chromium.launch());
  const open = async (vp) => { const ctx = await b.newContext(vp), pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort()); await pg.goto(srv.http + '/'); return pg; };
  try {
    {
      const pg = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      const sp0 = await pg.$('#splash'); await pg.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 7000 }).catch(() => { });
      const r = await pg.evaluate(() => ({ title: document.title, logo: $('llogo').naturalWidth > 0, txt: document.body.innerText, bg: getComputedStyle(document.querySelector('#login .lbg')).backgroundImage, google: !$('tGoogle').hidden, guest: !!$('altGuest').offsetParent }));
      ok(!!sp0 && !(await pg.$('#splash')), 'splash screen shows the logo, then fades into the login');
      ok(/^ELYNDRA ONLINE/.test(r.title) && r.logo && !/LUMIRA/i.test(r.txt), 'login page: ELYNDRA title + logo, no LUMIRA text', r.title);
      ok(/login-bg-mobile/.test(r.bg) && !r.google && r.guest, 'portrait uses the mobile background; Google hidden (not configured); Guest offered', r.bg);
      await pg.click('#altGuest'); await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block', null, { timeout: 8000 }).catch(() => { });
      await pg.waitForFunction(() => localStorage.getItem('ely_guest'), null, { timeout: 4000 }).catch(() => { }); // the token message can land just after the HUD opens
      const gs = await pg.evaluate(() => ({ g: localStorage.getItem('ely_guest'), all: JSON.stringify(localStorage) }));
      ok(!!gs.g && /guest:/.test(gs.g) && !/pass1234/i.test(gs.all), 'Guest button logs in and keeps only a token on the device', JSON.stringify(gs));
      await pg.context().close();
    }
    {
      const pg = await open({ viewport: { width: 1280, height: 720 } });
      await pg.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 7000 }).catch(() => { });
      const bg = await pg.evaluate(() => getComputedStyle(document.querySelector('#login .lbg')).backgroundImage);
      ok(/login-bg-desktop/.test(bg), 'landscape uses the desktop background');
      await pg.fill('#u', 'br_lv'); await pg.fill('#p', H.PW); await pg.click('#go'); await H.uiEnter(pg);
      const busy = await pg.$eval('#go', e => e.textContent);
      await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && me, null, { timeout: 8000 });
      await pg.waitForTimeout(900);
      const s = await pg.evaluate(() => ({ ses: localStorage.getItem('ely_session'), store: JSON.stringify(localStorage), gone: getComputedStyle($('login')).opacity }));
      ok(/กำลัง/.test(busy) && s.ses && !s.store.includes('pass1234'), 'login shows the loading state; "remember me" keeps a token, never the password');
      const fit = await pg.evaluate(() => { const b = $('lvb'), r = b.getBoundingClientRect(), f = $('pport').getBoundingClientRect(), n = b.querySelector('b').getBoundingClientRect(); return { inside: n.left >= r.left - 1 && n.right <= r.right + 1 && n.top >= r.top - 1 && n.bottom <= r.bottom + 1, txt: b.textContent }; });
      ok(fit.inside && fit.txt === 'Lv45', 'level badge: "Lv" + number stay inside the portrait frame slot', JSON.stringify(fit));
      const p2 = pg; await p2.reload(); await p2.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 7000 }).catch(() => { });
      const pre = await p2.evaluate(() => ({ u: $('u').value, hint: $('lhint').textContent }));
      await p2.click('#go'); await H.uiEnter(p2); const back = await p2.waitForFunction(() => document.getElementById('hud').style.display === 'block', null, { timeout: 8000 }).then(() => true).catch(() => false);
      ok(pre.u === 'br_lv' && /จดจำ/.test(pre.hint) && back, 'reload: remembered user is prefilled and enters with one tap (token login)', JSON.stringify(pre));
      await p2.context().close();
    }
    {
      const pg = await open({ viewport: { width: 1280, height: 720 } }); await pg.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 7000 }).catch(() => { });
      await pg.evaluate(() => localStorage.clear());
      await pg.fill('#u', 'br_lv150'); await pg.fill('#p', H.PW); await pg.click('#go'); await H.uiEnter(pg);
      await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && me, null, { timeout: 8000 }); await pg.waitForTimeout(600);
      const fit = await pg.evaluate(() => { const b = $('lvb'), r = b.getBoundingClientRect(), n = b.querySelector('b').getBoundingClientRect(); return { inside: n.left >= r.left - 1 && n.right <= r.right + 1, txt: b.textContent }; });
      ok(fit.inside && fit.txt === 'Lv150', 'level badge fits a 3-digit level (Lv 150)', JSON.stringify(fit));
      await pg.context().close();
    }
    for (const [w, h] of [[360, 800], [393, 852], [430, 932], [844, 390], [932, 430], [1920, 1080]]) {
      const pg = await open({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 1000, hasTouch: w < 1000 });
      await pg.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 7000 }).catch(() => { });
      const r = await pg.evaluate(() => { const L = $('llogo').getBoundingClientRect(), B = document.querySelector('#login .box').getBoundingClientRect(), g = $('go').getBoundingClientRect(); return { lg: [L.left, L.top, L.right, L.bottom], box: [B.left, B.top, B.right, B.bottom], go: g.height, W: innerWidth, H: innerHeight }; });
      const inn = a => a[0] >= -1 && a[1] >= -1 && a[2] <= r.W + 1 && a[3] <= r.H + 1;
      ok(inn(r.lg) && inn(r.box) && r.go >= 26 && !pg.errs.length, `login ${w}x${h}: logo + panel on screen, button tappable`, JSON.stringify(r));
      await pg.context().close();
    }
  } finally { await b.close(); }
}
module.exports = { run, SEEDS };
