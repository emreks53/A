"""Mana altyazıları ve kapanış yazısı: HarfBuzz ile dizilen EB Garamond, skia ile çizim.

Mana altyazısı: kutusuz, zarif italik; mürekkep renginde, harflerin biçimini izleyen çok yumuşak kâğıt rengi
hale ile (kutu değil). Eski kelimenin ilk harfi okunduğu karede belirmeye başlar.
"""
from __future__ import annotations

import json
import os

import numpy as np
import skia
import uharfbuzz as hb

from motor import W, H, KOK, e_out, e_in, e_io, renk

FONT_DIR = os.path.join(KOK, 'fontlar')
_YUZ = {}
_HB = {}


def _yuz(ad):
    if ad not in _YUZ:
        yol = os.path.join(FONT_DIR, ad + '.ttf')
        _YUZ[ad] = skia.Typeface.MakeFromFile(yol)
        blob = hb.Blob.from_file_path(yol)
        _HB[ad] = hb.Font(hb.Face(blob))
    return _YUZ[ad], _HB[ad]


def diz(metin, ad, boyut, izleme=0.0):
    """Metni HarfBuzz ile dizer (bitişik harf, aralık). Dönüş: (glyph id'ler, x konumları, toplam en)."""
    tf, hbf = _yuz(ad)
    upem = hbf.face.upem
    buf = hb.Buffer()
    buf.add_str(metin)
    buf.guess_segment_properties()
    hb.shape(hbf, buf, {'kern': True, 'liga': True})
    olc = boyut / upem
    x = 0.0
    gl, xs = [], []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        gl.append(info.codepoint)
        xs.append(x + pos.x_offset * olc)
        x += pos.x_advance * olc + izleme * boyut
    if gl:
        x -= izleme * boyut
    return gl, xs, x


def _blob(gl, xs, tf, boyut):
    font = skia.Font(tf, boyut)
    font.setSubpixel(True)
    font.setEdging(skia.Font.Edging.kAntiAlias)
    font.setHinting(skia.FontHinting.kNone)
    builder = skia.TextBlobBuilder()
    builder.allocRunPosH(font, gl, xs, 0.0)
    return builder.make()


def yazi_katmani(metin, ad='eb-garamond-500-italic', boyut=72, renk_='#2D3247', merkez=(W / 2, 1500), alfa=1.0,
                 izleme=0.01, bulanik=0.0, hale=0.85, hale_renk='#F7F3EC', dy=0.0, olcek=1.0):
    """Yazıyı RGBA (premultiplied değil, float) bir kırpıntıya çizer. Dönüş: (x0, y0, rgba)."""
    tf, _ = _yuz(ad)
    gl, xs, en = diz(metin, ad, boyut * olcek, izleme)
    font = skia.Font(tf, boyut * olcek)
    m = font.getMetrics()
    yuk = (-m.fAscent + m.fDescent)
    pad = int(60 * olcek + 3 * bulanik)
    w = int(en + 2 * pad)
    h = int(yuk + 2 * pad)
    x0 = int(merkez[0] - en / 2 - pad)
    y0 = int(merkez[1] + dy - yuk / 2 - pad)
    yuzey = skia.Surface(w, h)
    c = yuzey.getCanvas()
    c.clear(skia.ColorTRANSPARENT)
    blob = _blob(gl, xs, tf, boyut * olcek)
    taban = pad + (-m.fAscent) - 0.04 * boyut * olcek
    ox = merkez[0] - en / 2 - pad - x0 + pad
    hr = renk(hale_renk)
    hc = skia.Color4f(float(hr[0]), float(hr[1]), float(hr[2]), 1.0)
    if hale > 0:
        # geniş, çok yumuşak hale + dar hale (harf biçimini izler)
        for sig, a in ((26 * olcek, 0.30 * hale), (9 * olcek, 0.70 * hale)):
            p = skia.Paint(AntiAlias=True, Color4f=skia.Color4f(hc.fR, hc.fG, hc.fB, a))
            p.setImageFilter(skia.ImageFilters.Blur(sig, sig))
            p.setStyle(skia.Paint.kStrokeAndFill_Style)
            p.setStrokeWidth(5 * olcek)
            c.drawTextBlob(blob, ox, taban, p)
    rr = renk(renk_)
    p = skia.Paint(AntiAlias=True, Color4f=skia.Color4f(float(rr[0]), float(rr[1]), float(rr[2]), 1.0))
    if bulanik > 0.05:
        p.setImageFilter(skia.ImageFilters.Blur(bulanik, bulanik))
    c.drawTextBlob(blob, ox, taban, p)
    arr = yuzey.makeImageSnapshot().toarray(colorType=skia.ColorType.kRGBA_8888_ColorType,
                                            alphaType=skia.AlphaType.kPremul_AlphaType).astype(np.float32) / 255.0
    arr[..., 3] *= alfa
    arr[..., :3] *= alfa
    return x0, y0, arr  # premultiplied


