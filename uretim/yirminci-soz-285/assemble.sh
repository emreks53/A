#!/bin/bash
# Kareler + miks → ana video (1080x1920) ve uygulama sürümü (720x1280, README'deki ayarlar)
set -e
cd "$(dirname "$0")"
ID=${1:-misafir-ve-vazife}
mkdir -p deliver
python3 mix.py
ffmpeg -hide_banner -loglevel error -y -framerate 30 -i final/f_%05d.png -i out/mix.wav \
  -c:v libx264 -preset slow -crf 14 -profile:v high -pix_fmt yuv420p -g 60 \
  -c:a aac -b:a 256k -movflags +faststart -shortest deliver/${ID}-1080x1920.mp4
ffmpeg -hide_banner -loglevel error -y -i deliver/${ID}-1080x1920.mp4 \
  -vf "scale=720:1280:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow \
  -profile:v high -crf 23 -maxrate 2500k -bufsize 5000k -g 48 -c:a aac -b:a 128k -movflags +faststart \
  deliver/${ID}.mp4
ffmpeg -hide_banner -loglevel error -y -ss 0.5 -i deliver/${ID}.mp4 -frames:v 1 -q:v 4 deliver/${ID}-kapak.jpg
ffmpeg -hide_banner -loglevel error -y -ss ${ONIZLEME:-1.9} -i deliver/${ID}.mp4 -frames:v 1 -q:v 3 deliver/${ID}-onizleme.jpg
ls -la deliver/
