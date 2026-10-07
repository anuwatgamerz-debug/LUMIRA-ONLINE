"""ELYNDRA HD monster designs (drawn by monsters_hd.py). Base colours follow the monster sheets they replace, so the
per-monster tints in content/monsters.js keep giving the same colour families."""
import math
from monsters_hd import *

G, B, S_, C, BL, GD, SK, VI, IV, RD, TE, CU, RO = (R[k] for k in ('green', 'brown', 'stone', 'cream', 'blue', 'gold', 'sky', 'violet', 'ivory', 'red', 'teal', 'copper', 'rose'))
RF = R['roof']


# ---------------------------------------------------------------- heads
def h_goblin(L, P, S, cx, cy, r):
    def ears(L, P, cx, cy, r):
        for s in ((-1, 1) if not P.side else (-1,)):
            shade(L, Pg(P, [(cx + s * r * 0.45, cy - r * 0.15), (cx + s * r * 1.15, cy - r * 0.45), (cx + s * r * 0.5, cy + r * 0.15)]), S['skin'])
    head_round(L, P, S, cx, cy, r, ears=ears, eye=GD[4], brow=True, tusks=S.get('tusks'))
    if S.get('cap') and P.view != 'S' or S.get('cap'):
        cap = S['cap']; shade(L, Pg(P, [(cx - r * 0.6, cy - r * 0.25), (cx - r * 0.3, cy - r * 0.62), (cx + r * 0.35, cy - r * 0.62), (cx + r * 0.62, cy - r * 0.25)]), cap)

def h_orc(L, P, S, cx, cy, r):
    head_round(L, P, S, cx, cy, r, eye=RD[3], brow=True, tusks=True)
    shade(L, Pg(P, [(cx - r * 0.62, cy - r * 0.2), (cx - r * 0.5, cy - r * 0.6), (cx + r * 0.5, cy - r * 0.6), (cx + r * 0.62, cy - r * 0.2)]), S_, light=4, mid=3, dark=2)   # iron cap
    if P.view != 'N': dot(L, P, cx - r * 0.2, cy - r * 0.48, S_[5], S_[0], 2, 1)

def h_skull(L, P, S, cx, cy, r):
    shade(L, E(P, cx, cy, r * 0.55, r * 0.52), IV)
    if P.view != 'N':
        ex = cx + (r * 0.3 if P.side else 0)
        for dx in ((-r * 0.22, r * 0.22) if not P.side else (0,)):
            shade(L, E(P, ex + dx, cy, r * 0.14, r * 0.16), [OUTL, OUTL, OUTL], edge=False)
            dot(L, P, ex + dx, cy, S.get('glow', SK[2]), OUTL)
        if not P.side:
            for k in range(-2, 3): dot(L, P, cx + k * 1.0, cy + r * 0.42, OUTL if k % 2 else IV[2], OUTL)
    if S.get('helm'): shade(L, Pg(P, [(cx - r * 0.6, cy - r * 0.05), (cx - r * 0.5, cy - r * 0.62), (cx + r * 0.5, cy - r * 0.62), (cx + r * 0.6, cy - r * 0.05)]), S_, light=4, mid=3, dark=2)

def h_zombie(L, P, S, cx, cy, r):
    head_round(L, P, S, cx, cy, r, eye=GD[4])
    if P.view != 'N':
        dot(L, P, cx - r * 0.3, cy - r * 0.45, B[1], B[0], 3, 1)   # scalp patch
        if not P.side: seg(L, P, (cx - r * 0.2, cy + r * 0.3), (cx + r * 0.25, cy + r * 0.35), OUTL)

def horns_small(L, P, cx, cy, r):
    for s in ((-1, 1) if not P.side else (-1, 1)):
        x = cx + s * r * (0.35 if not P.side else 0.2)
        shade(L, Pg(P, [(x - 1.2, cy - r * 0.4), (x + 1.2, cy - r * 0.4), (x + s * 2.4, cy - r * 0.95)]), IV, light=3, mid=2, dark=1, edge=False)

def h_imp(L, P, S, cx, cy, r):
    head_round(L, P, S, cx, cy, r, horns=horns_small, eye=GD[4], brow=True)

def h_bull(L, P, S, cx, cy, r):
    def horns(L, P, cx, cy, r):
        for s in ((-1, 1) if not P.side else (1, -1)):
            x0 = cx + s * r * 0.4
            pts = [(x0, cy - r * 0.2), (x0 + s * r * 0.75, cy - r * 0.35), (x0 + s * r * 1.05, cy - r * 0.95), (x0 + s * r * 0.75, cy - r * 0.55), (x0, cy - r * 0.48)]
            shade(L, Pg(P, pts), IV)
    head_round(L, P, S, cx, cy, r, snout=C, horns=horns, eye=RD[3], brow=True)
    if P.view == 'S': dot(L, P, cx - 0.5, cy + r * 0.35, GD[3], GD[0], 2, 1)   # nose ring

def h_wolfman(L, P, S, cx, cy, r):
    def ears(L, P, cx, cy, r):
        for s in ((-1, 1) if not P.side else (-1,)):
            x = cx + s * r * 0.35 - (r * 0.15 if P.side else 0)
            shade(L, Pg(P, [(x - 1.8, cy - r * 0.35), (x + 1.8, cy - r * 0.35), (x + s * 0.8, cy - r * 1.0)]), S['skin'])
    head_round(L, P, S, cx, cy, r, ears=ears, snout=S.get('snout', C), eye=GD[4], brow=True, jaw=True)

def h_frog(L, P, S, cx, cy, r):
    shade(L, E(P, cx, cy + r * 0.1, r * 0.7, r * 0.45), S['skin'])
    if P.view != 'N':
        for s in ((-1, 1) if not P.side else (1,)):
            ex = cx + (s * r * 0.4 if not P.side else r * 0.25)
            shade(L, E(P, ex, cy - r * 0.32, r * 0.22, r * 0.22), S['skin'])
            dot(L, P, ex - 0.5, cy - r * 0.38, GD[4], OUTL, 2, 2); dot(L, P, ex, cy - r * 0.32, OUTL, OUTL)
        if not P.side: seg(L, P, (cx - r * 0.45, cy + r * 0.28), (cx + r * 0.45, cy + r * 0.28), S['skin'][0])
    else:
        for s in (-1, 1): shade(L, E(P, cx + s * r * 0.4, cy - r * 0.32, r * 0.22, r * 0.22), S['skin'])

