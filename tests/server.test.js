'use strict';
// Server tests over the real WebSocket protocol. Part 1 = the original 23 stability tests, part 2 = Phase 2 combat authority.
const crypto = require('crypto'), http = require('http'), fs = require('fs'), path = require('path'), vm = require('vm');
const H = require('./harness');
const { sleep, client, login, me, myPos, mobsOf, cheb } = H;

// accounts seeded into the throwaway db (Lv8 knows all six skills; str 1 + no weapon keeps fights long enough to observe)
const FIELD = { lv: 8, map: 'plains', x: 20, y: 22, eq: {}, st: { str: 1, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 } };
const SEEDS = {
  s_hero: H.mkChar('SHero', { ...FIELD }),
  s_two_a: H.mkChar('STwoA', { ...FIELD }),
  s_two_b: H.mkChar('STwoB', { ...FIELD }),
  s_nosp: H.mkChar('SNoSp', { ...FIELD, sp: 0 }),
  s_heal: H.mkChar('SHeal', { ...FIELD, hp: 40, sp: 20 }),
  s_lv1: H.mkChar('SLvOne', { lv: 1 }),
  s_frag: H.mkChar('SFrag', { ...FIELD, hp: 1, st: { str: 1, agi: 1, vit: 1, int: 5, dex: 5, luk: 1 } }),
  s_map: H.mkChar('SMap', { ...FIELD, x: 4, y: 22 }),
  s_pot: H.mkChar('SPot', { ...FIELD, hp: 20 }),
  s_nopot: H.mkChar('SNoPot', { ...FIELD, hp: 20, inv: [{ id: 10, q: 3 }] }),
  s_hot: H.mkChar('SHot', { ...FIELD }),
  s_spam: H.mkChar('SSpam', { ...FIELD }),
  s_town: H.mkChar('STown', { ...FIELD, map: 'solkara', x: 21, y: 20 }),
};

// walk in with the old chase-attack and wait for the first landed swing (0 dmg misses count too)
async function engage(c, pick) {
  for (let tries = 0; tries < 4; tries++) {
    const pos = myPos(c); const list = mobsOf(c).filter(m => (!pick || pick(m)) && m.type !== 'kingjel').sort((a, b) => cheb([a.x, a.y], pos) - cheb([b.x, b.y], pos));
    const mob = list[0]; if (!mob) { await sleep(500); continue; }
    c.send({ t: 'attack', id: mob.id });
    const hit = await c.wait(m => m.t === 'fx' && m.k === 'hit' && m.from === c.id && m.to === mob.id, 20000);
    if (hit) return mob;
  }
  return null;
}

