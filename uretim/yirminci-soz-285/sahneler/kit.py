# -*- coding: utf-8 -*-
"""Ortak çizim kiti: genel boyalı şekil, gök/zemin, nur, nesneler."""
import math
import numpy as np
import skia
from wc import (Element, hatch, P, bez, ellipse_pts, sstep, blur, blur_big, fbm, gnorm, resample, mask_of,
                xform_path, pig, path_union)
from scipy_free import smooth_closed, smooth_open


def closed(pts):
    pts = np.asarray(pts, float)
    return np.vstack([pts, pts[:1]])


def tone_map(el, m, lit=(0.8, -0.6), base=0.55, gain=1.2):
    th, tw = el.th, el.tw
    yy, xx = np.mgrid[0:th, 0:tw].astype(np.float32)
    ys, xs = np.nonzero(m > 0.3)
    if len(xs) == 0:
        return np.zeros((th, tw), np.float32)
    cx, cy = xs.mean(), ys.mean()
    ext = max(np.ptp(xs), np.ptp(ys), 4)
    d = np.array(lit, float)
    d /= np.linalg.norm(d)
    l = ((xx - cx) * d[0] + (yy - cy) * d[1]) / ext
    return np.clip(base - l * gain, 0, 1).astype(np.float32)


def paint(el, pts=None, base='#888888', shade=None, line=None, ang=math.radians(60), m=None, tone=None,
          dens=1.2, spacing=2.5, length=(10, 18), cluster=(5, 9), press=(0.45, 0.78), width=(0.95, 1.4),
          k=0.95, kshade=0.8, lw=1.7, bloom_n=0, bloom_r=(6, 18), t=(0.0, 1.0), seed=0, lit=(0.8, -0.6),
          shade_ang=None, shade_from=0.45, line_pts=None, line_k=0.95, wet_spread=0.6, edge_k=2.0,
          sweep=(0.2, 1.0), add_shape=True, gran=0.55, line_press=0.85, shade_dens=0.9, clipm=True,
          extra_lines=(), angle_jit=0.07, no_wet=False, under=None):
    """Bir şekli taban + gölge taramasıyla boyar, kontur çizer. pts: dünya biriminde kapalı çokgen."""
    S = el.s
    if m is None:
        path = P(pts)
        m = el.add_shape(path) if add_shape else el.mask(path)
    elif add_shape:
        el.shape = np.maximum(el.shape, m)
    if tone is None:
        tone = tone_map(el, m, lit)
    t0, t1 = t
    span = t1 - t0
    mc = np.clip(blur(m, 0.6 * S) * 1.5, 0, 1) if clipm else None
    if under is not None:
        uo = 1.0 - np.clip(under, 0, 1)
        mc = (mc if mc is not None else np.ones_like(m)) * uo
    wo = np.zeros_like(el.wet) if no_wet else None
    sc = el.canvas()
    hatch(sc, m, ang, spacing=spacing * S, length=(length[0] * S, length[1] * S), cluster=cluster, press=press,
          width=(width[0] * S, width[1] * S), density=dens, tone=0.6 + 0.4 * tone, angle_jit=angle_jit,
          seed=seed + 11, t_range=(t0 + 0.08 * span, t0 + 0.62 * span), sweep_dir=sweep)
    el.layer(base, sc, k=k, shape=m, clip=mc, bloom_n=bloom_n, bloom_r=bloom_r, edge_k=edge_k,
             wet_spread=wet_spread, gran=gran, wet_override=wo)
    if shade is not None:
        sc = el.canvas()
        hatch(sc, m * sstep(shade_from, shade_from + 0.35, tone),
              ((lambda x, y: ang(x, y) + 0.9) if callable(ang) else ang + 0.9) if shade_ang is None else shade_ang,
              spacing=(spacing + 0.2) * S,
              length=(length[0] * 0.75 * S, length[1] * 0.75 * S), cluster=(max(2, cluster[0] - 2), cluster[1] - 2),
              press=(press[0] * 0.92, press[1] * 0.95), width=(width[0] * S, width[1] * 0.95 * S),
              density=shade_dens, tone=tone, angle_jit=angle_jit, seed=seed + 12,
              t_range=(t0 + 0.3 * span, t0 + 0.8 * span), sweep_dir=sweep)
        el.layer(shade, sc, k=kshade, shape=m, clip=mc, bloom_n=0, edge_k=edge_k * 0.8, wet_spread=wet_spread * 0.9,
                 gran=gran, wet_override=wo)
    if line is not None:
        sc = el.canvas()
        lp = line_pts if line_pts is not None else ([closed(pts)] if pts is not None else [])
        if isinstance(lp, np.ndarray):
            lp = [lp]
        for i, q in enumerate(lp):
            sc.line(np.asarray(q) * S, lw * S, line_press, t0, t0 + 0.5 * span, seed=seed + 21 + i,
                    taper=(0.03, 0.03), press_noise=0.2)
        for i, (q, w_, pr) in enumerate(extra_lines):
            sc.line(np.asarray(q) * S, w_ * S, pr, t0 + 0.3 * span, t0 + 0.75 * span, seed=seed + 41 + i,
                    taper=(0.08, 0.1), press_noise=0.25)
        el.line_layer(line, sc, k=line_k, clip=None if under is None else uo)
    return m


