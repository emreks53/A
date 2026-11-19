"""Yeşil kubbeli cami paftası: büyük (900 px) ve küçük (300 px), önde bahçe, arkada gök."""
import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import elemanlar as el
import mimari

import os
OUT = os.environ.get('MIMARI_OUT', '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/')


def sahne(olcek, x, y, nur=0.0, cicek=True):
    t = Tuval()
    M = np.eye(3)
    if cicek:
        cic = [(560, 1760, 160, 'allik'), (200, 1700, 140, 'beyaz'), (900, 1690, 140, 'seftali'),
               (380, 1890, 150, 'gul'), (780, 1900, 150, 'beyaz')]
        for i, (cx, cy, r, c) in enumerate(sorted(cic, key=lambda q: -q[1])):
            el.sakayik(t, M, cx, cy, r, c, tohum=i)
        for i, (cx, cy, r, c) in enumerate(cic):
            el.yaprak_kumesi(t, M, cx, cy + 30, 1.2, tohum=i, renk_='#6E9A78', yog=0.42)
        for i, (cx, cy, r, c) in enumerate(cic):
            el.okaliptus_dali(t, M, cx - 120 + i * 15, cy + 80, 360, aci=-98 + i * 5, tohum=i + 3)
    Mk = M_yerlestir(x, y, olcek)
    t0 = time.time()
    b = mimari.ciz_kubbe_cami(t, Mk, nur=nur, tohum=1)
    dt = time.time() - t0
    t.lavi(yol_dikdortgen(-20, y - 4, 1100, 1940), M, '#E6D6BE', yog=0.5, kenar=2, dalga=0.15, islak=0.35,
           islak_gen=8, gran=0.14, akis=0.12, tohum=7)
    el.uzak_agac_sirasi(t, M, -20, 1100, y + 2, yuk=50 * max(olcek, 0.5), renk_='#A5B8B0', yog=0.45)
    el.tepe_sirasi(t, M, -50, 1130, y - 20, 90, '#B9C8CB', yog=0.32, tohum=4)
    el.gok(t, M, bulutlar=[(250, 380, 300, 110, 1), (850, 250, 240, 90, 2)])
    return t, dt, b


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'buyuk'
    if which in ('buyuk', 'all'):
        t, dt, b = sahne(1.0, 530, 1350, nur=0.0)
        print('buyuk', round(dt, 3))
        cv2.imwrite(OUT + 'cami_buyuk.png', cv2.cvtColor(rgb8(son_islem(t.R)), cv2.COLOR_RGB2BGR))
    if which in ('kucuk', 'all'):
        t, dt, b = sahne(0.333, 600, 1180, nur=0.5)
        print('kucuk', round(dt, 3))
        cv2.imwrite(OUT + 'cami_kucuk.png', cv2.cvtColor(rgb8(son_islem(t.R)), cv2.COLOR_RGB2BGR))
    if which in ('nur', 'all'):
        t, dt, b = sahne(1.0, 530, 1350, nur=1.0, cicek=False)
        print('nur', round(dt, 3))
        cv2.imwrite(OUT + 'cami_nur.png', cv2.cvtColor(rgb8(son_islem(t.R)), cv2.COLOR_RGB2BGR))
