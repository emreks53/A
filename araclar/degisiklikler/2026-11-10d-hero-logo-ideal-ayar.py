# -*- coding: utf-8 -*-
"""
10.11.2026 kullanıcı (telefonda yakınlaştırınca): "Harflerin en altından çok küçük bir kısım kesilmiş gibi; l'nin sağ
üstünden de. D ve l'nin çizgisi standart uzunluğu kadar olsun. Sonraki kelimenin ş'si l'ye çok az daha yakın olsun.
İdeal'in rengi diğer kelimelerin rengiyle aynı olsun." (2026-11-10c üzerine)
 - Kesilme: SVG çizim kutusu harflerin en alt (yuvarlak altlar) ve en sağ ("l" ucu) noktalarına tam oturuyordu; bazı
   tarayıcılar kenarı piksele yuvarlayıp kırpıyor. viewBox'a her yanda pay + overflow:visible (logo-ideal/ciz.py).
 - d ve l: logoda "GYO"yu çevrelemek için uzatılmış çıkıntılar, başlık yazısının çıkıntı boyuna kısaltıldı (ciz.py,
   ASC_ORAN); x yüksekliği başlık yazısınınkiyle aynı (0,484 em).
 - Renk: yazı rengi (currentColor, #16191d).
 - "ideal" → sonraki kelime aralığı 0,05 em daraltıldı (kur.py HERO_LOGO_SAG); önceki aralık diğer kelimelerle aynı.
Ardından EN: python3 araclar/ceviri/kur.py --yaz && python3 araclar/ceviri/ozel.py --yaz
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ceviri'))
from duzenle import oku, yaz
from kur import hero_bol

yaz('index.html', hero_bol(oku('index.html')))
print('tamam')
