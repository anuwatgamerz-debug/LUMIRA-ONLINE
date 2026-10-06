#!/usr/bin/env python3
# LPC monster sheets -> LUMIRA px sheets (rows N,W,S,E; cols idle4 walk6 atk5 hit2 die5)
import sys, json, os
from PIL import Image, ImageOps
B = '/home/claude/lpcw'
M = B + '/x/lpc-monsters/lpc-monsters/'
DST = sys.argv[1] if len(sys.argv) > 1 else '/tmp/mout'
os.makedirs(DST, exist_ok=True)
CNT = [('idle', 4, 5, 1), ('walk', 6, 9, 1), ('atk', 5, 11, 0), ('hit', 2, 8, 0), ('die', 5, 9, 0)]
_c = {}
def L(p):
    if p not in _c: _c[p] = Image.open(p).convert('RGBA')
    return _c[p]
def C(p, x, y, w, h): return L(p).crop((x, y, x + w, y + h))
def grid(p, cw, ch):
    return lambda c, r, w=None, h=None: C(p, c * cw, r * ch, w or cw, h or ch)
def fit(lst, n): return [lst[min(len(lst) - 1, int(i * len(lst) / n))] for i in range(n)]
def fade(lst):
    out = []
    for i, im in enumerate(lst):
        a = 1 - i / len(lst) * 0.85; im = im.copy(); al = im.getchannel('A').point(lambda v: int(v * a)); im.putalpha(al); out.append(im)
    return out
