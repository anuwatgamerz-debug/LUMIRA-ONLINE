"""python3 tools/art/build_characters_hd.py  -> public/assets/chr_hd/... + public/assets/chr_hd/chars.json

HD character prototype set (see docs/LUMIRA_ART_BIBLE.md, "HD Character Standard"). Only the prototype looks are
built: Adventurer M/F, Vanguard, Ranger, Arcanist, Guard, Merchant, Blacksmith (+ the armor, weapons, shields,
back items and headgear they need). Characters whose layers are not all in this set keep the 64x64 set.
"""
import json, os, sys, time
from multiprocessing import Pool
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from characters_hd import *
from lumira_art import save_png, RAMPS, Layer

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'chr_hd')
SEXES = ['male', 'female']
ARMORS = [('tunic_' + c, 'tunic', c) for c in TUNIC_COLORS] + [('leather', 'leather', None), ('chain', 'chain', None), ('plate', 'plate', None)] + \
         [('robe_' + c, 'robe', c) for c in ('blue', 'violet', 'ivory', 'brown')]
CLASSES = ['adventurer', 'vanguard', 'ranger', 'arcanist']
# A = idle/walk/sit/interact, B = attack/cast/hit/death, C = B posed for a bow (both arms draw the string)
GROUPS = {'a': ['idle', 'walk', 'sit', 'interact'], 'b': ['attack', 'cast', 'hit', 'death'], 'c': ['attack', 'cast', 'hit', 'death']}
STORE_DIRS = ['N', 'S', 'E']
GCOLS = 9
BODY_KINDS = ('base', 'armor', 'class', 'back', 'outfit')   # layers that follow the arms -> get a bow-posed group C

def group_index(g):
    k, idx = 0, {}
    for an in GROUPS[g]:
        idx[an] = {}
        for d in STORE_DIRS: idx[an][d] = k; k += NFR[an]
    return idx, k

def render_group(draw, g, sex, wt):
    idx, total = group_index(g)
    rows = (total + GCOLS - 1) // GCOLS
    sheet = np.zeros((rows * FH, GCOLS * FW, 4), np.uint8)
    pose_wt = 'bow' if g == 'c' else wt
    for an in GROUPS[g]:
        n = NFR[an]
        for d in STORE_DIRS:
            for f in range(n):
                J = pose(d, an, f, n, sex, pose_wt)
                L = Layer(FW, FH); draw(L, J)
                k = idx[an][d] + f; x, y = (k % GCOLS) * FW, (k // GCOLS) * FH
                sheet[y:y + FH, x:x + FW] = L.image()
    return sheet

def jobs():
    J = []
    for sx in SEXES:
        J.append((f'base/chr_base_{sx}', 'base', sx, None))
        J.append((f'face/chr_face_{sx}', 'face', sx, None))
        for name, kind, col in ARMORS: J.append((f'armor/eq_armor_{name}_{sx}', 'armor', sx, (kind, col)))
        for c in CLASSES: J.append((f'classes/chr_class_{c}_{sx}', 'class', sx, c))
        for b in BACKS: J.append((f'classes/chr_back_{b}_{sx}', 'back', sx, b))
        for r in NPC_OUTFITS: J.append((f'npcs/npc_outfit_{r}_{sx}', 'outfit', sx, r))
        for w in WEAPONS: J.append((f'weapons/eq_weapon_{w}_{sx}', 'weapon', sx, w))
        for sh in ('round', 'kite'): J.append((f'shields/eq_shield_{sh}_{sx}', 'shield', sx, sh))
    for st in HAIR_STYLES: J.append((f'hair/chr_hair_{st}', 'hair', 'male', st))
    for h in HEADGEAR: J.append((f'headgear/eq_head_{h}', 'head', 'male', h))
    return J

def drawer(kind, arg):
    return {
        'base': lambda L, J: draw_base(L, J), 'face': lambda L, J: draw_face(L, J), 'armor': lambda L, J: draw_armor(L, J, arg[0], arg[1]),
        'class': lambda L, J: draw_class(L, J, arg), 'back': lambda L, J: draw_back(L, J, arg), 'outfit': lambda L, J: draw_outfit(L, J, arg),
        'hair': lambda L, J: draw_hair(L, J, arg), 'weapon': lambda L, J: draw_weapon(L, J, arg), 'shield': lambda L, J: draw_shield(L, J, arg),
        'head': lambda L, J: draw_head(L, J, arg),
    }[kind]

def run(job):
    path, kind, sx, arg = job
    wt = arg if kind == 'weapon' else None
    groups = ['a', 'b'] + (['c'] if kind in BODY_KINDS else [])
    for g in groups:
        save_png(render_group(drawer(kind, arg), g, sx, wt), os.path.join(ROOT, path + '_' + g + '.png'))
    return path, groups

if __name__ == '__main__':
    t = time.time(); js = jobs()
    with Pool(max(1, os.cpu_count() or 2)) as p: done = p.map(run, js)
    groups = {g: {'cols': GCOLS, 'index': group_index(g)[0]} for g in GROUPS}
    anims = {a[0]: {'n': a[1], 'fps': a[2], 'loop': a[3], 'group': 'a' if a[0] in GROUPS['a'] else 'b'} for a in ANIMS}
    anims['run'] = dict(anims['walk'], fps=15, alias='walk')
    m = {'set': 'hd', 'frame': [FW, FH], 'pivot': list(PIVOT), 'dirs': STORE_DIRS, 'mirror': {'W': 'E'},
         'dirs8': 'reserved: diagonals use the nearest stored direction', 'groups': groups, 'anims': anims,
         'variants': {'bow': {'b': 'c'}}, 'height': 50, 'head': [18, 16], 'scale_vs_v1': round(50 / 42, 3),
         'layers': {os.path.basename(p): 'chr_hd/' + p for p, g in done}, 'bowGroups': sorted(os.path.basename(p) for p, g in done if 'c' in g),
         'keys': {'hair': RAMPS['hair'], 'skin': RAMPS['skin']}, 'tint': ['hair', 'face'],
         'tunic': TUNIC_COLORS, 'hair': HAIR_STYLES, 'headgear': HEADGEAR, 'headgearKind': HEADGEAR_KIND, 'weapons': WEAPONS,
         'outfits': NPC_OUTFITS, 'classes': CLASSES, 'order': ORDER, 'slots': SLOTS, 'sexed': ['weapon', 'shield']}
    with open(os.path.join(ROOT, 'chars.json'), 'w') as f: json.dump(m, f, indent=1)
    print(len(done), 'HD layers in', round(time.time() - t, 1), 's')
