# -*- coding: utf-8 -*-
"""S1-S3: Dünya bir misafirhanedir / İnsan onda az duracaktır / vazifesi çok bir misafirdir."""
import math
import numpy as np
from wc import WorldWet, Element, bez, P, ease, ramp, slim
from comp import Cam
from cache import cached
from assets_globe import build_globe
from assets_han import build_han, build_drum, build_door_light, GROUND, DX0, DX1
from kit import build_sky, build_ground, build_cypress, build_flower, paint, build_hourglass, build_shadow
from assets_items import build_token
from man import build_side, walk_pose, REST, draw_side, lerp_pose

TOKENS = ['book', 'lamp', 'heart', 'jug', 'sapling', 'tesbih', 'bread']
FLOWERS = [(70, 1560, 'bud', 300, 6), (900, 1540, 'bud', 290, 8), (250, 1570, 'bud', 240, 7),
           (700, 1580, 'bud', 230, 9), (450, 1600, 'bud', 220, 10), (1010, 1610, 'open', 320, 11),
           (150, 1690, 'open', 330, 1), (370, 1730, 'open', 280, 2), (600, 1710, 'open', 300, 3),
           (830, 1740, 'open', 290, 4), (980, 1700, 'bud', 260, 12), (40, 1760, 'open', 260, 5)]
MAN_S = 0.56
MAN_X0, MAN_X1 = 236.0, 432.0
WALK_T0, WALK_T1 = 2.18, 3.36


def build():
    ww = WorldWet(angle=math.radians(196), origin=(560, 950), scale=900, amp=0.12, seed=901)
    A = {}
    A['sky'] = build_sky(1400, 1640, s=0.6, seed=201, sun=(860, 470, 70), horizon=GROUND + 280, clouds=4,
                         cloud_y=(0.12, 0.4), ww=ww, place=(-160, -300))
    A['ground'] = build_ground(1400, 560, s=0.8, seed=301, top_y=20, base='#E6CB96', green='#8DB85A',
                               shade='#B88A55', ww=ww, place=(-160, GROUND - 20), fade=40)
    A['globe'] = build_globe(R=300, s=1.7, ww=ww, place=(540, 640))
    A['han'] = build_han(s=2.6, ww=ww)
    A['drum'] = build_drum(s=1.6, ww=ww)
    A['door_light'] = build_door_light(s=2.6)
    A['cypL'] = build_cypress(360, s=1.4, seed=401, ww=ww, place=(64, GROUND + 4))
    A['cypR'] = build_cypress(380, s=1.4, seed=402, ww=ww, place=(1012, GROUND + 4))
    pe = Element(900, 620, 1.0, seed=350, pivot=(0, 0))
    left = bez((500, 0), (420, 180), (200, 380), (-40, 620), 30)
    right = bez((580, 0), (600, 200), (560, 420), (420, 620), 30)
    pts = np.vstack([left, right[::-1]])
    pe.shape = pe.mask(P(pts))
    ww.apply(pe, 0, GROUND)
    paint(pe, pts, '#EFD9A8', '#C9A06A', '#9C7444', ang=math.radians(-10), seed=351, dens=0.9, length=(20, 36),
          press=(0.3, 0.55), k=0.7, kshade=0.55, lw=1.3, add_shape=False, line_pts=[left, right])
    pe.shape = pe.shape * 0
    A['path'] = pe
    A['flowers'] = [build_flower(s=1.6, seed=420 + sd * 7, h=h, kind=k, ww=ww, place=(x, y))
                    for x, y, k, h, sd in FLOWERS]
    A['man'] = build_side(s=2.6, seed=100)
    hg = build_hourglass(s=2.6)
    A['hg'], A['sand_top'], A['sand_bot'], A['stream'] = hg
    A['tokens'] = [build_token(k, R=35, s=2.8, seed=600 + i * 11) for i, k in enumerate(TOKENS)]
    A['shadow'] = build_shadow(120, 20, s=2.0)
    return slim(A)


