"""LUMIRA Region 1 (Elyndra Heartland) world assets: buildings, trees, vegetation, rocks, props.

python3 tools/art/world_assets.py  -> public/assets/world/... + public/assets/world/world.json
Same rules as the characters (docs/LUMIRA_ART_BIBLE.md): master palette, light from the top-left, sel-out
outline, ground shadows to the bottom-right. Sizes are measured against the 42px character.
"""
import json, math, os, random, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from lumira_art import Layer, ramp, rect, ellipse, poly, capsule, save_png, hexrgb, SHADOW, RAMPS

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'world')
META = {}
TP = 32

# colour -> (ramp, index) so lighting passes can step a pixel up/down its own ramp and stay on the palette
RAMP_OF = {}
for _k, _r in RAMPS.items():
    if _k in ('hair', 'skin', 'eye', 'white'): continue
    for _i, _c in enumerate(_r): RAMP_OF.setdefault(hexrgb(_c), (_k, _i))
def relight(im, lit=6, shade=8):
    """top-left key light on big shapes: the left edge steps one shade lighter (lit corner / eave), the right edge
    one shade darker (shaded corner). Outline pixels (next to transparency) are left alone, so silhouettes stay crisp."""
    a = im[:, :, 3] == 255
    for y in range(im.shape[0]):
        xs = np.nonzero(a[y])[0]
        if not len(xs): continue
        x0, x1 = xs.min(), xs.max()
        for x in xs:
            d = 1 if x - x0 <= lit else -1 if x1 - x <= shade else 0
            if not d or not (a[y, x - 1] and x + 1 < im.shape[1] and a[y, x + 1] and y and a[y - 1, x] and y + 1 < im.shape[0] and a[y + 1, x]): continue
            k = RAMP_OF.get(tuple(int(v) for v in im[y, x, :3]))
            if not k: continue
            r = RAMPS[k[0]]; i = min(len(r) - 1, max(1, k[1] + d))
            if i != k[1]: im[y, x, :3] = hexrgb(r[i])

def out(name, folder, L, ax, ay, extra=None, shadow=None, light=False):
    im = L.image()
    if light: relight(im)
    if shadow is not None:  # soft ground shadow (bottom-right) under everything opaque
        sh = np.zeros_like(im)
        for (x, y) in shadow:
            if 0 <= x < im.shape[1] and 0 <= y < im.shape[0]: sh[y, x] = SHADOW
        mask = im[:, :, 3] == 0
        im[mask] = sh[mask]
    save_png(im, os.path.join(ROOT, folder, name + '.png'))
    META[name] = dict({'w': im.shape[1], 'h': im.shape[0], 'ax': ax, 'ay': ay, 'path': f'world/{folder}/{name}'}, **(extra or {}))

# ================================================================ symbols for shop signs (no text: works in any language)
def symbol(L, kind, cx, cy):
    G, S, R, B = ramp('gold'), ramp('stone'), ramp('red'), ramp('brown')
    if kind == 'sword': L.fill(capsule((cx - 4, cy + 4), (cx + 4, cy - 4), 1.6), S, light=5, mid=4); L.fill(capsule((cx - 4, cy + 1), (cx - 1, cy + 4), 1.2), G, shade=False, mid=3)
    elif kind == 'shield': L.fill(poly([(cx - 4, cy - 4), (cx + 4, cy - 4), (cx + 4, cy + 1), (cx, cy + 5), (cx - 4, cy + 1)]), ramp('blue')); L.fill(rect(cx - 0.5, cy - 3, 1, 6), G, shade=False, mid=3)
    elif kind == 'potion': L.fill(ellipse(cx, cy + 1.5, 3.4, 3.4), R, light=3, mid=2); L.fill(rect(cx - 1, cy - 4, 2, 3), ramp('ivory'), shade=False, mid=2)
    elif kind == 'bed': L.fill(rect(cx - 4, cy, 8, 3), ramp('blue')); L.fill(rect(cx - 4, cy - 2, 3, 2), ramp('ivory'), shade=False, mid=3); L.fill(ellipse(cx + 2, cy - 3, 2, 2), G, light=4, mid=4)
    elif kind == 'anvil': L.fill(poly([(cx - 5, cy - 2), (cx + 4, cy - 2), (cx + 2, cy + 1), (cx - 2, cy + 1)]), S); L.fill(rect(cx - 1.5, cy + 1, 3, 3), S); L.fill(rect(cx - 3, cy + 3.5, 6, 1.5), S)
    elif kind == 'crest': L.fill(poly([(cx - 4, cy - 4), (cx + 4, cy - 4), (cx + 4, cy + 1), (cx, cy + 5), (cx - 4, cy + 1)]), R); L.fill(ellipse(cx, cy - 0.5, 1.8, 1.8), G, light=4, mid=4)
    elif kind == 'chest': L.fill(rect(cx - 4, cy - 2, 8, 6), B); L.fill(rect(cx - 4, cy - 3, 8, 2), B, light=5, mid=4); L.fill(rect(cx - 0.6, cy - 1, 1.2, 2), G, shade=False, mid=4)
    elif kind == 'star': L.fill(poly([(cx, cy - 5), (cx + 1.4, cy - 1.4), (cx + 5, cy), (cx + 1.4, cy + 1.4), (cx, cy + 5), (cx - 1.4, cy + 1.4), (cx - 5, cy), (cx - 1.4, cy - 1.4)]), G, light=4, mid=3)
    elif kind == 'rune': L.fill(ellipse(cx, cy, 4.4, 4.4), ramp('sky'), light=3, mid=2); L.fill(capsule((cx, cy - 3), (cx, cy + 3), 1), ramp('ivory'), shade=False, mid=3); L.fill(capsule((cx - 2.6, cy - 1.5), (cx + 2.6, cy + 1.5), 1), ramp('ivory'), shade=False, mid=3)
    elif kind == 'book': L.fill(rect(cx - 4, cy - 3, 8, 6), R); L.fill(rect(cx - 0.4, cy - 3, 0.8, 6), G, shade=False, mid=3)
    elif kind == 'coin': L.fill(ellipse(cx, cy, 4, 4), G, light=4, mid=3); L.fill(rect(cx - 0.6, cy - 2, 1.2, 4), G, shade=False, mid=1)
    elif kind == 'hammer': L.fill(capsule((cx - 3, cy + 4), (cx + 2, cy - 1), 1.4), B, shade=False, mid=3); L.fill(poly([(cx, cy - 4), (cx + 5, cy + 1), (cx + 3, cy + 3), (cx - 2, cy - 2)]), S)
    elif kind == 'bag': L.fill(ellipse(cx, cy + 1, 4, 3.6), B); L.fill(rect(cx - 1.5, cy - 4, 3, 2), B); L.fill(rect(cx - 0.6, cy, 1.2, 2), G, shade=False, mid=4)
    elif kind == 'flag': L.fill(rect(cx - 3, cy - 4, 1, 9), B, shade=False, mid=2); L.fill(poly([(cx - 2, cy - 4), (cx + 5, cy - 2.5), (cx - 2, cy)]), ramp('blue'))

