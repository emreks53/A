"""Bütün video: suluboya sahneleri (0–27,6 sn) + gerçekçi kapanış (27,6–34 sn).

kare(V)      -> suluboya ham geçirgenlik/renk tamponu (son işlemsiz)
kare_son(V)  -> uint8 RGB son kare (son işlem + mana altyazıları; kapanışta plaka + kaynak yazısı)

Dünya düzeni (bahçe): taban kamera Kamera(540, 960, 1). Ufuk y≈1150. Adam (660, 1400) sola bakar; fidan/ağaç
(450, 1415). Mana altyazıları ekranda y=1500'de; kompozisyonlar orta-alt bandı sakin bırakır.
"""
from __future__ import annotations

import math

import numpy as np

import motor as mt
from motor import (Tuval, Kamera, M_bilesik, M_oteleme, M_olcek, M_donme, M_yerlestir, yol_dikdortgen, yol_egri,
                   yol_daire, yol_elips, ilerle, e_io, e_io5, e_out, e_in, e_back, e_yay, sstep, lerp, W, H,
                   acilma_radyal, acilma_yonlu, gecis_boya, son_islem, rgb8, nokta_donustur)
import elemanlar as el
from zaman_araclari import an, anahtar, kamera_yolu, kayma, SES
import yazi
import kapanis_yazi

import insan
import doga
import mimari
import esyalar

FPS = 30
KAPANIS_BAS = 27.6
SURE = 34.0
KARE_SAYISI = int(round(SURE * FPS))

# ---------------------------------------------------------------------------------------------------------------
# önemli anlar (video zamanı)
# ---------------------------------------------------------------------------------------------------------------
T_DAR = an('dâr-ı', 0)            # 0.75  dünya yurdu
T_MEYDAN = an('meydan-ı')         # 1.57
T_HIZMET = an('dâr-ı', 1)         # 3.20
T_LEZZET = an('lezzet')           # 4.73
T_UCRET = an('ücret')             # 5.60
T_MUKAFAT = an('mükâfat')         # 6.15
T_DEGILDIR = an('değildir')       # 6.96
T_MADEM = an('Madem')             # 8.33
T_HIZMET2 = an('dâr-ı', 2)        # 8.73
T_MAHALL = an('mahall-i')         # 9.92
T_HASTA = an('hastalıklar')       # 11.70
T_MUSIBET = an('musibetler')      # 12.40
T_DINI = an('dinî')               # 13.52
T_SABIR = an('sabretmek')         # 14.94
T_O_HIZMETE = an('hizmete')       # 16.89 (o: 16.77)
T_O_UBUDIYETE = an('ubudiyete')   # 18.13
T_MUVAFIK = an('muvafık')         # 18.92
T_KUVVET = an('kuvvet')           # 20.19
T_VE_HER = an('Ve')               # 21.76
T_SAATI = an('saati')             # 22.31
T_GUN = an('gün')                 # 23.17
T_IBADET = an('ibadet')           # 23.37
T_SEKVA = an('şekva')             # 25.22
T_DEGIL = an('değil')             # 25.69
T_SUKUR = an('şükretmek')         # 26.13

# geçişler
G1 = (2.98, 3.42)    # meydan -> bahçe (soldan sağa akan lavi)
G2 = (9.80, 10.28)   # sulama -> secde + kubbe (aşağıdan yukarı)
G3 = (11.50, 12.05)  # güneşli secde -> hasta oturuş, gri gök (yukarıdan aşağı)

ADAM_X, ADAM_Y = 660.0, 1400.0
AGAC_X, AGAC_Y = 450.0, 1415.0
ADAM_OLCEK = 0.95
AGAC_OLCEK = 0.86
UFUK = 1150.0
GUNES = (735.0, 250.0)


# ---------------------------------------------------------------------------------------------------------------
# 1) kapı + meydan
# ---------------------------------------------------------------------------------------------------------------
def kapi_kamera(V):
    """Kapı katmanının kamerası: önce sabit (yavaş kayma), 0,75'ten sonra açıklığa doğru hızlanan giriş."""
    z = 1.0 + 0.02 * V
    if V > T_DAR:
        u = ilerle(V, T_DAR, 1.80, lambda x: x ** 2.2)
        z = math.exp(math.log(1.0 + 0.02 * T_DAR) + u * math.log(7.5))
    cy = lerp(1000.0, 1060.0, ilerle(V, T_DAR, 1.8))
    return Kamera(540.0, cy, z)


