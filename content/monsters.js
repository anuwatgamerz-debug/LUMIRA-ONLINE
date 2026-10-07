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
    phases: o.phases, minions: o.minions, region: o.region, elite: o.role === 'elite' ? 1 : 0,
    // audio (optional): without these the client uses the family's sound set (mon_<family>_*)
    bgm: o.bgm, spawnSound: o.spawnSound, idleSound: o.idleSound, attackSound: o.attackSound, hitSound: o.hitSound, deathSound: o.deathSound,
  };
  d.jexp = o.jexp != null ? o.jexp : Math.max(1, Math.round(d.exp * 0.6));
  MOBS[id] = d; return d;
}
// the original seven keep their exact numbers (saves, quests and tests depend on them)
const legacy = (id, o) => { MOBS[id] = Object.assign({ id, family: 'slime', behavior: o.aggro ? 'aggressive' : 'passive', element: 'neutral', size: 's', sp: 0, matk: 0, mdef: 0, aspd: o.boss ? 1300 : 1600, range: 1.5, assist: 0, fleeAt: 0, magic: 0, heals: 0, respawn: 0, skills: [], scale: 1, jexp: Math.round(o.exp * 0.6), legacy: 1 }, o); if (o.aggro) MOBS[id].aggro = 5; };
legacy('jellop',   { spr: 'm_lpc_slime', tint: [-150, 1.1, 10], n: 'เจลลอป', lv: 1, hp: 40, atk: [3, 5], def: 0, flee: 2, exp: 6, spd: 2.2, aggro: 0, drops: [[10, .6], [1, .08]], z: 2, family: 'slime', element: 'water', beginner: true });
legacy('crab',     { spr: 'm_lpc_beetle', tint: [-40, 1.3, 0], n: 'ปูทราย', lv: 4, hp: 95, atk: [6, 9], def: 2, flee: 6, exp: 16, spd: 2.4, aggro: 0, drops: [[11, .5], [1, .1]], z: 4, family: 'aquatic' });
legacy('leafling', { spr: 'm_lpc_flower', tint: [80, 1, 4], scale: 0.6, n: 'ลีฟลิง', lv: 6, hp: 130, atk: [8, 12], def: 2, flee: 10, exp: 25, spd: 2.8, aggro: 0, drops: [[14, .55], [2, .05]], z: 5, family: 'plant', element: 'earth' });
legacy('cactimp',  { spr: 'm_lpc_imp', tint: [100, 0.9, 0], scale: 0.85, n: 'อิมป์กระบองเพชร', lv: 8, hp: 170, atk: [11, 15], def: 3, flee: 10, exp: 36, spd: 2.6, aggro: 1, drops: [[12, .5], [40, .03]], z: 6, family: 'desert', element: 'earth' });
legacy('dunewolf', { spr: 'm_lpc2_boneknight', n: 'อัศวินกระดูก', lv: 11, hp: 280, atk: [15, 21], def: 4, flee: 14, exp: 66, spd: 3.6, aggro: 1, drops: [[13, .45], [21, .04]], z: 8, family: 'undead', element: 'shadow', size: 'm' });
legacy('mosshog',  { spr: 'm_lpc2_bonemage', n: 'จอมเวทกระดูก', lv: 13, hp: 360, atk: [18, 24], def: 6, flee: 12, exp: 85, spd: 3.0, aggro: 1, drops: [[15, .45], [31, .03]], z: 8, family: 'undead', element: 'shadow', size: 'm' });
legacy('kingjel',  { spr: 'm_lpc_slime', tint: [-150, 1.2, 14], scale: 2.2, n: 'ราชาเจลลอป', lv: 16, hp: 2200, atk: [26, 36], def: 8, flee: 15, exp: 700, spd: 2.0, aggro: 1, boss: 1, behavior: 'boss', drops: [[41, .35], [23, .15], [2, 1]], z: 14, family: 'slime', size: 'l', respawn: 600, bgm: 'bgm_boss_common', spawnSound: 'boss_spawn', deathSound: 'boss_death' });

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
m('bramblekin', 'แบรมเบิลคิน', 16, 'plant', 'aggressive', { spr: 'm_lpc_flower', tint: [-120, 0.8, -14], scale: 1.1, role: 'elite', respawn: 360, skills: ['root_slam'], d: 'อีลิท: พืชเสื่อมที่ถูกพลังมืดครอบงำ ฟาดรากลงพื้น' });
// Moonlit Creek (Lv14-24)
m('creekcrab', 'ปูลำธาร', 14, 'aquatic', 'passive', { spr: 'm_lpc_beetle', tint: [170, 1.1, 0], d: 'ปูกระดองฟ้าแห่งลำธาร' });
m('moonslime', 'สไลม์จันทร์', 16, 'slime', 'assist', { spr: 'm_lpc_slime', tint: [120, 0.9, 12], d: 'สไลม์เรืองแสงยามค่ำคืน' });
m('nightmoth', 'มอธราตรี', 17, 'insect', 'coward', { spr: 'm_lpc_bee', tint: [200, 0.9, 0], scale: 1.2, spd: 3.4, d: 'แมลงกลางคืนบินว่อน' });
m('pondlurker', 'ตัวซุ่มบ่อ', 19, 'aquatic', 'aggressive', { spr: 'm_lpc2_lizard', aggro: 4, d: 'ซุ่มอยู่ใต้ใบบัวรอเหยื่อ' });
m('lanternspirit', 'วิญญาณตะเกียง', 20, 'spirit', 'healer', { spr: 'proc:wisp', tint: [-150, 1, 10], d: 'รักษามอนสเตอร์รอบตัว' });
m('willowwraith', 'ภูตต้นหลิว', 22, 'undead', 'caster', { spr: 'm_lpc_ghost', tint: [60, 1.3, -10], d: 'วิญญาณผูกพันกับต้นหลิวเก่า' });
m('froglord', 'กบหมอผี', 23, 'aquatic', 'caster', { spr: 'm_lpc_frogman', tint: [0, 1, 0], d: 'กบที่ร่ายเวทน้ำได้' });
// Old Mine (Lv20-30)
m('cavebat', 'ค้างคาวถ้ำ', 20, 'beast', 'pack', { spr: 'm_lpc_bat', spd: 3.8, d: 'บินเป็นฝูงในความมืด' });
m('minegoblin', 'ก็อบลินขุดแร่', 21, 'goblin', 'coward', { spr: 'm_lpc2_gobminer', scale: 0.92, d: 'ขโมยแร่แล้ววิ่งหนี' });
m('crystalcrawler', 'ตัวคลานผลึก', 23, 'insect', 'aggressive', { spr: 'm_lpc_beetle', tint: [200, 1.3, 10], scale: 1.1, aggro: 4, d: 'แมลงที่มีผลึกงอกบนหลัง' });
m('rustbot', 'หุ่นสนิมเหมือง', 24, 'machine', 'aggressive', { spr: 'm_lpc_golem', tint: [30, 0.6, -6], scale: 0.8, aspd: 1900, d: 'หุ่นขุดแร่เก่าที่ยังทำงานผิดพลาด' });
m('skeletonminer', 'โครงกระดูกคนงาน', 25, 'undead', 'aggressive', { spr: 'm_lpc2_boneminer', d: 'คนงานเหมืองที่ไม่เคยได้กลับบ้าน' });
m('golemite', 'โกเลมไมต์', 27, 'elemental', 'passive', { spr: 'm_lpc_golem', tint: [0, 0.2, 0], scale: 0.9, hpMul: 1.3, d: 'ก้อนหินมีชีวิต อึดมาก' });
m('oreelemental', 'ธาตุแร่เงินจันทร์', 28, 'elemental', 'caster', { spr: 'm_lpc_golem', tint: [60, 1.2, 10], scale: 0.85, d: 'แร่ที่ดูดพลังรูนจนมีชีวิต' });
m('tarslime',  'สไลม์น้ำมันดิน', 26, 'slime', 'assist', { spr: 'm_lpc_slime', tint: [0, 0.1, -35], d: 'เหนียวหนึบ ช้า แต่ตีแรง' });
// event / quest monsters
m('raider',    'ก็อบลินจู่โจม', 10, 'goblin', 'aggressive', { spr: 'm_lpc2_gobraider', scale: 0.92, aggro: 9, respawn: 0, expMul: 0.5, d: 'ผู้รุกรานหมู่บ้านในบททดสอบแวนการ์ด' });
m('target',    'เป้าซ้อมยิง', 1, 'machine', 'dummy', { spr: 'proc:dummy', hpMul: 0.15, exp: 0, jexp: 0, d: 'เป้าสำหรับฝึกยิงธนู' });
m('banditlook', 'โจรเฝ้าค่าย', 14, 'goblin', 'aggressive', { spr: 'm_lpc2_bandit', aggro: 4, d: 'โจรในค่ายกลางป่า ระวังอย่าให้เห็น' });
// bosses
m('thornwood', 'เอลเดอร์ ธอร์นวูด', 18, 'plant', 'boss', {
  spr: 'm_lpc_flower', tint: [-150, 0.9, -18], scale: 1.5, respawn: 900, bgm: 'bgm_boss_thornwood', spawnSound: 'boss_thornwood_spawn', attackSound: 'boss_thornwood_attack', deathSound: 'boss_thornwood_death', skills: ['root_slam', 'summon'], minions: 'bramblekin',
  phases: [{ at: 0.6, atk: 1.25, msg: 'รากไม้ทั่วป่าสั่นสะเทือน!' }, { at: 0.3, atk: 1.5, spd: 1.3, msg: 'ธอร์นวูดคลุ้มคลั่ง!' }],
  d: 'ต้นไม้โบราณที่ถูกพลังเสื่อมจากเศษรูนกลืนกิน',
});
m('ironjaw', 'ไอรอนจอว์ ทรราชเหมือง', 30, 'machine', 'boss', {
  spr: 'm_lpc_minotaur', tint: [0, 0.15, -6], scale: 1.8, respawn: 1200, bgm: 'bgm_boss_ironjaw', spawnSound: 'boss_ironjaw_spawn', attackSound: 'boss_ironjaw_attack', deathSound: 'boss_ironjaw_death', skills: ['quake', 'summon', 'charge'], minions: 'rustbot', hpMul: 1.15,
  phases: [{ at: 0.65, atk: 1.2, msg: 'ไอรอนจอว์ส่งเสียงคำราม! เฟืองหมุนเร็วขึ้น' }, { at: 0.3, atk: 1.55, spd: 1.35, msg: 'ไอรอนจอว์เข้าสู่โหมดคลั่ง!' }],
  d: 'หัวหน้าคนงานที่หลอมรวมกับเครื่องจักรขุดแร่และผลึกวอยด์',
});

