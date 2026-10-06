"""LUMIRA HD layered characters (character visual prototype).

HD Pixel Fantasy, top-down 3/4 view, anime-inspired, ~3.2 heads tall. One pose model drives every layer, so
body, face, hair, clothes, class gear, weapons, shields, back items and headgear line up in every frame.

Frame 64x80, pivot (feet) at (32, 74), character height ~50px (head 16px). Stored views N, S, E; W = E mirrored.
Face, hair and headgear are hand-authored pixel stamps placed on the head joint, so they follow the head in
every animation. Body and clothes are drawn from the pose with top-left gradient shading.
"""
import math
from lumira_art import Layer, ramp, rect, ellipse, poly, capsule, hexrgb

FW, FH = 64, 80
PIVOT = (32, 74)
ANIMS = [  # name, frames, fps, loop
    ('idle', 4, 4, 1), ('walk', 6, 10, 1), ('attack', 6, 14, 0), ('cast', 6, 10, 0),
    ('hit', 3, 10, 0), ('death', 6, 8, 0), ('sit', 1, 1, 1), ('interact', 2, 5, 1),
]
NFR = {a[0]: a[1] for a in ANIMS}

def rot(p, c, deg):
    a = math.radians(deg); x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))

# ================================================================ pose model
WEAPON_REST = {'sword': 112, 'greatsword': 114, 'dagger': 104, 'mace': 110, 'spear': -82, 'staff': -84, 'wand': -64,
               'bow': -90, 'device': 20, 'axe': 110, 'pickaxe': 110, None: 100}
def pose(view, anim, f, n, sex, wt=None):
    """joints in frame coords for one frame. view: N/S/E (side view faces +x)."""
    side, fem = view == 'E', sex == 'female'
    ph = f / max(1, n) * 2 * math.pi
    bob, lean, tilt, drop, crouch = 0, 0, 0, 0, 0
    if anim == 'idle': bob = [0, 0, 1, 1][f]
    if anim == 'walk': bob = [1, 0, 0, 1, 0, 0][f]
    if anim == 'hit': lean = [-2, -3, -1][f]; bob = [1, 1, 0][f]
    if anim == 'attack': lean = [-1, -2, 1, 2, 2, 1][f]
    if anim == 'cast': bob = [0, 1, 0, 0, 0, 1][f]
    J = {'view': view, 'side': side, 'anim': anim, 'f': f, 'sex': sex}
    shw, hipw = (5.6, 4.2) if fem else (6.6, 3.9)
    sy, hy = 43 + bob, 55 + bob
    if side:
        sh = [(31 + lean * 0.5, sy), (33 + lean * 0.5, sy)]          # far, near
        hips = [(31, hy), (33, hy)]
    else:
        sh = [(32 - shw + lean * 0.3, sy), (32 + shw + lean * 0.3, sy)]  # screen-left, screen-right
        hips = [(32 - hipw, hy), (32 + hipw, hy)]
    feet = [(hips[0][0], 73.5), (hips[1][0], 73.5)]
    knees = [(hips[0][0], 64.5 + bob * 0.5), (hips[1][0], 64.5 + bob * 0.5)]
    if not side:  # slight knock-in so the legs read as one stance
        feet = [(feet[0][0] + 0.3, 73.5), (feet[1][0] - 0.3, 73.5)]
    head = (32 + lean * 0.6, 24 + bob)
    # ---- walk
    if anim == 'walk':
        s = math.sin(ph)
        if side:
            for i, sg in ((0, -1), (1, 1)):
                a = math.radians(27 * s * sg)
                fx = hips[i][0] + math.sin(a) * 17
                lift = 2.2 if (s * sg < -0.2) else 0       # the back foot lifts while it passes
                feet[i] = (fx, 73.5 - lift)
                knees[i] = ((hips[i][0] + fx) / 2 + (1.6 if s * sg < 0.3 else 0.6), 64.5 - lift * 0.7)
        else:
            for i, sg in ((0, 1), (1, -1)):
                lift = max(0, s * sg) * 3.2
                feet[i] = (feet[i][0], 73.5 - lift); knees[i] = (knees[i][0], 64.5 - lift * 0.65)
    # ---- arms (hanging, swinging when walking)
    hands, elbows = [None, None], [None, None]
    for i in (0, 1):
        sx, sy_ = sh[i]
        if side:
            sw = math.sin(ph) * (1 if i == 0 else -1) * (7 if anim == 'walk' else 0)
            elbows[i] = (sx + sw * 0.45 - 0.5, sy_ + 6.5); hands[i] = (sx + sw, sy_ + 12.5)
        else:
            out = -1 if i == 0 else 1
            sw = math.sin(ph) * (1 if i == 0 else -1) * (2.2 if anim == 'walk' else 0)
            br = [0, 0.4, 0.8, 0.4][f] if anim == 'idle' else 0
            elbows[i] = (sx + out * 1.4, sy_ + 6.5); hands[i] = (sx + out * (1.2 + br), sy_ + 12.5 + sw)
    wa = WEAPON_REST.get(wt, 100)
    if side and wt in ('sword', 'greatsword', 'dagger', 'mace', 'axe', 'pickaxe'): wa = 64
    if side and wt == 'device': wa = 5
    wh = 1 if view in ('N', 'E') else 0
    oh = 1 - wh
    if anim == 'attack':
        if wt == 'bow':      # draw and loose: bow arm forward, string hand pulls back
            if side:
                pull = [0, 3, 6, 6, 1, 0][f]
                hands[1] = (sh[1][0] + 10, sh[1][1] + 4); elbows[1] = (sh[1][0] + 5, sh[1][1] + 3); wa = -90
                hands[0] = (sh[1][0] + 9 - pull, sh[1][1] + 4); elbows[0] = (sh[0][0] + 2, sh[0][1] + 5)
                J['pull'] = pull
            else:
                sg = -1 if wh == 0 else 1; up = [2, 4, 5, 5, 3, 2][f]
                hands[wh] = (sh[wh][0] + sg * 1, sh[wh][1] + 10 - up); elbows[wh] = (sh[wh][0] + sg * 2, sh[wh][1] + 5 - up * 0.4); wa = -90
                J['pull'] = [0, 2, 4, 4, 1, 0][f]
        elif side:
            seq = [((-4, -8), -150), ((-3, -12), -112), ((6, -6), -40), ((9, 1), 22), ((7, 5), 58), ((3, 6), 76)]
            (dx, dy), wa = seq[f]; sx, sy_ = sh[1]
            hands[1] = (sx + dx, sy_ + dy + 7); elbows[1] = (sx + dx * 0.45, sy_ + 3.5 + dy * 0.3)
            sh = [(x + lean * 0.4, y) for x, y in sh]
        else:
            sg = -1 if wh == 0 else 1
            seq = [((1, -8), -100), ((2, -12), -78), ((1, -2), 30), ((0, 4), 96), ((-1, 7), 116), ((0, 6), 106)]
            (dx, dy), a = seq[f]; sx, sy_ = sh[wh]
            hands[wh] = (sx + sg * dx, sy_ + 12 + dy); elbows[wh] = (sx + sg * (dx * 0.5 + 1.4), sy_ + 5 + dy * 0.4)
            wa = a if sg > 0 else 180 - a
    elif anim == 'cast':
        up = [0, 2, 4, 6, 5, 2][f]
        for i in (0, 1):
            sx, sy_ = sh[i]
            if side: hands[i] = (sx + 6 + i, sy_ + 7 - up); elbows[i] = (sx + 3.5, sy_ + 4.5 - up * 0.4)
            else:
                out = -1 if i == 0 else 1
                hands[i] = (sx + out * (0.6 + up * 0.25), sy_ + 10 - up); elbows[i] = (sx + out * 2.4, sy_ + 6 - up * 0.3)
        if wt in ('staff', 'wand', 'spear', 'bow'): wa = -80 if not side else -70
    elif anim == 'hit':
        for i in (0, 1):
            sx, sy_ = sh[i]; out = (-1 if i == 0 else 1) if not side else -1
            hands[i] = (sx + out * 3.4, sy_ + 9); elbows[i] = (sx + out * 2.4, sy_ + 4.5)
    elif anim == 'interact':
        i = wh if side else oh; sx, sy_ = sh[i]; reach = [3, 6][f]
        hands[i] = (sx + (reach if side else 0), sy_ + (7 if side else 8 - reach * 0.7)); elbows[i] = (sx + reach * 0.4, sy_ + 4.5)
    elif anim == 'sit':
        d = 8
        for i in (0, 1):
            hips[i] = (hips[i][0], hips[i][1] + d)
            if side: knees[i] = (hips[i][0] + 8, hips[i][1] - 1); feet[i] = (hips[i][0] + 9, 73.5)
            else: knees[i] = (hips[i][0] + (-2.5 if i == 0 else 2.5), hips[i][1] + 5); feet[i] = (knees[i][0], 73.5)
        head = (head[0], head[1] + d); sh = [(x, y + d) for x, y in sh]
        hands = [(x, y + d) for x, y in hands]; elbows = [(x, y + d) for x, y in elbows]
    elif anim == 'death':
        if f == 0: lean = -2; head = (head[0] - 1.2, head[1] + 1)
        if f in (1, 2):   # kneel, then slump
            k = 5 if f == 1 else 6
            for i in (0, 1): hips[i] = (hips[i][0], hips[i][1] + k); knees[i] = (knees[i][0] + (3 if side else 0), 70)
            head = (head[0], head[1] + k + (2 if f == 2 else 0)); sh = [(x, y + k + (1 if f == 2 else 0)) for x, y in sh]
            hands = [(x, y + k + 2) for x, y in hands]; elbows = [(x, y + k + 1) for x, y in elbows]
        tilt = [0, 0, 0, -42, -80, -90][f]; drop = [0, 0, 0, -2, -5, -6][f]   # falls to the left, lies on the ground
        if f >= 3:
            for i in (0, 1): hips[i] = (hips[i][0], hips[i][1] + 3)
    head = (round(head[0]), round(head[1]))   # whole pixels: hand-drawn head stamps and thin hat tips never shimmer
    J.update(head=head, sh=sh, hips=hips, knees=knees, feet=feet, elbows=elbows, hands=hands, wh=wh, oh=oh, bob=bob, lean=lean)
    piv = (32, 60) if not tilt else (43, 61)
    def T(p):
        q = rot(p, piv, tilt) if tilt else p
        return (q[0], q[1] + drop) if tilt else q
    J['T'] = T; J['tilt'] = tilt
    J['wa'] = wa + tilt
    J.setdefault('pull', 0)
    return J

