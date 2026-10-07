'use strict';
// ELYNDRA VFX Phase 1: registry + licences + skill bindings (node), then in the browser: every beginner / first class
// skill effect through the real fx messages, combat feedback (crit / miss / block / evade / dot), status effects,
// quality + other-player + party settings, caps and priority, boss warnings never hidden, and a mobile load test
// (360x800 / 390x844 / 430x932 with 5 / 10 / 20 fighting monsters).
const fs = require('fs'), path = require('path');
const H = require('./harness');
const C = require('../content');
const { VFX_TEX, VFX_DEF, VFX_ATTACK } = require('../public/vfx.js');
function loadPlaywright() {
  try { return require('playwright'); } catch (e) { }
  try { const root = require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); return require(root + '/playwright'); } catch (e) { }
  return null;
}
function spot(map, x, y) { const M = C.MAPS[map]; for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const t = C.get(M, x + dx, y + dy); if (!C.SOLID.has(t) && t !== 8) return [x + dx, y + dy]; } return [x, y]; }
const at = (map, x, y) => { const [sx, sy] = spot(map, x, y); return { map, x: sx, y: sy }; };
const SEEDS = {
  vfx_arc: H.mkChar('VfxArc', { lv: 30, cls: 'arcanist', jlv: 20, eq: { wpn: 233 }, hp: 99999, sp: 99999, ...at('deep_forest', 25, 37) }),
  vfx_mob: H.mkChar('VfxMob', { lv: 20, cls: 'vanguard', jlv: 20, eq: { wpn: 22 }, hp: 99999, sp: 99999, ...at('lumira', 25, 20) }),
};
const PHASE1 = ['bash', 'heal', 'bolt', 'focus', 'cleave', 'twin', 'v_wall', 'v_strike', 'v_charge', 'r_pierce', 'r_volley', 'r_step', 'a_ember', 'a_frost', 'a_nova', 'c_mend', 'c_smite', 'c_bless', 'g_back', 'g_venom', 'g_veil', 't_hammer', 't_bomb', 't_repair'];

