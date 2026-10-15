#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Eski site adreslerinden yeni adreslere 301 haritasını (panel/yonlendirmeler.json) yeniden üretir.

1) Eski siteyi (www.idealistgyo.com, eski barındırma) gezer, aynı alan adındaki tüm adresleri toplar
   (sayfalar gezilir; belge/görsel adresleri yalnızca kaydedilir, indirilmez).
2) Her eski adresi canlı yeni sitede (idealistgyo.pages.dev) yönlendirme izlemeden ister;
   301 dönen hedefleri haritaya yazar.

Kullanım: python3 araclar/yonlendirme-haritasi.py [--eski https://www.idealistgyo.com] [--yeni https://idealistgyo.pages.dev]
Yalnızca standart kütüphane ve curl kullanır (vekil sunucu ayarları curl'den gelir).
"""
import json, re, subprocess, sys, html, os, concurrent.futures as cf
from urllib.parse import urljoin, urlparse

ESKI = 'https://www.idealistgyo.com'; YENI = 'https://idealistgyo.pages.dev'
args = sys.argv[1:]
if '--eski' in args: ESKI = args[args.index('--eski') + 1].rstrip('/')
if '--yeni' in args: YENI = args[args.index('--yeni') + 1].rstrip('/')
ONEKLER = ('/tr.php', '/en.php', '/index.php', '/download.php', '/dosyalar/', '/resimler/', '/swf/')
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CIKTI = os.path.join(KOK, 'panel', 'yonlendirmeler.json')

def getir(url, govde=True):
    cmd = ['curl', '-s', '--max-time', '60', '-w', '\n%{http_code} %{content_type} %{redirect_url}']
    if not govde: cmd += ['-o', '/dev/null']
    r = subprocess.run(cmd + [url], capture_output=True)
    out = r.stdout.decode('utf-8', 'replace') if govde else r.stdout.decode()
    body, _, meta = out.rpartition('\n')
    parts = meta.split(' ', 2) + ['', '']
    return body, parts[0], parts[1], parts[2]

def yol(u):
    p = urlparse(u)
    return (p.path or '/') + (('?' + p.query) if p.query else '')

host = urlparse(ESKI).netloc
gorulen, sayfalar, kuyruk = set(), set(), ['/', '/tr.php', '/en.php']
def sayfa_mi(y):
    return y == '/' or y.split('?')[0] in ('/tr.php', '/en.php', '/index.php')
while kuyruk:
    yeni_kuyruk = []
    with cf.ThreadPoolExecutor(4) as ex:
        isler = {ex.submit(getir, ESKI + y): y for y in kuyruk if y not in sayfalar}
        for f in cf.as_completed(isler):
            y = isler[f]; sayfalar.add(y)
            body, kod, ctype, _ = f.result()
            if kod != '200' or 'html' not in ctype: continue
            for href in re.findall(r'''(?:href|src)\s*=\s*["']([^"']+)["']''', body, flags=re.I):
                href = html.unescape(href.strip())
                if href.startswith(('mailto:', 'javascript:', 'tel:', '#')): continue
                u = urljoin(ESKI + y, href); p = urlparse(u)
                if p.netloc and p.netloc.lower() not in (host, host.replace('www.', '')): continue
                yy = yol(u).replace(' ', '%20')
                if yy not in gorulen:
                    gorulen.add(yy)
                    if sayfa_mi(yy) and yy not in sayfalar: yeni_kuyruk.append(yy)
    kuyruk = sorted(set(yeni_kuyruk))
    print('sayfa', len(sayfalar), 'adres', len(gorulen), 'kuyruk', len(kuyruk), flush=True)

adaylar = sorted(a for a in gorulen | sayfalar if a.startswith(ONEKLER))
harita = {}
def dene(a):
    _, kod, _, hedef = getir(YENI + a, govde=False)
    return a, kod, hedef
with cf.ThreadPoolExecutor(8) as ex:
    for a, kod, hedef in ex.map(dene, adaylar):
        if kod in ('301', '308') and hedef:
            harita[a] = yol(hedef) if hedef.startswith('http') else hedef
print('aday', len(adaylar), 'yonlendirme', len(harita))
os.makedirs(os.path.dirname(CIKTI), exist_ok=True)
onceki = json.load(open(CIKTI, encoding='utf-8')) if os.path.exists(CIKTI) else {}
onceki.update(harita)
json.dump(dict(sorted(onceki.items())), open(CIKTI, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('yazildi', CIKTI, len(onceki))
