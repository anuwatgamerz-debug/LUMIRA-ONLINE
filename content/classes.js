'use strict';
// Class tree. tier 0 Adventurer -> tier 1 first classes (Lv10+, class change quest) -> tier 2 (Lv50+)
// -> tier 3 advanced (Lv100+). status 'open' = playable now, 'planned' = in the tree, quest not built yet.
// Growth multipliers change derived HP/SP/ATK/MATK so a class plays differently without new save data.
// weapons: weapon types the class can use (Adventurer: basic ones). armor: armor types.
const CLASSES = {
  adventurer: { th: 'นักผจญภัย', en: 'Adventurer', tier: 0, status: 'open', hp: 1, sp: 1, atk: 1, matk: 1, weapons: ['sword', 'dagger', 'staff', 'mace', 'bow', 'wand'], armor: ['light', 'robe', 'medium'], d: 'ผู้เริ่มต้นทุกคน ยังไม่มีอาชีพเฉพาะ' },

  vanguard: { th: 'แวนการ์ด', en: 'Vanguard', tier: 1, parent: 'adventurer', reqLv: 10, status: 'open', quest: 'cls_vanguard', master: 'm_vanguard', hp: 1.35, sp: 0.85, atk: 1.12, matk: 0.8, weapons: ['sword', 'greatsword', 'spear', 'mace'], armor: ['light', 'medium', 'heavy'], role: 'Tank / Melee', d: 'นักรบแนวหน้า โล่และดาบ ปกป้องพวกพ้อง' },
  ranger:   { th: 'เรนเจอร์', en: 'Ranger', tier: 1, parent: 'adventurer', reqLv: 10, status: 'open', quest: 'cls_ranger', master: 'm_ranger', hp: 1.05, sp: 1.0, atk: 1.1, matk: 0.85, weapons: ['bow', 'dagger'], armor: ['light', 'medium'], role: 'Ranged / Mobility', range: 6, d: 'นักธนูแห่งป่า โจมตีจากระยะไกล คล่องตัว' },
  arcanist: { th: 'อาร์คานิสต์', en: 'Arcanist', tier: 1, parent: 'adventurer', reqLv: 10, status: 'open', quest: 'cls_arcanist', master: 'm_arcanist', hp: 0.85, sp: 1.45, atk: 0.8, matk: 1.3, weapons: ['staff', 'wand'], armor: ['robe', 'light'], role: 'Magic / Elemental', d: 'ผู้ใช้เวทธาตุผ่านอักษรรูนโบราณ' },
  cleric:   { th: 'เคลริก', en: 'Cleric', tier: 1, parent: 'adventurer', reqLv: 10, status: 'open', quest: 'cls_cleric', master: 'm_cleric', hp: 1.1, sp: 1.3, atk: 0.9, matk: 1.15, weapons: ['mace', 'staff', 'wand'], armor: ['robe', 'light', 'medium'], role: 'Heal / Support / Holy', d: 'ผู้รับใช้แสงรุ่งอรุณ รักษาและอวยพร' },
  rogue:    { th: 'โร้ก', en: 'Rogue', tier: 1, parent: 'adventurer', reqLv: 10, status: 'open', quest: 'cls_rogue', master: 'm_rogue', hp: 1.0, sp: 1.0, atk: 1.15, matk: 0.8, crit: 8, weapons: ['dagger', 'sword'], armor: ['light'], role: 'Speed / Critical / Stealth', d: 'เงาในตรอก รวดเร็ว คริติคอลสูง' },
  artisan:  { th: 'อาร์ติซาน', en: 'Artisan', tier: 1, parent: 'adventurer', reqLv: 10, status: 'open', quest: 'cls_artisan', master: 'm_artisan', hp: 1.15, sp: 1.1, atk: 1.05, matk: 0.95, shopDiscount: 0.1, weapons: ['mace', 'greatsword', 'device', 'spear'], armor: ['light', 'medium'], role: 'Craft / Merchant / Support', d: 'ช่างฝีมือและพ่อค้า สร้างของ ระเบิด และซ่อมแซม' },

  knight:       { th: 'ไนท์', en: 'Knight', tier: 2, parent: 'vanguard', reqLv: 50, status: 'planned', hp: 1.6, sp: 0.9, atk: 1.2, matk: 0.8, d: 'อัศวินโล่เหล็ก' },
  berserker:    { th: 'เบอร์เซิร์กเกอร์', en: 'Berserker', tier: 2, parent: 'vanguard', reqLv: 50, status: 'planned', hp: 1.45, sp: 0.8, atk: 1.4, matk: 0.7, d: 'นักรบคลั่ง ดาบใหญ่' },
  sharpshooter: { th: 'ชาร์ปชูตเตอร์', en: 'Sharpshooter', tier: 2, parent: 'ranger', reqLv: 50, status: 'planned', hp: 1.1, sp: 1.05, atk: 1.35, matk: 0.85, d: 'พลแม่นปืนธนูระยะไกล' },
  beasthunter:  { th: 'บีสต์ฮันเตอร์', en: 'Beast Hunter', tier: 2, parent: 'ranger', reqLv: 50, status: 'planned', hp: 1.2, sp: 1.0, atk: 1.25, matk: 0.85, d: 'นักล่าคู่สัตว์ป่า' },
  elementalist: { th: 'เอเลเมนทัลลิสต์', en: 'Elementalist', tier: 2, parent: 'arcanist', reqLv: 50, status: 'planned', hp: 0.9, sp: 1.6, atk: 0.8, matk: 1.5, d: 'ปรมาจารย์ธาตุทั้งสี่' },
  warlock:      { th: 'วอร์ล็อก', en: 'Warlock', tier: 2, parent: 'arcanist', reqLv: 50, status: 'planned', hp: 0.95, sp: 1.5, atk: 0.8, matk: 1.45, d: 'ผู้ต่อรองกับพลังวอยด์' },
  priest:       { th: 'พรีสต์', en: 'Priest', tier: 2, parent: 'cleric', reqLv: 50, status: 'planned', hp: 1.15, sp: 1.5, atk: 0.85, matk: 1.3, d: 'นักบวชแห่งแสง' },
  oracle:       { th: 'ออราเคิล', en: 'Oracle', tier: 2, parent: 'cleric', reqLv: 50, status: 'planned', hp: 1.05, sp: 1.55, atk: 0.8, matk: 1.35, d: 'ผู้มองเห็นชะตา' },
  assassin:     { th: 'แอสซาซิน', en: 'Assassin', tier: 2, parent: 'rogue', reqLv: 50, status: 'planned', hp: 1.05, sp: 1.0, atk: 1.4, matk: 0.8, d: 'มือสังหารเงียบ' },
  shadowdancer: { th: 'ชาโดว์แดนเซอร์', en: 'Shadow Dancer', tier: 2, parent: 'rogue', reqLv: 50, status: 'planned', hp: 1.05, sp: 1.15, atk: 1.3, matk: 0.95, d: 'นักเต้นในเงา' },
  alchemist:    { th: 'อัลเคมิสต์', en: 'Alchemist', tier: 2, parent: 'artisan', reqLv: 50, status: 'planned', hp: 1.15, sp: 1.3, atk: 1.0, matk: 1.15, d: 'นักปรุงยาและระเบิด' },
  machinist:    { th: 'แมชชินิสต์', en: 'Machinist', tier: 2, parent: 'artisan', reqLv: 50, status: 'planned', hp: 1.25, sp: 1.1, atk: 1.3, matk: 0.9, d: 'วิศวกรกลไกและอาวุธปืน' },

  // advanced (Lv100+): structure only, filled in a later batch
  aegis:      { th: 'เอจิส', en: 'Aegis', tier: 3, parent: 'knight', reqLv: 100, status: 'planned', hp: 1.9, sp: 1, atk: 1.3, matk: 0.8 },
  warbringer: { th: 'วอร์บริงเกอร์', en: 'Warbringer', tier: 3, parent: 'berserker', reqLv: 100, status: 'planned', hp: 1.7, sp: 0.9, atk: 1.6, matk: 0.7 },
  skypiercer: { th: 'สกายเพียร์เซอร์', en: 'Skypiercer', tier: 3, parent: 'sharpshooter', reqLv: 100, status: 'planned', hp: 1.25, sp: 1.1, atk: 1.55, matk: 0.9 },
  wildlord:   { th: 'ไวลด์ลอร์ด', en: 'Wild Lord', tier: 3, parent: 'beasthunter', reqLv: 100, status: 'planned', hp: 1.4, sp: 1.05, atk: 1.45, matk: 0.9 },
  prismsage:  { th: 'ปริซึมเซจ', en: 'Prism Sage', tier: 3, parent: 'elementalist', reqLv: 100, status: 'planned', hp: 1, sp: 1.8, atk: 0.8, matk: 1.75 },
  voidcaller: { th: 'วอยด์คอลเลอร์', en: 'Voidcaller', tier: 3, parent: 'warlock', reqLv: 100, status: 'planned', hp: 1.05, sp: 1.7, atk: 0.8, matk: 1.7 },
  luminary:   { th: 'ลูมินารี', en: 'Luminary', tier: 3, parent: 'priest', reqLv: 100, status: 'planned', hp: 1.3, sp: 1.7, atk: 0.9, matk: 1.5 },
  fateweaver: { th: 'เฟตวีฟเวอร์', en: 'Fateweaver', tier: 3, parent: 'oracle', reqLv: 100, status: 'planned', hp: 1.2, sp: 1.75, atk: 0.85, matk: 1.55 },
  nightblade: { th: 'ไนท์เบลด', en: 'Nightblade', tier: 3, parent: 'assassin', reqLv: 100, status: 'planned', hp: 1.2, sp: 1.05, atk: 1.65, matk: 0.8 },
  eclipse:    { th: 'อีคลิปส์', en: 'Eclipse Dancer', tier: 3, parent: 'shadowdancer', reqLv: 100, status: 'planned', hp: 1.2, sp: 1.25, atk: 1.5, matk: 1.05 },
  transmuter: { th: 'ทรานส์มิวเตอร์', en: 'Transmuter', tier: 3, parent: 'alchemist', reqLv: 100, status: 'planned', hp: 1.3, sp: 1.5, atk: 1.05, matk: 1.35 },
  artificer:  { th: 'อาร์ติฟิเซอร์', en: 'Artificer', tier: 3, parent: 'machinist', reqLv: 100, status: 'planned', hp: 1.4, sp: 1.2, atk: 1.5, matk: 1.0 },
};
for (const id in CLASSES) CLASSES[id].id = id;
// the class and every class above it (adventurer -> vanguard -> knight ...)
function lineage(id) { const out = []; let c = CLASSES[id]; while (c) { out.unshift(c.id); c = CLASSES[c.parent]; } return out; }
const childrenOf = id => Object.values(CLASSES).filter(c => c.parent === id).map(c => c.id);
module.exports = { CLASSES, lineage, childrenOf };
