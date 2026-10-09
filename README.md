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
- **Rahat okuma** — Büyük yazılı mana sayfası; her mananın ilk cümlesi ("asıl mana") kalın;
  ayarlanabilir yazı boyutu, açık/koyu tema. Renkler logodaki laciverten, kelime ve manalar
  Lora yazı tipiyle.
- İnternet gerektirmez; lügat uygulamanın içindedir.

## Lügat verisi

Lügat `assets/lugat.jsonl` dosyasındadır; her satır bir maddedir:

```json
{"w":"inkişaf","o":"Ar.","f":3,"m":"Açılma. Meydana çıkma. Yetişme. Terakki etme, ilerleme. Gizli sırların bilinmesi."}
```

| Alan | Anlamı |
|------|--------|
| `w`  | Kelime, Risale-i Nur'un Latin harfli baskılarındaki yazılışıyla (zorunlu) |
| `m`  | Manası (zorunlu). Aynı kelimenin kaynak lügatta birden çok satırı varsa her biri ayrı paragraftır (aralarında `\n`). |
| `o`  | Köken: `Ar.`, `Fa.`, `Tr.`, `Ar.-Fa.` … (isteğe bağlı; ekranda gösterilmez) |
| `f`  | Risale-i Nur'da karşılaşılma sıklığı: 3 çok sık, 2 sık, 1 seyrek — sıralamada kullanılır |
| `v`  | Başka baskılarda görülen farklı yazılışlar (isteğe bağlı; aramada kullanılır, ekranda gösterilmez) |

Lügatte **10.504 kelime ve ifade** var. Uygulama her mananın ilk cümlesini ("asıl mana")
kalın yazar; baştaki "(Çoğulu: …)", "(Bak: …)", "Tıb:", "1." gibi kısımlar buna katılmaz
(`lib/src/dictionary/meaning.dart`).

**Manaların kaynağı:**
- **9.571 kelimenin** manası RNK Neşriyat'ın Risale-i Nur lügatındaki (rnk.tr) metnin
  aynısıdır; hiçbir yorum ya da ek ifade katılmamıştır. Kelimeler o lügattaki satırlarla
  eşleştirilirken aynı yazılıp farklı olan kelimeler (hâkim / hakîm, âlem / alem, nefs
  "can" / nefs "üfürmek") ayırt edildi; eşleşmeler ikinci bir denetimden geçirildi. Bir
  satır başka bir satırın içinde aynen geçiyorsa tekrar etmesin diye alınmadı; yalnızca
  "(Bak: …)" diyen ya da boş satırlar da alınmadı.
- O lügatta bulunmayan **933 kelimenin** (ör. "Barla", bazı terkipler) manası daha önce
  hazırlanan manaların yalnızca ilk tanım kısmıdır; yorum ve açıklama cümleleri
  çıkarılmıştır. Bu kelimelerin listesi `tool/rnk_disi_kelimeler.txt` dosyasındadır.

**Telif:** RNK Neşriyat'ın telif sayfasına göre lügat dahil içeriklerin hakları yayınevine
aittir ve yayınevinin yazılı izni olmadan çoğaltılamaz. Uygulamayı yayımlamadan önce bu iznin
bulunduğundan emin olun.

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
  src/dictionary/meaning.dart      mananın kalın yazılacak ilk cümlesi ("asıl mana")
  src/focus/focus_mode.dart        Android odak modu kanalı
  src/ui/theme.dart                renkler (logodan) ve yazı tipleri
  src/ui/                          arama, mana, kaydedilenler ve ayarlar ekranları
android/app/src/main/kotlin/.../
  MainActivity.kt                  odak modunu ekrana gelince açar, ekrandan çıkınca kapatır
  FocusModeController.kt           uygulamaya ait "Rahatsız Etmeyin" kuralı (Android 10+)
assets/lugat.jsonl                 lügat
assets/fonts/                      Lora yazı tipi (SIL Open Font License, OFL.txt)
assets/images/logo_isaret.png      uygulama içi logo işareti
tool/lugat_kontrol.py              lügat dosyası denetleyicisi
tool/rnk_disi_kelimeler.txt        RNK lügatında bulunmayan kelimeler
tool/ikon_uret.py, tool/ikon/      uygulama simgeleri ve açılış görselleri logo.jpg'den üretilir
                                   (python3 tool/ikon_uret.py; Pillow ve numpy gerekir)
```

### Yayınlamadan önce

- Uygulama kimliği `io.github.emreks53.lugat_risale`; değiştirmek isterseniz
  `android/app/build.gradle.kts` ve iOS projesindeki Bundle Identifier'ı güncelleyin.
- Android sürüm derlemesi şimdilik hata ayıklama anahtarıyla imzalanır; Google Play için
  kendi imza anahtarınızı tanımlayın (`android/app/build.gradle.kts` → `signingConfigs`).
- iPhone sürümü bu ortamda derlenemedi (macOS/Xcode gerekir); Xcode'da imzalama ekibini
  seçip bir kez derleyip denemek gerekir.
