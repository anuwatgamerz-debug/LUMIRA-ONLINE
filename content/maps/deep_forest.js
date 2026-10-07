'use strict';
// ป่าลึก (Lv22-30): an old jungle-like forest north of Greenwood. The leaf tribe hunts here; their camp sits in the
// north-west, the forest rangers keep a watch camp by the southern road.
module.exports = G => {
  const { mkMap, rng, border, rect, scatter, line, blob, clear, portal } = G;
  const m = mkMap('deep_forest', 'ป่าลึก', 72, 64, 1);
  const r = rng(2202);
  border(m, 5);
  scatter(m, r, 900, 5, [1, 1, 70, 62]);
  scatter(m, r, 40, 6, [1, 1, 70, 62], [1]);
  line(m, [[36, 63], [36, 52], [30, 40], [36, 30], [36, 0]], 4, 2);
  line(m, [[36, 30], [52, 30], [71, 32]], 4, 2);
  line(m, [[30, 40], [18, 30], [16, 18]], 4, 2);
  blob(m, r, 36, 54, 7, 4, 1, 0.1);                       // rangers' watch camp
  blob(m, r, 17, 17, 10, 8, 1, 0.12);                     // leaf tribe camp
  for (const [x, y, rx, ry] of [[16, 50, 10, 7], [54, 16, 12, 8], [56, 46, 11, 8], [50, 30, 5, 3], [24, 36, 5, 4], [36, 12, 4, 4]]) blob(m, r, x, y, rx, ry, 1, 0.18);
  blob(m, r, 60, 58, 5, 3, 2);                            // forest pool
  clear(m, 33, 60, 39, 62); clear(m, 34, 1, 38, 3); clear(m, 66, 30, 70, 34);
  portal(m, 36, 63, 'greenwood', 35, 2);
  portal(m, 36, 0, 'verdant_haven', 30, 47);
  portal(m, 71, 32, 'beast_valley', 2, 25, { lv: 32 }, 'หุบเขาสัตว์ป่า (Lv 32+)');
  m.deco = [['prop_tent_01', 33.5, 52.4], ['prop_campfire_01', 37.5, 55.2], ['prop_flag_blue_01', 40.4, 53.4], ['prop_crate_01', 34.2, 56.6],
    ['prop_tent_01', 13.4, 14.4], ['prop_tent_01', 20.6, 13.6], ['prop_campfire_01', 17.5, 18.4], ['prop_flag_gold_01', 22.6, 20.4], ['prop_lumber_01', 52.4, 31.6]];
  m.spawns = [
    { mob: 'vinesnake', n: 8, zone: [6, 44, 28, 58] }, { mob: 'canopybee', n: 8, zone: [42, 8, 66, 24] },
    { mob: 'leafgoblin', n: 8, zone: [8, 10, 28, 26] }, { mob: 'leafshaman', n: 3, zone: [10, 12, 26, 24] },
    { mob: 'mossbear', n: 5, zone: [46, 38, 66, 54] }, { mob: 'vinesnake', n: 4, zone: [20, 32, 30, 42] },
    { mob: 'leafchief', n: 1, zone: [14, 14, 22, 21], respawn: 420 },
  ];
  m.nodes = [
    ...[[12, 12], [21, 22], [9, 20], [24, 15]].map(([x, y], i) => ({ id: 'totem' + i, k: 'totem', n: 'เครื่องรางชนเผ่า', x, y, item: 164, quest: 1, respawn: 5 })),
    ...[[50, 14], [58, 20], [52, 44], [14, 48], [26, 36], [62, 50]].map(([x, y], i) => ({ id: 'heartwood' + i, k: 'lumber', n: 'ไม้หัวใจป่า', x, y, item: 190, respawn: 60 })),
  ];
  m.spawn = { x: 36, y: 60 };
  m.safe = [[30, 50, 42, 62]];
  return m;
};
