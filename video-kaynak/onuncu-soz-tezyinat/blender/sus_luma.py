#!/usr/bin/env python3
"""Outro son plan: susleme bolgelerinin kare-kare ortalama parlakligi (Rec.709 luma).
Kullanim: python3 sus_luma.py <dizin> [f0 f1]   (dizinde 0080.png ... bicimi)"""
import sys, numpy as np
from PIL import Image
d = sys.argv[1]; f0, f1 = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (80, 129)
REG = {'sag_alt': (720, 880, 820, 960), 'sol_alt': (420, 940, 540, 1020), 'madalyon': (430, 780, 640, 900)}
vals = {k: [] for k in REG}
for f in range(f0, f1 + 1):
    a = np.asarray(Image.open(f'{d}/{f:04d}.png').convert('RGB')).astype(float)
    for k, (x0, y0, x1, y1) in REG.items():
        p = a[y0:y1, x0:x1]
        vals[k].append(float((p[..., 0] * 0.2126 + p[..., 1] * 0.7152 + p[..., 2] * 0.0722).mean()))
for k, v in vals.items():
    dv = np.diff(v); i = int(np.argmax(np.abs(dv)))
    print(f'{k:9s} max|d|={abs(dv[i]):.2f} @ f{f0+i}->f{f0+i+1}   (>2 olan gecis sayisi: {int((np.abs(dv) > 2).sum())})')
