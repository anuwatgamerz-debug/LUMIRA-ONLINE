"""point monsters that shared one LPC sheet at their own humanoid sheet from build_mobs2.py (visual fields only:
spr, tint, scale — stats, drops and AI are untouched)."""
import os, re
ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
# monster id -> (sheet, scale, tint or None)
MAP = {
    'fangorc': ('m_lpc2_orc', 1.15, None), 'fangarcher': ('m_lpc2_orcarcher', 1.1, None),
    'leafchief': ('m_lpc2_gobchief', 1.1, None), 'leafshaman': ('m_lpc2_gobshaman', 0.92, None),
    'minegoblin': ('m_lpc2_gobminer', 0.92, None), 'raider': ('m_lpc2_gobraider', 0.92, None), 'banditlook': ('m_lpc2_bandit', 1, None),
    'dunewolf': ('m_lpc2_boneknight', 1, None), 'boneknight': ('m_lpc2_boneknight', 1.1, [200, 0.6, -6]),
    'mosshog': ('m_lpc2_bonemage', 1, None), 'skeletonminer': ('m_lpc2_boneminer', 1, None), 'cryptskeleton': ('m_lpc2_bonecrypt', 1, None),
    'ghoul': ('m_lpc2_ghoul', 1, None), 'bogzombie': ('m_lpc2_bogzombie', 1, None),
    'pondlurker': ('m_lpc2_lizard', 1, None), 'labyrinthguard': ('m_lpc2_minoguard', 1.15, None),
}
path = os.path.join(ROOT, 'content', 'monsters.js')
src = open(path, encoding='utf-8', newline='').read()
for mid, (spr, sc, tint) in MAP.items():
    m = re.search(r"^(?:legacy|m)\('" + mid + r"',[^\n]*?(?:\n[^\n]*?)?spr: '[^']+'[^\n]*", src, re.M)
    if not m: raise SystemExit('not found: ' + mid)
    line = m.group(0)
    nl = re.sub(r"spr: '[^']+'", f"spr: '{spr}'", line, 1)
    nl = re.sub(r",? ?tint: \[[^\]]*\]", '', nl, 1)
    nl = re.sub(r",? ?scale: [0-9.]+", '', nl, 1)
    extra = (f", tint: [{tint[0]}, {tint[1]}, {tint[2]}]" if tint else '') + (f", scale: {sc:g}" if sc != 1 else '')
    nl = nl.replace(f"spr: '{spr}'", f"spr: '{spr}'{extra}", 1)
    src = src.replace(line, nl)
    print(f'{mid:15s} -> {spr}{extra}')
open(path, 'w', encoding='utf-8', newline='').write(src)
