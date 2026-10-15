# -*- coding: utf-8 -*-
"""site/yonetim/panel/index.html dosyasını üretir: giriş sayfasının ortak stili + panel.css + govde.html + panel.js.
Panel sayfası oturum ister (functions/_middleware.ts); oturumsuz istek /yonetim/ girişine yönlenir.
Çalıştırma: python3 araclar/panel-sayfasi/olustur.py"""
import os, re
K = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.join(os.path.dirname(os.path.dirname(K)), 'site')
giris = open(os.path.join(SITE, 'yonetim', 'index.html'), encoding='utf-8').read()
stil = re.search(r'<style>(.*?)</style>', giris, flags=re.S).group(1)
oku = lambda a: open(os.path.join(K, a), encoding='utf-8').read()
html = ('<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        '<meta name="robots" content="noindex, nofollow"><title>Yönetim Paneli · İdealist GYO</title>'
        '<link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">'
        f'<style>{stil}\n{oku("panel.css")}</style></head>'
        + oku('govde.html').strip().replace('</body></html>', f'<script>{oku("panel.js")}</script></body></html>'))
os.makedirs(os.path.join(SITE, 'yonetim', 'panel'), exist_ok=True)
open(os.path.join(SITE, 'yonetim', 'panel', 'index.html'), 'w', encoding='utf-8').write(html)
print('yazıldı: site/yonetim/panel/index.html', len(html))
