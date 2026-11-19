"""Kapanis cekimi: derinlik duyarli 2.5D kamera hareketi.

Girdi (kapanis.py kare1 ile uretilir):
    kare1_buyuk.png      1350x2400, 16 bit, hareketin ilk konumundan %3 genis goruntu alani
    kare1_derinlik.npy   ayni cozunurlukte kamera-uzayi Z derinligi (metre, DOF'suz)
    kare1_bilgi.json     lens, sensor, pay, odak mesafesi, dolly ve kayma ayarlari

Cikti: kareler/0001.png ... 0192.png (1080x1920, 30 fps, 6.4 sn)

Hareket: kameranin kendi bakis ekseni boyunca yavas, yumusak (ease-in-out) dolly-in
(mesafenin ~%5.5'i), kamera yukari ekseninde cok hafif dikey kayma ve alt-piksel..~2 px
mertebesinde, dusuk frekansli, puruzsuz "elde tutulmus" salinim. Her cikti pikseli icin
kaynak goruntude derinlige gore yeniden izdusum (iteratif ters esleme) yapilir; boylece
on plan (masa, Lem'alar) arka plandan (duvar) biraz daha fazla buyur -> gercek paralaks.
Son islem: hafif vinyet, cok hafif renk sapmasi (kenarlarda), parlak bolgelerde yumusak
isima, gunes huzmesinde cok hafif pus (yalnizca ust bolgede) ve her karede degisen ince film greni.
Olcum: kare1_maske.png ayni izdusumle 1. kareye tasinir; onizleme.png uzerinde sirt derisi tonlari ve
altyazi bandi (y 1344-1651) sakinligi raporlanir. Dogrulama: 2.5D son kare <-> gercek son kare render'i.
"""
import json
import math
import os
import sys
import zlib

import cv2
import numpy as np

KOK = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, KOK)
import ayarlar as A  # noqa: E402

N_KARE = 192
W_OUT, H_OUT = 1080, 1920


def ilerleme(i, n=N_KARE):
    """0..1 yumusak ilerleme (bas/sonda yavas ama tam durmayan ease-in-out)."""
    t = i / (n - 1)
    cos_e = 0.5 - 0.5 * math.cos(math.pi * t)
    return 0.78 * cos_e + 0.22 * t


def _salinim(t_sn, tohum=11):
    """Puruzsuz el kamerasi salinimi: (dx_px, dy_px, roll_derece)."""
    rng = np.random.default_rng(tohum)
    out = []
    for amp, fmin, fmax in ((1.1, 0.13, 0.55), (0.9, 0.11, 0.5), (0.018, 0.1, 0.4)):
        v = 0.0
        for k in range(3):
            f = rng.uniform(fmin, fmax)
            ph = rng.uniform(0, 2 * math.pi)
            a = amp * (0.6 if k == 0 else 0.3 if k == 1 else 0.15)
            v += a * math.sin(2 * math.pi * f * t_sn + ph)
        out.append(v)
    return out


def _bilinear(img, x, y):
    return cv2.remap(img, x.astype(np.float32), y.astype(np.float32), cv2.INTER_LINEAR,
                     borderMode=cv2.BORDER_REPLICATE)


def yukle():
    bilgi = json.load(open(os.path.join(A.SCRATCH, "kare1_bilgi.json")))
    im = cv2.imread(os.path.join(A.SCRATCH, "kare1_buyuk.png"), cv2.IMREAD_UNCHANGED)
    im = im[..., :3][..., ::-1].astype(np.float32)
    im /= 65535.0 if im.max() > 255 else 255.0
    dep = np.load(os.path.join(A.SCRATCH, "kare1_derinlik.npy")).astype(np.float32)
    return bilgi, im, dep


def hazirla(dep):
    # derinlik kenarlarinda yirtilmayi onlemek icin ters derinligi hafifce yumusat
    inv = 1.0 / np.maximum(dep, 0.05)
    inv = cv2.GaussianBlur(inv, (0, 0), 1.6)
    return (1.0 / inv).astype(np.float32)


SS = 2   # 2x ust-ornekleme ile yeniden ornekle, sonra alan ortalamasiyla kucult (zum titresimini onler)


