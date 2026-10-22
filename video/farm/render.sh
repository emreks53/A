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
OUTDIR="$VIDEO/renders/$SHOT"; mkdir -p "$OUTDIR" "$VIDEO_OUT"
# Frames are kept per source ref (JOB_REF, set by node.sh) so that use_overwrite=False never picks up frames
# rendered from another ref. common.py writes to $VIDEO_OUT/frames/<shot>: Blender is run with VIDEO_OUT=$FROOT.
FROOT="$VIDEO_OUT${JOB_REF:+/ref/${JOB_REF//\//_}}"
FR="$FROOT/frames/$SHOT"
# pngs clean|check A B -- a frame is complete only if it ends with the PNG IEND chunk (length 0, "IEND",
# CRC AE426082); Blender killed mid-write (OOM) leaves a truncated, non-empty PNG that it would then skip.
# clean: delete the empty/truncated frames of A..B.  check: print the first missing/empty/truncated one, exit 1.
pngs() {
  python3 -c '
import os, sys
mode, d, shot, a, b = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
for f in range(a, b + 1):
    p = os.path.join(d, "%s_%05d.png" % (shot, f))
    try:
        with open(p, "rb") as h:
            h.seek(-12, 2)
            if h.read() == b"\0\0\0\0IEND\xaeB\x60\x82":
                continue
    except OSError:  # missing, or shorter than 12 bytes
        pass
    if mode == "check":
        print(p); sys.exit(1)
    if os.path.lexists(p):
        if os.path.getsize(p): print("[render.sh] removing truncated frame " + p, flush=True)
        os.remove(p)
' "$1" "$FR" "$SHOT" "$2" "$3"
}
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
  find "$FR" -name "${SHOT}_*.png" -size 0 -delete 2>/dev/null   # stale placeholders from an interrupted run
  pngs clean $a $b                                               # truncated frames from a killed run
  VIDEO_OUT="$FROOT" blender -b --factory-startup -noaudio --python-exit-code 1 -P "${SHOTS_DIR:-$VIDEO/blender}/shots/$SHOT.py" -- --final --from $a --to $b ${RENDER_ARGS:-} \
     > "$VIDEO_OUT/render_${SHOT}_$a.log" 2>&1 || { echo "[render.sh] BLENDER FAILED $a-$b (see $VIDEO_OUT/render_${SHOT}_$a.log)"; tail -20 "$VIDEO_OUT/render_${SHOT}_$a.log"; exit 1; }
  # every frame must exist and be complete (placeholders are 0 bytes, a killed write lacks IEND)
  p=$(pngs check $a $b) || { echo "[render.sh] missing frame $p"; exit 1; }
  ffmpeg -y -loglevel error -framerate 24 -start_number $a -i "$FR/${SHOT}_%05d.png" -frames:v $((b-a+1)) \
     -c:v libx264 -preset slow -crf 12 -pix_fmt yuv444p10le -g 24 -movflags +faststart "$OUTDIR/$NAME" || exit 1
  git -C "$REPO" add "video/renders/$SHOT/$NAME"
  git -C "$REPO" commit -q -m "render $SHOT frames $a-$b" || true
  push || echo "[render.sh] WARNING push failed for $NAME (will retry next chunk)"
  echo "[render.sh] DONE $NAME in $(( $(date +%s)-t0 ))s ($(du -h "$OUTDIR/$NAME" | cut -f1))"
  a=$((b+1))
done
push && echo "[render.sh] ALL DONE $SHOT $FROM-$TO"
