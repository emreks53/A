"""Bütün pozlar, ayakkabılı (üst sıralar) ve çoraplı (alt sıralar), ~500 px boy.
python3 insan_pafta_yeni.py [boy=500] [sutun=8]"""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *

ADLAR = ['ayakta', 'ayakta_dik', 'yuru_0', 'yuru_2', 'sula', 'sula_dok', 'kiyam', 'ruku',
         'diz_dua', 'diz_secde_1', 'diz_secde_2', 'secde', 'secde_kalk', 'diz_otur', 'diz_sukur',
         'oturus_hasta', 'oturus_dik', 'kalkis_1', 'kalkis_2', 'kalkis_3']


def poz_karesi(ad, boy, ayakkabi):
    p = insan.POZLAR[ad]
    s = boy / 600.0
    x0, y0, x1, y1 = insan.sinir_kutusu(p)
    cx = 540 - (x0 + x1) / 2 * s
    gy = H - 300
    img, c, dt = tek(p, boy, x=cx, y=gy, ayakkabi=ayakkabi)
    pad = int(30 * s) + 8
    return kirp(img, int(cx + x0 * s) - pad, int(gy - 625 * s) - 10, int(cx + x1 * s) + pad, int(gy + 40 * s) + 8), dt


if __name__ == '__main__':
    boy = int(sys.argv[1]) if len(sys.argv) > 1 else 500
    sutun = int(sys.argv[2]) if len(sys.argv) > 2 else 8
    for ayk in (True, False):
        parca, et, sure = [], [], []
        for ad in ADLAR:
            im, dt = poz_karesi(ad, boy, ayk)
            parca.append(im)
            et.append(ad)
            sure.append(dt)
        print('ayakkabi' if ayk else 'corap', 'ort sure %.3f max %.3f' % (np.mean(sure), np.max(sure)))
        pafta(parca, f'insan_pafta_pozlar_{boy}_' + ('ayakkabi' if ayk else 'corap'), et, sutun=sutun)
