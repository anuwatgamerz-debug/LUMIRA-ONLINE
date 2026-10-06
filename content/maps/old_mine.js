'use strict';
// เหมืองเก่า (Lv20-30): tunnels carved out of solid rock, ore veins, and Ironjaw's foundry chamber at the bottom.
module.exports = G => {
  const { mkMap, rng, set, rect, line, blob, portal } = G;
  const m = mkMap('old_mine', 'เหมืองเก่า', 56, 56, 6);
  const r = rng(6631);
  const room = (x, y, rx, ry) => blob(m, r, x, y, rx, ry, 0, 0.18);
  const tunnel = pts => line(m, pts, 0, 3);
  room(6, 6, 5, 4); room(24, 8, 7, 5); room(44, 10, 7, 6); room(12, 26, 7, 6); room(32, 26, 8, 6); room(48, 30, 5, 6);
  room(14, 44, 7, 5); room(30, 44, 6, 4); room(44, 46, 9, 7);
  tunnel([[6, 6], [24, 8], [44, 10]]); tunnel([[24, 8], [12, 26], [14, 44]]); tunnel([[24, 8], [32, 26], [48, 30], [44, 46]]);
  tunnel([[12, 26], [32, 26]]); tunnel([[14, 44], [30, 44], [44, 46]]); tunnel([[44, 10], [48, 30]]);
  rect(m, 2, 1, 4, 5, 0);
  for (let i = 0; i < 40; i++) { const x = 2 + Math.floor(r() * 52), y = 2 + Math.floor(r() * 52); if (m.t[y * m.w + x] === 0 && r() < 0.5) set(m, x, y, 6); }
  for (let x = 0; x < m.w; x++) { set(m, x, 0, 6); set(m, x, m.h - 1, 6); } for (let y = 0; y < m.h; y++) { set(m, 0, y, 6); set(m, m.w - 1, y, 6); }
  rect(m, 2, 1, 4, 3, 0);
  rect(m, 43, 50, 45, 54, 0); portal(m, 44, 55, 'iron_labyrinth', 30, 3, { lv: 27 }, 'เขาวงกตเหล็ก (Lv 27+)');
  portal(m, 3, 0, 'moonlit_creek', 61, 46);
  m.deco = [['prop_lumber_01', 7.5, 4.2], ['prop_wheelbarrow_01', 9.6, 8.4], ['prop_crate_01', 25.4, 6.3], ['prop_barrel_01', 21.4, 10.2], ['prop_sack_01', 33.5, 28.3], ['prop_crate_01', 13.4, 28.4], ['prop_barrel_01', 41.4, 43.3], ['prop_wheelbarrow_01', 47.3, 49.6]];
  m.spawns = [
    { mob: 'cavebat', n: 8, zone: [16, 2, 52, 18] }, { mob: 'minegoblin', n: 6, zone: [2, 18, 22, 34] },
    { mob: 'crystalcrawler', n: 6, zone: [24, 18, 42, 34] }, { mob: 'rustbot', n: 5, zone: [42, 22, 54, 38] },
    { mob: 'skeletonminer', n: 6, zone: [6, 38, 36, 52] }, { mob: 'golemite', n: 3, zone: [36, 2, 54, 18] },
    { mob: 'oreelemental', n: 3, zone: [24, 20, 42, 32] }, { mob: 'tarslime', n: 5, zone: [6, 20, 22, 32] },
  ];
  m.bosses = [{ mob: 'ironjaw', x: 46, y: 48, every: 1200 }];
  m.nodes = [
    ...[[26, 5], [46, 6], [8, 28], [34, 22], [50, 28], [16, 46], [32, 42], [20, 10], [38, 30]].map(([x, y], i) => ({ id: 'ore' + i, k: 'ore', n: i % 3 === 2 ? 'สายแร่เงินจันทร์' : 'สายแร่เหล็ก', x, y, item: i % 3 === 2 ? 121 : 120, respawn: 45 })),
    { id: 'journal', k: 'journal', n: 'ซากรถขนแร่', x: 31, y: 46, item: 153, quest: 1, respawn: 2 },
  ];
  m.spawn = { x: 3, y: 2 };
  m.safe = [[1, 1, 6, 5]];
  return m;
};
