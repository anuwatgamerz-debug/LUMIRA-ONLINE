"""ELYNDRA HD monsters: one generator for every monster sheet, in the same style as the HD characters.

Same rules as the characters (docs/LUMIRA_ART_BIBLE.md): master palette only, light from the top-left (lit top/left
edge, shaded bottom/right edge), 1px sel-out outline in the darkest colour of each part, no baked ground shadow
(the engine draws it), glow only on magic parts.

Sheet layout = the client's procedural monster layout (world.js PROC_ANIMS): 22 frames per row
(idle 4 · walk 6 · atk 5 · hit 2 · die 5), rows N, W, S, E (W = E mirrored). Each kind is drawn in body coords:
feet at (0, 0), y up is negative; a per-frame pose (bob, lean, squash, tilt) is applied by T().
"""
import math
from lumira_art import Layer, ramp, ellipse, poly, capsule, rect, hexrgb

ANIMS = {'idle': (0, 4, 5, 1), 'walk': (4, 6, 9, 1), 'atk': (10, 5, 11, 0), 'hit': (15, 2, 8, 0), 'die': (17, 5, 9, 0)}
NCOLS = 22
ROWS = ['N', 'W', 'S', 'E']
OUTL = hexrgb('#1a1420')


# ================================================================ pose + transform
class Pose:
    def __init__(self, view, anim, f, n, H, frame, anchor, flyer=False, k=1.0):
        self.k = k   # size factor: shapes scale with it, 1px details (eyes, seams) stay 1px -> more detail, same density
        self.view, self.anim, self.f, self.n, self.H = view, anim, f, n, H * k
        self.side = view == 'E'
        self.fw, self.fh = frame; self.ax, self.ay = anchor
        t = f / max(1, n)
        self.t = t; self.ph = t * 2 * math.pi
        self.bob = 0.0; self.lean = 0.0; self.sq = 1.0; self.rot = 0.0; self.drop = 0.0
        self.strike = 0.0   # 0 rest .. 1 full extension (attack)
        self.wind = 0.0     # wind-up (attack frames 0-1)
        self.hurt = 0.0
        self.fly = flyer
        if anim == 'idle': self.bob = [0, -0.6, -1, -0.6][f]; self.sq = [1, 1.02, 1.03, 1.02][f]
        elif anim == 'walk': self.bob = -abs(math.sin(self.ph)) * 1.4
        elif anim == 'atk':
            self.wind = [1, 0.6, 0, 0, 0][f]; self.strike = [0, 0, 1, 0.8, 0.3][f]
            self.lean = [-2.2, -1.4, 3.2, 2.2, 0.8][f]
        elif anim == 'hit': self.hurt = 1.0; self.lean = [-3, -1.6][f]; self.bob = [0, -0.5][f]
        elif anim == 'die':
            self.sq = [0.94, 0.86, 1, 1, 1][f]
            self.rot = [0, 0, -30, -70, -88][f]; self.drop = [0, 0, 0.6, 1.2, 1.4][f]
            self.lean = [-2.5, -1, 0, 0, 0][f]
        if flyer and anim not in ('die',):
            self.bob += -math.sin(self.ph * (2 if anim == 'walk' else 1)) * 1.6 - 6   # hovering
        if flyer and anim == 'die': self.bob += [-6, -4, -1, 0, 0][f]

    def T(self, p):
        x, y = p[0] * self.k, p[1] * self.k
        y = y * self.sq
        x = x + self.lean * (-y / max(1.0, self.H))
        if self.rot:   # falls over to the left, around the feet; lifted so the lying body rests on the ground
            a = math.radians(self.rot); px, py = (-self.H * 0.1, 0)
            dx, dy = x - px, y - py
            x, y = px + dx * math.cos(a) - dy * math.sin(a), py + dx * math.sin(a) + dy * math.cos(a)
            y -= abs(math.sin(a)) * self.H * 0.22
        return (self.ax + x, self.ay + y + self.bob)

    def melt(self):
        """soft deaths for blobs, plants and flyers: no fall, the body squashes into the ground"""
        if self.anim == 'die':
            self.rot = 0; self.lean = 0
            self.sq = [0.92, 0.78, 0.6, 0.42, 0.28][self.f]


