# -*- coding: utf-8 -*-
"""S11-S12: Öyle ise hakperestlik ve âhireti düşünmeklik esasları üzerine müesses olan ubudiyetten hisseniz pek azdır."""
import math
import numpy as np
from wc import WorldWet, Element, bez, P, ease, ramp, slim, sstep, pig, gnorm, fbm, ellipse_pts, hatch, blur
from comp import Cam
from cache import cached
from kit import build_sky, build_ground, paint, glow_density, closed, build_shadow
from man import build_side, REST, draw_side, lerp_pose, build_figure
from scipy_free import smooth_closed

GROUND = 1300.0
PL, PR, PW, PTOP = 322.0, 758.0, 140.0, 828.0
OUT0, OUT1, IN0, IN1 = PL - PW / 2 - 6, PR + PW / 2 + 6, PL + PW / 2, PR - PW / 2
APEX_O, APEX_I = 448.0, 590.0
MED = (540.0, 734.0, 86.0)
SLICE = 0.08
KIYAM = dict(REST, uarm_f=18.0, farm_f=-104.0, uarm_b=14.0, farm_b=-100.0, head=4.0)
RUKU = dict(REST, torso=86.0, head=6.0, uarm_f=-41.0, farm_f=-6.0, uarm_b=-38.0, farm_b=-8.0)


def arch_curve(x0, x1, ys, apex, n=40):
    cx = (x0 + x1) / 2
    w = x1 - x0
    left = bez((x0, ys), (x0, ys - (ys - apex) * 0.58), (cx - w * 0.17, apex + (ys - apex) * 0.1), (cx, apex), n)
    right = bez((cx, apex), (cx + w * 0.17, apex + (ys - apex) * 0.1), (x1, ys - (ys - apex) * 0.58), (x1, ys), n)
    return np.vstack([left, right[1:]])


