'use strict';
// AUTO settings: server validation (potion need / cooldown / quantity, drop, saved settings) and the client's
// Auto Skill / Auto Potion decisions (priority, conditions, cooldown, SP, range, dead target / player, buffs,
// heal threshold, AoE count, quest monster priority, thresholds, fallback, spam prevention), plus the new item art.
const H = require('./harness');
const { sleep, login, me } = H;
function loadPlaywright() {
  try { return require('playwright'); } catch (e) { }
  try { const root = require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); return require(root + '/playwright'); } catch (e) { }
  return null;
}
const TOWN = { lv: 14, cls: 'vanguard', map: 'lumira', x: 22, y: 20, eq: { wpn: 22, arm: 31 } };
const SEEDS = {
  ac_pot: H.mkChar('AcPot', { ...TOWN, hp: 50, sp: 5, inv: [{ id: 1, q: 5 }, { id: 3, q: 4 }, { id: 100, q: 6 }] }),
  ac_save: H.mkChar('AcSave', { ...TOWN }),
  ac_full: H.mkChar('AcFull', { ...TOWN, inv: [{ id: 1, q: 5 }] }),
  ac_ui: H.mkChar('AcUi', { ...TOWN, inv: [{ id: 1, q: 3 }, { id: 2, q: 2 }, { id: 3, q: 2 }], qs: { a: { mq2: { s: 1, k: 0 } }, d: { mq1: 1 }, t: 'mq2' } }),
  ac_art: H.mkChar('AcArt', { ...TOWN, x: 32, y: 10, inv: [{ id: 1, q: 3 }, { id: 22, q: 1 }, { id: 304, q: 1 }, { id: 354, q: 1 }, { id: 100, q: 2 }] }),
};
const SPY = () => { window.__sent = []; const S = WebSocket.prototype.send; WebSocket.prototype.send = function (d) { try { window.__sent.push(JSON.parse(d)); } catch (e) { } return S.call(this, d); }; };

