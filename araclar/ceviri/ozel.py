# -*- coding: utf-8 -*-
"""
Türkçe asıldan kurulmayan EN sayfalarının düzeltmesi (15.10.2026; kur.py'den sonra çalışır).

  - Elle hazırlanmış EN sayfalar (iletişim, gizlilik, arama, belge kütüphanesi) ve panel şablonları
    (panel-sablon/yk/en-*): yan menü, içerik haritası ve alt bilgi bağlantı adları başlık sözlüğünden;
    alt bilgide Telefon/Faks → Phone/Fax.
  - EN arama verisi (srchData) TR arama verisinden: adres, başlık ve bölüm yolu İngilizce; gövde metni
    Türkçe kalır (EN sayfalarda olduğu gibi); kur.CEVRILEN_METIN'deki çevrilmiş metinlerin gövdesi İngilizce.
  - EN belge kütüphanesi verisi (libData): belge adı, bölüm yolu ve tür adları İngilizce.
  - Arama ve kütüphane betiklerinde İngilizce aramada "I/ı" eşleşmesi (tr küçük harf dönüşümü yüzünden
    "Investor" bulunamıyordu).

Çalıştırma: python3 araclar/ceviri/ozel.py [--yaz]
"""
import html, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak import SITE, oku, yaz, eslesme, en_rota
import kur
from kur import EN_BASLIK, TR_BASLIK, kisa, katla, metin_kacis, YAN_MENU

TERS = {en: tr for tr, en in eslesme().items()}
eksik = []

def en_baslik(href):
    yol = href.split('#')[0].split('?')[0]
    tr = TERS.get(yol)
    return EN_BASLIK.get(tr) if tr else None

def baglanti_adlari(s, yan=False):
    """Bloktaki site içi bağlantıların metnini hedef sayfanın EN başlığı yapar."""
    def a(m):
        href = m.group(2)
        if href == '/en/':
            return m.group(0)                              # "Home" kalır
        tr = TERS.get(href.split('#')[0])
        en = (YAN_MENU.get(tr) if yan and tr else None) or en_baslik(href)
        return m.group(1) + metin_kacis(en) + m.group(3) if en else m.group(0)
    return re.sub(r'(<a\b[^>]*\bhref="(/en/[^"]*)"[^>]*>)[^<]*(</a>)', a, s)

def kabuk(s):
    """Yan menü, içerik haritası, alt bilgi."""
    s = re.sub(r'<aside aria-label="Investor Relations sections".*?</aside>', lambda m: baglanti_adlari(m.group(0), yan=True), s, flags=re.S)
    s = re.sub(r'<nav aria-label="Breadcrumb".*?</nav>', lambda m: baglanti_adlari(m.group(0)), s, flags=re.S)
    s = re.sub(r'<footer\b.*?</footer>', lambda m: baglanti_adlari(m.group(0)), s, flags=re.S)
    return s.replace('Telefon: 0216 443 82 90', 'Phone: 0216 443 82 90').replace('Faks: 0216 523 13 58', 'Fax: 0216 523 13 58')

# İngilizce aramada I/ı: her iki taraf aynı biçime getirilir
KUCUK_EK = ".replace(/ı/g, 'i')"

def kucuk_harf(s):
    s = re.sub(r"(\.toLocaleLowerCase\('tr'\))(?:\.replace\(/ı/g, 'i'\))*", lambda m: m.group(1) + KUCUK_EK, s)
    return s

