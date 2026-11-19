"""DOĞA ÖĞELERİ (geçici başlık — ayrıntılı belge en sonda güncellenecek)."""
from __future__ import annotations

import math

import cv2
import numpy as np
import skia

from motor import (Tuval, Kirp, W, H, N, yollar_kirp, yol_egri, yol_cokgen, yol_daire, yol_elips, yol_dikdortgen,
                   yol_serit, yol_op, M_bilesik, M_oteleme, M_olcek, M_donme, renk, smoothstep, sstep, _skmat,
                   _doku_ornekle, _genis_bulanik, G_KENAR, G_AKIS, GRAN, KAGIT, nokta_donustur)
import elemanlar as EL

# ================================================================================================================
# yerel boyama katmanı: bir nesnenin bütün geçişleri kendi kırpıntısında birikir, tuvale tek seferde basılır
# ================================================================================================================


def _kirp_kes(a: Kirp, b: Kirp) -> Kirp:
    x0, y0 = max(a.x0, b.x0), max(a.y0, b.y0)
    x1, y1 = min(a.x0 + a.w, b.x0 + b.w), min(a.y0 + a.h, b.y0 + b.h)
    return Kirp(x0, y0, max(0, x1 - x0), max(0, y1 - y0))


def _poly(pts, kapali=True):
    """numpy (n,2) -> skia.Path (düz parçalar, hızlı)."""
    p = skia.Path()
    if len(pts) < 2:
        return p
    p.addPoly([skia.Point(float(x), float(y)) for x, y in pts], kapali)
    return p


def _rast(yollar, M, k: Kirp, toplam=False, alfalar=None, cizgi=None, gradyanlar=None):
    """Yolları A8 maskeye çizer. toplam=True: üst üste binen yollar toplanır (en çok 8 kat), alfalar: yol başına
    ağırlık, gradyanlar: yol başına (x0, y0, x1, y1, a0, a1) yerel doğrusal ağırlık geçişi ya da None."""
    s = skia.Surface.MakeRaster(skia.ImageInfo.MakeA8(k.w, k.h))
    c = s.getCanvas()
    c.setMatrix(_skmat(M_oteleme(-k.x0, -k.y0) @ M))
    p = skia.Paint(AntiAlias=True)
    if cizgi is not None:
        p.setStyle(skia.Paint.kStroke_Style)
        p.setStrokeWidth(float(cizgi))
        p.setStrokeCap(skia.Paint.kRound_Cap)
        p.setStrokeJoin(skia.Paint.kRound_Join)
    if toplam:
        p.setBlendMode(skia.BlendMode.kPlus)
    for i, y in enumerate(yollar):
        a = 1.0 if alfalar is None else float(alfalar[i])
        if a <= 0.004:
            continue
        gr = None if gradyanlar is None else gradyanlar[i]
        if gradyanlar is not None and gr is None:
            gr = (0, 0, 1, 0, 1.0, 1.0)
        if gr is not None:
            x0, y0, x1, y1, a0, a1 = gr
            p.setShader(skia.GradientShader.MakeLinear(
                [skia.Point(float(x0), float(y0)), skia.Point(float(x1), float(y1))],
                [skia.Color4f(0, 0, 0, float(min(1, max(0, a0)))).toColor(),
                 skia.Color4f(0, 0, 0, float(min(1, max(0, a1)))).toColor()]))
        p.setAlphaf(min(1.0, a * (0.125 if toplam else 1.0)))
        c.drawPath(y, p)
    a = s.makeImageSnapshot().toarray().astype(np.float32)
    a *= (8.0 / 255.0) if toplam else (1.0 / 255.0)
    return a


