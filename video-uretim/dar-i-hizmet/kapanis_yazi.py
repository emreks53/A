"""Gerçekçi kapanış plakası (Cycles render) üstüne kaynak yazısı ve suluboyadan geçiş.

Yazı (uygulamadaki gibi tipografik kesme işareti): Risale-i Nur / Lem’alar / İkinci Lem’a / 11. Sayfa
"""
from __future__ import annotations

import os

import cv2
import numpy as np

from motor import W, H, e_out, e_io, sstep, renk
from yazi import yazi_katmani, bindir

PLAKA = os.environ.get('KAPANIS_KARELER',
                       '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/kapanis/kareler')
PLAKA_SAYISI = 192

SATIRLAR = [
    # metin, yazı tipi, boyut, renk, y merkezi, giriş gecikmesi (sn), izleme
    ('Risale-i Nur', 'eb-garamond-600', 84, '#3A2A22', 1372, 0.55, 0.015),
    ('Lem’alar', 'eb-garamond-500', 62, '#3A2A22', 1478, 0.95, 0.01),
    ('İkinci Lem’a', 'eb-garamond-500-italic', 52, '#4A3A30', 1540, 1.25, 0.01),
    ('11. Sayfa', 'eb-garamond-500', 44, '#5A4636', 1594, 1.55, 0.07),
]
CIZGI_Y = 1424  # "Risale-i Nur" altındaki ince süs çizgisi


def plaka(i):
    i = int(min(max(i, 1), PLAKA_SAYISI))
    yol = os.path.join(PLAKA, f'{i:04d}.png')
    im = cv2.imread(yol, cv2.IMREAD_UNCHANGED)
    if im is None:
        return np.full((H, W, 3), 0.9, np.float32)
    if im.dtype == np.uint16:
        im = im.astype(np.float32) / 65535.0
    else:
        im = im.astype(np.float32) / 255.0
    im = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2RGB)
    if im.shape[0] != H or im.shape[1] != W:
        im = cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA)
    return renk_duzelt(im)


def renk_duzelt(P):
    """Hafif beyaz dengesi (sıcak yansımayı azaltır: ciltler şeftaliden çok soluk gül / açık deri okunur) ve
    yumuşak bir S eğrisi (kamerayla çekilmiş kontrast)."""
    x = np.clip(P * np.array([0.975, 0.995, 1.035], np.float32), 0, 1)
    return np.clip(x + 0.16 * (x - 0.5) * (1 - np.abs(2 * x - 1)), 0, 1)


def _gren(kare_no):
    rng = np.random.default_rng(1000 + int(kare_no))
    return cv2.GaussianBlur(rng.standard_normal((H, W)).astype(np.float32), (0, 0), 0.55)


def susleme_cizgisi(R, alfa, gen=150, y=CIZGI_Y):
    """İnce, uçlarda incelen altın-kahve bir çizgi; ortada küçük bir baklava."""
    if alfa <= 0:
        return
    import skia
    w, h = int(gen * 2 + 40), 40
    s = skia.Surface(w, h)
    c = s.getCanvas()
    c.clear(skia.ColorTRANSPARENT)
    col = renk('#8C6A44')
    p = skia.Paint(AntiAlias=True, Color4f=skia.Color4f(float(col[0]), float(col[1]), float(col[2]), 0.85))
    cx, cy = w / 2, h / 2
    for yon in (-1, 1):
        path = skia.Path()
        path.moveTo(cx + yon * 10, cy - 0.9)
        path.lineTo(cx + yon * (10 + gen * 0.92), cy - 0.05)
        path.lineTo(cx + yon * (10 + gen * 0.92), cy + 0.05)
        path.lineTo(cx + yon * 10, cy + 0.9)
        path.close()
        c.drawPath(path, p)
    d = skia.Path()
    d.moveTo(cx, cy - 5)
    d.lineTo(cx + 5, cy)
    d.lineTo(cx, cy + 5)
    d.lineTo(cx - 5, cy)
    d.close()
    c.drawPath(d, p)
    arr = s.makeImageSnapshot().toarray(colorType=skia.ColorType.kRGBA_8888_ColorType,
                                        alphaType=skia.AlphaType.kPremul_AlphaType).astype(np.float32) / 255.0
    arr *= alfa
    bindir(R, int(W / 2 - w / 2), int(y - h / 2), arr)


def kapanis_kare(t, kare_no=None):
    """t: kapanışın başından beri geçen süre (sn). Plaka (yuvarlanmış kare indeksi: tekrar/atlama yok) + yazı +
    yazıyı da kapsayan çok hafif kare başı gren (yazı görüntüyle aynı 'filmde' dursun)."""
    i = int(round(t * 30)) + 1
    R = plaka(i)
    for (metin, ad, boyut, rk, y, gec, izl) in SATIRLAR:
        g = e_out((t - gec) / 0.65)
        if g <= 0:
            continue
        x0, y0, rgba = yazi_katmani(metin, ad=ad, boyut=boyut, renk_=rk, merkez=(W / 2, y), alfa=g,
                                    dy=(1 - g) * 14, bulanik=0.35 + (1 - g) * 2.5, izleme=izl + (1 - g) * 0.03,
                                    hale=0.5, hale_renk='#F6EFE6')
        bindir(R, x0, y0, rgba)
    susleme_cizgisi(R, e_out((t - 0.8) / 0.6), gen=150 * (0.6 + 0.4 * e_out((t - 0.8) / 0.8)))
    no = i if kare_no is None else kare_no
    R = np.clip(R + _gren(no)[..., None] * 0.0045, 0, 1)
    return R
