'use strict';
// ============================================================ LUMIRA ONLINE — world visuals
// Monster sprite variants (recoloured / resized sheets and small procedural sprites), the character paperdoll
// (hair colour, hair style, headgear following the head in 4 directions), map nodes, environments and NPC looks.
// Shares globals with game.js (META, IMG, img, drawChar, ctx, TP ...).

// ------------------------------------------------------------ pixel helpers
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }
function hsl2rgb(h, s, l) { h = ((h % 360) + 360) % 360 / 360; if (!s) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = t => { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p); }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)]; }
const isCanvas = o => !!(o && o.getContext);
// copy of a loaded sheet with every colour shifted: [hue degrees, saturation x, lightness +%]. Outlines stay dark.
function tintSheet(im, [dh, sm, dl]) {
  const c = mkCanvas(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data, memo = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; let o = memo.get(k);
    if (!o) { const [h, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]); o = l < 0.1 ? [d[i], d[i + 1], d[i + 2]] : hsl2rgb(h + dh, Math.min(1, s * sm), Math.max(0, Math.min(1, l + dl / 100))); memo.set(k, o); }
    d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2];
  }
  g.putImageData(id, 0, 0); return c;
}

// ------------------------------------------------------------ monster sprites
// MOBN[type] carries spr/tint/scale from the server. Legacy monsters keep their own m_<type> sheet.
const mobSheetReady = {};
function mobSprite(type) {
  const info = MOBN[type]; if (!info || !info.spr) return 'm_' + type;
  const nm = 'mt_' + type; if (mobSheetReady[nm]) return nm;
  if (info.spr.startsWith('proc:')) { buildProc(nm, info.spr.slice(5), info.tint); mobSheetReady[nm] = 1; return nm; }
  const base = info.spr, im = img(base), L = META.lpc[base], P = META.px[base];
  if (!im || (!L && !P)) return null;
  IMG[nm] = info.tint ? tintSheet(im, info.tint) : im;
  if (L) META.lpc[nm] = L; else META.px[nm] = P;
  mobSheetReady[nm] = 1; return nm;
}
const mobScale = type => (MOBN[type] && MOBN[type].scale) || 1;
const mobBig = type => { const i = MOBN[type]; return !!i && (i.boss || i.size === 'l' || (i.scale || 1) >= 1.6); };

// procedural sheets in the px layout (22 frames x 4 directions, 64x64, feet at y 43)
const PROC_ANIMS = { idle: [0, 4, 5, 1], walk: [4, 6, 9, 1], atk: [10, 5, 11, 0], hit: [15, 2, 8, 0], die: [17, 5, 9, 0] };
function buildProc(nm, kind, tint) {
  const W = 64, c = mkCanvas(22 * W, 4 * W), g = c.getContext('2d');
  const fn = PROC[kind] || PROC.wisp;
  for (let row = 0; row < 4; row++) for (const [an, [c0, n]] of Object.entries(PROC_ANIMS)) for (let f = 0; f < n; f++) {
    g.save(); g.translate((c0 + f) * W, row * W);
    if (an === 'die') g.globalAlpha = 1 - f / n;
    fn(g, { an, f, n, row, t: f / n });
    g.restore();
  }
  IMG[nm] = tint && (tint[0] || tint[1] !== 1 || tint[2]) ? tintSheet(c, tint) : c;
  META.px[nm] = { fw: 64, fh: 64, ax: 32, ay: 43, dirs: 4, anims: PROC_ANIMS };
}
const R = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
function disc(g, cx, cy, r, col, ry) { g.fillStyle = col; ry = ry || r; for (let y = -ry; y <= ry; y++) { const w = Math.round(r * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.3)) ** 2))); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } }
const PROC = {
  wisp(g, { an, f, row, t }) { // floating spirit flame
    const bob = Math.round(Math.sin(t * Math.PI * 2) * 2) - (an === 'atk' ? 3 : 0), y = 28 + bob;
    disc(g, 32, y + 4, 9, 'rgba(120,255,170,0.18)');
    for (let i = 0; i < 4; i++) disc(g, 32 + Math.sin(t * 6 + i) * 2, y + 9 + i * 3, 4 - i, i % 2 ? '#3fbf6f' : '#6fe39a');
    disc(g, 32, y, 7, '#2a8f55'); disc(g, 32, y - 1, 6, '#5fe08d'); disc(g, 31, y - 2, 4, '#b8ffd0'); disc(g, 31, y - 3, 2, '#ffffff');
    if (row !== 0) { R(g, 28, y - 1, 2, 2, '#0d3a22'); R(g, 34, y - 1, 2, 2, '#0d3a22'); }
    if (an === 'hit') g.globalAlpha = 0.6;
  },
  moth(g, { an, f, row, t }) {
    const flap = Math.sin(t * Math.PI * 2 * (an === 'walk' ? 2 : 1)), y = 26 + Math.round(Math.sin(t * Math.PI * 2) * 2);
    const span = 10 + Math.round(flap * 4);
    for (const s of [-1, 1]) { disc(g, 32 + s * span * 0.7, y - 2, Math.max(3, Math.round(span * 0.6)), '#8a6fd0', 6); disc(g, 32 + s * span * 0.7, y - 2, Math.max(2, Math.round(span * 0.35)), '#d9c4ff', 3); disc(g, 32 + s * span * 0.55, y + 5, 4, '#6b52b0', 3); }
    disc(g, 32, y, 3, '#3a2a5a', 7); R(g, 31, y - 9, 1, 3, '#3a2a5a'); R(g, 33, y - 9, 1, 3, '#3a2a5a');
    if (row !== 0) { R(g, 30, y - 5, 1, 1, '#ffe36b'); R(g, 33, y - 5, 1, 1, '#ffe36b'); }
    disc(g, 32, 42, 6, 'rgba(0,0,0,0.15)', 2);
  },
  bat(g, { an, f, row, t }) {
    const flap = Math.sin(t * Math.PI * 2 * 2), y = 24 + Math.round(Math.sin(t * Math.PI * 2) * 3) - (an === 'atk' ? 2 : 0);
    for (const s of [-1, 1]) for (let i = 0; i < 12; i++) { const x = 32 + s * (4 + i), yy = y - 2 + Math.round(flap * i * 0.5) + (i % 4 === 3 ? 2 : 0); R(g, x, yy, 1, 5 - Math.floor(i / 4), '#3b2f4a'); R(g, x, yy, 1, 1, '#6a5585'); }
    disc(g, 32, y, 4, '#2a2035', 5); R(g, 29, y - 7, 2, 3, '#2a2035'); R(g, 33, y - 7, 2, 3, '#2a2035');
    if (row !== 0) { R(g, 30, y - 2, 1, 1, '#ff4d4d'); R(g, 33, y - 2, 1, 1, '#ff4d4d'); R(g, 31, y + 2, 2, 1, '#e8e8e8'); }
    disc(g, 32, 42, 5, 'rgba(0,0,0,0.15)', 2);
  },
  golem(g, { an, f, row, t }) { // rock / rusty machine blob
    const step = an === 'walk' ? Math.round(Math.sin(t * Math.PI * 2) * 1.5) : 0, y = 30 - (an === 'atk' ? Math.round(Math.sin(t * Math.PI) * 4) : 0);
    R(g, 23, 38 + step, 6, 5, '#5b5b66'); R(g, 35, 38 - step, 6, 5, '#5b5b66');
    disc(g, 32, y, 12, '#3c3c46', 10); disc(g, 32, y - 1, 11, '#6e6e7c', 9); disc(g, 30, y - 3, 7, '#8a8a98', 5);
    for (const [a, b] of [[25, y - 4], [37, y + 2], [30, y + 5], [36, y - 6]]) R(g, a, b, 3, 2, '#4a4a55');
    const arm = an === 'atk' ? -6 * Math.sin(t * Math.PI) : 0;
    R(g, 18, y - 2 + arm, 5, 8, '#55555f'); R(g, 41, y - 2 + arm, 5, 8, '#55555f');
    if (row !== 0) { R(g, row === 1 ? 26 : row === 3 ? 31 : 27, y - 3, 3, 2, '#7ff3ff'); if (row === 2) R(g, 34, y - 3, 3, 2, '#7ff3ff'); }
  },
  wolf(g, { an, f, row, t }) {
    const side = row === 1 || row === 3, dir = row === 1 ? -1 : 1, leg = an === 'walk' ? Math.sin(t * Math.PI * 2) * 3 : 0, lunge = an === 'atk' ? Math.sin(t * Math.PI) * 5 : 0;
    const body = '#4f7a3a', dark = '#2f4d23', light = '#7fae5c';
    if (side) {
      const x0 = 32 + lunge * dir;
      for (const [lx, ph] of [[-8, 1], [-4, -1], [5, 1], [9, -1]]) R(g, x0 + lx * dir, 34, 3, 9 + Math.round(leg * ph * 0.4), dark);
      disc(g, x0, 30, 11, body, 6); disc(g, x0 - 1 * dir, 28, 8, light, 3);
      disc(g, x0 + 12 * dir, 25, 5, body, 5); R(g, x0 + 15 * dir - (dir < 0 ? 4 : 0), 26, 5, 3, body); R(g, x0 + 10 * dir, 18, 2, 4, dark); R(g, x0 + 13 * dir, 18, 2, 4, dark);
      R(g, x0 + 13 * dir, 24, 2, 1, '#ffe36b'); R(g, x0 - 13 * dir - (dir < 0 ? 0 : 5), 26, 6, 2, dark);
    } else {
      R(g, 25, 34 + leg, 3, 8, dark); R(g, 36, 34 - leg, 3, 8, dark); disc(g, 32, 31, 9, body, 8); disc(g, 32, 29, 6, light, 4);
      if (row === 2) { disc(g, 32, 22 + lunge * 0.3, 7, body, 6); R(g, 26, 14, 3, 5, dark); R(g, 35, 14, 3, 5, dark); R(g, 29, 21, 2, 2, '#ffe36b'); R(g, 34, 21, 2, 2, '#ffe36b'); R(g, 30, 26, 4, 2, '#1a1a1a'); }
      else { disc(g, 32, 22, 7, dark, 6); R(g, 26, 14, 3, 5, dark); R(g, 35, 14, 3, 5, dark); R(g, 31, 38, 2, 7, dark); }
    }
  },
  dummy(g, { an, f }) { // straw archery target on a post
    const wob = an === 'hit' ? (f % 2 ? 2 : -2) : 0;
    R(g, 31, 26, 3, 18, '#7a5130'); R(g, 31, 26, 1, 18, '#a0703f');
    disc(g, 32 + wob, 22, 10, '#d9c27a', 10); disc(g, 32 + wob, 22, 8, '#e5484d'); disc(g, 32 + wob, 22, 6, '#f2efe6'); disc(g, 32 + wob, 22, 4, '#e5484d'); disc(g, 32 + wob, 22, 2, '#ffd34d');
  },
};