def json_betik(s, kimlik, veri):
    yeni = json.dumps(veri, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    s, n = re.subn(r'(<script type="application/json" id="%s">).*?(</script>)' % kimlik, lambda m: m.group(1) + yeni + m.group(2), s, count=1, flags=re.S)
    assert n == 1, kimlik
    return s

def json_oku(s, kimlik):
    return json.loads(re.search(r'<script type="application/json" id="%s">(.*?)</script>' % kimlik, s, re.S).group(1))

# ---------------------------------------------------------------- arama
UST = {'YATIRIMCI KÖŞESİ': 'INVESTOR RELATIONS', 'HAKKIMIZDA': 'ABOUT US', 'HABER & DUYURULAR': 'NEWS & ANNOUNCEMENTS',
       'PORTFÖY ve PROJELERİMİZ': 'PORTFOLIO AND PROJECTS', 'BASINDA BİZ': 'IN MEDIA', 'LİNKLER': 'LINKS',
       'İLETİŞİM BİLGİLERİ': 'CONTACT INFORMATION', 'SİTE HARİTASI': 'SITE MAP'}

def bolum_yolu(tr_r, ayrac=': '):
    """Rotanın bölüm altındaki EN başlık zinciri (bölüm ana sayfası hariç)."""
    parcalar = tr_r.strip('/').split('/')
    zincir = []
    for i in range(2, len(parcalar) + 1):
        r = '/' + '/'.join(parcalar[:i]) + '/'
        if r in EN_BASLIK:
            zincir.append(EN_BASLIK[r])
    return ayrac.join(zincir)

def k_cevir(k, tr_r):
    for tr_ust, en_ust in UST.items():
        if k.startswith(tr_ust):
            kalan = k[len(tr_ust):].strip()
            parcalar = [p.strip() for p in re.split(r'\s*:\s*', kalan) if p.strip()]
            en = [kisa(p) for p in parcalar]
            if all(e is not None for e in en):
                return (en_ust + ' ' + ': '.join(en)).strip()
            return (en_ust + ' ' + bolum_yolu(tr_r)).strip()
    eksik.append(('k', k)); return k

def duz(h):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h))).strip()

def govde_cevir(b):
    """Gövde metni (TR sayfanın ilk kısmı) çevrilmiş bir metinle başlıyorsa yerine İngilizcesinin tamamı."""
    for tr_m, (en_m, _) in kur.CEVRILEN_METIN.items():
        if b.strip() and duz(tr_m).startswith(b.strip()):
            return duz(en_m)
    return b

def arama():
    s_tr = oku('arama/index.html'); s = oku('en/search/index.html')
    tr_veri = json_oku(s_tr, 'srchData'); eski = {x['r']: x for x in json_oku(s, 'srchData')}
    out = []
    for x in tr_veri:
        en_r = eslesme().get(x['r'])
        if not en_r:
            eksik.append(('rota', x['r'])); continue
        if x['r'] in kur.OZEL and en_r in eski:
            out.append(eski[en_r]); continue                 # elle hazırlanmış EN kayıt (iletişim vb.)
        t = EN_BASLIK[x['r']] if katla(x['t']) == katla(TR_BASLIK[x['r']]) else (kisa(x['t'], x['r']) or EN_BASLIK[x['r']])
        out.append({'r': en_r, 't': t, 'k': k_cevir(x['k'], x['r']), 'b': govde_cevir(x['b'])})
    s = json_betik(s, 'srchData', out)
    s = kucuk_harf(s)
    return kabuk(s), len(out)

# ---------------------------------------------------------------- belge kütüphanesi
TUR_EN = {'faaliyet-raporlari': 'Annual Reports', 'mali-tablolar': 'Financial Statements', 'dipnotlar': 'Footnotes',
          'portfoy-tablolari': 'Portfolio Tables', 'genel-kurul': 'General Assembly', 'hazirun-cetveli': 'List of Attendees',
          'ozel-durum-aciklamalari': 'Material Event Disclosures', 'izahname-ve-sirkuler': 'Prospectuses and Circulars',
          'uyum-raporu': 'Compliance Report', 'degerleme-raporlari': 'Valuation Reports', 'komiteler': 'Committees',
          'esas-sozlesme': 'Articles of Association', 'ic-yonerge': 'Internal Directive', 'haberler': 'News Attachments',
          'gorseller': 'Images', 'flash': 'Flash', 'diger': 'Other'}

def c_kur(tr_r):
    """Belgenin bölüm yolu: 'INVESTOR RELATIONS > Annual Reports > 2026' (yıl sayfasında yalnız yıl)."""
    ust = 'PORTFOLIO AND PROJECTS' if tr_r.startswith('/portfoy/') else 'INVESTOR RELATIONS'
    parcalar = tr_r.strip('/').split('/')
    zincir = [ust]
    for i in range(2, len(parcalar) + 1):
        r = '/' + '/'.join(parcalar[:i]) + '/'
        zincir.append(parcalar[i - 1] if re.fullmatch(r'\d{4}', parcalar[i - 1]) else EN_BASLIK.get(r, ''))
    return ' > '.join(z for z in zincir if z)

