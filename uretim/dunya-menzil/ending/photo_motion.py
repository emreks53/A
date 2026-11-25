"""Photo -> camera-like motion clip (2.5D parallax from a monocular depth map).

python3 ending/photo_motion.py IN.png OUT_DIR [--frames 180] [--push 0.045] [--drift 0.010]

- Depth: Depth-Anything-V2-Small (transformers). Near = larger parallax.
- Camera: slow, eased dolly-in with a slight lateral arc and sub-pixel handheld micro-drift, like a gimbal shot.
- Backward warp per frame (cv2.remap) with the source depth as target-depth proxy (small motion), so the image
  is never cut or distorted; holes cannot appear because we over-scan by a few percent.
- Light film grain identical in character to a real sensor (re-randomised per frame, very fine)."""
import sys, os, math, argparse
import numpy as np
import cv2
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--frames', type=int, default=180)
ap.add_argument('--push', type=float, default=0.045)      # total zoom-in (fraction)
ap.add_argument('--drift', type=float, default=0.010)     # lateral arc (fraction of width)
ap.add_argument('--parallax', type=float, default=0.018)  # max parallax shift for the nearest pixels (fraction)
ap.add_argument('--grain', type=float, default=2.2)
ap.add_argument('--w', type=int, default=1080); ap.add_argument('--h', type=int, default=1920)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)

img = Image.open(a.src).convert('RGB')
# fit to 9:16 by centre crop, at 1.12x output resolution for over-scan headroom
W, H = a.w, a.h
S = 1.12
tw, th = int(W * S), int(H * S)
r = max(tw / img.width, th / img.height)
img = img.resize((math.ceil(img.width * r), math.ceil(img.height * r)), Image.LANCZOS)
x0, y0 = (img.width - tw) // 2, (img.height - th) // 2
img = img.crop((x0, y0, x0 + tw, y0 + th))
src = np.asarray(img).astype(np.float32)

# depth
dpath = os.path.join(a.out, '_depth.npy')
if os.path.exists(dpath):
    depth = np.load(dpath)
else:
    from transformers import pipeline
    pipe = pipeline('depth-estimation', model='depth-anything/Depth-Anything-V2-Small-hf', device='cpu')
    d = np.asarray(pipe(img)['depth']).astype(np.float32)   # larger = nearer (relative inverse depth)
    d = cv2.resize(d, (tw, th), interpolation=cv2.INTER_CUBIC)
    d = (d - d.min()) / (d.max() - d.min() + 1e-6)
    depth = cv2.GaussianBlur(d, (0, 0), 3)
    np.save(dpath, depth)
    Image.fromarray((depth * 255).astype(np.uint8)).save(os.path.join(a.out, '_depth.png'))

ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
cx, cy = W / 2, H / 2
rng = np.random.default_rng(5)

def ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * t)

for f in range(a.frames):
    t = f / max(1, a.frames - 1)
    e = ease(t)
    zoom = 1 + a.push * e
    # lateral arc + tiny pedestal + handheld micro drift (low-frequency, sub-pixel)
    dx = a.drift * (e - 0.5) * W
    dy = -0.004 * e * H
    hx = 0.6 * math.sin(2 * math.pi * 0.11 * f / 30 + 1.3) + 0.35 * math.sin(2 * math.pi * 0.23 * f / 30)
    hy = 0.5 * math.sin(2 * math.pi * 0.09 * f / 30 + 0.4) + 0.3 * math.sin(2 * math.pi * 0.19 * f / 30 + 2)
    # output pixel -> source pixel (centred, over-scanned)
    sx = (xs - cx - hx) / zoom + tw / 2 - dx
    sy = (ys - cy - hy) / zoom + th / 2 - dy
    # parallax: nearer pixels move more with the camera (opposite to its travel) and expand more with the push
    dsamp = cv2.remap(depth, sx, sy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    par = a.parallax * (dsamp - 0.35)
    sx = sx + par * (e - 0.5) * W * 0.8 + (sx - tw / 2) * (-par * e * 0.6)
    sy = sy + (sy - th / 2) * (-par * e * 0.6)
    out = cv2.remap(src, sx, sy, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    g = cv2.GaussianBlur(rng.normal(0, a.grain, (H, W)).astype(np.float32), (0, 0), 0.6)[..., None]
    out = np.clip(out + g, 0, 255).astype(np.uint8)
    Image.fromarray(out).save(os.path.join(a.out, f'frame_{f + 1:04d}.png'), compress_level=1)
    if f % 30 == 0:
        print('frame', f + 1, flush=True)
print('done', a.frames)
