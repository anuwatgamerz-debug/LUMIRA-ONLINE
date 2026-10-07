#!/usr/bin/env python3
"""Humanoid LPC monsters (orcs, goblins, skeletons, zombies, lizardfolk, minotaur warriors) built from the Universal LPC
character library with the same compositor as the player sheets (build_chars.py), so they share the players' style.

  LPC_ROOT=<ULPC clone> python tools/art/lpc/build_mobs2.py public/assets [name ...]

Writes public/assets/<name>.png in the monster "px" layout (rows N W S E; columns idle 4 · walk 6 · atk 5 · hit 2 ·
die 5, 128 px cells, feet anchored) and adds / updates its entry in public/assets/meta.json.
Credits for every sheet used: docs/credits/lpc/LPC_CHARACTERS_CREDITS.csv (tools/art/lpc credits step).
"""
import json, os, sys
from PIL import Image
sys.argv = [sys.argv[0], '/tmp/unused'] + sys.argv[1:]   # build_chars reads argv[1] as its own output folder
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_chars as B

ASSETS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', '..', '..', 'public', 'assets')
ONLY = sys.argv[3:]
CELL = B.CELL
CNT = [('idle', 4, 5, 1), ('walk', 6, 9, 1), ('atk', 5, 11, 0), ('hit', 2, 8, 0), ('die', 5, 9, 0)]

def fit(lst, n): return [lst[min(len(lst) - 1, int(i * len(lst) / n))] for i in range(n)]

def body(skin, kind='male'): return [('body/body.json', skin)]
def head(path, skin): return [(path, skin)]
SKEL = [('body/special/body_skeleton.json', None), ('head/heads/undead/heads_skeleton.json', None)]
ZOMB = lambda c: [('body/special/body_zombie.json', c), ('head/heads/undead/heads_zombie.json', c)]
ORC = lambda c='green': [('body/body.json', c), ('head/heads/fantasy/heads_orc_male.json', c)]
GOB = lambda c='green': [('body/body.json', c), ('head/heads/fantasy/heads_goblin.json', c)]
LIZ = lambda c='dark_green': [('body/body.json', c), ('head/heads/reptile/heads_lizard_male.json', c), ('body/lizard/tail_lizard.json', c)]
MINO = lambda c='fur_brown': [('body/body.json', c), ('head/heads/beast/heads_minotaur.json', c)]
W = lambda path, col=None: [(path, col)]

