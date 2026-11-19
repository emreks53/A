"""Dijital suluboya (Atölye S-146) motoru.

Her kare, dokulu bir kâğıt üzerine 'lavi' denen saydam boya geçişlerinin çarpımsal olarak sırlanmasıyla çizilir:
biçim maskesi (skia ile vektörden) -> kenar yumuşatma + gürültülü eşik -> ıslak kenar (iç kenar bandında pigment
birikimi) -> kâğıt çukurlarında granülasyon -> düşük frekanslı akış dalgalanması -> 'multiply'.

Gürültüler nesneye bağlıdır (nesnenin yerel koordinatlarında örneklenir), kâğıt ve granülasyon ekrana bağlıdır
(boya kâğıdın çukurlarına çöker). Böylece hareket eden biçimlerin dokusu kaymaz, kâğıt sabit kalır.
"""
from __future__ import annotations

import math
import os
from contextlib import contextmanager
from dataclasses import dataclass

import cv2
import numpy as np
import skia

W, H, FPS = 1080, 1920, 30
KOK = os.path.dirname(os.path.abspath(__file__))
ONBELLEK = os.environ.get(
    'SB_ONBELLEK', '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/sb_onbellek')
os.makedirs(ONBELLEK, exist_ok=True)

KAGIT = np.array([0.972, 0.957, 0.930], np.float32)  # soğuk preslenmiş, sıcak beyaz kâğıt

cv2.setNumThreads(1)


# ----------------------------------------------------------------------------------------------------------------
# yardımcılar
# ----------------------------------------------------------------------------------------------------------------
def hex2rgb(h: str) -> np.ndarray:
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)], np.float32)


def renk(c) -> np.ndarray:
    if isinstance(c, str):
        return hex2rgb(c)
    return np.asarray(c, np.float32)


def karistir(a, b, t):
    a, b = renk(a), renk(b)
    return a + (b - a) * t


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def sstep(a, b, x):  # skaler
    if b == a:
        return 1.0 if x >= b else 0.0
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


# yumuşatma eğrileri ----------------------------------------------------------------------------------------------
def e_lin(t):
    return min(1.0, max(0.0, t))


def e_io(t):  # cubic in-out
    t = min(1.0, max(0.0, t))
    return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def e_io5(t):  # quint in-out (kamera)
    t = min(1.0, max(0.0, t))
    return 16 * t ** 5 if t < 0.5 else 1 - (-2 * t + 2) ** 5 / 2


def e_out(t):  # cubic out
    t = min(1.0, max(0.0, t))
    return 1 - (1 - t) ** 3


def e_in(t):
    t = min(1.0, max(0.0, t))
    return t ** 3


def e_back(t, s=1.55):  # hafif taşma
    t = min(1.0, max(0.0, t))
    t -= 1
    return t * t * ((s + 1) * t + s) + 1


def e_yay(t, sonum=6.0, frekans=2.2):  # yay (spring) – taşar ve oturur
    t = max(0.0, t)
    if t >= 1.6:
        return 1.0
    return 1 - math.exp(-sonum * t) * math.cos(2 * math.pi * frekans * t)


def ilerle(t, a, b, egri=e_io):
    """t anında [a, b] aralığındaki ilerleme (0..1)."""
    if b <= a:
        return 1.0 if t >= b else 0.0
    return egri(min(1.0, max(0.0, (t - a) / (b - a))))


# ----------------------------------------------------------------------------------------------------------------
# gürültü dokuları (döşenebilir, FFT ile süzülmüş)
# ----------------------------------------------------------------------------------------------------------------
def _fft_gurultu(h, w, olcek, tohum, ani=(1.0, 1.0)):
    rng = np.random.default_rng(tohum)
    x = rng.standard_normal((h, w)).astype(np.float32)
    F = np.fft.rfft2(x)
    fy = np.fft.fftfreq(h)[:, None] * ani[1]
    fx = np.fft.rfftfreq(w)[None, :] * ani[0]
    f2 = fx * fx + fy * fy
    F *= np.exp(-2.0 * (math.pi ** 2) * (olcek ** 2) * f2)
    y = np.fft.irfft2(F, s=(h, w)).astype(np.float32)
    y -= y.mean()
    y /= (y.std() + 1e-8)
    return y


def _fbm(h, w, olcekler, agirliklar, tohum):
    t = np.zeros((h, w), np.float32)
    for i, (o, a) in enumerate(zip(olcekler, agirliklar)):
        t += a * _fft_gurultu(h, w, o, tohum + 31 * i)
    t -= t.mean()
    t /= t.std() + 1e-8
    return t


def _onbellekli(ad, f):
    p = os.path.join(ONBELLEK, ad + '.npy')
    if os.path.exists(p):
        return np.load(p)
    a = f()
    np.save(p, a)
    return a


