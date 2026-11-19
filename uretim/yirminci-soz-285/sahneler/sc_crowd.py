# -*- coding: utf-8 -*-
"""S7-S9: Halbuki siz ekseriyet itibarıyla şu fâni dünyayı bir makarr-ı ebedî nokta-i nazarında
ve gaflet perdesi altında."""
import math
import numpy as np
from wc import (WorldWet, Element, bez, P, ease, ramp, slim, sstep, pig, gnorm, fbm, ellipse_pts, hatch, blur,
                mask_of)
from comp import Cam
from cache import cached
from kit import build_sky, build_ground, paint, glow_density, closed, leaf_poly, build_shadow
from assets_globe import build_globe
from man import build_figure
from scipy_free import smooth_closed, smooth_open
from wc import blur as blur_np

GROUND = 1236.0
GX, GY, GR = 1640.0, 820.0, 300.0
EYE_HW, EYE_UP, EYE_DN = 860.0, 600.0, 450.0

# kalabalık: (x, y_taban, ölçek, çoğunluk mu, renk anahtarı)
CROWD = [(-30, 1252, 1.2, 1, 0), (140, 1248, 1.26, 1, 1), (312, 1255, 1.18, 0, 0), (484, 1246, 1.24, 1, 2),
         (656, 1254, 1.21, 1, 3), (828, 1249, 1.27, 0, 1), (1000, 1256, 1.19, 1, 0), (1150, 1250, 1.25, 1, 2),
         (55, 1330, 1.5, 1, 3), (245, 1338, 1.58, 1, 2), (435, 1328, 1.46, 1, 0), (625, 1336, 1.55, 0, 2),
         (815, 1330, 1.51, 1, 1), (1005, 1338, 1.57, 1, 3)]
WARM = [dict(tunic='#E0912E', tunic2='#A0561A', tunic_line='#6A3410'),
        dict(tunic='#D46A3A', tunic2='#8E3A1E', tunic_line='#5E2412'),
        dict(tunic='#E8B83A', tunic2='#A87A1C', tunic_line='#6E4E10'),
        dict(tunic='#C9783E', tunic2='#7E4422', tunic_line='#4E2A14')]
GRAY = dict(tunic='#C9C4BC', tunic2='#8E8880', tunic_line='#5A5650', trouser='#C2C0BC', trouser2='#8A8884',
            trouser_line='#5A5856', skin='#E2D6CC', skin2='#B8A898', skin_line='#7A6A5E', hair='#8A8078',
            hair2='#5A524C', shoe='#8A847E', shoe2='#5A5650')
COOL = [GRAY, GRAY, GRAY, GRAY]


