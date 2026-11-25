"""Bütün video: suluboya sahneleri (0–27,6 sn) + gerçekçi kapanış (27,6–34 sn).

kare(V)      -> suluboya ham tampon (son işlemsiz)
kare_son(V)  -> uint8 RGB son kare (son işlem, hareket bulanıklığı, mana altyazıları; kapanışta plaka + kaynak yazısı)

Dünya düzeni (bahçe): taban kamera Kamera(540, 960, 1). Ufuk y=1150. Fidan/ağaç (450, 1415). Sulamada adam fidanın
sağında sola bakar; secde ve şükürde ağacın sağında, uzaktaki yeşil kubbeye (sağda) dönük; hastalıkta da sağa bakar.
Mana altyazıları ekranda y=1500'de.
"""
from __future__ import annotations

import inspect
import math

import numpy as np

import motor as mt
from motor import (Tuval, Kamera, M_bilesik, M_oteleme, M_olcek, M_yerlestir, yol_dikdortgen, yol_egri,
                   yol_daire, yol_elips, ilerle, e_io, e_out, e_in, e_back, e_ss, sstep, lerp, W, H, smoothstep,
                   acilma_radyal, acilma_yonlu, gecis_boya, son_islem, rgb8, nokta_donustur)
import elemanlar as el
from zaman_araclari import an, anahtar, kamera_akis, kayma, SES
import yazi
import kapanis_yazi

import insan
import doga
import mimari
import esyalar

FPS = 30
KAPANIS_BAS = 27.6      # gerçek plakanın zamanı buradan sayılır
GERCEGE_GECIS = (27.22, 27.98)  # suluboyadan gerçeğe ıslak lavi geçişi
SURE = 34.0
KARE_SAYISI = int(round(SURE * FPS))


def _k(f, *a, **kw):
    """Yalnız fonksiyonun tanıdığı anahtar sözcüklerle çağırır (modüller güncellenirken geriye uyum)."""
    try:
        imza = inspect.signature(f).parameters
        if not any(p.kind == p.VAR_KEYWORD for p in imza.values()):
            kw = {k: v for k, v in kw.items() if k in imza}
    except (TypeError, ValueError):
        pass
    return f(*a, **kw)


# ---------------------------------------------------------------------------------------------------------------
# önemli anlar (video zamanı)
# ---------------------------------------------------------------------------------------------------------------
T_DAR = an('dâr-ı', 0)            # 0.75
T_MEYDAN = an('meydan-ı')         # 1.57
T_IMTIHAN = an('imtihandır')      # 2.08
T_HIZMET = an('dâr-ı', 1)         # 3.20
T_LEZZET = an('lezzet')           # 4.73
T_UCRET = an('ücret')             # 5.60
T_MUKAFAT = an('mükâfat')         # 6.15
T_DEGILDIR = an('değildir')       # 6.96
T_MADEM = an('Madem')             # 8.33
T_HIZMET2 = an('dâr-ı', 2)        # 8.73
T_VE_MAHALL = an('ve', 4)         # 9.80
T_MAHALL = an('mahall-i')         # 9.92
T_UBUDIYET = an('ubudiyettir')    # 10.38
T_HASTA = an('hastalıklar')       # 11.70
T_MUSIBET = an('musibetler')      # 12.40
T_DINI = an('dinî')               # 13.52
T_SABIR = an('sabretmek')         # 14.94
T_O = an('o', 0)                  # 16.77
T_O_HIZMETE = an('hizmete')       # 16.89
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
G1 = (2.92, 3.56)        # meydan -> bahçe (soldan sağa akan geniş ıslak lavi)
G2_KOPRU = 9.97          # gök köprüsü: kamera tam göğe baktığı an dünya 'sulama'dan 'secde'ye geçer
G3 = (11.52, 12.32)      # secde -> hastalık (gri lavi yukarıdan akar)
SON_CEKILIS = (26.62, 27.42)  # kapıdan geri çekiliş

AGAC_X, AGAC_Y = 450.0, 1415.0
ADAM_Y = 1400.0
SULA_X = 690.0           # sulama (yon -1)
SECDE_X = 635.0          # secde, diz, dua (yon +1): kalça kökeni; alın ~+295
OTUR_X = 735.0           # hastalık (yon +1)
ADAM_OLCEK = 0.95
AGAC_OLCEK = 0.86
UFUK = 1150.0
GUNES = (735.0, 250.0)
KUBBE = (890.0, 0.44)    # uzak yeşil kubbe: x, ölçek
IBRIK_YER = (330.0, 1430.0)  # sulamadan sonra ibrik yerde (fidanın solunda)


# ---------------------------------------------------------------------------------------------------------------
# 1) kapı + meydan
# ---------------------------------------------------------------------------------------------------------------
KAPI_ZUM_SON = 11.0


def kapi_kamera(V):
    """Kapı katmanı: boyanırken sabit, 0,75'ten sonra açıklığa doğru hızlanan giriş (kapı kadrajdan tam çıkar)."""
    z = 1.0 + 0.015 * V
    if V > T_DAR:
        u = ilerle(V, T_DAR, 1.66, lambda x: x ** 2.0)
        z = math.exp(math.log(1.0 + 0.015 * T_DAR) + u * math.log(KAPI_ZUM_SON))
    cy = lerp(1000.0, 1050.0, ilerle(V, T_DAR, 1.66))
    return Kamera(540.0, cy, z)


MEYDAN_UFUK = 760
MEYDAN_YOL = [(640, 2700), (600, 2250), (560, 1990), (520, 1760), (380, 1560), (430, 1380), (610, 1250), (700, 1120),
              (640, 1000), (600, 900), (680, 800), (760, 700), (800, 610)]
MEYDAN_DERE = [(-760, 1190), (-400, 1225), (-40, 1210), (180, 1250), (420, 1236), (640, 1262), (860, 1300),
               (1120, 1290), (1450, 1270), (1800, 1300)]
_MEYDAN_YOL_ADAM = [(405, 1470, 0.36), (488, 1338, 0.31), (600, 1257, 0.275), (655, 1185, 0.25), (700, 1120, 0.225)]
_ADAM_T0, _ADAM_T1 = 0.35, 3.60


def _meydan_konum(V):
    u = ilerle(V, _ADAM_T0, _ADAM_T1, lambda x: x)
    yol = _MEYDAN_YOL_ADAM
    k = u * (len(yol) - 1)
    i = min(int(k), len(yol) - 2)
    f = k - i
    return (lerp(yol[i][0], yol[i + 1][0], f), lerp(yol[i][1], yol[i + 1][1], f), lerp(yol[i][2], yol[i + 1][2], f))


