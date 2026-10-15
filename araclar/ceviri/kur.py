# -*- coding: utf-8 -*-
"""
İngilizce sayfaları Türkçe asıldan kurar (15.10.2026).

Kullanıcı kararı (15.10.2026): menü, yan menü, sayfa başlıkları, içerik haritası, liste ve belge adları
İngilizceye çevrilir; uzun metinler (prose-ufuk içi: haber, açıklama ve politika metinleri) Türkçe kalır.

Yöntem: TR sayfanın HTML'i belirteçlerine ayrılır (etiket / metin); yalnızca görünen kısa metinler ve
birkaç öznitelik değiştirilir, geri kalan her bayt aynen korunur (Astro çıktısı, panel işaretleri,
sayfa içi stiller). Site içi bağlantılar EN karşılığına çevrilir (prose içindekiler dahil).

Çeviri kaynakları (araclar/ceviri/bellek/):
  basliklar/  TR rota → EN sayfa başlığı      (kalip.py: tarihli ÖDA, yıl sayfaları, portföy tabloları)
  etiketler/  TR belge adı → EN belge adı     (kalip.py: dönem adları, "… indirmek için tıklayınız")
  arayuz/     TR arayüz metni → EN            ("=": aynen)

Çalıştırma:
  python3 araclar/ceviri/kur.py            # kur, rapor yaz (site/ değişmez)
  python3 araclar/ceviri/kur.py --yaz      # kur ve site/en/ altına yaz
  python3 araclar/ceviri/kur.py --rota /kurumsal/sirket-profili/   # tek sayfa, çıktıyı göster
"""
import collections, html, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak import SITE, CEVIRI, oku, yaz, dosya, eslesme, en_rota, bellek_oku, HARF
import kalip

ALAN = 'https://www.idealistgyo.com'
OZEL = {'/', '/iletisim/', '/gizlilik-ve-cerez-politikasi/', '/arama/', '/yatirimci-iliskileri/belge-kutuphanesi/'}

BASLIK = bellek_oku('basliklar')
ETIKET = bellek_oku('etiketler')
ARAYUZ = bellek_oku('arayuz')

def norm(s):
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()

def katla(s):
    """Türkçe büyük/küçük harf duyarsız karşılaştırma anahtarı."""
    return norm(s).replace('I', 'ı').replace('İ', 'i').lower()

_bas = json.load(open(os.path.join(CEVIRI, 'cikti', 'basliklar.json'), encoding='utf-8'))
TR_BASLIK = {x['rota']: norm(x['tr']) for x in _bas}
EN_BASLIK = {}
for _r, _t in TR_BASLIK.items():
    _e = BASLIK.get(_r) or kalip.baslik(_t)
    if not _e:
        raise SystemExit('EN başlık yok: ' + _r)
    EN_BASLIK[_r] = _e

# TR başlık metni → EN başlık (aynı metin farklı rotalarda farklı çevrildiyse çakışma raporlanır)
METIN, CAKISMA = {}, collections.defaultdict(set)
for _r, _t in sorted(TR_BASLIK.items()):
    if _t in METIN and METIN[_t] != EN_BASLIK[_r]:
        CAKISMA[_t].update({METIN[_t], EN_BASLIK[_r]})
    METIN.setdefault(_t, EN_BASLIK[_r])
METIN_K = {}
for _t, _e in METIN.items():
    METIN_K.setdefault(katla(_t), _e)

# Başlık (<title>) ara parçaları: bölüm adları başlık düzeninde (mevcut EN sayfalardaki gibi)
PARCA = {'Yatırımcı Köşesi': 'Investor Relations', 'Hakkımızda': 'About Us', 'Portföy ve Projelerimiz': 'Portfolio and Projects',
         'Haber & Duyurular': 'News & Announcements', 'Basında Biz': 'In Media', 'Projelerimiz': 'Our Projects'}
# Yan menüde bölüm adı büyük harf değil (mevcut EN yan menüsündeki gibi)
YAN_MENU = {'/haberler/': 'News & Announcements'}

