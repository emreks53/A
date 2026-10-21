"""Matchmove export for the sh14a Fibonacci-spiral overlay (runs INSIDE Blender, does not modify the shot).

    blender -b --factory-startup -noaudio -P video/comp/tools/export_disc_proj.py -- \
        --shot-py video/blender/shots/sh14a.py --from 2150 --to 2215 --out video/comp/tracks/sh14a_disc.json

Builds the studio's scene with its own build(), then for every frame writes the 3x4 projective matrix that maps
the hero sunflower's disc-local coordinates (Vogel florets: x = r cos th, y = r sin th, z = dome*(1-(r/R)^2),
r = c*sqrt(n), th = n*137.508 deg; +Z = face) to final-frame pixels (homogeneous: px = (M@p)[0]/(M@p)[2]).
Disc-local -> world = hero_pivot.matrix_world @ T(hc) @ Rx(-90deg)  (lib_s2.build_neck_and_head, nod=0, scale 1).
The matrix is verified against bpy_extras.world_to_camera_view for several florets every frame.
Env S2_FIELD_R (field radius) can be lowered for speed; it does not affect the hero head or the camera.
"""
import json
import math
import os
import sys
import time

import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


SHOT_PY = os.path.abspath(arg("--shot-py"))
F_FROM, F_TO = int(arg("--from")), int(arg("--to"))
OUT_P = os.path.abspath(arg("--out"))
HC = Vector([float(v) for v in arg("--hc", "0,0.07,0.16").split(",")])
R_DISC = float(arg("--R", "0.078")); N_FL = int(arg("--N", "1550")); DOME = float(arg("--dome", "0.006"))
PIVOT_NAME = arg("--pivot", "hero_pivot")

sys.argv = [sys.argv[0], "--", "--track"]          # what the shot's C.run() will parse
sys.path.insert(0, os.path.dirname(os.path.dirname(SHOT_PY)))
import common as C  # noqa: E402

captured = {}


def fake_run(shot_id, build):
    a = C._parse()
    sc = C.reset()
    ctx = C.Ctx(shot_id, "stills", a)
    import random
    random.seed(ctx.seed)
    sc.frame_start, sc.frame_end = ctx.f0, ctx.f1 - 1
    t0 = time.time()
    build(ctx)
    print(f"[export_disc_proj] build {time.time() - t0:.1f}s", flush=True)
    captured["ok"] = True


C.run = fake_run
src = open(SHOT_PY).read()
g = {"__name__": "__main__", "__file__": SHOT_PY}
exec(compile(src, SHOT_PY, "exec"), g)
assert captured.get("ok"), "shot build did not run"

from bpy_extras.object_utils import world_to_camera_view  # noqa: E402

sc = bpy.context.scene
cam = sc.camera
piv = bpy.data.objects[PIVOT_NAME]
W, H = sc.render.resolution_x, sc.render.resolution_y
M_head = Matrix.Translation(HC) @ Matrix.Rotation(-math.pi / 2, 4, "X")
GA = math.radians(137.50776405)
c = R_DISC / math.sqrt(N_FL)


def local(n):
    r = c * math.sqrt(n); th = n * GA
    return Vector((r * math.cos(th), r * math.sin(th), DOME * (1 - (r / R_DISC) ** 2)))


frames = {}
worst = 0.0
for f in range(F_FROM, F_TO + 1):
    sc.frame_set(f)
    d = cam.data
    if d.sensor_fit != "VERTICAL":
        raise RuntimeError("expected sensor_fit VERTICAL")
    fpx = d.lens / d.sensor_height * H
    cx = W / 2 - d.shift_x * H          # VERTICAL fit: shift is in units of the frame height
    cy = H / 2 + d.shift_y * H
    K = Matrix(((fpx, 0, -cx), (0, -fpx, -cy), (0, 0, -1)))
    V = cam.matrix_world.inverted() @ piv.matrix_world @ M_head
    V34 = Matrix([V[0][:], V[1][:], V[2][:]])                      # 3x4
    M = [[sum(K[i][k] * V34[k][j] for k in range(3)) for j in range(4)] for i in range(3)]
    for n in (5, 200, 800, 1500):
        p = local(n)
        h = [M[i][0] * p.x + M[i][1] * p.y + M[i][2] * p.z + M[i][3] for i in range(3)]
        px, py = h[0] / h[2], h[1] / h[2]
        wp = piv.matrix_world @ M_head @ p
        co = world_to_camera_view(sc, cam, wp)
        ex, ey = co.x * W, (1 - co.y) * H
        worst = max(worst, math.hypot(px - ex, py - ey))
    frames[str(f)] = [round(v, 6) for row in M for v in row]
os.makedirs(os.path.dirname(OUT_P), exist_ok=True)
json.dump({"shot": os.path.basename(SHOT_PY)[:-3], "c": c, "R": R_DISC, "N": N_FL, "dome": DOME,
           "doc": "3x4 projective matrix per frame: disc-local metres -> final-frame pixels (homogeneous)",
           "frames": frames}, open(OUT_P, "w"))
print(f"[export_disc_proj] {len(frames)} frames -> {OUT_P}; max reprojection error vs world_to_camera_view "
      f"{worst:.3f} px", flush=True)
if worst > 0.75:
    raise SystemExit("reprojection check failed")
