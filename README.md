# Nur-u Hakikat

Tek kod tabanından çıkan **web sitesi** ve **mobil uygulama** (Android + iOS).
Ana ekran, `design/mockup-ana-ekran.png` tasarımıyla birebir örtüşecek şekilde ölçülerek kurulmuştur;
uygulama simgesi `design/logo-kaynak.png` sarı logodur.

| Tasarım | Uygulama |
| --- | --- |
| `design/mockup-ana-ekran.png` | `npm run test:visual` → `test-results/ana-ekran.png` |

## Yapı

```
index.html                 Uygulama iskeleti (arka plan, alıntı, alt menü)
src/main.ts                Sekme yönlendirme (#/oku, #/kenz, #/gunes), Capacitor ve PWA kurulumu
src/styles.css             Tüm ölçüler (390 × 841 referans ekrana göre, --u ile ölçeklenir)
src/assets/bg/             Temizlenmiş arka plan (dikey + geniş ekran; AVIF / WebP / JPG)
src/assets/icons/          Dünya (Oku), düğüm (Kenz) ve güneş (Güneş) ikonları
src/assets/fonts/          Tinos Bold Italic (alıntı, başlıklar) ve Encode Sans 500/600/700 (arayüz) — kendi sunucumuzdan
src/kenz/                  Kenz sekmesi: konu konu video kütüphanesi (kutuphane.ts), kaydırma etkileri (kenz.ts), Güneş
src/oku/                   Oku sekmesi: dikey video akışı (akis.ts), sağa kaydırıp çıkma (kaydir-cik.ts), Neşret, Menba
content/oku/videolar.json  Oku akışındaki videolar, sırasıyla; aşağıdaki "Oku: video ekleme" bölümüne bakın
public/videolar/           Videolar (720×1280 H.264), kapak ve paylaşım önizleme görselleri
vite/oku-videolar.ts       Video listesini denetleyen ve her video için paylaşım sayfasını (v/<id>/) üreten eklenti
public/icons/              Favicon, PWA ve Apple simgeleri (sarı logo)
resources/                 Android/iOS simge ve açılış ekranı kaynakları (sarı logo)
android/, ios/             Capacitor yerel projeleri
design/                    Tasarım kaynakları ve vektör logo (logo.svg, knot.svg)
scripts/compare-mockup.mjs Ana ekranın tasarımla karşılaştırma ekran görüntüsü
scripts/oku-test.mjs       Oku akışını gerçek tarayıcıda baştan sona deneyen test
```

Sekmeler: **Kenz** ana ekrandır (tasarımdaki görünüm); aşağı kaydırınca videolar konu konu sıralanır.
**Oku** kâinat kitabını "okumak" için tam ekran kısa video akışıdır (aşağıda). **Güneş** şimdilik aynı sahnede
şafak vakti bir "yakında" ekranıdır; içeriği gelince `index.html` içindeki `view-gunes` bölümüne eklenir.

## Kenz sekmesi

- Açılışta ana ekran tasarımdaki görünümdür; tasarıma yalnız üstte küçük **NUR-U HAKİKAT** yazısı ve menünün
  üstünde **Konular · 2** kapsülü (dokununca kütüphaneye kayar) eklendi.
- Aşağı kaydırınca sahne ufka doğru yaklaşır, gök koyulaşıp hafifçe bulanıklaşır, alıntı söner ve üstte
  *Nur-u Hakikat* markası kalır. Videolar konu başlıkları altında kartlar hâlinde sıralanır: kapak, süre,
  Menba ve **İzle**. Karta dokununca video Oku'da açılır; sağa kaydırınca kütüphanede aynı yere dönülür.
- Bir konuda tek video varsa geniş kart, birden çok video varsa yana kaydırılan bir raf gösterilir.
- Kenz sekmesine yeniden dokunmak en başa döndürür. Hareketi azaltma ayarı açıksa yakınlaşma ve bulanıklık
  yapılmaz, yalnız gök koyulaşır.
