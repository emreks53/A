"""Kalp nuru: kalpten yükselen ışın (8 adım + ardışık kare şeridi + baş yakın planı) ve kalkan halkası.
Sahnedeki gibi: oturan, battaniyeli adam (kamera ~0.95), nur adamdan SONRA, zemin/uzak ağaç/gök en son."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from esyalar_ortak import *
from motor import M_yerlestir, Kamera
import elemanlar as el
import insan
import doga

ADAM_X, ADAM_Y, ADAM_OLCEK = 700.0, 1400.0, 0.95


def kare(isin, zaman, cam=Kamera(535, 1090, 0.94), parlaklik=1.0, kalkan=0.0, kuyruk=0.0, yagmur=0.0,
         poz=None, gok_koyu=0.2):
    T = Tuval()
    M = cam.M()
    Madam = M @ M_yerlestir(ADAM_X, ADAM_Y, ADAM_OLCEK)
    poz = poz or insan.POZLAR['oturus_dik']
    if yagmur > 0:
        kc = insan.capalar(poz, Madam, yon=-1)['kalp']
        Mi = np.linalg.inv(M)
        kw = Mi @ np.array([kc[0], kc[1], 1.0])
        doga.ciz_yagmur(T, M, zaman, yagmur, alan=(-300, -400, 1400, 2300), ruzgar=-0.1, tohum=5,
                        zemin_y=ADAM_Y + 20, korunan=(kw[0], kw[1], kalkan * ADAM_OLCEK))
    bilgi = insan.ciz_insan(T, Madam, poz, yon=-1, battaniye=1.0, nefes=(zaman * 0.25) % 1.0)
    kx, ky = bilgi['kalp']
    Mn = M_bilesik(M_oteleme(kx, ky), M_olcek(M[0, 0] * ADAM_OLCEK))
    esyalar.ciz_kalp_nuru(T, Mn, 26, parlaklik=parlaklik, isin=isin, zaman=zaman, kalkan=kalkan,
                          isin_kuyruk=kuyruk)
    T.lavi(yol_dikdortgen(-2000, 1150 - 6, 3000, 4000), M, el.karistir('#E2D5BC', '#B9B2B8', 0.55 * gok_koyu),
           yog=0.5, kenar=2.0, dalga=0.14, islak=0.4, islak_gen=9, gran=0.12, akis=0.15, tohum=12)
    el.uzak_agac_sirasi(T, M, -900, 2000, 1154, yuk=46, renk_=el.karistir('#A5B8B0', '#8F8DA3', gok_koyu * 0.6),
                        yog=0.42, tohum=13)
    el.gok(T, M, bulutlar=[], ust=el.karistir('#5F8DC2', '#6F6C8C', gok_koyu),
           orta=el.karistir('#8FB2D6', '#8A87A2', gok_koyu), alt=el.karistir('#EDD9CC', '#B4AEBE', gok_koyu),
           ufuk=0.62, alt_yog=0.32, yog=0.85)
    return bitir(T), bilgi


if __name__ == '__main__':
    # ---- 8 adım --------------------------------------------------------------------------------------------
    parca = []
    for isin in (0.03, 0.10, 0.18, 0.28, 0.42, 0.6, 0.8, 1.0):
        with Sure(f'isin {isin}'):
            img, bilgi = kare(isin, 0.4)
        kx = int(bilgi['kalp'][0])
        parca.append(etiket(cv2.resize(kirp(img, kx - 230, 0, kx + 230, 1500), None, fx=0.5, fy=0.5,
                                       interpolation=cv2.INTER_AREA), f'isin {isin}'))
    pafta(parca, 'nur_isin_8adim')
    # ---- ardışık kareler: isin 0->1 doğrusal 0.85 sn (26 kare); 3..14 arası, baş bölgesi -------------------------
    parca = []
    for i in range(3, 15):
        V = i / 30.0
        isin = min(1.0, V / 0.85)
        img, bilgi = kare(isin, 18.0 + V)
        kx, ky = int(bilgi['kalp'][0]), int(bilgi['kalp'][1])
        parca.append(etiket(kirp(img, kx - 110, ky - 560, kx + 110, ky + 60), f'k{i} {isin:.3f}'))
    pafta(parca, 'nur_isin_ardisik', sutun=12, bosluk=4)
    # ---- baş yakın plan (ön uç yüzden geçerken ve tam ışın) ------------------------------------------------
    parca = []
    for isin in (0.0, 0.16, 0.22, 1.0):
        img, bilgi = kare(isin, 0.4)
        bx, by = int(bilgi['bas'][0]), int(bilgi['bas'][1])
        parca.append(etiket(zum(img, bx - 70, by - 70, bx + 70, by + 150, f=3), f'isin {isin}'))
    pafta(parca, 'nur_isin_bas_yakin')
    # ---- kuyruk (sönüş): ışık kalpten kopar, yukarı çıkar ------------------------------------------------------
    parca = []
    for q in (0.0, 0.15, 0.35, 0.6, 0.85, 1.0):
        img, bilgi = kare(1.0, 0.4, kuyruk=q)
        kx = int(bilgi['kalp'][0])
        parca.append(etiket(cv2.resize(kirp(img, kx - 230, 0, kx + 230, 1500), None, fx=0.5, fy=0.5,
                                       interpolation=cv2.INTER_AREA), f'kuyruk {q}'))
    pafta(parca, 'nur_isin_kuyruk')
