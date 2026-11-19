# Mektubat · 29. Mektup · Üçüncü Nokta — guaj animasyon (dikey kısa video)

**Video:** `mektubat-29-ucuncu-nokta.mp4` — 1080×1920 (9:16), 30 fps, H.264 + AAC, 59,6 sn.

- **Üslup:** Atölye Stil Kataloğu **S-041 Guaj**. Örtücü, mat, tebeşirimsi düz renkler; fırça yönünde çizgilenme;
  yatay fırça vuruşlu gökyüzü; halkalı ışıklar. Kataloğun paleti esas alındı, manaya göre renk eklendi.
- **Model:** anlatılan cümlenin manası, o cümle okunurken ekranda canlanır. Hız Kurzgesagt ölçüsündedir;
  her kelimeye ayrı görsel konmadı.
- **Ses:** okuyucunun sesi baskındır. Müzik yoktur; yalnız kısık, sentezlenmiş ses efektleri vardır.
  Kayıttaki "Üçüncü Nokta" okunuşu kesildi (kaydın ilk 1,52 sn'si).
- **Kelime manaları:** eski kelimeler okunmaya başladığı anda manaları ekranda belirir. Kutu kullanılmaz,
  kelimenin aslı yazılmaz. Zamanlama, wav2vec2 CTC ile kelime kelime yapılan hizalamaya dayanır.
- **Kapanış:** Risale-i Nur Külliyatı'nın 14 cildi ve rahle üzerinde Kur'an-ı Kerim, kamerayla çekilmiş gibi
  fotogerçekçi bir sahnede gösterilir (Blender Cycles). Ekrana "Risale-i Nur · Mektubat · sf. 502" yazısı gelir.

## Sahne akışı

| Süre (sn) | Okunan | Ekranda |
|---|---|---|
| 0 – 5,6 | Bu dünya dârü'l-hikmettir, dârü'l-hizmettir; dârü'l-ücret ve mükâfat değil. | Dünya bahçesi. Güneşten fidana ve buluttan toprağa altın noktalı hikmet çizgileri uzanır. Adam gelir ve fidanı sular. Fidandan ücret kesesi ile hediye kutusu belirir, "değil" denince yukarı süzülürler. |
| 5,6 – 10,6 | Buradaki a'mal ve hizmetlerin ücretleri berzahta ve âhirettedir. | Fidandaki su parıltıları (ameller) kamerayla birlikte yükselir. Bir kısmı berzahta yıldız olur, kalanı bulutlar üstündeki âhiret bahçesine konar. |
| 10,6 – 14,8 | Buradaki a'mal, berzahta ve âhirette meyve verir. | Adam diz çöküp tohum eker. Işıklı bir gövde berzahtan geçer, orada tomurcuk verir. Âhirette ağaç olur ve meyve açar. |
| 14,8 – 20,5 | Madem hakikat budur, a'mal-i uhreviyeye ait neticeleri dünyada istememek gerektir. | Dünya, berzah ve âhiret tek eksende görünür; kamera meyvelere yaklaşır. Dünyada önüne bir meyve gelir. Adam avucuyla nazikçe geri çevirir, elini göğsüne koyar. |
| 20,5 – 24,4 | Verilse de memnunane değil, mahzunane kabul etmek lâzımdır. | Meyve yine de avuçlarına iner. Sevinçle zıplayan "hayalet" hâli silinir. Adam başını eğer, renkler soğur. |
| 24,4 – 31,6 | Çünkü cennetin meyveleri gibi kopardıkça yerine aynı gelmek sırrıyla, bâki hükmünde olan amel-i uhrevî meyvesini… | Meyveden âhiretteki dala geçilir. El meyveyi iki kez koparır, her seferinde aynısı yerine gelir. "Bâki"de meyvenin etrafında ebediyet halkası belirir. |
| 31,6 – 35,6 | …bu dünyada fâni bir surette yemek, kâr-ı akıl değildir. | Adamın farazi hâli (hayalet) meyveyi yer; meyve solar ve toza döner. Teraziye geçilir: bâki meyve tozdan ağır basar. |
| 35,6 – 42,0 | Bâki bir lambayı, bir dakika yaşayacak ve sönecek bir lamba ile mübadele etmek gibidir. | Nişte pirinç kandil ve ebediyet halkası. Yanında bir dakikalık kadranlı mum durur. Eller ikisini değiş tokuş eder, mum söner ve karanlık çöker. |
| 42,0 – 51,8 | İşte bu sırra binaen ehl-i velayet, hizmet ve meşakkat ve musibet ve külfeti hoş görüyorlar, nazlanmıyorlar, şekva etmiyorlar. | Kandil karanlıktan doğar. Veliler dağ yolunda yürür. Adam ibrikle fidan sular; yol dikleşir, fırtına çıkar, sırtına yük biner. Adımlarında çiçekler açar. Şikâyet bulutları dağılır. |
| 51,8 – 54,6 | اَلْحَمْدُ لِلّٰهِ عَلٰى كُلِّ حَالٍ diyorlar. | Zirvede bulutlar açılır ve adam dua eder. Hat altın yaldızla okunuşa eşzamanlı yazılır. |
| 54,6 – 59,6 | — | Fotogerçekçi Külliyat ve Kur'an-ı Kerim; ekranda "Risale-i Nur · Mektubat · sf. 502". |

## Yeniden üretim

- `engine/`: Canvas2D ile çizim, ardından WebGL ile guaj bitirme katmanı (kâğıt, boya kabartısı, kırık kenar).
  Headless Chromium (Playwright) ile render edilir.
  - Kare önizleme: `node preview.mjs <klasör> <saniye…> --tl=./timeline.js`
  - Video: `node render.mjs cikti.mp4 --tl=./timeline.js --from=0 --to=59.6 --workers=2`
  - `STYLE.md` üslup ve sahne sözleşmesini anlatır; `timing.js` kelime başlangıçlarını ve manaların zamanlarını tutar.
- `endcard/build_scene.py`: Blender 4.5 ile fotogerçekçi kapanış sahnesi. Dokular betiğin içinde üretilir.
- `sfx/`: `make_sfx.py` (`cues.json`'dan efekt sentezi) → `mix.py` (ses temizliği, efekt kısma, -14 LUFS) → `analyze.py` (ölçüm raporu).
- `hizalama/`: wav2vec2 CTC kelime hizalaması (`align.py`) ve `timing.js` üretimi (`gen_timing.py`).

Not: Kapanış kareleri depoda tutulmaz. `endcard/build_scene.py` ile Blender'da `endcard/frames/f_0001.png … f_0150.png`
olarak üretilir; `engine/endframes` bu klasörü göstermelidir (`ln -s ../endcard/frames engine/endframes`).
Yazı tipleri Google Fonts'tan (SIL Open Font License): Amiri, Cormorant Garamond, Cormorant SC, EB Garamond, Marcellus.
