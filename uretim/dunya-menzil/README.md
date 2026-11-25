# Dünya Menzil — "İman ve Küfür Muvazeneleri" (sf. 155) videosu

`dunya-menzil.mp4`: 1080×1920 (9:16), 30 fps, 100 sn, H.264 + AAC. Seslendirme A. Köseoğlu (RNK Neşriyat);
arka planda müzik yok, ses efektleri yumuşak, konuşmanın ~20 dB altında ve konuşma sırasında ayrıca kısılır.

- Stil: Atölye Stil Kataloğu **S-001 Suluboya**, Kurzgesagt anlatım modeliyle (her cümlenin manası, okunduğu
  anda canlanan görsel benzetmelerle). Kodla çizilir: `engine/` (suluboya WebGL katmanı, figür, mana
  altyazıları), `engine/props-*.js` (ortak öğeler), `scenes/s01–s20.js` (sahneler), `docs/STORYBOARD.md`.
- Eski kelimelerin bugünkü karşılıkları (`data/plan.js` → `E.GLOSSES`) kelimenin ilk sesi okunduğu anda çıkar;
  zamanlar sesin metne zorla hizalanmasından gelir (`tools/align.py`, `data/words.json`, ±0,04 sn).
- Kapanış: Risale-i Nur kitapları ve Kur'an-ı Kerim; Shutterstock yapay zekâsıyla üretilmiş ultra gerçekçi bir okuma
  köşesi fotoğrafı. `ending/finish_photo.py` renkleri birebir yapar (Risale #D68661, Kur'an #144173), kapaktaki beyaz
  hat ve işlemeleri, sırt başlıklarını ve açık sayfadaki metni perspektifle yerleştirir; `ending/photo_motion.py`
  derinlik haritasıyla kamera hareketi verir. (Eski Blender kapanışı `ending/build_scene.py` olarak duruyor.)

## Yeniden üretmek

```bash
cd uretim/dunya-menzil
python3 tools/make_words.py                      # data/words.json -> data/words.js
python3 ending/finish_photo.py FOTO.png ending/photo_spec.json ending/photo_final.png   # renk + yazılar
python3 ending/photo_motion.py ending/photo_final.png <kare klasörü>                   # 180 kare kamera hareketi
ln -s <kare klasörü> ending/frames
tools/render_all.sh /tmp/cikti 3                 # suluboya kareleri + ses efektleri + birleştirme
node tools/render.cjs shot s05 --n 12 --out /tmp/onizleme   # tek sahne önizlemesi
```
