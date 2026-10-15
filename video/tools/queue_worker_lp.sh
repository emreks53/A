#!/bin/sh
# Render-queue worker using Mesa llvmpipe (needs Xvfb). Same queue as queue_worker.sh.
cd "$(dirname "$0")/.."
Q=out/render_queue.txt; touch $Q; mkdir -p out/logs_v2 out/clips_v2
while [ ! -f out/render_queue.stop ]; do
  id=$(flock $Q.lock sh -c "head -n 1 $Q; sed -i '1d' $Q")
  if [ -z "$id" ]; then sleep 20; continue; fi
  echo "$(date +%H:%M:%S) start $id ($$ llvmpipe)" >> out/render_queue.log
  if nice -n ${NICE:-10} xvfb-run -a -s "-screen 0 1280x2000x24" node tools/render.mjs --scene $id --video --scale 1.0 --out out/clips_v2/$id.mp4 --final --quality 0.97 --gl llvmpipe > out/logs_v2/$id.log 2>&1; then
    echo "$(date +%H:%M:%S) done $id" >> out/render_queue.log
  else echo "$(date +%H:%M:%S) FAILED $id" >> out/render_queue.log; fi
done
