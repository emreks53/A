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
EL_OLCEK = 0.92        # el biçiminin ölçeği (el boyu L_EL * EL_OLCEK)
AVUC_X = 21.0          # el çerçevesinde avuç merkezi (bilekten, ölçeksiz)

# =================================================================================================================
# renkler
# =================================================================================================================
RENK = dict(
    ten='#EDBE9E', ten_golge='#D8957C', ten_boyun='#E2A98E', kulak='#DE9F86',
    sac='#5A3D2C', sac_golge='#3A271C',
    gomlek='#8BA7C6', gomlek_golge='#6886AE', gomlek_kat='#56739C',
    pantolon='#978C82', pantolon_golge='#72675F',
    ayakkabi='#573D30', ayakkabi_golge='#3B2A22', taban='#33251E',
    battaniye='#B9A6BC', battaniye_golge='#927D9C', battaniye_serit='#8C7593', battaniye_serit2='#C9A79A',
    uzak='#77738F', zemin_golge='#958FB0',
)
YOG = dict(ten=0.40, sac=0.60, gomlek=0.50, pantolon=0.56, ayakkabi=0.86, battaniye=0.50)


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
    'omuz_on', 'dirsek_on', 'el_bilek_on', 'kivrim_on', 'yan_on', 'kisalt_on', 'kol_kisalt_on', 'ust_kisalt_on',
    'omuz_ar', 'dirsek_ar', 'el_bilek_ar', 'kivrim_ar', 'yan_ar', 'kisalt_ar', 'kol_kisalt_ar', 'ust_kisalt_ar',
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
        kk = 1.0 - 0.35 * p.get('kol_kisalt_' + t, 0.0)
        ku = 1.0 - 0.65 * p.get('ust_kisalt_' + t, 0.0)
        E = St + L_UST * kk * ku * _asg(tu)
        Wr = E + L_ON * kk * _asg(tf)
        sk['S_' + t], sk['E_' + t], sk['Wr_' + t] = St, E, Wr
        sk['tu_' + t], sk['tf_' + t], sk['th_' + t] = tu, tf, th
        ks = 1.0 - 0.45 * p['kisalt_' + t]
        sk['M_el_' + t] = M_bilesik(_cerceve(Wr, 90.0 - th), M_olcek(ks * EL_OLCEK, EL_OLCEK))
        sk['avuc_' + t] = _nokta(sk['M_el_' + t], (AVUC_X, 0.0))
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


def kol_ik(p, taraf, bilek, isaret=-1):
    """Bileği verilen yerel noktaya koyacak omuz/dirsek açılarını yazar (isaret -1: dirsek arkada/aşağıda,
    +1: dirsek önde/yukarıda)."""
    sk = iskelet(p)
    St = sk['S_' + taraf]
    Wr = np.asarray(bilek, float)
    kk = 1.0 - 0.35 * p.get('kol_kisalt_' + taraf, 0.0)
    ku = 1.0 - 0.65 * p.get('ust_kisalt_' + taraf, 0.0)
    E = _ik2(St, Wr, L_UST * kk * ku, L_ON * kk, isaret)
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
    (24.2, -44.0), (27.0, -39.0), (29.4, -33.0), (30.9, -27.4), (31.2, -23.6), (30.1, -20.0), (31.4, -16.6),
    (33.8, -12.2), (36.0, -8.2), (37.2, -5.8), (36.7, -3.7), (34.6, -2.6), (32.2, -1.8), (32.4, 2.0),
    (31.8, 6.0), (31.6, 10.0), (31.2, 14.5), (28.8, 19.0), (23.5, 21.2), (14.0, 19.0), (6.0, 15.5),
    (-6.0, 10.0), (-22.0, 2.0), (-31.0, -4.0), (-36.5, -16.0), (-37.6, -29.0), (-34.6, -43.0), (-25.0, -54.6),
    (-9.0, -59.8), (7.0, -58.6), (17.6, -53.6),
])
_SAC = np.array([
    (24.2, -44.0), (24.9, -47.6), (23.4, -52.4), (19.0, -57.0), (11.0, -60.8), (0.5, -62.6), (-11.0, -62.4),
    (-22.0, -59.0), (-31.0, -52.0), (-37.2, -41.5), (-39.6, -29.0), (-39.0, -17.0), (-36.4, -9.0), (-33.0, -4.2),
    (-30.0, -2.0), (-26.0, -3.4), (-21.5, -7.2), (-18.2, -13.0), (-16.6, -19.5), (-14.6, -24.5), (-10.6, -27.4),
    (-5.6, -28.2), (-1.6, -27.0), (1.2, -24.0), (2.0, -17.0), (2.4, -11.0), (5.6, -11.0), (6.0, -18.0),
    (6.4, -26.5), (10.6, -34.0), (17.0, -39.4),
])
_SAKAL = np.array([
    (2.2, -17.0), (5.8, -17.0), (6.2, -9.5), (9.0, -3.0), (14.0, 1.2), (19.5, 3.4), (24.0, 4.4),
    (26.6, 3.4), (27.6, 0.6), (30.0, -1.0), (32.4, -1.5), (34.3, -0.8), (35.0, 1.0), (34.6, 3.2),
    (33.8, 5.4), (34.3, 8.4), (34.9, 12.4), (33.9, 17.4), (30.8, 21.6), (25.0, 23.6), (17.0, 22.2),
    (9.0, 18.4), (2.6, 13.8), (-1.4, 8.6), (-2.0, 2.0), (-0.6, -6.0), (0.6, -12.0),
])
_KULAK = np.array([
    (-9.6, -22.4), (-13.0, -19.4), (-14.2, -13.0), (-12.8, -6.6), (-10.2, -2.4), (-7.4, -2.0), (-5.6, -4.4),
    (-4.8, -10.0), (-5.0, -16.6), (-6.6, -21.0),
])
_KULAK_IC = np.array([(-7.6, -18.2), (-10.6, -16.6), (-11.4, -12.0), (-10.0, -7.2)])


