# Build LUMIRA world sprites from LPC sheets.  python3 build_world.py <out_assets_world_dir> <world.json in> <world.json out>
import json, sys, os, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
X = '/home/claude/lpcw/x/'
DST = sys.argv[1] if len(sys.argv) > 1 else '/tmp/wout'
def L(p): return Image.open(X + p).convert('RGBA')
CITY = L('LPC_city_outside_1/LPC_city_outside/city_outside.png')
BASE = L('Atlas_0/base_out_atlas.png'); TERR = L('Atlas_0/terrain_atlas.png')
BUILD = L('Atlas2/build_atlas.png'); OBJ = L('Atlas2/obj_misk_atlas.png')
TREES = {c: L(f'lpc-trees/lpc-trees/trees-{c}.png') for c in ('green', 'pale', 'brown', 'orange', 'dead')}
ROCKS = L('rocks/rocks/rocks.png'); SNOWR = L('rocks/rocks/rocks-snow.png')
PLANT = Image.open('/home/claude/lpcw/plant_repack_2.png').convert('RGBA')
PLANTS2 = L('submission_daneeklu/submission_daneeklu/tilesets/plants.png')
DECO = L('decoration_medieval/decoration_medieval/decorations-medieval.png')
_d = np.asarray(DECO).copy(); _d[(_d[..., 0] == 129) & (_d[..., 1] == 161) & (_d[..., 2] == 0)] = 0; DECO = Image.fromarray(_d)
FOREST = L('LPC_forest_0/LPC_forest/forest_tiles.png')
COTT = Image.open('/home/claude/lpcw/cottage.png').convert('RGBA')
THATCH = Image.open('/home/claude/lpcw/thatched-roof.png').convert('RGBA')

def cells(sheet, x0, y0, x1, y1): return sheet.crop((x0 * 32, y0 * 32, x1 * 32, y1 * 32))
def px(sheet, x0, y0, x1, y1): return sheet.crop((x0, y0, x1, y1))
def biggest(im, dil=3):
    """keep only the largest connected opaque blob, then trim"""
    a = np.asarray(im).copy(); m = a[..., 3] > 8
    if not m.any(): return im
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=dil))
    sizes = ndimage.sum(m, lab, range(1, n + 1)); k = int(np.argmax(sizes)) + 1
    a[..., 3] = np.where(lab == k, a[..., 3], 0)
    out = Image.fromarray(a); bb = out.getbbox(); return out.crop(bb)
