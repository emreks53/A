"""Okuma köşesi kapanışı için üretilen dokular (Non-Color maskeler).

- Kur'an-ı Kerim ön kapağı (#144173 deri üstüne beyaz baskı): R = beyaz baskı maskesi, G = gömme yüksekliği,
  B = kenar aşınması. Ortada dilimli bir şemse çerçevesi içinde, Amiri (OFL) ile dizilmiş beyaz hat:
  "القرآن" (üstte) ve "الكريم" (altta); dış çerçeve, köşebentler ve şemsenin üst/alt salbekleri.
- Risale-i Nur yığınının en üstteki kitabının ön kapağı: R = varak, G = yükseklik (çift çerçeve, başlık,
  müellif adı).
- Açık Lem'alar'ın sayfaları (10 ve 11): mürekkep örtüsü (gri, 0..1). 11. sayfada videodaki metin (gerçek metin)
  bir paragraf olarak; diğer satırlar okunamayacak kadar küçük kalan, anlamsız harf dizileri (uydurma bir metin
  okunmasın diye gerçek kelime kullanılmaz).

Sırt dokuları (başlık + altın bantlar) dokular.sirt_dokusu ile üretilir (kapanis/doku).
"""
import math
import os
import random
import sys

import numpy as np
import skia
import uharfbuzz as hb
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ayarlar as A  # noqa: E402
import dokular as DK  # noqa: E402

OKUMA = "/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/okuma"
DOKU = os.path.join(OKUMA, "doku")
AMIRI = os.path.join(OKUMA, "font", "Amiri-700.ttf")
RNG = np.random.default_rng(20261125)

U, D = DK.U, DK.D


def _kaydet(rgb, ad):
    os.makedirs(DOKU, exist_ok=True)
    out = os.path.join(DOKU, ad)
    Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB").save(out, compress_level=3)
    return out


def _yazi_yolu(metin, font_yolu, boyut_px, cx, cy, rtl=False, izleme=0.0, yukseklik_hedef=None):
    """Metni HarfBuzz ile dizip skia Path olarak döndürür; (cx, cy) yazının mürekkep kutusunun merkezi."""
    blob = hb.Blob.from_file_path(font_yolu)
    face = hb.Face(blob)
    font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(metin)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True})
    tf = skia.Typeface.MakeFromFile(font_yolu)
    sf = skia.Font(tf, boyut_px)
    olc = boyut_px / face.upem
    yol = skia.Path()
    x = 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        g = sf.getPath(info.codepoint)
        if g is not None:
            g.offset(x + pos.x_offset * olc, -pos.y_offset * olc)
            yol.addPath(g)
        x += pos.x_advance * olc + izleme * boyut_px
    b = yol.computeTightBounds()
    if yukseklik_hedef:
        s = yukseklik_hedef / max(1e-6, b.height())
        m = skia.Matrix.Scale(s, s)
        yol.transform(m)
        b = yol.computeTightBounds()
    yol.offset(cx - (b.left() + b.right()) / 2, cy - (b.top() + b.bottom()) / 2)
    return yol


def _cizgi_cerceve(W, H, inset, t, s):
    o = skia.Path(); o.addRect(skia.Rect(inset * s, inset * s, (W - inset) * s, (H - inset) * s))
    i = skia.Path(); i.addRect(skia.Rect((inset + t) * s, (inset + t) * s, (W - inset - t) * s, (H - inset - t) * s))
    return DK._op(o, i, D)


def _cizgi(c, pts, ox, oy, s, w):
    """Kapalı bir nokta dizisini w (mm) kalınlıkta çizgi olarak çizer."""
    p = DK._path(pts, ox, oy, s)
    pt = skia.Paint(AntiAlias=True, Color=skia.ColorWHITE, Style=skia.Paint.kStroke_Style, StrokeWidth=w * s)
    pt.setStrokeJoin(skia.Paint.kRound_Join)
    c.drawPath(p, pt)