# ================================================================ helpers
def Tset(J, pix):
    if not J['tilt']: return pix
    return {(math.floor(q[0]), math.floor(q[1])) for q in (J['T']((x + 0.5, y + 0.5)) for x, y in pix)}
def quad(J, pts): return poly([J['T'](p) for p in pts])
def limb(J, a, b, w): return capsule(J['T'](a), J['T'](b), w)
def H(J, lx, ly):
    """head-local -> frame. origin = top-centre of the skull (head 16x16 spans x -8..7, y 0..15)"""
    hx, hy = J['head']
    return J['T']((hx + lx, hy + ly))
def Hpoly(J, pts): return poly([H(J, x, y) for x, y in pts])
def Hell(J, cx, cy, rx, ry, k=20):
    return Hpoly(J, [(cx + rx * math.cos(a), cy + ry * math.sin(a)) for a in [i / k * 2 * math.pi for i in range(k)]])

def fillg(L, pix, rp, light=None, mid=None, dark=None, hi=None, edge=True):
    """gradient shading for larger parts: light from the top-left across the part's bounding box,
    lit rim on the top/left edge, shaded rim on the bottom/right edge"""
    pix = {p for p in pix if 0 <= p[0] < L.w and 0 <= p[1] < L.h}
    if not pix: return pix
    n = len(rp)
    li, mi, di = (4, 3, 2) if n >= 5 else (3, 2, 1) if n == 4 else (2, 1, 0)
    li = light if light is not None else li; mi = mid if mid is not None else mi; di = dark if dark is not None else di
    hi = hi if hi is not None else min(n - 1, li + (1 if n >= 6 else 0))
    xs = [p[0] for p in pix]; ys = [p[1] for p in pix]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    w, h = max(1, x1 - x0), max(1, y1 - y0)
    for (x, y) in pix:
        t = ((x - x0) / w * 0.55 + (y - y0) / h * 0.45)
        c = li if t < 0.24 else di if t > 0.72 else mi
        if edge:
            if (x - 1, y) not in pix or (x, y - 1) not in pix: c = hi if t < 0.5 else li
            elif (x + 1, y) not in pix or (x, y + 1) not in pix: c = di if t > 0.3 else mi
        L.px[(x, y)] = rp[min(n - 1, c)]; L.dark[(x, y)] = rp[0]
    return pix

def line(L, J, a, b, c, outline=None):
    """1px detail stroke (seams, folds, straps) along a-b in body coords"""
    (x1, y1), (x2, y2) = J['T'](a), J['T'](b)
    n = int(max(abs(x2 - x1), abs(y2 - y1))) + 1
    pts = {(math.floor(x1 + (x2 - x1) * k / max(1, n - 1)), math.floor(y1 + (y2 - y1) * k / max(1, n - 1))) for k in range(n)}
    L.put(pts, c, outline)

# ---------------------------------------------------------------- stamps (hand-authored pixel art on the head)
def stamp(L, J, rows, keys, ox, oy, only=None):
    """rows: list of strings; keys: char -> (rgb, outline rgb). (ox, oy) = head-local position of rows[0][0]"""
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch == '.' or ch == ' ' or ch not in keys: continue
            if only and ch not in only: continue
            col, ol = keys[ch]
            x, y = H(J, ox + c + 0.5, oy + r + 0.5)
            p = (math.floor(x), math.floor(y))
            if 0 <= p[0] < L.w and 0 <= p[1] < L.h: L.px[p] = col; L.dark[p] = ol
def keys_from(ramp_name, chars='0123456789'):
    rp = ramp(ramp_name)
    return {chars[i]: (rp[i], rp[0]) for i in range(len(rp))}

# ================================================================ base body
SKIN = ramp('skin')
SK = {'1': (SKIN[1], SKIN[0]), '2': (SKIN[2], SKIN[0]), '3': (SKIN[3], SKIN[0]), '4': (SKIN[4], SKIN[0])}
HEAD_S = [  # x -9..8, y 0..15 (skull hidden under hair; round cheeks, small chin)
    ".....33333333.....",
    "...333444444333...",
    "..33444444433333..",
    ".3344444333333333.",
    ".3444433333333332.",
    "334443333333333322",
    "344433333333333322",
    "344333333333333322",
    "343333333333333322",
    "343333333333333322",
    "343333333333333322",
    ".3433333333333332.",
    ".3333333333333322.",
    "..33333333333322..",
    "...333333333322...",
    ".....33333322.....",
]
HEAD_E = [  # profile facing +x, x -8..8
    ".....33333333....",
    "...333444444333..",
    "..33444444333333.",
    ".334444333333333.",
    ".344433333333333.",
    "3444333333333333.",
    "3443333333333333.",
    "3433333333333333.",
    "3433333333333333.",
    "3333333333333333.",
    "2333333333333333.",
    ".233333333333333.",
    ".223333333333332.",
    "..2233333333332..",
    "...222333333322..",
    ".....22222222....",
]
def ears(L, J):
    v = J['view']
    if v == 'S':
        for x, c in ((-10, '3'), (9, '2')): stamp(L, J, [c, c, c], SK, x, 8)
    elif v == 'E':
        stamp(L, J, ["22", "21", "22"], SK, -2, 8)

LEGW = {'male': (5.4, 4.8), 'female': (4.8, 4.4)}
def leg_parts(J, i):
    """thigh, shin and boot pixel sets for leg i"""
    side = J['side']; hips, knees, feet = J['hips'], J['knees'], J['feet']
    tw, sw = LEGW[J['sex']]
    thigh = limb(J, hips[i], knees[i], tw)
    shin = limb(J, knees[i], (feet[i][0], feet[i][1] - 3), sw)
    fx, fy = feet[i]
    if side: boot = limb(J, (fx - 0.6, fy - 7), (fx - 0.2, fy - 2.6), sw + 0.6) | Tset(J, ellipse(fx + 1.4, fy - 1.6, 3.6, 2.0))
    else: boot = limb(J, (fx, fy - 7), (fx, fy - 2.6), sw + 0.6) | Tset(J, ellipse(fx, fy - 1.7, 2.8, 2.0))
    return thigh, shin, boot

def arm_parts(J, i, w=4.2):
    sh, el, ha = J['sh'], J['elbows'], J['hands']
    return limb(J, sh[i], el[i], w), limb(J, el[i], ha[i], w - 0.8), Tset(J, ellipse(ha[i][0], ha[i][1], 1.9, 1.9))

def torso_pts(J, grow=0.0, top=0.0, bottom=0.0):
    """torso outline in body coords (shoulders -> waist -> hips)"""
    sh, hips, fem = J['sh'], J['hips'], J['sex'] == 'female'
    if J['side']:
        return [(sh[0][0] - 3.6 - grow, sh[0][1] - 1 + top), (sh[1][0] + 3.4 + grow, sh[1][1] - 1 + top),
                (hips[1][0] + 2.8 + grow, hips[1][1] + bottom), (hips[0][0] - 3.2 - grow, hips[0][1] + bottom)]
    wy = (sh[0][1] + hips[0][1]) / 2 + 1.5
    wx = 4.0 if fem else 4.8
    return [(sh[0][0] - 0.8 - grow, sh[0][1] + 0.6 + top), (sh[0][0] + 1.6, sh[0][1] - 1.6 + top - grow), (sh[1][0] - 1.6, sh[1][1] - 1.6 + top - grow),
            (sh[1][0] + 0.8 + grow, sh[1][1] + 0.6 + top), (32 + wx + grow, wy), (hips[1][0] + 1.4 + grow, hips[1][1] + bottom), (hips[0][0] - 1.4 - grow, hips[0][1] + bottom), (32 - wx - grow, wy)]

def draw_base(L, J):
    side = J['side']
    pants = [ramp('brown')[i] for i in (0, 1, 2, 3, 4)] if J['sex'] == 'male' else [ramp('brown')[i] for i in (0, 1, 1, 2, 3)]
    boots = [ramp('brown')[i] for i in (0, 1, 2, 3, 4)]
    shirt = ramp('cream')
    def leg(i):
        th, sn, bt = leg_parts(J, i)
        fillg(L, th | sn, pants); fillg(L, bt, boots, light=3, mid=2, dark=1)
        fx, fy = J['feet'][i]
        line(L, J, (fx - 2.4, fy - 7.4), (fx + 2.2, fy - 7.4), boots[4], boots[0])   # boot cuff
    def arm(i):
        up, fo, hand = arm_parts(J, i)
        fillg(L, up, shirt); fillg(L, fo | hand, SKIN)
    if side: arm(0); leg(0); leg(1)
    else: leg(0); leg(1)
    fillg(L, quad(J, torso_pts(J)), shirt)
    # neck + head
    hx, hy = J['head']
    fillg(L, limb(J, (hx + (-0.5 if side else 0), hy + 14), (hx + (-0.5 if side else 0), J['sh'][0][1] + 0.5), 4.6), SKIN, light=2, mid=2, dark=1, edge=False)
    stamp(L, J, HEAD_E if side else HEAD_S, SK, -8 if side else -9, 0)
    ears(L, J)
    if side: arm(1)
    else: arm(0); arm(1)

