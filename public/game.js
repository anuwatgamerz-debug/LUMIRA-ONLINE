'use strict';
// ============================================================ ELYNDRA ONLINE client — HD pixel style
const $ = id => document.getElementById(id);
const cv = $('game'); const ctx = cv.getContext('2d');
const TP = 32; // art pixels per tile
let DPR = 1, Z = 2, VW = 0, VH = 0, DW = 0, DH = 0;
// art pixels visible across the short side of the screen, per view-distance setting
const ZOOM_ART = { near: 400, normal: 520, far: 660 };
function resize() {
  DPR = Math.min(3, devicePixelRatio || 1);
  DW = Math.round(innerWidth * DPR); DH = Math.round(innerHeight * DPR);
  cv.width = DW; cv.height = DH; cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  // integer device pixels per art pixel keeps the pixel art crisp
  Z = Math.max(1, Math.round(DPR * Math.min(innerWidth, innerHeight) / (ZOOM_ART[HUD.S.zoom] || ZOOM_ART.normal)));
  VW = DW / Z; VH = DH / Z;
  HUD.layout();
}
addEventListener('resize', resize); resize();

// ------------------------------------------------------------ assets
let META = { lpc: {}, px: {} };
const IMG = {};
function img(n) {
  let i = IMG[n]; if (i && i.getContext) return i; // generated sheet (recolour / procedural)
  if (!i) { i = IMG[n] = new Image(); i.src = 'assets/' + n + '.png'; }
  return i.complete && i.naturalWidth ? i : null;
}
(function loadMeta() { fetch('assets/meta.json').then(r => r.json()).then(m => { META = m; }).catch(() => setTimeout(loadMeta, 2000)); })();
// LUMIRA world sprites (tools/art/world_assets.py): buildings, trees, vegetation, rocks, props — name -> {path, ax, ay, w, h, fade?}
let WSPR = {};
(function loadWorld() { fetch('assets/world/world.json').then(r => r.json()).then(m => { WSPR = m; for (const p of props) img(WSPR[p.n] ? WSPR[p.n].path : p.n); }).catch(() => setTimeout(loadWorld, 3000)); })();
const CLS = ['knight', 'mage', 'rogue', 'hood', 'barb'];
const CLS_TH = ['อัศวิน', 'จอมเวท', 'นักธนู', 'นักฆ่าฮู้ด', 'บาบาเรียน'];
const NPC_SPR = { iris: 'n_iris', merchant: 'n_merchant', nurse: 'n_nurse', warper: 'n_warper', sage: 'n_sage' };
const heroOf = look => 'h_' + CLS[((look && look.cc) | 0) % 5] + '_' + ((look && look.sex) ? 'f' : 'm');
// rows: 0 N, 1 W, 2 S, 3 E
const SRV2ROW = [2, 0, 1, 3];
function row4(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : (dy > 0 ? 2 : 0); }

// draw sprite with feet at art coords (x,y). returns false if not loaded
function drawChar(name, anim, tt, row, x, y, alpha = 1, g = ctx) {
  const L = META.lpc[name];
  if (L) {
    const im = img(name); if (!im) return false;
    const c = L.cell, A = L.anims;
    let key = anim, f = 0, a;
    if (anim === 'atk') key = L.atk;
    a = A[key] || A.walk;
    const [r0, n, rows] = a;
    if (key === 'walk') f = 1 + (Math.floor(tt * 10) % 8);
    else if (anim === 'stand') { a = A.walk; f = 0; }
    else if (key === 'idle') f = Math.floor(tt * 1.6) % n;
    else if (key === 'hurt') f = Math.min(n - 1, Math.floor(tt * 10));
    else f = Math.min(n - 1, Math.floor(tt * (n / 0.45)));
    const rr = a[2] === 1 ? 0 : row;
    const ox = Math.round(x - c / 2), oy = Math.round(y - (c - 64) / 2 - 60);
    if (alpha < 1) g.globalAlpha = alpha;
    g.drawImage(im, f * c, (a[0] + rr) * c, c, c, ox, oy, c, c);
    g.globalAlpha = 1; return true;
  }
  const P = META.px[name];
  if (P) {
    const im = img(name); if (!im) return false;
    let key = anim === 'stand' ? 'idle' : anim === 'hurt' ? 'die' : anim;
    const a = P.anims[key] || P.anims.idle; const [c0, n, fps, loop] = a;
    let f = Math.floor(tt * fps); f = loop ? ((f % n) + n) % n : Math.min(n - 1, Math.max(0, f));
    if (alpha < 1) g.globalAlpha = alpha;
    g.drawImage(im, (c0 + f) * P.fw, row * P.fh, P.fw, P.fh, Math.round(x - P.ax), Math.round(y - P.ay), P.fw, P.fh);
    g.globalAlpha = 1; return true;
  }
  return false;
}
// draws a world sprite (LUMIRA set first, then the older prop sheets); returns false if nothing could be drawn
function drawProp(name, x, y, alpha = 1) {
  const w = WSPR[name], m = w || META.px[name], im = m && img(w ? w.path : name); if (!im) return false;
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(im, Math.round(x - m.ax), Math.round(y - m.ay));
  ctx.globalAlpha = 1; return true;
}
// a tree whose canopy covers the local player (who stands behind it) is drawn see-through
function canopyAlpha(p) {
  const w = WSPR[p.n], e = ents.get(myId); if (!w || !w.fade || !e) return 1;
  const px = (e.x + 0.5) * TP, py = (e.y + 0.5) * TP + 12, [fx, fy, fw, fh] = w.fade, x0 = p.x - w.ax + fx, y0 = p.y - w.ay + fy;
  return py < p.y && px > x0 && px < x0 + fw && py - 20 > y0 && py - 30 < y0 + fh ? 0.45 : 1;
}

// ------------------------------------------------------------ noise
function hash(x, y) { let h = (x | 0) * 374761393 + (y | 0) * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const s = t => t * t * (3 - 2 * t); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); const u = s(xf), v = s(yf); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// ------------------------------------------------------------ ground generation (pixel art)
const SAND = 0, GRASS = 1, DIRT = 2, PLAZA = 3, WATER = 4, DGRASS = 5;
const PAL = {
  [SAND]: ['#e6cb92', '#dfc285', '#ecd5a2', '#d6b777'].map(hex),
  [GRASS]: ['#5e9e4b', '#66a651', '#6fae58', '#56944a'].map(hex), // LUMIRA green ramp (art bible §5)
  [DGRASS]: ['#46803f', '#4d8845', '#55904a', '#40783c'].map(hex),
  [DIRT]: ['#b0814f', '#a87a4a', '#ba8d5c', '#9f7346'].map(hex), // brown ramp
  [WATER]: ['#3c86c9', '#4590d2', '#3479bc', '#4b98d8'].map(hex),
};
// LPC ground textures (assets/ground_lpc.png: rows grass, dark grass, dirt, sand, cave floor; 3 x 32px variants each)
const GTEX = { d: null, row: { [GRASS]: 0, [DGRASS]: 1, [DIRT]: 2, [SAND]: 3 } };
(function loadGround() { const i = new Image(); i.onload = () => { const c = mkCanvas(i.width, i.height), g = c.getContext('2d'); g.drawImage(i, 0, 0); GTEX.d = g.getImageData(0, 0, i.width, i.height).data; GTEX.w = i.width; if (typeof CAVE !== 'undefined') GTEX.row[CAVE] = 4; if (typeof map !== 'undefined' && map && ground) bakeMap(map); }; i.src = 'assets/ground_lpc.png'; })();
function gtex(c, x, y) {
  const r = GTEX.row[c]; if (!GTEX.d || r === undefined) return null;
  const h = hash(Math.floor(x / 32) * 3 + 11, Math.floor(y / 32) * 5 + 7), v = h < 0.2 ? 0 : h < 0.5 ? 1 : 2;
  const i = ((r * 32 + (y & 31)) * GTEX.w + v * 32 + (x & 31)) * 4; return [GTEX.d[i], GTEX.d[i + 1], GTEX.d[i + 2]];
}
let ground = null, props = [], portals = [], waterPx = [], miniC = null;
function classOf(v, m) {
  const E = envOf(m);
  switch (v) {
    case 1: return GRASS; case 5: return E.treeDark ? DGRASS : GRASS; case 11: return E.flowerSand ? SAND : E.base === CAVE ? CAVE : GRASS;
    case 4: case 8: return DIRT; case 9: case 3: return m.town ? DIRT : E.base;
    case 6: return E.cave ? ROCKW : E.base;
    case 10: return PLAZA; case 2: case 12: return WATER;
    default: return E.base;
  }
}
function genGround(m) {
  const w = m.w, h = m.h, W = w * TP, H = h * TP;
  const cls = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) cls[i] = classOf(m.t[i], m);
  const at = (x, y) => cls[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))];
  const out = new Uint8Array(W * H); // class per pixel
  const order = [GRASS, DGRASS, DIRT, WATER, ROCKW];
  for (let py = 0; py < H; py++) {
    const fy = (py + 0.5) / TP - 0.5, ty = Math.floor(fy), yf = fy - ty;
    for (let px = 0; px < W; px++) {
      const fx = (px + 0.5) / TP - 0.5, tx = Math.floor(fx), xf = fx - tx;
      const c00 = at(tx, ty), c10 = at(tx + 1, ty), c01 = at(tx, ty + 1), c11 = at(tx + 1, ty + 1);
      const own = at(Math.floor(px / TP), Math.floor(py / TP));
      if (c00 === c10 && c00 === c01 && c00 === c11) { out[py * W + px] = c00; continue; }
      if (own === PLAZA) { out[py * W + px] = PLAZA; continue; }
      let res = envOf(m).base; let n = -1;
      for (const k of order) {
        const v = (c00 === k) * (1 - xf) * (1 - yf) + (c10 === k) * xf * (1 - yf) + (c01 === k) * (1 - xf) * yf + (c11 === k) * xf * yf;
        if (v <= 0) continue;
        if (n < 0) n = vnoise(px / 7, py / 7) * 0.6 + vnoise(px / 2.7 + 50, py / 2.7) * 0.4;
        if (v + (n - 0.5) * (k === WATER ? 0.35 : 0.6) > 0.5) res = k;
      }
      out[py * W + px] = res === SAND && own === PLAZA ? PLAZA : res;
    }
  }
  ground = mkCanvas(W, H); const g = ground.getContext('2d'); const id = g.createImageData(W, H); const d = id.data;
  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 255 : out[y * W + x];
  waterPx = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = out[y * W + x], i = (y * W + x) * 4; let col;
    const r = hash(x * 7 + 3, y * 13 + 1);
    if (c === PLAZA) {
      const by = Math.floor(y / 16), ox = (by % 2) * 8, bx = Math.floor((x + ox) / 16);
      const lx = (x + ox) % 16, ly = y % 16, v = hash(bx * 3, by * 5);
      const base = [[188, 180, 164], [198, 190, 173], [176, 168, 152], [205, 196, 178]][Math.floor(v * 4)];
      if (lx === 0 || ly === 0) col = [128, 120, 106]; else if (ly === 1 || lx === 1) col = [222, 215, 198]; else if (ly === 15 || lx === 15) col = [158, 150, 134];
      else col = r < 0.06 ? base.map(q => q - 14) : base;
    } else if (c === WATER) {
      const n = vnoise(x / 11, y / 11); const p = PAL[WATER];
      col = n < 0.35 ? p[2] : n < 0.6 ? p[0] : n < 0.8 ? p[1] : p[3];
      // foam edge
      if (get(x, y - 1) !== WATER || get(x - 1, y) !== WATER || get(x + 1, y) !== WATER || get(x, y + 1) !== WATER) col = [214, 238, 255];
      else if (get(x, y - 2) !== WATER) col = [120, 180, 230];
      else if (r < 0.0015) waterPx.push(x, y);
    } else if (c === ROCKW) { // cave wall: dark rock, lit top edge, shadowed foot
      const n = vnoise(x / 6, y / 6); const p = PAL[ROCKW]; col = p[n < 0.3 ? 3 : n < 0.55 ? 0 : n < 0.8 ? 1 : 2];
      if (get(x, y + 1) !== ROCKW && get(x, y + 1) !== 255) col = [24, 20, 26]; else if (get(x, y - 1) !== ROCKW && get(x, y - 1) !== 255) col = [96, 88, 104];
      else if (r < 0.03) col = [70, 64, 78];
    } else {
      const p = PAL[c]; const n = vnoise(x / 9 + c * 30, y / 9), tx = gtex(c, x, y);
      col = tx || p[n < 0.3 ? 3 : n < 0.55 ? 0 : n < 0.8 ? 1 : 2];
      if (!tx && r < 0.04) col = p[(Math.floor(r * 100)) % 4];
      if (c === GRASS || c === DGRASS) {
        // blades
        if (tx) { if (n > 0.72) col = col.map(q => q + 8); else if (n < 0.25) col = col.map(q => q - 6); } else if (r > 0.965) col = c === GRASS ? [134, 201, 93] : [92, 168, 80];
        else if (hash(x, y - 1) > 0.965 || hash(x * 7 + 3, (y - 1) * 13 + 1) > 0.965) col = c === GRASS ? [70, 138, 52] : [44, 112, 46];
        // dark rim where grass meets other ground
        const nb = [get(x, y + 1), get(x, y - 1), get(x + 1, y), get(x - 1, y)];
        if (nb.some(q => q !== c && q !== GRASS && q !== DGRASS && q !== 255)) col = c === GRASS ? [61, 120, 46] : [40, 96, 40];
      } else if (c === DIRT || c === SAND) {
        if (r > 0.985) col = c === DIRT ? [143, 104, 62] : [200, 166, 110];
        if (hash(x * 7 + 3, (y - 1) * 13 + 1) > 0.985) col = c === DIRT ? [214, 176, 128] : [246, 228, 186];
        // shadow under grass edge / near water: wet
        if (get(x, y - 1) === GRASS || get(x, y - 2) === GRASS) col = col.map((q, k) => q - 22);
        if ([get(x, y + 1), get(x, y - 1), get(x + 1, y), get(x - 1, y), get(x + 2, y), get(x - 2, y), get(x, y + 2), get(x, y - 2)].includes(WATER)) col = c === SAND ? [190, 158, 104] : [150, 110, 70];
      }
    }
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  // decals
  const t = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : m.t[y * w + x];
  const fl = [['#ff6b8b', '#ffd34d', '#ffffff', '#b07bff', '#ff9a3d'], ['#c94a6a', '#d8a92a', '#cfcfcf', '#7a52c8', '#d86b1d']];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = t(x, y);
    if (v === 11) for (let k = 0; k < 5; k++) { const px = x * TP + 4 + Math.floor(hash(x + k, y) * 24), py = y * TP + 4 + Math.floor(hash(y, x + k * 3) * 24); const ci = (k + x) % 5; g.fillStyle = '#3f7a2e'; g.fillRect(px + 1, py + 2, 1, 2); g.fillStyle = fl[0][ci]; g.fillRect(px, py, 3, 2); g.fillRect(px + 1, py - 1, 1, 4); g.fillStyle = fl[1][ci]; g.fillRect(px + 2, py + 1, 1, 1); g.fillStyle = '#fff6b0'; g.fillRect(px + 1, py, 1, 1); }
    if (v === 12) {
      const X = x * TP, Y = y * TP;
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#a8774a' : '#9b6b3e'; g.fillRect(X, Y + i * 8, TP, 7); g.fillStyle = '#6b4526'; g.fillRect(X, Y + i * 8 + 7, TP, 1); g.fillStyle = '#c08d5c'; g.fillRect(X, Y + i * 8, TP, 1); g.fillStyle = '#5a3a20'; g.fillRect(X + 4 + (i % 2) * 18, Y + i * 8 + 3, 2, 2); }
      if (t(x - 1, y) !== 12) { g.fillStyle = '#4a2f18'; g.fillRect(X, Y, 3, TP); }
      if (t(x + 1, y) !== 12) { g.fillStyle = '#4a2f18'; g.fillRect(X + TP - 3, Y, 3, TP); }
    }
  }
  // building contact shadow
  for (const b of m.props || []) { g.fillStyle = 'rgba(20,16,10,0.25)'; g.fillRect(b.x * TP + 4, (b.y + b.h) * TP - 4, b.w * TP + 6, 8); }
  // minimap
  miniC = mkCanvas(w, h); const mg = miniC.getContext('2d'); const mi = mg.createImageData(w, h);
  const MC = { [SAND]: [214, 186, 128], [GRASS]: [88, 160, 70], [DGRASS]: [50, 120, 50], [DIRT]: [170, 130, 84], [PLAZA]: [190, 182, 166], [WATER]: [60, 134, 201], [CAVE]: [96, 84, 72], [ROCKW]: [34, 30, 36] };
  for (let i = 0; i < w * h; i++) { let c = MC[cls[i]]; const v = m.t[i]; if (v === 5) c = [30, 90, 40]; if (v === 6 && !envOf(m).cave) c = [130, 130, 130]; if (v === 7) c = [60, 140, 70]; if (v === 9 || v === 3) c = [150, 80, 50]; if (v === 8) c = [150, 220, 255]; mi.data.set([...c, 255], i * 4); }
  mg.putImageData(mi, 0, 0);
}
const treeOf = (E, r) => E.trees ? E.trees[Math.floor(r * E.trees.length)] : E.snow ? (r < 0.6 ? 'tree_pine_snow_01' : 'tree_pine_01') : E.treeDark ? ['tree_pine_01', 'tree_oak_02', 'tree_pine_02', 'tree_oak_01', 'tree_oak_03'][Math.floor(r * 5)] : ['tree_oak_01', 'tree_oak_02', 'tree_oak_03', 'tree_oak_01', 'tree_pine_01'][Math.floor(r * 5)];
const vegOf = (E, r) => E.veg ? E.veg[Math.floor(r * E.veg.length)] : E.base === SAND ? (r < 0.6 ? 'veg_grass_02' : 'rock_small_01') : E.treeDark ? ['veg_fern_01', 'veg_bush_small_01', 'veg_mushroom_01', 'veg_tallgrass_01', 'veg_grass_02'][Math.floor(r * 5)]
  : ['veg_grass_01', 'veg_grass_02', 'veg_tallgrass_01', 'veg_flowers_red_01', 'veg_flowers_gold_01', 'veg_flowers_white_01', 'veg_flowers_violet_01', 'veg_bush_small_01', 'veg_bush_01', 'veg_grass_01'][Math.floor(r * 10)];
