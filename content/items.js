'use strict';
// Item registry. ids 1-41 are the original items (unchanged). New ranges:
//   2-9 consumables | 100-199 materials, quest items | 200-299 weapons | 300-349 armor
//   350-399 headgear | 400-449 accessories | 450-499 costume (cosmetic) headgear
// ty: use | etc | quest | eq.  slot: wpn arm head acc chead.  rar: 0 Common 1 Uncommon 2 Rare 3 Epic 4 Legendary.
// req: required base level. cls: class ids allowed (any class in that line), omitted = everyone.
// wt: weapon type, at: armor type, vis: headgear visual id (drawn on the character), range: attack reach.
const RARITY = [
  { id: 0, th: 'ธรรมดา', en: 'Common', col: '#d8d2c0' }, { id: 1, th: 'ไม่ธรรมดา', en: 'Uncommon', col: '#7dd87d' },
  { id: 2, th: 'หายาก', en: 'Rare', col: '#6fb7ff' }, { id: 3, th: 'มหากาพย์', en: 'Epic', col: '#c58bff' },
  { id: 4, th: 'ตำนาน', en: 'Legendary', col: '#ffb347' },
];
const WEAPON_TYPES = {
  sword: { th: 'ดาบ', atk: 1.0, matk: 0, range: 1.6 }, greatsword: { th: 'ดาบใหญ่', atk: 1.32, matk: 0, range: 1.6, aspd: 160 },
  dagger: { th: 'มีดสั้น', atk: 0.82, matk: 0, range: 1.6, aspd: -120, crit: 4 }, bow: { th: 'ธนู', atk: 0.95, matk: 0, range: 6 },
  staff: { th: 'คทา', atk: 0.45, matk: 1.15, range: 1.6 }, wand: { th: 'ไม้เท้าเวท', atk: 0.35, matk: 0.95, range: 1.6, aspd: -60, sp: 1 },
  mace: { th: 'กระบอง', atk: 0.95, matk: 0.35, range: 1.6 }, spear: { th: 'หอก', atk: 1.1, matk: 0, range: 2.2, aspd: 80 },
  device: { th: 'อุปกรณ์กล', atk: 1.05, matk: 0.2, range: 4, aspd: 60 },
};
const ARMOR_TYPES = { light: { th: 'เกราะเบา', def: 1, mdef: 0.6 }, medium: { th: 'เกราะกลาง', def: 1.4, mdef: 0.5, flee: -2 }, heavy: { th: 'เกราะหนัก', def: 2, mdef: 0.35, flee: -6 }, robe: { th: 'ชุดคลุม', def: 0.55, mdef: 1.6 } };
const HEAD_TYPES = { cap: 'Cap', hat: 'Hat', helmet: 'Helmet', hood: 'Hood', crown: 'Crown', mask: 'Mask', headband: 'Headband' };

