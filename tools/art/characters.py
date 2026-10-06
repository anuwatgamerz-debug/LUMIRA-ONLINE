"""LUMIRA layered characters.

One pose model drives every layer, so body, hair, armor, class gear, NPC outfits, weapons, shields and
headgear line up in every frame. Sheet layout (all layers identical): 64x64 frames, columns = frame index,
rows = animation x direction (N, W, S, E). W is E mirrored. Pivot (feet) at (32, 58).
"""
import math, json, os
import numpy as np
from lumira_art import Layer, ramp, rect, ellipse, poly, capsule, save_png, hexrgb

FW = 64
DIRS = ['N', 'W', 'S', 'E']
ANIMS = [  # name, frames, fps, loop
    ('idle', 4, 3, 1), ('walk', 8, 10, 1), ('attack', 5, 12, 0), ('cast', 4, 8, 0),
    ('hit', 2, 8, 0), ('death', 4, 6, 0), ('sit', 1, 1, 1), ('interact', 2, 5, 1),
]
COLS = max(a[1] for a in ANIMS)

def rot(p, c, deg):
    a = math.radians(deg); x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))

# ---------------------------------------------------------------- pose model
WEAPON_REST = {'sword': 110, 'greatsword': 112, 'dagger': 100, 'mace': 108, 'spear': -80, 'staff': -84, 'wand': -60, 'bow': -90, 'device': 20, None: 100}
def pose(view, anim, f, n, sex, wt=None):
    """joints in frame coords for one frame. view: N/S/E. Side view faces +x."""
    ph = f / max(1, n) * 2 * math.pi
    b = 0; tilt = 0; drop = 0; lean = 0
    side = view == 'E'
    fem = sex == 'female'
    J = {}
    if anim == 'idle': b = 1 if f >= 2 else 0
    if anim == 'walk': b = 1 if f % 4 == 0 else 0
    if anim == 'hit': lean = -2 if side else 0; b = 1
    head_top = 16 + b
    J['head'] = (32 + lean * 0.5, head_top)
    shw = 5.0 if fem else 5.5
    hipw = 3.2 if fem else 3.0
    if side:
        sh = [(31.5 + lean, 32 + b), (32.5 + lean, 32 + b)]       # far, near
        hips = [(31.5, 44 + b), (32.5, 44 + b)]
    else:
        sh = [(32 - shw, 32 + b), (32 + shw, 32 + b)]               # screen-left, screen-right
        hips = [(32 - hipw, 44 + b), (32 + hipw, 44 + b)]
    feet = [(hips[0][0], 57.5), (hips[1][0], 57.5)]
    knees = [(hips[0][0], 51 + b * 0.5), (hips[1][0], 51 + b * 0.5)]
    hands = [None, None]; elbows = [None, None]
    wa = WEAPON_REST.get(wt, 100)   # weapon angle (screen degrees, 0 = +x, 90 = down)
    if side and wt in ('sword', 'greatsword', 'dagger', 'mace'): wa = 60
    if side and wt == 'device': wa = 5
    # ---- walking
    if anim == 'walk':
        s = math.sin(ph)
        if side:
            for i, sg in ((0, -1), (1, 1)):
                a = math.radians(24 * s * sg)
                feet[i] = (hips[i][0] + math.sin(a) * 13, 57.5 - max(0, -math.cos(ph) * sg * 0) - (1.5 if s * sg > 0.3 else 0))
                knees[i] = ((hips[i][0] + feet[i][0]) / 2 + 1.2, 51 - (1 if s * sg > 0.3 else 0))
        else:
            for i, sg in ((0, 1), (1, -1)):
                lift = max(0, s * sg) * 2.2
                feet[i] = (feet[i][0], 57.5 - lift); knees[i] = (knees[i][0], 51 - lift * 0.6)
    # ---- arms (default hanging, swinging when walking)
    for i in (0, 1):
        sx, sy = sh[i]
        if side:
            sw = math.sin(ph) * (1 if i == 0 else -1) * (5 if anim == 'walk' else 0)
            elbows[i] = (sx + sw * 0.4, sy + 6); hands[i] = (sx + sw, sy + 11)
        else:
            out = -1 if i == 0 else 1
            sw = math.sin(ph) * (1 if i == 0 else -1) * (1.6 if anim == 'walk' else 0)
            elbows[i] = (sx + out * 1.2, sy + 6); hands[i] = (sx + out * 1.0, sy + 11 + sw)
    # weapon hand: S -> screen-left (0), N -> screen-right (1), side -> near (1)
    wh = 1 if view in ('N', 'E') else 0
    oh = 1 - wh
    if anim == 'attack':
        if side:
            seq = [((-3, -6), -150), ((-1, -10), -95), ((7, -2), -15), ((6, 3), 40), ((4, 4), 70)]
            (dx, dy), wa = seq[f]; sx, sy = sh[1]; hands[1] = (sx + dx, sy + dy + 6); elbows[1] = (sx + dx * 0.4, sy + 3 + dy * 0.3)
            lean = [-1, -1, 2, 2, 1][f]
        else:
            sg = -1 if wh == 0 else 1
            seq = [((1, -7), -100), ((2, -10), -70), ((0, 3), 95), ((-1, 6), 120), ((0, 5), 110)]
            (dx, dy), a = seq[f]; sx, sy = sh[wh]; hands[wh] = (sx + sg * dx, sy + 10 + dy); elbows[wh] = (sx + sg * (dx * 0.5 + 1), sy + 4 + dy * 0.4)
            wa = a if sg > 0 else 180 - a
            if wt in ('bow',): wa = -90
    elif anim == 'cast':
        up = [0, 3, 5, 4][f]
        for i in (0, 1):
            sx, sy = sh[i]
            if side: hands[i] = (sx + 5 + i, sy + 6 - up); elbows[i] = (sx + 3, sy + 4 - up * 0.4)
            else: out = -1 if i == 0 else 1; hands[i] = (sx + out * 0.5, sy + 8 - up); elbows[i] = (sx + out * 2, sy + 5 - up * 0.3)
        if wt in ('staff', 'wand', 'bow', 'spear'): wa = -80 if view != 'E' else -70
    elif anim == 'hit':
        for i in (0, 1):
            sx, sy = sh[i]; out = (-1 if i == 0 else 1) if not side else -1
            hands[i] = (sx + out * 3, sy + 8); elbows[i] = (sx + out * 2, sy + 4)
    elif anim == 'interact':
        i = wh if side else oh; sx, sy = sh[i]
        reach = [3, 5][f]
        hands[i] = (sx + (reach if side else 0), sy + (6 if side else 6 - reach * 0.6)); elbows[i] = (sx + reach * 0.4, sy + 4)
    elif anim == 'sit':
        drop = 6
        for i in (0, 1):
            hips[i] = (hips[i][0], hips[i][1] + 6)
            if side: knees[i] = (hips[i][0] + 7, hips[i][1] - 1); feet[i] = (hips[i][0] + 8, 57.5)
            else: knees[i] = (hips[i][0] + (-2 if i == 0 else 2), hips[i][1] + 4); feet[i] = (knees[i][0], 57.5)
        J['head'] = (J['head'][0], J['head'][1] + 6); sh = [(x, y + 6) for x, y in sh]
        hands = [(x, y + 6) for x, y in hands]; elbows = [(x, y + 6) for x, y in elbows]
    elif anim == 'death':
        tilt = [0, 35, 80, 90][f]; drop = [3, 6, 10, 11][f]
        if f == 0:  # kneel
            for i in (0, 1): hips[i] = (hips[i][0], hips[i][1] + 4); knees[i] = (knees[i][0] + (2 if side else 0), 54)
            J['head'] = (J['head'][0], J['head'][1] + 4); sh = [(x, y + 4) for x, y in sh]; hands = [(x, y + 4) for x, y in hands]; elbows = [(x, y + 4) for x, y in elbows]
            tilt = 0; drop = 0
    if lean and anim != 'attack':
        J['head'] = (J['head'][0] + lean, J['head'][1])
    elif anim == 'attack' and side:
        J['head'] = (J['head'][0] + lean * 0.5, J['head'][1]); sh = [(x + lean * 0.5, y) for x, y in sh]
    J.update(sh=sh, hips=hips, knees=knees, feet=feet, elbows=elbows, hands=hands, wa=wa, wh=wh, oh=oh)
    # whole-body rotation for falling (around the hips) + drop toward the ground
    piv = (32, 44)
    def T(p):
        q = rot(p, piv, tilt) if tilt else p
        return (q[0], q[1] + drop if tilt else q[1])
    J['T'] = T; J['tilt'] = tilt; J['view'] = view; J['side'] = side; J['anim'] = anim; J['f'] = f; J['sex'] = sex
    J['wa'] = wa + (tilt if tilt else 0)
    return J

