#!/usr/bin/env python3
"""Append icons for new items to the item atlas (public/assets/ui/items_lpc.png + the items_lpc map in ui.json).

The atlas was built by build_icons.py from the CC0 "496 pixel art icons" pack (Henrique Lazarini / 7Soul1). New items reuse
an existing cell of a similar item, recoloured (see NEW).
Re-running is safe: ids already in the atlas are skipped unless --force is given (then they are redrawn in place).

  python tools/art/lpc/extend_icons.py [--force]
"""
import colorsys, json, os, sys
from PIL import Image

UI = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'public', 'assets', 'ui')
NEW = {   # id: (source item id, target hue in degrees or None = keep, saturation x, lightness +, colourise grey pixels 0-1)
    # ---- Region 3: Ashen Frontier
    500: (180, None, 0.1, -0.04, 0), 501: (106, 8, 1.3, -0.06, 0), 502: (183, None, 0.25, -0.08, 0), 503: (102, None, 0.12, -0.18, 0), 504: (195, 25, 1.2, 0, 0),
    505: (136, 8, 1.0, -0.06, 0.5), 506: (401, None, 1, 0, 0), 507: (106, 25, 1.4, 0, 0), 508: (118, 20, 0.5, -0.18, 0.15), 509: (117, 15, 1.2, -0.05, 0.4),
    510: (131, None, 0.3, -0.12, 0), 511: (181, None, 0.1, -0.25, 0), 512: (187, None, 1.2, 0, 0), 513: (132, 0, 1, -0.05, 0.25), 514: (195, 18, 1.4, 0.06, 0),
    515: (108, 355, 1.3, -0.1, 0.6), 516: (185, 28, 1.4, 0, 0), 517: (109, None, 0.1, -0.1, 0), 518: (134, None, 0.4, -0.25, 0), 519: (155, 0, 1.2, -0.05, 0),
    520: (124, 18, 1.5, -0.02, 0.7), 521: (126, 22, 1.4, 0.02, 0.8),
    530: (196, None, 0.1, -0.1, 0), 531: (227, None, 0.6, -0.08, 0), 532: (119, 40, 1.3, 0, 0.4), 533: (195, 12, 1.5, 0.04, 0), 534: (138, 30, 1.2, 0, 0.3),
    535: (193, 20, 1.5, 0, 0), 536: (138, 10, 1.6, -0.06, 0.5), 537: (226, 280, 1.2, -0.06, 0.3),
    550: (166, None, 1, 0, 0), 551: (165, 275, 0.8, -0.1, 0), 552: (153, 355, 1.2, -0.1, 0.4), 553: (195, 32, 1.6, 0.08, 0), 554: (167, 280, 1, -0.12, 0),
    570: (5, 10, 1.2, 0, 0), 571: (6, 215, 1.2, 0, 0), 572: (9, 185, 1.1, 0.04, 0),
    247: (229, None, 0.8, 0, 0), 248: (230, None, 0.8, 0, 0), 249: (231, 15, 1.2, 0, 0), 250: (232, None, 0.5, -0.05, 0), 251: (233, 15, 1, -0.05, 0), 252: (234, None, 0.8, 0, 0),
    253: (235, None, 0.8, 0, 0), 254: (236, 20, 1.2, 0, 0), 255: (237, None, 0.6, 0, 0), 256: (238, 18, 1.4, 0, 0), 257: (239, 10, 1.1, -0.06, 0), 258: (240, 25, 1.3, 0, 0),
    259: (241, 10, 1.2, 0, 0), 260: (242, 0, 1.3, 0, 0), 261: (243, 30, 1.2, 0, 0), 262: (245, 22, 1.2, 0, 0), 263: (246, 15, 1.3, 0, 0), 264: (244, 280, 1.2, 0, 0),
    265: (241, 22, 1.4, 0.04, 0), 266: (239, 28, 1.4, 0.04, 0),
    323: (314, 25, 0.5, -0.05, 0), 324: (315, None, 0.6, 0, 0), 325: (316, 30, 0.5, -0.05, 0), 326: (317, 12, 1.2, -0.05, 0), 327: (318, 22, 1.4, 0, 0), 328: (319, 355, 1.2, -0.1, 0),
    329: (320, 20, 0.3, -0.18, 0), 330: (322, 25, 0.3, -0.08, 0), 331: (320, 8, 1.3, 0, 0), 332: (321, 22, 1.4, 0, 0),
    371: (353, None, 1, 0, 0), 372: (355, None, 0.4, -0.05, 0), 373: (368, 10, 1, -0.05, 0), 374: (365, None, 0.4, -0.2, 0), 375: (362, None, 1, 0, 0), 376: (357, None, 1, 0, 0),
    419: (412, 15, 1, 0, 0), 420: (413, None, 1, -0.05, 0), 421: (415, 22, 1.3, 0, 0), 422: (414, 25, 1.3, 0, 0), 423: (417, 10, 1.3, 0, 0), 424: (416, 18, 1.4, 0, 0),
    425: (405, 30, 1.2, 0, 0), 426: (417, 280, 1.2, -0.05, 0),
}

def recolour(im, hue, sm, dl, col):
    """hue: target hue (the cell's own hue spread is kept around it) or None; col: colourise grey pixels"""
    im = im.copy(); px = im.load(); hs = []
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a: h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255); hs.append(h) if s > 0.15 else None
    mean = sorted(hs)[len(hs) // 2] if hs else 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if l < 0.08: continue   # keep the outline
            if hue is not None:
                d = ((h - mean + 0.5) % 1) - 0.5; h = (hue / 360 + d * 0.4) % 1
                if s < 0.15 and col: s = max(s, col * (0.35 + 0.65 * (1 - abs(l - 0.5) * 2)))
            r2, g2, b2 = colorsys.hls_to_rgb(h, max(0, min(1, l + dl)), max(0, min(1, s * sm)))
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im

if __name__ == '__main__':
    force = '--force' in sys.argv
    jp = os.path.join(UI, 'ui.json'); U = json.load(open(jp, encoding='utf-8')); A = U['items_lpc']
    sheet = Image.open(os.path.join(UI, A['file'])).convert('RGBA'); S, cols = A['cell'], A['cols']
    cell = lambda i: sheet.crop(((i % cols) * S, (i // cols) * S, (i % cols) * S + S, (i // cols) * S + S))
    todo = [k for k in sorted(NEW) if force or str(k) not in A['map']]
    n = max(A['map'].values()) + 1
    slots = {}
    for k in todo: slots[k] = A['map'][str(k)] if str(k) in A['map'] else None
    for k in todo:
        if slots[k] is None: slots[k] = n; n += 1
    rows = (n + cols - 1) // cols
    if rows * S > sheet.height:
        big = Image.new('RGBA', (cols * S, rows * S)); big.alpha_composite(sheet, (0, 0)); sheet = big
    for k in todo:
        src, hue, sm, dl, col = NEW[k]; im = recolour(cell(A['map'][str(src)]), hue, sm, dl, col); i = slots[k]
        sheet.paste(Image.new('RGBA', (S, S)), ((i % cols) * S, (i // cols) * S)); sheet.alpha_composite(im, ((i % cols) * S, (i // cols) * S))
        A['map'][str(k)] = i
    sheet.save(os.path.join(UI, A['file']), optimize=True)
    A['rows'] = rows; A['h'] = sheet.height; A['w'] = sheet.width
    json.dump(U, open(jp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(len(todo), 'icons ->', sheet.size)
