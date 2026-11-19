"""EŞYALAR VE SİMGELER — Atölye S-146 dijital suluboya (motor.py üzerine).

Kurzgesagt netliğinde simgeler, suluboya diliyle: saydam ilk lavi (yerel renk, açık), gölge yanında ikinci koyu sır,
gerektiğinde dar bir üçüncü vurgu; parlak yerler BOŞ BIRAKILMIŞ kâğıttır (ilk lavinin içinden oyulur) ya da eşiksiz
yumuşak açık lekedir. Her öğe kendi içinde ÖNDEN ARKAYA boyar: bir parça bitince saklamaya yazılır, arkadaki parça
onun çevresine boyanır (renkler çamurlaşmaz). Öğe sonunda kendi silüetini saklamaya yazar (arkasındaki sahne boş
kalır); ``sakla_sonra=False`` verilen öğelerde çağrı öncesi saklama geri yüklenir.

Ortak kurallar
--------------
* ``t``: motor.Tuval, ``M``: yerel -> ekran 3x3 (ör. ``kamera.M() @ M_yerlestir(x, y, olcek)``).
  Yerel birimde **y AŞAĞI**, "yukarı" = -y. Aynalı M (det < 0) desteklenir.
* ``isik=(lx, ly)``: ışığa doğru EKRAN yönü (varsayılan sol-üst (-0.6, -0.8)); M'den yerel yöne çevrilir, böylece
  aynalanmış (yon=-1 figürün eli) ya da döndürülmüş öğede de gölge doğru yanda kalır.
* Deterministik: rastgelelik yalnız ``np.random.default_rng(tohum)``; animasyon yalnız parametrelerden (aynı girdi =
  aynı kare; zamanlı öğelerde doğan/sönen parçalar boyca büyüyüp küçülerek gelir-gider, sıçrama yok).
* Bütün öğeler ``t.gorunurluk(alfa, maske_fn, M)`` bağlamına uyar (beliriş/solma için sarabilirsiniz).
* Işık öğeleri (kalp nuru, ışın, zerreler, güneş halesi, saat ışık şeridi) üç katmanla çalışır: ``t.isik`` (önceden
  boyanmış yeri parlatır) + kısmi saklama (SONRA boyanan arka planı o yerde açık bırakır) + açık altın ton. Böylece
  sahnenin önden-arkaya sırası ne olursa olsun ışık görünür ve mavi gök üstünde yeşile dönmez.

FONKSİYONLAR  (boyutlar ölçülmüş silüet sınırlarıdır, olcek=1)
----------------------------------------------------------------
1. ciz_ibrik(t, M, egim=0.0, tohum=0, sakla_sonra=True, isik=(-0.6, -0.8)) -> np.array([x, y])  (EKRAN)
   Bakır ibrik: armudi gövde + ince boyun (tek parça), iki boncuklu bilezik, soğan kubbeli kapak ve damla topuz,
   gövdenin arkasından çıkan uzun kuğu boynu emzik (süs bilezikli, ağzı dudaklı), C kulp (üstte başparmak dayanağı,
   altta kıvrım), kaideli taban; omuzda iki kazıma çizgi + nokta dizisi, karında iki çizgi + zikzak, boyunda halka.
   Dönel parçalar profil boyunca gölgelenir: ilk açık bakır lavi, gölge yanında yumuşak orta sır, dar koyu çekirdek
   gölge, uzak kenarda yansıma şeridi, altta hilal; ışık yanında uzun boş bırakılmış parıltı şeritleri. Işıklı yan
   SÜREKLİdir (``_isik_yani``): sahnedeki aynalı, ~37° eğik ibrikte ışık neredeyse eksen boyunca gelir; yerel L_x işaret
   değiştirdiğinde parıltı ortadan geçer, gölge iki kenara paylaşılır (eskiden bütün gölgelendirme bir karede öbür
   yana sıçrıyordu).
   * YEREL ÇERÇEVE = insan.ciz_insan'ın ``elde(t, M_el)`` çerçevesi: köken = kulpu kavrayan yumruğun avuç merkezi
     (kavrama noktası), +x emziğe doğru (parmak yönü), +y aşağı (ibriğin altı). Kulpun kavranan dik çubuğu
     x≈+5..+15'te y≈-30..+30 boyunca geçer (yumruk x∈[-24,32], y∈[-12,12] onu örter). Adam 600 birimken boyut
     ~124 x 150: x +5 (kulp sırtı) .. +128 (emzik dudağı), y -72 (topuz ucu) .. +77 (kaide altı).
   * egim (derece, ~0..60): ibriği köken çevresinde döndürür; + emzik AŞAĞI iner (dökme). 0 dik, 30 dökmeye
     başlama, 55 bol dökme. Aynalı M'de de + = emzik aşağı.
   * Döner: emzik ağzının EKRAN konumu. Çizmeden yardımcılar:
       ibrik_agzi(M, egim=0) -> (uc, yon): emzik ağzı ve suyun çıkış yönü (birim vektör), ikisi de EKRAN.
       ibrik_alt_nokta(egim=0) -> (x, y): kaide altının ortası, YEREL (el) çerçevede. Sulama pozunda uzak el
       ibriğin altına otursun diye: ``insan.sula_pozu(dok, alt_el=esyalar.ibrik_alt_nokta(egim))``.
       IBRIK_ALT = ibrik_alt_nokta(0) ≈ (59.8, 77.5).

2. ciz_su_akisi(t, M, p_bas, p_son, zaman, debi=1.0, tohum=0, yon=None, kalinlik=None, cephe=1.0, kuyruk=0.0,
                sicrama=1.0, isik=(-0.6, -0.8), sakla_guc=0.3, renk_='#7FB5DC') -> dict | None
   Emzikten hedefe parabolik su akışı: saydam seruleum, koyu ıslak kenarlı/açık çekirdekli, akışla aşağı kayan boş
   bırakılmış ışık çizgileri ve şişkinlikler, yanlara kopan damlacıklar; hedefte yassı birikinti, genişleyen iki
   halka, kısa taç uçları ve parabolle sıçrayan damlacıklar (yumuşak sıçrama).
   * p_bas, p_son: M'nin YEREL koordinatı (M = np.eye(3) ise EKRAN; ciz_ibrik'in dönüşüyle doğrudan kullanılır).
     Yerçekimi = ekranda aşağı (M'den yerel yöne çevrilir).
   * yon: suyun çıkış yönü (yerel vektör; ör. ibrik_agzi'nın yonu); None = hedefe doğru yatay çıkış. Eğri, ekseni
     yerçekimine paralel ikinci derece Bezier'dir (gerçek atış parabolü; çıkış yönünü ve hedefi tam tutar).
   * kalinlik: çıkıştaki tam genişlik (yerel); None = mesafenin ~%2.4'ü (2.8..16). Sahnede figür ölçeğiyle verin
     (adam 600 birimken ~6.5 birim -> M=eye ise 6.5 * figür_ölçeği px).
   * zaman (sn): akış animasyonu. Akış deseni (şişkinlik, ışık çizgileri, damlalar) kalinlik ölçeğinde sabit bir
     kafeste ~0.85 m/sn (adam ölçeğinde) akar: emzik oynayıp yol uzunluğu değişse ya da kamera yaklaşsa da desen
     sıçramaz/geri akmaz; 30 fps'de kare başına kayma desen aralığının ~0.3'ü (akış yönü okunur).
     debi 0..1: miktar (0 = hiç çizmez; <0.62'de akışın alt kısmı damlalara bölünür).
     cephe 0..1: suyun ön ucu yol boyunca (dökme başlarken 0->1), kuyruk 0..1: arka uç (dökme biterken 0->1).
     sicrama 0..1: hedef sıçramasının gücü (cephe hedefe varınca kendiliğinden başlar, kuyruk gelince söner).
   * Saydam: saklamaya uyar (önündeki el/ibrik boyanmaz), sakla_guc kadar kısmi saklama yazar (arkası hafif açılır).
   * Döner: dict(egri=[(x, y) EKRAN, ...], hedef=(x, y) EKRAN) ya da debi=0'da None.

3. ciz_meyve_tabagi(t, M, olcek=1.0, tohum=0, isik=..., sakla_sonra=True) -> dict(kutu)      ('lezzet')
   Sığ, ayaklı seramik kâse (açık seladon-turkuaz sır, kobalt nokta bandı, içbükey iç gölge) içinde: arkada taçlı
   bütün nar, sağda yarılmış nar (zar odaları arasında mücevher gibi taneler, her birinde boş parıltı), solda
   kenardan sarkan mor üzüm salkımı (sap ve sülük), önde bütün mor incir ve yarım incir (pembe iç, tohumlar), arkada
   iki adaçayı yeşili yaprak.
   * Köken = simgenin görsel merkezi; ~220 x 178: x -111..110, y -88 (nar tacı) .. +91 (kâse ayağı).
     r=150 simge halkasına rahat sığar.

4. ciz_kese(t, M, olcek=1.0, tohum=0, isik=..., sakla_sonra=True, renk_='#B5C7AA', kordon='#C46D74') -> dict(kutu)
   ('ücret')  Adaçayı yeşili büzgülü kumaş kese: büzgü kıvrımları, gül kurusu baklava işlemeli bant, gül kurusu
   kordon (sarılı bant, düğüm, fiyonk, iki sarkan uç, altın püsküller), büzgülü fırfır ağız; önde dökülmüş altın
   sikkeler (eğik duran kahraman sikke: kabartma kenar, sekiz köşeli yıldız motifi, boş bırakılmış parıltı yıldızı;
   yere yatık sikke; üç sikkelik deste) ve yerde yumuşak lavanta gölge.
   * Köken = görsel merkez; ~184 x 205: x -92..92, y -103..102. renk_ ile kumaş rengi değişir (gölge sırları aynı
     pigmentin katları: gri karışım yok).

5. ciz_madalya(t, M, olcek=1.0, tohum=0, isik=..., sakla_sonra=True) -> dict(kutu)               ('mükâfat')
   Toz pembe V kurdele (ortada koyu şerit, kenarlarda boş bırakılmış ince çizgiler, üstte kıvrım, madalyaya doğru
   koyulaşan; sağ şerit solun arkasında, kesişimde gölge), altın halka ve altın madalya: kesiksiz dönen kenar
   gölgesi, çukur alan, yaprak yaprak kabartma defne çelengi, pahlı (yüzleri ışığa göre açık/koyu) beş köşeli yıldız,
   boş bırakılmış kenar hilali ve parıltı yıldızı. Altın: gamboj ilk lavi + okra sır + koyu okra vurgular.
   * Köken = görsel merkez; ~124 x 218: x -62..62, y -113 (kurdele üstü) .. +106 (madalya altı).

6. ciz_simge_halkasi(t, M, r, renk_='#F1E3D3', ilerleme=1.0, tohum=0, yog=0.55)
   Simgenin ARKASINA boyanan yumuşak suluboya disk (simgeden SONRA çağırın): açık lavi, biraz koyu ıslak kenar,
   ortası hafif açık, kenar içinde çok soluk ikinci yankı. ilerleme 0..1: boya merkezden organik kenarla yayılır
   (e_out), sonda temiz daireye oturur. Köken = disk merkezi, r yerel yarıçap. Saklamayı yalnız boyanmış (açılmış)
   alana, lavinin keskin kenarında bitecek biçimde yazar (gök sonra boyanınca açılma kenarında beyaz hale kalmaz).

7. ciz_saat(t, M, r, dilim=0.0, gun=0.0, akrep=None, yelkovan=None, gorunurluk=1.0, tohum=0, hale=1.0) -> dict
   Güneş üzerinde beliren saat kadranı. Güneş diskini (açık sıcak sarı lavi, ortası açık, ince ıslak kenar) HER
   ZAMAN çizer; köken = güneş merkezi, r = güneş yarıçapı (yerel; ölçülen ±120 r=120'de).
   * gorunurluk 0..1: kadranı getirir — 12 saat işareti (ince sivri fırça izleri; 12-3-6-9 daha uzun/kalın) saat
     yönünde sırayla dıştan içe boyanır (0..0.75), akrep ve yelkovan merkezden uzayarak belirir (0.55..1).
   * dilim 0..1: TEK saat dilimini (12'den 1'e, 30°) merkezden dışa organik kenarla altın sırla doldurur.
   * gun 0..1: altın dolgunun ön kenarı saat yönünde 30°'den 360°'ye döner (bir saat bütün bir gün olur); hareketli
     kenarda yumuşak parlak şerit (kenar boyunca açılan altın + krem-beyaz ışık; öndeki akrep/yelkovan ve işaretleri
     ağartmaz). gun=1: bütün disk altın.
   * akrep / yelkovan: derece, 0 = saat 12, saat yönünde +. None: akrep dolgunun ön kenarını izler
     (30°*dilim + 330°*gun), yelkovan = 360°*(dilim + 2*gun).
   * hale 0..1: güneş çevresinde göğün açık kalan yumuşak halesi (kısmi saklama + açık sıcak ton; gök sonra
     boyanmalı). Saklamaya güneş diskini yazar. Döner: dict(merkez=(x, y) EKRAN, r_ekran=yarıçap px).

8. ciz_kalp_nuru(t, M, r, parlaklik=1.0, isin=0.0, zaman=0.0, isin_ust=-80.0) -> dict(merkez) | None
   Göğüste sıcak altın nur. İnsan çizildikten SONRA çağrılır (figürün saklamasına takılmaz; nur figürün üstüne
   biner). Köken = kalp noktası (insan dönüşü 'kalp'), r = çekirdek yarıçapı (yerel; adam 600 birimken ~26).
   Katmanlar: geniş sıcak ışıma (t.isik ölçülü), ~3R'ye uzanan 8 çok soluk ve çok yavaş dönen ışın, parlayan
   zeminin üstünde geniş açık gamboj sırrı + ortada dolgun gamboj + okra halka, krem-beyaz göz. zaman (sn) ile
   ~1.7 sn'lik nazik nabız (boyut ±%5, parlaklık ±%12). parlaklik 0..1 (0'da yalnız ışın çizilir).
   * isin 0..1: çekirdekten yukarı yükselen yumuşak dikey ışık sütunu (genişlik kalpte ~1R sigma, yukarıda ~2R);
     ön ucu yumuşakça yükselir (e_out), 1'de isin_ust EKRAN y'sine (ekranın üstü) ulaşır; içinde yükselen ışık
     dalgaları ve zerreler (sayı sabit, sütunla solar). Sütun arkasındaki sahneyi açık bırakır (kısmi saklama);
     önceden boyanmış figürü (baş, omuz) yalnız ölçülü parlatır, böylece baş ışında ağarıp hayaletleşmez.

9. ciz_sikayet_bulutu(t, M, olcek=1.0, olusum=1.0, kaldirma=0.0, zaman=0.0, tohum=0) -> None    ('şekva')
   Başın üstünde küçük, gri, karmakarışık düşünce bulutu: loblu soluk gri-mor lavi + alt gölge sırrı, içinde titrek,
   ilmekli, ani kırıklı grafit karalama çizgileri (3 kalem yolu); altında başa inen iki düşünce kabarcığı.
   * Köken = bulut merkezi; olcek=1'de bulut ~185 x 104 (x -92..93, y -50..54); kabarcıklar y≈+76 (r 11) ve
     +108 (r 6.5): baş tepesi köken + (0, ~150)'de varsayılır (sahne: bas_ust - 150).
   * olusum 0..1: kabarcıklar (0..0.22) -> lavi merkezden organik açılır (0.08..0.53) -> karalamalar kalem ucu
     dolanarak kendini çizer (0.22..1, üç yol sırayla).
   * kaldirma 0..1: ıslak fırça soldan sağa geçer (0..0.8); geçtiği yerde lavi kaldırılır (soluk iz kalır), grafit
     erir (yumuşak gri bulanıklık), kaldırma sınırında hafif geri akış halkası; bulut ~26 birim yükselir, %10
     genişler, 0.7..1'de tamamen solar. 0.16'dan sonra içinden 4 pembe-şeftali taç yaprağı çıkıp dönerek ~180
     birim yukarı süzülür ve söner. zaman: karalamaların çok hafif kıpırtısı, yaprak salınımı.

10. ciz_isik_zerreleri(t, M, zaman, sayi, alan, tohum=0, boyut=1.0, renk_='#FFE3A3', guc=0.55, hiz=1.0)
   Seyrek, sıcak, yumuşak ışık zerreleri: yavaşça yükselir (alan yüksekliğinin %4-10'u / sn * hiz), yana salınır,
   nazikçe kıpırdar; alanın alt kenarında doğar, üst kenarında söner (döngüsel, sıçramasız). alan=(x0, y0, x1, y1)
   YEREL. boyut: zerre ölçeği (1 -> çekirdek σ≈1.9, ışıma σ≈6.5 yerel birim). guc parlatmayla birlikte kısmi
   saklamayı ve tonu da ölçekler (guc -> 0: hiç iz yok). Belirip solma için ``sayi``yı SABİT tutup guc'u değiştirin:
   sayi her değiştiğinde yeni zerre bulunduğu yerde birden belirir.

Hız (1080x1920, tek çekirdek, kullanım ölçeğinde): ibrik ~0.04 sn, su ~0.01-0.02, meyve tabağı ~0.15-0.18,
kese ~0.05, madalya ~0.05, halka ~0.012, saat ~0.03-0.04, nur ~0.02 (ışınla ~0.07), şikâyet bulutu ~0.01-0.045,
26 zerre ~0.07 sn.
"""
from __future__ import annotations

import math

import cv2
import numpy as np
import skia

from motor import (Tuval, M_bilesik, M_oteleme, M_olcek, M_donme, yol_egri, yol_daire, yol_elips, yol_dikdortgen,
                   yol_serit, yol_op, yol_donustur, yol_cokgen, damla_blob, maske_ciz, yollar_kirp, smoothstep,
                   acilma_radyal, renk, karistir, Kirp, nokta_donustur, W, H, e_out, e_io, sstep)

I3 = np.eye(3)
ISIK = (-0.6, -0.8)

# ----------------------------------------------------------------------------------------------------------------
# palet
# ----------------------------------------------------------------------------------------------------------------
BAKIR = dict(acik='#EFB98C', orta='#CE7E47', koyu='#9E552D', cizgi='#955234', vurgu='#7A4127')
ALTIN = dict(acik='#F4D37C', orta='#DDA94A', koyu='#B57E2C', cizgi='#A0702A', derin='#8E6224')
SU = '#7FB5DC'

