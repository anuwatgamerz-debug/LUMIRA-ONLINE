'use strict';
// Monster registry. Stats are computed from level x family profile x role, then each monster adds its own
// traits, so no two monsters share hand-copied numbers. Visuals (spr/tint/scale) reuse the existing sprite
// sheets with a recolour/resize, or a procedural sprite drawn by the client (spr 'proc:<kind>').
// behavior: passive aggressive assist coward ranged caster healer pack boss dummy
const { mobExp } = require('./levels');
const FAMILIES = {
  slime:     { th: 'สไลม์', hp: 0.9, atk: 0.8, def: 0.6, mdef: 0.8, matk: 0.5, spd: 2.2, flee: 0.7, el: 'water', size: 's' },
  plant:     { th: 'พืช', hp: 1.05, atk: 0.9, def: 0.9, mdef: 1.0, matk: 0.8, spd: 2.4, flee: 0.8, el: 'earth', size: 's' },
  beast:     { th: 'สัตว์ป่า', hp: 1.0, atk: 1.1, def: 0.8, mdef: 0.6, matk: 0.3, spd: 3.6, flee: 1.2, el: 'neutral', size: 'm' },
  insect:    { th: 'แมลง', hp: 0.85, atk: 1.0, def: 1.1, mdef: 0.5, matk: 0.3, spd: 3.0, flee: 1.3, el: 'earth', size: 's' },
  goblin:    { th: 'ก็อบลิน', hp: 0.95, atk: 1.05, def: 0.9, mdef: 0.7, matk: 0.6, spd: 3.1, flee: 1.1, el: 'neutral', size: 's' },
  orc:       { th: 'ออร์ค', hp: 1.35, atk: 1.25, def: 1.2, mdef: 0.6, matk: 0.4, spd: 2.8, flee: 0.8, el: 'neutral', size: 'm' },
  undead:    { th: 'อันเดด', hp: 1.1, atk: 1.1, def: 1.1, mdef: 1.2, matk: 1.0, spd: 2.6, flee: 0.8, el: 'shadow', size: 'm' },
  spirit:    { th: 'วิญญาณ', hp: 0.75, atk: 0.6, def: 0.5, mdef: 1.5, matk: 1.3, spd: 3.0, flee: 1.4, el: 'holy', size: 's' },
  elemental: { th: 'ธาตุ', hp: 1.2, atk: 1.0, def: 1.3, mdef: 1.3, matk: 1.2, spd: 2.3, flee: 0.7, el: 'earth', size: 'm' },
  machine:   { th: 'เครื่องจักร', hp: 1.3, atk: 1.15, def: 1.5, mdef: 0.7, matk: 0.6, spd: 2.4, flee: 0.6, el: 'neutral', size: 'm' },
  dragon:    { th: 'มังกร', hp: 1.6, atk: 1.4, def: 1.3, mdef: 1.3, matk: 1.3, spd: 3.2, flee: 1.0, el: 'fire', size: 'l' },
  demon:     { th: 'ปีศาจ', hp: 1.3, atk: 1.3, def: 1.1, mdef: 1.3, matk: 1.3, spd: 3.2, flee: 1.1, el: 'shadow', size: 'm' },
  aquatic:   { th: 'สัตว์น้ำ', hp: 1.0, atk: 1.0, def: 1.2, mdef: 0.9, matk: 0.7, spd: 2.4, flee: 0.9, el: 'water', size: 's' },
  desert:    { th: 'ทะเลทราย', hp: 1.05, atk: 1.1, def: 1.0, mdef: 0.8, matk: 0.6, spd: 2.8, flee: 1.0, el: 'earth', size: 's' },
  ice:       { th: 'น้ำแข็ง', hp: 1.15, atk: 1.05, def: 1.2, mdef: 1.2, matk: 1.0, spd: 2.5, flee: 0.8, el: 'water', size: 'm' },
  void:      { th: 'วอยด์', hp: 1.4, atk: 1.35, def: 1.2, mdef: 1.5, matk: 1.4, spd: 3.3, flee: 1.2, el: 'void', size: 'm' },
};
const ROLES = { normal: { hp: 1, atk: 1, exp: 1 }, elite: { hp: 2.4, atk: 1.25, exp: 2.6 }, boss: { hp: 9, atk: 1.3, exp: 14 }, dummy: { hp: 4, atk: 0, exp: 0 } };
const BEHAVIOR_DEF = {
  passive: { aggro: 0 }, aggressive: { aggro: 5 }, assist: { aggro: 0, assist: 6 }, coward: { aggro: 0, flee: 0.3 },
  ranged: { aggro: 6, range: 5 }, caster: { aggro: 6, range: 5, magic: 1 }, healer: { aggro: 0, heals: 1, range: 4 }, pack: { aggro: 5, assist: 7 },
  boss: { aggro: 7, boss: 1 }, dummy: { aggro: 0, dummy: 1 },
};
const MOBS = {};
// m(id, name, level, family, behavior, opts)
function m(id, n, lv, family, behavior, o = {}) {
  const F = FAMILIES[family], R = ROLES[o.role || (behavior === 'boss' ? 'boss' : behavior === 'dummy' ? 'dummy' : 'normal')], B = BEHAVIOR_DEF[behavior];
  const hp = Math.round((28 + lv * 15 + Math.pow(lv, 1.55) * 2.2) * F.hp * R.hp * (o.hpMul || 1));
  const atkBase = (2 + lv * 1.45) * F.atk * R.atk * (o.atkMul || 1);
  const d = {
    id, n, lv, family, behavior, element: o.element || F.el, size: o.size || (behavior === 'boss' ? 'l' : F.size),
    hp, sp: Math.round((lv * 4 + 10) * F.matk), atk: [Math.max(0, Math.round(atkBase * 0.85)), Math.round(atkBase * 1.15)],
    matk: Math.round((2 + lv * 2) * F.matk * R.atk * (o.matkMul || 1)), def: Math.round(lv * 0.45 * F.def * (o.defMul || 1)), mdef: Math.round(lv * 0.5 * F.mdef),
    flee: Math.round((lv * 1.2 + 2) * F.flee), spd: +(o.spd || F.spd).toFixed(2), aspd: o.aspd || (behavior === 'boss' ? 1300 : 1600),
    range: o.range || B.range || 1.5, aggro: o.aggro != null ? o.aggro : B.aggro, assist: B.assist || 0, fleeAt: B.flee || 0,
    magic: o.magic || B.magic || 0, heals: B.heals || 0, boss: B.boss || 0, dummy: B.dummy || 0,
    exp: o.exp != null ? o.exp : Math.round(mobExp(lv, R.exp * (o.expMul || 1))), jexp: 0,
    respawn: o.respawn || (behavior === 'boss' ? 900 : 12), skills: o.skills || [], drops: o.drops || null,
    spr: o.spr, tint: o.tint, scale: o.scale || 1, z: o.z || Math.max(2, Math.round(lv / 2)), beginner: !!o.beginner, d: o.d || '',
    phases: o.phases, minions: o.minions, region: o.region,
    // audio (optional): without these the client uses the family's sound set (mon_<family>_*)
    bgm: o.bgm, spawnSound: o.spawnSound, idleSound: o.idleSound, attackSound: o.attackSound, hitSound: o.hitSound, deathSound: o.deathSound,
  };
  d.jexp = o.jexp != null ? o.jexp : Math.max(1, Math.round(d.exp * 0.6));
  MOBS[id] = d; return d;
}
// the original seven keep their exact numbers (saves, quests and tests depend on them)
const legacy = (id, o) => { MOBS[id] = Object.assign({ id, family: 'slime', behavior: o.aggro ? 'aggressive' : 'passive', element: 'neutral', size: 's', sp: 0, matk: 0, mdef: 0, aspd: o.boss ? 1300 : 1600, range: 1.5, assist: 0, fleeAt: 0, magic: 0, heals: 0, respawn: 0, skills: [], scale: 1, jexp: Math.round(o.exp * 0.6), legacy: 1 }, o); if (o.aggro) MOBS[id].aggro = 5; };
legacy('jellop',   { n: 'เจลลอป', lv: 1, hp: 40, atk: [3, 5], def: 0, flee: 2, exp: 6, spd: 2.2, aggro: 0, drops: [[10, .6], [1, .08]], z: 2, family: 'slime', element: 'water', beginner: true });
legacy('crab',     { n: 'ปูทราย', lv: 4, hp: 95, atk: [6, 9], def: 2, flee: 6, exp: 16, spd: 2.4, aggro: 0, drops: [[11, .5], [1, .1]], z: 4, family: 'aquatic' });
legacy('leafling', { n: 'ลีฟลิง', lv: 6, hp: 130, atk: [8, 12], def: 2, flee: 10, exp: 25, spd: 2.8, aggro: 0, drops: [[14, .55], [2, .05]], z: 5, family: 'plant', element: 'earth' });
legacy('cactimp',  { n: 'อิมป์กระบองเพชร', lv: 8, hp: 170, atk: [11, 15], def: 3, flee: 10, exp: 36, spd: 2.6, aggro: 1, drops: [[12, .5], [40, .03]], z: 6, family: 'desert', element: 'earth' });
legacy('dunewolf', { n: 'อัศวินกระดูก', lv: 11, hp: 280, atk: [15, 21], def: 4, flee: 14, exp: 66, spd: 3.6, aggro: 1, drops: [[13, .45], [21, .04]], z: 8, family: 'undead', element: 'shadow', size: 'm' });
legacy('mosshog',  { n: 'จอมเวทกระดูก', lv: 13, hp: 360, atk: [18, 24], def: 6, flee: 12, exp: 85, spd: 3.0, aggro: 1, drops: [[15, .45], [31, .03]], z: 8, family: 'undead', element: 'shadow', size: 'm' });
legacy('kingjel',  { n: 'ราชาเจลลอป', lv: 16, hp: 2200, atk: [26, 36], def: 8, flee: 15, exp: 700, spd: 2.0, aggro: 1, boss: 1, behavior: 'boss', drops: [[41, .35], [23, .15], [2, 1]], z: 14, family: 'slime', size: 'l', respawn: 600, bgm: 'bgm_boss_common', spawnSound: 'boss_spawn', deathSound: 'boss_death' });

