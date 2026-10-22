"""sh04 · 16.00–22.95 · "Halbuki canlılar da bizler de bu ihtiyaçlarımızı kendimiz elde edemeyiz,
hiçbirine elimiz yetişmiyor."

Top-down on barren cracked dry earth, the lone (slightly wilting) seedling at frame centre under a
harsh 49° sun.  On "canlılar" the camera arcs down to ground level beside it: tiny plant, vast
empty sky, one distant cloud, heat shimmer over the lake bed.  On "hiçbirine" a backlit human hand
rises from below toward the sun at upper centre - out of reach.  Tracker: TRK_sun."""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from mathutils import Vector, Matrix
import common as C
import lib_s3 as L


def look_matrix(pos, fwd, up_hint):
    f = fwd.normalized()
    r = f.cross(up_hint).normalized()
    u = r.cross(f).normalized()
    m = Matrix((r, u, -f)).transposed()          # columns: camera X, Y, Z(back)
    return m.to_4x4() @ Matrix.Identity(4) if False else (Matrix.Translation(pos) @ m.to_4x4())


def build(ctx):
    # ---------------------------------------------------------------- sky + sun
    sky = L.clean_sky("dry_cracked_lake", "4k", keep_cloud=(0.025, 0.105, 21.0, 38.0), move_cloud=(0.525, -10.0), tag="sh04")
    L.world_from_hdri(sky["path"], cam_path=sky["cam"], strength=1.0)
    _sky_saturation(1.3)
    _horizon_haze(0.45)
    sdir = L.sun_dir_world(sky["sun_el"], sky["sun_u"])
    irr = sum(sky["sun_irr_rgb"]) / 3
    L.sun_from_dir(sdir, irr, kelvin_k=5700, angle_deg=0.53)
    h = Vector((sdir.x, sdir.y, 0)).normalized()          # horizontal direction toward the sun
    side = h.cross(Vector((0, 0, 1))).normalized()
    sun_far = sdir * 4000.0
    C.empty("TRK_sun", tuple(sun_far))

    # ---------------------------------------------------------------- ground + seedling
    em, _ = L.mat_cracked_earth(tile=1.0, disp=0.012)
    L.ground(mat=em, size=8.0, dicing=float(os.environ.get("S3_DICE", "2.0")))
    sd = L.seedling(wilt=0.35, rot_z=math.atan2(h.y, h.x) + 0.5)
    # a breath of hot wind: tiny sway of the whole plant
    root = sd["root"]
    for i, t in enumerate([ctx.t0 - 0.3 + j * 0.5 for j in range(17)]):
        root.rotation_euler[0] = math.radians(1.2 * math.sin(i * 1.7))
        root.rotation_euler[1] = math.radians(0.8 * math.sin(i * 2.3 + 1))
        root.keyframe_insert("rotation_euler", index=0, frame=t * C.FPS)
        root.keyframe_insert("rotation_euler", index=1, frame=t * C.FPS)

    # heat shimmer sheet between the plant and the horizon
    hz = L.heat_haze(loc=tuple(h * 1.6 + Vector((0, 0, 0.18))), size=(4.0, 0.36), strength=0.5, scale=14.0,
                     t0=ctx.t0 - 1, t1=ctx.t1 + 1)
    hz.rotation_euler = (math.radians(90), 0, math.atan2(h.y, h.x) + math.radians(90))


    # ---------------------------------------------------------------- camera
    T = Vector((0, 0, 0.032))
    cam = C.camera("cam", lens=35, loc=(0, 0, 0.45), fstop=2.8)
    cam.rotation_mode = "XYZ"
    focus = C.empty("cam_focus", tuple(T))
    cam.data.dof.focus_object = focus
    t_desc0, t_desc1 = ctx.word("canlılar") - 0.12, ctx.word("bizler") + 1.6
    t_hand = ctx.word("hiçbirine")
    prev = None
    mats = {}
    hold_fix = {}
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        t = f / C.FPS
        s = C.remap(t, t_desc0, t_desc1, C.smoother)
        # arc from overhead (theta=0) to near ground level (theta=86 deg from vertical)
        theta = math.radians(86 * s)
        r = C.lerp(0.34, 0.165, C.smooth(s)) - 0.025 * C.remap(t, t_desc1, ctx.t1, C.smooth)
        drift = side * 0.012 * C.remap(t, ctx.t0 - 0.3, ctx.t1, C.smooth)
        pos = T + (-h * math.sin(theta) + Vector((0, 0, 1)) * math.cos(theta)) * r + drift
        pos.z = max(pos.z, 0.014)
        # slow overhead rotation before the descent (feels like a drone settling)
        if s <= 0:
            pass
        # aim: at the plant, then (hand) tilting up toward the sun
        aim_plant = (T + Vector((0, 0, 0.012 * s)) - pos).normalized()
        if s < 1e-4:
            hold_aim = aim_plant
            aim_plant = Vector((0, 0, -1))
        u = C.remap(t, t_hand - 1.3, t_hand + 0.15, C.smoother)   # look up to the sun first, then the hand rises
        pos.z += 0.085 * u                       # the camera rises a little with the reach (room for the arm)
        # sun at upper centre: aim 20 deg below the sun direction
        sun_aim = (sdir - Vector((0, 0, 1)) * 0.0)
        el_target = math.radians(math.degrees(math.asin(sdir.z)) - 19.0)
        aim_up = (h * math.cos(el_target) + Vector((0, 0, 1)) * math.sin(el_target)).normalized()
        fwd = aim_plant.lerp(aim_up, u).normalized()
        upv = (h * (1 - math.sin(theta)) + Vector((0, 0, 1)) * math.sin(theta)).normalized()
        if abs(fwd.dot(upv)) > 0.999:
            upv = h
        M = look_matrix(pos, fwd, upv)
        if s < 1e-4:   # rotation taking the straight-down hold onto the plant aim (applied below)
            hold_fix[f] = (look_matrix(pos, hold_aim, upv).to_3x3() @ M.to_3x3().inverted()).to_euler()
        cam.matrix_world = M
        e = cam.rotation_euler.copy()
        if prev is not None:
            e.make_compatible(prev)
        cam.rotation_euler = e
        prev = e.copy()
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_euler", frame=f)
        mats[f] = M.copy()
    # The straight-down hold snapped ~3.5 px onto the plant aim at f400->401.  Aim the hold frames at the
    # plant too, via a delta rotation that is exactly zero from f400.75 on: f401+ (incl. its shutter-open
    # motion-blur sample) keep the approved camera untouched.
    for f, e in hold_fix.items():
        cam.delta_rotation_euler = e
        cam.keyframe_insert("delta_rotation_euler", frame=f)
    cam.delta_rotation_euler = (0, 0, 0)
    cam.keyframe_insert("delta_rotation_euler", frame=max(hold_fix) + 0.75)
    hand = make_hand(ctx, mats[C.t2f(t_hand + 1.3)])
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        t = f / C.FPS
        # focus: plant, racking to the hand as it rises
        fu = C.remap(t, t_hand - 0.15, t_hand + 0.55, C.smoother)
        focus.location = T.lerp(hand["focus_world"], fu)
        focus.keyframe_insert("location", frame=f)
    C.handheld(cam, amp_loc=0.0004, amp_rot=0.0010, speed=0.5)
    bpy.context.scene.view_settings.exposure = -0.35
    ov = {"final_spp": 16, "final_threshold": 0.04, "preview_spp": 32, "clamp_indirect": 4.0}
    L.render_tuning(os.environ.get("S3_DQ", "BALANCED"), os.environ.get("S3_PF"))
    return L.experiment(ov)


