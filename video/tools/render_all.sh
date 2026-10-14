#!/usr/bin/env bash
# Render all final scene clips (1080x1920 output, internal 0.85 scale) with N parallel workers.
# Usage: tools/render_all.sh [N=3] [scene ids...]
cd "$(dirname "$0")/.."
N=${1:-3}; shift || true
IDS=${@:-$(python3 -c "import json;print(' '.join(s['id'] for s in json.load(open('data/timeline.json'))['scenes']))")}
mkdir -p out/logs
printf '%s\n' $IDS | xargs -P "$N" -I{} sh -c 'node tools/render.mjs --scene {} --video --scale ${SCALE:-0.85} > out/logs/{}.log 2>&1 && echo "done {}" || echo "FAILED {}"'
