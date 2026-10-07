'use strict';
// หุบเขาสัตว์ป่า (Lv32-42): a dry grass valley east of the Deep Forest. The Fang-tribe orcs have built a war camp in
// the east; Grimpaw, king of the valley bears, rules the rocky den in the north.
module.exports = G => {
  const { mkMap, rng, border, rect, scatter, line, blob, clear, portal } = G;
  const m = mkMap('beast_valley', 'หุบเขาสัตว์ป่า', 70, 50, 1);
  const r = rng(2205);
  border(m, 6);
  scatter(m, r, 260, 6, [1, 1, 68, 48]);
  scatter(m, r, 160, 5, [1, 1, 68, 48]);
  scatter(m, r, 120, 0, [1, 1, 68, 48], [1]);
  line(m, [[0, 25], [20, 26], [34, 22], [50, 26], [69, 26]], 4, 2);
  line(m, [[34, 22], [34, 8]], 4, 2);
  blob(m, r, 34, 7, 9, 5, 0, 0.1);                         // Grimpaw's den
  blob(m, r, 56, 36, 9, 7, 0, 0.12);                       // Fang war camp
  blob(m, r, 6, 25, 4, 4, 1, 0.1);                         // hunter's lookout
  for (const [x, y, rx, ry] of [[16, 12, 9, 7], [16, 40, 10, 6], [36, 38, 8, 6], [54, 12, 8, 6], [26, 26, 5, 4]]) blob(m, r, x, y, rx, ry, 1, 0.18);
  clear(m, 1, 23, 4, 27); clear(m, 65, 24, 68, 28);
  portal(m, 0, 25, 'deep_forest', 69, 32);
  portal(m, 69, 26, 'ash_plains', 1, 28, { lv: 40 }, 'ที่ราบเถ้า (Lv 40+)');
  m.deco = [['prop_tent_01', 52.5, 33.5], ['prop_tent_01', 58.5, 33.4], ['prop_campfire_01', 56.5, 37.4], ['prop_flag_red_01', 60.4, 38.6], ['prop_weaponrack_01', 51.4, 39.2],
    ['prop_tent_01', 5.4, 22.6], ['prop_flag_blue_01', 8.6, 23.4]];
  m.spawns = [
    { mob: 'valleywolf', n: 8, zone: [8, 6, 26, 18] }, { mob: 'grizzly', n: 5, zone: [8, 34, 26, 46] },
    { mob: 'fangorc', n: 7, zone: [48, 30, 66, 44] }, { mob: 'fangarcher', n: 4, zone: [48, 30, 66, 44] },
    { mob: 'valleywolf', n: 5, zone: [28, 32, 44, 44] }, { mob: 'grizzly', n: 3, zone: [46, 6, 62, 18] },
    { mob: 'silvermane', n: 1, zone: [44, 6, 62, 18], respawn: 540 },
  ];
  m.bosses = [{ mob: 'grimpaw', x: 34, y: 6, every: 1200 }];
  m.nodes = [[14, 30], [40, 16], [22, 44], [60, 16]].map(([x, y], i) => ({ id: 'herb' + i, k: 'herb', n: 'สมุนไพรหุบเขา', x, y, item: 104, respawn: 40 }));
  m.spawn = { x: 3, y: 25 };
  m.safe = [[0, 21, 9, 29]];
  return m;
};
