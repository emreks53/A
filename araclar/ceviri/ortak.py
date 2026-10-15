# -*- coding: utf-8 -*-
"""
İngilizce sitenin Türkçe asıldan kurulması için ortak kod (15.10.2026).

Kavramlar
- Rota: sayfa adresi ("/yatirimci-iliskileri/ozel-durum-aciklamalari/2025/"). EN rota TR rotadan türetilir.
- Birim (çeviri birimi): bir blok öğenin (p, td, li, div …) içindeki satır içi akış; satır içi etiketler
  numaralı yer tutuculara çevrilir (<b1>, <a1>, <br> …) ki çeviri sırasında yerleri değişebilsin ve
  öznitelikler (bağlantı adresleri vb.) geri konabilsin. Anahtar: normalleştirilmiş Türkçe birim.
- Çeviri belleği: araclar/ceviri/bellek/*.txt dosyaları. Biçim:
      #### <kimlik>
      <İngilizce çeviri (birden çok satır olabilir)>
  "=" tek başına: Türkçe ile aynen bırak (dosya adı, özel ad, sayı …).
- Başlık sözlüğü (rota → EN başlık) ve belge etiketi sözlüğü de aynı biçimde tutulur.
"""
import hashlib, html, json, os, re
from bs4 import BeautifulSoup, NavigableString, Tag, Comment

KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = os.path.join(KOK, 'site')
CEVIRI = os.path.dirname(os.path.abspath(__file__))
BELLEK = os.path.join(CEVIRI, 'bellek')

# ---------------------------------------------------------------- dosya / rota
def oku(yol):
    with open(os.path.join(SITE, yol), encoding='utf-8') as f:
        return f.read()

def yaz(yol, metin):
    tam = os.path.join(SITE, yol)
    os.makedirs(os.path.dirname(tam), exist_ok=True)
    with open(tam, 'w', encoding='utf-8', newline='') as f:
        f.write(metin)

def dosya(rota):
    r = rota.lstrip('/')
    return (r + 'index.html') if (r == '' or r.endswith('/')) else r

def rota(dosya_yolu):
    d = dosya_yolu.replace(os.sep, '/')
    return '/' + d[:-len('index.html')] if d.endswith('index.html') else '/' + d

def alternatif(s, dil):
    m = re.search(r'<link rel="alternate" hreflang="%s" href="https://www\.idealistgyo\.com([^"]*)"' % dil, s)
    return m.group(1) if m else None

ONEK = [('/yatirimci-iliskileri/belge-kutuphanesi/', '/en/investor-relations/document-library/'),
        ('/yatirimci-iliskileri/', '/en/investor-relations/'),
        ('/kurumsal/', '/en/corporate/'),
        ('/haberler/', '/en/news/'),
        ('/portfoy/', '/en/portfolio/'),
        ('/basinda-biz/', '/en/in-media/'),
        ('/iletisim/', '/en/contact/'),
        ('/linkler/', '/en/links/'),
        ('/site-haritasi/', '/en/site-map/'),
        ('/arama/', '/en/search/'),
        ('/gizlilik-ve-cerez-politikasi/', '/en/privacy-and-cookie-policy/')]

_eslesme = None
def eslesme():
    """TR rota → EN rota (mevcut hreflang eşleşmeleri + kurala göre türetilen yeni sayfalar)."""
    global _eslesme
    if _eslesme is not None:
        return _eslesme
    yol = os.path.join(CEVIRI, 'rotalar.json')
    if os.path.exists(yol):
        _eslesme = json.load(open(yol, encoding='utf-8'))
        return _eslesme
    _eslesme = {}
    for kok, _, dosyalar in os.walk(SITE):
        for ad in dosyalar:
            if ad != 'index.html':
                continue
            g = os.path.relpath(os.path.join(kok, ad), SITE).replace(os.sep, '/')
            if g.startswith(('en/', 'panel-sablon/', 'yonetim/')):
                continue
            s = oku(g); r = rota(g); e = alternatif(s, 'en')
            if e and os.path.exists(os.path.join(SITE, dosya(e))) and e != r:
                _eslesme[r] = e
            else:
                _eslesme[r] = turet(r)
    return _eslesme

