'use strict';
// สวนวิญญาณ (Lv30-38): the sacred grove north of Verdant Haven. Five spirit stones once kept the forest at peace;
// the Grove Warden stands in the stone circle at the top of the grove.
module.exports = G => {
  const { mkMap, rng, border, rect, scatter, line, blob, clear, portal } = G;
  const m = mkMap('spirit_grove', 'สวนวิญญาณ', 60, 56, 1);
  const r = rng(2204);
  border(m, 5);
  scatter(m, r, 600, 5, [1, 1, 58, 54]);
  scatter(m, r, 80, 11, [1, 1, 58, 54], [1]);
  line(m, [[30, 55], [30, 40], [22, 30], [30, 18], [30, 10]], 4, 2);
  line(m, [[22, 30], [10, 22], [6, 8]], 4, 2);
  line(m, [[30, 40], [46, 32], [50, 18]], 4, 2);
  blob(m, r, 30, 9, 10, 6, 4, 0.08);                       // stone circle clearing (boss arena)
  for (const [x, y, rx, ry] of [[12, 44, 9, 7], [46, 46, 9, 6], [12, 20, 8, 7], [48, 20, 9, 8], [30, 30, 6, 5]]) blob(m, r, x, y, rx, ry, 1, 0.16);
  blob(m, r, 40, 38, 4, 3, 2);
  clear(m, 27, 51, 33, 54); rect(m, 4, 4, 8, 8, 1);
  portal(m, 30, 55, 'verdant_haven', 30, 2);
  portal(m, 6, 0, 'ancient_tree', 24, 3, { lv: 38 }, 'ต้นไม้โบราณ (Lv 38+)');
  rect(m, 5, 1, 7, 4, 4);
  m.deco = [['prop_statue_01', 22.5, 8.5], ['prop_statue_01', 38.5, 8.5], ['prop_lamp_01', 28.4, 50.4], ['prop_lamp_01', 32.6, 50.4]];
  m.spawns = [
    { mob: 'leafwisp', n: 8, zone: [4, 38, 22, 52] }, { mob: 'spiritwolf', n: 7, zone: [38, 40, 56, 52] },
    { mob: 'mossgolem', n: 5, zone: [38, 12, 56, 28] }, { mob: 'leafwisp', n: 5, zone: [4, 14, 20, 28] },
    { mob: 'spiritwolf', n: 4, zone: [24, 24, 36, 36] },
  ];
  m.bosses = [{ mob: 'grovewarden', x: 30, y: 8, every: 1200 }];
  m.nodes = [[12, 44], [48, 46], [12, 18], [50, 22], [30, 31]].map(([x, y], i) => ({ id: 'stone' + i, k: 'spiritstone', n: 'ศิลาวิญญาณ', x, y, quest: 1, respawn: 5 }));
  m.spawn = { x: 30, y: 52 };
  m.safe = [[25, 49, 35, 55]];
  return m;
};