def _bas_yollari():
    deri = _yol(_BAS_DERI, gerilim=0.5)
    sac = _yol(_SAC, gerilim=0.5)
    sakal = _yol(_SAKAL, gerilim=0.5)
    kulak = _yol(_KULAK, gerilim=0.5)
    return deri, sac, sakal, kulak


_BAS_YOLLARI = None


def bas_yollari():
    global _BAS_YOLLARI
    if _BAS_YOLLARI is None:
        _BAS_YOLLARI = _bas_yollari()
    return _BAS_YOLLARI


# ---- gövde / gömlek ---------------------------------------------------------------------------------------------
_GU = np.array([-0.30, -0.12, 0.00, 0.20, 0.36, 0.50, 0.62, 0.72, 0.80, 0.88, 0.95, 1.00])
_GF = np.array([40.0, 40.0, 39.5, 38.8, 39.0, 40.6, 42.6, 43.6, 43.0, 38.5, 30.5, 21.0])   # ön (karın/göğüs)
_GB = np.array([45.0, 46.5, 45.5, 39.5, 37.6, 38.2, 40.0, 41.6, 42.0, 39.6, 33.0, 23.0])   # arka (kalça/sırt)


def _govde_genislik(u, nf=0.0):
    wf = np.interp(u, _GU, _GF) + nf * 1.6 * np.exp(-((u - 0.7) / 0.15) ** 2)
    wb = np.interp(u, _GU, _GB)
    return wf, wb