function bakeMap(m) {
  genGround(m);
  const E = envOf(m), w = m.w, h = m.h, t = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : m.t[y * w + x];
  props = []; portals = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = t(x, y), r = hash(x, y), jx = Math.round((hash(x + 3, y) - 0.5) * 8), jy = Math.round((hash(x, y + 3) - 0.5) * 6);
    const cx = x * TP + 16 + jx, cy = y * TP + 26 + jy;
    // LUMIRA sprites (n) with the older prop sheets as fallback (fb); trees/rocks carry their own baked shadow
    if (v === 5) props.push({ n: treeOf(E, r), x: cx, y: cy + 4, tree: 1, fb: r < 0.45 ? 'p_tree_single_A' : r < 0.9 ? 'p_tree_single_B' : 'p_trees_A_small', fsh: 14 });
    else if (v === 6 && !E.cave) props.push({ n: ['rock_small_01', 'rock_medium_03', 'rock_medium_04', 'rock_large_05', 'rock_small_02'][Math.floor(r * 5)], x: cx, y: cy, fb: 'p_rock_single_' + 'ABCDE'[Math.floor(r * 5)], fsh: 10 });
    else if (v === 7) props.push({ n: 'veg_cactus_01', x: cx, y: cy, fb: 'p_cactus', fsh: 8 });
    else if (v === 3 && (x === 0 || y === 0 || x === w - 1 || y === h - 1)) { const vert = x === 0 || x === w - 1; props.push({ n: vert ? 'prop_wall_v_01' : 'prop_wall_h_01', x: x * TP + 16, y: y * TP + 28, fb: vert ? 'p_wallv' : 'p_wallh', fy: -8 }); }
    else if (v === 8) portals.push({ x: x * TP + 16, y: y * TP + 16 });
    else if ((v === 1 || v === 0 && E.base === GRASS) && !m.town && r > 0.955) props.push({ n: vegOf(E, hash(y, x)), x: cx, y: cy - 6, veg: 1 }); // scattered vegetation
  }
  for (const b of m.props || []) props.push({ n: `bld_${b.k}_${b.w}x${b.h}`, fb: `b_${b.k}_${b.w}x${b.h}`, x: (b.x + b.w / 2) * TP, y: (b.y + b.h / 2) * TP, sort: (b.y + b.h) * TP - 2 });
  for (const [n, x, y] of m.deco || []) props.push({ n, x: x * TP, y: y * TP }); // decorations listed by the map (content/maps)
  for (const p of props) img(WSPR[p.n] ? WSPR[p.n].path : p.n);
}

// ------------------------------------------------------------ item icons
function itemColor(id) {
  if (id === 1) return ['#e5484d', '#ffb3b3']; if (id === 2) return ['#ef8a2f', '#ffd1a3']; if (id === 3) return ['#4c8ff0', '#bcd8ff'];
  if (id >= 20 && id < 30) return [['#cfd6e2', '#c89a5a', '#e4ebf5', '#bfe8ff'][id - 20], '#7a5130'];
  if (id >= 30 && id < 40) return [id === 31 ? '#9a6a40' : '#efe7d4', '#b9a98e'];
  if (id === 40) return ['#d64545', '#a83232']; if (id === 41) return ['#f2c46d', '#e5484d'];
  return [['#ff8fb3', '#e2733a', '#3f9a4a', '#e8e4da', '#8fd16a', '#9b7bff'][id - 10] || '#aaa', '#5553'];
}
// 16x16 pixel icons
function drawIcon(g, id) {
  const [a, b] = itemColor(id); const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const O = '#1e1428';
  if (id <= 3) { P(6, 1, 4, 1, O); P(6, 2, 4, 2, '#8a6a4a'); P(5, 4, 6, 1, O); P(3, 5, 10, 9, O); P(4, 6, 8, 7, a); P(5, 5, 6, 1, a); P(4, 13, 8, 1, O); P(5, 7, 2, 3, b); P(4, 12, 8, 1, '#0003'); }
  else if (id >= 20 && id < 30) { for (let i = 0; i < 8; i++) { P(5 + i, 9 - i, 3, 3, O); } for (let i = 0; i < 8; i++) P(6 + i, 9 - i, 1, 1, a), P(6 + i, 10 - i, 1, 1, '#8892a6'); P(2, 9, 6, 2, O); P(3, 9, 4, 1, '#d9a84a'); P(2, 11, 4, 4, O); P(3, 12, 2, 2, b); if (id === 23) P(12, 2, 2, 2, '#a6e3ff'); }
  else if (id >= 30 && id < 40) { P(3, 2, 10, 12, O); P(1, 3, 3, 6, O); P(12, 3, 3, 6, O); P(4, 3, 8, 10, a); P(2, 4, 2, 4, a); P(12, 4, 2, 4, a); P(6, 3, 4, 2, b); P(4, 12, 8, 1, '#0002'); }
  else if (id >= 40) { if (id === 41) { P(2, 5, 12, 8, O); P(3, 9, 10, 3, a); P(3, 6, 2, 3, a); P(7, 4, 2, 5, a); P(11, 6, 2, 3, a); P(7, 9, 2, 2, b); P(2, 4, 2, 2, O); P(7, 3, 2, 1, O); P(12, 4, 2, 2, O); } else { P(3, 4, 10, 9, O); P(4, 5, 8, 7, a); P(1, 11, 14, 3, O); P(2, 12, 12, 1, b); P(5, 6, 2, 2, '#fff6'); } }
  else { P(3, 4, 10, 9, O); P(4, 5, 8, 7, a); P(5, 6, 2, 2, '#fff8'); P(4, 11, 8, 1, '#0003'); }
}
const iconCache = {};
function icon16(id) { if (!iconCache[id]) { const c = mkCanvas(16, 16); drawIcon(c.getContext('2d'), id); iconCache[id] = c; } return iconCache[id]; }
// ------------------------------------------------------------ ITEM ICON REGISTRY (single source for every window)
// assets/items/items.json: icons {name: path} + items {itemId: name}. Item ids are never renamed for art; ids without
// new art fall back to the item atlas, then the LPC icon sheet, then the 16px pixel icon (never an empty square).
let ITEM_ART = { icons: {}, items: {} };
const itemArtImg = {}, itemUrlCache = {};
fetch('assets/items/items.json').then(r => r.json()).then(j => { ITEM_ART = j; for (const k in itemUrlCache) delete itemUrlCache[k]; dispatchEvent(new Event('itemart')); }).catch(() => { });
function itemArtPath(id) { const n = ITEM_ART.items[String(id)]; return (n && ITEM_ART.icons[n]) || ''; }
function itemArt(id) { const p = itemArtPath(id); if (!p) return null; let im = itemArtImg[p]; if (!im) { im = itemArtImg[p] = new Image(); im.src = p; } return im; }
// a URL for CSS / <img> use (same picture as the canvases)
function itemIconURL(id) { const p = itemArtPath(id); if (p) return p; if (!itemUrlCache[id]) itemUrlCache[id] = iconCanvas(id, true).toDataURL(); return itemUrlCache[id]; }
// item icon for windows: new item art, then the item atlas / LPC sheet, then the 16px pixel icon
function iconCanvas(id, noArt) {
  const ia = !noArt && itemArt(id);
  if (ia) { const c = mkCanvas(64, 64), g = c.getContext('2d'); c.className = 'art'; const draw = () => { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.clearRect(0, 0, 64, 64); g.drawImage(ia, 0, 0, 64, 64); }; if (ia.complete && ia.naturalWidth) draw(); else ia.addEventListener('load', draw, { once: true }); return c; }
  const art = HUD.atlasCell('items', String(id)) || HUD.atlasCell('items_lpc', String(id));
  if (art) { const n = art.s <= 40 ? art.s * 2 : 64, c = mkCanvas(n, n), g = c.getContext('2d'); g.imageSmoothingEnabled = art.s > 40; if (art.s <= 40) c.style.imageRendering = 'pixelated'; g.drawImage(art.im, art.sx, art.sy, art.s, art.s, 0, 0, n, n); c.className = 'art'; return c; }
  const c = mkCanvas(32, 32); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(icon16(id), 0, 0, 32, 32); c.style.imageRendering = 'pixelated'; return c;
}
// faded silhouette for an empty equipment slot (art only; plain label otherwise)
function slotHint(d, k, lab) {
  const art = HUD.atlasCell('items', 'slot_' + k);
  if (art) { const c = mkCanvas(64, 64), g = c.getContext('2d'); g.drawImage(art.im, art.sx, art.sy, art.s, art.s, 0, 0, 64, 64); c.className = 'art hint'; d.appendChild(c); d.append(lab); }
  else d.textContent = lab;
}
addEventListener('uiskin', () => { HUD.atlasCell('items', '1'); HUD.atlasCell('items_lpc', '1'); });
// combat wheel potion button shows the same potion art as the bag / shop / AUTO settings
addEventListener('itemart', () => { const b = $('bPot'); if (!b || !itemArtPath(1)) return; let i = b.querySelector('.potart'); if (!i) { i = document.createElement('i'); i.className = 'potart'; b.appendChild(i); } i.style.backgroundImage = `url(${itemArtPath(1)})`; }); // start loading the item atlas once the art manifest is in

// ------------------------------------------------------------ state
let ws, myId = 0, map = null, ITEMS = {}, MOBN = {}, me = null;
let QDEF = {}, CLSDEF = {}, WORLD = null, RECIPES = {}, RARITY = []; // game data from 'welcome'
const ents = new Map(); const fx = []; const bubbles = new Map(); let clickMark = null; let selected = 0; const ghosts = [];
let cam = { x: 0, y: 0 }; let auto = false;
function connect(msg) {
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  ws.onopen = () => ws.send(JSON.stringify(msg));
  ws.onmessage = e => onMsg(JSON.parse(e.data));
  const sock = ws;
  sock.onclose = () => {
    if (ws !== sock) return; // an older socket replaced by a new login attempt
    if (me) { log('การเชื่อมต่อหลุด... กำลังรีเฟรช', '#ff8b8b'); setTimeout(() => location.reload(), 2500); }
    else if (loginBusy || !$('err').textContent) { setBusy(false); if (!$('err').textContent) $('err').textContent = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง'; }
  };
}
const send = o => ws && ws.readyState === 1 && ws.send(JSON.stringify(o));
// sound hooks (audio-events.js). Wrapped: audio can never break the game.
const snd = (f, ...a) => { try { if (window.SND && SND[f]) SND[f](...a); } catch (e) { } };
const now = () => performance.now() / 1000;
function onMsg(m) {
  snd('msg', m);
  switch (m.t) {
    case 'learnfail': toast({ points: 'แต้มสกิลไม่พอ', job: `ต้องการ Job Lv ${m.job}`, max: 'สกิลนี้เลเวลสูงสุดแล้ว', class: 'อาชีพนี้เรียนสกิลนี้ไม่ได้' }[m.r] || 'เรียนสกิลไม่ได้'); break;
    case 'session': store.set(m.guest ? 'ely_guest' : 'ely_session', { u: m.u, tok: m.tok }); break;
    case 'portraitfail': toast(m.m); $('portmsg').textContent = m.m; break;
    case 'needchar': setMode('gchar'); loginErr('บัญชี Google นี้ยังไม่มีตัวละคร — ตั้งชื่อและเลือกหน้าตาได้เลย'); break;
    case 'bindres': $('bindMsg').textContent = m.m; if (m.ok) { store.set('ely_guest', null); $('bindP').value = ''; } break;
    case 'err': if (m.code === 'session') { const g = store.get('ely_guest'); if (mode === 'guest' && g) store.set('ely_guest', null); else store.set('ely_session', null); }
      if (typeof setBusy === 'function' && loginBusy) { setBusy(false); loginErr(m.m); break; } $('err').textContent = m.m; if (me) log(m.m, '#ff8b8b'); break;
    case 'welcome': myId = m.id; ITEMS = m.items; MOBN = m.mobs; { const L = $('login'); setBusy(true, 'กำลังเข้าสู่โลก Elyndra...'); L.classList.add('leaving'); setTimeout(() => { L.style.display = 'none'; }, 560); loginBusy = false; } $('credit').style.display = 'none'; $('hud').style.display = 'block'; HUD.layout(); renderLog(); try { if ($('rem').checked && mode === 'login') localStorage.setItem('lmo_u', $('u').value.trim().toLowerCase()); } catch (e) { } for (const k in MOBN) { const sp = MOBN[k].spr; if (!sp) img('m_' + k); else if (!sp.startsWith('proc:')) img(sp); } SK = m.skills || {}; MELEE_R = m.melee || 1.6; if (V) V.bind(m.vfx);
      QDEF = m.quests || {}; GUIDE = m.guide || null; CLSDEF = m.classes || {}; WORLD = m.world || null; RECIPES = m.recipes || {}; RARITY = m.rarity || []; img('h_knight_m'); img('h_knight_f'); break;
    case 'map': { const first = !map; map = m.map; snd('map', map, first); } ents.clear(); ghosts.length = 0; cam.x = (m.x + 0.5) * TP; cam.y = (m.y + 0.5) * TP; $('mmn').textContent = map.name; $('bmn').textContent = map.name; if ($('mm').classList.contains('art')) fitText($('mmn')); closeWins(); clearTarget(); bakeMap(map); for (const n of map.npcs) { if (n.look && typeof n.look === 'object') img(heroOf(n.look)); else if (NPC_SPR[n.look]) img(NPC_SPR[n.look]); } for (const k in nodeCd) delete nodeCd[k]; break;
    case 'me': { const prev = me; me = m.c; updHud(); snd('me', prev, me); if (prev && prev.portraitId !== me.portraitId && $('wPort').style.display === 'block') { $('portmsg').textContent = 'บันทึกภาพตัวละครแล้ว ✔'; $('portSave').disabled = true; } break; }
    case 's': snap(m); break;
    case 'fx': snd('fx', m); onFx(m); break; // sound first: a 'die' removes the entity
    case 'sys': log(m.m, m.col || '#ffe9a8'); break;
    case 'chat': onChat(m); break;
    case 'rank': case 'pinfo': case 'party': case 'guild': case 'trade': case 'invite': onSocial(m); break;
    case 'dlg': openDlg(m); break;
    case 'dlgclose': closeWins(); break;
    case 'shop': openShop(m); break;
    case 'cd': onCd(m); break;
    case 'castfail': onCastFail(m); break;
    case 'usefail': if (typeof acUseFailed === 'function') acUseFailed(m); break;
    case 'skills': SK = m.skills || SK; if (me) renderHotbar(); break;
    case 'storage': openStorage(m); break;
    case 'bankui': openBank(m); break;
    case 'craftui': openCraft(m); break;
    case 'nodecd': nodeCd[m.id] = performance.now() + m.ms; break;
    case 'eqfail': toast(m.r); break;
  }
}
function snap(m) {
  const seen = new Set();
  for (const [id, name, x, y, dir, hp, maxhp, lv, look, wpn, head, dead, cls, arm, guild, party] of m.p) {
    seen.add(id); let e = ents.get(id);
    if (!e) { e = { kind: 'p', x, y, row: SRV2ROW[dir] ?? 2, ph: Math.random() * 3 }; ents.set(id, e); img(heroOf(look)); }
    if (e.sdir !== dir && !e.moving) e.row = SRV2ROW[dir] ?? 2;
    if (dead && !e.dead) e.dieT = now();
    Object.assign(e, { name, tx: x, ty: y, sdir: dir, hp, maxhp, lv, look, wpn, head, dead, cls, arm, guild: guild || '', party: party || 0 });
  }
  for (const [id, type, x, y, dir, hp, maxhp, tg, st] of m.m) {
    seen.add(id); let e = ents.get(id);
    if (!e) { e = { kind: 'm', x, y, row: SRV2ROW[dir] ?? 2, ph: Math.random() * 3 }; ents.set(id, e); }
    Object.assign(e, { type, tx: x, ty: y, sdir: dir, hp, maxhp, tg: tg | 0, st: st | 0 });
  }
  for (const [id, item, x, y] of m.d) { seen.add(id); let e = ents.get(id); if (!e) { e = { kind: 'd', x, y, born: performance.now() }; ents.set(id, e); } Object.assign(e, { item, tx: x, ty: y }); }
  for (const id of [...ents.keys()]) if (!seen.has(id)) ents.delete(id);
  if (selected && !ents.has(selected)) selected = 0;
  const tb = performance.now(); for (const [id, b] of bubbles) if (b.until < tb) bubbles.delete(id);
}
function face(a, b) { a.row = row4(b.x - a.x, b.y - a.y); }
// fx objects are pooled; floating numbers are capped so a big fight can't flood the screen or memory
const fxPool = [];
function fxNew(o) { const f = fxPool.pop() || {}; for (const k in f) delete f[k]; return Object.assign(f, o); }
function fxFree(i) { fxPool.push(fx[i]); fx.splice(i, 1); }
const MAX_NUMS = 40;
function addNum(e, id, v, col, big) {
  const t = performance.now(); let n = 0, stack = 0, oldest = -1;
  for (let i = 0; i < fx.length; i++) if (fx[i].k === 'num') { n++; if (oldest < 0) oldest = i; if (fx[i].id === id && t - fx[i].t < 350) stack++; }
  if (n >= MAX_NUMS && oldest >= 0) fxFree(oldest);
  fx.push(fxNew({ k: 'num', id, x: e.x, y: e.y, v, col, t, big, stack: Math.min(stack, 3) })); // stack: lift numbers that land together
}
// ---- second-class skill visuals (placeholders until the VFX system): devices on the ground, skill areas, beams
const DEVS = new Map(), DEV_COL = { snare: '#c8a86a', poison: '#7ddc5a', mine: '#7fd4ff', turret: '#ffd27a' };
const SKCOL = { fire: '#ff9f43', water: '#7fd4ff', wind: '#bfe8ff', shadow: '#b07bff', holy: '#fff3a0' };
const DOT_COL = { poison: '#8fe05a', burn: '#ff9f43', curse: '#c49bff', acid: '#e8e05a', bleed: '#ff5a5a' };
function drawSkillArea(f, age) {
  const e = f.on && ents.get(f.on), cx = e ? e.x : f.x, cy = e ? e.y : f.y, x = (cx + 0.5) * TP, y = (cy + 0.5) * TP + 8, R = f.r * TP, p = Math.min(1, age / Math.max(1, f.ms));
  ctx.globalAlpha = 0.28 * (1 - p * 0.6); ctx.fillStyle = f.col;
  for (let yy = -R * 0.5; yy <= R * 0.5; yy += 2) { const w = R * Math.sqrt(Math.max(0, 1 - (yy / (R * 0.5)) ** 2)); ctx.fillRect(Math.round(x - w), Math.round(y + yy), Math.round(w * 2), 2); }
  ctx.globalAlpha = 0.9 * (1 - p); for (let j = 0; j < 36; j++) { const a = j / 36 * 6.283; ctx.fillRect(Math.round(x + Math.cos(a) * R * (0.4 + 0.6 * p)), Math.round(y + Math.sin(a) * R * 0.5 * (0.4 + 0.6 * p)), 2, 1); }
  ctx.globalAlpha = 1;
}
function drawDevice(d, tn) {
  const x = (d.x + 0.5) * TP, y = (d.y + 0.5) * TP + 6, c = DEV_COL[d.kind] || '#fff', pulse = 0.6 + Math.sin(tn * 5) * 0.3;
  if (d.kind === 'turret') { shadow(x, y, 9); R(ctx, x - 6, y - 8, 12, 8, '#7a5a2a'); R(ctx, x - 5, y - 9, 10, 2, '#c8a86a'); R(ctx, x - 1, y - 14, 3, 6, '#5a4020'); R(ctx, x + 1, y - 13, 9, 3, '#a8884a'); ctx.globalAlpha = pulse; R(ctx, x - 2, y - 7, 4, 3, '#7fd4ff'); ctx.globalAlpha = 1; return; }
  ctx.globalAlpha = 0.35 * pulse; ctx.fillStyle = c; for (let yy = -3; yy <= 3; yy++) { const w = 9 * Math.sqrt(1 - (yy / 3.5) ** 2); ctx.fillRect(Math.round(x - w), Math.round(y + yy), Math.round(w * 2), 1); }
  ctx.globalAlpha = 1; ctx.fillStyle = c; for (let j = 0; j < 8; j++) { const a = j / 8 * 6.283; ctx.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(y + Math.sin(a) * 3), 2, 2); }
  R(ctx, x - 2, y - 2, 4, 3, d.kind === 'mine' ? '#e8fbff' : '#5a4020');
}
// ---- skill VFX (public/vfx.js): which skill a hit belongs to comes from the caster's last cast
const V = window.VFX || null, lastCast = new Map(), projAt = new Map(), multiHit = new Map();
if (V) V.init({ ent: id => ents.get(id), me: () => myId, isPlayer: id => { const e = ents.get(id); return !!(e && e.kind === 'p'); },
  party: id => { const e = ents.get(id); return !!(e && e.kind === 'p' && e.party && typeof PARTY !== 'undefined' && PARTY && e.party === PARTY.id); },
  boss: id => { const e = ents.get(id); return !!(e && e.kind === 'm' && MOBN[e.type] && (MOBN[e.type].boss || MOBN[e.type].elite)); } });
