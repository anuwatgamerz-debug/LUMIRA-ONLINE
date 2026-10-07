'use strict';
// ============================================================ ELYNDRA ONLINE — layered characters (paperdoll)
// Players and NPCs are drawn from layer sheets made by tools/art. Two sets share one renderer:
//   v1  assets/characters/chars.json  64x64 frames, ~42px characters (every look)
//   hd  assets/chr_hd/chars.json      64x80 frames, ~50px HD characters (prototype looks; tools/art/build_characters_hd.py)
// Layers (same frames, pivot and timing): base -> face -> armor/clothes -> class gear -> costume -> hair -> weapon /
// shield -> headgear, back items behind (or over the back in the N view); aura is drawn by the engine.
// A character is drawn in HD only when every layer it needs exists in the HD set (never half HD, half v1), and
// when the "HD characters" setting is on. Anything not loaded yet falls back to v1, then to the old sprites.
let CHR = null, CHRHD = null, CHRLPC = null;
(function loadChr() { fetch('assets/characters/chars.json').then(r => r.json()).then(m => { CHR = m; }).catch(() => setTimeout(loadChr, 3000)); })();
(function loadLpc() { fetch('assets/chr_lpc/chars.json').then(r => r.json()).then(m => { CHRLPC = m; }).catch(() => setTimeout(loadLpc, 3000)); })();
(function loadHd() { fetch('assets/chr_hd/chars.json').then(r => r.json()).then(m => { CHRHD = m; }).catch(() => setTimeout(loadHd, 3000)); })();
const PD_ROWS = ['N', 'W', 'S', 'E'];
// armor item -> armor look (tunic colour comes from the outfit colour chosen at creation)
const ARMOR_LOOK = { 30: 'tunic', 300: 'tunic', 31: 'leather', 302: 'leather', 306: 'leather', 310: 'leather', 303: 'chain', 307: 'chain', 304: 'plate', 309: 'plate', 311: 'plate', 301: 'robe_blue', 305: 'robe_violet', 308: 'robe_ivory' };
const BY_TYPE = { light: 'leather', medium: 'chain', heavy: 'plate', robe: 'robe_blue' };
const ONE_HAND = { sword: 1, mace: 1, dagger: 1, wand: 1 };
const CLS_BASE = { knight: 'vanguard', berserker: 'vanguard', sharpshooter: 'ranger', beasthunter: 'ranger', elementalist: 'arcanist', warlock: 'arcanist', priest: 'cleric', oracle: 'cleric', assassin: 'rogue', shadowdancer: 'rogue', alchemist: 'artisan', machinist: 'artisan',
  aegis: 'vanguard', warbringer: 'vanguard', skypiercer: 'ranger', wildlord: 'ranger', prismsage: 'arcanist', voidcaller: 'arcanist', luminary: 'cleric', fateweaver: 'cleric', nightblade: 'rogue', eclipse: 'rogue', transmuter: 'artisan', artificer: 'artisan' };
