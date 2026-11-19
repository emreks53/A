#!/bin/bash
# Lead's tool: block (foreground) until something worth looking at happens or N seconds pass.
#   waitfor.sh [seconds=540]   prints what changed: workflow journals (new result lines), Blender log, PROGRESS files
J=/root/.claude/projects/-home-user-A/fcd92061-2b59-5cee-9af1-91ff387fc8b9/subagents/workflows
snap() { for f in $J/*/journal.jsonl; do echo "$f $(grep -c '"type":"result"' $f 2>/dev/null)"; done; grep -c EXIT /home/user/work/endcard/plates_r2.log 2>/dev/null; }
before=$(snap); t0=$(date +%s); N=${1:-540}
while [ $(( $(date +%s) - t0 )) -lt $N ]; do
  now=$(snap)
  if [ "$now" != "$before" ]; then echo "CHANGED:"; diff <(echo "$before") <(echo "$now") | grep '^>' ; break; fi
  sleep 5
done
echo "--- $(date +%T) up $(awk '{print int($1/60)}' /proc/uptime) min, load $(cut -d' ' -f1-3 /proc/loadavg), free $(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo) MB"
tail -1 /home/user/work/endcard/plates_r2.log 2>/dev/null | cut -c1-100
for f in /home/user/work/video/out/*/PROGRESS.md; do [ -f "$f" ] && echo "## $f ($(stat -c %y "$f" | cut -c12-16))" && tail -4 "$f" | cut -c1-300; done
tail -2 /home/user/work/tools/memwatch.log
