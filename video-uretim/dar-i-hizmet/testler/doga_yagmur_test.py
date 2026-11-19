"""Bahçede yağmur: fırtına bulutları, rüzgârda eğilen fidan, sarkmış çiçekler, savrulan yapraklar, koruyucu nur küresi."""
import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import doga, elemanlar as EL
OUT = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/'
zaman = float(sys.argv[1]) if len(sys.argv) > 1 else 0.37
T = Tuval()
M = np.eye(3)
zemin = 1640
kor = (300, 1270, 125)
sure = {}


def olc(ad, f, *a, **k):
    t0 = time.time()
    r = f(*a, **k)
    sure[ad] = sure.get(ad, 0) + time.time() - t0
    return r


# önden arkaya
for i, (y, s) in enumerate([(1900, 1.4), (1820, 1.2)]):
    olc('cimen', doga.ciz_cimen, T, M, -30, 1110, y, 1.3, 0.6, tohum=60 + i, boy=(int(22 * s), int(46 * s)))
olc('tarh', doga.ciz_tarh, T, M, 40, 1040, zemin, tohum=1, yuk=72, bolum='on')
for i, (x, rk, a, tt, b) in enumerate([(170, 'allik', 0.85, 1, 330), (430, 'gul', 0.55, 2, 300),
                                        (680, 'seftali', 1.0, 3, 340), (900, 'beyaz', 0.7, 4, 310)]):
    olc('fidan', doga.ciz_cicek_fidani, T, M, x, zemin, b, rk, acilma=a, solgunluk=0.65, sallanma=0.4, tohum=tt)
olc('tarh', doga.ciz_tarh, T, M, 40, 1040, zemin, tohum=1, yuk=72, bolum='arka')
olc('agac', doga.ciz_agac, T, M_yerlestir(820, zemin - 60, 0.95), 0.38, sallanma=0.75, tohum=2, damla=0.9)
olc('cayir', doga.ciz_cayir, T, M, -20, 1360, 1100, 1940, tohum=2, ufuk_y=1360, renk_uzak='#C2CBB0',
    renk_yakin='#AFBE8E')
EL.tepe_sirasi(T, M, -50, 1130, 1365, 120, '#9AA9B0', yog=0.38, tohum=4)
EL.uzak_agac_sirasi(T, M, -20, 1100, 1368, yuk=40, renk_='#8EA29C', yog=0.4)
olc('bulut', doga.ciz_firtina_bulutu, T, M, 330, 430, 880, 330, koyuluk=0.9, tohum=1)
olc('bulut', doga.ciz_firtina_bulutu, T, M, 900, 250, 700, 260, koyuluk=1.0, tohum=2)
EL.gok(T, M, ust='#77839F', orta='#9DA8BE', alt='#C9C6D2')
# koruyucu nur (sahnede adamın göğsünde olacak); burada yalnız konumunu göstermek için hafif ışık
T.lavi(yol_daire(*kor), M, '#F3D9A0', yog=0.18, yumusak=20, sakla=False)
T.isik(yol_daire(kor[0], kor[1], kor[2] * 0.8), M, '#FFE6A8', guc=0.45, yumusak=45)
# saklamasız efektler en son
olc('yagmur', doga.ciz_yagmur, T, M, zaman, 1.0, alan=(0, 420, 1080, 1920), ruzgar=0.3, tohum=0, zemin_y=zemin + 40,
    korunan=kor)
olc('yaprak', doga.ciz_ucusan_yapraklar, T, M, zaman, 14, alan=(0, 700, 1080, 1600), ruzgar=1.0, tohum=1,
    tur='yaprak', boyut=1.3)
olc('yaprak', doga.ciz_ucusan_yapraklar, T, M, zaman, 12, alan=(0, 1000, 1080, 1800), ruzgar=1.0, tohum=2,
    tur='tac', boyut=1.3)
print(' '.join('%s %.3f' % kv for kv in sure.items()))
cv2.imwrite(OUT + 'yagmur_bahce.png', cv2.cvtColor(rgb8(son_islem(T.R)), cv2.COLOR_RGB2BGR))
