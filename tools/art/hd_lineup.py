"""python3 tools/art/hd_lineup.py -> docs/prototype/*.png

Review sheets for the HD character prototype, composed from the exported layer sheets in public/assets/chr_hd
(exactly what the game loads): the 8 prototype looks in 4 directions, their animations, and the headgear /
weapon sets. Hair keeps its key colour (the game recolours it to the chosen hair colour).
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
A = os.path.join(ROOT, 'public', 'assets')
OUT = os.path.join(ROOT, 'docs', 'prototype')
M = json.load(open(os.path.join(A, 'chr_hd', 'chars.json')))
FW, FH = M['frame']
_cache = {}
def sheet(name, g):
    k = (name, g)
    if k not in _cache: _cache[k] = np.array(Image.open(os.path.join(A, M['layers'][name] + '_' + g + '.png')).convert('RGBA'))
    return _cache[k]

PROTO = [  # label, sex, layers by slot
    ('Adventurer M', 'male', {'base': 'chr_base_male', 'face': 'chr_face_male', 'armor': 'eq_armor_tunic_blue_male', 'class': 'chr_class_adventurer_male', 'back': 'chr_back_adventurer_male', 'hair': 'chr_hair_short', 'weapon': 'eq_weapon_sword_male'}),
    ('Adventurer F', 'female', {'base': 'chr_base_female', 'face': 'chr_face_female', 'armor': 'eq_armor_tunic_blue_female', 'class': 'chr_class_adventurer_female', 'back': 'chr_back_adventurer_female', 'hair': 'chr_hair_ponytail', 'weapon': 'eq_weapon_dagger_female'}),
    ('Guard', 'male', {'base': 'chr_base_male', 'face': 'chr_face_male', 'armor': 'npc_outfit_guard_male', 'hair': 'chr_hair_short', 'weapon': 'eq_weapon_spear_male', 'head': 'eq_head_iron'}),
    ('Merchant', 'female', {'base': 'chr_base_female', 'face': 'chr_face_female', 'armor': 'npc_outfit_merchant_female', 'hair': 'chr_hair_bun', 'head': 'eq_head_cap'}),
    ('Blacksmith', 'male', {'base': 'chr_base_male', 'face': 'chr_face_male', 'armor': 'npc_outfit_blacksmith_male', 'hair': 'chr_hair_spiky', 'weapon': 'eq_weapon_mace_male'}),
    ('Vanguard', 'male', {'base': 'chr_base_male', 'face': 'chr_face_male', 'armor': 'eq_armor_plate_male', 'class': 'chr_class_vanguard_male', 'back': 'chr_back_cape_blue_male', 'hair': 'chr_hair_short', 'weapon': 'eq_weapon_sword_male', 'shield': 'eq_shield_kite_male'}),
    ('Ranger', 'female', {'base': 'chr_base_female', 'face': 'chr_face_female', 'armor': 'eq_armor_leather_female', 'class': 'chr_class_ranger_female', 'back': 'chr_back_ranger_female', 'hair': 'chr_hair_long', 'weapon': 'eq_weapon_bow_female', 'head': 'eq_head_hood_green'}),
    ('Arcanist', 'male', {'base': 'chr_base_male', 'face': 'chr_face_male', 'armor': 'eq_armor_robe_violet_male', 'class': 'chr_class_arcanist_male', 'back': 'chr_back_cape_violet_male', 'hair': 'chr_hair_spiky', 'weapon': 'eq_weapon_staff_male', 'head': 'eq_head_wizard'}),
]
def frame(layers, anim, view, f):
    """one composed frame; view in N/S/E/W (W = E mirrored)"""
    a = M['anims'][anim]; g = a['group']; v = 'E' if view == 'W' else view
    bow = layers.get('weapon', '').startswith('eq_weapon_bow')
    k = M['groups'][g]['index'][anim][v] + f; sx, sy = (k % 9) * FW, (k // 9) * FH
    out = np.zeros((FH, FW, 4), np.uint8)
    for part in M['order'][v]:
        nm = layers.get(part)
        if not nm: continue
        gg = 'c' if (bow and g == 'b' and nm in M['bowGroups']) else g
        t = sheet(nm, gg)[sy:sy + FH, sx:sx + FW]; m = t[:, :, 3] > 0; out[m] = t[m]
    return out[:, ::-1] if view == 'W' else out

def board(rows, scale, bg=(58, 92, 60), label_w=120, labels=None):
    w = max(len(r) for r in rows) * FW; h = len(rows) * FH
    im = Image.new('RGBA', (w, h), bg + (255,))
    for y, r in enumerate(rows):
        for x, fr in enumerate(r):
            t = Image.fromarray(fr, 'RGBA'); im.paste(t, (x * FW, y * FH), t)
    im = im.resize((w * scale, h * scale), Image.NEAREST)
    if labels:
        full = Image.new('RGBA', (im.width + label_w, im.height), (30, 34, 52, 255)); full.paste(im, (label_w, 0))
        d = ImageDraw.Draw(full)
        for i, t in enumerate(labels): d.text((8, i * FH * scale + FH * scale // 2 - 6), t, fill=(240, 226, 180, 255))
        return full
    return im

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    # 1. the 8 prototypes, 4 directions, idle frame 0
    board([[frame(L, 'idle', v, 0) for v in ('S', 'W', 'N', 'E')] for _, _, L in PROTO], 3, labels=[p[0] for p in PROTO]).save(os.path.join(OUT, 'hd_prototypes_4dir.png'))
    # 2. animations of every prototype (S view): idle 4, walk 6, attack 6, cast 6, hit 3, death 6
    for anim in ('idle', 'walk', 'attack', 'cast', 'hit', 'death'):
        n = M['anims'][anim]['n']
        board([[frame(L, anim, 'S' if anim != 'walk' else 'E', f) for f in range(n)] for _, _, L in PROTO], 2, labels=[p[0] for p in PROTO]).save(os.path.join(OUT, f'hd_anim_{anim}.png'))
    # 3. headgear on one head, 4 directions
    base = dict(PROTO[0][2]); base.pop('weapon')
    hs = M['headgear']
    board([[frame(dict(base, head='eq_head_' + h), 'idle', v, 0) for v in ('S', 'W', 'N', 'E')] for h in hs], 2, labels=[f"{h} ({M['headgearKind'][h]})" for h in hs]).save(os.path.join(OUT, 'hd_headgear.png'))
    # 4. weapons + shields on the Vanguard body: rest pose and attack impact frame
    vg = dict(PROTO[5][2]); vg.pop('shield')
    ws = ['sword', 'greatsword', 'dagger', 'bow', 'staff', 'wand', 'mace', 'spear']
    rows = [[frame(dict(vg, weapon=f'eq_weapon_{w}_male'), 'idle', 'S', 0), frame(dict(vg, weapon=f'eq_weapon_{w}_male'), 'idle', 'E', 0)] +
            [frame(dict(vg, weapon=f'eq_weapon_{w}_male'), 'attack', 'E', f) for f in range(M['anims']['attack']['n'])] for w in ws]
    rows.append([frame(dict(vg, shield=f'eq_shield_{s}_male', weapon='eq_weapon_sword_male'), 'idle', v, 0) for s in ('round', 'kite') for v in ('S', 'E')])
    board(rows, 2, labels=ws + ['shields']).save(os.path.join(OUT, 'hd_weapons.png'))
    print('review sheets ->', os.path.relpath(OUT, ROOT))
