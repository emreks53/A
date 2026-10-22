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
# one aerial perspective for everything beyond the near meadow (ground, grass, trees, shrubs)
HAZE_COL = (1.0, 0.76, 0.50)
HAZE_D0 = 450.0
HAZE_K = 1.0
SUN_GAIN_STOPS = 0.6
SUN_GAIN2_STOPS = 0.6
SKY_GAIN_STOPS = 0.4
BARK_K = 0.35
SENSOR = 36.0


def hgt(x, y):
    """Meadow terrain height: flat where the glide happens, gentle swells further out."""
    from mathutils import noise as mn
    d = min(1.0, max(0.0, (y - 3.0)) / 25.0 + max(0.0, abs(x) - 6.0) / 30.0)
    return d * (1.1 * mn.noise(Vector((x * 0.035, y * 0.035, 1.7))) + 0.35 * mn.noise(Vector((x * 0.1, y * 0.1, 4.1)))) + \
        0.05 * mn.noise(Vector((x * 0.5, y * 0.5, 9.0)))


def _haze_f(nt, dist0):
    cd = nt.nodes.new("ShaderNodeCameraData")
    return L.math_node(nt, "SUBTRACT", 1.0, L.math_node(nt, "EXPONENT", L.math_node(nt, "DIVIDE", cd.outputs["View Distance"], -dist0)))


def _mix(nt, fac, a, b):
    mx = nt.nodes.new("ShaderNodeMixShader")
    if isinstance(fac, float):
        mx.inputs[0].default_value = fac
    else:
        nt.links.new(fac, mx.inputs[0])
    nt.links.new(a, mx.inputs[1]); nt.links.new(b, mx.inputs[2])
    return mx


def aerial_haze(mat, color, dist0, strength, legacy=False, bark=None):
    """Aerial perspective that respects alpha cut-outs. (lib_s1.aerial_haze mixes an opaque emission over the
    whole surface, which turned the leaf cards into grey fog boxes and the dark bark into pale 'ghost' trunks.)
    New look: albedo-corrected copy of the surface, hazed by 1-e^(-d/d0), THEN cut out by the leaf alpha.
    Returns the mix node whose factor blends old (legacy lib haze, or no haze) -> new; the caller keys it,
    so frames before the light beat render exactly as before."""
    nt = mat.node_tree
    out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None)
    if out is None or not out.inputs["Surface"].links:
        return None
    src = out.inputs["Surface"].links[0].from_socket
    p = src.node
    assert p.type == "BSDF_PRINCIPLED", (mat.name, p.type)
    p2 = nt.nodes.new("ShaderNodeBsdfPrincipled")
    p2.distribution = p.distribution; p2.subsurface_method = p.subsurface_method
    alpha = None
    for k, inp in enumerate(p.inputs):
        if inp.links:
            if inp.name == "Alpha":
                alpha = inp.links[0].from_socket
                continue
            nt.links.new(inp.links[0].from_socket, p2.inputs[k])
        elif hasattr(inp, "default_value") and inp.name != "Alpha":
            p2.inputs[k].default_value = inp.default_value
    if bark is not None and alpha is None and p2.inputs["Base Color"].links:
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
        mix.inputs[0].default_value = 1.0
        nt.links.new(p2.inputs["Base Color"].links[0].from_socket, mix.inputs[6]); mix.inputs[7].default_value = (*bark, 1)
        nt.links.new(mix.outputs[2], p2.inputs["Base Color"])
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1); em.inputs["Strength"].default_value = strength
    new = _mix(nt, _haze_f(nt, dist0), p2.outputs[0], em.outputs[0]).outputs[0]
    if alpha is not None:
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        new = _mix(nt, alpha, tr.outputs[0], new).outputs[0]
    old = src
    if legacy:   # exactly lib_s1.aerial_haze(color=(1.0, 0.74, 0.52), dist0=420, strength=1.4), as rendered before
        em0 = nt.nodes.new("ShaderNodeEmission")
        em0.inputs["Color"].default_value = (1.0, 0.74, 0.52, 1); em0.inputs["Strength"].default_value = 1.4
        old = _mix(nt, _haze_f(nt, 420.0), src, em0.outputs[0]).outputs[0]
    blend = _mix(nt, 0.0, old, new)
    nt.links.new(blend.outputs[0], out.inputs["Surface"])
    return blend


def far_copy(src, name, col, mat_map):
    """Copy of src with its own mesh and material copies (mat_map: original -> copy, shared across copies),
    so the far additions can fade in without touching the materials of the original scene."""
    o = src.copy(); o.data = src.data.copy(); o.name = name
    for i, m_ in enumerate(o.data.materials):
        if m_ is not None:
            if m_ not in mat_map:
                mat_map[m_] = m_.copy()
            o.data.materials[i] = mat_map[m_]
    for c in list(o.users_collection):
        c.objects.unlink(o)
    col.objects.link(o)
    return o


