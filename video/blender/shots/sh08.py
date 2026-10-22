"""sh08 · 40.60-47.40 · "Hatta uzanıp bir şey alırken bile elimizi uzatmak aslında bizim kendi başımıza
yapabileceğimiz bir iş değil."

Morning table (worn wood, warm window light + sunbeam from the LEFT). A real right hand enters from the
right, reaches for the apple (uzanıp), closes around it and lifts it (alırken). 100 mm macro, shallow DOF.
On "aslında" the camera glides along the wrist/forearm and on "değil" it arrives at macro skin (pores,
fine hairs) -> exit into tissue (sh09).
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from mathutils import Vector, Matrix, Euler
from mathutils.bvhtree import BVHTree
import common as C
import lib_s5 as H

SUN_DIR = None
WIN_C = None
GRIP_GAP = 0.004


# --------------------------------------------------------------------------- set

def _box(name, loc, dims, mat=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = dims
    if mat:
        C.assign(o, mat)
    return o


def build_set(ctx):
    global SUN_DIR, WIN_C
    sc = bpy.context.scene
    C.world_hdri(C.ph_hdri("lythwood_room", "1k"), strength=0.12, rot_z_deg=40, saturation=0.8, tint=(1.0, 0.93, 0.85))
    # table: worn wood, 1.8 x 1.1 m, top at z=0
    # fix-sh08: the sh03 table material (lib_s4.build_table: box-projected worn wood, 0.62 repeats/m, sat 0.85)
    wood = box_mat("TableWood", C.ph_texture("wood_table_worn", "2k"), scale=0.62, rough_mul=0.85, rough_add=0.05,
                   blend=0.05, sat=1.5, hue=0.518)   # this low warm-lit view reads redder/greyer than sh03's top-down
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.05, 0.12, -0.02))
    tab = bpy.context.object; tab.name = "Table"; tab.scale = (1.8, 1.1, 0.04)
    bpy.ops.object.transform_apply(scale=True)
    C.bevel(tab, 0.004, 3)
    C.assign(tab, wood)
    # dust / fingerprints sheen breakup on the wood: multiply roughness by noise
    nt = wood.node_tree
    p = nt.nodes["Principled BSDF"]
    # fix-sh08: at this grazing table-level view a full-strength specular mirrors the pale wall and greys the wood out
    p.inputs["Specular IOR Level"].default_value = 0.28
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 30; nz.inputs["Detail"].default_value = 6
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs[3].default_value = 0.85; mr.inputs[4].default_value = 1.15
    mm = [n for n in nt.nodes if n.bl_idname == "ShaderNodeMath"]
    if mm:
        mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
        nt.links.new(mm[0].outputs[0], mul.inputs[0]); nt.links.new(nz.outputs[0], mr.inputs[0])
        nt.links.new(mr.outputs[0], mul.inputs[1]); nt.links.new(mul.outputs[0], p.inputs["Roughness"])
    # plaster back wall and floor
    plaster = C.principled("Plaster", (0.62, 0.55, 0.47), 0.9)
    pn = plaster.node_tree
    pnz = pn.nodes.new("ShaderNodeTexNoise"); pnz.inputs["Scale"].default_value = 6; pnz.inputs["Detail"].default_value = 8
    pb = pn.nodes.new("ShaderNodeBump"); pb.inputs["Distance"].default_value = 0.002
    pn.links.new(pnz.outputs[0], pb.inputs["Height"]); pn.links.new(pb.outputs[0], pn.nodes["Principled BSDF"].inputs["Normal"])
    _box("BackWall", (0.65, 1.35, 0.6), (3.0, 0.05, 2.4), plaster)
    _box("Floor", (0.2, 0.2, -0.76), (4, 4, 0.02), C.principled("Floor", (0.25, 0.16, 0.10), 0.6))
    # left wall with a window (the sunbeam's gobo). window opening centred where the sun ray to the apple crosses x=-0.85
    elev, az = 21.0, -128.0
    sun = C.sun(elev, az, strength=11.0, kelvin_k=4200, angle_deg=0.6)
    SUN_DIR = (sun.rotation_euler.to_matrix() @ Vector((0, 0, -1))).normalized()
    wx = -0.85
    target = Vector((0.0, 0.02, 0.05))
    dback = (wx - target.x) / SUN_DIR.x
    win_c = target + SUN_DIR * dback
    WIN_C = win_c.copy()
    ww, wh = 0.75, 0.95
    wallm = C.principled("WallL", (0.6, 0.55, 0.48), 0.9)
    y0, y1 = win_c.y - ww / 2, win_c.y + ww / 2
    z0, z1 = win_c.z - wh / 2, win_c.z + wh / 2
    _box("WallL_a", (wx, (y0 - 2.0) / 2, 0.6), (0.06, y0 + 2.0, 2.4), wallm)
    _box("WallL_b", (wx, (y1 + 3.0) / 2, 0.6), (0.06, 3.0 - y1, 2.4), wallm)
    _box("WallL_c", (wx, win_c.y, (z0 - 0.6) / 2), (0.06, ww, z0 + 0.6), wallm)
    _box("WallL_d", (wx, win_c.y, (z1 + 1.8) / 2), (0.06, ww, 1.8 - z1), wallm)
    frame_m = C.principled("WinFrame", (0.55, 0.45, 0.33), 0.6)
    _box("Mullion_v", (wx, win_c.y - 0.17, win_c.z), (0.05, 0.035, wh), frame_m)
    # sky light from the window opening (cool fill) + a soft bounce from the room
    C.area("WindowSky", loc=(wx + 0.05, win_c.y, win_c.z), look_at=(0.3, -0.2, 0.0), size=ww, size_y=wh, power=30, kelvin_k=7500)
    C.area("Bounce", loc=(0.9, -0.6, 0.5), look_at=(0, 0, 0.05), size=1.2, power=6, kelvin_k=3600)
    # bright sunlit exterior seen through the window (camera/glossy only, so room lighting is unchanged)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(wx - 0.6, win_c.y, win_c.z), rotation=(0, math.radians(90), 0))
    ext = bpy.context.object; ext.name = "Exterior"; ext.scale = (3.0, 4.0, 1)
    em = C.principled("ExteriorGlow", (0, 0, 0), 1.0, emission=(1.0, 0.82, 0.6), emission_strength=7.0)
    C.assign(ext, em)
    ext.visible_diffuse = False; ext.visible_shadow = False; ext.visible_volume_scatter = False
    # sheer curtain at the window edge breaks up the beam a little (soft moving shadow)
    return sun


def box_mat(name, tex, scale=1.0, rough_mul=1.0, rough_add=0.0, blend=0.25, sat=1.0, hue=0.5):
    """lib_s4.box_mat (sh03's table material), trimmed to what the table uses: box-projected Poly Haven maps in
    object space, `scale` = repeats per metre."""
    m, nt, p = C.new_mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale,) * 3
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])

    def img(path, noncolor):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(path, check_existing=True)
        n.projection = "BOX"; n.projection_blend = blend
        if noncolor:
            n.image.colorspace_settings.name = "Non-Color"
        nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
        return n
    col = img(tex["diff"], False).outputs["Color"]
    if sat != 1.0 or hue != 0.5:
        hs = nt.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = sat
        hs.inputs["Hue"].default_value = hue
        nt.links.new(col, hs.inputs["Color"]); col = hs.outputs["Color"]
    nt.links.new(col, p.inputs["Base Color"])
    r = img(tex["rough"], True)
    mm = nt.nodes.new("ShaderNodeMath"); mm.operation = "MULTIPLY_ADD"
    mm.inputs[1].default_value = rough_mul; mm.inputs[2].default_value = rough_add; mm.use_clamp = True
    nt.links.new(r.outputs["Color"], mm.inputs[0]); nt.links.new(mm.outputs[0], p.inputs["Roughness"])
    n = img(tex["nor"], True)
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(n.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], p.inputs["Normal"])
    return m


def place_apple():
    objs = C.ph_model("food_apple_01", "1k")
    meshes = [o for o in objs if o.type == "MESH"]
    ap = meshes[0]
    for o in objs:
        if o.parent is None and o is not ap and o.type == "EMPTY":
            pass
    bpy.context.view_layer.update()
    ws = [ap.matrix_world @ Vector(c) for c in ap.bound_box]
    mn = Vector([min(w[i] for w in ws) for i in range(3)]); mx = Vector([max(w[i] for w in ws) for i in range(3)])
    print("[sh08] apple bbox", tuple(mn), tuple(mx), flush=True)
    # re-root the apple in a pivot empty at its centre, sitting on the table at the origin
    piv = C.empty("ApplePivot", ((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, (mn.z + mx.z) / 2))
    top = [o for o in objs if o.parent is None]
    for o in top:
        o.parent = piv
        o.matrix_parent_inverse = Matrix.Translation(piv.location).inverted()
    half_h = (mx.z - mn.z) / 2
    piv.location = (0.0, 0.0, half_h - 0.0005)
    piv.rotation_euler = (0, 0, math.radians(35))
    bpy.context.view_layer.update()
    return piv, ap, half_h, (mx - mn)


def dress_background(ctx):
    """Other sofra items, softly out of focus behind the apple (same table as sh03)."""
    def put(name, loc, rot=0.0, res="1k", scale=1.0):
        try:
            objs = C.ph_model(name, res)
        except Exception as e:
            print("[sh08] skip", name, e); return
        top = [o for o in objs if o.parent is None]
        piv = C.empty("P_" + name, loc)
        for o in top:
            o.parent = piv
        piv.rotation_euler = (0, 0, math.radians(rot)); piv.scale = (scale,) * 3
    put("food_pomegranate_01", (-0.16, 0.30, 0.0), 20)
    put("wooden_bowl_01", (0.20, 0.52, 0.0), 0)
    put("food_pears_asian_01", (0.20, 0.52, 0.03), 40)
    put("croissant", (-0.05, 0.62, 0.0), -30)
    put("jug_01", (-0.40, 0.72, 0.0), 10)
    put("food_lime_01", (0.10, 0.24, 0.0), 70)
    # small tulip tea glass with tea (procedural lathe)
    prof = [(0.0, 0.0), (0.024, 0.0), (0.025, 0.003), (0.020, 0.030), (0.018, 0.045), (0.023, 0.075), (0.027, 0.098), (0.0265, 0.1)]
    verts, faces = [], []
    n = 48
    for (r, z) in prof:
        for i in range(n):
            a = 2 * math.pi * i / n
            verts.append((r * math.cos(a), r * math.sin(a), z))
    for j in range(len(prof) - 1):
        for i in range(n):
            a = j * n + i; b = j * n + (i + 1) % n
            faces.append((a, b, b + n, a + n))
    g = C.mesh_obj("TeaGlass", verts, faces)
    g.location = (-0.24, 0.42, 0.0)
    C.smooth_shade(g)
    s = g.modifiers.new("s", "SOLIDIFY"); s.thickness = 0.0015
    C.assign(g, C.mat_glass("TeaGlassMat"))
    tv = [(r * 0.94 * math.cos(2 * math.pi * i / n), r * 0.94 * math.sin(2 * math.pi * i / n), z) for (r, z) in prof[:6] for i in range(n)]
    tf = [(j * n + i, j * n + (i + 1) % n, (j + 1) * n + (i + 1) % n, (j + 1) * n + i) for j in range(5) for i in range(n)]
    tf.append(tuple(range(5 * n, 6 * n)))
    t = C.mesh_obj("Tea", tv, tf); t.location = g.location; C.smooth_shade(t)
    tea = C.principled("TeaMat", (0.55, 0.12, 0.02), 0.05, transmission=1.0, ior=1.34)
    C.assign(t, tea)


# --------------------------------------------------------------------------- hand rig placement

CMAT = Matrix(((0, 0, 1), (-1, 0, 0), (0, -1, 0)))       # rest -> canonical (fingers -X, palm down, forearm +X)


def hand_rot(yaw, elev, roll):
    return (Matrix.Rotation(math.radians(yaw), 3, "Z") @ Matrix.Rotation(math.radians(-elev), 3, "Y")
            @ Matrix.Rotation(math.radians(roll), 3, "X") @ CMAT)


def arm_matrix(wrist_w, rot3):
    return Matrix.Translation(wrist_w) @ rot3.to_4x4() @ Matrix.Translation(-H.WRIST)


CURL_W = {"thumb": (0.25, 0.55, 0.35), "index": (0.85, 1.0, 0.65), "middle": (0.85, 1.0, 0.65),
          "ring": (0.9, 1.0, 0.65), "little": (0.95, 1.0, 0.7)}
SPREAD = {"thumb": 0.0, "index": -0.06, "middle": 0.0, "ring": 0.05, "little": 0.12}


def set_pose(arm, P):
    """P: dict with wrist (flex, dev), per-finger curl c, spread s, thumb opposition."""
    pb = arm.pose.bones
    pb["hand"].rotation_euler = (math.radians(P["wflex"]), 0.0, math.radians(P.get("wdev", 0.0)))
    for k in H.FINGERS:
        c = P["curl"][k]
        w = CURL_W[k]
        for i in range(3):
            b = pb[f"{k}_{i + 1}"]
            rx = -c * w[i]
            rz = 0.0
            if i == 0:
                rz = (SPREAD[k] * P.get("spread", 1.0))
            if k == "thumb" and i == 0:
                rx = -P.get("topp", 0.4)
                rz = P.get("tswing", 0.0)
            b.rotation_euler = (rx, 0.0, rz)


def key_pose(arm, t, P):
    set_pose(arm, P)
    for b in arm.pose.bones:
        b.keyframe_insert("rotation_euler", frame=t * C.FPS)


# --------------------------------------------------------------------------- fix-sh08: an adult man's hand

CAM_SHIFT_X = -0.022
CAM0 = (0.20, -0.80, 0.15)       # room side of the table, looking at the back wall; window light from the left
EXPO = -0.62                      # settled exposure (about 1 stop under the old high-key -0.6)
EXPO_END = 0.0
MACRO_EV = 0.11                   # exposure make-up for the diffuse bounce dropped from GLOW_NO_NORMAL_F
MACRO_D = 0.072                   # camera-to-skin distance on 'değil' (100 mm: ~26 mm frame height)
HAND_FOCUS_REST = Vector((0.004, -0.020, -0.040))   # middle of the back of the hand (rest space)
CUFF_Z0 = 0.062                   # rolled shirt cuff starts ~6 cm above the wrist (rest space): in frame right


def man_hand(o):
    """On top of lib_s5's masculinising: broader palm, thicker fingers, raised dorsal veins and extensor tendons.
    Rest-space vertex edit before rigging (seeded, pure function of the mesh)."""
    rnd = random.Random(808)
    segs = [(k, i, H.JOINTS[k][i], H.JOINTS[k][i + 1]) for k in H.FINGERS for i in range(3)]
    pc = Vector((0.006, 0.0, -0.06))

    def jit(pts, a):
        return [Vector((x + rnd.uniform(-a, a), z + rnd.uniform(-a, a))) for x, z in pts]
    # dorsal venous network (x, z) in rest space: arch over the metacarpals draining into the cephalic (thumb side)
    # and basilic (little-finger side) veins that run up the forearm
    veins = [jit(v, 0.002) for v in (
        [(0.030, -0.080), (0.031, -0.055), (0.027, -0.030), (0.024, -0.008), (0.026, 0.030), (0.022, 0.070), (0.018, 0.120)],
        [(0.004, -0.088), (0.006, -0.064), (0.013, -0.046), (0.021, -0.030), (0.027, -0.030)],
        [(-0.018, -0.086), (-0.016, -0.062), (-0.006, -0.046), (0.013, -0.046)],
        [(-0.036, -0.078), (-0.034, -0.052), (-0.029, -0.026), (-0.024, 0.010), (-0.020, 0.055), (-0.012, 0.110)],
        [(-0.029, -0.026), (-0.014, -0.040), (-0.006, -0.046)],
        [(0.024, -0.008), (0.010, 0.025), (0.002, 0.060), (-0.004, 0.100)],
    )]
    tendons = [(H.WRIST + Vector((0.0, -0.02, 0.0)), H.JOINTS[k][0] + Vector((0, -0.012, 0)))
               for k in ("index", "middle", "ring", "little")]

    # a man's forearm, not a 16 cm tube: radial scale about the wrist->elbow axis, +6 % at the wrist, +15 % at the
    # cuff, +35 % under the sleeve; the hand (z < -0.01) is unchanged
    def fa_scale(z):
        if z <= -0.01:
            return 1.0
        if z <= 0.0:
            return 1.0 + 0.06 * C.smooth((z + 0.01) / 0.01)
        if z <= CUFF_Z0:
            return 1.06 + 0.09 * C.smooth(z / CUFF_Z0)
        return 1.15 + 0.20 * C.smooth((z - CUFF_Z0) / 0.06)
    for v in o.data.vertices:
        z = v.co.z
        f = fa_scale(z)
        if f != 1.0:
            c = H.WRIST.lerp(H.ELBOW, (z - H.WRIST.z) / (H.ELBOW.z - H.WRIST.z))
            v.co.x = c.x + (v.co.x - c.x) * f
            v.co.y = c.y + (v.co.y - c.y) * f
    o.data.update()

    def d2(px, pz, a, b):
        ab = b - a; q = Vector((px, pz))
        t = max(0.0, min(1.0, (q - a).dot(ab) / max(1e-12, ab.length_squared)))
        return (q - (a + ab * t)).length
    for v in o.data.vertices:
        p = v.co.copy(); n = v.normal.copy()
        best = None
        for k, i, a, b in segs:
            d, t = H._seg_dist(p, a, b)
            if best is None or d < best[0]:
                best = (d, t, k, i, a, b)
        d, t, k, i, a, b = best
        q = p.copy()
        if d < 0.017 and not (k == "thumb" and i == 0) and not (i == 0 and t < 0.25):
            axis = a + (b - a) * t
            w = 1.0 if i > 0 or t > 0.45 else C.smooth((t - 0.25) / 0.2)
            q = axis + (p - axis) * (1.0 + 0.07 * w)                      # thicker fingers
        if -0.11 < p.z < 0.01:                                             # broader palm (~+15 % with lib_s5's 6 %)
            wz = C.smooth((p.z + 0.11) / 0.025) * (1 - C.smooth((p.z + 0.0) / 0.012))
            q.x = q.x + (p.x - pc.x) * 0.09 * wz
        dors = C.smooth((-n.y - 0.25) / 0.5)
        if dors > 0.0 and p.z > -0.095:
            h = 0.0
            for pl in veins:
                dm = min(d2(p.x, p.z, pl[j], pl[j + 1]) for j in range(len(pl) - 1))
                h = max(h, math.exp(-(dm / 0.0016) ** 2))
            fade = C.smooth((p.z + 0.095) / 0.012) * (1 - C.smooth((p.z - (CUFF_Z0 - 0.01)) / 0.01))
            hv = 0.00075 * h * fade
            for a, b in tendons:
                dt, tt = H._seg_dist(p, a, b)
                hv += 0.0006 * math.exp(-(dt / 0.0026) ** 2) * C.smooth(tt / 0.25) * (1 - C.smooth((tt - 0.8) / 0.2))
            q = q + n * hv * dors
        v.co = q
    o.data.update()
    rest = o.data.attributes["rest"]
    for v in o.data.vertices:
        rest.data[v.index].vector = v.co


def _smoothstep_np(e0, e1, x):
    import numpy as np
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def body_hair(hand, arm):
    """A man's body hair as explicit curves (as sh04's man): dense on the forearm up to the cuff (back and both edges,
    sparse inside), the back of the hand, a few on the first finger segments. Strands lie distally and toward the
    little finger, lifted 20-50 deg so the silhouette carries a rim-lit fringe. Grouped per bone and bone-parented
    (rigid, no particle system: identical for any job start frame). Rest space = armature space."""
    import numpy as np
    me = hand.data
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tri = np.empty(nt * 3, dtype=np.int64); me.loop_triangles.foreach_get("vertices", tri); tri = tri.reshape(-1, 3)
    area = np.empty(nt); me.loop_triangles.foreach_get("area", area)
    nrm = np.empty(nt * 3); me.loop_triangles.foreach_get("normal", nrm); nrm = nrm.reshape(-1, 3)
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    cen = co[tri].mean(1)
    x, z = cen[:, 0], cen[:, 2]
    zc = CUFF_Z0 - 0.004
    back = _smoothstep_np(0.9, -0.3, nrm[:, 1])           # back + edges (rest -Y = back of the hand)
    dens = (np.where((z > 0.0) & (z < zc), 1.0, 0.0) * (0.30 + 0.70 * back) * 1.7e5
            + np.where((z > -0.098) & (z <= 0.0), 1.0, 0.0) * _smoothstep_np(0.85, -0.3, nrm[:, 1]) * 1.0e5
            + np.where((z > -0.142) & (z <= -0.098) & (x > -0.05) & (x < 0.04), 1.0, 0.0)
            * _smoothstep_np(0.5, -0.5, nrm[:, 1]) * 0.8e5)
    rnd = np.random.default_rng(808)
    cnt = rnd.poisson(dens * area)
    ti = np.repeat(np.arange(nt), cnt)
    n = len(ti)
    r1 = np.sqrt(rnd.random(n)); r2 = rnd.random(n)
    a, b, c = co[tri[ti, 0]], co[tri[ti, 1]], co[tri[ti, 2]]
    root = a * (1 - r1)[:, None] + b * (r1 * (1 - r2))[:, None] + c * (r1 * r2)[:, None]
    nn = nrm[ti]
    zr = root[:, 2]
    on_arm = zr > 0.0
    on_hand = (zr > -0.098) & ~on_arm
    lay = np.stack([-0.35 + rnd.normal(0, 0.45, n), np.zeros(n), -np.ones(n)], 1)
    lay -= nn * (lay * nn).sum(1)[:, None]
    lay /= np.linalg.norm(lay, axis=1)[:, None] + 1e-9
    lift = np.radians(np.where(on_arm, rnd.uniform(12, 35, n), rnd.uniform(20, 45, n)))
    d = lay * np.cos(lift)[:, None] + nn * np.sin(lift)[:, None]
    L_ = np.where(on_arm, rnd.uniform(0.010, 0.015, n), np.where(on_hand, rnd.uniform(0.008, 0.012, n),
                                                                 rnd.uniform(0.003, 0.005, n)))
    curl = np.cross(d, nn) * rnd.uniform(-0.25, 0.25, n)[:, None]
    P = np.stack([root - nn * 0.00012 * (k == 0) + (d * f + curl * f * f - nn * 0.22 * f * f) * L_[:, None]
                  for k, f in enumerate((0.0, 0.33, 0.67, 1.0))], 1)
    R = np.where(on_arm, 0.000050, 0.000055)[:, None] * np.array([[1.0, 0.85, 0.6, 0.25]])
    # bone per strand: forearm / hand / nearest proximal phalanx
    fing = ("index", "middle", "ring", "little")
    fx = np.array([H.JOINTS[k][0].x for k in fing])
    bone = np.where(on_arm, "forearm", np.where(on_hand, "hand",
                    np.array([f"{fing[i]}_1" for i in np.abs(root[:, 0][:, None] - fx[None, :]).argmin(1)])))
    hm = bpy.data.materials.new("ManArmHair"); hm.use_nodes = True
    ntr = hm.node_tree
    ntr.nodes.remove(ntr.nodes["Principled BSDF"])
    # a glossy keratin fibre, dark-brown root to sun-bleached tip (as sh04's man), plus thin-fibre forward scatter so
    # the window light rims the fringe. (The Chiang fibre model cost ~30 s/frame in the close-ups.)
    hi = ntr.nodes.new("ShaderNodeHairInfo")
    pb = ntr.nodes.new("ShaderNodeBsdfPrincipled"); pb.inputs["Roughness"].default_value = 0.38
    pc = H._mixc(ntr, hi.outputs["Intercept"], (0.075, 0.045, 0.026), (0.32, 0.21, 0.12))
    ntr.links.new(pc, pb.inputs["Base Color"])
    tr = ntr.nodes.new("ShaderNodeBsdfTranslucent")
    ntr.links.new(H._mixc(ntr, hi.outputs["Intercept"], (0.30, 0.17, 0.08), (0.80, 0.55, 0.30)), tr.inputs["Color"])
    mx = ntr.nodes.new("ShaderNodeMixShader"); mx.inputs["Fac"].default_value = 0.3
    ntr.links.new(pb.outputs[0], mx.inputs[1]); ntr.links.new(tr.outputs[0], mx.inputs[2])
    ntr.links.new(mx.outputs[0], ntr.nodes["Material Output"].inputs["Surface"])
    total = 0
    for bn in sorted(set(bone.tolist())):
        sel = bone == bn
        k = int(sel.sum())
        cv = bpy.data.hair_curves.new("ManHair_" + bn)
        cv.add_curves([4] * k)
        cv.attributes["position"].data.foreach_set("vector", P[sel].ravel().astype(np.float32))
        ra = cv.attributes.get("radius") or cv.attributes.new("radius", "FLOAT", "POINT")
        ra.data.foreach_set("value", R[sel].ravel().astype(np.float32))
        cv.materials.append(hm)
        ob = bpy.data.objects.new("ManHair_" + bn, cv); C.link(ob)
        ob.parent = arm; ob.parent_type = "BONE"; ob.parent_bone = bn
        bb = arm.data.bones[bn]
        ob.matrix_parent_inverse = (bb.matrix_local @ Matrix.Translation((0, bb.length, 0))).inverted()
        total += k
    print(f"[sh08] body hair: {total} strands ({int(on_arm.sum())} forearm, {int(on_hand.sum())} hand)", flush=True)


def rolled_cuff(hand, arm, z0, z1=0.33, seed=3):
    """lib_s5.cuff with a real rolled lip: the sleeve is turned up twice into a fat cotton roll at its edge."""
    rnd = random.Random(seed)
    me = hand.data
    axis_c = lambda z: H.WRIST.lerp(H.ELBOW, (z - H.WRIST.z) / (H.ELBOW.z - H.WRIST.z))
    nseg, nz = 64, 40
    pts = [v.co for v in me.vertices if v.co.z > z0 - 0.03]
    zs = [z0 + (z1 - z0) * (i / (nz - 1)) ** 1.6 for i in range(nz)]      # dense rings at the roll
    rad = {}
    for zi, z in enumerate(zs):
        c = axis_c(z)
        ring = [p for p in pts if abs(p.z - z) < 0.012]
        for s_ in range(nseg):
            a = 2 * math.pi * s_ / nseg
            dv = Vector((math.cos(a), math.sin(a), 0))
            best = 0.02
            for p in ring:
                q = p - c; q.z = 0
                if q.length > 1e-6 and q.normalized().dot(dv) > 0.985:
                    best = max(best, q.length)
            rad[(zi, s_)] = best
    verts, faces = [], []
    for zi, z in enumerate(zs):
        c = axis_c(z)
        u = z - z0
        for s_ in range(nseg):
            a = 2 * math.pi * s_ / nseg
            r = (rad[(zi, s_)] + rad[(zi, (s_ - 1) % nseg)] + rad[(zi, (s_ + 1) % nseg)]) / 3
            # two turns of the roll (outer fold at 0-2.6 cm), a crease between them, then the loose sleeve
            roll = 0.0085 * math.exp(-((u - 0.009) / 0.0085) ** 2) + 0.0065 * math.exp(-((u - 0.024) / 0.007) ** 2)
            roll *= 1.0 + 0.12 * math.sin(a * 2 + 0.7) + 0.06 * math.sin(a * 5 + rnd.random())
            fold = C.smooth((u - 0.035) / 0.03)
            off = 0.003 + roll + fold * (0.0035 * math.sin(a * 3 + z * 90 + rnd.random() * 0.4)
                                         + 0.002 * math.sin(a * 7 + z * 210)) + 0.004 * u / (z1 - z0)
            verts.append(Vector((c.x + math.cos(a) * (r + off), c.y + math.sin(a) * (r + off), z)))
    for zi in range(nz - 1):
        for s_ in range(nseg):
            a = zi * nseg + s_; b = zi * nseg + (s_ + 1) % nseg
            faces.append((a, b, b + nseg, a + nseg))
    base = len(verts)
    for s_ in range(nseg):                                  # the turned-in edge of the roll: fabric thickness
        p = verts[s_]; c = axis_c(z0)
        q = p - c; q.z = 0
        verts.append(Vector((c.x, c.y, z0 + 0.005)) + q.normalized() * (q.length - 0.006))
    for s_ in range(nseg):
        faces.append((base + s_, base + (s_ + 1) % nseg, (s_ + 1) % nseg, s_))
    ob = C.mesh_obj("Cuff", verts, faces)
    C.smooth_shade(ob)
    rest = ob.data.attributes.new("rest", "FLOAT_VECTOR", "POINT")
    for v in ob.data.vertices:
        rest.data[v.index].vector = v.co
    sol = ob.modifiers.new("thick", "SOLIDIFY"); sol.thickness = 0.0012; sol.offset = 1.0
    C.subsurf(ob, 1, 2)
    ob.parent = arm; ob.parent_type = "BONE"; ob.parent_bone = "forearm"
    bone = arm.data.bones["forearm"]
    ob.matrix_parent_inverse = (bone.matrix_local @ Matrix.Translation((0, bone.length, 0))).inverted()
    C.assign(ob, H.fabric_material())
    return ob


def _prune_macro(nt, frame):
    """From `frame` on (forearm close-up: no knuckles, nails or thin backlit edges in frame) zero the knuckle-wrinkle
    height, the nail mask and the translucency with keyed constants; Cycles constant-folds the zeroed branches away."""
    out = []
    for n in nt.nodes:
        if n.bl_idname == "ShaderNodeMath" and n.operation == "MULTIPLY" and abs(n.inputs[1].default_value + 1.6) < 1e-6:
            out.append((n.inputs[1], -1.6))                       # knuckle wrinkle bands (wave texture)
        if n.bl_idname == "ShaderNodeMixShader" and n.inputs[2].is_linked:
            src = n.inputs[2].links[0].from_node.bl_idname
            if src == "ShaderNodeBsdfTranslucent":
                out.append((n.inputs[0], n.inputs[0].default_value))
            elif src == "ShaderNodeBsdfPrincipled" and n.inputs[0].is_linked:  # nail mix: gate its mask
                g = nt.nodes.new("ShaderNodeMath"); g.operation = "MULTIPLY"
                nt.links.new(n.inputs[0].links[0].from_socket, g.inputs[0]); nt.links.new(g.outputs[0], n.inputs[0])
                g.inputs[1].default_value = 1.0
                out.append((g.inputs[1], 1.0))
    for n in nt.nodes:
        if n.bl_idname == "ShaderNodeMath" and n.operation == "MULTIPLY" and n.inputs[0].is_linked:
            v = round(n.inputs[1].default_value, 3)
            src = n.inputs[0].links[0].from_node
            if v == 0.45 and src.bl_idname == "ShaderNodeAttribute" and src.attribute_name == "tip":
                out.append((n.inputs[1], v))                      # fingertip flush
    for sock, v in out:
        sock.default_value = v; sock.keyframe_insert("default_value", frame=frame - 1)
        sock.default_value = 0.0; sock.keyframe_insert("default_value", frame=frame)
    # subsurface costs ~14 % of a close-up frame; in the forearm close-up the pores and lines read sharper without it
    # (brightness unchanged within 1.5 %), so it switches off earlier, as the camera closes in
    for n in nt.nodes:
        if n.bl_idname == "ShaderNodeBsdfPrincipled" and n.inputs["Subsurface Weight"].default_value > 0.9:
            sw = n.inputs["Subsurface Weight"]
            sw.default_value = 1.0; sw.keyframe_insert("default_value", frame=SSS_OFF_F - 1)
            sw.default_value = 0.0; sw.keyframe_insert("default_value", frame=SSS_OFF_F)
            out.append((sw, 1.0))
    for fc in C.fcurves(nt):
        for kp in fc.keyframe_points:
            kp.interpolation = "CONSTANT"
    return len(out)


def man_skin(skin):
    """Calmer fingertips (the backlit flush read as painted nail caps), short nails without a pale free edge,
    and less red translucency."""
    nt = skin.node_tree
    for n in nt.nodes:
        if n.bl_idname == "ShaderNodeMix" and n.data_type == "RGBA":
            b = tuple(round(x, 2) for x in n.inputs[7].default_value[:3])
            if b == (0.56, 0.21, 0.17):            # flushed fingertips
                n.inputs[7].default_value = (0.40, 0.205, 0.145, 1)
            elif b == (0.78, 0.70, 0.60):          # nail free edge: trimmed short, barely visible
                n.inputs[7].default_value = (0.60, 0.44, 0.36, 1)
            elif b == (0.74, 0.60, 0.52):          # lunula
                n.inputs[7].default_value = (0.64, 0.46, 0.39, 1)
        if n.bl_idname == "ShaderNodeMixShader" and n.inputs[2].is_linked and \
                n.inputs[2].links[0].from_node.bl_idname == "ShaderNodeBsdfTranslucent":
            n.inputs[0].default_value = 0.035
        if n.bl_idname == "ShaderNodeMath" and n.operation == "MULTIPLY" and abs(n.inputs[1].default_value + 0.30) < 1e-6:
            n.inputs[1].default_value = -0.12      # skin-line groove depth (relinked to the wave grooves below)
        if n.bl_idname == "ShaderNodeMath" and n.operation == "MULTIPLY" and abs(n.inputs[1].default_value + 0.9) < 1e-6:
            n.inputs[1].default_value = 0.0        # pores live in the albedo only: a bump pit gave bright bead rims
    # pores and fine creases also in the albedo: from f1091 OIDN runs colour+albedo only (GLOW_NO_NORMAL_F) and
    # would smooth bump-only micro relief away in the macro on 'değil'
    sk = [n for n in nt.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled" and n.inputs["Subsurface Weight"].default_value > 0.9][0]
    col = sk.inputs["Base Color"].links[0].from_socket
    vor = {round(n.inputs["Scale"].default_value): n for n in nt.nodes if n.bl_idname == "ShaderNodeTexVoronoi"}
    pore = H._math(nt, "SUBTRACT", 1.0, H._smoothstep(nt, vor[2600].outputs["Distance"], 0.0, 0.16))      # reuse lib cells
    # skin lines: one dominant direction (Langer lines run around the forearm) as soft wavy grooves that never cross
    # (lib_s5's cellular net drew crisp polygon edges, X and V shapes at macro); secondary texture stays in the noise
    R0 = H._attr(nt, "rest", "Vector")
    wvl = nt.nodes.new("ShaderNodeTexWave"); wvl.wave_type = "BANDS"; wvl.bands_direction = "Z"; wvl.wave_profile = "SIN"
    wvl.inputs["Scale"].default_value = 1300.0; wvl.inputs["Distortion"].default_value = 3.5
    wvl.inputs["Detail"].default_value = 1.0; wvl.inputs["Detail Scale"].default_value = 1.2
    nt.links.new(R0, wvl.inputs["Vector"])
    crease = H._smoothstep(nt, wvl.outputs["Fac"], 0.80, 0.98)          # narrow, soft-edged grooves
    for n in list(nt.nodes):                                            # the cellular net's height -> the grooves
        if n.bl_idname == "ShaderNodeMath" and n.operation == "MULTIPLY" and abs(n.inputs[1].default_value + 0.12) < 1e-6:
            nt.links.new(crease, n.inputs[0])
    dark = H._math(nt, "ADD", H._math(nt, "MULTIPLY", pore, 0.30), H._math(nt, "MULTIPLY", crease, 0.06))
    col2 = H._mixc(nt, dark, col, (0.17, 0.085, 0.06))
    # 2-6 mm mottling (a real dorsum is never one flat tone): darker and paler patches, plus darker knuckle creases
    R = H._attr(nt, "rest", "Vector")
    m1 = H._smoothstep(nt, H._noise(nt, R, 230.0, 2.0, 0.55), 0.42, 0.68)
    m2 = H._smoothstep(nt, H._noise(nt, H._scalevec(nt, R, (1.0, 1.0, 0.6)), 380.0, 1.0, 0.5), 0.55, 0.75)
    col2 = H._mixc(nt, H._math(nt, "MULTIPLY", m1, 0.38), col2, (0.24, 0.12, 0.08))
    col2 = H._mixc(nt, H._math(nt, "MULTIPLY", m2, 0.22), col2, (0.50, 0.30, 0.22))
    # the back of the hand (not the forearm macro): coarser skin lines and 1-2 mm mottling read at mid-shot distance
    handm = H._smoothstep(nt, H._sep(nt, R, 2), 0.004, -0.015)
    m3 = H._smoothstep(nt, H._noise(nt, R, 650.0, 1.0, 0.5), 0.40, 0.70)
    col2 = H._mixc(nt, H._math(nt, "MULTIPLY", handm, H._math(nt, "ADD", H._math(nt, "MULTIPLY", crease, 0.50),
                                                                          H._math(nt, "MULTIPLY", m3, 0.40))),
                   col2, (0.20, 0.10, 0.065))
    for n in nt.nodes:
        if n.bl_idname == "ShaderNodeMath" and n.operation == "MULTIPLY" and abs(n.inputs[1].default_value + 1.6) < 1e-6:
            col2 = H._mixc(nt, H._math(nt, "MULTIPLY", n.inputs[0].links[0].from_socket, 0.55), col2, (0.20, 0.09, 0.06))
            break
    nt.links.new(col2, sk.inputs["Base Color"])
    # pores and creases are matte (no specular glints on their rims); the mottling also varies the sheen
    rgh = sk.inputs["Roughness"].links[0].from_socket
    rgh = H._math(nt, "ADD", rgh, H._math(nt, "ADD", H._math(nt, "MULTIPLY", pore, 0.35), H._math(nt, "MULTIPLY", crease, 0.25)))
    rgh = H._math(nt, "ADD", rgh, H._math(nt, "MULTIPLY", m1, 0.10), clamp=True)
    nt.links.new(rgh, sk.inputs["Roughness"])
    cw = sk.inputs["Coat Weight"].links[0].from_socket               # no oily coat glint inside pores / lines
    nt.links.new(H._math(nt, "MULTIPLY", cw, H._math(nt, "SUBTRACT", 1.0, H._math(nt, "ADD", pore, crease), clamp=True)),
                 sk.inputs["Coat Weight"])
    # macro: deeper pores/creases and a tighter scatter radius so the surface reads sharp at ~17 um/pixel
    sk.inputs["Subsurface Scale"].default_value = 0.0012
    for n in nt.nodes:
        if n.bl_idname == "ShaderNodeBump" and abs(n.inputs["Distance"].default_value - 0.00007) < 1e-9:
            n.inputs["Distance"].default_value = 0.00012
    # render cost (the skin graph is evaluated per path vertex and 3x for the bump): one octave less on the noises,
    # no freckle cells (invisible at the macro scale anyway)
    for n in list(nt.nodes):
        if n.bl_idname == "ShaderNodeTexNoise":
            n.inputs["Detail"].default_value = max(0.0, n.inputs["Detail"].default_value - 1.0)
        if n.bl_idname == "ShaderNodeTexVoronoi" and round(n.inputs["Scale"].default_value) == 60:
            for l in list(n.outputs["Distance"].links) + list(n.outputs["Color"].links):
                nt.links.remove(l)
    print("[sh08] macro-pruned shader inputs:", _prune_macro(nt, MACRO_F), flush=True)


# --------------------------------------------------------------------------- shot

def build(ctx):
    sc = bpy.context.scene
    sun = build_set(ctx)
    apple, apple_mesh, ar, adims = place_apple()
    if not os.environ.get("S5_NOBG"):
        dress_background(ctx)

    hand = H.build_hand_mesh(pre_subdiv=1)
    man_hand(hand)
    arm = H.build_armature(hand)
    nails = H.nail_frames(hand)
    skin = H.skin_material(hand, nails)
    C.assign(hand, skin if not os.environ.get("S5_SIMPLESKIN") else C.principled("simple", (0.5, 0.28, 0.19), 0.45))
    sd = hand.modifiers.new("Subsurf", "SUBSURF"); sd.levels = 0; sd.render_levels = int(os.environ.get("S5_SUBD", "1"))
    if ctx.mode != "animatic" and not os.environ.get("S5_NOHAIR"):
        body_hair(hand, arm)                  # fix-sh08: an adult man's forearm/hand hair (rim-lit by the window)
        sc.cycles_curves.shape = "RIBBONS"
    cuff = rolled_cuff(hand, arm, z0=CUFF_Z0)
    man_skin(skin)

    # ---- choreography -------------------------------------------------------------------
    t_in = ctx.word("uzanıp") - 0.06          # hand breaks into frame (right edge)
    t_grab = ctx.word("alırken") - 0.05       # fingers closed
    t_asl = ctx.word("aslında")
    t_deg = ctx.word("değil")
    A = Vector(apple.location)

    # grasp orientation and pose (solved for contact below)
    _g = [float(x) for x in os.environ.get("S5_G", "52,25,0,15").split(",")]
    G = dict(yaw=_g[0], elev=_g[1], roll=_g[2])
    rot_g = hand_rot(**G)
    P_open = dict(wflex=14.0, wdev=-4.0, curl={"thumb": 0.10, "index": 0.10, "middle": 0.12, "ring": 0.16, "little": 0.22},
                  spread=1.6, topp=0.35, tswing=-0.15)
    P_reach = dict(wflex=4.0, wdev=-2.0, curl={"thumb": 0.18, "index": 0.22, "middle": 0.28, "ring": 0.34, "little": 0.40},
                   spread=0.8, topp=0.30, tswing=-0.05)
    # palm centre target: above-right of the apple top
    PC = Vector((0.012, 0.020, -0.060))
    set_pose(arm, P_open)
    arm.matrix_world = arm_matrix(Vector((0, 0, 0)), rot_g)
    bpy.context.view_layer.update()

    def palm_world():
        hb = arm.pose.bones["hand"]
        rest = arm.data.bones["hand"].matrix_local
        return arm.matrix_world @ hb.matrix @ rest.inverted() @ PC

    dg = bpy.context.evaluated_depsgraph_get()
    ap_bvh = BVHTree.FromObject(apple_mesh, dg)
    ap_inv = apple_mesh.matrix_world.inverted()
    rad = {"thumb": (0.0105, 0.0095, 0.0085), "index": (0.0092, 0.0084, 0.0076), "middle": (0.0095, 0.0087, 0.0078),
           "ring": (0.009, 0.0082, 0.0074), "little": (0.0078, 0.0072, 0.0066)}
    P_grab = dict(wflex=_g[3], wdev=-3.0, curl=dict(P_open["curl"]), spread=0.9, topp=0.22, tswing=-0.10)
    set_pose(arm, P_grab)
    arm.matrix_world = arm_matrix(Vector((0, 0, 0)), rot_g)
    bpy.context.view_layer.update()
    hb = arm.pose.bones["hand"]
    n_palm = (arm.matrix_world.to_3x3() @ hb.matrix.to_3x3() @ arm.data.bones["hand"].matrix_local.to_3x3().inverted() @ Vector((0, 1, 0))).normalized()
    Ac = A + Vector((0, 0, 0.004))
    hitp = ap_bvh.ray_cast(ap_inv @ Ac, (ap_inv.to_3x3() @ -n_palm).normalized())
    r_eff = max((apple_mesh.matrix_world @ hitp[0] - Ac).length if hitp[0] is not None else 0.0, 0.046)
    tgt = Ac - n_palm * (r_eff + GRIP_GAP)
    print("[sh08] palm normal", tuple(n_palm), "r_eff", r_eff, flush=True)
    pw = palm_world()
    W_grab = Vector((0, 0, 0)) + (tgt - pw)
    arm.matrix_world = arm_matrix(W_grab, rot_g)
    bpy.context.view_layer.update()

    def pen(k):
        worst = 1.0
        for i in range(3):
            b = arm.pose.bones[f"{k}_{i + 1}"]
            for s in (0.25, 0.6, 1.0):
                pt = arm.matrix_world @ b.head.lerp(b.tail, s)
                loc, nrm, idx, dist = ap_bvh.find_nearest(ap_inv @ pt)
                if loc is None:
                    continue
                inside = (ap_inv @ pt - loc).dot(nrm) < 0
                d = -dist if inside else dist
                worst = min(worst, d - rad[k][i] * (0.75 if s == 1.0 and i == 2 else 1.0))
        return worst

    for k in H.FINGERS:
        lo, hi = -0.7, 1.9
        P_grab["curl"][k] = hi
        set_pose(arm, P_grab); bpy.context.view_layer.update()
        if pen(k) > 0:
            print("[sh08] finger never touches:", k, flush=True)
            P_grab["curl"][k] = {"thumb": 0.5, "index": 0.62, "middle": 0.72, "ring": 0.85, "little": 0.98}[k]
            continue
        for it in range(14):
            mid = (lo + hi) / 2
            P_grab["curl"][k] = mid
            set_pose(arm, P_grab); bpy.context.view_layer.update()
            if pen(k) > -0.0008:
                lo = mid
            else:
                hi = mid
        P_grab["curl"][k] = min(lo, 0.75) if k == "thumb" else lo
        print(f"[sh08] contact curl {k}: {lo:.3f}", flush=True)
    set_pose(arm, P_grab)

    # ---- root animation via a parent empty (pivot = rest wrist) -------------------------
    root = C.empty("HandRoot", (0, 0, 0))
    root.rotation_mode = "QUATERNION"
    arm.parent = root
    arm.matrix_parent_inverse = Matrix.Identity(4)
    arm.matrix_basis = Matrix.Translation(-H.WRIST)

    def key_root(t, W, rot3, interp="BEZIER"):
        root.location = W
        root.rotation_quaternion = rot3.to_quaternion()
        C.key(root, "location", t, None, interp=interp)
        C.key(root, "rotation_quaternion", t, None, interp=interp)

    lift = Vector((0.010, -0.018, 0.075))
    rot_lift = hand_rot(G["yaw"] - 6, G["elev"] - 4, G["roll"] + 6)
    AH = Vector((math.cos(math.radians(G["yaw"])), math.sin(math.radians(G["yaw"])), 0.0))   # toward the elbow
    path = [
        (ctx.t0 - 0.3, W_grab + AH * 0.30 + Vector((0, 0, 0.26)), hand_rot(G["yaw"] + 6, G["elev"] + 8, G["roll"] - 20)),
        (t_in - 0.25, W_grab + AH * 0.18 + Vector((0, 0, 0.17)), hand_rot(G["yaw"] + 5, G["elev"] + 6, G["roll"] - 15)),
        (t_in + 0.32, W_grab + AH * 0.08 + Vector((0, 0, 0.055)), hand_rot(G["yaw"] + 3, G["elev"] + 3, G["roll"] - 8)),
        (t_grab - 0.30, W_grab + AH * 0.015 + Vector((0, 0, 0.018)), hand_rot(G["yaw"] + 1, G["elev"], G["roll"] - 3)),
        (t_grab - 0.02, W_grab, rot_g),
        (t_grab + 0.16, W_grab + Vector((0.0, 0.0, -0.0015)), rot_g),
        (t_grab + 0.95, W_grab + lift * 0.85, hand_rot(G["yaw"] - 4, G["elev"] - 3, G["roll"] + 4)),
        (t_grab + 1.70, W_grab + lift, rot_lift),
        (t_deg + 0.80, W_grab + lift + Vector((0.004, 0.003, 0.006)), hand_rot(G["yaw"] - 7, G["elev"] - 4, G["roll"] + 7)),
    ]
    for t, W, R in path:
        key_root(t, W, R)
    C.set_extrapolation(root, "LINEAR")

    # finger choreography: open during the reach, slight follow-through, close on 'alırken'
    P_relax = dict(P_grab); P_relax["curl"] = {k: v + 0.03 for k, v in P_grab["curl"].items()}
    P_relax["wflex"] = P_grab["wflex"] - 2
    key_pose(arm, ctx.t0 - 0.3, P_reach)
    key_pose(arm, t_in + 0.05, dict(P_reach, wflex=10.0, spread=1.1))
    key_pose(arm, t_grab - 0.32, P_open)
    # fingers close in a slightly staggered order (index/thumb first)
    P_mid = dict(P_open); P_mid["curl"] = {k: P_open["curl"][k] * 0.4 + P_grab["curl"][k] * 0.6 for k in H.FINGERS}
    P_mid["curl"]["index"] = P_grab["curl"]["index"] * 0.85
    P_mid["curl"]["thumb"] = P_grab["curl"]["thumb"] * 0.85
    P_mid["topp"] = 0.5; P_mid["spread"] = 1.1
    key_pose(arm, t_grab - 0.14, P_mid)
    key_pose(arm, t_grab, P_grab)
    P_lift = dict(P_grab); P_lift["wflex"] = P_grab["wflex"] - 6
    key_pose(arm, t_grab + 0.9, P_lift)
    key_pose(arm, t_deg + 0.8, dict(P_lift, wflex=P_lift["wflex"] - 1.5))

    # apple follows the hand bone after the grasp
    bpy.context.view_layer.update()
    sc.frame_set(int(round((t_grab + 0.02) * C.FPS)))
    hb = arm.pose.bones["hand"]
    M_bone = arm.matrix_world @ hb.matrix
    co = apple.constraints.new("CHILD_OF")
    co.target = arm; co.subtarget = "hand"
    co.inverse_matrix = M_bone.inverted()
    co.influence = 0.0
    C.key(co, "influence", t_grab + 0.02, 0.0, interp="CONSTANT")
    C.key(co, "influence", t_grab + 0.03, 1.0, interp="CONSTANT")

    # tracker at the wrist (bone tail of 'forearm' = wrist)
    trk = C.empty("TRK_hand", (0, 0, 0))
    trk.parent = arm; trk.parent_type = "BONE"; trk.parent_bone = "forearm"
    trk.matrix_parent_inverse = Matrix.Identity(4)
    trk.location = (0, 0, 0)          # bone-parent space origin = bone tail = wrist

    # ---- camera (baked per frame) -----------------------------------------------------
    cam = C.camera("cam", lens=100, loc=(0, -0.8, 0.3), look_at=(0, 0, 0.05), fstop=2.8, focus=(0, 0, 0.05))
    cam.data.shift_x = CAM_SHIFT_X            # frame edge placed so the fingertips break in on f982 (sound sync)
    aim = C.empty("cam_aim", (0, 0, 0.05))
    foc = C.focus_empty(cam)
    # macro target on the dorsal forearm (rest space), found on the surface
    bvh_rest = BVHTree.FromObject(hand, bpy.context.evaluated_depsgraph_get(), deform=False)
    probe = Vector((0.004, 0.0, 0.030))
    hit = bvh_rest.ray_cast(probe + Vector((0, -0.08, 0)), Vector((0, 1, 0)))
    S_rest = hit[0] if hit[0] is not None else probe + Vector((0, -0.024, 0))
    N_rest = (hit[1] if hit[0] is not None else Vector((0, -1, 0))).normalized()
    print("[sh08] macro target rest", tuple(S_rest), tuple(N_rest), flush=True)
    for o in (hand,):
        pass

    def arm_world():
        return arm.matrix_world.copy()

    # fix-sh08 (s3-2): the camera sits on the room side of the table looking at the plaster back wall, so the window
    # light rakes in from the LEFT as in sh03 (worn wood reads brown) instead of backlighting a white sweep.
    C0 = Vector(CAM0)
    A_rest_focus = Vector(apple.location) + Vector((0, 0, 0.01))
    t_skin = 1127.5 / C.FPS                    # 'değil': sharp macro of the forearm skin
    frames = list(range(ctx.f0 - 2, ctx.f1 + 3))
    for f in frames:
        sc.frame_set(f)
        t = f / C.FPS
        Mw = arm.matrix_world.copy()
        wrist_w = Mw @ H.WRIST
        S_w = Mw @ S_rest                       # forearm is weighted to the (un-posed) forearm bone: rigid with the rig
        N_w = (Mw.to_3x3() @ N_rest).normalized()
        Aw = apple.matrix_world.translation.copy()
        # phase 1: documentary framing on the apple; the hand is soft until contact
        drift = C.remap(t, ctx.t0, t_asl, C.smooth)
        p1 = C0 + Vector((-0.02 * drift, 0.05 * drift, 0.012 * drift))
        lk1 = Vector((0.0, 0.02, 0.055)).lerp(Aw * 0.6 + wrist_w * 0.4, C.remap(t, t_grab + 0.1, t_asl + 0.8))
        # focus: the apple until the fingers close, then it racks onto the back of the hand and holds it through the
        # lift (fix-sh08 s3-1: the man's hand - veins, tendons, rim-lit hair, cuff - must read sharp)
        f1 = A_rest_focus.lerp(Mw @ HAND_FOCUS_REST, C.remap(t, t_grab - 0.1, t_grab + 0.65))
        # phase 2 ("aslında" ->): glide along the wrist/forearm and land square on the dorsal forearm skin
        tgt2 = wrist_w.lerp(S_w, C.smooth(C.remap(t, t_asl, t_skin - 0.35)))
        dN = (N_w + (p1 - S_w).normalized() * 0.45).normalized()
        d = (p1 - tgt2).normalized().lerp(dN, C.smooth(C.remap(t, t_asl, t_skin - 0.25))).normalized()
        s = C.remap(t, t_asl - 0.1, t_skin, lambda x: C.smooth(x) * 0.5 + max(0.0, min(1.0, x)) * 0.5)
        dist = math.exp(C.lerp(math.log(0.40), math.log(MACRO_D), s))
        dist *= math.exp(-0.10 * max(0.0, t - t_skin))          # keeps creeping in under the post zoom
        p2 = tgt2 + d * dist
        b = C.remap(t, t_asl - 0.1, t_asl + 1.0)
        pos = p1.lerp(p2, b)
        look = lk1.lerp(tgt2, C.remap(t, t_asl - 0.1, t_asl + 0.9))
        # focus: apple -> the wrist/forearm under the camera; a short rack (focus breathes behind the skin, then pulls
        # in) lands the pores, hair and creases sharp on 'değil'
        lag = dist * 0.07 * C.smooth(C.remap(f, 1100, 1110)) * (1.0 - C.smooth(C.remap(f, 1110, 1127.5)))
        fskin = tgt2 + (tgt2 - pos).normalized() * lag
        fpt = f1.lerp(fskin, C.remap(t, t_asl + 0.1, t_asl + 1.0))
        cam.location = pos; aim.location = look; foc.location = fpt
        for ob, path in ((cam, "location"), (aim, "location"), (foc, "location")):
            ob.keyframe_insert(path, frame=f)
        fs1 = C.lerp(2.4, 5.6, C.remap(t, t_grab - 0.1, t_grab + 0.65))     # stop down with the rack onto the hand
        cam.data.dof.aperture_fstop = C.lerp(fs1, 4.5, C.remap(t, t_asl + 0.2, t_asl + 1.6))
        cam.data.dof.keyframe_insert("aperture_fstop", frame=f)
    C.track_to(cam, aim)
    C.handheld(cam, amp_loc=0.0007, amp_rot=0.0, speed=0.4, seed=8)
    C.handheld(aim, amp_loc=0.0006, amp_rot=0.0, speed=0.3, seed=9)
    # (fix-sh08 s3-4: the backlit red-glow ramp, the SSS fade and the cheap red crossfade are gone: the forearm stays
    # natural skin through the push and into the macro)
    # light dissolve from sh07's glare: open over-exposed, settle by ~40.9 s (about 1 stop lower than before)
    vs = sc.view_settings
    for fr, ev in ((ctx.f0, EXPO + 2.6), (int(round(40.72 * C.FPS)), EXPO + 1.0), (int(round(41.05 * C.FPS)), EXPO),
                   (int(round(t_asl * C.FPS)), EXPO), (ctx.f1, EXPO + EXPO_END)):
        vs.exposure = ev; vs.keyframe_insert("exposure", frame=fr)
    # no diffuse bounce from GLOW_NO_NORMAL_F (render budget) costs ~3 % brightness: hold the exposure step-free
    fc = [c for c in C.fcurves(sc) if c.data_path == "view_settings.exposure"][0]
    v0, v1 = fc.evaluate(GLOW_NO_NORMAL_F - 1), fc.evaluate(GLOW_NO_NORMAL_F)
    fc.keyframe_points[-1].co.y += MACRO_EV
    fc.keyframe_points.insert(GLOW_NO_NORMAL_F - 1, v0)
    fc.keyframe_points.insert(GLOW_NO_NORMAL_F, v1 + MACRO_EV)
    fc.update()
    sc.frame_set(ctx.f0)
    return {"final_spp": int(os.environ.get("S5_SPP", "16")), "final_res": int(os.environ.get("S5_RES", "80")), "preview_spp": 24, "max_bounces": 4, "diffuse_bounces": 1,
            "glossy_bounces": 1, "transmission_bounces": 4, "transparent_bounces": 8, "final_threshold": 0.03, "texture_limit": "2048", "motion_blur": not os.environ.get("S5_NOMB"),
            "shutter": 0.3}     # fix-sh08: 108 deg shutter: the lift no longer smears the hand's skin and hair


_cfg0 = C.configure_render
# QA g2-2: in the fully defocused red-glow end the denoiser's normal guide is pure lens-sample noise (hand edge vs
# window across a 4 cm aperture); OIDN keeps it as detail and the field boils (32 spp barely helps). From this frame
# on (nothing is in focus any more) denoise with colour + albedo only: same cost, smooth field, and closer to a 512 spp
# reference (the boil also darkened the glow ~1 %). Pure function of the frame, so any chunk start gives the same image.
# QA g10-1: switch at 1091, not 1104 (1091-1103 boiled as well); 1089-1090 keep the normal guide for the apple rim.
GLOW_NO_NORMAL_F = 1091
# fix-sh08: from here only forearm skin is in frame (no knuckles, nails, thin edges): the knuckle/nail/translucency
# shader branches are pruned with keyed constants (render budget; any job start is exact)
MACRO_F = 1080
SSS_OFF_F = 1068


def _cfg(mode, ov):
    _cfg0(mode, ov)
    if mode == "final":
        bpy.context.scene.render.resolution_percentage = ov.get("final_res", 100)
        base_passes = bpy.context.scene.cycles.denoising_input_passes
        base_diff = bpy.context.scene.cycles.diffuse_bounces

        def _glow_denoise(scene, *_):
            macro = scene.frame_current >= GLOW_NO_NORMAL_F
            want = "RGB_ALBEDO" if macro else base_passes
            # fix-sh08: the skin macro has no skin-to-skin bounce worth its cost (render budget); same switch frame,
            # its ~3 % brightness loss is made up by MACRO_EV in the exposure curve
            diff = 0 if macro else base_diff
            if scene.cycles.denoising_input_passes != want or scene.cycles.diffuse_bounces != diff:
                scene.cycles.denoising_input_passes = want
                scene.cycles.diffuse_bounces = diff
                scene.update_tag()      # without the tag the render depsgraph keeps the old value
        bpy.app.handlers.render_pre.append(_glow_denoise)


C.configure_render = _cfg
C.run("sh08", build)
