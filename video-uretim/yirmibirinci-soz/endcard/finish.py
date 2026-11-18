#!/usr/bin/env python3
"""
Camera finishing for the source-card plate (reference implementation, numpy + pillow).

The plates in plates/ are deliberately CLEAN (no grain, no vignette): a frozen, noise-free still inside a 30 fps
video reads as CG at once, and a smooth cream wall bands after 8-bit H.264.  Apply this at the DELIVERY size
(1080 x 1920), after the relight / cross-fade and after any push-in, once per output frame, with the frame number:

    python3 finish.py plates/preview_1080.jpg plates/preview_1080_finished.jpg --frame 0
    python3 finish.py in_%04d.png out_%04d.png --frames 0-89          # a sequence: new grain every frame

    from finish import finish                                          # float sRGB (H, W, 3) in 0..1  ->  uint8
    out = finish(img, frame=n)

What it does, in this order (all numbers are for 1080 x 1920; they scale with the image width):
  1. lens softening         gaussian sigma 0.6 px (in display-linear light)
  2. lateral chromatic ab.  red x (1 + 0.075 %), blue x (1 - 0.075 %) about the image centre (0.15 % in total);
                            the channels are edge-padded before the resampling, so no coloured line appears on the
                            frame edges (check_edges() asserts that rows / columns 0 and N-1 stay within 3 levels
                            of their neighbours)
  3. halation / bloom       values above 0.9 (display) glow: gaussian sigma 12 px, 4 %, slightly warm
  4. vignette               -0.25 EV in the corners, smooth (r^2.2)
  5. grain (per frame)      luminance grain ~1.3 px, sigma 1.3/255 in the mid-tones (1.6 shadows, 0.6 highlights)
                            + chroma grain 0.4/255; a new seed every frame (seed = base + frame)
The grain also dithers the 8-bit quantisation.  The optional slow push-in (0.3 % over the shot, or the 1.10 x move
described in README.md) is a 2D transform of the 1.25 x plate and belongs before this step.
"""
import argparse
import os

import numpy as np
from PIL import Image


