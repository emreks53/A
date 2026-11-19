"""Kapanis sahnesi icin CC0 varliklari (Poly Haven) indirir.

Tum varliklar Poly Haven'dan (https://polyhaven.com), lisans: CC0 1.0 (kamu mali).
Her varlik kendi alt klasorune iner: <VARLIK>/<ad>/...

Kullanilan varliklar:
  - white_oak_veneer      (doku, Jenelle van Heerden)  -> masa ustu (acik, sicak mese)
  - walnut_veneer_02      (doku, Jenelle van Heerden)  -> iki basamakli kaide + Kur'an rahlesi (ceviz)
  - plastered_wall_04     (doku, Rob Tuytel)           -> krem siva arka duvar
  - leather_red_02        (doku, Rob Tuytel)           -> kitap derisi grenli kabartma + puruzluluk
  - leather_white         (doku, Rob Tuytel)           -> Kur'an cildi deri greni + puruzluluk
  - brown_photostudio_05  (HDRI, Sergej Majboroda)     -> ortam isigi / yansimalar (dusuk siddet)
Diger her sey (kitap/cilt geometrisi, sirt yazilari, varak maskeleri, semse, isiklar) kodla uretilir;
yazi tipi: EB Garamond (OFL), ../fontlar/.
"""
import json
import os
import sys
import urllib.request

SCRATCH = "/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/kapanis"
VARLIK = os.path.join(SCRATCH, "varlik")

# ad -> (tur, cozunurluk, haritalar)
DOKULAR = {
    "white_oak_veneer": ("2k", ["Diffuse", "nor_gl", "Rough"]),     # masa ustu (acik, sicak mese)
    "walnut_veneer_02": ("4k", ["Diffuse", "nor_gl", "Rough"]),     # basamakli kaide + rahle
    "plastered_wall_04": ("2k", ["Diffuse", "nor_gl", "Rough"]),    # krem siva duvar
    "leather_white": ("2k", ["Diffuse", "nor_gl", "Rough", "Displacement"]),        # Kur'an cildi deri dokusu
    "leather_red_02": ("2k", ["nor_gl", "Rough", "Displacement"]),                  # kitap derisi grenli normal
}
HDRI = {"brown_photostudio_05": "2k"}

LISANS = "CC0 1.0 (Poly Haven)"


def _get(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    tmp = path + ".part"
    req = urllib.request.Request(url, headers={"User-Agent": "kapanis-render/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            f.write(b)
    os.replace(tmp, path)
    return path


def _files(asset):
    req = urllib.request.Request("https://api.polyhaven.com/files/" + asset,
                                 headers={"User-Agent": "kapanis-render/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def indir():
    os.makedirs(VARLIK, exist_ok=True)
    kayit = {}
    for ad, (res, maps) in DOKULAR.items():
        d = os.path.join(VARLIK, ad)
        os.makedirs(d, exist_ok=True)
        fl = _files(ad)
        kayit[ad] = {}
        for m in maps:
            url = fl[m][res]["jpg"]["url"]
            p = os.path.join(d, os.path.basename(url))
            _get(url, p)
            kayit[ad][m] = p
    for ad, res in HDRI.items():
        d = os.path.join(VARLIK, ad)
        os.makedirs(d, exist_ok=True)
        fl = _files(ad)
        url = fl["hdri"][res]["hdr"]["url"]
        p = os.path.join(d, os.path.basename(url))
        _get(url, p)
        kayit[ad] = {"hdri": p}
    with open(os.path.join(VARLIK, "varliklar.json"), "w") as f:
        json.dump({"lisans": LISANS, "kaynak": "https://polyhaven.com", "dosyalar": kayit}, f, indent=1)
    return kayit


def yol(ad, harita):
    with open(os.path.join(VARLIK, "varliklar.json")) as f:
        return json.load(f)["dosyalar"][ad][harita]


if __name__ == "__main__":
    k = indir()
    json.dump(k, sys.stdout, indent=1)