class _Boya:
    """Bir nesnenin yerel boyaması. Geçişler (lavi) nesne kırpıntısındaki geçirgenlik tamponunda (T) birikir;
    nesne içi saklama S ile önden arkaya boyanır; bitir() tuvale bir kez çarpar (tuvalin saklaması ve görünürlük
    yığını uygulanır) ve silüeti tuvalin saklamasına yazar. Motorun lavi zincirinin aynısı (eşik + kenar
    gürültüsü, ıslak kenar, granülasyon, akış), ama tek kırpıntıda ve üst üste binen biçimlerin koyulaşmasıyla."""

    def __init__(self, t: Tuval, M, kirp: Kirp, tohum=0, olcek_doku=1.0):
        self.t, self.M, self.k = t, np.asarray(M, np.float64), kirp
        self.Mi = np.linalg.inv(self.M)
        h, w = kirp.h, kirp.w
        self.T = np.ones((3, h, w), np.float32)  # düzlemsel geçirgenlik (kanal başına bitişik)
        self.S = np.zeros((h, w), np.float32)
        self.SIL = np.zeros((h, w), np.float32)
        self.olc = 1.0 / max(1e-6, olcek_doku)
        self.kay = ((tohum * 197.3 + 11) % N, (tohum * 89.7 + 7) % N)
        self._gk = self._ga = self._gr = self._xy = None

    # -- tembel dokular -------------------------------------------------------------------------------------
    @property
    def gk(self):
        if self._gk is None:
            k = self.k
            self._gk = _doku_ornekle(G_KENAR, self.Mi, k.x0, k.y0, k.w, k.h, self.olc, self.kay)
        return self._gk

    def _yumusak_doku(self, doku, olc, kay, f=4):
        """Düşük frekanslı dokuyu 1/f çözünürlükte örnekleyip büyütür (hız)."""
        k = self.k
        w, h = max(2, (k.w + f - 1) // f), max(2, (k.h + f - 1) // f)
        A = np.array([[f, 0, k.x0 + 0.5 * f - 0.5], [0, f, k.y0 + 0.5 * f - 0.5], [0, 0, 1]], np.float64)
        S = np.array([[olc, 0, kay[0]], [0, olc, kay[1]], [0, 0, 1]], np.float64)
        T = S @ self.Mi @ A
        sm = cv2.warpAffine(doku, T[:2].astype(np.float32), (w, h), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                            borderMode=cv2.BORDER_WRAP)
        big = cv2.resize(sm, (w * f, h * f), interpolation=cv2.INTER_LINEAR)
        return np.ascontiguousarray(big[:k.h, :k.w])

    @property
    def ga(self):
        if self._ga is None:
            self._ga = self._yumusak_doku(G_AKIS, self.olc, (self.kay[1], self.kay[0]))
        return self._ga

    @property
    def gr(self):
        if self._gr is None:
            self._gr = self._yumusak_doku(G_AKIS, self.olc * 0.55, (self.kay[0] * 0.37 + 300, self.kay[1] * 0.61 + 500))
        return self._gr

    def xy_dilim(self, sl):
        """Alt kırpıntının nesne-yerel koordinatları (X, Y)."""
        k, Mi = self.k, self.Mi
        xs = (np.arange(sl[1].start, sl[1].stop, dtype=np.float32) + k.x0 + 0.5)[None, :]
        ys = (np.arange(sl[0].start, sl[0].stop, dtype=np.float32) + k.y0 + 0.5)[:, None]
        X = np.float32(Mi[0, 0]) * xs + np.float32(Mi[0, 1]) * ys + np.float32(Mi[0, 2])
        Y = np.float32(Mi[1, 0]) * xs + np.float32(Mi[1, 1]) * ys + np.float32(Mi[1, 2])
        return X, Y

    def alt(self, yollar, Mloc, pay):
        kk = _kirp_kes(yollar_kirp(yollar, Mloc, pay), self.k)
        oy, ox = kk.y0 - self.k.y0, kk.x0 - self.k.x0
        return kk, (slice(oy, oy + kk.h), slice(ox, ox + kk.w))

    # -- geçiş ------------------------------------------------------------------------------------------------
    def _tmp(self, i, shape):
        """Geçici tampon (kırpıntı boyunda, yeniden kullanılır)."""
        if not hasattr(self, '_tamp'):
            self._tamp = {}
        key = (i, len(shape))
        buf = self._tamp.get(key)
        if buf is None:
            buf = np.empty((self.k.h, self.k.w) + tuple(shape[2:]), np.float32)
            self._tamp[key] = buf
        return buf[:shape[0], :shape[1]]

    def _carpan(self, tur, miktar, sl):
        """(1 + miktar*doku) çarpanı, nesne başına önbellekli (granülasyon ekrana, akış nesneye bağlı)."""
        if not hasattr(self, '_carp'):
            self._carp = {}
        key = (tur, round(float(miktar), 4))
        c = self._carp.get(key)
        if c is None:
            if tur == 'gran':
                c = np.clip(1.0 + miktar * GRAN[self.k.dilim], 0.2, 2.2).astype(np.float32)
            else:
                c = np.clip(1.0 + miktar * self.ga, 0.3, 1.9).astype(np.float32)
            self._carp[key] = c
        return c[sl]

    def lavi(self, yollar, renk_, yog=0.5, Mloc=None, kenar=1.0, dalga=0.08, islak=0.8, islak_gen=3.0, gran=0.10,
             akis=0.15, yumusak=0.0, cizgi=None, toplam=False, alfalar=None, ust=0.8, renk2=None, karisim=None,
             yog_fn=None, sakla=True, siluet=True, pay=None, esik=True, gradyanlar=None, isik_kenar=None):
        """toplam: üst üste binen yollar koyulaşır (her biri kendi ıslak kenarıyla). alfalar: yol ağırlıkları.
        gradyanlar: yol başına doğrusal ağırlık geçişi (yavaş). isik_kenar=(dx, dy, miktar): ekran pikseli
        cinsinden ışık yönü kaydırması; her biçimin ışığa bakan kenar bandı açık kalır (hızlı hacim). renk2 + karisim ('akis' ya da f(X,Y)->0..1): iki pigment
        ıslak karışımı. yog_fn(X,Y): nesne yerelinde yoğunluk çarpanı. Döner: (dilim, kenar maskesi) ya da None."""
        if isinstance(yollar, skia.Path):
            yollar = [yollar]
        if not yollar:
            return None
        Mloc = self.M if Mloc is None else Mloc
        if pay is None:
            pay = 3 * max(kenar, yumusak, 1.0) + islak_gen + 5
        kk, sl = self.alt(yollar, Mloc, pay)
        if kk.bos():
            return None
        if toplam or alfalar is not None or gradyanlar is not None:
            Wm = _rast(yollar, Mloc, kk, toplam=toplam, alfalar=alfalar, cizgi=cizgi, gradyanlar=gradyanlar)
            if Wm.max() <= 1e-3:
                return None
            if alfalar is None and gradyanlar is None:
                G = np.minimum(Wm, 1.0)
            else:
                G = _rast(yollar, Mloc, kk, cizgi=cizgi)
        else:
            G = _rast(yollar, Mloc, kk, cizgi=cizgi)
            Wm = None
            if G.max() <= 1e-3:
                return None
        shp = G.shape
        if yumusak > 0:
            mb = cv2.GaussianBlur(G, (0, 0), yumusak) if yumusak < 12 else _genis_bulanik(G, yumusak)
            if dalga > 0:
                t1 = np.multiply(self.gk[sl], dalga * 1.5, out=self._tmp(0, shp))
                t1 += 1.0
                mb *= t1
            np.clip(mb, 0, 1, out=mb)
            m2 = mb
        else:
            mb = cv2.GaussianBlur(G, (0, 0), kenar) if kenar > 0.05 else G.copy()
            if dalga > 0:
                t1 = np.subtract(1.0, mb, out=self._tmp(0, shp))
                t1 *= mb
                t1 *= 4.0 * dalga
                t1 += 0.02 * dalga
                t1 *= self.gk[sl]
                mb += t1
            if esik:
                g_ = 0.16 + 0.05 * kenar
                mb -= 0.5 - g_
                mb *= 1.0 / (2 * g_)
                np.clip(mb, 0, 1, out=mb)
                t1 = np.multiply(mb, mb, out=self._tmp(0, shp))
                mb *= -2.0
                mb += 3.0
                mb *= t1
            else:
                np.clip(mb, 0, 1, out=mb)
            m2 = mb
        kapsama = m2
        if Wm is not None:
            D = cv2.GaussianBlur(Wm, (0, 0), max(0.6, kenar * 0.8))
            if alfalar is not None or gradyanlar is not None:
                kapsama = np.minimum(D, 1.0)
                kapsama *= m2
            if toplam and ust > 0:
                t1 = np.subtract(D, 1.0, out=self._tmp(0, shp))
                np.maximum(t1, 0.0, out=t1)
                t1 *= ust
                np.minimum(D, 1.0, out=D)
                D += t1
            else:
                np.minimum(D, 1.0, out=D)
            D *= m2
        else:
            D = m2.copy()
        if isik_kenar is not None:
            dx, dy, mik = isik_kenar
            dx, dy = int(round(dx)), int(round(dy))
            src = Wm if Wm is not None else G
            sh = np.zeros_like(src)
            hh, ww = src.shape
            # sh(p) = src(p + (dx, dy))
            ys0, ys1 = max(0, -dy), min(hh, hh - dy)
            xs0, xs1 = max(0, -dx), min(ww, ww - dx)
            if ys1 > ys0 and xs1 > xs0:
                sh[ys0:ys1, xs0:xs1] = src[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx]
            np.subtract(src, sh, out=sh)
            np.clip(sh, 0, 1, out=sh)
            sg = max(1.0, 0.45 * math.hypot(dx, dy))
            sh = cv2.GaussianBlur(sh, (0, 0), sg)
            sh *= -mik
            sh += 1.0
            D *= sh
        if islak > 0:
            b = cv2.GaussianBlur(D, (0, 0), islak_gen)
            np.subtract(D, b, out=b)
            b *= 2.2
            np.clip(b, 0, 1, out=b)
            b *= islak
            b += 1.0
            D *= b
        if gran > 0:
            D *= self._carpan('gran', gran, sl)
        if akis > 0:
            D *= self._carpan('akis', akis, sl)
        if yog_fn is not None:
            X, Y = self.xy_dilim(sl)
            D *= yog_fn(X, Y)
        D *= yog
        if sakla:
            t1 = np.subtract(1.0, self.S[sl], out=self._tmp(0, shp))
            D *= t1
        np.clip(D, 0.0, 1.0, out=D)
        C = renk(renk_)
        a = (C - 1.0).astype(np.float32)
        t1 = self._tmp(0, shp)
        if renk2 is not None:
            if karisim is None or karisim == 'akis':
                if not hasattr(self, '_kf'):
                    self._kf = smoothstep(-0.9, 0.9, self.gr).astype(np.float32)
                f = self._kf[sl]
            else:
                X, Y = self.xy_dilim(sl)
                f = np.clip(np.broadcast_to(karisim(X, Y), shp), 0, 1).astype(np.float32)
            bb = (renk(renk2) - C).astype(np.float32)
            for c in range(3):
                np.multiply(f, bb[c], out=t1)
                t1 += a[c]
                t1 *= D
                t1 += 1.0
                self.T[c][sl] *= t1
        else:
            for c in range(3):
                np.multiply(D, a[c], out=t1)
                t1 += 1.0
                self.T[c][sl] *= t1
        if siluet:
            np.maximum(self.SIL[sl], kapsama, out=self.SIL[sl])
        return (sl, kapsama)

    def sakla(self, iz, yumusak=0.6):
        """iz: lavi()'nin döndürdüğü (dilim, maske)."""
        if iz is None:
            return
        sl, m = iz
        if yumusak > 0:
            m = cv2.GaussianBlur(m, (0, 0), yumusak)
        np.maximum(self.S[sl], m, out=self.S[sl])

    def sakla_yol(self, yollar, Mloc=None, yumusak=0.6):
        Mloc = self.M if Mloc is None else Mloc
        if isinstance(yollar, skia.Path):
            yollar = [yollar]
        kk, sl = self.alt(yollar, Mloc, 3 + 3 * yumusak)
        if kk.bos():
            return
        self.sakla((sl, _rast(yollar, Mloc, kk)), yumusak)

    def isik(self, yollar, renk_, guc=0.5, yumusak=2.0, Mloc=None):
        """Küçük parıltı (screen) — tamponda değil, bitir()'den sonra çağrılmak üzere listeye eklenir."""
        Mloc = self.M if Mloc is None else Mloc
        if not hasattr(self, '_isiklar'):
            self._isiklar = []
        self._isiklar.append((yollar, Mloc, renk_, guc, yumusak))

    def bitir(self, sakla_sonra=True, sakla_global=True, siluet_yumusak=0.7):
        t, k = self.t, self.k
        # yalnız boyanan bölge (silüet kutusu)
        sat = np.flatnonzero(self.SIL.max(1) > 1e-4)
        sut = np.flatnonzero(self.SIL.max(0) > 1e-4)
        if len(sat) and len(sut):
            pay = int(4 + siluet_yumusak * 3)
            y0, y1 = max(0, sat[0] - pay), min(k.h, sat[-1] + pay + 1)
            x0, x1 = max(0, sut[0] - pay), min(k.w, sut[-1] + pay + 1)
            kk = Kirp(k.x0 + x0, k.y0 + y0, x1 - x0, y1 - y0)
            T = cv2.merge([np.ascontiguousarray(self.T[c, y0:y1, x0:x1]) for c in range(3)])
            SIL = self.SIL[y0:y1, x0:x1]
            vis = None
            if sakla_global and t.saklama is not None:
                vis = 1.0 - t.saklama[kk.dilim]
            if t._yigin:
                v0 = vis if vis is not None else np.ones((kk.h, kk.w), np.float32)
                vis = t._yigin_maske(v0, kk) * t._yigin_alfa()
            hedef = t.R[kk.dilim]
            if vis is None:
                hedef *= T
            else:
                T -= 1.0
                T *= vis[..., None]
                T += 1.0
                hedef *= T
            if sakla_sonra:
                t.sakla_ekle([], self.M, yumusak=siluet_yumusak, maske=(kk, np.ascontiguousarray(SIL)))
        for (yollar, Mloc, renk_, guc, yumusak) in getattr(self, '_isiklar', []):
            t.isik(yollar, Mloc, renk_, guc=guc, yumusak=yumusak)


def _boya_ac(t, M, yollar_kutu, pay=12, tohum=0):
    """Yerel kutudan (x0,y0,x1,y1 yerel) ekran kırpıntısı ve _Boya; ekran dışıysa None."""
    x0, y0, x1, y1 = yollar_kutu
    k = yollar_kirp([yol_dikdortgen(x0, y0, x1, y1)], M, pay)
    if k.bos():
        return None
    return _Boya(t, M, k, tohum)


# ================================================================================================================
# küçük geometri yardımcıları
# ================================================================================================================
def _yon(theta):
    """Dikey-yukarıdan saat yönünde açı (radyan) -> birim vektör (y aşağı)."""
    return math.sin(theta), -math.cos(theta)


def _serit_np(om, gen):
    """omurga (n,2) ve yarı genişlikler (n,) -> kapalı çokgen noktaları (yuvarlak uçlu)."""
    om = np.asarray(om, np.float64)
    n = len(om)
    if n < 2:
        return None
    tan = np.gradient(om, axis=0)
    tan /= (np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9)
    nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
    g = np.asarray(gen, np.float64)[:, None]
    sol = om + nor * g
    sag = om - nor * g
    # uç: yarım daire
    a = np.linspace(0, math.pi, 7)[1:-1]
    tu, nu, gu = tan[-1], nor[-1], g[-1, 0]
    uc = [om[-1] + (nu * math.cos(x) + tu * math.sin(x)) * gu for x in a]
    return np.concatenate([sol, np.array(uc).reshape(-1, 2), sag[::-1]], 0)


def _yaprak_np(x, y, L, gen, aci, kivrim=0.0, n=10):
    """Sivri uçlu yaprak noktaları (taban x,y; aci derece, 0 = +x)."""
    a = math.radians(aci)
    ux, uy = math.cos(a), math.sin(a)
    nx, ny = -uy, ux
    u = np.linspace(0, 1, n + 1)
    w = gen * np.sin(u * math.pi) ** 0.8 * (1 - 0.3 * u)
    k = kivrim * np.sin(u * math.pi) * L
    px = x + ux * L * u + nx * k
    py = y + uy * L * u + ny * k
    sol = np.stack([px + nx * w, py + ny * w], 1)
    sag = np.stack([px - nx * w, py - ny * w], 1)[::-1][1:-1]
    return np.concatenate([sol, sag], 0)


def _sekil_kutu(pts_list):
    a = np.concatenate([np.asarray(p).reshape(-1, 2) for p in pts_list], 0)
    return a[:, 0].min(), a[:, 1].min(), a[:, 0].max(), a[:, 1].max()


# ================================================================================================================
# 1. AĞAÇ
# ================================================================================================================
_AGAC_IS = {}

_G_IZGARA = np.linspace(0.0, 1.0, 1001)


def _lider_boy(g, L0):
    g = np.clip(g, 0.0, 1.0)
    return L0 * (0.26 + 0.74 * (1.0 - (1.0 - g) ** 1.8))


def _agac_olcek(g):
    g = min(1.0, max(0.0, g))
    return 0.42 + 0.58 * g ** 0.9


def _govde_r(g):
    """Gövde taban yarıçapı (yerel birim, kök genişlemesi hariç)."""
    g = min(1.0, max(0.0, g))
    return 2.3 + 32.7 * g ** 1.35


class _Dal:
    __slots__ = ('ana', 's_ana', 'a0', 'dth', 'dl', 'L', 'g0', 'dg', 'der', 'esnek', 'cocuk')

    def boy(self, g):
        if self.ana < 0:
            return float(_lider_boy(g, self.L))
        u = (g - self.g0) / self.dg
        if u <= 0:
            return 0.0
        if u >= 1:
            return self.L
        return self.L * (1.0 - (1.0 - u) ** 2.2)

    def boylar(self, gs):
        if self.ana < 0:
            return _lider_boy(gs, self.L)
        u = np.clip((gs - self.g0) / self.dg, 0.0, 1.0)
        return self.L * (1.0 - (1.0 - u) ** 2.2)


def _ilk_gecis(dal, s):
    """dal'ın boyunun s'yi geçtiği g (g=0'da zaten geçmişse -1)."""
    b = dal.boylar(_G_IZGARA)
    if b[0] >= s:
        return -1.0
    i = int(np.searchsorted(b, s))
    return float(_G_IZGARA[i]) if i < len(_G_IZGARA) else 1.5


def _kume_sekli(rng, n=140):
    """Birim yarıçaplı yaprak kümesi (taraklı kenar): (n,2)."""
    lob = int(rng.integers(8, 13))
    f = rng.uniform(0, 2 * math.pi, 5)
    a = np.linspace(0, 2 * math.pi, n, endpoint=False)
    b = np.abs(np.sin(lob * a / 2 + f[0])) ** 0.5
    b2 = np.abs(np.sin((lob + 7) * a / 2 + f[1])) ** 0.7
    r = (0.87 + 0.09 * b + 0.04 * b2) * (1 + 0.07 * np.sin(2 * a + f[2]) + 0.05 * np.sin(3 * a + f[3]))
    sx = rng.uniform(1.0, 1.12)
    pts = np.stack([np.cos(a) * r * sx, np.sin(a) * r * 0.95], 1)
    pts[:, 1] = np.where(pts[:, 1] > 0, pts[:, 1] * 0.9, pts[:, 1])
    return pts


def _agac_iskelet(tohum):
    if tohum in _AGAC_IS:
        return _AGAC_IS[tohum]
    rng = np.random.default_rng(7919 + tohum * 31)
    dallar = []

    olgun = []  # her dal için olgun (pp, th)

    def ana_nokta(bi, s):
        pp, th = olgun[bi]
        d = dallar[bi]
        i = min(int(s / d.dl), len(th) - 1)
        f = min(1.0, max(0.0, (s - i * d.dl) / d.dl))
        return pp[i] + (pp[i + 1] - pp[i]) * f, th[i]

    def yeni(ana, s_ana, a0, L, n, egilim, hedef, der, esnek, gecik=(0.01, 0.05), dg=0.26):
        """a0: ana dala göre dallanma açısı; hedef: mutlak (dikeye göre) eğilim açısı."""
        d = _Dal()
        d.ana, d.s_ana, d.a0, d.L, d.der, d.esnek = ana, s_ana, a0, L, der, esnek
        d.dl = L / n
        if ana >= 0:
            taban, th_ana = ana_nokta(ana, s_ana)
        else:
            taban, th_ana = np.array([0.0, 0.0]), 0.0
        dth = np.zeros(n)
        th = th_ana + a0
        f = rng.uniform(0, 6.28)
        kk = rng.uniform(0.6, 1.4)
        for j in range(n):
            u = (j + 0.5) / n
            step = egilim * (hedef - th) / n * 3.0 + 0.10 * math.sin(u * 6.28 * kk + f) / n
            dth[j] = step
            th += step
        d.dth = dth
        d.cocuk = []
        if ana >= 0:
            p = dallar[ana]
            g0 = _ilk_gecis(p, s_ana + 6) + rng.uniform(*gecik)
            d.g0 = g0
            d.dg = max(0.08, min(dg, 0.985 - g0))
            p.cocuk.append(len(dallar))
        else:
            d.g0, d.dg = 0.0, 1.0
        dallar.append(d)
        thm = th_ana + a0 + np.cumsum(dth)
        seg = np.stack([np.sin(thm), -np.cos(thm)], 1) * d.dl
        pp = np.concatenate([taban[None], taban[None] + np.cumsum(seg, 0)], 0)
        olgun.append((pp, thm))
        return len(dallar) - 1

    L0 = 870.0
    lider = yeni(-1, 0, rng.uniform(-0.03, 0.03), L0, 30, 0.0, 0.0, 0, 0.55)
    # lider gövdesine hafif S kıvrımı
    dallar[lider].dth = np.array([0.018 * math.sin(j / 30 * 6.28 * 0.8 + 0.4) for j in range(30)])
    thm = dallar[lider].a0 + np.cumsum(dallar[lider].dth)
    seg = np.stack([np.sin(thm), -np.cos(thm)], 1) * dallar[lider].dl
    olgun[lider] = (np.concatenate([np.zeros((1, 2)), np.cumsum(seg, 0)], 0), thm)
    # 1. kuşak: ana kollar
    taraf = 1 if rng.random() < 0.5 else -1
    kollar = []
    yuks = [318, 372, 425, 480, 540, 610, 680]
    for i, s in enumerate(yuks):
        s += rng.uniform(-14, 14)
        u = i / (len(yuks) - 1)
        aci = math.radians(rng.uniform(52, 62) - 22 * u) * taraf
        L = (350 - 150 * u) * rng.uniform(0.9, 1.08)
        hedef = math.radians(24 - 8 * u) * taraf
        kollar.append(yeni(lider, s, aci, L, 14, 0.55, hedef, 1, 1.0, dg=0.30))
        taraf = -taraf
    # 2. kuşak
    ikinciler = []
    for kb in kollar:
        K = dallar[kb]
        m = int(rng.integers(2, 4))
        tr = 1 if rng.random() < 0.5 else -1
        for j in range(m):
            u = 0.38 + 0.5 * (j + rng.uniform(0.1, 0.9)) / m
            aci = math.radians(rng.uniform(26, 44)) * tr
            L = K.L * rng.uniform(0.38, 0.55)
            _, th_k = ana_nokta(kb, K.L * u)
            hedef = th_k + aci * 0.6
            hedef = hedef * 0.6
            ikinciler.append(yeni(kb, K.L * u, aci, L, 8, 0.35, hedef, 2, 1.5, dg=0.24))
            tr = -tr
    # liderin tepesine yan dallar
    for j, s in enumerate([700, 760, 815]):
        tr = 1 if (j % 2 == 0) == (rng.random() < 0.5) else -1
        ikinciler.append(yeni(lider, s + rng.uniform(-10, 10), math.radians(rng.uniform(30, 45)) * tr,
                              rng.uniform(90, 140), 8, 0.4, math.radians(14) * tr, 2, 1.5, dg=0.22))
    # 3. kuşak: ince dallar
    for ib in ikinciler:
        P = dallar[ib]
        for j in range(int(rng.integers(1, 3))):
            u = rng.uniform(0.45, 0.85)
            tr = 1 if rng.random() < 0.5 else -1
            _, th_p = ana_nokta(ib, P.L * u)
            aci = math.radians(rng.uniform(25, 40)) * tr
            yeni(ib, P.L * u, aci, P.L * rng.uniform(0.35, 0.55), 6, 0.25, (th_p + aci) * 0.7, 3, 2.0, dg=0.2)

    # ---------------- taç kümeleri ----------------
    tcx, tcy, trx, try_ = rng.uniform(-15, 15), -640.0, 400.0, 292.0
    havuz = []
    for bi, (pp, th) in enumerate(olgun):
        d = dallar[bi]
        for j in range(len(pp)):
            s = j * d.dl
            if bi == 0 and s < 360:
                continue
            havuz.append((pp[j, 0], pp[j, 1], bi, s))
    havuz = np.array(havuz)
    kumeler = []

    def ekle(x, y, R, tur, bi=None, s=None, gec=(0.0, 0.05), dg=(0.2, 0.26), uc=False):
        if bi is None:
            dd = (havuz[:, 0] - x) ** 2 + (havuz[:, 1] - y) ** 2
            j = int(np.argmin(dd))
            bi, s = int(havuz[j, 2]), float(havuz[j, 3])
        d = dallar[bi]
        pp, th = olgun[bi]
        j = min(int(s / d.dl), len(th) - 1)
        f = min(1.0, max(0.0, (s - j * d.dl) / d.dl))
        px, py = pp[j] + (pp[j + 1] - pp[j]) * f
        g0 = max(0.0, _ilk_gecis(d, s)) + rng.uniform(*gec)
        dgv = max(0.1, min(rng.uniform(*dg), 0.99 - g0))
        kumeler.append(dict(x=x, y=y, R=R, bi=bi, s=s, ox=x - px, oy=y - py, g0=g0, dg=dgv, tur=tur, uc=uc,
                            sek=_kume_sekli(rng), q=rng.uniform(0, 1), th_olgun=float(th[j]),
                            bas=(0.62 if bi == 0 else rng.uniform(0.3, 0.45)), gof=rng.uniform(0.55, 0.78),
                            gdon=rng.uniform(-0.35, 0.35)))

    # (a) dal uçlarında kümeler (büyüyen ucu izler; ince dalların uçları yaprak içinde kalır)
    for bi, d in enumerate(dallar):
        if d.der < 1 and bi != 0:
            continue
        pp, th = olgun[bi]
        if d.der >= 2:
            # yakınında uç kümesi varsa atla
            if any((k['x'] - pp[-1, 0]) ** 2 + (k['y'] - pp[-1, 1]) ** 2 < (0.55 * k['R']) ** 2 for k in kumeler
                   if k['uc']):
                continue
        elif d.der == 1 and len(d.cocuk) >= 2 and rng.random() < 0.6:
            continue
        v = pp[-1] - pp[-2]
        v = v / (np.linalg.norm(v) + 1e-9)
        R = rng.uniform(84, 112) * (1.12 if d.der <= 1 else 1.0)
        c = pp[-1] + v * R * 0.28 + np.array([0, -R * 0.12])
        ekle(c[0], c[1], R, 'uc', bi=bi, s=d.L, uc=True)
    # (b) arka kütle: taçın gövdesini oluşturan iri kümeler (yuvarlak silüet)
    nk = 9
    f0 = rng.uniform(0, 6.28)
    for i in range(nk):
        a = f0 + i * 2 * math.pi / nk + rng.uniform(-0.15, 0.15)
        x = tcx + math.cos(a) * trx * 0.6
        y = tcy + math.sin(a) * try_ * 0.58 - 10
        ekle(x, y, rng.uniform(145, 172), 'kutle', gec=(0.04, 0.1), dg=(0.3, 0.36))
    for (dx, dy) in ((-0.2, -0.15), (0.22, -0.05), (0.0, 0.25)):
        ekle(tcx + dx * trx, tcy + dy * try_, rng.uniform(170, 195), 'kutle', gec=(0.04, 0.1), dg=(0.3, 0.36))
    # pencereler: dal yapısının yaprak arasından göründüğü açıklıklar (çatal bölgesi + iki kol)
    pencere = []
    ana_kollar = [bi for bi, d in enumerate(dallar) if d.der == 1]
    pl, ps = olgun[0]
    i_c = min(int(470 / dallar[0].dl), len(pl) - 1)
    pencere.append((pl[i_c, 0], pl[i_c, 1] - 10, 62.0))
    sol = [bi for bi in ana_kollar if olgun[bi][0][-1, 0] < 0]
    sag = [bi for bi in ana_kollar if olgun[bi][0][-1, 0] >= 0]
    for grup in (sol, sag):
        if grup:
            bi = grup[min(len(grup) - 1, int(rng.integers(0, 2)))]
            pp, th = olgun[bi]
            q = pp[int(len(pp) * 0.55)]
            pencere.append((q[0], q[1], rng.uniform(44, 54)))

    def pencerede(x, y, pay=0.0):
        return any((x - wx) ** 2 + (y - wy) ** 2 < (wr + pay) ** 2 for (wx, wy, wr) in pencere)

    # (c) kapsama doldurma
    gx, gy = np.meshgrid(np.linspace(-1, 1, 41), np.linspace(-1, 1, 31))
    ic = gx ** 2 + gy ** 2 <= 0.86
    px_ = tcx + gx[ic] * trx
    py_ = tcy + gy[ic] * try_
    dis = np.array([not pencerede(x, y, 30) for x, y in zip(px_, py_)])
    px_, py_ = px_[dis], py_[dis]
    for _ in range(40):
        kap = np.zeros(px_.shape, bool)
        for k in kumeler:
            if k['tur'] == 'kutle':
                continue
            kap |= (px_ - k['x']) ** 2 + (py_ - k['y']) ** 2 < (0.8 * k['R']) ** 2
        if kap.mean() > 0.88:
            break
        bos = np.where(~kap)[0]
        j = bos[int(rng.integers(0, len(bos)))]
        R = rng.uniform(85, 115)
        x, y = px_[j] + rng.uniform(-15, 15), py_[j] + rng.uniform(-15, 15)
        # pencereye taşmasın
        for (wx, wy, wr) in pencere:
            d = math.hypot(x - wx, y - wy)
            if d < wr + R * 0.6:
                R = max(55.0, d - wr * 0.85)
        ekle(x, y, R, 'dolgu', gec=(0.02, 0.08))
    # katmanlar
    adaylar = [k for k in kumeler if k['tur'] != 'kutle']
    for k in adaylar:
        ry = (k['y'] - tcy) / try_
        rx = (k['x'] - tcx) / trx
        k['z'] = rng.uniform(0, 1) + 0.75 * ry - 0.2 * abs(rx)
    zs = sorted(k['z'] for k in adaylar)
    e1, e2 = zs[int(len(zs) * 0.36)], zs[int(len(zs) * 0.66)]
    for k in kumeler:
        if k['tur'] == 'kutle':
            k['kat'] = 0
        else:
            k['kat'] = 2 if k['z'] >= e2 else (1 if k['z'] >= e1 else 0)
            if k['uc'] and (k['bi'] == 0 or dallar[k['bi']].der >= 2) and k['kat'] == 0:
                k['kat'] = 1  # ince dal uçları yaprak altında kalsın
            if pencerede(k['x'], k['y'], 0.25 * k['R']):
                k['kat'] = 0  # pencerede ön küme yok
    # örtme geçişi: her ince dal ucu ve liderin ucu bir ön/orta kümenin içinde kalsın
    for bi, d in enumerate(dallar):
        if not (bi == 0 or d.der >= 2):
            continue
        pp, th = olgun[bi]
        tx, ty = pp[-1]
        if any((k['x'] - tx) ** 2 + (k['y'] - ty) ** 2 < (0.7 * k['R']) ** 2 for k in kumeler if k['kat'] >= 1):
            continue
        v = pp[-1] - pp[-2]
        v = v / (np.linalg.norm(v) + 1e-9)
        R = rng.uniform(80, 100)
        c = pp[-1] + v * R * 0.25 + np.array([0, -R * 0.1])
        ekle(c[0], c[1], R, 'uc', bi=bi, s=d.L, uc=True)
        kumeler[-1]['kat'] = 1
    # gök boşlukları (arka kütlede, ön kümelerin olmadığı yerlerde)
    bosluk = []
    for wi, (wx, wy, wr) in enumerate(pencere):
        a = rng.uniform(0, 2 * math.pi)
        bosluk.append((wx + math.cos(a) * wr * 0.35, wy + math.sin(a) * wr * 0.3 - 10, rng.uniform(16, 26),
                       int(rng.integers(0, 10 ** 5))))
    for _ in range(300):
        if len(bosluk) >= 5:
            break
        a = rng.uniform(0, 2 * math.pi)
        rr = rng.uniform(0.3, 0.72)
        x = tcx + math.cos(a) * rr * trx
        y = tcy + math.sin(a) * rr * try_
        if y > tcy + try_ * 0.35:
            continue
        ok = all((x - k['x']) ** 2 + (y - k['y']) ** 2 > (0.8 * k['R']) ** 2
                 for k in kumeler if k['kat'] >= 1)
        ok = ok and all((x - b_[0]) ** 2 + (y - b_[1]) ** 2 > 150 ** 2 for b_ in bosluk)
        if ok:
            bosluk.append((x, y, rng.uniform(20, 36), int(rng.integers(0, 10 ** 5))))
    # tek tek yapraklar: fidanda liderin üzerinde, genç ağaçta ana kolların üzerinde (kümeler büyüyünce solar)
    yapraklar = []
    tr = 1
    for j in range(14):
        s = 52 + 30 * j
        yapraklar.append(dict(bi=0, s=s, taraf=tr, aci=math.radians(rng.uniform(44, 60)), L=rng.uniform(60, 74),
                              g0=_ilk_gecis(dallar[0], s + 24), kiv=rng.uniform(-0.1, 0.1), sol=(0.24, 0.44)))
        tr = -tr
    for bi, d in enumerate(dallar):
        if d.der not in (1, 2):
            continue
        s = rng.uniform(28, 45)
        while s < d.L - 10:
            g0 = _ilk_gecis(d, s + 18)
            f0 = rng.uniform(0.40, 0.52)
            yapraklar.append(dict(bi=bi, s=s, taraf=tr, aci=math.radians(rng.uniform(38, 62)),
                                  L=rng.uniform(56, 72), g0=g0, kiv=rng.uniform(-0.12, 0.12), sol=(f0, f0 + 0.16)))
            tr = -tr
            s += rng.uniform(34, 50)
    kabuk = [(rng.uniform(-0.7, 0.55), rng.uniform(20, 300), rng.uniform(30, 90)) for _ in range(9)]
    iskelet = dict(dallar=dallar, kumeler=kumeler, yapraklar=yapraklar, tac=(tcx, tcy, trx, try_), kabuk=kabuk,
                   bosluk=bosluk, pencere=pencere)
    _AGAC_IS[tohum] = iskelet
    return iskelet


def _agac_durum(isk, g, sallanma):
    """Her dalın şimdiki noktaları (yapı birimi), açıları ve yarıçapları."""
    dallar = isk['dallar']
    n = len(dallar)
    boy = [d.boy(g) for d in dallar]
    # alt ağaç uzunluğu (boru modeli): ters sırada
    alt = [0.0] * n
    for i in range(n - 1, -1, -1):
        alt[i] = boy[i] + sum(alt[c] for c in dallar[i].cocuk)
    toplam = max(alt[0], 1e-6)
    sc = _agac_olcek(g)
    r0 = _govde_r(g) / sc
    rtip = 0.55 / sc + 0.6
    out = [None] * n
    for i, d in enumerate(dallar):
        L = boy[i]
        if L <= 0.3:
            continue
        nseg = len(d.dth)
        kac = min(nseg, L / d.dl)
        tam = int(math.floor(kac))
        fr = kac - tam
        if d.ana < 0:
            taban, th0 = np.array([0.0, 0.0]), 0.0
            ana_bukum = 0.0
        else:
            P = out[d.ana]
            if P is None:
                continue
            pp, aa, ss = P[0], P[1], P[3]
            j = int(np.searchsorted(ss, d.s_ana) - 1)
            j = min(max(j, 0), len(pp) - 2)
            u = (d.s_ana - ss[j]) / max(ss[j + 1] - ss[j], 1e-6)
            taban = pp[j] + (pp[j + 1] - pp[j]) * min(1.0, max(0.0, u))
            th0 = aa[min(j, len(aa) - 1)]
        cnt = tam + (1 if fr > 1e-3 else 0)
        cnt = max(cnt, 1)
        uz = np.full(cnt, d.dl)
        if fr > 1e-3:
            uz[-1] = d.dl * fr
        elif tam == 0:
            uz[-1] = L
        dth = d.dth[:cnt]
        th = th0 + d.a0 + np.cumsum(dth)
        # rüzgâr bükümü: uca doğru artan, ince dallarda daha fazla
        s_mid = np.cumsum(uz) - uz / 2
        if d.ana < 0:
            buk = sallanma * 0.20 * (s_mid / d.L) ** 1.6
        else:
            buk = sallanma * 0.10 * d.esnek * (s_mid / max(d.L, 1)) ** 1.2
            # yatay dalları rüzgâr aşağı da eğer
        th = th + buk
        seg = np.stack([np.sin(th), -np.cos(th)], 1) * uz[:, None]
        pp = np.concatenate([taban[None], taban[None] + np.cumsum(seg, 0)], 0)
        ss = np.concatenate([[0.0], np.cumsum(uz)])
        # yarıçap: s ötesindeki alt ağaç uzunluğu
        A = np.maximum(L - ss, 0.0)
        for c in d.cocuk:
            if boy[c] > 0:
                A = A + np.where(ss <= dallar[c].s_ana, alt[c], 0.0)
        r = np.sqrt(r0 * r0 * A / toplam + rtip * rtip)
        if d.ana < 0:
            r = r * (1.0 + 0.55 * np.exp(-ss / (1.3 * r0 + 1e-6)))
        else:
            # dal tabanında ana dala kaynaşma
            r = np.minimum(r, out[d.ana][2].max())
        thp = np.concatenate([th, th[-1:]])
        out[i] = (pp, thp, r, ss)
    return out, sc


def _kume_durum(isk, durum, g, yaprak, sallanma):
    """Görünen kümeler (yapı biriminde): kat, merkez, R, ağırlık, şekil noktaları."""
    sonuc = []
    dallar = isk['dallar']
    for k in isk['kumeler']:
        D = durum[k['bi']]
        if D is None:
            continue
        pp, th, r, ss = D
        v = min(1.0, max(0.0, (yaprak - k['q'] * 0.82) / 0.18))
        if v <= 0.0:
            continue
        if k['uc']:
            # büyüyen dal ucunu izleyen küme
            fr = ss[-1] / dallar[k['bi']].L
            u = (fr - k['bas']) / (1.0 - k['bas'])
            if u <= 0:
                continue
            u1 = min(1.0, u)
            bl = u1 ** 0.85 * (2.0 - u1) ** 0.5 / 1.0
            bl = min(1.0, bl)
            R = k['R'] * (0.16 + 0.84 * bl) * (0.5 + 0.5 * v)
            vx, vy = pp[-1] - pp[-2]
            n_ = math.hypot(vx, vy) + 1e-9
            cx = pp[-1, 0] + vx / n_ * R * 0.28 + sallanma * 6.0
            cy = pp[-1, 1] + vy / n_ * R * 0.28 - R * 0.12
            w = min(1.0, u * 2.6) * (0.25 + 0.75 * v)
        else:
            u = (g - k['g0']) / k['dg']
            if u <= 0 or ss[-1] < k['s'] - 1:
                continue
            u = min(1.0, u)
            bl = u * u * (3 - 2 * u) * 0.6 + 0.4 * u
            j = int(np.searchsorted(ss, k['s']) - 1)
            j = min(max(j, 0), len(pp) - 2)
            f = (k['s'] - ss[j]) / max(ss[j + 1] - ss[j], 1e-6)
            px, py = pp[j] + (pp[j + 1] - pp[j]) * min(1.0, max(0.0, f))
            dth = th[j] - k['th_olgun']
            c, s_ = math.cos(dth), math.sin(dth)
            sk = 0.3 + 0.7 * bl
            ox = (k['ox'] * c - k['oy'] * s_) * sk
            oy = (k['ox'] * s_ + k['oy'] * c) * sk
            cx, cy = px + ox + sallanma * 10.0, py + oy
            R = k['R'] * (0.12 + 0.88 * bl) * (0.5 + 0.5 * v)
            w = min(1.0, u * 3.2) * (0.25 + 0.75 * v)
        P = k['sek'] * R
        P[:, 0] += sallanma * 0.16 * (-P[:, 1])
        sonuc.append(dict(kat=k['kat'], x=cx, y=cy, R=R, w=w, pts=P + np.array([cx, cy]), ham=k))
    return sonuc


def ciz_agac(t: Tuval, M, buyume, sallanma=0.0, tohum=0, isik=(-0.6, -0.8), yaprak=1.0, damla=0.0,
             sakla_sonra=True):
    isk = _agac_iskelet(tohum)
    g = min(1.0, max(0.0, float(buyume)))
    durum, sc = _agac_durum(isk, g, sallanma)
    Ms = M_bilesik(M, M_olcek(sc))  # yapı birimi -> ekran
    kumeler = _kume_durum(isk, durum, g, yaprak, sallanma)
    lx, ly = isik
    ln = math.hypot(lx, ly) + 1e-9
    lx, ly = lx / ln, ly / ln
    tcx, tcy, trx, try_ = isk['tac']
    lider = durum[0]

    # sınır kutusu (yapı birimi)
    xs, ys = [0.0], [0.0]
    for D in durum:
        if D is not None:
            xs += [D[0][:, 0].min() - D[2].max(), D[0][:, 0].max() + D[2].max()]
            ys += [D[0][:, 1].min() - D[2].max()]
    for k in kumeler:
        xs += [k['x'] - k['R'] * 1.3, k['x'] + k['R'] * 1.3]
        ys += [k['y'] - k['R'] * 1.15, k['y'] + k['R'] * 1.15]
    r0 = _govde_r(g) / sc
    x0, x1 = min(xs) - r0 * 3 - 90, max(xs) + r0 * 3 + 90
    y0, y1 = min(ys) - 90, 30.0
    k = yollar_kirp([yol_dikdortgen(x0, y0, x1, y1)], Ms, 6)
    if k.bos():
        return None
    B = _Boya(t, M, k, tohum=tohum)
    ik = 1.0 + 0.22 * damla  # ıslaklık: renkler biraz doygun

    # ------------------------------------------------------------------ fidan yaprakları (önde)
    if lider is not None and g < 0.72:
        pp, th, r, ss = lider
        yy, ya, yg = [], [], []

        def yaprak_ekle(px, py, thl, Lf, kiv, a):
            aci_deg = math.degrees(thl) - 90.0
            sx, sy = px + math.sin(thl) * Lf * 0.10, py - math.cos(thl) * Lf * 0.10
            pts = _yaprak_np(sx, sy, Lf, Lf * 0.25, aci_deg, kivrim=kiv)
            yy.append(_poly(pts))
            ya.append(a)
            ar = math.radians(aci_deg)
            nx, ny = -math.sin(ar), math.cos(ar)
            if nx * (-lx) + ny * (-ly) < 0:
                nx, ny = -nx, -ny
            h = _yaprak_np(sx + nx * Lf * 0.075, sy + ny * Lf * 0.075, Lf * 0.96, Lf * 0.12, aci_deg, kivrim=kiv)
            yg.append(_poly(h))
            # sap
            return (px, py, sx, sy)

        saplar = []
        solma = 1.0 - sstep(0.24, 0.44, g)
        for y_ in isk['yapraklar']:
            Dl = durum[y_['bi']]
            if Dl is None:
                continue
            ppl, thl_, rl, ssl = Dl
            s = y_['s']
            u = (g - y_['g0']) / 0.07
            if u <= 0 or s > ssl[-1] - 6:
                continue
            bl = min(1.0, u) ** 0.7
            a = bl * (1.0 - sstep(*y_['sol'], g))
            if y_['bi'] == 0:
                a *= 1.0 - sstep(150, 230, ssl[-1] - s)
            if a <= 0.01:
                continue
            j = min(max(int(np.searchsorted(ssl, s) - 1), 0), len(ppl) - 2)
            f = (s - ssl[j]) / max(ssl[j + 1] - ssl[j], 1e-6)
            px, py = ppl[j] + (ppl[j + 1] - ppl[j]) * f
            thl = thl_[j] + y_['taraf'] * y_['aci'] + sallanma * 0.4
            saplar.append(yaprak_ekle(px, py, thl, y_['L'] * (0.35 + 0.65 * bl), y_['kiv'] * y_['taraf'], a))
        # tepe tomurcuğu: iki küçük yaprak
        a = solma
        if a > 0.01:
            px, py = pp[-1]
            for sgn in (-1, 1):
                saplar.append(yaprak_ekle(px, py, th[-1] + sgn * 0.42 + sallanma * 0.4, 40, -0.08 * sgn, a))
        if yy:
            iz = B.lavi(yy, '#93C08A', yog=0.56 * ik, Mloc=Ms, kenar=0.9, dalga=0.05, islak=1.05, islak_gen=2.2,
                        gran=0.08, akis=0.2, toplam=True, alfalar=ya, renk2='#6FA67A')
            B.lavi(yg, '#4F8463', yog=0.30 * ik, Mloc=Ms, kenar=0.8, dalga=0.05, islak=0.8, islak_gen=1.8,
                   gran=0.08, akis=0.1, toplam=True, alfalar=ya, siluet=False)
            B.sakla(iz)

    # ------------------------------------------------------------------ taç kümeleri
    def kume_boya(kat, renk1, renk2, yog_b, golge_renk, yog_g, acik=0.6, ust=0.5, isik_g=0.35):
        sec = [q for q in kumeler if q['kat'] == kat]
        if not sec:
            return None
        yollar = [_poly(q['pts']) for q in sec]
        alfa = [q['w'] for q in sec]
        Rm = float(np.median([q['R'] for q in sec])) * sc * math.sqrt(abs(np.linalg.det(M[:2, :2])))
        dd = Rm * 0.38

        def yf(X, Y):
            d = ((X / sc - tcx) * lx + (Y / sc - tcy) * ly) / (trx + try_)
            return 1.0 - isik_g * np.clip(d * 1.8, -0.8, 0.8)
        iz = B.lavi(yollar, renk1, yog=yog_b * ik, Mloc=Ms, kenar=1.1, dalga=0.07, islak=1.0, islak_gen=3.0,
                    gran=0.10, akis=0.22, toplam=True, alfalar=alfa, ust=ust, renk2=renk2, yog_fn=yf,
                    isik_kenar=(lx * dd, ly * dd, 1.0 - acik))
        if yog_g <= 0:
            return iz
        gy, ga = [], []
        for q in sec:
            hm = q['ham']
            d = q['R'] * hm['gof']
            ca, sa = math.cos(hm['gdon']), math.sin(hm['gdon'])
            dx, dy = (lx * ca - ly * sa) * d, (lx * sa + ly * ca) * d - q['R'] * 0.05
            kay = q['pts'] + np.array([dx, dy])
            gy.append(yol_op(_poly(q['pts']), _poly(kay), 'fark'))
            ga.append(q['w'])
        B.lavi(gy, golge_renk, yog=yog_g * ik, Mloc=Ms, kenar=1.0, dalga=0.09, islak=0.95, islak_gen=2.6,
               gran=0.12, akis=0.18, toplam=True, alfalar=ga, ust=0.45, siluet=False)
        return iz

    B.sakla(kume_boya(2, '#A2C98F', '#7FB383', 0.48, '#4E8466', 0.30, ust=0.45, acik=0.68))
    B.sakla(kume_boya(1, '#8EBA8A', '#6EA27E', 0.50, '#477B63', 0.24, ust=0.45))

    # ------------------------------------------------------------------ gövde ve dallar
    dal_yollar, dal_golge, kabuk_yollar = [], [], []
    for i, D in enumerate(durum):
        if D is None:
            continue
        pp, th, r, ss = D
        if len(pp) < 2:
            continue
        rr = r.copy()
        rr[-1] = max(rr[-1] * 0.85, 0.5 / sc)
        dal_yollar.append(_poly(_serit_np(pp, rr)))
        tan = np.gradient(pp, axis=0)
        tan /= np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9
        nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
        sgn = np.sign(nor[:, 0] * (-lx) + nor[:, 1] * (-ly))
        sgn[sgn == 0] = 1
        om = pp + nor * (sgn * rr * 0.45)[:, None]
        dal_golge.append(_poly(_serit_np(om, rr * 0.58)))
    if lider is not None:
        # kök genişlemesi: zemine yayılan kısa yüzey kökleri
        for sgn_, uz, kal in ((-1, 2.5, 0.55), (1, 2.2, 0.5), (-1, 1.55, 0.42), (1, 1.7, 0.45)):
            p0 = np.array([sgn_ * r0 * 0.45, -r0 * 1.15])
            p1 = np.array([sgn_ * r0 * 0.95, -r0 * 0.2])
            p2 = np.array([sgn_ * r0 * (0.6 + uz * 0.45), r0 * 0.02])
            p3 = np.array([sgn_ * r0 * uz, r0 * 0.1])
            om = EL.bezier_noktalar(p0, p1, p2, p3, 12)
            gen = r0 * kal * np.linspace(1.0, 0.08, 12) ** 0.8
            dal_yollar.append(_poly(_serit_np(om, gen)))
            if sgn_ * (-lx) > 0:
                dal_golge.append(_poly(_serit_np(om + np.array([sgn_ * 0, -0.15 * r0]) * 0, gen * 0.75)))
    if lider is not None and g > 0.25:
        pp, th, r, ss = lider
        for (fx, s0, L) in isk['kabuk']:
            if s0 + L > ss[-1] * 0.42:
                continue
            sp = np.linspace(s0, s0 + L, 8)
            q = np.stack([np.interp(sp, ss, pp[:, 0]), np.interp(sp, ss, pp[:, 1])], 1)
            rq = np.interp(sp, ss, r)
            q[:, 0] += fx * rq * 0.85 + np.sin(sp * 0.05 + fx * 7) * rq * 0.06
            kabuk_yollar.append(_poly(q, kapali=False))
    iz_dal = B.lavi(dal_yollar, '#A99383', yog=0.60, Mloc=Ms, kenar=0.9, dalga=0.05, islak=0.95, islak_gen=2.6,
                    gran=0.14, akis=0.16, renk2='#9C8579')
    B.lavi(dal_golge, '#6F5A66', yog=0.36, Mloc=Ms, kenar=0.9, dalga=0.06, islak=0.8, islak_gen=2.0, gran=0.14,
           akis=0.12, siluet=False)
    if kabuk_yollar:
        B.lavi(kabuk_yollar, '#6F5A63', yog=0.26 * sstep(0.25, 0.6, g), Mloc=Ms, kenar=0.7, dalga=0.1, islak=0.3,
               islak_gen=1.5, gran=0.12, akis=0.1, cizgi=max(1.0, r0 * 0.07), siluet=False)
    B.sakla(iz_dal)

    # ------------------------------------------------------------------ arka kütle
    # gök boşlukları (arka kütlede dalların göründüğü delikler)
    if isk['bosluk'] and any(q['kat'] == 0 for q in kumeler):
        dl = []
        for (bx, by, br, bt) in isk['bosluk']:
            # boşluk, çevresindeki kütle olgunlaştıkça açılır
            ag = 0.0
            for q in kumeler:
                if q['kat'] == 0 and (q['x'] - bx) ** 2 + (q['y'] - by) ** 2 < (q['R'] * 0.8) ** 2:
                    ag = max(ag, q['w'] * min(1.0, q['R'] / (q['ham']['R'] * 0.9)))
            if ag > 0.05:
                dl.append(EL.damla_blob(bx, by, br * ag * yaprak ** 0.5, tohum=bt, duzensizlik=0.18, lob=5))
        if dl:
            B.sakla_yol(dl, Ms, yumusak=1.0)
    kume_boya(0, '#7FA592', '#6A977E', 0.56, '#3F6F5F', 0.20, acik=0.75, ust=0.35, isik_g=0.5)

    B.bitir(sakla_sonra=sakla_sonra)

    # ------------------------------------------------------------------ dönüş (ekran koordinatları)
    taban = nokta_donustur(M, 0, 0)
    if kumeler:
        ax = np.concatenate([q['pts'] for q in kumeler], 0)
        ekr = (Ms[:2, :2] @ ax.T).T + Ms[:2, 2]
        kx0, ky0 = ekr.min(0)
        kx1, ky1 = ekr.max(0)
        kutu = (float(kx0), float(ky0), float(kx1), float(ky1))
        mrk = ((kutu[0] + kutu[2]) / 2, (kutu[1] + kutu[3]) / 2)
    else:
        tp = lider[0][-1] if lider is not None else (0, 0)
        mrk = nokta_donustur(Ms, tp[0], tp[1])
        kutu = (mrk[0], mrk[1], mrk[0], mrk[1])
    tepe = mrk
    if lider is not None:
        tp = lider[0][-1]
        tp_e = nokta_donustur(Ms, tp[0], tp[1] - (0 if kumeler else 20))
        tepe = tp_e if not kumeler or tp_e[1] < kutu[1] else (mrk[0], kutu[1])
    return dict(merkez=(float(mrk[0]), float(mrk[1])), kutu=kutu, tepe=(float(tepe[0]), float(tepe[1])),
                taban=taban, olcek=sc, govde_r=_govde_r(g))


# ================================================================================================================
# 2. KÖKLER
# ================================================================================================================
_KOK_IS = {}


def _kok_iskelet(tohum):
    if tohum in _KOK_IS:
        return _KOK_IS[tohum]
    rng = np.random.default_rng(4241 + tohum * 17)
    kokler = []  # dict(ana, s_ana, pp (olgun noktalar), L, b0, dur, kal (taban yarıçap oranı), der)

    def yol_uret(x0, y0, aci, L, n, egilim, kivrim):
        """aci: yataydan aşağı doğru (derece, 0 = +x yönü, 90 = aşağı)."""
        a = math.radians(aci)
        pts = [(x0, y0)]
        f = rng.uniform(0, 6.28)
        k = rng.uniform(1.5, 3.0)
        for j in range(n):
            u = (j + 1) / n
            # aşağı (90°) doğru bükülme + kıvrım
            hedef = math.radians(90)
            a += (hedef - a) * egilim / n + kivrim * math.sin(u * k * 6.28 + f) / n * 3
            pts.append((pts[-1][0] + math.cos(a) * L / n, pts[-1][1] + math.sin(a) * L / n))
        return np.array(pts)

    def ekle(ana, s_ana, pp, b0, dur, kal, der):
        L = float(np.sum(np.linalg.norm(np.diff(pp, axis=0), axis=1)))
        kokler.append(dict(ana=ana, s_ana=s_ana, pp=pp, L=L, b0=b0, dur=dur, kal=kal, der=der,
                           ss=np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(pp, axis=0), axis=1))])))
        return len(kokler) - 1

    # ana kökler
    acilar = [6, 20, 38, 64, 116, 142, 160, 174]
    ana_ids = []
    for i, a in enumerate(acilar):
        a = a + rng.uniform(-6, 6)
        sag = math.cos(math.radians(a)) > 0
        x0 = (0.55 if sag else -0.55)
        yatay = abs(math.cos(math.radians(a)))
        L = rng.uniform(380, 560) * (0.75 + 0.35 * yatay)
        pp = yol_uret(x0, 0.25, a, L, 22, rng.uniform(0.12, 0.35) + 0.4 * (1 - yatay), rng.uniform(0.15, 0.3))
        ana_ids.append(ekle(-1, 0, pp, rng.uniform(0.0, 0.12), rng.uniform(0.45, 0.6), rng.uniform(0.40, 0.55), 0))
    # kazık kök
    pp = yol_uret(0.0, 0.5, 90 + rng.uniform(-6, 6), rng.uniform(380, 460), 22, 0.3, 0.12)
    ana_ids.append(ekle(-1, 0, pp, 0.0, 0.6, 0.62, 0))
    # ikincil ve üçüncül kökler
    for ai in list(ana_ids):
        A = kokler[ai]
        m = int(rng.integers(2, 5))
        for j in range(m):
            u = 0.22 + 0.65 * (j + rng.uniform(0.2, 0.8)) / m
            s = u * A['L']
            i = min(int(np.searchsorted(A['ss'], s)), len(A['pp']) - 1)
            p = A['pp'][i]
            v = A['pp'][min(i + 1, len(A['pp']) - 1)] - A['pp'][max(i - 1, 0)]
            a_ana = math.degrees(math.atan2(v[1], v[0]))
            a = a_ana + rng.choice([-1, 1]) * rng.uniform(28, 62)
            L = A['L'] * rng.uniform(0.28, 0.48) * (1 - 0.4 * u)
            pp = yol_uret(p[0], p[1], a, L, 12, rng.uniform(0.3, 0.8), 0.25)
            b0 = A['b0'] + A['dur'] * u * 0.9
            si = ekle(ai, s, pp, b0, rng.uniform(0.3, 0.4), A['kal'] * rng.uniform(0.35, 0.5), 1)
            S = kokler[si]
            for q in range(int(rng.integers(1, 4))):
                u2 = rng.uniform(0.3, 0.9)
                s2 = u2 * S['L']
                i2 = min(int(np.searchsorted(S['ss'], s2)), len(S['pp']) - 1)
                p2 = S['pp'][i2]
                v2 = S['pp'][min(i2 + 1, len(S['pp']) - 1)] - S['pp'][max(i2 - 1, 0)]
                a2 = math.degrees(math.atan2(v2[1], v2[0])) + rng.choice([-1, 1]) * rng.uniform(30, 70)
                pp2 = yol_uret(p2[0], p2[1], a2, rng.uniform(28, 75), 6, 0.4, 0.4)
                ekle(si, s2, pp2, S['b0'] + S['dur'] * u2 * 0.9, rng.uniform(0.18, 0.26), S['kal'] * 0.45, 2)
    # kök tüyleri: ince köklerin ve uçların çevresinde kısa çizgiler (kök, s, açı farkı, boy)
    tuy = []
    for ki, K in enumerate(kokler):
        if K['der'] == 0:
            continue
        n = int(K['L'] / 9)
        for j in range(n):
            s = K['L'] * rng.uniform(0.35, 1.0)
            tuy.append((ki, s, rng.choice([-1, 1]) * rng.uniform(40, 80), rng.uniform(5, 13)))
    for ki in ana_ids:
        K = kokler[ki]
        for j in range(14):
            s = K['L'] * rng.uniform(0.75, 1.0)
            tuy.append((ki, s, rng.choice([-1, 1]) * rng.uniform(35, 80), rng.uniform(6, 14)))
    isk = dict(kokler=kokler, tuy=tuy)
    _KOK_IS[tohum] = isk
    return isk