# ================================================================ face (separate layer: eyes, brows, mouth, blush)
EYE = ramp('iris'); RO = ramp('rose'); HK = ramp('hair')
OUT = hexrgb('#1a1420')
FK = {'K': (OUT, OUT), 'k': (HK[0], OUT), 'I': (EYE[0], OUT), 'i': (EYE[1], OUT), 'j': (EYE[2], OUT), 'W': (hexrgb('#ffffff'), OUT),
      'w': (hexrgb('#d8dce6'), OUT), 'B': (HK[1], HK[0]), 'b': (HK[2], HK[0]), 'm': (SKIN[1], SKIN[0]), 'r': (RO[2], RO[0]), 'R': (RO[1], RO[0]), 's': (SKIN[2], SKIN[0])}
FACE_S = {   # rows 6..13 of the head, x -9..8
    'male': [
        "....bb......bb....",
        "..................",
        "....KKK....KKK....",
        "....wWI....WIw....",
        "....wjI....jIw....",
        ".....ii....ii.....",
        "..................",
        "........mm........",
    ],
    'female': [
        "....bb......bb....",
        "..................",
        "...KKKK....KKKK...",
        "....wWI....WIw....",
        "....wjI....jIw....",
        "...r.ii....ii.r...",
        "..................",
        "........R.........",
    ],
}
FACE_E = {   # x -8..8
    'male': [
        "...........bb....",
        ".................",
        "...........KKK...",
        "...........WIw...",
        "...........jI....",
        "...........ii....",
        ".................",
        "..............m..",
    ],
    'female': [
        "...........bb....",
        ".................",
        "..........KKKK...",
        "...........WIw...",
        "...........jI....",
        "..........rii....",
        ".................",
        "..............R..",
    ],
}
def draw_face(L, J):
    v = J['view']
    if v == 'S': stamp(L, J, FACE_S[J['sex']], FK, -9, 6)
    elif v == 'E': stamp(L, J, FACE_E[J['sex']], FK, -8, 6)

# ================================================================ hair (key ramp, recoloured in game)
HAIR_STYLES = ['short', 'spiky', 'ponytail', 'long', 'twin', 'bun']
HRK = {str(i): (HK[i], HK[0]) for i in range(4)}
def sym(rows, shade={'3': '2'}):
    """left half (incl. centre-left column) -> full symmetric row; the right half gets the shaded keys"""
    out = []
    for r in rows:
        right = ''.join(shade.get(c, c) for c in reversed(r))
        out.append(r + right)
    return out
HAIR_S = sym([   # x -11..10, y -3..10
    "........122",
    "......12333",
    ".....123333",
    "....1233322",
    "...12332222",
    "..123222222",
    "..122222222",
    ".1222222222",
    ".1222212222",
    ".122.212.21",
    ".122..1...1",
    ".12........",
    ".12........",
    "..1........",
])
HAIR_N = sym([   # back of the head, x -11..10, y -3..12
    "........122",
    "......12333",
    ".....123333",
    "....1233332",
    "...12333222",
    "..123322222",
    "..123222222",
    ".1232222222",
    ".1222222122",
    ".1222212222",
    ".1222212221",
    ".1222122212",
    ".1221222122",
    "..122122122",
    "..112211221",
    "....11..11.",
])
HAIR_E = [       # profile facing +x, x -10..9, y -3..12
    ".......122221.......",
    ".....1223333221.....",
    "....12233333322211..",
    "...1233333222222221.",
    "..12333222222222221.",
    "..12332222222222221.",
    ".123222222222222221.",
    ".122222222222222221.",
    ".1222222222222221221",
    ".12222222222221.2.21",
    ".1222222221....1...1",
    ".122222221..........",
    ".12222221...........",
    ".1222221............",
    "..12221.............",
    "...111..............",
]
def hair_piece(L, J, pts, strands=()):
    """procedural hair volume (tails, long hair, spikes) in head-local coords, with strand lines"""
    pix = Hpoly(J, pts)
    fillg(L, pix, HK, light=3, mid=2, dark=1)
    for a, b in strands:
        (x1, y1), (x2, y2) = H(J, *a), H(J, *b)
        n = int(max(abs(x2 - x1), abs(y2 - y1))) + 1
        L.put({(math.floor(x1 + (x2 - x1) * k / max(1, n - 1)), math.floor(y1 + (y2 - y1) * k / max(1, n - 1))) for k in range(n)} & pix, HK[1], HK[0])

def draw_hair(L, J, style):
    v, side = J['view'], J['side']
    # back pieces first (behind the cap)
    if style == 'long':
        if v == 'S':
            for s in (-1, 1): hair_piece(L, J, [(s * 8.5, 5), (s * 11, 6), (s * 11.6, 20), (s * 9.6, 23), (s * 7.6, 21), (s * 7.8, 10)], [((s * 9.6, 9), (s * 9.8, 21))])
        elif v == 'N': hair_piece(L, J, [(-11, 6), (10, 6), (10.6, 22), (7, 25), (0, 26), (-7, 25), (-11.6, 22)], [((-5, 10), (-5.4, 24)), ((0, 11), (0, 25)), ((5, 10), (5.2, 24))])
        else: hair_piece(L, J, [(-10, 4), (-2, 6), (-1, 21), (-4, 24), (-10.6, 22)], [((-6, 8), (-6.6, 22))])
    elif style == 'ponytail':
        if v == 'N': hair_piece(L, J, [(-2.4, 9), (2.4, 9), (3.2, 18), (1.4, 25), (-1.4, 25), (-3.2, 18)], [((0, 11), (0, 24))])
        elif side: hair_piece(L, J, [(-9, 2), (-12, 4), (-13.6, 12), (-12.6, 20), (-10.6, 21), (-10.4, 12), (-8.6, 6)], [((-11.6, 7), (-11.8, 19))])
        else: hair_piece(L, J, [(8.6, 3), (11.4, 4.4), (12.4, 11), (11.4, 17), (9.8, 16), (10, 9)], [((10.8, 6), (10.8, 15))])
    elif style == 'twin':
        for s in ((-1, 1) if not side else (-1,)):
            x = 11.4 * s if not side else -11
            hair_piece(L, J, [(x - 2.4, 4), (x + 2.4, 4), (x + 2.6, 13), (x + 1.2, 20), (x - 1.2, 20), (x - 2.6, 13)], [((x, 6), (x, 19))])
    stamp(L, J, HAIR_E if side else HAIR_N if v == 'N' else HAIR_S, HRK, -10 if side else -11, -3)
    # pieces on top of the cap
    if style == 'spiky':
        for sx, h, lean in ((-6.5, 3, -2.5), (-2.2, 4.6, -1), (2.4, 4.2, 1.2), (6.6, 2.6, 2.6)):
            if side: sx = sx * 0.8 - 2
            hair_piece(L, J, [(sx - 3.6, 0.5), (sx - 1.2, -1.5), (sx + lean, -2.4 - h), (sx + 1.6, -1.2), (sx + 3.4, 0.5)])
    elif style == 'bun':
        bx, by = (0, -3) if not side else (-5, -2)
        if v == 'N': by = 1
        hair_piece(L, J, [(bx + 3.6 * math.cos(a), by + 3.2 * math.sin(a)) for a in [i / 12 * 2 * math.pi for i in range(12)]], [((bx - 1.5, by - 1), (bx + 1.5, by + 1))])
    if style == 'twin':  # ribbons
        for s in ((-1, 1) if not side else (-1,)):
            x = 11.4 * s if not side else -11
            fillg(L, Hpoly(J, [(x - 2, 3), (x + 2, 3), (x + 2, 5), (x - 2, 5)]), ramp('red'), edge=False)
    if style == 'ponytail' and v != 'N':
        x = 9.6 if not side else -9.4
        fillg(L, Hpoly(J, [(x - 1, 3), (x + 1.2, 3), (x + 1.2, 5), (x - 1, 5)]), ramp('red'), edge=False)

# ================================================================ clothes / armor
def skirt_pts(J, length, flare=1.2, grow=0.6):
    hips = J['hips']; y = hips[0][1] - 0.5
    if J['side']:
        x0, x1 = hips[0][0] - 3.2 - grow, hips[1][0] + 2.8 + grow
    else:
        x0, x1 = hips[0][0] - 1.4 - grow, hips[1][0] + 1.4 + grow
    return [(x0, y), (x1, y), (x1 + flare, y + length), (x0 - flare * (1.4 if J['side'] else 1), y + length)]
def sleeves(L, J, rp, w=4.8, full=False, cuff=None):
    for i in (0, 1):
        up, fo, hand = arm_parts(J, i, w)
        fillg(L, up | (fo if full else set()), rp)
        if cuff:
            el = J['elbows'][i] if not full else J['hands'][i]
            a = el; b = J['shoulder_dir'] if False else None
            fillg(L, Tset(J, ellipse(el[0], el[1] - (1.5 if full else 0), w / 2 + 0.3, 1.1)), cuff, edge=False)