def _lale(cx, cy, yon, s, k=1.0):
    """Küçük lale motifi: ortada uzun yaprak, iki yanda kıvrık yapraklar; yon: +1 aşağı, -1 yukarı (ekran)."""
    g = DK._yaprak(cx, cy, yon * math.pi / 2, 9.0 * k * s, 2.1 * k * s)
    for side in (-1, 1):
        a = yon * math.pi / 2 + side * 0.62
        g = DK._op(g, DK._yaprak(cx + side * 0.8 * k * s, cy + yon * 0.6 * k * s, a, 6.4 * k * s, 1.5 * k * s), U)
    nok = skia.Path(); nok.addCircle(cx, cy - yon * 1.6 * k * s, 0.9 * k * s)
    return DK._op(g, nok, U)


def _salbek(cx, uc, sgn, s):
    g = skia.Path()
    sap = skia.Path()
    sap.addRect(skia.Rect(cx - 0.35 * s, min(uc, uc + sgn * 5.5 * s), cx + 0.35 * s, max(uc, uc + sgn * 5.5 * s)))
    g = DK._op(g, sap, U)
    bc = uc + sgn * 9.0 * s
    dam = skia.Path()
    dam.addCircle(cx, bc, 3.0 * s)
    dam.addCircle(cx - 2.9 * s, bc - sgn * 1.5 * s, 1.9 * s)
    dam.addCircle(cx + 2.9 * s, bc - sgn * 1.5 * s, 1.9 * s)
    tri = skia.Path()
    tri.moveTo(cx - 1.7 * s, bc + sgn * 2.0 * s); tri.lineTo(cx, bc + sgn * 6.6 * s); tri.lineTo(cx + 1.7 * s, bc + sgn * 2.0 * s)
    tri.close()
    dam = DK._op(dam, tri, U)
    delik = skia.Path(); delik.addCircle(cx, bc, 1.6 * s)
    dam = DK._op(dam, delik, D)
    nok = skia.Path(); nok.addCircle(cx, bc, 0.75 * s)
    dam = DK._op(dam, nok, U)
    g = DK._op(g, dam, U)
    for side in (-1, 1):
        a = math.atan2(sgn * 0.55, side * 1.0)
        g = DK._op(g, DK._yaprak(cx + side * 1.2 * s, uc + sgn * 2.2 * s, a, 7.0 * s, 1.6 * s), U)
    return g


def _semse_ciz(c, cx, cy, s, W, H):
    """Dilimli şemse çerçevesi (içi boş): sürekli dilimli dış çizgi, ince iç çizgi, aralarında nokta dizisi,
    uçlarda salbekler ve içte, yazının üstünde ve altında birer lale."""
    v = DK._vesica(W, H)
    _cizgi(c, DK._dilimli(DK._offset(v, 1.6), 5.2, 2.0), cx, cy, s, 0.85)
    _cizgi(c, DK._offset(v, -1.2), cx, cy, s, 0.45)
    vv = DK._offset(v, 0.15)
    pt = DK._beyaz()
    for j in range(0, len(vv), 8):
        x, y = vv[j]
        c.drawCircle(cx + x * s, cy - y * s, 0.38 * s, pt)
    g = skia.Path()
    for sgn in (-1, 1):
        g = DK._op(g, _salbek(cx, cy + sgn * (H / 2 + 3.4) * s, sgn, s), U)
        g = DK._op(g, _lale(cx, cy + sgn * (H / 2 - 22.0) * s, sgn, s, 1.05), U)
    c.drawPath(g, pt)


