#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_scene.py  --  Risale-i Nur end card (1080x1920, 30 fps, 150 frames)

One file, two roles:
  * run with the system python3 (Pillow + numpy): generates every texture into ./tex
  * run inside Blender (blender -b -P build_scene.py): (re)generates the textures by
    calling itself with python3, then builds the whole scene procedurally and saves
    ./scene.blend

    blender -b -P build_scene.py                 # textures + scene
    blender -b -P build_scene.py -- --skip-tex   # scene only (reuse ./tex)
"""
import math
import os
import sys
import subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(ROOT, 'tex')
FONTS = os.path.normpath(os.path.join(ROOT, '..', 'engine', 'fonts'))
F_EBG_SB = os.path.join(FONTS, 'SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-NfNUAw.ttf')   # EB Garamond SemiBold
F_EBG_M = os.path.join(FONTS, 'SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-2fRUAw.ttf')    # EB Garamond Medium
F_EBG_I = os.path.join(FONTS, 'SlGFmQSNjdsmc35JDF1K5GRwUjcdlttVFm-rI7eOQI96.ttf')  # EB Garamond Medium Italic
F_CSC_SB = os.path.join(FONTS, '0ybmGD4kxqXBmOVLG30OGwsmdBQU_Q.ttf')               # Cormorant SC SemiBold
F_AMIRI_B = os.path.join(FONTS, 'J7acnpd8CGxBHp2VkZY4.ttf')                       # Amiri Bold

# --------------------------------------------------------------------------------------
# shared constants (used by both the texture generator and the Blender builder)
# --------------------------------------------------------------------------------------
BOOK_H = 0.240          # m
BOOK_D = 0.170          # m (spine apex -> fore-edge of boards)
BOARD = 0.0028          # board + leather thickness
SQUARE = 0.0025         # board overhang around page block
BANDS_MM = [26.0, 58.0, 164.0, 196.0]   # raised band centres, mm from head
BAND_HW = 2.6           # band half width (mm)
BAND_HT = 1.15          # band height (mm)

# (title as printed on the spine, thickness ratio, horizontal title lines or None=rotated)
BOOKS = [
    ("Sözler", 0.1869, ["Sözler"]),
    ("Mektubat", 0.131, None),
    ("Lem’alar", 0.115, None),
    ("Şuâlar", 0.1582, ["Şuâlar"]),
    ("Mesnevî-i Nûriye", 0.0724, None),
    ("İşârâtü’l-İ’câz", 0.0844, None),
    ("Barla Lâhikası", 0.1003, None),
    ("Kastamonu Lâhikası", 0.0751, None),
    ("Emirdağ Lâhikası", 0.1097, None),
    ("Sikke-i Tasdîk-i Gaybî", 0.0644, None),
    ("Tarihçe-i Hayat", 0.1489, ["Tarihçe-i", "Hayat"]),
    ("Asâ-yı Mûsâ", 0.0878, None),
    ("İman ve Küfür Muvâzeneleri", 0.0692, None),
    ("Muhâkemat", 0.0614, None),
]
MEKTUBAT_INDEX = 1
MEKTUBAT_PULL = 0.024   # m pulled out of the row
ROW_ANGLE = 8.0         # deg, right end of the row recedes

# set / staging
STEP_H = 0.255          # raised walnut step behind the row (book tops at 0.240)
RAHLE_LOC = (0.035, 0.455)
RAHLE_YAW = -20.0
RAHLE_TINT = (0.92, 0.93, 0.95, 1.0)

# camera (motorised slider: lateral + push-in + slight rise)
CAM_LENS = 64.0
CAM_FSTOP = 5.0
CAM_TARGET = (-0.010, 0.250, 0.440)
CAM_P0 = (-0.050, -1.980, 0.600)
CAM_P1 = (0.010, -1.915, 0.620)

# lights (W, K, positions)
WORLD_STRENGTH = 0.05
KEY_LOC, KEY_W, KEY_K = (-0.88, -1.08, 0.80), 90.0, 4600
FILL_LOC, FILL_W = (1.10, -0.90, 0.50), 18.0
KICK_LOC, KICK_W = (-0.55, -0.80, 0.30), 1.2
CARD_W, HOT_W = 5.0, 6.0
QK_LOC, QK_W = (-0.85, 0.20, 0.80), 24.0
MCARD_W = 3.5
WG_LOC, WG_W = (-0.90, 0.40, 1.00), 5.0
SUN_W, SUN_DIR = 9.0, (0.62, 0.62, -0.26)
GOBO_OPEN = (-0.17, 0.10, 0.62, 0.92)
WALL_Y = 0.80
VIEW_EXPOSURE = -1.45
RENDER_SPP = 9
WB_TEMP = 5200.0

# Mushaf (Kur'an-ı Kerim)
MUSHAF_H, MUSHAF_D, MUSHAF_T = 0.250, 0.178, 0.046

# Rahle (X stand) leaf geometry (local: X across width, Y along leaf, crossing at Y=0)
RAHLE_W = 0.205
RAHLE_LEG = 0.175
RAHLE_ARM = 0.150
RAHLE_E = 0.0062        # curve extrude (half thickness without bevel) -> 16 mm boards
RAHLE_BEV = 0.0018
RAHLE_PHI = math.radians(33.0)   # each leaf's inclination from vertical


def book_T(ratio):
    return ratio * 0.240


def spine_profile(T, n=44):
    """Cross-section of the rounded spine (x across, y toward the back; apex at y=-b).
    Returns points, cumulative arc length, sagitta."""
    w = T - 0.0008
    b = min(0.0040, 0.10 * T + 0.0006)
    pts = []
    for i in range(n + 1):
        u = i / n
        s = -math.cos(math.pi * u)          # cosine spacing: dense near the joints
        x = s * w / 2
        a = abs(s)
        y = -b * (1 - a * a)
        if a > 0.93:
            y += 0.0032 * ((a - 0.93) / 0.07) ** 2
        pts.append((x, y))
    L = [0.0]
    for i in range(1, len(pts)):
        L.append(L[-1] + math.dist(pts[i], pts[i - 1]))
    return pts, L, b


def spine_content_range_mm(T):
    pts, L, b = spine_profile(T)
    w = T - 0.0008
    for i, (x, y) in enumerate(pts):
        if abs(2 * x / w) < 0.93:
            first = i
            break
    xl = L[first] * 1000 + 0.6
    xr = L[-1] * 1000 - xl
    return xl, xr, L[-1] * 1000


def pointed_arch(cx, by, a, h, n=24):
    """Points of a pointed (two-centred) arch from left base to right base over the apex."""
    c = max((h * h - a * a) / (2 * a), 0.0)
    R = a + c
    pts = []
    for k in range(n + 1):
        x = -a + 2 * a * k / n
        y = math.sqrt(max(R * R - (abs(x) + c) ** 2, 0.0))
        pts.append((cx + x, by + y))
    return pts


def rahle_crown(r):
    """height of the leaf's top edge above its shoulder line: a deep ogee dip in the middle
    (so the front arm frames the Mushaf's semse instead of hiding it), small cusps, high
    rounded shoulders"""
    hw = RAHLE_W / 2
    t = min(r / (0.80 * hw), 1.0)
    y = -0.046 + 0.058 * (t * t * (3 - 2 * t))
    y += 0.0030 * math.exp(-((r - 0.42 * hw) / 0.006) ** 2)
    y += 0.0024 * math.exp(-((r - 0.64 * hw) / 0.005) ** 2)
    if r > hw - 0.012:
        d = r - (hw - 0.012)
        y -= 0.012 - math.sqrt(max(0.012 ** 2 - d * d, 0.0))
    return y


def rahle_leaf_shape():
    """Outer outline + holes of one rahle leaf (metres, local coords, crossing at Y=0)."""
    hw = RAHLE_W / 2
    Lg, La = RAHLE_LEG, RAHLE_ARM
    outer = [(-hw, -Lg)]
    # arched notch between the feet
    for (x, y) in pointed_arch(0.0, -Lg, 0.048, 0.044, 28):
        outer.append((x, y))
    outer.append((hw, -Lg))
    # right side with a small cyma waist near the crossing
    for k in range(1, 18):
        t = k / 18
        y = -Lg + (Lg + La - 0.028) * t
        waist = 0.004 * math.exp(-((y + 0.0) / 0.03) ** 2)
        outer.append((hw - waist, y))
    # crown (pointed ogee) from right to left
    y0 = La - 0.028
    nc = 90
    for k in range(nc + 1):
        x = hw - RAHLE_W * k / nc
        y = y0 + rahle_crown(abs(x))
        outer.append((x, y))
    for k in range(17, 0, -1):
        t = k / 18
        y = -Lg + (Lg + La - 0.028) * t
        waist = 0.004 * math.exp(-((y + 0.0) / 0.03) ** 2)
        outer.append((-hw + waist, y))
    holes = []
    # arm: openwork eight-pointed star with a crown of drilled pearls above it
    cy = 0.038
    star = []
    for k in range(16):
        ang = math.pi / 2 + k * math.pi / 8
        r = 0.0190 if k % 2 == 0 else 0.0118
        star.append((r * math.cos(ang), cy + r * math.sin(ang)))
    holes.append(star)
    for k in range(5):
        ang = math.radians(30 + 30 * k)
        px, py = 0.029 * math.cos(ang), cy + 0.029 * math.sin(ang)
        holes.append([(px + 0.0030 * math.cos(2 * math.pi * j / 20), py + 0.0030 * math.sin(2 * math.pi * j / 20))
                      for j in range(20)])
    # leg: tall mihrab window flanked by two narrow lancets
    def lancet(cx_, by_, a_, hs_, ha_):
        pts_ = [(cx_ - a_, by_), (cx_ + a_, by_), (cx_ + a_, by_ + hs_)]
        arch_ = pointed_arch(cx_, by_ + hs_, a_, ha_, 26)
        pts_ += list(reversed(arch_))[1:-1]
        pts_ += [(cx_ - a_, by_ + hs_)]
        return pts_
    by = -Lg + 0.053
    holes.append(lancet(0.0, by, 0.028, 0.030, 0.044))
    for sx in (-1, 1):
        holes.append(lancet(sx * 0.058, by + 0.010, 0.0085, 0.026, 0.018))
    # small star above the mihrab
    cy2 = by + 0.030 + 0.044 + 0.020
    s2 = []
    for k in range(16):
        ang = math.pi / 2 + k * math.pi / 8
        r = 0.0105 if k % 2 == 0 else 0.0066
        s2.append((r * math.cos(ang), cy2 + r * math.sin(ang)))
    holes.append(s2)
    return outer, holes


# ======================================================================================
# TEXTURES  (system python3 with Pillow + numpy)
# ======================================================================================
def gen_textures():
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont, ImageFilter

    os.makedirs(TEX, exist_ok=True)
    rng = np.random.default_rng(1907)

    # ---------------------------------------------------------------- helpers
    def text_block(lines, font_path, size_px, gap=1.13, lang='tr', direction=None):
        f = ImageFont.truetype(font_path, max(6, int(round(size_px))))
        lh = size_px * gap
        wmax = max(f.getlength(l) for l in lines)
        Wb = int(wmax + size_px * 2)
        Hb = int(lh * len(lines) + size_px * 2)
        im = Image.new('L', (Wb, Hb), 0)
        d = ImageDraw.Draw(im)
        for k, l in enumerate(lines):
            kw = dict(font=f, fill=255, anchor='ms', language=lang)
            if direction:
                kw['direction'] = direction
            d.text((Wb / 2, size_px * 1.05 + k * lh + size_px * 0.75), l, **kw)
        bb = im.getbbox()
        return im.crop(bb)

    def fit_block(lines, font_path, size_px, max_w, max_h, rotate=False, **kw):
        for _ in range(6):
            blk = text_block(lines, font_path, size_px, **kw)
            if rotate:
                blk = blk.transpose(Image.Transpose.ROTATE_270)
            w, h = blk.size
            sc = min(1.0, max_w / w, max_h / h)
            if sc >= 0.999:
                return blk, size_px
            size_px *= sc * 0.985
        return blk, size_px

    def paste_center(dst, blk, cx, cy, value=255):
        x0 = int(round(cx - blk.size[0] / 2))
        y0 = int(round(cy - blk.size[1] / 2))
        solid = Image.new('L', blk.size, value)
        dst.paste(solid, (x0, y0), blk)

    def star_poly(cx, cy, r1, r2, n=8, rot=-math.pi / 2):
        pts = []
        for k in range(2 * n):
            ang = rot + k * math.pi / n
            r = r1 if k % 2 == 0 else r2
            pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
        return pts

    def value_noise(Hh, Ww, cells_y, cells_x, octaves, pers=0.5, seed=0):
        r = np.random.default_rng(seed)
        acc = np.zeros((Hh, Ww), np.float32)
        amp, tot = 1.0, 0.0
        for o in range(octaves):
            gy = int(cells_y * 2 ** o) + 3
            gx = int(cells_x * 2 ** o) + 3
            g = r.random((gy, gx)).astype(np.float32)
            up = np.asarray(Image.fromarray(g, 'F').resize((Ww, Hh), Image.BICUBIC))
            acc += amp * up
            tot += amp
            amp *= pers
        return acc / tot

    def gblur(arr, sigma):
        try:
            from scipy.ndimage import gaussian_filter
            return gaussian_filter(arr.astype(np.float32), sigma, mode='nearest')
        except ImportError:
            # fallback: blur a 16-bit quantised copy with Pillow
            lo, hi = float(arr.min()), float(arr.max())
            q = ((arr - lo) / max(hi - lo, 1e-9) * 65535).astype(np.int32)
            im = Image.fromarray(q, 'I').filter(ImageFilter.GaussianBlur(sigma))
            return np.asarray(im).astype(np.float32) / 65535 * (hi - lo) + lo

    # ---------------------------------------------------------------- spines
    PPM = 2560 / 240.0
    SS = 2
    S = PPM * SS

    # uniform title size per group (single-line / two-line horizontal titles)
    group_size = {}
    for (title, ratio, hlines) in BOOKS:
        if not hlines:
            continue
        xl, xr, _ = spine_content_range_mm(book_T(ratio))
        inner_w = (xr - xl - 1.0) - 1.8
        f = ImageFont.truetype(F_EBG_SB, 400)
        wpx = max(f.getbbox(l, language='tr')[2] - f.getbbox(l, language='tr')[0] for l in hlines)
        size_mm = 400 / S * (inner_w * S / wpx)
        key = len(hlines)
        group_size[key] = min(group_size.get(key, 99.0), size_mm, 10.0 if key == 1 else 8.4)
    print('title sizes (mm):', group_size)

    for idx, (title, ratio, hlines) in enumerate(BOOKS):
        T = book_T(ratio)
        xl, xr, Wmm = spine_content_range_mm(T)
        Wp = int(math.ceil(Wmm * PPM))
        Hp = int(round(240 * PPM))
        W2, H2 = Wp * SS, Hp * SS
        gold = Image.new('L', (W2, H2), 0)
        blind = Image.new('L', (W2, H2), 0)
        g = ImageDraw.Draw(gold)
        bl = ImageDraw.Draw(blind)
        cx = (xl + xr) / 2
        cw = xr - xl

        def P(v):
            return v * S

        def hrule(t, th, x0=None, x1=None, dr=g):
            x0 = xl if x0 is None else x0
            x1 = xr if x1 is None else x1
            dr.rectangle([P(x0), P(t - th / 2), P(x1), P(t + th / 2)], fill=255)

        def vrule(x, t0, t1, th, dr=g):
            dr.rectangle([P(x - th / 2), P(t0), P(x + th / 2), P(t1)], fill=255)

        def frame(x0, t0, x1, t1, th, dr=g):
            hrule(t0, th, x0, x1, dr)
            hrule(t1, th, x0, x1, dr)
            vrule(x0, t0 - th / 2, t1 + th / 2, th, dr)
            vrule(x1, t0 - th / 2, t1 + th / 2, th, dr)

        def dot(x, t, r, dr=g, v=255):
            dr.ellipse([P(x - r), P(t - r), P(x + r), P(t + r)], fill=v)

        def lozenge(x, t, hw_, hh, dr=g, v=255):
            dr.polygon([(P(x), P(t - hh)), (P(x + hw_), P(t)), (P(x), P(t + hh)), (P(x - hw_), P(t))], fill=v)

        def orn_row(t0, t1):
            hrule(t0, 0.32)
            hrule(t1, 0.32)
            tc = (t0 + t1) / 2
            hh = (t1 - t0) / 2 - 0.85
            p = 3.3
            n = max(1, int((cw - 1.2) / p))
            x0 = cx - (n - 1) * p / 2
            for k in range(n):
                lozenge(x0 + k * p, tc, 1.05, hh)
                lozenge(x0 + k * p, tc, 0.45, hh * 0.45, v=0)
                if k < n - 1:
                    dot(x0 + k * p + p / 2, tc, 0.38)

        # head
        hrule(4.0, 0.85)
        hrule(5.6, 0.30)
        orn_row(8.4, 16.0)
        # bands: flanking fillets + crest line
        for bc in BANDS_MM:
            hrule(bc - 3.45, 0.30)
            hrule(bc + 3.45, 0.30)
            hrule(bc, 0.42)
            hrule(bc - 4.35, 0.25, dr=bl)
            hrule(bc + 4.35, 0.25, dr=bl)
        # panel 1: rosette
        t1c = (BANDS_MM[0] + BANDS_MM[1]) / 2
        R = min(5.4, cw / 2 - 1.6)
        g.polygon([(P(x), P(y)) for x, y in star_poly(cx, t1c, R, R * 0.60)], fill=255)
        g.polygon([(P(x), P(y)) for x, y in star_poly(cx, t1c, R * 0.70, R * 0.42)], fill=0)
        dot(cx, t1c, R * 0.22)
        if cw > 22:
            for sx in (-1, 1):
                dot(cx + sx * (R + 2.6), t1c, 0.55)
                lozenge(cx + sx * (R + 5.0), t1c, 0.9, 1.6)
        # title panel frame (gold) + blind inner frame
        tp0, tp1 = BANDS_MM[1] + 5.2, BANDS_MM[2] - 5.2
        fx0, fx1 = xl + 0.5, xr - 0.5
        frame(fx0, tp0, fx1, tp1, 0.30)
        frame(fx0 + 1.0, tp0 + 1.0, fx1 - 1.0, tp1 - 1.0, 0.22, dr=bl)
        for (xx, tt) in [(fx0 + 1.9, tp0 + 1.9), (fx1 - 1.9, tp0 + 1.9), (fx0 + 1.9, tp1 - 1.9), (fx1 - 1.9, tp1 - 1.9)]:
            lozenge(xx, tt, 0.55, 0.75)
        # title
        inner_w = (fx1 - fx0) - 1.8
        inner_h = (tp1 - tp0) - 10.0
        tcy = (tp0 + tp1) / 2
        if hlines:
            size_mm = group_size[len(hlines)]
            blk, _ = fit_block(hlines, F_EBG_SB, P(size_mm), P(inner_w), P(inner_h * 0.6), gap=1.05)
            paste_center(gold, blk, P(cx), P(tcy - 2.0))
            # small lozenge ornament under the title
            lozenge(cx, tcy + blk.size[1] / S / 2 + 6.0, 1.1, 1.8)
            dot(cx - 2.6, tcy + blk.size[1] / S / 2 + 6.0, 0.45)
            dot(cx + 2.6, tcy + blk.size[1] / S / 2 + 6.0, 0.45)
        else:
            # rotated (top-to-bottom) titles: as large as the spine allows, capped so the
            # set keeps one visual size; long titles are limited by the panel length
            across = (fx1 - fx0) - 2.6
            blk, _ = fit_block([title], F_EBG_SB, P(11.0), P(across), P(inner_h), rotate=True)
            paste_center(gold, blk, P(cx), P(tcy))
        # author panel
        a0, a1 = BANDS_MM[2] + 3.9, BANDS_MM[3] - 3.9
        acy = (a0 + a1) / 2
        auth = ["Bediüzzaman", "Said Nursî"]
        if hlines:
            blk, _ = fit_block(auth, F_EBG_I, P(4.0), P(cw - 2.6), P(a1 - a0 - 2.4), gap=1.08)
        else:
            blk, _ = fit_block(auth, F_EBG_I, P(4.0), P(cw - 2.2), P(a1 - a0 - 2.0), rotate=True, gap=1.08)
        paste_center(gold, blk, P(cx), P(acy))
        # panel 4: small fleuron
        p4 = (BANDS_MM[3] + 222.0) / 2 + 1.5
        lozenge(cx, p4, 1.4, 2.4)
        lozenge(cx, p4, 0.55, 1.0, v=0)
        if cw > 16:
            dot(cx - 3.2, p4, 0.55)
            dot(cx + 3.2, p4, 0.55)
        # tail
        orn_row(224.2, 231.8)
        hrule(234.4, 0.30)
        hrule(236.0, 0.85)

        # ---- down-sample + channels
        gold_a = np.asarray(gold.resize((Wp, Hp), Image.LANCZOS)).astype(np.float32) / 255.0
        blind_a = np.asarray(blind.resize((Wp, Hp), Image.LANCZOS)).astype(np.float32) / 255.0
        # pre-filter toward the on-screen density (~2.5-3 px/mm): Cycles has no mip-mapping, and
        # 10.7 px/mm detail under a moving camera would crawl at our sample count
        gold_sharp = gold_a.copy()
        gold_a = gblur(gold_a, 1.35)
        # foil imperfections: tiny voids + slightly uneven density
        r = np.random.default_rng(100 + idx)
        voids = (r.random((Hp, Wp)) > 0.9985).astype(np.float32)
        voids = np.clip(gblur(voids, 0.8) * 5.0, 0, 1)
        dens = 0.90 + 0.10 * value_noise(Hp, Wp, 60, 8, 3, seed=200 + idx)
        gold_f = np.clip(gold_a * dens * (1 - 0.85 * voids), 0, 1)
        # foil sits on the FLAT floor of the stamped impression: the deboss is dilated past the
        # letter edge before blurring, so the walls fall on the leather and the gold stays a mirror
        try:
            from scipy.ndimage import grey_dilation
            gd = grey_dilation(gold_sharp, size=(6, 6))
            bd = grey_dilation(blind_a, size=(3, 3))
        except ImportError:
            gd, bd = gold_sharp, blind_a
        deboss = np.clip(np.maximum(np.minimum(gold_sharp * 1.6, 1.0), gblur(gd, 1.3)) + gblur(bd, 1.2) * 0.8, 0, 1)
        # wear: band crests, head/tail, spine shoulders, a few scuffs
        tt = (np.arange(Hp) + 0.5) / PPM
        uu = (np.arange(Wp) + 0.5) / PPM
        band = np.zeros(Hp, np.float32)
        for bc in BANDS_MM:
            band += np.exp(-((tt - bc) / 1.25) ** 2)
        edge_t = np.exp(-tt / 2.2) + np.exp(-(240 - tt) / 2.2)
        sh = np.exp(-((uu - (xl - 0.6)) / 1.3) ** 2) + np.exp(-((uu - (xr + 0.6)) / 1.3) ** 2)
        wear = 0.75 * band[:, None] + 0.85 * edge_t[:, None] + 0.55 * sh[None, :]
        wear *= 0.45 + 0.55 * value_noise(Hp, Wp, 40, 6, 4, seed=300 + idx)
        sc = Image.new('L', (Wp, Hp), 0)
        sd = ImageDraw.Draw(sc)
        for _ in range(int(r.integers(2, 5))):
            x0 = r.uniform(0, Wp)
            y0 = r.uniform(0.05, 0.95) * Hp
            ang = r.uniform(-0.6, 0.6) + (math.pi / 2 if r.random() < 0.3 else 0)
            ln = r.uniform(3, 9) * PPM
            sd.line([(x0, y0), (x0 + ln * math.cos(ang), y0 + ln * math.sin(ang))],
                    fill=int(r.uniform(90, 170)), width=max(1, int(r.uniform(0.15, 0.4) * PPM)))
        scuff = gblur(np.asarray(sc).astype(np.float32) / 255.0, 0.9)
        wear = np.clip(wear + scuff, 0, 1)
        if idx in (0, 3):
            # rubbed corners (head/tail of both shoulders) on the two most handled volumes
            cr = np.zeros((Hp, Wp), np.float32)
            for (cu, ct) in [(xl - 0.4, 2.0), (xr + 0.4, 2.0), (xl - 0.4, 238.0), (xr + 0.4, 238.5)]:
                cr += np.exp(-(((uu[None, :] - cu) / 2.6) ** 2 + ((tt[:, None] - ct) / 4.5) ** 2))
            cr *= 0.55 + 0.45 * value_noise(Hp, Wp, 90, 10, 3, seed=400 + idx)
            wear = np.clip(wear + 0.9 * cr, 0, 1)
        rgb = np.stack([gold_f, deboss, wear], -1)
        Image.fromarray((rgb * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(TEX, f'spine_{idx:02d}.png'))
        print('spine', idx, title, Wp, Hp)

    # ---------------------------------------------------------------- tileable leather detail
    def tile_noise(N, feat_px, seed, aniso=(1.0, 1.0)):
        r_ = np.random.default_rng(seed)
        wn = r_.standard_normal((N, N)).astype(np.float32)
        F = np.fft.rfft2(wn)
        ky = np.fft.fftfreq(N)[:, None]
        kx = np.fft.rfftfreq(N)[None, :]
        k2 = (kx * aniso[0]) ** 2 + (ky * aniso[1]) ** 2
        F *= np.exp(-k2 * (math.pi * feat_px) ** 2)
        n = np.fft.irfft2(F, s=(N, N)).astype(np.float32)
        n = (n - n.mean()) / (n.std() + 1e-9)
        return np.clip(0.5 + 0.17 * n, 0, 1)

    from scipy.spatial import cKDTree
    N = 2048
    TILE_MM = 60.0
    npts = int((TILE_MM / 1.05) ** 2)
    r_ = np.random.default_rng(31)
    Pp = r_.random((npts, 2))
    offs = np.array([(i, j) for i in (-1, 0, 1) for j in (-1, 0, 1)], float)
    PT = (Pp[None, :, :] + offs[:, None, :]).reshape(-1, 2)
    hcell = np.tile(r_.uniform(0.55, 1.0, npts), 9)
    tree = cKDTree(PT)
    gx_, gy_ = np.meshgrid(np.arange(N), np.arange(N))
    gq = (np.stack([gx_.ravel(), gy_.ravel()], -1) + 0.5) / N
    dd, ii = tree.query(gq, k=2, workers=4)
    edge_mm = (dd[:, 1] - dd[:, 0]) * 0.5 * TILE_MM
    grain = np.clip(edge_mm / 0.11, 0, 1)
    grain = grain * grain * (3 - 2 * grain)
    grain = (grain * (0.75 + 0.25 * hcell[ii[:, 0]])).reshape(N, N).astype(np.float32)
    micro = tile_noise(N, 1.4, 32)
    wrink = tile_noise(N, 7.0, 33, aniso=(3.5, 1.0))
    rgb = np.stack([grain, micro, wrink], -1)
    Image.fromarray((rgb * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(TEX, 'leather_detail.png'))
    rgb = np.stack([tile_noise(1024, 55, 41), tile_noise(1024, 18, 42), tile_noise(1024, 180, 43)], -1)
    rgb = np.clip((rgb - 0.5) * 1.6 + 0.5, 0, 1)
    Image.fromarray((rgb * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(TEX, 'leather_mottle.png'))
    print('leather detail done')

    # ---------------------------------------------------------------- mushaf cover
    MW, MH = 200, 280
    PP = 9.0
    S2 = PP * 2
    Wc, Hc = int(MW * S2), int(MH * S2)
    gold = Image.new('L', (Wc, Hc), 0)
    rais = Image.new('L', (Wc, Hc), 0)
    g = ImageDraw.Draw(gold)
    rd = ImageDraw.Draw(rais)

    def Q(v):
        return v * S2

    def qframe(ins, th, dr=g):
        dr.rectangle([Q(ins - th / 2), Q(ins - th / 2), Q(MW - ins + th / 2), Q(MH - ins + th / 2)], fill=255)
        dr.rectangle([Q(ins + th / 2), Q(ins + th / 2), Q(MW - ins - th / 2), Q(MH - ins - th / 2)], fill=0)

    def lobed(cx, cy, fx, n_lobes, amp, samples=900):
        """closed outline from parametric fx(t)->(x,y) with outward scallops"""
        base = [fx(2 * math.pi * k / samples) for k in range(samples)]
        Lc = [0.0]
        for k in range(1, samples + 1):
            Lc.append(Lc[-1] + math.dist(base[k % samples], base[k - 1]))
        tot = Lc[-1]
        out = []
        for k in range(samples):
            p0 = base[(k - 1) % samples]
            p1 = base[(k + 1) % samples]
            tx, ty = p1[0] - p0[0], p1[1] - p0[1]
            ln = math.hypot(tx, ty) + 1e-12
            nx, ny = ty / ln, -tx / ln
            # make normal point outward (away from centre)
            if (base[k][0] - cx) * nx + (base[k][1] - cy) * ny < 0:
                nx, ny = -nx, -ny
            s = Lc[k] / tot
            off = amp * abs(math.sin(math.pi * n_lobes * s)) ** 0.6
            out.append((base[k][0] + nx * off, base[k][1] + ny * off))
        return out

    def mandorla_fx(cx, cy, a, b, p=1.35):
        def f(t):
            st, ct = math.sin(t), math.cos(t)
            y = cy - b * ct
            x = cx + a * math.copysign(abs(st) ** (2 / p) if abs(st) > 0 else 0, st) * 1.0
            return (x, y)
        return f

    def ellipse_fx(cx, cy, a, b):
        return lambda t: (cx + a * math.sin(t), cy - b * math.cos(t))

    def poly(dr, pts, v=255):
        dr.polygon([(Q(x), Q(y)) for x, y in pts], fill=v)

    # borders
    qframe(7.0, 1.3)
    qframe(9.3, 0.45)
    qframe(19.6, 0.45)
    qframe(21.2, 0.95)
    # chain band between 10 and 19 mm: eight-pointed stars + dots
    band_c = 14.45
    def band_star(x, y):
        poly(g, star_poly(x, y, 3.0, 1.8))
        poly(g, star_poly(x, y, 1.7, 1.0), 0)
        g.ellipse([Q(x - 0.5), Q(y - 0.5), Q(x + 0.5), Q(y + 0.5)], fill=255)
    step = 7.0
    nx_ = int((MW - 2 * band_c) / step)
    for k in range(nx_ + 1):
        x = band_c + k * (MW - 2 * band_c) / nx_
        band_star(x, band_c)
        band_star(x, MH - band_c)
        if k < nx_:
            xm = x + (MW - 2 * band_c) / nx_ / 2
            for yy in (band_c, MH - band_c):
                g.ellipse([Q(xm - 0.6), Q(yy - 0.6), Q(xm + 0.6), Q(yy + 0.6)], fill=255)
    ny_ = int((MH - 2 * band_c) / step)
    for k in range(1, ny_):
        y = band_c + k * (MH - 2 * band_c) / ny_
        band_star(band_c, y)
        band_star(MW - band_c, y)
    for k in range(ny_):
        ym = band_c + (k + 0.5) * (MH - 2 * band_c) / ny_
        for xx in (band_c, MW - band_c):
            g.ellipse([Q(xx - 0.6), Q(ym - 0.6), Q(xx + 0.6), Q(ym + 0.6)], fill=255)
    # corner pieces (köşebent): lobed quarter medallions clipped to the field
    field = Image.new('L', (Wc, Hc), 0)
    ImageDraw.Draw(field).rectangle([Q(22.0), Q(22.0), Q(MW - 22.0), Q(MH - 22.0)], fill=255)
    corner = Image.new('L', (Wc, Hc), 0)
    cd = ImageDraw.Draw(corner)
    for (ccx, ccy) in [(22, 22), (MW - 22, 22), (22, MH - 22), (MW - 22, MH - 22)]:
        poly(cd, lobed(ccx, ccy, ellipse_fx(ccx, ccy, 30, 30), 14, 1.6), 255)
        poly(cd, lobed(ccx, ccy, ellipse_fx(ccx, ccy, 26.5, 26.5), 14, 1.2), 0)
        poly(cd, lobed(ccx, ccy, ellipse_fx(ccx, ccy, 24.5, 24.5), 12, 1.1), 255)
        for k in range(6):
            ang = k * math.pi / 2 / 5
            ang += {(22, 22): 0, (MW - 22, 22): math.pi / 2, (22, MH - 22): -math.pi / 2,
                    (MW - 22, MH - 22): math.pi}[(ccx, ccy)]
            px, py = ccx + 15 * math.cos(ang), ccy + 15 * math.sin(ang)
            cd.ellipse([Q(px - 3.2), Q(py - 3.2), Q(px + 3.2), Q(py + 3.2)], fill=0)
            cd.ellipse([Q(px - 1.4), Q(py - 1.4), Q(px + 1.4), Q(py + 1.4)], fill=255)
        poly(cd, star_poly(ccx, ccy, 8.0, 4.8), 0)
    corner_a = np.minimum(np.asarray(corner), np.asarray(field))
    gold = Image.fromarray(np.maximum(np.asarray(gold), corner_a))
    g = ImageDraw.Draw(gold)
    rd.bitmap((0, 0), Image.fromarray(corner_a), fill=255)
    # central şemse
    scx, scy = MW / 2, MH / 2
    sa, sb = 37.0, 58.0
    outer = lobed(scx, scy, mandorla_fx(scx, scy, sa, sb), 22, 2.0)
    poly(g, outer, 255)
    poly(rd, outer, 255)
    poly(g, lobed(scx, scy, mandorla_fx(scx, scy, sa - 3.0, sb - 3.6), 22, 1.6), 0)
    poly(g, lobed(scx, scy, mandorla_fx(scx, scy, sa - 4.4, sb - 5.2), 20, 1.4), 255)
    # filigree: inner lobed hairline ring + a ring of cut teardrops + dotted rays
    poly(g, lobed(scx, scy, mandorla_fx(scx, scy, sa - 11.0, sb - 13.5), 18, 1.2), 0)
    poly(g, lobed(scx, scy, mandorla_fx(scx, scy, sa - 12.0, sb - 14.6), 18, 1.0), 255)
    fx_mid = mandorla_fx(scx, scy, sa - 8.0, sb - 9.6)
    for k in range(26):
        t = 2 * math.pi * (k + 0.5) / 26
        px, py = fx_mid(t)
        ang = math.atan2(py - scy, px - scx)
        drop = []
        for j in range(40):
            u = 2 * math.pi * j / 40
            rr = 1.0 + 0.0 * u
            lx = 2.3 * (0.5 - 0.5 * math.cos(u)) - 1.1
            ly = 0.95 * math.sin(u) * (0.5 - 0.5 * math.cos(u)) ** 0.5
            drop.append((px + lx * math.cos(ang) - ly * math.sin(ang), py + lx * math.sin(ang) + ly * math.cos(ang)))
        poly(g, drop, 0)
    for k in range(18):
        t = 2 * math.pi * k / 18
        px, py = mandorla_fx(scx, scy, sa - 17.0, sb - 21.0)(t)
        g.ellipse([Q(px - 0.55), Q(py - 0.55), Q(px + 0.55), Q(py + 0.55)], fill=0)
    # inner cut-outs: calligraphy cartouche + tulip petals
    cart = lobed(scx, scy, ellipse_fx(scx, scy, 25.0, 11.5), 16, 0.9)
    poly(g, cart, 0)
    blk, _ = fit_block(['القرآن الكريم'], F_AMIRI_B, Q(10.0), Q(42.0), Q(17.0), lang='ar', direction='rtl')
    paste_center(gold, blk, Q(scx), Q(scy + 0.8), 255)
    g = ImageDraw.Draw(gold)
    for sy in (-1, 1):
        # tulip-like cut petals above / below the cartouche
        for k, (dx, sc_) in enumerate([(0, 1.0), (-9.5, 0.72), (9.5, 0.72)]):
            px, py = scx + dx, scy + sy * (24.0 - abs(dx) * 0.35)
            petal = [(px + sc_ * 4.2 * math.sin(t) * (1 - 0.0), py + sy * sc_ * (-9.5 * math.cos(t) * 0.5 + 9.5 * 0.5) * 1.0)
                     for t in [2 * math.pi * j / 60 for j in range(60)]]
            petal = [(px + sc_ * 4.0 * math.sin(t) * abs(math.sin(t / 2)) ** 0.3,
                      py - sy * sc_ * 9.0 * (0.5 - 0.5 * math.cos(t)))
                     for t in [2 * math.pi * j / 80 for j in range(80)]]
            poly(g, petal, 0)
            g.ellipse([Q(px - 0.9 * sc_), Q(py - sy * 5.5 * sc_ - 0.9 * sc_), Q(px + 0.9 * sc_), Q(py - sy * 5.5 * sc_ + 0.9 * sc_)], fill=255)
        tipy = scy + sy * (sb - 10.0)
        poly(g, star_poly(scx, tipy, 3.6, 2.0), 0)
    # pendants (salbek)
    for sy in (-1, 1):
        ty = scy + sy * (sb + 2.0)
        g.rectangle([Q(scx - 0.45), Q(min(ty, ty + sy * 5.5)), Q(scx + 0.45), Q(max(ty, ty + sy * 5.5))], fill=255)
        pcy = ty + sy * 13.0
        pend = lobed(scx, pcy, mandorla_fx(scx, pcy, 7.5, 8.2, p=1.5), 9, 1.0)
        poly(g, pend, 255)
        poly(rd, pend, 255)
        poly(g, lobed(scx, pcy, mandorla_fx(scx, pcy, 5.4, 6.0, p=1.5), 9, 0.8), 0)
        poly(g, star_poly(scx, pcy, 3.2, 1.9), 255)
        g.rectangle([Q(scx - 0.45), Q(min(pcy + sy * 8.5, pcy + sy * 13.0)), Q(scx + 0.45), Q(max(pcy + sy * 8.5, pcy + sy * 13.0))], fill=255)
        g.ellipse([Q(scx - 1.1), Q(pcy + sy * 14.2 - 1.1), Q(scx + 1.1), Q(pcy + sy * 14.2 + 1.1)], fill=255)
    gold_a = np.asarray(gold.resize((int(MW * PP), int(MH * PP)), Image.LANCZOS)).astype(np.float32) / 255
    rais_a = np.asarray(rais.resize((int(MW * PP), int(MH * PP)), Image.LANCZOS)).astype(np.float32) / 255
    rais_a = gblur(rais_a, 6.0)
    try:
        from scipy.ndimage import grey_dilation
        deb = np.maximum(np.minimum(gold_a * 1.6, 1.0), gblur(grey_dilation(gold_a, size=(5, 5)), 1.5))
    except ImportError:
        deb = gblur(gold_a, 1.8)
    height = np.clip(0.5 + 0.45 * rais_a - 0.20 * deb * (1 - rais_a) - 0.08 * deb * rais_a, 0, 1)
    rr = np.random.default_rng(77)
    hh, ww = gold_a.shape
    voids = (rr.random((hh, ww)) > 0.9992).astype(np.float32)
    voids = np.clip(gblur(voids, 0.8) * 5.0, 0, 1)
    gold_a = np.clip(gold_a * (1 - 0.8 * voids), 0, 1)
    wear = value_noise(hh, ww, 12, 9, 5, seed=78)
    edge = np.zeros_like(gold_a)
    yy = (np.arange(hh) + 0.5) / PP
    xx = (np.arange(ww) + 0.5) / PP
    edge += np.exp(-np.minimum(yy, MH - yy) / 2.5)[:, None]
    edge += np.exp(-np.minimum(xx, MW - xx) / 2.5)[None, :]
    wear = np.clip(edge * 0.8 * wear + 0.15 * (wear - 0.5), 0, 1)
    rgb = np.stack([gold_a, height, wear], -1)
    Image.fromarray((rgb * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(TEX, 'mushaf_cover.png'))
    print('mushaf cover', ww, hh)

    # ---------------------------------------------------------------- mushaf spine (simple gold bands)
    pts, L, b = spine_profile(MUSHAF_T)
    Wmm = L[-1] * 1000
    PPm = 8.0
    Wp, Hp = int(Wmm * PPm * 2), int(MUSHAF_H * 1000 * PPm * 2)
    im = Image.new('L', (Wp, Hp), 0)
    d = ImageDraw.Draw(im)
    xl_ = 3.0 * PPm * 2
    xr_ = Wp - xl_
    def mr(t, th):
        d.rectangle([xl_, (t - th / 2) * PPm * 2, xr_, (t + th / 2) * PPm * 2], fill=255)
    # flat Turkish Mushaf spine: no raised bands, only head/tail fillets, two small
    # tulip-star ornaments and the title
    for t0 in (7, 253):
        mr(t0 - 1.2, 0.9); mr(t0 + 0.6, 0.3)
    cxs = Wp / 2
    for tc in (40, 220):
        pts_ = star_poly(cxs, tc * PPm * 2, 6.5 * PPm * 2, 3.8 * PPm * 2)
        d.polygon(pts_, fill=255)
        d.polygon(star_poly(cxs, tc * PPm * 2, 4.2 * PPm * 2, 2.5 * PPm * 2), fill=0)
        d.ellipse([cxs - 1.0 * PPm * 2, (tc - 1.0) * PPm * 2, cxs + 1.0 * PPm * 2, (tc + 1.0) * PPm * 2], fill=255)
    blk, _ = fit_block(['القرآن الكريم'], F_AMIRI_B, 9 * PPm * 2, Wp * 0.62, 70 * PPm * 2, lang='ar', direction='rtl')
    blk = blk.transpose(Image.Transpose.ROTATE_90)
    if blk.size[0] > Wp * 0.62 or blk.size[1] > 70 * PPm * 2:
        s_ = min(Wp * 0.62 / blk.size[0], 70 * PPm * 2 / blk.size[1])
        blk = blk.resize((int(blk.size[0] * s_), int(blk.size[1] * s_)), Image.LANCZOS)
    paste_center(im, blk, cxs, 130 * PPm * 2)
    ga = np.asarray(im.resize((Wp // 2, Hp // 2), Image.LANCZOS)).astype(np.float32) / 255
    rgb = np.stack([ga, np.clip(gblur(ga, 1.5) * 1.1, 0, 1), np.zeros_like(ga)], -1)
    Image.fromarray((rgb * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(TEX, 'mushaf_spine.png'))

    # ---------------------------------------------------------------- walnut
    def make_wood(name, W=4096, H=2048, Lx=1.6, Ly=0.8, seed=11, boards=None, ring_mm=(3.2, 5.5),
                  wipe=None, light=(0.55, 0.42, 0.33), mid=(0.44, 0.325, 0.25), dark=(0.265, 0.18, 0.135), late_amt=0.50,
                  taper_rng=(0.015, 0.03)):
        """Flat-sawn walnut: each board cuts tangentially through slightly tapering growth
        cones, which gives nested cathedral arches (3-6 cm) and straight grain on the flanks.
        Colour shifts between boards, pores as fine short ticks along the grain, satin finish
        roughness with slow variation, faint finish scratches and an optional wipe smear."""
        r = np.random.default_rng(seed)
        y = np.linspace(0, Ly, H, dtype=np.float32)[:, None]
        x = np.linspace(0, Lx, W, dtype=np.float32)[None, :]
        n_low = value_noise(H, W, 3, 6, 3, seed=seed + 1)
        n_mid = value_noise(H, W, 14, 40, 3, seed=seed + 2)
        n_fine = value_noise(H, W, 160, 40, 2, seed=seed + 3)
        n_fig = value_noise(H, W, 5, 12, 4, seed=seed + 4)
        n_str = value_noise(H, W, 60, 4, 3, seed=seed + 5)      # long streaks along the grain
        boards = boards or [0.0, 0.135, 0.29, 0.43, 0.585, 0.72, 0.8]
        L_, M_, D_ = (np.array(c, np.float32) for c in (light, mid, dark))
        col = np.zeros((H, W, 3), np.float32)
        rough = np.zeros((H, W), np.float32)
        bump = np.zeros((H, W), np.float32)
        late_all = np.zeros((H, W), np.float32)
        for bi in range(len(boards) - 1):
            y0, y1 = boards[bi], boards[bi + 1]
            rows = (y[:, 0] >= y0) & (y[:, 0] < y1)
            if not rows.any():
                continue
            bw = y1 - y0
            yl = y[rows] - y0
            yc = r.uniform(0.2, 0.8) * bw                 # pith line (projected) inside the board
            dpt = r.uniform(0.05, 0.11)                   # pith depth below the surface
            taper = r.uniform(*taper_rng) * (1 if r.random() < 0.5 else -1)
            xc = r.uniform(0.0, Lx)
            per = r.uniform(*ring_mm) / 1000.0
            rad = np.sqrt((yl - yc) ** 2 + dpt * dpt) + taper * (x - xc)
            rad = rad + 0.006 * (n_low[rows] - 0.5) + 0.0016 * (n_mid[rows] - 0.5)
            ring = rad / per + r.uniform(0, 10)
            p = ring - np.floor(ring)
            late = np.clip((p - 0.50) / 0.30, 0, 1) ** 1.3 * (1 - np.clip((p - 0.92) / 0.08, 0, 1))
            late_all[rows] = late
            btint = np.array([r.uniform(0.94, 1.05), r.uniform(0.93, 1.04), r.uniform(0.92, 1.05)], np.float32)
            bval = r.uniform(0.90, 1.08)
            t = np.clip(0.30 + late_amt * late + 0.30 * (n_fig[rows] - 0.5) + 0.10 * (n_fine[rows] - 0.5), 0, 1)
            # mid -> dark with late wood; occasional lighter sapwood-ish streaks
            c = M_[None, None, :] * (1 - t[..., None]) + D_[None, None, :] * t[..., None]
            ls = np.clip((n_str[rows] - 0.62) / 0.12, 0, 1)[..., None] * 0.55
            c = c * (1 - ls) + L_[None, None, :] * ls
            col[rows] = c * btint[None, None, :] * bval
            rough[rows] = 0.30 + 0.05 * (n_low[rows] - 0.5) + 0.03 * late
            bump[rows] = 0.55 - 0.05 * late
            seam = max(0, int(y0 / Ly * H))
            if bi > 0:
                col[seam:seam + 2] *= 0.80
                bump[seam:seam + 2] -= 0.15
        # pores: fine short ticks along the grain (x), denser in early wood
        pr = (r.random((H, W)) > (0.982 + 0.012 * late_all)).astype(np.float32)
        pr = np.maximum(pr, np.roll(pr, 1, axis=1)) * r.uniform(0.5, 1.0, (H, W)).astype(np.float32)
        pr = np.maximum(pr, 0.6 * np.roll(pr, 1, axis=1))
        col *= (1 - 0.30 * pr)[..., None]
        rough += 0.07 * pr
        bump -= 0.30 * pr
        # faint finish scratches (roughness only)
        sc = Image.new('L', (W, H), 0)
        sd = ImageDraw.Draw(sc)
        for _ in range(90):
            x0, y0 = r.uniform(0, W), r.uniform(0, H)
            ang = r.uniform(-0.5, 0.5) + (r.random() < 0.5) * math.pi / 2 * r.uniform(0.6, 1)
            ln = r.uniform(30, 260)
            sd.line([(x0, y0), (x0 + ln * math.cos(ang), y0 + ln * math.sin(ang))], fill=int(r.uniform(60, 160)), width=1)
        rough += np.asarray(sc).astype(np.float32) / 255 * 0.08
        if wipe is not None:
            # a cloth wipe smear + one faint fingerprint in the finish (u, v in 0..1, v up)
            wu, wv = wipe
            cx_, cy_ = wu * W, (1 - wv) * H
            yy_, xx_ = np.mgrid[0:H, 0:W].astype(np.float32)
            ex = np.exp(-(((xx_ - cx_) / (0.07 * W)) ** 2 + ((yy_ - cy_) / (0.05 * H)) ** 2))
            streaks = value_noise(H, W, 220, 8, 2, seed=seed + 9)
            rough += 0.10 * ex * (streaks - 0.35)
            fx_, fy_ = cx_ + 0.035 * W, cy_ + 0.03 * H
            rr_ = np.sqrt(((xx_ - fx_) / 1.0) ** 2 + ((yy_ - fy_) / 0.8) ** 2)
            ridge = 0.5 + 0.5 * np.sin(rr_ * 2 * math.pi / 2.2)
            fp = np.exp(-(rr_ / 22.0) ** 4) * ridge
            rough += 0.12 * fp
        col = np.clip(col, 0, 1)
        Image.fromarray((col * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(TEX, f'{name}_col.png'))
        Image.fromarray((np.clip(rough, 0, 1) * 255 + 0.5).astype(np.uint8), 'L').save(os.path.join(TEX, f'{name}_rough.png'))
        Image.fromarray((np.clip(bump, 0, 1) * 65535 + 0.5).astype(np.uint16)).save(os.path.join(TEX, f'{name}_bump.png'))
        print('wood', name)

    # desk: the visible front strip is around object (x 0.12, y -0.15) -> u 0.575, v 0.23
    make_wood('walnut', seed=11, wipe=(0.585, 0.24))
    # rahle: lighter oiled walnut, one board, finer rings
    make_wood('walnut2', W=2048, H=2048, Lx=0.8, Ly=0.8, seed=29, boards=[0.0, 0.8], ring_mm=(4.0, 6.0),
              light=(0.60, 0.47, 0.35), mid=(0.47, 0.36, 0.26), dark=(0.25, 0.18, 0.12), late_amt=0.50,
              taper_rng=(0.06, 0.09))

    # ---------------------------------------------------------------- dust (tileable specks + a few fibres)
    ND = 2048
    rd_ = np.random.default_rng(91)
    dimg = Image.new('L', (ND, ND), 0)
    dd_ = ImageDraw.Draw(dimg)
    for _ in range(2600):
        x0, y0 = rd_.uniform(0, ND), rd_.uniform(0, ND)
        rad_ = rd_.uniform(0.35, 1.3) if rd_.random() < 0.93 else rd_.uniform(1.5, 2.6)
        dd_.ellipse([x0 - rad_, y0 - rad_, x0 + rad_, y0 + rad_], fill=int(rd_.uniform(110, 255)))
    for _ in range(26):
        x0, y0 = rd_.uniform(0, ND), rd_.uniform(0, ND)
        ang = rd_.uniform(0, 2 * math.pi)
        pts_ = [(x0, y0)]
        for k in range(int(rd_.integers(6, 16))):
            ang += rd_.normal(0, 0.35)
            x0 += 2.2 * math.cos(ang)
            y0 += 2.2 * math.sin(ang)
            pts_.append((x0, y0))
        dd_.line(pts_, fill=int(rd_.uniform(90, 170)), width=1)
    dust = gblur(np.asarray(dimg).astype(np.float32) / 255.0, 0.6)
    Image.fromarray((np.clip(dust * 1.3, 0, 1) * 255 + 0.5).astype(np.uint8), 'L').save(os.path.join(TEX, 'dust.png'))
    print('dust done')

    # ---------------------------------------------------------------- rahle carving height
    outer, holes = rahle_leaf_shape()
    ppm = 4.0  # px / mm
    minx, maxx = -RAHLE_W / 2, RAHLE_W / 2
    miny, maxy = -RAHLE_LEG, RAHLE_ARM + 0.012
    Wr = int((maxx - minx) * 1000 * ppm)
    Hr = int((maxy - miny) * 1000 * ppm)
    def to_px(p):
        return ((p[0] - minx) * 1000 * ppm, (maxy - p[1]) * 1000 * ppm)
    m = Image.new('L', (Wr, Hr), 0)
    md = ImageDraw.Draw(m)
    md.polygon([to_px(p) for p in outer], fill=255)
    for h in holes:
        md.polygon([to_px(p) for p in h], fill=0)
    M = np.asarray(m).astype(np.float32) / 255
    try:
        from scipy import ndimage
        dist = ndimage.distance_transform_edt(M > 0.5) / ppm  # mm to edge
    except Exception:
        dist = np.zeros_like(M)
        cur = m
        for k in range(1, 40):
            cur = cur.filter(ImageFilter.MinFilter(3))
            dist += (np.asarray(cur) > 127) / ppm
    groove = np.exp(-((dist - 5.0) / 0.55) ** 2)            # carved border groove
    groove += 0.7 * np.exp(-((dist - 7.4) / 0.35) ** 2)     # second fine line
    panel = np.clip((dist - 8.4) / 1.5, 0, 1) * 0.22         # raised inner panel
    chamfer = np.clip(dist / 1.8, 0, 1)                      # softened edges
    # ---- relief motifs (drawn in leaf coordinates)
    rel = Image.new('L', (Wr, Hr), 0)
    rdw = ImageDraw.Draw(rel)
    cut = Image.new('L', (Wr, Hr), 0)
    cdw = ImageDraw.Draw(cut)

    def P2(x, y):
        return to_px((x, y))

    def blob_line(pts, w0, w1, dr):
        n_ = len(pts)
        for k, (x, y) in enumerate(pts):
            w = (w0 + (w1 - w0) * k / max(n_ - 1, 1)) * 1000 * ppm / 2
            px_, py_ = P2(x, y)
            dr.ellipse([px_ - w, py_ - w, px_ + w, py_ + w], fill=255)

    def rumi(cx_, cy_, sc, flip, rot):
        """a rumi scroll: a stem that curls into a spiral and ends in a split leaf"""
        pts = []
        for k in range(70):
            th = 0.15 + 2.3 * math.pi * k / 69
            rr_ = sc * 0.020 * math.exp(-0.23 * th)
            pts.append((rr_ * math.cos(th), rr_ * math.sin(th)))
        pts = pts[::-1]
        out = []
        for (x, y) in pts:
            x = -x if flip else x
            xr_ = x * math.cos(rot) - y * math.sin(rot)
            yr_ = x * math.sin(rot) + y * math.cos(rot)
            out.append((cx_ + xr_, cy_ + yr_))
        blob_line(out, 0.0034 * sc, 0.0012 * sc, rdw)
        # leaf at the outer end
        ex, ey = out[0]
        ang = math.atan2(out[0][1] - out[3][1], out[0][0] - out[3][0])
        leaf = []
        for j in range(30):
            u = 2 * math.pi * j / 30
            lx = 0.009 * sc * (0.5 - 0.5 * math.cos(u))
            ly = 0.0035 * sc * math.sin(u) * (1 - 0.5 * (0.5 - 0.5 * math.cos(u)))
            leaf.append(P2(ex + lx * math.cos(ang) - ly * math.sin(ang), ey + lx * math.sin(ang) + ly * math.cos(ang)))
        rdw.polygon(leaf, fill=255)

    hw = RAHLE_W / 2
    # arm: lobed rosette ring around the openwork star + 8 drilled pearls
    acy = 0.036
    ring = []
    for k in range(240):
        t_ = 2 * math.pi * k / 240
        rr_ = 0.0265 + 0.0018 * abs(math.sin(6 * t_))
        ring.append(P2(rr_ * math.cos(t_), acy + rr_ * math.sin(t_)))
    rdw.polygon(ring, fill=255)
    inner = []
    for k in range(240):
        t_ = 2 * math.pi * k / 240
        rr_ = 0.0215 + 0.0012 * abs(math.sin(6 * t_))
        inner.append(P2(rr_ * math.cos(t_), acy + rr_ * math.sin(t_)))
    rdw.polygon(inner, fill=0)
    for k in range(8):
        t_ = math.pi / 8 + k * math.pi / 4
        px_, py_ = P2(0.0300 * math.cos(t_) * 0 + 0.0240 * math.cos(t_), acy + 0.0240 * math.sin(t_))
        cdw.ellipse([px_ - 1.2 * ppm, py_ - 1.2 * ppm, px_ + 1.2 * ppm, py_ + 1.2 * ppm], fill=255)
    # shoulders of the arm: mirrored rumi scrolls
    for sx in (-1, 1):
        rumi(sx * 0.060, 0.094, 0.95, sx < 0, -0.5 if sx > 0 else 0.5)
        rumi(sx * 0.058, 0.052, 0.62, sx > 0, 2.4 if sx > 0 else -2.4)
    # leg: raised arch frame around the mihrab window and the small star
    holes_m = Image.new('L', (Wr, Hr), 0)
    for hpoly in holes:
        if sum(p[1] for p in hpoly) / len(hpoly) < 0:
            ImageDraw.Draw(holes_m).polygon([to_px(p) for p in hpoly], fill=255)
    try:
        dist_h = ndimage.distance_transform_edt(np.asarray(holes_m) < 128) / ppm
    except Exception:
        dist_h = np.full((Hr, Wr), 99.0, np.float32)
    arch_band = np.clip(1 - np.abs(dist_h - 5.2) / 2.0, 0, 1)
    arch_groove = np.exp(-((dist_h - 8.6) / 0.45) ** 2)
    for sx in (-1, 1):
        rumi(sx * 0.052, -0.030, 0.75, sx > 0, 1.2 if sx > 0 else -1.2)
    relief = gblur(np.asarray(rel).astype(np.float32) / 255.0, 2.2)
    pearls = gblur(np.asarray(cut).astype(np.float32) / 255.0, 1.2)
    inside = np.clip((dist - 9.5) / 1.0, 0, 1)
    hgt = 0.50 * chamfer + panel - 0.42 * groove
    hgt += inside * (0.30 * relief + 0.22 * arch_band - 0.25 * arch_groove - 0.35 * pearls)
    hgt = np.clip(hgt, 0, 1)
    hgt = gblur(hgt, 0.7)
    Image.fromarray((hgt * 65535 + 0.5).astype(np.uint16)).save(os.path.join(TEX, 'rahle_carve.png'))
    print('rahle carve', Wr, Hr)

    # ---------------------------------------------------------------- film grain + vignette
    GW, GH = 1080, 1920
    for k in range(24):
        r = np.random.default_rng(5000 + k)
        n = r.standard_normal((GH, GW)).astype(np.float32)
        n = gblur(n, 0.65)
        n /= n.std() + 1e-6
        v = np.clip(128 + n * 40, 0, 255).astype(np.uint8)
        Image.fromarray(v, 'L').save(os.path.join(TEX, f'grain_{k + 1:04d}.png'))
    yy, xx = np.mgrid[0:GH, 0:GW].astype(np.float32)
    dx = (xx - GW / 2) / (GW / 2)
    dy = (yy - GH / 2) / (GH / 2)
    rr_ = np.sqrt((dx * 0.82) ** 2 + (dy * 1.0) ** 2)
    t = np.clip((rr_ - 0.45) / 0.85, 0, 1)
    vig = 1 - 0.30 * (t * t * (3 - 2 * t))
    Image.fromarray((vig * 65535 + 0.5).astype(np.uint16)).save(os.path.join(TEX, 'vignette.png'))
    print('grain + vignette done')


# ======================================================================================
# BLENDER SCENE
# ======================================================================================
def build():
    import bpy
    import numpy as np
    from mathutils import Vector, Matrix, Euler, Quaternion

    scene = bpy.context.scene
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll_ in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras,
                  bpy.data.curves, bpy.data.images, bpy.data.worlds):
        for d in list(coll_):
            coll_.remove(d)
    col = scene.collection

    def link(obj, parent=None):
        col.objects.link(obj)
        if parent is not None:
            obj.parent = parent
        return obj

    def empty(name, loc=(0, 0, 0), rot=(0, 0, 0), parent=None):
        e = bpy.data.objects.new(name, None)
        e.location = loc
        e.rotation_euler = rot
        e.empty_display_size = 0.03
        return link(e, parent)

    def mesh_obj(name, verts, faces, uv=None, smooth=True, mat=None, parent=None, uv2=None):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(map(float, v)) for v in verts], [], [tuple(f) for f in faces])
        vidx = np.zeros(len(me.loops), dtype=np.int32)
        me.loops.foreach_get('vertex_index', vidx)
        for lname, data in (('UVMap', uv), ('Metric', uv2)):
            if data is None:
                continue
            ul = me.uv_layers.new(name=lname)
            uva = np.asarray(data, dtype=np.float32)[vidx]
            ul.data.foreach_set('uv', uva.ravel())
        me.polygons.foreach_set('use_smooth', [smooth] * len(me.polygons))
        me.update()
        if mat is not None:
            me.materials.append(mat)
        ob = bpy.data.objects.new(name, me)
        return link(ob, parent)

    def box(x0, x1, y0, y1, z0, z1):
        v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
             (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
        f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        return v, f

    def bevel(ob, w, seg=3, angle=40):
        m = ob.modifiers.new('Bevel', 'BEVEL')
        m.width = w
        m.segments = seg
        m.limit_method = 'ANGLE'
        m.angle_limit = math.radians(angle)
        return m

    def load_img(fname, colorspace='sRGB'):
        im = bpy.data.images.load(os.path.join(TEX, fname), check_existing=True)
        im.colorspace_settings.name = colorspace
        return im

    # -------------------------------------------------------------- node helper
    class NB:
        def __init__(self, mat):
            mat.use_nodes = True
            self.nt = mat.node_tree
            self.nt.nodes.clear()
            self.x = 0

        def node(self, t, **props):
            n = self.nt.nodes.new(t)
            n.location = (self.x, 0)
            self.x += 180
            for k, v in props.items():
                setattr(n, k, v)
            return n

        def set(self, sock, v):
            if isinstance(v, bpy.types.NodeSocket):
                self.nt.links.new(v, sock)
            elif v is not None:
                try:
                    sock.default_value = v
                except TypeError:
                    sock.default_value = (v, v, v, 1.0) if len(sock.default_value) == 4 else (v, v, v)

        def math(self, op, a, b=None, c=None, clamp=False):
            n = self.node('ShaderNodeMath', operation=op, use_clamp=clamp)
            self.set(n.inputs[0], a)
            if b is not None:
                self.set(n.inputs[1], b)
            if c is not None:
                self.set(n.inputs[2], c)
            return n.outputs[0]

        def mix(self, fac, a, b, blend='MIX', clamp=False):
            n = self.node('ShaderNodeMix', data_type='RGBA', blend_type=blend, clamp_result=clamp)
            self.set(n.inputs[0], fac)
            self.set(n.inputs[6], a)
            self.set(n.inputs[7], b)
            return n.outputs[2]

        def maprange(self, v, a0, a1, b0=0.0, b1=1.0, clamp=True, smooth=False):
            n = self.node('ShaderNodeMapRange', clamp=clamp, interpolation_type='SMOOTHSTEP' if smooth else 'LINEAR')
            self.set(n.inputs['Value'], v)
            n.inputs['From Min'].default_value = a0
            n.inputs['From Max'].default_value = a1
            n.inputs['To Min'].default_value = b0
            n.inputs['To Max'].default_value = b1
            return n.outputs['Result']

        def noise(self, vec, scale, detail=2.0, rough=0.5, distort=0.0, dims='3D'):
            n = self.node('ShaderNodeTexNoise', noise_dimensions=dims)
            self.set(n.inputs['Vector'], vec)
            n.inputs['Scale'].default_value = scale
            n.inputs['Detail'].default_value = detail
            n.inputs['Roughness'].default_value = rough
            n.inputs['Distortion'].default_value = distort
            return n.outputs['Fac']

        def mapping(self, vec, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
            n = self.node('ShaderNodeMapping')
            self.set(n.inputs['Vector'], vec)
            n.inputs['Location'].default_value = loc
            n.inputs['Rotation'].default_value = rot
            n.inputs['Scale'].default_value = scale
            return n.outputs['Vector']

        def image(self, img, vec, ext='REPEAT', interp='Linear'):
            n = self.node('ShaderNodeTexImage', interpolation=interp, extension=ext)
            n.image = img
            self.set(n.inputs['Vector'], vec)
            return n

        def sep(self, colsock):
            n = self.node('ShaderNodeSeparateColor')
            self.set(n.inputs['Color'], colsock)
            return n.outputs

        def principled(self, **inp):
            n = self.node('ShaderNodeBsdfPrincipled')
            for k, v in inp.items():
                self.set(n.inputs[k.replace('_', ' ')], v)
            return n

        def bump(self, height, distance, strength=1.0, normal=None):
            n = self.node('ShaderNodeBump')
            self.set(n.inputs['Height'], height)
            n.inputs['Distance'].default_value = distance
            n.inputs['Strength'].default_value = strength
            if normal is not None:
                self.set(n.inputs['Normal'], normal)
            return n.outputs['Normal']

        def mixshader(self, fac, a, b):
            n = self.node('ShaderNodeMixShader')
            self.set(n.inputs[0], fac)
            self.nt.links.new(a, n.inputs[1])
            self.nt.links.new(b, n.inputs[2])
            return n.outputs[0]

        def out(self, shader):
            n = self.node('ShaderNodeOutputMaterial')
            self.nt.links.new(shader, n.inputs['Surface'])

        def texcoord(self):
            return self.node('ShaderNodeTexCoord')

    def srgb2lin(c):
        return tuple(((v / 255.0 + 0.055) / 1.055) ** 2.4 if v / 255.0 > 0.04045 else v / 255.0 / 12.92 for v in c)

    GOLD = (0.80, 0.52, 0.18, 1.0)

    # -------------------------------------------------------------- materials
    det_img = None
    mot_img = None
    dust_img = None

    def get_dust():
        nonlocal dust_img
        if dust_img is None:
            dust_img = load_img('dust.png', 'Non-Color')
        return dust_img

    def leather_material(name, img, base_srgb, seed, rough=0.29, wear_srgb=None, gold=GOLD,
                         raised_mode=False, grain_tile=0.06, gold_rough=0.18, grain_mm=0.07, fade=0.0,
                         sheen=0.12, relief=1.2, **_):
        nonlocal det_img, mot_img
        if det_img is None:
            det_img = load_img('leather_detail.png', 'Non-Color')
            mot_img = load_img('leather_mottle.png', 'Non-Color')
        m = bpy.data.materials.new(name)
        nb = NB(m)
        uvA = nb.node('ShaderNodeUVMap', uv_map='UVMap').outputs['UV']
        uvM = nb.node('ShaderNodeUVMap', uv_map='Metric').outputs['UV']
        ch = None
        if img is not None:
            it = nb.image(img, uvA, ext='CLIP', interp='Cubic')
            ch = nb.sep(it.outputs['Color'])
        dv = nb.mapping(uvM, loc=((seed * 0.137) % 1, (seed * 0.291) % 1, 0), scale=(1 / grain_tile, 1 / grain_tile, 1))
        det = nb.sep(nb.image(det_img, dv).outputs['Color'])
        mv = nb.mapping(uvM, loc=((seed * 0.0713) % 1, (seed * 0.173) % 1, 0), scale=(2.0, 2.0, 1))
        mot = nb.sep(nb.image(mot_img, mv).outputs['Color'])
        grain, micro, wrink = det['Red'], det['Green'], det['Blue']
        n1, n2, n3 = mot['Red'], mot['Green'], mot['Blue']
        base = srgb2lin(base_srgb) + (1.0,)
        dark = tuple(v * 0.84 for v in base[:3]) + (1.0,)
        lite = tuple(min(1.0, v * 1.10) for v in base[:3]) + (1.0,)
        lum = 0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2]
        if wear_srgb:
            wear_c = srgb2lin(wear_srgb) + (1.0,)
        else:
            wear_c = tuple(min(1.0, (0.55 * v + 0.45 * lum) * 1.22 + 0.02) for v in base[:3]) + (1.0,)
        c = nb.mix(nb.maprange(n1, 0.25, 0.75), dark, lite)
        c = nb.mix(nb.maprange(n2, 0.3, 0.7, 0.0, 0.35), c, dark)
        c = nb.mix(nb.maprange(n3, 0.3, 0.7, 0.0, 0.30), c, wear_c)
        if fade > 0:
            # sun fading toward the head (the top of the spine faced the room light for years)
            faded = tuple(min(1.0, (0.62 * v + 0.38 * lum) * 1.10) for v in base[:3]) + (1.0,)
            sxyzA = nb.node('ShaderNodeSeparateXYZ')
            nb.set(sxyzA.inputs['Vector'], uvA)
            ff = nb.maprange(sxyzA.outputs['Y'], 0.45, 1.0, 0.0, fade, smooth=True)
            c = nb.mix(ff, c, faded)
        if ch is not None:
            c = nb.mix(nb.math('MULTIPLY', ch['Blue'], 0.80), c, wear_c)
        crev = nb.maprange(grain, 0.0, 1.0, 0.80, 1.0)
        c = nb.mix(1.0, c, crev, blend='MULTIPLY')
        pressed = None
        if ch is not None and not raised_mode:
            pressed = nb.math('MULTIPLY', ch['Green'], nb.math('SUBTRACT', 1.0, ch['Red'], clamp=True))
            c = nb.mix(nb.math('MULTIPLY', pressed, 0.80), c, tuple(v * 0.55 for v in base[:3]) + (1.0,))
        if sheen > 0:
            # cheap leather sheen: lighter toward grazing angles (instead of the costly Sheen lobe)
            lw = nb.node('ShaderNodeLayerWeight')
            lw.inputs['Blend'].default_value = 0.5
            fac = nb.math('MULTIPLY', nb.math('POWER', lw.outputs['Facing'], 3.0), sheen)
            sheen_c = tuple(min(1.0, (0.7 * v + 0.3 * lum) * 1.45) for v in base[:3]) + (1.0,)
            c = nb.mix(fac, c, sheen_c)
        r = nb.math('MULTIPLY_ADD', nb.math('SUBTRACT', 1.0, grain), 0.12, rough)
        r = nb.math('MULTIPLY_ADD', nb.math('SUBTRACT', n2, 0.5), 0.16, r)
        if ch is not None:
            r = nb.math('MULTIPLY_ADD', ch['Blue'], -0.08, r)
            if pressed is not None:
                r = nb.math('MULTIPLY_ADD', pressed, -0.08, r)
        # height in mm
        gscale = grain_mm
        if ch is not None:
            gscale = nb.math('MULTIPLY_ADD', ch['Red'], -0.75 * grain_mm, grain_mm)
        h = nb.math('MULTIPLY', grain, gscale)
        h = nb.math('MULTIPLY_ADD', wrink, 0.05, h)
        h = nb.math('MULTIPLY_ADD', micro, 0.010, h)
        if ch is not None:
            if raised_mode:
                h = nb.math('MULTIPLY_ADD', nb.math('SUBTRACT', ch['Green'], 0.5), relief, h)
                # padded cover: soft pillow toward the edges
                sxyz = nb.node('ShaderNodeSeparateXYZ')
                nb.set(sxyz.inputs['Vector'], uvA)

                def edge_fall(c_):
                    t_ = nb.math('ABSOLUTE', nb.math('MULTIPLY_ADD', c_, 2.0, -1.0))
                    return nb.math('SUBTRACT', 1.0, nb.math('POWER', t_, 6.0), clamp=True)
                pil = nb.math('MULTIPLY', edge_fall(sxyz.outputs['X']), edge_fall(sxyz.outputs['Y']))
                h = nb.math('MULTIPLY_ADD', pil, 0.9, h)
            else:
                h = nb.math('MULTIPLY_ADD', ch['Green'], -0.16, h)
        nrm = nb.bump(h, 0.001, 1.0)
        leather = nb.principled(Base_Color=c, Roughness=r, Specular_IOR_Level=0.58, Normal=nrm)
        if ch is None:
            nb.out(leather.outputs[0])
            return m
        gr = nb.math('MULTIPLY_ADD', micro, 0.06, gold_rough)
        gold_b = nb.principled(Base_Color=gold, Metallic=1.0, Roughness=gr, Normal=nrm)
        fac = nb.maprange(ch['Red'], 0.08, 0.80)
        nb.out(nb.mixshader(fac, leather.outputs[0], gold_b.outputs[0]))
        return m

    def paper_material(name, base_srgb=(226, 208, 170), gilt=False):
        """page block: signature groups ~1.5 mm apart (slightly wavy, uneven tone), sub-pixel
        sheet lines, a little dust"""
        m = bpy.data.materials.new(name)
        nb = NB(m)
        tc = nb.texcoord()
        ob = tc.outputs['Object']
        wv = nb.node('ShaderNodeTexWave', wave_type='BANDS', bands_direction='X', wave_profile='SAW')
        nb.set(wv.inputs['Vector'], ob)
        wv.inputs['Scale'].default_value = 209.0          # period 0.314/scale m = 1.5 mm
        wv.inputs['Distortion'].default_value = 3.0
        wv.inputs['Detail'].default_value = 2.0
        wv.inputs['Detail Scale'].default_value = 0.05
        line = nb.maprange(wv.outputs['Fac'], 0.0, 0.35, 1.0, 0.0, smooth=True)
        sx = nb.node('ShaderNodeSeparateXYZ')
        nb.set(sx.inputs['Vector'], ob)
        n1 = nb.node('ShaderNodeTexNoise', noise_dimensions='1D')
        nb.set(n1.inputs['W'], nb.math('MULTIPLY', sx.outputs['X'], 650.0))
        n1.inputs['Detail'].default_value = 1.0
        n2 = nb.node('ShaderNodeTexNoise', noise_dimensions='1D')
        nb.set(n2.inputs['W'], nb.math('MULTIPLY', sx.outputs['X'], 7000.0))
        n2.inputs['Detail'].default_value = 0.0
        base = srgb2lin(base_srgb) + (1.0,)
        shade = nb.math('MULTIPLY_ADD', line, -0.16, 1.0)
        shade = nb.math('MULTIPLY', shade, nb.maprange(n1.outputs['Fac'], 0.3, 0.7, 0.94, 1.04))
        shade = nb.math('MULTIPLY', shade, nb.maprange(n2.outputs['Fac'], 0.3, 0.7, 0.95, 1.03))
        c = nb.mix(1.0, base, shade, blend='MULTIPLY')
        if gilt:
            p = nb.principled(Base_Color=c, Metallic=1.0, Roughness=nb.maprange(line, 0.0, 1.0, 0.30, 0.45))
        else:
            dmap = nb.mapping(ob, scale=(1 / 0.4, 1 / 0.4, 1 / 0.4))
            du = nb.image(get_dust(), dmap).outputs['Color']
            c = nb.mix(nb.math('MULTIPLY', du, 0.35), c, (0.80, 0.78, 0.74, 1.0))
            p = nb.principled(Base_Color=c, Roughness=0.80, Specular_IOR_Level=0.3)
        nb.out(p.outputs[0])
        return m

    def headband_material():
        m = bpy.data.materials.new('headband')
        nb = NB(m)
        tc = nb.texcoord()
        w = nb.node('ShaderNodeTexWave', wave_type='BANDS', bands_direction='X')
        nb.set(w.inputs['Vector'], tc.outputs['Object'])
        w.inputs['Scale'].default_value = 900.0
        st = nb.maprange(w.outputs['Fac'], 0.45, 0.55)
        c = nb.mix(st, srgb2lin((120, 40, 38)) + (1,), srgb2lin((222, 205, 170)) + (1,))
        p = nb.principled(Base_Color=c, Roughness=0.55)
        nb.out(p.outputs[0])
        return m

    def wood_material(name, prefix, mapping_loc, mapping_rot, mapping_scale, tint=(1, 1, 1, 1),
                      coat=0.25, bump_img=None, bump_mm=0.0, dust=0.0, rough_mul=1.0):
        m = bpy.data.materials.new(name)
        nb = NB(m)
        tc = nb.texcoord()
        uv = nb.mapping(tc.outputs['Object'], loc=mapping_loc, rot=mapping_rot, scale=mapping_scale)
        ci = nb.image(load_img(f'{prefix}_col.png'), uv)
        ri = nb.image(load_img(f'{prefix}_rough.png', 'Non-Color'), uv)
        c = nb.mix(1.0, ci.outputs['Color'], tint, blend='MULTIPLY')
        rgh = nb.math('MULTIPLY', ri.outputs['Color'], rough_mul)
        if dust > 0:
            dmap = nb.mapping(tc.outputs['Object'], loc=(0.31, 0.17, 0), scale=(1 / 0.4, 1 / 0.4, 1))
            du = nb.math('MULTIPLY', nb.image(get_dust(), dmap).outputs['Color'], dust)
            c = nb.mix(du, c, (0.62, 0.60, 0.57, 1.0))
            rgh = nb.math('MULTIPLY_ADD', du, 0.5, rgh)
        nrm = None
        if bump_img is not None:
            nrm = nb.bump(nb.math('MULTIPLY', bump_img, bump_mm), 0.001, 1.0)
        p = nb.principled(Base_Color=c, Roughness=rgh, Specular_IOR_Level=0.6, Normal=nrm)
        nb.out(p.outputs[0])
        return m, nb, p

    # -------------------------------------------------------------- book builder
    def build_book(name, T, H, D, mat_leather, mat_pages, mat_hb, parent, bands=True,
                   cover_mat=None, sag=None):
        root = empty(name, parent=parent)
        pts, L, b = spine_profile(T)
        if sag is not None:
            # rescale sagitta (flatter spine)
            pts = [(x, y * sag / b if y < 0 else y) for x, y in pts]
            b = sag
        w = T - 0.0008
        Ltot = L[-1]
        nu = len(pts)
        normals = []
        for j in range(nu):
            p0 = pts[max(j - 1, 0)]
            p1 = pts[min(j + 1, nu - 1)]
            tx, ty = p1[0] - p0[0], p1[1] - p0[1]
            ln = math.hypot(tx, ty)
            normals.append((ty / ln, -tx / ln))
        # z rows (mm from head): dense around bands and head/tail
        tmm = set()
        t = 0.0
        while t <= 240.0 * H / BOOK_H + 1e-6:
            tmm.add(round(t, 3))
            t += 1.6
        Hmm = H * 1000
        for k in range(0, 31):
            tmm.add(round(k * 0.1, 3))
            tmm.add(round(Hmm - k * 0.1, 3))
        if bands:
            for bc in BANDS_MM:
                for k in range(-24, 25):
                    tmm.add(round(bc + k * 0.15, 3))
        tmm = sorted(v for v in tmm if 0 <= v <= Hmm)
        verts, uvs, uvm = [], [], []
        for tv in tmm:
            disp = 0.0
            if bands:
                for bc in BANDS_MM:
                    dd = (tv - bc) / BAND_HW
                    if abs(dd) < 1:
                        disp += BAND_HT * math.cos(math.pi / 2 * dd) ** 2
            cap = 0.0
            edge = min(tv, Hmm - tv)
            if edge < 1.6:
                cap = 0.65 * (1 - edge / 1.6) ** 2
            z = H - tv / 1000.0
            for j, (x, y) in enumerate(pts):
                a = abs(2 * x / w)
                k = max(0.0, min(1.0, (1 - a) / 0.09)) ** 0.5
                d = (disp * k - cap) / 1000.0
                nx, ny = normals[j]
                verts.append((x + nx * d, y + ny * d, z))
                uvs.append((L[j] / Ltot, z / H))
                uvm.append((L[j], z))
        faces = []
        nr = len(tmm)
        for i in range(nr - 1):
            for j in range(nu - 1):
                a0 = i * nu + j
                b0 = (i + 1) * nu + j
                # rows go from head (top) downwards -> flip winding so normals point outwards
                faces.append((a0, b0, b0 + 1, a0 + 1))
        sp = mesh_obj(name + '_spine', verts, faces, uv=uvs, smooth=True, mat=mat_leather, parent=root, uv2=uvm)
        so = sp.modifiers.new('Solid', 'SOLIDIFY')
        so.thickness = 0.0012
        so.offset = -1.0
        so.use_even_offset = False
        so.use_quality_normals = False
        # boards
        yb0 = 0.0042
        for side in (-1, 1):
            if side < 0:
                x0, x1 = -T / 2, -T / 2 + BOARD
            else:
                x0, x1 = T / 2 - BOARD, T / 2
            v, f = box(x0, x1, yb0, D - b, 0.0, H)
            uvm = [(vv[1] + (0.31 if side < 0 else 0.77) + vv[0] * 0.5, vv[2]) for vv in v]
            if cover_mat is not None:
                # front cover = left board; UV: u from spine side? (viewer facing +x sees spine on the right)
                if side < 0:
                    uv = [((D - b - vv[1]) / (D - b - yb0), vv[2] / H) for vv in v]
                else:
                    uv = [((vv[1] - yb0) / (D - b - yb0), vv[2] / H) for vv in v]
                bd = mesh_obj(name + ('_boardL' if side < 0 else '_boardR'), v, f, uv=uv, smooth=False,
                              mat=cover_mat, parent=root, uv2=uvm)
            else:
                uv = [(-0.5, -0.5)] * len(v)
                bd = mesh_obj(name + ('_boardL' if side < 0 else '_boardR'), v, f, uv=uv, smooth=False,
                              mat=mat_leather, parent=root, uv2=uvm)
            bevel(bd, 0.0011, 3)
        # page block
        px = T / 2 - BOARD - 0.00015
        v, f = box(-px, px, 0.0010, D - b - SQUARE, SQUARE, H - SQUARE)
        pg = mesh_obj(name + '_pages', v, f, smooth=False, mat=mat_pages, parent=root)
        bevel(pg, 0.0005, 2)
        # headbands (top and bottom)
        if mat_hb is not None:
            for zc in (H - SQUARE + 0.0002, SQUARE - 0.0002):
                n = 10
                rad = 0.0011
                vv, ff = [], []
                for s_ in (-px + 0.0004, px - 0.0004):
                    for k in range(n):
                        an = 2 * math.pi * k / n
                        vv.append((s_, 0.0030 + rad * math.cos(an), zc + rad * math.sin(an)))
                for k in range(n):
                    k2 = (k + 1) % n
                    ff.append((k, k2, n + k2, n + k))
                mesh_obj(name + '_hb', vv, ff, smooth=True, mat=mat_hb, parent=root)
        return root, b

    # -------------------------------------------------------------- materials (instances)
    mat_pages = paper_material('pages_cream')
    mat_gilt = paper_material('pages_gilt', base_srgb=(226, 178, 102), gilt=True)
    mat_hb = headband_material()

    # leather tone: very light, faded, dusty rose-red with a light tan undertone
    # (HSV h ~19 deg, s ~0.19; judged by pixel sampling of the render, not by eye)
    LEATHER_SRGB = (212, 153, 125)
    rnd = np.random.default_rng(2024)

    # -------------------------------------------------------------- world / room
    world = bpy.data.worlds.new('room')
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.30, 0.33, 0.38, 1)     # slightly cool room/sky ambience
    bg.inputs['Strength'].default_value = WORLD_STRENGTH

    # desk
    desk_mat, _, _ = wood_material('walnut_desk', 'walnut', (0.5, 0.42, 0), (0, 0, 0), (1 / 1.6, 1 / 0.8, 1),
                                   tint=(0.40, 0.42, 0.48, 1), coat=0.30, dust=0.55)
    v, f = box(-1.2, 1.2, -0.75, 0.80, -0.04, 0.0)
    desk = mesh_obj('desk', v, f, smooth=False, mat=desk_mat)
    bevel(desk, 0.004, 4)

    # raised walnut step behind the books (the rahle stands on it): tall enough that its edge and
    # the rahle's feet clear the book tops in frame
    STEP_Y0, STEP_Y1 = 0.255, 0.62
    SX0, SX1 = -0.150, 0.180     # a walnut riser, narrower in frame than the row so only its top shows
    step_mat, _, _ = wood_material('walnut_step', 'walnut', (0.2, 0.15, 0), (0, 0, 0), (1 / 1.6, 1 / 0.8, 1),
                                   tint=(0.78, 0.76, 0.75, 1), coat=0.30, dust=0.35)
    v, f = box(SX0, SX1, STEP_Y0, STEP_Y1, 0.0, STEP_H - 0.004)
    step = mesh_obj('step', v, f, smooth=False, mat=step_mat)
    bevel(step, 0.004, 4)
    # an overhanging moulded top board
    v, f = box(SX0 - 0.008, SX1 + 0.008, STEP_Y0 - 0.010, STEP_Y1 + 0.004, STEP_H - 0.018, STEP_H)
    lip = mesh_obj('step_lip', v, f, smooth=False, mat=step_mat)
    bevel(lip, 0.004, 5)

    # back wall (warm greige plaster, large soft mottling + fine trowel texture)
    wall_mat = bpy.data.materials.new('plaster')
    nb = NB(wall_mat)
    tc = nb.texcoord()
    n1 = nb.noise(tc.outputs['Object'], 2.0, 3.0, 0.55)        # ~0.5 m blotches
    n2 = nb.noise(tc.outputs['Object'], 9.0, 2.0, 0.6)
    n3 = nb.noise(tc.outputs['Object'], 70.0, 2.0, 0.6)
    base = srgb2lin((206, 192, 172)) + (1,)
    sh = nb.maprange(n1, 0.3, 0.7, 0.955, 1.04)
    sh = nb.math('MULTIPLY', sh, nb.maprange(n2, 0.3, 0.7, 0.985, 1.015))
    sh = nb.math('MULTIPLY', sh, nb.maprange(n3, 0.3, 0.7, 0.985, 1.015))
    c = nb.mix(1.0, base, sh, blend='MULTIPLY')
    p = nb.principled(Base_Color=c, Roughness=0.92, Specular_IOR_Level=0.3)
    nb.out(p.outputs[0])
    v, f = box(-2.5, 2.5, WALL_Y, WALL_Y + 0.05, -0.1, 3.0)
    wall_obj = mesh_obj('wall', v, f, smooth=False, mat=wall_mat)

    # -------------------------------------------------------------- books in a row
    row = empty('RisaleRow', loc=(-0.005, 0.0, 0.0), rot=(0, 0, math.radians(ROW_ANGLE)))
    Ts = [book_T(r) for _, r, _ in BOOKS]
    gaps = [float(rnd.uniform(0.0004, 0.0011)) for _ in BOOKS]
    total = sum(Ts) + sum(gaps[:-1])
    xcur = -total / 2
    book_roots = []
    book_objs = {}
    for i, (title, ratio, hl) in enumerate(BOOKS):
        T = Ts[i]
        img = load_img(f'spine_{i:02d}.png', 'Non-Color')
        jit = rnd.uniform(-1, 1, 3)
        # per-volume leather variation: about +-3.5 % in value, slight hue drift
        val = 1.0 + 0.035 * jit[0]
        tone = (min(255, LEATHER_SRGB[0] * val + 1.5 * jit[1]), min(255, LEATHER_SRGB[1] * val + 2.0 * jit[2]),
                min(255, LEATHER_SRGB[2] * val + 2.0 * jit[2] - 1.0 * jit[1]))
        mat = leather_material(f'leather_{i:02d}', img, tone, seed=float(i) * 0.37 + 0.11,
                               fade=float(0.10 + 0.08 * abs(jit[1])))
        root, b = build_book(f'Risale_{i:02d}', T, BOOK_H, BOOK_D, mat, mat_pages, mat_hb, row)
        cx = xcur + T / 2
        xcur += T + gaps[i]
        yoff = float(rnd.uniform(-0.0012, 0.0012))
        if i == MEKTUBAT_INDEX:
            yoff = -MEKTUBAT_PULL
        root.location = (cx, yoff + b, 0.0)
        root.rotation_euler = (0.0, math.radians(float(rnd.uniform(-0.08, 0.08))), math.radians(float(rnd.uniform(-0.35, 0.35))))
        if i == MEKTUBAT_INDEX:
            root.rotation_euler = (0.0, 0.0, math.radians(0.8))
        book_roots.append(root)
        book_objs[i] = list(root.children)
    # focus target on the Mektubat spine (title area)
    mek = book_roots[MEKTUBAT_INDEX]
    _, _, bm = spine_profile(Ts[MEKTUBAT_INDEX])
    focus = empty('FocusTarget', loc=(0.0, -bm - 0.0005, 0.130), parent=mek)

    # camera-invisible black flags (photographer's flags): one just above the heads takes about a
    # stop off the page tops, one beside Sozler keeps its exposed board from out-shining the spines
    flag_mat = bpy.data.materials.new('flag_black')
    flag_mat.use_nodes = True
    flag_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.01, 0.01, 0.01, 1)
    flag_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0
    flags = []
    v, f = box(-total / 2 - 0.02, total / 2 + 0.02, 0.030, 0.19, BOOK_H + 0.045, BOOK_H + 0.047)
    flags.append(mesh_obj('flag_heads', v, f, smooth=False, mat=flag_mat, parent=row))
    v, f = box(-total / 2 - 0.040, -total / 2 - 0.038, 0.004, 0.19, 0.0, 0.30)
    flags.append(mesh_obj('flag_sozler', v, f, smooth=False, mat=flag_mat, parent=row))
    for fl in flags:
        fl.visible_camera = False
        fl.visible_glossy = False
        fl.visible_transmission = False
        fl.visible_volume_scatter = False

    # -------------------------------------------------------------- rahle + mushaf
    rahle = empty('Rahle', loc=RAHLE_LOC + (STEP_H,), rot=(0, 0, math.radians(RAHLE_YAW)))
    outer, holes = rahle_leaf_shape()
    carve_img = load_img('rahle_carve.png', 'Non-Color')
    rah_mat = bpy.data.materials.new('walnut_rahle')
    nb = NB(rah_mat)
    tc = nb.texcoord()
    Ltex = RAHLE_LEG + RAHLE_ARM + 0.012
    cuv = nb.mapping(tc.outputs['Object'], loc=(0.5, RAHLE_LEG / Ltex, 0), scale=(1 / RAHLE_W, 1 / Ltex, 1))
    cimg = nb.image(carve_img, cuv, ext='EXTEND')
    wuv = nb.mapping(tc.outputs['Object'], loc=(0.31, 0.47, 0), rot=(0, 0, -math.pi / 2), scale=(1 / 0.8, 1 / 0.8, 1))
    ci = nb.image(load_img('walnut2_col.png'), wuv)
    ri = nb.image(load_img('walnut2_rough.png', 'Non-Color'), wuv)
    carve = cimg.outputs['Color']
    groove_dark = nb.maprange(carve, 0.15, 0.55, 0.45, 1.0)      # old wax/grime in the carving
    c = nb.mix(1.0, ci.outputs['Color'], RAHLE_TINT, blend='MULTIPLY')
    c = nb.mix(1.0, c, groove_dark, blend='MULTIPLY')
    nrm = nb.bump(nb.math('MULTIPLY', carve, 2.2), 0.001, 1.0)
    p = nb.principled(Base_Color=c, Roughness=nb.math('ADD', ri.outputs['Color'], 0.10), Specular_IOR_Level=0.45,
                      Normal=nrm)
    nb.out(p.outputs[0])

    def leaf_obj(name):
        cu = bpy.data.curves.new(name, 'CURVE')
        cu.dimensions = '2D'
        cu.fill_mode = 'BOTH'
        cu.extrude = RAHLE_E
        cu.bevel_depth = RAHLE_BEV
        cu.bevel_resolution = 3
        cu.resolution_u = 1
        for poly_ in [outer] + holes:
            sp = cu.splines.new('POLY')
            sp.points.add(len(poly_) - 1)
            for k, (x, y) in enumerate(poly_):
                sp.points[k].co = (x, y, 0.0, 1.0)
            sp.use_cyclic_u = True
            sp.use_smooth = True
        cu.materials.append(rah_mat)
        ob = bpy.data.objects.new(name, cu)
        return link(ob, rahle)

    phi = RAHLE_PHI
    tb_half = RAHLE_E + RAHLE_BEV
    Cz = RAHLE_LEG * math.cos(phi) + RAHLE_BEV
    leafA = leaf_obj('rahle_leaf_back')     # leg front-bottom, arm back-top (book rests on it)
    leafA.location = (0, 0, Cz)
    leafA.rotation_euler = (math.pi / 2 - phi, 0, 0)
    leafB = leaf_obj('rahle_leaf_front')    # leg back-bottom, arm front-top
    leafB.location = (0, 0, Cz)
    leafB.rotation_euler = (math.pi / 2 + phi, 0, 0)
    # tiny offset so the two leaves interlock visually instead of z-fighting
    leafA.location.x += 0.0
    # mushaf on the back arm
    cover_img = load_img('mushaf_cover.png', 'Non-Color')
    IVORY = (242, 232, 208)       # pearl / ivory leather
    MGOLD = (0.80, 0.50, 0.15, 1)
    cover_mat = leather_material('mushaf_cover', cover_img, IVORY, seed=7.7, sheen=0.12, rough=0.36,
                                 wear_srgb=(246, 242, 232), gold=MGOLD, raised_mode=True, gold_rough=0.21,
                                 relief=1.8, grain_mm=0.05)
    msp_img = load_img('mushaf_spine.png', 'Non-Color')
    msp_mat = leather_material('mushaf_spine', msp_img, IVORY, seed=8.1, sheen=0.12, rough=0.36,
                               gold=MGOLD, gold_rough=0.21, grain_mm=0.05)
    mush_root, mb = build_book('Mushaf', MUSHAF_T, MUSHAF_H, MUSHAF_D, msp_mat, mat_gilt, mat_hb,
                               rahle, bands=False, cover_mat=cover_mat, sag=0.0035)
    dirA = Vector((0, math.sin(phi), math.cos(phi)))
    nA = Vector((0, -math.cos(phi), math.sin(phi)))
    c2, s2 = math.cos(2 * phi), math.sin(2 * phi)
    t0 = (tb_half + (tb_half + MUSHAF_T) * c2) / s2 + 0.002
    C = Vector((0, 0, Cz))
    # local axes: z->dirA, x-> -nA, y -> -world x
    xa = -nA
    za = dirA
    ya = za.cross(xa)
    R = Matrix((xa, ya, za)).transposed()
    origin = C + nA * (tb_half + 0.0006 + MUSHAF_T / 2) + dirA * t0
    # centre the book across the rahle (local y spans [-b, D-b]; local y = -world x)
    origin += Vector((1, 0, 0)) * ((MUSHAF_D / 2) - mb)
    mush_root.matrix_basis = Matrix.Translation(origin) @ R.to_4x4()

    # -------------------------------------------------------------- camera (needed by the reflector placement)
    camd = bpy.data.cameras.new('Camera')
    camd.lens = CAM_LENS
    camd.sensor_fit = 'VERTICAL'
    camd.sensor_height = 36.0
    camd.sensor_width = 36.0
    camd.clip_start = 0.05
    camd.clip_end = 20.0
    camd.dof.use_dof = True
    camd.dof.focus_object = focus
    camd.dof.aperture_fstop = CAM_FSTOP
    camd.dof.aperture_blades = 7
    camd.dof.aperture_rotation = math.radians(12)
    cam = bpy.data.objects.new('Camera', camd)
    link(cam)
    scene.camera = cam
    target = Vector(CAM_TARGET)
    p_start = Vector(CAM_P0)
    p_end = Vector(CAM_P1)
    p_mid = (p_start + p_end) / 2
    rotq = (target - p_mid).to_track_quat('-Z', 'Y')
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = rotq
    # motorised slider: the clip is cut in mid-move (non-zero start velocity) and the carriage
    # eases out to a near stop at frame 150. Straight line, fixed orientation, a key on every
    # frame with linear interpolation so the profile is exact.
    NF = 150
    vel = []
    for k in range(NF - 1):
        t = (k + 0.5) / (NF - 1)
        e = min(max((t - 0.22) / 0.78, 0.0), 1.0)
        vel.append(0.04 + 0.96 * (1.0 - e * e * (3 - 2 * e)))
    cum = [0.0]
    for v_ in vel:
        cum.append(cum[-1] + v_)
    for k in range(NF):
        cam.location = p_start.lerp(p_end, cum[k] / cum[-1])
        cam.keyframe_insert('location', frame=k + 1)
    ad = cam.animation_data.action
    try:
        fcurves = ad.fcurves
    except AttributeError:
        fcurves = [fc for layer in ad.layers for strip in layer.strips for cb in strip.channelbags for fc in cb.fcurves]
    for fc in fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'
        fc.update()

    # -------------------------------------------------------------- lights
    def area(name, loc, target, size, size_y, energy, temp=None, color=(1, 1, 1), spread=180.0, glossy_only=False):
        ld = bpy.data.lights.new(name, 'AREA')
        ld.shape = 'RECTANGLE'
        ld.size = size
        ld.size_y = size_y
        ld.energy = energy
        ld.spread = math.radians(spread)
        if temp:
            ld.use_temperature = True
            ld.temperature = temp
        ld.color = color
        ob = bpy.data.objects.new(name, ld)
        ob.location = loc
        d = Vector(target) - Vector(loc)
        ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        ob.visible_camera = False
        if glossy_only:
            # reflector card: only seen by glossy closures (gold foil, leather sheen, varnish)
            ob.visible_diffuse = False
            ob.visible_transmission = False
            ob.visible_volume_scatter = False
        link(ob)
        return ob

    def coll(name, objs):
        c_ = bpy.data.collections.new(name)
        for o in objs:
            c_.objects.link(o)
        return c_

    def link_to(light, collection):
        try:
            light.light_linking.receiver_collection = collection
        except Exception as e:
            print('light linking unavailable', e)

    quran_objs = set(c for c in mush_root.children) | {leafA, leafB}
    geo = [o for o in bpy.data.objects if o.type in ('MESH', 'CURVE') and o not in flags]
    main_set = coll('MainSet', [o for o in geo if o not in quran_objs and not o.name.startswith('gobo')])
    # the window key and the bounce are flagged off the back wall (its level is set by the
    # window-side wall light, the sun patch and room ambience)
    nowall_set = coll('NoWallSet', [o for o in geo if o not in quran_objs and o is not wall_obj and not o.name.startswith('gobo')])
    quran_set = coll('QuranSet', list(quran_objs))
    books_set = coll('BooksSet', [o for i in book_objs for o in book_objs[i]])
    mek_set = coll('MektubatSet', book_objs[MEKTUBAT_INDEX])
    qk_set = coll('QuranKeyReceivers', list(quran_objs) + [wall_obj, step, lip])
    wall_set = coll('WallOnly', [wall_obj])
    bpy.context.view_layer.update()

    # window key: a window-sized soft source in front of the row plane (about 56 deg off the spine
    # normal) so the spines are lit across their faces and Mektubat's shadow stays a short soft strip
    key = area('WindowKey', KEY_LOC, (0.0, 0.05, 0.12), 1.2, 1.6, KEY_W, temp=KEY_K, spread=45.0)
    link_to(key, nowall_set)    # the Quran set has its own (flagged) window light
    # big white bounce / V-flat camera-right: fills the shadow halves of the spines (all receivers)
    fill = area('BounceRight', FILL_LOC, (0.0, 0.05, 0.14), 2.0, 1.5, FILL_W, temp=6800)
    link_to(fill, coll('FillReceivers', [o for o in geo if o is not wall_obj and not o.name.startswith('gobo')]))
    # soft kicker on Mektubat only (+~0.4 EV over its neighbours)
    mekw = mek.matrix_world @ Vector((0.0, -0.01, 0.13))
    kick = area('MektubatKicker', KICK_LOC, tuple(mekw), 0.30, 0.45, KICK_W, temp=5200, spread=60.0)
    link_to(kick, mek_set)
    # reflector cards for the spines. A vertical spine seen from above mirrors the desk in front
    # of it (the mirror ray keeps the downward view angle), so the card lies almost flat on the desk
    # between camera and books, out of frame, like a white card a photographer would lay there.
    a_ = math.radians(ROW_ANGLE)
    nsp = Vector((math.sin(a_), -math.cos(a_), 0.0))
    sp_pt = mek.matrix_world @ Vector((0.0, 0.0, 0.13))
    vv = (p_mid - sp_pt).normalized()
    rr = 2 * vv.dot(nsp) * nsp - vv
    def desk_hit(z_on_spine):
        pt = Vector((sp_pt.x, sp_pt.y, z_on_spine))
        t_ = (z_on_spine - 0.012) / max(-rr.z, 1e-3)
        return pt + rr * t_
    c_hot = desk_hit(0.135)
    c_far, c_near = desk_hit(0.225), desk_hit(0.045)
    c_big = (c_far + c_near) / 2
    len_big = (c_far - c_near).length
    inward = Vector((-rr.x, -rr.y, 0.0)).normalized()
    card = area('SpecCardBooks', (c_big.x + 0.10, c_big.y, 0.012), (c_big.x + 0.10 + inward.x * 0.36, c_big.y + inward.y * 0.36, 1.0),
                1.1, len_big, CARD_W, temp=4600, glossy_only=True)
    hot = area('SpecCardHot', (c_hot.x + 0.10, c_hot.y, 0.014), (c_hot.x + 0.10 + inward.x * 0.36, c_hot.y + inward.y * 0.36, 1.0),
               0.8, 0.30, HOT_W, temp=4400, glossy_only=True)
    link_to(card, books_set)
    link_to(hot, books_set)
    print('spine mirror dir', tuple(round(x_, 3) for x_ in rr), 'card centre', tuple(round(x_, 3) for x_ in c_big), 'len', round(len_big, 3))
    # Quran set: its own soft window light (lets the ivory sit ~0.5 stop above the books without
    # clipping) that also reaches the wall and step, so the stand and Mushaf cast real shadows
    mcen = mush_root.matrix_world @ Vector((0.0, (MUSHAF_D / 2) - mb, MUSHAF_H * 0.5))
    qkey = area('QuranKey', QK_LOC, tuple(mcen), 0.7, 0.7, QK_W, temp=4200, spread=80.0)
    link_to(qkey, qk_set)
    # reflector for the Mushaf gold, in the cover's mirror direction (up toward the window side)
    ncov = (mush_root.matrix_world.to_3x3() @ Vector((-1.0, 0.0, 0.0))).normalized()
    cov_pt = mush_root.matrix_world @ Vector((-MUSHAF_T / 2, (MUSHAF_D / 2) - mb, MUSHAF_H * 0.5))
    vm = (p_mid - cov_pt).normalized()
    rm = 2 * vm.dot(ncov) * ncov - vm
    mcard_loc = cov_pt + rm * 0.85
    mcard = area('SpecCardMushaf', tuple(mcard_loc), tuple(cov_pt), 0.9, 0.9, MCARD_W, temp=5600, glossy_only=True)
    link_to(mcard, quran_set)
    print('mushaf normal', tuple(round(x_, 3) for x_ in ncov), 'mirror', tuple(round(x_, 3) for x_ in rm))
    # broad window-side light on the wall: falls off from left to right (replaces a centred wash)
    wgrad = area('WallGrad', WG_LOC, (0.30, WALL_Y, 0.55), 1.0, 1.4, WG_W, temp=5300, spread=100.0)
    link_to(wgrad, wall_set)
    # low sun through the window: warm patch with soft mullion shadows on the wall
    sund = bpy.data.lights.new('Sun', 'SUN')
    sund.energy = SUN_W
    sund.angle = math.radians(1.5)
    sund.use_temperature = True
    sund.temperature = 3300
    sun = bpy.data.objects.new('Sun', sund)
    sdir = Vector(SUN_DIR).normalized()
    sun.rotation_euler = sdir.to_track_quat('-Z', 'Y').to_euler()
    link(sun)
    # window gobo (frame with a cross mullion) between sun and room
    gobo_mat = bpy.data.materials.new('gobo')
    gobo_mat.use_nodes = True
    gobo_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.05, 0.04, 0.035, 1)
    gx = -1.05
    oy0, oy1, oz0, oz1 = GOBO_OPEN
    my, mz = (oy0 + oy1) / 2 + 0.01, (oz0 + oz1) / 2 + 0.03
    pieces = [
        (gx - 0.02, gx, -3.0, oy0, -1.0, 4.0),      # wall left of opening (toward camera)
        (gx - 0.02, gx, oy1, 4.0, -1.0, 4.0),       # wall right of opening
        (gx - 0.02, gx, oy0, oy1, -1.0, oz0),       # below sill
        (gx - 0.02, gx, oy0, oy1, oz1, 4.0),        # above
        (gx - 0.03, gx, my - 0.022, my + 0.022, oz0, oz1),   # vertical mullion
        (gx - 0.03, gx, oy0, oy1, mz - 0.018, mz + 0.018),   # transom
    ]
    for k, pc in enumerate(pieces):
        v, f = box(*pc)
        g = mesh_obj(f'gobo_{k}', v, f, smooth=False, mat=gobo_mat)
        g.visible_camera = False
        g.visible_glossy = False
        g.visible_diffuse = False   # only blocks the sun (shadow rays)

    # -------------------------------------------------------------- render settings
    r = scene.render
    r.engine = 'CYCLES'
    r.resolution_x = 1080
    r.resolution_y = 1920
    r.resolution_percentage = 100
    r.fps = 30
    r.fps_base = 1.0
    scene.frame_start = 1
    scene.frame_end = 150
    r.use_persistent_data = True
    r.film_transparent = False
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGB'
    r.image_settings.color_depth = '8'
    r.image_settings.compression = 15
    r.filepath = os.path.join(ROOT, 'frames', 'endcard_')
    cy = scene.cycles
    cy.device = 'CPU'
    cy.samples = RENDER_SPP     # see NOTES.md for the measured s/frame at 1080x1920 on this 4-core box
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.03
    cy.adaptive_min_samples = 0
    cy.use_denoising = True
    cy.denoiser = 'OPENIMAGEDENOISE'
    cy.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    cy.denoising_prefilter = 'ACCURATE'
    try:
        cy.denoising_quality = 'BALANCED'
    except Exception:
        pass
    cy.seed = 1907
    cy.use_animated_seed = False
    cy.max_bounces = 5
    cy.diffuse_bounces = 3
    cy.glossy_bounces = 2
    cy.transmission_bounces = 0
    cy.transparent_max_bounces = 2
    cy.volume_bounces = 0
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.blur_glossy = 0.6
    cy.sample_clamp_direct = 0.0
    cy.sample_clamp_indirect = 4.0
    cy.use_light_tree = False
    cy.pixel_filter_type = 'BLACKMAN_HARRIS'
    cy.filter_width = 1.7
    cy.texture_limit_render = 'OFF'
    scene.render.threads_mode = 'AUTO'
    vs = scene.view_settings
    scene.display_settings.display_device = 'sRGB'
    vs.view_transform = 'AgX'
    vs.look = 'AgX - Base Contrast'
    vs.exposure = VIEW_EXPOSURE
    vs.gamma = 1.0
    try:
        vs.use_white_balance = True
        vs.white_balance_temperature = WB_TEMP
        vs.white_balance_tint = 0.0
    except Exception as e:
        print('white balance unavailable', e)

    # -------------------------------------------------------------- compositor: lens + vignette + grain
    scene.use_nodes = True
    nt = scene.node_tree
    nt.nodes.clear()
    rl = nt.nodes.new('CompositorNodeRLayers')
    rl.location = (-600, 0)
    glare = nt.nodes.new('CompositorNodeGlare')
    glare.glare_type = 'BLOOM'
    glare.location = (-400, 0)
    try:
        glare.inputs['Threshold'].default_value = 0.85
        glare.inputs['Strength'].default_value = 0.05
        glare.inputs['Size'].default_value = 0.45
    except Exception:
        pass
    nt.links.new(rl.outputs['Image'], glare.inputs['Image'])
    lens = nt.nodes.new('CompositorNodeLensdist')
    lens.location = (-200, 0)
    lens.inputs['Distortion'].default_value = 0.0
    lens.inputs['Dispersion'].default_value = 0.006
    try:
        lens.inputs['Fit'].default_value = True
    except Exception:
        lens.use_fit = True
    nt.links.new(glare.outputs['Image'], lens.inputs['Image'])
    vimg = load_img('vignette.png', 'Non-Color')
    vn = nt.nodes.new('CompositorNodeImage')
    vn.image = vimg
    vn.location = (-200, -300)
    mulv = nt.nodes.new('CompositorNodeMixRGB')
    mulv.blend_type = 'MULTIPLY'
    mulv.inputs[0].default_value = 1.0
    mulv.location = (0, 0)
    nt.links.new(lens.outputs['Image'], mulv.inputs[1])
    nt.links.new(vn.outputs['Image'], mulv.inputs[2])
    gimg = bpy.data.images.load(os.path.join(TEX, 'grain_0001.png'))
    gimg.source = 'SEQUENCE'
    gimg.colorspace_settings.name = 'Non-Color'
    gn = nt.nodes.new('CompositorNodeImage')
    gn.image = gimg
    gn.frame_duration = 24
    gn.frame_start = 1
    gn.frame_offset = 0
    gn.use_cyclic = True
    gn.use_auto_refresh = True
    gn.location = (0, -300)
    # the 24 grain plates are re-positioned every frame (random wrap-around offsets, constant
    # interpolation), so no two of the 150 frames share the same grain
    tr = nt.nodes.new('CompositorNodeTranslate')
    tr.location = (100, -300)
    try:
        tr.wrap_axis = 'BOTH'
    except Exception:
        try:
            tr.inputs['Wrap'].default_value = True
        except Exception as e:
            print('translate wrap unavailable', e)
    nt.links.new(gn.outputs['Image'], tr.inputs['Image'])
    rgn = np.random.default_rng(777)
    for fr in range(1, 151):
        tr.inputs['X'].default_value = float(rgn.integers(0, 1080)) if fr > 24 else 0.0
        tr.inputs['Y'].default_value = float(rgn.integers(0, 1920)) if fr > 24 else 0.0
        tr.inputs['X'].keyframe_insert('default_value', frame=fr)
        tr.inputs['Y'].keyframe_insert('default_value', frame=fr)
    try:
        for fc in nt.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = 'CONSTANT'
    except Exception as e:
        print('grain key interpolation', e)
    GRAIN = 0.020      # sigma of multiplicative grain in linear light
    k = GRAIN * 255.0 / 40.0
    ma = nt.nodes.new('CompositorNodeMath')
    ma.operation = 'MULTIPLY_ADD'
    ma.inputs[1].default_value = k
    ma.inputs[2].default_value = 1.0 - (128.0 / 255.0) * k
    ma.location = (200, -300)
    nt.links.new(tr.outputs['Image'], ma.inputs[0])
    mulg = nt.nodes.new('CompositorNodeMixRGB')
    mulg.blend_type = 'MULTIPLY'
    mulg.inputs[0].default_value = 1.0
    mulg.location = (400, 0)
    nt.links.new(mulv.outputs['Image'], mulg.inputs[1])
    nt.links.new(ma.outputs[0], mulg.inputs[2])
    comp = nt.nodes.new('CompositorNodeComposite')
    comp.location = (600, 0)
    nt.links.new(mulg.outputs['Image'], comp.inputs['Image'])

    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'scene.blend'), compress=False)
    print('saved', os.path.join(ROOT, 'scene.blend'))


if __name__ == '__main__':
    try:
        import bpy  # noqa: F401
        in_blender = True
    except ImportError:
        in_blender = False
    if not in_blender:
        gen_textures()
    else:
        args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
        if '--skip-tex' not in args:
            env = {k: v for k, v in os.environ.items() if not k.startswith('PYTHON')}
            subprocess.run(['/usr/local/bin/python3', os.path.abspath(__file__)], check=True, env=env)
        build()
