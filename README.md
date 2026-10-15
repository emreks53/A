# İdealist GYO kurumsal sitesi

İdealist Gayrimenkul Yatırım Ortaklığı A.Ş. (IDGYO) için yeniden tasarlanan iki dilli (TR `/`, EN `/en/`) kurumsal site.
Yayın: Cloudflare Pages, proje `idealistgyo` → https://idealistgyo.pages.dev (alan adı geçişi bekliyor: www.idealistgyo.com).

## Önemli: 15.10.2026 kurtarması

Site ilk olarak Astro 7 + Tailwind 4 ile kaynak koddan derleniyordu. Geliştirme ortamı (bulut konteyneri) silindi ve
GitHub'a gönderim izni olmadığı için (403) kaynak kod ve eski siteden içerik üreten betikler kayboldu. Yayındaki site
etkilenmedi. Kurtarma şöyle yapıldı:

- **site/**: Yayındaki sitenin birebir kopyası (tüm sayfalar, görseller, yazı tipleri, belgeler) canlıdan indirildi;
  ilk kurtarma commit'i yayınla bayt bayt aynıdır (`araclar/dogrula.py` ile doğrulanır). 25 MB üstü 4 izahname PDF'i
  R2'de durduğu için klasörde yoktur.
- **functions/** ve **panel/**: Sunucu kodu. `belgeler/[[path]].ts` ve `api/iletisim.ts` oturum kaydından birebir
  kurtarıldı; ara katman (`_middleware.ts`) ve yönetim paneli API'si (`api/yonetim/[[yol]].ts`, `panel/ortak.ts`)
  üretimdeki D1 şeması, yayındaki şablonlar ve mimari notlarına göre yeniden yazıldı. Panel arayüzü
  `araclar/panel-sayfasi/` altındaki parçalardan `site/yonetim/panel/index.html` olarak üretilir.
- **panel/yonlendirmeler.json**: Eski site adreslerinin (tr.php?…, download.php?…, /dosyalar/…) yeni adreslere 301
  haritası; eski site gezilip canlı sitedeki yönlendirmeler okunarak yeniden çıkarıldı (1994 adres).
- Notlar: `icerik-notlari.md` (05.10.2026 tam sürümü kurtarıldı), `onay-bekleyen-metinler.md` (kısmi).

Artık site derleyiciyle değil, **yayın dosyalarının kendisi üzerinden** yönetiliyor. Astro kaynak kodu yok;
Tailwind sınıfları sayfalara gömülü CSS'te hazır durur, yeni stiller elle eklenen küçük CSS bloklarıyla yapılır.

## Klasörler

| Yol | İçerik |
|-----|--------|
| `site/` | Yayınlanan dosyalar (Pages çıktı klasörü). `_headers` ve `_routes.json` burada. |
| `functions/` | Cloudflare Pages Functions: ara katman, iletişim formu, belge sunumu (R2 yedekli), panel API'si |
| `panel/` | Panel ortak sunucu kodu, D1 şeması (`sema.sql`), eski adres yönlendirme haritası |
| `araclar/duzenle.py` | `site/` dosyalarında güvenli toplu düzenleme yardımcıları (eşleşme sayısı denetimli) |
| `araclar/degisiklikler/` | Her değişiklik bir betik olarak (tarihli); ne yapıldığı ve neden betiğin başında yazılı |
| `araclar/panel-sayfasi/` | Yönetim paneli sayfasının parçaları ve üreticisi (`olustur.py`) |
| `araclar/yonlendirme-haritasi.py` | Eski site → yeni site 301 haritasını yeniden üretir |
| `araclar/dogrula.py` | Yayındaki site ile `site/` klasörünü dosya dosya karşılaştırır |
| `araclar/yayinla.sh` | Yayın (Cloudflare Pages) |
| `wrangler.toml` | Pages yapılandırması: değişkenler, R2 (`BELGELER`) ve D1 (`DB`) bağları |

## Değişiklik yapmak

1. `araclar/degisiklikler/YYYY-AA-GG-kisa-ad.py` olarak bir betik yazın; `araclar/duzenle.py` içindeki
   `degistir()` / `degistir_re()` ile metinleri değiştirin (beklenen eşleşme sayısı tutmazsa betik durur).
   Betik yarıda durursa `git checkout -- site` ile geri alın, düzeltip yeniden çalıştırın.
2. Tüm sayfalarda ortak olan parçalar (menü, alt bilgi, CSS) her HTML dosyasında ayrı ayrı bulunur;
   `degistir('**/*.html', eski, yeni, dosya_basina=None, toplam=N)` ile hepsinde birden değiştirilir.
   Gömülü CSS yalnızca 4 çeşittir (içerik sayfaları, haber sayfaları, ana sayfa, panel girişi).
3. Yerelde deneme: `npm install` sonra `npm run dev` → http://127.0.0.1:8788 (D1/R2 yerel taklit;
   ilk seferde `npx wrangler d1 execute idealist-panel --local --file panel/sema.sql`).
4. Yayın: `bash araclar/yayinla.sh`, ardından `python3 araclar/dogrula.py`.

Mutlak kurallar (projenin başından beri): eski sitedeki metinler ve belgeler aynen korunur (yanlışlar
`icerik-notlari.md`'ye yazılır, kullanıcı onayı olmadan düzeltilmez); yeni metin yalnızca arayüz etiketi/meta/alt
metin vb. için ve `onay-bekleyen-metinler.md`'ye kaydedilerek; sayılar yalnızca kaynağı belli belgelerden;
MKK e-Şirket (Bilgi Toplumu Hizmetleri) ve KAP bağlantıları her zaman bulunur; EN'de yalnızca eski sitedeki EN içerik.

## Yönetim paneli

- Giriş: https://idealistgyo.pages.dev/yonetim/ — e-postaya 6 haneli kod (10 dk geçerli), oturum 7 gün.
  Yetkili adresler `wrangler.toml` → `ADMIN_EMAILS`. Kod e-postası Resend ile gider (`RESEND_API_KEY`, `KOD_TUZU`
  Pages proje ayarlarında secret).
- Belgeler R2 kovası `idealist-belgeler`'e, kayıtlar D1 `idealist-panel`'e yazılır. Statik sayfalardaki
  `data-ek="…"` işaretleri ara katmanda doldurulur; panelde içerik yoksa sayfalar değişmeden geçer.
- Statik sayfası olmayan yeni yıllar (Faaliyet Raporları, Özel Durum Açıklamaları) ve panel duyuruları
  `/panel-sablon/` şablonlarından üretilir.

## Gizli bilgiler

`.env` ve `.dev.vars` gitignore'dadır; anahtarlar asla depoya yazılmaz. Yayın için gereken `CLOUDFLARE_API_TOKEN`
ve `CLOUDFLARE_ACCOUNT_ID` bulut oturumunda ortam ayarlarından verilir. İş bitince (alan adı geçişi dâhil)
Cloudflare API anahtarı kullanıcı tarafından silinmelidir.
