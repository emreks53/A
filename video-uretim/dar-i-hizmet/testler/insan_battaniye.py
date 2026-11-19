import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
parca = []
for ad, b in [('oturus_hasta', 0.0), ('oturus_hasta', 0.35), ('oturus_hasta', 0.7), ('oturus_hasta', 1.0), ('oturus_dik', 1.0)]:
    p = insan.POZLAR[ad]
    s = 900 / 600
    img, c, dt = tek(p, 900, x=430, y=1300, battaniye=b)
    parca.append(kirp(img, 300, 900, 760, 1340))
    print(ad, b, round(dt, 3))
pafta(parca, 'insan_battaniye', [f'b={b}' for b in (0, .35, .7, 1, 1)])
