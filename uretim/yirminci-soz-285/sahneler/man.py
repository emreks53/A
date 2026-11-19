# -*- coding: utf-8 -*-
"""Sade erkek figürü: yan görünüşte eklemli kukla (sağa bakar), arkadan ve önden görünüşler.
Birim: figür boyu 300 (taban y=+150, kalça eklemi 0,0; y aşağı)."""
import math
import numpy as np
import skia
from wc import (Element, hatch, P, bez, ellipse_pts, sstep, blur, fbm, resample, path_union)
from kit import paint
from comp import mat_T, mat_R, mat_S

PAL = dict(tunic='#C25E3E', tunic2='#7E2F22', tunic_line='#5A2418',
           trouser='#66708A', trouser2='#3A4258', trouser_line='#2A3042',
           skin='#E4B48E', skin2='#B07A58', skin_line='#7A4A32',
           hair='#3B2A21', hair2='#1F1612', shoe='#3A2A20', shoe2='#1C1410')


def capsule(p0, p1, r0, r1, n=18):
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    d = p1 - p0
    L = np.linalg.norm(d) + 1e-9
    ang = math.atan2(d[1], d[0])
    a0 = np.linspace(ang + math.pi / 2, ang + 3 * math.pi / 2, n)
    a1 = np.linspace(ang - math.pi / 2, ang + math.pi / 2, n)
    c0 = np.stack([p0[0] + r0 * np.cos(a0), p0[1] + r0 * np.sin(a0)], 1)
    c1 = np.stack([p1[0] + r1 * np.cos(a1), p1[1] + r1 * np.sin(a1)], 1)
    return np.concatenate([c0, c1], 0)


class Part:
    def __init__(self, el, joint, children=()):
        self.el = el          # Element (pivot = eklem, doku içinde)
        self.joint = joint    # ebeveyn koordinatında eklem noktası
        self.children = list(children)


def _paint_part(el, outline_pts, base, shade, line, hatch_ang, tone_dir=(1.0, -0.6), seed=0, wet_side=math.pi,
                wet_frac=0.5, extra_paths=(), dens=1.25, lw=1.9, k_base=0.95, inner_lines=(), contour=None,
                bloom_n=1):
    """Bir parça: dolgu maskesi, taban + gölge taraması, ıslak bölünme, kontur."""
    S = el.s
    shp = P(outline_pts)
    m = el.add_shape(shp)
    for ep in extra_paths:
        m = np.maximum(m, el.add_shape(ep))
    th, tw = el.th, el.tw
    yy, xx = np.mgrid[0:th, 0:tw].astype(np.float32)
    ys, xs = np.nonzero(m > 0.3)
    cx, cy = xs.mean(), ys.mean()
    ext = max(np.ptp(xs), np.ptp(ys), 4)
    td = np.array(tone_dir, float)
    td /= np.linalg.norm(td)
    lit = ((xx - cx) * td[0] + (yy - cy) * td[1]) / ext
    tone = np.clip(0.55 - lit * 1.2, 0, 1)
    el.wet_split(angle=wet_side, frac=wet_frac, lobes=0.25, seed=seed + 3, sweep=wet_side + math.pi)
    sc = el.canvas()
    hatch(sc, m, hatch_ang, spacing=2.1 * S, length=(9 * S, 16 * S), cluster=(6, 10), press=(0.58, 0.88),
          width=(1.0 * S, 1.45 * S), density=dens * 1.35, tone=0.7 + 0.3 * tone, angle_jit=0.07, seed=seed + 11,
          t_range=(0.1, 0.65), sweep_dir=(0.2, 1.0))
    mc = np.clip(blur(m, 0.6 * S) * 1.5, 0, 1)
    el.layer(base, sc, k=k_base, shape=m, clip=mc, bloom_n=bloom_n, bloom_r=(4, 10), edge_k=2.0, wet_spread=0.55)
    sc = el.canvas()
    hatch(sc, m * sstep(0.45, 0.8, tone), hatch_ang + 0.9, spacing=2.6 * S, length=(7 * S, 12 * S),
          cluster=(3, 7), press=(0.45, 0.75), width=(0.9 * S, 1.3 * S), density=0.9, tone=tone, angle_jit=0.07,
          seed=seed + 12, t_range=(0.35, 0.8), sweep_dir=(0.2, 1.0))
    el.layer(shade, sc, k=0.8, shape=m, clip=mc, bloom_n=0, edge_k=1.6, wet_spread=0.5)
    sc = el.canvas()
    cpts = outline_pts if contour is None else contour
    if contour is None:
        cpts = np.vstack([cpts, cpts[:1]])
    sc.line(cpts * S, lw * S, 0.85, 0.0, 0.5, seed=seed + 21, taper=(0.04, 0.04), press_noise=0.2)
    for ip in inner_lines:
        sc.line(np.asarray(ip) * S, lw * 0.8 * S, 0.7, 0.4, 0.7, seed=seed + 22)
    el.line_layer(line, sc, k=0.95)
    return m


