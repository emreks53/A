#!/usr/bin/env python3
"""tool/magaza/shots/ altındaki görselleri Google Play'e uygun (saydamlıksız) PNG olarak
store/google-play/ altına kopyalar; 512x512 simgeyi tool/ikon/logo.jpg'den üretir."""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHOTS = os.path.join(ROOT, "tool", "magaza", "shots")
OUT = os.path.join(ROOT, "store", "google-play")
os.makedirs(os.path.join(OUT, "ekran-goruntuleri"), exist_ok=True)
for name in sorted(os.listdir(SHOTS)):
    img = Image.open(os.path.join(SHOTS, name)).convert("RGB")
    target = "one-cikan-gorsel-1024x500.png" if name.startswith("one_cikan") else os.path.join("ekran-goruntuleri", name)
    img.save(os.path.join(OUT, target), optimize=True)
Image.open(os.path.join(ROOT, "tool", "ikon", "logo.jpg")).convert("RGB").resize((512, 512), Image.LANCZOS).save(
    os.path.join(OUT, "simge-512.png"), optimize=True)
print("store/google-play/ güncellendi")