def _horizon_haze(amount):
    """Aerial perspective for the far tree line (harsh noon haze): camera rays only, a band around the
    horizon blended toward the pale sky colour so the trees sit far away."""
    nt = bpy.context.scene.world.node_tree
    hs = [n for n in nt.nodes if n.type == "HUE_SAT"][-1]
    to = [l for l in nt.links if l.from_node == hs][0].to_socket
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    ab = nt.nodes.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"; nt.links.new(sep.outputs["Z"], ab.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange"); nt.links.new(ab.outputs[0], mr.inputs["Value"])
    mr.inputs["From Min"].default_value = 0.16; mr.inputs["From Max"].default_value = 0.0
    mr.inputs["To Max"].default_value = amount
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"
    nt.links.new(mr.outputs[0], mx.inputs[0]); nt.links.new(hs.outputs[0], mx.inputs[6])
    mx.inputs[7].default_value = (0.62, 0.66, 0.70, 1)
    nt.links.new(mx.outputs[2], to)


def _sky_saturation(sat):
    nt = bpy.context.scene.world.node_tree
    for n in nt.nodes:
        if n.type == "BACKGROUND" and n.inputs[0].is_linked:
            pass
    envs = [n for n in nt.nodes if n.type == "TEX_ENVIRONMENT"]
    cam_env = envs[-1]
    hs = nt.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = sat
    lk = [l for l in nt.links if l.from_node == cam_env][0]
    to = lk.to_socket
    nt.links.remove(lk)
    nt.links.new(cam_env.outputs[0], hs.inputs["Color"]); nt.links.new(hs.outputs[0], to)


def cam_point(M, px, py, depth, lens=35.0):
    """World point at pixel (px,py) of the 1080x1920 frame, `depth` metres in front of camera M."""
    th = math.tan(math.atan(18.0 / lens))          # half vertical (sensor 36 mm) / lens
    y = (960 - py) / 960 * th * depth
    x = (px - 540) / 960 * th * depth
    return M @ Vector((x, y, -depth))


