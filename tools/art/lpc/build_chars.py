# Build the LUMIRA "lpc" paperdoll set from the Universal LPC Spritesheet sources.
# python3 build_chars.py <out_dir (public/assets/chr_lpc)>
import json, os, sys, subprocess, numpy as np
from PIL import Image
L = '/home/claude/px/lpc'; SD = L + '/sheet_definitions/'
TREE = set(open('/tmp/lpc_tree.txt').read().split('\n'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/chr_lpc'
CELL = 128
FETCHED = set()

def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
PALS = {}
def palette(mat):
    if mat not in PALS:
        meta = json.load(open(f'{L}/palette_definitions/{mat}/meta_{mat}.json'))
        PALS[mat] = (meta['base'], json.load(open(f'{L}/palette_definitions/{mat}/{mat}_ulpc.json')))
    return PALS[mat]
def recolor_map(mat, color):
    base, p = palette(mat)
    if not color or color == base or color not in p: return None
    return {hexrgb(s): hexrgb(d) for s, d in zip(p[base], p[color])}
def apply_map(im, m):
    if not m: return im
    a = np.asarray(im).copy(); flat = a.reshape(-1, 4)
    key = (flat[:, 0].astype(np.int32) << 16) | (flat[:, 1].astype(np.int32) << 8) | flat[:, 2]
    for s, d in m.items():
        k = (s[0] << 16) | (s[1] << 8) | s[2]; sel = (key == k) & (flat[:, 3] > 0); flat[sel, :3] = d
    return Image.fromarray(a)

def need(paths):
    miss = [p for p in paths if p not in FETCHED and not os.path.exists(L + '/' + p)]
    for i in range(0, len(miss), 150):
        subprocess.run(['git', '-C', L, 'checkout', 'HEAD', '--'] + miss[i:i + 150], check=True, capture_output=True)
    FETCHED.update(paths)

ANIM_FILE = {'walk': 'walk', 'slash': 'slash', 'spell': 'spellcast', 'shoot': 'shoot', 'hurt': 'hurt', 'thrust': 'thrust'}
def item_layers(defpath, body, color):
    j = json.load(open(SD + defpath)); res = []
    mat = (j.get('recolors') or {}).get('material')
    if j.get('match_body_color') or defpath.startswith('head/heads') or defpath.startswith('body/'): mat = 'body'
    for k, v in j.items():
        if not (k.startswith('layer_') and isinstance(v, dict)): continue
        p = v.get(body) or (v.get('male') if body != 'female' else None) or v.get('female') or v.get('male')
        if not p: continue
        res.append((v.get('zPos', 0), p, v.get('custom_animation')))
    return res, mat

def resolve(path, anim, color, custom):
    if custom:
        c = [f'spritesheets/{path}{color}.png'] if color else []
        c.append(f'spritesheets/{path.rstrip("/")}.png')
    else:
        c = [f'spritesheets/{path}{anim}/{color}.png'] if color else []
        c.append(f'spritesheets/{path}{anim}.png')
    for x in c:
        if x in TREE: return x
    if True:  # no colour given / not found: take a sensible existing variant
        pre = f'spritesheets/{path}' if custom else f'spritesheets/{path}{anim}/'
        vs = VARIANTS.get(pre)
        if vs is None:
            vs = VARIANTS[pre] = sorted(t[len(pre):-4] for t in TREE if t.startswith(pre) and '/' not in t[len(pre):])
        for want in (color, 'leather', 'brown', 'walnut', 'steel', 'iron', 'gray', 'black', 'medium', 'longsword', 'waraxe', 'dagger', 'gnarled'):
            if want in vs: return pre + want + '.png'
        if vs: return pre + vs[0] + '.png'
    return None
VARIANTS = {}

def frames_for(items, body, key):
    """items: [(defpath, color)] -> composited frames {row: [Image128]} for LPC anim key"""
    anim = ANIM_FILE[key]; jobs = []
    for defpath, color in items:
        ls, mat = item_layers(defpath, body, color)
        for z, p, custom in ls:
            if custom:
                if not custom.startswith(anim + '_'): continue
                size = int(custom.split('_')[-1]) if custom.split('_')[-1].isdigit() else 192
            else: size = 64
            f = resolve(p, anim, color, custom)
            if f: jobs.append((z, f, size, mat, color, f.endswith(f'/{color}.png') if color else False))
    need(sorted(set(j[1] for j in jobs)))
    jobs.sort(key=lambda j: j[0])
    nrows = 1 if key == 'hurt' else 4
    out = {}
    for z, f, size, mat, color, variant_file in jobs:
        im = Image.open(L + '/' + f).convert('RGBA')
        if mat and color and not variant_file: im = apply_map(im, recolor_map(mat, color))
        n = im.width // size
        for r in range(min(nrows, im.height // size)):
            row = out.setdefault(r, {})
            for c in range(n):
                fr = im.crop((c * size, r * size, c * size + size, r * size + size))
                cell = row.get(c) or Image.new('RGBA', (CELL, CELL))
                off = (CELL - size) // 2
                if off >= 0: cell.alpha_composite(fr, (off, off))
                else: cell.alpha_composite(fr.crop((-off, -off, -off + CELL, -off + CELL)))
                row[c] = cell
    return out

# ---------------------------------------------------------------- sheet layout (same scheme as the HD/v1 sets)
R = {'N': 0, 'W': 1, 'S': 2, 'E': 3}
DIRS = ['N', 'S', 'E']
ANIMS = {'idle': {'n': 1, 'fps': 1, 'loop': 1, 'group': 'a'}, 'walk': {'n': 8, 'fps': 10, 'loop': 1, 'group': 'a'},
         'sit': {'n': 1, 'fps': 1, 'loop': 1, 'group': 'a'}, 'interact': {'n': 2, 'fps': 5, 'loop': 1, 'group': 'a'},
         'attack': {'n': 6, 'fps': 14, 'loop': 0, 'group': 'b'}, 'cast': {'n': 6, 'fps': 10, 'loop': 0, 'group': 'b'},
         'hit': {'n': 3, 'fps': 10, 'loop': 0, 'group': 'b'}, 'death': {'n': 6, 'fps': 8, 'loop': 0, 'group': 'b'},
         'run': {'n': 8, 'fps': 15, 'loop': 1, 'group': 'a', 'alias': 'walk'}}
GROUPS = {'a': ['idle', 'walk', 'sit', 'interact'], 'b': ['attack', 'cast', 'hit', 'death'], 'c': ['attack', 'cast', 'hit', 'death'], 'd': ['attack', 'cast', 'hit', 'death']}
COLS = 8
def group_index(g):
    idx = {}; k = 0
    for an in GROUPS[g]:
        idx[an] = {}
        for d in DIRS: idx[an][d] = k; k += ANIMS[an]['n']
    return idx, k

def pick(fr, r, i):
    row = fr.get(r) or fr.get(0) or {}
    return row.get(i) or Image.new('RGBA', (CELL, CELL))
def build_layer(name, items, body):
    F = {k: frames_for(items, body, k) for k in ('walk', 'slash', 'spell', 'shoot', 'hurt', 'thrust')}
    if not any(F[k] for k in F): print('  !! empty layer', name); return None
    sheets = {}
    for g in ('a', 'b', 'c', 'd'):
        idx, total = group_index(g); rows = -(-total // COLS)
        sh = Image.new('RGBA', (COLS * CELL, rows * CELL))
        def put(k, im): sh.paste(im, ((k % COLS) * CELL, (k // COLS) * CELL))
        for an in GROUPS[g]:
            for d in DIRS:
                r = R[d]; base = idx[an][d]
                if an == 'idle': fl = [pick(F['walk'], r, 0)]
                elif an == 'walk': fl = [pick(F['walk'], r, i) for i in range(1, 9)]
                elif an == 'sit': fl = [pick(F['walk'], r, 0)]
                elif an == 'interact': fl = [pick(F['walk'], r, 0), pick(F['spell'], r, 1)]
                elif an == 'attack': fl = [pick(F['shoot'], r, i) for i in (1, 3, 5, 7, 9, 11)] if g == 'c' else [pick(F['thrust'], r, i) for i in (0, 1, 2, 4, 5, 6)] if g == 'd' else [pick(F['slash'], r, i) for i in range(6)]
                elif an == 'cast': fl = [pick(F['spell'], r, i) for i in range(1, 7)]
                elif an == 'hit': fl = [pick(F['walk'], r, 0)] * 3
                elif an == 'death': fl = [pick(F['hurt'], 0, i) for i in range(6)]
                for i, im in enumerate(fl): put(base + i, im)
        sheets[g] = sh
    return sheets

# ---------------------------------------------------------------- layer recipes
HAIR_KEYS = ['#2a1a14', '#4a2c1c', '#6e4228', '#956238']
def keyed_hair(im):
    _, p = palette('hair'); src = [hexrgb(c) for c in p['orange']]; k = [hexrgb(c) for c in HAIR_KEYS]
    m = {s: k[[0, 0, 1, 2, 3, 3][i]] for i, s in enumerate(src)}
    return apply_map(im, m)

def SEX(body): return 'male' if body == 'male' else 'female'
P = {}
def add(name, items, sexed=True, post=None):
    P[name] = (items, sexed, post)

# base (body + head)
for b in ('male', 'female'):
    add(f'chr_base_{b}', lambda b=b: [('body/body.json', 'light'), (f'head/heads/human/heads_human_{b}.json', 'light')], post=None)
TUNIC = {'blue': 'blue', 'brown': 'brown', 'green': 'green', 'red': 'red', 'violet': 'purple'}
def armor_items(kind, b):
    if kind.startswith('tunic_'):
        return [('torso/shirts/longsleeve/torso_clothes_longsleeve.json', TUNIC[kind[6:]]), ('legs/pants/legs_pants.json', 'charcoal' if kind != 'tunic_brown' else 'leather'), ('feet/shoes/feet_shoes_basic.json', 'brown'), ('torso/waist/belt_leather.json', None)]
    if kind == 'leather': return [('torso/shirts/longsleeve/torso_clothes_longsleeve.json', 'tan'), ('torso/armour/torso_armour_leather.json', None), ('legs/pants/legs_pants.json', 'leather'), ('feet/boots/feet_boots_basic.json', 'brown')]
    if kind == 'chain': return [('torso/torso_chainmail.json', 'iron'), ('legs/pants/legs_pants.json', 'gray'), ('feet/boots/feet_boots_basic.json', 'black'), ('torso/waist/belt_leather.json', None)]
    if kind == 'plate': return [('torso/armour/torso_armour_plate.json', 'steel'), ('arms/arms_armour.json', 'steel'), ('legs/legs_armour.json', 'steel'), ('feet/feet_armour.json', 'steel')]
    if kind.startswith('robe_'):
        col = {'blue': 'blue', 'violet': 'purple', 'ivory': 'white', 'brown': 'brown'}[kind[5:]]
        if b == 'female': return [('torso/shirts/torso_clothes_robe.json', col), ('feet/feet_slippers.json', 'brown')]
        cc = {'blue': 'navy', 'violet': 'purple', 'ivory': 'white', 'brown': 'brown'}[kind[5:]]
        return [('torso/shirts/longsleeve/torso_clothes_longsleeve.json', cc), ('legs/skirts/legs_skirts_plain.json', cc), ('torso/waist/belt_robe.json', None), ('feet/feet_slippers.json', 'brown')]
ARMORS = ['tunic_blue', 'tunic_brown', 'tunic_green', 'tunic_red', 'tunic_violet', 'leather', 'chain', 'plate', 'robe_blue', 'robe_violet', 'robe_ivory', 'robe_brown']
for a in ARMORS:
    for b in ('male', 'female'): add(f'eq_armor_{a}_{b}', lambda a=a, b=b: armor_items(a, b))
CLASS = {
    'adventurer': lambda b: [('torso/waist/belt_leather.json', None)],
    'vanguard': lambda b: [('arms/shoulders/shoulders_pauldrons.json', 'gray'), ('arms/wrists/arms_bracers.json', 'steel')],
    'ranger': lambda b: [('arms/wrists/arms_bracers.json', 'brass'), ('torso/waist/belt_double.json', None)],
    'arcanist': lambda b: [('headwear/neck/neck_capeclip.json', None), ('torso/waist/belt_sash.json', 'navy')],
    'cleric': lambda b: [('headwear/neck/charms/neck_amulet_cross.json', None), ('torso/waist/belt_sash.json', 'white')],
    'rogue': lambda b: [('arms/arms_gloves.json', 'iron'), ('torso/waist/belt_double.json', None)],
    'artisan': lambda b: [('torso/aprons/torso_aprons_apron.json', 'brown')],
}
for c, f in CLASS.items():
    for b in ('male', 'female'): add(f'chr_class_{c}_{b}', lambda f=f, b=b: f(b))
BACK = {'adventurer': [('torso/backpack/backpack.json', None)], 'ranger': [('torso/backpack/quiver.json', None)],
        'cape_blue': [('torso/cape/cape_solid.json', 'blue')], 'cape_red': [('torso/cape/cape_solid.json', 'red')],
        'cape_gold': [('torso/cape/cape_solid.json', 'yellow')], 'cape_violet': [('torso/cape/cape_solid.json', 'purple')]}
for k, v in BACK.items():
    for b in ('male', 'female'): add(f'chr_back_{k}_{b}', lambda v=v: v)
HAIR = {'short': 'hair/short/hair_plain.json', 'spiky': 'hair/spiky/hair_spiked.json', 'ponytail': 'hair/braids/hair_ponytail.json',
        'long': 'hair/long/hair_long.json', 'twin': 'hair/pigtails/hair_pigtails.json', 'bun': 'hair/braids/hair_bangs_bun.json'}
for k, v in HAIR.items():
    for b in ('male', 'female'): add(f'chr_hair_{k}_{b}', lambda v=v: [(v, None)], post=keyed_hair)
WEAP = {'sword': [('weapons/sword/weapon_sword_arming.json', 'steel')], 'greatsword': [('weapons/sword/weapon_sword_longsword.json', 'steel')],
        'dagger': [('weapons/sword/weapon_sword_dagger.json', 'dagger')], 'bow': [('weapons/ranged/bow/weapon_ranged_bow_normal.json', 'normal')],
        'staff': [('weapons/magic/weapon_magic_gnarled.json', None)], 'wand': [('weapons/magic/weapon_magic_wand.json', None)],
        'mace': [('weapons/blunt/weapon_blunt_mace.json', 'mace')], 'spear': [('weapons/polearm/weapon_polearm_spear.json', None)],
        'axe': [('weapons/blunt/weapon_blunt_waraxe.json', None)], 'pickaxe': [('tools/tool_pickaxe.json', None)],
        'device': [('weapons/ranged/weapon_ranged_crossbow.json', None)]}
for k, v in WEAP.items():
    for b in ('male', 'female'): add(f'eq_weapon_{k}_{b}', lambda v=v: v)
SHIELD = {'round': [('weapons/shields/shield_round.json', 'brown')], 'kite': [('weapons/shields/shield_kite.json', None)]}
for k, v in SHIELD.items():
    for b in ('male', 'female'): add(f'eq_shield_{k}_{b}', lambda v=v: v)
HEAD = {'cap': [('headwear/hats/caps/hat_cap_leather.json', None)], 'straw': [('headwear/hats/tricorne/hat_tricorne_thatch.json', None)],
        'band_red': [('headwear/coverings/headbands/hat_headband_tied.json', 'red')], 'band_moon': [('headwear/coverings/headbands/hat_headband_thick_rune.json', 'navy')],
        'leather': [('headwear/hats/caps/hat_cap_cavalier.json', None)], 'iron': [('headwear/helmets/helmets/hat_helmet_nasal.json', 'iron')],
        'wizard': [('headwear/hats/magic/hat_magic_wizard.json', 'navy')], 'hood_green': [('headwear/coverings/hoods/hat_hood_cloth.json', 'forest')],
        'hood': [('headwear/coverings/hoods/hat_hood_cloth.json', 'charcoal')], 'feather': [('headwear/hats/caps/hat_cap_bonnie_feather.json', None)],
        'miner': [('headwear/helmets/helmets/hat_helmet_kettle.json', None)], 'mask_shadow': [('headwear/accessories/facial_mask_plain.json', None)],
        'flower': [('headwear/coverings/headbands/hat_headband_hairtie.json', 'pink')], 'antler': [('headwear/helmets/accessories/hat_accessory_horns_upward.json', 'bronze')],
        'ironcrown': [('headwear/hats/formal/hat_formal_crown.json', None)], 'jelcrown': [('headwear/hats/formal/hat_formal_crown.json', None)],
        'traveler': [('headwear/hats/formal/hat_formal_bowler.json', None)], 'catears': [('head/furry_ears/top/head_ears_cat.json', None)],
        'party': [('headwear/hats/holiday/hat_holiday_elf.json', None)], 'witch': [('headwear/hats/magic/hat_magic_large.json', None)],
        'circlet': [('headwear/hats/formal/hat_formal_tiara.json', None)], 'knight': [('headwear/helmets/helmets/hat_helmet_armet.json', 'steel')]}
for k, v in HEAD.items():
    for b in ('male', 'female'): add(f'eq_head_{k}_{b}', lambda v=v: v)
def outfit(k, b):
    F = b == 'female'
    pants = ('legs/pants/legs_pants.json', 'brown'); boots = ('feet/boots/feet_boots_basic.json', 'brown'); shoes = ('feet/shoes/feet_shoes_basic.json', 'brown')
    O = {
        'merchant': [('torso/shirts/longsleeve/torso_clothes_longsleeve.json', 'tan'), ('torso/aprons/torso_aprons_apron.json', 'brown'), pants, shoes],
        'blacksmith': [('torso/shirts/sleeveless/torso_clothes_sleeveless2.json', 'charcoal'), ('torso/aprons/torso_aprons_apron.json', 'leather'), ('legs/pants/legs_pants.json', 'charcoal'), boots, ('arms/arms_gloves.json', 'iron')],
        'healer': ([('torso/shirts/torso_clothes_robe.json', 'white')] if F else [('torso/shirts/longsleeve/torso_clothes_longsleeve.json', 'white'), ('legs/skirts/legs_skirts_plain.json', 'white')]) + [('torso/waist/belt_sash.json', 'red'), ('feet/feet_slippers.json', 'white')],
        'innkeeper': ([('torso/shirts/torso_clothes_blouse.json', 'white'), ('legs/skirts/legs_skirt_straight.json', 'maroon')] if F else [('torso/shirts/longsleeve/torso_clothes_longsleeve.json', 'white'), pants]) + [('torso/aprons/torso_aprons_apron.json', 'white'), shoes],
        'guard': [('torso/torso_chainmail.json', 'iron'), ('torso/jacket/torso_jacket_tabard.json', None), ('legs/pants/legs_pants.json', 'gray'), ('feet/feet_armour.json', 'iron')],
        'farmer': [('torso/shirts/shortsleeve/torso_clothes_shortsleeve.json', 'white'), ('torso/aprons/torso_aprons_overalls.json', None), boots],
        'citizen': [('torso/shirts/longsleeve/torso_clothes_longsleeve2.json', 'green'), ('legs/pants/legs_pants.json', 'tan'), shoes] if not F else [('torso/shirts/torso_clothes_blouse_longsleeve.json', 'sky'), ('legs/skirts/legs_skirt_straight.json', 'navy'), shoes],
        'elder': ([('torso/shirts/torso_clothes_robe.json', 'brown')] if F else [('torso/shirts/longsleeve/torso_clothes_longsleeve.json', 'gray'), ('legs/skirts/legs_skirts_plain.json', 'gray')]) + [('torso/waist/belt_robe.json', None), ('feet/feet_slippers.json', 'brown')],
        'scholar': ([('torso/shirts/torso_clothes_robe.json', 'blue')] if F else [('torso/shirts/longsleeve/torso_clothes_longsleeve.json', 'navy'), ('legs/skirts/legs_skirts_plain.json', 'navy')]) + [('torso/waist/belt_sash.json', 'yellow'), ('feet/feet_slippers.json', 'brown')],
        'mage': ([('torso/shirts/torso_clothes_robe.json', 'purple')] if F else [('torso/shirts/longsleeve/torso_clothes_longsleeve.json', 'purple'), ('legs/skirts/legs_skirts_plain.json', 'purple')]) + [('torso/cape/cape_solid.json', 'lavender'), ('feet/feet_slippers.json', 'purple')],
        'storage': [('torso/shirts/longsleeve/torso_clothes_longsleeve.json', 'walnut'), ('torso/aprons/torso_aprons_suspenders.json', None), ('legs/pants/legs_pants.json', 'charcoal'), boots],
        'noble': ([('torso/jacket/torso_jacket_frock.json', None), ('legs/pants/legs_formal.json', None)] if not F else [('torso/dresses/dress_bodice.json', None)]) + [('feet/shoes/feet_shoes_basic.json', 'black'), ('headwear/neck/neck_cravat.json', 'white')],
        'bard': [('torso/shirts/longsleeve/torso_clothes_longsleeve.json', 'red'), ('torso/waist/belt_sash.json', 'yellow'), ('legs/pants/legs_pantaloons.json', 'green'), boots],
        'traveler': [('torso/shirts/longsleeve/torso_clothes_longsleeve.json', 'tan'), ('torso/cape/cape_solid.json', 'brown'), ('legs/pants/legs_pants.json', 'leather'), boots, ('torso/waist/belt_leather.json', None)],
        'miner': [('torso/shirts/shortsleeve/torso_clothes_shortsleeve.json', 'gray'), ('torso/aprons/torso_aprons_suspenders.json', None), ('legs/pants/legs_pants.json', 'charcoal'), boots],
    }
    return O[k]
OUTFITS = ['merchant', 'blacksmith', 'healer', 'innkeeper', 'guard', 'farmer', 'citizen', 'elder', 'scholar', 'mage', 'storage', 'noble', 'bard', 'traveler', 'miner']
for k in OUTFITS:
    for b in ('male', 'female'): add(f'npc_outfit_{k}_{b}', lambda k=k, b=b: outfit(k, b))

FOLDER = lambda n: 'base' if n.startswith('chr_base') else 'hair' if 'hair' in n else 'armor' if 'armor' in n else 'classes' if n.startswith('chr_') else 'weapons' if 'weapon' in n else 'shields' if 'shield' in n else 'headgear' if 'head' in n else 'npcs'
if __name__ == '__main__':
    only = sys.argv[2:]  # optional subset
    layers = {}
    mp = OUT + '/chars.json'
    if os.path.exists(mp) and only: layers = json.load(open(mp))['layers']
    for name, (fn, sexed, post) in P.items():
        if only and not any(o in name for o in only): continue
        body = 'female' if name.endswith('_female') else 'male'
        sh = build_layer(name, fn(), body)
        if not sh: continue
        fold = FOLDER(name); os.makedirs(f'{OUT}/{fold}', exist_ok=True)
        for g, im in sh.items():
            if post: im = post(im)
            im.save(f'{OUT}/{fold}/{name}_{g}.png', optimize=True)
        layers[name] = f'chr_lpc/{fold}/{name}'
        print(name, flush=True)
    groups = {}
    for g in ('a', 'b', 'c', 'd'):
        idx, total = group_index(g); groups[g] = {'cols': COLS, 'index': idx}
    S = {'set': 'lpc', 'frame': [CELL, CELL], 'pivot': [64, 92], 'dirs': DIRS, 'mirror': {'W': 'E'}, 'groups': groups, 'anims': ANIMS,
         'variants': {'bow': {'b': 'c'}, 'device': {'b': 'd'}, 'spear': {'b': 'd'}, 'staff': {'b': 'd'}}, 'height': 48, 'head': [18, 16], 'layers': layers, 'bowGroups': sorted(layers.keys()),
         'keys': {'hair': HAIR_KEYS, 'skin': []}, 'tint': ['hair'], 'tunic': list(TUNIC.keys()), 'hair': list(HAIR.keys()),
         'headgear': list(HEAD.keys()), 'weapons': list(WEAP.keys()), 'outfits': OUTFITS, 'classes': list(CLASS.keys()),
         'order': {'S': ['back', 'base', 'armor', 'class', 'costume', 'hair', 'weapon', 'shield', 'head'], 'N': ['base', 'armor', 'class', 'costume', 'back', 'hair', 'weapon', 'shield', 'head'], 'E': ['shield', 'back', 'base', 'armor', 'class', 'costume', 'hair', 'weapon', 'head']},
         'slots': ['base', 'hair', 'armor', 'weapon', 'shield', 'back', 'head', 'costume', 'aura'], 'sexed': ['weapon', 'shield', 'hair', 'head']}
    json.dump(S, open(mp, 'w'))
