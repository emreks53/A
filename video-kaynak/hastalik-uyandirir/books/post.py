#!/usr/bin/env python3
"""Post-processing with the system python (Pillow + numpy; ImageMagick for exact 16->8 bit).
  python3 post.py depth   <workdir>  -> books_depth.png (16-bit grey, near = white) + books_depth_8bit.png
  python3 post.py preview <workdir>  -> books_final_8bit.png (8-bit sRGB) + books_preview.jpg (540x960)
"""
import sys, os, subprocess
import numpy as np
from PIL import Image

mode, wd = sys.argv[1], sys.argv[2]
if mode == 'depth':
    d = np.clip(np.load(os.path.join(wd, 'tex', 'depth_norm.npy')), 0, 1)
    a16 = np.round(d * 65535).astype(np.uint16)
    Image.fromarray(a16, mode='I;16').save(os.path.join(wd, 'books_depth.png'))
    a8 = np.round(d * 255).astype(np.uint8)
    Image.fromarray(a8, mode='L').save(os.path.join(wd, 'books_depth_8bit.png'))
    print('depth png', a16.shape, int(a16.min()), int(a16.max()))
elif mode == 'preview':
    src = os.path.join(wd, 'books_final.png')
    out8 = os.path.join(wd, 'books_final_8bit.png')
    # the 16-bit PNG is already display-referred sRGB (AgX view transform); just requantise to 8 bit
    subprocess.run(['convert', src, '-depth', '8', '-define', 'png:color-type=2', out8], check=True)
    im = Image.open(out8).convert('RGB')
    im.resize((540, 960), Image.LANCZOS).save(os.path.join(wd, 'books_preview.jpg'), quality=92)
    print('8-bit + preview written', im.size)
