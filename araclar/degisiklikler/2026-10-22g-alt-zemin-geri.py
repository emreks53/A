# -*- coding: utf-8 -*-
"""
22.10.2026 kullanıcı: "gerek yok vazgeçtim". Alt kaydırma zemini denemeleri (2026-10-22d/e/f) geri alınır:
html koyu zemin CSS'i ve tema rengi betiği tüm sayfalardan kaldırılır (sayfalar 22.10.2026 öncesi hâline döner).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import dosyalar, oku, yaz

CSS = ('<style>html{background:#16191d}html::before{content:"";position:absolute;left:0;right:0;bottom:100%;'
       'height:100vh;background:#f2f3f1}</style>')
BETIK = ("<script>(()=>{const m=document.querySelector('meta[name=theme-color]'),h=document.documentElement;let k;"
         "const f=()=>{const y=scrollY>(h.scrollHeight-innerHeight)/2;if(y!==k){k=y;m.content=y?'#16191d':'#F2F3F1'}};"
         "addEventListener('scroll',f,{passive:true});addEventListener('resize',f);f()})()</script>")
n = 0
for yol in dosyalar('**/*.html'):
    s = oku(yol)
    y = s.replace(CSS, '').replace(BETIK, '')
    if y != s:
        yaz(yol, y); n += 1
print('geri alınan sayfa:', n)
