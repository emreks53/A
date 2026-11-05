#!/bin/bash
# half-res crop lighting test: ltest.sh NAME TINTS [args]
cd ${VIDEO_ROOT:-$HOME/video-calisma}/blender
B=./blender-4.5.15-linux-x64/blender
N=$1; T=$2; shift; shift
$B -b -P scripts/build_scene.py -- --mode tint --tints "$T" --res 675x1200 --border 0.08,0.07,0.92,0.53 --samples 16 --out tests/${N}.png "$@" 2>&1 | grep -E "Error|Traceback|line [0-9]+"
echo DONE $N
