"""mimari.py — MİMARİ öğeler (Atölye S-146 dijital suluboya): kemerli kapı (dâr), yeşil kubbeli cami, seccade.

GENEL
  * Bütün öğeler motor.Tuval üzerine saydam lavilerle, ÖNDEN ARKAYA ve saklama (resist) ile boyanır; her öğe bitince
    kendi silüetini saklamaya yazar (sakla_sonra=False ile kapatılır). Beyaz taşlar boş kâğıttır; gölgeler lavanta-gri
    ikinci sırdır; kenarlarda ince pigment birikimi (ıslak kenar), hafif granülasyon; sıçrama/leke yok.
  * Koordinatlar YEREL birimdir, y AŞAĞI (ekran gibi), +x sağ. M: yerel -> ekran 3x3
    (ör. M = kamera.M() @ M_yerlestir(x, y, olcek)). Ölçek 1'de 1 yerel birim = 1 ekran pikseli.
  * isik: ışığa doğru EKRAN yönü; (-0.6, -0.8) = sol üstten ışık -> gölge yanı sağ/alt. x işareti değişirse gölge
    yanları aynalanır.
  * Belirlenimci: rastgelelik yalnız np.random.default_rng(tohum); animasyon yalnız parametrelerle (aynı girdi ->
    bit bit aynı kare). Dokular nesnenin yerel koordinatına bağlıdır (kamera hareketinde kaymaz), granülasyon kâğıda.
  * Çizgi kalınlıkları ölçekle alt-doğrusal büyür (ekranda ~olcek^0.6, en az ~0.8 px): zum 4'te detaylar keçe
    kalemi kalınlığına çıkmaz, küçük ölçekte kaybolmaz. Kenar yumuşatma ve ıslak kenar bandı ekran pikselindedir
    (her zumda net).
  * Hız için modül kendi karo karo lavi yardımcısını (_lavi, motor.Tuval.lavi ile aynı matematik) kullanır; sahne
    t.gorunurluk(alfa, maske_fn, M) ile sarmalayabilir (opaklık ve maske hem boyaya hem saklamaya uygulanır).

---------------------------------------------------------------------------------------------------------------
ciz_kemerli_kapi(t, M, acilma=1.0, isik=(-0.6, -0.8), tohum=0, sakla_sonra=True) -> dict
    Videoyu açan "dâr" kapısı: krem kesme taş cephe (hafif ton farklı bloklar, kayıp-bulunan derzler), ortada
    Osmanlı sivri (iki merkezli) kemerli açıklık.
    KÖKEN: açıklığın alt orta noktası (eşik taşının üst çizgisi), y AŞAĞI.
    Ölçüler (yerel birim):
      cephe kesiti (sövelerin ön yüzü)  x = ±260, üzengi y ≈ -492, kemer tepesi y = -860  (520 x 860)
      GÖRÜNEN açıklık (derinlik yüzlerinin içi; kaçış noktası (0,-400)'e doğru %90.5 küçülmüş kontur)
                                         x = ±235 (söve), tepe y ≈ -816, alt y = -38; altında eşiğin üst yüzü
      kemer çerçevesi (ablak: kâğıt beyazı / gül kurusu dönüşümlü taşlar, ince düşey kenarlı kilit taşı, üzengi
        başlıkları)                      58 genişlik (dış x = ±318), kilit taşı tepesi ≈ -925
      alınlık çerçevesi (alfiz) iç |x| = 404, dış |x| = 434, üst iç y = -1004; köşelik rozetleri (±270, -906) r=50
      dişli taç kornişi                  |x| ≤ 504, y ∈ [-1116, -1034]
      kaide silmesi y = -44; eşik + iki basamak: ±338 (y -10..36), ±402 (36..110), ±466 (110..186)
      avlu taşlığı y ≥ 186 (kaçışa giden derzler)
      tırmanan gül (solda, dip çalısıyla): x ∈ [-660, -140], y ∈ [-1175, 200]; sağda yuvarlak çalı x ∈ [445, 780]
      cephe (tam silüet, KAPI_CEPHE)     x ∈ [-1700, 1700], y ∈ [-2800, 1500]
    Zum 1'de (kapı ekranın ~%50'si, sahnedeki gibi M = Kamera(540,1000,1).M() @ M_yerlestir(540,1430,1)) ve kamera
    açıklığa doğru 4x zumladığında da ekranın tamamını kaplar ve detaylar korunur.
    AÇIKLIK BOYANMAZ ve saklamaya YAZILMAZ: sahne dünyayı kapıdan SONRA boyar; dünya yalnız açıklıkta görünür.
    acilma 0..1: cephe boş kâğıda kendini boyar — sıcak krem lavi aşağıdan yukarı, ortası önde, organik ve NET bir
        ıslak önle yükselir (önde ince pigment çizgisi, hemen arkasında koyu boncuk bandı); ressam sırasıyla basamaklar
        (0-.42), cephe/kaide/taşlık (0-.70), kemer taşları (.16-.78), açıklık derinliği (.30-.88), alfiz-korniş-
        rozetler (.26-.90), gül dalları ve yaprakları (.40-.82), sağ çalı (.45-.95), güller en son açar (.60-1).
        0 = boş kâğıt, 1 = tam kapı (maske yok). Öneri: acilma = ilerle(V, 0, ~0.6 sn, e_out).
    tohum: gül, derz ve doku düzeni. sakla_sonra: True ise sonunda cephenin TAM silüeti (kapi_siluet_yolu())
        acilma'dan bağımsız tam güçte saklamaya yazılır (açılma sırasında da dünya yalnız açıklıktan görünür;
        sahne.ciz_son'daki saklama-birleştirmesi buna dayanır).
    Süre (1080x1920, tek çekirdek): ~0.24-0.29 sn (zum 1-4), açılma kareleri ~0.15-0.30 sn.
    DÖNÜŞ dict — ekran koordinatı (x, y) demetleri; 'yerel' altında aynıları yerel:
        'aciklik_alt' (0,0), 'aciklik_merkez' (0,-430), 'kemer_tepe' (0,-860), 'kacis' (0,-400),
        'sol_ic' / 'sag_ic' (∓235.3, -483.5) görünen açıklığın üzengi hizasındaki iç kenarları,
        'gul' en büyük gül çiçeğinin merkezi (-468, -992).
kapi_acikligi_yolu(ic=True) -> skia.Path (yerel)
    ic=True: kapıdan GÖRÜNEN açıklık (boyanmayan bölge; x ±235.3, y -816.3..-38); ic=False: cephedeki kesit
    (x ±260, y -860..0). Ekrana: motor.yol_donustur(yol, M) ya da motor.maske_ciz([yol], M, k).
kapi_siluet_yolu() -> skia.Path (yerel): cephenin tamamı eksi görünen açıklık (saklama silüeti).

---------------------------------------------------------------------------------------------------------------
ciz_kubbe_cami(t, M, isik=(-0.6, -0.8), nur=0.0, tohum=0, sakla_sonra=True) -> dict
    S-146 sahnesinin yeşil kubbeli camii, daha zarif: dilimli yeşil kubbe — açık ilk lavi (ışıklı üst-solda kâğıt
    parıltısı), yaklaşık 3B normal ile gölge yanında koyu ikinci sır, azimut aralıklı (kenarlara doğru sıklaşan)
    hafif dalgalı ince kaburgalar; iki yeşil kasnak (silindir gölgesi, silindirde daralan koyu yeşil kemerli
    pencereler, beyaz taş silmeler ve altlarında gölge); beyaz taş gövde (kâğıt beyazı, lavanta-gri gölge sırları,
    mor-kahve kemerli pencereler ve eşikleri, ince plasterler, sivri mazgallı korkuluk, minarenin düşen gölgesi);
    solda iki şerefeli ince beyaz minare (kare kaide + geçiş, mukarnas kornişli şerefeler ve korkuluklar, silindir
    üzerinde sıkışan zikzak bant, küçük pencereler, konik yeşil külah) ve hilalli altın alemler.
    KÖKEN: gövdenin alt orta noktası (zemin çizgisi), y AŞAĞI. Silüet x ∈ [-391, 476], y ∈ [-1066, 0]
    (genişlik ~870). Kubbe ekseni x = +70: kubbe tabanı y = -420 (yarıçap 262), tepe y = -780, alem ucu ≈ -923.
    Kasnaklar: alt y ∈ [-300, -190] (yarı genişlik 318), üst y ∈ [-410, -310] (280). Gövde x ∈ [-345, 470],
    y ∈ [-186, 0] (mazgallar -211'e kadar). Minare ekseni x = -330: şerefeler y ≈ -560 ve -788, külah ucu -990,
    alem ucu ≈ -1065.
    nur 0..1: ölçülü sıcak ışık — silüeti saran yumuşak hale: halede çok açık sıcak sır + kısmi saklama (SONRA
        boyanan gök orada açık kalır, cami ışık saçar), taş ve kubbede ince ılık sır; zemin çizgisinin altına
        taşmaz. Gök vb. caminin ARKASINDAKİ her şey bu çağrıdan sonra boyanmalıdır.
    sakla_sonra: silüet (kubbe + kasnaklar + gövde + minare + alemler) saklamaya yazılır.
    Süre: 900 px genişlikte ~0.12 sn (nur ile ~0.2), 300 px'te ~0.08 sn.
    DÖNÜŞ dict (ekran): 'kubbe_tepe' (70,-780), 'alem_ucu' (70,-922.9), 'minare_ucu' (-330,-990),
        'minare_alem_ucu' (-330,-1065.4), 'kubbe_merkez' (kubbe tabanı ortası, (70,-420)), 'zemin_sol' (-345,0),
        'zemin_sag' (470,0); 'yerel' altında aynıları yerel.

---------------------------------------------------------------------------------------------------------------
ciz_seccade(t, M, uzunluk=420, egim=0.18, tohum=0, yon=-1, kayma=0.35, genislik_orani=0.62, sakla_sonra=True)
        -> dict
    Yerde, yandan-3/4 görülen seccade (ince paralelkenar): kırık gül-kırmızısı alan, koyu bordür (uçlarda krem
    baklava dizisi), krem bekçi çizgileri (kâğıt + ılık krem, saklamayla korunur), iki merkezli sivri kemerli
    mihrap nişi ve kandil motifi, köşebentlerde koyu sır, iki uçta krem saçaklar, ön kenarda ince kalınlık ve
    altında yumuşak lila gölge. Desenler seccade düzleminde kurulup zemine izdüşürülür (doğru perspektif kısalması).
    KÖKEN: seccadenin zemindeki merkezi; uzunluk ekseni yerel x (±uzunluk/2, saçaklar +15), derinlik yukarı (-y).
    egim: derinliğin görünür oranı (kamera yükseklik açısının sinüsü); görünen derinlik
        = uzunluk * genislik_orani * egim (varsayılan ≈ 47 -> y ∈ [-23.4, +23.4]). Aralık ~0.08..0.4.
    kayma: arka kenarın +x yönünde, görünen derinliğe oranla kayması (paralelkenar eğikliği; 0 = tam yandan).
    yon=-1: mihrap kemerinin tepesi -x'e (sola) bakar (başın konacağı uç) — sahnede sola bakan adam secdede
        (insan yon=-1) için; yon=+1 aynalar.
    İnsan ölçeğiyle (boy 600) uzunluk 420 secde pozunu taşır: secdede adam yerelinde dizler x≈124, alın x≈311,
        ayak parmakları x≈-50 -> yon=-1'de adam kökünü seccade merkezinin ~150*olcek sağına koyun
        (alın sol uca, parmaklar sağ uca düşer). Adamı ÖNCE boyayın (onun saklaması seccadeyi altında bırakır).
    sakla_sonra: seccade (+ saçaklar, ön kalınlık) silüeti saklamaya yazılır. Süre: ~0.03 sn.
    DÖNÜŞ dict (ekran): 'on_sol', 'on_sag', 'arka_sol', 'arka_sag' köşeler (varsayılan yerel (-218,23), (202,23),
        (-202,-23), (218,-23)), 'mihrap' (kemer tepesi, (-148,0)), 'merkez' (0,0); 'yerel' altında aynıları yerel.

DENEME PAFTALARI: testler/mimari_kapi_test.py (z1 | z2 | z4 | ac | all), testler/mimari_cami_test.py,
    testler/mimari_seccade_test.py, testler/mimari_entegrasyon_test.py, testler/mimari_zaman.py
"""
from __future__ import annotations

import math

import cv2
import numpy as np
import skia

import motor as mt
from motor import (Tuval, Kirp, M_bilesik, M_oteleme, M_olcek, M_donme, yol_egri, yol_cokgen, yol_daire,
                   yol_elips, yol_dikdortgen, yol_op, yol_donustur, yol_serit, maske_ciz, yollar_kirp, smoothstep,
                   renk, nokta_donustur, W, H)
import elemanlar as el

N_DOKU = mt.N


# =================================================================================================================
# hızlı lavi: motor.Tuval.lavi ile aynı matematik, karo karo (boş karolar atlanır, iç karolar kenar işlemesiz),
# düşük çözünürlüklü akış/yoğunluk/renk alanları, cv2 ile yerinde çarpımsal birleştirme.
# =================================================================================================================
_KARO = 128


def _olc(M):
    return math.sqrt(abs(M[0, 0] * M[1, 1] - M[0, 1] * M[1, 0]))


def _cz(M, w, us=0.6, en_az=0.75):
    """Yerel çizgi kalınlığı: ekranda w * olcek^us px (en az en_az px)."""
    s = max(_olc(M), 1e-6)
    return max(en_az, w * s ** us) / s


def _yuz(M, d, us=0.75):
    """Ekranda alt-doğrusal büyüyen küçük ofset (gölge kayması vb.) yerel birim."""
    s = max(_olc(M), 1e-6)
    return d * s ** us / s


_EKRAN_MASKE = []   # [(id(tuval), (H, W) ekran maskesi)] — açılma grupları (hızlı yol)


def _ekran_maskeleri(t, kk):
    out = None
    for (tid, arr) in _EKRAN_MASKE:
        if tid == id(t):
            s = arr[kk.dilim]
            out = s if out is None else out * s
    return out


_GRAN_ONBELLEK = {}


def _gran_carpan(gran):
    """clip(1 + gran * GRAN, 0.2, 2.2) — ekrana bağlı, sabit: gran değeri başına önbellekli."""
    g = round(float(gran), 3)
    v = _GRAN_ONBELLEK.get(g)
    if v is None:
        if len(_GRAN_ONBELLEK) > 16:
            _GRAN_ONBELLEK.clear()
        v = np.clip(1.0 + g * mt.GRAN, 0.2, 2.2).astype(np.float32)
        _GRAN_ONBELLEK[g] = v
    return v


def _bulanik(m, s):
    """Islak kenar bulanıklığı: s >= 1.5 için iki geçişli kutu süzgeci (Gauss yaklaşığı, ~2 kat hızlı)."""
    if s < 1.5:
        return cv2.GaussianBlur(m, (0, 0), s)
    k = 2 * int(round((math.sqrt(6.0 * s * s + 1.0) - 1.0) / 2.0)) + 1
    return cv2.boxFilter(cv2.boxFilter(m, -1, (k, k)), -1, (k, k))


