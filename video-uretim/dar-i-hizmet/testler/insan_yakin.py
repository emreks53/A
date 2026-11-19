"""Seçili pozları büyük (~900 px boy) çizer: ayrıntı denetimi."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
adlar = sys.argv[1].split(',')
boy = int(sys.argv[2]) if len(sys.argv) > 2 else 900
ad_cikti = sys.argv[3] if len(sys.argv) > 3 else 'insan_yakin'
s = boy / 600.0
parca = []
for ad in adlar:
    p = insan.POZLAR[ad] if ad in insan.POZLAR else eval('insan.' + ad)
    x0, y0, x1, y1 = insan.sinir_kutusu(p)
    cx = 540 - (x0 + x1) / 2 * s
    gy = int(H / 2 + (y1 - y0) / 2 * s)
    img, c, dt = tek(p, boy, x=cx, y=gy)
    parca.append(kirp(img, int(cx + x0 * s) - 10, int(gy + y0 * s) - 10, int(cx + x1 * s) + 10, int(gy + 30 * s)))
    print(ad, round(dt, 3))
pafta(parca, ad_cikti, adlar, sutun=3)
