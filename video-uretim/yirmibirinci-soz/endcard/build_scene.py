#!/usr/bin/env python3
"""
Photoreal "source card" plate: the Qur'an on a small walnut stand on a wall shelf, above the
14-volume Risale-i Nur Külliyatı (RNK leather edition look) standing upright on a walnut console.

    python3 build_scene.py --res 1350x2400 --samples 192 --time-limit 1700 --out plates/

Everything is procedural (bpy + numpy + pillow) except five CC0 Poly Haven assets in assets/
(see assets/LICENSES.txt).  Units: the scene is built in millimetres and scaled to metres (MM).
World axes: x = right, y = into the wall (wall plane at y = 0, camera at negative y), z = up,
z = 0 is the console top.

Stages (all run by default):  textures -> scene -> render (Cycles, light groups) -> post (plates)
"""
import argparse
import json
import math
import os
import struct
import sys
import time
import warnings
import zlib

import numpy as np
from PIL import Image, ImageDraw, ImageFont

warnings.filterwarnings('ignore', category=DeprecationWarning)
import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, 'assets')
GEN = os.path.join(ASSETS, 'gen')
FONT = os.path.join(ASSETS, 'fonts', 'EBGaramond-600.ttf')
FONT_SRC = os.path.join(HERE, '..', 'fonts')
MM = 0.001

# ----------------------------------------------------------------------------------------------
# Data from the app (src/oku/ortak.ts): canonical order, thickness / spine height, spine lines
# ----------------------------------------------------------------------------------------------
KULLIYAT = ['Sözler', 'Mektubat', "Lem'alar", 'Şuâlar', 'Mesnevî-i Nûriye', "İşârâtü'l-İ'câz", 'Barla Lâhikası',
            'Kastamonu Lâhikası', 'Emirdağ Lâhikası', 'Sikke-i Tasdîk-i Gaybî', 'Tarihçe-i Hayat', 'Asâ-yı Mûsâ',
            'İman ve Küfür Muvâzeneleri', 'Muhâkemat']
KALINLIK = {'Sözler': 0.1869, 'Mektubat': 0.131, "Lem'alar": 0.115, 'Şuâlar': 0.1582, 'Mesnevî-i Nûriye': 0.0724,
            "İşârâtü'l-İ'câz": 0.0844, 'Barla Lâhikası': 0.1003, 'Kastamonu Lâhikası': 0.0751,
            'Emirdağ Lâhikası': 0.1097, 'Sikke-i Tasdîk-i Gaybî': 0.0644, 'Tarihçe-i Hayat': 0.1489,
            'Asâ-yı Mûsâ': 0.0878, 'İman ve Küfür Muvâzeneleri': 0.0692, 'Muhâkemat': 0.0614}
SIRT = {'Sözler': ['Sözler'], 'Mektubat': ['Mektubat'], "Lem'alar": ['Lem’alar'], 'Şuâlar': ['Şuâlar'],
        'Mesnevî-i Nûriye': ['Mesnevî-i Nûriye'], "İşârâtü'l-İ'câz": ['İşârâtü’l-İ’câz'],
        'Barla Lâhikası': ['Barla Lâhikası'], 'Kastamonu Lâhikası': ['Kastamonu', 'Lâhikası'],
        'Emirdağ Lâhikası': ['Emirdağ Lâhikası'], 'Sikke-i Tasdîk-i Gaybî': ['Sikke-i Tasdîk-i Gaybî'],
        'Tarihçe-i Hayat': ['Tarihçe-i Hayat'], 'Asâ-yı Mûsâ': ['Asâ-yı Mûsâ'],
        'İman ve Küfür Muvâzeneleri': ['İman ve Küfür', 'Muvâzeneleri'], 'Muhâkemat': ['Muhâkemat']}
SIRT_BOYU = 240.0   # spine height (mm)
KAPAK_ENI = 165.0   # cover (board) depth (mm)
TEN = '#F8E2D4'     # title tone

# ----------------------------------------------------------------------------------------------
# Look-dev configuration (override any key with  --set key=value)
# ----------------------------------------------------------------------------------------------
C = dict(
    seed=21,
    # --- books
    leather='#B89181',          # leather albedo (sRGB): very pale, faded red leaning to a light brown (C* 18.6, h 49)
    leather_brown='#967863',    # tan-brown that recesses, joints and gaps lean to (ambient-occlusion driven)
    leather_burnt='#8A5F4B',    # heat-darkened / burnished leather of the blind tooling and round the blocked title
    leather_var=0.055,          # per-volume value jitter (+/-); a few volumes are set by hand in ARRANGE
    ao_mm=32.0, ao_mix=0.65,    # reach of the occlusion that drives the brown lean, and its strength
    bleed_desat=0.70,           # how much of the leather's saturation is taken out of its DIFFUSE inter-reflection
    leather_rough=0.32,
    grain_mm=0.20,              # pebble grain bump depth (Poly Haven "Leather Red 02" height map)
    grain_tile=0.11,            # ... its tile (m): cells of ~2 mm, a fine goat-skin grain that survives the downscale
    pore_mm=0.06,               # fine pores (Poly Haven "Leather White" height map)
    pore_tile=0.30,
    coat=0.34, coat_rough=0.17, sheen=0.05,     # aniline top coat + a trace of fibre sheen
    graze_coat=0.90, graze_spec=0.85,           # the grain masks the gloss at grazing angles (boards seen edge-on)
    board_grain_mm=0.30,                        # pebble grain depth on the boards (spine: grain_mm)
    title_press=0.30,           # blocking depth of the title (mm)
    title_rim=0.45,             # heat-darkened rim round the die: mix towards leather_burnt
    title_k=0.62,               # thickness-limited title size = title_k * thickness / 0.9 (app: 0.5)
    title='#FFF7EE',            # title pigment foil albedo (app: #F8E2D4)
    title_fs_max=13.5,          # largest title size (mm, em)
    reading='down',             # spine text reads head->tail (as the app's flat stacks, front cover up); 'up' flips
    pull=40.0,                  # Sözler pulled forward (mm)
    row_gap_wall=45.0,          # fore-edges to wall (mm)
    # --- furniture
    console_front=-335.0,       # y of the drawer fronts (mm)
    slab=22.0, slab_over=10.0, slab_r=1.5, drawer_gap=3.0, drawer_h=206.0, wall_gap=3.5,
    shelf=(-218.0, 218.0, -150.0, 300.0, 322.0),   # x0, x1, y0, z0, z1 (mm)
    wood_tint=(0.306, 0.205, 0.115), wood_gamma=1.10, wood_sat=0.65, wood_rough=(0.28, 0.45), wood_tile=1.2,
    wood_nor=0.6,
    wall='#E5DCBD',             # plaster paint albedo (sRGB): the film's cream primer, hue kept in the paint
    wall_tile=1.5,              # plaster texture tile (m)
    wall_bleed_desat=0.55,      # saturation taken out of the wall's DIFFUSE bounce (less yellow cast on what stands near it)
    # --- Qur'an
    q_w=134.0, q_h=190.0, q_t=34.0, q_recline=12.0, q_x=0.0, q_text=1,
    pearl='#EFEAE0', pearl_tile=0.07, pearl_bump=0.075,      # cover grain: tile (m), depth (mm)
    gilt=(1.00, 0.69, 0.12), gilt_rough=0.19,                # gold foil: linear base colour (saturated: AgX pales
                                                             # bright metal), roughness (+/- 0.06)
    q_square=2.5,               # the boards overhang the page block by this much (mm)
    q_pillow=2.4,               # pillow of the padded front board (mm at the centre; bump only)
    # --- camera (full-frame equivalent: sensor 36 mm on the long/vertical side)
    lens=80.0, fstop=11.0, focus_back=57.0,       # focus plane this far (mm) behind the Sözler spine
    cam_az=8.0,                 # the camera stands this many degrees to the left of the row's normal ...
    cam_yaw=0.4,                # ... but looks square at the wall (view-camera style: lens shift does the rest), so the
                                # console edge and the drawer gap are level to 0.1 deg under the level lines of text
    cam_pitch=3.0, cam_height=470.0, cam_dist=2400.0,
    frame_medallion_y=0.201, frame_row_y=0.518, frame_x=0.5, autoframe=1,
    # --- light
    world_strength=0.35, world_rot=-189.0, world_sat=0.40, world_tint=(0.93, 0.98, 1.10),
    key_power=33.0, key_az=-48.0, key_el=32.0, key_dist=2400.0, key_size=(560.0, 1850.0),   # tall strip, camera-right
    key_color=(1.0, 0.95, 0.86),         # near-neutral daylight (the cream is in the wall paint, not in the light)
    key_spread=110.0,
    key_fall=(-460.0, -30.0, 0.22),      # projected fall-off of the key on the console front: z dark, z full, floor
    key_wall=(130.0, 600.0, 0.36),       # projected fall-off of the key up the wall: z full, z dim, floor
    bounce_power=13.5, bounce_az=25.0, bounce_el=12.0, bounce_dist=2200.0, bounce_size=(1200.0, 1600.0),
    bounce_color=(1.0, 0.96, 0.90),      # large white bounce on the camera-left side (fill group)
    kick_power=9.0, kick_az=-50.0, kick_el=5.0, kick_dist=1500.0, kick_size=(250.0, 1600.0),   # specular kicker strip
    card_power=3.0,                      # low card in front of the console: soft sheen sweep on the walnut front
    side_power=5.3, side_pos=(-1500.0, -720.0, 160.0), side_size=(800.0, 1200.0), side_color=(1.0, 0.95, 0.88),
    side_aim=(-260.0, 0.0, 120.0),       # reflector on the far left (wall only): opens the row's shadow on the wall
    board_power=2.7, board_az=93.0, board_el=6.0, board_dist=900.0, board_size=(250.0, 500.0),
    board_color=(1.0, 0.81, 0.86),       # small card square to Sözler's left board (that volume only), behind the
                                         # plane of the spine: it lights the board, not the spine face
    accent_power=70.0, accent_temp=3800.0, accent_cone=7.0,
    quran_power=40.0, quran_temp=4300.0, quran_cone=9.0,
    exposure=0.0, look='AgX - High Contrast',
    print_gain=1.245, print_knee=0.85,   # display-referred white-point lift with a soft shoulder (after AgX)
    # --- render
    clamp_indirect=8.0, adaptive=0.012, bounces=7, clay=0,
)

LIGHT_GROUPS = ['fill', 'key', 'accent', 'quran']           # delivered passes
RENDER_GROUPS = ['fill', 'bounce', 'card', 'key', 'kick', 'accent', 'quran']   # rendered; merged as below
MERGE = {'fill': ['fill', 'bounce', 'card'], 'key': ['key', 'kick'], 'accent': ['accent'], 'quran': ['quran']}


# ==============================================================================================
# small helpers
# ==============================================================================================
def srgb2lin(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin2srgb(c):
    c = np.clip(np.asarray(c, dtype=np.float64), 0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def hexlin(h, a=1.0):
    if isinstance(h, (tuple, list)):
        return tuple(float(v) for v in h[:3]) + (a,)
    h = h.lstrip('#')
    return tuple(float(v) for v in srgb2lin([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])) + (a,)


def smoothstep(e0, e1, x):
    t = np.clip((np.asarray(x, float) - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def bump_fn(z, c, hw, p=1.0):
    t = np.clip(1 - np.abs(np.asarray(z, float) - c) / hw, 0, 1)
    return (np.sin(t * np.pi / 2) ** 2) ** p


def gauss(a, sigma):
    """Separable gaussian blur (edge padded), float32 2D."""
    if sigma <= 0.05:
        return a
    r = int(math.ceil(sigma * 3))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2).astype(np.float32)
    k /= k.sum()
    pad = np.pad(a, ((r, r), (0, 0)), mode='edge')
    out = np.zeros_like(a)
    for i, w in enumerate(k):
        out += w * pad[i:i + a.shape[0]]
    pad = np.pad(out, ((0, 0), (r, r)), mode='edge')
    out = np.zeros_like(a)
    for i, w in enumerate(k):
        out += w * pad[:, i:i + a.shape[1]]
    return out


def bezier(p0, p1, p2, p3, n=24):
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2, p3 = (np.asarray(p, float) for p in (p0, p1, p2, p3))
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3


def save_png16(path, arr):
    """Minimal 8/16-bit PNG writer (gray or RGB), filter 0 so that read_png16 below can read it back."""
    arr = np.asarray(arr)
    if arr.ndim == 2:
        arr = arr[:, :, None]
    h, w, ch = arr.shape
    depth = 16 if arr.dtype == np.uint16 else 8
    ctype = {1: 0, 3: 2, 4: 6}[ch]
    raw = arr.astype('>u2' if depth == 16 else np.uint8).reshape(h, -1)
    raw = np.concatenate([np.zeros((h, 1), np.uint8), raw.view(np.uint8).reshape(h, -1)], axis=1).tobytes()

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, depth, ctype, 0, 0, 0)) +
                chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b''))


def ensure_font():
    if os.path.exists(FONT):
        return
    from fontTools.ttLib import TTFont
    from fontTools.merge import Merger
    os.makedirs(os.path.dirname(FONT), exist_ok=True)
    parts = []
    for sub in ('latin', 'latin-ext'):
        t = TTFont(os.path.join(FONT_SRC, f'eb-garamond-600-{sub}.woff2'))
        t.flavor = None
        p = os.path.join(os.path.dirname(FONT), f'_eb-garamond-600-{sub}.ttf')
        t.save(p)
        parts.append(p)
    Merger().merge(parts).save(FONT)


# ==============================================================================================
# 1. generated textures (spines, Qur'an cover)
# ==============================================================================================
PX = 16      # spine texture px / mm
PXQ = 14     # Qur'an cover px / mm
SP_HMIN, SP_HMAX = -0.62, 0.08     # spine height map range (mm)
Q_HMIN, Q_HMAX = -0.40, 3.60       # Qur'an cover height map range (mm; includes the pillow of the padded board)
_tile_cache = {}


