import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import doga
OUT = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/'
kare = []
for i, z in enumerate([0.0, 0.033, 0.066, 0.4]):
    T = Tuval()
    kor = (540, 900, 180)
    T.lavi(yol_dikdortgen(0, 0, 1080, 1920), np.eye(3), '#A9B3C6', yog=0.35, kenar=1)
    T.isik(yol_daire(*kor), np.eye(3), '#FFE2A0', guc=0.5, yumusak=50)
    t0 = time.time()
    doga.ciz_yagmur(T, np.eye(3), z, 1.0, alan=(0, 0, 1080, 1920), ruzgar=0.15, tohum=0, zemin_y=1500, korunan=kor)
    print('yagmur %.3f' % (time.time() - t0))
    im = rgb8(son_islem(T.R))
    kare.append(im[600:1560, 300:780])
cv2.imwrite(OUT + 'yagmur_kalkan.png', cv2.cvtColor(np.concatenate(kare, 1), cv2.COLOR_RGB2BGR))