def meydan_kamera(V):
    """Kapının ardındaki dünya: kapıdan daha yavaş büyür (uzakta), sonra kendi içinde ağır ağır ilerler."""
    if V < 1.80:
        u = ilerle(V, T_DAR, 1.80, lambda x: x ** 2.2)
        z = math.exp(math.log(0.62) + u * math.log(1.0 / 0.62))
        return Kamera(540.0, lerp(1040.0, 990.0, u), z)
    u = ilerle(V, 1.80, 3.4, lambda x: x)
    return Kamera(540.0 + 30 * u, 990.0 - 20 * u, 1.0 + 0.07 * u)


MEYDAN_UFUK = 760
MEYDAN_YOL = [(640, 2700), (600, 2250), (560, 1990), (520, 1760), (380, 1560), (430, 1380), (610, 1250), (700, 1120), (640, 1000), (600, 900),
              (680, 800), (760, 700), (800, 610)]
MEYDAN_DERE = [(-760, 1190), (-400, 1225), (-40, 1210), (180, 1250), (420, 1236), (640, 1262), (860, 1300),
               (1120, 1290), (1450, 1270), (1800, 1300)]


def meydan_adam(V):
    """Yürüyen adam: yolun ortasından derenin basamak taşlarına ve öteye (uzaklaştıkça küçülür)."""
    u = ilerle(V, 0.4, 3.4, lambda x: x)
    yol = [(405, 1470, 0.36), (488, 1338, 0.31), (600, 1257, 0.275), (655, 1185, 0.25), (700, 1120, 0.225)]
    k = u * (len(yol) - 1)
    i = min(int(k), len(yol) - 2)
    f = k - i
    x = lerp(yol[i][0], yol[i + 1][0], f)
    y = lerp(yol[i][1], yol[i + 1][1], f)
    olc = lerp(yol[i][2], yol[i + 1][2], f)
    return x, y, olc


def ciz_meydan(t: Tuval, V, cam: Kamera):
    M = cam.M()
    Mu = cam.M(0.7)
    Muu = cam.M(0.45)
    sal = 0.18 * math.sin(V * 1.4)
    # önden arkaya: ön çimen, adam, yakın taşlar, dere, yol, orta plan, uzak ağaçlar, yokuş, çayır, tepeler, gök
    for i, (y, s_) in enumerate([(1900, 1.3), (1830, 1.15), (1700, 1.0)]):
        doga.ciz_cimen(t, M, -30, 300, y, 1.2, sal, tohum=10 + i, boy=(int(22 * s_), int(46 * s_)))
        doga.ciz_cimen(t, M, 760, 1110, y + 20, 1.2, sal, tohum=20 + i, boy=(int(22 * s_), int(46 * s_)))
    ax, ay, aol = meydan_adam(V)
    faz = (V * 1.05) % 1.0
    insan.ciz_insan(t, M @ M_yerlestir(ax, ay, aol), insan.yuruyus(faz), yon=1, isik=(-0.5, -0.8))
    doga.ciz_tas(t, M, 215, 1595, 88, tohum=1)
    doga.ciz_tas(t, M, 330, 1620, 46, tohum=2)
    doga.ciz_tas(t, M, 890, 1500, 64, tohum=3)
    doga.ciz_cimen(t, M, 140, 420, 1625, 1.0, sal, tohum=31, boy=(16, 32))
    doga.ciz_cimen(t, M, 820, 980, 1510, 1.0, sal, tohum=32, boy=(14, 28))
    doga.ciz_dere(t, M, MEYDAN_DERE, 70, zaman=V, tohum=1, daralma=0.0, taslar=0.54)
    doga.ciz_yol(t, M, MEYDAN_YOL, 300, tohum=1, daralma=0.94)
    doga.ciz_tas(t, M, 820, 1085, 40, tohum=4)
    doga.ciz_tas(t, M, 870, 1100, 24, tohum=5)
    doga.ciz_tas(t, M, 470, 985, 30, tohum=6)
    doga.ciz_tas(t, M, 560, 860, 18, tohum=7)
    doga.ciz_tas(t, M, 720, 905, 14, tohum=8)
    for i, (x0, x1, y, s_) in enumerate([(0, 300, 1420, 0.8), (720, 1080, 1400, 0.8), (40, 380, 1150, 0.6),
                                         (760, 1080, 1180, 0.6), (0, 420, 1000, 0.45), (820, 1080, 990, 0.45)]):
        doga.ciz_cimen(t, M, x0, x1, y, 1.6, sal, tohum=40 + i, boy=(int(18 * s_), int(40 * s_)))
    doga.ciz_agac(t, M @ M_yerlestir(170, 905, 0.2), 1.0, tohum=3, sallanma=0.1 + sal * 0.3)
    doga.ciz_agac(t, M @ M_yerlestir(950, 860, 0.14), 0.9, tohum=4, sallanma=0.1 + sal * 0.3)
    doga.ciz_agac(t, M @ M_yerlestir(330, 830, 0.1), 0.8, tohum=5, sallanma=0.1 + sal * 0.3)
    doga.ciz_yokus(t, M, 360, 1750, 1010, 900, 520, tohum=2)
    doga.ciz_cayir(t, M, -800, MEYDAN_UFUK - 6, 1900, 2800, tohum=1, ufuk_y=MEYDAN_UFUK)
    el.uzak_agac_sirasi(t, Muu, -400, 1500, MEYDAN_UFUK, yuk=34, renk_='#9DB3A8', yog=0.42)
    el.tepe_sirasi(t, Muu, -400, 1500, MEYDAN_UFUK - 4, 110, '#B4C3CB', yog=0.32, tohum=4)
    el.tepe_sirasi(t, Muu, -400, 1500, MEYDAN_UFUK - 30, 150, '#C6CFD8', yog=0.22, tohum=9)
    el.gok(t, cam.M(0.35), bulutlar=[(260, 300, 300, 110, 1), (820, 200, 240, 90, 2)], ufuk=0.42)