def kuran_kapak(ppm=14):
    """Kur'an ön kapağının düz yüzeyi (mafsal oluğundan ön kesime) için beyaz baskı maskesi."""
    p = A.cilt_parametreleri(A.KURAN_T, A.KURAN_D, bt=A.KURAN_BT)
    W = (A.KURAN_D - p["ys"] - p["gw"]) * 1000.0
    H = A.KURAN_H * 1000.0
    Wp, Hp = int(round(W * ppm)), int(round(H * ppm))
    surf, c = DK._skia_canvas(Wp, Hp)
    s = ppm
    pt = DK._beyaz()
    g = _cizgi_cerceve(W, H, 8.0, 1.25, s)
    g = DK._op(g, _cizgi_cerceve(W, H, 10.6, 0.5, s), U)
    k0 = 11.35
    for (kx, ky, dx, dy) in ((k0, k0, 1, 1), (W - k0, k0, -1, 1), (k0, H - k0, 1, -1), (W - k0, H - k0, -1, -1)):
        g = DK._op(g, DK._kosebent(kx * s, ky * s, dx, dy, s, R=21.0), U)
    c.drawPath(g, pt)
    cx, cy = W / 2, H / 2
    SW, SH = 96.0, 156.0
    _semse_ciz(c, cx * s, cy * s, s, SW, SH)
    # hat: iki satır, ortalanmış; beyaz (Amiri Bold)
    ust = _yazi_yolu("القرآن", AMIRI, 400, cx * s, (cy - 14.0) * s, yukseklik_hedef=36.0 * s)
    alt = _yazi_yolu("الكريم", AMIRI, 400, cx * s, (cy + 22.0) * s, yukseklik_hedef=28.0 * s)
    for yol, yc, lim_mm in ((ust, (cy - 14.0) * s, 64.0), (alt, (cy + 22.0) * s, 58.0)):
        bb = yol.computeTightBounds()
        if bb.width() > lim_mm * s:
            k = lim_mm * s / bb.width()
            m = skia.Matrix()
            m.setScale(k, k, (bb.left() + bb.right()) / 2, yc)
            yol.transform(m)
        c.drawPath(yol, pt)
    m = DK._surf_to_np(surf)
    m = DK._asinma(m, ppm, RNG, siddet=-1.6)
    yuk = ndimage.gaussian_filter(m, 0.22 * ppm)
    yy = np.linspace(0, H, Hp, dtype=np.float32)[:, None]
    xx = np.linspace(0, W, Wp, dtype=np.float32)[None, :]
    d = np.minimum(np.minimum(yy, H - yy), np.minimum(xx, W - xx))
    yas = np.clip(np.exp(-d / 2.2) * 0.6, 0, 1) * np.ones_like(m)
    return _kaydet(np.stack([m, yuk, yas], -1), "kuran_kapak_beyaz.png"), (W, H)


def kuran_sirt(ppm=12):
    """Kur'an sırtı: beyaz çift bantlar (üst/alt) ve ortada küçük bir gül."""
    p = A.cilt_parametreleri(A.KURAN_T, A.KURAN_D, bt=A.KURAN_BT)
    arc = A.sirt_yay_uzunlugu(p) * 1000.0
    H = A.KURAN_H * 1000.0
    Wp, Hp = int(round(arc * ppm)), int(round(H * ppm))
    surf, c = DK._skia_canvas(Wp, Hp)
    pt = DK._beyaz()
    x0, x1 = 1.0 * ppm, Wp - 1.0 * ppm
    for y in (14.0, 28.0, H - 28.0, H - 14.0):
        DK._cift_cizgi(c, x0, x1, y * ppm, ppm, pt)
    g = skia.Path()
    for k in range(8):
        a = k * math.pi / 4
        g = DK._op(g, DK._yaprak(Wp / 2, Hp / 2, a, 6.0 * ppm, 1.6 * ppm), U)
    c.drawPath(g, pt)
    m = DK._surf_to_np(surf)
    m = DK._asinma(m, ppm, RNG, siddet=-1.4)
    yuk = ndimage.gaussian_filter(m, 0.22 * ppm)
    yy = np.linspace(0, H, Hp, dtype=np.float32)[:, None]
    yas = np.exp(-np.minimum(yy, H - yy) / 3.5) * 0.8 * np.ones_like(m)
    return _kaydet(np.stack([m, yuk, yas], -1), "kuran_sirt_beyaz.png")


