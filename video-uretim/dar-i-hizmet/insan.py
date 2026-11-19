"""(docstring written below, at the end of development)"""
from __future__ import annotations

import math

import cv2
import numpy as np
import skia

from motor import (M_bilesik, M_oteleme, M_olcek, M_donme, yol_egri, yol_elips, yol_op, maske_ciz, yollar_kirp,
                   Kirp, renk, karistir, smoothstep, W, H)

# =================================================================================================================
# oranlar (yerel birim; ayakta boy 600 = 7.5 baş, baş 80)
# =================================================================================================================
BOY = 600.0
L_BEL = 100.0          # kalça eklemi -> bel (T12)
L_GOG = 95.0           # bel -> boyun kökü (C7)
L_GOVDE = L_BEL + L_GOG
L_BOYUN = 30.0         # boyun kökü -> baş pivotu (atlas)
L_UST = 112.0          # omuz -> dirsek
L_ON = 88.0            # dirsek -> bilek
L_EL = 64.0            # bilek -> parmak ucu
L_UYLUK = 147.0        # kalça -> diz
L_BALDIR = 146.0       # diz -> ayak bileği
AYAK_YUK = 25.0        # ayak bileği eklemi, taban üstünde (ayakkabıyla)
KALCA_Y = -(L_UYLUK + L_BALDIR + AYAK_YUK)   # -318: ayakta kalça eklemi
TOPUK_X, TOP_X, BURUN_X = -20.0, 50.0, 78.0  # ayak çerçevesinde topuk, tarak (top) ve burun x'i

# =================================================================================================================
# renkler
# =================================================================================================================
RENK = dict(
    ten='#EDBE9E', ten_golge='#D8957C', ten_boyun='#E2A98E', kulak='#DE9F86',
    sac='#4A372E', sac_golge='#2F221C',
    gomlek='#8BA7C6', gomlek_golge='#6886AE', gomlek_kat='#56739C',
    pantolon='#978C82', pantolon_golge='#72675F',
    ayakkabi='#5F4336', ayakkabi_golge='#3B2A22', taban='#33251E',
    battaniye='#B9A6BC', battaniye_golge='#927D9C', battaniye_serit='#8C7593', battaniye_serit2='#C9A79A',
    uzak='#77738F', zemin_golge='#958FB0',
)
YOG = dict(ten=0.40, sac=0.80, gomlek=0.50, pantolon=0.56, ayakkabi=0.78, battaniye=0.50)


# =================================================================================================================
# vektör yardımcıları
# =================================================================================================================
def _v(x, y):
    return np.array([x, y], np.float64)


def _yuk(a):
    """Yukarı bakan segment açısı (0 = yukarı, + = öne yatık) -> birim vektör."""
    r = math.radians(a)
    return np.array([math.sin(r), -math.cos(r)])


def _asg(a):
    """Aşağı bakan segment açısı (0 = aşağı, + = uç öne) -> birim vektör."""
    r = math.radians(a)
    return np.array([math.sin(r), math.cos(r)])


def _onn(a):
    """Yukarı-çerçevenin ön normali (göğüs/karın yönü)."""
    r = math.radians(a)
    return np.array([math.cos(r), math.sin(r)])


def _aci_asg(v):
    return math.degrees(math.atan2(v[0], v[1]))


def _cerceve(o, a):
    return M_bilesik(M_oteleme(float(o[0]), float(o[1])), M_donme(a))


def _uygula(Mx, pts):
    pts = np.asarray(pts, np.float64)
    return pts @ Mx[:2, :2].T + Mx[:2, 2]


def _nokta(Mx, p):
    v = Mx @ np.array([p[0], p[1], 1.0])
    return np.array([v[0], v[1]])


def _smax(a, b, k=12.0):
    """Yumuşak maksimum (derece)."""
    h = max(0.0, min(1.0, 0.5 + 0.5 * (a - b) / k))
    return b + (a - b) * h + k * h * (1 - h) * 0.5


def _smin(a, b, k=12.0):
    return -_smax(-a, -b, k)


def _ss(a, b, x):
    if b == a:
        return 1.0 if x >= b else 0.0
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def _yol(pts, kapali=True, gerilim=0.5):
    return yol_egri([tuple(map(float, q)) for q in pts], kapali=kapali, gerilim=gerilim)


def _birlesim(*yollar):
    out = None
    for y in yollar:
        if y is None:
            continue
        out = y if out is None else yol_op(out, y, 'birlesim')
    return out if out is not None else skia.Path()