def build_side(s=1.6, seed=100, pal=None):
    """Yan görünüş kuklası. Döndürür: dict parça adı -> Part, kök 'pelvis'."""
    pal = dict(PAL, **(pal or {}))
    parts = {}

    def mk(name, w, h, pivot):
        return Element(w, h, s, seed=seed + len(parts) * 7, name=name, pivot=pivot)

    # gövde (tunik): kalça eklemi (0,0); doku 90x150, pivot (44, 118)
    el = mk('torso', 92, 152, (44, 120))
    ox, oy = 44, 120
    back = np.concatenate([bez((-12, -98), (-20, -94), (-23, -84), (-22, -70), 10),
                           bez((-22, -70), (-21, -52), (-16, -30), (-17, -10), 12)[1:],
                           bez((-17, -10), (-18, 4), (-20, 14), (-21, 22), 8)[1:]])
    hem = bez((-21, 22), (-8, 25), (10, 25), (24, 21), 10)
    front = np.concatenate([bez((24, 21), (23, 6), (22, -14), (24, -34), 10),
                            bez((24, -34), (27, -52), (27, -70), (22, -86), 12)[1:],
                            bez((22, -86), (19, -94), (15, -98), (11, -99), 8)[1:]])
    shoulder = bez((11, -99), (4, -102), (-6, -102), (-12, -98), 8)
    pts = np.concatenate([back, hem[1:], front[1:], shoulder[1:-1]]) + (ox, oy)
    belt = bez((-17.5, -8), (-4, -5.5), (10, -5.5), (23.5, -9), 10) + (ox, oy)
    _paint_part(el, pts, pal['tunic'], pal['tunic2'], pal['tunic_line'], math.radians(78), seed=seed + 1,
                inner_lines=[belt])
    parts['torso'] = Part(el, (0, 0))

    # baş + boyun: eklem boyun tabanı; doku 64x76, pivot (26, 66)
    el = mk('head', 66, 78, (26, 68))
    ox, oy = 26, 68
    outline = np.concatenate([
        bez((-4, 2), (-4, -2), (-5, -10), (-6, -16), 6),
        bez((-6, -16), (-13, -24), (-12, -44), (2, -51.5), 16)[1:],
        bez((2, -51.5), (14, -54), (22, -46), (22.6, -36), 14)[1:],
        bez((22.6, -36), (23.2, -32), (25.6, -28), (27.4, -24.6), 8)[1:],
        bez((27.4, -24.6), (26.5, -23.2), (25, -22.6), (24, -22.4), 5)[1:],
        bez((24, -22.4), (24.6, -20.6), (23.4, -19.0), (23.9, -17.0), 5)[1:],
        bez((23.9, -17.0), (24.0, -13.5), (21.0, -10.5), (16.5, -10.4), 8)[1:],
        bez((16.5, -10.4), (12.5, -10.2), (9.0, -9.0), (7.4, -6.0), 6)[1:],
        bez((7.4, -6.0), (7.8, -3), (8.0, 0), (8.2, 2), 5)[1:],
    ])
    outline = np.vstack([outline, [[2, 3.5]]])
    shp = P(outline + (ox, oy))
    m = el.add_shape(shp)
    S = s
    el.wet_split(angle=math.pi * 0.95, frac=0.38, lobes=0.25, seed=seed + 33, sweep=0.0)
    th, tw = el.th, el.tw
    yy, xx = np.mgrid[0:th, 0:tw].astype(np.float32)
    lit = ((xx / S - (ox + 6)) * 0.8 + (yy / S - (oy - 30)) * -0.6) / 30
    tone = np.clip(0.55 - lit, 0, 1)
    sc = el.canvas()
    hatch(sc, m, math.radians(70), spacing=2.2 * S, length=(7 * S, 12 * S), cluster=(5, 9), press=(0.42, 0.66),
          width=(0.85 * S, 1.2 * S), density=1.15, tone=0.6 + 0.4 * tone, angle_jit=0.07, seed=seed + 34,
          t_range=(0.1, 0.6))
    mc = np.clip(blur(m, 0.6 * S) * 1.5, 0, 1)
    el.layer(pal['skin'], sc, k=0.85, shape=m, clip=mc, bloom_n=0, edge_k=1.6, wet_spread=0.45)
    sc = el.canvas()
    hatch(sc, m * sstep(0.5, 0.85, tone), math.radians(140), spacing=2.5 * S, length=(5 * S, 9 * S),
          cluster=(3, 6), press=(0.38, 0.6), width=(0.85 * S, 1.15 * S), density=0.75, tone=tone, seed=seed + 35,
          t_range=(0.3, 0.75))
    el.layer(pal['skin2'], sc, k=0.55, shape=m, clip=mc, bloom_n=0, edge_k=1.4, wet_spread=0.45)
    hair = np.concatenate([
        bez((-6.8, -15), (-14, -24), (-13, -45), (2, -52.6), 16),
        bez((2, -52.6), (13, -55), (20.5, -50), (21.4, -43.5), 10)[1:],
        bez((21.4, -43.5), (17, -44.5), (13.5, -42), (11, -37), 8)[1:],
        bez((11, -37), (9.6, -33), (9.4, -29.5), (8.6, -26.5), 6)[1:],
        bez((8.6, -26.5), (6, -29.5), (2, -30.5), (-1, -27.5), 6)[1:],
        bez((-1, -27.5), (-3, -23), (-4, -19), (-6.8, -15), 6)[1:],
    ])
    mh = el.mask(P(hair + (ox, oy))) * m
    sc = el.canvas()
    hatch(sc, mh, math.radians(18), spacing=1.9 * S, length=(6 * S, 11 * S), cluster=(5, 9), press=(0.6, 0.9),
          width=(0.85 * S, 1.2 * S), density=1.7, angle_jit=0.12, seed=seed + 36, t_range=(0.2, 0.7))
    el.layer(pal['hair'], sc, k=1.0, shape=mh, clip=np.clip(blur(mh, 0.5 * S) * 1.4, 0, 1), bloom_n=0,
             edge_k=1.4, wet_spread=0.4)
    ear = ellipse_pts(3.4, -26.0, 3.0, 4.6, 24) + (ox, oy)
    sc = el.canvas()
    sc.line(outline[:-1] * S + np.array([ox, oy]) * S, 1.6 * S, 0.85, 0.0, 0.45, seed=seed + 37,
            taper=(0.03, 0.03), press_noise=0.15)
    sc.line(np.vstack([ear, ear[:1]])[4:22] * S, 1.15 * S, 0.6, 0.45, 0.6, seed=seed + 38)
    sc.line(np.array([[17.2 + ox, -33.2 + oy], [18.4 + ox, -33.0 + oy]]) * S, 2.0 * S, 0.95,
            0.55, 0.6, seed=seed + 40, taper=(0.0, 0.0))
    sc.line(np.array([[14.6 + ox, -37.6 + oy], [17.0 + ox, -38.4 + oy], [19.6 + ox, -37.8 + oy]]) * S, 1.1 * S,
            0.55, 0.55, 0.62, seed=seed + 41, taper=(0.2, 0.3))
    el.line_layer(pal['skin_line'], sc, k=0.95)
    parts['head'] = Part(el, (3, -100))

    def limb(name, L1, r0, r1, colors, ang, sd, foot=False, hand=False):
        pad = max(r0, r1) + 8
        w = 2 * pad + (24 if foot else 0)
        h = L1 + 2 * pad + (10 if foot else 0)
        e = mk(name, w, h, (pad, pad))
        ox, oy = pad, pad
        pts = capsule((0, 0), (0, L1), r0, r1)
        nh = len(pts) // 2
        upath = np.vstack([pts[nh - 1:nh], pts[nh:], pts[:1]])
        extra = []
        if foot:  # ayakkabı: bilekten öne
            sh = np.concatenate([bez((-6, L1 - 4), (-8, L1 + 6), (-6, L1 + 10), (2, L1 + 10.5), 10),
                                 bez((2, L1 + 10.5), (12, L1 + 11), (24, L1 + 10.5), (25, L1 + 6), 10)[1:],
                                 bez((25, L1 + 6), (25, L1 + 1), (14, L1 - 2), (5, L1 - 5), 10)[1:]])
            extra.append(P(sh + (ox, oy)))
        if hand:
            hp = ellipse_pts(1.2, L1 + 7, 5.4, 8.6, 30)
            extra.append(P(hp + (ox, oy)))
        m = _paint_part(e, pts + (ox, oy), colors[0], colors[1], colors[2], ang, seed=sd,
                        extra_paths=[], dens=1.1, lw=1.6, contour=upath + (ox, oy), bloom_n=0)
        if foot:
            mf = e.add_shape(extra[0])
            sc = e.canvas()
            hatch(sc, mf, math.radians(10), spacing=2.0 * s, length=(6 * s, 10 * s), cluster=(4, 8),
                  press=(0.6, 0.9), width=(0.9 * s, 1.3 * s), density=1.8, seed=sd + 50, t_range=(0.3, 0.8))
            e.layer(pal['shoe'], sc, k=1.0, shape=mf, clip=np.clip(blur(mf, 0.5 * s) * 1.4, 0, 1), bloom_n=0,
                    edge_k=1.4, wet_spread=0.45)
            sc = e.canvas()
            sc.line(np.vstack([sh, sh[:1]]) * s + np.array([ox, oy]) * s, 1.6 * s, 0.85, 0.5, 0.8, seed=sd + 51,
                    taper=(0.02, 0.02))
            e.line_layer(pal['shoe2'], sc, k=0.9)
        if hand:
            mh = e.add_shape(extra[0])
            sc = e.canvas()
            hatch(sc, mh, math.radians(70), spacing=2.2 * s, length=(5 * s, 9 * s), cluster=(4, 7),
                  press=(0.45, 0.7), width=(0.9 * s, 1.2 * s), density=1.3, seed=sd + 60, t_range=(0.3, 0.8))
            e.layer(pal['skin'], sc, k=0.85, shape=mh, clip=np.clip(blur(mh, 0.5 * s) * 1.4, 0, 1), bloom_n=0,
                    edge_k=1.4, wet_spread=0.45)
            sc = e.canvas()
            sc.line(np.vstack([hp, hp[:1]]) * s + np.array([ox, oy]) * s, 1.4 * s, 0.8, 0.5, 0.8, seed=sd + 61,
                    taper=(0.02, 0.02))
            e.line_layer(pal['skin_line'], sc, k=0.9)
        return e

    tro = (pal['trouser'], pal['trouser2'], pal['trouser_line'])
    tun = (pal['tunic'], pal['tunic2'], pal['tunic_line'])
    for side in ('b', 'f'):
        thigh = limb('thigh_' + side, 74, 12.5, 10.0, tro, math.radians(84), seed + (60 if side == 'b' else 70))
        shin = limb('shin_' + side, 68, 9.6, 7.2, tro, math.radians(86), seed + (61 if side == 'b' else 71),
                    foot=True)
        parts['thigh_' + side] = Part(thigh, (0 if side == 'f' else -3, 0))
        parts['shin_' + side] = Part(shin, (0, 74))
        uarm = limb('uarm_' + side, 54, 7.8, 6.6, tun, math.radians(84), seed + (62 if side == 'b' else 72))
        farm = limb('farm_' + side, 46, 6.2, 4.8, tun, math.radians(84), seed + (63 if side == 'b' else 73),
                    hand=True)
        parts['uarm_' + side] = Part(uarm, (1 if side == 'f' else -4, -88))
        parts['farm_' + side] = Part(farm, (0, 54))
    return parts