// ------------------------------------------------------------ character paperdoll
// head anchors (top of the head + centre) per animation frame, scanned once from the bare-headed knight
// sheet of the same body type; every hero sheet shares the LPC body layout, so they line up.
const ANCH = {};
function anchorsFor(sex) {
  const donor = 'h_knight_' + (sex ? 'f' : 'm'); if (ANCH[donor]) return ANCH[donor];
  const L = META.lpc[donor], im = img(donor); if (!L || !im) return null;
  const c = L.cell, o = (c - 64) / 2, cv2 = mkCanvas(im.width, im.height), g = cv2.getContext('2d'); g.drawImage(im, 0, 0);
  const data = g.getImageData(0, 0, im.width, im.height).data, W = im.width;
  const A = {};
  const scan = (fx, fy) => {
    for (let y = 0; y < 44; y++) {
      let n = 0, sx = 0;
      for (let x = 22; x < 42; x++) { if (data[((fy + o + y) * W + fx + o + x) * 4 + 3] > 40) { n++; sx += x; } }
      if (n >= 3) { let n2 = 0, s2 = 0; for (let yy = y; yy < y + 5; yy++) for (let x = 20; x < 44; x++) if (data[((fy + o + yy) * W + fx + o + x) * 4 + 3] > 40) { n2++; s2 += x; } return [Math.round(s2 / n2 - 32), y]; }
    }
    return null;
  };
  for (const [key, [r0, n, rows]] of Object.entries(L.anims)) {
    A[key] = [];
    for (let r = 0; r < (rows === 1 ? 1 : 4); r++) { A[key][r] = []; for (let f = 0; f < n; f++) A[key][r][f] = scan(f * c, (r0 + r) * c); }
  }
  // frames where a weapon swings over the head: fall back to the standing frame of that direction
  for (const key in A) if (key !== 'walk' && key !== 'hurt') for (let r = 0; r < A[key].length; r++) for (let f = 0; f < A[key][r].length; f++) {
    const w = A.walk[r] && A.walk[r][0], v = A[key][r][f]; if (!v || (w && Math.abs(v[1] - w[1]) > 3)) A[key][r][f] = w;
  }
  return (ANCH[donor] = A);
}
// which anchor to use for a drawChar() call on a hero sheet: mirrors the frame choice in drawChar
function headAnchor(name, anim, tt, row, sex) {
  const A = anchorsFor(sex), L = META.lpc[name]; if (!A || !L) return null;
  let key = anim === 'atk' ? L.atk : anim, f = 0, a = L.anims[key] || L.anims.walk;
  if (key === 'walk') f = 1 + (Math.floor(tt * 10) % 8);
  else if (anim === 'stand') { key = 'walk'; f = 0; }
  else if (key === 'idle') f = Math.floor(tt * 1.6) % a[1];
  else if (key === 'hurt') f = Math.min(a[1] - 1, Math.floor(tt * 10));
  else f = Math.min(a[1] - 1, Math.floor(tt * (a[1] / 0.45)));
  const set = A[key] || A.walk, r = (set.length === 1) ? 0 : row;
  const v = set[r] && (set[r][f] || set[r][0]); return v || (A.walk[row] && A.walk[row][0]);
}
// hair colours (index 1-8; 0 = the sheet's own colour) as 4-step ramps dark -> light
const HAIR_COL = [null, ['#121018', '#24202e', '#3a3446', '#5a5268'], ['#3a1c0c', '#6b3417', '#94512a', '#b8743f'], ['#8a5a14', '#d1a03a', '#f2cf66', '#fff0a6'],
  ['#5a5e6e', '#9aa0b4', '#cfd4e2', '#f4f6fb'], ['#5a0d14', '#9e1b24', '#d23a3a', '#ff7a6b'], ['#0d2a5a', '#1d5aa8', '#3f8fe0', '#8fd0ff'], ['#2c1250', '#5a2a96', '#8a52d0', '#c49bff'], ['#0d3a24', '#1d6b3f', '#36a35f', '#7fe0a0']];
