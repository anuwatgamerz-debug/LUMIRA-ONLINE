'use strict';
// ทะเลสาบลาวา (Lv54-62): a lake of lava at the foot of the volcano. Ignaroth the magma giant sleeps on the island in
// the middle (a basalt causeway leads there); the Cinder Cult's ritual ground lies on the eastern shore, and the
// Fire Cavern opens in the north-east cliff.
module.exports = G => {
  const { mkMap, rng, border, rect, scatter, line, blob, clear, portal } = G;
  const m = mkMap('molten_lake', 'ทะเลสาบลาวา', 66, 54, 0);
  const r = rng(3305);
  border(m, 6);
  scatter(m, r, 200, 6, [1, 1, 64, 52]);
  scatter(m, r, 30, 5, [1, 1, 64, 52]);
  blob(m, r, 33, 24, 18, 11, 2, 0.12);                                   // the lava lake
  blob(m, r, 33, 23, 5, 3, 0, 0.05);                                     // Ignaroth's island
  rect(m, 32, 26, 34, 37, 12);                                           // basalt causeway to the island
  for (const [x, y, rx, ry] of [[12, 12, 8, 6], [16, 44, 10, 6], [50, 45, 10, 5], [56, 18, 7, 8], [48, 6, 9, 3]]) blob(m, r, x, y, rx, ry, 0, 0.15);
  line(m, [[0, 27], [8, 30], [16, 38], [33, 40], [50, 40], [58, 30], [57, 14], [64, 6]], 4, 2);
  rect(m, 31, 38, 35, 41, 0);
  clear(m, 1, 24, 5, 30, 0); clear(m, 60, 4, 64, 8, 0);
  portal(m, 0, 27, 'volcanic_road', 67, 20);
  portal(m, 65, 6, 'fire_cavern', 28, 4, { lv: 52 }, 'ถ้ำเพลิง (Lv 52+)');
  m.deco = [['prop_campfire_01', 56.5, 18.6], ['prop_flag_red_01', 52.4, 14.4], ['prop_flag_red_01', 60.6, 14.4], ['prop_statue_01', 56.5, 13.4],
    ['prop_flag_red_01', 52.4, 23.4], ['prop_flag_red_01', 60.6, 23.4], ['prop_campfire_01', 30.5, 39.6], ['prop_campfire_01', 36.5, 39.6]];
  m.spawns = [
    { mob: 'flamewraith', n: 7, zone: [5, 6, 22, 18] }, { mob: 'hellhound', n: 7, zone: [7, 38, 28, 50] },
    { mob: 'magmaelemental', n: 6, zone: [40, 40, 60, 50] }, { mob: 'cultist', n: 6, zone: [50, 11, 63, 26] },
    { mob: 'flamewraith', n: 4, zone: [40, 3, 58, 9] }, { mob: 'infernohound', n: 1, zone: [50, 12, 62, 24], respawn: 600 },
  ];
  m.bosses = [{ mob: 'ignaroth', x: 33, y: 23, every: 1500 }];
  m.nodes = [[10, 14], [20, 44], [46, 46], [56, 46], [44, 6]].map(([x, y], i) => ({ id: 'fcry' + i, k: 'firecrystal', n: 'ผลึกไฟ', x, y, item: 521, respawn: 60 }));
  m.spawn = { x: 2, y: 27 };
  m.safe = [[0, 23, 7, 31]];
  return m;
};
