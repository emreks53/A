"""DOĞA ÖĞELERİ — Atölye S-146 dijital suluboya (motor.py üzerine).

Genel kurallar
--------------
* Her öğe ``ciz_xxx(t, M, ...)`` biçimindedir. ``t``: motor.Tuval, ``M``: yerel -> ekran 3x3 matrisi
  (ör. ``kamera.M() @ M_yerlestir(x, y, olcek)``). Yerel birim = zum 1'de ekran pikseli; **y aşağı**, "yukarı" = -y.
* Öğeler kendi içinde ÖNDEN ARKAYA boyar ve bitince silüetini tuvalin saklamasına yazar (``sakla_sonra=True``);
  sahne de öğeleri önden arkaya çağırmalıdır. Yağmur ve uçuşan yapraklar saklamaya yazmaz ve saklamaya uymaz
  (sahnenin en üstüne, en son çizilir).
* Bütün öğeler ``t.gorunurluk(alfa, maske_fn, M)`` bağlamına uyar (beliriş/solma için sarabilirsiniz).
* Deterministik: rastgelelik yalnız ``tohum``dan; zamanla değişen her şey parametreden (titreme yok).
* İçeride ``_Boya`` adlı yerel katman kullanılır: bir öğenin bütün geçişleri kendi kırpıntısında birikir
  (aynı lavi zinciri: kenar gürültüsü, ıslak kenar, granülasyon, akış; üst üste binen biçimler koyulaşır), sonunda
  tuvale tek seferde çarpılır. Böylece büyük öğeler hızlıdır.
* ``isik=(lx, ly)``: ışığa doğru birim yön (varsayılan sol-üst (-0.6, -0.8)); gölge sırları karşı yanda.

1. ciz_agac(t, M, buyume, sallanma=0.0, tohum=0, isik=(-0.6,-0.8), yaprak=1.0, damla=0.0, sakla_sonra=True)
   Fidandan güçlü ağaca sürekli büyüyen ağaç.
   * Orijin: gövde tabanı, zemin hizası (0,0); ağaç -y yönünde yükselir.
   * buyume 0..1: 0 = ~110 birim boyunda ince gövdeli, 5-6 yapraklı fidan; 0.15 fidan; 0.3 ilk dallar ve tek tek
     yapraklar + ilk kümeler; 0.5 genç ağaç (~560); 1.0 olgun ağaç (~950 boy, gövde tabanda ~70 genişlikte, kök
     genişlemesi ~2x, taç ~850x700). Dallar uzar, kalınlaşır (boru modeli), yeni dallar filizlenir, kümeler açar;
     sıçrama yok (ardışık kareler sürekli).
   * sallanma -1..1: rüzgârla eğilme (+ sağa). Genç ağaç daha çok eğilir. Sahnede ör. 0.5 + 0.15*sin(2πft).
   * yaprak 0..1: yaprak yoğunluğu (rüzgârda yaprak kaybı; 0 = çıplak dallar).
   * damla 0..1: ıslaklık (renkler biraz doygun + küme altlarında asılı su damlaları).
   * Döner: dict(merkez=(x,y) taç merkezi [ekran], kutu=(x0,y0,x1,y1) taç sınırı [ekran], tepe=(x,y) en üst nokta,
     taban=(x,y) gövde tabanı [ekran], olcek=iç yapı ölçeği, govde_r=gövde taban yarıçapı [yerel]).

2. ciz_kokler(t, M, buyume, derinlik=1.0, tohum=0, isik=..., sakla_sonra=True)
   Aynı ağacın kökleri (toprak kesitinde gösterilmek üzere). Orijin: gövde tabanı (ağaçla aynı M); kökler +y'ye iner.
   * buyume: ağacınkiyle aynı (kalınlık ve yayılım ağaçla uyumlu). Olgun: ~±500 yana, ~450 derine.
   * derinlik 0..1: köklerin ilerlemesi (ana kökler -> yan kökler -> kılcal kökler ve kök tüyleri sırayla uzar).
   * Kesitte önce ciz_kokler, SONRA ciz_toprak_kesiti çağırın (kökler saklamada kalır, toprak çevrelerine boyanır).
   * Döner: dict(kutu=(x0,y0,x1,y1) [ekran]).

3. ciz_toprak_kesiti(t, M, x0, x1, y_zemin, y_alt, tohum=0, cimen=True, sakla_sonra=True)
   Kurzgesagt tarzı kesit: yerel dikdörtgen [x0,x1] x [y_zemin, y_alt]; üstte koyu humus, ortada sıcak siena, altta
   açık okra katmanlar (dalgalı sınırlar, ıslak kenarlar), çakıllar (gölge sırlı), ince katman çizgileri, üst
   kenarda ince çimen çizgisi, alt kenar solarak biter. Döner: dict(kutu=...).

4. ciz_firtina_bulutu(t, M, cx, cy, gen, yuk, koyuluk=1.0, gelis=1.0, tohum=0, yon=0.0, sakla_sonra=True)
   Islak-üstüne-ıslak fırtına bulutu. (cx,cy) gövde merkezi; gen x yuk kabaca genişlik/yükseklik (üst loblar cy-yuk
   kadar yükselir, taban ~cy+0.4*yuk). Net ışıklı üst kenar, yumuşak dağılan taban, koyu karın, lob gölgeleri,
   geri akış (çiçeklenme) halkaları.
   * koyuluk 0..1: 1 koyu çivit-mor fırtına, 0 açık mavi-gri yağmur bulutu (sürekli geçiş; boyayarak animasyon).
   * gelis 0..1: bulutun kendini boyaması (merkezden organik yayılma, karın ve koyu vurgular sonra gelir);
     yon -1/+1 verilirse aynı sırada soldan/sağdan kayarak gelir (0 = kaymaz).
   * Döner: dict(kutu=..., taban_y=..., merkez=...) [ekran].

5. ciz_yagmur(t, M, zaman, yogunluk, alan=(x0,y0,x1,y1), ruzgar=0.0, tohum=0, zemin_y=None, korunan=None,
              hiz=2300, renk_='#6F7F9E', yog=0.5)
   İnce, saydam mavi-gri fırça izi damlalar (uzak/yakın iki katman, farklı boy ve kalınlık); konumlar ``zaman``
   (saniye) ile sürekli ilerler. yogunluk 0..1.5; ruzgar -1..1 (eğim, + sağa). zemin_y: damlalar burada biter,
   küçük sıçrama halkaları ve damlacıklar (yerel). korunan=(cx,cy,r) yerel: koruyucu nur küresi — damlalar yüzeyde
   biter (çizgi küre sınırında kesilir), yanından geçenler hafifçe dışa sapar, yakındakiler ışıkta erir, değdiği
   yerde kısa altın-beyaz parıltı. Saklamaya yazmaz/uymaz. Döner: dict(sayi=görünen damla).

6. ciz_ucusan_yapraklar(t, M, zaman, sayi, alan=(x0,y0,x1,y1), ruzgar=1.0, tohum=0, tur='yaprak'|'tac',
                        boyut=1.0, renkler=None, yog=0.5)
   Rüzgârda takla atarak savrulan yapraklar (tur='yaprak') ya da taç yaprakları ('tac'). ruzgar işareti yönü,
   büyüklüğü hızı verir. Alan dışına çıkan öbür yandan girer (kenarda yumuşak beliriş). Saklamasız. Döner: None.

7. ciz_cicek_fidani(t, M, x, y, boy, renk_='allik', acilma=0.0, sallanma=0.0, solgunluk=0.0, tohum=0, isik=...,
                    sakla_sonra=True)
   Şakayık/gül fidanı: (x,y) zemindeki taban; boy = en uzun çiçeğin yüksekliği (yerel). 1-3 çiçek
   (elemanlar.sakayik), kapalı tomurcuklar, yapraklı saplar, 3'lü bileşik yapraklar (ön kat açık, arka kat koyu).
   renk_: 'allik' | 'seftali' | 'beyaz' | 'gul'.
   * acilma 0..1 (sürekli): 0 kapalı tomurcuklar; tomurcuk şişer, çanaklar ayrılır; çiçek merkezden radyal açılır
     (tomurcuk içinde erir); 1 tam açık. Çiçekler kendi aralarında biraz gecikmeli açar.
   * sallanma -1..1 rüzgâr; solgunluk 0..1 yağmurda hafif sarkma (saplar ve başlar eğilir, yapraklar düşer).
   * Döner: dict(cicekler=[((x,y) ekran merkez, yarıçap_ekran, açılma), ...], kutu=...). (Damla-çiçek eşleşmesi için.)

8. Zemin öğeleri (meydan-ı imtihan geniş planı ve bahçe):
   * ciz_yol(t, M, noktalar, genislik, tohum=0, daralma=0.88): noktalar yakından (geniş) uzağa (dar) yol omurgası
     (yerel). genislik: yakın uçtaki tam genişlik (skaler; uzakta (1-daralma) katına iner) ya da nokta başına liste.
     Kum renkli lavi, kenar sırları, yürünmüş izler, küçük taşlar. Döner: dict(omurga=[(x,y) ekran, ...]).
   * ciz_tas(t, M, x, y, r, tohum=0, isik=..., yass=1.0): (x,y) zemindeki taban ortası; r yarıçap (genişlik ~2.4r,
     yükseklik ~0.85r*yass). Gölge sırrı, taban teması, ince çatlak, zemine düşen lavanta gölge. Döner: dict(tepe=...).
   * ciz_dere(t, M, noktalar, genislik, zaman=0.0, tohum=0, daralma=0.6, taslar=0.5, tas_sayi=3): akarsu omurgası
     (yerel), genişlik (skaler/ liste). Akışla ilerleyen ışık dalgacıkları (kâğıt beyazı), derin orta, kıyı bantları,
     omurga boyunca ``taslar`` (0..1) konumunda enine dizili basamak taşları ve çevrelerinde akış izi.
     Döner: dict(taslar=[(x,y) ekran], omurga=[...]).
   * ciz_cimen(t, M, x0, x1, y, yogunluk=1.0, sallanma=0.0, tohum=0, boy=(14,34)): y zemin çizgisi boyunca çimen
     tutamları (boy aralığı yerel birim; yakın plan için büyütün). sallanma -1..1.
   * ciz_tarh(t, M, x0, x1, y, tohum=0, yuk=None, bolum='hepsi'|'on'|'arka'): koyu, zengin topraklı tarh; y =
     bitkilerin dikildiği üst yüzey çizgisi, yuk = tarh kalınlığı (varsayılan ~0.09*(x1-x0)). Bitkiler tarhın
     İÇİNDE dursun diye: önce bolum='on' (ön dudak), sonra bitkiler, sonra bolum='arka'. Döner: dict(ust_y=...).
   * ciz_yokus(t, M, x0, x1, taban, tepe_x, tepe_y, tohum=0, isik=..., renk1, renk2, cimen=True): dik yokuş/tepe
     (solda dik yamaç, (tepe_x,tepe_y) doruk, x1'e doğru yavaş iniş); ışıklı ve gölge yamaç, çimen izleri; etekte
     (taban) ovaya yumuşakça karışır. Döner: dict(tepe=..., siluet=[...]).
   * ciz_cayir(t, M, x0, y0, x1, y1, tohum=0, ufuk_y=None, renk_uzak, renk_yakin, leke=True): ova/çayır zemini;
     ufka (ufuk_y, varsayılan y0) doğru açılan havadar degrade + yumuşak yeşil lekeler. Üstündeki her şeyden sonra
     çağırın (saklamaya yazar, gök arkasına karışmaz).

Denemeler: testler/doga_*_test.py (çıktılar scratchpad/testler/*.png).

Hız (1080x1920, tek çekirdek, yüklü makinede ölçüldü): olgun ağaç tam boy (950 px) ~0.25 s, 0.4-0.6 ölçekte
0.05-0.12 s, ekranı dolduran yakın plan (zum 3.5) ~0.6 s; kökler ~0.05; toprak kesiti ~0.11; fırtına bulutu (900 px)
~0.15; yağmur (tam ekran) ~0.1; uçuşan yapraklar ~0.1; fidan ~0.06; yol ~0.18; dere ~0.05; çayır ~0.1-0.15;
taş/çimen ~0.01-0.03.
"""
from __future__ import annotations

import math

import cv2
import numpy as np
import skia

from motor import (Tuval, Kirp, W, H, N, yollar_kirp, yol_cokgen, yol_daire, yol_elips, yol_dikdortgen, yol_op,
                   M_bilesik, M_oteleme, M_olcek, renk, smoothstep, sstep, _skmat, _doku_ornekle, _genis_bulanik,
                   G_KENAR, G_AKIS, GRAN, nokta_donustur)
import elemanlar as EL

# ================================================================================================================
# yerel boyama katmanı: bir nesnenin bütün geçişleri kendi kırpıntısında birikir, tuvale tek seferde basılır
# ================================================================================================================


def _kirp_kes(a: Kirp, b: Kirp) -> Kirp:
    x0, y0 = max(a.x0, b.x0), max(a.y0, b.y0)
    x1, y1 = min(a.x0 + a.w, b.x0 + b.w), min(a.y0 + a.h, b.y0 + b.h)
    return Kirp(x0, y0, max(0, x1 - x0), max(0, y1 - y0))


def _poly(pts, kapali=True):
    """numpy (n,2) -> skia.Path (düz parçalar, hızlı)."""
    p = skia.Path()
    if len(pts) < 2:
        return p
    p.addPoly([skia.Point(float(x), float(y)) for x, y in pts], kapali)
    return p


def _rast(yollar, M, k: Kirp, toplam=False, alfalar=None, cizgi=None, gradyanlar=None):
    """Yolları A8 maskeye çizer. toplam=True: üst üste binen yollar toplanır (en çok 8 kat), alfalar: yol başına
    ağırlık, gradyanlar: yol başına (x0, y0, x1, y1, a0, a1) yerel doğrusal ağırlık geçişi ya da None."""
    s = skia.Surface.MakeRaster(skia.ImageInfo.MakeA8(k.w, k.h))
    c = s.getCanvas()
    c.setMatrix(_skmat(M_oteleme(-k.x0, -k.y0) @ M))
    p = skia.Paint(AntiAlias=True)
    if cizgi is not None:
        p.setStyle(skia.Paint.kStroke_Style)
        p.setStrokeWidth(float(cizgi))
        p.setStrokeCap(skia.Paint.kRound_Cap)
        p.setStrokeJoin(skia.Paint.kRound_Join)
    if toplam:
        p.setBlendMode(skia.BlendMode.kPlus)
    for i, y in enumerate(yollar):
        a = 1.0 if alfalar is None else float(alfalar[i])
        if a <= 0.004:
            continue
        gr = None if gradyanlar is None else gradyanlar[i]
        if gradyanlar is not None and gr is None:
            gr = (0, 0, 1, 0, 1.0, 1.0)
        if gr is not None:
            x0, y0, x1, y1, a0, a1 = gr
            p.setShader(skia.GradientShader.MakeLinear(
                [skia.Point(float(x0), float(y0)), skia.Point(float(x1), float(y1))],
                [skia.Color4f(0, 0, 0, float(min(1, max(0, a0)))).toColor(),
                 skia.Color4f(0, 0, 0, float(min(1, max(0, a1)))).toColor()]))
        p.setAlphaf(min(1.0, a * (0.125 if toplam else 1.0)))
        c.drawPath(y, p)
    a = s.makeImageSnapshot().toarray().astype(np.float32)
    a *= (8.0 / 255.0) if toplam else (1.0 / 255.0)
    return a


