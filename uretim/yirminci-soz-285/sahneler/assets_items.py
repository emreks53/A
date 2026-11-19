# -*- coding: utf-8 -*-
"""Vazife pulları (piktogramlı diskler) ve erzak nesneleri."""
import math
import numpy as np
from wc import Element, hatch, P, bez, ellipse_pts, sstep, blur, mask_of
from kit import paint, closed, leaf_poly
from scipy_free import smooth_closed, smooth_open

INK = '#2B2540'

TOKEN_COL = dict(book=('#8DB8D8', '#3D58B6'), lamp=('#F3D23C', '#D08A2A'), heart=('#EE8FAE', '#B8456A'),
                 jug=('#86C4B0', '#2E7E6A'), sapling=('#A8CF7A', '#4F9C38'), tesbih=('#C7B0E2', '#7A5BB0'),
                 bread=('#E8B877', '#B07A35'), coin=('#E8C860', '#B08A2A'), house=('#E2A58C', '#A8553E'))


def picto(kind, R):
    """Piktogram: (dolgu çokgenleri [(pts, renk)], çizgiler [pts]) — merkez (0,0), yarıçap R."""
    f = R / 35.0
    fills, lines = [], []
    if kind == 'book':
        lp = np.array([[-2, -14], [-24, -18], [-24, 14], [-2, 18]]) * f
        rp = np.array([[2, -14], [24, -18], [24, 14], [2, 18]]) * f
        fills += [(lp, '#FBF6E8'), (rp, '#FBF6E8')]
        lines += [closed(lp), closed(rp)]
        for k in range(4):
            y = (-9 + k * 6) * f
            lines += [np.array([[-20 * f, y - 2 * f], [-6 * f, y]]), np.array([[6 * f, y], [20 * f, y - 2 * f]])]
        lines += [np.array([[0, -15 * f], [0, 19 * f]])]
    elif kind == 'lamp':
        body = np.vstack([bez((-20, 6), (-20, -6), (8, -8), (14, -2), 14), bez((14, -2), (22, -4), (28, -6), (30, -5), 6)[1:],
                          bez((30, -5), (26, 2), (16, 8), (8, 10), 8)[1:], bez((8, 10), (0, 14), (-16, 14), (-20, 6), 10)[1:]]) * f
        foot = np.array([[-8, 12], [6, 12], [8, 18], [-10, 18]]) * f
        flame = np.vstack([bez((28, -6), (22, -14), (26, -22), (30, -30), 10), bez((30, -30), (36, -20), (36, -12), (30, -6), 10)[1:]]) * f
        handle = bez((-20, 2), (-30, 0), (-30, -12), (-20, -10), 12) * f
        fills += [(body, '#C9893A'), (foot, '#A86A2A'), (flame, '#F6B33A')]
        lines += [closed(body), closed(foot), closed(flame), handle]
    elif kind == 'heart':
        t = np.linspace(0, 2 * math.pi, 80)
        x = 16 * np.sin(t) ** 3
        y = -(13 * np.cos(t) - 5 * np.cos(2 * t) - 2 * np.cos(3 * t) - np.cos(4 * t))
        pts = np.stack([x, y + 2], 1) * f * 1.25
        fills += [(pts, '#D84A6A')]
        lines += [closed(pts)]
    elif kind == 'jug':
        body = np.vstack([bez((-6, -10), (-18, -6), (-20, 14), (-8, 20), 12), bez((-8, 20), (0, 23), (8, 22), (12, 18), 6)[1:],
                          bez((12, 18), (20, 10), (16, -6), (6, -10), 12)[1:]]) * f
        neck = np.array([[-6, -10], [6, -10], [5, -22], [8, -26], [-8, -26], [-5, -22]]) * f
        spout = np.vstack([bez((12, 4), (22, 0), (24, -12), (30, -18), 10), bez((30, -18), (30, -14), (26, -2), (14, 12), 10)[1:]]) * f
        handle = bez((-14, -2), (-26, -6), (-26, 14), (-14, 14), 12) * f
        fills += [(body, '#3E9A86'), (neck, '#2E7E6A'), (spout, '#3E9A86')]
        lines += [closed(body), closed(neck), closed(spout), handle]
    elif kind == 'sapling':
        mound = np.vstack([bez((-22, 20), (-12, 8), (12, 8), (22, 20), 14)]) * f
        stem = bez((0, 14), (1, 2), (-1, -8), (0, -18), 12) * f
        l1, m1 = leaf_poly(np.array([0, -6]) * f, np.array([-18, -18]) * f, 11 * f, bend=0.12)
        l2, m2 = leaf_poly(np.array([0, -12]) * f, np.array([17, -26]) * f, 11 * f, bend=-0.12)
        fills += [(np.vstack([mound, [[22 * f, 20 * f], [-22 * f, 20 * f]]]), '#9C6B3A'), (l1, '#4F9C38'), (l2, '#4F9C38')]
        lines += [mound, stem, closed(l1), closed(l2), m1, m2]
    elif kind == 'tesbih':
        n = 15
        for k in range(n):
            a = -math.pi / 2 + 2 * math.pi * (k + 0.5) / (n + 1)
            c = np.array([math.cos(a) * 17, math.sin(a) * 15 - 4]) * f
            b = ellipse_pts(c[0], c[1], 3.6 * f, 3.6 * f, 16)
            fills.append((b, '#6A4AA0'))
            lines.append(closed(b))
        tas = np.array([[0, 10], [-5, 26], [5, 26]]) * f
        fills.append((tas, '#B8862E'))
        lines += [closed(tas), np.array([[0, -19], [0, -21]]) * f]
    elif kind == 'bread':
        loaf = np.vstack([bez((-28, 14), (-30, -8), (-14, -20), (0, -20), 16),
                          bez((0, -20), (14, -20), (30, -8), (28, 14), 16)[1:],
                          bez((28, 14), (14, 18), (-14, 18), (-28, 14), 12)[1:]]) * f
        fills.append((loaf, '#D8954A'))
        lines.append(closed(loaf))
        for k in (-14, -3, 8, 19):
            lines.append(bez((k - 7, 2), (k - 4, -6), (k, -11), (k + 4, -14), 8) * f)
    elif kind == 'coin':
        for k, dy in enumerate((12, 4, -4)):
            e = ellipse_pts(0, dy * f, 20 * f, 7 * f, 40)
            side = np.vstack([e[:20], (e[:20] + np.array([0, 6 * f]))[::-1]])
            fills += [(side, '#B8902E'), (e, '#E2BE4E')]
            lines += [closed(e)]
    elif kind == 'house':
        wall = np.array([[-18, -4], [18, -4], [18, 20], [-18, 20]]) * f
        roof = np.array([[-24, -2], [0, -24], [24, -2]]) * f
        door = np.array([[-5, 20], [-5, 6], [5, 6], [5, 20]]) * f
        fills += [(wall, '#E8D2A8'), (roof, '#B5523A'), (door, '#6A3E22')]
        lines += [closed(wall), closed(roof), closed(door)]
    return fills, lines