// ---- Heartland dungeons (Lv4-33): slime burrow, spider nest, moonlit crypt, iron labyrinth
m('caverat', 'หนูถ้ำ', 5, 'beast', 'passive', { spr: 'm_lpc_rat', scale: 0.7, d: 'หนูตัวใหญ่ที่อาศัยในโพรงชื้น' });
m('shroomlet', 'เห็ดเดิน', 6, 'plant', 'passive', { spr: 'm_lpc_mushroom', scale: 1.5, d: 'เห็ดที่งอกขาเดินได้' });
m('pinkjel', 'เจลลี่ชมพู', 7, 'slime', 'assist', { spr: 'm_lpc_slime', tint: [-160, 1.1, 12], d: 'บริวารของราชินีเจลลี่' });
m('burrowbat', 'ค้างคาวโพรง', 8, 'beast', 'pack', { spr: 'm_lpc_bat', tint: [-30, 0.8, 4], scale: 0.85, aggro: 3, d: 'ค้างคาวตัวเล็กที่บินเป็นฝูง' });
m('spiderling', 'ลูกแมงมุม', 13, 'insect', 'aggressive', { spr: 'm_lpc_spider', scale: 0.7, aggro: 4, d: 'ลูกแมงมุมที่ฟักจากรังกรีนวูด' });
m('webspinner', 'แมงมุมชักใย', 15, 'insect', 'ranged', { spr: 'm_lpc_spider', tint: [80, 0.9, 6], range: 4, d: 'พ่นใยใส่เหยื่อจากระยะไกล' });
m('nestcentipede', 'ตะขาบรัง', 16, 'insect', 'aggressive', { spr: 'm_lpc_centipede', scale: 0.55, aggro: 4, d: 'ตะขาบยักษ์ที่เฝ้าทางเดินในรัง' });
m('venomshroom', 'เห็ดพิษ', 17, 'plant', 'caster', { spr: 'm_lpc_mushroom', tint: [140, 1.3, -6], scale: 1.7, d: 'ปล่อยสปอร์พิษเป็นวงกว้าง' });
m('cryptskeleton', 'โครงกระดูกสุสาน', 20, 'undead', 'aggressive', { spr: 'm_lpc2_bonecrypt', d: 'ผู้เฝ้าสุสานที่ไม่ยอมพักผ่อน' });
m('ghoul', 'กูล', 21, 'undead', 'aggressive', { spr: 'm_lpc2_ghoul', d: 'ศพเดินได้ที่หิวโหย' });
m('cryptwraith', 'ภูตสุสาน', 22, 'undead', 'caster', { spr: 'm_lpc_ghost', tint: [200, 1.2, -8], hpMul: 0.92, matkMul: 1.15, d: 'วิญญาณแค้นที่ร่ายเวทเงา' });
m('gravepumpkin', 'ฟักทองหลุมศพ', 23, 'plant', 'aggressive', { spr: 'm_lpc_pumpkin', aggro: 4, d: 'ฟักทองที่งอกจากหลุมศพเก่า' });
m('labyrinthguard', 'ยามเขาวงกต', 28, 'beast', 'aggressive', { spr: 'm_lpc2_minoguard', scale: 1.15, d: 'มนุษย์กระทิงที่เฝ้าเขาวงกต' });
m('cavebear', 'หมีถ้ำ', 28, 'beast', 'aggressive', { spr: 'm_lpc_bear', hpMul: 1.2, d: 'หมีที่อาศัยในอุโมงค์ลึก' });
m('giantcentipede', 'ตะขาบยักษ์', 29, 'insect', 'aggressive', { spr: 'm_lpc_centipede', tint: [40, 0.8, -10], scale: 0.75, d: 'ตะขาบยาวกว่าคนสองคน' });
m('boneknight', 'อัศวินกระดูก', 30, 'undead', 'aggressive', { spr: 'm_lpc2_boneknight', tint: [200, 0.6, -6], scale: 1.1, hpMul: 1.15, d: 'อัศวินที่หลงทางในเขาวงกตตลอดกาล' });
m('jellyqueen', 'ราชินีเจลลี่', 10, 'slime', 'boss', { spr: 'm_lpc_slime', tint: [-160, 1.2, 16], scale: 2.4, bgm: 'bgm_boss_thornwood', spawnSound: 'boss_thornwood_spawn', attackSound: 'boss_thornwood_attack', deathSound: 'boss_thornwood_death', respawn: 600, skills: ['summon'], minions: 'pinkjel',
  phases: [{ at: 0.5, atk: 1.3, msg: 'ราชินีเจลลี่แบ่งร่าง!' }], d: 'ราชินีแห่งโพรงสไลม์' });
