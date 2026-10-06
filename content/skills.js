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
for (const id in SKILLS) SKILLS[id].id = id;
module.exports = { SKILLS };