def docrow_etiketleri(dizin, haric=()):
    """Belge adresi → sayfalardaki belge satırı adları (sırayla, tekrarsız)."""
    m = {}
    for kok, _, dosyalar in os.walk(os.path.join(SITE, dizin)):
        if any(h in kok for h in haric):
            continue
        for ad in dosyalar:
            if not ad.endswith('.html'):
                continue
            metin = open(os.path.join(kok, ad), encoding='utf-8').read()
            for x in re.finditer(r'<a class="docrow" href="([^"]+)"[^>]*>.*?<span class="d-t">(.*?)</span><span class="d-f"', metin, re.S):
                t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', x.group(2)))).strip()
                if t and t not in m.setdefault(x.group(1), []):
                    m[x.group(1)].append(t)
    return m

def tr_etiket_parcalari(x, tr_satir):
    """Kütüphane kaydının adı eski derlemede TR ve eski EN adların ' | ' ile birleşimiydi; yalnız TR sayfalardaki adlar."""
    parcalar = [p.strip() for p in (x.get('l') or '').split(' | ') if p.strip()]
    tr = tr_satir.get(x['p'], [])
    kalan = [p for p in parcalar if p in tr]
    if not kalan:
        kalan = [p for p in parcalar if '*' not in p and not re.fullmatch(r'\(\d{2}\.\d{2}\.\d{4}\)', p)]
    return list(dict.fromkeys(kalan))

def kutuphane():
    s_tr = oku('yatirimci-iliskileri/belge-kutuphanesi/index.html'); s = oku('en/investor-relations/document-library/index.html')
    tr_satir = docrow_etiketleri('.', haric=(os.sep + 'en', 'panel-sablon'))
    tr_out, out = [], []
    for x in json_oku(s_tr, 'libData'):
        tr_p = tr_etiket_parcalari(x, tr_satir)
        t = dict(x); t['l'] = ' | '.join(tr_p) if x.get('l') else x.get('l', '')
        tr_out.append(t)
        y = dict(x)
        if x.get('l'):
            en_p = []
            for p in tr_p:
                e = kisa(p, baglam='etiket') if kur.BELGE_CEVIR else p    # belge adları çevrilmez (kullanıcı kararı)
                if e is None:
                    eksik.append(('l', p)); e = p
                en_p.append(e)
            y['l'] = ' | '.join(dict.fromkeys(en_p))
        if x.get('r'):
            y['c'] = c_kur(x['r'])
            y['r'] = en_rota(x['r'])
        out.append(y)
    s = json_betik(s, 'libData', out)
    s, n = re.subn(r'const TUR = \{.*?\};', 'const TUR = %s;' % json.dumps(TUR_EN, ensure_ascii=False, separators=(',', ':')), s, count=1)
    assert n == 1
    s = re.sub(r'(<option value="([a-z-]+)">)[^<]*(</option>)', lambda m: m.group(1) + metin_kacis(TUR_EN[m.group(2)]) + m.group(3) if m.group(2) in TUR_EN else m.group(0), s)
    s = kucuk_harf(s)
    return kabuk(s), len(out), json_betik(s_tr, 'libData', tr_out)

# ---------------------------------------------------------------- panel haritası
def harita_guncelle():
    """panel-veri/harita.json: EN bölüm adları, EN yıl başlık kalıbı, EN yıl sayfaları, sayfa eşleri, güncel belge EN adları."""
    import kalip
    yol = os.path.join(SITE, 'panel-veri', 'harita.json')
    h = json.load(open(yol, encoding='utf-8'))
    es = eslesme()
    for b in h['bolumler']:
        b['adEn'] = EN_BASLIK[b['kok']['tr']]
        if b['tip'] == 'yil':
            b['desen']['en'] = '{yil} ' + {'14': 'Annual Reports', '6': 'Material Event Disclosures'}[b['kid']]
            for yil, d in b['yillar'].items():
                if d.get('tr') and d['tr'] in es and os.path.exists(os.path.join(SITE, es[d['tr']].lstrip('/'), 'index.html')):
                    d['en'] = es[d['tr']]
        for g in b['gruplar']:
            g['adEn'] = {'Mali Tablolar': 'Financial Statements', 'Dipnotlar': 'Footnotes'}.get(g['ad'], g['adEn'])
    h['esler'] = {tr: en for tr, en in sorted(es.items()) if os.path.exists(os.path.join(SITE, en.lstrip('/'), 'index.html'))}
    for g in h['guncel']:
        if not kur.BELGE_CEVIR:
            g.pop('etiket_en', None)                      # EN sayfada da TR belge adı
            continue
        e = kisa(g['etiket'], baglam='etiket')
        if e is None:
            eksik.append(('guncel', g['etiket']))
        else:
            g['etiket_en'] = e
    return json.dumps(h, ensure_ascii=False, separators=(',', ':'))

