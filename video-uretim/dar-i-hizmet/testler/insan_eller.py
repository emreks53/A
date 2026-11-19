"""El ayrıntıları: büyük ölçekte el çevresi kırpıntıları."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
boy = 3200
s = boy / 600
parca, et = [], []
for ad, anahtar in [('ayakta', 'el_on'), ('diz_dua', 'el_on'), ('sula', 'el_on'), ('secde', 'el_on'),
                    ('ruku', 'el_on'), ('oturus_dik', 'el_on'), ('kiyam', 'el_on')]:
    p = insan.POZLAR[ad]
    sk = insan.iskelet(p)
    ex, ey = sk['avuc_on']
    x = 540 - ex * s
    y = 960 - ey * s
    img, c, dt = tek(p, boy, x=x, y=y, zemin_ciz=False)
    parca.append(kirp(img, 540 - 260, 960 - 260, 540 + 260, 960 + 260))
    et.append(ad)
pafta(parca, 'insan_eller', et, sutun=4)
