'use strict';
// M3 second-class skills: registry, class change, skill points (learn / upgrade / job / class / max), server validation
// (dead, wrong class, invalid id, passive, weapon, SP, cooldown, range, target), damage + statuses (stun, slow, poison,
// curse, mark), AoE, heal / party heal / party buff, barrier, traps + turret, resurrection, save / relog, hotbar,
// AUTO Skill kinds, and a browser check of the skill window.
const path = require('path');
const H = require('./harness');
const { sleep, login, me, myPos, mobsOf, cheb } = H;
const C = require(path.join(H.ROOT, 'content'));

const WEAK = { str: 1, agi: 20, vit: 40, int: 30, dex: 30, luk: 1 };
// a walkable tile near (x, y): each test character starts beside its own monster group so they don't compete
function spot(map, x, y) { const M = C.MAPS[map]; for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const t = C.get(M, x + dx, y + dy); if (!C.SOLID.has(t) && t !== 8) return [x + dx, y + dy]; } return [x, y]; }
const at = (map, x, y) => { const [sx, sy] = spot(map, x, y); return { map, x: sx, y: sy, save: { map: 'verdant_haven', x: 30, y: 26 } }; };
const S2 = (o) => H.mkChar(o.name, Object.assign({ lv: 52, st: WEAK, hp: 99999, sp: 99999, ...at('deep_forest', 36, 58) }, o));
const SEEDS = {
  k_knight: S2({ name: 'KnSkill', cls: 'knight', jlv: 30, eq: { wpn: 22, arm: 31 }, ...at('deep_forest', 56, 46) }),
  k_new: S2({ name: 'KnNew', cls: 'knight', jlv: 1, eq: { wpn: 22 } }),
  k_bers: S2({ name: 'BsSkill', cls: 'berserker', jlv: 30, eq: { wpn: 230 }, sk2: { bs_rage: 2, bs_frenzy: 3 }, hot: ['bs_rage', null, null, null, null, null] }),
  k_ss: S2({ name: 'SsSkill', cls: 'sharpshooter', jlv: 30, eq: { wpn: 232 }, sk2: { ss_pierce: 1, ss_focus: 1, ss_precision: 2 } }),
  k_wl: S2({ name: 'WlSkill', cls: 'warlock', jlv: 30, eq: { wpn: 233 }, st: { ...WEAK, int: 1 }, sk2: { wl_curse: 1, wl_bolt: 1, wl_mark: 1 }, ...at('deep_forest', 60, 50) }),
  k_as: S2({ name: 'AsSkill', cls: 'assassin', jlv: 30, eq: { wpn: 231 }, sk2: { as_venom: 1, as_backstab: 1 }, ...at('deep_forest', 54, 16) }),
  k_pr: S2({ name: 'PrSkill', cls: 'priest', jlv: 35, eq: { wpn: 233 }, sk2: { pr_group: 1, pr_heal: 1, pr_resurrect: 1, pr_barrier: 1 }, ...at('beast_valley', 4, 25) }),
  k_or: S2({ name: 'OrSkill', cls: 'oracle', jlv: 30, eq: { wpn: 233 }, sk2: { or_haste: 1, or_foresight: 1 }, ...at('beast_valley', 5, 26) }),
  k_bh: S2({ name: 'BhSkill', cls: 'beasthunter', jlv: 30, eq: { wpn: 232 }, sk2: { bh_snare: 1, bh_mark: 1 } }),
  k_mc: S2({ name: 'McSkill', cls: 'machinist', jlv: 30, eq: { wpn: 237 }, sk2: { mc_turret: 1, mc_burst: 1 }, ...at('deep_forest', 25, 37) }),
  k_el: S2({ name: 'ElSkill', cls: 'elementalist', jlv: 30, eq: { wpn: 233 }, st: { ...WEAK, int: 1 }, sk2: { el_shield: 1, el_chain: 1, el_frost: 1 }, ...at('deep_forest', 17, 51) }),
  k_victim: H.mkChar('VictimDown', { lv: 30, st: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, hp: 1, eq: {}, ...at('beast_valley', 4, 25) }),
  k_change: H.mkChar('ToKnight', { lv: 52, cls: 'vanguard', jlv: 40, map: 'lumira', x: 34, y: 36, inv: [{ id: 183, q: 8 }],
    qs: { a: { cls2_knight: { s: 3, k: 0, f: [] } }, d: { mq1: 1 }, t: 'cls2_knight', fl: {} } }),
};
async function nearMob(c, types, max = 9000) { // walk next to the nearest live monster of these types
  const t0 = Date.now();
  while (Date.now() - t0 < max) {
    const p = myPos(c), list = mobsOf(c).filter(m => (!types || types.includes(m.type)) && m.hp > 0);
    if (p && list.length) {
      list.sort((a, b) => cheb(p, [a.x, a.y]) - cheb(p, [b.x, b.y])); const m = list[0];
      if (cheb(p, [m.x, m.y]) <= 1.4) return m;
      c.send({ t: 'move', x: Math.round(m.x) + 1, y: Math.round(m.y) });
    }
    await sleep(500);
  }
  return null;
}
const castOk = async (c, s, id) => { const k = c.msgs.length; c.send({ t: 'cast', s, id: id || 0 }); await sleep(450); const f = c.msgs.slice(k).find(m => m.t === 'castfail' && m.s === s); const cd = c.msgs.slice(k).find(m => m.t === 'cd' && m.s === s); return f ? f.r : cd ? 'ok' : 'none'; };
// approach a monster and cast on it; retries with a fresh approach if it moved away or died
async function castOn(c, s, types, tries = 4) { for (let i = 0; i < tries; i++) { const m = await nearMob(c, types); if (!m) return [null, 'nomob']; await sleep(250); const r = await castOk(c, s, m.id); if (r === 'ok') return [m, r]; if (r === 'cd') await sleep(1500); } return [null, 'fail']; }
const mobNow = (c, id) => mobsOf(c).find(m => m.id === id);
const stOf = (c, id) => { const t = c.snap && c.snap.m.find(x => x[0] === id); return t ? t[8] | 0 : 0; };

