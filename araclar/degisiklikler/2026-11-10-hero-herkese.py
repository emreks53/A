# -*- coding: utf-8 -*-
"""
10.11.2026 kullanıcı isteği: "İlk sayfadaki ülkemize faydalı yerine Herkese faydalı yazsın."
Ana sayfa büyük başlığı (hero): "Ülkemize faydalı, …" → "Herkese faydalı, …".
EN karşılığı: "…that benefit our country, …" → "…that benefit everyone, …" (çeviri belleği ve başlık verisi).
Şirket Profili paragrafındaki "ülkemize faydalı" (eski siteden aynen taşınan kurumsal metin) değişmedi.
Ardından EN: python3 araclar/ceviri/kur.py --yaz && python3 araclar/ceviri/ozel.py --yaz
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import degistir

KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ESKI = 'Ülkemize faydalı, prestijli gayrimenkul projelerini ideal şekilde gerçekleştirmek.'
YENI = 'Herkese faydalı, prestijli gayrimenkul projelerini ideal şekilde gerçekleştirmek.'
degistir('index.html', '>' + ESKI + '</h1>', '>' + YENI + '</h1>')

EN_ESKI = 'Realising prestigious real estate projects that benefit our country, in an ideal way.'
EN_YENI = 'Realising prestigious real estate projects that benefit everyone, in an ideal way.'
for yol, eski, yeni in [('araclar/ceviri/cikti/basliklar.json', ESKI, YENI),
                        ('araclar/ceviri/cikti/basliklar.json', EN_ESKI, EN_YENI),
                        ('araclar/ceviri/bellek/basliklar/1-genel.txt', EN_ESKI, EN_YENI)]:
    p = os.path.join(KOK, yol); s = open(p, encoding='utf-8').read()
    if eski in s:
        open(p, 'w', encoding='utf-8').write(s.replace(eski, yeni))
print('tamam')
