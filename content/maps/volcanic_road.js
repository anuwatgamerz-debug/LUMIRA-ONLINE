'use strict';
// ถนนภูเขาไฟ (Lv46-54): the old border road north of Emberhold, cut by lava rivers. A garrison watch post guards the
// south end; the Ashfang horde's war camp (warlord Korrag) sits in the east, salamanders hunt along the lava, and
// purple-glowing ash vents mark where the Cinder Cult buried something. North-west: the Ruined Fortress, east: the Molten Lake.
module.exports = G => {
  const { mkMap, rng, border, rect, scatter, line, blob, clear, portal } = G;
  const m = mkMap('volcanic_road', 'ถนนภูเขาไฟ', 70, 48, 0);
  const r = rng(3303);
  border(m, 6);
  scatter(m, r, 230, 6, [1, 1, 68, 46]);
  scatter(m, r, 50, 5, [1, 1, 68, 46]);
  line(m, [[0, 31], [16, 27], [33, 31], [50, 25], [69, 29]], 2, 3);     // lava river
  blob(m, r, 58, 11, 6, 4, 2, 0.2); blob(m, r, 12, 40, 4, 3, 2, 0.2);    // lava pools
  // roads (a bridge wherever a road crosses lava)
  const road = (pts, w) => { const before = m.t.slice(); line(m, pts, 4, w); for (let i = 0; i < m.t.length; i++) if (before[i] === 2 && m.t[i] === 4) m.t[i] = 12; };
  road([[35, 47], [35, 36], [30, 24], [24, 14], [12, 6], [10, 0]], 2);
  road([[30, 24], [48, 18], [69, 20]], 2);
  blob(m, r, 37, 42, 5, 3, 0, 0.1);                                      // garrison watch post
  blob(m, r, 56, 35, 9, 6, 0, 0.12);                                     // Ashfang war camp
  for (const [x, y, rx, ry] of [[16, 16, 8, 5], [44, 9, 8, 4], [20, 38, 7, 4], [60, 21, 5, 3], [8, 22, 5, 3]]) blob(m, r, x, y, rx, ry, 0, 0.18);
  for (const [x, y] of [[20, 21], [44, 26], [58, 16], [25, 35]]) rect(m, x - 1, y - 1, x + 1, y + 1, 0);   // ash vents
  clear(m, 33, 43, 37, 46, 0); clear(m, 8, 1, 12, 4, 0); clear(m, 65, 18, 68, 22, 0);
  portal(m, 35, 47, 'emberhold', 30, 1);
  portal(m, 10, 0, 'ruined_fortress', 30, 4, { lv: 58 }, 'ป้อมปรักหักพัง (Lv 58+)');
  portal(m, 69, 20, 'molten_lake', 2, 27, { lv: 54 }, 'ทะเลสาบลาวา (Lv 54+)');
  m.deco = [['prop_tent_01', 34.5, 40.4], ['prop_flag_blue_01', 40.4, 41.4], ['prop_campfire_01', 38.5, 43.6], ['prop_crate_01', 33.4, 44.6],
    ['prop_tent_01', 51.5, 32.4], ['prop_tent_01', 60.5, 32.4], ['prop_campfire_01', 56.5, 36.4], ['prop_flag_red_01', 49.4, 36.6], ['prop_flag_red_01', 63.6, 36.6],
    ['prop_weaponrack_01', 53.4, 39.2], ['prop_weaponrack_01', 59.6, 39.2], ['prop_barrel_01', 64.4, 34.2]];
  m.spawns = [
    { mob: 'magmaslime', n: 7, zone: [40, 4, 66, 16] }, { mob: 'fireimp', n: 6, zone: [8, 10, 26, 22] },
    { mob: 'salamander', n: 6, zone: [6, 32, 30, 44] }, { mob: 'ashorc', n: 6, zone: [48, 30, 65, 41] },
    { mob: 'ashshaman', n: 3, zone: [48, 30, 65, 41] }, { mob: 'magmaslime', n: 4, zone: [36, 20, 52, 30] },
    { mob: 'salamander', n: 3, zone: [56, 18, 66, 26] }, { mob: 'cinderbrute', n: 1, zone: [48, 30, 65, 41], respawn: 600 },
  ];
  m.bosses = [{ mob: 'korrag', x: 56, y: 35, every: 1500 }];
  m.nodes = [[20, 21], [44, 26], [58, 16], [25, 35]].map(([x, y], i) => ({ id: 'ashvent' + i, k: 'ashvent', n: 'ปล่องเถ้าวอยด์', x, y, item: 551, quest: 1, respawn: 5 }));
  m.spawn = { x: 35, y: 45 };
  m.safe = [[31, 39, 41, 47]];
  return m;
};
