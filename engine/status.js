'use strict';
// ============================================================ ELYNDRA ONLINE — status effects (server authority)
// Extends what the server already had (player buffs in c._b, mob.slowUntil) instead of a second engine:
//   monsters: stun, slow, damage over time (poison / bleed / burn / curse / acid), debuff (ATK / DEF), mark
//             (damage taken + / forced criticals). Bosses shrug off most of a stun, elites part of it.
//   players : barrier (absorbs damage), dr (damage reduction), evade (next N attacks miss), regen (HP per second)
//             — all regular buffs, so the HUD buff row and expiry already work.
const BIT = { stun: 1, slow: 2, poison: 4, bleed: 8, burn: 16, curse: 32, acid: 64, mark: 128, weak: 256 };

module.exports = function status(api) { // api: { now(), dotHit(mob, ownerId, dmg, kind), MOBS }
  const S = mob => mob.st || (mob.st = { dots: [], deb: null, mark: null, stunUntil: 0 });
  // ---- monsters
  function stun(mob, ms) {
    const d = api.MOBS[mob.type]; if (d.dummy) return 0;
    const t = Math.round(ms * (d.boss ? 0.3 : d.elite ? 0.6 : 1)), s = S(mob);
    s.stunUntil = Math.max(s.stunUntil, api.now() + t); mob.path = null; return t;
  }
  function slow(mob, ms) { mob.slowUntil = Math.max(mob.slowUntil || 0, api.now() + ms); }
  // one dot per kind per owner (re-applying refreshes it)
  function dot(mob, owner, k, ms, perTick) {
    if (perTick <= 0) return; const s = S(mob), now = api.now();
    const o = s.dots.find(x => x.k === k && x.owner === owner);
    if (o) { o.until = now + ms; o.dmg = Math.max(o.dmg, perTick); } else s.dots.push({ k, owner, until: now + ms, next: now + 1000, dmg: perTick });
  }
  function debuff(mob, atk, def, ms) { const s = S(mob), now = api.now(); s.deb = { atk: atk || 0, def: def || 0, until: now + ms }; }
  function mark(mob, owner, taken, crit, ms) { S(mob).mark = { owner, taken: taken || 0, crit: !!crit, until: api.now() + ms }; }
  const deb = (mob, k) => { const s = mob.st, d = s && s.deb; return d && d.until > api.now() ? d[k] : 0; };
  const marked = mob => { const s = mob.st, m = s && s.mark; return m && m.until > api.now() ? m : null; };
  const stunned = mob => !!(mob.st && mob.st.stunUntil > api.now());
  // per game tick: damage over time; returns true while the monster is stunned (it neither moves nor attacks)
  function tick(mob) {
    const s = mob.st; if (!s) return false; const now = api.now();
    if (s.dots.length) {
      for (const o of s.dots) if (now >= o.next && o.until > now - 1) { o.next += 1000; api.dotHit(mob, o.owner, o.dmg, o.k); if (mob.hp <= 0) return true; }
      s.dots = s.dots.filter(o => o.until > now);
    }
    return s.stunUntil > now;
  }
  function bits(mob) {
    const s = mob.st, now = api.now(); let b = mob.slowUntil > now ? BIT.slow : 0; if (!s) return b;
    if (s.stunUntil > now) b |= BIT.stun;
    for (const o of s.dots) if (o.until > now) b |= BIT[o.k] || BIT.poison;
    if (s.deb && s.deb.until > now) b |= BIT.weak;
    if (s.mark && s.mark.until > now) b |= BIT.mark;
    return b;
  }
  // ---- players: incoming damage after evade / damage reduction / barrier. Returns [damage, how] (how: 'evade' | 'absorb' | '')
  function incoming(c, dmg, buffsOf, buffSum) {
    const B = buffsOf(c), now = api.now();
    if (dmg <= 0) return [0, ''];
    for (const id in B) { const b = B[id]; if (b.evade > 0 && b.until > now) { b.evade--; if (b.evade <= 0) delete B[id]; return [0, 'evade']; } }
    const dr = Math.min(0.6, buffSum(c, 'dr')); dmg = Math.max(1, Math.round(dmg * (1 - dr)));
    let how = '';
    for (const id in B) { const b = B[id]; if (b.absorb > 0 && b.until > now) { const t = Math.min(b.absorb, dmg); b.absorb -= t; dmg -= t; how = 'absorb'; if (b.absorb <= 0) delete B[id]; if (!dmg) break; } }
    return [dmg, how];
  }
  // remove the harmful buffs a player put on themselves (negative values) — Purify
  function cleanse(c, buffsOf) { const B = buffsOf(c); let n = 0; for (const id in B) if (Object.values(B[id]).some(v => typeof v === 'number' && v < 0)) { delete B[id]; n++; } return n; }
  return { BIT, stun, slow, dot, debuff, mark, deb, marked, stunned, tick, bits, incoming, cleanse };
};
