'use strict';
// Art consistency tests (docs/LUMIRA_ART_BIBLE.md): every LUMIRA sprite uses the master palette (no pure black,
// only the soft shadow is semi-transparent), sheets share one frame grid and pivot, names follow the convention,
// scale rules (door vs character, trees, bushes), top-left lighting, Region 1 asset checklist, content references
// and license coverage. Static checks read the PNGs directly; the browser checks render through the real client.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const H = require('./harness');
const ROOT = H.ROOT, A = p => path.join(ROOT, 'public', 'assets', p);

// ---------------------------------------------------------------- tiny PNG reader (8-bit, non-interlaced)
function readPNG(file) {
  const b = fs.readFileSync(file); let p = 8, w = 0, h = 0, ct = 0, bd = 0, plte = null, trns = null; const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len); p += 12 + len;
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; if (d[12]) throw new Error('interlaced png ' + file); }
    else if (type === 'PLTE') plte = d; else if (type === 'tRNS') trns = d; else if (type === 'IDAT') idat.push(d); else if (type === 'IEND') break;
  }
  if (bd !== 8) throw new Error('bit depth ' + bd + ' in ' + file);
  const bpp = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct], stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], cur = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, up = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = cur[i];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, s = x * bpp;
      if (ct === 6) { px[o] = cur[s]; px[o + 1] = cur[s + 1]; px[o + 2] = cur[s + 2]; px[o + 3] = cur[s + 3]; }
      else if (ct === 2) { px[o] = cur[s]; px[o + 1] = cur[s + 1]; px[o + 2] = cur[s + 2]; px[o + 3] = 255; }
      else if (ct === 3) { const k = cur[s]; px[o] = plte[k * 3]; px[o + 1] = plte[k * 3 + 1]; px[o + 2] = plte[k * 3 + 2]; px[o + 3] = trns && k < trns.length ? trns[k] : 255; }
      else if (ct === 0) { px[o] = px[o + 1] = px[o + 2] = cur[s]; px[o + 3] = 255; }
      else { px[o] = px[o + 1] = px[o + 2] = cur[s]; px[o + 3] = cur[s + 1]; }
    }
    prev = cur;
  }
  return { w, h, px, at: (x, y) => { const o = (y * w + x) * 4; return [px[o], px[o + 1], px[o + 2], px[o + 3]]; } };
}
// opaque bounding box inside a rect (alpha 255 only, so baked shadows don't count)
function bbox(im, x0 = 0, y0 = 0, w = im.w, h = im.h) {
  let l = 1e9, t = 1e9, r = -1, b = -1;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (im.px[(y * im.w + x) * 4 + 3] === 255) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
  return r < 0 ? null : { l: l - x0, t: t - y0, r: r - x0, b: b - y0, w: r - l + 1, h: b - t + 1 };
}
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
function walk(dir) { const out = []; if (!fs.existsSync(dir)) return out; for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); fs.statSync(p).isDirectory() ? out.push(...walk(p)) : out.push(p); } return out; }