def front_only(J): return J['view'] == 'S'
def waist_y(J): return J['hips'][0][1] - 1.5
def belt(L, J, rp=None, buckle='gold', y=0.0, h=2.2):
    rp = rp or ramp('brown')
    pts = torso_pts(J, 0.5); yy = waist_y(J) + y
    xs = [p[0] for p in pts]; x0, x1 = min(xs) + 0.6, max(xs) - 0.6
    if not J['side']: x0, x1 = J['hips'][0][0] - 1.9, J['hips'][1][0] + 1.9
    fillg(L, quad(J, [(x0, yy), (x1, yy), (x1, yy + h), (x0, yy + h)]), [rp[0], rp[1], rp[2], rp[3]], edge=False)
    if buckle and J['view'] == 'S':
        g = ramp(buckle); fillg(L, quad(J, [(30.6, yy - 0.4), (33.4, yy - 0.4), (33.4, yy + h + 0.4), (30.6, yy + h + 0.4)]), g, light=4, mid=3, dark=2)
        L.put(Tset(J, rect(31.6, yy + 0.6, 1, 1)), g[1], g[0])
    elif buckle and J['side']:
        g = ramp(buckle); fillg(L, quad(J, [(x1 - 2.6, yy - 0.3), (x1 - 0.4, yy - 0.3), (x1 - 0.4, yy + h + 0.3), (x1 - 2.6, yy + h + 0.3)]), g, light=4, mid=3)
def collar_v(L, J, c=None, depth=4.0):
    """V-neck showing the undershirt (front view)"""
    if J['view'] != 'S': return
    y = J['sh'][0][1] - 1.4; c = c or ramp('cream')
    fillg(L, quad(J, [(29.6, y), (34.4, y), (32, y + depth)]), c, light=3, mid=3, dark=2, edge=False)
def folds(L, J, xs, y0, y1, c):
    for x in xs: line(L, J, (x, y0), (x + 0.4, y1), c)
def hem_trim(L, J, length, flare, c):
    p = skirt_pts(J, length, flare)
    line(L, J, (p[3][0] + 0.6, p[3][1] - 1), (p[2][0] - 0.6, p[2][1] - 1), c)

TUNIC_COLORS = ['blue', 'brown', 'green', 'red', 'violet']
def tunic(L, J, color='blue', hem=5.5):
    c = ramp(color); v = J['view']; fem = J['sex'] == 'female'
    hem = hem + (2.5 if fem else 0)
    fillg(L, quad(J, torso_pts(J, 0.7)) | quad(J, skirt_pts(J, hem, 1.6 if fem else 1.0)), c)
    sleeves(L, J, c, 5.0)
    hem_trim(L, J, hem, 1.6 if fem else 1.0, ramp('cream')[2])
    if v == 'S':
        collar_v(L, J)
        line(L, J, (31.2, J['sh'][0][1] + 0.4), (32.8, J['sh'][0][1] + 1.6), ramp('brown')[2])   # laces
        folds(L, J, [29.4, 34.2], J['hips'][0][1] + 1, J['hips'][0][1] + hem - 1.5, c[1])
    elif v == 'N': folds(L, J, [32], J['hips'][0][1] + 1, J['hips'][0][1] + hem - 1.5, c[1])
    else: folds(L, J, [J['hips'][0][0] + 0.5], J['hips'][0][1] + 1, J['hips'][0][1] + hem - 1.5, c[1])
    belt(L, J)

def draw_armor(L, J, kind, color='blue'):
    v, side = J['view'], J['side']
    st, br = ramp('stone'), ramp('brown')
    if kind == 'tunic': tunic(L, J, color)
    elif kind == 'leather':
        sleeves(L, J, ramp('cream'), 5.0)
        fillg(L, quad(J, torso_pts(J, 0.9)) | quad(J, skirt_pts(J, 4.5, 0.8, 0.8)), br)
        for i in ((0, 1) if not side else (1,)):   # shoulder guards
            fillg(L, Tset(J, ellipse(J['sh'][i][0] + (0 if side else (-0.6 if i == 0 else 0.6)), J['sh'][i][1] + 0.8, 3.2, 2.6)), br, light=5, mid=4, dark=3)
        if v == 'S':
            for y in (2.4, 6.0): line(L, J, (28.6, J['sh'][0][1] + y), (35.4, J['sh'][0][1] + y), br[4])   # stitched panels
            line(L, J, (32, J['sh'][0][1] + 0.5), (32, waist_y(J)), br[1])
        for i in (0, 1):   # bracers
            el, ha = J['elbows'][i], J['hands'][i]
            fillg(L, limb(J, ((el[0] * 2 + ha[0]) / 3, (el[1] * 2 + ha[1]) / 3), ((el[0] + ha[0] * 3) / 4, (el[1] + ha[1] * 3) / 4), 4.2), br, light=4, mid=3, dark=2)
        belt(L, J, buckle='gold')
    elif kind == 'chain':
        sleeves(L, J, st, 5.2, full=True)
        fillg(L, quad(J, torso_pts(J, 1.0)) | quad(J, skirt_pts(J, 7, 1.2, 1.0)), st)
        for (x, y) in list(L.px):   # mail rings: dither the mid tone
            if L.px[(x, y)] == st[3] and (x + y) % 2 == 0: L.px[(x, y)] = st[4]
        belt(L, J, buckle='stone')
    elif kind == 'plate':
        sleeves(L, J, st, 5.4, full=True)
        fillg(L, quad(J, skirt_pts(J, 6, 1.6, 1.2)), st, light=4, mid=3, dark=2)
        if v == 'S':
            for k in (2, 4): line(L, J, (J['hips'][0][0] - 2.6, J['hips'][0][1] + k), (J['hips'][1][0] + 2.6, J['hips'][1][1] + k), st[1])  # faulds
        fillg(L, quad(J, torso_pts(J, 1.2)), st, light=4, mid=3, dark=2, hi=5)
        if v == 'S':   # breastplate ridge + highlight
            line(L, J, (32, J['sh'][0][1]), (32, waist_y(J) - 1), st[5])
            L.put(Tset(J, rect(28.5, J['sh'][0][1] + 1, 2, 3)), st[5], st[0])
        for i in ((0, 1) if not side else (1,)):   # pauldrons
            fillg(L, Tset(J, ellipse(J['sh'][i][0] + (0 if side else (-1 if i == 0 else 1)), J['sh'][i][1] + 0.4, 3.8, 3.0)), st, light=5, mid=4, dark=2)
        for i in (0, 1):   # gauntlets + greaves
            fillg(L, Tset(J, ellipse(J['hands'][i][0], J['hands'][i][1], 2.3, 2.3)), st, light=4, mid=3, dark=2)
            k, f = J['knees'][i], J['feet'][i]
            fillg(L, limb(J, (k[0], k[1] - 1), (f[0], f[1] - 7.5), 5.2), st, light=4, mid=3, dark=2)
            fillg(L, Tset(J, ellipse(k[0], k[1] - 0.5, 2.6, 2)), st, light=5, mid=4, dark=3)
        belt(L, J, buckle='gold')
    elif kind == 'robe':
        c = ramp(color if color in ('blue', 'violet', 'ivory', 'brown', 'green', 'red') else 'blue')
        fillg(L, quad(J, torso_pts(J, 0.9)) | quad(J, skirt_pts(J, 17, 3.0, 1.0)), c)
        sleeves(L, J, c, 5.6, full=True)
        for i in (0, 1): fillg(L, Tset(J, ellipse(J['hands'][i][0], J['hands'][i][1], 2.0, 2.0)), SKIN)
        trim = ramp('gold') if color != 'ivory' else ramp('sky')
        p = skirt_pts(J, 17, 3.0, 1.0)
        line(L, J, (p[3][0] + 0.8, p[3][1] - 1), (p[2][0] - 0.8, p[2][1] - 1), trim[3], trim[0])
        if v == 'S':
            line(L, J, (32, J['sh'][0][1] - 0.5), (32, J['hips'][0][1] + 16), trim[2], trim[0])
            folds(L, J, [28.6, 35.6], J['hips'][0][1] + 2, J['hips'][0][1] + 14, c[1])
        elif v == 'N': folds(L, J, [29.5, 34.5], J['hips'][0][1] + 2, J['hips'][0][1] + 14, c[1])
        belt(L, J, trim, None, h=1.8)

# ================================================================ class identity layers + back items
def tabard(L, J, c, trim, length=9, width=3.0):
    v, side, sh = J['view'], J['side'], J['sh']
    y0, y1 = sh[0][1] - 0.5, J['hips'][0][1] + length
    if v in ('S', 'N'):
        pix = quad(J, [(32 - width, y0), (32 + width, y0), (32 + width + 0.6, y1), (32 - width - 0.6, y1)])
    else:
        pix = quad(J, [(sh[1][0] - 0.5, y0), (sh[1][0] + 3.4, y0), (sh[1][0] + 4.2, y1), (sh[1][0] + 0.2, y1)])
    fillg(L, pix, c)
    xs = [p[0] for p in pix]; ys = [p[1] for p in pix]
    for (x, y) in pix:   # trim along the sides and hem
        if (x - 1, y) not in pix or (x + 1, y) not in pix or y == max(ys): L.px[(x, y)] = trim[3]; L.dark[(x, y)] = trim[0]
    return pix