def build(name, fw, fh, dirs, die_fade=False, colorize=None):
    """dirs: {'N':{anim:[crops]}, ...}; crops are bottom-centre aligned into fw x fh cells"""
    ncol = sum(c[1] for c in CNT)
    sheet = Image.new('RGBA', (ncol * fw, 4 * fh))
    low = 0
    for r, d in enumerate('NWSE'):
        col = 0
        for an, n, fps, loop in CNT:
            fr = fit(dirs[d][an], n)
            if an == 'die' and die_fade: fr = fade(fr)
            for im in fr:
                x = col * fw + (fw - im.width) // 2; y = r * fh + fh - im.height
                sheet.alpha_composite(im, (x, y)); col += 1
    if colorize: sheet = colorize(sheet)
    # feet: lowest opaque row of the S idle frames
    bb = sheet.crop((0, 2 * fh, 4 * fw, 3 * fh)).getbbox()
    ay = (bb[3] if bb else fh) - 1
    sheet.save(f'{DST}/{name}.png')
    anims = {}; c0 = 0
    for an, n, fps, loop in CNT: anims[an] = [c0, n, fps, loop]; c0 += n
    return name, {'fw': fw, 'fh': fh, 'ppt': 32, 'ax': fw // 2, 'ay': ay, 'dirs': 4, 'anims': anims}

def same4(d): return {k: d for k in 'NWSE'}
out = {}
def add(r): out[r[0]] = r[1]

# slime: row0/2 jump (6), row1/3 crawl (8); not directional
g = grid(M + 'slime.png', 64, 64)
add(build('m_lpc_slime', 64, 64, same4({'idle': [g(i, 1) for i in range(4)], 'walk': [g(i, 1) for i in range(8)],
    'atk': [g(i, 0) for i in range(6)], 'hit': [g(3, 0), g(3, 0)], 'die': [g(3, 0), g(3, 2), g(3, 0), g(3, 2), g(3, 0)]}), die_fade=True))
# man eater flower: 128 cells, row0 closed bud, rows1-3 awake
g = grid(M + 'man_eater_flower.png', 128, 128)
add(build('m_lpc_flower', 128, 128, same4({'idle': [g(i, 2) for i in range(3)], 'walk': [g(i, 2) for i in range(3)] + [g(i, 1) for i in range(3)],
    'atk': [g(3, 1), g(4, 1), g(5, 1), g(4, 3), g(5, 3)], 'hit': [g(3, 3), g(3, 3)], 'die': [g(i, 0) for i in range(5)]}), die_fade=True))
# snake / bat / ghost: rows N W S E, 64 cells
def dir4(p, cw, ch, idle, walk, atk, hit, die, rows='NWSE'):
    g = grid(p, cw, ch); d = {}
    for r, k in enumerate(rows):
        d[k] = {'idle': [g(c, r) for c in idle], 'walk': [g(c, r) for c in walk], 'atk': [g(c, r) for c in atk], 'hit': [g(c, r) for c in hit], 'die': [g(c, r) for c in die]}
    return d
add(build('m_lpc_snake', 64, 64, dir4(M + 'snake.png', 64, 64, [0, 1, 2, 3], [0, 1, 2, 3], [4, 5, 6, 0, 0], [6, 6], [3, 3, 3, 3, 3]), die_fade=True))
add(build('m_lpc_bat', 64, 64, dir4(M + 'bat.png', 64, 64, [1, 2, 3, 4], [1, 2, 3, 4], [5, 6, 5, 6, 1], [6, 6], [0, 0, 0, 0, 0]), die_fade=True))
add(build('m_lpc_ghost', 64, 64, dir4(M + 'ghost.png', 64, 64, [0, 1, 2, 1], [0, 1, 2, 1], [4, 5, 4, 5, 0], [3, 3], [3, 3, 3, 3, 3]), die_fade=True))
add(build('m_lpc_bee', 32, 32, dir4(M + 'bee.png', 32, 32, [0, 1, 2], [0, 1, 2], [3, 4, 5], [1, 1], [0, 0, 0, 0, 0], rows='SWNE'), die_fade=True))
# goblin: rows S W N E, cols 0-7 walk, 8-10 attack, row4 death
gp = B + '/goblin_0.png'; g = grid(gp, 64, 64); d = {}
for r, k in enumerate('SWNE'):
    d[k] = {'idle': [g(0, r), g(0, r), g(1, r), g(1, r)], 'walk': [g(c, r) for c in range(1, 8)], 'atk': [g(8, r), g(9, r), g(10, r), g(10, r), g(8, r)],
            'hit': [g(0, r), g(0, r)], 'die': [g(c, 4) for c in range(5)]}
add(build('m_lpc_goblin', 64, 64, d))
# imp: walk/attack 4x4 rows S N W E
gw = grid(B + '/x/LPC_imp_0/LPC imp/walk - vanilla.png', 64, 64); ga = grid(B + '/x/LPC_imp_0/LPC imp/attack - vanilla.png', 64, 64); d = {}
for r, k in enumerate('SNWE'):
    d[k] = {'idle': [gw(c, r) for c in range(4)], 'walk': [gw(c, r) for c in range(4)], 'atk': [ga(c, r) for c in range(4)], 'hit': [gw(0, r)] * 2, 'die': [gw(0, r)] * 5}
add(build('m_lpc_imp', 64, 64, d, die_fade=True))
# golem: walk 7x4 (64), atk 7x4 (64x96), die 7x2 (64)
gw = grid(B + '/golem-walk.png', 64, 64); ga = grid(B + '/golem-atk.png', 64, 96); gd = grid(B + '/golem-die.png', 64, 64); d = {}
for r, k in enumerate('NWSE'):
    d[k] = {'idle': [gw(0, r)] * 2 + [gw(1, r)] * 2, 'walk': [gw(c, r) for c in range(7)], 'atk': [ga(c, r) for c in (0, 2, 3, 4, 6)], 'hit': [gw(0, r)] * 2,
            'die': [gd(c, 1 if k == 'N' else 0) for c in range(7)]}
add(build('m_lpc_golem', 64, 96, d))
# wolf: left part 32x64 vertical (cols 0-4 S, 5-9 N), right part 64x32 side (E block y0, W block y192)
wp = B + '/wolfsheet1_0.png'
def V(c, y): return C(wp, c * 32, y, 32, 64)
def S(c, y): return C(wp, 320 + c * 64, y, 64, 32)
d = {'S': {'idle': [V(c, 64) for c in range(4)], 'walk': [V(c, 192) for c in range(5)], 'atk': [V(c, 256) for c in range(5)], 'hit': [V(0, 64)] * 2, 'die': [V(c, 0) for c in range(5)]},
     'N': {'idle': [V(5 + c, 64) for c in range(4)], 'walk': [V(5 + c, 192) for c in range(5)], 'atk': [V(5 + c, 256) for c in range(5)], 'hit': [V(5, 64)] * 2, 'die': [V(5, 0)] * 5}}
for k, y0 in (('E', 0), ('W', 192)):
    d[k] = {'idle': [S(c, y0 + 96) for c in (0, 0, 1, 1)], 'walk': [S(c, y0 + 128) for c in range(5)], 'atk': [S(c, y0 + 160) for c in range(5)], 'hit': [S(0, y0 + 96)] * 2, 'die': [S(c, y0) for c in range(4)]}
add(build('m_lpc_wolf', 64, 64, d, die_fade=True))
# beetle (grey, magenta bg, 48px cells with 1px white grid): rows S N E W; colourised brown so hue tints work
bp = B + '/beetle5.PNG'
def BC(c, r):
    im = C(bp, 2 + c * 49, 2 + r * 49, 48, 48); px = im.load()
    for y in range(48):
        for x in range(48):
            p = px[x, y]
            if p[0] > 200 and p[2] > 200 and p[1] < 60: px[x, y] = (0, 0, 0, 0)
            elif p[3] and abs(p[0] - p[1]) < 20 and abs(p[1] - p[2]) < 20:
                v = p[0] / 255; px[x, y] = (int(min(255, v * 300)), int(v * 235), int(v * 150), 255)
    return im
d = {}
for r, k in enumerate('SNEW'):
    d[k] = {'idle': [BC(0, r), BC(1, r)], 'walk': [BC(c, r) for c in range(5)], 'atk': [BC(c, r) for c in (2, 3, 4, 3, 2)], 'hit': [BC(0, r)] * 2, 'die': [BC(0, r)] * 5}
add(build('m_lpc_beetle', 64, 64, d, die_fade=True))
json.dump(out, open(DST + '/meta_px.json', 'w'), indent=1)
print(json.dumps(out)[:600])

# ---------------- pass 2: more LPC creatures (dungeons) ----------------
D2 = '/home/claude/dl2/'
AN = D2 + 'x/lpc_animals_2022_v1.1/lpc animals 2022 v1.1/individual creature spritesheets/'
def mirror(lst): return [ImageOps.mirror(i) for i in lst]
from PIL import ImageOps
def ulpc(name, path, tint_fn=None):  # Universal LPC body sheet 832x1344: spellcast 0-3, thrust 4-7, walk 8-11, slash 12-15, shoot 16-19, hurt 20
    g = grid(path, 64, 64); d = {}
    for r, k in enumerate('NWSE'):
        d[k] = {'idle': [g(0, 8 + r)] * 2 + [g(0, 12 + r)] * 2, 'walk': [g(c, 8 + r) for c in range(1, 9)], 'atk': [g(c, 12 + r) for c in range(6)],
                'hit': [g(0, 20), g(1, 20)], 'die': [g(c, 20) for c in range(6)]}
    return build(name, 64, 64, d)
add(ulpc('m_lpc_skeleton', D2 + 'skeleton_3.png'))
add(ulpc('m_lpc_zombie', D2 + 'Zombie_0.png'))
# spider: 10x5 of 64, rows N W S E + death row; cols 0-3 attack, 4-9 walk
g = grid(D2 + 'x/LPC_Spiders/LPC_Spiders/spider01.png', 64, 64); d = {}
for r, k in enumerate('NWSE'):
    d[k] = {'idle': [g(4, r), g(5, r)], 'walk': [g(c, r) for c in range(4, 10)], 'atk': [g(c, r) for c in range(4)], 'hit': [g(0, r)] * 2, 'die': [g(c, 4) for c in range(4)]}
add(build('m_lpc_spider', 64, 64, d))
# centipede: 128 cells, frames row-major 5 cols: S 0-5, N 6-11, W 12-17 (E mirrors W)
cp = D2 + 'x/lpc_centipede/[LPC] Centipede/png/lpc_centipede.png'
CF = lambda i: C(cp, (i % 5) * 128, (i // 5) * 128, 128, 128)
dirs = {'S': [CF(i) for i in range(0, 6)], 'N': [CF(i) for i in range(6, 12)], 'W': [CF(i) for i in range(12, 18)]}; dirs['E'] = mirror(dirs['W'])
d = {k: {'idle': v[:2], 'walk': v, 'atk': [v[1], v[3], v[5], v[3], v[1]], 'hit': [v[0]] * 2, 'die': [v[0]] * 5} for k, v in dirs.items()}
add(build('m_lpc_centipede', 128, 128, d, die_fade=True))
# giant rat 80x64: rows S W E N, cols 0-7 walk, 8-10 bite
g = grid(AN + 'giant rat (Sevarihk).png', 80, 64); d = {}
for r, k in enumerate('SWEN'):
    d[k] = {'idle': [g(0, r), g(1, r)], 'walk': [g(c, r) for c in range(8)], 'atk': [g(c, r) for c in (8, 9, 10, 9, 8)], 'hit': [g(0, r)] * 2, 'die': [g(0, r)] * 5}
add(build('m_lpc_rat', 80, 64, d, die_fade=True))
# mushroom walker 32px 4x4: rows S W E N
g = grid(AN + 'mushroom walker (Sevarihk).png', 32, 32); d = {}
for r, k in enumerate('SWEN'):
    d[k] = {'idle': [g(0, r), g(1, r)], 'walk': [g(c, r) for c in range(4)], 'atk': [g(c, r) for c in (1, 2, 3, 2, 1)], 'hit': [g(0, r)] * 2, 'die': [g(0, r)] * 5}
add(build('m_lpc_mushroom', 32, 32, d, die_fade=True))
# frogman 80x96: walk rows N W S E (4), attack rows 4-7 (6), death row 8 (6)
g = grid(D2 + 'frogman_1.png', 80, 96); d = {}
for r, k in enumerate('NWSE'):
    d[k] = {'idle': [g(0, r), g(0, r), g(3, r), g(3, r)], 'walk': [g(c, r) for c in range(4)], 'atk': [g(c, 4 + r) for c in range(1, 6)], 'hit': [g(0, r)] * 2, 'die': [g(c, 8) for c in range(6)]}
add(build('m_lpc_frogman', 80, 96, d))
# bear 64px 5x12: walk N0 E1 W2 S3, attack N4 E5 W6 S7, die N8 E9 W10 S11
g = grid(AN + 'bear, grizzly.png', 64, 64); d = {}
for k, (wr, ar, dr, nw, na) in {'N': (0, 4, 8, 4, 4), 'E': (1, 5, 9, 5, 3), 'W': (2, 6, 10, 5, 3), 'S': (3, 7, 11, 4, 4)}.items():
    d[k] = {'idle': [g(0, wr)] * 2 + [g(1, wr)] * 2, 'walk': [g(c, wr) for c in range(nw)], 'atk': [g(c, ar) for c in range(na)], 'hit': [g(0, wr)] * 2, 'die': [g(c, dr) for c in range(4)]}
add(build('m_lpc_bear', 64, 64, d, die_fade=True))
# 48x64 three-frame walkers (rows given), attack = lunge on the stride frames
def walker3(name, path, rows, fw=48, fh=64):
    g = grid(path, fw, fh); d = {}
    for r, k in enumerate(rows):
        d[k] = {'idle': [g(0, r)] * 4, 'walk': [g(1, r), g(0, r), g(2, r), g(0, r)], 'atk': [g(0, r), g(1, r), g(2, r), g(1, r), g(0, r)], 'hit': [g(0, r)] * 2, 'die': [g(0, r)] * 5}
    return build(name, 64, 64, d, die_fade=True)
add(walker3('m_lpc_minotaur', D2 + 'x/minotaur-1.3/PNG/48x64/minotaur-red-NESW.png', 'NESW'))
add(walker3('m_lpc_werewolf', D2 + 'werewolf-NESW_2.png', 'NESW'))
add(walker3('m_lpc_pumpkin', D2 + 'pumpkin_monster_0.png', 'SWEN', 32, 64))
json.dump(out, open(DST + '/meta_px.json', 'w'), indent=1)
print('pass2', len(out))
