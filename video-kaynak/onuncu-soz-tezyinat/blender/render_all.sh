#!/usr/bin/env bash
# Tum Blender ciktilarini sirayla uretir (outro -> intro -> hero). Ilerleme: out/blender/render.log
# Kullanim: bash render_all.sh            (dokular.py ve "kitap.py -- --bake" bir kez calismis olmali)
set -u
cd "$(dirname "$0")"
B=/opt/blender/blender-4.5.15-linux-x64/blender
OUT=../out/blender
mkdir -p "$OUT"
LOG="$OUT/render.log"
SAMPLES=${SAMPLES:-8}
echo "$(date +%T) START samples=$SAMPLES" >> "$LOG"
OUTRO_START=${OUTRO_START:-0}   # >0: kesilmis outro renderini bu kareden surdur (onceki kareler korunur)
[ "$OUTRO_START" = "0" ] && rm -rf "$OUT/outro"
$B -b -t 3 -P kitap.py -- --shot outro --anim --samples "$SAMPLES" --start "$OUTRO_START" > "$OUT/blender_outro.out" 2>&1
echo "$(date +%T) outro done rc=$?" >> "$LOG"
rm -rf "$OUT/intro"
$B -b -t 3 -P kitap.py -- --shot intro --anim --samples "$SAMPLES" > "$OUT/blender_intro.out" 2>&1
echo "$(date +%T) intro done rc=$?" >> "$LOG"
if [ "${HERO:-1}" = "1" ]; then
  $B -b -t 3 -P kitap.py -- --shot hero --still --samples 96 --dnq HIGH > "$OUT/blender_hero.out" 2>&1
  echo "$(date +%T) hero done rc=$?" >> "$LOG"
fi
echo "$(date +%T) ALL DONE" >> "$LOG"