_TEMIZ = dict(dalga=0.05, islak=1.0, gran=0.07, akis=0.15)


# ----------------------------------------------------------------------------------------------------------------
# küçük yardımcılar
# ----------------------------------------------------------------------------------------------------------------
def _olcek(M):
    return math.sqrt(abs(float(np.linalg.det(np.asarray(M, np.float64)[:2, :2])))) + 1e-12


def _isik_yerel(M, isik=ISIK):
    A = np.asarray(M, np.float64)[:2, :2]
    v = np.linalg.solve(A, np.asarray(isik, np.float64))
    return v / (np.linalg.norm(v) + 1e-12)


def _asagi_yerel(M):
    A = np.asarray(M, np.float64)[:2, :2]
    v = np.linalg.solve(A, np.array([0.0, 1.0]))
    return v / (np.linalg.norm(v) + 1e-12)


def _tasi(yol, dx, dy):
    return yol_donustur(yol, M_oteleme(float(dx), float(dy)))


def _golge(yol, L, d, e=0.0):
    """Işıktan uzak yanda hilal: yol − (ışığa doğru d kaydırılmış yol). e>0: uzak kenarda e genişliğinde yansıma
    şeridi boş kalır."""
    a = yol
    if e > 0:
        a = yol_op(yol, _tasi(yol, L[0] * e, L[1] * e), 'kesisim')
    return yol_op(a, _tasi(yol, L[0] * d, L[1] * d), 'fark')


def _parlak_hilal(yol, L, d):
    """Işığa bakan kenarda ince hilal (kabartmanın ışıklı kenarı)."""
    return yol_op(yol, _tasi(yol, -L[0] * d, -L[1] * d), 'fark')


def _fark(yol, *delikler):
    out = yol
    for d in delikler:
        if d is not None and not d.isEmpty():
            out = yol_op(out, d, 'fark')
    return out


def _birlesim(*yollar):
    out = None
    for y in yollar:
        if y is None or y.isEmpty():
            continue
        out = y if out is None else yol_op(out, y, 'birlesim')
    return out if out is not None else skia.Path()


def _bos(y):
    return y is None or y.isEmpty()


def _lv(t, yollar, M, renk_, yog, **kw):
    """Simgeler için temiz lavi: ıslak kenar bandı ve kenar yumuşaklığı ekrandaki boyuta göre."""
    if isinstance(yollar, skia.Path):
        yollar = [yollar]
    yollar = [y for y in yollar if not _bos(y)]
    if not yollar:
        return
    if 'islak_gen' not in kw or 'kenar' not in kw:
        s = _olcek(M)
        r = None
        for y in yollar:
            b = y.computeTightBounds()
            r = b if r is None else skia.Rect.MakeLTRB(min(r.left(), b.left()), min(r.top(), b.top()),
                                                      max(r.right(), b.right()), max(r.bottom(), b.bottom()))
        boy = min(r.width(), r.height()) * s if kw.get('cizgi') is None else max(r.width(), r.height()) * s
        kw.setdefault('islak_gen', float(np.clip(boy * 0.05, 1.2, 2.6)))
        kw.setdefault('kenar', float(np.clip(boy * 0.02, 0.7, 1.1)))
    for k, v in _TEMIZ.items():
        kw.setdefault(k, v)
    t.lavi(yollar, M, renk_, yog=yog, **kw)


def _sakla(t, yollar, M, yumusak=0.7):
    if isinstance(yollar, skia.Path):
        yollar = [yollar]
    yollar = [y for y in yollar if not _bos(y)]
    if yollar:
        t.sakla_ekle(yollar, M, yumusak=yumusak)


def _sakla_acilma(t, yollar, M, maske_fn=None, yumusak=0.8, guc=1.0, esik=(0.3, 0.7)):
    """Açılma maskesiyle (acilma_radyal ...) boyanan lavinin saklaması: maske, lavinin kendi eşiği gibi eşiklenir;
    böylece saklama lavinin keskin ıslak kenarında biter (dışında arka plan yarı açık 'beyaz hale' kalmaz)."""
    if isinstance(yollar, skia.Path):
        yollar = [yollar]
    yollar = [y for y in yollar if not _bos(y)]
    if not yollar:
        return
    if maske_fn is None:
        t.sakla_ekle(yollar, M, yumusak=yumusak, guc=guc)
        return
    k = yollar_kirp(yollar, M, 4 + 3 * yumusak)
    if k.bos():
        return
    m = maske_ciz(yollar, M, k)
    X, Y = Tuval._yerel_izgara(np.linalg.inv(np.asarray(M, np.float64)), k)
    m = smoothstep(esik[0], esik[1], maske_fn(m, X, Y)).astype(np.float32)
    if m.max() > 1e-4:
        t.sakla_ekle([], M, yumusak=yumusak, guc=guc, maske=(k, m))