const HAIR_TH = ['ธรรมชาติ', 'ดำ', 'น้ำตาลเกาลัด', 'บลอนด์', 'เงิน', 'แดงเพลิง', 'ฟ้าคราม', 'ม่วง', 'เขียวมรกต'];
const HAIR_STYLE_TH = ['ทรงเดิม', 'ชี้ฟู', 'หางม้า', 'ผมยาว', 'แกละคู่', 'มวยผม'];
// the hair colours baked into the bare-headed sheets (dark -> light), recoloured inside the head area only
const SHEET_HAIR = {
  h_knight_m: ['#3a130e', '#63200b', '#81310a', '#b6550e', '#d28102'], h_knight_f: ['#552b15', '#ac5d1f', '#e09e2b', '#fccf56', '#ffe67d'],
  h_rogue_m: ['#160701', '#290e02', '#421603', '#5f1f04', '#792806'], h_rogue_f: ['#101414', '#1c2222', '#4a4a57', '#4a5057'],
};
const NATURAL_HAIR = { h_knight_m: 2, h_knight_f: 3, h_rogue_m: 1, h_rogue_f: 1, h_mage_m: 4, h_mage_f: 3, h_hood_m: 1, h_hood_f: 1, h_barb_m: 2, h_barb_f: 2 };
const HAT_OUTFIT = { mage: 1, hood: 1, barb: 1 }; // outfits whose sprite already wears something on the head
function heroSheet(look) {
  const base = heroOf(look), hc = (look && look.hc) | 0;
  if (!hc || !SHEET_HAIR[base]) return base;
  const nm = base + '_hc' + hc; if (META.lpc[nm] && IMG[nm]) return nm;
  const im = img(base), L = META.lpc[base], A = anchorsFor(look.sex); if (!im || !L || !A) return base;
  const c = mkCanvas(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data, W = c.width;
  const from = SHEET_HAIR[base].map(hex), to = HAIR_COL[hc].map(hex), map = new Map();
  from.forEach((col, i) => map.set((col[0] << 16) | (col[1] << 8) | col[2], to[Math.min(to.length - 1, Math.round(i * (to.length - 1) / Math.max(1, from.length - 1)))]));
  const cell = L.cell, o = (cell - 64) / 2;
  for (const [key, [r0, n, rows]] of Object.entries(L.anims)) for (let r = 0; r < (rows === 1 ? 1 : 4); r++) for (let f = 0; f < n; f++) {
    const set = A[key] || A.walk, an = (set[rows === 1 ? 0 : r] && set[rows === 1 ? 0 : r][f]) || (A.walk[r] && A.walk[r][0]); if (!an) continue;
    const top = an[1], fx = f * cell + o, fy = (r0 + r) * cell + o;
    for (let y = Math.max(0, top - 2); y < Math.min(64, top + (key === 'hurt' ? 30 : 19)); y++) for (let x = 12; x < 52; x++) {
      const i = ((fy + y) * W + fx + x) * 4; if (!d[i + 3]) continue;
      const t = map.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); if (t) { d[i] = t[0]; d[i + 1] = t[1]; d[i + 2] = t[2]; }
    }
  }
  g.putImageData(id, 0, 0); IMG[nm] = c; META.lpc[nm] = L; return nm;
}
const hairRamp = look => HAIR_COL[(look && look.hc) | 0] || HAIR_COL[NATURAL_HAIR[heroOf(look)] || 2];
// hair styles drawn over the head (row: 0 N back, 1 W, 2 S front, 3 E). (hx, top) = head anchor in art px.
function drawHairStyle(g, style, row, X, Y, ramp) {
  if (!style) return;
  const [k, m, l, h] = ramp, P = (x, y, w, hh, c) => R(g, X + x, Y + y, w, hh, c), side = row === 1 ? -1 : row === 3 ? 1 : 0;
  if (style === 1) { // spiky
    for (const [x, hgt] of [[-8, 3], [-4, 5], [0, 6], [4, 5], [8, 3]]) { P(x - 1, -hgt + 1, 3, hgt, k); P(x, -hgt + 1, 1, hgt - 1, m); P(x, -hgt + 2, 1, 1, l); }
  } else if (style === 2) { // ponytail at the back
    if (row === 2) { P(-11, 6, 2, 5, k); P(9, 6, 2, 5, k); }
    else { const bx = side ? -side * 9 : -2; P(bx, 2, 4, 3, k); P(bx + (side ? -side : 0), 5, 3, 12, m); P(bx + (side ? -side : 0) + 1, 6, 1, 9, l); P(bx + (side ? -side : 0), 16, 3, 2, k); P(bx + 1, 3, 2, 1, '#e5484d'); }
  } else if (style === 3) { // long hair down to the shoulders
    for (const s of side ? [-side] : [-1, 1]) { const x = s < 0 ? -12 : 9; P(x, 4, 3, 16, k); P(x + (s < 0 ? 1 : 0), 5, 2, 14, m); P(x + 1, 6, 1, 10, l); }
    if (row === 0) { P(-9, 8, 18, 12, m); P(-8, 9, 16, 9, l); P(-9, 19, 18, 2, k); }
  } else if (style === 4) { // twin tails
    for (const s of row === 1 ? [1] : row === 3 ? [-1] : [-1, 1]) { const x = s < 0 ? -15 : 11; P(x, 3, 4, 3, k); P(x, 6, 4, 11, m); P(x + 1, 7, 2, 8, l); P(x, 17, 4, 2, k); P(x + 1, 2, 2, 1, h); }
  } else if (style === 5) { // bun
    const bx = side ? -side * 4 : 0, by = row === 2 ? -4 : -3; disc(g, X + bx, Y + by, 4, k); disc(g, X + bx, Y + by, 3, m); R(g, X + bx - 1, Y + by - 2, 2, 1, l);
  }
}
// headgear art, 4 directions. Drawn around (X, Y) = head top centre. Each returns nothing; plain pixel shapes.
const HG = {
  cap: (P, row, s) => { dome(P, -2, 6, 11, '#a83232', '#d64545', '#7a1f1f'); P(-5, -2, 8, 1, '#e86060'); if (row === 2) P(-11, 6, 22, 2, '#7a1f1f'); else if (s) P(s > 0 ? 6 : -15, 6, 9, 2, '#7a1f1f'); P(-1, -3, 2, 1, '#ffd34d'); },
  straw: (P, row) => { P(-16, 4, 32, 3, '#a8803a'); P(-15, 4, 30, 1, '#e8c46a'); dome(P, -4, 5, 8, '#d9b05a', '#f2d27a', '#a8803a'); P(-8, 2, 16, 2, '#c0392b'); if (row === 2) P(-16, 6, 32, 1, '#6b4a1a'); },
  band_red: (P, row, s) => { P(-11, 6, 22, 3, '#c0392b'); P(-11, 6, 22, 1, '#e86060'); if (row === 0) { P(-2, 8, 2, 6, '#c0392b'); P(1, 8, 2, 5, '#a83232'); } else if (s) { P(-s * 11 - 1, 7, 2, 6, '#c0392b'); } },
  band_moon: (P, row, s) => { P(-11, 6, 22, 3, '#2d3a7a'); P(-11, 6, 22, 1, '#5a6fd0'); if (row === 2) { P(-2, 5, 4, 4, '#dfe9ff'); P(-1, 5, 2, 1, '#ffffff'); } if (row === 0) P(-2, 8, 3, 7, '#2d3a7a'); },
  leather: (P, row, s) => { dome(P, -2, 9, 12, '#6b4423', '#8a5a2e', '#4a2e16'); P(-12, 7, 24, 2, '#4a2e16'); if (s) P(s > 0 ? 7 : -10, 8, 3, 6, '#4a2e16'); else if (row === 2) { P(-12, 8, 2, 6, '#4a2e16'); P(10, 8, 2, 6, '#4a2e16'); } },
  iron: (P, row, s) => { dome(P, -3, 10, 12, '#7d8592', '#c0c8d4', '#4d5360'); P(-12, 8, 24, 2, '#4d5360'); P(-1, -3, 2, 12, '#5d6470'); if (row === 2) P(-1, 9, 2, 5, '#5d6470'); if (s) P(s > 0 ? 6 : -12, 9, 6, 6, '#4d5360'); if (row === 0) P(-12, 9, 24, 5, '#6b7280'); },
  wizard: (P, row, s) => { P(-15, 3, 30, 3, '#2a3a8a'); P(-14, 3, 28, 1, '#4f63c8'); for (let i = 0; i < 13; i++) { const w = Math.max(2, 14 - i); P(-Math.floor(w / 2) + (s ? s * Math.floor(i / 4) : Math.floor(i / 5)), 2 - i, w, 1, i % 4 === 0 ? '#3e52b8' : '#33449e'); } P(-8, 1, 16, 2, '#ffd34d'); },
  hood_green: (P, row, s) => { dome(P, -3, 12, 13, '#2f5d34', '#4a8a50', '#1d3d22'); if (row === 2) { P(-13, 10, 4, 9, '#2f5d34'); P(9, 10, 4, 9, '#2f5d34'); } else if (row === 0) P(-13, 10, 26, 10, '#2f5d34'); else P(s > 0 ? -13 : 3, 10, 10, 10, '#2f5d34'); },
  feather: (P, row, s) => { HG.cap(P, row, s); const fx = row === 3 ? -9 : 7; P(fx, -10, 2, 10, '#f2efe6'); P(fx + 1, -11, 2, 4, '#7fd4ff'); P(fx - 1, -6, 1, 4, '#d0d6e0'); },
  miner: (P, row, s) => { dome(P, -2, 9, 12, '#d9a520', '#f2c94c', '#8a6510'); P(-13, 7, 26, 2, '#8a6510'); if (row === 2) { P(-3, 0, 6, 5, '#5d6470'); P(-2, 1, 4, 3, '#fff6b0'); } else if (s) P(s * 9 - 2, 1, 4, 4, '#fff6b0'); },
  mask_shadow: (P, row, s) => { if (row === 0) { P(-10, 12, 20, 2, '#1a1a24'); return; } P(s ? (s > 0 ? -2 : -9) : -9, 11, s ? 11 : 18, 5, '#1a1a24'); if (row === 2) { P(-6, 12, 3, 2, '#ff4d4d'); P(3, 12, 3, 2, '#ff4d4d'); } else P(s > 0 ? 5 : -7, 12, 2, 2, '#ff4d4d'); },
  flower: (P, row) => { const cs = ['#ff6b8b', '#ffd34d', '#ffffff', '#b07bff', '#ff9a3d']; P(-10, 3, 20, 2, '#3f7a2e'); for (let i = 0; i < 6; i++) { const x = -10 + i * 4; P(x, 1 + (i % 2), 3, 3, cs[i % 5]); P(x + 1, 2 + (i % 2), 1, 1, '#fff6b0'); } },
  antler: (P, row, s) => { HG.leather(P, row, s); for (const sd of [-1, 1]) { const x = sd * 8; P(x - 1, -9, 2, 8, '#d9c4a0'); P(x + sd * 2, -8, 2, 2, '#d9c4a0'); P(x + sd * 3, -12, 2, 4, '#e8d9b8'); P(x - sd * 2, -12, 2, 3, '#e8d9b8'); } },
  ironcrown: (P, row) => { P(-10, 1, 20, 5, '#6b7280'); P(-10, 1, 20, 1, '#c8ccd4'); for (const x of [-10, -5, 0, 5]) { P(x, -4, 4, 5, '#8a909c'); P(x + 1, -5, 2, 1, '#c8ccd4'); } P(-1, 2, 3, 3, '#7a1fff'); },
  jelcrown: (P, row) => { P(-10, 0, 20, 6, '#f2c46d'); for (const x of [-10, -3, 4]) { P(x, -4, 5, 5, '#f2c46d'); P(x + 1, -5, 3, 1, '#fff0a6'); } P(-2, 2, 4, 3, '#e5484d'); P(-9, 5, 18, 1, '#b8862a'); },
  traveler: (P, row) => { P(-16, 4, 32, 3, '#5a3a20'); P(-15, 4, 30, 1, '#7a5130'); P(-9, -3, 18, 8, '#6b4423'); P(-8, -4, 16, 2, '#8a5a2e'); P(-9, 2, 18, 2, '#2d2d3a'); },
  catears: (P, row) => { for (const sd of [-1, 1]) { const x = sd > 0 ? 4 : -9; P(x, -4, 5, 5, '#2a2a33'); P(x + 1, -5, 3, 1, '#2a2a33'); P(x + 1, -3, 3, 3, row === 0 ? '#2a2a33' : '#ff9ab8'); } P(-10, 0, 20, 2, '#2a2a33'); },
  party: (P, row) => { for (let i = 0; i < 10; i++) { const w = Math.max(1, 10 - i); P(-Math.floor(w / 2), 1 - i, w, 1, i % 3 === 0 ? '#ffd34d' : i % 3 === 1 ? '#e5484d' : '#4c8ff0'); } P(-1, -10, 2, 2, '#ffffff'); },
  witch: (P, row, s) => { P(-15, 3, 30, 3, '#3a1f5a'); P(-14, 3, 28, 1, '#6b3fa0'); for (let i = 0; i < 14; i++) { const w = Math.max(2, 14 - i); P(-Math.floor(w / 2) + (i > 8 ? (i - 8) * 2 : 0), 2 - i, w, 1, '#4a2a72'); } P(-8, 1, 16, 2, '#c49bff'); },
};
// rounded dome from y0 (top) to y1 (rim) at most hw wide each side: lit on top, darker rim row
function dome(P, y0, y1, hw, main, light, dark) {
  for (let y = y0; y <= y1; y++) { const t = (y - y0 + 0.5) / (y1 - y0 + 1), w = Math.round(hw * Math.sqrt(Math.min(1, t * 2.4 + 0.12))); P(-w, y, w * 2, 1, y === y1 ? dark : t < 0.3 ? light : main); }
  P(-Math.round(hw * 0.45), y0 + 1, Math.round(hw * 0.5), 1, '#ffffff55');
}
const hgCache = {};
// pre-render a headgear for one direction into a small canvas (anchor at 20,16)
function hgCanvas(vis, row) {
  const k = vis + ':' + row; if (hgCache[k] !== undefined) return hgCache[k];
  const f = HG[vis]; if (!f) return (hgCache[k] = null);
  const c = mkCanvas(40, 40), g = c.getContext('2d'), s = row === 1 ? -1 : row === 3 ? 1 : 0;
  f((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(20 + x, 16 + y, w, h); }, row, s);
  return (hgCache[k] = c);
}
// one hero, all layers: base (with hair colour) -> hair style -> headgear. look: {cc, sex, hc, hair}; head: item id or vis id
function drawHero(look, anim, tt, row, x, y, alpha = 1, head = 0, g = ctx, gear = null) {
  // layered LUMIRA characters (paperdoll.js); the older sheet renderer below is the fallback while loading
  if (drawPaper(look, Object.assign({ head }, gear || {}), anim, tt, row, x, y, alpha, g, (look && look.scale) || 1)) return true;
  const nm = heroSheet(look), vis = typeof head === 'string' ? head : (head && ITEMS[head] && ITEMS[head].vis) || '';
  const cc = CLS[((look && look.cc) | 0) % 5], an = headAnchor(nm, anim, tt, row, look && look.sex);
  const clip = vis && HAT_OUTFIT[cc] && an && anim !== 'hurt';
  if (clip) { g.save(); g.beginPath(); g.rect(x - 200, y - 60 + an[1] + 2, 400, 400); g.clip(); } // cut the outfit's own hat off under new headgear
  const ok = drawChar(nm, anim, tt, row, x, y, alpha, g);
  if (clip) g.restore();
  if (!ok || !an) return ok;
  const X = Math.round(x + an[0]), Y = Math.round(y - 60 + an[1]);
  if (alpha < 1) g.globalAlpha = alpha;
  if (look && look.hair) drawHairStyle(g, look.hair, row, X, Y, hairRamp(look));
  if (vis) { const hc = hgCanvas(vis, row); if (hc) g.drawImage(hc, X - 20, Y - 16); }
  g.globalAlpha = 1;
  return ok;
}

