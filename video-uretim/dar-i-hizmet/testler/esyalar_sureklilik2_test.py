"""Yeni/değişen parametrelerin süreklilik denetimi (sıçrama = iki komşusundan da çok büyük tek adım, '!!'):
nur ışını (isin), sönüş (isin_kuyruk), kalkan büyümesi ve nabzı, saat kadran / tamam / bulanık yelkovan, halka,
şikâyet oluşum+kaldırma (fırçalı), fırça darbesi, ıslak toprak, sıçrama. Ayrıca determinizm.
Şeritler: scratchpad/testler/esyalar_surek2_*.png"""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from esyalar_ortak import *
from motor import M_yerlestir, e_io
import elemanlar as el

SECIM = sys.argv[1:]


def gok(T):
    el.gok(T, np.eye(3), bulutlar=[], ufuk=0.62, alt_yog=0.32, yog=0.85)


def dizi(ad, kare_fn, adimlar, kutu, serit=8):
    if SECIM and ad not in SECIM:
        return None
    ims = [kare_fn(a) for a in adimlar]
    x0, y0, x1, y1 = kutu
    d = [float(np.abs(ims[i + 1][y0:y1, x0:x1].astype(np.int16) - ims[i][y0:y1, x0:x1].astype(np.int16)).mean())
         for i in range(len(ims) - 1)]
    komsu = [max(d[i - 1] if i > 0 else 0.0, d[i + 1] if i + 1 < len(d) else 0.0) for i in range(len(d))]
    isaret = ['!!' if (x > 2.0 * k + 0.05 and x > 0.15) else '' for x, k in zip(d, komsu)]
    print(f'{ad:16s} en büyük {max(d):.2f} (adım {int(np.argmax(d))}) sıçrama {isaret.count("!!")}  ',
          ' '.join(f'{x:.2f}{s}' for x, s in zip(d, isaret)))
    sec = np.linspace(0, len(ims) - 1, min(serit, len(ims))).astype(int)
    pafta([etiket(kirp(ims[i], x0, y0, x1, y1), f'{adimlar[i]:.3f}') for i in sec], f'esyalar_surek2_{ad}')
    return d


Mn = M_bilesik(M_oteleme(540, 1300), M_olcek(0.9))


def nur(i, kuyruk=0.0, isin=None):
    T = Tuval()
    esyalar.ciz_kalp_nuru(T, Mn, 26, parlaklik=1.0, isin=min(1.0, i / 26.0) if isin is None else isin,
                          zaman=18.0 + i / 30.0, isin_kuyruk=kuyruk)
    gok(T)
    return bitir(T)


dizi('isin', nur, list(range(30)), (400, 0, 680, 1400))
dizi('kuyruk', lambda i: nur(i, kuyruk=min(1.0, i / 24.0), isin=1.0), list(range(27)), (400, 0, 680, 1400))
Mk = M_bilesik(M_oteleme(540, 900), M_olcek(2.2))


def kalkan(i):
    T = Tuval()
    esyalar.ciz_kalp_nuru(T, Mk, 26, parlaklik=1.0, kalkan=79.0 * e_io(min(1.0, i / 20.0)), zaman=13.5 + i / 30.0)
    gok(T)
    return bitir(T)


dizi('kalkan', kalkan, list(range(30)), (300, 660, 780, 1140))
Ms = M_yerlestir(540, 600, 1.1)


def saat(i, **kw):
    T = Tuval()
    esyalar.ciz_saat(T, Ms, 175, dilim=1.0, gun=1.0, gorunurluk=1.0, akrep=0.0, yelkovan=0.0, tohum=1, **kw)
    gok(T)
    return bitir(T)


dizi('kadran', lambda i: saat(i, kadran=1.0 - min(1.0, i / 15.0)), list(range(18)), (240, 300, 840, 900))
dizi('tamam', lambda i: saat(i, tamam=min(1.0, i / 27.0)), list(range(29)), (100, 160, 980, 1040))


def yelkovan(i):
    u = e_io(min(1.0, i / 26.0))
    uo = e_io(max(0.0, min(1.0, (i - 1) / 26.0)))
    T = Tuval()
    esyalar.ciz_saat(T, Ms, 175, dilim=1.0, gun=u, gorunurluk=1.0, tohum=1, yelkovan=360 * (1 + 2 * u),
                     yelkovan_onceki=360 * (1 + 2 * uo) if i > 0 else None)
    gok(T)
    return bitir(T)


dizi('yelkovan', yelkovan, list(range(27)), (340, 400, 740, 800))


def firca(i):
    T = Tuval()
    esyalar.ciz_firca_darbesi(T, M_yerlestir(110, 700, 1.0), min(1.0, i / 18.0), 860, 310, tohum=3)
    gok(T)
    return bitir(T)


dizi('firca', firca, list(range(20)), (60, 500, 1030, 1000))


def sikayet(i):
    T = Tuval()
    p = i / 30.0
    esyalar.ciz_sikayet_bulutu(T, M_bilesik(M_oteleme(540, 700), M_olcek(1.4)), olusum=min(1.0, p / 0.45),
                               kaldirma=max(0.0, (p - 0.55) / 0.55), zaman=25.0 + p, tohum=4, firca=1.0)
    gok(T)
    return bitir(T)


dizi('sikayet', sikayet, list(range(34)), (300, 300, 800, 900))


def toprak(i):
    T = Tuval()
    esyalar.ciz_islak_toprak(T, M_yerlestir(540, 1500, 1.5), 120, 34, min(1.0, i / 20.0), tohum=2)
    T.lavi(yol_dikdortgen(-20, 1150, 1100, 1940), np.eye(3), '#E2D5BC', yog=0.5, kenar=2, dalga=0.14,
           islak=0.4, islak_gen=9, gran=0.12, akis=0.15, tohum=12)
    return bitir(T)


dizi('toprak', toprak, list(range(22)), (300, 1400, 780, 1600))


def sicrama(i):
    T = Tuval()
    esyalar.ciz_sicrama(T, M_yerlestir(540, 1300, 2.0), min(1.0, i / 15.0), tohum=3)
    gok(T)
    return bitir(T)


dizi('sicrama', sicrama, list(range(17)), (400, 1150, 680, 1340))

# determinizm
if not SECIM:
    a = nur(10, isin=0.5)
    b = nur(10, isin=0.5)
    print('determinizm nur', int(np.abs(a.astype(int) - b.astype(int)).max()))
    a = firca(9)
    b = firca(9)
    print('determinizm firca', int(np.abs(a.astype(int) - b.astype(int)).max()))
