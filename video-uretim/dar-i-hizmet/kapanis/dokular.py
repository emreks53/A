"""Kapanis sahnesi icin uretilen dokular.

- Her kitap icin sirt dokusu (RGB, Non-Color):
    R = varak (gold foil) maskesi (keskin, hafif asinmis)
    G = kabartma yuksekligi (maskenin yumusatilmisi)
    B = deri yaslanma/asinma maskesi (bas-kuyruk ve kenarlarda koyulasma)
- Kur'an-i Kerim on kapak varak maskesi (semse, cerceve, kosebentler; YAZISIZ)

Basliklar EB Garamond 600 ile, verilen Turkce dizgilerle birebir yazilir.
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
import skia

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ayarlar as A  # noqa: E402

RNG = np.random.default_rng(20261119)


# ----------------------------------------------------------------- yardimci
def _gurultu(shape, sigma, rng):
    n = rng.standard_normal(shape).astype(np.float32)
    n = ndimage.gaussian_filter(n, sigma)
    n /= (n.std() + 1e-8)
    return n


def _asinma(mask, ppm, rng, siddet=1.0):
    """Varakta kucuk dokulmeler ve kenar asinmasi."""
    h, w = mask.shape
    n1 = _gurultu((h, w), 0.18 * ppm, rng)            # ~0.2 mm benekler
    n2 = _gurultu((h, w), 1.2 * ppm, rng)             # genis bolgeler
    dok = ((n1 + 0.8 * n2) > (2.9 - 0.5 * siddet)).astype(np.float32)
    dok = ndimage.gaussian_filter(dok, 0.25 * ppm)
    m = mask * (1.0 - np.clip(dok * 1.6, 0, 1) * 0.85)
    # hafif yogunluk farki
    m *= (0.93 + 0.07 * np.clip(0.5 + 0.25 * n2, 0, 1))
    return np.clip(m, 0, 1)


def _skia_canvas(w, h):
    surf = skia.Surface(w, h)
    c = surf.getCanvas()
    c.clear(skia.ColorBLACK)
    return surf, c


def _surf_to_np(surf):
    img = surf.makeImageSnapshot()
    a = img.toarray()  # BGRA/RGBA uint8
    return a[..., 1].astype(np.float32) / 255.0


def _beyaz(aa=True):
    p = skia.Paint()
    p.setAntiAlias(aa)
    p.setColor(skia.ColorWHITE)
    return p


# ----------------------------------------------------------- sirt suslemesi
def _bant_motif(c, x0, x1, yc, hh, ppm, paint):
    """Ince susleme bandi: dortlu yaprak (quatrefoil) + baklava zinciri."""
    w = x1 - x0
    n = max(1, int(round(w / (6.2 * ppm))))
    cell = w / n
    r = min(cell, 2 * hh) * 0.17
    for i in range(n):
        cx = x0 + cell * (i + 0.5)
        path = skia.Path()
        for k in range(4):
            a = k * math.pi / 2
            path.addCircle(cx + math.cos(a) * r * 1.05, yc + math.sin(a) * r * 1.05, r)
        c.drawPath(path, paint)
        # merkez delik
        hole = skia.Paint(); hole.setAntiAlias(True); hole.setColor(skia.ColorBLACK)
        c.drawCircle(cx, yc, r * 0.55, hole)
        c.drawCircle(cx, yc, r * 0.28, paint)
        # capraz kucuk yapraklar
        for k in range(4):
            a = math.pi / 4 + k * math.pi / 2
            px, py = cx + math.cos(a) * r * 2.25, yc + math.sin(a) * r * 2.25
            leaf = skia.Path()
            ang = a
            L, Wd = r * 0.95, r * 0.42
            tip = (px + math.cos(ang) * L * 0.5, py + math.sin(ang) * L * 0.5)
            base = (px - math.cos(ang) * L * 0.5, py - math.sin(ang) * L * 0.5)
            nx, ny = -math.sin(ang) * Wd, math.cos(ang) * Wd
            leaf.moveTo(*base)
            leaf.quadTo(px + nx, py + ny, *tip)
            leaf.quadTo(px - nx, py - ny, *base)
            leaf.close()
            c.drawPath(leaf, paint)
    # hucre aralarinda baklavalar
    for i in range(n + 1):
        cx = x0 + cell * i
        if i in (0, n):
            continue
        d = r * 0.75
        path = skia.Path()
        path.moveTo(cx, yc - d * 1.5); path.lineTo(cx + d, yc); path.lineTo(cx, yc + d * 1.5)
        path.lineTo(cx - d, yc); path.close()
        c.drawPath(path, paint)


def _cift_cizgi(c, x0, x1, y, ppm, paint, ters=False):
    t1, t2, gap = 0.55 * ppm, 0.32 * ppm, 0.75 * ppm
    if not ters:
        c.drawRect(skia.Rect(x0, y, x1, y + t1), paint)
        c.drawRect(skia.Rect(x0, y + t1 + gap, x1, y + t1 + gap + t2), paint)
        return y + t1 + gap + t2
    c.drawRect(skia.Rect(x0, y - t2, x1, y), paint)
    c.drawRect(skia.Rect(x0, y - t2 - gap - t1, x1, y - t2 - gap), paint)
    return y - t2 - gap - t1


def sirt_dokusu(ad, ppm=16, cap_max_mm=10.0):
    T = A.kalinlik(ad)
    p = A.cilt_parametreleri(T)
    arc = A.sirt_yay_uzunlugu(p) * 1000.0      # mm
    H = A.KITAP_H * 1000.0
    W = int(round(arc * ppm))
    Hp = int(round(H * ppm))
    surf, c = _skia_canvas(W, Hp)
    paint = _beyaz()
    kenar = 0.9 * ppm                     # cizgiler sirt kenarina kadar yakin
    x0, x1 = kenar, W - kenar

    # --- bas ve kuyruk suslemeleri
    def susleme(ust):
        if ust:
            y = 8.5 * ppm
            y = _cift_cizgi(c, x0, x1, y, ppm, paint)
            yb0 = y + 1.0 * ppm
            hh = 3.4 * ppm
            _bant_motif(c, x0 + 0.6 * ppm, x1 - 0.6 * ppm, yb0 + hh, hh, ppm, paint)
            y = yb0 + 2 * hh + 1.0 * ppm
            y = _cift_cizgi(c, x0, x1, y, ppm, paint)
            return y
        y = Hp - 8.5 * ppm
        y = _cift_cizgi(c, x0, x1, y, ppm, paint, ters=True)
        yb1 = y - 1.0 * ppm
        hh = 3.4 * ppm
        _bant_motif(c, x0 + 0.6 * ppm, x1 - 0.6 * ppm, yb1 - hh, hh, ppm, paint)
        y = yb1 - 2 * hh - 1.0 * ppm
        y = _cift_cizgi(c, x0, x1, y, ppm, paint, ters=True)
        return y

    y_ust = susleme(True)
    y_alt = susleme(False)
    foil = _surf_to_np(surf)

    # --- baslik (Pillow + raqm; yatay ciz, saat yonunde 90 derece cevir)
    ref = 400
    font = ImageFont.truetype(A.FONT_600, ref, layout_engine=ImageFont.Layout.RAQM)
    l, t, r, b = font.getbbox(ad, anchor="ls")       # taban cizgisine gore
    cap_ref = -font.getbbox("H", anchor="ls")[1]      # buyuk harf yuksekligi
    cap_mid = -cap_ref / 2.0                          # taban cizgisine gore merkez
    ust_tasma = cap_mid - t                           # merkezden yukari murekkep
    alt_tasma = b - cap_mid
    yari = max(ust_tasma, alt_tasma)
    marj = max(1.7, 0.10 * arc)
    kullan = arc - 2 * marj
    s_w = (kullan * ppm) / (2 * yari)                 # enine sigdirma
    bos_uzun = (y_alt - y_ust) / ppm - 2 * 9.0        # mm
    s_l = (bos_uzun * ppm) / (r - l)
    s_c = (cap_max_mm * ppm) / cap_ref
    s = min(s_w, s_l, s_c)
    fs = max(8, int(round(ref * s)))
    font = ImageFont.truetype(A.FONT_600, fs, layout_engine=ImageFont.Layout.RAQM)
    l, t, r, b = font.getbbox(ad, anchor="ls")
    capp = -font.getbbox("H", anchor="ls")[1]
    pad = 8
    tw, th = r - l + 2 * pad, b - t + 2 * pad
    im = Image.new("L", (tw, th), 0)
    d = ImageDraw.Draw(im)
    bx, by = pad - l, pad - t                         # taban cizgisi noktasi
    d.text((bx, by), ad, font=font, fill=255, anchor="ls")
    rot = im.transpose(Image.Transpose.ROTATE_270)    # saat yonunde 90
    # yatayda taban cizgisi -> dikeyde x konumu; cap merkezi sirt ortasina
    # dondurmede: yeni_x = th-1-y_eski, yeni_y = x_eski
    cap_mid_y = by - capp / 2.0
    cx_new = (th - 1) - cap_mid_y
    mid_x_old = (l + r) / 2.0 + bx - l + l            # yazi orta noktasi
    mid_x_old = bx + (l + r) / 2.0
    cy_new = mid_x_old
    hedef_x = W / 2.0
    hedef_y = (y_ust + y_alt) / 2.0
    ox = int(round(hedef_x - cx_new))
    oy = int(round(hedef_y - cy_new))
    yazi = np.zeros((Hp, W), np.float32)
    ra = np.asarray(rot, np.float32) / 255.0
    ys0, xs0 = max(0, oy), max(0, ox)
    ys1, xs1 = min(Hp, oy + ra.shape[0]), min(W, ox + ra.shape[1])
    yazi[ys0:ys1, xs0:xs1] = ra[ys0 - oy:ys1 - oy, xs0 - ox:xs1 - ox]
    foil = np.maximum(foil, yazi)

    foil = _asinma(foil, ppm, RNG, siddet=0.6)
    yukseklik = ndimage.gaussian_filter(foil, 0.22 * ppm)

    # --- deri yaslanma maskesi: bas/kuyruk ve sirt kenarlarinda
    yy = np.linspace(0, H, Hp, dtype=np.float32)[:, None]
    xx = np.linspace(0, arc, W, dtype=np.float32)[None, :]
    dy = np.minimum(yy, H - yy)
    dx = np.minimum(xx, arc - xx)
    n = _gurultu((Hp // 8 + 1, W // 8 + 1), 2.0, RNG)
    n = np.asarray(Image.fromarray(n).resize((W, Hp), Image.BILINEAR))
    yas = np.exp(-dy / 3.5) * 0.9 + np.exp(-dx / 1.6) * 0.45
    yas = yas * (0.75 + 0.35 * n)
    # sirtin dokunulan orta kisimlarinda hafif parlama/koyulasma lekeleri
    yas += 0.10 * np.clip(_gurultu((Hp // 16 + 1, W // 16 + 1), 1.5, RNG), 0, None).repeat(16, 0).repeat(16, 1)[:Hp, :W]
    yas = np.clip(yas, 0, 1)

    rgb = np.stack([foil, yukseklik, yas], -1)
    out = os.path.join(A.DOKU, f"sirt_{A.DOSYA[ad]}.png")
    Image.fromarray((rgb * 255 + 0.5).astype(np.uint8), "RGB").save(out, optimize=False, compress_level=3)
    return out, dict(arc_mm=arc, font_px=fs, cap_mm=capp / ppm)


# ------------------------------------------------------- Kur'an on kapagi
def _vesica(W, H, n=400):
    """Sivri badem (vesica) bicimi: genislik W, yukseklik H; merkez (0,0)."""
    a = W / 2.0
    b = H / 2.0
    # iki daire: merkezler (+-d,0), yaricap r
    r = (a * a + b * b) / (2 * a)
    d = r - a
    pts = []
    th0 = math.asin(b / r)
    for i in range(n):
        u = i / n
        if u < 0.5:   # sag yay (merkez -d)
            th = -th0 + 2 * th0 * (u / 0.5)
            pts.append((-d + r * math.cos(th), r * math.sin(th)))
        else:         # sol yay (merkez +d)
            th = math.pi - th0 + 2 * th0 * ((u - 0.5) / 0.5)
            pts.append((d + r * math.cos(th), r * math.sin(th)))
    return pts


def _offset(pts, off):
    out = []
    n = len(pts)
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        tx, ty = p2[0] - p0[0], p2[1] - p0[1]
        L = math.hypot(tx, ty) + 1e-12
        nx, ny = ty / L, -tx / L        # saat yonu tersi dizide disari
        out.append((p1[0] + nx * off, p1[1] + ny * off))
    return out


def _path(pts, ox, oy, s):
    p = skia.Path()
    p.moveTo(ox + pts[0][0] * s, oy - pts[0][1] * s)
    for x, y in pts[1:]:
        p.lineTo(ox + x * s, oy - y * s)
    p.close()
    return p


def _dilimli(pts, lob, derin):
    """Kenari dilimli (tepelikli) hale getir: lob = dilim uzunlugu (mm)."""
    n = len(pts)
    cum = [0.0]
    for i in range(1, n + 1):
        cum.append(cum[-1] + math.dist(pts[i - 1], pts[i % n]))
    L = cum[-1]
    k = max(6, int(round(L / lob)))
    out = []
    m = 1600
    for j in range(m):
        s = L * j / m
        i = np.searchsorted(cum, s) - 1
        i = max(0, min(n - 1, i))
        t = (s - cum[i]) / max(1e-9, cum[i + 1] - cum[i])
        p0, p1 = pts[i], pts[(i + 1) % n]
        x = p0[0] + (p1[0] - p0[0]) * t
        y = p0[1] + (p1[1] - p0[1]) * t
        tx, ty = p1[0] - p0[0], p1[1] - p0[1]
        Ln = math.hypot(tx, ty) + 1e-12
        nx, ny = ty / Ln, -tx / Ln
        ph = (s / L) * k
        bump = abs(math.sin(math.pi * ph)) ** 0.6
        out.append((x + nx * derin * bump, y + ny * derin * bump))
    return out


def _yaprak(cx, cy, ang, L, Wd):
    """Damla/rumi yaprak (taban -> uc)."""
    p = skia.Path()
    ca, sa = math.cos(ang), math.sin(ang)
    base = (cx, cy)
    tip = (cx + ca * L, cy + sa * L)
    nx, ny = -sa, ca
    c1 = (cx + ca * L * 0.35 + nx * Wd, cy + sa * L * 0.35 + ny * Wd)
    c2 = (cx + ca * L * 0.35 - nx * Wd, cy + sa * L * 0.35 - ny * Wd)
    p.moveTo(*base)
    p.cubicTo(c1[0], c1[1], tip[0] - ca * L * 0.25 + nx * Wd * 0.4, tip[1] - sa * L * 0.25 + ny * Wd * 0.4, *tip)
    p.cubicTo(tip[0] - ca * L * 0.25 - nx * Wd * 0.4, tip[1] - sa * L * 0.25 - ny * Wd * 0.4, c2[0], c2[1], *base)
    p.close()
    return p


def _op(a, b, op):
    r = skia.Op(a, b, op)
    return r if r is not None else a


U = skia.PathOp.kUnion_PathOp
D = skia.PathOp.kDifference_PathOp


def _semse(cx, cy, s, W=64.0, H=104.0):
    """Merkez semse (mm olcusunde tasarim, s = px/mm)."""
    v = _vesica(W, H)
    dis = _path(_dilimli(_offset(v, 1.6), 4.6, 2.2), cx, cy, s)
    bant_d = _path(_offset(v, -0.6), cx, cy, s)
    bant_i = _path(_offset(v, -1.5), cx, cy, s)
    gold = _op(dis, _op(bant_d, bant_i, D), D)        # dis dilimli kenar + ince bosluk
    # ic alan: yaprak bosluklari
    ic_bos = skia.Path()
    ic_hat_d = _path(_offset(v, -6.0), cx, cy, s)
    ic_hat_i = _path(_offset(v, -6.7), cx, cy, s)
    ic_bos = _op(ic_hat_d, ic_hat_i, D)
    # merkez gul: 8 yaprak bosluk
    for k in range(8):
        a = k * math.pi / 4 + math.pi / 8
        ic_bos = _op(ic_bos, _yaprak(cx + math.cos(a) * 4.2 * s, cy + math.sin(a) * 4.2 * s, a, 11.5 * s, 3.1 * s), U)
    # merkez halka
    ring = skia.Path(); ring.addCircle(cx, cy, 3.3 * s)
    ring_i = skia.Path(); ring_i.addCircle(cx, cy, 2.3 * s)
    ic_bos = _op(ic_bos, _op(ring, ring_i, D), U)
    # uclara dogru uzun lale-yapraklar ve yan rumiler
    for sgn in (-1, 1):
        ang = -sgn * math.pi / 2  # ekran: y asagi
        ic_bos = _op(ic_bos, _yaprak(cx, cy + sgn * 19.0 * s, sgn * math.pi / 2, 21.0 * s, 4.2 * s), U)
        for side in (-1, 1):
            a = sgn * (math.pi / 2 - side * 0.55)
            ic_bos = _op(ic_bos, _yaprak(cx + side * 7.5 * s, cy + sgn * 18.0 * s, a, 13.0 * s, 2.6 * s), U)
        # nokta dizisi
        for j in range(5):
            yy = cy + sgn * (43.0 - j * 0.0) * s
    # ikinci halka: 16 kucuk yaprak
    for k in range(16):
        a = k * math.pi / 8
        rr = 16.5
        px, py = cx + math.cos(a) * rr * 0.62 * s, cy + math.sin(a) * rr * 1.0 * s
        if abs(math.sin(a)) > 0.8:
            continue
        ic_bos = _op(ic_bos, _yaprak(px, py, a, 4.2 * s, 1.2 * s), U)
    # ic cizgi boyunca nokta dizisi
    vv = _offset(v, -9.0)
    for j in range(0, len(vv), 14):
        x, y = vv[j]
        dot = skia.Path(); dot.addCircle(cx + x * s, cy - y * s, 0.65 * s)
        ic_bos = _op(ic_bos, dot, U)
    # yanlarda kucuk yapraklar
    for side in (-1, 1):
        ic_bos = _op(ic_bos, _yaprak(cx + side * 13.5 * s, cy, (0 if side > 0 else math.pi), 10.0 * s, 2.8 * s), U)
    gold = _op(gold, ic_bos, D)
    # salbekler (ust ve alt sarkit)
    for sgn in (-1, 1):
        tip_y = cy + sgn * (H / 2 - 1.0) * s
        stem = skia.Path()
        stem.addRect(skia.Rect(cx - 0.5 * s, min(tip_y, tip_y + sgn * 9.0 * s), cx + 0.5 * s, max(tip_y, tip_y + sgn * 9.0 * s)))
        tip_y = cy + sgn * (H / 2 + 3.6) * s
        gold = _op(gold, stem, U)
        bc = tip_y + sgn * 9.5 * s
        tre = skia.Path()
        tre.addCircle(cx, bc, 3.6 * s)
        tre.addCircle(cx - 3.4 * s, bc - sgn * 1.8 * s, 2.3 * s)
        tre.addCircle(cx + 3.4 * s, bc - sgn * 1.8 * s, 2.3 * s)
        tri = skia.Path()
        tri.moveTo(cx - 2.0 * s, bc + sgn * 2.4 * s); tri.lineTo(cx, bc + sgn * 7.8 * s); tri.lineTo(cx + 2.0 * s, bc + sgn * 2.4 * s); tri.close()
        tre = _op(tre, tri, U)
        hole = skia.Path(); hole.addCircle(cx, bc, 1.5 * s)
        tre = _op(tre, hole, D)
        dot = skia.Path(); dot.addCircle(cx, bc, 0.7 * s)
        tre = _op(tre, dot, U)
        gold = _op(gold, tre, U)
    return gold


def _kosebent(kx, ky, dx, dy, s, R=30.0):
    """Kose suslemesi: kose noktasi (kx,ky), ic yon (dx,dy) isaretleri."""
    pts = []
    n = 220
    for i in range(n + 1):
        th = (math.pi / 2) * i / n
        rr = R + 1.6 * abs(math.sin(th * 9 * 2 / 2 * 2 / 2 * 2)) ** 0.6
        pts.append((math.cos(th) * rr, math.sin(th) * rr))
    pts.append((0, 0))
    p = skia.Path()
    p.moveTo(kx + pts[0][0] * dx * s, ky + pts[0][1] * dy * s)
    for x, y in pts[1:]:
        p.lineTo(kx + x * dx * s, ky + y * dy * s)
    p.close()
    # ic bosluk yayi
    arc_d = skia.Path(); arc_i = skia.Path()
    def ceyrek(rr):
        q = skia.Path(); q.moveTo(kx, ky)
        for i in range(n + 1):
            th = (math.pi / 2) * i / n
            q.lineTo(kx + math.cos(th) * rr * dx * s, ky + math.sin(th) * rr * dy * s)
        q.close(); return q
    p = _op(p, _op(ceyrek(R - 3.2), ceyrek(R - 4.0), D), D)
    # kose yapraklari
    for k, a in enumerate((math.pi / 4, math.pi / 4 - 0.55, math.pi / 4 + 0.55)):
        ax, ay = math.cos(a) * dx, math.sin(a) * dy
        ang = math.atan2(ay, ax)
        L = (16.0 if k == 0 else 11.0)
        p = _op(p, _yaprak(kx + ax * 4.0 * s, ky + ay * 4.0 * s, ang, L * s, (3.0 if k == 0 else 2.2) * s), D)
    hole = skia.Path(); hole.addCircle(kx + dx * 3.0 * s, ky + dy * 3.0 * s, 1.4 * s)
    p = _op(p, hole, D)
    return p


def kuran_kapak(ppm=10):
    """On kapak varak maskesi. Boyut: kapagin mafsal olugundan on kesime kadar duz yuzeyi (mm)."""
    p = A.cilt_parametreleri(A.KURAN_T, A.KURAN_D, bt=A.KURAN_BT)
    W = (A.KURAN_D - p["ys"] - p["gw"]) * 1000.0
    H = A.KURAN_H * 1000.0
    Wp, Hp = int(round(W * ppm)), int(round(H * ppm))
    surf, c = _skia_canvas(Wp, Hp)
    paint = _beyaz()
    s = ppm
    # cerceve: kalin + ince cizgi
    def cerceve(inset, t):
        outer = skia.Path(); outer.addRect(skia.Rect(inset * s, inset * s, (W - inset) * s, (H - inset) * s))
        inner = skia.Path(); inner.addRect(skia.Rect((inset + t) * s, (inset + t) * s, (W - inset - t) * s, (H - inset - t) * s))
        return _op(outer, inner, D)
    g = cerceve(10.0, 1.0)
    g = _op(g, cerceve(12.6, 0.45), U)
    # kosebentler (ic cercevenin icinde)
    k0 = 13.05
    for (kx, ky, dx, dy) in ((k0, k0, 1, 1), (W - k0, k0, -1, 1), (k0, H - k0, 1, -1), (W - k0, H - k0, -1, -1)):
        g = _op(g, _kosebent(kx * s, ky * s, dx, dy, s, R=27.0), U)
    # merkez semse (hafif yukarida degil, tam ortada)
    g = _op(g, _semse(W / 2 * s, H / 2 * s, s), U)
    c.drawPath(g, paint)
    foil = _surf_to_np(surf)
    foil = _asinma(foil, ppm, RNG, siddet=-1.2)
    yuk = ndimage.gaussian_filter(foil, 0.25 * ppm)
    yas = np.zeros_like(foil)
    rgb = np.stack([foil, yuk, yas], -1)
    out = os.path.join(A.DOKU, "kuran_kapak.png")
    Image.fromarray((rgb * 255 + 0.5).astype(np.uint8), "RGB").save(out, compress_level=3)
    return out


def hepsi():
    os.makedirs(A.DOKU, exist_ok=True)
    bilgi = {}
    for ad in A.ORAN:
        ppm = 24 if ad == A.YATAN else 16
        out, inf = sirt_dokusu(ad, ppm=ppm)
        bilgi[ad] = inf
        print(f"{ad:30s} arc={inf['arc_mm']:.1f}mm cap={inf['cap_mm']:.2f}mm -> {out}")
    print(kuran_kapak())
    return bilgi


if __name__ == "__main__":
    hepsi()
