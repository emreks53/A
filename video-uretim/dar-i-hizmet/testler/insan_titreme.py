"""Ardışık karelerde sıçrama (pop) denetimi: kalkis, secdeye, yürüyüş, hasta->dik — kare farkı istatistiği."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
P = insan.POZLAR
for ad, fn, n, kw in [('kalkis', insan.kalkis, 60, {}), ('secdeye', insan.secdeye, 45, {}),
                      ('yuruyus', lambda t: insan.yuruyus(t), 40, {}),
                      ('hasta->dik+batt', lambda t: insan.poz_karistir(P['oturus_hasta'], P['oturus_dik'], t), 30,
                       dict(battaniye=1.0))]:
    onceki = None
    farklar = []
    for i in range(n + 1):
        t = i / n
        img, c, dt = tek(fn(t), 500, x=440, y=1500, zemin_ciz=False, **kw)
        g = img[900:1520, 200:900].astype(np.float32)
        if onceki is not None:
            farklar.append(float(np.abs(g - onceki).mean()))
        onceki = g
    f = np.array(farklar)
    oran = f.max() / (np.median(f) + 1e-6)
    print(f'{ad:18s} medyan {np.median(f):.3f}  max {f.max():.3f} (kare {int(f.argmax())})  max/medyan {oran:.2f}')