def h_golem(L, P, S, cx, cy, r):
    shade(L, Pg(P, [(cx - r * 0.5, cy + r * 0.4), (cx - r * 0.55, cy - r * 0.3), (cx - r * 0.2, cy - r * 0.55), (cx + r * 0.3, cy - r * 0.5), (cx + r * 0.55, cy - r * 0.2), (cx + r * 0.5, cy + r * 0.4)]), S['skin'])
    if P.view != 'N':
        g = S.get('glowrp', SK)
        for dx in ((-r * 0.22, r * 0.22) if not P.side else (r * 0.25,)): dot(L, P, cx + dx - 0.5, cy - r * 0.02, g[3], g[1], 2, 1)

def h_bot(L, P, S, cx, cy, r):
    shade(L, Pg(P, [(cx - r * 0.55, cy + r * 0.42), (cx - r * 0.55, cy - r * 0.42), (cx + r * 0.55, cy - r * 0.42), (cx + r * 0.55, cy + r * 0.42)]), S['skin'])
    seg(L, P, (cx, cy - r * 0.42), (cx, cy - r * 0.8), S_[3]); dot(L, P, cx - 0.5, cy - r * 0.9, RD[3], RD[0], 2, 2)   # antenna
    if P.view != 'N': shade(L, Pg(P, [(cx - r * 0.42 + (r * 0.2 if P.side else 0), cy - r * 0.12), (cx + r * 0.42 + (r * 0.2 if P.side else 0), cy - r * 0.12), (cx + r * 0.42 + (r * 0.2 if P.side else 0), cy + r * 0.12), (cx - r * 0.42 + (r * 0.2 if P.side else 0), cy + r * 0.12)]), TE, light=3, mid=3, dark=2, edge=False)

def h_tree(L, P, S, cx, cy, r):
    lf = S.get('leaf', G)
    shade(L, E(P, cx, cy - r * 0.2, r * 0.95, r * 0.7), lf)
    for a in range(5):
        ang = a / 5 * 2 * math.pi + 0.4
        shade(L, E(P, cx + math.cos(ang) * r * 0.7, cy - r * 0.3 + math.sin(ang) * r * 0.45, r * 0.32, r * 0.28), lf)
    if S.get('bloom'):
        for k, (dx, dy) in enumerate(((-0.4, -0.5), (0.45, -0.2), (0, -0.85))): shade(L, E(P, cx + dx * r, cy + dy * r, 1.6, 1.6), S['bloom'], edge=False)
    if P.view != 'N':   # bark face under the canopy
        shade(L, E(P, cx, cy + r * 0.45, r * 0.45, r * 0.32), S['skin'])
        eyes(L, P, cx + (r * 0.2 if P.side else 0), cy + r * 0.4, r * 0.18 if not P.side else 0, GD[4], glow=GD[4])


# ---------------------------------------------------------------- weapons for bipeds
def w_club(L, P, S, hand):
    a = math.radians(-70 + P.strike * 120 - P.wind * 30) if P.anim == 'atk' else math.radians(-80)
    tip = (hand[0] + math.cos(a) * 11 * (1 if P.view != 'N' else 0.8), hand[1] + math.sin(a) * 11)
    shade(L, Cap(P, hand, tip, 2.4), B, light=4, mid=3, dark=2)
    shade(L, E(P, tip[0], tip[1], 2.8, 2.8), B, light=4, mid=3, dark=2)

def w_axe(L, P, S, hand):
    a = math.radians(-80 + P.strike * 140 - P.wind * 30) if P.anim == 'atk' else math.radians(-75)
    tip = (hand[0] + math.cos(a) * 15, hand[1] + math.sin(a) * 15)
    shade(L, Cap(P, (hand[0] - math.cos(a) * 3, hand[1] - math.sin(a) * 3), tip, 2.2), B, light=4, mid=3, dark=2)
    nx, ny = -math.sin(a), math.cos(a)
    c = (tip[0] - math.cos(a) * 3, tip[1] - math.sin(a) * 3)
    shade(L, Pg(P, [(c[0] - math.cos(a) * 3, c[1] - math.sin(a) * 3), (c[0] + math.cos(a) * 3, c[1] + math.sin(a) * 3), (c[0] + math.cos(a) * 5 + nx * 7, c[1] + math.sin(a) * 5 + ny * 7), (c[0] - math.cos(a) * 5 + nx * 7, c[1] - math.sin(a) * 5 + ny * 7)]), S_, light=5, mid=4, dark=2)

def w_spear(L, P, S, hand):
    a = math.radians(-60 + P.strike * 70) if P.anim == 'atk' else math.radians(-95)
    t0 = (hand[0] - math.cos(a) * 8, hand[1] - math.sin(a) * 8); tip = (hand[0] + math.cos(a) * 14, hand[1] + math.sin(a) * 14)
    shade(L, Cap(P, t0, tip, 1.8), B, light=4, mid=3, dark=2, edge=False)
    nx, ny = -math.sin(a), math.cos(a)
    shade(L, Pg(P, [(tip[0] + nx * 2, tip[1] + ny * 2), (tip[0] + math.cos(a) * 6, tip[1] + math.sin(a) * 6), (tip[0] - nx * 2, tip[1] - ny * 2)]), S_, light=5, mid=4, dark=2)

def w_blade(L, P, S, hand):
    a = math.radians(-120 + P.strike * 170 - P.wind * 20) if P.anim == 'atk' else math.radians(70)
    tip = (hand[0] + math.cos(a) * 12, hand[1] + math.sin(a) * 12)
    shade(L, Cap(P, hand, tip, 2.4), S_, light=5, mid=4, dark=2)
    seg(L, P, (hand[0] - math.sin(a) * 1.6, hand[1] + math.cos(a) * 1.6), (hand[0] + math.sin(a) * 1.6, hand[1] - math.cos(a) * 1.6), B[3], B[0])

