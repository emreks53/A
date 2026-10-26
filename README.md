# Kenz

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
src/assets/fonts/          Tinos Bold Italic (alıntı), Encode Sans Bold (menü), Lora (okuma), Amiri (Arapça) — kendi sunucumuzdan
src/oku/                   Oku sekmesi: kitaplık, bölümler, okuma ekranı, lügat (src/oku/lugat/)
content/oku/               Oku sekmesindeki kitaplar (Markdown); aşağıdaki "Oku: kitap ekleme" bölümüne bakın
public/lugat/lugat.jsonl   Lügat-ı Risale-i Nur'un temel lügatı (11.905 madde); okurken dokunulan kelimenin manası
vite/oku-katalog.ts        content/oku klasörünü derleme anında tarayıp kitap listesini üreten Vite eklentisi
public/icons/              Favicon, PWA ve Apple simgeleri (sarı logo)
resources/                 Android/iOS simge ve açılış ekranı kaynakları (sarı logo)
android/, ios/             Capacitor yerel projeleri
design/                    Tasarım kaynakları ve vektör logo (logo.svg, knot.svg)
scripts/compare-mockup.mjs Ana ekranın tasarımla karşılaştırma ekran görüntüsü
scripts/oku-test.mjs       Oku sekmesini gerçek tarayıcıda baştan sona deneyen test
```

Sekmeler: **Kenz** ana ekrandır (tasarımdaki görünüm). **Oku** okuma bölümüdür (aşağıda). **Güneş** sekmesi
aynı görsel dilde hazır, içeriği eklenmeyi bekliyor (`index.html` içindeki `view-gunes` bölümü).

## Oku sekmesi

- **Kitaplık** (`#/oku`): kitaplar ve "Kaldığın yerden devam et" kartı (bölüm bittiyse sıradaki bölüm).
- **Bölümler** (`#/oku/<kitap>`): her bölümün okuma süresi ve ne kadarının okunduğu.
- **Okuma ekranı** (`#/oku/<kitap>/<bölüm>`): alt menü gizlenir, aşağı kaydırınca üst çubuk da çekilir
  (yukarı kaydırınca ya da boşluğa dokununca geri gelir). Bölüm sonunda önceki/sonraki bölüme geçiş.
  - **Kelimeye dokununca manası** ekranın altında açılır; ekli kelimenin kökü ("kudretinin" → kudret) ve
    birleşik ifadeler ("mana-yı harfî") Lügat-ı Risale-i Nur uygulamasının arama kurallarıyla bulunur
    (`src/oku/lugat/`, Dart kodunun TypeScript karşılığı). "Bakınız" ve diğer adaylar dokunulabilir.
  - **Dipnot** işaretine dokununca dipnot aynı yerde açılır; bölüm sonunda bütün dipnotlar listelenir.
  - **Aa**: yazı boyutu (6 adım), satır aralığı (dar / normal / geniş), tema (gündüz / sepya / gece).
  - Kalınan yer (paragraf düzeyinde) ve ayarlar cihazda saklanır; internet gerekmez (lügat ve bölümler
    PWA önbelleğinde, telefon uygulamasında zaten içeride).
- Android geri tuşu önce açık sayfayı kapatır, sonra uygulama içinde geri gider.

### Oku: kitap ekleme

Her kitap `content/oku/` altında bir klasördür; klasör adı adreste görünür (küçük harf, rakam, tire):

```
content/oku/sozler/
  kitap.json               {"baslik": "Sözler", "altbaslik": "…", "sira": 1}
  01-birinci-soz.md        bölümler dosya adı sırasıyla; baştaki numara adrese girmez (#/oku/sozler/birinci-soz)
  02-ikinci-soz.md
```

Bölüm dosyası yalın Markdown'dır; ilk satırı bölüm başlığıdır:

```markdown
# Birinci Söz

بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ        ← Arapça paragraf kendiliğinden sağdan sola, ortalı ve Amiri yazı tipiyle

Paragraflar boş satırla ayrılır. **kalın**, *italik*, dipnot işareti[^1].

## Ara başlık

> Alıntı

---                                       ← ayraç

Şiir gibi satır kırmak için satır sonuna ters bölü\
konur.

[^1]: Dipnot metni.
```

Eksik `kitap.json`, başlıksız bölüm ya da aynı adlı iki bölüm derlemeyi anlaşılır bir hatayla durdurur.
`content/oku/ornek/` okuma ekranını tanıtan örnek kitaptır (`"ornek": true`, kitaplıkta "Örnek" rozetiyle);
gerçek metinler eklenince silinebilir.

## Geliştirme

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ klasörüne üretim derlemesi
npm run test:visual  # derlemeyi tasarım ölçüsünde (854 × 1842) ekran görüntüsü olarak alır
npm test             # birim testleri (Markdown, katalog, rota, lügat araması)
npm run test:oku     # derlemeyi gerçek tarayıcıda dener: kitaplık → bölüm → kelime → ayarlar → kalınan yer
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

- Uygulama kimliği `app.kenz.mobile`, adı `Kenz` (`capacitor.config.ts`). Mağazaya göndermeden önce değiştirebilirsiniz.
- Alıntı yazı tipi Tinos (Apache 2.0), menü yazı tipi Encode Sans (OFL), okuma yazı tipi Lora (OFL), Arapça
  yazı tipi Amiri (OFL); hepsi uygulamayla birlikte gelir.
- Lügat verisi Lügat-ı Risale-i Nur uygulamasının `assets/lugat.jsonl` dosyasıdır (manaların kaynağı ve
  telif notu o uygulamanın README'sinde).
