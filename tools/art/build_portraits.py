#!/usr/bin/env python3
"""ELYNDRA character portraits.

Sources (owner-supplied art, untouched): public/assets/import/portraits/portrait_NNN.png (1254 px, transparent).
Outputs in public/assets/portraits/:
  full/<id>.webp        512 px, the whole bust (big preview)
  thumbnails/<id>.webp  192 px, head + shoulders (gallery)
  hud/<id>.webp         256 px, face focus (HUD circle, party, inspect)
  portrait_default.png  256 px fallback (old characters / missing image)
Crop centres are per image so the face is never cut.
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'public/assets/import/portraits')
OUT = os.path.join(ROOT, 'public/assets/portraits')
# id -> face centre (x, y) in the 1254 px source
FACE = {1: (600, 560), 2: (570, 540), 3: (650, 490), 4: (600, 540), 5: (620, 500), 6: (600, 500), 7: (620, 500), 8: (600, 480)}


def crop(im, cx, cy, s):
    big = Image.new('RGBA', (im.width + 2 * s, im.height + 2 * s), (0, 0, 0, 0)); big.paste(im, (s, s))  # pad: never crop outside
    return big.crop((cx - s // 2 + s, cy - s // 2 + s, cx + s // 2 + s, cy + s // 2 + s))


def main():
    for d in ('full', 'thumbnails', 'hud'): os.makedirs(os.path.join(OUT, d), exist_ok=True)
    for n, (cx, cy) in FACE.items():
        pid = f'portrait_{n:03d}'; im = Image.open(os.path.join(SRC, pid + '.png')).convert('RGBA')
        im.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'full', pid + '.webp'), 'WEBP', quality=90, method=6)
        crop(im, cx, cy + 90, 980).resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'thumbnails', pid + '.webp'), 'WEBP', quality=88, method=6)
        crop(im, cx, cy, 780).resize((256, 256), Image.LANCZOS).save(os.path.join(OUT, 'hud', pid + '.webp'), 'WEBP', quality=90, method=6)
    # fallback: navy medallion with the ELYNDRA emblem
    S = 256; d = Image.new('RGBA', (S, S), (0, 0, 0, 0)); g = ImageDraw.Draw(d)
    g.ellipse((0, 0, S - 1, S - 1), fill=(21, 27, 56, 255)); g.ellipse((10, 10, S - 11, S - 11), outline=(232, 196, 106, 255), width=4)
    em = os.path.join(ROOT, 'public/assets/branding/elyndra-emblem.png')
    if os.path.exists(em):
        e = Image.open(em).convert('RGBA'); e.thumbnail((150, 150), Image.LANCZOS); d.alpha_composite(e, ((S - e.width) // 2, (S - e.height) // 2))
    d.save(os.path.join(OUT, 'portrait_default.png'))
    print(len(FACE), 'portraits')


if __name__ == '__main__':
    main()