VOID = {'br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'wbr', 'area', 'col', 'embed', 'param', 'track'}
TOK = re.compile(r'<!--.*?-->|<script\b[^>]*>.*?</script\s*>|<style\b[^>]*>.*?</style\s*>|<[^>]+>|[^<]+', re.S | re.I)
OZ = re.compile(r'([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:="([^"]*)")?')

def metin_kacis(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&#39;')

def oz_kacis(s):
    return s.replace('&', '&amp;').replace('"', '&quot;')

def tr_rotasi(href):
    """Site içi bağlantının TR sayfa rotası (yoksa None)."""
    if not href or not href.startswith('/') or href.startswith('//'):
        return None
    yol = href.split('#')[0].split('?')[0]
    if yol in TR_BASLIK:
        return yol
    if not yol.endswith('/') and yol + '/' in TR_BASLIK:
        return yol + '/'
    return None

DOSYA = re.compile(r'^[^\s,]+\.(?:pdf|docx?|xlsx?|zip|rar|jpe?g|png)(?:, [A-Z]+ [\d.,]+ MB)?$', re.I)

def kisa(t, href=None, baglam=''):
    """Kısa görünen metnin EN karşılığı; bulunamazsa None."""
    n = norm(t)
    if not HARF.search(n) or DOSYA.match(n):
        return n
    r = tr_rotasi(href)
    if r:
        if baglam == 'yan' and r in YAN_MENU:
            return YAN_MENU[r]
        if katla(TR_BASLIK[r]) == katla(n):
            return EN_BASLIK[r]
    if n in ARAYUZ:
        return n if ARAYUZ[n] == '=' else ARAYUZ[n]
    if baglam == 'etiket':
        if n in ETIKET:
            return ETIKET[n]
        k = kalip.etiket(n)
        if k:
            return k
    if n in METIN:
        return METIN[n]
    if katla(n) in METIN_K:
        return METIN_K[katla(n)]
    if n in ETIKET:
        return ETIKET[n]
    k = kalip.etiket(n)
    if k:
        return k
    if ', ' in n:
        son = '…' if n.endswith('…') else ''
        parcalar = n[:len(n) - len(son)].split(', ')
        en = [kisa(p, baglam=baglam) for p in parcalar]
        if all(e is not None for e in en):
            return ', '.join(en) + son
    if ' / ' in n:
        en = [kisa(p, baglam=baglam) for p in n.split(' / ')]
        if all(e is not None for e in en):
            return ' / '.join(en)
    return None


class Kurucu:
    def __init__(self, tr, en):
        self.tr, self.en = tr, en
        self.eksik = []       # (bağlam, metin)

    # ------------------------------------------------------------ metin düğümü
    def metin(self, ham, yigin):
        bas = re.match(r'\s*', ham).group(0)
        son = ham[len(ham.rstrip()):] if ham.strip() else ''
        cek = ham[len(bas):len(ham) - len(son)] if ham.strip() else ''
        if not cek or not HARF.search(html.unescape(cek)):
            return ham
        ust = yigin[-1] if yigin else {}
        sinif = ust.get('class', '')
        a = next((x for x in reversed(yigin) if x['ad'] == 'a'), None)
        href = a.get('href') if a else None
        if ust.get('ad') == 'title':
            return ham                      # başlık bas_kur() içinde
        if 'd-f' in sinif.split() or 'd-s' in sinif.split():
            return ham                      # dosya adı, boyut
        if ust.get('ad') == 'h1' and ust.get('ana'):
            return bas + metin_kacis(EN_BASLIK[self.tr]) + son
        if ust.get('ad') == 'span' and ust.get('aria-current') == 'page':
            return bas + metin_kacis(EN_BASLIK[self.tr]) + son
        baglam = 'etiket' if 'd-t' in sinif.split() else ('yan' if any(x['ad'] == 'aside' for x in yigin) else '')
        duz = html.unescape(cek)
        en = kisa(duz, href, baglam)
        if en is not None:
            return bas + metin_kacis(en) + son
        m = re.match(r'^(.*\S)(\s+)\((\d{2}\.\d{2}\.\d{4})\)$', duz, re.S)
        if m:
            en = kisa(m.group(1), href, baglam)
            if en is not None:
                return bas + metin_kacis(en) + m.group(2) + '(' + m.group(3) + ')' + son
        self.eksik.append((self.yer(yigin), duz))
        return ham

    def yer(self, yigin):
        x = yigin[-1] if yigin else {}
        return x.get('ad', '') + ('.' + x.get('class', '').split()[0] if x.get('class') else '')

    # ------------------------------------------------------------ öznitelikler
    def oznitelik(self, etiket, ad, f):
        def r(m):
            eski = html.unescape(m.group(2))
            yeni = f(eski)
            if yeni is None or yeni == eski:
                return m.group(0)
            return '%s="%s"' % (m.group(1), oz_kacis(yeni))
        return re.sub(r'(\s%s)="([^"]*)"' % re.escape(ad), r, etiket)

    def oz_metin(self, deger, ad):
        if not HARF.search(deger):
            return None
        en = kisa(deger)
        if en is None:
            self.eksik.append(('@' + ad, deger))
        return en

    # ------------------------------------------------------------ belge
    def cevir(self, s):
        out, yigin = [], []
        ana = False
        for t in TOK.findall(s):
            if t.startswith('<!--') or t[:7].lower() == '<script' or t[:6].lower() == '<style':
                out.append(t); continue
            if t.startswith('</'):
                ad = t[2:-1].strip().lower()
                if ad == 'main':
                    ana = False
                while yigin:
                    if yigin.pop()['ad'] == ad:
                        break
                out.append(t); continue
            if t.startswith('<!') or t.startswith('<?'):
                out.append(t); continue
            if t.startswith('<'):
                ad = re.match(r'<([a-zA-Z0-9]+)', t).group(1).lower()
                oz = {m.group(1): html.unescape(m.group(2) or '') for m in OZ.finditer(t[len(ad) + 1:])}
                if ad == 'main':
                    ana = True
                sinif = oz.get('class', '')
                prose = bool(yigin and yigin[-1]['prose']) or 'prose-ufuk' in sinif.split() or 'haber-govde' in sinif.split()
                t2 = self.oznitelik(t, 'href', en_rota)
                t2 = self.oznitelik(t2, 'data-rota', en_rota)
                if not prose:
                    for o in ('aria-label', 'alt', 'placeholder'):
                        t2 = self.oznitelik(t2, o, lambda v, o=o: self.oz_metin(v, o))
                    if 'd-f' not in sinif.split():
                        t2 = self.oznitelik(t2, 'title', lambda v: self.oz_metin(v, 'title'))
                if ad not in VOID and not t.endswith('/>'):
                    d = dict(oz); d.update(ad=ad, prose=prose, ana=ana)
                    yigin.append(d)
                out.append(t2); continue
            if yigin and yigin[-1]['prose']:
                out.append(t); continue
            out.append(self.metin(t, yigin))
        return ''.join(out)


# ---------------------------------------------------------------- head
def og_gorsel(s_tr, tr):
    """TR sayfanın kullandığı OG görselinin EN karşılığı (aynı rota düzeyi)."""
    m = re.search(r'<meta property="og:image" content="%s/og/([^"]+)\.jpg">' % re.escape(ALAN), s_tr)
    ad = m.group(1)
    if ad == 'ana-sayfa':
        return '/og/en.jpg'
    tr_r = OG_ROTA.get(ad)
    if tr_r is None:
        raise SystemExit('OG görseli rotaya eşlenemedi: %s (%s)' % (ad, tr))
    return '/og/' + eslesme()[tr_r].strip('/').replace('/', '--') + '.jpg'

OG_ROTA = {r.strip('/').replace('/', '--'): r for r in eslesme() if r != '/'}

def bas_kur(s, s_tr, tr, en, eski_en):
    """<head>: dil, başlık, açıklama, kanonik, hreflang, OG."""
    s = s.replace('<html lang="tr"', '<html lang="en"', 1)
    eski_baslik = re.search(r'<title>(.*?)</title>', s_tr, re.S).group(1)
    parcalar = html.unescape(eski_baslik).split(' · ')
    en_p = [EN_BASLIK[tr]]
    for p in parcalar[1:-1]:
        e = PARCA.get(p) or (p if not HARF.search(p) else None) or METIN.get(p)
        if not e:
            raise SystemExit('Başlık parçası çevrilemedi: %r (%s)' % (p, tr))
        en_p.append(e)
    if parcalar[-1] != 'İdealist GYO':
        raise SystemExit('Beklenmeyen başlık: ' + eski_baslik)
    baslik = ' · '.join(en_p + ['İdealist GYO'])
    # açıklama
    eski_aciklama = None
    if eski_en:
        m = re.search(r'<meta name="description" content="([^"]*)"', eski_en)
        eski_aciklama = html.unescape(m.group(1)) if m else None
    if len(parcalar) == 2 and eski_aciklama and '*' not in eski_aciklama:
        aciklama = eski_aciklama                     # bölüm ana sayfaları: mevcut EN açıklama
    elif tr.startswith('/yatirimci-iliskileri/'):
        aciklama = 'İdealist GYO %s: documents and disclosures. Borsa Istanbul: IDGYO.' % ' · '.join(en_p)
    else:
        aciklama = '%s — İdealist Gayrimenkul Yatırım Ortaklığı A.Ş.' % ' · '.join(en_p)
    og = og_gorsel(s_tr, tr)
    s = re.sub(r'<title>.*?</title>', lambda m: '<title>%s</title>' % metin_kacis(baslik), s, count=1, flags=re.S)
    s, n1 = re.subn(r'<meta name="description" content="[^"]*">', lambda m: '<meta name="description" content="%s">' % oz_kacis(aciklama), s, count=1)
    s, n2 = re.subn(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="%s%s">' % (ALAN, en), s, count=1)
    alt = ('<link rel="alternate" hreflang="tr" href="{a}{tr}"><link rel="alternate" hreflang="en" href="{a}{en}">'
           '<link rel="alternate" hreflang="x-default" href="{a}{tr}">').format(a=ALAN, tr=tr, en=en)
    s, n3 = re.subn(r'(?:<link rel="alternate" hreflang="[^"]*" href="[^"]*">)+', alt, s, count=1)
    s, n4 = re.subn(r'<meta property="og:title" content="[^"]*">', lambda m: '<meta property="og:title" content="%s">' % oz_kacis(baslik), s, count=1)
    s, n5 = re.subn(r'<meta property="og:description" content="[^"]*">', lambda m: '<meta property="og:description" content="%s">' % oz_kacis(aciklama), s, count=1)
    s, n6 = re.subn(r'<meta property="og:url" content="[^"]*">', '<meta property="og:url" content="%s%s">' % (ALAN, en), s, count=1)
    s, n7 = re.subn(r'<meta property="og:image" content="[^"]*">', '<meta property="og:image" content="%s%s">' % (ALAN, og), s, count=1)
    s, n8 = re.subn(r'<meta property="og:locale" content="tr_TR">', '<meta property="og:locale" content="en_US">', s, count=1)
    if (n1, n2, n3, n4, n5, n6, n7, n8) != (1,) * 8:
        raise SystemExit('head kalıbı tutmadı: %s %s' % (tr, (n1, n2, n3, n4, n5, n6, n7, n8)))
    return s, baslik, og

# Eski EN sitede bulunan bilgi notları (metin gövdesinde; eski İngilizce metin aynen korunur, dil hataları icerik-notlari.md'de)
ESKI_EN_METIN = {
    '<p>Bu kategoriye henüz içerik eklenmemiştir</p>': '<p>Contents has not been added to this category yet.</p>',
    '<p>Henüz sitemize sigorta poliçelerimiz eklenmemiştir.</p>': '<p>Our insurance policies has not been added to the site yet.</p>',
}

DIL_TR = re.compile(r'<b aria-current="true" data-astro-cid-nen7h5rs>TR</b><a href="[^"]*" hreflang="en" lang="en" data-astro-cid-nen7h5rs>EN</a>')

def sayfa_kur(tr, en):
    s_tr = oku(dosya(tr))
    eski_en = oku(dosya(en)) if os.path.exists(os.path.join(SITE, dosya(en))) else None
    k = Kurucu(tr, en)
    s = k.cevir(s_tr)
    s, n = DIL_TR.subn('<b aria-current="true" data-astro-cid-nen7h5rs>EN</b><a href="%s" hreflang="tr" lang="tr" data-astro-cid-nen7h5rs>TR</a>' % tr, s)
    if n != 2:
        raise SystemExit('dil seçici kalıbı tutmadı: %s (%d)' % (tr, n))
    for tr_m, en_m in ESKI_EN_METIN.items():
        s = s.replace(tr_m, en_m)
    s, baslik, og = bas_kur(s, s_tr, tr, en, eski_en)
    if tr == '/site-haritasi/':
        s = site_haritasi_sirala(s)
    return s, k.eksik, og

def ana_sayfa_kur():
    """EN ana sayfa: TR ana sayfadan (aynı yerleşim, profil metni Türkçe), <head> değerleri mevcut EN ana sayfadan."""
    s_tr = oku('index.html'); eski = oku('en/index.html')
    k = Kurucu('/', '/en/')
    s = k.cevir(s_tr)
    s, n = DIL_TR.subn('<b aria-current="true" data-astro-cid-nen7h5rs>EN</b><a href="/" hreflang="tr" lang="tr" data-astro-cid-nen7h5rs>TR</a>', s)
    if n != 2:
        raise SystemExit('ana sayfa dil seçici kalıbı tutmadı')
    s = s.replace('<html lang="tr"', '<html lang="en"', 1)
    # Yatırımcı Köşesi kutusu: kısa ad (sunucu kodundaki EN adla aynı; kutu yüksekliği TR ile eşit kalsın)
    s, n = re.subn(r'(<a data-ek="ir-mali"[^>]*>)Financial Statements and Reports, ', r'\1Financial Statements, ', s)
    if n != 1:
        raise SystemExit('ana sayfa ir-mali kalıbı tutmadı')
    for desen in (r'<title>.*?</title>', r'<meta name="description" content="[^"]*">', r'<link rel="canonical" href="[^"]*">',
                  r'(?:<link rel="alternate" hreflang="[^"]*" href="[^"]*">)+', r'<meta property="og:title" content="[^"]*">',
                  r'<meta property="og:description" content="[^"]*">', r'<meta property="og:url" content="[^"]*">',
                  r'<meta property="og:image" content="[^"]*">', r'<meta property="og:locale" content="[^"]*">'):
        yeni = re.search(desen, eski, re.S).group(0)
        s, n = re.subn(desen, lambda m: yeni, s, count=1, flags=re.S)
        if n != 1:
            raise SystemExit('ana sayfa head kalıbı tutmadı: ' + desen)
    return s, k.eksik, '/og/en.jpg'

def site_haritasi_sirala(s):
    """Site haritası bölümleri EN adlarına göre alfabetik (mevcut EN site haritasındaki gibi)."""
    i = s.index('<main id="icerik">'); j = s.index('</main>')
    ana = s[i:j]
    bolumler = re.findall(r'<section\b.*?</section>', ana, re.S)
    if not bolumler:
        return s
    bas = ana.index(bolumler[0]); son = ana.rindex(bolumler[-1]) + len(bolumler[-1])
    if ''.join(bolumler) != ana[bas:son]:
        return s
    sirali = sorted(bolumler, key=lambda b: norm(re.search(r'<h2[^>]*>(.*?)</h2>', b, re.S).group(1)))
    return s[:i] + ana[:bas] + ''.join(sirali) + ana[son:] + s[j:]


def main():
    yazilsin = '--yaz' in sys.argv
    tek = sys.argv[sys.argv.index('--rota') + 1] if '--rota' in sys.argv else None
    es = eslesme()
    rapor = collections.Counter(); ornek = {}
    oglar = collections.defaultdict(list)
    sayi = 0
    for tr, en in sorted(es.items()):
        if tr in OZEL or (tek and tr != tek):
            continue
        s, eksik, og = sayfa_kur(tr, en)
        oglar[og].append(en)
        for e in eksik:
            rapor[e] += 1; ornek.setdefault(e, tr)
        if tek:
            print(s)
        if yazilsin:
            yaz(dosya(en), s)
        sayi += 1
    if not tek or tek == '/':
        s, eksik, og = ana_sayfa_kur()
        for e in eksik:
            rapor[e] += 1; ornek.setdefault(e, '/')
        if tek:
            print(s)
        if yazilsin:
            yaz('en/index.html', s)
        sayi += 1
    with open(os.path.join(CEVIRI, 'cikti', 'og.json'), 'w', encoding='utf-8') as f:
        json.dump({k: sorted(v) for k, v in sorted(oglar.items())}, f, ensure_ascii=False, indent=1)
    with open(os.path.join(CEVIRI, 'cikti', 'eksik.txt'), 'w', encoding='utf-8') as f:
        for (yer, metin), n in sorted(rapor.items(), key=lambda x: (-x[1], x[0])):
            f.write('%d\t%s\t%s\t%s\n' % (n, yer, metin, ornek[(yer, metin)]))
    if CAKISMA:
        print('Başlık metni çakışmaları (ilk çeviri kullanıldı):')
        for t, v in CAKISMA.items():
            print('  ', t, '→', ' | '.join(sorted(v)))
    print('sayfa', sayi, 'çevrilemeyen metin', len(rapor), '(araclar/ceviri/cikti/eksik.txt)', 'yazıldı' if yazilsin else '')

if __name__ == '__main__':
    main()
