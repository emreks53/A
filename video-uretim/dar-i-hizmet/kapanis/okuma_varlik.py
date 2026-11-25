"""Okuma köşesi kapanışının dış varlıkları: indirme ve hazırlık.

- HDRI: Poly Haven 'small_harbour_sunset' (CC0 1.0), 8k .hdr. Güneş HDRI'dan ayrılır (2.2 derecelik diskin
  içi, çevresindeki gökten uydurulan düzlemle doldurulur); güneşin yönü, ışınımı ve rengi ölçülüp
  <ad>_gunes.json'a yazılır. Sahnede güneş, aynı yönde bir güneş lambası olarak yeniden konur (keskin, tutarlı
  gölgeler; daha az gürültü). Sahne ayrıca 2k küçültülmüş güneşsiz sürümü (deneme render'ları) kullanır.
- Yazı tipi: Amiri Bold (SIL OFL 1.1, aliftype/amiri), npm @fontsource/amiri paketinden; woff2 -> ttf.

python3 okuma_varlik.py
"""
import io
import json
import math
import os
import tarfile
import urllib.request

import cv2
import numpy as np

OKUMA = "/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/okuma"
VARLIK = os.path.join(OKUMA, "varlik")
FONT = os.path.join(OKUMA, "font")
HDRI_AD = "small_harbour_sunset"
UA = {"User-Agent": "kapanis-render/1.0"}


def _al(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
        return r.read()


def hdri_indir(ad=HDRI_AD, cozunurluk="8k"):
    os.makedirs(VARLIK, exist_ok=True)
    yol = os.path.join(VARLIK, f"{ad}_{cozunurluk}.hdr")
    if not os.path.exists(yol):
        fl = json.loads(_al("https://api.polyhaven.com/files/" + ad))
        open(yol, "wb").write(_al(fl["hdri"][cozunurluk]["hdr"]["url"]))
    return yol


def gunes_ayir(ad=HDRI_AD):
    im = cv2.imread(os.path.join(VARLIK, ad + "_8k.hdr"), cv2.IMREAD_ANYDEPTH | cv2.IMREAD_COLOR)[..., ::-1].astype(np.float32)
    H, W = im.shape[:2]
    L = im @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    y0, x0 = np.unravel_index(np.argmax(cv2.GaussianBlur(L, (0, 0), 3)), L.shape)
    az = (x0 + 0.5) / W * 360 - 180
    el = 90 - (y0 + 0.5) / H * 180
    R = int(2.2 * W / 360)
    ys, xs = np.mgrid[y0 - 3 * R:y0 + 3 * R + 1, x0 - 3 * R:x0 + 3 * R + 1]
    xsw = xs % W
    r = np.hypot(xs - x0, ys - y0)
    yama = im[ys, xsw].copy()
    halka = (r > R) & (r < 2.5 * R)
    A_ = np.stack([xs[halka] - x0, ys[halka] - y0, np.ones(halka.sum())], 1)
    dolgu = np.zeros_like(yama)
    for c in range(3):
        k, *_ = np.linalg.lstsq(A_, yama[halka][:, c], rcond=None)
        dolgu[..., c] = k[0] * (xs - x0) + k[1] * (ys - y0) + k[2]
    ic = r <= R
    fazla = np.clip(yama - dolgu, 0, None) * ic[..., None]
    cosel = np.cos(np.radians(90 - (ys + 0.5) / H * 180))
    dOm = (2 * math.pi / W) * (math.pi / H) * cosel
    E = (fazla * dOm[..., None]).sum((0, 1))
    w = np.clip((r - R * 0.8) / (R * 0.2), 0, 1)[..., None]
    w = np.where(r[..., None] > R, 1.0, w)
    im[ys, xsw] = yama * w + np.minimum(yama, dolgu) * (1 - w)
    cv2.imwrite(os.path.join(VARLIK, ad + "_8k_gunessiz.hdr"), im[..., ::-1].copy())
    cv2.imwrite(os.path.join(VARLIK, ad + "_2k_gunessiz.hdr"),
                cv2.resize(im, (2048, 1024), interpolation=cv2.INTER_AREA)[..., ::-1].copy())
    bilgi = dict(az=float(az), el=float(el), isinim=float(E.max()), renk=[float(x) for x in E / E.max()],
                 E=[float(x) for x in E])
    json.dump(bilgi, open(os.path.join(VARLIK, ad + "_gunes.json"), "w"), indent=1)
    return bilgi


def amiri():
    os.makedirs(FONT, exist_ok=True)
    hedef = os.path.join(FONT, "Amiri-700.ttf")
    if os.path.exists(hedef):
        return hedef
    meta = json.loads(_al("https://registry.npmjs.org/@fontsource/amiri/latest"))
    tgz = _al(meta["dist"]["tarball"])
    with tarfile.open(fileobj=io.BytesIO(tgz)) as tf:
        veri = tf.extractfile("package/files/amiri-arabic-700-normal.woff2").read()
    from fontTools.ttLib import TTFont
    f = TTFont(io.BytesIO(veri))
    f.flavor = None
    f.save(hedef)
    return hedef


if __name__ == "__main__":
    print(hdri_indir())
    print(gunes_ayir())
    print(amiri())
