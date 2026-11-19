"""Simge halkası (saydam ıslak halka): üçlü sıra gök önünde (sahne ölçeği), yakın plan, açılma (ilerleme) adımları
ve ardışık kare şeridi; karşılaştırma için eski örtücü disk (saydam=False)."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from esyalar_ortak import *
from motor import M_yerlestir, e_out
import elemanlar as el

fonk = [esyalar.ciz_meyve_tabagi, esyalar.ciz_kese, esyalar.ciz_madalya]


def sira(saydam=True, p=1.0, olc=0.85):
    T = Tuval()
    xs = [292, 560, 828]
    for i, f in enumerate(fonk):
        Ms = M_yerlestir(xs[i], 700, olc)
        f(T, Ms, olcek=1.0, tohum=i + 1)
        with Sure('halka'):
            esyalar.ciz_simge_halkasi(T, Ms, 150, '#F1E3D3', ilerleme=p, tohum=i + 5, saydam=saydam)
    el.gok(T, np.eye(3), bulutlar=[(200, 500, 300, 100, 41), (850, 670, 240, 85, 42)], ufuk=0.62, alt_yog=0.32,
           yog=0.85)
    return bitir(T)


if __name__ == '__main__':
    yeni = sira(True)
    eski = sira(False)
    pafta([kirp(eski, 0, 520, 1080, 880), kirp(yeni, 0, 520, 1080, 880)], 'halka_sira_eski_yeni', sutun=1)
    zum(yeni, 140, 550, 450, 860, f=2, ad='halka_yakin')
    parca = []
    for p in (0.1, 0.25, 0.45, 0.7, 1.0):
        img = sira(True, p)
        parca.append(etiket(cv2.resize(kirp(img, 140, 540, 720, 860), None, fx=0.6, fy=0.6,
                                       interpolation=cv2.INTER_AREA), f'ilerleme {p}'))
    pafta(parca, 'halka_acilma')
    # ardışık: sahnedeki gibi e_out ile 0.55 sn (17 kare); ilk 8 kare, tek halka
    parca = []
    for i in range(1, 9):
        p = e_out(min(1.0, i / 16.5))
        T = Tuval()
        Ms = M_yerlestir(560, 700, 0.85)
        esyalar.ciz_kese(T, Ms, olcek=1.0, tohum=2)
        esyalar.ciz_simge_halkasi(T, Ms, 150, '#F1E3D3', ilerleme=p, tohum=6)
        el.gok(T, np.eye(3), bulutlar=[], ufuk=0.62, alt_yog=0.32, yog=0.85)
        parca.append(etiket(kirp(bitir(T), 420, 560, 700, 840), f'k{i} {p:.2f}'))
    pafta(parca, 'halka_ardisik', sutun=8, bosluk=4)