def risale_kapak(ad, ppm=12):
    """Yığının en üstündeki kitabın ön kapağı: altın çift çerçeve, köşe yaprakları, başlık ve müellif adı."""
    p = A.cilt_parametreleri(A.kalinlik(ad))
    W = (A.KITAP_D - p["ys"] - p["gw"]) * 1000.0
    H = A.KITAP_H * 1000.0
    Wp, Hp = int(round(W * ppm)), int(round(H * ppm))
    surf, c = DK._skia_canvas(Wp, Hp)
    s = ppm
    g = _cizgi_cerceve(W, H, 9.0, 1.0, s)
    g = DK._op(g, _cizgi_cerceve(W, H, 11.4, 0.45, s), U)
    for (kx, ky, dx, dy) in ((12.0, 12.0, 1, 1), (W - 12.0, 12.0, -1, 1), (12.0, H - 12.0, 1, -1), (W - 12.0, H - 12.0, -1, -1)):
        for k, a_ in enumerate((math.pi / 4, math.pi / 4 - 0.6, math.pi / 4 + 0.6)):
            ax, ay = math.cos(a_) * dx, math.sin(a_) * dy
            g = DK._op(g, DK._yaprak(kx * s + ax * 1.5 * s, ky * s + ay * 1.5 * s, math.atan2(ay, ax),
                                     (8.0 if k == 0 else 5.5) * s, (2.0 if k == 0 else 1.4) * s), U)
    baslik = _yazi_yolu(ad, A.FONT_600, 400, W / 2 * s, H * 0.40 * s, yukseklik_hedef=None)
    bb = baslik.computeTightBounds()
    hedef_en = min(0.62 * W * s, bb.width() * (11.0 * s) / max(1e-6, bb.height()))
    k = hedef_en / bb.width()
    m = skia.Matrix(); m.setScale(k, k, (bb.left() + bb.right()) / 2, (bb.top() + bb.bottom()) / 2)
    baslik.transform(m)
    g = DK._op(g, baslik, U)
    mu = _yazi_yolu("Bediüzzaman Said Nursî", A.FONT_500, 400, W / 2 * s, H * 0.52 * s, yukseklik_hedef=4.6 * s)
    g = DK._op(g, mu, U)
    # başlığın altında ince bir süs çizgisi
    cz = skia.Path(); cz.addRect(skia.Rect((W / 2 - 18) * s, H * 0.465 * s, (W / 2 + 18) * s, (H * 0.465 + 0.35) * s))
    g = DK._op(g, cz, U)
    c.drawPath(g, DK._beyaz())
    f = DK._surf_to_np(surf)
    f = DK._asinma(f, ppm, RNG, siddet=0.2)
    yuk = ndimage.gaussian_filter(f, 0.25 * ppm)
    return _kaydet(np.stack([f, yuk, np.zeros_like(f)], -1), f"kapak_{A.DOSYA[ad]}.png")


# ------------------------------------------------------------------------------------------------ sayfalar
PASAJ = ("Şu dâr-ı dünya, meydan-ı imtihandır ve dâr-ı hizmettir; lezzet ve ücret ve mükâfat yeri değildir. "
         "Madem dâr-ı hizmettir ve mahall-i ubudiyettir; hastalıklar ve musibetler, dinî olmamak ve sabretmek "
         "şartıyla o hizmete ve o ubudiyete çok muvafık oluyor ve kuvvet veriyor. Ve her bir saati, bir gün ibadet "
         "hükmüne getirdiğinden şekva değil, şükretmek gerektir.")
_HARF = "aaaaeeeeiiiıınnrrllkkddmmyyuussttbboozgçşhğcvpüö"


def _anlamsiz_kelime(rnd):
    n = max(2, min(12, int(rnd.gauss(6.0, 2.6))))
    w = "".join(rnd.choice(_HARF) for _ in range(n))
    return w


class _Dizgi:
    def __init__(self, font_yolu, px):
        self.tf = skia.Typeface.MakeFromFile(font_yolu)
        self.font = skia.Font(self.tf, px)
        self.font.setSubpixel(True)
        self.px = px

    def en(self, w):
        return self.font.measureText(w)

    def satir(self, c, kelimeler, x0, en, y, iki_yana=True, paint=None):
        ws = [self.en(w) for w in kelimeler]
        bosluk = self.en(" ")
        if iki_yana and len(kelimeler) > 1:
            bosluk = (en - sum(ws)) / (len(kelimeler) - 1)
        x = x0
        for w, ww in zip(kelimeler, ws):
            c.drawString(w, x, y, self.font, paint)
            x += ww + bosluk


def _paragraf_satirlari(dz, kelimeler, en, girinti):
    satirlar, cur, cur_en = [], [], girinti
    bos = dz.en(" ")
    for w in kelimeler:
        ww = dz.en(w)
        if cur and cur_en + bos + ww > en:
            satirlar.append(cur)
            cur, cur_en = [w], ww
        else:
            cur_en += (bos if cur else 0) + ww
            cur.append(w)
    if cur:
        satirlar.append(cur)
    return satirlar