// a heal / buff that a registry skill just played its own effect for: skip the generic sparkles
function vfxSelf(id, t) { const c = lastCast.get(id), b = c && t - c.t < 400 + c.ms && V && V.of(c.s); return !!(b && b[0]); }
// returns true when the hit was drawn by the registry (false = fall back to the old slash for unregistered skills)
function vfxHit(m, a, wt, delay, t) {
  const o = { from: m.from, to: m.to, owner: m.from };
  if (!m.dmg) { V.play('miss.whiff', o); return true; } // MISS: a whiff, never a full impact
  if (m.how === 'absorb') { V.play('block.spark', o); return true; } // barrier / block: deflect spark
  let id;
  if (m.skill) {
    const c = lastCast.get(m.from), b = c && t - c.t < 700 + c.ms && V.of(c.s);
    if (!b) return false; // second-class skills keep their current effect until their own VFX phase
    id = b[2]; const pa = projAt.get(m.from + ':' + m.to); if (pa && pa > t - 60) delay = Math.max(delay, pa - t);
    const k = m.from + ':' + m.to + ':' + c.s, prev = multiHit.get(k), idx = prev && t - prev.t < 80 ? prev.n + 1 : 0; // multi-hit skills: one visible strike each
    multiHit.set(k, { t: idx ? prev.t : t, n: idx }); if (multiHit.size > 200) multiHit.clear(); if (projAt.size > 200) projAt.clear();
    o.alt = idx; delay += idx * 110;
  } else id = a && a.kind === 'm' ? 'atk.mob' : V.attack(wt);
  o.delay = delay; if (id) V.play(id, o);
  if (m.crit) V.play('crit.flash', { to: m.to, owner: m.from, delay });
  return true;
}
function onFx(m) {
  const t = performance.now();
  if (fx.length > 300) fx.splice(0, fx.length - 300);
  if (m.k === 'hit') {
    const e = ents.get(m.to); const a = ents.get(m.from);
    if (a) { a.atkT = now(); if (e) face(a, e); }
    const wt = a && a.kind === 'p' && a.wpn && ITEMS[a.wpn] ? ITEMS[a.wpn].wt : '';
    let delay = 0;
    if (a && e && a.kind === 'p' && !m.skill && !m.dot && Math.hypot(a.x - e.x, a.y - e.y) > 1.8) { // ranged basic attack: the shot flies first
      if (V) { const pj = V.attackProj(wt); if (pj) delay = V.play(pj, { from: m.from, to: m.to, owner: m.from }); }
      else if (wt === 'bow') fx.push(fxNew({ k: 'proj', from: m.from, to: m.to, x: a.x, y: a.y, t, col: '#e8d9a8' }));
    }
    if (m.from === myId) { lastHit = m.to; lastMyHitT = t; }
    if (!e) return;
    e.hitT = now();
    if (m.dot) { addNum(e, m.to, '' + m.dmg, DOT_COL[m.dot] || '#9fe07a', false); return; } // damage over time: small coloured numbers, no slash
    if (m.how === 'evade') { addNum(e, m.to, 'หลบ!', '#9fe7ff', true); if (V) V.play('evade.whiff', { from: m.from, to: m.to, owner: m.from }); return; }
    addNum(e, m.to, m.dmg ? (m.crit ? 'CRIT ' + m.dmg : '' + m.dmg) : 'MISS', m.to === myId ? '#ff6b6b' : m.crit ? '#ffd34d' : m.skill ? '#ff9f43' : m.dmg ? '#ffffff' : '#b9c3d6', m.crit || m.skill);
    if (m.dmg) e.hurtT = now();
    if (!(V && vfxHit(m, a, wt, delay, t)) && m.dmg) fx.push(fxNew({ k: 'slash', x: e.x, y: e.y, t, skill: m.skill, crit: m.crit, r: Math.random() }));
  } else if (m.k === 'cast') {
    const a = ents.get(m.id), e = ents.get(m.to), sk = SK[m.s], b = V && V.of(m.s);
    if (a) { a.atkT = a.castT = now(); if (e) face(a, e); fx.push(fxNew({ k: 'sname', id: m.id, v: sk ? sk.th : m.s, t })); }
    lastCast.set(m.id, { s: m.s, t, ms: m.ms || 0 });
    if (b) { // registry effects (beginner + first class): cast on the caster, projectile, area — hits come with the server's hit
      if (b[0]) V.play(b[0], { on: m.id, from: m.id, to: m.to || 0, owner: m.id });
      if (b[1] && m.to) { const tr = V.play(b[1], { from: m.id, to: m.to, owner: m.id }); if (tr) projAt.set(m.id + ':' + m.to, t + tr); }
      if (b[3]) V.play(b[3], { on: m.id, owner: m.id, r: b[4] || 2 });
      return;
    }
    const kind = sk && sk.fx || (m.s === 'bolt' ? 'bolt' : m.s === 'cleave' ? 'ring' : '');
    if (m.x != null) fx.push(fxNew({ k: 'aoe2', x: m.x, y: m.y, r: (sk && sk.r) || 2, ms: Math.max(350, m.ms || 0), t, col: SKCOL[sk && sk.element] || '#7fd4ff' })); // area on the target
    else if (sk && sk.tier === 2 && sk.type === 'area') fx.push(fxNew({ k: 'aoe2', x: a ? a.x : 0, y: a ? a.y : 0, r: sk.range || 2, ms: 380, t, col: SKCOL[sk.element] || '#ffd34d', on: m.id }));
    if (m.ms && a) fx.push(fxNew({ k: 'ring', id: m.id, t, col: '#9fe7ff' })); // charging
    if (a && e && (kind === 'bolt' || kind === 'arrow')) fx.push(fxNew({ k: 'proj', from: m.id, to: m.to, x: a.x, y: a.y, t, col: kind === 'arrow' ? '#e8d9a8' : sk && sk.element === 'fire' ? '#ff9f43' : sk && sk.element === 'holy' ? '#fff3a0' : null }));
    if (a && kind === 'ring') fx.push(fxNew({ k: 'ring', id: m.id, t }));
  } else if (m.k === 'die') { const e = ents.get(m.id); if (e) { if (ghosts.length > 60) ghosts.shift(); ghosts.push({ ...e, dieT: now() }); ents.delete(m.id); if (selected === m.id) selected = 0; } }
  else if (m.k === 'lvup') fx.push(fxNew({ k: 'lvup', id: m.id, t, cls: m.cls }));
  else if (m.k === 'mshot') fx.push(fxNew({ k: 'proj', from: m.from, to: m.to, x: 0, y: 0, t, col: m.magic ? '#c49bff' : '#d8c8a8' }));
  else if (m.k === 'mheal') { fx.push(fxNew({ k: 'heal', id: m.to, t })); const e = ents.get(m.to); if (e && m.v) addNum(e, m.to, '+' + m.v, '#7dff8a', false); }
  else if (m.k === 'buff' || m.k === 'gather') { if (!vfxSelf(m.id, t)) fx.push(fxNew({ k: 'heal', id: m.id, t, buff: 1 })); }
  else if (m.k === 'phase') fx.push(fxNew({ k: 'ring', id: m.id, t, col: '#ff4d4d' }));
  else if (m.k === 'aoe') fx.push(fxNew({ k: 'aoe', x: m.x, y: m.y, r: m.r, ms: m.ms, t }));
  else if (m.k === 'heal') {
    if (!vfxSelf(m.id, t)) fx.push(fxNew({ k: 'heal', id: m.id, t }));
    const e = ents.get(m.id);
    if (e && m.v > 0) addNum(e, m.id, '+' + m.v, '#7dff8a', false);
    if (e && m.sp > 0) addNum(e, m.id, '+' + m.sp + ' SP', '#8fc8ff', false);
  }
  else if (m.k === 'dev') DEVS.set(m.id, { kind: m.kind, x: m.x, y: m.y, until: t + m.ms, t });
  else if (m.k === 'devx') { const d = DEVS.get(m.id); DEVS.delete(m.id); if (d && m.boom) fx.push(fxNew({ k: 'aoe2', x: d.x, y: d.y, r: 1.6, ms: 350, t, col: DEV_COL[d.kind] })); }
  else if (m.k === 'devshot') { const d = DEVS.get(m.id), e = ents.get(m.to); if (d && e) fx.push(fxNew({ k: 'beam', x: d.x, y: d.y - 0.4, to: m.to, t, col: '#ffd27a' })); }
  else if (m.k === 'chain') { const a = ents.get(m.from); if (a) fx.push(fxNew({ k: 'beam', x: a.x, y: a.y - 0.4, to: m.to, t, col: '#9fe7ff', zig: 1 })); }
  else if (m.k === 'revive') { fx.push(fxNew({ k: 'lvup', id: m.id, t })); const e = ents.get(m.id); if (e) e.dead = false; if (m.id === myId) $('dead').style.display = 'none'; }
  else if (m.k === 'pdie') { const e = ents.get(m.id); if (e) e.dieT = now(); if (m.id === myId) { $('dead').style.display = 'block'; setAuto(false); clearTarget(); } }
}