def motif_tile():
    """Lace motif of menba-cizim.ts (80 x 70 unit tile: teardrop + arrow head, +x points to the title).
    Returns float (140, 160): 8.75 mm x 10 mm at PX."""
    if 'm' in _tile_cache:
        return _tile_cache['m']
    ss = 4
    k = PX * 10 / 80 * ss
    W, H = int(80 * k), int(70 * k)
    im = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(im)
    pts = np.vstack([bezier((5, 35), (5, 22), (18, 17.5), (32, 25.5)), [[54, 35]],
                     bezier((32, 44.5), (18, 52.5), (5, 48), (5, 35))])
    d.polygon([tuple(p * k) for p in pts], fill=255)
    arrow = [(59, 21.5), (74, 35), (59, 48.5)]
    w = 7.5 * k
    d.line([(x * k, y * k) for x, y in arrow], fill=255, width=int(round(w)), joint='curve')
    for x, y in arrow:
        d.ellipse([x * k - w / 2, y * k - w / 2, x * k + w / 2, y * k + w / 2], fill=255)
    im = im.resize((W // ss, H // ss), Image.LANCZOS)
    _tile_cache['m'] = np.asarray(im, np.float32) / 255
    return _tile_cache['m']


def text_canvas(lines, fs_px, ls_em=0.01, line_em=0.95, base_em=0.3, ss=3, font_path=None, pad_em=0.35):
    """Lines set as the app sets them (EB Garamond 600, letter-spacing .01em, kerning kept, centred,
    baseline of line i at cy + (i-(n-1)/2)*0.95em + 0.3em).  Returns float mask (h, w), centred."""
    fs = fs_px * ss
    font = ImageFont.truetype(font_path or FONT, int(round(fs)))
    F = ['kern', '-liga']

    def lw(t):
        return font.getlength(t, features=F) + ls_em * fs * len(t)
    n = len(lines)
    cw = int(max(lw(t) for t in lines) + 2 * pad_em * fs)
    ch = int(fs * (line_em * (n - 1) + 1.7))
    im = Image.new('L', (cw, ch), 0)
    d = ImageDraw.Draw(im)
    for i, t in enumerate(lines):
        base = ch / 2 + (i - (n - 1) / 2) * fs * line_em + fs * base_em
        x0 = (cw - lw(t)) / 2
        for j, c in enumerate(t):
            x = font.getlength(t[:j + 1], features=F) - font.getlength(c, features=F) + ls_em * fs * j
            d.text((x0 + x, base), c, font=font, fill=255, anchor='ls', features=F)
    im = im.resize((max(1, round(cw / ss)), max(1, round(ch / ss))), Image.LANCZOS)
    return np.asarray(im, np.float32) / 255


def title_layout(name, T):
    """Font size by the app's rule (menba-cizim.ts `boy`): min(cap, length/em, k*thickness/(0.9 | 1.9)) with
    k = title_k (app: 0.5; 0.62 here so that the thin volumes stay legible on a phone); a two-line name is set on
    one line when that is larger (Güneş does the same)."""
    font = ImageFont.truetype(FONT, 1000)

    def em(t):
        return font.getlength(t, features=['kern', '-liga']) / 1000 + 0.01 * len(t)
    avail = SIRT_BOYU * 82 / 114

    def boy(lines):
        return min(C['title_fs_max'], avail / max(em(t) for t in lines),
                   (T * C['title_k']) / (1.9 if len(lines) > 1 else 0.9))
    lines = SIRT[name]
    fs = boy(lines)
    if len(lines) > 1:
        one = [' '.join(lines)]
        if boy(one) > fs:
            lines, fs = one, boy(one)
    return lines, fs


def paste_center(dst, src, cy, cx, mode='max'):
    h, w = src.shape
    r0, c0 = int(round(cy - h / 2)), int(round(cx - w / 2))
    a0, a1 = max(r0, 0), min(r0 + h, dst.shape[0])
    b0, b1 = max(c0, 0), min(c0 + w, dst.shape[1])
    if a1 <= a0 or b1 <= b0:
        return
    s = src[a0 - r0:a1 - r0, b0 - c0:b1 - c0]
    dst[a0:a1, b0:b1] = np.maximum(dst[a0:a1, b0:b1], s)


def make_spine_maps(key, name, T, arc_mm):
    """Height map (16-bit) + mask map (R title, G pressed/burnished, B rim around title) for one spine.
    Image x = across the spine (viewer's left -> right), y = head -> tail."""
    hp = os.path.join(GEN, f'spine_{key}_h.png')
    mp = os.path.join(GEN, f'spine_{key}_m.png')
    lines, fs = title_layout(name, T)
    meta = dict(lines=lines, fs_mm=round(fs, 2))
    stamp = os.path.join(GEN, f'spine_{key}.v4')
    sig = 'v5 %s' % json.dumps([lines, round(fs, 3), round(arc_mm, 3), C['title_press'], C['title_rim'], C['reading']])
    if (os.path.exists(hp) and os.path.exists(mp) and os.path.exists(stamp) and open(stamp).read() == sig
            and not ARGS.regen):
        return hp, mp, meta
    W, Hp = int(round(arc_mm * PX)), int(round(SIRT_BOYU * PX))
    press = np.zeros((Hp, W), np.float32)
    tile = motif_tile()
    m = max(1.7, 0.07 * arc_mm)
    usable = arc_mm - 2 * m
    n = max(1, int(round(usable / 8.75)))
    pitch = usable / n
    x0, x1 = int(round(m * PX)), int(round((arc_mm - m) * PX))
    for end in (0, 1):
        r0 = int(round(15.5 * PX))
        t = np.rot90(tile, -1) if end == 0 else np.rot90(tile, 1)     # motif points to the title
        strip = np.zeros((160, W), np.float32)
        strip[:, x0:x1] = 1
        mot = np.zeros((160, W), np.float32)
        for j in range(n):
            paste_center(mot, t, 80, (m + (j + 0.5) * pitch) * PX)
        s = strip * (1 - mot)
        ra, rb = int(round(27.55 * PX)), int(round(28.0 * PX))
        if end == 0:
            press[r0:r0 + 160] = s
            press[ra:rb, x0:x1] = 1
        else:
            press[Hp - r0 - 160:Hp - r0] = s
            press[Hp - rb:Hp - ra, x0:x1] = 1
    tm = text_canvas(lines, fs * PX)
    tm = np.rot90(tm, -1 if C['reading'] == 'down' else 1)    # 'down': first letter at the head
    Tm = np.zeros_like(press)
    paste_center(Tm, tm, Hp / 2, W / 2)
    rng = np.random.default_rng(1000 + int(key))
    # blocked title: the die leaves very slightly ragged foil edges (threshold a softened mask with fine noise)
    nz = gauss(rng.standard_normal(Tm.shape).astype(np.float32), 0.6)
    Tm = np.clip((gauss(Tm, 0.5) + 0.12 * nz - 0.5) * 3.2 + 0.5, 0, 1).astype(np.float32)
    # heights (mm): the lace strip is pressed deep; the title is pressed INTO the leather (die -0.30 mm with a crisp
    # 0.07 mm shoulder, so that the key draws a dark edge on one side of every letter and a light one on the other) and
    # the leather round it gives way in a wider, shallow pillow
    h = (-0.40 * gauss(press, 0.11 * PX) - C['title_press'] * gauss(Tm, 0.065 * PX) - 0.07 * gauss(Tm, 0.75 * PX))
    # heat-darkened, burnished rim hard against the die (~0.3 mm) and a faint wider halo (~1 mm)
    rim = np.clip((gauss(Tm, 0.20 * PX) - Tm) * 2.4, 0, 1) * (1 - Tm)
    halo = np.clip((gauss(Tm, 0.55 * PX) - Tm) * 1.9, 0, 1) * (1 - Tm)
    rim = np.clip(C['title_rim'] / 0.70 * rim + 0.16 * halo, 0, 1)
    burn = np.clip(gauss(press, 0.05 * PX), 0, 1)
    # handling patina (B): the head of the spine (where a finger pulls the volume out), a little at the tail, the
    # shoulders; soft blotches
    zh = np.arange(Hp)[:, None] / PX                                   # mm from the head
    zt = (Hp - 1 - np.arange(Hp))[:, None] / PX                        # mm from the tail
    uu = np.minimum(np.arange(W), W - 1 - np.arange(W))[None, :] / max(W - 1, 1)   # 0 at the shoulders .. 0.5
    reach = rng.uniform(24, 36)
    pat = np.maximum(1 - smoothstep(reach * 0.35, reach, zh), 0.45 * (1 - smoothstep(4, 18, zt)))
    pat = np.maximum(pat, 0.75 * (1 - smoothstep(0.02, 0.16, uu))) * np.ones((1, W), np.float32)
    coarse = rng.random((Hp // 110 + 3, W // 110 + 3)).astype(np.float32)
    blot = np.asarray(Image.fromarray(coarse).resize((W, Hp), Image.BICUBIC), np.float32)
    pat = np.clip(pat * (0.65 + 0.7 * blot) + 0.30 * (blot - 0.55), 0, 1)
    pat = pat * smoothstep(0.0, 0.05, uu)        # nothing at the very edge of the arc: no seam against the boards
    v = np.clip((h - SP_HMIN) / (SP_HMAX - SP_HMIN), 0, 1)
    Image.fromarray((v * 65535 + 0.5).astype(np.uint16)).save(hp)
    # mask map: R = title foil, G = pressed / burnished tooling + the rim round the title, B = handling patina
    rgb = np.stack([Tm, np.clip(burn + rim, 0, 1), pat], -1)
    Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8)).save(mp)
    open(stamp, 'w').write(sig)
    return hp, mp, meta


def vesica_points(cx, cy, a, b, n=400):
    r = (b * b) / a / 2 + a / 2
    c = r - a
    th = math.asin(b / r)
    half = n // 2
    p = []
    for i in range(half + 1):
        t = -th + 2 * th * i / half
        p.append((cx - c + r * math.cos(t), cy + r * math.sin(t), math.cos(t), math.sin(t)))
    for i in range(half + 1):
        t = math.pi - th + 2 * th * i / half
        p.append((cx + c + r * math.cos(t), cy + r * math.sin(t), math.cos(t), math.sin(t)))
    return p


def scalloped(cx, cy, a, b, dilim=9, genlik=1.8, n=440):
    p = vesica_points(cx, cy, a, b, n)
    half = len(p) // 2
    return [(x + nx * genlik * abs(math.sin(dilim * math.pi * ((i % half) / half))),
             y + ny * genlik * abs(math.sin(dilim * math.pi * ((i % half) / half)))) for i, (x, y, nx, ny) in enumerate(p)]


def salbek(cx, cy, w, h):
    s = 1 if h > 0 else -1
    h = abs(h)
    P = lambda dx, dy: (cx + dx, cy + s * dy)   # noqa: E731
    segs = [bezier(P(0, 0), P(w * .15, h * .25), P(w * .55, h * .25), P(w * .55, h * .62)),
            bezier(P(w * .55, h * .62), P(w * .55, h * .9), P(w * .2, h), P(0, h)),
            bezier(P(0, h), P(-w * .2, h), P(-w * .55, h * .9), P(-w * .55, h * .62)),
            bezier(P(-w * .55, h * .62), P(-w * .55, h * .25), P(-w * .15, h * .25), P(0, 0))]
    return [tuple(p) for p in np.vstack(segs)]


def make_quran_maps():
    """Front cover of the Qur'an after kuran-cizim.ts (cover 108 x 153 units): single thin gilt frame, embossed
    same-tone scalloped şemse with two slender salbeks, pressed vesica line.  No Arabic lettering.
    Returns height map path (16-bit) and mask path (R = gold)."""
    hp = os.path.join(GEN, 'quran_h.png')
    mp = os.path.join(GEN, 'quran_m.png')
    stamp = os.path.join(GEN, 'quran.v3')
    sig = 'v3 %s' % json.dumps([C['q_w'], C['q_h'], C['q_text'], C['q_pillow']])
    if (os.path.exists(hp) and os.path.exists(mp) and os.path.exists(stamp) and open(stamp).read() == sig
            and not ARGS.regen):
        return hp, mp
    ss = 3
    u = C['q_h'] / 153.0                       # mm per app unit
    k = u * PXQ * ss                           # px per unit (supersampled)
    W, H = int(round(108 * k)), int(round(153 * k))
    cx, cy = 54.0, 76.5

    def layer():
        im = Image.new('L', (W, H), 0)
        return im, ImageDraw.Draw(im)

    def arr(im):
        return np.asarray(im.resize((W // ss, H // ss), Image.LANCZOS), np.float32) / 255
    S = scalloped(cx, cy, 22.5, 35, 9, 1.8)
    im, d = layer()
    d.polygon([(x * k, y * k) for x, y in S], fill=255)
    semse = arr(im)
    im, d = layer()
    for sgn in (-1, 1):
        d.polygon([(x * k, y * k) for x, y in salbek(cx, cy + sgn * 36.4, 5.2, sgn * 11.5)], fill=255)
    salb = arr(im)
    V = [(x, y) for x, y, _, _ in vesica_points(cx, cy, 15, 23.5, 300)]
    im, d = layer()
    d.line([(x * k, y * k) for x, y in V + V[:1]], fill=255, width=int(round(0.95 * k)), joint='curve')
    vline = arr(im)
    # single gilt frame (app: .85 units; x1.6 so that it holds ~3 px in the 1080 frame) and the gilt hairline round
    # the şemse (x1.5)
    im, d = layer()
    d.rounded_rectangle([8.5 * k, 8.5 * k, (108 - 8.5) * k, (153 - 8.5) * k], radius=0.8 * k, outline=255,
                        width=int(round(1.36 * k)))
    frame = arr(im)
    im, d = layer()
    d.line([(x * k, y * k) for x, y in S + S[:1]], fill=255, width=int(round(0.63 * k)), joint='curve')
    hair = arr(im)
    gold = np.maximum(frame, hair * 0.8)
    if int(C['q_text']):
        # the app's small gold "Kur’an" inside the pressed vesica (EB Garamond 600, 8.6 units, letter-spacing .05 em,
        # baseline at centre + .33 em)
        fs_mm = 8.6 * u
        tm = text_canvas(['Kur’an'], fs_mm * PXQ, ls_em=0.05, base_em=0.33)
        t = np.zeros_like(gold)
        paste_center(t, tm, cy * u * PXQ, (cx + 0.2) * u * PXQ)
        gold = np.maximum(gold, t)
    h = (0.82 * gauss(semse, 0.34 * PXQ) + 0.62 * gauss(salb, 0.24 * PXQ) - 0.28 * gauss(vline, 0.13 * PXQ)
         - 0.08 * gauss(gold, 0.08 * PXQ))
    # the board is padded: a very shallow pillow (q_pillow mm at the centre, flat at the edges).  The white cover gets
    # a breath of shading from it, and the gilt frame, which mirrors the room, runs from bright to deep along each
    # bar because every part of it faces a slightly different way
    uu = np.linspace(-1, 1, h.shape[1], dtype=np.float32)[None, :]
    vv = np.linspace(-1, 1, h.shape[0], dtype=np.float32)[:, None]
    h = h + C['q_pillow'] * (1 - uu ** 2) * (1 - vv ** 2)
    v = np.clip((h - Q_HMIN) / (Q_HMAX - Q_HMIN), 0, 1)
    Image.fromarray((v * 65535 + 0.5).astype(np.uint16)).save(hp)
    edge = np.clip(gauss(semse, 0.5 * PXQ) - semse, 0, 1) * 2      # soft shade just outside the relief
    rgb = np.stack([gold, np.clip(edge, 0, 1), np.clip(semse + salb, 0, 1)], -1)
    Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8)).save(mp)
    open(stamp, 'w').write(sig)
    return hp, mp


# ==============================================================================================
# 2. geometry
# ==============================================================================================
def new_mesh_object(name, verts, faces, smooth=True, coll=None):
    """verts (n,3) in metres, faces (f,4) quads (or list of polygons)."""
    me = bpy.data.meshes.new(name)
    if isinstance(faces, np.ndarray):
        me.vertices.add(len(verts))
        me.vertices.foreach_set('co', np.asarray(verts, np.float32).ravel())
        me.loops.add(faces.size)
        me.loops.foreach_set('vertex_index', faces.astype(np.int32).ravel())
        me.polygons.add(len(faces))
        me.polygons.foreach_set('loop_start', np.arange(len(faces), dtype=np.int32) * faces.shape[1])
        me.polygons.foreach_set('loop_total', np.full(len(faces), faces.shape[1], np.int32))
        me.update(calc_edges=True)
    else:
        me.from_pydata([tuple(v) for v in verts], [], faces)
        me.update()
    if smooth:
        me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
    ob = bpy.data.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    return ob


def book_shell(name, T, H, board_w, rng, tb=3.0, bands=True, wobble=0.30, r_edge=0.9, narc=44, cover_uv_side=-1,
               round_k=0.26, bumps=(), band_k=1.0):
    """Leather case of a rounded-back hardback.  Local frame (mm): x across the thickness (centre 0), y = 0 at the
    spine apex and growing to the fore-edge, z = 0 tail .. H head.  UV maps: 'spine' (u across the spine arc as the
    viewer sees it, v tail->head) and 'cover' (the outside of the board at x = cover_uv_side * T/2).
    round_k: spine roundness (depth of the arc / thickness); bumps: [(side, depth_mm)] softened ("bumped") head
    corners at the spine shoulders, side -1 = viewer's left."""
    a = T / 2
    b = float(np.clip(round_k * T, 4.0, 11.5))
    ys = b
    wg = 2.2
    yg = ys + 0.6 + wg
    dg = min(1.6, 0.13 * T)
    yj = yg + wg + 0.5
    Dt = yj + board_w
    ts = 1.8
    O, In, Nr, U, WB, CU = [], [], [], [], [], []
    yb = np.linspace(Dt, yj, 9)
    ygr = np.linspace(yj, ys, 11)[1:-1]

    def side(sign, ys_list):
        for y in ys_list:
            t = np.clip((y - (yg - wg)) / (2 * wg), 0, 1)
            dip = dg * 0.5 * (1 - math.cos(2 * math.pi * t)) if (yg - wg) < y < (yg + wg) else 0.0
            O.append((sign * (a - dip), y))
            In.append((sign * (a - tb), y))
            Nr.append((sign, 0.0))
            U.append(-1.0)
            WB.append(0.0)
            CU.append((Dt - y) / board_w if y >= yj - 1e-6 else -1.0)
    side(-1, list(yb) + list(ygr))
    n_left = len(O)
    phi = np.linspace(0, np.pi, 1441)
    ex, ey = -a * np.cos(phi), ys - b * np.sin(phi)
    s = np.concatenate([[0], np.cumsum(np.hypot(np.diff(ex), np.diff(ey)))])
    arc_len = float(s[-1])
    ph = np.interp(np.linspace(0, arc_len, narc + 1), s, phi)
    for p_ in ph:
        O.append((-a * math.cos(p_), ys - b * math.sin(p_)))
        In.append((-(a - tb) * math.cos(p_), ys - (b - ts) * math.sin(p_)))
        n_ = np.array([-math.cos(p_) / a, -math.sin(p_) / b])
        Nr.append(tuple(n_ / np.linalg.norm(n_)))
        uu = float(np.interp(p_, phi, s) / arc_len)
        U.append(uu)
        WB.append(float(smoothstep(0.0, 0.09, uu) * smoothstep(0.0, 0.09, 1 - uu)))
        CU.append(-1.0)
    n_arc0, n_arc1 = n_left, len(O) - 1
    side(1, list(ygr[::-1]) + list(yb[::-1]))
    O, In, Nr, U, WB, CU = (np.array(v, float) for v in (O, In, Nr, U, WB, CU))
    N = len(O)
    P = 2 * N
    dvec = In - O
    th = np.linalg.norm(dvec, axis=1)
    dvec = dvec / th[:, None]
    # rings
    K = 3
    al = np.linspace(0, np.pi / 2, K + 1)
    zb = [(r_edge * (1 - math.cos(x)), r_edge * (1 - math.sin(x))) for x in al]
    seg = list(np.arange(r_edge + 0.25, 17.0, 0.25)) + list(np.arange(17.0, 30.0, 1.0)) + \
        list(np.arange(30.0, H / 2, 2.5))
    body = seg + [H / 2] + [H - z for z in seg[::-1]]
    rings = zb + [(z, 0.0) for z in body] + [(H - z, e) for z, e in zb[::-1]]
    Z = np.array([r[0] for r in rings])
    E = np.array([r[1] for r in rings])
    R = len(rings)
    zd = np.minimum(Z, H - Z)
    if bands:
        hb = (0.50 * bump_fn(zd, 1.5, 2.4, 0.7) + 1.05 * bump_fn(zd, 6.4, 1.75, 0.62) + 1.05 * bump_fn(zd, 10.5, 1.75, 0.62)
              - 0.10 * (bump_fn(zd, 4.25, 0.8) + bump_fn(zd, 8.45, 0.7) + bump_fn(zd, 12.6, 0.8))
              - 0.30 * bump_fn(zd, 13.7, 0.75)) * band_k
    else:
        hb = 0.25 * bump_fn(zd, 1.5, 2.4, 0.7)
    # low-frequency undulation of the spine leather
    wob = np.zeros((R, N))
    if wobble > 0:
        uq = np.where(U >= 0, U, 0)
        for _ in range(5):
            fz, fu, p0 = rng.uniform(0.8, 3.5), rng.uniform(0.3, 1.1), rng.uniform(0, 2 * np.pi)
            wob += np.sin(2 * np.pi * (fz * Z[:, None] / H + fu * uq[None, :]) + p0)
        wob *= wobble / 5 * WB[None, :]
    e = np.minimum(E[:, None], 0.42 * th[None, :])
    disp = WB[None, :] * hb[:, None] + wob
    po = O[None] + dvec[None] * e[:, :, None] + Nr[None] * disp[:, :, None]
    pi_ = In[None] - dvec[None] * e[:, :, None]
    V = np.zeros((R, P, 3))
    V[:, :N, :2] = po
    V[:, N:, :2] = pi_[:, ::-1]
    V[:, :, 2] = Z[:, None]
    for sd, depth in bumps:           # a head corner that has been knocked: pushed in and rounded over ~10 mm
        cpt = np.array([sd * a, ys + 1.0, H])
        dv = V - cpt
        dd = np.linalg.norm(dv * np.array([1.0, 0.8, 1.0]), axis=2)
        wgt = np.clip(1 - dd / 10.0, 0, 1) ** 2
        push = np.array([-sd * 0.62, 0.35, -0.70])
        V += wgt[:, :, None] * push * depth
    idx = np.arange(R * P).reshape(R, P)
    j1 = np.roll(np.arange(P), -1)
    sides = np.stack([idx[:-1, :], idx[:-1, j1], idx[1:, j1], idx[1:, :]], -1).reshape(-1, 4)
    i = np.arange(N - 1)
    top = np.stack([idx[R - 1, i], idx[R - 1, i + 1], idx[R - 1, P - 2 - i], idx[R - 1, P - 1 - i]], -1)
    bot = np.stack([idx[0, i], idx[0, P - 1 - i], idx[0, P - 2 - i], idx[0, i + 1]], -1)
    faces = np.concatenate([sides, top, bot])
    ob = new_mesh_object(name, V.reshape(-1, 3) * MM, faces)
    me = ob.data
    # UVs
    fr, fj = np.divmod(faces, P)
    is_side = np.arange(len(faces)) < len(sides)
    arc = ((fj >= n_arc0) & (fj <= n_arc1)).all(1) & is_side
    Upad = np.concatenate([U, np.full(N, -1.0)])
    uv = np.stack([Upad[fj], Z[fr] / H], -1)
    uv[~arc] = -1
    me.uv_layers.new(name='spine').data.foreach_set('uv', uv.astype(np.float32).ravel())
    if cover_uv_side < 0:
        cmask = ((fj < n_left) & (CU[np.minimum(fj, N - 1)] >= 0)).all(1) & is_side
    else:
        cmask = ((fj > n_arc1) & (fj < N) & (CU[np.minimum(fj, N - 1)] >= 0)).all(1) & is_side
    CUpad = np.concatenate([CU, np.full(N, -1.0)])
    cu = CUpad[fj] if cover_uv_side < 0 else 1 - CUpad[fj]
    uv2 = np.stack([cu, Z[fr] / H], -1)
    uv2[~cmask] = -1
    me.uv_layers.new(name='cover').data.foreach_set('uv', uv2.astype(np.float32).ravel())
    me.set_sharp_from_angle(angle=math.radians(50))
    info = dict(T=T, H=H, a=a, b=b, ys=ys, yj=yj, Dt=Dt, arc_len=arc_len, tb=tb,
                spine_pts=np.array([[O[k, 0], O[k, 1]] for k in range(n_arc0, n_arc1 + 1)]))
    return ob, info


def box_object(name, x0, x1, y0, y1, z0, z1, bevel=0.0, segments=3, smooth=True):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = (x0 if v.co.x < 0 else x1) * MM
        v.co.y = (y0 if v.co.y < 0 else y1) * MM
        v.co.z = (z0 if v.co.z < 0 else z1) * MM
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel * MM, segments=segments, profile=0.5, affect='EDGES')
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth and bevel > 0:
        me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if smooth and bevel > 0:
        m = ob.modifiers.new('wn', 'WEIGHTED_NORMAL')
        m.keep_sharp = True
        m.weight = 60
    return ob


def prism_object(name, poly_xz, y0, y1, bevel=0.0):
    """Extrude a (x, z) polygon along y."""
    bm = bmesh.new()
    vs = [bm.verts.new((x * MM, y0 * MM, z * MM)) for x, z in poly_xz]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]:
        v.co.y = y1 * MM
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel * MM, segments=2, profile=0.5, affect='EDGES')
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    m = ob.modifiers.new('wn', 'WEIGHTED_NORMAL')
    m.keep_sharp = True
    m.weight = 60
    me.set_sharp_from_angle(angle=math.radians(40))
    return ob


