"""Süreklilik (sıçrama/titreme) denetimi: her zamanlı öğe için ardışık parametre adımlarında kare farkı.

Her dizi için adım başına ortalama mutlak fark (öğe kutusunda) yazılır; ortancanın çok üstündeki adım (sıçrama)
'!!' ile işaretlenir. Ayrıca determinizm (aynı girdi = aynı kare) ve sakla_sonra=False geri yüklemesi denetlenir.
Film şeritleri: scratchpad/testler/esyalar_surek_*.png
"""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from esyalar_ortak import *
from motor import M_yerlestir
import elemanlar as el


def gok_ekle(T):
    el.gok(T, np.eye(3), bulutlar=[], ufuk=0.62, alt_yog=0.32, yog=0.85)


SECIM = sys.argv[1:]          # ör. python3 esyalar_sureklilik_test.py halka sikayet  (boş = hepsi)


def dizi(ad, kare_fn, adimlar, kutu, serit=8):
    if SECIM and ad not in SECIM:
        return None
    ims = [kare_fn(a) for a in adimlar]
    x0, y0, x1, y1 = kutu
    d = [float(np.abs(ims[i + 1][y0:y1, x0:x1].astype(np.int16) - ims[i][y0:y1, x0:x1].astype(np.int16)).mean())
         for i in range(len(ims) - 1)]
    med = float(np.median(d)) + 1e-3
    isaret = ['!!' if (x > 2.6 * med and x > 0.15) else '' for x in d]
    print(f'{ad:24s} ort {np.mean(d):.3f} ortanca {med:.3f} en büyük {max(d):.3f} (adım {int(np.argmax(d))})  ',
          ' '.join(f'{x:.2f}{s}' for x, s in zip(d, isaret)))
    sec = np.linspace(0, len(ims) - 1, min(serit, len(ims))).astype(int)
    pafta([etiket(kirp(ims[i], x0, y0, x1, y1), f'{adimlar[i]:.3f}') for i in sec], f'esyalar_surek_{ad}')
    return d


# ---- su: ibrik nefesle oynarken (uç ve uzunluk her kare değişir), kamera yavaşça yaklaşırken -----------------
def su_kare(i):
    z = 5.0 + i / 30.0
    zum = 1.0 + 0.004 * i
    T = Tuval()
    M = M_bilesik(M_oteleme(300 + 3 * math.sin(i * 0.4), 640 + 2 * math.cos(i * 0.33)), M_olcek(1.6 * zum))
    eg = 40 + 2.0 * math.sin(i * 0.25)
    uc = esyalar.ciz_ibrik(T, M, egim=eg, tohum=1)
    _, yon = esyalar.ibrik_agzi(M, eg)
    esyalar.ciz_su_akisi(T, np.eye(3), uc, (560, 1200), zaman=z, debi=0.9, yon=yon, kalinlik=6.5 * 1.6 * zum, tohum=3)
    return bitir(T)


import math
dizi('su_nefes', su_kare, list(range(16)), (380, 560, 760, 1230))


# ---- saat: dilim ve gün -----------------------------------------------------------------------------------
def saat_kare(p):
    T = Tuval()
    Ms = M_yerlestir(540, 500, 1.2)
    d = min(1.0, p * 2.0)
    g = max(0.0, p * 2.0 - 1.0)
    esyalar.ciz_saat(T, Ms, 120, dilim=d, gun=g, gorunurluk=1.0, tohum=1, akrep=30 * d + 330 * g, yelkovan=360 * d)
    gok_ekle(T)
    return bitir(T)


dizi('saat', saat_kare, list(np.linspace(0, 1, 41)), (380, 340, 700, 660))


def saat_gor(p):
    T = Tuval()
    Ms = M_yerlestir(540, 500, 1.2)
    esyalar.ciz_saat(T, Ms, 120, gorunurluk=p, tohum=1)
    gok_ekle(T)
    return bitir(T)


dizi('saat_gorunurluk', saat_gor, list(np.linspace(0, 1, 21)), (380, 340, 700, 660))


# ---- simge halkası (gök önünde) ------------------------------------------------------------------------
def halka_kare(p):
    T = Tuval()
    Ms = M_yerlestir(540, 600, 0.9)
    esyalar.ciz_kese(T, Ms, tohum=2)
    esyalar.ciz_simge_halkasi(T, Ms, 150, '#F1E3D3', ilerleme=p, tohum=6)
    gok_ekle(T)
    return bitir(T)


dizi('halka', halka_kare, list(np.linspace(0, 1, 21)), (380, 440, 700, 760))


# ---- şikâyet bulutu: oluşum ve kaldırma ------------------------------------------------------------------
def bulut_kare(p):
    T = Tuval()
    Mb = M_yerlestir(540, 700, 1.3)
    ol = min(1.0, p * 2.0)
    ka = max(0.0, p * 2.0 - 1.0)
    esyalar.ciz_sikayet_bulutu(T, Mb, olcek=1.0, olusum=ol, kaldirma=ka, zaman=25.0 + p * 1.0, tohum=4)
    gok_ekle(T)
    return bitir(T)


dizi('sikayet', bulut_kare, list(np.linspace(0, 1, 41)), (360, 320, 720, 900))


# ---- kalp nuru: nabız ve ışın ----------------------------------------------------------------------------
def nur_kare(i):
    T = Tuval()
    Mn = M_yerlestir(540, 1300, 1.0)
    esyalar.ciz_kalp_nuru(T, Mn, 26, parlaklik=1.0, isin=min(1.0, i / 18.0), zaman=17.0 + i / 30.0, isin_ust=-80)
    gok_ekle(T)
    return bitir(T)


