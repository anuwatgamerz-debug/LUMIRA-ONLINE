"""python tools/art/enhance_sprites.py [--out DIR] [--only lpc,hd,v1,mobs]

"Lit" pass for character and monster sheets: keeps every pixel's design (shape, palette family, outline, frame
layout) and adds light on top, so the art reads with more depth on the map:
  - colour clean-up: a little more saturation in the mid tones (outlines and highlights are left alone)
  - volume: soft top-down light across each frame (top +, feet -), measured on the body so all paperdoll layers
    of one frame get the same light
  - rim light: celestial-blue back light on the silhouette edges that face up / sideways (never the feet)
Glow, aura, dust and hit effects are NOT baked in (the engine draws them; see build_fx_sheets in this file).

Paperdoll layers are lit against the body: a layer edge only gets rim light when the pixel beyond it is empty in
the layer AND in the base body of the same frame, so seams inside the character (hair over face, collar over neck)
stay clean. Hair-ramp key colours (chars.json "keys.hair") are only ever swapped for another key colour, so the
client's hair recolour (paperdoll.js pdImage) keeps working.

Reads public/assets, writes the same relative paths under --out (default: ../ElyndraArt/Exports/enhanced, outside
the repo). Nothing in public/assets is changed.
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..'))
ASSETS = os.path.join(REPO, 'public', 'assets')
DEFAULT_OUT = os.path.normpath(os.path.join(REPO, '..', 'ElyndraArt', 'Exports', 'enhanced'))

RIM = np.array([170, 222, 255], np.float32)   # Celestial Blue back light
SAT = 1.10          # mid-tone saturation boost
LIGHT_TOP, LIGHT_FEET = 1.07, 0.90
RIM_EDGE, RIM_INNER = 0.40, 0.38
SETS = {'lpc': 'chr_lpc', 'hd': 'chr_hd', 'v1': 'characters'}


def load(path):
    return np.asarray(Image.open(path).convert('RGBA'), np.float32)


def save(arr, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(np.clip(arr + 0.5, 0, 255).astype(np.uint8), 'RGBA').save(path, optimize=True)


def shift(m, dy, dx):
    """m shifted so out[y, x] = m[y + dy, x + dx] (False outside)."""
    h, w = m.shape
    out = np.zeros_like(m)
    ys, yd = (slice(dy, h), slice(0, h - dy)) if dy >= 0 else (slice(0, h + dy), slice(-dy, h))
    xs, xd = (slice(dx, w), slice(0, w - dx)) if dx >= 0 else (slice(0, w + dx), slice(-dx, w))
    out[yd, xd] = m[ys, xs]
    return out


def frame_light(body, fw, fh):
    """per-pixel 0..1 height inside each frame's body (0 = top of head, 1 = feet), from the body mask."""
    h, w = body.shape
    t = np.full((h, w), 0.5, np.float32)
    for y0 in range(0, h - fh + 1, fh):
        for x0 in range(0, w - fw + 1, fw):
            rows = np.nonzero(body[y0:y0 + fh, x0:x0 + fw].any(axis=1))[0]
            if len(rows) < 2: continue
            top, bot = rows[0], rows[-1]
            yy = np.arange(fh, dtype=np.float32)[:, None]
            t[y0:y0 + fh, x0:x0 + fw] = np.clip((yy - top) / max(1, bot - top), 0, 1)
    return t


