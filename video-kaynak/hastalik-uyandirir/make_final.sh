#!/usr/bin/env bash
# Tam video: kareler → ses miksi → birleştirme → ana kopya (1080x1920) + uygulama kopyası (720x1280)
set -euo pipefail
cd "$(dirname "$0")"
WORKERS=${WORKERS:-4}
END=$(node -e "console.log(require('./scenes/index').END)")
echo "Süre: $END sn"
# kaynak sahnesi fotoğrafı ham RGBA olarak yüklenir (eşzamanlı)
[ -f books/books_final.rgba ] || python3 -c "from PIL import Image; open('books/books_final.rgba','wb').write(Image.open('books/books_final_8bit.png').convert('RGBA').tobytes())"
if [ "${SKIP_VIDEO:-0}" != "1" ]; then
  node render.js video --from 0 --to "$END" --workers "$WORKERS" --out render/video_noaudio.mp4
fi
node audio/dump_cues.js audio/cues.json
python3 audio/sfx.py audio/cues.json audio/narration.mp3 audio/mix.wav "$END"
# ana kopya: yüksek kalite
ffmpeg -hide_banner -loglevel error -y -i render/video_noaudio.mp4 -i audio/mix.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 15 -profile:v high -pix_fmt yuv420p -tune animation \
  -x264-params "keyint=60:min-keyint=30" -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest \
  render/hastalik-uyandirir_1080x1920.mp4
# uygulama kopyası (README: 720x1280, +faststart)
ffmpeg -hide_banner -loglevel error -y -i render/hastalik-uyandirir_1080x1920.mp4 \
  -vf "scale=720:1280:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -profile:v high -crf 23 \
  -maxrate 2500k -bufsize 5000k -g 48 -c:a aac -b:a 128k -movflags +faststart render/app.mp4
ffmpeg -hide_banner -loglevel error -y -ss 0.5 -i render/app.mp4 -frames:v 1 -q:v 4 render/app-kapak.jpg
ffmpeg -hide_banner -loglevel error -y -ss 6 -i render/app.mp4 -frames:v 1 -q:v 3 render/app-onizleme.jpg
ls -la render/*.mp4 render/*.jpg
