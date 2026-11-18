#!/bin/bash
# Videonun tamamını üretir: ses efektleri + miks, kare kare görüntü (4 süreç), birleştirme.
# Çıktı: cikti/yirminci-mektup.mp4 (1080 × 1920, 30 fps, H.264 + AAC)
# Kapanış fotoğrafları kapanis/kareler/ altında olmalı (kapanis/sahne.py ile Blender'da üretilir).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p cikti
PY=${PY:-python3}
node ses/sesler.mjs
$PY ses/sentez.py veri/sesler.json veri/ses.mp3 cikti/ses-miks.wav 117
node render.mjs --bas 0 --son 117 --cikti cikti/goruntu.mp4 --isci "${ISCI:-4}" --crf 10
ffmpeg -y -loglevel error -i cikti/goruntu.mp4 -i cikti/ses-miks.wav \
  -c:v libx264 -preset slow -profile:v high -crf 16 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 192k -ar 48000 -shortest -metadata title="Yirminci Mektup'tan" cikti/yirminci-mektup.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 cikti/yirminci-mektup.mp4
