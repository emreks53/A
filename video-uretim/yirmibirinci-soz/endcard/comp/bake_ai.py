#!/usr/bin/env python3
"""
END CARD comp bake for the PHOTOGRAPH (the client's reading place, ../ai/gen1.png) — ONE command:

    python3 /home/user/work/endcard/comp/bake_ai.py                 # ~25 s, numpy + scipy + pillow
    python3 /home/user/work/endcard/comp/bake_ai.py --look DIR      # + before/after pictures for the eye in DIR
    python3 /home/user/work/endcard/comp/bake.py                    # the FALLBACK: the Blender card (overwrites the same files)

Reads   ../ai/gen1.png   (1152 x 2048, 8-bit sRGB; the only source — no further generation is possible)
Writes  the SAME files as bake.py, next to this script (src/acts/endcard/comp.js fetches them as /endcard/comp/...):
  base.u16   the finished photograph, raw little-endian uint16 RGB, sRGB-encoded 0..65535, 1152 x 2048
  dq.i16     + the warm light on the Qur'an        (signed 16-bit crop, added with weight 0..1)
  da.i16     + the accent on the Sözler volume     (signed 16-bit crop, added with weight 0..1)
  meta.json  "kind": "photo" (endcard.js chooses the photo dissolve / push by it), sizes, crops, positions,
             every parameter and every measured number of this bake

What it does to the photograph, in this order (all in linear light, float):
  1. LEATHER   the four standing volumes and the cover edges of the open book: the dark brick-red leather is
               re-coloured as a different ALBEDO under the same light: every leather pixel is multiplied per
               channel by (target colour / source mid-tone), so the grain, the raised bands, the shading across
               each rounded spine and the contact shadows keep their own contrast exactly. A toe keeps the deep
               gaps deep, a shoulder keeps lit edges below paper white. The cream foil (titles, tooling lines)
               is separated as an alpha (lighter than the local leather AND not leather-coloured) and laid back
               over the new leather, lifted so that the titles stay >= 1.7 x the leather. The mask is a colour
               key inside hand-digitised outlines (below), its edge is a matte: boundary pixels receive the
               extrapolated leather change in proportion to their coverage (no halo, no dark outline).
  2. FLAG      a soft shadow on the desk IN FRONT of the open book (as if the foreground were flagged off):
               it starts in the book's own contact shadow, follows the book's lower outline and takes the desk
               sheen, the desk's front edge and the sun streak down, so that the source text has a calm dark
               ground. Nothing above the book's lower outline is touched.
  3. FRAMING   the photograph is framed higher (rows are cropped at the top) and the nearly black desk front is
               continued at the bottom (synthetic rows: the last rows' colour, decaying, with their own texture).
  4. LIGHTS    two small 2D light deltas (soft masks, warm, a few L*): the Qur'an and the Sözler volume.
"""
import argparse
import hashlib
import json
import os
import sys
import time

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                      # /home/user/work/endcard
SRC = os.path.join(ROOT, 'ai', 'gen1.png')
FW, FH = 1080, 1920

# ------------------------------------------------------------------------------------------------ parameters
# All coordinates are pixels of gen1.png (1152 x 2048) unless a name says otherwise.

FRAMING = dict(
    crop_top=320,          # rows cut at the top (the frame starts here); the same number of rows is synthesised below
    ext_decay=0.55,        # the continued desk front falls to this fraction of its colour at the last row
)

