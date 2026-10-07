'use strict';
// โพรงเห็ด (Lv26-34): a sunken hollow of giant mushrooms west of Verdant Haven. Glowing spore vents leak the
// violet rot that is spreading through the forest; the Elder Cap grows in the north-west grove.
module.exports = G => {
  const { mkMap, rng, border, scatter, line, blob, clear, portal } = G;
  const m = mkMap('mushroom_hollow', 'โพรงเห็ด', 60, 56, 1);
  const r = rng(2203);
  border(m, 5);
  scatter(m, r, 560, 5, [1, 1, 58, 54]);
  scatter(m, r, 60, 11, [1, 1, 58, 54], [1]);
  line(m, [[59, 28], [44, 28], [30, 26], [18, 30], [10, 40], [0, 40]], 4, 2);
  line(m, [[30, 26], [24, 14], [18, 12]], 4, 2);
  line(m, [[30, 26], [44, 40]], 4, 2);
  for (const [x, y, rx, ry] of [[18, 13, 9, 7], [46, 15, 10, 8], [19, 41, 10, 8], [45, 41, 10, 8], [32, 27, 6, 4]]) blob(m, r, x, y, rx, ry, 1, 0.15);
  blob(m, r, 32, 48, 6, 3, 2); blob(m, r, 8, 24, 3, 4, 2);
  clear(m, 54, 26, 58, 30); clear(m, 1, 38, 5, 42);
  portal(m, 59, 28, 'verdant_haven', 1, 25);
  portal(m, 0, 40, 'thornmire', 62, 28, { lv: 38 }, 'หนองหนาม (Lv 38+)');
  m.deco = [['prop_lumber_01', 33.6, 23.4], ['prop_sack_01', 50.4, 26.2], ['prop_crate_01', 51.4, 30.6]];
  m.spawns = [
    { mob: 'sporeling', n: 9, zone: [38, 8, 56, 22] }, { mob: 'capshroom', n: 7, zone: [10, 6, 28, 20] },
    { mob: 'sporebat', n: 7, zone: [10, 34, 28, 50] }, { mob: 'shroomfrog', n: 6, zone: [36, 34, 56, 50] },
    { mob: 'sporeling', n: 4, zone: [26, 22, 38, 32] }, { mob: 'eldercap', n: 1, zone: [13, 9, 23, 17], respawn: 480 },
  ];
  m.nodes = [
    ...[[14, 10], [24, 16], [44, 12], [50, 18], [18, 44]].map(([x, y], i) => ({ id: 'vent' + i, k: 'sporevent', n: 'ปล่องสปอร์', x, y, item: 165, quest: 1, respawn: 5 })),
    ...[[40, 40], [52, 44], [30, 30], [22, 36]].map(([x, y], i) => ({ id: 'herb' + i, k: 'herb', n: 'สมุนไพรเห็ด', x, y, item: 104, respawn: 40 })),
  ];
  m.spawn = { x: 56, y: 28 };
  m.safe = [[52, 24, 59, 32]];
  return m;
};