def build():
    ww = WorldWet(bounds=(-800, -900, 3200, 2900), angle=math.radians(196), origin=(900, 950), scale=1100, amp=0.12,
                  seed=941)
    A = {}
    A['sky'] = build_sky(2900, 1700, s=0.45, seed=251, top='#8BBCE2', deep='#5A80C8', horizon=GROUND + 240 + 60,
                         clouds=6, cloud_y=(0.1, 0.45), ww=ww, place=(-300, -240), dens=0.85)
    A['ground'] = build_ground(2900, 700, s=0.6, seed=351, top_y=20, base='#E6CB96', green='#8DB85A',
                               shade='#B88A55', ww=ww, place=(-300, GROUND - 20), fade=40)
    figs = []
    for i, (x, y, sc, maj, ck) in enumerate(CROWD):
        pal = WARM[ck] if maj else COOL[ck]
        figs.append(build_figure('front', s=1.7, seed=180 + i * 9, pal=pal, hair_style=i % 3,
                                 body_w=0.92 + 0.16 * ((i * 37) % 5) / 4, sketch=not maj))
    A['figs'] = figs
    wwg = WorldWet(bounds=(1000, -200, 2300, 1900), angle=math.radians(200), origin=(GX + 30, GY), scale=650,
                   amp=0.12, seed=947)
    A['globe'] = build_globe(R=GR, s=1.5, ww=wwg, place=(GX, GY), seed=17)
    # saray (ebedî sanılan mesken): kuleli, kalın taş
    A['palace'] = build_palace(wwg)
    # temel kazıkları: köşkün altından küreye inen taş ayaklar (kahverengi tarama)
    el = Element(420, 300, 1.6, seed=961, pivot=(210, 10))
    allm = np.zeros((el.th, el.tw), np.float32)
    piles = []
    for k in range(5):
        x0 = 210 + (k - 2) * 62
        L = 250 - 40 * abs(k - 2)
        q = np.array([[x0 - 15, 10], [x0 + 15, 10], [x0 + 8, 10 + L], [x0 - 8, 10 + L]], float)
        piles.append(q)
        allm = np.maximum(allm, el.mask(P(q)))
    el.shape = allm
    el.wet_split(angle=math.radians(195), frac=0.5, lobes=0.15, seed=962)
    for k, q in enumerate(piles):
        paint(el, q, '#9C7A56', '#5A4028', '#3A2814', ang=math.radians(88), seed=963 + k, dens=1.6, lw=1.5,
              add_shape=False, t=(0.05 * k, 0.6 + 0.08 * k), length=(10, 18))
        T = np.clip((np.mgrid[0:el.th, 0:el.tw][0] / el.s - 10) / 260, 0, 1)
        for Lr in el.layers[-3:]:
            Lr.T = np.minimum(Lr.T.astype(np.float32), T + 0.002).astype(np.float16) * 0 + T.astype(np.float16)
    el.shape = el.shape * 0   # kazıklar küreyi örtmez (çizilmeden önce beyaz iz kalmasın)
    A['roots'] = el
    # yapraklar (fanilik)
    A['leaves'] = []
    for k in range(5):
        el = Element(60, 60, 2.0, seed=970 + k, pivot=(30, 30))
        lp, mid = leaf_poly((10, 30), (52, 30), 20, bend=0.1)
        el.add_shape(P(lp))
        el.wet_split(angle=math.radians(180), frac=0.5, lobes=0.2, seed=971 + k)
        col = ['#6FAE4A', '#9CBF4A', '#D6A456', '#C9783E', '#7FB050'][k]
        paint(el, lp, col, '#2E6B3E', '#1F4A2E', ang=0.6, seed=972 + k, dens=1.6, lw=1.2, add_shape=False,
              extra_lines=[(mid[1:-1], 0.9, 0.6)], spacing=1.9, length=(5, 9))
        A['leaves'].append(el)
    # kenar çözülmesi: halka biçimli açma maskesi
    el = Element(2 * GR + 80, 2 * GR + 80, 0.8, seed=981, pivot=(GR + 40, GR + 40))
    S = el.s
    yy, xx = np.mgrid[0:el.th, 0:el.tw].astype(np.float32) / S - (GR + 40)
    d = np.hypot(xx, yy) / GR
    n = gnorm(fbm(el.th, el.tw, 18 * S, 3, 0.5, 982))
    el.ring_T = np.clip((1.04 - d) / 0.2 + 0.35 * (n - 0.5), 0, 1).astype(np.float32)
    el.shape = (d < 1.08).astype(np.float32)
    A['dissolve'] = el
    # kum tanecikleri
    el = Element(16, 16, 2.0, seed=991, pivot=(8, 8))
    pts = ellipse_pts(8, 8, 4.6, 5.0, 16)
    el.add_shape(P(pts))
    paint(el, pts, '#D9A85A', None, None, ang=0.3, seed=992, dens=3, spacing=1.4, length=(2, 4), no_wet=True)
    A['grain'] = el
    # göz
    A['eye'] = build_eye()
    A['curtain'] = build_curtain()
    A['shadow'] = build_shadow(110, 18, s=1.6)
    # perde gölgesi: yalnız gözün içinde, perde kenarından aşağı sönen
    eye = A['eye']
    el = Element(eye.ww, eye.wh, 0.5, seed=1011, pivot=eye.pivot)
    am = el.mask(P(eye.almond))
    yy = np.mgrid[0:el.th, 0:el.tw][0].astype(np.float32) / el.s
    cyl = eye.pivot[1]
    dens = sstep(cyl + 360, cyl + 20, yy) * 0.55 * am
    el.add_density(blur_np(dens, 3)[..., None] * pig('#4A3A5E', 0.8)[None, None, :])
    A['shade'] = el
    return slim(A)


