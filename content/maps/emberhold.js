'use strict';
// เอมเบอร์โฮลด์ (Lv40-65): the fortified mining city of the Ashen Frontier. A lava channel from the volcano runs across
// the north of the city (two bridges); the garrison and the fire temple stand beyond it, the forge quarter and the market
// in the south. Gates: south to the Ash Plains, north to the Volcanic Road, east to the Scorched Quarry.
module.exports = G => {
  const { mkMap, rng, border, set, rect, building, scatter, line, blob, portal } = G;
  const m = mkMap('emberhold', 'เอมเบอร์โฮลด์', 60, 50, 0);
  const r = rng(3301);
  border(m, 3);
  scatter(m, r, 36, 6, [2, 42, 57, 47]); scatter(m, r, 14, 6, [2, 19, 19, 31]); scatter(m, r, 10, 6, [44, 26, 57, 31]);   // basalt boulders behind the houses
  rect(m, 1, 7, 58, 8, 0); rect(m, 1, 11, 58, 12, 0);          // promenades along the lava channel
  line(m, [[1, 10], [58, 10]], 2, 2);                          // lava channel (rows 9-10)
  line(m, [[30, 49], [30, 0]], 4, 3); line(m, [[2, 24], [59, 24]], 4, 3); line(m, [[41, 7], [41, 23]], 4, 2);
  rect(m, 29, 9, 31, 10, 12); rect(m, 40, 9, 41, 10, 12);      // bridges
  rect(m, 21, 18, 39, 30, 10);                                 // ash-stone plaza
  blob(m, r, 9, 45, 5, 2, 2, 0.1);                             // the forge quarter's lava pool
  // north: garrison, town hall, fire temple
  building(m, 4, 2, 5, 4, 'house_small_capital'); building(m, 18, 2, 8, 5, 'town_hall_capital');
  building(m, 33, 2, 8, 5, 'garrison_capital'); building(m, 46, 2, 7, 5, 'sanctuary_capital');
  // middle: inn, houses, storage, archive
  building(m, 4, 12, 7, 5, 'inn_capital'); building(m, 13, 13, 6, 4, 'house_large_capital');
  building(m, 44, 13, 5, 4, 'storage_capital'); building(m, 51, 13, 5, 4, 'library_capital');
  // south: forge quarter and market
  building(m, 5, 33, 5, 4, 'blacksmith_capital'); building(m, 12, 33, 6, 5, 'weapon_shop_capital'); building(m, 21, 34, 5, 4, 'workshop_capital');
  building(m, 36, 33, 6, 5, 'armor_shop_capital'); building(m, 44, 33, 6, 5, 'market_capital'); building(m, 52, 34, 5, 4, 'house_small_capital');
  for (const [x, y] of [[20, 15], [55, 19], [3, 28], [56, 42], [18, 44], [44, 44]]) set(m, x, y, 5);   // charred trees
  portal(m, 30, 49, 'ash_plains', 60, 1);
  portal(m, 30, 0, 'volcanic_road', 35, 46, { lv: 46 }, 'ถนนภูเขาไฟ (Lv 46+)');
  portal(m, 59, 24, 'scorched_quarry', 2, 26, { lv: 48 }, 'เหมืองหินไหม้ (Lv 48+)');
  m.deco = [['prop_statue_01', 25.5, 24.4], ['prop_statue_01', 35.5, 24.4], ['prop_campfire_01', 26.5, 28.6], ['prop_campfire_01', 34.5, 28.6],
    ['prop_flag_red_01', 22.4, 18.6], ['prop_flag_red_01', 38.6, 18.6], ['prop_flag_red_01', 34.4, 7.4], ['prop_weaponrack_01', 43.4, 7.6],
    ['prop_anvil_01', 11.4, 39.4], ['prop_anvil_01', 4.6, 41.4], ['prop_barrel_01', 19.4, 38.6], ['prop_crate_01', 26.6, 38.6], ['prop_cart_01', 51.4, 40.4],
    ['prop_lamp_01', 28.4, 31.6], ['prop_lamp_01', 32.6, 31.6], ['prop_lamp_01', 28.4, 16.6], ['prop_lamp_01', 32.6, 16.6], ['prop_sack_01', 50.6, 39.4],
    ['prop_sign_sword_01', 18.4, 38.4], ['prop_sign_potion_01', 50.4, 38.2], ['prop_sign_bed_01', 11.4, 16.6], ['prop_well_01', 36.5, 21.6], ['prop_wheelbarrow_01', 14.6, 44.4]];
  m.spawns = [];
  m.nodes = [];
  m.spawn = { x: 30, y: 26 };
  m.safe = [[0, 0, 59, 49]];
  return m;
};