- Konular `content/oku/videolar.json` içindeki `konular` listesinden gelir (sıra Kenz'deki sıradır); videosu
  olmayan konu gösterilmez. Konu eklemek ya da adını değiştirmek için bu listeyi düzenleyin (`aciklama`
  isteğe bağlıdır; başlığın altında kısa bir satır olarak görünür):

  ```json
  "konular": [
    { "id": "muhabbet", "baslik": "Muhabbet" },
    { "id": "nubuvvet", "baslik": "Nübüvvet", "aciklama": "İsteğe bağlı kısa açıklama" }
  ]
  ```

## Oku sekmesi

Instagram Reels gibi tam ekran dikey video akışı (`#/oku/<video>`). Oku açıkken alt menü yoktur; çıkmak için
ekran **sağa kaydırılır** (parmağı izler, altından dönülecek sekme görünür), telefonun geri tuşu ya da
klavyede Escape de çıkarır. İlk açılışta bir kez "Çıkmak için sağa kaydırın" ipucu gösterilir (fareli
bilgisayarda "Çıkmak için Esc tuşuna basın"). Ekran okuyucu ve klavye için görünmez bir "Oku’dan çık" düğmesi
vardır; yalnız klavyeyle odaklanınca belirir, dokunmatik ekranda hiç görünmez.

- Yukarı/aşağı kaydırınca sonraki/önceki video ekrana oturur ve kendiliğinden, sesli oynar; önceki durur.
  Geri dönülen video baştan başlar. Videoya dokununca durur / sürer; alttaki ince çizgiyle videoda ileri geri
  gidilir. Kulaklık ya da medya tuşuyla durdurulan video kendiliğinden yeniden başlamaz.
- Ekranda **yalnız iki düğme** vardır:
  - **Neşret** — videonun bağlantısını telefonun paylaşım menüsüyle gönderir (WhatsApp, Instagram, …).
    Bağlantı `https://emreks53.github.io/A/v/<video>/` biçimindedir; mesajlaşma uygulamaları önizlemeyi o
    videonun görseli ve adıyla çizer, bağlantıyı açan kişi doğrudan o videoya gelir. Paylaşım menüsü olmayan
    tarayıcıda bağlantı panoya kopyalanır.
  - **Menba** — videonun Risale-i Nur'daki kaynağı (ör. *Lem’alar, 64. sayfa*) ve varsa görüntü ve ses künyesi
    (CC BY 4.0 lisanslı görüntülerin zorunlu atıfları burada). Sayfa üstteki tutamağa dokunarak, aşağı
    sürükleyerek ya da arkasına dokunarak kapanır.
- Başka sekmeye geçince ya da uygulama arka plana alınınca video durur; dönünce kaldığı yerden sürer.
  Ana ekrandayken hiçbir video indirilmez.
- Tarayıcı sesli otomatik oynatmaya izin vermezse (bazı mobil tarayıcılar) video sessiz başlar; sağ üstte
  küçük bir "ses kapalı" göstergesi ve kısa bir "Sesi açmak için videoya dokunun" bildirimi çıkar (düğme
  değildir; videoya dokunmak sesi açar). Telefon uygulamasında videolar doğrudan sesli başlar.
- Videoların alt bandına (%72–82) altyazı, ortasına sahne yazıları gömülüdür (YouTube Shorts düzeni).
  Bu yüzden konu ve videonun adı üstte, yalnız video ekrana gelirken birkaç saniye ve video durdurulunca
  görünür (Menba'da da yazar); düğmeler altyazının üstünde, sağ kenardaki boş bölgededir; altta yalnız ince
  ilerleme çizgisi vardır.
- Klavye ve ekran okuyucu: video odaklanabilir (Enter / boşluk durdurur, sürdürür), ilerleme çizgisi
  kaydırıcıdır (←/→ 5 sn), ↑/↓ ya da PageUp/PageDown video değiştirir.

### Oku: video ekleme

1. Videoyu 720×1280'e sıkıştırıp `public/videolar/` altına koyun (hızlı başlaması için `+faststart`):

   ```bash
   ffmpeg -i kaynak.mp4 -vf "scale=720:1280:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow \
     -profile:v high -crf 23 -maxrate 2500k -bufsize 5000k -g 48 -c:a aac -b:a 128k -movflags +faststart \
     public/videolar/yeni-video.mp4
   ffmpeg -ss 0.5 -i public/videolar/yeni-video.mp4 -frames:v 1 -q:v 4 public/videolar/yeni-video-kapak.jpg
   ffmpeg -ss 6 -i public/videolar/yeni-video.mp4 -frames:v 1 -q:v 3 public/videolar/yeni-video-onizleme.jpg
   ```

2. `content/oku/videolar.json` listesine ekleyin (sıra akıştaki sıradır; `konu`, `konular` listesindeki bir
   `id` olmalı):

   ```json
   {
     "id": "yeni-video",
     "baslik": "Videonun adı",
     "konu": "muhabbet",
     "video": "videolar/yeni-video.mp4",
     "kapak": "videolar/yeni-video-kapak.jpg",
     "onizleme": "videolar/yeni-video-onizleme.jpg",
     "menba": [{ "eser": "Sözler", "yer": "19. Söz" }],
     "kunye": ["İsteğe bağlı: lisansın gerektirdiği atıflar"]
   }
   ```

   `id` paylaşım bağlantısında görünür (küçük harf, rakam, tire). Eksik dosya, tekrar eden `id`, bilinmeyen
   `konu` ya da boş `menba` derlemeyi anlaşılır bir hatayla durdurur. Kartlardaki süre video dosyasından okunur. `kapak` video yüklenirken görünen ilk kare, `onizleme`
   paylaşılan bağlantının önizleme görselidir.

Şimdilik videolar uygulamayla birlikte gelir (iki video ≈ 70 MB). Video sayısı artınca bir video barındırma
hizmetine (Cloudflare Stream, Bunny vb.) taşınmalı; `video` alanına tam adres yazılabilecek şekilde
genişletilir.

### Paylaşılan bağlantının uygulamada açılması

- **Web sitesi:** `main` dalı GitHub Pages'te yayınlanınca bağlantılar hemen çalışır (önizleme + videoya
  yönlendirme). Pages yalnız `main` dalından yayınlanır.
- **Android uygulaması:** `AndroidManifest.xml` `…/A/v/` bağlantılarını uygulamaya bağlar; uygulama açılınca
  ilgili videoya gider (`appUrlOpen`). Android'in bağlantıyı tarayıcı yerine doğrudan uygulamada açması için
  alan adının **kökünde** `https://emreks53.github.io/.well-known/assetlinks.json` dosyası olmalı (bu dosya
  `emreks53/emreks53.github.io` deposuna ya da kendi alan adınızın köküne konur) ve içinde uygulamanın imza
  anahtarının SHA-256 parmak izi bulunmalı:

  ```json
  [{ "relation": ["delegate_permission/common.handle_all_urls"],
     "target": { "namespace": "android_app", "package_name": "com.nuruhakikat.app",
                 "sha256_cert_fingerprints": ["<yükleme anahtarının SHA-256 parmak izi>"] } }]
  ```

  GitHub Pages varsayılan Jekyll derlemesi nokta ile başlayan klasörleri yayınlamaz: o depoya boş bir
  `.nojekyll` dosyası (ya da `_config.yml` içine `include: [".well-known"]`) eklenmeli ve
  `curl -sI https://emreks53.github.io/.well-known/assetlinks.json` 200 dönmeli (yönlendirmesiz).
  CI'daki hata ayıklama APK'sı her derlemede farklı anahtarla imzalandığından bu doğrulama ancak sabit bir
  yükleme anahtarıyla (Play Store sürümü) yapılabilir. Doğrulama yokken bağlantı web sitesinde açılır.
- **iPhone uygulaması:** Xcode'da *Associated Domains* yeteneğine `applinks:emreks53.github.io` eklenmeli ve
  alan adının kökünde `.well-known/apple-app-site-association` dosyası (Apple ekip kimliğiyle) bulunmalı.
  Uygulama tarafındaki yönlendirme hazırdır.
- Alan adı değişirse `content/oku/videolar.json` içindeki `site` ve `AndroidManifest.xml` içindeki `host` /
  `pathPrefix` birlikte değiştirilir.

## Geliştirme

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ klasörüne üretim derlemesi
npm run test:visual  # derlemeyi tasarım ölçüsünde (854 × 1842) ekran görüntüsü olarak alır
npm test             # birim testleri (video listesi, paylaşım sayfası, yönlendirme)
npm run test:oku     # derlemeyi gerçek tarayıcıda dener: akış, kaydırma, durdurma, Neşret, Menba, paylaşım bağlantısı
```

## Web sitesi (GitHub Pages)

`.github/workflows/pages.yml`, `main` dalına her gönderimde siteyi derleyip GitHub Pages'e yayınlar.
İlk seferde depo ayarlarından **Settings → Pages → Build and deployment → Source: GitHub Actions** seçilmelidir.
Site göreli yollarla derlendiği için `https://<kullanıcı>.github.io/<depo>/` gibi alt yollarda da çalışır.
Site PWA'dır: telefonda "Ana ekrana ekle" ile uygulama gibi kurulabilir ve çevrimdışı açılır.

## Android (APK)

Gereksinimler: Node 22, JDK 21, Android SDK (platform 36).

```bash
npm run android:apk
# çıktı: android/app/build/outputs/apk/debug/app-debug.apk
```

`.github/workflows/android.yml` her gönderimde hata ayıklama APK'sını derleyip **Actions → Artifacts**
altına koyar; `v1.0.0` gibi bir etiket gönderildiğinde APK'yı GitHub Release'e ekler.
Play Store için imzalı sürüm (`assembleRelease` / `bundleRelease`) kendi anahtar deponuzla oluşturulmalıdır.

## iOS

macOS ve Xcode gerekir:

```bash
npm run cap:sync
npx cap open ios     # Xcode'da imzalama ekibini seçip çalıştırın
```

## Simge ve açılış ekranı

Kaynaklar `resources/` klasöründedir (sarı logo). Değiştirdikten sonra:

```bash
npm run assets:native
```

## Notlar

- Uygulama kimliği `com.nuruhakikat.app`, adı `Nur-u Hakikat` (`capacitor.config.ts`, Android `build.gradle` /
  `strings.xml`, iOS proje dosyası). Mağazaya ilk gönderimden sonra kimlik değiştirilemez.
- Alıntı yazı tipi Tinos (Apache 2.0), menü yazı tipi Encode Sans (OFL); ikisi de uygulamayla birlikte gelir.
- Videolar: *Sevgi ve Güzellik* (`video` dalı) ve *Ahlâk Mu'cizesi* v2.3 (`claude/prophet-character-video-wnuefu` dalı);
  kaynakları ve lisansları o dallarda.