// ------------------------------------------------------------ NPC looks
function drawNpc(n, x, y, tn) {
  if (n.look === 'board') return drawBoard(x, y);
  if (n.look && typeof n.look === 'object') return drawHero(n.look, 'idle', tn + ((n.x * 7 + n.y * 3) % 10) / 3, 2, x, y, 1, n.look.head || '', ctx);
  return drawChar(NPC_SPR[n.look], 'stand', 0, 2, x, y);
}
function drawBoard(x, y) { // quest board: wooden sign with notes
  x = Math.round(x); y = Math.round(y);
  R(ctx, x - 13, y - 30, 3, 30, '#5a3a20'); R(ctx, x + 10, y - 30, 3, 30, '#5a3a20');
  R(ctx, x - 16, y - 40, 32, 22, '#7a5130'); R(ctx, x - 15, y - 39, 30, 20, '#a0703f'); R(ctx, x - 16, y - 42, 32, 3, '#4a2e16');
  for (const [a, b, c] of [[-13, -37, '#f2efe6'], [-4, -36, '#ffe9a8'], [5, -38, '#f2efe6'], [-10, -28, '#ffe9a8'], [2, -27, '#f2efe6']]) { R(ctx, x + a, y + b, 7, 7, c); R(ctx, x + a + 1, y + b + 2, 5, 1, '#8a7a60'); R(ctx, x + a + 1, y + b + 4, 4, 1, '#8a7a60'); R(ctx, x + a + 3, y + b, 1, 1, '#e5484d'); }
  return true;
}