def turet(r):
    if r == '/':
        return '/en/'
    for tr, en in ONEK:
        if r.startswith(tr):
            return en + r[len(tr):]
    raise ValueError('EN rotası türetilemedi: ' + r)

def en_rota(href):
    """Bir bağlantı adresini (TR site içi) EN karşılığına çevirir; site dışı, belge, görsel aynen kalır."""
    if not href or not href.startswith('/') or href.startswith(('//', '/belgeler/', '/gorseller/', '/logo/', '/og/', '/fonts/', '/en/')):
        return href
    yol, ayrac, ek = href.partition('#')
    yol, soru, sorgu = yol.partition('?')
    e = eslesme().get(yol)
    if e is None and not yol.endswith('/') and (yol + '/') in eslesme():
        e = eslesme()[yol + '/']
    if e is None:
        return href
    return e + (soru + sorgu if soru else '') + (ayrac + ek if ayrac else '')

# ---------------------------------------------------------------- bellek dosyaları
def bellek_oku(alt_klasor=''):
    """Klasördeki tüm .txt dosyalarından {kimlik: çeviri} okur."""
    klasor = os.path.join(BELLEK, alt_klasor)
    sonuc = {}
    if not os.path.isdir(klasor):
        return sonuc
    for ad in sorted(os.listdir(klasor)):
        if not ad.endswith('.txt'):
            continue
        anahtar, satirlar = None, []
        for satir in open(os.path.join(klasor, ad), encoding='utf-8').read().split('\n'):
            if satir.startswith('#### '):
                if anahtar is not None:
                    sonuc[anahtar] = '\n'.join(satirlar).strip()
                anahtar, satirlar = satir[5:].strip(), []
            elif anahtar is not None:
                satirlar.append(satir)
        if anahtar is not None:
            sonuc[anahtar] = '\n'.join(satirlar).strip()
    return sonuc

def kimlik(metin, onek=''):
    return onek + hashlib.sha1(metin.encode('utf-8')).hexdigest()[:10]

# ---------------------------------------------------------------- metin yardımcıları
def duz(h):
    """HTML parçasından düz metin."""
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h))).strip()

HARF = re.compile(r'[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]{2}')

# ---------------------------------------------------------------- birimlere ayırma
SATIR_ICI = {'a', 'span', 'br', 'b', 'strong', 'u', 'small', 'em', 'sup', 'sub', 'font', 'time', 'img', 's', 'strike'}
ATOM = {'time'}  # içeriği çevrilmeden aynen korunur

def satir_ici_mi(dugum):
    if isinstance(dugum, NavigableString):
        return not isinstance(dugum, Comment)
    if not isinstance(dugum, Tag):
        return False
    if dugum.name == 'i' and dugum.get('data-ek') is None:
        return True
    if dugum.name == 'a' and 'docrow' in (dugum.get('class') or []):
        return False
    return dugum.name in SATIR_ICI