m('broodmother', 'แม่แมงมุมกรีนวูด', 20, 'insect', 'boss', { spr: 'm_lpc_spider', tint: [-40, 1.3, -4], scale: 2.2, bgm: 'bgm_boss_thornwood', spawnSound: 'boss_thornwood_spawn', attackSound: 'boss_thornwood_attack', deathSound: 'boss_thornwood_death', respawn: 900, skills: ['summon', 'charge'], minions: 'spiderling',
  phases: [{ at: 0.6, atk: 1.25, msg: 'แม่แมงมุมเรียกลูก ๆ!' }, { at: 0.3, atk: 1.5, spd: 1.3, msg: 'แม่แมงมุมคลุ้มคลั่ง!' }], d: 'แม่แห่งรังแมงมุมใต้ป่ากรีนวูด' });
m('moonfang', 'มูนแฟง หมาป่าจันทร์', 26, 'beast', 'boss', { spr: 'm_lpc_werewolf', tint: [200, 0.5, 4], scale: 1.7, bgm: 'bgm_boss_ironjaw', spawnSound: 'boss_ironjaw_spawn', attackSound: 'boss_ironjaw_attack', deathSound: 'boss_ironjaw_death', respawn: 1000, skills: ['charge', 'summon'], minions: 'ghoul',
  phases: [{ at: 0.6, atk: 1.25, msg: 'มูนแฟงหอนใต้แสงจันทร์!' }, { at: 0.3, atk: 1.55, spd: 1.35, msg: 'มูนแฟงคลั่งเลือด!' }], d: 'มนุษย์หมาป่าที่ครองสุสานจันทร์' });
