"""Şikâyet bulutu: oluşum 10 adım (doğrusal sürüş, önden yüklü değil), kaldırma 10 ardışık kare (doğrusal
0.55 sn = 16.5 kare; fırça görünür: firca=1), kaldırma 10 adım firca=0 (eski davranış) ve yakın plan.
Sahne gibi: secde eden adamın başının üstünde, insan + zemin + gök arkada."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from esyalar_ortak import *
from motor import M_yerlestir
import elemanlar as el
import insan

M = M_yerlestir(560, 1400, 0.95)
POZ = insan.POZLAR['secde']
BAS = insan.capalar(POZ, M, yon=-1)['bas_ust']


def kare(ol, ka, z=0.5, firca=1.0, olc=1.0):
    T = Tuval()
    Mb = M_bilesik(M_oteleme(BAS[0], BAS[1] - 150 * olc), M_olcek(olc))
    with Sure(f'sikayet {ol:.2f} {ka:.2f}'):
        esyalar.ciz_sikayet_bulutu(T, Mb, olcek=1.0, olusum=ol, kaldirma=ka, zaman=z, tohum=4, firca=firca)
    insan.ciz_insan(T, M, POZ, yon=-1)
    T.lavi(yol_dikdortgen(-20, 1390, 1100, 1940), np.eye(3), '#E2D5BC', yog=0.5, kenar=2, dalga=0.14,
           islak=0.4, islak_gen=9, gran=0.12, akis=0.15, tohum=12)
    el.gok(T, np.eye(3), bulutlar=[], ufuk=0.62, alt_yog=0.32, yog=0.85)
    return bitir(T)


def kes(img, olc=1.0):
    x0, y0 = int(BAS[0]) - int(170 * olc), int(BAS[1]) - int(330 * olc)
    return kirp(img, x0, y0, x0 + int(340 * olc), y0 + int(370 * olc))


if __name__ == '__main__':
    parca = []
    for i in range(1, 11):
        ol = i / 10.0
        parca.append(etiket(kes(kare(ol, 0.0, z=25.2 + i * 0.044)), f'olusum {ol:.1f}'))
    pafta(parca, 'sikayet_olusum_10adim', sutun=10, bosluk=4)
    parca = []
    for i in range(0, 10):
        ka = (i + 1) / 16.5
        parca.append(etiket(kes(kare(1.0, ka, z=25.7 + i / 30.0)), f'k{i + 1} {ka:.2f}'))
    pafta(parca, 'sikayet_kaldirma_ardisik', sutun=10, bosluk=4)
    parca = []
    for ka in (0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9):
        parca.append(etiket(kes(kare(1.0, ka, firca=0.0)), f'f0 {ka:.1f}'))
    pafta(parca, 'sikayet_kaldirma_fircasiz', sutun=10, bosluk=4)
    img = kare(1.0, 0.35, olc=2.6)
    cx, cy = int(BAS[0]), int(BAS[1] - 150 * 2.6)
    zum(img, max(0, cx - 300), cy - 230, cx + 300, cy + 250, f=1, ad='sikayet_kaldirma_yakin')