def H(J, lx, ly):
    """head-local coords (origin = top centre of the head; +x = facing side in side view) -> frame"""
    hx, hy = J['head']
    return J['T']((hx + lx, hy + ly))

def Tpts(J, pts): return [J['T'](p) for p in pts]
def Hpoly(J, pts): return poly([H(J, x, y) for x, y in pts])
def Hrect(J, x0, y0, w, h): return Hpoly(J, [(x0, y0), (x0 + w, y0), (x0 + w, y0 + h), (x0, y0 + h)])
def Hell(J, cx, cy, rx, ry):
    pts = [(cx + rx * math.cos(a), cy + ry * math.sin(a)) for a in [i / 16 * 2 * math.pi for i in range(16)]]
    return Hpoly(J, pts)
def limb(J, a, b, w): return capsule(J['T'](a), J['T'](b), w)
def quad(J, pts): return poly(Tpts(J, pts))

# ---------------------------------------------------------------- base body (skin, face, underclothes, boots)
def draw_base(L, J):
    view, side, fem = J['view'], J['side'], J['sex'] == 'female'
    skin, pants, boots, shirt = ramp('skin'), ramp('brown'), ramp('brown'), ramp('cream')
    pants_r = [pants[1], pants[1], pants[2], pants[3]]
    sh, hips, knees, feet, el, ha = J['sh'], J['hips'], J['knees'], J['feet'], J['elbows'], J['hands']
    order = [0, 1] if not side else [0, 1]
    # far limbs first in side view
    def leg(i):
        L.fill(limb(J, hips[i], knees[i], 4.2), pants_r)
        L.fill(limb(J, knees[i], (feet[i][0], feet[i][1] - 2.5), 4.0), pants_r)
        bx = 1.2 if side else 0
        L.fill(Tset(J, ellipse(feet[i][0] + bx, feet[i][1] - 1.6, 2.6 if side else 2.3, 1.9)), [boots[0], boots[1], boots[2], boots[3]])
    def arm(i):
        L.fill(limb(J, sh[i], el[i], 3.4), shirt[0:1] + shirt[1:4])
        L.fill(limb(J, el[i], ha[i], 3.0), skin)
        L.fill(set(ellipse(*J['T'](ha[i]), 1.7, 1.7)), skin)
    if side: arm(0); leg(0)
    leg(0) if not side else None
    leg(1)
    # torso (undershirt)
    if side:
        tor = [(sh[0][0] - 3.5, sh[0][1] - 0.5), (sh[1][0] + 3.2, sh[1][1] - 0.5), (hips[1][0] + 2.6, hips[1][1] + 1), (hips[0][0] - 3, hips[0][1] + 1)]
    else:
        w0 = 0.6 if fem else 0
        tor = [(sh[0][0], sh[0][1] - 0.5), (sh[1][0], sh[1][1] - 0.5), (hips[1][0] + 1.4 + w0, hips[1][1] + 1), (hips[0][0] - 1.4 - w0, hips[0][1] + 1)]
    L.fill(quad(J, tor), shirt)
    if fem and view == 'S': pass
    # neck + head
    L.fill(limb(J, (J['head'][0], J['head'][1] + 12), (J['head'][0], sh[0][1]), 3.4), skin)
    L.fill(Hell(J, 0, 7, 6.2, 7.2), skin)
    if view == 'S':
        L.put(Hrect(J, -6.6, 7, 1, 2), hexrgb('#c08560'))
        L.put(Hrect(J, 5.6, 7, 1, 2), hexrgb('#c08560'))
        for ex in (-3.5, 2.5):  # eyes: dark iris, small highlight
            L.put(Hrect(J, ex, 8, 1.6, 2.4), hexrgb('#1a1420'), hexrgb('#1a1420'))
            L.put(Hrect(J, ex + 0.9, 8.1, 0.8, 0.9), hexrgb('#ffffff'), hexrgb('#1a1420'))
        L.put(Hrect(J, -0.8, 11.6, 1.6, 0.8), hexrgb('#8c5639'))
        if fem: L.put(Hrect(J, -4.4, 7.4, 1, 0.8), hexrgb('#1a1420')); L.put(Hrect(J, 4.2, 7.4, 1, 0.8), hexrgb('#1a1420'))
    elif side:
        L.put(Hrect(J, 2.8, 8, 1.6, 2.4), hexrgb('#1a1420'), hexrgb('#1a1420'))
        L.put(Hrect(J, 3.7, 8.1, 0.7, 0.9), hexrgb('#ffffff'), hexrgb('#1a1420'))
        L.fill(Hrect(J, 5.8, 9.5, 1.2, 1.4), skin)
        L.put(Hrect(J, -1.5, 7, 1.4, 2), hexrgb('#c08560'))
    if side: arm(1)
    else: arm(0); arm(1)

def Tset(J, pix):
    """move a pixel set drawn in upright frame coords through the body transform"""
    if not J['tilt']: return pix
    return {(round(q[0]), round(q[1])) for q in (J['T']((x + 0.5, y + 0.5)) for x, y in pix)}

# ---------------------------------------------------------------- hair (key ramp, recoloured in game)
HAIR_STYLES = ['short', 'spiky', 'ponytail', 'long', 'twin', 'bun']
def draw_hair(L, J, style):
    v, hr = J['view'], ramp('hair')
    side = J['side']
    cap = [(-7, 5), (-7, 1.5), (-6, -0.4), (-3.5, -1.8), (3.5, -1.8), (6, -0.4), (7, 1.5), (7, 5)]
    if v == 'N':
        L.fill(Hpoly(J, [(-7, 2), (-6, -0.4), (-3.5, -1.8), (3.5, -1.8), (6, -0.4), (7, 2), (7, 10), (5.5, 12.4), (2, 13), (-2, 13), (-5.5, 12.4), (-7, 10)]), hr)
        for x in (-3, 0.5, 3.6): L.put(Hrect(J, x, 4 + (x > 0) * 2, 0.8, 4), hexrgb('#4a2c1c'), hexrgb('#2a1a14'))
    elif side:
        L.fill(Hpoly(J, [(-7, 2), (-5, -1.2), (2, -2), (6, -0.5), (7.2, 3), (4, 4), (0, 5), (-2, 8), (-4, 12), (-7, 11)]), hr)
    else:
        L.fill(Hpoly(J, cap + [(6.5, 8), (5.5, 7), (4, 4.6), (1, 5.2), (-1, 4.2), (-3, 5.2), (-5, 4.4), (-5.5, 7), (-6.5, 8)][::1]), hr)
    if style == 'spiky':
        for sx, h in ((-5, 3), (-2, 4.5), (1, 5), (4, 4)):
            L.fill(Hpoly(J, [(sx - 1.6, 0), (sx + 0.4, -h - 1), (sx + 1.8, 0)]), hr)
    elif style == 'ponytail':
        if v == 'N': L.fill(Hpoly(J, [(-1.6, 10), (1.6, 10), (2, 22), (-2, 22)]), hr)
        elif side: L.fill(Hpoly(J, [(-7, 4), (-9.5, 6), (-10, 15), (-8, 17), (-7.4, 8)]), hr)
        else: L.fill(Hpoly(J, [(6.5, 5), (8.2, 6), (8.5, 12), (7, 13)]), hr)
    elif style == 'long':
        if v == 'N': L.fill(Hpoly(J, [(-7, 8), (7, 8), (7.5, 22), (-7.5, 22)]), hr)
        elif side: L.fill(Hpoly(J, [(-7.2, 4), (-2, 6), (-1, 20), (-7.6, 21)]), hr)
        else:
            L.fill(Hpoly(J, [(-7, 5), (-5.2, 6), (-5, 19), (-7.6, 20)]), hr)
            L.fill(Hpoly(J, [(7, 5), (5.2, 6), (5, 19), (7.6, 20)]), hr)
    elif style == 'twin':
        for s in ((-1, 1) if not side else (-1,)):
            x = 8.2 * s if not side else -8.5
            L.fill(Hpoly(J, [(x - 1.8, 3), (x + 1.8, 3), (x + 1.4, 15), (x, 17), (x - 1.4, 15)]), hr)
            L.put(Hrect(J, x - 1.3, 2.8, 2.6, 1.1), hexrgb('#b02d33'), hexrgb('#4a1016'))
    elif style == 'bun':
        bx = 0 if not side else -4
        L.fill(Hell(J, bx, -2 if v != 'N' else 2, 3.4, 3), hr)

