"""Saat: kadran (işaret/ibre opaklığı -> altın güneş), tamam (tamamlanma halkası + ışıma), yelkovan dönme
bulanıklığı (ardışık kareler), dilim/süpürme renk eşitliği (ölçüm). Sahnedeki ölçek: r=175, kamera ~1.25."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from esyalar_ortak import *
from motor import M_yerlestir, e_io
import math
import elemanlar as el

S = 1.25


def kare(**kw):
    T = Tuval()
    Ms = M_yerlestir(540, 700, S)
    esyalar.ciz_saat(T, Ms, 175, tohum=1, **kw)
    el.gok(T, np.eye(3), bulutlar=[(150, 300, 300, 100, 41)], ufuk=0.62, alt_yog=0.32, yog=0.85)
    return bitir(T)


def kes(img, f=0.5):
    return cv2.resize(kirp(img, 40, 200, 1040, 1200), None, fx=f, fy=f, interpolation=cv2.INTER_AREA)


if __name__ == '__main__':
    parca = []
    for kd in (1.0, 0.7, 0.4, 0.15, 0.0):
        with Sure(f'kadran {kd}'):
            img = kare(dilim=1.0, gun=1.0, gorunurluk=1.0, akrep=0.0, yelkovan=0.0, kadran=kd)
        parca.append(etiket(kes(img), f'kadran {kd}'))
    pafta(parca, 'saat_kadran')
    parca = []
    for tm in (0.0, 0.06, 0.15, 0.3, 0.5, 0.75, 0.95):
        with Sure(f'tamam {tm}'):
            img = kare(dilim=1.0, gun=1.0, gorunurluk=1.0, akrep=0.0, yelkovan=0.0, kadran=1.0, tamam=tm)
        parca.append(etiket(kes(img, 0.42), f'tamam {tm}'))
    pafta(parca, 'saat_tamam', sutun=7)
    parca = []
    for tm in (0.06, 0.3, 0.6):
        img = kare(dilim=1.0, gun=1.0, gorunurluk=1.0, akrep=0.0, yelkovan=0.0, kadran=0.0, tamam=tm)
        parca.append(etiket(kes(img, 0.42), f'kadran 0 tamam {tm}'))
    pafta(parca, 'saat_tamam_gunes')
    # ---- yelkovan dönme bulanıklığı: gün süpürmesi (varsayılan ibreler), 0.87 sn e_io, ardışık 8 kare ---------------
    parca = []
    onceki = None
    for i in range(10, 18):
        u = e_io(i / 26.0)
        yel = 360.0 * (1.0 + 2.0 * u)
        yel_o = 360.0 * (1.0 + 2.0 * e_io((i - 1) / 26.0))
        with Sure(f'bulanik {i}'):
            img = kare(dilim=1.0, gun=u, gorunurluk=1.0, yelkovan=yel, yelkovan_onceki=yel_o)
        parca.append(etiket(cv2.resize(kirp(img, 240, 400, 840, 1000), None, fx=0.45, fy=0.45,
                                       interpolation=cv2.INTER_AREA), f'k{i} {yel % 360:.0f}'))
    pafta(parca, 'saat_yelkovan_bulanik', sutun=8, bosluk=4)
    img = kare(dilim=1.0, gun=0.3, gorunurluk=1.0, akrep=30 + 330 * 0.3, yelkovan=200.0, yelkovan_onceki=160.0)
    zum(img, 540 - 230, 700 - 230, 540 + 230, 700 + 230, f=2, ad='saat_yelkovan_yakin')
    # ---- dilim/süpürme renk eşitliği: 15° (saatlik dilim) ve 120° (süpürülmüş) noktalarında ortalama renk -------
    T = Tuval()
    Ms = M_yerlestir(540, 700, S)
    esyalar.ciz_saat(T, Ms, 175, dilim=1.0, gun=0.6, gorunurluk=0.0, tohum=1)
    R = T.R
    for a in (15, 60, 120, 180):
        th = math.radians(a - 90)
        x, y = int(540 + math.cos(th) * 175 * S * 0.55), int(700 + math.sin(th) * 175 * S * 0.55)
        print('aci', a, 'renk', np.round(R[y - 12:y + 12, x - 12:x + 12].reshape(-1, 3).mean(0), 4))
