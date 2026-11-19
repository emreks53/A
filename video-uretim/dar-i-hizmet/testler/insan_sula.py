"""Sulama pozu (ibrikle): eski (cokme=0) ve yeni (varsayılan) karşılaştırması + emzik yüksekliği ölçümü.
python3 insan_sula.py [boy=520]"""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
import esyalar
from motor import M_bilesik, M_oteleme, M_donme, M_olcek


def ciz_sula(cokme, egim, boy):
    dok = (egim - 33.0) / 9.0 * 0.25            # sahnedeki eşleme: egim = 33 + 9 * dok_s, sula_pozu(0.25 * dok_s)
    p = insan.sula_pozu(dok, alt_el=esyalar.ibrik_alt_nokta(egim), cokme=cokme)
    s = boy / 600.0
    T = Tuval()
    x, y = 360, H - 260
    M = M_bilesik(M_oteleme(x, y), M_olcek(s))
    bilgi = {}

    def elde(tt, Mel):
        esyalar.ciz_ibrik(tt, Mel, egim=egim, tohum=1)
        bilgi['uc'] = esyalar.ibrik_agzi(Mel, egim)
    insan.ciz_insan(T, M, p, elde=elde)
    zemin(T, y)
    img = rgb8(son_islem(T.R, vinyet=False)).copy()
    uc, yon = bilgi['uc']
    yerel_y = (uc[1] - y) / s
    cv2.circle(img, (int(uc[0]), int(uc[1])), 4, (200, 40, 40), -1)
    cv2.line(img, (int(uc[0]), int(uc[1])), (int(uc[0]), int(y)), (200, 40, 40), 1)
    cv2.putText(img, f'agiz y={yerel_y:.0f}', (int(uc[0]) + 6, int((uc[1] + y) / 2)), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                (160, 40, 40), 1, cv2.LINE_AA)
    return kirp(img, x - int(140 * s), y - int(640 * s), x + int(360 * s), y + int(30 * s)), yerel_y, (uc[0] - x) / s


if __name__ == '__main__':
    boy = int(sys.argv[1]) if len(sys.argv) > 1 else 520
    parca, et = [], []
    for cokme in (0.0, 1.0):
        for egim in (33.0, 38.0, 42.0):
            im, yy, xx = ciz_sula(cokme, egim, boy)
            print(f'cokme={cokme} egim={egim}: emzik ucu yerel (x={xx:.1f}, y={yy:.1f})')
            parca.append(im)
            et.append(f'cokme={cokme:.0f} egim={egim:.0f}')
    pafta(parca, f'insan_sula_{boy}', et, sutun=3)