def E(P, cx, cy, rx, ry, k=None):
    k = k or max(10, int((rx + ry) * 2))
    return poly([P.T((cx + rx * math.cos(a), cy + ry * math.sin(a))) for a in [i / k * 2 * math.pi for i in range(k)]])

def Pg(P, pts): return poly([P.T(p) for p in pts])
def Cap(P, a, b, w): return capsule(P.T(a), P.T(b), w * P.k)
def clip(L, pix): return {p for p in pix if 0 <= p[0] < L.w and 0 <= p[1] < L.h}


def shade(L, pix, rp, light=None, mid=None, dark=None, edge=True):
    """top-left lit shading on a part (same rule as the HD characters)"""
    pix = clip(L, pix)
    if not pix: return pix
    n = len(rp)
    li, mi, di = (4, 3, 2) if n >= 5 else (3, 2, 1) if n == 4 else (2, 1, 0)
    li = light if light is not None else li; mi = mid if mid is not None else mi; di = dark if dark is not None else di
    hi = min(n - 1, li + (1 if n >= 6 else 0))
    xs = [p[0] for p in pix]; ys = [p[1] for p in pix]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    w, h = max(1, x1 - x0), max(1, y1 - y0)
    for (x, y) in pix:
        t = ((x - x0) / w * 0.5 + (y - y0) / h * 0.5)
        c = li if t < 0.28 else di if t > 0.7 else mi
        if edge:
            if (x - 1, y) not in pix or (x, y - 1) not in pix: c = hi if t < 0.5 else li
            elif (x + 1, y) not in pix or (x, y + 1) not in pix: c = di if t > 0.3 else mi
        L.px[(x, y)] = rp[min(n - 1, max(0, c))]; L.dark[(x, y)] = rp[0]
    return pix

def dot(L, P, x, y, c, o=None, w=1, h=1):
    X, Y = P.T((x, y))
    L.put(clip(L, rect(math.floor(X), math.floor(Y), w, h)), c, o or OUTL)

def seg(L, P, a, b, c, o=None):
    (x1, y1), (x2, y2) = P.T(a), P.T(b); n = int(max(abs(x2 - x1), abs(y2 - y1))) + 1
    L.put(clip(L, {(math.floor(x1 + (x2 - x1) * k / max(1, n - 1)), math.floor(y1 + (y2 - y1) * k / max(1, n - 1))) for k in range(n)}), c, o or OUTL)

def eyes(L, P, x, y, gap, c=None, big=False, glow=None):
    """pair of eyes facing the viewer (S) or one eye (E); nothing from behind"""
    c = c or hexrgb('#ffffff')
    if P.view == 'N': return
    pts = [(x - gap, y), (x + gap, y)] if not P.side else [(x + gap, y)]
    for ex, ey in pts:
        if big:
            dot(L, P, ex - 0.5, ey - 0.5, c, OUTL, 2, 2); dot(L, P, ex + (0.5 if P.side else 0), ey + 0.5, OUTL, OUTL)
        else:
            dot(L, P, ex, ey, glow or c, OUTL)

def mirror_x(pts): return [(-x, y) for x, y in pts]


R = {k: ramp(k) for k in ('green', 'brown', 'stone', 'cream', 'blue', 'roof', 'gold', 'sky', 'violet', 'ivory', 'red', 'teal', 'copper', 'white', 'rose')}
def mix(*names_idx):
    """custom ramp from (ramp, index) pairs, dark -> light"""
    return [R[n][i] for n, i in names_idx]


