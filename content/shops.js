'use strict';
// Shop inventories (item ids). Starter towns sell cheap basics; strong gear only comes from drops/crafting.
const SHOPS = {
  legacy:        { th: 'ร้านค้าซาฮีร์', items: [1, 2, 3, 20, 21, 22, 30, 31, 40] },               // original Solkara shop list
  v_general:     { th: 'ร้านของชำลูมิร่า', items: [1, 4, 7, 2, 400, 401, 350, 351] },
  v_weapon:      { th: 'ร้านอาวุธบอริน', items: [200, 201, 202, 203, 204, 20, 21] },
  v_armor:       { th: 'ร้านชุดเกราะแทมซิน', items: [300, 301, 30, 302, 352, 402, 403] },
  c_potion:      { th: 'ร้านยาเมืองหลวง', items: [1, 2, 3, 4, 7, 5, 6] },
  c_weapon:      { th: 'คลังอาวุธหลวง', items: [205, 206, 207, 208, 209, 210, 211, 212, 213, 217, 22] },
  c_armor:       { th: 'ร้านชุดเกราะหลวง', items: [302, 303, 304, 305, 306, 353, 354, 355, 356, 363, 357] },
  c_special:     { th: 'ร้านพิเศษ (คอสตูม)', items: [450, 451, 452, 453, 403] },
  camp:          { th: 'ร้านค้าค่ายพิทักษ์ป่า', items: [1, 2, 3, 7, 4] },
  mine:          { th: 'ร้านเสบียงหน้าเหมือง', items: [1, 2, 5, 7, 357] },
  h_weapon:      { th: 'ร้านอาวุธทอร์น (เฮเวน)', items: [229, 230, 231, 232, 233, 234, 235, 236, 237] },
  h_armor:       { th: 'ร้านชุดเกราะวิลโลว์ (เฮเวน)', items: [314, 315, 316, 317, 366, 367, 412] },
  h_general:     { th: 'ร้านเสบียงพีท (เฮเวน)', items: [2, 5, 9, 3, 6, 7, 4] },
  camp2:         { th: 'ร้านค้าค่ายพิทักษ์ป่าลึก', items: [2, 5, 9, 6, 7] },
};
module.exports = { SHOPS };