def koordinat(i, bilgi, dep, Hs, Ws, salinim=True, ss=SS, olcek=1.0):
    """i. cikti karesinin (ss kat ust-ornekli) her pikseli icin kaynak goruntudeki (us, vs) koordinatlari."""
    lens, sens, pay = bilgi["lens"], 36.0, bilgi["pay"]
    f_src = (lens / pay) / sens * Hs
    f_out = lens / sens * H_OUT
    cxs, cys = (Ws - 1) / 2.0, (Hs - 1) / 2.0
    cxo, cyo = (W_OUT - 1) / 2.0, (H_OUT - 1) / 2.0
    p = ilerleme(i)
    D = bilgi["dolly"] * bilgi["mesafe"] * p
    kv = bilgi.get("kaydir_v", 0.006) * p
    dx, dy, rl = _salinim(i / 30.0) if salinim else (0.0, 0.0, 0.0)
    g = (np.arange(H_OUT * ss, dtype=np.float32) + 0.5) / ss - 0.5
    h = (np.arange(W_OUT * ss, dtype=np.float32) + 0.5) / ss - 0.5
    yy, xx = np.meshgrid(g, h, indexing="ij")
    if salinim:
        a = math.radians(rl)
        ca, sa = math.cos(a), math.sin(a)
        xr = (xx - cxo) * ca - (yy - cyo) * sa + cxo + dx
        yr = (xx - cxo) * sa + (yy - cyo) * ca + cyo + dy
    else:
        xr, yr = xx, yy
    ap = (xr - cxo) / (f_out * olcek)
    bp = (cyo - yr) / (f_out * olcek)
    us = cxs + f_src * ap
    vs = cys - f_src * bp
    for _ in range(5):
        d = _bilinear(dep, us, vs)
        dpr = np.maximum(d - D, 0.05)
        us = cxs + f_src * (ap * dpr / d)
        vs = cys - f_src * ((bp * dpr + kv) / d)
    return us.astype(np.float32), vs.astype(np.float32)


def maske_kare(i, bilgi, mask, dep):
    """Olcum maskesini i. cikti karesine en-yakin komsu ile yeniden izdusur (1080x1920)."""
    us, vs = koordinat(i, bilgi, dep, mask.shape[0], mask.shape[1], ss=1)
    return cv2.remap(mask, us, vs, cv2.INTER_NEAREST, borderMode=cv2.BORDER_REPLICATE)


