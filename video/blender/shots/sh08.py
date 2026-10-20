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
    wood = C.mat_from_textures("TableWood", C.ph_texture("wood_table_worn", "2k"), scale=1.0, base_tint=(0.95, 0.86, 0.76))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.05, 0.12, -0.02))
    tab = bpy.context.object; tab.name = "Table"; tab.scale = (1.8, 1.1, 0.04)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.uv.cube_project(cube_size=1.6); bpy.ops.object.mode_set(mode="OBJECT")
    C.bevel(tab, 0.004, 3)
    C.assign(tab, wood)
    # dust / fingerprints sheen breakup on the wood: multiply roughness by noise
    nt = wood.node_tree
    p = nt.nodes["Principled BSDF"]
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
    _box("Mullion_h", (wx, win_c.y, win_c.z + 0.26), (0.05, ww, 0.03), frame_m)
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


# --------------------------------------------------------------------------- shot

def build(ctx):
    sc = bpy.context.scene
    sun = build_set(ctx)
    apple, apple_mesh, ar, adims = place_apple()
    if not os.environ.get("S5_NOBG"):
        dress_background(ctx)

    hand = H.build_hand_mesh(pre_subdiv=1)
    arm = H.build_armature(hand)
    nails = H.nail_frames(hand)
    skin = H.skin_material(hand, nails)
    C.assign(hand, skin if not os.environ.get("S5_SIMPLESKIN") else C.principled("simple", (0.5, 0.28, 0.19), 0.45))
    hand.data.materials.append(H.hair_material())
    sd = hand.modifiers.new("Subsurf", "SUBSURF"); sd.levels = 0; sd.render_levels = int(os.environ.get("S5_SUBD", "1"))
    if ctx.mode != "animatic" and not os.environ.get("S5_NOHAIR"):
        H.add_body_hair(hand, count=int(os.environ.get("S5_HAIRN", "500")))
        sc.cycles_curves.shape = os.environ.get("S5_CURVE", "RIBBONS")
    cuff = H.cuff(hand, arm)

    # ---- choreography -------------------------------------------------------------------
    t_in = ctx.word("uzanıp") - 0.06          # hand breaks into frame (right edge)
    t_grab = ctx.word("alırken") - 0.05       # fingers closed
    t_asl = ctx.word("aslında")
    t_deg = ctx.word("değil")
    A = Vector(apple.location)

    # grasp orientation and pose (solved for contact below)
    _g = [float(x) for x in os.environ.get("S5_G", "-30,15,0,25").split(",")]
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
    path = [
        (ctx.t0 - 0.3, W_grab + Vector((0.34, -0.03, 0.050)), hand_rot(G["yaw"] + 6, G["elev"] - 8, G["roll"] - 30)),
        (t_in - 0.25, W_grab + Vector((0.23, -0.02, 0.045)), hand_rot(G["yaw"] + 5, G["elev"] - 7, G["roll"] - 24)),
        (t_in + 0.32, W_grab + Vector((0.085, -0.008, 0.036)), hand_rot(G["yaw"] + 3, G["elev"] - 3, G["roll"] - 12)),
        (t_grab - 0.30, W_grab + Vector((0.016, 0.0, 0.016)), hand_rot(G["yaw"] + 1, G["elev"], G["roll"] - 4)),
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
    aim = C.empty("cam_aim", (0, 0, 0.05))
    foc = C.focus_empty(cam)
    # macro target on the dorsal forearm (rest space), found on the surface
    bvh_rest = BVHTree.FromObject(hand, bpy.context.evaluated_depsgraph_get(), deform=False)
    probe = Vector((0.004, 0.0, 0.062))
    hit = bvh_rest.ray_cast(probe + Vector((0, -0.08, 0)), Vector((0, 1, 0)))
    S_rest = hit[0] if hit[0] is not None else probe + Vector((0, -0.024, 0))
    N_rest = (hit[1] if hit[0] is not None else Vector((0, -1, 0))).normalized()
    print("[sh08] macro target rest", tuple(S_rest), tuple(N_rest), flush=True)
    for o in (hand,):
        pass

    def arm_world():
        return arm.matrix_world.copy()

    C0 = Vector((0.30, -1.00, 0.255))          # front-right: window/sun behind-left of the hand -> rim light
    HE_rest = H.JOINTS["little"][1] + Vector((-0.008, 0.002, 0.0))   # little-finger edge: thin, glows red when backlit
    frames = list(range(ctx.f0 - 2, ctx.f1 + 3))
    for f in frames:
        sc.frame_set(f)
        t = f / C.FPS
        Mw = arm_world()
        wrist_w = Mw @ H.WRIST
        lb = arm.pose.bones["little_2"]
        he_w = arm.matrix_world @ lb.head.lerp(lb.tail, 0.5)
        Aw = apple.matrix_world.translation.copy()
        # phase 1: documentary framing on the apple; the hand is soft until contact
        drift = C.remap(t, ctx.t0, t_asl, C.smooth)
        p1 = C0 + Vector((-0.02 * drift, 0.06 * drift, 0.015 * drift))
        lk1 = Vector((0.0, 0.02, 0.045)).lerp(Aw * 0.8 + wrist_w * 0.2, C.remap(t, t_grab - 0.4, t_grab + 1.2))
        f1 = Aw.copy()
        # phase 2 ("aslında" ->): push toward the hand edge with the bright window directly behind it;
        # focus slides off toward the window so the backlit skin becomes a warm-red translucent glow
        s = C.remap(t, t_asl - 0.1, ctx.t1, lambda x: C.smooth(x) * 0.6 + max(0.0, min(1.0, x)) * 0.4)
        tgt2 = wrist_w.lerp(he_w, 0.35 + 0.65 * C.remap(t, t_asl, ctx.t1))
        d = (tgt2 - WIN_C).normalized()
        d = (d + Vector((0, 0, 0.12))).normalized()
        dist = math.exp(C.lerp(math.log(0.55), math.log(0.105), s))
        side2 = d.cross(Vector((0, 0, 1))).normalized()
        p2 = tgt2 + d * dist - side2 * dist * 0.10
        b = C.remap(t, t_asl - 0.1, t_asl + 1.3)
        pos = p1.lerp(p2, b)
        look = lk1.lerp(tgt2, C.remap(t, t_asl - 0.1, t_asl + 1.0))
        fpt = f1.lerp(tgt2 + (WIN_C - tgt2).normalized() * 0.14, C.remap(t, t_asl + 0.6, ctx.t1 - 0.3) ** 1.5)
        cam.location = pos; aim.location = look; foc.location = fpt
        for ob, path in ((cam, "location"), (aim, "location"), (foc, "location")):
            ob.keyframe_insert(path, frame=f)
        cam.data.dof.aperture_fstop = 2.4
        cam.data.dof.keyframe_insert("aperture_fstop", frame=f)
    C.track_to(cam, aim)
    C.handheld(cam, amp_loc=0.0007, amp_rot=0.0, speed=0.4, seed=8)
    C.handheld(aim, amp_loc=0.0006, amp_rot=0.0, speed=0.3, seed=9)

    # backlit red glow builds as the frame dissolves into blur (hand held against the light)
    for n in skin.node_tree.nodes:
        if n.bl_idname == "ShaderNodeMixShader" and n.inputs[2].is_linked and n.inputs[2].links[0].from_node.bl_idname == "ShaderNodeBsdfTranslucent":
            n.inputs[0].default_value = 0.07; n.inputs[0].keyframe_insert("default_value", frame=int(round((t_asl + 1.2) * C.FPS)))
            n.inputs[0].default_value = 0.45; n.inputs[0].keyframe_insert("default_value", frame=ctx.f1)
    # light dissolve from sh07's glare: open over-exposed, settle by ~40.9 s
    vs = sc.view_settings
    vs.exposure = 2.6; vs.keyframe_insert("exposure", frame=ctx.f0)
    vs.exposure = 1.0; vs.keyframe_insert("exposure", frame=int(round(40.72 * C.FPS)))
    vs.exposure = 0.0; vs.keyframe_insert("exposure", frame=int(round(41.05 * C.FPS)))
    vs.exposure = 0.0; vs.keyframe_insert("exposure", frame=int(round(t_asl * C.FPS)))
    vs.exposure = 0.3; vs.keyframe_insert("exposure", frame=ctx.f1)
    sc.frame_set(ctx.f0)
    return {"final_spp": int(os.environ.get("S5_SPP", "32")), "preview_spp": 24, "max_bounces": 4, "diffuse_bounces": 1,
            "glossy_bounces": 1, "transmission_bounces": 4, "transparent_bounces": 8, "final_threshold": 0.03, "texture_limit": "2048", "motion_blur": not os.environ.get("S5_NOMB")}


C.run("sh08", build)