def build_palace(ww):
    """Osmanlı köşkü: taş zemin katı (kemerli), cumbalı ahşap üst kat, geniş saçak, kiremit kırma çatı."""
    w, h = 420, 236
    el = Element(w, h, 1.8, seed=1021, pivot=(w / 2, h - 6))
    el.X0, el.Y0 = GX - w / 2, GY - GR + 26 - (h - 6)
    by = h - 6
    base = np.array([[78, by], [78, 150], [342, 150], [342, by]], float)
    upper = np.array([[86, 150], [86, 80], [334, 80], [334, 150]], float)
    cumba = np.array([[150, 156], [146, 74], [274, 74], [270, 156]], float)
    eave = np.array([[52, 82], [52, 70], [368, 70], [368, 82]], float)
    roof = np.array([[60, 72], [128, 16], [292, 16], [360, 72]], float)
    parts = [base, upper, cumba, eave, roof]
    allm = np.maximum.reduce([el.mask(P(q)) for q in parts])
    el.shape = allm
    ww.apply(el, el.X0, el.Y0)
    m_cumba = el.mask(P(cumba))
    m_eave = el.mask(P(eave))
    paint(el, base, '#D6CCB8', '#8C8270', '#4A4234', ang=math.radians(-6), seed=1022, dens=1.3, lw=1.7,
          add_shape=False, k=0.85)
    paint(el, upper, '#EBC7A4', '#A87A58', '#5A3A24', ang=math.radians(84), seed=1023, dens=1.3, lw=1.6,
          add_shape=False, k=0.8, under=np.maximum(m_cumba, m_eave))
    paint(el, cumba, '#F0D0AE', '#B08060', '#5A3A24', ang=math.radians(84), seed=1024, dens=1.3, lw=1.7,
          add_shape=False, k=0.8, under=m_eave)
    paint(el, eave, '#7A4A2A', None, '#3A2014', ang=0.0, seed=1025, dens=1.8, lw=1.3, add_shape=False)
    paint(el, roof, '#C0583E', '#7A2E1E', '#4A1A10', ang=math.radians(70), seed=1026, dens=1.6, lw=1.7,
          add_shape=False, under=m_eave)
    for i, x in enumerate((112, 210, 308)):
        arch = np.vstack([[x - 18, by], [x - 18, 186], bez((x - 18, 186), (x - 18, 166), (x + 18, 166), (x + 18, 186), 10),
                          [x + 18, by]])
        paint(el, arch, '#3A3040', None, '#221A28', ang=1.1, seed=1030 + i, dens=2.2, spacing=1.7, length=(5, 10),
              lw=1.3, add_shape=False)
    for i, x in enumerate((176, 210, 244, 110, 310)):
        y0 = 92 if i < 3 else 98
        win = np.vstack([[x - 9, y0 + 44], [x - 9, y0 + 12], bez((x - 9, y0 + 12), (x - 9, y0), (x + 9, y0), (x + 9, y0 + 12), 8),
                         [x + 9, y0 + 44]])
        paint(el, win, '#2E3A4A', None, '#1A2230', ang=1.2, seed=1040 + i, dens=2.2, spacing=1.6, length=(5, 9),
              lw=1.1, add_shape=False)
    sc = el.canvas()
    for x in np.linspace(156, 264, 6):   # cumba payandaları
        sc.line(np.array([[x, 158], [x + 6, 168]]) * el.s, 2.2 * el.s, 0.8, 0.5, 0.8, seed=1050 + int(x), taper=(0, 0))
    for y in np.arange(166, by, 16):
        sc.line(np.array([[80, y], [340, y]]) * el.s, 1.0 * el.s, 0.45, 0.4, 0.8, seed=1060 + int(y), taper=(0.02, 0.02))
    el.line_layer('#4A3A2A', sc, k=0.6)
    return el


