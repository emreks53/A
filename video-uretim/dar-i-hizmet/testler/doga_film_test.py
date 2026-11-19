"""Ardışık kareleri yan yana dizer (pop / titreme gözle denetimi)."""
import sys
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import doga
OUT = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/'
tur = sys.argv[1] if len(sys.argv) > 1 else 'agac'
a0, a1 = float(sys.argv[2]) if len(sys.argv) > 2 else 0.12, float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
n = 12
kareler = []
for i, v in enumerate(np.linspace(a0, a1, n)):
    T = Tuval()
    if tur == 'agac':
        doga.ciz_agac(T, M_yerlestir(540, 1800, 1.0), v, tohum=0)
        kirp = T.R[700:1820, 140:940]
    elif tur == 'cicek':
        doga.ciz_cicek_fidani(T, np.eye(3), 540, 1500, 700, 'allik', acilma=v, tohum=0)
        kirp = T.R[700:1520, 140:940]
    elif tur == 'kok':
        doga.ciz_kokler(T, M_yerlestir(540, 500, 1.0), 0.9, v, tohum=0)
        kirp = T.R[480:1200, 140:940]
    im = rgb8(son_islem(T.R))
    k = cv2.resize(rgb8(kirp), (360, int(360 * kirp.shape[0] / kirp.shape[1])))
    cv2.putText(k, '%.3f' % v, (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (40, 40, 40), 2)
    kareler.append(k)
sat = [np.concatenate(kareler[i:i + 4], 1) for i in range(0, n, 4)]
cv2.imwrite(OUT + 'film_%s.png' % tur, cv2.cvtColor(np.concatenate(sat, 0), cv2.COLOR_RGB2BGR))
