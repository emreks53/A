# -*- coding: utf-8 -*-
"""S4: ve kısa bir ömürde hayat-ı ebediyeye — perspektif yol, ufukta nur."""
import math
import numpy as np
from wc import WorldWet, Element, bez, P, ease, ramp, slim, sstep, blur, fbm, gnorm, pig, ellipse_pts, hatch
from comp import Cam
from cache import cached
from kit import build_sky, paint, glow_density, closed, build_cypress, build_shadow
from man import build_figure

VP = (540.0, 760.0)
HZ = 760.0
MAN_Y = 1262.0
LIFE = (1196.0, 1318.0)


def road_x(y, side):
    u = (y - HZ) / (1920 - HZ)
    half = 5 + (400 - 5) * u
    return VP[0] + side * half


def wel(x0, y0, w, h, s, seed):
    el = Element(w, h, s, seed=seed, pivot=(0, 0))
    el.X0, el.Y0 = x0, y0
    return el


def build():
    ww = WorldWet(angle=math.radians(218), origin=(560, 980), scale=900, amp=0.13, seed=911)
    A = {}
    A['sky'] = build_sky(1300, 1000, s=0.6, seed=211, top='#7FB3DE', deep='#4F74C2', horizon=HZ + 200 + 30,
                         clouds=3, cloud_y=(0.12, 0.5), ww=ww, place=(-110, -200), warm=('#F2B36A', HZ + 200), dens=0.85)
    # tarlalar
    el = wel(-110, HZ - 6, 1300, 1940 - HZ, 0.7, 221)
    o = np.array([el.X0, el.Y0])
    left = np.array([[-110, HZ], [road_x(HZ, -1), HZ], [road_x(1940, -1), 1940], [-110, 1940]]) - o
    right = np.array([[road_x(HZ, 1), HZ], [1190, HZ], [1190, 1940], [road_x(1940, 1), 1940]]) - o
    ml, mr = el.mask(P(left)), el.mask(P(right))
    el.shape = np.maximum(ml, mr)
    ww.apply(el, el.X0, el.Y0)
    S = el.s
    yy = np.mgrid[0:el.th, 0:el.tw][0].astype(np.float32) / S + el.Y0
    depth = np.clip((yy - HZ) / (1920 - HZ), 0, 1)
    for i, m in enumerate((ml, mr)):
        paint(el, None, '#93BE62', '#4A8442', None, m=m, ang=math.radians(-6 if i else 6), seed=221 + i * 5,
              dens=0.75, length=(20, 38), press=(0.32, 0.55), k=0.75, kshade=0.55, add_shape=False, bloom_n=None,
              tone=np.clip(0.25 + 0.55 * depth, 0, 1), wet_spread=1.3)
    sc = el.canvas()
    for k in range(-8, 9):
        if abs(k) <= 1:
            continue
        xb = 540 + k * 240
        p0 = np.array([VP[0] + (xb - VP[0]) * 0.005, HZ + 2])
        p1 = np.array([xb, 1940])
        line = np.array([p0 + (p1 - p0) * u for u in np.linspace(0.02, 1, 30)]) - o
        sc.line(line * S, 1.3 * S, 0.5, 0.2, 0.7, seed=300 + k, taper=(0.4, 0.02), press_noise=0.35)
    el.line_layer('#2E5E34', sc, k=0.65, clip=np.maximum(ml, mr))
    el.shape = el.shape * 0
    A['fields'] = el
    # ufuk servileri
    A['cyp'] = [build_cypress(h, s=1.0, seed=430 + i) for i, h in enumerate((70, 54, 62, 48))]
    # yol
    el = wel(0, HZ - 4, 1080, 1940 - HZ, 0.9, 231)
    o = np.array([el.X0, el.Y0])
    ys = np.linspace(HZ, 1935, 48)
    L = np.array([[road_x(y, -1), y] for y in ys])
    R = np.array([[road_x(y, 1), y] for y in ys])
    poly = np.vstack([L, R[::-1]]) - o
    m = el.mask(P(poly))
    el.shape = m.copy()
    ww.apply(el, el.X0, el.Y0)
    S = el.s
    yy, xx = np.mgrid[0:el.th, 0:el.tw].astype(np.float32)
    Y = yy / S + el.Y0
    X = xx / S + el.X0
    paint(el, None, '#E8CC94', '#B48A55', None, m=m,
          ang=lambda x, y: math.atan2((y / S + el.Y0) - VP[1], (x / S + el.X0) - VP[0]),
          seed=232, dens=1.0, length=(16, 30), press=(0.33, 0.58), k=0.78, kshade=0.55, add_shape=False,
          tone=np.clip(0.15 + 0.7 * (np.abs(X - VP[0]) / np.maximum(1, (Y - HZ) * 0.345 + 5)), 0, 1), bloom_n=None)
    sc = el.canvas()
    sc.line((L - o) * S, 1.8 * S, 0.8, 0.0, 0.6, seed=233, taper=(0.5, 0.0))
    sc.line((R - o) * S, 1.8 * S, 0.8, 0.05, 0.65, seed=234, taper=(0.5, 0.0))
    el.line_layer('#8C6A44', sc, k=0.8)
    el.shape = el.shape * 0
    A['road'] = el
    # ömür bandı: adamın çevresinde kısa bir yol parçası
    y0, y1 = LIFE
    el = wel(0, y0 - 10, 1080, y1 - y0 + 20, 1.2, 241)
    o = np.array([el.X0, el.Y0])
    ys = np.linspace(y0, y1, 12)
    L = np.array([[road_x(y, -1) + 3, y] for y in ys])
    R = np.array([[road_x(y, 1) - 3, y] for y in ys])
    poly = np.vstack([L, R[::-1]]) - o
    m = el.mask(P(poly))
    el.shape = m.copy()
    Tw = np.clip(1 - np.mgrid[0:el.th, 0:el.tw][0] / el.th, 0, 1) * 0.85 + 0.1 * gnorm(fbm(el.th, el.tw, 20, 3, .5, 4))
    el.set_wet(np.ones_like(m), Tw)
    paint(el, None, '#F2A27C', '#D8605A', None, m=m, ang=0.0, seed=242, dens=1.4, length=(14, 26), k=0.62,
          kshade=0.45, add_shape=False, bloom_n=1, bloom_r=(10, 24), wet_spread=1.0)
    sc = el.canvas()
    for yv, tt in ((y1, 0.0), (y0, 0.5)):
        sc.line((np.array([[road_x(yv, -1) + 2, yv], [road_x(yv, 1) - 2, yv]]) - o) * el.s, 2.2 * el.s, 0.9,
                tt, tt + 0.5, seed=243 + int(yv), taper=(0.05, 0.05))
    el.line_layer('#A8403A', sc, k=0.85)
    el.shape = el.shape * 0
    A['life'] = el
    # mil taşları
    st = np.vstack([bez((10, 85), (8, 40), (12, 12), (35, 8), 12), bez((35, 8), (58, 12), (62, 40), (60, 85), 12)[1:]])
    A['stones'] = []
    for i in range(2):
        el = Element(70, 90, 2.4, seed=251 + i, pivot=(35, 85))
        el.add_shape(P(st))
        el.wet_split(angle=math.radians(190), frac=0.5, lobes=0.15, seed=252 + i)
        paint(el, st, '#DDD2BE', '#8C8070', '#4A4038', ang=math.radians(70), seed=253 + i, dens=1.3, lw=1.6,
              add_shape=False)
        A['stones'].append(el)
    # nur
    el = Element(1700, 1300, 0.5, seed=261, pivot=(850, 650))
    D = glow_density(el.th, el.tw, 850 * 0.5, 650 * 0.5, 640, '#F2C14E', k=0.85, s=0.5, seed=262, core=0.05, rays=16)
    D += glow_density(el.th, el.tw, 850 * 0.5, 650 * 0.5, 300, '#F49B7A', k=0.3, s=0.5, seed=263, core=0.08)
    el.add_density(D)
    A['nur'] = el
    el = Element(1400, 1000, 0.8, seed=271, pivot=(700, 500))
    sc = el.canvas()
    rr = np.random.default_rng(7)
    for k in range(46):
        a = -math.pi + k * (math.pi / 45) + rr.uniform(-0.02, 0.02)
        r0 = rr.uniform(60, 110)
        r1 = rr.uniform(320, 640)
        p = np.array([[700 + math.cos(a) * r0, 500 + math.sin(a) * r0 * 0.85],
                      [700 + math.cos(a) * r1, 500 + math.sin(a) * r1 * 0.85]])
        sc.line(p * el.s, 1.4 * el.s, 0.55, rr.uniform(0, 0.4), 1.0, seed=280 + k, taper=(0.15, 0.6))
    el.layer('#EDB93A', sc, k=0.7, wet_override=np.zeros((el.th, el.tw), np.float32))
    A['rays'] = el
    # yolun ilerisi aydınlanır (ömür bandından ufka ince sıcak şerit)
    el = wel(0, HZ, 1080, LIFE[0] - HZ + 4, 1.0, 291)
    o = np.array([el.X0, el.Y0])
    ys = np.linspace(HZ + 1, LIFE[0] + 2, 30)
    L = np.array([[road_x(y, -1) * 0.25 + VP[0] * 0.75, y] for y in ys])
    R = np.array([[road_x(y, 1) * 0.25 + VP[0] * 0.75, y] for y in ys])
    poly = np.vstack([L, R[::-1]]) - o
    m = el.mask(P(poly), blur_px=2)
    el.shape = m * 0
    Tw = np.clip(np.mgrid[0:el.th, 0:el.tw][0] / el.th, 0, 1)[::-1] * 0
    yyn = np.mgrid[0:el.th, 0:el.tw][0].astype(np.float32) / el.th
    el.set_wet(np.ones_like(m), 1 - yyn)
    el.add_density(m[..., None] * pig('#F5C45A', 0.55)[None, None, :] * (0.6 + 0.4 * gnorm(fbm(el.th, el.tw, 14, 2, .5, 9)))[..., None])
    A['glowroad'] = el
    A['man'] = build_figure('back', s=2.4, seed=160)
    A['shadow'] = build_shadow(110, 18, s=2.0)
    return slim(A)


