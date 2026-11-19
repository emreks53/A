"""Saat (güneşte) dilim 0/.5/1 sonra gün .25/.5/1 (gök arkada boyanır); kalp nuru (insan üstünde) ışınla;
şikâyet bulutu oluşum .3/.7/1 ve kaldırma .4/.8 (bahçe/gök arka planında); ışık zerreleri."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from esyalar_ortak import *
from motor import M_yerlestir
import elemanlar as el
import insan

# ---- saat ---------------------------------------------------------------------------------------------------
parca = []
for (d, g, gor) in ((0.0, 0.0, 0.0), (0.0, 0.0, 0.6), (0.0, 0.0, 1.0), (0.5, 0.0, 1.0), (1.0, 0.0, 1.0),
                    (1.0, 0.25, 1.0), (1.0, 0.5, 1.0), (1.0, 1.0, 1.0)):
    T = Tuval()
    Ms = M_yerlestir(540, 400, 1.0)
    with Sure(f'saat d{d} g{g}'):
        esyalar.ciz_saat(T, Ms, 120, dilim=d, gun=g, gorunurluk=gor, tohum=1)
    el.gok(T, np.eye(3), bulutlar=[(200, 300, 300, 100, 41)], ufuk=0.62, alt_yog=0.32, yog=0.85)
    img = bitir(T)
    parca.append(etiket(kirp(img, 340, 200, 740, 600), f'dilim {d} gun {g} gor {gor}'))
pafta(parca, 'esyalar_saat', sutun=4)
T = Tuval()
Ms = M_yerlestir(540, 700, 3.0)
esyalar.ciz_saat(T, Ms, 120, dilim=1.0, gun=0.42, gorunurluk=1.0, tohum=1)
el.gok(T, np.eye(3), bulutlar=[], ufuk=0.62, alt_yog=0.32, yog=0.85)
img = bitir(T)
cv2.imwrite(f'{CIKTI}/esyalar_saat_buyuk.png', cv2.cvtColor(kirp(img, 90, 250, 990, 1150), cv2.COLOR_RGB2BGR))

# ---- kalp nuru -------------------------------------------------------------------------------------------
parca = []
for (b, isin, z) in ((1.0, 0.0, 0.0), (1.0, 0.0, 0.85), (1.0, 0.5, 0.3), (1.0, 1.0, 0.6)):
    T = Tuval()
    M = M_yerlestir(560, 1400, 0.95)
    bilgi = insan.ciz_insan(T, M, insan.POZLAR['oturus_dik'], yon=-1)
    kx, ky = bilgi['kalp']
    Mn = M_bilesik(M_oteleme(kx, ky), M_olcek(0.95))
    with Sure(f'nur isin {isin}'):
        esyalar.ciz_kalp_nuru(T, Mn, 26, parlaklik=b, isin=isin, zaman=z)
    T.lavi(yol_dikdortgen(-20, 1390, 1100, 1940), np.eye(3), '#E2D5BC', yog=0.5, kenar=2, dalga=0.14,
           islak=0.4, islak_gen=9, gran=0.12, akis=0.15, tohum=12)
    el.uzak_agac_sirasi(T, np.eye(3), -20, 1100, 1150, yuk=46, renk_='#A5B8B0', yog=0.42)
    el.gok(T, np.eye(3), bulutlar=[], ust='#6F6C8C', orta='#8A87A2', alt='#B4AEBE', ufuk=0.62, alt_yog=0.32,
           yog=0.85)
    img = bitir(T)
    parca.append(etiket(cv2.resize(kirp(img, 240, 0, 840, 1500), None, fx=0.62, fy=0.62,
                                   interpolation=cv2.INTER_AREA), f'isin {isin} z {z}'))
pafta(parca, 'esyalar_nur')
T = Tuval()
M = M_yerlestir(560, 1700, 2.6)
bilgi = insan.ciz_insan(T, M, insan.POZLAR['oturus_dik'], yon=-1)
kx, ky = bilgi['kalp']
esyalar.ciz_kalp_nuru(T, M_bilesik(M_oteleme(kx, ky), M_olcek(2.6)), 26, parlaklik=1.0, isin=0.0, zaman=0.3)
img = bitir(T)
cv2.imwrite(f"{CIKTI}/esyalar_nur_yakin.png", cv2.cvtColor(kirp(img, int(kx)-400, int(ky)-500, int(kx)+400, int(ky)+400), cv2.COLOR_RGB2BGR))

# ---- şikâyet bulutu -------------------------------------------------------------------------------------
parca = []
for (ol, ka) in ((0.15, 0.0), (0.3, 0.0), (0.7, 0.0), (1.0, 0.0), (1.0, 0.4), (1.0, 0.6), (1.0, 0.8),
                 (1.0, 0.95)):
    T = Tuval()
    M = M_yerlestir(560, 1400, 0.95)
    bilgi = insan.ciz_insan(T, M, insan.POZLAR['secde'], yon=-1, sakla_sonra=False)
    bas = bilgi['bas_ust']
    T2 = Tuval()
    Mb = M_bilesik(M_oteleme(bas[0], bas[1] - 150), M_olcek(1.0))
    with Sure(f'sikayet {ol} {ka}'):
        esyalar.ciz_sikayet_bulutu(T2, Mb, olcek=1.0, olusum=ol, kaldirma=ka, zaman=0.5, tohum=4)
    insan.ciz_insan(T2, M, insan.POZLAR['secde'], yon=-1)
    T2.lavi(yol_dikdortgen(-20, 1390, 1100, 1940), np.eye(3), '#E2D5BC', yog=0.5, kenar=2, dalga=0.14,
            islak=0.4, islak_gen=9, gran=0.12, akis=0.15, tohum=12)
    el.gok(T2, np.eye(3), bulutlar=[], ufuk=0.62, alt_yog=0.32, yog=0.85)
    img = bitir(T2)
    x0, y0 = int(bas[0]) - 230, int(bas[1]) - 420
    parca.append(etiket(kirp(img, x0, y0, x0 + 460, y0 + 520), f'olusum {ol} kaldirma {ka}'))
pafta(parca, 'esyalar_sikayet', sutun=4)
T = Tuval()
Mb = M_bilesik(M_oteleme(540, 900), M_olcek(3.0))
esyalar.ciz_sikayet_bulutu(T, Mb, olcek=1.0, olusum=1.0, kaldirma=0.0, zaman=0.5, tohum=4)
img = bitir(T)
cv2.imwrite(f'{CIKTI}/esyalar_sikayet_buyuk.png', cv2.cvtColor(kirp(img, 200, 650, 880, 1300), cv2.COLOR_RGB2BGR))

# ---- ışık zerreleri ----------------------------------------------------------------------------------------
parca = []
for z in (0.0, 0.5, 1.0):
    T = Tuval()
    with Sure('zerreler'):
        esyalar.ciz_isik_zerreleri(T, np.eye(3), z, 26, (100, 200, 980, 1300), tohum=3, boyut=1.6)
    el.gok(T, np.eye(3), bulutlar=[], ufuk=0.62, alt_yog=0.32, yog=0.85)
    img = bitir(T)
    parca.append(etiket(cv2.resize(kirp(img, 0, 150, 1080, 1350), None, fx=0.45, fy=0.45,
                                   interpolation=cv2.INTER_AREA), f'zaman {z}'))
pafta(parca, 'esyalar_zerreler')
