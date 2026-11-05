#!/usr/bin/env python3
"""Kontak baskisi: python3 kontak.py intro|outro  -> out/blender/contact_<shot>.jpg (yaklasik her 10. kare)."""
import os, sys, glob
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, '..', 'out', 'blender'))
FONT = os.path.abspath(os.path.join(HERE, '..', 'fonts', 'Cinzel-600.ttf'))
T0 = {'intro': 0.0, 'outro': 68.10}

def main(shot):
    fs = sorted(glob.glob(os.path.join(OUT, shot, '*.png')))
    if not fs:
        print('kare yok'); return
    pick = fs[::10]
    if fs[-1] not in pick:
        pick.append(fs[-1])
    tw, th = 216, 384
    cols = 7 if len(pick) > 9 else len(pick)
    rows = (len(pick) + cols - 1) // cols
    pad, lab = 6, 26
    sheet = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + lab + pad) + pad), (18, 16, 15))
    d = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(FONT, 15)
    for i, f in enumerate(pick):
        n = int(os.path.splitext(os.path.basename(f))[0])
        im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
        x = pad + (i % cols) * (tw + pad)
        y = pad + (i // cols) * (th + lab + pad)
        sheet.paste(im, (x, y))
        d.text((x + 4, y + th + 4), f'{shot} {n:04d}  t={T0[shot] + n / 30:.2f}s', font=font, fill=(220, 200, 170))
    p = os.path.join(OUT, f'contact_{shot}.jpg')
    sheet.save(p, quality=90)
    print(p, len(fs), 'kare')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'intro')
