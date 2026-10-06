// login screen screenshots at the spec sizes: node tools/art/login_shots.js <outdir>
const H = require('../../tests/harness');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const out = process.argv[2] || '/tmp', srv = await H.startServer({}, 3700 + Math.floor(Math.random() * 200));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [w, h, mob] of [[360, 800, 1], [390, 844, 1], [430, 932, 1], [844, 390, 1], [768, 1024, 1], [1280, 760, 0]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mob ? 2 : 1, isMobile: !!mob, hasTouch: !!mob }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', e => errs.push(e.message)); await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await pg.goto(srv.http + '/'); await pg.waitForTimeout(900);
    await pg.screenshot({ path: `${out}/login_${w}x${h}.png` });
    if (w === 390 || w === 1280) { await pg.fill('#u', 'nobody'); await pg.fill('#p', 'wrongpw'); await pg.click('#go'); await pg.waitForTimeout(900); await pg.screenshot({ path: `${out}/login_${w}x${h}_err.png` }); await pg.click('#tReg'); await pg.waitForTimeout(500); await pg.screenshot({ path: `${out}/login_${w}x${h}_reg.png` }); }
    if (errs.length) console.log(w, h, 'page errors', errs);
    await ctx.close();
  }
  await b.close(); await srv.stop(); process.exit(0);
})();
