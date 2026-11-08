# Atölye: grafik, tasarım ve sanat stüdyosu

Burada **render stilleri** (art style) araştırılır, sıfırdan yenileri üretilir ve her biri bir **numara** ve
**adla** kataloğa girer. Her stilin bir **örnek görseli** vardır; örneklerin hepsi aynı sahneyi çizer
(Yeşil Kubbe, minare ve çiçekler, bkz. [`sahne/SAHNE.md`](sahne/SAHNE.md)). Böylece stiller yan yana
konunca fark yalnızca stilden gelir.

- Katalog: [`KATALOG.md`](KATALOG.md) (görselli liste), [`katalog.json`](katalog.json) (makine için)
- Galeri: [`galeri.html`](galeri.html) (tarayıcıda açın)
- Bütün örnekler tek sayfada: [`pafta.webp`](pafta.webp)

Görseller yapay zekâ görsel üreticisiyle değil, **kodla çizilir** (SVG / Canvas). Her örnek gerçek bir
tarayıcıda açılıp 1024 × 1024 görüntüye çevrilir.

## Numaralandırma

- Her stilin kodu `S-` ve üç haneli sıra numarasıdır: `S-001`, `S-002`, … Numara bir kez verilir ve
  değişmez; yeni stiller sıradaki numarayı alır, ailesi ne olursa olsun.
- Klasör adı: `S-001-suluboya` (kod + Türkçe karaktersiz kısa ad).
- `ozgun: true` olan stiller atölyenin tanımladığı **render üsluplarıdır**: yeni bir sanat akımı ya da
  kavram değil; çizgi, dolgu, gölgelendirme, ışık, doku ve palet kararlarından oluşan bir görüntü tarifi.
- Tek istisna: S-031–S-040 ilk turda kavramsal "özgün stiller" idi; beğenilmediği için kaldırıldı ve bu
  numaralar render üsluplarına verildi (eski hâlleri git geçmişinde).

## Aileler

| Aile | Numaralar |
| --- | --- |
| Boya ve Kuru Teknikler | S-001 – S-006, S-041 – S-120 |
| Türk-İslam Sanatları | S-007 – S-013 |
| Uzak Doğu | S-014 – S-015 |
| Sanat Akımları | S-016 – S-021 |
| Grafik ve Dijital | S-022 – S-030 |
| Atölye Render Üslupları | S-031 – S-040 |

Aile `stil.json` içinde yazar; galeri ve katalog stilleri ailelerine göre gruplar.

## Klasör yapısı

```
atolye/
  sahne/            Ortak sahne: sahne.js (geometri, yardımcılar), SAHNE.md, başvuru çizimleri
  sablon/           Yeni stil için başlangıç şablonu (ornek.html)
  stiller/
    S-001-suluboya/
      ornek.html    Örnek görselin kaynağı (kodla çizim; ../../sahne/sahne.js kullanır)
      ornek.webp    Çizim aracının ürettiği 1024 × 1024 örnek görsel
      stil.json     Stilin kimlik kartı (aşağıda)
  araclar/
    ciz.mjs         ornek.html → ornek.webp (Playwright + Chromium)
    webp.py         PNG → WebP (kayıpsız / kayıplı, küçük olanı)
    katalog.mjs     stil.json'lardan KATALOG.md, katalog.json ve galeri.html üretir
    pafta.py        bütün örnekleri tek bir paftada toplar (pafta.webp)
```

## Yeni stil ekleme

1. Sıradaki numarayla klasör açın: `stiller/S-081-kisa-ad/`; `sablon/ornek.html` dosyasını kopyalayın.
2. Çizimi yazın: aynı sahne, aynı yerleşim (bkz. `sahne/SAHNE.md`). Rastgelelik için `SAHNE.rng(tohum)`;
   dış kaynak (internet, yazı tipi, resim dosyası) yok; çizim bitince `SAHNE.hazir()`.
3. Görseli üretin: `node atolye/araclar/ciz.mjs atolye/stiller/S-081-kisa-ad`
   (bakmak için PNG'si `atolye/.onizleme/` klasörüne de yazılır).
4. `stil.json` kimlik kartını doldurun.
5. Kataloğu yenileyin: `node atolye/araclar/katalog.mjs && python3 atolye/araclar/pafta.py`

Bütün örnekleri yeniden çizmek için: `node atolye/araclar/ciz.mjs --hepsi`

## `stil.json` kimlik kartı

```json
{
  "kod": "S-001",
  "no": 1,
  "ad": "Suluboya",
  "ad_en": "Watercolor",
  "aile": "Boya ve Kuru Teknikler",
  "ozgun": false,
  "ozet": "Saydam, üst üste binen boya katmanları ve kâğıdın beyazı.",
  "tanim": "2–4 cümle: stil nedir, nasıl görünür, nerede kullanılır.",
  "koken": "Bilinen stillerde tarihçe ve örnek ustalar; render üsluplarında dayandığı teknikler ve tarifin özü.",
  "ayirt_edici": ["Görselde gerçekten görülen 4–6 ayırt edici özellik"],
  "palet": ["#2F7D3B", "#C9A23A", "…örnek görselde kullanılan 4–8 renk"],
  "kodla_cizim": "Örnek görselin kodla nasıl çizildiği (teknik özet).",
  "etiketler": ["doku", "geleneksel", "…"]
}
```

## Üslup ilkeleri (müşteri geri bildirimiyle)

Atölyenin örnekleri müşterinin açıkça belirttiği zevke göre çizilir:

- **En sevilenler:** S-079 Yırtık Kâğıt Kolaj, S-075 Pochoir, S-061 Kalem ve Lavi, S-049 Kuru Fırça,
  S-050 Sünger Boyama, S-001 Suluboya, S-002 Yağlıboya. Ortak yanları: aydınlık gün ışığı, açık ve canlı
  renkler, temiz yüzeyler, belirgin el yapımı doku, sahnenin bütün tuvali doldurması.
- **Aydınlık:** koyu zemin, siyah kâğıt, gece göğü, ağır karanlık (chiaroscuro) ve koyu kenar gölgesi yok;
  görselin geneli açık tonlarda kalır.
- **Bozukluk efekti yok:** sıva dökülmesi, çatlak, kraklör, batik çatlak damarı, hücre/kabarcık, sıçrama,
  akıntı, çizik, leke, eskime, kir kullanılmaz. Doku tekniğin kendisinden gelir.
- **Taşıyıcı görünmez:** eser 1024 × 1024 tuvali kenardan kenara doldurur; masa, keten, duvar şeridi ya da
  yuvarlak bir nesnenin arkasındaki zemin görünmez. Esere ait ince bir çerçeve çizgisi olabilir.

## Kurallar

- Konu saygıyla çizilir: karikatür, şaka, çarpıtma yok; insan ya da hayvan figürü yok; hat ya da
  yazı taklidi yok (teknik çizimdeki gibi düz Türkçe etiketler hariç).
- Örnek, stilin ustaca yapılmış bir numunesi gibi görünmelidir; başvuru çiziminin üstüne geçirilmiş bir
  süzgeç gibi değil.
- Örnekler renklidir: doğası tek renkli olan teknikler (karakalem, gravür, mürekkep) de tekniğin gerçek
  renkli biçimiyle (renkli grafit, elle renklendirme, renkli lavi…) çizilir.
