import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import doga, elemanlar as EL
OUT = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/'
T = Tuval()
M = np.eye(3)
acs = [0.0, 0.3, 0.6, 1.0]
for row, (renk_, tohum, y) in enumerate([('allik', 0, 820), ('seftali', 3, 1350), ('gul', 5, 1860)]):
    doga.ciz_tarh(T, M, 20, 1060, y, tohum=row, yuk=55, bolum='on')
    for i, a in enumerate(acs):
        x = 140 + i * 267
        t0 = time.time()
        r = doga.ciz_cicek_fidani(T, M, x, y, 300, renk_, acilma=a, sallanma=0.0, solgunluk=0.0, tohum=tohum)
        print(renk_, a, '%.3f' % (time.time() - t0))
    doga.ciz_tarh(T, M, 20, 1060, y, tohum=row, yuk=55, bolum='arka')
# üstte: solgunluk ve sallanma
doga.ciz_tarh(T, M, 20, 1060, 330, tohum=9, yuk=55, bolum='on')
doga.ciz_cicek_fidani(T, M, 200, 330, 300, 'beyaz', acilma=1.0, solgunluk=0.0, tohum=7)
doga.ciz_cicek_fidani(T, M, 540, 330, 300, 'beyaz', acilma=1.0, solgunluk=1.0, tohum=7)
doga.ciz_cicek_fidani(T, M, 880, 330, 300, 'beyaz', acilma=1.0, sallanma=1.0, tohum=7)
doga.ciz_tarh(T, M, 20, 1060, 330, tohum=9, yuk=55, bolum='arka')
cv2.imwrite(OUT + 'cicek_fidani.png', cv2.cvtColor(rgb8(son_islem(T.R)), cv2.COLOR_RGB2BGR))