def prism_z(name, poly_xy, z0, z1):
    """Extrude a (x, y) polygon along z (mm); smooth sides, flat caps."""
    bm = bmesh.new()
    vs = [bm.verts.new((x * MM, y * MM, z0 * MM)) for x, y in poly_xy]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]:
        v.co.z = z1 * MM
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
    me.set_sharp_from_angle(angle=math.radians(40))
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def cylinder_x(name, x0, x1, y, z, r, n=14):
    ang = np.linspace(0, 2 * np.pi, n, endpoint=False)
    ring = np.stack([r * np.cos(ang) + y, r * np.sin(ang) + z], -1)
    V = np.concatenate([np.column_stack([np.full(n, x0), ring]), np.column_stack([np.full(n, x1), ring])]) * MM
    i = np.arange(n)
    j = (i + 1) % n
    faces = [(int(a_), int(b_), int(b_ + n), int(a_ + n)) for a_, b_ in zip(i, j)] + [tuple(int(v) for v in i[::-1])] + \
        [tuple(int(v + n) for v in i)]
    return new_mesh_object(name, V, faces, smooth=False)


# ==============================================================================================
# 3. materials
# ==============================================================================================
_img_cache = {}


def load_image(path, non_color=False):
    key = (path, non_color)
    if key not in _img_cache:
        img = bpy.data.images.load(path)
        if non_color:
            img.colorspace_settings.name = 'Non-Color'
        _img_cache[key] = img
    return _img_cache[key]