def _faz_tablosu():
    """Yürüyüş evresi yürünen yoldan: ayaklar zeminde kaymaz (YURUYUS_ADIM = 330 birim / tam döngü)."""
    adim = getattr(insan, 'YURUYUS_ADIM', 330.0)
    ts = np.linspace(_ADAM_T0 - 0.5, _ADAM_T1 + 0.5, 1201)
    faz = np.zeros_like(ts)
    for i in range(1, len(ts)):
        x0, _, s0 = _meydan_konum(ts[i - 1])
        x1, _, s1 = _meydan_konum(ts[i])
        faz[i] = faz[i - 1] + (x1 - x0) / (adim * 0.5 * (s0 + s1))
    return ts, faz


_FAZ_T, _FAZ = _faz_tablosu()


def meydan_adam(V):
    x, y, s = _meydan_konum(V)
    faz = float(np.interp(V, _FAZ_T, _FAZ)) % 1.0
    return x, y, s, faz


def _basamak_taslari():
    """Derede adamın bastığı noktalara basamak taşları: ayağın en alçak ve en yavaş olduğu anlar."""
    taslar = []
    ts = np.linspace(1.5, 2.9, 169)
    onceki = {}
    for t in ts:
        x, y, s, faz = meydan_adam(t)
        c = insan.capalar(insan.yuruyus(faz), M_yerlestir(x, y, s), yon=1)
        for ad in ('ayak_on', 'ayak_arka'):
            p = c[ad]
            if ad in onceki:
                v = math.hypot(p[0] - onceki[ad][0], p[1] - onceki[ad][1])
                if v < 0.6 and 1222 <= p[1] <= 1300:
                    if not any(math.hypot(p[0] - q[0], p[1] - q[1]) < 30 for q in taslar):
                        taslar.append((p[0] + 4, p[1] + 3, 24.0))
            onceki[ad] = p
    return taslar


try:
    BASAMAK_TASLARI = _basamak_taslari()
except Exception:
    BASAMAK_TASLARI = []


def meydan_kamera(V):
    """Kapının ardındaki dünya: kapıdan yavaş büyür (uzakta), sonra yürüyen adamı yakından izler."""
    ax, ay, _, _ = meydan_adam(min(V, 3.5))
    K = Kamera
    kareler = [
        (0.0, K(560, 1000, 0.84)), (T_DAR, K(562, 1010, 0.90)),
        (1.95, K(570, 1060, 1.12)),
        (2.75, K(ax + 30, ay - 210, 1.52)),
        (3.60, K(ax + 90, ay - 230, 1.62)),
    ]
    if V > 2.0:
        kareler[3] = (2.75, K(meydan_adam(2.75)[0] + 30, meydan_adam(2.75)[1] - 210, 1.52))
        kareler[4] = (3.60, K(meydan_adam(3.6)[0] + 90, meydan_adam(3.6)[1] - 230, 1.62))
    c = kamera_akis(V, kareler)
    dx, dy, zz = kayma(V, sal=1.6)
    return Kamera(c.x + dx, c.y + dy, c.zum * zz)


def ciz_meydan(t: Tuval, V, cam: Kamera):
    M = cam.M()
    Muu = mt.ufuk_M(cam, 0.45, MEYDAN_UFUK)
    sal = 0.18 * math.sin(V * 1.4)
    # önden arkaya
    for i, (y, s_) in enumerate([(1900, 1.3), (1830, 1.15), (1700, 1.0)]):
        _k(doga.ciz_cimen, t, M, -300, 300, y, 1.2, sal, tohum=10 + i, boy=(int(22 * s_), int(46 * s_)))
        _k(doga.ciz_cimen, t, M, 760, 1400, y + 20, 1.2, sal, tohum=20 + i, boy=(int(22 * s_), int(46 * s_)))
    ax, ay, aol, faz = meydan_adam(V)
    insan.ciz_insan(t, M @ M_yerlestir(ax, ay, aol), insan.yuruyus(faz), yon=1, isik=(-0.5, -0.8))
    doga.ciz_tas(t, M, 150, 1770, 95, tohum=1)
    doga.ciz_tas(t, M, 262, 1805, 46, tohum=2)
    doga.ciz_tas(t, M, 975, 1690, 70, tohum=3)
    doga.ciz_tas(t, M, 300, 1405, 58, tohum=9)
    _k(doga.ciz_cimen, t, M, 60, 360, 1800, 1.0, sal, tohum=31, boy=(16, 32))
    _k(doga.ciz_cimen, t, M, 880, 1100, 1700, 1.0, sal, tohum=32, boy=(14, 28))
    if BASAMAK_TASLARI:
        _k(doga.ciz_dere, t, M, MEYDAN_DERE, 70, zaman=V, tohum=1, daralma=0.0, taslar=0.54,
           tas_konumlari=BASAMAK_TASLARI)
    else:
        doga.ciz_dere(t, M, MEYDAN_DERE, 70, zaman=V, tohum=1, daralma=0.0, taslar=0.54)
    doga.ciz_yol(t, M, MEYDAN_YOL, 300, tohum=1, daralma=0.94)
    doga.ciz_tas(t, M, 820, 1085, 40, tohum=4)
    doga.ciz_tas(t, M, 870, 1100, 24, tohum=5)
    doga.ciz_tas(t, M, 470, 985, 30, tohum=6)
    doga.ciz_tas(t, M, 560, 860, 18, tohum=7)
    doga.ciz_tas(t, M, 720, 905, 14, tohum=8)
    for i, (x0, x1, y, s_) in enumerate([(-200, 300, 1420, 0.8), (720, 1300, 1400, 0.8), (-200, 380, 1150, 0.6),
                                         (760, 1300, 1180, 0.6), (-200, 420, 1000, 0.45), (820, 1300, 990, 0.45)]):
        _k(doga.ciz_cimen, t, M, x0, x1, y, 1.6, sal, tohum=40 + i, boy=(int(18 * s_), int(40 * s_)))
    doga.ciz_agac(t, M @ M_yerlestir(170, 905, 0.2), 1.0, tohum=3, sallanma=0.1 + sal * 0.3)
    doga.ciz_agac(t, M @ M_yerlestir(950, 860, 0.14), 0.9, tohum=4, sallanma=0.1 + sal * 0.3)
    doga.ciz_agac(t, M @ M_yerlestir(330, 830, 0.1), 0.8, tohum=5, sallanma=0.1 + sal * 0.3)
    doga.ciz_yokus(t, M, 360, 1750, 1010, 900, 520, tohum=2)
    doga.ciz_cayir(t, M, -800, MEYDAN_UFUK - 6, 1900, 2800, tohum=1, ufuk_y=MEYDAN_UFUK)
    el.uzak_agac_sirasi(t, Muu, -400, 1500, MEYDAN_UFUK, yuk=34, renk_='#9DB3A8', yog=0.42)
    el.tepe_sirasi(t, Muu, -400, 1500, MEYDAN_UFUK - 4, 110, '#B4C3CB', yog=0.32, tohum=4)
    el.tepe_sirasi(t, Muu, -400, 1500, MEYDAN_UFUK - 30, 150, '#C6CFD8', yog=0.22, tohum=9)
    el.gok(t, mt.ufuk_M(cam, 0.35, MEYDAN_UFUK), bulutlar=[(260 + 6 * V, 300, 300, 110, 1),
                                                         (820 + 4 * V, 200, 240, 90, 2)], ufuk=0.42)


