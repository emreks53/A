import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import doga, elemanlar as EL
OUT = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/'
T = Tuval()
# üst: g=1 tam kesit, alt: g=0.4
for (x, y, s, g, d) in [(540, 760, 0.55, 1.0, 1.0), (300, 1500, 0.9, 0.4, 1.0), (800, 1500, 0.9, 0.4, 0.4)]:
    M = M_yerlestir(x, y, s)
    t0 = time.time()
    r = doga.ciz_agac(T, M, g, tohum=0)
    t1 = time.time()
    doga.ciz_kokler(T, M, g, d, tohum=0)
    t2 = time.time()
    print('agac %.3f kok %.3f' % (t1 - t0, t2 - t1))
t0 = time.time()
doga.ciz_toprak_kesiti(T, np.eye(3), 30, 1050, 760, 1100, tohum=1)
doga.ciz_toprak_kesiti(T, np.eye(3), 30, 1050, 1500, 1880, tohum=2)
print('toprak %.3f' % ((time.time() - t0) / 2))
EL.gok(T, np.eye(3), bulutlar=[(250, 150, 300, 110, 1), (820, 1060 - 900, 240, 90, 2)])
cv2.imwrite(OUT + 'kok_kesit.png', cv2.cvtColor(rgb8(son_islem(T.R)), cv2.COLOR_RGB2BGR))
