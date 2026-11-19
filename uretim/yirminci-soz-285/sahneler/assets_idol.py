# -*- coding: utf-8 -*-
"""S10 nesneleri: altın küre ve kaide, parıltılar, nakış (altın iplik), oval ayna çerçevesi."""
import math
import numpy as np
from wc import Element, hatch, P, bez, ellipse_pts, sstep, blur, mask_of, gnorm, fbm, resample
from kit import paint, closed
from assets_globe import build_globe

GOLD = dict(ocean1='#E3B84E', ocean2='#B8862E', ocean3='#7A5418', land1='#F2D27A', land2='#A8761E',
            sand='#F6DE8E', sand2='#C99A3A', rim='#6A4612', coast='#7A5418', light='#FFF0B0')


def build_gold_globe(R=150, s=2.0, seed=1301):
    return build_globe(R=R, s=s, seed=seed, palette=GOLD, wet_frac=0.5)


def build_pedestal(s=1.6, seed=1311, h=260, w=150):
    el = Element(w + 40, h + 20, s, seed=seed, name='pedestal', pivot=((w + 40) / 2, h + 10))
    cx, by = (w + 40) / 2, h + 10
    base = np.array([[cx - w / 2, by], [cx - w / 2, by - 30], [cx + w / 2, by - 30], [cx + w / 2, by]], float)
    shaft = np.array([[cx - w * 0.3, by - 30], [cx - w * 0.26, by - h + 40], [cx + w * 0.26, by - h + 40],
                      [cx + w * 0.3, by - 30]], float)
    cap = np.array([[cx - w * 0.44, by - h + 40], [cx - w * 0.44, by - h + 14], [cx + w * 0.44, by - h + 14],
                    [cx + w * 0.44, by - h + 40]], float)
    cup = np.vstack([bez((cx - w * 0.34, by - h + 14), (cx - w * 0.3, by - h - 6), (cx + w * 0.3, by - h - 6),
                         (cx + w * 0.34, by - h + 14), 16)])
    allm = np.zeros((el.th, el.tw), np.float32)
    for q in (base, shaft, cap, cup):
        allm = np.maximum(allm, el.mask(P(q)))
    el.shape = allm
    el.wet_split(angle=math.radians(190), frac=0.5, lobes=0.15, seed=seed + 1)
    for i, q in enumerate((base, shaft, cap)):
        paint(el, q, '#E8DCC2', '#9C8A6A', '#5A4A32', ang=math.radians(84 if i == 1 else 0), seed=seed + 2 + i,
              dens=1.1, lw=1.6, add_shape=False, k=0.8)
    paint(el, cup, '#D9A23C', '#8A5E1A', '#5A3A10', ang=0.3, seed=seed + 8, dens=1.6, lw=1.4, add_shape=False)
    sc = el.canvas()
    for x in np.linspace(cx - w * 0.2, cx + w * 0.2, 5):
        sc.line(np.array([[x, by - 34], [x * 0.98 + cx * 0.02, by - h + 44]]) * s, 1.1 * s, 0.5, 0.3, 0.8,
                seed=seed + 20 + int(x), taper=(0.05, 0.05))
    el.line_layer('#7A6A4E', sc, k=0.6)
    return el


def build_sparkle(s=2.5, seed=1321, r=22):
    el = Element(2 * r + 8, 2 * r + 8, s, seed=seed, name='sparkle', pivot=(r + 4, r + 4))
    c = r + 4
    pts = []
    for k in range(8):
        a = k * math.pi / 4 - math.pi / 2
        rr = r if k % 2 == 0 else r * 0.22
        pts.append([c + math.cos(a) * rr, c + math.sin(a) * rr])
    pts = np.array(pts)
    el.add_shape(P(pts))
    paint(el, pts, '#F6D46A', '#D9A23C', '#9A6A1A', ang=0.0, seed=seed + 1, dens=2.0, lw=1.0, add_shape=False,
          no_wet=True, spacing=1.5, length=(3, 6))
    return el


