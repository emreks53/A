#!/bin/bash
# Run ANY command that opens a browser or renders (a node harness, a check script, tools/lab.mjs, Blender…)
# behind the machine-wide render gate of tools/r.sh (same slots, same memory check):
#   /home/user/work/video/tools/slot.sh node out/world/check.mjs stills main 1 0,0.3 out/x 2
. /home/user/work/video/tools/_gate.sh
gate_run "$@"
