# -*- coding: utf-8 -*-
"""Han (kervansaray): küre onun kubbesi olur. Dünya koordinatları (S1-S3)."""
import math
import numpy as np
from wc import Element, hatch, P, bez, ellipse_pts, sstep, blur, fbm, mask_of, pig
from kit import paint, closed, glow_density
from scipy_free import smooth_closed

# yerleşim (dünya)
GROUND = 1330
BX0, BX1, BTOP = 110, 970, 840
PX0, PX1, PTOP = 400, 680, 776     # taçkapı
NX0, NX1, NTOP = 440, 640, 906     # niş
DX0, DX1, DTOP = 482, 598, 1104    # kapı
DRUM_Y0, DRUM_Y1, DRUM_X0, DRUM_X1 = 772, 842, 262, 818


def pointed_arch(x0, x1, ytop, yspring, ybot, n=30):
    """Sivri kemerli açıklık çokgeni (saat yönü): sol alt → sol üzengi → tepe → sağ üzengi → sağ alt."""
    cx = (x0 + x1) / 2
    w = x1 - x0
    left = bez((x0, yspring), (x0, yspring - (yspring - ytop) * 0.55), (cx - w * 0.18, ytop + (yspring - ytop) * 0.12),
               (cx, ytop), n)
    right = bez((cx, ytop), (cx + w * 0.18, ytop + (yspring - ytop) * 0.12), (x1, yspring - (yspring - ytop) * 0.55),
                (x1, yspring), n)
    return np.vstack([[x0, ybot], left, right[1:], [x1, ybot]])


