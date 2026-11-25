# Sözler · Yirminci Söz · s. 285 — video üretim kaynağı

Dikey (9:16) Kurzgesagt modelinde anlatım videosu: okunan cümlenin manası o anda canlanır.
Stil: Atölye Stil Kataloğu **S-057 Suluboya Kalemi** — resmin yarısı ıslak fırçayla çözülmüş suluboya
(çiçeklenme, tanecik, kuruma kenarı), yarısı kuru renkli kalem taraması; beyaz soğuk pres kâğıt.

## Akış

| Dosya | İş |
| --- | --- |
| `wc.py` | Render motoru: kâğıt dişi, kalem vuruşu (basınç + zaman haritası), tarama üreteci, ıslak çözülme, öğe durumu (çizilerek / ıslanarak belirme), sahne düzeyinde ıslak alan |
| `comp.py` | Kamera, yerleştirme, yoğunluk uzayında birleştirme (renk = kâğıt × exp(−D)), kâğıt kabartısı, deckle kenar, ıslak silme geçişleri |
| `kit.py`, `assets_*.py`, `man.py` | Ortak çizim kiti ve nesneler; eklemli yan görünüş adam, önden/arkadan figür |
| `sc_*.py` | Sahneler (kurulum + koreografi), `film.py` zaman çizelgesi ve geçişler |
| `gloss.py` | Lügat alt yazısı (kelimenin ilk sesinden 40 ms önce, kutusuz, yığılır) |
| `timing.json` | Ses kaydından kelime zamanları (faster-whisper large-v3 + MMS CTC zorunlu hizalama, spektrogramla doğrulandı) |
| `mix.py` | Anlatıcı (dokunulmaz) + kısık efektler (anlatıcının ~30 dB altı), müzik yok |
| `assemble.sh` | Kareler + miks → 1080×1920 ana video ve 720×1280 uygulama sürümü, kapak/önizleme |

Kapanıştaki kitaplar Blender (bpy 5.3, Cycles) ile ayrı render edilir; `sc_books.py` kahraman kareyi
yavaş kamera itişi ve film greniyle kullanır, künyeyi üstüne yazar.

```bash
python3 film.py --t0 0 --t1 43 --out final --procs 4   # kareler (sahne varlıkları cache/ altında önbelleğe alınır)
bash assemble.sh misafir-ve-vazife
```

Klasörler: `sahneler/` (render motoru ve sahneler), `ses/` (efekt üreteci), `kitaplar/` (Blender kapanış
çekimi). Kodun beklediği komşu klasörler depoya konmadı, yeniden kurulur: `fonts/` (EB Garamond, Cormorant
Garamond — Google Fonts, OFL), `data/ne_110m_land.geojson` (Natural Earth, kamu malı), `audio/src.mp3`
(okuma kaydı), `sfx/` (`ses/make_sfx.py` çıktısı), `books2/` (`kitaplar/scene.py` çıktısı, Poly Haven CC0
dokularıyla).

## Kurallar (sonraki videolar için)

- Lügat: yeni karşılık gelirken eskisi ekrandan gider (0,14 sn içinde yukarı kayıp söner); ekranda hep tek satır.
- İslam'ı temsil etmeyen mistik ögeler kullanılmaz (sihirli lamba benzeri kandil, "her şeyi gören göz" gibi
  semboller). Bu videoda kandil seccadeyle, büyük göz dünyaya bakan adamla değiştirildi.
- Kapanış sahnesi her videoda farklı bir mekân olmalı; ultra gerçekçi, kamera çekiminden ayırt edilemez.
  Risale-i Nur ciltleri #D68661, Kur'an-ı Kerim #144173 (beyaz yazı ve işleme), Kur'an rahle/aparat üzerinde
  değil, en güzel yerde doğal ve düzgün; bir Risale açık, okunuyormuş gibi.