def _s2l(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def _l2s(c):
    c = np.clip(c, 0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def _gauss(a, sigma):
    """Separable gaussian blur, edge padded; a is (H, W) or (H, W, C) float32."""
    if sigma <= 0.05:
        return a
    r = int(np.ceil(sigma * 3))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2).astype(np.float32)
    k /= k.sum()
    pw = ((r, r), (0, 0)) + ((0, 0),) * (a.ndim - 2)
    p = np.pad(a, pw, mode='edge')
    out = np.zeros_like(a)
    for i, w in enumerate(k):
        out += w * p[i:i + a.shape[0]]
    pw = ((0, 0), (r, r)) + ((0, 0),) * (a.ndim - 2)
    p = np.pad(out, pw, mode='edge')
    out = np.zeros_like(a)
    for i, w in enumerate(k):
        out += w * p[:, i:i + a.shape[1]]
    return out


def _scale_about_centre(ch, s, pad=4):
    """Resample one channel scaled by s about the image centre (bicubic).  The channel is edge-padded first and
    cropped afterwards, so a scale below 1 never samples outside the picture (PIL would fill that with 0 and leave a
    one-pixel coloured line on the frame edge)."""
    h, w = ch.shape
    p = np.pad(ch.astype(np.float32), pad, mode='edge')
    im = Image.fromarray(p, mode='F')
    cx, cy = (w - 1) / 2 + pad, (h - 1) / 2 + pad
    # PIL affine maps output -> input:  x_in = a x + b y + c
    a = 1 / s
    out = np.asarray(im.transform((w + 2 * pad, h + 2 * pad), Image.AFFINE, (a, 0, cx - a * cx, 0, a, cy - a * cy),
                                  resample=Image.BICUBIC), np.float32)
    return out[pad:pad + h, pad:pad + w]


def check_edges(out, tol=3.0):
    """Raise if the first / last row or column differs from its neighbour by more than `tol` 8-bit levels (mean per
    channel): the guard against edge artefacts of the resampling steps.  Returns the worst difference."""
    o = np.asarray(out, np.float32)
    pairs = [(o[0], o[1]), (o[-1], o[-2]), (o[:, 0], o[:, 1]), (o[:, -1], o[:, -2])]
    worst = max(float(np.abs(a.mean(0) - b.mean(0)).max()) for a, b in pairs)
    if worst > tol:
        raise AssertionError('finish.py: frame edge differs from its neighbour by %.1f levels' % worst)
    return worst


def finish(img, frame=0, seed=2100, soften=0.6, ca=0.0015, bloom=0.04, bloom_sigma=12.0, bloom_thr=0.9,
           vignette_ev=0.25, grain=1.3, grain_shadow=1.6, grain_high=0.6, grain_size=1.3, chroma=0.4):
    """img: float sRGB (H, W, 3) in 0..1.  Returns uint8 (H, W, 3)."""
    img = np.asarray(img, np.float32)
    h, w = img.shape[:2]
    k = w / 1080.0                                  # all pixel sizes are given for a 1080-wide frame
    lin = _s2l(img).astype(np.float32)
    if soften > 0:
        lin = _gauss(lin, soften * k)
    if ca > 0:
        lin[..., 0] = _scale_about_centre(lin[..., 0], 1 + ca / 2)
        lin[..., 2] = _scale_about_centre(lin[..., 2], 1 - ca / 2)
    if bloom > 0:
        t = float(_s2l(np.float32(bloom_thr)))
        hi = np.clip((lin - t) / (1 - t), 0, None)
        glow = _gauss(hi.max(-1), bloom_sigma * k)
        lin = lin + bloom * glow[..., None] * np.array([1.0, 0.93, 0.82], np.float32)
    if vignette_ev > 0:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        r = np.hypot((xx - (w - 1) / 2) / (w / 2), (yy - (h - 1) / 2) / (h / 2)) / np.sqrt(2.0)   # 1 in the corners
        lin = lin * (2.0 ** (-vignette_ev * r ** 2.2))[..., None]
    out = _l2s(lin).astype(np.float32)
    if grain > 0 or chroma > 0:
        rng = np.random.default_rng(seed + int(frame))
        sg = max(0.01, (grain_size * k - 1.0) * 0.6 + 0.35)       # blur that gives ~grain_size px clumps

        def field(ch=None):
            n = rng.standard_normal((h, w) if ch is None else (h, w, ch)).astype(np.float32)
            n = _gauss(n, sg)
            return n / n.std()
        lum = out @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        amp = np.interp(lum, [0.0, 0.12, 0.5, 0.85, 1.0], [grain_shadow, grain_shadow, grain, grain_high, grain_high * 0.8])
        out = out + (field() * amp / 255.0)[..., None]
        if chroma > 0:
            c = field(3)
            c -= c.mean(-1, keepdims=True)
            out = out + c * (chroma / 255.0)
    out8 = np.clip(out * 255.0 + 0.5, 0, 255).astype(np.uint8)
    check_edges(out8)
    return out8


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src', help='image, or a printf pattern (in_%%04d.png) with --frames')
    ap.add_argument('dst')
    ap.add_argument('--frame', type=int, default=0)
    ap.add_argument('--frames', default='', help='a-b: process a numbered sequence')
    ap.add_argument('--size', default='', help='WxH: Lanczos-resize the input first (e.g. 1080x1920)')
    ap.add_argument('--no-grain', action='store_true')
    a = ap.parse_args()
    frames = [a.frame]
    if a.frames:
        f0, f1 = (int(v) for v in a.frames.split('-'))
        frames = list(range(f0, f1 + 1))
    for n in frames:
        src = a.src % n if '%' in a.src else a.src
        dst = a.dst % n if '%' in a.dst else a.dst
        im = Image.open(src).convert('RGB')
        if a.size:
            W, H = (int(v) for v in a.size.lower().split('x'))
            im = im.resize((W, H), Image.LANCZOS)
        out = finish(np.asarray(im, np.float32) / 255.0, frame=n, **(dict(grain=0, chroma=0) if a.no_grain else {}))
        kw = dict(quality=96, subsampling=0) if os.path.splitext(dst)[1].lower() in ('.jpg', '.jpeg') else {}
        Image.fromarray(out).save(dst, **kw)


if __name__ == '__main__':
    main()
