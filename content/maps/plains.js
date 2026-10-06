'use strict';
// ทุ่งทรายสีทอง: the original Lv1-10 field east of the capital (layout unchanged).
module.exports = G => {
  const { mkMap, rng, border, set, rect, portal } = G;
  const m = mkMap('plains', 'ทุ่งทรายสีทอง (Lv 1-10)', 64, 46, 0);
  const r = rng(2026);
  border(m, 6);
  for (let i = 0; i < 90; i++) { const x = 1 + Math.floor(r() * 62), y = 1 + Math.floor(r() * 44); set(m, x, y, r() < .55 ? 7 : 6); }
  for (let i = 0; i < 40; i++) { const x = 1 + Math.floor(r() * 62), y = 1 + Math.floor(r() * 44); set(m, x, y, 11); }
  rect(m, 40, 30, 47, 35, 2); rect(m, 41, 29, 46, 36, 2); rect(m, 39, 32, 48, 33, 2);
  rect(m, 1, 21, 20, 23, 4); rect(m, 0, 22, 1, 22, 4);
  portal(m, 0, 22, 'solkara', 41, 16);
  m.spawns = [['jellop', 22, 4, 2, 34, 44], ['crab', 16, 10, 2, 44, 44], ['cactimp', 9, 36, 2, 62, 44], ['dunewolf', 5, 44, 2, 62, 28]];
  m.bossSpawn = { type: 'kingjel', x: 52, y: 10, every: 600 };
  m.spawn = { x: 3, y: 22 };
  return m;
};