def build_embroidery(sil, x0, y0, s=1.6, seed=1331, gold='#E2AE3E', dark='#8A5A14'):
    """Siluet maskesi (dünya ızgarası, x0,y0 köşe) içine altın iplik nakış: sikke halkaları, helezonlar, küçük küreler.
    Dikiş = kısa kesik çizgiler; zaman: motif motif."""
    h, w = sil.shape
    el = Element(w, h, s, seed=seed, name='embroidery', pivot=(0, 0))
    el.X0, el.Y0 = x0, y0
    import cv2
    m = cv2.resize(sil, (el.tw, el.th), interpolation=cv2.INTER_LINEAR)
    inner = (m > 0.5).astype(np.float32)
    dist = cv2.distanceTransform((inner * 255).astype(np.uint8), cv2.DIST_L2, 5) / s
    rr = np.random.default_rng(seed)
    ys, xs = np.nonzero(dist > 9)
    motifs = []
    tries = 0
    while len(motifs) < 22 and tries < 4000:
        tries += 1
        i = int(rr.integers(0, len(xs)))
        cx, cy = xs[i] / s, ys[i] / s
        r = rr.uniform(8, 16)
        if dist[ys[i], xs[i]] < r + 3:
            continue
        if any((cx - a) ** 2 + (cy - b) ** 2 < (r + c + 6) ** 2 for a, b, c, _ in motifs):
            continue
        motifs.append((cx, cy, r, int(rr.integers(0, 3))))
    motifs.sort(key=lambda q: q[1] * 0.6 + q[0] * 0.4)
    sc = el.canvas()
    sc2 = el.canvas()
    n = len(motifs)
    for k, (cx, cy, r, kind) in enumerate(motifs):
        t0 = k / max(1, n)
        t1 = (k + 1) / max(1, n)
        paths = []
        if kind == 0:   # sikke: iki halka
            paths += [ellipse_pts(cx, cy, r, r, 40), ellipse_pts(cx, cy, r * 0.55, r * 0.55, 28)]
        elif kind == 1:  # helezon
            a = np.linspace(0, 4.2 * math.pi, 90)
            rad = r * (0.12 + 0.88 * a / a[-1])
            paths.append(np.stack([cx + rad * np.cos(a), cy + rad * np.sin(a)], 1))
        else:            # küçük küre: halka + meridyen + ekvator
            paths += [ellipse_pts(cx, cy, r, r, 40), ellipse_pts(cx, cy, r * 0.4, r, 30), np.array([[cx - r, cy], [cx + r, cy]])]
        for j, p in enumerate(paths):
            p = resample(np.vstack([p, p[:1]]) if kind != 1 and j < 2 else p, 1.0)
            L = len(p)
            dash = 5
            for q in range(0, L - dash, dash + 2):
                seg = p[q:q + dash]
                tt = t0 + (t1 - t0) * q / L
                sc.line(seg * s, 1.9 * s, 0.95, tt, tt + 0.002, seed=seed + k * 13 + q, taper=(0.0, 0.0))
    Pm = el.layer(gold, sc, k=1.0, wet_override=np.zeros((el.th, el.tw), np.float32), clip=inner, dry_gain=1.6)
    # örtücü iplik: dikişler alttaki tunik rengini bastırır (guaj gibi)
    cov = np.clip(blur(np.clip(Pm * inner, 0, 1), 0.5 * s) * 1.8, 0, 1)
    el.shape = cov.astype(np.float32)
    # ince koyu gölge (iplik kabartısı)
    import cv2
    sh = cv2.warpAffine(cov, np.float32([[1, 0, 0.9 * s], [0, 1, 1.1 * s]]), (el.tw, el.th))
    el.add_density(((sh * (1 - cov)) * 0.5)[..., None] * np.array([0.9, 1.1, 1.6], np.float32)[None, None, :])
    return el


def build_frame(rx=250, ry=360, s=1.2, seed=1341):
    """Oval ayna/portre çerçevesi: çift oval yaldız + köşe süsleri."""
    pad = 50
    el = Element(2 * (rx + pad), 2 * (ry + pad), s, seed=seed, name='frame', pivot=(rx + pad, ry + pad))
    cx, cy = rx + pad, ry + pad
    outer = ellipse_pts(cx, cy, rx + 26, ry + 26, 240)
    inner = ellipse_pts(cx, cy, rx, ry, 240)
    ring = np.vstack([outer, inner[::-1]])
    m = el.mask(P(outer)) * (1 - el.mask(P(inner)))
    el.shape = m.copy()
    el.wet_split(angle=math.radians(200), frac=0.5, lobes=0.2, seed=seed + 1)
    yy, xx = np.mgrid[0:el.th, 0:el.tw].astype(np.float32) / s
    ang = np.arctan2(yy - cy, xx - cx)
    paint(el, None, '#E2B04A', '#8A5A16', None, m=m, ang=lambda x, y: math.atan2(y / s - cy, x / s - cx) + math.pi / 2,
          seed=seed + 2, dens=1.6, spacing=2.0, length=(10, 18), k=0.95, kshade=0.7, add_shape=False,
          tone=np.clip(0.5 - 0.4 * np.cos(ang + 0.8), 0, 1))
    sc = el.canvas()
    sc.line(np.vstack([outer, outer[:1]]) * s, 2.4 * s, 0.9, 0.0, 0.5, seed=seed + 3, taper=(0.01, 0.01))
    sc.line(np.vstack([inner, inner[:1]]) * s, 2.0 * s, 0.85, 0.1, 0.6, seed=seed + 4, taper=(0.01, 0.01))
    mid = ellipse_pts(cx, cy, rx + 13, ry + 13, 240)
    for k in range(0, 240, 6):
        p = mid[k]
        sc.line(np.array([p, p + (p - [cx, cy]) / np.linalg.norm(p - [cx, cy]) * 6]) * s, 1.4 * s, 0.7, 0.4, 0.8,
                seed=seed + 10 + k, taper=(0.0, 0.0))
    # üst ve alt süs (helezon çifti)
    for sgn in (-1, 1):
        base = np.array([cx, cy + sgn * (ry + 26)])
        for side in (-1, 1):
            a = np.linspace(0, 2.6 * math.pi, 60)
            rad = 4 + 18 * a / a[-1]
            sp = np.stack([base[0] + side * (rad * np.cos(a) + 6), base[1] + sgn * (rad * np.sin(a) * 0.8 + 12)], 1)
            sc.line(sp * s, 2.0 * s, 0.85, 0.5, 0.9, seed=seed + 300 + sgn * 7 + side, taper=(0.3, 0.05))
    el.line_layer('#6A4210', sc, k=0.9)
    return el
