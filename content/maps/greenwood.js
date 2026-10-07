'use strict';
// ป่ากรีนวูด (Lv8-18): thick forest. Forest Watch camp in the middle (safe), bandit camp in the north-west
// (Rogue trial), the Elder Grove in the north where Elder Thornwood waits.
module.exports = G => {
  const { mkMap, rng, border, set, rect, scatter, line, blob, clear, portal } = G;
  const m = mkMap('greenwood', 'ป่ากรีนวูด', 70, 60, 1);
  const r = rng(4410);
  border(m, 5);
  scatter(m, r, 640, 5, [1, 1, 68, 58]);
  scatter(m, r, 60, 11, [1, 1, 68, 58], [1]);
  scatter(m, r, 20, 6, [1, 1, 68, 58], [1]);
  line(m, [[1, 50], [12, 46], [22, 40], [34, 32], [46, 30], [68, 30]], 4, 2);
  line(m, [[34, 32], [35, 20], [35, 12]], 4, 2);
  line(m, [[22, 40], [14, 28], [12, 14]], 4, 2);
  blob(m, r, 35, 8, 9, 5, 1, 0.1);                    // Elder Grove clearing
  blob(m, r, 12, 10, 7, 5, 0, 0.12);                  // bandit camp
  blob(m, r, 34, 31, 6, 4, 1, 0.1);                   // Forest Watch camp
  blob(m, r, 54, 46, 6, 4, 2);                        // forest pond
  // hunting grounds: open glades so monsters have room
  for (const [x, y, rx, ry] of [[20, 48, 6, 4], [52, 16, 7, 5], [56, 38, 5, 4], [24, 22, 5, 4], [46, 52, 6, 3], [10, 30, 4, 4]]) blob(m, r, x, y, rx, ry, 1, 0.2);
  clear(m, 1, 47, 5, 53); clear(m, 64, 27, 68, 33);
  rect(m, 18, 54, 22, 58, 1); portal(m, 20, 59, 'spider_nest', 20, 3, { lv: 13 }, 'รังแมงมุม (Lv 13+)');
  portal(m, 0, 50, 'beginner_meadow', 62, 8);
  portal(m, 69, 30, 'moonlit_creek', 1, 26);
  rect(m, 34, 1, 36, 3, 4);
  portal(m, 35, 0, 'deep_forest', 36, 61, { lv: 20 }, 'ป่าลึก (Lv 20+)');
  m.deco = [['prop_tent_01', 31.5, 29.5], ['prop_tent_01', 37.5, 29.5], ['prop_barrel_01', 33.4, 33.4], ['prop_crate_01', 36.2, 33.2], ['prop_flag_red_01', 30.4, 33.6], ['prop_tent_01', 9.5, 8.6], ['prop_crate_01', 14.5, 12.3], ['prop_sack_01', 10.4, 12.6], ['prop_lumber_01', 39.5, 34.2]];
  m.spawns = [
    { mob: 'mossslime', n: 8, zone: [4, 38, 30, 56] }, { mob: 'thornsprite', n: 7, zone: [16, 14, 40, 28] },
    { mob: 'barkbeetle', n: 8, zone: [44, 8, 66, 24] }, { mob: 'mossgoblin', n: 6, zone: [40, 34, 66, 50] },
    { mob: 'goblinsling', n: 5, zone: [44, 34, 66, 56] }, { mob: 'wisp', n: 5, zone: [18, 16, 30, 30] },
    { mob: 'thornwolf', n: 6, zone: [40, 44, 66, 58] }, { mob: 'bramblekin', n: 1, zone: [24, 12, 46, 18], respawn: 360 },
    { mob: 'banditlook', n: 4, zone: [6, 6, 18, 14] },
  ];
  m.bosses = [{ mob: 'thornwood', x: 35, y: 7, every: 900 }];
  m.nodes = [
    { id: 'stash', k: 'stash', n: 'หีบของโจร', x: 11, y: 8, item: 159, quest: 1, respawn: 2 },
    { id: 'root1', k: 'root', n: 'รากไม้เหี่ยว', x: 28, y: 18, item: 152, quest: 1, respawn: 20 },
    { id: 'root2', k: 'root', n: 'รากไม้เหี่ยว', x: 42, y: 15, item: 152, quest: 1, respawn: 20 },
    { id: 'root3', k: 'root', n: 'รากไม้เหี่ยว', x: 22, y: 24, item: 152, quest: 1, respawn: 20 },
    ...[[8, 44], [50, 20], [60, 42], [26, 50], [18, 30]].map(([x, y], i) => ({ id: 'wood' + i, k: 'lumber', n: 'ไม้เนื้อแข็ง', x, y, item: 125, respawn: 60 })),
  ];
  m.spawn = { x: 3, y: 50 };
  m.safe = [[28, 27, 40, 35], [0, 46, 6, 54]];
  return m;
};
