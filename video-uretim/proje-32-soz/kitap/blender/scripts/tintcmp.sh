#!/bin/bash
# tintcmp.sh OUTNAME "r,g,b" "r,g,b" "r,g,b" ...  -> side-by-side half-res crops under the current final light
cd ${VIDEO_ROOT:-$HOME/video-calisma}/blender
OUT=$1; shift
names=""
for T in "$@"; do
  n=tint_$(echo $T | tr , _)
  ./blender-4.5.15-linux-x64/blender -b -P scripts/build_scene.py -- --mode beauty --tint $T --res 675x1200 --border 0.08,0.08,0.92,0.56 --samples 16 --out tests/$n.png 2>&1 | grep -E "Error|Traceback"
  names="$names $n"
done
python3 - $OUT $names <<'PY'
import sys, colorsys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
out, names = sys.argv[1], sys.argv[2:]
ims = [Image.open('tests/%s.png' % n).convert('RGB') for n in names]
w, h = ims[0].size
f = ImageFont.truetype('../fonts/Marcellus-400-normal.ttf', 18)
canvas = Image.new('RGB', (len(ims) * (w + 10) - 10, h + 36), (20, 16, 14))
d = ImageDraw.Draw(canvas)
for i, (im, n) in enumerate(zip(ims, names)):
    canvas.paste(im, (i * (w + 10), 0))
    x = np.asarray(im).astype(float)
    c = x[250:270, 60:200].reshape(-1, 3).mean(0)
    hh, l, s = colorsys.rgb_to_hls(*(c / 255))
    lab = '%s  albedo (%s)  ->  render (%d,%d,%d)' % ('ABCDE'[i], n[5:].replace('_', ','), *c.round())
    d.text((i * (w + 10) + 8, h + 8), lab, font=f, fill=(235, 225, 210))
    print(lab, 'hue %.1f L %.2f S %.2f' % (hh * 360, l, s))
canvas.save('tests/%s.png' % out)
PY