# ---------------------------------------------------------------- armor / outfits (torso + sleeves + skirt pieces)
def torso_pts(J, grow=0.0, top=0.0, bottom=1.0):
    sh, hips = J['sh'], J['hips']
    if J['side']:
        return [(sh[0][0] - 3.8 - grow, sh[0][1] - 1 + top), (sh[1][0] + 3.5 + grow, sh[1][1] - 1 + top), (hips[1][0] + 3 + grow, hips[1][1] + bottom), (hips[0][0] - 3.4 - grow, hips[0][1] + bottom)]
    return [(sh[0][0] - grow, sh[0][1] - 1 + top), (sh[1][0] + grow, sh[1][1] - 1 + top), (hips[1][0] + 1.8 + grow, hips[1][1] + bottom), (hips[0][0] - 1.8 - grow, hips[0][1] + bottom)]
def skirt_pts(J, length, flare=1.0):
    hips = J['hips']
    if J['side']:
        x0, x1, y = hips[0][0] - 3.4, hips[1][0] + 3, hips[0][1]
        return [(x0, y), (x1, y), (x1 + flare, y + length), (x0 - flare, y + length)]
    x0, x1, y = hips[0][0] - 1.8, hips[1][0] + 1.8, hips[0][1]
    return [(x0, y), (x1, y), (x1 + flare, y + length), (x0 - flare, y + length)]
def sleeves(L, J, rp, w=3.8, full=False):
    for i in (0, 1):
        L.fill(limb(J, J['sh'][i], J['elbows'][i], w), rp)
        if full: L.fill(limb(J, J['elbows'][i], J['hands'][i], w - 0.6), rp)
def belt(L, J, rp, y=0, buckle='gold'):
    hips = J['hips']
    pts = torso_pts(J, 0.3, 0, 1)
    yy = hips[0][1] - 1 + y
    if J['side']: band = quad(J, [(pts[3][0], yy), (pts[2][0], yy), (pts[2][0], yy + 1.8), (pts[3][0], yy + 1.8)])
    else: band = quad(J, [(pts[3][0] + 0.4, yy), (pts[2][0] - 0.4, yy), (pts[2][0] - 0.4, yy + 1.8), (pts[3][0] + 0.4, yy + 1.8)])
    L.fill(band, rp, shade=False)
    if J['view'] == 'S' and buckle: L.fill(quad(J, [(31, yy - 0.2), (33, yy - 0.2), (33, yy + 2), (31, yy + 2)]), ramp(buckle), shade=False, mid=3)

TUNIC_COLORS = ['blue', 'brown', 'green', 'red', 'violet']
def draw_armor(L, J, kind, color='blue'):
    v, side = J['view'], J['side']
    if kind == 'tunic':
        c = ramp(color)
        L.fill(quad(J, torso_pts(J, 0.6)), c); L.fill(quad(J, skirt_pts(J, 5, 1)), c)
        sleeves(L, J, c, 3.9)
        if v == 'S': L.fill(quad(J, [(30.5, J['sh'][0][1] - 0.5), (33.5, J['sh'][0][1] - 0.5), (32, J['sh'][0][1] + 3.5)]), ramp('cream'), shade=False, mid=3)
        belt(L, J, ramp('brown'), 0, 'gold')
    elif kind == 'leather':
        c = ramp('brown')
        L.fill(quad(J, torso_pts(J, 0.7)), c); L.fill(quad(J, skirt_pts(J, 4, 0.6)), [c[0], c[1], c[2], c[3]])
        sleeves(L, J, ramp('cream'), 3.8)
        for i in (0, 1): L.fill(Tset(J, ellipse(J['sh'][i][0], J['sh'][i][1] + 0.5, 2.6, 2.0)), c)
        if v == 'S':
            for yy in (35, 38): L.put(quad(J, [(29, J['sh'][0][1] + yy - 32), (35, J['sh'][0][1] + yy - 32), (35, J['sh'][0][1] + yy - 31.4), (29, J['sh'][0][1] + yy - 31.4)]), ramp('brown')[1])
        belt(L, J, ramp('brown'), 0, 'gold')
    elif kind == 'chain':
        c = ramp('stone')
        L.fill(quad(J, torso_pts(J, 0.8)), c); L.fill(quad(J, skirt_pts(J, 6, 1.2)), c); sleeves(L, J, c, 4.0, True)
        for (x, y) in list(L.px):  # mail rings: dither the mid tone
            if L.px[(x, y)] == c[2] and (x + y) % 2 == 0: L.px[(x, y)] = c[3]
        belt(L, J, ramp('brown'), 0, 'stone')
    elif kind == 'plate':
        c = ramp('stone')
        L.fill(quad(J, torso_pts(J, 1.0)), c); L.fill(quad(J, skirt_pts(J, 5, 1.4)), c); sleeves(L, J, c, 4.2, True)
        for i in (0, 1): L.fill(Tset(J, ellipse(J['sh'][i][0] + (0 if side else (-1 if i == 0 else 1)), J['sh'][i][1], 3.4, 2.6)), c, light=5, mid=4, darkc=2)
        for i in (0, 1): L.fill(limb(J, J['knees'][i], (J['feet'][i][0], J['feet'][i][1] - 3), 4.4), c, light=4, mid=3)
        if v == 'S': L.fill(quad(J, [(31.4, J['sh'][0][1]), (32.6, J['sh'][0][1]), (32.6, J['hips'][0][1]), (31.4, J['hips'][0][1])]), c, shade=False, mid=5)
        belt(L, J, ramp('brown'), 0, 'gold')
    elif kind == 'robe':
        c = ramp(color if color in ('blue', 'violet', 'ivory', 'green', 'red', 'brown', 'cream') else 'blue')
        L.fill(quad(J, torso_pts(J, 0.8)), c); L.fill(quad(J, skirt_pts(J, 12.5, 2.4)), c); sleeves(L, J, c, 4.4, True)
        for i in (0, 1): L.fill(Tset(J, ellipse(*J['hands'][i], 1.7, 1.7)), ramp('skin'))
        belt(L, J, ramp('gold') if color != 'ivory' else ramp('sky'), 0, None)

