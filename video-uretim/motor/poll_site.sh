#!/bin/bash
# Poll the user's website licenses every 60 s and pull new clips at 4K (free re-downloads).
cd "$(dirname "$0")"
for i in $(seq 1 180); do
  python3 license_fetch.py --site 2>&1 | grep -v "^\[.*-> done$" >> ../licensed/poll.log
  n=$(python3 -c "import json; print(len(json.load(open('../licensed/missing.json'))))")
  echo "$(date -u +%H:%M) missing=$n" >> ../licensed/poll.log
  [ "$n" = "0" ] && break
  sleep 60
done