def _dusuk_parca(arr, ty0, ty1, tx0, tx1, q=4):
    """Düşük çözünürlüklü alanın (q kat) karo bölgesini tam çözünürlüğe büyüt (tam büyütmeyle aynı hizada)."""
    hl, wl = arr.shape[:2]
    ly0, lx0 = max(0, ty0 // q - 1), max(0, tx0 // q - 1)
    ly1, lx1 = min(hl, -(-ty1 // q) + 1), min(wl, -(-tx1 // q) + 1)
    p = arr[ly0:ly1, lx0:lx1]
    up = cv2.resize(p, ((lx1 - lx0) * q, (ly1 - ly0) * q), interpolation=cv2.INTER_LINEAR)
    oy, ox = ty0 - ly0 * q, tx0 - lx0 * q
    return up[oy:oy + ty1 - ty0, ox:ox + tx1 - tx0]


def _lavi(t: Tuval, yollar, M, renk_, yog=0.5, kenar=1.1, dalga=0.0, islak=0.8, islak_gen=3.0, gran=0.10,
          akis=0.15, tohum=0, cizgi=None, maske_fn=None, yog_fn=None, renk_fn=None, sakla=True, dolgu_kurali=None,
          yog_harita=None, maske=None, esik=True):
    """Bir saydam lavi (bkz. motor.Tuval.lavi; aynı matematik). Karo karo işlenir: boş karolar atlanır, iç karolar
    kenar işlemesiz geçer. yog_fn / renk_fn düşük çözünürlükte (1/4) değerlendirilir (yumuşak alanlar için).
    yog_harita: kırpıntıya ait (h, w) tam çözünürlük yoğunluk çarpanı (maske=(k, m) ile birlikte verilir).
    esik=False: maske eşiklenmez (ince çizgilerin ham kenar yumuşatması korunur)."""
    if isinstance(yollar, skia.Path):
        yollar = [yollar]
    pad = int(math.ceil(3 * max(kenar, 0.5) + 2.5 * islak_gen + 3))
    if maske is not None:
        k, m = maske
    else:
        k = yollar_kirp(yollar, M, pad + 2)
        if k.bos():
            return
        m = maske_ciz(yollar, M, k, cizgi=cizgi, dolgu_kurali=dolgu_kurali)
    yig = bool(t._yigin)
    if yig:
        yog = yog * t._yigin_alfa()
        yig = any(f is not None for (_, f, _) in t._yigin)
    if yog <= 1e-4 or m.max() <= 1e-4:
        return
    sak = t.saklama if sakla else None
    ekr = any(tid == id(t) for (tid, _) in _EKRAN_MASKE)
    Mi = np.linalg.inv(M)
    kay = ((tohum * 197.3) % N_DOKU, (tohum * 89.7) % N_DOKU)
    q = 4
    hl, wl = -(-k.h // q), -(-k.w // q)
    alan = None
    renk_alan = None
    if akis > 0 or yog_fn is not None or renk_fn is not None:
        A = np.array([[q, 0, k.x0 + (q - 1) / 2.0], [0, q, k.y0 + (q - 1) / 2.0], [0, 0, 1.0]])
        L = Mi @ A
        if akis > 0:
            S = np.array([[1, 0, kay[1]], [0, 1, kay[0]], [0, 0, 1.0]])
            T = (S @ L)[:2].astype(np.float32)
            f = cv2.warpAffine(mt.G_AKIS, T, (wl, hl), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                               borderMode=cv2.BORDER_WRAP)
            alan = np.clip(1.0 + akis * f, 0.3, 1.9)
        if yog_fn is not None or renk_fn is not None:
            XX, YY = np.meshgrid(np.arange(wl, dtype=np.float32), np.arange(hl, dtype=np.float32))
            X = (L[0, 0] * XX + L[0, 1] * YY + L[0, 2]).astype(np.float32)
            Y = (L[1, 0] * XX + L[1, 1] * YY + L[1, 2]).astype(np.float32)
            if yog_fn is not None:
                v = np.asarray(yog_fn(X, Y), np.float32)
                alan = v if alan is None else alan * v
            if renk_fn is not None:
                renk_alan = np.ascontiguousarray(np.asarray(renk_fn(X, Y), np.float32) - 1.0)
    C1 = None
    if renk_alan is None:
        C = renk(renk_)
        C1 = (float(C[0]) - 1.0, float(C[1]) - 1.0, float(C[2]) - 1.0, 0.0)
    gen = 0.16 + 0.05 * kenar
    R = t.R
    GG = _gran_carpan(gran) if gran > 0 else None
    for ty0 in range(0, k.h, _KARO):
        ty1 = min(k.h, ty0 + _KARO)
        py0, py1 = max(0, ty0 - pad), min(k.h, ty1 + pad)
        for tx0 in range(0, k.w, _KARO):
            tx1 = min(k.w, tx0 + _KARO)
            px0, px1 = max(0, tx0 - pad), min(k.w, tx1 + pad)
            sub = m[py0:py1, px0:px1]
            if sub.max() <= 1e-4:
                continue
            kk = Kirp(k.x0 + px0, k.y0 + py0, px1 - px0, py1 - py0)
            if sak is not None:
                sub = sub * (1.0 - sak[kk.dilim])
            if ekr:
                em = _ekran_maskeleri(t, kk)
                sub = sub * em
            if maske_fn is not None:
                X, Y = Tuval._yerel_izgara(Mi, kk)
                sub = np.asarray(maske_fn(sub, X, Y), np.float32)
            if yig:
                sub = t._yigin_maske(np.ascontiguousarray(sub, np.float32), kk)
            if sub.max() <= 1e-4:
                continue
            iy0, ix0 = ty0 - py0, tx0 - px0
            ih, iw = ty1 - ty0, tx1 - tx0
            sl = (slice(k.y0 + ty0, k.y0 + ty1), slice(k.x0 + tx0, k.x0 + tx1))
            if not esik:
                Dt = np.array(sub[iy0:iy0 + ih, ix0:ix0 + iw], np.float32)
            elif sub.min() >= 0.999:
                Dt = None
            else:
                sub = np.ascontiguousarray(sub, np.float32)
                mb = cv2.GaussianBlur(sub, (0, 0), kenar) if kenar > 0.05 else sub
                if dalga > 0:
                    g = mt._doku_ornekle(mt.G_KENAR, Mi, kk.x0, kk.y0, kk.w, kk.h, 1.0, kay)
                    mb = mb + dalga * g * (4.0 * mb * (1.0 - mb) + 0.02)
                m2 = smoothstep(0.5 - gen, 0.5 + gen, mb)
                if islak > 0:
                    b = _bulanik(m2, islak_gen)
                    E = np.clip((m2 - b) * 2.2, 0, 1)
                    m2 = m2 * (1.0 + islak * E)
                Dt = np.ascontiguousarray(m2[iy0:iy0 + ih, ix0:ix0 + iw])
            if gran > 0:
                gg = GG[sl]
                Dt = gg.copy() if Dt is None else Dt * gg
            elif Dt is None:
                Dt = np.ones((ih, iw), np.float32)
            if alan is not None:
                Dt *= _dusuk_parca(alan, ty0, ty1, tx0, tx1, q)
            if yog_harita is not None:
                Dt *= yog_harita[ty0:ty1, tx0:tx1]
            Dt *= yog
            np.clip(Dt, 0.0, 1.0, out=Dt)
            T3 = cv2.cvtColor(Dt, cv2.COLOR_GRAY2BGR)
            if C1 is not None:
                cv2.multiply(T3, C1, T3)
            else:
                cv2.multiply(T3, _dusuk_parca(renk_alan, ty0, ty1, tx0, tx1, q), T3)
            cv2.add(T3, (1.0, 1.0, 1.0, 0.0), T3)
            hedef = R[sl]
            cv2.multiply(hedef, T3, hedef)


def _sakla(t: Tuval, yollar, M, yumusak=0.7, guc=1.0):
    if isinstance(yollar, skia.Path):
        yollar = [yollar]
    if any(tid == id(t) for (tid, _) in _EKRAN_MASKE):
        k = yollar_kirp(yollar, M, 4 + 3 * yumusak)
        if k.bos():
            return
        m = maske_ciz(yollar, M, k)
        if yumusak > 0:
            m = cv2.GaussianBlur(m, (0, 0), yumusak)
        m = m * _ekran_maskeleri(t, k)
        t.sakla_ekle(yollar, M, yumusak=0.0, guc=guc, maske=(k, m))
    else:
        t.sakla_ekle(yollar, M, yumusak=yumusak, guc=guc)


def _saklama_al(t):
    return None if t.saklama is None else t.saklama.copy()


def _saklama_geri(t, s):
    t.saklama = s


def _kaydir(yol, dx, dy):
    return yol_donustur(yol, M_oteleme(dx, dy))


def _gurultu(X, Y, kay=(0.0, 0.0), olcek=0.35):
    return mt._gurultu_yerel(X, Y, kay, olcek)


def _on_d(X, Y, y_alt, y_ust, dalga, egri, kay, x_olcek):
    d = (y_alt - Y) / float(y_alt - y_ust) + egri * (X / x_olcek) ** 2
    return d + dalga * _gurultu(X, Y, kay, 0.45) + dalga * 0.16 * _gurultu(X, Y, (kay[1], kay[0]), 1.6)


def _on_r(p, dalga, on, egri):
    return p * (1.0 + 2.5 * dalga + on + egri) - 1.2 * dalga


def _acilma_maske(p, y_alt, y_ust, dalga=0.035, on=0.04, egri=0.05, tohum=0, x_olcek=900.0):
    """Aşağıdan yukarı ıslak önle açılma (maske_fn). p 0..1; None = tam görünür."""
    if p >= 1.0:
        return None
    kay = ((tohum * 131.7) % N_DOKU, (tohum * 71.3) % N_DOKU)

    def f(m, X, Y):
        if p <= 0.0:
            return m * 0
        d = _on_d(X, Y, y_alt, y_ust, dalga, egri, kay, x_olcek)
        r = _on_r(p, dalga, on, egri)
        return m * (1.0 - smoothstep(r - on, r, d))
    return f


def _on_bandi(p, y_alt, y_ust, dalga=0.035, on=0.04, egri=0.05, tohum=0, x_olcek=900.0, gen=0.022, guc=0.38):
    """yog_fn çarpanı: ilerleyen ıslak önün hemen arkasında biriken pigment bandı (p >= 1 iken 1)."""
    if p >= 1.0 or p <= 0.0:
        return None
    kay = ((tohum * 131.7) % N_DOKU, (tohum * 71.3) % N_DOKU)

    def f(X, Y):
        d = _on_d(X, Y, y_alt, y_ust, dalga, egri, kay, x_olcek)
        r = _on_r(p, dalga, on, egri)
        u = (r - d) / gen
        return 1.0 + guc * np.exp(-u * u)
    return f


def _p(ac, a, b):
    if b <= a:
        return 1.0 if ac >= b else 0.0
    return min(1.0, max(0.0, (ac - a) / (b - a)))


_ON_ALAN = {}


def _on_alani(M, y_alt, y_ust, dalga, egri, tohum, x_olcek=900.0):
    """Açılma önü uzaklık alanı d (ekran, tam çözünürlük; 1/4'te hesaplanıp büyütülür). Kare başına önbellekli."""
    anahtar = (M.tobytes(), y_alt, y_ust, dalga, egri, tohum, x_olcek)
    v = _ON_ALAN.get('k')
    if v is not None and v[0] == anahtar:
        return v[1]
    q = 4
    hl, wl = -(-H // q), -(-W // q)
    Mi = np.linalg.inv(M)
    XX, YY = np.meshgrid(np.arange(wl, dtype=np.float32) * q + (q - 1) / 2.0,
                         np.arange(hl, dtype=np.float32) * q + (q - 1) / 2.0)
    X = (Mi[0, 0] * XX + Mi[0, 1] * YY + Mi[0, 2]).astype(np.float32)
    Y = (Mi[1, 0] * XX + Mi[1, 1] * YY + Mi[1, 2]).astype(np.float32)
    kay = ((tohum * 131.7) % N_DOKU, (tohum * 71.3) % N_DOKU)
    d = _on_d(X, Y, y_alt, y_ust, dalga, egri, kay, x_olcek).astype(np.float32)
    d = cv2.resize(d, (wl * q, hl * q), interpolation=cv2.INTER_CUBIC)[:H, :W]
    _ON_ALAN['k'] = (anahtar, d)
    return d


def _acilma_ekran(t, p, M, y_alt, y_ust, dalga=0.035, on=0.04, egri=0.05, tohum=0, x_olcek=900.0):
    """Aşağıdan yukarı ıslak önlü açılma maskesi, EKRAN uzayında (H, W). Ön ~3 px'lik rampadır: lavinin eşiği onu
    net, ince pigment kenarlı bir çizgiye çevirir."""
    d = _on_alani(M, y_alt, y_ust, dalga, egri, tohum, x_olcek)
    r = _on_r(p, dalga, on, egri)
    s = max(_olc(M), 1e-6)
    w = 3.0 / (s * float(y_alt - y_ust))
    return np.clip((r - d) * (1.0 / w), 0.0, 1.0)


class _Grup:
    """açılma grubu: p >= 1 tam görünür (maske yok), 0 < p < 1 ekran maskesi (hızlı yol), p <= 0 gizli."""

    def __init__(self, t, p, M, y_alt, y_ust, tohum, dalga=0.035, on=0.04, egri=0.05):
        self.t, self.p = t, p
        self.kayit = None
        if 0.0 < p < 1.0:
            self.kayit = (id(t), _acilma_ekran(t, p, M, y_alt, y_ust, dalga=dalga, on=on, egri=egri, tohum=tohum))

    def __enter__(self):
        if self.kayit is not None:
            _EKRAN_MASKE.append(self.kayit)
        return self

    def __exit__(self, *a):
        if self.kayit is not None:
            _EKRAN_MASKE.remove(self.kayit)
        return False

    @property
    def gorunur(self):
        return self.p > 0.0


# =================================================================================================================
# geometri yardımcıları
# =================================================================================================================
def _kemer_pts(a, h, c_oran=0.5, d=0.0, y_alt=0.0, n=60, tepe_y=None):
    """Sivri (iki merkezli) kemer: sol alt -> sol söve -> sol yay -> tepe -> sağ yay -> sağ söve -> sağ alt.
    a: yarı açıklık, h: alt (y=0) -> tepe yüksekliği, d: dışa ofset. Döner: (noktalar np, üzengi_y, c, r)."""
    c = c_oran * a
    r = a + c
    ys = -(h - math.sqrt(r * r - c * c))
    R = r + d
    th_t = math.acos(-c / R)
    sol = [(-a - d, y_alt), (-a - d, ys)]
    yay = [(c + R * math.cos(th), ys - R * math.sin(th)) for th in np.linspace(math.pi, th_t, n)]
    yay[-1] = (0.0, yay[-1][1])
    sag = [(-x, y) for (x, y) in reversed(yay[:-1])]
    pts = sol + yay[1:] + sag + [(a + d, ys), (a + d, y_alt)]
    return np.array(pts, np.float64), ys, c, r


def _poly(pts, kapali=True):
    return yol_cokgen([tuple(p) for p in pts], kapali)


def _halka_parca(cx, cy, r0, r1, th0, th1, n=10):
    """(cx,cy) merkezli halka dilimi; açılar y-yukarı ölçülür (ekran y aşağı)."""
    ths = np.linspace(th0, th1, n)
    dis = [(cx + r1 * math.cos(a), cy - r1 * math.sin(a)) for a in ths]
    ic = [(cx + r0 * math.cos(a), cy - r0 * math.sin(a)) for a in ths[::-1]]
    return yol_cokgen(dis + ic, True)


def _serit_cizgi(pts, w):
    return yol_serit(np.asarray(pts, np.float64), np.full(len(pts), w / 2.0))


def _yol_cizgi(pts):
    p = skia.Path()
    p.moveTo(float(pts[0][0]), float(pts[0][1]))
    for q in pts[1:]:
        p.lineTo(float(q[0]), float(q[1]))
    return p


def _cizgiler(segs):
    p = skia.Path()
    for s in segs:
        p.moveTo(float(s[0][0]), float(s[0][1]))
        for q in s[1:]:
            p.lineTo(float(q[0]), float(q[1]))
    return p


def _rozet_yolu(cx, cy, r, yaprak=8, faz=0.0, ic=0.42):
    """Oyma rozet: sivri uçlu yapraklar (yıldız-çiçek)."""
    pts = []
    n = yaprak * 8
    for i in range(n):
        a = faz + 2 * math.pi * i / n
        u = (i % 8) / 8.0
        rr = r * (ic + (1 - ic) * math.sin(u * math.pi) ** 1.6)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return yol_egri(pts, kapali=True, gerilim=0.5)


def _ekran(M, p):
    return nokta_donustur(M, float(p[0]), float(p[1]))


# =================================================================================================================
# 1) KEMERLİ KAPI
# =================================================================================================================
KAPI_A = 260.0          # açıklık yarı genişliği
KAPI_H = 860.0          # açıklık yüksekliği (eşik -> kemer tepesi)
KAPI_C = 0.5            # kemer merkez kayması / yarı açıklık
KAPI_KG = 58.0          # kemer çerçevesi (kemer taşları) genişliği
KAPI_KACIS = (0.0, -400.0)
KAPI_DERIN = 0.905      # iç kontur = kaçış + (dış - kaçış) * DERIN
KAPI_ALFIZ = 404.0      # alınlık çerçevesinin iç kenarı |x|
KAPI_ALFIZ_UST = -1004.0
KAPI_ALFIZ_G = 30.0
KAPI_KAIDE = -44.0      # kaide silmesi üstü
KAPI_ZEMIN = 186.0      # avlu zemini (basamakların altı)
KAPI_CEPHE = (-1700.0, -2800.0, 1700.0, 1500.0)

_KAPI_GEO = {}


def _kapi_geo():
    if _KAPI_GEO:
        return _KAPI_GEO
    g = _KAPI_GEO
    dis, ys, c, r = _kemer_pts(KAPI_A, KAPI_H, KAPI_C, 0.0, 0.0, n=72)
    vx, vy = KAPI_KACIS
    ic = np.stack([vx + (dis[:, 0] - vx) * KAPI_DERIN, vy + (dis[:, 1] - vy) * KAPI_DERIN], 1)
    g['dis'] = dis
    g['ic'] = ic
    g['ys'] = ys
    g['c'] = c
    g['r'] = r
    g['dis_yol'] = _poly(dis)
    g['ic_yol'] = _poly(ic)
    cerceve, _, _, _ = _kemer_pts(KAPI_A, KAPI_H, KAPI_C, KAPI_KG, 0.0, n=72)
    g['cerceve_dis'] = cerceve
    g['cerceve_yol'] = yol_op(_poly(cerceve), g['dis_yol'], 'fark')
    x0, y0, x1, y1 = KAPI_CEPHE
    g['siluet'] = yol_op(yol_dikdortgen(x0, y0, x1, y1), g['ic_yol'], 'fark')
    return g


def kapi_acikligi_yolu(ic=True):
    g = _kapi_geo()
    return skia.Path(g['ic_yol'] if ic else g['dis_yol'])


def kapi_siluet_yolu():
    return skia.Path(_kapi_geo()['siluet'])


# renkler ---------------------------------------------------------------------------------------------------------
KR = dict(
    duvar='#E9D6B6', duvar_sicak='#EBCDB2', duvar_serin='#E2D6C2', alfiz_ic='#EED8BE',
    tas='#F2E7D6', ablak='#E2B4A2', ablak_koyu='#C99282', derz='#B9A084',
    golge='#A6A1BA', golge_sicak='#BCA2AE', golge_koyu='#8F89A8', golge_ic='#A9A3BE',
    kaide='#DCC6A6', zemin='#E4D4B7',
    yaprak='#7FA28A', yaprak_acik='#9DB8A0', yaprak_koyu='#5C8270', sap='#78795C',
    cali='#8EAEA2', cali_koyu='#6A8E82',
)


def _golge_d(isik, derin):
    lx, ly = isik
    n = math.hypot(lx, ly) + 1e-9
    return (-lx / n * derin, -ly / n * derin)


def _isik_birim(isik):
    lx, ly = isik
    n = math.hypot(lx, ly) + 1e-9
    return lx / n, ly / n


# --- gül (tırmanan) ---------------------------------------------------------------------------------------------
GUL_CICEKLER = [  # x, y, r, renk, açılma gecikmesi, eğim, açı
    (-468, -992, 50, 'gul', 0.00, 0.30, -10),
    (-322, -1132, 40, 'allik', 0.22, 0.38, 8),
    (-530, -700, 44, 'allik', 0.10, 0.28, 12),
    (-498, -318, 38, 'gul', 0.32, 0.32, -6),
    (-598, -488, 34, 'beyaz', 0.45, 0.30, 4),
    (-420, -800, 29, 'gul', 0.58, 0.36, 0),
    (-560, -1150, 33, 'beyaz', 0.40, 0.34, -12),
]
GUL_TOMURCUK = [(-150, -1140, 8.0), (-612, -1040, 30.0), (-650, -705, -20.0), (-560, -150, 15.0),
                (-232, -1170, -10.0)]


def _gul_dallari(tohum):
    rng = np.random.default_rng(1000 + tohum)
    ana = [(-520.0, 120.0), (-526, -60), (-506, -230), (-522, -420), (-498, -610), (-512, -790), (-476, -960),
           (-418, -1082), (-322, -1140), (-232, -1160), (-150, -1140)]
    ikinci = [(-548, 110), (-578, -110), (-596, -330), (-614, -520), (-646, -700)]
    yan1 = [(-500, -600), (-458, -666), (-424, -790)]
    yan2 = [(-500, -880), (-560, -960), (-606, -1036)]
    yan3 = [(-470, -985), (-520, -1080), (-560, -1150)]
    dallar = []
    for omurga in (ana, ikinci, yan1, yan2, yan3):
        pts = np.array(omurga, np.float64)
        pts = pts + rng.normal(0, 2.5, pts.shape) * np.array([1, 0.4])
        pts[0] = omurga[0]
        dallar.append(pts)
    return dallar


def _dal_noktasi(dal, L, s):
    i = int(np.searchsorted(L, s)) - 1
    i = max(0, min(len(dal) - 2, i))
    u = (s - L[i]) / max(1e-6, L[i + 1] - L[i])
    p = dal[i] + (dal[i + 1] - dal[i]) * u
    tng = dal[i + 1] - dal[i]
    tng = tng / (np.hypot(*tng) + 1e-9)
    return p, tng


def _yaprak_dizisi(dal, rng, adim=40.0, boy=34.0, bas=0.15):
    """Dal boyunca bileşik gül yaprakları (3 ya da 5 yaprakçık). Döner: (açık, koyu, gölge yarıları) yolları."""
    A, B, G = [], [], []
    L = np.r_[0, np.cumsum(np.hypot(*np.diff(dal, axis=0).T))]
    s = adim * (0.4 + bas)
    taraf = 1
    while s < L[-1] - 8:
        p, tng = _dal_noktasi(dal, L, s)
        nrm = np.array([-tng[1], tng[0]]) * taraf
        yon = nrm * 0.85 + tng * 0.55
        yon /= np.hypot(*yon)
        a0 = math.degrees(math.atan2(yon[1], yon[0]))
        b = boy * rng.uniform(0.75, 1.15) * (0.75 + 0.25 * min(1.0, s / 200.0))
        sap_u = p + yon * b * 0.55
        bes = rng.random() < 0.45
        yap = [(0.0, 1.0, sap_u)]
        yap += [(-52, 0.78, p + yon * b * 0.30), (52, 0.78, p + yon * b * 0.30)]
        if bes:
            yap += [(-60, 0.6, p + yon * b * 0.08), (60, 0.6, p + yon * b * 0.08)]
        for j, (da, ol, q) in enumerate(yap):
            a = a0 + da + rng.uniform(-9, 9)
            Ly = b * ol
            yol = el.yaprak_yolu(q[0], q[1], Ly, Ly * 0.40, a, kivrim=rng.uniform(-0.1, 0.1))
            (A if (j + int(s)) % 3 else B).append(yol)
            ar = math.radians(a)
            nx, ny = -math.sin(ar), math.cos(ar)
            G.append(el.yaprak_yolu(q[0] + nx * Ly * 0.06, q[1] + ny * Ly * 0.06, Ly * 0.95, Ly * 0.17, a))
        taraf = -taraf
        s += adim * rng.uniform(0.75, 1.2)
    return A, B, G


def _cicek_yollari(x, y, r, ac, egim, aci, tohum):
    """el.sakayik ile aynı yapı: katman -> [yollar]; yollar M-yerelinde (önbellekli)."""
    ac = round(float(ac), 4)
    return _onbellek(('cicek', x, y, r, ac, egim, aci, tohum), lambda: _cicek_yollari_(x, y, r, ac, egim, aci, tohum))


def _cicek_yollari_(x, y, r, ac, egim, aci, tohum):
    rng = np.random.default_rng(tohum)
    Tb = M_bilesik(M_oteleme(x, y), M_donme(aci), M_olcek(1.0, 1.0 - egim * 0.55))
    R = r * (0.35 + 0.65 * ac)
    tp = el._tac_yapragi
    kat = {'gobek': [], 'on': [], 'kase': [], 'ic': [], 'orta': [], 'dis': [], 'siluet': []}
    kat['gobek'].append(yol_daire(0, -R * 0.02, R * 0.12))
    for j in range(3):
        am = math.pi / 2 + (j - 1) * 0.9 + rng.uniform(-0.1, 0.1)
        kat['on'].append(tp(0, R * 0.04, R * 0.10, R * rng.uniform(0.50, 0.62) * (0.7 + 0.3 * ac), am, 1.25,
                            tohum * 17 + j, kaselik=0.25))
    faz = rng.uniform(0, 2 * math.pi)
    for j in range(5):
        am = faz + j * 2 * math.pi / 5 + rng.uniform(-0.2, 0.2)
        (kat['ic'] if j % 2 else kat['kase']).append(tp(0, 0, R * 0.05, R * rng.uniform(0.40, 0.48), am, 1.7,
                                                         tohum * 13 + j))
    if ac >= 0.2:
        faz = rng.uniform(0, 2 * math.pi)
        for j in range(6):
            am = faz + j * 2 * math.pi / 6 + rng.uniform(-0.15, 0.15)
            kat['orta'].append(tp(0, 0, R * 0.12, R * rng.uniform(0.70, 0.80), am, 1.35, tohum * 19 + j))
    if ac >= 0.45:
        faz = rng.uniform(0, 2 * math.pi)
        for j in range(7):
            am = faz + j * 2 * math.pi / 7 + rng.uniform(-0.15, 0.15)
            kat['dis'].append(tp(0, 0, R * 0.25, R * rng.uniform(0.92, 1.02) * (0.6 + 0.4 * ac), am, 1.15,
                                 tohum * 23 + j))
    for k_ in kat:
        kat[k_] = [yol_donustur(p, Tb) for p in kat[k_]]
    return kat, R


def _cicekler_ciz(t, M, cicekler, tohum, yog=1.0):
    """Gül/şakayık çiçeklerini toplu (katman katman, bütün çiçekler bir arada) önden arkaya boyar.
    cicekler: [(x, y, r, renk, acilma, gorunurluk, egim, aci)]; renkler el.CICEK_RENK."""
    cc = [c for c in cicekler if c[4] > 0.02 and c[5] > 0.01]
    if not cc:
        return
    katlar = {k_: [] for k_ in ('gobek', 'on', 'kase', 'ic', 'orta', 'dis')}
    merk = []
    for i, (x, y, r, rn, ac, gor, eg, aci) in enumerate(cc):
        kat, R = _cicek_yollari(x, y, r, ac, eg, aci, tohum * 10 + i)
        for k_ in katlar:
            katlar[k_] += kat[k_]
        merk.append((x, y))
    merk = np.array(merk, np.float32)
    tablo = {idx: np.array([renk(el.CICEK_RENK[c[3]][idx]) for c in cc], np.float32) for idx in range(5)}
    gorl = np.array([c[5] for c in cc], np.float32)

    def en_yakin(X, Y):
        d = (X[..., None] - merk[:, 0]) ** 2 + (Y[..., None] - merk[:, 1]) ** 2
        return np.argmin(d, axis=-1)

    def renk_f(idx):
        def f(X, Y):
            return tablo[idx][en_yakin(X, Y)]
        return f

    def yog_f(X, Y):
        return gorl[en_yakin(X, Y)]
    tek = len(set(c[3] for c in cc)) == 1 and gorl.min() > 0.999
    ayar = dict(kenar=0.9, gran=0.06)

    def boya(yollar, idx, y_, isl, ig, ak, th):
        if not yollar:
            return
        if tek:
            _lavi(t, yollar, M, el.CICEK_RENK[cc[0][3]][idx], yog=y_ * yog, islak=isl, islak_gen=ig, akis=ak,
                  tohum=th, **ayar)
        else:
            _lavi(t, yollar, M, '#FFFFFF', yog=y_ * yog, islak=isl, islak_gen=ig, akis=ak, tohum=th,
                  renk_fn=renk_f(idx), yog_fn=yog_f, **ayar)
    boya(katlar['gobek'], 4, 0.5, 0.5, 2.0, 0.1, tohum + 9)
    _sakla(t, katlar['gobek'], M, 0.6)
    boya(katlar['on'], 1, 0.42, 1.1, 2.4, 0.18, tohum + 41)
    _sakla(t, katlar['on'], M, 0.6)
    boya(katlar['kase'], 2, 0.40, 1.0, 2.4, 0.22, tohum + 31)
    boya(katlar['ic'], 3, 0.40, 1.0, 2.4, 0.22, tohum + 32)
    _sakla(t, katlar['kase'] + katlar['ic'], M, 0.6)
    boya(katlar['orta'], 1, 0.36, 1.15, 2.6, 0.2, tohum + 37)
    _sakla(t, katlar['orta'], M, 0.6)
    boya(katlar['dis'], 0, 0.40, 1.25, 2.6, 0.2, tohum + 43)
    _sakla(t, katlar['dis'], M, 0.7)


def _cali_yollari(cx, cy, gen, yuk, tohum, n=60, r0=13.0, yuvarlak=True):
    """Alçak, yuvarlak çalı: üstü kubbemsi yaprak yığını (iki ton için iki liste)."""
    rng = np.random.default_rng(tohum)
    A, B = [], []
    for i in range(n):
        u = rng.uniform(-1, 1)
        h = math.sqrt(max(0.0, 1 - u * u)) ** 0.8
        x = cx + u * gen * 0.5
        y = cy - rng.uniform(0.0, 1.0) ** 0.7 * h * yuk
        r = r0 * rng.uniform(0.75, 1.25)
        if yuvarlak:
            yol = yol_elips(x, y, r, r * 0.9, rng.uniform(0, 180))
        else:
            yol = el.yaprak_yolu(x, y + r, r * 2.4, r * 0.8, rng.uniform(-150, -30))
        (A if rng.random() < 0.55 else B).append(yol)
    return A, B


def _ciz_gul(t, M, ac, tohum, isik):
    """Tırmanan gül (en önde, solda). ac: 0..1 açılma (dallar/yapraklar yayılır, çiçekler en son açar)."""
    p_dal = _p(ac, 0.40, 0.82)
    p_cicek = _p(ac, 0.60, 1.0)
    if p_dal <= 0:
        return
    # 1) çiçekler
    cic = []
    for i, (x, y, r, rn, gec, eg, aci) in enumerate(GUL_CICEKLER):
        a_c = _p(p_cicek, gec * 0.55, gec * 0.55 + 0.5)
        if a_c <= 0:
            continue
        cic.append((x, y, r, rn, 0.25 + 0.75 * a_c, min(1.0, 0.15 + 1.7 * a_c), eg, aci))
    _cicekler_ciz(t, M, cic, tohum + 500)
    tom, sep, A, B, G, dallar = _gul_geo(tohum)
    with _Grup(t, p_dal, M, 160, -1250, tohum + 3, dalga=0.05, on=0.05, egri=0.0):
        _lavi(t, tom, M, '#D66F7E', yog=0.48, kenar=0.9, islak=1.0, islak_gen=2.0, gran=0.06, akis=0.2,
              tohum=tohum + 40)
        _lavi(t, sep, M, KR['yaprak'], yog=0.55, kenar=0.8, islak=0.6, islak_gen=1.6, gran=0.05, akis=0.1,
              tohum=tohum + 50)
        _sakla(t, tom + sep, M, 0.6)
        # yapraklar: iki ton saklamasız üst üste, gölge yarıları, sonra saklama
        _lavi(t, A, M, KR['yaprak'], yog=0.46, kenar=0.9, islak=0.9, islak_gen=2.2, gran=0.07, akis=0.2,
              tohum=tohum + 61)
        _lavi(t, B, M, KR['yaprak_acik'], yog=0.44, kenar=0.9, islak=0.9, islak_gen=2.2, gran=0.07, akis=0.2,
              tohum=tohum + 62)
        _lavi(t, G, M, KR['yaprak_koyu'], yog=0.30, kenar=0.8, islak=0.5, islak_gen=1.6, gran=0.08, akis=0.2,
              tohum=tohum + 63)
        _sakla(t, A + B, M, 0.6)
        # dallar
        saplar = [yol_serit(d_, np.linspace(_cz(M, 4.2 if i == 0 else 3.2), _cz(M, 1.6), len(d_)))
                  for i, d_ in enumerate(dallar)]
        _lavi(t, saplar, M, KR['sap'], yog=0.6, kenar=0.7, islak=0.5, islak_gen=1.5, gran=0.1, akis=0.15,
              tohum=tohum + 64)
        _sakla(t, saplar, M, 0.5)


_GEO_ONBELLEK = {}


def _onbellek(anahtar, f):
    v = _GEO_ONBELLEK.get(anahtar)
    if v is None:
        if len(_GEO_ONBELLEK) > 4000:
            _GEO_ONBELLEK.clear()
        v = f()
        _GEO_ONBELLEK[anahtar] = v
    return v


def _gul_geo(tohum):
    def f():
        tom, sep = [], []
        for j, (x, y, a) in enumerate(GUL_TOMURCUK):
            tom.append(yol_elips(x, y - 8, 7.0, 11.5, a))
            sep += [el.yaprak_yolu(x, y + 2, 13, 3.4, -90 + a + d) for d in (-36, 36)]
        rng = np.random.default_rng(2000 + tohum)
        dallar = _gul_dallari(tohum)
        A, B, G = [], [], []
        for k_, dal in enumerate(dallar):
            a_, b_, g_ = _yaprak_dizisi(dal, rng, adim=44 if k_ == 0 else 38, boy=36 if k_ == 0 else 30,
                                        bas=0.15 if k_ == 0 else 0.0)
            A += a_
            B += b_
            G += g_
        ca, cb = _cali_yollari(-545, KAPI_ZEMIN + 8, 230, 150, tohum + 7, n=46, r0=15, yuvarlak=False)
        return tom, sep, A + ca, B + cb, G, dallar
    return _onbellek(('gul', tohum), f)


def _ciz_sag_cali(t, M, ac, tohum):
    """Sağ basamağın yanında alçak, yuvarlak yapraklı (okaliptüs tonlu) çalı ve birkaç küçük beyaz çiçek."""
    if ac <= 0:
        return
    cic = [(520, 30, 26, 'beyaz', 1.0, 1.0, 0.35, 0), (610, -20, 24, 'seftali', 0.95, 1.0, 0.35, 10),
           (478, 120, 21, 'beyaz', 0.85, 1.0, 0.4, -8), (570, 130, 19, 'seftali', 0.8, 1.0, 0.4, 6)]
    _cicekler_ciz(t, M, cic, tohum + 700)
    A, B = _onbellek(('sagcali', tohum), lambda: _cali_yollari(610, KAPI_ZEMIN + 10, 330, 230, tohum + 9, n=140, r0=15))
    _lavi(t, A, M, KR['cali'], yog=0.42, kenar=0.9, islak=0.9, islak_gen=2.2, gran=0.08, akis=0.2,
          tohum=tohum + 81)
    _lavi(t, B, M, KR['cali_koyu'], yog=0.38, kenar=0.9, islak=0.9, islak_gen=2.2, gran=0.08, akis=0.2,
          tohum=tohum + 82)
    _sakla(t, A + B, M, 0.6)


class _bos_bag:
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


# --- basamaklar -------------------------------------------------------------------------------------------------
KAPI_KATLAR = [  # (yarı genişlik, üst yüz üstü, ön yüz üstü, alt)
    (338.0, -10.0, 0.0, 36.0),
    (402.0, 36.0, 48.0, 110.0),
    (466.0, 110.0, 124.0, KAPI_ZEMIN),
]


def _ciz_basamaklar(t, M, tohum, isik):
    lx, _ = _isik_birim(isik)
    sgn = 1 if lx < 0 else -1
    onler, ustler, burunlar, segs = [], [], [], []
    for i, (hw, yu, yo, ya) in enumerate(KAPI_KATLAR):
        onler.append(yol_dikdortgen(-hw, yo, hw, ya))
        ustler.append(yol_dikdortgen(-hw, yu, hw, yo + 1.5))
        burunlar.append(yol_dikdortgen(-hw, yo, hw, yo + 5.0))
        rng = np.random.default_rng(tohum * 7 + i)
        x = -hw + rng.uniform(90, 150)
        while x < hw - 60:
            segs.append([(x, yo + 5), (x, ya - 2)])
            x += rng.uniform(150, 230)
    hwm = KAPI_KATLAR[-1][0]

    def yf(X, Y):
        u = X / hwm * sgn
        return 0.12 + 0.88 * smoothstep(-0.1, 1.1, u)
    # ön yüzler: kâğıt beyazı taş + ışıktan uzak yana doğru sıcak lavanta sır
    _lavi(t, onler, M, KR['golge_sicak'], yog=0.36, kenar=1.0, islak=0.9, islak_gen=2.6, gran=0.12,
          akis=0.22, tohum=tohum + 90, yog_fn=yf)
    _lavi(t, burunlar, M, KR['golge'], yog=0.30, kenar=0.7, dalga=0.0, islak=0.4, islak_gen=1.2, gran=0.08,
          akis=0.1, tohum=tohum + 95)
    _lavi(t, _cizgiler(segs), M, KR['derz'], yog=0.32, cizgi=_cz(M, 1.9), kenar=0.5, dalga=0.0, islak=0.0, gran=0.12,
          akis=0.15, tohum=tohum + 105, esik=False)
    _lavi(t, ustler, M, '#F1E4D2', yog=0.22, kenar=0.9, islak=0.9, islak_gen=2.0, gran=0.08, akis=0.15,
          tohum=tohum + 100)
    _sakla(t, onler + ustler, M, 0.6)


# --- kemer çerçevesi --------------------------------------------------------------------------------------------
KILIT_YG = 14.0   # kilit taşı yarı genişliği


def _kemer_tas_yollari():
    def f():
        g = _kapi_geo()
        a, c, r, ys = KAPI_A, g['c'], g['r'], g['ys']
        w = KAPI_KG
        kw = KILIT_YG
        th_k = math.acos((-kw - c) / r)          # iç yayda x = -kw
        th_out = math.acos(-c / (r + w))         # dış yay tepesi
        n = 9
        sinirlar = np.linspace(math.pi, th_k, n + 1)
        sol_yari = yol_dikdortgen(-2000, -3000, -kw, 100)
        parcalar = []
        for i in range(n):
            th1 = sinirlar[i + 1] if i < n - 1 else th_out - 0.02
            p = _halka_parca(c, ys, r - 0.5, r + w, sinirlar[i], th1, n=12)
            if i == n - 1:
                p = yol_op(p, sol_yari, 'kesisim')
            parcalar.append((p, i % 2))
            parcalar.append((yol_donustur(p, M_olcek(-1, 1)), i % 2))
        tepe_in = ys - math.sqrt(r * r - c * c)
        tepe_out = ys - math.sqrt((r + w) ** 2 - c * c)
        y_ust = tepe_out - 7
        kilit = yol_op(yol_cokgen([(-kw, tepe_in + 6), (kw, tepe_in + 6), (kw + 4.5, y_ust), (-kw - 4.5, y_ust)]),
                       g['dis_yol'], 'fark')
        kilit_bas = None
        sove = []
        yuks = [0.0]
        y = 0.0
        for hh in (104, 74, 104, 74, 104):
            y -= hh
            yuks.append(max(y, ys))
        yuks[-1] = ys
        for i in range(len(yuks) - 1):
            y0, y1 = yuks[i + 1], yuks[i]
            if y1 - y0 < 4:
                continue
            p = yol_dikdortgen(-a - w, y0, -a + 0.5, y1)
            sove.append((p, (i + 1) % 2))
            sove.append((yol_donustur(p, M_olcek(-1, 1)), (i + 1) % 2))
        return parcalar, (kilit, kilit_bas), sove, sinirlar, (tepe_in, tepe_out, y_ust, yuks)
    return _onbellek(('kemer_taslari',), f)


def _ciz_kemer_cercevesi(t, M, tohum, isik):
    g = _kapi_geo()
    a, c, r, ys = KAPI_A, g['c'], g['r'], g['ys']
    w = KAPI_KG
    parcalar, (kilit, kilit_bas), sove, sinirlar, (tepe_in, tepe_out, y_ust, yuks) = _kemer_tas_yollari()
    lx, _ = _isik_birim(isik)
    sgn = 1 if lx < 0 else -1
    kw = KILIT_YG
    # üzengi başlıkları (öne çıkık ince silme): kâğıt beyazı, altında gölge
    imp = [yol_dikdortgen(-a - w - 12, ys - 5, -a + 3, ys + 17, 2), yol_dikdortgen(a - 3, ys - 5, a + w + 12, ys + 17, 2)]
    _lavi(t, [yol_dikdortgen(-a - w - 12, ys + 9, -a + 3, ys + 17), yol_dikdortgen(a - 3, ys + 9, a + w + 12, ys + 17)],
          M, KR['golge'], yog=0.42, kenar=0.7, islak=0.5, islak_gen=1.4, gran=0.08, akis=0.1, tohum=tohum + 111)
    _sakla(t, imp, M, 0.6)
    # kilit taşı: ince, düşey kenarlı; üstte küçük başlık; gül kurusu, gölge yarısı, oyma damla
    _lavi(t, kilit, M, KR['ablak'], yog=0.42, kenar=0.9, islak=1.1, islak_gen=2.2, gran=0.1, akis=0.2,
          tohum=tohum + 112)
    yarim = yol_op(kilit, yol_dikdortgen(0, y_ust - 20, kw + 8, tepe_in + 10) if sgn > 0 else
                   yol_dikdortgen(-kw - 8, y_ust - 20, 0, tepe_in + 10), 'kesisim')
    _lavi(t, yarim, M, KR['ablak_koyu'], yog=0.26, kenar=0.8, islak=0.6, islak_gen=1.6, gran=0.1, akis=0.15,
          tohum=tohum + 113)
    yc = (tepe_in + y_ust) / 2 + 2
    damla = yol_egri([(0, yc - 15), (5.0, yc - 2), (4.2, yc + 7), (0, yc + 11), (-4.2, yc + 7), (-5.0, yc - 2)],
                     kapali=True, gerilim=0.5)
    _lavi(t, damla, M, KR['golge_koyu'], yog=0.32, kenar=0.7, islak=0.7, islak_gen=1.2, gran=0.06, akis=0.1,
          tohum=tohum + 114)
    _sakla(t, kilit, M, 0.6)
    # kemer ve söve taşları: kâğıt beyazı taş, dönüşümlü gül kurusu (ablak)
    hepsi = [p for p, _ in parcalar] + [p for p, _ in sove]
    gul = [p for p, k_ in parcalar if k_ == 1] + [p for p, k_ in sove if k_ == 1]
    _lavi(t, gul, M, KR['ablak'], yog=0.36, kenar=0.9, islak=1.0, islak_gen=2.2, gran=0.10, akis=0.22,
          tohum=tohum + 116)

    def yf(X, Y):
        u = sgn * X / (a + w)
        return 0.10 + 0.9 * smoothstep(-0.1, 0.95, u)
    _lavi(t, hepsi, M, KR['golge'], yog=0.24, kenar=0.9, islak=0.6, islak_gen=2.0, gran=0.1, akis=0.2,
          tohum=tohum + 117, yog_fn=yf)
    # derzler
    segs = []
    for th in sinirlar[1:-1]:
        for s_ in (1, -1):
            p0 = (s_ * (c + (r + 1) * math.cos(th)), ys - (r + 1) * math.sin(th))
            p1 = (s_ * (c + (r + w - 1) * math.cos(th)), ys - (r + w - 1) * math.sin(th))
            segs.append([p0, p1])
    for y in yuks[1:-1]:
        segs.append([(-a - w + 1, y), (-a - 1, y)])
        segs.append([(a + 1, y), (a + w - 1, y)])
    _lavi(t, _cizgiler(segs), M, KR['derz'], yog=0.40, cizgi=_cz(M, 1.7), kenar=0.5, islak=0.0,
          gran=0.12, akis=0.15, tohum=tohum + 118, esik=False)
    _sakla(t, [g['cerceve_yol']], M, 0.6)


# --- açıklığın derinliği ----------------------------------------------------------------------------------------
def _derinlik_alanlari(X, Y, isik):
    """Derinlik halkasında (söve ve kemer içi yüzleri) yüzey yönelimine göre gölge 0..1 (yumuşak sınır)."""
    g = _kapi_geo()
    c, ys = g['c'], g['ys']
    lx, ly = _isik_birim(isik)
    sol = X < 0
    jamb = Y > ys
    cx = np.where(sol, c, -c)
    dx_ = cx - X
    dy_ = ys - Y
    L = np.sqrt(dx_ * dx_ + dy_ * dy_) + 1e-6
    nx = np.where(jamb, np.where(sol, 1.0, -1.0), dx_ / L)
    ny = np.where(jamb, 0.0, dy_ / L)
    dot = nx * lx + ny * ly
    return smoothstep(0.12, -0.18, dot).astype(np.float32)


def _zemin_yollari(isik):
    """Eşiğin açıklık içindeki üst yüzü (perspektif dörtgen) ve üzerine sövenin düşürdüğü üçgen gölge."""
    a = KAPI_A
    vx, vy = KAPI_KACIS
    yic = vy + (0 - vy) * KAPI_DERIN
    aic = a * KAPI_DERIN
    zem = yol_cokgen([(-a, 0.5), (a, 0.5), (aic, yic), (-aic, yic)])
    lx, _ = _isik_birim(isik)
    sgn = 1 if lx < 0 else -1
    gol = yol_cokgen([(-sgn * a, 0.5), (-sgn * aic, yic), (-sgn * aic + sgn * 64.0, yic),
                      (-sgn * a + sgn * 6.0, 0.5)])
    return zem, gol


def _ciz_derinlik(t, M, tohum, isik):
    g = _kapi_geo()
    halka = yol_op(g['dis_yol'], g['ic_yol'], 'fark')
    zem, zgol = _zemin_yollari(isik)
    duvarlar = yol_op(halka, zem, 'fark')
    ys = g['ys']

    def yf(X, Y):
        return _derinlik_alanlari(X, Y, isik) * (0.95 + 0.15 * smoothstep(-860, ys, Y))

    def renk_fn(X, Y):
        u = smoothstep(ys - 250, 0, Y)[..., None]
        a_ = renk(KR['golge_ic'])
        b_ = renk(KR['golge_sicak'])
        return a_ + (b_ - a_) * u
    # tek geçiş: açık sıcak taban (ışıklı yüzler neredeyse kâğıt) x gölge sırrı -> etkin renk alanı
    cb = renk('#F0E1CC')
    Y0 = 0.80

    def renk_et(X, Y):
        T = (1.0 - 0.20 * (1.0 - cb)) * (1.0 - (0.48 * yf(X, Y))[..., None] * (1.0 - renk_fn(X, Y)))
        return 1.0 - (1.0 - T) / Y0
    _lavi(t, duvarlar, M, '#FFFFFF', yog=Y0, kenar=1.0, islak=1.0, islak_gen=2.4, gran=0.11, akis=0.21,
          tohum=tohum + 121, renk_fn=renk_et)
    _lavi(t, zem, M, '#F0E1CC', yog=0.20, kenar=0.9, islak=0.9, islak_gen=2.2, gran=0.1, akis=0.2,
          tohum=tohum + 120)
    _lavi(t, zgol, M, KR['golge_sicak'], yog=0.40, kenar=0.9, islak=0.7, islak_gen=1.8, gran=0.1, akis=0.15,
          tohum=tohum + 122)
    _sakla(t, [halka], M, 0.6)


# --- alfiz, korniş, rozetler ------------------------------------------------------------------------------------
def _ciz_alfiz(t, M, tohum, isik):
    ai, au, aw = KAPI_ALFIZ, KAPI_ALFIZ_UST, KAPI_ALFIZ_G
    lx, _ = _isik_birim(isik)
    sgn = 1 if lx < 0 else -1
    kx = ai + aw + 46
    y0 = au - aw
    # --- taç kornişi: alt silme, dişler, iki üst silme (kâğıt beyazı) ---
    korn_alt = yol_dikdortgen(-kx, y0 - 22, kx, y0, 2)
    xw, gap = 14.0, 10.0
    n = int((2 * kx - 24) // (xw + gap))
    x_bas = -((n * (xw + gap) - gap) / 2)
    xs_d = [x_bas + i * (xw + gap) for i in range(n)]
    disler = [yol_dikdortgen(x, y0 - 48, x + xw, y0 - 24) for x in xs_d]
    korn_ust = yol_dikdortgen(-kx - 14, y0 - 66, kx + 14, y0 - 48, 2)
    korn_ust2 = yol_dikdortgen(-kx - 24, y0 - 82, kx + 24, y0 - 66, 2)
    golgeler = [yol_dikdortgen(-kx - 14, y0 - 53, kx + 14, y0 - 48),
                yol_dikdortgen(-kx - 24, y0 - 70, kx + 24, y0 - 66),
                yol_dikdortgen(-kx, y0 - 6, kx, y0)]
    # dişlerin gölge yanı
    dyan = [yol_dikdortgen(x + (xw - 4.5 if sgn > 0 else 0), y0 - 48, x + (xw if sgn > 0 else 4.5), y0 - 24)
            for x in xs_d]
    _lavi(t, golgeler + dyan, M, KR['golge'], yog=0.36, kenar=0.7, dalga=0.0, islak=0.4, islak_gen=1.2, gran=0.08,
          akis=0.1, tohum=tohum + 132)
    _sakla(t, disler + [korn_alt, korn_ust, korn_ust2], M, 0.5)
    # diş aralarındaki boşluk (gölgede)
    bosluk = yol_dikdortgen(-kx + 2, y0 - 48, kx - 2, y0 - 22)

    def yfb(X, Y):
        return 0.8 + 0.3 * smoothstep(y0 - 24, y0 - 48, Y)
    _lavi(t, bosluk, M, KR['golge'], yog=0.42, kenar=0.7, dalga=0.0, islak=0.7, islak_gen=1.4, gran=0.1, akis=0.15,
          tohum=tohum + 131, yog_fn=yfb)
    _sakla(t, bosluk, M, 0.5)
    # --- alfiz bandı ---
    dis = yol_dikdortgen(-ai - aw, au - aw, ai + aw, KAPI_KAIDE)
    ic = yol_dikdortgen(-ai, au, ai, KAPI_KAIDE + 1)
    bant = yol_op(dis, ic, 'fark')
    ka = 10.0
    kanal = yol_op(yol_dikdortgen(-ai - aw + ka, au - aw + ka, ai + aw - ka, KAPI_KAIDE),
                   yol_dikdortgen(-ai - ka + 0.5, au - ka + 0.5, ai + ka - 0.5, KAPI_KAIDE + 1), 'fark')
    kanal = yol_op(kanal, yol_dikdortgen(-ai - aw + ka + 3.5, au - aw + ka + 3.5, ai + aw - ka - 3.5,
                                         KAPI_KAIDE + 2), 'fark')
    gy = yol_dikdortgen(ai + aw - 6, au - aw, ai + aw, KAPI_KAIDE) if sgn > 0 else \
        yol_dikdortgen(-ai - aw, au - aw, -ai - aw + 6, KAPI_KAIDE)
    _lavi(t, [kanal], M, KR['golge'], yog=0.40, kenar=0.6, dalga=0.0, islak=0.4, islak_gen=1.0, gran=0.08, akis=0.12,
          tohum=tohum + 135)
    _lavi(t, [gy], M, KR['golge'], yog=0.22, kenar=0.7, dalga=0.0, islak=0.3, islak_gen=1.2, gran=0.08, akis=0.12,
          tohum=tohum + 136)
    _sakla(t, bant, M, 0.6)
    # --- köşelik rozetleri (oyma: yükseltilmiş halka, sivri yapraklı çiçek, göbek); iki rozet birlikte ---
    dx, dy = _golge_d(isik, _yuz(M, 3.2))
    R_ = _onbellek(('rozet', round(dx, 2), round(dy, 2)), lambda: _rozet_geo(dx, dy))
    ayar = dict(kenar=0.7, gran=0.06)
    _lavi(t, R_['gobek'], M, KR['ablak_koyu'], yog=0.45, islak=0.7, islak_gen=1.2, akis=0.1, tohum=tohum + 148,
          **ayar)
    _sakla(t, R_['gobek'], M, 0.4)
    _lavi(t, R_['cic2'], M, KR['ablak'], yog=0.36, islak=1.0, islak_gen=1.4, akis=0.2, tohum=tohum + 150, **ayar)
    _sakla(t, R_['cic2'], M, 0.4)
    _lavi(t, R_['cic'], M, KR['ablak'], yog=0.26, islak=1.1, islak_gen=1.8, akis=0.2, tohum=tohum + 140, **ayar)
    _lavi(t, R_['cg'], M, KR['golge_koyu'], yog=0.36, islak=0.4, islak_gen=1.0, akis=0.1, tohum=tohum + 144,
          **ayar)
    _sakla(t, R_['cic'], M, 0.4)
    _lavi(t, R_['cuk'], M, KR['golge'], yog=0.22, islak=0.6, islak_gen=1.4, akis=0.15, tohum=tohum + 146, **ayar)
    _sakla(t, R_['tam'], M, 0.5)
    _lavi(t, R_['hg'], M, KR['golge'], yog=0.34, islak=0.4, islak_gen=1.0, akis=0.1, tohum=tohum + 152, **ayar)


def _rozet_geo(dx, dy):
    R_ = {k_: [] for k_ in ('gobek', 'cic2', 'cic', 'cg', 'cuk', 'tam', 'hg')}
    for s_ in (-1, 1):
        cx, cy, rr = s_ * 270.0, -906.0, 50.0
        halka = yol_op(yol_daire(cx, cy, rr), yol_daire(cx, cy, rr - 6), 'fark')
        cic = _rozet_yolu(cx, cy, rr - 11, 8, faz=math.pi / 8, ic=0.36)
        R_['gobek'].append(yol_daire(cx, cy, rr * 0.13))
        R_['cic2'].append(_rozet_yolu(cx, cy, (rr - 11) * 0.55, 8, faz=0.0, ic=0.45))
        R_['cic'].append(cic)
        R_['cg'].append(yol_op(cic, _kaydir(cic, dx, dy), 'fark'))
        R_['cuk'].append(yol_daire(cx, cy, rr - 6))
        R_['tam'].append(yol_daire(cx, cy, rr))
        hg = yol_op(_kaydir(halka, dx, dy), yol_daire(cx, cy, rr), 'fark')
        R_['hg'].append(yol_op(hg, halka, 'fark'))
    return R_


def _ciz_kaide_silme(t, M, tohum):
    x0, x1 = KAPI_CEPHE[0], KAPI_CEPHE[2]
    y = KAPI_KAIDE
    silme = yol_dikdortgen(x0, y, x1, y + 16)
    _lavi(t, yol_dikdortgen(x0, y + 9, x1, y + 16), M, KR['golge'], yog=0.34, kenar=0.7, dalga=0.0, islak=0.4,
          islak_gen=1.2, gran=0.08, akis=0.1, tohum=tohum + 151)
    _sakla(t, silme, M, 0.6)


# --- cephe, kaide, zemin ----------------------------------------------------------------------------------------
def _derz_segmentleri(bolge, tohum, sira_h=92.0, y_bas=KAPI_KAIDE, haric=None):
    """Kesme taş derzleri ve taş blokları (önbellekli): (derz yolu, koyu bloklar yolu, açık bloklar yolu).
    haric=(hx0, hy0, hx1, hy1): bu dikdörtgenin içinde derz ve blok tonu yok (pürüzsüz sıva)."""
    def f():
        x0, y0, x1, y1 = bolge
        rng = np.random.default_rng(tohum)
        segs = []
        koyu, acik = skia.Path(), skia.Path()
        hx0, hy0, hx1, hy1 = haric if haric is not None else (0, 0, 0, 0)

        def icinde(xa, xb, ya, yb):  # [xa,xb]x[ya,yb] tamamen hariç bölgede mi
            return haric is not None and xa >= hx0 and xb <= hx1 and ya >= hy0 and yb <= hy1

        def yatay(y, xa, xb):
            if haric is not None and hy0 < y < hy1 and xa < hx1 and xb > hx0:
                if xa < hx0:
                    segs.append([(xa, y), (hx0, y)])
                if xb > hx1:
                    segs.append([(hx1, y), (xb, y)])
            else:
                segs.append([(xa, y), (xb, y)])
        y = y_bas
        i = 0
        while y > y0:
            yb = y - sira_h * (1.0 if i % 2 == 0 else 0.82)
            yatay(yb, x0, x1)
            xp = x0 - rng.uniform(0, 260)
            x = x0 + rng.uniform(0, 260)
            while xp < x1:
                if x < x1 and not icinde(x, x, yb, y):
                    segs.append([(x, yb + 1), (x, y - 1)])
                u = rng.random()
                kesisir = haric is not None and xp < hx1 and x > hx0 and yb < hy1 and y > hy0
                if not kesisir:
                    if u < 0.30:
                        koyu.addRect(skia.Rect.MakeLTRB(xp, yb, x, y))
                    elif u < 0.48:
                        acik.addRect(skia.Rect.MakeLTRB(xp, yb, x, y))
                xp = x
                x += rng.uniform(170, 290)
            y = yb
            i += 1
        return _cizgiler(segs), koyu, acik
    return _onbellek(('derz', bolge, tohum, sira_h, y_bas, haric), f)


def _maske_cok(katlar, M, k):
    """[(yol, ağırlık)] yollarını tek A8 yüzeye ağırlıklı çizer (toplanmaz; üst üste binmeyen yollar için)."""
    s = skia.Surface.MakeRaster(skia.ImageInfo.MakeA8(k.w, k.h))
    c = s.getCanvas()
    c.setMatrix(mt._skmat(M_bilesik(M_oteleme(-k.x0, -k.y0), M)))
    for yol, a in katlar:
        p = skia.Paint(AntiAlias=True, Alphaf=float(a))
        c.drawPath(yol, p)
    return s.makeImageSnapshot().toarray().astype(np.float32) * (1.0 / 255.0)


def _ciz_cephe(t, M, tohum, isik, bant=None):
    g = _kapi_geo()
    x0, y0, x1, y1 = KAPI_CEPHE
    ai, au, aw = KAPI_ALFIZ, KAPI_ALFIZ_UST, KAPI_ALFIZ_G
    duvar = yol_op(yol_dikdortgen(x0, y0, x1, KAPI_KAIDE + 1), g['dis_yol'], 'fark')
    k = yollar_kirp([duvar], M, 14)
    if k.bos():
        return
    m = maske_ciz([duvar], M, k)
    if t.saklama is not None and (m * (1 - t.saklama[k.dilim])).max() < 1e-3:
        return
    # derzler (alfiz içi pürüzsüz sıva: derzsiz)
    dyol, koyu, acik = _derz_segmentleri((x0, y0, x1, KAPI_KAIDE), 500 + tohum,
                                          haric=(-ai - aw, au - aw, ai + aw, KAPI_KAIDE + 2))
    derz = maske_ciz([dyol], M, k, cizgi=_cz(M, 1.7, us=0.55))
    tas_m = _maske_cok([(koyu, 1.0), (acik, 0.5)], M, k)
    tas_m = np.where(tas_m > 0.75, 0.13 * tas_m, -0.22 * tas_m)
    kay = ((tohum * 37.1) % N_DOKU, (tohum * 11.3) % N_DOKU)
    # kayıp-bulunan derz görünürlüğü (düşük frekans)
    Mi = np.linalg.inv(M)
    q = 8
    hl, wl = -(-k.h // q), -(-k.w // q)
    A = np.array([[q, 0, k.x0 + (q - 1) / 2.0], [0, q, k.y0 + (q - 1) / 2.0], [0, 0, 1.0]])
    T = (np.array([[0.6, 0, kay[0] + 300], [0, 0.6, kay[1]], [0, 0, 1.0]]) @ Mi @ A)[:2]
    f = cv2.warpAffine(mt.G_AKIS, T.astype(np.float32), (wl, hl), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                       borderMode=cv2.BORDER_WRAP)
    gor = cv2.resize(np.clip(0.5 + 0.65 * f, 0.0, 1.0), (wl * q, hl * q), interpolation=cv2.INTER_LINEAR)[:k.h, :k.w]
    harita = 1.0 + derz * (2.3 * gor) + tas_m

    def yog_fn(X, Y):
        v = 1.0 + 0.10 * smoothstep(-1300, 0, Y) + 0.05 * np.minimum(np.abs(X) / 900.0, 1.2)
        # ışık sol üstten: sağ-alta doğru çok hafif koyulaşma
        v = v + 0.06 * np.clip((X * (-isik[0]) + Y * (-isik[1])) / 1400.0, -1, 1)
        return v * bant(X, Y) if bant is not None else v

    YD = 0.40
    gs = renk(KR['golge'])

    def renk_fn(X, Y):
        a_ = renk(KR['duvar'])
        b_ = renk(KR['duvar_sicak'])
        c_ = renk(KR['duvar_serin'])
        d_ = renk(KR['alfiz_ic'])
        n_ = _gurultu(X, Y, kay, 0.25)
        u = np.clip(0.5 + 0.35 * n_, 0, 1)[..., None]
        v = smoothstep(-1500, 100, Y)[..., None]
        base = c_ + (a_ - c_) * (0.4 + 0.6 * v)
        out = base + (b_ - base) * u * 0.6
        ic = ((np.abs(X) < ai) & (Y > au)).astype(np.float32)[..., None]
        out = out + (d_ - out) * ic * 0.7
        # saçak (çatı) gölgesi üstte: lavanta sır ile birleşik etkin renk (yoğunluk YD'ye göre)
        sg = (smoothstep(-1180, -1560, Y) * (0.85 + 0.15 * smoothstep(-2800, -1600, Y)) * 0.30)[..., None]
        T = (1.0 - YD * (1.0 - out)) * (1.0 - sg * (1.0 - gs))
        return 1.0 - (1.0 - T) / YD
    _lavi(t, duvar, M, KR['duvar'], yog=0.40, kenar=1.2, dalga=0.0, islak=0.9, islak_gen=3.0, gran=0.13, akis=0.20,
          tohum=tohum + 160, yog_fn=yog_fn, renk_fn=renk_fn, yog_harita=harita, maske=(k, m))
    # düşen gölgeler: alfiz, korniş, kemer çerçevesi (çıkıntılardan ışıktan uzağa)
    dx, dy = _golge_d(isik, _yuz(M, 9.0))
    kx = ai + aw + 46
    y_k0 = au - aw
    golgeler = []
    for c_, f_ in ((yol_dikdortgen(-ai - aw, au - aw, ai + aw, KAPI_KAIDE), 1.2),
                   (yol_dikdortgen(-kx - 24, y_k0 - 82, kx + 24, y_k0), 1.0),
                   (_poly(g['cerceve_dis']), 1.0)):
        golgeler.append(yol_op(_kaydir(c_, dx * f_, dy * f_), c_, 'fark'))
    # alfiz bandının içe düşen gölgesi (iç kenar boyunca, ışık yanında)
    ic_r = yol_dikdortgen(-ai, au, ai, KAPI_KAIDE)
    golgeler.append(yol_op(ic_r, _kaydir(ic_r, dx * 1.2, dy * 1.2), 'fark'))
    _lavi(t, golgeler, M, KR['golge'], yog=0.36, kenar=1.0, dalga=0.0, islak=0.0, islak_gen=2.0, gran=0.12,
          akis=0.2, tohum=tohum + 162)


def _ciz_kaide_zemin(t, M, tohum, isik, bant=None):
    x0, y0, x1, y1 = KAPI_CEPHE
    lx, _ = _isik_birim(isik)
    sgn = 1 if lx < 0 else -1
    kaide = yol_dikdortgen(x0, KAPI_KAIDE + 15, x1, KAPI_ZEMIN + 1)
    k = yollar_kirp([kaide], M, 14)
    if not k.bos():
        rng = np.random.default_rng(600 + tohum)
        segs = []
        ys_ = [KAPI_KAIDE + 16, 70.0, KAPI_ZEMIN]
        for j in range(len(ys_) - 1):
            x = x0 + rng.uniform(0, 300)
            while x < x1:
                segs.append([(x, ys_[j]), (x, ys_[j + 1])])
                x += rng.uniform(240, 360)
        segs.append([(x0, 70.0), (x1, 70.0)])
        dm = maske_ciz([_cizgiler(segs)], M, k, cizgi=_cz(M, 1.8, us=0.55))
        _lavi(t, kaide, M, KR['kaide'], yog=0.42, kenar=1.0, dalga=0.0, islak=0.8, islak_gen=2.6, gran=0.14,
              akis=0.22, tohum=tohum + 170, yog_harita=1.0 + 1.2 * dm, maske=(k, maske_ciz([kaide], M, k)), yog_fn=bant)
    # basamakların kaideye düşen gölgesi
    dd = 28.0
    gol = []
    for (hw, yu, yo, ya) in KAPI_KATLAR:
        xs = sgn * hw
        gol.append(yol_cokgen([(xs, yu), (xs + sgn * dd, yu + dd * 0.6), (xs + sgn * dd, ya), (xs, ya)]))
    _lavi(t, gol, M, KR['golge'], yog=0.32, kenar=1.0, dalga=0.0, islak=0.5, islak_gen=2.0, gran=0.12, akis=0.2,
          tohum=tohum + 171)
    # avlu zemini: sıcak kum taşı + kaçışa giden derzler
    zemin = yol_dikdortgen(x0, KAPI_ZEMIN, x1, y1)
    kz = yollar_kirp([zemin], M, 14)
    if kz.bos():
        return
    vx, vy = KAPI_KACIS
    segs = []
    for xb in np.arange(-2475, 2476, 150.0):
        ux, uy = xb - vx, KAPI_ZEMIN - vy
        tt = (y1 - vy) / uy
        segs.append([(xb, KAPI_ZEMIN), (vx + ux * tt, y1)])
    yy = KAPI_ZEMIN
    adim = 44.0
    while yy < y1:
        yy += adim
        adim *= 1.30
        segs.append([(x0, yy), (x1, yy)])
    dm = maske_ciz([_cizgiler(segs)], M, kz, cizgi=_cz(M, 1.6, us=0.55))

    def yf(X, Y):
        return 0.9 + 0.25 * smoothstep(KAPI_ZEMIN, 900, Y)
    # basamakların zemine düşen yumuşak gölgesi (ışıktan uzak yanda)
    hw = KAPI_KATLAR[-1][0]
    xs = sgn * hw

    def yf2(X, Y):
        u = (X - xs) * sgn
        a_ = smoothstep(-hw * 1.6, -hw * 0.6, u) * (1 - smoothstep(10, 70, u))
        b_ = 1 - smoothstep(KAPI_ZEMIN, KAPI_ZEMIN + 46 + 0.06 * (u + hw * 2), Y)
        # taş plak başına hafif ton farkı (perspektif plak indeksi)
        dyv = np.maximum(Y - vy, 1.0)
        xb = vx + (X - vx) * (KAPI_ZEMIN - vy) / dyv
        sut = np.floor((xb + 2475.0) / 150.0)
        sat = np.floor(np.log1p(np.maximum(Y - KAPI_ZEMIN, 0) * 0.30 / 44.0) / math.log(1.30))
        hsh = np.sin(sut * 12.9898 + sat * 78.233 + tohum) * 43758.5453
        hsh = hsh - np.floor(hsh)
        v = (0.9 + 0.25 * smoothstep(KAPI_ZEMIN, 900, Y) + 0.55 * a_ * b_) * (0.86 + 0.28 * hsh)
        return v * bant(X, Y) if bant is not None else v
    _lavi(t, zemin, M, KR['zemin'], yog=0.46, kenar=1.2, dalga=0.0, islak=0.9, islak_gen=3.0, gran=0.15, akis=0.22,
          tohum=tohum + 172, yog_fn=yf2, yog_harita=1.0 + 0.9 * dm, maske=(kz, maske_ciz([zemin], M, kz)))


def _kapi_siluet_sakla(t, M, g):
    """Cephenin tam silüetini saklamaya yazar. Hızlı yol: cephe ekranı kaplıyorsa açıklığın kutusu dışında saklama
    doğrudan 1 olur, yalnız açıklık kutusunda yumuşak kenarlı maske hesaplanır."""
    if t._yigin or any(tid == id(t) for (tid, _) in _EKRAN_MASKE):
        _sakla(t, [g['siluet']], M, 0.6)
        return
    x0, y0, x1, y1 = KAPI_CEPHE
    kose = [nokta_donustur(M, x, y) for (x, y) in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))]
    xs, ys_ = [p[0] for p in kose], [p[1] for p in kose]
    if not (min(xs) <= 0 and max(xs) >= W and min(ys_) <= 0 and max(ys_) >= H and abs(M[0, 1]) < 1e-9
            and abs(M[1, 0]) < 1e-9):
        _sakla(t, [g['siluet']], M, 0.6)
        return
    if t.saklama is None:
        t.saklama = np.zeros((H, W), np.float32)
    k = yollar_kirp([g['ic_yol']], M, 6)
    if k.bos():
        t.saklama[:] = 1.0
        return
    m = 1.0 - cv2.GaussianBlur(maske_ciz([g['ic_yol']], M, k), (0, 0), 0.6)
    ic = t.saklama[k.dilim].copy()
    t.saklama[:] = 1.0
    t.saklama[k.dilim] = np.maximum(ic, m)


def ciz_kemerli_kapi(t: Tuval, M, acilma=1.0, isik=(-0.6, -0.8), tohum=0, sakla_sonra=True):
    g = _kapi_geo()
    ac = float(min(1.0, max(0.0, acilma)))
    y_alt, y_ust = 640.0, -1400.0
    if ac > 0.0:
        # açılma zamanı ressamın sırasıdır (büyük cephe lavisi önce yükselir, taş detayları ve gölgeler
        # arkasından, güller en son açar); boyama sırası ise önden arkaya (saklama ile).
        p_cephe = _p(ac, 0.0, 0.70)
        p_bas = _p(ac, 0.0, 0.42)
        p_kemer = _p(ac, 0.16, 0.78)
        p_derin = _p(ac, 0.30, 0.88)
        p_alfiz = _p(ac, 0.26, 0.90)
        p_cali = _p(ac, 0.45, 0.95)
        ON = dict(dalga=0.035, on=0.04, egri=0.06)
        bant = _on_bandi(p_cephe, y_alt, y_ust, tohum=tohum + 5, **ON)
        _ciz_gul(t, M, ac, tohum, isik)
        with _Grup(t, p_cali, M, y_alt, y_ust, tohum + 5, **ON) as gr:
            if gr.gorunur:
                _ciz_sag_cali(t, M, 1.0, tohum)
        with _Grup(t, p_bas, M, y_alt, y_ust, tohum + 5, **ON) as gr:
            if gr.gorunur:
                _ciz_basamaklar(t, M, tohum, isik)
        with _Grup(t, p_kemer, M, y_alt, y_ust, tohum + 5, **ON) as gr:
            if gr.gorunur:
                _ciz_kemer_cercevesi(t, M, tohum, isik)
        with _Grup(t, p_derin, M, y_alt, y_ust, tohum + 5, **ON) as gr:
            if gr.gorunur:
                _ciz_derinlik(t, M, tohum, isik)
        with _Grup(t, p_alfiz, M, y_alt, y_ust, tohum + 5, **ON) as gr:
            if gr.gorunur:
                _ciz_alfiz(t, M, tohum, isik)
                _ciz_kaide_silme(t, M, tohum)
        with _Grup(t, p_cephe, M, y_alt, y_ust, tohum + 5, **ON) as gr:
            if gr.gorunur:
                _ciz_cephe(t, M, tohum, isik, bant)
                _ciz_kaide_zemin(t, M, tohum, isik, bant)
    if sakla_sonra:
        _kapi_siluet_sakla(t, M, g)
    vx, vy = KAPI_KACIS
    yerel = {
        'aciklik_alt': (0.0, 0.0), 'aciklik_merkez': (0.0, -KAPI_H / 2), 'kemer_tepe': (0.0, -KAPI_H),
        'kacis': (vx, vy),
        'sol_ic': (float(vx + (-KAPI_A - vx) * KAPI_DERIN), float(vy + (g['ys'] - vy) * KAPI_DERIN)),
        'sag_ic': (float(vx + (KAPI_A - vx) * KAPI_DERIN), float(vy + (g['ys'] - vy) * KAPI_DERIN)),
        'gul': (float(GUL_CICEKLER[0][0]), float(GUL_CICEKLER[0][1])),
    }
    out = {k_: _ekran(M, v) for k_, v in yerel.items()}
    out['yerel'] = yerel
    return out


# =================================================================================================================
# 2) YEŞİL KUBBELİ CAMİ
# =================================================================================================================
CR = dict(
    yesil='#6CA97A', yesil_koyu='#3E7C58', yesil_kasnak='#62A072', kaburga='#2F6449', pencere_yesil='#2D5446',
    pencere='#6E5862', pencere_acik='#93787F', tas_golge='#A7A3B8', tas_golge_sicak='#B5A6B4', kaide='#D8CDBF',
    altin='#D9A441', altin_koyu='#B07A2A', altin_acik='#ECCB7C', zikzak='#8A7280', kulah='#6AA67A',
)
KUBBE_X = 70.0
KUBBE_TABAN = -420.0
KUBBE_TEPE = -780.0
KUBBE_R = 262.0
K1_HW = 318.0
K2_HW = 280.0
MINARE_X = -330.0
GOVDE_X0, GOVDE_X1, GOVDE_UST = -345.0, 470.0, -186.0


def _spline_np(pts, n=120):
    """Açık Catmull-Rom eğrisinden yoğun nokta dizisi."""
    P = np.asarray(pts, np.float64)
    P = np.vstack([P[0] * 2 - P[1], P, P[-1] * 2 - P[-2]])
    out = []
    seg = len(P) - 3
    for i in range(seg):
        p0, p1, p2, p3 = P[i], P[i + 1], P[i + 2], P[i + 3]
        m = max(2, n // seg)
        for tt in np.linspace(0, 1, m, endpoint=(i == seg - 1)):
            t2, t3 = tt * tt, tt * tt * tt
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * tt + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    return np.array(out)


def _kubbe_profil():
    """Kubbe sağ profili (x_yarı, y) yukarı doğru; taban y = KUBBE_TABAN."""
    h = KUBBE_TABAN - KUBBE_TEPE  # 360
    R = KUBBE_R
    rel = [(1.0, 0), (1.025, -0.10), (1.02, -0.22), (0.975, -0.37), (0.885, -0.53), (0.735, -0.69),
           (0.535, -0.825), (0.30, -0.93), (0.10, -0.985), (0, -1.0)]
    pts = [(x * R, KUBBE_TABAN + yy * h) for (x, yy) in rel]
    pr = _spline_np(pts, 160)
    pr[-1] = (0.0, KUBBE_TEPE)
    return pr


def _isik3(isik, z=0.75):
    lx, ly = _isik_birim(isik)
    v = np.array([lx, ly, z])
    return v / np.linalg.norm(v)


def _kubbe_lambert(X, Y, isik):
    pr = _onbellek(('kubbe_profil',), _kubbe_profil)
    ys = pr[::-1, 1]
    xs = pr[::-1, 0]
    hw = np.interp(Y, ys, xs)
    dxdy = np.gradient(pr[:, 0]) / (np.gradient(pr[:, 1]) - 1e-9)
    beta = np.arctan(np.abs(dxdy))          # 0 düşey yan, pi/2 tepe
    b = np.interp(Y, ys, beta[::-1])
    u = np.clip((X - KUBBE_X) / np.maximum(hw, 1.0), -0.999, 0.999)
    cb, sb = np.cos(b), np.sin(b)
    nx = u * cb
    nz = np.sqrt(1 - u * u) * cb
    ny = -sb
    L = _isik3(isik)
    return nx * L[0] + ny * L[1] + nz * L[2]


def _silindir_lambert(X, cx, hw, isik):
    u = np.clip((X - cx) / hw, -0.999, 0.999)
    L = _isik3(isik)
    return u * L[0] + np.sqrt(1 - u * u) * L[2]


def _kemerli_pencere(cx, y_alt, w, h, sivri=0.5):
    pts, _, _, _ = _kemer_pts(w / 2.0, h, sivri, 0.0, 0.0, n=14)
    pts = pts + np.array([cx, y_alt])
    return _poly(pts)


def _alem_yollari(cx, y0, s=1.0):
    """Altın alem: taban halkası, boyun, iki küre, damla, hilal (uçları yukarı). y0: oturduğu nokta (taban)."""
    p = {}
    p['taban'] = [yol_elips(cx, y0 - 3 * s, 25 * s, 7.5 * s)]
    p['boyun'] = [yol_dikdortgen(cx - 3.2 * s, y0 - 118 * s, cx + 3.2 * s, y0 - 4 * s)]
    p['kure'] = [yol_elips(cx, y0 - 30 * s, 14 * s, 13 * s), yol_elips(cx, y0 - 58 * s, 10.5 * s, 10 * s),
                 yol_egri([(cx, y0 - 98 * s), (cx + 7.5 * s, y0 - 84 * s), (cx + 6 * s, y0 - 74 * s),
                           (cx, y0 - 70 * s), (cx - 6 * s, y0 - 74 * s), (cx - 7.5 * s, y0 - 84 * s)],
                          kapali=True, gerilim=0.5)]
    p['halka'] = [yol_elips(cx, y0 - 45 * s, 6.5 * s, 2.6 * s), yol_elips(cx, y0 - 102 * s, 5 * s, 2.2 * s)]
    r = 17 * s
    yc = y0 - 120 * s - r * 0.15
    dis = yol_daire(cx, yc - r * 0.55, r)
    ic = yol_daire(cx, yc - r * 0.55 - r * 0.42, r * 0.84)
    p['hilal'] = [yol_op(dis, ic, 'fark')]
    p['uc'] = (cx, yc - r * 0.55 - r)
    return p


def _ciz_alem(t, M, cx, y0, s, isik, tohum):
    p = _onbellek(('alem', cx, y0, s), lambda: _alem_yollari(cx, y0, s))
    lx, _ = _isik_birim(isik)
    sgn = 1 if lx < 0 else -1
    hepsi = p['taban'] + p['boyun'] + p['kure'] + p['halka'] + p['hilal']
    # önden arkaya: halkalar, küreler+hilal, boyun, taban
    on = p['halka']
    _lavi(t, on, M, CR['altin_koyu'], yog=0.55, kenar=0.7, islak=0.6, islak_gen=1.2, gran=0.06, akis=0.1,
          tohum=tohum + 1)
    _sakla(t, on, M, 0.4)
    gov = p['kure'] + p['hilal'] + p['taban']
    _lavi(t, gov, M, CR['altin'], yog=0.58, kenar=0.8, islak=1.0, islak_gen=1.6, gran=0.08, akis=0.18,
          tohum=tohum + 2)

    def yf(X, Y):
        return smoothstep(-0.25, 0.75, (X - cx) * sgn / (14 * s))
    _lavi(t, gov, M, CR['altin_koyu'], yog=0.42, kenar=0.8, islak=0.5, islak_gen=1.4, gran=0.08, akis=0.15,
          tohum=tohum + 3, yog_fn=yf)
    _sakla(t, gov, M, 0.4)
    _lavi(t, p['boyun'], M, CR['altin_koyu'], yog=0.55, kenar=0.6, islak=0.5, islak_gen=1.0, gran=0.06,
          akis=0.1, tohum=tohum + 4)
    _sakla(t, p['boyun'], M, 0.4)
    return hepsi, p['uc']


def _cami_geo():
    g = {}
    # --- minare ---
    mx = MINARE_X
    g['m_kaide'] = yol_dikdortgen(mx - 47, -196, mx + 47, 0)
    g['m_kaide_silme'] = yol_dikdortgen(mx - 52, -206, mx + 52, -194, 1.5)
    g['m_gecis'] = yol_cokgen([(mx - 47, -206), (mx + 47, -206), (mx + 36, -232), (mx - 36, -232)])
    g['m_govde1'] = yol_dikdortgen(mx - 35, -572, mx + 35, -230)
    g['m_govde2'] = yol_dikdortgen(mx - 29, -800, mx + 29, -606)
    g['m_govde3'] = yol_dikdortgen(mx - 24, -905, mx + 24, -830)
    sere = []
    for (y_alt, w0, w1, wr) in ((-560, 35, 58, 61), (-788, 29, 50, 53)):
        korbel = yol_cokgen([(mx - w0, y_alt + 4), (mx + w0, y_alt + 4), (mx + w1, y_alt - 24),
                             (mx - w1, y_alt - 24)])
        kat1 = yol_dikdortgen(mx - w1 * 0.86, y_alt - 14, mx + w1 * 0.86, y_alt - 10)
        zemin = yol_dikdortgen(mx - wr, y_alt - 34, mx + wr, y_alt - 22, 1.5)
        kork = yol_dikdortgen(mx - wr + 3, y_alt - 62, mx + wr - 3, y_alt - 34)
        ust = yol_dikdortgen(mx - wr, y_alt - 66, mx + wr, y_alt - 59, 1.5)
        n = 11 if wr > 55 else 9
        bos = []
        for i in range(n):
            u0 = -1 + 2 * (i + 0.28) / n
            u1 = -1 + 2 * (i + 0.72) / n
            x0 = mx + (wr - 6) * math.sin(u0 * math.pi / 2)
            x1 = mx + (wr - 6) * math.sin(u1 * math.pi / 2)
            bos.append(yol_dikdortgen(x0, y_alt - 56, x1, y_alt - 38))
        sere.append(dict(korbel=korbel, kat1=kat1, zemin=zemin, kork=kork, ust=ust, bos=bos, y=y_alt, wr=wr,
                         w0=w0))
    g['sere'] = sere
    g['m_kulah_silme'] = yol_dikdortgen(mx - 29, -916, mx + 29, -904, 1.5)
    kul = [(mx - 27, -914)]
    for i in range(1, 12):
        u = i / 12
        w = 27 * (1 - u) ** 1.12
        kul.append((mx - w, -914 - 74 * u))
    kul.append((mx, -990))
    kul += [(2 * mx - x, y) for (x, y) in reversed(kul[:-1])]
    g['m_kulah'] = yol_egri(kul, kapali=True, gerilim=0.3)
    # zikzak bant (silindir üzerinde sıkışan dişler)
    zz = []
    for j, yb in enumerate((-430, -448, -466)):
        pts = []
        n = 14
        for i in range(n + 1):
            u = -1 + 2 * i / n
            x = mx + 33 * math.sin(u * math.pi / 2)
            pts.append((x, yb + (-7 if i % 2 else 7)))
        zz.append(pts)
    g['zikzak'] = zz
    g['m_pencere'] = [_kemerli_pencere(mx, -300, 13, 34), _kemerli_pencere(mx, -680, 11, 30),
                      _kemerli_pencere(mx, -858, 9, 22), _kemerli_pencere(mx, -110, 15, 40)]
    g['m_siluet'] = [g['m_kaide'], g['m_kaide_silme'], g['m_gecis'], g['m_govde1'], g['m_govde2'], g['m_govde3'],
                     g['m_kulah_silme'], g['m_kulah']] + [s_['korbel'] for s_ in sere] + \
                    [s_['zemin'] for s_ in sere] + [s_['kork'] for s_ in sere] + [s_['ust'] for s_ in sere]
    # --- gövde ---
    x0, x1, yu = GOVDE_X0, GOVDE_X1, GOVDE_UST
    g['g_duvar'] = yol_dikdortgen(x0, yu, x1, 0)
    g['g_silme'] = yol_dikdortgen(x0 - 6, yu - 4, x1 + 6, yu + 10, 1.5)
    g['g_kaide'] = yol_dikdortgen(x0 - 4, -16, x1 + 4, 0)
    mz = []
    xw, gap = 15.0, 11.0
    x = x0 + 4
    while x + xw < x1 - 2:
        pts, _, _, _ = _kemer_pts(xw / 2, 22, 0.5, 0.0, 0.0, n=8)
        mz.append(_poly(pts + np.array([x + xw / 2, yu - 3])))
        x += xw + gap
    g['g_mazgal'] = mz
    pen = []
    for i in range(6):
        cx = -212 + i * 130
        pen.append((cx, _kemerli_pencere(cx, -44, 36, 88), yol_dikdortgen(cx - 23, -46, cx + 23, -38, 1.0)))
    g['g_pencere'] = pen
    g['g_pano'] = [yol_dikdortgen(cx - 7, -176, cx + 7, -16) for cx in [-212 + 65 + i * 130 for i in range(5)]]
    # --- kasnaklar ---
    k = KUBBE_X
    g['k1'] = yol_dikdortgen(k - K1_HW, -300, k + K1_HW, -190)
    g['k1_silme'] = yol_dikdortgen(k - K1_HW - 12, -312, k + K1_HW + 12, -298, 2)
    g['k2'] = yol_dikdortgen(k - K2_HW, -410, k + K2_HW, -310)
    g['k2_silme'] = yol_dikdortgen(k - K2_HW - 12, -424, k + K2_HW + 12, -408, 2)
    pen1, pen2 = [], []
    for i in range(13):
        ph = -math.pi / 2 + (i + 0.5) * math.pi / 13
        w = 24 * math.cos(ph) ** 0.85
        if w < 4:
            continue
        pen1.append(_kemerli_pencere(k + (K1_HW - 8) * math.sin(ph), -214, w, 60))
    for i in range(15):
        ph = -math.pi / 2 + (i + 0.5) * math.pi / 15
        w = 16 * math.cos(ph) ** 0.85
        if w < 3:
            continue
        pen2.append(_kemerli_pencere(k + (K2_HW - 7) * math.sin(ph), -330, w, 48))
    g['k1_pen'] = pen1
    g['k2_pen'] = pen2
    # --- kubbe ---
    pr = _kubbe_profil()
    sag = [(KUBBE_X + x, y) for (x, y) in pr]
    sol = [(KUBBE_X - x, y) for (x, y) in pr[::-1][1:]]
    g['kubbe'] = _poly(sag + sol)
    # kaburgalar: azimut eşit aralıklı -> kenarlara doğru sıklaşır; hafif dalgalı
    rng = np.random.default_rng(77)
    kab = []
    nk = 24
    for i in range(nk):
        ph = -math.pi / 2 + (i + 0.5) * math.pi / nk
        sn = math.sin(ph)
        if abs(sn) > 0.985:
            continue
        f1 = rng.uniform(0, 6.28)
        pts = []
        m = len(pr)
        for j in range(0, m - 6, 3):
            x, y = pr[j]
            v = (KUBBE_TABAN - y) / (KUBBE_TABAN - KUBBE_TEPE)
            dal = 1.4 * math.sin(v * 9.0 + f1) * (1 - v)
            pts.append((KUBBE_X + x * sn + dal, y))
        kab.append(pts)
    g['kaburga'] = kab
    g['kubbe_x'] = KUBBE_X
    return g


def ciz_kubbe_cami(t: Tuval, M, isik=(-0.6, -0.8), nur=0.0, tohum=0, sakla_sonra=True):
    g = _onbellek(('cami',), _cami_geo)
    lx, ly = _isik_birim(isik)
    sgn = 1 if lx < 0 else -1
    T0 = 3000 + tohum * 50
    kx = KUBBE_X
    mx = MINARE_X
    siluet = []
    # ---------------- 1) minare alemi ----------------
    alem_m, uc_m = _ciz_alem(t, M, mx, -988, 0.52, isik, T0 + 1)
    siluet += alem_m
    # ---------------- 2) minare: şerefeler (önde), gövde, külah, kaide ----------------
    for j, s_ in enumerate(g['sere']):
        y, wr = s_['y'], s_['wr']
        # korkuluk boşlukları (gölgeli), üst küpeşte, korkuluk, zemin, kornişin gölgeli katları
        _lavi(t, s_['bos'], M, CR['tas_golge'], yog=0.55, kenar=0.6, islak=0.6, islak_gen=1.0, gran=0.06,
              akis=0.12, tohum=T0 + 10 + j)
        _sakla(t, s_['bos'], M, 0.4)

        def yfk(X, Y, wr=wr):
            return 0.15 + 0.85 * smoothstep(-0.3, 1.0, (X - mx) * sgn / wr)
        _lavi(t, [s_['ust'], s_['kork'], s_['zemin']], M, CR['tas_golge'], yog=0.30, kenar=0.7, islak=0.8,
              islak_gen=1.4, gran=0.08, akis=0.15, tohum=T0 + 12 + j, yog_fn=yfk)
        _lavi(t, yol_dikdortgen(mx - wr, y - 27, mx + wr, y - 22), M, CR['tas_golge'], yog=0.35, kenar=0.6,
              islak=0.4, islak_gen=1.0, gran=0.06, akis=0.1, tohum=T0 + 14 + j)
        _sakla(t, [s_['ust'], s_['kork'], s_['zemin']], M, 0.4)
        _lavi(t, s_['korbel'], M, CR['tas_golge'], yog=0.42, kenar=0.7, islak=0.8, islak_gen=1.4, gran=0.08,
              akis=0.15, tohum=T0 + 16 + j, yog_fn=lambda X, Y, y=y: 0.55 + 0.45 * smoothstep(y - 24, y + 4, Y))
        _lavi(t, s_['kat1'], M, CR['tas_golge'], yog=0.30, kenar=0.6, islak=0.4, islak_gen=1.0, gran=0.06,
              akis=0.1, tohum=T0 + 18 + j)
        _sakla(t, s_['korbel'], M, 0.4)
    # külah (yeşil, konik)
    _lavi(t, g['m_kulah'], M, CR['kulah'], yog=0.55, kenar=0.8, islak=1.0, islak_gen=1.8, gran=0.10, akis=0.2,
          tohum=T0 + 20)
    _lavi(t, g['m_kulah'], M, CR['yesil_koyu'], yog=0.45, kenar=0.8, islak=0.5, islak_gen=1.6, gran=0.10,
          akis=0.2, tohum=T0 + 21, yog_fn=lambda X, Y: smoothstep(-0.2, 0.8, (X - mx) * sgn / 27.0))
    _sakla(t, g['m_kulah'], M, 0.4)
    _lavi(t, yol_dikdortgen(mx - 29, -909, mx + 29, -904), M, CR['tas_golge'], yog=0.4, kenar=0.6, islak=0.4,
          islak_gen=1.0, gran=0.06, akis=0.1, tohum=T0 + 22)
    _sakla(t, g['m_kulah_silme'], M, 0.4)
    # pencereler ve zikzak
    _lavi(t, g['m_pencere'], M, CR['pencere'], yog=0.62, kenar=0.7, islak=0.9, islak_gen=1.2, gran=0.08,
          akis=0.15, tohum=T0 + 23, yog_fn=lambda X, Y: 1.0 + 0.0 * X)
    _sakla(t, g['m_pencere'], M, 0.4)
    zz = _cizgiler(g['zikzak'])
    _lavi(t, zz, M, CR['zikzak'], yog=0.55, cizgi=_cz(M, 3.0), kenar=0.6, islak=0.5, islak_gen=1.0, gran=0.08,
          akis=0.15, tohum=T0 + 24)
    # gövde: kâğıt beyazı taş; ışıktan uzak yanda silindir gölgesi; şerefelerin düşen gölgesi
    govde = [g['m_govde1'], g['m_govde2'], g['m_govde3'], g['m_gecis'], g['m_kaide_silme'], g['m_kaide']]

    def yfg(X, Y):
        hw = np.where(Y > -206, 47.0, np.where(Y > -572, 35.0, np.where(Y > -606, 35.0,
                                                                          np.where(Y > -805, 29.0, 24.0))))
        lam = _silindir_lambert(X, mx, hw, isik)
        v = smoothstep(0.62, 0.05, lam)
        # şerefe altlarındaki düşen gölge bantları
        for (yb, h_) in ((-560, 46), (-788, 40), (-905, 22), (-194, 14)):
            v = np.maximum(v, 0.85 * (1 - smoothstep(yb + h_ * 0.4, yb + h_, Y)) * (Y > yb))
        return 0.08 + v
    _lavi(t, govde, M, CR['tas_golge'], yog=0.40, kenar=0.8, islak=0.8, islak_gen=1.8, gran=0.10, akis=0.2,
          tohum=T0 + 25, yog_fn=yfg)
    _lavi(t, yol_dikdortgen(mx - 52, -199, mx + 52, -194), M, CR['tas_golge'], yog=0.35, kenar=0.6, islak=0.4,
          islak_gen=1.0, gran=0.06, akis=0.1, tohum=T0 + 26)
    _sakla(t, g['m_siluet'], M, 0.5)
    siluet += g['m_siluet']
    # ---------------- 3) kubbe alemi ----------------
    alem_k, uc_k = _ciz_alem(t, M, kx, KUBBE_TEPE + 6, 1.0, isik, T0 + 30)
    siluet += alem_k
    # ---------------- 4) gövde: mazgallar, silme, pencereler, duvar ----------------
    _lavi(t, g['g_mazgal'], M, CR['tas_golge'], yog=0.16, kenar=0.6, islak=1.0, islak_gen=1.2, gran=0.06,
          akis=0.1, tohum=T0 + 40, yog_fn=lambda X, Y: 0.6 + 0.8 * smoothstep(-200, 450, X * sgn))
    _sakla(t, g['g_mazgal'], M, 0.4)
    _lavi(t, yol_dikdortgen(GOVDE_X0 - 6, GOVDE_UST + 4, GOVDE_X1 + 6, GOVDE_UST + 10), M, CR['tas_golge'],
          yog=0.32, kenar=0.6, islak=0.4, islak_gen=1.0, gran=0.06, akis=0.1, tohum=T0 + 41)
    _sakla(t, g['g_silme'], M, 0.4)
    pen = [p for (_, p, _) in g['g_pencere']]
    esik = [e for (_, _, e) in g['g_pencere']]
    _lavi(t, esik, M, CR['tas_golge'], yog=0.30, kenar=0.6, islak=0.5, islak_gen=1.0, gran=0.06, akis=0.1,
          tohum=T0 + 42)
    _sakla(t, esik, M, 0.4)

    def yfp(X, Y):
        return 0.78 + 0.32 * smoothstep(-42, -124, Y)
    _lavi(t, pen, M, CR['pencere'], yog=0.62, kenar=0.8, islak=1.0, islak_gen=1.6, gran=0.10, akis=0.2,
          tohum=T0 + 43, yog_fn=yfp)
    # pencerenin ışıklı yanında açık ton (camda yansıma hissi)
    _lavi(t, [yol_op(p, _kaydir(p, sgn * 7, 0), 'fark') for p in pen], M, CR['pencere_acik'], yog=0.18,
          kenar=0.6, islak=0.0, gran=0.06, akis=0.1, tohum=T0 + 44)
    _sakla(t, pen, M, 0.4)
    # duvar: kâğıt beyazı; minarenin düşen gölgesi, silmenin altı, ışıktan uzak uca doğru sır, kaide
    dx, dy = _golge_d(isik, 26.0)
    m_gol = yol_op(yol_op(_kaydir(g['m_kaide'], dx * 1.6, dy * 0.3), g['m_kaide'], 'fark'), g['g_duvar'], 'kesisim')

    def yfd(X, Y):
        u = (X - GOVDE_X0) / (GOVDE_X1 - GOVDE_X0)
        u = u if sgn > 0 else 1 - u
        return 0.10 + 0.55 * smoothstep(0.55, 1.05, u) + 0.35 * (1 - smoothstep(GOVDE_UST + 10, GOVDE_UST + 40, Y))
    _lavi(t, g['g_duvar'], M, CR['tas_golge'], yog=0.30, kenar=0.9, islak=0.9, islak_gen=2.0, gran=0.12,
          akis=0.22, tohum=T0 + 45, yog_fn=yfd)
    pil_g = [yol_op(_kaydir(p, sgn * 5.0, 0), p, 'fark') for p in g['g_pano']]
    _lavi(t, [m_gol], M, CR['tas_golge'], yog=0.30, kenar=0.7, islak=0.5, islak_gen=1.4, gran=0.1,
          akis=0.15, tohum=T0 + 46)
    _lavi(t, pil_g, M, CR['tas_golge'], yog=0.17, kenar=0.7, islak=0.4, islak_gen=1.2, gran=0.1, akis=0.15,
          tohum=T0 + 48)
    _lavi(t, g['g_kaide'], M, CR['kaide'], yog=0.40, kenar=0.7, islak=0.6, islak_gen=1.4, gran=0.12, akis=0.15,
          tohum=T0 + 47)
    _sakla(t, [g['g_duvar'], g['g_kaide']], M, 0.5)
    siluet += [g['g_duvar'], g['g_silme'], g['g_kaide']] + g['g_mazgal']
    # ---------------- 5) kasnaklar ----------------
    for (sil, kas, pens, hw, th) in ((g['k2_silme'], g['k2'], g['k2_pen'], K2_HW, 50),
                                     (g['k1_silme'], g['k1'], g['k1_pen'], K1_HW, 60)):
        # silme (beyaz taş) ve altındaki gölge
        b = sil.computeTightBounds()
        _lavi(t, sil, M, CR['tas_golge'], yog=0.20, kenar=0.6, islak=0.8, islak_gen=1.2, gran=0.06, akis=0.1,
              tohum=T0 + th, yog_fn=lambda X, Y, hw=hw: 0.3 + 0.9 * smoothstep(0.6, 0.0, _silindir_lambert(
                  X, kx, hw + 11, isik)))
        _sakla(t, sil, M, 0.4)
        _lavi(t, yol_dikdortgen(b.left() + 8, b.bottom(), b.right() - 8, b.bottom() + 7), M, CR['yesil_koyu'],
              yog=0.38, kenar=0.7, islak=0.4, islak_gen=1.0, gran=0.08, akis=0.1, tohum=T0 + th + 1)
        _lavi(t, pens, M, CR['pencere_yesil'], yog=0.70, kenar=0.7, islak=0.9, islak_gen=1.2, gran=0.08,
              akis=0.15, tohum=T0 + th + 2)
        _sakla(t, pens, M, 0.4)
        _lavi(t, kas, M, CR['yesil_kasnak'], yog=0.60, kenar=0.9, islak=1.0, islak_gen=2.0, gran=0.12,
              akis=0.22, tohum=T0 + th + 3)
        _lavi(t, kas, M, CR['yesil_koyu'], yog=0.50, kenar=0.9, islak=0.5, islak_gen=1.8, gran=0.12, akis=0.22,
              tohum=T0 + th + 4, yog_fn=lambda X, Y, hw=hw: smoothstep(0.7, 0.05, _silindir_lambert(X, kx, hw, isik)))
        _sakla(t, kas, M, 0.5)
    siluet += [g['k1'], g['k1_silme'], g['k2'], g['k2_silme']]
    # ---------------- 6) kubbe: açık ilk lavi (parıltı kâğıtta), gölge yanında koyu ikinci sır, kaburgalar ----
    def yf1(X, Y):
        lam = _kubbe_lambert(X, Y, isik)
        return 1.0 - 0.55 * smoothstep(0.80, 0.97, lam)

    def yf2(X, Y):
        lam = _kubbe_lambert(X, Y, isik)
        return smoothstep(0.72, 0.18, lam)
    _lavi(t, g['kubbe'], M, CR['yesil'], yog=0.62, kenar=1.0, islak=1.1, islak_gen=2.6, gran=0.13, akis=0.25,
          tohum=T0 + 70, yog_fn=yf1)
    _lavi(t, g['kubbe'], M, CR['yesil_koyu'], yog=0.55, kenar=1.0, islak=0.6, islak_gen=2.4, gran=0.13,
          akis=0.25, tohum=T0 + 71, yog_fn=yf2)
    _lavi(t, _cizgiler(g['kaburga']), M, CR['kaburga'], yog=0.60, cizgi=_cz(M, 2.0, us=0.55, en_az=0.9),
          kenar=0.5, islak=0.0, gran=0.08, akis=0.15, tohum=T0 + 72, esik=False)
    _sakla(t, g['kubbe'], M, 0.5)
    siluet.append(g['kubbe'])
    # ---------------- 7) silüet, nur ----------------
    if sakla_sonra:
        _sakla(t, siluet, M, 0.6)
    if nur > 0.001:
        _ciz_nur(t, M, nur, siluet, tohum)
    yerel = {'kubbe_tepe': (kx, KUBBE_TEPE), 'alem_ucu': (float(uc_k[0]), float(uc_k[1])),
             'minare_ucu': (mx, -990.0), 'minare_alem_ucu': (float(uc_m[0]), float(uc_m[1])),
             'kubbe_merkez': (kx, KUBBE_TABAN), 'zemin_sol': (GOVDE_X0, 0.0), 'zemin_sag': (GOVDE_X1, 0.0)}
    out = {k_: _ekran(M, v) for k_, v in yerel.items()}
    out['yerel'] = yerel
    return out


def _ciz_nur(t, M, nur, siluet, tohum):
    """Caminin çevresinde ölçülü sıcak ışık. Silüeti saran yumuşak bir hale: (1) halede çok açık sıcak sır (camiye
    değmez), (2) aynı halede kısmi saklama — sonra boyanacak gök orada daha az boyanır, cami ışık saçar gibi görünür,
    (3) taşta ve kubbede çok ince ılık sır."""
    s = max(_olc(M), 1e-6)
    R = 150.0 * s                      # hale yarıçapı (px)
    k = yollar_kirp(siluet, M, 3 * R)
    if k.bos():
        return
    q = 4
    m = maske_ciz(siluet, M, k)
    sm = cv2.resize(m, (max(1, k.w // q), max(1, k.h // q)), interpolation=cv2.INTER_AREA)
    sm = cv2.GaussianBlur(sm, (0, 0), max(1.0, R / q / 1.6))
    sm = sm / (sm.max() + 1e-6)
    hale = cv2.resize(sm, (k.w, k.h), interpolation=cv2.INTER_LINEAR)
    hale = np.clip(hale * 1.25, 0, 1) ** 0.8
    # zemin çizgisinin (yerel y = 0) altına taşmasın
    Mi = np.linalg.inv(M)
    _, Yl = Tuval._yerel_izgara(Mi, k)
    hale = hale * (1.0 - m) * smoothstep(-10.0, -140.0, Yl)
    # (1) sıcak sır (saklamaya uyar: caminin kendisine değmez)
    _lavi(t, siluet, M, '#F2CF98', yog=0.40 * nur, kenar=1.0, islak=0.0, gran=0.05, akis=0.25, tohum=tohum + 3900,
          maske=(k, np.clip(hale * 1.1, 0, 1).astype(np.float32)), esik=False)
    # (3) taşta ılık parıltı
    _lavi(t, siluet, M, '#F6DEB0', yog=0.14 * nur, kenar=0.8, islak=0.0, gran=0.04, akis=0.2, tohum=tohum + 3901,
          sakla=False)
    # (2) kısmi yumuşak saklama
    t.sakla_ekle(siluet, M, yumusak=0.0, maske=(k, (hale * 0.72 * nur).astype(np.float32)))


# =================================================================================================================
# 3) SECCADE
# =================================================================================================================
SR = dict(zemin='#B45562', zemin_koyu='#963F50', bordur='#874052', kosebent='#8D3B4E', krem='#EEDDC2',
          krem_koyu='#D9C2A0', saçak='#EADBC0', golge='#A49DB9', kalinlik='#7A3446')


def _seccade_yollari(L, Wd, yon, egim, sx_ince, tohum):
    """Seccade desenleri seccade düzleminde (u: boy, w: en; w + arka). sx_ince: ekranda ince çizginin yerel
    kalınlığı (u yönünde); w yönündeki bantlar egim'e bölünerek aynı ekran kalınlığına getirilir."""
    rng = np.random.default_rng(tohum)
    hu, hw = L / 2.0, Wd / 2.0
    tw = sx_ince / max(egim, 1e-3)       # w yönünde ince bant
    tu = sx_ince
    p = {}
    p['govde'] = yol_dikdortgen(-hu, -hw, hu, hw)
    b = 0.11 * Wd                         # bordür genişliği (w ve u'da aynı gerçek ölçü)
    bu = b * 1.15
    p['alan'] = yol_dikdortgen(-hu + bu, -hw + b, hu - bu, hw - b)

    def cerceve(du, dw, ku, kw):
        dis = yol_dikdortgen(-hu + du, -hw + dw, hu - du, hw - dw)
        ic = yol_dikdortgen(-hu + du + ku, -hw + dw + kw, hu - du - ku, hw - dw - kw)
        return yol_op(dis, ic, 'fark')
    # krem bekçi çizgileri: dış kenara yakın ve alanın çevresinde
    p['cizgi'] = [cerceve(bu * 0.22, b * 0.22, tu, tw), cerceve(bu - tu * 0.5, b - tw * 0.5, tu * 1.2, tw * 1.2)]
    # bordürde küçük baklava dizisi (uçlarda belirgin, uzun kenarlarda ince noktalar)
    bak = []
    for s_ in (-1, 1):
        uc = s_ * (hu - bu * 0.6)
        n = 6
        for i in range(n):
            wc = -hw + b + (Wd - 2 * b) * (i + 0.5) / n
            r_u, r_w = bu * 0.22, (Wd - 2 * b) / n * 0.32
            bak.append(yol_cokgen([(uc - r_u, wc), (uc, wc - r_w), (uc + r_u, wc), (uc, wc + r_w)]))
    for s_ in (-1, 1):
        wc = s_ * (hw - b * 0.6)
        n = int(L / 34)
        for i in range(n):
            uc = -hu + bu + (L - 2 * bu) * (i + 0.5) / n
            bak.append(yol_elips(uc, wc, tu * 1.6, tw * 0.9))
    p['baklava'] = bak
    # mihrap: iki merkezli sivri kemerli niş; yanlar u boyunca, tepe baş ucunda (u küçük)
    au0 = -hu + bu + 0.07 * L             # kemer tepesi (baş ucu)
    au1 = hu - bu - 0.05 * L              # nişin ayak ucu
    aw = (hw - b) * 0.66                  # niş yarı eni (w)
    hn = au1 - au0

    def nis(a_, h_, kay_u=0.0):
        pts, ys_, _, _ = _kemer_pts(a_, h_, 0.5, 0.0, 0.0, n=30)
        return [(au1 - kay_u + y_, x_) for (x_, y_) in pts], ys_
    dis_pts, ys_ = nis(aw, hn)
    ic_pts, _ = nis(aw - tw * 1.5, hn - tu * 1.5)
    kemer = yol_cokgen(dis_pts)
    p['kemer_cizgi'] = yol_op(kemer, yol_cokgen(ic_pts), 'fark')
    p['kemer'] = kemer
    yay_boy = -ys_                        # kemer yayının u boyu (niş yanlarının bittiği yer: au1 + ys_)
    yay_boy = hn + ys_
    p['kosebent'] = yol_op(yol_dikdortgen(-hu + bu, -hw + b, au0 + yay_boy + 6, hw - b), kemer, 'fark')
    # kandil (küçük asılı lamba motifi) ve ayak ucunda küçük baklava
    kc = au0 + yay_boy * 0.78
    p['kandil'] = [yol_cokgen([(kc - tu * 5.5, 0), (kc, -aw * 0.24), (kc + tu * 7, 0), (kc, aw * 0.24)]),
                   yol_dikdortgen(au0 + tu * 3, -tw * 0.45, kc - tu * 5.5, tw * 0.45)]
    # saçaklar (iki uçta): dışa doğru tırtıklı krem bant + birkaç iplik
    sac = []
    ip = []
    m = 15
    for s_ in (-1, 1):
        x0 = s_ * hu
        pts = [(x0, -hw)]
        for i in range(m + 1):
            wv = -hw + Wd * i / m
            ln = 15.0 * rng.uniform(0.75, 1.1)
            pts.append((x0 + s_ * ln, wv + rng.uniform(-0.3, 0.3) * Wd / m))
        pts.append((x0, hw))
        sac.append(yol_cokgen(pts))
        for i in range(m):
            wv = -hw + Wd * (i + 0.5) / m
            ln = 14.0 * rng.uniform(0.8, 1.1)
            ip.append(yol_dikdortgen(min(x0, x0 + s_ * ln), wv - tw * 0.35, max(x0, x0 + s_ * ln), wv + tw * 0.35))
    p['sacak'] = sac
    p['iplik'] = ip
    if yon > 0:
        F = M_olcek(-1, 1)
        for k_ in list(p.keys()):
            v = p[k_]
            p[k_] = [yol_donustur(q, F) for q in v] if isinstance(v, list) else yol_donustur(v, F)
    return p


def ciz_seccade(t: Tuval, M, uzunluk=420, egim=0.18, tohum=0, yon=-1, kayma=0.35, genislik_orani=0.62,
                sakla_sonra=True):
    L = float(uzunluk)
    Wd = L * genislik_orani
    eg = max(0.04, float(egim))
    P = np.array([[1.0, kayma * eg, 0.0], [0.0, -eg, 0.0], [0.0, 0.0, 1.0]])
    Mr = M @ P
    sx = _cz(M, 1.7, us=0.6, en_az=0.8)
    p = _onbellek(('seccade', L, Wd, yon, round(eg, 4), round(sx, 3), tohum),
                  lambda: _seccade_yollari(L, Wd, yon, eg, sx, tohum))
    T0 = 5000 + tohum * 20
    hu, hw = L / 2, Wd / 2
    # 1) saçaklar (krem, ipliksi)
    _lavi(t, p['iplik'], Mr, SR['krem_koyu'], yog=0.40, kenar=0.6, islak=0.3, islak_gen=1.0, gran=0.08, akis=0.1,
          tohum=T0 + 1)
    _lavi(t, p['sacak'], Mr, SR['saçak'], yog=0.30, kenar=0.7, islak=0.7, islak_gen=1.2, gran=0.08, akis=0.15,
          tohum=T0 + 2)
    _sakla(t, p['sacak'], Mr, 0.4)
    # 2) krem çizgiler ve motifler (kâğıt + ılık krem): sonra saklama -> kırmızılar etrafından dolaşır
    krem = p['cizgi'] + [p['kemer_cizgi']] + p['baklava'] + p['kandil']
    _lavi(t, krem, Mr, SR['krem'], yog=0.32, kenar=0.6, islak=0.5, islak_gen=1.0, gran=0.08, akis=0.12,
          tohum=T0 + 3)
    _sakla(t, krem, Mr, 0.35)
    # 3) köşebentler (koyu), alan, bordür

    def yf(X, Y):  # Mr-yerelinde (u, w): ışık yanına doğru hafif açık
        return 0.88 + 0.22 * smoothstep(-hu, hu, X * (-yon))
    _lavi(t, p['kosebent'], Mr, SR['kosebent'], yog=0.42, kenar=0.8, islak=0.8, islak_gen=1.4, gran=0.12,
          akis=0.2, tohum=T0 + 4)
    _lavi(t, p['alan'], Mr, SR['zemin'], yog=0.60, kenar=0.9, islak=0.9, islak_gen=1.8, gran=0.14, akis=0.25,
          tohum=T0 + 5, yog_fn=yf)
    _sakla(t, p['alan'], Mr, 0.4)
    _lavi(t, p['govde'], Mr, SR['bordur'], yog=0.62, kenar=0.9, islak=1.0, islak_gen=1.8, gran=0.14, akis=0.25,
          tohum=T0 + 6, yog_fn=yf)
    _sakla(t, p['govde'], Mr, 0.4)
    # 4) ön kenarın kalınlığı (ekranda 2-3 px) ve zemine düşen yumuşak gölge
    s = max(_olc(M), 1e-6)
    kal = max(2.2, 3.2 * s ** 0.6) / s
    fx0, fx1 = -hu + kayma * eg * (-hw), hu + kayma * eg * (-hw)
    y_on = hw * eg
    kalin = yol_cokgen([(fx0, y_on - 0.3), (fx1, y_on - 0.3), (fx1 + 0.5, y_on + kal), (fx0 - 0.5, y_on + kal)])
    _lavi(t, kalin, M, SR['kalinlik'], yog=0.55, kenar=0.6, islak=0.4, islak_gen=1.0, gran=0.1, akis=0.15,
          tohum=T0 + 7)
    _sakla(t, kalin, M, 0.4)
    gol = yol_egri([(fx0 - 14, y_on), (fx1 + 18, y_on), (fx1 + 10, y_on + kal + 7), (0, y_on + kal + 10),
                    (fx0 - 6, y_on + kal + 6)], kapali=True, gerilim=0.4)
    _lavi(t, gol, M, SR['golge'], yog=0.30, kenar=1.6, islak=0.2, islak_gen=2.0, gran=0.1, akis=0.2,
          tohum=T0 + 8)
    if sakla_sonra:
        _sakla(t, [p['govde']] + p['sacak'], Mr, 0.5)
        _sakla(t, kalin, M, 0.5)
    yerel = {'on_sol': (fx0, y_on), 'on_sag': (fx1, y_on), 'arka_sol': (-hu + kayma * eg * hw, -hw * eg),
             'arka_sag': (hu + kayma * eg * hw, -hw * eg), 'merkez': (0.0, 0.0)}
    au0 = (-hu + 0.11 * Wd * 1.15 + 0.07 * L) * (1 if yon < 0 else -1)
    yerel['mihrap'] = (au0, 0.0)
    out = {k_: _ekran(M, v) for k_, v in yerel.items()}
    out['yerel'] = yerel
    return out