# ---------------------------------------------------------------- class identity layers (front) + back items
def draw_class(L, J, cls):
    v, side, sh, hips = J['view'], J['side'], J['sh'], J['hips']
    y0, y1 = sh[0][1], hips[0][1]
    if cls == 'adventurer':
        # small satchel on the hip + strap
        if v == 'S': L.fill(limb(J, (sh[1][0] - 1, y0), (hips[0][0] - 1, y1 - 1), 1.4), ramp('brown'), shade=False, mid=2); L.fill(quad(J, [(hips[0][0] - 3.5, y1 - 2), (hips[0][0] + 0.5, y1 - 2), (hips[0][0] + 0.5, y1 + 2), (hips[0][0] - 3.5, y1 + 2)]), ramp('brown'))
        elif side: L.fill(quad(J, [(hips[0][0] - 4.5, y1 - 2), (hips[0][0] - 1, y1 - 2), (hips[0][0] - 1, y1 + 2.5), (hips[0][0] - 4.5, y1 + 2.5)]), ramp('brown'))
        else: L.fill(limb(J, (sh[0][0] + 1, y0), (hips[1][0] + 1, y1 - 1), 1.4), ramp('brown'), shade=False, mid=2)
    elif cls == 'vanguard':
        if v == 'S' or v == 'N':
            L.fill(quad(J, [(29.5, y0 + 1), (34.5, y0 + 1), (35, y1 + 5), (29, y1 + 5)]), ramp('blue'))
            if v == 'S': L.fill(quad(J, [(31.3, y0 + 4), (32.7, y0 + 4), (32.7, y0 + 8), (31.3, y0 + 8)]), ramp('gold'), shade=False, mid=3); L.fill(quad(J, [(30, y0 + 5.3), (34, y0 + 5.3), (34, y0 + 6.5), (30, y0 + 6.5)]), ramp('gold'), shade=False, mid=3)
        else: L.fill(quad(J, [(sh[1][0] - 1, y0 + 1), (sh[1][0] + 3.6, y0 + 1), (hips[1][0] + 3.6, y1 + 5), (hips[1][0] - 1, y1 + 5)]), ramp('blue'))
        for i in ((0, 1) if not side else (1,)):
            L.fill(Tset(J, ellipse(sh[i][0] + (0 if side else (-1 if i == 0 else 1)), sh[i][1], 3.2, 2.4)), ramp('stone'), light=5, mid=4, darkc=2)
            L.put(Tset(J, rect(sh[i][0] - 2, sh[i][1] + 1, 4, 1)), hexrgb('#b98c2c'), hexrgb('#5e4310'))
    elif cls == 'ranger':
        g = ramp('green')
        if v == 'S': L.fill(quad(J, [(sh[0][0] - 1, y0 - 1), (sh[1][0] + 1, y0 - 1), (sh[1][0], y0 + 4), (32, y0 + 6), (sh[0][0], y0 + 4)]), g)
        elif side: L.fill(quad(J, [(sh[0][0] - 4, y0 - 1), (sh[1][0] + 2, y0 - 1), (sh[1][0] + 1, y0 + 4), (sh[0][0] - 4, y0 + 7)]), g)
        belt(L, J, ramp('brown'), 0, 'gold')
        if v == 'S': L.fill(limb(J, (sh[0][0] + 1, y0), (hips[1][0], y1 - 1), 1.4), ramp('brown'), shade=False, mid=3)
    elif cls == 'arcanist':
        vi, sk = ramp('violet'), ramp('sky')
        if v == 'S':
            L.fill(quad(J, [(29, y1 - 2.5), (35, y1 - 2.5), (35, y1 + 0.5), (29, y1 + 0.5)]), vi, shade=False, mid=2)
            L.fill(quad(J, [(30.6, y1 + 0.5), (32.4, y1 + 0.5), (32, y1 + 8), (30.2, y1 + 8)]), vi)
            L.put(quad(J, [(31.4, y0 + 2), (32.6, y0 + 2), (32.6, y0 + 4), (31.4, y0 + 4)]), hexrgb('#74c2f2'), hexrgb('#1f4f8c'))
            L.put(quad(J, [(31.8, y0 + 2.2), (32.2, y0 + 2.2), (32.2, y0 + 2.8), (31.8, y0 + 2.8)]), hexrgb('#c4ecff'), hexrgb('#1f4f8c'))
            for yy in (y1 - 2, y1 - 1): L.put(quad(J, [(29.5 + (yy % 2), yy), (30.3 + (yy % 2), yy), (30.3 + (yy % 2), yy + 0.6), (29.5 + (yy % 2), yy + 0.6)]), sk[2])
        elif side: L.fill(quad(J, [(hips[0][0] - 3.4, y1 - 2.5), (hips[1][0] + 3, y1 - 2.5), (hips[1][0] + 3, y1 + 0.5), (hips[0][0] - 3.4, y1 + 0.5)]), vi, shade=False, mid=2)
        else: L.fill(quad(J, [(29, y1 - 2.5), (35, y1 - 2.5), (35, y1 + 0.5), (29, y1 + 0.5)]), vi, shade=False, mid=2)
        L.fill(quad(J, skirt_pts(J, 12, 2.2) if v != 'S' else [(J['hips'][0][0] - 2.5, y1 + 1), (J['hips'][0][0] - 0.8, y1 + 1), (J['hips'][0][0] - 1.2, y1 + 12), (J['hips'][0][0] - 3.6, y1 + 12)]), ramp('blue'))
        if v == 'S': L.fill(quad(J, [(J['hips'][1][0] + 0.8, y1 + 1), (J['hips'][1][0] + 2.5, y1 + 1), (J['hips'][1][0] + 3.6, y1 + 12), (J['hips'][1][0] + 1.2, y1 + 12)]), ramp('blue'))
    elif cls == 'cleric':
        iv, gd = ramp('ivory'), ramp('gold')
        if v == 'S':
            L.fill(quad(J, [(sh[0][0], y0 - 1), (sh[1][0], y0 - 1), (sh[1][0] - 0.5, y0 + 3), (sh[0][0] + 0.5, y0 + 3)]), iv)
            for x in (29.4, 33.4): L.fill(quad(J, [(x, y0 + 2), (x + 1.4, y0 + 2), (x + 1.4, y1 + 6), (x, y1 + 6)]), iv, shade=False, mid=3)
            L.fill(quad(J, [(31.2, y0 + 3), (32.8, y0 + 3), (32.8, y0 + 7), (31.2, y0 + 7)]), gd, shade=False, mid=4)
            L.fill(quad(J, [(30.4, y0 + 4.3), (33.6, y0 + 4.3), (33.6, y0 + 5.5), (30.4, y0 + 5.5)]), gd, shade=False, mid=4)
        elif side: L.fill(quad(J, [(sh[0][0] - 3.6, y0 - 1), (sh[1][0] + 3, y0 - 1), (sh[1][0] + 2.6, y0 + 3), (sh[0][0] - 3.6, y0 + 3)]), iv)
        else: L.fill(quad(J, [(sh[0][0], y0 - 1), (sh[1][0], y0 - 1), (sh[1][0], y0 + 5), (sh[0][0], y0 + 5)]), iv)
    elif cls == 'rogue':
        p = ramp('violet')
        if v == 'S': L.fill(quad(J, [(sh[0][0] - 1.4, y0 - 1), (sh[1][0] + 1.4, y0 - 1), (sh[1][0] + 0.6, y0 + 3), (sh[0][0] - 0.6, y0 + 3)]), p)
        elif side: L.fill(quad(J, [(sh[0][0] - 4.4, y0 - 1), (sh[1][0] + 2, y0 - 1), (sh[1][0] + 1, y0 + 3), (sh[0][0] - 5, y0 + 8)]), p)
        belt(L, J, ramp('brown'), 0, 'stone')
        if v != 'N':
            for dx in ((-3.5, 2.5) if v == 'S' else (2.4,)):
                L.fill(quad(J, [(32 + dx, y1), (34 + dx, y1), (34 + dx, y1 + 2.6), (32 + dx, y1 + 2.6)]), ramp('brown'))
    elif cls == 'artisan':
        ap = ramp('brown')
        if v == 'S':
            L.fill(quad(J, [(29.6, y0 + 2), (34.4, y0 + 2), (35.4, y1 + 6), (28.6, y1 + 6)]), [ap[0], ap[2], ap[3], ap[4]])
            L.fill(limb(J, (29.8, y0 + 2), (sh[0][0] + 1, y0 - 0.5), 1), ap, shade=False, mid=2); L.fill(limb(J, (34.2, y0 + 2), (sh[1][0] - 1, y0 - 0.5), 1), ap, shade=False, mid=2)
            for dx, c in ((-4, 'copper'), (3, 'teal')): L.fill(quad(J, [(32 + dx, y1 - 1), (33.4 + dx, y1 - 1), (33.4 + dx, y1 + 3), (32 + dx, y1 + 3)]), ramp(c))
        elif side: L.fill(quad(J, [(sh[1][0] + 1.5, y0 + 2), (sh[1][0] + 3.6, y0 + 2), (hips[1][0] + 4.2, y1 + 6), (hips[1][0] + 1.6, y1 + 6)]), [ap[0], ap[2], ap[3], ap[4]])
        belt(L, J, ramp('copper'), 0, None)
        # goggles on the forehead
        g = Hrect(J, -6.4, 3.0, 12.8, 1.6) if not side else Hrect(J, -4, 3.0, 11, 1.6)
        L.fill(g, ramp('brown'), shade=False, mid=2)
        if v == 'S':
            for gx in (-4.4, 1.4): L.fill(Hell(J, gx + 1.5, 3.8, 1.8, 1.6), ramp('teal'), light=3, mid=3)
        elif side: L.fill(Hell(J, 4, 3.8, 1.8, 1.6), ramp('teal'), light=3, mid=3)

