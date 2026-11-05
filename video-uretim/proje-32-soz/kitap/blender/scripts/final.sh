#!/bin/bash
# Final deliverables. Run from anywhere.
set -e
BL=${VIDEO_ROOT:-$HOME/video-calisma}/blender
END=${VIDEO_ROOT:-$HOME/video-calisma}/ending
B=$BL/blender-4.5.15-linux-x64/blender
cd $BL
python3 scripts/make_textures.py
mkdir -p $END/raw
echo "[beauty] $(date +%T)"
$B -b -P scripts/build_scene.py -- --mode beauty --res 1350x2400 --samples 160 --threshold 0.008 --blend $END/books_scene.blend --out $END/raw/books_full_raw.png 2>&1 | grep -E "Error|Traceback|^Time|STACK|FOCUS"
python3 scripts/post.py full $END/raw/books_full_raw.png $END/books_full.png
echo "[fg] $(date +%T)"
$B -b -P scripts/build_scene.py -- --mode fg --res 1350x2400 --samples 128 --threshold 0.008 --out $END/raw/books_fg_raw.png 2>&1 | grep -E "Error|Traceback|^Time"
python3 scripts/post.py fg $END/raw/books_fg_raw.png $END/books_fg.png
python3 scripts/post.py bbox $END/books_fg.png
echo "[bg] $(date +%T)"
$B -b -P scripts/build_scene.py -- --mode bg --res 1350x2400 --samples 128 --threshold 0.008 --out $END/raw/books_bg_raw.png 2>&1 | grep -E "Error|Traceback|^Time"
python3 scripts/post.py bg $END/raw/books_bg_raw.png $END/books_bg.png
echo "[depth] $(date +%T)"
$B -b -P scripts/build_scene.py -- --mode depth --res 1350x2400 --out $END/raw/books_depth.png 2>&1 | grep -E "Error|Traceback|^Time|DEPTH"
python3 scripts/post.py depth $END/raw/books_depth.npy $END/books_depth.png $END/books_depth_inverse.png
echo "[done] $(date +%T)"
