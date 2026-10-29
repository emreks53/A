# Nur-u Hakikat

Tek kod tabanından çıkan **web sitesi** ve **mobil uygulama** (Android + iOS).
Ana ekran, `design/mockup-ana-ekran.png` tasarımıyla birebir örtüşecek şekilde ölçülerek kurulmuştur;
uygulama simgesi `design/logo-kaynak.png` sarı logodur.

| Tasarım | Uygulama |
| --- | --- |
| `design/mockup-ana-ekran.png` | `npm run test:visual` → `test-results/ana-ekran.png` |

## Yapı

```
index.html                 Uygulama iskeleti (arka plan, alıntı, ekranlar, alt menü)
src/main.ts                Yönlendirme (#/ ana ekran, #/oku, #/kenz, #/gunes, #/gunes/<kitap>/<sayfa>), geri tuşu, Capacitor ve PWA kurulumu
src/styles.css             Ana ekran ve alt menü ölçüleri (390 genişliğe göre, --u ile ölçeklenir)
src/assets/bg/             Temizlenmiş arka plan (dikey + geniş ekran; AVIF / WebP / JPG)
src/assets/icons/          Dünya (Oku), düğüm (Kenz) ve güneş (Güneş) simgeleri; videolardaki soluk im
src/assets/fonts/          Tinos Bold Italic (alıntı, başlıklar) ve Encode Sans 500/600/700 (arayüz) — kendi sunucumuzdan
src/kenz/                  Kenz ekranı: kitap kitap video kütüphanesi (kutuphane.ts, kenz.ts)
src/gunes/                 Güneş: Risale-i Nur kütüphanesi (gunes.ts) ve PDF okuyucu (okuyucu.ts, pdf.ts: pdf.js)
src/oku/                   Oku: dikey video akışı (akis.ts), sağa kaydırıp çıkma (kaydir-cik.ts), Neşret, Menba
                           (menba.ts; Kur'an-ı Kerim ve Külliyat rafı çizimi menba-cizim.ts)
content/oku/videolar.json  Oku akışındaki videolar, sırasıyla; aşağıdaki "Oku: video ekleme" bölümüne bakın
public/videolar/           Videolar (720×1280 H.264), kapak ve paylaşım önizleme görselleri
content/kitaplar/kitaplar.json  Güneş'te okunabilen kitaplar (PDF, sayfa farkı, içindekiler); "Güneş: kitap ekleme"
public/kitaplar/           Kitapların PDF'leri (<kimlik>.pdf)
vite/kitaplar.ts           Kitap listesini denetleyen, pdf.js yazı tipi/cmap dosyalarını derlemeye koyan eklenti
vite/oku-videolar.ts       Video listesini denetleyen ve her video için paylaşım sayfasını (v/<id>/) üreten eklenti
public/icons/              Favicon, PWA ve Apple simgeleri (sarı logo)
resources/                 Android/iOS simge ve açılış ekranı kaynakları (sarı logo)
android/, ios/             Capacitor yerel projeleri
design/                    Tasarım kaynakları ve vektör logo (logo.svg, knot.svg)
scripts/compare-mockup.mjs Ana ekranın tasarımla karşılaştırma ekran görüntüsü
scripts/oku-test.mjs       Uygulamayı (ana ekran, Oku, Kenz, Güneş, okuyucu) gerçek tarayıcıda baştan sona deneyen test
scripts/kitap-ekle.mjs     Güneş'e kitap ekler: PDF'i kopyalar, sayfa sayısını ve içindekileri listeye yazar
```

Açılış **ana ekrandır** (`#/`): yalnız gökyüzü, alıntı ve alt menü; üstte yazı yoktur, hiçbir sekme seçili
değildir. Alt menüdeki üç sekme ayrı ekranlar açar: **Oku** kâinat kitabını "okumak" için tam ekran kısa video
akışıdır, **Kenz** Risale-i Nur'dan videoların kütüphanesidir, **Güneş** Risale-i Nur Külliyatı'nın kendisidir:
kitaba dokununca dijital okuyucuda açılır.

Açık sekmeye yeniden dokunmak, telefonun geri tuşu ya da tarayıcının geri düğmesi ana ekrana döndürür. Kenz ile
Güneş arasında geçmek geçmişe kayıt eklemez (geri hep ana ekrana gider); ana ekranda geri tuşu uygulamadan çıkar.

## Kenz

Ayrı bir ekran: gece mavisi bir kütüphane ("gece kütüphanesi"). Videolar geçtiği **Risale-i Nur kitabına**,
kitapta da **bölümüne** göre gruplanır.