function hdWanted() { return !(typeof HUD !== 'undefined' && HUD.S && HUD.S.chrHD === false) && !/[?&]chr=v1\b/.test(location.search); }
// what layers a character wears in set S. look: {sex, hair, hc, cc}; gear: {wpn, arm, head, cls} (item ids / class id)
// NPC looks may name an outfit / weapon type / shield / back item / head visual / costume directly.
// strict (HD): returns null if any wanted layer is missing from the set, so the whole character falls back.
function paperLayers(look, gear, S = CHR, strict = false) {
  if (!S) return null;
  look = look || {}; gear = gear || {};
  const sx = look.sex ? 'female' : 'male', L = {};
  let miss = false;
  const pick = n => S.layers[n] ? n : S.layers[n + '_' + sx] ? n + '_' + sx : (miss = true, null);
  L.base = pick('chr_base_' + sx);
  if (S.set === 'hd') L.face = pick('chr_face_' + sx);
  const tunic = 'tunic_' + S.tunic[(look.cc | 0) % S.tunic.length];
  if (look.outfit) L.armor = pick('npc_outfit_' + look.outfit + '_' + sx);
  else if (look.arm) L.armor = pick('eq_armor_' + (look.arm === 'tunic' ? tunic : look.arm) + '_' + sx); // NPC: armor look by name
  else { const it = gear.arm && ITEMS[gear.arm]; let a = it ? ARMOR_LOOK[it.id] || it.av || BY_TYPE[it.at] || 'tunic' : 'tunic'; if (a === 'tunic') a = tunic; L.armor = pick('eq_armor_' + a + '_' + sx); }
  // second / third classes wear their first-class outfit until they get art of their own
  const cls0 = look.cls || gear.cls || (look.outfit ? null : 'adventurer'), cls = CLS_BASE[cls0] || cls0;
  if (cls) L.class = pick('chr_class_' + cls + '_' + sx);
  const wt = look.wpn || (gear.wpn && ITEMS[gear.wpn] && ITEMS[gear.wpn].wt) || null;
  if (wt) { if (S.weapons.includes(wt)) L.weapon = pick('eq_weapon_' + wt); else miss = true; }
  const shield = look.shield || (cls === 'vanguard' && cls0 !== 'berserker' && ONE_HAND[wt] ? 'kite' : null);
  if (shield) L.shield = pick('eq_shield_' + shield);
  const back = look.back || (cls === 'ranger' || wt === 'bow' ? 'ranger' : cls === 'adventurer' ? 'adventurer' : null);
  if (back) L.back = pick('chr_back_' + back + '_' + sx);
  L.hair = pick('chr_hair_' + (S.hair[look.hair | 0] || S.hair[0]));
  const vis = typeof gear.head === 'string' ? gear.head : (gear.head && ITEMS[gear.head] && ITEMS[gear.head].vis) || look.head || '';
  if (vis) { if (S.headgear.includes(vis)) L.head = pick('eq_head_' + vis); else miss = true; }
  const cos = look.costume || gear.costume;
  if (cos) L.costume = pick('costume_' + cos + '_' + sx);
  if (strict && miss) return null;
  for (const k in L) if (!L[k]) delete L[k];
  L._wt = wt;
  return L;
}
// hair (and HD brows) are drawn in a key ramp; recolour them to the hair colour (cached per sheet + colour)
const pdTint = {};
function pdImage(S, name, group, hc) {
  const path = S.layers[name]; if (!path) return null;
  const im = img(path + '_' + group); if (!im || !hc) return im;
  const key = S.set + name + group + hc; if (pdTint[key]) return pdTint[key];
  const c = mkCanvas(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data, from = S.keys.hair.map(hex), to = HAIR_COL[hc].map(hex), map = new Map();
  from.forEach((col, i) => map.set((col[0] << 16) | (col[1] << 8) | col[2], to[Math.min(to.length - 1, i)]));
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const t = map.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); if (t) { d[i] = t[0]; d[i + 1] = t[1]; d[i + 2] = t[2]; } }
  g.putImageData(id, 0, 0); return (pdTint[key] = c);
}
// game animation names -> paperdoll animation + frame (timing comes from the set's manifest)
function pdFrame(S, anim, tt) {
  const A = S.anims, map = { stand: 'idle', idle: 'idle', walk: 'walk', run: 'walk', atk: 'attack', attack: 'attack', cast: 'cast', hurt: 'death', death: 'death', hit: 'hit', sit: 'sit', interact: 'interact' };
  const an = map[anim] || 'idle', a = A[an];
  let f;
  if (an === 'walk' || an === 'idle' || an === 'interact') f = Math.floor(tt * (anim === 'run' ? A.run.fps : a.fps)) % a.n;
  else if (an === 'attack' || an === 'cast') f = Math.min(a.n - 1, Math.floor(tt * (a.n / 0.45)));
  else f = Math.min(a.n - 1, Math.floor(tt * a.fps));
  return [an, Math.max(0, f)];
}
// draw one character from set S; false if a sheet isn't loaded yet
function pdDraw(S, L, look, anim, tt, row, x, y, alpha, g, scale) {
  const [an, f] = pdFrame(S, anim, tt), A = S.anims[an], grp = A.group, G = S.groups[grp];
  const dir = PD_ROWS[row] || 'S', view = dir === 'W' ? 'E' : dir, k = G.index[an][view] + f;
  const fw = Array.isArray(S.frame) ? S.frame[0] : S.frame, fh = Array.isArray(S.frame) ? S.frame[1] : S.frame;
  const px = S.pivot[0], py = S.pivot[1] + 2; // feet land 2px above y, like the older sprites
  const sx = (k % G.cols) * fw, sy = Math.floor(k / G.cols) * fh;
  const bow = L._wt && S.variants && S.variants[L._wt] && S.variants[L._wt][grp]; // weapon-specific pose group (bow draw, spear thrust ...)
  const tint = S.tint || ['hair'];
  const ims = [];
  for (const part of S.order[view]) {
    const nm = L[part]; if (!nm) continue;
    const gg = bow && S.bowGroups.includes(nm) ? bow : grp;
    const im = pdImage(S, nm, gg, tint.includes(part) ? look.hc | 0 : 0); if (!im) return false; ims.push(im);
  }
  g.save(); g.translate(Math.round(x), Math.round(y));
  if (scale !== 1) g.scale(scale, scale);
  if (dir === 'W') g.scale(-1, 1);
  if (alpha < 1) g.globalAlpha = alpha;
  for (const im of ims) g.drawImage(im, sx, sy, fw, fh, -px, -py, fw, fh);
  g.restore();
  return true;
}
let lastPaperSet = null;
// draw one character; returns false if nothing could be drawn yet (caller uses the old renderer meanwhile)
function drawPaper(look, gear, anim, tt, row, x, y, alpha = 1, g = ctx, scale = 1) {
  look = look || {};
  if (CHRLPC && hdWanted()) { // LPC set (Liberated Pixel Cup art): preferred whenever every layer exists
    const L = paperLayers(look, gear, CHRLPC, true);
    if (L && pdDraw(CHRLPC, L, look, anim, tt, row, x, y, alpha, g, scale)) { lastPaperSet = 'lpc'; return true; }
  }
  if (CHRHD && hdWanted()) {
    const L = paperLayers(look, gear, CHRHD, true);
    if (L && pdDraw(CHRHD, L, look, anim, tt, row, x, y, alpha, g, scale)) { lastPaperSet = 'hd'; return true; }
  }
  const L = paperLayers(look, gear, CHR); if (!L) return false;
  if (pdDraw(CHR, L, look, anim, tt, row, x, y, alpha, g, scale)) { lastPaperSet = 'v1'; return true; }
  return false;
}
// how far above the feet the top of a drawn character is (for badges, bubbles, level-up text)
function heroTopOf(set, vis) {
  const tall = { wizard: 16, witch: 14, knight: 10, party: 10, traveler: 6, jelcrown: 6, ironcrown: 6, cap: 4, iron: 4, hood_green: 4, hood: 4 };
  return set === 'hd' ? 58 + (tall[vis] || 0) : set === 'lpc' ? 50 + (tall[vis] || 0) : 46 + (tall[vis] || 0);
}
// aura layer (engine-drawn, so it never bakes glow into sprites): soft ring on the ground + slow rising motes
function drawAura(g, x, y, col, t, front) {
  const c = col || '#8fd0ff';
  g.save(); g.globalAlpha = front ? 0.8 : 0.35;
  if (!front) { g.fillStyle = c; for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283; g.fillRect(Math.round(x + Math.cos(a) * 13), Math.round(y - 2 + Math.sin(a) * 5), 1, 1); } }
  else for (let i = 0; i < 5; i++) { const ph = (t * 0.5 + i / 5) % 1; g.globalAlpha = (1 - ph) * 0.8; g.fillStyle = i % 2 ? c : '#ffffff'; g.fillRect(Math.round(x + Math.sin(i * 2.4 + t) * 10), Math.round(y - 8 - ph * 44), 1, 2); }
  g.restore();
}