def build_token(kind, R=35, s=2.6, seed=600, ring_col=None, dry_only=False, full_wet=False):
    pad = 10
    size = 2 * (R + pad)
    el = Element(size, size, s, seed=seed, name='token_' + kind, pivot=(R + pad, R + pad))
    c = R + pad
    disc = ellipse_pts(c, c, R, R, 120)
    m = el.add_shape(P(disc))
    if full_wet:
        yy, xx = np.mgrid[0:el.th, 0:el.tw].astype(np.float32) / s
        el.set_wet(np.ones((el.th, el.tw), np.float32), np.clip(np.hypot(xx - c, yy - c) / R, 0, 1) * 0.9)
    elif not dry_only:
        el.wet_split(angle=math.radians(200), frac=0.55, lobes=0.25, seed=seed + 1, sweep=math.radians(20))
    base, shade = TOKEN_COL[kind]
    paint(el, disc, base, shade, ring_col or '#3A3350', m=m, ang=math.radians(-55), seed=seed + 2, dens=1.1,
          spacing=2.4, length=(10, 18), k=0.6, kshade=0.45, lw=1.8, add_shape=False, bloom_n=1, bloom_r=(6, 14),
          t=(0.0, 0.7), shade_from=0.5)
    fills, lines = picto(kind, R * 0.78)
    for i, (pts, col) in enumerate(fills):
        q = pts + c
        mm = el.mask(P(q))
        paint(el, q, col, None, None, m=mm, ang=math.radians(60 + 20 * i), seed=seed + 10 + i, dens=1.9,
              spacing=1.8, length=(4, 8), cluster=(3, 6), k=0.85, add_shape=False, t=(0.3, 0.85), bloom_n=0,
              wet_spread=0.35)
    sc = el.canvas()
    for i, q in enumerate(lines):
        sc.line((np.asarray(q) + c) * s, 1.5 * s, 0.85, 0.35, 0.8, seed=seed + 40 + i, taper=(0.05, 0.05))
    el.line_layer(INK, sc, k=0.9)
    return el


def build_item(kind, size=70, s=2.2, seed=650, ww=None, place=(0, 0)):
    """Heybeye giren erzak (piktogramın büyük, gölgeli hâli)."""
    pad = 12
    W_ = size + 2 * pad
    el = Element(W_, W_, s, seed=seed, name='item_' + kind, pivot=(W_ / 2, W_ / 2))
    c = W_ / 2
    fills, lines = picto(kind, size / 2)
    allm = np.zeros((el.th, el.tw), np.float32)
    for pts, col in fills:
        allm = np.maximum(allm, el.mask(P(pts + c)))
    el.shape = allm
    el.wet_split(angle=math.radians(200), frac=0.5, lobes=0.25, seed=seed + 1, sweep=math.radians(20))
    for i, (pts, col) in enumerate(fills):
        q = pts + c
        mm = el.mask(P(q))
        paint(el, q, col, '#3A2A30', None, m=mm, ang=math.radians(60 + 25 * i), seed=seed + 10 + i, dens=1.5,
              spacing=2.0, length=(5, 10), cluster=(4, 7), k=0.85, kshade=0.35, add_shape=False, t=(0.1, 0.8),
              bloom_n=0, wet_spread=0.45, shade_from=0.5)
    sc = el.canvas()
    for i, q in enumerate(lines):
        sc.line((np.asarray(q) + c) * s, 1.7 * s, 0.85, 0.0, 0.6, seed=seed + 40 + i, taper=(0.05, 0.05))
    el.line_layer(INK, sc, k=0.9)
    return el


