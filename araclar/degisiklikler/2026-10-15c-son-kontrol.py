# -*- coding: utf-8 -*-
"""
15.10.2026 son kontrol düzeltmeleri (kullanıcı: "sitenin son kontrollerini yap, en ufak hata kalmasın"):
 1) Alt bilgi ve Linkler sayfasındaki SPK bağlantısı (http://www.spk.gov.tr/index.aspx) SPK sitesinde
    "404 İçerik Bulunamadı" sayfasına gidiyordu → https://spk.gov.tr/ (bağlantı yazısı "SPK" aynı).
    Tüm TR/EN sayfalar, 404 ve panel şablonları (790 dosya, alt bilgide 1, Linkler sayfasında 2).
 2) 404 sayfası: TR metinde "Yatırımcı İlişkileri belge kütüphanesinde" → sitenin bölüm adıyla
    "Yatırımcı Köşesi'ndeki belge kütüphanesinde"; EN bölüme TR'deki gibi "Document Library" düğmesi.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import degistir

ESKI = 'href="http://www.spk.gov.tr/index.aspx"'
YENI = 'href="https://spk.gov.tr/"'
n = degistir('**/*.html', ESKI, YENI, dosya_basina=None)
print('SPK bağlantısı düzeltilen dosya:', n)

degistir('404.html', 'ana sayfaya dönebilir veya Yatırımcı İlişkileri belge kütüphanesinde arama yapabilirsiniz.',
         "ana sayfaya dönebilir veya Yatırımcı Köşesi'ndeki belge kütüphanesinde arama yapabilirsiniz.")
degistir('404.html', '<a class="btn" href="/en/investor-relations/">INVESTOR RELATIONS</a></p>',
         '<a class="btn" href="/en/investor-relations/">INVESTOR RELATIONS</a>'
         '<a class="btn" href="/en/investor-relations/document-library/">Document Library</a></p>')
print('404 sayfası düzeltildi')
