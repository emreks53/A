#!/usr/bin/env bash
# Prepares a cloud container to build/render shots: Blender 5.2.2 (CPU) + ffmpeg check.
set -euo pipefail
BL_VER=5.2.2
BL_DIR=/opt/blender/blender-$BL_VER-linux-x64
if [ ! -x "$BL_DIR/blender" ]; then
  mkdir -p /opt/blender
  for i in 1 2 3 4; do
    curl -sSfL -o /opt/blender/b.tar.xz "https://download.blender.org/release/Blender5.2/blender-$BL_VER-linux-x64.tar.xz" && break
    sleep $((2**i))
  done
  tar -xf /opt/blender/b.tar.xz -C /opt/blender && rm -f /opt/blender/b.tar.xz
fi
ln -sf "$BL_DIR/blender" /usr/local/bin/blender
command -v ffmpeg >/dev/null || { echo "ffmpeg missing"; exit 1; }
blender --version | head -1
echo "nproc=$(nproc)"
echo "setup OK"