async function run(srv, R) {
  const ok = R.ok, URL = srv.ws;
  const get = p => new Promise(r => http.get(srv.http + p, res => { res.resume(); r(res.statusCode); }).on('error', () => r(0)));

  // ================================================================ part 1: original stability suite (23)
  ok(crypto.scryptSync('pw1234', 'abc', 32).toString('hex') === await new Promise(r => crypto.scrypt('pw1234', 'abc', 32, (e, k) => r(k.toString('hex')))), 'async scrypt matches scryptSync (old hashes still valid)');
  ok(await get('/%E0%A4%A') === 400, 'malformed URL -> 400');
  ok(await get('/a%00b') === 400, 'null byte URL -> 400');
  ok(await get('/..%2f..%2fdata/db.json') !== 200, 'path traversal blocked');
  ok(await get('/') === 200 && await get('/game.js') === 200 && await get('/combat.js') === 200 && await get('/assets/meta.json') === 200, 'static files still served');
  { // static files revalidate cheaply: same ETag -> 304 without a body
    const r1 = await new Promise(r => http.get(srv.http + '/assets/ui/ui.json', res => { res.resume(); r(res); }));
    const r2 = await new Promise(r => http.get(srv.http + '/assets/ui/ui.json', { headers: { 'If-None-Match': r1.headers.etag } }, res => { res.resume(); r(res); }));
    ok(r1.statusCode === 200 && !!r1.headers.etag && r2.statusCode === 304, 'static files: ETag + 304 on revalidation (UI art not re-downloaded)');
    ok(await get('/assets/') === 404 && await get('/nope.png') === 404, 'directories / missing files -> 404');
  }
  const big = client(URL); await big.open; big.ws.send('x'.repeat(5000)); await big.closed; await sleep(200);
  ok(await get('/') === 200, 'server alive after oversized ws message');

  const u = 'tester' + (Date.now() % 100000);
  const a = client(URL); await a.open;
  a.send({ t: 'register', u, p: 'secret1', name: 'Tst' + (Date.now() % 10000), cc: 1 });
  const aw = await a.wait(m => m.t === 'welcome'); a.id = aw && aw.id;
  ok(!!aw, 'register + enter world');
  const me0 = (await a.wait(m => m.t === 'me')).c;
  ok(me0 && me0.inv.length === 1 && me0.zeny === 300, 'new char has starting items/zeny');
  a.send({ t: 'buy', id: 20, q: 99 }); await sleep(300);
  ok(me(a).inv.length <= 40 && me(a).zeny === 300, 'bulk gear buy cannot overflow bag');
  a.send({ t: 'buy', id: 1, q: 2 }); await sleep(300);
  ok(me(a).zeny === 200 && me(a).inv[0].q === 12, 'normal potion buy still works');
  a.send({ t: 'sell', i: 0, id: 99, q: 1 }); await sleep(200); ok(me(a).zeny === 200, 'sell with mismatched id ignored');
  a.send({ t: 'sell', i: 0, q: 1 }); await sleep(200); ok(me(a).zeny === 212, 'sell without id (old client) still works');
  a.send({ t: 'stat', s: 'constructor' }); a.send({ t: 'stat', s: 'str' }); await sleep(200);
  ok(me(a).st.str === 6 && me(a).pts === 9, 'stat whitelist ok, normal stat add works');
  a.send({ t: 'npc', id: 'warp' }); ok(!!await a.wait(m => m.t === 'dlg' && m.npc === 'warp', 6000), 'walk to NPC + dialog');
  a.send({ t: 'npcAct', id: 'warp', a: 'go:plains' }); ok(!!await a.wait(m => m.t === 'map' && m.map.id === 'plains'), 'warp to plains');
  await sleep(400);
  const jel = await engage(a, m => m.type === 'jellop');
  ok(!!jel && !!await a.wait(m => m.t === 'fx' && m.k === 'die' && m.id === jel.id, 25000), 'combat: killed a jellop');
  await sleep(300); ok(me(a).exp > 0 && me(a).q.k === 1, 'exp + quest progress granted');
  const b = client(URL); await b.open;
  for (let i = 0; i < 5; i++) { b.send({ t: 'login', u, p: 'wrongpw' }); await sleep(250); }
  ok(b.msgs.filter(m => m.t === 'err').length === 5, 'wrong password rejected');
  ok(await Promise.race([b.closed.then(() => true), sleep(1500).then(() => false)]), 'connection closed after 5 failed logins');
  const c = client(URL); await c.open; c.send({ t: 'login', u, p: 'secret1' });
  ok(!!await c.wait(m => m.t === 'welcome'), 'login with correct password');
  ok(!!await a.wait(m => m.t === 'err' && /ที่อื่น/.test(m.m)), 'old session told it was kicked');
  await sleep(500);
  ok(c.snap.p.filter(p => p[1] === me0.name).length === 1, 'only one copy of the character in the world after re-login');
  ok(me(c).exp === me(a).exp, 'progress carried into the new session');
  c.close(); a.close();

  // ================================================================ part 2: Phase 2 combat authority
  const h = await login(URL, 's_hero');
  const wel = h.msgs.find(m => m.t === 'welcome');
  ok(wel.skills && Object.keys(wel.skills).length === 6 && wel.skills.bash.sp === 8 && wel.skills.bolt.range === 6, 'welcome carries skill definitions');
  ok(Object.keys(me(h).sk).length === 6 && Array.isArray(me(h).hot) && me(h).hot.length === 6, 'Lv8 owns 6 skills, hotbar has 6 slots');

  // invalid / hostile packets: never crash, always a clean refusal
  for (const s of ['constructor', '__proto__', 'toString', 123, null, { x: 1 }, 'x'.repeat(500)]) h.send({ t: 'cast', s, id: 1 });
  await sleep(200);
  for (const pkt of [{ t: 'cast' }, { t: 'attack', id: { a: 1 } }, { t: 'attack', id: 'abc', n: 1 }, { t: 'hot', h: 'x' }, { t: 'hot', h: new Array(100).fill('bash') }, { t: 'cast', s: 'bash', id: -1 }, { t: 'skill', id: null }]) h.send(pkt);
  await sleep(300);
  ok(srv.alive() && await get('/') === 200, 'junk combat packets do not crash the server');
  const fb = await (async () => { const h2 = await login(URL, 's_spam'); h2.send({ t: 'cast', s: '__proto__', id: 1 }); return h2.wait(m => m.t === 'castfail', 1500).then(x => (h2.close(), x)); })();
  ok(fb && fb.r === 'bad', 'unknown skill id -> castfail bad', JSON.stringify(fb));
  ok(me(h).hot.length === 6 && me(h).hot.filter(x => x === 'bash').length <= 1, 'hotbar packet with 100 duplicate entries is clamped to 6 unique slots');

  // invalid target ids
  await sleep(200); h.send({ t: 'cast', s: 'bash', id: 99999999 });
  let f = await h.next(m => m.t === 'castfail', 1500); ok(f && f.r === 'target', 'cast on non-existent target -> target', JSON.stringify(f));
  await sleep(200); h.send({ t: 'attack', id: 'abc', n: 1 });
  f = await h.next(m => m.t === 'castfail', 1500); ok(f && f.s === 'attack' && f.r === 'target', 'attack button on invalid id -> target', JSON.stringify(f));

  // ownership
  const l1 = await login(URL, 's_lv1'); l1.send({ t: 'cast', s: 'twin', id: 1 });
  f = await l1.next(m => m.t === 'castfail', 1500); ok(f && f.r === 'own' && f.lv === 8, 'Lv1 cannot cast a Lv8 skill (own)', JSON.stringify(f));
  l1.send({ t: 'hot', h: ['twin', 'bash', null, null, null, null] }); await sleep(300);
  ok(me(l1).hot[0] === null && me(l1).hot[1] === 'bash', 'hotbar refuses unlearned skills');
  l1.close();

  // out of range: nearest monster that is clearly far
  await sleep(300);
  const pos = myPos(h);
  const far = mobsOf(h).filter(m => cheb([m.x, m.y], pos) > 7).sort((x, y) => cheb([x.x, x.y], pos) - cheb([y.x, y.y], pos))[0];
  if (far) {
    h.send({ t: 'cast', s: 'bolt', id: far.id }); f = await h.next(m => m.t === 'castfail', 1500); ok(f && f.r === 'range', 'ranged skill out of range -> range', JSON.stringify(f));
    await sleep(200); h.send({ t: 'cast', s: 'bash', id: far.id }); f = await h.next(m => m.t === 'castfail', 1500); ok(f && f.r === 'range', 'melee skill out of range -> range', JSON.stringify(f));
    await sleep(200); h.send({ t: 'attack', id: far.id, n: 1 }); f = await h.next(m => m.t === 'castfail', 1500); ok(f && f.s === 'attack' && f.r === 'range', 'attack button out of range -> no hit, range', JSON.stringify(f));
  } else R.skipped('out-of-range checks', 'no far monster in snapshot');
  { // town never has monsters, so "nobody in range" is guaranteed there
    const tw = await login(URL, 's_town'); const sp0 = me(tw).sp;
    tw.send({ t: 'cast', s: 'cleave' }); f = await tw.next(m => m.t === 'castfail', 1500); await sleep(150);
    ok(f && f.r === 'notarget' && me(tw).sp === sp0, 'area skill with nobody around -> notarget (no SP spent)', JSON.stringify(f));
    tw.close();
  }

  // in range: skill lands, cooldown enforced server-side
  const mob = await engage(h, m => m.type === 'crab');
  ok(!!mob, 'chase-attack (tap a selected monster again) still walks in and hits');
  if (mob && h.snap.m.some(m => m[0] === mob.id)) {
    const sp0 = me(h).sp; let since = h.msgs.length;
    await sleep(450); h.send({ t: 'cast', s: 'bash', id: mob.id });
    const cast = await h.wait(m => m.t === 'fx' && m.k === 'cast' && m.id === h.id && m.s === 'bash', 2000);
    const cdm = await h.wait(m => m.t === 'cd' && m.s === 'bash', 2000);
    ok(!!cast && !!cdm && cdm.ms === 1200, 'bash in range: cast fx + server cooldown 1200ms');
    ok(!!await h.wait(m => m.t === 'fx' && m.k === 'hit' && m.from === h.id && m.skill, 2000), 'bash hit is flagged as a skill hit');
    await sleep(100); ok(me(h).sp <= sp0 - 6, 'SP cost (8) charged by server', `${sp0} -> ${me(h).sp}`); // allow 1-2 SP of regen
    h.send({ t: 'cast', s: 'bash', id: mob.id }); f = await h.next(m => m.t === 'castfail', 1500);
    ok(f && f.r === 'cd' && f.ms > 0 && f.ms <= 1200, 'recast during cooldown refused with remaining ms', JSON.stringify(f));
    // skill spam: 40 casts in a burst -> at most one cast inside the cooldown window
    // monsters die fast; if this one is gone, walk to a fresh crab instead of skipping the check
    const fresh = async () => (h.snap.m.some(m => m[0] === mob.id) ? mob : await engage(h, m => m.type === 'crab'));
    await sleep(1300);
    let sm = await fresh(); await sleep(1300); since = h.msgs.length;
    if (sm) {
      for (let i = 0; i < 40; i++) h.send({ t: 'cast', s: 'bash', id: sm.id });
      await sleep(900);
      const casts = h.count(m => m.t === 'fx' && m.k === 'cast' && m.id === h.id, since), fails = h.count(m => m.t === 'castfail', since);
      ok(casts <= 1, 'skill spam (40 packets) -> at most 1 cast per cooldown', `casts=${casts}`);
      ok(fails <= 7, 'refusal replies are throttled (no reply flood)', `replies=${fails}`);
    } else R.skipped('skill spam', 'monster died early');
    // attack spam: 40 attack-button packets -> swings still limited by attack speed
    sm = h.snap.m.some(m => m[0] === (sm && sm.id)) ? sm : await engage(h, m => m.type === 'crab'); since = h.msgs.length;
    if (sm) {
      for (let i = 0; i < 40; i++) h.send({ t: 'attack', id: sm.id, n: 1 });
      await sleep(2000);
      const hits = h.count(m => m.t === 'fx' && m.k === 'hit' && m.from === h.id && !m.skill, since);
      ok(hits <= 3, 'attack spam (40 packets) -> swings limited by aspd (~1.3s)', `hits=${hits}`);
    } else R.skipped('attack spam', 'monster died early');
  }
  h.close();

  // SP not enough
  const ns = await login(URL, 's_nosp'); ns.send({ t: 'cast', s: 'heal' });
  f = await ns.next(m => m.t === 'castfail', 1500); ok(f && f.r === 'sp', 'SP 0 -> castfail sp, skill not used', JSON.stringify(f));
  ok(!ns.msgs.some(m => m.t === 'fx' && m.k === 'cast'), 'no cast fx when SP is short');
  ns.close();

  // self skills: heal number + SP recovery number come from the server
  const hl = await login(URL, 's_heal'); const hp0 = me(hl).hp;
  hl.send({ t: 'cast', s: 'heal' });
  const hf = await hl.wait(m => m.t === 'fx' && m.k === 'heal' && m.id === hl.id && m.v > 0, 2000);
  await sleep(150); ok(!!hf && me(hl).hp === Math.min(me(hl).maxhp, hp0 + hf.v), 'First Aid heals on the server and reports +HP', `hp ${hp0} -> ${me(hl).hp}, v=${hf && hf.v}`);
  await sleep(450); hl.send({ t: 'cast', s: 'focus' });
  const sf = await hl.wait(m => m.t === 'fx' && m.k === 'heal' && m.id === hl.id && m.sp > 0, 2000);
  ok(!!sf, 'Focus restores SP and reports +SP', JSON.stringify(sf));
  hl.close();

  // potion: server checks the real item
  const po = await login(URL, 's_pot'); const php = me(po).hp, pq = me(po).inv.find(s => s.id === 1).q;
  po.send({ t: 'use', i: 0, id: 1 }); await sleep(300);
  ok(me(po).hp > php && me(po).inv.find(s => s.id === 1).q === pq - 1, 'potion heals and is consumed', `${php}->${me(po).hp}`);
  ok(!!po.msgs.find(m => m.t === 'fx' && m.k === 'heal' && m.v > 0), 'potion heal fx carries the amount');
  po.close();
  const np = await login(URL, 's_nopot'); const nhp = me(np).hp;
  np.send({ t: 'use', i: 0, id: 1 }); np.send({ t: 'use', i: 5, id: 1 }); await sleep(300);
  ok(me(np).hp === nhp && me(np).inv[0].q === 3, 'no potion -> nothing healed, nothing consumed');
  np.close();

  // hotbar save + reload
  const ho = await login(URL, 's_hot'); ho.send({ t: 'hot', h: ['bolt', 'bash', 'twin', null, 'focus', 'cleave'] }); await sleep(300);
  ho.close(); await sleep(400);
  const ho2 = await login(URL, 's_hot');
  ok(JSON.stringify(me(ho2).hot) === JSON.stringify(['bolt', 'bash', 'twin', null, 'focus', 'cleave']), 'hotbar saved on the character and restored on login', JSON.stringify(me(ho2).hot));
  ho2.close();

  // two players on the same monster: both credited
  const p1 = await login(URL, 's_two_a'), p2 = await login(URL, 's_two_b');
  // a fresh crab (earlier tests leave half-dead ones behind) lasts long enough for the second player to arrive
  const shared = await engage(p1, m => m.type === 'crab' && m.hp === m.maxhp);
  if (shared) {
    const e1 = me(p1).exp + me(p1).lv * 1e6, e2 = me(p2).exp + me(p2).lv * 1e6;
    p2.send({ t: 'attack', id: shared.id });
    const p2hit = await p2.wait(m => m.t === 'fx' && m.k === 'hit' && m.from === p2.id && m.to === shared.id, 25000);
    const died = await p1.wait(m => m.t === 'fx' && m.k === 'die' && m.id === shared.id, 30000);
    await sleep(400);
    ok(!!p2hit && !!died, 'two players fight the same monster until it dies', JSON.stringify({ p2hit: !!p2hit, died: !!died, p1: myPos(p1), p2: myPos(p2), mob: mobsOf(p1).find(m => m.id === shared.id) }));
    ok(me(p1).exp + me(p1).lv * 1e6 > e1 && me(p2).exp + me(p2).lv * 1e6 > e2, 'both players receive EXP for the shared kill');
    // target cleanup: dead monster can't be hit or cast at
    await sleep(500); p1.send({ t: 'cast', s: 'bash', id: shared.id }); f = await p1.next(m => m.t === 'castfail', 1500);
    ok(f && f.r === 'target', 'casting on a dead monster -> target', JSON.stringify(f));
  } else R.skipped('two players same monster', 'could not reach a monster');
  p1.close(); p2.close();

  // map change: the old map's monster id is no longer a valid target
  const mc = await login(URL, 's_map'); const oldMob = mobsOf(mc)[0];
  mc.send({ t: 'move', x: 0, y: 22 });
  ok(!!await mc.wait(m => m.t === 'map' && m.map.id === 'solkara', 8000), 'walk through portal -> map change');
  await sleep(300);
  if (oldMob) {
    mc.send({ t: 'attack', id: oldMob.id, n: 1 }); f = await mc.next(m => m.t === 'castfail', 1500); ok(f && f.r === 'target', 'attack after map change on old target -> target', JSON.stringify(f));
    await sleep(200); mc.send({ t: 'cast', s: 'bash', id: oldMob.id }); f = await mc.next(m => m.t === 'castfail', 1500); ok(f && f.r === 'target', 'skill after map change on old target -> target', JSON.stringify(f));
  }
  mc.close();

  // death mid-combat: no casting or attacking while dead
  const fr = await login(URL, 's_frag');
  // walk into the nearest crab; it hits back and 1 HP doesn't last. If the crab dies first, take the next one.
  let fmob = null, died = null;
  for (let i = 0; i < 5 && !died; i++) {
    const fpos = myPos(fr); fmob = mobsOf(fr).filter(m => m.type === 'crab').sort((x, y) => cheb([x.x, x.y], fpos) - cheb([y.x, y.y], fpos))[0];
    if (!fmob) { await sleep(1000); continue; }
    fr.send({ t: 'attack', id: fmob.id });
    died = await fr.wait(m => m.t === 'fx' && ((m.k === 'pdie' && m.id === fr.id) || (m.k === 'die' && m.id === fmob.id)), 25000);
    if (died && died.k === 'die') died = await fr.wait(m => m.t === 'fx' && m.k === 'pdie' && m.id === fr.id, 300);
  }
  if (died) {
    await sleep(200); fr.send({ t: 'cast', s: 'heal' }); f = await fr.next(m => m.t === 'castfail', 1500);
    ok(f && f.r === 'dead', 'dead player cannot cast (dead)', JSON.stringify(f));
    const since = fr.msgs.length; fr.send({ t: 'attack', id: fmob.id, n: 1 }); fr.send({ t: 'cast', s: 'bash', id: fmob.id }); await sleep(800);
    ok(!fr.msgs.slice(since).some(m => m.t === 'fx' && (m.k === 'hit' || m.k === 'cast') && m.from === fr.id), 'dead player deals no damage');
    fr.send({ t: 'respawn' }); ok(!!await fr.wait(m => m.t === 'map' && m.map.id === 'solkara', 3000), 'respawn after death still works');
  } else R.skipped('death mid-combat', 'fragile character did not die in time');
  fr.close();

  // legacy Bash message (old client) still works through the new rules
  const lg = await login(URL, 's_spam'); lg.send({ t: 'skill', id: 99999 }); await sleep(300);
  ok(srv.alive(), 'legacy skill message on bad target handled');
  lg.close();

  // line of sight: unit-test the server's own los() against a hand-made map
  const src = fs.readFileSync(path.join(H.ROOT, 'server.js'), 'utf8');
  const code = src.slice(src.indexOf('const BLOCK_LOS'), src.indexOf('const reach ='));
  const W = 6, tiles = new Array(W * W).fill(0); tiles[2 * W + 2] = 3; tiles[1 * W + 4] = 3; tiles[0 * W + 3] = 3; // wall at (2,2), corner walls (4,1),(3,0)
  const ctx = { get: (m, x, y) => (x < 0 || y < 0 || x >= W || y >= W) ? 3 : tiles[y * W + x], Math };
  vm.runInNewContext(code + '; this.los = los;', ctx);
  ok(ctx.los(null, 1, 2, 3, 2) === false, 'line of sight: blocked by a wall between attacker and target');
  ok(ctx.los(null, 1, 1, 3, 1) === true, 'line of sight: clear row');
  ok(ctx.los(null, 3, 1, 4, 0) === false, 'line of sight: no hitting diagonally through a wall corner');
  ok(ctx.los(null, 1, 4, 2, 3) === true, 'line of sight: open diagonal');
}

module.exports = { SEEDS, run };
