"""PNG ekran görüntüsünü WebP'ye çevirir: kayıpsız ile kalite-92 arasından uygun olanı seçer.

Düz renkli, çizgisel ve piksel stiller kayıpsız (keskin kalır), dokulu/boyalı stiller kayıplı (küçük kalır) saklanır.
Kullanım: python3 webp.py girdi.png cikti.webp
"""
import io
import sys

from PIL import Image

girdi, cikti = sys.argv[1], sys.argv[2]
im = Image.open(girdi).convert("RGB")
if im.size != (1024, 1024):
    print(f"uyarı: boyut {im.size}, 1024x1024 bekleniyordu", file=sys.stderr)
kayipsiz = io.BytesIO()
im.save(kayipsiz, "WEBP", lossless=True, method=6)
kayipli = io.BytesIO()
im.save(kayipli, "WEBP", quality=92, method=6)
if kayipsiz.tell() <= kayipli.tell() * 1.3:
    veri, tur = kayipsiz.getvalue(), "kayıpsız"
else:
    veri, tur = kayipli.getvalue(), "q92"
with open(cikti, "wb") as f:
    f.write(veri)
print(f"{tur} {len(veri) // 1024} KB")
