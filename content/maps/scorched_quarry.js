'use strict';
// เหมืองหินไหม้ (Lv48-56): Emberhold's old stone quarry east of the city. Ash goblins took the lower pit, basalt golems
// woke in the rock terraces, and the ancient brass forge-guardian still walks the old forge in the north-east.
// The goblins' camp hides pages of the Cinder Cult's notes (story).
module.exports = G => {
  const { mkMap, rng, border, rect, scatter, line, blob, clear, portal } = G;
  const m = mkMap('scorched_quarry', 'เหมืองหินไหม้', 64, 52, 6);
  const r = rng(3304);
  border(m, 6);
  blob(m, r, 32, 27, 27, 21, 0, 0.12);                                   // the quarry floor
  for (const [x, y, rx, ry] of [[14, 14, 9, 6], [50, 10, 8, 5], [18, 39, 11, 7], [46, 40, 10, 6], [44, 27, 8, 5], [6, 26, 5, 4]]) blob(m, r, x, y, rx, ry, 0, 0.15);
  scatter(m, r, 120, 6, [3, 3, 60, 48], [0]);                            // loose boulders
  for (const pts of [[[24, 18], [34, 16], [40, 20]], [[26, 32], [36, 34]], [[10, 30], [14, 33]]]) line(m, pts, 6, 2); // terrace ledges
  line(m, [[0, 26], [14, 26], [24, 26], [32, 24], [44, 26]], 4, 2); line(m, [[32, 24], [30, 12], [44, 10], [52, 9]], 4, 2); line(m, [[24, 26], [20, 38]], 4, 2);
  blob(m, r, 53, 9, 6, 4, 0, 0.08);                                      // the old forge
  clear(m, 1, 23, 5, 29, 0);
  portal(m, 0, 26, 'emberhold', 58, 24);
  m.deco = [['prop_anvil_01', 51.4, 8.4], ['prop_anvil_01', 55.6, 10.4], ['prop_campfire_01', 53.5, 7.6], ['prop_barrel_01', 49.4, 11.6], ['prop_lumber_01', 57.4, 12.4],
    ['prop_tent_01', 14.5, 36.4], ['prop_tent_01', 22.5, 41.4], ['prop_campfire_01', 18.5, 39.6], ['prop_crate_01', 12.4, 41.4], ['prop_wheelbarrow_01', 26.4, 36.6],
    ['prop_cart_01', 8.6, 22.6], ['prop_crate_01', 4.4, 29.6], ['prop_flag_red_01', 5.4, 23.4]];
  m.spawns = [
    { mob: 'ashgoblin', n: 8, zone: [9, 33, 28, 46] }, { mob: 'ashgoblin', n: 4, zone: [37, 35, 56, 46] },
    { mob: 'emberbat', n: 7, zone: [22, 8, 44, 20] }, { mob: 'cindercrawler', n: 6, zone: [36, 22, 54, 34] },
    { mob: 'basaltgolem', n: 5, zone: [6, 8, 22, 20] }, { mob: 'emberbat', n: 3, zone: [38, 36, 56, 46] },
    { mob: 'forgeguardian', n: 1, zone: [46, 5, 59, 13], respawn: 600 },
  ];
  m.nodes = [
    ...[[12, 38], [20, 44], [24, 35], [16, 42]].map(([x, y], i) => ({ id: 'note' + i, k: 'cultnote', n: 'บันทึกลัทธิเถ้า', x, y, item: 552, quest: 1, respawn: 5 })),
    ...[[10, 12], [18, 16], [42, 30], [48, 24], [50, 44], [30, 40]].map(([x, y], i) => ({ id: 'ore' + i, k: 'ore', n: 'แร่เหล็กเพลิง', x, y, item: 520, respawn: 50 })),
  ];
  m.spawn = { x: 2, y: 26 };
  m.safe = [[0, 22, 6, 30]];
  return m;
};