def draw_back(L, J, cls):
    """back items: quiver (ranger), cape (vanguard master / knight line), small pack (adventurer)"""
    v, side, sh, hips = J['view'], J['side'], J['sh'], J['hips']
    if cls == 'ranger':
        q = ramp('brown')
        base = (sh[0][0] + 2, sh[0][1] - 4) if v == 'N' else (sh[1][0] - 1, sh[1][1] - 4) if v == 'S' else (sh[0][0] - 3.5, sh[0][1] - 4)
        tip = (base[0] + (3 if v != 'E' else -3), base[1] + 13)
        L.fill(limb(J, base, tip, 3.6), q)
        for k in range(3): L.put(Tset(J, rect(base[0] - 1 + k * 1.2, base[1] - 2.5, 1, 2)), hexrgb('#f2eee2'), hexrgb('#7a7462'))
    elif cls in ('vanguard_master', 'knight', 'cape_blue', 'cape_red', 'cape_gold', 'cape_violet'):
        c = ramp({'cape_red': 'red', 'cape_gold': 'gold', 'cape_violet': 'violet'}.get(cls, 'blue'))
        y0, y1 = sh[0][1], hips[0][1]
        if v == 'N': L.fill(quad(J, [(sh[0][0] - 0.5, y0 - 0.5), (sh[1][0] + 0.5, y0 - 0.5), (sh[1][0] + 2.5, y1 + 11), (sh[0][0] - 2.5, y1 + 11)]), c)
        elif side: L.fill(quad(J, [(sh[0][0] - 3.6, y0 - 0.5), (sh[0][0] - 1, y0), (sh[0][0] - 3, y1 + 11), (sh[0][0] - 7, y1 + 10)]), c)
        else:
            L.fill(quad(J, [(sh[0][0] - 1.2, y0), (sh[0][0] + 0.4, y0), (sh[0][0] - 1.6, y1 + 11), (sh[0][0] - 3.4, y1 + 10)]), c)
            L.fill(quad(J, [(sh[1][0] - 0.4, y0), (sh[1][0] + 1.2, y0), (sh[1][0] + 3.4, y1 + 10), (sh[1][0] + 1.6, y1 + 11)]), c)
    elif cls == 'adventurer' and v == 'N':
        L.fill(quad(J, [(29, sh[0][1] + 1), (35, sh[0][1] + 1), (35, sh[0][1] + 7), (29, sh[0][1] + 7)]), ramp('brown'))
        L.put(Tset(J, rect(29, sh[0][1] + 2, 6, 1)), hexrgb('#4a2f1e'), hexrgb('#2e1c14'))

# ---------------------------------------------------------------- NPC outfits (replace armor for NPCs)
NPC_OUTFITS = ['merchant', 'blacksmith', 'healer', 'innkeeper', 'guard', 'farmer', 'citizen', 'elder', 'scholar', 'mage', 'storage', 'noble', 'bard', 'traveler', 'miner']
def draw_outfit(L, J, role):
    v = J['view']
    if role == 'merchant':
        draw_armor(L, J, 'tunic', 'red'); vest = ramp('gold')
        L.fill(quad(J, torso_pts(J, 0.9, 0.5, -1)) - (quad(J, [(30.8, 30), (33.2, 30), (33.2, 50), (30.8, 50)]) if v == 'S' else set()), [vest[0], vest[1], vest[2], vest[3]])
        if v != 'N': L.fill(Tset(J, ellipse(J['hips'][1][0] + (1.5 if v == 'S' else 2.5), J['hips'][1][1] + 1.5, 1.9, 2.1)), ramp('brown'))
    elif role == 'blacksmith':
        draw_armor(L, J, 'tunic', 'brown'); ap = ramp('stone')
        if v == 'S': L.fill(quad(J, [(29.6, J['sh'][0][1] + 1.5), (34.4, J['sh'][0][1] + 1.5), (35.4, J['hips'][0][1] + 6), (28.6, J['hips'][0][1] + 6)]), ap)
        elif J['side']: L.fill(quad(J, [(J['sh'][1][0] + 1.6, J['sh'][1][1] + 1.5), (J['sh'][1][0] + 3.8, J['sh'][1][1] + 1.5), (J['hips'][1][0] + 4.2, J['hips'][1][1] + 6), (J['hips'][1][0] + 1.6, J['hips'][1][1] + 6)]), ap)
        for i in (0, 1): L.fill(Tset(J, ellipse(*J['hands'][i], 2.1, 2.1)), ramp('brown'))
    elif role == 'healer':
        draw_armor(L, J, 'robe', 'ivory')
        if v == 'S': L.fill(quad(J, [(30.8, J['sh'][0][1] + 1), (33.2, J['sh'][0][1] + 1), (33.2, J['hips'][0][1] + 12), (30.8, J['hips'][0][1] + 12)]), ramp('green'))
        if v != 'N': L.fill(Tset(J, ellipse(J['hips'][0][0] - 1.8, J['hips'][0][1] + 1, 2, 2.2)), ramp('green'))
    elif role == 'innkeeper':
        draw_armor(L, J, 'tunic', 'green')
        if v == 'S': L.fill(quad(J, [(29.4, J['hips'][0][1] - 3), (34.6, J['hips'][0][1] - 3), (35.4, J['hips'][0][1] + 5), (28.6, J['hips'][0][1] + 5)]), ramp('cream'))
    elif role == 'guard':
        draw_armor(L, J, 'chain'); draw_class(L, J, 'vanguard')
    elif role == 'farmer':
        draw_armor(L, J, 'tunic', 'green')
        if v == 'S':
            for x in (29.6, 33.4): L.fill(limb(J, (x, J['sh'][0][1]), (x, J['hips'][0][1] + 1), 1.2), ramp('brown'), shade=False, mid=2)
    elif role == 'citizen': draw_armor(L, J, 'tunic', 'brown')
    elif role == 'elder': draw_armor(L, J, 'robe', 'brown')
    elif role == 'scholar':
        draw_armor(L, J, 'robe', 'blue')
        if v != 'N': L.fill(Tset(J, rect(J['hands'][0][0] - 2, J['hands'][0][1] - 3, 4, 4)), ramp('red'))
    elif role == 'mage': draw_armor(L, J, 'robe', 'violet'); draw_class(L, J, 'arcanist')
    elif role == 'storage':
        draw_armor(L, J, 'tunic', 'blue')
        if v != 'N': L.put(Tset(J, rect(J['hips'][1][0] + 1, J['hips'][1][1], 2, 3)), hexrgb('#e0b84e'), hexrgb('#5e4310'))
    elif role == 'noble':
        draw_armor(L, J, 'tunic', 'blue'); draw_class(L, J, 'cleric') if False else None
        if v == 'S': L.fill(quad(J, [(29, J['sh'][0][1] - 1), (35, J['sh'][0][1] - 1), (34, J['sh'][0][1] + 2), (30, J['sh'][0][1] + 2)]), ramp('gold'))
    elif role == 'bard': draw_armor(L, J, 'tunic', 'red'); draw_class(L, J, 'adventurer')
    elif role == 'traveler': draw_armor(L, J, 'leather'); draw_class(L, J, 'ranger')
    elif role == 'miner': draw_armor(L, J, 'tunic', 'brown'); draw_class(L, J, 'artisan') if False else None