def draw_class(L, J, cls):
    v, side, sh, hips = J['view'], J['side'], J['sh'], J['hips']
    y0, y1 = sh[0][1], hips[0][1]
    br, gd = ramp('brown'), ramp('gold')
    if cls == 'adventurer':
        # cross strap, hip satchel, fingerless gloves
        if v == 'S':
            line(L, J, (sh[1][0] - 1.2, y0 - 0.6), (hips[0][0] - 0.8, y1 - 2), br[1]); line(L, J, (sh[1][0] - 0.2, y0 - 0.6), (hips[0][0] + 0.2, y1 - 2), br[3], br[0])
            fillg(L, quad(J, [(hips[0][0] - 4.6, y1 - 2.6), (hips[0][0] + 0.6, y1 - 2.6), (hips[0][0] + 0.8, y1 + 2.6), (hips[0][0] - 4.8, y1 + 2.6)]), br, light=4, mid=3, dark=2)
            line(L, J, (hips[0][0] - 4.6, y1 - 1.2), (hips[0][0] + 0.6, y1 - 1.2), br[2])
            L.put(Tset(J, rect(hips[0][0] - 2.4, y1 - 0.8, 1, 1)), gd[3], gd[0])
        elif side:
            fillg(L, quad(J, [(hips[0][0] - 5.4, y1 - 2.4), (hips[0][0] - 1.2, y1 - 2.4), (hips[0][0] - 1.2, y1 + 3), (hips[0][0] - 5.4, y1 + 3)]), br, light=4, mid=3, dark=2)
        else:
            line(L, J, (sh[0][0] + 1.2, y0 - 0.6), (hips[1][0] + 0.8, y1 - 2), br[2])
        for i in (0, 1): fillg(L, Tset(J, ellipse(J['hands'][i][0], J['hands'][i][1] - 0.3, 2.1, 1.5)), br, light=3, mid=2, dark=1, edge=False)
    elif cls == 'vanguard':
        tabard(L, J, ramp('blue'), gd, 7, 3.2)
        if v == 'S':   # crest
            fillg(L, quad(J, [(30.6, y0 + 3), (33.4, y0 + 3), (33.4, y0 + 6), (32, y0 + 7.6), (30.6, y0 + 6)]), gd, light=4, mid=3, dark=2, edge=False)
        for i in ((0, 1) if not side else (1,)):
            fillg(L, Tset(J, ellipse(sh[i][0] + (0 if side else (-1.2 if i == 0 else 1.2)), sh[i][1] + 0.2, 3.6, 2.8)), ramp('stone'), light=5, mid=4, dark=2)
            line(L, J, (sh[i][0] - 2.6, sh[i][1] + 1.6), (sh[i][0] + 2.6, sh[i][1] + 1.6), gd[3], gd[0])
    elif cls == 'ranger':
        g = ramp('green')
        # short hooded mantle over the shoulders
        if v == 'S': pix = quad(J, [(sh[0][0] - 1.6, y0 - 1.2), (sh[1][0] + 1.6, y0 - 1.2), (sh[1][0] + 1, y0 + 4), (32, y0 + 7), (sh[0][0] - 1, y0 + 4)])
        elif v == 'N': pix = quad(J, [(sh[0][0] - 1.6, y0 - 1.6), (sh[1][0] + 1.6, y0 - 1.6), (sh[1][0] + 1.2, y0 + 6), (32, y0 + 9), (sh[0][0] - 1.2, y0 + 6)])
        else: pix = quad(J, [(sh[0][0] - 4.6, y0 - 1.6), (sh[1][0] + 2.6, y0 - 1.2), (sh[1][0] + 1.6, y0 + 4.5), (sh[0][0] - 4.6, y0 + 8)])
        fillg(L, pix, g)
        if v == 'S':
            line(L, J, (32, y0 - 0.8), (32, y0 + 6), g[1])
            fillg(L, Tset(J, ellipse(32, y0 - 0.2, 1.2, 1.2)), gd, light=4, mid=3, edge=False)   # clasp
            line(L, J, (sh[0][0] + 0.6, y0 + 3.4), (hips[1][0] + 1, y1 - 1.6), br[2])               # quiver strap
        belt(L, J, buckle='gold')
        for i in (0, 1):   # bracers
            el, ha = J['elbows'][i], J['hands'][i]
            fillg(L, limb(J, ((el[0] + ha[0]) / 2, (el[1] + ha[1]) / 2), ((el[0] + ha[0] * 3) / 4, (el[1] + ha[1] * 3) / 4), 4.4), br, light=4, mid=3, dark=2)
    elif cls == 'arcanist':
        vi, sk = ramp('violet'), ramp('sky')
        # long coat tails + violet sash + rune pendant
        if v == 'S':
            for s in (-1, 1):   # open coat edges framing the robe
                x = 32 + s * 6.0
                fillg(L, quad(J, [(x - 1.2, y0 + 1), (x + 1.2, y0 + 1), (x + 1.4 + s * 2.4, y1 + 12), (x - 1.0 + s * 2.4, y1 + 12)]), ramp('blue'), edge=False)
        elif v == 'N': fillg(L, quad(J, skirt_pts(J, 13, 2.2, 1.0)), ramp('blue'))
        else: fillg(L, quad(J, [(hips[0][0] - 3.6, y1), (hips[0][0] + 0.6, y1), (hips[0][0] - 1.4, y1 + 13), (hips[0][0] - 6.4, y1 + 12.4)]), ramp('blue'))
        belt(L, J, vi, None, h=2.4)
        if v == 'S':
            fillg(L, quad(J, [(hips[1][0] - 0.4, y1 + 0.5), (hips[1][0] + 1.4, y1 + 0.5), (hips[1][0] + 1.8, y1 + 7), (hips[1][0] - 0.2, y1 + 7)]), vi, edge=False)  # sash end
            line(L, J, (30, y0 - 0.6), (32, y0 + 3), gd[2]); line(L, J, (34, y0 - 0.6), (32, y0 + 3), gd[2])
            fillg(L, Tset(J, ellipse(32, y0 + 4.2, 1.6, 1.6)), sk, light=3, mid=2, dark=1)
            L.put(Tset(J, rect(31, y0 + 3, 1, 1)), sk[3], sk[0])
        for i in (0, 1):   # rune cuffs
            ha = J['hands'][i]; el = J['elbows'][i]
            fillg(L, limb(J, ((el[0] + ha[0] * 2) / 3, (el[1] + ha[1] * 2) / 3), ((el[0] + ha[0] * 4) / 5, (el[1] + ha[1] * 4) / 5), 5.6), vi, light=3, mid=2, dark=1)

BACKS = ['adventurer', 'ranger', 'cape_blue', 'cape_red', 'cape_gold', 'cape_violet']
def draw_back(L, J, kind):
    v, side, sh, hips = J['view'], J['side'], J['sh'], J['hips']
    br = ramp('brown')
    if kind == 'ranger':
        if v == 'N': base, tip = (sh[0][0] + 2.4, sh[0][1] - 5), (sh[0][0] + 6.4, sh[0][1] + 10)
        elif v == 'S': base, tip = (sh[1][0] - 0.6, sh[1][1] - 5), (sh[1][0] + 2.6, sh[1][1] + 9)
        else: base, tip = (sh[0][0] - 4.4, sh[0][1] - 5), (sh[0][0] - 7, sh[0][1] + 10)
        fillg(L, limb(J, base, tip, 4.6), br, light=4, mid=3, dark=2)
        line(L, J, (base[0] - 1.6, base[1] + 3), (base[0] + 1.6, base[1] + 3), ramp('gold')[3], ramp('gold')[0])
        for k in range(3):   # fletching
            fx = base[0] - 1.6 + k * 1.6
            L.put(Tset(J, rect(fx, base[1] - 3.4 + (k % 2), 1, 3)), ramp('ivory')[3], ramp('ivory')[0])
            L.put(Tset(J, rect(fx, base[1] - 3.4 + (k % 2), 1, 1)), ramp('red')[3], ramp('red')[0])
    elif kind.startswith('cape_'):
        c = ramp({'cape_red': 'red', 'cape_gold': 'gold', 'cape_violet': 'violet'}.get(kind, 'blue'))
        y0, y1 = sh[0][1], hips[0][1]
        if v == 'N':
            pix = quad(J, [(sh[0][0] - 0.8, y0 - 1), (sh[1][0] + 0.8, y0 - 1), (sh[1][0] + 3, y1 + 14), (32, y1 + 15), (sh[0][0] - 3, y1 + 14)])
            fillg(L, pix, c)
            for x in (29, 35): line(L, J, (x, y0 + 3), (x + (x - 32) * 0.4, y1 + 12), c[1])
        elif side:
            fillg(L, quad(J, [(sh[0][0] - 3.8, y0 - 1), (sh[0][0] - 0.6, y0 - 0.4), (sh[0][0] - 3, y1 + 14), (sh[0][0] - 8.4, y1 + 12.6)]), c)
        else:
            for s in (-1, 1):
                x = sh[0][0] if s < 0 else sh[1][0]
                fillg(L, quad(J, [(x - 1.2 * s - 0.6, y0 - 0.6), (x + 0.6 * s, y0), (x + 3.4 * s, y1 + 13), (x + 1.2 * s, y1 + 14)]), c)
    elif kind == 'adventurer':
        if v == 'N':
            fillg(L, quad(J, [(28, sh[0][1] + 0.5), (36, sh[0][1] + 0.5), (36.4, sh[0][1] + 9), (27.6, sh[0][1] + 9)]), br)
            fillg(L, Tset(J, ellipse(32, sh[0][1] - 0.4, 5.2, 1.8)), ramp('red'), light=3, mid=2, dark=1)   # bedroll
            line(L, J, (28, sh[0][1] + 4), (36, sh[0][1] + 4), br[1])
            L.put(Tset(J, rect(31.5, sh[0][1] + 4, 1, 2)), ramp('gold')[3], ramp('gold')[0])
        elif side:
            fillg(L, quad(J, [(sh[0][0] - 7.4, sh[0][1] + 0.5), (sh[0][0] - 2.6, sh[0][1] + 0.5), (sh[0][0] - 2.4, sh[0][1] + 9), (sh[0][0] - 7.6, sh[0][1] + 9)]), br)
            fillg(L, Tset(J, ellipse(sh[0][0] - 5, sh[0][1] - 0.6, 2.4, 1.8)), ramp('red'), light=3, mid=2, dark=1)
        else:
            fillg(L, Tset(J, ellipse(32, sh[0][1] - 1.4, 6.6, 1.6)), ramp('red'), light=3, mid=2, dark=1)   # bedroll over the shoulders