def _kok_boyut(g):
    """Kök sisteminin yerel ölçeği (ağacın büyümesiyle)."""
    return _agac_olcek(g) * (0.5 + 0.5 * min(1.0, max(0.0, g)))


def ciz_kokler(t: Tuval, M, buyume, derinlik=1.0, tohum=0, isik=(-0.6, -0.8), sakla_sonra=True):
    isk = _kok_iskelet(tohum)
    g = min(1.0, max(0.0, float(buyume)))
    dr = min(1.0, max(0.0, float(derinlik)))
    sc = _kok_boyut(g)
    Ms = M_bilesik(M, M_olcek(sc))
    r0 = _govde_r(g) / sc  # gövde yarıçapı yapı biriminde
    kokler = isk['kokler']
    gor = []  # (pp_kesik, yarıçaplar)
    uzun = [0.0] * len(kokler)
    for i, K in enumerate(kokler):
        u = (dr - K['b0']) / K['dur']
        if u <= 0:
            continue
        u = min(1.0, u)
        e = 1.0 - (1.0 - u) ** 1.8
        if K['ana'] >= 0:
            if uzun[K['ana']] < K['s_ana'] + 2:
                continue
        L = K['L'] * e
        uzun[i] = L
        ss = K['ss']
        n = int(np.searchsorted(ss, L))
        n = max(1, min(n, len(ss) - 1))
        pp = K['pp'][:n + 1].copy()
        # son noktayı tam L'ye kırp
        if ss[n] > L and n >= 1:
            f = (L - ss[n - 1]) / max(ss[n] - ss[n - 1], 1e-6)
            pp[-1] = K['pp'][n - 1] + (K['pp'][n] - K['pp'][n - 1]) * f
        sp = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(pp, axis=0), axis=1))])
        r_taban = r0 * K['kal'] * (0.6 + 0.4 * e)
        kalan = np.clip((L - sp) / max(K['L'], 1.0), 0, 1)
        r = 0.7 / sc + r_taban * kalan ** 0.8
        if K['der'] == 0:
            # gövdeye kaynaşma: ilk kısımda kalın
            r = r + r0 * 0.35 * np.exp(-sp / (r0 * 0.9 + 1e-6))
        gor.append((i, pp, r, sp))
    if not gor:
        return None
    allp = np.concatenate([p for (_, p, _, _) in gor], 0)
    pay = r0 * 1.2 + 30
    B = _boya_ac(t, Ms, (allp[:, 0].min() - pay, allp[:, 1].min() - pay, allp[:, 0].max() + pay,
                         allp[:, 1].max() + pay), tohum=tohum + 3)
    if B is None:
        return None
    lx, ly = isik
    ln = math.hypot(lx, ly) + 1e-9
    lx, ly = lx / ln, ly / ln
    yollar, golge = [], []
    for (i, pp, r, sp) in gor:
        if len(pp) < 2:
            continue
        P = _serit_np(pp, r)
        if P is None:
            continue
        yollar.append(_poly(P))
        tan = np.gradient(pp, axis=0)
        tan /= np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9
        nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
        sgn = np.sign(nor[:, 0] * (-lx) + nor[:, 1] * (-ly))
        sgn[sgn == 0] = 1
        P2 = _serit_np(pp + nor * (sgn * r * 0.45)[:, None], r * 0.55)
        if P2 is not None:
            golge.append(_poly(P2))
    # kök tüyleri
    tuyler = []
    for (ki, s, da, L) in isk['tuy']:
        if uzun[ki] < s:
            continue
        K = kokler[ki]
        ss = K['ss']
        j = min(max(int(np.searchsorted(ss, s) - 1), 0), len(ss) - 2)
        f = (s - ss[j]) / max(ss[j + 1] - ss[j], 1e-6)
        p = K['pp'][j] + (K['pp'][j + 1] - K['pp'][j]) * f
        v = K['pp'][j + 1] - K['pp'][j]
        a = math.atan2(v[1], v[0]) + math.radians(da)
        ilk = min(1.0, (uzun[ki] - s) / 25.0)  # uçta yeni çıkan tüyler kısa
        L2 = L * ilk
        q = np.array([p, p + np.array([math.cos(a), math.sin(a)]) * L2 * 0.55,
                      p + np.array([math.cos(a + 0.25 * np.sign(da)), math.sin(a + 0.25 * np.sign(da))]) * L2])
        tuyler.append(_poly(q, kapali=False))
    if tuyler:
        B.lavi(tuyler, '#8F7868', yog=0.42, Mloc=Ms, kenar=0.5, dalga=0.06, islak=0.2, islak_gen=1.0, gran=0.1,
               akis=0.15, cizgi=max(0.8 / sc, 0.6), esik=False)
    iz = B.lavi(yollar, '#B9A08B', yog=0.66, Mloc=Ms, kenar=0.9, dalga=0.06, islak=1.1, islak_gen=2.4, gran=0.12,
                akis=0.2, renk2='#B2957F')
    B.lavi(golge, '#76606B', yog=0.36, Mloc=Ms, kenar=0.9, dalga=0.07, islak=0.8, islak_gen=2.0, gran=0.14,
           akis=0.15, siluet=False)
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(kutu=tuple(nokta_donustur(Ms, allp[:, 0].min(), allp[:, 1].min())
                           + nokta_donustur(Ms, allp[:, 0].max(), allp[:, 1].max())))