def build_han(s=2.2, seed=700, ww=None):
    """Gövde + taçkapı + pencereler. Doku: dünya (90..990, 760..1340) bölgesi."""
    X0, Y0, X1, Y1 = 90, 750, 990, 1342
    el = Element(X1 - X0, Y1 - Y0, s, seed=seed, name='han', pivot=(-X0, -Y0))
    # pivot negatif: yerleştirme (0,0) dünya orijinine denk gelsin diye (place(el, 0, 0))
    el.pivot = (-X0 * 1.0, -Y0 * 1.0)
    S = s
    off = np.array([-X0, -Y0], float)

    def L(pts):
        return np.asarray(pts, float) + off

    # duvar gövdesi
    body = L([[BX0, BTOP], [BX1, BTOP], [BX1, GROUND], [BX0, GROUND]])
    mb = el.mask(P(body))
    mp_early = el.mask(P(L([[PX0, PTOP], [PX1, PTOP], [PX1, GROUND], [PX0, GROUND]])))
    mb_np = mb * (1 - mp_early)
    el.shape = np.maximum(el.shape, mb)
    if ww is not None:
        ww.apply(el, 0, 0)
    else:
        el.wet_split(angle=math.radians(195), frac=0.5, lobes=0.28, seed=seed + 1, sweep=math.radians(15))
    # açık taş taban
    paint(el, None, '#E9D7B0', '#B48A5A', None, m=mb_np, ang=math.radians(-8), seed=seed + 2, dens=1.0, spacing=2.6,
          length=(18, 32), cluster=(6, 11), press=(0.32, 0.55), k=0.75, kshade=0.55, bloom_n=3, bloom_r=(10, 26),
          wet_spread=0.9)
    # ablak bantları (açık kiremit), her 3 sıradan biri
    th, tw = el.th, el.tw
    yy, xx = np.mgrid[0:th, 0:tw].astype(np.float32) / S
    band = np.zeros((th, tw), np.float32)
    course = 26.0
    rows = np.arange(BTOP + 30, GROUND, course)
    for i, y in enumerate(rows):
        if i % 3 == 1:
            band = np.maximum(band, sstep(y - Y0 - 1, y - Y0 + 1, yy) * sstep(y - Y0 + course + 1, y - Y0 + course - 1, yy))
    band *= mb_np
    sc = el.canvas()
    hatch(sc, band, math.radians(-4), spacing=2.4 * S, length=(16 * S, 28 * S), cluster=(5, 9), press=(0.4, 0.65),
          width=(0.95 * S, 1.35 * S), density=1.3, seed=seed + 3, t_range=(0.15, 0.7), angle_jit=0.04)
    el.layer('#D9927A', sc, k=0.75, shape=mb, clip=band, bloom_n=0, wet_spread=0.7)
    # taş sıra çizgileri + derzler
    sc = el.canvas()
    rr = np.random.default_rng(seed)
    for i, y in enumerate(rows):
        yy_ = y - Y0
        sc.line(np.array([[BX0 - X0 + 2, yy_], [BX1 - X0 - 2, yy_]]) * S + rr.normal(0, 0.3, (2, 2)), 1.0 * S, 0.45,
                0.3 + 0.3 * i / len(rows), 0.45 + 0.3 * i / len(rows), seed=seed + 100 + i, taper=(0.02, 0.02),
                press_noise=0.45)
        x = BX0 + rr.uniform(10, 60)
        while x < BX1 - 10:
            sc.line(np.array([[x - X0, yy_ + 2], [x - X0, yy_ + course - 2]]) * S, 0.9 * S, 0.35, 0.5, 0.6,
                    seed=seed + 300 + int(x), taper=(0.1, 0.1))
            x += rr.uniform(48, 90)
    el.line_layer('#8C6A48', sc, k=0.6, clip=mb_np)
    # korniş
    corn = L([[BX0 - 8, BTOP - 4], [BX1 + 8, BTOP - 4], [BX1 + 8, BTOP + 18], [BX0 - 8, BTOP + 18]])
    paint(el, corn, '#E2CDA2', '#9E7A50', '#5A3E28', ang=0.0, seed=seed + 4, dens=1.3, lw=1.5, spacing=2.2,
          length=(10, 20), under=mp_early)
    # diş sırası
    sc = el.canvas()
    x = BX0 - 4
    while x < BX1 + 4:
        sc.line(np.array([[x - X0, BTOP + 18 - Y0], [x - X0, BTOP + 26 - Y0]]) * S, 3.2 * S, 0.7, 0.4, 0.6,
                seed=seed + 500 + int(x), taper=(0, 0))
        x += 12
    el.line_layer('#7A5A3A', sc, k=0.55, clip=1 - mp_early)
    # yan pencereler (sivri kemerli, demir şebekeli)
    for i, wx in enumerate((190, 300, 780, 890)):
        win = L(pointed_arch(wx - 30, wx + 30, 990, 1030, 1130))
        frame = L(pointed_arch(wx - 40, wx + 40, 975, 1030, 1140))
        mf = el.mask(P(frame))
        paint(el, frame, '#E6D2A8', '#A98258', '#5A3E28', m=mf, ang=math.radians(80), seed=seed + 20 + i,
              dens=1.0, lw=1.4, k=0.7, add_shape=False)
        paint(el, win, '#33303F', '#1C1A24', '#1E1B26', ang=math.radians(70), seed=seed + 30 + i, dens=2.2,
              spacing=1.9, length=(8, 14), k=0.95, lw=1.5, add_shape=False, press=(0.6, 0.9))
        sc = el.canvas()
        for gx in (wx - 15, wx, wx + 15):
            sc.line(L([[gx, 1000], [gx, 1130]]) * S, 1.6 * S, 0.8, 0.6, 0.8, seed=seed + 40 + i * 5 + int(gx),
                    taper=(0, 0))
        for gy in (1050, 1090):
            sc.line(L([[wx - 30, gy], [wx + 30, gy]]) * S, 1.6 * S, 0.8, 0.6, 0.8, seed=seed + 60 + i * 5 + gy,
                    taper=(0, 0))
        el.line_layer('#B8A27E', sc, k=0.7)
    # taçkapı: çıkıntılı çerçeve
    portal = L([[PX0, PTOP], [PX1, PTOP], [PX1, GROUND], [PX0, GROUND]])
    mp = el.mask(P(portal))
    el.shape = np.maximum(el.shape, mp)
    paint(el, portal, '#EAD8AE', '#B08656', '#5A3E28', m=mp, ang=math.radians(84), seed=seed + 70, dens=1.1,
          lw=1.8, k=0.78, kshade=0.6, length=(14, 26), add_shape=False, bloom_n=1)
    # çerçeve bordürü (zikzak bant)
    sc = el.canvas()
    inset = 14
    for side in range(3):
        if side == 0:
            p0, p1 = (PX0 + inset, GROUND - 4), (PX0 + inset, PTOP + inset)
        elif side == 1:
            p0, p1 = (PX0 + inset, PTOP + inset), (PX1 - inset, PTOP + inset)
        else:
            p0, p1 = (PX1 - inset, PTOP + inset), (PX1 - inset, GROUND - 4)
        p0, p1 = np.array(p0, float), np.array(p1, float)
        d = p1 - p0
        Ld = np.linalg.norm(d)
        u = d / Ld
        nrm = np.array([-u[1], u[0]])
        k = int(Ld / 12)
        zz = [p0 + u * (Ld * j / k) + nrm * (5 if j % 2 else -5) for j in range(k + 1)]
        sc.line(L(np.array(zz)) * S, 1.5 * S, 0.75, 0.35 + 0.1 * side, 0.55 + 0.1 * side, seed=seed + 80 + side,
                taper=(0.01, 0.01))
        for o in (-9, 9):
            sc.line(L(np.array([p0 + nrm * o, p1 + nrm * o])) * S, 1.1 * S, 0.6, 0.35, 0.6, seed=seed + 90 + side + o,
                    taper=(0.01, 0.01))
    el.line_layer('#7A4E2E', sc, k=0.8)
    # niş (gölgeli) + mukarnas çizgileri
    niche = L(pointed_arch(NX0, NX1, NTOP, 1010, GROUND))
    mn = el.mask(P(niche))
    paint(el, niche, '#C8BBA6', '#7E7064', '#4A3A2E', m=mn, ang=math.radians(70), seed=seed + 100, dens=1.2,
          lw=1.7, k=0.72, kshade=0.62, add_shape=False, bloom_n=1, lit=(-0.3, 1.0))
    sc = el.canvas()
    for j, yv in enumerate((960, 990, 1020)):
        nseg = 5 + j * 2
        span = (NX1 - NX0) * (0.42 + 0.22 * j)
        cx = (NX0 + NX1) / 2
        xs = np.linspace(cx - span / 2, cx + span / 2, nseg + 1)
        for a, b in zip(xs[:-1], xs[1:]):
            arc = bez((a, yv), (a, yv - 14), (b, yv - 14), (b, yv), 10)
            sc.line(L(arc) * S, 1.2 * S, 0.7, 0.45, 0.7, seed=seed + 120 + j * 20 + int(a), taper=(0.05, 0.05))
    el.line_layer('#5A3E28', sc, k=0.75)
    # kapı (koyu ahşap, iki kanat)
    door = L(pointed_arch(DX0, DX1, DTOP, 1170, GROUND))
    md = el.mask(P(door))
    paint(el, door, '#7E4C2C', '#4A2A18', '#2E1A10', m=md, ang=math.radians(88), seed=seed + 140, dens=1.8,
          lw=1.7, spacing=2.0, length=(14, 24), k=0.95, add_shape=False, press=(0.55, 0.85))
    sc = el.canvas()
    cx = (DX0 + DX1) / 2
    sc.line(L([[cx, DTOP + 6], [cx, GROUND]]) * S, 1.6 * S, 0.8, 0.6, 0.8, seed=seed + 150, taper=(0, 0))
    for yv in (1190, 1260):
        sc.line(L([[DX0 + 6, yv], [DX1 - 6, yv]]) * S, 1.1 * S, 0.6, 0.65, 0.85, seed=seed + 151 + yv, taper=(0, 0))
    el.line_layer('#2A160C', sc, k=0.8)
    # gövde konturu
    sc = el.canvas()
    sc.line(L(closed([[BX0, BTOP + 18], [BX1, BTOP + 18], [BX1, GROUND], [BX0, GROUND]])) * S, 1.9 * S, 0.85, 0.0,
            0.4, seed=seed + 160, taper=(0.01, 0.01))
    el.line_layer('#4E3622', sc, k=0.9, clip=1 - mp_early)
    sc = el.canvas()
    sc.line(L([[PX0, GROUND], [PX0, PTOP], [PX1, PTOP], [PX1, GROUND]]) * S, 2.0 * S, 0.85, 0.05, 0.45,
            seed=seed + 161, taper=(0.01, 0.01))
    el.line_layer('#4E3622', sc, k=0.9)
    el.door_poly = pointed_arch(DX0, DX1, DTOP, 1170, GROUND)
    return el