- Kitaplar Külliyat sırasıyla gelir (Sözler, Mektubat, Lem’alar, Şuâlar, …); her kitabın başında Menba
  rafındakiyle aynı renkte küçük bir cilt sırtı, adı ve video sayısı vardır. Altında bölümler (ör. **ON YEDİNCİ
  LEM’A**), bölümlerde videolar.
- Kartta önizleme görseli ve süre, videonun adı (geçtiği yer: *On Yedinci Lem’a’dan*), kısım ve sayfa
  (*Altıncı Mesele · 203. sayfa*) ve üç etiket (*#ihlas #muhabbet #kurtuluş*) bulunur. Kartın tamamına
  dokununca video Oku'da açılır; sağa kaydırınca kütüphanede aynı yere dönülür.
- Bir bölümde tek video varsa geniş kart, birden çok video varsa yana kaydırılan bir raf gösterilir. Üç ve
  daha çok kitap olunca başta kitap fihristi çıkar (dokununca o kitaba kayar).
- Menünün arkası ve altı hep düz gece rengidir; oradaki görünmeyen kartlara dokunulmaz (saydam kalkanlar),
  kaydırma oradan da başlar. Geniş ekranda kütüphane ortada 600 px'lik bir sütundur.

## Güneş

Menba'daki gibi: şafak vakti, güneş rahledeki büyük Kur’an-ı Kerim'in ardından doğar (Kur'an yalnız süstür,
dokunulmaz); altında ceviz rafta Risale-i Nur Külliyatı'nın 14 eseri Külliyat sırasıyla (Sözler, Mektubat,
Lem’alar, … İman ve Küfür Muvâzeneleri). Arka plan ana ekranın gökyüzü fotoğrafıdır; ufku rahlenin hizasına gelir.

- Her eser büyük bir cilt sırtıdır (Menba rafıyla aynı renkler, altın şeritler, dikey ad); dokunma alanı en az
  44 × 44 px (354 px'ten dar ekranlarda sırtlar daralır, raf ekrana sığar).
- PDF'i okuyucuda olmayan eser, listede bağlantısı varsa yayınevinin sitesindeki kitap sayfasına gider (şimdi
  RNK Neşriyat, `rnk.com.tr`; tarayıcıda yeni sekmede, telefon uygulamasında sistem tarayıcısında açılır; rafın
  altındaki not bunu söyler). Ne PDF'i ne bağlantısı olan eser soluk görünür ve "yakında" yazar; dokunulmaz.
- En son okunan kitap için rafın altında **Kaldığın yer** kartı çıkar (kitap, bölüm, sayfa); dokununca
  okuyucu o sayfada açılır.
- Kitaba dokununca cilt raftan çekilir, dönüp kapağını gösterir, kapak açılır ve okuyucu tam ekran açılır
  (`#/gunes/<kitap>/<sayfa>`; alt menü yoktur). Hareket azaltılmışsa geçiş oynatılmaz. Sayfalar PDF'te basıldığı
  gibi gösterilir, metne dokunulmaz.
  - Yana kaydırmak, kenarlara dokunmak ya da ok tuşları sayfa çevirir; ortaya dokunmak üst ve alt çubuğu
    gizler/gösterir (dokunarak sayfa çevrilince çubuklar kendiliğinden çekilir, klavyeyle gezilirken açık kalır).
    İki parmakla ya da çift dokunuşla yakınlaşılır.
  - Üstte kapat, kitap ve bölüm adı, **İçindekiler** (bölümler, bulunulan bölüm, "Sayfaya git") ve **Sayfa
    görünümü** (Gündüz: sayfanın kendi renkleri; Sepya: sıcak kâğıt, kahve mürekkep; Gece: lacivert kâğıt, krem
    yazı; seçim hatırlanır; renkler yalnız ekranda değişir). Altta sayfa göstergesi (*154 / 480 · %32*),
    bölüm başları çentikli kaydırıcı ve sayfada geçen bir video varsa **Bu sayfanın videosu** (Oku'da açılır,
    çıkınca kitaba dönülür).
  - Kitap kalınan yerden açılınca bir an *Kaldığın yerden: 154. sayfa · Baştan aç* bildirimi çıkar.
  - Yatay geniş ekranda (tablet, masaüstü) iki sayfa yan yana açılır; kapak tektir.
  - Sayfa değişince adres de değişir (geçmişe kayıt eklenmez); kalınan yer bu cihazda hatırlanır. Kapat,
    Escape ya da geri tuşu açıldığı yere (Güneş rafı ya da Menba) döner.
  - Sayfalar cihazın piksel yoğunluğunda çizilir; yalnız görünen sayfa ve iki yanı çizili tutulur. PDF
    sunucusu bayt aralığını destekliyorsa büyük kitabın yalnız açılan sayfaları indirilir.
