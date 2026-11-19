"""Baş ayrıntıları: farklı pozlarda baş-boyun-yaka kırpıntıları (büyük ölçek)."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
boy = 2600
s = boy / 600
parca, et = [], []
for ad in ['ayakta', 'ayakta_dik', 'kiyam', 'sula', 'ruku', 'oturus_hasta', 'diz_dua', 'secde']:
    p = insan.POZLAR[ad]
    sk = insan.iskelet(p)
    bx, by = insan._nokta(sk['M_bas'], (-1.0, -10.0))
    img, c, dt = tek(p, boy, x=540 - bx * s, y=960 - by * s, zemin_ciz=False)
    parca.append(kirp(img, 540 - 230, 960 - 260, 540 + 230, 960 + 200))
    et.append(ad)
pafta(parca, 'insan_baslar', et, sutun=4)
