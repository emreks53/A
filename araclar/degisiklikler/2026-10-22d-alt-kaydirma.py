# -*- coding: utf-8 -*-
"""
22.10.2026 kullanıcı isteği: telefonda sayfanın en altında esnek kaydırmada (iOS "lastik" etkisi) alt bilginin
altında açık zemin görünüyordu; alt bilginin koyu tonu (#16191d, --color-murekkep) devam etsin.
Kök zemin rengi tek renk olduğu için (üstte açık, altta koyu CSS ile verilemez) küçük bir betik: sayfanın alt
yarısındayken <html> zemini koyu, üst yarısındayken boş (gövdenin açık rengi). Böylece üstten çekince açık, alttan
çekince koyu görünür. Tüm sayfalar (TR/EN, 404, panel şablonları); panel uygulama sayfası (yonetim/panel, ayrı
üretiliyor) hariç. Ardından EN: python3 araclar/ceviri/kur.py --yaz && python3 araclar/ceviri/ozel.py --yaz
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import dosyalar, oku, yaz

BETIK = ("<script>(()=>{const h=document.documentElement;let k;const f=()=>{const y=scrollY>(h.scrollHeight-innerHeight)/2;"
         "if(y!==k){k=y;h.style.backgroundColor=y?'#16191d':''}};addEventListener('scroll',f,{passive:true});"
         "addEventListener('resize',f);f()})()</script>")
n = 0
for yol in dosyalar('**/*.html'):
    if yol.startswith('yonetim/panel/'):
        continue
    s = oku(yol)
    if BETIK in s:
        continue
    assert s.count('</body>') == 1, yol
    yaz(yol, s.replace('</body>', BETIK + '</body>')); n += 1
print('betik eklenen sayfa:', n)
