# -*- coding: utf-8 -*-
"""S5: lâzım olan levazımatı tedarik etmekle mükelleftir — erzak heybeye, heybe omuza."""
import math
import numpy as np
from wc import WorldWet, Element, bez, P, ease, ramp, slim, sstep, pig, gnorm, fbm
from comp import Cam, mat_T, mat_R, mat_S
from cache import cached
from kit import build_sky, build_ground, paint, glow_density, build_shadow
from man import build_side, walk_pose, REST, draw_side, lerp_pose
from assets_items import build_item, build_bag

GROUND = 1250.0
MAN_X = 330.0
MAN_S = 1.0
BAG_X = 520.0
ITEMS = [('seccade', 9.32), ('jug', 9.78), ('bread', 10.22), ('book', 10.68)]


def build():
    ww = WorldWet(angle=math.radians(194), origin=(560, 900), scale=900, amp=0.12, seed=921)
    A = {}
    A['sky'] = build_sky(1500, 1500, s=0.6, seed=231, top='#86B9E0', deep='#5279C4', horizon=GROUND + 260,
                         clouds=3, cloud_y=(0.15, 0.45), ww=ww, place=(-160, -250), warm=('#F2B36A', GROUND + 250))
    A['ground'] = build_ground(1500, 800, s=0.7, seed=331, top_y=20, base='#E6CB96', green='#8DB85A',
                               shade='#B88A55', ww=ww, place=(-160, GROUND - 20), fade=40)
    el = Element(1400, 1000, 0.5, seed=341, pivot=(700, 500))
    D = glow_density(el.th, el.tw, 350, 250, 560, '#F2C14E', k=0.8, s=0.5, seed=342, core=0.06, rays=14)
    el.add_density(D)
    A['nur'] = el
    A['man'] = build_side(s=2.0, seed=100)
    A['bag'] = build_bag(s=2.2, seed=680, strap=False)
    # göğüs kayışı (gövde koordinatı: kalça 0,0)
    st = Element(90, 140, 2.4, seed=690, pivot=(45, 122))
    pts = np.array([[-24, -86], [-8, -99], [8, -100], [20, -88], [25, -62], [22, -34], [10, -12], [-14, -6]]) + (45, 122)
    from scipy_free import smooth_open
    pts = smooth_open(pts, 2)
    sc = st.canvas()
    sc.line(pts * st.s, 5.5 * st.s, 0.95, 0.0, 1.0, seed=691, taper=(0.02, 0.02))
    st.layer('#5A2E1A', sc, k=1.0, wet_override=np.zeros((st.th, st.tw), np.float32))
    sc = st.canvas()
    sc.line(pts * st.s + np.array([0, 2.6 * st.s]), 1.2 * st.s, 0.8, 0.0, 1.0, seed=692, taper=(0.02, 0.02))
    st.line_layer('#2A140C', sc, k=0.9)
    from wc import mask_of, ribbon
    st.shape = mask_of(ribbon(pts * st.s, np.full(len(pts), 5.5 * st.s)), st.tw, st.th)
    A['strap'] = st
    A['items'] = [build_item(k, size=104, s=2.4, seed=650 + i * 13) for i, (k, _) in enumerate(ITEMS)]
    A['shadow'] = build_shadow(120, 20, s=2.0)
    return slim(A)


CROUCH = dict(REST, torso=34.0, head=-16.0, thigh_f=-60.0, shin_f=90.0, thigh_b=-54.0, shin_b=86.0,
              uarm_f=-62.0, farm_f=-8.0, uarm_b=-30.0, farm_b=-20.0)
CARRY = dict(REST, torso=6.0, head=-3.0, uarm_f=-22.0, farm_f=-128.0, uarm_b=10.0, farm_b=-14.0)


def bag_anchor(mats):
    """Taşıma konumu: gövdenin sırtında, omuz arkası (gövde koordinatı)."""
    return mats['torso'] @ mat_T(-34, 6)


