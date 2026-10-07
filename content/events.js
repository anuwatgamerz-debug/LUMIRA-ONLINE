'use strict';
// Event registry: timed rate events (Double EXP / Double Drop / ...). Events live here as data, never as code
// in server.js. An event is active when `enabled` is set and the current time is inside its window:
//   from/to: ISO dates (optional)   days: weekdays 0-6 (optional, Sunday = 0)   hours: [start, end) in local server time
// exp / drop / jexp: multipliers while active (several active events multiply, capped by MAX).
const EVENTS = [
  { id: 'weekend_exp', th: 'สุดสัปดาห์ EXP ×1.5', enabled: false, days: [6, 0], exp: 1.5, jexp: 1.5 },
  { id: 'double_drop', th: 'ดรอป ×2', enabled: false, drop: 2 },
  { id: 'star_festival', th: 'เทศกาลดาวตก', enabled: false, from: '2026-12-20', to: '2027-01-03', exp: 1.2, drop: 1.2 },
  { id: 'evening_rush', th: 'ชั่วโมงทอง 20:00-22:00 EXP ×1.3', enabled: false, hours: [20, 22], exp: 1.3 },
];
const MAX = { exp: 3, jexp: 3, drop: 3 };
function isActive(e, now = new Date()) {
  if (!e.enabled) return false;
  if (e.from && now < new Date(e.from + 'T00:00:00')) return false;
  if (e.to && now >= new Date(e.to + 'T23:59:59')) return false;
  if (e.days && !e.days.includes(now.getDay())) return false;
  if (e.hours && !(now.getHours() >= e.hours[0] && now.getHours() < e.hours[1])) return false;
  return true;
}
const active = (now = new Date()) => EVENTS.filter(e => isActive(e, now));
function rates(now = new Date()) {
  const r = { exp: 1, jexp: 1, drop: 1 };
  for (const e of active(now)) for (const k in r) if (e[k]) r[k] *= e[k];
  for (const k in r) r[k] = Math.min(MAX[k], r[k]);
  return r;
}
module.exports = { EVENTS, isActive, active, rates };