// ------------------------------------------------------------ hud
// quest tracker: expanded = title + objective + progress, collapsed = icon + short title + progress
function questTrack() {
  const t = me.qs && me.qs.t, a = t && me.qs.a[t], qd = t && QDEF[t];
  if (a && qd) return { title: qd.th, obj: a.d, prog: `${Math.min(a.k, a.n)}/${a.n}`, done: false, hint: '', type: qd.type };
  const s = me.q.step;
  if (!QT[s]) return { title: 'ภารกิจหลัก', obj: 'จบบททดสอบแล้ว!', prog: '✔', done: true };
  const [obj, where] = QT[s].split('\n'), done = me.q.k >= QN[s];
  return { title: obj, obj: where || '', prog: `${Math.min(me.q.k, QN[s])}/${QN[s]}`, done, hint: done ? '✔ กลับไปหาไอริส' : '' };
}
function updQuestTrack() {
  const t = questTrack(), q = $('quest');
  q.classList.toggle('col', !!HUD.S.qCol);
  $('qtitle').textContent = t.title; $('qprog').textContent = t.prog; q.dataset.type = t.type || ''; $('qtog').textContent = HUD.S.qCol ? '▸' : '▾';
  const aqOn = typeof AQ !== 'undefined' && AQ.on; q.classList.toggle('aq', aqOn); if ($('qauto')) { $('qauto').classList.toggle('on', aqOn); $('qauto').textContent = aqOn ? '■' : '▶'; $('qauto').style.display = t.done ? 'none' : ''; }
  $('qt').innerHTML = `<div class="qobj">${t.obj} <span class="num qk">${t.prog}</span></div>${t.hint ? `<div class="qdone">${t.hint}</div>` : ''}${aqOn ? `<div class="aqs">▶ AUTO QUEST · ${AQ.phase || 'เริ่มต้น...'}</div>` : ''}`;
}
const QN = [10, 8, 10, 1];
const QT = ['ปราบ เจลลอป\n(ทุ่งทรายสีทอง)', 'ปราบ ปูทราย\n(ทุ่งทรายสีทอง)', 'ปราบ ลีฟลิง\n(ป่าโอเอซิส)', 'ปราบ ราชาเจลลอป\n(บอส ทุ่งทราย)'];
function updHud() {
  $('hName').textContent = me.name; $('lvb').innerHTML = `<i>Lv</i><b class="d${String(me.lv).length}">${me.lv}</b>`; $('lvb').setAttribute('aria-label', 'Lv ' + me.lv); $('hJob').textContent = (CLSDEF[me.cls] && CLSDEF[me.cls].th) || 'นักผจญภัย';
  $('hpb').style.width = (me.hp / me.maxhp * 100) + '%'; $('hpt').textContent = `${me.hp} / ${me.maxhp}`;
  $('spb').style.width = (me.sp / me.maxsp * 100) + '%'; $('spt').textContent = `${me.sp} / ${me.maxsp}`;
  $('xpb').style.width = (me.next ? me.exp / me.next * 100 : 100) + '%'; $('hX').textContent = me.next ? (me.exp / me.next * 100).toFixed(1) + '%' : 'MAX';
  $('hpP').textContent = Math.round(me.hp / me.maxhp * 100) + '%'; $('spP').textContent = Math.round(me.sp / me.maxsp * 100) + '%';
  if ($('hX2')) $('hX2').textContent = $('hX').textContent;
  const z = me.zeny.toLocaleString(); if ($('hZ').textContent !== z) { $('hZ').textContent = z; HUD.fitBar(); } // wider gold can push buttons out of the bar
  $('xpt').textContent = me.lv >= (me.maxlv || 150) ? 'MAX LEVEL' : `${me.exp.toLocaleString()} / ${me.next.toLocaleString()}`;
  updQuestTrack();
  if (me.hp > 0) $('dead').style.display = 'none';
  updPotion(); renderHotbar();
  drawPortrait();
  if ($('wBag').style.display === 'block') renderBag();
  if ($('wStat').style.display === 'block') renderStat();
  if ($('wEquip').style.display === 'block') renderEquip();
  if ($('wQuest').style.display === 'block') renderQuest();
  if ($('wShop').style.display === 'block' && shopMode === 'sell') renderSell();
}
// player status on the art frame: same elements, placed on the frame's cleaned areas (boxes from ui.json)
function skinHud() {
  const f = HUD.UI.man && HUD.UI.man.hud; if (!f || !f.boxes) return;
  const P = $('pstat'), B = f.boxes; P.classList.add('art'); P.style.setProperty('--ar', `${f.w} / ${f.h}`); P.style.backgroundImage = `url(assets/ui/${f.file})`;
  const put = (el, b, rel) => { // rel: box of the positioned parent the element lives in
    const [x, y, w, h] = rel ? [(b[0] - rel[0]) / rel[2] * 100, (b[1] - rel[1]) / rel[3] * 100, b[2] / rel[2] * 100, b[3] / rel[3] * 100] : b;
    Object.assign(el.style, { left: x + '%', top: y + '%', width: w + '%', height: h + '%' });
  };
  put($('pport'), B.portrait); put($('lvb'), [B.level[0] - B.level[2] * 0.3, B.level[1] - B.level[3] * 0.4, B.level[2] * 1.6, B.level[3] * 1.8], B.portrait); // the medallion under the portrait is bigger than its painted slot put($('hName'), B.name); put($('hJob'), B.job);
  const tall = b => [b[0], b[1] - b[3] * 0.3, b[2], b[3] * 1.6]; // the art's tracks are thin: cover their outline so numbers fit
  put(P.querySelector('.bar.hp'), tall(B.hp)); put(P.querySelector('.bar.sp'), tall(B.sp)); put(P.querySelector('.bar.xp'), [B.exp[0], B.exp[1] - B.exp[3] * 0.3, B.exp[2], B.exp[3] * 1.6]); // never taller than HP/SP
  put($('hpP'), B.hpv); put($('spP'), B.spv);
  if (!$('hX2')) { const x = document.createElement('span'); x.id = 'hX2'; x.className = 'num'; P.appendChild(x); x.textContent = $('hX').textContent; }
  put($('hX2'), B.expv);
  P.appendChild($('buffs')); put($('buffs'), B.buffs); // buff icons sit in the frame's slot row
  HUD.fitBar();
}
addEventListener('uiskin', skinHud); if (HUD.UI.man) skinHud();
// minimap on the art frame: same canvas/labels, placed in the frame's hollow and plates; the canvas gets the
// hollow's aspect so the map isn't stretched (drawMinimap already reads the canvas size)
function skinMinimap() {
  const f = HUD.UI.man && HUD.UI.man.minimap; if (!f || !f.boxes) return;
  const M = $('mm'), B = f.boxes; M.classList.add('art'); M.style.setProperty('--ar', `${f.w} / ${f.h}`); M.style.backgroundImage = `url(assets/ui/${f.file})`;
  const put = (el, b) => Object.assign(el.style, { left: b[0] + '%', top: b[1] + '%', width: b[2] + '%', height: b[3] + '%' });
  put($('mmc'), B.map); put($('mmn'), B.title); put($('mmxy2'), B.coords); put($('mmp'), B.players);
  const c = $('mmc'); c.width = 150; c.height = Math.round(150 * (B.map[3] * f.h) / (B.map[2] * f.w));
}
// shrink a label's font until its text fits the plate (map names vary in length); the text width is measured
// with a Range because scrollWidth never reports less than the box itself
function fitText(el, max = 1, min = 0.55) {
  if (!el || !el.offsetParent) return;
  const r = document.createRange(), over = () => { r.selectNodeContents(el); return r.getBoundingClientRect().width > el.clientWidth - 4; };
  let f = max; el.style.fontSize = f + 'rem';
  while (over() && f > min) { f -= 0.05; el.style.fontSize = f.toFixed(2) + 'rem'; }
  // still too long: show the name before "(…)" (e.g. the level range) and keep the full name as the tooltip
  if (over() && el.textContent.includes(' (')) { el.title = el.textContent; el.textContent = el.textContent.split(' (')[0]; fitText(el, max, min); }
}
addEventListener('uiskin', () => { skinMinimap(); fitText($('mmn')); }); if (HUD.UI.man) skinMinimap();
// NPC badge over the head by role (Iris: "!" while a quest is running, "✓" when it can be turned in)
const NPC_BADGE = { iris: 'npc_quest', merchant: 'npc_shop', sage: 'npc_shop', nurse: 'npc_heal', warper: 'npc_portal' };
const ROLE_BADGE = { shop: 'npc_shop', sell: 'npc_shop', heal: 'npc_heal', teleport: 'npc_portal', gate: 'npc_portal', smith: 'npc_smith', craft: 'npc_smith', board: 'npc_quest', master: 'npc_party', inn: 'npc_talk', storage: 'npc_talk', bank: 'npc_talk' };
function drawNpcBadge(n, x, y) {
  const mk = me && me.npcq && me.npcq[n.id];
  let k = mk === 'turnin' ? 'npc_done' : mk === 'avail' ? 'npc_quest' : ROLE_BADGE[n.role] || NPC_BADGE[n.look];
  if (n.look === 'iris' && me && QN[me.q.step] != null && me.q.k >= QN[me.q.step]) k = 'npc_done';
  if (!k) return;
  const art = k && HUD.atlasCell('icons', k); if (!art) return drawExcl(x, y);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(art.im, art.sx, art.sy, art.s, art.s, Math.round(x - 12), Math.round(y - 4), 24, 24); ctx.imageSmoothingEnabled = false;
}
let portraitT = 0;
const portC = mkCanvas(64, 64);
function drawPortrait() {
  if (window.PORTRAIT && me) { PORTRAIT.setImg($('pimg'), me.portraitId, 'hud'); $('pport').classList.add('hasimg'); } // the chosen portrait (cosmetic); the sprite canvas below stays as a fallback
  const n = heroOf(me.look), L = META.lpc[n], im = img(n), g = $('portrait').getContext('2d');
  if (!L || !im || !anchorsFor(me.look.sex)) { if (!portraitT) portraitT = setTimeout(() => { portraitT = 0; drawPortrait(); }, 400); return; }
  const pg = portC.getContext('2d'); pg.imageSmoothingEnabled = false; pg.clearRect(0, 0, 64, 64);
  lastPaperSet = null;
  drawHero(me.look, 'stand', 0, 2, 32, 60, 1, me.eq.chead || me.eq.head || 0, pg, { wpn: me.eq.wpn, arm: me.eq.arm, cls: me.cls });
  if (lastPaperSet === 'hd') { pg.clearRect(0, 0, 64, 64); drawHero(me.look, 'stand', 0, 2, 32, 68, 1, me.eq.chead || me.eq.head || 0, pg, { wpn: me.eq.wpn, arm: me.eq.arm, cls: me.cls }); } // HD: same head framing
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, 32, 32); g.drawImage(portC, 16, 4, 32, 32, 0, 1, 32, 32);
}
// ------------------------------------------------------------ chat (compact 4-line log + full window with channels)
const chatLog = []; let chTab = 'all';
const CH_TAG = { world: '[โลก] ', whisper: '[กระซิบ] ', party: '[ปาร์ตี้] ', guild: '[กิลด์] ' };
const CH_NOTE = { all: 'ส่งในช่องท้องถิ่น (ผู้เล่นในแผนที่นี้) · พิมพ์ /w ชื่อ ข้อความ เพื่อกระซิบ', sys: 'ช่องนี้แสดงข้อความระบบเท่านั้น', local: 'ส่งถึงผู้เล่นในแผนที่เดียวกัน', world: 'ส่งถึงผู้เล่นทุกคนในเซิร์ฟเวอร์ (ทุก 3 วินาที)', whisper: 'ข้อความส่วนตัวถึงผู้เล่นที่ออนไลน์', party: 'ส่งถึงสมาชิกปาร์ตี้ (ชวนเข้าปาร์ตี้: แตะตัวละครผู้เล่นอื่น)', guild: 'ส่งถึงสมาชิกกิลด์' };
function addChat(ch, text, col) {
  chatLog.push({ ch, text, col }); if (chatLog.length > 150) chatLog.shift();
  renderLog(); if ($('wChat').style.display === 'block') renderChatList();
}
function log(t, col) { addChat('sys', t, col || '#ffe9a8'); }
function chatLine(e) { const d = document.createElement('div'); d.textContent = (CH_TAG[e.ch] || '') + e.text; if (e.col) d.style.color = e.col; else d.className = 'ch-' + e.ch; return d; }
function renderLog() { const l = $('log'); l.textContent = ''; for (const e of chatLog.slice(-3)) l.appendChild(chatLine(e)); } // mini chat: 3 newest, older ones dimmed by CSS
function renderChatList() {
  const l = $('chlist'); l.textContent = '';
  const list = chatLog.filter(e => chTab === 'all' || e.ch === chTab);
  for (const e of list) l.appendChild(chatLine(e));
  if (!list.length) l.innerHTML = '<div class="note">ยังไม่มีข้อความ</div>';
  l.scrollTop = l.scrollHeight;
  const locked = chTab === 'sys' || (chTab === 'party' && !(typeof PARTY !== 'undefined' && PARTY.id)) || (chTab === 'guild' && !(me && me.guild));
  $('ci').disabled = $('cs').disabled = locked;
  $('wto').style.display = chTab === 'whisper' ? 'block' : 'none';
  $('chnote').textContent = CH_NOTE[chTab] || '';
}
function onChat(m) {
  const ch = m.ch || 'local', mine = me && m.from === me.name;
  const text = ch === 'whisper' ? (mine ? `ถึง ${m.to}: ${m.m}` : `จาก ${m.from}: ${m.m}`) : `${m.from}: ${m.m}`;
  addChat(ch, text, ch === 'local' ? '#ffffff' : null);
  if (ch === 'local') bubbles.set(m.id, { m: m.m, until: performance.now() + 5000 });
  if (ch === 'whisper' && !mine && !$('wto').value) $('wto').value = m.from; // quick reply
}
function sendChat() {
  const v = $('ci').value.trim(); if (!v) return;
  let o = { t: 'chat', ch: ['world', 'whisper', 'party', 'guild'].includes(chTab) ? chTab : 'local', m: v };
  const w = /^\/w\s+(\S+)\s+(.+)$/.exec(v);
  if (w) o = { t: 'chat', ch: 'whisper', to: w[1], m: w[2] };
  else if (o.ch === 'whisper') { o.to = $('wto').value.trim(); if (!o.to) { $('chnote').textContent = 'ใส่ชื่อผู้รับก่อน'; return; } }
  send(o); $('ci').value = '';
}
function openChat(focus) { closeWins(); renderChatList(); $('wChat').style.display = 'block'; if (focus) $('ci').focus(); }
function closeWins() { for (const w of document.querySelectorAll('.win')) w.style.display = 'none'; }
document.querySelectorAll('.win .x').forEach(b => b.onclick = closeWins);
function openDlg(m) {
  closeWins(); $('dlgname').textContent = m.name; $('dlgtext').textContent = m.text; const o = $('dlgopts'); o.innerHTML = '';
  for (const [a, label] of m.opts) { const b = document.createElement('button'); b.textContent = label; b.onclick = () => send({ t: 'npcAct', id: m.npc, a }); o.appendChild(b); }
  const c = document.createElement('button'); c.textContent = 'ปิด'; c.className = 'ghost'; c.onclick = closeWins; o.appendChild(c);
  $('wDlg').style.display = 'block';
}
let shopMode = '', shopItems = [];
function openShop(m) {
  closeWins(); shopMode = m.mode; shopItems = m.items || [];
  if (m.mode === 'buy') {
    $('shopt').textContent = m.name || 'ร้านค้า'; const l = $('shoplist'); l.innerHTML = '';
    for (const it of shopItems) {
      const d = document.createElement('div'); d.className = 'li'; d.appendChild(iconCanvas(it.id));
      const info = ITEMS[it.id]; const st = statOf(info) + reqOf(info);
      d.insertAdjacentHTML('beforeend', `<div class="grow"><span class="r${info.rar | 0}">${esc(it.n)}</span><br><small class="st">${st}</small></div><span class="num" style="color:var(--gold)">${it.price}z</span>`);
      const b1 = document.createElement('button'); b1.textContent = 'ซื้อ'; b1.onclick = () => send({ t: 'buy', id: it.id, q: 1 }); d.appendChild(b1);
      if (info.ty === 'use') { const b2 = document.createElement('button'); b2.textContent = 'x10'; b2.onclick = () => send({ t: 'buy', id: it.id, q: 10 }); d.appendChild(b2); }
      l.appendChild(d);
    }
  } else renderSell();
  $('wShop').style.display = 'block';
}
function renderSell() {
  $('shopt').textContent = 'รับซื้อของ (ขายของในกระเป๋า)'; const l = $('shoplist'); l.innerHTML = '';
  me.inv.forEach((s, i) => {
    const it = ITEMS[s.id]; const d = document.createElement('div'); d.className = 'li'; d.appendChild(iconCanvas(s.id));
    d.insertAdjacentHTML('beforeend', `<div class="grow"><span class="r${it.rar | 0}">${esc(it.n)}</span> x${s.q}</div><span class="num" style="color:var(--gold)">${it.ty === 'quest' ? '—' : it.sell + 'z'}</span>`);
    if (it.ty !== 'quest') { const b = document.createElement('button'); b.textContent = s.q > 1 ? 'ขายหมด' : 'ขาย'; b.onclick = () => send({ t: 'sell', i, id: s.id, q: s.q }); d.appendChild(b); } l.appendChild(d);
  });
  if (!me.inv.length) l.textContent = 'กระเป๋าว่าง';
}
function renderBag() {
  const eg = $('eqgrid'); eg.innerHTML = '';
  for (const [k, lab] of EQS) {
    const d = document.createElement('div'); d.className = 'slot eq'; const id = me.eq[k]; if (id) d.classList.add('r' + (ITEMS[id].rar | 0));
    if (id) { d.appendChild(iconCanvas(id)); d.append(ITEMS[id].n); d.onclick = () => send({ t: 'unequip', s: k }); } else slotHint(d, k, lab);
    eg.appendChild(d);
  }
  const g = $('invgrid'); g.innerHTML = '';
  me.inv.forEach((s, i) => {
    const it = ITEMS[s.id]; const d = document.createElement('div'); d.className = 'slot r' + (it.rar | 0); d.appendChild(iconCanvas(s.id)); d.append(it.n);
    if (s.q > 1) d.insertAdjacentHTML('beforeend', `<span class="q num">${s.q}</span>`);
    d.onclick = () => itemActions(s, i);
    g.appendChild(d);
  });
}

