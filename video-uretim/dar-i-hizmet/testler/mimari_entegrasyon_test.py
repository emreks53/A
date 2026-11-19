"""sahne.py kullanımına benzer çağrılar: kubbe radyal açılma içinde, kapı + bahçe saklama birleştirme, belirlenimcilik."""
import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
import elemanlar as el
import mimari

import os
OUT = os.environ.get('MIMARI_OUT', '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler/')

# 1) belirlenimcilik: aynı girdi -> aynı kare
for ac in (0.37, 1.0):
    Mk = Kamera(540, 1000, 1.0).M() @ M_yerlestir(540, 1430, 1.0)
    a = Tuval(); mimari.ciz_kemerli_kapi(a, Mk, acilma=ac, tohum=1)
    b = Tuval(); mimari.ciz_kemerli_kapi(b, Mk, acilma=ac, tohum=1)
    print('kapi belirlenimci', ac, np.abs(a.R - b.R).max(), np.abs(a.saklama - b.saklama).max())
a = Tuval(); mimari.ciz_kubbe_cami(a, M_yerlestir(500, 1300, 0.8), nur=0.4)
b = Tuval(); mimari.ciz_kubbe_cami(b, M_yerlestir(500, 1300, 0.8), nur=0.4)
print('cami belirlenimci', np.abs(a.R - b.R).max())

# 2) sahne gibi: kubbe gorunurluk(acilma_radyal) içinde, küçük ölçek, uzak katman
ims = []
for k in (0.2, 0.5, 0.8, 1.0):
    t = Tuval()
    Mu = Kamera(540, 905, 0.94).M(0.55)
    Mk = Mu @ M_yerlestir(830, 1154, 0.36)
    t0 = time.time()
    with t.gorunurluk(1.0, acilma_radyal(k, 0, -300, 900, dalga=0.2, tohum=11), M=Mk):
        mimari.ciz_kubbe_cami(t, Mk, nur=0.5 * k, tohum=2)
    dt = time.time() - t0
    t.lavi(yol_dikdortgen(-2000, 1144, 3000, 4000), Kamera(540, 905, 0.94).M(), '#E2D5BC', yog=0.5, kenar=2.0,
           dalga=0.14, islak=0.4, islak_gen=9, gran=0.12, akis=0.15, tohum=12)
    el.uzak_agac_sirasi(t, Mu, -900, 2000, 1154, yuk=46, renk_='#A5B8B0', yog=0.42, tohum=13)
    el.gok(t, Kamera(540, 905, 0.94).M(0.35), bulutlar=[(200, 300, 300, 100, 41)], ufuk=0.62, alt_yog=0.32)
    print('kubbe acilma', k, round(dt, 3))
    ims.append(rgb8(son_islem(t.R))[700:1250, 500:1080])
cv2.imwrite(OUT + 'cami_sahne_acilma.png', cv2.cvtColor(np.concatenate(ims, 1), cv2.COLOR_RGB2BGR))

# 3) son geri çekiliş birleştirmesi (sahne.ciz_son gibi): kapı saklaması dışında bahçe görünür
for zk in (5.0, 2.5, 1.2):
    t = Tuval()
    Mk = Kamera(540.0, 1060.0, zk).M() @ M_yerlestir(540, 1430, 1.0)
    t0 = time.time()
    mimari.ciz_kemerli_kapi(t, Mk, acilma=1.0, tohum=1)
    print('son zum', zk, round(time.time() - t0, 3))
    tb = Tuval()
    el.gok(tb, np.eye(3), bulutlar=[(300, 400, 300, 100, 1)])
    sak = t.saklama
    R = t.R * sak[..., None] + tb.R * (1 - sak[..., None])
    cv2.imwrite(OUT + f'kapi_son_{zk}.png', cv2.cvtColor(rgb8(son_islem(R)), cv2.COLOR_RGB2BGR))
