# Hastalık uyandırır — video kaynağı

Lem'alar · Yirmi Beşinci Lem'a · Üçüncü Deva · 240. sayfa ("Ey tahammülsüz hasta! İnsan bu dünyaya keyif sürmek…").
Dikey (1080×1920, 30 fps, 122 sn) video. Okunan cümlenin manası o anda ekranda canlanır (Kurzgesagt modeli);
üslup Atölye Stil Kataloğu **S-042 Akrilik**. Bütün kareler kodla çizilir; sondaki Risale-i Nur Külliyatı ve
Kur'an-ı Kerim fotoğrafı Blender Cycles ile işlendi (`books/build_books.py`).

Uygulamadaki kopya: `public/videolar/hastalik-uyandirir.mp4` (720×1280).

## Yapı

| Yol | İçerik |
|---|---|
| `engine/` | Çekirdek: akrilik fırça darbeleri ve ton katmanları (`paint.js`), ortak nesneler (`props.js`), insan figürü iskeleti (`man.js`), kelime anlamı alt yazıları (`gloss.js`) |
| `scenes/` | 27 sahne (`s01.js`…`s27.js`), zaman çizelgesi ve geçişler (`index.js`), yardımcı modüller (`_*.js`) |
| `timing.json` | Ses kaydındaki her kelimenin başlangıcı (wav2vec2 Türkçe CTC zorunlu hizalama, ±0,03 sn) ve anlamlar |
| `STORYBOARD.md`, `STYLE.md` | Sahne senaryosu (kelime zamanlarıyla) ve üslup kuralları |
| `audio/` | Anlatım, yordamsal ses efektleri ve miks (`sfx.py`: efektler konuşmanın ~17 LU altında, konuşma varken ayrıca kısılır; toplam −14 LUFS; müzik yok) |
| `align/` | Hizalama betikleri |
| `books/` | Blender sahnesi, işlenmiş fotoğraf ve Poly Haven künyesi |

## Yeniden işleme

```bash
npm install                      # @napi-rs/canvas
pip install numpy scipy soundfile pillow
node render.js scene s05 8       # bir sahnenin temas sayfası → render/scene_s05.png
node render.js still 61.3 kare.png
./make_final.sh                  # bütün kareler + ses → render/hastalik-uyandirir_1080x1920.mp4 ve render/app.mp4
```

`node render.js video` kareleri 6 saniyelik parçalar hâlinde `render/seg/` altına işler; bir sahneyi değiştirince
yalnız ilgili parçaları silip yeniden çalıştırmak yeter.

Kelime anlamları (`timing.json` → `glosses`) eski kelimenin ilk harfi okunduğu karede çıkar; kutu yok, kelimenin
kendisi yazılmaz.
