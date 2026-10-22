"""sh01 · 0.00–5.24 · Dawn meadow, extreme macro: a dew drop at a grass-blade tip refracts the sunrise
meadow; macro-rail pull-back + rack focus reveals dewy grass, wildflowers, glowing pollen; on
"karşılandığına" the drop swells and detaches (high-speed slow motion), on "şahit" it lands on the
seedling's leaf (dip, spring back, micro-splash); exit tilting up into the sun flare at upper right."""
import os, sys, math, random, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from mathutils import Vector, Matrix, Euler, Quaternion
import common as C
import lib_s1 as L

G = 9.81
LENS = 100.0
SENSOR = 36.0
HDRI = "spruit_sunrise"
HDRI_SUN_TEX = Vector((-0.8038, 0.5782, 0.1399)).normalized()   # brightest texel, unrotated
SUN_ELEV = math.degrees(math.asin(HDRI_SUN_TEX.z))


def cam_basis(yaw, pitch, roll=0.0):
    """Camera rotation: looking along +Y rotated by yaw (deg, + = to the left/CCW) and pitch (deg, + = up)."""
    e = Euler((math.radians(90 + pitch), math.radians(roll), math.radians(yaw)), "XYZ")
    return e


def cam_dir(yaw, pitch):
    return (Euler((math.radians(90 + pitch), 0, math.radians(yaw)), "XYZ").to_matrix() @ Vector((0, 0, -1))).normalized()


