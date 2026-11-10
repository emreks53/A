# -*- coding: utf-8 -*-
"""
10.11.2026 kullanıcı: "Orijinal logoda harfler biraz daha ince değil mi?" — Evet: gövde kalınlığı / x yüksekliği
sitedeki logoda 0,264, vektörün alındığı 2019 rapor kopyasında 0,296 (rapor kopyası kalın basılmış). Vektör her
yandan 11 birim aşındırılarak inceltildi (araclar/logo-ideal/ciz.py, INCELT; ölçülen oran 0,263); çıkıntı boyu ve
x yüksekliği başlık yazısıyla aynı kaldı, kelime aralıkları değişmedi. Başlık yeniden üretilir (kur.py → hero_bol).
Ardından EN: python3 araclar/ceviri/kur.py --yaz && python3 araclar/ceviri/ozel.py --yaz
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ceviri'))
from duzenle import oku, yaz
from kur import hero_bol

yaz('index.html', hero_bol(oku('index.html')))
print('tamam')