# ================================================================ NPC outfits (replace armor for NPCs)
NPC_OUTFITS = ['guard', 'merchant', 'blacksmith']
def draw_outfit(L, J, role):
    v, side = J['view'], J['side']
    if role == 'guard':
        draw_armor(L, J, 'chain')
        tabard(L, J, ramp('blue'), ramp('ivory'), 8, 3.4)
        if v == 'S': fillg(L, quad(J, [(31, J['sh'][0][1] + 3), (33, J['sh'][0][1] + 3), (33, J['sh'][0][1] + 6.4), (31, J['sh'][0][1] + 6.4)]), ramp('ivory'), light=3, mid=3, edge=False)
        belt(L, J, buckle='stone', y=0.2)
    elif role == 'merchant':
        tunic(L, J, 'red', 6)
        vest = ramp('gold')
        pix = quad(J, torso_pts(J, 1.0, 0.6, -1))
        if v == 'S': pix -= quad(J, [(30.6, 30), (33.4, 30), (33.4, 60), (30.6, 60)])
        fillg(L, pix, vest, light=3, mid=2, dark=1)
        belt(L, J, buckle='gold')
        if v != 'N':   # coin purse
            px_ = J['hips'][1][0] + (1.8 if v == 'S' else 2.6)
            fillg(L, Tset(J, ellipse(px_, J['hips'][1][1] + 2, 2.2, 2.6)), ramp('brown'), light=4, mid=3, dark=2)
            L.put(Tset(J, rect(px_ - 0.5, J['hips'][1][1] + 2, 1, 1)), ramp('gold')[3], ramp('gold')[0])
    elif role == 'blacksmith':
        st, br = ramp('stone'), ramp('brown')
        sleeves(L, J, ramp('cream'), 5.0)   # rolled sleeves: forearms stay bare
        fillg(L, quad(J, torso_pts(J, 0.6)) | quad(J, skirt_pts(J, 3.5, 0.6)), [br[1], br[2], br[3], br[4]])
        # heavy leather apron
        y0 = J['sh'][0][1]
        if v == 'S': ap = quad(J, [(28.4, y0 + 1.6), (35.6, y0 + 1.6), (36.8, J['hips'][0][1] + 9), (27.2, J['hips'][0][1] + 9)])
        elif side: ap = quad(J, [(J['sh'][1][0] + 2, y0 + 1.6), (J['sh'][1][0] + 4.4, y0 + 1.6), (J['hips'][1][0] + 5.2, J['hips'][1][1] + 9), (J['hips'][1][0] + 1.6, J['hips'][1][1] + 9)])
        else: ap = set()
        if ap:
            fillg(L, ap, [br[0], br[1], br[2], br[3]])
            if v == 'S':
                line(L, J, (28.6, y0 + 1.6), (J['sh'][0][0] + 1, y0 - 1), br[0]); line(L, J, (35.4, y0 + 1.6), (J['sh'][1][0] - 1, y0 - 1), br[0])
                fillg(L, quad(J, [(30, J['hips'][0][1] + 1), (34, J['hips'][0][1] + 1), (34, J['hips'][0][1] + 4), (30, J['hips'][0][1] + 4)]), br, light=3, mid=2, dark=1, edge=False)   # pocket
        belt(L, J, buckle='stone', y=-0.6)
        for i in (0, 1): fillg(L, Tset(J, ellipse(J['hands'][i][0], J['hands'][i][1] - 0.4, 2.5, 2.1)), br, light=3, mid=2, dark=1)   # work gloves

# ================================================================ weapons (from the weapon hand along the pose angle)
WEAPONS = ['sword', 'greatsword', 'dagger', 'bow', 'staff', 'wand', 'mace', 'spear', 'axe', 'pickaxe', 'device']
def seg(J, hand, ang, t0, t1, w):
    a = math.radians(ang); hx, hy = J['T'](hand)
    return capsule((hx + math.cos(a) * t0, hy + math.sin(a) * t0), (hx + math.cos(a) * t1, hy + math.sin(a) * t1), w)
def cross(J, hand, ang, t, half, w):
    a = math.radians(ang); hx, hy = J['T'](hand); cx, cy = hx + math.cos(a) * t, hy + math.sin(a) * t
    nx, ny = -math.sin(a), math.cos(a)
    return capsule((cx + nx * half, cy + ny * half), (cx - nx * half, cy - ny * half), w)
def at(J, hand, ang, t, off=0):
    a = math.radians(ang); hx, hy = J['T'](hand)
    return (hx + math.cos(a) * t - math.sin(a) * off, hy + math.sin(a) * t + math.cos(a) * off)
def edge_line(L, J, hand, ang, t0, t1, off, c, o):
    p, q = at(J, hand, ang, t0, off), at(J, hand, ang, t1, off)
    n = int(max(abs(q[0] - p[0]), abs(q[1] - p[1]))) + 1
    L.put({(math.floor(p[0] + (q[0] - p[0]) * k / max(1, n - 1)), math.floor(p[1] + (q[1] - p[1]) * k / max(1, n - 1))) for k in range(n)}, c, o)
def blade(L, J, hand, a, t0, t1, w, tip=True):
    st = ramp('stone'); bl = [st[0], st[2], st[3], st[4], st[5]]
    pix = seg(J, hand, a, t0, t1 - (w * 0.6 if tip else 0), w)
    if tip:
        p1, p2, p3 = at(J, hand, a, t1 - w * 0.9, -w / 2), at(J, hand, a, t1 - w * 0.9, w / 2), at(J, hand, a, t1 + 0.6)
        pix |= poly([p1, p2, p3])
    fillg(L, pix, bl, light=3, mid=2, dark=1, hi=4)
    edge_line(L, J, hand, a, t0 + 1, t1 - 1.5, -w * 0.18, st[5], st[0])   # bright edge (light side)