def build_drum(s=1.4, seed=760, ww=None):
    """Kürenin oturduğu kasnak (küçük pencereli)."""
    X0, Y0 = DRUM_X0 - 10, DRUM_Y0 - 10
    w, h = DRUM_X1 - DRUM_X0 + 20, DRUM_Y1 - DRUM_Y0 + 20
    el = Element(w, h, s, seed=seed, name='drum', pivot=(-X0, -Y0))
    off = np.array([-X0, -Y0], float)
    pts = np.array([[DRUM_X0, DRUM_Y0 + 6], [DRUM_X0 + 10, DRUM_Y0], [DRUM_X1 - 10, DRUM_Y0], [DRUM_X1, DRUM_Y0 + 6],
                    [DRUM_X1, DRUM_Y1], [DRUM_X0, DRUM_Y1]], float) + off
    m = el.mask(P(pts))
    el.shape = m.copy()
    if ww is not None:
        ww.apply(el, 0, 0)
    else:
        el.wet_split(angle=math.radians(190), frac=0.5, lobes=0.3, seed=seed + 1)
    paint(el, pts, '#E7D3AA', '#A98258', '#5A3E28', m=m, ang=math.radians(-6), seed=seed + 2, dens=1.1, lw=1.6,
          k=0.75, add_shape=False, length=(14, 26))
    n = 9
    xs = np.linspace(DRUM_X0 + 34, DRUM_X1 - 34, n)
    for i, x in enumerate(xs):
        win = pointed_arch(x - 9, x + 9, DRUM_Y0 + 16, DRUM_Y0 + 28, DRUM_Y1 - 12) + off
        paint(el, win, '#33303F', None, '#1E1B26', ang=math.radians(70), seed=seed + 10 + i, dens=2.4, spacing=1.8,
              length=(6, 10), lw=1.2, add_shape=False, press=(0.6, 0.9))
    return el


