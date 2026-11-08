#!/usr/bin/env bash
# Kismi yeniden render: "shot:bas:son" araliklari sirayla. Ilerleme: out/blender/render.log
# Ornek: bash render_kismi.sh outro:0:58 outro:106:129 intro:22:80
set -u
cd "$(dirname "$0")"
B=/opt/blender/blender-4.5.15-linux-x64/blender
OUT=../out/blender; LOG="$OUT/render.log"; SAMPLES=${SAMPLES:-8}
for R in "$@"; do
  IFS=: read -r SHOT S E <<< "$R"
  echo "$(date +%T) KISMI $SHOT $S-$E samples=$SAMPLES" >> "$LOG"
  $B -b -t 3 -P kitap.py -- --shot "$SHOT" --anim --samples "$SAMPLES" --start "$S" --end "$E" > "$OUT/blender_${SHOT}_${S}_${E}.out" 2>&1
  echo "$(date +%T) KISMI $SHOT $S-$E done rc=$?" >> "$LOG"
done
echo "$(date +%T) KISMI ALL DONE" >> "$LOG"
