"""Kemerli kapı deneme paftaları: zum 1 kompozisyon (kapıdan görünen manzara), 4x yakın kırpıntılar, açılma dizisi."""
import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import elemanlar as el
import mimari

import os
OUT = os.environ.get('MIMARI_OUT', '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/')


def manzara(t, M):
    """Kapının ardındaki dünya (sahne yerine sade): zemin, yol, tepeler, gök."""
    t.lavi(yol_egri([(560, 1990), (520, 1700), (600, 1450), (560, 1260), (590, 1150), (640, 1150), (700, 1260),
                     (680, 1450), (760, 1700), (880, 1990)], kapali=True, gerilim=0.4), M, '#EAD9BE', yog=0.5,
           kenar=1.5, dalga=0.12, islak=0.6, islak_gen=4, gran=0.12, akis=0.15, tohum=3)
    t.lavi(yol_dikdortgen(-400, 1140, 1500, 2600), M, '#C9D3A8', yog=0.45, kenar=2, dalga=0.15, islak=0.35,
           islak_gen=8, gran=0.12, akis=0.14, tohum=11)
    el.uzak_agac_sirasi(t, M, -300, 1400, 1150, yuk=45, renk_='#A5B8B0', yog=0.42, tohum=22)
    el.tepe_sirasi(t, M, -300, 1500, 1120, 150, '#B9C8CB', yog=0.32, tohum=23, dalga_sayi=2.2, alt=1200)
    el.gok(t, M, bulutlar=[(400, 760, 220, 80, 31), (700, 620, 170, 60, 32)], ust='#5D8BC0', orta='#8CB0D4',
           alt='#EED8CB', ufuk=0.62, alt_yog=0.30)


def kare(zum=1.0, cx=540.0, cy=1000.0, acilma=1.0, dunya=True):
    t = Tuval()
    kc = Kamera(cx, cy, zum)
    Mk = kc.M() @ M_yerlestir(540, 1430, 1.0)
    t0 = time.time()
    bilgi = mimari.ciz_kemerli_kapi(t, Mk, acilma=acilma, tohum=1)
    dt = time.time() - t0
    if dunya:
        Mw = Kamera(540, 1000, 0.75 + 0.25 * zum).M()
        manzara(t, Mw)
    return t, dt, bilgi


def kaydet(ad, R):
    cv2.imwrite(OUT + ad, cv2.cvtColor(rgb8(son_islem(R)), cv2.COLOR_RGB2BGR))


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'z1'
    if which in ('z1', 'all'):
        t, dt, b = kare(1.0)
        print('zum1 kapi', round(dt, 3))
        kaydet('kapi_z1.png', t.R)
    if which in ('z4', 'all'):
        crops = []
        for (cx, cy, z) in [(540 - 250, 1430 - 520, 4.0), (540 + 230, 1430 - 760, 4.0), (540, 1430 - 840, 4.0),
                            (540 - 300, 1430 - 60, 4.0), (540 - 480, 1430 - 980, 4.0), (540 + 330, 1430 - 900, 4.0)]:
            t, dt, b = kare(z, cx, cy)
            print('zum4', round(dt, 3))
            crops.append(rgb8(son_islem(t.R))[480:1440, 0:1080])
        sheet = np.concatenate([np.concatenate(crops[:3], 1), np.concatenate(crops[3:], 1)], 0)
        cv2.imwrite(OUT + 'kapi_z4.png', cv2.cvtColor(sheet, cv2.COLOR_RGB2BGR))
    if which in ('z2', 'all'):
        t, dt, b = kare(2.0, 540, 1060)
        print('zum2', round(dt, 3))
        kaydet('kapi_z2.png', t.R)
    if which in ('on', 'all'):
        # açılma ortası tam çözünürlük, dünyasız: ıslak ön, önceden ayrılmış beyazlar (kemer, alfiz, korniş, rozetler)
        t, dt, b = kare(1.0, acilma=0.66, dunya=False)
        print('acilma .66', round(dt, 3))
        kaydet('kapi_on_tam.png', t.R)
    if which in ('surek', 'all'):
        # süreklilik: videodaki gibi acilma = e_out((V + 0.22) / 0.8), 30 fps ardışık kareler arası fark
        onceki = None
        for i in range(0, 19):
            V = i / 30.0
            a = e_out(min(1.0, (V + 0.22) / 0.8))
            t, dt, b = kare(1.0, acilma=a, dunya=False)
            if onceki is not None:
                d = np.abs(t.R - onceki).max(-1)
                print('V %.3f ac %.3f  ort fark %.4f  >0.1 px %d  sure %.3f' % (V, a, d.mean(), (d > 0.1).sum(), dt))
            onceki = t.R.copy()
    if which in ('ac', 'all'):
        ims = []
        for a in (0.0, 0.15, 0.3, 0.45, 0.6, 0.8, 1.0):
            t, dt, b = kare(1.0, acilma=a, dunya=True)
            print('acilma', a, round(dt, 3))
            ims.append(cv2.resize(rgb8(son_islem(t.R)), (432, 768), interpolation=cv2.INTER_AREA))
        sheet = np.concatenate(ims, 1)
        cv2.imwrite(OUT + 'kapi_acilma.png', cv2.cvtColor(sheet, cv2.COLOR_RGB2BGR))