LEATHER = dict(
    target=(53.0, 30.0, 45.0),        # L*, C*, h the spines' mid-tone is sent to
    strength=1.0,                     # 0 = the photograph's own leather, 1 = the target
    toe=(0.0040, 0.0110),             # luminance (linear) where the gain fades in: deep gaps stay deep
    shoulder=(0.50, 3.0),             # soft limit of the graded leather's luminance, and its hardness
    foil_ratio=2.8,                  # titles: foil luminance / new leather luminance (at the title)
    foil_margin=0.22,                 # how much lighter than the local leather a pixel must be to count as foil
    book_strength=0.85,               # the open book's cover edges (in the book's own shadow)
    book_toe=(0.0050, 0.0125),        # ... their toe, higher than the spines': what lies in the deep shadow under the pages stays as it is (lifting it only shows noise)
    key=dict(h=(21.0, 55.0), cl=0.68, c=6.0),
    # the four standing volumes: one outline, the colour key decides inside it
    spines_x=(96, 543), spines_top=867,
    spines_left=[(867, 99.5), (925, 100.5), (1325, 108.5), (1360, 109.0)],      # (y, x): Sözler's left edge against the curtain
    spines_bottom=[(96, 1351), (112, 1353), (135, 1357), (185, 1358), (200, 1354), (206, 1351), (212, 1351),
                   (225, 1355), (255, 1358), (290, 1358), (310, 1355), (320, 1352), (326, 1349), (340, 1353),
                   (360, 1354), (549, 1354)],
    titles=dict(y=(1038, 1084), x=[(116, 190), (216, 314), (330, 424), (450, 526)]),
    names=['Sözler', 'Mektubat', "Lem'alar", 'Şuâlar'],
    spine_mid=[(118, 188), (226, 306), (340, 420), (454, 528)],      # x ranges of the flat middle of each spine
    spine_mid_y=(1110, 1280),
    # the open book: left cover edge, lower cover edges (left / right of the gutter); the ribbon is NOT graded
    book_polys=[
        [(150, 1397), (166, 1397), (165, 1450), (162, 1500), (159, 1560), (156, 1620), (154, 1668), (160, 1677),
         (152, 1696), (135, 1692), (136, 1660), (139, 1600), (142, 1540), (145, 1480), (148, 1420)],
        [(150, 1677), (250, 1672), (350, 1665), (450, 1659), (550, 1652), (624, 1646), (630, 1648), (630, 1662),
         (550, 1666), (450, 1674), (350, 1681), (250, 1687), (150, 1694)],
        [(742, 1640), (800, 1629), (900, 1619), (1000, 1610), (1100, 1600), (1142, 1595),
         (1148, 1604), (1100, 1612), (1000, 1623), (900, 1633), (800, 1644), (742, 1653)],
    ],
    ribbon=[(668, 1590), (706, 1590), (732, 1698), (692, 1698)],
)

FLAG = dict(
    # the lower outline of the open book (cover edge, with the ribbon's tip): the shadow begins under it
    outline=[(0, 1640), (138, 1694), (150, 1697), (400, 1681), (625, 1660), (688, 1664), (698, 1692), (724, 1692),
             (736, 1656), (900, 1633), (1000, 1623), (1100, 1612), (1152, 1606)],
    start=3.0,             # px below the outline where the shadow begins
    feather=96.0,          # px over which it reaches full depth
    ev=2.1,                # depth in stops
    ev_far=0.6,            # a further, slower fall towards the bottom of the photograph (stops over `far`)
    far=330.0,
    sheen=0.50,            # large bright patches (sky sheen, sun streak) are taken down by this power on top
    sheen_ref=0.035,       # ... relative to this luminance (the dark wood)
    sheen_sigma=10.0,
    floor=0.0020,          # luminance below which the photograph's own blacks are kept
)

LIGHTS = dict(
    quran=dict(
        cover=[(775, 540), (808, 536), (1087, 543), (1091, 942), (806, 953), (772, 950)],
        gain=0.50,                     # linear gain on the cover at full weight (+ ~6 L*)
        spill=0.16,                    # gain of the soft pool on the stand and the sill
        pool=(935, 830, 250, 260),     # cx, cy, sigma x, sigma y
        room_y=(928, 962),             # the pool only exists below the window's lower rail (soft edge between)
        tint=(1.035, 1.0, 0.95),       # warm
    ),
    accent=dict(
        gain=0.17,                     # linear gain at the centre of the pool (+ ~4 L*), on the leather only
        pool=(152, 1075, 74, 175),     # centred on the Sözler title, spilling onto Mektubat, fading towards the foot
        tint=(1.02, 1.0, 0.97),
    ),
)

# ------------------------------------------------------------------------------------------------ colour
M_RGB2XYZ = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
WP = np.array([0.95047, 1.0, 1.08883])
LUM = np.array([0.2126729, 0.7151522, 0.0721750])


def s2l(a):
    return np.where(a <= 0.04045, a / 12.92, ((np.maximum(a, 0) + 0.055) / 1.055) ** 2.4)


