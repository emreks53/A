#!/usr/bin/env bash
# Persistent render worker: pops scene ids from out/render_queue.txt (one per line) and renders v2 clips.
# Start N workers in background; append ids to the queue any time; touch out/render_queue.stop to end.
cd "$(dirname "$0")/.."
Q=out/render_queue.txt; touch $Q; mkdir -p out/logs_v2 out/clips_v2
while [ ! -f out/render_queue.stop ]; do
  id=$(flock $Q.lock sh -c "head -n 1 $Q; sed -i '1d' $Q")
  if [ -z "$id" ]; then sleep 20; continue; fi
  echo "$(date +%H:%M:%S) start $id ($$)" >> out/render_queue.log
  if nice -n ${NICE:-10} node tools/render.mjs --scene $id --video --scale 1.0 --out out/clips_v2/$id.mp4 --final --quality 0.97 > out/logs_v2/$id.log 2>&1; then
    echo "$(date +%H:%M:%S) done $id" >> out/render_queue.log
  else
    echo "$(date +%H:%M:%S) FAILED $id" >> out/render_queue.log
  fi
done