def enhance(px, body=None, fw=64, fh=64, keys=None):
    """px: HxWx4 float RGBA. body: bool mask of the character body for this sheet (None = the sheet itself)."""
    rgb, a = px[..., :3].copy(), px[..., 3]
    own = a > 8
    sil = own if body is None else (own | body)
    t = frame_light(sil if body is None else body, fw, fh)

    key_idx = np.full(own.shape, -1, np.int8)
    if keys:
        for i, k in enumerate(keys):
            c = np.array([int(k[j:j + 2], 16) for j in (1, 3, 5)], np.float32)
            key_idx[own & np.all(np.abs(px[..., :3] - c) < 0.5, axis=-1)] = i
    free = own & (key_idx < 0)

    # colour clean-up: saturation in the mid tones only (outlines stay dark, highlights stay clean)
    luma = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    mid = np.clip((luma - 30) / 40, 0, 1) * np.clip((235 - luma) / 40, 0, 1)
    sat = 1 + (SAT - 1) * mid
    rgb = np.where(free[..., None], luma[..., None] + (rgb - luma[..., None]) * sat[..., None], rgb)

    # volume: top-down light measured on the body
    k = LIGHT_TOP + (LIGHT_FEET - LIGHT_TOP) * t
    rgb = np.where(free[..., None], rgb * k[..., None], rgb)

    # rim light: silhouette edges facing up / sideways, fading toward the feet. Dark outline pixels keep their
    # outline (only a touch of light); the light lands on the first pixel inside them instead, as a pixel artist would.
    empty = ~sil
    fade = 1 - 0.75 * t
    e_up, e_l, e_r = own & shift(empty, -1, 0), own & shift(empty, 0, -1), own & shift(empty, 0, 1)
    e_dg = own & (shift(empty, -1, -1) | shift(empty, -1, 1))
    dark = luma < 70
    w_edge = np.maximum.reduce([e_up * 1.0, e_l * 0.55, e_r * 0.55, e_dg * 0.35]).astype(np.float32)
    edge = np.where(dark, 0.35, 1.0) * w_edge * fade
    inner = np.maximum.reduce([shift(e_up & dark, -1, 0) * 1.0,          # pixel below a dark top outline
                               shift(e_l & dark, 0, -1) * 0.55,          # pixel right of a dark left outline
                               shift(e_r & dark, 0, 1) * 0.55]).astype(np.float32)
    inner = np.where(own & ~(dark & (w_edge > 0)), inner, 0) * fade
    rgb = np.where(free[..., None], rgb + (RIM - rgb) * (edge * RIM_EDGE)[..., None], rgb)
    rgb = np.where(free[..., None], rgb + (RIM - rgb) * (inner * RIM_INNER)[..., None], rgb)
    edge = np.maximum(edge, inner)

    # hair-ramp pixels: rim = one step up the key ramp (exact key colours only)
    if keys:
        lit = (key_idx >= 0) & (edge > 0.45) & ~dark
        step = np.clip(key_idx.astype(np.int16) + 1, 0, len(keys) - 1)
        for i, kk in enumerate(keys):
            c = np.array([int(kk[j:j + 2], 16) for j in (1, 3, 5)], np.float32)
            rgb[lit & (step == i)] = c

    out = px.copy()
    out[..., :3] = np.where(own[..., None], np.clip(rgb, 0, 255), px[..., :3])
    return out


# ------------------------------------------------------------ paperdoll sets
def do_set(key, out_root, log):
    folder = SETS[key]
    man = json.load(open(os.path.join(ASSETS, folder, 'chars.json'), encoding='utf-8'))
    frame = man.get('frame') or 64
    fw, fh = (frame if isinstance(frame, list) else [frame, frame])
    keys = (man.get('keys') or {}).get('hair')
    groups = list(man['groups'].keys())
    bases = {}
    for sx in ('male', 'female'):
        rel = man['layers'].get('chr_base_' + sx)
        for g in groups:
            p = os.path.join(ASSETS, rel + '_' + g + '.png') if rel else None
            if p and os.path.exists(p): bases[(sx, g)] = load(p)[..., 3] > 8
    n = 0
    for name, rel in man['layers'].items():
        for g in groups:
            src = os.path.join(ASSETS, rel + '_' + g + '.png')
            if not os.path.exists(src): continue
            px = load(src)
            if name.startswith('chr_base_'): body = None
            else:
                cand = [bases[(sx, g)] for sx in ('male', 'female') if (sx, g) in bases and name.endswith('_' + sx)] or \
                       [bases[(sx, g)] for sx in ('male', 'female') if (sx, g) in bases]
                cand = [b for b in cand if b.shape == px.shape[:2]]
                body = np.logical_or.reduce(cand) if cand else None
            tinted = name.startswith(('chr_hair_', 'chr_face_'))  # layers the client recolours by key colour
            save(enhance(px, body, fw, fh, keys if tinted else None), os.path.join(out_root, rel + '_' + g + '.png'))
            n += 1
    log(f'{key}: {n} layer sheets')
    return n


# ------------------------------------------------------------ standalone sheets (monsters, legacy heroes, NPCs)
def do_sheets(out_root, log, prefixes=('m_', 'h_', 'n_')):
    meta = json.load(open(os.path.join(ASSETS, 'meta.json'), encoding='utf-8'))
    n = 0
    for kind in ('lpc', 'px'):
        for name, M in meta[kind].items():
            if not name.startswith(prefixes): continue
            src = os.path.join(ASSETS, name + '.png')
            if not os.path.exists(src): continue
            fw, fh = (M['cell'], M['cell']) if kind == 'lpc' else (M['fw'], M['fh'])
            save(enhance(load(src), None, fw, fh), os.path.join(out_root, name + '.png'))
            n += 1
    log(f'sheets: {n} monster / hero / npc sheets')
    return n


