# -*- coding: utf-8 -*-
"""Dünya küresi (gerçek kıta hatları, ortografik izdüşüm)."""
import json, math, os
import numpy as np
import skia
from wc import (Element, StrokeCanvas, hatch, P, ellipse_pts, mask_of, xform_path, fbm, gnorm, sstep, blur,
                resample)

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'data', 'ne_110m_land.geojson')


def land_polys(R, lon0=34.0, lat0=28.0, step_deg=0.6):
    d = json.load(open(DATA))
    l0, p0 = math.radians(lon0), math.radians(lat0)
    out = []
    for f in d['features']:
        g = f['geometry']
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        for poly in polys:
            ring = np.array(poly[0], np.float64)
            # sık örnekle (ufuk kırpması düzgün olsun)
            dense = [ring[0]]
            for a, b in zip(ring[:-1], ring[1:]):
                n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) / step_deg) + 1
                for k in range(1, n + 1):
                    dense.append(a + (b - a) * k / n)
            ring = np.array(dense)
            lon, lat = np.radians(ring[:, 0]), np.radians(ring[:, 1])
            cosc = math.sin(p0) * np.sin(lat) + math.cos(p0) * np.cos(lat) * np.cos(lon - l0)
            if (cosc > 0).sum() < 3:
                continue
            x = R * np.cos(lat) * np.sin(lon - l0)
            y = -R * (math.cos(p0) * np.sin(lat) - math.sin(p0) * np.cos(lat) * np.cos(lon - l0))
            inv = cosc <= 0
            rr = np.hypot(x, y) + 1e-9
            x = np.where(inv, x / rr * R, x)
            y = np.where(inv, y / rr * R, y)
            out.append((np.stack([x, y], 1), cosc, ring))
    return out


def desert_weight(lon, lat):
    """Kaba çöl/kurak bölgeler: Sahra, Arabistan, İran, Orta Asya kısmı."""
    w = 0.0
    if -17 < lon < 35 and 15 < lat < 32:
        w = 1.0
    if 34 < lon < 60 and 14 < lat < 34:
        w = max(w, 1.0)
    if 50 < lon < 70 and 25 < lat < 40:
        w = max(w, 0.7)
    if 10 < lon < 30 and -30 < lat < -17:
        w = max(w, 0.6)
    return w


