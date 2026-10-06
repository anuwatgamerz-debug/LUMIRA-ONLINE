'use strict';
// รังแมงมุมกรีนวูด (Lv13-20): webbed caverns below Greenwood; the Broodmother guards the egg chamber.
module.exports = G => require('./_dungeon')(G, {
  id: 'spider_nest', name: 'รังแมงมุมกรีนวูด', w: 56, h: 48, seed: 7313,
  rooms: [[20, 4, 5, 3], [8, 14, 6, 5], [30, 14, 7, 5], [48, 12, 5, 6], [16, 28, 7, 6], [38, 28, 6, 5], [12, 41, 6, 4], [40, 40, 10, 6]],
  tunnels: [[[20, 4], [8, 14], [16, 28], [12, 41]], [[20, 4], [30, 14], [48, 12]], [[30, 14], [38, 28], [40, 40]], [[16, 28], [38, 28]], [[12, 41], [40, 40]], [[48, 12], [38, 28]]],
  entry: [20, 2], exit: [20, 0, 'greenwood', 20, 57], pillars: 40,
  spawns: [{ mob: 'spiderling', n: 9, zone: [3, 9, 22, 20] }, { mob: 'webspinner', n: 6, zone: [24, 9, 53, 20] }, { mob: 'nestcentipede', n: 5, zone: [9, 22, 30, 35] },
    { mob: 'venomshroom', n: 5, zone: [32, 23, 46, 34] }, { mob: 'spiderling', n: 5, zone: [6, 37, 20, 45] }],
  bosses: [{ mob: 'broodmother', x: 42, y: 41, every: 900 }],
  deco: [['prop_crate_01', 17.5, 3.4], ['prop_sack_01', 23.4, 3.4], ['prop_lumber_01', 7.5, 12.3]],
});
