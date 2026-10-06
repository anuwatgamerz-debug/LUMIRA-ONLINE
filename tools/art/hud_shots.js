// target HUD + NPC labels screenshots: node tools/art/hud_shots.js <outdir> [map x y]
const H = require('../../tests/harness');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const out = process.argv[2] || '/tmp', m = process.argv[3] || 'beginner_meadow', x = +(process.argv[4] || 22), y = +(process.argv[5] || 24);
  const srv = await H.startServer({ hudshot: H.account(H.mkChar('HudShot', { lv: 12, map: m, x, y, cls: 'vanguard' })) }, 3700 + Math.floor(Math.random() * 200));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [tag, vp] of [['desk', { viewport: { width: 1280, height: 760 } }], ['mob', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['land', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
    const ctx = await b.newContext(vp), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', e => errs.push(e.message)); await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await pg.goto(srv.http + '/'); await pg.fill('#u', 'hudshot'); await pg.fill('#p', H.PW); await pg.click('#go');
    await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && typeof ents !== 'undefined' && ents.size > 0, null, { timeout: 10000 });
    await pg.waitForTimeout(2000);
    await pg.evaluate(() => { const l = targetList(20); if (l.length) setTarget(l[0]); }); await pg.waitForTimeout(900);
    await pg.screenshot({ path: `${out}/hud_${m}_${tag}.png` });
    if (errs.length) console.log('page errors', errs);
    await ctx.close();
  }
  await b.close(); await srv.stop(); process.exit(0);
})();