def build():
    ww = WorldWet(angle=math.radians(176), origin=(560, 900), scale=900, amp=0.12, seed=961)
    A = {}
    A['sky'] = build_sky(1500, 1700, s=0.55, seed=271, top='#A9CBE6', deep='#7C9ED6', horizon=GROUND + 250 + 40,
                         clouds=2, cloud_y=(0.08, 0.3), ww=ww, place=(-200, -250), warm=('#F2A66E', GROUND + 250, 820),
                         dens=0.7)
    el = Element(1900, 1900, 0.5, seed=1291, pivot=(950, 950))
    D = glow_density(el.th, el.tw, 475, 475, 760, '#F7C27A', k=0.5, s=0.5, seed=1292, core=0.12)
    el.add_density(D)
    A['dawn'] = el
    # taş kaide (iki basamak)
    el = Element(900, 70, 1.4, seed=1293, pivot=(450, 66))
    st1 = np.array([[20, 66], [20, 38], [880, 38], [880, 66]], float)
    st2 = np.array([[90, 38], [90, 14], [810, 14], [810, 38]], float)
    el.shape = np.maximum(el.mask(P(st1)), el.mask(P(st2)))
    el.wet_split(angle=math.radians(195), frac=0.5, lobes=0.15, seed=1294, sweep=0.0)
    for i, q in enumerate((st1, st2)):
        paint(el, q, '#E4D6BA', '#A08A68', '#5A4A34', ang=0.02, seed=1295 + i, dens=1.2, lw=1.6, add_shape=False,
              k=0.8, length=(16, 28), t=(0.1 * i, 0.7 + 0.2 * i))
    A['plinth'] = el
    A['ground'] = build_ground(1500, 800, s=0.7, seed=371, top_y=20, base='#E6CB96', green='#8DB85A',
                               shade='#B88A55', ww=ww, place=(-200, GROUND - 20), fade=40)
    A['pL'] = build_pillar(PL, ww, seed=1401, niche=False)
    A['pR'] = build_pillar(PR, ww, seed=1421, niche=True)
    # nur hüzmesi (sol sütuna)
    el = Element(420, 900, 0.6, seed=1441, pivot=(210, 900))
    S = el.s
    yy, xx = np.mgrid[0:el.th, 0:el.tw].astype(np.float32) / S
    half = 40 + (yy / 900) * 70
    beam = sstep(half + 30, half - 20, np.abs(xx - 210)) * (0.35 + 0.65 * yy / 900)
    n = gnorm(fbm(el.th, el.tw, 30 * S, 3, .5, 1442))
    el.add_density((beam * (0.26 + 0.22 * n))[..., None] * pig('#F2C14E', 0.8)[None, None, :])
    sc = el.canvas()
    rr = np.random.default_rng(1443)
    for k in range(70):
        u = rr.uniform(-1, 1)
        x0 = 210 + u * 40
        x1 = 210 + u * 110
        y0 = rr.uniform(0, 300)
        y1 = rr.uniform(650, 900)
        sc.line(np.array([[x0 + (x1 - x0) * y0 / 900, y0], [x0 + (x1 - x0) * y1 / 900, y1]]) * S, 1.6 * S,
                0.45 + 0.3 * rr.random(), 0, 1, seed=1444 + k, taper=(0.3, 0.3))
    el.layer('#EDB93A', sc, k=0.7, wet_override=np.zeros((el.th, el.tw), np.float32))
    el.shape = el.shape * 0
    A['beam'] = el
    # temel taşları (yer altında, kesik kalem)
    el = Element(1080, 260, 1.4, seed=1451, pivot=(0, 0))
    sc = el.canvas()
    k = 0
    for cx in (PL, PR):
        for row in range(3):
            y0 = 8 + row * 70
            wrow = PW + 80 - row * 10
            nb = 3 if row % 2 == 0 else 2
            for b in range(nb):
                x0 = cx - wrow / 2 + b * wrow / nb + 3
                x1 = cx - wrow / 2 + (b + 1) * wrow / nb - 3
                q = closed(np.array([[x0, y0], [x1, y0], [x1, y0 + 62], [x0, y0 + 62]]))
                sc.line(q * el.s, 1.8 * el.s, 0.75, 0.05 * k, 0.05 * k + 0.4, seed=1452 + k, taper=(0.02, 0.02))
                k += 1
    el.layer('#7A6248', sc, k=0.8, wet_override=np.zeros((el.th, el.tw), np.float32))
    m = np.zeros((el.th, el.tw), np.float32)
    for cx in (PL, PR):
        m = np.maximum(m, el.mask(P(np.array([[cx - PW / 2 - 40, 4], [cx + PW / 2 + 40, 4], [cx + PW / 2 + 30, 222],
                                               [cx - PW / 2 - 30, 222]]))))
    el.add_density((m * 0.35 * gnorm(fbm(el.th, el.tw, 20, 3, .5, 1460)))[..., None] * pig('#C9A06A', 0.7)[None, None, :])
    A['found'] = el
    A['stones'] = build_voussoirs(ww)
    A['rug'] = build_rug()
    A['man'] = build_figure('back', s=2.4, seed=160)
    A['med'], A['slice'] = build_medallion()
    A['shadow'] = build_shadow(200, 26, s=1.6)
    return slim(A)