# ================================================================ buildings (modular: base, facade, timber, roof, door, windows, sign)
STYLE = {  # Region 1: Lumira village = warm plaster + red-brown roof; Elyndra capital = stone + blue roof + gold trim
    'village': {'wall': 'cream', 'roof': 'roof', 'base': 'stone', 'trim': 'brown', 'accent': 'gold'},
    'capital': {'wall': 'cream', 'roof': 'blue', 'base': 'stone', 'trim': 'stone', 'accent': 'gold'},
}
def building(name, w, h, region, sign=None, kind='house', stories=1, chimney=False, awning=None, tower=False):
    top = 44 if tower else 0   # room above the roof for towers
    W, Hh = w * TP, h * TP + 48 + top
    st = STYLE[region]; L = Layer(W, Hh)
    WALL, ROOF, BASE, TRIM, ACC = ramp(st['wall']), ramp(st['roof']), ramp(st['base']), ramp(st['trim']), ramp(st['accent'])
    ground = Hh - 2
    facade = 72 + (24 if stories > 1 else 0)
    ftop = ground - facade
    inset = 6 if w >= 5 else 4
    x0, x1 = inset, W - inset
    # roof: big 3/4 roof plane above the facade, with eave overhang, ridge cap and shingle rows
    rtop = 6 + top
    L.fill(rect(x0 - 6, rtop, (x1 - x0) + 12, ftop - rtop + 10), ROOF)
    for y in range(rtop + 6, ftop + 6, 5):
        L.put(rect(x0 - 5, y, (x1 - x0) + 10, 1), ROOF[1])
        for x in range(x0 - 4 + (y // 5 % 2) * 4, x1 + 5, 8): L.put(rect(x, y - 4, 1, 4), ROOF[2] if len(ROOF) > 4 else ROOF[1])
    L.fill(rect(x0 - 7, rtop - 2, (x1 - x0) + 14, 4), ROOF, light=4, mid=4, darkc=3)          # ridge cap
    L.fill(rect(x0 - 7, ftop + 6, (x1 - x0) + 14, 4), ROOF, light=2, mid=1, darkc=1)         # eave edge (in shadow)
    if chimney: L.fill(rect(x1 - 20, rtop - 12, 10, 20), BASE); L.fill(rect(x1 - 21, rtop - 14, 12, 3), BASE, light=5, mid=4)
    if tower:
        tx = x0 + 6; L.fill(rect(tx, rtop - 22, 26, 34), BASE); L.fill(poly([(tx - 4, rtop - 22), (tx + 30, rtop - 22), (tx + 13, rtop - 44)]), ROOF)
        L.fill(rect(tx + 10, rtop - 14, 6, 10), ramp('stone'), light=1, mid=0, darkc=0)
    # facade wall (plaster), timber frame, stone base
    L.fill(rect(x0, ftop + 10, x1 - x0, facade - 10), WALL)
    L.fill(rect(x0, ground - 10, x1 - x0, 10), BASE)
    for x in range(x0, x1 - 1, 12): L.put(rect(x + 5, ground - 10, 1, 10), BASE[1])
    L.put(rect(x0, ground - 6, x1 - x0, 1), BASE[1])
    tb = TRIM
    for x in [x0, x1 - 4] + list(range(x0 + 34, x1 - 30, 34)): L.fill(rect(x, ftop + 10, 4, facade - 20), tb)
    L.fill(rect(x0, ftop + 10, x1 - x0, 4), tb); L.fill(rect(x0, ground - 14, x1 - x0, 4), tb)
    if stories > 1: L.fill(rect(x0, ftop + 34, x1 - x0, 4), tb)
    # door: 24 x 56 (1.33 x character height), arched top, wooden planks, iron ring
    door_x = W // 2 - 12 if kind != 'gate' else W // 2 - 20
    dw, dh = (24, 56) if kind != 'gate' else (40, 64)
    dy = ground - dh
    L.fill(rect(door_x - 3, dy - 3, dw + 6, dh + 3), tb)
    L.fill(rect(door_x, dy + 4, dw, dh - 4) | ellipse(door_x + dw / 2, dy + 5, dw / 2, 6), ramp('brown'), light=3, mid=2, darkc=1)
    for x in range(door_x + 5, door_x + dw, 6): L.put(rect(x, dy + 4, 1, dh - 4), ramp('brown')[1])
    L.put(ellipse(door_x + dw - 6, dy + dh / 2 + 4, 1.5, 1.5), hexrgb('#b98c2c'), hexrgb('#5e4310'))
    # windows 16 x 18 with shutters, lower edge 24px above the ground
    wy = ground - 24 - 18 - (2 if stories == 1 else 0)
    sgx = (door_x + dw + 14 if door_x + dw + 40 < x1 else door_x - 34) if sign else -999
    slots = [x for x in range(x0 + 12, x1 - 28, 40) if abs(x + 8 - (door_x + dw / 2)) > dw / 2 + 16 and not (sgx - 22 < x < sgx + 26)]
    for wx in slots[:4]:
        for yy in ([wy] + ([wy - 30] if stories > 1 else [])):
            L.fill(rect(wx - 2, yy - 2, 20, 22), tb)
            L.fill(rect(wx, yy, 16, 18), ramp('sky'), light=3, mid=1, darkc=0)
            L.put(rect(wx + 7, yy, 2, 18), tb[1]); L.put(rect(wx, yy + 8, 16, 2), tb[1])
            L.put(rect(wx + 2, yy + 2, 3, 3), hexrgb('#c4ecff'))
            if region == 'village': L.fill(rect(wx - 7, yy, 5, 18), ramp('green')); L.fill(rect(wx + 18, yy, 5, 18), ramp('green'))
            L.fill(rect(wx - 2, yy + 20, 20, 3), ramp('brown'))
    # hanging sign with a symbol (bracket from the wall next to the door)
    if sign:
        sx = sgx
        sy = dy + 4
        L.fill(rect(sx - 2, sy - 6, 26, 3), ramp('stone'), light=4, mid=3)
        L.fill(rect(sx + 2, sy - 3, 1, 4), ramp('stone'), shade=False, mid=2); L.fill(rect(sx + 18, sy - 3, 1, 4), ramp('stone'), shade=False, mid=2)
        L.fill(rect(sx, sy, 22, 18), ramp('brown'), light=5, mid=4, darkc=3)
        symbol(L, sign, sx + 11, sy + 9)
    if awning:
        A = ramp(awning)
        ax0, ax1 = x0 + 4, x1 - 4
        for i, x in enumerate(range(ax0, ax1, 8)): L.fill(poly([(x, ftop + 22), (x + 8, ftop + 22), (x + 9, ftop + 34), (x - 1, ftop + 34)]), A if i % 2 == 0 else ramp('cream'))
    if kind == 'gate':
        for tx in (x0 - 2, x1 - 22): L.fill(rect(tx, ftop - 30, 24, facade + 30), BASE); L.fill(rect(tx - 2, ftop - 36, 28, 8), BASE, light=5, mid=4)
        for tx in (x0 - 2, x1 - 22):
            for k in range(3): L.fill(rect(tx + k * 9, ftop - 42, 6, 6), BASE, light=5, mid=4)
    shadow = rect(x1, ftop + 14, 8, facade - 12) | rect(x0 + 6, ground, x1 - x0 + 2, 2)
    out(name, 'buildings', L, W // 2, h * 16 + 48 + top, {'footprint': [w, h], 'door': [dw, dh], 'facade': facade, 'kind': kind}, shadow, light=True)

BUILDINGS = [  # name, w, h, region, sign symbol, extras
    ('bld_house_small_village_5x4', 5, 4, 'village', None, {'chimney': True}),
    ('bld_house_large_village_6x4', 6, 4, 'village', None, {'chimney': True}),
    ('bld_inn_village_7x5', 7, 5, 'village', 'bed', {'stories': 2, 'chimney': True}),
    ('bld_potion_shop_village_6x5', 6, 5, 'village', 'potion', {'awning': 'green'}),
    ('bld_weapon_shop_village_5x4', 5, 4, 'village', 'sword', {}),
    ('bld_armor_shop_village_6x5', 6, 5, 'village', 'shield', {'awning': 'blue'}),
    ('bld_blacksmith_village_5x4', 5, 4, 'village', 'anvil', {'chimney': True}),
    ('bld_storage_village_5x4', 5, 4, 'village', 'chest', {}),
    ('bld_chapel_village_7x5', 7, 5, 'village', 'star', {'tower': True}),
    ('bld_class_hall_village_8x5', 8, 5, 'village', 'crest', {'stories': 2}),
    ('bld_house_small_capital_5x4', 5, 4, 'capital', None, {'chimney': True}),
    ('bld_house_large_capital_6x4', 6, 4, 'capital', None, {'chimney': True}),
    ('bld_inn_capital_7x5', 7, 5, 'capital', 'bed', {'stories': 2, 'chimney': True}),
    ('bld_weapon_shop_capital_6x5', 6, 5, 'capital', 'sword', {'awning': 'red'}),
    ('bld_armor_shop_capital_6x5', 6, 5, 'capital', 'shield', {'awning': 'blue'}),
    ('bld_blacksmith_capital_5x4', 5, 4, 'capital', 'anvil', {'chimney': True}),
    ('bld_workshop_capital_5x4', 5, 4, 'capital', 'hammer', {'chimney': True}),
    ('bld_storage_capital_5x4', 5, 4, 'capital', 'chest', {}),
    ('bld_bank_capital_5x4', 5, 4, 'capital', 'coin', {}),
    ('bld_library_capital_5x4', 5, 4, 'capital', 'book', {}),
    ('bld_guild_hall_capital_8x5', 8, 5, 'capital', 'crest', {'stories': 2}),
    ('bld_class_hall_capital_6x4', 6, 4, 'capital', 'rune', {}),
    ('bld_sanctuary_capital_7x5', 7, 5, 'capital', 'star', {'tower': True}),
    ('bld_town_hall_capital_8x5', 8, 5, 'capital', 'flag', {'stories': 2, 'tower': True}),
    ('bld_market_capital_6x5', 6, 5, 'capital', 'bag', {'awning': 'red'}),
    ('bld_special_shop_capital_6x5', 6, 5, 'capital', 'potion', {'awning': 'violet'}),
    ('bld_garrison_capital_8x5', 8, 5, 'capital', 'shield', {'stories': 2}),
    ('bld_castle_gate_capital_8x5', 8, 5, 'capital', None, {'kind': 'gate'}),
]

# ================================================================ trees (trunk + canopy + baked soft shadow)
def oak(name, seed, size=1.0):
    rnd = random.Random(seed); W, H = int(80 * size), int(104 * size)
    L = Layer(W, H); cx = W // 2; base = H - 6
    L.fill(poly([(cx - 5, base), (cx + 5, base), (cx + 3.5, base - 34 * size), (cx - 3.5, base - 34 * size)]), ramp('brown'))
    L.fill(poly([(cx - 9, base), (cx - 4, base - 6), (cx - 4, base)]), ramp('brown')); L.fill(poly([(cx + 9, base), (cx + 4, base - 6), (cx + 4, base)]), ramp('brown'))
    G = ramp('green'); blobs = []
    for _ in range(9):
        bx = cx + rnd.uniform(-22, 22) * size; by = base - (54 + rnd.uniform(-16, 16)) * size; r = rnd.uniform(13, 19) * size
        blobs.append((bx, by, r))
    blobs.sort(key=lambda b: b[1])
    allpix = set()
    for bx, by, r in blobs: allpix |= ellipse(bx, by, r, r * 0.88)
    L.fill(allpix, G, light=3, mid=2, darkc=1)
    for bx, by, r in blobs[:5]:  # lit clumps on the upper-left
        L.put({(x, y) for (x, y) in ellipse(bx - r * 0.25, by - r * 0.3, r * 0.45, r * 0.35) if (x, y) in allpix}, G[3])
    for _ in range(26):
        x, y = rnd.randint(4, W - 5), rnd.randint(4, int(base - 30 * size))
        if (x, y) in allpix and (x + 1, y) in allpix: L.put({(x, y), (x + 1, y)}, G[4] if y < base - 60 * size else G[1])
    shadow = ellipse(cx + 8 * size, base + 1, 26 * size, 5)
    out(name, 'trees', L, cx, base, {'fade': [cx - 34 * size, base - 96 * size, 68 * size, 64 * size], 'trunk': 6}, shadow)
def pine(name, seed, size=1.0, snow=False, slim=1.0):
    rnd = random.Random(seed); W, H = int(64 * size * slim) + 2, int(112 * size)
    L = Layer(W, H); cx = W // 2; base = H - 6
    L.fill(rect(cx - 3, base - 16 * size, 6, 16 * size), ramp('brown'))
    G = ramp('green'); G2 = [G[0], G[1], G[2], G[3], G[3]]
    for k in range(4):
        top = base - (100 - k * 20) * size; bot = top + 40 * size; hw = (12 + k * 6) * size * slim
        L.fill(poly([(cx, top), (cx + hw, bot), (cx - hw, bot)]), G, light=3, mid=2, darkc=1)
        L.put({(x, int(bot - 1)) for x in range(int(cx - hw + 2), int(cx + hw - 2), 3)}, G[1])
        if snow: L.put(poly([(cx, top), (cx + hw * 0.5, top + 14 * size), (cx - hw * 0.6, top + 12 * size)]), hexrgb('#f4ead2'))
    shadow = ellipse(cx + 6 * size, base + 1, 20 * size, 4)
    out(name, 'trees', L, cx, base, {'fade': [cx - 28 * size, base - 104 * size, 56 * size, 84 * size], 'trunk': 4}, shadow)

# ================================================================ vegetation / rocks
def veg(name, kind, seed):
    rnd = random.Random(seed)
    if kind == 'grass':
        L = Layer(20, 14); G = ramp('green')
        for _ in range(7):
            x = rnd.uniform(3, 16); h = rnd.uniform(5, 10); L.fill(capsule((x, 13), (x + rnd.uniform(-2, 2), 13 - h), 1.2), G, shade=False, mid=rnd.choice([3, 4]))
        out(name, 'vegetation', L, 10, 12)
    elif kind == 'tallgrass':
        L = Layer(28, 22); G = ramp('green')
        for _ in range(12):
            x = rnd.uniform(3, 24); h = rnd.uniform(9, 17); L.fill(capsule((x, 21), (x + rnd.uniform(-3, 3), 21 - h), 1.4), G, shade=False, mid=rnd.choice([2, 3, 4]))
        out(name, 'vegetation', L, 14, 20, shadow=ellipse(16, 21, 11, 2))
    elif kind.startswith('flowers'):
        col = {'flowers_red': 'red', 'flowers_gold': 'gold', 'flowers_violet': 'violet', 'flowers_white': 'ivory'}[kind]
        L = Layer(24, 16); G = ramp('green')
        for _ in range(5):
            x, y = rnd.uniform(4, 20), rnd.uniform(6, 13)
            L.fill(capsule((x, 15), (x, y + 2), 1), G, shade=False, mid=3)
            L.fill(ellipse(x, y, 2.2, 2), ramp(col), light=3 if col != 'gold' else 4, mid=2 if col != 'gold' else 3)
            L.put({(int(x), int(y))}, hexrgb('#f6dc8a'))
        out(name, 'vegetation', L, 12, 14)
    elif kind in ('bush', 'bush_small'):
        s = 1 if kind == 'bush' else 0.65; W = int(40 * s); H = int(30 * s); L = Layer(W, H); G = ramp('green')
        pix = set()
        for _ in range(5): pix |= ellipse(W / 2 + rnd.uniform(-9, 9) * s, H - 12 * s + rnd.uniform(-4, 3) * s, 9 * s, 8 * s)
        L.fill(pix, G, light=3, mid=2, darkc=1)
        if kind == 'bush':
            for _ in range(4):
                x, y = rnd.randint(6, W - 6), rnd.randint(4, H - 8)
                if (x, y) in pix: L.put({(x, y), (x + 1, y)}, hexrgb('#d9564a'))
        out(name, 'vegetation', L, W // 2, H - 3, shadow=ellipse(W / 2 + 4, H - 2, W / 2 - 2, 3))
    elif kind == 'fern':
        L = Layer(30, 20); G = ramp('green')
        for a in (-60, -30, 0, 30, 60):
            r = math.radians(a - 90); L.fill(capsule((15, 19), (15 + math.cos(r) * 13, 19 + math.sin(r) * 13), 2.2), G, mid=3)
        out(name, 'vegetation', L, 15, 18)
    elif kind == 'mushroom':
        L = Layer(18, 16)
        for x, s in ((6, 1), (12, 0.75)):
            L.fill(rect(x - 1, 15 - 6 * s, 2.4, 6 * s), ramp('ivory'), shade=False, mid=2)
            L.fill(ellipse(x, 15 - 6 * s, 4 * s, 2.8 * s), ramp('red'), light=3, mid=2)
            L.put({(int(x - 1), int(14 - 7 * s))}, hexrgb('#f2eee2'))
        out(name, 'vegetation', L, 9, 15)
    elif kind == 'reed':
        L = Layer(24, 30); G = ramp('green')
        for _ in range(7):
            x = rnd.uniform(4, 20); h = rnd.uniform(16, 26); L.fill(capsule((x, 29), (x + rnd.uniform(-2, 2), 29 - h), 1.4), G, shade=False, mid=3)
            if rnd.random() < 0.5: L.fill(capsule((x, 29 - h + 2), (x, 29 - h + 7), 2.4), ramp('brown'), shade=False, mid=3)
        out(name, 'vegetation', L, 12, 28)
    elif kind == 'herb':
        L = Layer(22, 18); G = ramp('green')
        for a in (-50, -20, 10, 40): r = math.radians(a - 90); L.fill(capsule((11, 17), (11 + math.cos(r) * 9, 17 + math.sin(r) * 9), 2.6), G)
        L.fill(ellipse(11, 7, 2.2, 2.2), ramp('ivory'), light=3, mid=3); L.put({(11, 7)}, hexrgb('#f6dc8a'))
        out(name, 'vegetation', L, 11, 16, shadow=ellipse(13, 17, 8, 2))
    elif kind == 'cactus':
        L = Layer(28, 40); G = ramp('green')
        L.fill(capsule((14, 38), (14, 8), 7), G); L.fill(capsule((8, 24), (6, 14), 4), G); L.fill(capsule((20, 28), (22, 18), 4), G)
        L.fill(capsule((6, 25), (12, 25), 3), G); L.fill(capsule((22, 29), (16, 29), 3), G)
        for y in range(10, 36, 5): L.put({(12, y), (16, y + 2)}, hexrgb('#f4ead2'))
        out(name, 'vegetation', L, 14, 38, shadow=ellipse(18, 38, 9, 2))
def rock(name, size, seed, mat='stone'):
    rnd = random.Random(seed); r = {'small': 7, 'medium': 11, 'large': 16}[size]
    W, H = int(r * 2.8 + 8), int(r * 2.2 + 8); L = Layer(W, H); M = ramp(mat if mat in ('stone',) else 'stone')
    pts = []
    for k in range(9):
        a = math.pi + k / 8 * math.pi; rr = r * rnd.uniform(0.82, 1.1)
        pts.append((W / 2 + math.cos(a) * rr * 1.2, H - 5 + math.sin(a) * rr))
    body = poly(pts + [(W / 2 + r * 1.2, H - 4), (W / 2 - r * 1.2, H - 4)])
    L.fill(body, M)
    L.put({(x, y) for (x, y) in ellipse(W / 2 - r * 0.35, H - 5 - r * 0.55, r * 0.45, r * 0.25) if (x, y) in body}, M[5])
    L.put({(int(W / 2 + rnd.uniform(-r, r) * 0.6), int(H - 5 - rnd.uniform(1, r * 0.7))) for _ in range(3)}, M[1])
    if mat == 'ore':
        for _ in range(5):
            x, y = int(W / 2 + rnd.uniform(-r, r) * 0.7), int(H - 5 - rnd.uniform(2, r * 0.8))
            if (x, y) in body: L.put({(x, y), (x + 1, y)}, hexrgb('#c07a3e'))
    if mat == 'crystal':
        for dx, h in ((-4, 12), (1, 17), (6, 10)):
            L.fill(poly([(W / 2 + dx - 2.4, H - 8), (W / 2 + dx + 2.4, H - 8), (W / 2 + dx, H - 8 - h)]), ramp('sky'), light=3, mid=2)
    out(name, 'rocks', L, W // 2, H - 4, shadow=ellipse(W / 2 + 4, H - 3, r * 1.25, 3))

# ================================================================ props
def prop(name, kind):
    B, S, G, C = ramp('brown'), ramp('stone'), ramp('gold'), ramp('cream')
    if kind == 'barrel':
        L = Layer(22, 28); L.fill(ellipse(11, 15, 9, 12) & rect(0, 4, 22, 22), B); L.fill(ellipse(11, 5, 8.4, 3), B, light=5, mid=4, darkc=3)
        for y in (9, 20): L.fill(rect(2.5, y, 17, 2), S, shade=False, mid=2)
        out(name, 'props', L, 11, 25, shadow=ellipse(15, 25, 9, 2.5))
    elif kind == 'crate':
        L = Layer(26, 28); L.fill(rect(2, 9, 22, 17), B); L.fill(poly([(2, 9), (24, 9), (20, 3), (6, 3)]), B, light=5, mid=4)
        L.put(capsule((3, 10), (23, 25), 1.2), B[1]); L.put(capsule((23, 10), (3, 25), 1.2), B[1])
        out(name, 'props', L, 13, 25, shadow=ellipse(16, 26, 11, 2.5))
    elif kind == 'sack':
        L = Layer(20, 22); L.fill(ellipse(10, 14, 8, 7) | rect(5, 6, 10, 8), C); L.fill(rect(7, 3, 6, 3), C); L.put(rect(6, 6, 8, 1), B[2])
        out(name, 'props', L, 10, 20, shadow=ellipse(13, 20, 8, 2))
    elif kind == 'cart':
        L = Layer(48, 34); L.fill(rect(6, 10, 34, 12), B); L.fill(rect(4, 6, 38, 5), B, light=5, mid=4)
        L.fill(capsule((40, 18), (47, 22), 2), B, shade=False, mid=3)
        for wx in (12, 34): L.fill(ellipse(wx, 25, 7, 7), B, light=4, mid=2); L.fill(ellipse(wx, 25, 2, 2), S)
        L.fill(rect(10, 2, 8, 6) | rect(22, 3, 10, 5), ramp('green'))
        out(name, 'props', L, 24, 31, shadow=ellipse(28, 31, 20, 3))
    elif kind == 'bench':
        L = Layer(40, 22); L.fill(rect(2, 8, 36, 4), B, light=5, mid=4); L.fill(rect(2, 2, 36, 4), B)
        for x in (5, 33): L.fill(rect(x, 12, 3, 8), B)
        out(name, 'props', L, 20, 19, shadow=ellipse(24, 20, 17, 2))
    elif kind == 'lamp':
        L = Layer(18, 66); L.fill(rect(7, 14, 4, 50), S); L.fill(rect(4, 60, 10, 4), S)
        L.fill(rect(3, 4, 12, 12), S, light=4, mid=3); L.fill(rect(5, 6, 8, 8), G, light=4, mid=4, darkc=3); L.fill(poly([(2, 4), (16, 4), (9, -2)]), S)
        out(name, 'props', L, 9, 63, {'glow': [9, 10]}, shadow=ellipse(14, 64, 6, 2))
    elif kind.startswith('sign'):
        L = Layer(30, 40); L.fill(rect(13, 16, 4, 22), B); L.fill(rect(2, 4, 26, 16), B, light=5, mid=4, darkc=3)
        symbol(L, kind.split('_')[1] if '_' in kind else 'flag', 15, 12)
        out(name, 'props', L, 15, 37, shadow=ellipse(19, 38, 7, 2))
    elif kind == 'fence':
        L = Layer(34, 24)
        for x in (3, 15, 27): L.fill(rect(x, 4, 4, 18), B, light=5, mid=4)
        for y in (8, 15): L.fill(rect(1, y, 32, 3), B)
        out(name, 'props', L, 17, 21, shadow=rect(4, 22, 30, 2))
    elif kind == 'well':
        L = Layer(44, 52); L.fill(ellipse(22, 38, 19, 10) | rect(3, 30, 38, 10), S); L.fill(ellipse(22, 31, 16, 6), ramp('sky'), light=1, mid=1, darkc=0)
        for x in (5, 36): L.fill(rect(x, 6, 4, 28), B)
        L.fill(poly([(0, 8), (44, 8), (36, 0), (8, 0)]), ramp('roof')); L.fill(rect(9, 14, 26, 2), B, shade=False, mid=2)
        L.fill(rect(19, 16, 6, 7), B, light=4, mid=3)
        out(name, 'props', L, 22, 47, shadow=ellipse(26, 47, 19, 4), light=True)
    elif kind == 'stall':
        L = Layer(56, 52); L.fill(rect(4, 26, 48, 14), B); L.fill(rect(2, 24, 52, 4), B, light=5, mid=4)
        for x in (5, 47): L.fill(rect(x, 6, 4, 42), B)
        for i, x in enumerate(range(0, 56, 8)): L.fill(poly([(x, 4), (x + 8, 4), (x + 9, 14), (x - 1, 14)]), ramp('red') if i % 2 == 0 else C)
        for x, c in ((10, 'red'), (18, 'gold'), (26, 'green'), (34, 'violet'), (42, 'gold')): L.fill(ellipse(x, 21, 3, 3), ramp(c), light=3 if c != 'gold' else 4, mid=2 if c != 'gold' else 3)
        out(name, 'props', L, 28, 48, shadow=ellipse(32, 48, 26, 3))
    elif kind == 'tent':
        L = Layer(52, 44); L.fill(poly([(2, 42), (26, 4), (50, 42)]), C); L.fill(poly([(20, 42), (26, 18), (32, 42)]), B, light=2, mid=1)
        L.fill(rect(25, 0, 2, 6), B, shade=False, mid=3); L.fill(poly([(27, 0), (34, 2), (27, 4)]), ramp('red'))
        out(name, 'props', L, 26, 41, shadow=ellipse(30, 42, 24, 3))
    elif kind == 'campfire':
        L = Layer(28, 24)
        for a in range(0, 360, 45): r = math.radians(a); L.fill(ellipse(14 + math.cos(r) * 9, 18 + math.sin(r) * 3.5, 3, 2), S)
        L.fill(capsule((7, 19), (21, 15), 2.4), B); L.fill(capsule((7, 15), (21, 19), 2.4), B)
        L.fill(poly([(9, 16), (19, 16), (14, 2)]), ramp('red'), light=3, mid=3); L.fill(poly([(11, 16), (17, 16), (14, 7)]), G, light=4, mid=4)
        out(name, 'props', L, 14, 21, {'glow': [14, 10]})
    elif kind == 'weaponrack':
        L = Layer(40, 40); L.fill(rect(2, 30, 36, 4), B); L.fill(rect(2, 8, 36, 3), B)
        for x in (4, 34): L.fill(rect(x, 8, 3, 26), B)
        for x, h in ((10, 26), (17, 22), (24, 28), (30, 20)): L.fill(capsule((x, 33), (x, 33 - h), 2), S, light=5, mid=4); L.fill(rect(x - 2, 33 - h + 6, 4, 1.4), G, shade=False, mid=3)
        out(name, 'props', L, 20, 36, shadow=ellipse(24, 37, 17, 2))
    elif kind == 'anvil':
        L = Layer(30, 22); L.fill(poly([(1, 4), (25, 4), (29, 7), (20, 10), (8, 10)]), S, light=5, mid=4); L.fill(rect(10, 10, 9, 5), S); L.fill(rect(6, 15, 17, 5), B)
        out(name, 'props', L, 15, 19, shadow=ellipse(18, 20, 12, 2))
    elif kind == 'hay':
        L = Layer(34, 24); L.fill(ellipse(17, 14, 15, 9) | rect(2, 12, 30, 9), G, light=4, mid=3, darkc=2)
        for x in range(5, 30, 4): L.put({(x, 10), (x + 1, 15), (x, 19)}, G[1])
        out(name, 'props', L, 17, 21, shadow=ellipse(21, 22, 14, 2))
    elif kind.startswith('flag'):
        col = 'blue' if kind.endswith('blue') else 'red' if kind.endswith('red') else 'gold'
        L = Layer(24, 60); L.fill(rect(4, 2, 3, 56), B); L.fill(ellipse(5.5, 2, 2.4, 2.4), G, light=4, mid=4)
        L.fill(poly([(7, 6), (22, 6), (22, 26), (14.5, 22), (7, 26)]), ramp(col)); L.fill(rect(11, 11, 7, 7) if col != 'gold' else rect(0, 0, 0, 0), G, shade=False, mid=3)
        out(name, 'props', L, 6, 57, shadow=ellipse(10, 58, 5, 1.5))
    elif kind == 'bucket':
        L = Layer(16, 16); L.fill(poly([(2, 4), (14, 4), (12, 15), (4, 15)]), B); L.fill(ellipse(8, 4, 6, 2), ramp('sky'), light=2, mid=1)
        L.fill(rect(2, 8, 12, 1.4), S, shade=False, mid=2)
        out(name, 'props', L, 8, 14)
    elif kind == 'lumber':
        L = Layer(44, 22)
        for i, (x, y) in enumerate([(6, 16), (18, 16), (30, 16), (12, 8), (24, 8)]): L.fill(capsule((x, y), (x + 10, y - 1), 7), B); L.fill(ellipse(x + 11, y - 1, 3, 3.4), ramp('cream'), light=4, mid=3)
        out(name, 'props', L, 22, 20, shadow=ellipse(26, 21, 18, 2))
    elif kind == 'wheelbarrow':
        L = Layer(34, 24); L.fill(poly([(4, 6), (24, 6), (20, 16), (8, 16)]), B); L.fill(ellipse(24, 18, 4.4, 4.4), B, light=4, mid=2)
        L.fill(capsule((4, 8), (0, 18), 1.6), B, shade=False, mid=3); L.fill(rect(6, 2, 12, 5), S)
        out(name, 'props', L, 16, 21, shadow=ellipse(19, 22, 13, 2))
    elif kind == 'fountain':
        L = Layer(64, 52); L.fill(ellipse(32, 38, 30, 12), S); L.fill(ellipse(32, 36, 25, 8.5), ramp('sky'), light=2, mid=1)
        L.fill(rect(28, 12, 8, 24), S, light=5, mid=4); L.fill(ellipse(32, 13, 9, 4), S, light=5, mid=4); L.fill(ellipse(32, 11, 4, 4), ramp('sky'), light=3, mid=2)
        out(name, 'props', L, 32, 48, {'glow': None}, shadow=ellipse(36, 49, 29, 4))
    elif kind in ('wall_h', 'wall_v'):
        L = Layer(32, 44)
        if kind == 'wall_h':
            L.fill(rect(0, 12, 32, 30), S); L.fill(rect(0, 8, 32, 6), S, light=5, mid=4)
            for k in range(4): L.fill(rect(k * 8 + 1, 2, 6, 7), S, light=5, mid=4)
            for y in (20, 28, 36):
                for x in range(0 + (y // 8 % 2) * 4, 32, 8): L.put(rect(x, y, 1, 7), S[1])
                L.put(rect(0, y - 1, 32, 1), S[1])
        else:
            L.fill(rect(6, 6, 20, 36), S); L.fill(rect(6, 2, 20, 6), S, light=5, mid=4)
            for y in (14, 24, 34): L.put(rect(6, y, 20, 1), S[1])
        out(name, 'props', L, 16, 40)
    elif kind == 'statue':
        L = Layer(32, 60); L.fill(rect(4, 46, 24, 12), S); L.fill(rect(2, 44, 28, 4), S, light=5, mid=4)
        L.fill(ellipse(16, 14, 5, 6), S, light=5, mid=4); L.fill(poly([(9, 20), (23, 20), (25, 44), (7, 44)]), S, light=5, mid=4)
        L.fill(capsule((23, 22), (27, 6), 2), G, light=4, mid=3)
        out(name, 'props', L, 16, 57, shadow=ellipse(21, 58, 14, 2.5))

TREES = [('tree_oak_01', 1, 1.16), ('tree_oak_02', 2, 1.22), ('tree_oak_03', 3, 1.17)]  # ≥ 2.2x character height (art bible §4)
PROPS = ['barrel', 'crate', 'sack', 'cart', 'bench', 'lamp', 'sign_sword', 'sign_potion', 'sign_bed', 'fence', 'well', 'stall', 'tent', 'campfire', 'weaponrack', 'anvil', 'hay',
         'flag_blue', 'flag_red', 'flag_gold', 'bucket', 'lumber', 'wheelbarrow', 'fountain', 'statue', 'wall_h', 'wall_v']

if __name__ == '__main__':
    for name, w, h, region, sign, kw in BUILDINGS: building(name, w, h, region, sign, **kw)
    for name, seed, size in TREES: oak(name, seed, size)
    pine('tree_pine_01', 11, 1.0); pine('tree_pine_02', 12, 1.04, slim=0.8); pine('tree_pine_snow_01', 13, 1.0, snow=True)
    for i, k in enumerate(['grass', 'grass', 'tallgrass', 'flowers_red', 'flowers_gold', 'flowers_violet', 'flowers_white', 'bush', 'bush_small', 'fern', 'mushroom', 'reed', 'herb', 'cactus']):
        veg(f'veg_{k}_{i + 1:02d}' if k == 'grass' else f'veg_{k}_01', k, 100 + i)
    for i, s in enumerate(['small', 'small', 'medium', 'medium', 'large']): rock(f'rock_{s}_{i + 1:02d}', s, 200 + i)
    rock('rock_ore_01', 'medium', 301, 'ore'); rock('rock_crystal_01', 'medium', 302, 'crystal')
    for k in PROPS: prop('prop_' + k + '_01', k)
    with open(os.path.join(ROOT, 'world.json'), 'w') as f: json.dump(META, f, indent=0)
    print(len(META), 'world sprites')
