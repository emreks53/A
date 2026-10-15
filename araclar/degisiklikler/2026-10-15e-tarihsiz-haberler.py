# -*- coding: utf-8 -*-
"""
15.10.2026 kullanıcı isteği: "01.01.0000 bu şekilde tarih yazan yerlerde hiç tarih yazmasın."
(Eski sitedeki geçersiz tarih; daha önce B20 "dokunma" kararı vardı, kullanıcı bu kez kaldırılmasını istedi.)
Beş haberde: başlık altındaki tarih satırı, metin sonundaki kalın tarih, Haber & Duyurular listesindeki tarih
(liste ızgarası kaymasın diye tarih sütunu boş kalır) ve TR arama verisindeki aynı tarih kaldırılır.
EN sayfalar ve EN arama verisi TR asıldan kurulduğu için ardından:
  python3 araclar/ceviri/kur.py --yaz && python3 araclar/ceviri/ozel.py --yaz
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import oku, yaz, degistir

HABERLER = ['pay-alim-teklifi-bilgi-formu-spk-onayi', 'idealist-gyo-as-2012-yili-genel-kurulu',
            '2016-yili-olaganustu-genel-kurul-toplantisi', '2016-yili-olaganustu-genel-kurul-toplantisi-2',
            '2016-yili-olaganustu-genel-kurul-toplantisi-4']

for slug in HABERLER:
    yol = f'haberler/{slug}/index.html'
    s = oku(yol)
    # başlık altındaki tarih satırı
    assert s.count('<p class="kicker mt-3">01.01.0000</p>') == 1, yol
    s = s.replace('<p class="kicker mt-3">01.01.0000</p>', '')
    # metin sonundaki tarih: belge bağlantısı varsa önünde bir boş satır kalır, yoksa tamamen kalkar
    assert s.count('<br><b>01.01.0000</b><br><br>') == 1, yol
    s = re.sub(r'<br><b>01\.01\.0000</b><br><br>(?=\n</div>)', '', s)
    s = s.replace('<br><b>01.01.0000</b><br><br>', '<br><br>')
    assert '01.01.0000' not in s and '0000-01-01' not in s, yol
    yaz(yol, s)

# Haber & Duyurular listesi: tarih yerine boş hücre (ızgaranın ilk sütunu)
degistir('haberler/index.html',
         '<time class="text-[13px] text-celik tnum" datetime="0000-01-01">01.01.0000</time>',
         '<span class="text-[13px] text-celik tnum"></span>', dosya_basina=len(HABERLER))

# TR arama verisi (gövde metinlerindeki tarih)
s = oku('arama/index.html')
n = s.count('01.01.0000')
s = s.replace(' (01.01.0000)', '').replace(' 01.01.0000', '').replace('01.01.0000', '')
yaz('arama/index.html', s)
print('haber sayfası', len(HABERLER), '| arama verisinde kaldırılan', n)
