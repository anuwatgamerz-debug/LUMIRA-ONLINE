'use strict';
// ============================================================ ELYNDRA ONLINE — skill VFX (Phase 1: basic attacks, beginner + first class)
// One registry for every skill effect. Skills never point at image files: content/skills.js gives each skill
// castVfx / projectileVfx / hitVfx / areaVfx ids from VFX_DEF below, and the server sends that table once (welcome.vfx).
//
// Textures: Kenney "Particle Pack" (CC0), converted to white + alpha by tools/art/build_vfx.py and tinted here at
// runtime (one cached canvas per texture+colour, never a new Image per hit). See docs/VFX_ASSET_LICENSES.md.
//
// Effect = layers. Layer fields:
//   m    motion: pop (scale + fade at a point) | slash (rotating arc toward the target) | burst (particles fly out)
//              rise (particles float up) | ground (flat ellipse at the feet, under characters) | proj (travels
//              source -> target with a short trail) | streak (stretched from source to target) | beam (column of light)
//   tex  texture id (VFX_TEX) or 'HAMMER' (procedural)   col  tint   sz  size px (art space; 1 tile = 32)
//   ms   layer duration   d  delay   a  alpha   s0/s1  start/end scale   spin  rad/s   rot  fixed angle
//   n    particle count   r  spread radius px   at  'src' | 'dst' (default: the effect anchor)   y  vertical offset
//   q    quality needed (0 = always, 1 = Medium+, 2 = High)   add  1 = additive glow (default: normal blend, readable on any ground)
//   rr   size from the skill's area radius (sz = radius * 2 * rr)
// Size classes: S 24 · M 40 · L 64 · U 96 px. Basic hits 150-350 ms, normal skills 300-700 ms, areas 500-1200 ms.
const VFX_TEX = {
  slash_arc: 'sword/slash_arc.webp', slash_wide: 'sword/slash_wide.webp', slash_thin: 'sword/slash_thin.webp', claw: 'melee/claw.webp',
  star_hit: 'impact/star_hit.webp', flash: 'impact/flash.webp', burst: 'impact/burst.webp', spark: 'impact/spark.webp', compass: 'impact/compass.webp',
  dust: 'environment/dust.webp', flame: 'fire/flame.webp', blast: 'fire/blast.webp', muzzle: 'fire/muzzle.webp',
  needle: 'ice/needle.webp', crystal: 'ice/crystal.webp', bolt: 'lightning/bolt.webp', arc: 'lightning/arc.webp',
  runes: 'holy/runes.webp', halo: 'holy/halo.webp', glow: 'holy/glow.webp', starlight: 'holy/starlight.webp',
  ring: 'buff/ring.webp', rune_arc: 'buff/rune_arc.webp', barrier: 'shield/barrier.webp', shell: 'shield/shell.webp',
  trail: 'arrow/trail.webp', twirl: 'wind/twirl.webp', streak: 'wind/streak.webp', smoke: 'dark/smoke.webp',
  bubble: 'poison/bubble.webp', sparkle: 'heal/sparkle.webp', splash: 'alchemy/splash.webp', weld: 'mechanical/weld.webp', stun: 'status/stun.webp',
};
const VFX_SIZE = { S: 24, M: 40, L: 64, U: 96 };
// texture orientation: the angle (rad) the sprite "points" to before rotation
const VFX_AXIS = { slash_arc: Math.PI / 2, slash_wide: -Math.PI / 2, slash_thin: 0, claw: -Math.PI / 4, needle: -Math.PI / 2, trail: -Math.PI / 2, streak: -Math.PI / 2, bolt: -Math.PI / 2, flame: -Math.PI / 2, muzzle: -Math.PI / 2 };

