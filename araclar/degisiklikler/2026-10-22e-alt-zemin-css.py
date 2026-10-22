# -*- coding: utf-8 -*-
"""
22.10.2026 kullanıcı: "Yine aynı" — iPhone Safari esnek kaydırmada kök zemini sayfa açılırken alıyor, betikle sonradan
değişen rengi uygulamıyor. 2026-10-22d betiği kaldırılır; yerine kalıcı CSS:
  html zemini koyu (#16191d, alt bilgi rengi) → en alttan çekince koyu görünür;
  html::before: belgenin üst kenarının üstünde (bottom:100%) bir ekran boyu açık zemin (--color-sis) → en üstten
  çekince açık görünür. Yukarı taşan alan kaydırılamadığı için sayfa ölçüsünü değiştirmez. Gövde zemini (açık) aynı.
Tüm sayfalar (TR/EN, 404, panel şablonları); panel uygulama sayfası hariç. Ardından kur.py --yaz && ozel.py --yaz.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import dosyalar, oku, yaz

BETIK = ("<script>(()=>{const h=document.documentElement;let k;const f=()=>{const y=scrollY>(h.scrollHeight-innerHeight)/2;"
         "if(y!==k){k=y;h.style.backgroundColor=y?'#16191d':''}};addEventListener('scroll',f,{passive:true});"
         "addEventListener('resize',f);f()})()</script>")
CSS = ('<style>html{background:#16191d}html::before{content:"";position:absolute;left:0;right:0;bottom:100%;'
       'height:100vh;background:#f2f3f1}</style>')
n = 0
for yol in dosyalar('**/*.html'):
    if yol.startswith('yonetim/panel/'):
        continue
    s = oku(yol)
    assert s.count(BETIK) == 1 and s.count('</head>') == 1, yol
    s = s.replace(BETIK, '')
    if CSS not in s:
        s = s.replace('</head>', CSS + '</head>')
    yaz(yol, s); n += 1
print('güncellenen sayfa:', n)
