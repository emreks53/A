# Dünya Menzil — "İman ve Küfür Muvazeneleri" (sf. 155) videosu

`dunya-menzil.mp4`: 1080×1920 (9:16), 30 fps, 100 sn, H.264 + AAC. Seslendirme A. Köseoğlu (RNK Neşriyat);
arka planda müzik yok, ses efektleri konuşmanın ~17 dB altında ve konuşma sırasında ayrıca kısılır.

- Stil: Atölye Stil Kataloğu **S-001 Suluboya**, Kurzgesagt anlatım modeliyle (her cümlenin manası, okunduğu
  anda canlanan görsel benzetmelerle). Kodla çizilir: `engine/` (suluboya WebGL katmanı, figür, mana
  altyazıları), `engine/props-*.js` (ortak öğeler), `scenes/s01–s20.js` (sahneler), `docs/STORYBOARD.md`.
- Eski kelimelerin bugünkü karşılıkları (`data/plan.js` → `E.GLOSSES`) kelimenin ilk sesi okunduğu anda çıkar;
  zamanlar sesin metne zorla hizalanmasından gelir (`tools/align.py`, `data/words.json`, ±0,04 sn).
- Kapanış: Risale-i Nur Külliyatı ve Kur'an-ı Kerim, Blender/Cycles ile fotogerçekçi (`ending/`).

## Yeniden üretmek

```bash
cd uretim/dunya-menzil
python3 tools/make_words.py                      # data/words.json -> data/words.js
ending/render_final.sh                           # kapanış kareleri (Blender 4.2, uzun sürer)
ln -s <kare klasörü> ending/frames               # render_final.sh'in yazdığı frames/ klasörü
tools/render_all.sh /tmp/cikti 3                 # suluboya kareleri + ses efektleri + birleştirme
node tools/render.cjs shot s05 --n 12 --out /tmp/onizleme   # tek sahne önizlemesi
```