N = 1024  # döşeme boyu (yerel birim)
G_KENAR = _onbellekli('g_kenar', lambda: _fbm(N, N, [2.5, 6, 16], [0.35, 0.45, 0.35], 11))
G_AKIS = _onbellekli('g_akis', lambda: _fbm(N, N, [28, 70, 160], [0.4, 0.45, 0.35], 23))
G_INCE = _onbellekli('g_ince', lambda: _fbm(N, N, [1.0, 2.2], [0.6, 0.4], 37))
G_LIF = _onbellekli('g_lif', lambda: _fft_gurultu(N, N, 3.0, 41, ani=(0.25, 1.6)))  # yönlü lif/fırça izi


def _kagit_uret():
    h = _fbm(H, W, [0.9, 2.0, 4.5, 12.0], [0.30, 0.45, 0.30, 0.10], 101)
    # soğuk pres: yumru tepeler biraz yuvarlak, çukurlar dar
    h = np.tanh(h * 0.9)
    h -= h.min()
    h /= h.max()
    return h.astype(np.float32)


KAGIT_Y = _onbellekli('kagit_y2', _kagit_uret)  # 0..1 yükseklik


def _gran_uret():
    cukur = 1.0 - KAGIT_Y
    cukur = (cukur - cukur.mean()) / (cukur.std() + 1e-8)
    ince = _fft_gurultu(H, W, 0.75, 202)
    g = 0.55 * cukur + 0.7 * ince
    g /= g.std() + 1e-8
    return g.astype(np.float32)


GRAN = _onbellekli('gran2', _gran_uret)  # ~N(0,1), ekrana bağlı