# =================================================================================================================
# poz
# =================================================================================================================
ANAHTARLAR = (
    'kx', 'ky', 'bel', 'gogus', 'boyun', 'bas', 'omuz_kalk',
    'omuz_on', 'dirsek_on', 'el_bilek_on', 'kivrim_on', 'yan_on', 'kisalt_on',
    'omuz_ar', 'dirsek_ar', 'el_bilek_ar', 'kivrim_ar', 'yan_ar', 'kisalt_ar',
    'kalca_on', 'diz_on', 'ayak_bilek_on', 'parmak_on',
    'kalca_ar', 'diz_ar', 'ayak_bilek_ar', 'parmak_ar',
    'etek_on', 'etek_ar', 'bel_kambur',
)


def bos_poz():
    p = {k: 0.0 for k in ANAHTARLAR}
    p['ky'] = KALCA_Y
    p['kivrim_on'] = p['kivrim_ar'] = 0.35
    return p


# =================================================================================================================
# iskelet (ileri kinematik)
# =================================================================================================================
class Iskelet(dict):
    """Yerel koordinatta eklem konumları ve açılar (yüz +x'e bakar, y aşağı)."""

    def C(self, s):
        return np.array([np.interp(s, self['S'], self['Cx']), np.interp(s, self['S'], self['Cy'])])

    def A(self, s):
        return float(np.interp(s, self['S'], self['Aa']))


def iskelet(p, nefes=0.0):
    sk = Iskelet()
    nf = 0.5 - 0.5 * math.cos(2 * math.pi * nefes)
    kok = _v(p['kx'], p['ky'])
    a_b = p['bel']
    a_g = a_b + p['gogus']
    LT = L_GOVDE + 1.2 * nf
    n_ust, n_alt = 26, 7
    ds = LT / n_ust
    S = np.arange(-n_alt, n_ust + 1) * ds
    kamb = p.get('bel_kambur', 0.0)
    u = S / LT
    Aa = a_b + (a_g - a_b) * smoothstep(0.30, 0.80, u) + kamb * np.sin(np.clip(u, 0, 1) * math.pi) ** 2
    Aa[u < 0] = a_b
    C = np.zeros((len(S), 2))
    i0 = n_alt
    C[i0] = kok
    for i in range(i0, len(S) - 1):
        C[i + 1] = C[i] + ds * _yuk(0.5 * (Aa[i] + Aa[i + 1]))
    for i in range(i0, 0, -1):
        C[i - 1] = C[i] - ds * _yuk(a_b)
    sk['S'], sk['Cx'], sk['Cy'], sk['Aa'], sk['LT'] = S, C[:, 0], C[:, 1], Aa, LT
    sk['kok'] = kok
    sk['a_b'], sk['a_g'] = a_b, a_g
    sk['W'] = sk.C(L_BEL)
    N = sk.C(LT)
    a_N = sk.A(LT)
    sk['N'], sk['a_N'] = N, a_N
    # omuz
    s_om = 0.875 * LT
    a_om = sk.A(s_om)
    S_on = sk.C(s_om) - 4.0 * _onn(a_om) + _yuk(a_om) * (p['omuz_kalk'] + 2.2 * nf)
    sk['s_om'] = s_om
    # boyun / baş
    a_n = a_N + p['boyun']
    Hp = N + L_BOYUN * _yuk(a_n)
    a_h = a_n + p['bas']
    sk['Hp'], sk['a_n'], sk['a_h'] = Hp, a_n, a_h
    sk['M_bas'] = _cerceve(Hp, a_h)
    sk['nf'] = nf
    # kollar
    for t, ofs in (('on', 0.0), ('ar', 1.0)):
        St = S_on + (-3.5 * _onn(a_om) + 1.2 * _yuk(a_om)) * ofs
        tu = -a_om + p['omuz_' + t]
        tf = tu + p['dirsek_' + t]
        th = tf + p['el_bilek_' + t]
        E = St + L_UST * _asg(tu)
        Wr = E + L_ON * _asg(tf)
        sk['S_' + t], sk['E_' + t], sk['Wr_' + t] = St, E, Wr
        sk['tu_' + t], sk['tf_' + t], sk['th_' + t] = tu, tf, th
        ks = 1.0 - 0.45 * p['kisalt_' + t]
        sk['M_el_' + t] = M_bilesik(_cerceve(Wr, 90.0 - th), M_olcek(ks, 1.0))
        sk['avuc_' + t] = _nokta(sk['M_el_' + t], (21.0 if p['kivrim_' + t] < 0.7 else 18.0, 0.0))
    # bacaklar
    f_b = _onn(a_b)
    for t, ofs in (('on', 0.0), ('ar', 1.0)):
        Hj = kok - f_b * 2.5 * ofs
        tt = p['kalca_' + t]
        ts = tt - p['diz_' + t]
        tfo = ts + 90.0 - p['ayak_bilek_' + t]
        K = Hj + L_UYLUK * _asg(tt)
        A = K + L_BALDIR * _asg(ts)
        sk['H_' + t], sk['K_' + t], sk['A_' + t] = Hj, K, A
        sk['tt_' + t], sk['ts_' + t], sk['tfo_' + t] = tt, ts, tfo
        sk['tp_' + t] = p['parmak_' + t]
        sk['M_ayak_' + t] = _cerceve(A, 90.0 - tfo)
    return sk


