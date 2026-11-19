# -*- coding: utf-8 -*-
"""
Suluboya kalemi (S-057, Watercolor Pencil) render motoru.

Model: her öğe yerel bir dokuda çizilir. Renkli kalem vuruşları bir BASINÇ haritasına (A8, toplamalı)
ve bir ZAMAN haritasına (her pikselin çizildiği an, min karışım) basılır. Kuru kısımda pigment kâğıt
dişinin tepelerine tutunur; ıslak fırçanın değdiği kısımda basınç çözülüp yayılır (suluboya): çiçeklenme,
kenarda birikme, tanecik çökmesi, akış izi. Renk karışımı çıkarımlıdır (Beer-Lambert): renk = kâğıt x exp(-D).
"""
import math
import numpy as np
import cv2
import skia

# ---------------------------------------------------------------- renk
def hex2rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)], np.float32)


def srgb2lin(c):
    c = np.asarray(c, np.float32)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4).astype(np.float32)


def lin2srgb(c):
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055).astype(np.float32)


PAPER_HEX = '#FBFAF5'
PAPER_LIN = srgb2lin(hex2rgb(PAPER_HEX))


def pig(hexc, k=1.0):
    """Tam örtüde kâğıt üstünde 'hexc' rengini veren optik yoğunluk (RGB)."""
    c = srgb2lin(hex2rgb(hexc))
    return (-np.log(np.clip(c / PAPER_LIN, 2e-3, 1.0)) * k).astype(np.float32)


def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def ease(t, kind='io'):
    t = min(max(t, 0.0), 1.0)
    if kind == 'io':
        return t * t * (3 - 2 * t)
    if kind == 'io3':
        return 4 * t ** 3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2
    if kind == 'o':
        return 1 - (1 - t) ** 3
    if kind == 'i':
        return t ** 3
    if kind == 'back':  # yaylanarak oturma
        c1, c3 = 1.70158, 2.70158
        return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
    if kind == 'lin':
        return t
    return t


def ramp(t, a, b, kind='io'):
    if b <= a:
        return 1.0 if t >= b else 0.0
    return ease((t - a) / (b - a), kind)


# ---------------------------------------------------------------- gürültü
def vnoise(h, w, cell, seed):
    r = np.random.default_rng(seed)
    cell = max(cell, 1.0)
    gh = int(math.ceil(h / cell)) + 3
    gw = int(math.ceil(w / cell)) + 3
    g = r.random((gh, gw), dtype=np.float32)
    up = cv2.resize(g, (int(round(gw * cell)), int(round(gh * cell))), interpolation=cv2.INTER_CUBIC)
    oy = int(r.integers(0, max(1, int(cell))))
    ox = int(r.integers(0, max(1, int(cell))))
    return up[oy:oy + h, ox:ox + w]


def fbm(h, w, cell, oct=4, pers=0.5, seed=0):
    out = np.zeros((h, w), np.float32)
    a, tot = 1.0, 0.0
    for o in range(oct):
        c = cell / (2 ** o)
        if c < 1.0:
            if o == 0:
                c = 1.0
            else:
                break
        out += a * vnoise(h, w, c, seed * 131 + o * 7 + 1)
        tot += a
        a *= pers
    return out / tot


def gnorm(x):
    """Yaklaşık düzgün 0..1 (Gauss CDF ile)."""
    m, s = float(x.mean()), float(x.std()) + 1e-6
    z = (x - m) / (s * 1.41421356)
    # erf yaklaşımı
    t = 1.0 / (1.0 + 0.3275911 * np.abs(z))
    y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * np.exp(-z * z)
    return (0.5 * (1.0 + np.sign(z) * y)).astype(np.float32)


def tooth_map(h, w, seed=0, s=1.0):
    t = (0.52 * fbm(h, w, 5.5 * s, 2, 0.55, seed) + 0.30 * fbm(h, w, 2.0 * s, 2, 0.5, seed + 11)
         + 0.18 * fbm(h, w, 15.0 * s, 2, 0.5, seed + 23))
    return gnorm(t)


def pits_map(h, w, seed=0, s=1.0, tooth=None):
    g = gnorm(fbm(h, w, 1.6 * s, 2, 0.6, seed + 5))
    if tooth is not None:
        g = 0.55 * g + 0.45 * (1.0 - tooth)
    return g.astype(np.float32)


def blur(x, sig):
    if sig <= 0.3:
        return x
    return cv2.GaussianBlur(x, (0, 0), sig, borderType=cv2.BORDER_REFLECT)


