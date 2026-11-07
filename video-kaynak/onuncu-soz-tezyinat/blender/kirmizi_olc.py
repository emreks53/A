#!/usr/bin/env python3
"""Oluk bandinda kirmizi piksel sayaci (R>90, R-G>55, R-B>40).
Kullanim: python3 kirmizi_olc.py <png_dizini> <shot> [band_px=45]
<png_dizini>/<shot>_oluk.txt: '[oluk] fN hx hy tx ty' (1080x1920 koordinat) satirlari."""
import sys, os, numpy as np
from PIL import Image
d, shot = sys.argv[1], sys.argv[2]
W = float(sys.argv[3]) if len(sys.argv) > 3 else 45.0
tot = 0; rows = []
for line in open(os.path.join(d, f'{shot}_oluk.txt')):
    if not line.startswith('[oluk]'): continue
    _, f, hx, hy, tx, ty = line.split(); f = int(f[1:]); hx, hy, tx, ty = map(float, (hx, hy, tx, ty))
    im = np.asarray(Image.open(os.path.join(d, f'{shot}_{f:04d}.png')).convert('RGB')).astype(int)
    h, w, _ = im.shape; s = w / 1080.0
    yy, xx = np.mgrid[0:h, 0:w]
    X, Y = xx / s, yy / s
    ax, ay, bx, by = hx, hy, tx, ty
    dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
    t = np.clip(((X - ax) * dx + (Y - ay) * dy) / L2, 0, 1)
    dist = np.hypot(X - (ax + t * dx), Y - (ay + t * dy))
    T0 = float(os.environ.get("BAND_T0", "0.0")); inside = (dist <= W) & (t > T0) & (t < 1.0 - T0)
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    red = (R > 90) & (R - G > 55) & (R - B > 40) & inside
    n = int(red.sum() / (s * s))   # tam-cozunurluk pikseline olcekli
    tot += n; rows.append((f, n))
print(shot, ' '.join(f'f{f}:{n}' for f, n in rows), '| toplam', tot)
