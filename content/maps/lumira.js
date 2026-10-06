'use strict';
// หมู่บ้านลูมิร่า: the starting village. Wide plaza around the spawn (open in every direction), inn, healer,
// shops, smithy, storage, Vanguard training yard and the archery range of the Ranger master.
module.exports = G => {
  const { mkMap, rng, border, set, get, rect, building, scatter, portal } = G;
  const m = mkMap('lumira', 'หมู่บ้านลูมิร่า', 50, 40, 1);
  const r = rng(1101);
  border(m, 5);
  rect(m, 17, 15, 33, 25, 10);                         // village green / plaza
  rect(m, 24, 1, 26, 14, 4); rect(m, 34, 19, 48, 21, 4); rect(m, 25, 26, 25, 33, 4); rect(m, 6, 20, 16, 20, 4);
  building(m, 4, 3, 7, 5, 'inn_village');     // inn "Sleepy Lark"
  building(m, 13, 3, 6, 4, 'house_large_village');    // elder's house
  building(m, 36, 3, 7, 5, 'chapel_village');    // chapel / healer
  building(m, 4, 28, 5, 4, 'blacksmith_village');
  building(m, 12, 29, 6, 5, 'potion_shop_village');   // general store
  building(m, 30, 29, 8, 5, 'class_hall_village'); // Vanguard training hall
  building(m, 41, 29, 5, 4, 'storage_village');   // storage
  building(m, 30, 3, 5, 4, 'weapon_shop_village');    // weaponsmith
  rect(m, 2, 12, 12, 18, 0);             // archery range (packed dirt)
  scatter(m, r, 26, 11, [2, 2, 47, 37], [1]);
  for (const [x, y] of [[16, 13], [34, 13], [16, 27], [34, 27], [22, 9], [45, 10], [3, 24], [46, 25], [20, 35], [9, 36], [38, 36]]) set(m, x, y, 5);
  portal(m, 25, 0, 'solkara', 40, 1);
  portal(m, 49, 20, 'beginner_meadow', 1, 24);
  m.deco = [['prop_well_01', 25.5, 17.2], ['prop_flag_gold_01', 33.7, 15.4], ['prop_barrel_01', 9.6, 26.8], ['prop_crate_01', 10.4, 27.3], ['prop_weaponrack_01', 29.4, 34.2], ['prop_sack_01', 18.6, 33.7], ['prop_tent_01', 7.2, 11.6], ['prop_lumber_01', 39.4, 33.6], ['prop_bucket_01', 27.3, 18.6], ['prop_wheelbarrow_01', 44.2, 18.4], ['prop_lamp_01', 18.2, 25.6], ['prop_lamp_01', 32.8, 25.6], ['prop_lamp_01', 23.6, 14.8], ['prop_bench_01', 20.5, 24.2], ['prop_bench_01', 30.5, 24.2], ['prop_stall_01', 9.5, 27.3], ['prop_cart_01', 47.2, 23.6], ['prop_fence_01', 2.6, 18.9], ['prop_fence_01', 3.7, 11.6], ['prop_hay_01', 44.6, 15.3], ['prop_anvil_01', 7.6, 32.6], ['prop_sign_sword_01', 27.6, 7.4], ['prop_flag_blue_01', 17.3, 15.4], ['prop_campfire_01', 26.6, 32.4]];
  m.spawns = [{ mob: 'target', n: 4, zone: [3, 13, 11, 17], respawn: 4 }];
  m.spawn = { x: 25, y: 20 };
  m.safe = [[0, 0, 49, 39]];
  return m;
};
