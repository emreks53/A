# -*- coding: utf-8 -*-
"""
10.11.2026 kullanıcı isteği: "Logodaki idealist deki ideal kısmını aynen alıp oraya ideal şekilde oturt."
(Önceki adımda "ideal" italik yapılmıştı; başlık yazı tipinin italiği olmadığı için eğik çizim bozuk görünüyordu ve
"l"nin sağ üstü kesiliyordu.) Ana sayfa başlığındaki "ideal" kelimesinin yerine logodaki "ideal" yazısı:
araclar/logo-ideal/ideal-logo.svg (logonun 2019 faaliyet raporundaki büyük kopyasından vektörleştirildi; ciz.py),
satır içi SVG, sitedeki logonun grisi (#636466), x yüksekliği başlık yazısınınkine yakın; kelime ekran okuyucu ve
kopyalama için gizli metin olarak da var. Kelime animasyonu aynı (kur.py → hero_bol). EN ana sayfa da aynı yolla.
Ardından EN: python3 araclar/ceviri/kur.py --yaz && python3 araclar/ceviri/ozel.py --yaz
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ceviri'))
from duzenle import oku, yaz
from kur import hero_bol

yaz('index.html', hero_bol(oku('index.html')))
print('tamam')