# ================================================================ archetypes
def blob(L, P, S):
    """slimes: squashy dome with a highlight, face, optional crown"""
    P.melt(); P.sq = 1.0
    rp = S['rp']; w, h = S.get('w', 12), S.get('h', 18)
    sq = {'idle': [0, 1, 2, 1], 'walk': [2, 0, -2, -1, 0, 1], 'atk': [3, 2, -4, -2, 0], 'hit': [2, 1], 'die': [2, 4, 6, 8, 9]}[P.anim][P.f]
    ww, hh = w + sq * 0.6, h - sq
    hop = {'walk': [0, -2, -4, -3, -1, 0], 'atk': [0, 0, -5, -3, 0]}.get(P.anim, [0] * 6)[P.f]
    cy = -hh / 2 + hop
    body = E(P, 0, cy, ww, hh / 2)
    shade(L, body, rp)
    if P.anim != 'die' or P.f < 3:
        L.put(clip(L, E(P, -ww * 0.45, cy - hh * 0.22, ww * 0.18, hh * 0.12)), rp[-1], rp[0])   # highlight
        if P.view != 'N':
            ex = 0 if not P.side else ww * 0.4
            eyes(L, P, ex, cy + hh * 0.02, ww * 0.32 if not P.side else 0, R['white'][2], big=True)
            if S.get('mouth', True) and not P.side: seg(L, P, (-1.5, cy + hh * 0.22), (1.5, cy + hh * 0.22), rp[0])
    if S.get('crown'):
        g = R['gold']; top = cy - hh / 2
        shade(L, Pg(P, [(-6, top + 2), (-6, top - 4), (-3, top - 1), (0, top - 6), (3, top - 1), (6, top - 4), (6, top + 2)]), g, light=4, mid=3, dark=2)
        dot(L, P, 0, top - 2, R['red'][3], R['red'][0])
    if S.get('core'):   # magic core visible through the jelly
        shade(L, E(P, 0, cy + 1, 2.4, 2.4), S['core'], edge=False)


def ghost(L, P, S):
    P.melt()
    rp = S['rp']; h = S.get('h', 30); w = S.get('w', 11)
    wave = math.sin(P.ph) * 1.5
    lift = -6
    top = -h + lift
    pts = [(-w, top + w)]
    for k in range(9):   # dome
        a = math.pi + k / 8 * math.pi; pts.append((math.cos(a) * w, top + w + math.sin(a) * w))
    tail = [(w, top + w), (w + 1 + wave, lift - 6), (w * 0.4, lift - 2 + wave), (0, lift - 5), (-w * 0.5, lift - 1 - wave), (-w - 1 - wave, lift - 7)]
    body = Pg(P, pts + tail); shade(L, body, rp)
    if P.view != 'N':
        ex = 0 if not P.side else w * 0.45
        for dx in ((-4, 4) if not P.side else (0,)):
            shade(L, E(P, ex + dx, top + w + 1, 1.8, 2.6), [OUTL, OUTL, OUTL], edge=False)
            dot(L, P, ex + dx, top + w + 1, S.get('eye', R['sky'][3]), OUTL)
        if not P.side: shade(L, E(P, 0, top + w + 7, 2.2, 1.6 + P.strike * 2), [OUTL, OUTL, OUTL], edge=False)
    if S.get('hood'):
        hd = S['hood']; shade(L, Pg(P, pts[:5] + [(0, top - 1)] + mirror_x(pts[:5])[::-1]), hd)
    arms = P.strike * 6
    for s in ((-1, 1) if not P.side else (1,)):
        a = (s * (w - 1), top + w + 4); b = (s * (w + 4 + arms), top + w + 8 - arms)
        shade(L, Cap(P, a, b, 3.0), rp, edge=False)


def wisp(L, P, S):
    P.melt()
    rp = S['rp']; flick = [0, 1, 0, -1, 0, 1][P.f % 6]
    base = -12
    shade(L, E(P, 0, base, 7, 6), rp)
    shade(L, Pg(P, [(-6, base - 1), (-3 + flick, base - 14), (0, base - 9), (3 - flick, base - 17), (6, base - 2)]), rp)
    shade(L, E(P, 0, base - 1, 3.6, 3.4), [rp[-2], rp[-1], rp[-1]], edge=False)
    if P.view != 'N': eyes(L, P, 0 if not P.side else 3, base, 2 if not P.side else 0, OUTL)