class _Boya:
    """Bir nesnenin yerel boyaması. Geçişler (lavi) nesne kırpıntısındaki geçirgenlik tamponunda (T) birikir;
    nesne içi saklama S ile önden arkaya boyanır; bitir() tuvale bir kez çarpar (tuvalin saklaması ve görünürlük
    yığını uygulanır) ve silüeti tuvalin saklamasına yazar. Motorun lavi zincirinin aynısı (eşik + kenar
    gürültüsü, ıslak kenar, granülasyon, akış), ama tek kırpıntıda ve üst üste binen biçimlerin koyulaşmasıyla."""

    def __init__(self, t: Tuval, M, kirp: Kirp, tohum=0, olcek_doku=1.0):
        self.t, self.M, self.k = t, np.asarray(M, np.float64), kirp
        self.Mi = np.linalg.inv(self.M)
        h, w = kirp.h, kirp.w
        self.T = np.ones((3, h, w), np.float32)  # düzlemsel geçirgenlik (kanal başına bitişik)
        self.S = np.zeros((h, w), np.float32)
        self.SIL = np.zeros((h, w), np.float32)
        self.DEL = None  # gerçek boşluklar (ör. taçtaki gök delikleri): nesne içinde boyanmaz, silüete de girmez
        self.olc = 1.0 / max(1e-6, olcek_doku)
        self.kay = ((tohum * 197.3 + 11) % N, (tohum * 89.7 + 7) % N)
        self._gk = self._ga = self._gr = self._xy = None

    # -- tembel dokular -------------------------------------------------------------------------------------
    @property
    def gk(self):
        if self._gk is None:
            k = self.k
            self._gk = _doku_ornekle(G_KENAR, self.Mi, k.x0, k.y0, k.w, k.h, self.olc, self.kay)
        return self._gk

    def _yumusak_doku(self, doku, olc, kay, f=4):
        """Düşük frekanslı dokuyu 1/f çözünürlükte örnekleyip büyütür (hız)."""
        k = self.k
        w, h = max(2, (k.w + f - 1) // f), max(2, (k.h + f - 1) // f)
        A = np.array([[f, 0, k.x0 + 0.5 * f - 0.5], [0, f, k.y0 + 0.5 * f - 0.5], [0, 0, 1]], np.float64)
        S = np.array([[olc, 0, kay[0]], [0, olc, kay[1]], [0, 0, 1]], np.float64)
        T = S @ self.Mi @ A
        sm = cv2.warpAffine(doku, T[:2].astype(np.float32), (w, h), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                            borderMode=cv2.BORDER_WRAP)
        big = cv2.resize(sm, (w * f, h * f), interpolation=cv2.INTER_LINEAR)
        return np.ascontiguousarray(big[:k.h, :k.w])

    @property
    def ga(self):
        if self._ga is None:
            self._ga = self._yumusak_doku(G_AKIS, self.olc, (self.kay[1], self.kay[0]))
        return self._ga

    @property
    def gr(self):
        if self._gr is None:
            self._gr = self._yumusak_doku(G_AKIS, self.olc * 0.55, (self.kay[0] * 0.37 + 300, self.kay[1] * 0.61 + 500))
        return self._gr

    def xy_dilim(self, sl):
        """Alt kırpıntının nesne-yerel koordinatları (X, Y)."""
        k, Mi = self.k, self.Mi
        xs = (np.arange(sl[1].start, sl[1].stop, dtype=np.float32) + k.x0 + 0.5)[None, :]
        ys = (np.arange(sl[0].start, sl[0].stop, dtype=np.float32) + k.y0 + 0.5)[:, None]
        X = np.float32(Mi[0, 0]) * xs + np.float32(Mi[0, 1]) * ys + np.float32(Mi[0, 2])
        Y = np.float32(Mi[1, 0]) * xs + np.float32(Mi[1, 1]) * ys + np.float32(Mi[1, 2])
        return X, Y

    def alt(self, yollar, Mloc, pay):
        kk = _kirp_kes(yollar_kirp(yollar, Mloc, pay), self.k)
        oy, ox = kk.y0 - self.k.y0, kk.x0 - self.k.x0
        return kk, (slice(oy, oy + kk.h), slice(ox, ox + kk.w))

    # -- geçiş ------------------------------------------------------------------------------------------------
    def _tmp(self, i, shape):
        """Geçici tampon (kırpıntı boyunda, yeniden kullanılır)."""
        if not hasattr(self, '_tamp'):
            self._tamp = {}
        key = (i, len(shape))
        buf = self._tamp.get(key)
        if buf is None:
            buf = np.empty((self.k.h, self.k.w) + tuple(shape[2:]), np.float32)
            self._tamp[key] = buf
        return buf[:shape[0], :shape[1]]

    def _carpan(self, tur, miktar, sl):
        """(1 + miktar*doku) çarpanı, nesne başına önbellekli (granülasyon ekrana, akış nesneye bağlı)."""
        if not hasattr(self, '_carp'):
            self._carp = {}
        key = (tur, round(float(miktar), 4))
        c = self._carp.get(key)
        if c is None:
            if tur == 'gran':
                c = np.clip(1.0 + miktar * GRAN[self.k.dilim], 0.2, 2.2).astype(np.float32)
            else:
                c = np.clip(1.0 + miktar * self.ga, 0.3, 1.9).astype(np.float32)
            self._carp[key] = c
        return c[sl]

    def lavi(self, yollar, renk_, yog=0.5, Mloc=None, kenar=1.0, dalga=0.08, islak=0.8, islak_gen=3.0, gran=0.10,
             akis=0.15, yumusak=0.0, cizgi=None, toplam=False, alfalar=None, ust=0.8, renk2=None, karisim=None,
             yog_fn=None, sakla=True, siluet=True, pay=None, esik=True, gradyanlar=None, isik_kenar=None):
        """toplam: üst üste binen yollar koyulaşır (her biri kendi ıslak kenarıyla). alfalar: yol ağırlıkları.
        gradyanlar: yol başına doğrusal ağırlık geçişi (yavaş). isik_kenar=(dx, dy, miktar): ekran pikseli
        cinsinden ışık yönü kaydırması; her biçimin ışığa bakan kenar bandı açık kalır (hızlı hacim). renk2 + karisim ('akis' ya da f(X,Y)->0..1): iki pigment
        ıslak karışımı. yog_fn(X,Y): nesne yerelinde yoğunluk çarpanı. Döner: (dilim, kenar maskesi) ya da None."""
        if isinstance(yollar, skia.Path):
            yollar = [yollar]
        if not yollar:
            return None
        Mloc = self.M if Mloc is None else Mloc
        if pay is None:
            pay = 3 * max(kenar, yumusak, 1.0) + islak_gen + 5
        kk, sl = self.alt(yollar, Mloc, pay)
        if kk.bos():
            return None
        if toplam or alfalar is not None or gradyanlar is not None:
            Wm = _rast(yollar, Mloc, kk, toplam=toplam, alfalar=alfalar, cizgi=cizgi, gradyanlar=gradyanlar)
            if Wm.max() <= 1e-3:
                return None
            if alfalar is None and gradyanlar is None:
                G = np.minimum(Wm, 1.0)
            else:
                G = _rast(yollar, Mloc, kk, cizgi=cizgi)
        else:
            G = _rast(yollar, Mloc, kk, cizgi=cizgi)
            Wm = None
            if G.max() <= 1e-3:
                return None
        shp = G.shape
        if yumusak > 0:
            mb = cv2.GaussianBlur(G, (0, 0), yumusak) if yumusak < 12 else _genis_bulanik(G, yumusak)
            if dalga > 0:
                t1 = np.multiply(self.gk[sl], dalga * 1.5, out=self._tmp(0, shp))
                t1 += 1.0
                mb *= t1
            np.clip(mb, 0, 1, out=mb)
            m2 = mb
        else:
            mb = cv2.GaussianBlur(G, (0, 0), kenar) if kenar > 0.05 else G.copy()
            if dalga > 0:
                t1 = np.subtract(1.0, mb, out=self._tmp(0, shp))
                t1 *= mb
                t1 *= 4.0 * dalga
                t1 += 0.02 * dalga
                t1 *= self.gk[sl]
                mb += t1
            if esik:
                g_ = 0.16 + 0.05 * kenar
                mb -= 0.5 - g_
                mb *= 1.0 / (2 * g_)
                np.clip(mb, 0, 1, out=mb)
                t1 = np.multiply(mb, mb, out=self._tmp(0, shp))
                mb *= -2.0
                mb += 3.0
                mb *= t1
            else:
                np.clip(mb, 0, 1, out=mb)
            m2 = mb
        kapsama = m2
        if Wm is not None:
            D = cv2.GaussianBlur(Wm, (0, 0), max(0.6, kenar * 0.8))
            if alfalar is not None or gradyanlar is not None:
                kapsama = np.minimum(D, 1.0)
                kapsama *= m2
            if toplam and ust > 0:
                t1 = np.subtract(D, 1.0, out=self._tmp(0, shp))
                np.maximum(t1, 0.0, out=t1)
                t1 *= ust
                np.minimum(D, 1.0, out=D)
                D += t1
            else:
                np.minimum(D, 1.0, out=D)
            D *= m2
        else:
            D = m2.copy()
        if isik_kenar is not None:
            dx, dy, mik = isik_kenar
            dx, dy = int(round(dx)), int(round(dy))
            src = Wm if Wm is not None else G
            sh = np.zeros_like(src)
            hh, ww = src.shape
            # sh(p) = src(p + (dx, dy))
            ys0, ys1 = max(0, -dy), min(hh, hh - dy)
            xs0, xs1 = max(0, -dx), min(ww, ww - dx)
            if ys1 > ys0 and xs1 > xs0:
                sh[ys0:ys1, xs0:xs1] = src[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx]
            np.subtract(src, sh, out=sh)
            np.clip(sh, 0, 1, out=sh)
            sg = max(1.0, 0.45 * math.hypot(dx, dy))
            sh = cv2.GaussianBlur(sh, (0, 0), sg) if sg < 8 else _genis_bulanik(sh, sg)
            sh *= -mik
            sh += 1.0
            D *= sh
        if islak > 0:
            b = cv2.GaussianBlur(D, (0, 0), islak_gen)
            np.subtract(D, b, out=b)
            b *= 2.2
            np.clip(b, 0, 1, out=b)
            b *= islak
            b += 1.0
            D *= b
        if gran > 0:
            D *= self._carpan('gran', gran, sl)
        if akis > 0:
            D *= self._carpan('akis', akis, sl)
        if yog_fn is not None:
            X, Y = self.xy_dilim(sl)
            D *= yog_fn(X, Y)
        D *= yog
        if sakla:
            t1 = np.subtract(1.0, self.S[sl], out=self._tmp(0, shp))
            D *= t1
        np.clip(D, 0.0, 1.0, out=D)
        C = renk(renk_)
        a = (C - 1.0).astype(np.float32)
        t1 = self._tmp(0, shp)
        if renk2 is not None:
            if karisim is None or karisim == 'akis':
                if not hasattr(self, '_kf'):
                    self._kf = smoothstep(-0.9, 0.9, self.gr).astype(np.float32)
                f = self._kf[sl]
            else:
                X, Y = self.xy_dilim(sl)
                f = np.clip(np.broadcast_to(karisim(X, Y), shp), 0, 1).astype(np.float32)
            bb = (renk(renk2) - C).astype(np.float32)
            for c in range(3):
                np.multiply(f, bb[c], out=t1)
                t1 += a[c]
                t1 *= D
                t1 += 1.0
                self.T[c][sl] *= t1
        else:
            for c in range(3):
                np.multiply(D, a[c], out=t1)
                t1 += 1.0
                self.T[c][sl] *= t1
        if siluet:
            if self.DEL is not None:
                t1 = np.subtract(1.0, self.DEL[sl], out=self._tmp(0, shp))
                t1 *= kapsama
                np.maximum(self.SIL[sl], t1, out=self.SIL[sl])
            else:
                np.maximum(self.SIL[sl], kapsama, out=self.SIL[sl])
        kr = getattr(self, '_kir', None)
        y0_, y1_, x0_, x1_ = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        self._kir = (y0_, y1_, x0_, x1_) if kr is None else (min(kr[0], y0_), max(kr[1], y1_), min(kr[2], x0_),
                                                              max(kr[3], x1_))
        return (sl, kapsama)

    def sakla(self, iz, yumusak=0.6):
        """iz: lavi()'nin döndürdüğü (dilim, maske)."""
        if iz is None:
            return
        sl, m = iz
        if yumusak > 0:
            m = cv2.GaussianBlur(m, (0, 0), yumusak)
        np.maximum(self.S[sl], m, out=self.S[sl])

    def sakla_yol(self, yollar, Mloc=None, yumusak=0.6, delik=False):
        """Yolları nesne içi saklamaya yazar. delik=True: gerçek boşluk (arkadaki sahne görünür; sonraki geçişlerin
        silüetine de girmez). delik=False: kâğıt beyazı vurgu (silüet içinde kalır)."""
        Mloc = self.M if Mloc is None else Mloc
        if isinstance(yollar, skia.Path):
            yollar = [yollar]
        kk, sl = self.alt(yollar, Mloc, 3 + 3 * yumusak)
        if kk.bos():
            return
        m = _rast(yollar, Mloc, kk)
        self.sakla((sl, m), yumusak)
        if delik:
            if self.DEL is None:
                self.DEL = np.zeros_like(self.S)
            if yumusak > 0:
                m = cv2.GaussianBlur(m, (0, 0), yumusak)
            np.maximum(self.DEL[sl], m, out=self.DEL[sl])

    def isik(self, yollar, renk_, guc=0.5, yumusak=2.0, Mloc=None):
        """Küçük parıltı (screen) — tamponda değil, bitir()'den sonra çağrılmak üzere listeye eklenir."""
        Mloc = self.M if Mloc is None else Mloc
        if not hasattr(self, '_isiklar'):
            self._isiklar = []
        self._isiklar.append((yollar, Mloc, renk_, guc, yumusak))

    def bitir(self, sakla_sonra=True, sakla_global=True, siluet_yumusak=0.7):
        t, k = self.t, self.k
        # yalnız boyanan bölge (geçişlerin kirlettiği kutu)
        kr = getattr(self, '_kir', None)
        if kr is not None:
            y0, y1, x0, x1 = kr
            kk = Kirp(k.x0 + x0, k.y0 + y0, x1 - x0, y1 - y0)
            T = cv2.merge([np.ascontiguousarray(self.T[c, y0:y1, x0:x1]) for c in range(3)])
            SIL = self.SIL[y0:y1, x0:x1]
            vis = None
            if sakla_global and t.saklama is not None:
                vis = 1.0 - t.saklama[kk.dilim]
            if t._yigin:
                v0 = vis if vis is not None else np.ones((kk.h, kk.w), np.float32)
                vis = t._yigin_maske(v0, kk) * t._yigin_alfa()
            hedef = t.R[kk.dilim]
            if vis is None:
                hedef *= T
            else:
                T -= 1.0
                T *= vis[..., None]
                T += 1.0
                hedef *= T
            if sakla_sonra:
                t.sakla_ekle([], self.M, yumusak=siluet_yumusak, maske=(kk, np.ascontiguousarray(SIL)))
        for (yollar, Mloc, renk_, guc, yumusak) in getattr(self, '_isiklar', []):
            t.isik(yollar, Mloc, renk_, guc=guc, yumusak=yumusak)


def _boya_ac(t, M, yollar_kutu, pay=12, tohum=0):
    """Yerel kutudan (x0,y0,x1,y1 yerel) ekran kırpıntısı ve _Boya; ekran dışıysa None."""
    x0, y0, x1, y1 = yollar_kutu
    k = yollar_kirp([yol_dikdortgen(x0, y0, x1, y1)], M, pay)
    if k.bos():
        return None
    return _Boya(t, M, k, tohum)


# ================================================================================================================
# küçük geometri yardımcıları
# ================================================================================================================
def _serit_np(om, gen):
    """omurga (n,2) ve yarı genişlikler (n,) -> kapalı çokgen noktaları (yuvarlak uçlu)."""
    om = np.asarray(om, np.float64)
    n = len(om)
    if n < 2:
        return None
    tan = np.gradient(om, axis=0)
    tan /= (np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9)
    nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
    g = np.asarray(gen, np.float64)[:, None]
    sol = om + nor * g
    sag = om - nor * g
    # uç: yarım daire
    a = np.linspace(0, math.pi, 7)[1:-1]
    tu, nu, gu = tan[-1], nor[-1], g[-1, 0]
    uc = [om[-1] + (nu * math.cos(x) + tu * math.sin(x)) * gu for x in a]
    return np.concatenate([sol, np.array(uc).reshape(-1, 2), sag[::-1]], 0)


def _yaprak_np(x, y, L, gen, aci, kivrim=0.0, n=10):
    """Sivri uçlu yaprak noktaları (taban x,y; aci derece, 0 = +x)."""
    a = math.radians(aci)
    ux, uy = math.cos(a), math.sin(a)
    nx, ny = -uy, ux
    u = np.linspace(0, 1, n + 1)
    w = gen * np.sin(u * math.pi) ** 0.8 * (1 - 0.3 * u)
    k = kivrim * np.sin(u * math.pi) * L
    px = x + ux * L * u + nx * k
    py = y + uy * L * u + ny * k
    sol = np.stack([px + nx * w, py + ny * w], 1)
    sag = np.stack([px - nx * w, py - ny * w], 1)[::-1][1:-1]
    return np.concatenate([sol, sag], 0)


# ================================================================================================================
# 1. AĞAÇ
# ================================================================================================================
_AGAC_IS = {}

_G_IZGARA = np.linspace(0.0, 1.0, 1001)


def _lider_boy(g, L0):
    g = np.clip(g, 0.0, 1.0)
    return L0 * (0.26 + 0.74 * (1.0 - (1.0 - g) ** 1.8))


def _agac_olcek(g):
    g = min(1.0, max(0.0, g))
    return 0.42 + 0.58 * g ** 0.9


def _govde_r(g):
    """Gövde taban yarıçapı (yerel birim, kök genişlemesi hariç)."""
    g = min(1.0, max(0.0, g))
    return 2.3 + 32.7 * g ** 1.35


class _Dal:
    __slots__ = ('ana', 's_ana', 'a0', 'dth', 'dl', 'L', 'g0', 'dg', 'der', 'esnek', 'cocuk')

    def boy(self, g):
        if self.ana < 0:
            return float(_lider_boy(g, self.L))
        u = (g - self.g0) / self.dg
        if u <= 0:
            return 0.0
        if u >= 1:
            return self.L
        return self.L * (1.0 - (1.0 - u) ** 2.2)

    def boylar(self, gs):
        if self.ana < 0:
            return _lider_boy(gs, self.L)
        u = np.clip((gs - self.g0) / self.dg, 0.0, 1.0)
        return self.L * (1.0 - (1.0 - u) ** 2.2)


def _ilk_gecis(dal, s):
    """dal'ın boyunun s'yi geçtiği g (g=0'da zaten geçmişse -1)."""
    b = dal.boylar(_G_IZGARA)
    if b[0] >= s:
        return -1.0
    i = int(np.searchsorted(b, s))
    return float(_G_IZGARA[i]) if i < len(_G_IZGARA) else 1.5


def _kume_sekli(rng, n=140):
    """Birim yarıçaplı yaprak kümesi (taraklı kenar): (n,2)."""
    lob = int(rng.integers(8, 13))
    f = rng.uniform(0, 2 * math.pi, 5)
    a = np.linspace(0, 2 * math.pi, n, endpoint=False)
    b = np.abs(np.sin(lob * a / 2 + f[0])) ** 0.5
    b2 = np.abs(np.sin((lob + 7) * a / 2 + f[1])) ** 0.7
    r = (0.87 + 0.09 * b + 0.04 * b2) * (1 + 0.07 * np.sin(2 * a + f[2]) + 0.05 * np.sin(3 * a + f[3]))
    sx = rng.uniform(1.0, 1.12)
    pts = np.stack([np.cos(a) * r * sx, np.sin(a) * r * 0.95], 1)
    pts[:, 1] = np.where(pts[:, 1] > 0, pts[:, 1] * 0.9, pts[:, 1])
    return pts


def _agac_iskelet(tohum):
    if tohum in _AGAC_IS:
        return _AGAC_IS[tohum]
    rng = np.random.default_rng(7919 + tohum * 31)
    dallar = []

    olgun = []  # her dal için olgun (pp, th)

    def ana_nokta(bi, s):
        pp, th = olgun[bi]
        d = dallar[bi]
        i = min(int(s / d.dl), len(th) - 1)
        f = min(1.0, max(0.0, (s - i * d.dl) / d.dl))
        return pp[i] + (pp[i + 1] - pp[i]) * f, th[i]

    def yeni(ana, s_ana, a0, L, n, egilim, hedef, der, esnek, gecik=(0.01, 0.05), dg=0.26):
        """a0: ana dala göre dallanma açısı; hedef: mutlak (dikeye göre) eğilim açısı."""
        d = _Dal()
        d.ana, d.s_ana, d.a0, d.L, d.der, d.esnek = ana, s_ana, a0, L, der, esnek
        d.dl = L / n
        if ana >= 0:
            taban, th_ana = ana_nokta(ana, s_ana)
        else:
            taban, th_ana = np.array([0.0, 0.0]), 0.0
        dth = np.zeros(n)
        th = th_ana + a0
        f = rng.uniform(0, 6.28)
        kk = rng.uniform(0.6, 1.4)
        for j in range(n):
            u = (j + 0.5) / n
            step = egilim * (hedef - th) / n * 3.0 + 0.10 * math.sin(u * 6.28 * kk + f) / n
            dth[j] = step
            th += step
        d.dth = dth
        d.cocuk = []
        if ana >= 0:
            p = dallar[ana]
            g0 = _ilk_gecis(p, s_ana + 6) + rng.uniform(*gecik)
            d.g0 = g0
            d.dg = max(0.08, min(dg, 0.985 - g0))
            p.cocuk.append(len(dallar))
        else:
            d.g0, d.dg = 0.0, 1.0
        dallar.append(d)
        thm = th_ana + a0 + np.cumsum(dth)
        seg = np.stack([np.sin(thm), -np.cos(thm)], 1) * d.dl
        pp = np.concatenate([taban[None], taban[None] + np.cumsum(seg, 0)], 0)
        olgun.append((pp, thm))
        return len(dallar) - 1

    L0 = 870.0
    lider = yeni(-1, 0, rng.uniform(-0.03, 0.03), L0, 30, 0.0, 0.0, 0, 0.55)
    # lider gövdesine hafif S kıvrımı
    dallar[lider].dth = np.array([0.009 * math.sin(j / 30 * 6.28 * 0.8 + 0.4) for j in range(30)])
    thm = dallar[lider].a0 + np.cumsum(dallar[lider].dth)
    seg = np.stack([np.sin(thm), -np.cos(thm)], 1) * dallar[lider].dl
    olgun[lider] = (np.concatenate([np.zeros((1, 2)), np.cumsum(seg, 0)], 0), thm)
    # 1. kuşak: ana kollar
    taraf = 1 if rng.random() < 0.5 else -1
    kollar = []
    yuks = [318, 372, 425, 480, 540, 610, 680]
    for i, s in enumerate(yuks):
        s += rng.uniform(-14, 14)
        u = i / (len(yuks) - 1)
        aci = math.radians(rng.uniform(52, 62) - 22 * u) * taraf
        L = (350 - 150 * u) * rng.uniform(0.9, 1.08)
        hedef = math.radians(24 - 8 * u) * taraf
        kollar.append(yeni(lider, s, aci, L, 14, 0.55, hedef, 1, 1.0, dg=0.30))
        taraf = -taraf
    # 2. kuşak
    ikinciler = []
    for kb in kollar:
        K = dallar[kb]
        m = int(rng.integers(2, 4))
        tr = 1 if rng.random() < 0.5 else -1
        for j in range(m):
            u = 0.38 + 0.5 * (j + rng.uniform(0.1, 0.9)) / m
            aci = math.radians(rng.uniform(26, 44)) * tr
            L = K.L * rng.uniform(0.38, 0.55)
            _, th_k = ana_nokta(kb, K.L * u)
            hedef = th_k + aci * 0.6
            hedef = hedef * 0.6
            ikinciler.append(yeni(kb, K.L * u, aci, L, 8, 0.35, hedef, 2, 1.5, dg=0.24))
            tr = -tr
    # liderin tepesine yan dallar
    for j, s in enumerate([700, 760, 815]):
        tr = 1 if (j % 2 == 0) == (rng.random() < 0.5) else -1
        ikinciler.append(yeni(lider, s + rng.uniform(-10, 10), math.radians(rng.uniform(30, 45)) * tr,
                              rng.uniform(90, 140), 8, 0.4, math.radians(14) * tr, 2, 1.5, dg=0.22))
    # 3. kuşak: ince dallar
    for ib in ikinciler:
        P = dallar[ib]
        for j in range(int(rng.integers(1, 3))):
            u = rng.uniform(0.45, 0.85)
            tr = 1 if rng.random() < 0.5 else -1
            _, th_p = ana_nokta(ib, P.L * u)
            aci = math.radians(rng.uniform(25, 40)) * tr
            yeni(ib, P.L * u, aci, P.L * rng.uniform(0.35, 0.55), 6, 0.25, (th_p + aci) * 0.7, 3, 2.0, dg=0.2)

    # ---------------- taç kümeleri ----------------
    tcx, tcy, trx, try_ = rng.uniform(-15, 15), -640.0, 400.0, 292.0
    havuz = []
    for bi, (pp, th) in enumerate(olgun):
        d = dallar[bi]
        for j in range(len(pp)):
            s = j * d.dl
            if bi == 0 and s < 360:
                continue
            havuz.append((pp[j, 0], pp[j, 1], bi, s))
    havuz = np.array(havuz)
    kumeler = []

    def ekle(x, y, R, tur, bi=None, s=None, gec=(0.0, 0.05), dg=(0.2, 0.26), uc=False):
        if bi is None:
            dd = (havuz[:, 0] - x) ** 2 + (havuz[:, 1] - y) ** 2
            j = int(np.argmin(dd))
            bi, s = int(havuz[j, 2]), float(havuz[j, 3])
        d = dallar[bi]
        pp, th = olgun[bi]
        j = min(int(s / d.dl), len(th) - 1)
        f = min(1.0, max(0.0, (s - j * d.dl) / d.dl))
        px, py = pp[j] + (pp[j + 1] - pp[j]) * f
        g0 = max(0.0, _ilk_gecis(d, s)) + rng.uniform(*gec)
        dgv = max(0.1, min(rng.uniform(*dg), 0.99 - g0))
        kumeler.append(dict(x=x, y=y, R=R, bi=bi, s=s, ox=x - px, oy=y - py, g0=g0, dg=dgv, tur=tur, uc=uc,
                            sek=_kume_sekli(rng), q=rng.uniform(0, 1), th_olgun=float(th[j]),
                            bas=(0.62 if bi == 0 else rng.uniform(0.3, 0.45)), gof=rng.uniform(0.55, 0.78),
                            gdon=rng.uniform(-0.35, 0.35)))

    # (a) dal uçlarında kümeler (büyüyen ucu izler; ince dalların uçları yaprak içinde kalır)
    for bi, d in enumerate(dallar):
        if d.der < 1 and bi != 0:
            continue
        pp, th = olgun[bi]
        if d.der >= 2:
            # yakınında uç kümesi varsa atla
            if any((k['x'] - pp[-1, 0]) ** 2 + (k['y'] - pp[-1, 1]) ** 2 < (0.55 * k['R']) ** 2 for k in kumeler
                   if k['uc']):
                continue
        elif d.der == 1 and len(d.cocuk) >= 2 and rng.random() < 0.6:
            continue
        v = pp[-1] - pp[-2]
        v = v / (np.linalg.norm(v) + 1e-9)
        R = rng.uniform(84, 112) * (1.12 if d.der <= 1 else 1.0)
        c = pp[-1] + v * R * 0.28 + np.array([0, -R * 0.12])
        ekle(c[0], c[1], R, 'uc', bi=bi, s=d.L, uc=True)
    # (b) arka kütle: taçın gövdesini oluşturan iri kümeler (yuvarlak silüet)
    nk = 9
    f0 = rng.uniform(0, 6.28)
    for i in range(nk):
        a = f0 + i * 2 * math.pi / nk + rng.uniform(-0.15, 0.15)
        x = tcx + math.cos(a) * trx * 0.6
        y = tcy + math.sin(a) * try_ * 0.58 - 10
        ekle(x, y, rng.uniform(145, 172), 'kutle', gec=(0.04, 0.1), dg=(0.3, 0.36))
    for (dx, dy) in ((-0.2, -0.15), (0.22, -0.05), (0.0, 0.25)):
        ekle(tcx + dx * trx, tcy + dy * try_, rng.uniform(170, 195), 'kutle', gec=(0.04, 0.1), dg=(0.3, 0.36))
    # pencereler: dal yapısının yaprak arasından göründüğü açıklıklar (çatal bölgesi + iki kol)
    pencere = []
    ana_kollar = [bi for bi, d in enumerate(dallar) if d.der == 1]
    pl, ps = olgun[0]
    i_c = min(int(470 / dallar[0].dl), len(pl) - 1)
    pencere.append((pl[i_c, 0], pl[i_c, 1] - 10, 62.0))
    sol = [bi for bi in ana_kollar if olgun[bi][0][-1, 0] < 0]
    sag = [bi for bi in ana_kollar if olgun[bi][0][-1, 0] >= 0]
    for grup in (sol, sag):
        if grup:
            bi = grup[min(len(grup) - 1, int(rng.integers(0, 2)))]
            pp, th = olgun[bi]
            q = pp[int(len(pp) * 0.55)]
            pencere.append((q[0], q[1], rng.uniform(44, 54)))

    def pencerede(x, y, pay=0.0):
        return any((x - wx) ** 2 + (y - wy) ** 2 < (wr + pay) ** 2 for (wx, wy, wr) in pencere)

    # (c) kapsama doldurma
    gx, gy = np.meshgrid(np.linspace(-1, 1, 41), np.linspace(-1, 1, 31))
    ic = gx ** 2 + gy ** 2 <= 0.86
    px_ = tcx + gx[ic] * trx
    py_ = tcy + gy[ic] * try_
    dis = np.array([not pencerede(x, y, 30) for x, y in zip(px_, py_)])
    px_, py_ = px_[dis], py_[dis]
    for _ in range(40):
        kap = np.zeros(px_.shape, bool)
        for k in kumeler:
            if k['tur'] == 'kutle':
                continue
            kap |= (px_ - k['x']) ** 2 + (py_ - k['y']) ** 2 < (0.8 * k['R']) ** 2
        if kap.mean() > 0.88:
            break
        bos = np.where(~kap)[0]
        j = bos[int(rng.integers(0, len(bos)))]
        R = rng.uniform(85, 115)
        x, y = px_[j] + rng.uniform(-15, 15), py_[j] + rng.uniform(-15, 15)
        # pencereye taşmasın
        for (wx, wy, wr) in pencere:
            d = math.hypot(x - wx, y - wy)
            if d < wr + R * 0.6:
                R = max(55.0, d - wr * 0.85)
        ekle(x, y, R, 'dolgu', gec=(0.02, 0.08))
    # katmanlar
    adaylar = [k for k in kumeler if k['tur'] != 'kutle']
    for k in adaylar:
        ry = (k['y'] - tcy) / try_
        rx = (k['x'] - tcx) / trx
        k['z'] = rng.uniform(0, 1) + 0.75 * ry - 0.2 * abs(rx)
    zs = sorted(k['z'] for k in adaylar)
    e1, e2 = zs[int(len(zs) * 0.36)], zs[int(len(zs) * 0.66)]
    for k in kumeler:
        if k['tur'] == 'kutle':
            k['kat'] = 0
        else:
            k['kat'] = 2 if k['z'] >= e2 else (1 if k['z'] >= e1 else 0)
            if k['uc'] and (k['bi'] == 0 or dallar[k['bi']].der >= 2) and k['kat'] == 0:
                k['kat'] = 1  # ince dal uçları yaprak altında kalsın
            if pencerede(k['x'], k['y'], 0.25 * k['R']):
                k['kat'] = 0  # pencerede ön küme yok
    # örtme geçişi: her ince dal ucu ve liderin ucu bir ön/orta kümenin içinde kalsın
    for bi, d in enumerate(dallar):
        if not (bi == 0 or d.der >= 2):
            continue
        pp, th = olgun[bi]
        tx, ty = pp[-1]
        if any((k['x'] - tx) ** 2 + (k['y'] - ty) ** 2 < (0.7 * k['R']) ** 2 for k in kumeler if k['kat'] >= 1):
            continue
        v = pp[-1] - pp[-2]
        v = v / (np.linalg.norm(v) + 1e-9)
        R = rng.uniform(80, 100)
        c = pp[-1] + v * R * 0.25 + np.array([0, -R * 0.1])
        ekle(c[0], c[1], R, 'uc', bi=bi, s=d.L, uc=True)
        kumeler[-1]['kat'] = 1
    # gök boşlukları (arka kütlede, ön kümelerin olmadığı yerlerde)
    bosluk = []
    for wi, (wx, wy, wr) in enumerate(pencere):
        a = rng.uniform(0, 2 * math.pi)
        bosluk.append((wx + math.cos(a) * wr * 0.35, wy + math.sin(a) * wr * 0.3 - 10, rng.uniform(16, 26),
                       int(rng.integers(0, 10 ** 5))))
    for _ in range(300):
        if len(bosluk) >= 5:
            break
        a = rng.uniform(0, 2 * math.pi)
        rr = rng.uniform(0.3, 0.72)
        x = tcx + math.cos(a) * rr * trx
        y = tcy + math.sin(a) * rr * try_
        if y > tcy + try_ * 0.35:
            continue
        ok = all((x - k['x']) ** 2 + (y - k['y']) ** 2 > (0.8 * k['R']) ** 2
                 for k in kumeler if k['kat'] >= 1)
        ok = ok and all((x - b_[0]) ** 2 + (y - b_[1]) ** 2 > 150 ** 2 for b_ in bosluk)
        if ok:
            bosluk.append((x, y, rng.uniform(20, 36), int(rng.integers(0, 10 ** 5))))
    # tek tek yapraklar: fidanda liderin üzerinde, genç ağaçta ana kolların üzerinde (kümeler büyüyünce solar)
    yapraklar = []
    tr = 1
    for j in range(14):
        s = 52 + 30 * j
        yapraklar.append(dict(bi=0, s=s, taraf=tr, aci=math.radians(rng.uniform(44, 60)), L=rng.uniform(60, 74),
                              g0=_ilk_gecis(dallar[0], s + 24), kiv=rng.uniform(-0.1, 0.1), sol=(0.24, 0.44)))
        tr = -tr
    for bi, d in enumerate(dallar):
        if d.der not in (1, 2):
            continue
        s = rng.uniform(28, 45)
        while s < d.L - 10:
            g0 = _ilk_gecis(d, s + 18)
            f0 = rng.uniform(0.40, 0.52)
            yapraklar.append(dict(bi=bi, s=s, taraf=tr, aci=math.radians(rng.uniform(38, 62)),
                                  L=rng.uniform(56, 72), g0=g0, kiv=rng.uniform(-0.12, 0.12), sol=(f0, f0 + 0.16)))
            tr = -tr
            s += rng.uniform(34, 50)
    kabuk = [(rng.uniform(-0.7, 0.55), rng.uniform(20, 300), rng.uniform(30, 90)) for _ in range(9)]
    rng2 = np.random.default_rng(104729 + tohum * 7)
    # genç ağacın yapraklanması: ana ve ikinci kuşak dallarda araya giren ikinci sıra (kümeler gelince erken solar)
    for bi, d in enumerate(dallar):
        if d.der not in (1, 2):
            continue
        s = rng2.uniform(46, 64)
        tr2 = -1
        while s < d.L - 14:
            g0 = _ilk_gecis(d, s + 16)
            f0 = rng2.uniform(0.36, 0.46)
            yapraklar.append(dict(bi=bi, s=s, taraf=tr2, aci=math.radians(rng2.uniform(34, 56)),
                                  L=rng2.uniform(50, 64), g0=g0, kiv=rng2.uniform(-0.12, 0.12), sol=(f0, f0 + 0.16)))
            tr2 = -tr2
            s += rng2.uniform(40, 56)
    for bi, d in enumerate(dallar):
        if d.der != 3:
            continue
        s = rng2.uniform(12, 22)
        while s < d.L - 6:
            g0 = _ilk_gecis(d, s + 12)
            f0 = rng2.uniform(0.42, 0.52)
            yapraklar.append(dict(bi=bi, s=s, taraf=tr, aci=math.radians(rng2.uniform(36, 58)),
                                  L=rng2.uniform(46, 60), g0=g0, kiv=rng2.uniform(-0.12, 0.12), sol=(f0, f0 + 0.16)))
            tr = -tr
            s += rng2.uniform(24, 34)
    iskelet = dict(dallar=dallar, kumeler=kumeler, yapraklar=yapraklar, tac=(tcx, tcy, trx, try_), kabuk=kabuk,
                   bosluk=bosluk, pencere=pencere)
    _AGAC_IS[tohum] = iskelet
    return iskelet


def _agac_durum(isk, g, sallanma):
    """Her dalın şimdiki noktaları (yapı birimi), açıları ve yarıçapları."""
    dallar = isk['dallar']
    n = len(dallar)
    boy = [d.boy(g) for d in dallar]
    # alt ağaç uzunluğu (boru modeli): ters sırada
    alt = [0.0] * n
    for i in range(n - 1, -1, -1):
        alt[i] = boy[i] + sum(alt[c] for c in dallar[i].cocuk)
    toplam = max(alt[0], 1e-6)
    sc = _agac_olcek(g)
    r0 = _govde_r(g) / sc
    rtip = 0.55 / sc + 0.6
    out = [None] * n
    for i, d in enumerate(dallar):
        L = boy[i]
        if L <= 0.3:
            continue
        nseg = len(d.dth)
        kac = min(nseg, L / d.dl)
        tam = int(math.floor(kac))
        fr = kac - tam
        if d.ana < 0:
            taban, th0 = np.array([0.0, 0.0]), 0.0
            ana_bukum = 0.0
        else:
            P = out[d.ana]
            if P is None:
                continue
            pp, aa, ss = P[0], P[1], P[3]
            j = int(np.searchsorted(ss, d.s_ana) - 1)
            j = min(max(j, 0), len(pp) - 2)
            u = (d.s_ana - ss[j]) / max(ss[j + 1] - ss[j], 1e-6)
            taban = pp[j] + (pp[j + 1] - pp[j]) * min(1.0, max(0.0, u))
            th0 = aa[min(j, len(aa) - 1)]
        cnt = tam + (1 if fr > 1e-3 else 0)
        cnt = max(cnt, 1)
        uz = np.full(cnt, d.dl)
        if fr > 1e-3:
            uz[-1] = d.dl * fr
        elif tam == 0:
            uz[-1] = L
        dth = d.dth[:cnt]
        th = th0 + d.a0 + np.cumsum(dth)
        # rüzgâr bükümü: uca doğru artan, ince dallarda daha fazla
        s_mid = np.cumsum(uz) - uz / 2
        if d.ana < 0:
            buk = sallanma * (0.40 - 0.2 * g) * (s_mid / d.L) ** 1.5
        else:
            buk = sallanma * 0.15 * d.esnek * (s_mid / max(d.L, 1)) ** 1.2
            # yatay dalları rüzgâr aşağı da eğer
        th = th + buk
        seg = np.stack([np.sin(th), -np.cos(th)], 1) * uz[:, None]
        pp = np.concatenate([taban[None], taban[None] + np.cumsum(seg, 0)], 0)
        ss = np.concatenate([[0.0], np.cumsum(uz)])
        # yarıçap: s ötesindeki alt ağaç uzunluğu
        A = np.maximum(L - ss, 0.0)
        for c in d.cocuk:
            if boy[c] > 0:
                A = A + np.where(ss <= dallar[c].s_ana, alt[c], 0.0)
        r = np.sqrt(r0 * r0 * A / toplam + rtip * rtip)
        if d.ana < 0:
            r = r * (1.0 + 0.55 * np.exp(-ss / (1.3 * r0 + 1e-6)))
        else:
            # dal tabanında ana dala kaynaşma
            r = np.minimum(r, out[d.ana][2].max())
        thp = np.concatenate([th, th[-1:]])
        out[i] = (pp, thp, r, ss)
    return out, sc


def _kume_durum(isk, durum, g, yaprak, sallanma):
    """Görünen kümeler (yapı biriminde): kat, merkez, R, ağırlık, şekil noktaları."""
    sonuc = []
    dallar = isk['dallar']
    olgun_k = 0.58 + 0.42 * sstep(0.15, 0.8, g)  # genç ağacın kümeleri küçük
    for k in isk['kumeler']:
        D = durum[k['bi']]
        if D is None:
            continue
        pp, th, r, ss = D
        v = min(1.0, max(0.0, (yaprak - k['q'] * 0.82) / 0.18))
        if v <= 0.0:
            continue
        if k['uc']:
            # büyüyen dal ucunu izleyen küme
            fr = ss[-1] / dallar[k['bi']].L
            u = (fr - k['bas']) / (1.0 - k['bas'])
            if u <= 0:
                continue
            u1 = min(1.0, u)
            bl = u1 ** 0.85 * (2.0 - u1) ** 0.5 / 1.0
            bl = min(1.0, bl)
            # genç ağaçta uç kümesi küçük bir yaprak öbeği olarak başlar (tek başına iri "lolipop" topu olmasın)
            R = k['R'] * (0.16 + 0.84 * bl) * (0.5 + 0.5 * v) * (0.42 + 0.58 * sstep(0.24, 0.56, g))
            vx, vy = pp[-1] - pp[-2]
            n_ = math.hypot(vx, vy) + 1e-9
            cx = pp[-1, 0] + vx / n_ * R * 0.28 + sallanma * 6.0
            cy = pp[-1, 1] + vy / n_ * R * 0.28 - R * 0.12
            w = min(1.0, u * 4.0) * (0.25 + 0.75 * v)
        else:
            u = (g - k['g0']) / k['dg']
            if u <= 0 or ss[-1] < k['s'] - 1:
                continue
            u = min(1.0, u)
            bl = u * u * (3 - 2 * u) * 0.6 + 0.4 * u
            j = int(np.searchsorted(ss, k['s']) - 1)
            j = min(max(j, 0), len(pp) - 2)
            f = (k['s'] - ss[j]) / max(ss[j + 1] - ss[j], 1e-6)
            px, py = pp[j] + (pp[j + 1] - pp[j]) * min(1.0, max(0.0, f))
            dth = th[j] - k['th_olgun']
            c, s_ = math.cos(dth), math.sin(dth)
            sk = 0.3 + 0.7 * bl
            ox = (k['ox'] * c - k['oy'] * s_) * sk
            oy = (k['ox'] * s_ + k['oy'] * c) * sk
            cx, cy = px + ox + sallanma * 10.0, py + oy
            R = k['R'] * (0.12 + 0.88 * bl) * (0.5 + 0.5 * v)
            w = min(1.0, u * 5.0) * (0.25 + 0.75 * v)
        R *= olgun_k
        P = k['sek'] * R
        P[:, 0] += sallanma * 0.2 * (-P[:, 1])
        sonuc.append(dict(kat=k['kat'], x=cx, y=cy, R=R, w=w, pts=P + np.array([cx, cy]), ham=k))
    return sonuc


def ciz_agac(t: Tuval, M, buyume, sallanma=0.0, tohum=0, isik=(-0.6, -0.8), yaprak=1.0, damla=0.0,
             sakla_sonra=True):
    isk = _agac_iskelet(tohum)
    g = min(1.0, max(0.0, float(buyume)))
    durum, sc = _agac_durum(isk, g, sallanma)
    Ms = M_bilesik(M, M_olcek(sc))  # yapı birimi -> ekran
    kumeler = _kume_durum(isk, durum, g, yaprak, sallanma)
    lx, ly = isik
    ln = math.hypot(lx, ly) + 1e-9
    lx, ly = lx / ln, ly / ln
    tcx, tcy, trx, try_ = isk['tac']
    lider = durum[0]

    # sınır kutusu (yapı birimi)
    xs, ys = [0.0], [0.0]
    for D in durum:
        if D is not None:
            xs += [D[0][:, 0].min() - D[2].max(), D[0][:, 0].max() + D[2].max()]
            ys += [D[0][:, 1].min() - D[2].max()]
    for k in kumeler:
        xs += [k['x'] - k['R'] * 1.3, k['x'] + k['R'] * 1.3]
        ys += [k['y'] - k['R'] * 1.15, k['y'] + k['R'] * 1.15]
    r0 = _govde_r(g) / sc
    x0, x1 = min(xs) - r0 * 3 - 90, max(xs) + r0 * 3 + 90
    y0, y1 = min(ys) - 90, 30.0
    k = yollar_kirp([yol_dikdortgen(x0, y0, x1, y1)], Ms, 6)
    if k.bos():
        return None
    B = _Boya(t, M, k, tohum=tohum)
    ik = 1.0 + 0.22 * damla  # ıslaklık: renkler biraz doygun

    # ------------------------------------------------------------------ fidan yaprakları (ön/orta kümelerin arkasında,
    # dalların önünde boyanır: kümeler açınca tek yapraklar boşluklarda kalır, kümelerin üstüne yapışmaz)
    yy, ya, yg = [], [], []
    if lider is not None and g < 0.72:
        pp, th, r, ss = lider

        def yaprak_ekle(px, py, thl, Lf, kiv, a):
            aci_deg = math.degrees(thl) - 90.0
            sx, sy = px + math.sin(thl) * Lf * 0.10, py - math.cos(thl) * Lf * 0.10
            pts = _yaprak_np(sx, sy, Lf, Lf * 0.25, aci_deg, kivrim=kiv)
            yy.append(_poly(pts))
            ya.append(a)
            ar = math.radians(aci_deg)
            nx, ny = -math.sin(ar), math.cos(ar)
            if nx * (-lx) + ny * (-ly) < 0:
                nx, ny = -nx, -ny
            h = _yaprak_np(sx + nx * Lf * 0.075, sy + ny * Lf * 0.075, Lf * 0.96, Lf * 0.12, aci_deg, kivrim=kiv)
            yg.append(_poly(h))
            # sap
            return (px, py, sx, sy)

        saplar = []
        solma = 1.0 - sstep(0.24, 0.44, g)
        for y_ in isk['yapraklar']:
            Dl = durum[y_['bi']]
            if Dl is None:
                continue
            ppl, thl_, rl, ssl = Dl
            s = y_['s']
            u = (g - y_['g0']) / 0.07
            if u <= 0 or s > ssl[-1] - 6:
                continue
            bl = min(1.0, u) ** 0.7
            a = bl * (1.0 - sstep(*y_['sol'], g))
            if y_['bi'] == 0:
                a *= 1.0 - sstep(150, 230, ssl[-1] - s)
            if a <= 0.01:
                continue
            j = min(max(int(np.searchsorted(ssl, s) - 1), 0), len(ppl) - 2)
            f = (s - ssl[j]) / max(ssl[j + 1] - ssl[j], 1e-6)
            px, py = ppl[j] + (ppl[j + 1] - ppl[j]) * f
            thl = thl_[j] + y_['taraf'] * y_['aci'] + sallanma * 0.4
            saplar.append(yaprak_ekle(px, py, thl, y_['L'] * (0.35 + 0.65 * bl), y_['kiv'] * y_['taraf'], a))
        # tepe tomurcuğu: iki küçük yaprak
        a = solma
        if a > 0.01:
            px, py = pp[-1]
            for sgn in (-1, 1):
                saplar.append(yaprak_ekle(px, py, th[-1] + sgn * 0.42 + sallanma * 0.4, 40, -0.08 * sgn, a))
        # dal uçlarında yaprak öbeği (genç ağacın dal uçları çıplak diken gibi kalmasın; kümeler gelince arkada kalır)
        uc_sol = 1.0 - sstep(0.40, 0.60, g)
        if uc_sol > 0.01:
            dallar_ = isk['dallar']
            for i, Dd in enumerate(durum):
                if i == 0 or Dd is None or dallar_[i].der < 1:
                    continue
                ppd, thd, rd, ssd = Dd
                if len(ppd) < 2 or ssd[-1] < 4:
                    continue
                a = min(1.0, ssd[-1] / 22.0) * uc_sol
                Lb = (40.0 if dallar_[i].der >= 2 else 46.0) * min(1.0, 0.45 + ssd[-1] / 60.0)
                px, py = ppd[-1]
                sg0 = 1 if i % 2 else -1
                for k_, (da, lk) in enumerate(((0.5, 1.0), (-0.5, 0.92), (0.05, 0.8))):
                    saplar.append(yaprak_ekle(px, py, thd[-1] + sg0 * da + sallanma * 0.4, Lb * lk,
                                              -0.08 * sg0 * np.sign(da + 1e-6), a))

    def yapraklari_boya():
        if lider is not None and g < 0.72 and yy:
            iz = B.lavi(yy, '#93C08A', yog=0.56 * ik, Mloc=Ms, kenar=0.9, dalga=0.05, islak=1.05, islak_gen=2.2,
                        gran=0.08, akis=0.2, toplam=True, alfalar=ya, renk2='#6FA67A')
            B.lavi(yg, '#4F8463', yog=0.30 * ik, Mloc=Ms, kenar=0.8, dalga=0.05, islak=0.8, islak_gen=1.8,
                   gran=0.08, akis=0.1, toplam=True, alfalar=ya, siluet=False)
            B.sakla(iz)

    # ------------------------------------------------------------------ taç kümeleri
    def kume_boya(kat, renk1, renk2, yog_b, golge_renk, yog_g, acik=0.6, ust=0.5, isik_g=0.35):
        sec = [q for q in kumeler if q['kat'] == kat]
        if not sec:
            return None
        yollar = [_poly(q['pts']) for q in sec]
        alfa = [q['w'] for q in sec]
        Rm = float(np.median([q['R'] for q in sec])) * sc * math.sqrt(abs(np.linalg.det(M[:2, :2])))
        dd = Rm * 0.38

        def yf(X, Y):
            d = ((X / sc - tcx) * lx + (Y / sc - tcy) * ly) / (trx + try_)
            return 1.0 - isik_g * np.clip(d * 1.8, -0.8, 0.8)
        iz = B.lavi(yollar, renk1, yog=yog_b * ik, Mloc=Ms, kenar=1.1, dalga=0.07, islak=1.0, islak_gen=3.0,
                    gran=0.10, akis=0.22, toplam=True, alfalar=alfa, ust=ust, renk2=renk2, yog_fn=yf,
                    isik_kenar=(lx * dd, ly * dd, 1.0 - acik))
        if yog_g <= 0:
            return iz
        gy, ga = [], []
        for q in sec:
            hm = q['ham']
            d = q['R'] * hm['gof']
            ca, sa = math.cos(hm['gdon']), math.sin(hm['gdon'])
            dx, dy = (lx * ca - ly * sa) * d, (lx * sa + ly * ca) * d - q['R'] * 0.05
            kay = q['pts'] + np.array([dx, dy])
            gy.append(yol_op(_poly(q['pts']), _poly(kay), 'fark'))
            ga.append(q['w'])
        B.lavi(gy, golge_renk, yog=yog_g * ik, Mloc=Ms, kenar=1.0, dalga=0.09, islak=0.95, islak_gen=2.6,
               gran=0.12, akis=0.18, toplam=True, alfalar=ga, ust=0.45, siluet=False)
        return iz

    # ıslak yapraklar: küme altlarında asılı damlalar (önce: kâğıt beyazı parıltı + mavi-gri gövde)
    if damla > 0.01 and kumeler:
        dg_y, dg_g, dg_p = [], [], []
        for q in kumeler:
            if q['kat'] < 1 or q['w'] < 0.5:
                continue
            hm = q['ham']
            rq = np.random.default_rng(int(abs(hm['x'] * 7 + hm['y'] * 13)) % 100000)
            P = q['pts']
            alt_i = np.argsort(P[:, 1])[-40:]
            for j in range(3):
                if rq.uniform() > damla * 0.85:
                    continue
                i = int(alt_i[int(rq.integers(0, len(alt_i)))])
                px, py = P[i]
                rd = rq.uniform(5.0, 8.0) / max(sc, 0.5) ** 0.3
                cyd = py + rd * 0.35
                u = np.linspace(0, 2 * math.pi, 24, endpoint=False)
                dx = np.sin(u) * rd * 0.82
                dy = -np.cos(u) * rd
                dy = np.where(dy < 0, dy * 1.35, dy)
                dx = dx * (1 - 0.3 * np.clip(-dy / (rd * 1.35), 0, 1) ** 1.5)
                dg_y.append(_poly(np.stack([px + dx, cyd + dy], 1)))
                dg_p.append(yol_daire(px - rd * 0.28, cyd + rd * 0.15, rd * 0.28))
                dg_g.append(yol_op(yol_daire(px, cyd + rd * 0.1, rd * 0.95),
                                   yol_daire(px - rd * 0.12, cyd + rd * 0.32, rd * 0.86), 'fark'))
        if dg_y:
            B.sakla_yol(dg_p, Ms, yumusak=0.4)
            B.lavi(dg_g, '#5F7E8E', yog=0.45 * min(1.0, damla * 1.5), Mloc=Ms, kenar=0.6, dalga=0.0, islak=0.4,
                   islak_gen=1.0, gran=0.0, akis=0.1, siluet=False)
            izd = B.lavi(dg_y, '#C7DAE6', yog=0.4 * min(1.0, damla * 1.5), Mloc=Ms, kenar=0.6, dalga=0.0, islak=0.9,
                         islak_gen=1.2, gran=0.0, akis=0.1)
            if izd is not None:
                sl_, m_ = izd
                np.maximum(B.S[sl_], m_ * 0.7, out=B.S[sl_])
    B.sakla(kume_boya(2, '#A2C98F', '#7FB383', 0.48, '#4E8466', 0.30, ust=0.45, acik=0.72, isik_g=0.3))
    B.sakla(kume_boya(1, '#8EBA8A', '#6EA27E', 0.50, '#477B63', 0.24, ust=0.45))
    yapraklari_boya()

    # ------------------------------------------------------------------ gövde ve dallar
    dal_yollar, dal_golge, kabuk_yollar = [], [], []
    for i, D in enumerate(durum):
        if D is None:
            continue
        pp, th, r, ss = D
        if len(pp) < 2:
            continue
        rr = r.copy()
        rr[-1] = max(rr[-1] * 0.85, 0.5 / sc)
        dal_yollar.append(_poly(_serit_np(pp, rr)))
        tan = np.gradient(pp, axis=0)
        tan /= np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9
        nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
        sgn = np.sign(nor[:, 0] * (-lx) + nor[:, 1] * (-ly))
        sgn[sgn == 0] = 1
        # gölge sırrının iç kenarı kabuk gibi dalgalı (ikinci gövde gibi görünmesin)
        dal_f = 0.12 * np.sin(ss * 0.045 + i * 1.7) + 0.06 * np.sin(ss * 0.13 + i * 0.9)
        # dış kenar silüetin içinde (0.94 r) kalır; yoksa gölge sırrı gövdenin dışına lavanta bir şerit bırakır
        om = pp + nor * (sgn * rr * (0.48 + 0.5 * dal_f))[:, None]
        dal_golge.append(_poly(_serit_np(om, rr * (0.46 - dal_f * 0.5))))
    if lider is not None:
        # kök genişlemesi: zemine yayılan kısa yüzey kökleri
        for sgn_, uz, kal in ((-1, 2.5, 0.55), (1, 2.2, 0.5), (-1, 1.55, 0.42), (1, 1.7, 0.45)):
            p0 = np.array([sgn_ * r0 * 0.45, -r0 * 1.15])
            p1 = np.array([sgn_ * r0 * 0.95, -r0 * 0.2])
            p2 = np.array([sgn_ * r0 * (0.6 + uz * 0.45), r0 * 0.02])
            p3 = np.array([sgn_ * r0 * uz, r0 * 0.1])
            om = EL.bezier_noktalar(p0, p1, p2, p3, 12)
            gen = r0 * kal * np.linspace(1.0, 0.08, 12) ** 0.8
            dal_yollar.append(_poly(_serit_np(om, gen)))
            if sgn_ * (-lx) > 0:
                dal_golge.append(_poly(_serit_np(om + np.array([sgn_ * 0, -0.15 * r0]) * 0, gen * 0.75)))
    kabuk_a = []
    if lider is not None and g > 0.25:
        pp, th, r, ss = lider
        for (fx, s0, L) in isk['kabuk']:
            marj = ss[-1] * 0.42 - (s0 + L)
            if marj <= 0:
                continue
            kabuk_a.append(sstep(0.0, 45.0, marj))
            sp = np.linspace(s0, s0 + L, 8)
            q = np.stack([np.interp(sp, ss, pp[:, 0]), np.interp(sp, ss, pp[:, 1])], 1)
            rq = np.interp(sp, ss, r)
            q[:, 0] += fx * rq * 0.85 + np.sin(sp * 0.05 + fx * 7) * rq * 0.06
            kabuk_yollar.append(_poly(q, kapali=False))
    iz_dal = B.lavi(dal_yollar, '#A99383', yog=0.60, Mloc=Ms, kenar=0.9, dalga=0.05, islak=0.95, islak_gen=2.6,
                    gran=0.14, akis=0.16, renk2='#9C8579')
    B.lavi(dal_golge, '#6F5A66', yog=0.34, Mloc=Ms, kenar=1.1, dalga=0.08, islak=0.6, islak_gen=2.0, gran=0.14,
           akis=0.12, siluet=False)
    if kabuk_yollar:
        B.lavi(kabuk_yollar, '#6F5A63', yog=0.26 * sstep(0.25, 0.6, g), Mloc=Ms, kenar=0.7, dalga=0.1, islak=0.3,
               islak_gen=1.5, gran=0.12, akis=0.1, cizgi=max(1.0, r0 * 0.07), siluet=False, alfalar=kabuk_a)
    B.sakla(iz_dal)

    # ------------------------------------------------------------------ arka kütle
    # gök boşlukları (arka kütlede dalların göründüğü delikler)
    if isk['bosluk'] and any(q['kat'] == 0 for q in kumeler):
        dl = []
        for (bx, by, br, bt) in isk['bosluk']:
            # boşluk, çevresindeki kütle olgunlaştıkça açılır
            ag = 0.0
            for q in kumeler:
                if q['kat'] == 0 and (q['x'] - bx) ** 2 + (q['y'] - by) ** 2 < (q['R'] * 0.8) ** 2:
                    ag = max(ag, q['w'] * min(1.0, q['R'] / (q['ham']['R'] * 0.9)))
            if ag > 0.05:
                dl.append(EL.damla_blob(bx, by, br * ag * yaprak ** 0.5, tohum=bt, duzensizlik=0.18, lob=5))
        if dl:
            B.sakla_yol(dl, Ms, yumusak=1.0, delik=True)
    kume_boya(0, '#7FA592', '#6A977E', 0.56, '#3F6F5F', 0.20, acik=0.75, ust=0.35, isik_g=0.5)

    B.bitir(sakla_sonra=sakla_sonra)

    # ------------------------------------------------------------------ dönüş (ekran koordinatları)
    taban = nokta_donustur(M, 0, 0)
    if kumeler:
        ax = np.concatenate([q['pts'] for q in kumeler], 0)
        ekr = (Ms[:2, :2] @ ax.T).T + Ms[:2, 2]
        kx0, ky0 = ekr.min(0)
        kx1, ky1 = ekr.max(0)
        kutu = (float(kx0), float(ky0), float(kx1), float(ky1))
        mrk = ((kutu[0] + kutu[2]) / 2, (kutu[1] + kutu[3]) / 2)
    else:
        tp = lider[0][-1] if lider is not None else (0, 0)
        mrk = nokta_donustur(Ms, tp[0], tp[1])
        kutu = (mrk[0], mrk[1], mrk[0], mrk[1])
    tepe = mrk
    if lider is not None:
        tp = lider[0][-1]
        tp_e = nokta_donustur(Ms, tp[0], tp[1] - (0 if kumeler else 20))
        tepe = tp_e if not kumeler or tp_e[1] < kutu[1] else (mrk[0], kutu[1])
    return dict(merkez=(float(mrk[0]), float(mrk[1])), kutu=kutu, tepe=(float(tepe[0]), float(tepe[1])),
                taban=taban, olcek=sc, govde_r=_govde_r(g))


# ================================================================================================================
# 2. KÖKLER
# ================================================================================================================
_KOK_IS = {}


def _kok_iskelet(tohum):
    if tohum in _KOK_IS:
        return _KOK_IS[tohum]
    rng = np.random.default_rng(4241 + tohum * 17)
    kokler = []  # dict(ana, s_ana, pp (olgun noktalar), L, b0, dur, kal (taban yarıçap oranı), der)

    def yol_uret(x0, y0, aci, L, n, egilim, kivrim):
        """aci: yataydan aşağı doğru (derece, 0 = +x yönü, 90 = aşağı)."""
        a = math.radians(aci)
        pts = [(x0, y0)]
        f = rng.uniform(0, 6.28)
        k = rng.uniform(1.5, 3.0)
        for j in range(n):
            u = (j + 1) / n
            # aşağı (90°) doğru bükülme + kıvrım
            hedef = math.radians(90)
            a += (hedef - a) * egilim / n + kivrim * math.sin(u * k * 6.28 + f) / n * 3
            pts.append((pts[-1][0] + math.cos(a) * L / n, pts[-1][1] + math.sin(a) * L / n))
        return np.array(pts)

    def ekle(ana, s_ana, pp, b0, dur, kal, der):
        L = float(np.sum(np.linalg.norm(np.diff(pp, axis=0), axis=1)))
        kokler.append(dict(ana=ana, s_ana=s_ana, pp=pp, L=L, b0=b0, dur=dur, kal=kal, der=der,
                           ss=np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(pp, axis=0), axis=1))])))
        return len(kokler) - 1

    # ana kökler
    acilar = [6, 20, 38, 64, 116, 142, 160, 174]
    ana_ids = []
    for i, a in enumerate(acilar):
        a = a + rng.uniform(-6, 6)
        sag = math.cos(math.radians(a)) > 0
        x0 = (0.55 if sag else -0.55)
        yatay = abs(math.cos(math.radians(a)))
        L = rng.uniform(380, 560) * (0.75 + 0.35 * yatay)
        pp = yol_uret(x0, 0.25, a, L, 22, rng.uniform(0.12, 0.35) + 0.4 * (1 - yatay), rng.uniform(0.15, 0.3))
        ana_ids.append(ekle(-1, 0, pp, rng.uniform(0.0, 0.12), rng.uniform(0.45, 0.6), rng.uniform(0.40, 0.55), 0))
    # kazık kök
    pp = yol_uret(0.0, 0.5, 90 + rng.uniform(-6, 6), rng.uniform(380, 460), 22, 0.3, 0.12)
    ana_ids.append(ekle(-1, 0, pp, 0.0, 0.6, 0.62, 0))
    # ikincil ve üçüncül kökler
    for ai in list(ana_ids):
        A = kokler[ai]
        m = int(rng.integers(2, 5))
        for j in range(m):
            u = 0.22 + 0.65 * (j + rng.uniform(0.2, 0.8)) / m
            s = u * A['L']
            i = min(int(np.searchsorted(A['ss'], s)), len(A['pp']) - 1)
            p = A['pp'][i]
            v = A['pp'][min(i + 1, len(A['pp']) - 1)] - A['pp'][max(i - 1, 0)]
            a_ana = math.degrees(math.atan2(v[1], v[0]))
            a = a_ana + rng.choice([-1, 1]) * rng.uniform(28, 62)
            L = A['L'] * rng.uniform(0.28, 0.48) * (1 - 0.4 * u)
            pp = yol_uret(p[0], p[1], a, L, 12, rng.uniform(0.3, 0.8), 0.25)
            b0 = A['b0'] + A['dur'] * u * 0.9
            si = ekle(ai, s, pp, b0, rng.uniform(0.3, 0.4), A['kal'] * rng.uniform(0.35, 0.5), 1)
            S = kokler[si]
            for q in range(int(rng.integers(1, 4))):
                u2 = rng.uniform(0.3, 0.9)
                s2 = u2 * S['L']
                i2 = min(int(np.searchsorted(S['ss'], s2)), len(S['pp']) - 1)
                p2 = S['pp'][i2]
                v2 = S['pp'][min(i2 + 1, len(S['pp']) - 1)] - S['pp'][max(i2 - 1, 0)]
                a2 = math.degrees(math.atan2(v2[1], v2[0])) + rng.choice([-1, 1]) * rng.uniform(30, 70)
                pp2 = yol_uret(p2[0], p2[1], a2, rng.uniform(28, 75), 6, 0.4, 0.4)
                ekle(si, s2, pp2, S['b0'] + S['dur'] * u2 * 0.9, rng.uniform(0.18, 0.26), S['kal'] * 0.45, 2)
    # kök tüyleri: ince köklerin ve uçların çevresinde kısa çizgiler (kök, s, açı farkı, boy)
    tuy = []
    for ki, K in enumerate(kokler):
        if K['der'] == 0:
            continue
        n = int(K['L'] / 9)
        for j in range(n):
            s = K['L'] * rng.uniform(0.35, 1.0)
            tuy.append((ki, s, rng.choice([-1, 1]) * rng.uniform(40, 80), rng.uniform(5, 13)))
    for ki in ana_ids:
        K = kokler[ki]
        for j in range(14):
            s = K['L'] * rng.uniform(0.75, 1.0)
            tuy.append((ki, s, rng.choice([-1, 1]) * rng.uniform(35, 80), rng.uniform(6, 14)))
    isk = dict(kokler=kokler, tuy=tuy)
    _KOK_IS[tohum] = isk
    return isk


