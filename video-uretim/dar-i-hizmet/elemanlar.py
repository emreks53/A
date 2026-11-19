"""Sahnelerde ortak kullanılan suluboya öğeleri: gök, bulut, uzak ağaç sırası, zemin, şakayık, gül, okaliptüs ...

Hepsi Tuval.lavi ile çizilir; M: yerel -> ekran matrisi. Ölçüler yerel birimdedir (dünya pikseli).
"""
from __future__ import annotations

import math

import numpy as np

from motor import (Tuval, M_bilesik, M_oteleme, M_olcek, M_donme, M_yerlestir, yol_egri, yol_daire, yol_elips,
                   yol_dikdortgen, yol_serit, yol_birlesim, damla_blob, maske_ciz, yollar_kirp, smoothstep,
                   acilma_radyal, maske_zinciri, renk, karistir, W, H, Kirp, bezier_noktalar, yol_cokgen)
import cv2

# ---------------------------------------------------------------------------------------------------------------
# palet (S-146 paletinden genişletilmiş)
# ---------------------------------------------------------------------------------------------------------------
P = dict(
    kobalt='#4F7FB8', seruleum='#6998C6', gok_acik='#A9C6E0', pembe_kum='#EAD3C6', kum='#E9DCC6',
    kum_koyu='#CDB89A', adacayi='#A5B8B0', adacayi_koyu='#7E978A', yesil='#60976D', yesil_acik='#A1C69A',
    yesil_koyu='#3F6E50', okaliptus='#8FAEA3', okaliptus_koyu='#5E8577', allik='#E7BBB6', gul='#E28389',
    gul_koyu='#C25A66', seftali='#EFC7B3', seftali_koyu='#E09A7C', lavanta='#B7B0CC', lavanta_gri='#A7A3B8',
    mor_kahve='#6E5862', altin='#D9A441', altin_koyu='#B57E25', okra='#C99A4E', gamboj='#F0C75E',
    murekkep='#3B3F55', toprak='#9C7A5B', toprak_koyu='#6F5640', ten='#E8B898', ten_golge='#C98E74',
    sac='#4A3A33', gomlek='#7F9FC0', gomlek_golge='#5D7EA3', pantolon='#6C6F80', beyaz_tas='#EEEAE6',
    firtina='#7C7894', firtina_koyu='#5E5A78', kirmizi_nar='#C2404A',
)


def C(ad):
    return renk(P[ad]) if ad in P else renk(ad)


# ---------------------------------------------------------------------------------------------------------------
# gök ve bulut
# ---------------------------------------------------------------------------------------------------------------
def bulut_yolu(cx, cy, gen, yuk, tohum=0, lob=6):
    """Altı düzce, üstü loblu kümülüs (yerel)."""
    rng = np.random.default_rng(tohum)
    yollar = []
    # taban gövde
    yollar.append(yol_elips(cx, cy + yuk * 0.18, gen * 0.5, yuk * 0.32))
    for i in range(lob):
        u = (i + 0.5) / lob
        x = cx - gen * 0.46 + u * gen * 0.92 + rng.uniform(-0.04, 0.04) * gen
        tepe = math.sin(u * math.pi) ** 0.8
        r = yuk * (0.26 + 0.34 * tepe) * rng.uniform(0.85, 1.12)
        y = cy + yuk * 0.22 - r * 0.9 - tepe * yuk * 0.18
        yollar.append(yol_daire(x, y, r))
    # alt kenarı düzlemek için kırpma: tabanı dikdörtgenle sınırla
    from motor import yol_op
    p = yollar[0]
    for q in yollar[1:]:
        p = yol_op(p, q, 'birlesim')
    kes = yol_dikdortgen(cx - gen, cy - yuk * 2, cx + gen, cy + yuk * 0.42)
    return yol_op(p, kes, 'kesisim')