# ================================================================================================================
# 3. TOPRAK KESİTİ
# ================================================================================================================
def _dalgali_cizgi(rng, x0, x1, y, genlik, n=40, frek=(1.5, 4.0)):
    xs = np.linspace(x0, x1, n)
    f1, f2, f3 = rng.uniform(0, 6.28, 3)
    k1, k2 = rng.uniform(*frek), rng.uniform(frek[1], frek[1] * 2.2)
    u = (xs - x0) / max(x1 - x0, 1)
    ys = y + genlik * (0.6 * np.sin(u * k1 * 6.28 + f1) + 0.3 * np.sin(u * k2 * 6.28 + f2)
                       + 0.15 * np.sin(u * 23 + f3))
    return np.stack([xs, ys], 1)


def _cakil(rng, x, y, r):
    """Yuvarlak çakıl noktaları."""
    n = 24
    a = np.linspace(0, 2 * math.pi, n, endpoint=False)
    f = rng.uniform(0, 6.28, 2)
    rr = r * (1 + 0.12 * np.sin(2 * a + f[0]) + 0.06 * np.sin(3 * a + f[1]))
    sy = rng.uniform(0.6, 0.85)
    return np.stack([x + np.cos(a) * rr, y + np.sin(a) * rr * sy], 1)


def ciz_toprak_kesiti(t: Tuval, M, x0, x1, y_zemin, y_alt, tohum=0, cimen=True, sakla_sonra=True):
    rng = np.random.default_rng(9001 + tohum)
    Hh = y_alt - y_zemin
    B = _boya_ac(t, M, (x0 - 20, y_zemin - 40, x1 + 20, y_alt + 30), tohum=tohum + 11)
    if B is None:
        return None
    # --- çakıllar (önde) ---
    cak, cak_g = [], []
    alan = (x1 - x0) * Hh
    n = int(alan / 5200)
    for i in range(n):
        y = y_zemin + Hh * (0.18 + 0.78 * rng.uniform(0, 1) ** 0.8)
        x = rng.uniform(x0 + 14, x1 - 14)
        r = rng.uniform(4, 9) * (1 + 1.4 * ((y - y_zemin) / Hh) * rng.uniform(0, 1))
        P = _cakil(rng, x, y, r)
        cak.append(_poly(P))
        cak_g.append(_poly(_cakil(np.random.default_rng(i), x + r * 0.25, y + r * 0.2, r * 0.75)))
    if cak:
        iz = B.lavi(cak, '#C9BBAE', yog=0.5, kenar=0.8, dalga=0.05, islak=1.0, islak_gen=1.8, gran=0.14,
                    akis=0.2, renk2='#C7AE97', toplam=True, ust=0.4)
        B.lavi([yol_op(a, b, 'kesisim') for a, b in zip(cak, cak_g)], '#8E7C80', yog=0.32, kenar=0.8,
               dalga=0.05, islak=0.7, islak_gen=1.5, gran=0.14, akis=0.1, siluet=False)
        B.sakla(iz)
    # --- çimen çizgisi (üstte) ---
    if cimen:
        iz = _cimen_boya(B, M, x0, x1, y_zemin + 2, 0.9, 0.0, rng, boy=(9, 22), ince=True)
        B.sakla(iz)
    # --- toprak katmanları (alttan üste sırlar: üst katman en koyu) ---
    sol = _dalgali_cizgi(rng, y_zemin, y_alt, x0, 5, n=20)[:, ::-1]
    sag = _dalgali_cizgi(rng, y_zemin, y_alt, x1, 5, n=20)[:, ::-1]
    ust = _dalgali_cizgi(rng, x0, x1, y_zemin, 2.5, n=50, frek=(2, 6))
    alt = _dalgali_cizgi(rng, x0, x1, y_alt, 9, n=50, frek=(2, 5))

    def bolge(y_sinir_pts, ic=0.0):
        u_ = ust.copy()
        sg = sag.copy()
        sl_ = sol.copy()
        if ic:
            sg[:, 0] -= ic
            sl_[:, 0] += ic * 0.7
            u_[:, 1] += ic * 0.3
        # sınırları yanlarla kesiştir
        yb = y_sinir_pts.copy()
        yb[0, 0], yb[-1, 0] = sl_[0, 0] if False else yb[0, 0], yb[-1, 0]
        sgk = sg[(sg[:, 1] > u_[-1, 1]) & (sg[:, 1] < yb[-1, 1])]
        slk = sl_[(sl_[:, 1] > u_[0, 1]) & (sl_[:, 1] < yb[0, 1])]
        u_[0, 0] += ic * 0.7
        u_[-1, 0] -= ic
        yb[0, 0] += ic * 0.7
        yb[-1, 0] -= ic
        pts = np.concatenate([u_, sgk, yb[::-1], slk[::-1]], 0)
        return _poly(pts)
    # 1) temel: açık okra
    tum = bolge(alt)

    def solma(X, Y):
        return 1.0 - 0.45 * np.clip((Y - (y_alt - Hh * 0.22)) / (Hh * 0.22), 0, 1)
    B.lavi(tum, '#DCC3A0', yog=0.5, kenar=1.4, dalga=0.14, islak=0.8, islak_gen=4, gran=0.2, akis=0.22,
           renk2='#D7B994', yog_fn=solma)
    # 2) orta katman: sıcak siena
    orta = _dalgali_cizgi(rng, x0, x1, y_zemin + Hh * 0.58, Hh * 0.05)
    B.lavi(bolge(orta, 3.5), '#C49A72', yog=0.40, kenar=1.4, dalga=0.14, islak=0.9, islak_gen=4, gran=0.22, akis=0.2,
           renk2='#BE8F6A', siluet=False)
    # 3) üst humus: koyu, zengin
    hum = _dalgali_cizgi(rng, x0, x1, y_zemin + Hh * 0.17, Hh * 0.025, frek=(3, 7))
    B.lavi(bolge(hum, 7.0), '#9C7A60', yog=0.40, kenar=1.2, dalga=0.12, islak=1.0, islak_gen=3, gran=0.25,
           akis=0.2, renk2='#8F7060', siluet=False)
    # 4) ince katman çizgileri
    serit = []
    for j in range(5):
        yy = y_zemin + Hh * rng.uniform(0.25, 0.9)
        xa = rng.uniform(x0, x1 - (x1 - x0) * 0.3)
        xb = min(x1 - 8, xa + (x1 - x0) * rng.uniform(0.2, 0.55))
        c = _dalgali_cizgi(rng, xa, xb, yy, 3, n=20)
        w = np.sin(np.linspace(0, math.pi, len(c))) * rng.uniform(1.2, 2.6)
        serit.append(_poly(_serit_np(c, w)))
    B.lavi(serit, '#A47C5E', yog=0.22, kenar=1.0, dalga=0.15, islak=0.5, islak_gen=2, gran=0.2, akis=0.2,
           siluet=False)
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(kutu=nokta_donustur(M, x0, y_zemin) + nokta_donustur(M, x1, y_alt))


