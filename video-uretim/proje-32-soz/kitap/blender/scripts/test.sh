#!/bin/bash
# usage: test.sh NAME [extra args...]  -> tests/NAME.png (overview) and tests/NAME_crop.png
cd ${VIDEO_ROOT:-$HOME/video-calisma}/blender
B=./blender-4.5.15-linux-x64/blender
N=$1; shift
$B -b -P scripts/build_scene.py -- --mode beauty --res 338x600 --samples 32 --out tests/$N.png "$@" 2>&1 | grep -E "Error|Traceback|STACK|line [0-9]+"
$B -b -P scripts/build_scene.py -- --mode beauty --res 1350x2400 --border 0.08,0.08,0.92,0.56 --samples 20 --out tests/${N}_crop.png "$@" 2>&1 | grep -E "Error|Traceback|line [0-9]+"
echo DONE $N
