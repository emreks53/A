#!/usr/bin/env python3
"""Kuyruk-mentese bolgesi farki (yeni vs v3) ve dikis kareleri (yeni vs v4).
Kullanim: python3 kuyruk_kontrol.py <proj_dizini> <shot> <f0> <f1>"""
import sys, numpy as np
from PIL import Image
pd, shot, f0, f1 = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
OUT = '../out'
P = {}
for l in open(f'{pd}/{shot}_proj.txt'):
    t, f, x0, y0, x1, y1 = l.split()
    if t == '[kuyruk]':
        P[int(f[1:])] = tuple(map(float, (x0, y0, x1, y1)))
rows = []
for f in range(f0, f1 + 1):
    if f not in P: continue
    x0, y0, x1, y1 = P[f]
    box = (int(max(0, x0 - 60)), int(max(0, y0 - 60)), int(min(1080, x1 + 60)), int(min(1920, y1 + 60)))
    if box[2] - box[0] < 4 or box[3] - box[1] < 4:
        rows.append((f, None)); continue
    a = np.asarray(Image.open(f'{OUT}/blender/{shot}/{f:04d}.png').convert('RGB').crop(box)).astype(int)
    b = np.asarray(Image.open(f'{OUT}/blender_yedek/{shot}_v3/{f:04d}.png').convert('RGB').crop(box)).astype(int)
    d = np.abs(a - b).max(2)
    rows.append((f, (float(d.mean()), int((d > 25).sum()), int(d.max()))))
print(shot, 'KUYRUK yeni-v3 (ort/ >25px / maks):', ' '.join(f'f{f}:' + ('-' if r is None else f'{r[0]:.2f}/{r[1]}/{r[2]}') for f, r in rows))