# ================================================================================================================
# çimen (ortak)
# ================================================================================================================
def _cimen_boya(B, M, x0, x1, y, yogunluk, sallanma, rng, boy=(14, 34), ince=False, renk1='#93B77F',
                renk2='#6F9F72', golge='#4F7F5E', yog=0.55):
    """Zemin çizgisi boyunca çimen tutamları (yerel). Döner: lavi izi."""
    yollar, koyu = [], []
    L = x1 - x0
    n_tutam = max(1, int(L / (26 if ince else 34) * yogunluk))
    for i in range(n_tutam):
        cx = x0 + (i + rng.uniform(0.1, 0.9)) / n_tutam * L
        nb = int(rng.integers(3, 7))
        hb = rng.uniform(*boy)
        for j in range(nb):
            u = (j + 0.5) / nb - 0.5
            h = hb * rng.uniform(0.55, 1.0) * (1 - 0.5 * abs(u))
            a = u * 1.1 + rng.uniform(-0.15, 0.15)
            bx = cx + u * hb * 0.5
            # yaprak: tabandan uca hafif kavis, rüzgârla eğilir
            uc = np.linspace(0, 1, 7)
            egim = a + sallanma * 0.6 * uc ** 1.5 + 0.25 * np.sign(u) * uc
            xs = bx + np.cumsum(np.sin(egim)) * h / 7
            ys = y - np.cumsum(np.cos(egim)) * h / 7
            om = np.stack([np.concatenate([[bx], xs]), np.concatenate([[y + 1.5], ys])], 1)
            w = np.linspace(rng.uniform(1.1, 1.8) * (0.7 if ince else 1.0), 0.15, len(om))
            P = _serit_np(om, w)
            (koyu if rng.random() < 0.35 else yollar).append(_poly(P))
    iz = B.lavi(yollar, renk1, yog=yog, Mloc=M, kenar=0.7, dalga=0.05, islak=0.8, islak_gen=1.6, gran=0.1, akis=0.2,
                renk2=renk2, toplam=True, ust=0.5)
    iz2 = B.lavi(koyu, golge, yog=yog * 0.85, Mloc=M, kenar=0.7, dalga=0.05, islak=0.7, islak_gen=1.5, gran=0.1,
                 akis=0.2, toplam=True, ust=0.5)
    if iz is None:
        return iz2
    if iz2 is not None:
        sl1, m1 = iz
        B.sakla(iz2)
    return iz


# ================================================================================================================
# 4. FIRTINA BULUTU
# ================================================================================================================
def _karis(a, b, t):
    a, b = renk(a), renk(b)
    return a + (b - a) * float(t)


def _gurultu(X, Y, kay, olcek, doku=None):
    doku = G_AKIS if doku is None else doku
    X = np.broadcast_to(X, np.broadcast_shapes(X.shape, Y.shape))
    Y = np.broadcast_to(Y, X.shape)
    xi = ((X * olcek + kay[0]) % N).astype(np.float32)
    yi = ((Y * olcek + kay[1]) % N).astype(np.float32)
    return cv2.remap(doku, xi, yi, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)


def _firtina_sekli(cx, cy, gen, yuk, rng):
    """Ağır, loblu üst ve hafif dalgalı tabanlı bulut silüeti + lob listesi."""
    n = int(rng.integers(6, 8))
    loblar = []
    for i in range(n):
        u = (i + 0.5) / n
        tepe = math.sin(u * math.pi) ** 0.8
        x = cx - gen * 0.42 + u * gen * 0.84 + rng.uniform(-0.03, 0.03) * gen
        r = yuk * (0.26 + 0.32 * tepe) * rng.uniform(0.9, 1.12)
        y = cy + yuk * 0.10 - r * 0.72 - tepe * yuk * 0.24
        loblar.append((x, y, r))
    p = yol_elips(cx, cy + yuk * 0.1, gen * 0.5, yuk * 0.32)
    for (x, y, r) in loblar:
        p = yol_op(p, yol_daire(x, y, r), 'birlesim')
    xs = np.linspace(cx - gen * 0.62, cx + gen * 0.62, 30)
    f1, f2 = rng.uniform(0, 6.28, 2)
    tb = cy + yuk * 0.32 + yuk * (0.04 * np.sin((xs - cx) / gen * 9 + f1) + 0.025 * np.sin((xs - cx) / gen * 17 + f2))
    tb += yuk * 0.07 * np.cos((xs - cx) / gen * math.pi) ** 2
    kes = np.concatenate([np.array([[cx - gen * 0.62, cy - yuk * 1.6]]), np.stack([xs, tb], 1),
                          np.array([[cx + gen * 0.62, cy - yuk * 1.6]])], 0)
    p = yol_op(p, _poly(kes), 'kesisim')
    return p, loblar


