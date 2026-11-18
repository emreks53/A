#!/bin/bash
# Videonun tamamını üretir: ses efektleri + miks, kare kare görüntü, birleştirme.
# Çıktı: cikti/yirminci-mektup.mp4 (1080 × 1920, 30 fps, H.264 + AAC)
# Kapanış fotoğrafları kapanis/kareler/ altında olmalı (kapanis/sahne.py ile Blender'da üretilir).
# Bellek sınırlı kalsın diye görüntü sahne sahne (her bölüm ISCI süreçle) render edilip birleştirilir.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p cikti/bolumler
PY=${PY:-python3}
ISCI=${ISCI:-4}
node ses/sesler.mjs
$PY ses/sentez.py veri/sesler.json veri/ses.mp3 cikti/ses-miks.wav 117
# bölüm sınırları: her sahnenin başı (çakışmalar önceki bölüme değil, yeni sahnenin bölümüne düşer)
SINIRLAR=$(node -e "import('./sahneler/index.mjs').then(m=>{const s=m.ZAMAN.map(z=>z.bas);s.push(m.TOPLAM_SURE);console.log(s.join(' '))})")
read -ra S <<< "$SINIRLAR"
: > cikti/bolumler/liste.txt
for ((i=0; i<${#S[@]}-1; i++)); do
  b=cikti/bolumler/bolum$(printf %02d $i).mp4
  if [ ! -f "$b" ]; then
    node render.mjs --bas "${S[$i]}" --son "${S[$((i+1))]}" --cikti "$b.tmp.mp4" --isci "$ISCI" --crf 10
    mv "$b.tmp.mp4" "$b"
  fi
  echo "file '$(realpath "$b")'" >> cikti/bolumler/liste.txt
done
ffmpeg -y -loglevel error -f concat -safe 0 -i cikti/bolumler/liste.txt -c copy cikti/goruntu.mp4
ffmpeg -y -loglevel error -i cikti/goruntu.mp4 -i cikti/ses-miks.wav \
  -c:v libx264 -preset slow -profile:v high -crf 16 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 192k -ar 48000 -shortest -metadata title="Yirminci Mektup'tan" cikti/yirminci-mektup.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 cikti/yirminci-mektup.mp4
