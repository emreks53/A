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


def _rast(yollar, M, k: Kirp, toplam=False, alfalar=None, cizgi=None):
    """Yolları A8 maskeye çizer. toplam=True: üst üste binen yollar toplanır (en çok 8 kat), alfalar: yol başına
    ağırlık."""
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

    @property
    def ga(self):
        if self._ga is None:
            k = self.k
            self._ga = _doku_ornekle(G_AKIS, self.Mi, k.x0, k.y0, k.w, k.h, self.olc, (self.kay[1], self.kay[0]))
        return self._ga

    @property
    def gr(self):
        if self._gr is None:
            k = self.k
            self._gr = _doku_ornekle(G_AKIS, self.Mi, k.x0, k.y0, k.w, k.h, self.olc * 0.55,
                                     (self.kay[0] * 0.37 + 300, self.kay[1] * 0.61 + 500))
        return self._gr

    @property
    def xy(self):
        if self._xy is None:
            k, Mi = self.k, self.Mi
            xs = np.arange(k.x0, k.x0 + k.w, dtype=np.float32) + 0.5
            ys = np.arange(k.y0, k.y0 + k.h, dtype=np.float32) + 0.5
            XX, YY = np.meshgrid(xs, ys)
            X = (Mi[0, 0] * XX + Mi[0, 1] * YY + Mi[0, 2]).astype(np.float32)
            Y = (Mi[1, 0] * XX + Mi[1, 1] * YY + Mi[1, 2]).astype(np.float32)
            self._xy = (X, Y)
        return self._xy

    def alt(self, yollar, Mloc, pay):
        kk = _kirp_kes(yollar_kirp(yollar, Mloc, pay), self.k)
        oy, ox = kk.y0 - self.k.y0, kk.x0 - self.k.x0
        return kk, (slice(oy, oy + kk.h), slice(ox, ox + kk.w))

    # -- geçiş ------------------------------------------------------------------------------------------------
    def lavi(self, yollar, renk_, yog=0.5, Mloc=None, kenar=1.0, dalga=0.08, islak=0.8, islak_gen=3.0, gran=0.10,
             akis=0.15, yumusak=0.0, cizgi=None, toplam=False, alfalar=None, ust=0.8, renk2=None, karisim=None,
             yog_fn=None, sakla=True, siluet=True, pay=None, esik=True):
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
        if toplam or alfalar is not None:
            Wm = _rast(yollar, Mloc, kk, toplam=toplam, alfalar=alfalar, cizgi=cizgi)
            if Wm.max() <= 1e-3:
                return None
            G = np.minimum(Wm, 1.0) if alfalar is None else _rast(yollar, Mloc, kk, cizgi=cizgi)
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
            X, Y = self.xy
            D *= yog_fn(X[sl], Y[sl])
        D *= yog
        if sakla:
            D *= 1.0 - self.S[sl]
        np.clip(D, 0.0, 1.0, out=D)
        C = renk(renk_)
        if renk2 is not None:
            if karisim is None or karisim == 'akis':
                f = smoothstep(-0.9, 0.9, self.gr[sl])
            else:
                X, Y = self.xy
                f = np.clip(karisim(X[sl], Y[sl]), 0, 1)
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

_G_IZGARA = np.linspace(0.0, 1.0, 801)


def _lider_boy(g, L0):
    g = min(1.0, max(0.0, g))
    return L0 * (0.26 + 0.74 * (1.0 - (1.0 - g) ** 1.8))


def _agac_olcek(g):
    g = min(1.0, max(0.0, g))
    return 0.42 + 0.58 * g ** 0.9


def _govde_r(g):
    """Gövde taban yarıçapı (yerel birim, kök genişlemesi hariç)."""
    g = min(1.0, max(0.0, g))
    return 2.3 + 32.7 * g ** 1.35


class _Dal:
    __slots__ = ('ana', 's_ana', 'a0', 'dth', 'dl', 'L', 'g0', 'dg', 'der', 'esnek', 'uzun_g', 'cocuk')

    def boy(self, g):
        if self.ana < 0:
            return _lider_boy(g, self.L)
        u = (g - self.g0) / self.dg
        if u <= 0:
            return 0.0
        if u >= 1:
            return self.L
        return self.L * (1.0 - (1.0 - u) ** 2.2)