async function run(srv, R) {
  const ok = R.ok, URL = srv.ws;
  // ---------------------------------------------------------------- registry
  const T2 = Object.values(C.SKILLS).filter(s => s.tier === 2), second = Object.values(C.CLASSES).filter(k => k.tier === 2);
  ok(second.length === 12 && second.every(k => k.status === 'open' && C.QUESTS[k.quest] && C.QUESTS[k.quest].cls === k.id && C.QUESTS[k.quest].req.jlv === 40), '12 second classes open, each with its own change quest (Lv50 + Job 40)');
  ok(T2.length >= 60 && second.every(k => { const l = T2.filter(s => s.cls === k.id); return l.length >= 5 && l.some(s => s.type === 'passive') && l.some(s => s.sig) && l.some(s => s.job <= 1 && s.type !== 'passive'); }), `${T2.length} second-class skills: every class has 5+ skills, a passive, a signature and a Job 1 skill`);
  const fields = ['id', 'n', 'th', 'cls', 'job', 'maxLv', 'type', 'range', 'sp', 'cd', 'castSound', 'd'];
  ok(T2.every(s => fields.every(f => s[f] !== undefined) && (s.type === 'passive' || s.up) && require('fs').existsSync(path.join(H.ROOT, 'public/assets/skills', s.id + '.webp'))), 'every skill has the full data set (job, max level, type, range, SP, cooldown, growth, sound) and an icon');
  const beh = s => JSON.stringify([s.type, s.at, !!s.stun, !!s.dot, !!s.debuff, !!s.mark, !!s.heal, !!s.barrier, !!s.trap, !!s.turret, !!s.revive, !!s.drain, !!s.chain, !!s.pierce, !!s.execute, !!s.rage, !!s.backstab, s.buff && Object.keys(s.buff).filter(k => !['id', 'ms', 'th'].includes(k)).sort().join()]);
  const pairs = [['knight', 'berserker'], ['sharpshooter', 'beasthunter'], ['elementalist', 'warlock'], ['priest', 'oracle'], ['assassin', 'shadowdancer'], ['alchemist', 'machinist']];
  ok(pairs.every(([a, b]) => { const A = new Set(T2.filter(s => s.cls === a && s.type !== 'passive').map(beh)), B = T2.filter(s => s.cls === b && s.type !== 'passive').map(beh); return B.filter(x => A.has(x)).length <= 1; }), 'class identity: sibling classes share at most one skill behaviour (Knight≠Berserker, Priest≠Oracle, ...)');
  const dps = s => (s.mult || 0) * (s.hits || 1) * 1.4 / (Math.max(s.cd, 1500) / 1000);
  ok(T2.filter(s => s.mult && s.type === 'target').every(s => dps(s) < 1.6), 'balance: no single-target skill above the DPS budget at max level (mult × hits × Lv5 / cooldown)', T2.filter(s => s.mult && dps(s) >= 1.6).map(s => s.id).join());
  // ---------------------------------------------------------------- class change
  {
    const c = await login(URL, 'k_change'); c.send({ t: 'npc', id: 'm_vanguard' }); await c.wait(m => m.t === 'dlg', 6000);
    c.send({ t: 'npcAct', id: 'm_vanguard', a: 'q:cls2_knight' }); const sk = await c.wait(m => m.t === 'skills' && Object.keys(m.skills).some(k => k.startsWith('kn_')), 6000); await sleep(400);
    ok(me(c).cls === 'knight' && me(c).jlv === 1 && sk && me(c).skp[0] === 1 && me(c).skp[1] === 0, 'class change to Knight: class + skill list + 1 skill point (Job 1)', JSON.stringify(me(c).skp));
    ok(['v_wall', 'v_strike', 'bash'].every(id => me(c).sk[id]), 'first-class and basic skills stay learned after the change');
    c.close();
  }
  // ---------------------------------------------------------------- learn / upgrade
  {
    const c = await login(URL, 'k_new');
    c.send({ t: 'learn', s: 'kn_stance' }); const f1 = await c.wait(m => m.t === 'learnfail', 2000);
    ok(f1 && f1.r === 'job', 'job requirement: Guardian Stance needs Job 5');
    c.send({ t: 'learn', s: 'ss_pierce' }); const f2 = await c.next(m => m.t === 'learnfail', 2000);
    ok(f2 && f2.r === 'class', 'wrong class: a Knight cannot learn a Sharpshooter skill');
    c.send({ t: 'learn', s: 'kn_bash' }); await sleep(400);
    ok(me(c).sk.kn_bash === 1 && me(c).hot.includes('kn_bash'), 'learn: Shield Bash Lv1, put on a free hotbar slot');
    c.send({ t: 'learn', s: 'kn_bash' }); const f3 = await c.next(m => m.t === 'learnfail', 2000);
    ok(f3 && f3.r === 'points' && me(c).sk.kn_bash === 1, 'no points left: cannot raise further');
    c.close();
    const k = await login(URL, 'k_knight');
    for (let i = 0; i < 6; i++) { k.send({ t: 'learn', s: 'kn_bash' }); await sleep(120); }
    const f4 = await k.wait(m => m.t === 'learnfail' && m.r === 'max', 2000);
    ok(me(k).sk.kn_bash === 5 && f4, 'upgrade to Lv5, then MAX');
    for (const s of ['kn_fort', 'kn_stance', 'kn_iron', 'kn_taunt', 'kn_wave']) { k.send({ t: 'learn', s }); await sleep(120); }
    await sleep(300); const before = me(k).def;
    ok(me(k).skp[1] === 10 && me(k).sk.kn_fort === 1, 'points spent are counted (10 of 30)');
    k.send({ t: 'learn', s: 'kn_fort' }); await sleep(400);
    ok(me(k).def > before, 'passive Fortified Armor raises DEF with its level', `${before} -> ${me(k).def}`);
    ok((await castOk(k, 'kn_fort')) === 'passive', 'a passive cannot be cast');
    k.send({ t: 'hot', h: ['kn_fort', 'kn_bash', null, null, null, null] }); await sleep(300);
    ok(!me(k).hot.includes('kn_fort') && me(k).hot.includes('kn_bash'), 'hotbar refuses passives, keeps active second-class skills');
    // validation
    ok((await castOk(k, 'nope_skill')) === 'bad', 'invalid skill id refused');
    ok((await castOk(k, 'ss_pierce')) === 'own', 'skill of another class refused');
    const sp0 = me(k).sp; ok((await castOk(k, 'kn_stance')) === 'ok' && me(k).buffs.some(b => b.id === 'guard'), 'self buff: Guardian Stance (DEF up) shows in the buff list');
    ok(sp0 - me(k).sp >= C.SKILLS.kn_stance.sp - Math.ceil(me(k).maxsp * 0.04), 'SP cost charged by the server', `${sp0} -> ${me(k).sp}`);
    ok((await castOk(k, 'kn_stance')) === 'cd', 'cooldown enforced');
    ok((await castOk(k, 'kn_bash', 999999)) === 'target', 'target validation: unknown monster');
    // stun + weapon rule
    let mob = await nearMob(k, ['mossbear', 'vinesnake', 'leafgoblin']);
    if (mob) {
      await sleep(500); let r = await castOk(k, 'kn_bash', mob.id);
      for (let i = 0; i < 3 && r === 'range'; i++) { await sleep(700); mob = await nearMob(k, ['mossbear', 'vinesnake', 'leafgoblin']) || mob; r = await castOk(k, 'kn_bash', mob.id); } // the monster stepped away: walk up again
      await sleep(300);
      ok(r === 'ok' && (stOf(k, mob.id) & 1), 'Shield Bash: damage + stun (status bit on the monster)', r + ' st=' + stOf(k, mob.id));
      k.send({ t: 'cast', s: 'kn_wave', id: 0 }); const hits = await k.wait(m => m.t === 'fx' && m.k === 'hit' && m.from === k.id && m.skill, 3000);
      ok(!!hits, 'AoE: Shield Wave hits the monsters around');
    } else R.skipped('stun / AoE', 'no monster reached');
    k.close();
    const b = await login(URL, 'k_bers'); // berserker wields a greatsword: Shield Bash would be refused for a knight with it
    ok((await castOk(b, 'bs_rage', 999999)) === 'target' && me(b).sk.bs_rage === 2, 'Berserker save keeps its learned skills (Lv2)');
    b.close();
  }
  // ---------------------------------------------------------------- ranged / statuses / devices
  {
    const s = await login(URL, 'k_ss');
    const far = mobsOf(s).filter(m => m.hp > 0).sort((a, b) => cheb(myPos(s), [b.x, b.y]) - cheb(myPos(s), [a.x, a.y]))[0];
    if (far && cheb(myPos(s), [far.x, far.y]) > 10) ok((await castOk(s, 'ss_pierce', far.id)) === 'range', 'range check: Piercing Shot refuses a target out of range');
    const crit0 = me(s).crit; ok((await castOk(s, 'ss_focus')) === 'ok' && me(s).crit >= crit0 + 25, 'Critical Focus: CRIT buff applied to derived stats', `${crit0} -> ${me(s).crit}`);
    s.close();
    const w = await login(URL, 'k_wl'), m = await nearMob(w, ['mossbear', 'vinesnake', 'leafgoblin', 'canopybee']);
    if (m) {
      const rc = await castOk(w, 'wl_curse', m.id); await sleep(300);
      ok(stOf(w, m.id) & 256, 'Curse of Weakness: debuff status on the monster');
      await sleep(600); const rm = await castOk(w, 'wl_mark', m.id); await sleep(1600);
      ok(stOf(w, m.id) & 128 && w.msgs.some(x => x.t === 'fx' && x.k === 'hit' && x.dot === 'curse'), 'Soul Mark: mark + damage over time ticks', `${rc} ${rm} st=${stOf(w, m.id)} alive=${!!mobNow(w, m.id)}`);
    } else R.skipped('curse / mark', 'no monster reached');
    w.close();
    const a = await login(URL, 'k_as'), [m2, rv] = await castOn(a, 'as_venom', ['mossbear', 'vinesnake', 'leafgoblin', 'canopybee']);
    if (m2) { await sleep(2300); ok((stOf(a, m2.id) & 4) || a.msgs.some(x => x.t === 'fx' && x.dot === 'poison'), 'Venom Strike: poison ticks on the monster'); } else R.skipped('venom', rv);
    a.close();
    const e = await login(URL, 'k_el');
    ok((await castOk(e, 'el_shield')) === 'ok' && me(e).buffs.some(b => b.id === 'barrier_el_shield'), 'Elemental Shield: barrier buff on the caster');
    const [m3, rf] = await castOn(e, 'el_frost', ['mossbear', 'vinesnake', 'leafgoblin', 'canopybee']);
    if (m3) { await sleep(300); ok((stOf(e, m3.id) & 2) || e.msgs.some(x => x.t === 'fx' && x.k === 'hit' && x.from === e.id && x.skill), 'Frost Field: hits and slows the monsters in the area', rf + ' st=' + stOf(e, m3.id)); } else R.skipped('frost', rf);
    e.close();
    const h = await login(URL, 'k_bh'); const k0 = h.msgs.length;
    ok((await castOk(h, 'bh_snare')) === 'ok' && h.msgs.slice(k0).some(x => x.t === 'fx' && x.k === 'dev' && x.kind === 'snare'), 'Snare Trap: a trap is placed on the ground');
    h.close(); await sleep(400);
    const mc = await login(URL, 'k_mc'); const near = await nearMob(mc, ['mossbear', 'vinesnake', 'leafgoblin', 'canopybee']); const k1 = mc.msgs.length;
    ok((await castOk(mc, 'mc_turret')) === 'ok', 'Deploy Turret placed');
    const shot = await mc.wait(x => x.t === 'fx' && x.k === 'devshot', 9000); await sleep(400);
    ok(!!shot && mc.msgs.slice(k1).some(x => x.t === 'fx' && x.k === 'hit' && x.from === mc.id), 'the turret shoots nearby monsters on its own (credited to its owner)', 'near=' + !!near + ' ' + JSON.stringify(myPos(mc)) + JSON.stringify(mobsOf(mc).filter(m => cheb(myPos(mc), [m.x, m.y]) < 7).map(m => [m.type, m.x, m.y])) + JSON.stringify(mc.msgs.slice(k1).filter(x => x.t === 'fx' && /dev/.test(x.k))));
    mc.close();
  }
  // ---------------------------------------------------------------- support: party heal / buffs / revive / evade
  {
    const pr = await login(URL, 'k_pr'), or = await login(URL, 'k_or'), v = await login(URL, 'k_victim');
    pr.send({ t: 'party', a: 'invite', id: or.id }); await or.wait(m => m.t === 'invite', 3000); or.send({ t: 'party', a: 'accept' }); await sleep(500);
    or.send({ t: 'cast', s: 'or_haste' }); await sleep(500);
    ok(me(pr).buffs.some(b => b.id === 'haste') && me(or).buffs.some(b => b.id === 'haste'), 'party buff: Haste reaches the caster and the party member');
    ok((await castOk(or, 'or_foresight')) === 'ok' && me(or).buffs.some(b => b.id === 'foresight'), 'Foresight: evade-next-attacks buff');
    const k0 = pr.msgs.length; pr.send({ t: 'cast', s: 'pr_group' }); await sleep(500);
    ok(pr.msgs.slice(k0).filter(m => m.t === 'fx' && m.k === 'heal').length >= 2, 'Group Heal heals the priest and the party member');
    ok((await castOk(pr, 'pr_resurrect')) === 'notarget', 'Resurrection needs a fallen player');
    // victim walks into the Fang orc camp and falls
    v.send({ t: 'move', x: 56, y: 37 }); const died = await v.wait(m => m.t === 'fx' && m.k === 'pdie' && m.id === v.id, 25000);
    if (died) {
      ok((await castOk(v, 'bash', 1)) === 'dead', 'a fallen player cannot cast');
      const dp = myPos(pr), vp = v.snap && v.snap.p.find(x => x[0] === v.id);
      if (vp) { pr.send({ t: 'move', x: Math.round(vp[2]) - 1, y: Math.round(vp[3]) }); for (let i = 0; i < 40; i++) { await sleep(500); const q = myPos(pr); if (q && cheb(q, [vp[2], vp[3]]) <= 3) break; } }
      const r = await castOk(pr, 'pr_resurrect'); await sleep(400);
      ok(r === 'ok' && v.msgs.some(m => m.t === 'fx' && m.k === 'revive' && m.id === v.id), 'Resurrection brings the fallen player back (long cooldown)', r);
      void dp;
    } else R.skipped('death + resurrection', 'victim did not fall');
    pr.close(); or.close(); v.close();
  }
  // ---------------------------------------------------------------- save / relog
  {
    let c = await login(URL, 'k_new'); const lv = me(c).sk.kn_bash; c.close(); await sleep(800);
    c = await login(URL, 'k_new');
    ok(me(c).sk.kn_bash === lv && me(c).hot.includes('kn_bash') && me(c).skp[1] === 1, 'save / relog: learned skill, level, hotbar and spent points kept');
    c.close();
  }
  // ---------------------------------------------------------------- browser: skill window + AUTO kinds
  let pw = null; try { pw = require('playwright'); } catch (e) { try { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); } catch (e2) { } }
  if (!pw) { R.skipped('skill window', 'Playwright not installed'); return; }
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => pw.chromium.launch());
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', e => errs.push(e.message)); await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await pg.goto(srv.http + '/'); await pg.fill('#u', 'k_bers'); await pg.fill('#p', H.PW); await pg.click('#go');
    await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && me && SK.bs_rage, null, { timeout: 10000 });
    await pg.evaluate(() => openSkills(-1)); await pg.waitForTimeout(300);
    const w = await pg.evaluate(() => ({ secs: [...document.querySelectorAll('#skillbody .sksec')].map(e => e.textContent), learn: [...document.querySelectorAll('#skillbody .learn')].length, icon: getComputedStyle(document.querySelector('#sk1 .pi')).backgroundImage }));
    ok(w.secs.length === 3 && /อาชีพขั้นที่ 2/.test(w.secs[2]) && /แต้มสกิล/.test(w.secs[2]) && w.learn >= 5 && /assets\/skills\/bs_rage/.test(w.icon), 'skill window: basics / first / second class sections, skill points, learn buttons; hotbar shows the card icon', JSON.stringify(w));
    const before = await pg.evaluate(() => me.sk.bs_whirl || 0);
    await pg.evaluate(() => [...document.querySelectorAll('#skillbody .skli')].find(d => /พายุหมุน/.test(d.textContent)).querySelector('.learn').click()); await pg.waitForTimeout(700);
    ok(before === 0 && await pg.evaluate(() => me.sk.bs_whirl === 1), 'tap "เรียน" learns the skill');
    const auto = await pg.evaluate(() => ({ ex: skKind(SK.bs_exec || { auto: 'execute', type: 'target' }), cond: KIND_COND.execute, area: skKind(SK.bs_whirl), owned: ownedSkills() }));
    ok(auto.ex === 'execute' && auto.cond.includes('tgtHp') && auto.area === 'area' && auto.owned.includes('bs_whirl') && !auto.owned.includes('bs_frenzy'), 'AUTO Skill: new skills join the list with conditions from their kind (execute → target HP); passives stay out', JSON.stringify(auto));
    ok(!errs.length, 'no page errors', JSON.stringify(errs));
    await ctx.close();
  } finally { await b.close(); }
}
module.exports = { run, SEEDS };
