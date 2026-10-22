# -*- coding: utf-8 -*-
"""
22.10.2026 kullanıcı isteği: "Yönetim kurulu ve üst yönetim kısmındaki bilgileri bu attığım belgeye göre güncelle."
Belge: İdealist GYO Yönetim Kurulu Kararı, karar no 2026/19, tarih 05.10.2026, konu "Komiteler Görev Dağılımı"
(ETDS, doğrulama kodu b443784e-dfec-4284-8c2e-b77765d406c5).

 - Kurumsal > Yönetim Kurulu Komiteleri: üç komitenin üyeleri ve nitelikleri karardaki gibi (Denetim ve Riskin Erken
   Saptanması komitelerinde başkan Metin ÖZAKTAN; Kurumsal Yönetim Komitesine Yusuf ŞİMŞEK; Riskin Erken Saptanması
   Komitesi üyesi Eyüp EKŞİ). Ad yazımı ve "Bağımsız değil" ifadesi karardan; karardaki boşluk farkları eşitlendi.
   Kararın kapsam notu (Aday Gösterme ve Ücret Komitesi görevleri) ve kaynak satırı eklendi (onay-bekleyen-metinler.md §13).
 - Kurumsal > Yönetim Kurulu ve Üst Yönetim: kararı imzalayan beş yönetim kurulu üyesi ve görevleri sitedekiyle aynı;
   değişiklik yok. Karar üst yönetimi kapsamadığı için o tablo da değişmedi.
 - TR arama verisindeki sayfa özeti yeni metinden (ilk 400 karakter, diğer kayıtlar gibi).
Eski özel durum açıklamaları ve genel kurul belgeleri tarihî kayıt olduğu için değişmez.
Ardından EN: python3 araclar/ceviri/kur.py --yaz && python3 araclar/ceviri/ozel.py --yaz
"""
import html, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import oku, yaz

YOL = 'kurumsal/yonetim-kurulu-komiteleri/index.html'
KOMITELER = [
    ('KURUMSAL YÖNETİM KOMİTESİ', '(Aday Gösterme Komitesi ve Ücret Komitesi görevleri dahil)', [
        ('Mehmet Şerif Cem ATAÇ', 'Komite Başkanı/Bağımsız/İcracı olmayan'),
        ('Mustafa EKŞİ', 'Komite Üyesi/Bağımsız değil/İcracı'),
        ('Eyüp EKŞİ', 'Komite Üyesi/Bağımsız değil/İcracı olmayan'),
        ('Yusuf ŞİMŞEK', 'Komite Üyesi/Bağımsız değil/İcracı olmayan'),
    ]),
    ('DENETİM KOMİTESİ', '', [
        ('Metin ÖZAKTAN', 'Komite Başkanı/Bağımsız/İcracı olmayan'),
        ('Mehmet Şerif Cem ATAÇ', 'Komite Üyesi/Bağımsız/İcracı olmayan'),
    ]),
    ('RİSKİN ERKEN SAPTANMASI KOMİTESİ', '', [
        ('Metin ÖZAKTAN', 'Komite Başkanı/Bağımsız/İcracı olmayan'),
        ('Eyüp EKŞİ', 'Komite Üyesi/Bağımsız değil/İcracı olmayan'),
    ]),
]
KAYNAK = ('Kaynak: 05.10.2026 tarihli ve 2026/19 sayılı Yönetim Kurulu Kararı. Komite başkan ve üyeleri, yönetim '
          'kurulundaki görev süreleri ile sınırlı olmak üzere seçilmiştir.')

satirlar = []
for i, (ad, not_, uyeler) in enumerate(KOMITELER):
    if i:
        satirlar.append('<tr>\n<td><br><br></td>\n<td></td>\n</tr>')
    alt = '<br>' + not_ if not_ else ''
    satirlar.append('<tr>\n<td colspan="2"><b>%s</b>%s</td>\n</tr>' % (ad, alt))
    satirlar.append('<tr>\n<td><b>ADI SOYADI</b></td>\n<td><b>GÖREVİ / NİTELİĞİ</b></td>\n</tr>')
    for kisi, gorev in uyeler:
        satirlar.append('<tr>\n<td>%s</td>\n<td>%s</td>\n</tr>' % (kisi, gorev))
YENI = ('<div class="prose-ufuk"><table role="presentation">\n<tbody>' + '\n'.join(satirlar) + '</tbody></table>\n'
        '<p>' + KAYNAK + '</p></div>')

s = oku(YOL)
desen = re.compile(r'<div class="prose-ufuk">.*?</div>(?=<i data-ek="belge-bos" data-rota="/kurumsal/yonetim-kurulu-komiteleri/")', re.S)
eski = desen.findall(s)
assert len(eski) == 1 and 'Didar Sevdil' in eski[0], 'komiteler sayfası beklenen hâlde değil'
s = desen.sub(lambda m: YENI, s)
yaz(YOL, s)

# TR arama verisi: sayfa özeti (diğer kayıtlar gibi düz metnin ilk 400 karakteri)
duz = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', YENI))).strip()
a = oku('arama/index.html')
m = re.search(r'(<script type="application/json" id="srchData">)(.*?)(</script>)', a, re.S)
veri = json.loads(m.group(2))
n = 0
for x in veri:
    if x['r'] == '/kurumsal/yonetim-kurulu-komiteleri/':
        x['b'] = duz[:400] + ' '; n += 1
assert n == 1
yeni_json = json.dumps(veri, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
a = a[:m.start(2)] + yeni_json + a[m.end(2):]
yaz('arama/index.html', a)
print('komiteler sayfası güncellendi; arama kaydı', n)
