# -*- coding: utf-8 -*-
"""
03.11.2026 kullanıcı: Google arama sonucunda simge hâlâ eski (Google'ın simge önbelleği eski siteden kalma kırpık
görseli veriyor; dizine ekleme isteği 30.10.2026'da gönderildi). Google simgeyi adresine göre önbelleğe aldığı için
simge yeni bir adresle verilir: /favicon-192.png (192×192, 48'in katı; 2026-10-29 tasarımıyla aynı: logonun tamamı
beyaz kare zeminde, genişliğin %86'sı). Sayfalardaki 96 px PNG bağlantısı bununla değişir; favicon.ico (tarayıcılar
için) ve apple-touch-icon aynı kalır. Eski /favicon-96.png dosyası silinmez (önbellekteki eski sayfalar için).
"""
import os, sys
import PIL.ImageOps as O
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import degistir

SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'site')
L = Image.open(os.path.join(SITE, 'logo', 'idealist-gyo-logo-330.jpg')).convert('RGB')
L = L.crop(O.invert(L.convert('L')).point(lambda v: 255 if v > 18 else 0).getbbox())
n = 192; im = Image.new('RGB', (n, n), 'white')
w = round(n * 0.86); h = round(L.height * w / L.width)
im.paste(L.resize((w, h), Image.LANCZOS), ((n - w) // 2, (n - h) // 2))
im.save(os.path.join(SITE, 'favicon-192.png'), optimize=True)

k = degistir('**/*.html', '<link rel="icon" href="/favicon-96.png" type="image/png" sizes="96x96">',
             '<link rel="icon" href="/favicon-192.png" type="image/png" sizes="192x192">', dosya_basina=None)
print('favicon-192.png yazıldı; sayfa:', k)