def ciz_firtina_bulutu(t: Tuval, M, cx, cy, gen, yuk, koyuluk=1.0, gelis=1.0, tohum=0, yon=0.0,
                       sakla_sonra=True):
    from motor import acilma_radyal
    gelis = min(1.0, max(0.0, float(gelis)))
    if gelis <= 0.0:
        return None
    k = min(1.0, max(0.0, float(koyuluk)))
    rng = np.random.default_rng(3301 + tohum * 7)
    eg = 1.0 - (1.0 - gelis) ** 3
    cx = cx + (1.0 - eg) * gen * 0.45 * yon
    yol, loblar = _firtina_sekli(cx, cy, gen, yuk, rng)
    B = _boya_ac(t, M, (cx - gen * 0.72, cy - yuk * 1.3, cx + gen * 0.72, cy + yuk * 1.0), tohum=tohum + 5)
    if B is None:
        return None
    ust_y, alt_y = cy - yuk * 0.95, cy + yuk * 0.38
    olc = math.sqrt(abs(np.linalg.det(np.asarray(M)[:2, :2])))
    ys_ = gen * olc / 900.0  # yumuşaklık ölçeği (ekran pikseli)
    orta_y = cy + yuk * 0.02

    # 1) üst: net, ışıklı kenarlı açık lavi (aşağı doğru söner)
    def ust_fn(X, Y):
        u = np.clip((Y - ust_y) / (alt_y - ust_y), 0, 1)
        return (0.5 + 0.7 * u) * (1.0 - smoothstep(orta_y - yuk * 0.05, alt_y - yuk * 0.05, Y))
    c1 = _karis('#C6CEDC', '#A9A5C2', k)
    c1b = _karis('#BAC6D8', '#A0A7C6', k)
    iz_ust = B.lavi(yol, c1, yog=0.34 + 0.24 * k, kenar=1.5, dalga=0.14, islak=0.9 + 0.3 * k, islak_gen=4.5,
                    gran=0.14, akis=0.14, renk2=c1b, yog_fn=ust_fn, siluet=False)
    if iz_ust is not None:  # saklamaya: üst kenar net, alt kenar yumuşak (aşağıdaki yumuşak lavi ekler)
        sl_, m_ = iz_ust
        X_, Y_ = B.xy_dilim(sl_)
        np.maximum(B.SIL[sl_], m_ * (1.0 - smoothstep(cy - yuk * 0.1, alt_y - yuk * 0.05, Y_)), out=B.SIL[sl_])
    # 2) alt: yumuşak kenarlı (ıslak-üstüne-ıslak) taban lavisi
    def alt_fn(X, Y):
        return smoothstep(cy - yuk * 0.35, orta_y + yuk * 0.12, Y)
    B.lavi(yol, c1, yog=0.34 + 0.24 * k, yumusak=(14 + 8 * k) * ys_, dalga=0.05, islak=0.0, gran=0.10, akis=0.12,
           renk2=c1b, yog_fn=alt_fn)
    # 3) lob gölgeleri: her lobun altında yumuşak, yuvarlak koyuluk (hacim)
    gl = []
    for (x, y, r) in loblar:
        gl.append(yol_op(yol_elips(x + r * 0.12, y + r * 0.42, r * 0.78, r * 0.55), yol, 'kesisim'))
    B.lavi(gl, _karis('#ADB7C9', '#85819F', k), yog=(0.16 + 0.18 * k), yumusak=(16 + 6 * k) * ys_, dalga=0.05,
           islak=0.0, gran=0.05, akis=0.12, toplam=True, ust=0.5, siluet=False)
    # 4) karın: alttan yukarı dağılan koyu lavi + geri akışlar
    karin_y = cy - yuk * 0.18
    karin = yol_op(yol, yol_dikdortgen(cx - gen, karin_y, cx + gen, cy + yuk * 2), 'kesisim')
    cicek = []
    for i in range(2):
        cicek.append((cx + (i - 0.5) * gen * rng.uniform(0.3, 0.5), cy + yuk * rng.uniform(0.02, 0.18),
                      yuk * rng.uniform(0.13, 0.19)))
    gr_ = sstep(0.3, 1.0, k)
    kay = (rng.uniform(0, 900), rng.uniform(0, 900))

    def karin_fn(X, Y):
        u = np.clip((Y - karin_y) / (alt_y - karin_y), 0, 1)
        d = 0.25 + 0.8 * u ** 0.8
        if gr_ > 0.02:
            n2 = _gurultu(X, Y, kay, 0.9 * 300 / gen, G_KENAR)
            for (bx, by, br) in cicek:
                dd = np.sqrt((X - bx) ** 2 + ((Y - by) * 1.3) ** 2) / br + 0.3 * n2
                ic = 1.0 - smoothstep(0.6, 1.0, dd)
                kenar_ = np.exp(-((dd - 0.95) / 0.1) ** 2)
                d = d * (1.0 - 0.22 * gr_ * ic) * (1.0 + 0.26 * gr_ * kenar_)
        return d
    yk = sstep(0.2, 0.75, gelis)
    if yk > 0:
        B.lavi(karin, _karis('#A3AEC3', '#5F5D86', k), yog=(0.26 + 0.34 * k) * yk, yumusak=(22 + 8 * k) * ys_,
               dalga=0.05,
               islak=0.0, gran=0.06, akis=0.12, renk2=_karis('#9DABC2', '#525B84', k), yog_fn=karin_fn,
               siluet=False)
    # 5) en koyu vurgular: karının içinde birkaç yumuşak leke
    vk = sstep(0.45, 0.95, gelis) * sstep(0.3, 1.0, k)
    if vk > 0:
        lek = []
        for i in range(3):
            x = cx + (i - 1) * gen * 0.28 + rng.uniform(-0.06, 0.06) * gen
            y = cy + yuk * rng.uniform(0.12, 0.26)
            lek.append(EL.damla_blob(x, y, 1.0, tohum=tohum * 5 + i, duzensizlik=0.2, lob=4,
                                     rx=gen * rng.uniform(0.1, 0.15), ry=yuk * rng.uniform(0.07, 0.1)))
        lek = [yol_op(q, yol, 'kesisim') for q in lek]
        B.lavi(lek, '#4D4B72', yog=0.30 * vk, yumusak=18 * ys_, dalga=0.05, islak=0.0, gran=0.05, akis=0.1,
               renk2='#58536F', siluet=False)
    if gelis < 1.0:
        with t.gorunurluk(1.0, acilma_radyal(min(1.0, gelis * 1.25), cx, cy, max(gen, yuk) * 0.62, dalga=0.22,
                                             tohum=tohum), M=M):
            B.bitir(sakla_sonra=sakla_sonra, siluet_yumusak=2.0)
    else:
        B.bitir(sakla_sonra=sakla_sonra, siluet_yumusak=2.0)
    x0e, y0e = nokta_donustur(M, cx - gen * 0.6, cy - yuk * 1.0)
    x1e, y1e = nokta_donustur(M, cx + gen * 0.6, alt_y)
    return dict(kutu=(x0e, y0e, x1e, y1e), taban_y=y1e, merkez=nokta_donustur(M, cx, cy))


# ================================================================================================================
# 5. YAĞMUR
# ================================================================================================================
def ciz_yagmur(t: Tuval, M, zaman, yogunluk, alan=(0, 0, W, H), ruzgar=0.0, tohum=0, zemin_y=None, korunan=None,
               hiz=2300.0, renk_='#7F8FA8', yog=0.42):
    """Yağmur çizgileri (bkz. modül belgesi)."""
    x0, y0, x1, y1 = alan
    yg = max(0.0, float(yogunluk))
    if yg <= 0.001:
        return None
    rng = np.random.default_rng(5501 + tohum)
    gen_, yuk_ = x1 - x0, y1 - y0
    taban = y1 if zemin_y is None else zemin_y
    n_max = int(gen_ * (taban - y0) / 2600.0)
    n = int(n_max * min(yg, 1.5))
    if n <= 0:
        return None
    # her damla: x, faz, hız çarpanı, boy, kalınlık, derinlik
    X0 = rng.uniform(0, 1, n_max)[:n]
    FZ = rng.uniform(0, 1, n_max)[:n]
    HZ = rng.uniform(0.8, 1.2, n_max)[:n]
    BY = rng.uniform(0.6, 1.25, n_max)[:n]
    DR = rng.uniform(0, 1, n_max)[:n]  # 0 uzak (ince, soluk) .. 1 yakın
    ust = y0 - 120
    yol_boy = taban - ust
    egim = ruzgar * 0.55  # dx/dy
    v = hiz * HZ * (0.75 + 0.5 * DR)
    L = (45 + 70 * DR) * BY * (0.6 + 0.4 * min(1.0, yg))
    # baş konumu (y), döngüsel
    yb = ust + ((FZ * (yol_boy + L) + v * zaman) % (yol_boy + L))
    xb = x0 - abs(egim) * yuk_ * 0.6 * np.sign(egim) * 0 + X0 * (gen_ + abs(egim) * yol_boy) - \
        (abs(egim) * yol_boy if egim > 0 else 0) + egim * (yb - ust)
    ys = yb - L  # kuyruk
    xs = xb - egim * L
    alfa = np.ones(n)
    # zemin: başın zemini geçen kısmı kesilir
    yb_k = np.minimum(yb, taban)
    gor = yb_k - ys > 4
    parilti = []
    if korunan is not None:
        kx, ky, kr = korunan
        # sapma: kürenin yakınında damlalar dışa itilir ve söner
        for arr_x, arr_y in ((xb, yb_k), (xs, ys)):
            dx, dy = arr_x - kx, arr_y - ky
            d = np.sqrt(dx * dx + dy * dy) + 1e-6
            itme = np.clip(1.0 - (d - kr) / (kr * 0.6), 0, 1) ** 2 * kr * 0.18
            arr_x += dx / d * itme
        dxh, dyh = xb - kx, yb_k - ky
        dh = np.sqrt(dxh * dxh + dyh * dyh)
        dxt, dyt = xs - kx, ys - ky
        dt = np.sqrt(dxt * dxt + dyt * dyt)
        dmin = np.minimum(dh, dt)
        alfa *= np.clip((dmin - kr * 1.02) / (kr * 0.35), 0, 1)
        # başı kürenin içine girmişse çizgiyi küre sınırında kes
        icerde = (dh < kr * 1.02) & (dt >= kr * 1.02)
        # parıltı: başın küre sınırını yeni geçtiği damlalar
        yeni = (dh < kr * 1.05) & (dh > kr * 0.85) & (dyh < 0)
        for i in np.flatnonzero(yeni)[:40]:
            parilti.append((kx + dxh[i] / max(dh[i], 1e-6) * kr * 1.02, ky + dyh[i] / max(dh[i], 1e-6) * kr * 1.02,
                            float(1.0 - abs(dh[i] / kr - 0.95) / 0.1)))
        gor &= ~((dh < kr) & (dt < kr))
    # sahne kenarında yumuşak beliriş
    alfa *= np.clip((ys - (y0 - 40)) / 80.0, 0, 1) + (ys > y0) * 0
    alfa *= np.clip((xb - x0) / 30.0 + 1, 0, 1) * np.clip((x1 - xb) / 30.0 + 1, 0, 1)
    k = yollar_kirp([yol_dikdortgen(x0 - 60, y0 - 130, x1 + 60, taban + 40)], M, 6)
    if k.bos():
        return None
    B = _Boya(t, M, k, tohum=tohum)
    # derinliğe göre iki geçiş: uzak ince/soluk, yakın kalın
    for katman, (d0, d1, kal, yy) in enumerate(((0.0, 0.55, 1.1, 0.55), (0.55, 1.01, 1.7, 1.0))):
        sec = np.flatnonzero(gor & (DR >= d0) & (DR < d1) & (alfa > 0.02))
        yollar, alf = [], []
        for i in sec:
            # fırça izi: başta kalın, kuyrukta incelen ince üçgen-şerit
            hx, hy = xb[i], yb_k[i]
            tx, ty = xs[i], ys[i]
            if hy - ty < 3:
                continue
            ux, uy = hx - tx, hy - ty
            ll = math.hypot(ux, uy) + 1e-6
            nx, ny = -uy / ll, ux / ll
            w = kal * (0.7 + 0.6 * DR[i])
            pts = [(tx, ty), (hx + nx * w * 0.5, hy + ny * w * 0.5 - w * 0.6), (hx, hy + w * 0.5),
                   (hx - nx * w * 0.5, hy - ny * w * 0.5 - w * 0.6)]
            yollar.append(yol_cokgen(pts))
            alf.append(float(alfa[i]))
        if yollar:
            B.lavi(yollar, renk_, yog=yog * yy * min(1.0, 0.55 + 0.45 * yg), kenar=0.6, dalga=0.0, islak=0.25,
                   islak_gen=1.2, gran=0.06, akis=0.25, alfalar=alf, esik=False, sakla=False)
    # sıçrama halkaları: son 0.28 sn içinde zemine değen damlalar
    if zemin_y is not None:
        halkalar, h_alf = [], []
        cevrim = (yol_boy + L) / v
        gecen = ((FZ * (yol_boy + L) + v * zaman - (taban - ust)) % (yol_boy + L)) / v  # zemine değeli geçen süre
        for i in np.flatnonzero((gecen < 0.28) & (DR > 0.25))[:400]:
            if korunan is not None and alfa[i] < 0.3:
                continue
            u = gecen[i] / 0.28
            xh = X0[i] * (gen_ + abs(egim) * yol_boy) - (abs(egim) * yol_boy if egim > 0 else 0) + x0 + \
                egim * (taban - ust)
            r = (3 + 9 * DR[i]) * (0.35 + 0.65 * u ** 0.6)
            a = (1 - u) ** 1.5
            halka = yol_op(yol_elips(xh, taban, r, r * 0.3), yol_elips(xh, taban - 0.4, r * 0.78, r * 0.2), 'fark')
            halkalar.append(halka)
            h_alf.append(a)
            if u < 0.5:
                for sgn in (-1, 1):
                    hx = xh + sgn * r * 0.7
                    hy = taban - (1 - (2 * u - 0.5) ** 2) * (5 + 6 * DR[i])
                    halkalar.append(yol_daire(hx, hy, 0.9 + 0.5 * DR[i]))
                    h_alf.append(a * 0.8)
        if halkalar:
            B.lavi(halkalar, renk_, yog=yog * 0.9, kenar=0.6, dalga=0.0, islak=0.2, islak_gen=1.0, gran=0.05,
                   akis=0.2, alfalar=h_alf, esik=False, sakla=False)
    B.bitir(sakla_sonra=False, sakla_global=False)
    # parıltılar (koruyucu kürenin yüzeyinde)
    for (px, py, a) in parilti:
        if a <= 0:
            continue
        t.isik(yol_daire(px, py, 2.2), M, '#FFF1C9', guc=0.55 * a, yumusak=2.5)
    return dict(sayi=int(np.count_nonzero(gor)))


# ================================================================================================================
# 6. UÇUŞAN YAPRAKLAR / TAÇ YAPRAKLARI
# ================================================================================================================
def ciz_ucusan_yapraklar(t: Tuval, M, zaman, sayi, alan=(0, 0, W, H), ruzgar=1.0, tohum=0, tur='yaprak',
                         boyut=1.0, renkler=None, yog=0.5):
    """Rüzgârda takla atan yapraklar/taç yaprakları (deterministik, zaman saniye)."""
    if sayi <= 0:
        return None
    x0, y0, x1, y1 = alan
    gen_, yuk_ = x1 - x0, y1 - y0
    rng = np.random.default_rng(7707 + tohum)
    n = int(sayi)
    if renkler is None:
        renkler = (['#93BC86', '#7FAE80', '#B9C98B', '#8FB2A2'] if tur == 'yaprak'
                   else ['#F0CFCB', '#EDB9BA', '#F4D6C6', '#E9A9AE'])
    yollar = {c: ([], []) for c in renkler}
    golge = []
    yon = 1.0 if ruzgar >= 0 else -1.0
    hz = abs(ruzgar)
    for i in range(n):
        fx, fy = rng.uniform(0, 1, 2)
        vx = (90 + 160 * rng.uniform()) * hz * yon + rng.uniform(-15, 15)
        vy = 40 + 60 * rng.uniform()
        sal_f, sal_a = rng.uniform(0.5, 1.2), rng.uniform(18, 46)
        don_h = rng.uniform(-3.0, 3.0)
        tak_h = rng.uniform(1.5, 4.0)
        f1, f2, f3 = rng.uniform(0, 6.28, 3)
        L = (rng.uniform(16, 26) if tur == 'yaprak' else rng.uniform(11, 17)) * boyut
        c = renkler[i % len(renkler)]
        # konum (döngüsel; alan dışına çıkınca öbür yandan girer)
        pad = 60
        px = x0 - pad + ((fx * (gen_ + 2 * pad) + vx * zaman + sal_a * math.sin(zaman * sal_f * 6.28 + f1)) %
                         (gen_ + 2 * pad))
        py = y0 - pad + ((fy * (yuk_ + 2 * pad) + vy * zaman + 0.5 * sal_a * math.sin(zaman * sal_f * 3.1 + f2)) %
                         (yuk_ + 2 * pad))
        aci = math.degrees(f3 + don_h * zaman) + 25 * math.sin(zaman * sal_f * 6.28 + f1)
        tak = math.cos(zaman * tak_h + f2)  # takla: görünen genişlik
        ag = 1.0
        # kenarlarda yumuşak giriş/çıkış
        ag *= min(1.0, max(0.0, (px - x0 + pad) / pad), max(0.0, (x1 + pad - px) / pad))
        ag *= min(1.0, max(0.0, (py - y0 + pad) / pad), max(0.0, (y1 + pad - py) / pad))
        if ag <= 0.02:
            continue
        if tur == 'yaprak':
            pts = _yaprak_np(0, 0, L, L * 0.28, 0, kivrim=0.12 * tak)
            pts[:, 0] -= L * 0.5
            pts[:, 1] *= max(0.18, abs(tak))
        else:
            # taç yaprağı: yelpaze/kaşık biçimi
            a = np.linspace(-math.pi / 2, math.pi / 2, 14)
            rr = L * 0.5 * (0.75 + 0.25 * np.cos(a * 3)) ** 0.5
            pts = np.concatenate([[[-L * 0.5, 0]], np.stack([np.cos(a) * rr, np.sin(a) * rr * 0.9], 1)], 0)
            pts[:, 1] *= max(0.2, abs(tak))
        ca, sa = math.cos(math.radians(aci)), math.sin(math.radians(aci))
        P = np.stack([pts[:, 0] * ca - pts[:, 1] * sa + px, pts[:, 0] * sa + pts[:, 1] * ca + py], 1)
        yollar[c][0].append(_poly(P))
        yollar[c][1].append(ag * (0.75 + 0.25 * abs(tak)))
        if tak < 0:  # arka yüzü görünürken biraz daha koyu
            golge.append((_poly(P), ag * 0.5 * abs(tak)))
    k = yollar_kirp([yol_dikdortgen(x0 - 80, y0 - 80, x1 + 80, y1 + 80)], M, 4)
    if k.bos():
        return None
    B = _Boya(t, M, k, tohum=tohum + 77)
    if golge:
        B.lavi([g_[0] for g_ in golge], '#5E7F6A' if tur == 'yaprak' else '#C9707E', yog=yog * 0.5, kenar=0.8,
               dalga=0.04, islak=0.6, islak_gen=1.5, gran=0.06, akis=0.1, alfalar=[g_[1] for g_ in golge],
               siluet=False, sakla=False)
    for c, (yy, aa) in yollar.items():
        if yy:
            B.lavi(yy, c, yog=yog, kenar=0.8, dalga=0.04, islak=1.0, islak_gen=1.8, gran=0.06, akis=0.15,
                   toplam=True, alfalar=aa, ust=0.6, siluet=False, sakla=False)
    B.bitir(sakla_sonra=False, sakla_global=False)
    return None