def ciz_kapi_sahnesi(V):
    t = Tuval()
    kc = kapi_kamera(V)
    Mk = kc.M() @ M_yerlestir(540, 1430, 1.0)
    ac = ilerle(V, 0.0, 0.62, e_out)
    if kc.zum < 7.0:
        mimari.ciz_kemerli_kapi(t, Mk, acilma=ac, isik=(-0.6, -0.8), tohum=1)
    # dünya: kapının içinden (kapı saklaması sayesinde yalnız açıklıkta görünür)
    dunya_ac = ilerle(V, 0.12, 0.85, e_out)
    if dunya_ac > 0:
        with t.gorunurluk(1.0, acilma_radyal(dunya_ac, 540, 1450, 1500, dalga=0.22, on=0.12, tohum=3),
                          M=np.eye(3)):
            ciz_meydan(t, V, meydan_kamera(V))
    return t


# ---------------------------------------------------------------------------------------------------------------
# 2) bahçe dünyası: durum (zamana bağlı parametreler)
# ---------------------------------------------------------------------------------------------------------------
def poz_durumu(V, evre):
    """Adamın pozu ve ek bilgileri. evre: geçişlerde 'eski'/'yeni' görüntüyü seçmek için zorlama."""
    P = insan.POZLAR
    if V < G2[1] or evre == 'sulama':
        if evre != 'secde':
            return dict(poz=P['sula'], ibrik=True, battaniye=0.0)
    if V < G3[1] or evre == 'secde':
        if evre != 'hasta':
            return dict(poz=P['secde'], ibrik=False, battaniye=0.0)
    if V < T_KUVVET:
        u = ilerle(V, T_SABIR, T_SABIR + 0.75, e_io)
        return dict(poz=insan.poz_karistir(P['oturus_hasta'], P['oturus_dik'], u), ibrik=False,
                    battaniye=1.0 - 0.0 * u)
    if V < 21.6:
        u = ilerle(V, T_KUVVET, T_KUVVET + 0.8, e_io)
        poz = insan.ayaga_kalkis(u) if hasattr(insan, 'ayaga_kalkis') else insan.poz_karistir(
            P['oturus_dik'], P['ayakta_dik'], u)
        return dict(poz=poz, ibrik=False, battaniye=1.0 - ilerle(V, T_KUVVET, T_KUVVET + 0.45, e_io))
    if V < 24.55:
        return dict(poz=P['secde'], ibrik=False, battaniye=0.0)
    if V < T_SUKUR:
        u = ilerle(V, 24.55, 25.05, e_io)
        poz = insan.secdeden_dize(u) if hasattr(insan, 'secdeden_dize') else insan.poz_karistir(
            P['secde'], P['diz_dua'], u * 0.5)
        return dict(poz=poz, ibrik=False, battaniye=0.0)
    u = ilerle(V, T_SUKUR, T_SUKUR + 0.5, e_io)
    base = insan.secdeden_dize(1.0) if hasattr(insan, 'secdeden_dize') else insan.poz_karistir(
        P['secde'], P['diz_dua'], 0.5)
    return dict(poz=insan.poz_karistir(base, P['diz_dua'], u), ibrik=False, battaniye=0.0)


