#!/usr/bin/env python3
"""Build LUMIRA UI assets from the art sheets in public/assets/import/.

    pip install pillow numpy scipy
    python3 tools/build_ui_assets.py

Sheets are never shipped to the game as-is. Every piece is cut out of its sheet (connected components on the
alpha channel, each pixel owned by its nearest piece so touching gems/glows stay with their own icon), baked-in
sample text/numbers are painted out, portrait/map windows are hollowed so the game can draw real data behind,
then everything is packed into small WebP files + a JSON manifest in public/assets/ui/.

Parts of the sheets that copy another game (the "Poring" monster, "Prontera" map name) are deliberately not used.
"""
import glob, json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public', 'assets', 'import')
OUT = os.path.join(ROOT, 'public', 'assets', 'ui')


def sheet(suffix):
    hits = [p for p in glob.glob(os.path.join(SRC, '*.png')) if p.endswith(suffix)]
    if len(hits) != 1: sys.exit(f'expected one sheet ending with {suffix!r}, found {hits}')
    return Image.open(hits[0]).convert('RGBA')


class Sheet:
    """Sheet split into pieces; pieces are fetched by a point that lies inside them."""
    def __init__(self, suffix, erode=8, thr=24):
        self.im = sheet(suffix); A = np.array(self.im); mask = A[..., 3] > thr
        core = ndimage.binary_erosion(mask, iterations=erode)
        lab, _ = ndimage.label(core)
        _, (iy, ix) = ndimage.distance_transform_edt(lab == 0, return_indices=True)
        self.own = lab[iy, ix] * mask; self.A = A

    def piece(self, x, y):
        k = self.own[y, x]
        if not k:  # point on a gap: take the nearest owned pixel
            ys, xs = np.nonzero(self.own); i = np.argmin((xs - x) ** 2 + (ys - y) ** 2); k = self.own[ys[i], xs[i]]
        ys, xs = np.nonzero(self.own == k)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        out = self.A[y0:y1, x0:x1].copy(); out[..., 3] = np.where(self.own[y0:y1, x0:x1] == k, out[..., 3], 0)
        return Image.fromarray(out), (x0, y0)

    def box(self, x0, y0, x1, y1):
        return Image.fromarray(self.A[y0:y1, x0:x1].copy())


def trim(im):
    bb = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    return im.crop(bb) if bb else im


def fit(im, size, upscale=1.0):
    """Scale into a size x size transparent square (no distortion, never enlarged past `upscale`)."""
    im = trim(im); s = min(size / im.width, size / im.height, upscale)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    cell = Image.new('RGBA', (size, size)); cell.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return cell


def fill(im, box, color=None):
    """Paint out baked text: fill a box with the median plate colour found inside it (or a given colour)."""
    A = np.array(im); x0, y0, x1, y1 = box
    if color is None:
        reg = A[y0:y1, x0:x1].reshape(-1, 4); dark = reg[reg[:, :3].sum(1) < 200]
        color = tuple(int(v) for v in np.median(dark if len(dark) else reg, 0))
    A[y0:y1, x0:x1] = color
    return Image.fromarray(A)


def disk(im, cx, cy, r, color=None, hollow=False, keep=None):
    A = np.array(im); Y, X = np.mgrid[:A.shape[0], :A.shape[1]]
    m = (X - cx) ** 2 + (Y - cy) ** 2 <= r * r
    if keep: kx0, ky0, kx1, ky1 = keep; m &= ~((X >= kx0) & (X < kx1) & (Y >= ky0) & (Y < ky1))
    if hollow: A[m, 3] = 0
    else: A[m] = color
    return Image.fromarray(A)


