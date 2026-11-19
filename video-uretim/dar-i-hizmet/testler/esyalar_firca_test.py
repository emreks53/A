"""Islak fırça darbesi: 'değildir' — üç simgenin üstünden soldan sağa geçip onları kaldırır (8 adım + ardışık
kareler + yakın plan). Simgeler ön ucun gerisinde test içinde silinir (sahnede de dönen ön uç x'i kullanılır)."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from esyalar_ortak import *
from motor import M_yerlestir, smoothstep
import elemanlar as el

fonk = [esyalar.ciz_meyve_tabagi, esyalar.ciz_kese, esyalar.ciz_madalya]
BX, BY, GEN, YUK = 110.0, 700.0, 860.0, 310.0


def kare(p, simge=True):
    T = Tuval()
    # fırçanın şimdiki ön ucu (çizmeden): simgeler onun gerisinde kalkar
    xf = esyalar.firca_cephe_x(p, GEN) + BX

    def erit(m, X, Y):
        return m * smoothstep(xf - 40, xf + 6, X + 0.22 * (Y - BY) + 0.16 * YUK * ((Y - BY) / (0.5 * YUK)) ** 2)
    if simge:
        xs = [292, 560, 828]
        for i, f in enumerate(fonk):
            Ms = M_yerlestir(xs[i], 700, 0.85)
            with T.gorunurluk(1.0, erit if p > 0 else None, M=np.eye(3)):
                f(T, Ms, olcek=1.0, tohum=i + 1)
                esyalar.ciz_simge_halkasi(T, Ms, 150, '#F1E3D3', ilerleme=1.0, tohum=i + 5)
    with Sure(f'firca {p:.2f}'):
        on = esyalar.ciz_firca_darbesi(T, M_yerlestir(BX, BY, 1.0), p, GEN, YUK, tohum=3)
    el.gok(T, np.eye(3), bulutlar=[(200, 470, 300, 100, 41), (850, 950, 240, 85, 42)], ufuk=0.62, alt_yog=0.32,
           yog=0.85)
    return bitir(T), on


if __name__ == '__main__':
    parca = []
    for p in (0.04, 0.14, 0.26, 0.40, 0.55, 0.70, 0.84, 0.95):
        img, on = kare(p)
        parca.append(etiket(cv2.resize(kirp(img, 40, 480, 1040, 960), None, fx=0.5, fy=0.5,
                                       interpolation=cv2.INTER_AREA), f'{p:.2f} on {on:.0f}'))
    pafta(parca, 'firca_simgeler_8adim', sutun=4)
    img, on = kare(0.5)
    zum(img, int(on) - 300, 520, int(on) + 60, 920, f=2, ad='firca_yakin')
    # ardışık: 0.6 sn doğrusal (18 kare), 6..13. kareler
    parca = []
    for i in range(6, 14):
        p = i / 18.0
        img, on = kare(p)
        parca.append(etiket(cv2.resize(kirp(img, 300, 500, 900, 940), None, fx=0.4, fy=0.4,
                                       interpolation=cv2.INTER_AREA), f'k{i}'))
    pafta(parca, 'firca_ardisik', sutun=8, bosluk=4)