def durum(V, evre=None):
    s = {}
    # hava
    s['koyuluk'] = anahtar(V, [(11.4, 0.0), (12.2, 0.75), (13.0, 1.0), (16.0, 1.0), (17.6, 0.25), (20.6, 0.15),
                               (21.9, 0.0)])
    if evre in ('sulama', 'secde'):
        s['koyuluk'] = 0.0
    s['firtina_gelis'] = anahtar(V, [(T_MUSIBET - 0.25, 0.0), (T_MUSIBET + 0.9, 1.0), (21.3, 1.0), (22.2, 0.0)])
    s['yagmur'] = anahtar(V, [(T_MUSIBET, 0.0), (T_MUSIBET + 0.6, 1.0), (16.2, 1.0), (17.8, 0.45), (20.4, 0.3),
                              (21.4, 0.0)])
    if evre in ('sulama', 'secde'):
        s['firtina_gelis'] = 0.0
        s['yagmur'] = 0.0
    s['ruzgar'] = anahtar(V, [(T_MUSIBET, 0.0), (T_MUSIBET + 0.5, 1.0), (15.6, 0.7), (17.5, 0.15), (21.0, 0.0)])
    # ağaç
    s['agac'] = anahtar(V, [(0, 0.10), (16.4, 0.10), (18.6, 0.24), (T_KUVVET - 0.05, 0.26), (T_KUVVET + 0.85, 1.0)],
                        e_io)
    s['kok'] = anahtar(V, [(T_SABIR - 0.1, 0.25), (T_SABIR + 0.9, 0.65), (T_KUVVET, 0.7), (T_KUVVET + 0.9, 1.0)])
    s['kesit'] = anahtar(V, [(T_SABIR - 0.15, 0.0), (T_SABIR + 0.55, 1.0), (T_KUVVET + 0.6, 1.0), (21.8, 0.0)])
    # çiçekler: [arka sol, arka sağ, ön sol1, ön sol2, ön sağ1, ön sağ2]
    taban = anahtar(V, [(0, 0.12), (8.0, 0.12), (9.6, 0.30), (12.0, 0.30)])
    acilmalar = []
    for i, gec in enumerate([0.0, 0.25, 0.5, 0.15, 0.4, 0.65]):
        a = taban
        a = max(a, anahtar(V, [(T_O_HIZMETE - 0.1 + gec * 0.9, a), (T_O_HIZMETE + 0.9 + gec * 0.9, 0.62)]))
        a = max(a, anahtar(V, [(T_MUVAFIK + gec * 0.55, a), (T_MUVAFIK + 0.45 + gec * 0.55, 0.85)], e_out))
        a = max(a, anahtar(V, [(T_SUKUR + gec * 0.3, a), (T_SUKUR + 0.6 + gec * 0.3, 1.0)], e_out))
        acilmalar.append(a)
    s['acilma'] = acilmalar
    s['solgunluk'] = anahtar(V, [(T_MUSIBET, 0.0), (T_MUSIBET + 0.6, 0.7), (16.5, 0.6), (18.0, 0.0)])
    # simgeler
    s['simge'] = [ilerle(V, T_LEZZET - 0.05, T_LEZZET + 0.5, e_out), ilerle(V, T_UCRET - 0.05, T_UCRET + 0.5, e_out),
                  ilerle(V, T_MUKAFAT - 0.05, T_MUKAFAT + 0.5, e_out)]
    s['simge_kaldir'] = ilerle(V, T_DEGILDIR - 0.05, T_DEGILDIR + 0.8, e_io)
    # kubbe, seccade
    s['kubbe'] = 0.0 if (evre == 'sulama') else ilerle(V, T_MAHALL - 0.05, T_MAHALL + 0.9, e_out)
    # kalp nuru
    s['nur'] = anahtar(V, [(T_DINI - 0.05, 0.0), (T_DINI + 0.45, 1.0), (T_KUVVET, 1.0), (21.2, 0.0)])
    s['nur_isin'] = anahtar(V, [(T_O_UBUDIYETE - 0.25, 0.0), (T_O_UBUDIYETE + 0.6, 1.0), (T_KUVVET + 0.3, 1.0),
                                (21.3, 0.0)])
    # saat
    s['saat'] = anahtar(V, [(21.85, 0.0), (22.25, 1.0)])
    s['dilim'] = ilerle(V, T_SAATI - 0.02, T_SAATI + 0.42, e_io)
    s['gun'] = ilerle(V, T_GUN - 0.12, T_GUN + 0.75, e_io)
    s['gunes'] = anahtar(V, [(21.0, 0.0), (21.9, 1.0)])
    # şikâyet bulutu
    s['sikayet'] = ilerle(V, T_SEKVA - 0.02, T_SEKVA + 0.42, e_out)
    s['sikayet_kaldir'] = ilerle(V, T_DEGIL - 0.03, T_DEGIL + 0.5, e_io)
    s['sukur'] = ilerle(V, T_SUKUR, T_SUKUR + 0.8, e_out)
    s.update(poz_durumu(V, evre))
    return s


