# -*- coding: utf-8 -*-
"""
15.10.2026 (ikinci istek, ekran görüntüsüyle):
 1) Ana sayfa sloganı ("Ülkemize faydalı…") büyütüldü: masaüstünde son satırın altı Yatırımcı Köşesi kutusunun
    altıyla aynı hizada (1150 px ve üstü genişliklerde ±12 px; 881–1149 px arasında satır kırılmaları nedeniyle yaklaşık).
    Ölçüm: araclar betikleri yerine Playwright ile her genişlikte başlık ve kutu alt kenarı karşılaştırıldı.
    Telefon/dar ekran (≤880 px) değişmedi. EN ana sayfaya da aynı kural uygulandı (aynı hizayı tutturuyor).
 2) Ana sayfadaki Şirket Profili bölümünden "HAKKIMIZDA / Şirket Profili" başlığı ve "Şirket Profili" düğmesi
    kaldırıldı; yalnızca iki paragraf kaldı (tam genişlik).
 3) Bu iki paragrafın yazı boyutu büyütüldü (19 px → 20–28 px, ekran genişliğiyle; 1280 px'te ~26 px).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import oku, yaz, degistir

CID = ' data-astro-cid-bkwvb2u2'

SLOGAN_CSS = ('@media (min-width:881px){#heroTitle{font-size:min(5.55vw,77px);line-height:87px;max-width:none}}'
              '@media (min-width:881px) and (max-width:1149px){#heroTitle{font-size:6.3vw;line-height:1.1}}'
              '@media (min-width:990px) and (max-width:1049px){#heroTitle{font-size:6.2vw;line-height:1.2}}'
              '@media (min-width:1050px) and (max-width:1149px){#heroTitle{font-size:5.9vw}}')
PROFIL_CSS = '.profil-metin{font-size:clamp(20px,2.05vw,28px);line-height:1.6}'

# ---------- 2+3) Şirket Profili: başlık ve düğme kalkar, paragraflar büyür (yalnızca TR ana sayfa) ----------
s = oku('index.html')
bas = (f'<section class="container-ufuk grid grid-cols-[minmax(0,.9fr)_minmax(0,1.4fr)] gap-[clamp(20px,4vw,56px)] py-14 '
       f'max-[880px]:grid-cols-1 max-[880px]:py-10 max-[880px]:gap-[18px]"{CID}><div{CID}><p class="kicker"{CID}>Hakkımızda</p>'
       f'<h2 class="text-[clamp(28px,3vw,42px)] font-medium"{CID}>Şirket Profili</h2></div><div{CID}><div class="prose-ufuk text-[19px]"{CID}>')
son = f'</div><p class="mt-[22px]"{CID}><a class="btn" href="/kurumsal/sirket-profili/"{CID}>Şirket Profili</a></p></div></section>'
assert s.count(bas) == 1 and s.count(son) == 1, 'Şirket Profili bölümü beklenen biçimde değil'
i = s.index(bas); j = s.index(son, i)
paragraflar = s[i + len(bas):j]
assert paragraflar.count('<p>') == 2 and 'Sermaye Piyasası Kurulu' in paragraflar
yeni = f'<section class="container-ufuk py-14 max-[880px]:py-10"{CID}><div class="prose-ufuk profil-metin"{CID}>' + paragraflar + '</div></section>'
s = s[:i] + yeni + s[j + len(son):]
assert s.count('</style>') == 1
s = s.replace('</style>', SLOGAN_CSS + PROFIL_CSS + '</style>')
yaz('index.html', s)

# ---------- 1) EN ana sayfa: yalnızca slogan kuralı ----------
s = oku('en/index.html'); assert s.count('</style>') == 1
yaz('en/index.html', s.replace('</style>', SLOGAN_CSS + '</style>'))
print('tamam')