const VFX_DEF = {
  // ---------------------------------------------------------------- basic attacks (by weapon) + combat feedback
  'atk.sword':  { size: 'S', ms: 240, layers: [{ m: 'slash', tex: 'slash_arc', col: '#8fc4ff', sz: 44, ms: 220 }, { m: 'burst', tex: 'spark', col: '#ffffff', n: 3, r: 12, sz: 8, ms: 200, add: 1, q: 1 }] },
  'atk.heavy':  { size: 'M', ms: 300, layers: [{ m: 'slash', tex: 'slash_wide', col: '#a8c8f0', sz: 48, ms: 280 }, { m: 'ground', tex: 'dust', col: '#9a8a6a', sz: 30, ms: 300, a: 0.45, q: 1 }] },
  'atk.spear':  { size: 'S', ms: 220, layers: [{ m: 'pop', tex: 'streak', col: '#9fd0ff', sz: 40, ms: 200, s0: 0.6, s1: 1.1, aim: 1 }, { m: 'pop', tex: 'spark', col: '#ffffff', sz: 14, ms: 160, add: 1, q: 1 }] },
  'atk.dagger': { size: 'S', ms: 200, layers: [{ m: 'slash', tex: 'claw', col: '#c9a8ff', sz: 32, ms: 180 }] },
  'atk.bow':    { size: 'S', ms: 200, layers: [{ m: 'pop', tex: 'star_hit', col: '#e8c060', sz: 26, ms: 180 }] },
  'atk.magic':  { size: 'S', ms: 260, layers: [{ m: 'pop', tex: 'sparkle', col: '#a070ff', sz: 30, ms: 240 }, { m: 'burst', tex: 'bubble', col: '#c9a8ff', n: 3, r: 12, sz: 6, ms: 240, q: 1 }] },
  'atk.device': { size: 'S', ms: 220, layers: [{ m: 'pop', tex: 'muzzle', col: '#ffb040', sz: 26, ms: 160, aim: 1 }, { m: 'burst', tex: 'spark', col: '#ffe9b0', n: 3, r: 12, sz: 8, ms: 200, q: 1 }] },
  'atk.mob':    { size: 'S', ms: 180, layers: [{ m: 'pop', tex: 'star_hit', col: '#ff6a5a', sz: 24, ms: 170 }] },
  'proj.arrow': { size: 'S', ms: 220, speed: 0.9, layers: [{ m: 'proj', tex: 'trail', col: '#c8a060', sz: 26, n: 2 }] },
  'proj.magic': { size: 'S', ms: 240, speed: 0.6, layers: [{ m: 'proj', tex: 'sparkle', col: '#a070ff', sz: 18, n: 3 }] },
  'crit.flash': { size: 'M', ms: 260, layers: [{ m: 'pop', tex: 'flash', col: '#ffc020', sz: 50, ms: 200, s0: 0.5, s1: 1.2 }, { m: 'pop', tex: 'halo', col: '#ffd34d', sz: 42, ms: 250, s0: 0.3, s1: 1, a: 0.8, q: 1 }] },
  'miss.whiff': { size: 'S', ms: 170, layers: [{ m: 'pop', tex: 'streak', col: '#8a94a8', sz: 22, ms: 160, a: 0.6, rot: 1.2 }] },
  'block.spark':{ size: 'S', ms: 240, layers: [{ m: 'pop', tex: 'shell', col: '#5ab8ff', sz: 32, ms: 220, a: 0.7, s0: 0.8, s1: 1.1 }, { m: 'burst', tex: 'spark', col: '#3aa0ff', n: 5, r: 14, sz: 9, ms: 220 }] },
  'evade.whiff':{ size: 'S', ms: 230, layers: [{ m: 'pop', tex: 'twirl', col: '#5ac8ff', sz: 28, ms: 220, spin: 8, a: 0.85 }] },
  'dot.tick':   { size: 'S', ms: 220, layers: [{ m: 'pop', tex: 'bubble', col: '#5ac040', sz: 12, ms: 200, a: 0.85, q: 1 }] },
  'cast.glint': { size: 'S', ms: 200, layers: [{ m: 'pop', tex: 'sparkle', col: '#ffc840', sz: 20, ms: 200, y: -22 }] },

  // ---------------------------------------------------------------- beginner skills
  'bash.hit':    { size: 'M', ms: 340, layers: [{ m: 'slash', tex: 'slash_arc', col: '#6ab0ff', sz: 60, ms: 320 }, { m: 'pop', tex: 'flash', col: '#ffc020', sz: 40, ms: 260, s0: 0.5, s1: 1.1 }, { m: 'burst', tex: 'spark', col: '#4ab0ff', n: 6, r: 22, sz: 9, ms: 340, q: 1 }] },
  'heal.self':   { size: 'M', ms: 700, layers: [{ m: 'ground', tex: 'halo', col: '#3ad060', sz: 48, ms: 600, s0: 0.5, s1: 1.1, a: 0.8 }, { m: 'rise', tex: 'sparkle', col: '#50e070', n: 8, r: 12, sz: 12, ms: 700 }, { m: 'pop', tex: 'glow', col: '#7dff8a', sz: 40, ms: 500, a: 0.45, y: -14, add: 1, q: 1 }] },
  'bolt.cast':   { size: 'S', ms: 200, layers: [{ m: 'pop', tex: 'arc', col: '#4aa8ff', sz: 26, ms: 200, y: -18 }] },
  'bolt.proj':   { size: 'S', ms: 260, speed: 0.55, layers: [{ m: 'proj', tex: 'sparkle', col: '#5ab4ff', sz: 22, n: 4 }, { m: 'proj', tex: 'arc', col: '#9fd8ff', sz: 16, n: 0, spin: 14, q: 1 }] },
  'bolt.hit':    { size: 'M', ms: 300, layers: [{ m: 'pop', tex: 'arc', col: '#3a9cff', sz: 42, ms: 260, rnd: 1 }, { m: 'burst', tex: 'spark', col: '#9fd8ff', n: 5, r: 18, sz: 8, ms: 300, q: 1 }] },
  'focus.self':  { size: 'M', ms: 650, layers: [{ m: 'ground', tex: 'halo', col: '#3a80ff', sz: 46, ms: 650, s0: 0.5, s1: 1, a: 0.8 }, { m: 'ground', tex: 'rune_arc', col: '#4a90ff', sz: 52, ms: 650, spin: 2, a: 0.9, q: 1 }, { m: 'rise', tex: 'bubble', col: '#5aa0ff', n: 6, r: 10, sz: 8, ms: 650, q: 1 }] },
  'cleave.area': { size: 'L', ms: 520, layers: [{ m: 'orbit', tex: 'slash_arc', col: '#f0b030', sz: 48, ms: 380 }, { m: 'ground', tex: 'ring', col: '#ffc020', rr: 1, ms: 500, s0: 0.3, s1: 1, a: 0.7 }] },
  'cleave.hit':  { size: 'S', ms: 220, layers: [{ m: 'slash', tex: 'slash_thin', col: '#ffd060', sz: 34, ms: 220 }] },
  'twin.hit':    { size: 'S', ms: 260, layers: [{ m: 'slash', tex: 'slash_thin', col: '#7ab8ff', sz: 44, ms: 240 }, { m: 'pop', tex: 'spark', col: '#ffffff', sz: 16, ms: 180, add: 1, q: 1 }] },

  // ---------------------------------------------------------------- Vanguard: blue / steel / gold, heavy
  'vg.bulwark':  { size: 'M', ms: 700, layers: [{ m: 'ground', tex: 'shell', col: '#3a78e0', sz: 60, ms: 700, s0: 0.4, s1: 1, a: 0.8 }, { m: 'pop', tex: 'barrier', col: '#7fa8ff', sz: 54, ms: 650, a: 0.5, y: -14 }, { m: 'rise', tex: 'spark', col: '#ffc020', n: 6, r: 14, sz: 9, ms: 650, q: 1 }] },
  'vg.taunt':    { size: 'L', ms: 500, layers: [{ m: 'ground', tex: 'ring', col: '#ff6a3a', sz: 84, ms: 500, s0: 0.2, s1: 1, a: 0.7 }] },
  'vg.strike':   { size: 'M', ms: 360, layers: [{ m: 'slash', tex: 'slash_arc', col: '#5a8ae0', sz: 62, ms: 340 }, { m: 'pop', tex: 'flash', col: '#ffc020', sz: 42, ms: 280, s0: 0.5, s1: 1.1 }, { m: 'ground', tex: 'dust', col: '#8a7a5a', sz: 40, ms: 360, a: 0.45, q: 1 }] },
  'vg.charge':   { size: 'M', ms: 320, layers: [{ m: 'streak', tex: 'trail', col: '#4a80e0', sz: 26, ms: 300, a: 0.85 }, { m: 'ground', tex: 'dust', col: '#8a7a5a', sz: 32, ms: 320, a: 0.5, at: 'src', q: 1 }] },
  'vg.charge.hit': { size: 'M', ms: 400, layers: [{ m: 'pop', tex: 'burst', col: '#5a8ae0', sz: 56, ms: 360, s0: 0.5, s1: 1.15 }, { m: 'ground', tex: 'dust', col: '#8a7a5a', sz: 50, ms: 400, a: 0.5, q: 1 }, { m: 'burst', tex: 'spark', col: '#ffc020', n: 7, r: 24, sz: 9, ms: 380, q: 1 }] },

  // ---------------------------------------------------------------- Ranger: green / wind / gold, light and fast
  'rg.draw':     { size: 'S', ms: 180, layers: [{ m: 'pop', tex: 'sparkle', col: '#60d040', sz: 18, ms: 180, y: -16 }] },
  'rg.pierce':   { size: 'S', ms: 200, speed: 1.2, layers: [{ m: 'proj', tex: 'trail', col: '#70c040', sz: 38, n: 3 }, { m: 'proj', tex: 'streak', col: '#30a030', sz: 22, n: 0, q: 1 }] },
  'rg.pierce.hit': { size: 'S', ms: 280, layers: [{ m: 'pop', tex: 'star_hit', col: '#60c030', sz: 34, ms: 220 }, { m: 'pop', tex: 'twirl', col: '#40b040', sz: 30, ms: 260, spin: 10, a: 0.8, q: 1 }] },
  'rg.volley':   { size: 'S', ms: 220, speed: 1.0, layers: [{ m: 'proj', tex: 'trail', col: '#c8a060', sz: 28, n: 2, off: -5 }, { m: 'proj', tex: 'trail', col: '#60c040', sz: 28, n: 2, off: 5, d: 60 }] },
  'rg.volley.hit': { size: 'S', ms: 200, layers: [{ m: 'pop', tex: 'star_hit', col: '#70c040', sz: 28, ms: 200 }] },
  'rg.windstep': { size: 'M', ms: 520, layers: [{ m: 'ground', tex: 'twirl', col: '#30b050', sz: 56, ms: 500, spin: 9, a: 0.85 }, { m: 'rise', tex: 'streak', col: '#50d070', n: 6, r: 14, sz: 16, ms: 500, q: 1 }] },

  // ---------------------------------------------------------------- Arcanist: blue / violet, fire / ice / lightning, rune circle
  'ar.cast.fire':{ size: 'M', ms: 400, layers: [{ m: 'ground', tex: 'rune_arc', col: '#8a5ae0', sz: 46, ms: 400, spin: 3, a: 0.85 }, { m: 'pop', tex: 'flame', col: '#ff7a20', sz: 20, ms: 300, y: -20, q: 1 }] },
  'ar.cast.ice': { size: 'M', ms: 400, layers: [{ m: 'ground', tex: 'rune_arc', col: '#4a90e0', sz: 46, ms: 400, spin: -3, a: 0.85 }, { m: 'pop', tex: 'crystal', col: '#80d0ff', sz: 20, ms: 300, y: -20, q: 1 }] },
  'ar.cast.nova':{ size: 'M', ms: 400, layers: [{ m: 'ground', tex: 'rune_arc', col: '#9a6af0', sz: 52, ms: 400, spin: 4, a: 0.9 }] },
  'ar.ember':    { size: 'M', ms: 300, speed: 0.6, layers: [{ m: 'proj', tex: 'flame', col: '#ff7020', sz: 30, n: 4 }, { m: 'proj', tex: 'bubble', col: '#ffd060', sz: 12, n: 0, add: 1, q: 1 }] },
  'ar.ember.hit':{ size: 'M', ms: 440, layers: [{ m: 'pop', tex: 'blast', col: '#ff6a20', sz: 48, ms: 420, s0: 0.5, s1: 1.2, a: 0.9 }, { m: 'pop', tex: 'flash', col: '#ffd060', sz: 30, ms: 200, add: 1 }, { m: 'burst', tex: 'spark', col: '#ff9a30', n: 6, r: 20, sz: 9, ms: 380, q: 1 }] },
  'ar.frost':    { size: 'S', ms: 280, speed: 0.7, layers: [{ m: 'proj', tex: 'needle', col: '#60b8ff', sz: 34, n: 3 }] },
  'ar.frost.hit':{ size: 'M', ms: 400, layers: [{ m: 'pop', tex: 'crystal', col: '#50b0ff', sz: 46, ms: 380, spin: 3, s0: 0.5, s1: 1 }, { m: 'burst', tex: 'bubble', col: '#a0e0ff', n: 6, r: 18, sz: 7, ms: 380, q: 1 }] },
  'ar.nova':     { size: 'L', ms: 760, layers: [{ m: 'ground', tex: 'runes', col: '#7a5ae0', rr: 1, ms: 700, spin: 1.5, s0: 0.6, s1: 1, a: 0.9 }, { m: 'ground', tex: 'ring', col: '#4aa0ff', rr: 1, ms: 600, s0: 0.2, s1: 1.05, a: 0.75 }, { m: 'pop', tex: 'flash', col: '#d0c0ff', sz: 40, ms: 260, add: 1 }, { m: 'burst', tex: 'arc', col: '#9a7aff', n: 6, rr: 0.5, sz: 20, ms: 500, q: 1 }] },
  'ar.nova.hit': { size: 'S', ms: 280, layers: [{ m: 'pop', tex: 'arc', col: '#9a7aff', sz: 32, ms: 260, rnd: 1 }] },

  // ---------------------------------------------------------------- Cleric: white / gold / azure, Elyndra celestial runes and stars
  'cl.mend':     { size: 'M', ms: 820, layers: [{ m: 'ground', tex: 'runes', col: '#e0b030', sz: 58, ms: 800, spin: 1.2, s0: 0.6, s1: 1, a: 0.9 }, { m: 'pop', tex: 'glow', col: '#80c8ff', sz: 48, ms: 700, a: 0.5, y: -14, add: 1 }, { m: 'rise', tex: 'starlight', col: '#f0c040', n: 8, r: 14, sz: 13, ms: 800, q: 1 }] },
  'cl.cast':     { size: 'S', ms: 260, layers: [{ m: 'pop', tex: 'starlight', col: '#f0c030', sz: 26, ms: 260, y: -26, spin: 2 }] },
  'cl.smite':    { size: 'S', ms: 280, speed: 0.6, layers: [{ m: 'proj', tex: 'starlight', col: '#f0c030', sz: 26, n: 3, spin: 6 }] },
  'cl.smite.hit':{ size: 'M', ms: 420, layers: [{ m: 'beam', tex: 'trail', col: '#ffd860', sz: 80, ms: 380, a: 0.95 }, { m: 'ground', tex: 'halo', col: '#f0c030', sz: 44, ms: 400, s0: 0.4, s1: 1, a: 0.8 }, { m: 'pop', tex: 'flash', col: '#80c8ff', sz: 32, ms: 220, add: 1, q: 1 }] },
  'cl.bless':    { size: 'L', ms: 900, layers: [{ m: 'ground', tex: 'halo', col: '#f0b020', sz: 62, ms: 800, s0: 0.3, s1: 1.1, a: 0.8 }, { m: 'rise', tex: 'starlight', col: '#f0c040', n: 10, r: 16, sz: 12, ms: 900 }, { m: 'pop', tex: 'compass', col: '#60a8ff', sz: 30, ms: 700, y: -44, spin: 1, a: 0.85, q: 1 }] },

  // ---------------------------------------------------------------- Rogue: dark purple / red / poison green, short and fast
  'rq.shadow':   { size: 'S', ms: 260, layers: [{ m: 'pop', tex: 'smoke', col: '#3a1a50', sz: 30, ms: 260, a: 0.7, q: 1 }] },
  'rq.fang':     { size: 'S', ms: 220, layers: [{ m: 'slash', tex: 'claw', col: '#e02a50', sz: 40, ms: 200 }, { m: 'slash', tex: 'slash_thin', col: '#8a4ae0', sz: 34, ms: 180, flip: 1, q: 1 }] },
  'rq.venom':    { size: 'S', ms: 200, layers: [{ m: 'slash', tex: 'claw', col: '#50d020', sz: 30, ms: 180 }, { m: 'burst', tex: 'bubble', col: '#60e030', n: 4, r: 12, sz: 7, ms: 200, q: 1 }] },
  'rq.veil':     { size: 'L', ms: 700, layers: [{ m: 'ground', tex: 'smoke', col: '#2a1438', sz: 64, ms: 700, a: 0.75 }, { m: 'burst', tex: 'smoke', col: '#4a2a6a', n: 6, r: 20, sz: 22, ms: 700, a: 0.7, q: 1 }] },

  // ---------------------------------------------------------------- Artisan: copper / gold / blue / chemical green
  't.hammer':    { size: 'S', ms: 300, speed: 0.5, layers: [{ m: 'proj', tex: 'HAMMER', col: '#b87333', sz: 16, n: 0, spin: 18 }] },
  't.hammer.hit':{ size: 'M', ms: 340, layers: [{ m: 'pop', tex: 'burst', col: '#e08a30', sz: 44, ms: 320, s0: 0.5, s1: 1.1 }, { m: 'pop', tex: 'star_hit', col: '#5a9ae0', sz: 30, ms: 220 }, { m: 'burst', tex: 'spark', col: '#ffc020', n: 7, r: 22, sz: 9, ms: 320, q: 1 }] },
  't.bomb':      { size: 'L', ms: 620, layers: [{ m: 'ground', tex: 'splash', col: '#60d030', rr: 0.7, ms: 600, s0: 0.5, s1: 1, a: 0.45 }, { m: 'burst', tex: 'blast', col: '#ff7a20', n: 4, rr: 0.4, sz: 26, ms: 450, a: 0.9 }, { m: 'pop', tex: 'flash', col: '#ffd060', sz: 28, ms: 200, add: 1, q: 1 }, { m: 'burst', tex: 'bubble', col: '#80e040', n: 8, rr: 0.5, sz: 8, ms: 600, q: 1 }] },
  't.bomb.hit':  { size: 'S', ms: 220, layers: [{ m: 'pop', tex: 'spark', col: '#ffb030', sz: 22, ms: 200 }] },
  't.repair':    { size: 'M', ms: 620, layers: [{ m: 'ground', tex: 'ring', col: '#3aa0e0', sz: 48, ms: 600, s0: 0.5, s1: 1, a: 0.75 }, { m: 'burst', tex: 'weld', col: '#ffb040', n: 4, r: 16, sz: 22, ms: 500 }, { m: 'rise', tex: 'sparkle', col: '#ffc020', n: 6, r: 12, sz: 10, ms: 600, q: 1 }] },
};
// basic attack hit effect by weapon type (no weapon = sword swing)
const VFX_ATTACK = { sword: 'atk.sword', greatsword: 'atk.heavy', mace: 'atk.heavy', spear: 'atk.spear', dagger: 'atk.dagger', bow: 'atk.bow', staff: 'atk.magic', wand: 'atk.magic', device: 'atk.device' };
const VFX_ATTACK_PROJ = { bow: 'proj.arrow', wand: 'proj.magic', device: 'proj.arrow' };