def ciz_kapi_sahnesi(V):
    """Açılış: boş kâğıtta dünyanın kendisi (meydan) boyanarak açılır (mecazi 'yurt' kapı gibi cismanileştirilmez)."""
    t = Tuval()
    dunya_ac = ilerle(V, 0.06, 0.95, e_out)
    if dunya_ac > 0:
        with t.gorunurluk(1.0, acilma_radyal(dunya_ac, 560, 1150, 1700, dalga=0.22, on=0.14, tohum=3),
                          M=np.eye(3)):
            ciz_meydan(t, V, meydan_kamera(V))
    return t


# ---------------------------------------------------------------------------------------------------------------
# 2) bahçe dünyası: adamın pozu
# ---------------------------------------------------------------------------------------------------------------
def _diz_otur_yedek():
    p = dict(insan.POZLAR['diz_dua'])
    insan.kol_ik(p, 'on', (74.0, -96.0))
    insan.el_aci(p, 'on', 62.0)
    insan.kol_ik(p, 'ar', (80.0, -100.0))
    insan.el_aci(p, 'ar', 58.0)
    return p


def _poz(ad):
    P = insan.POZLAR
    if ad in P:
        return P[ad]
    if ad == 'diz_otur':
        return _diz_otur_yedek()
    if ad == 'diz_sukur':
        return P['diz_dua']
    return P['ayakta']


def _secdeden_kalk(u):
    if hasattr(insan, 'secdeden_kalk'):
        return insan.secdeden_kalk(u)
    p = insan.secdeye(1.0 - min(1.0, u / 0.7))
    return insan.poz_karistir(p, _poz('diz_otur'), ilerle(u, 0.55, 1.0, e_io))


def _dua_kaldir(u):
    if hasattr(insan, 'dua_kaldir'):
        return insan.dua_kaldir(u)
    return insan.poz_karistir(_poz('diz_otur'), _poz('diz_sukur'), u)


def poz_durumu(V, evre):
    """Adamın pozu, yerleşimi, yönü ve ek bilgileri. evre: 'sulama' | 'secde' | None (sonrası)."""
    if evre == 'sulama':
        dok = 0.5 + 0.5 * math.sin(V * 1.9)
        egim = 34.0 + 8.0 * dok
        poz = insan.sula_pozu(0.25 * dok, alt_el=esyalar.ibrik_alt_nokta(egim))
        return dict(poz=poz, x=SULA_X, yon=-1, ibrik=True, egim=egim, battaniye=0.0, seccade=None, dok=dok,
                    ayakkabi=True)
    if evre == 'secde':
        return dict(poz=_poz('secde'), x=SECDE_X, yon=1, ibrik=False, battaniye=0.0, seccade=SECDE_X, dok=0,
                    ayakkabi=False)
    # hastalık, sabır, kuvvet
    if V < T_KUVVET - 0.05:
        u = ilerle(V, 15.55, 16.35, e_io)
        return dict(poz=insan.poz_karistir(_poz('oturus_hasta'), _poz('oturus_dik'), u), x=OTUR_X, yon=1,
                    ibrik=False, battaniye=1.0, seccade=None, dok=0, ayakkabi=True)
    if V < 22.30:
        u = ilerle(V, T_KUVVET - 0.05, T_KUVVET + 0.80, e_io)
        return dict(poz=insan.kalkis(u), x=OTUR_X, yon=1, ibrik=False, battaniye=1.0,
                    battaniye_alfa=1.0 - ilerle(V, T_KUVVET - 0.05, T_KUVVET + 0.30, e_io), seccade=None, dok=0,
                    ayakkabi=True)
    # 2. secde (kamera güneşteyken), diz çöküş, şükür
    if V < 24.50:
        return dict(poz=_poz('secde'), x=SECDE_X, yon=1, ibrik=False, battaniye=0.0, seccade=SECDE_X, dok=0,
                    ayakkabi=False)
    if V < T_SUKUR:
        u = ilerle(V, 24.50, 25.18, e_io)
        return dict(poz=_secdeden_kalk(u), x=SECDE_X, yon=1, ibrik=False, battaniye=0.0, seccade=SECDE_X, dok=0,
                    ayakkabi=False)
    u = ilerle(V, T_SUKUR, T_SUKUR + 0.55, e_io)
    return dict(poz=_dua_kaldir(u), x=SECDE_X, yon=1, ibrik=False, battaniye=0.0, seccade=SECDE_X, dok=0,
                ayakkabi=False)


# ---------------------------------------------------------------------------------------------------------------
# durum
# ---------------------------------------------------------------------------------------------------------------
CICEKLER = [  # x, y, boy, renk  (0,1 arka; 2,3 ön sol; 4,5 ön sağ)
    (215, 1440, 230, 'allik'), (1010, 1446, 240, 'seftali'),
    (55, 1700, 330, 'beyaz'), (165, 1885, 300, 'allik'), (930, 1865, 320, 'gul'), (1035, 1685, 300, 'beyaz'),
]
DAMLA_SIRASI = [(4, 0.00), (5, 0.14), (1, 0.28), (0, 0.55), (2, 0.68), (3, 0.80)]  # (çiçek, gecikme)