def build(ctx):
    sc = bpy.context.scene
    rng = random.Random(101)
    T_DETACH = ctx.word("karşılandığına") - 0.045          # 3.475 s (drop leads the word by ~1 frame)
    T_LAND = ctx.word("şahit") - 0.03                       # 4.29 s
    T_END = ctx.info["render_f1"] / 24.0

    # ------------------------------------------------------------------ seedling + landing geometry
    seed = L.build_seedling("Seedling", loc=(0, 0, 0), rot_z=math.radians(-22), seed=11)
    pivR, leafR, LbR = seed["pivots"]["R"]
    pivL, leafL, LbL = seed["pivots"]["L"]
    # roll both leaves toward camera so their upper faces read
    pivR.rotation_euler.x = math.radians(28)
    pivL.rotation_euler.x = math.radians(-18)
    bpy.context.view_layer.update()
    # landing point: on leafR upper surface, 45% along midrib, just off the midrib
    land_local = Vector((LbR * 0.46, 0.0012, 0.0))
    hit, loc_l, nrm_l, _ = leafR.ray_cast(land_local + Vector((0, 0, 0.01)), Vector((0, 0, -1)))
    if not hit:
        loc_l, nrm_l = land_local, Vector((0, 0, 1))
    P_LAND = leafR.matrix_world @ loc_l
    N_LAND = (leafR.matrix_world.to_3x3() @ nrm_l).normalized()
    print("[sh01] landing point", tuple(round(c, 4) for c in P_LAND), "normal", tuple(round(c, 3) for c in N_LAND))

    R0, R1 = 0.00138, 0.00185            # drop radius before / after swelling (m)
    FALL = 0.0155                         # free-fall height of the drop centre to contact (m)
    D0 = P_LAND + Vector((0.0, 0.0, FALL + R1))       # drop centre at release
    P_TIP = D0 + Vector((0, 0, R1 * 0.82))             # blade tip (inside the top of the drop)

    # ------------------------------------------------------------------ slow motion (high-speed camera feel)
    # speed ramps 1 -> S just before the release, back up after the impact. Solve S so the drop lands at T_LAND.
    t_fall = math.sqrt(2 * FALL / G)
    def make_warp(S):
        return L.TimeWarp([(0.0, 1.0), (T_DETACH - 0.12, 1.0), (T_DETACH - 0.02, S), (T_LAND + 0.25, S),
                           (T_LAND + 0.75, 0.32), (10.0, 0.32)], t_start=-1.0, t_end=8.0)
    lo, hi = 0.02, 0.5
    for _ in range(40):
        S = 0.5 * (lo + hi)
        W_ = make_warp(S)
        if W_.tau(T_LAND) - W_.tau(T_DETACH) < t_fall:
            lo = S
        else:
            hi = S
    W = make_warp(0.5 * (lo + hi))
    TAU_D = W.tau(T_DETACH)
    TAU_L = TAU_D + t_fall
    print(f"[sh01] slow-motion speed {0.5 * (lo + hi):.4f}  tau_d={TAU_D:.4f} tau_land={TAU_L:.4f}")

    # ------------------------------------------------------------------ camera path (computed per frame)
    # Final orientation: sun at (72 %, 25 %) of the frame at t = 5.24 s.
    tan_h = (SENSOR * 0.5) / LENS
    tan_w = tan_h * 9 / 16
    YAW_END = -1.2
    ndc = Vector((0.44 * tan_w, 0.5 * tan_h, -1.0)).normalized()
    lo_p, hi_p = -20.0, 20.0
    for _ in range(50):
        pm = 0.5 * (lo_p + hi_p)
        d = cam_basis(YAW_END, pm).to_matrix() @ ndc
        if math.degrees(math.asin(d.z)) < SUN_ELEV:
            lo_p = pm
        else:
            hi_p = pm
    PITCH_END = 0.5 * (lo_p + hi_p)
    SUN_DIR = (cam_basis(YAW_END, PITCH_END).to_matrix() @ ndc).normalized()
    sun_az = math.degrees(math.atan2(SUN_DIR.y, SUN_DIR.x))
    print(f"[sh01] end pitch {PITCH_END:.2f}  sun azimuth {sun_az:.2f}")

    # framing helpers
    def drop_center_at(t):
        tau = W.tau(t)
        if tau <= TAU_D:
            return D0
        dt = min(tau, TAU_L) - TAU_D
        return D0 - Vector((0, 0, 0.5 * G * dt * dt))

    def cam_state(t):
        """returns (location, rotation euler, focus distance, fstop)"""
        # macro-rail pull back
        p = C.remap(t, 0.25, 3.3, C.smoother)
        d = 0.038 + (0.150 - 0.038) * p
        pitch = -3.0 - 1.0 * C.remap(t, 0.3, 3.3) - 2.5 * C.remap(t, T_DETACH, T_LAND + 0.2)
        yaw = 3.2 - 0.6 * C.remap(t, 0.0, 3.3)
        # aim point: drop centre at start, then lower so the drop sits at ~46 % and later the leaf at ~66 %
        frame_h = d * 2 * tan_h
        aim = Vector(D0) - Vector((0, 0, 0.035 * frame_h * C.remap(t, 0.6, 3.3)))
        follow = C.remap(t, T_DETACH + 0.05, T_LAND + 0.15, C.smooth)
        aim -= Vector((0, 0, 0.0088 * follow))
        fwd = cam_dir(yaw, pitch)
        loc = aim - fwd * d
        # end: tilt up (pan head) + a small boom into the sun
        k = C.remap(t, T_LAND + 0.32, 5.24 + 0.32, C.smoother)
        pitch2 = pitch + (PITCH_END - pitch) * k * 1.0
        yaw2 = yaw + (YAW_END - yaw) * k
        loc = loc + Vector((0, 0, 0.012 * k))
        # focus: on drop, rack into the grass behind (reveal), back to the drop for the action
        f_drop = (D0 - loc).dot(fwd) - R0 * 0.55
        rack = C.remap(t, 1.15, 2.15, C.smoother) * (1 - C.remap(t, 2.55, 3.25, C.smoother))
        focus = f_drop + 0.045 * rack
        if t > T_DETACH:
            # follow the drop / leaf plane during the fall (focus puller tracks it)
            pc = drop_center_at(t)
            focus = (pc - loc).dot(fwd) - R1 * 0.4
        focus = focus + (2.5 - focus) * (k ** 2.2)      # rack to the sun as we tilt into it
        fstop = 33.0 + (17.0 - 33.0) * C.remap(t, 0.25, 3.3)
        return loc, cam_basis(yaw2, pitch2), focus, fstop

    cam = C.camera("cam", lens=LENS, loc=(0, -0.05, D0.z), fstop=30, focus=0.05, sensor=SENSOR, clip_start=0.002)
    cam.data.dof.aperture_blades = 9
    cam.data.dof.aperture_ratio = 1.0
    cams = {}
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        t = f / 24.0
        loc, rot, foc, fs = cam_state(t)
        cams[f] = (loc, rot)
        cam.location = loc
        cam.rotation_euler = rot
        cam.data.dof.focus_distance = max(0.005, foc)
        cam.data.dof.aperture_fstop = fs
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_euler", frame=f)
        cam.data.dof.keyframe_insert("focus_distance", frame=f)
        cam.data.dof.keyframe_insert("aperture_fstop", frame=f)
    for fc in C.fcurves(cam) + (C._fcurves(cam.data.animation_data.action) if cam.data.animation_data else []):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    C.handheld(cam, amp_loc=0.00005, amp_rot=0.0006, speed=0.5, seed=3)

    # ------------------------------------------------------------------ light: HDRI + matching sun
    rot = L.hdri_rot_for_sun(HDRI_SUN_TEX, sun_az)
    L.world_hdri_sundisc(C.ph_hdri(HDRI, "4k"), rot_z_deg=rot, sun_dir=SUN_DIR, clamp=14.0, disc_deg=0.53,
                         disc_radiance=30000.0, disc_color=(1.0, 0.8, 0.55), aureole=(90.0, 0.8),
                         tint=(1.0, 0.82, 0.60), saturation=1.1)
    sun = C.sun(elev_deg=SUN_ELEV, azim_deg=sun_az + 90, strength=15.0, kelvin_k=2900, angle_deg=0.6)
    sun.data.color = (1.0, 0.66, 0.30)
    sun.visible_glossy = False
    sc.view_settings.exposure = 0.55

    # ------------------------------------------------------------------ hero grass blade + drop
    m_grass = L.mat_grass("GrassBlade")
    m_grass_dry = L.mat_grass("GrassBladeDry", dry=0.35)
    m_dew = L.mat_dew()
    m_seed = L.mat_grass("SeedHead", hue_shift=-0.02, dry=0.6)
    hero_rng = random.Random(5)
    # find the blade length that puts its root just below the soil when the tip is at P_TIP
    hb_len = 0.15
    for _ in range(3):
        tmp, tp = L.grass_blade("tmp", random.Random(5), length=hb_len, width=0.0036, lean=0.28, droop=2.25, twist=1.35,
                                dew=0, seg=40)
        rise = tp[-1].z
        bpy.data.objects.remove(tmp)
        hb_len *= (P_TIP.z + 0.004) / max(0.01, rise) if rise > 0 else 1.2
    m_hero = L.mat_grass("HeroGrass", hue_shift=0.01, fresh_tip=True, trans=0.62, vein_bump=0.6, rough=0.3, spec=0.32, sat=1.35, trans_tint=(1.1, 2.3, 0.35))
    hb, hpts = L.grass_blade("HeroBlade", hero_rng, length=hb_len, width=0.0045, lean=0.28, droop=2.25, twist=1.35,
                             dew=9, tip_drop=0.0, mats=(m_hero, m_dew), seg=40, dew_scale=0.9)
    tip_local = hpts[-1]
    # rotate the blade so it arcs from the back-left toward the drop, then put its tip at P_TIP
    hb_rot = Euler((0, 0, math.radians(-18)), "XYZ")
    hb_piv = C.empty("HeroBladePivot")
    base_world = P_TIP - hb_rot.to_matrix() @ tip_local
    hb_piv.location = base_world
    hb_piv.rotation_euler = hb_rot
    hb.parent = hb_piv
    print("[sh01] hero blade base", tuple(round(c, 4) for c in base_world))
    # recoil axis: local Y of the blade frame (tip springs up when the drop lets go)
    m_drop = L.mat_dew("HeroDrop")
    import bmesh
    def drop_obj(name, r, segs=(64, 32)):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=segs[0], v_segments=segs[1], radius=r)
        o = L.bm_to_obj(name, bm, [m_drop])
        return o
    drop = drop_obj("HeroDrop", 1.0)
    resid = drop_obj("TipBead", 1.0, (32, 16))
    sat = drop_obj("Satellite", 1.0, (24, 12))
    sess = drop_obj("SessileDrop", 1.0)
    # the residual bead left on the blade tip rides with the blade (recoil + sway): keyed in the blade's frame
    resid.parent = hb
    sess.parent = leafR
    sess_loc = loc_l.copy()
    sess_n = nrm_l.normalized()
    sess.rotation_euler = sess_n.to_track_quat("Z", "Y").to_euler()

    def vis_key(o, f, show):
        o.hide_render = not show
        o.hide_viewport = not show
        o.keyframe_insert("hide_render", frame=f)
        o.keyframe_insert("hide_viewport", frame=f)

    # splash micro-droplets (world space ballistic in tau)
    splash = []
    srng = random.Random(77)
    tN = N_LAND
    tA = tN.orthogonal().normalized()
    tB = tN.cross(tA)
    for i in range(9):
        a = srng.uniform(0, 2 * math.pi)
        up = srng.uniform(0.35, 0.9)
        sp = srng.uniform(0.25, 0.75)
        v = (tA * math.cos(a) + tB * math.sin(a)) * sp * math.cos(up) + tN * sp * math.sin(up)
        r = srng.uniform(0.00009, 0.00028)
        o = drop_obj(f"Splash{i}", 1.0, (16, 8))
        o.scale = (r, r, r)
        splash.append((o, v, r, srng.uniform(0.0, 0.0025)))

    def osc(tau_rel, amp, freq, damp):
        return amp * math.exp(-damp * tau_rel) * math.cos(2 * math.pi * freq * tau_rel)

    contact_offset = lambda sz, r: r * sz
    # the bead rests ON the leaf: sinking it into the leaf mesh makes the water/leaf intersection disc render
    # black (impact frame f103: black elliptical hole; settling f104-110: dark blob in its lower half)
    SESS_GAP = 0.00002
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        t = f / 24.0
        tau = W.tau(t)
        # --- drop radius: swelling before release
        grow = C.remap(t, 2.75, T_DETACH - 0.02, C.smooth)
        r = R0 + (R1 - R0) * grow
        # gentle pendulum sway of the hanging drop + blade (breeze), stops being relevant after release
        sway = Vector((0.00009 * math.sin(tau * 2.1 + 0.3), 0.00005 * math.sin(tau * 1.7), 0))
        # --- hero blade recoil after release
        if tau > TAU_D:
            tr = tau - TAU_D
            rec = 0.85 * (1 - math.exp(-9.0 * tr) * math.cos(2 * math.pi * 11.0 * tr))
        else:
            rec = -0.25 * grow     # sags a touch while the drop grows heavier
        hb.rotation_euler = (0, math.radians(-rec * 0.6), 0)
        hb.location = sway * 0.6
        hb.keyframe_insert("rotation_euler", frame=f)
        hb.keyframe_insert("location", frame=f)
        bpy.context.view_layer.update() if False else None
        # hidden sessile bead waits in its impact pose (never at the 1 m mesh scale: with centred motion
        # blur the impact frame would otherwise interpolate from that giant sphere -> black hole on f103)
        sz0 = 0.78 - 0.36
        sess.location = sess_loc + sess_n * (R1 * sz0 + SESS_GAP)
        sess.scale = (R1 / math.sqrt(sz0), R1 / math.sqrt(sz0) * 0.97, R1 * sz0)
        if tau <= TAU_D:
            neck = C.remap(t, T_DETACH - 0.10, T_DETACH, C.ease_in)
            sz = 1.06 + 0.24 * neck
            sxy = 1.0 / math.sqrt(sz)
            c = D0 + sway - Vector((0, 0, r * (sz - 1.0) * 0.9 - (R1 - r) * 0.82))
            # keep the top of the drop wetting the tip as it grows
            c = P_TIP + sway * 0.6 - Vector((0, 0, r * sz * 0.82))
            drop.location = c
            drop.scale = (r * sxy, r * sxy, r * sz)
            drop.rotation_euler = (0, 0, 0)
            vis_key(drop, f, True); vis_key(sess, f, False); vis_key(resid, f, False); vis_key(sat, f, False)
            resid.location = tip_local; resid.scale = (R0 * 0.4,) * 3
            sat.location = P_TIP; sat.scale = (0.0003,) * 3
        elif tau < TAU_L:
            dt = tau - TAU_D
            c = D0 - Vector((0, 0, 0.5 * G * dt * dt)) + Vector((0, 0, R1 * 0.06))
            w = osc(dt, 0.16, 58.0, 55.0)
            drop.location = c
            drop.scale = (R1 * (1 - 0.5 * w), R1 * (1 - 0.5 * w), R1 * (1 + w))
            vis_key(drop, f, True); vis_key(sess, f, False)
            # residual bead on the blade tip and a satellite droplet a few ms behind
            vis_key(resid, f, True)
            resid.location = tip_local + Vector((0, 0, -0.00052))
            resid.scale = (0.00055, 0.00055, 0.0006)
            ds = max(0.0, dt - 0.0045)
            vis_key(sat, f, True)
            sat.location = P_TIP + Vector((0, 0, -0.0011 - 0.5 * G * ds * ds))
            sat.scale = (0.00026, 0.00026, 0.00029)
        else:
            vis_key(drop, f, False); vis_key(sess, f, True); vis_key(resid, f, True)
            dt = tau - TAU_L
            # spread -> recoil -> sessile bead (volume preserving)
            sz = 0.78 - 0.36 * math.exp(-160 * dt) * math.cos(2 * math.pi * 75.0 * dt)
            sz = max(0.38, sz)
            sxy = 1.0 / math.sqrt(sz)
            sess.location = sess_loc + sess_n * (R1 * sz + SESS_GAP)
            sess.scale = (R1 * sxy, R1 * sxy * 0.97, R1 * sz)
            ds = dt + (tau - TAU_D) * 0 - 0.0045 + t_fall
            ds = (tau - TAU_D) - 0.0045
            sat_c = P_TIP + Vector((0, 0, -0.0011 - 0.5 * G * ds * ds))
            vis_key(sat, f, sat_c.z > P_LAND.z + 0.0004)
            sat.location = sat_c
        # splash droplets
        for (o, v, rr, delay) in splash:
            dts = tau - TAU_L - delay
            if dts <= 0:
                vis_key(o, f, False)
                o.location = P_LAND
            else:
                p = P_LAND + N_LAND * 0.0012 + v * dts + Vector((0, 0, -0.5 * G * dts * dts))
                o.location = p
                vis_key(o, f, p.z > 0.0)
            o.keyframe_insert("location", frame=f)
        for o in (drop, resid, sat, sess):
            o.keyframe_insert("location", frame=f)
            o.keyframe_insert("scale", frame=f)
        # leaf dip and spring back (pivot rotates about the petiole joint)
        base_rot = pivR.get("_base_rot")
        if base_rot is None:
            pivR["_base_rot"] = tuple(pivR.rotation_euler)
            base_rot = pivR["_base_rot"]
        if tau > TAU_L:
            dt = tau - TAU_L
            dip = math.radians(10.0) * math.exp(-11.0 * dt) * math.sin(2 * math.pi * 8.5 * dt) + math.radians(1.2) * (1 - math.exp(-30 * dt))
        else:
            dip = 0.0
        breeze = math.radians(0.6) * math.sin(tau * 1.9 + 1.0)
        pivR.rotation_euler = (base_rot[0], base_rot[1] + dip + breeze * 0.3, base_rot[2])
        pivR.keyframe_insert("rotation_euler", frame=f)
        seed["root"].rotation_euler = (math.radians(0.35) * math.sin(tau * 1.3), math.radians(0.25) * math.sin(tau * 1.1 + 2), math.radians(-22))
        seed["root"].keyframe_insert("rotation_euler", frame=f)
    for o in [drop, resid, sat, sess, hb, pivR, seed["root"]] + [s[0] for s in splash]:
        for fc in C.fcurves(o):
            for kp in fc.keyframe_points:
                if fc.data_path.startswith("hide"):
                    kp.interpolation = "CONSTANT"
                else:
                    kp.interpolation = "LINEAR"

    # dew beads on the seedling leaves: sampled on the upper surface, irregular sizes, favouring the margins
    # and the vein grooves (where water collects), never in the impact zone
    from mathutils.bvhtree import BVHTree
    for leaf, Lb, cnt in ((leafR, LbR, 16), (leafL, LbL, 20)):
        # top skin of the rendered leaf (solidify + render-level subsurf): beads must not cut into it, or the
        # water/leaf intersection renders as a dark lower half
        sub_ = leaf.modifiers["sub"]; lv = sub_.levels; sub_.levels = sub_.render_levels
        dg = bpy.context.evaluated_depsgraph_get()
        leaf_bvh = BVHTree.FromObject(leaf, dg)
        sub_.levels = lv
        me = leaf.data
        uvl = me.uv_layers[0].data
        cands = []
        for poly in me.polygons:
            if poly.normal.z < 0.3:
                continue
            uvs = [uvl[li].uv for li in poly.loop_indices]
            u = sum(x[0] for x in uvs) / len(uvs); v = abs(sum(x[1] for x in uvs) / len(uvs) * 2 - 1)
            w = poly.area * (0.25 + 2.5 * v ** 3 + (0.6 if v < 0.06 else 0.0)) * (1.0 if 0.05 < u < 0.95 else 0.2)
            cands.append((w, poly))
        tot = sum(c[0] for c in cands)
        placed = []
        tries = 0
        while len(placed) < cnt and tries < 500:
            tries += 1
            x = rng.uniform(0, tot)
            for w, poly in cands:
                x -= w
                if x <= 0:
                    break
            vs = [me.vertices[k].co for k in poly.vertices]
            a_, b_ = rng.random(), rng.random()
            if a_ + b_ > 1:
                a_, b_ = 1 - a_, 1 - b_
            pt = vs[0] + (vs[1] - vs[0]) * a_ + (vs[2] - vs[0]) * b_
            if leaf is leafR and (pt - loc_l).length < 0.0045:
                continue
            r = 0.00008 + 0.0005 * rng.random() ** 2.5
            if any((pt - q).length < (r + rq) * 1.3 for q, rq in placed):
                continue
            placed.append((pt, r))
            nn = poly.normal
            o = drop_obj(f"LeafDew_{leaf.name}_{len(placed)}", 1.0, (24, 12))
            o.parent = leaf
            sq = rng.uniform(0.7, 0.85)
            hit_p, hit_n, _, _ = leaf_bvh.ray_cast(pt + nn * 0.002, -nn)
            if hit_p is None:
                hit_p, hit_n = pt + nn * 0.000125, nn
            if hit_n.dot(nn) < 0:
                hit_n = -hit_n
            nn = hit_n.normalized()
            o.location = hit_p + nn * (r * sq + 0.00001)
            o.scale = (r * rng.uniform(1.0, 1.15), r, r * sq)
            o.rotation_euler = nn.to_track_quat("Z", "Y").to_euler()
            # the leaf curves under the bead's footprint: lift it until no part is below the surface (+5 um)
            Mb = Matrix.LocRotScale(o.location, o.rotation_euler, o.scale)
            low = min((lambda q: (q - leaf_bvh.find_nearest(q)[0]).dot(leaf_bvh.find_nearest(q)[1]))(Mb @ v.co)
                      for v in o.data.vertices)
            if low < 0.000005:
                o.location = o.location + nn * (0.000005 - low)

    # ------------------------------------------------------------------ meadow grass field (instanced)
    inst = L.hidden_collection("GrassVariants")
    vrng = random.Random(9)
    variants = []
    for i in range(22):
        length = vrng.uniform(0.07, 0.34)
        o, pts = L.grass_blade(f"g{i:02d}", vrng, length=length, width=vrng.uniform(0.0022, 0.0048),
                               lean=vrng.uniform(0.03, 0.45), droop=vrng.uniform(0.15, 1.7), twist=vrng.uniform(-1.2, 1.2),
                               dew=vrng.randint(5, 16) * (0 if os.environ.get("S1_NODEW") == "1" else 1), tip_drop=(vrng.uniform(0.0005, 0.0012) if vrng.random() < 0.5 else 0.0),
                               col=inst, mats=((m_grass if vrng.random() < 0.8 else m_grass_dry), m_dew), seg=20)
        variants.append(pts)
    for i in range(4):
        o = L.seed_head(f"g{22 + i:02d}", vrng, vrng.uniform(0.22, 0.42), col=inst, mats=(m_seed, m_seed))
        variants.append([Vector((0, 0, 0)), Vector((0, 0, 0.3))])
    nvar = len(variants)
    # sample camera frames to keep the view of the subject clear
    test_frames = [ctx.f0, 20, 40, 60, 80, 84, 95, 103, 115, ctx.f1 - 1]
    cam_tests = []
    for f in test_frames:
        loc, rotE = cams[f]
        M = rotE.to_matrix()
        cam_tests.append((loc, M))

    def blocks_view(pts_world, subj_dist):
        for loc, M in cam_tests:
            Mi = M.transposed()
            for p in pts_world:
                q = Mi @ (p - loc)
                z = -q.z
                if z <= 0.002:
                    continue
                if z < subj_dist(loc) - 0.006:
                    if abs(q.x / z) < tan_w * 0.62 and abs(q.y / z) < tan_h * 0.72:
                        return True
        return False

    def subj_dist(loc):
        return (D0 - loc).length

    pts, vidx, rots, scls = [], [], [], []
    prng = random.Random(21)
    def try_add(p, region_scale=1.0):
        vi = prng.randrange(nvar)
        if p.y < 1.4 and abs(p.x) < 0.45 and prng.random() < 0.85:
            region_scale *= prng.uniform(0.3, 0.6)
        rz = prng.uniform(0, 2 * math.pi)
        rx = prng.uniform(-0.12, 0.12); ry = prng.uniform(-0.12, 0.12)
        s = prng.uniform(0.75, 1.25) * region_scale
        Mr = Euler((rx, ry, rz)).to_matrix()
        poly = [p + Mr @ (q * s) for q in variants[vi][::2]] + [p + Mr @ (variants[vi][-1] * s)]
        # keep clear of the seedling and of the drop's fall column
        for q in poly:
            dxy = math.hypot(q.x - P_LAND.x, q.y - P_LAND.y)
            if q.z < P_TIP.z + 0.02 and math.hypot(q.x, q.y) < 0.035:
                return False
            if dxy < 0.010 and q.z < P_TIP.z + 0.01:
                return False
        if blocks_view(poly, subj_dist):
            return False
        # keep the sun's line of sight clear for the exit (round disc, not a blade-cut blob)
        for f_ in (118, 124, 128):
            cl_ = cams[f_][0]
            for q in poly:
                dq = q - cl_
                if 0 < dq.length < 3.0 and dq.normalized().dot(SUN_DIR) > math.cos(math.radians(2.2)):
                    return False
        pts.append(p); vidx.append(vi); rots.append((rx, ry, rz)); scls.append(s)
        return True
    # near field dense, far field sparser, inside a wedge in front of the camera
    for (y0, y1, dens, xs) in ((-0.30, 0.02, 1500, 0.16), (0.02, 0.6, 1500, 0.24), (0.6, 1.6, 500, 0.45), (1.6, 3.5, 160, 0.9)):
        area = (y1 - y0) * 2 * xs
        n = int(area * dens)
        for _ in range(n):
            p = Vector((prng.uniform(-xs, xs) + 0.05, prng.uniform(y0, y1), prng.uniform(-0.01, 0.0)))
            try_add(p)
    # showcase: dew-laden blades 2-7 cm behind the drop, revealed by the focus rack
    for i in range(60):
        p = Vector((prng.uniform(-0.06, 0.08), prng.uniform(0.02, 0.09), prng.uniform(-0.01, 0.0)))
        try_add(p, 1.0)
    field = L.point_cloud("GrassField", pts, {"vidx": ("INT", vidx), "rot": ("FLOAT_VECTOR", rots), "scl": ("FLOAT", scls)})
    clock = L.clock_empty()
    gmod = L.gn_instancer(field, inst, sway=0.05, sway_scale=3.0, sway_speed=0.7, name="GrassInst", clock=clock,
                           realize=os.environ.get("S1_REALIZE", "0") == "1")
    # the breeze sway is sub-pixel per shutter interval: no deformation blur on the field (big BVH saving);
    # camera motion blur and the hero objects' blur stay on
    field.cycles.use_motion_blur = False
    print(f"[sh01] grass instances: {len(pts)}")
    if os.environ.get("S1_NOGRASS") == "1":
        field.hide_render = True

    # ------------------------------------------------------------------ wildflowers (Poly Haven, linked duplicates)
    flowers = []
    for name in ("celandine_01", "dandelion_01"):
        objs = [o for o in C.ph_model(name, "1k") if o.type == "MESH"]
        for o in objs:
            o.hide_render = True; o.hide_viewport = True
        flowers.append(objs)
    frng = random.Random(33)
    spots = [(-0.09, 0.40, "dandelion_01", 0), (-0.06, 0.55, "celandine_01", 0), (0.13, 0.70, "celandine_01", 1),
             (-0.13, 0.85, "dandelion_01", 1), (-0.12, 1.05, "celandine_01", 2), (0.22, 1.25, "dandelion_01", 0),
             (-0.20, 1.45, "celandine_01", 3), (0.30, 1.8, "dandelion_01", 1), (-0.05, 2.2, "celandine_01", 0),
             (0.30, 2.0, "celandine_01", 1), (-0.32, 1.9, "dandelion_01", 0), (0.18, 0.95, "celandine_01", 0)]
    for (x, y, name, k) in spots:
        src = flowers[0 if name.startswith("cel") else 1][k % 5]
        o = src.copy()
        o.hide_render = False; o.hide_viewport = False
        bpy.context.scene.collection.objects.link(o)
        o.location = (x, y, -0.005)
        o.rotation_euler = (0, 0, frng.uniform(0, 6.28))
        s = frng.uniform(0.85, 1.15)
        o.scale = (s, s, s)

    # ------------------------------------------------------------------ ground
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0.05, 1.5, -0.004))
    gp = bpy.context.object
    gp.scale = (3.0, 5.0, 1)
    gm = C.mat_from_textures("Ground", C.ph_texture("forest_ground_04", "2k"), scale=6.0, base_tint=(0.7, 0.75, 0.6))
    C.assign(gp, gm)

    # ------------------------------------------------------------------ pollen motes
    mo, mmod = L.motes("Pollen", 1300, (-0.06, -0.12, 0.03), (0.12, 0.7, 0.15), random.Random(4),
                       r_range=(0.00003, 0.00009), strength=12.0, color=(1.0, 0.68, 0.32), drift=(0.003, -0.002, 0.004), wobble=0.003, clock=clock)
    frames_tau = [(f, W.tau(f / 24.0)) for f in range(ctx.f0 - 2, ctx.f1 + 3)]
    L.key_clock(clock, frames_tau)
    mo.cycles.use_motion_blur = False
    if os.environ.get("S1_NOMOTES") == "1":
        mo.hide_render = True

    # ------------------------------------------------------------------ lens finishing
    # (the compositor aborts headless without libEGL on the farm -> lens effects are physical)
    if os.environ.get("S1_NOFILTER") != "1":
        L.diffusion_filter(cam, amount=0.012, rough=0.12, wide_amount=0.002, wide_rough=0.45)

    C.stamp_meta(shot="sh01", t_detach=T_DETACH, t_land=T_LAND)
    for pre in [x for x in os.environ.get("S1_HIDE", "").split(",") if x]:
        for o in bpy.data.objects:
            if o.name.startswith(pre):
                o.hide_render = True
    if os.environ.get("S1_NODOF") == "1":
        cam.data.dof.use_dof = False
    ov = {"final_spp": 8, "final_threshold": 0.05, "preview_spp": 24, "transmission_bounces": 6, "max_bounces": 6,
          "glossy_bounces": 2, "diffuse_bounces": 1, "transparent_bounces": 6, "clamp_indirect": 6.0}
    for k, v in json.loads(os.environ.get("S1_OV", "{}")).items():
        ov[k] = v
    return ov


C.run("sh01", build)