if (typeof window === 'undefined') module.exports = { VFX_TEX, VFX_DEF, VFX_SIZE, VFX_ATTACK, VFX_ATTACK_PROJ };
else window.VFX = (function () {
  const TP = 32, BASE = 'assets/vfx/';
  const S = () => (window.HUD && HUD.S) || {};
  const mobile = () => (window.matchMedia && matchMedia('(pointer:coarse)').matches) || innerWidth < 760;
  const QL = { high: 2, med: 1, low: 0 };
  const qual = () => QL[S().vfxQ] ?? 2;
  const PART = [0.35, 0.6, 1]; // particle count factor per quality
  const cap = () => Math.round((mobile() ? 28 : 56) * [0.7, 0.85, 1][qual()]); // active effect cap (mobile 20-28, desktop 40-56)
  // ---- textures: one Image per texture, one tinted canvas per texture+colour (bounded: ~70 combinations)
  const IMG = {}, TINT = new Map();
  function tex(id) { let im = IMG[id]; if (!im) { im = IMG[id] = new Image(); im.decoding = 'async'; im.src = BASE + VFX_TEX[id]; } return im; }
  function tinted(id, col) {
    const k = id + col; let c = TINT.get(k); if (c) return c;
    const im = tex(id); if (!im.complete || !im.naturalWidth) return null;
    c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    TINT.set(k, c); return c;
  }
  // load every texture once and pre-tint the colours the registry uses, so the first hit of a skill never stalls a frame
  function preload() {
    const want = {}; for (const d of Object.values(VFX_DEF)) for (const L of d.layers) if (VFX_TEX[L.tex]) (want[L.tex] = want[L.tex] || new Set()).add(L.col);
    for (const id in VFX_TEX) { const im = tex(id); const warm = () => { for (const c of want[id] || []) tinted(id, c); }; if (im.complete && im.naturalWidth) warm(); else im.addEventListener('load', warm, { once: true }); }
  }
  // ---- hooks into the game (set by game.js)
  let H = { ent: () => null, me: () => 0, party: () => false, boss: () => false, isPlayer: () => false };
  let BIND = {};
  // ---- pooled instances
  const live = [], pool = [], LOG = []; // LOG: last effect ids (debug / tests)
  const rnd = (s, j) => { const v = Math.sin(s * 12.9898 + j * 78.233) * 43758.5453; return v - Math.floor(v); };
  const posOf = (id, dy) => { const e = H.ent(id); return e ? [(e.x + 0.5) * TP, (e.y + 0.5) * TP + dy] : null; };
  const BODY = -6, FEET = 12;
  function prioOf(o) {
    const me = H.me();
    if (o.owner === me || o.to === me || o.on === me) return 5;
    if (H.boss(o.owner)) return 4;
    if (H.party(o.owner)) return 3;
    const a = H.ent(me), e = H.ent(o.to || o.on || o.owner);
    return a && e && Math.hypot(a.x - e.x, a.y - e.y) < 8 ? 2 : 1;
  }
  // o: { on, from, to (entity ids) | x, y (tiles) ; owner ; delay ; r (area radius in tiles) ; alt (multi-hit index) }
  // returns the projectile travel time in ms (0 if the effect has no projectile)
  function play(id, o) {
    const def = VFX_DEF[id]; if (!def) return 0;
    const me = H.me(), st = S(), owner = o.owner;
    let q = qual();
    const other = owner && owner !== me && o.to !== me && o.on !== me && H.isPlayer(owner);
    if (other) { if (H.party(owner)) { if (st.vfxParty) q = 0; } else if (st.vfxOthers === false) return 0; }
    const now = performance.now();
    let travel = 0;
    if (def.speed) { const a = H.ent(o.from), b = H.ent(o.to); if (a && b) travel = Math.max(120, Math.min(480, Math.hypot(a.x - b.x, a.y - b.y) * TP / def.speed)); else return 0; }
    const pr = prioOf(o);
    if (live.length >= cap()) { // over the cap: drop the oldest effect with the lowest priority, or skip this one
      let w = -1; for (let i = 0; i < live.length; i++) if (live[i].pr <= pr && (w < 0 || live[i].pr < live[w].pr || (live[i].pr === live[w].pr && live[i].t0 < live[w].t0))) w = i;
      if (w < 0) return travel; pool.push(live[w]); live.splice(w, 1);
    }
    const f = pool.pop() || {};
    f.def = def; f.id = id; f.t0 = now + (o.delay || 0); f.on = o.on || 0; f.from = o.from || 0; f.to = o.to || 0; f.owner = owner || 0; f.alt = o.alt || 0;
    f.x = o.x; f.y = o.y; f.r = o.r || 0; f.q = q; f.pr = pr; f.seed = Math.random() * 1000; f.travel = travel; f.end = (def.speed ? travel : def.ms) + 80;
    // fixed source/target points for effects that don't follow anyone after they start
    const s = o.from ? posOf(o.from, BODY) : null, d = o.to ? posOf(o.to, BODY) : null;
    f.sx = s ? s[0] : 0; f.sy = s ? s[1] : 0; f.dx = d ? d[0] : 0; f.dy = d ? d[1] : 0;
    f.dir = s && d ? Math.atan2(d[1] - s[1], d[0] - s[0]) : (Math.random() < 0.5 ? 0 : Math.PI);
    live.push(f); LOG.push(id); if (LOG.length > 60) LOG.shift();
    return travel;
  }
  function anchor(f, L) { // [x, y] in art px of the body (ground layers add FEET-BODY)
    if (L.at === 'src') return [f.sx, f.sy];
    if (f.x != null) return [(f.x + 0.5) * TP, (f.y + 0.5) * TP + BODY];
    const id = f.on || f.to; if (id) { const p = posOf(id, BODY); if (p) return p; }
    return f.to ? [f.dx, f.dy] : [f.sx, f.sy];
  }
  function sprite(ctx, L, x, y, w, h, ang, a) {
    if (a <= 0.01) return;
    ctx.globalAlpha = Math.min(1, a);
    if (L.tex === 'HAMMER') { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-1, -2, 2, 12); ctx.fillStyle = L.col; ctx.fillRect(-6, -7, 12, 6); ctx.fillStyle = '#ffe0a8'; ctx.fillRect(-6, -7, 12, 1); ctx.restore(); return; }
    const c = tinted(L.tex, L.col); if (!c) return;
    const r = ang + (L.rot || 0) - (VFX_AXIS[L.tex] || 0) * (L.keep ? 0 : 1);
    if (!r) { ctx.drawImage(c, x - w / 2, y - h / 2, w, h); return; }
    ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.drawImage(c, -w / 2, -h / 2, w, h); ctx.restore();
  }
  function drawLayer(ctx, f, L, age, ground) {
    const isG = L.m === 'ground';
    if (isG !== ground) return;
    if ((L.q || 0) > f.q) return;
    const ms = L.ms || f.def.ms, t = age - (L.d || 0);
    if (L.m !== 'proj' && L.m !== 'streak' && (t < 0 || t > ms)) return;
    const p = Math.max(0, Math.min(1, t / ms)), A = (L.a ?? 1);
    const sz = L.rr && L.m !== 'burst' ? (f.r || 2) * TP * 2 * L.rr : L.sz || VFX_SIZE[f.def.size]; // burst: rr is the spread, not the size
    ctx.globalCompositeOperation = L.add ? 'lighter' : 'source-over'; // normal blend reads on bright and dark ground; add:1 = glow
    const [ax, ay0] = anchor(f, L), ay = ay0 + (L.y || 0);
    const sc = (L.s0 ?? 0.9) + ((L.s1 ?? 1.05) - (L.s0 ?? 0.9)) * p;
    const fade = p < 0.12 ? p / 0.12 : p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45; // quick in, hold, fade out
    const spin = (L.spin || 0) * t / 1000;
    switch (L.m) {
      case 'pop': {
        const ang = L.aim ? f.dir : L.rnd ? f.seed : spin;
        sprite(ctx, L, ax, ay, sz * sc, sz * sc, ang, A * fade); break;
      }
      case 'slash': { // sweep toward the target; alternating hits mirror the swing
        const flip = (f.alt % 2 ? -1 : 1) * (L.flip ? -1 : 1), base = f.from ? f.dir : (f.seed > 500 ? 0 : Math.PI);
        const ang = base + flip * (-0.7 + p * 1.0) + (f.alt ? 0.35 * flip : 0);
        sprite(ctx, L, ax, ay - 2, sz * (0.85 + 0.25 * Math.min(1, p * 2)), sz * (0.85 + 0.25 * Math.min(1, p * 2)), ang, A * (p < 0.1 ? p / 0.1 : 1 - (p - 0.1) / 0.9)); break;
      }
      case 'orbit': { // a blade sweeping all the way round the caster (Cleave)
        const R = Math.min(30, (f.r || 1.8) * TP * 0.5), ang = f.seed + p * Math.PI * 2.2;
        for (let k = 0; k < 3; k++) { const a2 = ang - k * 0.35; sprite(ctx, L, ax + Math.cos(a2) * R, ay + 6 + Math.sin(a2) * R * 0.5, sz, sz, a2, A * (1 - p) * (1 - k * 0.3)); }
        break;
      }
      case 'ground': {
        const [gx, gy] = [ax, ay + FEET - BODY], w = sz * sc, a = A * fade;
        const c = L.tex !== 'HAMMER' && tinted(L.tex, L.col); if (!c || a <= 0.01) break;
        ctx.globalAlpha = Math.min(1, a); ctx.save(); ctx.translate(gx, gy); ctx.scale(1, 0.5); if (spin) ctx.rotate(spin); ctx.drawImage(c, -w / 2, -w / 2, w, w); ctx.restore(); break;
      }
      case 'burst': {
        const n = Math.max(1, Math.round((L.n || 4) * PART[f.q])), R = L.rr ? (f.r || 2) * TP * L.rr : (L.r || 16);
        for (let j = 0; j < n; j++) { const a = (j / n) * 6.283 + rnd(f.seed, j) * 0.8, d = R * (0.3 + 0.7 * p) * (0.6 + 0.4 * rnd(f.seed, j + 9)); sprite(ctx, L, ax + Math.cos(a) * d, ay + Math.sin(a) * d * 0.6, sz, sz, a + Math.PI / 2, A * (1 - p)); }
        break;
      }
      case 'rise': {
        const n = Math.max(1, Math.round((L.n || 6) * PART[f.q]));
        for (let j = 0; j < n; j++) { const ph = (p + rnd(f.seed, j) * 0.5) % 1, ox = (rnd(f.seed, j + 3) - 0.5) * 2 * (L.r || 12); sprite(ctx, L, ax + ox + Math.sin(t / 160 + j) * 2, ay + 10 - ph * 40, sz, sz, 0, A * (1 - ph) * (p < 0.85 ? 1 : (1 - p) / 0.15)); }
        break;
      }
      case 'proj': { // flies source -> target; the hit effect waits for it (game.js delays it by the travel time)
        const T = f.travel || 1; let q = (age - (L.d || 0)) / T; if (q < 0 || q > 1) break;
        const nx = -Math.sin(f.dir), ny = Math.cos(f.dir), off = L.off || 0;
        const x = f.sx + (f.dx - f.sx) * q + nx * off, y = f.sy + (f.dy - f.sy) * q + ny * off - Math.sin(q * Math.PI) * (L.tex === 'HAMMER' ? 10 : 0);
        const ang = L.spin ? spin : f.dir;
        const n = Math.round((L.n || 0) * PART[f.q]);
        for (let j = n; j >= 1; j--) { const qq = Math.max(0, q - j * 0.06); sprite(ctx, L, f.sx + (f.dx - f.sx) * qq + nx * off, f.sy + (f.dy - f.sy) * qq + ny * off, sz * (1 - j * 0.15), sz * (1 - j * 0.15), L.spin ? ang : f.dir, A * 0.5 * (1 - j / (n + 1))); }
        sprite(ctx, L, x, y, sz, sz, L.spin ? ang : f.dir, A); break;
      }
      case 'streak': { // stretched trail from where the caster was to the target (charge)
        if (t < 0 || t > ms) break; const len = Math.hypot(f.dx - f.sx, f.dy - f.sy); if (len < 4) break;
        const c = tinted(L.tex, L.col); if (!c) break;
        ctx.globalAlpha = A * (1 - p); ctx.save(); ctx.translate((f.sx + f.dx) / 2, (f.sy + f.dy) / 2 + 6); ctx.rotate(f.dir); ctx.drawImage(c, -len / 2, -(L.sz || 20) / 2, len, L.sz || 20); ctx.restore(); break;
      }
      case 'beam': { // column of light falling on the target
        const c = tinted(L.tex, L.col); if (!c) break; const h = sz, w = sz * 0.45 * (1 - p * 0.5);
        ctx.globalAlpha = A * fade; ctx.drawImage(c, ax - w / 2, ay + 12 - h, w, h); break;
      }
    }
  }
  function drawAll(ctx, ground) {
    if (!live.length) return;
    const now = performance.now();
    ctx.save(); ctx.imageSmoothingEnabled = true;
    for (let i = live.length - 1; i >= 0; i--) {
      const f = live[i], age = now - f.t0;
      if (age > f.end) { pool.push(f); live.splice(i, 1); continue; }
      if (age < 0) continue;
      for (const L of f.def.layers) drawLayer(ctx, f, L, age, ground);
    }
    ctx.restore();
  }
  // ---- persistent status effects (drawn every frame from the snapshot bits / my buffs; never pooled, capped per frame)
  let stN = 0;
  const STATUS = [ // [bit, draw]
    [1, (ctx, x, y, hh, tn) => { for (let j = 0; j < 3; j++) { const a = tn * 4 + j * 2.094; mini(ctx, 'stun', '#ffc800', x + Math.cos(a) * 12, y - hh - 14 + Math.sin(a) * 4, 12, 1); } }],
    [2, (ctx, x, y, hh, tn) => { flat(ctx, 'ring', '#3a90ff', x, y, 32, 0.55 + Math.sin(tn * 4) * 0.1); mini(ctx, 'crystal', '#60b8ff', x + 9, y - hh * 0.5, 14, 0.8); }],
    [4, (ctx, x, y, hh, tn) => bubbles(ctx, '#40c020', x, y, hh, tn)],
    [64, (ctx, x, y, hh, tn) => bubbles(ctx, '#a8d020', x, y, hh, tn + 0.5)],
    [8, (ctx, x, y, hh, tn) => { const ph = (tn * 1.4) % 1; mini(ctx, 'bubble', '#e02030', x - 5, y - hh * 0.6 + ph * 16, 7, 0.95 * (1 - ph)); }],
    [16, (ctx, x, y, hh, tn) => { for (let j = 0; j < 2; j++) mini(ctx, 'flame', '#ff6a10', x - 7 + j * 14, y - 9 - Math.abs(Math.sin(tn * 9 + j)) * 3, 15, 0.9); }],
    [32, (ctx, x, y, hh, tn) => { const ph = (tn * 0.7) % 1; mini(ctx, 'smoke', '#5a2a7a', x + Math.sin(tn * 2) * 6, y - hh * 0.4 - ph * 16, 20, 0.7 * (1 - ph)); }],
    [128, (ctx, x, y, hh, tn) => { const c = tinted('compass', '#e02020'); if (!c) return; ctx.globalAlpha = 0.95; ctx.save(); ctx.translate(x, y - hh - 16); ctx.rotate(tn * 1.5); ctx.drawImage(c, -10, -10, 20, 20); ctx.restore(); }],
    [256, (ctx, x, y, hh, tn) => { mini(ctx, 'bubble', '#7a8296', x + 10, y - hh * 0.7 + ((tn * 20) % 8), 7, 0.85); }],
  ];
  function mini(ctx, id, col, x, y, s, a) { const c = tinted(id, col); if (!c || a <= 0.01) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(c, x - s / 2, y - s / 2, s, s); }
  function flat(ctx, id, col, x, y, s, a) { const c = tinted(id, col); if (!c) return; ctx.globalAlpha = a; ctx.drawImage(c, x - s / 2, y - s / 4, s, s / 2); }
  function bubbles(ctx, col, x, y, hh, tn) { for (let j = 0; j < 2; j++) { const ph = (tn * 0.9 + j * 0.5) % 1; mini(ctx, 'bubble', col, x - 7 + j * 13 + Math.sin(tn * 3 + j) * 2, y - 4 - ph * hh * 0.8, 8, 0.95 * (1 - ph)); } }
  // x, y = feet (art px), hh = sprite height
  function status(ctx, x, y, hh, bits, tn) {
    if (!bits || stN >= (mobile() ? 10 : 18)) return; stN++;
    const q = qual(); ctx.save(); ctx.imageSmoothingEnabled = true;
    let n = 0; for (const [b, fn] of STATUS) if (bits & b) { fn(ctx, x, y, hh, tn); if (++n > q + 1) break; } // Low shows the first status only
    ctx.restore();
  }
  // my own active buffs: a see-through barrier, wind at the feet, a veil — small and faint so the hero stays visible
  function buffs(ctx, x, y, list, tn) {
    if (!list || !list.length) return;
    let shield = false, wind = false, veil = false, bless = false;
    const now = performance.now();
    for (const b of list) { if (b._e == null) b._e = now + (b.ms || 0); if (b._e < now) continue; const id = b.id || ''; if (id === 'bulwark' || id === 'repair' || id.startsWith('barrier')) shield = true; else if (id === 'windstep') wind = true; else if (id === 'veil') veil = true; else if (id === 'bless') bless = true; }
    if (!(shield || wind || veil || bless)) return;
    ctx.save(); ctx.imageSmoothingEnabled = true;
    if (shield) { const c = tinted('shell', '#3a78e0'); if (c) { ctx.globalAlpha = 0.22 + Math.sin(tn * 3) * 0.05; ctx.drawImage(c, x - 22, y - 46, 44, 50); } }
    if (wind) for (let j = 0; j < 2; j++) { const ph = (tn * 1.6 + j * 0.5) % 1; mini(ctx, 'streak', '#30b050', x - 12 + ph * 24, y - 2 - j * 6, 10, 0.5 * (1 - ph)); }
    if (bless) { const ph = (tn * 0.6) % 1; mini(ctx, 'starlight', '#f0c040', x + Math.sin(tn * 2) * 10, y - 8 - ph * 36, 7, 0.7 * (1 - ph)); }
    if (veil) { const ph = (tn * 0.8) % 1; mini(ctx, 'smoke', '#2a1438', x + Math.sin(tn * 2.3) * 8, y - 6 - ph * 14, 22, 0.4 * (1 - ph)); }
    ctx.restore();
  }
  return {
    init(h) { H = Object.assign(H, h); preload(); },
    bind(map) { BIND = map || {}; },
    of: s => BIND[s] || null,
    attack: wt => VFX_ATTACK[wt] || 'atk.sword', attackProj: wt => VFX_ATTACK_PROJ[wt] || '',
    play, drawGround: ctx => drawAll(ctx, true), draw: ctx => drawAll(ctx, false), frame() { stN = 0; },
    status, buffs, active: () => live.length, cap, quality: qual, DEF: VFX_DEF, TEX: VFX_TEX,
    log: LOG,
    stats: () => ({ live: live.length, pool: pool.length, tints: TINT.size, cap: cap() }),
  };
})();