// inventory item actions: use / equip, drop (one or the stack), quantity — the server checks everything
function itemActions(s, i) {
  const it = ITEMS[s.id], box = $('itemact'); if (!it) return;
  const act = it.ty === 'use' ? 'ใช้' : it.ty === 'eq' ? 'สวม' : '';
  box.innerHTML = `<div class="iah"></div><div class="grow"><b class="r${it.rar | 0}">${esc(it.n)}</b>${s.q > 1 ? ` <span class="num">x${s.q}</span>` : ''}<br><small class="st">${statOf(it) || (it.d ? esc(it.d) : it.ty === 'etc' ? 'วัตถุดิบ · ขายได้ ' + it.sell + 'z' : '')}${reqOf(it)}</small></div>
    <div class="iab">${act ? `<button data-a="use">${act}</button>` : ''}${it.ty !== 'quest' ? `<button data-a="drop1" class="ghost">ทิ้ง${s.q > 1 ? ' 1' : ''}</button>${s.q > 1 ? '<button data-a="drop" class="ghost">ทิ้งทั้งหมด</button>' : ''}` : ''}<button data-a="x" class="ghost">ปิด</button></div>`;
  box.querySelector('.iah').appendChild(iconCanvas(s.id));
  box.querySelectorAll('button').forEach(b => b.onclick = () => {
    const a = b.dataset.a; box.style.display = 'none';
    if (a === 'use') send({ t: 'use', i, id: s.id }); else if (a === 'drop1') send({ t: 'drop', i, id: s.id, q: 1 }); else if (a === 'drop') send({ t: 'drop', i, id: s.id });
  });
  box.style.display = 'flex';
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => Math.max(0, Math.min(100, a / b * 100));
function renderStat() {
  const N = { str: 'STR พลัง', agi: 'AGI ว่องไว', vit: 'VIT อึด', int: 'INT ปัญญา', dex: 'DEX แม่นยำ', luk: 'LUK โชค' };
  let h = `<div class="chead">${window.PORTRAIT ? '<img id="cport" class="cpimg" alt="">' : '<canvas id="cport" width="32" height="32"></canvas>'}<div><div style="font-size:1.6rem;font-weight:500">${esc(me.name)}</div><div style="color:var(--dim)">${(CLSDEF[me.cls] && CLSDEF[me.cls].th) || ''} · Lv ${me.lv} · Job Lv ${me.jlv || 1}${me.jnext ? ` (${Math.floor((me.jexp || 0) / me.jnext * 100)}%)` : ' MAX'}</div>`
    + `<div class="bar hp"><i style="width:${pct(me.hp, me.maxhp)}%"></i><b class="num">HP ${me.hp} / ${me.maxhp}</b></div><div class="bar sp"><i style="width:${pct(me.sp, me.maxsp)}%"></i><b class="num">SP ${me.sp} / ${me.maxsp}</b></div></div></div>`;
  h += `<div style="margin-bottom:8px">แต้มเหลือ: <b class="num" style="color:var(--gold)">${me.pts}</b></div><div class="stats">`;
  for (const k in N) h += `<div class="s"><span>${N[k]}</span><span class="num">${me.st[k]} <button data-s="${k}" ${me.pts ? '' : 'disabled'}>+</button></span></div>`;
  h += `</div><div class="stats" style="margin-top:10px;color:var(--dim)"><div>ATK ${me.atk}</div><div>DEF ${me.def}</div><div>HIT ${me.hit}</div><div>FLEE ${me.flee}</div><div>CRIT ${me.crit}%</div><div>ความเร็วตี ${(1000 / me.aspd).toFixed(2)}/วิ</div><div>MATK ${me.matk || 0}</div><div>MDEF ${me.mdef || 0}</div><div>ระยะตี ${me.rng || 1.6}</div><div>ธนาคาร ${(me.bank || 0).toLocaleString()}z</div></div>`;
  $('statbody').innerHTML = h;
  $('statbody').querySelectorAll('button[data-s]').forEach(b => b.onclick = () => send({ t: 'stat', s: b.dataset.s }));
  if (window.PORTRAIT) { PORTRAIT.setImg($('cport'), me.portraitId, 'hud'); const b = document.createElement('button'); b.id = 'bPortChange'; b.className = 'ghost'; b.style.cssText = 'width:100%;margin-bottom:8px'; b.textContent = '🖼 เปลี่ยนภาพตัวละคร'; b.onclick = openPortraitWin; $('statbody').insertBefore(b, $('statbody').children[1]); }
  else { const cp = $('cport').getContext('2d'); cp.imageSmoothingEnabled = false; cp.drawImage($('portrait'), 0, 0); }
}
// ---- change portrait after creation (free for now; locked portraits show 🔒 and can't be picked)
let portGal = null, portSel = null;
function openPortraitWin() {
  if (!window.PORTRAIT || !me) return;
  closeWins(); $('wPort').style.display = 'block'; portSel = me.portraitId; $('portmsg').textContent = ''; $('portname').textContent = me.name;
  const show = id => { PORTRAIT.setImg($('portimg'), id, 'hud'); $('portSave').disabled = id === me.portraitId; };
  portGal = PORTRAIT.gallery($('portgal'), { sel: portSel, char: { portraits: me.portraits || [] }, onPick: id => { portSel = id; show(id); }, onPreview: id => PORTRAIT.preview(id, me.name) });
  show(portSel);
}
$('portSave').onclick = () => { if (portSel && me && portSel !== me.portraitId) { send({ t: 'portrait', id: portSel }); $('portSave').disabled = true; } };
$('portBig').onclick = () => { if (portSel) PORTRAIT.preview(portSel, me && me.name); };
const EQS = [['wpn', 'อาวุธ'], ['head', 'หมวก'], ['arm', 'เสื้อ'], ['acc1', 'เครื่องประดับ'], ['acc2', 'เครื่องประดับ'], ['chead', 'คอสตูมหัว']];
const ST_LAB = [['atk', 'ATK'], ['matk', 'MATK'], ['def', 'DEF'], ['mdef', 'MDEF'], ['hp', 'MaxHP'], ['sp', 'MaxSP'], ['str', 'STR'], ['agi', 'AGI'], ['vit', 'VIT'], ['int', 'INT'], ['dex', 'DEX'], ['luk', 'LUK'], ['crit', 'CRIT'], ['flee', 'FLEE'], ['aspdPct', 'ASPD%']];
const statOf = it => it.ty === 'use' ? [it.heal ? `HP +${it.heal}` : '', it.sp ? `SP +${it.sp}` : '', it.recall ? 'กลับจุดเซฟ' : ''].filter(Boolean).join(' ') : it.cosmetic ? 'คอสตูม (เปลี่ยนรูปลักษณ์เท่านั้น)' : ST_LAB.filter(([k]) => it[k]).map(([k, l]) => `${l} +${it[k]}`).join(' ') + (it.range ? ` · ระยะ ${it.range}` : '');
const reqOf = it => { if (!me) return ''; const bad = it.req > me.lv; const cl = it.cls ? ' · ' + it.cls.map(k => (CLSDEF[k] && CLSDEF[k].th) || k).join('/') : ''; return (it.req > 1 || cl) ? ` <span class="${bad ? 'req' : ''}">· Lv ${it.req}+${cl}</span>` : ''; };
function renderEquip() {
  const b = $('equipbody'); b.innerHTML = `<div class="note" style="margin-bottom:6px">สวมอยู่ (แตะเพื่อถอด) · ATK ${me.atk} · MATK ${me.matk || 0} · DEF ${me.def} · MDEF ${me.mdef || 0}</div>`;
  const eg = document.createElement('div'); eg.className = 'grid';
  for (const [k, lab] of EQS) {
    const d = document.createElement('div'); d.className = 'slot eq'; const id = me.eq[k]; if (id) d.classList.add('r' + (ITEMS[id].rar | 0));
    if (id) { d.appendChild(iconCanvas(id)); d.append(ITEMS[id].n); d.onclick = () => send({ t: 'unequip', s: k }); } else slotHint(d, k === 'chead' ? 'head' : k.startsWith('acc') ? 'acc' : k, lab + ' (ว่าง)');
    eg.appendChild(d);
  }
  for (const [k, lab] of [['shield', 'โล่ / มือรอง'], ['shoes', 'รองเท้า']]) { const d = document.createElement('div'); d.className = 'slot eq locked'; slotHint(d, k, lab + ' (ยังไม่เปิด)'); eg.appendChild(d); }
  b.appendChild(eg);
  b.insertAdjacentHTML('beforeend', '<div class="note" style="margin:10px 0 6px">อุปกรณ์ในกระเป๋า (แตะเพื่อสวม)</div>');
  const l = document.createElement('div'); l.className = 'list';
  me.inv.forEach((s, i) => {
    const it = ITEMS[s.id]; if (it.ty !== 'eq') return;
    const d = document.createElement('div'); d.className = 'li'; d.appendChild(iconCanvas(s.id));
    d.insertAdjacentHTML('beforeend', `<div class="grow"><span class="r${it.rar | 0}">${esc(it.n)}</span> <small class="r${it.rar | 0}">${(RARITY[it.rar | 0] || {}).th || ''}</small><br><small class="st">${(EQS.find(e => e[0] === it.slot || (it.slot === 'acc' && e[0] === 'acc1')) || [, ''])[1]} · ${statOf(it)}${reqOf(it)}</small></div>`);
    const btn = document.createElement('button'); btn.textContent = 'สวม'; btn.onclick = () => send({ t: 'use', i, id: s.id }); d.appendChild(btn); l.appendChild(d);
  });
  if (!l.children.length) l.innerHTML = '<div class="note">ไม่มีอุปกรณ์ในกระเป๋า</div>';
  b.appendChild(l);
}
const QTYPE = { main: ['เนื้อเรื่องหลัก', 'main'], class: ['เปลี่ยนอาชีพ', 'class'], daily: ['ประจำวัน', 'daily'], delivery: ['ส่งของ', ''], collection: ['สะสม', ''], hunting: ['ล่า', ''], exploration: ['สำรวจ', ''], side: ['รอง', ''] };
function renderQuest() {
  const s = me.q.step; let h = '';
  const act = Object.entries((me.qs && me.qs.a) || {}).sort(([a], [b]) => (QDEF[a].type === 'main' ? 0 : 1) - (QDEF[b].type === 'main' ? 0 : 1));
  for (const [id, a] of act) {
    const qd = QDEF[id], ty = QTYPE[qd.type] || ['', ''];
    h += `<div class="li qcard${me.qs.t === id ? ' tr' : ''}"><b style="color:var(--gold)">${esc(qd.th)}</b><span class="tag ${ty[1]}">${ty[0]}</span><div class="qd">${esc(a.d)} <span class="num qk">${Math.min(a.k, a.n)}/${a.n}</span></div><small class="st">ขั้นที่ ${a.s + 1}/${qd.stages.length}</small>`
      + `<div class="qa">${me.qs.t === id ? '<small style="color:var(--gold)">★ กำลังติดตาม</small>' : `<button data-tr="${id}">ติดตาม</button>`}${qd.type !== 'main' ? `<button class="ghost" data-ab="${id}">ยกเลิก</button>` : ''}</div></div>`;
  }
  if (!act.length) h += '<div class="note">ไม่มีเควสที่กำลังทำ — คุยกับ NPC ที่มีเครื่องหมาย ❗ หรือกระดานประกาศ</div>';
  h += '<div class="note" style="margin:10px 0 4px;color:var(--gold)">บททดสอบของไอริส (โซลคารา)</div>';
  if (QT[s]) h += `<div class="li" style="display:block"><b style="color:var(--gold)">ภารกิจหลัก ${s + 1}/${QT.length}</b><br>${QT[s].replace('\n', '<br>')}<br>ความคืบหน้า <span class="num qk">${me.q.k}/${QN[s]}</span>${me.q.k >= QN[s] ? '<br><span style="color:#7dff8a">✔ สำเร็จ — กลับไปหาไอริสเพื่อรับรางวัล</span>' : ''}</div>`;
  else h += '<div class="li">ผ่านภารกิจหลักทั้งหมดแล้ว! รอบทต่อไปเร็วๆ นี้</div>';
  for (let i = 0; i < s && i < QT.length; i++) h += `<div class="note">✔ ${QT[i].replace('\n', ' ')}</div>`;
  const done = (me.qs && me.qs.d) || []; if (done.length) h += `<div class="note" style="margin-top:10px">สำเร็จแล้ว: ${done.map(id => QDEF[id] ? esc(QDEF[id].th) : id).join(' · ')}</div>`;
  $('questbody').innerHTML = h;
  $('questbody').querySelectorAll('[data-tr]').forEach(b => b.onclick = () => send({ t: 'quest', a: 'track', id: b.dataset.tr }));
  $('questbody').querySelectorAll('[data-ab]').forEach(b => b.onclick = () => { if (confirm('ยกเลิกเควสนี้?')) send({ t: 'quest', a: 'abandon', id: b.dataset.ab }); });
}
function renderSettings() {
  $('bindset').style.display = me && me.guest ? 'block' : 'none';
  document.querySelectorAll('#wSet .seg[data-k]').forEach(sg => sg.querySelectorAll('button').forEach(b => b.classList.toggle('on', String(HUD.S[sg.dataset.k]) === b.dataset.v)));
}
document.querySelectorAll('#wSet .seg[data-k] button').forEach(b => b.onclick = () => {
  const v = b.dataset.v; HUD.S[b.parentNode.dataset.k] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v;
  HUD.saveSettings(); resize(); renderSettings();
  if (b.parentNode.dataset.k === 'chrHD' && me) drawPortrait();
});
$('bFull').onclick = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => { }); } catch (e) { } };
const MORE = [['char', 'ตัวละคร', 'pport'], ['skill', 'สกิล', 'bSkill'], ['equip', 'อุปกรณ์', 'bEquip'], ['bag', 'กระเป๋า', 'bBag'], ['quest', 'เควส', 'bQuest'], ['map', 'แผนที่', 'bMap'],
  ['party', 'ปาร์ตี้', 'bParty'], ['guild', 'กิลด์', 'bGuild'], ['auto', 'ออโต้', 'bAuto'], ['chat', 'แชท', 'bChat'], ['gear', 'ตั้งค่า', 'bSet'], ['quest', 'อันดับ', () => openRank()],
  ['quest', 'เครดิตภาพ', () => open('credits.html', '_blank')], ['more', 'ออกจากระบบ', () => { if (!confirm(me && me.guest ? 'ออกจากระบบ? (บัญชี Guest ยังเข้าต่อได้จากเครื่องนี้ แต่ถ้าล้างข้อมูลเบราว์เซอร์จะหาย — ผูกบัญชีได้ที่ ตั้งค่า)' : 'ออกจากระบบ?')) return; const sv = store.get('ely_session'); if (sv && me && !me.guest) { send({ t: 'revoke', tok: sv.tok }); store.set('ely_session', null); } setTimeout(() => { me = null; try { ws.close(); } catch (e) { } location.reload(); }, 150); }]];
function renderMore() {
  const g = $('moregrid'); g.innerHTML = '';
  for (const [ic, lab, act] of MORE) {
    const b = document.createElement('button'); b.dataset.icon = ic; b.textContent = lab;
    if (lab === 'ออกจากระบบ') b.dataset.skin = 'npc_portal'; // "leave the world"; the grid art means "More"
    b.onclick = () => { closeWins(); typeof act === 'function' ? act() : $(act).click(); };
    g.appendChild(b);
  }
  HUD.applyIcons(g);
}
const toggleWin = (w, f) => () => { const v = $(w).style.display === 'block'; closeWins(); if (!v) { f && f(); $(w).style.display = 'block'; } };
$('bBag').onclick = toggleWin('wBag', renderBag);
$('pport').onclick = toggleWin('wStat', renderStat);
$('bMap').onclick = $('mm').onclick = toggleWin('wMap', () => renderBigMap()); // renderBigMap lives in world.js
$('bEquip').onclick = toggleWin('wEquip', renderEquip);
$('bQuest').onclick = toggleWin('wQuest', renderQuest); $('quest').onclick = e => { if (!e._fold) $('bQuest').onclick(); };
// chevron folds the tracker; a folded tracker unfolds on any tap; the rest opens the quest window
const qFold = e => { e.stopPropagation(); e._fold = 1; HUD.S.qCol = !HUD.S.qCol; HUD.saveSettings(); if (me) updQuestTrack(); };
$('qtog').onclick = qFold; $('quest').addEventListener('click', e => { if (HUD.S.qCol) qFold(e); }, true);
$('bParty').onclick = toggleWin('wParty', () => { renderParty(); send({ t: 'party', a: 'view' }); });
$('bGuild').onclick = toggleWin('wGuild', () => { renderGuild(); send({ t: 'guild', a: 'view' }); });
$('bSet').onclick = toggleWin('wSet', renderSettings);
$('bMore').onclick = toggleWin('wMore', renderMore);
$('log').onclick = $('bChat').onclick = () => openChat(false);
$('chtabs').querySelectorAll('button').forEach(b => b.onclick = () => { chTab = b.dataset.ch; $('chtabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); renderChatList(); });
function nearest(kind, maxd = 12) { const m = ents.get(myId); if (!m) return 0; let best = 0, bd = maxd; for (const [id, e] of ents) { if (e.kind !== kind) continue; const d = Math.hypot(e.x - m.x, e.y - m.y); if (d < bd) { bd = d; best = id; } } return best; }
function setAuto(v) { auto = v; $('bAuto').classList.toggle('on', v); $('bAutoT').classList.toggle('on', v); if (typeof acPanel === 'function') acPanel(); }
$('bAutoT').onclick = () => $('bAuto').click();
function toggleAuto() { setAuto(!auto); log(auto ? 'เปิดโหมดออโต้ — ตีมอนใกล้ๆ อัตโนมัติ' : 'ปิดโหมดออโต้', '#9fe7ff'); }
$('bAuto').onclick = toggleAuto;
$('bRes').onclick = () => { send({ t: 'respawn' }); $('dead').style.display = 'none'; };
$('cs').onclick = () => { sendChat(); $('ci').focus(); }; // keep typing after pressing ส่ง
$('ci').onkeydown = $('wto').onkeydown = e => {
  if (e.key === 'Enter') sendChat();
  if (e.key === 'Escape') { closeWins(); e.target.blur(); }
  // Tab stays inside the chat (name <-> message); letting focus escape would hand the next keys to the game
  if (e.key === 'Tab') { e.preventDefault(); if ($('wto').style.display === 'block') (e.target === $('ci') ? $('wto') : $('ci')).focus(); }
  e.stopPropagation();
};

// ------------------------------------------------------------ input
const toArt = (cx, cy) => [(cx * DPR) / Z, (cy * DPR) / Z]; // css -> art screen
function viewOrigin() { return [Math.round(VW / 2 - cam.x), Math.round(VH / 2 - cam.y)]; }
// what is under a screen point: [id, kind] of the closest monster / loot / NPC, plus the world point
function pickAt(clientX, clientY, npcs = true) {
  const [ax, ay] = toArt(clientX, clientY); const [ox, oy] = viewOrigin();
  const wx = ax - ox, wy = ay - oy;
  let best = null, bs = 1e9;
  const test = (id, en, kind, hgt, wid) => {
    const sx = (en.x + 0.5) * TP, sy = (en.y + 0.5) * TP + 12;
    // loot under a monster loses the tie: in a fight you want the monster (loot has the Interact button)
    if (wx > sx - wid && wx < sx + wid && wy > sy - hgt && wy < sy + 8) { const s = Math.hypot(wx - sx, wy - (sy - hgt / 2)) + (kind === 'd' ? 16 : 0); if (s < bs) { bs = s; best = [id, kind]; } }
  };
  // hit boxes a little larger than the sprites so monsters are easy to tap; the closest centre wins
  for (const [id, en] of ents) { if (id === myId) continue; if (en.kind === 'p') { if (npcs) test(id, en, 'p', 46, 15); continue; } if (en.kind === 'd') test(id, en, 'd', 22, 14); else { const sc = en.type === 'kingjel' ? 1.55 : Math.max(1, mobScale(en.type)); test(id, en, 'm', Math.round(50 * sc), Math.round(26 * Math.min(sc, 1.8))); } }
  if (npcs) for (const nd of map.nodes || []) test(nd.id, nd, 'o', 30, 16);
  if (npcs) for (const n of map.npcs) test(n.id, n, 'n', 52, 18);
  return { best, wx, wy };
}
cv.addEventListener('pointerdown', e => {
  if (!map || !me) return;
  $('ci').blur();
  const { best, wx, wy } = pickAt(e.clientX, e.clientY, !joy);
  if (joy && (!best || best[1] !== 'm')) return; // second finger while walking: target monsters only
  if (best) {
    const [id, kind] = best;
    if (kind === 'm') { if (id === selected && me.hp > 0) send({ t: 'attack', id }); else setTarget(id); }
    else if (kind === 'd') send({ t: 'pick', id });
    else if (kind === 'o') send({ t: 'node', id });
    else if (kind === 'p') openPlayerMenu(id);
    else send({ t: 'npc', id });
    return;
  }
  const tx = Math.floor(wx / TP), ty = Math.floor(wy / TP);
  clickMark = { x: tx, y: ty, t: performance.now() };
  if (typeof aqPause === 'function') aqPause();
  send({ t: 'move', x: tx, y: ty });
});
// ------------------------------------------------------------ joystick (floating, 8 directions) + keyboard
let joy = null;
const JZ = $('joyzone'), J = $('joy'), K = $('knob');
JZ.addEventListener('pointerdown', e => {
  if (joy || !me) return; e.preventDefault(); try { JZ.setPointerCapture(e.pointerId); } catch (er) { }
  const zr = JZ.getBoundingClientRect(), jr = J.getBoundingClientRect(), R = jr.width / 2;
  let cx = jr.left + R, cy = jr.top + R;
  if (HUD.S.joy !== 'fixed') { // floating: the base jumps under the finger (kept inside the zone)
    cx = Math.max(zr.left + R, Math.min(zr.right - R, e.clientX)); cy = Math.max(zr.top + R, Math.min(zr.bottom - R, e.clientY));
    J.style.left = (cx - zr.left - R) + 'px'; J.style.top = (cy - zr.top - R) + 'px'; J.style.bottom = 'auto';
  }
  joy = { id: e.pointerId, cx, cy, R, dx: 0, dy: 0 }; J.classList.add('act'); joyMove(e);
});
JZ.addEventListener('pointermove', e => { if (joy && e.pointerId === joy.id) joyMove(e); });
const joyEnd = e => { if (!joy || e.pointerId !== joy.id) return; joy = null; K.style.transform = ''; J.classList.remove('act'); J.style.left = J.style.top = J.style.bottom = ''; walkTick(); };
JZ.addEventListener('pointerup', joyEnd); JZ.addEventListener('pointercancel', joyEnd); JZ.addEventListener('lostpointercapture', joyEnd);
function joyMove(e) {
  let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const R = joy.R * 0.62, l = Math.hypot(dx, dy);
  if (l > R) { dx *= R / l; dy *= R / l; }
  K.style.transform = `translate(${dx}px,${dy}px)`; joy.dx = dx / R; joy.dy = dy / R;
  walkTick();
}
const SOLID_T = new Set([2, 3, 5, 6, 7, 9]); // same as server SOLID
const DIR8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
function tileFree(x, y) { return !!map && x >= 0 && y >= 0 && x < map.w && y < map.h && !SOLID_T.has(map.t[y * map.w + x]) && !map.npcs.some(n => n.x === x && n.y === y); }
function stepOk(x, y, dx, dy) { return tileFree(x + dx, y + dy) && (!(dx && dy) || (tileFree(x + dx, y) && tileFree(x, y + dy))); }
// a reachable tile 1-2 steps away in the wanted direction; slides along walls instead of stopping dead
function walkTarget(dx, dy) {
  const e = ents.get(myId); if (!e) return null; const x = Math.round(e.tx), y = Math.round(e.ty);
  const tries = dx && dy ? [[dx, dy], [dx, 0], [0, dy]] : dx ? [[dx, 0], [dx, 1], [dx, -1]] : [[0, dy], [1, dy], [-1, dy]];
  for (const [ax, ay] of tries) if (stepOk(x, y, ax, ay)) return stepOk(x + ax, y + ay, ax, ay) ? [x + ax * 2, y + ay * 2] : [x + ax, y + ay];
  return null;
}
const keys = {};
function inputDir() {
  let dx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), dy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if (joy && Math.hypot(joy.dx, joy.dy) > 0.28) [dx, dy] = DIR8[(Math.round(Math.atan2(joy.dy, joy.dx) / (Math.PI / 4)) + 8) % 8];
  return dx || dy ? DIR8.findIndex(d => d[0] === dx && d[1] === dy) : -1;
}
let walkDir = -1, walkAt = 0;
function walkTick() {
  if (!me || !map || me.hp <= 0) return;
  const d = inputDir(), t = performance.now();
  if (d < 0) { // released: stop on the nearest tile instead of finishing the 2-tile look-ahead
    if (walkDir >= 0) { const [dx, dy] = DIR8[walkDir], e = ents.get(myId); walkDir = -1; if (e) send({ t: 'move', x: Math.round(e.tx + dx * 0.45), y: Math.round(e.ty + dy * 0.45) }); }
    return;
  }
  if (typeof aqPause === 'function') aqPause();
  if (t - walkAt < (d === walkDir ? 180 : 70)) return;
  walkDir = d; walkAt = t;
  const tg = walkTarget(...DIR8[d]); if (tg) send({ t: 'move', x: tg[0], y: tg[1] });
}
setInterval(walkTick, 100);
addEventListener('keydown', e => {
  if (!me || document.activeElement instanceof HTMLInputElement) return; // login form / chat box: no game keys
  if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#wChat')) { if (e.key === 'Escape') closeWins(); return; } // anything focused in the chat window
  const k = e.key.toLowerCase(); keys[k] = 1;
  if (k === 'tab' || k === ' ' || k === 'enter') e.preventDefault();
  if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur(); // Space must not also "click" a focused HUD button
  if (e.repeat && k !== ' ') return;
  if (k === 'enter') openChat(true);
  if (k === 'escape') { if ([...document.querySelectorAll('.win')].some(w => w.style.display === 'block')) closeWins(); else clearTarget(); }
  if (k === 'tab') cycleTarget(e.shiftKey ? -1 : 1);
  if (k >= '1' && k <= '6') useSlot(+k - 1); if (k === 'q') useSlot(0);
  if (k === 'r') $('bPot').click(); if (k === 'f') $('bInt').click(); if (k === 'k') $('bSkill').click();
  if (k === 'i') $('bBag').click(); if (k === 'c') $('pport').click(); if (k === 'm') $('bMap').click();
  if (k === ' ') doAttack();
  walkTick();
});
addEventListener('blur', () => { for (const k in keys) keys[k] = 0; }); // don't keep walking after alt-tab
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = 0; walkTick(); });

