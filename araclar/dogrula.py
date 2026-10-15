#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Yayındaki site ile depodaki site/ klasörünü karşılaştırır (her dosyanın SHA-256 özeti).

Kullanım: python3 araclar/dogrula.py [--adres https://idealistgyo.pages.dev] [--desen '**/*'] [--is 12]
Panelden içerik eklenmişse ilgili HTML sayfaları sunucuda değiştiği için farklı çıkar (beklenen).
_headers, _routes.json ve yonetim/panel/ (oturum ister) karşılaştırılmaz.
"""
import hashlib, os, subprocess, sys, concurrent.futures as cf, glob, urllib.parse
K = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SITE = os.path.join(K, 'site')
a = sys.argv[1:]
ADRES = a[a.index('--adres') + 1].rstrip('/') if '--adres' in a else 'https://idealistgyo.pages.dev'
DESEN = a[a.index('--desen') + 1] if '--desen' in a else '**/*'
IS = int(a[a.index('--is') + 1]) if '--is' in a else 12
ATLA = ('_headers', '_routes.json', 'yonetim/panel/')
yollar = [os.path.relpath(p, SITE) for p in glob.glob(os.path.join(SITE, DESEN), recursive=True) if os.path.isfile(p)]
yollar = sorted(y for y in yollar if not y.startswith(ATLA))
def adres(y):
    if y.endswith('index.html'): y = y[:-len('index.html')]
    if y == '404.html': return ADRES + '/404'
    return ADRES + '/' + urllib.parse.quote(y)
def dene(y):
    yerel = hashlib.sha256(open(os.path.join(SITE, y), 'rb').read()).hexdigest()
    r = subprocess.run(['curl', '-s', '--max-time', '120', adres(y)], capture_output=True)
    return y, yerel == hashlib.sha256(r.stdout).hexdigest()
farkli = []
with cf.ThreadPoolExecutor(IS) as ex:
    for y, ayni in ex.map(dene, yollar):
        if not ayni: farkli.append(y)
print(f'{len(yollar)} dosya, {len(yollar) - len(farkli)} aynı, {len(farkli)} farklı')
for y in farkli[:100]: print('  FARKLI:', y)
sys.exit(1 if farkli else 0)
