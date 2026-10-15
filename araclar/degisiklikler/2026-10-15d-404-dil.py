# -*- coding: utf-8 -*-
"""
15.10.2026 son kontrol: 404 sayfası iki dilli; sayfa dili tr, İngilizce bölüm lang="en" ile işaretlendi
(ekran okuyucuların doğru telaffuzu, WCAG 3.1.2 parça dili).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import degistir

degistir('404.html', '<p class="prose-ufuk"><b>The page you are looking for could not be found.</b>',
         '<p class="prose-ufuk" lang="en"><b>The page you are looking for could not be found.</b>')
degistir('404.html', '<p class="flex flex-wrap gap-3 mt-4"><a class="btn" href="/en/">Home</a>',
         '<p class="flex flex-wrap gap-3 mt-4" lang="en"><a class="btn" href="/en/">Home</a>')
print('404 İngilizce bölüm işaretlendi')