def build_globe(R=300.0, s=1.0, seed=11, pad=24, lon0=34.0, lat0=28.0, wet_frac=0.5, name='globe',
                palette=None, draw_t=(0.0, 1.0), simple=False, ww=None, place=(540, 640)):
    pal = dict(ocean1='#5EA6DA', ocean2='#3D58B6', ocean3='#2B3F8F', land1='#4F9C38', land2='#165A46',
               sand='#D6A456', sand2='#B07A35', rim='#2D3A6B', coast='#1E4D3C', light='#F3D23C')
    if palette:
        pal.update(palette)
    size = 2 * (R + pad)
    el = Element(size, size, s, seed=seed, name=name, pivot=(R + pad, R + pad))
    c = R + pad
    T, Wd = el.th, el.tw
    S = el.s
    disc = P(ellipse_pts(c, c, R, R, 240))
    m_disc = el.add_shape(disc)
    yy, xx = np.mgrid[0:T, 0:Wd].astype(np.float32) / S
    nx, ny = (xx - c) / R, (yy - c) / R
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    L = np.array([0.55, -0.45, 0.70])
    L /= np.linalg.norm(L)
    lam = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    tone = np.clip(1.05 - lam, 0, 1)  # koyu taraf 1

    # kara maskesi
    polys = land_polys(R, lon0, lat0)
    land_paths, desert_paths = [], []
    for pts, cosc, ring in polys:
        pp = pts + c
        land_paths.append(P(pp))
    m_land = np.zeros((T, Wd), np.float32)
    for p in land_paths:
        m_land = np.maximum(m_land, mask_of(xform_path(p, S), Wd, T))
    m_land *= m_disc
    # çöl ağırlığı haritası: kara pikselleri için boylam/enlem
    l0, p0 = math.radians(lon0), math.radians(lat0)
    rho = np.sqrt(nx ** 2 + ny ** 2)
    cc = np.arcsin(np.clip(rho, 0, 1))
    lat = np.arcsin(np.clip(np.cos(cc) * math.sin(p0) + (-ny) * np.sin(cc) * math.cos(p0) / (rho + 1e-9), -1, 1))
    lon = l0 + np.arctan2(nx * np.sin(cc), rho * np.cos(cc) * math.cos(p0) - (-ny) * np.sin(cc) * math.sin(p0))
    lond, latd = np.degrees(lon), np.degrees(lat)
    dw = np.zeros_like(lond)
    dw += sstep(-19, -12, lond) * sstep(36, 30, lond) * sstep(13, 17, latd) * sstep(33, 29, latd)
    dw = np.maximum(dw, sstep(33, 37, lond) * sstep(61, 57, lond) * sstep(13, 17, latd) * sstep(35, 31, latd))
    dw = np.maximum(dw, 0.7 * sstep(48, 52, lond) * sstep(72, 66, lond) * sstep(24, 28, latd) * sstep(41, 37, latd))
    dw = np.clip(dw + 0.25 * (fbm(T, Wd, 30 * S, 3, .5, seed + 2) - .5), 0, 1)
    m_sand = m_land * dw
    m_green = m_land * (1 - dw)
    m_ocean = m_disc * (1 - m_land)
    m_landc = np.clip(blur(m_land, 0.8 * S) * 1.6, 0, 1) * m_disc

    # ıslak: sol-alt (gölge) yarı
    if ww is not None:
        ww.apply(el, *place)
    else:
        el.wet_split(angle=math.radians(200), frac=wet_frac, lobes=0.22, seed=seed + 5,
                     t_range=(0.0, 1.0), sweep=math.radians(20))

    t0, t1 = draw_t
    span = t1 - t0

    def meridian_angle(x, y):
        # boylam çizgilerine teğet (küre üstünde dikey kıvrımlar)
        X, Y = (x / S - c) / R, (y / S - c) / R
        return math.pi / 2 + 0.35 * X * (1 - min(1, abs(Y)))

    # okyanus: açık mavi taban (her yer), ultramarin gölge, koyu derin
    sc = el.canvas()
    hatch(sc, m_ocean, meridian_angle, spacing=2.9 * S, length=(28 * S, 52 * S), cluster=(8, 14),
          press=(0.4, 0.7), width=(1.0 * S, 1.5 * S), density=1.25, tone=0.45 + 0.55 * tone, angle_jit=0.05,
          sweep_dir=(0.3, 1.0), t_range=(t0 + 0.05 * span, t0 + 0.55 * span), seed=seed + 31)
    el.layer(pal['ocean1'], sc, k=0.95, shape=m_disc, bloom_n=5, clip=m_disc)
    sc = el.canvas()
    hatch(sc, m_ocean * sstep(0.35, 0.75, tone), math.radians(30), spacing=3.2 * S, length=(20 * S, 34 * S),
          cluster=(5, 9), press=(0.45, 0.75), width=(1.0 * S, 1.5 * S), density=0.55, tone=tone, angle_jit=0.06,
          sweep_dir=(1.0, 0.4), t_range=(t0 + 0.25 * span, t0 + 0.7 * span), seed=seed + 32)
    el.layer(pal['ocean2'], sc, k=0.95, shape=m_disc, bloom_n=3, clip=m_disc)
    sc = el.canvas()
    hatch(sc, m_ocean * sstep(0.62, 0.95, tone), math.radians(-35), spacing=3.4 * S, length=(16 * S, 28 * S),
          cluster=(4, 8), press=(0.4, 0.7), width=(1.0 * S, 1.4 * S), density=0.45, tone=tone, angle_jit=0.06,
          sweep_dir=(1.0, 0.4), t_range=(t0 + 0.4 * span, t0 + 0.8 * span), seed=seed + 33)
    el.layer(pal['ocean3'], sc, k=0.8, shape=m_disc, bloom_n=2, clip=m_disc)
    # kara: yeşil, koyu yeşil gölge, kum
    sc = el.canvas()
    hatch(sc, m_green, math.radians(-50), spacing=2.6 * S, length=(16 * S, 28 * S), cluster=(8, 14),
          press=(0.4, 0.65), width=(1.0 * S, 1.5 * S), density=1.5, tone=0.55 + 0.45 * tone, angle_jit=0.06,
          sweep_dir=(0.6, 1.0), t_range=(t0 + 0.15 * span, t0 + 0.6 * span), seed=seed + 41)
    el.layer(pal['land1'], sc, k=1.0, shape=m_land, bloom_n=3, clip=m_landc)
    sc = el.canvas()
    hatch(sc, m_land * sstep(0.45, 0.85, tone) * (1 - 0.6 * dw), math.radians(40), spacing=3.0 * S,
          length=(12 * S, 20 * S), cluster=(4, 7), press=(0.45, 0.75), width=(1.0 * S, 1.4 * S), density=0.7, angle_jit=0.06,
          tone=tone, sweep_dir=(0.6, 1.0), t_range=(t0 + 0.35 * span, t0 + 0.75 * span), seed=seed + 42)
    el.layer(pal['land2'], sc, k=0.95, shape=m_land, bloom_n=2, clip=m_landc)
    sc = el.canvas()
    hatch(sc, m_sand, math.radians(-15), spacing=2.6 * S, length=(16 * S, 28 * S), cluster=(8, 14),
          press=(0.4, 0.65), width=(1.0 * S, 1.5 * S), density=1.5, tone=0.55 + 0.45 * tone, angle_jit=0.06,
          sweep_dir=(0.6, 1.0), t_range=(t0 + 0.2 * span, t0 + 0.6 * span), seed=seed + 43)
    el.layer(pal['sand'], sc, k=0.95, shape=m_land, bloom_n=2, clip=m_landc)
    sc = el.canvas()
    hatch(sc, m_sand * sstep(0.5, 0.9, tone), math.radians(60), spacing=3.2 * S, length=(10 * S, 16 * S),
          cluster=(3, 6), press=(0.4, 0.7), width=(1.0 * S, 1.4 * S), density=0.5, tone=tone, angle_jit=0.06,
          sweep_dir=(0.6, 1.0), t_range=(t0 + 0.4 * span, t0 + 0.8 * span), seed=seed + 44)
    el.layer(pal['sand2'], sc, k=0.85, shape=m_land, bloom_n=1, clip=m_landc)
    # konturlar: kıyılar ve küre kenarı
    sc = el.canvas()
    k = 0
    for pts, cosc, ring in polys:
        vis = cosc > 0.02
        if vis.sum() < 4:
            continue
        pp = (pts + c) * S
        # görünür parçaları ayrı çiz
        seg = []
        for i in range(len(pp)):
            if vis[i]:
                seg.append(pp[i])
            elif len(seg) > 3:
                sc.line(np.array(seg), 1.4 * S, 0.55, t0 + 0.55 * span, t0 + 0.8 * span, seed=seed + k)
                seg = []
                k += 1
            else:
                seg = []
        if len(seg) > 3:
            sc.line(np.array(seg), 1.4 * S, 0.55, t0 + 0.55 * span, t0 + 0.8 * span, seed=seed + k)
            k += 1
    el.line_layer(pal['coast'], sc, k=0.75)
    sc = el.canvas()
    rim = ellipse_pts(c, c, R, R, 300, math.radians(-100), math.radians(262)) * S
    sc.line(rim, 2.6 * S, 0.85, t0, t0 + 0.4 * span, seed=seed + 99, taper=(0.03, 0.05))
    rim2 = ellipse_pts(c, c, R - 1.2, R - 1.2, 200, math.radians(95), math.radians(250)) * S
    sc.line(rim2, 1.8 * S, 0.5, t0 + 0.1 * span, t0 + 0.45 * span, seed=seed + 98)
    el.line_layer(pal['rim'], sc, k=0.9)
    el.m_land = m_land
    el.m_disc = m_disc
    el.tone = tone
    return el
