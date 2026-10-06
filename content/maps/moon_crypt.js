'use strict';
// สุสานจันทร์ (Lv19-26): an old crypt behind Moonlit Creek; Moonfang the werewolf rules the burial hall.
module.exports = G => require('./_dungeon')(G, {
  id: 'moon_crypt', name: 'สุสานจันทร์', w: 56, h: 52, seed: 9127,
  rooms: [[20, 4, 5, 3], [8, 13, 6, 5], [32, 12, 8, 5], [48, 18, 5, 6], [20, 26, 8, 6], [42, 32, 6, 5], [10, 40, 7, 5], [36, 44, 10, 6]],
  tunnels: [[[20, 4], [8, 13], [20, 26]], [[20, 4], [32, 12], [48, 18], [42, 32]], [[20, 26], [42, 32], [36, 44]], [[20, 26], [10, 40], [36, 44]], [[32, 12], [20, 26]]],
  entry: [20, 2], exit: [20, 0, 'moonlit_creek', 20, 2], pillars: 45,
  spawns: [{ mob: 'cryptskeleton', n: 8, zone: [3, 8, 26, 20] }, { mob: 'ghoul', n: 7, zone: [26, 8, 53, 24] }, { mob: 'cryptwraith', n: 5, zone: [12, 21, 30, 33] },
    { mob: 'gravepumpkin', n: 6, zone: [34, 27, 50, 38] }, { mob: 'ghoul', n: 4, zone: [4, 35, 18, 46] }],
  bosses: [{ mob: 'moonfang', x: 38, y: 45, every: 1000 }],
  deco: [['prop_statue_01', 17.5, 3.6], ['prop_statue_01', 23.5, 3.6], ['prop_campfire_01', 20.5, 27.4], ['prop_flag_blue_01', 36.5, 41.2]],
});
