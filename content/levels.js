'use strict';
// Level progression. MAX_LEVEL 150, non-linear: the base curve rises as lv^1.9 and each band of the game
// (beginner, early, early-mid, mid, late, end game) adds its own weight on top, blended so there is no cliff
// between bands. Lv1-10 stays as quick as the original game.
const MAX_LEVEL = 150;
const BANDS = [ // [from level, weight] - linear blend between these points
  [1, 1.0], [10, 1.0], [30, 1.18], [60, 1.45], [90, 1.85], [120, 2.4], [150, 3.1],
];
const BAND_NAMES = [
  [1, 10, 'beginner', 'เริ่มต้น เรียนรู้เกม'], [11, 30, 'early', 'พื้นที่ต้นเกม'], [31, 60, 'early-mid', 'กลางต้นเกม'],
  [61, 90, 'mid', 'กลางเกม'], [91, 120, 'late', 'ท้ายเกม'], [121, 150, 'endgame', 'End Game'],
];
function bandWeight(lv) {
  for (let i = 1; i < BANDS.length; i++) {
    const [l0, w0] = BANDS[i - 1], [l1, w1] = BANDS[i];
    if (lv <= l1) return w0 + (w1 - w0) * (lv - l0) / (l1 - l0);
  }
  return BANDS[BANDS.length - 1][1];
}
// exp to go from lv to lv+1 (Lv1 = 28, same as the original curve)
function expNext(lv) {
  if (lv >= MAX_LEVEL) return 0;
  return Math.floor((18 * Math.pow(lv, 1.85) + 10) * bandWeight(lv) + (lv > 30 ? Math.pow(lv - 30, 2.2) * 6 : 0));
}
const bandOf = lv => BAND_NAMES.find(b => lv >= b[0] && lv <= b[1]) || BAND_NAMES[BAND_NAMES.length - 1];
// stat points: 5 per level early, 4 from Lv61, 3 from Lv121 (stats cap at STAT_CAP)
const statPointsAt = lv => (lv <= 60 ? 5 : lv <= 120 ? 4 : 3);
const STAT_CAP = 120;

// job level: per class tier. Adventurer 1-10, first class 1-40, second class 1-50, third class 1-70 (end game).
const JOB_CAP = { 0: 10, 1: 40, 2: 50, 3: 70 };
const jobNext = (jlv, tier) => (jlv >= (JOB_CAP[tier] || 50) ? 0 : Math.floor((12 * Math.pow(jlv, 1.7) + 20) * (1 + tier * 0.6)));

// monster exp from its level when a monster doesn't set its own: kills per level grow slowly
const killsPerLevel = lv => 7 + lv * 0.55;
const mobExp = (lv, mult = 1) => Math.max(1, Math.round(expNext(Math.min(lv, MAX_LEVEL - 1)) / killsPerLevel(lv) * mult));

module.exports = { MAX_LEVEL, BANDS, BAND_NAMES, bandOf, expNext, statPointsAt, STAT_CAP, JOB_CAP, jobNext, mobExp, killsPerLevel };