# --------------------------------------------------------------- poz ve çizim
REST = dict(torso=0.0, head=0.0, thigh_f=0.0, shin_f=0.0, thigh_b=0.0, shin_b=0.0,
            uarm_f=0.0, farm_f=0.0, uarm_b=0.0, farm_b=0.0, dy=0.0, dx=0.0)


def walk_pose(phase, amp=1.0):
    """phase: radyan. Açılar derece; pozitif = saat yönü (bacak geri)."""
    sp = math.sin(phase)
    p = dict(REST)
    p['thigh_f'] = -24 * amp * sp
    p['thigh_b'] = 24 * amp * sp
    p['shin_f'] = 6 + 30 * amp * max(0.0, math.sin(phase + 1.2))
    p['shin_b'] = 6 + 30 * amp * max(0.0, math.sin(phase + 1.2 + math.pi))
    p['uarm_f'] = 18 * amp * sp
    p['uarm_b'] = -18 * amp * sp
    p['farm_f'] = -14 - 8 * amp * max(0.0, -sp)
    p['farm_b'] = -14 - 8 * amp * max(0.0, sp)
    p['torso'] = 3 * amp
    p['head'] = 2 * amp
    p['dy'] = -3.5 * amp * abs(math.cos(phase))
    return p


def lerp_pose(a, b, t):
    return {k: a.get(k, 0.0) * (1 - t) + b.get(k, 0.0) * t for k in set(a) | set(b)}