def w_claw(L, P, S, hand):
    for k in (-1, 0, 1):
        a = math.radians(-30 + k * 25 + (P.strike * 60 if P.anim == 'atk' else 60))
        seg(L, P, hand, (hand[0] + math.cos(a) * 4, hand[1] + math.sin(a) * 4), IV[3], IV[0])

def w_trident(L, P, S, hand):
    w_spear(L, P, dict(S), hand)


# ---------------------------------------------------------------- extras on bipeds
def x_wings(L, P, S, cx, cy, r, sh_y, hip_y, tw):
    flap = [1, 0, -1, 0, 1, 0][P.f % 6]
    wr = S.get('wingrp', mix(('red', 0), ('red', 1), ('violet', 1), ('red', 2)))
    if P.view == 'S': return
    for s in ((-1, 1) if not P.side else (-1,)):
        x0 = s * tw * 0.5 if not P.side else -2
        pts = [(x0, sh_y + 2), (x0 + s * 9, sh_y - 6 - flap * 3), (x0 + s * 14, sh_y - 1 - flap * 2), (x0 + s * 10, sh_y + 3), (x0 + s * 6, sh_y + 6)]
        shade(L, Pg(P, pts), wr)

def x_tail(L, P, S, cx, cy, r, sh_y, hip_y, tw):
    if P.view == 'S': return
    sw = math.sin(P.ph) * 2
    seg(L, P, (-2 if P.side else 0, hip_y), (-8 + sw if P.side else sw, hip_y + 4), S['skin'][2], S['skin'][0])
    dot(L, P, (-9 + sw if P.side else sw), hip_y + 4, S['skin'][3], S['skin'][0], 2, 2)

def x_core(L, P, S, cx, cy, r, sh_y, hip_y, tw):
    if P.view == 'N': return
    g = S.get('glowrp', SK)
    c = ((1.5 if P.side else 0), (sh_y + hip_y) / 2)
    shade(L, E(P, c[0], c[1], 2.6, 2.6), g, edge=False); dot(L, P, c[0] - 1, c[1] - 1, g[-1], g[0])
    for k in range(3): dot(L, P, -tw * 0.5 + k * tw * 0.5, sh_y + 2, S['skin'][-1], S['skin'][0])   # mossy/ore studs

def x_ribs(L, P, S, cx, cy, r, sh_y, hip_y, tw):
    if P.view != 'S': return
    for k in range(3):
        y = sh_y + 2 + k * 2.4
        seg(L, P, (-tw * 0.7, y), (tw * 0.7, y), OUTL)
    seg(L, P, (0, sh_y + 1), (0, hip_y - 1), IV[1], OUTL)

def x_moss(L, P, S, cx, cy, r, sh_y, hip_y, tw):
    for k, (dx, dy) in enumerate(((-0.6, 0.2), (0.4, 0.5), (0.1, 0.1))):
        shade(L, E(P, dx * tw, sh_y + (hip_y - sh_y) * dy, 2.2, 1.4), G, edge=False)

def x_rags(L, P, S, cx, cy, r, sh_y, hip_y, tw):
    if P.view == 'N': return
    for k in range(3): seg(L, P, (-tw * 0.8 + k * tw * 0.8, hip_y), (-tw * 0.8 + k * tw * 0.8 + 0.6, hip_y + 4 - k), B[1], B[0])


# ---------------------------------------------------------------- quadruped heads + tails
def qh_wolf(L, P, S, at):
    x, y = at; fur = S['rp']; m = S.get('muzzle', C)
    open_ = P.strike > 0.5
    if P.side:
        shade(L, E(P, x, y, 5.2, 4.2), fur)
        shade(L, Pg(P, [(x + 2, y - 1), (x + 9, y + 0.5), (x + 9, y + 2.4), (x + 2, y + 3)]), m)
        if open_: shade(L, Pg(P, [(x + 3, y + 3), (x + 8, y + 3.6), (x + 3, y + 5)]), m); dot(L, P, x + 7, y + 2.6, IV[3], IV[0])
        shade(L, Pg(P, [(x - 2.5, y - 2.5), (x + 0.5, y - 3), (x - 1.5, y - 8)]), fur)
        dot(L, P, x + 3, y - 1, S.get('eye', GD[4]), OUTL); dot(L, P, x + 9, y + 0.6, OUTL, OUTL)
    elif P.view == 'S':
        for s in (-1, 1): shade(L, Pg(P, [(x + s * 2, y - 3.5), (x + s * 5, y - 3), (x + s * 4.2, y - 9)]), fur)
        shade(L, E(P, x, y, 5.4, 4.6), fur)
        shade(L, E(P, x, y + 2.6, 3, 2.4 + (1 if open_ else 0)), m)
        dot(L, P, x - 0.5, y + 1.2, OUTL, OUTL, 2, 1)
        eyes(L, P, x, y - 1, 2.4, S.get('eye', GD[4]), glow=S.get('eye', GD[4]))
    else:
        for s in (-1, 1): shade(L, Pg(P, [(x + s * 2, y - 3), (x + s * 5, y - 2.5), (x + s * 4.2, y - 8.5)]), fur)
        shade(L, E(P, x, y, 5.2, 4.2), fur)
    if S.get('mane') and P.view != 'N':
        shade(L, E(P, x - (3 if P.side else 0), y + 3.6, 5.4 if not P.side else 4, 3), S['mane'], edge=False)

def qh_bear(L, P, S, at):
    x, y = at; fur = S['rp']
    if P.side:
        shade(L, E(P, x, y, 6, 5.4), fur); shade(L, E(P, x + 5, y + 1.4, 3.4, 2.6), S.get('muzzle', C))
        shade(L, E(P, x - 2.5, y - 4.6, 2, 2), fur); dot(L, P, x + 2.5, y - 1, OUTL, OUTL); dot(L, P, x + 8, y + 0.6, OUTL, OUTL)
    else:
        for s in (-1, 1): shade(L, E(P, x + s * 4.8, y - 4.6, 2.2, 2.2), fur)
        shade(L, E(P, x, y, 6.6, 5.6), fur)
        if P.view == 'S':
            shade(L, E(P, x, y + 2.2, 3.2, 2.4 + P.strike), S.get('muzzle', C)); dot(L, P, x - 0.5, y + 1.2, OUTL, OUTL, 2, 1)
            eyes(L, P, x, y - 1.4, 2.6, OUTL)

