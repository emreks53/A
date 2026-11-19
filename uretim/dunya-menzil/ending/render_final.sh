#!/usr/bin/env bash
# Render the photoreal Külliyat closing shot to PNG frames (8-bit RGB, sRGB/AgX).
#
#   ./render_final.sh            # frames 1..180
#   ./render_final.sh 1 90       # a sub-range (run several ranges in parallel if you like)
#
# Resumable: existing frames are skipped (use_overwrite=False) and a placeholder
# is written when a frame starts (use_placeholder=True), so parallel workers on
# overlapping ranges do not duplicate work. Delete a frame file to re-render it.
#
# Environment overrides:
#   BLENDER            path to the Blender 4.2 binary
#   KULLIYAT_SCRATCH   scratch dir holding kulliyat.blend   (default below)
#   KULLIYAT_FRAMES    output dir for frame_####.png        (default: $KULLIYAT_SCRATCH/frames)
#   KULLIYAT_THREADS   Cycles CPU threads per worker        (default: 3)
#   KULLIYAT_SAMPLES   override max samples (default: value stored in the .blend, 8)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRATCH="${KULLIYAT_SCRATCH:-/tmp/claude-0/-home-user-A/3737c98a-16c9-5b73-ba90-75aaf1cd832c/scratchpad/ending}"
BLENDER="${BLENDER:-/tmp/claude-0/-home-user-A/3737c98a-16c9-5b73-ba90-75aaf1cd832c/scratchpad/tools/blender-4.2.9-linux-x64/blender}"
OUT="${KULLIYAT_FRAMES:-$SCRATCH/frames}"
THREADS="${KULLIYAT_THREADS:-3}"
SAMPLES="${KULLIYAT_SAMPLES:-}"
START="${1:-1}"
END="${2:-180}"
BLEND="$SCRATCH/kulliyat.blend"

mkdir -p "$SCRATCH" "$OUT"

# (Re)build the .blend when it is missing or older than its sources. A lock keeps
# parallel workers from building at the same time.
(
  flock 9
  needs_build=0
  [ -f "$BLEND" ] || needs_build=1
  for src in build_scene.py spec.py make_textures.py; do
    if [ -f "$BLEND" ] && [ "$HERE/$src" -nt "$BLEND" ]; then needs_build=1; fi
  done
  if [ "$needs_build" = 1 ]; then
    echo "[render_final] building $BLEND"
    "$BLENDER" -b --factory-startup -P "$HERE/build_scene.py" -- --blend "$BLEND"
  fi
) 9>"$SCRATCH/.build.lock"

echo "[render_final] frames $START..$END -> $OUT (threads=$THREADS)"
"$BLENDER" -b "$BLEND" -t "$THREADS" --python-expr "
import bpy
sc = bpy.context.scene
r = sc.render
r.use_overwrite = False
r.use_placeholder = True
r.threads_mode = 'FIXED'
r.threads = $THREADS
r.use_persistent_data = True
r.image_settings.file_format = 'PNG'
r.image_settings.color_mode = 'RGB'
r.image_settings.color_depth = '8'
smp = '$SAMPLES'
if smp:
    sc.cycles.samples = int(smp)
" -o "$OUT/frame_####" -s "$START" -e "$END" -a