def durum(V, evre=None):
    s = {}
    if evre is None:
        evre_k = 'sulama' if V < G2_KOPRU else ('secde' if V < G3[0] else None)
    else:
        evre_k = evre
    s['evre'] = evre_k
    once = evre_k in ('sulama', 'secde')
    # hava
    s['koyuluk'] = 0.0 if once else anahtar(V, [(11.45, 0.0), (12.2, 0.78), (13.0, 1.0), (16.6, 1.0), (17.7, 0.3),
                                                (20.4, 0.15), (21.5, 0.0)])
    s['firtina_gelis'] = 0.0 if once else anahtar(V, [(12.05, 0.0), (13.1, 1.0), (16.7, 1.0), (17.8, 0.45),
                                                      (20.5, 0.4), (21.55, 0.0)])
    s['yagmur'] = 0.0 if once else anahtar(V, [(T_MUSIBET - 0.1, 0.0), (T_MUSIBET + 0.5, 1.0), (17.0, 1.0),
                                               (17.9, 0.45), (20.3, 0.3), (21.3, 0.0)])
    s['ruzgar'] = 0.0 if once else anahtar(V, [(T_MUSIBET - 0.1, 0.0), (T_MUSIBET + 0.4, 1.0), (15.4, 0.8),
                                               (17.5, 0.15), (21.0, 0.0)])
    # sulama: ıslak toprak, fidanın yeni yaprağı
    s['islak'] = anahtar(V, [(3.35, 0.0), (5.2, 0.55), (8.5, 0.62), (9.4, 1.0)])
    s['agac'] = anahtar(V, [(0, 0.10), (8.75, 0.10), (9.55, 0.14), (16.9, 0.14), (18.4, 0.24), (T_KUVVET - 0.05, 0.26),
                            (T_KUVVET + 0.85, 1.0)])
    s['kok'] = anahtar(V, [(15.2, 0.25), (16.2, 0.7), (T_KUVVET, 0.72), (T_KUVVET + 0.9, 1.0)])
    s['kesit'] = 0.0 if once else anahtar(V, [(15.25, 0.0), (15.95, 1.0), (16.95, 1.0), (17.4, 0.0), (20.10, 0.0),
                                              (20.45, 1.0), (21.0, 1.0), (21.35, 0.0)])
    # "o hizmete": yağmur tek bir dere gibi fidana dökülür (ibriğin kafiyesi)
    s['yagmur_akis'] = 0.0 if once else anahtar(V, [(16.80, 0.0), (17.1, 1.0), (17.75, 1.0), (18.15, 0.0)])
    # çiçekler
    taban = anahtar(V, [(0, 0.12), (8.2, 0.12), (9.6, 0.24), (12.0, 0.24)])
    acilmalar = []
    gec_hz = [0.0, 0.25, 0.5, 0.15, 0.4, 0.65]
    dsozluk = dict(DAMLA_SIRASI)
    for i in range(6):
        a = taban
        a = max(a, anahtar(V, [(T_O_HIZMETE + gec_hz[i] * 0.6, a), (T_O_HIZMETE + 0.8 + gec_hz[i] * 0.6, 0.34)]))
        t_in = T_MUVAFIK + dsozluk[i] * 0.55
        a = max(a, anahtar(V, [(t_in, a), (t_in + 0.42, 0.78)], lambda x: e_back(x, 1.2)))
        a = max(a, anahtar(V, [(T_SUKUR + gec_hz[i] * 0.3, a), (T_SUKUR + 0.6 + gec_hz[i] * 0.3, 1.0)], e_out))
        acilmalar.append(min(1.0, a))
    s['acilma'] = acilmalar
    s['solgunluk'] = 0.0 if once else anahtar(V, [(T_MUSIBET, 0.0), (T_MUSIBET + 0.6, 0.7), (16.8, 0.6), (18.0, 0.0)])
    # simgeler
    s['simge'] = [ilerle(V, T_LEZZET - 0.06, T_LEZZET + 0.55, e_out), ilerle(V, T_UCRET - 0.06, T_UCRET + 0.55, e_out),
                  ilerle(V, T_MUKAFAT - 0.06, T_MUKAFAT + 0.55, e_out)]
    s['firca'] = ilerle(V, T_DEGILDIR - 0.06, T_DEGILDIR + 0.62, lambda x: x)
    # kubbe ve sıcak ışık (kulluk yeri)
    s['kubbe'] = 0.0 if evre_k == 'sulama' else ilerle(V, 10.05, 10.85, e_out)
    s['sicak'] = ilerle(V, 10.05, 10.95, e_out) if evre_k == 'secde' else 0.0
    s['dalga_nur'] = 0.0
    # kalp nuru
    s['nur'] = 0.0 if once else anahtar(V, [(T_DINI - 0.05, 0.0), (T_DINI + 0.45, 1.0), (T_KUVVET + 0.05, 1.0),
                                            (T_KUVVET + 0.45, 0.0)])
    s['nur_isin'] = 0.0
    # "o ubudiyete": kalpteki iman nuru (göğe yönelmeden) yerinde güçlenir
    s['nur_guc'] = 0.0 if once else ilerle(V, 17.80, 18.60, e_io) * (1.0 - ilerle(V, T_KUVVET, T_KUVVET + 0.4, e_io))
    s['nur_kuyruk'] = 0.0 if once else ilerle(V, T_KUVVET - 0.35, T_KUVVET + 0.25, lambda x: x)
    # güneş ve saat
    s['gunes'] = 1.0 if V > 20.9 else 0.0
    s['saat'] = anahtar(V, [(21.85, 0.0), (22.25, 1.0)])
    s['dilim'] = ilerle(V, T_SAATI - 0.02, T_SAATI + 0.55, e_io)
    s['gun'] = ilerle(V, T_GUN - 0.12, T_GUN + 0.48, e_io)
    s['tamam'] = ilerle(V, T_GUN + 0.40, T_GUN + 1.40, lambda x: x)
    s['kadran'] = anahtar(V, [(23.95, 1.0), (24.6, 0.0)])
    # şikâyet ve şükür
    s['sikayet'] = ilerle(V, T_SEKVA - 0.04, T_SEKVA + 0.55, e_io)
    s['sikayet_kaldir'] = ilerle(V, T_DEGIL - 0.04, T_DEGIL + 0.70, lambda x: x)
    s['sukur'] = ilerle(V, T_SUKUR, T_SUKUR + 0.9, e_out)
    s.update(poz_durumu(V, evre_k))
    return s


# ---------------------------------------------------------------------------------------------------------------
# bahçe kamerası (duraksamadan akan monoton kübik yol)
# ---------------------------------------------------------------------------------------------------------------
_KAMERA_ONBELLEK = {}


def _kalp(x_yer, poz_adi='oturus_hasta'):
    key = (x_yer, poz_adi)
    if key not in _KAMERA_ONBELLEK:
        M = M_yerlestir(x_yer, ADAM_Y, ADAM_OLCEK)
        _KAMERA_ONBELLEK[key] = insan.capalar(_poz(poz_adi), M, yon=1)['kalp']
    return _KAMERA_ONBELLEK[key]


def kalp_dunya():
    return _kalp(OTUR_X)


def _bahce_anahtarlari(evre):
    K = Kamera
    kx, ky = kalp_dunya()
    if evre == 'sulama':
        return [
            (2.80, K(455, 1085, 1.30)),
            (4.40, K(560, 1095, 1.25)),
            (7.70, K(585, 1080, 1.22)),
            (8.85, K(480, 1290, 2.05)),
            (9.35, K(475, 1300, 2.12)),
            (G2_KOPRU, K(525, 330, 1.15)),
        ]
    if evre == 'secde':
        return [
            (G2_KOPRU, K(525, 330, 1.15)),
            (10.55, K(655, 1075, 1.10)),
            (G3[1] + 0.2, K(650, 1085, 1.12)),
        ]
    return [
        (G3[0], K(650, 1085, 1.12)),
        (G3[1] + 0.2, K(650, 1085, 1.12)),
        (13.20, K(680, 1150, 1.32)),
        (14.30, K(kx + 6, ky + 30, 2.30)),
        (14.60, K(kx + 6, ky + 30, 2.34)),
        (15.55, K(500, 1560, 1.50)),
        (16.55, K(505, 1550, 1.48)),
        (17.25, K(520, 1200, 1.30)),
        (18.35, K(600, 1150, 1.22)),
        (18.75, K(930, 1700, 1.90)),
        (19.20, K(935, 1690, 1.95)),
        (19.95, K(600, 1110, 1.02)),
        (21.00, K(610, 860, 0.80)),
        (21.55, K(660, 620, 0.95)),
        (22.25, K(GUNES[0], GUNES[1] - 30, 1.62)),
        (23.90, K(GUNES[0], GUNES[1] - 35, 1.66)),
        (24.75, K(650, 1060, 1.10)),
        (25.25, K(700, 1150, 1.48)),
        (26.45, K(705, 1150, 1.52)),
        (27.40, K(600, 770, 0.60)),
    ]


