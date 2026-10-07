'use strict';
// ต้นไม้โบราณ (dungeon, Lv38-45): the hollow inside the oldest tree of Elyndra. Root tunnels lead down to the
// heart chamber where Rotheart, corrupted by the second void seed, waits.
module.exports = G => require('./_dungeon')(G, {
  id: 'ancient_tree', name: 'ต้นไม้โบราณ', w: 48, h: 64, seed: 2207,
  rooms: [[24, 5, 6, 3], [10, 16, 6, 5], [36, 16, 7, 5], [24, 28, 8, 5], [9, 40, 6, 5], [38, 40, 6, 5], [24, 54, 10, 6]],
  tunnels: [[[24, 5], [10, 16], [24, 28], [9, 40], [24, 54]], [[24, 5], [36, 16], [24, 28], [38, 40], [24, 54]], [[10, 16], [36, 16]], [[9, 40], [38, 40]]],
  entry: [24, 2], exit: [24, 0, 'spirit_grove', 6, 2], pillars: 50,
  spawns: [{ mob: 'heartgrub', n: 8, zone: [4, 11, 20, 22] }, { mob: 'rootguard', n: 6, zone: [28, 11, 44, 22] }, { mob: 'sapspirit', n: 3, zone: [16, 23, 32, 34] },
    { mob: 'barkspider', n: 5, zone: [3, 35, 16, 46] }, { mob: 'rootguard', n: 4, zone: [32, 35, 44, 46] }, { mob: 'heartgrub', n: 5, zone: [16, 23, 32, 34] }],
  bosses: [{ mob: 'rotheart', x: 24, y: 56, every: 1500 }],
  deco: [['prop_lumber_01', 21.5, 3.4], ['prop_crate_01', 27.4, 3.4]],
});