def _kok_boyut(g):
    """Kök sisteminin yerel ölçeği (ağacın büyümesiyle)."""
    return _agac_olcek(g) * (0.5 + 0.5 * min(1.0, max(0.0, g)))


def ciz_kokler(t: Tuval, M, buyume, derinlik=1.0, tohum=0, isik=(-0.6, -0.8), sakla_sonra=True):
    isk = _kok_iskelet(tohum)
    g = min(1.0, max(0.0, float(buyume)))
    dr = min(1.0, max(0.0, float(derinlik)))
    sc = _kok_boyut(g)
    Ms = M_bilesik(M, M_olcek(sc))
    r0 = _govde_r(g) / sc  # gövde yarıçapı yapı biriminde
    kokler = isk['kokler']
    gor = []  # (pp_kesik, yarıçaplar)
    uzun = [0.0] * len(kokler)
    for i, K in enumerate(kokler):
        u = (dr - K['b0']) / K['dur']
        if u <= 0:
            continue
        u = min(1.0, u)
        e = 1.0 - (1.0 - u) ** 1.8
        if K['ana'] >= 0:
            if uzun[K['ana']] < K['s_ana'] + 2:
                continue
        L = K['L'] * e
        uzun[i] = L
        ss = K['ss']
        n = int(np.searchsorted(ss, L))
        n = max(1, min(n, len(ss) - 1))
        pp = K['pp'][:n + 1].copy()
        # son noktayı tam L'ye kırp
        if ss[n] > L and n >= 1:
            f = (L - ss[n - 1]) / max(ss[n] - ss[n - 1], 1e-6)
            pp[-1] = K['pp'][n - 1] + (K['pp'][n] - K['pp'][n - 1]) * f
        sp = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(pp, axis=0), axis=1))])
        r_taban = r0 * K['kal'] * (0.6 + 0.4 * e)
        kalan = np.clip((L - sp) / max(K['L'], 1.0), 0, 1)
        r = 0.7 / sc + r_taban * kalan ** 0.8
        if K['der'] == 0:
            # gövdeye kaynaşma: ilk kısımda kalın
            r = r + r0 * 0.35 * np.exp(-sp / (r0 * 0.9 + 1e-6))
        gor.append((i, pp, r, sp))
    if not gor:
        return None
    allp = np.concatenate([p for (_, p, _, _) in gor], 0)
    pay = r0 * 1.2 + 30
    B = _boya_ac(t, Ms, (allp[:, 0].min() - pay, allp[:, 1].min() - pay, allp[:, 0].max() + pay,
                         allp[:, 1].max() + pay), tohum=tohum + 3)
    if B is None:
        return None
    lx, ly = isik
    ln = math.hypot(lx, ly) + 1e-9
    lx, ly = lx / ln, ly / ln
    yollar, golge = [], []
    for (i, pp, r, sp) in gor:
        if len(pp) < 2:
            continue
        P = _serit_np(pp, r)
        if P is None:
            continue
        yollar.append(_poly(P))
        tan = np.gradient(pp, axis=0)
        tan /= np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9
        nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
        sgn = np.sign(nor[:, 0] * (-lx) + nor[:, 1] * (-ly))
        sgn[sgn == 0] = 1
        P2 = _serit_np(pp + nor * (sgn * r * 0.45)[:, None], r * 0.55)
        if P2 is not None:
            golge.append(_poly(P2))
    # kök tüyleri
    tuyler = []
    for (ki, s, da, L) in isk['tuy']:
        if uzun[ki] < s:
            continue
        K = kokler[ki]
        ss = K['ss']
        j = min(max(int(np.searchsorted(ss, s) - 1), 0), len(ss) - 2)
        f = (s - ss[j]) / max(ss[j + 1] - ss[j], 1e-6)
        p = K['pp'][j] + (K['pp'][j + 1] - K['pp'][j]) * f
        v = K['pp'][j + 1] - K['pp'][j]
        a = math.atan2(v[1], v[0]) + math.radians(da)
        ilk = min(1.0, (uzun[ki] - s) / 25.0)  # uçta yeni çıkan tüyler kısa
        L2 = L * ilk
        q = np.array([p, p + np.array([math.cos(a), math.sin(a)]) * L2 * 0.55,
                      p + np.array([math.cos(a + 0.25 * np.sign(da)), math.sin(a + 0.25 * np.sign(da))]) * L2])
        tuyler.append(_poly(q, kapali=False))
    if tuyler:
        B.lavi(tuyler, '#8F7868', yog=0.42, Mloc=Ms, kenar=0.5, dalga=0.06, islak=0.2, islak_gen=1.0, gran=0.1,
               akis=0.15, cizgi=max(0.8 / sc, 0.6), esik=False)
    iz = B.lavi(yollar, '#B9A08B', yog=0.66, Mloc=Ms, kenar=0.9, dalga=0.06, islak=1.1, islak_gen=2.4, gran=0.12,
                akis=0.2, renk2='#B2957F')
    B.lavi(golge, '#76606B', yog=0.36, Mloc=Ms, kenar=0.9, dalga=0.07, islak=0.8, islak_gen=2.0, gran=0.14,
           akis=0.15, siluet=False)
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(kutu=tuple(nokta_donustur(Ms, allp[:, 0].min(), allp[:, 1].min())
                           + nokta_donustur(Ms, allp[:, 0].max(), allp[:, 1].max())))