m('labyrinthking', 'ราชาเขาวงกต', 33, 'beast', 'boss', { spr: 'm_lpc_minotaur', tint: [200, 0.6, 0], scale: 1.9, bgm: 'bgm_boss_ironjaw', spawnSound: 'boss_ironjaw_spawn', attackSound: 'boss_ironjaw_attack', deathSound: 'boss_ironjaw_death', respawn: 1200, hpMul: 1.1, skills: ['quake', 'charge', 'summon'], minions: 'labyrinthguard',
  phases: [{ at: 0.65, atk: 1.2, msg: 'ราชาเขาวงกตกระทืบพื้น!' }, { at: 0.3, atk: 1.6, spd: 1.3, msg: 'ราชาเขาวงกตเข้าสู่ความบ้าคลั่ง!' }], d: 'มินอทอร์ผู้ครองเขาวงกตเหล็กใต้เหมืองเก่า' });

// ---- Region 2: Verdant Wilds (Lv22-45). Tribes of the leaf, spore-rot spreading from the Ancient Tree, spirits of the
// grove and the beasts of the valley. Each map has its own ecosystem: prey + hunters + a support monster + an elite.
const VB = { bgm: 'bgm_boss_verdant', spawnSound: 'boss_thornwood_spawn', attackSound: 'boss_thornwood_attack', deathSound: 'boss_thornwood_death' };
// Deep Forest (Lv22-30): the leaf tribe's hunting ground
m('vinesnake', 'งูเถาวัลย์', 22, 'beast', 'aggressive', { region: 'verdant', spr: 'm_lpc_snake', tint: [90, 1.1, -4], aggro: 4, element: 'earth', d: 'งูสีเขียวที่พรางตัวเป็นเถาวัลย์ รอฉกผู้ผ่านทาง' });
m('canopybee', 'ผึ้งยอดไม้', 23, 'insect', 'pack', { region: 'verdant', spr: 'm_lpc_bee', element: 'wind', hpMul: 0.9, atkMul: 1.08, d: 'ฝูงผึ้งยักษ์ที่หวงรังบนยอดไม้' });
m('leafgoblin', 'ก็อบลินเผ่าใบไม้', 25, 'goblin', 'assist', { region: 'verdant', spr: 'm_lpc_goblin', tint: [70, 1.1, -2], d: 'นักรบเผ่าใบไม้ ช่วยพวกพ้องทันทีที่ถูกโจมตี' });
m('mossbear', 'หมีขนมอส', 26, 'beast', 'passive', { region: 'verdant', spr: 'm_lpc_bear', tint: [70, 0.7, -6], scale: 0.85, hpMul: 1.25, d: 'หมีสงบที่มีมอสขึ้นเต็มหลัง จะสู้เมื่อถูกรังแก' });
m('leafshaman', 'หมอผีเผ่าใบไม้', 27, 'goblin', 'healer', { region: 'verdant', spr: 'm_lpc2_gobshaman', scale: 0.92, d: 'ร่ายเวทรักษานักรบในเผ่า ควรจัดการก่อน' });
m('leafchief', 'หัวหน้าเผ่าใบไม้', 29, 'goblin', 'aggressive', { role: 'elite', region: 'verdant', spr: 'm_lpc2_gobchief', scale: 1.1, respawn: 420, skills: ['charge', 'quake'], d: 'อีลิท: หัวหน้าเผ่าที่ถูกพลังสปอร์ปลุกความบ้าคลั่ง พุ่งชนและกระแทกพื้น' });
// Mushroom Hollow (Lv26-34): the spore-rot spreads here first
m('sporeling', 'สปอร์ลิง', 26, 'plant', 'passive', { region: 'verdant', spr: 'm_lpc_mushroom', tint: [200, 1.0, 4], scale: 0.8, d: 'ลูกเห็ดซุกซนที่ปล่อยสปอร์เรืองแสง' });
m('capshroom', 'เห็ดหมวกแดง', 29, 'plant', 'caster', { region: 'verdant', spr: 'm_lpc_mushroom', tint: [-20, 1.4, -2], scale: 1.4, d: 'เห็ดพิษที่ร่ายเวทสปอร์จากระยะไกล' });
m('sporebat', 'ค้างคาวสปอร์', 30, 'beast', 'aggressive', { region: 'verdant', spr: 'm_lpc_bat', tint: [260, 1.1, 0], aggro: 6, d: 'ค้างคาวที่ติดเชื้อสปอร์ บินโฉบเข้าหาทุกสิ่งที่ขยับ' });
m('shroomfrog', 'กบเห็ด', 32, 'aquatic', 'ranged', { region: 'verdant', spr: 'm_lpc_frogman', tint: [240, 0.9, -4], range: 5, d: 'กบที่มีเห็ดงอกบนหลัง พ่นเมือกจากระยะไกล' });
m('eldercap', 'เห็ดยักษ์โบราณ', 33, 'plant', 'caster', { role: 'elite', region: 'verdant', spr: 'm_lpc_mushroom', tint: [280, 1.3, -8], scale: 2.0, respawn: 480, skills: ['spore'], d: 'อีลิท: เห็ดอายุนับร้อยปีที่เป็นต้นตอสปอร์ ระเบิดสปอร์รอบตัว' });
// Spirit Grove (Lv30-38): sacred grove, spirits restless since the fallen star
m('leafwisp', 'ภูตใบไม้ร่วง', 31, 'spirit', 'caster', { region: 'verdant', spr: 'm_lpc_ghost', tint: [90, 1.0, 6], scale: 0.8, element: 'wind', d: 'วิญญาณใบไม้ที่ร่วงหล่นในสวนศักดิ์สิทธิ์' });
m('spiritwolf', 'หมาป่าวิญญาณ', 34, 'spirit', 'pack', { region: 'verdant', spr: 'm_lpc_wolf', tint: [170, 0.6, 14], d: 'วิญญาณหมาป่าผู้พิทักษ์สวน ล่าเป็นฝูง' });
m('mossgolem', 'โกเลมมอส', 36, 'elemental', 'passive', { region: 'verdant', spr: 'm_lpc_golem', tint: [80, 0.9, -6], scale: 1.1, hpMul: 1.3, d: 'หินมีชีวิตที่หลับใหลมานาน ทนทานแต่ไม่ก้าวร้าว' });
m('grovewarden', 'ผู้เฝ้าสวนวิญญาณ', 38, 'elemental', 'boss', Object.assign({ region: 'verdant', spr: 'm_lpc_golem', tint: [170, 0.8, 10], scale: 2.1, respawn: 1200, skills: ['spore', 'quake', 'summon'], minions: 'leafwisp', element: 'holy',
  phases: [{ at: 0.6, atk: 1.2, msg: 'ผู้เฝ้าสวนปลุกวิญญาณใบไม้!' }, { at: 0.3, atk: 1.45, spd: 1.2, msg: 'ศิลาของผู้เฝ้าสวนแตกร้าว... มันคลุ้มคลั่ง!' }], d: 'บอสสนาม: ผู้พิทักษ์ศิลาที่ถูกเมล็ดวอยด์บิดเบือน' }, VB));