# ---------------------------------------------------------------------------------------------------------------
# bahçe kamerası
# ---------------------------------------------------------------------------------------------------------------
def bahce_kamera(V):
    K = Kamera
    kareler = [
        (3.00, K(470, 960, 1.06)),
        (4.40, K(540, 940, 1.0)),
        (7.80, K(540, 900, 0.98)),
        (8.70, K(575, 1170, 1.42)),
        (9.85, K(585, 1180, 1.48)),
        (10.0, K(540, 905, 0.94)),
        (11.5, K(545, 915, 0.97)),
        (12.0, K(540, 960, 1.0)),
        (13.3, K(540, 950, 1.02)),
        (14.10, K(0, 0, 2.3)),   # kalbe yaklaş (konum aşağıda doldurulur)
        (14.85, K(0, 0, 2.38)),
        (15.75, K(520, 1230, 0.86)),
        (17.0, K(530, 1150, 0.92)),
        (20.15, K(540, 1100, 0.96)),
        (21.05, K(540, 820, 0.76)),
        (21.75, K(560, 760, 0.80)),
        (22.35, K(GUNES[0] - 20, GUNES[1] + 170, 1.22)),
        (23.25, K(GUNES[0] - 30, GUNES[1] + 150, 1.26)),
        (24.05, K(545, 880, 0.88)),
        (24.9, K(560, 1000, 1.02)),
        (26.1, K(560, 1010, 1.06)),
    ]
    # kalp konumu (oturan adamın göğsü) — insan modülünden
    kx, ky = kalp_dunya()
    kareler[9] = (14.10, K(kx + 10, ky + 40, 2.3))
    kareler[10] = (14.85, K(kx + 10, ky + 40, 2.38))
    c = kamera_yolu(V, kareler)
    dx, dy, zz = kayma(V, sal=2.2)
    return Kamera(c.x + dx, c.y + dy, c.zum * zz)


_KALP = None


def kalp_dunya():
    global _KALP
    if _KALP is None:
        t = Tuval()
        M = M_yerlestir(ADAM_X, ADAM_Y, ADAM_OLCEK)
        bilgi = insan.ciz_insan(t, M, insan.POZLAR['oturus_hasta'], yon=-1, battaniye=1.0, sakla_sonra=False)
        _KALP = bilgi['kalp']
    return _KALP


# ---------------------------------------------------------------------------------------------------------------
# bahçe çizimi (önden arkaya)
# ---------------------------------------------------------------------------------------------------------------
CICEKLER = [  # x, y, boy, renk
    (215, 1440, 230, 'allik'), (930, 1450, 240, 'seftali'),
    (95, 1700, 330, 'beyaz'), (300, 1835, 300, 'allik'), (850, 1800, 320, 'gul'), (1010, 1660, 300, 'beyaz'),
]