def gok(t: Tuval, M, bulutlar=(), ust='#5F8FC4', orta='#8DB2D7', alt='#EAD6CB', yog=0.82, tohum=1,
        ufuk=0.78, alt_yog=0.35, kirp=None, ek_maske=None, gran=0.09, bulut_alfa=1.0):
    """Bütün ekranı kaplayan gök lavisi; bulutlar boş kâğıt olarak saklanır (alt kenarları ıslak karışır).
    M: dünya->ekran (bulut konumları için). bulutlar: [(cx, cy, gen, yuk, tohum), ...] dünya biriminde."""
    k = kirp or Kirp(0, 0, W, H)
    saklama = np.zeros((k.h, k.w), np.float32)
    alt_golge = []
    for (cx, cy, g, y, s) in bulutlar:
        p = bulut_yolu(cx, cy, g, y, s)
        kk = yollar_kirp([p], M, 40)
        if kk.bos():
            continue
        m = maske_ciz([p], M, kk)
        # üst kenar keskin, alt kenar ıslak karışır
        mb_s = cv2.GaussianBlur(m, (0, 0), 1.6)
        mb_y = cv2.GaussianBlur(m, (0, 0), 9.0)
        yy = np.linspace(0, 1, kk.h, dtype=np.float32)[:, None]
        alt_k = smoothstep(0.45, 0.95, yy)
        mm = mb_s * (1 - alt_k) + mb_y * alt_k
        # kırpıntıyı gök kırpıntısına yerleştir
        x0, y0 = kk.x0 - k.x0, kk.y0 - k.y0
        xa, ya = max(0, x0), max(0, y0)
        xb, yb = min(k.w, x0 + kk.w), min(k.h, y0 + kk.h)
        if xb <= xa or yb <= ya:
            continue
        sub = mm[ya - y0:yb - y0, xa - x0:xb - x0]
        np.maximum(saklama[ya:yb, xa:xb], sub, out=saklama[ya:yb, xa:xb])
        alt_golge.append((p, cx, cy, g, y, s))
    from motor import smoothstep as ss
    gm = 1.0 - ss(0.35, 0.8, saklama) * bulut_alfa
    if ek_maske is not None:
        gm = gm * ek_maske
    t.degrade_lavi([(0.0, ust, 1.0), (0.42, orta, 0.85), (ufuk, alt, alt_yog), (1.0, alt, alt_yog * 0.8)],
                   yog=yog, gran=gran, akis=0.10, M=M, tohum=tohum, maske=gm, kirp=k, dunya_y=True)
    # bulutların altına lila gölge
    for (p, cx, cy, g, y, s) in alt_golge:
        def yf(X, Y, cy=cy, y=y):
            return smoothstep(cy - y * 0.25, cy + y * 0.42, Y)
        if bulut_alfa > 0.02:
            t.lavi(p, M, '#BDB6D6', yog=0.30 * bulut_alfa, kenar=2.0, dalga=0.18, islak=0.25, islak_gen=8, gran=0.10,
                   akis=0.2, tohum=s + 5, yog_fn=yf)


def uzak_agac_sirasi(t: Tuval, M, x0, x1, taban, yuk=60, renk_='#A5B8B0', yog=0.5, tohum=3, yogunluk=0.9,
                     maske_fn=None):
    """Ufukta pusa karışmış adaçayı yeşili ağaç sırası."""
    rng = np.random.default_rng(tohum)
    pts = [(x0, taban + 4)]
    x = x0
    while x < x1:
        w = rng.uniform(18, 46) * (yuk / 60)
        h = yuk * rng.uniform(0.45, 1.0) * yogunluk
        n = 5
        for j in range(n + 1):
            u = j / n
            pts.append((x + w * u, taban - h * math.sin(u * math.pi) ** 0.7 - rng.uniform(0, 3)))
        x += w * rng.uniform(0.75, 0.95)
    pts.append((x1, taban + 4))
    p = yol_egri(pts, kapali=True, gerilim=0.4)
    t.lavi(p, M, renk_, yog=yog, kenar=1.6, dalga=0.16, islak=0.5, islak_gen=4, gran=0.12, akis=0.15, tohum=tohum,
           maske_fn=maske_fn)