def qh_boar(L, P, S, at):
    x, y = at; fur = S['rp']
    if P.side:
        shade(L, E(P, x, y, 5, 4.4), fur); shade(L, Pg(P, [(x + 2, y - 1), (x + 9, y + 0.5), (x + 9, y + 3.4), (x + 2, y + 3)]), S.get('muzzle', RO))
        dot(L, P, x + 7, y + 3.4, IV[3], IV[0], 1, 2); dot(L, P, x + 7, y + 2.2, IV[3], IV[0])
        shade(L, Pg(P, [(x - 2, y - 2.8), (x + 1, y - 3.4), (x - 2, y - 6.4)]), fur); dot(L, P, x + 2.6, y - 1, OUTL, OUTL)
    else:
        for s in (-1, 1): shade(L, Pg(P, [(x + s * 2, y - 3), (x + s * 5, y - 2.6), (x + s * 4.6, y - 6.6)]), fur)
        shade(L, E(P, x, y, 5.6, 4.6), fur)
        if P.view == 'S':
            shade(L, E(P, x, y + 2.4, 3, 2.2), S.get('muzzle', RO)); dot(L, P, x - 1.5, y + 2, OUTL, OUTL); dot(L, P, x + 1, y + 2, OUTL, OUTL)
            for s in (-1, 1): dot(L, P, x + s * 3.4, y + 2.6, IV[3], IV[0], 1, 3)
            eyes(L, P, x, y - 1.2, 2.4, RD[3], glow=RD[3])
    if P.view != 'S':   # bristle mane
        for k in range(4): dot(L, P, x - 4 - k * 2.4 if P.side else x - 3 + k * 2, y - 4.6 - (k % 2), S['mane'][2] if S.get('mane') else fur[1], fur[0], 1, 2)

def qh_rat(L, P, S, at):
    x, y = at; fur = S['rp']
    if P.side:
        shade(L, Pg(P, [(x - 3, y - 3), (x + 2, y - 3), (x + 8, y + 1.4), (x + 2, y + 3), (x - 3, y + 2.4)]), fur)
        shade(L, E(P, x - 1, y - 3.4, 2.2, 2.2), RO); dot(L, P, x + 2.5, y - 1, OUTL, OUTL); dot(L, P, x + 8, y + 1, RO[1], OUTL)
    else:
        for s in (-1, 1): shade(L, E(P, x + s * 4, y - 3.4, 2.4, 2.4), RO)
        shade(L, E(P, x, y, 4.6, 4), fur)
        if P.view == 'S': shade(L, E(P, x, y + 2.6, 1.8, 1.4), RO, edge=False); eyes(L, P, x, y - 0.6, 2.2, RD[3], glow=RD[3]); dot(L, P, x - 0.5, y + 3.6, IV[3], IV[0], 2, 1)

def t_bushy(L, P, S, at):
    x, y = at; sw = math.sin(P.ph) * 2
    if P.side: shade(L, Pg(P, [(x + 1, y - 1), (x - 6, y - 4 + sw), (x - 10, y + 1 + sw), (x - 4, y + 3)]), S['rp'])
    elif P.view == 'N': shade(L, Pg(P, [(x - 2.4, y), (x + 2.4, y), (x + 3 + sw, y + 8), (x + sw, y + 11), (x - 3 + sw, y + 8)]), S['rp'])

def t_thin(L, P, S, at):
    x, y = at; sw = math.sin(P.ph) * 2
    if P.side: seg(L, P, (x, y + 1), (x - 6, y - 2 + sw), RO[2], RO[0]); seg(L, P, (x - 6, y - 2 + sw), (x - 11, y + 2 + sw), RO[2], RO[0])
    elif P.view == 'N': seg(L, P, (x, y + 2), (x + sw, y + 12), RO[2], RO[0])

def t_stub(L, P, S, at):
    x, y = at
    if P.side: dot(L, P, x - 1, y - 2, S['rp'][2], S['rp'][0], 2, 2)
    elif P.view == 'N': dot(L, P, x - 1, y + 2, S['rp'][2], S['rp'][0], 2, 3)


# ---------------------------------------------------------------- bug bodies
def bb_beetle(L, P, S, by, bw, bh):
    sh_ = S['rp']
    if P.side:
        shade(L, E(P, -1, by, bw * 0.9, bh * 0.65), sh_)
        shade(L, E(P, bw * 0.75, by + 1, 3.6, 3.2), [OUTL] + sh_[:3])
        if S.get('horn'): shade(L, Pg(P, [(bw * 0.9, by - 1), (bw * 1.3 + P.strike * 3, by - 6), (bw * 1.15, by + 0.5)]), sh_[1:], edge=False)
        seg(L, P, (-bw * 0.8, by - 1), (bw * 0.4, by - bh * 0.5), sh_[-1])
    else:
        front = P.view == 'S'
        shade(L, E(P, 0, by, bw, bh * 0.75), sh_)
        seg(L, P, (0, by - bh * 0.7), (0, by + bh * 0.7), sh_[0])
        if front:
            shade(L, E(P, 0, by + bh * 0.62, 4, 2.6), [OUTL] + sh_[:3]); eyes(L, P, 0, by + bh * 0.6, 2.2, S.get('eye', GD[4]), glow=S.get('eye', GD[4]))
            if S.get('horn'): shade(L, Pg(P, [(-1.4, by + bh * 0.4), (1.4, by + bh * 0.4), (0, by - bh * 0.5 - P.strike * 3)]), sh_[1:], edge=False)
        dot(L, P, -bw * 0.5, by - bh * 0.35, sh_[-1], sh_[0], 2, 1)