def ciz_bahce(V, cam: Kamera, evre=None, kapi_icinde=False):
    s = durum(V, evre)
    t = Tuval()
    M = cam.M()
    Mu = cam.M(0.55)
    Muu = cam.M(0.3)
    sal = math.sin(V * 1.7) * 0.25 + s['ruzgar'] * (0.6 + 0.4 * math.sin(V * 5.3))

    # --- en önde: simgeler (lezzet, ücret, mükâfat) ---
    ciz_simgeler(t, V, s, cam)

    # --- efektler (saklamasız) ---
    if s['yagmur'] > 0.01:
        kor = None
        if s['nur'] > 0.05:
            kx, ky = kalp_dunya()
            kor = (kx, ky, 75 * s['nur'])
        doga.ciz_yagmur(t, M, V, s['yagmur'], alan=(-300, -400, 1400, 2300), ruzgar=-0.25 * s['ruzgar'], tohum=5,
                        zemin_y=ADAM_Y + 20, korunan=kor)
    if s['sukur'] > 0:
        doga.ciz_ucusan_yapraklar(t, M, V, int(14 * s['sukur']), (0, 300, 1080, 1700), 0.3, 9, tur='tac')
    if s['sikayet'] > 0 and s['sikayet_kaldir'] < 1:
        bas = adam_capasi(V, s, 'bas_ust', M)
        Mb = M_bilesik(M_oteleme(bas[0], bas[1] - 150 * cam.zum), M_olcek(cam.zum))
        esyalar.ciz_sikayet_bulutu(t, Mb, olcek=1.0, olusum=s['sikayet'], kaldirma=s['sikayet_kaldir'], zaman=V,
                                   tohum=4)

    # --- ön sıra çiçekler ---
    for i in (2, 3, 4, 5):
        x, y, b, r = CICEKLER[i]
        doga.ciz_cicek_fidani(t, M, x, y, b, renk_=r, acilma=s['acilma'][i], sallanma=sal,
                              solgunluk=s['solgunluk'], tohum=10 + i)

    # --- toprak kesiti ve kökler (sabır) ---
    if s['kesit'] > 0.01:
        with t.gorunurluk(1.0, acilma_radyal(s['kesit'], AGAC_X, AGAC_Y + 40, 800, dalga=0.2, tohum=7), M=M):
            Ma = M @ M_yerlestir(AGAC_X, AGAC_Y, AGAC_OLCEK)
            doga.ciz_kokler(t, Ma, s['agac'], derinlik=s['kok'], tohum=2)
            doga.ciz_toprak_kesiti(t, M, -400, 1500, AGAC_Y + 25, 2600, tohum=3)

    # --- adam (ve elindeki ibrik) ---
    ciz_adam(t, V, s, M)

    # --- ağaç ---
    Ma = M @ M_yerlestir(AGAC_X, AGAC_Y, AGAC_OLCEK)
    doga.ciz_agac(t, Ma, s['agac'], sallanma=sal * 0.6, tohum=1, damla=s['yagmur'])

    # --- arka sıra çiçekler, tarh ---
    for i in (0, 1):
        x, y, b, r = CICEKLER[i]
        doga.ciz_cicek_fidani(t, M, x, y, b, renk_=r, acilma=s['acilma'][i], sallanma=sal,
                              solgunluk=s['solgunluk'], tohum=10 + i)
    doga.ciz_cimen(t, M, -300, 1400, 1460, 0.7, sal, tohum=3)
    doga.ciz_tarh(t, M, 60, 1020, 1455, tohum=4)

    # --- zemin ---
    zemin_renk = el.karistir('#E2D5BC', '#B9B2B8', 0.55 * s['koyuluk'])
    t.lavi(yol_dikdortgen(-2000, UFUK - 6, 3000, 4000), M, zemin_renk, yog=0.5, kenar=2.0, dalga=0.14, islak=0.4,
           islak_gen=9, gran=0.12, akis=0.15, tohum=12)

    # --- uzak: kubbe, ağaç sırası, tepeler ---
    if s['kubbe'] > 0.01:
        Mk = Mu @ M_yerlestir(830, UFUK + 4, 0.36)
        with t.gorunurluk(1.0, acilma_radyal(s['kubbe'], 0, -300, 900, dalga=0.2, tohum=11), M=Mk):
            mimari.ciz_kubbe_cami(t, Mk, nur=0.5 * s['kubbe'], tohum=2)
    el.uzak_agac_sirasi(t, Mu, -900, 2000, UFUK + 4, yuk=46, renk_=el.karistir('#A5B8B0', '#8F8DA3',
                                                                               s['koyuluk'] * 0.6), yog=0.42,
                        tohum=13)
    el.tepe_sirasi(t, Muu, -1500, 2600, UFUK - 10, 120, el.karistir('#BCC8CE', '#9C98B0', s['koyuluk'] * 0.6),
                   yog=0.32, tohum=14, dalga_sayi=2.5)

    # --- gök ---
    ciz_gok_bahce(t, V, s, cam)
    return t, s


