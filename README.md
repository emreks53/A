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
src/assets/fonts/          Tinos Bold Italic (alıntı) ve Encode Sans Bold (menü) — kendi sunucumuzdan
public/icons/              Favicon, PWA ve Apple simgeleri (sarı logo)
resources/                 Android/iOS simge ve açılış ekranı kaynakları (sarı logo)
android/, ios/             Capacitor yerel projeleri
design/                    Tasarım kaynakları ve vektör logo (logo.svg, knot.svg)
scripts/compare-mockup.mjs Ana ekranın tasarımla karşılaştırma ekran görüntüsü
```

Sekmeler: **Kenz** ana ekrandır (tasarımdaki görünüm). **Oku** ve **Güneş** sekmeleri aynı görsel dilde
hazır, içerikleri eklenmeyi bekliyor (`index.html` içindeki `view-oku` ve `view-gunes` bölümleri).

## Geliştirme

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ klasörüne üretim derlemesi
npm run test:visual  # derlemeyi tasarım ölçüsünde (854 × 1842) ekran görüntüsü olarak alır
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
- Alıntı yazı tipi Tinos (Apache 2.0), menü yazı tipi Encode Sans (OFL); ikisi de uygulamayla birlikte gelir.