def _ilk_gecis(dal, s):
    """dal'ın boyunun s'yi geçtiği g."""
    boylar = np.array([dal.boy(g) for g in _G_IZGARA])
    i = np.searchsorted(boylar, s)
    return float(_G_IZGARA[min(i, len(_G_IZGARA) - 1)]) if i < len(_G_IZGARA) else 1.5


def _kume_sekli(rng, n=150):
    """Birim yarıçaplı yaprak kümesi (taraklı kenar): (n,2)."""
    lob = int(rng.integers(7, 12))
    f = rng.uniform(0, 2 * math.pi, 5)
    a = np.linspace(0, 2 * math.pi, n, endpoint=False)
    b = np.abs(np.sin(lob * a / 2 + f[0])) ** 0.55
    b2 = np.abs(np.sin((lob + 5) * a / 2 + f[1])) ** 0.7
    r = (0.86 + 0.10 * b + 0.04 * b2) * (1 + 0.09 * np.sin(2 * a + f[2]) + 0.05 * np.sin(3 * a + f[3]))
    sx = rng.uniform(1.0, 1.18)
    pts = np.stack([np.cos(a) * r * sx, np.sin(a) * r * 0.9], 1)
    # alt taraf biraz düz
    pts[:, 1] = np.where(pts[:, 1] > 0, pts[:, 1] * 0.86, pts[:, 1])
    return pts


