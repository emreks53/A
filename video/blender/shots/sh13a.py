"""sh13a · 74.15–84.20 · Golden-hour meadow at a forest edge teeming with life: tall grasses in seed, many
kinds of wildflowers, shrubs and trees at the edge, butterflies, bees, drifting dandelion seeds in the warm
backlight. A low gimbal glide through the grass with flowers brushing past the lens; on "Halık" the camera
rises gently while a cloud shadow slides off the meadow and the warm light spreads over everything."""
import os, sys, math, random, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy, bmesh
from mathutils import Vector, Matrix, Euler
import common as C
import lib_s1 as L

HDRI = "evening_field"
HDRI_SUN_TEX = Vector((-0.7603, 0.6269, 0.1702)).normalized()
SUN_ELEV = math.degrees(math.asin(HDRI_SUN_TEX.z))     # 9.8 deg
SUN_AZ = 64.0                                          # ahead-right (26 deg) of the camera, which looks +Y = 90 deg
LENS = 35.0
SENSOR = 36.0


def cam_basis(yaw, pitch, roll=0.0):
    return Euler((math.radians(90 + pitch), math.radians(roll), math.radians(yaw)), "XYZ")


def build(ctx):
    sc = bpy.context.scene
    T0, T1 = ctx.f0 / 24.0, ctx.f1 / 24.0
    T_RISE = ctx.word("Haluk") - 0.08          # 78.98: the rise and the light begin on "Halık"
    tan_h = (SENSOR * 0.5) / LENS
    tan_w = tan_h * 9 / 16

    # ------------------------------------------------------------------ camera (gimbal glide -> gentle rise)
    def cam_state(t):
        # forward glide at walking-gimbal speed, slowing a little while rising
        y = 0.55 * (t - T0) - 0.12 * max(0.0, t - T_RISE) * C.remap(t, T_RISE, T_RISE + 3.0)
        x = 0.16 * math.sin((t - T0) * 0.55) - 0.10
        rise = C.remap(t, T_RISE, T_RISE + 3.6, C.smoother)
        z = 0.30 + 1.15 * rise + 0.012 * math.sin((t - T0) * 1.7)
        pitch = 2.5 - 9.0 * rise
        yaw = -8.0 + 3.0 * math.sin((t - T0) * 0.32) + 7.0 * rise
        roll = 0.6 * math.sin((t - T0) * 0.8)
        focus = 1.6 + 2.2 * rise
        fstop = 2.8
        return Vector((x, y, z)), cam_basis(yaw, pitch, roll), focus, fstop

    cam = C.camera("cam", lens=LENS, loc=(0, 0, 0.3), fstop=2.8, focus=2.0, sensor=SENSOR, clip_start=0.01)
    cam.data.dof.aperture_blades = 9
    cams = {}
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        t = f / 24.0
        loc, rot, foc, fs = cam_state(t)
        cams[f] = (loc, rot.to_matrix())
        cam.location = loc; cam.rotation_euler = rot
        cam.data.dof.focus_distance = foc; cam.data.dof.aperture_fstop = fs
        cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_euler", frame=f)
        cam.data.dof.keyframe_insert("focus_distance", frame=f); cam.data.dof.keyframe_insert("aperture_fstop", frame=f)
    for fc in C.fcurves(cam) + C._fcurves(cam.data.animation_data.action):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    C.handheld(cam, amp_loc=0.004, amp_rot=0.002, speed=0.45, seed=13)
    cam_tests = [cams[f] for f in range(ctx.f0, ctx.f1, 10)] + [cams[ctx.f1 - 1]]

    def visible(p, max_dist=1e9, margin=1.04):
        return L.visible_from_any(p, cam_tests, tan_w, tan_h, margin=margin, max_dist=max_dist)

    # ------------------------------------------------------------------ light
    sun_dir = Vector((math.cos(math.radians(SUN_AZ)) * math.cos(math.radians(SUN_ELEV)),
                      math.sin(math.radians(SUN_AZ)) * math.cos(math.radians(SUN_ELEV)),
                      math.sin(math.radians(SUN_ELEV))))
    rot = L.hdri_rot_for_sun(HDRI_SUN_TEX, SUN_AZ)
    L.world_hdri_sundisc(C.ph_hdri(HDRI, "4k"), rot_z_deg=rot, sun_dir=sun_dir, clamp=30.0, disc_deg=0.53,
                         disc_radiance=6000.0, disc_color=(1.0, 0.72, 0.42), tint=(0.98, 0.78, 0.55), saturation=1.15)
    sun = C.sun(elev_deg=SUN_ELEV, azim_deg=SUN_AZ + 90, strength=26.0, kelvin_k=3000, angle_deg=0.6)
    sun.data.color = (1.0, 0.68, 0.36)
    sun.visible_glossy = False
    sc.view_settings.exposure = -0.65

    # cloud-shadow blocker: only casts shadows. Its soft, ragged edge sweeps from 9 m ahead to behind
    # the camera between "Halık" and "kullarına" -> warm light rolls over the whole meadow.
    H = 60.0
    k_off = H / sun_dir.z
    bpy.ops.mesh.primitive_plane_add(size=1.0)
    cl = bpy.context.object
    cl.name = "CloudShadow"
    cl.scale = (900, 900, 1)
    for a in ("visible_camera", "visible_diffuse", "visible_glossy", "visible_transmission", "visible_volume_scatter"):
        setattr(cl, a, False)
    m, nt, p = C.new_mat("CloudShadow")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sp = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sp.inputs[0])
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.012; nz.inputs["Detail"].default_value = 6
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    # local y in [-0.5, 0.5]*900 m; edge at local y = 0.45 (-> 45 m inside the far side), ragged by noise
    e = L.math_node(nt, "MULTIPLY_ADD", nz.outputs["Fac"], 0.03, sp.outputs[1])
    a = L.math_node(nt, "SUBTRACT", 0.45, e)
    alpha = L.math_node(nt, "MULTIPLY", a, 60.0, clamp=True)
    # patchy interior (broken cloud) so the shade is dappled, not flat
    nz2 = nt.nodes.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 0.06; nz2.inputs["Detail"].default_value = 3
    nt.links.new(tc.outputs["Object"], nz2.inputs["Vector"])
    patch = L.math_node(nt, "MULTIPLY_ADD", nz2.outputs["Fac"], 1.6, -0.15, clamp=True)
    al2 = L.math_node(nt, "MULTIPLY", alpha, patch)
    al3 = L.math_node(nt, "MULTIPLY", al2, 0.93)
    nt.links.new(al3, p.inputs["Alpha"])
    p.inputs["Base Color"].default_value = (0.5, 0.5, 0.5, 1)
    C.assign(cl, m)
    edge_local = 0.45 * 900

    def cloud_key(f, y_edge_ground):
        y_plane_edge = y_edge_ground + sun_dir.y * k_off
        cl.location = (sun_dir.x * k_off, y_plane_edge - edge_local, H)
        cl.keyframe_insert("location", frame=f)
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        t = f / 24.0
        kk = C.remap(t, T_RISE - 0.1, T_RISE + 2.6, C.smooth)
        cloud_key(f, 9.0 + 0.25 * (t - T0) - 26.0 * kk)
    for fc in C.fcurves(cl):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"

    # ------------------------------------------------------------------ ground
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 40, 0))
    gp = bpy.context.object
    gp.scale = (160, 160, 1)
    gm = C.mat_from_textures("Ground", C.ph_texture("sparse_grass", "2k"), scale=60.0, base_tint=(0.75, 0.72, 0.5))
    C.assign(gp, gm)
    # UVs of a primitive plane are 0..1 -> scale=60 tiles ~2.7 m

    # ------------------------------------------------------------------ grass variants
    rng = random.Random(1301)
    inst = L.hidden_collection("MeadowGrass")
    m_g = L.mat_grass("MGrass", hue_shift=-0.01, dry=0.12)
    m_gd = L.mat_grass("MGrassDry", hue_shift=-0.03, dry=0.55)
    m_sh = L.mat_grass("MSeed", hue_shift=-0.04, dry=0.75)
    variants = []
    for i in range(20):
        length = rng.uniform(0.22, 0.75)
        o, pts = L.grass_blade(f"m{i:02d}", rng, length=length, width=rng.uniform(0.003, 0.007), lean=rng.uniform(0.02, 0.35),
                               droop=rng.uniform(0.2, 1.4), twist=rng.uniform(-1.5, 1.5), dew=0, col=inst,
                               mats=((m_g if rng.random() < 0.65 else m_gd), m_g), seg=12)
        variants.append(max(p.z for p in pts))
    for i in range(8):
        o = L.seed_head(f"m{20 + i:02d}", rng, rng.uniform(0.45, 0.95), col=inst, mats=(m_sh, m_sh))
        variants.append(0.9)
    nvar = len(variants)
    ph_grass = [o for o in C.ph_model("grass_medium_02", "1k") if o.type == "MESH"]
    gcol = L.hidden_collection("PHGrass")
    for i, o in enumerate(sorted(ph_grass, key=lambda o: o.name)):
        o.name = f"p{i:02d}"
        for c in list(o.users_collection):
            c.objects.unlink(o)
        gcol.objects.link(o)
        o.location = (0, 0, 0)

    pts, vidx, rots, scls = [], [], [], []
    ppts, pvidx, prots, pscls = [], [], [], []
    prng = random.Random(77)
    path = [cams[f][0] for f in range(ctx.f0, ctx.f1, 4)]

    def near_path(p, r):
        for c in path:
            if (c.x - p.x) ** 2 + (c.y - p.y) ** 2 < r * r:
                return True
        return False
    # blades: dense near the glide path, culled to what any camera frame can see
    for (n, xs, y0, y1, smin, smax) in ((22000, 3.0, -1.0, 9.0, 0.7, 1.25), (9000, 9.0, 9.0, 30.0, 0.9, 1.5)):
        for _ in range(n):
            p = Vector((prng.uniform(-xs, xs), prng.uniform(y0, y1), 0.0))
            if near_path(p, 0.03):
                continue
            ptop = p + Vector((0, 0, 0.5))
            if not (visible(p, max_dist=40) or visible(ptop, max_dist=40)):
                continue
            pts.append(p); vidx.append(prng.randrange(nvar))
            rots.append((prng.uniform(-0.15, 0.15), prng.uniform(-0.15, 0.15), prng.uniform(0, 6.283)))
            hn = __import__("mathutils").noise.noise(Vector((p.x * 0.35, p.y * 0.35, 7.7)))
            scls.append(prng.uniform(smin, smax) * (0.85 + 0.5 * hn))
    # Poly Haven grass clumps for body/volume, mid and far
    for (n, xs, y0, y1) in ((6000, 5.0, 0.5, 14.0), (9000, 25.0, 14.0, 45.0)):
        for _ in range(n):
            p = Vector((prng.uniform(-xs, xs), prng.uniform(y0, y1), 0.0))
            if near_path(p, 0.25):
                continue
            if not (visible(p, max_dist=60) or visible(p + Vector((0, 0, 0.3)), max_dist=60)):
                continue
            ppts.append(p); pvidx.append(prng.randrange(len(ph_grass)))
            prots.append((0, 0, prng.uniform(0, 6.283))); pscls.append(prng.uniform(1.0, 1.8))
    clock = L.clock_empty()
    field = L.point_cloud("MeadowField", pts, {"vidx": ("INT", vidx), "rot": ("FLOAT_VECTOR", rots), "scl": ("FLOAT", scls)})
    L.gn_instancer(field, inst, sway=0.06, sway_scale=0.8, sway_speed=0.35, name="MeadowInst", clock=clock)
    pfield = L.point_cloud("PHField", ppts, {"vidx": ("INT", pvidx), "rot": ("FLOAT_VECTOR", prots), "scl": ("FLOAT", pscls)})
    L.gn_instancer(pfield, gcol, sway=0.03, sway_scale=0.6, sway_speed=0.35, name="PHInst", clock=clock)
    for o in (field, pfield):
        o.cycles.use_motion_blur = False
    L.key_clock(clock, [(f, f / 24.0) for f in range(ctx.f0 - 2, ctx.f1 + 3)])
    print(f"[sh13a] blades {len(pts)}  clumps {len(ppts)}")

    # ------------------------------------------------------------------ wildflowers of many kinds
    fcol = L.hidden_collection("Flowers")
    fl_names = []
    m_stem = L.mat_simple("FlStem", (0.10, 0.20, 0.04), rough=0.5, trans=0.3)
    m_white = L.mat_simple("FlWhite", (0.85, 0.85, 0.80), rough=0.45, trans=0.35)
    m_yel = L.mat_simple("FlYellow", (0.85, 0.55, 0.03), rough=0.6, sheen=0.5)
    m_red = L.mat_simple("FlRed", (0.65, 0.04, 0.02), rough=0.5, trans=0.45)
    m_dark = L.mat_simple("FlDark", (0.02, 0.02, 0.015), rough=0.6)
    m_blue = L.mat_simple("FlBlue", (0.08, 0.15, 0.7), rough=0.5, trans=0.3)
    frng = random.Random(55)
    k = 0
    m_butter = L.mat_simple("FlButter", (0.95, 0.62, 0.02), rough=0.15, trans=0.3)
    for kind, n, mats in (("daisy", 6, (m_stem, m_white, m_yel)), ("poppy", 4, (m_stem, m_red, m_dark)),
                          ("cornflower", 3, (m_stem, m_blue, m_blue)), ("buttercup", 5, (m_stem, m_butter, m_yel))):
        for i in range(n):
            L.daisy(f"f{k:02d}", frng, frng.uniform(0.35, 0.7), col=fcol, mats=mats, kind=kind)
            k += 1
    for name in ("celandine_01", "dandelion_01", "flower_gazania", "flower_ursinia", "periwinkle_plant", "nettle_plant"):
        for o in sorted([o for o in C.ph_model(name, "1k") if o.type == "MESH"], key=lambda o: o.name):
            o.name = f"f{k:02d}"
            o.data.transform(Matrix.LocRotScale(None, o.rotation_euler, o.scale))   # GN 'Reset Children' drops object scale
            o.scale = (1, 1, 1); o.rotation_euler = (0, 0, 0)
            for c in list(o.users_collection):
                c.objects.unlink(o)
            fcol.objects.link(o)
            o.location = (0, 0, 0)
            k += 1
    nfl = k
    fpts, fvidx, frots, fscls = [], [], [], []
    for _ in range(26000):
        p = Vector((prng.uniform(-9, 9), prng.uniform(-0.5, 30), 0.0))
        # flowers grow in drifts
        if L.smoothstep(0.25, 0.6, __import__("mathutils").noise.noise(Vector((p.x * 0.25, p.y * 0.25, 3.3))) + 0.5) < prng.random() * 0.9:
            continue
        if near_path(p, 0.09):
            continue
        if not visible(p + Vector((0, 0, 0.3)), max_dist=30):
            continue
        fpts.append(p); fvidx.append(prng.randrange(nfl))
        frots.append((prng.uniform(-0.1, 0.1), prng.uniform(-0.1, 0.1), prng.uniform(0, 6.283))); fscls.append(prng.uniform(1.0, 1.5))
    # flowers that brush past the lens (just off the glide path at lens height)
    for (tt, side) in ((75.0, 1), (76.3, -1), (77.4, 1), (78.4, -1), (79.3, 1)):
        c, M = cams[int(tt * 24)]
        right = M @ Vector((1, 0, 0))
        p = Vector((c.x, c.y, 0)) + Vector((right.x, right.y, 0)).normalized() * (0.10 * side) + (M @ Vector((0, 0, -1))) * 0.45
        p.z = 0.0
        fpts.append(p); fvidx.append(prng.randrange(18)); frots.append((0, 0, prng.uniform(0, 6.283))); fscls.append(0.75)
    flf = L.point_cloud("FlowerField", fpts, {"vidx": ("INT", fvidx), "rot": ("FLOAT_VECTOR", frots), "scl": ("FLOAT", fscls)})
    L.gn_instancer(flf, fcol, sway=0.07, sway_scale=0.9, sway_speed=0.4, name="FlowerInst", clock=clock)
    flf.cycles.use_motion_blur = False
    print(f"[sh13a] flowers {len(fpts)}")

    # ------------------------------------------------------------------ shrubs + trees at the forest edge
    shr = [o for o in C.ph_model("shrub_02", "1k") if o.type == "MESH"]
    trees = [o for o in C.ph_model("island_tree_02", "1k") if o.type == "MESH"] + \
            [o for o in C.ph_model("tree_small_02", "1k") if o.type == "MESH"]
    for o in shr + trees:
        o.hide_render = True; o.hide_viewport = True
    trng = random.Random(3)
    # forest edge on the LEFT and far-left: with the sun low ahead-right its long shadows fall away from the
    # meadow we look across; the right side stays open toward the sun.
    def place(src, loc, s, sz=1.0):
        o = src.copy(); sc.collection.objects.link(o); o.hide_render = False; o.hide_viewport = False
        o.location = loc
        o.rotation_euler = (0, 0, trng.uniform(0, 6.28))
        o.scale = (s, s, s * sz)
    for i in range(44):
        y = trng.uniform(24, 95)
        x = -9 - 0.25 * (y - 24) * trng.uniform(0.2, 1.0) - trng.uniform(0, 25)
        place(trees[i % len(trees)], (x, y, 0), trng.uniform(2.0, 3.6) if i % len(trees) == 0 else trng.uniform(1.0, 1.6),
              trng.uniform(1.0, 1.4))
    for i in range(22):
        place(trees[i % len(trees)], (trng.uniform(-60, 5), trng.uniform(110, 150), 0), trng.uniform(2.4, 3.8), 1.2)
    for i in range(40):
        y = trng.uniform(18, 70)
        place(shr[i % len(shr)], (trng.uniform(-14, -5) - 0.15 * (y - 18), y, 0), trng.uniform(1.1, 2.0))
    for i in range(8):
        place(shr[i % len(shr)], (trng.uniform(4, 30), trng.uniform(40, 90), 0), trng.uniform(1.0, 1.8))

    # ------------------------------------------------------------------ butterflies
    brng = random.Random(8)
    for i in range(6):
        kind = "white" if i in (2, 5) else "fritillary"
        root, wl, wr = L.butterfly(f"Butterfly{i}", brng, kind)
        s = 1.0
        base = Vector((brng.uniform(-1.0, 1.0), brng.uniform(1.6, 5.5) + (3 if i > 3 else 0), brng.uniform(0.35, 0.9)))
        ph = [brng.uniform(0, 6.28) for _ in range(6)]
        freq = brng.uniform(6.0, 8.0)
        prev = None
        for f in range(ctx.f0 - 2, ctx.f1 + 3):
            t = f / 24.0
            u = t - T0
            if i == 0:
                base = Vector((-0.9 + 0.42 * u, 0.55 * u + 1.0, 0.36))
            pos = base + Vector((0.9 * math.sin(u * 0.45 + ph[0]) * (0.25 if i == 0 else 1) + 0.3 * math.sin(u * 1.3 + ph[1]),
                                 0.7 * math.sin(u * 0.35 + ph[2]) + 0.25 * u * math.cos(ph[5]),
                                 0.25 * math.sin(u * 0.9 + ph[3]) + 0.08 * math.sin(u * 3.1 + ph[4])))
            if prev is None:
                prev = pos - Vector((0, 0.01, 0))
            d = pos - prev
            heading = math.atan2(d.y, d.x) - math.pi / 2
            root.location = pos
            root.rotation_euler = (0.25, 0, heading)
            flap = math.radians(10 + 62 * (0.5 + 0.5 * math.sin(2 * math.pi * freq * t + ph[0])))
            wl.rotation_euler = (0, -flap, 0); wr.rotation_euler = (0, flap, 0)
            for o in (root,):
                o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f)
            wl.keyframe_insert("rotation_euler", frame=f); wr.keyframe_insert("rotation_euler", frame=f)
            prev = pos
        for o in (root, wl, wr):
            for fc in C.fcurves(o):
                for kp in fc.keyframe_points:
                    kp.interpolation = "LINEAR"

    # ------------------------------------------------------------------ bees hopping between flowers
    for i in range(7):
        b = L.bee(f"Bee{i}", brng)
        base = Vector((brng.uniform(-1.2, 1.2), brng.uniform(1.5, 7.0), brng.uniform(0.25, 0.6)))
        ph = [brng.uniform(0, 6.28) for _ in range(4)]
        for f in range(ctx.f0 - 2, ctx.f1 + 3):
            t = f / 24.0
            pos = base + Vector((0.35 * math.sin(t * 0.9 + ph[0]), 0.3 * math.sin(t * 0.7 + ph[1]),
                                 0.06 * math.sin(t * 2.3 + ph[2]) + 0.01 * math.sin(t * 17 + ph[3])))
            b.location = pos
            b.rotation_euler = (0.1, 0, 0.9 * math.cos(t * 0.9 + ph[0]) + ph[3])
            b.keyframe_insert("location", frame=f); b.keyframe_insert("rotation_euler", frame=f)

    # ------------------------------------------------------------------ dandelion seeds drifting in the light
    scol = L.hidden_collection("Seeds")
    L.pappus("s00", col=scol)
    spts, svel, sph = [], [], []
    for _ in range(900):
        p = Vector((prng.uniform(-3, 3), prng.uniform(0.6, 10), prng.uniform(0.15, 2.2)))
        if not visible(p, max_dist=16, margin=1.4):
            continue
        spts.append(p)
    so = L.point_cloud("SeedField", spts, {"vidx": ("INT", [0] * len(spts)),
                                          "rot": ("FLOAT_VECTOR", [(prng.uniform(-0.5, 0.5), prng.uniform(-0.5, 0.5), prng.uniform(0, 6.28)) for _ in spts]),
                                          "scl": ("FLOAT", [prng.uniform(0.9, 1.2) for _ in spts])})
    L.gn_instancer(so, scol, name="SeedInst", clock=clock)
    # drift: the whole seed cloud rides a light breeze (object motion -> real motion blur), each seed wobbles
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        t = f / 24.0 - T0
        so.location = (0.22 * t + 0.05 * math.sin(t * 0.7), 0.04 * t, -0.03 * t + 0.03 * math.sin(t * 0.5))
        so.keyframe_insert("location", frame=f)
    print(f"[sh13a] seeds {len(spts)}")

    for pre in [x for x in os.environ.get("S1_HIDE", "").split(",") if x]:
        for o in bpy.data.objects:
            if o.name.startswith(pre):
                o.hide_render = True
    ov = {"final_spp": 8, "final_threshold": 0.05, "preview_spp": 24, "transmission_bounces": 4, "max_bounces": 5,
          "glossy_bounces": 2, "diffuse_bounces": 1, "transparent_bounces": 8, "clamp_indirect": 6.0}
    for kk, v in json.loads(os.environ.get("S1_OV", "{}")).items():
        ov[kk] = v
    return ov


C.run("sh13a", build)
