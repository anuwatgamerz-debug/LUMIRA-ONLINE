'use strict';
// ที่ราบเถ้า (Lv40-48): grassland burnt to ash by the volcano's last eruption. Emberhold's scouts keep a camp at the
// western road from Beast Valley; the Ashfang orcs scout from a camp in the south-east, and three old signal beacons
// stand cold on the hills (story: light them to call the garrison).
module.exports = G => {
  const { mkMap, rng, border, rect, scatter, line, blob, clear, portal } = G;
  const m = mkMap('ash_plains', 'ที่ราบเถ้า', 72, 56, 0);
  const r = rng(3302);
  border(m, 6);
  scatter(m, r, 170, 6, [1, 1, 70, 54]);
  scatter(m, r, 110, 5, [1, 1, 70, 54]);
  line(m, [[0, 28], [20, 30], [38, 24], [52, 14], [60, 8], [60, 0]], 4, 2);
  line(m, [[38, 24], [44, 36], [54, 42]], 4, 2);
  blob(m, r, 9, 28, 6, 5, 0, 0.1);                         // Emberhold scouts' camp
  rect(m, 5, 24, 14, 32, 0);
  blob(m, r, 56, 43, 10, 7, 0, 0.12);                      // Ashfang scouting camp
  for (const [x, y, rx, ry] of [[18, 12, 10, 7], [16, 44, 10, 7], [40, 40, 7, 6], [50, 10, 9, 6], [30, 30, 5, 4]]) blob(m, r, x, y, rx, ry, 0, 0.18);
  for (const [x, y] of [[24, 14], [46, 30], [30, 46]]) rect(m, x - 2, y - 2, x + 2, y + 2, 0);   // beacon hilltops
  clear(m, 1, 25, 4, 31, 0); clear(m, 58, 1, 62, 4, 0);
  portal(m, 0, 28, 'beast_valley', 67, 26);
  portal(m, 60, 0, 'emberhold', 30, 47);
  m.deco = [['prop_tent_01', 6.5, 25.5], ['prop_campfire_01', 9.5, 29.4], ['prop_flag_red_01', 12.4, 25.6], ['prop_crate_01', 13.6, 31.4],
    ['prop_tent_01', 52.5, 40.5], ['prop_tent_01', 59.5, 40.4], ['prop_campfire_01', 56.5, 44.4], ['prop_weaponrack_01', 61.4, 45.2], ['prop_flag_red_01', 50.4, 46.6]];
  m.spawns = [
    { mob: 'ashwolf', n: 8, zone: [8, 6, 30, 20] }, { mob: 'cinderbeetle', n: 8, zone: [32, 28, 48, 46] },
    { mob: 'ashorc', n: 7, zone: [47, 37, 66, 50] }, { mob: 'ashscout', n: 4, zone: [47, 37, 66, 50] },
    { mob: 'ashwolf', n: 5, zone: [6, 38, 26, 50] }, { mob: 'cinderbeetle', n: 4, zone: [40, 4, 60, 18] },
    { mob: 'ashmaw', n: 1, zone: [10, 6, 28, 18], respawn: 540 },
  ];
  m.nodes = [
    ...[[24, 14], [46, 30], [30, 46]].map(([x, y], i) => ({ id: 'beacon' + i, k: 'beacon', n: 'หอสัญญาณไฟ', x, y, quest: 1, respawn: 30 })),
    ...[[14, 40], [36, 12], [62, 26], [22, 24]].map(([x, y], i) => ({ id: 'ore' + i, k: 'ore', n: 'แร่เหล็กเพลิง', x, y, item: 520, respawn: 60 })),
  ];
  m.spawn = { x: 3, y: 28 };
  m.safe = [[0, 23, 15, 33]];
  return m;
};