def make_hand(ctx, M):
    o = C.human_mesh("realistic_hand")           # NB: this name is a camera in the bundle (see NOTES)
    if isinstance(o, list):
        o = o[0]
    mesh = o.parent if o.type != "MESH" else o
    if o.type != "MESH":
        bpy.data.objects.remove(o)
    if mesh.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(mesh)
    mesh.parent = None
    for m in mesh.modifiers:
        if m.type == "MULTIRES":
            m.render_levels = m.total_levels
            m.levels = min(1, m.total_levels)
    mesh.data.materials.clear()
    skin = mat_skin()
    mesh.data.materials.append(skin)
    # an adult man's hand: broader palm, thicker fingers (base mesh is slender)
    for v in mesh.data.vertices:
        v.co.x *= 1.16
        v.co.y *= 1.22
    spread_fingers(mesh)
    curl_fingers(mesh, float(os.environ.get("S3_CURL", "-0.24")))
    sub = mesh.modifiers.new("Smooth", "SUBSURF"); sub.levels = 1; sub.render_levels = 2
    vs = [v.co for v in mesh.data.vertices]
    zmin = min(v.z for v in vs); zmax = max(v.z for v in vs)
    top = [v for v in vs if v.z > zmax - 0.04]; bot = [v for v in vs if v.z < zmin + 0.04]
    spread = lambda pts: max(p.x for p in pts) - min(p.x for p in pts)
    tip_up = spread(top) > spread(bot)
    tip_local = Vector((0, 0, zmax if tip_up else zmin))
    wrist_local = Vector((0, 0, zmin if tip_up else zmax))
    hand_len = (tip_local - wrist_local).length
    # target pose in the final frame: wrist below frame, fingertips reaching toward the sun but
    # stopping well short of it (gap = the key-word band)
    wrist = cam_point(M, 780, 1960, 0.30)
    tipw = cam_point(M, 590, 900, 0.46)
    A = (tipw - wrist).normalized()
    camz = (M.to_translation() - wrist).normalized()
    N = -(camz - A * camz.dot(A)).normalized()     # back of the hand to camera, palm to the sun
    Al = (tip_local - wrist_local).normalized()
    Nl = Vector((0, PALM_SIGN, 0))
    Bl = Al.cross(Nl); Bw = A.cross(N)
    R = Matrix((A, N, Bw)).transposed() @ Matrix((Al, Nl, Bl)).transposed().inverted()
    s = (tipw - wrist).length / hand_len * 0.98
    pivot = C.empty("hand_pivot", (0, 0, 0))
    pivot.rotation_mode = "QUATERNION"
    pivot.rotation_quaternion = R.to_quaternion()
    pivot.scale = (s, s, s)
    mesh.parent = pivot
    mesh.matrix_parent_inverse = Matrix.Identity(4)
    mesh.location = -wrist_local
    forearm_and_cuff(mesh, wrist_local, tip_local, skin)
    t_hand = ctx.word("hiçbirine")
    t0, t1 = t_hand - 0.12, t_hand + 1.0
    down = (M.to_3x3() @ Vector((0, -1, 0))).normalized()
    toward = (M.to_translation() - wrist).normalized()
    low = wrist + down * 0.30 + toward * 0.05        # starts fully below the frame edge, close to the lens
    C.key(pivot, "location", ctx.t0, tuple(low))
    # not in the scene before it enters (it would otherwise lurk behind the plant)
    for o_ in [mesh] + list(mesh.children):
        o_.hide_render = True; o_.keyframe_insert("hide_render", frame=(t0 - 0.05) * C.FPS)
        o_.hide_render = False; o_.keyframe_insert("hide_render", frame=t0 * C.FPS)
    C.key(pivot, "location", t0, tuple(low))
    C.key(pivot, "location", t1, tuple(wrist))
    # straining upward with a faint tremble
    for k in range(1, 9):
        tt = t1 + k * 0.17
        if tt > ctx.t1 + 0.3:
            break
        jit = Vector((math.sin(k * 2.1), math.cos(k * 1.7), math.sin(k * 3.3))) * 0.0012
        C.key(pivot, "location", tt, tuple(wrist + A * 0.02 * min(1.0, k / 6) + jit))
    # wrist tilts back as the hand rises (reaching), settles stretched
    q1 = R.to_quaternion()
    q0 = (Matrix.Rotation(math.radians(-25), 3, Bw) @ R).to_quaternion()
    if q0.dot(q1) < 0:                               # same hemisphere: tilt 25 deg, not the long way round
        q0.negate()
    pivot.rotation_quaternion = q0
    pivot.keyframe_insert("rotation_quaternion", frame=t0 * C.FPS)
    pivot.rotation_quaternion = q1
    pivot.keyframe_insert("rotation_quaternion", frame=t1 * C.FPS)
    fw = wrist + A * (tipw - wrist).length * 0.6
    return {"pivot": pivot, "mesh": mesh, "focus_world": fw}


PALM_SIGN = 1.0


def curl_fingers(mesh, curl, knuckle_z=-0.112):
    """Relaxed, gently curved fingers: each finger bends about the local X axis at the knuckle, the
    bend growing toward the tip (sign: toward the palm side)."""
    for v in mesh.data.vertices:
        x, y, z = v.co
        if z > knuckle_z or x > 0.052:
            continue
        d = knuckle_z - z
        a = curl * min(1.0, d / 0.09) ** 1.4
        # rotate (y, z) about (0, knuckle_z)
        ry = y * math.cos(a) - (z - knuckle_z) * math.sin(a)
        rz = knuckle_z + y * math.sin(a) + (z - knuckle_z) * math.cos(a)
        v.co = (x, ry, rz)