// ---- Region 1: Elyndra Heartland (Lv1-30)
// Beginner Meadow (Lv1-8): passive only, beginner protection
m('dewslime',  'สไลม์น้ำค้าง', 2, 'slime', 'passive', { spr: 'm_lpc_slime', tint: [70, 1.1, 8], beginner: true, d: 'สไลม์ใสที่เกิดจากน้ำค้างยามเช้า' });
m('sprout',    'สไปรต์ดอกตูม', 3, 'plant', 'passive', { spr: 'm_lpc_flower', tint: [60, 1.1, 6], scale: 0.62, beginner: true, d: 'ต้นอ่อนซุกซนที่เดินได้' });
m('fluffle',   'ฟลัฟเฟิล', 4, 'beast', 'coward', { spr: 'm_lpc_slime', tint: [-100, 0.35, 25], spd: 3.2, beginner: true, d: 'ก้อนขนปุยขี้ตกใจ วิ่งหนีเมื่อบาดเจ็บ' });
m('hopper',    'ด้วงกระโดดทุ่ง', 5, 'insect', 'passive', { spr: 'm_lpc_beetle', tint: [70, 1.2, 0], scale: 0.85, beginner: true, d: 'ด้วงเปลือกเขียวกระโดดไปมาในหญ้า' });
m('budling',   'บัดลิงทุ่งดอกไม้', 7, 'plant', 'assist', { spr: 'm_lpc_flower', tint: [-40, 1.1, 4], scale: 0.6, d: 'เรียกพวกเดียวกันมาช่วยเมื่อถูกโจมตี' });
// Greenwood Forest (Lv8-18)
m('mossslime', 'สไลม์มอส', 8, 'slime', 'passive', { spr: 'm_lpc_slime', tint: [-30, 0.8, -8], d: 'สไลม์ที่มีมอสขึ้นเต็มตัว' });
m('thornsprite', 'สไปรต์หนาม', 10, 'plant', 'aggressive', { spr: 'm_lpc_imp', tint: [110, 0.9, -4], scale: 0.8, aggro: 4, d: 'ภูตหนามหวงถิ่น' });
m('barkbeetle', 'ด้วงเปลือกไม้', 11, 'insect', 'pack', { spr: 'm_lpc_beetle', d: 'ด้วงแข็งที่อยู่กันเป็นฝูง' });
m('mossgoblin', 'ก็อบลินมอส', 12, 'goblin', 'assist', { spr: 'm_lpc_goblin', scale: 1, d: 'ก็อบลินขี้ขโมยแห่งป่ากรีนวูด' });
m('goblinsling', 'ก็อบลินนักสลิง', 13, 'goblin', 'ranged', { spr: 'm_lpc_goblin', tint: [20, 1, 6], scale: 1, range: 5, d: 'ยิงหินจากระยะไกล' });
m('wisp',      'วิสป์กรีนวูด', 14, 'spirit', 'caster', { spr: 'proc:wisp', tint: [110, 1, 0], aggro: 5, d: 'ดวงไฟวิญญาณที่ยิงเวทใส่ผู้บุกรุก' });
m('thornwolf', 'หมาป่าหนาม', 15, 'beast', 'pack', { spr: 'm_lpc_wolf', tint: [60, 0.8, 0], d: 'หมาป่าขนเขียวที่ล่าเป็นฝูง' });
m('bramblekin', 'แบรมเบิลคิน', 16, 'plant', 'aggressive', { spr: 'm_lpc_flower', tint: [-120, 0.8, -14], scale: 0.8, role: 'elite', d: 'พืชเสื่อมที่ถูกพลังมืดครอบงำ' });
// Moonlit Creek (Lv14-24)
m('creekcrab', 'ปูลำธาร', 14, 'aquatic', 'passive', { spr: 'm_lpc_beetle', tint: [170, 1.1, 0], d: 'ปูกระดองฟ้าแห่งลำธาร' });
m('moonslime', 'สไลม์จันทร์', 16, 'slime', 'assist', { spr: 'm_lpc_slime', tint: [120, 0.9, 12], d: 'สไลม์เรืองแสงยามค่ำคืน' });
m('nightmoth', 'มอธราตรี', 17, 'insect', 'coward', { spr: 'm_lpc_bee', tint: [200, 0.9, 0], scale: 1.2, spd: 3.4, d: 'แมลงกลางคืนบินว่อน' });
m('pondlurker', 'ตัวซุ่มบ่อ', 19, 'aquatic', 'aggressive', { spr: 'm_lpc_snake', tint: [60, 0.9, -4], scale: 1.3, aggro: 4, d: 'ซุ่มอยู่ใต้ใบบัวรอเหยื่อ' });
m('lanternspirit', 'วิญญาณตะเกียง', 20, 'spirit', 'healer', { spr: 'proc:wisp', tint: [-150, 1, 10], d: 'รักษามอนสเตอร์รอบตัว' });
m('willowwraith', 'ภูตต้นหลิว', 22, 'undead', 'caster', { spr: 'm_lpc_ghost', tint: [60, 1.3, -10], d: 'วิญญาณผูกพันกับต้นหลิวเก่า' });
m('froglord', 'กบหมอผี', 23, 'aquatic', 'caster', { spr: 'm_lpc_imp', tint: [150, 0.9, -6], d: 'กบที่ร่ายเวทน้ำได้' });
// Old Mine (Lv20-30)
m('cavebat', 'ค้างคาวถ้ำ', 20, 'beast', 'pack', { spr: 'm_lpc_bat', spd: 3.8, d: 'บินเป็นฝูงในความมืด' });
m('minegoblin', 'ก็อบลินขุดแร่', 21, 'goblin', 'coward', { spr: 'm_lpc_goblin', tint: [-40, 0.8, -6], scale: 1, d: 'ขโมยแร่แล้ววิ่งหนี' });
m('crystalcrawler', 'ตัวคลานผลึก', 23, 'insect', 'aggressive', { spr: 'm_lpc_beetle', tint: [200, 1.3, 10], scale: 1.1, aggro: 4, d: 'แมลงที่มีผลึกงอกบนหลัง' });
m('rustbot', 'หุ่นสนิมเหมือง', 24, 'machine', 'aggressive', { spr: 'm_lpc_golem', tint: [30, 0.6, -6], scale: 0.8, aspd: 1900, d: 'หุ่นขุดแร่เก่าที่ยังทำงานผิดพลาด' });
m('skeletonminer', 'โครงกระดูกคนงาน', 25, 'undead', 'aggressive', { spr: 'm_dunewolf', tint: [30, 0.6, 8], d: 'คนงานเหมืองที่ไม่เคยได้กลับบ้าน' });
m('golemite', 'โกเลมไมต์', 27, 'elemental', 'passive', { spr: 'm_lpc_golem', tint: [0, 0.2, 0], scale: 0.9, hpMul: 1.3, d: 'ก้อนหินมีชีวิต อึดมาก' });
m('oreelemental', 'ธาตุแร่เงินจันทร์', 28, 'elemental', 'caster', { spr: 'm_lpc_golem', tint: [60, 1.2, 10], scale: 0.85, d: 'แร่ที่ดูดพลังรูนจนมีชีวิต' });
m('tarslime',  'สไลม์น้ำมันดิน', 26, 'slime', 'assist', { spr: 'm_lpc_slime', tint: [0, 0.1, -35], d: 'เหนียวหนึบ ช้า แต่ตีแรง' });
// event / quest monsters
m('raider',    'ก็อบลินจู่โจม', 10, 'goblin', 'aggressive', { spr: 'm_lpc_goblin', tint: [-70, 1, -8], scale: 1, aggro: 9, respawn: 0, expMul: 0.5, d: 'ผู้รุกรานหมู่บ้านในบททดสอบแวนการ์ด' });
m('target',    'เป้าซ้อมยิง', 1, 'machine', 'dummy', { spr: 'proc:dummy', hpMul: 0.15, exp: 0, jexp: 0, d: 'เป้าสำหรับฝึกยิงธนู' });
m('banditlook', 'โจรเฝ้าค่าย', 14, 'goblin', 'aggressive', { spr: 'm_lpc_goblin', tint: [0, 0.4, -10], scale: 1, aggro: 4, d: 'โจรในค่ายกลางป่า ระวังอย่าให้เห็น' });
// bosses
m('thornwood', 'เอลเดอร์ ธอร์นวูด', 18, 'plant', 'boss', {
  spr: 'm_lpc_flower', tint: [-150, 0.9, -18], scale: 1.5, respawn: 900, bgm: 'bgm_boss_thornwood', spawnSound: 'boss_thornwood_spawn', attackSound: 'boss_thornwood_attack', deathSound: 'boss_thornwood_death', skills: ['root_slam', 'summon'], minions: 'bramblekin',
  phases: [{ at: 0.6, atk: 1.25, msg: 'รากไม้ทั่วป่าสั่นสะเทือน!' }, { at: 0.3, atk: 1.5, spd: 1.3, msg: 'ธอร์นวูดคลุ้มคลั่ง!' }],
  d: 'ต้นไม้โบราณที่ถูกพลังเสื่อมจากเศษรูนกลืนกิน',
});
m('ironjaw', 'ไอรอนจอว์ ทรราชเหมือง', 30, 'machine', 'boss', {
  spr: 'm_dunewolf', tint: [200, 0.35, -8], scale: 1.9, respawn: 1200, bgm: 'bgm_boss_ironjaw', spawnSound: 'boss_ironjaw_spawn', attackSound: 'boss_ironjaw_attack', deathSound: 'boss_ironjaw_death', skills: ['quake', 'summon', 'charge'], minions: 'rustbot', hpMul: 1.15,
  phases: [{ at: 0.65, atk: 1.2, msg: 'ไอรอนจอว์ส่งเสียงคำราม! เฟืองหมุนเร็วขึ้น' }, { at: 0.3, atk: 1.55, spd: 1.35, msg: 'ไอรอนจอว์เข้าสู่โหมดคลั่ง!' }],
  d: 'หัวหน้าคนงานที่หลอมรวมกับเครื่องจักรขุดแร่และผลึกวอยด์',
});

