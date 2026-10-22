# -*- coding: utf-8 -*-
"""
22.10.2026 kullanıcı: "Yine olmadı". iOS'ta (Google uygulaması/WKWebView, Safari) esnek kaydırma alanı
<meta name="theme-color"> rengiyle (#F2F3F1, açık) boyanabiliyor. Sayfanın alt yarısında tema rengi alt bilgi rengine
(#16191d), üst yarısında açık renge döner (2026-10-22e CSS'i yerinde kalır). TR/EN tüm sayfalar, 404, panel şablonları.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import dosyalar, oku, yaz

BETIK = ("<script>(()=>{const m=document.querySelector('meta[name=theme-color]'),h=document.documentElement;let k;"
         "const f=()=>{const y=scrollY>(h.scrollHeight-innerHeight)/2;if(y!==k){k=y;m.content=y?'#16191d':'#F2F3F1'}};"
         "addEventListener('scroll',f,{passive:true});addEventListener('resize',f);f()})()</script>")
n = 0
for yol in dosyalar('**/*.html'):
    s = oku(yol)
    if '<meta name="theme-color" content="#F2F3F1">' not in s or BETIK in s:
        continue
    assert s.count('</body>') == 1, yol
    yaz(yol, s.replace('</body>', BETIK + '</body>')); n += 1
print('betik eklenen sayfa:', n)