def bahce_kamera(V, evre=None):
    if evre is None:
        evre = 'sulama' if V < G2_KOPRU else ('secde' if V < G3[0] else None)
    c = kamera_akis(V, _bahce_anahtarlari(evre))
    dx, dy, zz = kayma(V, hiz=(0.9, -0.3), zum_hiz=0.0012, sal=2.0)
    return Kamera(c.x + dx, c.y + dy, c.zum * zz)


# ---------------------------------------------------------------------------------------------------------------
# bahçe çizimi (önden arkaya)
# ---------------------------------------------------------------------------------------------------------------
def ciz_bahce(V, cam: Kamera, evre=None):
    s = durum(V, evre)
    t = Tuval()
    M = cam.M()
    Mu = mt.ufuk_M(cam, 0.55, UFUK)
    Muu = mt.ufuk_M(cam, 0.3, UFUK)
    sal = math.sin(V * 1.7) * 0.25 + s['ruzgar'] * (0.9 + 0.5 * math.sin(V * 5.3))

    # --- en önde: simgeler ve fırça ---
    ciz_simgeler(t, V, s, cam)

    # --- efektler (saklamasız) ---
    if s['yagmur'] > 0.01:
        kor = None
        if s['nur'] > 0.05:
            kx, ky = kalp_dunya()
            kor = (kx, ky, 40 * s['nur'])
        doga.ciz_yagmur(t, M, V, s['yagmur'], alan=(-300, -400, 1400, 2300), ruzgar=-0.3 * s['ruzgar'], tohum=5,
                        zemin_y=ADAM_Y + 20, korunan=kor)
    if s['ruzgar'] > 0.3:
        _k(doga.ciz_ucusan_yapraklar, t, M, V, int(9 * s['ruzgar']), (-100, 500, 1200, 1700), 1.6 * s['ruzgar'], 3,
           tur='yaprak', boyut=1.6)
    if s['sukur'] > 0:
        _k(doga.ciz_ucusan_yapraklar, t, M, V, int(26 * s['sukur']), (0, 500, 1080, 1750), 0.35, 9, tur='tac',
           boyut=2.0, kaynak=[(c[0], c[1] - c[2] * 0.8) for c in CICEKLER])
    if T_MUVAFIK - 0.6 < V < T_MUVAFIK + 1.4:
        ciz_damlalar(t, V, s, M)
    if s['sikayet'] > 0 and s['sikayet_kaldir'] < 1:
        bas = adam_capasi(s, 'bas_ust', M)
        z = cam.zum
        Mb = M_bilesik(M_oteleme(bas[0] - 150 * z, bas[1] - 225 * z), M_olcek(z * 1.35))
        esyalar.ciz_sikayet_bulutu(t, Mb, olcek=1.0, olusum=s['sikayet'], kaldirma=s['sikayet_kaldir'], zaman=V,
                                   tohum=4)
        if 0 < s['sikayet_kaldir'] < 1 and hasattr(esyalar, 'ciz_firca_darbesi'):
            Mf = M_bilesik(M_oteleme(bas[0] - 360 * z, bas[1] - 225 * z), M_olcek(z))
            esyalar.ciz_firca_darbesi(t, Mf, s['sikayet_kaldir'], 440, 230, tohum=8)

    # --- yağmurun fidana dökülen deresi ("o hizmete") ---
    if s['yagmur_akis'] > 0.01:
        bas_p = nokta_donustur(M, AGAC_X - 30, 260)
        son_p = nokta_donustur(M, AGAC_X + 26, AGAC_Y + 8)
        _k(esyalar.ciz_su_akisi, t, np.eye(3), bas_p, son_p, V, debi=s['yagmur_akis'],
           kalinlik=9.0 * M[0, 0], tohum=7, yon=(0.15, 1.0))

    # --- ön sıra çiçekler (kesit açıkken soldakiler çekilir) ---
    for i in (2, 3, 4, 5):
        x, y, b, r = CICEKLER[i]
        alfa = 1.0 - s['kesit'] if i in (2, 3) else 1.0
        if alfa <= 0.01:
            continue
        with t.gorunurluk(alfa):
            doga.ciz_cicek_fidani(t, M, x, y, b, renk_=r, acilma=s['acilma'][i], sallanma=sal,
                                  solgunluk=s['solgunluk'], tohum=10 + i)

    # --- toprak kesiti ve kökler (sabır) ---
    if s['kesit'] > 0.01:
        ciz_kesit(t, V, s, M)

    # --- adam, suyu, seccade, ayakkabıları, yerdeki ibrik ---
    bilgi = ciz_adam(t, V, s, M)
    if s['ibrik'] and bilgi.get('ibrik_uc') is not None:
        uc, yon = bilgi['ibrik_uc']
        hedef = nokta_donustur(M, AGAC_X + 30, AGAC_Y + 8)
        esyalar.ciz_su_akisi(t, np.eye(3), uc, hedef, V, debi=0.82 + 0.18 * s['dok'], yon=yon,
                             kalinlik=6.5 * ADAM_OLCEK * M[0, 0], tohum=3)
    if s['seccade'] is not None:
        if not s.get('ayakkabi', True) and hasattr(insan, 'ciz_ayakkabi_cifti'):
            insan.ciz_ayakkabi_cifti(t, M @ M_yerlestir(SECDE_X - 95, ADAM_Y + 28, ADAM_OLCEK * 0.95), tohum=2)
        _k(mimari.ciz_seccade, t, M @ M_yerlestir(s['seccade'] + 142 * ADAM_OLCEK, ADAM_Y + 2, ADAM_OLCEK),
           uzunluk=440, tohum=1, yon=1)
    if s['evre'] != 'sulama':
        x, y = IBRIK_YER
        al = esyalar.ibrik_alt_nokta(0.0) if hasattr(esyalar, 'ibrik_alt_nokta') else (60.0, 77.0)
        Mi = M @ M_yerlestir(x, y, ADAM_OLCEK) @ M_oteleme(-al[0], -al[1])
        esyalar.ciz_ibrik(t, Mi, egim=0.0, tohum=1)

    # --- ağaç ---
    Ma = M @ M_yerlestir(AGAC_X, AGAC_Y, AGAC_OLCEK)
    egilme = sal * 0.6 + (0.35 * s['ruzgar'] if s['ruzgar'] > 0 else 0.0)
    doga.ciz_agac(t, Ma, s['agac'], sallanma=egilme, tohum=1, damla=s['yagmur'])

    # --- ıslak toprak (sulanan yer) ---
    if s['islak'] > 0.01 and hasattr(esyalar, 'ciz_islak_toprak'):
        esyalar.ciz_islak_toprak(t, M @ M_yerlestir(AGAC_X + 24, AGAC_Y + 8, 1.0), 105, 26, s['islak'], tohum=3)

    # --- orta planda genç fideler (bahçe hissi) ---
    for j, (fx, fy, fb, fr) in enumerate([(330, 1300, 120, 'beyaz'), (612, 1286, 105, 'allik'), (842, 1306, 118, 'seftali')]):
        doga.ciz_cicek_fidani(t, M, fx, fy, fb, renk_=fr, acilma=min(1.0, s['acilma'][j % 2] * 0.85), sallanma=sal,
                              solgunluk=s['solgunluk'], tohum=60 + j)

    # --- arka sıra çiçekler, çimen ---
    for i in (0, 1):
        x, y, b, r = CICEKLER[i]
        doga.ciz_cicek_fidani(t, M, x, y, b, renk_=r, acilma=s['acilma'][i], sallanma=sal,
                              solgunluk=s['solgunluk'], tohum=10 + i)
    for i, (x0, x1, y, sc) in enumerate([(-300, 380, 1880, 1.25), (720, 1400, 1900, 1.25), (-300, 250, 1640, 1.0),
                                         (880, 1400, 1620, 1.0), (-300, 330, 1470, 0.8), (760, 1400, 1480, 0.8),
                                         (-300, 1400, 1300, 0.55), (-300, 1400, 1210, 0.4)]):
        _k(doga.ciz_cimen, t, M, x0, x1, y, 1.0, sal, tohum=30 + i, boy=(int(16 * sc), int(36 * sc)), duzensiz=1.0)

    # --- zemin: iki sır (sıcak kum + hafif toprak lekeleri) ---
    zemin_renk = el.karistir('#E2D5BC', '#B9B2B8', 0.55 * s['koyuluk'])
    t.lavi(yol_dikdortgen(-2000, UFUK - 6, 3000, 4000), M, zemin_renk, yog=0.5, kenar=2.0, dalga=0.14, islak=0.4,
           islak_gen=9, gran=0.16, akis=0.2, tohum=12)
    t.lavi(yol_dikdortgen(-2000, UFUK + 60, 3000, 4000), M, '#D7C3A2', yog=0.14, kenar=2.0, yumusak=24, dalga=0.3,
           islak=0.0, gran=0.25, akis=0.45, tohum=19)

    # --- uzak: kubbe (fırtına pusundan muaf), pus, ağaç sırası, tepeler ---
    if s['kubbe'] > 0.01:
        Mk = mt.ufuk_M(cam, 0.45, UFUK) @ M_yerlestir(KUBBE[0], UFUK + 4, KUBBE[1])
        with t.gorunurluk(1.0, acilma_radyal(s['kubbe'], 0, -300, 900, dalga=0.2, tohum=11), M=Mk):
            mimari.ciz_kubbe_cami(t, Mk, nur=0.0, tohum=2)
    if s['koyuluk'] > 0.02:
        t.lavi(yol_dikdortgen(-3000, -6000, 4000, UFUK + 8), Mu, '#8E8AA6', yog=0.32 * s['koyuluk'], kenar=6,
               dalga=0.0, islak=0.0, gran=0.0, akis=0.15, yumusak=10, tohum=77)
    el.uzak_agac_sirasi(t, Mu, -900, 2000, UFUK + 4, yuk=46, renk_=el.karistir('#A5B8B0', '#8F8DA3',
                                                                               s['koyuluk'] * 0.6), yog=0.42,
                        tohum=13)
    el.tepe_sirasi(t, Muu, -1500, 2600, UFUK - 10, 120, el.karistir('#BCC8CE', '#9C98B0', s['koyuluk'] * 0.6),
                   yog=0.32, tohum=14, dalga_sayi=2.5)

    # --- gök ---
    ciz_gok_bahce(t, V, s, cam)
    return t, s


