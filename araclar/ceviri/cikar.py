# -*- coding: utf-8 -*-
"""Türkçe sayfalardan çeviri malzemesini çıkarır (araclar/ceviri/cikti/ altına):
  rotalar.json   TR rota → EN rota
  basliklar.json sayfa başlıkları (TR, mevcut EN)
  etiketler.json belge satırı adları (TR, mevcut EN örnekleri)
  birimler.json  gövde çeviri birimleri (benzersiz; kimlik, TR, sayı, örnek sayfa)
Çalıştırma: python3 araclar/ceviri/cikar.py
"""
import collections, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak import (SITE, CEVIRI, oku, dosya, rota, eslesme, duz, birimler, kimlik)
from bs4 import BeautifulSoup

CIKTI = os.path.join(CEVIRI, 'cikti'); os.makedirs(CIKTI, exist_ok=True)
OZEL = {'/', '/iletisim/', '/gizlilik-ve-cerez-politikasi/', '/arama/', '/yatirimci-iliskileri/belge-kutuphanesi/'}

es = eslesme()
json.dump(es, open(os.path.join(CEVIRI, 'rotalar.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)

def ana(s):
    m = re.search(r'<main id="icerik">(.*?)</main>', s, flags=re.S)
    return m.group(1) if m else ''

def h1(s):
    m = re.search(r'<h1[^>]*>(.*?)</h1>', ana(s), flags=re.S)
    return duz(m.group(1)) if m else ''

# 1) başlıklar
basliklar = []; rota_basliklari = {}
for tr, en in sorted(es.items()):
    s = oku(dosya(tr)); t = h1(s)
    en_s = oku(dosya(en)) if os.path.exists(os.path.join(SITE, dosya(en))) else ''
    basliklar.append({'rota': tr, 'en_rota': en, 'tr': t, 'en_mevcut': h1(en_s) if en_s else None, 'en_var': bool(en_s)})
    rota_basliklari[tr] = (t,)
json.dump(basliklar, open(os.path.join(CIKTI, 'basliklar.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# 2) belge satırı adları
etiket = collections.OrderedDict()
for tr, en in sorted(es.items()):
    s = ana(oku(dosya(tr)))
    en_s = ana(oku(dosya(en))) if os.path.exists(os.path.join(SITE, dosya(en))) else ''
    en_ad = {}
    for m in re.finditer(r'<a class="docrow" href="([^"]+)"[^>]*>.*?<span class="d-t">(.*?)</span><span class="d-f"', en_s, flags=re.S):
        en_ad.setdefault(m.group(1), duz(m.group(2)))
    for m in re.finditer(r'<a class="docrow" href="([^"]+)"[^>]*>.*?<span class="d-t">(.*?)</span><span class="d-f"', s, flags=re.S):
        t = duz(m.group(2))
        e = etiket.setdefault(t, {'tr': t, 'sayi': 0, 'en_mevcut': collections.Counter(), 'ornek': tr})
        e['sayi'] += 1
        if m.group(1) in en_ad: e['en_mevcut'][en_ad[m.group(1)]] += 1
liste = [{'tr': v['tr'], 'sayi': v['sayi'], 'en_mevcut': dict(v['en_mevcut']), 'ornek': v['ornek']} for v in etiket.values()]
json.dump(liste, open(os.path.join(CIKTI, 'etiketler.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# 3) gövde birimleri
birim = collections.OrderedDict()
for tr, en in sorted(es.items()):
    if tr in OZEL:
        continue
    s = oku(dosya(tr)); m = ana(s)
    # başlık bölümü (breadcrumb, kicker, h1) ayrı çevrilir; gövde: h1'in bulunduğu div'den sonrası
    soup = BeautifulSoup(m, 'html.parser')
    for b in soup.find_all(['h1']):
        b.decompose()
    for p in soup.find_all('p', class_='kicker'):
        p.decompose()
    for b in birimler(soup, rota_basliklari):
        k = kimlik(b.anahtar)
        e = birim.setdefault(k, {'id': k, 'tr': b.anahtar, 'sayi': 0, 'ornek': tr})
        e['sayi'] += 1
json.dump(list(birim.values()), open(os.path.join(CIKTI, 'birimler.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('rota', len(es), 'başlık', len(basliklar), 'etiket', len(liste), 'birim', len(birim),
      'birim karakter', sum(len(v['tr']) for v in birim.values()))
