#!/usr/bin/env bash
# Full render: parallel frame chunks -> concat -> SFX mix -> final H.264/AAC MP4.
# usage: tools/render_all.sh OUT_DIR [WORKERS=3]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:?out dir}
WORKERS=${2:-3}
FPS=30
TOTAL=$(grep -oP 'E.TOTAL = \K[0-9.]+' data/plan.js | cut -d. -f1)
FRAMES=$((TOTAL * FPS))
mkdir -p "$OUT"

# ending frames must be available next to index.html
if [ ! -e ending/frames/0001.png ]; then echo "WARNING: ending/frames missing (photoreal ending will show placeholder)"; fi

chunk=$(( (FRAMES + WORKERS - 1) / WORKERS ))
pids=()
for ((w = 0; w < WORKERS; w++)); do
  a=$((w * chunk)); b=$(((w + 1) * chunk)); [ $b -gt $FRAMES ] && b=$FRAMES
  node tools/render.cjs video --frames $a:$b --out "$OUT/part_$w.mp4" > "$OUT/part_$w.log" 2>&1 &
  pids+=($!)
done
fail=0
for p in "${pids[@]}"; do wait "$p" || fail=1; done
[ $fail -eq 0 ] || { echo "a render worker failed; see $OUT/part_*.log"; exit 1; }

: > "$OUT/parts.txt"
for ((w = 0; w < WORKERS; w++)); do echo "file 'part_$w.mp4'" >> "$OUT/parts.txt"; done
ffmpeg -y -loglevel error -f concat -safe 0 -i "$OUT/parts.txt" -c copy "$OUT/video_master.mp4"

node tools/render.cjs sfx --out "$OUT/cues.json"
python3 tools/sfx.py "$OUT/cues.json" data/ses.mp3 "$OUT/mix.wav" --total $TOTAL

ffmpeg -y -loglevel error -i "$OUT/video_master.mp4" -i "$OUT/mix.wav" \
  -map 0:v -map 1:a -c:v libx264 -preset slow -profile:v high -crf 15 -pix_fmt yuv420p -g 60 \
  -c:a aac -b:a 192k -movflags +faststart -shortest "$OUT/dunya-menzil.mp4"
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact "$OUT/dunya-menzil.mp4"
echo "done: $OUT/dunya-menzil.mp4"