def biped(L, P, S):
    """humanoid monsters: legs, torso, arms, head + species features (horns, ears, tusks, weapon)"""
    v, side = P.view, P.side
    sk, cl = S['skin'], S.get('cloth')
    H = S['h']; leg = H * 0.32; torso = H * 0.34; head = S.get('head', H * 0.28)
    hip_y = -leg; sh_y = hip_y - torso; head_cy = sh_y - head * 0.42
    bw = S.get('bw', 6.0) ; lw = S.get('lw', 3.6); aw = S.get('aw', 3.2)
    stoop = S.get('stoop', 0)
    # legs
    for i, sg in ((0, -1), (1, 1)):
        if side:
            sw = math.sin(P.ph) * (1 if i == 0 else -1) * (6 if P.anim == 'walk' else 0)
            hip = (sg * 0.6, hip_y); foot = (sw, -1.5); knee = ((hip[0] + foot[0]) / 2 + 1.2, hip_y / 2)
        else:
            lift = max(0, math.sin(P.ph) * (1 if i == 0 else -1)) * 3 if P.anim == 'walk' else 0
            hip = (sg * bw * 0.45, hip_y); foot = (sg * bw * 0.5, -1.5 - lift); knee = (sg * bw * 0.48, hip_y / 2 - lift * 0.5)
        lp = S.get('legrp', sk)
        shade(L, Cap(P, hip, knee, lw) | Cap(P, knee, foot, lw - 0.4), lp)
        shade(L, E(P, foot[0] + (1.2 if side else 0), foot[1] + 0.4, lw * 0.6 + (0.8 if side else 0), 1.6), S.get('feet', lp))
    # torso
    tw = bw * (0.9 if side else 1)
    tp = [(-tw - stoop * 0.3, sh_y), (tw - stoop * 0.3, sh_y), (tw * 0.85, hip_y + 1), (-tw * 0.85, hip_y + 1)]
    if side: tp = [(-tw * 0.7 + stoop, sh_y), (tw * 0.7 + stoop, sh_y), (tw * 0.6, hip_y + 1), (-tw * 0.7, hip_y + 1)]
    shade(L, Pg(P, tp), sk)
    if cl: shade(L, Pg(P, [(x * 1.05, y if y > sh_y + torso * 0.45 else sh_y + torso * 0.45) for x, y in tp]), cl)
    if S.get('belt') and v != 'N': seg(L, P, (-tw * 0.9, hip_y), (tw * 0.9, hip_y), S['belt'][3], S['belt'][0])
    # arms (weapon arm swings in the attack)
    def arm(i, sg, front):
        shx = (sg * (tw + 0.8) if not side else (stoop + (1.2 if front else -1.2)))
        sh = (shx, sh_y + 1.5)
        if P.anim == 'atk' and front:
            ang = -150 + P.strike * 170 - P.wind * 20 if side else None
            if side: hand = (sh[0] + math.cos(math.radians(ang)) * H * 0.3, sh[1] + math.sin(math.radians(ang)) * H * 0.3)
            else: hand = (sh[0] + sg * 2, sh[1] - H * 0.28 * (1 - P.strike) + H * 0.2 * P.strike)
        elif P.anim == 'walk':
            sw = math.sin(P.ph) * (1 if i == 0 else -1) * 3
            hand = (sh[0] + (sw if side else sg * 1.5), sh[1] + H * 0.27)
        elif P.anim == 'hit': hand = (sh[0] + (-3 if side else sg * 3.4), sh[1] + H * 0.18)
        else: hand = (sh[0] + (0 if side else sg * 1.2), sh[1] + H * 0.28 + S.get('armdrop', 0))
        el = ((sh[0] + hand[0]) / 2 + (0.8 if side else sg * 0.8), (sh[1] + hand[1]) / 2)
        shade(L, Cap(P, sh, el, aw) | Cap(P, el, hand, aw - 0.4), S.get('armrp', sk))
        shade(L, E(P, hand[0], hand[1], aw * 0.55 + 0.3, aw * 0.55 + 0.3), S.get('handrp', sk), edge=False)
        return hand
    hands = []
    if side:
        arm(0, -1, False)
    else:
        hands.append(arm(0, -1, False))
    # head
    hcx = (stoop + 1.5) if side else 0
    hy = head_cy - (S.get('neck', 0))
    S['draw_head'](L, P, S, hcx, hy, head)
    if side: hands.append(arm(1, 1, True))
    else: hands.append(arm(1, 1, True))
    if S.get('weapon'): S['weapon'](L, P, S, hands[-1])
    if S.get('extra'): S['extra'](L, P, S, hcx, hy, head, sh_y, hip_y, tw)


