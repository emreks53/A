# -*- coding: utf-8 -*-
"""Kamera, yerleştirme ve birleştirme (yoğunluk uzayında), kâğıt, kenar ve son renk."""
import math
import numpy as np
import cv2
from wc import (PAPER_LIN, lin2srgb, srgb2lin, hex2rgb, fbm, gnorm, tooth_map, blur, blur_big, sstep)

W, H = 1080, 1920


def mat_T(x, y):
    return np.array([[1, 0, x], [0, 1, y], [0, 0, 1]], np.float64)


def mat_R(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], np.float64)


def mat_S(sx, sy=None):
    if sy is None:
        sy = sx
    return np.array([[sx, 0, 0], [0, sy, 0], [0, 0, 1]], np.float64)


class Cam:
    def __init__(self, x=W / 2, y=H / 2, zoom=1.0, rot=0.0):
        self.x, self.y, self.zoom, self.rot = x, y, zoom, rot

    def M(self):
        return mat_T(W / 2, H / 2) @ mat_R(self.rot) @ mat_S(self.zoom) @ mat_T(-self.x, -self.y)


class ScreenPaper:
    def __init__(self, seed=7):
        r = np.random.default_rng(seed)
        self.tooth = tooth_map(H, W, seed, 1.0)
        t = blur(self.tooth, 0.7)
        gx = cv2.Sobel(t, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(t, cv2.CV_32F, 0, 1, ksize=3)
        emb = -(gx * 0.7 + gy * 0.7)
        emb = emb / (np.abs(emb).max() + 1e-6)
        low = gnorm(fbm(H, W, 420, 3, 0.5, seed + 3)) - 0.5
        fib = gnorm(fbm(H, W, 1.2, 1, 0.5, seed + 9)) - 0.5
        self.shade = (1.0 + 0.055 * emb + 0.012 * low + 0.012 * fib).astype(np.float32)
        # deckle kenar maskesi (boyalı alan çerçevesi)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.minimum(np.minimum(xx, W - 1 - xx), np.minimum(yy, H - 1 - yy))
        nz = (fbm(H, W, 140, 4, 0.55, seed + 21) - 0.5) * 70 + (fbm(H, W, 22, 2, 0.5, seed + 22) - 0.5) * 16
        margin = 34.0
        self.border = sstep(margin - 4, margin + 10, d + nz).astype(np.float32)
        self.border_rim = np.clip(self.border - blur(self.border, 3.0), 0, 1) * 1.4


class Frame:
    def __init__(self, cam=None):
        self.D = np.zeros((H, W, 3), np.float32)
        self.cam = cam or Cam()
        self.off = (0.0, 0.0)

    def place(self, el, x, y, rot=0.0, sx=1.0, sy=None, op=1.0, pd=1.0, pw=1.0, mode='over', parent=None,
              cam=True, tint=None, dens=1.0, DA=None):
        """Öğeyi dünyada (x,y) noktasına yerleştir (pivot oraya gelir)."""
        if op <= 0.002:
            return
        if sy is None:
            sy = sx
        if DA is None:
            D, A = el.state(pd, pw)
        else:
            D, A = DA
        s = el.s
        px, py = el.pivot
        Mtl = np.array([[1 / s, 0, -px], [0, 1 / s, -py], [0, 0, 1]], np.float64)
        Mlw = mat_T(x, y) @ mat_R(rot) @ mat_S(sx, sy)
        M = Mlw @ Mtl
        if parent is not None:
            M = parent @ M
        if cam:
            M = mat_T(*self.off) @ self.cam.M() @ M
        self._warp(D, A, M, op, mode, tint, dens)

    def _warp(self, D, A, M, op, mode, tint, dens):
        th, tw = A.shape
        # ölçek: küçültmede örtüşme önleme
        sc = math.sqrt(abs(np.linalg.det(M[:2, :2])))
        if sc < 0.7:
            f = max(1, int(math.floor(0.85 / sc)))
            if f >= 2:
                nw, nh = max(2, tw // f), max(2, th // f)
                D = cv2.resize(D, (nw, nh), interpolation=cv2.INTER_AREA)
                A = cv2.resize(A, (nw, nh), interpolation=cv2.INTER_AREA)
                M = M @ mat_S(tw / nw, th / nh)
                th, tw = nh, nw
        corners = np.array([[0, 0, 1], [tw, 0, 1], [0, th, 1], [tw, th, 1]], np.float64).T
        sc_ = M @ corners
        x0 = int(max(0, math.floor(sc_[0].min()) - 2))
        x1 = int(min(W, math.ceil(sc_[0].max()) + 2))
        y0 = int(max(0, math.floor(sc_[1].min()) - 2))
        y1 = int(min(H, math.ceil(sc_[1].max()) + 2))
        if x1 <= x0 or y1 <= y0:
            return
        Mr = mat_T(-x0, -y0) @ M
        DA = np.concatenate([D, A[..., None]], 2).astype(np.float32)
        out = cv2.warpAffine(DA, Mr[:2], (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR,
                             borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        Dw = out[..., :3] * (op * dens)
        if tint is not None:
            Dw = Dw * tint[None, None, :]
        a = np.clip(out[..., 3] * op, 0, 1)[..., None]
        R = self.D[y0:y1, x0:x1]
        if mode == 'over':
            R *= (1 - a)
            R += Dw
        elif mode == 'add':
            R += Dw
        elif mode == 'erase':  # açma (kâğıdı geri getir)
            R *= (1 - a)

    def add_screen(self, D, A=None, mode='over'):
        if A is None:
            self.D += D
        else:
            self.D *= (1 - A[..., None])
            self.D += D


def finalize(D, paper, border=True, vignette=0.035):
    if border:
        D = D * paper.border[..., None] + D * paper.border_rim[..., None] * 0.35
    lin = PAPER_LIN[None, None, :] * np.exp(-D) * paper.shade[..., None]
    if vignette > 0:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2)
        lin = lin * (1 - vignette * np.clip(r - 0.55, 0, 1)[..., None])
    return lin


def to_u8(lin):
    return (lin2srgb(lin) * 255.0 + 0.5).astype(np.uint8)


# ---------------------------------------------------------------- geçiş maskeleri
class WipeField:
    """Islak fırça silmesi: yönlü, loblu kenarlı bir varış alanı."""

    def __init__(self, angle=0.35, seed=3, lobes=1.0):
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = (xx - W / 2) * math.cos(angle) + (yy - H / 2) * math.sin(angle)
        d = (d - d.min()) / (np.ptp(d) + 1e-6)
        n = (fbm(H, W, 260, 4, 0.55, seed) - 0.5) * 0.22 * lobes + (fbm(H, W, 40, 2, 0.5, seed + 1) - 0.5) * 0.05
        self.T = (d * 0.86 + 0.07 + n).astype(np.float32)

    def mask(self, p, soft=0.012):
        m = sstep(-soft, soft, p - self.T)
        rim = np.exp(-((p - self.T) / 0.018) ** 2) * (p > 0.001) * (p < 0.999)
        return m.astype(np.float32), rim.astype(np.float32)


class RadialField:
    def __init__(self, cx, cy, seed=4, lobes=1.0):
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.hypot(xx - cx, yy - cy)
        d = d / d.max()
        a = np.arctan2(yy - cy, xx - cx)
        n = np.zeros_like(d)
        r = np.random.default_rng(seed)
        for k, amp in ((3, .05), (5, .04), (8, .03), (13, .02)):
            n += amp * np.sin(k * a + r.uniform(0, 6.28))
        n += (fbm(H, W, 120, 3, .5, seed) - .5) * 0.08
        self.T = (d * 0.92 + 0.04 + n * lobes * d).astype(np.float32)

    def mask(self, p, soft=0.012):
        m = sstep(-soft, soft, p - self.T)
        rim = np.exp(-((p - self.T) / 0.016) ** 2) * (p > 0.001) * (p < 0.999)
        return m.astype(np.float32), rim.astype(np.float32)
