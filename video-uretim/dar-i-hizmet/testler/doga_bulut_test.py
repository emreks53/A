import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import doga, elemanlar as EL
OUT = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/'
T = Tuval()
for i, (kk, y) in enumerate([(1.0, 330), (0.5, 900), (0.0, 1470)]):
    t0 = time.time()
    doga.ciz_firtina_bulutu(T, np.eye(3), 540, y, 900, 330, koyuluk=kk, gelis=1.0, tohum=i)
    print('bulut k=%.1f %.3f s' % (kk, time.time() - t0))
EL.gok(T, np.eye(3), ust='#8E9CB8', orta='#B2BCCD', alt='#D9D4DA')
cv2.imwrite(OUT + 'firtina.png', cv2.cvtColor(rgb8(son_islem(T.R)), cv2.COLOR_RGB2BGR))
# geliş dizisi
T = Tuval()
for i, g in enumerate([0.15, 0.35, 0.6, 0.85]):
    doga.ciz_firtina_bulutu(T, M_yerlestir(540, 240 + i * 480, 0.85), 0, 0, 900, 330, koyuluk=1.0, gelis=g, tohum=0,
                            yon=-1)
EL.gok(T, np.eye(3), ust='#8E9CB8', orta='#B2BCCD', alt='#D9D4DA')
cv2.imwrite(OUT + 'firtina_gelis.png', cv2.cvtColor(rgb8(son_islem(T.R)), cv2.COLOR_RGB2BGR))