def _kabartma_uret():
    k = cv2.GaussianBlur(KAGIT_Y, (0, 0), 0.8)
    gx = cv2.Sobel(k, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(k, cv2.CV_32F, 0, 1, ksize=3)
    isik = -(gx * 0.7 + gy * 0.7)  # sol üstten ışık
    isik /= (np.abs(isik).max() + 1e-6)
    leke = _fft_gurultu(H, W, 140, 303) * 0.5 + _fft_gurultu(H, W, 40, 304) * 0.25
    return isik.astype(np.float32), leke.astype(np.float32)


KABARTMA, LEKE = _onbellekli('kabartma2', lambda: np.stack(_kabartma_uret()))


def _doku_ornekle(doku, M_ters, x0, y0, w, h, olcek=1.0, kayma=(0.0, 0.0)):
    """Ekran kırpıntısının (x0,y0,w,h) her pikseli için doku(yerel*olcek + kayma) — döşenerek."""
    A = np.array([[1, 0, x0], [0, 1, y0], [0, 0, 1]], np.float64)
    S = np.array([[olcek, 0, kayma[0]], [0, olcek, kayma[1]], [0, 0, 1]], np.float64)
    T = S @ M_ters @ A
    return cv2.warpAffine(doku, T[:2].astype(np.float32), (w, h),
                          flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_WRAP)


# ----------------------------------------------------------------------------------------------------------------
# skia: matris, yol ve maske
# ----------------------------------------------------------------------------------------------------------------
def mat(a=1.0, b=0.0, c=0.0, d=1.0, tx=0.0, ty=0.0) -> np.ndarray:
    return np.array([[a, c, tx], [b, d, ty], [0, 0, 1]], np.float64)


def M_oteleme(x, y):
    return mat(tx=x, ty=y)


def M_olcek(sx, sy=None):
    return mat(a=sx, d=sx if sy is None else sy)


def M_donme(aci_derece):
    r = math.radians(aci_derece)
    c, s = math.cos(r), math.sin(r)
    return mat(a=c, b=s, c=-s, d=c)


def M_bilesik(*ms):
    out = np.eye(3)
    for m in ms:
        out = out @ m
    return out


def M_yerlestir(x, y, olcek=1.0, aci=0.0, ox=0.0, oy=0.0, sx=None, sy=None):
    """Yerel (ox,oy) noktasını (x,y)'ye koyar; ölçek ve dönme o nokta çevresinde."""
    sxx = olcek if sx is None else sx * olcek
    syy = olcek if sy is None else sy * olcek
    return M_bilesik(M_oteleme(x, y), M_donme(aci), M_olcek(sxx, syy), M_oteleme(-ox, -oy))


def _skmat(m: np.ndarray) -> skia.Matrix:
    return skia.Matrix.MakeAll(float(m[0, 0]), float(m[0, 1]), float(m[0, 2]),
                               float(m[1, 0]), float(m[1, 1]), float(m[1, 2]), 0.0, 0.0, 1.0)


def nokta_donustur(m, x, y):
    v = m @ np.array([x, y, 1.0])
    return float(v[0]), float(v[1])


@dataclass
class Kirp:
    x0: int
    y0: int
    w: int
    h: int

    @property
    def dilim(self):
        return (slice(self.y0, self.y0 + self.h), slice(self.x0, self.x0 + self.w))

    def bos(self):
        return self.w <= 0 or self.h <= 0


def yollar_kirp(yollar, M, pay=8.0) -> Kirp:
    r = None
    for p in yollar:
        b = p.computeTightBounds()
        if b.isEmpty() and b.width() == 0 and b.height() == 0:
            continue
        rr = _skmat(M).mapRect(b)
        r = rr if r is None else skia.Rect.MakeLTRB(min(r.left(), rr.left()), min(r.top(), rr.top()),
                                                   max(r.right(), rr.right()), max(r.bottom(), rr.bottom()))
    if r is None:
        return Kirp(0, 0, 0, 0)
    x0 = max(0, int(math.floor(r.left() - pay)))
    y0 = max(0, int(math.floor(r.top() - pay)))
    x1 = min(W, int(math.ceil(r.right() + pay)))
    y1 = min(H, int(math.ceil(r.bottom() + pay)))
    return Kirp(x0, y0, x1 - x0, y1 - y0)


def maske_ciz(yollar, M, k: Kirp, cizgi=None, cizgi_uc='yuvarlak', dolgu_kurali=None) -> np.ndarray:
    """Yolları kırpıntıya A8 maske olarak çizer (0..1). cizgi: kalınlık (yerel birim) verilirse çizgi olarak."""
    if k.bos():
        return np.zeros((max(k.h, 0), max(k.w, 0)), np.float32)
    s = skia.Surface.MakeRaster(skia.ImageInfo.MakeA8(k.w, k.h))
    c = s.getCanvas()
    c.setMatrix(_skmat(M_bilesik(M_oteleme(-k.x0, -k.y0), M)))
    p = skia.Paint(AntiAlias=True)
    if cizgi is not None:
        p.setStyle(skia.Paint.kStroke_Style)
        p.setStrokeWidth(float(cizgi))
        p.setStrokeCap(skia.Paint.kRound_Cap if cizgi_uc == 'yuvarlak' else skia.Paint.kButt_Cap)
        p.setStrokeJoin(skia.Paint.kRound_Join)
    for yol in yollar:
        if dolgu_kurali == 'eo':
            yol.setFillType(skia.PathFillType.kEvenOdd)
        c.drawPath(yol, p)
    return s.makeImageSnapshot().toarray().astype(np.float32) * (1.0 / 255.0)


# ----------------------------------------------------------------------------------------------------------------
# yol kurucular
# ----------------------------------------------------------------------------------------------------------------
def yol_cokgen(noktalar, kapali=True):
    p = skia.Path()
    if len(noktalar) == 0:
        return p
    p.moveTo(*map(float, noktalar[0]))
    for q in noktalar[1:]:
        p.lineTo(*map(float, q))
    if kapali:
        p.close()
    return p


def yol_egri(noktalar, kapali=True, gerilim=0.5):
    """Catmull-Rom eğrisi (noktalardan geçen yumuşak yol)."""
    pts = [tuple(map(float, q)) for q in noktalar]
    n = len(pts)
    p = skia.Path()
    if n < 2:
        return p
    p.moveTo(*pts[0])
    rng = range(n) if kapali else range(n - 1)
    for i in rng:
        p0 = pts[(i - 1) % n] if (kapali or i > 0) else pts[i]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if (kapali or i + 2 < n) else p2
        k = gerilim / 3.0 * 2.0
        c1 = (p1[0] + (p2[0] - p0[0]) * k / 2, p1[1] + (p2[1] - p0[1]) * k / 2)
        c2 = (p2[0] - (p3[0] - p1[0]) * k / 2, p2[1] - (p3[1] - p1[1]) * k / 2)
        p.cubicTo(*c1, *c2, *p2)
    if kapali:
        p.close()
    return p


def yol_daire(cx, cy, r):
    p = skia.Path()
    p.addCircle(float(cx), float(cy), float(max(r, 0.01)))
    return p


def yol_elips(cx, cy, rx, ry, aci=0.0):
    p = skia.Path()
    p.addOval(skia.Rect.MakeLTRB(cx - rx, cy - ry, cx + rx, cy + ry))
    if aci:
        p.transform(_skmat(M_bilesik(M_oteleme(cx, cy), M_donme(aci), M_oteleme(-cx, -cy))))
    return p


def yol_dikdortgen(x0, y0, x1, y1, r=0.0):
    p = skia.Path()
    if r > 0:
        p.addRRect(skia.RRect.MakeRectXY(skia.Rect.MakeLTRB(x0, y0, x1, y1), r, r))
    else:
        p.addRect(skia.Rect.MakeLTRB(x0, y0, x1, y1))
    return p


def yol_birlesim(*yollar):
    out = skia.Path()
    for y in yollar:
        out.addPath(y)
    return out


def yol_op(a, b, op='fark'):
    o = {'fark': skia.PathOp.kDifference_PathOp, 'kesisim': skia.PathOp.kIntersect_PathOp,
         'birlesim': skia.PathOp.kUnion_PathOp, 'xor': skia.PathOp.kXOR_PathOp}[op]
    r = skia.Op(a, b, o)
    return r if r is not None else skia.Path()


def yol_donustur(yol, M):
    p = skia.Path(yol)
    p.transform(_skmat(M))
    return p


def yol_serit(omurga, genislikler, kapali_uc=True):
    """Bir omurga boyunca genişliği değişen şerit (sap, uzuv, yaprak). genislikler: her nokta için yarı genişlik."""
    om = np.asarray(omurga, np.float64)
    n = len(om)
    if n < 2:
        return skia.Path()
    gen = np.broadcast_to(np.asarray(genislikler, np.float64), (n,))
    tan = np.gradient(om, axis=0)
    tan /= (np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9)
    nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
    sol = om + nor * gen[:, None]
    sag = om - nor * gen[:, None]
    pts = list(sol) + list(sag[::-1])
    return yol_egri(pts, kapali=True, gerilim=0.35)


def bezier_noktalar(p0, p1, p2, p3, n=24):
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2, p3 = map(lambda q: np.asarray(q, np.float64), (p0, p1, p2, p3))
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3


def damla_blob(cx, cy, r, tohum=0, duzensizlik=0.12, lob=7, n=48, rx=None, ry=None):
    """Organik, hafif dalgalı kapalı biçim."""
    rng = np.random.default_rng(tohum)
    fazlar = rng.uniform(0, 2 * math.pi, 4)
    a = np.linspace(0, 2 * math.pi, n, endpoint=False)
    rr = 1 + duzensizlik * (0.6 * np.sin(lob * a + fazlar[0]) + 0.3 * np.sin((lob + 3) * a + fazlar[1])
                            + 0.25 * np.sin(2 * a + fazlar[2]))
    rx = r if rx is None else rx
    ry = r if ry is None else ry
    pts = np.stack([cx + np.cos(a) * rx * rr, cy + np.sin(a) * ry * rr], 1)
    return yol_egri(pts, kapali=True, gerilim=0.5)


# ----------------------------------------------------------------------------------------------------------------
# tuval: kâğıt, lavi, katman
# ----------------------------------------------------------------------------------------------------------------
class Tuval:
    """Geçirgenlik (transmittance) tamponu. Kâğıt tuvali KAGIT renginden başlar; katmanlar 1'den."""

    def __init__(self, kagit=True, dolgu=None):
        if dolgu is not None:
            self.R = np.empty((H, W, 3), np.float32)
            self.R[:] = renk(dolgu)
        elif kagit:
            self.R = np.empty((H, W, 3), np.float32)
            self.R[:] = KAGIT
        else:
            self.R = np.ones((H, W, 3), np.float32)
        self.saklama = None
        self._yigin = []  # (alfa, maske_fn, M) görünürlük bağlamları

    # -- görünürlük bağlamı: içindeki bütün lavi/saklama/ışık çağrılarına opaklık ve açılma maskesi uygular ---------
    @contextmanager
    def gorunurluk(self, alfa=1.0, maske_fn=None, M=None):
        """with t.gorunurluk(0.5, acilma_radyal(...), M=Mnesne): ... — maske_fn, M'nin yerel koordinatlarında."""
        self._yigin.append((float(alfa), maske_fn, M))
        try:
            yield self
        finally:
            self._yigin.pop()

    def _yigin_alfa(self):
        a = 1.0
        for (al, _, _) in self._yigin:
            a *= al
        return a

    def _yigin_maske(self, m, k):
        for (_, f, Mc) in self._yigin:
            if f is None:
                continue
            Mi = np.linalg.inv(Mc if Mc is not None else np.eye(3))
            X, Y = self._yerel_izgara(Mi, k)
            m = f(m, X, Y).astype(np.float32)
        return m

    # -- saklama (önden arkaya boyarken öndeki biçimin arkası boş kalır) -----------------------------------------
    def sakla_ekle(self, yollar, M, yumusak=0.8, genislet=0.0, guc=1.0, maske=None):
        if self.saklama is None:
            self.saklama = np.zeros((H, W), np.float32)
        if isinstance(yollar, skia.Path):
            yollar = [yollar]
        if maske is not None:
            k, m = maske
        else:
            k = yollar_kirp(yollar, M, 4 + 3 * yumusak + genislet)
            if k.bos():
                return
            m = maske_ciz(yollar, M, k, cizgi=(2 * genislet if genislet > 0 else None))
            if genislet > 0:
                m = np.maximum(m, maske_ciz(yollar, M, k))
        if yumusak > 0:
            m = cv2.GaussianBlur(m, (0, 0), yumusak)
        if self._yigin:
            m = self._yigin_maske(m, k)
            guc = guc * self._yigin_alfa()
        sub = self.saklama[k.dilim]
        np.maximum(sub, np.clip(m * guc, 0, 1), out=sub)

    def sakla_maske(self, k: 'Kirp'):
        if self.saklama is None:
            return None
        return self.saklama[k.dilim]

    # -- temel lavi ------------------------------------------------------------------------------------------
    def lavi(self, yollar, M, renk_, yog=0.55, kenar=1.4, dalga=0.10, islak=0.55, islak_gen=4.0, gran=0.10,
             akis=0.12, tohum=0, yumusak=0.0, cizgi=None, maske_fn=None, yog_fn=None, renk_fn=None,
             pay=None, ince=0.0, lif=0.0, opak=False, dolgu_kurali=None, olcek_doku=1.0, kirp=None,
             maske=None, sakla=True):
        """Bir lavi (saydam boya geçişi).

        yollar: skia.Path ya da listesi (yerel koordinat), M: yerel->ekran 3x3.
        yog: yoğunluk (0..1), kenar: kenar yumuşatma (px), dalga: kenar gürültüsü, islak: ıslak kenar gücü,
        islak_gen: ıslak kenar bandı (px), gran: granülasyon, akis: renk dalgalanması, yumusak: ıslak-üstüne-ıslak
        dağılma (px, eşiksiz yumuşak kenar), cizgi: çizgi kalınlığı (yerel birim).
        maske_fn(m, X, Y) -> m: yerel koordinat ızgarasıyla maskeyi değiştirmek için (açılma, saklama ...).
        yog_fn(X, Y) -> yoğunluk çarpanı; renk_fn(X, Y) -> (h,w,3) renk.
        """
        if isinstance(yollar, skia.Path):
            yollar = [yollar]
        if pay is None:
            pay = 3 * max(kenar, yumusak, 1.0) + islak_gen + 6
        if maske is not None:
            k, m = maske
            m = m.astype(np.float32)
        else:
            k = kirp or yollar_kirp(yollar, M, pay)
            if k.bos():
                return
            m = maske_ciz(yollar, M, k, cizgi=cizgi, dolgu_kurali=dolgu_kurali)
        if m.max() <= 1e-4:
            return
        M_ters = np.linalg.inv(M)
        X = Y = None
        if maske_fn is not None or yog_fn is not None or renk_fn is not None:
            X, Y = self._yerel_izgara(M_ters, k)
        if maske_fn is not None:
            m = maske_fn(m, X, Y).astype(np.float32)
            if m.max() <= 1e-4:
                return
        if self._yigin:
            m = self._yigin_maske(m, k)
            yog = yog * self._yigin_alfa()
            if m.max() <= 1e-4 or yog <= 1e-4:
                return
        if sakla and self.saklama is not None:
            m = m * (1.0 - self.saklama[k.dilim])
            if m.max() <= 1e-4:
                return
        olc = 1.0 / max(1e-6, olcek_doku)
        kay = ((tohum * 197.3) % N, (tohum * 89.7) % N)
        if yumusak > 0:
            mb = cv2.GaussianBlur(m, (0, 0), yumusak) if yumusak < 12 else _genis_bulanik(m, yumusak)
            if dalga > 0:
                g = _doku_ornekle(G_KENAR, M_ters, k.x0, k.y0, k.w, k.h, olc, kay)
                mb = np.clip(mb * (1 + dalga * 1.5 * g), 0, 1)
            m2 = mb
        else:
            mb = cv2.GaussianBlur(m, (0, 0), kenar) if kenar > 0.05 else m
            if dalga > 0:
                g = _doku_ornekle(G_KENAR, M_ters, k.x0, k.y0, k.w, k.h, olc, kay)
                mb = mb + dalga * g * (4.0 * mb * (1.0 - mb) + 0.02)
            gen = 0.16 + 0.05 * kenar
            m2 = smoothstep(0.5 - gen, 0.5 + gen, mb)
        if opak:
            D = m2 * yog
        else:
            D = m2.copy()
            if islak > 0:
                b = cv2.GaussianBlur(m2, (0, 0), islak_gen)
                E = np.clip(m2 - b, 0, 1)
                E = np.clip(E * 2.2, 0, 1)
                D *= 1.0 + islak * E
            if gran > 0:
                D *= np.clip(1.0 + gran * GRAN[k.dilim], 0.2, 2.2)
            if akis > 0:
                f = _doku_ornekle(G_AKIS, M_ters, k.x0, k.y0, k.w, k.h, olc, (kay[1], kay[0]))
                D *= np.clip(1.0 + akis * f, 0.3, 1.9)
            if ince > 0:
                f2 = _doku_ornekle(G_INCE, M_ters, k.x0, k.y0, k.w, k.h, olc, kay)
                D *= np.clip(1.0 + ince * f2, 0.3, 1.8)
            if lif > 0:
                f3 = _doku_ornekle(G_LIF, M_ters, k.x0, k.y0, k.w, k.h, olc, kay)
                D *= np.clip(1.0 + lif * f3, 0.3, 1.8)
            D *= yog
        if yog_fn is not None:
            D *= yog_fn(X, Y)
        np.clip(D, 0.0, 1.0, out=D)
        if renk_fn is not None:
            C = renk_fn(X, Y).astype(np.float32)
        else:
            C = renk(renk_)
        hedef = self.R[k.dilim]
        if opak:
            hedef *= (1.0 - D[..., None])
            hedef += D[..., None] * C
        else:
            hedef *= 1.0 - D[..., None] * (1.0 - C)

    @staticmethod
    def _yerel_izgara(M_ters, k):
        xs = np.arange(k.x0, k.x0 + k.w, dtype=np.float32) + 0.5
        ys = np.arange(k.y0, k.y0 + k.h, dtype=np.float32) + 0.5
        XX, YY = np.meshgrid(xs, ys)
        X = M_ters[0, 0] * XX + M_ters[0, 1] * YY + M_ters[0, 2]
        Y = M_ters[1, 0] * XX + M_ters[1, 1] * YY + M_ters[1, 2]
        return X.astype(np.float32), Y.astype(np.float32)

    # -- tam ekran degrade lavi (gök) ---------------------------------------------------------------------------
    def degrade_lavi(self, duraklar, yog=1.0, gran=0.12, akis=0.10, M=None, tohum=0, maske=None, eksen='y',
                     kirp=None, dunya_y=False):
        """duraklar: [(konum 0..1 ekran boyunca, renk, yoğunluk), ...]. maske: (h,w) saklama (1=boya)."""
        k = kirp or Kirp(0, 0, W, H)
        ys = (np.arange(k.y0, k.y0 + k.h, dtype=np.float32) + 0.5) / H
        xs = (np.arange(k.x0, k.x0 + k.w, dtype=np.float32) + 0.5) / W
        if dunya_y and M is not None:
            # degrade dünyaya bağlı: ekran satırının dünya y'si (dönmesiz kamera varsayımı)
            ys = ((ys * H - M[1, 2]) / M[1, 1]) / H
        konum = ys if eksen == 'y' else xs
        ks = np.array([d[0] for d in duraklar], np.float32)
        cs = np.stack([renk(d[1]) for d in duraklar])
        ds = np.array([d[2] for d in duraklar], np.float32)
        C = np.stack([np.interp(konum, ks, cs[:, i]) for i in range(3)], -1)
        Dd = np.interp(konum, ks, ds)
        if eksen == 'y':
            C = np.broadcast_to(C[:, None, :], (k.h, k.w, 3))
            D = np.broadcast_to(Dd[:, None], (k.h, k.w)).copy()
        else:
            C = np.broadcast_to(C[None, :, :], (k.h, k.w, 3))
            D = np.broadcast_to(Dd[None, :], (k.h, k.w)).copy()
        M = np.eye(3) if M is None else M
        M_ters = np.linalg.inv(M)
        kay = ((tohum * 197.3) % N, (tohum * 89.7) % N)
        if akis > 0:
            f = _doku_ornekle(G_AKIS, M_ters, k.x0, k.y0, k.w, k.h, 0.7, kay)
            D *= np.clip(1.0 + akis * f, 0.3, 1.9)
        if gran > 0:
            D *= np.clip(1.0 + gran * GRAN[k.dilim], 0.2, 2.2)
        if maske is not None:
            D *= maske
        if self.saklama is not None:
            D *= 1.0 - self.saklama[k.dilim]
        if self._yigin:
            D = self._yigin_maske(D, k)
            yog = yog * self._yigin_alfa()
        D *= yog
        np.clip(D, 0, 1, out=D)
        self.R[k.dilim] *= 1.0 - D[..., None] * (1.0 - C)

    # -- ışık (dijital suluboyada ölçülü parıltı) -----------------------------------------------------------------
    def isik(self, yollar, M, renk_, guc=0.5, yumusak=30.0, maske=None):
        if isinstance(yollar, skia.Path):
            yollar = [yollar]
        if maske is not None:
            k, m = maske
        else:
            k = yollar_kirp(yollar, M, 3 * yumusak + 4)
            if k.bos():
                return
            m = maske_ciz(yollar, M, k)
        if self._yigin:
            m = self._yigin_maske(m, k)
            guc = guc * self._yigin_alfa()
        if yumusak > 0:
            m = _genis_bulanik(m, yumusak) if yumusak >= 12 else cv2.GaussianBlur(m, (0, 0), yumusak)
        C = renk(renk_)
        a = np.clip(m * guc, 0, 1)[..., None]
        hedef = self.R[k.dilim]
        hedef[:] = 1.0 - (1.0 - hedef) * (1.0 - a * C)

    def kaldir(self, yollar, M, miktar=0.8, yumusak=6.0, maske=None, halka=0.25, halka_gen=5.0, tohum=0):
        """Boyayı kaldırma (ıslak süngerle açma). Kenarında hafif geri akış halkası."""
        if isinstance(yollar, skia.Path):
            yollar = [yollar]
        if maske is not None:
            k, m = maske
        else:
            k = yollar_kirp(yollar, M, 3 * yumusak + halka_gen + 6)
            if k.bos():
                return
            m = maske_ciz(yollar, M, k)
        M_ters = np.linalg.inv(M)
        kay = ((tohum * 197.3) % N, (tohum * 89.7) % N)
        mb = cv2.GaussianBlur(m, (0, 0), yumusak) if yumusak > 0 else m
        g = _doku_ornekle(G_KENAR, M_ters, k.x0, k.y0, k.w, k.h, 1.0, kay)
        mb = np.clip(mb + 0.12 * g * 4 * mb * (1 - mb), 0, 1)
        hedef = self.R[k.dilim]
        if halka > 0:
            b = cv2.GaussianBlur(mb, (0, 0), halka_gen)
            ring = np.clip((b - mb) * 3.0, 0, 1)
            hedef *= (1.0 - halka * ring[..., None] * (1.0 - hedef) * 1.5).clip(0.5, 1)
        a = (mb * miktar)[..., None]
        hedef += (KAGIT - hedef) * a

    # -- katman birleştirme -------------------------------------------------------------------------------------
    def katman_bindir(self, katman: 'Tuval', opaklik=1.0, bulanik=0.0, M=None):
        T = katman.R
        if M is not None:
            T = cv2.warpAffine(T, M[:2].astype(np.float32), (W, H), flags=cv2.INTER_LINEAR,
                               borderMode=cv2.BORDER_CONSTANT, borderValue=(1, 1, 1))
        if bulanik > 0:
            T = _genis_bulanik(T, bulanik) if bulanik >= 12 else cv2.GaussianBlur(T, (0, 0), bulanik)
        if opaklik >= 0.999:
            self.R *= T
        else:
            self.R *= 1.0 - opaklik * (1.0 - T)


def _genis_bulanik(m, sigma):
    """Büyük sigmalı Gauss: küçült - bulanıklaştır - büyüt."""
    f = max(1, int(sigma // 6))
    h, w = m.shape[:2]
    if f <= 1:
        return cv2.GaussianBlur(m, (0, 0), sigma)
    sm = cv2.resize(m, (max(1, w // f), max(1, h // f)), interpolation=cv2.INTER_AREA)
    sm = cv2.GaussianBlur(sm, (0, 0), sigma / f)
    return cv2.resize(sm, (w, h), interpolation=cv2.INTER_LINEAR)


# ----------------------------------------------------------------------------------------------------------------
# açılma (boyanın yayılarak gelmesi) ve saklama yardımcıları
# ----------------------------------------------------------------------------------------------------------------
def acilma_radyal(ilerleme, cx, cy, R, dalga=0.18, on=0.10, tohum=0):
    """maske_fn: (cx,cy) yerel noktasından R yarıçapına yayılan, kenarı organik açılma.
    ilerleme 0 -> görünmez, 1 -> tamamen açık."""
    kay = ((tohum * 131.7) % N, (tohum * 71.3) % N)

    def f(m, X, Y):
        if ilerleme >= 1.0:
            return m
        if ilerleme <= 0.0:
            return m * 0
        d = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2) / max(R, 1e-6)
        g = _gurultu_yerel(X, Y, kay)
        d = d + dalga * g
        r = ilerleme * (1.0 + dalga * 2.5 + on)
        return m * (1.0 - smoothstep(r - on, r, d))
    return f


def acilma_yonlu(ilerleme, x0, y0, dx, dy, L, dalga=0.15, on=0.08, tohum=0):
    kay = ((tohum * 131.7) % N, (tohum * 71.3) % N)
    nn = math.hypot(dx, dy) + 1e-9
    ux, uy = dx / nn, dy / nn

    def f(m, X, Y):
        if ilerleme >= 1.0:
            return m
        if ilerleme <= 0.0:
            return m * 0
        d = ((X - x0) * ux + (Y - y0) * uy) / max(L, 1e-6)
        d = d + dalga * _gurultu_yerel(X, Y, kay)
        r = ilerleme * (1.0 + dalga * 2.5 + on) - dalga
        return m * (1.0 - smoothstep(r - on, r, d))
    return f


def maske_zinciri(*fs):
    fs = [f for f in fs if f is not None]

    def f(m, X, Y):
        for g in fs:
            m = g(m, X, Y)
        return m
    return f if fs else None


def _gurultu_yerel(X, Y, kay=(0, 0), olcek=0.35):
    xi = (X * olcek + kay[0]) % N
    yi = (Y * olcek + kay[1]) % N
    return cv2.remap(G_AKIS, xi.astype(np.float32), yi.astype(np.float32), cv2.INTER_LINEAR,
                     borderMode=cv2.BORDER_WRAP)


# ----------------------------------------------------------------------------------------------------------------
# kamera
# ----------------------------------------------------------------------------------------------------------------
@dataclass
class Kamera:
    x: float = W / 2
    y: float = H / 2
    zum: float = 1.0
    aci: float = 0.0

    def M(self, derinlik=1.0, ref=None):
        """Dünya -> ekran. derinlik<1 uzak katmanlar (daha az kayar ve büyür)."""
        ref = ref or (W / 2, H / 2)
        cx = ref[0] + (self.x - ref[0]) * derinlik
        cy = ref[1] + (self.y - ref[1]) * derinlik
        z = 1.0 + (self.zum - 1.0) * derinlik if self.zum >= 1 else self.zum ** derinlik
        return M_bilesik(M_oteleme(W / 2, H / 2), M_donme(self.aci * derinlik), M_olcek(z), M_oteleme(-cx, -cy))


def kamera_karistir(a: Kamera, b: Kamera, t: float) -> Kamera:
    # zum logaritmik karışır (algısal olarak düzgün)
    z = math.exp(lerp(math.log(a.zum), math.log(b.zum), t))
    return Kamera(lerp(a.x, b.x, t), lerp(a.y, b.y, t), z, lerp(a.aci, b.aci, t))


# ----------------------------------------------------------------------------------------------------------------
# son işlem: kâğıt kabartması, hafif kenar kararması, çıktı
# ----------------------------------------------------------------------------------------------------------------
_VIN = None


def _vinyet():
    global _VIN
    if _VIN is None:
        ys = (np.arange(H, dtype=np.float32) + 0.5) / H - 0.5
        xs = (np.arange(W, dtype=np.float32) + 0.5) / W - 0.5
        XX, YY = np.meshgrid(xs, ys)
        r = np.sqrt((XX * 1.15) ** 2 + (YY * 0.82) ** 2)
        _VIN = (1.0 - 0.07 * smoothstep(0.32, 0.78, r)).astype(np.float32)
    return _VIN


def son_islem(R, kabartma=0.032, leke=0.010, vinyet=True):
    out = R * (1.0 + kabartma * KABARTMA[..., None]) * (1.0 + leke * LEKE[..., None])
    if vinyet:
        out *= _vinyet()[..., None]
    return np.clip(out, 0, 1)


def rgb8(R):
    return (np.clip(R, 0, 1) * 255.0 + 0.5).astype(np.uint8)


# ----------------------------------------------------------------------------------------------------------------
# geçişler
# ----------------------------------------------------------------------------------------------------------------
_EKRAN_IZGARA = None


def _ekran_izgara():
    global _EKRAN_IZGARA
    if _EKRAN_IZGARA is None:
        ys = (np.arange(H, dtype=np.float32) + 0.5)
        xs = (np.arange(W, dtype=np.float32) + 0.5)
        _EKRAN_IZGARA = np.meshgrid(xs, ys)
    return _EKRAN_IZGARA


def gecis_boya(Ra, Rb, ilerleme, yon=(0.0, 1.0), dalga=0.10, on=0.06, kenar_koyu=0.10, tohum=0, merkez=None):
    """Islak bir lavinin kâğıt boyunca akıp yeni resmi getirmesi. yon: akış yönü (ekran), merkez verilirse
    radyal (merkezden dışa). Ön çizgide yeni resim tarafında ince pigment birikimi."""
    if ilerleme <= 0:
        return Ra.copy()
    if ilerleme >= 1:
        return Rb.copy()
    X, Y = _ekran_izgara()
    if merkez is not None:
        d = np.sqrt((X - merkez[0]) ** 2 + (Y - merkez[1]) ** 2) / math.hypot(W, H)
        d = d / 0.75
    else:
        ux, uy = yon
        n = math.hypot(ux, uy) + 1e-9
        ux, uy = ux / n, uy / n
        d = (X * ux + Y * uy)
        dmin = min(0, W * ux) + min(0, H * uy)
        dmax = max(0, W * ux) + max(0, H * uy)
        d = (d - dmin) / (dmax - dmin)
    kay = ((tohum * 131.7) % N, (tohum * 71.3) % N)
    g = cv2.remap(G_AKIS, ((X * 0.5 + kay[0]) % N).astype(np.float32), ((Y * 0.5 + kay[1]) % N).astype(np.float32),
                  cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    d = d + dalga * g
    r = ilerleme * (1 + 2.5 * dalga + on) - 1.25 * dalga
    m = 1.0 - smoothstep(r - on, r, d)  # 1: yeni resim
    bant = np.exp(-((d - (r - on * 0.35)) / (on * 0.45)) ** 2) * m
    out = Ra * (1 - m[..., None]) + Rb * m[..., None]
    out *= (1.0 - kenar_koyu * bant[..., None] * (1.0 - out) * 2.0)
    return out


def gecis_soluk(Ra, Rb, ilerleme):
    t = min(1.0, max(0.0, ilerleme))
    return Ra * (1 - t) + Rb * t


def ufuk_M(cam: 'Kamera', derinlik, ufuk_y):
    """Uzak katman matrisi: katman ufuk çizgisine yapışık kalır (kubbe, tepeler, gök yerden kopmaz); yatay
    kaymada ve zumda daha az hareket eder (paralaks)."""
    ana = cam.M(1.0)
    hy = float((ana @ np.array([cam.x, ufuk_y, 1.0]))[1])
    zd = 1.0 + (cam.zum - 1.0) * derinlik if cam.zum >= 1 else cam.zum ** derinlik
    cx = W / 2 + (cam.x - W / 2) * derinlik
    return np.array([[zd, 0.0, W / 2 - zd * cx], [0.0, zd, hy - zd * ufuk_y], [0, 0, 1.0]], np.float64)