# ------------------------------------------------------------ light effects (white + alpha, tinted by the engine)
def _alpha_steps(a):
    """pixel-art alpha: 4 hard levels instead of a smooth ramp."""
    return np.select([a > 0.75, a > 0.45, a > 0.2, a > 0.06], [255, 170, 100, 45], 0).astype(np.float32)


def _sheet(frames):
    h, w = frames[0].shape
    out = np.zeros((h, w * len(frames), 4), np.float32)
    for i, a in enumerate(frames):
        out[:, i * w:(i + 1) * w, :3] = 255
        out[:, i * w:(i + 1) * w, 3] = _alpha_steps(np.clip(a, 0, 1))
    return out


def build_fx_sheets(out_root, log):
    """aura ring (8f 48x24, loop), walk dust (6f 24x16), slash arc (6f 64x64), hit spark (6f 32x32)."""
    fx = {}
    yy, xx = np.mgrid[0:24, 0:48].astype(np.float32)
    fr = []
    for f in range(8):  # ground ring with a travelling bright spot + 3 rising motes
        r = np.hypot((xx - 23.5) / 16, (yy - 15.5) / 5.5)
        ang = np.arctan2(yy - 15.5, (xx - 23.5) / 3)
        a = np.exp(-((r - 1) / 0.16) ** 2) * (0.45 + 0.55 * np.cos(ang - f / 8 * 2 * np.pi) ** 8)
        for i in range(3):
            ph = (f / 8 + i / 3) % 1
            mx, my = 23.5 + 12 * np.sin(i * 2.1 + 1), 15 - ph * 14
            a = np.maximum(a, (1 - ph) * ((np.abs(xx - mx) < 0.6) & (np.abs(yy - my) < 1.1)))
        fr.append(a)
    fx['aura_ring'] = fr
    yy, xx = np.mgrid[0:16, 0:24].astype(np.float32)
    fr = []
    for f in range(6):  # three puffs that grow, drift up and fade
        p = (f + 1) / 6
        a = np.zeros_like(xx)
        for cx, cy, s in ((8, 12, 1.0), (14, 11, 0.8), (18, 13, 0.6)):
            rr = 1.2 + 4.2 * p * s
            a = np.maximum(a, (np.hypot(xx - cx - 2 * p, yy - cy + 3 * p) < rr) * (1 - p) * 0.9)
        fr.append(a)
    fx['dust_puff'] = fr
    yy, xx = np.mgrid[0:64, 0:64].astype(np.float32)
    r, ang = np.hypot(xx - 32, yy - 34), np.arctan2(yy - 34, xx - 32)
    fr = []
    for f in range(6):  # crescent sweeping from upper-left to lower-right; the tail fades
        head = -2.4 + f / 5 * 3.4
        d = (head - ang)
        band = np.exp(-((r - 22) / (2.2 + 1.6 * (1 - np.clip(d, 0, 1.6) / 1.6))) ** 2)
        a = band * np.clip(1 - d / 1.6, 0, 1) * (d >= -0.05) * (1 - max(0, f - 3) / 3)
        fr.append(a)
    fx['slash_arc'] = fr
    yy, xx = np.mgrid[0:32, 0:32].astype(np.float32)
    r, ang = np.hypot(xx - 15.5, yy - 15.5), np.arctan2(yy - 15.5, xx - 15.5)
    fr = []
    for f in range(6):  # 8-ray star burst that expands and thins out
        p = (f + 1) / 6
        rays = np.cos(ang * 4) ** 16
        a = rays * (r < 3 + 12 * p) * (r > 10 * p - 2) * (1 - p * 0.8) + (r < 4 * (1 - p)) * 1.0
        fr.append(np.clip(a, 0, 1))
    fx['hit_spark'] = fr
    for name, frames in fx.items():
        save(_sheet(frames), os.path.join(out_root, 'fx', name + '.png'))
    log(f'fx: {len(fx)} effect sheets (white + alpha)')
    return {k: [len(v), v[0].shape[1], v[0].shape[0]] for k, v in fx.items()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=DEFAULT_OUT)
    ap.add_argument('--only', default='lpc,hd,v1,mobs,fx')
    a = ap.parse_args()
    if os.path.normcase(os.path.abspath(a.out)) == os.path.normcase(ASSETS):
        sys.exit('refusing to write over public/assets; review the preview first, then copy approved sheets')
    only = a.only.split(',')
    for k in ('lpc', 'hd', 'v1'):
        if k in only: do_set(k, a.out, print)
    if 'mobs' in only: do_sheets(a.out, print)
    if 'fx' in only:
        info = build_fx_sheets(a.out, print)
        json.dump(info, open(os.path.join(a.out, 'fx', 'fx.json'), 'w'), indent=1)  # name -> [frames, w, h]
    print('->', a.out)


if __name__ == '__main__':
    main()
