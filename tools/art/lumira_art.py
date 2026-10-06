"""LUMIRA art kit: palette, pixel primitives, shading and outline rules shared by every generated asset.

All numbers follow docs/LUMIRA_ART_BIBLE.md. Light comes from the top-left: for every filled part the
top/left edge uses the light shade, the bottom/right edge the dark shade, the rest the mid shade, and each
layer gets a 1px outline in the darkest colour of the part it surrounds (sel-out). Never pure black.
"""
import math
import numpy as np
from PIL import Image

def hexrgb(h):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

# ---------------------------------------------------------------- master palette (ramps dark -> light)
RAMPS = {
    'green':  ['#1d3324', '#2b4a30', '#3c6a3e', '#538a4a', '#74ad5c', '#a7d27c'],
    'brown':  ['#2e1c14', '#4a2f1e', '#6b4429', '#8c5d36', '#b0804e', '#d6ab7a'],
    'stone':  ['#262833', '#3d404d', '#585c6b', '#777c8c', '#9ea3b2', '#c9cdd8'],
    'cream':  ['#7a6a52', '#a8946e', '#cdb98e', '#e6d6b0', '#f4ead2'],
    'blue':   ['#1c2540', '#2c3a63', '#3f5488', '#5b74ad', '#8aa3d2'],
    'roof':   ['#3a1e1a', '#5c2e24', '#7e4030', '#a2573c', '#c2774f'],
    'gold':   ['#5e4310', '#8a6618', '#b98c2c', '#e0b84e', '#f6dc8a'],
    'sky':    ['#1f4f8c', '#3a86d0', '#74c2f2', '#c4ecff'],
    'violet': ['#2e1d4f', '#4d3283', '#7655b8', '#a88ae0'],
    'ivory':  ['#7a7462', '#b8ae98', '#d9d1bd', '#f2eee2'],
    'red':    ['#4a1016', '#7d1c24', '#b02d33', '#d9564a'],
    'teal':   ['#123232', '#1e4a4a', '#2f7a72', '#4fa898'],
    'copper': ['#3a1d0e', '#5a2e16', '#8f4f26', '#c07a3e'],
    'skin':   ['#5a3426', '#8c5639', '#c08560', '#e8b48c', '#f6d2b0'],   # key ramp, recoloured by the engine
    'hair':   ['#2a1a14', '#4a2c1c', '#6e4228', '#956238'],              # key ramp, recoloured by the engine
    'white':  ['#9a9aa8', '#d8dce6', '#ffffff'],
    'eye':    ['#1a1420', '#3a5a8a', '#ffffff'],
}
OUTLINE_FALLBACK = '#1a1420'
PALETTE = set()
for r in RAMPS.values():
    for c in r: PALETTE.add(hexrgb(c))
PALETTE.add(hexrgb(OUTLINE_FALLBACK))
# soft ground shadow colour used by props / buildings / trees (alpha), the only non-palette pixels allowed
SHADOW = (20, 16, 24, 70)

def ramp(name, lo=None):
    r = [hexrgb(c) for c in RAMPS[name]]
    return r

# ---------------------------------------------------------------- pixel sets
def rect(x0, y0, w, h):
    return {(x, y) for x in range(int(x0), int(x0) + int(w)) for y in range(int(y0), int(y0) + int(h))}

def ellipse(cx, cy, rx, ry):
    out = set()
    for y in range(int(math.floor(cy - ry)), int(math.ceil(cy + ry)) + 1):
        for x in range(int(math.floor(cx - rx)), int(math.ceil(cx + rx)) + 1):
            if ((x + 0.5 - cx) / max(rx, 0.5)) ** 2 + ((y + 0.5 - cy) / max(ry, 0.5)) ** 2 <= 1.0: out.add((x, y))
    return out

def poly(pts):
    """filled polygon (pixel centres inside)"""
    out = set(); ys = [p[1] for p in pts]
    for y in range(int(math.floor(min(ys))), int(math.ceil(max(ys))) + 1):
        yc = y + 0.5; xs = []
        for i in range(len(pts)):
            (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % len(pts)]
            if (y1 <= yc < y2) or (y2 <= yc < y1): xs.append(x1 + (yc - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        for i in range(0, len(xs) - 1, 2):
            for x in range(int(math.ceil(xs[i] - 0.5)), int(math.floor(xs[i + 1] - 0.5)) + 1): out.add((x, y))
    return out

def capsule(a, b, w):
    """thick segment from a to b, width w (limbs, weapon shafts)"""
    (x1, y1), (x2, y2) = a, b; dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L * w / 2, dx / L * w / 2
    s = poly([(x1 + nx, y1 + ny), (x2 + nx, y2 + ny), (x2 - nx, y2 - ny), (x1 - nx, y1 - ny)])
    return s | ellipse(x1, y1, w / 2, w / 2) | ellipse(x2, y2, w / 2, w / 2)

# ---------------------------------------------------------------- layer canvas
class Layer:
    """one frame of one layer: parts are filled with lit/shaded ramps, then outlined (sel-out)"""
    def __init__(self, w=64, h=64):
        self.w, self.h = w, h
        self.px = {}      # (x,y) -> rgb
        self.dark = {}    # (x,y) -> outline colour of the part that owns the pixel

    def fill(self, pix, rp, shade=True, light=None, mid=None, darkc=None):
        """rp: list of rgb (dark->light). shade by top-left light. pixels outside the frame are dropped."""
        pix = {p for p in pix if 0 <= p[0] < self.w and 0 <= p[1] < self.h}
        n = len(rp)
        # 6/5-step ramps: light 4, mid 3, dark 2 · 4-step: 3/2/1 · 3-step: 2/1/0 (index 0 = outline)
        dl, dm, dd = (4, 3, 2) if n >= 5 else (3, 2, 1) if n == 4 else (n - 1, max(0, n - 2), 0)
        L = rp[min(n - 1, light if light is not None else dl)]
        M = rp[min(n - 1, mid if mid is not None else dm)]
        D = rp[min(n - 1, darkc if darkc is not None else dd)]
        O = rp[0]
        for (x, y) in pix:
            if not shade: c = M
            elif (x - 1, y) not in pix or (x, y - 1) not in pix: c = L
            elif (x + 1, y) not in pix or (x, y + 1) not in pix: c = D
            else: c = M
            self.px[(x, y)] = c; self.dark[(x, y)] = O
        return pix

    def put(self, pix, c, outline=None):
        for p in pix:
            if 0 <= p[0] < self.w and 0 <= p[1] < self.h:
                self.px[p] = c; self.dark[p] = outline or self.dark.get(p) or hexrgb(OUTLINE_FALLBACK)

    def erase(self, pix):
        for p in pix: self.px.pop(p, None); self.dark.pop(p, None)

    def image(self, outline=True):
        im = np.zeros((self.h, self.w, 4), np.uint8)
        for (x, y), c in self.px.items(): im[y, x] = (*c, 255)
        if outline:
            for (x, y) in list(self.px):
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (x + dx, y + dy)
                    if 0 <= q[0] < self.w and 0 <= q[1] < self.h and q not in self.px and im[q[1], q[0], 3] == 0:
                        im[q[1], q[0]] = (*self.dark[(x, y)], 255)
        return im

def save_png(arr, path):
    import os
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(arr, 'RGBA').save(path, optimize=True)
