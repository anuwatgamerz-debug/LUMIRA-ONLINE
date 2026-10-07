#!/usr/bin/env python3
"""Ashen Frontier (Region 3) world sprites, recoloured from the LPC world sprites already in public/assets/world
(same licence and credits as their sources, see docs/ASSET_LICENSES.md):

  charred trees, ash-grey trees, basalt rocks, glowing lava rocks, dry ash grass, a smouldering bush.

  python tools/art/lpc/build_ashen_world.py            -> public/assets/world/{trees,rocks,vegetation}/*.png + world.json
"""
import colorsys, json, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'public', 'assets', 'world')

def hsl_map(im, fn):
    im = im.convert('RGBA'); px = im.load(); memo = {}
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            k = (r, g, b)
            if k not in memo:
                h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
                h, l, s = fn(h, l, s, x, y)
                memo[k] = tuple(round(v * 255) for v in colorsys.hls_to_rgb(h % 1, max(0, min(1, l)), max(0, min(1, s))))
            px[x, y] = memo[k] + (a,)
    return im

def _h(x, y, k=0):
    v = (x * 374761393 + y * 668265263 + k * 2246822519) & 0xffffffff; v = ((v ^ (v >> 13)) * 1274126177) & 0xffffffff
    return ((v ^ (v >> 16)) & 0xffff) / 65535

def _noise(x, y, s):
    """smooth value noise (blobs of about s pixels)"""
    gx, gy = x / s, y / s; x0, y0 = int(gx), int(gy); fx, fy = gx - x0, gy - y0
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b, c, d = _h(x0, y0), _h(x0 + 1, y0), _h(x0, y0 + 1), _h(x0 + 1, y0 + 1)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy

def dead_tree(im, canopy, ax, seed=1):
    """dead tree: the LPC trunk is kept (charred), the foliage removed and bare branches drawn in its place
    (pixel lines, 1 px dark outline, a lit left edge and a few ember tips)"""
    import math
    from PIL import ImageDraw
    im = im.convert('RGBA'); px = im.load(); cx0, cy0, cx1, cy1 = canopy
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            if y <= cy1 - 4: px[x, y] = (0, 0, 0, 0); continue           # canopy area: cleared
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if 0.17 < h < 0.5 and s > 0.15: px[x, y] = (0, 0, 0, 0); continue   # leaves hanging below the box
            r2, g2, b2 = colorsys.hls_to_rgb(0.05, l * 0.55, s * 0.3)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    segs = []
    def grow(x, y, ang, ln, w, depth, k):
        x2, y2 = min(cx1 - 2, max(cx0 + 2, x + math.cos(ang) * ln)), min(im.height - 2, max(cy0 + 2, y - math.sin(ang) * ln))
        segs.append((x, y, x2, y2, w))
        if depth == 0: return
        n = 2 if depth > 1 else 2 + (_h(k, depth) > 0.6)
        for i in range(n):
            da = (-0.55 + 1.1 * i / max(1, n - 1)) + (_h(k, i, depth) - 0.5) * 0.5
            grow(x2, y2, ang + da, ln * (0.62 + _h(k + 3, i) * 0.18), max(1, w - 1), depth - 1, k * 3 + i + 1)
    top = cy1 - 2; height = cy1 - cy0
    grow(ax, top + 6, math.pi / 2 + (_h(seed, 7) - 0.5) * 0.15, height * 0.3, 6, 4, seed)
    dark, mid, lit = (34, 26, 24, 255), (62, 48, 42, 255), (96, 78, 66, 255)
    d = ImageDraw.Draw(im)
    for x, y, x2, y2, w in segs: d.line((x, y, x2, y2), fill=dark, width=w + 2)
    for x, y, x2, y2, w in segs: d.line((x, y, x2, y2), fill=mid, width=w)
    for x, y, x2, y2, w in segs:
        if w >= 2: d.line((x - w // 2, y, x2 - w // 2, y2), fill=lit, width=1)
    for i, (x, y, x2, y2, w) in enumerate(segs):
        if w == 1 and _h(i, seed, 11) < 0.35: im.putpixel((int(x2), int(y2)), (255, 150 + int(_h(i, 2) * 80), 50, 255))
    return im

ashleaf = lambda h, l, s, x, y: (0.08, 0.25 + l * 0.55, s * 0.12)                 # leaves covered in ash
basalt = lambda h, l, s, x, y: (0.03, l * 0.55, s * 0.18)                         # dark volcanic stone
dryash = lambda h, l, s, x, y: (0.08 + (h * 0.04), 0.18 + l * 0.6, s * 0.35)       # dry, grey-orange grass
def lava_rock(h, l, s, x, y):                                                       # basalt with glowing veins
    return (0.07 + l * 0.05, min(0.72, l * 1.25), 1) if s > 0.55 and l > 0.42 else (0.03, l * 0.42, s * 0.15)
def smoulder(h, l, s, x, y):
    return (0.07, 0.55, 0.95) if l > 0.62 else (0.04, l * 0.5, s * 0.25)

JOBS = [  # new name, source, folder, recolour (None = dead tree), branch seed (dead trees)
    ('tree_dead_01', 'tree_pine_01', 'trees', None, 3),
    ('tree_dead_02', 'tree_oak_01', 'trees', None, 8),
    ('tree_ash_01', 'tree_oak_03', 'trees', ashleaf, 0),
    ('rock_basalt_01', 'rock_medium_03', 'rocks', basalt, 0),
    ('rock_basalt_02', 'rock_large_05', 'rocks', basalt, 0),
    ('rock_basalt_03', 'rock_small_01', 'rocks', basalt, 0),
    ('rock_basalt_04', 'rock_medium_04', 'rocks', basalt, 0),
    ('rock_lava_01', 'rock_ore_01', 'rocks', lava_rock, 0),
    ('veg_ashgrass_01', 'veg_tallgrass_01', 'vegetation', dryash, 0),
    ('veg_ashgrass_02', 'veg_grass_02', 'vegetation', dryash, 0),
    ('veg_ember_bush_01', 'veg_bush_small_01', 'vegetation', smoulder, 0),
]

if __name__ == '__main__':
    mp = os.path.join(ROOT, 'world.json'); W = json.load(open(mp, encoding='utf-8'))
    for name, src, folder, fn, emb in JOBS:
        src_im = Image.open(os.path.join(ROOT, folder, src + '.png'))
        im = dead_tree(src_im, W[src]['fade'], W[src]['ax'], emb) if fn is None else hsl_map(src_im, fn)
        im.save(os.path.join(ROOT, folder, name + '.png'), optimize=True)
        e = dict(W[src]); e['path'] = f'world/{folder}/{name}'; e['src'] = 'lpc'
        if name == 'rock_lava_01': e['glow'] = [e['w'] // 2, e['h'] // 2]
        W[name] = e; print(name, e['w'], e['h'])
    json.dump(W, open(mp, 'w', encoding='utf-8'), indent=0)