def man_x(t):
    u = ramp(t, WALK_T0, WALK_T1, 'lin')
    # yumuşak başlama/duruş
    u2 = ease(u, 'io') * 0.35 + u * 0.65
    return MAN_X0 + (MAN_X1 - MAN_X0) * u2


def man_pose(t):
    # adım: kat edilen yol / adım boyu (63 birim) * pi
    dist = man_x(t) - MAN_X0
    phase = dist / (63.0) * math.pi
    stop = ramp(t, WALK_T1 - 0.12, WALK_T1 + 0.25, 'io')
    amp = 1.0 - stop
    p = walk_pose(phase, amp=max(0.0, amp))
    p = lerp_pose(p, REST, stop)
    # nefes / hafif salınım
    p['head'] += 1.5 * math.sin(t * 2.1)
    return p


def camera(t):
    # S1: hafif yaklaşma; S2: taçkapıya; S3: biraz geri
    c1 = (540.0, 830.0 + 20 * ramp(t, 0.0, 1.8, 'io'), 1.0 + 0.04 * ramp(t, 0.0, 1.8, 'io'))
    c2 = (492.0, 1146.0, 2.9)
    c3 = (482.0, 1092.0, 2.12)
    u = ramp(t, 1.72, 2.62, 'io3')
    x = c1[0] + (c2[0] - c1[0]) * u
    y = c1[1] + (c2[1] - c1[1]) * u
    z = c1[2] * (c2[2] / c1[2]) ** u
    v = ramp(t, 4.32, 4.95, 'io3')
    x = x + (c3[0] - x) * v
    y = y + (c3[1] - y) * v
    z = z * (c3[2] / z) ** v
    # sürüklenme
    x += 3 * math.sin(t * 0.7)
    y += 2 * math.sin(t * 0.9 + 1)
    return Cam(x, y, z)