def sayfa(no, ppm=12, tohum=0):
    """Sayfa mürekkep örtüsü (163 x 236 mm). Sağ sayfa 11'de videodaki paragraf."""
    W, H = 163.0, 236.0
    Wp, Hp = int(W * ppm), int(H * ppm)
    surf = skia.Surface(Wp, Hp)
    c = surf.getCanvas()
    c.clear(skia.ColorBLACK)
    p = skia.Paint(AntiAlias=True, Color=skia.ColorWHITE)
    sag = (no % 2 == 1)
    ic_marj, dis_marj, ust, alt = 22.0, 21.0, 26.0, 26.0
    x0 = (ic_marj if sag else dis_marj) * ppm
    en = (W - ic_marj - dis_marj) * ppm
    govde = _Dizgi(A.FONT_500, 4.15 * ppm)
    baslik = _Dizgi(A.FONT_500, 3.3 * ppm)
    # üst başlık ve sayfa numarası
    bas = "İKİNCİ LEM’A" if sag else "LEM’ALAR"
    bw = baslik.en(bas) + baslik.en(" ") * 0.4 * (len(bas) - 1)
    xx = x0 + en / 2 - bw / 2
    for ch in bas:
        c.drawString(ch, xx, (ust - 9.0) * ppm, baslik.font, p)
        xx += baslik.en(ch) + baslik.en(" ") * 0.4
    nos = str(no)
    nx = (x0 + en - baslik.en(nos)) if sag else x0
    c.drawString(nos, nx, (ust - 9.0) * ppm, baslik.font, p)
    c.drawRect(skia.Rect(x0, (ust - 6.6) * ppm, x0 + en, (ust - 6.6) * ppm + 0.18 * ppm), p)
    rnd = random.Random(1000 + no + tohum)
    satir_ara = 6.35
    n_satir = int((H - ust - alt) / satir_ara)
    pasaj_bas = 8 if sag else None
    pasaj = _paragraf_satirlari(govde, PASAJ.split(), en, 7.0 * ppm) if sag else []
    y_mm = ust
    i = 0
    par_kalan = rnd.randint(4, 9)
    while i < n_satir:
        y = (y_mm + i * satir_ara) * ppm
        if sag and i == pasaj_bas:
            for k, sat in enumerate(pasaj):
                yk = (y_mm + (i + k) * satir_ara) * ppm
                son = (k == len(pasaj) - 1)
                xg = x0 + (7.0 * ppm if k == 0 else 0)
                govde.satir(c, sat, xg, en - (xg - x0), yk, iki_yana=not son, paint=p)
            i += len(pasaj)
            par_kalan = 0
            continue
        # anlamsız harf dizileri (okunamayacak boyutta; uydurma metin olmasın)
        girinti = 7.0 * ppm if par_kalan == 0 else 0
        kel, toplam = [], girinti
        while True:
            w = _anlamsiz_kelime(rnd)
            ww = govde.en(w)
            if kel and toplam + govde.en(" ") + ww > en:
                break
            kel.append(w)
            toplam += (govde.en(" ") if len(kel) > 1 else 0) + ww
        if par_kalan == 0:
            par_kalan = rnd.randint(5, 11)
        par_kalan -= 1
        son = (par_kalan == 0)
        if son:
            kel = kel[:max(2, int(len(kel) * rnd.uniform(0.35, 0.8)))]
        govde.satir(c, kel, x0 + girinti, en - girinti, y, iki_yana=not son, paint=p)
        i += 1
    m = DK._surf_to_np(surf)
    # baskı: mürekkep kenarı çok az dağılır, yoğunluk hafif değişir
    m = ndimage.gaussian_filter(m, 0.35)
    m *= (0.88 + 0.12 * np.clip(0.5 + 0.3 * DK._gurultu(m.shape, 30, RNG), 0, 1))
    return _kaydet(np.stack([m, m, m], -1), f"sayfa_{no}.png")


def hepsi():
    os.makedirs(DOKU, exist_ok=True)
    print(kuran_kapak())
    print(kuran_sirt())
    for ad in ("Mektubat",):
        print(risale_kapak(ad))
    print(sayfa(10))
    print(sayfa(11))


if __name__ == "__main__":
    hepsi()