def build_eye():
    w, h = 2 * EYE_HW * 1.42, EYE_UP * 1.9 + EYE_DN * 1.85 + 160
    el = Element(w, h, 0.7, seed=1101, pivot=(w / 2, EYE_UP * 1.9 + 80))
    cx, cy = w / 2, EYE_UP * 1.9 + 80
    upper = bez((cx - EYE_HW, cy), (cx - EYE_HW * 0.55, cy - EYE_UP * 1.12), (cx + EYE_HW * 0.45, cy - EYE_UP * 1.18),
                (cx + EYE_HW, cy + 6), 60)
    lower = bez((cx + EYE_HW, cy + 6), (cx + EYE_HW * 0.5, cy + EYE_DN * 1.08), (cx - EYE_HW * 0.5, cy + EYE_DN * 1.02),
                (cx - EYE_HW, cy), 60)
    almond = np.vstack([upper, lower[1:-1]])
    m_al = el.mask(P(almond))
    iris = el.mask(P(ellipse_pts(cx, cy, GR + 4, GR + 4, 120)))
    sclera = m_al * (1 - iris)
    el.shape = np.zeros_like(m_al)
    S = el.s
    yy, xx = np.mgrid[0:el.th, 0:el.tw].astype(np.float32) / S
    # yüz parçası: bademin çevresinde ten yıkaması (dışa doğru düzensiz söner) + kaş
    face_d = ((xx - cx) / (EYE_HW * 1.3)) ** 2 + ((yy - cy + 40) / (EYE_UP * 1.7)) ** 2
    nz = gnorm(fbm(el.th, el.tw, 80 * S, 3, 0.5, 1190))
    face = sstep(1.0 + 0.12 * (nz - 0.5), 0.7, face_d) * (1 - m_al)
    el.wet = np.ones_like(m_al)
    el.Tw = np.clip(np.abs(xx - cx) / EYE_HW, 0, 1).astype(np.float32)
    sc = el.canvas()
    hatch(sc, face, math.radians(-35), spacing=3.0 * S, length=(26 * S, 46 * S), cluster=(6, 10), press=(0.35, 0.6),
          width=(1.1 * S, 1.6 * S), density=1.0, tone=0.5 + 0.5 * face, seed=1191, t_range=(0.2, 0.8))
    el.layer('#E8B896', sc, k=0.7, clip=face, bloom_n=2, bloom_r=(40, 90), wet_spread=1.5, edge_k=1.6)
    sc = el.canvas()
    lid_sh = face * sstep(cy - EYE_UP * 1.45, cy - EYE_UP * 0.9, yy) * sstep(cy + 10, cy - EYE_UP * 0.8, yy)
    hatch(sc, lid_sh, math.radians(15), spacing=3.0 * S, length=(22 * S, 40 * S), cluster=(5, 9), press=(0.3, 0.55),
          width=(1.1 * S, 1.5 * S), density=0.9, tone=lid_sh, seed=1192, t_range=(0.3, 0.85))
    el.layer('#B07A68', sc, k=0.55, clip=face, bloom_n=1, wet_spread=1.4)
    brow = bez((cx - EYE_HW * 0.95, cy - EYE_UP * 1.2), (cx - EYE_HW * 0.4, cy - EYE_UP * 1.85),
               (cx + EYE_HW * 0.5, cy - EYE_UP * 1.8), (cx + EYE_HW * 1.0, cy - EYE_UP * 1.05), 50)
    sc = el.canvas()
    rrb = np.random.default_rng(11)
    for k in range(60):
        u = k / 59
        j = int(u * (len(brow) - 1))
        p = brow[j]
        sc.line(np.array([p + [0, 16], p + [26 + 10 * rrb.random(), -8 - 6 * rrb.random()]]) * S,
                (5.0 - 2.5 * abs(u - 0.4)) * S, 0.8, 0.5, 0.8, seed=1300 + k, taper=(0.1, 0.6))
    el.layer('#4A3428', sc, k=0.9, wet_override=np.zeros((el.th, el.tw), np.float32))
    # sklera: üst kapak altında gölge, köşelerde pembe
    top_sh = sstep(cy - EYE_UP * 0.2, cy - EYE_UP * 0.95, yy)
    corner = sstep(EYE_HW * 0.55, EYE_HW * 0.95, np.abs(xx - cx))
    sc = el.canvas()
    hatch(sc, sclera * np.clip(top_sh * 0.9 + 0.15, 0, 1), math.radians(10), spacing=3.2 * S, length=(26 * S, 44 * S),
          cluster=(6, 10), press=(0.3, 0.5), width=(1.1 * S, 1.5 * S), density=0.8, tone=top_sh, seed=1102,
          t_range=(0.3, 0.8))
    el.layer('#9C9AB8', sc, k=0.5, shape=sclera, clip=sclera, bloom_n=1, wet_spread=1.4)
    sc = el.canvas()
    hatch(sc, sclera * corner, math.radians(-20), spacing=3.2 * S, length=(20 * S, 36 * S), cluster=(5, 9),
          press=(0.3, 0.5), width=(1.1 * S, 1.5 * S), density=0.9, tone=corner, seed=1103, t_range=(0.4, 0.9))
    el.layer('#E89AA0', sc, k=0.55, shape=sclera, clip=sclera, bloom_n=1, wet_spread=1.4)
    # kapak çizgileri, kirpikler, kıvrım, kaş
    sc = el.canvas()
    sc.line(upper * S, 7.0 * S, 0.95, 0.0, 0.45, seed=1104, taper=(0.02, 0.02))
    sc.line(lower * S, 4.6 * S, 0.88, 0.1, 0.5, seed=1105, taper=(0.02, 0.02))
    crease = bez((cx - EYE_HW * 0.82, cy - EYE_UP * 0.42), (cx - EYE_HW * 0.45, cy - EYE_UP * 1.4),
                 (cx + EYE_HW * 0.5, cy - EYE_UP * 1.42), (cx + EYE_HW * 0.88, cy - EYE_UP * 0.38), 50)
    sc.line(crease * S, 3.0 * S, 0.45, 0.35, 0.7, seed=1106, taper=(0.35, 0.35))
    rr = np.random.default_rng(4)
    n = 26
    for k in range(n):
        u = 0.08 + 0.86 * (k + rr.uniform(-0.35, 0.35)) / (n - 1)
        j = int(u * (len(upper) - 1))
        p = upper[j]
        tg = upper[min(j + 1, len(upper) - 1)] - upper[max(j - 1, 0)]
        tg /= np.linalg.norm(tg) + 1e-9
        nv = np.array([tg[1], -tg[0]])
        L = (55 + 55 * math.sin(math.pi * u)) * rr.uniform(0.7, 1.15)
        side = (u - 0.5) * 1.4
        q1 = p + nv * L * 0.5 + tg * L * 0.25 * side
        q2 = p + nv * L + tg * L * 0.55 * side
        sc.line(np.array([p, q1, q2]) * S, 4.2 * S, 0.9, 0.45 + 0.3 * u, 0.6 + 0.3 * u, seed=1110 + k,
                taper=(0.05, 0.9))
    for k in range(12):
        u = 0.18 + 0.64 * k / 11
        j = int(u * (len(lower) - 1))
        p = lower[j]
        sc.line(np.array([p, p + np.array([0, 26 + 10 * math.sin(math.pi * u)])]) * S, 2.6 * S, 0.7, 0.6, 0.85,
                seed=1140 + k, taper=(0.05, 0.9))
    el.line_layer('#3A2436', sc, k=0.95)
    el.shape = el.shape * 0
    el.almond = almond
    return el


