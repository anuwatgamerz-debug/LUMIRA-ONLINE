'use strict';
// ลำธารแสงจันทร์ (Lv14-24): an always-night creek. Moon shrines (main quest), rune crystals (Arcanist trial),
// moonflowers. The Old Mine entrance is in the south-east (Lv18+).
module.exports = G => {
  const { mkMap, rng, border, set, rect, scatter, line, blob, clear, portal } = G;
  const m = mkMap('moonlit_creek', 'ลำธารแสงจันทร์', 64, 52, 1);
  const r = rng(5520);
  border(m, 5);
  scatter(m, r, 300, 5, [1, 1, 62, 50]);
  scatter(m, r, 80, 11, [1, 1, 62, 50], [1]);
  scatter(m, r, 24, 6, [1, 1, 62, 50], [1]);
  line(m, [[30, 1], [26, 10], [32, 20], [28, 30], [34, 40], [30, 50]], 2, 3);   // the creek
  blob(m, r, 18, 38, 6, 4, 2); blob(m, r, 46, 12, 5, 3, 2);
  line(m, [[1, 26], [16, 26], [28, 24], [40, 26], [52, 34], [62, 46]], 4, 2);
  rect(m, 26, 23, 33, 25, 12);                                                  // bridge
  for (const [x, y, rx, ry] of [[12, 12, 7, 5], [48, 22, 7, 5], [12, 44, 5, 3], [50, 42, 6, 4], [40, 6, 5, 3], [20, 30, 5, 4]]) blob(m, r, x, y, rx, ry, 1, 0.2);
  clear(m, 1, 23, 5, 29); clear(m, 58, 43, 62, 48);
  portal(m, 0, 26, 'greenwood', 68, 30);
  portal(m, 63, 46, 'old_mine', 3, 2, { lv: 18 }, 'เหมืองเก่า (Lv 18+)');
  m.spawns = [
    { mob: 'creekcrab', n: 8, zone: [20, 4, 40, 48] }, { mob: 'moonslime', n: 8, zone: [4, 6, 24, 20] },
    { mob: 'nightmoth', n: 6, zone: [40, 14, 60, 30] }, { mob: 'pondlurker', n: 5, zone: [10, 32, 26, 46] },
    { mob: 'lanternspirit', n: 4, zone: [42, 34, 60, 48] }, { mob: 'willowwraith', n: 5, zone: [36, 2, 60, 12] },
    { mob: 'froglord', n: 4, zone: [6, 34, 24, 48] },
  ];
  m.nodes = [
    ...[[12, 10, 'ศาลจันทร์เสี้ยว'], [48, 20, 'ศาลจันทร์ครึ่ง'], [50, 42, 'ศาลจันทร์เต็มดวง']].map(([x, y, n], i) => ({ id: 'shrine' + i, k: 'shrine', n, x, y, quest: 1, respawn: 2 })),
    ...[[8, 16], [16, 8], [44, 24], [54, 26], [46, 44], [14, 46]].map(([x, y], i) => ({ id: 'rune' + i, k: 'crystal', n: 'ผลึกรูน', x, y, item: 157, quest: 1, respawn: 15 })),
    ...[[20, 28], [38, 8], [56, 38], [10, 40], [42, 30]].map(([x, y], i) => ({ id: 'moonf' + i, k: 'flower', n: 'ดอกจันทร์ราตรี', x, y, item: 162, respawn: 30 })),
  ];
  m.spawn = { x: 3, y: 26 };
  m.safe = [[0, 21, 6, 31]];
  return m;
};
