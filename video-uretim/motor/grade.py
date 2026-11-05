"""Unified cinematic finishing: per-shot normalisation, filmic curve, split toning,
bloom, vignette + soft text scrim, animated film grain."""
import numpy as np, cv2
from common import *


def _filmic_curve(x):
    # gentle S-curve with lifted blacks and soft highlight roll-off
    x = np.clip(x, 0, None)
    a = x / (x + 0.18) * 1.18          # rational shoulder
    a = np.clip(a, 0, 1)
    s = a * a * (3 - 2 * a)            # smoothstep for contrast in mids
    y = 0.55 * a + 0.45 * s
    return 0.028 + 0.955 * y


class Grader:
    def __init__(self, seed=7):
        xs = np.arange(256, dtype=np.float32) / 255.0
        self.base = xs
        # vignette + scrim map
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        nx = (xx - W / 2) / (W / 2)
        ny = (yy - H * 0.48) / (H / 2)
        r = np.sqrt(nx ** 2 * 0.9 + ny ** 2 * 0.62)
        vig = 1 - 0.34 * np.clip((r - 0.45) / 0.85, 0, 1) ** 1.6
        # soft darkening behind the gloss area (no box: a wide smooth falloff)
        scrim = 1 - 0.20 * np.exp(-((yy - 1300) / 210) ** 2)
        top = 1 - 0.12 * np.clip((380 - yy) / 380, 0, 1) ** 1.5
        self.mult = (vig * scrim * top).astype(np.float32)[..., None]
        rng = np.random.default_rng(seed)
        self.grain = []
        for i in range(8):
            g = rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32)
            g = cv2.resize(g, (W, H), interpolation=cv2.INTER_CUBIC)
            g = cv2.GaussianBlur(g, (0, 0), 0.6)
            self.grain.append(g)

    def shot_lut(self, p):
        """Per-shot 1D LUTs (exposure, white balance, contrast) fused with the global filmic curve
        and split toning. p: dict(exposure, wb=(r,g,b), contrast, lift)."""
        key = (p.get('exposure', 0), tuple(p.get('wb', (1, 1, 1))), p.get('contrast', 1.0), p.get('lift', 0.0))
        if not hasattr(self, '_lc'):
            self._lc = {}
        if key in self._lc:
            return self._lc[key]
        xs = self.base
        lin_ = np.power(xs, 2.2)
        luts = []
        warm = np.array([1.035, 1.0, 0.94])
        cool = np.array([0.95, 1.0, 1.045])
        for ch in range(3):
            v = lin_ * (2 ** p.get('exposure', 0)) * p.get('wb', (1, 1, 1))[ch]
            v = np.power(np.clip(v, 0, None), 1 / 2.2)
            c = p.get('contrast', 1.0)
            v = 0.5 + (v - 0.5) * c
            v = _filmic_curve(np.power(np.clip(v, 0, None), 2.2) * 1.05)
            # split tone: shadows slightly cool-teal, highlights warm gold
            wsh = np.clip(1 - v / 0.45, 0, 1)
            whl = np.clip((v - 0.5) / 0.5, 0, 1)
            v = v * (1 + (cool[ch] - 1) * wsh * 0.9) * (1 + (warm[ch] - 1) * whl)
            v = v + p.get('lift', 0.0)
            luts.append(np.clip(v * 255 + 0.5, 0, 255).astype(np.uint8))
        lut = np.stack(luts, axis=1)[:, None, :]  # 256x1x3
        self._lc[key] = lut
        return lut

    def apply(self, img, p, frame_idx, sat=None, bloom=0.22, grain=3.2, finish=True):
        """img: HxWx3 uint8 RGB. Returns uint8."""
        lut = self.shot_lut(p)
        out = cv2.LUT(img, lut)
        s = p.get('sat', 0.94) if sat is None else sat
        f = out.astype(np.float32)
        if abs(s - 1) > 1e-3:
            l = f[..., 0:1] * 0.2126 + f[..., 1:2] * 0.7152 + f[..., 2:3] * 0.0722
            f = l + (f - l) * s
        if bloom > 0:
            small = cv2.resize(f, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
            hi = np.clip(small - 165, 0, None)
            b1 = cv2.GaussianBlur(hi, (0, 0), 6)
            b2 = cv2.GaussianBlur(hi, (0, 0), 22)
            b = cv2.resize(b1 * 0.6 + b2 * 0.9, (W, H), interpolation=cv2.INTER_LINEAR)
            b *= np.array([1.0, 0.93, 0.80], np.float32)  # warm bloom
            f = f + b * bloom
        if finish:
            f = f * self.mult
            f += self.grain[frame_idx % 8][..., None] * grain
        return np.clip(f, 0, 255).astype(np.uint8)

    def finish(self, img, frame_idx, grain=3.2):
        f = img.astype(np.float32) * self.mult
        f += self.grain[frame_idx % 8][..., None] * grain
        return np.clip(f, 0, 255).astype(np.uint8)


def _look(self, img, p):
    if p.get('raw'):
        # photographic plate already finished in its own renderer: only gentle trims
        f = img.astype(np.float32) * (2 ** p.get('exposure', 0)) * np.array(p.get('wb', (1, 1, 1)), np.float32)
        s = p.get('sat', 1.0)
        if abs(s - 1) > 1e-3:
            l = f[..., 0:1] * 0.2126 + f[..., 1:2] * 0.7152 + f[..., 2:3] * 0.0722
            f = l + (f - l) * s
        return np.clip(f, 0, 255).astype(np.uint8)
    out = cv2.LUT(img, self.shot_lut(p))
    s = p.get('sat', 0.94)
    if abs(s - 1) > 1e-3:
        f = out.astype(np.float32)
        l = f[..., 0:1] * 0.2126 + f[..., 1:2] * 0.7152 + f[..., 2:3] * 0.0722
        f = l + (f - l) * s
        out = np.clip(f, 0, 255).astype(np.uint8)
    return out


def _post(self, img, frame_idx, bloom=0.22, grain=2.3):
    f = img.astype(np.float32)
    if bloom > 0:
        small = cv2.resize(f, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        hi = np.clip(small - 165, 0, None)
        b1 = cv2.GaussianBlur(hi, (0, 0), 6)
        b2 = cv2.GaussianBlur(hi, (0, 0), 22)
        b = cv2.resize(b1 * 0.6 + b2 * 0.9, (W, H), interpolation=cv2.INTER_LINEAR)
        b *= np.array([1.0, 0.93, 0.80], np.float32)
        f += b * bloom
    f *= self.mult
    f += self.grain[frame_idx % 8][..., None] * grain
    return np.clip(f, 0, 255).astype(np.uint8)


Grader.look = _look
Grader.post = _post