def _egri_ekle(p, pts, gerilim=0.5):
    n = len(pts)
    k = gerilim / 3.0
    for i in range(n - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < n else p2
        c1 = (p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k)
        c2 = (p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k)
        p.cubicTo(float(c1[0]), float(c1[1]), float(c2[0]), float(c2[1]), float(p2[0]), float(p2[1]))


def yol_profil(cx, prof, gerilim=0.5):
    """Dikey eksenli dönel cisim silüeti. prof: [(y, yarı_genişlik), ...] yukarıdan aşağı."""
    sag = [(cx + w, y) for y, w in prof]
    sol = [(cx - w, y) for y, w in reversed(prof)]
    p = skia.Path()
    p.moveTo(*map(float, sag[0]))
    _egri_ekle(p, sag, gerilim)
    p.lineTo(*map(float, sol[0]))
    _egri_ekle(p, sol, gerilim)
    p.close()
    return p


def _prof_hw(prof, y):
    ys = np.array([q[0] for q in prof], np.float64)
    ws = np.array([q[1] for q in prof], np.float64)
    return np.interp(y, ys, ws)


def _profil_serit(prof, cx, f0, f1, y0, y1, sgn, n=18, sivri=1.0):
    """Profil boyunca (yarı genişliğin f0..f1 kesrinde) uçları sivri dikey şerit (parlaklık, gölge bandı)."""
    ys = np.linspace(y0, y1, n)
    hw = _prof_hw(prof, ys)
    u = np.linspace(0, 1, n)
    zarf = np.sin(u * math.pi) ** (0.6 * sivri)
    fm, fh = 0.5 * (f0 + f1), 0.5 * (f1 - f0)
    a = cx + sgn * hw * (fm - fh * zarf)
    b = cx + sgn * hw * (fm + fh * zarf)
    pts = list(zip(a, ys)) + list(zip(b[::-1], ys[::-1]))
    return yol_egri(pts, kapali=True, gerilim=0.45)


def _elips_noktalari(cx, cy, rx, ry, a0, a1, n=24, aci=0.0):
    a = np.linspace(a0, a1, n)
    c, s = math.cos(math.radians(aci)), math.sin(math.radians(aci))
    x = rx * np.cos(a)
    y = ry * np.sin(a)
    return np.stack([cx + c * x - s * y, cy + s * x + c * y], 1)


def _firca(p0, p1, w, profil=(0.35, 1.0, 0.85, 0.3), n=9, egrilik=0.0):
    """İnce fırça izi: p0'dan p1'e, genişlik profili verilen sivri uçlu şerit (w: en geniş yarı genişlik)."""
    p0, p1 = np.asarray(p0, np.float64), np.asarray(p1, np.float64)
    u = np.linspace(0, 1, n)
    d = p1 - p0
    nrm = np.array([-d[1], d[0]]) / (np.linalg.norm(d) + 1e-9)
    pts = p0[None] + u[:, None] * d[None] + (egrilik * np.sin(u * math.pi))[:, None] * nrm[None] * np.linalg.norm(d)
    ws = np.interp(u, np.linspace(0, 1, len(profil)), profil) * w
    return yol_serit(pts, ws)


def _boru_isik(pts, ws, L, f=0.45, gen=0.28, n_esik=0.15):
    """Boru (emzik, kulp) boyunca ışığa bakan yanda ince parlak şerit."""
    om = np.asarray(pts, np.float64)
    tan = np.gradient(om, axis=0)
    tan /= (np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9)
    nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
    dt = nor @ np.asarray(L)
    k = np.clip((np.abs(dt) - n_esik) / 0.5, 0, 1)
    sgn = np.sign(dt)
    ws = np.asarray(ws, np.float64)
    merkez = om + nor * (sgn * ws * f)[:, None]
    gw = ws * gen * k
    if gw.max() < 0.25:
        return None
    return yol_serit(merkez, np.maximum(gw, 0.02))


def _gauss_maske(k: Kirp, noktalar, sigmalar, guclar):
    """Kırpıntıya (ekran) yumuşak Gauss lekeleri toplar."""
    m = np.zeros((k.h, k.w), np.float32)
    for (x, y), s, g in zip(noktalar, sigmalar, guclar):
        if g <= 1e-4 or s <= 0.05:
            continue
        R = int(math.ceil(3.2 * s))
        xi, yi = int(round(x)) - k.x0, int(round(y)) - k.y0
        x0, x1 = max(0, xi - R), min(k.w, xi + R + 1)
        y0, y1 = max(0, yi - R), min(k.h, yi + R + 1)
        if x1 <= x0 or y1 <= y0:
            continue
        xs = np.arange(x0, x1, dtype=np.float32) + k.x0 + 0.5 - x
        ys = np.arange(y0, y1, dtype=np.float32) + k.y0 + 0.5 - y
        m[y0:y1, x0:x1] += g * np.exp(-(ys[:, None] ** 2 + xs[None, :] ** 2) / (2 * s * s))
    return np.clip(m, 0, 1)


def _kirp_noktalar(xs, ys, pay):
    x0 = max(0, int(math.floor(min(xs) - pay)))
    y0 = max(0, int(math.floor(min(ys) - pay)))
    x1 = min(W, int(math.ceil(max(xs) + pay)))
    y1 = min(H, int(math.ceil(max(ys) + pay)))
    return Kirp(x0, y0, max(0, x1 - x0), max(0, y1 - y0))


def _parilti(t, k, m, renk_='#FFE6A8', guc=0.5, sakla_guc=0.5, ton=0.0, ton_renk='#F6D88E'):
    """Hazır maske (ekran kırpıntısı) ile ışık: ekran parlatma + kısmi saklama + açık sıcak ton."""
    if k.bos() or m.max() <= 1e-4:
        return
    if ton > 0:
        t.lavi([], I3, ton_renk, yog=ton, maske=(k, m), kenar=0.0, dalga=0.0, islak=0.0, gran=0.04, akis=0.0,
               sakla=True)
    if guc > 0:
        t.isik([], I3, renk_, guc=guc, yumusak=0.0, maske=(k, m))
    if sakla_guc > 0:
        t.sakla_ekle([], I3, yumusak=0.0, guc=sakla_guc, maske=(k, m))


def _kutu(M, olcek, x0, y0, x1, y1):
    """Yerel dikdörtgenin (olcek uygulanmış) ekrandaki sınır kutusu (x0, y0, x1, y1)."""
    Ml = M_bilesik(np.asarray(M, np.float64), M_olcek(olcek))
    q = np.array([Ml @ np.array([x, y, 1.0]) for x in (x0, x1) for y in (y0, y1)])
    return (float(q[:, 0].min()), float(q[:, 1].min()), float(q[:, 0].max()), float(q[:, 1].max()))


def _sakla_kayit(t):
    return None if t.saklama is None else t.saklama.copy()


def _sakla_geri(t, kayit):
    if kayit is None:
        t.saklama = None
    else:
        t.saklama = kayit


# ================================================================================================================
# 1) İBRİK
# ================================================================================================================
_IB_S = 0.95                    # tasarım -> yerel ölçek
_IB_TUT_D = (9.6, -28.0)        # kulp kavrama noktası (tasarım)
_IB_TUT_L = (10.0, 0.0)         # ... yerel (el) çerçevede
_IB_BX = 62.0                   # gövde ekseni (tasarım x)
_IB_GOVDE = [(-62, 10.4), (-58, 9.2), (-52, 8.3), (-46, 8.2), (-40, 8.9), (-35, 10.4), (-30, 13.4), (-23, 19.6),
             (-14, 26.8), (-3, 32.6), (8, 35.9), (18, 36.4), (27, 33.2), (34, 27.6), (39, 21.0), (42.5, 15.0),
             (44.6, 9.0), (45.6, 0.01)]
_IB_KAIDE = [(40.5, 14.0), (43.5, 12.3), (46.5, 13.6), (49.3, 18.2), (51.8, 20.5), (53.6, 20.2), (54.4, 0.01)]
_IB_KAPAK = [(-69.6, 12.4), (-72.6, 12.0), (-76.5, 10.5), (-81, 7.7), (-85, 4.9), (-88.4, 2.5), (-89.6, 0.01)]
_IB_BILEZIK = [(-70.6, 0.01), (-70.4, 11.6), (-69.4, 13.6), (-67.0, 14.2), (-64.6, 13.6), (-63.6, 12.0),
               (-62.6, 12.6), (-61.0, 12.3), (-59.8, 10.0), (-59.6, 0.01)]
_IB_EMZIK = np.array([(80, 20), (95, 19), (106.5, 10), (112, -5), (114.6, -23), (116.8, -41), (120.4, -55.5),
                      (125.8, -66), (131.0, -71.6)], np.float64)
_IB_EMZIK_W = np.array([8.6, 7.4, 6.2, 5.2, 4.5, 4.0, 3.6, 3.35, 3.5])
_IB_KULP = np.array([(51, -63.5), (43.5, -70.5), (33, -74.5), (22.5, -73), (14.5, -65.5), (10.6, -52.5),
                     (9.5, -38), (9.5, -24), (10.6, -10), (14, 2), (20, 11.5), (27, 16.8), (34, 19)], np.float64)
_IB_KULP_W = np.array([4.4, 4.0, 3.8, 3.9, 4.2, 4.6, 4.8, 4.8, 4.5, 4.0, 3.7, 3.8, 4.4])


def _ib_D():
    return M_bilesik(M_oteleme(*_IB_TUT_L), M_olcek(_IB_S), M_oteleme(-_IB_TUT_D[0], -_IB_TUT_D[1]))


def _ib_uc_tasarim():
    p = _IB_EMZIK[-1]
    d = _IB_EMZIK[-1] - _IB_EMZIK[-2]
    d = d / np.linalg.norm(d)
    return p + d * 1.0, d


def ibrik_agzi(M, egim=0.0):
    """(uc, yon): emzik ucu ve suyun çıkış yönü, EKRAN koordinatında (çizmeden)."""
    Md = M_bilesik(np.asarray(M, np.float64), M_donme(egim), _ib_D())
    p, d = _ib_uc_tasarim()
    uc = Md @ np.array([p[0], p[1], 1.0])
    v = Md[:2, :2] @ d
    return np.array([uc[0], uc[1]]), v / (np.linalg.norm(v) + 1e-12)


def ibrik_alt_nokta(egim=0.0):
    """Kaide altı ortası, yerel (el) çerçevede (insan.sula_pozu(alt_el=...) için)."""
    Md = M_bilesik(M_donme(egim), _ib_D())
    q = Md @ np.array([_IB_BX, 53.6, 1.0])
    return (float(q[0]), float(q[1]))


IBRIK_ALT = ibrik_alt_nokta(0.0)


def _halka_cizgi(prof, cx, y, e=0.16, a0=0.06, a1=math.pi - 0.06, n=26, f=1.0):
    hw = float(_prof_hw(prof, y)) * f
    return _elips_noktalari(cx, y, hw, hw * e, a0, a1, n)


def _donel_bant(prof, cx, f0, f1, sgn, y0=None, y1=None, n=40):
    """Profilin bir yanında yarı genişliğin f0..f1 kesrini kaplayan bant (uçları kesik, silüetle kırpılır)."""
    ys0 = prof[0][0] if y0 is None else y0
    ys1 = prof[-1][0] if y1 is None else y1
    ys = np.linspace(ys0, ys1, n)
    hw = _prof_hw(prof, ys)
    a = cx + sgn * hw * f0
    b = cx + sgn * hw * f1
    pts = list(zip(a, ys)) + list(zip(b[::-1], ys[::-1]))
    return yol_cokgen(pts)


def _isik_yani(L):
    """Işığın yerel x bileşeninden SÜREKLİ ışıklı yan: -1 (sol) .. +1 (sağ). |L_x| >= 0.5'te tam yan; L_x ~ 0'da
    (ışık eksen boyunca, ör. eğik tutulmuş aynalı ibrik) 0 -> parıltı ortaya kayar, gölge iki kenara bölünür.
    Böylece ibrik dönerken / el oynarken ışık yanı bir karede öbür yana sıçramaz."""
    lx = float(L[0])
    return math.copysign(sstep(0.0, 0.5, abs(lx)), lx)


def _par_serit(prof, cx, yan, fm, fh, y0, y1, sivri=1.0, ince=False):
    """Işıklı yanda (yan: sürekli -1..1) yarı genişliğin fm ± fh kesrinde boş parıltı şeridi. ince=True: kenara yakın
    ince şerit, yan -> 0 iken genişliği sıfıra iner (ortadaki ana parıltıyla çakışmaz)."""
    if ince:
        fh = fh * abs(yan)
        if fh < 0.004:
            return None
    c = yan * fm
    return _profil_serit(prof, cx, c - fh, c + fh, y0, y1, 1.0, sivri=sivri)


def _donel_boya(t, M, prof, cx, L, C, yog=0.55, delikler=(), f_orta=0.10, f_koyu=0.56, yansima=0.12,
                alt_d=7.0, y_orta=0.44, y_koyu=0.30, tohum=0, govde=None):
    """Dönel cisim (gövde, kapak, kaide): ilk lavi (delikler boş) + gölge yanında yumuşak orta sır + dar koyu
    çekirdek gölge (uzak kenarda yansıma şeridi boş) + alt (ışıktan uzak) hilal.
    Gölge yanı sürekli ağırlıkla (``_isik_yani``) iki kenara paylaştırılır: yan=±1'de tek yanda tam gölge, ışık eksen
    boyunca gelirken iki kenar yarı yarıya koyulaşır; ara değerler kesintisiz geçer (sıçrama yok)."""
    yol = govde if govde is not None else yol_profil(cx, prof, 0.5)
    yan = _isik_yani(L)
    w_sag = 0.5 * (1.0 - yan)                           # sağ (x>cx) kenarın gölge ağırlığı
    w_sol = 0.5 * (1.0 + yan)
    _lv(t, _fark(yol, *delikler), M, C['acik'], yog, tohum=tohum)
    ys_p = np.array([q[0] for q in prof], np.float32)
    ws_p = np.array([q[1] for q in prof], np.float32)

    def xi(X, Y):
        hw = np.interp(Y.ravel(), ys_p, ws_p).reshape(Y.shape)
        return (X - cx) / np.maximum(hw, 0.5)

    def orta_fn(X, Y):
        x = xi(X, Y)
        return 1.15 * (w_sag * smoothstep(f_orta, f_orta + 0.5, x) + w_sol * smoothstep(f_orta, f_orta + 0.5, -x))
    _lv(t, yol, M, C['orta'], y_orta, yog_fn=orta_fn, tohum=tohum + 1)
    for j, (sg, w) in enumerate(((1.0, w_sag), (-1.0, w_sol))):
        if w < 0.02:
            continue
        b2 = yol_op(_donel_bant(prof, cx, f_koyu, 1.0 - yansima, sg), yol, 'kesisim')
        _lv(t, b2, M, C['koyu'], y_koyu * w, tohum=tohum + 2 + 7 * j)
    k_alt = sstep(0.05, 0.2, abs(float(L[1])))
    if alt_d > 0 and k_alt > 0.0:
        alt = yol_op(yol, _tasi(yol, 0, L[1] * alt_d), 'fark')
        _lv(t, alt, M, C['orta'], y_orta * 0.8 * k_alt,
            yog_fn=lambda X, Y: 0.35 + 0.65 * smoothstep(-0.6, 0.6, -yan * xi(X, Y)), tohum=tohum + 3)
    return yol


def ciz_ibrik(t: Tuval, M, egim=0.0, tohum=0, sakla_sonra=True, isik=ISIK):
    """Bakır ibrik (yerel çerçeve = el: köken kulp kavrama noktası, +x emziğe). egim derece (+ emzik aşağı).
    Döner: emzik ağzının EKRAN konumu. Ayrıntı: modül belgesi (1)."""
    kayit = None if sakla_sonra else _sakla_kayit(t)
    Md = M_bilesik(np.asarray(M, np.float64), M_donme(egim), _ib_D())
    L = _isik_yerel(Md, isik)
    yan = _isik_yani(L)                                  # ışıklı yan (sürekli -1..1)
    bx = _IB_BX
    C = BAKIR

    # ---- topuz -------------------------------------------------------------------------------------------------
    topuz = _birlesim(yol_daire(bx, -95.0, 4.3),
                      yol_egri([(bx - 1.5, -98.5), (bx, -105.0), (bx + 1.5, -98.5)], kapali=True, gerilim=0.4),
                      yol_egri([(bx - 2.0, -92), (bx - 2.6, -89.2), (bx + 2.6, -89.2), (bx + 2.0, -92)], kapali=True,
                               gerilim=0.3))
    _lv(t, _fark(topuz, yol_elips(bx + yan * 1.6, -96.4, 1.1, 1.5)), Md, C['acik'], 0.62, tohum=tohum + 1)
    _lv(t, _golge(topuz, L, 2.6), Md, C['orta'], 0.5, tohum=tohum + 2)
    _sakla(t, topuz, Md)

    # ---- kapak (soğan kubbe) -----------------------------------------------------------------------------------
    k_par = _par_serit(_IB_KAPAK[:-1], bx, yan, 0.44, 0.10, -86.5, -72.0, sivri=1.2)
    kapak = _donel_boya(t, Md, _IB_KAPAK, bx, L, C, yog=0.56, delikler=(k_par,), f_orta=0.05, f_koyu=0.50,
                        yansima=0.14, alt_d=0.0, tohum=tohum + 3)
    _sakla(t, kapak, Md)

    # ---- bilezik (ağız halkası, iki boncuk) ----------------------------------------------------------------
    b_par = _par_serit(_IB_BILEZIK[1:-1], bx, yan, 0.47, 0.11, -69.6, -64.4, sivri=0.8)
    bilezik = _donel_boya(t, Md, _IB_BILEZIK, bx, L, C, yog=0.58, delikler=(b_par,), f_orta=0.0, f_koyu=0.52,
                          yansima=0.12, alt_d=1.8, tohum=tohum + 6)
    _sakla(t, bilezik, Md)

    # ---- gövde (boyun + omuz + karın tek parça) -------------------------------------------------------------
    gp = _IB_GOVDE
    par1 = _par_serit(gp, bx, yan, 0.515, 0.085, -12, 31, sivri=1.15)
    par2 = _par_serit(gp, bx, yan, 0.50, 0.10, -57, -38)
    par3 = yol_elips(bx + yan * 0.47 * float(_prof_hw(gp, -19.0)), -19.0, 1.4, 2.4)
    par4 = _par_serit(gp, bx, yan, 0.775, 0.035, 2, 22, sivri=1.5, ince=True)
    govde = _donel_boya(t, Md, gp, bx, L, C, yog=0.56, delikler=(par1, par2, par3, par4), f_orta=0.12,
                        f_koyu=0.55, yansima=0.11, alt_d=9.0, tohum=tohum + 15)
    # bilezik altında boyun gölgesi
    _lv(t, yol_op(govde, yol_elips(bx, -61.0, 13.0, 3.6), 'kesisim'), Md, C['koyu'], 0.34, tohum=tohum + 18)
    # kazıma bantlar: omuz (iki çizgi + nokta dizisi), boyun halkası, karın bandı (iki çizgi + dalga)
    cizgiler = []
    for y in (-24.5, -16.0, 20.0, 26.0, -42.5):
        cizgiler.append(yol_egri(_halka_cizgi(gp, bx, y, e=0.17), kapali=False))
    t.lavi(cizgiler, Md, C['cizgi'], yog=0.40, cizgi=0.8, kenar=0.5, dalga=0.0, islak=0.0, gran=0.06, akis=0.1,
           tohum=tohum + 19)
    noktalar = []
    yb = -20.2
    hwb = float(_prof_hw(gp, yb))
    for j in range(15):
        a = 0.14 + (math.pi - 0.28) * j / 14
        x = bx + hwb * math.cos(a) * 0.94
        y = yb + hwb * 0.17 * math.sin(a)
        rr = 1.0 * (0.5 + 0.5 * math.sin(a))
        noktalar.append(yol_elips(x, y, rr * max(0.35, math.sin(a)), rr))
    t.lavi(noktalar, Md, C['cizgi'], yog=0.42, kenar=0.5, dalga=0.0, islak=0.2, gran=0.05, akis=0.1,
           tohum=tohum + 20)
    zz = []
    yz = 23.0
    hwz = float(_prof_hw(gp, yz))
    for j in range(36):
        a = 0.12 + (math.pi - 0.24) * j / 35
        r_ = 1.0 if j % 2 == 0 else -1.0
        zz.append((bx + hwz * math.cos(a) * 0.985, yz + 1.1 * r_ * max(0.3, math.sin(a)) + hwz * 0.17 * math.sin(a)))
    t.lavi(yol_cokgen(zz, kapali=False), Md, C['cizgi'], yog=0.34, cizgi=0.55, kenar=0.45, dalga=0.0, islak=0.0,
           gran=0.05, akis=0.0, tohum=tohum + 21)
    _sakla(t, govde, Md)

    # ---- emzik (gövdenin arkasından çıkar) -------------------------------------------------------------------
    om = _yumusat_omurga(_IB_EMZIK, 44)
    ws = np.interp(np.linspace(0, 1, len(om)), np.linspace(0, 1, len(_IB_EMZIK)), _IB_EMZIK_W)
    p_uc, d_uc = _ib_uc_tasarim()
    n_uc = np.array([-d_uc[1], d_uc[0]])
    dudak = yol_egri([tuple(p_uc - n_uc * 4.1 - d_uc * 2.2), tuple(p_uc - n_uc * 4.4 + d_uc * 0.6),
                      tuple(p_uc + n_uc * 4.4 + d_uc * 0.6), tuple(p_uc + n_uc * 4.1 - d_uc * 2.2)], kapali=True,
                     gerilim=0.25)
    emzik = _birlesim(yol_serit(om, ws), dudak)
    # süs bileziği (emziğin ilk üçte birinde)
    i_b = 15
    pb = om[i_b]
    tb = om[i_b + 1] - om[i_b - 1]
    tb = tb / np.linalg.norm(tb)
    nb = np.array([-tb[1], tb[0]])
    wb = ws[i_b] + 1.2
    sus = yol_egri([tuple(pb + nb * wb - tb * 1.5), tuple(pb + nb * (wb + 0.3)), tuple(pb + nb * wb + tb * 1.5),
                    tuple(pb - nb * wb + tb * 1.5), tuple(pb - nb * (wb + 0.3)), tuple(pb - nb * wb - tb * 1.5)],
                   kapali=True, gerilim=0.3)
    _lv(t, _fark(sus, _parlak_hilal(sus, L, 0.9)), Md, C['acik'], 0.55, tohum=tohum + 9)
    _lv(t, _golge(sus, L, 2.0), Md, C['orta'], 0.48, tohum=tohum + 10)
    _sakla(t, sus, Md)
    e_par = _boru_isik(om[6:-3], ws[6:-3], L, f=0.40, gen=0.24)
    _lv(t, _fark(emzik, e_par), Md, C['acik'], 0.56, tohum=tohum + 11)
    _lv(t, _golge(emzik, L, 4.8, 0.9), Md, C['orta'], 0.46, tohum=tohum + 12)
    _lv(t, _golge(emzik, L, 2.1, 0.7), Md, C['koyu'], 0.26, tohum=tohum + 13)
    # ağız içi
    _lv(t, yol_elips(*(p_uc + d_uc * 0.1), 3.5, 1.25, math.degrees(math.atan2(n_uc[1], n_uc[0]))), Md, C['vurgu'],
        0.45, kenar=0.5, islak=0.4, tohum=tohum + 14)
    _sakla(t, emzik, Md)

    # ---- kaide ---------------------------------------------------------------------------------------------
    kd_par = _par_serit(_IB_KAIDE[:-1], bx, yan, 0.48, 0.12, 46.5, 52.8, sivri=0.8)
    kaide = _donel_boya(t, Md, _IB_KAIDE, bx, L, C, yog=0.56, delikler=(kd_par,), f_orta=0.05, f_koyu=0.52,
                        yansima=0.10, alt_d=2.0, tohum=tohum + 22)
    _lv(t, yol_op(kaide, yol_dikdortgen(bx - 22, 39, bx + 22, 44.8), 'kesisim'), Md, C['koyu'], 0.38,
        tohum=tohum + 24)
    _sakla(t, kaide, Md)

    # ---- kulp (arkada; uçları gövdenin altından geçer) -------------------------------------------------------
    k_om = _yumusat_omurga(_IB_KULP, 44)
    k_ws = np.interp(np.linspace(0, 1, len(k_om)), np.linspace(0, 1, len(_IB_KULP)), _IB_KULP_W)
    kulp = yol_serit(k_om, k_ws)
    dayanak = yol_egri([(27.5, -73.0), (29.0, -79.0), (32.5, -81.8), (35.5, -79.6), (35.0, -73.5)], kapali=True,
                       gerilim=0.5)
    kivrim = yol_egri([(22.0, 13.0), (18.6, 18.6), (20.4, 23.6), (24.8, 23.8), (26.0, 19.8), (24.0, 16.4)],
                      kapali=True, gerilim=0.5)
    kulp_hep = _birlesim(kulp, dayanak, kivrim)
    k_par = _boru_isik(k_om[4:-5], k_ws[4:-5], L, f=0.38, gen=0.24)
    _lv(t, _fark(kulp_hep, k_par), Md, C['acik'], 0.56, tohum=tohum + 25)
    _lv(t, _golge(kulp_hep, L, 4.6, 0.8), Md, C['orta'], 0.46, tohum=tohum + 26)
    _lv(t, _golge(kulp_hep, L, 2.0, 0.6), Md, C['koyu'], 0.25, tohum=tohum + 27)
    _sakla(t, kulp_hep, Md)

    if not sakla_sonra:
        _sakla_geri(t, kayit)
    uc = Md @ np.array([p_uc[0], p_uc[1], 1.0])
    return np.array([uc[0], uc[1]])


def _yumusat_omurga(pts, n):
    """Noktalardan geçen Catmull-Rom omurgayı n noktayla örnekle."""
    pts = np.asarray(pts, np.float64)
    m = len(pts)
    out = []
    for i in range(m - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < m else p2
        k = max(2, int(round(n / (m - 1))))
        for j in range(k):
            u = j / k
            u2, u3 = u * u, u * u * u
            q = 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
            out.append(q)
    out.append(pts[-1])
    return np.array(out)


# ================================================================================================================
# 2) SU AKIŞI
# ================================================================================================================
def _frac(x):
    return x - math.floor(x)


def ciz_su_akisi(t: Tuval, M, p_bas, p_son, zaman, debi=1.0, tohum=0, yon=None, kalinlik=None, cephe=1.0,
                 kuyruk=0.0, sicrama=1.0, isik=ISIK, sakla_guc=0.3, renk_=SU):
    """Emzikten hedefe parabolik su akışı (p_bas, p_son: M yerel). debi 0..1, cephe/kuyruk 0..1 dökme başı/sonu.
    Döner: dict(egri, hedef) EKRAN ya da None. Ayrıntı: modül belgesi (2)."""
    debi = float(np.clip(debi, 0.0, 1.0))
    if debi <= 0.004 or cephe <= kuyruk + 1e-4:
        return None
    M = np.asarray(M, np.float64)
    rng = np.random.default_rng(tohum)
    p0 = np.asarray(p_bas, np.float64)
    p1 = np.asarray(p_son, np.float64)
    g = _asagi_yerel(M)
    nrm = np.array([-g[1], g[0]])
    D = float(np.linalg.norm(p1 - p0)) + 1e-9
    if yon is None:
        dd = (p1 - p0) - g * float((p1 - p0) @ g)
        d = dd / (np.linalg.norm(dd) + 1e-9) if np.linalg.norm(dd) > 1e-6 else g.copy()
    else:
        d = np.asarray(yon, np.float64)
        d = d / (np.linalg.norm(d) + 1e-12)
    nd = float(nrm @ d)
    c = 0.5 * (p0 + p1)
    if abs(nd) > 1e-3:
        lam = float(nrm @ (p1 - p0)) / (2 * nd)
        if lam > 0:
            c = p0 + lam * d
    N = 64
    s = np.linspace(0, 1, N)[:, None]
    B = (1 - s) ** 2 * p0 + 2 * s * (1 - s) * c + s ** 2 * p1
    seg = np.linalg.norm(np.diff(B, axis=0), axis=1)
    yay = np.concatenate([[0], np.cumsum(seg)])
    Lt = yay[-1] + 1e-9
    u = yay / Lt
    tan = np.gradient(B, axis=0)
    tan /= (np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9)
    nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
    L = _isik_yerel(M, isik)

    # Akış deseni (şişkinlik, ışık çizgileri, damlalar) yalnız w_ref ölçeğinde tanımlıdır: hız, dalga boyu ve aralıklar
    # w_ref ile orantılı, böylece desenin fazı (dalga boyu cinsinden) zaman * sabit olur. Emzik oynayıp yol uzunluğu
    # (Lt) her kare değişse de, kamera yaklaşsa da (kalinlik değişir) desen sıçramaz, geri akmaz; debi değişimi de
    # yalnız genişliği etkiler.
    w_ref = (0.5 * kalinlik) if kalinlik is not None else float(np.clip(0.012 * D, 1.4, 8.0))
    w0 = w_ref * (0.42 + 0.58 * debi)
    lam_d = w_ref * 10.4                    # şişkinlik dalga boyu
    hiz = 90.0 * w_ref                      # yerel birim / sn (adam ölçeğinde ~290 ≈ 0.85 m/sn)
    # (30 fps'de kare başına desen kayması aralığın ~0.3'ü: akış yönü okunur, tekerlek yanılsaması olmaz)
    ph = (yay - zaman * hiz) / lam_d
    puls = 1.0 + (0.15 * np.sin(2 * math.pi * ph) + 0.07 * np.sin(2 * math.pi * ph * 2.3 + 1.3)) * \
        smoothstep(0.0, 0.25, u)
    ws = w0 * (1.0 - 0.30 * u) * puls
    # baş ucu (cephe) yuvarlak ve biraz şişkin; kuyruk incelir
    ws = ws * np.clip((cephe - u) / 0.03 + 0.25, 0, 1) ** 0.5 * (1 + 0.25 * np.exp(-((u - cephe + 0.02) / 0.03) ** 2))
    ws = ws * np.clip((u - kuyruk) / 0.05, 0, 1) ** 0.6
    # az debide alt kısım damlalara bölünür
    kopma = 1.0 if debi >= 0.62 else 0.30 + 0.70 * debi / 0.62
    gor = (u >= kuyruk) & (u <= min(cephe, kopma))
    yollar = []
    idx = np.nonzero(gor)[0]
    if len(idx) >= 3:
        yollar.append(yol_serit(B[idx], np.maximum(ws[idx], 0.05)))
    # kopan kısımda damlalar
    damlalar = []
    u_on = min(cephe, 1.0)
    if kopma < u_on:
        # damlalar yol boyunca sabit bir kafeste akar (kafes Lt'den bağımsız; kimlik = kafes indisi - geçen tur)
        aralik = w_ref * 9.0
        f_d = zaman * hiz / aralik
        n_tur = math.floor(f_d)
        a0 = kopma * Lt
        k_say = int((u_on - kopma) * Lt / aralik) + 2
        for kk in range(k_say):
            a = a0 + aralik * (kk + (f_d - n_tur))
            if a > u_on * Lt:
                break
            kim = kk - n_tur
            uu = a / Lt
            if uu < kuyruk:                 # dökme biterken kuyruğun gerisinde damla kalmaz
                continue
            q = np.array([np.interp(uu, u, B[:, 0]), np.interp(uu, u, B[:, 1])])
            tq = np.array([np.interp(uu, u, tan[:, 0]), np.interp(uu, u, tan[:, 1])])
            # kopma noktasında, kuyrukta ve ön uçta damla boyca doğar/söner (sıçrama yok)
            gir = smoothstep(0.0, aralik * 0.8, a - a0) * (1.0 - smoothstep(u_on * Lt - aralik * 0.5, u_on * Lt, a))
            gir_k = smoothstep(kuyruk * Lt, kuyruk * Lt + aralik * 0.8, a) if kuyruk > 0 else 1.0
            if gir_k < 0.05:
                continue
            r_ = w0 * (0.75 + 0.25 * math.sin(kim * 2.1)) * (1 - 0.3 * uu) * (0.35 + 0.65 * gir) * gir_k
            damlalar.append(_damla_yolu(q, tq, r_, 1.9))
    # yanlara kopan küçük damlacıklar (akışla birlikte). Bütün rastgele değerler önceden çekilir: bir damlacığın
    # görünüp görünmemesi ötekilerin değerlerini kaydırmaz; debi azaldıkça sondakiler boyca küçülerek kaybolur.
    yan_r = rng.random((4, 4))
    for j in range(4):
        gor_j = float(np.clip(1.0 + 3.0 * debi - j, 0.0, 1.0))
        if gor_j <= 0.02:
            continue
        f = 0.9 + 0.5 * yan_r[j, 0]
        faz = yan_r[j, 1]
        yan = -1.0 if yan_r[j, 2] < 0.5 else 1.0
        uu = 0.3 + 0.68 * _frac(zaman * f * 1.04 + faz)
        boy_k = smoothstep(0.30, 0.40, uu) * (1.0 - smoothstep(0.93, 0.98, uu))
        boy_k *= smoothstep(kuyruk + 0.08, kuyruk + 0.16, uu) * (1.0 - smoothstep(cephe - 0.06, cephe, uu))
        if boy_k < 0.05:
            continue
        q = np.array([np.interp(uu, u, B[:, 0]), np.interp(uu, u, B[:, 1])])
        tq = np.array([np.interp(uu, u, tan[:, 0]), np.interp(uu, u, tan[:, 1])])
        nq = np.array([-tq[1], tq[0]])
        off = w0 * (1.4 + 2.6 * (uu - 0.3)) * yan
        r_ = w0 * (0.33 + 0.18 * yan_r[j, 3]) * debi ** 0.5 * boy_k * gor_j
        damlalar.append(_damla_yolu(q + nq * off, tq, r_, 1.6))
    hepsi = yollar + damlalar
    if not hepsi:
        return None
    # ışık çizgileri (boş kâğıt): akışla aşağı kayan ince kapsüller
    parlak = []
    if len(idx) >= 3:
        # ışık çizgileri yay uzunluğunda sabit bir kafeste akar (Lt'den bağımsız; kimlik = kafes indisi - geçen tur)
        aralik = w_ref * 11.0
        f_p = zaman * hiz / aralik
        n_tur = math.floor(f_p)
        u_bas, u_son = max(kuyruk, 0.0) + 0.03, min(cephe, kopma) - 0.03
        for kk in range(int(Lt / aralik) + 2):
            a = aralik * (kk + (f_p - n_tur))
            uu = a / Lt
            if uu > u_son:
                break
            if uu < u_bas:
                continue
            j = kk - n_tur
            solma = smoothstep(u_bas, u_bas + 0.08, uu) * (1.0 - smoothstep(u_son - 0.08, u_son, uu))
            if solma < 0.05:
                continue
            boy = w0 * (2.0 + 1.4 * math.sin(j * 1.7 + 0.5) ** 2) * (0.4 + 0.6 * solma)
            ua, ub = uu, min(1.0, uu + boy / Lt)
            ss_ = np.linspace(ua, ub, 6)
            qq = np.stack([np.interp(ss_, u, B[:, 0]), np.interp(ss_, u, B[:, 1])], 1)
            nn = np.stack([np.interp(ss_, u, nor[:, 0]), np.interp(ss_, u, nor[:, 1])], 1)
            wq = np.interp(ss_, u, ws)
            # ışığa bakan yana kayık (sürekli: akış ışığa paralel döndüğü yerde çizgi ortadan geçer, yan değiştirmez)
            yan_p = float(np.clip((np.mean(nn, 0) @ L) / 0.3, -1.0, 1.0))
            merkez = qq + nn * (yan_p * wq * 0.32)[:, None]
            parlak.append(yol_serit(merkez, wq * 0.22 * solma * np.sin(np.linspace(0.15, math.pi - 0.15, 6)) ** 0.7
                                    + 0.02))
    k = yollar_kirp(hepsi, M, 10)
    if k.bos():
        return None
    m = maske_ciz(hepsi, M, k)
    gp = maske_ciz(parlak, M, k) if parlak else None
    m2 = m if gp is None else m * (1.0 - 0.92 * np.clip(gp * 1.3, 0, 1))
    w_px = w0 * _olcek(M)
    t.lavi([], M, renk_, yog=0.47, maske=(k, m2), kenar=0.6, dalga=0.03, islak=1.5,
           islak_gen=float(np.clip(w_px * 0.55, 0.8, 2.4)), gran=0.05, akis=0.25, tohum=tohum)
    if sakla_guc > 0:
        sm = m * sakla_guc
        if gp is not None:
            sm = np.maximum(sm, np.clip(gp * 1.3, 0, 1) * min(1.0, sakla_guc * 2.2))
        t.sakla_ekle([], M, yumusak=0.0, maske=(k, sm.astype(np.float32)))
    # ---- hedefte sıçrama ---------------------------------------------------------------------------------
    sic = sicrama * smoothstep(0.97, 1.0, cephe) * (1.0 - smoothstep(0.0, 0.25, kuyruk)) * min(1.0, 0.4 + debi)
    if sic > 0.01:
        _sicrama(t, M, p1, g, w0, zaman, sic, debi, tohum, renk_)
    egri = [nokta_donustur(M, *q) for q in B[gor]] if gor.any() else []
    return dict(egri=egri, hedef=nokta_donustur(M, *p1))


def _damla_yolu(q, tq, r, uzama=1.8):
    """Hareket yönünde uzamış damla: kuyruk tq'nun tersinde."""
    tq = np.asarray(tq, np.float64)
    tq = tq / (np.linalg.norm(tq) + 1e-9)
    nq = np.array([-tq[1], tq[0]])
    pts = []
    for a in np.linspace(0, 2 * math.pi, 16, endpoint=False):
        ca, sa = math.cos(a), math.sin(a)
        rr = r * (1.0 if ca > 0 else 1.0)
        along = ca * r if ca > 0 else ca * r * uzama
        wid = sa * rr * (1.0 if ca > 0 else (1 + ca * 0.55))
        pts.append(tuple(q + tq * along + nq * wid))
    return yol_egri(pts, kapali=True, gerilim=0.5)


def _sicrama(t, M, p1, g, w0, zaman, guc, debi, tohum, renk_):
    rng = np.random.default_rng(tohum + 77)
    yukari = -g
    yan = np.array([-g[1], g[0]])
    # yassı birikinti ve genişleyen halkalar
    rx = w0 * 3.6
    hav = yol_elips(p1[0], p1[1] + w0 * 0.2, rx, rx * 0.26)
    _lv(t, hav, M, renk_, 0.22 * guc, islak=1.2, akis=0.2, tohum=tohum + 3)
    for j in range(2):
        f = _frac(zaman * 1.15 + j * 0.5)
        rr = rx * (0.7 + 1.6 * f)
        a = smoothstep(0.0, 0.15, f) * (1 - f) ** 1.5 * guc
        if a < 0.03:
            continue
        pts = _elips_noktalari(p1[0], p1[1] + w0 * 0.2, rr, rr * 0.26, 0, 2 * math.pi, 40)
        t.lavi(yol_egri(pts, kapali=True), M, renk_, yog=0.38 * a, cizgi=max(0.35, w0 * 0.32), kenar=0.6,
               dalga=0.03, islak=0.0, gran=0.04, akis=0.1, sakla=True)
    # taç: kısa yukarı sıçrayan uçlar
    ta = []
    for j in range(5):
        f = _frac(zaman * 3.1 + j * 0.37)
        h = w0 * (1.6 + 1.6 * math.sin(math.pi * f)) * guc
        xo = (j - 2) * w0 * 0.85
        base = p1 + yan * xo
        tip = base + yukari * h + yan * xo * 0.45
        ta.append(_firca(tuple(base), tuple(tip), w0 * 0.42, profil=(1.0, 0.8, 0.35), n=6))
    _lv(t, ta, M, renk_, 0.34 * guc, islak=1.0, tohum=tohum + 5)
    # sıçrayan damlacıklar (parabol)
    # (rastgele değerler önceden çekilir: atlanan damlacık ötekileri kaydırmaz; debiyle sondakiler küçülüp kaybolur)
    dam = []
    rr_ = rng.random((9, 5))
    for j in range(9):
        gor_j = float(np.clip(4.0 + 5.0 * debi - j, 0.0, 1.0))
        if gor_j <= 0.02:
            continue
        per = 0.38 + 0.25 * rr_[j, 0]
        faz = rr_[j, 1]
        ang = -1.1 + 2.2 * rr_[j, 2]
        v = w0 * (9 + 7 * rr_[j, 3]) / per
        tau = _frac(zaman / per + faz)
        tt = tau * per
        vx, vy = math.sin(ang) * v, math.cos(ang) * v
        gg = 2 * vy / per          # yere dönsün
        q = p1 + yan * (vx * tt) + yukari * (vy * tt - 0.5 * gg * tt * tt)
        boy_t = smoothstep(0.0, 0.08, tau) * (1.0 - smoothstep(0.90, 0.98, tau))
        if boy_t < 0.05:
            continue
        vel = yan * vx + yukari * (vy - gg * tt)
        r_ = w0 * (0.42 + 0.22 * rr_[j, 4]) * (1 - 0.35 * tau) * boy_t * gor_j
        dam.append(_damla_yolu(q, vel, r_, 1.5))
    _lv(t, dam, M, renk_, 0.42 * guc, islak=1.2, tohum=tohum + 7)


# ================================================================================================================
# 3) MEYVE TABAĞI
# ================================================================================================================
def _renk_gecis(L, cx, cy, r, c_isik, c_golge, us=1.0):
    a, b = renk(c_isik), renk(c_golge)

    def f(X, Y):
        d = ((X - cx) * (-L[0]) + (Y - cy) * (-L[1])) / max(r, 1e-6)
        k = np.clip(0.5 + 0.5 * d * us, 0, 1)[..., None]
        return a + (b - a) * k
    return f


def _yumusak_isik(cx, cy, rx, ry, aci=0.0, guc=0.8, sert=1.6):
    """yog_fn: eşiksiz, yumuşak açık leke (ıslakken kâğıtla kaldırılmış gibi) — sert kenarlı delik değil."""
    ca, sa = math.cos(math.radians(aci)), math.sin(math.radians(aci))

    def f(X, Y):
        dx, dy = X - cx, Y - cy
        u = (ca * dx + sa * dy) / max(rx, 1e-3)
        v = (-sa * dx + ca * dy) / max(ry, 1e-3)
        return 1.0 - guc * np.exp(-(u * u + v * v) * sert)
    return f


def _kure(t, M, yol, cx, cy, r, L, c_isik, c_golge, c_sir, yog=0.55, sir=0.38, d_sir=0.42, parlak=None,
          tohum=0, sir2=None, d_sir2=0.18, e=0.0, yumusak_par=0.75):
    """Yuvarlak meyve: iki pigmentli ilk lavi (ışık->gölge), hilal gölge sırrı, ışık yanında yumuşak açık leke
    ve küçük boş bırakılmış parıltı."""
    taban = _fark(yol, parlak) if parlak is not None else yol
    yf = None
    if yumusak_par > 0:
        yf = _yumusak_isik(cx + L[0] * r * 0.42, cy + L[1] * r * 0.42, r * 0.42, r * 0.30,
                           math.degrees(math.atan2(L[1], L[0])) + 90, guc=yumusak_par)
    _lv(t, taban, M, c_isik, yog, renk_fn=_renk_gecis(L, cx, cy, r, c_isik, c_golge), yog_fn=yf, tohum=tohum)
    _lv(t, _golge(yol, L, d_sir * r, e), M, c_sir, sir, tohum=tohum + 1)
    if sir2 is not None:
        _lv(t, _golge(yol, L, d_sir2 * r, e * 0.8), M, sir2[0], sir2[1], tohum=tohum + 2)


def _parlak_leke(cx, cy, r, L, f=0.5, a=0.30, b=0.16, aci=None):
    """Işıklı yanda küçük eğik elips parıltı."""
    px, py = cx + L[0] * r * f, cy + L[1] * r * f
    ang = math.degrees(math.atan2(L[1], L[0])) + 90 if aci is None else aci
    return yol_elips(px, py, r * a, r * b, ang)


def _nar_tac(cx, cy, r, aci_deg, n=6, tohum=0):
    """Nar tacı: kısa boyun + sivri çanak yaprakları (yukarı -y)."""
    rng = np.random.default_rng(tohum)
    a = math.radians(aci_deg)
    ux, uy = math.sin(a), -math.cos(a)   # taç yönü
    nx, ny = -uy, ux
    taban = (cx + ux * r * 0.80, cy + uy * r * 0.80)
    boy = r * 0.30
    gen = r * 0.20
    pts = [(taban[0] - nx * gen * 1.05, taban[1] - ny * gen * 1.05)]
    for j in range(n + 1):
        f = j / n
        off = (f - 0.5) * 2
        # sivri uç
        tx = taban[0] + ux * boy * (1.0 + 0.12 * rng.uniform(-1, 1)) + nx * gen * off * 1.5
        ty = taban[1] + uy * boy * (1.0 + 0.12 * rng.uniform(-1, 1)) + ny * gen * off * 1.5
        pts.append((tx, ty))
        if j < n:
            f2 = (j + 0.5) / n
            off2 = (f2 - 0.5) * 2
            vx = taban[0] + ux * boy * 0.62 + nx * gen * off2 * 1.15
            vy = taban[1] + uy * boy * 0.62 + ny * gen * off2 * 1.15
            pts.append((vx, vy))
    pts.append((taban[0] + nx * gen * 1.05, taban[1] + ny * gen * 1.05))
    pts.append((taban[0] - ux * r * 0.06 + nx * gen * 0.8, taban[1] - uy * r * 0.06 + ny * gen * 0.8))
    pts.append((taban[0] - ux * r * 0.06 - nx * gen * 0.8, taban[1] - uy * r * 0.06 - ny * gen * 0.8))
    return yol_egri(pts, kapali=True, gerilim=0.15), (ux, uy), taban


def _nar_butun(t, M, cx, cy, r, L, tohum=0, aci=-8.0):
    tac, (ux, uy), taban = _nar_tac(cx, cy, r, aci, tohum=tohum)
    _lv(t, tac, M, '#C65A5C', 0.60, tohum=tohum + 1)
    _lv(t, _golge(tac, L, r * 0.10), M, '#8A3442', 0.45, tohum=tohum + 2)
    # tacın içi (koyu ağız)
    _lv(t, yol_op(yol_elips(taban[0] + ux * r * 0.31, taban[1] + uy * r * 0.31, r * 0.12, r * 0.04,
                            math.degrees(math.atan2(uy, ux)) + 90), tac, 'kesisim'), M, '#8A2F3A', 0.5,
        tohum=tohum + 3)
    _sakla(t, tac, M)
    govde = damla_blob(cx, cy, r, tohum=tohum, duzensizlik=0.025, lob=5, rx=r, ry=r * 0.95)
    par = _parlak_leke(cx, cy, r, L, f=0.62, a=0.13, b=0.06)
    par2 = yol_daire(cx + L[0] * r * 0.40 - L[1] * r * 0.30, cy + L[1] * r * 0.40 + L[0] * r * 0.30, r * 0.03)
    _kure(t, M, govde, cx, cy, r, L, '#EE8B78', '#C23446', '#A62C3E', yog=0.64, sir=0.36, d_sir=0.50,
          parlak=_birlesim(par, par2), tohum=tohum + 4, sir2=('#86233A', 0.26), d_sir2=0.20, e=r * 0.05,
          yumusak_par=0.55)
    # tacın altında gölge
    _lv(t, yol_op(govde, yol_elips(taban[0] + ux * r * 0.02, taban[1] + uy * r * 0.02, r * 0.33, r * 0.12,
                                   math.degrees(math.atan2(uy, ux)) + 90), 'kesisim'), M, '#A7303F', 0.30,
        tohum=tohum + 7)
    _sakla(t, govde, M)


def _nar_yarim(t, M, cx, cy, r, L, tohum=0):
    rng = np.random.default_rng(tohum)
    aci = -14.0
    frx, fry = r * 0.93, r * 0.66
    fcx, fcy = cx, cy - r * 0.16
    # taneler (önde)
    ca, sa = math.cos(math.radians(aci)), math.sin(math.radians(aci))

    def ez(u, v):  # birim diskten yüz elipsine
        x, y = u * frx * 0.86, v * fry * 0.86
        return fcx + ca * x - sa * y, fcy + sa * x + ca * y
    oda = 6
    oda_faz = rng.uniform(0, 2 * math.pi)
    taneler = []
    tries = 0
    pts = []
    rt = 0.128
    while len(pts) < 64 and tries < 6000:
        tries += 1
        u, v = rng.uniform(-1, 1, 2)
        rr = math.hypot(u, v)
        if rr > 0.98 or rr < 0.15:
            continue
        a = math.atan2(v, u) - oda_faz
        sek = (a % (2 * math.pi / oda)) / (2 * math.pi / oda)
        if min(sek, 1 - sek) * 2 * math.pi / oda * rr < 0.040:
            continue
        if any((u - p[0]) ** 2 + (v - p[1]) ** 2 < (rt * 1.40) ** 2 for p in pts):
            continue
        pts.append((u, v))
    renkler = ['#C92D47', '#D63F55', '#B8243E', '#DA4B5E', '#C3344B']
    for j, (u, v) in enumerate(pts):
        x, y = ez(u, v)
        a = math.degrees(math.atan2(y - fcy, x - fcx))
        s_ = rt * frx * 0.86 * rng.uniform(0.9, 1.08)
        tane = damla_blob(x, y, s_, tohum=tohum * 7 + j, duzensizlik=0.07, lob=5, rx=s_ * 1.06,
                          ry=s_ * 0.88 * (fry / frx) ** 0.35)
        tane = yol_donustur(tane, M_bilesik(M_oteleme(x, y), M_donme(a), M_oteleme(-x, -y)))
        p_ = yol_elips(x + L[0] * s_ * 0.38, y + L[1] * s_ * 0.38, s_ * 0.30, s_ * 0.20, a)
        taneler.append((tane, p_, renkler[j % len(renkler)], x, y, s_))
    for j, (tane, p_, c_, x, y, s_) in enumerate(taneler):
        _lv(t, _fark(tane, p_), M, c_, 0.60, islak=1.3, akis=0.22, tohum=tohum * 11 + j)
        _lv(t, _golge(tane, L, s_ * 0.55), M, '#8E1E36', 0.30, tohum=tohum * 13 + j)
    _sakla(t, [q[0] for q in taneler], M, yumusak=0.5)
    # yüzün kabuk zarı (iç) ve pembe-krem zarlar
    zar = yol_elips(fcx, fcy, frx * 0.90, fry * 0.90, aci)
    _lv(t, zar, M, '#F3D7C2', 0.50, islak=0.9, tohum=tohum + 2)
    _lv(t, _golge(zar, L, frx * 0.35), M, '#E9B7A4', 0.30, tohum=tohum + 3)
    # ince zar çizgileri (odalar arası)
    cz = []
    for j in range(oda):
        a = oda_faz + j * 2 * math.pi / oda
        x0, y0 = ez(math.cos(a) * 0.18, math.sin(a) * 0.18)
        x1, y1 = ez(math.cos(a) * 0.97, math.sin(a) * 0.97)
        cz.append(_firca((x0, y0), (x1, y1), r * 0.018, profil=(0.6, 1.0, 0.5)))
    _lv(t, cz, M, '#E8C3A7', 0.40, tohum=tohum + 4)
    _sakla(t, zar, M)
    # yüz kenarındaki beyaz kabuk halkası (kâğıt) + kabuk dış
    kabuk_ust = yol_elips(fcx, fcy, frx, fry, aci)
    halka = yol_op(kabuk_ust, zar, 'fark')
    _lv(t, halka, M, '#F6E6D6', 0.35, islak=0.8, tohum=tohum + 5)
    _sakla(t, kabuk_ust, M)
    # dış kabuk: yüzün altındaki yarım küre
    govde = yol_op(damla_blob(cx, cy + r * 0.05, r, tohum=tohum + 1, duzensizlik=0.02, lob=5, rx=r * 0.98, ry=r * 0.9),
                   yol_dikdortgen(cx - r * 2, cy - r * 2, cx + r * 2, cy + r * 2), 'kesisim')
    par = _parlak_leke(cx, cy + r * 0.35, r, L, f=0.66, a=0.11, b=0.05)
    _kure(t, M, govde, cx, cy + r * 0.2, r, L, '#EE8B78', '#C23446', '#A62C3E', yog=0.64, sir=0.38, d_sir=0.42,
          parlak=par, tohum=tohum + 6, sir2=('#86233A', 0.24), d_sir2=0.16, e=r * 0.05, yumusak_par=0.45)
    _sakla(t, govde, M)


def _uzum_salkimi(t, M, x, y, olc, L, tohum=0, c1='#9A7BB2', c2='#6B4F8E', aci=12.0):
    rng = np.random.default_rng(tohum)
    rg = 9.4 * olc
    satir = [3, 4, 4, 3, 3, 2, 1]
    tanes = []
    yy = 0.0
    for i, n in enumerate(satir):
        for j in range(n):
            xx = (j - (n - 1) / 2) * rg * 1.62 + rng.uniform(-1.5, 1.5) * olc + (i % 2) * rg * 0.15
            zz = rng.uniform(0, 1) + (0.35 if abs(j - (n - 1) / 2) < 0.6 else 0) + i * 0.06
            r_ = rg * rng.uniform(0.9, 1.1)
            tanes.append([xx, yy + rng.uniform(-1.5, 1.5) * olc, r_, zz])
        yy += rg * 1.42
    ca, sa = math.cos(math.radians(aci)), math.sin(math.radians(aci))
    for q in tanes:
        q[0], q[1] = x + ca * q[0] - sa * q[1], y + sa * q[0] + ca * q[1]
    tanes.sort(key=lambda q: -q[3])   # önden arkaya
    # sap
    sap = yol_serit(np.array([(x + 2 * olc, y - 6 * olc), (x - 3 * olc, y - 16 * olc), (x - 1 * olc, y - 26 * olc),
                              (x + 5 * olc, y - 31 * olc)]), np.array([2.2, 1.9, 1.6, 1.3]) * olc)
    hep = []
    for j, (xx, yy_, r_, zz) in enumerate(tanes):
        top = yol_daire(xx, yy_, r_)
        par = yol_elips(xx + L[0] * r_ * 0.42, yy_ + L[1] * r_ * 0.42, r_ * 0.24, r_ * 0.15,
                        math.degrees(math.atan2(L[1], L[0])) + 90)
        ton = rng.uniform(0, 1)
        ci = karistir(c1, '#A884B0', ton * 0.6)
        _lv(t, _fark(top, par), M, ci, 0.52, renk_fn=_renk_gecis(L, xx, yy_, r_, ci, karistir(c1, c2, 0.6)),
            tohum=tohum * 17 + j)
        _lv(t, _golge(top, L, r_ * 0.55, r_ * 0.10), M, c2, 0.40, tohum=tohum * 19 + j)
        _sakla(t, top, M, yumusak=0.6)
        hep.append(top)
    _lv(t, sap, M, '#7E7A55', 0.6, tohum=tohum + 3)
    # kıvrık sülük
    # (dolu ince şerit: saklamaya yazılabilir, arkadaki nar onun üstüne boyanmaz)
    sul_om = _yumusat_omurga([(x + 5 * olc, y - 25 * olc), (x + 13 * olc, y - 27 * olc), (x + 16 * olc, y - 21 * olc),
                              (x + 12 * olc, y - 18 * olc), (x + 10 * olc, y - 22 * olc)], 24)
    sul = yol_serit(sul_om, np.linspace(0.75, 0.35, len(sul_om)) * olc)
    _lv(t, sul, M, '#8B8A5E', 0.5, islak=0.0, tohum=tohum + 4)
    _sakla(t, [sap, sul], M, yumusak=0.5)
    return hep


def _incir_yolu(cx, cy, s, aci):
    pts = []
    for a in np.linspace(0, 2 * math.pi, 28, endpoint=False):
        # alt yuvarlak, üst sivrilen boyun (yukarı -y)
        x = math.sin(a)
        y = -math.cos(a)
        ust = y < 0
        w = s * (1.0 if not ust else (1.0 - 0.62 * (-y) ** 1.6))
        h = s * (1.0 if not ust else 1.38)
        pts.append((x * w, y * h))
    ca, sa = math.cos(math.radians(aci)), math.sin(math.radians(aci))
    pts = [(cx + ca * x - sa * y, cy + sa * x + ca * y) for x, y in pts]
    return yol_egri(pts, kapali=True, gerilim=0.5)


def _incir(t, M, cx, cy, s, aci, L, tohum=0, yarim=False):
    ca, sa = math.cos(math.radians(aci)), math.sin(math.radians(aci))
    ux, uy = sa, -ca     # yukarı (boyun) yönü
    tip = (cx + ux * s * 1.38, cy + uy * s * 1.38)
    sap = _firca((tip[0] - ux * s * 0.1, tip[1] - uy * s * 0.1), (tip[0] + ux * s * 0.28 + ca * s * 0.06,
                                                              tip[1] + uy * s * 0.28 + sa * s * 0.06),
                 s * 0.10, profil=(1.0, 0.9, 0.7))
    _lv(t, sap, M, '#857A50', 0.6, tohum=tohum + 1)
    _sakla(t, sap, M)
    govde = _incir_yolu(cx, cy, s, aci)
    if not yarim:
        par = yol_elips(cx + L[0] * s * 0.62, cy + L[1] * s * 0.55, s * 0.10, s * 0.045,
                        math.degrees(math.atan2(L[1], L[0])) + 90)
        yfi = _yumusak_isik(cx + L[0] * s * 0.40, cy + L[1] * s * 0.40, s * 0.45, s * 0.30,
                            math.degrees(math.atan2(L[1], L[0])) + 90, guc=0.6)

        def rf(X, Y):
            # boyuna doğru adaçayı-zeytin, gövde mor
            a = renk('#A58AA0')
            b = renk('#9AA27B')
            k = np.clip(((X - cx) * ux + (Y - cy) * uy) / s * 0.9 - 0.15, 0, 1)[..., None]
            return a + (b - a) * k
        _lv(t, _fark(govde, par), M, '#A58AA0', 0.58, renk_fn=rf, yog_fn=yfi, tohum=tohum + 2)
        _lv(t, _golge(govde, L, s * 0.55, s * 0.06), M, '#6E4565', 0.40, tohum=tohum + 3)
        _lv(t, _golge(govde, L, s * 0.22, s * 0.05), M, '#57344F', 0.25, tohum=tohum + 4)
        _sakla(t, govde, M)
        return govde
    # yarım incir: kesik yüz bize bakar
    ic = _incir_yolu(cx, cy + s * 0.04, s * 0.84, aci)
    et = _incir_yolu(cx, cy + s * 0.10, s * 0.60, aci)
    # tohumlar
    rng = np.random.default_rng(tohum)
    tohumlar = []
    for j in range(16):
        a = rng.uniform(0, 2 * math.pi)
        rr = math.sqrt(rng.uniform(0.05, 1)) * s * 0.42
        x = cx + math.cos(a) * rr * 0.9
        y = cy + s * 0.12 + math.sin(a) * rr
        tohumlar.append(yol_elips(x, y, s * 0.035, s * 0.05, rng.uniform(0, 180)))
    _lv(t, tohumlar, M, '#F2DFA6', 0.55, islak=0.4, tohum=tohum + 5)
    _sakla(t, tohumlar, M, yumusak=0.4)
    _lv(t, et, M, '#E2788A', 0.55, renk_fn=_renk_gecis(L, cx, cy, s, '#EE9AA4', '#CF5A72'), islak=1.2,
        tohum=tohum + 6)
    _lv(t, _golge(et, L, s * 0.25), M, '#B7465F', 0.25, tohum=tohum + 7)
    _sakla(t, et, M)
    _lv(t, yol_op(ic, et, 'fark'), M, '#F4E7D2', 0.45, islak=0.9, tohum=tohum + 8)
    _sakla(t, ic, M)
    _lv(t, yol_op(govde, ic, 'fark'), M, '#8F6488', 0.6, tohum=tohum + 9)
    _sakla(t, govde, M)
    return govde


def _yaprak(cx, cy, uzun, gen, aci, kivrim=0.0):
    a = math.radians(aci)
    ux, uy = math.cos(a), math.sin(a)
    nx, ny = -uy, ux
    pts = []
    n = 10
    for i in range(n + 1):
        u = i / n
        w = gen * math.sin(u * math.pi) ** 0.8 * (1 - 0.3 * u)
        k = kivrim * math.sin(u * math.pi) * uzun
        pts.append((cx + ux * uzun * u + nx * (k + w), cy + uy * uzun * u + ny * (k + w)))
    for i in range(n - 1, 0, -1):
        u = i / n
        w = gen * math.sin(u * math.pi) ** 0.8 * (1 - 0.3 * u)
        k = kivrim * math.sin(u * math.pi) * uzun
        pts.append((cx + ux * uzun * u + nx * (k - w), cy + uy * uzun * u + ny * (k - w)))
    return yol_egri(pts, kapali=True, gerilim=0.45), (ux, uy), (nx, ny)


def _yaprak_boya(t, M, cx, cy, uzun, gen, aci, L, kivrim=0.0, tohum=0, c='#8DB08F', c2='#5F8B6C'):
    y, (ux, uy), (nx, ny) = _yaprak(cx, cy, uzun, gen, aci, kivrim)
    # orta damar boş (ince kâğıt çizgisi)
    om = np.array([(cx + ux * uzun * u + nx * kivrim * math.sin(u * math.pi) * uzun,
                    cy + uy * uzun * u + ny * kivrim * math.sin(u * math.pi) * uzun) for u in np.linspace(0.05, 0.85, 8)])
    damar = yol_serit(om, np.linspace(gen * 0.07, gen * 0.02, 8))
    _lv(t, _fark(y, damar), M, c, 0.50, tohum=tohum)
    # yarım yaprak koyu (bir yarısı gölgede)
    yarim = yol_op(y, yol_cokgen([(cx - nx * gen * 3, cy - ny * gen * 3),
                                  (cx - nx * gen * 3 + ux * uzun * 1.2, cy - ny * gen * 3 + uy * uzun * 1.2),
                                  (cx + ux * uzun * 1.2, cy + uy * uzun * 1.2), (cx, cy)]), 'kesisim')
    if (nx * L[0] + ny * L[1]) > 0:
        yarim = yol_op(y, yarim, 'fark')
    _lv(t, _fark(yarim, damar), M, c2, 0.32, tohum=tohum + 1)
    _sakla(t, y, M)
    return y


def ciz_meyve_tabagi(t: Tuval, M, olcek=1.0, tohum=0, isik=ISIK, sakla_sonra=True):
    """'lezzet': seramik kâsede nar (biri yarık), üzüm, incir. Köken = görsel merkez (~220 x 178). Döner: dict(kutu)."""
    kayit = None if sakla_sonra else _sakla_kayit(t)
    Ml = M_bilesik(np.asarray(M, np.float64), M_olcek(olcek))
    L = _isik_yerel(Ml, isik)
    RX, RY, RCY = 110.0, 20.0, 22.0     # kâse ağzı
    # 1) üzüm salkımı (sol kenardan sarkar, en önde)
    _uzum_salkimi(t, Ml, -62.0, -8.0, 1.0, L, tohum=tohum + 1, aci=16.0)
    # 2) kâse dış duvarı + ayak
    on_yay = _elips_noktalari(0, RCY, RX, RY, 0.0, math.pi, 40)          # sağ uç -> ön -> sol uç
    duvar_alt = [(-RX, RCY), (-RX + 4, RCY + 16), (-RX + 20, RCY + 36), (-62, RCY + 49), (-38, RCY + 54),
                 (38, RCY + 54), (62, RCY + 49), (RX - 20, RCY + 36), (RX - 4, RCY + 16), (RX, RCY)]
    p = skia.Path()
    p.moveTo(*map(float, on_yay[0]))
    for q in on_yay[1:]:
        p.lineTo(*map(float, q))
    _egri_ekle(p, duvar_alt, 0.5)
    p.close()
    duvar = p
    ayak = yol_egri([(-36, RCY + 51), (36, RCY + 51), (40, RCY + 62), (43, RCY + 68), (-43, RCY + 68),
                     (-40, RCY + 62)], kapali=True, gerilim=0.3)
    # bant süsü: iki çizgi ve kobalt noktalar
    bant = []
    for yo, sc in ((12.0, 0.955), (24.0, 0.87)):
        pts = _elips_noktalari(0, RCY + yo, RX * sc, RY * sc, 0.1, math.pi - 0.1, 32)
        bant.append(yol_egri(pts, kapali=False))
    nokt = []
    for j in range(15):
        a = 0.18 + (math.pi - 0.36) * j / 14
        x = math.cos(a) * RX * 0.912
        y = RCY + 18.0 + math.sin(a) * RY * 0.912
        sx = max(0.3, math.sin(a))
        nokt.append(yol_elips(x, y, 3.0 * sx, 3.0))
        nokt.append(yol_elips(x + 6.4 * sx * (1 if j < 14 else 0), y + 0.4, 1.1 * sx, 1.1))
    lip_alt = yol_op(duvar, _tasi(duvar, 0, 4.2), 'fark')   # ağız dudağının altındaki gölge şeridi
    sg_l = 1.0 if L[0] > 0 else -1.0
    par_duvar = yol_egri([(sg_l * 70, RCY + 10), (sg_l * 74.5, RCY + 24), (sg_l * 66, RCY + 39),
                          (sg_l * 63.5, RCY + 37), (sg_l * 70.5, RCY + 24), (sg_l * 67, RCY + 11)], kapali=True,
                         gerilim=0.5)
    _lv(t, _fark(duvar, par_duvar), Ml, '#A8CFCB', 0.52,
        yog_fn=_yumusak_isik(sg_l * 62, RCY + 26, 26, 16, 0, guc=0.45), tohum=tohum + 2)
    _lv(t, _golge(duvar, L, 55.0, 4.0), Ml, '#7FAFB0', 0.40, tohum=tohum + 3)
    _lv(t, lip_alt, Ml, '#6E9EA4', 0.30, tohum=tohum + 4)
    t.lavi(bant, Ml, '#4F7FB8', yog=0.50, cizgi=1.1, kenar=0.5, dalga=0.0, islak=0.0, gran=0.06, akis=0.1)
    _lv(t, nokt, Ml, '#4F7FB8', 0.55, islak=0.6, tohum=tohum + 5)
    _sakla(t, duvar, Ml)
    _lv(t, ayak, Ml, '#A3C9C6', 0.52, tohum=tohum + 6)
    _lv(t, _golge(ayak, L, 26.0, 1.5), Ml, '#78A6A8', 0.42, tohum=tohum + 7)
    _lv(t, yol_op(ayak, yol_dikdortgen(-50, RCY + 50, 50, RCY + 55), 'kesisim'), Ml, '#5F8F96', 0.35,
        tohum=tohum + 8)
    _sakla(t, ayak, Ml)
    # 3) incirler (ön sıra, kâse içinde)
    _incir(t, Ml, 22.0, 10.0, 21.0, 24.0, L, tohum=tohum + 11, yarim=True)
    _incir(t, Ml, -22.0, 6.0, 22.0, -18.0, L, tohum=tohum + 12, yarim=False)
    # 4) yarılmış nar (sağ)
    _nar_yarim(t, Ml, 62.0, -4.0, 40.0, L, tohum=tohum + 13)
    # 5) bütün nar (arka orta)
    _nar_butun(t, Ml, -6.0, -36.0, 46.0, L, tohum=tohum + 14, aci=-10.0)
    # 6) yapraklar (arkada)
    _yaprak_boya(t, Ml, 30.0, -40.0, 66.0, 15.0, -40.0, L, kivrim=0.06, tohum=tohum + 15)
    _yaprak_boya(t, Ml, -52.0, -36.0, 58.0, 13.0, -150.0, L, kivrim=-0.08, tohum=tohum + 16)
    # 7) kâse içi (meyvelerin arkasında kalan arka duvar) ve arka dudak
    ic = yol_elips(0, RCY, RX, RY)
    ic_ic = yol_elips(0, RCY + 1.2, RX - 5.0, RY - 3.4)
    dudak = yol_op(ic, ic_ic, 'fark')
    _lv(t, dudak, Ml, '#B9DAD6', 0.42, tohum=tohum + 17)
    _sakla(t, dudak, Ml)
    _lv(t, ic_ic, Ml, '#C2DCD8', 0.45, tohum=tohum + 18)
    # içbükey: ışık yanındaki iç duvar gölgede
    _lv(t, _golge(ic_ic, (-L[0], -L[1]), 70.0, 2.0), Ml, '#88B4B4', 0.32, tohum=tohum + 19)
    _sakla(t, ic, Ml)
    if not sakla_sonra:
        _sakla_geri(t, kayit)
    return dict(kutu=_kutu(M, olcek, -111, -88, 110, 91))


# ================================================================================================================
# 4) KESE ve SİKKELER
# ================================================================================================================
def _yildiz_yolu(cx, cy, r_dis, r_ic, n=5, aci=-90.0):
    pts = []
    for j in range(2 * n):
        a = math.radians(aci + j * 180.0 / n)
        rr = r_dis if j % 2 == 0 else r_ic
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    return yol_cokgen(pts), pts


def _elips_yon_fn(cx, cy, rx, ry, aci, L, a=-0.15, b=0.85, taban=0.0):
    """yog_fn: elipsin dış normaline göre ışıktan uzak yanda artan yoğunluk (kenar/çerçeve gölgesi kesiksiz)."""
    ca, sa = math.cos(math.radians(aci)), math.sin(math.radians(aci))
    rx, ry = max(rx, 1e-3), max(ry, 1e-3)

    def f(X, Y):
        dx, dy = X - cx, Y - cy
        u = (ca * dx + sa * dy) / rx
        v = (-sa * dx + ca * dy) / ry
        nx = ca * u / rx - sa * v / ry
        ny = sa * u / rx + ca * v / ry
        nn = np.sqrt(nx * nx + ny * ny) + 1e-9
        d = -(nx * L[0] + ny * L[1]) / nn
        return taban + (1.0 - taban) * smoothstep(a, b, d)
    return f


def _kivilcim(cx, cy, r, aci=0.0):
    """Dört kollu küçük parıltı yıldızı (boş kâğıt olarak oyulur)."""
    pts = []
    for j in range(8):
        a = math.radians(aci + j * 45)
        rr = r if j % 2 == 0 else r * 0.22
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    return yol_egri(pts, kapali=True, gerilim=0.2)


def _sikke(t, M, cx, cy, rx, ry, aci, L, kal=4.0, tohum=0, motif=True, kenar_yon=None, kivilcim=False):
    """Altın sikke: yüz elipsi (rx, ry, aci); kalınlık kal, yüzün 'altında' kenar_yon yönünde."""
    C = ALTIN
    ca, sa = math.cos(math.radians(aci)), math.sin(math.radians(aci))
    if kenar_yon is None:
        kv = np.array([-sa, ca])
        if kv[1] < 0:
            kv = -kv
    else:
        kv = np.asarray(kenar_yon, np.float64)
        kv = kv / np.linalg.norm(kv)
    rm = max(rx, ry)
    yuz = yol_elips(cx, cy, rx, ry, aci)
    ic = yol_elips(cx, cy, rx * 0.80, ry * 0.80, aci)
    rim = yol_op(yuz, ic, 'fark')
    delik = [yol_op(_parlak_hilal(yuz, L, rm * 0.085), ic, 'fark'),     # kenarın ışıklı dış hilali
             _golge(ic, (-L[0], -L[1]), rm * 0.07)]                     # çukurun ışığa bakan uzak duvarı
    yildiz = None
    if motif and min(rx, ry) > 5:
        def ez(px, py):
            x, y = px * rx, py * ry
            return cx + ca * x - sa * y, cy + sa * x + ca * y
        _, ypts = _yildiz_yolu(0, 0, 0.44, 0.20, n=8, aci=-90)
        yildiz = yol_cokgen([ez(px, py) for px, py in ypts])
        delik.append(yol_op(_parlak_hilal(yildiz, L, rm * 0.045), yildiz, 'kesisim'))
    if kivilcim:
        delik.append(_kivilcim(cx + L[0] * rx * 0.62 - L[1] * rx * 0.25, cy + L[1] * ry * 0.62 + L[0] * ry * 0.25,
                               rm * 0.20, 10.0))
    _lv(t, _fark(yuz, *delik), M, C['acik'], 0.56, tohum=tohum)
    _lv(t, rim, M, C['orta'], 0.50, yog_fn=_elips_yon_fn(cx, cy, rx, ry, aci, L, -0.35, 0.8), tohum=tohum + 1)
    _lv(t, yol_op(ic, _tasi(ic, -L[0] * rm * 0.08, -L[1] * rm * 0.08), 'fark'), M, C['koyu'], 0.34,
        tohum=tohum + 2)
    _lv(t, ic, M, C['orta'], 0.15, tohum=tohum + 3)
    if yildiz is not None:
        _lv(t, _golge(yildiz, L, rm * 0.05), M, C['koyu'], 0.42, tohum=tohum + 4)
        _lv(t, yildiz, M, C['orta'], 0.20, tohum=tohum + 5)
    _sakla(t, yuz, M)
    if kal > 0.2:
        alt = _tasi(yuz, kv[0] * kal, kv[1] * kal)
        kenar = yol_op(_birlesim(alt, _kalinlik_seridi(cx, cy, rx, ry, aci, kv, kal)), yuz, 'fark')
        pv = np.array([kv[1], -kv[0]])
        sgn = 1.0 if pv @ L > 0 else -1.0

        def yf(X, Y):
            d = -sgn * ((X - cx) * pv[0] + (Y - cy) * pv[1]) / rm
            return 0.55 + 0.6 * smoothstep(-0.9, 0.9, d)
        _lv(t, kenar, M, C['orta'], 0.55, yog_fn=yf, tohum=tohum + 6)
        _sakla(t, kenar, M)
        return _birlesim(yuz, kenar)
    return yuz


def _kalinlik_seridi(cx, cy, rx, ry, aci, kv, kal):
    pts = _elips_noktalari(cx, cy, rx, ry, 0, 2 * math.pi, 64, aci)
    d = pts @ np.array([kv[1], -kv[0]])
    i0, i1 = int(np.argmin(d)), int(np.argmax(d))
    a, b = pts[i0], pts[i1]
    return yol_cokgen([tuple(a), tuple(b), tuple(b + kv * kal), tuple(a + kv * kal)])


def _pigment_koyu(c, k):
    """Aynı pigmentin k kat sırlanmış hali (çarpımsal: renk**k) — gri karışım yok, temiz koyulaşma."""
    return np.clip(renk(c) ** k, 0, 1)


def ciz_kese(t: Tuval, M, olcek=1.0, tohum=0, isik=ISIK, sakla_sonra=True, renk_='#B5C7AA', kordon='#C46D74'):
    """'ücret': büzgülü kumaş kese ve önünde altın sikkeler. Köken = görsel merkez (~184 x 205). Döner: dict(kutu)."""
    kayit = None if sakla_sonra else _sakla_kayit(t)
    Ml = M_bilesik(np.asarray(M, np.float64), M_olcek(olcek * 1.07), M_oteleme(-16.5, -11.5))
    L = _isik_yerel(Ml, isik)
    sg = -1.0 if L[0] > 0 else 1.0         # gölge yanı (x işareti)
    c0 = renk(renk_)
    c1 = _pigment_koyu(renk_, 2.2)
    c2 = _pigment_koyu(renk_, 3.6)
    ck, ck2 = renk(kordon), _pigment_koyu(kordon, 2.0)
    # ---- önde sikkeler ----------------------------------------------------------------------------------------
    _sikke(t, Ml, 40.0, 70.0, 24.0, 22.5, -14.0, L, kal=4.4, tohum=tohum + 1, kenar_yon=(0.42, 0.91),
           kivilcim=True)
    _sikke(t, Ml, -38.0, 93.0, 24.0, 8.4, 0.0, L, kal=3.8, tohum=tohum + 2)
    # üç sikkelik deste: önden arkaya = en üstteki sikke önce (yüzü tam görünür), alttakilerin yalnız kenarı kalır
    for j in (2, 1, 0):
        _sikke(t, Ml, 80.0 + j * 1.4, 97.0 - j * 5.0, 21.0, 7.3, 0.0, L, kal=3.8, tohum=tohum + 3 + j,
               motif=(j == 2))
    # ---- kordon: düğüm, fiyonk halkaları, sarkan uçlar ve püsküller --------------------------------------------
    dugum = yol_elips(-4, -41, 5.6, 4.8)
    fiy_sol = yol_egri([(-6, -42), (-15, -50), (-27, -55), (-31, -48), (-24, -41), (-10, -39)], kapali=True,
                       gerilim=0.5)
    fiy_sag = yol_egri([(-2, -42), (6, -51), (16, -54), (19, -47), (12, -40), (1, -39)], kapali=True, gerilim=0.5)
    fiy_ic = [yol_elips(-21, -48, 4.2, 2.0, -20), yol_elips(11, -47.5, 3.6, 1.8, 18)]
    uc1 = yol_serit(np.array([(-7, -37), (-13, -24), (-17, -10), (-18, 2)]), np.array([2.0, 1.9, 1.8, 1.7]))
    uc2 = yol_serit(np.array([(-2, -37), (-2, -24), (1, -10), (5, 1)]), np.array([2.0, 1.9, 1.8, 1.7]))
    pus = []
    for (x, y) in ((-18, 1), (5, 0)):
        pus.append(yol_egri([(x - 2.4, y), (x - 4.6, y + 13), (x, y + 16), (x + 4.6, y + 13), (x + 2.4, y)],
                            kapali=True, gerilim=0.4))
    _lv(t, dugum, Ml, ck, 0.6, tohum=tohum + 10)
    _lv(t, _golge(dugum, L, 3.0), Ml, ck2, 0.4, tohum=tohum + 11)
    _sakla(t, dugum, Ml)
    for j, y in enumerate((fiy_sol, fiy_sag, uc1, uc2)):
        _lv(t, _fark(y, *fiy_ic) if j < 2 else y, Ml, ck, 0.56, tohum=tohum + 12 + j)
        _lv(t, _golge(y, L, 3.6), Ml, ck2, 0.36, tohum=tohum + 16 + j)
    _lv(t, fiy_ic, Ml, ck2, 0.5, tohum=tohum + 20)
    for j, y in enumerate(pus):
        _lv(t, y, Ml, '#E0AE5E', 0.56, tohum=tohum + 21 + j)
        _lv(t, _golge(y, L, 3.0), Ml, '#B07A36', 0.42, tohum=tohum + 23 + j)
        bb = y.computeTightBounds()
        cz = [yol_cokgen([(bb.left() + (q + 0.5) * bb.width() / 4, bb.top() + bb.height() * 0.4),
                          (bb.left() + (q + 0.5) * bb.width() / 4, bb.bottom() - 1.4)], kapali=False)
              for q in range(4)]
        t.lavi(cz, Ml, '#9C6A2E', yog=0.32, cizgi=0.6, kenar=0.5, dalga=0.0, islak=0.0, gran=0.05, akis=0.0)
    _sakla(t, [fiy_sol, fiy_sag, uc1, uc2] + pus, Ml)
    band = yol_egri([(-21, -45.5), (0, -43.5), (20, -45.5), (21, -38.5), (0, -36.2), (-22, -38.5)], kapali=True,
                    gerilim=0.4)
    _lv(t, band, Ml, ck, 0.55, tohum=tohum + 25)
    _lv(t, band, Ml, ck2, 0.32, yog_fn=lambda X, Y: smoothstep(-6, 22, sg * X), tohum=tohum + 26)
    _sakla(t, band, Ml)
    # ---- kese gövdesi ------------------------------------------------------------------------------------
    govde = yol_egri([(-18, -40), (-30, -27), (-52, -2), (-68, 30), (-67, 62), (-50, 81), (-16, 89), (18, 89),
                      (50, 81), (66, 61), (65, 29), (49, -1), (28, -27), (17, -40)], kapali=True, gerilim=0.5)
    _lv(t, govde, Ml, c0, 0.56, yog_fn=_yumusak_isik(-sg * 32.0, 24.0, 16.0, 30.0, sg * 14.0, guc=0.7),
        tohum=tohum + 27)
    # yumuşak gölge (ışıktan uzak yana ve alta doğru artan) + dar çekirdek gölge
    _lv(t, govde, Ml, c1, 0.42,
        yog_fn=lambda X, Y: smoothstep(-0.15, 1.0, (sg * X * 0.9 + (Y - 20) * 0.45 * (-L[1])) / 62.0) * 1.15,
        tohum=tohum + 28)
    _lv(t, _golge(govde, L, 15.0, 3.2), Ml, c2, 0.26, tohum=tohum + 29)
    # büzgü kıvrımları: boyundan inen yumuşak, kıvrık sır izleri
    kiv = []
    for (x0, x1, y1, w, eg) in [(-13, -40, 22, 3.4, -0.08), (-5, -14, 44, 2.6, -0.05), (5, 12, 40, 2.6, 0.05),
                                (13, 36, 20, 3.2, 0.08)]:
        kiv.append(_firca((x0, -33), (x1, y1), w, profil=(1.0, 0.85, 0.45, 0.0), egrilik=eg))
    _lv(t, kiv, Ml, c1, 0.24, islak=0.6, tohum=tohum + 30)
    # işlemeli bant (gül kurusu baklava dizisi, iki ince çizgi arasında)
    bant_y = lambda u: 58.0 + 9.0 * math.sin(u * math.pi) ** 0.8
    cz = []
    for off in (-6.0, 6.0):
        pts = [(-62 + 124 * u, bant_y(u) + off) for u in np.linspace(0.04, 0.96, 24)]
        cz.append(yol_egri(pts, kapali=False))
    t.lavi(cz, Ml, ck, yog=0.38, cizgi=0.9, kenar=0.5, dalga=0.0, islak=0.0, gran=0.05, akis=0.0)
    bak = []
    for j in range(11):
        u = 0.08 + 0.84 * j / 10
        x, y = -62 + 124 * u, bant_y(u)
        bak.append(yol_cokgen([(x, y - 3.6), (x + 3.0, y), (x, y + 3.6), (x - 3.0, y)]))
    _lv(t, bak, Ml, ck, 0.50, islak=0.6, tohum=tohum + 31)
    _sakla(t, govde, Ml)
    # ---- büzgülü üst (fırfır) ---------------------------------------------------------------------------
    firfir = yol_egri([(-15, -41), (-22, -53), (-31, -64), (-33, -72), (-25, -74), (-18, -80), (-8, -78),
                       (0, -85), (9, -79), (19, -81), (27, -73), (30, -66), (21, -53), (14, -41)], kapali=True,
                      gerilim=0.5)
    arka = yol_egri([(-25, -74), (-18, -80), (-8, -78), (0, -85), (9, -79), (19, -81), (27, -73), (12, -73),
                     (-6, -72)], kapali=True, gerilim=0.5)
    fk = [_firca((x0, -45), (x1, y1), 2.0, profil=(0.8, 1.0, 0.4, 0.0)) for (x0, x1, y1) in
          [(-9, -20, -71), (-1, -2, -76), (7, 14, -73)]]
    _lv(t, firfir, Ml, c0, 0.54, tohum=tohum + 32)
    _lv(t, firfir, Ml, c1, 0.34, yog_fn=lambda X, Y: smoothstep(-0.2, 1.0, sg * X / 26.0), tohum=tohum + 33)
    _lv(t, yol_op(arka, firfir, 'kesisim'), Ml, c1, 0.30, tohum=tohum + 34)
    _lv(t, fk, Ml, c1, 0.26, tohum=tohum + 35)
    _sakla(t, firfir, Ml)
    # ---- yerde yumuşak gölge ----------------------------------------------------------------------------
    t.lavi(yol_elips(10, 100, 100, 9), Ml, '#B7B0CC', yog=0.24, yumusak=max(2.5, 5.0 * _olcek(Ml)), dalga=0.05,
           islak=0.0, gran=0.06, akis=0.1, tohum=tohum + 36)
    if not sakla_sonra:
        _sakla_geri(t, kayit)
    return dict(kutu=_kutu(M, olcek, -94, -104, 94, 104))


# ================================================================================================================
# 5) MADALYA
# ================================================================================================================
def ciz_madalya(t: Tuval, M, olcek=1.0, tohum=0, isik=ISIK, sakla_sonra=True):
    """'mükâfat': toz pembe V kurdeleli altın madalya (defne çelengi, yıldız). Köken = görsel merkez (~124 x 218).
    Döner: dict(kutu)."""
    kayit = None if sakla_sonra else _sakla_kayit(t)
    Ml = M_bilesik(np.asarray(M, np.float64), M_olcek(olcek))
    L = _isik_yerel(Ml, isik)
    C = ALTIN
    cx, cy, R = 0.0, 46.0, 60.0
    disk = yol_daire(cx, cy, R)
    alan = yol_daire(cx, cy, R * 0.83)
    # ---- kabartma öğeleri: defne yaprakları ve yıldız -------------------------------------------------------
    yapraklar = []
    for taraf in (-1, 1):
        for j in range(7):
            u = j / 6.5
            a = math.radians(90 + taraf * (24 + 116 * u))
            rr = R * 0.655
            px, py = cx + math.cos(a) * rr, cy + math.sin(a) * rr
            tang = math.degrees(a) + 90 * taraf
            s_ = R * (0.105 - 0.028 * u)
            for off in (-1, 1):
                ox = math.cos(a) * off * s_ * 0.8
                oy = math.sin(a) * off * s_ * 0.8
                yap, _, _ = _yaprak(px + ox, py + oy, s_ * 2.0, s_ * 0.56, tang + taraf * (32 + 12 * off))
                yapraklar.append(yap)
    dal_l = []
    for taraf in (-1, 1):
        pts = [(cx + math.cos(math.radians(90 + taraf * (16 + 126 * u))) * R * 0.655,
                cy + math.sin(math.radians(90 + taraf * (16 + 126 * u))) * R * 0.655) for u in np.linspace(0, 1, 14)]
        dal_l.append(yol_serit(np.array(pts), np.linspace(1.4, 0.6, 14)))
    yc = cy - 1.0
    yildiz, ypts = _yildiz_yolu(cx, yc, R * 0.34, R * 0.145, n=5, aci=-90)
    paylar = []
    for j in range(10):
        a_, b_ = ypts[j], ypts[(j + 1) % 10]
        tri = yol_cokgen([(cx, yc), a_, b_])
        ex, ey = b_[0] - a_[0], b_[1] - a_[1]
        dn = np.array([ey, -ex])
        mx, my = (a_[0] + b_[0]) / 2 - cx, (a_[1] + b_[1]) / 2 - yc
        if dn @ np.array([mx, my]) < 0:
            dn = -dn
        dn /= np.linalg.norm(dn) + 1e-9
        paylar.append((tri, float(dn @ L)))
    halka = yol_op(yol_daire(cx, cy - R - 5.0, 7.8), yol_daire(cx, cy - R - 5.0, 4.0), 'fark')
    # ---- 1) madalya diski ---------------------------------------------------------------------------------
    par = [yol_op(_parlak_hilal(disk, L, R * 0.065), alan, 'fark'),
           _kivilcim(cx + L[0] * R * 0.56 - L[1] * R * 0.22, cy + L[1] * R * 0.56 + L[0] * R * 0.22, R * 0.12, 8.0)]
    for (tri, d) in paylar:
        if d > 0.5:
            par.append(tri)
    for y in yapraklar:
        par.append(yol_op(_parlak_hilal(y, L, 1.1), y, 'kesisim'))
    _lv(t, _fark(disk, *par), Ml, C['acik'], 0.56, tohum=tohum + 1)
    rim = yol_op(disk, alan, 'fark')
    _lv(t, rim, Ml, C['orta'], 0.50, yog_fn=_elips_yon_fn(cx, cy, R, R, 0, L, -0.35, 0.85), tohum=tohum + 2)
    _lv(t, rim, Ml, C['koyu'], 0.30, yog_fn=_elips_yon_fn(cx, cy, R, R, 0, L, 0.45, 1.0), tohum=tohum + 3)
    alan_golge = yol_op(alan, _tasi(alan, -L[0] * R * 0.055, -L[1] * R * 0.055), 'fark')
    _lv(t, alan_golge, Ml, C['koyu'], 0.40, tohum=tohum + 4)
    _lv(t, alan, Ml, C['orta'], 0.20, yog_fn=lambda X, Y: 0.8 + 0.5 * np.clip(
        ((X - cx) * -L[0] + (Y - cy) * -L[1]) / R, -1, 1), tohum=tohum + 5)
    _lv(t, dal_l, Ml, C['orta'], 0.42, tohum=tohum + 6)
    _lv(t, yapraklar, Ml, C['orta'], 0.30, tohum=tohum + 7)
    _lv(t, [_golge(y, L, 1.6) for y in yapraklar], Ml, C['koyu'], 0.50, tohum=tohum + 8)
    for j, (tri, d) in enumerate(paylar):
        if d <= 0.5:
            renk_p = C['acik'] if d > 0.05 else (C['orta'] if d > -0.45 else C['koyu'])
            _lv(t, yol_op(tri, yildiz, 'kesisim'), Ml, renk_p, 0.30 + 0.22 * max(0.0, -d), islak=0.7,
                tohum=tohum + 10 + j)
    _lv(t, _golge(yildiz, L, R * 0.04), Ml, C['derin'], 0.25, tohum=tohum + 30)
    _sakla(t, disk, Ml)
    # ---- 2) halka --------------------------------------------------------------------------------------------
    _lv(t, _fark(halka, _parlak_hilal(halka, L, 1.3)), Ml, C['acik'], 0.58, tohum=tohum + 31)
    _lv(t, halka, Ml, C['orta'], 0.5, yog_fn=_elips_yon_fn(cx, cy - R - 5.0, 7.8, 7.8, 0, L, -0.3, 0.9),
        tohum=tohum + 32)
    _sakla(t, halka, Ml)
    # ---- 3) kurdele (V): sol şerit önde, sağ şerit arkada -------------------------------------------------------
    k_c, k_c2, k_s = '#E2ABA7', '#C98189', '#B06672'
    y_ust, y_alt = -112.0, -4.0
    ust_sol = (-62.0, -26.0)
    alt_sol = (-14.0, 20.0)

    def serit_yol(sol_taraf, fu=(0.0, 1.0)):
        sx = 1.0 if sol_taraf else -1.0
        u0, u1 = fu
        xu0 = ust_sol[0] + (ust_sol[1] - ust_sol[0]) * u0
        xu1 = ust_sol[0] + (ust_sol[1] - ust_sol[0]) * u1
        xa0 = alt_sol[0] + (alt_sol[1] - alt_sol[0]) * u0
        xa1 = alt_sol[0] + (alt_sol[1] - alt_sol[0]) * u1
        return yol_cokgen([(sx * xu0, y_ust), (sx * xu1, y_ust), (sx * xa1, y_alt), (sx * xa0, y_alt)])

    sol = serit_yol(True)
    for j, sol_taraf in enumerate((True, False)):
        s_ = serit_yol(sol_taraf)
        orta = serit_yol(sol_taraf, (0.37, 0.63))
        cizgiler = [serit_yol(sol_taraf, (0.10, 0.15)), serit_yol(sol_taraf, (0.85, 0.90))]
        _lv(t, _fark(s_, *cizgiler), Ml, k_c, 0.55, tohum=tohum + 40 + j,
            yog_fn=lambda X, Y: 0.85 + 0.35 * np.clip((Y - y_ust) / 108.0, 0, 1))
        _lv(t, orta, Ml, k_c2, 0.45, tohum=tohum + 42 + j)
        _lv(t, yol_op(s_, yol_dikdortgen(-80, y_ust, 80, y_ust + 5.0), 'kesisim'), Ml, k_s, 0.30,
            tohum=tohum + 44 + j)
        _lv(t, s_, Ml, k_s, 0.34, yog_fn=lambda X, Y: smoothstep(-40, -6, Y), tohum=tohum + 46 + j)
        if not sol_taraf:
            _lv(t, yol_op(s_, _tasi(sol, 5.0, 2.0), 'kesisim'), Ml, k_s, 0.42, tohum=tohum + 48)
        _sakla(t, s_, Ml)
    if not sakla_sonra:
        _sakla_geri(t, kayit)
    return dict(kutu=_kutu(M, olcek, -62, -113, 62, 106))


# ================================================================================================================
# 6) SİMGE HALKASI
# ================================================================================================================
def ciz_simge_halkasi(t: Tuval, M, r, renk_='#F1E3D3', ilerleme=1.0, tohum=0, yog=0.55):
    """Simgenin ARKASINA (simgeden sonra çağrılır) yumuşak suluboya disk; ilerleme 0..1 merkezden yayılarak boyanır."""
    p = float(np.clip(ilerleme, 0.0, 1.0))
    if p <= 0.0:
        return
    M = np.asarray(M, np.float64)
    pe = e_out(p)
    disk = damla_blob(0, 0, r, tohum=tohum, duzensizlik=0.012, lob=6, n=64)
    ac = acilma_radyal(pe, 0.0, 0.0, r * 1.02, dalga=0.16 * (1 - pe) + 0.02, on=0.12, tohum=tohum)

    def yf(X, Y):
        d = np.sqrt(X * X + Y * Y) / max(r, 1e-6)
        return 0.78 + 0.30 * smoothstep(0.25, 1.0, d)
    t.lavi(disk, M, renk_, yog=yog, kenar=1.4, dalga=0.07, islak=1.25, islak_gen=3.2, gran=0.10, akis=0.22,
           tohum=tohum, maske_fn=ac, yog_fn=yf)
    # hafif ikinci halka (kenarın içinde çok açık bir yankı)
    t.lavi(yol_op(disk, yol_daire(0, 0, r * 0.90), 'fark'), M, renk_, yog=yog * 0.25 * pe, kenar=2.0, dalga=0.1,
           islak=0.6, islak_gen=4.0, gran=0.1, akis=0.2, tohum=tohum + 1, maske_fn=ac)
    # saklama yalnız boyanmış (açılmış) alanı kaplar: açılırken arkadaki gök tam diskin hayaletiyle açılmaz
    _sakla_acilma(t, disk, M, ac, yumusak=1.0)


# ================================================================================================================
# 7) SAAT (güneş kadranı)
# ================================================================================================================
def _dilim_yolu(r, a0, a1, n=None):
    """Saat açısı (derece, 0 = 12, saat yönünde +) a0..a1 arası dilim."""
    if a1 - a0 >= 359.99:
        return yol_daire(0, 0, r)
    n = n or max(4, int((a1 - a0) / 4) + 2)
    pts = [(0.0, 0.0)]
    for a in np.linspace(a0, a1, n):
        th = math.radians(a - 90.0)
        pts.append((math.cos(th) * r, math.sin(th) * r))
    return yol_cokgen(pts)


def _saat_yon(a):
    th = math.radians(a - 90.0)
    return math.cos(th), math.sin(th)


def ciz_saat(t: Tuval, M, r, dilim=0.0, gun=0.0, akrep=None, yelkovan=None, gorunurluk=1.0, tohum=0, hale=1.0):
    """Güneş diski + saat kadranı. dilim: tek saat dilimi altınla dolar; gun: dolgu bütün daireye döner.
    Döner: dict(merkez, r_ekran). Ayrıntı: modül belgesi (7)."""
    M = np.asarray(M, np.float64)
    rng = np.random.default_rng(tohum)
    dilim = float(np.clip(dilim, 0, 1))
    gun = float(np.clip(gun, 0, 1))
    g = float(np.clip(gorunurluk, 0, 1))
    s = _olcek(M)
    if akrep is None:
        akrep = 30.0 * dilim + 330.0 * gun
    if yelkovan is None:
        yelkovan = 360.0 * (dilim + 2.0 * gun)
    disk = damla_blob(0, 0, r, tohum=tohum, duzensizlik=0.006, lob=7, n=72)
    cizgi_renk = '#A9773E'
    el_renk = '#6F4B30'
    # ---- 1) akrep ve yelkovan (önde) ---------------------------------------------------------------------
    g_el = smoothstep(0.55, 1.0, g)
    on_yollar = []                       # el ve işaretler: ışık şeridi bunları parlatmaz (önde dururlar)
    if g_el > 0.01:
        yollar_el = []
        for (aci, boy, gen, kuyruk) in ((akrep, 0.50, 0.040, 0.13), (yelkovan, 0.74, 0.027, 0.16)):
            ux, uy = _saat_yon(aci)
            b = boy * r * (0.25 + 0.75 * g_el)
            pts = np.array([(-ux * kuyruk * r, -uy * kuyruk * r), (0, 0), (ux * b * 0.25, uy * b * 0.25),
                            (ux * b * 0.7, uy * b * 0.7), (ux * b, uy * b)])
            wss = np.array([0.45, 0.75, 1.0, 0.55, 0.06]) * gen * r
            yollar_el.append(yol_serit(pts, wss))
        yollar_el.append(yol_daire(0, 0, r * 0.052))
        _lv(t, yollar_el, M, el_renk, 0.62 * g_el, islak=0.8, tohum=tohum + 1)
        on_yollar += yollar_el
        _lv(t, yol_daire(-0.012 * r, -0.014 * r, r * 0.016), M, '#F6E7C4', 0.6 * g_el, opak=True, islak=0.0,
            tohum=tohum + 2)
    # ---- 2) saat işaretleri (ince fırça izleri) -----------------------------------------------------------
    if g > 0.01:
        isaret = []
        for i in range(12):
            w0 = 0.45 * i / 11.0
            gi = smoothstep(w0, w0 + 0.30, g)
            if gi <= 0.01:
                continue
            ana = (i % 3 == 0)
            a = i * 30.0 + rng.uniform(-0.7, 0.7)
            ux, uy = _saat_yon(a)
            r1 = r * (0.91 + rng.uniform(-0.005, 0.005))
            r0 = r * (0.74 if ana else 0.80)
            r0g = r1 - (r1 - r0) * gi
            w = r * (0.021 if ana else 0.0135)
            isaret.append(_firca((ux * r1, uy * r1), (ux * r0g, uy * r0g), w, profil=(0.30, 0.95, 1.0, 0.7, 0.18),
                                 n=11, egrilik=rng.uniform(-0.03, 0.03)))
        _lv(t, isaret, M, cizgi_renk, 0.58, islak=0.7, tohum=tohum + 3)
        on_yollar += isaret
    # ---- 3) altın dilim / gün ------------------------------------------------------------------------------
    altin = '#F1BD52'
    if dilim > 0.001:
        a_on = 30.0 + 330.0 * gun
        tam = gun >= 0.999
        dy = disk if tam else yol_op(_dilim_yolu(r * 1.05, 0.0, a_on), disk, 'kesisim')
        mf = None
        if dilim < 0.999:
            mf = acilma_radyal(e_io(dilim) * 0.85 + 0.15 * dilim, 0.0, 0.0, r, dalga=0.12, on=0.10,
                               tohum=tohum + 4)
        hareket = 0.0 < gun < 0.999
        amp = min(1.0, gun / 0.04) * min(1.0, (1.0 - gun) / 0.04) if hareket else 0.0

        def yf_on(X, Y, a_on=a_on, amp=amp):
            """Hareketli ön kenarın hemen gerisinde altın açılır (ışıklı ön)."""
            th = np.degrees(np.arctan2(X, -Y)) % 360.0
            dth = (a_on - th) % 360.0
            return 1.0 - 0.62 * amp * np.exp(-(dth / 7.0) ** 2)
        _lv(t, dy, M, altin, 0.46, maske_fn=mf, yog_fn=yf_on if hareket else None, islak=1.15, akis=0.18, tohum=tohum + 5)
        if hareket:
            # hareketli kenarda yumuşak parlak şerit (disk içinde): ışık + açık altın ton
            ux, uy = _saat_yon(a_on)
            c0 = M @ np.array([0.0, 0.0, 1.0])
            c1 = M @ np.array([ux * r, uy * r, 1.0])
            k = _kirp_noktalar([c0[0], c1[0]], [c0[1], c1[1]], 0.25 * r * s + 6)
            if not k.bos():
                xs = np.arange(k.x0, k.x0 + k.w, dtype=np.float32) + 0.5 - c0[0]
                ys = np.arange(k.y0, k.y0 + k.h, dtype=np.float32) + 0.5 - c0[1]
                vx, vy = c1[0] - c0[0], c1[1] - c0[1]
                Lr = math.hypot(vx, vy) + 1e-9
                ex, ey = vx / Lr, vy / Lr
                boy = xs[None, :] * ex + ys[:, None] * ey
                dik = -xs[None, :] * ey + ys[:, None] * ex
                if np.linalg.det(M[:2, :2]) < 0:
                    dik = -dik
                u = np.clip(boy / Lr, 0, 1)
                gen = (0.012 + 0.05 * u) * Lr
                ic = boy > 0
                m = (np.exp(-(dik / gen) ** 2) * smoothstep(0.02, 0.35, u) * (boy < Lr * 0.985) * ic)
                m = m.astype(np.float32)
                md = maske_ciz([disk], M, k)
                m *= md
                if on_yollar:
                    m *= 1.0 - 0.9 * np.clip(cv2.GaussianBlur(maske_ciz(on_yollar, M, k), (0, 0), 0.8) * 1.3, 0, 1)
                t.isik([], I3, '#FFF6D8', guc=0.85 * amp, yumusak=0.0, maske=(k, m))
                t.lavi([], I3, '#F9D97A', yog=0.22 * amp, maske=(k, cv2.GaussianBlur(m, (0, 0), 1.5)), kenar=0.0,
                       dalga=0.0, islak=0.0, gran=0.04, akis=0.0)
    # ---- 4) güneş diski -------------------------------------------------------------------------------------
    def yf(X, Y):
        d = np.sqrt(X * X + Y * Y) / max(r, 1e-6)
        return 0.72 + 0.35 * smoothstep(0.2, 1.0, d)
    t.lavi(disk, M, '#F6DB95', yog=0.48, kenar=1.2, dalga=0.04, islak=1.2,
           islak_gen=float(np.clip(r * s * 0.03, 2.0, 3.6)), gran=0.08, akis=0.18, yog_fn=yf, tohum=tohum + 6)
    t.sakla_ekle(disk, M, yumusak=0.9)
    # ---- 5) hale: göğün güneş çevresinde açık kalması -----------------------------------------------------
    if hale > 0.01:
        c = M @ np.array([0.0, 0.0, 1.0])
        R = r * s
        k = _kirp_noktalar([c[0] - 2.4 * R, c[0] + 2.4 * R], [c[1] - 2.4 * R, c[1] + 2.4 * R], 0)
        if not k.bos():
            xs = np.arange(k.x0, k.x0 + k.w, dtype=np.float32) + 0.5 - c[0]
            ys = np.arange(k.y0, k.y0 + k.h, dtype=np.float32) + 0.5 - c[1]
            d = np.sqrt(xs[None, :] ** 2 + ys[:, None] ** 2) / R
            m = (np.exp(-np.maximum(d - 0.95, 0) ** 2 / (2 * 0.38 ** 2)) * (d > 0.9)).astype(np.float32)
            m = cv2.GaussianBlur(m, (0, 0), max(1.0, 0.04 * R))
            t.lavi([], I3, '#F8E2B4', yog=0.16 * hale, maske=(k, m), kenar=0.0, dalga=0.0, islak=0.0, gran=0.04,
                   akis=0.0)
            t.sakla_ekle([], I3, yumusak=0.0, guc=0.55 * hale, maske=(k, m))
    c = M @ np.array([0.0, 0.0, 1.0])
    return dict(merkez=(float(c[0]), float(c[1])), r_ekran=r * s)


# ================================================================================================================
# 8) KALP NURU
# ================================================================================================================
def ciz_kalp_nuru(t: Tuval, M, r, parlaklik=1.0, isin=0.0, zaman=0.0, isin_ust=-80.0):
    """Göğüste sıcak altın nur (insandan SONRA çağrılır); isin 0..1 yukarı yükselen ışık sütunu. Döner: dict(merkez)."""
    M = np.asarray(M, np.float64)
    b = float(np.clip(parlaklik, 0, 1.5))
    if b <= 0.005 and isin <= 0.005:
        return None
    s = _olcek(M)
    c = M @ np.array([0.0, 0.0, 1.0])
    cx, cy = float(c[0]), float(c[1])
    R = r * s
    nabiz = 0.5 + 0.5 * math.sin(2 * math.pi * zaman / 1.7)
    bb = b * (0.88 + 0.12 * nabiz)
    Rp = R * (1.0 + 0.05 * nabiz)
    # ---- ışın sütunu (önce: çekirdek onun üstüne biner) ------------------------------------------------------
    if isin > 0.005:
        ie = e_out(min(1.0, isin))
        ust = cy - ie * (cy - isin_ust + 40)
        gen0 = R * 1.05
        gen1 = R * 2.1
        k = _kirp_noktalar([cx - gen1 * 3.4, cx + gen1 * 3.4], [ust - gen1 * 2, cy + R * 0.5], 0)
        if not k.bos():
            xs = np.arange(k.x0, k.x0 + k.w, dtype=np.float32) + 0.5 - cx
            ys = np.arange(k.y0, k.y0 + k.h, dtype=np.float32) + 0.5
            f = np.clip((cy - ys) / max(cy - isin_ust, 1.0), 0, 1)        # 0 kalpte, 1 yukarıda
            sig = (gen0 + (gen1 - gen0) * np.sqrt(f))[:, None]
            yan = np.exp(-(xs[None, :] ** 2) / (2 * sig ** 2))
            bas = smoothstep(0, 1, np.clip((ys - ust) / (R * 4.0), 0, 1))[:, None]   # yumuşak ön uç
            kok = smoothstep(cy + R * 0.3, cy - R * 1.2, ys)[:, None]
            # yükselen, çok yumuşak ışık dalgaları (titreşimsiz: yalnız zamanla kayar)
            dal = 1.0 + 0.12 * np.sin((ys[:, None] + zaman * 160.0) / (R * 2.6))
            m = (yan * bas * kok * dal * ie).astype(np.float32)
            # Önceden boyanmış figür (saklamadaki silüet: baş, omuz) ışında ağarıp hayaletleşmesin: orada parlatma
            # ölçülü, sıcak bir ışıltı olarak kalır; sütunun asıl parlaklığı SONRA boyanan gökte (kısmi saklama).
            sak = t.sakla_maske(k)
            on_k = 1.0 if sak is None else (1.0 - 0.6 * sak)
            yan2 = np.exp(-(xs[None, :] ** 2) / (2 * (sig * 0.45) ** 2))
            m2 = (yan2 * bas * kok * ie).astype(np.float32)
            t.lavi([], I3, '#F7DA94', yog=0.15, maske=(k, m), kenar=0.0, dalga=0.0, islak=0.0, gran=0.04, akis=0.0,
                   sakla=True)
            t.isik([], I3, '#FFE9B4', guc=0.50 * min(1.0, b + 0.3), yumusak=0.0, maske=(k, m * on_k))
            t.isik([], I3, '#FFF7E4', guc=0.32, yumusak=0.0, maske=(k, m2 * (on_k if sak is None else
                                                                                 1.0 - 0.75 * sak)))
            t.sakla_ekle([], I3, yumusak=0.0, guc=0.78, maske=(k, m))
            t.sakla_ekle([], I3, yumusak=0.0, guc=0.9, maske=(k, m2))
            # sütunda yükselen zerreler (sayı sabit: zerre sonradan belirip sıçramaz; sütunla birlikte solar)
            ciz_isik_zerreleri(t, I3, zaman, 14, (cx - gen1 * 1.2, ust + R * 2, cx + gen1 * 1.2, cy - R),
                               tohum=31, boyut=max(0.8, R * 0.075), hiz=0.45, guc=0.55 * smoothstep(0.0, 0.5, ie))
    if b <= 0.005:
        return dict(merkez=(cx, cy))
    # ---- çekirdek: katmanlı yumuşak ışık ---------------------------------------------------------------------
    k = _kirp_noktalar([cx - Rp * 6.5, cx + Rp * 6.5], [cy - Rp * 6.5, cy + Rp * 6.5], 0)
    if k.bos():
        return dict(merkez=(cx, cy))
    xs = np.arange(k.x0, k.x0 + k.w, dtype=np.float32) + 0.5 - cx
    ys = np.arange(k.y0, k.y0 + k.h, dtype=np.float32) + 0.5 - cy
    d2 = xs[None, :] ** 2 + ys[:, None] ** 2
    d = np.sqrt(d2) / Rp

    def g(sig):
        return np.exp(-d2 / (2 * (Rp * sig) ** 2)).astype(np.float32)
    hale = g(2.1)
    th = np.arctan2(ys[:, None], xs[None, :])
    isinlar = (0.5 + 0.5 * np.cos(8 * th + zaman * 0.5)) ** 8
    isinlar = (isinlar * g(3.0) * smoothstep(0.6, 1.6, d)).astype(np.float32)
    t.isik([], I3, '#FFD27E', guc=0.55 * bb, yumusak=0.0, maske=(k, hale))
    t.isik([], I3, '#FFE3A6', guc=0.32 * bb, yumusak=0.0, maske=(k, isinlar))
    t.isik([], I3, '#FFEBC0', guc=0.85 * bb, yumusak=0.0, maske=(k, g(1.0)))
    # altın sır: geniş açık gamboj (parlamış zemini ısıtır), ortada daha dolgun gamboj, okra halka
    t.lavi([], I3, '#F2C35A', yog=0.24 * bb, maske=(k, g(1.45)), kenar=0.0, dalga=0.0, islak=0.0, gran=0.05,
           akis=0.0, sakla=False)
    t.lavi([], I3, '#F0BC4C', yog=0.26 * bb, maske=(k, g(0.6)), kenar=0.0, dalga=0.0, islak=0.0, gran=0.05,
           akis=0.0, sakla=False)
    halka = (np.exp(-((d - 0.85) ** 2) / (2 * 0.25 ** 2)) * 0.5).astype(np.float32)
    t.lavi([], I3, '#DDA845', yog=0.14 * bb, maske=(k, halka), kenar=0.0, dalga=0.0, islak=0.0, gran=0.05,
           akis=0.0, sakla=False)
    t.isik([], I3, '#FFF3D6', guc=0.55 * bb, yumusak=0.0, maske=(k, g(0.5)))
    t.isik([], I3, '#FFFBEF', guc=0.85 * bb, yumusak=0.0, maske=(k, g(0.32)))
    # arka plan da ışık alsın (kısmi saklama)
    t.sakla_ekle([], I3, yumusak=0.0, guc=0.5 * min(1.0, bb), maske=(k, hale))
    return dict(merkez=(cx, cy))


# ================================================================================================================
# 9) ŞİKÂYET BULUTU
# ================================================================================================================
def _sikayet_sekli(rng):
    parcalar = [yol_elips(0, 4, 72, 34)]
    n = 10
    for j in range(n):
        a = 2 * math.pi * j / n + rng.uniform(-0.12, 0.12)
        rr = rng.uniform(22, 30)
        x = math.cos(a) * 70
        y = 4 + math.sin(a) * 30
        parcalar.append(yol_daire(x, y, rr))
    return _birlesim(*parcalar)


def _karalama(rng, rx, ry, n=380, adim=2.3):
    """Kalemle karalama: eğriliği rastgele değişen, elips içinde tutulan, ilmekli ve titrek yol."""
    p = np.array([rng.uniform(-0.3, 0.3) * rx, rng.uniform(-0.3, 0.3) * ry])
    th = rng.uniform(0, 2 * math.pi)
    kappa = rng.choice([-1.0, 1.0]) * rng.uniform(0.08, 0.17)
    pts = [p.copy()]
    for _ in range(n):
        if rng.random() < 0.035:
            kappa = -math.copysign(1.0, kappa) * rng.uniform(0.07, 0.24)
        if rng.random() < 0.02:          # ani kırık (sinirli kalem darbesi)
            th += rng.choice([-1.0, 1.0]) * rng.uniform(1.6, 2.6)
        th += kappa + rng.normal(0.0, 0.10)
        u, v = p[0] / rx, p[1] / ry
        rr = math.hypot(u, v)
        if rr > 0.80:
            hedef = math.atan2(-v * rx / ry, -u)
            dth = (hedef - th + math.pi) % (2 * math.pi) - math.pi
            th += dth * min(1.0, (rr - 0.80) * 2.2)
        p = p + adim * np.array([math.cos(th), math.sin(th) * 0.85])
        pts.append(p.copy())
    pts = np.array(pts)
    # titreklik: komşu noktalara dik küçük sapma
    tan = np.gradient(pts, axis=0)
    tan /= (np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9)
    nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
    j = np.convolve(rng.standard_normal(len(pts)), np.ones(2) / 2, mode='same')
    return pts + nor * (j * 0.75)[:, None]


def ciz_sikayet_bulutu(t: Tuval, M, olcek=1.0, olusum=1.0, kaldirma=0.0, zaman=0.0, tohum=0):
    """'şekva': başın üstünde gri karalamalı düşünce bulutu; olusum 0..1 oluşur, kaldirma 0..1 ıslak fırçayla kalkar."""
    ol = float(np.clip(olusum, 0, 1))
    ka = float(np.clip(kaldirma, 0, 1))
    if ol <= 0.0 or ka >= 1.0:
        return None
    rng = np.random.default_rng(tohum)
    yuksel = 26.0 * e_out(ka)
    gen = 1.0 + 0.10 * e_out(ka)
    M0 = M_bilesik(np.asarray(M, np.float64), M_olcek(olcek))
    Ml = M_bilesik(M0, M_oteleme(0, -yuksel), M_olcek(gen))
    sekil = _sikayet_sekli(rng)
    kab1 = yol_daire(-16, 76, 11.0)
    kab2 = yol_daire(-6, 108, 6.5)
    alt_yon = (0.25, -0.97)
    # ---- kaldırma: ıslak fırça soldan sağa geçer (yerel x + eğim), arkasında soluk iz kalır ----------------
    fr_x = -140.0 + 330.0 * e_io(min(1.0, ka / 0.80))
    kay = ((tohum * 131.7) % 1024, (tohum * 71.3) % 1024)
    from motor import _gurultu_yerel

    def silinen(X, Y):
        gx = _gurultu_yerel(X, Y, kay, 0.5)
        return 1.0 - smoothstep(fr_x - 30.0, fr_x + 8.0, X + 0.35 * Y + 16.0 * gx)

    hayalet = 0.30 * (1.0 - smoothstep(0.45, 0.95, ka))      # fırçanın ardında kalan soluk iz

    def kalan(m, X, Y):
        return m * (1.0 - (1.0 - hayalet) * silinen(X, Y))

    def erimis(m, X, Y):
        return m * silinen(X, Y)

    alfa = 1.0 - smoothstep(0.70, 1.0, ka)
    with t.gorunurluk(alfa, kalan if ka > 0 else None, M=Ml):
        # ---- karalamalar (önde) -------------------------------------------------------------------------
        g_kar = smoothstep(0.22, 1.0, ol)
        if g_kar > 0.003:
            yollar = []
            for j in range(3):
                r2 = np.random.default_rng(tohum * 5 + j)
                pts = _karalama(r2, 64 - j * 6, 30 - j * 3)
                pts[:, 1] += 5 + (j - 1) * 3.0
                pts[:, 0] += (j - 1) * 8
                pts[:, 0] += 0.8 * math.sin(zaman * 1.3 + j)
                pts[:, 1] += 0.6 * math.cos(zaman * 1.1 + j * 2)
                bas_ = j * 0.2
                gj = np.clip((g_kar - bas_) / (1.0 - bas_), 0, 1)
                nn = int(len(pts) * gj)
                if nn >= 3:
                    yollar.append(yol_egri(pts[:nn], kapali=False, gerilim=0.5))
            if yollar:
                t.lavi(yollar, Ml, '#56535F', yog=0.60, cizgi=1.35, kenar=0.5, dalga=0.05, islak=0.25,
                       islak_gen=1.2, gran=0.12, akis=0.18, tohum=tohum + 1)
                if ka > 0:
                    # ıslak fırçada çözülen grafit: yumuşak, açık gri bulanıklık
                    with t.gorunurluk(1.0 - smoothstep(0.3, 0.9, ka)):
                        t.lavi(yollar, Ml, '#77738A', yog=0.34, cizgi=3.6, yumusak=4.5, dalga=0.15, islak=0.0,
                               gran=0.12, akis=0.3, tohum=tohum + 2, maske_fn=erimis)
        # ---- bulut lavisi --------------------------------------------------------------------------------
        g_lv = e_out(np.clip((ol - 0.08) / 0.45, 0, 1))
        if g_lv > 0.003:
            ac = acilma_radyal(g_lv, 0, 4, 100, dalga=0.18, on=0.12, tohum=tohum + 3)
            t.lavi(sekil, Ml, '#A29DB0', yog=0.44, kenar=1.2, dalga=0.10, islak=1.15, islak_gen=2.8, gran=0.14,
                   akis=0.25, tohum=tohum + 4, maske_fn=ac)
            t.lavi(_golge(sekil, alt_yon, 20.0), Ml, '#827D96', yog=0.30, kenar=1.4, dalga=0.12, islak=0.8,
                   islak_gen=3.0, gran=0.14, akis=0.25, tohum=tohum + 5, maske_fn=ac)
            if ka > 0:
                # kaldırılan yerde yumuşak çiçeklenme lekesi ve sınırında geri akış halkası
                def halka_f(m, X, Y):
                    sl = silinen(X, Y)
                    return m * np.clip(4.0 * sl * (1 - sl), 0, 1)
                t.lavi(sekil, Ml, '#8D88A0', yog=0.32 * (1 - ka), yumusak=3.0, dalga=0.25, islak=0.0, gran=0.12,
                       akis=0.35, tohum=tohum + 6, maske_fn=halka_f)
            _sakla_acilma(t, sekil, Ml, ac if g_lv < 1.0 else None, yumusak=1.0)
        # ---- düşünce kabarcıkları -----------------------------------------------------------------------
        for j, kb in enumerate((kab2, kab1)):
            gk = smoothstep(0.0 + j * 0.08, 0.14 + j * 0.08, ol)
            if gk <= 0.01:
                continue
            with t.gorunurluk(gk):
                _lv(t, kb, Ml, '#A29DB0', 0.44, islak=1.1, tohum=tohum + 7 + j)
                _lv(t, _golge(kb, alt_yon, 4.0), Ml, '#827D96', 0.28, tohum=tohum + 9 + j)
                t.sakla_ekle(kb, Ml, yumusak=0.8)
    # ---- kaldırılırken çıkan taç yaprakları ---------------------------------------------------------------
    if ka > 0.15:
        renkler = [('#EDB0B2', '#D27F8D'), ('#F2BCA0', '#DE906F'), ('#F0C9C6', '#DC979D'), ('#EDB0B2', '#D27F8D')]
        for j in range(4):
            u = float(np.clip((ka - 0.16 - j * 0.07) / 0.62, 0, 1))
            if u <= 0:
                continue
            fade = 1.0 - smoothstep(0.70, 1.0, u)
            x0 = -44 + j * 28 + rng.uniform(-6, 6)
            y0 = 2 + rng.uniform(-10, 10)
            yon = rng.uniform(-0.6, 0.6)
            x = x0 + yon * 70 * u + 10 * math.sin(zaman * 1.8 + j * 1.7) * u
            y = y0 - 165 * e_out(u) - 15 * u
            aci = rng.uniform(0, 360) + 210 * u * (1 if j % 2 else -1) + 25 * math.sin(zaman * 2.1 + j)
            sz = 13.0 * (0.55 + 0.45 * e_out(min(1.0, u * 3)))
            pet = _yaprak(x - sz * 0.85, y, sz * 1.7, sz * 0.62, aci)[0]
            pet = yol_donustur(pet, M_bilesik(M_oteleme(x, y), M_donme(aci * 0.0), M_oteleme(-x, -y)))
            with t.gorunurluk(fade):
                _lv(t, pet, M0, renkler[j][0], 0.58, islak=1.2, tohum=tohum + 20 + j)
                _lv(t, _golge(pet, _isik_yerel(M0), sz * 0.40), M0, renkler[j][1], 0.36, tohum=tohum + 30 + j)
                t.sakla_ekle(pet, M0, yumusak=0.6)
    return None


# ================================================================================================================
# 10) IŞIK ZERRELERİ
# ================================================================================================================
def ciz_isik_zerreleri(t: Tuval, M, zaman, sayi, alan, tohum=0, boyut=1.0, renk_='#FFE3A3', guc=0.55, hiz=1.0):
    """Seyrek, yükselen sıcak ışık zerreleri; alan=(x0, y0, x1, y1) YEREL. Solma için sayi sabit, guc değişsin."""
    if sayi <= 0:
        return
    M = np.asarray(M, np.float64)
    rng = np.random.default_rng(tohum)
    x0, y0, x1, y1 = alan
    Hh = max(1.0, y1 - y0)
    s = _olcek(M)
    pts, sig_c, sig_h, gc = [], [], [], []
    for j in range(int(sayi)):
        bx = rng.uniform(x0, x1)
        faz = rng.random()
        v = rng.uniform(0.04, 0.10) * hiz          # alan yüksekliği / sn
        sal_a = rng.uniform(4, 14) * boyut
        sal_f = rng.uniform(0.25, 0.6)
        sal_p = rng.uniform(0, 2 * math.pi)
        kip_f = rng.uniform(0.4, 1.0)
        kip_p = rng.uniform(0, 2 * math.pi)
        sz = rng.uniform(0.7, 1.35)
        u = _frac(faz + zaman * v)                  # 0 altta doğar, 1 üstte söner
        y = y1 - u * Hh
        x = bx + sal_a * math.sin(2 * math.pi * sal_f * zaman + sal_p)
        a = smoothstep(0.0, 0.15, u) * (1.0 - smoothstep(0.80, 1.0, u))
        a *= 0.65 + 0.35 * (0.5 + 0.5 * math.sin(2 * math.pi * kip_f * zaman + kip_p))
        q = M @ np.array([x, y, 1.0])
        pts.append((q[0], q[1]))
        sig_c.append(max(0.7, 1.9 * boyut * sz * s))
        sig_h.append(max(2.0, 6.5 * boyut * sz * s))
        gc.append(a)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    pay = 4 * max(sig_h)
    k = _kirp_noktalar(xs, ys, pay)
    if k.bos():
        return
    mh = _gauss_maske(k, pts, sig_h, [g * 0.85 for g in gc])
    mc = _gauss_maske(k, pts, sig_c, gc)
    # guc yalnız parlatmayı değil, kısmi saklamayı ve tonu da ölçekler: guc -> 0 iken zerreler gökte iz bırakmaz
    kg = float(np.clip(guc / 0.55, 0.0, 1.0))
    if kg <= 0.0:
        return
    _parilti(t, k, mh, renk_=renk_, guc=guc * 0.9, sakla_guc=0.75 * kg, ton=0.32 * kg, ton_renk='#F4CC78')
    _parilti(t, k, mc, renk_='#FFF6DC', guc=guc, sakla_guc=0.9 * kg, ton=0.10 * kg, ton_renk='#F7DC9A')
