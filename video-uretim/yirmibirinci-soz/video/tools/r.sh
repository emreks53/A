#!/bin/bash
# Machine-wide render gate (lead's tool). Usage, from anywhere:
#   /home/user/work/video/tools/r.sh still --scene main --t 2.5 --ss 2 --out out/x.png
#   /home/user/work/video/tools/r.sh video --scene main --from 0 --to 12.2 --scale 0.5 --ss 2 --out out/x.mp4
# Same arguments as `node tools/render.mjs …`. At most $RENDER_SLOTS (default 2) renders run at once on this
# 4-core / 16 GB machine, and a render only starts when enough memory is free; extra calls wait their turn
# (a line is printed while waiting; starts are staggered by 8 s).
# Memory guard: a `video` is forced to --workers 2 at most, and a FULL-SIZE video (--scale 1, supersampled:
# 3–5 GB per worker) is forced to --workers 1 unless RENDER_FINAL=1 is set (the lead's final render only).
cd /home/user/work/video || exit 1
. tools/_gate.sh
args=("$@")
if [ "${args[0]}" = "video" ]; then
  scale=1; ss=""; wi=-1
  for ((i=1; i<${#args[@]}; i++)); do
    case "${args[$i]}" in
      --scale) scale="${args[$((i+1))]}";;
      --ss) ss="${args[$((i+1))]}";;
      --workers) wi=$((i+1));;
    esac
  done
  heavy=$(awk -v s="$scale" -v ss="$ss" 'BEGIN{ if (ss=="") ss=(s>=1?2:1); print (s*ss>1.01)?1:0 }')
  maxw=2; if [ "$heavy" = 1 ] && [ "${RENDER_FINAL:-0}" != 1 ]; then maxw=1; fi
  if [ $wi -ge 0 ]; then
    if [ "${args[$wi]}" -gt "$maxw" ] 2>/dev/null; then args[$wi]=$maxw; fi
  else
    args+=(--workers "$maxw")
  fi
fi
gate_run node tools/render.mjs "${args[@]}"