def _gomlek_yolu(sk, p):
    LT = sk['LT']
    nf = sk['nf']
    a_b = sk['a_b']
    f_b = _onn(a_b)
    phi_govde = -a_b
    tt_on, tt_ar = sk['tt_on'], sk['tt_ar']
    tt_max = _smax(tt_on, tt_ar, 8.0)
    tt_min = _smin(tt_on, tt_ar, 8.0)
    hf = tt_max + a_b                        # kalça bükülmesi (derece)
    wk = _ss(35.0, 85.0, hf)                 # uyluk gövdeye yaklaştıkça ön etek uyluğun üstüne yatar
    s_alt = -0.10 * LT
    s_on_men = s_alt + (0.12 * LT - s_alt) * wk
    # etek menteşeleri ve kanatlar (yerçekimi + uyluk + zemin)
    c0 = sk.C(s_alt)
    wf0, wb0 = _govde_genislik(s_alt / LT)
    F0a = c0 + f_b * wf0
    L_on, L_ar = 25.0, 26.0
    phi_g = 0.45 * max(-60.0, min(60.0, phi_govde))      # kumaş gövdeyi kısmen izler, kısmen sarkar
    phi_f = _smax(phi_g, tt_max - 3.0, 10.0) + p.get('etek_on', 0.0)
    F1a = F0a + L_on * _asg(phi_f)
    Hj = sk['H_on'] if tt_on >= tt_ar else sk['H_ar']
    dt = _asg(tt_max)
    nt = np.array([-dt[1], dt[0]])
    F1b = Hj + dt * 54.0 - nt * 32.5        # uyluğun ön yüzüne yatan etek ucu
    F1 = F1a + (F1b - F1a) * wk
    B0 = c0 - f_b * wb0
    phi_b = _smin(phi_g, tt_min + 2.0, 10.0) + p.get('etek_ar', 0.0)
    B1 = B0 + L_ar * _asg(phi_b)
    F1[1] = min(F1[1], -1.5)
    B1[1] = min(B1[1], -1.5)
    orta = 0.5 * (F1 + B1) + _v(0, 2.0)
    orta[1] = min(orta[1], -1.5)
    # tek kapalı çevre: ön kanat ucu -> ön yüz (yukarı) -> yaka -> arka yüz (aşağı) -> arka kanat -> etek
    on, ar = [], []
    for s in np.linspace(s_on_men, LT, 20):
        c = sk.C(s)
        wf, _ = _govde_genislik(s / LT, nf)
        on.append(c + _onn(sk.A(s)) * wf)
    for s in np.linspace(s_alt, LT, 22):
        c = sk.C(s)
        _, wb = _govde_genislik(s / LT, nf)
        ar.append(c - _onn(sk.A(s)) * wb)
    N = sk['N']
    aN = sk['a_N']
    fN, uN = _onn(aN), _yuk(aN)
    yaka_on = N + fN * 18.0 - uN * 5.0
    yaka_ar = N - fN * 20.5 + uN * 7.0
    F0 = on[0]
    cevre = ([F1, 0.55 * F1 + 0.45 * F0] + on + [yaka_on, N + uN * 3.0 + fN * 2.0, yaka_ar] + ar[::-1]
             + [0.5 * (B0 + B1) - _asg(phi_b + 90.0) * 1.5, B1, 0.6 * B1 + 0.4 * orta, orta, 0.4 * orta + 0.6 * F1])
    yol = _yol(cevre, gerilim=0.42)
    return yol, dict(F1=F1, B1=B1, F0=F0, B0=B0)


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
    bal = _kapsul(K, A, 21.5, 19.0, bp=4.5, bm=1.0, bu=0.28, uc_b='d', ek_b=5.5)
    # kalça (oturak) kütlesi pelvis çerçevesinde
    a_b = sk['a_b']
    f_b, u_b = _onn(a_b), _yuk(a_b)
    c = Hj - f_b * 13.0 - u_b * 9.0
    otur = yol_elips(float(c[0]), float(c[1]), 31.0, 30.0, a_b)
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
        self.ed = dict(kenar=float(np.clip(0.55 + 0.28 * s, 0.55, 1.3)), dalga=0.03, islak=1.0,
                       islak_gen=float(np.clip(0.9 + 0.9 * s, 0.9, 3.0)), gran=0.07, akis=0.07)
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
                    islak_gen=self.ed['islak_gen'], gran=0.08, akis=0.07, tohum=self._toh())

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

    def sakla(self, yol, M=None, asin=0.6):
        """Biçimi saklamaya yazar; kenarı asin px içeri çekilir ki arkadaki lavi hafifçe altına girsin
        (beyaz boşluk değil, ince pigment bindirmesi)."""
        M = self.Mf if M is None else M
        k = yollar_kirp([yol], M, 4)
        if k.bos():
            return
        m = maske_ciz([yol], M, k)
        m = cv2.GaussianBlur(m, (0, 0), 0.7)
        m = np.clip((m - 0.5) / 0.32 + 0.5 - asin * 0.9, 0.0, 1.0)
        self.t.sakla_ekle(None, M, yumusak=0.0, maske=(k, m))


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
    B.lavi(sakal, R['sac'], YOG['sac'] * 0.88, M=M_bas)
    B.golge(sakal, R['sac_golge'], 0.26, 5.0, M=M_bas)
    B.sakla(sakal, M=M_bas)
    B.lavi(sac, R['sac'], YOG['sac'], M=M_bas)
    B.golge(sac, R['sac_golge'], 0.26, 7.0, M=M_bas)
    B.sakla(sac, M=M_bas)
    B.lavi(kulak, R['kulak'], 0.30, M=M_bas, islak=0.7)
    B.kat(_KULAK_IC, 1.3, 1.0, R['ten_golge'], 0.32, M=M_bas)
    B.lavi(deri, R['ten'], YOG['ten'], M=M_bas)
    B.golge(deri, R['ten_golge'], 0.28, 9.0, M=M_bas)
    B.sakla(deri, M=M_bas)
    # ---- 5) gömlek gövde -----------------------------------------------------------------------------------------
    gom, etek = _gomlek_yolu(sk, poz)
    B.lavi(gom, R['gomlek'], YOG['gomlek'])
    B.golge(gom, R['gomlek_golge'], 0.32, 15.0)
    B.kat(_yaka_cizgisi(sk), 1.4, 1.0, R['gomlek_kat'], 0.30)
    B.sakla(gom)
    # ---- 6) boyun -----------------------------------------------------------------------------------------------
    N, Hp = sk['N'], sk['Hp']
    boyun = _kapsul(N - (Hp - N) * 0.45, Hp + (Hp - N) * 0.20, 20.0, 18.6, n=8, nc=7)
    B.lavi(boyun, R['ten_boyun'], YOG['ten'] + 0.05)
    ax = (Hp - N) / (np.hypot(*(Hp - N)) + 1e-9)

    def _boyun_golge(X, Y, N=N, ax=ax):
        tt = ((X - N[0]) * ax[0] + (Y - N[1]) * ax[1]) / L_BOYUN
        return smoothstep(0.15, 1.05, tt).astype(np.float32)
    B.lavi(boyun, R['ten_golge'], 0.34, yog_fn=_boyun_golge, islak=0.3)
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
def _ayak_parmakta(p, taraf, diz=None, aci=4.0, dx=0.0):
    """Diz yerde, ayak parmakları kıvrık (secde / topuklar üstünde oturma). Ayak bileği, diz noktasından baldır
    boyu uzakta ve tarak (top) yere değecek yerde seçilir; ayak ekseni aci (asg, ~dik)."""
    diz = DIZ if diz is None else np.asarray(diz, float)
    Rm = M_donme(90.0 - aci)
    ofs = _uygula(Rm, [(TOP_X, 26.0)])[0]
    Ay = -0.4 - ofs[1]
    Ax = diz[0] - math.sqrt(max(1.0, L_BALDIR ** 2 - (Ay - diz[1]) ** 2)) + dx
    bacak_ik(p, taraf, (Ax, Ay))
    ayak_duz(p, taraf, aci)
    p['parmak_' + taraf] = 90.0 - aci
    return p