# name -> (body, items, attack animation key, Thai note)
MOBS = {
    'm_lpc2_orc':       ('male', ORC('green') + W('torso/armour/torso_armour_leather.json') + W('arms/shoulders/shoulders_pauldrons.json', 'iron') + W('legs/pants/legs_pants.json', 'leather') + W('feet/boots/feet_boots_basic.json', 'brown') + W('weapons/blunt/weapon_blunt_waraxe.json'), 'slash', 'ออร์คนักรบ'),
    'm_lpc2_orcarcher': ('male', ORC('dark_green') + W('torso/armour/torso_armour_leather.json') + W('legs/pants/legs_pants.json', 'charcoal') + W('feet/boots/feet_boots_basic.json', 'black') + W('torso/backpack/quiver.json') + W('weapons/ranged/bow/weapon_ranged_bow_recurve.json'), 'shoot', 'ออร์คนักธนู'),
    'm_lpc2_gobchief':  ('male', GOB('green') + W('torso/armour/torso_armour_leather.json') + W('legs/pants/legs_pants.json', 'tan') + W('headwear/neck/neck_necklace_beaded_large.json') + W('arms/shoulders/shoulders_mantal.json', 'brown') + W('headwear/helmets/accessories/hat_accessory_horns_upward.json', 'bronze') + W('weapons/polearm/weapon_polearm_spear.json'), 'thrust', 'หัวหน้าเผ่าก็อบลิน'),
    'm_lpc2_gobshaman': ('male', GOB('pale_green') + W('torso/shirts/longsleeve/torso_clothes_longsleeve.json', 'brown') + W('legs/skirts/legs_skirts_plain.json', 'brown') + W('torso/waist/belt_mage.json', 'bronze') + W('headwear/neck/charms/neck_amulet_dangle.json') + W('headwear/coverings/hoods/hat_hood_cloth.json', 'forest') + W('weapons/magic/weapon_magic_gnarled.json'), 'spell', 'หมอผีก็อบลิน'),
    'm_lpc2_gobminer':  ('male', GOB('green') + W('torso/shirts/shortsleeve/torso_clothes_shortsleeve.json', 'gray') + W('torso/aprons/torso_aprons_suspenders.json') + W('legs/pants/legs_pants.json', 'charcoal') + W('headwear/helmets/helmets/hat_helmet_kettle.json') + W('tools/tool_pickaxe.json'), 'slash', 'ก็อบลินขุดแร่'),
    'm_lpc2_gobraider': ('male', GOB('dark_green') + W('torso/armour/torso_armour_leather.json') + W('legs/pants/legs_pants.json', 'leather') + W('headwear/coverings/headbands/hat_headband_tied.json', 'red') + W('weapons/sword/weapon_sword_scimitar.json') + W('weapons/shields/shield_round.json', 'brown'), 'slash', 'ก็อบลินจู่โจม'),
    'm_lpc2_bandit':    ('male', [('body/body.json', 'olive'), ('head/heads/human/heads_human_male.json', 'olive')] + W('torso/shirts/longsleeve/torso_clothes_longsleeve.json', 'charcoal') + W('torso/vest/torso_clothes_vest.json', 'leather') + W('legs/pants/legs_pants.json', 'charcoal') + W('feet/boots/feet_boots_basic.json', 'black') + W('headwear/coverings/hoods/hat_hood_cloth.json', 'charcoal') + W('headwear/accessories/facial_mask_plain.json') + W('weapons/sword/weapon_sword_dagger.json', 'dagger'), 'slash', 'โจร'),
    'm_lpc2_boneknight':('male', SKEL + W('torso/armour/torso_armour_plate.json', 'iron') + W('arms/shoulders/shoulders_legion.json', 'iron') + W('torso/cape/cape_tattered.json', 'maroon') + W('weapons/sword/weapon_sword_arming.json', 'steel') + W('weapons/shields/shield_kite.json'), 'slash', 'อัศวินกระดูก'),
    'm_lpc2_bonemage':  ('male', SKEL + W('torso/shirts/torso_clothes_robe.json', 'purple') + W('torso/waist/belt_mage.json', 'black') + W('headwear/hats/magic/hat_magic_large.json') + W('weapons/magic/weapon_magic_crystal.json'), 'spell', 'จอมเวทกระดูก'),
    'm_lpc2_boneminer': ('male', SKEL + W('torso/aprons/torso_aprons_suspenders.json') + W('legs/pants/legs_pants.json', 'charcoal') + W('headwear/helmets/helmets/hat_helmet_kettle.json') + W('tools/tool_pickaxe.json'), 'slash', 'โครงกระดูกคนงาน'),
    'm_lpc2_bonecrypt': ('male', SKEL + W('torso/torso_chainmail.json', 'iron') + W('weapons/sword/weapon_sword_saber.json') + W('torso/cape/cape_tattered.json', 'charcoal'), 'slash', 'โครงกระดูกสุสาน'),
    'm_lpc2_ghoul':     ('male', ZOMB('zombie') + W('torso/shirts/longsleeve/torso_clothes_longsleeve.json', 'gray') + W('legs/pants/legs_pants.json', 'brown'), 'slash', 'กูล'),
    'm_lpc2_bogzombie': ('male', ZOMB('zombie_green') + W('torso/shirts/shortsleeve/torso_clothes_shortsleeve.json', 'green') + W('legs/pants/legs_pants.json', 'charcoal'), 'slash', 'ซอมบี้หนอง'),
    'm_lpc2_lizard':    ('male', LIZ('dark_green') + W('torso/armour/torso_armour_leather.json') + W('legs/pants/legs_pants.json', 'teal') + W('weapons/polearm/weapon_polearm_trident.json'), 'thrust', 'ตัวซุ่มบ่อ (มนุษย์กิ้งก่า)'),
    'm_lpc2_minoguard': ('male', MINO('fur_brown') + W('torso/armour/torso_armour_plate.json', 'bronze') + W('arms/shoulders/shoulders_legion.json', 'bronze') + W('legs/legs_armour.json', 'bronze') + W('weapons/polearm/weapon_polearm_halberd.json'), 'thrust', 'ยามเขาวงกต'),
}

def build(name):
    sx, items, atk, _ = MOBS[name]
    F = {k: B.frames_for(items, sx, k) for k in ('walk', atk, 'hurt')}
    walk, A, hurt = F['walk'], F[atk], F['hurt']
    blank = Image.new('RGBA', (CELL, CELL))
    def row(fr, r): return [fr.get(r, {}).get(c, blank) for c in sorted(fr.get(r, {}))] or [blank]
    sheet = Image.new('RGBA', (sum(c[1] for c in CNT) * CELL, 4 * CELL))
    die = row(hurt, 0)
    for r in range(4):   # LPC rows are N W S E, same as the px layout
        w = row(walk, r); a = row(A, r)
        a = a[1:-1] if atk == 'shoot' and len(a) > 6 else a   # bows: skip the wind-up / recovery holds
        cols = [w[0]] * 4 + fit(w[1:] or w, 6) + fit(a, 5) + [a[0], w[0]] + fit(die[1:] or die, 5)
        for c, im in enumerate(cols): sheet.alpha_composite(im, (c * CELL, r * CELL))
    bb = sheet.crop((0, 2 * CELL, 4 * CELL, 3 * CELL)).getbbox()
    ay = (bb[3] if bb else CELL) - 1
    sheet.save(os.path.join(ASSETS, name + '.png'), optimize=True)
    anims, c0 = {}, 0
    for an, n, fps, loop in CNT: anims[an] = [c0, n, fps, loop]; c0 += n
    return {'fw': CELL, 'fh': CELL, 'ppt': 32, 'ax': CELL // 2, 'ay': ay, 'dirs': 4, 'anims': anims}

if __name__ == '__main__':
    mp = os.path.join(ASSETS, 'meta.json'); meta = json.load(open(mp, encoding='utf-8'))
    for name in MOBS:
        if ONLY and name not in ONLY: continue
        meta['px'][name] = build(name); print(name, meta['px'][name]['ay'], flush=True)
    json.dump(meta, open(mp, 'w', encoding='utf-8'), separators=(',', ':'))