// ------------------------------------------------------------ map nodes (herbs, ore, shrines, quest spots)
const NODE_DRAW = {
  herb: (x, y) => { if (drawProp('veg_herb_01', x, y + 2)) { R(ctx, x - 1, y - 14, 3, 3, '#ffffff'); R(ctx, x, y - 13, 1, 1, '#ffd34d'); return; } for (const [a, b] of [[-5, 0], [0, -3], [5, 0], [-2, 2], [3, 2]]) { R(ctx, x + a - 1, y + b - 6, 2, 6, '#3f7a2e'); R(ctx, x + a - 2, y + b - 7, 4, 2, '#5aa346'); } R(ctx, x - 1, y - 12, 3, 3, '#ffffff'); R(ctx, x, y - 11, 1, 1, '#ffd34d'); },
  flower: (x, y, tn) => { const gl = 0.5 + Math.sin(tn * 3) * 0.3; ctx.globalAlpha = gl; disc(ctx, x, y - 8, 7, '#bcd8ff'); ctx.globalAlpha = 1; R(ctx, x - 1, y - 8, 2, 8, '#2f5d34'); for (const [a, b] of [[-3, -12], [3, -12], [0, -15], [0, -10]]) R(ctx, x + a - 1, y + b, 3, 3, '#dfe9ff'); R(ctx, x - 1, y - 12, 2, 2, '#ffe36b'); },
  ore: (x, y, tn, nd) => { const sp = nd.n.includes('เงิน') ? '#bfe8ff' : '#e8913a'; if (drawProp('rock_ore_01', x, y + 2)) { if (nd.n.includes('เงิน')) for (const [a, b] of [[-5, -10], [3, -13], [6, -7]]) R(ctx, x + a, y + b, 2, 2, sp); if (Math.floor(tn * 2) % 3 === 0) R(ctx, x + 3, y - 14, 1, 1, '#ffffff'); return; } disc(ctx, x, y - 6, 10, '#4a4a55', 7); disc(ctx, x - 1, y - 8, 8, '#6e6e7c', 5); for (const [a, b] of [[-5, -9], [2, -11], [5, -6], [-1, -5]]) R(ctx, x + a, y + b, 2, 2, sp); if (Math.floor(tn * 2) % 3 === 0) R(ctx, x + 3, y - 12, 1, 1, '#ffffff'); },
  crystal: (x, y, tn) => { ctx.globalAlpha = 0.35 + Math.sin(tn * 2.5) * 0.15; disc(ctx, x, y - 10, 11, '#7fd4ff'); ctx.globalAlpha = 1; if (drawProp('rock_crystal_01', x, y + 2)) return; for (const [a, h, w] of [[-5, 12, 4], [0, 18, 5], [5, 10, 4]]) { R(ctx, x + a - w / 2, y - h, w, h, '#3f8fe0'); R(ctx, x + a - w / 2, y - h, 1, h, '#bfe8ff'); R(ctx, x + a - 1, y - h - 2, 2, 2, '#bfe8ff'); } },
  shrine: (x, y, tn) => { R(ctx, x - 6, y - 26, 12, 26, '#8a8a98'); R(ctx, x - 6, y - 26, 2, 26, '#b0b0bc'); R(ctx, x - 8, y - 28, 16, 3, '#6e6e7c'); R(ctx, x - 8, y - 2, 16, 3, '#5b5b66'); ctx.globalAlpha = 0.6 + Math.sin(tn * 2) * 0.3; disc(ctx, x, y - 34, 5, '#dfe9ff'); R(ctx, x - 1, y - 36, 4, 4, '#ffffff'); ctx.globalAlpha = 1; },
  shard: (x, y, tn) => { ctx.globalAlpha = 0.4 + Math.sin(tn * 4) * 0.2; disc(ctx, x, y - 6, 12, '#7fd4ff', 6); ctx.globalAlpha = 1; R(ctx, x - 3, y - 14, 6, 10, '#3f8fe0'); R(ctx, x - 2, y - 16, 4, 2, '#bfe8ff'); R(ctx, x - 1, y - 12, 2, 5, '#ffffff'); },
  root: (x, y, tn) => { ctx.globalAlpha = 0.35 + Math.sin(tn * 3) * 0.2; disc(ctx, x, y - 4, 9, '#b07bff', 4); ctx.globalAlpha = 1; for (const [a, b, w] of [[-9, -3, 7], [-3, -6, 8], [3, -2, 7], [-6, -9, 4]]) R(ctx, x + a, y + b, w, 3, '#3a2a2a'); R(ctx, x - 2, y - 10, 3, 9, '#4a3333'); R(ctx, x - 1, y - 8, 1, 4, '#b07bff'); },
  stash: (x, y) => { drawProp('prop_crate_01', x, y + 2) || drawProp('p_crate_A_big', x, y); },
  lumber: (x, y) => { drawProp('prop_lumber_01', x, y + 2) || drawProp('p_resource_lumber', x, y); },
  journal: (x, y) => { drawProp('prop_wheelbarrow_01', x, y + 2) || drawProp('p_wheelbarrow', x, y); R(ctx, x - 3, y - 18, 7, 5, '#f2efe6'); R(ctx, x - 2, y - 17, 5, 1, '#8a7a60'); },
  injured: (x, y) => { drawChar('h_knight_m', 'hurt', 9, 0, x, y); },
};
const NODE_ICON = { herb: 'สมุนไพร', ore: 'แร่', crystal: 'ผลึก', shrine: 'ศาล', shard: 'รูน', root: 'ราก', stash: 'หีบ', lumber: 'ไม้', journal: 'บันทึก', injured: 'ผู้บาดเจ็บ', flower: 'ดอกไม้' };
const nodeCd = {}; // node id -> time it's back (performance.now ms), from the server
function nodeWanted(nd) { // does one of my quests need this node right now?
  if (!me || !me.qs || !QDEF) return false;
  for (const [id, a] of Object.entries(me.qs.a)) { const s = QDEF[id] && QDEF[id].stages[a.s]; if (s && s.node === nd.k) return true; }
  return false;
}
function drawNodes(list, vx0, vy0, vx1, vy1, tn, t) {
  for (const nd of (map.nodes || [])) {
    const x = (nd.x + 0.5) * TP, y = (nd.y + 0.5) * TP + 12;
    if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    list.push({ y, f: () => {
      const cd = (nodeCd[nd.id] || 0) > t; if (cd) ctx.globalAlpha = 0.35;
      shadow(x, y, 8); (NODE_DRAW[nd.k] || NODE_DRAW.herb)(x, y, tn, nd); ctx.globalAlpha = 1;
      const want = !cd && nodeWanted(nd);
      if (want) { const b = Math.round(Math.sin(tn * 5) * 2); drawExcl(x, y - 46 + b); }
      if (HUD.S.names && (want || nd.k !== 'herb')) labels.push([x, y + 4, nd.n, want ? '#ffe08a' : '#cfe8d0', 'node']);
    } });
  }
}

// ------------------------------------------------------------ environments
// ground class per tile + background colour + light overlay for each map environment
const CAVE = 6, ROCKW = 7, SNOW = 8;
PAL[CAVE] = ['#5a4e44', '#544840', '#62564a', '#4c423a'].map(hex);
PAL[ROCKW] = ['#2e2a2e', '#36313a', '#2a262a', '#3c3640'].map(hex);
const ENV = {
  town_sand: { base: SAND, bg: '#a88850' }, desert: { base: SAND, bg: '#a88850', flowerSand: 1 }, village: { base: GRASS, bg: '#3d7a32', wallDirt: 1 },
  meadow: { base: GRASS, bg: '#3d7a32' }, forest: { base: GRASS, bg: '#24461f', treeDark: 1 }, forest_deep: { base: GRASS, bg: '#1c3a1a', treeDark: 1, shade: 'rgba(10,30,10,0.18)' },
  night_creek: { base: GRASS, bg: '#0e1a2a', treeDark: 1, night: 'rgba(14,20,66,0.52)' }, cave: { base: CAVE, bg: '#141016', cave: 1, night: 'rgba(6,4,10,0.62)' }, snow: { base: SAND, bg: '#d8e4ee', snow: 1 },
};
const envOf = m => ENV[m.env] || (m.id === 'woods' ? ENV.forest : m.id === 'plains' ? ENV.desert : m.town ? ENV.town_sand : ENV.desert);
// light overlay (night / cave): dark everywhere except a soft circle around the player
let lightC = null, lightKey = '';
function drawLight(t) {
  const E = envOf(map); if (!E.night && !E.shade) return;
  if (E.shade && !E.night) { ctx.fillStyle = E.shade; ctx.fillRect(0, 0, DW, DH); return; }
  const lamp = me && me.eq && me.eq.head && ITEMS[me.eq.head] && ITEMS[me.eq.head].light;
  const r = Math.round(Math.min(DW, DH) * (lamp ? 0.62 : E.cave ? 0.36 : 0.5)), key = DW + 'x' + DH + E.night + r;
  if (lightKey !== key) {
    lightKey = key; lightC = mkCanvas(DW, DH); const g = lightC.getContext('2d');
    g.fillStyle = E.night; g.fillRect(0, 0, DW, DH);
    g.globalCompositeOperation = 'destination-out';
    const gr = g.createRadialGradient(DW / 2, DH / 2, r * 0.25, DW / 2, DH / 2, r);
    gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, DW, DH);
  }
  const e = ents.get(myId), [ox, oy] = viewOrigin();
  const px = e ? ((e.x + 0.5) * TP + ox) * Z - DW / 2 : 0, py = e ? ((e.y + 0.5) * TP + oy) * Z - DH / 2 : 0;
  ctx.drawImage(lightC, Math.round(px), Math.round(py));
  // fill what the shifted overlay leaves uncovered
  ctx.fillStyle = E.night;
  if (px > 0) ctx.fillRect(0, 0, Math.ceil(px), DH); if (px < 0) ctx.fillRect(DW + Math.floor(px), 0, Math.ceil(-px), DH);
  if (py > 0) ctx.fillRect(0, 0, DW, Math.ceil(py)); if (py < 0) ctx.fillRect(0, DH + Math.floor(py), DW, Math.ceil(-py));
}