def forearm_and_cuff(mesh, wrist_local, tip_local, skin):
    """Forearm continuing from the base mesh's wrist stub, a man's shirt cuff, and rim-lit arm hair."""
    import bmesh
    import lib_s3 as L
    up = (wrist_local - tip_local).normalized()          # local direction from fingers to elbow
    w0 = wrist_local - up * 0.012
    # The base mesh ends in a capped wrist stub, and a narrower tube below it read as a mannequin lip.
    # Grow the forearm out of the stub's own cross-section instead (see _forearm_rings).
    rings, surf, cen, (e1, e2) = _forearm_rings(mesh, wrist_local, up)
    bm = bmesh.new()
    vr = [[bm.verts.new(p) for p in ring] for ring in rings]
    for r0, r1 in zip(vr, vr[1:]):
        for k in range(len(r0)):
            k1 = (k + 1) % len(r0)
            bm.faces.new((r0[k], r0[k1], r1[k1], r1[k]))
    bm.faces.new(vr[0][::-1]); bm.faces.new(vr[-1])
    for f in bm.faces:
        f.smooth = True
    bm.normal_update()
    arm = L.obj_from_bm("S3_forearm", bm, [skin]); arm.parent = mesh
    C.subsurf(arm, 1, 2)
    # One closed skin: two overlapping SSS solids leave a dark line where the forearm leaves the wrist.
    # Bake hand (multires + subsurf, render levels) and forearm into one mesh by an exact boolean union.
    for o in (mesh, arm):
        for m in o.modifiers:
            m.levels = m.render_levels
    bo = mesh.modifiers.new("Fuse", "BOOLEAN"); bo.operation = "UNION"; bo.solver = "EXACT"; bo.object = arm
    fused = bpy.data.meshes.new_from_object(mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    mesh.modifiers.clear()
    mesh.data = fused
    bpy.data.objects.remove(arm)
    _man_detail(mesh)
    cloth = bpy.data.materials.new("S3_cuff"); cloth.use_nodes = True
    nt = cloth.node_tree; p = nt.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (0.20, 0.28, 0.42, 1)     # blue cotton shirt
    p.inputs["Roughness"].default_value = 0.85
    p.inputs["Sheen Weight"].default_value = 0.6
    tc = nt.nodes.new("ShaderNodeTexCoord"); wv = nt.nodes.new("ShaderNodeTexWave")
    wv.inputs["Scale"].default_value = 900; nt.links.new(tc.outputs["Object"], wv.inputs["Vector"])
    b = nt.nodes.new("ShaderNodeBump"); b.inputs["Strength"].default_value = 0.15
    nt.links.new(wv.outputs["Fac"], b.inputs["Height"]); nt.links.new(b.outputs[0], p.inputs["Normal"])
    c0 = wrist_local + up * 0.07 + cen                   # (off frame) around the forearm's axis
    cpts = [c0 + up * (0.2 * i / 7) for i in range(8)]
    crad = [0.050 + 0.004 * math.sin(i) for i in range(8)]
    bm, fr, ln = L.tube_bm(cpts, crad, segs=24, seed=9, wobble=0.06, cap=False)
    for v in bm.verts:
        v.co.y *= 0.85
    cuff = L.obj_from_bm("S3_cuff", bm, [cloth]); cuff.parent = mesh
    sol = cuff.modifiers.new("Solid", "SOLIDIFY"); sol.thickness = 0.0025
    C.subsurf(cuff, 1, 2)
    _body_hair(mesh, c0)


# Mesh-local landmarks of the fused hand (base mesh widened, fanned, curled; -y = back of the hand,
# toward the camera; +z = toward the elbow).  Finger columns are split at the webs.
FINGER_X = (-0.028, 0.005, 0.038)                # pinky | ring | middle | index
KNUCKLES = ((-0.047, -0.106), (-0.008, -0.108), (0.018, -0.108), (0.057, -0.106))   # (x, z) MCP
THUMB = ((0.062, -0.050), (0.106, -0.112))       # base -> tip


def _smoothstep(a, b, x):
    import numpy as np
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def _seg_dist(px, pz, a, b):
    """Distance in the x-z plane from points to segment a-b, and the fraction t along it."""
    import numpy as np
    ax, az = a; bx, bz = b
    dx, dz = bx - ax, bz - az
    t = np.clip(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0.0, 1.0)
    return np.hypot(px - ax - t * dx, pz - az - t * dz), t


def _man_detail(mesh):
    """What makes it read as an adult man's hand (fused hand + forearm, mesh-local): fingers and thumb
    thickened ~13 % (blunt, not tapering), bony MCP knuckles, extensor tendons fanning over the back of
    the hand, a few raised veins on the hand and the forearm (also on its silhouette edges), low flat
    square nail plates.  Writes two attributes for the skin shader: 'crease_u' (signed distance to the
    nearest finger joint / the dorsal wrist line) with weight 'crease_w', and 'nail'."""
    import numpy as np
    sub = mesh.modifiers.new("Dense", "SUBSURF"); sub.levels = sub.render_levels = 1
    me = bpy.data.meshes.new_from_object(mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    mesh.modifiers.clear()
    mesh.data = me
    nv = len(me.vertices)
    co = np.empty(nv * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    no = np.empty(nv * 3); me.vertices.foreach_get("normal", no); no = no.reshape(-1, 3)
    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    dors = _smoothstep(-0.05, -0.55, no[:, 1])        # faces the back of the hand (-y)
    KZ = -0.112
    fid = np.digitize(x, FINGER_X)                  # 0 pinky .. 3 index
    (tbx, tbz), (ttx, ttz) = THUMB
    th_t = ((x - tbx) * (ttx - tbx) + (z - tbz) * (ttz - tbz)) / ((ttx - tbx) ** 2 + (ttz - tbz) ** 2)
    w_th = _smoothstep(0.30, 0.55, th_t) * _smoothstep(0.060, 0.072, x)
    w_fi = _smoothstep(KZ + 0.006, KZ - 0.016, z) * (x < 0.084)
    # thicker, blunter fingers and thumb; fingertips keep their reach (the tips enter frame at f515-516)
    disp = 0.0013 * np.maximum(w_fi * (1 - _smoothstep(0.35, 0.8, -no[:, 2])), w_th)
    # knuckles, tendons (back of the hand only)
    for (kx, kz) in KNUCKLES:
        r2 = (x - kx) ** 2 + (z - kz) ** 2
        disp += 0.0013 * np.exp(-r2 / 0.0050 ** 2) * dors
        d, t = _seg_dist(x, z, (0.010 + 0.25 * (kx - 0.010), -0.012), (kx, kz + 0.004))
        disp += 0.0007 * np.exp(-(d / 0.0022) ** 2) * np.sin(np.pi * t) ** 0.6 * dors * (z > KZ)
    # veins: dorsal venous arch over the hand, rising onto the forearm (back and both edges)
    veins = [[(-0.040, -0.088), (-0.030, -0.060), (-0.022, -0.030), (-0.026, 0.000), (-0.022, 0.040), (-0.028, 0.110)],
             [(-0.030, -0.060), (-0.008, -0.068), (0.016, -0.062), (0.034, -0.050)],
             [(0.046, -0.088), (0.040, -0.062), (0.034, -0.050), (0.030, -0.020), (0.026, 0.010), (0.016, 0.050), (0.020, 0.120)],
             [(0.006, -0.090), (0.004, -0.066)]]
    vd = np.full(nv, 1.0)
    for v in veins:
        for a, b in zip(v, v[1:]):
            vd = np.minimum(vd, _seg_dist(x, z, a, b)[0])
    disp += 0.00065 * np.exp(-(vd / 0.0024) ** 2) * dors * (z > KZ + 0.012)
    # forearm edges (the silhouette): two veins winding along the radial and ulnar borders
    fa = z > 0.004
    if fa.any():
        bins = np.round(z / 0.003).astype(int)
        cxs = {}; cys = {}
        for bi in np.unique(bins[fa]):
            m = fa & (bins == bi)
            cxs[bi] = x[m].mean(); cys[bi] = y[m].mean()
        cx = np.array([cxs.get(b, 0.0) for b in bins]); cy = np.array([cys.get(b, 0.0) for b in bins])
        phi = np.arctan2(x - cx, -(y - cy))          # 0 = back of the forearm, +-pi/2 = its edges
        rr = np.hypot(x - cx, y - cy)
        for p0, amp, k in ((1.30, 0.16, 37.0), (-1.38, 0.12, 29.0)):
            dphi = phi - (p0 + amp * np.sin(z * k + 0.7))
            disp += 0.0006 * np.exp(-((rr * dphi) / 0.0024) ** 2) * fa * _smoothstep(0.004, 0.02, z)
    # nails: per finger, a flat plate on the back of the last phalanx, square free edge just past the tip
    nail = np.zeros(nv)
    tips = []
    for i in range(4):
        m = (fid == i) & (z < KZ - 0.02) & (x < 0.084)
        k = np.argmin(np.where(m, z, 1.0)); tips.append(co[k])
    k = np.argmax(np.where(w_th > 0.5, th_t, -1.0)); tips.append(co[k])
    crease_u = np.zeros(nv); crease_w = np.zeros(nv)
    for i, tip in enumerate(tips):
        if i < 4:
            kx, kz = KNUCKLES[i]
            m = (fid == i) & (z < KZ + 0.004) & (x < 0.084)
            base = np.array([kx, tip[1], kz])
        else:
            m = w_th > 0.01
            base = np.array([THUMB[0][0], tip[1], THUMB[0][1]])
        near = m & (np.linalg.norm(co - tip, axis=1) < 0.022) & (np.linalg.norm(co - tip, axis=1) > 0.012)
        c12 = co[near].mean(0) if near.any() else base
        ax_ = (tip - c12) / np.linalg.norm(tip - c12)         # distal direction of the last phalanx
        side = np.cross(ax_, [0.0, 1.0, 0.0]); side /= np.linalg.norm(side)
        dv = np.cross(side, ax_); dv = -dv if dv[1] > 0 else dv     # dorsal direction of this phalanx
        rel = co - tip
        s = -(rel @ ax_)                                  # distance back from the tip
        lat = np.abs(rel @ side)
        nd = _smoothstep(0.25, 0.6, no @ dv)
        hw = 0.0050 if i < 4 else 0.0058
        nl = 0.0105 if i < 4 else 0.0115
        nail_i = (_smoothstep(0.0006, 0.0016, s) * (1 - _smoothstep(nl - 0.0012, nl, s))
                  * (1 - _smoothstep(hw - 0.0009, hw, lat)) * nd * m)
        nail = np.maximum(nail, nail_i)
        # dorsal joint creases (MCP, PIP, DIP)
        L_ = np.linalg.norm(tip - base)
        u = (co - base) @ ((tip - base) / L_)
        joints = np.array([0.0, 0.47, 0.78]) * L_ if i < 4 else np.array([0.0, 0.52]) * L_
        jd = u[:, None] - joints[None, :]
        j = np.argmin(np.abs(jd), axis=1)
        cu = jd[np.arange(nv), j]
        cw = np.exp(-(cu / 0.0028) ** 2) * dors * m * (1 - nail_i)
        sel = cw > crease_w
        crease_u[sel] = cu[sel]; crease_w[sel] = cw[sel]
    # dorsal wrist wrinkles (the wrist is extended)
    cw = np.exp(-((z - 0.004) / 0.007) ** 2) * dors
    sel = cw > crease_w
    crease_u[sel] = (z - 0.004)[sel]; crease_w[sel] = cw[sel]
    disp += 0.00025 * nail
    co += no * disp[:, None]
    me.vertices.foreach_set("co", co.ravel())
    for name, val in (("crease_u", crease_u), ("crease_w", crease_w), ("nail", nail)):
        a = me.attributes.new(name, "FLOAT", "POINT")
        a.data.foreach_set("value", val.astype(np.float32))
    me.update()


def _body_hair(mesh, cuff_c0):
    """A man's body hair, sampled on the fused skin (mesh-local): dense on the forearm (back and both
    edges, sparse on the inner side) up to the cuff, sparser on the back of the hand, a few short ones
    on the first finger segments.  Hairs lie distally and toward the little finger, lifted 20-50 deg
    off the skin, so on the silhouette they stand out as a fringe that the backlight rim-lights."""
    import numpy as np
    me = mesh.data
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tri = np.empty(nt * 3, dtype=np.int64); me.loop_triangles.foreach_get("vertices", tri); tri = tri.reshape(-1, 3)
    area = np.empty(nt); me.loop_triangles.foreach_get("area", area)
    nrm = np.empty(nt * 3); me.loop_triangles.foreach_get("normal", nrm); nrm = nrm.reshape(-1, 3)
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    cen = co[tri].mean(1)
    x, z = cen[:, 0], cen[:, 2]
    zc = cuff_c0.z - 0.004
    back = _smoothstep(0.9, -0.3, nrm[:, 1])          # back + edges of the forearm / hand
    # density per m^2 of skin (mesh-local units)
    dens = (np.where((z > 0.0) & (z < zc), 1.0, 0.0) * (0.30 + 0.70 * back) * 1.9e5
            + np.where((z > -0.098) & (z <= 0.0), 1.0, 0.0) * _smoothstep(0.85, -0.3, nrm[:, 1]) * 1.0e5
            + np.where((z > -0.142) & (z <= -0.098) & (x < 0.084), 1.0, 0.0) * _smoothstep(0.5, -0.5, nrm[:, 1]) * 0.45e5)
    lam = dens * area
    rnd = np.random.default_rng(4077)
    cnt = rnd.poisson(lam)
    ti = np.repeat(np.arange(nt), cnt)
    n = len(ti)
    r1 = np.sqrt(rnd.random(n)); r2 = rnd.random(n)
    a, b, c = co[tri[ti, 0]], co[tri[ti, 1]], co[tri[ti, 2]]
    root = a * (1 - r1)[:, None] + b * (r1 * (1 - r2))[:, None] + c * (r1 * r2)[:, None]
    nn = nrm[ti]
    zr = root[:, 2]
    on_arm = zr > 0.0
    # lay direction: distal (-z), slanted toward the little-finger side (-x), jittered
    lay = np.stack([-0.35 + rnd.normal(0, 0.45, n), np.zeros(n), -np.ones(n)], 1)
    lay -= nn * (lay * nn).sum(1)[:, None]
    lay /= np.linalg.norm(lay, axis=1)[:, None] + 1e-9
    lift = np.radians(rnd.uniform(20, 50, n))
    d = lay * np.cos(lift)[:, None] + nn * np.sin(lift)[:, None]
    L_ = np.where(on_arm, rnd.uniform(0.0045, 0.0075, n),
                  np.where(zr > -0.098, rnd.uniform(0.0032, 0.0058, n), rnd.uniform(0.0020, 0.0036, n)))
    curl = np.cross(d, nn); curl *= rnd.uniform(-0.25, 0.25, n)[:, None]
    pts = []
    for k, f in enumerate((0.0, 0.33, 0.67, 1.0)):
        # bends back toward the skin and sideways a little along its length
        pts.append(root - nn * 0.00012 * (k == 0) + (d * f + curl * f * f - nn * 0.18 * f * f) * L_[:, None])
    P = np.stack(pts, 1)
    cv = bpy.data.hair_curves.new("S3_armhair")
    cv.add_curves([4] * n)
    cv.attributes["position"].data.foreach_set("vector", P.ravel().astype(np.float32))
    ra = cv.attributes.get("radius") or cv.attributes.new("radius", "FLOAT", "POINT")
    rr = np.where(on_arm, 0.000036, 0.000030)[:, None] * np.array([[1.0, 0.85, 0.6, 0.25]])
    ra.data.foreach_set("value", rr.ravel().astype(np.float32))
    hm = bpy.data.materials.new("S3_armhair"); hm.use_nodes = True
    ntr = hm.node_tree
    ntr.nodes.remove(ntr.nodes["Principled BSDF"])
    hb = ntr.nodes.new("ShaderNodeBsdfHairPrincipled")
    hb.parametrization = "MELANIN"
    hb.inputs["Melanin"].default_value = 0.30
    hb.inputs["Melanin Redness"].default_value = 0.65
    hb.inputs["Roughness"].default_value = 0.35
    hb.inputs["Radial Roughness"].default_value = 0.45
    hb.inputs["Coat"].default_value = 0.0
    # thin keratin glows where the sun is behind it (wide forward scatter, which the fibre model's
    # narrow transmission lobe misses at this sun/camera angle)
    tr = ntr.nodes.new("ShaderNodeBsdfTranslucent"); tr.inputs["Color"].default_value = (0.90, 0.62, 0.36, 1)
    mx = ntr.nodes.new("ShaderNodeMixShader"); mx.inputs["Fac"].default_value = 0.65
    ntr.links.new(hb.outputs[0], mx.inputs[1]); ntr.links.new(tr.outputs[0], mx.inputs[2])
    ntr.links.new(mx.outputs[0], ntr.nodes["Material Output"].inputs["Surface"])
    cv.materials.append(hm)
    ho = bpy.data.objects.new("S3_armhair", cv); C.link(ho); ho.parent = mesh
    print(f"[sh04] body hair: {n} strands", flush=True)


def _forearm_rings(mesh, wrist_local, up, n=64):
    """Rings of a forearm grown out of the hand mesh's capped wrist stub (mesh-local).  The stub's
    render-level surface is ray-cast around its axis: the forearm starts 1.2 mm inside it, emerges
    tangentially just before the cap rounds off (so the cap is enclosed and no mesh end is visible),
    then eases from the wrist's section to a smooth one and widens gently toward the elbow (off frame).
    Also returns surf(h, a): the forearm surface point h m past the wrist end at angle a."""
    from mathutils.bvhtree import BVHTree
    sub = mesh.modifiers["Smooth"]; lv = sub.levels
    sub.levels = sub.render_levels
    ev = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()); me = ev.to_mesh()
    bvh = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [p.vertices[:] for p in me.polygons])
    ev.to_mesh_clear(); sub.levels = lv
    e1 = (Vector((1, 0, 0)) - up * up.x).normalized(); e2 = up.cross(e1)
    ang = [2 * math.pi * k / n for k in range(n)]
    dirs = [e1 * math.cos(a) + e2 * math.sin(a) for a in ang]

    def section(h, c):
        o = wrist_local + up * h + c
        return [bvh.ray_cast(o, d)[3] or 0.0 for d in dirs]
    hs = [-0.040 + 0.002 * i for i in range(21)]
    mr = [sum(section(h, Vector())) for h in hs]
    h_c = hs[mr.index(max(mr))] - 0.002                  # widest wrist section, before the cap rounds off
    pts = [d * r for d, r in zip(dirs, section(h_c, Vector()))]
    cen = (e1 * (max(p.dot(e1) for p in pts) + min(p.dot(e1) for p in pts)) +
           e2 * (max(p.dot(e2) for p in pts) + min(p.dot(e2) for p in pts))) * 0.5
    Rc = section(h_c, cen)
    slope = [max(-0.2, min(0.2, (a - b) / 0.008)) for a, b in zip(Rc, section(h_c - 0.008, cen))]
    co = [(sum(r * math.cos(m * a) for r, a in zip(Rc, ang)) * (1 if m == 0 else 2) / n,
           sum(r * math.sin(m * a) for r, a in zip(Rc, ang)) * 2 / n) for m in range(4)]
    Rl = [sum(c * math.cos(m * a) + s_ * math.sin(m * a) for m, (c, s_) in enumerate(co)) for a in ang]
    PAD = 0.0005

    def r_out(u, k):                                     # u = h - h_c >= 0; k: fractional angle index
        k0 = int(k) % n; k1 = (k0 + 1) % n; w = k - int(k)
        f = lambda X: X[k0] * (1 - w) + X[k1] * w
        return (f(Rc) + (f(Rl) - f(Rc)) * C.smooth(u / 0.08)          # tendon detail fades out
                + f(slope) * 0.02 * (1 - math.exp(-u / 0.02))        # the wrist's flare eases out
                + 0.004 * C.smooth(u / 0.22) + PAD)                  # widening toward the elbow
    h_s = h_c - 0.03
    heights = [h_s + 0.003 * i for i in range(10)] + [h_c + 0.003 * i for i in range(16)] + \
              [h_c + u for u in (0.06, 0.08, 0.10, 0.13, 0.16, 0.20, 0.24, 0.30)]
    rings = []
    for h in heights:
        if h < h_c - 1e-9:                               # inside the stub, then emerging from its skin
            dl = -0.0012 + (0.0012 + PAD) * C.smooth((h - h_s) / (h_c - h_s))
            R = [r + dl for r in section(h, cen)]
        else:
            R = [r_out(h - h_c, k) for k in range(n)]
        rings.append([wrist_local + up * h + cen + d * r for d, r in zip(dirs, R)])

    def surf(h, a):
        d = e1 * math.cos(a) + e2 * math.sin(a)
        return wrist_local + up * h + cen + d * r_out(max(0.0, h - h_c), (a / (2 * math.pi) * n) % n)
    return rings, surf, cen, (e1, e2)


def spread_fingers(mesh, knuckle_z=-0.112, amount=0.17):
    """The base mesh is a flat rest pose; fan the four fingers apart (straining, reaching) by rotating
    each finger vertex about the palm normal around its knuckle, blended in over the first phalanx."""
    for v in mesh.data.vertices:
        x, y, z = v.co
        if z > knuckle_z or x > 0.045:            # palm, wrist and thumb stay
            continue
        w = min(1.0, (knuckle_z - z) / 0.02)       # 0 at the knuckle -> 1 a phalanx later
        a = -amount * (x - 0.004) / 0.05 * w
        dx, dz = x - x, z - knuckle_z
        # rotate (x, z) about (x_k, knuckle_z) where x_k = the finger's own column at the knuckle
        px = x; pz = knuckle_z
        rx = px + (x - px) * math.cos(a) - (z - pz) * math.sin(a)
        rz = pz + (x - px) * math.sin(a) + (z - pz) * math.cos(a)
        v.co = (rx, y, rz)


def mat_skin():
    m = bpy.data.materials.new("S3_skin")
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    geo = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1800; nz.inputs["Detail"].default_value = 4
    nt.links.new(geo.outputs["Object"], nz.inputs["Vector"])
    vor = nt.nodes.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 2600
    nt.links.new(geo.outputs["Object"], vor.inputs["Vector"])
    p.inputs["Base Color"].default_value = (0.17, 0.095, 0.062, 1)    # a man's sun-tanned skin, exposed for the sky behind
    p.inputs["Subsurface Weight"].default_value = 1.0
    # backlit: a wider, warmer scatter so the whole thin rim of each finger glows orange-red (not just
    # nail-shaped caps at the tips)
    p.inputs["Subsurface Radius"].default_value = (1.0, 0.42, 0.20)
    p.inputs["Subsurface Scale"].default_value = 0.0040
    p.inputs["Roughness"].default_value = 0.62
    p.inputs["Specular IOR Level"].default_value = 0.28
    p.inputs["Sheen Weight"].default_value = 0.0
    b = nt.nodes.new("ShaderNodeBump"); b.inputs["Strength"].default_value = 0.25; b.inputs["Distance"].default_value = 0.0002
    mx = nt.nodes.new("ShaderNodeMath"); mx.operation = "ADD"
    nt.links.new(nz.outputs[0], mx.inputs[0]); nt.links.new(vor.outputs["Distance"], mx.inputs[1])
    nt.links.new(mx.outputs[0], b.inputs["Height"])
    # dorsal joint/wrist wrinkles: fine transverse folds around each crease line ('crease_u', see _man_detail)
    au = nt.nodes.new("ShaderNodeAttribute"); au.attribute_name = "crease_u"
    aw = nt.nodes.new("ShaderNodeAttribute"); aw.attribute_name = "crease_w"
    an = nt.nodes.new("ShaderNodeAttribute"); an.attribute_name = "nail"
    wn = nt.nodes.new("ShaderNodeTexNoise"); wn.inputs["Scale"].default_value = 160
    nt.links.new(geo.outputs["Object"], wn.inputs["Vector"])
    ph = nt.nodes.new("ShaderNodeMath"); ph.operation = "MULTIPLY_ADD"; ph.inputs[1].default_value = 2 * math.pi / 0.0011
    nt.links.new(au.outputs["Fac"], ph.inputs[0]); nt.links.new(wn.outputs[0], ph.inputs[2])
    sn = nt.nodes.new("ShaderNodeMath"); sn.operation = "SINE"; nt.links.new(ph.outputs[0], sn.inputs[0])
    sq = nt.nodes.new("ShaderNodeMath"); sq.operation = "ABSOLUTE"; nt.links.new(sn.outputs[0], sq.inputs[0])
    hw = nt.nodes.new("ShaderNodeMath"); hw.operation = "MULTIPLY"
    nt.links.new(sq.outputs[0], hw.inputs[0]); nt.links.new(aw.outputs["Fac"], hw.inputs[1])
    b2 = nt.nodes.new("ShaderNodeBump"); b2.inputs["Strength"].default_value = 0.9; b2.inputs["Distance"].default_value = 0.00035
    nt.links.new(hw.outputs[0], b2.inputs["Height"]); nt.links.new(b.outputs[0], b2.inputs["Normal"])
    nt.links.new(b2.outputs[0], p.inputs["Normal"])
    # nails: a slightly smoother, paler, less translucent plate (no pale glinting tip)
    for sock, skin_v, nail_v in (("Roughness", 0.62, 0.56), ("Subsurface Weight", 1.0, 0.7)):
        mr = nt.nodes.new("ShaderNodeMapRange"); nt.links.new(an.outputs["Fac"], mr.inputs["Value"])
        mr.inputs["To Min"].default_value = skin_v; mr.inputs["To Max"].default_value = nail_v
        nt.links.new(mr.outputs[0], p.inputs[sock])
    mc = nt.nodes.new("ShaderNodeMix"); mc.data_type = "RGBA"
    nt.links.new(an.outputs["Fac"], mc.inputs[0])
    mc.inputs[6].default_value = (0.17, 0.095, 0.062, 1); mc.inputs[7].default_value = (0.20, 0.125, 0.095, 1)
    nt.links.new(mc.outputs[2], p.inputs["Base Color"])
    return m


C.run("sh04", build)
