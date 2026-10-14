#!/usr/bin/env bash
# Render 6-frame review sheets (scale 0.4) for given scenes, sequentially -> out/review/<id>.jpg
cd "$(dirname "$0")/.."; mkdir -p out/review
for id in "$@"; do
  T=$(python3 -c "import json;s=[x for x in json.load(open('data/timeline.json'))['scenes'] if x['id']=='$id'][0];d=s['end']-s['start'];print(','.join(f'{v:.2f}' for v in [0.15,d*.2,d*.4,d*.6,d*.8,d-0.1]))")
  node tools/render.mjs --scene $id --preview $T --scale 0.4 --cols 6 > out/review/$id.log 2>&1
  cp out/preview/${id}_sheet.jpg out/review/$id.jpg 2>/dev/null && echo "sheet $id" || echo "FAIL $id"
done
