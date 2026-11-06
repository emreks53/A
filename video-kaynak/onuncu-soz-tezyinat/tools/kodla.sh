#!/usr/bin/env bash
# Ses miksini −14 LUFS'a normalize eder ve kareleri H.264 videoya kodlar.
#  out/onuncu-soz-tezyinat-1080x1920.mp4  (ana kopya: YouTube Shorts)
#  out/onuncu-soz-tezyinat-720x1280.mp4   (uygulama: README "Oku: video ekleme" ayarları)
set -euo pipefail
cd "$(dirname "$0")/.."
# Doğrusal (linear) loudnorm için önce tepe sınırlama: ham miks ≈ −4 dBTP'ye yumuşakça sınırlanır,
# yoksa ffmpeg sessizce "dynamic" moda düşer (kazanç zamanla oynar, kuyruk şişer).
ffmpeg -v error -y -i out/ses/miks_ham.wav -af "alimiter=limit=0.60:attack=4:release=80:level=disabled" -c:a pcm_f32le out/ses/miks_sinirli.wav
IN=out/ses/miks_sinirli.wav
J=$(ffmpeg -hide_banner -nostats -i "$IN" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
mi=$(echo "$J" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["input_i"],d["input_tp"],d["input_lra"],d["input_thresh"],d["target_offset"])')
read -r II TP LRA TH OFF <<<"$mi"
ffmpeg -hide_banner -y -i "$IN" -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$II:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$TH:offset=$OFF:linear=true:print_format=json,aresample=48000" -c:a pcm_s24le out/ses/miks.wav 2>&1 | grep -o '"normalization_type" : "[a-z]*"' 
EXT=${FMT:-png}
ffmpeg -v error -y -framerate 30 -i "out/kareler/%05d.$EXT" -i out/ses/miks.wav \
  -c:v libx264 -preset slow -crf 15 -pix_fmt yuv420p -profile:v high -level 4.2 -g 60 -bf 2 \
  -x264-params "aq-mode=3:aq-strength=0.9:deblock=-1,-1" \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest out/onuncu-soz-tezyinat-1080x1920.mp4
ffmpeg -v error -y -i out/onuncu-soz-tezyinat-1080x1920.mp4 -vf "scale=720:1280:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow \
  -profile:v high -crf 23 -maxrate 2500k -bufsize 5000k -g 48 -c:a aac -b:a 128k -movflags +faststart out/onuncu-soz-tezyinat-720x1280.mp4
ls -la out/*.mp4