# ================================================================================================================
# 3. TOPRAK KESİTİ
# ================================================================================================================
def _dalgali_cizgi(rng, x0, x1, y, genlik, n=40, frek=(1.5, 4.0)):
    xs = np.linspace(x0, x1, n)
    f1, f2, f3 = rng.uniform(0, 6.28, 3)
    k1, k2 = rng.uniform(*frek), rng.uniform(frek[1], frek[1] * 2.2)
    u = (xs - x0) / max(x1 - x0, 1)
    ys = y + genlik * (0.6 * np.sin(u * k1 * 6.28 + f1) + 0.3 * np.sin(u * k2 * 6.28 + f2)
                       + 0.15 * np.sin(u * 23 + f3))
    return np.stack([xs, ys], 1)


def _cakil(rng, x, y, r):
    """Yuvarlak çakıl noktaları."""
    n = 24
    a = np.linspace(0, 2 * math.pi, n, endpoint=False)
    f = rng.uniform(0, 6.28, 2)
    rr = r * (1 + 0.12 * np.sin(2 * a + f[0]) + 0.06 * np.sin(3 * a + f[1]))
    sy = rng.uniform(0.6, 0.85)
    return np.stack([x + np.cos(a) * rr, y + np.sin(a) * rr * sy], 1)


def ciz_toprak_kesiti(t: Tuval, M, x0, x1, y_zemin, y_alt, tohum=0, cimen=True, sakla_sonra=True):
    rng = np.random.default_rng(9001 + tohum)
    Hh = y_alt - y_zemin
    B = _boya_ac(t, M, (x0 - 20, y_zemin - 40, x1 + 20, y_alt + 30), tohum=tohum + 11)
    if B is None:
        return None
    # --- çakıllar (önde) ---
    cak, cak_g = [], []
    alan = (x1 - x0) * Hh
    n = int(alan / 5200)
    for i in range(n):
        y = y_zemin + Hh * (0.18 + 0.78 * rng.uniform(0, 1) ** 0.8)
        x = rng.uniform(x0 + 14, x1 - 14)
        r = rng.uniform(4, 9) * (1 + 1.4 * ((y - y_zemin) / Hh) * rng.uniform(0, 1))
        P = _cakil(rng, x, y, r)
        cak.append(_poly(P))
        cak_g.append(_poly(_cakil(np.random.default_rng(i), x + r * 0.25, y + r * 0.2, r * 0.75)))
    if cak:
        iz = B.lavi(cak, '#C9BBAE', yog=0.5, kenar=0.8, dalga=0.05, islak=1.0, islak_gen=1.8, gran=0.14,
                    akis=0.2, renk2='#C7AE97', toplam=True, ust=0.4)
        B.lavi([yol_op(a, b, 'kesisim') for a, b in zip(cak, cak_g)], '#8E7C80', yog=0.32, kenar=0.8,
               dalga=0.05, islak=0.7, islak_gen=1.5, gran=0.14, akis=0.1, siluet=False)
        B.sakla(iz)
    # --- çimen çizgisi (üstte) ---
    if cimen:
        iz = _cimen_boya(B, M, x0, x1, y_zemin + 2, 0.9, 0.0, rng, boy=(9, 22), ince=True)
        B.sakla(iz)
    # --- toprak katmanları (alttan üste sırlar: üst katman en koyu) ---
    sol = _dalgali_cizgi(rng, y_zemin, y_alt, x0, 5, n=20)[:, ::-1]
    sag = _dalgali_cizgi(rng, y_zemin, y_alt, x1, 5, n=20)[:, ::-1]
    ust = _dalgali_cizgi(rng, x0, x1, y_zemin, 2.5, n=50, frek=(2, 6))
    alt = _dalgali_cizgi(rng, x0, x1, y_alt, 9, n=50, frek=(2, 5))

    def bolge(y_sinir_pts, ic=0.0):
        u_ = ust.copy()
        sg = sag.copy()
        sl_ = sol.copy()
        if ic:
            sg[:, 0] -= ic
            sl_[:, 0] += ic * 0.7
            u_[:, 1] += ic * 0.3
        # sınırları yanlarla kesiştir
        yb = y_sinir_pts.copy()
        yb[0, 0], yb[-1, 0] = sl_[0, 0] if False else yb[0, 0], yb[-1, 0]
        sgk = sg[(sg[:, 1] > u_[-1, 1]) & (sg[:, 1] < yb[-1, 1])]
        slk = sl_[(sl_[:, 1] > u_[0, 1]) & (sl_[:, 1] < yb[0, 1])]
        u_[0, 0] += ic * 0.7
        u_[-1, 0] -= ic
        yb[0, 0] += ic * 0.7
        yb[-1, 0] -= ic
        pts = np.concatenate([u_, sgk, yb[::-1], slk[::-1]], 0)
        return _poly(pts)
    # 1) temel: açık okra
    tum = bolge(alt)

    def solma(X, Y):
        return 1.0 - 0.45 * np.clip((Y - (y_alt - Hh * 0.22)) / (Hh * 0.22), 0, 1)
    B.lavi(tum, '#DCC3A0', yog=0.5, kenar=1.4, dalga=0.14, islak=0.8, islak_gen=4, gran=0.2, akis=0.22,
           renk2='#D7B994', yog_fn=solma)
    # 2) orta katman: sıcak siena
    orta = _dalgali_cizgi(rng, x0, x1, y_zemin + Hh * 0.58, Hh * 0.05)
    B.lavi(bolge(orta, 3.5), '#C49A72', yog=0.40, kenar=1.4, dalga=0.14, islak=0.9, islak_gen=4, gran=0.22, akis=0.2,
           renk2='#BE8F6A', siluet=False)
    # 3) üst humus: koyu, zengin
    hum = _dalgali_cizgi(rng, x0, x1, y_zemin + Hh * 0.17, Hh * 0.025, frek=(3, 7))
    B.lavi(bolge(hum, 7.0), '#9C7A60', yog=0.40, kenar=1.2, dalga=0.12, islak=1.0, islak_gen=3, gran=0.25,
           akis=0.2, renk2='#8F7060', siluet=False)
    # 4) ince katman çizgileri
    serit = []
    for j in range(5):
        yy = y_zemin + Hh * rng.uniform(0.25, 0.9)
        xa = rng.uniform(x0, x1 - (x1 - x0) * 0.3)
        xb = min(x1 - 8, xa + (x1 - x0) * rng.uniform(0.2, 0.55))
        c = _dalgali_cizgi(rng, xa, xb, yy, 3, n=20)
        w = np.sin(np.linspace(0, math.pi, len(c))) * rng.uniform(1.2, 2.6)
        serit.append(_poly(_serit_np(c, w)))
    B.lavi(serit, '#A47C5E', yog=0.22, kenar=1.0, dalga=0.15, islak=0.5, islak_gen=2, gran=0.2, akis=0.2,
           siluet=False)
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(kutu=nokta_donustur(M, x0, y_zemin) + nokta_donustur(M, x1, y_alt))