def tepe_sirasi(t: Tuval, M, x0, x1, taban, yuk, renk_, yog=0.45, tohum=5, dalga_sayi=2.0, maske_fn=None,
                alt=None):
    rng = np.random.default_rng(tohum)
    n = 40
    xs = np.linspace(x0, x1, n)
    f1, f2 = rng.uniform(0, 6.28, 2)
    ys = taban - yuk * (0.55 + 0.3 * np.sin(xs / (x1 - x0) * math.pi * dalga_sayi + f1)
                        + 0.15 * np.sin(xs / (x1 - x0) * math.pi * dalga_sayi * 2.3 + f2))
    alt = taban + 30 if alt is None else alt
    pts = [(x0, alt)] + list(zip(xs, ys)) + [(x1, alt)]
    p = yol_egri(pts, kapali=True, gerilim=0.5)
    t.lavi(p, M, renk_, yog=yog, kenar=1.8, dalga=0.14, islak=0.55, islak_gen=6, gran=0.12, akis=0.14, tohum=tohum,
           maske_fn=maske_fn)


# ---------------------------------------------------------------------------------------------------------------
# bitkiler
# ---------------------------------------------------------------------------------------------------------------
def yaprak_yolu(x, y, uzunluk, gen, aci, kivrim=0.0):
    """Sivri uçlu yaprak (taban x,y)."""
    a = math.radians(aci)
    ux, uy = math.cos(a), math.sin(a)
    nx, ny = -uy, ux
    pts = []
    n = 9
    for i in range(n + 1):
        u = i / n
        w = gen * math.sin(u * math.pi) ** 0.85 * (1 - 0.25 * u)
        k = kivrim * math.sin(u * math.pi) * uzunluk
        px = x + ux * uzunluk * u + nx * k
        py = y + uy * uzunluk * u + ny * k
        pts.append((px + nx * w, py + ny * w))
    for i in range(n - 1, 0, -1):
        u = i / n
        w = gen * math.sin(u * math.pi) ** 0.85 * (1 - 0.25 * u)
        k = kivrim * math.sin(u * math.pi) * uzunluk
        px = x + ux * uzunluk * u + nx * k
        py = y + uy * uzunluk * u + ny * k
        pts.append((px - nx * w, py - ny * w))
    return yol_egri(pts, kapali=True, gerilim=0.45)


def okaliptus_dali(t: Tuval, M, x, y, uzunluk, aci=-90, kivrim=0.15, tohum=0, buyume=1.0, sallanma=0.0,
                   renk_=None, yog=0.36, tomurcuk=True):
    """Yuvarlak yapraklı okaliptüs dalı. buyume 0..1 dalın ne kadarının görünür olduğu."""
    rng = np.random.default_rng(tohum)
    renk_ = renk_ or '#9CB9AE'
    n = 18
    a0 = math.radians(aci + sallanma)
    pts = []
    for i in range(n + 1):
        u = i / n * buyume
        bend = kivrim * math.sin(u * math.pi * 0.9) + sallanma * 0.004 * u * u
        a = a0 + bend
        if i == 0:
            px, py = x, y
        else:
            px += math.cos(a) * uzunluk / n * buyume
            py += math.sin(a) * uzunluk / n * buyume
        pts.append((px, py))
    sap = yol_serit(pts, np.linspace(2.4, 0.9, len(pts)))
    t.lavi(sap, M, '#6F7E68', yog=0.55, kenar=0.8, dalga=0.05, islak=0.3, islak_gen=2, gran=0.15, akis=0.1,
           tohum=tohum)
    # yapraklar çift çift
    yollar_a, yollar_b = [], []
    for i in range(2, n + 1, 2):
        u = i / n
        if u > buyume + 1e-6:
            break
        px, py = pts[i]
        r = (13 + 6 * math.sin(u * math.pi)) * (1 - 0.35 * u) * (uzunluk / 260)
        bx, by = pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]
        L = math.hypot(bx, by) + 1e-6
        nx, ny = -by / L, bx / L
        ofs = r * 0.95
        s1 = 1.0 if (i // 2) % 2 == 0 else 0.92
        yollar_a.append(yol_elips(px + nx * ofs, py + ny * ofs, r * s1, r * 0.92 * s1, rng.uniform(0, 180)))
        yollar_b.append(yol_elips(px - nx * ofs, py - ny * ofs, r * 0.96, r * 0.9, rng.uniform(0, 180)))
    for j, (ya, yb) in enumerate(zip(yollar_a, yollar_b)):
        t.lavi(ya, M, renk_, yog=yog * rng.uniform(0.85, 1.1), kenar=1.2, dalga=0.08, islak=0.75, islak_gen=3,
               gran=0.08, akis=0.16, tohum=tohum * 7 + j)
        t.lavi(yb, M, renk_, yog=yog * rng.uniform(0.8, 1.05), kenar=1.2, dalga=0.08, islak=0.75, islak_gen=3,
               gran=0.08, akis=0.16, tohum=tohum * 7 + j + 50)
    if tomurcuk and buyume > 0.95:
        px, py = pts[-1]
        t.lavi(yol_elips(px, py - 6, 5.5, 8.5), M, P['gul'], yog=0.45, kenar=1.0, islak=0.6, tohum=tohum + 3)
    return pts


def _tac_yapragi(cx, cy, r_ic, r_dis, a_merkez, a_gen, tohum, kaselik=0.0, n=16, tirtik=0.05):
    """Yelpaze biçimli bir taç yaprağı (kutupsal): dış kenarı yuvarlak ve hafif tırtıklı."""
    rng = np.random.default_rng(tohum)
    f1 = rng.uniform(0, 6.28)
    pts = []
    for i in range(n + 1):
        u = i / n
        a = a_merkez - a_gen / 2 + a_gen * u
        bulge = math.sin(u * math.pi) ** 0.55
        rr = r_ic + (r_dis - r_ic) * (0.50 + 0.50 * bulge) * (1 + tirtik * math.sin(u * 11 + f1))
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr * (1 - kaselik)))
    for i in range(n, -1, -1):
        u = i / n
        a = a_merkez - a_gen / 2 * 0.55 + a_gen * 0.55 * u
        pts.append((cx + math.cos(a) * r_ic, cy + math.sin(a) * r_ic * (1 - kaselik)))
    return yol_egri(pts, kapali=True, gerilim=0.42)