def glow_density(h, w, cx, cy, r, hexc='#F3D23C', k=0.9, s=1.0, seed=0, core=0.18, rays=0, ray_len=1.0):
    """Nur: merkez kâğıt beyazı, çevresi sıcak, dışa sönen yıkama (+ isteğe bağlı ışın kamaları)."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.hypot(xx - cx, yy - cy) / (r * s)
    a = np.arctan2(yy - cy, xx - cx)
    n = gnorm(fbm(h, w, 40 * s, 3, 0.5, seed))
    ring = sstep(core, core + 0.25, d) * sstep(1.05, 0.35, d)
    dens = ring * (0.65 + 0.5 * n)
    if rays:
        rr = np.random.default_rng(seed)
        ph = rr.uniform(0, 6.28)
        wv = 0.5 + 0.5 * np.cos(rays * a + ph + 0.35 * np.sin(3 * a))
        dens = dens * (0.55 + 0.6 * wv ** 3)
    return (dens[..., None] * pig(hexc, k)[None, None, :]).astype(np.float32)


# ------------------------------------------------------------------ gök ve zemin
def build_sky(w, h, s=0.5, seed=200, top='#5EA6DA', deep='#3D58B6', sun=None, wet_angle=math.radians(200),
              wet_frac=0.55, clouds=4, cloud_y=(0.12, 0.55), horizon=None, warm=None, dens=1.0, t=(0.0, 1.0),
              clear_rect=None, ww=None, place=(0, 0)):
    """Büyük gök yıkaması: üstte koyu, aşağı açılan; bulutlar beyaz kâğıt; güneş halkası."""
    el = Element(w, h, s, seed=seed, name='sky', pivot=(0, 0))
    S = s
    th, tw = el.th, el.tw
    yy, xx = np.mgrid[0:th, 0:tw].astype(np.float32)
    hz = (horizon if horizon is not None else h) * S
    m = sstep(hz + 6 * S, hz - 30 * S, yy).astype(np.float32)
    # bulut boşlukları (düz tabanlı loblu)
    rr = np.random.default_rng(seed)
    cm = np.zeros((th, tw), np.float32)
    for i in range(clouds):
        cx = rr.uniform(0.08, 0.92) * w
        cy = rr.uniform(*cloud_y) * h
        cw = rr.uniform(0.18, 0.3) * min(w, 1250)
        ch = cw * rr.uniform(0.22, 0.32)
        pts = []
        nl = int(rr.integers(4, 7))
        for j in range(nl):
            lx = cx - cw / 2 + cw * (j + 0.5) / nl + rr.uniform(-0.04, 0.04) * cw
            lr = ch * rr.uniform(0.5, 0.9) * (1 - 0.5 * abs((j + 0.5) / nl - 0.5))
            pts.append(ellipse_pts(lx, cy - lr * 0.4, lr * 1.25, lr, 40))
        pts.append(ellipse_pts(cx, cy, cw * 0.5, ch * 0.25, 40))
        cmask = np.zeros((th, tw), np.float32)
        for q in pts:
            cmask = np.maximum(cmask, mask_of(P(q * S), tw, th))
        cmask *= sstep(cy * S + ch * 0.25 * S, cy * S + ch * 0.05 * S, yy)  # düz taban
        cm = np.maximum(cm, cmask)
    cm = blur(cm, 2.0 * S)
    tone = np.clip(1.0 - yy / max(hz, 1) * 0.9, 0, 1)
    if sun is not None:
        sx, sy, sr = sun
        ds = np.hypot(xx - sx * S, yy - sy * S) / (sr * S)
        tone = tone * sstep(0.6, 2.2, ds)
        m = m * sstep(0.85, 1.25, ds)
    if clear_rect is not None:
        for (x0, y0, x1, y1) in clear_rect:
            m = m * (1 - sstep(-20 * S, 10 * S, np.minimum(np.minimum(xx - x0 * S, x1 * S - xx),
                                                          np.minimum(yy - y0 * S, y1 * S - yy))))
    sky_m = m * (1 - cm)
    el.shape = np.zeros_like(m)  # gök arka plandır: örtme yok
    el.wet_split_shape = sky_m
    el.shape = sky_m.copy()
    if ww is not None:
        ww.apply(el, *place)
    else:
        el.wet_split(angle=wet_angle, frac=wet_frac, lobes=0.3, seed=seed + 1, sweep=wet_angle + math.pi)
    el.shape = np.zeros_like(m)
    t0, t1 = t
    sc = el.canvas()
    hatch(sc, sky_m, math.radians(-62), spacing=3.4 * S, length=(26 * S, 46 * S), cluster=(6, 11),
          press=(0.32, 0.6), width=(1.1 * S, 1.6 * S), density=0.95 * dens, tone=0.35 + 0.65 * tone, angle_jit=0.06,
          seed=seed + 11, t_range=(t0, t0 + 0.7 * (t1 - t0)), sweep_dir=(1, 0.4))
    el.layer(top, sc, k=0.75, bloom_n=None, bloom_r=(20, 60), edge_k=1.8, wet_spread=1.6, gran=0.7,
             clip=np.clip(sky_m * 1.3, 0, 1), shape=None)
    sc = el.canvas()
    hatch(sc, sky_m * sstep(0.45, 0.85, tone), math.radians(-30), spacing=3.6 * S, length=(22 * S, 38 * S),
          cluster=(5, 9), press=(0.3, 0.55), width=(1.1 * S, 1.5 * S), density=0.7 * dens, tone=tone, angle_jit=0.06,
          seed=seed + 12, t_range=(t0 + 0.2 * (t1 - t0), t0 + 0.85 * (t1 - t0)), sweep_dir=(1, 0.4))
    el.layer(deep, sc, k=0.7, bloom_n=None, bloom_r=(20, 60), edge_k=1.8, wet_spread=1.6, gran=0.7,
             clip=np.clip(sky_m * 1.3, 0, 1))
    if warm is not None:
        hexw, wy = warm[0], warm[1]
        wh = warm[2] if len(warm) > 2 else 260
        wm = m * sstep(wy * S - wh * S, wy * S, yy) * (1 - cm)
        sc = el.canvas()
        hatch(sc, wm, math.radians(-8), spacing=3.4 * S, length=(26 * S, 44 * S), cluster=(6, 10),
              press=(0.28, 0.5), width=(1.1 * S, 1.5 * S), density=0.8, tone=wm, angle_jit=0.05, seed=seed + 13,
              t_range=(t0 + 0.1 * (t1 - t0), t0 + 0.8 * (t1 - t0)))
        el.layer(hexw, sc, k=0.55, bloom_n=None, edge_k=1.4, wet_spread=1.5, gran=0.6, clip=np.clip(wm * 1.3, 0, 1))
    if sun is not None:
        sx, sy, sr = sun
        sc = el.canvas()
        ds = np.hypot(xx - sx * S, yy - sy * S) / (sr * S)
        sm = sstep(0.9, 1.0, ds) * sstep(2.6, 1.4, ds)
        hatch(sc, sm, lambda x, y: math.atan2(y - sy * S, x - sx * S) + math.pi / 2, spacing=3.2 * S,
              length=(18 * S, 30 * S), cluster=(4, 8), press=(0.45, 0.75), width=(1.1 * S, 1.6 * S), density=1.6,
              tone=sstep(2.6, 1.0, ds), seed=seed + 14, t_range=(t0 + 0.4 * (t1 - t0), t0 + 0.9 * (t1 - t0)),
              order=(sx * S, sy * S), angle_jit=0.05)
        el.layer('#F3D23C', sc, k=0.85, wet_override=np.zeros_like(el.wet))
    return el


def build_ground(w, h, s=0.5, seed=300, top_y=0.0, base='#D6A456', green='#7FAF4A', shade='#9C6B3A', t=(0, 1),
                 grass=True, wet_angle=math.radians(200), wet_frac=0.55, fade=140, ww=None, place=(0, 0)):
    el = Element(w, h, s, seed=seed, name='ground', pivot=(0, 0))
    S = s
    th, tw = el.th, el.tw
    yy, xx = np.mgrid[0:th, 0:tw].astype(np.float32)
    edge = (top_y + 6 * (fbm(th, tw, 60 * S, 2, .5, seed) - 0.5) * 2) * S
    m = sstep(edge - 1.5 * S, edge + 1.5 * S, yy) * sstep(h * S, (h - fade) * S, yy)
    el.shape = m.copy()
    if ww is not None:
        ww.apply(el, *place)
    else:
        el.wet_split(angle=wet_angle, frac=wet_frac, lobes=0.3, seed=seed + 1, sweep=wet_angle + math.pi)
    tone = sstep(top_y * S, (top_y + 160) * S, yy)
    t0, t1 = t
    sc = el.canvas()
    hatch(sc, m, math.radians(-6), spacing=3.0 * S, length=(26 * S, 44 * S), cluster=(6, 11), press=(0.4, 0.7),
          width=(1.1 * S, 1.6 * S), density=1.15, tone=0.5 + 0.5 * (1 - tone * 0.5), angle_jit=0.05, seed=seed + 11,
          t_range=(t0, t0 + 0.6 * (t1 - t0)), sweep_dir=(1, 0.2))
    el.layer(base, sc, k=0.85, bloom_n=None, bloom_r=(14, 40), edge_k=1.8, wet_spread=1.3, gran=0.8,
             clip=np.clip(m * 1.4, 0, 1))
    if grass:
        gm = m * sstep((top_y + 70) * S, (top_y + 10) * S, yy)
        sc = el.canvas()
        hatch(sc, gm, math.radians(-82), spacing=2.6 * S, length=(10 * S, 20 * S), cluster=(5, 9),
              press=(0.45, 0.75), width=(1.0 * S, 1.4 * S), density=1.2, tone=gm, angle_jit=0.18, seed=seed + 12,
              t_range=(t0 + 0.2 * (t1 - t0), t0 + 0.8 * (t1 - t0)))
        el.layer(green, sc, k=0.85, bloom_n=None, bloom_r=(10, 30), edge_k=1.6, wet_spread=1.0,
                 clip=np.clip(m * 1.4, 0, 1))
    sc = el.canvas()
    hatch(sc, m * sstep(0.35, 0.9, tone), math.radians(12), spacing=3.2 * S, length=(18 * S, 32 * S),
          cluster=(4, 8), press=(0.35, 0.6), width=(1.0 * S, 1.4 * S), density=0.7, tone=tone, angle_jit=0.06,
          seed=seed + 13, t_range=(t0 + 0.3 * (t1 - t0), t0 + 0.9 * (t1 - t0)))
    el.layer(shade, sc, k=0.6, bloom_n=0, edge_k=1.5, wet_spread=1.2, clip=np.clip(m * 1.4, 0, 1))
    el.shape = np.zeros_like(m)
    return el


# ------------------------------------------------------------------ nesneler
def build_cypress(h=260, s=1.0, seed=400, ww=None, place=(0, 0), flip=False):
    w = h * 0.34
    el = Element(w + 20, h + 20, s, seed=seed, name='cypress', pivot=((w + 20) / 2, h + 10))
    cx = (w + 20) / 2
    top = 10
    bot = h + 10
    rr = np.random.default_rng(seed)
    L = []
    R = []
    n = 26
    for i in range(n + 1):
        u = i / n
        y = top + (bot - top) * u
        prof = math.sin(min(1.0, u * 1.15) * math.pi * 0.62) ** 1.15 * (1 - 0.15 * u)
        rw = w * 0.5 * prof * (1 + rr.uniform(-0.07, 0.07))
        L.append((cx - rw, y))
        R.append((cx + rw * 0.95, y))
    pts = smooth_closed(np.array(L + R[::-1]), 2)
    trunk = np.array([[cx - 4, bot - 16], [cx + 4, bot - 16], [cx + 5, bot], [cx - 5, bot]])
    paint(el, trunk, '#7A5236', None, '#3E2A1C', ang=math.radians(90), seed=seed + 5, lw=1.3, dens=1.6)
    el.shape = np.maximum(el.shape, el.mask(P(pts)))
    if ww is not None:
        ww.apply(el, *place)
        if flip:
            el.wet = el.wet[:, ::-1].copy()
            el.Tw = el.Tw[:, ::-1].copy()
    else:
        el.wet_split(angle=math.radians(185), frac=0.5, lobes=0.3, seed=seed + 1)
    paint(el, pts, '#3F7F45', '#165A46', '#123E30', ang=lambda x, y: math.radians(-70 + 40 * ((x / s - cx) > 0)),
          seed=seed + 6, spacing=2.4, length=(8, 14), dens=1.6, bloom_n=1, lw=1.5)
    return el


def build_hourglass(s=2.0, seed=500):
    """Kum saati: ahşap çerçeve + cam; kum ayrı öğeler (üst, alt, akış)."""
    W_, H_ = 90, 124
    el = Element(W_, H_, s, seed=seed, name='hourglass', pivot=(W_ / 2, H_ / 2))
    cx = W_ / 2
    # çerçeve plakaları
    top = np.array([[8, 6], [W_ - 8, 6], [W_ - 8, 16], [8, 16]], float)
    bot = np.array([[8, H_ - 16], [W_ - 8, H_ - 16], [W_ - 8, H_ - 6], [8, H_ - 6]], float)
    for i, pl in enumerate((top, bot)):
        paint(el, smooth_closed(pl, 1), '#A9733F', '#6B4426', '#3E2614', ang=0.0, seed=seed + i, lw=1.4,
              dens=1.6, spacing=2.0, length=(6, 12))
    for i, x in enumerate((14, W_ - 14)):
        post = np.array([[x - 3, 16], [x + 3, 16], [x + 3, H_ - 16], [x - 3, H_ - 16]], float)
        paint(el, post, '#B98249', '#6B4426', '#3E2614', ang=math.radians(90), seed=seed + 5 + i, lw=1.2, dens=1.4,
              spacing=2.0, length=(8, 14))
    # cam: iki ampul
    glass_l = np.concatenate([bez((cx - 22, 17), (cx - 24, 40), (cx - 6, 52), (cx - 3, 62), 14),
                              bez((cx - 3, 62), (cx - 6, 72), (cx - 24, 84), (cx - 22, H_ - 17), 14)[1:]])
    glass_r = glass_l.copy()
    glass_r[:, 0] = 2 * cx - glass_r[:, 0]
    g_poly = np.vstack([glass_l, glass_r[::-1]])
    gm = el.mask(P(g_poly))
    sc = el.canvas()
    hatch(sc, gm * sstep(cx * s + 4 * s, cx * s - 14 * s, np.mgrid[0:el.th, 0:el.tw][1].astype(np.float32)),
          math.radians(70), spacing=3.0 * s, length=(6 * s, 12 * s), cluster=(3, 6), press=(0.25, 0.4),
          width=(0.9 * s, 1.2 * s), density=0.7, seed=seed + 20, t_range=(0.2, 0.7))
    el.layer('#9FC3D6', sc, k=0.5, wet_override=np.zeros_like(el.wet))
    sc = el.canvas()
    sc.line(glass_l * s, 1.4 * s, 0.75, 0.1, 0.5, seed=seed + 21)
    sc.line(glass_r * s, 1.4 * s, 0.75, 0.1, 0.5, seed=seed + 22)
    # parıltı çizgisi
    sc.line(np.array([[cx + 12, 26], [cx + 15, 38]]) * s, 1.3 * s, 0.45, 0.5, 0.7, seed=seed + 23)
    el.line_layer('#3A5A70', sc, k=0.8)
    el.shape = np.maximum(el.shape, gm * 0.0)
    el.glass_poly = g_poly
    # kum öğeleri
    sand_top = Element(W_, H_, s, seed=seed + 50, name='sand_top', pivot=(W_ / 2, H_ / 2))
    top_poly = np.concatenate([bez((cx - 19, 24), (cx - 20, 40), (cx - 6, 51), (cx - 2, 60), 12),
                               np.array([[cx + 2, 60]]),
                               bez((cx + 2, 60), (cx + 6, 51), (cx + 20, 40), (cx + 19, 24), 12)])
    paint(sand_top, top_poly, '#E2B65C', '#B9853A', None, ang=math.radians(20), seed=seed + 51, dens=1.8,
          spacing=2.0, length=(5, 10), no_wet=True)
    sand_bot = Element(W_, H_, s, seed=seed + 60, name='sand_bot', pivot=(W_ / 2, H_ / 2))
    bot_poly = np.concatenate([bez((cx - 21, H_ - 18), (cx - 18, H_ - 34), (cx - 6, H_ - 44), (cx, H_ - 46), 12),
                               bez((cx, H_ - 46), (cx + 6, H_ - 44), (cx + 18, H_ - 34), (cx + 21, H_ - 18), 12)[1:]])
    paint(sand_bot, bot_poly, '#E2B65C', '#B9853A', None, ang=math.radians(-20), seed=seed + 61, dens=1.8,
          spacing=2.0, length=(5, 10), no_wet=True)
    # seviye zaman haritaları: üst kum aşağıdan yukarı (pd = kalan oran), alt kum aşağıdan yukarı (pd = dolu oran)
    for e, y0, y1 in ((sand_top, 24, 61), (sand_bot, H_ - 46, H_ - 18)):
        yy = np.mgrid[0:e.th, 0:e.tw][0].astype(np.float32) / s
        T = np.clip((y1 - yy) / (y1 - y0), 0, 1)
        for L in e.layers:
            L.T = T.astype(np.float16)
    stream = Element(W_, H_, s, seed=seed + 70, name='sand_stream', pivot=(W_ / 2, H_ / 2))
    sc = stream.canvas()
    sc.line(np.array([[cx, 60], [cx, H_ - 20]]) * s, 1.6 * s, 0.9, 0, 1, seed=seed + 71, taper=(0, 0))
    stream.layer('#C99540', sc, k=0.9, wet_override=np.zeros_like(stream.wet))
    stream.shape = mask_of(P(np.array([[cx - 1.5, 60], [cx + 1.5, 60], [cx + 1.5, H_ - 20], [cx - 1.5, H_ - 20]]) * s),
                           stream.tw, stream.th)
    return el, sand_top, sand_bot, stream


def leaf_poly(base, tip, width, n=14, bend=0.12):
    base, tip = np.asarray(base, float), np.asarray(tip, float)
    d = tip - base
    L = np.linalg.norm(d)
    u = d / (L + 1e-9)
    nv = np.array([-u[1], u[0]])
    t = np.linspace(0, 1, n)
    prof = np.sin(np.pi * t) ** 0.8 * width / 2
    mid = base[None] + d[None] * t[:, None] + nv[None] * (bend * L * np.sin(np.pi * t))[:, None]
    left = mid + nv[None] * prof[:, None]
    right = mid - nv[None] * prof[:, None]
    return np.vstack([left, right[::-1][1:-1]]), mid


def petal_poly(center, ang, L, Wd, notch=0.08, n=18):
    """Damla biçimli taç yaprak: dipte dar, uçta yuvarlak (hafif çentikli)."""
    t = np.linspace(0, 1, n)
    prof = np.sin(np.pi * np.clip(t, 0, 1) ** 0.75) * Wd / 2
    xs = t * L
    left = np.stack([xs, prof], 1)
    right = np.stack([xs, -prof], 1)[::-1]
    tip = np.array([[L * (1 - notch), 0.0]])
    pts = np.vstack([left, tip, right])
    c, s_ = math.cos(ang), math.sin(ang)
    R = np.array([[c, -s_], [s_, c]])
    return pts @ R.T + np.asarray(center)


def build_flower(s=1.4, seed=420, h=220, kind='open', ww=None, place=(0, 0), petal='#F6C6D6', petal2='#9A66C2',
                 center='#C2452D', scale_head=1.0, tilt=0.0):
    """Ön plan çiçeği: ince kavisli sap, mızrak yapraklar (damarlı), beş taç yapraklı çiçek ya da tomurcuk."""
    rr = np.random.default_rng(seed)
    w = h * 0.8
    el = Element(w, h + 20, s, seed=seed, name='flower', pivot=(w / 2, h + 10))
    cx, by = w / 2, h + 10
    bend = rr.uniform(-0.16, 0.16) * w
    stem = bez((cx, by), (cx + bend * 0.2, by - h * 0.45), (cx + bend, by - h * 0.72), (cx + bend * 0.85, by - h + 34), 36)
    top = stem[-1]
    leaves = []
    nl = int(rr.integers(4, 7))
    for i in range(nl):
        u = 0.12 + 0.68 * (i + rr.uniform(0.1, 0.9)) / nl
        j = int(u * (len(stem) - 1))
        b = stem[j]
        side = 1 if i % 2 == 0 else -1
        ang = math.radians(rr.uniform(32, 64)) * side
        L = rr.uniform(0.16, 0.24) * h * (1.15 - 0.4 * u)
        tip = b + np.array([math.sin(ang) * L, -math.cos(ang) * L * 0.9])
        lp, mid = leaf_poly(b, tip, L * 0.34, bend=0.14 * side)
        leaves.append((lp, mid))
    heads = []
    if kind == 'open':
        R = rr.uniform(0.15, 0.19) * h * scale_head
        a0 = rr.uniform(0, 1.2)
        for k_ in range(5):
            a = a0 + k_ * 2 * math.pi / 5 + rr.uniform(-0.08, 0.08)
            heads.append(petal_poly(top, a, R * rr.uniform(0.92, 1.05), R * rr.uniform(0.92, 1.05), notch=0.06))
    else:
        R = rr.uniform(0.055, 0.07) * h
        ang = rr.uniform(-0.3, 0.3)
        bud = petal_poly(top, -math.pi / 2 + ang, R * 2.4, R * 1.8, notch=0.0)
        heads.append(bud)
        sep = [leaf_poly(top, top + np.array([math.sin(ang + d) * R * 1.3, -math.cos(ang + d) * R * 1.3]), R * 0.7, bend=0.1)[0]
               for d in (-0.7, 0.7)]
    allm = np.zeros((el.th, el.tw), np.float32)
    for lp, _ in leaves:
        allm = np.maximum(allm, el.mask(P(lp)))
    for hp in heads:
        allm = np.maximum(allm, el.mask(P(hp)))
    el.shape = allm
    if ww is not None:
        ww.apply(el, *place)
    else:
        el.wet_split(angle=math.radians(200), frac=0.5, lobes=0.25, seed=seed + 1)
    sc = el.canvas()
    sc.line(stem * s, 2.2 * s, 0.85, 0.0, 0.35, seed=seed + 2, taper=(0.0, 0.08))
    el.layer('#4F8E3A', sc, k=0.9, shape=None, bloom_n=0, wet_spread=0.35, edge_k=1.2)
    sc = el.canvas()
    sc.line(stem * s + np.array([0.9 * s, 0]), 0.9 * s, 0.7, 0.05, 0.4, seed=seed + 3, taper=(0.0, 0.1))
    el.line_layer('#1F4A2E', sc, k=0.8)
    for i, (lp, mid) in enumerate(leaves):
        ang = math.atan2(mid[-1][1] - mid[0][1], mid[-1][0] - mid[0][0])
        paint(el, lp, '#79B552', '#2E6B3E', '#1F4A2E', ang=ang + 0.55, seed=seed + 10 + i, spacing=1.9,
              length=(5, 9), cluster=(4, 7), dens=1.5, lw=1.15, t=(0.25 + 0.04 * i, 0.7 + 0.04 * i), bloom_n=0,
              add_shape=False, extra_lines=[(mid[1:-2], 0.85, 0.55)], k=0.85, kshade=0.7)
    if kind == 'open':
        yy, xx = np.mgrid[0:el.th, 0:el.tw].astype(np.float32) / s
        dist = np.hypot(xx - top[0], yy - top[1]) / R
        for i, hp in enumerate(heads):
            tm = el.mask(P(hp))
            tone = np.clip(0.15 + 0.75 * dist - 0.25, 0, 1)
            paint(el, hp, petal, petal2, '#6E3A6A', m=tm, tone=tone, add_shape=False,
                  ang=lambda x, y, c=top: math.atan2(y / s - c[1], x / s - c[0]), seed=seed + 30 + i, spacing=1.8,
                  length=(5, 10), cluster=(3, 6), dens=1.1, lw=1.0, k=0.62, kshade=0.62, shade_from=0.45,
                  t=(0.45 + 0.03 * i, 0.9), bloom_n=0, line_press=0.7)
        cm = ellipse_pts(top[0], top[1], R * 0.28, R * 0.28, 24)
        paint(el, cm, '#F0B43C', center, '#7A2A18', ang=0.4, seed=seed + 40, spacing=1.5, length=(3, 6), dens=2.2,
              lw=0.9, t=(0.6, 0.95), add_shape=False, shade_from=0.25)
        sc = el.canvas()
        for k_ in range(9):
            a = k_ * 2 * math.pi / 9 + 0.2
            sc.line(np.array([top + np.array([math.cos(a), math.sin(a)]) * R * 0.3,
                              top + np.array([math.cos(a), math.sin(a)]) * R * 0.48]) * s, 0.9 * s, 0.7, 0.8, 0.95,
                    seed=seed + 60 + k_, taper=(0.1, 0.4))
        el.line_layer('#8A2A20', sc, k=0.8)
    else:
        for i, sp in enumerate(sep):
            paint(el, sp, '#5E9E44', None, '#1F4A2E', ang=0.8, seed=seed + 50 + i, spacing=1.8, length=(3, 6),
                  dens=1.6, lw=0.9, t=(0.5, 0.9), add_shape=True)
        paint(el, heads[0], '#E0657E', '#8E2A44', '#6A1E30', ang=math.radians(80), seed=seed + 30, spacing=1.8,
              length=(4, 8), dens=1.6, lw=1.0, t=(0.45, 0.9), add_shape=False, k=0.8, shade_from=0.4)
    return el


def build_shadow(w=120, h=22, s=1.0, seed=1801, hexc='#5A4A5E', k=0.55):
    """Yumuşak temas gölgesi (yalnız yoğunluk; örtme yok). Pivot: merkez."""
    W_, H_ = w * 1.6, h * 2.6
    el = Element(W_, H_, s, seed=seed, name='shadow', pivot=(W_ / 2, H_ / 2))
    yy, xx = np.mgrid[0:el.th, 0:el.tw].astype(np.float32) / s
    d = ((xx - W_ / 2) / (w / 2)) ** 2 + ((yy - H_ / 2) / (h / 2)) ** 2
    n = gnorm(fbm(el.th, el.tw, 10 * s, 2, 0.5, seed))
    dens = np.exp(-d * 1.6) * (0.75 + 0.4 * n)
    el.add_density((dens * k)[..., None] * pig(hexc, 1.0)[None, None, :])
    el.shape = el.shape * 0
    return el
