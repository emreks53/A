#!/usr/bin/env python3
"""Temas sayfası: bir klasördeki kare PNG'lerini zaman etiketleriyle ızgaraya dizer.
Kullanım: python3 araclar/temas.py <klasör> <çıktı.png> [sütun=6] [en=270]"""
import sys, glob, re
from PIL import Image, ImageDraw
klasor, cikti = sys.argv[1], sys.argv[2]
sutun = int(sys.argv[3]) if len(sys.argv) > 3 else 6
en = int(sys.argv[4]) if len(sys.argv) > 4 else 270
fs = sorted(glob.glob(klasor + '/*.png'))
boy = int(en * 16 / 9)
satir = (len(fs) + sutun - 1) // sutun
s = Image.new('RGB', (sutun * en, satir * (boy + 22)), 'white')
d = ImageDraw.Draw(s)
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGB').resize((en, boy))
    x, y = (i % sutun) * en, (i // sutun) * (boy + 22)
    s.paste(im, (x, y + 22))
    m = re.search(r'(\d+\.\d+)\.png$', f)
    d.text((x + 4, y + 4), m.group(1) if m else f, fill='black')
s.save(cikti)
print(cikti, len(fs))
