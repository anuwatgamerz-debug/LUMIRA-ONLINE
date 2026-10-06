'use strict';
// ป่าโอเอซิส: the original Lv5-15 forest south of the capital (layout unchanged).
module.exports = G => {
  const { mkMap, rng, border, set, rect, portal } = G;
  const m = mkMap('woods', 'ป่าโอเอซิส (Lv 5-15)', 52, 52, 1);
  const r = rng(4242);
  border(m, 5);
  for (let i = 0; i < 260; i++) { const x = 1 + Math.floor(r() * 50), y = 1 + Math.floor(r() * 50); set(m, x, y, 5); }
  for (let i = 0; i < 50; i++) { const x = 1 + Math.floor(r() * 50), y = 1 + Math.floor(r() * 50); set(m, x, y, 11); }
  rect(m, 14, 26, 37, 30, 2); rect(m, 24, 26, 26, 30, 12);
  rect(m, 24, 1, 26, 51, 4); rect(m, 24, 26, 26, 30, 12);
  rect(m, 23, 0, 27, 0, 5);
  portal(m, 25, 0, 'solkara', 21, 49);
  m.spawns = [['jellop', 10, 2, 4, 50, 24], ['leafling', 18, 2, 6, 50, 25], ['mosshog', 10, 2, 32, 50, 50], ['crab', 6, 2, 31, 50, 50]];
  m.spawn = { x: 25, y: 2 };
  return m;
};
