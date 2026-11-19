"""Islak toprak (6 adım, sonra zemin lavisi üstüne biner) ve çiçek kâsesine düşen damlanın sıçraması (6 adım,
çiçek önce, sıçrama üstte; ardışık kare şeridi). Büyük ölçek yakın planlar."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from esyalar_ortak import *
from motor import M_yerlestir
import elemanlar as el
import doga


def toprak(p, olc=1.0):
    T = Tuval()
    with Sure(f'toprak {p}'):
        esyalar.ciz_islak_toprak(T, M_yerlestir(540, 1500, olc), 120, 34, p, tohum=2)
    T.lavi(yol_dikdortgen(-20, 1150, 1100, 1940), np.eye(3), '#E2D5BC', yog=0.5, kenar=2, dalga=0.14,
           islak=0.4, islak_gen=9, gran=0.12, akis=0.15, tohum=12)
    el.gok(T, np.eye(3), bulutlar=[], ufuk=0.62, alt_yog=0.32, yog=0.85)
    return bitir(T)


def sicrama(p, olc=1.0, cicek=True):
    T = Tuval()
    Mc = M_yerlestir(540, 1500, olc) @ M_yerlestir(-540, -1500, 1.0)       # (540, 1500) çevresinde ölçek
    kuru = Tuval()
    bilgi = doga.ciz_cicek_fidani(kuru, Mc, 540, 1500, 300, renk_='gul', acilma=0.85, tohum=14)
    (cx, cy), rr, _ = bilgi['cicekler'][0]
    if cicek:
        doga.ciz_cicek_fidani(T, Mc, 540, 1500, 300, renk_='gul', acilma=0.85, tohum=14)
    with Sure(f'sicrama {p:.2f}'):
        esyalar.ciz_sicrama(T, M_yerlestir(cx, cy - rr * 0.15, olc), p, olcek=1.0, tohum=3)
    T.lavi(yol_dikdortgen(-20, 1500, 1100, 1940), Mc, '#E2D5BC', yog=0.5, kenar=2, dalga=0.14,
           islak=0.4, islak_gen=9, gran=0.12, akis=0.15, tohum=12)
    el.gok(T, np.eye(3), bulutlar=[], ufuk=0.62, alt_yog=0.32, yog=0.85)
    return bitir(T), (int(cx), int(cy))


if __name__ == '__main__':
    parca = []
    for p in (0.08, 0.2, 0.35, 0.55, 0.75, 1.0):
        parca.append(etiket(kirp(toprak(p, 2.0), 230, 1380, 850, 1620), f'toprak {p}'))
    pafta(parca, 'islak_toprak_6adim', sutun=3)
    zum(toprak(1.0, 2.0), 240, 1400, 640, 1600, f=2, ad='islak_toprak_yakin')
    parca = []
    for p in (0.04, 0.12, 0.25, 0.42, 0.62, 0.85):
        img, (cx, cy) = sicrama(p, 2.2)
        parca.append(etiket(kirp(img, cx - 170, cy - 210, cx + 170, cy + 90), f'sicrama {p}'))
    pafta(parca, 'sicrama_6adim', sutun=6)
    parca = []
    for i in range(1, 13):
        p = i / 13.0
        img, (cx, cy) = sicrama(p, 1.0)
        parca.append(etiket(kirp(img, cx - 70, cy - 95, cx + 70, cy + 40), f'{i}'))
    pafta(parca, 'sicrama_ardisik', sutun=12, bosluk=4)
