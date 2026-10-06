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
  building(m, 4, 3, 7, 5, 'tavern');     // inn "Sleepy Lark"
  building(m, 13, 3, 6, 4, 'home_A');    // elder's house
  building(m, 36, 3, 7, 5, 'church');    // chapel / healer
  building(m, 4, 28, 5, 4, 'blacksmith');
  building(m, 12, 29, 6, 5, 'market');   // general store
  building(m, 30, 29, 8, 5, 'barracks'); // Vanguard training hall
  building(m, 41, 29, 5, 4, 'home_B');   // storage
  building(m, 30, 3, 5, 4, 'home_B');    // weaponsmith
  rect(m, 2, 12, 12, 18, 0);             // archery range (packed dirt)
  scatter(m, r, 26, 11, [2, 2, 47, 37], [1]);
  for (const [x, y] of [[16, 13], [34, 13], [16, 27], [34, 27], [22, 9], [45, 10], [3, 24], [46, 25], [20, 35], [9, 36], [38, 36]]) set(m, x, y, 5);
  portal(m, 25, 0, 'solkara', 40, 1);
  portal(m, 49, 20, 'beginner_meadow', 1, 24);
  m.deco = [['p_well', 25.5, 17.2], ['p_flag_yellow', 17.3, 15.4], ['p_flag_yellow', 33.7, 15.4], ['p_barrel', 9.6, 26.8], ['p_crate_A_big', 10.4, 27.3], ['p_weaponrack', 29.4, 34.2], ['p_sack', 18.6, 33.7], ['p_tent', 7.2, 11.6], ['p_resource_lumber', 39.4, 33.6], ['p_bucket_water', 27.3, 18.6], ['p_wheelbarrow', 44.2, 18.4]];
  m.spawns = [{ mob: 'target', n: 4, zone: [3, 13, 11, 17], respawn: 4 }];
  m.spawn = { x: 25, y: 20 };
  m.safe = [[0, 0, 49, 39]];
  return m;
};
