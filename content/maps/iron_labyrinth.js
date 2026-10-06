'use strict';
// เขาวงกตเหล็ก (Lv27-33): a maze dug below the Old Mine; the Labyrinth King waits at its heart.
module.exports = G => require('./_dungeon')(G, {
  id: 'iron_labyrinth', name: 'เขาวงกตเหล็ก', w: 60, h: 56, seed: 5521, tw: 2,
  rooms: [[30, 4, 5, 3], [10, 10, 5, 4], [50, 10, 5, 4], [20, 22, 6, 4], [40, 22, 6, 4], [8, 34, 5, 5], [52, 34, 5, 5], [30, 40, 9, 7], [16, 50, 5, 3], [44, 50, 5, 3]],
  tunnels: [[[30, 4], [10, 10], [8, 34], [16, 50]], [[30, 4], [50, 10], [52, 34], [44, 50]], [[10, 10], [20, 22], [40, 22], [50, 10]], [[20, 22], [8, 34]], [[40, 22], [52, 34]],
    [[16, 50], [30, 40], [44, 50]], [[20, 22], [30, 40]], [[40, 22], [30, 40]], [[8, 34], [52, 34]]],
  entry: [30, 2], exit: [30, 0, 'old_mine', 44, 53], pillars: 60,
  spawns: [{ mob: 'labyrinthguard', n: 6, zone: [4, 6, 26, 16] }, { mob: 'cavebear', n: 5, zone: [34, 6, 56, 16] }, { mob: 'giantcentipede', n: 5, zone: [12, 18, 48, 27] },
    { mob: 'boneknight', n: 6, zone: [3, 28, 57, 40] }, { mob: 'labyrinthguard', n: 4, zone: [10, 46, 50, 53] }],
  bosses: [{ mob: 'labyrinthking', x: 30, y: 42, every: 1200 }],
  deco: [['prop_weaponrack_01', 27.5, 3.4], ['prop_anvil_01', 33.4, 3.6], ['prop_barrel_01', 9.5, 8.3], ['prop_crate_01', 51.4, 8.3]],
});
