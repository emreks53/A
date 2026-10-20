"""Overlay QA: composite rendered overlay frames over representative backgrounds and save viewable PNGs.

    python video/comp/qa.py --frames 100,215,780 [--bg-dir DIR ...] [--scale 1] [--out DIR] [--half] [--sheet]

Background per frame: the review still of that shot nearest in time (<shot>_t<sec>.png searched recursively
in --bg-dir), else a neutral photographic-ish gradient. Overlays are rendered on demand (overlays.ensure).
Writes <out>/qa_<frame>.png (and qa_sheet.png with --sheet).
"""
import argparse
import glob
import os
import re
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import overlays as OV  # noqa: E402

from PIL import Image, ImageDraw, ImageFont  # noqa: E402


def find_stills(dirs):
    out = {}
    for d in dirs:
        for p in glob.glob(os.path.join(d, "**", "*.png"), recursive=True):
            m = re.match(r"(sh\d+[a-c]?)_t(\d+\.\d+)\.png$", os.path.basename(p))
            if m:
                out.setdefault(m.group(1), []).append((float(m.group(2)), p))
    return out


def shot_of(f, shots):
    for s in shots["shots"]:
        if s["cut_f0"] <= f < s["cut_f1"]:
            return s
    return shots["shots"][-1]


def background(f, shots, stills, size):
    s = shot_of(f, shots)
    t = f / 24
    cands = stills.get(s["id"], [])
    if cands:
        tt, p = min(cands, key=lambda c: abs(c[0] - t))
        im = Image.open(p).convert("RGB").resize(size, Image.LANCZOS)
        return np.asarray(im).astype(np.float32) / 255, f"{s['id']} still t={tt:.2f}"
    w, h = size
    y = np.linspace(0, 1, h)[:, None]
    g = np.concatenate([0.10 + 0.25 * (1 - y), 0.11 + 0.22 * (1 - y), 0.13 + 0.2 * (1 - y)], 1)
    return np.repeat(g[:, None, :], w, 1).astype(np.float32), f"{s['id']} (no still)"


def comp(bg, paths, scale):
    """Same overlay path as the compositor (legibility darkening, OVER, screen-add), on a display-space bg."""
    import composite as CP
    ed = OV.load_json(os.path.join(OV.HERE, "edit.json"))
    img, _ = CP.apply_overlay(bg.copy(), paths, bg.shape[1], bg.shape[0], ed["finish"]["legibility"], scale,
                              ed["finish"].get("overlay_glow"))
    return np.clip(img, 0, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", required=True)
    ap.add_argument("--bg-dir", action="append", default=[])
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--out", default=os.path.join(OV.OUT, "qa"))
    ap.add_argument("--half", action="store_true", help="save at 50%% size")
    ap.add_argument("--crop", default=None, help="x0,y0,x1,y1 crop in 1080x1920 space")
    ap.add_argument("--sheet", action="store_true")
    ap.add_argument("--label", action="store_true")
    a = ap.parse_args()
    frames = []
    for r in a.frames.split(","):
        if "-" in r:
            x, y = r.split("-"); st = 1
            if ":" in y:
                y, st = y.split(":")
            frames += list(range(int(x), int(y) + 1, int(st)))
        else:
            frames.append(int(r))
    os.makedirs(a.out, exist_ok=True)
    shots = OV.shots_table()
    dirs = a.bg_dir or [os.path.join(OV.SCRATCH, "director", "rev"), os.path.join(OV.OUT, "previews"),
                        os.path.join(OV.SCRATCH, "qa_bg")]
    stills = find_stills(dirs)
    man = OV.ensure(0, 0, a.scale, frames=frames, quiet=True)
    size = (round(1080 * a.scale), round(1920 * a.scale))
    outs = []
    for f in frames:
        bg, desc = background(f, shots, stills, size)
        img = comp(bg, OV.frame_paths(man, f), a.scale)
        im = Image.fromarray((img * 255 + 0.5).astype(np.uint8))
        if a.crop:
            x0, y0, x1, y1 = [int(float(v) * a.scale) for v in a.crop.split(",")]
            im = im.crop((x0, y0, x1, y1))
        if a.half:
            im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
        if a.label:
            d = ImageDraw.Draw(im)
            fnt = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Medium.otf", 18)
            d.text((8, im.height - 26), f"f{f} t={f / 24:.2f} {desc}", fill=(255, 255, 0), font=fnt)
        p = os.path.join(a.out, f"qa_{f:05d}.png")
        im.save(p)
        outs.append(p)
        print(p)
    if a.sheet and outs:
        ims = [Image.open(p) for p in outs]
        n = len(ims); cols = min(n, 6); rows = (n + cols - 1) // cols
        w, h = ims[0].size
        sh = Image.new("RGB", (cols * w + (cols - 1) * 6, rows * h + (rows - 1) * 6), (30, 30, 30))
        for i, im in enumerate(ims):
            sh.paste(im, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
        p = os.path.join(a.out, "qa_sheet.png")
        sh.save(p)
        print(p)


if __name__ == "__main__":
    main()