def draw(f, t, A):
    f.cam = camera(t)
    # gök: 0.1-1.3 çizilir, 0.45-1.7 ıslanır
    f.place(A['sky'], -160 + 6 * t, -300, pd=ramp(t, 0.05, 1.25, 'lin') * 1.0, pw=ramp(t, 0.45, 1.75, 'lin'))
    f.place(A['ground'], -160, GROUND - 20, pd=ramp(t, 0.5, 1.25, 'lin'), pw=ramp(t, 0.75, 1.6, 'lin'))
    f.place(A['path'], 0, GROUND, pd=ramp(t, 0.6, 1.3, 'lin'), pw=ramp(t, 0.85, 1.6, 'lin'))
    # küre: önce merkezde, han yükselince yukarı oturur
    gy = 740 - 100 * ramp(t, 0.85, 1.55, 'io3')
    f.place(A['globe'], 540, gy, pd=0.38 + 0.62 * ramp(t, 0.0, 0.8, 'o'), pw=ramp(t, 0.12, 1.1, 'lin'))
    rise = 1.0 - ease(ramp(t, 0.74, 1.32, 'lin'), 'o')
    op_b = ramp(t, 0.74, 0.9, 'lin')
    f.place(A['drum'], 0, 70 * rise, op=op_b, pd=ramp(t, 0.74, 1.3, 'lin'), pw=ramp(t, 0.95, 1.7, 'lin'))
    f.place(A['han'], 0, 70 * rise, op=op_b, pd=ramp(t, 0.76, 1.45, 'lin'), pw=ramp(t, 1.0, 1.9, 'lin'))
    # kapıdan ışık ("misafirdir")
    lo = ramp(t, 5.36, 5.95, 'io')
    if lo > 0:
        f.place(A['door_light'], 0, 0, op=lo)
    for key, x, t0 in (('cypL', 64, 1.08), ('cypR', 1012, 1.2)):
        sc = ease(ramp(t, t0, t0 + 0.38, 'lin'), 'back')
        if sc > 0.01:
            f.place(A[key], x, GROUND + 4, sx=max(0.01, 0.6 + 0.4 * sc), sy=max(0.01, sc),
                    pd=ramp(t, t0, t0 + 0.45, 'lin'), pw=ramp(t, t0 + 0.15, t0 + 0.7, 'lin'))
    # adam
    if t >= WALK_T0 - 0.02:
        pd = ramp(t, WALK_T0 - 0.02, WALK_T0 + 0.32, 'lin')
        pw = ramp(t, WALK_T0 + 0.08, WALK_T0 + 0.5, 'lin')
        f.place(A['shadow'], man_x(t) + 4, GROUND + 2, sx=MAN_S * 0.9, op=pd, mode='add')
        draw_side(f, A['man'], man_x(t), GROUND, MAN_S, man_pose(t), pd=pd, pw=pw)
    # kum saati
    hx, hy = 446.0, 1034.0
    s_in = ease(ramp(t, 3.08, 3.36, 'lin'), 'back')
    s_out = 1.0 - ease(ramp(t, 4.36, 4.62, 'lin'), 'i')
    hs = 0.78 * s_in * s_out
    if hs > 0.01:
        flip = ease(ramp(t, 3.38, 3.78, 'lin'), 'io3')
        bob = 3 * math.sin(t * 3.0)
        if flip < 1.0:
            rot = math.pi * flip
            f.place(A['sand_bot'], hx, hy + bob, rot=rot, sx=hs, pd=1.0)
            f.place(A['hg'], hx, hy + bob, rot=rot, sx=hs)
        else:
            drain = ramp(t, 3.8, 4.42, 'lin')
            f.place(A['sand_top'], hx, hy + bob, sx=hs, pd=max(0.0, 1.0 - drain * 0.92))
            f.place(A['sand_bot'], hx, hy + bob, sx=hs, pd=0.04 + drain * 0.86)
            if 3.79 < t < 4.42:
                f.place(A['stream'], hx, hy + bob, sx=hs, pd=1.0)
            f.place(A['hg'], hx, hy + bob, sx=hs)
    # vazife pulları: yay üstünde
    cx, cy = man_x(min(t, WALK_T1)) + 48, GROUND - MAN_S * 300 + 4
    n = len(A['tokens'])
    for i, tok in enumerate(A['tokens']):
        t0 = 4.5 + i * 0.115
        if t < t0:
            continue
        a = math.radians(204 + (336 - 204) * i / (n - 1))
        r = 172.0
        sc = ease(ramp(t, t0, t0 + 0.3, 'lin'), 'back')
        bob = 4 * math.sin(2 * math.pi * (t * 0.55 + i * 0.27))
        x = cx + r * math.cos(a)
        y = cy + r * math.sin(a) * 0.92 + bob
        f.place(tok, x, y, sx=max(0.01, sc), rot=0.05 * math.sin(t * 1.3 + i),
                pd=ramp(t, t0, t0 + 0.3, 'lin'), pw=ramp(t, t0 + 0.12, t0 + 0.5, 'lin'))
    # ön plan çiçekleri (sırayla filizlenir) — paralaks: kamera yaklaşınca hızla kadrajdan çıkar
    cam = f.cam
    f.cam = Cam(cam.x, cam.y, cam.zoom ** 1.55)
    for i, (fl, spec) in enumerate(zip(A['flowers'], FLOWERS)):
        x, y = spec[0], spec[1]
        t0 = 1.25 + 0.07 * i
        sc = ease(ramp(t, t0, t0 + 0.42, 'lin'), 'back')
        if sc > 0.01:
            sway = 0.025 * math.sin(t * 1.6 + i * 0.9)
            f.place(fl, x, y, sy=max(0.01, sc), sx=max(0.01, 0.7 + 0.3 * sc), rot=sway,
                    pd=ramp(t, t0, t0 + 0.5, 'lin'), pw=ramp(t, t0 + 0.2, t0 + 0.8, 'lin'))
    f.cam = cam


def load():
    return cached('han_v4', build)
