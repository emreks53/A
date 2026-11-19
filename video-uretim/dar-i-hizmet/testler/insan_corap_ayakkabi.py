"""Çorap yakın planları (secde, diz_otur, diz_sukur, oturus_dik, ayakta) ve yerdeki ayakkabı çifti (iki ölçek, iki yön).
python3 insan_corap_ayakkabi.py"""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
from motor import M_bilesik, M_oteleme, M_olcek


def ayak_yakin(ad, boy=1500, ayakkabi=False, genis=230, yuk=200):
    p = insan.POZLAR[ad]
    s = boy / 600.0
    x, y = 540, H - 260
    img, c, dt = tek(p, boy, x=x, y=y, ayakkabi=ayakkabi)
    a = c['ayak_on']
    cx, cy = int(a[0]), int(min(a[1], y - 10))
    return kirp(img, cx - genis, cy - yuk, cx + genis, int(y + 26 * s * 0.4))


if __name__ == '__main__':
    parca, et = [], []
    for ad in ('secde', 'diz_otur', 'diz_sukur', 'secdeden_kalk'):
        p = insan.POZLAR.get(ad)
        if p is None:
            continue
        for ayk in (False, True):
            im = ayak_yakin(ad, 1500, ayk, 230, 240)
            parca.append(im)
            et.append(f'{ad} {"ayakkabi" if ayk else "corap"}')
    pafta(parca, 'insan_corap_yakin', et, sutun=4)
    # ayakkabı çifti
    parca, et = [], []
    for olc, boy, yon in ((1.0, 1500, 1), (1.0, 1500, -1), (1.0, 520, 1)):
        T = Tuval()
        s = boy / 600.0
        x, y = 540, H - 300
        M = M_bilesik(M_oteleme(x, y), M_olcek(s))
        insan.ciz_ayakkabi_cifti(T, M, olcek=olc, tohum=3, yon=yon)
        # karşılaştırma: aynı ölçekte ayaktaki adamın ayağı (ayakta, ayakkabılı) yanında
        if boy <= 600:
            insan.ciz_insan(T, M_bilesik(M_oteleme(x + 150 * s, y), M_olcek(s)), insan.POZLAR['ayakta'])
        zemin(T, y)
        img = rgb8(son_islem(T.R, vinyet=False))
        if boy > 600:
            parca.append(kirp(img, x - int(80 * s), y - int(50 * s), x + int(85 * s), y + int(14 * s)))
        else:
            parca.append(kirp(img, x - int(90 * s), y - int(620 * s), x + int(260 * s), y + int(20 * s)))
        et.append(f'cift olcek={olc} yon={yon} boy={boy}')
    pafta(parca, 'insan_ayakkabi_cifti', et)