def fade_in(mat):
    """Wrap the surface in a mix with a Transparent BSDF; returns the mix (factor 1 = fully transparent)."""
    nt = mat.node_tree
    out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None)
    if out is None or not out.inputs["Surface"].links:
        return None
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mx = _mix(nt, 1.0, out.inputs["Surface"].links[0].from_socket, tr.outputs[0])
    nt.links.new(mx.outputs[0], out.inputs["Surface"])
    return mx


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
        z = hgt(x, y) + 0.30 + 1.15 * rise + 0.012 * math.sin((t - T0) * 1.7)
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
                         disc_radiance=6000.0, disc_color=(1.0, 0.72, 0.42), tint=(0.98, 0.72, 0.48), saturation=1.2)
    # sky warms toward golden-peach near the horizon as the light arrives (glide part unchanged)
    tint_mix = next(n for n in sc.world.node_tree.nodes if n.type == "MIX" and n.blend_type == "MULTIPLY")
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        w_ = C.remap(f / 24.0, T_RISE + 0.3, T_RISE + 2.8, C.smooth)
        tint_mix.inputs[7].default_value = (0.98, 0.72 - 0.03 * w_, 0.48 - 0.16 * w_, 1)
        tint_mix.inputs[7].keyframe_insert("default_value", frame=f)
    sun = C.sun(elev_deg=SUN_ELEV, azim_deg=SUN_AZ + 90, strength=26.0, kelvin_k=3000, angle_deg=0.6)
    sun.data.color = (1.0, 0.62, 0.30)
    sun.visible_glossy = False
    sc.view_settings.exposure = -0.65
    # the beat: on "Halik-i Rahim ... genis sefkat" (79.0 -> 81.0 s) the meadow gains ~+0.5 stop of warm
    # golden light as the camera rises (keyed per frame -> identical for any job start frame)
    # and keeps it while the rise finishes (to 82.6 s), so the frame never sinks as the view tilts onto the field
    T_GOLD0, T_GOLD1, T_GOLD2 = 79.0, 81.0, 82.6
    sun_e0 = sun.data.energy
    bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
    bg_s0 = bg.inputs["Strength"].default_value
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        g_ = C.remap(f / 24.0, T_GOLD0, T_GOLD1, C.smooth)
        g2 = C.remap(f / 24.0, T_GOLD1, T_GOLD2, C.smooth)
        sun.data.energy = sun_e0 * (2.0 ** (SUN_GAIN_STOPS * g_ + SUN_GAIN2_STOPS * g2))
        sun.data.color = (1.0, 0.62 + 0.04 * g_, 0.30 - 0.03 * g_)
        sun.data.keyframe_insert("energy", frame=f); sun.data.keyframe_insert("color", frame=f)
        bg.inputs["Strength"].default_value = bg_s0 * (2.0 ** (SKY_GAIN_STOPS * C.remap(f / 24.0, T_GOLD0, T_GOLD2, C.smooth)))
        bg.inputs["Strength"].keyframe_insert("default_value", frame=f)

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
    alpha_n = nt.nodes.new("ShaderNodeMath"); alpha_n.operation = "MULTIPLY"; alpha_n.use_clamp = True
    nt.links.new(a, alpha_n.inputs[0])
    alpha = alpha_n.outputs[0]
    soft_sock = alpha_n.inputs[1]
    # patchy interior (broken cloud) so the shade is dappled, not flat
    nz2 = nt.nodes.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 0.06; nz2.inputs["Detail"].default_value = 3
    nt.links.new(tc.outputs["Object"], nz2.inputs["Vector"])
    patch = L.math_node(nt, "MULTIPLY_ADD", nz2.outputs["Fac"], 1.6, -0.15, clamp=True)
    al2 = L.math_node(nt, "MULTIPLY", alpha, patch)
    al3 = L.math_node(nt, "MULTIPLY", al2, 0.72)
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
        kk = C.remap(t, T_RISE - 0.1, T_RISE + 2.8, C.smooth)
        cloud_key(f, 9.0 + 0.25 * (t - T0) - 70.0 * kk)
        # edge softness: 15 m penumbra during the glide (unchanged), widening to a ~90 m soft warm wash
        soft_sock.default_value = 60.0 + (11.0 - 60.0) * C.remap(t, T_RISE, T_RISE + 1.0, C.smooth)
        soft_sock.keyframe_insert("default_value", frame=f)
    for fc in C.fcurves(cl):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"

    # ------------------------------------------------------------------ ground: gently rolling terrain
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=240, y_segments=240, size=170.0, calc_uvs=True)
    for v in bm.verts:
        v.co.y += 110.0
        v.co.z = hgt(v.co.x, v.co.y)
    gp = L.bm_to_obj("Ground", bm, [], smooth=True)
    gm = C.mat_from_textures("Ground", C.ph_texture("sparse_grass", "2k"), scale=127.0, base_tint=(0.75, 0.72, 0.5))
    C.assign(gp, gm)

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
    for (n, xs, y0, y1, smin, smax) in ((17000, 3.0, -1.0, 9.0, 0.75, 1.3), (8000, 9.0, 9.0, 30.0, 0.9, 1.5)):
        for _ in range(n):
            p = Vector((prng.uniform(-xs, xs), prng.uniform(y0, y1), 0.0))
            if near_path(p, 0.03):
                continue
            ptop = p + Vector((0, 0, 0.5))
            if not (visible(p, max_dist=40) or visible(ptop, max_dist=40)):
                continue
            p.z = hgt(p.x, p.y) - 0.01
            pts.append(p); vidx.append(prng.randrange(nvar))
            rots.append((prng.gauss(0.08, 0.16), prng.gauss(0.0, 0.16), prng.uniform(0, 6.283)))
            hn = __import__("mathutils").noise.noise(Vector((p.x * 0.35, p.y * 0.35, 7.7)))
            scls.append(prng.uniform(smin, smax) * (0.85 + 0.5 * hn))
    # Poly Haven grass clumps for body/volume, mid and far
    for (n, xs, y0, y1) in ((5000, 5.0, 0.5, 14.0), (4000, 25.0, 14.0, 45.0)):
        for _ in range(n):
            p = Vector((prng.uniform(-xs, xs), prng.uniform(y0, y1), 0.0))
            if near_path(p, 0.25):
                continue
            if not (visible(p, max_dist=60) or visible(p + Vector((0, 0, 0.3)), max_dist=60)):
                continue
            p.z = hgt(p.x, p.y) - 0.01
            ppts.append(p); pvidx.append(prng.randrange(len(ph_grass)))
            prots.append((0, 0, prng.uniform(0, 6.283))); pscls.append(prng.uniform(1.0, 1.8))
    # far meadow: grass carried all the way to the trunks of the forest edge (no bare strip / straight edge).
    # Own point cloud + material copies: it peeks over the near grass during the glide too, so it fades in
    # with the light (79.0 -> 80.4 s) and every frame before the beat stays exactly as rendered.
    far_mats = {}
    qpts, qvidx, qrots, qscls = [], [], [], []
    frng_ = random.Random(1345)
    for (n, xs, y0, y1, md, s0, s1) in ((14000, 60.0, 45.0, 110.0, 160, 1.3, 2.2), (12000, 130.0, 110.0, 200.0, 240, 1.6, 2.6)):
        for _ in range(n):
            p = Vector((frng_.uniform(-xs, xs * 0.5), frng_.uniform(y0, y1), 0.0))
            if not (visible(p, max_dist=md) or visible(p + Vector((0, 0, 0.5)), max_dist=md)):
                continue
            p.z = hgt(p.x, p.y) - 0.02
            qpts.append(p); qvidx.append(frng_.randrange(len(ph_grass)))
            qrots.append((0, 0, frng_.uniform(0, 6.283))); qscls.append(frng_.uniform(s0, s1))
    gcol_far = L.hidden_collection("PHGrassFar")
    for o in list(gcol.objects):          # same order as the near collection -> same vidx mapping
        far_copy(o, "q" + o.name[1:], gcol_far, far_mats)
    clock = L.clock_empty()
    field = L.point_cloud("MeadowField", pts, {"vidx": ("INT", vidx), "rot": ("FLOAT_VECTOR", rots), "scl": ("FLOAT", scls)})
    L.gn_instancer(field, inst, sway=0.06, sway_scale=0.8, sway_speed=0.35, name="MeadowInst", clock=clock)
    pfield = L.point_cloud("PHField", ppts, {"vidx": ("INT", pvidx), "rot": ("FLOAT_VECTOR", prots), "scl": ("FLOAT", pscls)})
    L.gn_instancer(pfield, gcol, name="PHInst")   # static: no per-frame rebuild
    qfield = L.point_cloud("PHFarField", qpts, {"vidx": ("INT", qvidx), "rot": ("FLOAT_VECTOR", qrots), "scl": ("FLOAT", qscls)})
    L.gn_instancer(qfield, gcol_far, name="PHFarInst")
    # the same far grass with the shared (non-fading) materials, used once the fade is complete: a Transparent
    # BSDF makes every shadow ray evaluate the shader, which costs ~6 s/frame for the rest of the shot
    qfield_o = L.point_cloud("PHFarFieldO", qpts, {"vidx": ("INT", qvidx), "rot": ("FLOAT_VECTOR", qrots), "scl": ("FLOAT", qscls)})
    L.gn_instancer(qfield_o, gcol, name="PHFarInstO")
    for o in (field, pfield, qfield, qfield_o):
        o.cycles.use_motion_blur = False
    L.key_clock(clock, [(f, f / 24.0) for f in range(ctx.f0 - 2, ctx.f1 + 3)])
    print(f"[sh13a] blades {len(pts)}  clumps {len(ppts)}  far clumps {len(qpts)}")

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
    from mathutils import noise as mn
    groups = [list(range(0, 6)), list(range(6, 10)), list(range(10, 13)), list(range(13, 18)), list(range(18, nfl))]
    gdens = [1.0, 0.85, 0.9, 1.0, 0.6]
    for _ in range(36000):
        p = Vector((prng.uniform(-12, 12), prng.uniform(-0.5, 40), 0.0))
        # each species grows in its own drifts/patches, with bare gaps between
        vals = [mn.noise(Vector((p.x * 0.22, p.y * 0.22, 3.3 + 11.0 * g))) for g in range(len(groups))]
        g = max(range(len(groups)), key=lambda i: vals[i])
        if L.smoothstep(0.12, 0.45, vals[g]) * gdens[g] < prng.random():
            continue
        if near_path(p, 0.09):
            continue
        if not visible(p + Vector((0, 0, 0.3)), max_dist=30):
            continue
        p.z = hgt(p.x, p.y) - 0.01
        fpts.append(p); fvidx.append(prng.choice(groups[g]))
        frots.append((prng.uniform(-0.1, 0.1), prng.uniform(-0.1, 0.1), prng.uniform(0, 6.283))); fscls.append(prng.uniform(1.0, 1.5))
    # far drifts of the same species out to the forest edge (own RNG: the near lists stay identical)
    gpts, gvidx, grots, gscls = [], [], [], []
    frng2 = random.Random(1346)
    for _ in range(30000):
        p = Vector((frng2.uniform(-60, 30), frng2.uniform(40, 120), 0.0))
        vals = [mn.noise(Vector((p.x * 0.09, p.y * 0.09, 3.3 + 11.0 * g))) for g in range(len(groups))]
        g = max(range(len(groups)), key=lambda i: vals[i])
        if L.smoothstep(0.10, 0.40, vals[g]) * gdens[g] < frng2.random():
            continue
        if not visible(p + Vector((0, 0, 0.3)), max_dist=130):
            continue
        p.z = hgt(p.x, p.y) - 0.01
        gpts.append(p); gvidx.append(frng2.choice(groups[g]))
        grots.append((0, 0, frng2.uniform(0, 6.283))); gscls.append(frng2.uniform(1.4, 2.0))
    # flowers that brush past the lens (just off the glide path at lens height)
    for (tt, side) in ((75.0, 1), (76.3, -1), (77.4, 1), (78.4, -1), (79.3, 1)):
        c, M = cams[int(tt * 24)]
        right = M @ Vector((1, 0, 0))
        p = Vector((c.x, c.y, 0)) + Vector((right.x, right.y, 0)).normalized() * (0.10 * side) + (M @ Vector((0, 0, -1))) * 0.45
        p.z = hgt(p.x, p.y)
        fpts.append(p); fvidx.append(prng.randrange(18)); frots.append((0, 0, prng.uniform(0, 6.283))); fscls.append(0.75)
    flf = L.point_cloud("FlowerField", fpts, {"vidx": ("INT", fvidx), "rot": ("FLOAT_VECTOR", frots), "scl": ("FLOAT", fscls)})
    L.gn_instancer(flf, fcol, sway=0.07, sway_scale=0.9, sway_speed=0.4, name="FlowerInst", clock=clock)
    flf.cycles.use_motion_blur = False
    fcol_far = L.hidden_collection("FlowersFar")
    for o in list(fcol.objects):
        far_copy(o, "g" + o.name[1:], fcol_far, far_mats)
    glf = L.point_cloud("FlowerFarField", gpts, {"vidx": ("INT", gvidx), "rot": ("FLOAT_VECTOR", grots), "scl": ("FLOAT", gscls)})
    L.gn_instancer(glf, fcol_far, name="FlowerFarInst")
    glf.cycles.use_motion_blur = False
    glf_o = L.point_cloud("FlowerFarFieldO", gpts, {"vidx": ("INT", gvidx), "rot": ("FLOAT_VECTOR", grots), "scl": ("FLOAT", gscls)})
    L.gn_instancer(glf_o, fcol, name="FlowerFarInstO")
    glf_o.cycles.use_motion_blur = False
    print(f"[sh13a] flowers {len(fpts)}  far flowers {len(gpts)}")

    # ------------------------------------------------------------------ shrubs + trees at the forest edge
    shr = [o for o in C.ph_model("shrub_02", "1k") if o.type == "MESH"]
    tree_srcs = []
    for nm in ("island_tree_02", "tree_small_02", "searsia_lucida"):
        objs = [o for o in C.ph_model(nm, "1k") if o.type == "MESH"]
        tree_srcs.append(max(objs, key=lambda o: o.dimensions.z))
        for o in objs:
            o.hide_render = True; o.hide_viewport = True
    trees = tree_srcs
    for o in shr:
        o.hide_render = True; o.hide_viewport = True
    trng = random.Random(3)
    # forest edge on the LEFT and far-left: with the sun low ahead-right its long shadows fall away from the
    # meadow we look across; the right side stays open toward the sun.
    def place(src, loc, height, sz=1.0):
        o = src.copy(); sc.collection.objects.link(o); o.hide_render = False; o.hide_viewport = False
        o.location = (loc[0], loc[1], hgt(loc[0], loc[1]) - 0.1)
        o.rotation_euler = (0, 0, trng.uniform(0, 6.28))
        k_ = height / max(0.5, src.dimensions.z)
        o.scale = (k_ * sz, k_ * sz, k_)
    # forest edge as irregular clumps of mixed species and heights, with open gaps between clumps
    for c in range(11):
        cy = 22 + c * 7.5 + trng.uniform(-3, 3)
        cx = -10 - 0.3 * (cy - 22) - trng.uniform(0, 14)
        n = trng.randint(2, 7)
        rad = trng.uniform(3, 9)
        for k_ in range(n):
            a = trng.uniform(0, 6.28); r = rad * math.sqrt(trng.random())
            place(trng.choice(trees), (cx + r * math.cos(a), cy + r * math.sin(a), 0), trng.uniform(7, 21), trng.uniform(0.8, 1.3))
    # deep forest behind (two more layers, larger), increasingly hazy
    for i in range(45):
        place(trng.choice(trees), (trng.uniform(-120, 15), trng.uniform(95, 190), 0), trng.uniform(12, 26), trng.uniform(0.9, 1.3))
    for i in range(40):
        y = trng.uniform(18, 70)
        place(shr[i % len(shr)], (trng.uniform(-14, -5) - 0.15 * (y - 18), y, 0), trng.uniform(1.5, 3.5))
    for i in range(8):
        place(shr[i % len(shr)], (trng.uniform(4, 30), trng.uniform(40, 90), 0), trng.uniform(1.5, 3.0))
    # mid-ground and lone trees in the meadow
    # (sun is low ahead-right: anything right of / in front of the view would throw 60-90 m shadows over
    #  the meadow, so mid-ground trees stand on the left where their shadows fall away)
    place(trees[2], (-11, 30, 0), 8.0)
    place(trees[1], (-15, 40, 0), 11.0)
    # far hedgerow across the open right side, on the far rim of the meadow: an irregular, hazy line of shrubs
    # and small trees instead of a ruler-straight meadow/sky edge (own RNG: the placements above are unchanged)
    hrng = random.Random(1347)
    hcol = L.hidden_collection("HedgeSrc")
    hsrc = {}
    far_objs = [qfield, glf]          # fading copies: only during the fade (f1897-1929)
    far_objs_o = [qfield_o, glf_o]    # plain copies: from f1930 on (fade complete -> identical look)
    def place_far(src, x, y, height, sz):
        if src.name not in hsrc:
            hsrc[src.name] = far_copy(src, "h_" + src.name, hcol, far_mats)
        rz = hrng.uniform(0, 6.28)
        k_ = height / max(0.5, src.dimensions.z)
        for s_, lst in ((hsrc[src.name], far_objs), (src, far_objs_o)):
            o = s_.copy(); sc.collection.objects.link(o); o.hide_render = False; o.hide_viewport = False
            o.location = (x, y, hgt(x, y) - 0.15)
            o.rotation_euler = (0, 0, rz)
            o.scale = (k_ * sz, k_ * sz, k_)
            lst.append(o)
    for i in range(70):
        x = hrng.uniform(-5, 95); y = hrng.uniform(180, 194)
        if hrng.random() < 0.3:
            place_far(hrng.choice(trees), x, y, hrng.uniform(6, 13), hrng.uniform(0.9, 1.3))
        else:
            place_far(shr[i % len(shr)], x, y, hrng.uniform(2.5, 5.5), hrng.uniform(1.2, 2.0))
    # aerial perspective on everything far (camera-ray distance fog toward the warm horizon colour)
    # one uniform, lighter haze over field, shrubs and trees; tree bark brought to a real albedo (it read
    # chalky against the low backlight). It settles in as the light arrives (79.0 -> 80.4 s, keyed), so the
    # glide before the beat is unchanged.
    tree_m = {m_ for o in trees for m_ in o.data.materials}
    blends = []
    for ms_ in sorted(tree_m | {m_ for o in shr for m_ in o.data.materials}, key=lambda m_: m_.name):
        blends.append(aerial_haze(ms_, HAZE_COL, HAZE_D0, HAZE_K, legacy=True,
                                  bark=(BARK_K, BARK_K * 0.9, BARK_K * 0.8) if ms_ in tree_m else None))
    for ms_ in sorted({m_ for o in ph_grass for m_ in o.data.materials} | {gm}, key=lambda m_: m_.name):
        blends.append(aerial_haze(ms_, HAZE_COL, HAZE_D0, HAZE_K))
    # far additions (own material copies): same haze/bark, then faded in from fully transparent
    fades = []
    for m0, m1 in sorted(far_mats.items(), key=lambda kv: kv[1].name):
        if m0 in tree_m or m0 in {m_ for o in shr + ph_grass for m_ in o.data.materials}:
            b_ = aerial_haze(m1, HAZE_COL, HAZE_D0, HAZE_K, bark=(BARK_K, BARK_K * 0.9, BARK_K * 0.8) if m0 in tree_m else None)
            if b_ is not None:
                b_.inputs[0].default_value = 1.0
        fades.append(fade_in(m1))
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        k_ = C.remap(f / 24.0, 79.0, 80.4, C.smooth)
        for b_ in blends:
            if b_ is not None:
                b_.inputs[0].default_value = k_
                b_.inputs[0].keyframe_insert("default_value", frame=f)
        for d_ in fades:
            if d_ is not None:
                d_.inputs[0].default_value = 1.0 - k_
                d_.inputs[0].keyframe_insert("default_value", frame=f)
        # even fully transparent, their surfaces use up transparent bounces and change the glide frames:
        # the far additions only exist from f1897. (Measured on the farm render: at f1897 ~1650 px around
        # render y850-910 step darker, band -0.011, about 40 % of their final value - the transparent-bounce
        # limit, not the fade; invisible at phone size.)
        for o in far_objs:
            o.hide_render = not (0.0 < k_ < 1.0)
            o.keyframe_insert("hide_render", frame=f)
        for o in far_objs_o:
            o.hide_render = k_ < 1.0
            o.keyframe_insert("hide_render", frame=f)

    # ------------------------------------------------------------------ ground out to the horizon
    # The ground grid ends ~280 m out; past it, rays between the hedge bases met the HDRI's unhazed dark
    # field band -> a ruler-straight dark line under the hedgerow. A far ring of the same hazed ground runs
    # out to ~3 km (fine 2 m quads near the grid so it cannot poke through it, coarse beyond). It comes in
    # over f1944-1952 (fading copy f1945-1951, plain copy from f1952), so frames up to 1944 are unchanged.
    GX0, GX1, GY0, GY1 = -170.0, 170.0, -60.0, 280.0       # the original ground grid (create_grid size = half-extent)

    def ground_ring(name, x0, x1, y0, y1, nx, ny, hole, dz):
        bm_ = bmesh.new()
        uvl = bm_.loops.layers.uv.new("UVMap")
        vs = [[bm_.verts.new((x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny, 0.0)) for i in range(nx + 1)] for j in range(ny + 1)]
        for row in vs:
            for v in row:
                v.co.z = hgt(v.co.x, v.co.y) - dz
        for j in range(ny):
            for i in range(nx):
                q = (vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i])
                cx = sum(v.co.x for v in q) / 4; cy = sum(v.co.y for v in q) / 4
                if hole[0] < cx < hole[1] and hole[2] < cy < hole[3]:
                    continue
                fc = bm_.faces.new(q)
                for lp in fc.loops:   # same texel density as the original grid (UV 0..1 over its 340 m)
                    lp[uvl].uv = ((lp.vert.co.x - GX0) / 340.0, (lp.vert.co.y - GY0) / 340.0)
        return L.bm_to_obj(name, bm_, [], smooth=True)
    rings = [ground_ring("GroundRingNear", -500.0, 500.0, -100.0, 800.0, 500, 450, (GX0 + 1.0, GX1 - 1.0, GY0 + 1.0, GY1 - 1.0), 0.06),
             ground_ring("GroundRingFar", -3000.0, 3000.0, -400.0, 3000.0, 200, 113, (-500.0, 500.0, -100.0, 800.0), 0.6)]
    # ... and below +1.6 deg the sky is looked up at +1.6 deg (the HDRI's own unhazed field and bush band is
    # replaced by the sky just above it), while the ring's in-scatter turns from the standard haze (300 m)
    # into that same sky radiance (1.2 km): far ground, horizon and sky meet without any line
    RAISE_Z = math.sin(math.radians(1.6))
    wnt = sc.world.node_tree
    w_map = next(n for n in wnt.nodes if n.type == "MAPPING")
    w_env = next(n for n in wnt.nodes if n.type == "TEX_ENVIRONMENT")
    w_hsv = next(n for n in wnt.nodes if n.type == "HUE_SAT")

    def raised(nt_, vec):
        sp_ = nt_.nodes.new("ShaderNodeSeparateXYZ"); nt_.links.new(vec, sp_.inputs[0])
        cb_ = nt_.nodes.new("ShaderNodeCombineXYZ")
        nt_.links.new(sp_.outputs[0], cb_.inputs[0]); nt_.links.new(sp_.outputs[1], cb_.inputs[1])
        nt_.links.new(L.math_node(nt_, "MAXIMUM", sp_.outputs[2], RAISE_Z), cb_.inputs[2])
        nm_ = nt_.nodes.new("ShaderNodeVectorMath"); nm_.operation = "NORMALIZE"
        nt_.links.new(cb_.outputs[0], nm_.inputs[0])
        return nm_.outputs[0]
    w_gen = w_map.inputs["Vector"].links[0].from_socket
    w_vmix = wnt.nodes.new("ShaderNodeMix"); w_vmix.data_type = "VECTOR"
    w_vmix.inputs[0].default_value = 0.0
    wnt.links.new(w_gen, w_vmix.inputs[4]); wnt.links.new(raised(wnt, w_gen), w_vmix.inputs[5])
    wnt.links.new(w_vmix.outputs[1], w_map.inputs["Vector"])

    # ring material: gm's hazed ground, in-scatter -> world radiance of the raised view direction
    gm_ring = gm.copy(); gm_ring.name = "GroundRing"
    rnt = gm_ring.node_tree
    if rnt.animation_data and rnt.animation_data.action:
        rnt.animation_data.action = rnt.animation_data.action.copy()
    r_em = next(n for n in rnt.nodes if n.type == "EMISSION" and all(abs(n.inputs["Color"].default_value[i] - HAZE_COL[i]) < 1e-5 for i in range(3)))
    geo = rnt.nodes.new("ShaderNodeNewGeometry")
    neg = rnt.nodes.new("ShaderNodeVectorMath"); neg.operation = "SCALE"; neg.inputs["Scale"].default_value = -1.0
    rnt.links.new(geo.outputs["Incoming"], neg.inputs[0])
    r_map = rnt.nodes.new("ShaderNodeMapping"); r_map.vector_type = w_map.vector_type
    r_map.inputs["Rotation"].default_value = w_map.inputs["Rotation"].default_value
    rnt.links.new(raised(rnt, neg.outputs[0]), r_map.inputs["Vector"])
    r_env = rnt.nodes.new("ShaderNodeTexEnvironment"); r_env.image = w_env.image
    r_env.interpolation = w_env.interpolation; r_env.projection = w_env.projection
    rnt.links.new(r_map.outputs["Vector"], r_env.inputs["Vector"])
    r_hsv = rnt.nodes.new("ShaderNodeHueSaturation")
    for k_ in ("Hue", "Saturation", "Value", "Fac"):
        r_hsv.inputs[k_].default_value = w_hsv.inputs[k_].default_value
    rnt.links.new(r_env.outputs["Color"], r_hsv.inputs["Color"])
    r_tint = rnt.nodes.new("ShaderNodeMix"); r_tint.data_type = "RGBA"; r_tint.blend_type = "MULTIPLY"
    r_tint.inputs[0].default_value = 1.0
    rnt.links.new(r_hsv.outputs["Color"], r_tint.inputs[6])
    r_str = rnt.nodes.new("ShaderNodeVectorMath"); r_str.operation = "SCALE"
    rnt.links.new(r_tint.outputs[2], r_str.inputs[0])
    cdr = rnt.nodes.new("ShaderNodeCameraData")
    r_mr = rnt.nodes.new("ShaderNodeMapRange"); r_mr.interpolation_type = "SMOOTHSTEP"; r_mr.clamp = True
    rnt.links.new(cdr.outputs["View Distance"], r_mr.inputs["Value"])
    r_mr.inputs["From Min"].default_value = 300.0; r_mr.inputs["From Max"].default_value = 1200.0
    r_col = rnt.nodes.new("ShaderNodeMix"); r_col.data_type = "RGBA"
    rnt.links.new(r_mr.outputs["Result"], r_col.inputs[0])
    r_col.inputs[6].default_value = (*(c_ * HAZE_K for c_ in HAZE_COL), 1)
    rnt.links.new(r_str.outputs[0], r_col.inputs[7])
    rnt.links.new(r_col.outputs[2], r_em.inputs["Color"])
    r_em.inputs["Strength"].default_value = 1.0
    # beyond ~400 m (it only shows past the 200 m grass tops, i.e. > ~350 m) the ring melts fully into that
    # sky radiance: no pale or dark strip can form where the far ground meets the horizon
    r_out = next(n for n in rnt.nodes if n.type == "OUTPUT_MATERIAL")
    r_sky = rnt.nodes.new("ShaderNodeEmission"); rnt.links.new(r_str.outputs[0], r_sky.inputs["Color"])
    r_mr2 = rnt.nodes.new("ShaderNodeMapRange"); r_mr2.interpolation_type = "SMOOTHSTEP"; r_mr2.clamp = True
    rnt.links.new(cdr.outputs["View Distance"], r_mr2.inputs["Value"])
    r_mr2.inputs["From Min"].default_value = 290.0; r_mr2.inputs["From Max"].default_value = 420.0
    rnt.links.new(_mix(rnt, r_mr2.outputs["Result"], r_out.inputs["Surface"].links[0].from_socket, r_sky.outputs[0]).outputs[0],
                  r_out.inputs["Surface"])
    gm_fade = gm_ring.copy(); gm_fade.name = "GroundRingFade"
    if gm_fade.node_tree.animation_data and gm_fade.node_tree.animation_data.action:
        gm_fade.node_tree.animation_data.action = gm_fade.node_tree.animation_data.action.copy()
    ring_fade = fade_in(gm_fade)
    ring_tint = [next(n for n in m_.node_tree.nodes if n.name == r_tint.name) for m_ in (gm_ring, gm_fade)]
    ring_str = [next(n for n in m_.node_tree.nodes if n.name == r_str.name) for m_ in (gm_ring, gm_fade)]
    ring_objs_f, ring_objs_o = [], []
    for r_ in rings:
        o2 = r_.copy(); o2.data = r_.data.copy(); sc.collection.objects.link(o2)
        C.assign(r_, gm_ring); C.assign(o2, gm_fade)
        ring_objs_o.append(r_); ring_objs_f.append(o2)
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        k2 = C.remap(f, 1944, 1952, C.smooth)
        w_vmix.inputs[0].default_value = k2
        w_vmix.inputs[0].keyframe_insert("default_value", frame=f)
        st_ = bg_s0 * (2.0 ** (SKY_GAIN_STOPS * C.remap(f / 24.0, T_GOLD0, T_GOLD2, C.smooth)))
        w_ = C.remap(f / 24.0, T_RISE + 0.3, T_RISE + 2.8, C.smooth)       # = the world tint keys above
        for n_ in ring_tint:
            n_.inputs[7].default_value = (0.98, 0.72 - 0.03 * w_, 0.48 - 0.16 * w_, 1)
            n_.inputs[7].keyframe_insert("default_value", frame=f)
        for n_ in ring_str:
            n_.inputs["Scale"].default_value = st_
            n_.inputs["Scale"].keyframe_insert("default_value", frame=f)
        ring_fade.inputs[0].default_value = 1.0 - k2
        ring_fade.inputs[0].keyframe_insert("default_value", frame=f)
        for o in ring_objs_f:
            o.hide_render = not (0.0 < k2 < 1.0)
            o.keyframe_insert("hide_render", frame=f)
        for o in ring_objs_o:
            o.hide_render = k2 < 1.0
            o.keyframe_insert("hide_render", frame=f)
    for o in rings + ring_objs_f:
        o.cycles.use_motion_blur = False

    # ------------------------------------------------------------------ butterflies
    brng = random.Random(8)
    for i in range(6):
        kind = "white" if i in (2, 5) else "fritillary"
        root, wl, wr = L.butterfly(f"Butterfly{i}", brng, kind)
        if i == 0:
            root.scale = (1.4, 1.4, 1.4)
        base = Vector((brng.uniform(-1.0, 1.0), brng.uniform(1.6, 5.5) + (3 if i > 3 else 0), brng.uniform(0.35, 0.9)))
        ph = [brng.uniform(0, 6.28) for _ in range(6)]
        freq = brng.uniform(6.0, 8.0)
        prev = None
        for f in range(ctx.f0 - 2, ctx.f1 + 3):
            t = f / 24.0
            u = t - T0
            pos = base + Vector((0.9 * math.sin(u * 0.45 + ph[0]) + 0.3 * math.sin(u * 1.3 + ph[1]),
                                 0.7 * math.sin(u * 0.35 + ph[2]) + 0.25 * u * math.cos(ph[5]),
                                 0.25 * math.sin(u * 0.9 + ph[3]) + 0.08 * math.sin(u * 3.1 + ph[4])))
            if i == 0:
                # hero butterfly: crosses the view left -> right ~1.1 m ahead of the lens, 75.6-77.8 s
                cl_, cM = cams[min(max(f, ctx.f0), ctx.f1 - 1)]
                k_ = (t - 75.6) / 2.2
                pos = cl_ + cM @ Vector((-0.40 + 0.80 * k_ + 0.04 * math.sin(t * 5.0), 0.17 + 0.05 * math.sin(t * 3.3), -1.2))
            if prev is None:
                prev = pos - Vector((0, 0.01, 0))
            d = pos - prev
            heading = math.atan2(d.y, d.x) - math.pi / 2
            root.location = pos
            root.rotation_euler = (0.25, (-0.6 if i == 0 else 0.0), heading)
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
        base = Vector((brng.uniform(-0.6, 0.6), brng.uniform(1.4, 3.2) + 0.5 * i, brng.uniform(0.3, 0.5)))
        b.scale = (1.3, 1.3, 1.3)
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
    ov = {"final_spp": 6, "final_res": 90, "final_threshold": 0.05, "preview_spp": 24, "transmission_bounces": 4, "max_bounces": 5,
          "glossy_bounces": 2, "diffuse_bounces": 1, "transparent_bounces": 8, "clamp_indirect": 6.0}
    for kk, v in json.loads(os.environ.get("S1_OV", "{}")).items():
        ov[kk] = v
    return ov


# final-resolution override (director allows < 100 % for defocus-heavy shots; post upscales to 1080x1920).
# common.configure_render has no such key, so wrap it here (common.py itself is untouched).
_orig_configure = C.configure_render


def _configure(mode, ov):
    _orig_configure(mode, ov)
    if mode == "final" and ov.get("final_res"):
        bpy.context.scene.render.resolution_percentage = int(ov["final_res"])


C.configure_render = _configure
C.run("sh13a", build)