def build_bag(s=2.0, seed=680, w=124, h=128, strap=True):
    """Kumaş torba (ağzı açık, kıvrık kenarlı), kilim bandı ve askı."""
    pad = 18
    el = Element(w + 2 * pad, h + 2 * pad + 30, s, seed=seed, name='bag', pivot=(w / 2 + pad, h + pad + 30))
    cx, by = w / 2 + pad, h + pad + 30
    top = by - h
    body = np.vstack([
        bez((cx - w * 0.30, top + 14), (cx - w * 0.36, top + h * 0.35), (cx - w * 0.56, by - h * 0.22), (cx - w * 0.42, by - 4), 18),
        bez((cx - w * 0.42, by - 4), (cx - w * 0.2, by + 2), (cx + w * 0.2, by + 2), (cx + w * 0.42, by - 4), 12)[1:],
        bez((cx + w * 0.42, by - 4), (cx + w * 0.56, by - h * 0.22), (cx + w * 0.36, top + h * 0.35), (cx + w * 0.30, top + 14), 18)[1:],
    ])
    rim_top = bez((cx + w * 0.33, top + 12), (cx + w * 0.2, top - 2), (cx - w * 0.2, top - 2), (cx - w * 0.33, top + 12), 14)
    poly = np.vstack([body, rim_top[1:-1]])
    m = el.add_shape(P(poly))
    strap_pts = np.vstack([bez((cx - w * 0.31, top + 16), (cx - w * 0.30, top - 40), (cx + w * 0.30, top - 40), (cx + w * 0.31, top + 16), 24)])
    el.wet_split(angle=math.radians(195), frac=0.5, lobes=0.3, seed=seed + 1, sweep=math.radians(15))
    paint(el, poly, '#C07A48', '#6E3420', '#4A2214', m=m, ang=math.radians(75), seed=seed + 2, dens=1.4,
          spacing=2.2, length=(8, 16), lw=1.8, add_shape=False, bloom_n=1, bloom_r=(6, 14),
          extra_lines=[(bez((cx - w * 0.18, top + 26), (cx - w * 0.26, top + h * 0.45), (cx - w * 0.3, by - 30), (cx - w * 0.22, by - 8), 12), 1.1, 0.5),
                       (bez((cx + w * 0.12, top + 30), (cx + w * 0.2, top + h * 0.5), (cx + w * 0.24, by - 34), (cx + w * 0.16, by - 10), 12), 1.1, 0.5)])
    th, tw = el.th, el.tw
    yy = np.mgrid[0:th, 0:tw][0].astype(np.float32) / s
    y0b, y1b = by - h * 0.44, by - h * 0.27
    band = m * sstep(y0b - 1, y0b + 1, yy) * sstep(y1b + 1, y1b - 1, yy)
    sc = el.canvas()
    hatch(sc, band, 0.0, spacing=2.0 * s, length=(6 * s, 12 * s), cluster=(4, 7), press=(0.55, 0.85),
          width=(0.9 * s, 1.3 * s), density=1.6, seed=seed + 5, t_range=(0.3, 0.8))
    el.layer('#E2B24A', sc, k=0.9, shape=m, clip=band, bloom_n=0, wet_spread=0.4)
    sc = el.canvas()
    xs = np.linspace(cx - w * 0.5, cx + w * 0.5, 11)
    zz = np.array([[x, y1b - 2 if i % 2 else y0b + 2] for i, x in enumerate(xs)])
    sc.line(zz * s, 1.5 * s, 0.85, 0.4, 0.8, seed=seed + 6, taper=(0.02, 0.02))
    for yv in (y0b, y1b):
        sc.line(np.array([[cx - w * 0.55, yv], [cx + w * 0.55, yv]]) * s, 1.1 * s, 0.7, 0.4, 0.8,
                seed=seed + 7 + int(yv), taper=(0.02, 0.02))
    el.line_layer('#5A2A18', sc, k=0.85, clip=np.clip(blur(m, 0.6 * s) * 1.6, 0, 1))
    # kıvrık ağız (açık iç)
    mouth = ellipse_pts(cx, top + 12, w * 0.31, 9, 48)
    paint(el, mouth, '#3A1E14', None, '#2A140C', ang=0.0, seed=seed + 8, dens=2.0, spacing=1.8, length=(6, 12),
          lw=1.4, add_shape=False, k=0.85)
    # askı (yalnız yerdeyken kısa bir halka)
    el.mouth_y = top + 12
    return el