def _agac_iskelet(tohum):
    if tohum in _AGAC_IS:
        return _AGAC_IS[tohum]
    rng = np.random.default_rng(7919 + tohum * 31)
    dallar = []

    def yeni(ana, s_ana, a0, L, n, egilim, hedef, der, esnek, gecik=(0.01, 0.05), dg=0.26):
        d = _Dal()
        d.ana, d.s_ana, d.a0, d.L, d.der, d.esnek = ana, s_ana, a0, L, der, esnek
        d.dl = L / n
        # mutlak açı (ana teğetine göre değil, kendi tabanına göre) artışları: hedefe doğru bükülme + kıvrım
        dth = np.zeros(n)
        th = a0
        f = rng.uniform(0, 6.28)
        k = rng.uniform(0.6, 1.4)
        for j in range(n):
            u = (j + 0.5) / n
            step = egilim * (hedef - th) / n * 3.0 + 0.05 * math.sin(u * 6.28 * k + f) / math.sqrt(n) * 2
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
        return len(dallar) - 1

    L0 = 870.0
    lider = yeni(-1, 0, rng.uniform(-0.03, 0.03), L0, 30, 0.0, 0.0, 0, 0.55)
    # lider gövdesine hafif S kıvrımı
    dallar[lider].dth = np.array([0.018 * math.sin(j / 30 * 6.28 * 0.8 + rng.uniform(0, 1)) for j in range(30)])
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
            ikinciler.append(yeni(kb, K.L * u, aci, L, 8, 0.4, math.radians(10) * np.sign(aci) * 0.0
                                  + math.radians(rng.uniform(-5, 5)), 2, 1.5, dg=0.24))
            tr = -tr
    # liderin tepesine yan dallar
    for j, s in enumerate([700, 760, 815]):
        tr = 1 if (j % 2 == 0) == (rng.random() < 0.5) else -1
        ikinciler.append(yeni(lider, s + rng.uniform(-10, 10), math.radians(rng.uniform(30, 45)) * tr,
                              rng.uniform(90, 140), 8, 0.4, math.radians(10) * tr, 2, 1.5, dg=0.22))
    # 3. kuşak: ince dallar
    for ib in ikinciler:
        P = dallar[ib]
        for j in range(int(rng.integers(1, 3))):
            u = rng.uniform(0.45, 0.85)
            tr = 1 if rng.random() < 0.5 else -1
            yeni(ib, P.L * u, math.radians(rng.uniform(25, 40)) * tr, P.L * rng.uniform(0.35, 0.55), 6, 0.3,
                 0.0, 3, 2.0, dg=0.2)

    # mutlak (olgun) noktalar
    def noktalar_olgun():
        out = []
        for d in dallar:
            if d.ana < 0:
                taban, th0 = np.array([0.0, 0.0]), 0.0
            else:
                P = dallar[d.ana]
                pp, aa = out[d.ana]
                i = min(int(d.s_ana / P.dl), len(aa) - 1)
                taban, th0 = pp[i] + (pp[i + 1] - pp[i]) * ((d.s_ana - i * P.dl) / P.dl), aa[i]
            th = th0 + d.a0 + np.cumsum(d.dth)
            seg = np.stack([np.sin(th), -np.cos(th)], 1) * d.dl
            pp = np.concatenate([taban[None], taban[None] + np.cumsum(seg, 0)], 0)
            out.append((pp, th))
        return out

    olgun = noktalar_olgun()
    # taç kümeleri: elips içine Poisson-benzeri yerleşim
    tcx, tcy = rng.uniform(-20, 20), -640.0
    trx, try_ = 405.0, 300.0
    adaylar = []
    deneme = 0
    while len(adaylar) < 44 and deneme < 4000:
        deneme += 1
        a = rng.uniform(0, 2 * math.pi)
        rr = math.sqrt(rng.uniform(0, 1))
        x = tcx + math.cos(a) * rr * trx * 0.86
        y = tcy + math.sin(a) * rr * try_ * 0.84
        kenar = rr
        R = rng.uniform(95, 140) * (1.0 - 0.32 * kenar)
        if all((x - q[0]) ** 2 + (y - q[1]) ** 2 > (0.62 * (R + q[2])) ** 2 for q in adaylar):
            adaylar.append((x, y, R))
    # tüm dal noktaları (gövdenin alt kısmı hariç)
    havuz = []
    for bi, (pp, th) in enumerate(olgun):
        d = dallar[bi]
        for j in range(len(pp)):
            s = j * d.dl
            if bi == 0 and s < 330:
                continue
            havuz.append((pp[j, 0], pp[j, 1], bi, s))
    havuz = np.array(havuz)
    kumeler = []
    for (x, y, R) in adaylar:
        dd = (havuz[:, 0] - x) ** 2 + (havuz[:, 1] - y) ** 2
        j = int(np.argmin(dd))
        bi, s = int(havuz[j, 2]), float(havuz[j, 3])
        d = dallar[bi]
        g0 = _ilk_gecis(d, s) + rng.uniform(0.02, 0.09) if bi > 0 else _ilk_gecis(d, s) + rng.uniform(0.0, 0.05)
        dg = max(0.1, min(rng.uniform(0.2, 0.26), 0.99 - g0))
        rel_y = (y - tcy) / try_
        rel_x = (x - tcx) / trx
        z = rng.uniform(0, 1) + 0.55 * rel_y - 0.35 * abs(rel_x)
        kumeler.append(dict(x=x, y=y, R=R, bi=bi, s=s, ox=x - havuz[j, 0], oy=y - havuz[j, 1], g0=g0, dg=dg,
                            z=z, sek=_kume_sekli(rng), q=rng.uniform(0, 1), tohum=int(rng.integers(0, 10 ** 6)),
                            th_olgun=float(olgun[bi][1][min(int(s / d.dl), len(olgun[bi][1]) - 1)])))
    zs = sorted(k['z'] for k in kumeler)
    e1, e2 = zs[len(zs) // 3], zs[2 * len(zs) // 3]
    for k in kumeler:
        k['kat'] = 2 if k['z'] >= e2 else (1 if k['z'] >= e1 else 0)
    # fidan yaprakları (lider üzerinde)
    yapraklar = []
    tr = 1
    for j in range(14):
        s = 40 + 32 * j
        yapraklar.append(dict(s=s, taraf=tr, aci=math.radians(rng.uniform(42, 62)), L=rng.uniform(58, 72),
                              g0=_ilk_gecis(dallar[0], s + 22), kiv=rng.uniform(-0.12, 0.12)))
        tr = -tr
    # kabuk çizgileri (gövde üzerinde, gövde-yerel konumlar)
    kabuk = [(rng.uniform(-0.75, 0.6), rng.uniform(20, 300), rng.uniform(25, 80)) for _ in range(9)]
    iskelet = dict(dallar=dallar, kumeler=kumeler, yapraklar=yapraklar, tac=(tcx, tcy, trx, try_), kabuk=kabuk)
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
    """Görünen kümeler: (kat, merkez_x, merkez_y, R, ağırlık, şekil noktaları) yapı biriminde."""
    sonuc = []
    for k in isk['kumeler']:
        u = (g - k['g0']) / k['dg']
        if u <= 0:
            continue
        D = durum[k['bi']]
        if D is None:
            continue
        pp, th, r, ss = D
        if ss[-1] < k['s'] - 1:
            continue
        u = min(1.0, u)
        bl = 1.0 - (1.0 - u) ** 2.4
        # yaprak yoğunluğu
        v = min(1.0, max(0.0, (yaprak - k['q'] * 0.82) / 0.18))
        if v <= 0.0:
            continue
        j = int(np.searchsorted(ss, k['s']) - 1)
        j = min(max(j, 0), len(pp) - 2)
        f = (k['s'] - ss[j]) / max(ss[j + 1] - ss[j], 1e-6)
        px, py = pp[j] + (pp[j + 1] - pp[j]) * min(1.0, max(0.0, f))
        dth = th[j] - k['th_olgun']
        c, s_ = math.cos(dth), math.sin(dth)
        ox = (k['ox'] * c - k['oy'] * s_) * (0.35 + 0.65 * bl)
        oy = (k['ox'] * s_ + k['oy'] * c) * (0.35 + 0.65 * bl)
        cx, cy = px + ox, py + oy
        R = k['R'] * (0.12 + 0.88 * bl) * (0.55 + 0.45 * v)
        w = min(1.0, u * 2.2) * (0.3 + 0.7 * v)
        P = k['sek'] * R
        # rüzgâr: kesme + yana itme
        P = P.copy()
        P[:, 0] += sallanma * 0.16 * (-P[:, 1]) + sallanma * 8.0
        sonuc.append(dict(kat=k['kat'], x=cx, y=cy, R=R, w=w, pts=P + np.array([cx, cy]), tohum=k['tohum'],
                          ham=k))
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

    # sınır kutusu (yapı birimi)
    xs, ys = [0.0], [0.0]
    for D in durum:
        if D is not None:
            xs += [D[0][:, 0].min() - D[2].max(), D[0][:, 0].max() + D[2].max()]
            ys += [D[0][:, 1].min()]
    for k in kumeler:
        xs += [k['x'] - k['R'] * 1.3, k['x'] + k['R'] * 1.3]
        ys += [k['y'] - k['R'] * 1.1, k['y'] + k['R'] * 1.1]
    kok_gen = _govde_r(g) / sc * 3.5
    x0, x1 = min(xs) - kok_gen - 30, max(xs) + kok_gen + 30
    y0, y1 = min(ys) - 40, 30.0
    k = yollar_kirp([yol_dikdortgen(x0, y0, x1, y1)], Ms, 6)
    if k.bos():
        return None
    B = _Boya(t, M, k, tohum=tohum)

    islak_k = 1.0 + 0.25 * damla

    # --- fidan yaprakları (önde) ---
    lider = durum[0]
    yap_yollar, yap_alfa, yap_golge = [], [], []
    if lider is not None and g < 0.5:
        pp, th, r, ss = lider
        Lnow = ss[-1]
        for y_ in isk['yapraklar']:
            s = y_['s']
            u = (g - y_['g0']) / 0.06
            if u <= 0 or s > Lnow - 4:
                continue
            bl = min(1.0, u) ** 0.7
            # alttakiler solar: ucun 175 birimden fazla altındaysa
            sol = 1.0 - sstep(150, 215, Lnow - s)
            sol *= 1.0 - sstep(0.22, 0.42, g)
            a = bl * sol
            if a <= 0.01:
                continue
            j = int(np.searchsorted(ss, s) - 1)
            j = min(max(j, 0), len(pp) - 2)
            f = (s - ss[j]) / max(ss[j + 1] - ss[j], 1e-6)
            px, py = pp[j] + (pp[j + 1] - pp[j]) * f
            thl = th[j] + y_['taraf'] * y_['aci'] + sallanma * 0.35
            aci_deg = math.degrees(thl) - 90.0
            Lf = y_['L'] * (0.35 + 0.65 * bl)
            # sap
            sx, sy = px + math.sin(thl) * Lf * 0.12, py - math.cos(thl) * Lf * 0.12
            pts = _yaprak_np(sx, sy, Lf, Lf * 0.24, aci_deg, kivrim=y_['kiv'] * y_['taraf'])
            yap_yollar.append(_poly(pts))
            yap_alfa.append(a)
            # orta damarın bir yanı (gölge yarısı)
            nx, ny = -math.sin(math.radians(aci_deg)), math.cos(math.radians(aci_deg))
            if nx * (-lx) + ny * (-ly) < 0:
                nx, ny = -nx, -ny
            h = _yaprak_np(sx + nx * 0.8, sy + ny * 0.8, Lf * 0.97, Lf * 0.11, aci_deg, kivrim=y_['kiv'] * y_['taraf'])
            h = h + np.array([nx, ny]) * Lf * 0.07
            yap_golge.append(_poly(h))
            # sapçık (yaprak sapı) -> gövde ile birlikte boyanacak
        if yap_yollar:
            iz = B.lavi(yap_yollar, '#8DBB86', yog=0.55 * islak_k, Mloc=Ms, kenar=1.0, dalga=0.05, islak=1.0,
                        islak_gen=2.4, gran=0.08, akis=0.18, toplam=True, alfalar=yap_alfa, renk2='#6FA67A')
            B.lavi(yap_golge, '#4F8463', yog=0.32 * islak_k, Mloc=Ms, kenar=0.9, dalga=0.05, islak=0.8,
                   islak_gen=2.0, gran=0.08, akis=0.1, toplam=True, alfalar=yap_alfa, siluet=False)
            B.sakla(iz)

    # --- taç kümeleri: katman katman ---
    def kume_boya(kat, renk1, renk2, yog_b, golge_renk, yog_g):
        sec = [q for q in kumeler if q['kat'] == kat]
        if not sec:
            return None
        yollar = [_poly(q['pts']) for q in sec]
        alfa = [q['w'] for q in sec]
        # ışık: taç ölçeğinde sol üst açık, sağ alt koyu
        tcx, tcy, trx, try_ = isk['tac']
        def yf(X, Y):
            # yerel -> yapı
            Xs, Ys = X / sc, Y / sc
            d = ((Xs - tcx) * lx + (Ys - tcy) * ly) / (trx + try_)
            return 1.05 - 0.55 * np.clip(d * 1.6, -0.6, 0.6)
        iz = B.lavi(yollar, renk1, yog=yog_b * islak_k, Mloc=Ms, kenar=1.1, dalga=0.07, islak=0.95, islak_gen=3.0,
                    gran=0.10, akis=0.22, toplam=True, alfalar=alfa, ust=0.75, renk2=renk2, yog_fn=yf)
        # gölge sırrı: küme - ışığa kaydırılmış küme
        gy, ga = [], []
        for q in sec:
            d = q['R'] * 0.42
            kay = q['pts'] + np.array([lx * d, ly * d])
            gol = yol_op(_poly(q['pts']), _poly(kay), 'fark')
            gy.append(gol)
            ga.append(q['w'])
        B.lavi(gy, golge_renk, yog=yog_g * islak_k, Mloc=Ms, kenar=1.0, dalga=0.08, islak=0.9, islak_gen=2.6,
               gran=0.12, akis=0.15, toplam=True, alfalar=ga, ust=0.5, siluet=False)
        return iz

    iz_on = kume_boya(2, '#9CC48F', '#7DB081', 0.50, '#4E8466', 0.36)
    B.sakla(iz_on)

    # --- gövde ve dallar ---
    dal_yollar, dal_golge, kabuk_yollar = [], [], []
    for i, D in enumerate(durum):
        if D is None:
            continue
        pp, th, r, ss = D
        if len(pp) < 2:
            continue
        rr = r.copy()
        # uç incelmesi
        rr[-1] = max(rr[-1] * 0.6, 0.4 / sc)
        P = _serit_np(pp, rr)
        dal_yollar.append(_poly(P))
        # gölge yanı
        tan = np.gradient(pp, axis=0)
        tan /= np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9
        nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
        sgn = np.sign(nor[:, 0] * (-lx) + nor[:, 1] * (-ly))
        sgn[sgn == 0] = 1
        om = pp + nor * (sgn * rr * 0.42)[:, None]
        P2 = _serit_np(om, rr * 0.62)
        dal_golge.append(_poly(P2))
    # kök genişlemesi: yüzey kökleri
    r0 = _govde_r(g) / sc
    if lider is not None:
        for sgn_, uz, ac in ((-1, 3.3, 0.0), (1, 3.0, 0.0), (-1, 1.9, 1.0), (1, 2.2, 1.0)):
            L = r0 * uz
            om = np.array([[sgn_ * r0 * (0.3 + 0.1 * ac), -r0 * (0.9 - 0.3 * ac)],
                           [sgn_ * (r0 * 0.9 + L * 0.35), -r0 * 0.25],
                           [sgn_ * (r0 * 0.8 + L), 0.0 + r0 * 0.05]])
            om = EL.bezier_noktalar(om[0], om[0] * 0.5 + om[1] * 0.5, om[1], om[2], 10)
            gen = np.linspace(r0 * (0.55 - 0.15 * ac), r0 * 0.06, 10)
            P = _serit_np(om, gen)
            dal_yollar.append(_poly(P))
            if sgn_ * (-lx) > 0:
                dal_golge.append(_poly(_serit_np(om + np.array([0, -gen.mean() * 0.0]), gen * 0.7)))
    # kabuk çizgileri
    if lider is not None and g > 0.25:
        pp, th, r, ss = lider
        for (fx, s0, L) in isk['kabuk']:
            if s0 + L > ss[-1] * 0.5:
                continue
            sp = np.linspace(s0, s0 + L, 8)
            q = np.stack([np.interp(sp, ss, pp[:, 0]), np.interp(sp, ss, pp[:, 1])], 1)
            rq = np.interp(sp, ss, r)
            q[:, 0] += fx * rq * 0.8 + np.sin(sp * 0.05) * rq * 0.05
            kabuk_yollar.append(_poly(q, kapali=False))
    iz_dal = B.lavi(dal_yollar, '#A48E7C', yog=0.62, Mloc=Ms, kenar=0.9, dalga=0.05, islak=0.9, islak_gen=2.6,
                    gran=0.14, akis=0.16, renk2='#9A8478')
    B.lavi(dal_golge, '#6F5A63', yog=0.38, Mloc=Ms, kenar=0.9, dalga=0.06, islak=0.8, islak_gen=2.0, gran=0.14,
           akis=0.12, siluet=False)
    if kabuk_yollar:
        B.lavi(kabuk_yollar, '#6F5A63', yog=0.30 * sstep(0.25, 0.6, g), Mloc=Ms, kenar=0.7, dalga=0.1, islak=0.4,
               islak_gen=1.5, gran=0.12, akis=0.1, cizgi=max(1.2, r0 * 0.08), siluet=False)
    B.sakla(iz_dal)

    iz_orta = kume_boya(1, '#86B488', '#6B9F7C', 0.52, '#467A62', 0.38)
    B.sakla(iz_orta)
    kume_boya(0, '#7FA796', '#6E9A80', 0.55, '#3F6F5F', 0.42)

    B.bitir(sakla_sonra=sakla_sonra)

    # dönüş: taç sınırları (ekran)
    if kumeler:
        ax = np.concatenate([q['pts'] for q in kumeler], 0)
        ekr = (Ms[:2, :2] @ ax.T).T + Ms[:2, 2]
        kx0, ky0 = ekr.min(0)
        kx1, ky1 = ekr.max(0)
        mrk = ((kx0 + kx1) / 2, (ky0 + ky1) / 2)
        kutu = (float(kx0), float(ky0), float(kx1), float(ky1))
    else:
        if lider is not None:
            tp = lider[0][-1]
            mrk = nokta_donustur(Ms, tp[0], tp[1])
        else:
            mrk = nokta_donustur(Ms, 0, 0)
        kutu = (mrk[0], mrk[1], mrk[0], mrk[1])
    tepe_y = kutu[1]
    if lider is not None:
        tp = lider[0][-1]
        tx, ty = nokta_donustur(Ms, tp[0], tp[1])
        tepe_y = min(tepe_y, ty)
    return dict(merkez=(float(mrk[0]), float(mrk[1])), kutu=kutu, tepe=nokta_donustur(M, 0, 0)[0:1] + (tepe_y,),
                taban=nokta_donustur(M, 0, 0), olcek=sc)