// ------------------------------------------------------------ service windows: storage, bank, crafting
function svc(title, html) { closeWins(); $('svct').textContent = title; $('svcbody').innerHTML = html; $('wSvc').style.display = 'block'; return $('svcbody'); }
function itemRow(id, q, extra) { const it = ITEMS[id], d = document.createElement('div'); d.className = 'li'; d.appendChild(iconCanvas(id)); d.insertAdjacentHTML('beforeend', `<div class="grow"><span class="r${it.rar | 0}">${esc(it.n)}</span>${q > 1 ? ' x' + q : ''}${extra || ''}</div>`); return d; }
let storeData = null;
function openStorage(m) {
  storeData = m; const b = svc('คลังเก็บของ', `<div class="note">ของในคลัง ${m.items.length}/${m.max} ช่อง · แตะ "ฝาก" จากกระเป๋า หรือ "ถอน" จากคลัง</div><div class="tabs2" id="sttabs"><button data-t="bag" class="on">กระเป๋า → คลัง</button><button data-t="store">คลัง → กระเป๋า</button></div><div class="list" id="stlist"></div>`);
  let tab = (openStorage.tab || 'bag');
  const draw = () => {
    b.querySelectorAll('#sttabs button').forEach(x => x.classList.toggle('on', x.dataset.t === tab));
    const l = b.querySelector('#stlist'); l.innerHTML = '';
    const src = tab === 'bag' ? me.inv : storeData.items;
    src.forEach((s, i) => { const d = itemRow(s.id, s.q); const bt = document.createElement('button'); bt.textContent = tab === 'bag' ? 'ฝาก' : 'ถอน'; bt.onclick = () => { openStorage.tab = tab; send({ t: 'store', a: tab === 'bag' ? 'put' : 'take', i, id: s.id, q: s.q }); }; d.appendChild(bt); l.appendChild(d); });
    if (!src.length) l.innerHTML = '<div class="note">ว่าง</div>';
  };
  b.querySelectorAll('#sttabs button').forEach(x => x.onclick = () => { tab = x.dataset.t; openStorage.tab = tab; draw(); });
  draw();
}
function openBank(m) {
  const b = svc('ธนาคารเอลินดรา', `<div class="li" style="display:block">ยอดฝาก <b class="num" style="color:var(--gold)">${m.bank.toLocaleString()}</b> Zeny<br>ติดตัว <b class="num">${m.zeny.toLocaleString()}</b> Zeny</div>
    <div class="note" style="margin:.6rem 0">ฝากเงินไว้ปลอดภัย ถอนได้ที่ธนาคารเมืองหลวง</div><input id="bkz" type="number" min="1" placeholder="จำนวน Zeny" style="width:100%;margin-bottom:.6rem">
    <div style="display:flex;gap:.6rem"><button id="bkd" style="flex:1">ฝาก</button><button id="bkw" style="flex:1">ถอน</button></div>`);
  const z = () => Math.max(0, Math.floor(+b.querySelector('#bkz').value || 0));
  b.querySelector('#bkd').onclick = () => z() && send({ t: 'bank', a: 'dep', z: z() });
  b.querySelector('#bkw').onclick = () => z() && send({ t: 'bank', a: 'wd', z: z() });
}
function openCraft(m) {
  const b = svc(m.name || 'โต๊ะช่าง', `<div class="note">${m.station === 'smith' ? 'ตีอาวุธและชุดเกราะจากแร่และวัสดุ' : 'งานฝีมือ ยา และของใช้'} — วัตถุดิบมาจากมอนสเตอร์และจุดเก็บของ</div><div class="list" id="crlist"></div>`);
  const l = b.querySelector('#crlist'), have = id => me.inv.reduce((n, s) => n + (s.id === id ? s.q : 0), 0);
  for (const rid of m.recipes) {
    const r = RECIPES[rid]; if (!r) continue;
    const ok = r.in.every(([id, n]) => have(id) >= n) && me.zeny >= r.zeny;
    const ing = r.in.map(([id, n]) => `<span class="mat" style="color:${have(id) >= n ? '#7dff8a' : '#ff8b8b'}"><i class="aci" style="background-image:url(${itemIconURL(id)})"></i>${esc(ITEMS[id].n)} ${have(id)}/${n}</span>`).join(' ');
    const d = itemRow(r.out[0], r.out[1], `<br><small class="st">${ing}${r.zeny ? ` · ${r.zeny}z` : ''}<br>${statOf(ITEMS[r.out[0]])}${reqOf(ITEMS[r.out[0]])}</small>`);
    const bt = document.createElement('button'); bt.textContent = 'สร้าง'; bt.disabled = !ok; bt.onclick = () => { send({ t: 'craft', r: rid }); setTimeout(() => $('wSvc').style.display === 'block' && openCraft(m), 350); }; d.appendChild(bt); l.appendChild(d);
  }
}