# ================================================================================================================
# çimen (ortak)
# ================================================================================================================
def _cimen_boya(B, M, x0, x1, y, yogunluk, sallanma, rng, boy=(14, 34), ince=False, renk1='#93B77F',
                renk2='#6F9F72', golge='#4F7F5E', yog=0.55):
    """Zemin çizgisi boyunca çimen tutamları (yerel). Döner: lavi izi."""
    yollar, koyu = [], []
    L = x1 - x0
    n_tutam = max(1, int(L / (26 if ince else 34) * yogunluk))
    for i in range(n_tutam):
        cx = x0 + (i + rng.uniform(0.1, 0.9)) / n_tutam * L
        nb = int(rng.integers(3, 7))
        hb = rng.uniform(*boy)
        yy0 = y + (rng.uniform(-0.45, 0.45) * boy[1] if not ince else 0.0)  # tek sıra değil, dar bir bant
        for j in range(nb):
            u = (j + 0.5) / nb - 0.5
            h = hb * rng.uniform(0.55, 1.0) * (1 - 0.5 * abs(u))
            a = u * 1.1 + rng.uniform(-0.15, 0.15)
            bx = cx + u * hb * 0.5
            # yaprak: tabandan uca hafif kavis, rüzgârla eğilir
            uc = np.linspace(0, 1, 7)
            egim = a + sallanma * 0.6 * uc ** 1.5 + 0.25 * np.sign(u) * uc
            xs = bx + np.cumsum(np.sin(egim)) * h / 7
            ys = yy0 - np.cumsum(np.cos(egim)) * h / 7
            om = np.stack([np.concatenate([[bx], xs]), np.concatenate([[yy0 + 1.5], ys])], 1)
            w = np.linspace(rng.uniform(1.1, 1.8) * (0.7 if ince else 1.0), 0.15, len(om))
            P = _serit_np(om, w)
            (koyu if rng.random() < 0.35 else yollar).append(_poly(P))
    iz = B.lavi(yollar, renk1, yog=yog, Mloc=M, kenar=0.7, dalga=0.05, islak=0.8, islak_gen=1.6, gran=0.1, akis=0.2,
                renk2=renk2, toplam=True, ust=0.5)
    iz2 = B.lavi(koyu, golge, yog=yog * 0.85, Mloc=M, kenar=0.7, dalga=0.05, islak=0.7, islak_gen=1.5, gran=0.1,
                 akis=0.2, toplam=True, ust=0.5)
    if iz is None:
        return iz2
    if iz2 is not None:
        B.sakla(iz2)
    return iz


# ================================================================================================================
# 4. FIRTINA BULUTU
# ================================================================================================================
def _karis(a, b, t):
    a, b = renk(a), renk(b)
    return a + (b - a) * float(t)


def _gurultu(X, Y, kay, olcek, doku=None):
    doku = G_AKIS if doku is None else doku
    X = np.broadcast_to(X, np.broadcast_shapes(X.shape, Y.shape))
    Y = np.broadcast_to(Y, X.shape)
    xi = ((X * olcek + kay[0]) % N).astype(np.float32)
    yi = ((Y * olcek + kay[1]) % N).astype(np.float32)
    return cv2.remap(doku, xi, yi, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)


def _firtina_sekli(cx, cy, gen, yuk, rng):
    """Ağır, loblu üst ve hafif dalgalı tabanlı bulut silüeti + lob listesi. Uçlarda alçak omuz lobları tabanı
    yuvarlar (taban elipsi lobların dışına "şapka siperi" gibi taşmaz)."""
    n = int(rng.integers(6, 8))
    loblar = []
    for i in range(n):
        u = (i + 0.5) / n
        tepe = math.sin(u * math.pi) ** 0.8
        x = cx - gen * 0.39 + u * gen * 0.78 + rng.uniform(-0.03, 0.03) * gen
        r = yuk * (0.25 + 0.33 * tepe) * rng.uniform(0.9, 1.12)
        y = cy + yuk * 0.12 - r * 0.72 - tepe * yuk * 0.24
        loblar.append((x, y, r))
    # omuz lobları (taban köşeleri)
    for sgn in (-1, 1):
        r = yuk * rng.uniform(0.21, 0.25)
        loblar.append((cx + sgn * gen * rng.uniform(0.405, 0.425), cy + yuk * 0.17, r))
    p = yol_elips(cx, cy + yuk * 0.12, gen * 0.43, yuk * 0.28)
    for (x, y, r) in loblar:
        p = yol_op(p, yol_daire(x, y, r), 'birlesim')
    xs = np.linspace(cx - gen * 0.62, cx + gen * 0.62, 30)
    f1, f2 = rng.uniform(0, 6.28, 2)
    tb = cy + yuk * 0.32 + yuk * (0.04 * np.sin((xs - cx) / gen * 9 + f1) + 0.025 * np.sin((xs - cx) / gen * 17 + f2))
    tb += yuk * 0.07 * np.cos((xs - cx) / gen * math.pi) ** 2
    kes = np.concatenate([np.array([[cx - gen * 0.62, cy - yuk * 1.6]]), np.stack([xs, tb], 1),
                          np.array([[cx + gen * 0.62, cy - yuk * 1.6]])], 0)
    p = yol_op(p, _poly(kes), 'kesisim')
    return p, loblar[:n]


def ciz_firtina_bulutu(t: Tuval, M, cx, cy, gen, yuk, koyuluk=1.0, gelis=1.0, tohum=0, yon=0.0,
                       sakla_sonra=True):
    from motor import acilma_radyal
    gelis = min(1.0, max(0.0, float(gelis)))
    if gelis <= 0.0:
        return None
    k = min(1.0, max(0.0, float(koyuluk)))
    rng = np.random.default_rng(3301 + tohum * 7)
    eg = 1.0 - (1.0 - gelis) ** 3
    cx = cx + (1.0 - eg) * gen * 0.45 * yon
    yol, loblar = _firtina_sekli(cx, cy, gen, yuk, rng)
    B = _boya_ac(t, M, (cx - gen * 0.72, cy - yuk * 1.3, cx + gen * 0.72, cy + yuk * 1.0), tohum=tohum + 5)
    if B is None:
        return None
    ust_y, alt_y = cy - yuk * 0.95, cy + yuk * 0.38
    olc = math.sqrt(abs(np.linalg.det(np.asarray(M)[:2, :2])))
    ys_ = gen * olc / 900.0  # yumuşaklık ölçeği (ekran pikseli)
    orta_y = cy + yuk * 0.02

    # 1) üst: net, ışıklı kenarlı açık lavi (aşağı doğru söner)
    def ust_fn(X, Y):
        u = np.clip((Y - ust_y) / (alt_y - ust_y), 0, 1)
        return (0.5 + 0.25 * k + 0.7 * u) * (1.0 - smoothstep(orta_y - yuk * 0.05, alt_y - yuk * 0.05, Y))
    c1 = _karis('#C6CEDC', '#A9A5C2', k)
    c1b = _karis('#BAC6D8', '#A0A7C6', k)
    iz_ust = B.lavi(yol, c1, yog=0.34 + 0.24 * k, kenar=1.5, dalga=0.14, islak=0.9 + 0.3 * k, islak_gen=4.5,
                    gran=0.14, akis=0.14, renk2=c1b, yog_fn=ust_fn, siluet=False)
    if iz_ust is not None:  # saklamaya: üst kenar net, alt kenar yumuşak (aşağıdaki yumuşak lavi ekler)
        sl_, m_ = iz_ust
        X_, Y_ = B.xy_dilim(sl_)
        np.maximum(B.SIL[sl_], m_ * (1.0 - smoothstep(cy - yuk * 0.1, alt_y - yuk * 0.05, Y_)), out=B.SIL[sl_])
    # 2) alt: yumuşak kenarlı (ıslak-üstüne-ıslak) taban lavisi
    def alt_fn(X, Y):
        return smoothstep(cy - yuk * 0.35, orta_y + yuk * 0.12, Y)
    iz_alt = B.lavi(yol, c1, yog=0.34 + 0.24 * k, yumusak=(14 + 8 * k) * ys_, dalga=0.05, islak=0.0, gran=0.10,
                    akis=0.12, renk2=c1b, yog_fn=alt_fn, siluet=False)
    if iz_alt is not None:
        # yumuşak tabanın saklaması boyanın gerçek örtücülüğü kadar (kare): arkadaki gök kenarda bulutla karışır,
        # bulutla gök arasında kâğıt beyazı bir hale kalmaz. Üst yarıda yalnız net üst lavinin silüeti geçerli.
        sl_, m_ = iz_alt
        X_, Y_ = B.xy_dilim(sl_)
        # (geliş sırasında karın henüz koyulaşmadan taban açık kalır; saklama da o kadar zayıf)
        yk_ = 0.35 + 0.65 * sstep(0.2, 0.75, gelis)
        np.maximum(B.SIL[sl_], (m_ * m_) * (yk_ * smoothstep(cy - yuk * 0.3, cy + yuk * 0.05, Y_)), out=B.SIL[sl_])
    # 3) lob gölgeleri: her lobun altında yumuşak, yuvarlak koyuluk (hacim)
    # her lobun ışıktan uzak alt yanı doğrusal geçişle koyulaşır (üst kenarı yok: baloncuk/hilal izi bırakmaz)
    gl, gr_l = [], []
    for (x, y, r) in loblar:
        gl.append(yol_op(yol_daire(x, y, r * 0.95), yol, 'kesisim'))
        gr_l.append((x - 0.12 * r, y - 0.32 * r, x + 0.18 * r, y + 0.95 * r, 0.0, 1.0))
    B.lavi(gl, _karis('#ADB7C9', '#85819F', k), yog=(0.20 + 0.20 * k), yumusak=(13 + 5 * k) * ys_, dalga=0.08,
           islak=0.0, gran=0.06, akis=0.16, gradyanlar=gr_l, siluet=False)
    # 4) karın: alttan yukarı dağılan koyu lavi + geri akışlar
    karin_y = cy - yuk * 0.18
    karin = yol_op(yol, yol_dikdortgen(cx - gen, karin_y, cx + gen, cy + yuk * 2), 'kesisim')
    cicek = []
    for i in range(2):
        cicek.append((cx + (i - 0.5) * gen * rng.uniform(0.3, 0.5), cy + yuk * rng.uniform(0.02, 0.18),
                      yuk * rng.uniform(0.13, 0.19)))
    gr_ = sstep(0.3, 1.0, k)
    kay = (rng.uniform(0, 900), rng.uniform(0, 900))

    def karin_fn(X, Y):
        u = np.clip((Y - karin_y) / (alt_y - karin_y), 0, 1)
        d = 0.25 + 0.8 * u ** 0.8
        if gr_ > 0.02:
            n2 = _gurultu(X, Y, kay, 0.9 * 300 / gen, G_KENAR)
            for (bx, by, br) in cicek:
                dd = np.sqrt((X - bx) ** 2 + ((Y - by) * 1.3) ** 2) / br + 0.3 * n2
                ic = 1.0 - smoothstep(0.6, 1.0, dd)
                kenar_ = np.exp(-((dd - 0.95) / 0.1) ** 2)
                d = d * (1.0 - 0.22 * gr_ * ic) * (1.0 + 0.26 * gr_ * kenar_)
        return d
    yk = sstep(0.2, 0.75, gelis)
    if yk > 0:
        B.lavi(karin, _karis('#A3AEC3', '#5F5D86', k), yog=(0.26 + 0.34 * k) * yk, yumusak=(22 + 8 * k) * ys_,
               dalga=0.05,
               islak=0.0, gran=0.06, akis=0.12, renk2=_karis('#9DABC2', '#525B84', k), yog_fn=karin_fn,
               siluet=False)
    # 5) en koyu vurgular: karının içinde birkaç yumuşak leke
    vk = sstep(0.45, 0.95, gelis) * sstep(0.3, 1.0, k)
    if vk > 0:
        lek = []
        for i in range(3):
            x = cx + (i - 1) * gen * 0.28 + rng.uniform(-0.06, 0.06) * gen
            y = cy + yuk * rng.uniform(0.12, 0.26)
            lek.append(EL.damla_blob(x, y, 1.0, tohum=tohum * 5 + i, duzensizlik=0.2, lob=4,
                                     rx=gen * rng.uniform(0.1, 0.15), ry=yuk * rng.uniform(0.07, 0.1)))
        lek = [yol_op(q, yol, 'kesisim') for q in lek]
        B.lavi(lek, '#4D4B72', yog=0.30 * vk, yumusak=18 * ys_, dalga=0.05, islak=0.0, gran=0.05, akis=0.1,
               renk2='#58536F', siluet=False)
    if gelis < 1.0:
        with t.gorunurluk(1.0, acilma_radyal(min(1.0, gelis * 1.25), cx, cy, max(gen, yuk) * 0.62, dalga=0.22,
                                             tohum=tohum), M=M):
            B.bitir(sakla_sonra=sakla_sonra, siluet_yumusak=2.0)
    else:
        B.bitir(sakla_sonra=sakla_sonra, siluet_yumusak=2.0)
    x0e, y0e = nokta_donustur(M, cx - gen * 0.6, cy - yuk * 1.0)
    x1e, y1e = nokta_donustur(M, cx + gen * 0.6, alt_y)
    return dict(kutu=(x0e, y0e, x1e, y1e), taban_y=y1e, merkez=nokta_donustur(M, cx, cy))