def bb_crab(L, P, S, by, bw, bh):
    sh_ = S['rp']; up = P.strike * 5 - P.wind * 2 + (math.sin(P.ph) if P.anim == 'idle' else 0)
    shade(L, E(P, 0, by, bw if not P.side else bw * 0.7, bh * 0.7), sh_)
    for s in ((-1, 1) if not P.side else (1,)):
        base = (s * bw * 0.85 if not P.side else bw * 0.6, by - 1)
        claw = (base[0] + s * 4 if not P.side else base[0] + 5, by - 6 - up)
        shade(L, Cap(P, base, claw, 2.4), sh_)
        shade(L, E(P, claw[0], claw[1] - 1.5, 3.2, 2.6), sh_)
        seg(L, P, (claw[0], claw[1] - 1.5), (claw[0] + (s if not P.side else 1) * 2.6, claw[1] - 3.4 - up * 0.2), OUTL)
    if P.view != 'N':
        for s in ((-1, 1) if not P.side else (1,)):
            ex = s * 2.6 if not P.side else bw * 0.4
            seg(L, P, (ex, by - bh * 0.5), (ex, by - bh * 0.5 - 3), sh_[1]); dot(L, P, ex, by - bh * 0.5 - 4, OUTL, OUTL)

def bb_spider(L, P, S, by, bw, bh):
    sh_ = S['rp']
    if P.side:
        shade(L, E(P, -bw * 0.5, by - 1, bw * 0.75, bh * 0.75), sh_)
        shade(L, E(P, bw * 0.4, by + 1, 4, 3.4), sh_)
        dot(L, P, bw * 0.6, by, RD[3], RD[0]); dot(L, P, bw * 0.75, by + 1.6, RD[3], RD[0])
    else:
        front = P.view == 'S'
        if front:
            shade(L, E(P, 0, by - 3, bw * 0.8, bh * 0.7), sh_)
            shade(L, E(P, 0, by + 2.5, 4.6, 3.6), sh_)
            for dx, dy in ((-1.6, 1.6), (1.6, 1.6), (-2.8, 2.8), (2.8, 2.8)): dot(L, P, dx - 0.5, by + dy, RD[3], RD[0])
            if P.strike > 0.5:
                for s in (-1, 1): seg(L, P, (s * 1.2, by + 5), (s * 1.6, by + 7.4), IV[3], IV[0])
        else:
            shade(L, E(P, 0, by - 1, bw * 0.85, bh * 0.8), sh_)
            for k in range(2): seg(L, P, (-3 + k * 6, by - 4), (-2 + k * 4, by + 2), S.get('mark', RD)[2])

def bb_bee(L, P, S, by):
    rp = S['rp']; st = S.get('stripe', mix(('stone', 0), ('stone', 1), ('stone', 1)))
    shade(L, E(P, -2 if P.side else 0, by + 3, 5 if P.side else 4, 5), rp)
    for k in range(2): shade(L, Pg(P, [(-5, by + 1.6 + k * 3), (4, by + 1.6 + k * 3), (4, by + 2.6 + k * 3), (-5, by + 2.6 + k * 3)]) & E(P, -2 if P.side else 0, by + 3, 5 if P.side else 4, 5), st, edge=False)
    shade(L, E(P, 3 if P.side else 0, by - 3, 3.4, 3.2), st)
    if P.view != 'N': eyes(L, P, 3.6 if P.side else 0, by - 3.4, 1.6 if not P.side else 0, S.get('eye', R['white'][2]), big=False, glow=S.get('eye', R['white'][2]))
    dot(L, P, -6 if P.side else -0.5, by + 7.6 if not P.side else by + 5, IV[3], IV[0], 1, 2)   # stinger

def fb_bat(L, P, S, by):
    rp = S['rp']
    shade(L, E(P, 0, by, 4.4, 4.6), rp)
    for s in ((-1, 1) if not P.side else (1,)):
        x = s * 2.4 if not P.side else 1
        shade(L, Pg(P, [(x - 1.4, by - 3), (x + 1.4, by - 3), (x + s * 1.2 if not P.side else x + 1, by - 7.4)]), rp)
    if P.view != 'N':
        eyes(L, P, 1.4 if P.side else 0, by - 0.6, 1.6 if not P.side else 0, RD[3], glow=RD[3])
        if not P.side:
            for s in (-1, 1): dot(L, P, s * 1.0 - 0.5, by + 2.4, IV[3], IV[0], 1, 2)


# ---------------------------------------------------------------- plant crests
def cr_leaf(L, P, S, sway, top):
    lf = S.get('leaf', G)
    for s, h in ((-1, 7), (1, 8)):
        shade(L, Pg(P, [(sway * 0.5, top + 3), (sway + s * 6, top - h * 0.4), (sway + s * 4, top - h), (sway + s * 1, top - 1)]), lf)
    seg(L, P, (sway * 0.4, top + 3), (sway * 0.6, top - 3), lf[1])

def cr_bloom(L, P, S, sway, top):
    pet = S.get('petal', RO); lf = S.get('leaf', G)
    for a in range(6):
        ang = a / 6 * 2 * math.pi + sway * 0.1
        shade(L, E(P, sway + math.cos(ang) * 6.4, top + 4 + math.sin(ang) * 4.2, 3.8, 3.0), pet)
    shade(L, E(P, sway, top + 4, 3.6, 2.8), GD, edge=False)
    for s in (-1, 1): shade(L, Pg(P, [(s * 4, top + 14), (s * 12, top + 12 + sway), (s * 8, top + 17)]), lf)

def cr_cap(L, P, S, sway, top):
    cap = S.get('cap', RD); w = S.get('capw', 12)
    pts = [(sway - w, top + 8)] + [(sway + math.cos(math.pi + k / 10 * math.pi) * w, top + 8 + math.sin(math.pi + k / 10 * math.pi) * 9) for k in range(11)] + [(sway + w, top + 8)]
    shade(L, Pg(P, pts), cap)
    if P.view != 'N' or True:
        for dx, dy, r in ((-5, 3, 1.6), (3, 1.4, 2.0), (6.4, 5.4, 1.2), (-1, 6, 1.2)):
            shade(L, E(P, sway + dx, top + dy, r, r * 0.8), IV, edge=False)