def build_curtain():
    w, h = 2400, 2700
    el = Element(w, h, 0.5, seed=1201, pivot=(w / 2, h))
    S = el.s
    rr = np.random.default_rng(9)
    # düzensiz genişlikte kıvrımlar
    widths = rr.uniform(260, 420, 12)
    edges = np.concatenate([[0], np.cumsum(widths)])
    edges = edges[edges < w + 240]
    xs = np.linspace(0, w, 400)
    phase = np.interp(xs, edges, np.arange(len(edges)))
    fold = 0.5 - 0.5 * np.cos(phase * 2 * math.pi)
    yb = h - 70 - 34 * (1 - fold) + 6 * np.sin(xs / 37.0)
    poly = np.vstack([[0, 0], [w, 0], np.stack([xs[::-1], yb[::-1]], 1)])
    m = el.mask(P(poly))
    el.shape = m.copy()
    yy, xx = np.mgrid[0:el.th, 0:el.tw].astype(np.float32) / S
    ph2 = np.interp(xx, edges, np.arange(len(edges))).astype(np.float32)
    f2 = 0.5 - 0.5 * np.cos(ph2 * 2 * math.pi)
    # ıslak: kıvrım çukurları (koyu) ıslak, tepeler kuru kalem
    el.set_wet((sstep(0.62, 0.38, f2) * 0.0 + 1.0).astype(np.float32),
               np.clip(ph2 / (len(edges)), 0, 1).astype(np.float32))
    tone = np.clip(0.32 + 0.42 * (1 - f2) + 0.08 * (yy / h), 0, 1)
    paint(el, None, '#8E6A9A', '#4A3060', None, m=m, tone=tone, ang=math.radians(90), seed=1203, dens=1.2,
          length=(40, 80), press=(0.35, 0.65), k=0.62, kshade=0.7, add_shape=False, bloom_n=3, bloom_r=(30, 70),
          wet_spread=1.6, shade_ang=math.radians(91), shade_from=0.45, angle_jit=0.03)
    sc = el.canvas()
    for e in edges[1:-1]:
        x = e + rr.uniform(-6, 6)
        sc.line(np.array([[x, 0], [x + rr.uniform(-10, 10), h - 90]]) * S, 2.6 * S, 0.55, 0.0, 0.6, seed=1210 + int(x),
                taper=(0.0, 0.3), press_noise=0.3)
    el.line_layer('#3A2448', sc, k=0.55)
    el.veil = True
    fr = np.vstack([np.stack([xs, yb - 10], 1), np.stack([xs[::-1], yb[::-1] + 30], 1)])
    mf = el.mask(P(fr))
    el.shape = np.maximum(el.shape, mf)
    paint(el, None, '#E0AE48', '#9A6A1E', None, m=mf, ang=math.radians(90), seed=1220, dens=2.2, spacing=1.8,
          length=(12, 22), add_shape=False, k=0.95, no_wet=True)
    sc = el.canvas()
    sc.line(np.stack([xs, yb - 10], 1) * S, 3.2 * S, 0.9, 0.5, 0.9, seed=1221, taper=(0, 0))
    for x in np.arange(8, w, 16):
        yv = float(np.interp(x, xs, yb))
        sc.line(np.array([[x, yv - 2], [x + 1, yv + 32]]) * S, 1.7 * S, 0.8, 0.6, 0.9, seed=1230 + int(x), taper=(0, 0.3))
    el.line_layer('#7A4E12', sc, k=0.85)
    # tül: gövde yarı saydam (alttaki göz bulanık görünür), saçak örtücü
    el.shape = np.maximum(m * 0.62, mf).astype(np.float32)
    return el


