#!/bin/bash
cd ${VIDEO_ROOT:-$HOME/video-calisma}/blender
B=./blender-4.5.15-linux-x64/blender
N=$1; T=$2; shift; shift
$B -b -P scripts/build_scene.py -- --mode beauty --res 338x600 --samples 24 --out tests/$N.png "$@" 2>&1 | grep -E "Error|Traceback|STACK|line [0-9]+"
$B -b -P scripts/build_scene.py -- --mode tint --tints "$T" --res 1350x2400 --border 0.08,0.07,0.92,0.53 --samples 16 --out tests/${N}_crop.png "$@" 2>&1 | grep -E "Error|Traceback|line [0-9]+"
echo DONE $N
