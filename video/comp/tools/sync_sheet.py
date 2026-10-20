"""Sync check: grab frames of an encoded cut at key words and lay them out with labels.

    python video/comp/tools/sync_sheet.py VIDEO.mp4 OUT.png [--offset 0.30] [--words shot:word[:nth],...]

For each key word, the frame at (word start + offset) is extracted from the encoded file (so A/V timing of the
container is what is checked) together with the frame 3 frames BEFORE the word (should be empty or just starting).
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.dirname(os.path.dirname(HERE))
DEFAULT = ("sh01:ihtiyaçlarının,sh02:oksijen,sh03:içmek,sh03:takdim,sh04:yetişmiyor,sh06:kan,sh07:güneş,sh10:hadsiz,"
           "sh11:ayağımıza,sh12:bir,sh13a:Haluk,sh13a:şefkatinin,sh13b:birer,sh14a:hikmetli,sh14a:her,sh14c:cansız,"
           "sh14c:izah,sh15:Sözler")


def grab(video, t, w=270, h=480):
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0, t):.4f}", "-i", video, "-frames:v", "1",
                        "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True)
    if len(r.stdout) < w * h * 3:
        return Image.new("RGB", (w, h), (60, 0, 0))
    return Image.fromarray(np.frombuffer(r.stdout[:w * h * 3], np.uint8).reshape(h, w, 3))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("out")
    ap.add_argument("--offset", type=float, default=0.30)
    ap.add_argument("--words", default=DEFAULT)
    a = ap.parse_args()
    shots = {s["id"]: s for s in json.load(open(os.path.join(VIDEO, "timing", "shots.json"), encoding="utf-8"))["shots"]}
    items = []
    for spec in a.words.split(","):
        p = spec.split(":")
        sh, wd, nth = p[0], p[1], int(p[2]) if len(p) > 2 else 0
        hits = [w for w in shots[sh]["words"] if w["w"] == wd]
        t = hits[nth]["s"]
        items.append((sh, wd, t))
    fnt = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Medium.otf", 15)
    cols = 6
    w, h = 270, 480
    pair_w = w * 2 + 4
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (pair_w + 10), rows * (h + 26)), (24, 24, 24))
    for i, (sh, wd, t) in enumerate(items):
        before = grab(a.video, t - 3 / 24)
        after = grab(a.video, t + a.offset)
        x, y = (i % cols) * (pair_w + 10), (i // cols) * (h + 26)
        sheet.paste(before, (x, y)); sheet.paste(after, (x + w + 4, y))
        ImageDraw.Draw(sheet).text((x + 4, y + h + 4), f"{wd} @ {t:.2f}s  (-3f | +{a.offset:.2f}s)", font=fnt,
                                   fill=(255, 220, 90))
    sheet.save(a.out)
    print(a.out)


if __name__ == "__main__":
    main()