class NT:
    """Tiny node-tree builder."""

    def __init__(self, name):
        self.mat = bpy.data.materials.new(name)
        self.mat.use_nodes = True
        self.nt = self.mat.node_tree
        self.bsdf = self.nt.nodes.get('Principled BSDF')
        self.out = self.nt.nodes.get('Material Output')

    def node(self, t, **props):
        n = self.nt.nodes.new(t)
        ins = props.pop('ins', {})
        for k, v in props.items():
            setattr(n, k, v)
        for k, v in ins.items():
            self.set(n.inputs[k], v)
        return n

    def set(self, sock, v):
        if isinstance(v, bpy.types.NodeSocket):
            self.nt.links.new(v, sock)
        else:
            sock.default_value = v

    def math(self, op, a, b=None, c=None, clamp=False):
        n = self.node('ShaderNodeMath', operation=op, use_clamp=clamp)
        self.set(n.inputs[0], a)
        if b is not None:
            self.set(n.inputs[1], b)
        if c is not None:
            self.set(n.inputs[2], c)
        return n.outputs[0]

    def mix(self, fac, a, b, blend='MIX'):
        n = self.node('ShaderNodeMix', data_type='RGBA', blend_type=blend)
        n.clamp_factor = True
        self.set(n.inputs[0], fac)
        self.set(n.inputs[6], a)
        self.set(n.inputs[7], b)
        return n.outputs[2]

    def image(self, path, vector=None, non_color=False, **props):
        n = self.node('ShaderNodeTexImage', image=load_image(path, non_color), **props)
        if vector is not None:
            self.nt.links.new(vector, n.inputs['Vector'])
        return n

    def object_coords(self, scale, offset=(0, 0, 0), rot=(0, 0, 0)):
        tc = self.node('ShaderNodeTexCoord')
        mp = self.node('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (scale,) * 3 if np.isscalar(scale) else scale
        mp.inputs['Location'].default_value = offset
        mp.inputs['Rotation'].default_value = rot
        self.nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
        return mp.outputs['Vector']

    def mask_aov(self):
        """AOV 'masks': R = Sözler, G = Qur'an, B = all Risale volumes (object pass index 1 / 2 / 3)."""
        oi = self.node('ShaderNodeObjectInfo')
        r = self.math('COMPARE', oi.outputs['Object Index'], 1.0, 0.1)
        g = self.math('COMPARE', oi.outputs['Object Index'], 2.0, 0.1)
        b3 = self.math('COMPARE', oi.outputs['Object Index'], 3.0, 0.1)
        b = self.math('ADD', r, b3)
        cc = self.node('ShaderNodeCombineColor')
        self.set(cc.inputs[0], r)
        self.set(cc.inputs[1], g)
        self.set(cc.inputs[2], b)
        aov = self.node('ShaderNodeOutputAOV', aov_name='masks')
        self.nt.links.new(cc.outputs[0], aov.inputs['Color'])


def tone(col_lin, mul=1.0, sat=1.0, hue=0.0):
    """Scale value / saturation and rotate the hue (degrees, + = red towards yellow) of a linear colour."""
    c = np.array(col_lin[:3], float)
    lum = float(c @ [0.2126, 0.7152, 0.0722])
    d = (c - lum) * sat
    if hue:
        k = np.ones(3) / math.sqrt(3)
        th = math.radians(hue)
        d = d * math.cos(th) + np.cross(k, d) * math.sin(th) + k * float(k @ d) * (1 - math.cos(th))
    c = (lum + d) * mul
    return tuple(float(v) for v in np.clip(c, 0, 1)) + (1.0,)


TAN = (1.00, 0.93, 0.82)      # multiplier that pulls a colour towards light brown


def mat_leather(name, spine_h, spine_m, seed, patina=1.0, value=None):
    """Very pale faded-red leather leaning to light brown: pebble grain + pores, aniline top coat, burnished blind
    tooling, handling patina, recesses / joints / gaps that lean to tan-brown, and a blocked (pressed-in) cream foil
    title with a heat-darkened rim.  patina: per-volume strength of the handling burnish."""
    rng = np.random.default_rng(seed)
    t = NT(name)
    # every volume comes from its own hide / print run: tone, hue, saturation and gloss differ a little
    vmul = float(rng.uniform(1 - C['leather_var'], 1 + C['leather_var']))
    if value is not None:
        vmul = float(value)
    base = tone(hexlin(C['leather']), mul=vmul, sat=float(rng.uniform(0.95, 1.05)), hue=float(rng.uniform(-1.5, 1.5)))
    burnt = tone(hexlin(C['leather_burnt']), mul=vmul)
    b0_ = np.array(hexlin(C['leather'])[:3])
    brown_k = tuple(float(v) for v in np.array(hexlin(C['leather_brown'])[:3]) / b0_) + (1.0,)   # multiplier base -> brown
    coat_rough = float(np.clip(C['coat_rough'] + rng.uniform(-0.05, 0.05), 0.10, 0.40))
    vec = t.object_coords(1.0 / C['grain_tile'], offset=tuple(rng.uniform(0, 5, 3)))
    g_h = t.image(os.path.join(ASSETS, 'leather_red_02_disp_2k.png'), vec, True, projection='BOX', projection_blend=0.25)
    vec2 = t.object_coords(1.0 / C['pore_tile'], offset=tuple(rng.uniform(0, 5, 3)))
    p_h = t.image(os.path.join(ASSETS, 'leather_white_disp_2k.png'), vec2, True, projection='BOX', projection_blend=0.25)
    p_r = t.image(os.path.join(ASSETS, 'leather_white_rough_2k.jpg'), vec2, True, projection='BOX', projection_blend=0.25)
    gn = t.node('ShaderNodeMapRange', clamp=True, ins={'From Min': 0.35, 'From Max': 0.78})     # 0 valley .. 1 crest
    t.nt.links.new(g_h.outputs['Color'], gn.inputs['Value'])
    gn = gn.outputs[0]
    uv = t.node('ShaderNodeUVMap', uv_map='spine')
    s_h = t.image(spine_h, uv.outputs['UV'], True, extension='CLIP', interpolation='Cubic')
    s_m = t.image(spine_m, uv.outputs['UV'], True, extension='CLIP', interpolation='Cubic')
    sep = t.node('ShaderNodeSeparateColor')
    t.nt.links.new(s_m.outputs['Color'], sep.inputs[0])
    title, burn, pat = sep.outputs[0], sep.outputs[1], sep.outputs[2]
    pat = t.math('MULTIPLY', pat, patina, clamp=True)
    sxy = t.node('ShaderNodeSeparateXYZ')
    t.nt.links.new(uv.outputs['UV'], sxy.inputs[0])
    on_board = t.math('LESS_THAN', sxy.outputs[0], -0.5)          # the spine UV is -1 off the spine arc
    geo = t.node('ShaderNodeNewGeometry')
    wear = t.node('ShaderNodeMapRange', clamp=True, ins={'From Min': 0.515, 'From Max': 0.60})
    t.nt.links.new(geo.outputs['Pointiness'], wear.inputs['Value'])
    cav = t.node('ShaderNodeMapRange', clamp=True, ins={'From Min': 0.49, 'From Max': 0.40})
    t.nt.links.new(geo.outputs['Pointiness'], cav.inputs['Value'])
    # the foil does not reach into the very deepest grain valleys: ~3 % of it breaks
    brk = t.node('ShaderNodeMapRange', clamp=True, ins={'From Min': 0.405, 'From Max': 0.345})
    t.nt.links.new(g_h.outputs['Color'], brk.inputs['Value'])
    foil = t.math('MULTIPLY', title, t.math('SUBTRACT', 1.0, brk.outputs[0]))
    # large soft mottling of the dye; the darker clouds lean to tan
    nz = t.node('ShaderNodeTexNoise', ins={'Scale': 20.0, 'Detail': 5.0, 'Roughness': 0.62})
    t.nt.links.new(t.object_coords(1.0, offset=tuple(rng.uniform(0, 9, 3))), nz.inputs['Vector'])
    mot = t.node('ShaderNodeMapRange', ins={'From Min': 0.25, 'From Max': 0.75, 'To Min': 0.89, 'To Max': 1.11})
    t.nt.links.new(nz.outputs[0], mot.inputs['Value'])
    mot = mot.outputs[0]
    gv = t.node('ShaderNodeMapRange', ins={'From Min': 0.0, 'From Max': 1.0, 'To Min': 0.91, 'To Max': 1.07})
    t.nt.links.new(gn, gv.inputs['Value'])
    pv = t.node('ShaderNodeMapRange', ins={'From Min': 0.2, 'From Max': 0.9, 'To Min': 0.95, 'To Max': 1.03})
    t.nt.links.new(p_r.outputs['Color'], pv.inputs['Value'])
    mul = t.math('MULTIPLY', t.math('MULTIPLY', mot, gv.outputs[0]), pv.outputs[0])
    c = t.mix(1.0, base, mul, 'MULTIPLY')
    f_tan = t.node('ShaderNodeMapRange', clamp=True, ins={'From Min': 1.03, 'From Max': 0.89, 'To Min': 0.0, 'To Max': 0.7})
    t.nt.links.new(mot, f_tan.inputs['Value'])
    c = t.mix(f_tan.outputs[0], c, t.mix(1.0, c, TAN + (1.0,), 'MULTIPLY'))
    # handling patina: a touch darker / browner and more polished
    c = t.mix(pat, c, t.mix(1.0, c, (0.93, 0.895, 0.845, 1.0), 'MULTIPLY'))
    # recesses, the joints at the shoulders and the gaps between the volumes lean to tan-brown (dust, darkened dye):
    # driven by ambient occlusion, so the shadow side of the leather goes browner instead of redder
    ao = t.node('ShaderNodeAmbientOcclusion', samples=5, ins={'Distance': C['ao_mm'] * MM})
    occ = t.node('ShaderNodeMapRange', clamp=True, interpolation_type='SMOOTHSTEP',
                 ins={'From Min': 0.97, 'From Max': 0.42, 'To Min': 0.0, 'To Max': C['ao_mix']})
    t.nt.links.new(ao.outputs['AO'], occ.inputs['Value'])
    c = t.mix(occ.outputs[0], c, t.mix(1.0, c, brown_k, 'MULTIPLY'))
    light = tone(base, mul=1.13, sat=0.84)
    f_dark = t.math('ADD', t.math('MULTIPLY', burn, 0.70), t.math('MULTIPLY', cav.outputs[0], 0.80), clamp=True)
    c = t.mix(f_dark, c, burnt)
    c = t.mix(t.math('MULTIPLY', wear.outputs[0], 0.70), c, light)
    c = t.mix(foil, c, hexlin(C['title']))
    # light that has bounced diffusely off the leather is less saturated than the leather seen directly: neighbouring
    # spines no longer dye each other's shadow side salmon (the directly visible colour is untouched)
    lp = t.node('ShaderNodeLightPath')
    hs = t.node('ShaderNodeHueSaturation', ins={'Saturation': 1.0 - C['bleed_desat']})
    t.nt.links.new(c, hs.inputs['Color'])
    c = t.mix(lp.outputs['Is Diffuse Ray'], c, hs.outputs['Color'])
    t.set(t.bsdf.inputs['Base Color'], c)
    # roughness: crests of the grain are polished, valleys / pores stay matt
    r = t.math('ADD', C['leather_rough'], t.math('MULTIPLY', t.math('SUBTRACT', 0.5, gn), 0.18))
    r = t.math('ADD', r, t.math('MULTIPLY', t.math('SUBTRACT', p_r.outputs['Color'], 0.615), 0.55))
    r = t.math('ADD', r, t.math('MULTIPLY', t.math('SUBTRACT', 1.0, mot), 0.5))
    r = t.math('SUBTRACT', r, t.math('MULTIPLY', burn, 0.12))
    r = t.math('SUBTRACT', r, t.math('MULTIPLY', pat, 0.08))
    r = t.math('SUBTRACT', r, t.math('MULTIPLY', wear.outputs[0], 0.07))
    mr = t.node('ShaderNodeMix', data_type='FLOAT')
    t.set(mr.inputs[0], foil)
    t.set(mr.inputs[2], r)
    t.set(mr.inputs[3], 0.25)           # pigment foil: its own, smoother gloss
    rr = t.node('ShaderNodeClamp', ins={'Min': 0.12, 'Max': 0.9})
    t.nt.links.new(mr.outputs[0], rr.inputs['Value'])
    t.set(t.bsdf.inputs['Roughness'], rr.outputs[0])
    nofoil = t.math('SUBTRACT', 1.0, foil)
    # seen edge-on, the pebble grain masks its own gloss (a bump map cannot): coat and specular fall off at grazing
    # angles, so a board seen at 80 deg keeps the colour of the leather instead of mirroring the wall
    lw = t.node('ShaderNodeLayerWeight', ins={'Blend': 0.5})
    gz = t.node('ShaderNodeMapRange', clamp=True, interpolation_type='SMOOTHSTEP', ins={'From Min': 0.60, 'From Max': 0.93})
    t.nt.links.new(lw.outputs['Facing'], gz.inputs['Value'])
    gz = gz.outputs[0]
    t.bsdf.inputs['IOR'].default_value = 1.5
    t.set(t.bsdf.inputs['Specular IOR Level'], t.math('MULTIPLY', 0.5, t.math('SUBTRACT', 1.0, t.math('MULTIPLY', gz, C['graze_spec']))))
    t.set(t.bsdf.inputs['Sheen Weight'], t.math('MULTIPLY', nofoil, C['sheen']))
    t.bsdf.inputs['Sheen Roughness'].default_value = 0.30
    t.set(t.bsdf.inputs['Coat Weight'], t.math('MULTIPLY', t.math('MULTIPLY', nofoil, C['coat']),
                                               t.math('SUBTRACT', 1.0, t.math('MULTIPLY', gz, C['graze_coat']))))
    t.bsdf.inputs['Coat Roughness'].default_value = coat_rough
    b0 = t.node('ShaderNodeBump', ins={'Strength': 1.0, 'Distance': C['pore_mm'] * MM})
    t.nt.links.new(p_h.outputs['Color'], b0.inputs['Height'])
    b1 = t.node('ShaderNodeBump')
    t.set(b1.inputs['Distance'], t.math('ADD', C['grain_mm'] * MM,
                                        t.math('MULTIPLY', on_board, (C['board_grain_mm'] - C['grain_mm']) * MM)))
    t.set(b1.inputs['Strength'], t.math('SUBTRACT', 1.0, t.math('MULTIPLY', title, 0.55)))   # grain is flattened under the die
    t.nt.links.new(g_h.outputs['Color'], b1.inputs['Height'])
    t.nt.links.new(b0.outputs['Normal'], b1.inputs['Normal'])
    b2 = t.node('ShaderNodeBump', ins={'Strength': 1.0, 'Distance': (SP_HMAX - SP_HMIN) * MM})
    t.nt.links.new(s_h.outputs['Color'], b2.inputs['Height'])
    t.nt.links.new(b1.outputs['Normal'], b2.inputs['Normal'])
    t.nt.links.new(b2.outputs['Normal'], t.bsdf.inputs['Normal'])
    t.nt.links.new(b2.outputs['Normal'], t.bsdf.inputs['Coat Normal'])
    t.mask_aov()
    return t.mat


def mat_pages(name, color='#EDE3CE', gilt=False):
    """Page block: leaf lines (0.1-0.2 mm pitch), groups of signatures a few mm wide with slight waviness, tonal streaks."""
    t = NT(name)
    vec = t.object_coords((5200.0, 14.0, 14.0))
    nz = t.node('ShaderNodeTexNoise', ins={'Scale': 1.0, 'Detail': 2.0, 'Roughness': 0.6})
    t.nt.links.new(vec, nz.inputs['Vector'])
    v = t.node('ShaderNodeMapRange', ins={'From Min': 0.3, 'From Max': 0.7, 'To Min': 0.84, 'To Max': 1.04})
    t.nt.links.new(nz.outputs[0], v.inputs['Value'])
    nz2 = t.node('ShaderNodeTexNoise', ins={'Scale': 1.0, 'Detail': 3.0, 'Roughness': 0.55, 'Distortion': 0.35})
    t.nt.links.new(t.object_coords((620.0, 9.0, 9.0), offset=(0.3, 1.7, 0.9)), nz2.inputs['Vector'])
    v2 = t.node('ShaderNodeMapRange', ins={'From Min': 0.3, 'From Max': 0.7, 'To Min': 0.955, 'To Max': 1.03})
    t.nt.links.new(nz2.outputs[0], v2.inputs['Value'])
    base = hexlin(color)
    t.set(t.bsdf.inputs['Base Color'], t.mix(1.0, base, t.math('MULTIPLY', v.outputs[0], v2.outputs[0]), 'MULTIPLY'))
    if gilt:
        t.bsdf.inputs['Metallic'].default_value = 1.0
        t.bsdf.inputs['Roughness'].default_value = 0.32
    else:
        t.bsdf.inputs['Roughness'].default_value = 0.82
    b = t.node('ShaderNodeBump', ins={'Strength': 0.7, 'Distance': 0.09 * MM})
    t.nt.links.new(nz.outputs[0], b.inputs['Height'])
    b2 = t.node('ShaderNodeBump', ins={'Strength': 0.6, 'Distance': 0.25 * MM})
    t.nt.links.new(nz2.outputs[0], b2.inputs['Height'])
    t.nt.links.new(b.outputs['Normal'], b2.inputs['Normal'])
    t.nt.links.new(b2.outputs['Normal'], t.bsdf.inputs['Normal'])
    t.mask_aov()
    return t.mat


def mat_headband(name, c0='#EFE6D6', c1='#B98478'):
    t = NT(name)
    vec = t.object_coords((1.0, 1.0, 1.0))
    w = t.node('ShaderNodeTexWave', wave_type='BANDS', bands_direction='X', ins={'Scale': 420.0, 'Distortion': 0.0})
    t.nt.links.new(vec, w.inputs['Vector'])
    st = t.math('GREATER_THAN', w.outputs[0], 0.5)
    t.set(t.bsdf.inputs['Base Color'], t.mix(st, hexlin(c0), hexlin(c1)))
    t.bsdf.inputs['Roughness'].default_value = 0.7
    t.mask_aov()
    return t.mat


def mat_wood(name, tex='walnut_veneer_02', tile=1.0, seed=0, tint=None, gamma=None, rough=None, rot=(0, 0, 0),
             uv=False, sat=None, handled=False):
    """Walnut veneer (Poly Haven 4k).  uv=True: mapped by the object's 'UVMap' (planar, grain along x; see planar_uv)
    with the scan's tangent-space normal map; otherwise box-projected in object space (small parts)."""
    rng = np.random.default_rng(seed)
    t = NT(name)
    if uv:
        vec = t.node('ShaderNodeUVMap', uv_map='UVMap').outputs['UV']
        kw = {}
    else:
        vec = t.object_coords(1.0 / tile, offset=tuple(rng.uniform(0, 3, 3)), rot=rot)
        kw = dict(projection='BOX', projection_blend=0.05)
    d = t.image(os.path.join(ASSETS, f'{tex}_diff_4k.jpg'), vec, False, **kw)
    r = t.image(os.path.join(ASSETS, f'{tex}_rough_4k.jpg'), vec, True, **kw)
    hs = t.node('ShaderNodeHueSaturation', ins={'Saturation': C['wood_sat'] if sat is None else sat})
    t.nt.links.new(d.outputs['Color'], hs.inputs['Color'])
    g = t.node('ShaderNodeGamma', ins={'Gamma': gamma or C['wood_gamma']})
    t.nt.links.new(hs.outputs['Color'], g.inputs['Color'])
    c = t.mix(1.0, g.outputs['Color'], tuple(tint or C['wood_tint']) + (1.0,), 'MULTIPLY')
    lo, hi = rough or C['wood_rough']
    rr = t.node('ShaderNodeMapRange', ins={'From Min': 0.3, 'From Max': 0.9, 'To Min': lo, 'To Max': hi})
    t.nt.links.new(r.outputs['Color'], rr.inputs['Value'])
    rough_out = rr.outputs[0]
    if handled:
        # a surface that is lived with: wipe marks / handling smudges (low-frequency gloss variation, stretched along
        # the grain) and, on the upward faces, sparse fine dust (0.3-0.5 mm specks, ~4 %: matt and a shade lighter).
        # Both only show in the sheen.
        sm = t.node('ShaderNodeTexNoise', ins={'Scale': 1.0, 'Detail': 3.0, 'Roughness': 0.6, 'Distortion': 0.4})
        t.nt.links.new(t.object_coords((5.0, 21.0, 21.0), offset=tuple(rng.uniform(0, 3, 3))), sm.inputs['Vector'])
        smr = t.node('ShaderNodeMapRange', clamp=True, ins={'From Min': 0.30, 'From Max': 0.70, 'To Min': -0.055, 'To Max': 0.065})
        t.nt.links.new(sm.outputs[0], smr.inputs['Value'])
        du = t.node('ShaderNodeTexNoise', ins={'Scale': 2300.0, 'Detail': 1.0, 'Roughness': 0.5})
        t.nt.links.new(t.object_coords(1.0, offset=tuple(rng.uniform(0, 3, 3))), du.inputs['Vector'])
        dust = t.node('ShaderNodeMapRange', clamp=True, ins={'From Min': 0.675, 'From Max': 0.715})
        t.nt.links.new(du.outputs[0], dust.inputs['Value'])
        geo = t.node('ShaderNodeNewGeometry')
        sn = t.node('ShaderNodeSeparateXYZ')
        t.nt.links.new(geo.outputs['True Normal'], sn.inputs[0])
        dust = t.math('MULTIPLY', dust.outputs[0], t.math('GREATER_THAN', sn.outputs[2], 0.9))
        rough_out = t.math('ADD', t.math('ADD', rough_out, smr.outputs[0]), t.math('MULTIPLY', dust, 0.22), clamp=True)
        c = t.mix(t.math('MULTIPLY', dust, 0.30), c, (0.42, 0.37, 0.31, 1.0))
    t.set(t.bsdf.inputs['Base Color'], c)
    t.set(t.bsdf.inputs['Roughness'], rough_out)
    t.bsdf.inputs['IOR'].default_value = 1.5
    if uv:
        n = t.image(os.path.join(ASSETS, f'{tex}_nor_gl_4k.jpg'), vec, True)
        nm = t.node('ShaderNodeNormalMap', uv_map='UVMap', ins={'Strength': C['wood_nor']})
        t.nt.links.new(n.outputs['Color'], nm.inputs['Color'])
        b = t.node('ShaderNodeBump', ins={'Strength': 0.5, 'Distance': 0.04 * MM})
        t.nt.links.new(d.outputs['Color'], b.inputs['Height'])
        t.nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    else:
        b = t.node('ShaderNodeBump', ins={'Strength': 0.5, 'Distance': 0.05 * MM})
        t.nt.links.new(d.outputs['Color'], b.inputs['Height'])
    t.nt.links.new(b.outputs['Normal'], t.bsdf.inputs['Normal'])
    return t.mat


def planar_uv(ob, tile, ou=0.0, ov=0.0, row0=None, at=None, ends=False):
    """'UVMap' = (x, y + z) / tile (mesh coordinates, metres): the veneer's grain (texture u) runs along x on every
    face and the figure continues over a rounded front edge.  row0 / at: put the texture row `row0` (0 = top of the
    4096-row scan) at y + z = `at` metres instead of giving ov."""
    me = ob.data
    if row0 is not None:
        ov = 1.0 - row0 / 4096.0 - at / tile
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    li = np.empty(len(me.loops), np.int32)
    me.loops.foreach_get('vertex_index', li)
    uv = np.stack([co[li, 0] / tile + ou, (co[li, 1] + co[li, 2]) / tile + ov], -1)
    if ends:
        # end faces (normal along x): an edge band whose grain runs front -> back (u = y), not a smear of one texel column
        n = len(me.polygons)
        nr = np.empty(n * 3, np.float32)
        me.polygons.foreach_get('normal', nr)
        ls, lt = np.empty(n, np.int32), np.empty(n, np.int32)
        me.polygons.foreach_get('loop_start', ls)
        me.polygons.foreach_get('loop_total', lt)
        for pi_ in np.nonzero(np.abs(nr.reshape(-1, 3)[:, 0]) > 0.7)[0]:
            sl_ = slice(ls[pi_], ls[pi_] + lt[pi_])
            uv[sl_, 0] = co[li[sl_], 1] / tile + ou + 0.37
            uv[sl_, 1] = co[li[sl_], 2] / tile + ov + 0.21
    layer = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    layer.data.foreach_set('uv', uv.astype(np.float32).ravel())


def mat_plaster(name):
    t = NT(name)
    uv = t.node('ShaderNodeUVMap', uv_map='UVMap').outputs['UV']
    d = t.image(os.path.join(ASSETS, 'painted_plaster_wall_diff_2k.jpg'), uv, False)
    n = t.image(os.path.join(ASSETS, 'painted_plaster_wall_nor_gl_2k.jpg'), uv, True)
    h = t.image(os.path.join(ASSETS, 'painted_plaster_wall_disp_2k.jpg'), uv, True)
    # keep only the gentle tonal blotches of the photo-scan, as a multiplier around 1
    bw = t.node('ShaderNodeRGBToBW')
    t.nt.links.new(d.outputs['Color'], bw.inputs[0])
    v = t.node('ShaderNodeMapRange', ins={'From Min': 0.30, 'From Max': 0.52, 'To Min': 0.955, 'To Max': 1.03})
    t.nt.links.new(bw.outputs[0], v.inputs['Value'])
    c = t.mix(1.0, hexlin(C['wall']), v.outputs[0], 'MULTIPLY')
    lp = t.node('ShaderNodeLightPath')
    hs = t.node('ShaderNodeHueSaturation', ins={'Saturation': 1.0 - C['wall_bleed_desat']})
    t.nt.links.new(c, hs.inputs['Color'])
    t.set(t.bsdf.inputs['Base Color'], t.mix(lp.outputs['Is Diffuse Ray'], c, hs.outputs['Color']))
    t.bsdf.inputs['Roughness'].default_value = 0.88
    t.bsdf.inputs['Specular IOR Level'].default_value = 0.35
    nm = t.node('ShaderNodeNormalMap', uv_map='UVMap', ins={'Strength': 0.6})
    t.nt.links.new(n.outputs['Color'], nm.inputs['Color'])
    b = t.node('ShaderNodeBump', ins={'Strength': 1.0, 'Distance': 0.35 * MM})
    t.nt.links.new(h.outputs['Color'], b.inputs['Height'])
    t.nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    t.nt.links.new(b.outputs['Normal'], t.bsdf.inputs['Normal'])
    return t.mat


def mat_pearl(name, hpath=None, mpath=None):
    """Pearl-white cover with a fine grain; with maps: embossed şemse (bump) and gold-foil frame / lettering."""
    t = NT(name)
    vec = t.object_coords(1.0 / C['pearl_tile'])
    g_h = t.image(os.path.join(ASSETS, 'leather_white_disp_2k.png'), vec, True, projection='BOX', projection_blend=0.25)
    base = hexlin(C['pearl'])
    b1 = t.node('ShaderNodeBump', ins={'Strength': 1.0, 'Distance': C['pearl_bump'] * MM})
    t.nt.links.new(g_h.outputs['Color'], b1.inputs['Height'])
    nrm = b1.outputs['Normal']
    # the grain also carries the gloss: crests a little smoother, valleys matt (0.42 +/- 0.05)
    r_pearl = t.node('ShaderNodeMapRange', clamp=True, ins={'From Min': 0.30, 'From Max': 0.70, 'To Min': 0.47, 'To Max': 0.37})
    t.nt.links.new(g_h.outputs['Color'], r_pearl.inputs['Value'])
    r_pearl = r_pearl.outputs[0]
    # ... and a trace of tone (valleys hold a little shade), so the cover is not a flat CG white at 100 %
    v_pearl = t.node('ShaderNodeMapRange', clamp=True, ins={'From Min': 0.30, 'From Max': 0.70, 'To Min': 0.965, 'To Max': 1.0})
    t.nt.links.new(g_h.outputs['Color'], v_pearl.inputs['Value'])
    base_c = t.mix(1.0, base, v_pearl.outputs[0], 'MULTIPLY')
    t.bsdf.inputs['IOR'].default_value = 1.5
    t.bsdf.inputs['Coat Weight'].default_value = 0.22
    t.bsdf.inputs['Coat Roughness'].default_value = 0.22
    t.bsdf.inputs['Sheen Weight'].default_value = 0.10
    if hpath:
        uv = t.node('ShaderNodeUVMap', uv_map='cover').outputs['UV']
        s_h = t.image(hpath, uv, True, extension='CLIP', interpolation='Cubic')
        s_m = t.image(mpath, uv, True, extension='CLIP', interpolation='Cubic')
        sep = t.node('ShaderNodeSeparateColor')
        t.nt.links.new(s_m.outputs['Color'], sep.inputs[0])
        gold, edge = sep.outputs[0], sep.outputs[1]
        # the app's two pairs of gilt bands across the spine (spine UV: u across the arc, v tail -> head)
        sx = t.node('ShaderNodeSeparateXYZ')
        t.nt.links.new(t.node('ShaderNodeUVMap', uv_map='spine').outputs['UV'], sx.inputs[0])
        su, sv = sx.outputs[0], sx.outputs[1]
        bands = None
        for vc in (0.8856, 0.8660, 0.1275, 0.1080):
            dv = t.math('ABSOLUTE', t.math('SUBTRACT', sv, vc))
            bn = t.node('ShaderNodeMapRange', clamp=True, ins={'From Min': 0.0042, 'From Max': 0.0026})
            t.nt.links.new(dv, bn.inputs['Value'])
            bands = bn.outputs[0] if bands is None else t.math('MAXIMUM', bands, bn.outputs[0])
        inside = t.math('MULTIPLY', t.math('GREATER_THAN', su, 0.035), t.math('LESS_THAN', su, 0.965))
        gold = t.math('MAXIMUM', gold, t.math('MULTIPLY', bands, inside))
        c = t.mix(t.math('MULTIPLY', edge, 0.16), base_c, tone(base, mul=0.80, sat=1.3))
        # gold foil: a real metal (base colour = gold's reflectance), smooth enough to mirror the room (bright where it
        # sees the bounce card, deep where it sees the dark room), with the foil's own ~1 mm unevenness and a fine
        # crackle, so its brightness runs along the frame instead of sitting there like flat ochre ink
        fo = t.node('ShaderNodeTexNoise', ins={'Scale': 900.0, 'Detail': 2.0, 'Roughness': 0.55})
        t.nt.links.new(t.object_coords(1.0, offset=(0.31, 0.17, 0.53)), fo.inputs['Vector'])
        r_gold = t.node('ShaderNodeMapRange', clamp=True, ins={'From Min': 0.25, 'From Max': 0.75,
                                                             'To Min': C['gilt_rough'] - 0.06, 'To Max': C['gilt_rough'] + 0.06})
        t.nt.links.new(fo.outputs[0], r_gold.inputs['Value'])
        fl = t.node('ShaderNodeTexNoise', ins={'Scale': 55.0, 'Detail': 1.0, 'Roughness': 0.5})     # ~2 cm waviness
        t.nt.links.new(t.object_coords(1.0, offset=(0.7, 0.2, 0.9)), fl.inputs['Vector'])
        c = t.mix(gold, c, tuple(C['gilt']) + (1.0,))
        t.set(t.bsdf.inputs['Base Color'], c)
        t.set(t.bsdf.inputs['Metallic'], gold)
        rmix = t.node('ShaderNodeMix', data_type='FLOAT')
        t.set(rmix.inputs[0], gold)
        t.set(rmix.inputs[2], r_pearl)
        t.set(rmix.inputs[3], r_gold.outputs[0])
        t.set(t.bsdf.inputs['Roughness'], rmix.outputs[0])
        t.set(t.bsdf.inputs['Coat Weight'], t.math('SUBTRACT', 0.22, t.math('MULTIPLY', gold, 0.22)))
        b2 = t.node('ShaderNodeBump', ins={'Strength': 1.0, 'Distance': (Q_HMAX - Q_HMIN) * MM})
        t.nt.links.new(s_h.outputs['Color'], b2.inputs['Height'])
        t.nt.links.new(nrm, b2.inputs['Normal'])
        b3 = t.node('ShaderNodeBump', ins={'Distance': 0.02 * MM})                # foil crackle (0.02 mm)
        t.set(b3.inputs['Strength'], gold)
        t.nt.links.new(fo.outputs[0], b3.inputs['Height'])
        t.nt.links.new(b2.outputs['Normal'], b3.inputs['Normal'])
        b4 = t.node('ShaderNodeBump', ins={'Distance': 0.12 * MM})                # the foil follows the soft board
        t.set(b4.inputs['Strength'], gold)
        t.nt.links.new(fl.outputs[0], b4.inputs['Height'])
        t.nt.links.new(b3.outputs['Normal'], b4.inputs['Normal'])
        nrm = b4.outputs['Normal']
    else:
        t.set(t.bsdf.inputs['Base Color'], base_c)
        t.set(t.bsdf.inputs['Roughness'], r_pearl)
    t.nt.links.new(nrm, t.bsdf.inputs['Normal'])
    t.mask_aov()
    return t.mat


# ==============================================================================================
# 4. scene assembly
# ==============================================================================================
def place(objs, M):
    for o in objs:
        o.matrix_world = M


def Tm(x, y, z):
    return Matrix.Translation((x * MM, y * MM, z * MM))


# hand-arranged shelf: per volume (lean deg [+ = head to the left], yaw deg, dy mm [+ = pushed back], bumped head
# corners, patina = strength of the handling burnish, band_k = height of the raised bands / head cap: the most-read
# volumes are a little more burnished and their caps a little softer; value = leather value multiplier instead of the
# random +/- leather_var: the volumes at the key's end of the row are a shade deeper, so that Sözler under its accent
# stays the lightest spine).  Volumes that are not listed get small random values.
ARRANGE = {
    'Sözler':                     dict(lean=0.0, yaw=0.35, value=0.96),   # a shade deeper, so that its title keeps
                                                                          # >= 1.75 : 1 under the accent light
    'Mektubat':                   dict(lean=0.0, yaw=-0.30, dy=1.5, patina=1.7, band_k=0.84),
    "Lem'alar":                   dict(lean=0.22, yaw=0.20, dy=-2.5),
    'Şuâlar':                     dict(lean=0.0, yaw=-0.15, dy=3.0, bumps=[(1, 1.1)], value=0.985),
    'Mesnevî-i Nûriye':           dict(lean=-0.42, dy=-1.0),
    'Barla Lâhikası':             dict(dy=6.0, yaw=0.45, value=1.0),
    'Kastamonu Lâhikası':         dict(lean=0.30, dy=1.0, value=0.99),
    'Sikke-i Tasdîk-i Gaybî':     dict(lean=0.34, dy=-3.5, yaw=-0.40),
    'Tarihçe-i Hayat':            dict(lean=0.0, dy=2.0, bumps=[(-1, 1.3)]),
    'Asâ-yı Mûsâ':                dict(lean=-0.30, dy=6.0, patina=1.6, band_k=0.86, value=0.975),
    'İman ve Küfür Muvâzeneleri': dict(lean=-0.12, dy=-2.0, yaw=0.30, value=0.975),
    'Muhâkemat':                  dict(lean=1.05, dy=0.5, bumps=[(1, 0.9)], value=0.955),
}


def build_books(S):
    """The 14 volumes upright in one row, canonical order left -> right, Sözler pulled forward.  Every volume gets
    its own small lean / yaw / depth / height; the row is packed left to right so that neighbours touch or keep a
    small gap but never intersect."""
    rng = np.random.default_rng(C['seed'])
    page_mat = mat_pages('pages')
    hb_mat = mat_headband('headband')
    Ts = [KALINLIK[n] * SIRT_BOYU for n in KULLIYAT]
    gaps = rng.uniform(0.2, 1.5, len(Ts))
    y_spine = -(C['row_gap_wall'] + KAPAK_ENI + 12.0)
    S['books'] = {}
    prev = None          # x of the previous volume's right face at the four test lines
    tests = [(y_spine + 15.0, 0.0), (y_spine + 15.0, SIRT_BOYU), (y_spine + 170.0, 0.0), (y_spine + 170.0, SIRT_BOYU)]

    def face_x(M, xs, Dt):
        """x of the plane of the face at local x = xs, evaluated at the test lines (world y, z)."""
        P = [np.array(M @ Vector((xs * MM, y * MM, z * MM))) / MM for y, z in ((0, 0), (Dt, 0), (0, SIRT_BOYU))]
        n = np.cross(P[1] - P[0], P[2] - P[0])
        return np.array([P[0][0] - (n[1] * (y - P[0][1]) + n[2] * (z - P[0][2])) / n[0] for y, z in tests])
    placed = []
    for i, name in enumerate(KULLIYAT):
        T = Ts[i]
        key = f'{i + 1:02d}'
        brng = np.random.default_rng(C['seed'] * 100 + i)
        arr = ARRANGE.get(name, {})
        rk = 0.26 * (1 + float(brng.uniform(-0.12, 0.12)))
        vrng = np.random.default_rng(C['seed'] * 1000 + i)     # look variation only (keeps the arrangement stable)
        patina = arr.get('patina', float(vrng.uniform(0.75, 1.2)))
        band_k = arr.get('band_k', float(vrng.uniform(0.90, 1.08)))
        shell, info = book_shell(f'cilt_{key}', T, SIRT_BOYU, KAPAK_ENI, brng, round_k=rk, bumps=arr.get('bumps', ()),
                                 r_edge=float(brng.uniform(0.8, 1.3)), band_k=band_k)
        hp, mp, meta = make_spine_maps(key, name, T, info['arc_len'])
        shell.data.materials.append(mat_leather(f'deri_{key}', hp, mp, C['seed'] * 7 + i, patina=patina,
                                                value=arr.get('value')))
        a, tb = info['a'], info['tb']
        pages = box_object(f'sayfa_{key}', -(a - tb - 0.25), a - tb - 0.25, info['ys'] + 2.0, info['Dt'] - 4.0, 3.5,
                           SIRT_BOYU - 3.5)
        pages.data.materials.append(page_mat)
        hb1 = cylinder_x(f'sirize_u_{key}', -(a - tb - 0.3), a - tb - 0.3, info['ys'] + 2.4, SIRT_BOYU - 3.3, 1.5)
        hb2 = cylinder_x(f'sirize_a_{key}', -(a - tb - 0.3), a - tb - 0.3, info['ys'] + 2.4, 3.3, 1.5)
        hb1.data.materials.append(hb_mat)
        hb2.data.materials.append(hb_mat)
        objs = [shell, pages, hb1, hb2]
        ang = arr.get('lean', float(brng.uniform(-0.10, 0.10)))
        yaw = arr.get('yaw', float(brng.uniform(-0.5, 0.5)))
        dy = arr.get('dy', float(brng.uniform(-4.0, 4.0)))
        sz = 1 + float(brng.uniform(-0.004, 0.004))
        if name == 'Sözler':
            dy = -C['pull']
        th = math.radians(ang)
        piv = -a if ang > 0 else a          # leans left: rests on its lower-left edge; leans right: lower-right
        Dt = info['Dt']
        M0 = (Tm(0, y_spine + dy, 0) @ Tm(piv, 0, 0) @ Matrix.Rotation(-th, 4, 'Y') @ Tm(-piv, 0, 0) @
              Tm(0, Dt / 2, 0) @ Matrix.Rotation(math.radians(yaw), 4, 'Z') @ Tm(0, -Dt / 2, 0) @
              Matrix.Diagonal((1, 1, sz, 1)))
        left, right = face_x(M0, -a, Dt), face_x(M0, a, Dt)
        if prev is None:
            x = 0.0
        else:
            x = float(np.max(prev - left)) + (0.0 if ang > 0.2 or placed[-1]['ang'] < -0.2 else gaps[i])
        prev = right + x
        placed.append(dict(name=name, objs=objs, info=info, M0=M0, x=x, T=T, meta=meta, key=key, ang=ang,
                           lo=float((left + x)[[0, 2]].min()), hi=float((right + x)[[0, 2]].max())))
    # centre the row (feet of the first and the last volume) on x = 0
    x0, x1 = placed[0]['lo'], placed[-1]['hi']
    xc = (x0 + x1) / 2
    S['row_x'] = (x0 - xc, x1 - xc)
    for b in placed:
        M = Tm(b['x'] - xc, 0, 0) @ b['M0']
        place(b['objs'], M)
        for o in b['objs']:
            o.pass_index = 1 if b['name'] == 'Sözler' else 3
        S['books'][b['name']] = dict(objs=b['objs'], info=b['info'], M=M, T=b['T'], meta=b['meta'], key=b['key'])
    S['sozler_focus'] = S['books']['Sözler']['M'] @ Vector((0, 0, 0.125))
    S['y_spine'] = y_spine
    return S


def build_quran(S):
    """Pearl-white mushaf, front cover to the camera, spine on the viewer's right, reclined on a small walnut stand."""
    W, H, T = C['q_w'], C['q_h'], C['q_t']
    rng = np.random.default_rng(C['seed'] + 500)
    hp, mp = make_quran_maps()
    shell, info = book_shell('mushaf', T, H, W, rng, tb=3.2, bands=False, wobble=0.0, narc=36, cover_uv_side=-1)
    shell.data.materials.append(mat_pearl('sedef', hp, mp))
    a, tb = info['a'], info['tb']
    sq = C['q_square']
    gilt_pages = mat_pages('yaldiz', tuple(0.92 * v for v in C['gilt']), gilt=True)
    pages = box_object('mushaf_sayfa', -(a - tb - 0.25), a - tb - 0.25, info['ys'] + 2.0, info['Dt'] - sq, sq, H - sq)
    pages.data.materials.append(gilt_pages)
    # the rounded back of the page block fills the hollow of the spine, with a headband at head and tail: seen from
    # below (the book leans back) the tail of the spine is closed, not an open shell
    ax, by = a - tb - 0.25, (info['b'] - 1.8) + 2.0 - 0.35
    back_poly = [(-ax * math.cos(p_), info['ys'] + 2.0 - by * math.sin(p_)) for p_ in np.linspace(0, np.pi, 25)]
    back = prism_z('mushaf_sirt_ici', back_poly, sq, H - sq)
    back.data.materials.append(gilt_pages)
    hb_mat = mat_headband('mushaf_sirize', '#F1EADB', '#C9A25C')
    hb_poly = [(x_ * 1.0, y_ - 0.25 * (info['ys'] + 2.0 - y_) / by) for x_, y_ in back_poly] + \
        [(ax, info['ys'] + 4.2), (-ax, info['ys'] + 4.2)]
    hb_t = prism_z('mushaf_sirize_a', hb_poly, sq - 1.5, sq)
    hb_h = prism_z('mushaf_sirize_u', hb_poly, H - sq, H - sq + 1.5)
    for o in (hb_t, hb_h):
        o.data.materials.append(hb_mat)
    objs = [shell, pages, back, hb_t, hb_h]
    sh = C['shelf']
    th = math.radians(C['q_recline'])
    yO, zO = -112.0, sh[4] + 30.0
    F = Tm(C['q_x'], yO, zO) @ Matrix.Rotation(-th, 4, 'X')          # reclined frame of the stand's cradle
    # book local -> cradle frame: front cover (local -x face) to -y, spine (local -y) to +x, centred on the board
    xc = (info['yj'] + info['Dt']) / 2
    B = Tm(xc, a, 0) @ Matrix.Rotation(math.pi / 2, 4, 'Z')
    # after Rz(90°): local (x, y) -> (-y, x); board centre y=xc -> x=-xc, so shift +xc; local x=-a -> y=-a, shift +a
    M = F @ B
    place(objs, M)
    for o in objs:
        o.pass_index = 2
    S['quran'] = dict(objs=objs, info=info, M=M, F=F)
    # medallion centre on the cover (cover-local: board centre, mid height, outer face x = -a)
    S['medallion_world'] = M @ Vector((-a * MM, xc * MM, H / 2 * MM))
    # --- stand ("rahle"): apron with an ogee arch, tilted ledge with a low lip, back rest
    wood = mat_wood('ceviz_rahle', tile=0.45, seed=5, tint=(0.40, 0.27, 0.155), gamma=1.35, rough=(0.30, 0.45), sat=0.72)
    # The stand carries the WHOLE book: it is centred on the book's full width (board + joint + rounded spine, i.e.
    # yj / 2 to the right of the medallion's axis) and its ledge is a little wider than the book, so the tail of the
    # spine rests on wood (no underside of the spine hanging in the air like an open shell).
    qx = C['q_x'] + info['yj'] / 2
    lw_ = info['Dt'] / 2 + 3.5
    half, hgt = lw_ - 3.0, 25.6
    ak = half / 60.0
    arch_l = bezier((-33 * ak, 0), (-33 * ak, 8.5), (-13 * ak, 9.5), (0, 13.5), 14)
    arch = [tuple(p) for p in arch_l] + [(-x_, z_) for x_, z_ in arch_l[::-1][1:]]
    poly = [(-half, 0)] + arch + [(half, 0), (half, hgt), (-half, hgt)]
    apron = prism_object('rahle_etek', [(x_ + qx, z_ + sh[4]) for x_, z_ in poly], yO - 9.0, yO - 0.5, bevel=0.7)
    dx_ = info['yj'] / 2
    ledge = box_object('rahle_raf', dx_ - lw_, dx_ + lw_, -9.0, T + 9.0, -5.6, 0.0, bevel=0.9)
    lip = box_object('rahle_dudak', dx_ - lw_, dx_ + lw_, -9.0, -1.2, -0.5, 3.9, bevel=1.2)
    back = box_object('rahle_arka', dx_ - 46, dx_ + 46, T + 0.6, T + 8.6, -21.0, 150.0, bevel=1.0)
    for o in (ledge, lip, back):
        o.matrix_world = F
    for o in (apron, ledge, lip, back):
        o.data.materials.append(wood)
    S['stand'] = [apron, ledge, lip, back]
    return S


def build_room(S):
    # wall with UVs in metres / tile
    X0, X1, Z0, Z1 = -2.6, 2.6, -1.6, 2.8
    tile = C['wall_tile']
    V = np.array([[X0, 0, Z0], [X1, 0, Z0], [X1, 0, Z1], [X0, 0, Z1]])
    wall = new_mesh_object('duvar', V, [(0, 1, 2, 3)], smooth=False)
    uvl = wall.data.uv_layers.new(name='UVMap')
    for li, (x, z) in enumerate([(X0, Z0), (X1, Z0), (X1, Z1), (X0, Z1)]):
        uvl.data[li].uv = (x / tile + 0.37, z / tile + 0.21)
    wall.data.materials.append(mat_plaster('siva'))
    # console: a veneered top slab that overhangs the carcass, a shadow gap, plain drawer fronts.  It stands a few
    # millimetres off the wall.  Veneer rows are chosen from the calm, straight-grained parts of the scan.
    wt = C['wood_tile']
    cf, sl, ov, dg, dh, wg = (C[k] for k in ('console_front', 'slab', 'slab_over', 'drawer_gap', 'drawer_h', 'wall_gap'))
    wood_top = mat_wood('ceviz_tabla', uv=True, sat=C['wood_sat'] * 0.85, handled=True)
    wood_front = mat_wood('ceviz_on', uv=True)
    slab = box_object('konsol_tabla', -1700, 1700, cf - ov, -wg, -sl, 0, bevel=C['slab_r'], segments=4)
    planar_uv(slab, wt, ou=0.31, row0=1405.0, at=(cf - ov - sl) * MM)
    slab.data.materials.append(wood_top)
    z1 = -sl - dg
    d1 = box_object('cekmece_1', -1250, 1250, cf, cf + 19, z1 - dh, z1, bevel=0.8, segments=2)
    planar_uv(d1, wt, ou=0.52, row0=2646.0, at=(cf + z1) * MM)
    z2 = z1 - dh - dg
    d2 = box_object('cekmece_2', -1250, 1250, cf, cf + 19, z2 - 420, z2, bevel=0.8, segments=2)
    planar_uv(d2, wt, ou=0.13, row0=2064.0, at=(cf + z2) * MM)
    for o in (d1, d2):
        o.data.materials.append(wood_front)
    core = box_object('konsol_govde', -1690, 1690, cf + 16, -wg - 6, -1100, -sl)
    dark = NT('govde_ici')
    dark.bsdf.inputs['Base Color'].default_value = (0.020, 0.014, 0.010, 1.0)
    dark.bsdf.inputs['Roughness'].default_value = 0.7
    core.data.materials.append(dark.mat)
    sh = C['shelf']
    shelf = box_object('raf', sh[0], sh[1], sh[2], 0.5, sh[3], sh[4], bevel=1.6, segments=4)
    planar_uv(shelf, wt, ou=0.77, row0=2900.0, at=(sh[2] + sh[3]) * MM, ends=True)
    shelf.data.materials.append(mat_wood('ceviz_raf', uv=True, tint=tuple(v * 0.97 for v in C['wood_tint']), handled=True))
    S['wall'], S['shelf'] = wall, shelf
    S['console'] = [slab, d1, d2, core]
    return S


def centre_upper(S):
    """The camera stands off-axis, so things at different depths shift against each other.  Slide the Qur'an (with
    its stand) and the shelf sideways by a few millimetres so that, seen from the camera, the medallion and the shelf
    sit exactly on the frame's centre line, above the centre of the row."""
    def px_per_m(p):
        return (project(S, [np.array(p) + [0.1, 0, 0]])[0, 0] - project(S, [p])[0, 0]) / 0.1
    med = np.array(S['medallion_world'])
    dx_q = float((C['frame_x'] - project(S, [med])[0, 0]) / px_per_m(med))
    T = Matrix.Translation((dx_q, 0, 0))
    for o in S['quran']['objs'] + S['stand']:
        o.matrix_world = T @ o.matrix_world
    S['quran']['M'] = T @ S['quran']['M']
    S['medallion_world'] = T @ S['medallion_world']
    sh = C['shelf']
    c = np.array([(sh[0] + sh[1]) / 2 * MM, sh[2] * MM, (sh[3] + sh[4]) / 2 * MM])
    # the camera also sees the shelf's left end: centre the mean of the front face and of the whole silhouette
    sx = project(S, mesh_world_points(S['shelf']))[:, 0]
    seen = 0.5 * (project(S, [c])[0, 0] + 0.5 * (sx.min() + sx.max()))
    dx_s = float((C['frame_x'] - seen) / px_per_m(c))
    S['shelf'].matrix_world = Matrix.Translation((dx_s, 0, 0)) @ S['shelf'].matrix_world
    S['upper_dx_mm'] = (round(dx_q / MM, 2), round(dx_s / MM, 2))
    bpy.context.view_layer.update()


def look_at(ob, target):
    d = Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def add_light(name, kind, loc_mm, target_mm, power, group, temp=None, **props):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = power
    if temp:
        ld.use_temperature = True
        ld.temperature = temp
    for k, v in props.items():
        setattr(ld, k, v)
    ob = bpy.data.objects.new(name, ld)
    ob.location = Vector(loc_mm) * MM
    bpy.context.scene.collection.objects.link(ob)
    look_at(ob, Vector(target_mm) * MM)
    ob.lightgroup = group
    return ob


def link_receivers(light, objs, name):
    coll = bpy.data.collections.new(name)
    for o in objs:
        coll.objects.link(o)
    light.light_linking.receiver_collection = coll


def sph(az_deg, el_deg):
    """Unit vector towards a light: az measured from the wall normal (-y), + = camera-left; el up."""
    az, el = math.radians(az_deg), math.radians(el_deg)
    return Vector((-math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))


def flag_light(light, color, front=None, wall=None):
    """Lamp shader with projected "flags": every ray of the lamp is projected onto a vertical plane and dimmed by
    the height where it lands there.  front = (z dark, z full, floor) on the plane of the console front;
    wall = (z full, z dim, floor) on the wall."""
    kd = light.data
    kd.use_nodes = True
    kt = kd.node_tree
    em = [n for n in kt.nodes if n.type == 'EMISSION'][0]
    em.inputs['Color'].default_value = tuple(color) + (1.0,)
    geo = kt.nodes.new('ShaderNodeNewGeometry')
    sp = kt.nodes.new('ShaderNodeSeparateXYZ')
    si = kt.nodes.new('ShaderNodeSeparateXYZ')
    kt.links.new(geo.outputs['Position'], sp.inputs[0])
    kt.links.new(geo.outputs['Incoming'], si.inputs[0])

    def km(op, a, b):
        n = kt.nodes.new('ShaderNodeMath')
        n.operation = op
        for i, v in enumerate((a, b)):
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                kt.links.new(v, n.inputs[i])
        return n.outputs[0]

    def landing_z(plane_y):
        tt = km('DIVIDE', km('SUBTRACT', plane_y, sp.outputs['Y']), si.outputs['Y'])
        return km('ADD', sp.outputs['Z'], km('MULTIPLY', tt, si.outputs['Z']))

    def ramp(val, v0, v1, o0, o1):
        mr = kt.nodes.new('ShaderNodeMapRange')
        mr.interpolation_type = 'SMOOTHSTEP'
        for k_, v_ in (('From Min', v0), ('From Max', v1), ('To Min', o0), ('To Max', o1)):
            mr.inputs[k_].default_value = v_
        kt.links.new(val, mr.inputs['Value'])
        return mr.outputs[0]
    f = None
    if front:
        z0, z1, fl = front
        f = ramp(landing_z(C['console_front'] * MM), z0 * MM, z1 * MM, fl, 1.0)
    if wall:
        w0, w1, wf = wall
        fw = ramp(landing_z(0.0), w0 * MM, w1 * MM, 1.0, wf)
        f = fw if f is None else km('MULTIPLY', f, fw)
    if f is not None:
        kt.links.new(f, em.inputs['Strength'])


def build_lights(S):
    sc = bpy.context.scene
    vl = sc.view_layers[0]
    for g in RENDER_GROUPS:
        vl.lightgroups.add(name=g)
    # ambient: Poly Haven interior HDRI, its window turned to the key's side (camera-right)
    w = bpy.data.worlds.new('dunya')
    w.use_nodes = True
    sc.world = w
    nt = w.node_tree
    bg = nt.nodes['Background']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Rotation'].default_value = (0, 0, math.radians(C['world_rot']))
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(os.path.join(ASSETS, 'lebombo_2k.hdr'))
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
    hsv = nt.nodes.new('ShaderNodeHueSaturation')
    hsv.inputs['Saturation'].default_value = C['world_sat']
    tint = nt.nodes.new('ShaderNodeMix')
    tint.data_type, tint.blend_type = 'RGBA', 'MULTIPLY'
    tint.inputs[0].default_value = 1.0
    tint.inputs[7].default_value = tuple(C['world_tint']) + (1.0,)
    nt.links.new(env.outputs['Color'], hsv.inputs['Color'])
    nt.links.new(hsv.outputs['Color'], tint.inputs[6])
    nt.links.new(tint.outputs[2], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = C['world_strength']
    w.lightgroup = 'fill'
    # key: tall soft strip (a 0.56 x 1.85 m strip box), camera-right and above -> short lighting: every rounded spine
    # gets a highlight line on its right shoulder and a form shadow on its left
    tgt = Vector((0, -150, 210))
    loc = tgt + sph(C['key_az'], C['key_el']) * C['key_dist']
    key = add_light('key', 'AREA', loc, tgt, C['key_power'], 'key', None, shape='RECTANGLE',
                    size=C['key_size'][0] * MM, size_y=C['key_size'][1] * MM, spread=math.radians(C['key_spread']))
    S['key'] = key
    # the key is "flagged" like a photographer would: every ray of the lamp is projected (a) onto the plane of the
    # console front and dimmed by the height where it lands (the lower third falls off), (b) onto the wall and dimmed
    # by the height where it lands there (the wall falls off towards the top of the frame)
    flag_light(key, C['key_color'], front=C['key_fall'], wall=C['key_wall'])
    # specular kicker (key group): a narrow, tall strip low on the camera-right.  The key stands 32 deg up, so its
    # mirror image in the upright spines never reaches the camera (which looks slightly down on them); this strip
    # reaches below the camera's mirror direction and draws the highlight line down the right shoulder of every
    # spine and of the Qur'an's spine.  It is a pure reflection card (invisible to diffuse shading: no second set
    # of shadows, no change of exposure); flagged off the console front like the key.
    kt_ = Vector((0, S['y_spine'], 120))
    loc = kt_ + sph(C['kick_az'], C['kick_el']) * C['kick_dist']
    kick = add_light('kick', 'AREA', loc, kt_, C['kick_power'], 'kick', None, shape='RECTANGLE',
                     size=C['kick_size'][0] * MM, size_y=C['kick_size'][1] * MM)
    kick.visible_diffuse = False       # a reflection card: it shows in the gloss, it does not light or cast shadows
    flag_light(kick, C['key_color'], front=C['key_fall'])
    # fill: a large white bounce next to the camera (frontal, so the pulled-out Sözler does not shade Mektubat)
    loc = tgt + sph(C['bounce_az'], C['bounce_el']) * C['bounce_dist']
    bnc = add_light('bounce', 'AREA', loc, tgt, C['bounce_power'], 'bounce', None, shape='RECTANGLE',
                    size=C['bounce_size'][0] * MM, size_y=C['bounce_size'][1] * MM)
    flag_light(bnc, C['bounce_color'], front=C['key_fall'])       # the fill is flagged off the console front too
    S['bounce'] = bnc
    # low card in front of / below the console (what a pale floor does): a soft sheen sweep on the walnut front,
    # strongest top right, gone at the bottom of the frame.  Linked to the console only.
    cf = C['console_front']
    card = add_light('card', 'AREA', (620, cf - 1500, -430), (120, cf, -110), C['card_power'], 'card', None,
                     shape='RECTANGLE', size=1.5, size_y=0.55, color=(1.0, 0.95, 0.88))
    link_receivers(card, S['console'], 'recv_card')
    # side reflector (fill group): a soft card on the far left, 60 deg off the wall's normal, flagged off everything
    # but the wall: it opens up the row's shadow on the wall (otherwise a murky khaki block) without adding fill to
    # the spine faces, so the key keeps modelling the grain and the blocked titles.
    if C['side_power'] > 0:
        side = add_light('side', 'AREA', C['side_pos'], C['side_aim'], C['side_power'], 'bounce', None,
                         shape='RECTANGLE', size=C['side_size'][0] * MM, size_y=C['side_size'][1] * MM,
                         color=tuple(C['side_color']))
        link_receivers(side, [S['wall']], 'recv_side')
    # board card (fill group): a small card square to the left board of Sözler, the one cover the camera sees (at
    # 82 deg): the board reads as the shadow side of the same leather, not as a grey card.  Linked to that volume.
    if C['board_power'] > 0:
        bc = S['books']['Sözler']['M'] @ Vector((0, 0.09, 0.125))
        bt = Vector((bc.x / MM, bc.y / MM, bc.z / MM))
        brd = add_light('board', 'AREA', bt + sph(C['board_az'], C['board_el']) * C['board_dist'], bt, C['board_power'],
                        'bounce', None, shape='RECTANGLE', size=C['board_size'][0] * MM, size_y=C['board_size'][1] * MM,
                        color=tuple(C['board_color']))
        link_receivers(brd, S['books']['Sözler']['objs'], 'recv_board')
    # accent: warm, narrow soft spot raking the Sözler volume from the front right (light-linked to that book)
    soz = S['books']['Sözler']
    c = S['sozler_focus']
    acc_dir = sph(-35.0, 20.0)
    loc = Vector((c.x / MM, c.y / MM, 122)) + acc_dir * 2400
    acc = add_light('accent', 'SPOT', loc, (c.x / MM, c.y / MM, 122), C['accent_power'], 'accent', C['accent_temp'],
                    spot_size=math.radians(C['accent_cone']), spot_blend=0.9, shadow_soft_size=0.07)
    link_receivers(acc, soz['objs'], 'recv_sozler')
    S['accent'] = acc
    # warm soft spot on the Qur'an from the front, above and right (same side as the key, ~40 deg off the cover's
    # normal, so the embossing keeps its relief), no wider than the book.  Linked to the Qur'an and its stand ONLY:
    # it lifts the book and leaves no pool of light and no second, harder shadow on the wall (the wall keeps the
    # key's single soft shadow)
    m = S['medallion_world']
    ql = add_light('quran', 'SPOT', (m.x / MM + 620, m.y / MM - 960, m.z / MM + 860), (m.x / MM, m.y / MM, m.z / MM),
                   C['quran_power'], 'quran', C['quran_temp'], spot_size=math.radians(C['quran_cone']), spot_blend=0.85,
                   shadow_soft_size=0.09)
    link_receivers(ql, S['quran']['objs'] + S['stand'], 'recv_quran')
    S['quran_light'] = ql
    return S


def build_camera(S):
    sc = bpy.context.scene
    cd = bpy.data.cameras.new('kamera')
    cam = bpy.data.objects.new('kamera', cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    cd.lens = C['lens']
    cd.sensor_fit = 'VERTICAL'
    cd.sensor_height = 36.0
    cd.sensor_width = 36.0
    cd.clip_start, cd.clip_end = 0.2, 20
    S['cam'] = cam
    S['pivot'] = Vector((0, S['y_spine'] * MM, 0.12))
    place_camera(S, C['cam_dist'])
    if int(C['autoframe']):
        autoframe(S)
    # depth of field: f/11, the focal plane between the Sözler spine and the Qur'an's cover (both stay under ~1 px)
    axis = np.array(cam.matrix_world.to_3x3() @ Vector((0, 0, -1)))
    d_soz = float((np.array(S['sozler_focus']) - np.array(cam.location)) @ axis)
    S['focus_distance'] = d_soz + C['focus_back'] * MM
    cd.dof.use_dof = not ARGS.no_dof
    cd.dof.focus_object = None
    cd.dof.focus_distance = S['focus_distance']
    cd.dof.aperture_fstop = C['fstop']
    cd.dof.aperture_blades = 9
    return S


def place_camera(S, dist):
    """The camera stands cam_az degrees to the left of the row's normal but is turned only cam_yaw degrees: the
    off-axis view comes from the lens shift, so horizontals stay level (view-camera style)."""
    cam = S['cam']
    az, yaw, pitch = math.radians(C['cam_az']), math.radians(C['cam_yaw']), math.radians(C['cam_pitch'])
    p = S['pivot']
    cam.location = Vector((p.x - math.sin(az) * dist * MM, p.y - math.cos(az) * dist * MM, C['cam_height'] * MM))
    # looks along +y rotated by yaw (towards +x), pitched down
    cam.rotation_euler = (math.radians(90) - pitch, 0, -yaw)
    bpy.context.view_layer.update()


def project(S, pts, w=1.0, h=1.0):
    """World points (n,3) -> image coords (x right, y down), in units of w x h."""
    sc = bpy.context.scene
    cam = S['cam']
    dg = bpy.context.evaluated_depsgraph_get()
    rx, ry = sc.render.resolution_x, sc.render.resolution_y
    Pm = np.array(cam.calc_matrix_camera(dg, x=rx, y=ry))
    Vm = np.array(cam.matrix_world.inverted())
    pts = np.asarray(pts, float).reshape(-1, 3)
    hom = np.concatenate([pts, np.ones((len(pts), 1))], 1) @ (Pm @ Vm).T
    ndc = hom[:, :2] / hom[:, 3:4]
    return np.stack([(ndc[:, 0] * 0.5 + 0.5) * w, (1 - (ndc[:, 1] * 0.5 + 0.5)) * h], -1)


def autoframe(S):
    """Solve camera distance and lens shift so that the medallion and the row centre land on the requested rows and
    the row (its whole silhouette) is centred on the requested column."""
    cam = S['cam']
    med = np.array(S['medallion_world'])
    rowc = np.array([0.0, S['pivot'].y, 0.120])
    pts = np.concatenate([mesh_world_points(b['objs'][0], 7) for b in S['books'].values()])
    dist = C['cam_dist']
    for _ in range(14):
        place_camera(S, dist)
        ym, yr = project(S, [med])[0, 1], project(S, [rowc])[0, 1]
        span = yr - ym
        want = C['frame_row_y'] - C['frame_medallion_y']
        dist *= span / want
        place_camera(S, dist)
        yr = project(S, [rowc])[0, 1]
        # lens shift is in units of the fit (vertical) dimension; +shift_y moves the frame up
        cam.data.shift_y -= (yr - C['frame_row_y'])
        px = project(S, pts)[:, 0]
        cam.data.shift_x += ((px.min() + px.max()) / 2 - C['frame_x']) * 9 / 16
        bpy.context.view_layer.update()
    C['cam_dist_solved'] = dist


def mesh_world_points(ob, step=1):
    me = ob.data
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)[::step]
    M = np.array(ob.matrix_world)
    return co @ M[:3, :3].T + M[:3, 3]


def positions_report(S):
    """Pixel positions of the important things, in the 1080 x 1920 delivery frame."""
    W, H = 1080, 1920
    out = {}
    med = project(S, [np.array(S['medallion_world'])], W, H)[0]
    out['quran_medallion_centre'] = [round(float(med[0]), 1), round(float(med[1]), 1)]

    def bbox(pts):
        p = project(S, pts, W, H)
        return [round(float(p[:, 0].min())), round(float(p[:, 1].min())), round(float(p[:, 0].max())),
                round(float(p[:, 1].max()))]
    out['quran_bbox'] = bbox(np.concatenate([mesh_world_points(o) for o in S['quran']['objs']]))
    out['row_bbox'] = bbox(np.concatenate([mesh_world_points(b['objs'][0], 7) for b in S['books'].values()]))
    out['spines'] = {}
    for name, b in S['books'].items():
        sp = b['info']['spine_pts']
        loc = np.array([[x * MM, y * MM, z * MM] for x, y in sp[[0, len(sp) // 2, -1]] for z in (0, SIRT_BOYU)])
        M = np.array(b['M'])
        out['spines'][name] = bbox(loc @ M[:3, :3].T + M[:3, 3])
    out['sozler_spine_bbox'] = out['spines']['Sözler']
    out['sozler_volume_bbox'] = bbox(mesh_world_points(S['books']['Sözler']['objs'][0], 3))
    out['shelf_bbox'] = bbox(mesh_world_points(S['shelf']))
    out['quran_stand_bbox'] = bbox(np.concatenate([mesh_world_points(o) for o in S['stand'][:3]]))
    cf, sl, ov, dg, dh = (C[k] for k in ('console_front', 'slab', 'slab_over', 'drawer_gap', 'drawer_h'))

    def hline(y_mm, z_mm):
        """Image y of a horizontal line (world y, z) at the left border, the centre and the right border of the frame."""
        ce = project(S, [[-0.25, y_mm * MM, z_mm * MM], [0.25, y_mm * MM, z_mm * MM]], W, H)
        k = (ce[1, 1] - ce[0, 1]) / (ce[1, 0] - ce[0, 0])
        return [round(float(ce[0, 1] + k * (x - ce[0, 0])), 1) for x in (0, W / 2, W)]
    edge = hline(cf - ov, 0.0)
    out['console_top_front_edge_y'] = edge                      # top arris of the slab: left border, centre, right border
    out['console_edge_slope_deg'] = round(math.degrees(math.atan2(edge[2] - edge[0], W)), 3)
    out['console_slab_bottom_y'] = hline(cf - ov, -sl)
    out['drawer1_top_y'] = hline(cf, -sl - dg)
    out['drawer1_bottom_y'] = hline(cf, -sl - dg - dh)
    out['drawer2_top_y'] = hline(cf, -sl - dg - dh - dg)
    out['shelf_front_centre_x'] = round(float(project(S, [np.array(S['shelf'].matrix_world.translation) +
                                                         np.array([0, C['shelf'][2] * MM, C['shelf'][3] * MM])], W, H)[0, 0]), 1)
    rb = out['row_bbox']
    out['row_centre_x'] = round((rb[0] + rb[2]) / 2, 1)
    out['upper_dx_mm'] = S.get('upper_dx_mm')
    cam = S['cam']
    out['camera'] = dict(lens_mm=C['lens'], sensor='36 mm (vertical) x 20.25 mm', fstop=C['fstop'],
                         location_m=[round(v, 4) for v in cam.location], stands_deg_left_of_normal=C['cam_az'],
                         yaw_deg=C['cam_yaw'], pitch_deg=C['cam_pitch'],
                         shift=[round(cam.data.shift_x, 4), round(cam.data.shift_y, 4)],
                         focus_distance_m=round(S['focus_distance'], 4),
                         sozler_spine_distance_m=round(S['focus_distance'] - C['focus_back'] * MM, 4))
    out['titles'] = {n: b['meta'] for n, b in S['books'].items()}
    return out


def build_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    os.makedirs(GEN, exist_ok=True)
    ensure_font()
    S = {}
    build_books(S)
    build_room(S)
    build_quran(S)
    setup_render()
    build_camera(S)
    centre_upper(S)
    build_lights(S)
    return S


# ==============================================================================================
# 5. render + compositor (denoised light groups -> EXR)
# ==============================================================================================
def setup_render():
    sc = bpy.context.scene
    w, h = (int(v) for v in ARGS.res.lower().split('x'))
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
    sc.render.engine = 'CYCLES'
    cy = sc.cycles
    cy.device = 'CPU'
    sc.render.threads_mode = 'FIXED'
    sc.render.threads = max(1, min(3, ARGS.threads))
    cy.samples = ARGS.samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = C['adaptive']
    cy.adaptive_min_samples = min(ARGS.samples, 64)
    cy.max_bounces = int(C['bounces'])
    cy.diffuse_bounces = 4
    cy.glossy_bounces = 4
    cy.transmission_bounces = 0
    cy.volume_bounces = 0
    cy.sample_clamp_indirect = C['clamp_indirect']
    cy.sample_clamp_direct = 0.0
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.blur_glossy = 0.6
    cy.use_light_tree = True
    cy.seed = int(C['seed'])
    if ARGS.time_limit > 0:
        cy.time_limit = ARGS.time_limit
    cy.pixel_filter_type = 'BLACKMAN_HARRIS'
    cy.filter_width = 1.5
    cy.use_denoising = False
    sc.render.use_persistent_data = False
    sc.render.film_transparent = False
    sc.render.dither_intensity = 0.0
    vs = sc.view_settings
    vs.view_transform = 'AgX'
    vs.look = C['look']
    vs.exposure = C['exposure']
    vs.gamma = 1.0
    sc.display_settings.display_device = 'sRGB'
    vl = sc.view_layers[0]
    vl.cycles.denoising_store_passes = True
    vl.use_pass_mist = True
    vl.use_pass_z = True
    a = vl.aovs.add()
    a.name = 'masks'
    a.type = 'COLOR'
    if int(C['clay']):
        vl.material_override = bpy.data.materials.new('clay')
    if ARGS.crop:
        x0, y0, x1, y1 = (float(v) for v in ARGS.crop.split(','))
        sc.render.use_border = True
        sc.render.use_crop_to_border = True
        sc.render.border_min_x, sc.render.border_max_x = x0, x1
        sc.render.border_min_y, sc.render.border_max_y = 1 - y1, 1 - y0


def setup_mist(S):
    sc = bpy.context.scene
    cam = np.array(S['cam'].location)
    near = float(np.linalg.norm(np.array([0, C['console_front'] * MM, 0]) - cam)) - 0.25
    far = float(np.linalg.norm(np.array([0.0, 0.0, 0.3]) - cam)) + 0.15
    ms = sc.world.mist_settings
    ms.start, ms.depth, ms.falloff = near, far - near, 'LINEAR'
    S['depth_range'] = (near, far)


def render(S, raw_dir):
    sc = bpy.context.scene
    os.makedirs(raw_dir, exist_ok=True)
    sc.render.compositor_device = 'CPU'
    tree = bpy.data.node_groups.new('comp', 'CompositorNodeTree')
    sc.compositing_node_group = tree
    rl = tree.nodes.new('CompositorNodeRLayers')
    rl.scene = sc
    fo = tree.nodes.new('CompositorNodeOutputFile')
    fo.directory = raw_dir
    fo.file_name = 'raw_'
    if hasattr(fo.format, 'media_type'):
        fo.format.media_type = 'IMAGE'
    fo.format.file_format = 'OPEN_EXR'
    fo.format.color_depth = '32'
    fo.format.exr_codec = 'ZIP'

    def add(name, sock, denoise=False):
        fo.file_output_items.new('RGBA', name)
        if denoise:
            dn = tree.nodes.new('CompositorNodeDenoise')
            tree.links.new(sock, dn.inputs['Image'])
            tree.links.new(rl.outputs['Denoising Albedo'], dn.inputs['Albedo'])
            tree.links.new(rl.outputs['Denoising Normal'], dn.inputs['Normal'])
            sock = dn.outputs['Image']
        tree.links.new(sock, fo.inputs[name])
    for g in RENDER_GROUPS:
        add(g, rl.outputs[f'Combined_{g}'], not ARGS.no_denoise)
    add('combined', rl.outputs['Image'], not ARGS.no_denoise)
    add('noisy', rl.outputs['Image'], False)
    add('mist', rl.outputs['Mist'])
    add('masks', rl.outputs['masks'])
    tree.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    go = tree.nodes.new('NodeGroupOutput')
    tree.links.new(rl.outputs['Image'], go.inputs[0])
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = os.path.join(raw_dir, 'cycles_combined.png')
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    return time.time() - t0


# ==============================================================================================
# 6. post: plates
# ==============================================================================================
def load_exr(path):
    im = bpy.data.images.load(path)
    w, h = im.size
    a = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(a)
    bpy.data.images.remove(im)
    return a.reshape(h, w, 4)[::-1].copy()


def save_exr(path, rgb):
    """Scene-linear (Rec.709) half-float EXR."""
    sc = bpy.context.scene
    h, w = rgb.shape[:2]
    im = bpy.data.images.new('tmp_exr', w, h, alpha=False, float_buffer=True)
    buf = np.ones((h, w, 4), np.float32)
    buf[..., :3] = rgb
    im.pixels.foreach_set(buf[::-1].ravel())
    st = sc.render.image_settings
    old = (st.file_format, st.color_depth, st.color_mode)
    st.file_format, st.color_depth, st.color_mode, st.exr_codec = 'OPEN_EXR', '16', 'RGB', 'ZIP'
    im.save_render(path, scene=sc)   # EXR output is written scene-linear (no view transform)
    st.file_format = old[0]
    st.color_depth, st.color_mode = ('16' if old[0] == 'PNG' else old[1]), old[2]
    bpy.data.images.remove(im)


def view_transform(rgb, tmp):
    """Scene-linear float -> display-referred uint16 (H, W, 3) through Blender's own OCIO view (AgX + look)."""
    sc = bpy.context.scene
    h, w = rgb.shape[:2]
    im = bpy.data.images.new('tmp_vt', w, h, alpha=False, float_buffer=True)
    im.colorspace_settings.name = 'Linear Rec.709'
    buf = np.ones((h, w, 4), np.float32)
    buf[..., :3] = rgb
    im.pixels.foreach_set(buf[::-1].ravel())
    st = sc.render.image_settings
    st.file_format, st.color_depth, st.color_mode, st.compression = 'PNG', '16', 'RGB', 15
    im.save_render(tmp, scene=sc)
    bpy.data.images.remove(im)
    im = bpy.data.images.load(tmp)
    im.colorspace_settings.name = 'Non-Color'
    a = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(a)
    bpy.data.images.remove(im)
    a = a.reshape(h, w, 4)[::-1, :, :3]
    return np.clip(print_grade(a) * 65535 + 0.5, 0, 65535).astype(np.uint16)


def print_grade(srgb):
    """Display-referred finishing after AgX: lift the white point (x gain in display-linear) with a soft shoulder,
    the way a print / camera JPEG curve places paper white.  Part of the view transform (baked into the LUT)."""
    g, k = C['print_gain'], C['print_knee']
    if abs(g - 1.0) < 1e-6:
        return srgb
    y = srgb2lin(srgb) * g
    y = np.where(y <= k, y, k + (1 - k) * np.tanh((y - k) / (1 - k)))
    return lin2srgb(y).astype(np.float32)


LUT_N, LUT_LMIN, LUT_STOPS = 97, 2.0 ** -14, 20.0


def bake_lut(path, tmp):
    """3D LUT of the view transform: index = log2(L / LMIN + 1) / STOPS * (N - 1) per channel; values sRGB 0..1."""
    n = LUT_N
    s = np.linspace(0, 1, n)
    L = LUT_LMIN * (2.0 ** (LUT_STOPS * s) - 1)
    r, g, b = np.meshgrid(L, L, L, indexing='ij')
    img = np.stack([r, g, b], -1).reshape(n * n, n, 3).astype(np.float32)
    sc = bpy.context.scene
    ex = sc.view_settings.exposure
    sc.view_settings.exposure = 0.0
    out = view_transform(img, tmp).astype(np.float32) / 65535
    sc.view_settings.exposure = ex
    np.save(path, out.reshape(n, n, n, 3).astype(np.float32))


def post(S, raw_dir, out_dir, render_s):
    sc = bpy.context.scene
    os.makedirs(out_dir, exist_ok=True)
    lin_dir = os.path.join(out_dir, 'linear')
    os.makedirs(lin_dir, exist_ok=True)
    tmp = os.path.join(raw_dir, '_vt.png')
    raw = {g: np.maximum(load_exr(os.path.join(raw_dir, f'raw_{g}.exr'))[..., :3], 0) for g in RENDER_GROUPS}
    L = {g: sum(raw[r] for r in MERGE[g]) for g in LIGHT_GROUPS}
    del raw
    beauty = sum(L.values())
    comb = load_exr(os.path.join(raw_dir, 'raw_combined.exr'))[..., :3]
    stats = dict(render_seconds=round(render_s, 1), samples=ARGS.samples, res=ARGS.res,
                 sum_vs_denoised_combined_mean_abs=float(np.abs(beauty - comb).mean()),
                 linear_max={g: float(v.max()) for g, v in L.items()})
    # beauty
    b16 = view_transform(beauty, tmp)
    save_png16(os.path.join(out_dir, 'beauty.png'), b16)
    save_exr(os.path.join(lin_dir, 'beauty.exr'), beauty)
    im8 = Image.fromarray((b16 >> 8).astype(np.uint8))
    if not ARGS.crop:
        im8.resize((1080, 1920), Image.LANCZOS).save(os.path.join(out_dir, 'preview_1080.jpg'), quality=95,
                                                      subsampling=0)
    else:
        im8.save(os.path.join(out_dir, 'preview_crop.png'))
    # light passes: display-referred (same view transform), scene-linear EXR, scene-linear 16-bit PNG (value/8)
    for g, v in L.items():
        save_png16(os.path.join(out_dir, f'light_{g}.png'), view_transform(v, tmp))
        save_exr(os.path.join(lin_dir, f'light_{g}.exr'), v)
        save_png16(os.path.join(lin_dir, f'light_{g}_lin16.png'),
                   np.clip(v / 8.0 * 65535 + 0.5, 0, 65535).astype(np.uint16))
    # depth (mist: linear in camera distance between near and far) and masks
    mist = load_exr(os.path.join(raw_dir, 'raw_mist.exr'))[..., 0]
    save_png16(os.path.join(out_dir, 'depth.png'), np.clip(mist * 65535 + 0.5, 0, 65535).astype(np.uint16))
    masks = np.clip(load_exr(os.path.join(raw_dir, 'raw_masks.exr'))[..., :3], 0, 1)
    for i, nm in enumerate(['mask_sozler', 'mask_quran', 'mask_books']):
        save_png16(os.path.join(out_dir, f'{nm}.png'), (masks[..., i] * 65535 + 0.5).astype(np.uint16))
    bake_lut(os.path.join(lin_dir, 'view_lut.npy'), tmp)
    # a ready-made "lights off" state (fill + key only) for simple cross-fades in 2D, and a LUT self-check
    base = L['fill'] + L['key']
    save_png16(os.path.join(out_dir, 'state_base.png'), view_transform(base, tmp))
    try:
        sys.path.insert(0, HERE)
        import recombine
        via_lut = recombine.apply_view(beauty, lut_path=os.path.join(lin_dir, 'view_lut.npy'))
        d = np.abs(via_lut.astype(np.int32) - b16.astype(np.int32)) / 257.0
        stats['lut_vs_ocio_8bit_levels'] = dict(mean=float(d.mean()), p999=float(np.percentile(d, 99.9)), max=float(d.max()))
    except Exception as e:      # pragma: no cover
        stats['lut_check_error'] = repr(e)
    pos = positions_report(S)
    # calm, dark, straight-grained walnut of the upper drawer front; Shorts-safe (bottom 14 % and right 12 % stay free)
    pos['suggested_text_block'] = [140, int(math.ceil(max(pos['drawer1_top_y']) + 14)), 940,
                                   int(min(1650, math.floor(min(pos['drawer1_bottom_y']) - 14)))]
    meta = dict(stats=stats, positions_1080x1920=pos, depth_range_m=S.get('depth_range'),
                view=dict(transform='AgX', look=C['look'], exposure=C['exposure'], display='sRGB',
                          print_gain=C['print_gain'], print_knee=C['print_knee']),
                lut=dict(n=LUT_N, lmin=LUT_LMIN, stops=LUT_STOPS), lin16_scale=8.0, config={k: v for k, v in C.items()})
    with open(os.path.join(out_dir, 'plate_meta.json'), 'w') as f:
        json.dump(meta, f, indent=1, ensure_ascii=False, default=lambda o: list(o) if isinstance(o, tuple) else str(o))
    return stats


# ==============================================================================================
def main():
    global ARGS
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--res', default='1350x2400')
    ap.add_argument('--samples', type=int, default=480)
    ap.add_argument('--out', default=os.path.join(HERE, 'plates'))
    ap.add_argument('--threads', type=int, default=3)
    ap.add_argument('--set', action='append', default=[], help='override a look-dev key: --set key=value')
    ap.add_argument('--crop', default='', help='x0,y0,x1,y1 (fractions, y down): render only this window')
    ap.add_argument('--regen', action='store_true', help='regenerate the cached procedural textures')
    ap.add_argument('--no-dof', action='store_true')
    ap.add_argument('--no-denoise', action='store_true')
    ap.add_argument('--report-only', action='store_true', help='build, print the frame positions, do not render')
    ap.add_argument('--blend', default='', help='also save the scene as a .blend')
    ap.add_argument('--time-limit', type=float, default=0.0, help='stop sampling after this many seconds (0 = off)')
    ap.add_argument('--keep-raw', action='store_true', help='keep the 32-bit compositor EXRs in <out>/_raw')
    ARGS = ap.parse_args(sys.argv[1:])
    for kv in ARGS.set:
        k, v = kv.split('=', 1)
        if k not in C:
            raise SystemExit(f'unknown key {k}')
        old = C[k]
        if isinstance(old, tuple):
            C[k] = tuple(float(x) for x in v.split(','))
        elif isinstance(old, int):
            C[k] = int(float(v))
        elif isinstance(old, float):
            C[k] = float(v)
        else:
            C[k] = v
    t0 = time.time()
    S = build_scene()
    setup_mist(S)
    rep = positions_report(S)
    print('BUILD %.1fs' % (time.time() - t0))
    print(json.dumps({k: rep[k] for k in ('quran_medallion_centre', 'quran_bbox', 'quran_stand_bbox', 'row_bbox', 'row_centre_x',
                                          'sozler_spine_bbox', 'shelf_bbox', 'shelf_front_centre_x', 'upper_dx_mm',
                                          'console_top_front_edge_y', 'console_edge_slope_deg', 'console_slab_bottom_y',
                                          'drawer1_top_y', 'drawer1_bottom_y', 'drawer2_top_y', 'camera')},
                     ensure_ascii=False))
    if ARGS.blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(ARGS.blend))
    if ARGS.report_only:
        return
    out = os.path.abspath(ARGS.out)
    raw = os.path.join(out, '_raw')
    rs = render(S, raw)
    print('RENDER %.1fs' % rs)
    st = post(S, raw, out, rs)
    if not ARGS.keep_raw:
        import shutil
        shutil.rmtree(raw, ignore_errors=True)
    print('POST done', json.dumps(st))


if __name__ == '__main__':
    main()
