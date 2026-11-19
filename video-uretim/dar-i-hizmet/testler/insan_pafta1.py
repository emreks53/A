"""Pafta 1/2: bütün ana pozlar yan yana (~500 px ve ~150 px boy)."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
ADLAR = ['ayakta', 'yuru_0', 'yuru_1', 'yuru_2', 'yuru_3', 'sula', 'sula_dok', 'kiyam', 'ruku', 'secde',
         'oturus_hasta', 'oturus_dik', 'diz_dua', 'ayakta_dik']
boy = int(sys.argv[1]) if len(sys.argv) > 1 else 500
s = boy / 600.0
parca, etik, sureler = [], [], []
for ad in ADLAR:
    p = insan.POZLAR[ad]
    x0, y0, x1, y1 = insan.sinir_kutusu(p) if hasattr(insan, 'sinir_kutusu') else (-120, -620, 420, 10)
    cx = 540 - (x0 + x1) / 2 * s
    gy = H - 300
    img, c, dt = tek(p, boy, x=cx, y=gy)
    pad = int(30 * s) + 8
    X0 = int(cx + x0 * s) - pad
    X1 = int(cx + x1 * s) + pad
    Y0 = int(gy - 625 * s) - 10
    Y1 = int(gy + 40 * s) + 8
    parca.append(kirp(img, X0, Y0, X1, Y1))
    etik.append(ad if boy >= 300 else '')
    sureler.append(dt)
print('ort sure', np.mean(sureler), 'max', np.max(sureler))
pafta(parca, f'pafta_pozlar_{boy}', etik, sutun=int(sys.argv[2]) if len(sys.argv) > 2 else None)