# ================================================================================================================
# 5. YAĞMUR
# ================================================================================================================
def ciz_yagmur(t: Tuval, M, zaman, yogunluk, alan=(0, 0, W, H), ruzgar=0.0, tohum=0, zemin_y=None, korunan=None,
               hiz=2300.0, renk_='#76869F', yog=0.42, zemin_bant=70.0):
    """Yağmur çizgileri (bkz. modül belgesi). zemin_bant: damlaların zemine değdiği derinlik bandı (yerel; uzak
    damlalar zemin_y'nin bu kadar üstünde biter, sıçramalar tek bir çizgide dizilmez)."""
    x0, y0, x1, y1 = alan
    yg = max(0.0, float(yogunluk))
    if yg <= 0.001:
        return None
    rng = np.random.default_rng(5501 + tohum)
    gen_, yuk_ = x1 - x0, y1 - y0
    taban = y1 if zemin_y is None else zemin_y
    n_max = int(gen_ * (taban - y0) / 1700.0)
    n = int(n_max * min(yg, 1.5))
    if n <= 0:
        return None
    # her damla: x, faz, hız çarpanı, boy, kalınlık, derinlik
    X0 = rng.uniform(0, 1, n_max)[:n]
    FZ = rng.uniform(0, 1, n_max)[:n]
    HZ = rng.uniform(0.8, 1.2, n_max)[:n]
    BY = rng.uniform(0.6, 1.25, n_max)[:n]
    DR = rng.uniform(0, 1, n_max)[:n]  # 0 uzak (ince, soluk) .. 1 yakın
    ust = y0 - 120
    yol_boy = taban - ust
    egim = ruzgar * 0.55  # dx/dy
    v = hiz * HZ * (0.75 + 0.5 * DR)
    L = (45 + 70 * DR) * BY * (0.6 + 0.4 * min(1.0, yg))
    # baş konumu (y), döngüsel
    yb = ust + ((FZ * (yol_boy + L) + v * zaman) % (yol_boy + L))
    xb = x0 - abs(egim) * yuk_ * 0.6 * np.sign(egim) * 0 + X0 * (gen_ + abs(egim) * yol_boy) - \
        (abs(egim) * yol_boy if egim > 0 else 0) + egim * (yb - ust)
    ys = yb - L  # kuyruk
    xs = xb - egim * L
    alfa = np.ones(n)
    # zemin: başın zemini geçen kısmı kesilir (her damla kendi derinliğindeki zeminde: uzaktakiler biraz yukarıda)
    if zemin_y is not None:
        zem = taban - (1.0 - DR) * max(0.0, float(zemin_bant))
    else:
        zem = np.full(n, float(taban))
    yb_k = np.minimum(yb, zem)
    gor = yb_k - ys > 4
    parilti = []
    if korunan is not None:
        kx, ky, kr = korunan
        # hafif sapma: kürenin yanından geçen damlalar dışa itilir
        for arr_x, arr_y in ((xb, yb_k), (xs, ys)):
            dx, dy = arr_x - kx, arr_y - ky
            d = np.sqrt(dx * dx + dy * dy) + 1e-6
            itme = np.exp(-((d - kr) / (kr * 0.22)) ** 2) * kr * 0.06 * (np.abs(dx) > kr * 0.55)
            arr_x += np.sign(dx) * itme
        # başı küreye girmiş damlanın çizgisi küre yüzeyinde biter; kuyruğu da içerdeyse görünmez
        dxv, dyv = xb - xs, yb_k - ys
        aa = dxv * dxv + dyv * dyv + 1e-9
        bb = dxv * (xs - kx) + dyv * (ys - ky)
        cc = (xs - kx) ** 2 + (ys - ky) ** 2 - kr * kr
        dh = np.sqrt((xb - kx) ** 2 + (yb_k - ky) ** 2)
        bas_ic = dh < kr
        kuy_ic = cc < 0
        disk = np.maximum(bb * bb - aa * cc, 0.0)
        s_e = np.clip((-bb - np.sqrt(disk)) / aa, 0.0, 1.0)
        kes = bas_ic & ~kuy_ic
        ex, ey = xs + dxv * s_e, ys + dyv * s_e
        gecen_t = np.sqrt((xb - ex) ** 2 + (yb_k - ey) ** 2) / v  # yüzeye değeli geçen süre
        for i in np.flatnonzero(kes & (gecen_t < 0.07))[:60]:
            parilti.append((float(ex[i]), float(ey[i]), float(1.0 - gecen_t[i] / 0.07)))
        xb = np.where(kes, ex, xb)
        yb_k = np.where(kes, ey, yb_k)
        gor &= ~(bas_ic & kuy_ic)
        # yüzeye yakın damlalar ışıkta erir
        dmin = np.minimum(np.sqrt((xb - kx) ** 2 + (yb_k - ky) ** 2), np.sqrt(cc + kr * kr))
        alfa *= 0.55 + 0.45 * np.clip((dmin - kr) / (kr * 0.15), 0, 1)
    # sahne kenarında yumuşak beliriş
    alfa *= np.clip((ys - (y0 - 40)) / 80.0, 0, 1) + (ys > y0) * 0
    alfa *= np.clip((xb - x0) / 30.0 + 1, 0, 1) * np.clip((x1 - xb) / 30.0 + 1, 0, 1)
    k = yollar_kirp([yol_dikdortgen(x0 - 60, y0 - 130, x1 + 60, taban + 40)], M, 6)
    if k.bos():
        return None
    B = _Boya(t, M, k, tohum=tohum)
    # derinliğe göre iki geçiş: uzak ince/soluk, yakın kalın
    for katman, (d0, d1, kal, yy) in enumerate(((0.0, 0.55, 1.5, 0.6), (0.55, 1.01, 2.3, 1.0))):
        sec = np.flatnonzero(gor & (DR >= d0) & (DR < d1) & (alfa > 0.02))
        yollar, alf = [], []
        for i in sec:
            # fırça izi: başta kalın, kuyrukta incelen ince üçgen-şerit
            hx, hy = xb[i], yb_k[i]
            tx, ty = xs[i], ys[i]
            if hy - ty < 3:
                continue
            ux, uy = hx - tx, hy - ty
            ll = math.hypot(ux, uy) + 1e-6
            nx, ny = -uy / ll, ux / ll
            ex, ey = ux / ll, uy / ll
            w = kal * (0.7 + 0.6 * DR[i]) * 0.5
            # iğ biçimli fırça izi: kuyruk kıl inceliğinde, en geniş yer başa yakın (%80), baş yuvarlak
            mx, my = tx + ux * 0.8, ty + uy * 0.8
            pts = [(tx, ty), (mx + nx * w, my + ny * w), (hx + nx * w * 0.6 - ex * w * 0.3, hy + ny * w * 0.6 - ey * w * 0.3),
                   (hx + ex * w * 0.5, hy + ey * w * 0.5),
                   (hx - nx * w * 0.6 - ex * w * 0.3, hy - ny * w * 0.6 - ey * w * 0.3), (mx - nx * w, my - ny * w)]
            yollar.append(yol_cokgen(pts))
            alf.append(float(alfa[i]))
        if yollar:
            B.lavi(yollar, renk_, yog=yog * yy * min(1.0, 0.55 + 0.45 * yg), kenar=0.7, dalga=0.0, islak=0.35,
                   islak_gen=1.2, gran=0.08, akis=0.3, alfalar=alf, esik=False, sakla=False)
    # sıçrama halkaları: son 0.28 sn içinde zemine değen damlalar
    if zemin_y is not None:
        halkalar, h_alf = [], []
        cevrim = (yol_boy + L) / v
        gecen = ((FZ * (yol_boy + L) + v * zaman - (zem - ust)) % (yol_boy + L)) / v  # zemine değeli geçen süre
        for i in np.flatnonzero((gecen < 0.28) & (DR > 0.25))[:400]:
            if korunan is not None and alfa[i] < 0.3:
                continue
            u = gecen[i] / 0.28
            zy = float(zem[i])
            xh = X0[i] * (gen_ + abs(egim) * yol_boy) - (abs(egim) * yol_boy if egim > 0 else 0) + x0 + \
                egim * (zy - ust)
            r = (4 + 11 * DR[i]) * (0.35 + 0.65 * u ** 0.6)
            a = (1 - u) ** 1.3 * (0.6 + 0.4 * DR[i])
            halka = yol_op(yol_elips(xh, zy, r, r * 0.32), yol_elips(xh, zy - r * 0.04, r * 0.7, r * 0.18),
                           'fark')
            halkalar.append(halka)
            h_alf.append(a)
            if u < 0.5:
                for sgn in (-1, 1):
                    hx = xh + sgn * r * (0.55 + 0.3 * ((i * 7 + (sgn > 0)) % 3) / 2)
                    hy = zy - (1 - (2 * u - 0.5) ** 2) * (5 + 6 * DR[i]) * (0.8 + 0.4 * ((i * 3 + (sgn > 0)) % 2))
                    halkalar.append(yol_daire(hx, hy, 0.9 + 0.5 * DR[i]))
                    h_alf.append(a * 0.8)
        if halkalar:
            B.lavi(halkalar, renk_, yog=min(1.0, yog * 1.4), kenar=0.6, dalga=0.0, islak=0.3, islak_gen=1.0, gran=0.05,
                   akis=0.2, alfalar=h_alf, esik=False, sakla=False)
    B.bitir(sakla_sonra=False, sakla_global=False)
    # parıltılar (koruyucu kürenin yüzeyinde)
    for (px, py, a) in parilti:
        if a <= 0:
            continue
        t.isik(yol_daire(px, py, 3.2), M, '#FFF0C8', guc=0.8 * a, yumusak=3.5)
        t.isik(yol_daire(px, py, 1.4), M, '#FFFFFF', guc=0.7 * a, yumusak=0.8)
    return dict(sayi=int(np.count_nonzero(gor)))


# ================================================================================================================
# 6. UÇUŞAN YAPRAKLAR / TAÇ YAPRAKLARI
# ================================================================================================================
def ciz_ucusan_yapraklar(t: Tuval, M, zaman, sayi, alan=(0, 0, W, H), ruzgar=1.0, tohum=0, tur='yaprak',
                         boyut=1.0, renkler=None, yog=0.5):
    """Rüzgârda takla atan yapraklar/taç yaprakları (deterministik, zaman saniye)."""
    if sayi <= 0:
        return None
    x0, y0, x1, y1 = alan
    gen_, yuk_ = x1 - x0, y1 - y0
    rng = np.random.default_rng(7707 + tohum)
    n = int(sayi)
    if renkler is None:
        renkler = (['#93BC86', '#7FAE80', '#B9C98B', '#8FB2A2'] if tur == 'yaprak'
                   else ['#F0CFCB', '#EDB9BA', '#F4D6C6', '#E9A9AE'])
    yollar = {c: ([], []) for c in renkler}
    golge = []
    yon = 1.0 if ruzgar >= 0 else -1.0
    hz = abs(ruzgar)
    for i in range(n):
        fx, fy = rng.uniform(0, 1, 2)
        vx = (90 + 160 * rng.uniform()) * hz * yon + rng.uniform(-15, 15)
        vy = 40 + 60 * rng.uniform()
        sal_f, sal_a = rng.uniform(0.5, 1.2), rng.uniform(18, 46)
        don_h = rng.uniform(-3.0, 3.0)
        tak_h = rng.uniform(1.5, 4.0)
        f1, f2, f3 = rng.uniform(0, 6.28, 3)
        L = (rng.uniform(16, 26) if tur == 'yaprak' else rng.uniform(11, 17)) * boyut
        c = renkler[i % len(renkler)]
        # konum (döngüsel; alan dışına çıkınca öbür yandan girer)
        pad = 60
        px = x0 - pad + ((fx * (gen_ + 2 * pad) + vx * zaman + sal_a * math.sin(zaman * sal_f * 6.28 + f1)) %
                         (gen_ + 2 * pad))
        py = y0 - pad + ((fy * (yuk_ + 2 * pad) + vy * zaman + 0.5 * sal_a * math.sin(zaman * sal_f * 3.1 + f2)) %
                         (yuk_ + 2 * pad))
        aci = math.degrees(f3 + don_h * zaman) + 25 * math.sin(zaman * sal_f * 6.28 + f1)
        tak = math.cos(zaman * tak_h + f2)  # takla: görünen genişlik
        ag = 1.0
        # kenarlarda yumuşak giriş/çıkış
        ag *= min(1.0, max(0.0, (px - x0 + pad) / pad), max(0.0, (x1 + pad - px) / pad))
        ag *= min(1.0, max(0.0, (py - y0 + pad) / pad), max(0.0, (y1 + pad - py) / pad))
        if ag <= 0.02:
            continue
        if tur == 'yaprak':
            pts = _yaprak_np(0, 0, L, L * 0.28, 0, kivrim=0.12 * tak)
            pts[:, 0] -= L * 0.5
            pts[:, 1] *= max(0.18, abs(tak))
        else:
            # taç yaprağı: yelpaze/kaşık biçimi
            uu = np.linspace(0.0, 1.0, 16)
            gw = L * 0.36 * np.sin(np.clip(uu, 0, 1) * math.pi * 0.92) ** 0.75 * (0.55 + 0.45 * uu)
            gw[-1] = 0.0
            ox = -L * 0.5 + L * uu - L * 0.06 * (1 - np.cos(uu * math.pi))  # uç yuvarlak (kaşık)
            pts = np.concatenate([np.stack([ox, gw], 1), np.stack([ox[::-1], -gw[::-1]], 1)[1:-1]], 0)
            pts[:, 1] *= max(0.2, abs(tak))
        ca, sa = math.cos(math.radians(aci)), math.sin(math.radians(aci))
        P = np.stack([pts[:, 0] * ca - pts[:, 1] * sa + px, pts[:, 0] * sa + pts[:, 1] * ca + py], 1)
        yollar[c][0].append(_poly(P))
        yollar[c][1].append(ag * (0.75 + 0.25 * abs(tak)))
        if tak < 0:  # arka yüzü görünürken biraz daha koyu
            golge.append((_poly(P), ag * 0.5 * abs(tak)))
    k = yollar_kirp([yol_dikdortgen(x0 - 80, y0 - 80, x1 + 80, y1 + 80)], M, 4)
    if k.bos():
        return None
    B = _Boya(t, M, k, tohum=tohum + 77)
    if golge:
        B.lavi([g_[0] for g_ in golge], '#5E7F6A' if tur == 'yaprak' else '#C9707E', yog=yog * 0.5, kenar=0.8,
               dalga=0.04, islak=0.6, islak_gen=1.5, gran=0.06, akis=0.1, alfalar=[g_[1] for g_ in golge],
               siluet=False, sakla=False)
    for c, (yy, aa) in yollar.items():
        if yy:
            B.lavi(yy, c, yog=yog, kenar=0.8, dalga=0.04, islak=1.0, islak_gen=1.8, gran=0.06, akis=0.15,
                   toplam=True, alfalar=aa, ust=0.6, siluet=False, sakla=False)
    B.bitir(sakla_sonra=False, sakla_global=False)
    return None


# ================================================================================================================
# 7. ÇİÇEK FİDANI (şakayık / gül)
# ================================================================================================================
_FIDAN_IS = {}


