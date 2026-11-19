# -*- coding: utf-8 -*-
"""Film zaman çizelgesi: sahneler, ıslak-silme geçişleri, lügat katmanı, kare üretimi."""
import math, os, sys, time, importlib
import numpy as np
import cv2
from comp import Frame, ScreenPaper, finalize, to_u8, W, H, Cam, WipeField, RadialField
from wc import lin2srgb, srgb2lin, ramp, ease, sstep, pig
from gloss import Glosses

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
END = 43.0

# (modül, başlangıç, bitiş) — bitişler geçişlerle örtüşür
SEGMENTS = [
    ('sc_han', 0.0, 7.05),
    ('sc_road', 6.6, 9.45),
    ('sc_bag', 9.0, 12.62),
    ('sc_prior', 12.3, 17.4),
    ('sc_crowd', 16.9, 25.25),
    ('sc_idol', 24.7, 29.4),
    ('sc_arch', 28.85, 36.75),
    ('sc_books', 36.1, END),
]
# geçişler: (t0, t1, tür, parametre) — SEGMENTS[i] ile SEGMENTS[i+1] arasında
TRANSITIONS = [
    (6.62, 7.02, 'wipe', dict(angle=math.radians(170), seed=31)),
    (9.06, 9.40, 'wipe', dict(angle=math.radians(-12), seed=36)),
    (12.30, 12.60, 'pan', dict(seed=37)),
    (16.92, 17.36, 'wipe', dict(angle=math.radians(15), seed=32)),
    (24.74, 25.2, 'radial', dict(cx=540, cy=820, seed=33)),
    (28.88, 29.34, 'wipe', dict(angle=math.radians(160), seed=34)),
    (36.15, 36.7, 'wipe', dict(angle=math.radians(-20), seed=35)),
]


