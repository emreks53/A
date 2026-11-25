#!/usr/bin/env bash
# Kareler + karışık ses → ana kopya (1080x1920, yüksek kalite) ve uygulama kopyası (720x1280, README ölçüleri).
# tools/encode.sh <kare_klasoru> <ses.wav> <cikis_klasoru> <ad>
set -euo pipefail
frames="$1"; audio="$2"; out="$3"; name="$4"
mkdir -p "$out"
ffmpeg -y -v error -framerate 30 -i "$frames/f%05d.png" -i "$audio" \
  -c:v libx264 -preset slow -crf 14 -profile:v high -pix_fmt yuv420p -tune animation \
  -x264-params "keyint=60:min-keyint=30" -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest \
  "$out/$name-1080x1920.mp4"
ffmpeg -y -v error -i "$out/$name-1080x1920.mp4" -vf "scale=720:1280:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -profile:v high -crf 23 -maxrate 2500k -bufsize 5000k -g 48 \
  -c:a aac -b:a 128k -movflags +faststart "$out/$name.mp4"
ffmpeg -y -v error -ss 1.0 -i "$out/$name.mp4" -frames:v 1 -q:v 4 "$out/$name-kapak.jpg"
ffmpeg -y -v error -ss 6 -i "$out/$name.mp4" -frames:v 1 -q:v 3 "$out/$name-onizleme.jpg"
ls -la "$out"