// ------------------------------------------------------------ render
// players and NPCs share one soft oval shadow (never baked into the sprites): faint wide oval + darker core
function charShadow(x, y) { shadowA(x, y, 12, 0.14); shadowA(x, y, 8, 0.2); }
function shadowA(x, y, rw, a) { ctx.fillStyle = `rgba(16,20,10,${a})`; const rh = Math.max(2, Math.round(rw * 0.38)); for (let i = -rh; i <= rh; i++) { const w = Math.round(rw * Math.sqrt(1 - (i / (rh + 0.5)) ** 2)); ctx.fillRect(Math.round(x) - w, Math.round(y) + i, w * 2, 1); } }
// elite monsters: a pulsing gold ring on the ground (between normal monsters and bosses)
function eliteRing(x, y, sc, tn) { const r = Math.round(13 * Math.max(1, sc)), a = 0.55 + Math.sin(tn * 4) * 0.25; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
function shadow(x, y, rw) { ctx.fillStyle = 'rgba(16,20,10,0.3)'; const rh = Math.max(2, Math.round(rw * 0.4)); for (let i = -rh; i <= rh; i++) { const w = Math.round(rw * Math.sqrt(1 - (i / (rh + 0.5)) ** 2)); ctx.fillRect(Math.round(x) - w, Math.round(y) + i, w * 2, 1); } }
function entAnim(e, name, tn) {
  if (e.dead) return ['hurt', tn - (e.dieT || tn - 9)];
  if (e.atkT && tn - e.atkT < 0.45) return ['atk', tn - e.atkT];
  if (e.moving) return ['walk', tn + e.ph];
  return [META.lpc[name] ? 'stand' : 'idle', tn + e.ph];
}
const labels = []; // text drawn later at device res: [x,y,text,color,kind]
let lastT = performance.now(), fpsN = 0, fpsT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t; const tn = t / 1000;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  if (!map || !ground) { drawTitle(t); return; }
  fpsN++; if (t - fpsT > 500) { const f = $('fps'); f.style.display = HUD.S.fps ? 'block' : 'none'; if (HUD.S.fps) f.textContent = Math.round(fpsN * 1000 / (t - fpsT)) + ' FPS'; fpsN = 0; fpsT = t; }
  for (const e of ents.values()) {
    const k = Math.min(1, dt * 12), dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
    if (d > 4) { e.x = e.tx; e.y = e.ty; } else { e.x += dx * k; e.y += dy * k; }
    e.moving = d > 0.06; if (d > 0.12) e.row = row4(dx, dy);
  }
  const mine = ents.get(myId);
  if (mine) { const tx = (mine.x + 0.5) * TP, ty = (mine.y + 0.5) * TP; cam.x += (tx - cam.x) * Math.min(1, dt * 9); cam.y += (ty - cam.y) * Math.min(1, dt * 9); }
  ctx.fillStyle = envOf(map).bg; ctx.fillRect(0, 0, DW, DH);
  ctx.setTransform(Z, 0, 0, Z, 0, 0); ctx.imageSmoothingEnabled = false;
  const [ox, oy] = viewOrigin();
  ctx.drawImage(ground, ox, oy);
  ctx.translate(ox, oy);
  const vx0 = -ox - 64, vy0 = -oy - 32, vx1 = -ox + VW + 64, vy1 = -oy + VH + 200;
  // water glints
  for (let i = 0; i < waterPx.length; i += 2) { const x = waterPx[i], y = waterPx[i + 1]; if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue; const ph = (tn * 0.8 + hash(x, y) * 5) % 2.5; if (ph < 1) { ctx.fillStyle = ph < 0.5 ? '#e8f6ff' : '#a8d4f5'; ctx.fillRect(x - 2, y, 5, 1); if (ph < 0.5) ctx.fillRect(x, y - 1, 1, 1); } }
  // portals: magic circles
  for (const p of portals) drawMagicCircle(p.x, p.y, tn);
  if (clickMark && t - clickMark.t < 600) { const a = (t - clickMark.t) / 600; ctx.fillStyle = `rgba(255,236,150,${1 - a})`; const cx = clickMark.x * TP + 16, cy = clickMark.y * TP + 16, r = Math.round(4 + a * 8); ctx.fillRect(cx - r, cy, 3, 1); ctx.fillRect(cx + r - 2, cy, 3, 1); ctx.fillRect(cx, cy - r, 1, 3); ctx.fillRect(cx, cy + r - 2, 1, 3); }
  labels.length = 0; if (V) V.frame();
  const list = [];
  for (const p of props) if (p.x > vx0 - 140 && p.x < vx1 + 140 && p.y > vy0 && p.y < vy1 + 60) list.push({ y: p.sort ?? p.y, f: () => { if (p.sh) shadow(p.x, p.y, p.sh); if (!drawProp(p.n, p.x, p.y, p.tree ? canopyAlpha(p) : 1) && p.fb && META.px[p.fb]) { if (p.fsh) shadow(p.x, p.y - 4, p.fsh); drawProp(p.fb, p.x, p.y + (p.fy || 0) - (p.tree ? 4 : 0)); } } });
  for (const n of map.npcs) {
    const x = (n.x + 0.5) * TP, y = (n.y + 0.5) * TP + 12;
    list.push({ y, f: () => {
      const person = n.look && typeof n.look === 'object';
      if (person) { charShadow(x, y); if (n.look.aura) drawAura(ctx, x, y, n.look.aura, tn, false); } else shadow(x, y, 9);
      lastPaperSet = null; drawNpc(n, x, y, tn);
      if (person && n.look.aura) drawAura(ctx, x, y, n.look.aura, tn, true);
      const top = person && (lastPaperSet === 'hd' || lastPaperSet === 'lpc') ? heroTopOf(lastPaperSet, n.look.head) + 20 : 60; // the 24px badge sits fully above the head / headgear
      const b = Math.round(Math.sin(tn * 4) * 2); drawNpcBadge(n, x, y - top + b); labels.push([x, y + 6, n.label, '#ffe08a', 'npc']); } });
  }
  drawNodes(list, vx0, vy0, vx1, vy1, tn, t);
  for (const [id, e] of ents) {
    const x = (e.x + 0.5) * TP, y = (e.y + 0.5) * TP + 12;
    if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    if (e.kind === 'd') list.push({ y: y - 6, f: () => { const bob = Math.round(Math.sin(tn * 3 + id)); shadow(x, y - 6, 5); const ia = itemArt(e.item), art = !(ia && ia.complete && ia.naturalWidth) && (HUD.atlasCell('items', String(e.item)) || HUD.atlasCell('items_lpc', String(e.item)));
        if (ia && ia.complete && ia.naturalWidth) { ctx.imageSmoothingEnabled = true; ctx.drawImage(ia, Math.round(x - 11), Math.round(y - 26 + bob), 22, 22); ctx.imageSmoothingEnabled = false; }
        else if (art) { ctx.imageSmoothingEnabled = art.s > 40; ctx.drawImage(art.im, art.sx, art.sy, art.s, art.s, Math.round(x - 10), Math.round(y - 25 + bob), 20, 20); ctx.imageSmoothingEnabled = false; }
        else ctx.drawImage(icon16(e.item), Math.round(x - 8), Math.round(y - 22 + bob)); if (Math.floor(tn * 2 + id) % 4 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x + 4), Math.round(y - 22 + bob), 1, 1); } } });
    else if (e.kind === 'm') list.push({ y, f: () => {
      const nm = mobSprite(e.type) || 'm_' + e.type, sc = mobScale(e.type), big = e.type === 'kingjel' || mobBig(e.type);
      if (id === selected) drawTargetMarker(x, y, big ? 30 : 14, tn, e.tg === myId || !!(MOBN[e.type] && MOBN[e.type].aggro));
      shadow(x, y, big ? Math.round(11 * Math.max(sc, 2.5)) : Math.round(11 * sc));
      if (MOBN[e.type] && MOBN[e.type].elite) eliteRing(x, y, sc, tn);
      const [an, at] = entAnim(e, nm, tn);
      const fl = e.hurtT && tn - e.hurtT < 0.1;
      if (fl) ctx.filter = 'brightness(2.2)';
      if (sc !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); drawChar(nm, an, at, e.row ?? 2, 0, 0); ctx.restore(); } else drawChar(nm, an, at, e.row ?? 2, x, y);
      if (fl) ctx.filter = 'none';
      const info = MOBN[e.type]; const hh = Math.round((e.type === 'kingjel' ? 92 : (META.lpc[nm] ? 56 : 34)) * (e.type === 'kingjel' ? 1 : sc));
      if (V && e.st) V.status(ctx, x, y, hh, e.st, tn); // poison bubbles, burn, stun stars, slow ring ...
      if (id === selected || e.tg === myId || (e.hitT && tn - e.hitT < 4) || (info && (info.boss || info.elite))) hpBar(x, y - hh, e.hp / e.maxhp, big ? 40 : 22, '#e5484d'); // in combat / targeted / bosses
      if (info && HUD.S.names) labels.push([x, y + 6, info.elite ? `★ ${info.n}` : `${info.n}`, info.boss ? '#ff8b8b' : info.elite ? '#ffd34d' : '#ffffff', info.boss || info.elite ? 'boss' : 'mob', info.lv]);
    } });
    else if (e.kind === 'p') list.push({ y, f: () => {
      const nm = heroOf(e.look); charShadow(x, y);
      const [an, at] = entAnim(e, nm, tn);
      if (e.look && e.look.aura) drawAura(ctx, x, y, e.look.aura, tn, false);
      lastPaperSet = null;
      drawHero(e.look, an, at, e.row ?? 2, x, y, 1, e.head, ctx, { wpn: e.wpn, arm: e.arm, cls: e.cls });
      if (V && id === myId && me) V.buffs(ctx, x, y, me.buffs, tn); // my shield / wind / veil, faint so the hero stays visible
      e.top = lastPaperSet === 'hd' || lastPaperSet === 'lpc' ? heroTopOf(lastPaperSet, typeof e.head === 'string' ? e.head : (e.head && ITEMS[e.head] && ITEMS[e.head].vis) || '') : 60;
      if (e.look && e.look.aura) drawAura(ctx, x, y, e.look.aura, tn, true);
      hpBar(x, y + 4, e.hp / e.maxhp, 24, '#58d65a');
      if (HUD.S.names || id === myId) { labels.push([x, y + 10, e.name, id === myId ? '#9fe7ff' : e.party && typeof PARTY !== 'undefined' && e.party === PARTY.id ? '#7dffb0' : '#c8f7c5', 'pc']); if (e.guild) labels.push([x, y + 22, `<${e.guild}>`, '#ffd98a', 'pc']); }
      const b = bubbles.get(id); if (b && b.until > t) labels.push([x, y - e.top, b.m, '#2a1f3a', 'bubble']);
    } });
  }
  for (let i = ghosts.length - 1; i >= 0; i--) {
    const g = ghosts[i], age = tn - g.dieT; if (age > 1.4) { ghosts.splice(i, 1); continue; }
    const x = (g.x + 0.5) * TP, y = (g.y + 0.5) * TP + 12;
    list.push({ y: y - 1, f: () => { const sc = mobScale(g.type), nm = mobSprite(g.type) || 'm_' + g.type; if (sc !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); drawChar(nm, 'hurt', age, g.row ?? 2, 0, 0, Math.min(1, (1.4 - age) / 0.5)); ctx.restore(); } else drawChar(nm, 'hurt', age, g.row ?? 2, x, y, Math.min(1, (1.4 - age) / 0.5)); } });
  }
  if (V) V.drawGround(ctx); // skill circles / dust on the ground
  for (const f of fx) if (f.k === 'aoe') drawAoe(f, t - f.t); // boss slam warnings lie on the ground, under everyone — drawn after the skill VFX so nothing hides them (no quality setting turns them off)
  for (const f of fx) if (f.k === 'aoe2') drawSkillArea(f, t - f.t);
  for (const [id, d] of DEVS) { if (t > d.until) { DEVS.delete(id); continue; } drawDevice(d, tn); }
  list.sort((a, b) => a.y - b.y);
  for (const o of list) o.f();
  // fx in art space
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i], age = t - f.t;
    if (f.k === 'slash') {
      if (age > 260) { fxFree(i); continue; }
      const x = (f.x + 0.5) * TP, y = (f.y + 0.5) * TP - 6, p = age / 260;
      ctx.fillStyle = f.skill ? '#ffb347' : f.crit ? '#ffe066' : '#ffffff';
      const n = 7, dir = f.r > 0.5 ? 1 : -1;
      for (let j = 0; j < n; j++) { const q = j / n; if (q > p * 1.6) break; ctx.globalAlpha = 1 - p; ctx.fillRect(Math.round(x + (q - 0.5) * 26 * dir), Math.round(y - 12 + q * 22), 3, 2); }
      ctx.globalAlpha = 1;
      if (f.skill || f.crit) for (let j = 0; j < 8; j++) { const a = j / 8 * 6.283, r = 4 + p * 16; ctx.fillStyle = j % 2 ? '#fff6b0' : '#ff9f43'; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 2); }
    } else if (f.k === 'lvup' || f.k === 'heal') {
      const dur = f.k === 'lvup' ? 1800 : 800; if (age > dur) { fxFree(i); continue; }
      const e = ents.get(f.id); if (!e) continue; const x = (e.x + 0.5) * TP, y = (e.y + 0.5) * TP + 12;
      if (f.k === 'lvup') drawMagicCircle(x, y - 2, tn, 0.6, '#ffd34d');
      for (let j = 0; j < 14; j++) { const ph = (age / dur + j / 14) % 1; ctx.globalAlpha = 1 - ph; ctx.fillStyle = f.k === 'lvup' ? (j % 2 ? '#ffd34d' : '#fff6b0') : f.buff ? (j % 2 ? '#7fd4ff' : '#e6f8ff') : (j % 2 ? '#7bd67b' : '#d6ffd6'); ctx.fillRect(Math.round(x + Math.sin(j * 2.3 + age / 200) * 12), Math.round(y - ph * 56), 2, 2); }
      ctx.globalAlpha = 1;
      if (f.k === 'lvup') labels.push([x, y - (e.top || 60) - 10, f.cls ? 'CLASS CHANGE!' : 'LEVEL UP!', '#ffd34d', 'big']);
    } else if (f.k === 'sname') { // skill name over the caster
      if (age > 900) { fxFree(i); continue; }
      const e = ents.get(f.id); if (e) labels.push([(e.x + 0.5) * TP, (e.y + 0.5) * TP + 12 - (e.kind === 'p' && e.top ? e.top + 14 : 74) - age / 60, f.v, '#ffe39a', 'sname']);
    } else if (f.k === 'proj') { // small bolt flying to the target
      if (age > 260) { fxFree(i); continue; }
      const a = ents.get(f.from), b = ents.get(f.to); if (!a || !b) continue; const p = age / 260;
      const x = ((a.x + (b.x - a.x) * p) + 0.5) * TP, y = ((a.y + (b.y - a.y) * p) + 0.5) * TP - 10;
      ctx.fillStyle = f.col || '#a8d0ff'; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 2, 6, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    } else if (f.k === 'aoe2') { if (age > f.ms + 200) fxFree(i);
    } else if (f.k === 'beam') { // chain lightning / turret shot: a short line to the target
      if (age > 220) { fxFree(i); continue; }
      const b = ents.get(f.to); if (!b) continue; const x0 = (f.x + 0.5) * TP, y0 = (f.y + 0.5) * TP, x1 = (b.x + 0.5) * TP, y1 = (b.y + 0.5) * TP - 10;
      ctx.globalAlpha = 1 - age / 220; ctx.fillStyle = f.col; const n = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 4));
      for (let j = 0; j <= n; j++) { const q = j / n, jx = f.zig ? (Math.sin(j * 2.7 + age) * 3) : 0; ctx.fillRect(Math.round(x0 + (x1 - x0) * q + jx), Math.round(y0 + (y1 - y0) * q), 2, 2); }
      ctx.globalAlpha = 1;
    } else if (f.k === 'aoe') { // drawn under the characters (see drawAoe); only expires here
      if (age > f.ms + 250) { fxFree(i); continue; }
    } else if (f.k === 'aoe_') {
      const x = (f.x + 0.5) * TP, y = (f.y + 0.5) * TP + 8, R = f.r * TP, p = Math.min(1, age / f.ms);
      ctx.globalAlpha = age > f.ms ? 0.7 : 0.35; ctx.fillStyle = '#ff3b3b';
      for (let yy = -R * 0.5; yy <= R * 0.5; yy++) { const w = R * Math.sqrt(Math.max(0, 1 - (yy / (R * 0.5)) ** 2)); ctx.fillRect(Math.round(x - w), Math.round(y + yy), Math.round(w * 2), 1); }
      ctx.globalAlpha = 0.8; ctx.fillStyle = '#ffd34d';
      for (let j = 0; j < 40; j++) { const a = j / 40 * 6.283; ctx.fillRect(Math.round(x + Math.cos(a) * R * p), Math.round(y + Math.sin(a) * R * 0.5 * p), 2, 1); }
      ctx.globalAlpha = 1;
    } else if (f.k === 'ring') { // cleave sweep around the caster
      if (age > 300) { fxFree(i); continue; }
      const e = ents.get(f.id); if (!e) continue; const x = (e.x + 0.5) * TP, y = (e.y + 0.5) * TP + 6, r = 14 + age / 300 * 30;
      ctx.globalAlpha = 1 - age / 300; ctx.fillStyle = f.col || '#ffd34d';
      for (let j = 0; j < 24; j++) { const a = j / 24 * 6.283 + age / 80; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.5), 2, 2); }
      ctx.globalAlpha = 1;
    }
  }
  if (V) V.draw(ctx); // skill VFX above the characters
  // ---- overlay text at device resolution
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawLight(t);
  const S = DPR, A2D = (x, y) => [(x + ox) * Z, (y + oy) * Z];
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const [x, y, txt, col, kind, lv] of labels) {
    const [X, Y] = A2D(x, y);
    if (kind === 'bubble') { bubble(X, Y, txt); continue; }
    if (kind === 'big') { ctx.font = `700 ${18 * S}px 'Pixelify Sans',Mitr`; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 4 * S; ctx.strokeText(txt, X, Y); ctx.fillStyle = col; ctx.fillText(txt, X, Y); continue; }
    if (kind === 'sname') { ctx.font = `600 ${12 * S}px Mitr,sans-serif`; ctx.strokeStyle = '#1a0f22'; ctx.lineWidth = 3 * S; ctx.strokeText(txt, X, Y); ctx.fillStyle = col; ctx.fillText(txt, X, Y); continue; }
    ctx.font = `${kind === 'npc' ? 500 : 400} ${11 * S}px Mitr,sans-serif`;
    const tx = kind === 'mob' || kind === 'boss' ? `${txt}` : txt;
    const w = ctx.measureText(tx).width;
    if (kind === 'npc') { // nameplate under the feet: name, then the role on its own line (anchored to the NPC every frame)
      const mm = /^\[(.+?)\]\s*(.+)$/.exec(txt || ''), nm = mm ? mm[2] : txt, role = mm ? mm[1] : '';
      ctx.font = `500 ${11 * S}px Mitr,sans-serif`; const w1 = Math.min(130 * S, ctx.measureText(nm).width);
      ctx.font = `400 ${9 * S}px Mitr,sans-serif`; const w2 = role ? Math.min(130 * S, ctx.measureText('[' + role + ']').width) : 0;
      const bw = Math.max(w1, w2) + 10 * S, bh = (role ? 26 : 15) * S;
      ctx.fillStyle = 'rgba(14,18,38,0.82)'; ctx.fillRect(X - bw / 2, Y + 2 * S, bw, bh); ctx.fillStyle = '#e8c46a'; ctx.fillRect(X - bw / 2, Y + 2 * S, bw, 1 * S);
      ctx.font = `500 ${11 * S}px Mitr,sans-serif`; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3 * S; ctx.strokeText(nm, X, Y + 10 * S, 130 * S); ctx.fillStyle = col; ctx.fillText(nm, X, Y + 10 * S, 130 * S);
      if (role) { ctx.font = `400 ${9 * S}px Mitr,sans-serif`; ctx.strokeText('[' + role + ']', X, Y + 21 * S, 130 * S); ctx.fillStyle = '#9fd8ff'; ctx.fillText('[' + role + ']', X, Y + 21 * S, 130 * S); }
      continue;
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3 * S; ctx.strokeText(tx, X, Y + 10 * S); ctx.fillStyle = col; ctx.fillText(tx, X, Y + 10 * S);
    if (lv != null) { ctx.font = `${9 * S}px 'Pixelify Sans',monospace`; ctx.strokeText('Lv' + lv, X, Y + 22 * S); ctx.fillStyle = '#c9c2b0'; ctx.fillText('Lv' + lv, X, Y + 22 * S); }
  }
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; if (f.k !== 'num') continue; const age = t - f.t; if (age > 1000) { fxFree(i); continue; }
    const p = age / 1000; const [X0, Y0] = A2D((f.x + 0.5) * TP, (f.y + 0.5) * TP - 30 - (f.stack || 0) * 11);
    const X = X0 + p * 18 * S, Y = Y0 - Math.sin(Math.min(1, p * 1.6) * Math.PI) * 26 * S + p * 14 * S;
    const sz = (f.big ? 22 : 16) * S * (p < 0.1 ? 1 + (0.1 - p) * 5 : 1);
    ctx.font = `700 ${Math.round(sz)}px 'Pixelify Sans',Mitr,monospace`; ctx.globalAlpha = Math.min(1, (1 - p) * 3);
    ctx.strokeStyle = '#1a0f22'; ctx.lineWidth = 4 * S; ctx.strokeText(f.v, X, Y); ctx.fillStyle = f.col; ctx.fillText(f.v, X, Y); ctx.globalAlpha = 1;
  }
  if (typeof drawQuestArrow === 'function') drawQuestArrow(A2D, S);
  ctx.textBaseline = 'alphabetic';
  drawMinimap();
  combatFrame();
  snd('frame', t);
}
function drawExcl(x, y) { x = Math.round(x); y = Math.round(y); ctx.fillStyle = '#3a2410'; ctx.fillRect(x - 3, y - 1, 6, 12); ctx.fillRect(x - 3, y + 12, 6, 5); ctx.fillStyle = '#ffd34d'; ctx.fillRect(x - 2, y, 4, 10); ctx.fillRect(x - 2, y + 13, 4, 3); ctx.fillStyle = '#fff6b0'; ctx.fillRect(x - 2, y, 1, 8); }
function hpBar(x, y, r, w, col) { x = Math.round(x - w / 2); y = Math.round(y); ctx.fillStyle = '#10131f'; ctx.fillRect(x - 1, y - 1, w + 2, 5); ctx.fillStyle = '#3a1620'; ctx.fillRect(x, y, w, 3); ctx.fillStyle = col; ctx.fillRect(x, y, Math.max(0, Math.round(w * r)), 3); ctx.fillStyle = '#ffffff55'; ctx.fillRect(x, y, Math.max(0, Math.round(w * r)), 1); }
// target marker: art rune ring at the feet + arrow over the head (red = fighting you / aggressive, blue = passive);
// falls back to the pixel ring below while the art isn't loaded
function drawTargetMarker(x, y, r, tn, hostile) {
  const ring = HUD.atlasCell('icons', hostile ? 'tgt_ring_red' : 'tgt_ring_blue'), arr = HUD.atlasCell('icons', 'tgt_arrow');
  if (!ring || !arr) return drawTargetRing(x, y, r, tn);
  ctx.imageSmoothingEnabled = true; // painted art, not pixel art: smooth when scaling down
  const w = Math.round(r * 3.4 * (1 + Math.sin(tn * 5) * 0.04));
  ctx.globalAlpha = 0.9; ctx.drawImage(ring.im, ring.sx, ring.sy, ring.s, ring.s, Math.round(x - w / 2), Math.round(y - w / 2 + 2), w, w); ctx.globalAlpha = 1;
  const a = r > 20 ? 30 : 22, b = Math.round(Math.sin(tn * 6) * 2.5);
  ctx.drawImage(arr.im, arr.sx, arr.sy, arr.s, arr.s, Math.round(x - a / 2), Math.round(y - (r > 20 ? 118 : 80) + b), a, a);
  ctx.imageSmoothingEnabled = false;
}
function drawTargetRing(x, y, r, tn) { ctx.fillStyle = '#ffd34d'; const n = 16; for (let i = 0; i < n; i++) { if (i % 2) continue; const a = i / n * 6.283 + tn * 2; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.45), 2, 1); } const b = Math.round(Math.sin(tn * 6) * 2); ctx.fillStyle = '#3a2410'; ctx.fillRect(Math.round(x) - 4, Math.round(y) - (r > 20 ? 104 : 66) + b, 9, 5); ctx.fillStyle = '#7dff8a'; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x) - 3 + i, Math.round(y) - (r > 20 ? 104 : 66) + b + i, 7 - i * 2, 1); }
function drawMagicCircle(x, y, tn, scale = 1, col = '#7fd4ff') {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  const R = 26 * scale;
  ctx.fillStyle = col; ctx.globalAlpha = 0.25; for (let i = -9; i <= 9; i++) { const w = Math.round(R * Math.sqrt(1 - (i / 9.5) ** 2)); ctx.fillRect(-w, Math.round(i * R * 0.5 / 9), w * 2, 1); }
  ctx.globalAlpha = 0.95;
  for (const [rr, sp, n, sz] of [[R, 0.6, 40, 1], [R * 0.72, -0.9, 28, 1], [R * 0.45, 1.4, 6, 2]]) for (let i = 0; i < n; i++) { const a = i / n * 6.283 + tn * sp; ctx.fillStyle = i % 5 === 0 ? '#ffffff' : col; ctx.fillRect(Math.round(Math.cos(a) * rr), Math.round(Math.sin(a) * rr * 0.5), sz + (i % 5 === 0 ? 1 : 0), sz); }
  for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283 + tn * 1.4, b = a + 2.094; const x1 = Math.cos(a) * R * 0.72, y1 = Math.sin(a) * R * 0.36, x2 = Math.cos(b) * R * 0.72, y2 = Math.sin(b) * R * 0.36; for (let k = 0; k <= 12; k++) { ctx.fillStyle = col; ctx.fillRect(Math.round(x1 + (x2 - x1) * k / 12), Math.round(y1 + (y2 - y1) * k / 12), 1, 1); } }
  for (let i = 0; i < 6; i++) { const ph = (tn * 0.7 + i / 6) % 1, a = i * 1.7 + tn; ctx.globalAlpha = 1 - ph; ctx.fillStyle = '#e6f8ff'; ctx.fillRect(Math.round(Math.cos(a) * R * 0.6), Math.round(-ph * 40 + Math.sin(a) * R * 0.2), 1, 2 + (i % 2)); }
  ctx.restore(); ctx.globalAlpha = 1;
}
function bubble(X, Y, txt) {
  const S = DPR; ctx.font = `${12 * S}px Mitr,sans-serif`;
  const t = txt.length > 28 ? txt.slice(0, 27) + '…' : txt; const w = ctx.measureText(t).width + 16 * S, h = 22 * S;
  ctx.fillStyle = '#fffbea'; ctx.strokeStyle = '#2a1f3a'; ctx.lineWidth = 2 * S; ctx.fillRect(X - w / 2, Y - h, w, h); ctx.strokeRect(X - w / 2, Y - h, w, h);
  ctx.beginPath(); ctx.moveTo(X - 5 * S, Y); ctx.lineTo(X, Y + 6 * S); ctx.lineTo(X + 5 * S, Y); ctx.fill();
  ctx.fillStyle = '#2a1f3a'; ctx.fillText(t, X, Y - h / 2);
}
let mmT = 0;
function drawMinimap() {
  const t = performance.now(); if (t - mmT < 250 || !miniC) return; mmT = t;
  const c = $('mmc'), g = c.getContext('2d'); g.imageSmoothingEnabled = false; const W = c.width, H = c.height;
  const e = ents.get(myId); if (!e) return;
  const s = 3, cx = e.x * s, cy = e.y * s;
  g.fillStyle = '#0a0d1c'; g.fillRect(0, 0, W, H);
  g.drawImage(miniC, Math.round(W / 2 - cx), Math.round(H / 2 - cy), map.w * s, map.h * s);
  const P = (x, y, col, sz = 3) => { g.fillStyle = col; g.fillRect(Math.round(W / 2 + (x - e.x) * s - sz / 2), Math.round(H / 2 + (y - e.y) * s - sz / 2), sz, sz); };
  for (const p of map.portals) P(p.x, p.y, '#9fe7ff', 5);
  for (const n of map.npcs) P(n.x, n.y, me.npcq && me.npcq[n.id] === 'turnin' ? '#7dff8a' : '#ffd34d', 3);
  for (const nd of map.nodes || []) if (nodeWanted(nd)) P(nd.x, nd.y, '#b07bff', 3);
  if (typeof questMarkTargets === 'function') { // active quest: gold markers (target, its area, or the portal to take)
    const qt = questMarkTargets(), here = qt.filter(q => q.map === map.id);
    for (const q of here) { if (q.zone) { g.strokeStyle = '#ffd34d'; g.lineWidth = 1; g.strokeRect(Math.round(W / 2 + (q.zone[0] - e.x) * s), Math.round(H / 2 + (q.zone[1] - e.y) * s), (q.zone[2] - q.zone[0]) * s, (q.zone[3] - q.zone[1]) * s); } else P(q.x, q.y, '#ffd34d', 6); }
    if (qt.length && !here.length) { const r = aqRoute(new Set(qt.map(q => q.map))); if (r && r.length) P(r[0].x, r[0].y, '#ffd34d', 7); }
  }
  for (const en of ents.values()) if (en.kind === 'm') P(en.x, en.y, MOBN[en.type] && MOBN[en.type].boss ? '#ff3b3b' : MOBN[en.type] && MOBN[en.type].elite ? '#ffd34d' : '#ff8b8b', 2); else if (en.kind === 'p' && en !== e) P(en.x, en.y, '#7dff8a', 3);
  P(e.x, e.y, '#ffffff', 5); P(e.x, e.y, '#3d8bf0', 3);
  $('mmxy2').textContent = `${Math.round(e.x)},${Math.round(e.y)}`;
  let pc = 0; for (const en of ents.values()) if (en.kind === 'p') pc++; $('mmp').textContent = '👥 ' + pc;
}
function drawTitle(t) {
  // pixel landscape title backdrop
  const z = Math.max(2, Math.round(DH / 260)); ctx.setTransform(z, 0, 0, z, 0, 0); ctx.imageSmoothingEnabled = false;
  const w = Math.ceil(DW / z), h = Math.ceil(DH / z);
  const sky = ['#1b1940', '#252257', '#35306b', '#4b3d7c', '#6a4a86', '#8f5a88', '#c07583', '#e59a7c'];
  for (let i = 0; i < 8; i++) { ctx.fillStyle = sky[i]; ctx.fillRect(0, Math.floor(i * h * 0.6 / 8), w, Math.ceil(h * 0.6 / 8) + 1); }
  for (let i = 0; i < 70; i++) { if ((Math.floor(t / 400) + i) % 7 === 0) continue; ctx.fillStyle = i % 9 ? '#ffffffaa' : '#ffe39a'; ctx.fillRect(Math.floor(hash(i, 1) * w), Math.floor(hash(1, i) * h * 0.45), 1, 1); }
  ctx.fillStyle = '#ffe9c0'; ctx.fillRect(Math.floor(w * 0.75), Math.floor(h * 0.18), 10, 10); ctx.fillStyle = '#ffd38a'; ctx.fillRect(Math.floor(w * 0.75) + 6, Math.floor(h * 0.18), 4, 10);
  const hill = (base, amp, f, col, off) => { ctx.fillStyle = col; for (let x = 0; x < w; x++) { const y = Math.floor(base + Math.sin((x + off) / f) * amp + Math.sin((x + off) / (f * 0.37)) * amp * 0.3); ctx.fillRect(x, y, 1, h - y); } };
  hill(h * 0.58, 10, 40, '#3b3466', t / 200); hill(h * 0.68, 8, 26, '#2c4a3e', t / 120); hill(h * 0.78, 6, 18, '#3f7a33', t / 80);
  ctx.fillStyle = '#5aa346'; ctx.fillRect(0, Math.floor(h * 0.86), w, h);
  const tn = t / 1000, y = Math.floor(h * 0.9);
  ['h_knight_m', 'h_mage_f', 'h_rogue_m', 'h_barb_f'].forEach((n, i) => { const x = ((tn * 22 + i * 46) % (w + 80)) - 40; shadow(x, y, 9); drawChar(n, 'walk', tn + i, 3, x, y); });
  const sx = ((tn * 22 + 4 * 46 + 30) % (w + 80)) - 40; drawChar('m_jellop', 'walk', tn, 3, sx, y);
}
requestAnimationFrame(frame);
HUD.applyIcons();

