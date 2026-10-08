# Lügat-ı Risale-i Nur

Risale-i Nur okurken karşılaşılan Osmanlıca kelimelerin manasını hızlıca öğrenmek için
bir telefon uygulaması (Android ve iPhone, Flutter ile).

Okuyucu kitabı okurken telefonu yanında tutar, uygulamayı açar; bilmediği kelime çıktıkça
ilk harflerini yazar ve manasını görür. Bu sırada telefon kendiliğinden kapanmaz ve
(varsayılan olarak) bildirimler dikkatini dağıtmaz.

## Özellikler

- **Açılır açılmaz klavye** — Uygulama arama kutusu seçili ve klavye açık hâlde açılır.
  Bir kelimeye bakıp geri dönünce klavye yine açılır; "Yeni kelime" düğmesi kutuyu boşaltır,
  geri tuşuyla dönülünce yazı seçili kalır ve yazmaya başlayınca yerine geçer.
- **İlk harflerle öneri** — "in" yazınca "inkişaf", "inhisar", "inayet"… gibi kelimeler
  manalarının ilk satırlarıyla birlikte hemen listelenir. Klavyedeki ara tuşu ilk sonucu açar.
  - ş, ç, ğ, ı, ö, ü harflerini ve â, î, û şapkalarını yazmak gerekmez ("inkisaf" → inkişaf).
  - Kesme işareti ve tire gerekmez ("sanat" → san'at, "manayi harfi" → mana-yı harfî).
  - Birleşik ifadeler içindeki kelimeyle de bulunur ("harfi" → mana-yı harfî).
  - Ekli yazılan kelimenin kökü önerilir ("inkişafına" → inkişaf, "kudreti" → kudret,
    "kalbinden" → kalb, "Hakk'ın" → hak, "iman edenler" → iman). Ek, Türkçe ses
    kurallarına göre tanınır; böylece kelime yazılırken ilgisiz kısa kelimeler öne geçmez.
  - Küçük yazım hatalarında benzer kelime önerilir ("muhabet" → muhabbet).
  - Risale-i Nur'da sık geçen kelimeler önce gelir; aynı yazılıp farklı okunan kelimeler
    (hâkim / hakîm) mana sayfasında birlikte gösterilir.
- **Ekran kapanmaz** — Uygulama açıkken telefon kendiliğinden uyku moduna geçmez.
- **Bildirimleri gizleme (odak modu)** — varsayılan olarak açık; Ayarlar'dan kapatılabilir.
  - **Android 10 ve sonrası:** Uygulama ekrandayken kendine ait bir "Rahatsız Etmeyin"
    kuralını devreye alır; mesajlar, bildirimler ve telefon aramaları sessize alınır,
    ekrana gelmez. Uygulamadan çıkınca, başka uygulamaya geçince ya da ekran kapanınca kural
    hemen kapanır; kullanıcının kendi Rahatsız Etmeyin ayarlarına ve zamanlamalarına
    dokunulmaz. Alarmlar, medya sesi, yıldızlı kişilerin aramaları ve 15 dakika içinde
    ikinci kez arayanlar engellenmez. Bunun için bir kereye mahsus "Rahatsız Etmeyin erişimi"
    izni gerekir; uygulama bunu, arama kutusu boşken listenin başında çıkan ve klavyeyi
    kapatmayan bir uyarıyla ister. Durum göstergesi sistemin gerçek durumuna bakar (kural
    Android ayarlarından kapatılmışsa bunu söyler).
  - **Android 7–9:** Bu sürümlerde uygulama ancak telefonun genel Rahatsız Etmeyin modunu
    değiştirebiliyor; bu, kullanıcının kendi zamanlamalarını bozabildiği için odak modu
    sunulmaz ve kullanıcıya Rahatsız Etmeyin'i kendisinin açabileceği söylenir.
  - **iPhone:** iPhone'da uygulamalar "Rahatsız Etme"yi kendi başlarına açamaz. Uygulama
    ilk açılışta bir kereye mahsus hatırlatır; Ayarlar ekranında, Kestirmeler uygulamasıyla
    "Lügat açılınca Rahatsız Etme'yi aç, kapanınca kapat" otomasyonunun nasıl kurulacağı
    adım adım anlatılır.
- **Son bakılanlar ve kaydedilenler** — Bakılan kelimeler arama kutusu boşken listelenir;
  tekrar etmek istenen kelimeler kaydedilebilir.
- **Rahat okuma** — Büyük yazılı mana sayfası, ayarlanabilir yazı boyutu, açık/koyu tema.
- İnternet gerektirmez; lügat uygulamanın içindedir.

## Lügat verisi

Lügat `assets/lugat.jsonl` dosyasındadır; her satır bir maddedir:

```json
{"w":"inkişaf","o":"Ar.","f":3,"m":"Açılma, gelişme, ilerleme; gizli olanın açığa çıkması."}
```

| Alan | Anlamı |
|------|--------|
| `w`  | Kelime, Risale-i Nur'un Latin harfli baskılarındaki yazılışıyla (zorunlu) |
| `m`  | Günümüz Türkçesiyle manası (zorunlu) |
| `o`  | Köken: `Ar.`, `Fa.`, `Tr.`, `Ar.-Fa.` … (isteğe bağlı) |
| `f`  | Risale-i Nur'da karşılaşılma sıklığı: 3 çok sık, 2 sık, 1 seyrek — sıralamada kullanılır |
| `v`  | Başka baskılarda görülen farklı yazılışlar (isteğe bağlı) |

Lügatte **10.504 kelime ve ifade** var: Risale-i Nur'da geçen Arapça ve Farsça kökenli
kelimeler, çoğulları, terkipler (ör. "mana-yı harfî", "kudret-i ezeliye"), Risale'nin temel
kavramları (bunlar daha ayrıntılı açıklanır) ve yalnızca şapka/kesme farkıyla ayrılan
kelimeler (âlim / alîm, hâkim / hakîm).

Hazırlanışı:
1. Kelimeler harf gruplarına bölünüp yapay zekâ ile yazıldı; her dosya ayrı bir denetçi
   tarafından madde madde kontrol edildi (yanlış manalar düzeltildi, var olmayan kelimeler
   çıkarıldı).
2. Her harf grubu için eksik kelimeler ayrıca tarandı ve eklendi.
3. Her madde, **Kubbealtı Lugatı** (lugatim.com) karşılığıyla yan yana konup yeniden
   denetlendi: yanlış manalar, karışmış eşyazılışlı kelimeler, yanlış tekil/çoğul ve köken
   bilgileri düzeltildi. Kubbealtı'nın metni telif hakkıyla korunduğundan kopyalanmadı;
   yalnızca doğrulama kaynağı olarak kullanıldı ve manalar kendi cümlelerimizle yazıldı.

Yine de hata bulunabilir; yayından önce Osmanlıcaya ve Risale-i Nur'a vâkıf birinin gözden
geçirmesi tavsiye edilir. Uygulamanın Ayarlar > Hakkında bölümünde de okuyucuya bu not düşülür.

**Düzeltme ve ekleme:** `assets/lugat.jsonl` dosyasını düzenleyin, sonra

```sh
python3 tool/lugat_kontrol.py            # biçim, mükerrer kelime ve sıra denetimi
python3 tool/lugat_kontrol.py --duzelt   # Türk alfabesine göre sıralar, biçimi düzeltir
```

Elinizde kullanım hakkına sahip olduğunuz başka bir lügat varsa aynı biçime çevirip
bu dosyanın yerine koymanız yeterlidir.

## Geliştirme

Gerekenler: Flutter 3.47+ (Dart 3.13+), Android için Android SDK ve JDK 17+
(Android birim testleri Android 16 ortamı için JDK 21 ister; Android Studio'nun kendi
JDK'sı uygundur), iPhone için macOS + Xcode.

```sh
flutter pub get
flutter run                     # bağlı telefonda / emülatörde çalıştır
flutter test                    # Dart testleri (arama, arayüz akışı, lügat dosyası)
flutter analyze

flutter build apk --config-only                  # bir kereye mahsus: android/gradlew dosyasını oluşturur
cd android && ./gradlew app:testDebugUnitTest   # Android "Rahatsız Etmeyin" kodunun testleri (Robolectric)

flutter build apk --release     # Android APK
flutter build appbundle         # Google Play için
flutter build ipa               # iPhone (macOS + Xcode)
```

### Proje yapısı

```
lib/
  main.dart
  src/app_controller.dart          uygulama durumu: lügat, ayarlar, geçmiş, kaydedilenler, odak modu
  src/dictionary/normalize.dart    arama anahtarı (Türkçe küçük harf, şapka/kesme/tire temizliği)
  src/dictionary/lugat.dart        madde modeli, önek dizini, sıralama, kök ve benzer kelime önerisi
  src/focus/focus_mode.dart        Android odak modu kanalı
  src/ui/                          arama, mana, kaydedilenler ve ayarlar ekranları
android/app/src/main/kotlin/.../
  MainActivity.kt                  odak modunu ekrana gelince açar, ekrandan çıkınca kapatır
  FocusModeController.kt           uygulamaya ait "Rahatsız Etmeyin" kuralı (Android 10+)
assets/lugat.jsonl                 lügat
tool/lugat_kontrol.py              lügat dosyası denetleyicisi
```

### Yayınlamadan önce

- Uygulama kimliği `io.github.emreks53.lugat_risale`; değiştirmek isterseniz
  `android/app/build.gradle.kts` ve iOS projesindeki Bundle Identifier'ı güncelleyin.
- Android sürüm derlemesi şimdilik hata ayıklama anahtarıyla imzalanır; Google Play için
  kendi imza anahtarınızı tanımlayın (`android/app/build.gradle.kts` → `signingConfigs`).
- iPhone sürümü bu ortamda derlenemedi (macOS/Xcode gerekir); Xcode'da imzalama ekibini
  seçip bir kez derleyip denemek gerekir.
