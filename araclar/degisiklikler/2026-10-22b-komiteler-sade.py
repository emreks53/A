# -*- coding: utf-8 -*-
"""
22.10.2026 kullanıcı isteği (ekran görüntüsünde işaretli yerler): Yönetim Kurulu Komiteleri sayfasından
"(Aday Gösterme Komitesi ve Ücret Komitesi görevleri dahil)" notu ve sondaki "Kaynak: …" paragrafı kaldırıldı.
TR arama özeti yeniden üretilir. Ardından EN: python3 araclar/ceviri/kur.py --yaz && python3 araclar/ceviri/ozel.py --yaz
"""
import html, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import oku, yaz, degistir

YOL = 'kurumsal/yonetim-kurulu-komiteleri/index.html'
degistir(YOL, '<b>KURUMSAL YÖNETİM KOMİTESİ</b><br>(Aday Gösterme Komitesi ve Ücret Komitesi görevleri dahil)',
         '<b>KURUMSAL YÖNETİM KOMİTESİ</b>')
degistir(YOL, '</tbody></table>\n<p>Kaynak: 05.10.2026 tarihli ve 2026/19 sayılı Yönetim Kurulu Kararı. Komite başkan ve '
         'üyeleri, yönetim kurulundaki görev süreleri ile sınırlı olmak üzere seçilmiştir.</p></div>', '</tbody></table></div>')

s = oku(YOL)
govde = re.search(r'<div class="prose-ufuk">(.*?)</div><i data-ek="belge-bos"', s, re.S).group(1)
duz = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', govde))).strip()
a = oku('arama/index.html')
m = re.search(r'(<script type="application/json" id="srchData">)(.*?)(</script>)', a, re.S)
veri = json.loads(m.group(2))
for x in veri:
    if x['r'] == '/kurumsal/yonetim-kurulu-komiteleri/':
        x['b'] = duz[:400] + ' '
yeni_json = json.dumps(veri, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
yaz('arama/index.html', a[:m.start(2)] + yeni_json + a[m.end(2):])
print('tamam')
