# Yirminci Mektup'tan — dikey animasyon videosu

Risale-i Nur, Mektubat, Yirminci Mektup, 243. sayfa: *"Kat'iyen bil ki: Hilkatin en yüksek gayesi…"* okunuşuna
eşlik eden, okunan cümledeki manaları yansıtan animasyon. Model: "Kurzgesagt – In a Nutshell" kanalının anlatım
modeli (tema uzay değil, metnin manası). Üslup: Atölye Stil Kataloğu **S-232 "Filmde Renkli Kalem"** (mat
polyester çizim filminde renkli kalem: arka yüzden buğulu açık renk, önde saten kalem taraması, yerel rengin koyu
kalemiyle kontur).

- Çıktı: `cikti/yirminci-mektup.mp4` — 1080 × 1920 (9:16, Shorts), 30 fps, ~117 sn, H.264 + AAC.
- Müzik yok; ses efektleri yordamsal olarak sentezlenir ve kısıktır (konuşma baskın; konuşma sırasında efektler
  ayrıca kısılır).
- Günümüz Türkçesinde kullanılmayan kelimelerin karşılığı, kelimenin ilk harfi okunduğu an alt bantta zarif bir
  altyazı olarak çıkar (yalnız mana; kutu yok, kelimenin kendisi yazılmaz). Zamanlar ses kaydının harf düzeyinde
  zorunlu hizalamasından gelir.
- Sonda gerçekçi (Blender / Cycles ile fotoğraf gibi render edilmiş) Risale-i Nur Külliyatı ve Kur'an-ı Kerim ile
  kaynak: *Risale-i Nur · Mektubat · Yirminci Mektup · 243. Sayfa*.

## Yapı

```
veri/metin.txt         okunan metin
veri/ses.mp3           ses kaydı
veri/hizalama.json     harf düzeyinde zamanlar (Türkçe wav2vec2 CTC zorunlu hizalama; Whisper ile çapraz denetlendi)
veri/sozluk.json       eski kelimeler ve ekranda çıkacak karşılıkları
veri/zaman-tablosu.md  sahne sahne kelime zamanları ve altyazılar
motor/                 render motoru (Node + @napi-rs/canvas)
  temel.mjs            tuval, tohumlu rastgele, yumuşatmalar
  sekil.mjs            geometri, SVG yol çözücü
  kalem.mjs            S-232 kalem üslubu: oge() (önbellekli sprite), tarama, kontur, gökyüzü
  motifler.mjs         ortak motifler: nur küresi, marifet deseni, gül, nektar, ağaç, çiçek, kuş, tepe…
  insan.mjs            sade erkek figür (yandan / önden), yürüyüş
  sahne.mjs            kamera, paralaks, geçişler, film dokusu, kompozisyon
  zaman.mjs, altyazi.mjs
sahneler/              s01 … s10 (her cümle bir sahne) ve kapanis; zaman çizelgesi index.mjs'te
kapanis/               dokular.mjs (cilt sırtı ve Kur'an kapağı dokuları), sahne.py (Blender sahnesi),
                       kareler/ (render edilmiş iki fotoğraf: Kur'an'a ve Mektubat'a odaklı)
ses/                   sesler.mjs (sahnelerin ses ipuçları), sentez.py (efekt sentezi + miks)
render.mjs             kare kare render (PNG kareler, önizleme ya da tam video; çok süreçli)
uret.sh                tam üretim
YONERGE.md             sahne yönergesi (kurallar, üslup, senaryo)
```

## Üretim

```bash
npm install
./uret.sh                                   # PY=<numpy+scipy olan python> ISCI=4
node render.mjs --png deneme/ --kareler 3.2,40,100     # tek kareler
node render.mjs --sahne s05 --cikti deneme/s05.mp4 --olcek 0.5 --ses   # sahne önizlemesi
```

Kapanış fotoğrafları (Blender 4.5, ~CC0 dokular: Poly Haven *reading_room* HDRI, *european_walnut_veneer_04*,
*leather_white*):

```bash
node kapanis/dokular.mjs /tmp/kapanis/dokular
blender -b -P kapanis/sahne.py -- --doku /tmp/kapanis/dokular --tex <poly-haven-dokuları> --sabit --odak mektubat --olcek 120 --ornek 128 --cikti /tmp/kapanis/m_
blender -b -P kapanis/sahne.py -- --doku /tmp/kapanis/dokular --tex <poly-haven-dokuları> --sabit --odak kuran    --olcek 120 --ornek 128 --cikti /tmp/kapanis/k_
```