// Beast Valley (Lv32-42): the Fang tribe of orcs and the great beasts
m('valleywolf', 'หมาป่าหุบเขา', 33, 'beast', 'pack', { region: 'verdant', spr: 'm_lpc_wolf', tint: [20, 0.9, -4], d: 'หมาป่าสีน้ำตาลที่ล่าเป็นฝูงในทุ่งหญ้าสูง' });
m('fangorc', 'ออร์คเผ่าเขี้ยว', 37, 'orc', 'aggressive', { region: 'verdant', spr: 'm_lpc2_orc', scale: 1.15, d: 'นักรบออร์คที่บุกเข้ามาในหุบเขา' });
m('fangarcher', 'ออร์คนักธนูเผ่าเขี้ยว', 39, 'orc', 'ranged', { region: 'verdant', spr: 'm_lpc2_orcarcher', scale: 1.1, range: 6, d: 'ออร์คนักยิงที่คอยหนุนแนวหน้า' });
m('grizzly', 'หมีกริซลี่', 40, 'beast', 'aggressive', { region: 'verdant', spr: 'm_lpc_bear', tint: [10, 0.8, -8], scale: 1.15, hpMul: 1.15, d: 'หมียักษ์ที่ครองหุบเขาก่อนพวกออร์คจะมา' });
m('silvermane', 'หมาป่าขนเงิน', 41, 'beast', 'pack', { role: 'elite', region: 'verdant', spr: 'm_lpc_werewolf', tint: [0, 0.1, 18], scale: 1.3, respawn: 540, skills: ['charge'], d: 'อีลิท: จ่าฝูงหมาป่าขนเงิน พุ่งเข้าใส่จากระยะไกล' });
m('grimpaw', 'กริมพอว์ ราชาหมีหุบเขา', 42, 'beast', 'boss', Object.assign({ region: 'verdant', spr: 'm_lpc_bear', tint: [-10, 0.6, -14], scale: 2.3, respawn: 1200, skills: ['root_slam', 'charge', 'summon'], minions: 'valleywolf',
  phases: [{ at: 0.6, atk: 1.25, msg: 'กริมพอว์คำรามเรียกฝูงหมาป่า!' }, { at: 0.3, atk: 1.55, spd: 1.3, msg: 'กริมพอว์คลั่งเลือด!' }], d: 'บอสสนาม: ราชาหมีที่ปกครองหุบเขามานับร้อยปี' }, VB));
