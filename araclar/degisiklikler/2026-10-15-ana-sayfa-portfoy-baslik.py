# -*- coding: utf-8 -*-
"""
15.10.2026 kullanıcı istekleri:
 1) Ana sayfa (TR): sayılar şeridi (150.000.000 TL / %68,98 / 10.000 m² / 14.390 m² ve kaynak satırı) kaldırıldı;
    yerine Şirket Profili bölümü (iki paragraf) taşındı; alttaki aynı bölüm kaldırıldı (metin iki kez görünmesin).
    EN ana sayfa: yalnızca sayılar şeridi kaldırıldı (EN Şirket Profili metni eski sitede yok).
 1b) Şirket Profili ikinci paragrafındaki yanlışlar kullanıcı onayıyla düzeltildi (ana sayfa, Hakkımızda,
    Şirket Profili sayfası ve arama verisi):
      "Sermaye Piyasası Kurumu" → "Sermaye Piyasası Kurulu" (kurumun resmî adı)
      "Esaslar Tebliği (Seri VI, No: 11)'ne" → "Esaslar Tebliği'ne (Seri: VI, No: 11)" (resmî numara yazımı; ek, parantezden
      önceki sözcüğe gelir)
 2) Portföy ve Projelerimiz (TR/EN) kartlarındaki "N kayıt" / "N items" satırları kaldırıldı.
 3) Ana sayfa Yatırımcı Köşesi kutusu (TR/EN): küçük "KAP" bağlantısı kaldırıldı; kutu aşağı doğru büyütülüp
    KAP, SPK, Borsa İstanbul ve GYODER logoları (resmî sitelerine bağlantılı) eklendi.
 4) Üst menü titremesi: kaydırma eşiği tek değer (40 px) olduğundan menü küçülünce sayfa 20 px kayıyor, eşiğin
    altına düşüp yeniden büyüyordu (sonsuz döngü). Küçülme 64 px'in üstünde, büyüme 12 px'in altında (aralık > 20 px).
Çalıştırma: python3 araclar/degisiklikler/2026-10-15-ana-sayfa-portfoy-baslik.py (bir kez; ikinci kez çalışırsa
eşleşme sayısı tutmadığı için hiçbir şey yazmadan durur).
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from duzenle import oku, yaz, degistir, degistir_re, dosyalar

CID = ' data-astro-cid-bkwvb2u2'
KAP = 'https://www.kap.org.tr/tr/sirket-bilgileri/ozet/1506-idealist-gayrimenkul-yatirim-ortakligi-a-s'

# ---------- 1b) Şirket Profili ikinci paragraf düzeltmesi ----------
ESKI_P2 = "Sermaye Piyasası Kurumu Mevzuatı ve Gayrimenkul Yatırım Ortaklıklarına İlişkin Esaslar Tebliği (Seri VI, No: 11)'ne göre kurulan"
YENI_P2 = "Sermaye Piyasası Kurulu Mevzuatı ve Gayrimenkul Yatırım Ortaklıklarına İlişkin Esaslar Tebliği'ne (Seri: VI, No: 11) göre kurulan"
degistir(['index.html', 'kurumsal/index.html', 'kurumsal/sirket-profili/index.html'], ESKI_P2, YENI_P2)
# Arama verisindeki kısaltılmış özet (ilk 400 karakter) aynı yanlışı içeriyor
degistir('arama/index.html', 'Sermaye Piyasası Kurumu Mevzuatı ve Gayrimenkul', 'Sermaye Piyasası Kurulu Mevzuatı ve Gayrimenkul')

# ---------- 1) Ana sayfa: sayılar şeridi → Şirket Profili ----------
SERIT_BAS = f'<hr class="rule"{CID}><div class="container-ufuk"{CID}><div class="grid grid-cols-4'
VITRIN_BAS = f'<hr class="rule"{CID}><section class="container-ufuk showcase'
PROFIL_BAS = f'<hr class="rule"{CID}><section class="container-ufuk grid grid-cols-[minmax(0,.9fr)_minmax(0,1.4fr)]'
YK_BAS = f'<hr class="rule"{CID}><section class="container-ufuk grid grid-cols-2'

for yol, profil_tasi in (('index.html', True), ('en/index.html', False)):
    s = oku(yol)
    assert s.count(SERIT_BAS) == 1 and s.count(VITRIN_BAS) == 1, yol
    a = s.index(SERIT_BAS); b = s.index(VITRIN_BAS); assert a < b
    serit = s[a:b]
    assert '150.000.000 TL' in serit and '14.390 m²' in serit and ('Kaynak:' in serit or 'Source:' in serit) and serit.count('<hr') == 1, yol
    if profil_tasi:
        assert s.count(PROFIL_BAS) == 1 and s.count(YK_BAS) == 1
        p0 = s.index(PROFIL_BAS); p1 = s.index(YK_BAS); assert b < p0 < p1
        profil = s[p0:p1]  # <hr> + Şirket Profili bölümü
        assert 'Şirket Profili' in profil and profil.count('<section') == 1
        s = s[:a] + profil + s[b:p0] + s[p1:]
    else:
        s = s[:a] + s[b:]
    assert '150.000.000 TL' not in s and 'data-count=' not in s, yol
    yaz(yol, s)

# ---------- 3) Yatırımcı Köşesi kutusu: KAP yazısı yerine kurum logoları ----------
KAP_A = (f'<a class="text-kurdele font-semibold no-underline hover:underline underline-offset-[3px]" href="{KAP}" '
         f'target="_blank" rel="noopener"{CID}>KAP</a>')
def logolar():
    def a(href, ic):
        return f'<li{CID}><a href="{href}" target="_blank" rel="noopener"{CID}>{ic}</a></li>'
    def img(src, alt, w, h):
        return f'<img src="{src}" alt="{alt}" width="{w}" height="{h}" decoding="async" fetchpriority="low"{CID}>'
    def pic(ad, alt, w, h):
        return (f'<picture{CID}><source type="image/webp" srcset="/logo/kurumlar/{ad}.webp"{CID}>'
                + img(f'/logo/kurumlar/{ad}.png', alt, w, h) + '</picture>')
    return (f'<ul class="irlogo"{CID}>'
            + a(KAP, img('/logo/kurumlar/kap.svg', 'KAP', 170, 105))
            + a('https://spk.gov.tr/', img('/logo/kurumlar/spk.svg', 'SPK', 500, 500))
            + a('https://www.borsaistanbul.com/', pic('borsa-istanbul', 'Borsa İstanbul', 335, 96))
            + a('https://www.gyoder.org.tr/', pic('gyoder', 'GYODER', 352, 72))
            + '</ul>')
for yol in ('index.html', 'en/index.html'):
    s = oku(yol)
    assert s.count(KAP_A) == 1, yol
    i = s.index(KAP_A); j = s.index('</aside>', i)
    s = s[:i] + s[i + len(KAP_A):j] + logolar() + s[j:]
    yaz(yol, s)

IRLOGO_CSS = ('.irlogo{list-style:none;margin:6px 0 0;padding:14px 0 0;border-top:1px solid var(--color-pus);'
              'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}'
              '.irlogo a{display:flex;align-items:center;justify-content:center;height:64px;padding:8px 14px;'
              'border:1px solid var(--color-pus);background:#fff;transition:border-color .2s}'
              '.irlogo a:hover,.irlogo a:focus-visible{border-color:var(--color-murekkep)}'
              '.irlogo img{display:block;width:auto;height:auto;max-width:100%;max-height:46px}'
              '@media (min-width:560px) and (max-width:880px){.irlogo{grid-template-columns:repeat(4,minmax(0,1fr))}}')
for yol in ('index.html', 'en/index.html'):
    s = oku(yol); assert s.count('</style>') == 1, yol
    yaz(yol, s.replace('</style>', IRLOGO_CSS + '</style>'))

# ---------- 2) Portföy kartlarında kayıt sayısı gösterilmesin ----------
degistir_re('portfoy/index.html', r'<span class="block font-disp text-\[13px\] text-celik mt-2">\d+ kayıt</span>', '', 3)
degistir_re('en/portfolio/index.html', r'<span class="block font-disp text-\[13px\] text-celik mt-2">\d+ items</span>', '', 3)

# ---------- 4) Üst menü titremesi (tüm sayfalardaki menü betiği) ----------
ESKI_JS = 'var c=()=>e?.classList.toggle(`scrolled`,window.scrollY>40);'
YENI_JS = 'var c=()=>{let y=window.scrollY;y>64?e?.classList.toggle(`scrolled`,!0):y<12&&e?.classList.toggle(`scrolled`,!1)};'
n = degistir('**/*.html', ESKI_JS, YENI_JS, dosya_basina=None)
print('menü betiği güncellenen sayfa:', n)
print('tamam')
