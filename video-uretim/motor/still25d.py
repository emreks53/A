"""Camera-like move on a rendered still: 2.5D parallax from fg/bg layers (or depth),
slow dolly-in, gentle drifting window light, subtle rack-focus settle."""
import os, subprocess, math
import numpy as np, cv2
from common import *


def _load(path, alpha=False):
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if im is None:
        return None
    if im.dtype == np.uint16:
        im = (im / 257).astype(np.uint8)
    if im.ndim == 2:
        return im
    if im.shape[2] == 4:
        return im[..., [2, 1, 0, 3]] if alpha else im[..., [2, 1, 0]]
    return im[..., ::-1]


def _warp(img, s, cx, cy, ox, oy, interp=cv2.INTER_CUBIC):
    h, w = img.shape[:2]
    base = max(W / w, H / h)
    sc = base * s
    M = np.float32([[sc, 0, W / 2 - sc * cx + ox], [0, sc, H / 2 - sc * cy + oy]])
    return cv2.warpAffine(img, M, (W, H), flags=interp, borderMode=cv2.BORDER_REFLECT)


def render(spec, out_path):
    src = spec['src']
    d = os.path.dirname(src)
    full = _load(src)
    fg = _load(os.path.join(d, 'books_fg.png'), alpha=True)
    bgp = _load(os.path.join(d, 'books_bg.png'))
    h, w = full.shape[:2]
    cx, cy = w * spec.get('cx', 0.5), h * spec.get('cy', 0.5)
    dur = spec['dur']
    n = int(round(dur * FPS))
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                            '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'fast', '-crf', '10',
                            '-pix_fmt', 'yuv444p', out_path], stdin=subprocess.PIPE)
    # depth-weighted dolly on the FULL render (keeps contact shadows and reflections)
    dpath = os.path.join(d, spec.get('depth_file', '__pseudo_depth__'))  # pseudo-depth from the alpha cut-out (verified)
    dep = cv2.imread(dpath, cv2.IMREAD_UNCHANGED) if os.path.exists(dpath) else None
    if dep is not None:
        dep = dep.astype(np.float32) / (65535.0 if dep.dtype == np.uint16 else 255.0)
        if dep.ndim == 3:
            dep = dep[..., 0]
    else:
        yy0 = np.linspace(0, 1, h, dtype=np.float32)[:, None] * np.ones((1, w), np.float32)
        dep = np.clip((yy0 - 0.40) / 0.60, 0, 1) * 0.65 + 0.12 * (yy0 > 0.40)
        if fg is not None and fg.shape[2] == 4:
            a = fg[..., 3].astype(np.float32) / 255
            dep = np.maximum(dep, a * 0.92)
    dep = cv2.GaussianBlur(dep, (0, 0), 24)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # output-space depth (base framing)
    base = max(W / w, H / h)
    M0 = np.float32([[base, 0, W / 2 - base * cx], [0, base, H / 2 - base * cy]])
    dep_o = cv2.warpAffine(dep, M0, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    for i in range(n):
        u = i / max(n - 1, 1)
        e = ease_in_out_sine(u)
        s_far = mix(spec.get('z0', 1.0), spec.get('z0', 1.0) + 0.03, e)
        s_near = mix(spec.get('z0', 1.0), spec.get('z1', 1.09), e)
        s_px = s_far + (s_near - s_far) * dep_o            # per-pixel magnification
        oy = mix(0, -24, e) * dep_o                         # slight crane-down feel on near objects
        # inverse map: output pixel -> base-framed coordinate -> source pixel
        bx = W / 2 + (xx - W / 2) / s_px
        by = H / 2 + (yy - H / 2 - oy) / s_px
        mapx = ((bx - (W / 2 - base * cx)) / base).astype(np.float32)
        mapy = ((by - (H / 2 - base * cy)) / base).astype(np.float32)
        img = cv2.remap(full, mapx, mapy, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
        # drifting window light from the left (very gentle)
        lx = mix(-200, 260, e)
        light = np.exp(-(((xx - lx) / 900) ** 2 + ((yy - 1250) / 900) ** 2))
        img *= (0.94 + 0.10 * light[..., None] * np.array([1.0, 0.96, 0.88], np.float32))
        # rack-focus settle in the first 0.8 s
        rf = 1 - ease_out_cubic(clamp(i / (0.8 * FPS)))
        if rf > 0.02:
            img = cv2.GaussianBlur(img, (0, 0), 0.1 + 5 * rf)
        enc.stdin.write(np.clip(img, 0, 255).astype(np.uint8).tobytes())
    enc.stdin.close(); enc.wait()
