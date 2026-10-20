#!/usr/bin/env bash
# Final render of one shot (or a frame range of it), in chunks. Each finished chunk is encoded to a
# visually-lossless 10-bit 4:4:4 H.264 file and committed + pushed immediately, so progress survives
# container loss. Fully resumable: re-run the same command and it skips chunks already committed.
#
#   bash video/farm/render.sh <shot> [from_frame] [to_frame_inclusive] [chunk_size]
#
# Env: PUSH_BRANCH (default: current branch), VIDEO_ASSETS, VIDEO_OUT.
set -uo pipefail
SHOT=$1
VIDEO="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$VIDEO/.." && pwd)"
read F0 F1 < <(python3 -c "
import json,sys; d=json.load(open('$VIDEO/timing/shots.json'))
s=[x for x in d['shots'] if x['id']=='$SHOT'][0]; print(s['render_f0'], s['render_f1']-1)")
FROM=${2:-$F0}; TO=${3:-$F1}; CHUNK=${4:-48}
BRANCH=${PUSH_BRANCH:-$(git -C "$REPO" rev-parse --abbrev-ref HEAD)}
export VIDEO_OUT=${VIDEO_OUT:-$VIDEO/.out}
OUTDIR="$VIDEO/renders/$SHOT"; mkdir -p "$OUTDIR"
FR="$VIDEO_OUT/frames/$SHOT"
push() {
  for i in 1 2 3 4 5; do
    git -C "$REPO" push -q -u origin "HEAD:$BRANCH" && return 0
    git -C "$REPO" pull -q --rebase origin "$BRANCH" || true
    sleep $((2**i))
  done
  return 1
}
a=$FROM
while [ "$a" -le "$TO" ]; do
  b=$((a+CHUNK-1)); [ "$b" -gt "$TO" ] && b=$TO
  NAME=$(printf "%s_%05d_%05d.mp4" "$SHOT" "$a" "$b")
  if [ -s "$OUTDIR/$NAME" ] && git -C "$REPO" ls-files --error-unmatch "video/renders/$SHOT/$NAME" >/dev/null 2>&1; then
    echo "[render.sh] skip $NAME (already committed)"; a=$((b+1)); continue
  fi
  t0=$(date +%s)
  blender -b --factory-startup -noaudio --python-exit-code 1 -P "$VIDEO/blender/shots/$SHOT.py" -- --final --from $a --to $b \
     > "$VIDEO_OUT/render_${SHOT}_$a.log" 2>&1 || { echo "[render.sh] BLENDER FAILED $a-$b (see $VIDEO_OUT/render_${SHOT}_$a.log)"; tail -20 "$VIDEO_OUT/render_${SHOT}_$a.log"; exit 1; }
  # every frame must exist and be non-empty (placeholders are 0 bytes)
  for f in $(seq $a $b); do
    p=$(printf "%s/%s_%05d.png" "$FR" "$SHOT" $f)
    [ -s "$p" ] || { echo "[render.sh] missing frame $p"; exit 1; }
  done
  ffmpeg -y -loglevel error -framerate 24 -start_number $a -i "$FR/${SHOT}_%05d.png" -frames:v $((b-a+1)) \
     -c:v libx264 -preset slow -crf 12 -pix_fmt yuv444p10le -g 24 -movflags +faststart "$OUTDIR/$NAME" || exit 1
  git -C "$REPO" add "video/renders/$SHOT/$NAME"
  git -C "$REPO" commit -q -m "render $SHOT frames $a-$b" || true
  push || echo "[render.sh] WARNING push failed for $NAME (will retry next chunk)"
  echo "[render.sh] DONE $NAME in $(( $(date +%s)-t0 ))s ($(du -h "$OUTDIR/$NAME" | cut -f1))"
  a=$((b+1))
done
push && echo "[render.sh] ALL DONE $SHOT $FROM-$TO"