def draw_weapon(L, J, wt):
    hand, a = J['hands'][J['wh']], J['wa']
    st, br, gd = ramp('stone'), ramp('brown'), ramp('gold')
    if wt == 'sword':
        fillg(L, seg(J, hand, a, -4, 1.2, 2.2), br, light=3, mid=2, dark=1)
        fillg(L, Tset(J, ellipse(*at(J, hand, a, -4.6), 1.4, 1.4)), gd, light=4, mid=3)
        fillg(L, cross(J, hand, a, 2.0, 3.6, 1.8), gd, light=4, mid=3, dark=2)
        blade(L, J, hand, a, 3, 19, 3.0)
    elif wt == 'greatsword':
        fillg(L, seg(J, hand, a, -6.5, 1.2, 2.4), br, light=3, mid=2, dark=1)
        fillg(L, Tset(J, ellipse(*at(J, hand, a, -7), 1.6, 1.6)), gd, light=4, mid=3)
        fillg(L, cross(J, hand, a, 2.2, 5.2, 2.4), gd, light=4, mid=3, dark=2)
        blade(L, J, hand, a, 3.4, 26, 4.4)
        edge_line(L, J, hand, a, 5, 22, 0, st[1], st[0])   # fuller
    elif wt == 'dagger':
        fillg(L, seg(J, hand, a, -2.6, 1, 2), br, light=3, mid=2, dark=1)
        fillg(L, cross(J, hand, a, 1.6, 2.4, 1.4), gd, light=4, mid=3)
        blade(L, J, hand, a, 2.4, 10.5, 2.4)
    elif wt == 'mace':
        fillg(L, seg(J, hand, a, -3, 12, 2.2), br, light=3, mid=2, dark=1)
        c = at(J, hand, a, 13.5)
        fillg(L, Tset(J, ellipse(c[0], c[1], 3.4, 3.4)), st, light=5, mid=4, dark=2)
        for k in range(4):
            ang = math.radians(a + 45 + k * 90); q = (c[0] + math.cos(ang) * 3.6, c[1] + math.sin(ang) * 3.6)
            fillg(L, set(ellipse(q[0], q[1], 1.2, 1.2)), st, light=4, mid=3, edge=False)
        fillg(L, cross(J, hand, a, 10.6, 2, 1.4), gd, light=4, mid=3, edge=False)
    elif wt == 'spear':
        fillg(L, seg(J, hand, a, -13, 20, 2.0), br, light=4, mid=3, dark=2)
        p1, p2, p3, p4 = at(J, hand, a, 20, -2.4), at(J, hand, a, 23, 0), at(J, hand, a, 20, 2.4), at(J, hand, a, 28.5)
        fillg(L, poly([at(J, hand, a, 19.4, -1), p1, p4, p3, at(J, hand, a, 19.4, 1)]), [st[0], st[2], st[3], st[4], st[5]], light=3, mid=2, dark=1)
        fillg(L, cross(J, hand, a, 19.2, 1.6, 1.6), gd, light=4, mid=3, edge=False)
    elif wt == 'staff':
        fillg(L, seg(J, hand, a, -15, 17, 2.2), br, light=4, mid=3, dark=2)
        for t in (-8, 4): fillg(L, cross(J, hand, a, t, 1.4, 1.2), gd, light=4, mid=3, edge=False)
        c = at(J, hand, a, 20)
        fillg(L, Tset(J, ellipse(c[0], c[1], 3.6, 3.6)) - Tset(J, ellipse(c[0], c[1], 2.0, 2.0)), gd, light=4, mid=3, dark=2)   # crook ring
        fillg(L, Tset(J, ellipse(c[0], c[1], 2.0, 2.2)), ramp('sky'), light=3, mid=2, dark=1)
        L.put({(math.floor(c[0] - 0.8), math.floor(c[1] - 0.9))}, hexrgb('#ffffff'), ramp('sky')[0])
    elif wt == 'wand':
        fillg(L, seg(J, hand, a, -2, 10, 1.8), [gd[0], gd[1], gd[2], gd[3]], light=3, mid=2, dark=1)
        c = at(J, hand, a, 11.5)
        fillg(L, Tset(J, ellipse(c[0], c[1], 2.2, 2.2)), ramp('violet'), light=3, mid=2, dark=1)
        L.put({(math.floor(c[0] - 0.7), math.floor(c[1] - 0.8))}, ramp('violet')[3], ramp('violet')[0])
    elif wt == 'axe':
        fillg(L, seg(J, hand, a, -3, 13, 2.2), br, light=3, mid=2, dark=1)
        r = math.radians(a); nx, ny = -math.sin(r), math.cos(r); c = at(J, hand, a, 11.5)
        fillg(L, poly([(c[0] - math.cos(r) * 2.8, c[1] - math.sin(r) * 2.8), (c[0] + math.cos(r) * 2.8, c[1] + math.sin(r) * 2.8),
                       (c[0] + math.cos(r) * 4.4 - nx * 6, c[1] + math.sin(r) * 4.4 - ny * 6), (c[0] - math.cos(r) * 4.4 - nx * 6, c[1] - math.sin(r) * 4.4 - ny * 6)]), [st[0], st[2], st[3], st[4], st[5]], light=3, mid=2, dark=1)
    elif wt == 'pickaxe':
        fillg(L, seg(J, hand, a, -3, 13, 2.2), br, light=3, mid=2, dark=1)
        r = math.radians(a); nx, ny = -math.sin(r), math.cos(r); c = at(J, hand, a, 12.5)
        fillg(L, poly([(c[0] - nx * 7 - math.cos(r) * 2.6, c[1] - ny * 7 - math.sin(r) * 2.6), (c[0] + math.cos(r) * 1.6, c[1] + math.sin(r) * 1.6),
                       (c[0] + nx * 7 - math.cos(r) * 2.6, c[1] + ny * 7 - math.sin(r) * 2.6), (c[0] - math.cos(r) * 1.4, c[1] - math.sin(r) * 1.4)]), [st[0], st[2], st[3], st[4], st[5]], light=3, mid=2, dark=1)
    elif wt == 'device':
        fillg(L, seg(J, hand, a, -1, 8, 4.6), ramp('copper')); fillg(L, seg(J, hand, a, 8, 13, 2.2), st, light=4, mid=3)
        c = at(J, hand, a, 3.4); fillg(L, Tset(J, ellipse(c[0], c[1], 1.6, 1.6)), ramp('teal'), light=3, mid=3, edge=False)
    elif wt == 'bow':
        r = math.radians(a); hx, hy = J['T'](hand); nx, ny = -math.sin(r), math.cos(r)
        bend = 4.0 * (1 if J['view'] in ('E', 'S') else -1)
        pull = J.get('pull', 0) * (1 if J['view'] in ('E', 'S') else -1)
        pts = []
        for k in range(-12, 13):
            t = k; c = bend * (1 - (t / 12) ** 2) - (1.2 if abs(k) > 9 else 0) * bend * 0.4   # recurve tips
            pts.append((hx + math.cos(r) * t + nx * c, hy + math.sin(r) * t + ny * c))
        for p, q in zip(pts, pts[1:]): fillg(L, capsule(p, q, 2.2), br, light=4, mid=3, dark=2, edge=False)
        fillg(L, cross(J, hand, a, 0, 0.1, 2.8), [gd[0], gd[1], gd[2], gd[3]], edge=False)   # grip wrap
        nock = (hx - nx * pull, hy - ny * pull)
        for e in (pts[0], pts[-1]):
            n = int(max(abs(nock[0] - e[0]), abs(nock[1] - e[1]))) + 1
            L.put({(math.floor(e[0] + (nock[0] - e[0]) * k / max(1, n - 1)), math.floor(e[1] + (nock[1] - e[1]) * k / max(1, n - 1))) for k in range(n)}, ramp('ivory')[3], ramp('ivory')[0])
        if pull:   # nocked arrow
            tip = (hx + nx * 3, hy + ny * 3)
            n = int(max(abs(nock[0] - tip[0]), abs(nock[1] - tip[1]))) + 1
            L.put({(math.floor(nock[0] + (tip[0] - nock[0]) * k / max(1, n - 1)), math.floor(nock[1] + (tip[1] - nock[1]) * k / max(1, n - 1))) for k in range(n)}, br[4], br[1])
            L.put({(math.floor(tip[0]), math.floor(tip[1]))}, st[5], st[0])

def draw_shield(L, J, kind='round'):
    hand = J['hands'][J['oh']]; v = J['view']
    hx, hy = J['T'](hand)
    if v == 'E': hx += 3.0
    if v == 'S': hx += 0.6; hy -= 2.4
    if v == 'N': hy -= 2.4
    edge_on = v == 'E'
    if kind == 'round':
        rim, wood = ramp('stone'), ramp('brown')
        fillg(L, set(ellipse(hx, hy, 6.0 if not edge_on else 2.8, 6.8)), rim, light=4, mid=3, dark=2)
        fillg(L, set(ellipse(hx, hy, 4.6 if not edge_on else 1.6, 5.4)), wood if v != 'N' else [wood[0], wood[1], wood[1], wood[2]], light=4, mid=3, dark=2)
        if v == 'S':
            for dy in (-2, 1.5): L.put({(x, math.floor(hy + dy)) for x in range(math.floor(hx - 3.4), math.floor(hx + 4))} & set(ellipse(hx, hy, 4.6, 5.4)), wood[2], wood[0])
            fillg(L, set(ellipse(hx, hy, 1.8, 1.8)), rim, light=5, mid=4, dark=3)
    else:  # kite
        b, g = ramp('blue'), ramp('gold'); w = 6.0 if not edge_on else 2.8
        fillg(L, poly([(hx - w, hy - 6.5), (hx + w, hy - 6.5), (hx + w, hy + 1.4), (hx, hy + 9), (hx - w, hy + 1.4)]), g, light=4, mid=3, dark=2)
        fillg(L, poly([(hx - w + 1.2, hy - 5.3), (hx + w - 1.2, hy - 5.3), (hx + w - 1.2, hy + 0.9), (hx, hy + 7.2), (hx - w + 1.2, hy + 0.9)]), b if v != 'N' else [b[0], b[1], b[1], b[2]])
        if v == 'S':
            L.put(poly([(hx - 0.7, hy - 4.6), (hx + 0.7, hy - 4.6), (hx + 0.7, hy + 5.4), (hx - 0.7, hy + 5.4)]), g[3], g[0])
            L.put(poly([(hx - 3.6, hy - 1.6), (hx + 3.6, hy - 1.6), (hx + 3.6, hy - 0.4), (hx - 3.6, hy - 0.4)]), g[3], g[0])

# ================================================================ headgear (head-local: head spans x -9..9, y 0..16; hair top y -3)
HEADGEAR = ['cap', 'traveler', 'iron', 'knight', 'hood_green', 'hood', 'ironcrown', 'jelcrown', 'band_red', 'band_moon', 'mask_shadow', 'wizard']
HEADGEAR_KIND = {'cap': 'Cap', 'traveler': 'Hat', 'iron': 'Helmet', 'knight': 'Helmet', 'hood_green': 'Ranger Hood', 'hood': 'Hood',
                 'ironcrown': 'Crown', 'jelcrown': 'Crown', 'band_red': 'Headband', 'band_moon': 'Headband', 'mask_shadow': 'Mask', 'wizard': 'Wizard Hat'}
def hdome(J, y0, y1, hw, cx=0.0, k=12):
    pts = [(cx + math.cos(math.pi + i / k * math.pi) * hw, y1 + math.sin(math.pi + i / k * math.pi) * (y1 - y0)) for i in range(k + 1)]
    return Hpoly(J, pts + [(cx + hw, y1 + 0.6), (cx - hw, y1 + 0.6)])