def draw(f, t, A):
    # kamera: hafif sağa kayma; sonda yürüyüşle sağa
    walk = ramp(t, 11.98, 12.6, 'lin')
    f.cam = Cam(452 + 70 * ease(walk, 'io') + 2 * math.sin(t), 1112, 1.86 + 0.05 * ramp(t, 9.0, 12.5, 'io'))
    f.place(A['sky'], -160 + 6 * (t - 9.0), -250)
    f.place(A['nur'], 880, GROUND - 50, op=0.95, sx=0.75 + 0.02 * math.sin(t * 1.5))
    f.place(A['ground'], -160, GROUND - 20)
    # poz zamanlaması
    if t < 11.18:
        pose = dict(REST)
        pose['head'] = -15 * ramp(t, 9.22, 9.5, 'io') + 15 * ramp(t, 10.95, 11.18, 'io')  # erzaklara bakar
        pose['torso'] = -2 * ramp(t, 9.22, 9.5, 'io') + 2 * ramp(t, 10.95, 11.18, 'io')
        mx = MAN_X
    elif t < 11.42:
        u = ease(ramp(t, 11.18, 11.42, 'lin'), 'io')
        pose = lerp_pose(REST, CROUCH, u)
        mx = MAN_X + 26 * u
    elif t < 11.95:
        u = ease(ramp(t, 11.42, 11.95, 'lin'), 'io3')
        pose = lerp_pose(CROUCH, CARRY, u)
        mx = MAN_X + 26
    else:
        dist = 90 * ease(walk, 'i') + 120 * max(0, walk - 0.5)
        ph = dist / 56.0 * math.pi
        pose = walk_pose(ph, amp=min(1.0, walk * 3))
        pose['uarm_f'], pose['farm_f'] = CARRY['uarm_f'], CARRY['farm_f']
        pose['torso'] = 6 + pose['torso']
        mx = MAN_X + 26 + dist
    # heybe konumu
    bag_ground = mat_T(BAG_X, GROUND) @ mat_S(1.0, 1.0)

    def bag_draw(fr, mats):
        pass

    lift = ramp(t, 11.42, 11.9, 'lin')
    carried = t >= 11.42
    # düşüşte heybenin esnemesi
    sq = 0.0
    for k, (_, t0) in enumerate(ITEMS):
        tl = t0 + 0.48
        if tl <= t < tl + 0.32:
            x = (t - tl) / 0.32
            sq = max(sq, math.sin(x * math.pi) * (1 - x) * 0.09)
    bag_op = ramp(t, 9.18, 9.42, 'lin')
    bsc = ease(ramp(t, 9.18, 9.45, 'lin'), 'back')
    f.place(A['shadow'], mx + 6, GROUND + 3, sx=MAN_S * 0.95, mode='add')
    if not carried and bag_op > 0:
        f.place(A['shadow'], BAG_X, GROUND + 3, sx=0.85 * bsc, op=bag_op, mode='add')
    if not carried:
        draw_items(f, t, A)
        if bag_op > 0:
            f.place(A['bag'], BAG_X, GROUND + 2, sx=max(0.01, bsc) * (1 + sq), sy=max(0.01, bsc) * (1 - sq),
                    pd=ramp(t, 9.18, 9.5, 'lin'), pw=ramp(t, 9.25, 9.7, 'lin'))
        draw_side(f, A['man'], mx, GROUND, MAN_S, pose)
    else:
        # adamın matrisleriyle heybeyi sırta taşı: yerden sırta yay
        def behind(fr, mats):
            anchor = bag_anchor(mats)
            # dünya konumu
            ax, ay = anchor[0, 2], anchor[1, 2]
            u = ease(lift, 'io')
            # yay: yerden yukarı, adamın önünden arkasına
            x = BAG_X * (1 - u) + ax * u
            y = (GROUND + 2) * (1 - u) + ay * u - 120 * math.sin(math.pi * u)
            rot = -0.35 * math.sin(math.pi * u) + 0.1 * u
            sc = 1.0 - 0.5 * u
            fr.place(A['bag'], x, y, rot=rot, sx=sc)
        def strap(fr, mats):
            if lift >= 0.6:
                fr.place(A['strap'], 0, 0, parent=mats['torso'], op=ramp(lift, 0.6, 0.85, 'lin'))
        ex = {'behind': [(behind, None, None)], 'mid': [(strap, None, None)]} if lift >= 0.55 else None
        draw_side(f, A['man'], mx, GROUND, MAN_S, pose, extra=ex)
        if lift < 0.55:
            # henüz öndeyken adamın önünde çiz
            u = ease(lift, 'io')
            M = draw_side.__defaults__  # yer tutucu
            mats = None
            # konumu yaklaşık: adamın el hizası
            x = BAG_X * (1 - u) + (mx - 30) * u
            y = (GROUND + 2) * (1 - u) + (GROUND - 150) * u - 120 * math.sin(math.pi * u)
            f.place(A['bag'], x, y, rot=-0.35 * math.sin(math.pi * u), sx=1.0 - 0.45 * u)
def draw_items(f, t, A):
    # erzaklar: belirir, asılı kalır, torbanın ağzından içeri düşer (torba önden örter)
    mouth_y = GROUND + 2 - (A['bag'].pivot[1] - A['bag'].mouth_y)
    for k, ((kind, t0), it) in enumerate(zip(ITEMS, A['items'])):
        if t < t0 or t > t0 + 0.9:
            continue
        pop = ease(ramp(t, t0, t0 + 0.22, 'lin'), 'back')
        fall = ramp(t, t0 + 0.26, t0 + 0.5, 'lin')
        y0 = GROUND - 330
        y = y0 + (mouth_y + 64 - y0) * fall ** 2
        x = BAG_X + (k - 1.5) * 18 * (1 - fall)
        op = 1.0 - ramp(fall, 0.93, 1.0, 'lin')
        sc = (0.2 + 0.8 * pop) * (1 - 0.3 * fall)
        if op > 0.01:
            f.place(it, x, y, sx=sc, op=op, rot=0.25 * fall * (1 if k % 2 else -1), pd=ramp(t, t0, t0 + 0.24, 'lin'),
                    pw=ramp(t, t0 + 0.05, t0 + 0.35, 'lin'))




def load():
    return cached('bag_v5', build)