# ---------------------------------------------------------------- weapons (drawn from the weapon hand along the pose angle)
WEAPONS = ['sword', 'greatsword', 'dagger', 'bow', 'staff', 'wand', 'mace', 'spear', 'device', 'axe', 'pickaxe']
def along(J, hand, ang, t0, t1, w):
    a = math.radians(ang); hx, hy = J['T'](hand)
    return capsule((hx + math.cos(a) * t0, hy + math.sin(a) * t0), (hx + math.cos(a) * t1, hy + math.sin(a) * t1), w)
def across(J, hand, ang, t, half, w):
    a = math.radians(ang); hx, hy = J['T'](hand); cx, cy = hx + math.cos(a) * t, hy + math.sin(a) * t
    nx, ny = -math.sin(a), math.cos(a)
    return capsule((cx + nx * half, cy + ny * half), (cx - nx * half, cy - ny * half), w)
def draw_weapon(L, J, wt):
    hand, a = J['hands'][J['wh']], J['wa']
    st, br, gd = ramp('stone'), ramp('brown'), ramp('gold')
    blade = [st[1], st[2], st[4], st[5]]
    if wt == 'sword':
        L.fill(along(J, hand, a, -3, 1, 2), br); L.fill(across(J, hand, a, 1.6, 3, 1.6), gd, shade=False, mid=3); L.fill(along(J, hand, a, 2.5, 15, 2.6), blade)
    elif wt == 'greatsword':
        L.fill(along(J, hand, a, -5, 1, 2), br); L.fill(across(J, hand, a, 1.8, 4.2, 2), gd, shade=False, mid=3); L.fill(along(J, hand, a, 3, 21, 3.6), blade)
    elif wt == 'dagger':
        L.fill(along(J, hand, a, -2, 1, 1.8), br); L.fill(across(J, hand, a, 1.4, 2, 1.4), gd, shade=False, mid=3); L.fill(along(J, hand, a, 2.2, 8, 2), blade)
    elif wt == 'mace':
        L.fill(along(J, hand, a, -3, 10, 2), br); r = math.radians(a); hx, hy = J['T'](hand)
        L.fill(set(ellipse(hx + math.cos(r) * 11.5, hy + math.sin(r) * 11.5, 2.8, 2.8)), st, light=5, mid=3)
        L.fill(across(J, hand, a, 11.5, 3.4, 1.2), st, shade=False, mid=4)
    elif wt == 'spear':
        L.fill(along(J, hand, a, -10, 17, 1.8), br); L.fill(along(J, hand, a, 17, 23, 2.6), blade); L.fill(across(J, hand, a, 17, 1.8, 1.2), gd, shade=False, mid=3)
    elif wt == 'staff':
        L.fill(along(J, hand, a, -12, 15, 2), br); r = math.radians(a); hx, hy = J['T'](hand)
        L.fill(across(J, hand, a, 15, 2.2, 1.2), gd, shade=False, mid=3)
        L.fill(set(ellipse(hx + math.cos(r) * 18, hy + math.sin(r) * 18, 2.2, 2.6)), ramp('sky'), light=3, mid=2, darkc=1)
    elif wt == 'wand':
        L.fill(along(J, hand, a, -2, 8, 1.6), [gd[0], gd[1], gd[2], gd[3]]); r = math.radians(a); hx, hy = J['T'](hand)
        L.fill(set(ellipse(hx + math.cos(r) * 9.5, hy + math.sin(r) * 9.5, 1.8, 1.8)), ramp('violet'), light=3, mid=3)
    elif wt == 'device':
        L.fill(along(J, hand, a, -1, 7, 4), ramp('copper')); L.fill(along(J, hand, a, 7, 11, 2), st, light=4)
        r = math.radians(a); hx, hy = J['T'](hand); L.fill(set(ellipse(hx + math.cos(r) * 3, hy + math.sin(r) * 3, 1.4, 1.4)), ramp('teal'), shade=False, mid=3)
    elif wt == 'axe':   # woodcutter's axe: haft + one-sided bit
        L.fill(along(J, hand, a, -3, 11, 2), br); r = math.radians(a); hx, hy = J['T'](hand); nx, ny = -math.sin(r), math.cos(r)
        cx, cy = hx + math.cos(r) * 9.5, hy + math.sin(r) * 9.5
        L.fill(poly([(cx - math.cos(r) * 2.4, cy - math.sin(r) * 2.4), (cx + math.cos(r) * 2.4, cy + math.sin(r) * 2.4),
                     (cx + math.cos(r) * 3.6 - nx * 5, cy + math.sin(r) * 3.6 - ny * 5), (cx - math.cos(r) * 3.6 - nx * 5, cy - math.sin(r) * 3.6 - ny * 5)]), blade, light=3, mid=2)
    elif wt == 'pickaxe':   # miner's pick: haft + curved double head
        L.fill(along(J, hand, a, -3, 11, 2), br); r = math.radians(a); hx, hy = J['T'](hand); nx, ny = -math.sin(r), math.cos(r)
        cx, cy = hx + math.cos(r) * 10.5, hy + math.sin(r) * 10.5
        L.fill(poly([(cx - nx * 6 - math.cos(r) * 2.2, cy - ny * 6 - math.sin(r) * 2.2), (cx + math.cos(r) * 1.4, cy + math.sin(r) * 1.4),
                     (cx + nx * 6 - math.cos(r) * 2.2, cy + ny * 6 - math.sin(r) * 2.2), (cx - math.cos(r) * 1.2, cy - math.sin(r) * 1.2)]), blade, light=3, mid=2)
    elif wt == 'bow':
        r = math.radians(a); hx, hy = J['T'](hand); nx, ny = -math.sin(r), math.cos(r)
        face = 1 if J['view'] != 'W' else -1
        bend = 3.2 * (1 if J['view'] in ('E', 'S') else -1)
        pts = []
        for k in range(-10, 11):
            t = k; c = bend * (1 - (t / 10) ** 2)
            pts.append((hx + math.cos(r) * t + nx * c * face, hy + math.sin(r) * t + ny * c * face))
        for p, q in zip(pts, pts[1:]): L.fill(capsule(p, q, 2), br, shade=False, mid=3)
        L.put(capsule(pts[0], pts[-1], 0.8), hexrgb('#d8dce6'), hexrgb('#9a9aa8'))