const ITEMS = {
  // ---- original items (do not renumber: saves point at these ids)
  1: { n: 'ยาแดง', ty: 'use', heal: 45, buy: 50 },
  2: { n: 'ยาส้ม', ty: 'use', heal: 110, buy: 160 },
  3: { n: 'ยาฟ้า', ty: 'use', sp: 40, buy: 400 },
  10: { n: 'เยลลี่', ty: 'etc', sell: 8 },
  11: { n: 'กระดองปู', ty: 'etc', sell: 20 },
  12: { n: 'หนามกระบองเพชร', ty: 'etc', sell: 30 },
  13: { n: 'เศษกระดูกเก่า', ty: 'etc', sell: 55 },
  14: { n: 'ใบไม้วิเศษ', ty: 'etc', sell: 18 },
  15: { n: 'คริสตัลวิญญาณ', ty: 'etc', sell: 48 },
  20: { n: 'มีดสั้น', ty: 'eq', slot: 'wpn', wt: 'dagger', atk: 10, buy: 100 },
  21: { n: 'ดาบไม้', ty: 'eq', slot: 'wpn', wt: 'sword', atk: 18, buy: 600 },
  22: { n: 'ดาบเหล็ก', ty: 'eq', slot: 'wpn', wt: 'sword', atk: 32, buy: 2400 },
  23: { n: 'เขี้ยวพระจันทร์', ty: 'eq', slot: 'wpn', wt: 'dagger', atk: 45, rar: 2, sell: 3000 },
  30: { n: 'เสื้อผ้าฝ้าย', ty: 'eq', slot: 'arm', at: 'light', def: 2, buy: 80 },
  31: { n: 'เสื้อหนัง', ty: 'eq', slot: 'arm', at: 'light', def: 6, buy: 1000 },
  40: { n: 'หมวกแก๊ป', ty: 'eq', slot: 'head', ht: 'cap', vis: 'cap', def: 2, buy: 500 },
  41: { n: 'มงกุฎเจลลอป', ty: 'eq', slot: 'head', ht: 'crown', vis: 'jelcrown', def: 5, rar: 2, sell: 1500 },

  // ---- consumables
  4: { n: 'ขนมปังข้าวสาลี', ty: 'use', heal: 25, buy: 20, d: 'ขนมปังจากโรงอบลูมิร่า' },
  5: { n: 'ยาแดงเข้มข้น', ty: 'use', heal: 240, buy: 420, req: 15 },
  6: { n: 'ยาฟ้าเข้มข้น', ty: 'use', sp: 95, buy: 900, req: 15 },
  7: { n: 'คัมภีร์กลับบ้าน', ty: 'use', recall: 1, buy: 120, d: 'วาร์ปกลับจุดเซฟ (โรงเตี๊ยม)' },
  8: { n: 'ชาสมุนไพรทุ่ง', ty: 'use', heal: 80, sp: 15, buy: 0, sell: 30, d: 'ชงจากสมุนไพรทุ่งดอกไม้' },
};
// materials and quest items: [id, name, sell, description?, ty]
for (const [id, n, sell, d, ty] of [
  [100, 'ยางดอกตูม', 6, 'ยางเหนียวจากสไปรต์ทุ่ง'], [101, 'ขนปุยนุ่ม', 9], [102, 'ปีกแมลงทุ่ง', 11], [103, 'หยดน้ำค้างใส', 7],
  [104, 'สมุนไพรทุ่ง', 10, 'เก็บได้ในทุ่งเริ่มต้น'], [105, 'เปลือกไม้มอส', 16], [106, 'กระดองด้วงเปลือก', 22], [107, 'เขี้ยวก็อบลิน', 26],
  [108, 'หนังสลิง', 30], [109, 'ฝุ่นวิสป์', 34], [110, 'เมล็ดหนาม', 24], [111, 'เกล็ดปูลำธาร', 32], [112, 'เจลแสงจันทร์', 36],
  [113, 'ผงปีกมอธ', 38], [114, 'ใบบัวลำธาร', 30], [115, 'ไส้ตะเกียงวิญญาณ', 46], [116, 'ผ้าห่อศพเก่า', 50], [117, 'ปีกค้างคาวถ้ำ', 40],
  [118, 'เศษหินผลึก', 48], [119, 'เฟืองสนิม', 55], [120, 'แร่เหล็ก', 40, 'ใช้ตีอาวุธที่ช่างตีเหล็ก'], [121, 'แร่เงินจันทร์', 90, 'แร่หายากใน Old Mine'],
  [122, 'ขี้ผึ้งตะเกียง', 44], [123, 'เปลือกแก่นไม้โบราณ', 600, 'ดรอปจาก Elder Thornwood'], [124, 'แกนกรามเหล็ก', 900, 'ดรอปจาก Ironjaw'],
  [127, 'เมือกราชินีเจลลี่', 420, 'ดรอปจากราชินีเจลลี่'], [128, 'หางหนูถ้ำ', 14], [129, 'สปอร์เห็ดเดิน', 18], [130, 'ใยแมงมุมเหนียว', 42], [131, 'ขาตะขาบ', 48],
  [132, 'เขี้ยวพิษแม่แมงมุม', 700, 'ดรอปจากแม่แมงมุม'], [133, 'ผ้าห่อสุสาน', 60], [134, 'กระดูกต้องคำสาป', 64], [135, 'ขนหมาป่าจันทร์', 900, 'ดรอปจากมูนแฟง'],
  [136, 'เขากระทิงเหล็ก', 80], [137, 'หนังหมีถ้ำ', 76], [138, 'เขาราชากระทิง', 1200, 'ดรอปจากราชาเขาวงกต'],
  [125, 'ไม้เนื้อแข็ง', 18, 'วัสดุงานช่าง'], [126, 'ผลึกรูนดิบ', 70, 'ผลึกที่สะสมพลังอักษรรูน'],
  [150, 'เศษรูนเรืองแสง', 0, 'เศษหินที่ตกลงมาจากฟ้าในคืนดาวตก', 'quest'], [151, 'จดหมายของผู้ใหญ่บ้าน', 0, 'ต้องส่งให้บรรณารักษ์ที่เมืองหลวง', 'quest'],
  [152, 'รากไม้เหี่ยว', 0, 'รากที่ถูกพลังเสื่อมกัดกิน', 'quest'], [153, 'บันทึกคนงานเหมือง', 0, 'สมุดบันทึกเปื้อนฝุ่นแร่', 'quest'],
  [154, 'ผลึกแตะวอยด์', 0, 'ผลึกสีดำที่เย็นเฉียบ... มาจากที่ไหนกันแน่?', 'quest'], [155, 'ตราทดสอบแวนการ์ด', 0, 'มอบให้ผู้ผ่านการป้องกันหมู่บ้าน', 'quest'],
  [156, 'ขนนกเป้าซ้อม', 0, 'พิสูจน์ความแม่นของนักธนู', 'quest'], [157, 'ผลึกรูนทดสอบ', 0, 'ผลึกรูนจากลำธารแสงจันทร์', 'quest'],
  [158, 'ผ้าพันแผลสะอาด', 0, 'ใช้รักษาผู้บาดเจ็บ', 'quest'], [159, 'หีบเอกสารที่ถูกขโมย', 0, 'ของที่โจรขโมยไปจากกิลด์พ่อค้า', 'quest'],
  [160, 'ค้อนฝึกหัดชิ้นแรก', 0, 'งานชิ้นแรกของช่างฝึกหัด', 'quest'], [161, 'ใบประกาศพิธีเลื่อนขั้น', 0, 'ใช้ยืนยันในพิธีเปลี่ยนอาชีพ', 'quest'],
  [162, 'ดอกจันทร์ราตรี', 0, 'ดอกไม้ที่บานเฉพาะใต้แสงจันทร์', 'quest'], [163, 'พัสดุของลุงทอม', 0, 'กล่องพัสดุไปส่งที่เมืองหลวง', 'quest'],
]) ITEMS[id] = { n, ty: ty || 'etc', sell, d };

