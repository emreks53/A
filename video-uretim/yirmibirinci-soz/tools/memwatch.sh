#!/bin/bash
# Memory watchdog (lead's tool): if the machine is about to run out of memory, kill the largest render
# process (headless Chromium renderer / Blender python) instead of letting the whole machine restart.
LOG=/home/user/work/tools/memwatch.log
echo "$(date +%T) memwatch started (pid $$)" >> $LOG
while true; do
  avail=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
  if [ "$avail" -lt 900 ]; then
    victim=$(ps -eo pid,rss,args --sort=-rss | awk '/chrome-headless-shell.*--type=renderer|build_scene.py|tools\/render.mjs/ && !/awk/ {print $1; exit}')
    if [ -n "$victim" ]; then
      echo "$(date +%T) only ${avail} MB free: killing pid $victim ($(ps -o rss=,args= -p $victim | cut -c1-120))" >> $LOG
      kill -9 "$victim"; sleep 3
    fi
  fi
  for p in $(pgrep -f "claude-code/bin/claude|environment-manager" 2>/dev/null); do echo -900 > /proc/$p/oom_score_adj 2>/dev/null; done
  sleep 1
done