def adam_capasi(V, s, ad, M):
    t = Tuval()
    Madam = M @ M_yerlestir(ADAM_X, ADAM_Y, ADAM_OLCEK)
    bilgi = insan.ciz_insan(t, Madam, s['poz'], yon=-1, battaniye=s['battaniye'], sakla_sonra=False)
    return bilgi[ad]


def ciz_adam(t, V, s, M):
    Madam = M @ M_yerlestir(ADAM_X, ADAM_Y, ADAM_OLCEK)
    elde = None
    if s['ibrik']:
        debi = 1.0

        def elde(tt, Mel):
            esyalar.ciz_ibrik(tt, Mel, egim=38.0 + 4 * math.sin(V * 2.1), tohum=1)
    bilgi = insan.ciz_insan(t, Madam, s['poz'], yon=-1, isik=(-0.6, -0.8), battaniye=s['battaniye'],
                            elde=elde, nefes=(V * 0.25) % 1.0)
    # kalp nuru
    if s['nur'] > 0.01:
        kx, ky = bilgi['kalp']
        Mn = M_bilesik(M_oteleme(kx, ky), M_olcek(M[0, 0] * ADAM_OLCEK))
        esyalar.ciz_kalp_nuru(t, Mn, 26, parlaklik=s['nur'], isin=s['nur_isin'], zaman=V)
    return bilgi


def ciz_gok_bahce(t, V, s, cam):
    k = s['koyuluk']
    Mg = cam.M(0.35)
    # fırtına bulutları (önce: gök onların arkasında)
    if s['firtina_gelis'] > 0.01:
        g = s['firtina_gelis']
        for i, (cx, cy, gw, gh) in enumerate([(160, 330, 760, 330), (900, 260, 820, 360), (520, 120, 900, 300)]):
            kay = (1 - g) * (-700 if cx < 540 else 700)
            doga.ciz_firtina_bulutu(t, Mg, cx + kay, cy, gw, gh, koyuluk=max(0.0, k), gelis=g, tohum=20 + i)
    # güneş ve saat
    if s['gunes'] > 0.01:
        Ms = cam.M(1.0) @ M_yerlestir(GUNES[0], GUNES[1], 1.0)
        with t.gorunurluk(s['gunes']):
            esyalar.ciz_saat(t, Ms, 120, dilim=s['dilim'], gun=s['gun'], gorunurluk=s['saat'], tohum=1)
    ust = el.karistir('#5F8DC2', '#6F6C8C', k)
    orta = el.karistir('#8FB2D6', '#8A87A2', k)
    alt = el.karistir('#EDD9CC', '#B4AEBE', k)
    bulut_al = 1.0 - k
    bulutlar = [(200, 300, 300, 100, 41), (850, 470, 240, 85, 42)] if bulut_al > 0.3 else []
    el.gok(t, Mg, bulutlar=bulutlar, ust=ust, orta=orta, alt=alt, ufuk=0.62, alt_yog=0.32, yog=0.85)


# ---------------------------------------------------------------------------------------------------------------
# kapı içinde bahçe (son geri çekiliş)
# ---------------------------------------------------------------------------------------------------------------
def son_kapi_zum(V):
    u = ilerle(V, 26.25, 27.35, lambda x: e_io(x))
    return math.exp(math.log(7.5) * (1 - u))


