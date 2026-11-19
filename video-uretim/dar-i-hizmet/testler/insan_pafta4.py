"""Pafta 4: geçişler — oturus_dik -> ayakta_dik (kalkis, 6 adım) ve diz_dua -> secde (secdeye, 6 adım)."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
boy = int(sys.argv[1]) if len(sys.argv) > 1 else 500
s = boy / 600
for ad, fn, x0, x1 in [('gecis_kalkis', insan.kalkis, -90, 330), ('gecis_secde', insan.secdeye, -80, 400)]:
    parca, et = [], []
    for i in range(6):
        t = i / 5
        p = fn(t)
        img, c, dt = tek(p, boy, x=540 - (x0 + x1) / 2 * s, y=H - 300)
        cx = 540 - (x0 + x1) / 2 * s
        parca.append(kirp(img, int(cx + x0 * s), int(H - 300 - 640 * s), int(cx + x1 * s), int(H - 300 + 40 * s)))
        et.append(f't={t:.1f}')
    pafta(parca, f'insan_pafta4_{ad}_{boy}', et, sutun=6)
