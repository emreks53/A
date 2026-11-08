#!/usr/bin/env python3
"""Sol sayfa basi bolgesinde pembe/kirmizi piksel sayaci (r>120, r-g>40, r-b>30).
Kullanim: python3 bas_olc.py <oluk.txt> <png_kalibi: .../intro_{f:04d}.png> [x_sol x_sag y_ust y_alt]
Bolge, oluk bas noktasina (hx,hy) gore: x in [hx-260, hx+60], y in [hy-130, hy+30] (1080x1920 koordinat)."""
import sys, numpy as np
from PIL import Image
L, R_, U, D = -260, 60, -130, 30
if len(sys.argv) > 6:
    L, R_, U, D = map(float, sys.argv[3:7])
pts = {}
for l in open(sys.argv[1]):
    if l.startswith('[oluk]'):
        _, f, hx, hy, tx, ty = l.split(); pts[int(f[1:])] = (float(hx), float(hy))
out = []
for f, (hx, hy) in sorted(pts.items()):
    try:
        im = np.asarray(Image.open(sys.argv[2].format(f=f)).convert('RGB')).astype(int)
    except FileNotFoundError:
        continue
    h, w, _ = im.shape; s = w / 1080.0
    x0, x1 = int(max(0, (hx + L) * s)), int(min(w, (hx + R_) * s))
    y0, y1 = int(max(0, (hy + U) * s)), int(min(h, (hy + D) * s))
    a = im[y0:y1, x0:x1]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (r > 120) & (r - g > 40) & (r - b > 30)
    out.append((f, int(m.sum() / (s * s))))
print(' '.join(f'f{f}:{n}' for f, n in out), '| toplam', sum(n for _, n in out))
