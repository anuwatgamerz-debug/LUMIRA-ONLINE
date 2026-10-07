#!/usr/bin/env python3
# Second-class skill icons: cut from the ELYNDRA skill sheets (tools/art/skill_icon_source, made for this game by the
# owner) -> public/assets/skills/<skill id>.webp (96x96). Passives have no card on the sheets: their icon is the
# class's first card, darkened, with a gold ring so it reads as "always on".
import os
from PIL import Image, ImageDraw, ImageEnhance
ROOT = os.path.join(os.path.dirname(__file__), '..', '..'); SRC = os.path.join(ROOT, 'tools/art/skill_icon_source'); OUT = os.path.join(ROOT, 'public/assets/skills')
os.makedirs(OUT, exist_ok=True)
# sheet: file, [row y ranges], x0, x1 (5 equal cards per row), ids per row, top cut fraction
SHEETS = [
  ('sheet_alchemist_machinist.png', [(149, 509), (546, 904)], 6, 1442, [['al_acid', 'al_mist', 'al_bomb', 'al_catalyst', 'al_transmute'], ['mc_burst', 'mc_turret', 'mc_overcharge', 'mc_drone', 'mc_mine']]),
  ('sheet_assassin_shadowdancer.png', [(207, 522), (555, 867)], 32, 1416, [['as_backstab', 'as_venom', 'as_step', 'as_mark', 'as_execute'], ['sd_dash', 'sd_veil', 'sd_phantom', 'sd_dance', 'sd_nightfall']]),
  ('sheet_priest_oracle.png', [(145, 504), (609, 965)], 18, 1429, [['pr_heal', 'pr_barrier', 'pr_group', 'pr_purify', 'pr_resurrect'], ['or_fate', 'or_haste', 'or_fortune', 'or_foresight', 'or_ward']]),
  ('sheet_elementalist_warlock.png', [(154, 519), (700, 1053)], 11, 1439, [['el_meteor', 'el_frost', 'el_chain', 'el_surge', 'el_shield'], ['wl_bolt', 'wl_drain', 'wl_curse', 'wl_nova', 'wl_mark']]),
  ('sheet_sharpshooter_beasthunter.png', [(163, 500), (539, 877)], 19, 1430, [['ss_pierce', 'ss_charged', 'ss_focus', 'ss_rain', 'ss_eagle'], ['bh_snare', 'bh_ptrap', 'bh_mark', 'bh_instinct', 'bh_rapid']]),
  ('sheet_knight_berserker.png', [(226, 540), (575, 893)], 20, 1429, [['kn_bash', 'kn_stance', 'kn_iron', 'kn_taunt', 'kn_wave'], ['bs_rage', 'bs_whirl', 'bs_fury', 'bs_exec', 'bs_warcry']]),
]
FR = (0.12, 0.16, 0.12, 0.30)
done = {}
for f, rows, x0, x1, ids in SHEETS:
    im = Image.open(os.path.join(SRC, f)).convert('RGBA'); cw = (x1 - x0) / 5
    for ri, (y0, y1) in enumerate(rows):
        h = y1 - y0
        for ci, sid in enumerate(ids[ri]):
            cx0 = x0 + ci * cw
            crop = im.crop((int(cx0 + cw * FR[0]), int(y0 + h * FR[1]), int(cx0 + cw * (1 - FR[2])), int(y1 - h * FR[3])))
            side = min(crop.size); crop = crop.crop(((crop.width - side) // 2, (crop.height - side) // 2, (crop.width - side) // 2 + side, (crop.height - side) // 2 + side))
            ic = Image.new('RGBA', crop.size, (12, 16, 40, 255)); ic.alpha_composite(crop)
            ic = ic.resize((96, 96), Image.LANCZOS); done[sid] = ic
            ic.save(os.path.join(OUT, sid + '.webp'), quality=90)
PASSIVE = {'kn_fort': 'kn_iron', 'bs_frenzy': 'bs_fury', 'ss_precision': 'ss_focus', 'bh_tracker': 'bh_instinct', 'el_mastery': 'el_surge', 'wl_pact': 'wl_mark',
           'pr_grace': 'pr_heal', 'or_clair': 'or_foresight', 'as_precision': 'as_mark', 'sd_rhythm': 'sd_dance', 'al_brewing': 'al_catalyst', 'mc_expert': 'mc_overcharge'}
for pid, src in PASSIVE.items():
    ic = ImageEnhance.Brightness(ImageEnhance.Color(done[src]).enhance(0.55)).enhance(0.7).convert('RGBA')
    d = ImageDraw.Draw(ic); d.ellipse((5, 5, 90, 90), outline=(232, 196, 106, 255), width=5); d.ellipse((12, 12, 83, 83), outline=(255, 240, 190, 120), width=2)
    ic.save(os.path.join(OUT, pid + '.webp'), quality=90)
print(len(done), 'cards +', len(PASSIVE), 'passives')
