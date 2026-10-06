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
  building(m, 4, 4, 7, 5, 'tavern'); building(m, 12, 4, 6, 4, 'home_A'); building(m, 27, 4, 7, 5, 'church'); building(m, 35, 5, 5, 4, 'blacksmith');
  building(m, 4, 23, 6, 5, 'market'); building(m, 30, 23, 8, 5, 'barracks'); building(m, 12, 25, 5, 4, 'home_B');
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
  building(m, 46, 3, 8, 5, 'barracks');   // Guild Hall
  building(m, 57, 3, 7, 5, 'church');     // Cathedral of Dawn
  building(m, 67, 4, 5, 4, 'home_B');     // Bank
  rect(m, 47, 23, 59, 31, 10);            // Arena floor
  for (let x = 47; x <= 59; x += 4) { set(m, x, 22, 6); set(m, x, 32, 6); }
  building(m, 64, 24, 6, 4, 'home_A');    // Arcanist Circle
  for (const [x, y] of [[44, 4], [56, 9], [65, 9], [73, 3], [62, 30], [72, 30], [45, 28]]) set(m, x, y, 5);
  // ---- South Ward
  rect(m, 2, 42, 73, 44, 4); rect(m, 23, 45, 40, 49, 10);
  building(m, 3, 36, 6, 4, 'home_A');     // Rogue den (back alley)
  building(m, 11, 36, 6, 5, 'market');    // market stalls
  building(m, 26, 36, 5, 4, 'blacksmith');// Craft workshop
  building(m, 34, 35, 7, 5, 'tavern');    // Inn "Silver Lantern"
  building(m, 45, 36, 5, 4, 'home_B');    // Storage
  building(m, 53, 35, 6, 5, 'market');    // Special shop
  building(m, 62, 35, 8, 5, 'barracks');  // Dungeon gate garrison
  for (const [x, y] of [[2, 48], [10, 47], [44, 48], [52, 47], [60, 48], [72, 46], [18, 36]]) set(m, x, y, 5);
  for (let i = 0; i < 26; i++) { const r = rng(900 + i); const x = 44 + Math.floor(r() * 30), y = 2 + Math.floor(r() * 48); if (get(m, x, y) === 0) set(m, x, y, 11); }
  m.deco = [['p_flag_red', 15.3, 11.4], ['p_flag_red', 27.7, 11.4], ['p_flag_yellow', 15.3, 21.7], ['p_flag_yellow', 27.7, 21.7], ['p_barrel', 11.4, 9.4], ['p_crate_A_big', 11.8, 9.8], ['p_barrel', 34.4, 10.3], ['p_sack', 10.5, 28.4], ['p_crate_B_small', 10.4, 27.8], ['p_weaponrack', 41.2, 9.7], ['p_wheelbarrow', 29.0, 28.6], ['p_tent', 13.8, 19.4], ['p_bucket_water', 18.7, 18.7], ['p_resource_lumber', 39.5, 27.5], ['p_well', 33.5, 13.6],
    ['p_flag_red', 47.3, 22.6], ['p_flag_red', 59.7, 22.6], ['p_flag_yellow', 47.3, 32.4], ['p_flag_yellow', 59.7, 32.4], ['p_weaponrack', 53.5, 22.8], ['p_tent', 17.5, 45.5], ['p_sack', 31.5, 41.2], ['p_crate_A_big', 32.4, 40.8], ['p_barrel', 43.4, 40.6], ['p_resource_lumber', 25.0, 41.0], ['p_well', 31.5, 47.5], ['p_bucket_water', 70.5, 9.6], ['p_wheelbarrow', 60.6, 41.4]];
  m.spawn = { x: 21, y: 20 };
  m.safe = [[0, 0, 75, 51]];
  return m;
};