CICEK_RENK = {
    # (dış halka, orta halka, iç kâse, en iç, göbek)
    'allik': ('#F1D6D3', '#EDB9BA', '#E58E96', '#D2667A', '#EDC27E'),
    'seftali': ('#F5DDCF', '#F2C3AA', '#EA9D80', '#DA7E66', '#EDC27E'),
    'beyaz': ('#F2E6E2', '#EED7D4', '#E9B8B9', '#DE8F98', '#EDC98A'),
    'gul': ('#EFC3C5', '#E79AA2', '#D96E7E', '#C24F66', '#E9B76E'),
}


def cicek_siluet(x, y, r, egim=0.35, aci=0.0, acilma=1.0):
    R = r * (0.35 + 0.65 * max(0.0, min(1.0, acilma)))
    return yol_elips(x, y, R * 1.02, R * 1.02 * (1.0 - egim * 0.55), aci)


def sakayik(t: Tuval, M, x, y, r, renk_='allik', tohum=0, acilma=1.0, yog=1.0, egim=0.35, aci=0.0,
            sakla_sonra=True):
    """Önden arkaya boyanan şakayık/gül: her halka bitince saklamaya yazılır; arkadaki yapraklar öndekilerin
    altından geçer gibi yalnız dışarıda kalır (renkler çamurlaşmaz). acilma: 0 tomurcuk .. 1 tam açık."""
    rng = np.random.default_rng(tohum)
    dis, orta, kase, ic, gobek = CICEK_RENK[renk_]
    Mloc = M_bilesik(M, M_oteleme(x, y), M_donme(aci), M_olcek(1.0, 1.0 - egim * 0.55))
    ac = max(0.0, min(1.0, acilma))
    R = r * (0.35 + 0.65 * ac)
    if R < 1.5:
        return
    k_kenar = 0.9
    # 1) göbek
    t.lavi(yol_daire(0, -R * 0.02, R * 0.12), Mloc, gobek, yog=0.5 * yog, kenar=1.2, dalga=0.25, islak=0.5,
           islak_gen=2, tohum=tohum + 9)
    t.sakla_ekle(yol_daire(0, -R * 0.02, R * 0.12), Mloc)
    # 2) öndeki kâse yaprakları (alt yarı), açık renk, ışıklı
    on = []
    for j in range(3):
        am = math.pi / 2 + (j - 1) * 0.9 + rng.uniform(-0.1, 0.1)
        on.append(_tac_yapragi(0, R * 0.04, R * 0.10, R * rng.uniform(0.50, 0.62) * (0.7 + 0.3 * ac), am,
                               1.25, tohum * 17 + j, kaselik=0.25))
    for j, yol in enumerate(on):
        t.lavi(yol, Mloc, orta, yog=0.42 * yog, kenar=k_kenar, dalga=0.05, islak=1.1, islak_gen=2.4, gran=0.06,
               akis=0.18, tohum=tohum * 41 + j)
    for yol in on:
        t.sakla_ekle(yol, Mloc, yumusak=0.6)
    # 3) iç kâse: derin renk
    faz = rng.uniform(0, 2 * math.pi)
    halka = []
    for j in range(5):
        am = faz + j * 2 * math.pi / 5 + rng.uniform(-0.2, 0.2)
        halka.append(_tac_yapragi(0, 0, R * 0.05, R * rng.uniform(0.40, 0.48), am, 1.7, tohum * 13 + j))
    for j, yol in enumerate(halka):
        t.lavi(yol, Mloc, ic if j % 2 else kase, yog=0.40 * yog, kenar=k_kenar, dalga=0.05, islak=1.0,
               islak_gen=2.4, gran=0.06, akis=0.22, tohum=tohum * 31 + j)
    for yol in halka:
        t.sakla_ekle(yol, Mloc, yumusak=0.6)
    if ac < 0.2:
        return
    # 4) orta halka
    faz = rng.uniform(0, 2 * math.pi)
    halka = []
    for j in range(6):
        am = faz + j * 2 * math.pi / 6 + rng.uniform(-0.15, 0.15)
        halka.append(_tac_yapragi(0, 0, R * 0.12, R * rng.uniform(0.70, 0.80), am, 1.35, tohum * 19 + j))
    for j, yol in enumerate(halka):
        t.lavi(yol, Mloc, orta, yog=0.36 * yog, kenar=k_kenar, dalga=0.05, islak=1.15, islak_gen=2.6, gran=0.06,
               akis=0.2, tohum=tohum * 37 + j)
    for yol in halka:
        t.sakla_ekle(yol, Mloc, yumusak=0.6)
    if ac < 0.45:
        return
    # 5) dış halka: en açık, en saydam
    faz = rng.uniform(0, 2 * math.pi)
    halka = []
    for j in range(7):
        am = faz + j * 2 * math.pi / 7 + rng.uniform(-0.15, 0.15)
        halka.append(_tac_yapragi(0, 0, R * 0.25, R * rng.uniform(0.92, 1.02) * (0.6 + 0.4 * ac), am, 1.15,
                                  tohum * 23 + j))
    for j, yol in enumerate(halka):
        t.lavi(yol, Mloc, dis, yog=0.40 * yog, kenar=k_kenar, dalga=0.05, islak=1.25, islak_gen=2.6, gran=0.06,
               akis=0.2, tohum=tohum * 43 + j)
    if sakla_sonra:
        t.sakla_ekle(halka, Mloc, yumusak=0.7)


