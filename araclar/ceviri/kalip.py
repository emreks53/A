# -*- coding: utf-8 -*-
"""Kalıplı Türkçe başlık ve belge adlarının İngilizce karşılıkları (çeviri belleğinde tek tek yazılmayanlar)."""
import re

AYLAR = {'Ocak': 'January', 'Şubat': 'February', 'Mart': 'March', 'Nisan': 'April', 'Mayıs': 'May', 'Haziran': 'June',
         'Temmuz': 'July', 'Ağustos': 'August', 'Eylül': 'September', 'Ekim': 'October', 'Kasım': 'November', 'Aralık': 'December'}

BASLIK = [
    (r'^(\d{2}\.\d{2}\.\d{4}) Özel Durum Açıkla(?:n)?ması$', lambda m: f'Material Event Disclosure dated {m.group(1)}'),
    (r'^(\d{4}) Yılı Özel Durum Açıklamaları$', lambda m: f'{m.group(1)} Material Event Disclosures'),
    (r'^(\d{4}) Yılı Faaliyet Raporları$', lambda m: f'{m.group(1)} Annual Reports'),
    (r'^İdealist GYO A\.Ş\. Portföy Tablosu - (\w+) (\d{4})$', lambda m: f'İdealist GYO A.Ş. Portfolio Table – {AYLAR[m.group(1)]} {m.group(2)}'),
]

DONEM = {'3 Aylık': '3-Month', '6 Aylık': '6-Month', '6Aylık': '6-Month', '9 Aylık': '9-Month', '12 Aylık': '12-Month',
         '12 aylık': '12-Month', 'Yıllık': 'Annual'}

ETIKET = [
    (r'^(.+?) dosyasını indirmek için tıklayınız$', lambda m: f'Click here to download {m.group(1)}'),
    (r'^(\S+) adresine gitmek için tıklayınız$', lambda m: f'Click here to visit {m.group(1)}'),
]

def etiket(tr):
    t = tr.strip()
    if t in DONEM:
        return DONEM[t]
    m = re.match(r'^(\d{4}) (.+)$', t)
    if m and m.group(2) in DONEM:
        return f'{m.group(1)} {DONEM[m.group(2)]}'
    for desen, f in ETIKET:
        m = re.match(desen, t)
        if m:
            return f(m)
    return baslik(t)

def baslik(tr):
    for desen, f in BASLIK:
        m = re.match(desen, tr.strip())
        if m:
            return f(m)
    return None
