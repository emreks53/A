"""Animasyon sürekliliği: ardışık karelerde ani sıçrama (pop) var mı? Kare farkı enerjisi ve en büyük yerel fark."""
import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import doga
OUT = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/'


def kare(f):
    T = Tuval()
    f(T)
    return T.R.copy()


def incele(ad, fs):
    onceki = None
    rap = []
    for i, f in enumerate(fs):
        R = kare(f)
        if onceki is not None:
            d = np.abs(R - onceki).max(2)
            # yerel sıçrama: 9x9 ortalama farkın en büyüğü
            yd = cv2.blur(d, (9, 9))
            rap.append((i, float(d.mean() * 1000), float(yd.max())))
        onceki = R
    print(ad)
    for (i, m, y) in rap:
        print('  %2d  ort %.2f  yerel %.3f %s' % (i, m, y, '<<<' if y > 0.12 else ''))


if 'agac' in sys.argv or len(sys.argv) == 1:
    gs = np.linspace(0.0, 1.0, 34)
    incele('agac', [lambda T, g=g: doga.ciz_agac(T, M_yerlestir(540, 1700, 0.9), g, tohum=0) for g in gs])
if 'cicek' in sys.argv or len(sys.argv) == 1:
    acs = np.linspace(0.0, 1.0, 31)
    incele('cicek', [lambda T, a=a: doga.ciz_cicek_fidani(T, np.eye(3), 540, 1500, 700, 'allik', acilma=a, tohum=0)
                     for a in acs])
if 'kok' in sys.argv or len(sys.argv) == 1:
    ds = np.linspace(0.0, 1.0, 21)
    incele('kok', [lambda T, d=d: doga.ciz_kokler(T, M_yerlestir(540, 600, 1.0), 0.8, d, tohum=0) for d in ds])
