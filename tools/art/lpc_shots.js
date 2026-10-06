// screenshots of the LPC art pass: node tools/art/lpc_shots.js <outdir> [map x y ...]
const H = require('../../tests/harness');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const out = process.argv[2] || '/tmp'; const spots = [];
  for (let i = 3; i + 2 < process.argv.length + 1; i += 3) if (process.argv[i]) spots.push([process.argv[i], +process.argv[i + 1], +process.argv[i + 2]]);
  if (!spots.length) spots.push(['lumira', 20, 20]);
  const acc = {}; spots.forEach(([m, x, y], i) => acc['shot' + i] = H.account(H.mkChar('Shot' + i, { lv: 12, map: m, x, y, cls: 'vanguard', eq: { wpn: 22, arm: 31 } })));
  const srv = await H.startServer(acc, 3700 + Math.floor(Math.random() * 200));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [i, [m]] of spots.entries()) for (const [tag, vp] of [['desk', { viewport: { width: 1280, height: 760 } }], ['mob', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
    const ctx = await b.newContext(vp); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', e => errs.push(e.message)); await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await pg.goto(srv.http + '/'); await pg.fill('#u', 'shot' + i); await pg.fill('#p', H.PW); await pg.click('#go');
    await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && typeof ents !== 'undefined' && ents.size > 0, null, { timeout: 10000 });
    await pg.waitForTimeout(3500);
    await pg.screenshot({ path: `${out}/lpc_${m}_${tag}.png` });
    if (errs.length) console.log('page errors', errs);
    await ctx.close();
  }
  await b.close(); await srv.stop(); process.exit(0);
})();
