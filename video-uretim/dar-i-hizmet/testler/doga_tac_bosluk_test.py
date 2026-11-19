"""Olgun taç yakın plan: koyu çekirdekte delik yok, yalnız kenara yakın 3-5 küçük yumuşak kenarlı gök boşluğu.
Pafta: 4 tohum (üst sıra) + sahne ağacı (tohum 1) büyüme ve sallanma ardışık adımları (alt sıra).
python3 testler/doga_tac_bosluk_test.py"""
import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import doga, elemanlar as EL
OUT = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/'


def kare(toh, g=1.0, sal=0.1, olc=1.05):
    T = Tuval()
    t0 = time.time()
    r = doga.ciz_agac(T, M_yerlestir(540, 1700, olc), g, tohum=toh, sallanma=sal)
    sure = time.time() - t0
    EL.gok(T, np.eye(3))
    return rgb8(son_islem(T.R)), sure, r


ust = []
for toh in (0, 1, 2, 3):
    im, s, r = kare(toh)
    print('tohum %d  %.3f s  bosluk %s' % (toh, s, doga._agac_kenar_bosluklari(doga._agac_iskelet(toh), toh)))
    ust.append(im[560:1420, 60:1020])
pafta = np.concatenate([np.concatenate(ust[:2], 1), np.concatenate(ust[2:], 1)], 0)
cv2.imwrite(OUT + 'doga_tac_bosluk.png', cv2.cvtColor(pafta, cv2.COLOR_RGB2BGR))
# ardışık adımlar (sahne ağacı): büyüme 0.80..1.0 ve sallanma salınımı — boşluklar sıçramadan açılır/kayar
sat = []
for i, (g, sal) in enumerate([(0.80, 0.1), (0.85, 0.12), (0.9, 0.14), (0.95, 0.16), (1.0, 0.18), (1.0, 0.5)]):
    im, s, r = kare(1, g, sal, 0.86)
    sat.append(cv2.resize(im[700:1500, 120:960], (420, 400), interpolation=cv2.INTER_AREA))
cv2.imwrite(OUT + 'doga_tac_bosluk_ardisik.png', cv2.cvtColor(np.concatenate(sat, 1), cv2.COLOR_RGB2BGR))