def blur_big(x, sig, f=4):
    """Büyük yarıçaplı bulanıklık: küçültüp bulanıklaştırıp büyüt."""
    h, w = x.shape[:2]
    if sig < 6:
        return blur(x, sig)
    sw, sh = max(2, w // f), max(2, h // f)
    sm = cv2.resize(x, (sw, sh), interpolation=cv2.INTER_AREA)
    sm = cv2.GaussianBlur(sm, (0, 0), sig / f, borderType=cv2.BORDER_REFLECT)
    return cv2.resize(sm, (w, h), interpolation=cv2.INTER_CUBIC)


# ---------------------------------------------------------------- yol yardımcıları
def P(pts, close=True):
    """Noktalardan skia.Path."""
    p = skia.Path()
    pts = np.asarray(pts, np.float64)
    p.moveTo(float(pts[0, 0]), float(pts[0, 1]))
    for q in pts[1:]:
        p.lineTo(float(q[0]), float(q[1]))
    if close:
        p.close()
    return p


def bez(p0, p1, p2, p3, n=24):
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2, p3 = map(lambda v: np.asarray(v, np.float64), (p0, p1, p2, p3))
    return ((1 - t) ** 3) * p0 + 3 * ((1 - t) ** 2) * t * p1 + 3 * (1 - t) * t * t * p2 + (t ** 3) * p3


def ellipse_pts(cx, cy, rx, ry, n=96, a0=0.0, a1=2 * math.pi):
    a = np.linspace(a0, a1, n, endpoint=(a1 - a0) < 2 * math.pi - 1e-6)
    return np.stack([cx + rx * np.cos(a), cy + ry * np.sin(a)], 1)


def resample(pts, step):
    pts = np.asarray(pts, np.float64)
    d = np.sqrt(((pts[1:] - pts[:-1]) ** 2).sum(1))
    L = np.concatenate([[0], np.cumsum(d)])
    if L[-1] < 1e-6:
        return pts[:1].repeat(2, 0)
    n = max(2, int(L[-1] / step) + 1)
    s = np.linspace(0, L[-1], n)
    return np.stack([np.interp(s, L, pts[:, 0]), np.interp(s, L, pts[:, 1])], 1)


def poly_len(pts):
    pts = np.asarray(pts)
    return float(np.sqrt(((pts[1:] - pts[:-1]) ** 2).sum(1)).sum())


def ribbon(pts, widths):
    pts = np.asarray(pts, np.float64)
    n = len(pts)
    tg = np.zeros_like(pts)
    tg[1:-1] = pts[2:] - pts[:-2]
    tg[0] = pts[1] - pts[0]
    tg[-1] = pts[-1] - pts[-2]
    ln = np.sqrt((tg ** 2).sum(1))[:, None] + 1e-9
    tg /= ln
    nm = np.stack([-tg[:, 1], tg[:, 0]], 1)
    w = np.asarray(widths, np.float64)[:, None] * 0.5
    L = pts + nm * w
    R = pts - nm * w
    return P(np.concatenate([L, R[::-1]], 0))


def mask_of(path, w, h, aa=True, blur_px=0.0):
    s = skia.Surface.MakeRaster(skia.ImageInfo.MakeA8(w, h))
    c = s.getCanvas()
    c.clear(skia.ColorTRANSPARENT)
    paint = skia.Paint(AntiAlias=aa, Color=skia.ColorBLACK)
    if isinstance(path, (list, tuple)):
        for p in path:
            c.drawPath(p, paint)
    else:
        c.drawPath(path, paint)
    m = s.makeImageSnapshot().toarray().astype(np.float32) / 255.0
    return blur(m, blur_px) if blur_px > 0 else m


def path_union(paths):
    out = paths[0]
    for p in paths[1:]:
        r = skia.Op(out, p, skia.PathOp.kUnion_PathOp)
        out = r if r is not None else out
    return out


def path_diff(a, b):
    r = skia.Op(a, b, skia.PathOp.kDifference_PathOp)
    return r if r is not None else a


def path_isect(a, b):
    r = skia.Op(a, b, skia.PathOp.kIntersect_PathOp)
    return r if r is not None else a


def xform_path(path, sx=1.0, sy=None, tx=0.0, ty=0.0, rot=0.0, cx=0.0, cy=0.0):
    if sy is None:
        sy = sx
    m = skia.Matrix()
    m.setTranslate(tx, ty)
    m.preRotate(math.degrees(rot), cx, cy)
    m.preScale(sx, sy, cx, cy)
    out = skia.Path(path)
    out.transform(m)
    return out


# ---------------------------------------------------------------- vuruş tuvali
class StrokeCanvas:
    """Basınç (A8, toplamalı) + zaman (gri, min) haritaları."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.sp = skia.Surface.MakeRaster(skia.ImageInfo.MakeA8(w, h))
        self.cp = self.sp.getCanvas()
        self.cp.clear(skia.ColorTRANSPARENT)
        self.st = skia.Surface(w, h)
        self.ct = self.st.getCanvas()
        self.ct.clear(skia.ColorWHITE)
        self.pp = skia.Paint(AntiAlias=True, BlendMode=skia.BlendMode.kPlus)
        self.pc = skia.Paint(AntiAlias=True, BlendMode=skia.BlendMode.kPlus)
        self.pt = skia.Paint(AntiAlias=True, BlendMode=skia.BlendMode.kDarken)
        self.clip = None

    def set_clip(self, path):
        self.clip = path
        for c in (self.cp, self.ct):
            c.restoreToCount(1)
            c.save()
            if path is not None:
                c.clipPath(path, doAntiAlias=True)

    @staticmethod
    def _g(t):
        g = int(np.clip(round(t * 254), 0, 254))
        return skia.ColorSetRGB(g, g, g)

    def stroke(self, pts, widths, press, t0=0.0, t1=0.0, prof=(0.1, 0.62)):
        pts = np.asarray(pts, np.float64)
        if len(pts) < 2:
            return
        path = ribbon(pts, widths)
        p0, p1 = skia.Point(*pts[0]), skia.Point(*pts[-1])
        if (pts[-1] - pts[0]).dot(pts[-1] - pts[0]) < 1e-6:
            p1 = skia.Point(pts[0][0] + 1, pts[0][1])
        a = int(np.clip(press * 255, 0, 255))
        cols = [skia.ColorSetARGB(0, 0, 0, 0), skia.ColorSetARGB(a, 0, 0, 0),
                skia.ColorSetARGB(a, 0, 0, 0), skia.ColorSetARGB(0, 0, 0, 0)]
        self.pp.setShader(skia.GradientShader.MakeLinear([p0, p1], cols, [0.0, prof[0], prof[1], 1.0]))
        self.cp.drawPath(path, self.pp)
        self.pt.setShader(skia.GradientShader.MakeLinear([p0, p1], [self._g(t0), self._g(t1)]))
        self.ct.drawPath(path, self.pt)

    def line(self, pts, width, press, t0=0.0, t1=1.0, seg=10, taper=(0.06, 0.1), press_noise=0.25, seed=0):
        """Uzun kontur: basıncı yol boyunca dalgalanan, uçları incelen çizgi; zaman yol boyunca."""
        pts = resample(pts, max(1.0, width * 0.8))
        n = len(pts)
        if n < 2:
            return
        r = np.random.default_rng(seed)
        u = np.linspace(0, 1, n)
        wv = np.full(n, float(width))
        ti, to = taper
        if ti > 0:
            wv *= np.clip(u / ti, 0.15, 1.0)
        if to > 0:
            wv *= np.clip((1 - u) / to, 0.15, 1.0)
        k = max(2, n // 25 + 2)
        pn = np.interp(u, np.linspace(0, 1, k), r.random(k))
        pv = press * (1 - press_noise + press_noise * 2 * pn)
        wv *= 0.85 + 0.3 * pn
        i = 0
        while i < n - 1:
            j = min(n - 1, i + seg)
            sp = pts[i:j + 1]
            path = ribbon(sp, wv[i:j + 1])
            a = int(np.clip(pv[i:j + 1].mean() * 255, 0, 255))
            self.pc.setColor(skia.ColorSetARGB(a, 0, 0, 0))
            self.cp.drawPath(path, self.pc)
            ta = t0 + (t1 - t0) * u[i]
            tb = t0 + (t1 - t0) * u[j]
            p0, p1 = skia.Point(*sp[0]), skia.Point(*sp[-1])
            if abs(sp[-1] - sp[0]).sum() < 1e-6:
                p1 = skia.Point(sp[0][0] + 1, sp[0][1])
            self.pt.setShader(skia.GradientShader.MakeLinear([p0, p1], [self._g(ta), self._g(tb)]))
            self.ct.drawPath(path, self.pt)
            i = j

    def fill(self, path, press, t0=0.0, t1=None, sweep=(1.0, 0.0), bbox=None):
        """Düz basınç dolgusu (ör. yıkama altlığı). Zaman, 'sweep' yönünde t0→t1 akar."""
        self.pc.setColor(skia.ColorSetARGB(int(np.clip(press * 255, 0, 255)), 0, 0, 0))
        self.cp.drawPath(path, self.pc)
        if t1 is None:
            t1 = t0
        b = path.getBounds() if bbox is None else bbox
        cx, cy = (b.left() + b.right()) / 2, (b.top() + b.bottom()) / 2
        hw = abs(sweep[0]) * (b.width() / 2) + abs(sweep[1]) * (b.height() / 2) + 1
        p0 = skia.Point(cx - sweep[0] * hw, cy - sweep[1] * hw)
        p1 = skia.Point(cx + sweep[0] * hw, cy + sweep[1] * hw)
        self.pt.setShader(skia.GradientShader.MakeLinear([p0, p1], [self._g(t0), self._g(t1)]))
        self.ct.drawPath(path, self.pt)

    def pressure(self):
        return self.sp.makeImageSnapshot().toarray().astype(np.float32) / 255.0

    def times(self):
        return self.st.makeImageSnapshot().toarray()[..., 0].astype(np.float32) / 254.0


# ---------------------------------------------------------------- tarama üreteci
def hatch(sc, mask, angle, spacing=3.2, length=(16, 30), cluster=(4, 8), press=(0.45, 0.8), width=(1.3, 2.0),
          density=1.0, tone=None, order='sweep', sweep_dir=(1.0, 0.3), t_range=(0.0, 1.0), seed=0, curve=0.06,
          angle_jit=0.12, mthr=0.25, gap=1.4, bbox=None, overshoot=0.0):
    """Öbek taraması: kısa, paralel, uçları incelen vuruş öbekleri. angle: sayı ya da f(x,y)->radyan.
    tone: 0..1 yerel koyuluk haritası (yoğunluğu ve basıncı ölçekler)."""
    r = np.random.default_rng(seed)
    h, w = mask.shape
    if bbox is None:
        ys, xs = np.nonzero(mask > mthr)
        if len(xs) == 0:
            return
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    else:
        x0, y0, x1, y1 = bbox
    Lm = 0.5 * (length[0] + length[1])
    cw = spacing * 0.5 * (cluster[0] + cluster[1])
    step = max(4.0, math.sqrt(Lm * cw) * 0.62 / math.sqrt(max(density, 0.05)))
    cs = []
    gy = y0 - step * 0.5
    while gy < y1 + step:
        gx = x0 - step * 0.5
        while gx < x1 + step:
            px = gx + r.uniform(-0.5, 0.5) * step
            py = gy + r.uniform(-0.5, 0.5) * step
            ix, iy = int(px), int(py)
            if 0 <= ix < w and 0 <= iy < h and mask[iy, ix] > mthr:
                tv = 1.0 if tone is None else float(tone[iy, ix])
                if r.random() < min(1.0, 0.25 + 0.95 * tv):
                    cs.append((px, py, tv))
            gx += step
        gy += step
    if not cs:
        return
    cs = np.array(cs)
    if order == 'sweep':
        d = np.array(sweep_dir, np.float64)
        d /= np.linalg.norm(d) + 1e-9
        key = cs[:, 0] * d[0] + cs[:, 1] * d[1]
        key = (key - key.min()) / (np.ptp(key) + 1e-9)
        key = key + r.uniform(-0.08, 0.08, len(key))
    elif order == 'random':
        key = r.random(len(cs))
    else:  # radial from center
        cx, cy = order
        key = np.hypot(cs[:, 0] - cx, cs[:, 1] - cy)
        key = key / (key.max() + 1e-9) + r.uniform(-0.06, 0.06, len(key))
    idx = np.argsort(key)
    t0, t1 = t_range
    nC = len(idx)
    for rank, k in enumerate(idx):
        px, py, tv = cs[k]
        th = angle(px, py) if callable(angle) else angle
        th += r.normal(0, angle_jit)
        dx, dy = math.cos(th), math.sin(th)
        nx, ny = -dy, dx
        n = int(r.integers(cluster[0], cluster[1] + 1))
        L = r.uniform(*length)
        ct0 = t0 + (t1 - t0) * rank / max(1, nC)
        ct1 = t0 + (t1 - t0) * (rank + 1) / max(1, nC)
        for i in range(n):
            off = (i - (n - 1) / 2) * spacing * r.uniform(0.85, 1.15)
            li = L * r.uniform(0.72, 1.0)
            sh = r.uniform(-0.18, 0.18) * L
            cx, cy = px + nx * off + dx * sh, py + ny * off + dy * sh
            # hafif kavisli vuruş
            bend = r.normal(0, curve) * li
            u = np.linspace(-0.5, 0.5, 6)
            xs = cx + dx * u * li + nx * bend * (1 - (2 * u) ** 2)
            ys = cy + dy * u * li + ny * bend * (1 - (2 * u) ** 2)
            ww = r.uniform(*width)
            wv = ww * np.array([0.55, 0.9, 1.0, 1.0, 0.85, 0.5])
            pr = r.uniform(*press) * (0.55 + 0.45 * tv)
            if r.random() < 0.5:  # yön değiştir (gidiş-dönüş)
                xs, ys, wv = xs[::-1], ys[::-1], wv[::-1]
            ts = ct0 + (ct1 - ct0) * i / max(1, n)
            sc.stroke(np.stack([xs, ys], 1), wv, pr, ts, ts + (ct1 - ct0) / max(1, n),
                      prof=(r.uniform(0.04, 0.14), r.uniform(0.55, 0.8)))


# ---------------------------------------------------------------- malzeme
def dry_cover(Pm, tooth, gain=1.05, soft=0.11):
    thr = 1.0 + soft - (1.0 + 2 * soft) * np.clip(Pm * gain, 0, 1)
    return (sstep(-soft, soft, tooth - thr) * (0.4 + 0.6 * np.clip(Pm * 1.3, 0, 1))
            * sstep(0.0, 0.06, Pm)).astype(np.float32)


class Paper:
    """Bir dokunun yerel kâğıdı (diş + tanecik)."""

    def __init__(self, w, h, seed=0, s=1.0):
        self.tooth = tooth_map(h, w, seed, s)
        self.pits = pits_map(h, w, seed, s, self.tooth)
        self.s = s


def bloom_field(h, w, region, n, rmin, rmax, seed=0, s=1.0):
    """Çiçeklenme çarpanı: içi açık (pigment itilmiş), kenarı karnabahar gibi koyu."""
    r = np.random.default_rng(seed)
    f = np.ones((h, w), np.float32)
    ys, xs = np.nonzero(region > 0.25)
    if len(xs) == 0 or n <= 0:
        return f
    for _ in range(n):
        i = int(r.integers(0, len(xs)))
        cx, cy = float(xs[i]), float(ys[i])
        R = r.uniform(rmin, rmax) * s
        pad = int(R * 1.5) + 4
        x0, x1 = max(0, int(cx - pad)), min(w, int(cx + pad))
        y0, y1 = max(0, int(cy - pad)), min(h, int(cy + pad))
        if x1 <= x0 or y1 <= y0:
            continue
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        ang = np.arctan2(yy - cy, xx - cx)
        # açısal sınır gürültüsü (birkaç harmonik)
        rad = np.ones_like(ang)
        for k, amp in ((3, 0.10), (5, 0.08), (9, 0.06), (17, 0.04), (31, 0.025)):
            rad += amp * np.sin(k * ang + r.uniform(0, 6.28)) * r.uniform(0.6, 1.2)
        d = np.hypot(xx - cx, yy - cy) / (R * rad)
        inside = np.clip(1 - d, 0, 1)
        ring = np.exp(-((d - 1.0) / 0.06) ** 2)
        g = (1.0 - 0.3 * sstep(0.0, 0.5, inside)) * (1.0 + 0.6 * ring)
        f[y0:y1, x0:x1] *= g
    return f


def wet_pressure(Pm, wet, paper, seed=0, s=1.0, spread=1.0, bloom_n=None, flow_dir=0.6,
                 edge_k=2.4, gran=0.55, bloom_r=(10, 34), shape=None):
    """Kalem basıncını ıslak fırçayla çözülmüş suluboya kapsamasına çevirir."""
    h, w = Pm.shape
    small = blur(Pm, 1.6 * s * spread)
    large = blur_big(Pm, 9.0 * s * spread)
    Pw = 0.55 * small + 0.62 * large
    # akış: iri gürültü + kıl izleri
    flow = 0.72 + 0.56 * gnorm(fbm(h, w, 60 * s, 3, 0.5, seed + 3))
    rnd = np.random.default_rng(seed + 9).random((h, w)).astype(np.float32)
    k = int(max(3, 25 * s)) | 1
    ang = flow_dir
    kern = np.zeros((k, k), np.float32)
    c = k // 2
    for i in range(k):
        t = i - c
        x = int(round(c + t * math.cos(ang)))
        y = int(round(c + t * math.sin(ang)))
        kern[y, x] = 1
    kern /= kern.sum()
    streak = gnorm(cv2.filter2D(blur(rnd, 0.8 * s), -1, kern))
    Pw = Pw * flow * (0.9 + 0.2 * streak)
    region = (wet > 0.5) & (Pw > 0.04)
    if bloom_n is None:
        bloom_n = int(region.sum() / (60000 * s * s)) + 1
    Pw = Pw * bloom_field(h, w, region.astype(np.float32), bloom_n, bloom_r[0], bloom_r[1], seed + 17, s)
    # ıslak bölgede sınırlı; ıslak alan kenarında sert, kuruma çizgisi
    wn = sstep(0.35, 0.65, wet)
    if shape is not None:
        lim = sstep(0.32, 0.68, blur(shape, 0.9 * s) + 0.16 * (fbm(h, w, 8 * s, 2, 0.5, seed + 31) - 0.5))
        Pw = Pw * lim
    Pw = Pw * wn
    # kenarda birikme (iç kenar koyulaşır)
    e = np.clip(Pw - blur(Pw, 4.0 * s), 0, None)
    Pw = Pw + edge_k * e
    # ıslak alan sınırında kuruma çizgisi
    wedge = np.clip(wn - blur(wn, 2.2 * s), 0, None) * 2.2
    Pw = Pw + wedge * blur(Pw, 3 * s) * 1.4
    # alt kenarda göllenme
    shift = np.roll(Pw, int(-3 * s), axis=0)
    Pw = Pw + 0.6 * np.clip(Pw - shift, 0, None)
    # tanecik: kâğıt çukurlarına çökme
    Pw = Pw * (1.0 - gran * 0.5 + gran * paper.pits)
    return np.clip(Pw, 0, 2.2).astype(np.float32)


# ---------------------------------------------------------------- öğe
class Layer:
    """C: kuru kapsama, Pw: ıslak kapsama (ıslak maske uygulanmış), T: çizim zamanı, pg: pigment yoğunluğu."""
    __slots__ = ('C', 'T', 'Pw', 'pg', 'kind')

    def __init__(self, C, T, Pw, pg, kind):
        self.C, self.T, self.Pw, self.pg, self.kind = C, T, Pw, pg, kind


class Element:
    """Yerel dokuda çizilen öğe. Birim: dünya pikseli; doku pikseli = dünya * s.
    Katmanlar: (renk, kalem basıncı, zaman). Islak maske (wet) ve ıslanma zamanı (Tw)."""

    def __init__(self, w, h, s=1.0, seed=0, name='el', pivot=(0.0, 0.0)):
        self.name = name
        self.ww, self.wh = w, h  # dünya boyutu
        self.s = s
        self.tw, self.th = int(math.ceil(w * s)), int(math.ceil(h * s))
        self.seed = seed
        self.paper = Paper(self.tw, self.th, seed, s)
        self.layers = []
        self.shape = np.zeros((self.th, self.tw), np.float32)
        self.wet = np.zeros((self.th, self.tw), np.float32)
        self.Tw = np.ones((self.th, self.tw), np.float32)
        self.pivot = pivot  # dünya biriminde dokunun içindeki dönüş/yerleşim noktası
        self._full = None
        self.extra = []  # (D, A) hazır katmanlar
        self.Tarea = None

    # dünya → doku dönüşümlü yol
    def tp(self, path):
        return xform_path(path, self.s)

    def canvas(self):
        return StrokeCanvas(self.tw, self.th)

    def add_shape(self, path, blur_px=0.0):
        m = mask_of(self.tp(path), self.tw, self.th, blur_px=blur_px)
        self.shape = np.maximum(self.shape, m)
        return m

    def mask(self, path, blur_px=0.0):
        return mask_of(self.tp(path), self.tw, self.th, blur_px=blur_px)

    def set_wet(self, wet, Tw=None):
        self.wet = np.clip(wet, 0, 1).astype(np.float32)
        if Tw is not None:
            self.Tw = Tw.astype(np.float32)

    def wet_split(self, angle=0.0, frac=0.5, lobes=0.18, seed=1, blob=None, t_range=(0.0, 1.0), sweep=None):
        """Loblu bir sınırla öğenin bir kısmını ıslat. angle: ıslak taraf yönü (0: sol yarı)."""
        h, w = self.th, self.tw
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        ys, xs = np.nonzero(self.shape > 0.3)
        if len(xs) == 0:
            return
        cx, cy = xs.mean(), ys.mean()
        ext = max(np.ptp(xs), np.ptp(ys)) + 1
        d = ((xx - cx) * math.cos(angle) + (yy - cy) * math.sin(angle)) / ext  # ıslak taraf: angle yönü
        n = (fbm(h, w, max(12.0, min(90 * self.s, 0.55 * ext)), 3, 0.55, seed) - 0.5) * lobes * 2.4
        # eşik: frac'a göre
        f = d + n
        vals = f[self.shape > 0.3]
        thr = np.quantile(vals, 1 - frac)
        wet = sstep(thr - 0.004, thr + 0.004, f)
        if blob is not None:
            wet = np.maximum(wet, blob)
        sv = (sweep if sweep is not None else angle)
        dd = ((xx - cx) * math.cos(sv) + (yy - cy) * math.sin(sv)) / ext
        Tn = (dd - dd[self.shape > 0.3].min()) / (np.ptp(dd[self.shape > 0.3]) + 1e-6)
        Tn = np.clip(Tn + 0.12 * (fbm(h, w, 40 * self.s, 3, 0.5, seed + 4) - 0.5), 0, 1)
        self.set_wet(wet, t_range[0] + (t_range[1] - t_range[0]) * Tn)

    def layer(self, hexc, sc, k=1.0, kind='hatch', wet_spread=1.0, bloom_n=None, gran=0.55, edge_k=2.4,
              wet_k=1.12, shape=None, dry_gain=1.05, flow_dir=0.6, bloom_r=(10, 34), wet_override=None, clip=None):
        Pm = sc.pressure()
        if clip is not None:
            Pm = Pm * np.clip(clip, 0, 1)
        T = sc.times()
        D = pig(hexc, k)
        C = dry_cover(Pm, self.paper.tooth, gain=dry_gain)
        wet = self.wet if wet_override is None else wet_override
        if wet.max() > 0.01:
            Pw = wet_pressure(Pm, wet, self.paper, seed=self.seed + len(self.layers) * 13, s=self.s,
                              spread=wet_spread, bloom_n=bloom_n, gran=gran, edge_k=edge_k,
                              shape=shape if shape is not None else None, flow_dir=flow_dir, bloom_r=bloom_r)
            Pw = Pw * wet_k
        else:
            Pw = None
        self.layers.append(Layer(C.astype(np.float16), T.astype(np.float16),
                                 None if Pw is None else Pw.astype(np.float16), D, kind))
        self._full = None
        return Pm

    def line_layer(self, hexc, sc, k=1.0, wet_soft=1.0, clip=None):
        """Kontur katmanı: ıslak yerde az yayılır."""
        Pm = sc.pressure()
        if clip is not None:
            Pm = Pm * np.clip(clip, 0, 1)
        T = sc.times()
        D = pig(hexc, k)
        C = dry_cover(Pm, self.paper.tooth, gain=1.25, soft=0.14)
        if self.wet.max() > 0.01:
            wn = sstep(0.35, 0.65, self.wet)
            Pw = blur(Pm, 1.1 * self.s * wet_soft) * 0.8 + blur(Pm, 2.6 * self.s * wet_soft) * 0.35
            Pw = Pw * (0.75 + 0.5 * self.paper.pits) * wn
            if self.shape.max() > 0.5:
                Pw = Pw * np.maximum(sstep(0.04, 0.3, blur(self.shape, 1.6 * self.s)), C)
        else:
            Pw = None
        self.layers.append(Layer(C.astype(np.float16), T.astype(np.float16),
                                 None if Pw is None else Pw.astype(np.float16), D, 'line'))
        self._full = None

    def add_density(self, D, A=None):
        """Hazır yoğunluk (ör. özel efekt) katmanı."""
        self.extra.append((D.astype(np.float16), None if A is None else A.astype(np.float16)))
        self._full = None

    # ---- durum
    def full(self):
        if self._full is None:
            D = np.zeros((self.th, self.tw, 3), np.float32)
            wn = sstep(0.35, 0.65, self.wet.astype(np.float32))
            for L in self.layers:
                cov = L.C.astype(np.float32)
                if L.Pw is not None:
                    cov = cov * (1 - wn) + L.Pw.astype(np.float32)
                D += cov[..., None] * L.pg[None, None, :]
            for Dx, _ in self.extra:
                D += Dx.astype(np.float32)
            A = self.alpha()
            self._full = (D, A)
        return self._full

    def alpha(self):
        if getattr(self, '_alpha', None) is None:
            self._alpha = np.clip(blur(self.shape.astype(np.float32), 0.6 * self.s), 0, 1).astype(np.float32)
        return self._alpha

    def state(self, pd=1.0, pw=1.0, front=0.035):
        """pd: kuru çizim ilerlemesi (zaman haritası eşiği 0..1), pw: ıslanma ilerlemesi (Tw eşiği)."""
        if pd >= 1.0 and pw >= 1.0:
            return self.full()
        D = np.zeros((self.th, self.tw, 3), np.float32)
        wnf = sstep(0.35, 0.65, self.wet.astype(np.float32))
        if pw >= 1.0:
            arr = np.ones_like(wnf)
            ring = None
        elif pw <= 0.0:
            arr = np.zeros_like(wnf)
            ring = None
        else:
            dt = pw - self.Tw.astype(np.float32)
            arr = sstep(-0.012, 0.012, dt)
            ring = 1.0 + 0.6 * np.exp(-(dt / front) ** 2)
        wv = wnf * arr
        drawn_any = np.zeros((self.th, self.tw), np.float32)
        for L in self.layers:
            T = L.T.astype(np.float32)
            md = np.ones_like(T) if pd >= 1.0 else sstep(-0.004, 0.004, pd - T)
            cov = L.C.astype(np.float32) * md
            if L.Pw is not None:
                Pw = L.Pw.astype(np.float32) * arr
                if ring is not None:
                    Pw = Pw * ring
                if pd < 1.0:
                    Pw = Pw * sstep(0.0, 0.03, pd - T)
                cov = cov * (1 - wv) + Pw
            D += cov[..., None] * L.pg[None, None, :]
            drawn_any = np.maximum(drawn_any, md * (T < 0.999))
        for Dx, _ in self.extra:
            D += Dx.astype(np.float32) * (1.0 if pd >= 1.0 else 0.0)
        A = self.alpha()
        if pd < 1.0:
            cov = np.clip(blur(drawn_any, 3 * self.s) * 2.0, 0, 1) * sstep(0.12, 0.8, pd)
            A = A * np.maximum(cov, wv)
        return D, A


# ---------------------------------------------------------------- hazır yoğunluk (efekt) öğesi
class Sprite:
    """Önceden hesaplanmış (D, A) dokusu; açılma alanı ile."""

    def __init__(self, D, A, s=1.0, pivot=(0, 0), name='sprite'):
        self.D = D.astype(np.float32)
        self.A = A.astype(np.float32)
        self.s = s
        self.th, self.tw = A.shape
        self.ww, self.wh = self.tw / s, self.th / s
        self.pivot = pivot
        self.name = name

    def full(self):
        return self.D, self.A

    def state(self, pd=1.0, pw=1.0, front=0.035):
        return self.D, self.A


def bake(el):
    D, A = el.full()
    return Sprite(D, A, el.s, el.pivot, el.name)


# ---------------------------------------------------------------- sahne düzeyinde ıslak alan (dünya koordinatı)
class WorldWet:
    """Bütün sahneye tek fırça geçişi: yönlü, loblu (adacıksız) bir sınır ve ıslanma zamanı."""

    def __init__(self, bounds=(-600, -600, 2400, 2600), angle=math.radians(195), origin=(540, 900), scale=900.0,
                 amp=0.11, seed=900, sweep=None, offset=0.0, cell=4.0):
        x0, y0, x1, y1 = bounds
        self.x0, self.y0, self.cell = x0, y0, cell
        gw, gh = int((x1 - x0) / cell) + 2, int((y1 - y0) / cell) + 2
        n = (fbm(gh, gw, 320 / cell, 2, 0.45, seed) - 0.5) * 1.0 + (fbm(gh, gw, 90 / cell, 2, 0.5, seed + 1) - 0.5) * 0.35
        self.noise = (n / (np.abs(n).max() + 1e-6)).astype(np.float32)
        n2 = fbm(gh, gw, 140 / cell, 3, 0.5, seed + 2) - 0.5
        self.noise2 = (n2 / (np.abs(n2).max() + 1e-6)).astype(np.float32)
        self.angle, self.origin, self.scale, self.amp = angle, origin, scale, amp
        self.sweep = sweep if sweep is not None else angle + math.pi
        self.offset = offset

    def _grid(self, el, px, py):
        yy, xx = np.mgrid[0:el.th, 0:el.tw].astype(np.float32)
        X = xx / el.s - el.pivot[0] + px
        Y = yy / el.s - el.pivot[1] + py
        return X, Y

    def _samp(self, arr, X, Y):
        mx = ((X - self.x0) / self.cell).astype(np.float32)
        my = ((Y - self.y0) / self.cell).astype(np.float32)
        return cv2.remap(arr, mx, my, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

    def field(self, X, Y):
        d = ((X - self.origin[0]) * math.cos(self.angle) + (Y - self.origin[1]) * math.sin(self.angle)) / self.scale
        return d + self.amp * self._samp(self.noise, X, Y) - self.offset

    def apply(self, el, px=0.0, py=0.0, t_range=(0.0, 1.0), soft=0.004, extra=None):
        X, Y = self._grid(el, px, py)
        f = self.field(X, Y)
        wet = sstep(-soft, soft, f)
        if extra is not None:
            wet = np.maximum(wet, extra)
        sv = self.sweep
        dd = ((X - self.origin[0]) * math.cos(sv) + (Y - self.origin[1]) * math.sin(sv)) / self.scale
        Tn = np.clip(0.5 + dd * 0.6 + 0.06 * self._samp(self.noise2, X, Y), 0, 1)
        el.set_wet(wet.astype(np.float32), (t_range[0] + (t_range[1] - t_range[0]) * Tn).astype(np.float32))
        return wet


def slim(obj):
    """Kurulumdan sonra gereksiz büyük dizileri at (önbellek ve bellek için)."""
    if isinstance(obj, Element):
        obj.paper = None
        obj.wet = obj.wet.astype(np.float16)
        obj.Tw = obj.Tw.astype(np.float16)
        obj.shape = obj.shape.astype(np.float16)
        obj._full = None
        obj._alpha = None
    elif isinstance(obj, dict):
        for v in obj.values():
            slim(v)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            slim(v)
    elif hasattr(obj, 'el') and isinstance(getattr(obj, 'el'), Element):
        slim(obj.el)
    return obj