// Thornmire (Lv38-45): a rotting swamp where the void seed's roots surfaced
m('mirefrog', 'กบหนองมืด', 39, 'aquatic', 'aggressive', { region: 'verdant', spr: 'm_lpc_frogman', tint: [40, 0.7, -12], d: 'กบยักษ์ที่ซุ่มอยู่ใต้น้ำขุ่น' });
m('bogviper', 'งูหนองพิษ', 41, 'beast', 'aggressive', { region: 'verdant', spr: 'm_lpc_snake', tint: [200, 0.6, -14], aggro: 5, element: 'shadow', d: 'งูพิษดำในหนองหนาม กัดเจ็บและเร็ว' });
m('bogzombie', 'ซอมบี้หนอง', 42, 'undead', 'aggressive', { region: 'verdant', spr: 'm_lpc2_bogzombie', d: 'นักเดินทางที่จมหนองแล้วถูกรากวอยด์ปลุกขึ้นมา' });
m('marshwisp', 'ภูตไฟหนอง', 43, 'spirit', 'caster', { region: 'verdant', spr: 'm_lpc_ghost', tint: [-160, 1.2, 10], element: 'fire', d: 'ไฟผีที่ล่อคนหลงทางให้เดินลงหนอง' });
m('mireking', 'ราชากบหนอง', 44, 'aquatic', 'aggressive', { role: 'elite', region: 'verdant', spr: 'm_lpc_frogman', tint: [80, 0.9, -4], scale: 1.6, respawn: 600, skills: ['quake'], d: 'อีลิท: กบยักษ์ผู้ครองหนอง กระโดดทับพื้นเป็นวงกว้าง' });
// Ancient Tree (dungeon, Lv38-45): the hollow heart of the oldest tree, where the second void seed took root
m('heartgrub', 'หนอนแก่นไม้', 38, 'insect', 'pack', { region: 'verdant', spr: 'm_lpc_centipede', tint: [90, 0.9, 4], scale: 0.55, d: 'ตัวอ่อนที่กัดกินแก่นไม้จากข้างใน' });
m('rootguard', 'ผู้พิทักษ์ราก', 40, 'plant', 'aggressive', { region: 'verdant', spr: 'm_lpc_flower', tint: [10, 0.6, -10], scale: 1.6, hpMul: 1.1, d: 'รากไม้ที่ลุกขึ้นปกป้องหัวใจต้นไม้' });
m('sapspirit', 'ภูตยางไม้', 42, 'spirit', 'healer', { region: 'verdant', spr: 'm_lpc_ghost', tint: [-120, 1.1, 8], d: 'วิญญาณยางไม้ที่ซ่อมแซมผู้พิทักษ์ราก' });
m('barkspider', 'แมงมุมเปลือกไม้', 44, 'insect', 'aggressive', { region: 'verdant', spr: 'm_lpc_spider', tint: [20, 0.6, -6], scale: 1.1, d: 'แมงมุมที่ชักใยตามโพรงไม้มืด' });
m('rotheart', 'รอทฮาร์ท หัวใจไม้เน่า', 45, 'plant', 'boss', Object.assign({ region: 'verdant', spr: 'm_lpc_flower', tint: [250, 0.7, -16], scale: 2.7, respawn: 1500, hpMul: 1.15, skills: ['root_slam', 'spore', 'summon'], minions: 'heartgrub', element: 'shadow',
  phases: [{ at: 0.7, atk: 1.15, msg: 'รากเน่าทะลุพื้นขึ้นมา!' }, { at: 0.45, atk: 1.35, msg: 'รอทฮาร์ทดูดพลังจากเมล็ดวอยด์!' }, { at: 0.2, atk: 1.6, spd: 1.25, msg: 'หัวใจไม้เน่ากำลังจะแตก... มันบ้าคลั่ง!' }], d: 'บอสดันเจี้ยน: หัวใจของต้นไม้โบราณที่ถูกเมล็ดวอยด์กัดกิน' }, VB));

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
  caverat: { common: [[128, .5]], uncommon: [[1, .12]], rare: [[402, .01]] },
  shroomlet: { common: [[129, .5]], uncommon: [[104, .2]], rare: [[403, .01]] },
  pinkjel: { common: [[10, .5]], uncommon: [[1, .15]], rare: [[401, .015]] },
  burrowbat: { common: [[117, .4]], uncommon: [[2, .06]], rare: [[356, .01]] },
  spiderling: { common: [[130, .45]], uncommon: [[2, .06]], rare: [[411, .01]] },
  webspinner: { common: [[130, .5]], uncommon: [[108, .2]], rare: [[228, .012], [411, .01]] },
  nestcentipede: { common: [[131, .45]], uncommon: [[2, .08]], rare: [[306, .01]] },
  venomshroom: { common: [[129, .5]], uncommon: [[3, .06]], rare: [[404, .012]] },
  cryptskeleton: { common: [[134, .45], [13, .3]], uncommon: [[5, .04]], rare: [[365, .006]] },
  ghoul: { common: [[133, .45]], uncommon: [[5, .05]], rare: [[313, .008]] },
  cryptwraith: { common: [[133, .3], [116, .3]], uncommon: [[6, .05]], rare: [[226, .008], [409, .006]] },
  gravepumpkin: { common: [[129, .3], [4, .3]], uncommon: [[5, .05]], rare: [[407, .01]] },
  labyrinthguard: { common: [[136, .45]], uncommon: [[5, .06]], rare: [[219, .01]] },
  cavebear: { common: [[137, .5]], uncommon: [[5, .06]], rare: [[312, .01]] },
  giantcentipede: { common: [[131, .5]], uncommon: [[6, .05]], rare: [[407, .012]] },
  boneknight: { common: [[134, .45], [120, .2]], uncommon: [[5, .06]], rare: [[365, .012], [311, .004]] },
  jellyqueen: { common: [[127, 1], [10, 1]], uncommon: [[2, 1], [41, .2]], rare: [[364, .2]], veryRare: [[404, .05]] },
  broodmother: { common: [[132, 1], [130, 1]], uncommon: [[2, 1], [228, .25]], rare: [[225, .15], [411, .2]], veryRare: [[306, .05]] },
  moonfang: { common: [[135, 1], [134, 1]], uncommon: [[5, 1], [226, .25], [313, .2]], rare: [[410, .12]], veryRare: [[365, .05]] },
  labyrinthking: { common: [[138, 1], [136, 1]], uncommon: [[5, 1], [312, .25], [365, .2]], rare: [[227, .1]], veryRare: [[410, .04]] },

  // Verdant Wilds
  vinesnake: { common: [[171, .45], [170, .25]], uncommon: [[5, .06]], rare: [[418, .008]] },
  canopybee: { common: [[172, .45]], uncommon: [[9, .04]], rare: [[412, .006]] },
  leafgoblin: { common: [[174, .45], [170, .2]], uncommon: [[5, .06]], rare: [[366, .01], [232, .006]] },
  mossbear: { common: [[173, .5], [190, .2]], uncommon: [[9, .05]], rare: [[318, .006]] },
  leafshaman: { common: [[174, .35], [104, .3]], uncommon: [[9, .08], [6, .04]], rare: [[233, .008], [415, .006]] },
  leafchief: { common: [[191, .6], [174, 1]], uncommon: [[9, .3], [369, .06]], rare: [[245, .05], [413, .04]], veryRare: [[322, .02]] },
  sporeling: { common: [[175, .5]], uncommon: [[129, .25]], rare: [[415, .006]] },
  capshroom: { common: [[176, .45], [175, .2]], uncommon: [[6, .05]], rare: [[368, .01], [236, .006]] },
  sporebat: { common: [[177, .5]], uncommon: [[5, .06]], rare: [[418, .008]] },
  shroomfrog: { common: [[178, .45]], uncommon: [[9, .05]], rare: [[317, .008]] },
  eldercap: { common: [[192, .6], [176, 1]], uncommon: [[9, .3], [368, .08]], rare: [[319, .06], [415, .05]], veryRare: [[240, .015]] },
  leafwisp: { common: [[179, .45]], uncommon: [[6, .05]], rare: [[317, .008], [415, .006]] },
  spiritwolf: { common: [[180, .45]], uncommon: [[5, .06]], rare: [[414, .004]] },
  mossgolem: { common: [[181, .45], [118, .25]], uncommon: [[190, .3]], rare: [[316, .008]] },
  grovewarden: { common: [[193, 1], [181, 1]], uncommon: [[9, 1], [240, .25], [319, .2]], rare: [[416, .12]], veryRare: [[244, .03]] },
  valleywolf: { common: [[182, .5]], uncommon: [[5, .06]], rare: [[231, .006]] },
  fangorc: { common: [[183, .45]], uncommon: [[9, .05]], rare: [[245, .008], [413, .006]] },
  fangarcher: { common: [[183, .35], [108, .25]], uncommon: [[9, .05]], rare: [[239, .003], [232, .01]] },
  grizzly: { common: [[184, .5]], uncommon: [[9, .06]], rare: [[318, .01]] },
  silvermane: { common: [[196, .6], [182, 1]], uncommon: [[9, .3]], rare: [[239, .06], [414, .05]], veryRare: [[241, .01]] },
  grimpaw: { common: [[194, 1], [184, 1]], uncommon: [[9, 1], [318, .25], [414, .2]], rare: [[241, .1]], veryRare: [[417, .03]] },
  mirefrog: { common: [[185, .5]], uncommon: [[9, .05]], rare: [[322, .006]] },
  bogviper: { common: [[186, .45], [171, .2]], uncommon: [[9, .05]], rare: [[242, .006], [418, .008]] },
  bogzombie: { common: [[185, .35], [133, .3]], uncommon: [[9, .06]], rare: [[370, .005]] },
  marshwisp: { common: [[187, .45]], uncommon: [[6, .06]], rare: [[244, .002], [416, .002]] },
  mireking: { common: [[197, .6], [185, 1]], uncommon: [[9, .3]], rare: [[242, .06], [320, .04]], veryRare: [[417, .01]] },
  heartgrub: { common: [[188, .3], [131, .3]], uncommon: [[9, .04]], rare: [[418, .006]] },
  rootguard: { common: [[188, .4], [190, .3]], uncommon: [[9, .06]], rare: [[370, .01]] },
  sapspirit: { common: [[188, .45]], uncommon: [[6, .06]], rare: [[416, .003]] },
  barkspider: { common: [[189, .45], [130, .2]], uncommon: [[9, .06]], rare: [[320, .008]] },
  rotheart: { common: [[195, 1], [188, 1]], uncommon: [[9, 1], [321, .2], [243, .15], [244, .15]], rare: [[416, .12], [370, .2]], veryRare: [[417, .05]] },
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