def l2s(a):
    return np.where(a <= 0.0031308, a * 12.92, 1.055 * np.maximum(a, 0) ** (1 / 2.4) - 0.055)


def lin2lab(lin):
    xyz = lin @ M_RGB2XYZ.T / WP
    f = np.where(xyz > 0.008856, np.cbrt(np.maximum(xyz, 1e-12)), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def lch2lin(L, C, h):
    a, b = C * np.cos(np.radians(h)), C * np.sin(np.radians(h))
    fy = (L + 16) / 116
    f = np.array([fy + a / 500, fy, fy - b / 200])
    xyz = np.where(f > 0.206893, f ** 3, (f - 16 / 116) / 7.787) * WP
    return xyz @ np.linalg.inv(M_RGB2XYZ).T


def lch(lin):
    lab = lin2lab(lin)
    return lab[..., 0], np.hypot(lab[..., 1], lab[..., 2]), np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def poly_mask(shape, pts, ss=4):
    """Anti-aliased polygon coverage 0..1 (pts in pixel coordinates, pixel centres at +0.5)."""
    h, w = shape
    im = Image.new('L', (w * ss, h * ss), 0)
    ImageDraw.Draw(im).polygon([(x * ss, y * ss) for x, y in pts], fill=255)
    return np.asarray(im.resize((w, h), Image.BOX), np.float64) / 255


def disk(r):
    y, x = np.mgrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r + 0.5


def polyline_y(pts, xs):
    px, py = zip(*pts)
    return np.interp(xs, px, py)


# ------------------------------------------------------------------------------------------------ 1. leather
def leather_key(lin, P):
    L, C, h = lch(lin)
    k = P['key']
    return (h > k['h'][0]) & (h < k['h'][1]) & (C / np.maximum(L, 1.0) > k['cl']) & (C > k['c'])


def leather_grade(src, P, info):
    H, W = src.shape[:2]
    Y = src @ LUM
    key = leather_key(src, P)
    yy, xx = np.mgrid[0:H, 0:W]

    # ---- masks (hard): the standing volumes
    x0, x1 = P['spines_x']
    region = (xx >= x0) & (xx <= x1) & (yy >= P['spines_top']) & (yy < polyline_y(P['spines_bottom'], np.arange(W))[None, :])
    ly, lx = zip(*P['spines_left'])
    region &= xx >= np.interp(np.arange(H), ly, lx)[:, None]
    core = key & region
    sp = ndi.binary_closing(core, disk(3), border_value=0) & region      # fills the foil (titles, lines) and the grain speckles
    sp = ndi.binary_opening(sp, disk(1))
    lab, n = ndi.label(sp)
    if n > 1:                                                              # drop islands (window frame behind the books)
        sizes = ndi.sum(sp, lab, np.arange(1, n + 1))
        sp = np.isin(lab, 1 + np.nonzero(sizes > 4000)[0])
    # ---- the open book's cover edges (looser key: they are in the book's own shadow), without the ribbon
    L, C, h = lch(src)
    key2 = (((h < 60) | (h > 340)) & (C / np.maximum(L, 1.0) > 0.5)) | (L < 9)             # reddish or dark: never the paper's edge
    bk = np.zeros((H, W), bool)
    for pts in P['book_polys']:
        bk |= poly_mask((H, W), pts, 2) > 0.5
    bk &= key2 & ~(poly_mask((H, W), P['ribbon'], 2) > 0.02)
    bk = ndi.binary_opening(ndi.binary_closing(bk, disk(3)), disk(1))

    # ---- source mid-tone of the leather -> per-channel albedo ratio
    mids = []
    for (a, b) in P['spine_mid']:
        m = core[P['spine_mid_y'][0]:P['spine_mid_y'][1], a:b]
        px = src[P['spine_mid_y'][0]:P['spine_mid_y'][1], a:b][m]
        yv = px @ LUM
        lo, hi = np.percentile(yv, [35, 85])
        mids.append(px[(yv >= lo) & (yv <= hi)].mean(0))
    mid = np.mean(mids, 0)
    tgt = lch2lin(*P['target'])
    k_full = tgt / mid
    info['source_mid_LCh'] = [round(float(v), 2) for v in np.array(lch(mid))]
    info['albedo_ratio_rgb'] = [round(float(v), 3) for v in k_full]

    def grade(px, strength, toe=P['toe']):
        k = 1 + (k_full - 1) * strength
        y = px @ LUM
        t = smooth((y - toe[0]) / (toe[1] - toe[0]))
        q = px * (1 + (k - 1) * t[..., None])
        yq = np.maximum(q @ LUM, 1e-9)
        ymax, p = P['shoulder']
        ys = yq / (1 + (yq / ymax) ** p) ** (1 / p)
        return q * (ys / yq)[..., None]

    # ---- foil alpha on the spines: lighter than the local leather and not leather-coloured
    bx0, bx1, by0, by1 = x0 - 8, x1 + 8, P['spines_top'] - 8, 1372
    sl = (slice(by0, by1), slice(bx0, bx1))
    Ys, sps, keys = Y[sl], sp[sl], key[sl]
    bg = ndi.percentile_filter(np.where(sps, Ys, np.nan_to_num(np.median(Ys[sps]))), 30, size=15)
    ty0, ty1 = P['titles']['y']
    tsel = np.zeros_like(sps)
    for (a, b) in P['titles']['x']:
        tsel[ty0 - by0:ty1 - by0, a - bx0:b - bx0] = True
    tpix = src[sl][tsel & sps & ~keys]
    ty = tpix @ LUM
    foil = tpix[ty >= np.percentile(ty, 80)].mean(0)                      # the foil's own colour (glyph cores)
    yf = float(foil @ LUM)
    cand = ndi.binary_dilation(sps & ~keys, disk(1)) & sps
    a = np.clip((Ys - (1 + P['foil_margin']) * bg) / np.maximum(yf - (1 + P['foil_margin']) * bg, 1e-6), 0, 1) * cand
    a = np.where(tsel, a, np.minimum(a, 0.85))                             # tooling lines: never a full foil pixel
    # leather under the foil: normalised blur of the clean leather around it
    clean = (sps & keys & ~ndi.binary_dilation(a > 0.05, disk(1))).astype(np.float64)
    den = ndi.gaussian_filter(clean, 2.5) + 1e-6
    lref = np.stack([ndi.gaussian_filter(src[sl][..., c] * clean, 2.5) / den for c in range(3)], -1)
    wa = smooth((a - 0.02) / 0.33)[..., None]
    under = src[sl] * (1 - wa) + lref * wa
    g_under = grade(under, P['strength'])
    # the new foil: the old foil's colour, lifted to foil_ratio x the new leather at the titles
    y_new_leather = float(np.median((grade(lref, P['strength']) @ LUM)[tsel & sps]))
    lift = max(1.0, P['foil_ratio'] * y_new_leather / yf)
    foil_new = foil * (1 + (lift - 1) * P['strength'])
    new_sp = g_under * (1 - a[..., None]) + foil_new * a[..., None]
    info['foil'] = dict(old_LCh=[round(float(v), 1) for v in np.array(lch(foil))], lift=round(lift, 3),
                        new_LCh=[round(float(v), 1) for v in np.array(lch(foil_new))])

    # ---- the change, and its matte: boundary pixels get the extrapolated change in proportion to coverage
    delta = np.zeros_like(src)
    delta[sl] = np.where(sps[..., None], new_sp - src[sl], 0)
    delta += np.where(bk[..., None], grade(src, P['strength'] * P['book_strength'], P['book_toe']) - src, 0)
    hard = (sp | bk).astype(np.float64)
    den = ndi.gaussian_filter(hard, 1.2)
    ext = np.stack([ndi.gaussian_filter(delta[..., c], 1.2) for c in range(3)], -1) / np.maximum(den, 1e-4)[..., None]
    # ... but never more than the pixel's own share: a dark pixel beside a lit leather edge stays dark (ratio of the
    # neighbouring leather, new / old), a light pixel beside a dark leather edge only gets the small additive change
    olds = np.stack([ndi.gaussian_filter(src[..., c] * hard, 1.2) for c in range(3)], -1)
    ratio = (olds + np.stack([ndi.gaussian_filter(delta[..., c], 1.2) for c in range(3)], -1)) / np.maximum(olds, 1e-6)
    mult = src * (ratio - 1)
    ext = np.where(ext >= 0, np.minimum(ext, np.maximum(mult, 0)), np.maximum(ext, np.minimum(mult, 0)))
    f = np.clip(2.0 * ndi.gaussian_filter(hard, 0.9), 0, 1)
    out = src + np.where(hard[..., None] > 0, delta, ext * f[..., None] * (den > 0.02)[..., None])
    return np.maximum(out, 0), dict(spines=sp, book=bk, foil=(np.pad(a, ((by0, H - by1), (bx0, W - bx1)))), key=key)


# ------------------------------------------------------------------------------------------------ 2. flag
def flag(lin, P):
    H, W = lin.shape[:2]
    yb = polyline_y(P['outline'], np.arange(W))[None, :]
    yy = np.arange(H, dtype=np.float64)[:, None]
    d = yy - yb - P['start']
    w = smooth(d / P['feather'])
    ev = P['ev'] * w + P['ev_far'] * smooth((d - P['feather']) / P['far'])
    # large bright patches below the outline (the sky's sheen in the varnish, the sun streak)
    Y = lin @ LUM
    below = (d > -2).astype(np.float64)
    yblur = ndi.gaussian_filter(Y * below, P['sheen_sigma']) / np.maximum(ndi.gaussian_filter(below, P['sheen_sigma']), 1e-3)
    sheen = np.maximum(yblur / P['sheen_ref'], 1.0) ** (-P['sheen'] * w)
    g = 2.0 ** (-ev) * sheen
    # what is already nearly black keeps its own faint texture (monotone: out = g Y + (1 - g) y0 (1 - exp(-Y / y0)))
    y0 = P['floor']
    out = g * Y + (1 - g) * y0 * (1 - np.exp(-Y / y0))
    g = out / np.maximum(Y, 1e-9)
    return lin * g[..., None], g


# ------------------------------------------------------------------------------------------------ 3. framing
def reframe(lin, P, seed=7):
    H, W = lin.shape[:2]
    S = int(P['crop_top'])
    out = np.empty_like(lin)
    out[:H - S] = lin[S:]
    # the continued desk front: the last rows' colour (smoothed along x), decaying, with the rows' own texture
    n = 40
    last = lin[H - n:]
    col = np.stack([ndi.gaussian_filter1d(last[-8:, :, c].mean(0), 30, mode='nearest') for c in range(3)], -1)   # (W, 3)
    lowf = np.stack([ndi.gaussian_filter(last[..., c], 2.5, mode='nearest') for c in range(3)], -1)   # texture = the fine grain only
    tex = last - lowf
    rows = np.arange(S)
    decay = 1 + (P['ext_decay'] - 1) * smooth(rows / max(S - 1, 1))
    rng = np.random.default_rng(seed)
    # ... the columns' own differences fade out over the first 70 rows (no vertical streaks further down)
    wide = np.stack([ndi.gaussian_filter1d(col[:, c], 160, mode='nearest') for c in range(3)], -1)
    tw = smooth(rows / 70.0)[:, None, None]
    ext = (col[None] * (1 - tw) + wide[None] * tw) * decay[:, None, None]
    # texture: bands of the last rows' fine grain, each shifted along x, cross-faded over 8 rows
    acc = np.zeros((S, W, 3))
    wsum = np.zeros((S, 1, 1))
    step = n - 8
    for i, y0 in enumerate(range(0, S, step)):
        band = np.roll(tex, int(rng.integers(0, W)), axis=1)
        y1 = min(S, y0 + n)
        wt = np.minimum(1, np.minimum(np.arange(y1 - y0) + 1, (y1 - y0) - np.arange(y1 - y0)) / 8.0)[:, None, None]
        acc[y0:y1] += band[:y1 - y0] * wt
        wsum[y0:y1] += wt
    ext = np.maximum(ext + acc / np.maximum(wsum, 1e-6) * decay[:, None, None], 0)
    out[H - S:] = ext
    return out


# ------------------------------------------------------------------------------------------------ 4. lights
def light_gains(shape, masks_out, P, S):
    """Linear-light gain maps (H, W, 3) of the two lights at weight 1, in the coordinates of the framed plate."""
    H, W = shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    q = P['quran']
    cover = poly_mask((H, W), [(x, y - S) for x, y in q['cover']])
    cover = ndi.gaussian_filter(ndi.minimum_filter(cover, footprint=disk(2)), 1.0)     # 2 px inside the outline: the feather never reaches the lake
    cx, cy, sx, sy = q['pool']
    pool = np.exp(-0.5 * (((xx - cx) / sx) ** 2 + ((yy - (cy - S)) / sy) ** 2))
    room = smooth((yy - (q['room_y'][0] - S)) / (q['room_y'][1] - q['room_y'][0]))
    mq = np.maximum(cover * q['gain'] * (0.75 + 0.25 * pool), pool * room * q['spill'] * (1 - cover))
    gq = 1 + mq[..., None] * np.array(q['tint'])[None, None, :]
    a = P['accent']
    cx, cy, sx, sy = a['pool']
    pool = np.exp(-0.5 * (((xx - cx) / sx) ** 2 + ((yy - (cy - S)) / sy) ** 2))
    leather = ndi.gaussian_filter(masks_out.astype(np.float64), 1.0)
    ma = pool * leather * a['gain']
    ga = 1 + ma[..., None] * np.array(a['tint'])[None, None, :]
    return gq, mq, ga, ma


def to16(lin):
    return np.clip(np.rint(l2s(np.clip(lin, 0, 1)) * 65535), 0, 65535)


def even_crop(mask, pad=8):
    ys, xs = np.nonzero(mask)
    H, W = mask.shape
    x0, y0 = max(0, xs.min() - pad) & ~1, max(0, ys.min() - pad) & ~1
    x1, y1 = min(W, xs.max() + pad + 2) & ~1, min(H, ys.max() + pad + 2) & ~1
    return [int(x0), int(y0), int(x1 - x0), int(y1 - y0)]


# ------------------------------------------------------------------------------------------------ pictures for the eye
def frame_view(lin, scale=1.0, piv=(540, 1200), text=None, out_w=FW):
    """The plate as the film frames it (push scale about the pivot), sRGB 8-bit, optional RGBA text layer on top."""
    H, W = lin.shape[:2]
    k = W / FW
    im = Image.fromarray((np.clip(l2s(np.clip(lin, 0, 1)), 0, 1) * 255 + 0.5).astype(np.uint8))
    # frame px (X, Y) -> plate px: ((X - piv) / s + piv) * k
    a = k / scale
    im = im.transform((FW, FH), Image.AFFINE, (a, 0, (piv[0] - piv[0] / scale) * k, 0, a, (piv[1] - piv[1] / scale) * k), Image.BICUBIC)
    if text is not None:
        im = Image.alpha_composite(im.convert('RGBA'), text).convert('RGB')
    if out_w != FW:
        im = im.resize((out_w, round(FH * out_w / FW)), Image.LANCZOS)
    return im


def measure_spines(lin, masks, P, S=0):
    """L*, C*, h of the mid-tone of each spine (leather pixels between the 35th and 85th percentile of luminance)."""
    out = {}
    y0, y1 = P['spine_mid_y'][0] - S, P['spine_mid_y'][1] - S
    for name, (a, b) in zip(P['names'], P['spine_mid']):
        m = masks[y0:y1, a:b]
        px = lin[y0:y1, a:b][m]
        yv = px @ LUM
        lo, hi = np.percentile(yv, [35, 85])
        out[name] = [round(float(v), 1) for v in np.array(lch(px[(yv >= lo) & (yv <= hi)].mean(0)))]
    return out


def measure_titles(lin, foil, leather, P, S=0):
    """Luminance ratio foil / leather per title: glyph cores (alpha > 0.9) against the leather of the title's box."""
    out = {}
    y0, y1 = P['titles']['y'][0] - S, P['titles']['y'][1] - S
    Y = lin @ LUM
    for name, (a, b) in zip(P['names'], P['titles']['x']):
        al = foil[y0:y1, a:b]
        yy = Y[y0:y1, a:b]
        le = leather[y0:y1, a:b] & (al < 0.01)
        out[name] = round(float(yy[al > 0.9].mean() / yy[le].mean()), 2) if (al > 0.9).any() else None
    return out


# ------------------------------------------------------------------------------------------------ main
def build(args, info):
    src = s2l(np.asarray(Image.open(SRC).convert('RGB')).astype(np.float64) / 255)
    H, W = src.shape[:2]
    LP = dict(LEATHER, strength=LEATHER['strength'] * args.leather)
    graded, masks = leather_grade(src, LP, info)
    S = int(FRAMING['crop_top'])
    key_src = masks['key'] & masks['spines']
    info['leather_before_LCh'] = measure_spines(src, key_src, LEATHER)
    info['leather_after_LCh'] = measure_spines(graded, key_src, LEATHER)
    foil0 = masks['foil']
    info['title_ratio_before'] = measure_titles(src, foil0, key_src, LEATHER)
    info['title_ratio_after'] = measure_titles(graded, foil0, key_src, LEATHER)
    FP = dict(FLAG, ev=FLAG['ev'] * args.flag, ev_far=FLAG['ev_far'] * args.flag, sheen=FLAG['sheen'] * args.flag)
    flagged, g = flag(graded, FP)
    plate = reframe(flagged, FRAMING)
    return src, graded, flagged, plate, masks, S


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--leather', type=float, default=1.0, help='strength of the leather grade (0 = as generated)')
    ap.add_argument('--flag', type=float, default=1.0, help='strength of the foreground shadow')
    ap.add_argument('--quran', type=float, default=1.0, help='strength of the Qur\'an light delta (0 = none)')
    ap.add_argument('--accent', type=float, default=1.0, help='strength of the Sözler accent delta (0 = none)')
    ap.add_argument('--look', default=None, help='write before / after pictures into this folder')
    ap.add_argument('--dry', action='store_true', help='do not write the baked files (pictures only)')
    args = ap.parse_args()
    t0 = time.time()
    info = {}
    src, graded, flagged, plate, masks, S = build(args, info)
    H, W = plate.shape[:2]

    # lights (on the framed plate)
    sp_out = np.zeros((H, W), bool)
    sp_out[:H - S] = masks['spines'][S:]
    gq, mq, ga, ma = light_gains((H, W), sp_out, LIGHTS, S)
    gq = 1 + (gq - 1) * args.quran
    ga = 1 + (ga - 1) * args.accent
    base16 = to16(plate)
    q16 = to16(plate * gq) - base16
    a16 = to16(plate * ga) - base16
    cq = even_crop(mq > 0.004) if args.quran > 0 else [0, 0, 2, 2]
    ca = even_crop(ma > 0.004) if args.accent > 0 else [0, 0, 2, 2]
    dq = q16[cq[1]:cq[1] + cq[3], cq[0]:cq[0] + cq[2]]
    da = a16[ca[1]:ca[1] + ca[3], ca[0]:ca[0] + ca[2]]

    k = W / FW
    fy = lambda y: round((y - S) / k, 1)                 # source row -> frame y at push scale 1
    fx = lambda x: round(x / k, 1)
    qc = LIGHTS['quran']['cover']
    meta = {
        'about': 'written by endcard/comp/bake_ai.py - do not edit; re-run the script (bake.py restores the Blender card)',
        'kind': 'photo',
        'source': {'file': '../ai/gen1.png', 'sha1': hashlib.sha1(open(SRC, 'rb').read()).hexdigest()},
        'plate': {'w': W, 'h': H, 'scale': k},
        'frame': {'w': FW, 'h': FH},
        'files': {
            'base': {'file': 'base.u16', 'dtype': 'uint16le', 'channels': 3, 'w': W, 'h': H, 'encoding': 'sRGB 0..65535'},
            'dq': {'file': 'dq.i16', 'dtype': 'int16le', 'channels': 3, 'crop': cq, 'light': 'quran', 'weight': args.quran},
            'da': {'file': 'da.i16', 'dtype': 'int16le', 'channels': 3, 'crop': ca, 'light': 'accent', 'weight': args.accent},
        },
        'params': {'framing': FRAMING, 'leather': {k2: v for k2, v in LEATHER.items()}, 'flag': FLAG, 'lights': LIGHTS,
                   'strengths': {'leather': args.leather, 'flag': args.flag, 'quran': args.quran, 'accent': args.accent}},
        'grade': info,
        'wall_ref_srgb': [1.0, 1.0, 1.0],
        'positions_1080x1920': {
            'quran_bbox': [fx(min(p[0] for p in qc)), fy(min(p[1] for p in qc)), fx(max(p[0] for p in qc)), fy(max(p[1] for p in qc))],
            'row_bbox': [fx(LEATHER['spines_x'][0]), fy(893), fx(LEATHER['spines_x'][1]), fy(1356)],
            'sozler_spine_bbox': [fx(100), fy(897), fx(203), fy(1356)],
            'open_book_lowest_y': fy(1697),
            'synthetic_rows_from_y': round((H - S) / k, 1),
            'suggested_text_block': [140, 1325, 940, 1650],
        },
        'baked_at': time.strftime('%Y-%m-%d %H:%M:%S'),
    }
    if not args.dry:
        base16.astype('<u2').tofile(os.path.join(HERE, 'base.u16'))
        dq.astype('<i2').tofile(os.path.join(HERE, 'dq.i16'))
        da.astype('<i2').tofile(os.path.join(HERE, 'da.i16'))
        meta['md5'] = {f: hashlib.md5(open(os.path.join(HERE, f), 'rb').read()).hexdigest() for f in ('base.u16', 'dq.i16', 'da.i16')}
        with open(os.path.join(HERE, 'meta.json'), 'w') as fh:
            json.dump(meta, fh, indent=1, ensure_ascii=False)
        for name, lin in (('base', plate), ('quran', plate * gq), ('accent', plate * ga), ('both', plate * gq * ga)):
            frame_view(lin).save(os.path.join(HERE, f'look_{name}.jpg'), quality=92)
    print(json.dumps(info, ensure_ascii=False, indent=1))
    print(f'crops dq {cq} da {ca}; bake {time.time() - t0:.1f} s' + (' (dry)' if args.dry else ''))

    if args.look:
        os.makedirs(args.look, exist_ok=True)
        tfile = os.path.join(args.look, 'text_rgba.png')
        text = Image.open(tfile).convert('RGBA') if os.path.exists(tfile) else None
        src_framed = reframe(flag(src, FLAG)[0], FRAMING)
        for name, lin in (('after', plate), ('before', src_framed)):
            frame_view(lin, 1.0313, text=text).save(os.path.join(args.look, f'frame_{name}_end.png'))
            frame_view(lin, 1.0313, text=text, out_w=405).save(os.path.join(args.look, f'phone_{name}_end.png'))
        frame_view(plate * gq * ga, 1.0313, text=text).save(os.path.join(args.look, 'frame_lights_end.png'))
        # 100 % crops of the plate: spines, open book, before | after
        def pair(box, name, zoom=1):
            x0, y0, x1, y1 = box
            a = (np.clip(l2s(np.clip(src[y0:y1, x0:x1], 0, 1)), 0, 1) * 255 + 0.5).astype(np.uint8)
            b = (np.clip(l2s(np.clip(graded[y0:y1, x0:x1], 0, 1)), 0, 1) * 255 + 0.5).astype(np.uint8)
            im = Image.fromarray(np.concatenate([a, np.full((y1 - y0, 6, 3), 128, np.uint8), b], 1))
            if zoom != 1:
                im = im.resize((int(im.size[0] * zoom), int(im.size[1] * zoom)), Image.LANCZOS)
            im.save(os.path.join(args.look, name))
        pair((70, 850, 580, 1380), 'leather_spines_100.png')
        pair((80, 1010, 560, 1100), 'leather_titles_300.png', 3)
        pair((110, 1380, 700, 1720), 'leather_bookL_100.png')
        pair((600, 1560, 1152, 1720), 'leather_bookR_200.png', 2)
        m = np.zeros(src.shape, np.uint8)
        m[..., 0] = masks['spines'] * 255
        m[..., 1] = (masks['foil'] * 255).astype(np.uint8)
        m[..., 2] = masks['book'] * 255
        Image.fromarray(m[840:1730, 60:1152]).save(os.path.join(args.look, 'masks.png'))


if __name__ == '__main__':
    main()
