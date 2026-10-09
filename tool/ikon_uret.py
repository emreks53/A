#!/usr/bin/env python3
"""Uygulama simgelerini ve açılış görsellerini tool/ikon/logo.jpg'den üretir.

Kullanım (proje kökünden): python3 tool/ikon_uret.py
Gerekir: Pillow, numpy.

Logo: lacivert radyal geçişli zemin üzerinde beyaz kitap ve ışınlar. Beyaz simge
zeminden ayrılır (kırmızı kanal: zemin ≈ 0, simge ≈ 255), zemin de simgenin
altı doldurularak yeniden kurulur. Böylece Android'in uyarlanabilir simgesi
için ayrı ön/arka katman, Android 13'ün tek renkli simgesi ve uygulama içi
logo işareti aynı kaynaktan çıkar.
"""
import json
import os

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "tool", "ikon", "logo.jpg")
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
IOS = os.path.join(ROOT, "ios", "Runner", "Assets.xcassets")
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def box(a, r, axis):
    pad = [(0, 0), (0, 0)]
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis)
    hi = np.take(c, np.arange(2 * r + 1, c.shape[axis]), axis=axis)
    lo = np.take(c, np.arange(0, c.shape[axis] - 2 * r - 1), axis=axis)
    return (hi - lo) / (2 * r + 1)

def blur(a, r):
    # Üç kez kutu bulanıklığı ≈ Gauss bulanıklığı.
    k = max(1, int(r * 0.8))
    for _ in range(3):
        a = box(box(a, k, 0), k, 1)
    return a


def box_blur(a, r):
    return box(box(a, r, 0), r, 1)


def load():
    rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
    # Simgenin örtücülüğü: zeminde kırmızı kanal ~0, beyazda ~255.
    alpha = np.clip((rgb[..., 0] - 30.0) / 200.0, 0.0, 1.0)
    # Zemin: logodaki radyal geçiş. Simgenin (biraz genişletilmiş) dışında kalan
    # noktaların renkleri merkeze uzaklığa göre ortalanıp pürüzsüz bir geçiş
    # olarak yeniden çizilir; böylece ışınların izi zeminde kalmaz.
    free = box_blur(alpha, 10) < 0.002
    h, w = alpha.shape
    yy, xx = np.mgrid[0:h, 0:w]
    radius = np.hypot(yy - (h - 1) / 2, xx - (w - 1) / 2)
    bins = np.minimum((radius / radius.max() * 400).astype(int), 399)
    profile = np.zeros((400, 3))
    for c in range(3):
        sums = np.bincount(bins[free], weights=rgb[..., c][free], minlength=400)
        counts = np.bincount(bins[free], minlength=400)
        known = counts > 50
        values = sums[known] / counts[known]
        profile[:, c] = np.interp(np.arange(400), np.nonzero(known)[0], values)
    kernel = np.ones(15) / 15
    for c in range(3):
        profile[:, c] = np.convolve(np.pad(profile[:, c], 7, mode="edge"), kernel, mode="valid")
    bg = profile[bins]
    return rgb, alpha, bg


def to_img(arr, mode="RGB"):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode)


def white_mark(alpha):
    a = (alpha * 255).astype(np.uint8)
    img = Image.new("RGBA", (alpha.shape[1], alpha.shape[0]), (255, 255, 255, 0))
    img.putalpha(Image.fromarray(a, "L"))
    return img


def fit(img, size, content):
    """[img]'i [content] oranında küçültüp [size] karelik şeffaf tuvalin ortasına koyar."""
    inner = max(1, round(size * content))
    small = img.resize((inner, inner), Image.LANCZOS)
    canvas = Image.new(img.mode, (size, size), (0, 0, 0, 0) if img.mode == "RGBA" else None)
    off = (size - inner) // 2
    canvas.paste(small, (off, off), small if img.mode == "RGBA" else None)
    return canvas


def rounded(img, radius_ratio):
    size = img.size[0]
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=int(size * 4 * radius_ratio), fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask.resize((size, size), Image.LANCZOS))
    return out


def main():
    rgb, alpha, bg = load()
    logo = to_img(rgb)
    mark = white_mark(alpha)
    background = to_img(bg)

    # Android uyarlanabilir simge: 108dp tuval; görünür alan ortadaki 72dp, güvenli alan 66dp.
    # Simge logoda genişliğin %63'ünü kaplar; görünür 72dp'lik alanda da logodaki oranı (~45dp)
    # korusun diye logo 108dp tuvalin %66'sına yerleştirilir.
    for name, scale in DENSITIES.items():
        folder = os.path.join(RES, f"mipmap-{name}")
        os.makedirs(folder, exist_ok=True)
        s = round(108 * scale)
        fit(mark, s, 0.66).save(os.path.join(folder, "ic_launcher_foreground.png"), optimize=True)
        fit(mark, s, 0.66).save(os.path.join(folder, "ic_launcher_monochrome.png"), optimize=True)
        background.resize((s, s), Image.LANCZOS).save(os.path.join(folder, "ic_launcher_background.png"), optimize=True)
        legacy = round(48 * scale)
        rounded(logo.resize((legacy, legacy), Image.LANCZOS), 0.2).save(os.path.join(folder, "ic_launcher.png"), optimize=True)
        # Android 12 öncesi açılış ekranı: lacivert zeminin ortasında beyaz işaret (120dp).
        drawable = os.path.join(RES, f"drawable-{name}")
        os.makedirs(drawable, exist_ok=True)
        fit(mark.crop(mark.getbbox()), round(120 * scale), 1.0).save(os.path.join(drawable, "splash_mark.png"), optimize=True)

    # iOS uygulama simgeleri (şeffaflık olmadan; köşeleri iOS yuvarlar).
    icon_set = os.path.join(IOS, "AppIcon.appiconset")
    contents = json.load(open(os.path.join(icon_set, "Contents.json")))
    for image in contents["images"]:
        if "filename" not in image:
            continue
        points = float(image["size"].split("x")[0])
        px = round(points * float(image["scale"].rstrip("x")))
        logo.resize((px, px), Image.LANCZOS).save(os.path.join(icon_set, image["filename"]), optimize=True)
    # iOS açılış ekranı: lacivert zeminin ortasında beyaz işaret (120pt).
    launch = os.path.join(IOS, "LaunchImage.imageset")
    for suffix, scale in (("", 1), ("@2x", 2), ("@3x", 3)):
        fit(mark.crop(mark.getbbox()), 120 * scale, 1.0).save(os.path.join(launch, f"LaunchImage{suffix}.png"), optimize=True)

    # Uygulama içi logo işareti (beyaz; uygulama içinde istenen renge boyanır).
    cropped = mark.crop(mark.getbbox())
    side = max(cropped.size)
    square = Image.new("RGBA", (side, side), (255, 255, 255, 0))
    square.paste(cropped, ((side - cropped.size[0]) // 2, (side - cropped.size[1]) // 2))
    out = os.path.join(ROOT, "assets", "images")
    os.makedirs(out, exist_ok=True)
    square.resize((288, 288), Image.LANCZOS).save(os.path.join(out, "logo_isaret.png"), optimize=True)
    # Zemin renkleri (koyu kenar ve açık merkez), tema ve açılış ekranı için.
    h, w = bg.shape[:2]
    center = bg[h // 2, w // 2].astype(int)
    edge = bg[h // 2, int(w * 0.04)].astype(int)
    print("merkez #%02X%02X%02X  kenar #%02X%02X%02X" % (*center, *edge))


if __name__ == "__main__":
    main()