def yaprak_kumesi(t: Tuval, M, x, y, olcek=1.0, tohum=0, renk_='#5E8C6A', yog=0.5, n=5, aci0=-90, yayilma=110,
                  buyume=1.0):
    rng = np.random.default_rng(tohum)
    for i in range(n):
        a = aci0 - yayilma / 2 + yayilma * (i + 0.5) / n + rng.uniform(-8, 8)
        L = rng.uniform(60, 95) * olcek * buyume
        yol = yaprak_yolu(x, y, L, L * 0.22, a, kivrim=rng.uniform(-0.12, 0.12))
        t.lavi(yol, M, renk_, yog=yog * rng.uniform(0.8, 1.15), kenar=1.1, dalga=0.07, islak=0.8, islak_gen=3,
               gran=0.08, akis=0.16, tohum=tohum * 11 + i)
        # orta damar: açık bırakılmış ince çizgi hissi için ikinci sır yarım yaprak
        a_r = math.radians(a)
        nx, ny = -math.sin(a_r), math.cos(a_r)
        yol2 = yaprak_yolu(x + nx * 1.5, y + ny * 1.5, L * 0.96, L * 0.1, a, kivrim=0)
        t.lavi(yol2, M, renk_, yog=yog * 0.35, kenar=0.9, dalga=0.05, islak=0.6, islak_gen=2, gran=0.2, akis=0.2,
               tohum=tohum * 11 + i + 99)