def leg_ground_offset(p):
    """Duruşta en alttaki ayağın tabana değmesi için gereken y kayması (yaklaşık)."""
    def foot_y(th, sh):
        a = math.radians(th)
        b = math.radians(th + sh)
        return 74 * math.cos(a) + 68 * math.cos(b) + 11
    return 150 - max(foot_y(p['thigh_f'], p['shin_f']), foot_y(p['thigh_b'], p['shin_b']))


def draw_side(frame, parts, x, y, scale, pose, op=1.0, pd=1.0, pw=1.0, flip=False, extra=None, ground=True,
              back_tint=1.18):
    """(x,y): figürün taban orta noktası (dünya). pose: açılar (derece)."""
    gy = leg_ground_offset(pose) if ground else 0.0
    sx = -scale if flip else scale
    root = mat_T(x + pose.get('dx', 0.0) * scale, y) @ mat_S(sx, scale) @ mat_T(0, -150 + gy + pose.get('dy', 0.0))

    def R(deg):
        return mat_R(math.radians(deg))

    torso_M = root @ mat_T(0, 0) @ R(pose['torso'])
    order = []
    # arka kol, arka bacak, gövde, ön bacak, baş, ön kol
    def limb_chain(a, b, base_M, ja, jb, aa, ab):
        Ma = base_M @ mat_T(*ja) @ R(aa)
        Mb = Ma @ mat_T(*jb) @ R(ab)
        return Ma, Mb

    tb, sb = limb_chain('thigh_b', 'shin_b', root, parts['thigh_b'].joint, parts['shin_b'].joint,
                        pose['thigh_b'], pose['shin_b'])
    tf, sf = limb_chain('thigh_f', 'shin_f', root, parts['thigh_f'].joint, parts['shin_f'].joint,
                        pose['thigh_f'], pose['shin_f'])
    ub, fb = limb_chain('uarm_b', 'farm_b', torso_M, parts['uarm_b'].joint, parts['farm_b'].joint,
                        pose['uarm_b'], pose['farm_b'])
    uf, ff = limb_chain('uarm_f', 'farm_f', torso_M, parts['uarm_f'].joint, parts['farm_f'].joint,
                        pose['uarm_f'], pose['farm_f'])
    hd = torso_M @ mat_T(*parts['head'].joint) @ R(pose['head'])
    tint_b = np.array([back_tint] * 3, np.float32)
    seq = [('uarm_b', ub, tint_b), ('farm_b', fb, tint_b), ('thigh_b', tb, tint_b), ('shin_b', sb, tint_b)]
    if extra and 'behind' in extra:
        seq += extra['behind']
    seq += [('torso', torso_M, None), ('thigh_f', tf, None), ('shin_f', sf, None), ('head', hd, None)]
    if extra and 'mid' in extra:
        seq += extra['mid']
    seq += [('uarm_f', uf, None), ('farm_f', ff, None)]
    if extra and 'front' in extra:
        seq += extra['front']
    mats = dict(torso=torso_M, head=hd, uarm_f=uf, farm_f=ff, uarm_b=ub, farm_b=fb, thigh_f=tf, shin_f=sf,
                thigh_b=tb, shin_b=sb, root=root)
    for name, M, tint in seq:
        if callable(name):
            name(frame, mats)
            continue
        el = parts[name].el
        frame.place(el, 0, 0, op=op, pd=pd, pw=pw, parent=M, tint=tint)
    return mats


