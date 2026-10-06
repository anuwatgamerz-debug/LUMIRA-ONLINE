// screenshots of the map window: node tools/art/map_shots.js <outdir> [map x y]
const H = require('../../tests/harness');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const out = process.argv[2] || '/tmp', m = process.argv[3] || 'beginner_meadow', x = +(process.argv[4] || 22), y = +(process.argv[5] || 24);
  const srv = await H.startServer({ mapshot: H.account(H.mkChar('MapShot', { lv: 12, map: m, x, y, cls: 'vanguard' })) }, 3700 + Math.floor(Math.random() * 200));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [tag, vp] of [['desk', { viewport: { width: 1280, height: 760 } }], ['mob', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
    const ctx = await b.newContext(vp), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', e => errs.push(e.message)); await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await pg.goto(srv.http + '/'); await pg.fill('#u', 'mapshot'); await pg.fill('#p', H.PW); await pg.click('#go');
    await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && typeof ents !== 'undefined' && ents.size > 0, null, { timeout: 10000 });
    await pg.waitForTimeout(2500);
    await pg.evaluate(() => $('bMap').click()); await pg.waitForTimeout(800);
    await pg.screenshot({ path: `${out}/map_local_${tag}.png` });
    await pg.evaluate(() => document.querySelector('#maptabs button[data-t=world]').click()); await pg.waitForTimeout(800);
    await pg.screenshot({ path: `${out}/map_world_${tag}.png` });
    if (errs.length) console.log('page errors', errs);
    await ctx.close();
  }
  await b.close(); await srv.stop(); process.exit(0);
})();