// ------------------------------------------------------------ ELYNDRA ONLINE: splash, login, guest, Google, sessions
// No password is ever stored on the device: "remember me" keeps a random session token from the server
// (localStorage 'ely_session'); a guest keeps its own token ('ely_guest'). Old saves of the ID ('lmo_u') still prefill.
let mode = 'login', loginBusy = false, gcred = null, GCFG = { google: null };
const look = { sex: 0, hair: 0, hc: 0, cc: 0 };
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
function setMode(m) {
  mode = m; const L = $('login');
  $('tLogin').classList.toggle('on', m === 'login' || m === 'reg'); $('tGuest').classList.toggle('on', m === 'guest'); $('tGoogle').classList.toggle('on', m === 'google');
  $('pAcc').hidden = !(m === 'login' || m === 'reg' || m === 'gchar'); $('pGuest').hidden = m !== 'guest'; $('pGoogle').hidden = m !== 'google';
  $('regbox').style.display = m === 'reg' || m === 'gchar' ? 'block' : 'none'; $('remrow').style.display = m === 'reg' ? 'none' : 'flex';
  $('tReg').textContent = m === 'reg' || m === 'gchar' ? '‹ กลับไปหน้าเข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สร้างตัวละครใหม่';
  L.classList.toggle('reg', m === 'reg'); L.classList.toggle('gchar', m === 'gchar'); L.classList.toggle('guestm', m === 'guest');
  $('p').autocomplete = m === 'reg' ? 'new-password' : 'current-password';
  if (m === 'reg' || m === 'gchar') crInit();
  setBusy(false); $('err').textContent = ''; loginHint(); loginLayout();
  if (m === 'google') renderGoogle();
}
$('tLogin').onclick = () => setMode('login'); $('tGuest').onclick = () => setMode('guest'); $('tGoogle').onclick = () => setMode('google');
$('tReg').onclick = () => setMode(mode === 'reg' || mode === 'gchar' ? 'login' : 'reg');
const OUTFIT_TH = ['ชุดเดินทางสีฟ้า', 'ชุดเดินทางสีน้ำตาล', 'ชุดเดินทางสีเขียว', 'ชุดเดินทางสีแดง', 'ชุดเดินทางสีม่วง']; // everyone starts as an Adventurer: the choice is the tunic colour
// ---- portrait on the create-character screen: gallery + live HUD preview (cosmetic only; default follows the body type until the player picks one)
let crPortrait = null, crPicked = false, crGal = null;
function crShow() { if (!window.PORTRAIT) return; PORTRAIT.setImg($('crimg'), crPortrait, 'hud'); $('crname').textContent = $('cn').value.trim() || 'ชื่อตัวละคร'; }
function crInit() {
  if (!window.PORTRAIT) { $('crgal').parentNode.style.display = 'none'; $('crhud').style.display = 'none'; return; }
  if (!crPortrait) crPortrait = PORTRAIT.fallback(look, '');
  if (!crGal) crGal = PORTRAIT.gallery($('crgal'), { sel: crPortrait, onPick: id => { crPortrait = id; crPicked = true; crShow(); }, onPreview: id => PORTRAIT.preview(id, $('cn').value.trim()) });
  crShow();
}
$('cn').addEventListener('input', () => { crShow(); $('crerr').textContent = ''; });
// name check before sending (the server checks again, and also reports a taken name) — errors stay on this screen
function nameErr(n) { if (!n) return 'ตั้งชื่อตัวละครก่อน'; if (n.length < 2 || n.length > 14) return 'ชื่อตัวละครต้องยาว 2-14 ตัวอักษร'; if (!/^[A-Za-z0-9ก-๙ _]+$/.test(n)) return 'ชื่อใช้ได้เฉพาะ ไทย / อังกฤษ / ตัวเลข / ช่องว่าง / _'; return ''; }
document.querySelectorAll('.sel button').forEach(b => b.onclick = () => {
  const k = b.dataset.k, L = { cc: 5, sex: 2, hair: 6, hc: 9 }[k]; look[k] = (look[k] + +b.dataset.d + L) % L;
  if (k === 'sex' && !crPicked && window.PORTRAIT) { crPortrait = PORTRAIT.fallback(look, ''); if (crGal) crGal.set(crPortrait); crShow(); }
  $('v_cc').textContent = OUTFIT_TH[look.cc]; $('v_sex').textContent = look.sex ? 'หญิง' : 'ชาย'; $('v_hair').textContent = HAIR_STYLE_TH[look.hair]; $('v_hc').textContent = HAIR_TH[look.hc];
});
(function prev() {
  requestAnimationFrame(prev); if (mode !== 'reg' && mode !== 'gchar') return;
  const c = $('preview'), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 96, 96);
  const n = heroOf(look), L = META.lpc[n], im = img(n); img('h_knight_' + (look.sex ? 'f' : 'm')); if ((!L || !im) && !CHR) return;
  const tn = performance.now() / 1000, ph = Math.floor(tn / 2) % 6;
  const row = [2, 3, 0, 1, 2, 2][ph], atk = ph === 5;
  drawHero(look, atk ? 'atk' : 'walk', atk ? (tn % 2) * 0.45 : tn, row, 48, 92, 1, 0, g, { wpn: 200, cls: 'adventurer' });
})();
// login busy state: button disabled with a spinner until the server answers (welcome / err / connection lost)
function setBusy(b, txt) {
  loginBusy = b; for (const id of ['go', 'guestGo', 'altGuest', 'altGoogle']) $(id).disabled = b;
  const idle = mode === 'reg' ? 'สร้างตัวละครและเข้าเกม ›' : mode === 'gchar' ? 'สร้างตัวละครด้วย Google ›' : 'เข้าเกม ›';
  $('go').innerHTML = b ? `<span class="spin"></span>${txt || (mode === 'reg' || mode === 'gchar' ? 'กำลังสร้างตัวละคร...' : 'กำลังเข้าสู่ระบบ...')}` : idle;
  $('guestGo').innerHTML = b && mode === 'guest' ? '<span class="spin"></span>กำลังเข้าสู่โลก Elyndra...' : '👤 เข้าเล่นแบบ Guest';
}
function loginErr(t) { if ((mode === 'reg' || mode === 'gchar') && /ชื่อ|ภาพ/.test(t || '')) $('crerr').textContent = t; const e = $('err'); e.textContent = t; e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
function loginHint() {
  const sv = store.get('ely_session'), h = $('lhint');
  h.textContent = mode === 'login' && sv && !/^(guest|google):/.test(sv.u) && $('u').value.trim().toLowerCase() === sv.u && !$('p').value ? '✓ จดจำไว้ในอุปกรณ์นี้แล้ว — กด "เข้าเกม" ได้เลย' : '';
}
function startLogin(msg, txt) { $('err').textContent = ''; setBusy(true, txt); if (ws) try { ws.close(); } catch (e) { } connect(msg); }
$('go').onclick = () => {
  if (loginBusy) return;
  const u = $('u').value.trim().toLowerCase(), p = $('p').value, rem = $('rem').checked;
  if (mode === 'gchar') { const name = $('cn').value.trim(), ne = nameErr(name); if (ne) { $('crerr').textContent = ne; $('cn').focus(); return; } return startLogin({ t: 'glogin', cred: gcred, name, ...look, portrait: crPortrait || undefined, rem: 1 }); }
  const sv = store.get('ely_session');
  if (mode === 'login' && !p && sv && sv.u === u) return startLogin({ t: 'tlogin', u, tok: sv.tok });
  if (mode === 'reg') { const ne = nameErr($('cn').value.trim()); if (ne) { $('crerr').textContent = ne; $('cn').focus(); return; } }
  if (!u || !p) return loginErr('กรอกอีเมล/ไอดี และรหัสผ่าน');
  if (!rem) store.set('ely_session', null);
  startLogin(mode === 'reg' ? { t: 'register', u, p, rem, name: $('cn').value.trim(), ...look, portrait: crPortrait || undefined } : { t: 'login', u, p, rem });
};
function guestLogin() {
  if (loginBusy) return; if (mode !== 'guest') setMode('guest');
  const g = store.get('ely_guest');
  if (g && g.u && g.tok) return startLogin({ t: 'tlogin', u: g.u, tok: g.tok, guest: 1 }, 'กำลังเข้าสู่โลก Elyndra...');
  const rnd = { sex: Math.random() < 0.5 ? 0 : 1, hair: Math.floor(Math.random() * 6), hc: Math.floor(Math.random() * 9), cc: Math.floor(Math.random() * 5) };
  if (window.PORTRAIT) { const l = PORTRAIT.list.filter(x => x.type === 'NORMAL' && x.sex === (rnd.sex ? 'f' : 'm')); if (l.length) rnd.portrait = l[Math.floor(Math.random() * l.length)].id; }
  startLogin({ t: 'guest', ...rnd }, 'กำลังเข้าสู่โลก Elyndra...');
}
$('guestGo').onclick = guestLogin; $('altGuest').onclick = guestLogin;
// Google: only when the server has a client id; the button is Google's own (Identity Services), the server verifies the token
function renderGoogle() {
  const box = $('gbtn'); if (!GCFG.google || box.dataset.done) return;
  const draw = () => { try { google.accounts.id.initialize({ client_id: GCFG.google, callback: r => { gcred = r.credential; const sv = store.get('ely_session'); startLogin({ t: 'glogin', cred: gcred, rem: $('rem').checked ? 1 : 0 }); } }); google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', locale: 'th' }); box.dataset.done = 1; } catch (e) { box.textContent = 'โหลดปุ่ม Google ไม่สำเร็จ'; } };
  if (window.google && google.accounts) return draw();
  const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = draw; sc.onerror = () => { box.textContent = 'เชื่อมต่อ Google ไม่ได้'; }; document.head.appendChild(sc);
}
$('altGoogle').onclick = () => setMode('google');
fetch('api/config').then(r => r.json()).then(c => { GCFG = c || {}; if (GCFG.google) { $('tGoogle').hidden = false; $('altGoogle').hidden = false; loginLayout(); } }).catch(() => { });
$('peye').onclick = () => { const p = $('p'), show = p.type === 'password'; p.type = show ? 'text' : 'password'; $('peye').textContent = show ? '🙈' : '👁'; $('peye').setAttribute('aria-label', show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'); };
$('uclr').onclick = () => { $('u').value = ''; $('u').focus(); loginHint(); };
$('u').oninput = loginHint; $('p').oninput = loginHint;
$('forgot').onclick = () => loginInfo('ลืมรหัสผ่าน?', 'ตอนนี้ยังรีเซ็ตรหัสผ่านทางอีเมลไม่ได้ — ติดต่อผู้ดูแลเกมพร้อมอีเมล/ไอดี และชื่อตัวละคร เพื่อขอรีเซ็ตรหัสผ่าน');
$('forgot').onkeydown = e => { if (e.key === 'Enter') $('forgot').click(); };
const LINFO = {
  news: ['ข่าวสาร', 'ELYNDRA ONLINE · อัปเดตล่าสุด: ภูมิภาคใหม่ "ป่าเขียวขจี" (Lv 20-45) เมืองเวอร์แดนต์ เฮเวน ดันเจี้ยนต้นไม้โบราณ เนื้อเรื่องบทที่ 2 มอน Elite และอุปกรณ์ Tier 2'],
  guide: ['คู่มือเกม', 'เดินด้วยจอยสติ๊ก/WASD · แตะมอนสเตอร์เพื่อเลือกเป้า · ปุ่ม AUTO ตีอัตโนมัติ · แตะ ▶ ที่เควสเพื่อให้ตัวละครเดินไปทำภารกิจเอง · M เปิดแผนที่'],
  contact: ['ศูนย์ช่วยเหลือ', 'แจ้งปัญหาหรือข้อเสนอแนะได้ที่ผู้ดูแลเกม ELYNDRA ONLINE'],
  settings: ['ตั้งค่า', 'ปรับเสียง ขนาด UI และกราฟิกได้จากเมนู ⚙ ตั้งค่า หลังเข้าเกม'],
};
function loginInfo(t, b) { $('linfoT').textContent = t; $('linfoB').textContent = b; $('linfo').style.display = 'block'; }
document.querySelectorAll('#ltop button').forEach(b => b.onclick = () => loginInfo(...LINFO[b.dataset.i]));
$('linfoX').onclick = () => { $('linfo').style.display = 'none'; };
// the login column is laid out in CSS at its natural size, then scaled down (never up) to fit the screen
function loginLayout() {
  const L = $('login'); if (!L || L.style.display === 'none') return;
  const vw = innerWidth, vh = innerHeight, land = vw / vh >= 1.05, short = land && vh < 560;
  L.classList.toggle('land', land); L.classList.toggle('port', !land); L.classList.toggle('short', short);
  const w = $('lwrap'); w.style.transform = 'translateX(-50%)';
  const up = land && !short ? Math.max(1, Math.min(1.4, vh / 820)) : 1; // big desktop screens: grow with the screen like the key art
  const W = w.offsetWidth, H = w.offsetHeight, s = Math.min(up, (vh - 4) / H, (vw - 8) / W);
  const top = Math.max(0, (vh - H * s) / 2 - (land && !short ? vh * 0.02 : 0));
  w.style.transform = `translateX(-50%) scale(${s})`; w.style.top = top + 'px';
}
addEventListener('resize', loginLayout); addEventListener('orientationchange', () => setTimeout(loginLayout, 200));
$('llogo').addEventListener('load', loginLayout);
for (const f of ['u', 'p', 'cn']) $(f).onkeydown = e => { if (e.key === 'Enter') $('go').click(); };
// guest -> e-mail / id binding (Settings window, guests only)
$('bindGo').onclick = () => { const u = $('bindU').value.trim().toLowerCase(), p = $('bindP').value; if (!u || !p) { $('bindMsg').textContent = 'กรอกอีเมล/ไอดี และรหัสผ่าน'; return; } $('bindMsg').textContent = 'กำลังผูกบัญชี...'; send({ t: 'bind', u, p }); };
// splash: wait for the logo + this screen's background (or 5 s at most), then fade into the login screen
(function splash() {
  const sp = $('splash'), bar = $('spbar'), land = innerWidth / innerHeight >= 1.05;
  const want = ['assets/branding/elyndra-logo-small.webp', land ? 'assets/branding/login-bg-desktop.webp' : 'assets/branding/login-bg-mobile.webp'];
  let n = 0; const t0 = performance.now();
  const done = () => { if (sp.dataset.done) return; sp.dataset.done = 1; bar.style.width = '100%'; setTimeout(() => { sp.classList.add('out'); setTimeout(() => sp.remove(), 650); }, Math.max(150, 700 - (performance.now() - t0))); };
  for (const src of want) { const i = new Image(); i.onload = i.onerror = () => { n++; bar.style.width = (10 + 90 * n / want.length) + '%'; if (n === want.length) done(); }; i.src = src; }
  setTimeout(done, 5000);
})();
// login music: its own placeholder theme, a little quieter than the game; the first map track crossfades it out
try { if (window.AUDIO) AUDIO.playBGM('bgm_login_elyndra', 1.5); } catch (e) { }
setMode('login');
{ const sv = store.get('ely_session'); let u0 = sv && !/^(guest|google):/.test(sv.u) ? sv.u : ''; try { if (!u0 && localStorage.getItem('lmo_rem') !== '0') u0 = localStorage.getItem('lmo_u') || ''; } catch (e) { } $('u').value = u0; loginHint(); }
