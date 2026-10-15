#!/usr/bin/env bash
# v2 final renders: full internal resolution, clips into out/clips_v2. Usage: tools/render_v2.sh N id...
cd "$(dirname "$0")/.."
N=${1:-1}; shift
mkdir -p out/logs_v2 out/clips_v2
printf '%s\n' "$@" | xargs -P "$N" -I{} sh -c 'node tools/render.mjs --scene {} --video --scale 1.0 --out out/clips_v2/{}.mp4 --final --quality 0.97 > out/logs_v2/{}.log 2>&1 && echo "done {}" || echo "FAILED {}"'