# --------------------------------------------------------------- arkadan ve önden figürler (tek parça)
def _sym(half):
    """Sağ yarı çokgenini (üstten alta, x>=0) aynalayıp kapalı çokgen yapar."""
    h = np.asarray(half, float)
    left = h[::-1].copy()
    left[:, 0] *= -1
    return np.vstack([h, left])


def build_figure(view='back', s=1.6, seed=150, pal=None, sketch=False, hair_style=0, body_w=1.0, ww=None,
                 place=(0, 0), scale_place=1.0, face=True):
    """Arkadan ('back') ya da önden ('front') sade figür. Birim: boy 300, taban y=+150 (pivot tabanda)."""
    pal = dict(PAL, **(pal or {}))
    bw = body_w
    W_, H_ = 120 * bw + 30, 320
    el = Element(W_, H_, s, seed=seed, name='fig_' + view, pivot=(W_ / 2, 310))
    ox, oy = W_ / 2, 160

    def T(p):
        return np.asarray(p, float) + (ox, oy)

    head = T(ellipse_pts(0, -130, 17.5, 21.5, 64))
    neck = T(np.array([[-7, -112], [7, -112], [7.5, -97], [-7.5, -97]]))
    torso_half = [[0, -101], [10 * bw, -101], [22 * bw, -99], [29 * bw, -94], [31 * bw, -84], [29 * bw, -52],
                  [27 * bw, -24], [28.5 * bw, 4], [29.5 * bw, 18], [16 * bw, 21], [0, 21.5]]
    torso = T(_sym(torso_half)[:-1])
    arms = []
    for sg in (-1, 1):
        a = np.array([[31 * bw, -92], [36 * bw, -91], [41 * bw, -82], [42 * bw, -40], [40.5 * bw, 4], [33.5 * bw, 5],
                      [32.5 * bw, -40], [31.5 * bw, -78]])
        a[:, 0] *= sg
        arms.append(T(a))
    hands = [T(ellipse_pts(sg * 37 * bw, 13, 5.8, 8.2, 20)) for sg in (-1, 1)]
    legs = []
    for sg in (-1, 1):
        lg = np.array([[2.5, 14], [21 * bw, 14], [19 * bw, 70], [15.5 * bw, 136], [5.5, 136], [3.5, 70]])
        lg[:, 0] *= sg
        legs.append(T(lg))
    shoes = [T(ellipse_pts(sg * 10.5 * bw, 141, 10.5 * bw, 6.8, 24)) for sg in (-1, 1)]
    ears = [T(ellipse_pts(sg * 17.6, -127, 3.2, 5.4, 16)) for sg in (-1, 1)]
    if view == 'back':
        hair = T(np.vstack([ellipse_pts(0, -130, 18.6, 22.6, 48, math.pi, 2 * math.pi),
                            bez((18.6, -130), (19.2, -118), (12, -111), (0, -110), 10)[1:],
                            bez((0, -110), (-12, -111), (-19.2, -118), (-18.6, -130), 10)[1:]]))
    else:
        hl = [-138, -141, -136][hair_style % 3]
        hair = T(np.vstack([ellipse_pts(0, -130, 18.8, 22.8, 48, math.pi, 2 * math.pi),
                            bez((18.8, -130), (18, hl + 6), (9, hl), (0, hl + 1.5), 8)[1:],
                            bez((0, hl + 1.5), (-9, hl), (-18, hl + 6), (-18.8, -130), 8)[1:]]))
    mk = lambda q: el.mask(P(q))
    m_head, m_neck, m_torso = mk(head), mk(neck), mk(torso)
    m_arms = [mk(q) for q in arms]
    m_legs = [mk(q) for q in legs]
    allm = np.maximum.reduce([m_head, m_neck, m_torso] + m_arms + m_legs + [mk(q) for q in hands + shoes + ears])
    el.shape = allm
    if ww is not None:
        ww.apply(el, *place)
    else:
        el.wet_split(angle=math.radians(185), frac=0.45, lobes=0.1, seed=seed + 3, sweep=0.0)
    dk = 0.55 if sketch else 1.0
    lit = (0.7, -0.7)
    torso_and_arms = np.maximum.reduce([m_torso] + m_arms)
    for i, q in enumerate(legs):
        paint(el, q, pal['trouser'], pal['trouser2'], pal['trouser_line'], ang=math.radians(86), seed=seed + 10 + i,
              dens=1.1 * dk, lw=1.4, add_shape=False, lit=lit, length=(10, 16), t=(0.25, 0.8), under=torso_and_arms)
    for i, q in enumerate(shoes):
        paint(el, q, pal['shoe'], None, pal['shoe2'], ang=0.2, seed=seed + 14 + i, dens=3.2 * dk, lw=1.2,
              add_shape=False, length=(5, 9), t=(0.4, 0.9), press=(0.7, 0.95), spacing=1.6)
    paint(el, torso, pal['tunic'], pal['tunic2'], pal['tunic_line'], ang=math.radians(80), seed=seed + 20, dens=1.15 * dk,
          lw=1.6, add_shape=False, lit=lit, length=(10, 18), t=(0.05, 0.6), under=np.maximum.reduce(m_arms) * 0,
          extra_lines=[(T([[-27 * bw, -12], [0, -9.5], [27 * bw, -12]]), 1.1, 0.55)])
    for i, q in enumerate(arms):
        paint(el, q, pal['tunic'], pal['tunic2'], pal['tunic_line'], ang=math.radians(86), seed=seed + 24 + i,
              dens=1.1 * dk, lw=1.3, add_shape=False, lit=lit, length=(9, 15), t=(0.15, 0.7))
    for i, q in enumerate(hands + ears):
        paint(el, q, pal['skin'], None, pal['skin_line'], ang=math.radians(70), seed=seed + 30 + i, dens=1.2 * dk,
              lw=1.0, add_shape=False, k=0.85, length=(5, 9), t=(0.3, 0.8))
    paint(el, neck, pal['skin'], pal['skin2'], pal['skin_line'], ang=math.radians(70), seed=seed + 35, dens=1.2 * dk,
          lw=1.0, add_shape=False, k=0.85, length=(5, 9), t=(0.3, 0.8), under=m_torso, line_pts=[T([[-7, -112], [-7.5, -100]]), T([[7, -112], [7.5, -100]])])
    m_hair = mk(hair) * m_head
    paint(el, head, pal['skin'], pal['skin2'], pal['skin_line'], ang=math.radians(70), seed=seed + 40,
          dens=1.1 * dk, lw=1.4, add_shape=False, k=0.85, length=(6, 11), t=(0.0, 0.5), under=m_hair * 0.85)
    paint(el, hair, pal['hair'], None, None, m=m_hair, ang=math.radians(70 if view == 'back' else 20), seed=seed + 41,
          dens=1.8 * dk, add_shape=False, length=(6, 11), t=(0.1, 0.6), spacing=1.9)
    if view == 'front' and face:
        sc = el.canvas()
        for sg in (-1, 1):
            sc.line(T([[sg * 6.6 - 0.7, -128.5], [sg * 6.6 + 0.7, -128.3]]) * s, 2.2 * s, 0.95, 0.6, 0.7,
                    seed=seed + 50 + sg, taper=(0, 0))
        el.line_layer(pal['hair2'], sc, k=0.9)
    return el


