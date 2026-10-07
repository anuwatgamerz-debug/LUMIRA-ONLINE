"""python tools/art/build_monsters_hd.py [kind,kind...]  -> public/assets/m_hd_<kind>.png + "px" entries in public/assets/meta.json

ELYNDRA HD monster sheets (designs in monster_kinds.py, drawing kit in monsters_hd.py). Layout = the client's
px monster layout: 22 frames per row (idle 4 · walk 6 · atk 5 · hit 2 · die 5), rows N / W / S / E.
"""
import json, os, sys, time
from multiprocessing import Pool
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from monsters_hd import ANIMS, NCOLS, ROWS, Pose
from monster_kinds import KINDS
from lumira_art import Layer, save_png

ASSETS = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets')


def geometry(kind):
    """frame + anchor at the kind's size factor k (frames stay even-sized, feet keep their relative height)"""
    S = KINDS[kind]; k = S.get('k', 1.0)
    fw, fh = S['frame']; ax, ay = S['anchor']
    FW, FH = int(-(-fw * k // 2) * 2), int(-(-fh * k // 2) * 2)
    return (FW, FH), (FW // 2, int(round(ay * k)))


def render_frame(kind, view, anim, f):
    S = dict(KINDS[kind]); (fw, fh), anchor = geometry(kind)
    n = ANIMS[anim][1]
    P = Pose(view, anim, f, n, S.get('h', 24), (fw, fh), anchor, S.get('flyer', False), S.get('k', 1.0))
    L = Layer(fw, fh)
    S['arch'](L, P, S)
    return L.image()


def render(kind):
    (fw, fh), _ = geometry(kind)
    sheet = np.zeros((fh * 4, fw * NCOLS, 4), np.uint8)
    for r, view in enumerate(ROWS):
        if view == 'W': continue
        for anim, (c0, n, fps, loop) in ANIMS.items():
            for f in range(n):
                sheet[r * fh:(r + 1) * fh, (c0 + f) * fw:(c0 + f + 1) * fw] = render_frame(kind, view, anim, f)
    e, w = ROWS.index('E'), ROWS.index('W')
    for c in range(NCOLS):   # W = E mirrored inside each frame
        sheet[w * fh:(w + 1) * fh, c * fw:(c + 1) * fw] = sheet[e * fh:(e + 1) * fh, c * fw:(c + 1) * fw][:, ::-1]
    save_png(sheet, os.path.join(ASSETS, 'm_hd_' + kind + '.png'))
    return kind


if __name__ == '__main__':
    t = time.time()
    kinds = sys.argv[1].split(',') if len(sys.argv) > 1 else list(KINDS)
    with Pool(max(1, os.cpu_count() or 2)) as p: done = p.map(render, kinds)
    mp = os.path.join(ASSETS, 'meta.json')
    meta = json.load(open(mp, encoding='utf-8'))
    for k in done:
        (fw, fh), (ax, ay) = geometry(k)
        meta['px']['m_hd_' + k] = {'fw': fw, 'fh': fh, 'ppt': 32, 'ax': ax, 'ay': ay, 'dirs': 4,
                                   'anims': {a: list(v) for a, v in ANIMS.items()}, 'set': 'hd'}
    with open(mp, 'w', encoding='utf-8') as f: json.dump(meta, f, separators=(',', ':'))
    print(len(done), 'HD monster sheets in', round(time.time() - t, 1), 's')
