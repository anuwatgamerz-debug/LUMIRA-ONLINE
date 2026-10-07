'use strict';
// เวอร์แดนต์ เฮเวน (Lv20-45): the tree-town of the Verdant Wilds. Wooden houses around a moss plaza, the leaf
// tribe's shaman and the alchemist by the great campfire, roads south to the Deep Forest, west to Mushroom Hollow
// and north to the Spirit Grove.
module.exports = G => {
  const { mkMap, rng, border, set, rect, building, scatter, blob, line, portal } = G;
  const m = mkMap('verdant_haven', 'เวอร์แดนต์ เฮเวน', 60, 50, 1);
  const r = rng(2201);
  border(m, 5);
  scatter(m, r, 520, 5, [1, 1, 58, 48]);
  blob(m, r, 30, 25, 25, 20, 1, 0.12);                       // the town clearing
  line(m, [[30, 49], [30, 31]], 4, 3); line(m, [[30, 19], [30, 0]], 4, 3); line(m, [[0, 25], [23, 25]], 4, 3); line(m, [[37, 25], [52, 25]], 4, 3);
  rect(m, 23, 19, 37, 31, 10);                               // moss plaza
  building(m, 9, 8, 7, 5, 'inn_village');                    // inn
  building(m, 19, 7, 6, 4, 'house_large_village');           // elder's hall
  building(m, 36, 7, 5, 4, 'storage_village');
  building(m, 44, 8, 7, 5, 'chapel_village');                // grove healer
  building(m, 9, 35, 5, 4, 'blacksmith_village');
  building(m, 17, 36, 5, 4, 'weapon_shop_village');
  building(m, 37, 35, 6, 5, 'armor_shop_village');
  building(m, 45, 35, 6, 5, 'potion_shop_village');
  for (const [x, y] of [[22, 18], [38, 18], [22, 32], [38, 32], [6, 22], [54, 22], [6, 30], [54, 30]]) set(m, x, y, 5);
  portal(m, 30, 49, 'deep_forest', 36, 1);
  portal(m, 0, 25, 'mushroom_hollow', 58, 28);
  portal(m, 30, 0, 'spirit_grove', 30, 54, { lv: 30 }, 'สวนวิญญาณ (Lv 30+)');
  m.deco = [['prop_campfire_01', 30.5, 24.6], ['prop_tent_01', 25.2, 22.4], ['prop_tent_01', 35.6, 22.4], ['prop_flag_gold_01', 23.6, 19.6], ['prop_flag_gold_01', 37.4, 19.6],
    ['prop_lumber_01', 14.5, 34.2], ['prop_anvil_01', 12.4, 40.2], ['prop_barrel_01', 43.4, 40.6], ['prop_crate_01', 44.2, 13.6], ['prop_sack_01', 16.6, 13.4], ['prop_lamp_01', 27.6, 31.6], ['prop_lamp_01', 33.4, 31.6],
    ['prop_well_01', 47.5, 22.4], ['prop_bench_01', 26.5, 30.4], ['prop_stall_01', 13.6, 24.2], ['prop_hay_01', 49.4, 29.6], ['prop_sign_potion_01', 51.4, 39.6], ['prop_sign_sword_01', 22.4, 39.6], ['prop_sign_bed_01', 16.4, 12.6]];
  m.spawns = [];
  m.nodes = [];
  m.spawn = { x: 30, y: 26 };
  m.safe = [[0, 0, 59, 49]];
  return m;
};