class Birim:
    """Bir satır içi akış: düğümler + anahtar + öznitelik tablosu."""
    def __init__(self, dugumler, basliklar_tr2en=None, rota_basliklari=None):
        self.dugumler = dugumler
        self.etiketler = {}   # yer tutucu → (ad, öznitelikler)
        self.sayac = {}
        self.atomlar = {}     # yer tutucu → aynen korunacak HTML (time, başlıklı bağlantı)
        self.rota_basliklari = rota_basliklari or {}
        self.anahtar = self._anahtar(dugumler)

    def _yer(self, ad):
        self.sayac[ad] = self.sayac.get(ad, 0) + 1
        return f'{ad}{self.sayac[ad]}'

    def _anahtar(self, dugumler):
        parcalar = []
        for d in dugumler:
            parcalar.append(self._dugum(d))
        k = ''.join(parcalar)
        k = re.sub(r'\s+', ' ', k).strip()
        return k

    def _dugum(self, d):
        if isinstance(d, NavigableString):
            return html.escape(str(d), quote=False)
        ad = d.name
        if ad == 'br':
            return '<br>'
        if ad == 'img':
            y = self._yer('img'); self.etiketler[y] = (ad, dict(d.attrs)); return f'<{y}/>'
        if ad in ATOM:
            y = self._yer(ad); self.atomlar[y] = str(d); return f'<{y}/>'
        if ad == 'a':
            href = d.get('href', '')
            metin = re.sub(r'\s+', ' ', d.get_text()).strip()
            hedef = self.rota_basliklari.get(href)
            if hedef is not None and metin == hedef[0] and not d.find(True):
                # site içi sayfa bağlantısı, metni o sayfanın başlığı: başlık sözlüğünden gelir
                y = self._yer('sayfa'); self.atomlar[y] = ('sayfa', dict(d.attrs), href); return f'<{y}/>'
        y = self._yer(ad if ad != 'i' else 'em')
        self.etiketler[y] = (ad, dict(d.attrs))
        ic = ''.join(self._dugum(c) for c in d.children)
        return f'<{y}>{ic}</{y}>'

    def cevrilecek_mi(self):
        acik = re.sub(r'<[^>]+>', ' ', self.anahtar)
        return bool(HARF.search(html.unescape(acik)))


def birimler(kok, rota_basliklari=None):
    """kok (BeautifulSoup öğesi) altındaki çeviri birimlerini sırayla döndürür (atlanan bölgeler hariç)."""
    out = []
    def gez(el):
        if not isinstance(el, Tag):
            return
        if el.name in ('script', 'style', 'aside', 'select', 'option', 'textarea', 'input', 'button'):
            return
        if el.name == 'nav' and el.get('aria-label') == 'Breadcrumb':
            return
        if el.name == 'a' and 'docrow' in (el.get('class') or []):
            return
        # satır içi akışları topla
        akis = []
        def bitir():
            if akis:
                b = Birim(list(akis), rota_basliklari=rota_basliklari)
                if b.cevrilecek_mi():
                    out.append(b)
                akis.clear()
        for c in list(el.children):
            if satir_ici_mi(c):
                akis.append(c)
            else:
                bitir()
                gez(c)
        bitir()
    gez(kok)
    return out


def geri_kur(birim, ceviri, en_basliklar, href_cevir):
    """Çeviri metnini (yer tutuculu HTML) gerçek HTML'e çevirir: öznitelikleri geri koyar, adresleri EN'e çevirir."""
    def ac(m):
        kapat, y, bos = m.group(1), m.group(2), m.group(3)
        if y in birim.atomlar:
            a = birim.atomlar[y]
            if isinstance(a, tuple) and a[0] == 'sayfa':
                _, attrs, href = a
                attrs = dict(attrs); attrs['href'] = href_cevir(href)
                baslik = en_basliklar.get(href)
                if baslik is None:
                    raise KeyError('EN başlık yok: ' + href)
                return '<a' + ''.join(f' {k}="{html.escape(" ".join(v) if isinstance(v, list) else str(v))}"' for k, v in attrs.items()) + '>' + html.escape(baslik, quote=False) + '</a>'
            return a
        if y not in birim.etiketler:
            if y == 'br':
                return '<br>'
            raise KeyError(f'bilinmeyen yer tutucu <{y}> ({birim.anahtar[:80]})')
        ad, attrs = birim.etiketler[y]
        if kapat:
            return f'</{ad}>'
        attrs = dict(attrs)
        if ad == 'a' and 'href' in attrs:
            attrs['href'] = href_cevir(attrs['href'])
        oz = ''.join(f' {k}' if v == '' and k in ('download', 'hidden') else f' {k}="{html.escape(" ".join(v) if isinstance(v, list) else str(v))}"' for k, v in attrs.items())
        if ad == 'img':
            return f'<img{oz}>'
        return f'<{ad}{oz}>' + ('' if not bos else f'</{ad}>')
    return re.sub(r'<(/?)([a-z]+\d+)(/?)>', lambda m: ac(m) if not (m.group(3) and m.group(2) not in birim.atomlar and not m.group(2).startswith('img')) else ac(m), ceviri)