def build_pillar(cx, ww, seed, niche):
    h = GROUND - PTOP + 40
    w = PW + 60
    el = Element(w, h, 1.6, seed=seed, name='pillar', pivot=(w / 2, h - 20))
    X0, Y0 = cx - w / 2, PTOP - 20
    o = np.array([X0, Y0])
    base = np.array([[cx - PW / 2 - 14, GROUND], [cx - PW / 2 - 14, GROUND - 36], [cx + PW / 2 + 14, GROUND - 36],
                     [cx + PW / 2 + 14, GROUND]]) - o
    shaft = np.array([[cx - PW / 2, GROUND - 36], [cx - PW / 2, PTOP + 34], [cx + PW / 2, PTOP + 34],
                      [cx + PW / 2, GROUND - 36]]) - o
    cap = np.array([[cx - PW / 2 - 20, PTOP + 34], [cx - PW / 2 - 20, PTOP], [cx + PW / 2 + 20, PTOP],
                    [cx + PW / 2 + 20, PTOP + 34]]) - o
    allm = np.maximum.reduce([el.mask(P(q)) for q in (base, shaft, cap)])
    el.shape = allm
    ww.apply(el, X0, Y0)
    for i, q in enumerate((shaft, base, cap)):
        paint(el, q, '#EADCC0', '#A89070', '#5A4A34', ang=math.radians(84 if i == 0 else 2), seed=seed + i, dens=1.1,
              lw=1.8, add_shape=False, k=0.78, kshade=0.62, bloom_n=1, length=(14, 24))
    sc = el.canvas()
    for y in np.arange(GROUND - 36 - 52, PTOP + 34, -52):
        sc.line((np.array([[cx - PW / 2 + 2, y], [cx + PW / 2 - 2, y]]) - o) * el.s, 1.2 * el.s, 0.55, 0.4, 0.8,
                seed=seed + 10 + int(y), taper=(0.02, 0.02))
    el.line_layer('#7A6A50', sc, k=0.6)
    if niche:
        # âhiret: kemerli niş içinde ufka giden yol ve nur
        nx0, nx1, ny0, ny1 = cx - 42, cx + 42, PTOP + 90, PTOP + 250
        npoly = np.vstack([[nx0, ny1], arch_curve(nx0, nx1, ny0 + 40, ny0, 16), [nx1, ny1]]) - o
        mn = el.mask(P(npoly))
        S = el.s
        yy, xx = np.mgrid[0:el.th, 0:el.tw].astype(np.float32) / S
        X = xx + X0
        Y = yy + Y0
        hz = ny0 + 95
        sky = mn * sstep(hz + 1, hz - 1, Y)
        ground = mn * sstep(hz - 1, hz + 1, Y)
        d = np.hypot(X - cx, (Y - hz) * 1.4)
        glow = sky * sstep(60, 8, d)
        roadm = ground * sstep(3 + (Y - hz) * 0.45, (Y - hz) * 0.3, np.abs(X - cx))
        for i, (mm, col, ang) in enumerate(((sky, '#8FBCE0', -0.5), (ground * (1 - roadm), '#8DB85A', 0.05),
                                            (roadm, '#E6C88E', 1.4))):
            paint(el, None, col, None, None, m=mm, ang=ang, seed=seed + 60 + i, dens=1.8, spacing=1.6,
                  length=(5, 9), k=0.85, add_shape=False, no_wet=(i == 2))
        D = (glow[..., None] * pig('#F2C14E', 0.7)) * (1 - sstep(0, 14, d))[..., None]
        el.add_density(D.astype(np.float32), None)
        el.shape = np.maximum(el.shape, 0)
        sc = el.canvas()
        sc.line(np.vstack([[nx0, ny1], arch_curve(nx0, nx1, ny0 + 40, ny0, 16), [nx1, ny1], [nx0, ny1]]) * 0 +
                (np.vstack([[nx0, ny1], arch_curve(nx0, nx1, ny0 + 40, ny0, 16), [nx1, ny1], [nx0, ny1]]) - o) * el.s,
                2.0 * el.s, 0.85, 0.5, 0.9, seed=seed + 40, taper=(0.02, 0.02))
        el.line_layer('#5A4A34', sc, k=0.85)
        # niş yoğunluğu taş dolgusunu örtsün: dolgu katmanlarını niş içinde kır
        for L in el.layers[:-4]:
            L.C = (L.C.astype(np.float32) * (1 - mn)).astype(np.float16)
            if L.Pw is not None:
                L.Pw = (L.Pw.astype(np.float32) * (1 - mn)).astype(np.float16)
    el.X0, el.Y0 = X0, Y0
    return el