# ================================================================================================================
# 7. ÇİÇEK FİDANI (şakayık / gül)
# ================================================================================================================
_FIDAN_IS = {}


def _fidan_iskelet(tohum):
    if tohum in _FIDAN_IS:
        return _FIDAN_IS[tohum]
    rng = np.random.default_rng(6101 + tohum * 13)
    n = int(rng.choice([2, 3, 3, 1, 2]))
    cicekler = []
    for i in range(n):
        u = (i + 0.5) / n - 0.5
        cicekler.append(dict(dx=u * 0.62 + rng.uniform(-0.06, 0.06), h=rng.uniform(0.72, 1.0) if i != n // 2 else 1.0,
                             r=rng.uniform(0.17, 0.21), egim=rng.uniform(0.32, 0.45), aci=rng.uniform(-14, 14),
                             f=(0.0 if i == n // 2 else rng.uniform(0.25, 1.0)), tohum=int(rng.integers(0, 999)),
                             bx=rng.uniform(-0.05, 0.05), kiv=rng.uniform(-0.12, 0.12)))
    # tomurcuklar (küçük, kapalı)
    tomur = []
    for i in range(int(rng.integers(1, 4))):
        tomur.append(dict(dx=rng.uniform(-0.45, 0.45), h=rng.uniform(0.55, 0.9), r=rng.uniform(0.045, 0.06),
                          kiv=rng.uniform(-0.2, 0.2), aci=rng.uniform(-20, 20)))
    # yapraklar: sapların üzerinde, 3'lü gruplar
    yapraklar = []
    for i in range(int(rng.integers(5, 8))):
        hedef = rng.integers(0, n + len(tomur))
        u = rng.uniform(0.15, 0.7)
        taraf = rng.choice([-1, 1])
        for j, da in enumerate((-32, 0, 32)):
            yapraklar.append(dict(sap=int(hedef), u=u, taraf=int(taraf), aci=60 * taraf + da + rng.uniform(-8, 8),
                                  L=rng.uniform(0.17, 0.26) * (0.8 if j != 1 else 1.0), kat=int(rng.random() < 0.45),
                                  kiv=rng.uniform(-0.15, 0.15)))
    isk = dict(cicekler=cicekler, tomur=tomur, yapraklar=yapraklar)
    _FIDAN_IS[tohum] = isk
    return isk


def _sap_noktalari(x, y, dx, h, kiv, sallanma, solgun, boy, n=12):
    """Tabandan başa kavisli sap (yerel). solgun: baş aşağı/dışa sarkar."""
    u = np.linspace(0, 1, n)
    ux = x + dx * boy * u ** 1.4 + kiv * boy * np.sin(u * math.pi) * 0.5
    uy = y - h * boy * u
    # sallanma: üstte daha çok
    ux = ux + sallanma * boy * 0.09 * u ** 1.6
    if solgun > 0:
        sg = np.sign(dx) if abs(dx) > 0.02 else 1.0
        ux = ux + solgun * boy * 0.12 * u ** 2 * sg
        uy = uy + solgun * boy * 0.10 * u ** 2.5
    return np.stack([ux, uy], 1)


def _tomurcuk_yollari(px, py, r, aci, acik, renk_):
    """Kapalı tomurcuk: sivri uçlu pembe gövde + çanak yapraklar. acik 0..1 çanakların ayrılması."""
    a = math.radians(aci)
    ca, sa = math.cos(a), math.sin(a)

    def don(P):
        return np.stack([P[:, 0] * ca - P[:, 1] * sa + px, P[:, 0] * sa + P[:, 1] * ca + py], 1)
    u = np.linspace(0, 2 * math.pi, 40, endpoint=False)
    # damla biçimli gövde (uç yukarıda)
    bx = np.sin(u) * r * (0.9 + 0.1 * acik)
    by = -np.cos(u) * r * 1.15
    by = np.where(by < 0, by * (1.25 - 0.2 * acik), by)
    bx = bx * (1 - 0.35 * np.clip(-by / (r * 1.4), 0, 1) ** 2)
    govde = don(np.stack([bx, by], 1))
    canak = []
    for s_ in (-1, 1, 0):
        L = r * (1.5 if s_ else 1.25)
        P = _yaprak_np(0, r * 0.35, L, r * 0.42, -90 + s_ * (22 + 30 * acik), kivrim=-0.1 * s_)
        canak.append(don(P))
    return govde, canak


def ciz_cicek_fidani(t: Tuval, M, x, y, boy, renk_='allik', acilma=0.0, sallanma=0.0, solgunluk=0.0, tohum=0,
                     isik=(-0.6, -0.8), sakla_sonra=True):
    from motor import acilma_radyal
    isk = _fidan_iskelet(tohum)
    ac = float(acilma)
    sg = min(1.0, max(0.0, float(solgunluk)))
    lx, ly = isik
    ln = math.hypot(lx, ly) + 1e-9
    lx, ly = lx / ln, ly / ln
    renk_k = EL.CICEK_RENK.get(renk_, EL.CICEK_RENK['allik'])
    # saplar
    saplar = []
    for c in isk['cicekler']:
        saplar.append(_sap_noktalari(x + c['bx'] * boy, y, c['dx'], c['h'] * 0.86, c['kiv'], sallanma, sg, boy))
    for tm in isk['tomur']:
        saplar.append(_sap_noktalari(x, y, tm['dx'], tm['h'] * 0.86, tm['kiv'], sallanma * 1.2, sg * 1.2, boy))
    # kırpıntı
    allp = np.concatenate(saplar, 0)
    pad = boy * 0.45
    B = _boya_ac(t, M, (allp[:, 0].min() - pad, allp[:, 1].min() - pad, allp[:, 0].max() + pad, y + 10),
                 tohum=tohum + 21)
    if B is None:
        return None
    sonuc = []
    # --- 1) çiçekler (öndeki: daha alçak olanlar önce) ---
    sira = sorted(range(len(isk['cicekler'])), key=lambda i: -saplar[i][-1, 1])
    tomur_ciz = []
    for i in sira:
        c = isk['cicekler'][i]
        p = min(1.0, max(0.0, ac * 1.3 - 0.3 * c['f']))
        px, py = saplar[i][-1]
        r = c['r'] * boy
        egim = min(0.75, c['egim'] + 0.25 * sg)
        aci = c['aci'] + sallanma * 9 + sg * 18 * (1 if c['dx'] >= 0 else -1)
        acik_q = sstep(0.32, 0.78, p)  # açılış (radyal beliriş)
        cy_ = py - r * 0.08
        if acik_q > 0.001:
            ac_f = 0.45 + 0.55 * sstep(0.55, 1.0, p)
            yg = 1.0 - 0.12 * sg
            if acik_q < 0.999:
                with t.gorunurluk(1.0, acilma_radyal(acik_q, px, cy_, r * 1.08, dalga=0.16, on=0.18,
                                                     tohum=c['tohum']), M=M):
                    EL.sakayik(t, M, px, cy_, r, renk_, tohum=c['tohum'], acilma=ac_f, yog=yg, egim=egim, aci=aci)
            else:
                EL.sakayik(t, M, px, cy_, r, renk_, tohum=c['tohum'], acilma=ac_f, yog=yg, egim=egim, aci=aci)
        # tomurcuk (açılınca çiçeğin arkasında kalır ve solar)
        tb = 1.0 - sstep(0.5, 0.85, p)
        if tb > 0.01:
            rb = r * (0.26 + 0.14 * sstep(0.0, 0.45, p))
            tomur_ciz.append((px, py - rb * 0.6, rb, aci * 0.5, sstep(0.15, 0.5, p), tb))
        sonuc.append((nokta_donustur(M, px, cy_), r * math.sqrt(abs(np.linalg.det(np.asarray(M)[:2, :2]))), p))
    for j, tm in enumerate(isk['tomur']):
        px, py = saplar[len(isk['cicekler']) + j][-1]
        tomur_ciz.append((px, py, tm['r'] * boy, tm['aci'] + sallanma * 10, 0.15 * min(1, ac), 1.0))
    # --- 2) tomurcuklar ---
    if tomur_ciz:
        gv, gva, cn, cna = [], [], [], []
        for (px, py, rb, aci, acik, a) in tomur_ciz:
            govde, canak = _tomurcuk_yollari(px, py, rb, aci, acik, renk_)
            gv.append(_poly(govde))
            gva.append(a)
            for cc in canak:
                cn.append(_poly(cc))
                cna.append(a)
        izc = B.lavi(cn, '#7DA676', yog=0.55, kenar=0.8, dalga=0.05, islak=1.0, islak_gen=1.6, gran=0.08, akis=0.15,
                     toplam=True, alfalar=cna, ust=0.4, renk2='#6C9A70')
        B.sakla(izc)
        izg = B.lavi(gv, renk_k[2], yog=0.55, kenar=0.8, dalga=0.05, islak=1.1, islak_gen=1.8, gran=0.08,
                     akis=0.15, alfalar=gva, renk2=renk_k[3])
        B.sakla(izg)
    # --- 3) yapraklar (ön kat), saplar, arka kat ---
    yap = ([], [], []), ([], [], [])
    for yp in isk['yapraklar']:
        sp = saplar[min(yp['sap'], len(saplar) - 1)]
        j = int(yp['u'] * (len(sp) - 1))
        px, py = sp[j]
        aci = -90 + yp['aci'] + sallanma * 12 + sg * 28 * yp['taraf']
        L = yp['L'] * boy
        P = _yaprak_np(px, py, L, L * 0.27, aci, kivrim=yp['kiv'] * yp['taraf'] + 0.1 * sg * yp['taraf'])
        hedef = yap[yp['kat']]
        hedef[0].append(_poly(P))
        ar = math.radians(aci)
        nx, ny = -math.sin(ar), math.cos(ar)
        if nx * (-lx) + ny * (-ly) < 0:
            nx, ny = -nx, -ny
        h = _yaprak_np(px + nx * L * 0.07, py + ny * L * 0.07, L * 0.95, L * 0.12, aci,
                       kivrim=yp['kiv'] * yp['taraf'] + 0.1 * sg * yp['taraf'])
        hedef[1].append(_poly(h))
    sol = 1.0 - 0.15 * sg
    if yap[0][0]:
        iz = B.lavi(yap[0][0], '#8DB783', yog=0.52 * sol, kenar=0.9, dalga=0.05, islak=1.0, islak_gen=2.2, gran=0.08,
                    akis=0.18, toplam=True, ust=0.5, renk2='#74A57A')
        B.lavi(yap[0][1], '#4F8463', yog=0.30, kenar=0.8, dalga=0.05, islak=0.8, islak_gen=1.8, gran=0.08, akis=0.1,
               siluet=False)
        B.sakla(iz)
    sap_y = []
    w0 = max(0.9, boy * 0.011)
    for sp in saplar:
        sap_y.append(_poly(_serit_np(sp, np.linspace(w0, w0 * 0.6, len(sp)))))
    iz = B.lavi(sap_y, '#7E9467', yog=0.6, kenar=0.7, dalga=0.04, islak=0.7, islak_gen=1.5, gran=0.1, akis=0.12,
                renk2='#8A8A62')
    B.sakla(iz)
    if yap[1][0]:
        B.lavi(yap[1][0], '#6E9C76', yog=0.55 * sol, kenar=0.9, dalga=0.05, islak=1.0, islak_gen=2.2, gran=0.08,
               akis=0.18, toplam=True, ust=0.5, renk2='#5F8E72')
        B.lavi(yap[1][1], '#3F6F57', yog=0.30, kenar=0.8, dalga=0.05, islak=0.8, islak_gen=1.8, gran=0.08, akis=0.1,
               siluet=False)
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(cicekler=sonuc, kutu=nokta_donustur(M, allp[:, 0].min() - pad, allp[:, 1].min() - pad) +
                nokta_donustur(M, allp[:, 0].max() + pad, y))


# ================================================================================================================
# 8. ZEMİN ÖĞELERİ: yol, taş, dere, çimen, tarh
# ================================================================================================================
def _genislikler(noktalar, genislik, daralma):
    P = np.asarray(noktalar, np.float64)
    if np.ndim(genislik) == 0:
        d = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
        u = d / max(d[-1], 1e-6)
        return float(genislik) * (1.0 - daralma * u)
    return np.asarray(genislik, np.float64)


def _yumusak_omurga(noktalar, n=None):
    """Catmull-Rom ile sıklaştırılmış omurga (n,2)."""
    P = np.asarray(noktalar, np.float64)
    if len(P) < 3:
        return P
    n = n or max(40, 12 * len(P))
    Q = np.concatenate([P[:1] * 2 - P[1:2], P, P[-1:] * 2 - P[-2:-1]], 0)
    out = []
    per = max(2, n // (len(P) - 1))
    for i in range(1, len(Q) - 2):
        p0, p1, p2, p3 = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
        for s in np.linspace(0, 1, per, endpoint=False):
            s2, s3 = s * s, s * s * s
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 +
                              (-p0 + 3 * p1 - 3 * p2 + p3) * s3))
    out.append(P[-1])
    return np.array(out)


