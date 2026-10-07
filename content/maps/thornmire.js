'use strict';
// หนองหนาม (Lv38-45): a rotting swamp west of Mushroom Hollow, where the roots of the void seed broke the surface.
// Water channels split the bog into islands joined by old plank bridges.
module.exports = G => {
  const { mkMap, rng, border, rect, scatter, line, blob, clear, portal } = G;
  const m = mkMap('thornmire', 'หนองหนาม', 64, 56, 1);
  const r = rng(2206);
  border(m, 5);
  for (const [x, y, rx, ry] of [[16, 14, 8, 5], [44, 12, 9, 5], [22, 34, 7, 6], [46, 40, 8, 6], [32, 24, 5, 3], [10, 46, 6, 4]]) blob(m, r, x, y, rx, ry, 2, 0.3);
  scatter(m, r, 420, 5, [1, 1, 62, 54]);
  line(m, [[63, 28], [48, 28], [32, 30], [18, 24], [8, 12]], 4, 2);
  line(m, [[32, 30], [32, 44], [20, 50]], 4, 2);
  line(m, [[48, 28], [56, 46]], 4, 2);
  for (const [x, y, rx, ry] of [[8, 10, 5, 4], [30, 46, 9, 5], [56, 46, 6, 6], [52, 20, 6, 4], [16, 26, 5, 4]]) blob(m, r, x, y, rx, ry, 1, 0.18);
  // bridges where the road crosses water
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.t[y * m.w + x] === 4) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = (y + dy) * m.w + x + dx; if (m.t[i] === 2 && r() < 0.15) m.t[i] = 12; }
  clear(m, 58, 26, 62, 30);
  portal(m, 63, 28, 'mushroom_hollow', 1, 40);
  m.deco = [['prop_lumber_01', 55.4, 25.6], ['prop_barrel_01', 59.4, 31.2]];
  m.spawns = [
    { mob: 'mirefrog', n: 8, zone: [36, 16, 60, 34] }, { mob: 'bogviper', n: 6, zone: [6, 4, 26, 30] },
    { mob: 'bogzombie', n: 7, zone: [20, 40, 44, 54] }, { mob: 'marshwisp', n: 5, zone: [44, 36, 62, 54] },
    { mob: 'mireking', n: 1, zone: [48, 40, 62, 52], respawn: 600 },
  ];
  m.nodes = [[10, 8], [28, 46], [54, 20], [58, 50]].map(([x, y], i) => ({ id: 'herb' + i, k: 'herb', n: 'สมุนไพรหนอง', x, y, item: 104, respawn: 40 }));
  m.spawn = { x: 60, y: 28 };
  m.safe = [[56, 24, 63, 32]];
  return m;
};