def build_voussoirs(ww):
    outer = arch_curve(OUT0, OUT1, PTOP, APEX_O, 60)
    inner = arch_curve(IN0, IN1, PTOP, APEX_I, 60)
    n = 9
    stones = []
    for i in range(n):
        a0, a1 = i / n, (i + 1) / n
        io0, io1 = int(a0 * (len(outer) - 1)), int(a1 * (len(outer) - 1))
        q = np.vstack([outer[io0:io1 + 1], inner[io0:io1 + 1][::-1]])
        cxy = q.mean(0)
        pad = 20
        x0, y0 = q.min(0) - pad
        x1, y1 = q.max(0) + pad
        el = Element(x1 - x0, y1 - y0, 1.6, seed=1501 + i, name='vous', pivot=(cxy[0] - x0, cxy[1] - y0))
        ql = q - [x0, y0]
        el.add_shape(P(ql))
        ww.apply(el, cxy[0], cxy[1])
        key = (i == n // 2)
        paint(el, ql, '#EFD9B0' if not key else '#E8C98A', '#A88A62', '#5A4A34',
              ang=math.atan2(*(outer[(io0 + io1) // 2] - inner[(io0 + io1) // 2])[::-1]), seed=1510 + i, dens=1.2,
              lw=1.8, add_shape=False, k=0.8, kshade=0.6, length=(10, 18))
        stones.append((el, cxy))
    return stones


def build_rug():
    """Kemere doğru uzanan seccade (perspektif: uzak kenar dar), mihrap ucu kemer tarafında."""
    w, h = 240, 70
    el = Element(w + 20, h + 20, 2.2, seed=1601, pivot=((w + 20) / 2, h + 10))
    cx = (w + 20) / 2
    near, far = h + 6, 14
    poly = np.array([[cx - 112, near], [cx - 78, far], [cx + 78, far], [cx + 112, near]], float)
    el.add_shape(P(poly))
    el.wet_split(angle=math.radians(190), frac=0.5, lobes=0.15, seed=1602)
    paint(el, poly, '#B03A32', '#6E1E1A', '#4A1410', ang=0.05, seed=1603, dens=1.6, lw=1.5, add_shape=False,
          length=(10, 18))
    inner = np.array([[cx - 98, near - 6], [cx - 70, far + 6], [cx + 70, far + 6], [cx + 98, near - 6]], float)
    sc = el.canvas()
    sc.line(closed(inner) * el.s, 1.8 * el.s, 0.9, 0.3, 0.8, seed=1604, taper=(0, 0))
    mh = np.array([[cx - 34, far + 22], [cx - 34, far + 14], [cx, far + 7], [cx + 34, far + 14], [cx + 34, far + 22]])
    sc.line(mh * el.s, 1.6 * el.s, 0.85, 0.5, 0.9, seed=1605, taper=(0.02, 0.02))
    xs = np.linspace(cx - 80, cx + 80, 11)
    zz = np.array([[x, near - 18 + (5 if i % 2 else -5)] for i, x in enumerate(xs)])
    sc.line(zz * el.s, 1.4 * el.s, 0.8, 0.4, 0.9, seed=1606, taper=(0.02, 0.02))
    el.layer('#E8C062', sc, k=0.95, wet_override=np.zeros((el.th, el.tw), np.float32))
    return el


def build_medallion():
    cx, cy, R = MED
    pad = 30
    el = Element(2 * (R + pad), 2 * (R + pad), 1.6, seed=1701, pivot=(R + pad, R + pad))
    c = R + pad
    disc = ellipse_pts(c, c, R, R, 160)
    m = el.mask(P(disc))
    el.shape = m * 0.85
    sc = el.canvas()
    hatch(sc, m, math.radians(-50), spacing=3.0 * el.s, length=(14 * el.s, 24 * el.s), cluster=(5, 9),
          press=(0.32, 0.5), width=(1.0 * el.s, 1.4 * el.s), density=1.1, seed=1702, t_range=(0.35, 0.9))
    el.layer('#A9B4C4', sc, k=0.6, wet_override=np.zeros((el.th, el.tw), np.float32))

    sc = el.canvas()
    sc.line(np.vstack([ellipse_pts(c, c, R, R, 160, -math.pi / 2, 3 * math.pi / 2 - 0.0001)]) * el.s, 3.0 * el.s, 0.95,
            0.0, 0.5, seed=1703, taper=(0.02, 0.02))
    el.line_layer('#4A3A30', sc, k=0.9)
    # dilim: zaman = açı (saat yönünde, tepeden)
    sl = Element(2 * (R + pad), 2 * (R + pad), 1.6, seed=1711, pivot=(R + pad, R + pad))
    S = sl.s
    yy, xx = np.mgrid[0:sl.th, 0:sl.tw].astype(np.float32) / S - c
    ang = (np.arctan2(xx, -yy) % (2 * math.pi)) / (2 * math.pi)
    wedge = (ang <= SLICE).astype(np.float32) * sl.mask(P(disc))
    sl.shape = wedge.copy()
    sl.set_wet(np.ones_like(wedge), (ang / SLICE).astype(np.float32))
    paint(sl, None, '#F2B847', '#C9782A', None, m=wedge, ang=math.radians(60), seed=1712, dens=1.8, k=1.0,
          add_shape=False, bloom_n=1, bloom_r=(6, 14), wet_spread=0.7, tone=np.clip(np.hypot(xx, yy) / R, 0, 1),
          edge_k=2.6)
    for L in sl.layers:
        L.T = (ang / SLICE * 0.98).astype(np.float16)
    return el, sl


def draw(f, t, A):
    f.cam = Cam(540 + 2 * math.sin(t * 0.8), 992 + 4 * math.sin(t * 0.6), 1.0 + 0.05 * ramp(t, 29.0, 36.5, 'io'))
    f.place(A['sky'], -200 + 6 * (t - 28.85), -250)
    f.place(A['dawn'], 560, GROUND - 40, op=0.9 + 0.1 * math.sin(t))
    f.place(A['ground'], -200, GROUND - 20)
    f.place(A['plinth'], 540, GROUND + 4, pd=ramp(t, 29.12, 29.72, 'lin'), pw=ramp(t, 29.3, 29.95, 'lin'))
    # temeller (32.0)
    fo = ramp(t, 31.98, 32.6, 'lin')
    if fo > 0:
        f.place(A['found'], 0, GROUND + 12, pd=fo, op=1.0)
    # nur hüzmesi
    b = ramp(t, 29.95, 30.55, 'io')
    if b > 0:
        f.place(A['beam'], PL, PTOP + 6, op=b * (0.9 + 0.1 * math.sin(t * 2.0)), sy=0.4 + 0.6 * ease(b, 'o'))
    for key, x, t0 in (('pL', PL, 29.84), ('pR', PR, 30.9)):
        u = ease(ramp(t, t0, t0 + 0.42, 'lin'), 'back')
        if u > 0.01:
            f.place(A['shadow'], x + 14, GROUND + 4, sx=1.0, op=min(1.0, u), mode='add')
            el = A[key]
            f.place(el, x, GROUND, sy=max(0.01, u), sx=0.9 + 0.1 * min(1, u), pd=ramp(t, t0, t0 + 0.45, 'lin'),
                    pw=ramp(t, t0 + 0.15, t0 + 0.7, 'lin'))
    # kemer taşları
    n = len(A['stones'])
    order = [0, 8, 1, 7, 2, 6, 3, 5, 4]
    for r, i in enumerate(order):
        el, (cx, cy) = A['stones'][i]
        t0 = 32.92 + 0.06 * r
        if t < t0:
            continue
        u = ramp(t, t0, t0 + 0.24, 'lin')
        drop = 1 - ease(u, 'back') if i == 4 else (1 - u) ** 2
        f.place(el, cx, cy - 300 * drop, op=ramp(t, t0, t0 + 0.08, 'lin'), pd=ramp(t, t0, t0 + 0.2, 'lin'),
                pw=ramp(t, t0 + 0.1, t0 + 0.4, 'lin'))
    # seccade ve adam (arkadan, kemere dönük kıyam)
    ru = ramp(t, 33.8, 34.12, 'io')
    if ru > 0:
        f.place(A['rug'], 540, GROUND - 14, sy=max(0.01, ru), pd=ru)
    if t > 33.86:
        br = 1.0 + 0.005 * math.sin(t * 2.2)
        f.place(A['shadow'], 548, GROUND - 26, sx=0.55, op=ramp(t, 33.86, 34.2, 'lin'), mode='add')
        f.place(A['man'], 540, GROUND - 24, sx=1.18, sy=1.18 * br, pd=ramp(t, 33.86, 34.2, 'lin'),
                pw=ramp(t, 33.95, 34.4, 'lin'))
    # madalyon (hisse)
    mo = ramp(t, 34.5, 34.95, 'lin')
    if mo > 0:
        cx, cy, R = MED
        sc = ease(ramp(t, 34.5, 34.8, 'lin'), 'back')
        f.place(A['med'], cx, cy, sx=max(0.01, sc), pd=mo)
        sl = ramp(t, 35.44, 35.85, 'io')
        if sl > 0:
            f.place(A['slice'], cx, cy, pd=sl, pw=sl)


def load():
    return cached('arch_v6', build)
