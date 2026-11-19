"""Ardışık kare farklarından hızlı hareketli kareleri bulur → out/mb.json {kare: alt_kare_sayısı}.
Önce hareket bulanıklığı OLMADAN normal render (out/kareler), sonra: python3 tools/hareket-bulanikligi.py && node tools/render.mjs --mb out/mb.json --only-mb"""
import json, os
import numpy as np
from PIL import Image
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
k = os.path.join(D, 'out', 'kareler'); fs = sorted(f for f in os.listdir(k) if f[:5].isdigit())
prev = None; diff = {}
for f in fs:
    im = np.asarray(Image.open(os.path.join(k, f)).convert('L').resize((108, 192), Image.BILINEAR), dtype=np.float32)
    i = int(f[:5])
    if prev is not None and prev[0] == i - 1: diff[i] = float(np.mean(np.abs(im - prev[1])))
    prev = (i, im)
mb = {}
F0, F1 = 81, 2043   # B..J (A ve K Blender kareleri kendi bulanıklığını taşır, bulanıklıksız render edilir)
for i in diff:
    if not (F0 <= i < F1): continue
    m = max(diff.get(i, 0), diff.get(i + 1, 0))
    # Örtücü açısı sabit (0.5 kare) olduğundan iz uzunluğu zaten hızla orantılı; eşik düşük tutulur ki
    # bulanıklık yavaş başlayan hareketlerde görünür bir anda "açılmasın". Alt kare sayısı hızla artar
    # (az alt kare = hayalet kopya).
    if m > 4: mb[i] = int(min(32, max(6, round(m * 1.6))))
json.dump(mb, open(os.path.join(D, 'out', 'mb.json'), 'w'))
print(len(mb), 'kare hareket bulanıklığı alacak; toplam alt kare', sum(mb.values()))
