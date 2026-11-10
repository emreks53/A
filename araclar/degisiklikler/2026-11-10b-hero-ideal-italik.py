# -*- coding: utf-8 -*-
"""
10.11.2026 kullanıcı isteği: ana sayfa büyük başlığındaki "ideal" kelimesi italik olsun.
Sitenin betiği başlığı düz metinden kelime kelime ayırdığı (giriş animasyonu) ve biçimi sildiği için başlık betiğin
ürettiği yapıyla önceden ayrılmış yazılır, "ideal" <em> içinde, data-split="1" ile betik yeniden ayırmaz
(kur.py → hero_bol; EN ana sayfa da aynı yolla). Başlık yazı tipinin (Frank Ruhl Libre) italik kesimi yok;
tarayıcı eğik çizer. Ardından EN: python3 araclar/ceviri/kur.py --yaz && python3 araclar/ceviri/ozel.py --yaz
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ceviri'))
from duzenle import oku, yaz
from kur import hero_bol

yaz('index.html', hero_bol(oku('index.html')))
print('tamam')