// ---- equipment builders: stats come from type profiles x level x rarity (no hand-copied numbers)
const tierPow = (req, rar) => (8 + req * 1.55) * (1 + rar * 0.16);
function weapon(id, n, wt, req, rar, o = {}) {
  const T = WEAPON_TYPES[wt], p = tierPow(req, rar);
  ITEMS[id] = Object.assign({ n, ty: 'eq', slot: 'wpn', wt, req, rar, atk: Math.round(p * T.atk), matk: T.matk ? Math.round(p * T.matk) : 0, range: T.range > 1.6 ? T.range : undefined }, o);
}
function armor(id, n, at, req, rar, o = {}) {
  const T = ARMOR_TYPES[at], p = 2 + req * 0.42 * (1 + rar * 0.18);
  ITEMS[id] = Object.assign({ n, ty: 'eq', slot: 'arm', at, req, rar, def: Math.round(p * T.def), mdef: Math.round(p * T.mdef) }, o);
}
function head(id, n, ht, vis, req, rar, o = {}) {
  const p = 1 + req * 0.22 * (1 + rar * 0.2);
  ITEMS[id] = Object.assign({ n, ty: 'eq', slot: 'head', ht, vis, req, rar, def: Math.round(p), mdef: Math.round(p * 0.6) }, o);
}
function acc(id, n, kind, req, rar, o = {}) { ITEMS[id] = Object.assign({ n, ty: 'eq', slot: 'acc', ak: kind, req, rar }, o); }
function costume(id, n, ht, vis, o = {}) { ITEMS[id] = Object.assign({ n, ty: 'eq', slot: 'chead', ht, vis, req: 1, rar: 1, cosmetic: 1 }, o); }