async function run(srv, R) {
  const URL = srv.ws;
  console.log('-- server validation');
  {
    const c = await login(URL, 'ac_pot'); const m0 = me(c), q0 = m0.inv.find(s => s.id === 1).q;
    c.send({ t: 'use', i: m0.inv.findIndex(s => s.id === 1), id: 1, auto: 1 }); c.send({ t: 'use', i: m0.inv.findIndex(s => s.id === 1), id: 1, auto: 1 }); // spam: 2 in a row
    const f = await c.wait(m => m.t === 'usefail', 1500); await sleep(400); const m1 = me(c);
    R.ok(m1.hp > m0.hp && m1.inv.find(s => s.id === 1).q === q0 - 1 && f && /คูลดาวน์/.test(f.r), 'potion: used once, quantity drops by 1, the spammed second request hits the server cooldown', JSON.stringify({ hp: [m0.hp, m1.hp], q: m1.inv.find(s => s.id === 1).q, f }));
    await sleep(600); c.send({ t: 'use', i: me(c).inv.findIndex(s => s.id === 3), id: 3, auto: 1 }); await sleep(400);
    R.ok(me(c).sp > m0.sp && me(c).inv.find(s => s.id === 3).q === 3, 'SP potion restores SP and is consumed');
    const bi = me(c).inv.findIndex(s => s.id === 100); c.send({ t: 'drop', i: bi, id: 100, q: 1 }); await sleep(300);
    R.ok(me(c).inv.find(s => s.id === 100).q === 5, 'drop 1 from a stack keeps the rest');
    c.close();
    const f2 = await login(URL, 'ac_full'), mf = me(f2), qf = mf.inv.find(s => s.id === 1).q;
    f2.send({ t: 'use', i: 0, id: 1, auto: 1 }); const ff = await f2.wait(m => m.t === 'usefail', 1500); await sleep(300);
    R.ok(mf.hp === mf.maxhp && ff && /เต็ม/.test(ff.r) && me(f2).inv.find(s => s.id === 1).q === qf, 'potion at 100% HP is refused by the server (not consumed)', JSON.stringify({ hp: [mf.hp, mf.maxhp], ff }));
    f2.close();
  }
  {
    let c = await login(URL, 'ac_save');
    c.send({ t: 'autocfg', cfg: { target: 'aggro', range: 99, hpOn: true, hpAt: 5, hpItem: 2, spOn: true, spAt: 60, skills: { bash: { on: true, pr: 2, cond: 'tgtHp', val: 30 }, nope: { on: true } }, evil: 'x' } });
    await sleep(500); c.close(); await sleep(400);
    c = await login(URL, 'ac_save'); const a = me(c).auto || {};
    R.ok(a.target === 'aggro' && a.range === 20 && a.hpOn && a.hpAt === 10 && a.hpItem === 2 && a.spAt === 60 && a.skills.bash && a.skills.bash.on && a.skills.bash.cond === 'tgtHp' && !a.skills.nope && !a.evil,
      'AUTO settings are saved per character (validated: range/threshold clamped, unknown skills/keys dropped)', JSON.stringify(a));
    c.close();
  }
  const pw = loadPlaywright(); if (!pw) { R.skipped('AUTO settings browser tests', 'Playwright not installed'); return; }
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => pw.chromium.launch());
  const open = async (u, vp) => {
    const ctx = await b.newContext(vp || { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await ctx.addInitScript(SPY);
    const pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await pg.goto(srv.http + '/'); await pg.fill('#u', u); await pg.fill('#p', H.PW); await pg.click('#go');
    await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && typeof ents !== 'undefined' && ents.has(myId) && me && me.sk, null, { timeout: 10000 });
    await pg.waitForTimeout(1200); return pg;
  };
  try {
    console.log('-- Auto Skill / Auto Potion (client decisions; the server still validates every request)');
    const pg = await open('ac_ui');
    R.ok(await pg.evaluate(() => !auto), 'AUTO is OFF after login (settings kept, nothing starts by itself)');
    // a fake monster next to us so decisions can be checked without fighting (the server refuses fake ids anyway)
    const T = (body) => pg.evaluate(new Function(`
      window.__sent.length = 0; AC.skip = {}; AC.potT = 0; AC.potWait = 0; gcdEnd = 0; for (const k in cdEnd) cdEnd[k] = 0;
      const m = ents.get(myId); for (const id of [...ents.keys()]) if (id >= 900000) ents.delete(id);
      const fake = (id, dx, type = 'sprout', hp = 50, boss) => { ents.set(id, { kind: 'm', type, hp, maxhp: 100, tx: m.tx + dx, ty: m.ty, x: m.tx + dx, y: m.ty }); return id; };
      auto = true; me.hp = me.maxhp; me.sp = me.maxsp; me.buffs = [];
      ACFG.skills = {}; for (const id of Object.keys(me.sk)) ACFG.skills[id] = { on: false, pr: 9, cond: KIND_DEF[skKind(SK[id])][0], val: KIND_DEF[skKind(SK[id])][1] };
      ACFG.hpOn = false; ACFG.spOn = false;
      ${body}`));
    const casts = () => pg.evaluate(() => window.__sent.filter(m => m.t === 'cast').map(m => m.s));
    const uses = () => pg.evaluate(() => window.__sent.filter(m => m.t === 'use').map(m => m.id));
    const S = async (body) => { await T(body); return casts(); };
    let r;
    r = await S(`selected = fake(900001, 1); acSkillTick();`); R.ok(r.length === 0, 'Auto Skill OFF: no skill is used', JSON.stringify(r));
    r = await S(`selected = fake(900001, 1); ACFG.skills.bash.on = true; acSkillTick();`); R.ok(r[0] === 'bash', 'Auto Skill ON: the skill is cast on the target', JSON.stringify(r));
    r = await S(`selected = fake(900001, 1); Object.assign(ACFG.skills.bash, { on: true, pr: 2 }); Object.assign(ACFG.skills.twin, { on: true, pr: 1 }); acSkillTick();`); R.ok(r[0] === 'twin', 'priority: the higher priority skill goes first', JSON.stringify(r));
    r = await S(`selected = fake(900001, 1); Object.assign(ACFG.skills.bash, { on: true, pr: 2 }); Object.assign(ACFG.skills.twin, { on: true, pr: 1 }); cdEnd.twin = performance.now() + 5000; acSkillTick();`); R.ok(r[0] === 'bash', 'cooldown: a skill on cooldown is skipped, the next one is used', JSON.stringify(r));
    r = await S(`selected = fake(900001, 1); ACFG.skills.bash.on = true; me.sp = 0; acSkillTick();`); R.ok(!r.length, 'not enough SP: the skill is not requested', JSON.stringify(r));
    r = await S(`selected = fake(900001, 5); ACFG.skills.bash.on = true; acSkillTick();`); R.ok(!r.length, 'out of range: a melee skill waits', JSON.stringify(r));
    r = await S(`selected = fake(900001, 1, 'sprout', 0); ACFG.skills.bash.on = true; acSkillTick();`); R.ok(!r.length, 'target dead: no cast', JSON.stringify(r));
    r = await S(`selected = fake(900001, 1); ACFG.skills.bash.on = true; me.hp = 0; acSkillTick(); acPotionTick();`); R.ok(!r.length && !(await uses()).length, 'player dead: no skills, no potions');
    r = await S(`ACFG.skills.v_wall.on = true; ACFG.skills.v_wall.cond = 'buff'; me.buffs = [{ id: 'bulwark', ms: 5000 }]; acSkillTick();`); R.ok(!r.length, 'buff already active: not recast', JSON.stringify(r));
    r = await S(`ACFG.skills.v_wall.on = true; ACFG.skills.v_wall.cond = 'buff'; acSkillTick();`); R.ok(r[0] === 'v_wall', 'buff missing: cast', JSON.stringify(r));
    r = await S(`Object.assign(ACFG.skills.heal, { on: true, cond: 'myHp', val: 50 }); me.hp = Math.round(me.maxhp * 0.8); acSkillTick();`); const hiHp = r;
    r = await S(`Object.assign(ACFG.skills.heal, { on: true, cond: 'myHp', val: 50 }); me.hp = Math.round(me.maxhp * 0.3); acSkillTick();`);
    R.ok(!hiHp.length && r[0] === 'heal', 'heal threshold: not at 80% HP, used below 50%', JSON.stringify([hiHp, r]));
    r = await S(`selected = fake(900001, 1); Object.assign(ACFG.skills.cleave, { on: true, cond: 'enemies', val: 2 }); acSkillTick();`); const one = r;
    r = await S(`selected = fake(900001, 1); fake(900002, -1); Object.assign(ACFG.skills.cleave, { on: true, cond: 'enemies', val: 2 }); acSkillTick();`);
    R.ok(!one.length && r[0] === 'cleave', 'AoE enemy count: 1 enemy no, 2 enemies yes', JSON.stringify([one, r]));
    const qp = await pg.evaluate(() => { const m = ents.get(myId); for (const id of [...ents.keys()]) if (id >= 900000) ents.delete(id); ents.set(900003, { kind: 'm', type: 'fluffle', hp: 50, maxhp: 100, tx: m.tx + 1, ty: m.ty, x: m.tx + 1, y: m.ty }); ents.set(900004, { kind: 'm', type: 'sprout', hp: 50, maxhp: 100, tx: m.tx + 3, ty: m.ty, x: m.tx + 3, y: m.ty }); ACFG.target = 'quest'; const id = acPickTarget(); ents.delete(900003); ents.delete(900004); return id; });
    R.ok(qp === 900004, 'quest monster priority: the quest monster is picked over a nearer other monster', String(qp));
    // potions
    const P = async (body) => { await T(body); return uses(); };
    r = await P(`ACFG.hpOn = true; ACFG.hpAt = 40; acPotionTick();`); R.ok(!r.length, 'HP 100%: no potion', JSON.stringify(r));
    r = await P(`ACFG.hpOn = true; ACFG.hpAt = 40; me.hp = Math.floor(me.maxhp * 0.3); acPotionTick();`); R.ok(r[0] === 1, 'HP below the threshold: the chosen potion is used', JSON.stringify(r));
    r = await P(`ACFG.hpOn = true; ACFG.hpAt = 40; me.hp = me.maxhp * 0.4; acPotionTick();`); R.ok(!r.length, 'HP exactly at the threshold: not used (only below)', JSON.stringify(r));
    r = await P(`ACFG.hpOn = false; me.hp = 1; acPotionTick();`); R.ok(!r.length, 'Auto HP potion OFF (default): nothing is used', JSON.stringify(r));
    const saveInv = await pg.evaluate(() => JSON.stringify(me.inv));
    r = await P(`me.inv = me.inv.filter(s => s.id !== 1); ACFG.hpOn = true; ACFG.hpItem = 1; ACFG.hpFall = true; me.hp = 10; acPotionTick();`); R.ok(r[0] === 2, 'chosen potion ran out: falls back to another HP potion the player owns', JSON.stringify(r));
    r = await P(`me.inv = me.inv.filter(s => s.id !== 1); ACFG.hpOn = true; ACFG.hpItem = 1; ACFG.hpFall = false; me.hp = 10; acPotionTick();`); R.ok(!r.length, 'fallback OFF: nothing is used when the chosen potion is gone', JSON.stringify(r));
    r = await P(`me.inv = []; ACFG.hpOn = true; ACFG.hpFall = true; me.hp = 10; acPotionTick();`); R.ok(!r.length, 'no potion at all: nothing is requested', JSON.stringify(r));
    await pg.evaluate(s => { me.inv = JSON.parse(s); }, saveInv);
    r = await P(`ACFG.hpOn = true; ACFG.hpItem = 0; me.hp = me.maxhp - 40; ACFG.hpAt = 90; acPotionTick();`); R.ok(r[0] === 1, 'best fit: missing 40 HP picks the +45 potion, not a bigger one', JSON.stringify(r));
    r = await P(`ACFG.hpOn = true; ACFG.hpAt = 40; me.hp = 10; acPotionTick(); acPotionTick(); acPotionTick();`); R.ok(r.length === 1, 'spam prevention: one potion request per window', JSON.stringify(r));
    r = await P(`ACFG.spOn = true; ACFG.spAt = 25; me.sp = 1; acPotionTick();`); R.ok(r[0] === 3, 'SP below the threshold: SP potion used', JSON.stringify(r));
    await pg.evaluate(() => { auto = false; for (const id of [...ents.keys()]) if (id >= 900000) ents.delete(id); });
    // settings window on a phone: fits the screen, tabs, real skill icons, potion art
    await pg.evaluate(() => openAutoCfg()); await pg.waitForTimeout(400);
    const w = await pg.evaluate(() => { const r = $('wAuto').getBoundingClientRect(); return { w: r.width / innerWidth, top: r.top, bot: r.bottom, H: innerHeight, tabs: document.querySelectorAll('#actabs button').length }; });
    await pg.evaluate(() => { AC.tab = 'skill'; renderAutoCfg(); }); const sk = await pg.evaluate(() => [...document.querySelectorAll('.acsk .aski')].filter(i => i.style.backgroundImage).length);
    await pg.evaluate(() => { AC.tab = 'pot'; renderAutoCfg(); }); const pa = await pg.evaluate(() => [...document.querySelectorAll('#wAuto .aci')].map(i => i.style.backgroundImage).filter(s => /assets\/items\/potions/.test(s)).length);
    R.ok(w.w >= 0.88 && w.w <= 0.95 && w.top >= 0 && w.bot <= w.H && w.tabs === 4, 'mobile: AUTO settings 88-95% wide, inside the viewport, 4 tabs', JSON.stringify(w));
    R.ok(sk >= 3 && pa >= 2, 'settings show the real skill icons and the new potion art', JSON.stringify({ sk, pa }));
    // long press on AUTO opens the settings; a tap toggles
    await pg.evaluate(() => closeWins()); const bb = await pg.$eval('#bAuto', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await pg.tap('#bAuto'); await pg.waitForTimeout(200); const tapOn = await pg.evaluate(() => auto);
    await pg.mouse.move(bb[0], bb[1]); await pg.mouse.down(); await pg.waitForTimeout(800); await pg.mouse.up(); await pg.waitForTimeout(200);
    R.ok(tapOn && await pg.$eval('#wAuto', e => e.style.display === 'block') && await pg.evaluate(() => auto), 'AUTO: tap toggles, long press opens the settings (without toggling)');
    R.ok(await pg.$eval('#acQuick', e => e.classList.contains('on')), 'quick AUTO status chip is shown while AUTO is on');
    R.ok(!pg.errs.length, 'no page errors', JSON.stringify(pg.errs));
    await pg.context().close();

    console.log('-- item art');
    const pa2 = await open('ac_art', { viewport: { width: 1280, height: 800 } });
    const broken = () => pa2.evaluate(() => [...document.images].filter(i => i.complete && !i.naturalWidth).length);
    const icons = sel => pa2.evaluate(sel => [...document.querySelectorAll(sel + ' canvas')].map(c => { const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n > 20; }), sel);
    await pa2.evaluate(() => $('bBag').click()); await pa2.waitForTimeout(900); const bag = await icons('#invgrid');
    await pa2.evaluate(() => { closeWins(); $('bEquip').click(); }); await pa2.waitForTimeout(900); const eq = await icons('#equipbody');
    const reg = await pa2.evaluate(() => [1, 2, 3, 5, 6, 7, 22, 304, 354, 202, 212].every(id => !!itemArtPath(id)));
    for (const [npc, tag, sel, win] of [['weapon', 'Weapon Shop', '#shoplist', 'wShop'], ['armor', 'Armor Shop', '#shoplist', 'wShop'], ['shop', 'Potion Shop', '#shoplist', 'wShop'], ['smith', 'Crafting (blacksmith)', '#svcbody', 'wSvc']]) {
      const has = await pa2.evaluate(n => map.npcs.some(q => q.id === n), npc); if (!has) continue;
      await pa2.evaluate(n => { closeWins(); send({ t: 'npc', id: n }); }, npc); await pa2.waitForFunction(w => $(w).style.display === 'block' || $('wDlg').style.display === 'block', win, { timeout: 8000 }).catch(() => { });
      if (await pa2.$eval('#wDlg', e => e.style.display === 'block')) { const btn = await pa2.$$('#dlgopts button'); for (const x of btn) { const t = await x.textContent(); if (/ซื้อ|ร้าน|ตี|สร้าง|คราฟ|ช่าง/.test(t)) { await x.click(); break; } } await pa2.waitForTimeout(800); }
      await pa2.waitForTimeout(400); const sh = await icons(sel);
      R.ok(sh.length > 0 && sh.every(Boolean), `${tag}: every item shows its icon (no empty squares)`, JSON.stringify(sh));
    }
    R.ok(bag.length >= 4 && bag.every(Boolean) && eq.length >= 3 && eq.every(Boolean) && reg && !(await broken()), 'inventory + equipment show item art from the central registry, no broken images', JSON.stringify({ bag, eq, reg }));
    await pa2.context().close();
  } finally { await b.close(); }
}
module.exports = { run, SEEDS };