def ciz_kesit(t, V, s, M):
    """Fidanın altında temiz bir toprak dilimi (yukarıdan aşağı açılır), içinde kökler."""
    acik = s['kesit'] if (V < 17.0 or 20.0 < V < 20.6) else 1.0
    alfa = s['kesit'] if not (V < 17.0 or 20.0 < V < 20.6) else 1.0
    x0, x1 = AGAC_X - 370, AGAC_X + 400
    y0 = AGAC_Y + 25

    def dilim(m, X, Y):
        yat = smoothstep(x0 - 30, x0 + 30, X) * (1.0 - smoothstep(x1 - 30, x1 + 30, X))
        return m * yat
    ac = acilma_yonlu(acik, 0, y0 - 10, 0, 1, 900, dalga=0.10, on=0.06, tohum=7)
    with t.gorunurluk(alfa, mt.maske_zinciri(ac, dilim), M=M):
        Ma = M @ M_yerlestir(AGAC_X, AGAC_Y, AGAC_OLCEK)
        doga.ciz_kokler(t, Ma, 0.42 + 0.58 * s['agac'], derinlik=s['kok'], tohum=2)
        _k(doga.ciz_toprak_kesiti, t, M, x0 - 40, x1 + 40, y0, 2700, tohum=3, ust_kenar_net=True)


def ciz_damlalar(t, V, s, M):
    """'muvafık': parlak damlalar tam çiçek kâselerine düşer; değdiği an o çiçek açılır ve küçük bir sıçrama olur."""
    kuru = Tuval()
    for i, gec in DAMLA_SIRASI:
        t_in = T_MUVAFIK + gec * 0.55
        u = (V - (t_in - 0.40)) / 0.40
        if u < 0 or u > 1.6:
            continue
        x, y, b, r = CICEKLER[i]
        bilgi = doga.ciz_cicek_fidani(kuru, M, x, y, b, renk_=r, acilma=s['acilma'][i], sallanma=0.0, tohum=10 + i)
        if not bilgi or not bilgi.get('cicekler'):
            continue
        (cx, cy), rr, _ = bilgi['cicekler'][0]
        sk = M[0, 0] * 3.2
        if u <= 1.0:
            yy = lerp(cy - 560 * M[0, 0], cy - rr * 0.25, e_in(u))
            dam = yol_egri([(0, -16), (6, -4), (7.5, 4), (0, 10), (-7.5, 4), (-6, -4)], kapali=True)
            Md = M_bilesik(M_oteleme(cx, yy), M_olcek(sk))
            t.lavi(dam, Md, '#7FB3D8', yog=0.6, kenar=0.8, dalga=0.03, islak=0.9, islak_gen=2, gran=0.04, akis=0.1,
                   sakla=False, tohum=40 + i)
            t.isik(yol_daire(-1.8, 0.5, 2.8), Md, '#FFFFFF', guc=0.9, yumusak=1.0)
            t.isik(yol_daire(0, 0, 12), Md, '#DDEFFF', guc=0.25, yumusak=5 * sk)
        else:
            k = (u - 1.0) / 0.6
            if hasattr(esyalar, 'ciz_sicrama'):
                esyalar.ciz_sicrama(t, M_bilesik(M_oteleme(cx, cy - rr * 0.25), M_olcek(M[0, 0])), k, olcek=1.3,
                                    tohum=50 + i)
            t.isik(yol_daire(cx, cy - rr * 0.15, rr * (0.3 + 0.6 * k)), np.eye(3), '#FFF4D8',
                   guc=0.6 * (1 - k), yumusak=10 * M[0, 0])