# ---------------------------------------------------------------- panel şablonları
SABLON_DEGISIM = {'Annual Repots': 'Annual Reports', 'Material Event Disclosure': 'Material Event Disclosures'}

def sablon(yol):
    s = kabuk(oku(yol))
    # başlık, açıklama, OG başlığı ve üst satırdaki bölüm adı
    def bolum(m):
        return m.group(1) + SABLON_DEGISIM.get(m.group(2), m.group(2)) + m.group(3)
    s = re.sub(r'(· )(Annual Repots|Material Event Disclosure)( ·)', bolum, s)
    s = re.sub(r'(INVESTOR RELATIONS / )(Annual Repots|Material Event Disclosure)(<)', bolum, s)
    s = re.sub(r'(__BASLIK__ · )(Annual Repots|Material Event Disclosure)(: documents)', bolum, s)
    return s

# ---------------------------------------------------------------- TR sayfaları: EN eşi
def tr_sayfalar():
    """TR sayfalara hreflang="en" ve dil seçicide EN eşinin adresi (önceden EN eşi olmayanlarda /en/ idi)."""
    ALAN = 'https://www.idealistgyo.com'
    out = {}
    for tr, en in sorted(eslesme().items()):
        if not os.path.exists(os.path.join(SITE, en.lstrip('/'), 'index.html')):
            continue
        yol = (tr.lstrip('/') + 'index.html')
        s0 = oku(yol)
        alt = ('<link rel="alternate" hreflang="tr" href="{a}{tr}"><link rel="alternate" hreflang="en" href="{a}{en}">'
               '<link rel="alternate" hreflang="x-default" href="{a}{tr}">').format(a=ALAN, tr=tr, en=en)
        s, n1 = re.subn(r'(?:<link rel="alternate" hreflang="[^"]*" href="[^"]*">)+', alt, s0, count=1)
        s, n2 = re.subn(r'(<b aria-current="true" data-astro-cid-nen7h5rs>TR</b><a href=")[^"]*(" hreflang="en" lang="en" data-astro-cid-nen7h5rs>EN</a>)',
                        lambda m: m.group(1) + en + m.group(2), s)
        if n1 != 1 or n2 != 2:
            raise SystemExit('TR sayfa kalıbı tutmadı: %s %d %d' % (tr, n1, n2))
        if s != s0:
            out[yol] = s
    return out

# ---------------------------------------------------------------- sitemap
def sitemap():
    """sitemap-0.xml: tüm EN sayfalar; kaldırılan yalnız-EN sayfalar çıkarılır (yalnızca / ve /en/ hreflang eşli, önceki gibi)."""
    ALAN = 'https://www.idealistgyo.com'
    s = oku('sitemap-0.xml')
    bas = s[:s.index('<url>')]; son = s[s.rindex('</url>') + len('</url>'):]
    kayit = {re.search(r'<loc>([^<]+)</loc>', u).group(1): u for u in re.findall(r'<url>.*?</url>', s)}
    for loc in list(kayit):
        r = loc[len(ALAN):]
        if not os.path.exists(os.path.join(SITE, r.lstrip('/'), 'index.html')):
            del kayit[loc]
    for tr, en in eslesme().items():
        if os.path.exists(os.path.join(SITE, en.lstrip('/'), 'index.html')) and ALAN + en not in kayit:
            kayit[ALAN + en] = '<url><loc>%s%s</loc></url>' % (ALAN, en)
    return bas + ''.join(kayit[k] for k in sorted(kayit)) + son, len(kayit)

# ---------------------------------------------------------------- OG görselleri
TABAN = 'og/haberler--genel-mudur-atamasi-hk.jpg'     # açık zeminli şablon (başlık alanı og.mjs içinde boşaltılır)
FOTO = ('/og/en.jpg', '/og/en--portfolio')              # fotoğraflı şablonlar: yeniden çizilmez
UST_OG = {'investor-relations': 'Investor Relations', 'corporate': 'About Us', 'news': 'News & Announcements',
          'in-media': 'In Media', 'portfolio': 'Portfolio and Projects', 'links': 'Links', 'contact': 'Contact',
          'site-map': 'Site Map', 'search': 'Search', 'privacy-and-cookie-policy': 'Privacy'}