def build_door_light(s=2.2, seed=780):
    """Açılan kapı: içeride beyaz-altın nur, aralanmış kanatlar, zemine düşen ışık halısı, ışın kamaları."""
    X0, Y0 = DX0 - 170, DTOP - 160
    w, h = DX1 - DX0 + 340, GROUND - DTOP + 300
    el = Element(w, h, s, seed=seed, name='door_light', pivot=(-X0, -Y0))
    off = np.array([-X0, -Y0], float)
    door = pointed_arch(DX0, DX1, DTOP, 1170, GROUND) + off
    md = el.mask(P(door))
    th, tw = el.th, el.tw
    S = s
    yy, xx = np.mgrid[0:th, 0:tw].astype(np.float32) / S
    cx, cy = (DX0 + DX1) / 2 - X0, GROUND - Y0 - 60
    d = np.hypot((xx - cx), (yy - cy) * 0.8)
    n = gn(th, tw, S, seed)
    inner = md * (0.04 + 0.42 * sstep(20, 110, d)) * (0.8 + 0.4 * n)
    ang = np.arctan2(yy - cy, xx - cx)
    rays = 0.5 + 0.5 * np.cos(14 * ang + 0.6 * np.sin(5 * ang))
    halo = (1 - md) * sstep(210, 50, d) * (0.18 + 0.32 * rays ** 2) * (0.75 + 0.5 * n)
    halo *= sstep(GROUND - Y0 + 1, GROUND - Y0 - 6, yy)
    gy = GROUND - Y0
    carpet = sstep(gy - 1, gy + 3, yy) * sstep(gy + 230, gy + 10, yy)
    spread = 60 + (yy - gy) * 0.75
    carpet *= sstep(spread, spread * 0.55, np.abs(xx - cx)) * 0.5 * (0.8 + 0.4 * n)
    dens = inner + halo + carpet
    D = dens[..., None] * pig('#F2B947', 0.95)[None, None, :]
    el.add_density(D)
    # aralanmış kanatlar (koyu ahşap, kenarlarda dar yamuklar)
    for sgn in (-1, 1):
        x_in = (DX0 + 10) if sgn < 0 else (DX1 - 10)
        x_ed = DX0 if sgn < 0 else DX1
        leaf = np.array([[x_ed, 1170], [x_in, 1182], [x_in, GROUND - 6], [x_ed, GROUND]], float) + off
        paint(el, leaf, '#6E3E22', None, '#2A160C', ang=math.radians(88), seed=seed + 5 + sgn, dens=2.0,
              spacing=1.8, length=(10, 18), lw=1.4, add_shape=True, no_wet=True)
    sc = el.canvas()
    for k in range(18):
        a = -math.pi / 2 + (k - 8.5) * 0.16
        r0, r1 = 70 + (k % 3) * 8, 150 + (k % 4) * 22
        p0 = np.array([cx + math.cos(a) * r0, cy + math.sin(a) * r0 * 1.2])
        p1 = np.array([cx + math.cos(a) * r1, cy + math.sin(a) * r1 * 1.2])
        sc.line(np.array([p0, p1]) * S, 1.3 * S, 0.5, 0.0, 1.0, seed=seed + 20 + k, taper=(0.2, 0.5))
    el.layer('#F3D23C', sc, k=0.7, wet_override=np.zeros_like(el.wet), clip=1 - md)
    el.shape = np.maximum(md * 1.0, el.shape)
    return el


def gn(th, tw, S, seed):
    from wc import gnorm
    return gnorm(fbm(th, tw, 30 * S, 3, 0.5, seed))