// weapons Lv1-30 (price follows power; Rare+ come from drops/crafting, not shops)
weapon(200, 'ดาบฝึกหัดลูมิร่า', 'sword', 1, 0, { buy: 120 });
weapon(201, 'ไม้เท้าต้นหลิว', 'staff', 1, 0, { buy: 140 });
weapon(202, 'ธนูไม้สน', 'bow', 1, 0, { buy: 150 });
weapon(203, 'กระบองโอ๊ก', 'mace', 1, 0, { buy: 120 });
weapon(204, 'ไม้กายสิทธิ์กิ่งเบิร์ช', 'wand', 1, 0, { buy: 140 });
weapon(205, 'ดาบสั้นทหารยาม', 'sword', 10, 0, { buy: 1400, cls: ['vanguard', 'rogue', 'adventurer'] });
weapon(206, 'ดาบใหญ่ช่างตีเหล็ก', 'greatsword', 12, 0, { buy: 1900, cls: ['vanguard', 'artisan'] });
weapon(207, 'กริชเงา', 'dagger', 10, 0, { buy: 1300, cls: ['rogue', 'ranger', 'adventurer'] });
weapon(208, 'ธนูยาวกรีนวูด', 'bow', 10, 0, { buy: 1600, cls: ['ranger', 'adventurer'] });
weapon(209, 'คทาอักษรรูน', 'staff', 10, 0, { buy: 1600, cls: ['arcanist', 'cleric', 'adventurer'] });
weapon(210, 'คฑารุ่งอรุณ', 'mace', 10, 0, { buy: 1500, cls: ['cleric', 'artisan', 'vanguard', 'adventurer'] });
weapon(211, 'หอกยาวกองรักษาการณ์', 'spear', 12, 0, { buy: 1800, cls: ['vanguard', 'artisan'] });
weapon(212, 'ปืนกลไกทดลอง', 'device', 12, 0, { buy: 2000, cls: ['artisan'] });
weapon(213, 'ไม้เท้าแสงจันทร์', 'wand', 12, 1, { buy: 2400, cls: ['arcanist', 'cleric'] });
weapon(214, 'ดาบหนามป่า', 'sword', 18, 1, { sell: 900, cls: ['vanguard', 'rogue', 'adventurer'] });
weapon(215, 'ธนูกิ่งเอลเดอร์', 'bow', 18, 2, { sell: 1400, cls: ['ranger'] });
weapon(216, 'คทาราก Thornwood', 'staff', 18, 2, { sell: 1400, cls: ['arcanist', 'cleric'] });
weapon(217, 'ดาบเหล็กชั้นดี', 'sword', 20, 0, { buy: 5200, cls: ['vanguard', 'rogue', 'artisan', 'adventurer'] });
weapon(218, 'มีดสั้นเงินจันทร์', 'dagger', 22, 1, { sell: 1700, cls: ['rogue', 'ranger'] });
weapon(219, 'ดาบใหญ่เหล็กกล้า', 'greatsword', 24, 1, { sell: 2000, cls: ['vanguard', 'artisan'] });
weapon(220, 'คันธนูผลึก', 'bow', 26, 2, { sell: 2600, cls: ['ranger'] });
weapon(221, 'คทาผลึกรูน', 'staff', 26, 2, { sell: 2600, cls: ['arcanist', 'cleric'] });
weapon(222, 'ค้อนกรามเหล็ก', 'mace', 28, 3, { sell: 5000, cls: ['cleric', 'artisan', 'vanguard'] });
weapon(223, 'ปืนเฟืองเหล็ก', 'device', 26, 2, { sell: 2600, cls: ['artisan'] });
weapon(224, 'หอกเงินจันทร์', 'spear', 28, 2, { sell: 3000, cls: ['vanguard', 'artisan'] });
// armor
armor(300, 'เสื้อนักเดินทาง', 'light', 1, 0, { buy: 90 });
armor(301, 'เสื้อคลุมฝึกหัด', 'robe', 1, 0, { buy: 110 });
armor(302, 'เสื้อเกราะหนังทุ่ง', 'light', 8, 0, { buy: 900 });
armor(303, 'เกราะโซ่ทหารยาม', 'medium', 10, 0, { buy: 1700, cls: ['vanguard', 'ranger', 'cleric', 'artisan', 'adventurer'] });
armor(304, 'เกราะแผ่นเหล็กหนัก', 'heavy', 14, 0, { buy: 3200, cls: ['vanguard'] });
armor(305, 'ชุดคลุมอักษรรูน', 'robe', 10, 0, { buy: 1500, cls: ['arcanist', 'cleric', 'adventurer'] });
armor(306, 'ชุดเงาแนบตัว', 'light', 12, 1, { buy: 2400, cls: ['rogue', 'ranger'] });
armor(307, 'เสื้อเกราะมอสกรีนวูด', 'medium', 18, 1, { sell: 1100 });
armor(308, 'ชุดคลุมแสงจันทร์', 'robe', 20, 1, { sell: 1300, cls: ['arcanist', 'cleric'] });
armor(309, 'เกราะเหล็กคนงานเหมือง', 'heavy', 24, 1, { sell: 1600, cls: ['vanguard', 'artisan'] });
armor(310, 'เกราะเปลือกแก่นไม้', 'medium', 22, 2, { sell: 2200 });
armor(311, 'เกราะกรามเหล็ก', 'heavy', 30, 3, { sell: 4800, cls: ['vanguard', 'artisan'] });
weapon(225, 'กริชพิษแม่แมงมุม', 'dagger', 18, 2, { sell: 1800, cls: ['rogue', 'ranger', 'adventurer'] });
weapon(226, 'ไม้เท้ากระดูกสุสาน', 'staff', 24, 2, { sell: 2200, cls: ['arcanist', 'cleric', 'adventurer'] });
weapon(227, 'ขวานใหญ่ราชากระทิง', 'greatsword', 30, 3, { sell: 5200, cls: ['vanguard', 'artisan'] });
weapon(228, 'ธนูใยแมงมุม', 'bow', 18, 1, { sell: 1300, cls: ['ranger', 'adventurer'] });
armor(312, 'เสื้อหนังหมีถ้ำ', 'medium', 28, 2, { sell: 2600 });
armor(313, 'ชุดคลุมสุสานจันทร์', 'robe', 24, 2, { sell: 2300, cls: ['arcanist', 'cleric'] });
// headgear (visible on the character)
head(350, 'หมวกฟางชาวนา', 'hat', 'straw', 1, 0, { buy: 150 });
head(351, 'ผ้าคาดหัวนักผจญภัย', 'headband', 'band_red', 1, 0, { buy: 120 });
head(352, 'หมวกหนังกันกระแทก', 'helmet', 'leather', 6, 0, { buy: 700 });
head(353, 'หมวกเหล็กทหารยาม', 'helmet', 'iron', 12, 0, { buy: 1800, cls: ['vanguard', 'artisan', 'cleric', 'adventurer'] });
head(354, 'หมวกพ่อมดฝึกหัด', 'hat', 'wizard', 10, 0, { buy: 1500, cls: ['arcanist', 'cleric', 'adventurer'] });
head(355, 'ฮู้ดนักล่า', 'hood', 'hood_green', 10, 0, { buy: 1400, cls: ['ranger', 'rogue', 'adventurer'] });
head(356, 'หมวกขนนก', 'cap', 'feather', 8, 1, { buy: 1600 });
head(357, 'หมวกคนงานเหมือง', 'helmet', 'miner', 20, 0, { buy: 2600, light: 1, d: 'มีตะเกียงส่องทางในเหมืองมืด' });
head(358, 'หน้ากากเงา', 'mask', 'mask_shadow', 14, 1, { sell: 700, cls: ['rogue'] });
head(359, 'มงกุฎดอกไม้ป่า', 'crown', 'flower', 5, 1, { sell: 300 });
head(360, 'หมวกเขาเอลเดอร์', 'helmet', 'antler', 18, 2, { sell: 1500 });
head(361, 'ผ้าคาดหัวแสงจันทร์', 'headband', 'band_moon', 16, 1, { sell: 800 });
head(362, 'มงกุฎเหล็กของไอรอนจอว์', 'crown', 'ironcrown', 30, 3, { sell: 5000 });
head(364, 'มงกุฎราชินีเจลลี่', 'crown', 'jelcrown', 9, 2, { sell: 900 });
head(365, 'หมวกอัศวินกระดูก', 'helmet', 'knight', 26, 2, { sell: 2400, cls: ['vanguard', 'artisan', 'cleric', 'adventurer'] });
head(363, 'หมวกปีกกว้างนักเดินทาง', 'hat', 'traveler', 15, 0, { buy: 2100 });
// accessories
acc(400, 'แหวนทองแดง', 'ring', 1, 0, { buy: 300, str: 1 });
acc(401, 'สร้อยเมล็ดทุ่ง', 'necklace', 1, 0, { buy: 300, hp: 20 });
acc(402, 'กำไลหนัง', 'bracelet', 5, 0, { buy: 600, agi: 1, dex: 1 });
acc(403, 'เครื่องรางใบโคลเวอร์', 'charm', 5, 0, { buy: 650, luk: 2 });
acc(404, 'แหวนรูนแสง', 'ring', 12, 1, { sell: 700, int: 2, sp: 15 });
acc(405, 'สร้อยเขี้ยวป่า', 'necklace', 14, 1, { sell: 750, str: 2, atk: 4 });
acc(406, 'กำไลวิสป์', 'bracelet', 16, 1, { sell: 800, dex: 2, matk: 6 });
acc(407, 'เครื่องรางหินผลึก', 'charm', 20, 2, { sell: 1400, vit: 2, mdef: 4 });
acc(408, 'แหวนแก่นไม้โบราณ', 'ring', 18, 2, { sell: 1600, vit: 3, hp: 60 });
acc(409, 'จี้แสงจันทร์ราตรี', 'necklace', 24, 2, { sell: 2000, int: 3, sp: 30 });
acc(410, 'สร้อยเขี้ยวจันทร์', 'necklace', 22, 3, { sell: 3000, str: 3, agi: 3, luk: 3 });
acc(411, 'แหวนใยแมงมุม', 'ring', 16, 1, { sell: 900, dex: 2, agi: 1 });
// costume headgear (looks only; worn over the stat headgear)
costume(450, 'แมวน้อย (คอสตูม)', 'headband', 'catears', { buy: 3000 });
costume(451, 'มงกุฎดอกไม้ (คอสตูม)', 'crown', 'flower', { buy: 2500 });
costume(452, 'หมวกปาร์ตี้ (คอสตูม)', 'hat', 'party', { buy: 2000 });
costume(453, 'หมวกพ่อมดราตรี (คอสตูม)', 'hat', 'witch', { buy: 4000 });