// ------------------------------------------------------------ map window: this map + world map
let mapTab = 'local', wmSel = null;
document.querySelectorAll('#maptabs button').forEach(b => b.onclick = () => { mapTab = b.dataset.t; renderBigMap(); });
function renderBigMap() {
  document.querySelectorAll('#maptabs button').forEach(b => b.classList.toggle('on', b.dataset.t === mapTab));
  $('maplocal').style.display = mapTab === 'local' ? 'block' : 'none'; $('mapworld').style.display = mapTab === 'world' ? 'block' : 'none';
  if (mapTab === 'world') return renderWorldMap();
  if (!ground || !map) return;
  // local map: the baked ground + every tree/building/prop drawn small, framed like a field chart
  const c = $('bmc'), D = Math.min(2, devicePixelRatio || 1), bw = Math.max(200, ($('maplocal').clientWidth || 600)) * D;
  const W = map.w * TP, H = map.h * TP, s = bw / W; c.width = Math.round(bw); c.height = Math.round(H * s);
  const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(ground, 0, 0, c.width, c.height);
  const list = props.filter(p => WSPR[p.n]).sort((a, b) => (a.sort ?? a.y) - (b.sort ?? b.y));
  for (const p of list) { const w = WSPR[p.n], im = img(w.path); if (im) g.drawImage(im, (p.x - w.ax) * s, (p.y - w.ay) * s, w.w * s, w.h * s); }
  // soft vignette so markers read well
  const vg = g.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.35, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.75);
  vg.addColorStop(0, 'rgba(10,14,30,0)'); vg.addColorStop(1, 'rgba(10,14,30,0.45)'); g.fillStyle = vg; g.fillRect(0, 0, c.width, c.height);
  const T = (x, y) => [(x + 0.5) * TP * s, (y + 0.5) * TP * s], R = Math.max(5, 6 * D);
  const label = (t, x, y, col) => { g.font = `600 ${Math.round(10 * D)}px Mitr,sans-serif`; const tw = g.measureText(t).width; x = Math.max(tw / 2 + 4 * D, Math.min(c.width - tw / 2 - 4 * D, x)); y = Math.min(c.height - 14 * D, y); g.textAlign = 'center'; g.textBaseline = 'top'; g.lineWidth = 3 * D; g.strokeStyle = '#0b1024'; g.strokeText(t, x, y); g.fillStyle = col; g.fillText(t, x, y); };
  const qt = typeof questMarkTargets === 'function' ? questMarkTargets() : [];
  for (const p of map.portals) { const [x, y] = T(p.x, p.y), lk = p.req && p.req.locked; g.fillStyle = lk ? '#5a5f78' : '#38b6ff'; g.strokeStyle = '#e8f6ff'; g.lineWidth = 2 * D; g.beginPath(); g.ellipse(x, y, R * 1.2, R * 0.8, 0, 0, 7); g.fill(); g.stroke(); label((lk ? '🔒 ' : '➜ ') + (p.label || (WORLD && WORLD.maps[p.to] || {}).name || p.to).split(' (')[0], x, y + R, lk ? '#9aa0b8' : '#bfeeff'); }
  for (const n of map.npcs) {
    const [x, y] = T(n.x, n.y), mk = me && me.npcq && me.npcq[n.id];
    g.fillStyle = mk === 'turnin' ? '#7dff8a' : mk === 'avail' ? '#ffd34d' : '#e8c46a'; g.strokeStyle = '#0b1024'; g.lineWidth = 2 * D;
    g.beginPath(); g.arc(x, y, R * 0.8, 0, 7); g.fill(); g.stroke();
    if (mk) { g.font = `700 ${Math.round(11 * D)}px Mitr,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#0b1024'; g.fillText(mk === 'turnin' ? '?' : '!', x, y + 0.5); }
    label(n.name || n.n || '', x, y + R, '#ffe9b0');
  }
  for (const nd of map.nodes || []) if (nodeWanted(nd)) { const [x, y] = T(nd.x, nd.y); g.fillStyle = '#b07bff'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 * D; g.beginPath(); g.moveTo(x, y - R); g.lineTo(x + R * 0.7, y); g.lineTo(x, y + R); g.lineTo(x - R * 0.7, y); g.closePath(); g.fill(); g.stroke(); }
  for (const q of qt) if (q.map === map.id) { const [x, y] = T(q.x, q.y); g.strokeStyle = '#ffd34d'; g.lineWidth = 2.5 * D; g.setLineDash([4 * D, 3 * D]); g.beginPath(); g.arc(x, y, (q.r ? q.r * TP * s : R * 2), 0, 7); g.stroke(); g.setLineDash([]); }
  const e = ents.get(myId); if (e) { const [x, y] = T(e.x, e.y), a = [0, -Math.PI / 2, Math.PI / 2, Math.PI][e.dir | 0] ?? 0; g.save(); g.translate(x, y); g.rotate(({ 0: Math.PI, 1: -Math.PI / 2, 2: 0, 3: Math.PI / 2 })[e.dir | 0] ?? 0); g.fillStyle = '#ff4d5a'; g.strokeStyle = '#fff'; g.lineWidth = 2 * D; g.beginPath(); g.moveTo(0, R * 1.3); g.lineTo(R, -R * 0.8); g.lineTo(0, -R * 0.3); g.lineTo(-R, -R * 0.8); g.closePath(); g.fill(); g.stroke(); g.restore(); }
  g.strokeStyle = '#c8913a'; g.lineWidth = 3 * D; g.strokeRect(1.5 * D, 1.5 * D, c.width - 3 * D, c.height - 3 * D);
  const meta = WORLD && WORLD.maps[map.id];
  $('mapinfo').innerHTML = (meta ? `แนะนำ Lv ${meta.lv[0]}-${meta.lv[1]} · ${(WORLD.regions.find(r => r.id === meta.region) || {}).th || ''} · ทางออก: ${map.portals.map(p => esc(p.label || (WORLD.maps[p.to] || {}).name || p.to)).join(', ')}` : '')
    + `<div class="mlegend"><span><i style="background:#ff4d5a"></i>คุณ</span><span><i style="background:#e8c46a;border-radius:50%"></i>NPC</span><span><i style="background:#ffd34d;border-radius:50%"></i>! ภารกิจ</span><span><i style="background:#38b6ff;border-radius:50%"></i>ทางไปแผนที่อื่น</span><span><i style="background:#b07bff"></i>จุดเก็บของเควส</span></div>`;
}
// ------------------------------------------------------------ world map: painted continent (pixel art), cached per size
const BIOME = { heartland: ['#6fae58', '#5e9e4b', '#86c068'], verdant: ['#3e8a4a', '#2f7440', '#4f9d58'], ashen: ['#7a4a3a', '#5e3a30', '#9a5a40'], azure: ['#8cc87a', '#d8c890', '#70b86a'],
  sandsea: ['#e0c27a', '#d4b066', '#ecd498'], frostland: ['#e8f2fa', '#c8dcec', '#ffffff'], arcane: ['#8a7ad0', '#6f60b8', '#a596e0'], void: ['#4a3a6a', '#3a2c58', '#5e4a80'] };
let wmCache = null;
function paintContinent(w, h) {
  const c = mkCanvas(w, h), g = c.getContext('2d'), id = g.createImageData(w, h), d = id.data;
  const regs = WORLD.regions.map(r => ({ r, x: r.pos[0] / 100 * w * 0.9 + w * 0.05, y: r.pos[1] / 100 * h * 0.9 + h * 0.05 }));
  const mapsP = Object.values(WORLD.maps).map(m => [m.pos[0] / 100 * w * 0.9 + w * 0.05, m.pos[1] / 100 * h * 0.9 + h * 0.05]);
  const land = new Float32Array(w * h), reg = new Uint8Array(w * h), S = Math.min(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0; for (const [mx, my] of mapsP) { const dd = ((x - mx) ** 2 + (y - my) ** 2) / (S * 0.11) ** 2; v += Math.exp(-dd); }
    for (const q of regs) { const dd = ((x - q.x) ** 2 + (y - q.y) ** 2) / (S * 0.2) ** 2; v += 0.6 * Math.exp(-dd); }
    v += (vnoise(x / 9, y / 9) - 0.5) * 0.9 + (vnoise(x / 3.5 + 40, y / 3.5) - 0.5) * 0.35;
    const edge = Math.min(x, y, w - 1 - x, h - 1 - y) / (S * 0.08); if (edge < 1) v -= (1 - edge) * 1.2;
    land[y * w + x] = v; let best = 0, bd = 1e9; regs.forEach((q, i) => { const dd = (x - q.x) ** 2 + (y - q.y) ** 2 + (vnoise(x / 11 + i * 13, y / 11) - 0.5) * S * S * 0.09 + (vnoise(x / 4 + i * 7, y / 4 + 50) - 0.5) * S * S * 0.025; if (dd < bd) { bd = dd; best = i; } }); reg[y * w + x] = best;
  }
  const TH = 0.62, at = (x, y) => land[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, v = land[i], o = i * 4; let col;
    if (v < TH) { // sea: deep -> shallow, foam line at the coast, sparkles
      const near = v > TH - 0.12; col = near ? [62, 120, 186] : v > TH - 0.3 ? [44, 92, 160] : [30, 64, 124];
      if (v > TH - 0.04) col = [168, 214, 240]; else if (hash(x * 3, y * 7) > 0.995) col = [120, 170, 220];
    } else {
      const pal = BIOME[regs[reg[i]].r.id] || BIOME.heartland, n = vnoise(x / 4 + reg[i] * 9, y / 4);
      col = hex(pal[n < 0.35 ? 1 : n > 0.7 ? 2 : 0]);
      if (v < TH + 0.07) col = [226, 206, 150]; // beach
      const sh = at(x - 1, y - 1) - at(x + 1, y + 1); if (sh > 0.08) col = col.map(q => Math.min(255, q + 14)); else if (sh < -0.08) col = col.map(q => q - 18);
    }
    d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  // stamps: trees / mountains / dunes / crystals per biome (pixel icons)
  const R2 = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), ww, hh); };
  const tree = (x, y, c1, c2) => { R2(x - 1, y - 4, 3, 1, c1); R2(x - 2, y - 3, 5, 2, c1); R2(x - 1, y - 3, 1, 1, c2); R2(x, y - 1, 1, 2, '#5a3a22'); };
  const mount = (x, y, c1, cap) => { for (let k = 0; k < 6; k++) R2(x - k, y - 6 + k, k * 2 + 1, 1, k < 2 ? cap : c1); R2(x, y - 4, 1, 4, '#00000033'); };
  const dune = (x, y) => { R2(x - 3, y, 7, 1, '#c09a50'); R2(x - 2, y - 1, 4, 1, '#f0dca8'); };
  const crystal = (x, y) => { R2(x, y - 5, 1, 5, '#e0d8ff'); R2(x - 1, y - 3, 1, 3, '#b8a8ff'); R2(x + 1, y - 2, 1, 2, '#8070d0'); };
  for (let k = 0; k < w * h / 18; k++) {
    const x = Math.floor(hash(k, 7) * w), y = Math.floor(hash(7, k) * h), i = y * w + x; if (land[i] < TH + 0.12) continue;
    if (mapsP.some(([mx, my]) => Math.abs(mx - x) < 5 && Math.abs(my - y) < 5)) continue;
    const id2 = regs[reg[i]].r.id, r = hash(k, 99);
    if (id2 === 'verdant' || (id2 === 'heartland' && r < 0.45)) tree(x, y, id2 === 'verdant' ? '#1f5a30' : '#2f7a3a', '#5fae58');
    else if (id2 === 'ashen' && r < 0.5) mount(x, y, '#4a2a22', r < 0.15 ? '#ff7a3a' : '#7a5a50');
    else if (id2 === 'frostland') r < 0.5 ? mount(x, y, '#8aa8c0', '#ffffff') : tree(x, y, '#3a6a7a', '#e8f2fa');
    else if (id2 === 'sandsea' && r < 0.5) dune(x, y);
    else if (id2 === 'arcane' && r < 0.4) crystal(x, y);
    else if (id2 === 'void' && r < 0.4) crystal(x, y);
    else if (id2 === 'azure' && r < 0.3) tree(x, y, '#2f8a5a', '#9ad87a');
  }
  return c;
}
function renderWorldMap() {
  if (!WORLD) return; const c = $('wmc'), box = $('wmw').getBoundingClientRect(), D = Math.min(2, devicePixelRatio || 1);
  c.width = Math.max(10, Math.round(box.width * D)); c.height = Math.max(10, Math.round(box.height * D));
  const g = c.getContext('2d'), W = c.width, H = c.height, P = q => [q[0] / 100 * W * 0.9 + W * 0.05, q[1] / 100 * H * 0.9 + H * 0.05];
  const pw = 220, ph = Math.round(pw * H / W), key = pw + 'x' + ph;
  if (!wmCache || wmCache.key !== key) wmCache = { key, c: paintContinent(pw, ph) };
  g.imageSmoothingEnabled = false; g.drawImage(wmCache.c, 0, 0, W, H);
  // roads: dashed parchment lines with a slight curve
  g.lineCap = 'round';
  for (const [a, b] of WORLD.links) {
    const A = WORLD.maps[a], B = WORLD.maps[b]; if (!A || !B) continue; const [x1, y1] = P(A.pos), [x2, y2] = P(B.pos), mx = (x1 + x2) / 2 + (y2 - y1) * 0.12, my = (y1 + y2) / 2 - (x2 - x1) * 0.12, open = A.status === 'open' && B.status === 'open';
    g.setLineDash(open ? [] : [3 * D, 4 * D]); g.strokeStyle = '#2a1a0c99'; g.lineWidth = 4 * D; g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(mx, my, x2, y2); g.stroke();
    g.strokeStyle = open ? '#f0d48a' : '#c8b89a88'; g.lineWidth = 2 * D; g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(mx, my, x2, y2); g.stroke();
  }
  g.setLineDash([]);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const txt = (t, x, y, sz, col, wt = 600) => { g.font = `${wt} ${Math.round(sz * D)}px Mitr,sans-serif`; g.lineWidth = 3.5 * D; g.strokeStyle = '#0b1024dd'; g.strokeText(t, x, y); g.fillStyle = col; g.fillText(t, x, y); };
  for (const r of WORLD.regions) { const [x, y] = P(r.pos); txt(r.th, x, y - Math.min(W, H) * 0.1, 12, '#fff3cf', 700); }
  wmHit = [];
  const qmaps = new Set((typeof questMarkTargets === 'function' ? questMarkTargets() : []).map(q => q.map));
  for (const m of Object.values(WORLD.maps)) {
    const [x, y] = P(m.pos), open = m.status === 'open', here = map && m.id === map.id, k = m.town ? 'town' : m.kind === 'dungeon' ? 'dun' : 'field', u = Math.max(0.8, Math.min(1.6, box.width / 420)) * D;
    const B = (dx, dy, ww, hh, col) => { g.fillStyle = col; g.fillRect(Math.round(x + dx * u), Math.round(y + dy * u), Math.ceil(ww * u), Math.ceil(hh * u)); };
    if (k === 'town') { // little castle
      const wall = open ? '#e8e0cc' : '#7a7f94', roof = open ? '#3d6fd8' : '#4a4f66';
      B(-6, -2, 12, 6, '#0b1024'); B(-5, -1, 10, 4, wall); B(-6, -6, 3, 5, '#0b1024'); B(3, -6, 3, 5, '#0b1024'); B(-5.5, -5, 2, 4, wall); B(3.5, -5, 2, 4, wall);
      B(-6, -8, 3, 2, roof); B(3, -8, 3, 2, roof); B(-2, -5, 4, 4, wall); B(-2, -8, 4, 3, roof); B(-1, 0, 2, 3, '#5a3a22');
    } else if (k === 'dun') { B(-5, -3, 10, 7, '#0b1024'); B(-4, -2, 8, 5, open ? '#8a7a6a' : '#5a5f78'); B(-2, -1, 4, 4, '#1a1010'); }
    else { g.fillStyle = '#0b1024'; g.beginPath(); g.arc(x, y, 4.2 * u, 0, 7); g.fill(); g.fillStyle = open ? '#7dff8a' : '#6b7090'; g.beginPath(); g.arc(x, y, 3 * u, 0, 7); g.fill(); }
    if (!open) { B(-2, -2, 4, 3, '#c8c8d8'); B(-1.5, -4, 3, 2, '#0b1024'); B(-1, -3.5, 2, 1.5, '#c8c8d8'); }
    if (qmaps.has(m.id)) { g.strokeStyle = '#ffd34d'; g.lineWidth = 2 * D; g.beginPath(); g.arc(x, y, 9 * u, 0, 7); g.stroke(); }
    if (here) { // red pin
      g.fillStyle = '#e5484d'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 * D; g.beginPath(); g.arc(x, y - 14 * u, 4 * u, Math.PI, 0); g.lineTo(x, y - 6 * u); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y - 14 * u, 1.5 * u, 0, 7); g.fill();
    }
    if (open || (m.town && box.width > 520)) txt(m.name.split(' (')[0], x, y + 9 * u, box.width > 520 ? 9 : 8, open ? '#ffffff' : '#b8bccc', open ? 600 : 400);
    if (wmSel === m.id) { g.strokeStyle = '#7fd4ff'; g.lineWidth = 2 * D; g.strokeRect(x - 8 * u, y - 8 * u, 16 * u, 16 * u); }
    wmHit.push([m.id, x / D, y / D]);
  }
  // compass rose + gold frame
  const cx = W - 26 * D, cy = H - 26 * D, rr = 14 * D; g.fillStyle = '#0b1024aa'; g.beginPath(); g.arc(cx, cy, rr + 4 * D, 0, 7); g.fill();
  g.fillStyle = '#e8c46a'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.beginPath(); g.moveTo(cx + Math.sin(a) * rr, cy - Math.cos(a) * rr); g.lineTo(cx + Math.sin(a + 0.6) * rr * 0.3, cy - Math.cos(a + 0.6) * rr * 0.3); g.lineTo(cx + Math.sin(a - 0.6) * rr * 0.3, cy - Math.cos(a - 0.6) * rr * 0.3); g.fill(); }
  txt('N', cx, cy - rr - 6 * D, 8, '#ffe39a', 700);
  g.strokeStyle = '#c8913a'; g.lineWidth = 3 * D; g.strokeRect(1.5 * D, 1.5 * D, W - 3 * D, H - 3 * D); g.strokeStyle = '#5a3a14'; g.lineWidth = 1 * D; g.strokeRect(5 * D, 5 * D, W - 10 * D, H - 10 * D);
}
let wmHit = [];
$('wmc').addEventListener('pointerdown', e => {
  const r = $('wmc').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  let best = null, bd = 22; for (const [id, mx, my] of wmHit) { const d = Math.hypot(mx - x, my - y); if (d < bd) { bd = d; best = id; } }
  if (!best) return; wmSel = best; const m = WORLD.maps[best], reg = WORLD.regions.find(q => q.id === m.region);
  const links = WORLD.links.filter(l => l.includes(best)).map(l => WORLD.maps[l[0] === best ? l[1] : l[0]]).filter(Boolean);
  $('wminfo').innerHTML = `<b style="color:var(--gold)">${esc(m.name)}</b> ${m.town ? '<span class="tag main">เมือง</span>' : m.kind === 'dungeon' ? '<span class="tag class">ดันเจี้ยน</span>' : '<span class="tag">ฟิลด์</span>'}`
    + `<br><small class="st">${esc(reg ? reg.th + ' · ' + reg.en : '')} · แนะนำ Lv ${m.lv[0]}-${m.lv[1]}</small>`
    + `<br>สถานะ: ${m.status === 'open' ? '<span style="color:#7dff8a">เปิดแล้ว</span>' : '<span style="color:#ff8b8b">🔒 ยังไม่เปิด (Locked)</span>'}${map && map.id === best ? ' · <b>คุณอยู่ที่นี่</b>' : ''}`
    + `<br><small class="st">เชื่อมต่อกับ: ${links.map(l => esc(l.name.split(' (')[0]) + (l.status === 'open' ? '' : ' 🔒')).join(', ')}</small>`;
  renderWorldMap();
});

// boss slam warning: red ellipse on the ground, a gold ring closing in until it lands
function drawAoe(f, age) {
  const x = (f.x + 0.5) * TP, y = (f.y + 0.5) * TP + 8, Rr = f.r * TP, p = Math.min(1, age / f.ms);
  ctx.globalAlpha = age > f.ms ? 0.6 : 0.3; ctx.fillStyle = '#ff3b3b';
  for (let yy = -Rr * 0.5; yy <= Rr * 0.5; yy++) { const w = Rr * Math.sqrt(Math.max(0, 1 - (yy / (Rr * 0.5)) ** 2)); ctx.fillRect(Math.round(x - w), Math.round(y + yy), Math.round(w * 2), 1); }
  ctx.globalAlpha = 0.85; ctx.fillStyle = '#ffd34d';
  for (let j = 0; j < 48; j++) { const a = j / 48 * 6.283; ctx.fillRect(Math.round(x + Math.cos(a) * Rr * p), Math.round(y + Math.sin(a) * Rr * 0.5 * p), 2, 1); }
  ctx.globalAlpha = 1;
}
