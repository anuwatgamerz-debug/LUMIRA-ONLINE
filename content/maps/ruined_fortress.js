'use strict';
// ป้อมปรักหักพัง (dungeon, Lv58-65): the border fortress that burned in the old war, now the Cinder Cult's stronghold.
// Courtyards joined by broken corridors; the Ash Herald performs the void-seed ritual in the keep at the far end.
module.exports = G => {
  const m = require('./_dungeon')(G, {
    id: 'ruined_fortress', name: 'ป้อมปรักหักพัง', w: 60, h: 60, seed: 3307, tw: 3,
    rooms: [[30, 5, 7, 3], [13, 16, 8, 5], [47, 16, 8, 5], [30, 28, 10, 5], [12, 41, 8, 5], [48, 41, 8, 5], [30, 52, 12, 5]],
    tunnels: [[[30, 5], [13, 16], [30, 28], [12, 41], [30, 52]], [[30, 5], [47, 16], [30, 28], [48, 41], [30, 52]], [[13, 16], [47, 16]], [[12, 41], [48, 41]]],
    entry: [30, 2], exit: [30, 0, 'volcanic_road', 10, 1], pillars: 24,
    spawns: [{ mob: 'ashskeleton', n: 7, zone: [5, 11, 22, 22] }, { mob: 'cultist', n: 5, zone: [39, 11, 56, 22] }, { mob: 'cultknight', n: 3, zone: [20, 23, 40, 33] },
      { mob: 'ashskeleton', n: 5, zone: [4, 36, 21, 47] }, { mob: 'hellhound', n: 5, zone: [39, 36, 56, 47] }, { mob: 'cultist', n: 3, zone: [20, 23, 40, 33] }],
    bosses: [{ mob: 'ashherald', x: 30, y: 54, every: 1800 }],
    deco: [['prop_flag_red_01', 26.4, 3.4], ['prop_flag_red_01', 34.6, 3.4], ['prop_weaponrack_01', 8.4, 13.4], ['prop_barrel_01', 52.4, 13.4], ['prop_statue_01', 24.5, 50.4],
      ['prop_statue_01', 36.5, 50.4], ['prop_flag_red_01', 22.4, 54.4], ['prop_flag_red_01', 38.6, 54.4], ['prop_campfire_01', 30.5, 27.4], ['prop_crate_01', 44.4, 44.4]],
  });
  // flagstone courtyards inside the rooms (the corridors between them stay broken rubble)
  for (const [x, y, rx, ry] of [[30, 5, 7, 3], [13, 16, 8, 5], [47, 16, 8, 5], [30, 28, 10, 5], [12, 41, 8, 5], [48, 41, 8, 5], [30, 52, 12, 5]])
    for (let yy = y - ry + 1; yy <= y + ry - 1; yy++) for (let xx = x - rx + 1; xx <= x + rx - 1; xx++) if (G.get(m, xx, yy) === 0) G.set(m, xx, yy, 10);
  return m;
};