def cr_pumpkin(L, P, S, sway, top):
    shade(L, Cap(P, (sway, top + 4), (sway + 1.6, top - 2), 2.2), G, light=3, mid=2, dark=1, edge=False)
    shade(L, Pg(P, [(sway + 1.4, top - 0.6), (sway + 7, top - 3), (sway + 4, top + 1.6)]), G)

def cr_cactus(L, P, S, sway, top):
    for s in (-1, 1):
        arm = [(s * 7.6, top + 12), (s * 11, top + 11), (s * 11.4, top + 4 - (P.strike * 3 if s > 0 else 0))]
        shade(L, Cap(P, arm[0], arm[1], 3.6) | Cap(P, arm[1], arm[2], 3.6), S['rp'])
    shade(L, E(P, sway, top + 1.4, 2.6, 2.0), RO, edge=False); dot(L, P, sway - 0.5, top + 1, GD[4], GD[0])


def pumpkin_body(L, P, S):   # carved-face pumpkin with a vine body
    pass


def centipede(L, P, S):
    """segmented crawler: a chain of shell segments with legs, rising at the head in the attack"""
    rp = S['rp']; n = 7
    pts = []
    for k in range(n):
        t = k / (n - 1)
        wig = math.sin(P.ph + t * 4) * 2.2
        rise = (t ** 2) * (10 + P.strike * 10)
        if P.side: pts.append((-16 + t * 26, -3 - rise + wig * 0.3))
        else: pts.append((wig, -3 - t * (P.view == 'S' and 18 or 14) - rise * 0.5))
    order = range(n) if P.view != 'S' else range(n - 1, -1, -1)
    for k in order:
        x, y = pts[k]
        for s in ((-1, 1) if not P.side else (1,)):
            lx = x + (s * 7 if not P.side else 0); seg(L, P, (x, y), (lx + (0 if not P.side else 1.5), y + 3 + (k % 2)), rp[1], rp[0])
        shade(L, E(P, x, y, 4.6 if not P.side else 4.0, 3.6), rp)
    hx, hy = pts[-1]
    if P.view != 'N':
        for s in ((-1, 1) if not P.side else (1,)):
            seg(L, P, (hx + s * 1.4 + (2 if P.side else 0), hy - 2.6), (hx + s * 4 + (5 if P.side else 0), hy - 6.6), rp[2], rp[0])
        eyes(L, P, hx + (2 if P.side else 0), hy - 0.6, 1.8 if not P.side else 0, GD[4], glow=GD[4])
        if P.strike > 0.5 and not P.side:
            for s in (-1, 1): seg(L, P, (hx + s * 1.6, hy + 2), (hx + s * 2.6, hy + 4.6), IV[3], IV[0])


def pumpkinkin(L, P, S):
    """pumpkin head on a vine body"""
    hop = {'walk': [0, -2, -3, -2, 0, 0], 'atk': [0, 1, -3, -1, 0]}.get(P.anim, [0] * 6)[P.f]
    lf = G
    for s in (-1, 1):   # vine legs
        seg(L, P, (s * 2, -14 + hop), (s * 5 + math.sin(P.ph) * s, -0.6), lf[2], lf[0]); seg(L, P, (s * 2.4, -14 + hop), (s * 6.4, -6 + hop), lf[3], lf[0])
    cy = -22 + hop
    for dx in (-5, 5, 0):
        shade(L, E(P, dx * (0.6 if P.side else 1), cy, 6.2, 8), S['rp'])
    if P.view != 'N':
        gl = GD
        fx = 2.6 if P.side else 0
        for s in ((-1, 1) if not P.side else (1,)):
            shade(L, Pg(P, [(fx + s * 4.4 - 2, cy - 1), (fx + s * 4.4 + 2, cy - 1), (fx + s * 4.4, cy - 4)]), [gl[0], gl[3], gl[4], gl[4]], edge=False)
        mo = 1.2 + P.strike * 1.6
        shade(L, Pg(P, [(fx - 5, cy + 2.4), (fx + 5, cy + 2.4), (fx + 3, cy + 3.6 + mo), (fx, cy + 2.6 + mo), (fx - 3, cy + 3.6 + mo)]), [gl[0], gl[3], gl[4], gl[4]], edge=False)
    cr_pumpkin(L, P, S, 0, cy - 8)


# ================================================================ the catalogue
def biped_kind(skin, h, draw_head, **kw):
    d = dict(arch=biped, skin=skin, h=h, draw_head=draw_head); d.update(kw); return d

