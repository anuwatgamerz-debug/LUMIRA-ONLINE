#!/usr/bin/env python3
# item icons atlas from "496 pixel art icons for medieval/fantasy RPG" by Henrique Lazarini (7Soul1), CC0
import sys, json, colorsys
from PIL import Image
SRC = '/home/claude/dl2/x/496_RPG_icons/'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/icons'
# id -> (file, hue shift degrees or None)
M = {
 1: 'P_Red01', 2: 'P_Orange01', 3: 'P_Blue01', 4: 'I_C_Bread', 5: 'P_Red03', 6: 'P_Blue03', 7: 'I_Scroll02', 8: 'P_Green02',
 10: 'I_Water', 11: 'I_SolidShell', 12: 'I_ScorpionClaw', 13: 'I_Bone', 14: 'I_Leaf', 15: 'I_Crystal01',
 20: 'W_Dagger002', 21: 'W_Sword001', 22: 'W_Sword003', 23: 'W_Dagger010', 30: 'A_Clothing01', 31: 'A_Armour01', 40: 'C_Hat01', 41: ('C_Elm04', 200),
 100: 'I_C_Nut', 101: 'I_RabbitPaw', 102: 'I_Feather01', 103: 'I_Water', 104: 'I_Leaf', 105: ('E_Wood01', 60), 106: 'I_SnailShell', 107: 'I_Fang', 108: 'I_Fabric',
 109: ('I_Crystal02', 0), 110: 'I_C_Nut', 111: 'I_FishTail', 112: ('I_Bottle02', 0), 113: 'I_Feather02', 114: ('I_Leaf', 30), 115: 'I_Torch01', 116: 'I_Fabric',
 117: 'I_BatWing', 118: 'I_Rock02', 119: 'I_Clock', 120: 'I_Rock03', 121: 'I_SilverBar', 122: 'I_Ink', 123: 'E_Wood03', 124: 'I_IronBall', 125: 'E_Wood02', 126: 'I_Crystal03',
 127: ('I_Bottle03', 0), 128: 'I_FoxTail', 129: 'I_C_Mushroom', 130: 'I_Fabric', 131: 'I_ScorpionClaw', 132: 'I_Fang', 133: 'I_Fabric', 134: 'E_Bones02', 135: 'I_WolfFur',
 136: 'E_Bones03', 137: 'I_WolfFur', 138: 'E_Bones03',
 150: 'I_Crystal02', 151: 'I_Scroll', 152: 'E_Wood04', 153: 'I_Book', 154: ('I_Crystal03', 120), 155: 'Ac_Medal01', 156: 'I_Feather02', 157: 'I_Crystal01',
 158: 'I_Fabric', 159: 'I_Chest01', 160: 'W_Mace001', 161: 'I_Scroll02', 162: 'I_Clover', 163: 'I_Chest02',
 200: 'W_Sword002', 201: 'W_Staff01', 202: 'W_Bow01', 203: 'W_Mace002', 204: 'W_Staff02', 205: 'W_Sword004', 206: 'W_Sword010', 207: 'W_Dagger004', 208: 'W_Bow03',
 209: 'W_Staff03', 210: 'W_Mace005', 211: 'W_Spear001', 212: 'W_Gun001', 213: 'W_Staff04', 214: 'W_Sword007', 215: 'W_Bow06', 216: 'W_Staff05', 217: 'W_Sword012',
 218: 'W_Dagger012', 219: 'W_Sword015', 220: 'W_Bow10', 221: 'W_Staff06', 222: 'W_Mace010', 223: 'W_Gun002', 224: 'W_Spear006', 225: 'W_Dagger016', 226: 'W_Staff07',
 227: 'W_Axe010', 228: 'W_Bow12',
 300: 'A_Clothing02', 301: ('A_Clothing01', 200), 302: 'A_Armour02', 303: 'A_Armor04', 304: 'A_Armour03', 305: ('A_Clothing02', 220), 306: ('A_Armour01', 230),
 307: ('A_Armour02', 70), 308: ('A_Clothing01', 240), 309: 'A_Armor05', 310: ('A_Armour02', 30), 311: ('A_Armor05', 200), 312: ('A_Armour01', 20), 313: ('A_Clothing02', 270),
 350: ('C_Hat02', 30), 351: ('C_Hat01', -20), 352: 'C_Elm01', 353: 'C_Elm03', 354: ('C_Hat02', 230), 355: ('C_Hat01', 90), 356: ('C_Hat01', 40), 357: 'C_Elm04',
 358: ('C_Hat01', 260), 359: ('Ac_Medal02', 80), 360: ('C_Elm01', 30), 361: ('C_Hat01', 200), 362: 'C_Elm04', 363: 'C_Hat02', 364: ('C_Elm04', 300), 365: 'C_Elm03',
 400: 'Ac_Ring01', 401: 'Ac_Necklace01', 402: 'Ac_Medal03', 403: 'I_Clover', 404: 'Ac_Ring02', 405: 'Ac_Necklace03', 406: ('Ac_Medal04', 120), 407: 'Ac_Necklace05',
 408: ('Ac_Ring02', 80), 409: 'Ac_Necklace06', 410: 'Ac_Necklace08', 411: ('Ac_Ring01', 200),
 450: ('C_Hat01', 300), 451: ('Ac_Medal02', 300), 452: ('C_Hat02', 300), 453: ('C_Hat02', 260),
}
def hue(im, deg):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if s < 0.12: continue
            r2, g2, b2 = colorsys.hls_to_rgb((h + deg / 360) % 1, l, s)
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im
ids = sorted(M); cols = 16; S = 34
sheet = Image.new('RGBA', (cols * S, ((len(ids) + cols - 1) // cols) * S))
mp = {}
for i, k in enumerate(ids):
    v = M[k]; f, d = (v, None) if isinstance(v, str) else v
    im = Image.open(SRC + f + '.png').convert('RGBA')
    if d: im = hue(im, d)
    sheet.alpha_composite(im, ((i % cols) * S, (i // cols) * S)); mp[str(k)] = i
import os; os.makedirs(OUT, exist_ok=True)
sheet.save(OUT + '/items_lpc.png')
json.dump({'file': 'items_lpc.png', 'cell': S, 'cols': cols, 'rows': (len(ids) + cols - 1) // cols, 'w': sheet.width, 'h': sheet.height, 'map': mp}, open(OUT + '/items_lpc.json', 'w'))
print(len(ids), sheet.size)