def hrect(J, x0, y0, x1, y1): return Hpoly(J, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
def hdot(L, J, x, y, c, o):
    p = H(J, x + 0.5, y + 0.5); L.put({(math.floor(p[0]), math.floor(p[1]))}, c, o)
def hline(L, J, a, b, c, o):
    (x1, y1), (x2, y2) = H(J, *a), H(J, *b); n = int(max(abs(x2 - x1), abs(y2 - y1))) + 1
    L.put({(math.floor(x1 + (x2 - x1) * k / max(1, n - 1)), math.floor(y1 + (y2 - y1) * k / max(1, n - 1))) for k in range(n)}, c, o)

def draw_head(L, J, vis):
    v, side = J['view'], J['side']
    st, gd, br = ramp('stone'), ramp('gold'), ramp('brown')
    if vis == 'cap':
        c = ramp('red')
        fillg(L, hdome(J, -5.5, 4.5, 11.2), c)
        if v == 'S': fillg(L, Hpoly(J, [(-10, 3.6), (10, 3.6), (8.6, 6.2), (-8.6, 6.2)]), c, light=3, mid=3, dark=2, edge=False); hline(L, J, (-9, 6), (9, 6), c[1], c[0])
        elif side: fillg(L, Hpoly(J, [(5, 3.4), (14.6, 4.2), (14.2, 6.0), (5, 6.0)]), c, light=3, mid=2, dark=1)
        for x in (-4, 4) if v != 'E' else (-2,): hline(L, J, (x * 0.9, -4), (x * 1.6, 3.6), c[1], c[0])   # panel seams
        fillg(L, Hell(J, 0 if not side else -1, -5.6, 1.4, 1.1), gd, light=4, mid=3, edge=False)
    elif vis == 'traveler':
        rx = 15.5
        fillg(L, Hell(J, 0 if not side else 1.5, 3.4, rx, 2.8 if not side else 1.8), br, light=4, mid=3, dark=2)
        fillg(L, hdome(J, -7.5, 3.2, 8.2), br, light=4, mid=3, dark=2)
        fillg(L, hrect(J, -8.2, 0.8, 8.2, 2.8), st, light=3, mid=2, dark=1, edge=False)
        if v != 'N': hline(L, J, (-6, -5.4), (-2, -6.4), br[5], br[0])
        if v in ('S', 'E'):   # feather
            fx = 6 if v == 'S' else -5
            fillg(L, Hpoly(J, [(fx, 1), (fx + 1.6, 0.6), (fx + 4.6, -7), (fx + 3.2, -7.6)]), ramp('red'), light=3, mid=2, dark=1)
    elif vis in ('iron', 'knight'):
        fillg(L, hdome(J, -4.8, 6.0, 10.6), st, light=5, mid=4, dark=2)
        fillg(L, hrect(J, -10.8, 4.8, 10.8, 6.8) if not side else hrect(J, -10.8, 4.8, 10, 6.8), st, light=4, mid=3, dark=2)
        for x in ((-8, -4, 4, 8) if not side else (-8, -4, 4)): hdot(L, J, x, 5.4, st[5], st[0])
        if v != 'S':   # neck guard
            fillg(L, Hpoly(J, [(-10.6, 6.6), (-2 if side else 10.6, 6.6), (-3 if side else 9.8, 11), (-10, 11)]), st, light=4, mid=3, dark=2)
        hline(L, J, (-5, -4.6), (-1, -5.4), st[5], st[0])
        if vis == 'iron':
            if v == 'S': fillg(L, hrect(J, -1, 6.6, 1, 11.4), st, light=4, mid=3, dark=2, edge=False)
            elif side: fillg(L, hrect(J, 7, 6.6, 9.4, 11), st, light=4, mid=3, dark=2)
        else:
            if v == 'S':
                fillg(L, hrect(J, -9.4, 6.6, 9.4, 14.6), st, light=4, mid=3, dark=2)
                hline(L, J, (-7.4, 9), (7.4, 9), st[0], st[0]); hline(L, J, (-0.5, 10), (-0.5, 13.4), st[2], st[0])
                for x in (-4, -2, 2, 4): hdot(L, J, x, 12, st[1], st[0])
            elif side:
                fillg(L, hrect(J, 0, 6.6, 9.6, 14.6), st, light=4, mid=3, dark=2)
                hline(L, J, (3, 9), (9, 9), st[0], st[0])
            # blue plume
            b = ramp('blue')
            fillg(L, Hpoly(J, [(-1.4, -5), (1.4, -5), (2.4, -9), (0, -11.6), (-3.6, -10.6), (-6, -7) if not side else (-8, -6.6)]), b)
    elif vis in ('hood_green', 'hood'):
        c = ramp('green') if vis == 'hood_green' else ramp('brown')
        outer = [(-12, 15), (-12, 4), (-10.6, -1.4), (-6.6, -4.8), (0, -6.2), (6.6, -4.8), (10.6, -1.4), (12, 4), (12, 15), (8, 17.4), (-8, 17.4)]
        if v == 'S':
            pix = Hpoly(J, outer) - Hell(J, 0, 10.4, 8.4, 8.0, 24)
            fillg(L, pix, c)
            hline(L, J, (-8, 2.6), (-3, -0.4), c[1], c[0]); hline(L, J, (8, 2.6), (3, -0.4), c[1], c[0])   # inner rim shadow
        elif v == 'N':
            fillg(L, Hpoly(J, outer + [(0, 19)]), c)
            hline(L, J, (0, -5), (0, 16), c[1], c[0])
        else:
            pix = Hpoly(J, [(-12, 15), (-12, 4), (-10, -1.6), (-5, -5), (2, -5.8), (7.6, -3.4), (10.6, 1.4), (4, 3.6), (1.4, 8), (1.4, 17.4), (-8, 17.4)])
            fillg(L, pix, c)
            hline(L, J, (6, 3.2), (1.8, 8.6), c[1], c[0])
    elif vis in ('ironcrown', 'jelcrown'):
        c = st if vis == 'ironcrown' else gd
        w = 9.6 if not side else 8.6
        pts = [(-w, 0.6), (-w, -6)]
        n = 5 if not side else 4
        for i in range(n):
            x0 = -w + i * (2 * w / n); pts += [(x0 + w / n, -3), (x0 + 2 * w / n, -6.4 if i < n - 1 else -6)]
        pts += [(w, 0.6)]
        fillg(L, Hpoly(J, pts), c, light=4 if vis == 'jelcrown' else 5, mid=3, dark=2)
        hline(L, J, (-w + 0.6, -1.4), (w - 0.6, -1.4), c[1], c[0])
        if v == 'S':
            gem = ramp('red') if vis == 'jelcrown' else ramp('violet')
            fillg(L, Hell(J, 0, -3, 1.6, 1.6), gem, light=3, mid=2, dark=1, edge=False); hdot(L, J, -1, -4, ramp('white')[2], gem[0])
            for x in (-6, 6): hdot(L, J, x, -2, ramp('sky')[2], ramp('sky')[0])
    elif vis in ('band_red', 'band_moon'):
        c = ramp('red') if vis == 'band_red' else ramp('blue')
        if v == 'S': fillg(L, Hpoly(J, [(-11.6, 2.2), (11.6, 2.2), (11.4, 4.6), (-11.4, 4.6)]), c, edge=False)
        elif v == 'N': fillg(L, Hpoly(J, [(-11.6, 2.4), (11.6, 2.4), (11.4, 5), (-11.4, 5)]), c, edge=False)
        else: fillg(L, Hpoly(J, [(-11.4, 2.6), (10.8, 1.6), (10.8, 4), (-11.4, 5)]), c, edge=False)
        hline(L, J, (-11, 2.4), (11, 2.4), c[3], c[0]) if not side else None
        if v == 'N': tails = [((-1, 4), (-3, 13)), ((1, 4), (3.4, 12))]
        elif side: tails = [((-11, 4), (-15, 11)), ((-11, 4), (-13.4, 12.6))]
        else: tails = [((10.6, 4), (13.6, 10))]
        for a, b in tails:
            fillg(L, Hpoly(J, [(a[0] - 0.9, a[1]), (a[0] + 0.9, a[1]), (b[0] + 0.9, b[1]), (b[0] - 0.9, b[1])]), c, edge=False)
        if vis == 'band_moon' and v == 'S':
            fillg(L, Hell(J, 0, 3.4, 2.0, 1.8), ramp('ivory'), light=3, mid=3, dark=2, edge=False); hdot(L, J, 0, 3, ramp('blue')[2], ramp('blue')[0])
    elif vis == 'mask_shadow':
        dk = [hexrgb('#1a1420'), st[0], st[1], st[2], st[3]]
        if v == 'S':
            fillg(L, Hpoly(J, [(-9.4, 12), (9.4, 12), (8.2, 15), (3, 16.8), (-3, 16.8), (-8.2, 15)]), dk, light=3, mid=2, dark=1)
            hline(L, J, (-8, 13.4), (8, 13.4), st[2], dk[0])
        elif side: fillg(L, Hpoly(J, [(2, 12), (9.6, 12), (9.2, 15), (4, 16.6), (2, 15.6)]), dk, light=3, mid=2, dark=1); hline(L, J, (-6, 10), (2, 12.2), st[1], dk[0])
        else: hline(L, J, (-10, 9.6), (10, 9.6), st[1], dk[0]); fillg(L, Hpoly(J, [(-1.4, 9), (1.4, 9), (2.6, 15), (-2.6, 15)]), dk, edge=False)
    elif vis == 'wizard':
        c = ramp('blue')
        fillg(L, Hell(J, 0 if not side else 1, 3.2, 15.5, 2.8 if not side else 1.8), c, light=4, mid=3, dark=2)
        tipx = 6 if v != 'N' else -6
        if side: tipx = -9
        fillg(L, Hpoly(J, [(-8.4, 2.6), (8.4, 2.6), (5, -6), (tipx * 0.6, -13), (tipx, -16.6), (tipx * 0.2 - 1, -11), (-5, -6)]), c, light=4, mid=3, dark=2)
        fillg(L, Hpoly(J, [(-8.2, 0.4), (8.2, 0.4), (8.4, 2.6), (-8.4, 2.6)]), gd, light=4, mid=3, dark=2, edge=False)
        if v == 'S':
            for x, y in ((-3, -4), (2, -8), (3, -2)): hdot(L, J, x, y, gd[4], c[0])

# ================================================================ draw order (per stored view; W = E mirrored)
ORDER = {
    'S': ['back', 'base', 'face', 'armor', 'class', 'costume', 'hair', 'weapon', 'shield', 'head'],
    'N': ['base', 'face', 'armor', 'class', 'costume', 'back', 'hair', 'weapon', 'shield', 'head'],
    'E': ['shield', 'back', 'base', 'face', 'armor', 'class', 'costume', 'hair', 'weapon', 'head'],
}
# the 10 visual layer slots of the character standard (aura is drawn by the engine, not a sheet)
SLOTS = ['base', 'hair', 'face', 'armor', 'weapon', 'shield', 'back', 'head', 'costume', 'aura']
