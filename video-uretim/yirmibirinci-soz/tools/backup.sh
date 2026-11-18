#!/bin/bash
# Lead's tool: snapshot the production SOURCES (no renders, no plates, no wav) into the repo's session
# branch so that a lost container does not lose the work.   usage: backup.sh "commit message"
set -e
SRC=/home/user/work; DST=/home/user/A/video-uretim/yirmibirinci-soz
mkdir -p "$DST"
cd "$SRC"
tar cf - \
  --exclude='video/out' --exclude='node_modules' --exclude='__pycache__' --exclude='*.wav' \
  --exclude='endcard/plates*' --exclude='endcard/assets' --exclude='audio/sfx_demo' \
  --exclude='ref/*.png' --exclude='HANDOVER*' --exclude='*.log' \
  README.md BIBLE.md storyboard.md storyboard.json timing.json tools fonts ref audio video endcard | (cd "$DST" && tar xf -)
cd /home/user/A
git add video-uretim
if git diff --cached --quiet; then echo "nothing to back up"; exit 0; fi
git commit -q -m "$1

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Q8CfoD6QeZrfuPfQxzKmQc"
for i in 1 2 3 4; do git push -q -u origin claude/intelligent-carson-68ie64 && break || sleep $((2**i)); done
git log --oneline | head -1