# ------------------------------------------------------------------ çizim
def camera(t):
    # A: kalabalık; B: küre; C: göz (uzak)
    a = (540.0, 960.0, 1.0 + 0.03 * ramp(t, 16.9, 19.1, 'io'))
    b = (GX, 900.0, 1.06)
    c = (GX, 800.0, 0.58)
    u = ease(ramp(t, 19.12, 19.62, 'lin'), 'io3')
    x = a[0] + (b[0] - a[0]) * u
    y = a[1] + (b[1] - a[1]) * u
    z = a[2] + (b[2] - a[2]) * u
    v = ease(ramp(t, 21.42, 22.42, 'lin'), 'io3')
    x = x + (c[0] - x) * v
    y = y + (c[1] - y) * v
    z = z * (c[2] / z) ** v
    # perde inerken hafif sarsıntı yok; yavaş yaklaşma
    w = ramp(t, 22.5, 25.2, 'io')
    z = z * (1 + 0.06 * w)
    return Cam(x + 2 * math.sin(t * 0.7), y + 2 * math.sin(t * 0.9), z)


def motion_samples(t):
    return 5 if 19.14 <= t <= 19.6 else 1


def draw(f, t, A):
    f.cam = camera(t)
    bg = 1.0 - ramp(t, 21.42, 21.72, 'io')
    if bg > 0:
        f.place(A['sky'], -300 + 6 * (t - 16.9), -240, op=bg)
        f.place(A['ground'], -300, GROUND - 20, op=bg)
    # kalabalık
    for i, ((x, y, sc, maj, ck), fig) in enumerate(zip(CROWD, A['figs'])):
        t0 = 17.0 + 0.045 * i
        if t < t0 or t > 19.9:
            continue
        pd = ramp(t, t0, t0 + 0.42, 'lin')
        pw = 0.0
        op = 1.0
        if maj:
            k = sum(1 for c in CROWD[:i] if c[3])
            pw = ramp(t, 17.78 + 0.06 * k, 18.2 + 0.06 * k, 'lin')
        else:
            op = 1.0 - 0.38 * ramp(t, 18.1, 18.6, 'io')
        sway = 0.012 * math.sin(t * 1.7 + i)
        f.place(A['shadow'], x + 4, y + 2, sx=sc * 0.95, op=pd * op, mode='add')
        f.place(fig, x, y, sx=sc, sy=sc * (1 + 0.004 * math.sin(t * 2.3 + i)), rot=sway, pd=pd, pw=pw, op=op)
    # küre
    f.place(A['globe'], GX, GY)
    # fanilik: kenar çözülmesi (kâğıt geri gelir)
    dv = ramp(t, 19.6, 20.5, 'io')
    if dv > 0:
        el = A['dissolve']
        thr = dv * 0.55
        A_ = (sstep(thr + 0.02, thr - 0.02, el.ring_T) * el.shape.astype(np.float32)).astype(np.float32)
        f.place(el, GX, GY, mode='erase', DA=(np.zeros(A_.shape + (3,), np.float32), A_))
    # yapraklar savrulur
    rr = np.random.default_rng(12)
    for k in range(12):
        t0 = 19.6 + 0.06 * k
        if t < t0:
            continue
        u = (t - t0) / 1.6
        if u > 1:
            continue
        a0 = rr.uniform(-1.2, 0.6)
        r0 = GR * rr.uniform(0.75, 0.95)
        x = GX + math.cos(a0) * r0 + 520 * u + 40 * math.sin(u * 6 + k)
        y = GY + math.sin(a0) * r0 - 260 * u + 160 * u * u + 20 * math.cos(u * 5 + k)
        f.place(A['leaves'][k % 5], x, y, rot=u * 5 * (1 if k % 2 else -1) + k, sx=1.1 + 0.3 * (k % 3) / 2,
                op=1.0 - ramp(u, 0.6, 1.0, 'lin'))
    # kum akışı (alttan)
    if 19.7 < t < 21.4:
        for k in range(40):
            ph = (t - 19.7) * 1.8 + k / 40.0
            u = ph % 1.0
            if ph < 1.0 and u > (t - 19.7) * 1.8:
                continue
            x = GX + 8 * math.sin(k * 2.3) + 3 * math.sin(u * 9 + k)
            y = GY + GR - 6 + 165 * u ** 1.6
            f.place(A['grain'], x + 10 * math.sin(k * 1.7), y, op=1.0 - ramp(u, 0.7, 1.0, 'lin'),
                    sx=1.0 + 0.5 * ((k * 7) % 3) / 2)
    # saray yükselir
    pr = ease(ramp(t, 20.62, 21.08, 'lin'), 'back')
    if pr > 0.01:
        p = A['palace']
        by = GY - GR * 0.9 + 6
        f.place(A['roots'], GX, by - 4, pd=ramp(t, 20.72, 21.3, 'lin'), sx=0.82, sy=0.82)
        f.place(p, GX, by, sx=(0.92 + 0.08 * pr) * 0.78, sy=max(0.01, pr) * 0.78, pd=ramp(t, 20.62, 21.1, 'lin'),
                pw=ramp(t, 20.75, 21.3, 'lin'))
    # göz
    if t > 21.5:
        f.place(A['eye'], GX, GY, pd=ramp(t, 21.55, 22.4, 'lin'), pw=ramp(t, 21.8, 22.6, 'lin'))
    # perde
    cu = ramp(t, 23.06, 23.62, 'lin')
    if cu > 0:
        drop = ease(cu, 'o') + 0.035 * math.sin(math.pi * ramp(t, 23.4, 23.9, 'lin'))
        yb = (GY - EYE_UP - 1100) + (GY + EYE_DN + 40 - (GY - EYE_UP - 1100)) * drop
        sway = 0.006 * math.sin((t - 23.6) * 2.4) * (1 if t > 23.6 else 0)
        f.place(A['shade'], GX, GY, op=0.5 * ramp(t, 23.4, 24.2, 'io'), mode='add')
        f.place(A['curtain'], GX, yb, rot=sway, pd=1.0)


def load():
    return cached('crowd_v6', build)
