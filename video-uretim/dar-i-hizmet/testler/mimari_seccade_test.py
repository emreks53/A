"""Seccade paftası: tek başına (büyük), üzerinde basit yer tutucu biçim, insan.secde ile ve küçük ölçek."""
import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import elemanlar as el
import mimari

import os
OUT = os.environ.get('MIMARI_OUT', '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/')


def zemin(t, M, y):
    t.lavi(yol_dikdortgen(-100, y - 300, 1200, 2100), M, '#E2D5BC', yog=0.5, kenar=2, dalga=0.15, islak=0.35,
           islak_gen=8, gran=0.12, akis=0.15, tohum=12)


if __name__ == '__main__':
    t = Tuval()
    M = np.eye(3)
    # 1) büyük, tek başına (ölçek 2)
    Ms = M_yerlestir(540, 330, 2.0)
    t0 = time.time()
    mimari.ciz_seccade(t, Ms, tohum=1)
    print('seccade 2x', round(time.time() - t0, 3))
    # 2) yer tutucu biçim üstünde (ölçek 1.5)
    Mb = M_yerlestir(540, 800, 1.5)
    yt = yol_egri([(-150, 18), (-120, -40), (-20, -120), (90, -150), (150, -40), (170, 18)], kapali=True,
                  gerilim=0.5)
    t.lavi(yt, Mb, '#7F9FC0', yog=0.55, kenar=1.2, islak=0.8, islak_gen=3, gran=0.1, akis=0.2, tohum=3)
    t.sakla_ekle(yt, Mb)
    mimari.ciz_seccade(t, Mb, tohum=1)
    # 3) secde eden adamla (insan modülü varsa), ölçek 1.2
    try:
        import insan
        Ma = M_yerlestir(560, 1300, 1.2)
        # adam kökü dizlerde (secde: dizler x≈124, alın x≈311 adam yerelinde; yon=-1 aynalı)
        insan.ciz_insan(t, M_yerlestir(560 + 150 * 1.2, 1300, 1.2), insan.POZLAR['secde'], yon=-1)
        mimari.ciz_seccade(t, Ma, tohum=1)
    except Exception as e:
        print('insan yok', e)
    # 4) küçük ölçek (0.5) ve farklı eğim
    mimari.ciz_seccade(t, M_yerlestir(300, 1720, 0.55), tohum=2)
    mimari.ciz_seccade(t, M_yerlestir(780, 1720, 0.8), egim=0.26, kayma=0.6, tohum=3, yon=1)
    zemin(t, M, 330)
    cv2.imwrite(OUT + 'seccade.png', cv2.cvtColor(rgb8(son_islem(t.R)), cv2.COLOR_RGB2BGR))
