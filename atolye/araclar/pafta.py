"""Bütün stillerin örneklerini tek bir paftada toplar ve galeri için küçük görseller üretir.

Önce `node atolye/araclar/katalog.mjs` çalıştırılmış olmalı (katalog.json'u okur).
Çıktılar:
  stiller/<klasör>/kucuk.webp  — 480 px küçük görsel (galeri ızgarası için)
  pafta.webp                   — bütün stiller numaralarıyla, 8 sütunlu tek görsel
Kullanım: python3 atolye/araclar/pafta.py
"""
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

KOK = Path(__file__).resolve().parent.parent
KATALOG = json.loads((KOK / "katalog.json").read_text(encoding="utf-8"))

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_KALIN = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def yazi_tipi(yol, boy):
    try:
        return ImageFont.truetype(yol, boy)
    except OSError:
        return ImageFont.load_default()


ZEMIN = (244, 243, 238)
MUREKKEP = (27, 37, 32)
SOLUK = (104, 112, 106)
YESIL = (47, 110, 62)
ALTIN = (176, 138, 46)

# küçük görseller
for s in KATALOG:
    kaynak = KOK / s["gorsel"]
    if not kaynak.exists():
        continue
    im = Image.open(kaynak).convert("RGB")
    im.thumbnail((480, 480), Image.LANCZOS)
    im.save(KOK / s["kucuk"], "WEBP", quality=86, method=6)

# pafta
SUTUN = 8 if len(KATALOG) <= 48 else 10
KARE = 240
ARA = 18
ETIKET = 46
UST = 112
satir = math.ceil(len(KATALOG) / SUTUN)
genislik = SUTUN * KARE + (SUTUN + 1) * ARA
yukseklik = UST + satir * (KARE + ETIKET + ARA) + ARA
pafta = Image.new("RGB", (genislik, yukseklik), ZEMIN)
ciz = ImageDraw.Draw(pafta)
ciz.text((ARA, 26), "Atölye · Stil Kataloğu", font=yazi_tipi(FONT_KALIN, 38), fill=MUREKKEP)
ozgun = sum(1 for s in KATALOG if s["ozgun"])
alt_baslik = f"{len(KATALOG)} stil · {ozgun} atölye üslubu (✦) · hepsi aynı sahne: Yeşil Kubbe, minare ve çiçekler"
ciz.text((ARA, 74), alt_baslik, font=yazi_tipi(FONT, 19), fill=SOLUK)

f_kod = yazi_tipi(FONT_MONO, 15)
f_ad = yazi_tipi(FONT_KALIN, 16)
for i, s in enumerate(KATALOG):
    sx, sy = i % SUTUN, i // SUTUN
    x = ARA + sx * (KARE + ARA)
    y = UST + sy * (KARE + ETIKET + ARA)
    kaynak = KOK / s["gorsel"]
    if kaynak.exists():
        im = Image.open(kaynak).convert("RGB").resize((KARE, KARE), Image.LANCZOS)
        pafta.paste(im, (x, y))
    else:
        ciz.rectangle([x, y, x + KARE, y + KARE], outline=SOLUK)
    kod = s["kod"] + (" ✦" if s["ozgun"] else "")
    ciz.text((x, y + KARE + 6), kod, font=f_kod, fill=ALTIN if s["ozgun"] else YESIL)
    ad = s["ad"]
    while ciz.textlength(ad, font=f_ad) > KARE and len(ad) > 4:
        ad = ad[:-2].rstrip() + "…"
    ciz.text((x, y + KARE + 24), ad, font=f_ad, fill=MUREKKEP)

pafta.save(KOK / "pafta.webp", "WEBP", quality=88, method=6)
print(f"pafta.webp {genislik}×{yukseklik}, {len(KATALOG)} stil; küçük görseller yazıldı")
