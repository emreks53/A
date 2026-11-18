#!/bin/bash
# Tek tek bölüm render eder: ./bolum.sh 0 1 2   (bölüm i = ZAMAN[i].bas .. ZAMAN[i+1].bas); ISCI süreç sayısı
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p cikti/bolumler
ISCI=${ISCI:-4}
SINIRLAR=$(node -e "import('./sahneler/index.mjs').then(m=>{const s=m.ZAMAN.map(z=>z.bas);s.push(m.TOPLAM_SURE);console.log(s.join(' '))})")
read -ra S <<< "$SINIRLAR"
for i in "$@"; do
  b=cikti/bolumler/bolum$(printf %02d $i).mp4
  node render.mjs --bas "${S[$i]}" --son "${S[$((i+1))]}" --cikti "$b.tmp.mp4" --isci "$ISCI" --crf 10
  mv "$b.tmp.mp4" "$b"
  echo "bölüm $i hazır: $b"
done
