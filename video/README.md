# Ahlâk Mu'cizesi — kodla üretilmiş 9:16 açıklayıcı video

Çıktı: `release/ahlak_mucizesi_9x16.mp4` (1080×1920, 30 fps, 2:04.67, H.264 + AAC, müziksiz).

Her şey kodla üretildi: 20 sahne Three.js ile modellenip başsız Chromium'da (SwiftShader) kare kare render edildi.
Ses efektleri `tools/sfx.py` ile sentezlendi; anlatım kullanıcının ses kaydıdır. Altyazılar kelime-zamanlıdır.
Harici görsel/video/ses üretim servisi kullanılmadı. Aydınlatma için yalnızca Poly Haven CC0 HDRI'ler, yazı için Google Fonts (OFL) kullanıldı.

## Yeniden üretme
```
npm i                                   # three, playwright
node tools/render.mjs --scene s05 --preview 0,2,4 --scale 0.5   # tek sahne önizleme
tools/render_all.sh 3                   # tüm sahne klipleri -> out/clips (0.85 iç ölçek)
python3 tools/captions.py               # out/captions.ass
python3 tools/build_cues.py && python tools/sfx.py --cues data/sfx_cues.json --out out/mix.wav
python3 tools/assemble.py --out out/final.mp4
```
- `BRIEF.md`: yönetmen notu (stil, dini hassasiyet kuralları, sahne sahne çekim listesi)
- `data/words.json`: anlatımın kelime zamanları (Whisper + metin hizalaması)
- `data/timeline.json`: sahne pencereleri
- `scenes/sNN.js`: sahneler; `engine/`: render motoru ve ortak model/efekt kütüphanesi