// master palette parsed from the generator, so the test and tools/art can never drift apart
function palette() {
  const src = fs.readFileSync(path.join(ROOT, 'tools', 'art', 'lumira_art.py'), 'utf8');
  const block = src.slice(src.indexOf('RAMPS = {'), src.indexOf('}', src.indexOf('RAMPS = {')));
  const set = new Set((block.match(/#[0-9a-fA-F]{6}/g) || []).map(h => h.toLowerCase()));
  set.add((src.match(/OUTLINE_FALLBACK = '(#[0-9a-fA-F]{6})'/) || [])[1]);
  return set;
}
// colour -> [ramp, index in ramp] (ramps listed in the generator; key ramps hair/skin/eye/white are not lighting ramps)
function rampIndex() {
  const src = fs.readFileSync(path.join(ROOT, 'tools', 'art', 'lumira_art.py'), 'utf8'), map = new Map();
  for (const [, name, body] of src.matchAll(/'([a-z]+)':\s*\[([^\]]*)\]/g)) if (!['hair', 'skin', 'eye', 'white'].includes(name)) (body.match(/#[0-9a-fA-F]{6}/g) || []).forEach((h, i) => { if (!map.has(h.toLowerCase())) map.set(h.toLowerCase(), [name, i]); });
  return map;
}
const hexOf = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

function staticTests(R) {
  const CHR = JSON.parse(fs.readFileSync(A('characters/chars.json'), 'utf8'));
  const W = JSON.parse(fs.readFileSync(A('world/world.json'), 'utf8'));
  const PAL = palette();
  R.ok(PAL.size >= 60 && !PAL.has('#000000'), 'palette: master palette parsed from tools/art', PAL.size + ' colours');

  // ---- files + naming convention
  const DIRS = ['characters', 'npcs', 'equipment', 'world'];
  const files = DIRS.flatMap(d => walk(A(d))).filter(f => f.endsWith('.png'));
  const NAME = /^(chr_base_(male|female)|chr_hair_[a-z]+|chr_class_[a-z]+_(male|female)|chr_back_[a-z_]+_(male|female)|eq_armor_[a-z_]+_(male|female)|eq_weapon_[a-z]+|eq_shield_[a-z]+|eq_head_[a-z_]+|npc_outfit_[a-z]+_(male|female))_[ab]\.png$|^(bld_[a-z_]+_(village|capital)_\d+x\d+|tree_[a-z_]+_\d\d|veg_[a-z_]+_\d\d|rock_[a-z_]+_\d\d|prop_[a-z_]+_\d\d)\.png$/;
  const badName = files.map(f => path.basename(f)).filter(n => !NAME.test(n));
  R.ok(files.length >= 320 && !badName.length, 'naming: every sprite follows the art bible naming convention', files.length + ' files ' + badName.slice(0, 5).join(','));
  R.ok(Object.keys(CHR.layers).every(k => ['a', 'b'].every(g => fs.existsSync(A(CHR.layers[k] + '_' + g + '.png')))), 'files: every character layer has both sheet groups (a / b)');
  R.ok(Object.values(W).every(m => fs.existsSync(A(m.path + '.png'))), 'files: every world.json sprite exists');

  // ---- palette / black / shadow on every pixel of every sprite
  const off = [], black = [], semi = [];
  const ims = {};
  const EXT = new Set(Object.values(W).filter(m => m.src === 'lpc').map(m => A(m.path + '.png')));
  for (const f of files) {
    const im = ims[f] = readPNG(f), seen = new Set();
    if (EXT.has(f)) continue; // external LPC art (docs/ASSET_LICENSES.md) keeps its own palette
    for (let i = 0; i < im.px.length; i += 4) {
      const a = im.px[i + 3]; if (!a) continue;
      if (a < 255) { if (!(im.px[i] === 20 && im.px[i + 1] === 16 && im.px[i + 2] === 24)) { semi.push(path.basename(f)); break; } continue; }
      const k = (im.px[i] << 16) | (im.px[i + 1] << 8) | im.px[i + 2]; if (seen.has(k)) continue; seen.add(k);
      if (!k) black.push(path.basename(f));
      if (!PAL.has(hexOf(im.px[i], im.px[i + 1], im.px[i + 2]))) { off.push(path.basename(f) + ' ' + hexOf(im.px[i], im.px[i + 1], im.px[i + 2])); break; }
    }
  }
  R.ok(!off.length, 'palette: every opaque pixel is a master palette colour', off.slice(0, 5).join(', '));
  R.ok(!black.length, 'palette: no pure black (#000000) anywhere', black.slice(0, 5).join(', '));
  R.ok(!semi.length, 'shadow: the only semi-transparent pixels are the shared soft shadow colour', semi.slice(0, 5).join(', '));

  // ---- one frame grid for every character layer
  const F = CHR.frame, sz = {};
  let gridBad = [];
  for (const [k, p] of Object.entries(CHR.layers)) for (const g of ['a', 'b']) {
    const im = ims[A(p + '_' + g + '.png')]; if (!im) { gridBad.push(k + ' missing'); continue; }
    if (im.w % F || im.h % F || im.w / F !== CHR.groups[g].cols) gridBad.push(k + '_' + g + ' ' + im.w + 'x' + im.h);
    sz[g] = sz[g] || im.w + 'x' + im.h; if (sz[g] !== im.w + 'x' + im.h) gridBad.push(k + '_' + g + ' size differs');
  }
  R.ok(F === 64 && CHR.pivot[0] === 32 && CHR.pivot[1] === 58 && !gridBad.length, 'grid: all layers share 64px frames, 9 columns, pivot (32,58)', gridBad.slice(0, 4).join(', '));

  // ---- pivot + height: feet sit on y=58 in every idle/walk frame, every stored direction, both bodies
  const frameBox = (im, g, k) => bbox(im, (k % CHR.groups[g].cols) * F, Math.floor(k / CHR.groups[g].cols) * F, F, F);
  const feet = [], heights = [];
  for (const sx of ['male', 'female']) {
    const im = ims[A(CHR.layers['chr_base_' + sx] + '_a.png')];
    for (const an of ['idle', 'walk']) for (const v of CHR.dirs) for (let f = 0; f < CHR.anims[an].n; f++) {
      const b = frameBox(im, 'a', CHR.groups.a.index[an][v] + f);
      if (!b || b.b < 56 || b.b > 59) feet.push(`${sx} ${an} ${v}${f}: ${b && b.b}`);
      if (!b || Math.abs((b.l + b.r) / 2 - 32) > 5) feet.push(`${sx} ${an} ${v}${f} centre ${b && (b.l + b.r) / 2}`);
    }
    const b = frameBox(im, 'a', CHR.groups.a.index.idle.S); heights.push(b.h);
  }
  R.ok(!feet.length, 'pivot: feet on y≈58 and centred on x=32 in every idle/walk frame (N/S/E, male/female)', feet.slice(0, 4).join('; '));
  const CH = Math.max(...heights);
  R.ok(heights.every(h => Math.abs(h - CHR.height) <= 3), 'scale: character height matches the bible (≈42px)', heights.join(','));

  // ---- layers line up with the body: armor never floats below the feet, headgear overlaps the head in every view
  const align = [];
  for (const sx of ['male', 'female']) {
    const base = ims[A(CHR.layers['chr_base_' + sx] + '_a.png')];
    for (const v of CHR.dirs) {
      const k = CHR.groups.a.index.idle[v], bb = frameBox(base, 'a', k), head = { t: bb.t, b: bb.t + CHR.head[1] };
      for (const vis of CHR.headgear) { const hb = frameBox(ims[A(CHR.layers['eq_head_' + vis] + '_a.png')], 'a', k); if (!hb || hb.b < head.t || hb.t > head.b + 4) align.push(`${vis} ${v} ${sx}`); }
      for (const t of CHR.tunic) { const ab = frameBox(ims[A(CHR.layers[`eq_armor_tunic_${t}_${sx}`] + '_a.png')], 'a', k); if (!ab || ab.b > bb.b) align.push(`tunic_${t} ${v}`); }
    }
  }
  R.ok(!align.length, 'layers: headgear sits on the head and armor stays on the body in all stored views', align.slice(0, 5).join('; '));

  // ---- Region 1 character checklist
  const has = k => !!CHR.layers[k];
  const classes = ['adventurer', 'vanguard', 'ranger', 'arcanist', 'cleric', 'rogue', 'artisan'];
  R.ok(['male', 'female'].every(sx => has('chr_base_' + sx) && classes.every(c => has(`chr_class_${c}_${sx}`))), 'region1: base body + Adventurer + 6 first classes, male and female');
  const npcNeed = ['merchant', 'blacksmith', 'healer', 'innkeeper', 'storage', 'guard', 'farmer', 'citizen', 'elder'];
  R.ok(npcNeed.every(o => has(`npc_outfit_${o}_male`) && has(`npc_outfit_${o}_female`)), 'region1: NPC outfits (merchant, blacksmith, healer, innkeeper, storage, guard, farmer, citizen, quest elder)', npcNeed.filter(o => !has(`npc_outfit_${o}_male`)).join(','));
  // headgear in 4 directions: N/S/E stored (W mirrors E) and every stored view has pixels in idle + attack
  const hg4 = CHR.headgear.filter(v => ['a', 'b'].every(g => CHR.dirs.every(d => frameBox(ims[A(CHR.layers['eq_head_' + v] + '_' + g + '.png')], g, g === 'a' ? CHR.groups.a.index.idle[d] : CHR.groups.b.index.attack[d]))));
  R.ok(hg4.length >= 15 && CHR.mirror.W === 'E', 'region1: ≥15 headgear visuals drawn in 4 directions', hg4.length + ' of ' + CHR.headgear.length);
  const wv = CHR.weapons.length + Object.keys(CHR.layers).filter(k => k.startsWith('eq_shield_')).length;
  R.ok(CHR.weapons.length >= 10 && wv >= 10, 'region1: ≥10 weapon visuals', CHR.weapons.join(','));
  const ITEMS = require(path.join(ROOT, 'content')).ITEMS, wts = [...new Set(Object.values(ITEMS).map(i => i.wt).filter(Boolean))];
  R.ok(wts.every(t => CHR.weapons.includes(t)), 'equipment: every weapon type used by items has a visual', wts.filter(t => !CHR.weapons.includes(t)).join(','));

  // ---- buildings: footprint grid, door/character ratio, Region 1 list
  const blds = Object.entries(W).filter(([k]) => k.startsWith('bld_'));
  const bldBad = blds.filter(([k, m]) => { const [fw, fh] = m.footprint; return m.w !== fw * 32 || m.h < fh * 32 + 48 || m.ay !== m.h - fh * 16 || m.ax !== m.w / 2; }).map(([k]) => k);
  R.ok(blds.length >= 20 && !bldBad.length, 'buildings: image = footprint x 32 (+roof), anchored on the footprint centre', bldBad.join(','));
  const ratios = blds.filter(([k, m]) => m.kind !== 'gate').map(([k, m]) => m.door[1] / CH);
  R.ok(ratios.length >= 20 && ratios.every(r => r >= 1.2 && r <= 1.4), 'scale: door height is 1.2-1.4x character height', [...new Set(ratios.map(r => r.toFixed(2)))].join(','));
  const bNeed = ['house_small', 'house_large', 'inn', 'potion_shop', 'weapon_shop', 'armor_shop', 'blacksmith', 'storage', 'guild_hall', 'class_hall', 'town_hall', 'castle_gate'];
  const bMiss = bNeed.filter(b => !blds.some(([k]) => k.startsWith('bld_' + b + '_')));
  R.ok(!bMiss.length, 'region1: all building kinds (houses, inn, shops, blacksmith, storage, guild/class/town hall, castle gate)', bMiss.join(','));

  // ---- nature + props
  const wNeed = ['tree_oak_01', 'veg_bush_01', 'veg_grass_01', 'veg_tallgrass_01', 'veg_flowers_red_01', 'rock_small_01', 'rock_large_05', 'prop_barrel_01', 'prop_crate_01', 'prop_cart_01', 'prop_bench_01', 'prop_lamp_01', 'prop_sign_sword_01', 'prop_fence_01', 'prop_well_01', 'prop_stall_01'];
  R.ok(wNeed.every(k => W[k]), 'region1: trees, vegetation, rocks and props (barrel, crate, cart, bench, lamp, sign, fence, well, stall)', wNeed.filter(k => !W[k]).join(','));
  const hOf = k => bbox(ims[A(W[k].path + '.png')]).h;
  const trees = Object.keys(W).filter(k => k.startsWith('tree_')), short = trees.filter(k => hOf(k) < 2.2 * CH);
  R.ok(trees.length >= 4 && !short.length, 'scale: trees ≥ 2.2x character height', short.join(','));
  const bush = hOf('veg_bush_01') / CH, tall = hOf('veg_tallgrass_01') / CH;
  R.ok(bush > 0.35 && bush < 0.75 && tall > 0.15 && tall < 0.5, 'scale: bush ≈ 0.5x, tall grass ≈ 0.3x character height', bush.toFixed(2) + ' / ' + tall.toFixed(2));
  R.ok(trees.every(k => Array.isArray(W[k].fade) && W[k].fade.length === 4), 'trees: every tree has a canopy fade rect');

  // ---- lighting: light from the top-left (upper-left of the opaque shape is brighter than lower-right),
  //      ground shadow falls to the lower-right of the anchor
  const lightBad = [], shadowBad = [];
  const RI = rampIndex();
  for (const k of Object.keys(W).filter(k => /^(tree|rock|veg_bush|prop_barrel|prop_well|bld)_/.test(k) && W[k].src !== 'lpc')) {
    if (/^(bld|prop_well)_/.test(k)) { // big man-made shapes: same material is lighter on the left than on the right
      const im = ims[A(W[k].path + '.png')], b = bbox(im), cnt = {}, sum = {};
      for (let y = b.t; y <= b.b; y++) for (let x = b.l; x <= b.r; x++) { const [r, g, bl, a] = im.at(x, y); if (a !== 255) continue; const ri = RI.get(hexOf(r, g, bl)); if (!ri) continue; const side = x < (b.l + b.r) / 2 ? 0 : 1; const c = cnt[ri[0]] = cnt[ri[0]] || [0, 0], s2 = sum[ri[0]] = sum[ri[0]] || [0, 0]; c[side]++; s2[side] += ri[1]; }
      const dom = Object.keys(cnt).sort((p, q) => cnt[q][0] + cnt[q][1] - cnt[p][0] - cnt[p][1])[0];
      if (!(sum[dom][0] / cnt[dom][0] > sum[dom][1] / cnt[dom][1])) lightBad.push(k + '(' + dom + ')');
      continue;
    }
    const im = ims[A(W[k].path + '.png')], b = bbox(im); let ul = 0, nu = 0, lr = 0, nl = 0, sx = 0, ns = 0;
    for (let y = b.t; y <= b.b; y++) for (let x = b.l; x <= b.r; x++) {
      const [r, g, bl, a] = im.at(x, y);
      if (a === 255) { const u = (x - b.l) / b.w + (y - b.t) / b.h; if (u < 0.8) { ul += lum(r, g, bl); nu++; } else if (u > 1.2) { lr += lum(r, g, bl); nl++; } }
    }
    for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (im.px[(y * im.w + x) * 4 + 3] && im.px[(y * im.w + x) * 4 + 3] < 255) { sx += x; ns++; }
    if (nu && nl && ul / nu <= lr / nl) lightBad.push(k);
    if (ns && sx / ns < W[k].ax - 1) shadowBad.push(k);
  }
  R.ok(!lightBad.length, 'lighting: light comes from the top-left on trees, rocks, bushes, props and buildings', lightBad.join(','));
  R.ok(!shadowBad.length, 'lighting: baked ground shadows fall to the lower-right', shadowBad.join(','));
  const base = ims[A(CHR.layers.chr_base_male + '_a.png')], bb = frameBox(base, 'a', CHR.groups.a.index.idle.S); let L = 0, nL = 0, Rr = 0, nR = 0;
  const x0 = (CHR.groups.a.index.idle.S % 9) * 64, y0 = Math.floor(CHR.groups.a.index.idle.S / 9) * 64;
  for (let y = bb.t; y <= bb.b; y++) for (let x = bb.l; x <= bb.r; x++) { const [r, g, b2, a] = base.at(x0 + x, y0 + y); if (a !== 255) continue; if (x < 32) { L += lum(r, g, b2); nL++; } else if (x > 32) { Rr += lum(r, g, b2); nR++; } }
  R.ok(L / nL > Rr / nR, 'lighting: character body is lit from the left (front view)', (L / nL).toFixed(1) + ' vs ' + (Rr / nR).toFixed(1));

  // ---- content uses the art set: building kinds, decorations, NPC looks, armor looks
  const C = require(path.join(ROOT, 'content'));
  const META = JSON.parse(fs.readFileSync(A('meta.json'), 'utf8'));
  const refBad = [];
  for (const m of Object.values(C.MAPS)) {
    for (const b of m.props || []) if (!W[`bld_${b.k}_${b.w}x${b.h}`]) refBad.push(`${m.id}: bld_${b.k}_${b.w}x${b.h}`);
    for (const [n] of m.deco || []) if (!W[n] && !META.px[n]) refBad.push(`${m.id}: ${n}`);
  }
  R.ok(!refBad.length, 'content: every map building and decoration has a sprite', refBad.slice(0, 5).join(', '));
  const town = ['lumira', 'solkara'].map(id => C.MAPS[id]);
  R.ok(town.every(m => (m.props || []).every(b => W[`bld_${b.k}_${b.w}x${b.h}`]) && (m.deco || []).every(([n]) => W[n])), 'content: Lumira and Solkara use only LUMIRA art set buildings and props');
  const npcBad = [];
  for (const m of Object.values(C.MAPS)) for (const n of m.npcs || []) {
    const lk = n.look; if (!lk || typeof lk !== 'object') continue; const sx = lk.sex ? 'female' : 'male';
    if (lk.outfit && !CHR.layers[`npc_outfit_${lk.outfit}_${sx}`]) npcBad.push(n.id + ' outfit ' + lk.outfit);
    if (lk.arm && lk.arm !== 'tunic' && !CHR.layers[`eq_armor_${lk.arm}_${sx}`]) npcBad.push(n.id + ' arm ' + lk.arm);
    if (lk.cls && !CHR.layers[`chr_class_${lk.cls}_${sx}`]) npcBad.push(n.id + ' cls ' + lk.cls);
    if (lk.wpn && !CHR.weapons.includes(lk.wpn)) npcBad.push(n.id + ' wpn ' + lk.wpn);
    if (lk.head && !CHR.headgear.includes(lk.head)) npcBad.push(n.id + ' head ' + lk.head);
    if (lk.back && !CHR.layers[`chr_back_${lk.back}_${sx}`]) npcBad.push(n.id + ' back ' + lk.back);
    if (lk.shield && !CHR.layers['eq_shield_' + lk.shield]) npcBad.push(n.id + ' shield ' + lk.shield);
  }
  const looked = Object.values(C.MAPS).flatMap(m => m.npcs || []).filter(n => n.look && typeof n.look === 'object').length;
  R.ok(looked >= 30 && !npcBad.length, 'content: every NPC look resolves to existing paperdoll layers', looked + ' NPCs ' + npcBad.slice(0, 4).join(', '));
  const masters = Object.values(C.MAPS).flatMap(m => m.npcs || []).filter(n => n.look && n.look.cls && n.look.cls !== 'adventurer').map(n => n.look.cls);
  R.ok(classes.slice(1).every(c => masters.includes(c)), 'content: a class master wears each of the 6 first-class outfits', [...new Set(masters)].join(','));
  const pd = fs.readFileSync(path.join(ROOT, 'public', 'paperdoll.js'), 'utf8');
  const looks = [...new Set([...(pd.match(/ARMOR_LOOK = \{([^}]*)\}/)[1].match(/'([a-z_]+)'/g) || []), ...(pd.match(/BY_TYPE = \{([^}]*)\}/)[1].match(/'([a-z_]+)'/g) || [])].map(s => s.slice(1, -1)))].filter(a => a !== 'tunic');
  R.ok(looks.every(a => CHR.layers[`eq_armor_${a}_male`] && CHR.layers[`eq_armor_${a}_female`]), 'equipment: every armor look the client maps items to exists for both bodies', looks.join(','));

  // ---- docs
  const lic = fs.readFileSync(path.join(ROOT, 'docs', 'ASSET_LICENSES.md'), 'utf8'), bible = fs.readFileSync(path.join(ROOT, 'docs', 'LUMIRA_ART_BIBLE.md'), 'utf8');
  const dirs = ['characters/base', 'characters/hair', 'characters/classes', 'npcs', 'equipment/armor', 'equipment/weapons', 'equipment/shields', 'equipment/headgear', 'world/buildings', 'world/trees', 'world/vegetation', 'world/rocks', 'world/props', ...['base', 'face', 'hair', 'armor', 'classes', 'npcs', 'weapons', 'shields', 'headgear'].map(d => 'chr_hd/' + d)];
  R.ok(dirs.every(d => fs.existsSync(A(d)) && lic.includes('public/assets/' + d + '/')), 'licenses: every art folder is listed in docs/ASSET_LICENSES.md', dirs.filter(d => !lic.includes('public/assets/' + d + '/')).join(','));
  R.ok((bible.match(/^## /gm) || []).length >= 16, 'bible: docs/LUMIRA_ART_BIBLE.md has all 16 sections', (bible.match(/^## /gm) || []).length + ' sections');
}

// ---------------------------------------------------------------- HD character standard (prototype set, assets/chr_hd)
function hdStaticTests(R) {
  const HD = JSON.parse(fs.readFileSync(A('chr_hd/chars.json'), 'utf8')), V1 = JSON.parse(fs.readFileSync(A('characters/chars.json'), 'utf8'));
  const PAL = palette(), [FW, FH] = HD.frame, n = a => HD.anims[a].n;
  R.ok(FW === 64 && FH === 80 && HD.pivot[0] === 32 && HD.pivot[1] === 74, 'hd: 64x80 frames, pivot (32,74)', JSON.stringify([HD.frame, HD.pivot]));
  R.ok(n('idle') === 4 && n('walk') === 6 && n('attack') >= 6 && n('attack') <= 8 && n('cast') === 6 && n('hit') === 3 && n('death') === 6,
    'hd: animation standard (idle 4, walk 6, attack 6-8, cast 6, hit 3, death 6)', ['idle', 'walk', 'attack', 'cast', 'hit', 'death'].map(a => a + n(a)).join(' '));
  R.ok(HD.slots.length === 10 && ['base', 'hair', 'face', 'armor', 'weapon', 'shield', 'back', 'head', 'costume', 'aura'].every(k => HD.slots.includes(k)) &&
    ['S', 'N', 'E'].every(v => HD.slots.filter(k => k !== 'aura').every(k => HD.order[v].includes(k))), 'hd: 10 layer slots, every sheet slot placed in the draw order of all views (aura = engine)');
  // files, grid, naming, palette, no baked shadow
  const files = walk(A('chr_hd')).filter(f => f.endsWith('.png')), ims = {};
  const NAME = /^(chr_base_(male|female)|chr_face_(male|female)|chr_hair_[a-z]+|chr_class_[a-z]+_(male|female)|chr_back_[a-z_]+_(male|female)|eq_armor_[a-z_]+_(male|female)|eq_weapon_[a-z]+_(male|female)|eq_shield_[a-z]+_(male|female)|eq_head_[a-z_]+|npc_outfit_[a-z]+_(male|female))_[abc]\.png$/;
  R.ok(files.length >= 200 && files.every(f => NAME.test(path.basename(f))), 'hd: file naming convention', files.filter(f => !NAME.test(path.basename(f))).slice(0, 3).join(','));
  const need = Object.entries(HD.layers).flatMap(([k, p]) => ['a', 'b', ...(HD.bowGroups.includes(k) ? ['c'] : [])].map(g => A(p + '_' + g + '.png')));
  R.ok(need.every(f => fs.existsSync(f)), 'hd: every layer has groups a/b (+ bow-posed group c for body layers)', need.filter(f => !fs.existsSync(f)).slice(0, 3).join(','));
  const off = [], semi = [], grid = [];
  for (const f of files) {
    const im = ims[f] = readPNG(f), g = path.basename(f).slice(-5, -4), G = HD.groups[g];
    if (im.w !== G.cols * FW || im.h % FH) grid.push(path.basename(f));
    const seen = new Set();
    for (let i = 0; i < im.px.length; i += 4) {
      const a = im.px[i + 3]; if (!a) continue; if (a < 255) { semi.push(path.basename(f)); break; }
      const k = (im.px[i] << 16) | (im.px[i + 1] << 8) | im.px[i + 2]; if (seen.has(k)) continue; seen.add(k);
      if (!k || !PAL.has(hexOf(im.px[i], im.px[i + 1], im.px[i + 2]))) { off.push(path.basename(f) + ' ' + hexOf(im.px[i], im.px[i + 1], im.px[i + 2])); break; }
    }
  }
  R.ok(!grid.length, 'hd: every sheet is 9 frames wide on the 64x80 grid', grid.slice(0, 3).join(','));
  R.ok(!off.length, 'hd: every pixel is a master palette colour (no pure black)', off.slice(0, 4).join(', '));
  R.ok(!semi.length, 'hd: no baked shadow or soft pixels in character sheets (shadow is drawn by the engine)', semi.slice(0, 3).join(','));
  const sheet = (k, g) => ims[A(HD.layers[k] + '_' + g + '.png')];
  const box = (im, g, k) => bbox(im, (k % 9) * FW, Math.floor(k / 9) * FH, FW, FH);
  // pivot, height, head ratio, scale vs v1
  const feet = [], hs = [], jit = [];
  for (const sx of ['male', 'female']) {
    const im = sheet('chr_base_' + sx, 'a');
    for (const an of ['idle', 'walk']) for (const v of HD.dirs) {
      let prev = null;
      for (let f = 0; f < n(an); f++) {
        const b = box(im, 'a', HD.groups.a.index[an][v] + f);
        if (!b || b.b < 72 || b.b > 74 || Math.abs((b.l + b.r) / 2 - 32) > (an === 'walk' && v === 'E' ? 7 : 3)) feet.push(`${sx} ${an} ${v}${f}: ${b && [b.b, (b.l + b.r) / 2]}`);
        if (prev && (Math.abs(b.t - prev.t) > 1 || (v !== 'E' && Math.abs(b.l + b.r - prev.l - prev.r) / 2 > 1.5))) jit.push(`${sx} ${an} ${v}${f}`);
        prev = b;
      }
    }
    hs.push(box(im, 'a', HD.groups.a.index.idle.S).h);
  }
  R.ok(!feet.length, 'hd: feet on the ground line (y≈73) and centred in every idle/walk frame', feet.slice(0, 4).join('; '));
  R.ok(!jit.length, 'hd: idle/walk frames never jump (top moves ≤1px, centre ≤1.5px between frames)', jit.slice(0, 4).join('; '));
  const heads = hs.map(h => h / HD.head[1]), v1h = V1.height;
  R.ok(hs.every(h => h >= 48 && h <= 54) && heads.every(r => r >= 3 && r <= 3.5), 'hd: character ≈50px tall, 3-3.5 heads', hs.join(',') + ' / ' + heads.map(r => r.toFixed(2)).join(','));
  R.ok(hs.every(h => h / v1h >= 1.15 && h / v1h <= 1.25), 'hd: in-game size +15..25% over the v1 characters (same collider / tile)', hs.map(h => (h / v1h).toFixed(2)).join(','));
  // headgear follows the head: offset between the body's top and the headgear's top is constant through every animation of a view
  const hg = [];
  for (const vis of HD.headgear) for (const g of ['a', 'b']) for (const v of HD.dirs) {
    const body = sheet('chr_hair_short', g), hat = sheet('eq_head_' + vis, g); const offs = new Set();   // the hair layer marks where the head is
    for (const an of Object.keys(HD.groups[g].index)) { if (an === 'death' || an === 'sit') continue;
      for (let f = 0; f < n(an); f++) { const k = HD.groups[g].index[an][v] + f, a = box(body, g, k), h = box(hat, g, k); if (!h) { hg.push(`${vis} ${an} ${v}${f} empty`); continue; } offs.add(h.t - a.t); } }
    if (Math.max(...offs) - Math.min(...offs) > 2) hg.push(`${vis} ${v} ${g}: ${[...offs]}`);
  }
  const kinds = new Set(Object.values(HD.headgearKind));
  R.ok(!hg.length, 'hd: every headgear is drawn in N/S/E (W mirrored) and follows the head in every frame', hg.slice(0, 4).join('; '));
  R.ok(['Hat', 'Helmet', 'Hood', 'Crown', 'Cap', 'Headband', 'Mask', 'Wizard Hat', 'Ranger Hood'].every(k => kinds.has(k)), 'hd: headgear types Hat/Helmet/Hood/Crown/Cap/Headband/Mask/Wizard Hat/Ranger Hood', [...kinds].join(','));
  // weapons are visible and move with the swing
  const wbad = [];
  for (const wt of ['sword', 'greatsword', 'dagger', 'bow', 'staff', 'wand', 'mace', 'spear']) for (const sx of ['male', 'female']) {
    const w = sheet('eq_weapon_' + wt + '_' + sx, 'b'); if (!w) { wbad.push(wt + ' missing'); continue; }
    for (const v of HD.dirs) { const bs = []; for (let f = 0; f < n('attack'); f++) { const b = box(w, 'b', HD.groups.b.index.attack[v] + f); if (!b) wbad.push(`${wt} ${v}${f} empty`); else bs.push(b.l + ',' + b.t + ',' + b.w + ',' + b.h); } if (new Set(bs).size < 3) wbad.push(`${wt} ${sx} ${v} static`); }
  }
  R.ok(!wbad.length && ['round', 'kite'].every(k => HD.layers['eq_shield_' + k + '_male']), 'hd: sword, great sword, dagger, bow, staff, wand, mace, spear + shields drawn on the body and animated', wbad.slice(0, 4).join('; '));
  // prototype coverage
  const L = k => !!HD.layers[k];
  const proto = { 'Adventurer M': ['chr_base_male', 'chr_class_adventurer_male', 'eq_armor_tunic_blue_male', 'chr_back_adventurer_male'], 'Adventurer F': ['chr_base_female', 'chr_class_adventurer_female', 'eq_armor_tunic_blue_female'],
    Guard: ['npc_outfit_guard_male', 'eq_head_iron', 'eq_weapon_spear_male'], Merchant: ['npc_outfit_merchant_male', 'eq_head_cap'], Blacksmith: ['npc_outfit_blacksmith_male', 'eq_weapon_mace_male'],
    Vanguard: ['chr_class_vanguard_male', 'eq_armor_plate_male', 'eq_shield_kite_male', 'eq_weapon_sword_male'], Ranger: ['chr_class_ranger_female', 'eq_armor_leather_female', 'eq_weapon_bow_female', 'chr_back_ranger_female', 'eq_head_hood_green'],
    Arcanist: ['chr_class_arcanist_male', 'eq_armor_robe_violet_male', 'eq_weapon_staff_male', 'eq_head_wizard'] };
  const pm = Object.entries(proto).filter(([, ks]) => !ks.every(L)).map(([k]) => k);
  R.ok(!pm.length && HD.hair.every(h => L('chr_hair_' + h)), 'hd: prototype looks complete (Adventurer M/F, Guard, Merchant, Blacksmith, Vanguard, Ranger, Arcanist) + all 6 hair styles', pm.join(','));
}

// ---------------------------------------------------------------- browser: the client really draws the art set
function loadPlaywright() {
  try { return require('playwright'); } catch (e) { }
  try { const root = require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); return require(root + '/playwright'); } catch (e) { }
  return null;
}
const SEEDS = {
  a_vil: H.mkChar('AVillage', { lv: 5, map: 'lumira', x: 25, y: 20 }),
  a_cap: H.mkChar('ACapital', { lv: 12, map: 'solkara', x: 21, y: 20, cls: 'vanguard', eq: { wpn: 20, arm: 304 } }),
};
async function browserTests(srv, R) {
  const pw = loadPlaywright(); if (!pw) { R.skipped('art browser checks', 'playwright not installed'); return; }
  const b = await pw.chromium.launch();
  try {
    for (const [u, mapId] of [['a_vil', 'lumira'], ['a_cap', 'solkara']]) {
      const ctx = await b.newContext({ viewport: { width: 844, height: 390 } }), pg = await ctx.newPage(), errs = [];
      pg.on('pageerror', e => errs.push(e.message)); await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
      await pg.goto(srv.http + '/'); await pg.fill('#u', u); await pg.fill('#p', H.PW); await pg.click('#go'); await H.uiEnter(pg);
      await pg.waitForFunction(() => document.getElementById('hud').style.display === 'block' && typeof CHR !== 'undefined' && CHR && Object.keys(WSPR).length && ents.get(myId), null, { timeout: 10000 });
      // first pass asks for every layer sheet this map needs (they load lazily), then measure
      await pg.evaluate(() => { const g = document.createElement('canvas').getContext('2d'), e = ents.get(myId); drawPaper(e.look, { wpn: e.wpn, arm: e.arm, cls: e.cls }, 'walk', 0.3, 2, 32, 60, 1, g); for (const n of map.npcs) if (n.look && typeof n.look === 'object') drawPaper(n.look, {}, 'idle', 0, 2, 32, 60, 1, g); });
      await pg.waitForTimeout(1500);
      const r = await pg.evaluate(() => {
        const out = { map: map.id, props: props.length, missing: props.filter(p => !WSPR[p.n] && !(p.fb && META.px[p.fb]) && !META.px[p.n]).map(p => p.n).slice(0, 5) };
        out.lumiraProps = props.filter(p => WSPR[p.n]).length;
        // every sprite of this map is decoded
        out.notLoaded = props.filter(p => WSPR[p.n] && !img(WSPR[p.n].path)).map(p => p.n).slice(0, 5);
        // paperdoll draws my character and every NPC look
        const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
        const e = ents.get(myId);
        out.hero = drawPaper(e.look, { wpn: e.wpn, arm: e.arm, cls: e.cls }, 'walk', 0.3, 2, 32, 60, 1, g);
        out.layers = paperLayers(e.look, { wpn: e.wpn, arm: e.arm, cls: e.cls });
        out.npcs = map.npcs.filter(n => n.look && typeof n.look === 'object').map(n => drawPaper(n.look, {}, 'idle', 0, 2, 32, 60, 1, g)).filter(x => !x).length;
        const d = g.getImageData(0, 0, 64, 64).data; let op = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) op++; out.opaque = op;
        // canopy fade: put a tree just below the player so the player is behind its canopy, and one far away
        const tr = WSPR.tree_oak_01, px = (e.x + 0.5) * TP, py = (e.y + 0.5) * TP + 12;
        out.fadeNear = canopyAlpha({ n: 'tree_oak_01', x: px, y: py + 20 }); out.fadeFar = canopyAlpha({ n: 'tree_oak_01', x: px + 400, y: py + 20 });
        out.fadeFront = canopyAlpha({ n: 'tree_oak_01', x: px, y: py - 10 });
        out.tree = !!tr;
        return out;
      });
      R.ok(r.map === mapId && !r.missing.length, `art[${mapId}]: every map prop resolves to a sprite`, JSON.stringify(r.missing));
      R.ok(r.lumiraProps > 20 && !r.notLoaded.length, `art[${mapId}]: LUMIRA world sprites load and are drawn`, r.lumiraProps + ' ' + JSON.stringify(r.notLoaded));
      R.ok(r.hero && r.opaque > 200 && r.layers.base && r.layers.armor && r.layers.class && r.layers.hair, `art[${mapId}]: player drawn as layered paperdoll (base/armor/class/hair${r.layers.weapon ? '/weapon' : ''})`, JSON.stringify(r.layers));
      R.ok(!r.npcs, `art[${mapId}]: every NPC is drawn from paperdoll layers`, r.npcs + ' failed');
      if (mapId === 'solkara') R.ok(r.layers.class === 'chr_class_vanguard_male' && r.layers.armor === 'eq_armor_plate_male' && r.layers.shield === 'eq_shield_kite', 'art: class + equipped armor/weapon change the visible layers (vanguard, plate, kite shield)', JSON.stringify(r.layers));
      else R.ok(r.tree && r.fadeNear < 1 && r.fadeFar === 1 && r.fadeFront === 1, 'art: tree canopy turns see-through only when the player is behind it', `${r.fadeNear}/${r.fadeFar}/${r.fadeFront}`);
      if (mapId === 'lumira') {
        await pg.evaluate(() => { const g = document.createElement('canvas').getContext('2d'); for (const n of map.npcs) if (n.look && typeof n.look === 'object') drawPaper(n.look, {}, 'attack', 0.2, 3, 32, 70, 1, g); });
        await pg.waitForTimeout(1500);
        const measure = () => pg.evaluate(() => {
          const e = ents.get(myId), gear = { wpn: e.wpn, arm: e.arm, cls: e.cls }, o = {};
          const meas = (look, gr, set) => { const c = document.createElement('canvas'); c.width = 96; c.height = 120; const g = c.getContext('2d'); HUD.S.chrHD = set === 'hd'; lastPaperSet = null; const ok = drawPaper(look, gr, 'idle', 0, 2, 48, 100, 1, g); const d = g.getImageData(0, 0, 96, 120).data; let t = 999, b = -1, sum = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) { const y = Math.floor((i >> 2) / 96); t = Math.min(t, y); b = Math.max(b, y); sum = (sum * 31 + d[i - 3] + d[i - 2] * 7 + i) % 1000003; } HUD.S.chrHD = true; return { ok, set: lastPaperSet, h: b - t + 1, top: 100 - t, sum }; };
          o.hd = meas(e.look, gear, 'hd'); o.v1 = meas(e.look, gear, 'v1');
          o.plate = meas(e.look, { ...gear, arm: 304 }, 'hd'); o.sword = meas(e.look, { ...gear, wpn: 1 && Object.values(ITEMS).find(i => i.wt === 'greatsword').id }, 'hd');
          o.hat = meas(e.look, { ...gear, head: 'wizard' }, 'hd'); o.hatTop = heroTopOf(o.hd.set, 'wizard'); o.bareTop = heroTopOf(o.hd.set, '');
          const want = { shop: 'merchant', smith: 'blacksmith', m_vanguard: 'vanguard', m_ranger: 'ranger' };
          o.npc = Object.entries(want).map(([id, k]) => { const n = map.npcs.find(q => q.id === id); return n && ['hd', 'lpc'].includes(meas(n.look, {}, 'hd').set) ? null : id; }).filter(Boolean);
          const kid = map.npcs.find(q => q.id === 'kid'); o.kid = kid ? meas(kid.look, {}, 'hd').set : 'none';
          HUD.S.chrHD = false; lastPaperSet = null; drawPaper(e.look, gear, 'idle', 0, 2, 48, 100, 1, document.createElement('canvas').getContext('2d')); o.off = lastPaperSet; HUD.S.chrHD = true;
          const c = document.createElement('canvas').getContext('2d'); o.aura = (() => { try { drawAura(c, 30, 30, '#8fd0ff', 1, false); drawAura(c, 30, 30, '#8fd0ff', 1, true); return true; } catch (er) { return false; } })();
          return o;
        });
        await measure(); await pg.waitForTimeout(1500);   // first pass loads the sheets these looks need
        const h = await measure();
        const HDS = s => s === 'hd' || s === 'lpc';
        R.ok(h.hd.ok && HDS(h.hd.set) && h.v1.set === 'v1', 'hd[game]: the player is drawn from the HD/LPC set; the v1 set is used when HD is switched off', JSON.stringify([h.hd.set, h.v1.set]));
        R.ok(h.hd.h / h.v1.h >= (h.hd.set === 'lpc' ? 1.0 : 1.12) && h.hd.h / h.v1.h <= 1.3, 'hd[game]: HD/LPC character is drawn at least as large as v1 at the same position', (h.hd.h / h.v1.h).toFixed(2) + ` (${h.hd.h}px vs ${h.v1.h}px)`);
        R.ok(h.plate.sum !== h.hd.sum && h.sword.sum !== h.hd.sum && h.hat.sum !== h.hd.sum && HDS(h.plate.set) && HDS(h.sword.set) && HDS(h.hat.set), 'hd[game]: equipped armor, weapon and headgear change the drawn HD character');
        R.ok(h.bareTop >= h.hd.top && h.hatTop >= h.hat.top, 'hd[game]: badges / bubbles sit above the head and the headgear', `bare ${h.bareTop}>=${h.hd.top}, hat ${h.hatTop}>=${h.hat.top}`);
        R.ok(!h.npc.length, 'hd[game]: prototype NPCs (merchant, blacksmith, vanguard master, ranger master) render in HD', h.npc.join(','));
        R.ok((h.kid === 'v1' || h.kid === 'lpc') && h.off === 'v1', 'hd[game]: other looks are drawn whole (LPC or v1, never half HD); the setting turns HD off', h.kid + '/' + h.off);
        R.ok(h.aura, 'hd[game]: aura layer is drawn by the engine (not baked into sprites)');
      }
      R.ok(!errs.length, `art[${mapId}]: no page errors`, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
  } finally { await b.close(); }
}

async function run(srv, R) {
  try { staticTests(R); } catch (e) { R.ok(false, 'art static suite crashed', e.stack); }
  try { hdStaticTests(R); } catch (e) { R.ok(false, 'hd static suite crashed', e.stack); }
  if (srv) await browserTests(srv, R);
}
module.exports = { SEEDS, run, readPNG };
