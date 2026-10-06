'use strict';
// นครเอลินดรา (โซลคารา): the capital. The original 44x34 town is the Old Town (same coordinates, same buildings);
// its old outer wall is now the inner wall, with gates where the old portals were. New districts:
// East Ward (Guild Hall, Cathedral of Dawn, Bank, Arena, Arcanist Circle) and South Ward (market, inn,
// storage, craft workshop, special shop, dungeon gate).
module.exports = G => {
  const { mkMap, rng, border, set, get, rect, building, portal } = G;
  const m = mkMap('solkara', 'นครเอลินดรา (โซลคารา)', 76, 52, 0);
  border(m, 3);
  // ---- Old Town (unchanged layout)
  for (let y = 0; y <= 33; y++) set(m, 43, y, 3);
  for (let x = 0; x <= 43; x++) set(m, x, 33, 3);
  rect(m, 2, 15, 41, 17, 4); rect(m, 20, 2, 22, 31, 4);
  rect(m, 15, 11, 27, 21, 10);
  rect(m, 19, 14, 23, 18, 2); set(m, 21, 16, 2);
  building(m, 4, 4, 7, 5, 'inn_capital'); building(m, 12, 4, 6, 4, 'house_large_capital'); building(m, 27, 4, 7, 5, 'sanctuary_capital'); building(m, 35, 5, 5, 4, 'blacksmith_capital');
  building(m, 4, 23, 6, 5, 'armor_shop_capital'); building(m, 30, 23, 8, 5, 'town_hall_capital'); building(m, 12, 25, 5, 4, 'library_capital');
  for (const [x, y] of [[14, 10], [28, 10], [14, 22], [28, 22], [9, 13], [33, 19]]) set(m, x, y, 5);
  for (let i = 0; i < 20; i++) { const r = rng(77 + i); const x = 2 + Math.floor(r() * 40), y = 2 + Math.floor(r() * 30); if (get(m, x, y) === 0) set(m, x, y, 11); }
  // gates through the old wall + roads out to the new districts and the map edges
  rect(m, 42, 15, 44, 17, 4); rect(m, 20, 32, 22, 34, 4);
  rect(m, 44, 15, 74, 17, 4); rect(m, 20, 34, 22, 50, 4); rect(m, 1, 16, 1, 16, 4); rect(m, 40, 1, 40, 14, 4);
  portal(m, 75, 16, 'plains', 2, 22);
  portal(m, 21, 51, 'woods', 25, 2);
  portal(m, 40, 0, 'lumira', 25, 1);
  portal(m, 0, 16, 'bandit_road', 70, 20, { locked: 1 }, 'ถนนโจร (ยังไม่เปิด)');
  // ---- East Ward
  rect(m, 45, 10, 73, 13, 10); rect(m, 45, 19, 73, 21, 10);
  building(m, 46, 3, 8, 5, 'guild_hall_capital');   // Guild Hall
  building(m, 57, 3, 7, 5, 'sanctuary_capital');     // Cathedral of Dawn
  building(m, 67, 4, 5, 4, 'bank_capital');     // Bank
  rect(m, 47, 23, 59, 31, 10);            // Arena floor
  for (let x = 47; x <= 59; x += 4) { set(m, x, 22, 6); set(m, x, 32, 6); }
  building(m, 64, 24, 6, 4, 'class_hall_capital');    // Arcanist Circle
  for (const [x, y] of [[44, 4], [56, 9], [65, 9], [73, 3], [62, 30], [72, 30], [45, 28]]) set(m, x, y, 5);
  // ---- South Ward
  rect(m, 2, 42, 73, 44, 4); rect(m, 23, 45, 40, 49, 10);
  building(m, 3, 36, 6, 4, 'house_large_capital');     // Rogue den (back alley)
  building(m, 11, 36, 6, 5, 'market_capital');    // market stalls
  building(m, 26, 36, 5, 4, 'workshop_capital');// Craft workshop
  building(m, 34, 35, 7, 5, 'inn_capital');    // Inn "Silver Lantern"
  building(m, 45, 36, 5, 4, 'storage_capital');    // Storage
  building(m, 53, 35, 6, 5, 'special_shop_capital');    // Special shop
  building(m, 62, 35, 8, 5, 'garrison_capital');  // Dungeon gate garrison
  for (const [x, y] of [[2, 48], [10, 47], [44, 48], [52, 47], [60, 48], [72, 46], [18, 36]]) set(m, x, y, 5);
  for (let i = 0; i < 26; i++) { const r = rng(900 + i); const x = 44 + Math.floor(r() * 30), y = 2 + Math.floor(r() * 48); if (get(m, x, y) === 0) set(m, x, y, 11); }
  m.deco = [['prop_flag_red_01', 15.3, 11.4], ['prop_flag_red_01', 27.7, 11.4], ['prop_flag_gold_01', 15.3, 21.7], ['prop_flag_gold_01', 27.7, 21.7], ['prop_barrel_01', 11.4, 9.4], ['prop_crate_01', 11.8, 9.8], ['prop_barrel_01', 34.4, 10.3], ['prop_sack_01', 10.5, 28.4], ['prop_crate_01', 10.4, 27.8], ['prop_weaponrack_01', 41.2, 9.7], ['prop_wheelbarrow_01', 29.0, 28.6], ['prop_tent_01', 13.8, 19.4], ['prop_bucket_01', 18.7, 18.7], ['prop_lumber_01', 39.5, 27.5], ['prop_well_01', 33.5, 13.6],
    ['prop_flag_red_01', 47.3, 22.6], ['prop_flag_red_01', 59.7, 22.6], ['prop_flag_gold_01', 47.3, 32.4], ['prop_flag_gold_01', 59.7, 32.4], ['prop_weaponrack_01', 53.5, 22.8], ['prop_tent_01', 17.5, 45.5], ['prop_sack_01', 31.5, 41.2], ['prop_crate_01', 32.4, 40.8], ['prop_barrel_01', 43.4, 40.6], ['prop_lumber_01', 25.0, 41.0], ['prop_well_01', 31.5, 47.5], ['prop_bucket_01', 70.5, 9.6], ['prop_wheelbarrow_01', 60.6, 41.4], ['prop_lamp_01', 17.6, 14.4], ['prop_lamp_01', 25.4, 14.4], ['prop_lamp_01', 46.2, 14.6], ['prop_lamp_01', 58.2, 14.6], ['prop_lamp_01', 70.2, 14.6], ['prop_lamp_01', 19.4, 41.4], ['prop_lamp_01', 41.4, 41.4], ['prop_lamp_01', 52.2, 45.6], ['prop_stall_01', 23.5, 44.6], ['prop_stall_01', 33.5, 44.6], ['prop_bench_01', 49.5, 18.3], ['prop_bench_01', 64.5, 18.3], ['prop_fountain_01', 63, 13.4], ['prop_statue_01', 51.5, 13.6], ['prop_cart_01', 8.2, 45.5], ['prop_fence_01', 44.5, 33.6], ['prop_flag_blue_01', 50.3, 7.6], ['prop_flag_blue_01', 61.5, 7.6]];
  m.spawn = { x: 21, y: 20 };
  m.safe = [[0, 0, 75, 51]];
  return m;
};