KINDS = {
    # ---- blobs / spirits
    'slime':     dict(arch=blob, rp=mix(('green', 0), ('green', 2), ('green', 3), ('green', 4), ('green', 5)), w=12, h=18, frame=(64, 64), anchor=(32, 56)),
    'jelly':     dict(arch=blob, rp=mix(('rose', 0), ('rose', 1), ('rose', 2), ('rose', 3), ('white', 2)), w=13, h=21, frame=(64, 64), anchor=(32, 56)),
    'kingjelly': dict(arch=blob, rp=mix(('rose', 0), ('rose', 1), ('rose', 2), ('rose', 3), ('white', 2)), w=13, h=21, crown=True, core=SK, frame=(64, 64), anchor=(32, 56)),
    'ghost':     dict(arch=ghost, rp=mix(('stone', 2), ('ivory', 1), ('ivory', 2), ('ivory', 3), ('white', 2)), h=32, w=11, frame=(64, 64), anchor=(32, 60), hood=None),
    'wraith':    dict(arch=ghost, rp=mix(('violet', 0), ('stone', 2), ('stone', 3), ('stone', 4), ('ivory', 3)), h=34, w=11, eye=R['sky'][3], hood=mix(('violet', 0), ('violet', 1), ('violet', 1), ('violet', 2)), frame=(64, 64), anchor=(32, 60)),
    'wisp':      dict(arch=wisp, rp=mix(('teal', 0), ('teal', 2), ('teal', 3), ('green', 5), ('white', 2)), frame=(64, 64), anchor=(32, 56), flyer=True),
    # ---- plants
    'sprout':    dict(arch=plant, rp=mix(('green', 0), ('green', 2), ('green', 3), ('green', 4), ('green', 5)), h=22, w=9, crest=cr_leaf, frame=(64, 64), anchor=(32, 56)),
    'bloom':     dict(arch=plant, rp=mix(('green', 0), ('green', 1), ('green', 2), ('green', 3), ('green', 4)), h=34, w=9, crest=cr_bloom, maw=True, stem=4.2, petal=mix(('gold', 0), ('gold', 2), ('gold', 3), ('gold', 4)), frame=(96, 96), anchor=(48, 88)),
    'mushroom':  dict(arch=plant, rp=mix(('cream', 0), ('cream', 1), ('cream', 2), ('cream', 3), ('cream', 4)), h=24, w=7, crest=cr_cap, cap=mix(('blue', 0), ('blue', 1), ('blue', 2), ('blue', 3), ('blue', 4)), frame=(64, 64), anchor=(32, 56)),
    'cactus':    dict(arch=plant, rp=mix(('green', 0), ('green', 1), ('green', 2), ('green', 3), ('green', 4)), h=30, w=7.4, crest=cr_cactus, maw=True, frame=(64, 64), anchor=(32, 56)),
    'pumpkin':   dict(arch=pumpkinkin, rp=mix(('copper', 0), ('copper', 1), ('copper', 2), ('copper', 3), ('gold', 3)), frame=(64, 64), anchor=(32, 58)),
    'treant':    biped_kind(mix(('brown', 0), ('brown', 1), ('brown', 2), ('brown', 3), ('brown', 4)), 46, h_tree, head=20, bw=8, lw=5, aw=4.6, leaf=G, extra=x_moss, frame=(96, 96), anchor=(48, 90)),
    # ---- beasts
    'wolf':      dict(arch=quad, rp=mix(('stone', 0), ('stone', 1), ('stone', 2), ('stone', 3), ('stone', 4)), h=24, len=28, bh=12, legh=9, qhead=qh_wolf, tail=t_bushy, belly=mix(('stone', 1), ('stone', 3), ('stone', 4), ('cream', 3)), frame=(64, 64), anchor=(32, 58)),
    'jackal':    dict(arch=quad, rp=mix(('brown', 1), ('brown', 3), ('brown', 4), ('cream', 2), ('cream', 3)), h=22, len=26, bh=10, legh=9, qhead=qh_wolf, tail=t_bushy, eye=RD[3], frame=(64, 64), anchor=(32, 58)),
    'bear':      dict(arch=quad, rp=mix(('brown', 0), ('brown', 1), ('brown', 2), ('brown', 3), ('brown', 4)), h=30, len=34, bh=17, legh=10, lw=5, w=13, qhead=qh_bear, tail=t_stub, muzzle=mix(('cream', 0), ('cream', 1), ('cream', 2), ('cream', 3)), frame=(64, 64), anchor=(32, 58)),
    'boar':      dict(arch=quad, rp=mix(('brown', 0), ('brown', 1), ('brown', 2), ('roof', 3), ('brown', 4)), h=24, len=28, bh=14, legh=7, lw=3.4, qhead=qh_boar, tail=t_stub, mane=mix(('green', 0), ('green', 2), ('green', 3)), frame=(64, 64), anchor=(32, 58)),
    'rat':       dict(arch=quad, rp=mix(('stone', 0), ('stone', 1), ('stone', 2), ('stone', 3), ('stone', 4)), h=16, len=20, bh=9, legh=5, lw=2.4, qhead=qh_rat, tail=t_thin, frame=(64, 64), anchor=(32, 58)),
    # ---- bugs
    'beetle':    dict(arch=bug, rp=mix(('copper', 0), ('copper', 1), ('copper', 2), ('copper', 3), ('gold', 3)), h=18, w=11, lift=3, horn=True, body=bb_beetle, frame=(64, 64), anchor=(32, 58)),
    'crab':      dict(arch=bug, rp=mix(('red', 0), ('red', 1), ('red', 2), ('red', 3), ('rose', 3)), h=16, w=11, lift=3, legs=3, body=bb_crab, legrp=mix(('red', 0), ('red', 1), ('red', 2)), frame=(64, 64), anchor=(32, 58)),
    'spider':    dict(arch=bug, rp=mix(('stone', 0), ('violet', 0), ('stone', 1), ('stone', 2), ('violet', 2)), h=20, w=10, lift=5, legs=4, body=bb_spider, frame=(64, 64), anchor=(32, 58)),
    'centipede': dict(arch=centipede, rp=mix(('red', 0), ('red', 1), ('red', 2), ('copper', 3), ('gold', 3)), frame=(96, 96), anchor=(48, 88)),
    'bee':       dict(arch=flyer, rp=mix(('gold', 0), ('gold', 2), ('gold', 3), ('gold', 4)), wing=mix(('stone', 2), ('sky', 2), ('sky', 3), ('white', 2)), span=10, fbody=bb_bee, frame=(64, 64), anchor=(32, 56), flyer=True),
    'moth':      dict(arch=flyer, rp=mix(('violet', 0), ('violet', 1), ('violet', 2), ('violet', 3)), wing=mix(('violet', 0), ('violet', 1), ('violet', 2), ('sky', 2), ('sky', 3)), span=13, fbody=bb_bee, stripe=mix(('stone', 0), ('violet', 0), ('violet', 1)), eye=R['sky'][3], frame=(64, 64), anchor=(32, 56), flyer=True),
    'bat':       dict(arch=flyer, rp=mix(('violet', 0), ('violet', 1), ('violet', 2), ('violet', 3)), wing=mix(('violet', 0), ('stone', 1), ('violet', 1), ('violet', 2)), span=14, fbody=fb_bat, frame=(64, 64), anchor=(32, 56), flyer=True),
    'snake':     dict(arch=serpent, rp=mix(('green', 0), ('green', 2), ('green', 3), ('green', 4), ('gold', 3)), frame=(64, 64), anchor=(32, 58)),
    'viper':     dict(arch=serpent, rp=mix(('violet', 0), ('violet', 1), ('violet', 2), ('stone', 3), ('gold', 3)), hood=mix(('violet', 0), ('violet', 1), ('violet', 2), ('gold', 3)), eye=RD[3], frame=(64, 64), anchor=(32, 58)),
    # ---- humanoids
    'goblin':    biped_kind(mix(('green', 0), ('green', 2), ('green', 3), ('green', 4), ('green', 5)), 34, h_goblin, cloth=mix(('brown', 0), ('brown', 1), ('brown', 2), ('brown', 3)), belt=B, weapon=w_club, legrp=mix(('brown', 0), ('brown', 1), ('brown', 2), ('brown', 3)), frame=(64, 64), anchor=(32, 58)),
    'orc':       biped_kind(mix(('teal', 0), ('teal', 1), ('teal', 2), ('teal', 3), ('green', 4)), 44, h_orc, bw=7.4, lw=4.2, aw=4.0, cloth=mix(('stone', 0), ('stone', 1), ('stone', 2), ('stone', 3), ('stone', 4)), belt=RD, weapon=w_axe, legrp=mix(('brown', 0), ('brown', 1), ('brown', 2), ('brown', 3)), frame=(64, 64), anchor=(32, 58)),
    'skeleton':  biped_kind(mix(('ivory', 0), ('ivory', 1), ('ivory', 2), ('ivory', 3), ('white', 2)), 40, h_skull, bw=5, lw=2.0, aw=1.8, weapon=w_blade, extra=x_ribs, frame=(64, 64), anchor=(32, 58)),
    'boneknight':biped_kind(mix(('ivory', 0), ('ivory', 1), ('ivory', 2), ('ivory', 3), ('white', 2)), 42, h_skull, helm=True, glow=RD[3], bw=6, lw=2.4, aw=2.2, cloth=mix(('stone', 0), ('stone', 1), ('stone', 2), ('stone', 3), ('stone', 4)), weapon=w_blade, frame=(64, 64), anchor=(32, 58)),
    'zombie':    biped_kind(mix(('teal', 0), ('stone', 2), ('teal', 2), ('teal', 3), ('green', 4)), 40, h_zombie, stoop=2, armdrop=-6, cloth=mix(('brown', 0), ('brown', 1), ('brown', 2), ('brown', 3)), legrp=mix(('brown', 0), ('brown', 1), ('brown', 2), ('brown', 3)), extra=x_rags, frame=(64, 64), anchor=(32, 58)),
    'imp':       biped_kind(mix(('red', 0), ('red', 1), ('red', 2), ('red', 3), ('rose', 3)), 26, h_imp, head=10, bw=4.6, lw=2.6, aw=2.4, weapon=w_trident, extra=lambda *a: (x_wings(*a), x_tail(*a)), frame=(64, 64), anchor=(32, 58)),
    'minotaur':  biped_kind(mix(('roof', 0), ('roof', 1), ('roof', 2), ('roof', 3), ('roof', 4)), 50, h_bull, head=16, bw=8.4, lw=4.8, aw=4.6, cloth=mix(('brown', 0), ('brown', 1), ('brown', 2), ('brown', 3)), belt=GD, weapon=w_axe, frame=(96, 96), anchor=(48, 90)),
    'werewolf':  biped_kind(mix(('stone', 0), ('brown', 0), ('brown', 1), ('brown', 2), ('brown', 3)), 44, h_wolfman, head=14, stoop=2.5, bw=7, lw=4, aw=3.6, snout=mix(('brown', 1), ('brown', 2), ('brown', 3), ('cream', 2)), weapon=w_claw, frame=(64, 64), anchor=(32, 58)),
    'frogman':   biped_kind(mix(('green', 0), ('green', 1), ('green', 2), ('green', 3), ('green', 4)), 36, h_frog, head=13, bw=6.4, lw=3.6, aw=2.8, cloth=mix(('brown', 0), ('brown', 1), ('brown', 2), ('brown', 3)), weapon=w_spear, frame=(64, 64), anchor=(32, 58)),
    'golem':     biped_kind(mix(('stone', 0), ('stone', 1), ('stone', 2), ('stone', 3), ('stone', 4)), 50, h_golem, head=11, bw=10, lw=6, aw=6, neck=-2, extra=x_core, frame=(96, 96), anchor=(48, 90)),
    'automaton': biped_kind(mix(('copper', 0), ('copper', 1), ('copper', 2), ('copper', 3), ('gold', 3)), 40, h_bot, head=11, bw=7.6, lw=3.6, aw=3.6, cloth=mix(('stone', 0), ('stone', 1), ('stone', 2), ('stone', 3), ('stone', 4)), glowrp=TE, extra=x_core, weapon=w_club, frame=(64, 64), anchor=(32, 58)),
}


# size factor per kind: drawn at the size the monsters had on screen before (old LPC sheet area / new), so the
# per-monster scale in content stays close to 1 and the pixel density matches the characters
K = {'automaton': 1.5, 'bat': 1.0, 'bear': 1.5, 'bee': 1.05, 'beetle': 1.2, 'bloom': 1.1, 'boneknight': 1.25, 'cactus': 1.3,
     'centipede': 1.3, 'crab': 1.15, 'frogman': 1.05, 'ghost': 1.1, 'goblin': 1.35, 'golem': 1.35, 'imp': 1.4, 'jelly': 1.0,
     'kingjelly': 1.0, 'minotaur': 1.2, 'moth': 1.0, 'mushroom': 1.0, 'orc': 1.1, 'pumpkin': 1.15, 'rat': 1.6, 'skeleton': 1.4,
     'slime': 1.0, 'snake': 1.15, 'spider': 1.35, 'sprout': 1.4, 'treant': 1.25, 'viper': 1.1, 'werewolf': 1.1, 'wisp': 1.4,
     'wolf': 1.45, 'wraith': 1.1, 'zombie': 1.35}
for _k, _v in K.items(): KINDS[_k]['k'] = _v