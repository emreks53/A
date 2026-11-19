"""Ardışık karelerde sıçrama (pop) denetimi: kalkis, secdeye, yürüyüş, hasta->dik — kare farkı istatistiği."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
P = insan.POZLAR
for ad, fn, n, kw in [('kalkis', insan.kalkis, 60, {}), ('secdeye', insan.secdeye, 45, {}),
                      ('yuruyus', lambda t: insan.yuruyus(t), 40, {}),
                      ('hasta->dik+batt', lambda t: insan.poz_karistir(P['oturus_hasta'], P['oturus_dik'], t), 30,
                       dict(battaniye=1.0)),
                      ('sula_pozu dok', lambda t: insan.sula_pozu(0.25 * t), 20, {}),
                      ('battaniye 0->1', lambda t: P['oturus_hasta'], 30, 'batt'),
                      ('kalkis+kayis', lambda t: insan.kalkis(t * 0.5), 30, 'kayis')]:
    onceki = None
    farklar = []
    for i in range(n + 1):
        t = i / n
        if kw == 'batt':
            kw_ = dict(battaniye=t)
        elif kw == 'kayis':         # sahnedeki gibi: kalkış başlarken battaniye omuzlardan kayar
            kw_ = dict(battaniye=1.0, battaniye_alfa=1.0 - min(1.0, t * 0.5 * 0.85 / 0.4))
        else:
            kw_ = kw
        img, c, dt = tek(fn(t), 500, x=440, y=1500, zemin_ciz=False, **kw_)
        g = img[900:1520, 200:900].astype(np.float32)
        if onceki is not None:
            farklar.append(float(np.abs(g - onceki).mean()))
        onceki = g
    f = np.array(farklar)
    oran = f.max() / (np.median(f) + 1e-6)
    print(f'{ad:18s} medyan {np.median(f):.3f}  max {f.max():.3f} (kare {int(f.argmax())})  max/medyan {oran:.2f}')

# secdeye: avuçlar yere değdikten sonra kaymıyor mu? (bilek konumu, yerel = dünya; dizler DIZ'de sabit)
ws = np.array([insan.iskelet(insan.secdeye(i / 60))['Wr_on'] for i in range(61)])
yerde = ws[:, 1] > -9.5          # düz basan elde bilek yerden ~9.3 birim yukarıda
print('secdeye: avuç yerdeyken bilek x aralığı', np.ptp(ws[yerde, 0]).round(3), ' (0 = kaymıyor)')