class AlphaFrame:
    """draw_side ile aynı yerleşim; yalnız örtme (alfa) maskesini dünya ızgarasında toplar."""

    def __init__(self, x0, y0, x1, y1):
        import cv2
        self.x0, self.y0 = x0, y0
        self.w, self.h = int(x1 - x0), int(y1 - y0)
        self.A = np.zeros((self.h, self.w), np.float32)
        self.cam = None
        self.off = (0, 0)

    def place(self, el, x, y, rot=0.0, sx=1.0, sy=None, op=1.0, pd=1.0, pw=1.0, mode='over', parent=None,
              cam=True, tint=None, dens=1.0, DA=None):
        import cv2
        if sy is None:
            sy = sx
        A = el.alpha()
        s = el.s
        px, py = el.pivot
        Mtl = np.array([[1 / s, 0, -px], [0, 1 / s, -py], [0, 0, 1]], np.float64)
        M = mat_T(x, y) @ mat_R(rot) @ mat_S(sx, sy) @ Mtl
        if parent is not None:
            M = parent @ M
        M = mat_T(-self.x0, -self.y0) @ M
        out = cv2.warpAffine(A, M[:2], (self.w, self.h), flags=cv2.INTER_LINEAR, borderValue=0)
        self.A = np.maximum(self.A, out)