def _adam_M(s, M):
    return M @ M_yerlestir(s['x'], ADAM_Y, ADAM_OLCEK)


def adam_capasi(s, ad, M):
    return insan.capalar(s['poz'], _adam_M(s, M), yon=s['yon'])[ad]


def ciz_adam(t, V, s, M):
    Madam = _adam_M(s, M)
    elde = None
    ibrik_bilgi = {}
    if s['ibrik']:
        def elde(tt, Mel):
            esyalar.ciz_ibrik(tt, Mel, egim=s['egim'], tohum=1)
            ibrik_bilgi['uc'] = esyalar.ibrik_agzi(Mel, s['egim'])
    # sıcak ışık (kulluk yeri): figürün arkasında yumuşak altın hale
    bilgi = _k(insan.ciz_insan, t, Madam, s['poz'], yon=s['yon'], isik=(-0.6, -0.8), battaniye=s['battaniye'],
               battaniye_alfa=s.get('battaniye_alfa', 1.0), elde=elde, nefes=(V * 0.25) % 1.0,
               ayakkabi=s.get('ayakkabi', True))
    bilgi['ibrik_uc'] = ibrik_bilgi.get('uc')
    if s['nur'] > 0.01:
        kx, ky = bilgi['kalp']
        Mn = M_bilesik(M_oteleme(kx, ky), M_olcek(M[0, 0] * ADAM_OLCEK))
        _k(esyalar.ciz_kalp_nuru, t, Mn, 26 * (1.0 + 0.25 * s['nur_guc']), parlaklik=s['nur'] * (1.0 + 0.45 * s['nur_guc']),
           isin=0.0, zaman=V,
           kalkan=(40.0 / ADAM_OLCEK) * s['nur'] * min(1.0, s['yagmur'] * 3.0), isin_kuyruk=s['nur_kuyruk'],
           bas_ust=bilgi['bas_ust'][1])
    return bilgi


def yol_op_cember(cx, cy, r, gen):
    dis = yol_daire(cx, cy, r + gen / 2)
    ic = yol_daire(cx, cy, max(1.0, r - gen / 2))
    return mt.yol_op(dis, ic, 'fark')


def ciz_gok_bahce(t, V, s, cam):
    k = s['koyuluk']
    Mg = mt.ufuk_M(cam, 0.35, UFUK)
    # fırtına bulutları: yanlardan kayarak gelir, sonra yarılıp çekilir
    if s['firtina_gelis'] > 0.01:
        g = s['firtina_gelis']
        for i, (cx, cy, gw, gh) in enumerate([(120, 470, 980, 380), (960, 520, 1000, 400), (540, 250, 1150, 330)]):
            yon = -1 if cx < 540 else (1 if cx > 540 else 0)
            kay = (1 - g) * 760 * yon
            _k(doga.ciz_firtina_bulutu, t, Mg, cx + kay, cy, gw, gh, koyuluk=max(0.0, k), gelis=min(1.0, g * 1.4),
               tohum=20 + i)
    # güneş ve saat
    saat_ac = ilerle(V, 21.55, 22.20, e_out)
    saat_alfa = 1.0 - ilerle(V, 23.95, 24.55, e_io)
    if saat_ac > 0 and saat_alfa > 0:
        Ms = cam.M(1.0) @ M_yerlestir(GUNES[0], GUNES[1], 1.0)
        baglam = t.gorunurluk(saat_alfa, acilma_radyal(saat_ac, 0, 0, 230, dalga=0.18, on=0.12, tohum=31), M=Ms)
        baglam.__enter__()
        akrep = 30.0 * s['dilim'] + 330.0 * s['gun']
        yelkovan = 360.0 * s['dilim']
        yelkovan_onceki = 360.0 * ilerle(V - 1.0 / FPS, T_SAATI - 0.02, T_SAATI + 0.55, e_io)
        _k(esyalar.ciz_saat, t, Ms, 175, dilim=s['dilim'], gun=s['gun'], gorunurluk=s['saat'], tohum=1,
           akrep=akrep, yelkovan=yelkovan, yelkovan_onceki=yelkovan_onceki, kadran=1.0, tamam=s['tamam'], hale=0.0)
        baglam.__exit__(None, None, None)
    ust = el.karistir('#6E98C8', '#6F6C8C', k)
    orta = el.karistir('#9BBCDB', '#8A87A2', k)
    alt = el.karistir('#EDDACD', '#B4AEBE', k)
    if s['sicak'] > 0.01:
        alt = el.karistir(alt, '#F6D6A4', 0.45 * s['sicak'])
        orta = el.karistir(orta, '#C9D3DC', 0.25 * s['sicak'])
    bulut_al = max(0.0, 1.0 - 1.6 * k)
    bulutlar = [(200 + 8 * V, 300, 300, 100, 41), (960 + 5 * V, 520, 240, 85, 42)]
    el.gok(t, Mg, bulutlar=bulutlar, ust=ust, orta=orta, alt=alt, ufuk=0.62, alt_yog=0.32, yog=0.78,
           bulut_alfa=bulut_al)


# ---------------------------------------------------------------------------------------------------------------
# simgeler (lezzet, ücret, mükâfat) ve "değildir" fırçası
# ---------------------------------------------------------------------------------------------------------------
SIMGE_YER = [(290, 790), (560, 655), (830, 790)]
SIMGE_OLCEK = 0.74