def ciz_son(V):
    """Şükür ve kapıdan geri çekiliş."""
    zk = son_kapi_zum(V)
    cam = bahce_kamera(V)
    if zk < 7.4:
        # bahçe kamerası da uzaklaşır (parallax: daha az)
        u = ilerle(V, 26.25, 27.35, e_io)
        cam = Kamera(lerp(cam.x, 560, u), lerp(cam.y, 960, u), cam.zum * lerp(1.0, 0.6, u))
        t = Tuval()
        kc = Kamera(540.0, 1060.0, zk)
        Mk = kc.M() @ M_yerlestir(540, 1430, 1.0)
        mimari.ciz_kemerli_kapi(t, Mk, acilma=1.0, isik=(-0.6, -0.8), tohum=1)
        tb, _ = ciz_bahce(V, cam)
        # kapı saklamasıyla bahçeyi birleştir: kapının çizdiği alan dışında bahçe görünür
        sak = t.saklama if t.saklama is not None else np.zeros((H, W), np.float32)
        maske = (1.0 - sak)[..., None]
        R = t.R * (1 - maske) + tb.R * maske
        out = Tuval()
        out.R = R
        return out
    tb, _ = ciz_bahce(V, cam)
    return tb


# ---------------------------------------------------------------------------------------------------------------
# simgeler (lezzet, ücret, mükâfat)
# ---------------------------------------------------------------------------------------------------------------
def ciz_simgeler(t, V, s, cam):
    if max(s['simge']) <= 0 or s['simge_kaldir'] >= 1:
        return
    M = cam.M()
    xs = [250, 540, 830]
    fonk = [esyalar.ciz_meyve_tabagi, esyalar.ciz_kese, esyalar.ciz_madalya]
    kal = s['simge_kaldir']
    for i in range(3):
        p = s['simge'][i]
        if p <= 0:
            continue
        sc = e_back(min(1.0, p * 1.15), 1.4) if p < 1 else 1.0
        yuk = -kal * 220 * (0.8 + 0.2 * i)
        alfa = 1.0 - e_in(kal)
        Ms = M @ M_yerlestir(xs[i], 520 + yuk + math.sin(V * 1.6 + i) * 6, 0.9 * (0.6 + 0.4 * sc))
        with t.gorunurluk(alfa):
            fonk[i](t, Ms, olcek=1.0, tohum=i + 1)
            esyalar.ciz_simge_halkasi(t, Ms, 150, '#F1E3D3', ilerleme=p, tohum=i + 5)


# ---------------------------------------------------------------------------------------------------------------
# kare dağıtımı
# ---------------------------------------------------------------------------------------------------------------
def _bahce_tuval(V, evre=None):
    cam = bahce_kamera(V)
    if V >= 26.25:
        return ciz_son(V)
    t, s = ciz_bahce(V, cam, evre)
    return t


def kare(V):
    if V < G1[0]:
        return ciz_kapi_sahnesi(V).R
    if V < G1[1]:
        a = ciz_kapi_sahnesi(V).R
        b = _bahce_tuval(V, 'sulama').R
        return gecis_boya(a, b, ilerle(V, *G1, e_io), yon=(1.0, 0.25), tohum=1)
    if V < G2[0]:
        return _bahce_tuval(V, 'sulama').R
    if V < G2[1]:
        a = _bahce_tuval(V, 'sulama').R
        b = _bahce_tuval(V, 'secde').R
        return gecis_boya(a, b, ilerle(V, *G2, e_io), yon=(0.0, -1.0), tohum=2)
    if V < G3[0]:
        return _bahce_tuval(V, 'secde').R
    if V < G3[1]:
        a = _bahce_tuval(V, 'secde').R
        b = _bahce_tuval(V, 'hasta').R
        return gecis_boya(a, b, ilerle(V, *G3, e_io), yon=(0.0, 1.0), tohum=3, dalga=0.14)
    return _bahce_tuval(V).R


def kare_son(V):
    if V >= KAPANIS_BAS:
        R = kapanis_yazi.kapanis_kare(V - KAPANIS_BAS)
        # suluboyadan gerçeğe: sıcak beyaz ışıktan açılış
        u = ilerle(V, KAPANIS_BAS, KAPANIS_BAS + 0.6, e_out)
        if u < 1:
            beyaz = np.array([0.985, 0.972, 0.95], np.float32)
            R = R * u + beyaz * (1 - u)
        return rgb8(R)
    R = son_islem(kare(V))
    # kapı ışığı -> beyaz
    if V > 27.2:
        u = ilerle(V, 27.2, KAPANIS_BAS, e_in)
        beyaz = np.array([0.985, 0.972, 0.95], np.float32)
        R = R * (1 - u) + beyaz * u
    if V < 0.25:
        pass
    yazi.manalari_ciz(R, V)
    return rgb8(R)