def draw_shield(L, J, kind='round'):
    hand = J['hands'][J['oh']]; v = J['view']
    hx, hy = J['T'](hand)
    if v == 'E': hx += 2.5
    if v == 'S': hx += 0.5; hy -= 2
    if v == 'N': hy -= 2
    if kind == 'round':
        rim = ramp('stone'); wood = ramp('brown')
        L.fill(set(ellipse(hx, hy, 4.6 if v != 'E' else 2.4, 5.4)), rim, light=4, mid=3)
        L.fill(set(ellipse(hx, hy, 3.4 if v != 'E' else 1.4, 4.2)), wood if v != 'N' else [wood[0], wood[1], wood[1], wood[2]])
        if v == 'S': L.fill(set(ellipse(hx, hy, 1.4, 1.4)), rim, light=5, mid=4)
    else:  # kite
        b = ramp('blue'); g = ramp('gold'); w = 4.6 if v != 'E' else 2.4
        L.fill(poly([(hx - w, hy - 5), (hx + w, hy - 5), (hx + w, hy + 1), (hx, hy + 6.5), (hx - w, hy + 1)]), g, light=4, mid=3)
        L.fill(poly([(hx - w + 1, hy - 4), (hx + w - 1, hy - 4), (hx + w - 1, hy + 0.6), (hx, hy + 5), (hx - w + 1, hy + 0.6)]), b if v != 'N' else [b[0], b[1], b[1], b[2]])
        if v == 'S': L.put(poly([(hx - 0.6, hy - 3.5), (hx + 0.6, hy - 3.5), (hx + 0.6, hy + 3.4), (hx - 0.6, hy + 3.4)]), hexrgb('#e0b84e'), hexrgb('#5e4310'))

# ---------------------------------------------------------------- headgear (head-local, 4 views)
def dome(L, J, y0, y1, hw, rp, light=None):
    pts = []
    for k in range(9):
        a = math.pi + k / 8 * math.pi; pts.append((math.cos(a) * hw, y1 + math.sin(a) * (y1 - y0)))
    L.fill(Hpoly(J, pts + [(hw, y1 + 0.8), (-hw, y1 + 0.8)]), rp, light=light)
HEADGEAR = ['cap', 'straw', 'band_red', 'band_moon', 'leather', 'iron', 'wizard', 'hood_green', 'feather', 'miner', 'mask_shadow',
            'flower', 'antler', 'ironcrown', 'jelcrown', 'traveler', 'catears', 'party', 'witch', 'circlet', 'knight']
def draw_head(L, J, vis):
    v, side = J['view'], J['side']
    fx = 1 if side else 0  # side view: brims stick out in front
    def brim(y, hw, rp, fwd=3):
        if side: L.fill(Hpoly(J, [(-hw + 1, y), (hw + fwd, y), (hw + fwd, y + 1.6), (-hw + 1, y + 1.6)]), rp, shade=False, mid=2)
        else: L.fill(Hpoly(J, [(-hw, y), (hw, y), (hw, y + 1.6), (-hw, y + 1.6)]), rp, shade=False, mid=3 if v == 'S' else 1)
    if vis == 'cap':
        dome(L, J, -1.6, 4.5, 7.2, ramp('red'));
        if v == 'S': brim(4.4, 7.4, ramp('red'))
        elif side: L.fill(Hpoly(J, [(3, 4), (10, 4.4), (10, 5.6), (3, 5.6)]), ramp('red'), shade=False, mid=1)
        L.put(Hrect(J, -0.6, -2.4, 1.2, 1), hexrgb('#e0b84e'), hexrgb('#5e4310'))
    elif vis == 'straw':
        L.fill(Hpoly(J, [(-10.5, 3.2), (10.5, 3.2), (11, 5), (-11, 5)]), ramp('gold'), light=4, mid=3, darkc=2)
        dome(L, J, -3.5, 3.4, 5.4, ramp('gold'), light=4)
        L.fill(Hrect(J, -5.4, 1.4, 10.8, 1.4), ramp('red'), shade=False, mid=2)
    elif vis in ('band_red', 'band_moon'):
        c = ramp('red') if vis == 'band_red' else ramp('blue')
        L.fill(Hrect(J, -7.1, 3.6, 14.2, 1.8) if not side else Hrect(J, -6.6, 3.6, 13.6, 1.8), c, shade=False, mid=2)
        if vis == 'band_moon' and v == 'S': L.fill(Hell(J, 0, 4.4, 1.6, 1.6), ramp('ivory'), light=3, mid=3)
        if v == 'N' or side: L.fill(Hpoly(J, [(-1.5 if not side else -7, 4.6), (1.5 if not side else -6, 4.6), (1 if not side else -9, 10), (-1 if not side else -10, 10)]), c)
    elif vis in ('leather', 'iron', 'knight', 'miner'):
        rp = {'leather': ramp('brown'), 'iron': ramp('stone'), 'knight': ramp('stone'), 'miner': ramp('gold')}[vis]
        dome(L, J, -2.4, 6.2, 7.6, rp, light=4 if vis != 'leather' else None)
        L.fill(Hrect(J, -7.6, 5.4, 15.2, 1.4), rp, shade=False, mid=1 if vis != 'miner' else 2)
        if vis in ('iron', 'knight') and v == 'S': L.fill(Hrect(J, -0.7, 5.4, 1.4, 5), rp, shade=False, mid=2)
        if vis == 'knight':
            if v == 'S': L.fill(Hrect(J, -6.6, 6.6, 13.2, 3.4), rp, light=4, mid=3); L.put(Hrect(J, -5, 8, 10, 0.8), hexrgb('#262833'), hexrgb('#262833'))
            elif side: L.fill(Hrect(J, -2, 6.6, 9, 3.6), rp, light=4, mid=3); L.put(Hrect(J, 1.5, 8, 5.5, 0.8), hexrgb('#262833'), hexrgb('#262833'))
            else: L.fill(Hrect(J, -7.4, 6.6, 14.8, 5), rp)
            L.fill(Hpoly(J, [(-1, -2.4), (1, -2.4), (2.4, -6), (0, -7), (-2.4, -6)]) if not side else Hpoly(J, [(-3, -2.2), (1, -2.4), (-1, -7), (-5, -5)]), ramp('blue'))
        if vis == 'miner' and v != 'N':
            lx = 0 if v == 'S' else 5.2
            L.fill(Hell(J, lx, 1.8, 1.8, 1.6), ramp('stone'), light=4); L.put(Hell(J, lx, 1.8, 0.9, 0.8), hexrgb('#f6dc8a'), hexrgb('#8a6618'))
    elif vis == 'wizard':
        L.fill(Hpoly(J, [(-10.5, 3), (10.5, 3), (11, 4.8), (-11, 4.8)]), ramp('blue'), light=4, mid=3)
        L.fill(Hpoly(J, [(-5.6, 3.2), (5.6, 3.2), (2, -6), (1 if not side else -2, -11), (-1.6, -6)]), ramp('blue'), light=4, mid=3)
        L.fill(Hrect(J, -5.6, 1.6, 11.2, 1.6), ramp('gold'), shade=False, mid=3)
    elif vis == 'witch':
        L.fill(Hpoly(J, [(-10.5, 3), (10.5, 3), (11, 4.8), (-11, 4.8)]), ramp('violet'), light=3, mid=2)
        L.fill(Hpoly(J, [(-5.6, 3.2), (5.6, 3.2), (3, -5), (6, -9), (0, -6.5), (-2, -4)]), ramp('violet'), light=3, mid=2)
        L.fill(Hrect(J, -5.6, 1.6, 11.2, 1.4), ramp('sky'), shade=False, mid=2)
    elif vis == 'hood_green':
        g = ramp('green')
        top = [(-8, 3), (-7, 0), (-4.5, -2.4), (0, -3.2), (4.5, -2.4), (7, 0), (8, 3)]
        if v == 'N': L.fill(Hpoly(J, top + [(8.4, 12), (6, 15), (-6, 15), (-8.4, 12)]), g)
        elif side: L.fill(Hpoly(J, [(-8, 3), (-7, 0), (-4, -2.6), (1, -3), (5, -1.6), (7.4, 1.6), (7.6, 4.6), (4.4, 4.2), (2, 7), (1, 14), (-6, 15), (-8.4, 12)]), g)
        else:
            L.fill(Hpoly(J, top + [(8.4, 13), (6.4, 15), (5.2, 14), (5.2, 7), (3.6, 4.6), (0, 4), (-3.6, 4.6), (-5.2, 7), (-5.2, 14), (-6.4, 15), (-8.4, 13)]), g)
    elif vis == 'feather':
        draw_head(L, J, 'cap')
        fx0 = 4 if v != 'E' else -4
        L.fill(Hpoly(J, [(fx0, -1), (fx0 + 1.6, -1), (fx0 + 3, -9), (fx0 + 1.6, -10)]), ramp('ivory'), light=3, mid=2)
        L.put(Hrect(J, fx0 + 1.6, -9.6, 1.2, 2), hexrgb('#74c2f2'), hexrgb('#1f4f8c'))
    elif vis == 'mask_shadow':
        if v == 'N': L.fill(Hrect(J, -7, 7.6, 14, 1.4), ramp('stone'), shade=False, mid=0)
        elif side: L.fill(Hrect(J, -1, 7.2, 8, 3.6), [hexrgb('#1a1420'), hexrgb('#262833'), hexrgb('#3d404d'), hexrgb('#585c6b')]); L.put(Hrect(J, 2.8, 8.2, 1.6, 1.2), hexrgb('#d9564a'), hexrgb('#4a1016'))
        else:
            L.fill(Hrect(J, -6.4, 7.2, 12.8, 3.6), [hexrgb('#1a1420'), hexrgb('#262833'), hexrgb('#3d404d'), hexrgb('#585c6b')])
            for ex in (-3.6, 2.4): L.put(Hrect(J, ex, 8.2, 1.6, 1.2), hexrgb('#d9564a'), hexrgb('#4a1016'))
    elif vis == 'flower':
        L.fill(Hrect(J, -7, 1.6, 14, 1.3), ramp('green'), shade=False, mid=3)
        cols = ['#d9564a', '#f6dc8a', '#f2eee2', '#a88ae0', '#c07a3e']
        for k, x in enumerate([-6, -3.4, -0.8, 1.8, 4.4] if not side else [-6, -3.4, -0.8, 1.8]):
            L.put(Hrect(J, x, 0.4 + (k % 2) * 0.6, 2.2, 2.2), hexrgb(cols[k % 5]), hexrgb('#2b4a30'))
    elif vis == 'antler':
        draw_head(L, J, 'leather')
        for s in ((-1, 1) if not side else (-1,)):
            bx = 4.5 * s if not side else -2
            L.fill(Hpoly(J, [(bx - 0.8, -1.5), (bx + 0.8, -1.5), (bx + 2 * s + 0.6, -7), (bx + 2 * s - 0.6, -7.5)]), ramp('cream'), light=4, mid=3)
            L.fill(Hpoly(J, [(bx + s * 1.2, -4), (bx + s * 3.6, -5.6), (bx + s * 3.6, -4.4)]), ramp('cream'), light=4, mid=3)
    elif vis in ('ironcrown', 'jelcrown', 'circlet'):
        rp = {'ironcrown': ramp('stone'), 'jelcrown': ramp('gold'), 'circlet': ramp('gold')}[vis]
        if vis == 'circlet':
            L.fill(Hrect(J, -7, 3.6, 14, 1.2) if not side else Hrect(J, -6.6, 3.6, 13.6, 1.2), rp, shade=False, mid=3)
            if v == 'S': L.put(Hell(J, 0, 4.0, 1.3, 1.3), hexrgb('#74c2f2'), hexrgb('#1f4f8c'))
            if side: L.put(Hell(J, 5.6, 4.0, 1, 1), hexrgb('#74c2f2'), hexrgb('#1f4f8c'))
        else:
            L.fill(Hrect(J, -6.6, -0.6, 13.2, 3.4), rp, light=4, mid=3)
            for x in ([-6.6, -1.2, 4.0] if not side else [-5, 0, 4.4]):
                L.fill(Hpoly(J, [(x, -0.4), (x + 2.6, -0.4), (x + 1.3, -3.4)]), rp, light=4, mid=3)
            if v == 'S': L.put(Hrect(J, -0.8, 0.4, 1.6, 1.6), hexrgb('#7655b8') if vis == 'ironcrown' else hexrgb('#d9564a'), hexrgb('#2e1d4f'))
    elif vis == 'traveler':
        L.fill(Hpoly(J, [(-11.5, 3), (11.5, 3), (12, 4.8), (-12, 4.8)]), ramp('brown'), light=4, mid=3)
        dome(L, J, -3.4, 3.4, 5.8, ramp('brown'))
        L.fill(Hrect(J, -5.8, 1.6, 11.6, 1.4), ramp('stone'), shade=False, mid=1)
    elif vis == 'catears':
        L.fill(Hrect(J, -7, 0.4, 14, 1.2) if not side else Hrect(J, -5, 0.4, 10, 1.2), ramp('stone'), shade=False, mid=0)
        for x in ((-6, 3) if not side else (-3,)):
            L.fill(Hpoly(J, [(x, 0.6), (x + 3.2, 0.6), (x + 1.4, -3.6)]), ramp('stone'), shade=False, mid=1)
            if v != 'N': L.put(Hpoly(J, [(x + 0.9, 0.2), (x + 2.3, 0.2), (x + 1.4, -1.8)]), hexrgb('#d9564a'), hexrgb('#262833'))
    elif vis == 'party':
        L.fill(Hpoly(J, [(-3.6, 0.6), (3.6, 0.6), (0, -9)]), ramp('sky'), light=3, mid=2)
        for y, c in ((-1.5, '#e0b84e'), (-4.6, '#d9564a')): L.put(Hpoly(J, [(-3 + (y + 1.5) * -0.35, y), (3 + (y + 1.5) * 0.35, y), (2.6 + (y + 1.5) * 0.35, y - 1), (-2.6 - (y + 1.5) * 0.35, y - 1)]), hexrgb(c), hexrgb('#1f4f8c'))
        L.put(Hell(J, 0, -9.4, 1.2, 1.2), hexrgb('#f2eee2'), hexrgb('#7a7462'))

