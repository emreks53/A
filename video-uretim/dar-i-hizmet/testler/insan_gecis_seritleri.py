"""Geçiş şeritleri: secdeye, secdeden_kalk, dua_kaldir, kalkis — 8 adım (ve istenirse ardışık kare farkı).
python3 insan_gecis_seritleri.py [boy=380] [adim=8] [ad1,ad2,...] [ayakkabi=1]"""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *

GECISLER = {
    'secdeye': (lambda u: insan.secdeye(u), {}),
    'secdeden_kalk': (lambda u: insan.secdeden_kalk(u), {}),
    'dua_kaldir': (lambda u: insan.dua_kaldir(u), {}),
    'kalkis': (lambda u: insan.kalkis(u), 'battaniye'),
}


def serit(ad, boy=380, adim=8, ayakkabi=True, u0=0.0, u1=1.0, etiket=True):
    fn, ek = GECISLER[ad]
    s = boy / 600.0
    us = np.linspace(u0, u1, adim)
    pozlar = [fn(u) for u in us]
    kutular = np.array([insan.sinir_kutusu(p) for p in pozlar])
    x0, y0 = kutular[:, 0].min(), kutular[:, 1].min()
    x1 = kutular[:, 2].max()
    parca, et = [], []
    for u, p in zip(us, pozlar):
        kw = dict(ayakkabi=ayakkabi)
        if ek == 'battaniye':
            kw.update(battaniye=1.0, battaniye_alfa=insan.kalkis_battaniye(u))
        cx = 540 - (x0 + x1) / 2 * s
        gy = H - 300
        img, c, dt = tek(p, boy, x=cx, y=gy, **kw)
        X0 = int(cx + x0 * s) - 14
        X1 = int(cx + x1 * s) + 14
        Y0 = int(gy + y0 * s) - 14
        Y1 = int(gy + 22 * s)
        parca.append(kirp(img, X0, Y0, X1, Y1))
        et.append(f'{ad} {u:.2f}' if etiket else '')
    return parca, et


if __name__ == '__main__':
    boy = int(sys.argv[1]) if len(sys.argv) > 1 else 380
    adim = int(sys.argv[2]) if len(sys.argv) > 2 else 8
    adlar = sys.argv[3].split(',') if len(sys.argv) > 3 else list(GECISLER)
    ayk = (sys.argv[4] != '0') if len(sys.argv) > 4 else True
    for ad in adlar:
        a = ayk if ad == 'kalkis' else (ayk and len(sys.argv) > 4)   # seccade geçişleri varsayılan çoraplı
        parca, et = serit(ad, boy, adim, a)
        pafta(parca, f'insan_gecis_{ad}_{boy}' + ('' if a else '_corap'), et, sutun=adim if adim <= 8 else 8)
