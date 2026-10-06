'use strict';
// ============================================================ LUMIRA ONLINE — layered characters (paperdoll)
// Players and NPCs are drawn from layer sheets made by tools/art (assets/characters/chars.json):
// base body -> armor -> class gear -> hair -> weapon / shield -> headgear, with back items behind (or in front
// when seen from behind). Every layer shares the same frames and pivot, so equipment always sits right.
// If a sheet isn't loaded yet, drawHero() falls back to the older sprite renderer for that frame.
let CHR = null;
(function loadChr() { fetch('assets/characters/chars.json').then(r => r.json()).then(m => { CHR = m; }).catch(() => setTimeout(loadChr, 3000)); })();
const PD_ROWS = ['N', 'W', 'S', 'E'];
// armor item -> armor look (tunic colour comes from the outfit colour chosen at creation)
const ARMOR_LOOK = { 30: 'tunic', 300: 'tunic', 31: 'leather', 302: 'leather', 306: 'leather', 310: 'leather', 303: 'chain', 307: 'chain', 304: 'plate', 309: 'plate', 311: 'plate', 301: 'robe_blue', 305: 'robe_violet', 308: 'robe_ivory' };
const BY_TYPE = { light: 'leather', medium: 'chain', heavy: 'plate', robe: 'robe_blue' };
const ONE_HAND = { sword: 1, mace: 1, dagger: 1, wand: 1 };
// what layers a character wears. look: {sex, hair, hc, cc}; gear: {wpn, arm, head, cls} (item ids / class id)
// NPC looks may name an outfit / weapon type / shield / back item / head visual directly.
function paperLayers(look, gear) {
  if (!CHR) return null;
  const sx = look && look.sex ? 'female' : 'male', L = {};
  L.base = 'chr_base_' + sx;
  const tunic = 'tunic_' + CHR.tunic[((look && look.cc) | 0) % CHR.tunic.length];
  if (look && look.outfit) L.armor = 'npc_outfit_' + look.outfit + '_' + sx;
  else if (look && look.arm) L.armor = 'eq_armor_' + (look.arm === 'tunic' ? tunic : look.arm) + '_' + sx; // NPC: armor look by name
  else { const it = gear.arm && ITEMS[gear.arm]; let a = it ? ARMOR_LOOK[it.id] || it.av || BY_TYPE[it.at] || 'tunic' : 'tunic'; if (a === 'tunic') a = tunic; L.armor = 'eq_armor_' + a + '_' + sx; }
  const cls = (look && look.cls) || gear.cls || (look && look.outfit ? null : 'adventurer');
  if (cls) L.class = 'chr_class_' + cls + '_' + sx;
  const wt = (look && look.wpn) || (gear.wpn && ITEMS[gear.wpn] && ITEMS[gear.wpn].wt) || null;
  if (wt && CHR.weapons.includes(wt)) L.weapon = 'eq_weapon_' + wt;
  const shield = (look && look.shield) || (cls === 'vanguard' && ONE_HAND[wt] ? 'kite' : null);
  if (shield) L.shield = 'eq_shield_' + shield;
  const back = (look && look.back) || (cls === 'ranger' || wt === 'bow' ? 'ranger' : cls === 'adventurer' ? 'adventurer' : null);
  if (back) L.back = 'chr_back_' + back + '_' + sx;
  L.hair = 'chr_hair_' + (CHR.hair[(look && look.hair) | 0] || CHR.hair[0]);
  const vis = typeof gear.head === 'string' ? gear.head : (gear.head && ITEMS[gear.head] && ITEMS[gear.head].vis) || (look && look.head) || '';
  if (vis && CHR.headgear.includes(vis)) L.head = 'eq_head_' + vis;
  return L;
}
// hair sheets are drawn in a key ramp; recolour them to the player's hair colour (cached per sheet + colour)
const pdTint = {};
function pdImage(name, group, hc) {
  const path = CHR.layers[name]; if (!path) return null;
  const im = img(path + '_' + group); if (!im || !hc) return im;
  const key = name + group + hc; if (pdTint[key]) return pdTint[key];
  const c = mkCanvas(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data, from = CHR.keys.hair.map(hex), to = HAIR_COL[hc].map(hex), map = new Map();
  from.forEach((col, i) => map.set((col[0] << 16) | (col[1] << 8) | col[2], to[Math.min(to.length - 1, i)]));
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const t = map.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); if (t) { d[i] = t[0]; d[i + 1] = t[1]; d[i + 2] = t[2]; } }
  g.putImageData(id, 0, 0); return (pdTint[key] = c);
}
// game animation names -> paperdoll animation + frame
function pdFrame(anim, tt) {
  const A = CHR.anims, map = { stand: 'idle', idle: 'idle', walk: 'walk', atk: 'attack', attack: 'attack', cast: 'cast', hurt: 'death', death: 'death', hit: 'hit', sit: 'sit', interact: 'interact' };
  const an = map[anim] || 'idle', a = A[an];
  let f;
  if (an === 'walk' || an === 'idle' || an === 'interact') f = Math.floor(tt * a.fps) % a.n;
  else if (an === 'attack' || an === 'cast') f = Math.min(a.n - 1, Math.floor(tt * (a.n / 0.45)));
  else f = Math.min(a.n - 1, Math.floor(tt * a.fps));
  return [an, Math.max(0, f)];
}
// draw one character; returns false if something isn't loaded yet (caller uses the old renderer meanwhile)
function drawPaper(look, gear, anim, tt, row, x, y, alpha = 1, g = ctx, scale = 1) {
  const L = paperLayers(look, gear); if (!L) return false;
  const [an, f] = pdFrame(anim, tt), A = CHR.anims[an], grp = A.group, G = CHR.groups[grp];
  const dir = PD_ROWS[row] || 'S', view = dir === 'W' ? 'E' : dir, k = G.index[an][view] + f, F = CHR.frame;
  const sx = (k % G.cols) * F, sy = Math.floor(k / G.cols) * F;
  const ims = [];
  for (const part of CHR.order[view]) { const nm = L[part]; if (!nm) continue; const im = pdImage(nm, grp, part === 'hair' ? (look && look.hc) | 0 : 0); if (!im) return false; ims.push(im); }
  g.save(); g.translate(Math.round(x), Math.round(y));
  if (scale !== 1) g.scale(scale, scale);
  if (dir === 'W') g.scale(-1, 1);
  if (alpha < 1) g.globalAlpha = alpha;
  for (const im of ims) g.drawImage(im, sx, sy, F, F, -32, -60, F, F);
  g.restore();
  return true;
}