- Menba'da videonun geçtiği kitabın PDF'i varsa **Kitapta oku** düğmesi çıkar: kitap videonun sayfasında
  açılır, kapatınca aynı videoya dönülür.

### Güneş: kitap ekleme

```bash
node scripts/kitap-ekle.mjs "Lem'alar" ~/indirilenler/lemalar.pdf --sayfa-farki 4
```

PDF `public/kitaplar/lemalar-<içerik özeti>.pdf` olarak kopyalanır (kitap başka bir baskıyla güncellenince yeni bir
dosya olur; eskisi silinmez, telefona kurulmuş eski uygulamalar onu okumayı sürdürür); sayfa sayısı ve PDF'in kendi içindekiler listesi (varsa)
`content/kitaplar/kitaplar.json`'a yazılır. `--sayfa-farki`: basılı 1. sayfadan önceki numarasız sayfaların
(kapak, önsöz …) sayısı; adreslerdeki ve içindekilerdeki sayfa numaraları basılı numaradır (videolardaki
*154. sayfa* ile aynı baskıya göre). PDF'te içindekiler yoksa listede elle yazılabilir:

```json
{ "kitap": "Lem'alar", "pdf": "kitaplar/lemalar-3f9a0c21d4.pdf", "sayfaSayisi": 480, "sayfaFarki": 4,
  "icindekiler": [{ "baslik": "On Yedinci Lem’a", "sayfa": 151 }, { "baslik": "Birinci Nota", "sayfa": 152, "derinlik": 1 }] }
```

