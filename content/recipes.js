'use strict';
// Crafting: station 'smith' (blacksmith) or 'craft' (workshop). in: [[item, qty]], zeny fee.
const RECIPES = {
  tea:        { out: [8, 2], in: [[104, 3]], zeny: 10, station: 'craft', th: 'ชาสมุนไพรทุ่ง ×2' },
  bandage:    { out: [158, 3], in: [[101, 2], [104, 2]], zeny: 0, station: 'craft', th: 'ผ้าพันแผลสะอาด ×3' },
  hammer:     { out: [160, 1], in: [[125, 3], [106, 2]], zeny: 50, station: 'craft', th: 'ค้อนฝึกหัดชิ้นแรก' },
  red_strong: { out: [5, 2], in: [[2, 2], [114, 2]], zeny: 60, station: 'craft', th: 'ยาแดงเข้มข้น ×2' },
  blue_strong:{ out: [6, 1], in: [[3, 1], [112, 2]], zeny: 120, station: 'craft', th: 'ยาฟ้าเข้มข้น' },
  moon_band:  { out: [361, 1], in: [[162, 4], [113, 4]], zeny: 400, station: 'craft', th: 'ผ้าคาดหัวแสงจันทร์' },
  flower:     { out: [359, 1], in: [[104, 5], [100, 5]], zeny: 100, station: 'craft', th: 'มงกุฎดอกไม้ป่า' },
  thorn_sword:{ out: [214, 1], in: [[110, 6], [125, 4], [120, 2]], zeny: 600, station: 'smith', th: 'ดาบหนามป่า' },
  moss_armor: { out: [307, 1], in: [[105, 6], [106, 4], [125, 3]], zeny: 700, station: 'smith', th: 'เสื้อเกราะมอสกรีนวูด' },
  miner_arm:  { out: [309, 1], in: [[120, 8], [119, 4]], zeny: 1500, station: 'smith', th: 'เกราะเหล็กคนงานเหมือง' },
  moon_dagger:{ out: [218, 1], in: [[121, 4], [120, 4], [113, 2]], zeny: 1600, station: 'smith', th: 'มีดสั้นเงินจันทร์' },
  steel_gs:   { out: [219, 1], in: [[120, 10], [119, 3]], zeny: 1800, station: 'smith', th: 'ดาบใหญ่เหล็กกล้า' },
  crys_staff: { out: [221, 1], in: [[118, 6], [126, 4], [125, 2]], zeny: 2200, station: 'smith', th: 'คทาผลึกรูน' },
  crys_bow:   { out: [220, 1], in: [[118, 6], [126, 3], [125, 4]], zeny: 2200, station: 'smith', th: 'คันธนูผลึก' },
  gear_gun:   { out: [223, 1], in: [[119, 8], [120, 4], [126, 2]], zeny: 2200, station: 'smith', th: 'ปืนเฟืองเหล็ก' },
  bark_armor: { out: [310, 1], in: [[123, 1], [105, 8], [125, 6]], zeny: 2500, station: 'smith', th: 'เกราะเปลือกแก่นไม้' },
  antler:     { out: [360, 1], in: [[123, 1], [110, 6]], zeny: 1200, station: 'smith', th: 'หมวกเขาเอลเดอร์' },
  // Verdant Wilds (Tier 2)
  forest_tonic:{ out: [9, 2], in: [[172, 2], [104, 3]], zeny: 200, station: 'craft', th: 'ยาเขียวป่าลึก ×2' },
  spore_charm:{ out: [415, 1], in: [[175, 8], [176, 4], [192, 1]], zeny: 1800, station: 'craft', th: 'เครื่องรางสปอร์' },
  snake_charm:{ out: [418, 1], in: [[171, 8], [186, 4]], zeny: 1500, station: 'craft', th: 'เครื่องรางเขี้ยวงู' },
  vine_sword: { out: [238, 1], in: [[190, 6], [171, 6], [120, 4]], zeny: 3200, station: 'smith', th: 'ดาบพิษเถาวัลย์' },
  grizzly_arm:{ out: [318, 1], in: [[184, 8], [173, 6], [190, 3]], zeny: 3400, station: 'smith', th: 'เสื้อหนังกริซลี่' },
  bog_dagger: { out: [242, 1], in: [[186, 8], [185, 6], [121, 3]], zeny: 4200, station: 'smith', th: 'มีดสั้นเขี้ยวหนอง' },
  sap_gun:    { out: [246, 1], in: [[188, 6], [190, 6], [119, 6]], zeny: 4200, station: 'smith', th: 'ปืนยางไม้' },
  silver_bow: { out: [239, 1], in: [[196, 1], [182, 8], [190, 4]], zeny: 4500, station: 'smith', th: 'ธนูขนเงิน' },
  barkplate:  { out: [320, 1], in: [[189, 8], [188, 4], [120, 6]], zeny: 4800, station: 'smith', th: 'เกราะเปลือกแมงมุมไม้' },
  leaf_garb:  { out: [322, 1], in: [[170, 10], [174, 6], [173, 2]], zeny: 2600, station: 'craft', th: 'ชุดเงาใบไม้' },
};
for (const k in RECIPES) RECIPES[k].id = k;
module.exports = { RECIPES };