def head_round(L, P, S, cx, cy, r, ears=None, snout=None, horns=None, tusks=False, eye=None, brow=False, jaw=None):
    sk = S.get('headrp', S['skin'])
    if horns and P.view == 'N': horns(L, P, cx, cy, r)
    if ears and P.view != 'S': ears(L, P, cx, cy, r)
    shade(L, E(P, cx, cy, r * 0.62 if P.side else r * 0.6, r * 0.55), sk)
    if ears and P.view == 'S': ears(L, P, cx, cy, r)
    if snout:
        sx = cx + (r * 0.55 if P.side else 0)
        if P.view == 'S': shade(L, E(P, sx, cy + r * 0.22, r * 0.28, r * 0.18), snout, edge=False)
        elif P.side: shade(L, E(P, sx + r * 0.1, cy + r * 0.14, r * 0.28, r * 0.2), snout)
    if P.view != 'N':
        ex = cx + (r * 0.32 if P.side else 0)
        eyes(L, P, ex, cy - r * 0.05, r * 0.26 if not P.side else 0, eye or OUTL, glow=eye)
        if brow and not P.side: seg(L, P, (cx - r * 0.38, cy - r * 0.2), (cx - r * 0.12, cy - r * 0.12), OUTL); seg(L, P, (cx + r * 0.38, cy - r * 0.2), (cx + r * 0.12, cy - r * 0.12), OUTL)
        if tusks and not P.side:
            for s in (-1, 1): dot(L, P, cx + s * r * 0.2, cy + r * 0.32, R['ivory'][3], R['ivory'][0], 1, 2)
        elif tusks: dot(L, P, cx + r * 0.5, cy + r * 0.3, R['ivory'][3], R['ivory'][0], 1, 2)
        if jaw and P.anim == 'atk' and P.strike > 0.5 and not P.side: seg(L, P, (cx - r * 0.2, cy + r * 0.3), (cx + r * 0.2, cy + r * 0.3), R['red'][1])
    if horns and P.view != 'N': horns(L, P, cx, cy, r)


def quad(L, P, S):
    """four-legged beasts in N/S/E. front view shows the head over the chest, back view the rump + tail"""
    P.melt()
    if P.anim == 'die': P.sq = max(P.sq, 0.5)   # slumps down instead of tipping over
    v, side = P.view, P.side
    fur, belly = S['rp'], S.get('belly', S['rp'])
    H = S['h']; Lg = S.get('legh', H * 0.4); bl = S.get('len', H * 1.1); bh = S.get('bh', H * 0.42)
    by = -Lg - bh * 0.35
    gait = math.sin(P.ph) if P.anim == 'walk' else 0
    lunge = P.strike * 4 - P.wind * 2
    if side:
        # far legs, body, near legs, head
        for i, (x0, ph) in enumerate(((-bl * 0.32, 0), (bl * 0.3, math.pi))):
            sw = math.sin(P.ph + ph + math.pi / 2) * 4 if P.anim == 'walk' else 0
            shade(L, Cap(P, (x0 + 1, by + 2), (x0 + 1 - sw, -1.5), S.get('lw', 3.0)), [fur[0]] + fur[:-1], edge=False)
        tail = S.get('tail')
        if tail: tail(L, P, S, (-bl * 0.5, by - bh * 0.1))
        body = E(P, lunge * 0.3, by, bl * 0.5, bh * 0.5)
        shade(L, body, fur)
        shade(L, E(P, lunge * 0.3 + 1, by + bh * 0.28, bl * 0.34, bh * 0.2), belly, edge=False)
        for i, (x0, ph) in enumerate(((-bl * 0.36, math.pi), (bl * 0.26, 0))):
            sw = math.sin(P.ph + ph + math.pi / 2) * 4 if P.anim == 'walk' else 0
            shade(L, Cap(P, (x0, by + 2), (x0 - sw, -1.5), S.get('lw', 3.0) + 0.4), fur)
            shade(L, E(P, x0 - sw + 0.6, -1, 1.8, 1.2), S.get('paw', fur), edge=False)
        S['qhead'](L, P, S, (bl * 0.48 + lunge, by - bh * 0.42 - P.strike * 1.5))
    else:
        front = v == 'S'
        wdt = S.get('w', bh * 0.85)
        legs = [(-wdt * 0.55, 0), (wdt * 0.55, math.pi)]
        if not front:
            tail = S.get('tail')
            body = E(P, 0, by - 1, wdt, bh * 0.62); shade(L, body, fur)
            for x0, ph in legs:
                lift = max(0, math.sin(P.ph + ph)) * 2.6 if P.anim == 'walk' else 0
                shade(L, Cap(P, (x0, by + 2), (x0, -1.5 - lift), S.get('lw', 3.0) + 0.4), fur)
            if tail: tail(L, P, S, (0, by - bh * 0.3))
            S['qhead'](L, P, S, (0, by - bh * 0.62 - 3))   # back of the head over the shoulders
        else:
            body = E(P, 0, by - 3, wdt * 0.9, bh * 0.6); shade(L, body, fur)
            shade(L, E(P, 0, by, wdt * 0.55, bh * 0.4), belly, edge=False)
            for x0, ph in legs:
                lift = max(0, math.sin(P.ph + ph)) * 2.6 if P.anim == 'walk' else 0
                shade(L, Cap(P, (x0, by + 2), (x0, -1.5 - lift), S.get('lw', 3.0) + 0.4), fur)
                shade(L, E(P, x0, -1 - lift, 2.0, 1.2), S.get('paw', fur), edge=False)
            S['qhead'](L, P, S, (0, by - bh * 0.05 + lunge * 0.3))


