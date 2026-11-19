# -*- coding: utf-8 -*-
"""S6: En ehemm ve en elzem işler, takdim edilecektir — öncelik sıralaması."""
import math
import numpy as np
from wc import WorldWet, Element, bez, P, ease, ramp, slim, sstep, pig, gnorm, fbm
from comp import Cam
from cache import cached
from kit import build_sky, paint, glow_density
from assets_items import build_token

ORDER0 = ['coin', 'bread', 'lamp', 'house', 'book']
SLOTS = [318, 540, 762, 960, 1140]
TS = 2.5
PROMO = [('lamp', 13.50), ('book', 14.40)]


def build():
    ww = WorldWet(angle=math.radians(160), origin=(560, 820), scale=900, amp=0.12, seed=931)
    A = {}
    A['sky'] = build_sky(1400, 2300, s=0.5, seed=241, top='#9CC6E6', deep='#6A8FD0', horizon=2300, clouds=3,
                         cloud_y=(0.1, 0.8), ww=ww, place=(-160, -200), dens=0.5)
    A['tokens'] = {k: build_token(k, R=35, s=2.6, seed=700 + i * 17, full_wet=(k in ('lamp', 'book')))
                   for i, k in enumerate(ORDER0)}
    el = Element(300, 300, 0.8, seed=751, pivot=(150, 150))
    D = glow_density(el.th, el.tw, 120, 120, 140, '#F2C14E', k=0.85, s=0.8, seed=752, core=0.42, rays=12)
    el.add_density(D)
    A['halo'] = el
    # ok + köşeli parantez (kalem)
    el = Element(140, 520, 2.0, seed=761, pivot=(70, 0))
    sc = el.canvas()
    sc.line(np.array([[70, 500], [70, 30]]) * el.s, 4.2 * el.s, 0.95, 0.0, 0.7, seed=762, taper=(0.1, 0.02))
    sc.line(np.array([[32, 74], [70, 22], [108, 74]]) * el.s, 4.2 * el.s, 0.95, 0.7, 1.0, seed=763, taper=(0.05, 0.05))
    el.layer('#C0392B', sc, k=0.9, wet_override=np.zeros((el.th, el.tw), np.float32))
    el.shape = el.shape * 0
    A['arrow'] = el
    return slim(A)


def slot_of(name, t):
    """Zamana göre hedef sıra: terfiler sırayla en üste taşınır."""
    order = list(ORDER0)
    for k, (nm, t0) in enumerate(PROMO):
        if t >= t0 + 0.12:
            order.remove(nm)
            order.insert(k, nm)
    return order.index(name)


def pos_y(name, t):
    """Yumuşak geçişli y: önceki ve sonraki sıra arasında ara değer."""
    base = ORDER0.index(name)
    y = SLOTS[base]
    order = list(ORDER0)
    for k, (nm, t0) in enumerate(PROMO):
        new = list(order)
        new.remove(nm)
        new.insert(k, nm)
        u = ease(ramp(t, t0 + 0.12, t0 + 0.58, 'lin'), 'io3')
        y0 = SLOTS[order.index(name)]
        y1 = SLOTS[new.index(name)]
        y = y0 + (y1 - y0) * u if u < 1 else y1
        if u < 1:
            return y, (nm == name), u
        order = new
    return SLOTS[order.index(name)], False, 1.0


def draw(f, t, A):
    f.cam = Cam(540 + 2 * math.sin(t * 0.8), 860 + 6 * math.sin(t * 0.5), 1.0 + 0.03 * ramp(t, 12.3, 17.0, 'io'))
    f.place(A['sky'], -160, -200)
    promoted_t = {nm: t0 for nm, t0 in PROMO}
    later = ramp(t, 14.9, 15.5, 'io')
    for i, name in enumerate(ORDER0):
        tin = 12.36 + i * 0.09
        if t < tin:
            continue
        drop = ease(ramp(t, tin, tin + 0.36, 'lin'), 'back')
        y, moving, u = pos_y(name, t)
        y = y - 240 * (1 - drop)
        x = 540
        sc = TS
        op = ramp(t, tin, tin + 0.15, 'lin')
        pw = 0.0
        if name in promoted_t:
            t0 = promoted_t[name]
            pw = ramp(t, t0, t0 + 0.5, 'lin')
            pop = math.sin(math.pi * ramp(t, t0, t0 + 0.6, 'lin'))
            sc = TS * (1 + 0.14 * pop)
            if moving:
                x = 540 - 190 * math.sin(math.pi * u)
            g = ramp(t, t0, t0 + 0.35, 'o')
            if g > 0:
                f.place(A['halo'], x, y, sx=1.2 * g + 0.01, op=0.85 * g)
        else:
            sc = TS * (1 - 0.13 * later)
            op = op * (1 - 0.42 * later)
            x = 540 + 34 * later
        bob = 3 * math.sin(2 * math.pi * (t * 0.5 + i * 0.21))
        f.place(A['tokens'][name], x, y + bob, sx=sc, op=op, pd=ramp(t, tin, tin + 0.35, 'lin'), pw=pw,
                rot=0.04 * math.sin(t * 1.1 + i))



def load():
    return cached('prior_v4', build)
