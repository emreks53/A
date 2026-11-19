"""mimari.py bölüm süreleri (ısınmış)."""
import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np
from motor import *
import mimari as mm

def olc(zum=1.0, cx=540, cy=1000):
    Mk = Kamera(cx, cy, zum).M() @ M_yerlestir(540, 1430, 1.0)
    isik = (-0.6, -0.8)
    t = Tuval(); mm.ciz_kemerli_kapi(t, Mk, tohum=1)
    t = Tuval(); T = {}
    def tm(ad, f, *a):
        t0 = time.time(); r = f(*a); T[ad] = round(time.time() - t0, 3); return r
    tm('gul', mm._ciz_gul, t, Mk, 1.0, 1, isik)
    tm('cali', mm._ciz_sag_cali, t, Mk, 1.0, 1)
    tm('bas', mm._ciz_basamaklar, t, Mk, 1, isik)
    tm('kemer', mm._ciz_kemer_cercevesi, t, Mk, 1, isik)
    tm('derin', mm._ciz_derinlik, t, Mk, 1, isik)
    tm('alfiz', mm._ciz_alfiz, t, Mk, 1, isik)
    tm('silme', mm._ciz_kaide_silme, t, Mk, 1)
    tm('cephe', mm._ciz_cephe, t, Mk, 1, isik)
    tm('zemin', mm._ciz_kaide_zemin, t, Mk, 1, isik)
    t = Tuval(); t0 = time.time(); mm.ciz_kemerli_kapi(t, Mk, tohum=1); tot = time.time() - t0
    t = Tuval(); t0 = time.time(); mm.ciz_kemerli_kapi(t, Mk, acilma=0.5, tohum=1); tot2 = time.time() - t0
    print('zum', zum, T, 'toplam', round(tot, 3), 'acilma.5', round(tot2, 3))

if __name__ == '__main__':
    olc(1.0)
    olc(2.0, 540, 1060)
    olc(4.0, 290, 910)