`pdf` bir `https://` adresi de olabilir (sunucu CORS izni vermelidir). PDF'i olmayan eserlerin dışarıdaki
sayfaları listenin `baglanti` alanındadır: `{ "ad": "RNK Neşriyat", "adresler": { "Sözler": "https://rnk.com.tr/sozler/", … } }`
(PDF'i eklenen eser bağlantısı olsa da okuyucuda açılır). Liste derlemede denetlenir: bilinmeyen
eser, olmayan ya da PDF olmayan dosya, sayfa sayısını aşan içindekiler derlemeyi durdurur. PDF'ler sitede
yayınlanır; mobil uygulamaya konmaz (paket küçük kalır), uygulama onları siteden okur: sitenin sunucusu bayt
aralığı istediği için yalnız açılan sayfaların parçaları iner (başka kaynaktaki PDF için de, sunucu `Range`
isteğine 206 ile yanıt veriyorsa). Okuyucu (pdf.js) ilk kitap açılınca yüklenir ve önbelleğe alınır; eski
tarayıcılar (iOS 15+) için eksik JavaScript özellikleri tamamlanır. Kalınan yer hangi PDF dosyasında
kalındığıyla birlikte saklanır (dosya değişince eski sayfa numarası kullanılmaz).

## Oku sekmesi

Instagram Reels gibi tam ekran dikey video akışı (`#/oku/<video>`). Oku açıkken alt menü yoktur (Oku ekranı
onu örter); çıkmak için
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
  - **Menba** — videonun kaynağı: nur içinde, rahle üzerinde büyük bir Kur’an-ı Kerim; altında rafta Risale-i
    Nur Külliyatı'nın on dört eseri dizili, videonun geçtiği eser raftan öne çekilmiş ve aydınlanmış. Altında
    eser, bölüm, (varsa) kısım ve sayfa (*Şuâlar · On Birinci Şuâ · Altıncı Mesele · 203. sayfa*), üç etiket
    ve varsa görüntü ve ses künyesi (lisansın gerektirdiği atıflar). Sayfa üstteki tutamağa dokunarak, aşağı
    sürükleyerek ya da arkasına dokunarak kapanır.
- Başka sekmeye geçince ya da uygulama arka plana alınınca video durur; dönünce kaldığı yerden sürer.
  Ana ekrandayken hiçbir video indirilmez.
- Tarayıcı sesli otomatik oynatmaya izin vermezse (bazı mobil tarayıcılar) video sessiz başlar; sağ üstte
  küçük bir "ses kapalı" göstergesi ve kısa bir "Sesi açmak için videoya dokunun" bildirimi çıkar (düğme
  değildir; videoya dokunmak sesi açar). Telefon uygulamasında videolar doğrudan sesli başlar.
- Ekranın üstünde hiçbir yazı yoktur. En altta çok küçük, geçtiği yer yazar (*On Yedinci Lem’a*, *On Birinci
  Şuâ · Altıncı Mesele*); sağ altta küçük ve soluk beyaz Nur-u Hakikat imi durur. Videoların altyazıları karenin
  %64–82 bandında olduğundan düğmeler ekranın en az %38 yukarısında, altyazının üstündedir.
- İlerleme çizgisi Instagram'daki gibidir: ekranın en altında kenardan kenara 2 px, parlamasız, uçsuz.
  Sürüklerken 4 px'e kalınlaşır, beyaz bir tutamak ve "0:42 / 2:05" zamanı görünür; düğmeler, alt yazı ve im
  bu sırada çekilir.
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

2. `content/oku/videolar.json` listesine ekleyin (sıra Oku akışındaki sıradır; Kenz'de kitap ve bölüme göre
   gruplanır):

   ```json
   {
     "id": "yeni-video",
     "baslik": "On Dokuzuncu Söz'den",
     "kitap": "Sözler",
     "bolum": "On Dokuzuncu Söz",
     "kisim": "İsteğe bağlı: Birinci Reşha",
     "sayfa": 230,
     "etiketler": ["nübüvvet", "muhabbet", "tefekkür"],
     "video": "videolar/yeni-video.mp4",
     "kapak": "videolar/yeni-video-kapak.jpg",
     "onizleme": "videolar/yeni-video-onizleme.jpg",
     "kunye": ["İsteğe bağlı: lisansın gerektirdiği atıflar"]
   }
   ```

   - `baslik` videonun adıdır ve geçtiği yeri söyler (*On Yedinci Lem'a'dan*, *Yedinci Şuâ'dan*).
   - `kitap` Külliyat'taki eserlerden biri olmalıdır (`src/oku/ortak.ts` içindeki `KULLIYAT`); `bolum` kitaptaki
     bölüm, `kisim` (isteğe bağlı) bölümün içindeki yer, `sayfa` (isteğe bağlı) sayfa numarasıdır.
   - `etiketler` videonun konusunu anlatan tam üç etikettir: `#` olmadan, küçük harfle, boşluksuz ve birbirinden
     farklı.
   - Kesme işaretleri veride düz (`'`) yazılır; ekranda ve paylaşımda tipografik (`’`) görünür.
   - `id` paylaşım bağlantısında görünür (küçük harf, rakam, tire). Eksik dosya, tekrar eden `id`, Külliyat dışı
     `kitap` ya da kurala uymayan etiket derlemeyi anlaşılır bir hatayla durdurur. Süre video dosyasından
     okunur. `kapak` video yüklenirken görünen ilk kare, `onizleme` Kenz kartının ve paylaşılan bağlantının
     önizleme görselidir.

Şimdilik videolar uygulamayla birlikte gelir (iki video ≈ 59 MB). Video sayısı artınca bir video barındırma
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
npm test             # birim testleri (video ve kitap listesi, paylaşım sayfası, yönlendirme)
npm run test:oku     # deneme derlemesi yapıp gerçek tarayıcıda dener: ana ekran, Oku, Neşret, Menba, Kenz, Güneş,
                     # okuyucu (örnek PDF: scripts/fixtures/; Risale metni değildir), geri dönüşler
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
- Videolar `emreks53/B` deposundan: *On Birinci Şuâ'dan* (Altıncı Mesele, fenler Hâlık'ı tanıttırır;
  `claude/kurzgesagt-style-turkish-video-2on8vi` dalı) ve *On Yedinci Lem'a'dan* (ihlas;
  `claude/kurzgesagt-style-video-p5a1gi` dalı). Kaynakları ve lisansları o dallarda; künyesi Menba'da.
- Telefon tarayıcısı: ölçü birimi dikeyde boy 640 px'e göre sınırlanır (`--u`), adres ve araç çubukları ekranı
  kısalttığında menü ve alıntı küçülmez. Geniş arka plana 4/5 oranında geçilir; dikey telefonda hep dikey
  fotoğraf kullanılır. Geniş arka planın (yatay telefon, tablet, masaüstü) iki yanı fotoğrafın aynı yükseklikteki
  keskin parçalarından doku dikişiyle örülmüştür; yanlarda bulanık bant yoktur. Arka plan fotoğrafının menünün altında kalan, bozuk (elle doldurulmuş) ön planı yeniden
  kuruldu (çimen dokusu perspektifle uzatılıp alan derinliğiyle bulanıklaştırıldı); hiçbir ekran oranında
  bozuk bölge görünmez. Reels videosu dar ekranlarda kenardan kenara, geniş ekranlarda ortada 9:16'dır.
