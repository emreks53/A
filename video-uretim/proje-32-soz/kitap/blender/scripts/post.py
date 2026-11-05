#!/usr/bin/env python3
"""Photographic finishing + deliverable conversion (system python: numpy, PIL, opencv).

  post.py full  in.png out.png      lens vignette + subtle highlight bloom + fine luminance grain
  post.py fg    in.png out.png      same vignette on RGB (alpha untouched, straight alpha), no grain
  post.py bg    in.png out.png      same vignette, no grain
  post.py depth in.npy out.png      16-bit normalised depth, near = white (prints z range)
  post.py bbox  fg.png              pixel bounding box of alpha > 0.5
"""
import sys

import cv2
import numpy as np
from PIL import Image


def s2l(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def l2s(x):
    x = np.clip(x, 0, None)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def vignette(h, w, strength=0.42, power=2.2):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = (w - 1) / 2, (h - 1) / 2
    # normalise by the half-diagonal so corners reach r = 1
    r = np.sqrt(((xx - cx) / (h / 2)) ** 2 + ((yy - cy) / (h / 2)) ** 2) / np.sqrt((w / h) ** 2 + 1)
    return (1.0 - strength * np.clip(r, 0, 1) ** power).astype(np.float32)


def finish(rgb, grain=True, bloom=True, seed=3):
    h, w = rgb.shape[:2]
    lin = s2l(rgb.astype(np.float32) / 255.0)
    lin *= vignette(h, w)[..., None]
    if bloom:
        lum = lin.mean(axis=2, keepdims=True)
        hi = np.clip(lin - 0.55, 0, None) * (lum > 0.55)
        glow = cv2.GaussianBlur(hi, (0, 0), sigmaX=w * 0.012)
        lin = lin + 0.18 * glow
    out = l2s(lin)
    if grain:
        rng = np.random.default_rng(seed)
        g = rng.normal(0, 1, (h, w)).astype(np.float32)
        g = cv2.GaussianBlur(g, (0, 0), 0.6)
        g /= g.std()
        # grain slightly stronger in the mid-tones, like film/sensor noise after tone mapping
        L = out.mean(axis=2)
        amp = (0.006 + 0.006 * np.sin(np.clip(L, 0, 1) * np.pi)).astype(np.float32)
        out = out + (g * amp)[..., None]
    return np.clip(out * 255.0 + 0.5, 0, 255).astype(np.uint8)


def main():
    mode = sys.argv[1]
    if mode in ("full", "bg"):
        im = np.asarray(Image.open(sys.argv[2]).convert("RGB"))
        Image.fromarray(finish(im, grain=(mode == "full"), bloom=True)).save(sys.argv[3], optimize=True)
    elif mode == "fg":
        im = np.asarray(Image.open(sys.argv[2]).convert("RGBA"))
        rgb = finish(im[..., :3], grain=False, bloom=False)
        Image.fromarray(np.dstack([rgb, im[..., 3]])).save(sys.argv[3], optimize=True)
    elif mode == "depth":
        z = np.load(sys.argv[2]).astype(np.float64)
        z = np.where(np.isfinite(z) & (z < 1e5), z, np.nan)
        zmin, zmax = np.nanmin(z), np.nanmax(z)
        zz = np.nan_to_num(z, nan=zmax)
        d = (zmax - zz) / (zmax - zmin)          # near = 1 (white)
        cv2.imwrite(sys.argv[3], np.clip(d * 65535 + 0.5, 0, 65535).astype(np.uint16))
        print("depth_min_m %.4f depth_max_m %.4f" % (zmin, zmax))
        if len(sys.argv) > 4:   # optional inverse-depth (disparity) version, near = white
            inv = (1 / zz - 1 / zmax) / (1 / zmin - 1 / zmax)
            cv2.imwrite(sys.argv[4], np.clip(inv * 65535 + 0.5, 0, 65535).astype(np.uint16))
    elif mode == "bbox":
        a = np.asarray(Image.open(sys.argv[2]).convert("RGBA"))[..., 3]
        ys, xs = np.where(a > 127)
        print("bbox x0=%d y0=%d x1=%d y1=%d (w=%d h=%d) of %dx%d" % (xs.min(), ys.min(), xs.max(), ys.max(),
              xs.max() - xs.min() + 1, ys.max() - ys.min() + 1, a.shape[1], a.shape[0]))


if __name__ == "__main__":
    main()