def _poz_ayakta():
    p = bos_poz()
    p.update(ky=KALCA_Y + 1.5, bel=2.0, gogus=-1.5, boyun=14.0, bas=-14.0,
             omuz_on=4.0, dirsek_on=12.0, el_bilek_on=4.0, kivrim_on=0.35,
             omuz_ar=-1.0, dirsek_ar=10.0, el_bilek_ar=3.0, kivrim_ar=0.35)
    bacak_ik(p, 'on', (10.0, -AYAK_YUK))
    bacak_ik(p, 'ar', (-12.0, -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    return p


def _poz_ayakta_dik():
    p = bos_poz()
    p.update(ky=KALCA_Y + 0.5, bel=-1.0, gogus=-4.0, boyun=9.0, bas=-13.0, omuz_kalk=1.5,
             omuz_on=-4.0, dirsek_on=7.0, el_bilek_on=3.0, kivrim_on=0.4,
             omuz_ar=-6.0, dirsek_ar=7.0, el_bilek_ar=2.0, kivrim_ar=0.4)
    bacak_ik(p, 'on', (6.0, -AYAK_YUK))
    bacak_ik(p, 'ar', (-10.0, -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    return p


# ---- ibrik (yer tutucu geometri, el çerçevesinde: köken avuç, +x parmak yönü) --------------------------------
IBRIK_ALT_EL = (42.0, 40.0)   # sula pozunda uzak elin avucu, yakın el çerçevesinde (ibriğin altı)


def _poz_sula(dok=0.0):
    p = bos_poz()
    p.update(kx=-10.0, ky=KALCA_Y + 7.0, bel=17.0, gogus=9.0, boyun=10.0, bas=8.0,
             kivrim_on=0.92, yan_on=0.0, kivrim_ar=0.15, yan_ar=-1.0)
    bacak_ik(p, 'on', (24.0, -AYAK_YUK))
    bacak_ik(p, 'ar', (-30.0, -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    th = 92.0 - 42.0 * dok
    kol_ik(p, 'on', (66.0 + 6 * dok, -392.0 + 6 * dok))
    el_aci(p, 'on', th)
    sk = iskelet(p)
    Mel = M_bilesik(M_oteleme(*sk['avuc_on']), M_donme(90.0 - th))
    hedef = _nokta(Mel, IBRIK_ALT_EL)
    x = _asg(th)
    kol_ik(p, 'ar', hedef - x * 21.0)
    el_aci(p, 'ar', th)
    return p


def _poz_kiyam():
    p = bos_poz()
    p.update(ky=KALCA_Y + 1.0, bel=1.0, gogus=-1.0, boyun=17.0, bas=2.0,
             kivrim_on=0.25, yan_on=0.3, kisalt_on=0.55, kivrim_ar=0.3, yan_ar=0.2, kisalt_ar=0.45)
    bacak_ik(p, 'on', (7.0, -AYAK_YUK))
    bacak_ik(p, 'ar', (-9.0, -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    kol_ik(p, 'on', (25.0, -370.0))
    el_aci(p, 'on', 80.0)
    kol_ik(p, 'ar', (33.0, -379.0))
    el_aci(p, 'ar', 74.0)
    return p


def _poz_ruku():
    p = bos_poz()
    p.update(kx=-38.0, ky=KALCA_Y + 5.0, bel=82.0, gogus=5.0, boyun=-2.0, bas=2.0,
             kivrim_on=0.25, yan_on=0.45, kivrim_ar=0.25, yan_ar=0.45)
    bacak_ik(p, 'on', (5.0, -AYAK_YUK))
    bacak_ik(p, 'ar', (-5.0, -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    sk = iskelet(p)
    for t in ('on', 'ar'):
        K = sk['K_' + t]
        kol_ik(p, t, K + _v(16.0, -30.0))
        el_aci(p, t, 8.0)
    return p


# diz çökme ailesi: dizler (124, -21)'de sabit; köken diz_dua'da kalçanın altı
DIZ = np.array([124.0, -21.0])


def _poz_diz_dua():
    p = bos_poz()
    p.update(kx=0.0, ky=-100.0, bel=0.0, gogus=-2.0, boyun=12.0, bas=-6.0,
             kivrim_on=0.18, yan_on=-1.0, kivrim_ar=0.18, yan_ar=-1.0)
    _ayak_parmakta(p, 'on')
    _ayak_parmakta(p, 'ar', dx=-3.0)
    kol_ik(p, 'on', (50.0, -238.0))
    el_aci(p, 'on', 128.0)
    kol_ik(p, 'ar', (58.0, -245.0))
    el_aci(p, 'ar', 132.0)
    return p


def _bas_yere(p, a_h=104.7, alin=(29.6, -31.0), yuk=-0.6):
    """Secde: baş açısı a_h iken alın yere (y=yuk) değecek boyun açısını çözer (boyun ve bas anahtarları)."""
    sk = iskelet(p)
    N, aN = sk['N'], sk['a_N']
    ofs = _uygula(M_donme(a_h), [alin])[0]
    py = yuk - ofs[1]                        # baş pivotunun olması gereken y
    c = (N[1] - py) / L_BOYUN               # -cos(a_n) * L = py - N.y  ->  cos a_n = (N.y - py)/L
    c = max(-1.0, min(1.0, c))
    a_n = math.degrees(math.acos(c))
    p['boyun'] = a_n - aN
    p['bas'] = a_h - a_n
    return p


def _poz_secde():
    p = bos_poz()
    kok = DIZ - L_UYLUK * _asg(6.0)
    p.update(kx=kok[0], ky=kok[1], bel=117.0, gogus=8.0,
             kivrim_on=0.0, yan_on=1.0, kivrim_ar=0.0, yan_ar=1.0, kol_kisalt_on=0.75, kol_kisalt_ar=0.75,
             ust_kisalt_on=0.55, ust_kisalt_ar=0.55)
    _ayak_parmakta(p, 'on')
    _ayak_parmakta(p, 'ar', dx=-3.0)
    _bas_yere(p)
    sk = iskelet(p)
    bx = sk['Hp'][0]
    for t, dx in (('on', 0.0), ('ar', 5.0)):
        kol_ik(p, t, (bx - 26.0 + dx, -7.6), isaret=+1)
        el_aci(p, t, 90.0)
    return p


# oturma ailesi: kalça yerde, köken kalçanın altı
def _poz_oturus(dik):
    p = bos_poz()
    if dik:
        p.update(kx=0.0, ky=-44.0, bel=-4.0, gogus=3.0, boyun=11.0, bas=-10.0, bel_kambur=0.0,
                 kivrim_on=0.55, yan_on=0.4, kivrim_ar=0.55, yan_ar=0.4)
    else:
        p.update(kx=0.0, ky=-44.0, bel=-13.0, gogus=40.0, boyun=16.0, bas=10.0, bel_kambur=14.0,
                 kivrim_on=0.55, yan_on=0.4, kivrim_ar=0.55, yan_ar=0.4)
    bacak_ik(p, 'on', (96.0, -AYAK_YUK))
    bacak_ik(p, 'ar', (88.0, -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    sk = iskelet(p)
    K = sk['K_on']
    if dik:
        kol_ik(p, 'on', K + _v(30.0, 44.0))
        el_aci(p, 'on', -10.0)
        kol_ik(p, 'ar', K + _v(36.0, 52.0))
        el_aci(p, 'ar', -20.0)
    else:
        kol_ik(p, 'on', K + _v(24.0, 30.0))
        el_aci(p, 'on', -20.0)
        kol_ik(p, 'ar', K + _v(30.0, 38.0))
        el_aci(p, 'ar', -30.0)
    return p


KALKIS_DX = 72.0   # kalkış sonunda figür ayakta_dik'in KALKIS_DX kadar öne kaymış hâlidir


def _poz_kalkis(i):
    p = bos_poz()
    if i == 1:     # öne eğil, ayakları çek, kollar öne
        p.update(kx=4.0, ky=-46.0, bel=30.0, gogus=16.0, boyun=4.0, bas=-6.0,
                 omuz_on=78.0, dirsek_on=22.0, el_bilek_on=-6.0, omuz_ar=70.0, dirsek_ar=24.0, el_bilek_ar=-6.0,
                 kivrim_on=0.35, kivrim_ar=0.35)
    elif i == 2:   # kalça yerden kalkar, derin çömelme, ağırlık ayaklarda
        p.update(kx=34.0, ky=-118.0, bel=46.0, gogus=10.0, boyun=0.0, bas=-8.0,
                 omuz_on=70.0, dirsek_on=18.0, el_bilek_on=-4.0, omuz_ar=64.0, dirsek_ar=20.0, el_bilek_ar=-4.0,
                 kivrim_on=0.35, kivrim_ar=0.35)
    else:          # yarı doğrulmuş
        p.update(kx=62.0, ky=-246.0, bel=22.0, gogus=2.0, boyun=8.0, bas=-10.0,
                 omuz_on=24.0, dirsek_on=16.0, el_bilek_on=2.0, omuz_ar=18.0, dirsek_ar=16.0, el_bilek_ar=2.0,
                 kivrim_on=0.38, kivrim_ar=0.38)
    bacak_ik(p, 'on', (6.0 + KALKIS_DX, -AYAK_YUK))
    bacak_ik(p, 'ar', (-10.0 + KALKIS_DX, -AYAK_YUK))
    ayak_duz(p, 'on')
    ayak_duz(p, 'ar')
    return p


def _kaydir(p, dx, dy=0.0):
    q = dict(p)
    q['kx'] += dx
    q['ky'] += dy
    return q


def _diz_secde_ara(i):
    p = bos_poz()
    if i == 1:   # kalça topuklardan kalkar, gövde öne
        th = 34.0
        kok = DIZ - L_UYLUK * _asg(th)
        p.update(kx=kok[0], ky=kok[1], bel=38.0, gogus=6.0, boyun=6.0, bas=-8.0,
                 kivrim_on=0.25, yan_on=0.6, kivrim_ar=0.25, yan_ar=0.6, kol_kisalt_on=0.2, kol_kisalt_ar=0.2)
    else:        # eller yere iner
        th = 14.0
        kok = DIZ - L_UYLUK * _asg(th)
        p.update(kx=kok[0], ky=kok[1], bel=96.0, gogus=8.0, boyun=10.0, bas=-14.0,
                 kivrim_on=0.05, yan_on=1.0, kivrim_ar=0.05, yan_ar=1.0, kol_kisalt_on=0.6, kol_kisalt_ar=0.6,
                 ust_kisalt_on=0.35, ust_kisalt_ar=0.35)
    _ayak_parmakta(p, 'on')
    _ayak_parmakta(p, 'ar', dx=-3.0)
    sk = iskelet(p)
    for t, dx in (('on', 0.0), ('ar', 6.0)):
        S = sk['S_' + t]
        if i == 1:
            kol_ik(p, t, (S[0] + 70.0 + dx, -78.0))
            el_aci(p, t, 60.0)
        else:
            kol_ik(p, t, (S[0] + 58.0 + dx, -7.6), isaret=+1)
            el_aci(p, t, 90.0)
    return p


# =================================================================================================================
# yürüyüş
# =================================================================================================================
YURUYUS_ADIM = 330.0       # bir döngüde (faz 0->1) alınan yol (iki adım); sahne x'i bu hızla ilerletmeli
_YUR_HS = 76.0             # topuk vuruşunda topuğun kalçaya göre x'i
_YUR_TO = 0.62             # parmak kalkışı (stance oranı)


def _yur_ayak(f):
    """Tek ayak: faz f (0 = topuk vuruşu). Dönüş: (ayak bileği, ayak açısı (asg), parmak açısı)."""
    D = YURUYUS_ADIM
    f = f % 1.0
    dorsi = 14.0
    if f < _YUR_TO:
        x_topuk = _YUR_HS - D * f
        if f < 0.10:                       # topuk vuruşu: topuk etrafında yere iner
            a = dorsi * (1.0 - _ss(0.0, 0.10, f))
            piv = np.array([x_topuk, 0.0])
            Rm = M_donme(90.0 - (90.0 + a))
            A = piv - _uygula(Rm, [(TOPUK_X, 26.0)])[0]
            return A, 90.0 + a, 0.0
        if f < 0.36:                       # tam basış
            A = np.array([x_topuk - TOPUK_X, -AYAK_YUK - 1.0])
            return A, 90.0, 0.0
        # topuk kalkar: tarak etrafında döner
        u = (f - 0.36) / (_YUR_TO - 0.36)
        a = 58.0 * (u ** 1.35)
        piv = np.array([x_topuk + (TOP_X - TOPUK_X), 0.0])
        Rm = M_donme(90.0 - (90.0 - a))
        A = piv - _uygula(Rm, [(TOP_X, 26.0)])[0]
        return A, 90.0 - a, a
    # salınım
    A0, a0, p0 = _yur_ayak(_YUR_TO - 1e-6)
    A1, a1, p1 = _yur_ayak(1.0 - 1e-9 + 1e-9) if False else _yur_ayak(0.0)
    u = (f - _YUR_TO) / (1.0 - _YUR_TO)
    ue = u * u * (3 - 2 * u)
    x = A0[0] + (A1[0] - A0[0]) * (0.15 * u + 0.85 * ue)
    kal = 17.0 * math.sin(math.pi * min(1.0, u * 1.12)) ** 1.2 + 9.0 * math.exp(-((u - 0.25) / 0.16) ** 2)
    y = A0[1] + (A1[1] - A0[1]) * ue - kal
    # ayak açısı: kalkış açısından nötre, sonra topuk vuruşu için yukarı
    a_orta = 82.0
    if u < 0.5:
        a = a0 + (a_orta - a0) * _ss(0.0, 0.5, u)
    else:
        a = a_orta + (a1 - a_orta) * _ss(0.5, 1.0, u)
    par = p0 * (1.0 - _ss(0.0, 0.35, u))
    return np.array([x, y]), a, par


def yuruyus(faz):
    """Doğal yürüyüş döngüsü; faz 0..1 bir tam döngü (faz 0: yakın ayak topuk vuruşu, 0.5: uzak ayak).
    Yerinde yürür: basan ayak geriye YURUYUS_ADIM/döngü hızıyla kayar; sahne figürü x += YURUYUS_ADIM * faz_artışı
    kadar ilerletirse ayaklar yerde kaymaz."""
    f = faz % 1.0
    p = bos_poz()
    bob = math.cos(4 * math.pi * (f - 0.06))
    p['ky'] = -308.0 + 6.0 * bob
    p['kx'] = 0.0
    p['bel'] = 3.0 + 0.8 * bob
    p['gogus'] = 0.5
    p['boyun'] = 13.0
    p['bas'] = -(p['bel'] + p['gogus'] + p['boyun']) + 2.0 - 0.6 * bob
    sal = math.cos(2 * math.pi * f)
    p['omuz_on'] = 2.0 - 12.0 * sal
    p['omuz_ar'] = 2.0 + 12.0 * sal
    p['dirsek_on'] = 11.0 + 13.0 * max(0.0, -sal) ** 1.2
    p['dirsek_ar'] = 11.0 + 13.0 * max(0.0, sal) ** 1.2
    p['el_bilek_on'] = 4.0 + 4.0 * max(0.0, -sal)
    p['el_bilek_ar'] = 4.0 + 4.0 * max(0.0, sal)
    p['kivrim_on'] = p['kivrim_ar'] = 0.38
    for t, ff in (('on', f), ('ar', f + 0.5)):
        A, a, par = _yur_ayak(ff)
        bacak_ik(p, t, A)
        ayak_duz(p, t, a)
        p['parmak_' + t] = par
    return p


# =================================================================================================================
# karıştırma
# =================================================================================================================
def _capa(sk, ad):
    if ad == 'ayak_on':
        return _nokta(sk['M_ayak_on'], (TOP_X, 26.0))
    if ad == 'ayak_ar':
        return _nokta(sk['M_ayak_ar'], (TOP_X, 26.0))
    if ad == 'diz_on':
        return sk['K_on']
    if ad == 'diz_ar':
        return sk['K_ar']
    if ad == 'kalca':
        return sk['kok']
    if ad == 'el_on':
        return sk['avuc_on']
    raise KeyError(ad)


def poz_karistir(a, b, t, sabit=None):
    """İki pozun karışımı (bütün açılar ve kök doğrusal). sabit='ayak_on'|'ayak_ar'|'diz_on'|'diz_ar'|'el_on':
    o noktanın konumu iki pozdaki konumlarının doğrusal karışımına oturtulur (kök kaydırılarak) — yere basan
    nokta iki pozda aynı yerdeyse geçiş boyunca kaymaz."""
    t = float(t)
    out = {k: a.get(k, 0.0) + (b.get(k, 0.0) - a.get(k, 0.0)) * t for k in ANAHTARLAR}
    if sabit:
        hedef = _capa(iskelet(a), sabit) * (1 - t) + _capa(iskelet(b), sabit) * t
        d = hedef - _capa(iskelet(out), sabit)
        out['kx'] += d[0]
        out['ky'] += d[1]
    return out


def _hermite(p0, p1, p2, p3, u):
    """Uç noktada aşmayan (monoton-benzeri) kübik Hermite: p1 -> p2."""
    def teg(a, b, c):
        if (b - a) * (c - b) <= 0:
            return 0.0
        return 0.5 * (c - a)
    m1 = teg(p0, p1, p2)
    m2 = teg(p1, p2, p3)
    u2, u3 = u * u, u * u * u
    return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2


def poz_yolu(pozlar, t, sabit=None, sureler=None):
    """Bir poz dizisi boyunca yumuşak (C1) geçiş; t 0..1 bütün dizi. sureler: her aralığın göreli süresi.
    sabit: poz_karistir'daki gibi; çapa noktası da aynı eğriyle izlenir."""
    n = len(pozlar)
    if n == 1:
        return dict(pozlar[0])
    sureler = sureler or [1.0] * (n - 1)
    top = float(sum(sureler))
    t = min(1.0, max(0.0, float(t))) * top
    i = 0
    while i < n - 2 and t > sureler[i]:
        t -= sureler[i]
        i += 1
    u = min(1.0, max(0.0, t / sureler[i]))
    P = [pozlar[max(0, i - 1)], pozlar[i], pozlar[i + 1], pozlar[min(n - 1, i + 2)]]
    out = {k: _hermite(P[0].get(k, 0.0), P[1].get(k, 0.0), P[2].get(k, 0.0), P[3].get(k, 0.0), u)
           for k in ANAHTARLAR}
    if sabit:
        C = [_capa(iskelet(q), sabit) for q in P]
        hedef = np.array([_hermite(C[0][j], C[1][j], C[2][j], C[3][j], u) for j in range(2)])
        d = hedef - _capa(iskelet(out), sabit)
        out['kx'] += d[0]
        out['ky'] += d[1]
    return out


def kalkis(t):
    """oturus_dik -> ayakta_dik (t 0..1, içeride yumuşatılır). Ayaklar ilk %22'de çekilir, sonra yerde sabit.
    t=1'de sonuç = ayakta_dik, x'te KALKIS_DX kadar öne kaymış."""
    u = _ss(0.0, 1.0, t)
    return poz_yolu(KALKIS_DIZI, u, sabit='ayak_on', sureler=[0.8, 1.0, 1.0, 1.1])


def secdeye(t):
    """diz_dua -> secde (t 0..1, içeride yumuşatılır); dizler ve ayak parmakları yerde sabit.
    Geri dönüş (secde -> diz_dua) için secdeye(1 - t)."""
    u = _ss(0.0, 1.0, t)
    return poz_yolu(SECDE_DIZI, u, sabit='diz_on', sureler=[1.0, 1.0, 1.0])


POZLAR = {}
POZLAR['ayakta'] = _poz_ayakta()
POZLAR['ayakta_dik'] = _poz_ayakta_dik()
POZLAR['sula'] = _poz_sula(0.0)
POZLAR['sula_dok'] = _poz_sula(1.0)
POZLAR['kiyam'] = _poz_kiyam()
POZLAR['ruku'] = _poz_ruku()
POZLAR['secde'] = _poz_secde()
POZLAR['oturus_hasta'] = _poz_oturus(False)
POZLAR['oturus_dik'] = _poz_oturus(True)
POZLAR['diz_dua'] = _poz_diz_dua()
POZLAR['kalkis_1'] = _poz_kalkis(1)
POZLAR['kalkis_2'] = _poz_kalkis(2)
POZLAR['kalkis_3'] = _poz_kalkis(3)
POZLAR['kalkis_4'] = _kaydir(POZLAR['ayakta_dik'], KALKIS_DX)
POZLAR['diz_secde_1'] = _diz_secde_ara(1)
POZLAR['diz_secde_2'] = _diz_secde_ara(2)
for _i in range(4):
    POZLAR['yuru_%d' % _i] = yuruyus(_i / 4.0)
KALKIS_DIZI = [POZLAR[k] for k in ('oturus_dik', 'kalkis_1', 'kalkis_2', 'kalkis_3', 'kalkis_4')]
SECDE_DIZI = [POZLAR[k] for k in ('diz_dua', 'diz_secde_1', 'diz_secde_2', 'secde')]