def kare_uret(i, bilgi, src, dep, post=True, salinim=True, ss=SS):
    Hs, Ws = src.shape[:2]
    cxs, cys = (Ws - 1) / 2.0, (Hs - 1) / 2.0
    us1, vs1 = koordinat(i, bilgi, dep, Hs, Ws, salinim=salinim, ss=ss)
    if post:
        big = np.empty((H_OUT * ss, W_OUT * ss, 3), np.float32)
        for c, olc in ((0, 1.00035), (1, 1.0), (2, 0.99965)):
            # renk sapmasi: kanal koordinatlarini merkeze gore cok az olcekle
            us = us1 if olc == 1.0 else ((us1 - cxs) * olc + cxs).astype(np.float32)
            vs = vs1 if olc == 1.0 else ((vs1 - cys) * olc + cys).astype(np.float32)
            big[..., c] = cv2.remap(src[..., c], us, vs, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    else:
        big = cv2.remap(src, us1, vs1, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    out = cv2.resize(big, (W_OUT, H_OUT), interpolation=cv2.INTER_AREA) if ss > 1 else big
    out = np.clip(out, 0, 1)
    if post:
        out = son_islem(out, i)
    return out


_VIN = None
_PUS = None
# Gunes huzmesinde cok hafif pus (ucuz sahte): sol ustten gelen, ~20 derece egimle saga-asagi inen,
# pencere kayitlariyla bolunmus yumusak bantlar. Yalnizca ust bolgede; altyazi bandina (y > ~0.62 H) inmez.
PUS = 0.022
PUS_EGIM = math.radians(19.5)       # gunes isinlarinin ekrandaki dogrultusu (kaybolma noktasi sag-asagida)
PUS_RENK = np.array([1.0, 0.86, 0.69], np.float32)


def _pus(H, W):
    global _PUS
    if _PUS is None or _PUS.shape[:2] != (H, W):
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        # isin dogrultusuna dik koordinat (piksel)
        n = -xx * math.sin(PUS_EGIM) + yy * math.cos(PUS_EGIM)
        u = n / H
        bant = (np.exp(-((u - 0.10) / 0.075) ** 2) + 0.8 * np.exp(-((u - 0.27) / 0.06) ** 2)
                + 0.55 * np.exp(-((u - 0.43) / 0.05) ** 2))
        # isin boyunca: pencereye (sola) yakin daha yogun
        boy = 0.55 + 0.45 * np.clip(1.0 - xx / W, 0, 1)
        dusey = np.clip(1.0 - (yy / H - 0.30) / 0.32, 0, 1) ** 1.5
        a = (PUS * bant * boy * dusey).astype(np.float32)
        a = cv2.GaussianBlur(a, (0, 0), 25)
        _PUS = a[..., None] * PUS_RENK[None, None, :]
    return _PUS


def son_islem(img, i):
    global _VIN
    H, W = img.shape[:2]
    if _VIN is None:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 * 0.8 + ((yy - H / 2) / (H / 2)) ** 2 * 1.0) / math.sqrt(1.8)
        _VIN = (1.0 - 0.13 * np.clip(r, 0, 1.2) ** 2.4)[..., None].astype(np.float32)
    # dogrusal uzayda vinyet + isima
    lin = np.where(img <= 0.04045, img / 12.92, ((img + 0.055) / 1.055) ** 2.4)
    lin *= _VIN
    lum = lin @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    hi = np.clip(lum - 0.62, 0, None)[..., None] * lin
    glow = cv2.GaussianBlur(hi, (0, 0), 18) * 0.10 + cv2.GaussianBlur(hi, (0, 0), 5) * 0.05
    lin = lin + glow
    if PUS > 0:
        lin = 1.0 - (1.0 - lin) * (1.0 - _pus(H, W))
    img = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(np.maximum(lin, 0), 1 / 2.4) - 0.055)
    # film greni (karede degisen), golgelerde biraz daha belirgin
    rng = np.random.default_rng(1000 + i)
    g = rng.standard_normal((H, W)).astype(np.float32)
    g = cv2.GaussianBlur(g, (0, 0), 0.65)
    g /= g.std() + 1e-6
    gc = rng.standard_normal((H // 2, W // 2, 3)).astype(np.float32)
    gc = cv2.resize(cv2.GaussianBlur(gc, (0, 0), 0.8), (W, H), interpolation=cv2.INTER_LINEAR)
    lumd = img @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    amp = (0.0105 * (1.0 - 0.55 * lumd))[..., None]
    img = img + amp * (g[..., None] + 0.25 * gc / (gc.std() + 1e-6))
    return np.clip(img, 0, 1)


def kaydet(img, path):
    rng = np.random.default_rng(zlib.crc32(os.path.basename(path).encode()))
    d = rng.uniform(-0.5, 0.5, img.shape[:2])[..., None]
    a = np.clip(np.round(img * 255.0 + d), 0, 255).astype(np.uint8)
    cv2.imwrite(path, a[..., ::-1], [cv2.IMWRITE_PNG_COMPRESSION, 3])


def _hx(c):
    return "#%02X%02X%02X" % tuple(int(round(float(x) * 255)) for x in c)


def main():
    bilgi, src, dep = yukle()
    dep = hazirla(dep)
    os.makedirs(A.KARELER, exist_ok=True)
    secim = None
    if len(sys.argv) > 1:
        secim = [int(x) for x in sys.argv[1].split(",")]
    kareler = secim if secim else list(range(1, N_KARE + 1))
    for k in kareler:
        out = kare_uret(k - 1, bilgi, src, dep)
        kaydet(out, os.path.join(A.KARELER, f"{k:04d}.png"))
        if k in (1, N_KARE):
            ad = "onizleme.png" if k == 1 else "onizleme_son.png"
            kaydet(out, os.path.join(A.SCRATCH, ad))
        print(k, flush=True)
    # olcum: sirt derisi renkleri son (yayinlanan) karede - maske ayni izdusumle 1. kareye tasinir
    mpath = os.path.join(A.SCRATCH, "kare1_maske.png")
    if os.path.exists(mpath) and (not secim or 1 in kareler):
        import kapanis
        mk = cv2.imread(mpath, cv2.IMREAD_GRAYSCALE)
        cikti = os.path.join(A.SCRATCH, "onizleme_maske.png")
        cv2.imwrite(cikti, maske_kare(0, bilgi, mk, dep))
        print("OLCUM onizleme.png (son islemli 1. kare):")
        kapanis.sirt_olc(os.path.join(A.SCRATCH, "onizleme.png"), cikti, erode=2)
        on = cv2.imread(os.path.join(A.SCRATCH, "onizleme.png"))[..., ::-1].astype(np.float32) / 255.0
        bant = on[1344:1652]
        lum = bant @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        gy, gx = np.gradient(cv2.GaussianBlur(lum, (0, 0), 2))
        print(f"ALTYAZI BANDI y1344-1651: ort {_hx(bant.reshape(-1, 3).mean(0))}  parlaklik std {lum.std():.4f}  "
              f"min/max {lum.min():.3f}/{lum.max():.3f}  egim P99 {np.percentile(np.hypot(gx, gy), 99):.4f}")
    # dogrulama: hareket sonu (salinimsiz, son islemsiz) -> gercek son kare render'i ile kiyas
    gercek = os.path.join(A.SCRATCH, "son_kare_render.png")
    if os.path.exists(gercek) and not secim:
        a = kare_uret(N_KARE - 1, bilgi, src, dep, post=False, salinim=False)
        kaydet(a, os.path.join(A.SCRATCH, "son_kare_25d_ham.png"))
        g = cv2.imread(gercek)[..., ::-1].astype(np.float32) / 255.0
        d = np.abs(a - g)
        fark = d.mean()
        dl = d.mean(2)
        # yirtilma/esneme kontrolu: yerel (31 px) ortalama farkin en buyugu
        yerel = cv2.blur(dl, (31, 31))
        print(f"DOGRULAMA ortalama mutlak fark (0-1): {fark:.4f}  P99 {np.percentile(dl, 99):.4f}  "
              f"yerel(31px) en buyuk {yerel.max():.4f}")
        os.makedirs(A.TEST, exist_ok=True)
        cv2.imwrite(os.path.join(A.TEST, "fark.png"), np.clip(dl * 8 * 255, 0, 255).astype(np.uint8))


if __name__ == "__main__":
    main()
