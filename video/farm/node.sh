#!/usr/bin/env bash
# Render-farm node. Polls video/farm/jobs.json on origin/render-src for jobs assigned to this node,
# renders them with render.sh (chunked, resumable, pushed after every chunk) and exits when the
# director marks the queue finished and all of this node's jobs are done.
#
#   git checkout -b render-out-<node>          # once
#   bash video/farm/node.sh <node>             # run in background; safe to re-run any time
set -uo pipefail
NODE=$1
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO"
export VIDEO_ASSETS=${VIDEO_ASSETS:-$REPO/video/.assets} VIDEO_OUT=${VIDEO_OUT:-$REPO/video/.out}
export PUSH_BRANCH=${PUSH_BRANCH:-render-out-$NODE}
mkdir -p "$VIDEO_OUT/node_done"
while true; do
  git fetch -q origin render-src 2>/dev/null || { sleep 30; continue; }
  git show origin/render-src:video/farm/jobs.json > "$VIDEO_OUT/jobs.json" 2>/dev/null || echo '{"finished":false,"jobs":[]}' > "$VIDEO_OUT/jobs.json"
  mapfile -t MY < <(python3 -c "
import json; d=json.load(open('$VIDEO_OUT/jobs.json'))
for j in d['jobs']:
    if j['node']=='$NODE': print(j['branch'], j['shot'], j['from'], j['to'], j.get('ref', 'origin/'+j['branch']))")
  FIN=$(python3 -c "import json; print(int(json.load(open('$VIDEO_OUT/jobs.json')).get('finished', False)))")
  pending=0
  for line in "${MY[@]}"; do
    read BR SHOT F T REF <<< "$line"
    MARK="$VIDEO_OUT/node_done/${SHOT}_${F}_${T}"
    [ -e "$MARK" ] && continue
    pending=1
    echo "[node $NODE] job $BR $SHOT $F-$T"
    git fetch -q origin "$BR" && git checkout -q "$REF" -- video/blender || { echo "[node $NODE] fetch failed $BR"; sleep 60; continue; }
    if bash video/farm/render.sh "$SHOT" "$F" "$T"; then touch "$MARK"; echo "[node $NODE] JOB DONE $SHOT $F-$T"; else echo "[node $NODE] JOB FAILED $SHOT $F-$T"; sleep 60; fi
  done
  if [ "$pending" = 0 ]; then
    [ "$FIN" = 1 ] && { echo "[node $NODE] QUEUE FINISHED"; exit 0; }
    sleep 240
  fi
done
