#!/usr/bin/env python3
"""ELYNDRA VFX textures (Phase 1).

Source: Kenney "Particle Pack" 1.1 (CC0) — kept untouched in public/assets/vfx/source/kenney_particle_pack/.
Each runtime texture is the source sprite converted to WHITE + alpha (so the game tints it per skill at runtime),
trimmed to its visible area, resized and saved as lossless WebP in its category folder.

usage: python3 tools/art/build_vfx.py [path-to-kenney_particle_pack]
"""
import os, sys, shutil, json
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'public', 'assets', 'vfx')
SRC = os.path.join(OUT, 'source', 'kenney_particle_pack')

# runtime id -> (category, source file, size px)
TEX = {
    'slash_arc':   ('sword', 'slash_02.png', 96),
    'slash_wide':  ('sword', 'slash_04.png', 96),
    'slash_thin':  ('sword', 'slash_03.png', 64),
    'claw':        ('melee', 'scratch_01.png', 64),
    'star_hit':    ('impact', 'star_07.png', 64),
    'flash':       ('impact', 'star_09.png', 64),
    'burst':       ('impact', 'scorch_01.png', 64),
    'spark':       ('impact', 'star_04.png', 32),
    'compass':     ('impact', 'magic_03.png', 64),
    'dust':        ('environment', 'smoke_04.png', 64),
    'flame':       ('fire', 'flame_05.png', 48),
    'blast':       ('fire', 'fire_01.png', 64),
    'muzzle':      ('fire', 'muzzle_02.png', 64),
    'needle':      ('ice', 'trace_06.png', 64),
    'crystal':     ('ice', 'magic_04.png', 64),
    'bolt':        ('lightning', 'spark_05.png', 64),
    'arc':         ('lightning', 'spark_01.png', 64),
    'runes':       ('holy', 'magic_02.png', 96),
    'halo':        ('holy', 'circle_02.png', 96),
    'glow':        ('holy', 'light_01.png', 96),
    'starlight':   ('holy', 'star_06.png', 64),
    'ring':        ('buff', 'circle_03.png', 96),
    'rune_arc':    ('buff', 'magic_01.png', 96),
    'barrier':     ('shield', 'light_03.png', 96),
    'shell':       ('shield', 'circle_01.png', 96),
    'trail':       ('arrow', 'trace_01.png', 64),
    'twirl':       ('wind', 'twirl_01.png', 64),
    'streak':      ('wind', 'trace_02.png', 64),
    'smoke':       ('dark', 'smoke_07.png', 64),
    'bubble':      ('poison', 'circle_05.png', 32),
    'sparkle':     ('heal', 'star_01.png', 48),
    'splash':      ('alchemy', 'dirt_01.png', 64),
    'weld':        ('mechanical', 'spark_07.png', 64),
    'stun':        ('status', 'symbol_02.png', 32),
}
EMPTY = ['trap']  # categories reserved for the next phases


def convert(src, size):
    a = np.array(Image.open(src).convert('RGBA')).astype(np.float32)
    lum = a[..., :3].max(axis=2) / 255.0
    alpha = a[..., 3] / 255.0 * lum
    alpha = alpha / max(alpha.max(), 1e-6)
    alpha = alpha ** 0.45  # firmer edges: soft particles read better over bright ground at game scale
    out = np.zeros_like(a); out[..., :3] = 255; out[..., 3] = np.clip(alpha * 255, 0, 255)
    im = Image.fromarray(out.astype(np.uint8), 'RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox() or (0, 0, im.width, im.height)
    # square crop around the visible shape (so the sprite size in the game is the size of what you see)
    cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
    r = max(bb[2] - bb[0], bb[3] - bb[1]) / 2 + 4
    im = im.crop((int(cx - r), int(cy - r), int(cx + r), int(cy + r)))
    return im.resize((size, size), Image.LANCZOS)


def main():
    pack = sys.argv[1] if len(sys.argv) > 1 else SRC
    os.makedirs(SRC, exist_ok=True)
    manifest = {}
    for tid, (cat, fn, size) in TEX.items():
        src = os.path.join(pack, fn)
        dst_src = os.path.join(SRC, fn)
        if os.path.abspath(src) != os.path.abspath(dst_src): shutil.copyfile(src, dst_src)
        os.makedirs(os.path.join(OUT, cat), exist_ok=True)
        out = os.path.join(OUT, cat, tid + '.webp')
        convert(dst_src, size).save(out, 'WEBP', lossless=True, quality=100, method=6)
        manifest[tid] = {'file': f'{cat}/{tid}.webp', 'size': size, 'source': f'source/kenney_particle_pack/{fn}'}
    lic = os.path.join(pack, 'LICENSE.txt')
    if os.path.exists(lic) and os.path.abspath(lic) != os.path.abspath(os.path.join(SRC, 'LICENSE.txt')): shutil.copyfile(lic, os.path.join(SRC, 'LICENSE.txt'))
    for cat in EMPTY:
        os.makedirs(os.path.join(OUT, cat), exist_ok=True); open(os.path.join(OUT, cat, '.gitkeep'), 'w').close()
    with open(os.path.join(OUT, 'textures.json'), 'w') as f: json.dump(manifest, f, indent=1)
    print(len(manifest), 'textures')


if __name__ == '__main__':
    main()