def ciz_simgeler(t, V, s, cam):
    if max(s['simge']) <= 0 or s['firca'] >= 1:
        return
    M = cam.M()
    fonk = [esyalar.ciz_meyve_tabagi, esyalar.ciz_kese, esyalar.ciz_madalya]
    # fırçanın ekrandaki önü: simge sırası boyunca soldan sağa
    sx0 = nokta_donustur(M, SIMGE_YER[0][0] - 200, 0)[0]
    sx1 = nokta_donustur(M, SIMGE_YER[2][0] + 200, 0)[0]
    on_x = lerp(sx0, sx1, s['firca'])
    if 0 < s['firca'] < 1 and hasattr(esyalar, 'ciz_firca_darbesi'):
        yb = nokta_donustur(M, 0, 735)[1]
        Mf = M_bilesik(M_oteleme(sx0, yb), M_olcek(1.0))
        esyalar.ciz_firca_darbesi(t, Mf, s['firca'], sx1 - sx0, 380 * cam.zum, tohum=5)
    for i in range(3):
        p = s['simge'][i]
        if p <= 0:
            continue
        x, y = SIMGE_YER[i]
        sc = 1.0 + 0.04 * math.sin(math.pi * min(1.0, p * 1.2))
        Ms = M @ M_yerlestir(x, y + math.sin(V * 1.6 + i) * 6, SIMGE_OLCEK * sc)
        silgi = None
        if s['firca'] > 0:
            def silgi(m, X, Y, on_x=on_x):
                g = mt._gurultu_yerel(X, Y, (17.0 * i, 31.0), 0.5) * 22
                return m * smoothstep(on_x - 10, on_x + 70, X + g)
        p_halka = min(1.0, p * 1.35)
        p_simge = max(0.0, min(1.0, p * 1.3 - 0.25))
        with t.gorunurluk(1.0, silgi, M=np.eye(3)):
            if p_simge > 0:
                with t.gorunurluk(e_out(min(1.0, p_simge * 2.0)),
                                  acilma_radyal(p_simge, 0, 0, 175, dalga=0.25, on=0.2, tohum=21 + i), M=Ms):
                    fonk[i](t, Ms, olcek=1.0, tohum=i + 1)
            esyalar.ciz_simge_halkasi(t, Ms, 150, '#F1E3D3', ilerleme=p_halka, tohum=i + 5)


# ---------------------------------------------------------------------------------------------------------------
# kapıdan geri çekiliş
# ---------------------------------------------------------------------------------------------------------------
SON_ZUM_BAS = 16.0


def son_kapi_zum(V):
    u = ilerle(V, SON_CEKILIS[0], SON_CEKILIS[1], e_io)
    return math.exp(math.log(SON_ZUM_BAS) * (1 - u))


def ciz_son(V):
    cam = bahce_kamera(V)
    tb, _ = ciz_bahce(V, cam)
    return tb


# ---------------------------------------------------------------------------------------------------------------
# kare dağıtımı
# ---------------------------------------------------------------------------------------------------------------
def _bahce_tuval(V, evre=None, kamera_V=None):
    if V >= SON_CEKILIS[0] and evre is None:
        return ciz_son(V)
    cam = bahce_kamera(V if kamera_V is None else kamera_V, evre)
    t, _ = ciz_bahce(V, cam, evre)
    return t


def kare(V):
    if V < G1[0]:
        return ciz_kapi_sahnesi(V).R
    if V < G1[1]:
        a = ciz_kapi_sahnesi(V).R
        b = _bahce_tuval(V, 'sulama').R
        return gecis_boya(a, b, ilerle(V, *G1, lambda x: x), yon=(1.0, 0.18), dalga=0.18, on=0.22,
                          kenar_koyu=0.08, tohum=1)
    if V < G2_KOPRU:
        return _bahce_tuval(V, 'sulama').R
    if V < G3[0]:
        return _bahce_tuval(V, 'secde').R
    if V < G3[1]:
        a = _bahce_tuval(V, 'secde', kamera_V=V).R
        b = _bahce_tuval(V, None).R
        return gecis_boya(a, b, ilerle(V, *G3, lambda x: x), yon=(0.0, 1.0), dalga=0.2, on=0.30, kenar_koyu=0.06,
                          tohum=3)
    return _bahce_tuval(V).R


def _kamera_hareketi(V):
    """Bir karede ekranın en çok kaç piksel kaydığı (hareket bulanıklığı için)."""
    dt = 1.0 / FPS
    pts = np.array([[0, 0, 1], [W, 0, 1], [0, H, 1], [W, H, 1], [W / 2, H / 2, 1]], np.float64).T
    kameralar = []
    if V < G1[1] + 0.05:
        kameralar.append(lambda v: meydan_kamera(v).M())
    if V > G1[0] - 0.05:
        kameralar.append(lambda v: bahce_kamera(v).M())
    en = 0.0
    for f in kameralar:
        A = f(V)
        B = f(V + dt)
        dunya = np.linalg.inv(A) @ pts
        d = np.abs((B @ dunya) - pts)[:2]
        en = max(en, float(np.hypot(d[0], d[1]).max()))
    return min(en, 300.0)


def _figur_hareketli(V):
    return (T_KUVVET - 0.05 < V < T_KUVVET + 0.85) or (24.5 < V < 25.2) or (T_SUKUR < V < T_SUKUR + 0.6)


def alt_kare_sayisi(V):
    hiz = _kamera_hareketi(V)
    n = int(min(13, 1 + hiz // 3.5))
    if _figur_hareketli(V):
        n = max(n, 7)
    return n


def suluboya_son(V):
    """Hareket bulanıklığıyla (180° obtüratör) son işlenmiş suluboya karesi (mana yazısı olmadan)."""
    n = alt_kare_sayisi(V)
    if n <= 1:
        return son_islem(kare(V))
    R = None
    for k in range(n):
        vk = V + (k / (n - 1) - 0.5) * (0.5 / FPS)
        r = son_islem(kare(vk))
        R = r if R is None else R + r
    return R / n


KAGIT_SON = None


def _kapi_isigi(R, V):
    """Geçişten önce resim kâğıt rengine doğru hafifçe açılır (ışık efekti yok)."""
    u = ilerle(V, 26.95, GERCEGE_GECIS[0] + 0.3, e_io)
    if u <= 0:
        return R
    kagit = np.array([0.972, 0.957, 0.930], np.float32)
    return R * (1 - 0.35 * u) + kagit * (0.35 * u)


def kare_son(V):
    if V < GERCEGE_GECIS[0]:
        R = suluboya_son(V)
        R = _kapi_isigi(R, V)
        yazi.manalari_ciz(R, V)
        return rgb8(R)
    t_plak = max(0.0, V - KAPANIS_BAS)
    P = kapanis_yazi.kapanis_kare(t_plak, kare_no=int(round(V * FPS)))
    if V < GERCEGE_GECIS[1]:
        # boyalı dünya kapının ışığından gerçek kitaba ıslak bir lavi ile döner; gerçek görüntü pozlamayla oturur
        A = _kapi_isigi(suluboya_son(min(V, 27.40)), V)
        u = ilerle(V, *GERCEGE_GECIS, lambda x: x)
        ev = 1.6 * (1.0 - e_out(u))
        P2 = 1.0 - (1.0 - P) * (2.0 ** -ev)
        return rgb8(gecis_boya(A, P2, u, merkez=(540, 1010), dalga=0.12, on=0.22, kenar_koyu=0.05, tohum=9))
    # son 0,4 sn: ilk karenin kâğıdına yumuşak dönüş (kısa videolarda kesintisiz döngü)
    f = ilerle(V, SURE - 0.42, SURE - 1.0 / FPS, e_io)
    if f > 0:
        kagit = son_islem(Tuval().R)
        P = P * (1 - f) + kagit * f
    return rgb8(P)
