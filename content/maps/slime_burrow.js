'use strict';
// โพรงสไลม์ (Lv4-10): damp burrow under the beginner meadow; the Jelly Queen sits in the pool chamber.
module.exports = G => require('./_dungeon')(G, {
  id: 'slime_burrow', name: 'โพรงสไลม์', w: 48, h: 40, seed: 4411,
  rooms: [[24, 4, 5, 3], [10, 12, 6, 5], [36, 12, 6, 5], [22, 21, 7, 5], [8, 30, 6, 5], [38, 31, 8, 6]],
  tunnels: [[[24, 4], [10, 12], [22, 21]], [[24, 4], [36, 12], [22, 21]], [[22, 21], [8, 30]], [[22, 21], [38, 31]], [[8, 30], [38, 31]]],
  entry: [24, 2], exit: [24, 0, 'beginner_meadow', 40, 45],
  spawns: [{ mob: 'caverat', n: 7, zone: [4, 7, 16, 18] }, { mob: 'shroomlet', n: 6, zone: [30, 7, 44, 18] }, { mob: 'pinkjel', n: 8, zone: [14, 16, 30, 26] }, { mob: 'burrowbat', n: 6, zone: [3, 25, 15, 36] }],
  bosses: [{ mob: 'jellyqueen', x: 40, y: 32, every: 600 }],
  deco: [['prop_barrel_01', 21.5, 3.4], ['prop_crate_01', 27.4, 3.4], ['prop_bucket_01', 9.5, 10.3], ['prop_sack_01', 35.5, 10.4]],
});