def og_isleri():
    """EN sayfaların kullandığı OG görsellerinden yeni olanlar ve başlığı değişenler için iş listesi."""
    bas = {x['rota']: x for x in json.load(open(os.path.join(kur.CEVIRI, 'cikti', 'basliklar.json'), encoding='utf-8'))}
    durum_yol = os.path.join(kur.CEVIRI, 'cikti', 'og-durum.json')        # og.mjs'in çizdikleri: {dosya: {kicker, baslik}}
    durum = json.load(open(durum_yol, encoding='utf-8')) if os.path.exists(durum_yol) else {}
    ad_rota = {('/og/' + en.strip('/').replace('/', '--') + '.jpg'): (tr, en) for tr, en in eslesme().items() if en != '/en/'}
    kullanilan = set()
    for kok, _, ds in os.walk(os.path.join(SITE, 'en')):
        for d in ds:
            if d.endswith('.html'):
                m = re.search(r'og:image" content="https://www\.idealistgyo\.com(/og/[^"]+)"', open(os.path.join(kok, d), encoding='utf-8').read())
                kullanilan.add(m.group(1))
    isler = []
    for og in sorted(kullanilan):
        if og.startswith(FOTO):
            continue
        tr, en = ad_rota[og]
        baslik = EN_BASLIK[tr]
        parcalar = en.strip('/').split('/')
        kicker = 'İdealist Gayrimenkul Yatırım Ortaklığı A.Ş.' if len(parcalar) == 2 else UST_OG[parcalar[1]]
        var = os.path.exists(os.path.join(SITE, og.lstrip('/')))
        cizilen = durum.get(og.lstrip('/'))
        if var and (cizilen == {'kicker': kicker, 'baslik': baslik} or (cizilen is None and bas[tr].get('en_mevcut') == baslik)):
            continue
        isler.append({'cikti': og.lstrip('/'), 'taban': TABAN, 'kicker': kicker, 'baslik': baslik})
    return isler

def main():
    yazilsin = '--yaz' in sys.argv
    sonuc = {}
    sonuc['en/search/index.html'], n1 = arama()
    sonuc['en/investor-relations/document-library/index.html'], n2, sonuc['yatirimci-iliskileri/belge-kutuphanesi/index.html'] = kutuphane()
    sonuc['panel-veri/harita.json'] = harita_guncelle()
    for yol in ('en/contact/index.html', 'en/privacy-and-cookie-policy/index.html'):
        sonuc[yol] = kabuk(oku(yol))
    tr = tr_sayfalar()
    sonuc.update(tr)
    sonuc['sitemap-0.xml'], n3 = sitemap()
    for kid in ('14', '6'):
        sonuc['panel-sablon/yk/en-%s/index.html' % kid] = sablon('panel-sablon/yk/en-%s/index.html' % kid)
    isler = og_isleri()
    with open(os.path.join(kur.CEVIRI, 'cikti', 'og-isler.json'), 'w', encoding='utf-8') as f:
        json.dump(isler, f, ensure_ascii=False, indent=1)
    print('OG işi', len(isler), '(araclar/ceviri/cikti/og-isler.json; çizmek için: node araclar/ceviri/og.mjs araclar/ceviri/cikti/og-isler.json)')
    for yol, s in sonuc.items():
        if not yol.startswith(('en/', 'panel-sablon/')):
            if yol not in tr:
                print(yol, 'güncellendi')
            if yazilsin:
                yaz(yol, s)
            continue
        kalan = [x for x in ('Annual Repots', 'Telefon:', 'Faks:', 'General Assembly Informations', 'The List Of Attendees',
                             'IPO Prospectuses And Circulars', 'Internal Instruction', '>About REIT<', '>*<') if x in s]
        print(yol, 'kalan:', kalan or '-')
        if yazilsin:
            yaz(yol, s)
    print('arama kaydı', n1, 'kütüphane kaydı', n2, 'EN eşi eklenen TR sayfa', len(tr), 'sitemap adres', n3)
    if eksik:
        print('çevrilemeyen:')
        for e in eksik:
            print('  ', e)

if __name__ == '__main__':
    main()