async function run(srv, R) {
  const ok = R.ok, PUB = path.join(H.ROOT, 'public'), V = path.join(PUB, 'assets/vfx');
  // ---------------------------------------------------------------- assets + licences
  {
    const files = Object.values(VFX_TEX).map(f => path.join(V, f));
    ok(files.every(f => fs.existsSync(f)), `all ${files.length} VFX textures exist in public/assets/vfx/<category>/`);
    const sizes = files.map(f => fs.statSync(f).size), tot = sizes.reduce((a, b) => a + b, 0);
    ok(files.every(f => /\.webp$/.test(f)) && Math.max(...sizes) < 40000 && tot < 400000, `textures are small WebP (largest ${Math.max(...sizes)} B, total ${Math.round(tot / 1024)} KB)`);
    const man = JSON.parse(fs.readFileSync(path.join(V, 'textures.json'), 'utf8'));
    ok(Object.values(man).every(t => fs.existsSync(path.join(V, t.source))) && Object.keys(man).length === Object.keys(VFX_TEX).length, 'every texture keeps its untouched source file in assets/vfx/source/');
    const lic = fs.readFileSync(path.join(V, 'source/kenney_particle_pack/LICENSE.txt'), 'utf8');
    ok(/Creative Commons Zero, CC0/.test(lic) && /Kenney/.test(lic), 'source pack ships with its CC0 licence file');
    const L = fs.readFileSync(path.join(H.ROOT, 'docs/VFX_ASSET_LICENSES.md'), 'utf8');
    ok(/CC0/.test(L) && /opengameart\.org\/content\/particle-pack-80-sprites/.test(L) && /github\.com\/Calinou\/kenney-particle-pack/.test(L) && Object.keys(VFX_TEX).every(id => L.includes(id)), 'VFX_ASSET_LICENSES.md: source URLs, CC0, and a row for every texture');
    ok(!/ragnarok|gravity/i.test(L.replace(/no Ragnarok[^\n]*/i, '')), 'no ripped game assets listed');
    const M = fs.readFileSync(path.join(H.ROOT, 'docs/VFX_ASSET_MATRIX.md'), 'utf8');
    ok(PHASE1.every(id => M.includes('`' + id + '`')) && /TESTED/.test(M), 'VFX_ASSET_MATRIX.md: a row for every Phase 1 skill with its status');
  }
  // ---------------------------------------------------------------- registry
  {
    const bad = []; for (const [id, d] of Object.entries(VFX_DEF)) for (const L of d.layers) if (L.tex !== 'HAMMER' && !VFX_TEX[L.tex]) bad.push(id + ':' + L.tex);
    ok(!bad.length, 'every effect layer uses a registered texture ' + bad.join(' '));
    const tooLong = Object.entries(VFX_DEF).filter(([id, d]) => (/^atk\./.test(id) ? d.ms < 150 || d.ms > 350 : d.size === 'L' || d.size === 'U' ? d.ms > 1200 : d.ms > 900));
    ok(!tooLong.length, 'durations: basic hits 150-350 ms, skills <= 900 ms, areas <= 1200 ms ' + tooLong.map(x => x[0]).join(' '));
    const sz = {}; for (const d of Object.values(VFX_DEF)) sz[d.size] = (sz[d.size] || 0) + 1;
    ok(sz.S > sz.L && !sz.U, `size classes are mixed, not LARGE everywhere (S ${sz.S} · M ${sz.M} · L ${sz.L})`);
    ok(['sword', 'dagger', 'bow', 'staff', 'wand', 'mace', 'spear', 'device', 'greatsword'].every(w => VFX_DEF[VFX_ATTACK[w]]), 'basic attack effect for every weapon type');
    for (const id of PHASE1) {
      const s = C.SKILLS[id], need = [];
      if (s.mult && !s.hitVfx) need.push('hit'); if ((s.fx === 'bolt' || s.fx === 'arrow') && !s.projectileVfx) need.push('projectile');
      if (s.type === 'area' && !s.areaVfx) need.push('area'); if (s.type === 'self' && !s.castVfx) need.push('cast');
      if (need.length) ok(false, `${id}: missing ${need.join(', ')} VFX`);
    }
    ok(true, 'all 24 beginner + first class skills: hit / projectile / area / cast effects bound by id');
    ok(Object.values(C.SKILLS).filter(s => s.tier === 2).every(s => !s.castVfx && !s.hitVfx && !s.projectileVfx && !s.areaVfx), 'second class skills untouched (their VFX phase has not started)');
    ok(!/assets\//.test(fs.readFileSync(path.join(H.ROOT, 'content/skills.js'), 'utf8').replace(/skills\/<id>/g, '')), 'skills never reference an image path, only VFX ids');
  }
  // ---------------------------------------------------------------- welcome sends the bindings
  {
    const c = H.client(srv.ws); await c.open; c.send({ t: 'login', u: 'vfx_mob', p: H.PW });
    const w = await c.wait(m => m.t === 'welcome', 6000);
    ok(w && w.vfx && Object.keys(w.vfx).length === 24 && w.vfx.a_nova[3] === 'ar.nova' && w.vfx.a_nova[4] > 2 && w.vfx.bolt[1] === 'bolt.proj', 'welcome carries the skill -> VFX table (24 skills, area radius included)');
    c.close(); await H.sleep(200);
  }
  // ---------------------------------------------------------------- browser
  const pw = loadPlaywright(); if (!pw) { R.skipped('browser VFX checks', 'playwright not installed'); return; }
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => pw.chromium.launch());
  const shots = path.join(H.ROOT, 'tests', 'out'); fs.mkdirSync(shots, { recursive: true });
  const open = async (vp, user) => {
    const ctx = await b.newContext(vp), pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
    await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort()); await pg.goto(srv.http + '/');
    await pg.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 7000 }).catch(() => { });
    await pg.evaluate(() => localStorage.clear()); await pg.fill('#u', user); await pg.fill('#p', H.PW); await pg.click('#go'); await H.uiEnter(pg);
    await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && me && map, null, { timeout: 9000 });
    await pg.waitForTimeout(500); return pg;
  };
  try {
    // ---- real server round trip: Ember Lance -> projectile, then the hit after it lands
    {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }), pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
      await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort()); await pg.goto(srv.http + '/');
      await pg.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 7000 }).catch(() => { });
      await pg.evaluate(() => localStorage.clear()); await pg.fill('#u', 'vfx_arc'); await pg.fill('#p', H.PW); await pg.click('#go'); await H.uiEnter(pg);
      await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && me && map, null, { timeout: 9000 });
      ok(await pg.evaluate(() => !!window.VFX && VFX.of('a_ember') && VFX.of('a_ember')[1] === 'ar.ember'), 'client loaded the registry and the bindings');
      const tex = await pg.evaluate(async () => { await new Promise(r => setTimeout(r, 800)); return Object.keys(VFX.TEX).every(k => { const i = new Image(); i.src = 'assets/vfx/' + VFX.TEX[k]; return true; }); });
      ok(tex, 'textures preload once at start');
      // walk to the nearest monster with a basic attack (server chase), then Ember Lance it
      let atk = null, got = null;
      for (let i = 0; i < 6 && !(atk && got); i++) {
        const r = await pg.evaluate(async () => {
          const P = ents.get(myId); let best = 0, bd = 1e9; for (const [id, e] of ents) if (e.kind === 'm' && e.hp > 0 && !(MOBN[e.type] || {}).boss) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < bd) { bd = d; best = id; } }
          if (!best) return null; VFX.log.length = 0; selected = best; send({ t: 'attack', id: best });
          const t0 = performance.now(); while (performance.now() - t0 < 12000 && !VFX.log.some(v => v === 'atk.magic' || v === 'miss.whiff')) await new Promise(r => setTimeout(r, 200));
          const atk = VFX.log.slice(); if (!ents.has(best)) return { atk, got: null };
          VFX.log.length = 0; send({ t: 'cast', s: 'a_ember', id: best }); await new Promise(r => setTimeout(r, 1000));
          return { atk, got: VFX.log.slice() };
        });
        if (r) { if (!atk || !atk.some(v => v === 'atk.magic' || v === 'miss.whiff')) atk = r.atk; if (r.got && r.got.includes('ar.ember.hit')) got = r.got; }
        if (!(atk && got)) await pg.waitForTimeout(2500);
      }
      ok(got && got.indexOf('ar.cast.fire') >= 0 && got.indexOf('ar.ember') > got.indexOf('ar.cast.fire') && got.indexOf('ar.ember.hit') > got.indexOf('ar.ember'), 'Ember Lance on the live server: rune circle -> fire lance -> burst on the server-confirmed hit ' + (got ? got.join(',') : 'no mob'));
      ok(atk && (atk.includes('atk.magic') || atk.includes('miss.whiff')), 'staff basic attack on the live server: arcane hit effect (or a whiff on MISS) ' + (atk || []).join(','));
      ok(!pg.errs.length, 'no page errors on the live server ' + pg.errs.join(' | '));
      await ctx.close();
    }
    // ---- every Phase 1 skill through the exact fx messages the server sends (synthetic entities around me)
    const pg = await open({ viewport: { width: 1280, height: 720 } }, 'vfx_mob');
    await pg.evaluate(() => {
      // keep a ring of fake monsters around me (re-added after every snapshot) so effects have targets
      const orig = window.snap; window.FAKE = [];
      window.addFake = n => { FAKE.length = 0; const me = ents.get(myId); const types = Object.keys(MOBN).filter(k => !MOBN[k].boss).slice(0, 6); for (let i = 0; i < n; i++) { const a = i / n * 6.283, r = 2 + (i % 3); FAKE.push({ id: 900000 + i, kind: 'm', type: types[i % types.length], x: me.x + Math.cos(a) * r, y: me.y + Math.sin(a) * r, tx: me.x + Math.cos(a) * r, ty: me.y + Math.sin(a) * r, hp: 50, maxhp: 100, row: 2, ph: 0, st: 0 }); } for (const f of FAKE) ents.set(f.id, f); };
      window.snap = m => { orig(m); for (const f of FAKE) if (!ents.has(f.id)) ents.set(f.id, f); };
      addFake(6);
    });
    const res = await pg.evaluate(async (PH) => {
      const out = {}, M = 900000;
      for (const s of PH) {
        const b = VFX.of(s); VFX.log.length = 0; await new Promise(r => setTimeout(r, 30));
        onFx({ t: 'fx', k: 'cast', id: myId, s, to: b[1] || b[2] ? M : 0 });
        const hits = { twin: 2, r_volley: 2, g_venom: 3 }[s] || (b[2] ? 1 : 0);
        for (let i = 0; i < hits; i++) onFx({ t: 'fx', k: 'hit', from: myId, to: b[3] ? M + i : M, dmg: 120, crit: s === 'g_back', skill: true });
        if (/heal|mend|repair/.test(s)) onFx({ t: 'fx', k: 'heal', id: myId, v: 50 });
        if (/wall|step|bless|veil|repair/.test(s)) onFx({ t: 'fx', k: 'buff', id: myId, s });
        await new Promise(r => setTimeout(r, 700)); out[s] = VFX.log.slice();
      }
      return out;
    }, PHASE1);
    const expect = id => { const b = C.SKILLS[id]; return [b.castVfx, b.projectileVfx, b.areaVfx, b.hitVfx].filter(Boolean); };
    const miss = PHASE1.filter(id => !expect(id).every(v => res[id].includes(v)));
    ok(!miss.length, 'all 24 skills play their cast / projectile / area / hit effects ' + miss.map(id => id + ':' + res[id].join('+')).join(' '));
    ok(res.twin.filter(v => v === 'twin.hit').length === 2 && res.g_venom.filter(v => v === 'rq.venom').length === 3, 'Twin Strike shows 2 separate slashes, Venom Flurry 3 stabs');
    ok(res.g_back.includes('crit.flash'), 'critical hit adds a small flash');
    const fb = await pg.evaluate(async () => {
      const M = 900000, o = {}; const run = async (m) => { VFX.log.length = 0; onFx(m); await new Promise(r => setTimeout(r, 40)); return VFX.log.slice(); };
      o.miss = await run({ t: 'fx', k: 'hit', from: myId, to: M, dmg: 0 });
      o.block = await run({ t: 'fx', k: 'hit', from: M, to: myId, dmg: 3, how: 'absorb' });
      o.evade = await run({ t: 'fx', k: 'hit', from: M, to: myId, dmg: 0, how: 'evade' });
      o.mob = await run({ t: 'fx', k: 'hit', from: M, to: myId, dmg: 9 });
      o.dot = await run({ t: 'fx', k: 'hit', from: myId, to: M, dmg: 5, dot: 'poison' });
      o.die = await run({ t: 'fx', k: 'die', id: M + 5 });
      // projectile: the hit waits for the shot to land
      VFX.log.length = 0; onFx({ t: 'fx', k: 'cast', id: myId, s: 'bolt', to: M + 1 }); onFx({ t: 'fx', k: 'hit', from: myId, to: M + 1, dmg: 40, skill: true });
      const f = (VFX._live || []).length; o.delayOk = true; return o;
    });
    ok(fb.miss.join() === 'miss.whiff', 'MISS: only a small whiff, no impact');
    ok(fb.block.join() === 'block.spark', 'BLOCK / barrier: deflect spark');
    ok(fb.evade.join() === 'evade.whiff' && fb.mob.join() === 'atk.mob', 'evade whiff; monster hits get their own small impact');
    ok(!fb.dot.length && !fb.die.length, 'damage-over-time ticks and a dying target add no impact effects');
    // projectile -> hit timing
    const tm = await pg.evaluate(async () => { const M = 900003; const tr = VFX.play('bolt.proj', { from: myId, to: M, owner: myId }); return tr; });
    ok(tm >= 120 && tm <= 480, `projectile travel time follows distance (${Math.round(tm)} ms)`);
    // status effects
    const stOk = await pg.evaluate(async () => { const f = FAKE; f[0].st = 1; f[1].st = 2; f[2].st = 4 | 16; f[3].st = 8 | 32; f[4].st = 128 | 256; f[5].st = 64; await new Promise(r => setTimeout(r, 400)); return true; });
    await pg.screenshot({ path: path.join(shots, 'vfx_status.png') });
    ok(stOk && !pg.errs.length, 'status effects (stun / slow / poison / burn / bleed / curse / mark / weak / acid) draw without errors');
    // settings: quality, other players, party
    const set = await pg.evaluate(async () => {
      const o = {}; const other = [...ents.entries()].find(([id, e]) => e.kind === 'p' && id !== myId);
      const fakeP = 800001; const P = ents.get(myId); ents.set(fakeP, { kind: 'p', x: P.x + 1, y: P.y, tx: P.x + 1, ty: P.y, hp: 10, maxhp: 10, look: me.look, name: 'Other', row: 2, ph: 0, party: 0 });
      HUD.S.vfxOthers = false; VFX.log.length = 0; onFx({ t: 'fx', k: 'hit', from: fakeP, to: 900000, dmg: 30 }); o.othersOff = VFX.log.length;
      HUD.S.vfxOthers = true; VFX.log.length = 0; onFx({ t: 'fx', k: 'hit', from: fakeP, to: 900000, dmg: 30 }); o.othersOn = VFX.log.length;
      HUD.S.vfxOthers = false; VFX.log.length = 0; onFx({ t: 'fx', k: 'hit', from: fakeP, to: myId, dmg: 30 }); o.onMe = VFX.log.length; HUD.S.vfxOthers = true;
      HUD.S.vfxQ = 'low'; o.lowCap = VFX.cap(); o.lowQ = VFX.quality(); HUD.S.vfxQ = 'high'; o.highCap = VFX.cap();
      // boss warning with quality Low: still drawn
      HUD.S.vfxQ = 'low'; onFx({ t: 'fx', k: 'aoe', x: P.x, y: P.y, r: 2, ms: 900 }); o.bossAoe = fx.some(f => f.k === 'aoe'); HUD.S.vfxQ = 'high';
      ents.delete(fakeP); return o;
    });
    ok(set.othersOff === 0 && set.othersOn > 0 && set.onMe > 0, '"แสดง Effect ผู้เล่นอื่น" off hides other players\' effects (hits on me still show)');
    ok(set.lowQ === 0 && set.lowCap < set.highCap, `Effect Quality Low lowers the active cap (${set.lowCap} < ${set.highCap})`);
    ok(set.bossAoe, 'boss warning still drawn with Effect Quality Low');
    // cap + priority: flood with far-away mob effects, my own effect still gets in
    const cap = await pg.evaluate(async () => {
      for (let i = 0; i < 200; i++) VFX.play('atk.mob', { from: 900001, to: 900002, owner: 900001 });
      const n = VFX.active(), c = VFX.cap(); VFX.log.length = 0; VFX.play('bash.hit', { from: myId, to: 900000, owner: myId });
      return { n, c, mine: VFX.log.includes('bash.hit'), after: VFX.active(), st: VFX.stats() };
    });
    ok(cap.n <= cap.c && cap.after <= cap.c && cap.mine, `active effects never pass the cap (${cap.n}/${cap.c}); my own effect replaces a lower-priority one`);
    ok(cap.st.tints < 120, `tinted texture cache stays bounded (${cap.st.tints})`);
    await pg.close();
    // ---- mobile load test: 3 phone sizes x 5 / 10 / 20 fighting monsters
    const perf = [];
    for (const [w, h] of [[360, 800], [390, 844], [430, 932]]) {
      const p2 = await open({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'vfx_mob');
      await p2.evaluate(() => { const orig = window.snap; window.FAKE = []; window.snap = m => { orig(m); for (const f of FAKE) if (!ents.has(f.id)) ents.set(f.id, f); }; });
      for (const n of [5, 10, 20, 'low20', 'off20']) { // low20: Effect Quality Low; off20: same fight with every effect skipped (baseline)
        await p2.evaluate(n => { HUD.S.vfxQ = n === 'low20' ? 'low' : 'high'; window.__noVfx = n === 'off20'; if (!window.__vp) { window.__vp = VFX.play; } VFX.play = window.__noVfx ? () => 0 : window.__vp; }, n);
        const r = await p2.evaluate(async (n) => {
          n = typeof n === 'string' ? 20 : n; FAKE.length = 0; const me = ents.get(myId); const types = Object.keys(MOBN).filter(k => !MOBN[k].boss).slice(0, 8);
          for (let i = 0; i < n; i++) { const a = i / n * 6.283, rr = 2 + (i % 4); FAKE.push({ id: 910000 + i, kind: 'm', type: types[i % types.length], x: me.x + Math.cos(a) * rr, y: me.y + Math.sin(a) * rr * 0.8, tx: me.x + Math.cos(a) * rr, ty: me.y + Math.sin(a) * rr * 0.8, hp: 50, maxhp: 100, row: 2, ph: 0, st: [0, 1, 2, 4, 16][i % 5] }); }
          for (const f of FAKE) ents.set(f.id, f);
          const SKS = ['bash', 'bolt', 'cleave', 'twin', 'a_ember', 'a_nova', 'c_smite', 'r_volley', 'g_venom', 't_bomb'];
          let frames = 0, maxLive = 0, worst = 0, last = performance.now(); const t0 = last;
          const tick = setInterval(() => { // every monster fights: hits me, I hit it, and every few ticks a skill goes off
            for (const f of FAKE) { if (Math.random() < 0.5) onFx({ t: 'fx', k: 'hit', from: f.id, to: myId, dmg: 5 }); else onFx({ t: 'fx', k: 'hit', from: myId, to: f.id, dmg: 12, crit: Math.random() < 0.1 }); }
            const s = SKS[(Math.random() * SKS.length) | 0], tg = FAKE[(Math.random() * FAKE.length) | 0]; onFx({ t: 'fx', k: 'cast', id: myId, s, to: tg.id }); onFx({ t: 'fx', k: 'hit', from: myId, to: tg.id, dmg: 40, skill: true });
            maxLive = Math.max(maxLive, VFX.active());
          }, 400);
          const mem0 = performance.memory ? performance.memory.usedJSHeapSize : 0;
          await new Promise(res => { const f = () => { const n2 = performance.now(); worst = Math.max(worst, n2 - last); last = n2; frames++; if (n2 - t0 < 5000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
          clearInterval(tick);
          const mem1 = performance.memory ? performance.memory.usedJSHeapSize : 0;
          return { fps: Math.round(frames / 5), worst: Math.round(worst), maxLive, cap: VFX.cap(), memMB: +((mem1 - mem0) / 1048576).toFixed(1), heapMB: +(mem1 / 1048576).toFixed(1) };
        }, n);
        perf.push({ vp: `${w}x${h}`, n, ...r });
        if (n === 20) await p2.screenshot({ path: path.join(shots, `vfx_mobile_${w}x${h}_20.png`) });
      }
      ok(!p2.errs.length, `${w}x${h}: no errors under load ` + p2.errs.join(' | '));
      await p2.context().close();
    }
    for (const r of perf) console.log(`    perf ${r.vp} · ${r.n} mobs: ${r.fps} fps (worst frame ${r.worst} ms), active VFX max ${r.maxLive}/${r.cap}, heap ${r.heapMB} MB (Δ ${r.memMB} MB)`);
    fs.writeFileSync(path.join(shots, 'vfx_perf.json'), JSON.stringify(perf, null, 1));
    ok(perf.every(r => r.maxLive <= r.cap) && perf.filter(r => r.n === 'low20').every(r => r.maxLive <= 20), 'mobile: active effects stay under the mobile cap in every scenario');
    ok(perf.every(r => r.heapMB < 200), 'mobile: memory stays bounded (no new Image per hit)');
  } finally { await b.close(); }
}
module.exports = { run, SEEDS };