def draw(f, t, A):
    push = ease(ramp(t, 8.15, 9.5, 'lin'), 'io')
    z = 1.0 + 0.025 * ramp(t, 6.6, 8.2, 'io') + 0.08 * push
    cy = 960 - 95 * push
    f.cam = Cam(540 + 2 * math.sin(t), cy, z)
    f.place(A['sky'], -110 + 6 * (t - 6.6), -200)
    for i, (c, x) in enumerate(zip(A['cyp'], (300, 345, 760, 805))):
        f.place(c, x, HZ + 3)
    f.place(A['fields'], A['fields'].X0, A['fields'].Y0)
    f.place(A['road'], A['road'].X0, A['road'].Y0)
    g = ease(ramp(t, 8.18, 8.95, 'lin'), 'o')
    if g > 0:
        f.place(A['nur'], VP[0], VP[1], sx=0.25 + 0.75 * g, op=g)
        f.place(A['glowroad'], 0, HZ, op=ramp(t, 8.25, 8.9, 'io'))
        f.place(A['rays'], VP[0], VP[1], sx=0.3 + 0.7 * g, pd=ramp(t, 8.25, 9.0, 'lin'),
                rot=0.04 * math.sin(t * 0.8))
    # kısa ömür (6.98-7.77)
    life = A['life']
    f.place(life, life.X0, life.Y0, pd=ramp(t, 6.95, 7.3, 'lin'), pw=ramp(t, 7.05, 7.7, 'lin'))
    for i, (yv, t0) in enumerate(((LIFE[1], 7.0), (LIFE[0], 7.42))):
        sc = ease(ramp(t, t0, t0 + 0.26, 'lin'), 'back')
        if sc > 0.01:
            k = (yv - HZ) / (1920 - HZ)
            f.place(A['stones'][i], road_x(yv, -1) - 10 - 30 * k, yv + 4, sx=max(0.01, sc) * (0.5 + 0.9 * k),
                    pd=ramp(t, t0, t0 + 0.25, 'lin'))
    br = 1.0 + 0.006 * math.sin(t * 2.2)
    f.place(A['shadow'], 548, MAN_Y + 2, sx=0.9, mode='add')
    f.place(A['man'], 540, MAN_Y, sx=0.96, sy=0.96 * br)


def load():
    return cached('road_v4', build)