dizi('nur', nur_kare, list(range(24)), (380, 200, 700, 1420))


# ---- ışık zerreleri ---------------------------------------------------------------------------------------
def zerre_kare(i):
    T = Tuval()
    esyalar.ciz_isik_zerreleri(T, np.eye(3), 23.0 + i / 30.0, 22, (300, 700, 1080, 1500), tohum=6, guc=0.5)
    gok_ekle(T)
    return bitir(T)


dizi('zerre', zerre_kare, list(range(16)), (300, 650, 1080, 1550))

# ---- determinizm ve sakla_sonra=False -------------------------------------------------------------------
cagrilar = [
    ('ibrik', lambda T: esyalar.ciz_ibrik(T, M_yerlestir(400, 700, 1.5), egim=30, tohum=1)),
    ('su', lambda T: esyalar.ciz_su_akisi(T, np.eye(3), (400, 600), (560, 1000), 4.3, yon=(1, 0.2), kalinlik=8)),
    ('meyve', lambda T: esyalar.ciz_meyve_tabagi(T, M_yerlestir(540, 900, 1.0), tohum=1)),
    ('kese', lambda T: esyalar.ciz_kese(T, M_yerlestir(540, 900, 1.0), tohum=1)),
    ('madalya', lambda T: esyalar.ciz_madalya(T, M_yerlestir(540, 900, 1.0), tohum=1)),
    ('halka', lambda T: esyalar.ciz_simge_halkasi(T, M_yerlestir(540, 900, 1.0), 150, ilerleme=0.6, tohum=1)),
    ('saat', lambda T: esyalar.ciz_saat(T, M_yerlestir(540, 900, 1.0), 150, dilim=1, gun=0.4, tohum=1)),
    ('nur', lambda T: esyalar.ciz_kalp_nuru(T, M_yerlestir(540, 900, 1.0), 26, isin=0.6, zaman=3.3)),
    ('sikayet', lambda T: esyalar.ciz_sikayet_bulutu(T, M_yerlestir(540, 900, 1.0), kaldirma=0.5, zaman=2.0)),
    ('zerre', lambda T: esyalar.ciz_isik_zerreleri(T, np.eye(3), 3.1, 20, (200, 300, 900, 1500), tohum=2)),
]
for ad, f in (cagrilar if not SECIM or 'determinizm' in SECIM else []):
    A, B = Tuval(), Tuval()
    t0 = time.time()
    f(A)
    sure = time.time() - t0
    f(B)
    fark = float(np.abs(A.R - B.R).max())
    print(f'determinizm {ad:8s} fark {fark:.2e}   süre {sure:.3f} s')
for ad, f in [] if SECIM and 'determinizm' not in SECIM else [('ibrik', lambda T: esyalar.ciz_ibrik(T, M_yerlestir(400, 700, 1.5), sakla_sonra=False)),
              ('meyve', lambda T: esyalar.ciz_meyve_tabagi(T, M_yerlestir(540, 900, 1.0), sakla_sonra=False)),
              ('kese', lambda T: esyalar.ciz_kese(T, M_yerlestir(540, 900, 1.0), sakla_sonra=False)),
              ('madalya', lambda T: esyalar.ciz_madalya(T, M_yerlestir(540, 900, 1.0), sakla_sonra=False))]:
    T = Tuval()
    T.sakla_ekle(yol_dikdortgen(0, 0, 50, 50), np.eye(3))
    once = T.saklama.copy()
    f(T)
    print(f'sakla_sonra=False {ad:8s} geri yüklendi: {bool(np.array_equal(once, T.saklama))}')


# ---- su: dökme başlar (cephe 0->1), debi değişir, dökme biter (kuyruk 0->1) ---------------------------------
def su_cephe(p):
    T = Tuval()
    M = M_bilesik(M_oteleme(300, 640), M_olcek(1.6))
    uc = esyalar.ciz_ibrik(T, M, egim=42, tohum=1)
    _, yon = esyalar.ibrik_agzi(M, 42)
    cephe = min(1.0, p * 3.0)
    debi = 1.0 - 0.75 * min(1.0, max(0.0, p * 3.0 - 1.0))     # 1 -> 0.25 (0.62'de damlalara bölünme geçişi)
    kuyruk = max(0.0, p * 3.0 - 2.0)
    esyalar.ciz_su_akisi(T, np.eye(3), uc, (560, 1200), zaman=5.0 + p * 2.0, debi=debi, yon=yon, kalinlik=10.4,
                         cephe=cephe, kuyruk=kuyruk, tohum=3)
    return bitir(T)


dizi('su_cephe', su_cephe, list(np.linspace(0, 1, 61)), (380, 560, 760, 1230), serit=12)


# ---- ibrik: aynalı el çerçevesinde eğim 30..46 (sahnedeki gibi ışık eksen boyunca: yerel L_x işaret değiştirir) --
def ibrik_egim(eg):
    T = Tuval()
    M = M_bilesik(M_oteleme(600, 900), M_olcek(-2.4, 2.4))
    esyalar.ciz_ibrik(T, M, egim=eg, tohum=1)
    return bitir(T)


dizi('ibrik_egim', ibrik_egim, list(np.linspace(30, 46, 33)), (240, 560, 720, 1180), serit=9)