def ciz_yol(t: Tuval, M, noktalar, genislik, tohum=0, daralma=0.88, sakla_sonra=True):
    rng = np.random.default_rng(1201 + tohum)
    P0 = np.asarray(noktalar, np.float64)
    om = _yumusak_omurga(P0)
    w = _genislikler(P0, genislik, daralma)
    # genişliği sık omurgaya aktar
    d0 = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P0, axis=0), axis=1))])
    d1 = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(om, axis=0), axis=1))])
    wo = np.interp(d1 / max(d1[-1], 1e-6), d0 / max(d0[-1], 1e-6), w) * 0.5
    # kenarlara hafif düzensizlik
    f = rng.uniform(0, 6.28, 2)
    u = d1 / max(d1[-1], 1e-6)
    wo_s = wo * (1 + 0.06 * np.sin(u * 37 + f[0]) + 0.04 * np.sin(u * 83 + f[1]))
    kutu = (om[:, 0].min() - wo.max() - 20, om[:, 1].min() - 20, om[:, 0].max() + wo.max() + 20,
            om[:, 1].max() + wo.max() + 20)
    B = _boya_ac(t, M, kutu, tohum=tohum + 31)
    if B is None:
        return None
    yol_s = _poly(_serit_np(om, wo_s))
    # küçük taşlar (önde)
    cak = []
    nc = int(d1[-1] / 40)
    for i in range(nc):
        s = rng.uniform(0, 1) ** 0.8
        j = min(int(s * (len(om) - 1)), len(om) - 2)
        tan = om[j + 1] - om[j]
        tan /= np.linalg.norm(tan) + 1e-9
        nor = np.array([-tan[1], tan[0]])
        side = rng.choice([-1, 1]) * rng.uniform(0.55, 0.95)
        c = om[j] + nor * wo[j] * side
        r = max(0.8, wo[j] * rng.uniform(0.025, 0.06))
        cak.append(_poly(_cakil(rng, c[0], c[1], r)))
    if cak:
        iz = B.lavi(cak, '#B9AFA6', yog=0.45, kenar=0.7, dalga=0.05, islak=0.9, islak_gen=1.5, gran=0.12, akis=0.15)
        B.sakla(iz)
    # kenar sırrı: iki kenar boyunca içte koyu bant
    kenar_y = []
    for sgn in (-1, 1):
        tan = np.gradient(om, axis=0)
        tan /= np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9
        nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
        o2 = om + nor * (sgn * wo_s * 0.8)[:, None]
        kenar_y.append(_poly(_serit_np(o2, wo_s * 0.22)))
    B.lavi(kenar_y, '#CDB290', yog=0.28, kenar=1.2, dalga=0.14, islak=0.6, islak_gen=3, gran=0.16, akis=0.2,
           siluet=False)
    # orta iz: yürünmüş, biraz açık; lekeler
    lek = []
    for i in range(int(d1[-1] / 90)):
        s = rng.uniform(0.0, 0.95)
        j = int(s * (len(om) - 1))
        c = om[j]
        lek.append(EL.damla_blob(c[0] + rng.uniform(-0.3, 0.3) * wo[j], c[1], 1.0, tohum=int(rng.integers(0, 999)),
                                 duzensizlik=0.2, lob=4, rx=wo[j] * rng.uniform(0.2, 0.45),
                                 ry=wo[j] * rng.uniform(0.06, 0.12)))
    B.lavi(lek, '#D6BE98', yog=0.22, kenar=1.4, dalga=0.18, islak=0.5, islak_gen=3, gran=0.16, akis=0.2,
           siluet=False, toplam=True, ust=0.3)
    B.lavi(yol_s, '#E7D3AF', yog=0.5, kenar=1.3, dalga=0.12, islak=0.85, islak_gen=3.5, gran=0.16, akis=0.18,
           renk2='#E2C9A2')
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(omurga=[nokta_donustur(M, p[0], p[1]) for p in om[::max(1, len(om) // 24)]])


def _tas_sekli(x, y, r, rng, yass=1.0):
    """Taban (x,y) üzerinde duran yuvarlak kaya noktaları; yass < 1 yassı."""
    n = 40
    a = np.linspace(0, 2 * math.pi, n, endpoint=False)
    f = rng.uniform(0, 6.28, 3)
    rr = r * (1 + 0.09 * np.sin(2 * a + f[0]) + 0.05 * np.sin(3 * a + f[1]) + 0.03 * np.sin(5 * a + f[2]))
    hx = rng.uniform(1.05, 1.3)
    hy = rng.uniform(0.72, 0.95) * yass
    px = np.cos(a) * rr * hx
    py = np.sin(a) * rr * hy
    py = np.where(py > 0, py * 0.35, py)  # alt düz
    return np.stack([px + x, py + y - r * hy * 0.3], 1), r * hy


def _tas_boya(B, M, x, y, r, rng, isik, yass=1.0, renk1='#CFC6BE', renk2='#C3B8B4', golge='#8F8898', golge_yer=True,
              islak_tas=0.0):
    lx, ly = isik
    P, hh = _tas_sekli(x, y, r, rng, yass)
    yol = _poly(P)
    d = r * 0.55
    gol = yol_op(yol, _poly(P + np.array([lx * d, ly * d])), 'fark')
    # çatlak/yüzey çizgisi
    cz = []
    if r * math.sqrt(abs(np.linalg.det(np.asarray(M)[:2, :2]))) > 14:
        a0 = rng.uniform(-0.4, 0.4)
        q = np.array([[x + r * (0.1 + a0), y - hh * 0.9], [x + r * (0.25 + a0), y - hh * 0.55],
                      [x + r * (0.18 + a0), y - hh * 0.25]])
        cz.append(_poly(q, kapali=False))
    olc = math.sqrt(abs(np.linalg.det(np.asarray(M)[:2, :2])))
    iz = B.lavi(yol, renk1, yog=0.5 + 0.12 * islak_tas, Mloc=M, kenar=1.0, dalga=0.08, islak=1.0, islak_gen=2.5,
                gran=0.18, akis=0.22, renk2=renk2, isik_kenar=(lx * r * 0.3 * olc, ly * r * 0.3 * olc, 0.35))
    B.lavi(gol, golge, yog=0.36 + 0.1 * islak_tas, Mloc=M, kenar=1.0, dalga=0.1, islak=0.9, islak_gen=2.2, gran=0.16,
           akis=0.15, siluet=False)
    if cz:
        B.lavi(cz, golge, yog=0.32, Mloc=M, kenar=0.6, dalga=0.1, islak=0.2, islak_gen=1, gran=0.1, akis=0.1,
               cizgi=max(0.8, r * 0.03), siluet=False, esik=False)
    B.sakla(iz)
    if golge_yer:
        # zemine düşen gölge (sağ-alt), taşın arkasında
        gx = x - lx * r * 0.5
        gy = y + r * 0.04
        gol2 = yol_elips(gx, gy, r * 1.35, r * 0.22)
        B.lavi(gol2, '#A9A2B4', yog=0.32, Mloc=M, yumusak=max(1.5, r * 0.08 * olc), dalga=0.1, islak=0.0, gran=0.12,
               akis=0.15)
    return iz


def ciz_tas(t: Tuval, M, x, y, r, tohum=0, isik=(-0.6, -0.8), yass=1.0, sakla_sonra=True):
    rng = np.random.default_rng(2207 + tohum)
    lx, ly = isik
    ln = math.hypot(lx, ly) + 1e-9
    B = _boya_ac(t, M, (x - r * 2.2, y - r * 1.4, x + r * 2.2, y + r * 0.5), tohum=tohum + 41)
    if B is None:
        return None
    _tas_boya(B, M, x, y, r, rng, (lx / ln, ly / ln), yass=yass)
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(tepe=nokta_donustur(M, x, y - r))


def ciz_cimen(t: Tuval, M, x0, x1, y, yogunluk=1.0, sallanma=0.0, tohum=0, boy=(14, 34), sakla_sonra=True):
    rng = np.random.default_rng(3307 + tohum)
    B = _boya_ac(t, M, (x0 - 20, y - boy[1] * 1.3, x1 + 20, y + 6), tohum=tohum + 51)
    if B is None:
        return None
    _cimen_boya(B, M, x0, x1, y, yogunluk, sallanma, rng, boy=boy)
    B.bitir(sakla_sonra=sakla_sonra)
    return None


def ciz_tarh(t: Tuval, M, x0, x1, y, tohum=0, yuk=None, bolum='hepsi', sakla_sonra=True):
    """Koyu, zengin topraklı bahçe tarhı. y: bitkilerin dikildiği üst yüzey çizgisi."""
    rng = np.random.default_rng(4407 + tohum)
    L = x1 - x0
    hh = float(yuk if yuk is not None else min(60.0, max(26.0, L * 0.07)))
    B = _boya_ac(t, M, (x0 - 20, y - hh, x1 + 20, y + hh), tohum=tohum + 61)
    if B is None:
        return None
    xs = np.linspace(x0, x1, 40)
    u = (xs - x0) / L
    yuv = np.sin(np.clip(u, 0, 1) * math.pi) ** 0.35
    f = rng.uniform(0, 6.28, 3)
    ust = y - hh * 0.30 * yuv + hh * 0.06 * np.sin(u * 13 + f[0])
    on_ust = y + hh * 0.12 * yuv + hh * 0.04 * np.sin(u * 17 + f[1])  # ön yüzün başladığı çizgi
    alt = y + hh * 0.55 * (0.4 + 0.6 * yuv) + hh * 0.04 * np.sin(u * 11 + f[2])
    tum = _poly(np.concatenate([np.stack([xs, ust], 1), np.stack([xs[::-1], alt[::-1]], 1)], 0))
    on = _poly(np.concatenate([np.stack([xs, on_ust], 1), np.stack([xs[::-1], alt[::-1]], 1)], 0))
    if bolum in ('hepsi', 'on'):
        # topak ve benekler
        ben = []
        for i in range(int(L / 9)):
            xx = rng.uniform(x0 + 6, x1 - 6)
            uu = (xx - x0) / L
            yv = math.sin(uu * math.pi) ** 0.35
            yt = y - hh * 0.30 * yv
            yb = y + hh * 0.55 * (0.4 + 0.6 * yv)
            yy = rng.uniform(yt + 2, yb - 2)
            ben.append(_poly(_cakil(rng, xx, yy, rng.uniform(0.8, 2.2))))
        izb = B.lavi(ben, '#5C463D', yog=0.4, kenar=0.6, dalga=0.05, islak=0.5, islak_gen=1, gran=0.1, akis=0.1,
                     siluet=False)
        if bolum == 'on':
            B.lavi(on, '#7A5E4E', yog=0.55, kenar=1.1, dalga=0.12, islak=0.9, islak_gen=3, gran=0.24, akis=0.2,
                   renk2='#6E5548')
            B.lavi(on, '#5D4A46', yog=0.3, kenar=1.1, dalga=0.12, islak=0.7, islak_gen=3, gran=0.2, akis=0.2,
                   siluet=False, yog_fn=lambda X, Y: np.clip((Y - y) / (hh * 0.5), 0, 1))
            B.bitir(sakla_sonra=sakla_sonra)
            return dict(ust_y=float(nokta_donustur(M, (x0 + x1) / 2, ust.min())[1]))
    # tam tarh: üst yüzey açık (ışık), ön yüz koyu sır
    def isik_fn(X, Y):
        return 0.75 + 0.45 * np.clip((Y - (y - hh * 0.3)) / (hh * 0.9), 0, 1)
    B.lavi(tum, '#8A6A55', yog=0.55, kenar=1.1, dalga=0.12, islak=0.9, islak_gen=3, gran=0.24, akis=0.2,
           renk2='#7A5E4E', yog_fn=isik_fn)
    B.lavi(on, '#5D4A46', yog=0.32, kenar=1.1, dalga=0.12, islak=0.8, islak_gen=3, gran=0.2, akis=0.2, siluet=False,
           yog_fn=lambda X, Y: 0.4 + 0.6 * np.clip((Y - y) / (hh * 0.5), 0, 1))
    # karık çizgileri (üst yüzeyde)
    kr = []
    for j in range(3):
        yy = y - hh * (0.05 + 0.08 * j)
        xa, xb = x0 + L * (0.08 + 0.05 * j), x1 - L * (0.08 + 0.05 * j)
        c = _dalgali_cizgi(rng, xa, xb, yy, 1.2, n=24)
        kr.append(_poly(_serit_np(c, np.sin(np.linspace(0, math.pi, len(c))) * 1.2 + 0.2)))
    B.lavi(kr, '#5A4740', yog=0.25, kenar=0.8, dalga=0.1, islak=0.4, islak_gen=1.5, gran=0.2, akis=0.15,
           siluet=False)
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(ust_y=float(nokta_donustur(M, (x0 + x1) / 2, ust.min())[1]))


def ciz_dere(t: Tuval, M, noktalar, genislik, zaman=0.0, tohum=0, daralma=0.6, taslar=0.5, tas_sayi=3,
             sakla_sonra=True):
    rng = np.random.default_rng(5507 + tohum)
    P0 = np.asarray(noktalar, np.float64)
    om = _yumusak_omurga(P0, n=160)
    w = _genislikler(P0, genislik, daralma)
    d0 = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P0, axis=0), axis=1))])
    d1 = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(om, axis=0), axis=1))])
    Ltop = d1[-1]
    wo = np.interp(d1 / max(Ltop, 1e-6), d0 / max(d0[-1], 1e-6), w) * 0.5
    f = rng.uniform(0, 6.28, 4)
    u = d1 / max(Ltop, 1e-6)
    wl = wo * (1 + 0.08 * np.sin(u * 23 + f[0]) + 0.05 * np.sin(u * 61 + f[1]))
    wr = wo * (1 + 0.08 * np.sin(u * 29 + f[2]) + 0.05 * np.sin(u * 53 + f[3]))
    tan = np.gradient(om, axis=0)
    tan /= np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9
    nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
    sol = om + nor * wl[:, None]
    sag = om - nor * wr[:, None]
    su = _poly(np.concatenate([sol, sag[::-1]], 0))
    kutu = (om[:, 0].min() - wo.max() * 1.6, om[:, 1].min() - wo.max() * 1.6, om[:, 0].max() + wo.max() * 1.6,
            om[:, 1].max() + wo.max() * 1.6)
    B = _boya_ac(t, M, kutu, tohum=tohum + 71)
    if B is None:
        return None
    isik = (-0.6, -0.8)
    # 1) basamak taşları (önde)
    tas_konum = []
    if tas_sayi > 0:
        j = int(np.clip(taslar, 0, 1) * (len(om) - 1))
        for q in range(tas_sayi):
            fr = (q + 0.5) / tas_sayi * 2 - 1  # -1..1 enine
            c = om[j] + nor[j] * fr * wo[j] * 0.78 + tan[j] * rng.uniform(-0.12, 0.12) * wo[j]
            r = wo[j] * rng.uniform(0.2, 0.26)
            tas_konum.append((c[0], c[1], r))
        for (cx, cy, r) in sorted(tas_konum, key=lambda q: -q[1]):
            _tas_boya(B, M, cx, cy + r * 0.25, r, rng, isik, yass=0.55, renk1='#D2CBC4', renk2='#C6BEBB',
                      golge_yer=False, islak_tas=0.5)
    # 2) ışık dalgacıkları (kâğıt beyazı): akışla ilerler
    dalg = []
    hiz = 38.0
    nd = int(Ltop / 26)
    for i in range(nd):
        s0 = rng.uniform(0, 1)
        lat = rng.uniform(-0.7, 0.7)
        ln_ = rng.uniform(0.5, 1.0)
        s = ((s0 * Ltop + hiz * zaman * rng.uniform(0.8, 1.2)) % Ltop)
        # ömür: belir-sön (dalgacık titremesin diye konumla bağlı)
        faz = (s0 * 7.3 + zaman * 0.6 * rng.uniform(0.7, 1.3)) % 1.0
        a = math.sin(faz * math.pi) ** 2
        if a < 0.15:
            continue
        jj = int(np.searchsorted(d1, s))
        jj = min(max(jj, 1), len(om) - 2)
        wj = wo[jj]
        Lr = wj * 0.55 * ln_ * a
        ss = np.linspace(s - Lr, s + Lr, 8)
        cx_ = np.interp(ss, d1, om[:, 0]) + np.interp(ss, d1, nor[:, 0]) * lat * wj
        cy_ = np.interp(ss, d1, om[:, 1]) + np.interp(ss, d1, nor[:, 1]) * lat * wj
        kal = np.sin(np.linspace(0, math.pi, 8)) * max(0.6, wj * 0.035) * a
        dalg.append(_poly(_serit_np(np.stack([cx_, cy_], 1), kal + 0.05)))
    # taşların çevresinde akış izi (V dalgası)
    for (cx, cy, r) in tas_konum:
        j = int(np.argmin(np.sum((om - [cx, cy]) ** 2, 1)))
        for sgn in (-1, 1):
            q = np.array([[cx + tan[j, 0] * r * 0.9, cy + tan[j, 1] * r * 0.9 - r * 0.1],
                          [cx + tan[j, 0] * r * 1.8 + nor[j, 0] * sgn * r * 0.6,
                           cy + tan[j, 1] * r * 1.8 + nor[j, 1] * sgn * r * 0.6]])
            q = np.array([q[0], (q[0] + q[1]) / 2 + nor[j] * sgn * r * 0.1, q[1]])
            dalg.append(_poly(_serit_np(q, np.array([r * 0.08, r * 0.06, r * 0.02]))))
    if dalg:
        B.sakla_yol(dalg, M, yumusak=0.5)
    # 3) su: derin orta + açık geniş lavi
    orta = _poly(_serit_np(om + nor * ((wl - wr) * 0.5)[:, None] * 0, wo * 0.55))
    B.lavi(orta, '#86A9C8', yog=0.3, yumusak=max(2.0, float(wo.mean()) * 0.12 *
                                                 math.sqrt(abs(np.linalg.det(np.asarray(M)[:2, :2])))),
           dalga=0.1, islak=0.0, gran=0.1, akis=0.25, siluet=False)
    B.lavi(su, '#A8C7DE', yog=0.5, kenar=1.1, dalga=0.1, islak=1.0, islak_gen=3, gran=0.12, akis=0.22,
           renk2='#9EC0D6')
    # 4) kıyılar: toprak bandı (su silüeti saklamada)
    B.sakla_yol(su, M, yumusak=0.6)
    kiyi = []
    for (kenar_pts, sgn) in ((sol, 1), (sag, -1)):
        o2 = kenar_pts + nor * (sgn * wo * 0.1)[:, None]
        kiyi.append(_poly(_serit_np(o2, wo * 0.16 + 1.0)))
    B.lavi(kiyi, '#BBA785', yog=0.38, kenar=1.2, dalga=0.18, islak=0.8, islak_gen=2.5, gran=0.18, akis=0.2,
           renk2='#A8A57E')
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(taslar=[nokta_donustur(M, cx, cy) for (cx, cy, r) in tas_konum],
                omurga=[nokta_donustur(M, p[0], p[1]) for p in om[::8]])
