import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import doga
OUT = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/'

def kaydet(T, ad):
    cv2.imwrite(OUT + ad, cv2.cvtColor(rgb8(son_islem(T.R)), cv2.COLOR_RGB2BGR))

args = sys.argv[1:] or ['serit', 'buyuk']
if 'serit' in args:
    T = Tuval()
    sat1 = [(0.0, 140), (0.15, 400), (0.3, 660), (0.5, 920)]
    sat2 = [(0.7, 190), (0.85, 540), (1.0, 890)]
    for (g, x) in sat1 + sat2:
        y = 860 if (g, x) in sat1 else 1800
        t0 = time.time()
        doga.ciz_agac(T, M_yerlestir(x, y, 0.42), g, tohum=0)
        print('g=%.2f  %.3f s' % (g, time.time() - t0))
    T.lavi(yol_dikdortgen(0, 860, 1080, 880), np.eye(3), '#C9B899', yog=0.4, kenar=1.2)
    T.lavi(yol_dikdortgen(0, 1800, 1080, 1820), np.eye(3), '#C9B899', yog=0.4, kenar=1.2)
    kaydet(T, 'agac_serit.png')
if 'buyuk' in args:
    sayilar = []
    for a in sys.argv[1:]:
        try:
            sayilar.append(float(a))
        except ValueError:
            pass
    for g in (sayilar or [1.0]):
        T = Tuval()
        t0 = time.time()
        r = doga.ciz_agac(T, M_yerlestir(540, 1500, 1.0), g, tohum=0)
        print('buyuk g=%.2f %.3f s' % (g, time.time() - t0), r)
        kaydet(T, 'agac_buyuk_%03d.png' % int(g * 100))
