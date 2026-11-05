# Onuncu Söz · Tezyinat — video kaynağı

*Sözler, Onuncu Söz, 81. sayfa* ("Hem anlarsın ki şu dünyadaki tezyinat…" ve Hâşiyesi) için 9:16, 1080×1920, 30 fps,
72,4 saniyelik animasyon. Okunan cümlenin manası o anda ekranda canlanır; günümüz Türkçesinde kullanılmayan kelimelerin
karşılığı, kelime okunduğu anda alt yazı olarak çıkar (kutusuz, kelimenin kendisi yazılmaz).

| Çıktı | Yer |
| --- | --- |
| YouTube Shorts kopyası (1080×1920, H.264, ses −14 LUFS) | `cikti/onuncu-soz-tezyinat-1080x1920.mp4` |
| Uygulama kopyası (720×1280, README "Oku: video ekleme" ayarları) | `public/videolar/tezyinat.mp4` (+ `-kapak.jpg`, `-onizleme.jpg`) |

## Nasıl yapıldı

1. **Ses → zaman.** Kayıt (`audio/ses.mp3`) bilinen metne Meta MMS_FA ile kelime kelime zorla hizalandı
   (`tools/hizala.py` → `audio/kelimeler.json`, ±30 ms). `tools/make_timing.py` cümle bloklarını ve 14 anlam alt yazısını
   (`tezyinat → süslemeler`, `Rahman-ı Rahîm'in → sonsuz merhametli ve şefkatli olan Allah'ın` …) `engine/timing.js`'e yazar.
2. **Senaryo.** Üç bağımsız taslaktan (mana, sinema, infografik bakışları; `storyboard-taslaklar/`) seçilen ve yönetmen
   notlarıyla bağlanan `storyboard.md`: tek bir "kahraman gül" etrafında kesintisiz kamera yolculuğu; numune → asıl.
3. **Çizim.** Gerçekçi kitap dışında her kare Chromium'da Canvas 2D ile yordamsal çizilir (`engine/`, `scenes/A…K`).
   Ortak öğeler `engine/assets_flora.js` (gül, laleler, kelebekler, çavuşkuşu, nar, tavus tüyü, kar tanesi, bahçe) ve
   `engine/assets_objects.js` (İznik kâse, kum saati, kandil, fanus, Osmanlı kapısı, girih, seccade, Mescid-i Nebevî silueti).
   Son işlem: bloom, vinyet, film greni; hızlı hareketlerde zamansal örneklemeli hareket bulanıklığı.
4. **Kitap.** Risale-i Nur ciltleri Blender 4.5 Cycles ile gerçekçi render edilir: çok açık elit kırmızı deri (#D45A63),
   sıcak altın yaldız, sayfa 81'de metnin kendisi ve dipnotu (`blender/kitap.py`, dokular `blender/dokular.py`).
5. **Ses.** Müzik yok. Efektler dış dosya kullanmadan sentezlenir (`tools/sfx.py`, `tools/sfx_cues.json`): en yüksek
   anlarında konuşmanın ~17 LU altında, konuşma sırasında ayrıca 6 dB bastırılır.

## Kurallar (müşteri istekleri)

İnsan ve insan uzvu yok; kadın-kız yok; İslami öğeler yerinde ve az (seccade, Mescid-i Nebevî silueti, sekiz köşeli yıldız,
girih); tema uzay değil; ekrandaki tek yazılar anlam alt yazıları ve sondaki künye.

## Yeniden üretme

```bash
cd video-kaynak/onuncu-soz-tezyinat
python3 tools/make_timing.py                      # zamanlama (hizalama için tools/hizala.py: torch + torchaudio)
node tools/onizleme.mjs --range 2.3:6.7:0.25 --only B_bahce --out out/onizleme/B.jpg   # önizleme
# Blender kitabı (blender/ içinde): python3 dokular.py && blender -b -P kitap.py -- --bake && bash render_all.sh
node tools/render.mjs --workers 3 --fmt png       # tüm kareler → out/kareler/
python3 tools/hareket-bulanikligi.py && node tools/render.mjs --mb out/mb.json --only-mb   # hareket bulanıklığı
python3 tools/sfx.py                              # efektler + ham miks (numpy, scipy, soundfile)
bash tools/kodla.sh                               # −14 LUFS + H.264 (1080×1920 ve 720×1280)
```

Gereken: Node 22 + Playwright'ın Chromium'u, ffmpeg, ImageMagick, Python 3 (numpy, scipy, soundfile, Pillow), Blender 4.5.
`out/` ve `blender/tex/` üretilir, depoya girmez.

## Lisanslar

Yazı tipleri: Cormorant Garamond, Cinzel, Amiri (SIL OFL). Görüntü ve ses efektlerinin hepsi bu projede üretildi; hazır
görüntü, video ya da ses kullanılmadı (Shutterstock önizlemeleri filigranlı ve düşük çözünürlüklüdür, lisanslanmadan
kullanılamaz).
