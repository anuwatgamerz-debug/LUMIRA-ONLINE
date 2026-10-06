'use strict';
// ทุ่งหญ้าผู้เริ่มต้น (Lv1-8): gentle rolling meadow. Only passive monsters (beginner protection area).
// North-east: the star crater where the rune shard fell (main quest).
module.exports = G => {
  const { mkMap, rng, border, set, rect, scatter, line, blob, clear, portal } = G;
  const m = mkMap('beginner_meadow', 'ทุ่งหญ้าผู้เริ่มต้น', 64, 48, 1);
  const r = rng(3301);
  border(m, 5);
  scatter(m, r, 70, 5, [2, 2, 61, 45]);
  scatter(m, r, 90, 11, [2, 2, 61, 45], [1]);
  scatter(m, r, 14, 6, [2, 2, 61, 45], [1]);
  blob(m, r, 18, 36, 6, 4, 2);                          // pond
  line(m, [[1, 24], [14, 24], [24, 20], [38, 18], [50, 12], [62, 8]], 4, 2);
  line(m, [[38, 18], [44, 28], [56, 36], [62, 36]], 4, 2);
  line(m, [[18, 31], [18, 41]], 12, 2);
  blob(m, r, 46, 9, 4, 3, 0, 0.15);                     // star crater (scorched ground)
  clear(m, 1, 21, 6, 27); clear(m, 43, 7, 49, 11, 0);
  rect(m, 38, 43, 42, 46, 1); portal(m, 40, 47, 'slime_burrow', 24, 3, { lv: 4 }, 'โพรงสไลม์ (Lv 4+)');
  portal(m, 0, 24, 'lumira', 48, 20);
  portal(m, 63, 8, 'greenwood', 1, 50);
  portal(m, 63, 36, 'ancient_farm', 2, 24, { locked: 1 }, 'ไร่โบราณ (ยังไม่เปิด)');
  m.spawns = [
    { mob: 'dewslime', n: 11, zone: [5, 4, 34, 44] }, { mob: 'sprout', n: 9, zone: [8, 4, 40, 30] },
    { mob: 'fluffle', n: 7, zone: [20, 26, 58, 44] }, { mob: 'hopper', n: 7, zone: [28, 14, 60, 34] },
    { mob: 'budling', n: 6, zone: [36, 20, 60, 44] },
  ];
  m.nodes = [
    { id: 'shard', k: 'shard', n: 'เศษรูนเรืองแสง', x: 46, y: 9, item: 150, quest: 1, respawn: 2 },
    ...[[10, 10], [26, 8], [33, 30], [12, 42], [52, 40], [40, 24], [56, 22], [28, 38]].map(([x, y], i) => ({ id: 'herb' + i, k: 'herb', n: 'สมุนไพรทุ่ง', x, y, item: 104, respawn: 40 })),
  ];
  m.spawn = { x: 3, y: 24 };
  m.safe = [[0, 19, 7, 29]];
  return m;
};
