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
for i in diff:
    m = max(diff.get(i, 0), diff.get(i + 1, 0))
    # Az alt kare "hayalet kopya" üretir: ya hiç bulanıklık yok ya da bol alt kare (yumuşak geçişli)
    if m > 14: mb[i] = int(min(32, max(16, round(m * 1.1))))
    elif m > 10: mb[i] = 10
json.dump(mb, open(os.path.join(D, 'out', 'mb.json'), 'w'))
print(len(mb), 'kare hareket bulanıklığı alacak; toplam alt kare', sum(mb.values()))