def trim(im): bb = im.getbbox(); return im.crop(bb) if bb else im
def foot(im, solid=200):
    """anchor: horizontal centre, lowest row of solid (non-shadow) pixels"""
    a = np.asarray(im)[..., 3]; h, w = a.shape
    rows = np.where((a[:, w // 4: w - w // 4] > solid).any(1))[0]
    return w // 2, int(rows.max()) + 1 if len(rows) else h

OUT = {}
def save(name, im, ax=None, ay=None, folder='props', extra=None):
    os.makedirs(f'{DST}/{folder}', exist_ok=True)
    im.save(f'{DST}/{folder}/{name}.png', optimize=True)
    if ax is None: ax, ay = foot(im)
    d = {'w': im.width, 'h': im.height, 'ax': int(ax), 'ay': int(ay), 'path': f'world/{folder}/{name}'}
    if extra: d.update(extra)
    OUT[name] = d

# ------------------------------------------------------------------ trees
def tree(name, sheet, rect, shrink=None):
    im = biggest(cells(sheet, *rect))
    if shrink: im = im.resize((round(im.width * shrink), round(im.height * shrink)), Image.NEAREST)
    ax, ay = foot(im)
    a = np.asarray(im)[..., 3]
    # canopy box (for see-through when the player walks behind): top part above the trunk
    fade = [4, 2, im.width - 8, max(10, ay - 30)]
    save(name, im, ax, ay, 'trees', {'fade': fade, 'trunk': 6})
tree('tree_oak_01', TREES['green'], (13, 11, 17, 16))
tree('tree_oak_02', TREES['green'], (4, 3, 7, 7))
tree('tree_oak_03', TREES['green'], (7, 3, 10, 7))
tree('tree_pine_01', PLANT, (3, 4, 8, 10))
tree('tree_pine_02', PLANT, (0, 0, 2, 7))
tree('tree_pine_snow_01', PLANT, (0, 0, 2, 7))
_im = Image.open(f'{DST}/trees/tree_pine_snow_01.png'); _a = np.asarray(_im).astype(float); _l = _a[..., :3].mean(2); _m = (_l > 45) & (_a[..., 3] > 200)
_a[..., :3][_m] = _a[..., :3][_m] * 0.35 + 255 * 0.65; Image.fromarray(_a.astype('uint8')).save(f'{DST}/trees/tree_pine_snow_01.png')

# ------------------------------------------------------------------ rocks
def rock(name, sheet, rect):
    im = biggest(cells(sheet, *rect)); save(name, im, folder='rocks')
rock('rock_small_01', ROCKS, (2, 8, 4, 10))
rock('rock_small_02', ROCKS, (6, 8, 8, 10))
rock('rock_medium_03', ROCKS, (0, 10, 2, 12))
rock('rock_medium_04', ROCKS, (4, 10, 6, 12))
rock('rock_large_05', ROCKS, (10, 8, 12, 12))
rock('rock_ore_01', ROCKS, (0, 26, 2, 28))

# ------------------------------------------------------------------ vegetation
def veg(name, sheet, rect, unit=32):
    im = biggest(sheet.crop(tuple(v * unit for v in rect)), dil=2); save(name, im, folder='vegetation')
veg('veg_bush_01', TERR, (24, 12, 28, 16))
save('veg_bush_small_01', biggest(px(PLANT, 30, 150, 68, 195), 1), folder='vegetation')
veg('veg_cactus_01', PLANT, (12, 6, 14, 9))
veg('veg_fern_01', PLANT, (12, 4, 14, 6))
veg('veg_mushroom_01', TERR, (27, 28, 28, 29))
veg('veg_reed_01', TERR, (26, 29, 27, 31))
veg('veg_grass_01', TERR, (9, 27, 10, 28))
veg('veg_grass_02', TERR, (9, 25, 10, 26))
veg('veg_tallgrass_01', TERR, (10, 26, 11, 27))
veg('veg_herb_01', TERR, (14, 27, 15, 28))
# small flower clusters drawn in the LPC palette (no decorative flower sprites in the downloaded packs)
def flowers(name, petal, light, dark, seed):
    rng = np.random.default_rng(seed); im = Image.new('RGBA', (30, 22)); d = ImageDraw.Draw(im)
    stems = [(6, 13), (14, 9), (22, 12), (10, 17), (19, 17)]
    for (x, y) in stems:
        d.line([(x, y + 1), (x, 21)], fill=(46, 96, 40, 255))
        d.point([(x - 1, y + 5), (x + 1, y + 7)], fill=(82, 150, 60, 255))
        d.rectangle([x - 2, y + 4, x - 1, y + 5], fill=(70, 132, 52, 255)); d.rectangle([x + 1, y + 6, x + 2, y + 7], fill=(58, 116, 46, 255))
    for (x, y) in stems:
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]: d.point([(x + dx, y + dy)], fill=petal)
        d.point([(x - 1, y - 1), (x + 1, y + 1)], fill=dark); d.point([(x + 1, y - 1)], fill=light)
        d.point([(x, y)], fill=(255, 226, 110, 255))
    save(name, im, 15, 21, 'vegetation')
flowers('veg_flowers_red_01', (214, 58, 64, 255), (255, 140, 140, 255), (140, 30, 40, 255), 1)
flowers('veg_flowers_gold_01', (240, 190, 50, 255), (255, 236, 150, 255), (170, 120, 20, 255), 2)
flowers('veg_flowers_violet_01', (150, 92, 214, 255), (210, 170, 255, 255), (90, 50, 150, 255), 3)
flowers('veg_flowers_white_01', (240, 240, 236, 255), (255, 255, 255, 255), (170, 170, 180, 255), 4)
# ------------------------------------------------------------------ props
def prop(name, sheet, rect, dil=2):
    im = biggest(cells(sheet, *rect), dil); save(name, im, folder='props')
prop('prop_barrel_01', BASE, (18, 14, 19, 16))
prop('prop_crate_01', BASE, (21, 17, 22, 19))
prop('prop_sack_01', OBJ, (0, 13, 2, 15))
prop('prop_cart_01', DECO, (6, 16, 8, 18))
prop('prop_bench_01', DECO, (6, 34, 8, 35))
prop('prop_lamp_01', CITY, (21, 10, 22, 13))
prop('prop_sign_sword_01', DECO, (7, 0, 8, 1))
prop('prop_sign_potion_01', DECO, (10, 0, 11, 1))
prop('prop_sign_bed_01', DECO, (8, 1, 9, 2))
prop('prop_fence_01', DECO, (0, 47, 2, 48))
prop('prop_well_01', DECO, (14, 13, 16, 16))
_st = Image.new('RGBA', (128, 176)); _st.alpha_composite(cells(CITY, 4, 12, 8, 15), (0, 80)); _st.alpha_composite(px(CITY, 0, 384, 128, 470), (0, 0)); save('prop_stall_01', trim(_st), folder='props')
prop('prop_tent_01', DECO, (12, 54, 16, 58))
prop('prop_campfire_01', DECO, (8, 47, 9, 49))
prop('prop_weaponrack_01', DECO, (0, 48, 2, 50))
prop('prop_anvil_01', DECO, (14, 23, 15, 24))
prop('prop_hay_01', DECO, (2, 20, 4, 22))
prop('prop_flag_blue_01', DECO, (1, 38, 2, 40))
prop('prop_flag_red_01', DECO, (3, 38, 4, 40))
prop('prop_flag_gold_01', DECO, (4, 38, 5, 40))
prop('prop_bucket_01', DECO, (2, 14, 3, 15))
prop('prop_lumber_01', DECO, (11, 20, 13, 22))
prop('prop_wheelbarrow_01', DECO, (7, 22, 9, 24))
prop('prop_fountain_01', DECO, (0, 16, 2, 18))
prop('prop_statue_01', DECO, (0, 9, 1, 11))
wall = px(CITY, 448, 288, 480, 332); save('prop_wall_h_01', wall, 16, 40, 'props'); save('prop_wall_v_01', wall, 16, 40, 'props')

json.dump(OUT, open('/tmp/world_part.json', 'w'))

# ------------------------------------------------------------------ buildings (assembled from LPC city / village tiles)
def tile_fill(dst, tex, box, ox=0, oy=0):
    x0, y0, x1, y1 = box; tw, th = tex.size
    region = Image.new('RGBA', (x1 - x0, y1 - y0))
    for yy in range(-((y0 - oy) % th), y1 - y0, th):
        for xx in range(-((x0 - ox) % tw), x1 - x0, tw): region.alpha_composite(tex, (max(0, xx), max(0, yy)), (max(0, -xx), max(0, -yy)))
    dst.alpha_composite(region, (x0, y0))
def shade(dst, box, rgba):
    ov = Image.new('RGBA', dst.size); ImageDraw.Draw(ov).rectangle(box, fill=rgba); dst.alpha_composite(ov)
TEX = {
    'roof_red': px(CITY, 320, 288, 352, 320), 'roof_grey': px(CITY, 32, 288, 64, 320), 'roof_thatch': px(THATCH, 0, 128, 64, 192), 'roof_brown': px(THATCH, 0, 384, 64, 448),
    'wall_cream': px(CITY, 320, 128, 352, 160), 'wall_yellow': px(CITY, 576, 224, 608, 256), 'wall_red': px(CITY, 160, 160, 192, 192),
    'wall_grey': px(CITY, 32, 160, 64, 192), 'wall_maroon': px(CITY, 224, 128, 256, 160), 'wall_stone': px(CITY, 480, 320, 512, 352),
    'wall_timber': px(COTT, 0, 128, 96, 224),
}
WIN = {'arch': px(CITY, 576, 64, 608, 128), 'plant': px(CITY, 608, 64, 640, 128), 'square': px(CITY, 640, 0, 672, 32), 'small': px(CITY, 192, 224, 224, 256), 'square_flower': px(CITY, 640, 64, 672, 96)}
DOOR = {'wood': px(CITY, 672, 0, 704, 64), 'wood2': px(CITY, 704, 0, 736, 64), 'arch': px(CITY, 576, 128, 608, 192)}
SIGN = {'inn': cells(DECO, 8, 1, 9, 2), 'sword': cells(DECO, 7, 0, 8, 1), 'potion': cells(DECO, 10, 0, 11, 1), 'bag': cells(DECO, 8, 0, 9, 1), 'book': cells(DECO, 6, 1, 7, 2),
        'beer': cells(DECO, 7, 1, 8, 2), 'hammer': cells(DECO, 10, 1, 11, 2), 'amulet': cells(DECO, 9, 1, 10, 2), 'bread': cells(DECO, 9, 0, 10, 1), 'shield': cells(DECO, 6, 0, 7, 1)}
BANNER = {c: biggest(cells(DECO, i, 38, i + 1, 40), 1) for i, c in enumerate(['white', 'blue', 'green', 'red', 'gold', 'black'])}
CHIMNEY = trim(px(CITY, 512, 384, 544, 416)); CLOCK = trim(px(CITY, 352, 384, 384, 416))
GABLE = {'red': trim(px(CITY, 512, 192, 576, 256)), 'grey': trim(px(CITY, 448, 192, 512, 256))}
EAVE = {'roof_red': (70, 20, 12), 'roof_grey': (30, 30, 40), 'roof_thatch': (110, 80, 20), 'roof_brown': (60, 36, 18)}

def building(name, wt, ht, W, H, ay, roof, wall, facade, door='wood', windows='square', sign=None, chimney=False, banners=None, gable=None, clock=False, base=(70, 70, 78), timber=False):
    im = Image.new('RGBA', (W, H)); fp_top = H - ht * 32
    ftop = H - facade
    # facade
    wx0, wx1 = 6, W - 6
    tile_fill(im, TEX[wall], (wx0, ftop, wx1, H - 2))
    if timber:
        d = ImageDraw.Draw(im)
        for x in range(wx0, wx1 + 1, 48): d.rectangle([x - 2, ftop, x + 1, H - 3], fill=(92, 58, 30, 255)); d.line([(x - 2, ftop), (x - 2, H - 3)], fill=(130, 88, 48, 255))
        d.rectangle([wx0, ftop + 2, wx1, ftop + 5], fill=(92, 58, 30, 255)); d.rectangle([wx0, H - 14, wx1, H - 11], fill=(92, 58, 30, 255))
    d = ImageDraw.Draw(im)
    d.rectangle([wx0, H - 9, wx1 - 1, H - 2], fill=base + (255,)); d.line([(wx0, H - 9), (wx1 - 1, H - 9)], fill=tuple(min(255, c + 40) for c in base) + (255,))
    d.line([(wx0, ftop), (wx0, H - 2)], fill=(30, 22, 26, 255)); d.line([(wx1 - 1, ftop), (wx1 - 1, H - 2)], fill=(30, 22, 26, 255))
    d.line([(wx0, H - 1), (wx1 - 1, H - 1)], fill=(30, 22, 26, 140))
    # door + windows
    dimg = DOOR[door]; dx = W // 2 - dimg.width // 2; dy = H - 2 - dimg.height
    im.alpha_composite(dimg, (dx, dy))
    wimg = WIN[windows]
    rows = [ftop + 10] if facade < 96 else [ftop + 10, ftop + 10 + (facade - 20) // 2]
    if wimg.height > 40: rows = [H - 2 - wimg.height - 4] if facade < 110 else [ftop + 8, H - 2 - wimg.height - 4]
    slots = list(range(wx0 + 12, wx1 - 12 - wimg.width + 1, 40))
    if slots:
        span = slots[-1] + wimg.width - slots[0]; off = (wx0 + wx1) // 2 - (slots[0] + span // 2)
        for ri, wy in enumerate(rows):
            for x in slots:
                xx = x + off
                low = wy + wimg.height > dy - 2
                if low and xx + wimg.width > dx - 6 and xx < dx + dimg.width + 6: continue
                if xx < wx0 + 4 or xx + wimg.width > wx1 - 4: continue
                im.alpha_composite(wimg, (xx, wy))
    if sign: s = SIGN[sign]; s = trim(s); im.alpha_composite(s, (min(W - s.width - 2, dx + dimg.width + 4), ftop + 6))
    # roof
    rb = ftop + 6
    tile_fill(im, TEX[roof], (0, 2, W, rb))
    if roof in ('roof_thatch', 'roof_brown'):
        dd = ImageDraw.Draw(im); rng = np.random.default_rng(len(name))
        for yy in range(6, rb - 4, 5):
            for xx in range(0, W, 3):
                if rng.random() < 0.55: dd.point([(xx, yy + int(rng.integers(0, 2)))], fill=(0, 0, 0, 45))
                if rng.random() < 0.25: dd.point([(xx + 1, yy - 2)], fill=(255, 255, 255, 40))
    e = EAVE[roof]; d = ImageDraw.Draw(im)
    shade(im, (0, 2, W - 1, 8), (255, 255, 255, 40)); shade(im, (0, 2, W - 1, 3), (255, 255, 255, 50))
    ridge = 2 + (rb - 2) * 2 // 5
    shade(im, (0, ridge, W - 1, ridge + 1), (255, 255, 255, 45)); shade(im, (0, ridge + 2, W - 1, rb), (0, 0, 0, 38))
    shade(im, (0, rb - 10, W - 1, rb), (0, 0, 0, 40))
    d = ImageDraw.Draw(im)
    d.rectangle([0, rb - 3, W - 1, rb], fill=e + (255,)); d.line([(0, rb + 1), (W - 1, rb + 1)], fill=(0, 0, 0, 110))
    d.rectangle([0, 2, W - 1, rb], outline=(28, 18, 16, 255))
    shade(im, (wx0, rb + 2, wx1 - 1, rb + 6), (0, 0, 0, 60))
    if gable: g = GABLE[gable]; im.alpha_composite(g, (W // 2 - g.width // 2, rb - g.height + 4))
    if clock: im.alpha_composite(CLOCK, (W // 2 - CLOCK.width // 2, rb - (GABLE[gable].height if gable else 0) + 12))
    if chimney: im.alpha_composite(CHIMNEY, (W - 40, 0))
    if banners:
        for bx in (wx0 + 10, wx1 - 10 - BANNER[banners].width): im.alpha_composite(BANNER[banners], (bx, ftop + 4))
    save(name, im, W // 2, ay, 'buildings', {'footprint': [wt, ht], 'door': [24, 56], 'facade': facade, 'kind': 'house'})

B = [  # name, w, h, W, H, ay, roof, wall, facade, opts
    ('bld_house_small_village_5x4', 5, 4, 160, 176, 112, 'roof_thatch', 'wall_cream', 96, dict(timber=True, windows='square_flower', chimney=True)),
    ('bld_house_large_village_6x4', 6, 4, 192, 176, 112, 'roof_red', 'wall_cream', 96, dict(timber=True, windows='square_flower', chimney=True)),
    ('bld_inn_village_7x5', 7, 5, 224, 208, 128, 'roof_red', 'wall_yellow', 112, dict(sign='inn', windows='plant', chimney=True, base=(60, 90, 170))),
    ('bld_potion_shop_village_6x5', 6, 5, 192, 208, 128, 'roof_grey', 'wall_cream', 112, dict(timber=True, sign='potion', windows='square_flower')),
    ('bld_weapon_shop_village_5x4', 5, 4, 160, 176, 112, 'roof_grey', 'wall_red', 96, dict(sign='sword', windows='square')),
    ('bld_armor_shop_village_6x5', 6, 5, 192, 208, 128, 'roof_red', 'wall_grey', 112, dict(sign='shield', windows='square')),
    ('bld_blacksmith_village_5x4', 5, 4, 160, 176, 112, 'roof_grey', 'wall_stone', 96, dict(sign='hammer', windows='small', chimney=True, door='wood2')),
    ('bld_storage_village_5x4', 5, 4, 160, 176, 112, 'roof_brown', 'wall_maroon', 96, dict(windows='small', door='wood2')),
    ('bld_chapel_village_7x5', 7, 5, 224, 252, 172, 'roof_grey', 'wall_cream', 120, dict(windows='arch', gable='grey', door='arch')),
    ('bld_class_hall_village_8x5', 8, 5, 256, 208, 128, 'roof_red', 'wall_grey', 112, dict(windows='arch', banners='blue', gable='red')),
    ('bld_house_small_capital_5x4', 5, 4, 160, 176, 112, 'roof_red', 'wall_yellow', 96, dict(windows='plant', chimney=True, base=(60, 90, 170))),
    ('bld_house_large_capital_6x4', 6, 4, 192, 176, 112, 'roof_red', 'wall_maroon', 96, dict(windows='square_flower', chimney=True)),
    ('bld_inn_capital_7x5', 7, 5, 224, 208, 128, 'roof_red', 'wall_yellow', 112, dict(sign='inn', windows='plant', chimney=True, base=(60, 90, 170))),
    ('bld_weapon_shop_capital_6x5', 6, 5, 192, 208, 128, 'roof_grey', 'wall_red', 112, dict(sign='sword', windows='square')),
    ('bld_armor_shop_capital_6x5', 6, 5, 192, 208, 128, 'roof_grey', 'wall_grey', 112, dict(sign='shield', windows='square')),
    ('bld_blacksmith_capital_5x4', 5, 4, 160, 176, 112, 'roof_grey', 'wall_stone', 96, dict(sign='hammer', windows='small', chimney=True, door='wood2')),
    ('bld_workshop_capital_5x4', 5, 4, 160, 176, 112, 'roof_brown', 'wall_maroon', 96, dict(sign='hammer', windows='square', chimney=True)),
    ('bld_storage_capital_5x4', 5, 4, 160, 176, 112, 'roof_brown', 'wall_stone', 96, dict(windows='small', door='wood2')),
    ('bld_bank_capital_5x4', 5, 4, 160, 176, 112, 'roof_grey', 'wall_stone', 96, dict(sign='bag', windows='arch', door='arch')),
    ('bld_library_capital_5x4', 5, 4, 160, 176, 112, 'roof_red', 'wall_maroon', 96, dict(sign='book', windows='arch')),
    ('bld_guild_hall_capital_8x5', 8, 5, 256, 208, 128, 'roof_red', 'wall_stone', 112, dict(windows='arch', banners='red', gable='red', door='arch')),
    ('bld_class_hall_capital_6x4', 6, 4, 192, 176, 112, 'roof_grey', 'wall_grey', 96, dict(windows='arch', banners='blue')),
    ('bld_sanctuary_capital_7x5', 7, 5, 224, 252, 172, 'roof_grey', 'wall_cream', 120, dict(windows='arch', gable='grey', door='arch', banners='white')),
    ('bld_town_hall_capital_8x5', 8, 5, 256, 252, 172, 'roof_red', 'wall_yellow', 120, dict(windows='arch', gable='red', clock=True, banners='gold', door='arch', base=(60, 90, 170))),
    ('bld_special_shop_capital_6x5', 6, 5, 192, 208, 128, 'roof_red', 'wall_cream', 112, dict(sign='amulet', windows='plant')),
    ('bld_garrison_capital_8x5', 8, 5, 256, 208, 128, 'roof_grey', 'wall_grey', 112, dict(windows='small', banners='red', door='wood2')),
]
for nm, wt, ht, W, H, ay, roof, wall, fac, o in B: building(nm, wt, ht, W, H, ay, roof, wall, fac, **o)

# market: two stalls on a paved pad
def market():
    W, H = 192, 208; im = Image.new('RGBA', (W, H)); st = Image.open(f'{DST}/props/prop_stall_01.png')
    s2 = st.resize((st.width * 3 // 4, st.height * 3 // 4), Image.NEAREST)
    im.alpha_composite(s2, (4, H - s2.height - 4)); im.alpha_composite(s2, (W - s2.width - 4, H - s2.height - 4))
    for nm, x in (('prop_barrel_01', W // 2 - 10), ('prop_sack_01', W // 2 - 14)):
        p = Image.open(f'{DST}/props/{nm}.png'); im.alpha_composite(p, (x, H - p.height - 2 - (40 if 'sack' in nm else 0)))
    save('bld_market_capital_6x5', im, W // 2, 128, 'buildings', {'footprint': [6, 5], 'door': [24, 56], 'facade': 72, 'kind': 'house'})
market()
# castle gate: stone wall with two towers and a dark arch
def gate():
    W, H = 256, 208; im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    tile_fill(im, TEX['wall_stone'], (40, 70, W - 40, H - 2))
    for tx in (0, W - 56):
        tile_fill(im, TEX['wall_grey'], (tx, 24, tx + 56, H - 2))
        for cx in range(tx, tx + 56, 14): d.rectangle([cx, 14, cx + 8, 26], fill=(110, 110, 120, 255), outline=(40, 40, 48, 255))
        d.rectangle([tx, 24, tx + 55, H - 2], outline=(30, 30, 36, 255)); im.alpha_composite(WIN['small'], (tx + 12, 60))
    for cx in range(40, W - 40, 16): d.rectangle([cx, 60, cx + 9, 72], fill=(130, 130, 138, 255), outline=(40, 40, 48, 255))
    d.ellipse([W // 2 - 34, H - 110, W // 2 + 34, H - 40], fill=(26, 22, 28, 255), outline=(60, 60, 66, 255), width=3)
    d.rectangle([W // 2 - 34, H - 76, W // 2 + 34, H - 2], fill=(26, 22, 28, 255))
    d.line([(W // 2 - 37, H - 76), (W // 2 - 37, H - 2)], fill=(60, 60, 66, 255), width=3); d.line([(W // 2 + 36, H - 76), (W // 2 + 36, H - 2)], fill=(60, 60, 66, 255), width=3)
    for gx in range(W // 2 - 30, W // 2 + 31, 8): d.line([(gx, H - 100), (gx, H - 40)], fill=(70, 66, 60, 255))
    for bx in (60, W - 60 - BANNER['red'].width): im.alpha_composite(BANNER['red'], (bx, 80))
    save('bld_castle_gate_capital_8x5', im, W // 2, 128, 'buildings', {'footprint': [8, 5], 'door': [40, 64], 'facade': 72, 'kind': 'gate'})
gate()
json.dump(OUT, open('/tmp/world_part.json', 'w'))