def bug(L, P, S):
    """insects / crabs / spiders: legs around a shell body"""
    P.melt()
    v, side = P.view, P.side
    sh_, H = S['rp'], S['h']
    nleg = S.get('legs', 3); lr = S.get('legrp', [OUTL] + sh_[:2])
    by = -S.get('lift', 4) - H * 0.4
    bw, bh = S.get('w', 10), H * 0.4
    step = math.sin(P.ph) * 2 if P.anim == 'walk' else 0
    for k in range(nleg):
        t = (k / max(1, nleg - 1) - 0.5)
        for s in ((-1, 1) if not side else (1,)):
            alt = (1 if (k + (s > 0)) % 2 else -1) * step
            if side:
                root = (t * bw * 1.4, by + bh * 0.3); knee = (root[0] + t * 4, by - bh * 0.2 + alt); foot = (root[0] + t * 7 + alt, -0.5)
            else:
                root = (s * bw * 0.7, by + t * bh); knee = (s * (bw + 2.5), by + t * bh - 2.5 + alt); foot = (s * (bw + 3.5), -0.5 + t * 2 - (2 if t < 0 else 0) + alt * 0.5)
            seg(L, P, root, knee, lr[1], lr[0]); seg(L, P, knee, foot, lr[2] if len(lr) > 2 else lr[1], lr[0])
    S['body'](L, P, S, by, bw, bh)


def flyer(L, P, S):
    P.melt()
    rp = S['rp']; flap = {'walk': [1, 0, -1, 0, 1, 0], 'idle': [1, 0, -1, 0], 'atk': [-1, -1, 1, 0, 0], 'hit': [0, 0], 'die': [0, 0, 0, 0, 0]}[P.anim][P.f]
    by = -10
    wing = S['wing']
    span = S.get('span', 13)
    for s in ((-1, 1) if not P.side else (-1,)):
        up = flap * 5
        pts = [(s * 2, by - 1), (s * span * 0.6, by - 6 - up), (s * span, by - 2 - up * 1.2), (s * span * 0.8, by + 3 - up * 0.3), (s * span * 0.5, by + 1), (s * span * 0.3, by + 4), (s * 2, by + 2)]
        if P.side: pts = [(x * 0.6 - 2, y) for x, y in pts]
        shade(L, Pg(P, pts), wing)
    S['fbody'](L, P, S, by)


