# Google Play mağaza bilgileri

Google Play Console'da "Ana mağaza girişi" ve "Uygulama içeriği" bölümleri için hazır metinler
ve cevaplar. Görseller bu klasördedir.

## Ana mağaza girişi

**Uygulama adı** (20/30 karakter)

```
Lügat-ı Risale-i Nur
```

**Kısa açıklama** (77/80 karakter)

```
Risale-i Nur okurken Osmanlıca kelimelerin manası: ilk harfleri yazmak yeter.
```

**Tam açıklama** (1764/4000 karakter)

```
Lügat-ı Risale-i Nur, Risale-i Nur Külliyatı'nı okurken karşılaştığınız Osmanlıca kelime ve terkiplerin manasını bir an içinde gösteren sade bir lügattir.

Kitabı okurken telefonunuz yanınızda olsun: uygulamayı açtığınızda arama kutusu hazır ve klavye açık gelir. Bilmediğiniz kelimenin ilk birkaç harfini yazmanız yeterlidir; uyan kelimeler ve manaları hemen altta listelenir.

◆ Zengin lügat
72.000'i aşkın kelime ve terkip; manaların neredeyse tamamı RNK Neşriyat'ın Risale-i Nur lügatındaki metniyle. Risale-i Nur'da sık geçen kelimeler aramada önce gelir.

◆ Kolay arama
• "in" yazınca inkişaf, inhisar, inayet… hemen listelenir.
• ş, ç, ğ, ı harflerini ve â, î, û gibi şapkaları yazmanız gerekmez.
• Ekli yazılan kelimenin kökü bulunur: "hakikatlerinden" → hakikat, "iman ediyor" → iman.
• Küçük yazım hatalarında doğru kelime önerilir.
• Birleşik ifadeler içindeki kelimeyle de bulunur; "(asm)", "r.a." gibi kısaltmalar açılır.

◆ Rahat okuma
• Her mananın asıl kısmı kalın yazılır.
• "Bakınız" gösterilen kelimelere tek dokunuşla geçilir.
• Büyük, okunaklı yazı; ayarlanabilir yazı boyutu; açık ve koyu tema.
• Son bakılan kelimeler ve kaydettikleriniz bir dokunuş uzağınızda.

◆ Dikkat dağıtmayan okuma
• Uygulama açıkken ekran kendiliğinden kapanmaz.
• Android 10 ve sonrasında, isteğe bağlı olarak, uygulama açıkken mesaj ve diğer bildirimler gizlenir; uygulamadan çıkınca her şey eski hâline döner. (Alarmlar ve yıldızlı kişilerin aramaları susturulmaz.)

◆ İnternet gerekmez, veri toplanmaz
Lügat uygulamanın içindedir; internet bağlantısı kullanılmaz. Hiçbir kişisel veri toplanmaz ya da paylaşılmaz; son bakılanlar ve kaydedilenler telefonunuzda saklanır, hiçbir yere gönderilmez.

Bu uygulama bağımsızdır; RNK Neşriyat'ın resmî uygulaması değildir.
```

**Görseller**

| Dosya | Play Console'daki yeri |
|---|---|
| `simge-512.png` | Uygulama simgesi (512×512) |
| `one-cikan-gorsel-1024x500.png` | Öne çıkan grafik (1024×500) |
| `ekran-goruntuleri/01…06.png` | Telefon ekran görüntüleri (1080×1920; en az 2, en çok 8) |

Görseller `tool/magaza/` altındaki araçla yeniden üretilebilir.

**Kategori:** Kitaplar ve Referans
**Etiketler (öneri):** Sözlük, Din, Eğitim

## Uygulama içeriği

**Gizlilik politikası:** `store/gizlilik-politikasi.md` metni (geliştirici adı ve iletişim
adresi doldurularak) herkese açık bir web sayfasında yayımlanmalı ve adresi buraya
girilmelidir (Play bunu her uygulama için ister). Aynı metin uygulamada Ayarlar > Gizlilik
politikası'nda da gösterilir.

**Reklamlar:** Uygulamada reklam yok.

**Uygulama erişimi:** Bütün işlevler giriş yapmadan kullanılabilir.

**İçerik derecelendirmesi (IARC anketi):** Kategori "Referans, haber veya eğitim". Şiddet,
cinsellik, kötü dil, kumar, kullanıcılar arası etkileşim, konum paylaşımı ve satın alma yok.

**Hedef kitle:** 13 yaş ve üzeri önerilir (uygulama çocuklara yönelik tasarlanmadı; "Aileler"
politikası gereklilikleri doğmaz).

**Veri güvenliği formu:**
- Uygulama kullanıcı verisi topluyor mu? **Hayır.**
- Uygulama kullanıcı verisini üçüncü taraflarla paylaşıyor mu? **Hayır.**
- (Son bakılanlar, kaydedilenler ve ayarlar yalnızca cihazda saklanır, hiçbir yere
  gönderilmez; Play'in tanımına göre bu "toplama" sayılmaz.)
- Uygulama internet izni istemez.

**İzinler ve gerekçeleri:**
- `ACCESS_NOTIFICATION_POLICY` (Rahatsız Etmeyin erişimi) — isteğe bağlı "dikkat dağıtmayan
  okuma": uygulama açıkken bildirimleri gizleyen ve uygulamadan çıkınca kapanan bir Rahatsız
  Etmeyin kuralı için. Kullanıcı izni Android ayarlarından kendisi verir; vermezse uygulama
  normal çalışır.
- Ekranın açık kalması için izin gerekmez (pencere bayrağıyla yapılır).

**Telif:** Manaların neredeyse tamamı RNK Neşriyat'ın Risale-i Nur lügatından alınmıştır.
Yayından önce yayınevinin yazılı izninin bulunduğundan emin olun. İzin alındıysa tam
açıklamanın sonundaki cümle şöyle değiştirilebilir: "Bu uygulama bağımsızdır; manalar RNK
Neşriyat'ın Risale-i Nur lügatından yayınevinin izniyle alınmıştır."
