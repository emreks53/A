"""Okuma köşesi kapanışı: derinliğe duyarlı 2.5D kamera hareketi (hareket.py yöntemi, yeni plaka dizini).

Girdi (okuma.py kare1): okuma/kare1_buyuk.png (1350x2400, %3 geniş görüş), kare1_derinlik.npy (kamera-uzayı Z, metre;
gökyüzü 1000 m, pencere camı derinlikte gizli: manzara sonsuzda kalır), kare1_bilgi.json.
Çıktı: okuma/kareler/0001.png ... 0192.png (1080x1920, 30 fps, 6.4 sn): yavaş, yumuşak öne süzülme (odak mesafesinin
%3.5'i), çok hafif el kamerası salınımı, vinyet, parlak bölgelerde yumuşak ışıma, ince film greni.
Doğrulama: okuma/son_kare_render.png varsa 2.5D son kare ile karşılaştırılır.
"""
import os
import sys

import cv2
import json
import numpy as np

KOK = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, KOK)
import hareket as HR  # noqa: E402

OKUMA = "/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/okuma"
KARELER = os.path.join(OKUMA, "kareler")
HR.PUS = 0.0          # eski sahnenin sabah huzmesi pusu burada yok


def yukle():
    bilgi = json.load(open(os.path.join(OKUMA, "kare1_bilgi.json")))
    im = cv2.imread(os.path.join(OKUMA, "kare1_buyuk.png"), cv2.IMREAD_UNCHANGED)
    im = im[..., :3][..., ::-1].astype(np.float32)
    im /= 65535.0 if im.max() > 255 else 255.0
    dep = np.load(os.path.join(OKUMA, "kare1_derinlik.npy")).astype(np.float32)
    dep = np.where((dep <= 0) | ~np.isfinite(dep), 1000.0, dep)
    return bilgi, im, dep


def main():
    bilgi, src, dep = yukle()
    dep = HR.hazirla(dep)
    os.makedirs(KARELER, exist_ok=True)
    secim = [int(x) for x in sys.argv[1].split(",")] if len(sys.argv) > 1 else None
    kareler = secim if secim else list(range(1, HR.N_KARE + 1))
    for k in kareler:
        out = HR.kare_uret(k - 1, bilgi, src, dep)
        HR.kaydet(out, os.path.join(KARELER, f"{k:04d}.png"))
        if k in (1, HR.N_KARE):
            HR.kaydet(out, os.path.join(OKUMA, "onizleme.png" if k == 1 else "onizleme_son.png"))
        print(k, flush=True)
    gercek = os.path.join(OKUMA, "son_kare_render.png")
    if os.path.exists(gercek) and not secim:
        a = HR.kare_uret(HR.N_KARE - 1, bilgi, src, dep, post=False, salinim=False)
        HR.kaydet(a, os.path.join(OKUMA, "son_kare_25d_ham.png"))
        g = cv2.imread(gercek)[..., ::-1].astype(np.float32) / 255.0
        d = np.abs(a - g).mean(2)
        yerel = cv2.blur(d, (31, 31))
        print(f"DOGRULAMA ortalama mutlak fark: {d.mean():.4f}  P99 {np.percentile(d, 99):.4f}  yerel(31px) en buyuk {yerel.max():.4f}")
        cv2.imwrite(os.path.join(OKUMA, "fark.png"), np.clip(d * 8 * 255, 0, 255).astype(np.uint8))


if __name__ == "__main__":
    main()
