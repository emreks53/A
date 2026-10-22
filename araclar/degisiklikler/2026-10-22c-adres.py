# -*- coding: utf-8 -*-
"""
22.10.2026 kullanıcı isteği: alt bilgideki adres satırında yazım yanlışı varsa düzelt.
"Kısıklı Mah. Hanım Seti Sok No:38 Üsküdar / İstanbul" → "Kısıklı Mah. Hanımseti Sok. No:38 Üsküdar / İstanbul"
 - Sokak adı şirketin kendi belgelerindeki (genel kurul ilanları, ticaret sicil metinleri) yazımla bitişik: "Hanımseti".
 - "Sok" kısaltmasına nokta ("Mah." ile tutarlı).
Alt bilgi, iletişim sayfaları, yapılandırılmış veri, arama verisi, 404 ve panel şablonları (tüm TR/EN dosyalar) ve
çeviri belleği. Belge ve haber metinlerindeki adresler (eski kayıtlar) değişmez.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import degistir

ESKI = 'Kısıklı Mah. Hanım Seti Sok No:38 Üsküdar / İstanbul'
YENI = 'Kısıklı Mah. Hanımseti Sok. No:38 Üsküdar / İstanbul'
n = degistir('**/*.html', ESKI, YENI, dosya_basina=None)
print('düzeltilen dosya:', n)
