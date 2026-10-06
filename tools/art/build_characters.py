"""python3 tools/art/build_characters.py  -> public/assets/characters, npcs, equipment + characters/chars.json"""
import json, os, sys, time
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(__file__))
from characters import *
from lumira_art import save_png, RAMPS

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets')
SEXES = ['male', 'female']
ARMORS = [('tunic_' + c, 'tunic', c) for c in TUNIC_COLORS] + [('leather', 'leather', None), ('chain', 'chain', None), ('plate', 'plate', None)] + [('robe_' + c, 'robe', c) for c in ('blue', 'violet', 'ivory', 'brown')]
CLASSES = ['adventurer', 'vanguard', 'ranger', 'arcanist', 'cleric', 'rogue', 'artisan']
BACKS = ['adventurer', 'ranger', 'cape_blue', 'cape_red', 'cape_gold', 'cape_violet']

def jobs():
    J = []
    for sx in SEXES:
        J.append(('characters/base/chr_base_' + sx, 'base', sx, None))
        for name, kind, col in ARMORS: J.append((f'equipment/armor/eq_armor_{name}_{sx}', 'armor', sx, (kind, col)))
        for c in CLASSES: J.append((f'characters/classes/chr_class_{c}_{sx}', 'class', sx, c))
        for b in BACKS: J.append((f'characters/classes/chr_back_{b}_{sx}', 'back', sx, b))
        for r in NPC_OUTFITS: J.append((f'npcs/npc_outfit_{r}_{sx}', 'outfit', sx, r))
    for st in HAIR_STYLES: J.append(('characters/hair/chr_hair_' + st, 'hair', 'male', st))
    for w in WEAPONS: J.append(('equipment/weapons/eq_weapon_' + w, 'weapon', 'male', w))
    for sh in ('round', 'kite'): J.append(('equipment/shields/eq_shield_' + sh, 'shield', 'male', sh))
    for h in HEADGEAR: J.append(('equipment/headgear/eq_head_' + h, 'head', 'male', h))
    return J

def drawer(kind, arg):
    return {
        'base': lambda L, J: draw_base(L, J), 'armor': lambda L, J: draw_armor(L, J, arg[0], arg[1]), 'class': lambda L, J: draw_class(L, J, arg),
        'back': lambda L, J: draw_back(L, J, arg), 'outfit': lambda L, J: draw_outfit(L, J, arg), 'hair': lambda L, J: draw_hair(L, J, arg),
        'weapon': lambda L, J: draw_weapon(L, J, arg), 'shield': lambda L, J: draw_shield(L, J, arg), 'head': lambda L, J: draw_head(L, J, arg),
    }[kind]

def run(job):
    path, kind, sx, arg = job
    wt = arg if kind == 'weapon' else None
    for g in GROUPS:
        save_png(render_group(drawer(kind, arg), g, sx, wt), os.path.join(ROOT, path + '_' + g + '.png'))
    return path

if __name__ == '__main__':
    t = time.time(); js = jobs()
    with Pool(max(1, os.cpu_count() or 2)) as p: done = p.map(run, js)
    m = meta()
    m['layers'] = {os.path.basename(p): p for p in done}
    m['keys'] = {'hair': RAMPS['hair'], 'skin': RAMPS['skin']}
    m['tunic'] = TUNIC_COLORS; m['hair'] = HAIR_STYLES; m['headgear'] = HEADGEAR; m['weapons'] = WEAPONS; m['outfits'] = NPC_OUTFITS
    m['order'] = {  # draw order per stored view (W uses E mirrored)
        'S': ['back', 'base', 'armor', 'class', 'hair', 'weapon', 'shield', 'head'],
        'N': ['base', 'armor', 'class', 'hair', 'back', 'weapon', 'shield', 'head'],
        'E': ['shield', 'back', 'base', 'armor', 'class', 'hair', 'weapon', 'head'],
    }
    with open(os.path.join(ROOT, 'characters', 'chars.json'), 'w') as f: json.dump(m, f, indent=1)
    print(len(done), 'layers x', len(GROUPS), 'groups in', round(time.time() - t, 1), 's')
