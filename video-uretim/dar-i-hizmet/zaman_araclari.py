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