def _fidan_iskelet(tohum):
    if tohum in _FIDAN_IS:
        return _FIDAN_IS[tohum]
    rng = np.random.default_rng(6101 + tohum * 13)
    n = int(rng.choice([2, 3, 3, 1, 2]))
    cicekler = []
    for i in range(n):
        u = (i + 0.5) / n - 0.5
        cicekler.append(dict(dx=u * 0.62 + rng.uniform(-0.06, 0.06), h=rng.uniform(0.74, 0.92) if i != n // 2 else 1.0,
                             r=rng.uniform(0.17, 0.21), egim=rng.uniform(0.32, 0.45), aci=rng.uniform(-14, 14),
                             f=(0.0 if i == n // 2 else rng.uniform(0.25, 1.0)), tohum=int(rng.integers(0, 999)),
                             bx=rng.uniform(-0.05, 0.05), kiv=rng.uniform(-0.12, 0.12)))
    # tomurcuklar (küçük, kapalı)
    tomur = []
    for i in range(int(rng.integers(1, 4))):
        tomur.append(dict(dx=rng.uniform(-0.45, 0.45), h=rng.uniform(0.55, 0.85), r=rng.uniform(0.045, 0.06),
                          kiv=rng.uniform(-0.2, 0.2), aci=rng.uniform(-20, 20)))
    # yalnız yapraklı saplar (çalıyı doldurur)
    yesil = []
    for i in range(int(rng.integers(2, 4))):
        yesil.append(dict(dx=rng.uniform(-0.5, 0.5), h=rng.uniform(0.38, 0.62), kiv=rng.uniform(-0.25, 0.25)))
    # yapraklar: her sapın üzerinde, 3'lü (bileşik) gruplar
    yapraklar = []
    n_sap = n + len(tomur) + len(yesil)
    for sp in range(n_sap):
        cicekli = sp < n
        tr = rng.choice([-1, 1])
        us = np.arange(rng.uniform(0.2, 0.28), 0.82 if cicekli else 0.95, rng.uniform(0.22, 0.28))
        for u in us:
            boy_k = 1.15 - 0.45 * u
            for j, da in enumerate((-34, 0, 34)):
                yapraklar.append(dict(sap=int(sp), u=float(u), taraf=int(tr), aci=58 * tr + da + rng.uniform(-8, 8),
                                      L=rng.uniform(0.15, 0.22) * boy_k * (0.8 if j != 1 else 1.0),
                                      kat=int(rng.random() < 0.45), kiv=rng.uniform(-0.15, 0.15)))
            tr = -tr
    isk = dict(cicekler=cicekler, tomur=tomur, yapraklar=yapraklar, yesil=yesil)
    _FIDAN_IS[tohum] = isk
    return isk


def _sap_noktalari(x, y, dx, h, kiv, sallanma, solgun, boy, n=12):
    """Tabandan başa kavisli sap (yerel). solgun: baş aşağı/dışa sarkar."""
    u = np.linspace(0, 1, n)
    ux = x + dx * boy * u ** 1.4 + kiv * boy * np.sin(u * math.pi) * 0.5
    uy = y - h * boy * u
    # sallanma: üstte daha çok
    ux = ux + sallanma * boy * 0.09 * u ** 1.6
    if solgun > 0:
        sg = np.sign(dx) if abs(dx) > 0.02 else 1.0
        ux = ux + solgun * boy * 0.12 * u ** 2 * sg
        uy = uy + solgun * boy * 0.10 * u ** 2.5
    return np.stack([ux, uy], 1)


def _tomurcuk_yollari(px, py, r, aci, acik, renk_):
    """Kapalı tomurcuk: sivri uçlu pembe gövde + çanak yapraklar. acik 0..1 çanakların ayrılması."""
    a = math.radians(aci)
    ca, sa = math.cos(a), math.sin(a)

    def don(P):
        return np.stack([P[:, 0] * ca - P[:, 1] * sa + px, P[:, 0] * sa + P[:, 1] * ca + py], 1)
    u = np.linspace(0, 2 * math.pi, 40, endpoint=False)
    # damla biçimli gövde (uç yukarıda)
    bx = np.sin(u) * r * (0.9 + 0.1 * acik)
    by = -np.cos(u) * r * 1.15
    by = np.where(by < 0, by * (1.25 - 0.2 * acik), by)
    bx = bx * (1 - 0.35 * np.clip(-by / (r * 1.4), 0, 1) ** 2)
    govde = don(np.stack([bx, by], 1))
    canak = []
    for s_ in (-1, 1, 0):
        L = r * (1.25 if s_ else 1.05) * (1.0 - 0.15 * acik)
        P = _yaprak_np(s_ * r * 0.2, r * 1.0, L, r * (0.48 if s_ else 0.4), -90 + s_ * (24 + 34 * acik),
                       kivrim=0.12 * s_)
        canak.append(don(P))
    return govde, canak


def _tomurcuk_boya(B, liste, renk_k):
    """liste: [(px, py, rb, aci, acik, alfa[, canak_alfa]), ...] tomurcuklar (önce çanaklar, sonra pembe gövde)."""
    if not liste:
        return
    gv, gva, cn, cna = [], [], [], []
    for q in liste:
        px, py, rb, aci, acik, a = q[:6]
        ac_ = a * (q[6] if len(q) > 6 else 1.0)
        govde, canak = _tomurcuk_yollari(px, py, rb, aci, acik, None)
        gv.append(_poly(govde))
        gva.append(a)
        if ac_ > 0.004:
            for cc in canak:
                cn.append(_poly(cc))
                cna.append(ac_)
    izc = B.lavi(cn, '#7DA676', yog=0.55, kenar=0.8, dalga=0.05, islak=1.0, islak_gen=1.6, gran=0.08, akis=0.15,
                 toplam=True, alfalar=cna, ust=0.4, renk2='#6C9A70')
    B.sakla(izc)
    izg = B.lavi(gv, renk_k[2], yog=0.55, kenar=0.8, dalga=0.05, islak=1.1, islak_gen=1.8, gran=0.08,
                 akis=0.15, alfalar=gva, renk2=renk_k[3])
    B.sakla(izg)


def ciz_cicek_fidani(t: Tuval, M, x, y, boy, renk_='allik', acilma=0.0, sallanma=0.0, solgunluk=0.0, tohum=0,
                     isik=(-0.6, -0.8), sakla_sonra=True):
    from motor import acilma_radyal
    isk = _fidan_iskelet(tohum)
    ac = float(acilma)
    sg = min(1.0, max(0.0, float(solgunluk)))
    sg = sg * (1.0 - 0.25 * sg * sg)  # üst uçta yumuşar: 1 = belirgin sarkma, ezilmiş/yatmış çalı değil
    lx, ly = isik
    ln = math.hypot(lx, ly) + 1e-9
    lx, ly = lx / ln, ly / ln
    renk_k = EL.CICEK_RENK.get(renk_, EL.CICEK_RENK['allik'])
    # saplar
    saplar = []
    for c in isk['cicekler']:
        saplar.append(_sap_noktalari(x + c['bx'] * boy, y, c['dx'], c['h'] * 0.86, c['kiv'], sallanma, sg, boy))
    for tm in isk['tomur']:
        saplar.append(_sap_noktalari(x, y, tm['dx'], tm['h'] * 0.86, tm['kiv'], sallanma * 1.2, sg * 0.8, boy))
    for ye in isk.get('yesil', []):
        saplar.append(_sap_noktalari(x, y, ye['dx'], ye['h'], ye['kiv'], sallanma * 0.8, sg * 0.7, boy))
    # kırpıntı
    allp = np.concatenate(saplar, 0)
    pad = boy * 0.45
    B = _boya_ac(t, M, (allp[:, 0].min() - pad, allp[:, 1].min() - pad, allp[:, 0].max() + pad, y + 10),
                 tohum=tohum + 21)
    if B is None:
        return None
    sonuc = []
    # --- 1) çiçekler (öndeki: daha alçak olanlar önce) ---
    sira = sorted(range(len(isk['cicekler'])), key=lambda i: -saplar[i][-1, 1])
    tomur_ciz = []
    olc_M = math.sqrt(abs(np.linalg.det(np.asarray(M)[:2, :2])))
    for i in sira:
        c = isk['cicekler'][i]
        p = min(1.0, max(0.0, ac * 1.3 - 0.3 * c['f']))
        px, py = saplar[i][-1]
        r = c['r'] * boy
        egim = min(0.75, c['egim'] + 0.25 * sg)
        aci = c['aci'] + sallanma * 9 + sg * 18 * (1 if c['dx'] >= 0 else -1)
        acik_q = sstep(0.32, 0.78, p)  # açılış (radyal beliriş)
        cy_ = py - r * 0.08
        tb = 1.0 - sstep(0.48, 0.68, p)  # tomurcuk, taç yaprakları çevresinde açıldıktan sonra erir
        tom = None
        if tb > 0.01:
            rb = r * (0.26 + 0.14 * sstep(0.0, 0.45, p)) * (1.0 - 0.45 * acik_q)
            tom = (px, py - rb * 0.6, rb, aci * 0.5, sstep(0.15, 0.5, p), 1.0)
        if acik_q > 0.001:
            # açılış: tomurcuk ÖNDE kalır (kendi katmanında, solarak), taç yaprakları onun arkasından ve çevresinden
            # açılır; tomurcuk çiçeğin göbeğine eriyerek kaybolur (göbek tomurcuğun üstüne "yapışık" görünmez)
            if tom is not None:
                bx_, by_, rb_ = tom[0], tom[1], tom[2]
                # (B ile aynı doku tohumu: kapalı tomurcuktan öne geçişte renk/doku sıçramasın)
                Bt = _boya_ac(t, M, (bx_ - rb_ * 2.2, by_ - rb_ * 2.4, bx_ + rb_ * 2.2, by_ + rb_ * 2.6),
                              tohum=tohum + 21)
                if Bt is not None:
                    # çanaklar gövdeden önce çekilir (yeşil hayalet çanak taç yapraklarının üstünde kalmasın)
                    _tomurcuk_boya(Bt, [tom + (1.0 - sstep(0.44, 0.58, p),)], renk_k)
                    with t.gorunurluk(tb):
                        Bt.bitir(sakla_sonra=True, siluet_yumusak=0.8)
            ac_f = 0.45 + 0.55 * sstep(0.55, 1.0, p)
            yg = 1.0 - 0.12 * sg
            if acik_q < 0.999:
                with t.gorunurluk(1.0, acilma_radyal(acik_q, px, cy_ - r * 0.12 * (1 - acik_q), r * 1.1, dalga=0.16,
                                                     on=0.2, tohum=c['tohum']), M=M):
                    EL.sakayik(t, M, px, cy_, r, renk_, tohum=c['tohum'], acilma=ac_f, yog=yg, egim=egim, aci=aci)
            else:
                EL.sakayik(t, M, px, cy_, r, renk_, tohum=c['tohum'], acilma=ac_f, yog=yg, egim=egim, aci=aci)
        elif tom is not None:
            tomur_ciz.append(tom)
        sonuc.append((nokta_donustur(M, px, cy_), r * olc_M, p))
    for j, tm in enumerate(isk['tomur']):
        px, py = saplar[len(isk['cicekler']) + j][-1]
        tomur_ciz.append((px, py, tm['r'] * boy, tm['aci'] + sallanma * 10, 0.15 * min(1, ac), 1.0))
    # --- 2) kapalı tomurcuklar ---
    _tomurcuk_boya(B, tomur_ciz, renk_k)
    # --- 3) yapraklar (ön kat), saplar, arka kat ---
    yap = ([], [], []), ([], [], [])
    for yp in isk['yapraklar']:
        sp = saplar[min(yp['sap'], len(saplar) - 1)]
        j = int(yp['u'] * (len(sp) - 1))
        px, py = sp[j]
        aci = -90 + yp['aci'] + sallanma * 12 + sg * 28 * yp['taraf']
        L = yp['L'] * boy
        P = _yaprak_np(px, py, L, L * 0.27, aci, kivrim=yp['kiv'] * yp['taraf'] + 0.1 * sg * yp['taraf'])
        hedef = yap[yp['kat']]
        hedef[0].append(_poly(P))
        ar = math.radians(aci)
        nx, ny = -math.sin(ar), math.cos(ar)
        if nx * (-lx) + ny * (-ly) < 0:
            nx, ny = -nx, -ny
        h = _yaprak_np(px + nx * L * 0.07, py + ny * L * 0.07, L * 0.95, L * 0.12, aci,
                       kivrim=yp['kiv'] * yp['taraf'] + 0.1 * sg * yp['taraf'])
        hedef[1].append(_poly(h))
    sol = 1.0 - 0.15 * sg
    if yap[0][0]:
        iz = B.lavi(yap[0][0], '#8DB783', yog=0.50 * sol, kenar=0.9, dalga=0.05, islak=1.0, islak_gen=2.2, gran=0.08,
                    akis=0.18, toplam=True, ust=0.15, renk2='#74A57A')
        B.lavi(yap[0][1], '#4F8463', yog=0.30, kenar=0.8, dalga=0.05, islak=0.8, islak_gen=1.8, gran=0.08, akis=0.1,
               siluet=False)
        B.sakla(iz)
    sap_y = []
    w0 = max(0.9, boy * 0.011)
    for sp in saplar:
        sap_y.append(_poly(_serit_np(sp, np.linspace(w0, w0 * 0.6, len(sp)))))
    iz = B.lavi(sap_y, '#7E9467', yog=0.6, kenar=0.7, dalga=0.04, islak=0.7, islak_gen=1.5, gran=0.1, akis=0.12,
                renk2='#8A8A62')
    B.sakla(iz)
    if yap[1][0]:
        B.lavi(yap[1][0], '#6E9C76', yog=0.52 * sol, kenar=0.9, dalga=0.05, islak=1.0, islak_gen=2.2, gran=0.08,
               akis=0.18, toplam=True, ust=0.15, renk2='#5F8E72')
        B.lavi(yap[1][1], '#3F6F57', yog=0.30, kenar=0.8, dalga=0.05, islak=0.8, islak_gen=1.8, gran=0.08, akis=0.1,
               siluet=False)
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(cicekler=sonuc, kutu=nokta_donustur(M, allp[:, 0].min() - pad, allp[:, 1].min() - pad) +
                nokta_donustur(M, allp[:, 0].max() + pad, y))


# ================================================================================================================
# 8. ZEMİN ÖĞELERİ: yol, taş, dere, çimen, tarh
# ================================================================================================================
def _genislikler(noktalar, genislik, daralma):
    P = np.asarray(noktalar, np.float64)
    if np.ndim(genislik) == 0:
        d = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
        u = d / max(d[-1], 1e-6)
        return float(genislik) * (1.0 - daralma * u)
    return np.asarray(genislik, np.float64)


def _yumusak_omurga(noktalar, n=None):
    """Catmull-Rom ile sıklaştırılmış omurga (n,2)."""
    P = np.asarray(noktalar, np.float64)
    if len(P) < 3:
        return P
    n = n or max(40, 12 * len(P))
    Q = np.concatenate([P[:1] * 2 - P[1:2], P, P[-1:] * 2 - P[-2:-1]], 0)
    out = []
    per = max(2, n // (len(P) - 1))
    for i in range(1, len(Q) - 2):
        p0, p1, p2, p3 = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
        for s in np.linspace(0, 1, per, endpoint=False):
            s2, s3 = s * s, s * s * s
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 +
                              (-p0 + 3 * p1 - 3 * p2 + p3) * s3))
    out.append(P[-1])
    return np.array(out)


