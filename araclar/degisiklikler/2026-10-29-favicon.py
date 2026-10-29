# -*- coding: utf-8 -*-
"""
29.10.2026 kullanıcı: Google arama sonucundaki site simgesinde logo yarım görünüyor.
Eski simge, yatay logonun sağ kısmından kırpılmış kareydi ("ilist" + kurdele); Google simgeyi daireye de kırptığı için
logo kesik görünüyordu. Yeni simge: logonun tamamı (site/logo/idealist-gyo-logo-330.jpg, beyaz kenarları atılmış)
beyaz kare zeminde ortada, genişliğin %86'sı — daire kırpmasında da logo bütünüyle görünür.
Dosya adları aynı (favicon.ico 16/32/48, favicon-96.png, apple-touch-icon.png 180); sayfalara dokunulmaz.
"""
import os
import PIL.ImageOps as O
from PIL import Image

SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'site')
L = Image.open(os.path.join(SITE, 'logo', 'idealist-gyo-logo-330.jpg')).convert('RGB')
L = L.crop(O.invert(L.convert('L')).point(lambda v: 255 if v > 18 else 0).getbbox())

def kare(n, oran=0.86):
    im = Image.new('RGB', (n, n), 'white')
    w = round(n * oran); h = round(L.height * w / L.width)
    im.paste(L.resize((w, h), Image.LANCZOS), ((n - w) // 2, (n - h) // 2))
    return im

kare(180).save(os.path.join(SITE, 'apple-touch-icon.png'), optimize=True)
kare(96).save(os.path.join(SITE, 'favicon-96.png'), optimize=True)
kare(256).save(os.path.join(SITE, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
print('simgeler yazıldı')
