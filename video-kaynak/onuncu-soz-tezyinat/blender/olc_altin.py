#!/usr/bin/env python3
"""Altin varak piksellerinin rengi: python3 olc_altin.py img.png x0 y0 x1 y1 (1080 uzayinda)."""
import sys, colorsys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
s = im.shape[1] / 1080.0
x0, y0, x1, y1 = [float(v) for v in sys.argv[2:6]]
p = im[int(y0*s):int(y1*s), int(x0*s):int(x1*s)].reshape(-1, 3)
r, g, b = p[:, 0], p[:, 1], p[:, 2]
# altin/sari-beyaz: kirmizi deri degil -> G yuksek
import colorsys as _c
hsv = np.array([_c.rgb_to_hsv(*(c/255)) for c in p[::3]]); p = p[::3]
r, g, b = p[:, 0], p[:, 1], p[:, 2]
sel = (hsv[:,0] > 0.06) & (hsv[:,0] < 0.19) & (hsv[:,2] > 0.35)
q = p[sel]
lum = q @ np.array([0.2126, 0.7152, 0.0722]); o = np.argsort(lum)
hx = lambda c: '#%02X%02X%02X' % tuple(int(round(v)) for v in c)
def band(a, b_):
    k = o[int(a*len(o)):max(int(a*len(o))+1, int(b_*len(o)))]; return np.median(q[k], axis=0)
sat = np.array([colorsys.rgb_to_hsv(*(c/255))[1] for c in q[::max(1, len(q)//4000)]])
print(f'altin n={len(q)} dark {hx(band(0.05,0.25))} mid {hx(band(0.4,0.6))} bright {hx(band(0.85,0.98))} sat_med={np.median(sat):.2f}')
