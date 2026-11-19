# -*- coding: utf-8 -*-
"""S10: dünya-perestlik hissiyle işlenmiş bir suret sizde görülüyor."""
import math
import numpy as np

from wc import WorldWet, Element, bez, P, ease, ramp, slim, sstep, pig, gnorm, fbm
from comp import Cam
from cache import cached
from kit import build_sky, build_ground, glow_density, build_shadow
from man import build_side, REST, draw_side, lerp_pose, AlphaFrame
from assets_idol import build_gold_globe, build_pedestal, build_sparkle, build_embroidery, build_frame

GROUND = 1250.0
MAN_X, MAN_S = 404.0, 1.3
PED_X = 770.0
GLOBE_Y = 872.0
REACH = dict(REST, torso=24.0, head=-12.0, thigh_f=-16.0, shin_f=18.0, thigh_b=20.0, shin_b=14.0,
             uarm_f=-62.0, farm_f=-34.0, uarm_b=-50.0, farm_b=-40.0, dx=6.0)
FRAME_C = (420.0, 1022.0, 176.0, 246.0)


def build():
    ww = WorldWet(angle=math.radians(212), origin=(600, 920), scale=900, amp=0.12, seed=951)
    A = {}
    A['sky'] = build_sky(1500, 1500, s=0.55, seed=261, top='#7FB2DE', deep='#4F74C2', horizon=GROUND + 250,
                         clouds=2, cloud_y=(0.1, 0.32), ww=ww, place=(-200, -250), warm=('#F2B36A', GROUND + 240),
                         dens=0.85)
    A['ground'] = build_ground(1500, 800, s=0.7, seed=361, top_y=20, base='#D9B47E', green='#A8A858',
                               shade='#9C6E44', ww=ww, place=(-200, GROUND - 20), fade=40)
    A['globe'] = build_gold_globe(R=140, s=2.2)
    A['ped'] = build_pedestal(s=1.8)
    el = Element(900, 900, 0.5, seed=1351, pivot=(450, 450))
    D = glow_density(el.th, el.tw, 225, 225, 420, '#F2C14E', k=0.85, s=0.5, seed=1352, core=0.3, rays=10)
    el.add_density(D)
    A['glow'] = el
    A['spark'] = [build_sparkle(s=2.5, seed=1321 + k, r=16 + 6 * k) for k in range(3)]
    A['man'] = build_side(s=2.2, seed=100)
    # nakış: uzanma pozundaki siluet
    af = AlphaFrame(0, 600, 800, 1300)
    mats = draw_side(af, A['man'], MAN_X, GROUND, MAN_S, REACH)
    sil = af.A
    import cv2
    def wpt(M, p):
        q = M @ np.array([p[0], p[1], 1.0])
        return int(q[0] - af.x0), int(q[1] - af.y0)
    cut = np.zeros_like(sil)
    cv2.circle(cut, wpt(mats['head'], (5, -30)), int(30 * MAN_S), 1.0, -1)
    cv2.circle(cut, wpt(mats['head'], (3, -4)), int(12 * MAN_S), 1.0, -1)
    for k in ('farm_f', 'farm_b'):
        cv2.circle(cut, wpt(mats[k], (1.2, 53)), int(13 * MAN_S), 1.0, -1)
    for k in ('shin_f', 'shin_b'):
        cv2.circle(cut, wpt(mats[k], (8, 72)), int(16 * MAN_S), 1.0, -1)
    sil = sil * (1 - cv2.GaussianBlur(cut, (0, 0), 2))
    A['emb'] = build_embroidery(sil, 0, 600, s=1.8)
    A['frame'] = build_frame(FRAME_C[2], FRAME_C[3], s=1.3)
    A['shadow'] = build_shadow(130, 22, s=2.0)
    return slim(A)


def draw(f, t, A):
    zf = ease(ramp(t, 27.55, 29.3, 'lin'), 'io')
    cx = 560 + (FRAME_C[0] + 60 - 560) * zf
    cy = 1000 + (FRAME_C[1] - 1000) * zf
    f.cam = Cam(cx + 2 * math.sin(t), cy, 1.36 * (1.0 + 0.14 * zf))
    f.place(A['sky'], -200 + 6 * (t - 24.7), -250)
    f.place(A['ground'], -200, GROUND - 20)
    gl = 0.55 + 0.45 * ramp(t, 25.0, 25.8, 'io') + 0.06 * math.sin(t * 3.0)
    f.place(A['glow'], PED_X, GLOBE_Y, op=gl, sx=0.9 + 0.1 * gl)
    f.place(A['shadow'], PED_X + 8, GROUND + 3, sx=1.25, mode='add')
    f.place(A['shadow'], MAN_X + 24, GROUND + 3, sx=1.25, mode='add')
    f.place(A['ped'], PED_X, GROUND + 2)
    f.place(A['globe'], PED_X, GLOBE_Y + 4 * math.sin(t * 1.6), rot=0.08 * math.sin(t * 0.7))
    # parıltılar
    for k in range(7):
        ph = (t * 0.9 + k * 0.37) % 1.0
        a = k * 2.39
        r = 170 + 30 * math.sin(k)
        sc = math.sin(math.pi * ph) ** 2
        if sc > 0.05:
            f.place(A['spark'][k % 3], PED_X + math.cos(a) * r, GLOBE_Y + math.sin(a) * r * 0.85, sx=sc,
                    rot=ph * 1.5)
    # adam
    u = ease(ramp(t, 25.05, 25.75, 'lin'), 'io3')
    pose = lerp_pose(REST, REACH, u)
    lean = ramp(t, 25.75, 29.0, 'io')
    pose['torso'] += 6 * lean
    pose['uarm_f'] += -5 * lean + 3.0 * math.sin(t * 2.3) * u
    pose['uarm_b'] += -4 * lean + 2.5 * math.sin(t * 2.3 + 1.1) * u
    pose['farm_f'] += 4 * math.sin(t * 3.1) * u
    pose['head'] += 1.5 * math.sin(t * 2.0)
    draw_side(f, A['man'], MAN_X, GROUND, MAN_S, pose)
    # nakış
    e = A['emb']
    pd = ramp(t, 25.8, 26.95, 'lin')
    if pd > 0:
        f.place(e, e.X0, e.Y0, pd=pd, op=1.0)
    # çerçeve
    fr = ramp(t, 27.2, 27.85, 'lin')
    if fr > 0:
        f.place(A['frame'], FRAME_C[0], FRAME_C[1], pd=fr, pw=ramp(t, 27.4, 28.0, 'lin'))


def load():
    return cached('idol_v5', build)
