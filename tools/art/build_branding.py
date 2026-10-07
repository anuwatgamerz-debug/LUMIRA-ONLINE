#!/usr/bin/env python3
# ELYNDRA ONLINE branding: logo / emblem / icons / covers / login backgrounds from tools/art/branding_source.
# python3 tools/art/build_branding.py   (writes public/assets/branding)
import os
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SRC = os.path.join(ROOT, 'tools/art/branding_source'); OUT = os.path.join(ROOT, 'public/assets/branding')
os.makedirs(OUT, exist_ok=True)
def save(im, name, **kw):
    p = os.path.join(OUT, name); im.save(p, **kw); print(name, im.size, os.path.getsize(p) // 1024, 'KB')

# ---- logo: trim, clean the red halo the generator left on semi-transparent edge pixels
logo = Image.open(os.path.join(SRC, 'elyndra_logo_source.png')).convert('RGBA')
px = logo.load(); w, h = logo.size
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if 0 < a < 235 and r > g + 50 and r > b + 50:  # reddish fringe -> warm gold like the letters
            px[x, y] = (r, int(r * 0.76), int(r * 0.36), a)
logo = logo.crop(logo.getbbox())
def fit(im, W): return im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
save(fit(logo, 1400), 'elyndra-logo.png', optimize=True)
save(fit(logo, 1400), 'elyndra-logo.webp', quality=92)
save(fit(logo, 640), 'elyndra-logo-small.png', optimize=True)
save(fit(logo, 640), 'elyndra-logo-small.webp', quality=92)
save(fit(logo, 1000), 'elyndra-logo-horizontal.png', optimize=True)

# ---- emblem: the star medallion in the middle of the logo, cut round above the letters
lw, lh = logo.size
cx, cy, R = lw * 0.5, lh * 0.27, lh * 0.25
em = logo.crop((int(cx - R), int(cy - R), int(cx + R), int(cy + R))).resize((512, 512), Image.LANCZOS)
mask = Image.new('L', (512, 512), 0); ImageDraw.Draw(mask).ellipse((14, 14, 498, 498), fill=255); mask = mask.filter(ImageFilter.GaussianBlur(2))
disc = Image.new('RGBA', (512, 512), (0, 0, 0, 0)); ImageDraw.Draw(disc).ellipse((10, 10, 502, 502), fill=(16, 22, 58, 255))
disc.alpha_composite(em); disc.putalpha(Image.composite(disc.getchannel('A'), Image.new('L', (512, 512), 0), mask))
ring = ImageDraw.Draw(disc); ring.ellipse((12, 12, 500, 500), outline=(232, 196, 106, 255), width=10); ring.ellipse((26, 26, 486, 486), outline=(120, 170, 255, 160), width=3)
em = disc
save(em, 'elyndra-emblem.png', optimize=True)
def icon(size, pad=0.08, round_=True):
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(bg)
    rr = int(size * 0.22) if round_ else 0
    d.rounded_rectangle((0, 0, size - 1, size - 1), rr, fill=(12, 18, 46, 255))
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0)); ImageDraw.Draw(glow).ellipse((size * .18, size * .18, size * .82, size * .82), fill=(60, 110, 230, 150))
    bg.alpha_composite(glow.filter(ImageFilter.GaussianBlur(size * 0.08)))
    m = int(size * pad); e = em.resize((size - 2 * m, size - 2 * m), Image.LANCZOS); bg.alpha_composite(e, (m, m))
    return bg
save(icon(32, 0.02, False), 'favicon-32.png'); save(icon(16, 0.0, False), 'favicon-16.png')
icon(48, 0.02, False).save(os.path.join(OUT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
save(icon(180, 0.06, False), 'apple-touch-icon.png'); save(icon(192), 'icon-192.png'); save(icon(512), 'icon-512.png')
save(icon(512, 0.16, False), 'icon-maskable-512.png')

# ---- covers + login backgrounds
key = Image.open(os.path.join(SRC, 'elyndra_key_art.png')).convert('RGB')
save(key, 'cover-desktop.webp', quality=86)
cls = Image.open(os.path.join(SRC, 'elyndra_classes.png')).convert('RGB')
save(cls, 'cover-mobile.webp', quality=86)
og = key.resize((1200, round(key.height * 1200 / key.width)), Image.LANCZOS); top = (og.height - 630) // 2
save(og.crop((0, top, 1200, top + 630)), 'og-cover.jpg', quality=88)
city = Image.open(os.path.join(SRC, 'elyndra_city_night.png')).convert('RGB')
save(city, 'login-bg-desktop.webp', quality=86)
mock = Image.open(os.path.join(SRC, 'login_mockup_desktop.png')).convert('RGB')
port = mock.crop((0, 0, 518, 941))  # the balcony + city on the left of the key art (left of the painted panel)
save(port.resize((680, round(941 * 680 / 518)), Image.LANCZOS), 'login-bg-mobile.webp', quality=88)