// ================= Region 2: Verdant Wilds (Lv20-45) — Tier 2 gear, materials and quest items
ITEMS[9] = { n: 'ยาเขียวป่าลึก', ty: 'use', heal: 420, sp: 20, buy: 820, req: 28, d: 'ยาสมุนไพรจากหมอผีเผ่าใบไม้' };
for (const [id, n, sell, d, ty] of [
  [170, 'ใบไม้ยักษ์ป่าลึก', 52], [171, 'พิษงูเถาวัลย์', 58], [172, 'น้ำผึ้งยอดไม้', 60, 'หวานหอม ใช้ทำยา'], [173, 'ขนหมีมอส', 66], [174, 'ขนนกเผ่าใบไม้', 62],
  [175, 'สปอร์เรืองแสง', 64], [176, 'หมวกเห็ดแดง', 70], [177, 'ปีกค้างคาวสปอร์', 68], [178, 'เมือกกบเห็ด', 66], [179, 'ฝุ่นใบไม้วิญญาณ', 80],
  [180, 'ขนหมาป่าวิญญาณ', 84], [181, 'แกนมอสโกเลม', 90], [182, 'หนังหมาป่าหุบเขา', 78], [183, 'เขี้ยวออร์ค', 86], [184, 'หนังหมีกริซลี่', 92],
  [185, 'เมือกหนอง', 88], [186, 'เกล็ดงูหนอง', 94], [187, 'ถ่านไฟผี', 98], [188, 'ยางไม้โบราณ', 110, 'วัสดุงานช่างระดับสูงจากต้นไม้โบราณ'], [189, 'เปลือกแมงมุมไม้', 104],
  [190, 'ไม้หัวใจป่า', 70, 'ไม้เนื้อแข็งพิเศษจากป่าลึก ใช้ตีอุปกรณ์ Tier 2'], [191, 'ตราหัวหน้าเผ่าใบไม้', 900, 'ดรอปจากอีลิทหัวหน้าเผ่าใบไม้'],
  [192, 'แก่นสปอร์โบราณ', 1000, 'ดรอปจากอีลิทเห็ดยักษ์โบราณ'], [193, 'หัวใจศิลาสวนวิญญาณ', 1600, 'ดรอปจากผู้เฝ้าสวนวิญญาณ'], [194, 'กรงเล็บกริมพอว์', 1800, 'ดรอปจากกริมพอว์'],
  [195, 'แกนรากเน่า', 2400, 'ดรอปจากรอทฮาร์ท'], [196, 'แผงคอขนเงิน', 1100, 'ดรอปจากอีลิทหมาป่าขนเงิน'], [197, 'เมือกราชากบ', 1200, 'ดรอปจากอีลิทราชากบหนอง'],
  [164, 'เครื่องรางชนเผ่า', 0, 'เครื่องรางไม้ที่เผ่าใบไม้ทำหล่นไว้', 'quest'], [165, 'ตัวอย่างสปอร์', 0, 'สปอร์ที่มีประกายสีม่วงดำ', 'quest'],
  [166, 'จดหมายถึงเวอร์แดนต์ เฮเวน', 0, 'จดหมายแนะนำตัวจากบรรณารักษ์เซลีน', 'quest'], [167, 'เมล็ดวอยด์เม็ดที่สอง', 0, 'เมล็ดสีดำที่เต้นเหมือนหัวใจ', 'quest'],
]) ITEMS[id] = { n, ty: ty || 'etc', sell, d };
// weapons: town shop (Lv30-32) / drops & crafting (Lv36-45). Modifiers give each piece a reason to exist besides ATK.
weapon(229, 'ดาบเหล็กป่าลึก', 'sword', 30, 0, { buy: 7800, cls: ['vanguard', 'rogue', 'artisan', 'adventurer'] });
weapon(230, 'ดาบใหญ่ไม้เหล็ก', 'greatsword', 32, 0, { buy: 9000, cls: ['vanguard', 'artisan'] });
weapon(231, 'มีดสั้นเขี้ยวงู', 'dagger', 30, 0, { buy: 7200, cls: ['rogue', 'ranger', 'adventurer'], crit: 2 });
weapon(232, 'ธนูยาวเผ่าใบไม้', 'bow', 30, 0, { buy: 8000, cls: ['ranger', 'adventurer'] });
weapon(233, 'คทาไม้มอส', 'staff', 30, 0, { buy: 8000, cls: ['arcanist', 'cleric', 'adventurer'] });
weapon(234, 'กระบองหินเผ่า', 'mace', 30, 0, { buy: 7800, cls: ['cleric', 'artisan', 'vanguard', 'adventurer'] });
weapon(235, 'หอกล่าสัตว์', 'spear', 32, 0, { buy: 8600, cls: ['vanguard', 'artisan'] });
weapon(236, 'ไม้กายสิทธิ์สปอร์', 'wand', 32, 1, { buy: 9800, cls: ['arcanist', 'cleric'], sp: 20 });
weapon(237, 'ปืนกลไกไม้โอ๊ก', 'device', 32, 0, { buy: 9200, cls: ['artisan'] });
weapon(238, 'ดาบพิษเถาวัลย์', 'sword', 36, 1, { sell: 2600, cls: ['vanguard', 'rogue', 'artisan', 'adventurer'], crit: 3 });
weapon(239, 'ธนูขนเงิน', 'bow', 40, 2, { sell: 3800, cls: ['ranger'], aspdPct: 5 });
weapon(240, 'คทาสวนวิญญาณ', 'staff', 38, 2, { sell: 3600, cls: ['arcanist', 'cleric'], int: 2, sp: 30 });
weapon(241, 'ดาบใหญ่กรงเล็บราชา', 'greatsword', 42, 3, { sell: 7000, cls: ['vanguard', 'artisan'], str: 3, crit: 3 });
weapon(242, 'มีดสั้นเขี้ยวหนอง', 'dagger', 40, 2, { sell: 3800, cls: ['rogue', 'ranger'], crit: 5 });
weapon(243, 'กระบองรากเน่า', 'mace', 45, 3, { sell: 8000, cls: ['cleric', 'artisan', 'vanguard'], vit: 3, hp: 150 });
weapon(244, 'ไม้กายสิทธิ์รากโบราณ', 'wand', 45, 3, { sell: 8000, cls: ['arcanist', 'cleric'], int: 4, sp: 50 });
weapon(245, 'หอกเขี้ยวออร์ค', 'spear', 38, 1, { sell: 2800, cls: ['vanguard', 'artisan'], str: 2 });
weapon(246, 'ปืนยางไม้', 'device', 40, 2, { sell: 3800, cls: ['artisan'], dex: 3, aspdPct: 4 });
// armor
armor(314, 'เสื้อเกราะหนังป่าลึก', 'light', 30, 0, { buy: 6500 });
armor(315, 'เกราะโซ่ผู้พิทักษ์ป่า', 'medium', 32, 0, { buy: 8000, cls: ['vanguard', 'ranger', 'cleric', 'artisan', 'adventurer'] });
armor(316, 'เกราะแผ่นไม้เหล็ก', 'heavy', 32, 0, { buy: 9500, cls: ['vanguard'] });
armor(317, 'ชุดคลุมใบไม้วิญญาณ', 'robe', 32, 0, { buy: 7500, cls: ['arcanist', 'cleric', 'adventurer'] });
armor(318, 'เสื้อหนังกริซลี่', 'medium', 38, 1, { sell: 2400, hp: 80 });
armor(319, 'ชุดคลุมสปอร์โบราณ', 'robe', 36, 2, { sell: 3200, cls: ['arcanist', 'cleric'], sp: 40 });
armor(320, 'เกราะเปลือกแมงมุมไม้', 'heavy', 42, 2, { sell: 4200, cls: ['vanguard', 'artisan'], vit: 2 });
armor(321, 'เกราะแก่นไม้โบราณ', 'medium', 45, 3, { sell: 7600, vit: 3, flee: 4 });
armor(322, 'ชุดเงาใบไม้', 'light', 36, 1, { sell: 2400, cls: ['rogue', 'ranger'], flee: 5 });
// headgear
head(366, 'หมวกขนนกเผ่าใบไม้', 'cap', 'feather', 30, 0, { buy: 5200 });
head(367, 'ฮู้ดนักล่าป่าลึก', 'hood', 'hood_green', 32, 1, { buy: 7000, cls: ['ranger', 'rogue', 'adventurer'], dex: 1 });
head(368, 'หมวกหมอผีเห็ด', 'hat', 'wizard', 34, 1, { sell: 1600, cls: ['arcanist', 'cleric', 'adventurer'], int: 2 });
head(369, 'มงกุฎเขาหัวหน้าเผ่า', 'crown', 'antler', 34, 2, { sell: 2400, str: 2, agi: 1 });
head(370, 'หมวกเหล็กผู้พิทักษ์ราก', 'helmet', 'knight', 42, 2, { sell: 3600, cls: ['vanguard', 'artisan', 'cleric', 'adventurer'], vit: 2 });
// accessories
acc(412, 'แหวนน้ำผึ้ง', 'ring', 30, 0, { buy: 4800, hp: 80 });
acc(413, 'สร้อยเขี้ยวออร์ค', 'necklace', 36, 1, { sell: 1600, str: 3, atk: 8 });
acc(414, 'กำไลขนเงิน', 'bracelet', 40, 2, { sell: 3000, agi: 3, dex: 3 });
acc(415, 'เครื่องรางสปอร์', 'charm', 34, 1, { sell: 1400, int: 3, sp: 30 });
acc(416, 'จี้หัวใจศิลา', 'necklace', 38, 3, { sell: 5000, vit: 4, int: 4, hp: 120 });
acc(417, 'แหวนรากโบราณ', 'ring', 45, 3, { sell: 6000, str: 4, vit: 4 });
acc(418, 'เครื่องรางเขี้ยวงู', 'charm', 32, 1, { sell: 1200, crit: 3, luk: 2 });

for (const k in ITEMS) {
  const it = ITEMS[k]; it.id = +k; if (it.rar == null) it.rar = 0; if (it.req == null) it.req = 1;
  for (const f of Object.keys(it)) if (it[f] === undefined) delete it[f];
  if (!it.sell && it.sell !== 0) it.sell = Math.floor((it.buy || 10) / 4);
  if (it.buy && it.sell > it.buy / 2) it.sell = Math.floor(it.buy / 2); // no buy-low/sell-high loops
}
const EQ_SLOTS = ['wpn', 'arm', 'head', 'acc1', 'acc2', 'chead'];
const slotFits = (it, sl) => !!it && it.ty === 'eq' && (it.slot === sl || (it.slot === 'acc' && (sl === 'acc1' || sl === 'acc2')));
module.exports = { ITEMS, RARITY, WEAPON_TYPES, ARMOR_TYPES, HEAD_TYPES, EQ_SLOTS, slotFits };