def bindir(R, x0, y0, rgba):
    """Premultiplied RGBA kırpıntısını R (H,W,3) üstüne 'normal' karışımla bindirir."""
    h, w = rgba.shape[:2]
    xa, ya = max(0, x0), max(0, y0)
    xb, yb = min(W, x0 + w), min(H, y0 + h)
    if xb <= xa or yb <= ya:
        return
    sub = rgba[ya - y0:yb - y0, xa - x0:xb - x0]
    hedef = R[ya:yb, xa:xb]
    hedef *= (1.0 - sub[..., 3:4])
    hedef += sub[..., :3]


# ----------------------------------------------------------------------------------------------------------------
# mana altyazıları zaman çizelgesi
# ----------------------------------------------------------------------------------------------------------------
SES_GECIKME = 0.30
MANA_Y = 1500  # karenin %78'i (uygulamanın altyazı bandı %64–82)

with open(os.path.join(KOK, 'zaman.json'), encoding='utf-8') as f:
    _Z = json.load(f)

# her mananın ekrandan çekildiği an (ses zamanı): bir sonraki mana gelmeden ya da öbek bitince
_CIKIS = [1.27, 2.55, 4.25, 7.35, 9.62, 11.05, 18.62, 19.90, 25.95]
MANALAR = []
for i, m in enumerate(_Z['manalar']):
    MANALAR.append(dict(metin=m['mana'], giris=m['an'] + SES_GECIKME, cikis=_CIKIS[i] + SES_GECIKME,
                        ard_arda=(i + 1 < len(_Z['manalar']) and abs(_Z['manalar'][i + 1]['an'] - _CIKIS[i]) < 0.01)))


def _zemin_parlakligi(R):
    bolge = R[MANA_Y - 60:MANA_Y + 60:4, 200:880:4]
    L = 0.2126 * bolge[..., 0] + 0.7152 * bolge[..., 1] + 0.0722 * bolge[..., 2]
    return float(np.percentile(L, 35))


def manalari_ciz(R, V):
    """V (video zamanı, sn) karesine görünen mana altyazılarını çizer. Zemin koyuysa (toprak kesiti, fırtına)
    mürekkep yerine krem renkli yazı ve koyu hale kullanılır."""
    L = None
    for m in MANALAR:
        g0 = m['giris'] - 1.0 / 30  # ilk harfin okunduğu kareden bir kare önce başlar
        if V < g0 or V > m['cikis'] + 0.45:
            continue
        gir = e_out((V - g0) / 0.30)
        if m['ard_arda']:
            cik = min(1.0, max(0.0, (V - (m['cikis'] - 0.16)) / 0.13))
        else:
            cik = e_in((V - m['cikis']) / 0.42)
        if cik >= 1:
            continue
        alfa = gir * (1 - cik)
        dy = (1 - gir) * 16 - cik * 10
        bul = (1 - gir) * 3.0 + cik * 1.5
        izl = 0.01 + (1 - gir) * 0.035
        if L is None:
            L = _zemin_parlakligi(R)
        k = float(np.clip((0.56 - L) / 0.14, 0.0, 1.0))  # 0: açık zemin (mürekkep), 1: koyu zemin (krem)
        if k < 0.5:
            renk_, hale_r, hale = '#2D3247', '#F7F3EC', 0.85
        else:
            renk_, hale_r, hale = '#FBF5EA', '#3A3029', 0.55
        x0, y0, rgba = yazi_katmani(m['metin'], merkez=(W / 2, MANA_Y), alfa=alfa, dy=dy, bulanik=bul,
                                    izleme=izl, renk_=renk_, hale_renk=hale_r, hale=hale)
        bindir(R, x0, y0, rgba)