def orbify(frame, art, cx, cy, r):
    """Put square artwork inside a round orb frame (used so Bash / talk match the other round buttons)."""
    f = frame.copy(); art = trim(art).resize((int(r * 2.25), int(r * 2.25)), Image.LANCZOS)
    layer = Image.new('RGBA', f.size); layer.alpha_composite(art, (int(cx - art.width / 2), int(cy - art.height / 2)))
    mask = Image.new('L', f.size, 0); ImageDraw.Draw(mask).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    A = np.array(f); inner = np.array(mask) > 0
    A[inner] = (10, 18, 40, 255)  # dark orb glass behind the art
    base = Image.fromarray(A); clipped = Image.new('RGBA', f.size); clipped.paste(layer, (0, 0), Image.fromarray(np.minimum(np.array(layer)[..., 3], np.array(mask))))
    base.alpha_composite(clipped)
    ring = Image.fromarray(np.where(inner[..., None], 0, np.array(frame)).astype(np.uint8))  # frame ring on top again
    base.alpha_composite(ring); return base


def orb_inner(img):  # inner glass circle of a round orb piece (measured on the sheet: r = 0.345 w, 116px above the bottom)
    w, h = img.size; return w / 2, h - w / 2, w * 0.345


class Atlas:
    def __init__(self, cell, cols, q=84): self.cell, self.cols, self.cells, self.q = cell, cols, [], q
    def add(self, name, im): self.cells.append((name, im))
    def save(self, base):
        n = len(self.cells); rows = (n + self.cols - 1) // self.cols
        at = Image.new('RGBA', (self.cols * self.cell, rows * self.cell)); idx = {}
        for i, (name, im) in enumerate(self.cells):
            at.alpha_composite(fit(im, self.cell), ((i % self.cols) * self.cell, (i // self.cols) * self.cell)); idx[name] = i
        at.save(os.path.join(OUT, base + '.webp'), 'WEBP', quality=self.q, method=6)
        return dict(file=base + '.webp', cell=self.cell, cols=self.cols, rows=rows, w=at.width, h=at.height, map=idx)


def save(im, name, width):
    im = trim(im); h = round(im.height * width / im.width)
    im.resize((width, h), Image.LANCZOS).save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=90, method=6)
    return dict(file=name + '.webp', w=width, h=h)


def main():
    os.makedirs(OUT, exist_ok=True)
    menu = Sheet('10_34_31-1.png', erode=10)       # 11 square menu icons
    wheel = Sheet('10_34_32-2.png', erode=10)      # attack + 6 skill orbs + potion/target/pick/auto
    hud = Sheet('10_34_33-3.png', erode=6)         # player status frame
    mm = Sheet('10_34_34-4.png', erode=6)          # minimap frame
    joy = Sheet('10_34_35-5.png', erode=6)         # joystick ring + knob
    quest = Sheet('10_34_36-6.png', erode=6)       # quest marker
    tgt = Sheet('10_34_37-7.png', erode=6)         # target frame, target rings, arrow
    badge = Sheet('10_34_39-8.png', erode=10)      # NPC badges
    big = Sheet('LUMIRA-2.png', erode=2)           # item + square skill icons
    man = {}

    # ---------------- icons atlas (136px square cells: sharp on 3x phones at wheel/menu sizes, ~1/3 of the bytes of 160px)
    ic = Atlas(136, 8)
    for name, pt in {'menu_skill': (160, 270), 'menu_equip': (470, 270), 'menu_bag': (780, 270), 'menu_gold': (1090, 270),
                     'menu_quest': (160, 620), 'menu_map': (470, 620), 'menu_party': (780, 620), 'menu_guild': (1090, 620),
                     'menu_auto': (300, 980), 'menu_settings': (630, 980), 'menu_more': (950, 980)}.items():
        ic.add(name, menu.piece(*pt)[0])
    orbs = {}
    for name, pt in {'sk_twin': (668, 360), 'sk_bolt': (900, 360), 'orb_ice': (1130, 360), 'sk_cleave': (668, 620),
                     'sk_focus': (900, 620), 'sk_heal': (1130, 620), 'btn_potion': (160, 950), 'btn_target': (475, 950),
                     'btn_pick': (775, 950), 'btn_auto': (1080, 950)}.items():
        orbs[name] = wheel.piece(*pt)[0]; ic.add(name, orbs[name])
    ice = orbs['orb_ice']; cx, cy, r = orb_inner(ice)
    burst = big.box(1411, 944, 1456, 997)                                     # orange burst, inside its square frame (that row is one connected strip)
    ic.add('sk_bash', orbify(ice, burst, cx, cy, r))
    ic.add('slot_empty', orbify(ice, Image.new('RGBA', (8, 8)), cx, cy, r))  # empty orb glass
    chat = badge.piece(240, 1000)[0]
    talk_art = chat.crop((int(chat.width * .2), int(chat.height * .25), int(chat.width * .8), int(chat.height * .72)))
    ic.add('btn_talk', orbify(ice, talk_art, cx, cy, r * 0.92))
    for name, pt in {'npc_quest': (240, 220), 'npc_done': (630, 220), 'npc_shop': (1010, 220), 'npc_smith': (240, 600),
                     'npc_heal': (630, 600), 'npc_portal': (1010, 600), 'npc_talk': (240, 1000), 'npc_boss': (630, 1000),
                     'npc_party': (1010, 1000)}.items():
        ic.add(name, badge.piece(*pt)[0])
    ic.add('quest_mark', quest.piece(420, 720)[0])
    ic.add('tgt_arrow', tgt.piece(1290, 600)[0])
    ic.add('tgt_ring_blue', tgt.piece(300, 650)[0])
    ic.add('tgt_ring_red', tgt.piece(900, 650)[0])
    ic.add('joy_knob', joy.piece(1050, 640)[0])
    man['icons'] = ic.save('ui_icons')

    # ---------------- item atlas (72px cells, real LUMIRA item ids -> nearest matching artwork)
    it = Atlas(72, 8)
    ITEM_ART = {1: (965, 810), 2: (1177, 810), 3: (1017, 810), 10: (1196, 859), 11: (1482, 909), 12: (1407, 858), 13: (1260, 909),
                14: (1250, 858), 15: (1394, 812), 20: (31, 783), 21: (75, 783), 22: (378, 783), 23: (315, 783), 30: (99, 904),
                31: (43, 903), 40: (624, 844), 41: (394, 845)}
    for iid, pt in ITEM_ART.items(): it.add(str(iid), big.piece(*pt)[0])
    for name, pt in {'slot_wpn': (378, 783), 'slot_head': (44, 846), 'slot_arm': (270, 905), 'slot_shield': (774, 780),
                     'slot_acc': (605, 966), 'slot_shoes': (39, 965)}.items():
        it.add(name, big.piece(*pt)[0])
    man['items'] = it.save('ui_items')

    # ---------------- big pieces (own files)
    atk, _ = wheel.piece(290, 440); man['attack'] = save(atk, 'btn_attack', 288)
    ring, _ = joy.piece(430, 630); man['joy_ring'] = save(ring, 'joy_ring', 320)

    # player status frame: paint out sample name/class/values/level, empty the bars (the game draws real ones)
    f, (ox, oy) = hud.piece(700, 500)
    L = lambda x, y: (x - ox, y - oy)
    def rect(b): return (*L(b[0], b[1]), *L(b[2], b[3]))
    f = fill(f, rect((596, 350, 1004, 398)))                       # name
    f = fill(f, rect((1160, 356, 1364, 394)))                      # class
    for y0, y1 in ((462, 491), (533, 563), (608, 636)):            # HP / SP / EXP bar insides
        f = fill(f, rect((689, y0, 1224, y1)), (13, 22, 36, 255))
        f = fill(f, rect((1238, y0 - 8, 1376, y1 + 8)))            # sample values
    f = disk(f, *L(265, 683), 50, (14, 23, 36, 255))               # level medal text
    man['hud'] = save(f, 'hud_frame', 640)
    man['hud']['src'] = dict(x0=ox, y0=oy, w=f.width, h=f.height)
    # overlay boxes in % of the trimmed frame (the trim is done the same way in save())
    t = trim(f); bb = f.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox(); tx, ty = ox + bb[0], oy + bb[1]
    P = lambda b: [round((b[0] - tx) / t.width * 100, 2), round((b[1] - ty) / t.height * 100, 2), round((b[2] - b[0]) / t.width * 100, 2), round((b[3] - b[1]) / t.height * 100, 2)]
    man['hud']['boxes'] = dict(portrait=P((112, 328, 428, 628)), level=P((215, 645, 315, 720)), name=P((596, 350, 1004, 398)), job=P((1160, 356, 1364, 394)),
                               hp=P((689, 462, 1224, 491)), sp=P((689, 533, 1224, 563)), exp=P((694, 608, 1224, 636)),
                               hpv=P((1238, 454, 1376, 499)), spv=P((1238, 525, 1376, 571)), expv=P((1238, 600, 1376, 644)),
                               buffs=P((552, 678, 1248, 772)))

    # target frame: hollow the sample portrait, paint out sample name / level / HP
    f, (ox, oy) = tgt.piece(700, 200)
    L = lambda x, y: (x - ox, y - oy)
    def rect(b): return (*L(b[0], b[1]), *L(b[2], b[3]))
    f = disk(f, *L(316, 224), 124, hollow=True, keep=rect((228, 296, 398, 362)))
    f = fill(f, rect((246, 306, 382, 350)))                        # "Lv.38"
    f = fill(f, rect((652, 176, 1100, 240)))                       # sample name
    f = fill(f, rect((518, 264, 1256, 302)), (20, 16, 24, 255))    # HP bar + numbers
    man['target'] = save(f, 'target_frame', 600)
    t = trim(f); bb = f.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox(); tx, ty = ox + bb[0], oy + bb[1]
    P = lambda b: [round((b[0] - tx) / t.width * 100, 2), round((b[1] - ty) / t.height * 100, 2), round((b[2] - b[0]) / t.width * 100, 2), round((b[3] - b[1]) / t.height * 100, 2)]
    man['target']['boxes'] = dict(portrait=P((192, 100, 440, 348)), level=P((246, 304, 382, 352)), name=P((652, 176, 1100, 240)),
                                  hp=P((518, 264, 1256, 302)), status=P((530, 306, 1240, 346)), close=P((1190, 330, 1275, 400)))

    # minimap frame: hollow the sample map (keep the corner ornaments), paint out sample title / coordinates
    f, (ox, oy) = mm.piece(160, 600)
    L = lambda x, y: (x - ox, y - oy)
    def rect(b): return (*L(b[0], b[1]), *L(b[2], b[3]))
    A = np.array(f); x0, y0, x1, y1 = rect((272, 312, 984, 932))
    sub = A[y0:y1, x0:x1]; r_, g_, b_ = [sub[..., i].astype(int) for i in range(3)]
    gold = (r_ > 150) & (g_ > 100) & (b_ < 110) & (r_ - b_ > 70); gem = (b_ > 200) & (r_ < 150)
    Y, X = np.mgrid[:sub.shape[0], :sub.shape[1]]; corner = ((X < 60) | (X > sub.shape[1] - 60)) & ((Y < 50) | (Y > sub.shape[0] - 55))
    sub[..., 3] = np.where(corner & (gold | gem), sub[..., 3], 0); f = Image.fromarray(A)
    f = fill(f, rect((444, 196, 800, 268)))                        # title
    f = fill(f, rect((555, 984, 930, 1052)))                       # coordinates (+ separator)
    man['minimap'] = save(f, 'minimap_frame', 420)
    t = trim(f); bb = f.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox(); tx, ty = ox + bb[0], oy + bb[1]
    P = lambda b: [round((b[0] - tx) / t.width * 100, 2), round((b[1] - ty) / t.height * 100, 2), round((b[2] - b[0]) / t.width * 100, 2), round((b[3] - b[1]) / t.height * 100, 2)]
    man['minimap']['boxes'] = dict(map=P((272, 312, 984, 932)), title=P((444, 196, 800, 268)), coords=P((555, 984, 800, 1052)), players=P((800, 984, 930, 1052)))

    with open(os.path.join(OUT, 'ui.json'), 'w') as fh: json.dump(man, fh, indent=1, default=int)  # numpy ints
    total = sum(os.path.getsize(os.path.join(OUT, p)) for p in os.listdir(OUT))
    print('wrote', OUT, f'{total / 1024:.0f} KB'); [print(' ', p, f'{os.path.getsize(os.path.join(OUT, p)) / 1024:.0f} KB') for p in sorted(os.listdir(OUT))]


if __name__ == '__main__':
    main()