def ciz_yol(t: Tuval, M, noktalar, genislik, tohum=0, daralma=0.88, sakla_sonra=True):
    rng = np.random.default_rng(1201 + tohum)
    P0 = np.asarray(noktalar, np.float64)
    om = _yumusak_omurga(P0)
    w = _genislikler(P0, genislik, daralma)
    # genişliği sık omurgaya aktar
    d0 = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P0, axis=0), axis=1))])
    d1 = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(om, axis=0), axis=1))])
    wo = np.interp(d1 / max(d1[-1], 1e-6), d0 / max(d0[-1], 1e-6), w) * 0.5
    # kenarlara hafif düzensizlik
    f = rng.uniform(0, 6.28, 2)
    u = d1 / max(d1[-1], 1e-6)
    wo_s = wo * (1 + 0.06 * np.sin(u * 37 + f[0]) + 0.04 * np.sin(u * 83 + f[1]))
    kutu = (om[:, 0].min() - wo.max() - 20, om[:, 1].min() - 20, om[:, 0].max() + wo.max() + 20,
            om[:, 1].max() + wo.max() + 20)
    B = _boya_ac(t, M, kutu, tohum=tohum + 31)
    if B is None:
        return None
    yol_s = _poly(_serit_np(om, wo_s))
    # küçük taşlar (önde)
    cak = []
    nc = int(d1[-1] / 40)
    for i in range(nc):
        s = rng.uniform(0, 1) ** 0.8
        j = min(int(s * (len(om) - 1)), len(om) - 2)
        tan = om[j + 1] - om[j]
        tan /= np.linalg.norm(tan) + 1e-9
        nor = np.array([-tan[1], tan[0]])
        side = rng.choice([-1, 1]) * rng.uniform(0.55, 0.95)
        c = om[j] + nor * wo[j] * side
        r = max(0.8, wo[j] * rng.uniform(0.025, 0.06))
        cak.append(_poly(_cakil(rng, c[0], c[1], r)))
    if cak:
        iz = B.lavi(cak, '#B9AFA6', yog=0.45, kenar=0.7, dalga=0.05, islak=0.9, islak_gen=1.5, gran=0.12, akis=0.15)
        B.sakla(iz)
    # kenar sırrı: iki kenar boyunca içte koyu bant
    kenar_y = []
    for sgn in (-1, 1):
        tan = np.gradient(om, axis=0)
        tan /= np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9
        nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
        o2 = om + nor * (sgn * wo_s * 0.8)[:, None]
        kenar_y.append(_poly(_serit_np(o2, wo_s * 0.22)))
    B.lavi(kenar_y, '#CDB290', yog=0.28, kenar=1.2, dalga=0.14, islak=0.6, islak_gen=3, gran=0.16, akis=0.2,
           siluet=False)
    # orta iz: yürünmüş, biraz açık; lekeler
    lek = []
    for i in range(int(d1[-1] / 90)):
        s = rng.uniform(0.0, 0.95)
        j = int(s * (len(om) - 1))
        c = om[j]
        lek.append(EL.damla_blob(c[0] + rng.uniform(-0.3, 0.3) * wo[j], c[1], 1.0, tohum=int(rng.integers(0, 999)),
                                 duzensizlik=0.2, lob=4, rx=wo[j] * rng.uniform(0.2, 0.45),
                                 ry=wo[j] * rng.uniform(0.06, 0.12)))
    B.lavi(lek, '#D6BE98', yog=0.22, kenar=1.4, dalga=0.18, islak=0.5, islak_gen=3, gran=0.16, akis=0.2,
           siluet=False, toplam=True, ust=0.3)
    B.lavi(yol_s, '#E7D3AF', yog=0.5, kenar=1.3, dalga=0.12, islak=0.85, islak_gen=3.5, gran=0.16, akis=0.18,
           renk2='#E2C9A2')
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(omurga=[nokta_donustur(M, p[0], p[1]) for p in om[::max(1, len(om) // 24)]])


def _tas_sekli(x, y, r, rng, yass=1.0):
    """Taban (x,y) üzerinde duran yuvarlak kaya noktaları; yass < 1 yassı."""
    n = 48
    a = np.linspace(0, 2 * math.pi, n, endpoint=False)
    f = rng.uniform(0, 6.28, 5)
    rr = r * (1 + 0.10 * np.sin(2 * a + f[0]) + 0.06 * np.sin(3 * a + f[1]) + 0.035 * np.sin(5 * a + f[2])
              + 0.015 * np.sin(9 * a + f[3]))
    hx = rng.uniform(1.05, 1.3)
    hy = rng.uniform(0.74, 0.95) * yass
    px = np.cos(a) * rr * hx
    py = np.sin(a) * rr * hy
    # üst taraf bir yana doğru daha yüksek (asimetri), alt düz
    egik = rng.uniform(-0.18, 0.18)
    py = np.where(py < 0, py * (1 + egik * np.cos(a)), py * 0.3)
    return np.stack([px + x, py + y - r * hy * 0.3], 1), r * hy


def _tas_boya(B, M, x, y, r, rng, isik, yass=1.0, renk1='#C8BEB5', renk2='#B9B0B3', golge='#8A8496',
              golge_yer=True, islak_tas=0.0):
    lx, ly = isik
    P, hh = _tas_sekli(x, y, r, rng, yass)
    yol = _poly(P)
    cy = y - hh * 0.5
    d = r * 0.36
    gol = yol_op(yol, _poly(P * np.array([1.0, 1.0]) + np.array([lx * d, ly * d * 0.9])), 'fark')
    olc = math.sqrt(abs(np.linalg.det(np.asarray(M)[:2, :2])))
    cz = []
    if r * olc > 16:
        a0 = rng.uniform(-0.35, 0.35)
        q = np.array([[x + r * (0.05 + a0), y - hh * 0.92], [x + r * (0.22 + a0), y - hh * 0.6],
                      [x + r * (0.14 + a0), y - hh * 0.3]])
        cz.append(_poly(q, kapali=False))

    def ton(X, Y):  # ışıktan uzaklaştıkça koyulaşan ıslak geçiş
        dd = ((X - x) * (-lx) + (Y - cy) * (-ly)) / (r * 1.1)
        return 0.8 + 0.4 * np.clip(dd, -0.8, 1.0)
    iz = B.lavi(yol, renk1, yog=0.6 + 0.12 * islak_tas, Mloc=M, kenar=1.0, dalga=0.08, islak=1.05, islak_gen=2.5,
                gran=0.18, akis=0.22, renk2=renk2, yog_fn=ton,
                isik_kenar=(lx * r * 0.25 * olc, ly * r * 0.25 * olc, 0.32))
    B.lavi(gol, golge, yog=0.38 + 0.1 * islak_tas, Mloc=M, kenar=1.0, dalga=0.1, islak=0.95, islak_gen=2.2,
           gran=0.16, akis=0.15, siluet=False)
    # taban teması: ince koyu bant
    taban = yol_op(yol, yol_dikdortgen(x - r * 2, y - hh * 0.16, x + r * 2, y + r), 'kesisim')
    B.lavi(taban, '#6E6879' if islak_tas < 0.25 else '#6F8597', yog=0.26 * (1 - 0.5 * islak_tas), Mloc=M,
           yumusak=max(1.0, r * 0.07 * olc), dalga=0.1, islak=0.0, gran=0.1, akis=0.1, siluet=False)
    if cz:
        B.lavi(cz, golge, yog=0.34, Mloc=M, kenar=0.6, dalga=0.1, islak=0.2, islak_gen=1, gran=0.1, akis=0.1,
               cizgi=max(0.8, r * 0.025), siluet=False, esik=False)
    B.sakla(iz)
    if golge_yer:
        # zemine düşen gölge (ışığın tersine), taşın arkasında: net kenarlı lavanta sır
        gx = x - lx * r * 0.75
        gol2 = yol_elips(gx, y + r * 0.015, r * 1.25, r * 0.17, math.degrees(math.atan2(-ly, -lx)) * 0.0)
        B.lavi(gol2, '#9A93A8', yog=0.4, Mloc=M, kenar=1.4, dalga=0.15, islak=0.6, islak_gen=2.5, gran=0.12,
               akis=0.15)
    return iz


def ciz_tas(t: Tuval, M, x, y, r, tohum=0, isik=(-0.6, -0.8), yass=1.0, sakla_sonra=True):
    rng = np.random.default_rng(2207 + tohum)
    lx, ly = isik
    ln = math.hypot(lx, ly) + 1e-9
    B = _boya_ac(t, M, (x - r * 2.2, y - r * 1.4, x + r * 2.2, y + r * 0.5), tohum=tohum + 41)
    if B is None:
        return None
    _tas_boya(B, M, x, y, r, rng, (lx / ln, ly / ln), yass=yass)
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(tepe=nokta_donustur(M, x, y - r))


def ciz_cimen(t: Tuval, M, x0, x1, y, yogunluk=1.0, sallanma=0.0, tohum=0, boy=(14, 34), sakla_sonra=True):
    rng = np.random.default_rng(3307 + tohum)
    B = _boya_ac(t, M, (x0 - 20, y - boy[1] * 1.5, x1 + 20, y + boy[1] * 0.5 + 6), tohum=tohum + 51)
    if B is None:
        return None
    _cimen_boya(B, M, x0, x1, y, yogunluk, sallanma, rng, boy=boy)
    B.bitir(sakla_sonra=sakla_sonra)
    return None


def ciz_tarh(t: Tuval, M, x0, x1, y, tohum=0, yuk=None, bolum='hepsi', sakla_sonra=True):
    """Koyu, zengin topraklı bahçe tarhı. y: bitkilerin dikildiği üst yüzey çizgisi."""
    rng = np.random.default_rng(4407 + tohum)
    L = x1 - x0
    hh = float(yuk if yuk is not None else min(70.0, max(30.0, L * 0.09)))
    B = _boya_ac(t, M, (x0 - 20, y - hh, x1 + 20, y + hh), tohum=tohum + 61)
    if B is None:
        return None
    xs = np.linspace(x0, x1, 60)
    u = (xs - x0) / L
    uc = min(0.5, hh * 1.4 / L)
    yuv = np.sqrt(np.clip(np.minimum(u, 1 - u) / uc, 0, 1))
    yuv = yuv * (2 - yuv)
    f = rng.uniform(0, 6.28, 3)
    topak = np.abs(np.sin(u * L / (hh * 0.22) + f[0])) ** 0.6 * 0.07 + 0.03 * np.sin(u * 41 + f[1])
    for _ in range(max(2, int(L / (hh * 2.2)))):  # iri kesekler
        c_, w_ = rng.uniform(0.05, 0.95), rng.uniform(0.012, 0.03) * (hh * 30 / L)
        topak = topak + rng.uniform(0.05, 0.11) * np.exp(-((u - c_) / w_) ** 2)
    ust = y - hh * 0.30 * yuv - hh * topak * yuv
    on_ust = y + hh * 0.12 * yuv + hh * 0.04 * np.sin(u * 17 + f[1])  # ön yüzün başladığı çizgi
    alt = y + hh * 0.55 * (0.4 + 0.6 * yuv) + hh * 0.04 * np.sin(u * 11 + f[2])
    tum = _poly(np.concatenate([np.stack([xs, ust], 1), np.stack([xs[::-1], alt[::-1]], 1)], 0))
    on = _poly(np.concatenate([np.stack([xs, on_ust], 1), np.stack([xs[::-1], alt[::-1]], 1)], 0))

    def alt_sol(X, Y):  # alt kenara doğru solma (toprak zemine karışır)
        ab = np.interp(X, xs, alt).astype(np.float32)
        return 1.0 - smoothstep(ab - hh * 0.34, ab + hh * 0.02, Y)

    def govde(yol_, yf_):
        iz_ = B.lavi(yol_, '#6F4A38', yog=0.70, kenar=1.1, dalga=0.12, islak=0.9, islak_gen=3, gran=0.16, akis=0.2,
                     renk2='#654238', yog_fn=lambda X, Y: yf_(X, Y) * alt_sol(X, Y), siluet=False)
        if iz_ is not None:  # saklama da solan alt kenarla birlikte azalır (arkada açık hale kalmasın)
            sl_, m_ = iz_
            X_, Y_ = B.xy_dilim(sl_)
            np.maximum(B.SIL[sl_], m_ * np.sqrt(alt_sol(X_, Y_)), out=B.SIL[sl_])
        B.lavi(yol_, '#46322F', yog=0.36, kenar=1.1, dalga=0.12, islak=0.8, islak_gen=3, gran=0.16, akis=0.2,
               siluet=False, yog_fn=lambda X, Y: (0.4 + 0.6 * np.clip((Y - y) / (hh * 0.5), 0, 1)) * alt_sol(X, Y))
    if bolum in ('hepsi', 'on'):
        # topak ve benekler
        ben = []
        for i in range(int(L / 9)):
            xx = rng.uniform(x0 + 6, x1 - 6)
            uu = (xx - x0) / L
            yv = min(1.0, math.sqrt(max(0.0, min(uu, 1 - uu) / uc)))
            yv = yv * (2 - yv)
            yt = y - hh * 0.30 * yv
            yb = y + hh * 0.55 * (0.4 + 0.6 * yv)
            yy = rng.uniform(yt + 2, yb - 2)
            ben.append(_poly(_cakil(rng, xx, yy, rng.uniform(0.8, 2.2))))
        izb = B.lavi(ben, '#5C463D', yog=0.4, kenar=0.6, dalga=0.05, islak=0.5, islak_gen=1, gran=0.1, akis=0.1,
                     siluet=False)
        if bolum == 'on':
            govde(on, lambda X, Y: 0.62 + 0.55 * np.clip((Y - (y - hh * 0.35)) / (hh * 0.8), 0, 1))
            B.bitir(sakla_sonra=sakla_sonra)
            return dict(ust_y=float(nokta_donustur(M, (x0 + x1) / 2, ust.min())[1]))
    # tam tarh: üst yüzey açık (ışık), ön yüz koyu sır
    def isik_fn(X, Y):
        return 0.62 + 0.55 * np.clip((Y - (y - hh * 0.35)) / (hh * 0.8), 0, 1)
    govde(tum, isik_fn)
    # üst yüzeyde topaklar (açık kenarlı küçük kesekler)
    kr = []
    for j in range(int(L / 14)):
        xx = rng.uniform(x0 + hh * 0.5, x1 - hh * 0.5)
        uu = (xx - x0) / L
        yv = min(1.0, math.sqrt(max(0.0, min(uu, 1 - uu) / uc)))
        yv = yv * (2 - yv)
        yy = y - hh * rng.uniform(0.0, 0.26) * yv
        kr.append(_poly(_cakil(rng, xx, yy, rng.uniform(1.5, 3.5))))
    B.lavi(kr, '#4E3A35', yog=0.3, kenar=0.8, dalga=0.1, islak=0.8, islak_gen=1.5, gran=0.15, akis=0.15,
           siluet=False)
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(ust_y=float(nokta_donustur(M, (x0 + x1) / 2, ust.min())[1]))


def ciz_yokus(t: Tuval, M, x0, x1, taban, tepe_x, tepe_y, tohum=0, isik=(-0.6, -0.8), renk1='#A9C48F',
              renk2='#7FA27E', cimen=True, sakla_sonra=True):
    """Dik yokuş/tepe: (x0, taban)'dan dikçe yükselip (tepe_x, tepe_y)'de doruğa varan, x1'e doğru yavaşça inen tepe.
    Işıklı yamaç açık, gölge yamaç ikinci sırla koyu; yamaçta hafif kıvrım bantları ve uzaklaştıkça küçülen çimen
    izleri."""
    rng = np.random.default_rng(6607 + tohum)
    lx, ly = isik
    ln = math.hypot(lx, ly) + 1e-9
    lx, ly = lx / ln, ly / ln
    H_ = taban - tepe_y
    dxl = tepe_x - x0
    dxr = x1 - tepe_x
    # analitik profil: etekte içbükey (ovaya yumuşak geçiş), ortada dik, doruk yuvarlak; sağda yavaş, yuvarlak iniş
    u = np.linspace(0.0, 1.0, 70)
    sol_x = x0 - 5 + (dxl + 5) * u
    sol_y = taban + 2 - (H_ + 2) * np.sin(u * math.pi / 2) ** 1.7
    v = np.linspace(0.0, 1.0, 60)[1:]
    sag_x = tepe_x + (dxr + 5) * v
    sag_y = tepe_y + 0.3 * H_ * v ** 1.7
    ust = np.concatenate([np.stack([sol_x, sol_y], 1), np.stack([sag_x, sag_y], 1)], 0)
    f = rng.uniform(0, 6.28, 2)
    ust[:, 1] += H_ * 0.008 * np.sin(np.linspace(0, 11, len(ust)) + f[0]) * np.clip((taban - ust[:, 1]) / H_ * 4, 0, 1)
    pts = np.concatenate([ust, [[x1 + 5, taban + 4], [x0 - 5, taban + 4]]], 0)
    yol = _poly(pts)
    B = _boya_ac(t, M, (x0 - 10, tepe_y - 20, x1 + 10, taban + 10), tohum=tohum + 81)
    if B is None:
        return None
    # çimen izleri (önde, küçük V'ler; uzakta küçülür)
    if cimen:
        izler = []
        for i in range(int((x1 - x0) * H_ / 2200)):
            xx = rng.uniform(x0, x1)
            # tepe çizgisinin altında mı?
            yu = np.interp(xx, ust[:, 0], ust[:, 1])
            if yu > taban - 10:
                continue
            yy = rng.uniform(yu + 6, taban - 2)
            s_ = 0.35 + 0.65 * (yy - tepe_y) / H_
            h = rng.uniform(4, 9) * s_
            a = rng.uniform(-0.3, 0.3)
            q = np.array([[xx - h * 0.35, yy - h * 0.8], [xx + a, yy], [xx + h * 0.4, yy - h * 0.9]])
            izler.append(_poly(q, kapali=False))
        B.lavi(izler, '#6F9670', yog=0.32, kenar=0.5, dalga=0.05, islak=0.2, islak_gen=1, gran=0.1, akis=0.2,
               cizgi=1.2, siluet=False, esik=False)
    # kıvrım bantları (yamaç boyunca hafif, seyrek)
    bant = []
    for j in range(2):
        yb = tepe_y + H_ * (0.42 + 0.25 * j) + rng.uniform(-10, 10)
        xa = np.interp(yb, ust[:len(ust) // 2, 1][::-1], ust[:len(ust) // 2, 0][::-1]) + 30
        xb = min(x1, xa + (x1 - x0) * rng.uniform(0.3, 0.45))
        c = _dalgali_cizgi(rng, xa, xb, yb, 5, n=20)
        c[:, 1] += np.linspace(0, H_ * 0.06, len(c))
        bant.append(_poly(_serit_np(c, np.sin(np.linspace(0, math.pi, len(c))) ** 1.5 * H_ * 0.02 + 0.3)))
    B.lavi(bant, renk2, yog=0.13, kenar=1.6, dalga=0.18, islak=0.5, islak_gen=3, gran=0.12, akis=0.2, siluet=False)
    # gölge yamacı: doruğun biraz sağından eteğe inen, ortada dışa bombeli (kubbe hacmi) yumuşak kenarlı sır
    sirt = np.array([[tepe_x + 0.04 * dxr, tepe_y - 12], [tepe_x + 0.17 * dxr, tepe_y + 0.3 * H_],
                     [tepe_x + 0.2 * dxr, tepe_y + 0.62 * H_], [tepe_x + 0.12 * dxr, taban + 12]])
    sirt = _yumusak_omurga(sirt, n=40)
    sirt[:, 0] += H_ * 0.012 * np.sin(np.linspace(0, 6, len(sirt)) + f[1])
    gol_p = np.concatenate([sirt, [[x1 + 20, taban + 12], [x1 + 20, tepe_y - 20]]], 0)
    gol = yol_op(yol, _poly(gol_p), 'kesisim')
    olc = math.sqrt(abs(np.linalg.det(np.asarray(M)[:2, :2])))
    B.lavi(gol, renk2, yog=0.3, yumusak=max(2.5, H_ * 0.02 * olc), dalga=0.1, islak=0.0, gran=0.14, akis=0.2,
           siluet=False, yog_fn=lambda X, Y: (0.75 + 0.45 * np.clip((X - tepe_x) / max(dxr, 1.0) * 2.5, 0, 1)) *
           (1.0 - smoothstep(taban - H_ * 0.18, taban, Y)))
    # aynı yamaçta ikinci, daha dar ve koyu sır: doruğun gölge yanını belirginleştirir (net ıslak kenarlı)
    gol2_p = sirt + np.array([0.12 * dxr, 0.0])
    gol2 = yol_op(yol, _poly(np.concatenate([gol2_p, [[x1 + 20, taban + 12], [x1 + 20, tepe_y - 20]]], 0)), 'kesisim')
    B.lavi(gol2, renk2, yog=0.12, kenar=1.6, dalga=0.16, islak=0.6, islak_gen=4, gran=0.12, akis=0.2, siluet=False,
           yog_fn=lambda X, Y: 1.0 - smoothstep(taban - H_ * 0.3, taban, Y))
    def yf(X, Y):  # etekte ovaya tamamen karışır (tepe ile ova arasında yatay bir kesik çizgi kalmaz)
        return (0.68 + 0.42 * np.clip((Y - tepe_y) / H_, 0, 1)) * (1.0 - smoothstep(taban - H_ * 0.24, taban + 2, Y))
    iz = B.lavi(yol, renk1, yog=0.46, kenar=1.5, dalga=0.14, islak=0.85, islak_gen=4.5, gran=0.14, akis=0.2,
                yog_fn=yf, renk2='#B5C795', siluet=False)
    if iz is not None:  # saklama da etekte söner (ova tepenin eteğine karışsın)
        sl_, m_ = iz
        X_, Y_ = B.xy_dilim(sl_)
        np.maximum(B.SIL[sl_], m_ * (1.0 - smoothstep(taban - H_ * 0.24, taban + 2, Y_)), out=B.SIL[sl_])
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(tepe=nokta_donustur(M, tepe_x, tepe_y), siluet=[nokta_donustur(M, p[0], p[1]) for p in ust[::3]])


def ciz_cayir(t: Tuval, M, x0, y0, x1, y1, tohum=0, ufuk_y=None, renk_uzak='#D3DBB0', renk_yakin='#C3CC8E',
              leke=True, sakla_sonra=True):
    """Çayır/ova zemini: [x0,x1]x[y0,y1] (yerel) dikdörtgeni; ufka (y0) doğru açılan havadar degrade, yakında daha
    doygun; yumuşak koyu yeşil lekeler ve açık ışık lekeleri (ıslak-üstüne-ıslak). Önündeki her şeyden sonra
    çağırın; sonunda saklamaya yazar (arkasına gök/tepe boyanınca karışmaz)."""
    rng = np.random.default_rng(8807 + tohum)
    uy = y0 if ufuk_y is None else ufuk_y
    B = _boya_ac(t, M, (x0, y0, x1, y1), pay=4, tohum=tohum + 91)
    if B is None:
        return None
    Hh = max(1.0, y1 - uy)
    olc = math.sqrt(abs(np.linalg.det(np.asarray(M)[:2, :2])))
    if leke:
        lk = []
        for i in range(9):
            u = rng.uniform(0.05, 1.0) ** 0.7
            yy = uy + Hh * u
            rx = (x1 - x0) * rng.uniform(0.12, 0.3) * (0.3 + 0.7 * u)
            lk.append(EL.damla_blob(rng.uniform(x0, x1), yy, 1.0, tohum=int(rng.integers(0, 9999)), duzensizlik=0.25,
                                    lob=5, rx=rx, ry=rx * rng.uniform(0.12, 0.2)))
        B.lavi(lk, '#8FAE7A', yog=0.16, yumusak=max(3.0, 14 * olc), dalga=0.1, islak=0.0, gran=0.12, akis=0.2,
               toplam=True, ust=0.4, siluet=False, renk2='#A7B983')
    zemin = yol_dikdortgen(x0, y0, x1, y1)
    c0, c1 = renk(renk_uzak), renk(renk_yakin)

    def rf(X, Y):
        u = np.clip((Y - uy) / Hh, 0, 1)[..., None]
        return c0[None, None, :] + (c1 - c0)[None, None, :] * u
    B.lavi(zemin, renk_uzak, yog=0.46, kenar=1.5, dalga=0.12, islak=0.3, islak_gen=8, gran=0.14, akis=0.16,
           renk2=renk_yakin, karisim=lambda X, Y: np.clip((Y - uy) / Hh, 0, 1),
           yog_fn=lambda X, Y: 0.72 + 0.4 * np.clip((Y - uy) / Hh, 0, 1))
    B.bitir(sakla_sonra=sakla_sonra)
    return None


def ciz_dere(t: Tuval, M, noktalar, genislik, zaman=0.0, tohum=0, daralma=0.6, taslar=0.5, tas_sayi=3,
             sakla_sonra=True):
    rng = np.random.default_rng(5507 + tohum)
    P0 = np.asarray(noktalar, np.float64)
    om = _yumusak_omurga(P0, n=160)
    w = _genislikler(P0, genislik, daralma)
    d0 = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P0, axis=0), axis=1))])
    d1 = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(om, axis=0), axis=1))])
    Ltop = d1[-1]
    wo = np.interp(d1 / max(Ltop, 1e-6), d0 / max(d0[-1], 1e-6), w) * 0.5
    f = rng.uniform(0, 6.28, 4)
    u = d1 / max(Ltop, 1e-6)
    wl = wo * (1 + 0.08 * np.sin(u * 23 + f[0]) + 0.05 * np.sin(u * 61 + f[1]))
    wr = wo * (1 + 0.08 * np.sin(u * 29 + f[2]) + 0.05 * np.sin(u * 53 + f[3]))
    tan = np.gradient(om, axis=0)
    tan /= np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9
    nor = np.stack([-tan[:, 1], tan[:, 0]], 1)
    sol = om + nor * wl[:, None]
    sag = om - nor * wr[:, None]
    su = _poly(np.concatenate([sol, sag[::-1]], 0))
    kutu = (om[:, 0].min() - wo.max() * 1.6, om[:, 1].min() - wo.max() * 1.6, om[:, 0].max() + wo.max() * 1.6,
            om[:, 1].max() + wo.max() * 1.6)
    B = _boya_ac(t, M, kutu, tohum=tohum + 71)
    if B is None:
        return None
    isik = (-0.6, -0.8)
    # 1) basamak taşları (önde)
    tas_konum = []
    if tas_sayi > 0:
        j = int(np.clip(taslar, 0, 1) * (len(om) - 1))
        for q in range(tas_sayi):
            fr = (q + 0.5) / tas_sayi * 2 - 1  # -1..1 enine
            c = om[j] + nor[j] * fr * wo[j] * 0.78 + tan[j] * rng.uniform(-0.18, 0.18) * wo[j]
            r = wo[j] * rng.uniform(0.46, 0.58)
            tas_konum.append((c[0], c[1], r))
        for (cx, cy, r) in sorted(tas_konum, key=lambda q: -q[1]):
            _tas_boya(B, M, cx, cy + r * 0.3, r, rng, isik, yass=0.95, renk1='#CFC7C0', renk2='#C2BAB8',
                      golge_yer=False, islak_tas=0.5)
    # 2) ışık dalgacıkları (kâğıt beyazı): akışla ilerler
    dalg = []
    hiz = 38.0
    nd = int(Ltop / 26)
    for i in range(nd):
        s0 = rng.uniform(0, 1)
        lat = rng.uniform(-0.7, 0.7)
        ln_ = rng.uniform(0.5, 1.0)
        s = ((s0 * Ltop + hiz * zaman * rng.uniform(0.8, 1.2)) % Ltop)
        # ömür: belir-sön (dalgacık titremesin diye konumla bağlı)
        faz = (s0 * 7.3 + zaman * 0.6 * rng.uniform(0.7, 1.3)) % 1.0
        a = math.sin(faz * math.pi) ** 2
        a *= sstep(0.0, 0.06 * Ltop, s) * sstep(0.0, 0.06 * Ltop, Ltop - s)
        if a < 0.15:
            continue
        jj = int(np.searchsorted(d1, s))
        jj = min(max(jj, 1), len(om) - 2)
        wj = wo[jj]
        Lr = wj * 0.55 * ln_ * a
        ss = np.linspace(s - Lr, s + Lr, 8)
        cx_ = np.interp(ss, d1, om[:, 0]) + np.interp(ss, d1, nor[:, 0]) * lat * wj
        cy_ = np.interp(ss, d1, om[:, 1]) + np.interp(ss, d1, nor[:, 1]) * lat * wj
        kal = np.sin(np.linspace(0, math.pi, 8)) * max(0.6, wj * 0.035) * a
        dalg.append(_poly(_serit_np(np.stack([cx_, cy_], 1), kal + 0.05)))
    # taşların çevresinde akış izi (V dalgası)
    for (cx, cy, r) in tas_konum:
        j = int(np.argmin(np.sum((om - [cx, cy]) ** 2, 1)))
        for sgn in (-1, 1):
            q = np.array([[cx + tan[j, 0] * r * 0.9, cy + tan[j, 1] * r * 0.9 - r * 0.1],
                          [cx + tan[j, 0] * r * 1.8 + nor[j, 0] * sgn * r * 0.6,
                           cy + tan[j, 1] * r * 1.8 + nor[j, 1] * sgn * r * 0.6]])
            q = np.array([q[0], (q[0] + q[1]) / 2 + nor[j] * sgn * r * 0.1, q[1]])
            dalg.append(_poly(_serit_np(q, np.array([r * 0.08, r * 0.06, r * 0.02]))))
    if dalg:
        B.sakla_yol(dalg, M, yumusak=0.5)
    # 3) su: derin orta + açık geniş lavi
    orta = _poly(_serit_np(om + nor * ((wl - wr) * 0.5)[:, None] * 0, wo * 0.55))
    B.lavi(orta, '#86A9C8', yog=0.3, yumusak=max(2.0, float(wo.mean()) * 0.12 *
                                                 math.sqrt(abs(np.linalg.det(np.asarray(M)[:2, :2])))),
           dalga=0.1, islak=0.0, gran=0.1, akis=0.25, siluet=False)
    B.lavi(su, '#A8C7DE', yog=0.5, kenar=1.1, dalga=0.1, islak=1.0, islak_gen=3, gran=0.12, akis=0.22,
           renk2='#9EC0D6')
    # 4) kıyılar: toprak bandı (su silüeti saklamada)
    B.sakla_yol(su, M, yumusak=0.6)
    kiyi = []
    for (kenar_pts, sgn) in ((sol, 1), (sag, -1)):
        o2 = kenar_pts + nor * (sgn * wo * 0.1)[:, None]
        kiyi.append(_poly(_serit_np(o2, wo * 0.16 + 1.0)))
    B.lavi(kiyi, '#BBA785', yog=0.38, kenar=1.2, dalga=0.18, islak=0.8, islak_gen=2.5, gran=0.18, akis=0.2,
           renk2='#A8A57E')
    B.bitir(sakla_sonra=sakla_sonra)
    return dict(taslar=[nokta_donustur(M, cx, cy) for (cx, cy, r) in tas_konum],
                omurga=[nokta_donustur(M, p[0], p[1]) for p in om[::8]])