// ---- tiered drop tables (server rolls): common / uncommon / rare / veryRare. [item, chance]
const DROPS = {
  dewslime: { common: [[103, .55]], uncommon: [[1, .12]], rare: [[401, .01]] },
  sprout: { common: [[100, .55]], uncommon: [[104, .2], [4, .1]], rare: [[359, .012]] },
  fluffle: { common: [[101, .5]], uncommon: [[1, .12]], rare: [[403, .01]] },
  hopper: { common: [[102, .5]], uncommon: [[104, .15]], rare: [[402, .012]] },
  budling: { common: [[100, .45], [104, .2]], uncommon: [[1, .15]], rare: [[350, .02]], veryRare: [[356, .003]] },
  mossslime: { common: [[10, .4], [105, .3]], uncommon: [[2, .06]], rare: [[401, .02]] },
  thornsprite: { common: [[110, .45]], uncommon: [[125, .2]], rare: [[214, .01]], veryRare: [[360, .002]] },
  barkbeetle: { common: [[106, .45]], uncommon: [[125, .25]], rare: [[307, .01]] },
  mossgoblin: { common: [[107, .45]], uncommon: [[1, .2], [2, .05]], rare: [[352, .02], [405, .006]] },
  goblinsling: { common: [[108, .45]], uncommon: [[107, .2]], rare: [[208, .012]], veryRare: [[355, .004]] },
  wisp: { common: [[109, .45]], uncommon: [[3, .05]], rare: [[406, .008], [213, .006]] },
  thornwolf: { common: [[110, .3], [101, .3]], uncommon: [[2, .06]], rare: [[405, .01]] },
  bramblekin: { common: [[110, .5], [125, .4]], uncommon: [[2, .12]], rare: [[216, .012], [307, .015]], veryRare: [[360, .004]] },
  creekcrab: { common: [[111, .5]], uncommon: [[11, .2]], rare: [[361, .008]] },
  moonslime: { common: [[112, .5]], uncommon: [[3, .05]], rare: [[404, .01]] },
  nightmoth: { common: [[113, .5]], uncommon: [[162, .0]], rare: [[406, .012]] },
  pondlurker: { common: [[114, .45], [111, .2]], uncommon: [[2, .1]], rare: [[308, .01]] },
  lanternspirit: { common: [[115, .45]], uncommon: [[3, .08]], rare: [[409, .005], [361, .01]] },
  willowwraith: { common: [[116, .45]], uncommon: [[15, .2]], rare: [[308, .012], [213, .01]] },
  froglord: { common: [[114, .4], [126, .1]], uncommon: [[6, .04]], rare: [[404, .015]] },
  cavebat: { common: [[117, .5]], uncommon: [[2, .08]], rare: [[407, .006]] },
  minegoblin: { common: [[120, .45], [107, .2]], uncommon: [[5, .04]], rare: [[357, .015]] },
  crystalcrawler: { common: [[118, .45]], uncommon: [[126, .12]], rare: [[220, .008], [221, .008]] },
  rustbot: { common: [[119, .5]], uncommon: [[120, .3]], rare: [[223, .01], [309, .012]] },
  skeletonminer: { common: [[13, .4], [120, .25]], uncommon: [[121, .06]], rare: [[219, .01], [218, .008]] },
  golemite: { common: [[118, .4], [120, .3]], uncommon: [[121, .1]], rare: [[407, .012]] },
  oreelemental: { common: [[121, .3], [126, .3]], uncommon: [[6, .06]], rare: [[224, .008], [409, .006]] },
  tarslime: { common: [[10, .4], [122, .4]], uncommon: [[5, .06]], rare: [[309, .01]] },
  raider: { common: [[107, .3]], uncommon: [[1, .2]] },
  banditlook: { common: [[107, .3], [108, .2]], uncommon: [[2, .08]], rare: [[358, .02]] },
  thornwood: { common: [[123, 1], [125, 1]], uncommon: [[2, 1], [216, .25], [215, .25]], rare: [[408, .15], [360, .2]], veryRare: [[310, .05]] },
  ironjaw: { common: [[124, 1], [121, 1]], uncommon: [[5, 1], [219, .25], [221, .2]], rare: [[222, .1], [311, .08]], veryRare: [[362, .03]] },
};
for (const id in DROPS) if (MOBS[id]) MOBS[id].drops = DROPS[id];
// legacy flat lists -> tiers by chance
for (const d of Object.values(MOBS)) if (Array.isArray(d.drops)) {
  const t = { common: [], uncommon: [], rare: [], veryRare: [] };
  for (const [id, ch] of d.drops) (ch >= 0.3 ? t.common : ch >= 0.08 ? t.uncommon : ch >= 0.02 ? t.rare : t.veryRare).push([id, ch]);
  d.drops = t;
}
for (const d of Object.values(MOBS)) if (!d.drops) d.drops = { common: [], uncommon: [], rare: [], veryRare: [] };
const DROP_TIERS = ['common', 'uncommon', 'rare', 'veryRare'];
module.exports = { MOBS, FAMILIES, BEHAVIOR_DEF, DROP_TIERS };
