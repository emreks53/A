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
        self.T = np.ones((h, w, 3), np.float32)
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
    def lavi(self, yollar, renk_, yog=0.5, Mloc=None, kenar=1.0, dalga=0.08, islak=0.8, islak_gen=3.0, gran=0.10,
             akis=0.15, yumusak=0.0, cizgi=None, toplam=False, alfalar=None, ust=0.8, renk2=None, karisim=None,
             yog_fn=None, sakla=True, siluet=True, pay=None, esik=True, gradyanlar=None):
        """toplam: üst üste binen yollar koyulaşır (her biri kendi ıslak kenarıyla). alfalar: yol ağırlıkları.
        renk2 + karisim ('akis' ya da f(X,Y)->0..1): iki pigment ıslak karışımı. yog_fn(X,Y): nesne yerelinde."""
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
        gk = self.gk[sl]
        if yumusak > 0:
            mb = cv2.GaussianBlur(G, (0, 0), yumusak) if yumusak < 12 else _genis_bulanik(G, yumusak)
            if dalga > 0:
                mb = np.clip(mb * (1.0 + dalga * 1.5 * gk), 0, 1)
            m2 = mb
        else:
            mb = cv2.GaussianBlur(G, (0, 0), kenar) if kenar > 0.05 else G
            if dalga > 0:
                mb = mb + dalga * gk * (4.0 * mb * (1.0 - mb) + 0.02)
            if esik:
                g = 0.16 + 0.05 * kenar
                m2 = smoothstep(0.5 - g, 0.5 + g, mb)
            else:
                m2 = np.clip(mb, 0, 1)
        if Wm is not None:
            Wb = cv2.GaussianBlur(Wm, (0, 0), max(0.6, kenar * 0.8))
            dens = np.minimum(Wb, 1.0)
            if toplam:
                dens = dens + ust * np.maximum(Wb - 1.0, 0.0)
            D = m2 * dens
        else:
            D = m2.copy()
        if islak > 0:
            b = cv2.GaussianBlur(D, (0, 0), islak_gen)
            E = np.clip((D - b) * 2.2, 0, 1)
            D *= 1.0 + islak * E
        if gran > 0:
            D *= np.clip(1.0 + gran * GRAN[kk.dilim], 0.2, 2.2)
        if akis > 0:
            D *= np.clip(1.0 + akis * self.ga[sl], 0.3, 1.9)
        if yog_fn is not None:
            X, Y = self.xy_dilim(sl)
            D *= yog_fn(X, Y)
        D *= yog
        if sakla:
            D *= 1.0 - self.S[sl]
        np.clip(D, 0.0, 1.0, out=D)
        C = renk(renk_)
        if renk2 is not None:
            if karisim is None or karisim == 'akis':
                f = smoothstep(-0.9, 0.9, self.gr[sl])
            else:
                X, Y = self.xy_dilim(sl)
                f = np.clip(np.broadcast_to(karisim(X, Y), D.shape), 0, 1)
            C2 = renk(renk2)
            Cm = C[None, None, :] + (C2 - C)[None, None, :] * f[..., None]
            self.T[sl] *= 1.0 - D[..., None] * (1.0 - Cm)
        else:
            self.T[sl] *= 1.0 - D[..., None] * (1.0 - C)
        if siluet:
            np.maximum(self.SIL[sl], m2, out=self.SIL[sl])
        return (sl, m2)

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
        vis = None
        if sakla_global and t.saklama is not None:
            vis = 1.0 - t.saklama[k.dilim]
        if t._yigin:
            v0 = vis if vis is not None else np.ones((k.h, k.w), np.float32)
            vis = t._yigin_maske(v0, k) * t._yigin_alfa()
        hedef = t.R[k.dilim]
        if vis is None:
            hedef *= self.T
        else:
            hedef *= 1.0 - (1.0 - self.T) * vis[..., None]
        if sakla_sonra and self.SIL.max() > 0:
            t.sakla_ekle([], self.M, yumusak=siluet_yumusak, maske=(k, self.SIL))
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
            if any((k['x'] - pp[-1, 0]) ** 2 + (k['y'] - pp[-1, 1]) ** 2 < (0.55 * k['R']) ** 2 for k in kumeler):
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
    # (c) kapsama doldurma
    gx, gy = np.meshgrid(np.linspace(-1, 1, 41), np.linspace(-1, 1, 31))
    ic = gx ** 2 + gy ** 2 <= 0.86
    px_ = tcx + gx[ic] * trx
    py_ = tcy + gy[ic] * try_
    for _ in range(40):
        kap = np.zeros(px_.shape, bool)
        for k in kumeler:
            if k['tur'] == 'kutle':
                continue
            kap |= (px_ - k['x']) ** 2 + (py_ - k['y']) ** 2 < (0.8 * k['R']) ** 2
        if kap.mean() > 0.82:
            break
        bos = np.where(~kap)[0]
        j = bos[int(rng.integers(0, len(bos)))]
        ekle(px_[j] + rng.uniform(-15, 15), py_[j] + rng.uniform(-15, 15), rng.uniform(85, 115), 'dolgu',
             gec=(0.02, 0.08))
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
    # gök boşlukları (arka kütlede, ön kümelerin olmadığı yerlerde)
    bosluk = []
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
                   bosluk=bosluk)
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
            bl = 1.0 - (1.0 - min(1.0, u)) ** 1.6
            R = k['R'] * (0.16 + 0.84 * bl) * (0.5 + 0.5 * v)
            vx, vy = pp[-1] - pp[-2]
            n_ = math.hypot(vx, vy) + 1e-9
            cx = pp[-1, 0] + vx / n_ * R * 0.28 + sallanma * 6.0
            cy = pp[-1, 1] + vy / n_ * R * 0.28 - R * 0.12
            w = min(1.0, u * 1.7) * (0.25 + 0.75 * v)
        else:
            u = (g - k['g0']) / k['dg']
            if u <= 0 or ss[-1] < k['s'] - 1:
                continue
            u = min(1.0, u)
            bl = 1.0 - (1.0 - u) ** 2.4
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
            R = k['R'] * (0.1 + 0.9 * bl) * (0.5 + 0.5 * v)
            w = min(1.0, u * 2.5) * (0.25 + 0.75 * v)
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
        grad = []
        for q in sec:
            R = q['R']
            grad.append((q['x'] + lx * R, q['y'] + ly * R, q['x'] - lx * R * 0.6, q['y'] - ly * R * 0.6,
                         acik * q['w'], q['w']))

        def yf(X, Y):
            d = ((X / sc - tcx) * lx + (Y / sc - tcy) * ly) / (trx + try_)
            return 1.0 - isik_g * np.clip(d * 1.8, -0.8, 0.8)
        iz = B.lavi(yollar, renk1, yog=yog_b * ik, Mloc=Ms, kenar=1.1, dalga=0.07, islak=1.0, islak_gen=3.0,
                    gran=0.10, akis=0.22, toplam=True, gradyanlar=grad, ust=ust, renk2=renk2, yog_fn=yf)
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

    # ------------------------------------------------------------------ gövde ve dallar
    dal_yollar, dal_golge, kabuk_yollar = [], [], []
    for i, D in enumerate(durum):
        if D is None:
            continue
        pp, th, r, ss = D
        if len(pp) < 2:
            continue
        rr = r.copy()
        rr[-1] = max(rr[-1] * 0.6, 0.35 / sc)
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

    # ------------------------------------------------------------------ orta ve arka kümeler
    B.sakla(kume_boya(1, '#8EBA8A', '#6EA27E', 0.50, '#477B63', 0.24, ust=0.45))
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
    kume_boya(0, '#7FA592', '#6A977E', 0.58, '#3F6F5F', 0.0, acik=0.75, ust=0.35, isik_g=0.5)

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
