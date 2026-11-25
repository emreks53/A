#!/usr/bin/env bash
# Verilen zamanlardaki kareleri üretip tek bir temas sayfasında birleştirir.
# tools/sheet.sh <cikis.png> t1 t2 t3 ...
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
out="$1"; shift
tmp="$(mktemp -d)"
node "$here/tools/shot.mjs" index.html "$tmp" "$@" > /dev/null
cd "$tmp"
for f in t*.png; do convert "$f" -resize 270x480 -gravity south -background '#111' -splice 0x26 -fill '#ddd' -pointsize 18 -annotate +0+4 "${f%.png}" "s_$f"; done
montage s_t*.png -tile 6x -geometry +3+3 -background '#111' "$out"
rm -rf "$tmp"
echo "$out"