class Film:
    def __init__(self, only=None):
        self.paper = ScreenPaper()
        self.mods = {}
        self.assets = {}
        names = [s[0] for s in SEGMENTS]
        for n in names:
            if only and n not in only:
                continue
            try:
                m = importlib.import_module(n)
            except ModuleNotFoundError:
                continue
            self.mods[n] = m
            self.assets[n] = m.load()
        self.gloss = Glosses(os.path.join(HERE, 'timing.json'))
        self.fields = {}

    def field(self, i):
        if i not in self.fields:
            t0, t1, kind, p = TRANSITIONS[i]
            if kind == 'wipe':
                self.fields[i] = WipeField(p['angle'], p['seed'])
            elif kind == 'radial':
                self.fields[i] = RadialField(p['cx'], p['cy'], p['seed'])
            else:
                self.fields[i] = None
        return self.fields[i]

    def scene_D(self, name, t, off=(0.0, 0.0)):
        f = Frame(Cam())
        f.off = off
        if name in self.mods:
            m = self.mods[name]
            if getattr(m, 'PHOTO', False):
                return m.draw_photo(t, self.assets[name]), 'photo'
            m.draw(f, t, self.assets[name])
        return f.D, 'paint'

    def frame_lin(self, t):
        act = [i for i, (n, a, b) in enumerate(SEGMENTS) if a <= t < b]
        if not act:
            act = [len(SEGMENTS) - 1]
        if len(act) == 1:
            name = SEGMENTS[act[0]][0]
            m = self.mods.get(name)
            n = m.motion_samples(t) if (m is not None and hasattr(m, 'motion_samples')) else 1
            if n > 1:
                acc = None
                for k in range(n):
                    tt = t + (k / (n - 1) - 0.5) * 0.55 / FPS
                    D, kind = self.scene_D(name, tt)
                    L = self._lin(D, kind)
                    acc = L if acc is None else acc + L
                return acc / n
            D, kind = self.scene_D(name, t)
            return self._lin(D, kind)
        i0, i1 = act[0], act[-1]
        ti = None
        for k, (a, b, kind, p) in enumerate(TRANSITIONS):
            if a - 0.6 <= t <= b + 0.6 and k == i0:
                ti = k
        if ti is None:
            ti = min(i0, len(TRANSITIONS) - 1)
        a, b, kind, p = TRANSITIONS[ti]
        if t < a:
            D, k_ = self.scene_D(SEGMENTS[i0][0], t)
            return self._lin(D, k_)
        if t >= b:
            D, k_ = self.scene_D(SEGMENTS[i1][0], t)
            return self._lin(D, k_)
        u = (t - a) / (b - a)
        if kind == 'pan':
            e = ease(u, 'io3')
            DA, kA = self.scene_D(SEGMENTS[i0][0], t, off=(0.0, H * e))
            DB, kB = self.scene_D(SEGMENTS[i1][0], t, off=(0.0, -H * (1 - e)))
            seam = H * e
            yy = np.arange(H, dtype=np.float32)[:, None, None]
            mB = sstep(seam + 30, seam - 30, yy)
            return self._lin(DA * (1 - mB) + DB * mB, 'paint')
        DA, kA = self.scene_D(SEGMENTS[i0][0], t)
        DB, kB = self.scene_D(SEGMENTS[i1][0], t)
        if kind == 'cut':
            return self._lin(DB if u >= 0.5 else DA, kB if u >= 0.5 else kA)
        fld = self.field(ti)
        m, rim = fld.mask(ease(u, 'io'))
        if kA == 'paint' and kB == 'paint':
            D = DA * (1 - m[..., None]) + DB * m[..., None]
            # ıslak cephe: hafif koyu kenar ve su lekesi
            D = D + rim[..., None] * (0.12 + 0.35 * (DA + DB)) * 0.5
            return self._lin(D, 'paint')
        LA = self._lin(DA, kA) if kA == 'paint' else DA
        LB = self._lin(DB, kB) if kB == 'paint' else DB
        rimc = (1 - 0.18 * rim)[..., None]
        return (LA * (1 - m[..., None]) + LB * m[..., None]) * rimc

    def _lin(self, D, kind):
        if kind == 'photo':
            return D
        return finalize(D, self.paper)

    def frame(self, t):
        lin = self.frame_lin(t)
        rgb = lin2srgb(lin)
        self.gloss.overlay(rgb, t)
        # son karartma
        fo = ramp(t, END - 0.7, END - 0.05, 'io')
        if fo > 0:
            rgb = rgb * (1 - fo)
        return (np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8)


FILM = None


def _init(only):
    global FILM
    FILM = Film(only)


def _render(args):
    i, t, out, scale = args
    img = FILM.frame(t)
    if scale != 1.0:
        img = cv2.resize(img, (int(W * scale), int(H * scale)), interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(out, f'f_{i:05d}.png'), img[..., ::-1], [cv2.IMWRITE_PNG_COMPRESSION, 1])
    return i


def render(t0, t1, out, fps=FPS, scale=1.0, procs=4, only=None, step=1):
    import multiprocessing as mp
    os.makedirs(out, exist_ok=True)
    _init(only)  # ebeveynde kur (fork ile paylaşılır)
    n0 = int(round(t0 * FPS))
    n1 = int(round(t1 * FPS))
    jobs = [(i, i / FPS, out, scale) for i in range(n0, n1, step)]
    t = time.time()
    ctx = mp.get_context('fork')
    with ctx.Pool(procs) as pool:
        for k, _ in enumerate(pool.imap_unordered(_render, jobs, chunksize=2)):
            if k % 20 == 0:
                print(f'{k}/{len(jobs)} {time.time() - t:.0f}s', flush=True)
    print('bitti', time.time() - t)


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--t0', type=float, default=0)
    ap.add_argument('--t1', type=float, default=END)
    ap.add_argument('--out', default=os.path.join(HERE, 'frames'))
    ap.add_argument('--scale', type=float, default=1.0)
    ap.add_argument('--procs', type=int, default=4)
    ap.add_argument('--step', type=int, default=1)
    ap.add_argument('--only', default=None)
    a = ap.parse_args()
    render(a.t0, a.t1, a.out, scale=a.scale, procs=a.procs, only=a.only.split(',') if a.only else None, step=a.step)