# ---- ters kinematik yardımcıları (poz yazarken) -----------------------------------------------------------------
def _ik2(A, B, l1, l2, isaret):
    """A'dan B'ye iki kemik; orta eklem. isaret +1: orta eklem açıyı büyüten (asg açısı) tarafta."""
    d = B - A
    L = float(np.hypot(*d))
    L = min(max(L, abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3)
    phi = _aci_asg(d)
    c = (l1 * l1 + L * L - l2 * l2) / (2 * l1 * L)
    al = math.degrees(math.acos(max(-1.0, min(1.0, c))))
    return A + l1 * _asg(phi + isaret * al)


def bacak_ik(p, taraf, ayak_bilegi):
    """Ayak bileğini verilen yerel noktaya koyacak kalça/diz açılarını yazar (diz önde)."""
    sk = iskelet(p)
    Hj = sk['H_' + taraf]
    A = np.asarray(ayak_bilegi, float)
    K = _ik2(Hj, A, L_UYLUK, L_BALDIR, +1)
    tt = _aci_asg(K - Hj)
    ts = _aci_asg(A - K)
    p['kalca_' + taraf] = tt
    p['diz_' + taraf] = tt - ts
    return p


def kol_ik(p, taraf, bilek):
    """Bileği verilen yerel noktaya koyacak omuz/dirsek açılarını yazar (dirsek arkada/aşağıda)."""
    sk = iskelet(p)
    St = sk['S_' + taraf]
    Wr = np.asarray(bilek, float)
    E = _ik2(St, Wr, L_UST, L_ON, -1)
    tu = _aci_asg(E - St)
    tf = _aci_asg(Wr - E)
    a_om = sk.A(sk['s_om'])
    p['omuz_' + taraf] = tu + a_om
    p['dirsek_' + taraf] = tf - tu
    return p


def el_aci(p, taraf, aci_asg):
    """El eksenini (bilek->parmak) verilen mutlak asg açısına getirir."""
    sk = iskelet(p)
    p['el_bilek_' + taraf] = aci_asg - sk['tf_' + taraf]
    return p


def ayak_duz(p, taraf, aci=90.0):
    """Ayağı verilen mutlak açıya (90 = yere paralel) getirir."""
    ts = p['kalca_' + taraf] - p['diz_' + taraf]
    p['ayak_bilek_' + taraf] = ts + 90.0 - aci
    return p


# =================================================================================================================
# biçimler (yerel koordinat)
# =================================================================================================================
def _kapsul_pts(A, B, ra, rb, bp=0.0, bm=0.0, bu=0.45, uc_b='y', ek_b=0.0, n=12, nc=9, uc_a='y'):
    """A'dan B'ye incelen kapsül. bp/bm: +normal / -normal tarafındaki şişkinlik. uc_b='d' düz kesik (manşet)."""
    A = np.asarray(A, float)
    B = np.asarray(B, float)
    d = B - A
    L = float(np.hypot(*d))
    if L < 1e-6:
        d = np.array([0.0, 1.0])
        L = 1e-6
    else:
        d = d / L
    nr = np.array([-d[1], d[0]])
    us = np.linspace(0, 1, n)
    bump = np.exp(-((us - bu) / 0.30) ** 2) * np.sin(np.pi * us) ** 0.6
    wp = ra + (rb - ra) * us + bp * bump
    wm = ra + (rb - ra) * us + bm * bump
    yan_p = A + np.outer(us * L, d) + np.outer(wp, nr)
    yan_m = A + np.outer(us * L, d) - np.outer(wm, nr)
    if uc_b == 'y':
        ph = np.linspace(0, np.pi, nc + 2)[1:-1]
        cap_b = B + rb * (np.outer(np.cos(ph), nr) + np.outer(np.sin(ph), d))
    else:
        Bf = B + d * ek_b
        cap_b = np.array([Bf + nr * wp[-1] * 1.02, Bf + d * 1.2 + nr * wp[-1] * 0.55, Bf + d * 1.5,
                          Bf + d * 1.2 - nr * wm[-1] * 0.55, Bf - nr * wm[-1] * 1.02])
    if uc_a == 'y':
        ph = np.linspace(0, np.pi, nc + 2)[1:-1]
        cap_a = A + ra * (-np.outer(np.cos(ph), nr) - np.outer(np.sin(ph), d))
    else:
        cap_a = np.array([A - d * 1.5])
    return np.vstack([yan_p, cap_b, yan_m[::-1], cap_a])


def _kapsul(*a, **k):
    return _yol(_kapsul_pts(*a, **k), gerilim=0.5)


# ---- el -------------------------------------------------------------------------------------------------------
def _el_yolu(kivrim, yan):
    """El çerçevesinde (köken bilek, +x parmaklara, -y başparmak/ön kenar) eldiven biçimi.
    yan 0: elin sırtı/avucu görünür (geniş), +-1: kenardan (ince; avuç +y (+1) ya da -y (-1) tarafında)."""
    w = min(1.0, abs(yan))
    sg = 1.0 if yan >= 0 else -1.0
    kv = min(1.0, max(0.0, kivrim))
    xs = np.array([-6.0, 3.0, 13.0, 23.0, 33.0])
    ust_g = np.array([-9.6, -10.8, -12.3, -12.9, -12.6])
    alt_g = np.array([9.6, 10.9, 12.3, 12.6, 12.0])
    ust_k = np.array([-6.6, -6.4, -6.0, -5.6, -5.0])
    alt_k = np.array([6.6, 7.8, 9.4, 8.6, 6.4])
    if sg < 0:
        ust_k, alt_k = -alt_k, -ust_k
    ust = ust_g + (ust_k - ust_g) * w
    alt = alt_g + (alt_k - alt_g) * w
    avuc = [(x, y) for x, y in zip(xs, ust)] + [(x, y) for x, y in zip(xs[::-1], alt[::-1])]
    p_avuc = _yol(avuc, gerilim=0.5)
    # parmaklar: eklem hattından (x=31) uzanan yuvarlak uçlu kütle; kenar görünüşte avuca doğru bükülür
    yc = 0.5 * (ust[-1] + alt[-1])
    yar = 0.5 * (alt[-1] - ust[-1]) * 0.94
    uz = (29.0 * (1 - 0.62 * kv)) * (1 - w) + 29.0 * w
    bukum = math.radians(kv * 82.0 * w) * sg
    # parmak omurgası: hafif yay
    pts_om = []
    for i in range(6):
        uu = i / 5
        a = bukum * uu
        pts_om.append((31.0 + math.sin(a + 1e-9) / (a + 1e-9) * uz * uu if abs(a) > 1e-4 else 31.0 + uz * uu,
                       yc + (1 - math.cos(a)) / (a + 1e-9) * uz * uu if abs(a) > 1e-4 else yc))
    pts_om = np.array(pts_om)
    rb = yar * (0.86 if kv < 0.6 else 0.98)
    p_par = _kapsul(pts_om[0], pts_om[-1], yar, rb, n=8, nc=9) if abs(bukum) < 0.15 else None
    if p_par is None:
        # bükülü parmaklar: iki kapsül
        m = len(pts_om) // 2
        p_par = _birlesim(_kapsul(pts_om[0], pts_om[m], yar, yar * 0.95, n=6, nc=7),
                          _kapsul(pts_om[m], pts_om[-1], yar * 0.95, rb, n=6, nc=7))
    # başparmak
    b_g0, b_g1 = np.array([7.0, -8.5]), np.array([27.0, -17.5])
    if kv > 0:
        b_g1 = b_g1 + (np.array([24.0, -9.0]) - b_g1) * _ss(0.3, 1.0, kv)
    b_k0, b_k1 = np.array([5.0, 3.5 * sg]), np.array([25.0, 9.5 * sg])
    b0 = b_g0 + (b_k0 - b_g0) * w
    b1 = b_g1 + (b_k1 - b_g1) * w
    p_bas = _kapsul(b0, b1, 6.2 - 1.2 * w, 4.9 - 0.6 * w, n=6, nc=7)
    return _birlesim(p_avuc, p_par, p_bas)


# ---- ayakkabı ---------------------------------------------------------------------------------------------------
_AYAKKABI = np.array([
    (-19.0, 25.6), (-22.5, 19.0), (-23.6, 10.0), (-22.0, 1.0), (-18.5, -6.5), (-11.0, -9.5), (-1.0, -10.5),
    (8.0, -9.0), (16.0, -5.5), (26.0, -1.0), (38.0, 4.0), (50.0, 7.6), (61.0, 10.0), (70.0, 12.4), (76.5, 15.8),
    (79.0, 20.0), (77.5, 24.2), (72.0, 25.8), (50.0, 26.0), (20.0, 26.0), (0.0, 26.0),
])


def _ayakkabi_pts(parmak):
    pts = _AYAKKABI.copy()
    if abs(parmak) > 1e-3:
        px, py = TOP_X, 26.0
        for i, (x, y) in enumerate(pts):
            w = _ss(TOP_X - 6, TOP_X + 4, x)
            if w <= 0:
                continue
            a = math.radians(parmak * w)
            dx, dy = x - px, y - py
            pts[i] = (px + dx * math.cos(a) + dy * math.sin(a), py - dx * math.sin(a) + dy * math.cos(a))
    return pts


# ---- baş --------------------------------------------------------------------------------------------------------
# baş çerçevesi: köken = baş pivotu (atlas), +x yüz yönü, y aşağı; ayakta baş tepesi y≈-59, çene altı y≈+21
_BAS_DERI = np.array([
    (26.0, -48.0), (30.2, -40.5), (32.4, -33.0), (33.2, -27.5), (32.6, -23.8), (34.0, -19.5), (37.2, -13.6),
    (38.8, -10.4), (37.6, -7.6), (34.2, -6.0), (33.8, -2.0), (34.6, 4.0), (34.8, 11.0), (31.5, 18.5), (24.0, 21.5),
    (12.0, 18.0), (5.0, 13.0), (-4.0, 8.0), (-20.0, 4.0), (-31.0, -5.0), (-36.5, -20.0), (-35.5, -38.0),
    (-26.5, -53.0), (-10.0, -60.0), (8.0, -59.5), (19.5, -54.5),
])
_SAC = np.array([
    (27.2, -47.0), (26.2, -52.5), (21.0, -58.6), (8.0, -63.6), (-8.0, -64.4), (-23.0, -59.6), (-34.0, -49.5),
    (-39.4, -35.0), (-39.6, -20.0), (-36.5, -8.5), (-30.5, -2.0), (-24.0, -2.6), (-15.5, -8.0), (-11.8, -16.0),
    (-10.5, -26.0), (-5.0, -31.5), (1.5, -32.0), (4.5, -27.0), (6.0, -33.5), (12.0, -39.5), (19.5, -43.0),
])
_SAKAL = np.array([
    (0.5, -27.0), (4.6, -27.0), (6.4, -18.5), (11.0, -12.0), (19.0, -8.2), (27.0, -6.6), (32.5, -6.0),
    (36.4, -5.0), (37.8, -1.8), (38.0, 3.0), (38.6, 9.5), (37.6, 16.5), (33.5, 22.5), (26.0, 25.6), (15.0, 22.8),
    (6.0, 17.0), (0.0, 10.5), (-2.2, 2.0), (-1.6, -10.0), (-0.8, -20.0),
])
_KULAK = (-4.8, -16.5, 5.6, 10.2, -8.0)   # cx, cy, rx, ry, açı


def _bas_yollari():
    deri = _yol(_BAS_DERI, gerilim=0.5)
    sac = _yol(_SAC, gerilim=0.5)
    sakal = _yol(_SAKAL, gerilim=0.5)
    kulak = yol_elips(*_KULAK)
    return deri, sac, sakal, kulak


_BAS_YOLLARI = None


def bas_yollari():
    global _BAS_YOLLARI
    if _BAS_YOLLARI is None:
        _BAS_YOLLARI = _bas_yollari()
    return _BAS_YOLLARI


# ---- gövde / gömlek ---------------------------------------------------------------------------------------------
_GU = np.array([-0.30, 0.00, 0.18, 0.40, 0.58, 0.72, 0.84, 0.93, 1.00])
_GF = np.array([41.0, 41.0, 40.0, 39.5, 41.0, 43.0, 41.5, 34.5, 22.0])   # ön (karın/göğüs)
_GB = np.array([48.0, 46.0, 41.0, 38.0, 38.5, 40.5, 40.0, 33.0, 23.0])   # arka (kalça/sırt)


def _govde_genislik(u, nf=0.0):
    wf = np.interp(u, _GU, _GF) + nf * 1.6 * np.exp(-((u - 0.7) / 0.15) ** 2)
    wb = np.interp(u, _GU, _GB)
    return wf, wb


def _gomlek_yolu(sk, p):
    LT = sk['LT']
    nf = sk['nf']
    # 1) gövde şeridi (kalça hizasından boyun köküne)
    ss = np.linspace(0.0, LT, 22)
    on, ar = [], []
    for s in ss:
        c = sk.C(s)
        a = sk.A(s)
        f = _onn(a)
        wf, wb = _govde_genislik(s / LT, nf)
        on.append(c + f * wf)
        ar.append(c - f * wb)
    N = sk['N']
    aN = sk['a_N']
    fN, uN = _onn(aN), _yuk(aN)
    yaka_on = N + fN * 18.5 - uN * 5.0
    yaka_ar = N - fN * 20.5 + uN * 7.0
    serit = on + [yaka_on, N + uN * 3.0 + fN * 2.0, yaka_ar] + ar[::-1]
    p_serit = _yol(serit, gerilim=0.45)
    # 2) etek: önde ve arkada menteşelenen iki kanat (yerçekimi + uyluk + zemin)
    a_b = sk['a_b']
    f_b = _onn(a_b)
    phi_govde = -a_b
    tt_on, tt_ar = sk['tt_on'], sk['tt_ar']
    tt_max = _smax(tt_on, tt_ar, 8.0)
    tt_min = _smin(tt_on, tt_ar, 8.0)
    kok = sk['kok']
    hf = tt_max + a_b                       # kalça bükülmesi
    wk = _ss(30.0, 80.0, hf)                 # uyluk göğse yaklaştıkça ön etek uyluğun üstüne yatar
    s_alt = -0.12 * LT
    wf0, wb0 = _govde_genislik(s_alt / LT)
    c0 = sk.C(s_alt)
    F0a = c0 + f_b * wf0
    s_on_men = s_alt + (0.10 * LT - s_alt) * wk
    wfm, _ = _govde_genislik(s_on_men / LT)
    F0 = sk.C(s_on_men) + _onn(sk.A(s_on_men)) * wfm
    phi_f = _smax(max(-45.0, min(45.0, phi_govde)), tt_max, 10.0) + p.get('etek_on', 0.0)
    F1a = F0a + 34.0 * _asg(phi_f)
    # uyluk üstüne yatan ön etek
    Hj = sk['H_on'] if tt_on >= tt_ar else sk['H_ar']
    dt = _asg(tt_max)
    nt = np.array([-dt[1], dt[0]])
    F1b = Hj + dt * 58.0 - nt * 33.0
    F1 = F1a + (F1b - F1a) * wk
    B0 = c0 - f_b * wb0
    phi_b = _smin(max(-40.0, min(40.0, phi_govde)), tt_min, 10.0) + p.get('etek_ar', 0.0)
    B1 = B0 + 36.0 * _asg(phi_b)
    F1[1] = min(F1[1], -1.5)
    B1[1] = min(B1[1], -1.5)
    orta = 0.5 * (F1 + B1) + _v(0, 3.0)
    orta[1] = min(orta[1], -1.5)
    on_ic = sk.C(0.12 * LT) + _onn(sk.A(0.12 * LT)) * 30.0
    ar_ic = sk.C(0.12 * LT) - _onn(sk.A(0.12 * LT)) * 34.0
    etek = [on_ic, F0, F1, 0.5 * (F1 + orta), orta, 0.5 * (orta + B1), B1, B0, ar_ic]
    p_etek = _yol(etek, gerilim=0.35)
    return _birlesim(p_serit, p_etek), dict(F1=F1, B1=B1, F0=F0, B0=B0)


def _yaka_cizgisi(sk):
    N = sk['N']
    aN = sk['a_N']
    fN, uN = _onn(aN), _yuk(aN)
    return [N - fN * 19.5 + uN * 0.5, N - fN * 6.0 - uN * 3.5, N + fN * 8.0 - uN * 7.5, N + fN * 17.0 - uN * 10.5]


# ---- kol / bacak ------------------------------------------------------------------------------------------------
def _kol_yolu(sk, t):
    S, E, Wr = sk['S_' + t], sk['E_' + t], sk['Wr_' + t]
    ust = _kapsul(S, E, 20.5, 16.0, bp=1.0, bm=1.5, bu=0.35)
    on = _kapsul(E, Wr, 16.0, 12.6, bp=1.6, bm=1.2, bu=0.25, uc_b='d', ek_b=2.5)
    return _birlesim(ust, on)


def _bacak_yolu(sk, t):
    Hj, K, A = sk['H_' + t], sk['K_' + t], sk['A_' + t]
    uy = _kapsul(Hj, K, 32.0, 21.5, bp=2.0, bm=3.0, bu=0.35)
    d = A - K
    d = d / (np.hypot(*d) + 1e-9)
    bal = _kapsul(K, A, 21.5, 19.0, bp=4.5, bm=1.0, bu=0.28, uc_b='d', ek_b=9.0)
    # kalça (oturak) kütlesi pelvis çerçevesinde
    a_b = sk['a_b']
    f_b, u_b = _onn(a_b), _yuk(a_b)
    c = Hj - f_b * 15.0 - u_b * 10.0
    otur = yol_elips(float(c[0]), float(c[1]), 35.0, 32.0, a_b)
    return _birlesim(uy, bal, otur)


# =================================================================================================================
# boyama
# =================================================================================================================
class _Boyaci:
    def __init__(self, t, Mf, isik, tohum):
        self.t = t
        self.Mf = Mf
        self.s = math.sqrt(abs(np.linalg.det(Mf[:2, :2])))
        L = np.asarray(isik, float)
        self.L = L / (np.hypot(*L) + 1e-9)
        self.tohum = int(tohum) * 101
        s = self.s
        self.ed = dict(kenar=float(np.clip(0.55 + 0.28 * s, 0.55, 1.3)), dalga=0.035, islak=1.0,
                       islak_gen=float(np.clip(0.9 + 0.9 * s, 0.9, 3.0)), gran=0.07, akis=0.15)
        self.n = 0

    def _toh(self):
        self.n += 1
        return self.tohum + self.n * 7

    def lavi(self, yol, renk_, yog, M=None, **kw):
        a = dict(self.ed)
        a.update(kw)
        self.t.lavi(yol, self.Mf if M is None else M, renk_, yog=yog, tohum=self._toh(), **a)

    def golge(self, yol, renk_, yog, d, M=None, sertlik=0.30, islak=0.45):
        """Işıktan uzak yana ikinci sır: biçim eksi ışığa kaydırılmış biçim (hilal)."""
        M = self.Mf if M is None else M
        k = yollar_kirp([yol], M, 6 + 3 * self.ed['kenar'] + d * self.s)
        if k.bos():
            return
        m = maske_ciz([yol], M, k)
        dp = d * self.s
        T = np.float32([[1, 0, self.L[0] * dp], [0, 1, self.L[1] * dp]])
        sh = cv2.warpAffine(m, T, (k.w, k.h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        sig = max(0.5, sertlik * dp)
        sh = cv2.GaussianBlur(sh, (0, 0), sig)
        mm = cv2.GaussianBlur(m, (0, 0), 0.45)
        hil = mm * (1.0 - sh)
        if hil.max() < 1e-3:
            return
        self.t.lavi([], M, renk_, yog=yog, maske=(k, hil), yumusak=0.35, dalga=0.0, islak=islak,
                    islak_gen=self.ed['islak_gen'], gran=0.08, akis=0.15, tohum=self._toh())

    def kat(self, pts, w0, w1, renk_, yog, M=None):
        """İnce, iki ucu sivri kıvrım darbesi."""
        pts = np.asarray(pts, float)
        n = len(pts)
        if n < 2:
            return
        u = np.linspace(0, 1, n)
        wd = (w0 + (w1 - w0) * u) * np.sin(np.pi * np.clip(u * 0.92 + 0.04, 0, 1)) ** 0.7
        tan = np.gradient(pts, axis=0)
        tan /= (np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9)
        nr = np.stack([-tan[:, 1], tan[:, 0]], 1)
        sol = pts + nr * wd[:, None]
        sag = pts - nr * wd[:, None]
        yol = _yol(list(sol) + list(sag[::-1]), gerilim=0.45)
        self.lavi(yol, renk_, yog, M=M, kenar=self.ed['kenar'] * 1.2, islak=0.5, gran=0.05, akis=0.1)

    def sakla(self, yol, M=None):
        self.t.sakla_ekle(yol, self.Mf if M is None else M, yumusak=0.55)


def _uzak(c, miktar=0.22):
    return karistir(c, RENK['uzak'], miktar)


def ciz_insan(t, M, poz, yon=1, isik=(-0.6, -0.8), battaniye=0.0, sakla_sonra=True, elde=None, nefes=0.0,
              zemin_golge=0.35, tohum=0, renkler=None):
    R = dict(RENK)
    if renkler:
        R.update(renkler)
    Mf = M_bilesik(np.asarray(M, np.float64), M_olcek(float(yon), 1.0))
    sk = iskelet(poz, nefes)
    B = _Boyaci(t, Mf, isik, tohum)
    s = B.s
    # saklamayı geri almak için kopya
    kayit = None
    if not sakla_sonra:
        kayit = None if t.saklama is None else t.saklama.copy()
    # ---- 1) yakın kol ---------------------------------------------------------------------------------------------
    kol_on = _kol_yolu(sk, 'on')
    B.lavi(kol_on, R['gomlek'], YOG['gomlek'])
    B.golge(kol_on, R['gomlek_golge'], 0.36, 9.0)
    B.sakla(kol_on)
    # ---- 2) yakın el ----------------------------------------------------------------------------------------------
    el_on = _el_yolu(poz['kivrim_on'], poz['yan_on'])
    M_el_on = M_bilesik(Mf, sk['M_el_on'])
    B.lavi(el_on, R['ten'], YOG['ten'] + 0.04, M=M_el_on)
    B.golge(el_on, R['ten_golge'], 0.30, 5.0, M=M_el_on)
    B.sakla(el_on, M=M_el_on)
    # ---- 3) elde tutulan nesne --------------------------------------------------------------------------------------
    if elde is not None:
        M_tut = M_bilesik(Mf, M_oteleme(*sk['avuc_on']), M_donme(90.0 - sk['th_on']))
        elde(t, M_tut)
    # ---- 4) baş: saç+sakal, deri, kulak -------------------------------------------------------------------------
    deri, sac, sakal, kulak = bas_yollari()
    M_bas = M_bilesik(Mf, sk['M_bas'])
    sac_sakal = _birlesim(sac, sakal)
    B.lavi(sac_sakal, R['sac'], YOG['sac'])  if False else None
    B.lavi(sac_sakal, R['sac'], YOG['sac'], M=M_bas)
    B.golge(sac_sakal, R['sac_golge'], 0.30, 7.0, M=M_bas)
    B.sakla(sac_sakal, M=M_bas)
    B.lavi(kulak, R['kulak'], 0.30, M=M_bas, islak=0.6)
    B.lavi(deri, R['ten'], YOG['ten'], M=M_bas)
    B.golge(deri, R['ten_golge'], 0.28, 9.0, M=M_bas)
    B.sakla(deri, M=M_bas)
    # ---- 5) gömlek gövde -----------------------------------------------------------------------------------------
    gom, etek = _gomlek_yolu(sk, poz)
    B.lavi(gom, R['gomlek'], YOG['gomlek'])
    B.golge(gom, R['gomlek_golge'], 0.34, 18.0)
    B.kat(_yaka_cizgisi(sk), 1.4, 1.0, R['gomlek_kat'], 0.30)
    B.sakla(gom)
    # ---- 6) boyun -----------------------------------------------------------------------------------------------
    N, Hp = sk['N'], sk['Hp']
    boyun = _kapsul(N - (Hp - N) * 0.45, Hp + (Hp - N) * 0.25, 18.5, 17.0, n=8, nc=7)
    B.lavi(boyun, R['ten_boyun'], YOG['ten'] + 0.06)
    B.sakla(boyun)
    # ---- 7) yakın bacak + ayakkabı --------------------------------------------------------------------------------
    for t_, uzak in (('on', False), ('ar', True)):
        bac = _bacak_yolu(sk, t_)
        cp = _uzak(R['pantolon']) if uzak else R['pantolon']
        B.lavi(bac, cp, YOG['pantolon'] * (1.12 if uzak else 1.0))
        B.golge(bac, R['pantolon_golge'], 0.32, 11.0)
        B.sakla(bac)
        M_ay = M_bilesik(Mf, sk['M_ayak_' + t_])
        ay = _yol(_ayakkabi_pts(sk['tp_' + t_]), gerilim=0.45)
        ca = _uzak(R['ayakkabi'], 0.15) if uzak else R['ayakkabi']
        B.lavi(ay, ca, YOG['ayakkabi'] * (1.06 if uzak else 1.0), M=M_ay)
        B.golge(ay, R['ayakkabi_golge'], 0.30, 6.0, M=M_ay)
        B.sakla(ay, M=M_ay)
    # ---- 8) uzak kol + el -----------------------------------------------------------------------------------------
    kol_ar = _kol_yolu(sk, 'ar')
    B.lavi(kol_ar, _uzak(R['gomlek']), YOG['gomlek'] * 1.15)
    B.golge(kol_ar, R['gomlek_golge'], 0.36, 9.0)
    B.sakla(kol_ar)
    el_ar = _el_yolu(poz['kivrim_ar'], poz['yan_ar'])
    M_el_ar = M_bilesik(Mf, sk['M_el_ar'])
    B.lavi(el_ar, _uzak(R['ten']), YOG['ten'] * 1.15, M=M_el_ar)
    B.golge(el_ar, R['ten_golge'], 0.30, 5.0, M=M_el_ar)
    B.sakla(el_ar, M=M_el_ar)
    if not sakla_sonra:
        t.saklama = kayit
    return _capalar(sk, Mf)


def _capalar(sk, Mf):
    yer = {}
    Mb = sk['M_bas']
    yer['bas'] = _nokta(Mb, (-1.0, -22.0))
    yer['bas_ust'] = _nokta(Mb, (-3.0, -63.0))
    LT = sk['LT']
    sh = 0.62 * LT
    yer['kalp'] = sk.C(sh) + _onn(sk.A(sh)) * 18.0
    yer['el_on'], yer['el_arka'] = sk['avuc_on'], sk['avuc_ar']
    yer['diz'], yer['diz_arka'] = sk['K_on'], sk['K_ar']
    yer['kalca'] = sk['kok']
    yer['ayak_on'] = _nokta(sk['M_ayak_on'], (28.0, 26.0))
    yer['ayak_arka'] = _nokta(sk['M_ayak_ar'], (28.0, 26.0))
    out = {k: _nokta(Mf, v) for k, v in yer.items()}
    ex = Mf[:2, :2] @ _asg(sk['th_on'])
    out['el_on_aci'] = math.degrees(math.atan2(ex[1], ex[0]))
    out['yerel'] = yer
    out['iskelet'] = sk
    return out


# =================================================================================================================
# pozlar
# =================================================================================================================
def _poz_ayakta():
    p = bos_poz()
    p.update(kx=0.0, ky=KALCA_Y + 2.0, bel=1.5, gogus=-1.0, boyun=13.0, bas=-13.0,
             omuz_on=3.0, dirsek_on=12.0, el_bilek_on=4.0, kivrim_on=0.35,
             omuz_ar=-2.0, dirsek_ar=10.0, el_bilek_ar=3.0, kivrim_ar=0.35)
    bacak_ik(p, 'on', (8.0, -AYAK_YUK))
    bacak_ik(p, 'ar', (-8.0, -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    return p


POZLAR = {}
POZLAR['ayakta'] = _poz_ayakta()
