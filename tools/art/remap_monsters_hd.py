"""python tools/art/remap_monsters_hd.py  -> points every monster in content/monsters.js at its ELYNDRA HD sheet.

Only the visual fields change (spr / tint / scale; the server just forwards them to the client):
  - spr   : m_hd_<kind> chosen by what the monster is (name / family), not by the old shared LPC sheet
  - scale : old scale x (old sheet height / new sheet height), so every monster keeps its on-screen size
  - tint  : hue offset corrected by the difference between the old and new base colours, so each monster keeps the
            colour family its tint gave it (saturation / lightness parts unchanged)
"""
import json, math, os, re, colorsys
import numpy as np
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
A = os.path.join(ROOT, 'public', 'assets')
KIND = {
    'jellop': 'jelly', 'crab': 'crab', 'leafling': 'sprout', 'cactimp': 'cactus', 'dunewolf': 'boneknight', 'mosshog': 'skeleton',
    'kingjel': 'kingjelly', 'dewslime': 'slime', 'sprout': 'sprout', 'fluffle': 'slime', 'hopper': 'beetle', 'budling': 'bloom',
    'mossslime': 'slime', 'thornsprite': 'imp', 'barkbeetle': 'beetle', 'mossgoblin': 'goblin', 'goblinsling': 'goblin', 'wisp': 'wisp',
    'thornwolf': 'wolf', 'bramblekin': 'bloom', 'creekcrab': 'crab', 'moonslime': 'slime', 'nightmoth': 'moth', 'pondlurker': 'snake',
    'lanternspirit': 'wisp', 'willowwraith': 'wraith', 'froglord': 'frogman', 'cavebat': 'bat', 'minegoblin': 'goblin',
    'crystalcrawler': 'beetle', 'rustbot': 'automaton', 'skeletonminer': 'skeleton', 'golemite': 'golem', 'oreelemental': 'golem',
    'tarslime': 'slime', 'raider': 'goblin', 'banditlook': 'goblin', 'thornwood': 'treant', 'ironjaw': 'automaton', 'caverat': 'rat',
    'shroomlet': 'mushroom', 'pinkjel': 'jelly', 'burrowbat': 'bat', 'spiderling': 'spider', 'webspinner': 'spider', 'nestcentipede': 'centipede',
    'venomshroom': 'mushroom', 'cryptskeleton': 'skeleton', 'ghoul': 'zombie', 'cryptwraith': 'wraith', 'gravepumpkin': 'pumpkin',
    'labyrinthguard': 'minotaur', 'cavebear': 'bear', 'giantcentipede': 'centipede', 'boneknight': 'boneknight', 'jellyqueen': 'kingjelly',
    'broodmother': 'spider', 'moonfang': 'werewolf', 'labyrinthking': 'minotaur', 'vinesnake': 'snake', 'canopybee': 'bee',
    'leafgoblin': 'goblin', 'mossbear': 'bear', 'leafshaman': 'goblin', 'leafchief': 'goblin', 'sporeling': 'mushroom', 'capshroom': 'mushroom',
    'sporebat': 'bat', 'shroomfrog': 'frogman', 'eldercap': 'mushroom', 'leafwisp': 'wisp', 'spiritwolf': 'wolf', 'mossgolem': 'golem',
    'grovewarden': 'golem', 'valleywolf': 'wolf', 'fangorc': 'orc', 'fangarcher': 'orc', 'grizzly': 'bear', 'silvermane': 'werewolf',
    'grimpaw': 'bear', 'mirefrog': 'frogman', 'bogviper': 'viper', 'bogzombie': 'zombie', 'marshwisp': 'wisp', 'mireking': 'frogman',
    'heartgrub': 'centipede', 'rootguard': 'treant', 'sapspirit': 'ghost', 'barkspider': 'spider', 'rotheart': 'treant',
}
meta = json.load(open(os.path.join(A, 'meta.json'), encoding='utf-8'))


def stats(name):
    """S idle frame of a px sheet: (height, circular mean hue in degrees or None)"""
    P = meta['px'][name]
    im = np.asarray(Image.open(os.path.join(A, name + '.png')).convert('RGBA')).astype(np.float32)
    fr = im[2 * P['fh']:3 * P['fh'], 0:P['fw']]
    a = fr[..., 3] > 0
    ys = np.nonzero(a.any(axis=1))[0]
    h = (ys[-1] - ys[0] + 1) if len(ys) else 0
    px = fr[a][:, :3] / 255
    sx = sy = 0.0
    for r, g, b in px:
        hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
        if ll < 0.12 or ll > 0.92: continue   # outlines + highlights don't count, like tintSheet
        w = ss
        sx += math.cos(hh * 2 * math.pi) * w; sy += math.sin(hh * 2 * math.pi) * w
    hue = None if abs(sx) + abs(sy) < 1e-3 else (math.degrees(math.atan2(sy, sx)) % 360)
    return h, hue


def main():
    path = os.path.join(ROOT, 'content', 'monsters.js')
    src = open(path, encoding='utf-8', newline='').read()
    cache, report = {}, []
    for mid, kind in KIND.items():
        m = re.search(r"^(?:legacy|m)\('" + mid + r"',[^\n]*?(?:\n[^\n]*?)?spr: '[^']+'[^\n]*", src, re.M)   # spr may sit on the next line
        if not m: report.append(f'{mid}: NOT FOUND'); continue
        line = m.group(0)
        old = re.search(r"spr: '([^']+)'", line).group(1)
        new = 'm_hd_' + kind
        if old not in cache and not old.startswith('proc:'): cache[old] = stats(old)
        if new not in cache: cache[new] = stats(new)
        hn, hue_n = cache[new]
        if old.startswith('proc:'): ho, hue_o = 30, None
        else: ho, hue_o = cache[old]
        sc_m = re.search(r"scale: ([0-9.]+)", line); sc = float(sc_m.group(1)) if sc_m else 1.0
        nsc = round(sc * ho / max(1, hn), 2)
        nsc = max(0.5, min(3.2, nsc))
        tm = re.search(r"tint: \[(-?[0-9.]+), (-?[0-9.]+), (-?[0-9.]+)\]", line)
        off = 0 if (hue_o is None or hue_n is None) else ((hue_o - hue_n + 540) % 360) - 180
        if tm:
            dh, sm, dl = float(tm.group(1)), tm.group(2), tm.group(3)
            nd = int(round(((dh + off + 540) % 360) - 180))
            new_tint = f"tint: [{nd}, {sm}, {dl}]"
        else:
            new_tint = f"tint: [{int(round(off))}, 1, 0]" if abs(off) > 25 else None
        nl = line.replace(f"spr: '{old}'", f"spr: '{new}'")
        if tm: nl = nl.replace(tm.group(0), new_tint)
        elif new_tint: nl = nl.replace(f"spr: '{new}'", f"spr: '{new}', {new_tint}")
        if sc_m: nl = nl.replace(sc_m.group(0), f"scale: {nsc:g}") if nsc != 1 else nl.replace(', ' + sc_m.group(0), '')
        elif nsc != 1: nl = nl.replace(f"spr: '{new}'", f"spr: '{new}', scale: {nsc:g}", 1)
        src = src.replace(line, nl)
        report.append(f'{mid:15s} {old:16s} -> {new:16s} scale {sc:g} -> {nsc:g}  hue {hue_o and round(hue_o)} / {hue_n and round(hue_n)}  {new_tint or ""}')
    open(path, 'w', encoding='utf-8', newline='').write(src)
    print('\n'.join(report))


if __name__ == '__main__':
    main()
