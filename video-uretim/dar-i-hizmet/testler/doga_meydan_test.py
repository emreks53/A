"""Meydan-ı imtihan geniş planı: gök, tepeler, dik yokuş, ufka kıvrılan yol, iri taşlar, basamak taşlı dere, çimen."""
import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import doga, elemanlar as EL
OUT = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/'
zaman = float(sys.argv[1]) if len(sys.argv) > 1 else 0.0
T = Tuval()
M = np.eye(3)
ufuk = 760
sure = {}


def olc(ad, f, *a, **k):
    t0 = time.time()
    r = f(*a, **k)
    sure[ad] = sure.get(ad, 0) + time.time() - t0
    return r


# yol ve dere omurgaları
yol = [(560, 1990), (520, 1760), (380, 1560), (430, 1380), (610, 1250), (700, 1120), (640, 1000), (600, 900),
       (680, 800), (760, 700), (800, 610)]
dere = [(-40, 1210), (180, 1250), (420, 1236), (640, 1262), (860, 1300), (1120, 1290)]
# 1) ön plan çimenleri
for i, (y, s) in enumerate([(1900, 1.3), (1830, 1.15), (1700, 1.0)]):
    olc('cimen', doga.ciz_cimen, T, M, -30, 300, y, 1.2, 0.2, tohum=10 + i, boy=(int(22 * s), int(46 * s)))
    olc('cimen', doga.ciz_cimen, T, M, 760, 1110, y + 20, 1.2, 0.2, tohum=20 + i, boy=(int(22 * s), int(46 * s)))
# 2) yakın iri taşlar
olc('tas', doga.ciz_tas, T, M, 215, 1595, 88, tohum=1)
olc('tas', doga.ciz_tas, T, M, 330, 1620, 46, tohum=2)
olc('tas', doga.ciz_tas, T, M, 890, 1500, 64, tohum=3)
olc('cimen', doga.ciz_cimen, T, M, 140, 420, 1625, 1.0, 0.2, tohum=31, boy=(16, 32))
olc('cimen', doga.ciz_cimen, T, M, 820, 980, 1510, 1.0, 0.2, tohum=32, boy=(14, 28))
# 3) dere (basamak taşları yolun geçtiği yerde)
olc('dere', doga.ciz_dere, T, M, dere, 70, zaman=zaman, tohum=1, daralma=0.0, taslar=0.555)
# 4) yol
olc('yol', doga.ciz_yol, T, M, yol, 250, tohum=1, daralma=0.93)
# 5) orta plan taşları ve çimen
olc('tas', doga.ciz_tas, T, M, 820, 1085, 40, tohum=4)
olc('tas', doga.ciz_tas, T, M, 870, 1100, 24, tohum=5)
olc('tas', doga.ciz_tas, T, M, 470, 985, 30, tohum=6)
olc('tas', doga.ciz_tas, T, M, 560, 860, 18, tohum=7)
olc('tas', doga.ciz_tas, T, M, 720, 905, 14, tohum=8)
for i, (x0, x1, y, s) in enumerate([(0, 300, 1420, 0.8), (720, 1080, 1400, 0.8), (40, 380, 1150, 0.6),
                                    (760, 1080, 1180, 0.6), (0, 420, 1000, 0.45), (820, 1080, 990, 0.45)]):
    olc('cimen', doga.ciz_cimen, T, M, x0, x1, y, 1.6, 0.2, tohum=40 + i, boy=(int(18 * s), int(40 * s)))
# 6) uzakta tek tük ağaçlar
olc('agac', doga.ciz_agac, T, M_yerlestir(170, 905, 0.2), 1.0, tohum=3, sallanma=0.1)
olc('agac', doga.ciz_agac, T, M_yerlestir(950, 860, 0.14), 0.9, tohum=4, sallanma=0.1)
olc('agac', doga.ciz_agac, T, M_yerlestir(330, 830, 0.1), 0.8, tohum=5, sallanma=0.1)
# 7) dik yokuş (sağda) ve ova
olc('yokus', doga.ciz_yokus, T, M, 360, 1100, 1010, 900, 520, tohum=2)
olc('cayir', doga.ciz_cayir, T, M, -20, ufuk - 6, 1100, 1940, tohum=1, ufuk_y=ufuk)
EL.uzak_agac_sirasi(T, M, -20, 520, ufuk, yuk=34, renk_='#9DB3A8', yog=0.42)
EL.tepe_sirasi(T, M, -50, 1130, ufuk - 4, 110, '#B4C3CB', yog=0.32, tohum=4)
EL.tepe_sirasi(T, M, -50, 1130, ufuk - 30, 150, '#C6CFD8', yog=0.22, tohum=9)
EL.gok(T, M, bulutlar=[(260, 300, 300, 110, 1), (820, 200, 240, 90, 2)])
print(' '.join('%s %.3f' % kv for kv in sure.items()))
cv2.imwrite(OUT + 'meydan.png', cv2.cvtColor(rgb8(son_islem(T.R)), cv2.COLOR_RGB2BGR))