def serpent(L, P, S):
    P.melt()
    rp, belly = S['rp'], S.get('belly', S['rp'])
    if not P.side:   # front / back: coiled body with the neck rising out of the coil
        sway = math.sin(P.ph) * 2.0
        shade(L, E(P, 0, -3.4, 9, 3.6), rp); shade(L, E(P, -1, -6.4, 7, 3.0), rp)
        top = (sway * 0.6 + P.strike * 0, -18 - P.strike * 4 + P.wind * 2)
        if P.view == 'N': shade(L, Cap(P, (1, -7), top, 4.2), rp)
        shade(L, Cap(P, (2, -7), ((2 + top[0]) / 2 + 2, (top[1] - 7) / 2), 4.4) | Cap(P, ((2 + top[0]) / 2 + 2, (top[1] - 7) / 2), top, 4.0), rp)
        if P.view == 'S':
            shade(L, Cap(P, (1.5, -9), (top[0] + 0.5, top[1] + 4), 1.6), belly if belly is not rp else [rp[0], rp[-2], rp[-1]], edge=False)
            if S.get('hood'): shade(L, Pg(P, [(top[0] - 7, top[1] + 3), (top[0] - 4, top[1] - 4), (top[0] + 4, top[1] - 4), (top[0] + 7, top[1] + 3), (top[0], top[1] + 6)]), S['hood'])
            shade(L, E(P, top[0], top[1] - 1, 4.2, 3.4), rp)
            eyes(L, P, top[0], top[1] - 1.8, 1.8, S.get('eye', R['gold'][4]), glow=S.get('eye', R['gold'][4]))
            if P.strike > 0.5: seg(L, P, (top[0], top[1] + 2), (top[0], top[1] + 5), R['red'][3], R['red'][0])
        else:
            shade(L, E(P, top[0], top[1] - 1, 4.0, 3.2), rp)
        return
    n = 7; amp = 2.6 if P.anim in ('idle', 'walk') else 1
    pts = []
    for k in range(n):
        t = k / (n - 1)
        if P.side: pts.append((-10 + t * 14, -2 - math.sin(P.ph + t * 5) * amp * (1 - t) * 0.6 - (t ** 3) * (12 + P.strike * 6)))
        else: pts.append((math.sin(P.ph + t * 5) * amp * (1 - t * 0.5), -1 - t * (16 + P.strike * 5) * (1 if P.view == 'S' else 0.8)))
    for k in range(n - 1, 0, -1) if P.view == 'S' else range(1, n):
        w = 5.4 - k * 0.35
        shade(L, Cap(P, pts[k - 1], pts[k], w), rp)
    hx, hy = pts[-1]
    if P.view == 'S' or P.side:
        shade(L, E(P, hx + (2 if P.side else 0), hy - 1, 4.2, 3.2), rp)
        eyes(L, P, hx + (2.6 if P.side else 0), hy - 1.8, 1.8 if not P.side else 0, S.get('eye', R['gold'][4]), glow=S.get('eye', R['gold'][4]))
        if P.anim == 'atk' and P.strike > 0.5: seg(L, P, (hx + (5 if P.side else 0), hy + 1), (hx + (8 if P.side else 0), hy + 3), R['red'][3], R['red'][0])
    else:
        shade(L, E(P, hx, hy - 1, 4.0, 3.0), rp)
    if S.get('hood') and not P.side:
        shade(L, Pg(P, [(hx - 7, hy + 2), (hx - 4, hy - 5), (hx + 4, hy - 5), (hx + 7, hy + 2), (hx, hy + 5)]), S['hood'])
        if P.view == 'S': shade(L, E(P, hx, hy - 1, 3.6, 2.8), rp); eyes(L, P, hx, hy - 1.8, 1.8, R['gold'][4], glow=R['gold'][4])


def plant(L, P, S):
    """rooted / hopping plants: bulb body, leaves, face"""
    P.melt()
    rp, lf = S['rp'], S.get('leaf', R['green'])
    h = S['h']; w = S.get('w', 9)
    hop = {'walk': [0, -2, -3, -2, 0, 0], 'atk': [0, 1, -2, -1, 0]}.get(P.anim, [0] * 6)[P.f]
    sway = math.sin(P.ph) * 1.5
    top = -h + hop
    if S.get('stem'):
        shade(L, Cap(P, (0, -2), (sway * 0.4, top + h * 0.5), S['stem']), lf, edge=False)
    body = E(P, sway * 0.3, top + h * 0.55 + (h * 0.12 if S.get('stem') else 0), w, h * 0.42)
    shade(L, body, rp)
    S['crest'](L, P, S, sway, top)
    if P.view != 'N':
        fx = sway * 0.3 + (w * 0.45 if P.side else 0)
        fy = top + h * 0.6
        eyes(L, P, fx, fy, w * 0.32 if not P.side else 0, S.get('eye', OUTL), glow=S.get('eye'))
        if S.get('maw'):
            o = 1 + P.strike * 2.5
            if not P.side: shade(L, E(P, fx, fy + 4, 3, o), [OUTL, R['red'][0], R['red'][1]], edge=False)
            else: shade(L, E(P, fx + 2, fy + 3.5, 2.2, o), [OUTL, R['red'][0], R['red'][1]], edge=False)
    for s in (-1, 1):   # little root feet
        dx = s * w * 0.45
        shade(L, E(P, dx + (P.f % 2) * 0.5 * s, -1.2, 2.2, 1.3), S.get('feet', mix(('brown', 0), ('brown', 1), ('brown', 2), ('brown', 3))), edge=False)
