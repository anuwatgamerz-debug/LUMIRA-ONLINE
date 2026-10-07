'use strict';
// ถ้ำเพลิง (dungeon, Lv52-60): lava tunnels inside the volcano, entered from the Molten Lake. The fire altar at the
// bottom is guarded by the Pyrelord, who holds the flame core the Cinder Cult needs for its ritual.
module.exports = G => {
  const m = require('./_dungeon')(G, {
    id: 'fire_cavern', name: 'ถ้ำเพลิง', w: 56, h: 56, seed: 3306,
    rooms: [[28, 5, 6, 3], [12, 15, 7, 5], [44, 14, 7, 5], [28, 26, 9, 5], [10, 37, 7, 5], [46, 37, 7, 5], [28, 48, 11, 5]],
    tunnels: [[[28, 5], [12, 15], [28, 26], [10, 37], [28, 48]], [[28, 5], [44, 14], [28, 26], [46, 37], [28, 48]], [[12, 15], [44, 14]], [[10, 37], [46, 37]]],
    entry: [28, 2], exit: [28, 0, 'molten_lake', 64, 6], pillars: 40,
    spawns: [{ mob: 'magmaslime', n: 6, zone: [5, 10, 20, 21] }, { mob: 'lavaworm', n: 6, zone: [37, 9, 52, 20] }, { mob: 'ashwisp', n: 3, zone: [19, 21, 37, 31] },
      { mob: 'fireimp', n: 5, zone: [3, 32, 18, 43] }, { mob: 'lavaworm', n: 5, zone: [39, 32, 54, 43] }, { mob: 'emberbat', n: 5, zone: [19, 21, 37, 31] }],
    bosses: [{ mob: 'pyrelord', x: 28, y: 50, every: 1800 }],
    deco: [['prop_campfire_01', 25.5, 3.4], ['prop_campfire_01', 31.5, 3.4], ['prop_statue_01', 22.5, 46.4], ['prop_statue_01', 34.5, 46.4]],
    nodes: [[8, 13], [48, 16], [14, 39], [44, 39]].map(([x, y], i) => ({ id: 'fcry' + i, k: 'firecrystal', n: 'ผลึกไฟ', x, y, item: 521, respawn: 60 })),
  });
  // lava pools in the room corners, away from the tunnels (paths between rooms stay open — tests walk them)
  for (const [x, y, rx, ry] of [[7, 18, 3, 2], [49, 11, 3, 2], [21, 28, 2, 2], [35, 28, 2, 2], [6, 40, 3, 2], [51, 40, 3, 2], [19, 51, 3, 2], [37, 51, 3, 2]]) {
    for (let yy = y - ry; yy <= y + ry; yy++) for (let xx = x - rx; xx <= x + rx; xx++) if (((xx - x) / (rx + 0.5)) ** 2 + ((yy - y) / (ry + 0.5)) ** 2 <= 1 && G.get(m, xx, yy) === 0) G.set(m, xx, yy, 2);
  }
  return m;
};
