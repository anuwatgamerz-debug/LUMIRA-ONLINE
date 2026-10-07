'use strict';
// Skill registry. type: target (needs a monster in range + line of sight), self, area (monsters around the caster).
// cls: the class that teaches it (undefined = Adventurer basics everyone keeps). lv: base level needed.
// Effects are data: mult/hits/magic/element for damage, heal/spRestore for self, buff for timed buffs.
// The first six are the original skills, unchanged.
const SKILLS = {
  bash:   { n: 'Bash', th: 'ฟันกระแทก', type: 'target', range: 1.6, sp: 8, cd: 1200, lv: 1, mult: 2.2, d: 'ฟันแรง ×2.2 โดนแน่นอน (ระยะประชิด)' },
  heal:   { n: 'First Aid', th: 'ปฐมพยาบาล', type: 'self', sp: 12, cd: 8000, lv: 1, heal: { pct: 0.2, int: 3 }, d: 'ฟื้น HP 20% + INT×3' },
  bolt:   { n: 'Spark Bolt', th: 'ลูกไฟประกาย', type: 'target', range: 6, sp: 10, cd: 2500, lv: 3, magic: 1, fx: 'bolt', d: 'ยิงเวทระยะไกล 6 ช่อง แรงตาม INT' },
  focus:  { n: 'Focus', th: 'รวมสมาธิ', type: 'self', sp: 0, cd: 20000, lv: 4, spRestore: 0.25, d: 'ฟื้น SP 25%' },
  cleave: { n: 'Cleave', th: 'ฟันกวาด', type: 'area', range: 1.8, sp: 16, cd: 6000, lv: 5, mult: 1.4, fx: 'ring', d: 'ฟันมอนรอบตัวทุกตัว ×1.4' },
  twin:   { n: 'Twin Strike', th: 'ฟันคู่', type: 'target', range: 1.6, sp: 14, cd: 4000, lv: 8, mult: 1.2, hits: 2, d: 'ฟัน 2 ครั้ง ×1.2 (ระยะประชิด)' },

  // ---- Vanguard: front line, shields the party
  v_wall:   { cls: 'vanguard', n: 'Bulwark', th: 'กำแพงเหล็ก', type: 'self', sp: 14, cd: 18000, lv: 10, buff: { id: 'bulwark', ms: 12000, def: 0.5, th: 'กำแพงเหล็ก' }, d: 'DEF +50% 12 วิ' },
  v_strike: { cls: 'vanguard', n: 'Rally Strike', th: 'ฟาดปลุกใจ', type: 'target', range: 1.6, sp: 12, cd: 3000, lv: 11, mult: 2.0, taunt: 1, d: 'ฟาด ×2.0 และดึงความสนใจมอนรอบตัวมาที่ตัวเอง' },
  v_charge: { cls: 'vanguard', n: 'Breach Charge', th: 'พุ่งทลาย', type: 'target', range: 4, sp: 18, cd: 7000, lv: 13, mult: 1.8, dash: 1, d: 'พุ่งเข้าหาเป้าหมายในระยะ 4 ช่องแล้วฟาด ×1.8' },
  // ---- Ranger: bow, range and footwork
  r_pierce: { cls: 'ranger', n: 'Piercing Arrow', th: 'ศรทะลวง', type: 'target', range: 7, sp: 10, cd: 2200, lv: 10, mult: 2.0, fx: 'arrow', d: 'ยิงศรแรง ×2.0 ระยะ 7 ช่อง' },
  r_volley: { cls: 'ranger', n: 'Twin Volley', th: 'ศรคู่', type: 'target', range: 7, sp: 14, cd: 4500, lv: 12, mult: 1.15, hits: 2, fx: 'arrow', d: 'ยิงศร 2 ดอก ×1.15' },
  r_step:   { cls: 'ranger', n: "Windstep", th: 'ก้าวสายลม', type: 'self', sp: 12, cd: 20000, lv: 14, buff: { id: 'windstep', ms: 10000, flee: 0.4, aspd: 0.25, th: 'ก้าวสายลม' }, d: 'FLEE +40% ตีเร็วขึ้น 25% 10 วิ' },
  // ---- Arcanist: elemental magic
  a_ember:  { cls: 'arcanist', n: 'Ember Lance', th: 'หอกเพลิง', type: 'target', range: 7, sp: 14, cd: 2600, lv: 10, mult: 2.3, magic: 1, element: 'fire', fx: 'bolt', d: 'หอกไฟเวท ×2.3 ระยะ 7 ช่อง (ธาตุไฟ)' },
  a_frost:  { cls: 'arcanist', n: 'Frost Needle', th: 'เข็มน้ำแข็ง', type: 'target', range: 6, sp: 12, cd: 3200, lv: 12, mult: 1.6, magic: 1, element: 'water', slow: 3000, fx: 'bolt', d: 'เวทน้ำแข็ง ×1.6 ทำให้มอนช้าลง 3 วิ' },
  a_nova:   { cls: 'arcanist', n: 'Rune Nova', th: 'โนวาอักษรรูน', type: 'area', range: 2.6, sp: 24, cd: 8000, lv: 14, mult: 1.5, magic: 1, fx: 'ring', d: 'ระเบิดเวทรอบตัว 2.6 ช่อง ×1.5' },
  // ---- Cleric: holy support
  c_mend:   { cls: 'cleric', n: 'Mending Light', th: 'แสงสมาน', type: 'self', sp: 16, cd: 5000, lv: 10, heal: { pct: 0.3, int: 5 }, d: 'ฟื้น HP 30% + INT×5' },
  c_smite:  { cls: 'cleric', n: 'Dawn Smite', th: 'ลงทัณฑ์รุ่งอรุณ', type: 'target', range: 6, sp: 12, cd: 2800, lv: 11, mult: 1.7, magic: 1, element: 'holy', fx: 'bolt', d: 'เวทศักดิ์สิทธิ์ ×1.7 (แรง ×2 ต่ออันเดด/วอยด์)' },
  c_bless:  { cls: 'cleric', n: 'Sanctum Blessing', th: 'พรแห่งวิหาร', type: 'self', sp: 20, cd: 30000, lv: 13, buff: { id: 'bless', ms: 30000, atk: 0.15, matk: 0.15, def: 0.15, th: 'พรแห่งวิหาร' }, d: 'ATK/MATK/DEF +15% 30 วิ' },
  // ---- Rogue: speed, criticals, stealth
  g_back:   { cls: 'rogue', n: 'Shadow Fang', th: 'เขี้ยวเงา', type: 'target', range: 1.6, sp: 12, cd: 2400, lv: 10, mult: 2.5, crit: 1, d: 'แทง ×2.5 คริติคอลเสมอ' },
  g_venom:  { cls: 'rogue', n: 'Venom Flurry', th: 'พิษพายุ', type: 'target', range: 1.6, sp: 15, cd: 5000, lv: 12, mult: 0.9, hits: 3, d: 'แทงรัว 3 ครั้ง ×0.9' },
  g_veil:   { cls: 'rogue', n: 'Smoke Veil', th: 'ม่านควัน', type: 'self', sp: 14, cd: 22000, lv: 14, buff: { id: 'veil', ms: 8000, flee: 0.6, stealth: 1, th: 'ม่านควัน' }, d: 'หายตัว: มอนเลิกไล่ FLEE +60% 8 วิ' },
  // ---- Artisan: tools, bombs and know-how
  t_hammer: { cls: 'artisan', n: 'Hammer Toss', th: 'ขว้างค้อน', type: 'target', range: 5, sp: 10, cd: 2400, lv: 10, mult: 1.9, fx: 'bolt', d: 'ขว้างค้อน ×1.9 ระยะ 5 ช่อง' },
  t_bomb:   { cls: 'artisan', n: 'Flask Bomb', th: 'ระเบิดขวดยา', type: 'area', range: 2.4, sp: 20, cd: 7000, lv: 12, mult: 1.6, fx: 'ring', d: 'ระเบิดรอบตัว 2.4 ช่อง ×1.6' },
  t_repair: { cls: 'artisan', n: 'Field Repair', th: 'ซ่อมสนาม', type: 'self', sp: 14, cd: 15000, lv: 14, heal: { pct: 0.15, int: 2 }, buff: { id: 'repair', ms: 15000, def: 0.3, th: 'ซ่อมสนาม' }, d: 'ฟื้น HP 15% และ DEF +30% 15 วิ' },
};
// sound ids (public/audio-registry.js) per skill: castSound when used, hitSound when it lands
const SOUNDS = { bash: ['skill_slash_cast', 'skill_slash_hit'], heal: ['skill_heal_cast'], bolt: ['skill_lightning_cast', 'skill_lightning_hit'], focus: ['skill_buff_cast'], cleave: ['skill_slash_cast', 'skill_bomb_hit'], twin: ['skill_slash_cast', 'skill_slash_hit'], v_wall: ['skill_buff_cast'], v_strike: ['skill_slash_cast', 'skill_slash_hit'], v_charge: ['skill_teleport', 'skill_slash_hit'], r_pierce: ['bow_shoot', 'arrow_hit'], r_volley: ['bow_shoot', 'arrow_hit'], r_step: ['skill_wind_cast'], a_ember: ['skill_fire_cast', 'skill_fire_hit'], a_frost: ['skill_ice_cast', 'skill_ice_hit'], a_nova: ['skill_fire_cast', 'skill_bomb_hit'], c_mend: ['skill_heal_cast'], c_smite: ['skill_holy_cast', 'skill_holy_hit'], c_bless: ['skill_holy_cast'], g_back: ['dagger_swing', 'skill_slash_hit'], g_venom: ['dagger_swing', 'skill_poison_hit'], g_veil: ['skill_stealth'], t_hammer: ['mace_swing', 'heavy_hit'], t_bomb: ['skill_fire_cast', 'skill_bomb_hit'], t_repair: ['skill_buff_cast'] };
// visual effects: ids from the VFX registry (public/vfx.js) — skills never point at image files.
// [castVfx (on the caster), projectileVfx (caster -> target), hitVfx (each confirmed hit), areaVfx (the area itself)]
const VFX = {
  bash: ['cast.glint', 0, 'bash.hit', 0], heal: ['heal.self', 0, 0, 0], bolt: ['bolt.cast', 'bolt.proj', 'bolt.hit', 0], focus: ['focus.self', 0, 0, 0],
  cleave: [0, 0, 'cleave.hit', 'cleave.area'], twin: [0, 0, 'twin.hit', 0],
  v_wall: ['vg.bulwark', 0, 0, 0], v_strike: ['vg.taunt', 0, 'vg.strike', 0], v_charge: ['vg.charge', 0, 'vg.charge.hit', 0],
  r_pierce: ['rg.draw', 'rg.pierce', 'rg.pierce.hit', 0], r_volley: ['rg.draw', 'rg.volley', 'rg.volley.hit', 0], r_step: ['rg.windstep', 0, 0, 0],
  a_ember: ['ar.cast.fire', 'ar.ember', 'ar.ember.hit', 0], a_frost: ['ar.cast.ice', 'ar.frost', 'ar.frost.hit', 0], a_nova: ['ar.cast.nova', 0, 'ar.nova.hit', 'ar.nova'],
  c_mend: ['cl.mend', 0, 0, 0], c_smite: ['cl.cast', 'cl.smite', 'cl.smite.hit', 0], c_bless: ['cl.bless', 0, 0, 0],
  g_back: ['rq.shadow', 0, 'rq.fang', 0], g_venom: [0, 0, 'rq.venom', 0], g_veil: ['rq.veil', 0, 0, 0],
  t_hammer: [0, 't.hammer', 't.hammer.hit', 0], t_bomb: [0, 0, 't.bomb.hit', 't.bomb'], t_repair: ['t.repair', 0, 0, 0],
};
for (const id in VFX) { const [castVfx, projectileVfx, hitVfx, areaVfx] = VFX[id]; Object.assign(SKILLS[id], { castVfx: castVfx || undefined, projectileVfx: projectileVfx || undefined, hitVfx: hitVfx || undefined, areaVfx: areaVfx || undefined }); }
for (const id in SKILLS) { SKILLS[id].id = id; if (SOUNDS[id]) { SKILLS[id].castSound = SOUNDS[id][0]; if (SOUNDS[id][1]) SKILLS[id].hitSound = SOUNDS[id][1]; } }
// ---- second-class skills (content/skills2.js): sounds picked from what the skill does
const { SKILLS2 } = require('./skills2');
const EL_SND = { fire: ['skill_fire_cast', 'skill_fire_hit'], water: ['skill_ice_cast', 'skill_ice_hit'], wind: ['skill_lightning_cast', 'skill_lightning_hit'], shadow: ['skill_dark_cast', 'skill_dark_hit'], holy: ['skill_holy_cast', 'skill_holy_hit'] };
for (const [id, S2] of Object.entries(SKILLS2)) {
  if (S2.type === 'passive') { S2.castSound = 'skill_buff_cast'; }
  else if (S2.needs && S2.needs.includes('bow')) [S2.castSound, S2.hitSound] = ['bow_shoot', 'arrow_hit'];
  else if (S2.cls === 'machinist' && S2.mult) [S2.castSound, S2.hitSound] = ['device_shot', 'arrow_hit'];
  else if (S2.element || S2.elements) [S2.castSound, S2.hitSound] = EL_SND[S2.element || 'fire'];
  else if (S2.dot && !S2.mult) [S2.castSound, S2.hitSound] = ['skill_slash_cast', 'skill_poison_hit'];
  else if (S2.trap || S2.turret) [S2.castSound, S2.hitSound] = ['skill_slash_cast', S2.turret ? 'skill_bomb_hit' : 'skill_poison_hit'];
  else if (S2.heal || S2.barrier || S2.revive) S2.castSound = 'skill_heal_cast';
  else if (S2.mult) [S2.castSound, S2.hitSound] = S2.dot ? ['skill_slash_cast', 'skill_poison_hit'] : S2.dash ? ['skill_teleport', 'skill_slash_hit'] : ['skill_slash_cast', 'skill_slash_hit'];
  else S2.castSound = S2.buff && S2.buff.stealth ? 'skill_stealth' : 'skill_buff_cast';
  SKILLS[id] = S2;
}
// VFX Phase 2: second-class skills, same [cast, projectile, hit, area] layout as above (passives have none)
const VFX2 = {
  kn_bash: ['kn.cast', 0, 'kn.bash.hit', 0], kn_stance: ['kn.stance', 0, 0, 0], kn_taunt: [0, 0, 0, 'kn.taunt'], kn_iron: ['kn.iron', 0, 0, 0], kn_wave: [0, 0, 'kn.wave.hit', 'kn.wave'],
  bs_rage: ['bs.cast', 0, 'bs.rage.hit', 0], bs_whirl: [0, 0, 'bs.whirl.hit', 'bs.whirl'], bs_fury: ['bs.fury', 0, 0, 0], bs_exec: ['bs.cast', 0, 'bs.exec.hit', 0], bs_warcry: ['bs.warcry', 0, 0, 0],
  ss_pierce: ['ss.draw', 'ss.pierce', 'ss.pierce.hit', 0], ss_charged: ['ss.charge', 'ss.charged', 'ss.charged.hit', 0], ss_focus: ['ss.focus', 0, 0, 0], ss_eagle: ['ss.eagle', 0, 0, 0], ss_rain: ['ss.draw', 0, 'ss.rain.hit', 'ss.rain'],
  bh_snare: ['bh.cast', 0, 0, 'bh.snare'], bh_mark: ['bh.cast', 0, 'bh.mark.hit', 0], bh_ptrap: ['bh.cast', 0, 0, 'bh.ptrap'], bh_instinct: ['bh.instinct', 0, 0, 0], bh_rapid: ['bh.cast', 'bh.rapid', 'bh.rapid.hit', 0],
  el_chain: ['el.cast', 'el.chain', 'el.chain.hit', 0], el_frost: ['el.cast', 0, 'el.frost.hit', 'el.frost'], el_shield: ['el.shield', 0, 0, 0], el_meteor: ['el.cast', 0, 'el.meteor.hit', 'el.meteor'], el_surge: ['el.cast', 0, 'el.surge.hit', 'el.surge'],
  wl_bolt: ['wl.cast', 'wl.bolt', 'wl.bolt.hit', 0], wl_curse: ['wl.cast', 0, 'wl.curse.hit', 0], wl_drain: ['wl.cast', 0, 'wl.drain.hit', 0], wl_mark: ['wl.cast', 0, 'wl.mark.hit', 0], wl_nova: ['wl.cast', 0, 'wl.nova.hit', 'wl.nova'],
  pr_heal: ['pr.heal', 0, 0, 0], pr_barrier: ['pr.barrier', 0, 0, 0], pr_group: ['pr.group', 0, 0, 0], pr_purify: [0, 0, 'pr.purify.hit', 'pr.purify'], pr_resurrect: ['pr.revive', 0, 0, 0],
  or_fate: ['or.fate', 0, 0, 0], or_haste: ['or.haste', 0, 0, 0], or_fortune: ['or.fortune', 0, 0, 0], or_foresight: ['or.foresight', 0, 0, 0], or_ward: ['or.ward', 0, 0, 0],
  as_backstab: ['as.cast', 0, 'as.back.hit', 0], as_venom: [0, 0, 'as.venom.hit', 0], as_step: ['as.step', 0, 'as.step.hit', 0], as_mark: ['as.cast', 0, 'as.mark.hit', 0], as_execute: ['as.cast', 0, 'as.exec.hit', 0],
  sd_dash: ['sd.dash', 0, 'sd.dash.hit', 0], sd_veil: [0, 0, 0, 'sd.veil'], sd_phantom: [0, 0, 'sd.phantom.hit', 'sd.phantom'], sd_dance: ['sd.dance', 0, 0, 0], sd_nightfall: [0, 0, 'sd.nightfall.hit', 'sd.nightfall'],
  al_acid: ['al.cast', 'al.flask', 'al.acid.hit', 0], al_mist: ['al.mist', 0, 0, 0], al_bomb: ['al.cast', 0, 'al.bomb.hit', 'al.bomb'], al_catalyst: ['al.catalyst', 0, 0, 0], al_transmute: ['al.transmute', 0, 0, 0],
  mc_burst: ['mc.cast', 'mc.shot', 'mc.shot.hit', 0], mc_mine: ['mc.cast', 0, 0, 'mc.mine'], mc_overcharge: ['mc.overcharge', 0, 0, 0], mc_drone: ['mc.drone', 0, 0, 0], mc_turret: ['mc.cast', 0, 0, 'mc.turret'],
};
for (const id in VFX2) { const [castVfx, projectileVfx, hitVfx, areaVfx] = VFX2[id]; Object.assign(SKILLS[id], { castVfx: castVfx || undefined, projectileVfx: projectileVfx || undefined, hitVfx: hitVfx || undefined, areaVfx: areaVfx || undefined }); }
module.exports = { SKILLS };
