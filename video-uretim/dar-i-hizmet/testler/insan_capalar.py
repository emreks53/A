"""Çapa noktalarını işaretler; oturus_hasta -> oturus_dik battaniyeli karışım; kalkışta battaniye çözülmesi."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
parca, et = [], []
for ad in ['ayakta', 'sula', 'secde', 'diz_dua']:
    p = insan.POZLAR[ad]
    x0, y0, x1, y1 = insan.sinir_kutusu(p)
    s = 600 / 600
    cx = 540 - (x0 + x1) / 2 * s
    img, c, dt = tek(p, 600, x=cx, y=1500)
    img = img.copy()
    for k, col in [('bas', (200, 0, 0)), ('bas_ust', (255, 120, 0)), ('kalp', (220, 0, 120)), ('el_on', (0, 150, 0)),
                   ('el_arka', (0, 90, 0)), ('diz', (0, 0, 220)), ('kalca', (120, 0, 200)), ('ayak_on', (0, 160, 200)),
                   ('ayak_arka', (0, 100, 140))]:
        q = tuple(int(v) for v in c[k])
        cv2.circle(img, q, 5, col, -1)
    q = c['el_on']; a = np.radians(c['el_on_aci'])
    cv2.line(img, tuple(int(v) for v in q), (int(q[0] + 40 * np.cos(a)), int(q[1] + 40 * np.sin(a))), (0, 0, 0), 2)
    parca.append(kirp(img, int(cx + x0 * s) - 20, int(1500 + y0 * s) - 20, int(cx + x1 * s) + 20, 1530))
    et.append(ad)
pafta(parca, 'insan_capalar', et)
parca, et = [], []
for t in [0.0, 0.33, 0.66, 1.0]:
    p = insan.poz_karistir(insan.POZLAR['oturus_hasta'], insan.POZLAR['oturus_dik'], t)
    img, c, dt = tek(p, 500, x=440, y=1500, battaniye=1.0)
    parca.append(kirp(img, 360, 1150, 660, 1520)); et.append(f'hasta->dik {t:.2f}')
for t, al in [(0.0, 1.0), (0.12, 0.5), (0.25, 0.0)]:
    p = insan.kalkis(t)
    img, c, dt = tek(p, 500, x=440, y=1500, battaniye=1.0, battaniye_alfa=al)
    parca.append(kirp(img, 360, 1150, 660, 1520)); et.append(f'kalkis {t} alfa {al}')
    print('kalkis', t, round(dt, 3))
pafta(parca, 'insan_battaniye_gecis', et)
