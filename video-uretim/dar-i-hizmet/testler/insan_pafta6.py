"""Pafta 6: battaniye — büyüme (battaniye 0->1) ve kalkışta omuzlardan kayış (battaniye_alfa 1->0), 6'şar adım;
kıyam/rükû/secde büyük (dirsek, el ve kol açıları denetimi)."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
P = insan.POZLAR
boy = 400
s = boy / 600
for ad, fn, x0, x1 in [('battaniye_buyume', lambda t: (P['oturus_hasta'], dict(battaniye=t)), -120, 260),
                       ('battaniye_kayis', lambda t: (insan.kalkis(t * 0.55),
                                                      dict(battaniye=1.0, battaniye_alfa=1.0 - min(1.0, t * 1.2))),
                        -110, 330)]:
    parca, et = [], []
    for i in range(6):
        t = i / 5
        p, kw = fn(t)
        cx = 540 - (x0 + x1) / 2 * s
        img, c, dt = tek(p, boy, x=cx, y=H - 300, **kw)
        parca.append(kirp(img, int(cx + x0 * s), int(H - 300 - 640 * s), int(cx + x1 * s), int(H - 300 + 40 * s)))
        et.append(f't={t:.1f}')
    pafta(parca, f'insan_pafta6_{ad}', et, sutun=6)
parca = []
for ad in ('kiyam', 'ruku', 'secde'):
    p = P[ad]
    x0, y0, x1, y1 = insan.sinir_kutusu(p)
    b = 900
    s2 = b / 600
    cx = 540 - (x0 + x1) / 2 * s2
    img, c, dt = tek(p, b, x=cx, y=H - 100)
    parca.append(kirp(img, int(cx + x0 * s2) - 20, int(H - 100 - 620 * s2), int(cx + x1 * s2) + 20, H - 60))
pafta(parca, 'insan_pafta6_namaz_buyuk', ['kiyam', 'ruku', 'secde'])