# ---------------------------------------------------------------- sheet building
# Two groups per layer so NPCs only load what they use: A = idle/walk/sit/interact, B = attack/cast/hit/death.
# Directions stored: N, S, E (W = E mirrored when drawn). Frames packed left-to-right, top-to-bottom.
GROUPS = {'a': ['idle', 'walk', 'sit', 'interact'], 'b': ['attack', 'cast', 'hit', 'death']}
STORE_DIRS = ['N', 'S', 'E']
GCOLS = 9
def group_index(g):
    k, idx = 0, {}
    for an in GROUPS[g]:
        n = dict((a[0], a[1]) for a in ANIMS)[an]
        idx[an] = {}
        for d in STORE_DIRS: idx[an][d] = k; k += n
    return idx, k
def render_group(draw, g, sex='male', wt=None):
    idx, total = group_index(g)
    rows = (total + GCOLS - 1) // GCOLS
    sheet = np.zeros((rows * FW, GCOLS * FW, 4), np.uint8)
    nfr = dict((a[0], a[1]) for a in ANIMS)
    for an in GROUPS[g]:
        n = nfr[an]
        for d in STORE_DIRS:
            for f in range(n):
                J = pose(d, an, f, n, sex, wt)
                L = Layer(); draw(L, J)
                k = idx[an][d] + f; x, y = (k % GCOLS) * FW, (k // GCOLS) * FW
                sheet[y:y + FW, x:x + FW] = L.image()
    return sheet
def meta():
    groups = {g: {'cols': GCOLS, 'index': group_index(g)[0]} for g in GROUPS}
    anims = {a[0]: {'n': a[1], 'fps': a[2], 'loop': a[3], 'group': 'a' if a[0] in GROUPS['a'] else 'b'} for a in ANIMS}
    anims['run'] = dict(anims['walk'], fps=15, alias='walk')
    return {'frame': FW, 'pivot': [32, 58], 'dirs': STORE_DIRS, 'mirror': {'W': 'E'}, 'dirs8': 'reserved: diagonals use the nearest stored direction',
            'groups': groups, 'anims': anims, 'height': 42, 'head': [12, 14]}
