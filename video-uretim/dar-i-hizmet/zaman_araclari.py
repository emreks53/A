"""Anahtar kare ve zamanlama yardımcıları."""
from __future__ import annotations

import json
import math
import os

from motor import KOK, e_io, e_io5, e_ss, lerp, Kamera, kamera_karistir

SES = 0.30  # sesin videodaki gecikmesi

with open(os.path.join(KOK, 'zaman.json'), encoding='utf-8') as _f:
    _Z = json.load(_f)
KELIME = {}
for _i, (_k, _t) in enumerate(_Z['kelimeler']):
    KELIME.setdefault(_k, []).append(_t + SES)


def an(kelime, sira=0):
    """Kelimenin videodaki başlangıç anı (sn). sira: aynı kelime birden çok geçiyorsa kaçıncısı."""
    return KELIME[kelime][sira]


def anahtar(V, kareler, egri=e_io):
    """kareler: [(zaman, değer), ...] (değer sayı ya da demet). Segment başına yumuşatılmış ara değer."""
    if V <= kareler[0][0]:
        return kareler[0][1]
    if V >= kareler[-1][0]:
        return kareler[-1][1]
    for (t0, v0), (t1, v1) in zip(kareler, kareler[1:]):
        if t0 <= V <= t1:
            u = egri((V - t0) / (t1 - t0)) if t1 > t0 else 1.0
            if isinstance(v0, (tuple, list)):
                return type(v0)(lerp(a, b, u) for a, b in zip(v0, v1))
            return lerp(v0, v1, u)
    return kareler[-1][1]


def kamera_yolu(V, kareler, egri=e_ss):
    """kareler: [(zaman, Kamera), ...]"""
    if V <= kareler[0][0]:
        return kareler[0][1]
    if V >= kareler[-1][0]:
        return kareler[-1][1]
    for (t0, k0), (t1, k1) in zip(kareler, kareler[1:]):
        if t0 <= V <= t1:
            u = egri((V - t0) / (t1 - t0)) if t1 > t0 else 1.0
            return kamera_karistir(k0, k1, u)
    return kareler[-1][1]


def kayma(V, hiz=(0.0, 0.0), zum_hiz=0.0, sal=0.0, faz=0.0):
    """Kameranın hiç tam durmaması için çok yavaş sürekli kayma ve elde tutulmuş gibi hafif salınım."""
    dx = hiz[0] * V + sal * (math.sin(V * 0.73 + faz) * 0.6 + math.sin(V * 1.31 + 2 * faz) * 0.4)
    dy = hiz[1] * V + sal * (math.sin(V * 0.59 + 1.7 + faz) * 0.6 + math.sin(V * 1.13 + faz) * 0.4)
    return dx, dy, 1.0 + zum_hiz * V


def _monoton_egimler(ts, ys):
    """Fritsch–Carlson: aşmasız (overshoot'suz) kübik Hermite eğimleri."""
    n = len(ts)
    d = [(ys[i + 1] - ys[i]) / (ts[i + 1] - ts[i]) for i in range(n - 1)]
    m = [0.0] * n
    m[0] = 0.0
    m[-1] = 0.0
    for i in range(1, n - 1):
        if d[i - 1] * d[i] <= 0:
            m[i] = 0.0
        else:
            w1 = 2 * (ts[i + 1] - ts[i]) + (ts[i] - ts[i - 1])
            w2 = (ts[i + 1] - ts[i]) + 2 * (ts[i] - ts[i - 1])
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    return m


def _hermite(t, ts, ys, ms):
    if t <= ts[0]:
        return ys[0]
    if t >= ts[-1]:
        return ys[-1]
    for i in range(len(ts) - 1):
        if ts[i] <= t <= ts[i + 1]:
            h = ts[i + 1] - ts[i]
            u = (t - ts[i]) / h
            h00 = 2 * u ** 3 - 3 * u ** 2 + 1
            h10 = u ** 3 - 2 * u ** 2 + u
            h01 = -2 * u ** 3 + 3 * u ** 2
            h11 = u ** 3 - u ** 2
            return h00 * ys[i] + h10 * h * ms[i] + h01 * ys[i + 1] + h11 * h * ms[i + 1]
    return ys[-1]


def kamera_akis(V, kareler):
    """Anahtar kareler arasından duraksamadan akan kamera: x, y ve log(zum) ayrı ayrı monoton kübik
    (aşmasız) eğrilerle; yön değiştirdiği yerde doğal olarak yavaşlar, ara anahtarlardan durmadan geçer.
    Aynı değerli iki ardışık anahtar bir 'bekleme' oluşturur."""
    ts = [k[0] for k in kareler]
    xs = [k[1].x for k in kareler]
    ys = [k[1].y for k in kareler]
    zs = [math.log(k[1].zum) for k in kareler]
    x = _hermite(V, ts, xs, _monoton_egimler(ts, xs))
    y = _hermite(V, ts, ys, _monoton_egimler(ts, ys))
    z = _hermite(V, ts, zs, _monoton_egimler(ts, zs))
    return Kamera(x, y, math.exp(z))
