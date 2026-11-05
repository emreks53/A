#!/usr/bin/env python3
"""Render icindeki kapak derisinin rengini olc: python3 olc.py img.png [x0 y0 x1 y1]
Altin ve golge disi deri pikselleri (R baskin, doygun) secilir; medyan / %15 / %85 parlaklik verilir."""
import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
if len(sys.argv) >= 6:
    x0, y0, x1, y1 = [float(v) for v in sys.argv[2:6]]
    s = W / 1080.0
    im = im[int(y0*s):int(y1*s), int(x0*s):int(x1*s)]
px = im.reshape(-1, 3)
r, g, b = px[:, 0], px[:, 1], px[:, 2]
sel = (r > 70) & (r > g * 1.45) & (r > b * 1.25) & (g < 200) & (b > g * 0.85) & (np.abs(g - b) < 45)
p = px[sel]
if len(p) < 20:
    print('deri pikseli yok', len(p)); sys.exit()
lum = p @ np.array([0.2126, 0.7152, 0.0722])
o = np.argsort(lum)
def hx(c): return '#%02X%02X%02X' % tuple(int(round(v)) for v in c)
def band(a, b_):
    k = o[int(a*len(o)):max(int(a*len(o))+1, int(b_*len(o)))]
    return np.median(p[k], axis=0)
print(f'n={len(p)}  median {hx(np.median(p, axis=0))}  shadow(5-25%) {hx(band(0.05,0.25))}  mid(40-60%) {hx(band(0.4,0.6))}  high(80-97%) {hx(band(0.8,0.97))}')
