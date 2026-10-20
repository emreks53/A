"""sh13b · 84.20–89.10 · "ve her bir kulunu birer birer görüp gözetip idare ettiğini gösterir."

Close in the golden-hour meadow (continuing sh13a's low glide, slowing).  Eight clearly separated
living subjects for the post "one by one" tracking rings, in order TRK_a..TRK_h:
a flower (dandelion), a bee, a butterfly, a ladybug, a grass seed head, a snail, a sapling, the
seedling.  On "gözetip" the camera drifts down to THE SEEDLING: a single dew drop forms at its leaf
tip and a sunbeam rests on it.  Exit: focus pull (to sh14a's sunflower)."""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy, bmesh
from mathutils import Vector, Matrix, Euler, noise
import common as C
import lib_s3 as L

HDRI = "grasslands_sunset"


def look_matrix(pos, fwd, up=Vector((0, 0, 1))):
    f = fwd.normalized(); r = f.cross(up).normalized(); u = r.cross(f).normalized()
    return Matrix.Translation(pos) @ Matrix((r, u, -f)).transposed().to_4x4()


def place(objs, loc, rot_z=0.0, scale=1.0, tilt=(0, 0)):
    root = C.empty(f"grp_{objs[0].name}", loc)
    for o in objs:
        if o.parent is None:
            o.parent = root
    root.rotation_euler = (tilt[0], tilt[1], rot_z)
    root.scale = (scale,) * 3
    return root


def build(ctx):
    rnd = random.Random(1313)
    t_bir = ctx.word("birer")
    t_goz = ctx.word("gözetip")
    t_end = ctx.t1
    # ---------------------------------------------------------------- light: low golden sun, backlit
    path = C.ph_hdri(HDRI, "4k")
    el, u, _, _ = L.hdri_sun(path)
    L.world_from_hdri(path, strength=1.0, tint=(1.0, 0.74, 0.46))
    sdir = L.sun_dir_world(el + 9.0, u)            # lamp higher than the disc: light reaches into the grass
    # rotate the world so the sun sits behind the subjects (camera looks +Y)
    want = math.atan2(1.0, -0.30)                    # azimuth of the sun direction we want (from +X)
    have = math.atan2(sdir.y, sdir.x)
    rot = math.degrees(want - have)
    nt = bpy.context.scene.world.node_tree
    for n in nt.nodes:
        if n.type == "MAPPING":
            n.inputs["Rotation"].default_value[2] = math.radians(-rot)    # texture lookup rotates the other way
    sdir = L.sun_dir_world(el + 9.0, u, rot)
    sun = L.sun_from_dir(sdir, 6.0, kelvin_k=2500, angle_deg=0.6)

    # ---------------------------------------------------------------- ground + meadow
    soil = C.principled("S3_meadowsoil", base=(0.07, 0.055, 0.035), rough=0.95)
    bpy.ops.mesh.primitive_plane_add(size=12); g = bpy.context.object; g.data.materials.append(soil)
    grass_carpet(rnd)

    # ---------------------------------------------------------------- the eight subjects
    # Layout is solved in screen space for the "birer birer" hold so the eight subjects are
    # spread across the frame, clear of the key-word band (y 520-820) and the UI margins.
    M_mid = cam_pose(ctx, ctx.word("birer") + 0.5, None)[0]
    cam_o = M_mid.to_translation()

    def ray_z(px, py, z):
        d = (cam_point(M_mid, px, py, 1.0) - cam_o).normalized()
        k = (z - cam_o.z) / d.z
        return cam_o + d * k

    def top_of(objs):
        bpy.context.view_layer.update()
        ms = [o for o in objs if o.type == "MESH"]
        return max((o.matrix_world @ Vector(c) for o in ms for c in o.bound_box), key=lambda v: v.z)

    def plant_at(name, res, px, py, depth, rot_z, pick=max):
        """Place a plant variant so its highest point lands on pixel (px,py) at `depth` metres: the
        plant is scaled to the height that point has above the ground (stays a believable size)."""
        vs = variants(name, res)
        var = pick(vs, key=lambda v: v[2])
        target = cam_point(M_mid, px, py, depth)
        sc = max(0.05, target.z) / var[2]
        o = instance(var, (0, 0, 0), rot_z, sc, name="S3_" + name)
        t = top_point(o)
        o.matrix_world = Matrix.Translation((target.x - t.x, target.y - t.y, 0)) @ o.matrix_world
        print("[sh13b]", name, "scale", round(sc, 3), "height", round(target.z, 3))
        return top_point(o)

    # a: flower (dandelion)
    top = plant_at("dandelion_01", "2k", 300, 980, 0.45, 0.4)
    trk = {"a": C.empty("TRK_a", tuple(top))}
    # b: bee hovering
    bee = make_bee("bee")
    bee_path(ctx, bee, cam_point(M_mid, 690, 330, 0.6))
    trk["b"] = C.empty("TRK_b", (0, 0, 0)); trk["b"].parent = bee
    # c: butterfly perched on an orange gazania, wings breathing
    gpt = cam_point(M_mid, 270, 400, 0.9)
    gtop = daisy(Vector((gpt.x + 0.01, gpt.y, 0)), gpt.z, rnd)
    bf = make_butterfly("butterfly", ctx)
    bf.location = gtop + Vector((0, 0, 0.002)); bf.rotation_euler = (0, 0, 2.3)
    trk["c"] = C.empty("TRK_c", (0, 0, 0.004)); trk["c"].parent = bf
    # d: ladybug climbing a grass blade
    lb_base = ray_z(770, 1000, 0.11) - Vector((0.02, 0.004, 0.11))
    lb, lbtip = ladybug_on_blade(ctx, lb_base)
    trk["d"] = C.empty("TRK_d", (0, 0, 0.002)); trk["d"].parent = lb
    # e: grass seed head (top centre)
    e_pt = cam_point(M_mid, 520, 240, 0.75)
    sh_top = seed_head(Vector((e_pt.x - 0.012, e_pt.y, 0)), rnd, height=e_pt.z)
    trk["e"] = C.empty("TRK_e", tuple(sh_top))
    # f: snail low left
    sn = make_snail("snail", ctx, ray_z(250, 1360, 0.008) - Vector((0, 0, 0.008)))
    trk["f"] = C.empty("TRK_f", (0, 0, 0.012)); trk["f"].parent = sn
    # g: sapling low right (further back)
    g_top = plant_at("pine_sapling_small", "1k", 850, 460, 1.6, 0.3, pick=max)
    trk["g"] = C.empty("TRK_g", tuple(g_top - Vector((0, 0, 0.02))))
    # h: THE SEEDLING, foreground centre-bottom (healthy, dewy)
    sl = ray_z(540, 1200, 0.045); seed_loc = Vector((sl.x, sl.y, 0.0))
    sd = L.seedling(loc=tuple(seed_loc), wilt=0.0, wet=0.15, rot_z=0.35)
    trk["h"] = C.empty("TRK_h", (0, 0, 0)); trk["h"].parent = sd["apex"]
    bpy.context.view_layer.update()
    meadow(rnd, [(o.matrix_world.translation.x, o.matrix_world.translation.y, 0.05) for o in trk.values()] +
           [(seed_loc.x, seed_loc.y, 0.07)])
    bpy.context.view_layer.update()
    tip = sd["tips"][0]
    tipw = tip.matrix_world.translation.copy()
    # dew drop forming at the leaf tip on "gözetip"
    water = C.mat_water("S3_dew")
    dew = L.obj_from_bm("S3_dewdrop", pendant_drop(0.0016), [water])
    dew.parent = sd["leaves"][0]; dew.location = tip.location + Vector((0.0004, 0, -0.0003))
    for tt, sc in ((t_goz - 0.1, 0.0), (t_goz + 0.15, 0.25), (t_goz + 1.4, 1.0), (t_end + 0.3, 1.06)):
        dew.scale = (sc,) * 3; dew.keyframe_insert("scale", frame=tt * C.FPS)
    # sunbeam resting on it: a tight warm spot from the sun direction
    sb = bpy.data.lights.new("S3_sunbeam", "SPOT")
    sb.spot_size = math.radians(9.0); sb.spot_blend = 0.8; sb.shadow_soft_size = 0.02
    sb.color = C.kelvin(3100)
    beam = bpy.data.objects.new("S3_sunbeam", sb); C.link(beam)
    bdir = (Vector((sdir.x, sdir.y, 0)).normalized() * math.cos(math.radians(24)) + Vector((0, 0, math.sin(math.radians(24))))).normalized()
    beam.location = tipw + bdir * 0.35
    beam.rotation_euler = (-bdir).to_track_quat("-Z", "Y").to_euler()
    for tt, e in ((t_goz - 0.2, 0.0), (t_goz + 0.9, 3.5), (t_end + 0.3, 3.7)):
        sb.energy = e; sb.keyframe_insert("energy", frame=tt * C.FPS)
    # the general sun dims a touch as the beam takes over (a cloud edge)
    for tt, e in ((t_goz - 0.2, 6.0), (t_goz + 0.9, 4.2), (t_end + 0.3, 4.0)):
        sun.data.energy = e; sun.data.keyframe_insert("energy", frame=tt * C.FPS)

    # ---------------------------------------------------------------- camera
    cam = C.camera("cam", lens=50, loc=(0, -0.2, 0.16), fstop=5.6)
    focus = C.empty("cam_focus", (0, 0.5, 0.08)); cam.data.dof.focus_object = focus
    prev = None
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        t = f / C.FPS
        M, pos, d = cam_pose(ctx, t, tipw)
        cam.matrix_world = M
        e = cam.rotation_euler.copy()
        if prev is not None:
            e.make_compatible(prev)
        cam.rotation_euler = e; prev = e.copy()
        cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_euler", frame=f)
        cam.data.dof.aperture_fstop = C.lerp(5.6, 4.5, d); cam.data.dof.keyframe_insert("aperture_fstop", frame=f)
        # focus: middle of the group, then the leaf tip; exit pull to the far background
        fp = Vector((0, 0.55, 0.08)).lerp(tipw, d)
        pull = C.remap(t, t_end - 0.35, t_end + 0.25, C.smooth)
        fp = fp.lerp(tipw + (tipw - pos).normalized() * 0.5, pull)
        focus.location = fp; focus.keyframe_insert("location", frame=f)
    C.handheld(cam, amp_loc=0.0006, amp_rot=0.001, speed=0.4)
    bpy.context.scene.view_settings.exposure = -0.15
    bpy.context.scene.cycles_curves.shape = os.environ.get("S3_CURVES", "RIBBONS")   # flat ribbons: ~2x cheaper
    L.render_tuning(os.environ.get("S3_DQ", "BALANCED"))
    return L.experiment({"final_spp": 12, "final_threshold": 0.05, "preview_spp": 32, "clamp_indirect": 4.0})


def cam_point(M, px, py, depth, lens=50.0):
    th = math.tan(math.atan(18.0 / lens))
    return M @ Vector(((px - 540) / 960 * th * depth, (960 - py) / 960 * th * depth, -depth))


def cam_pose(ctx, t, tipw):
    """Camera pose at time t: sh13a's low glide slowing, a hold for the rings, then the drift down to
    the seedling's leaf tip on "gözetip" (tipw None -> hold pose only)."""
    t_bir, t_goz = ctx.word("birer"), ctx.word("gözetip")
    glide = C.remap(t, ctx.t0 - 0.5, t_bir, C.ease_out)
    pos = Vector((0.025 * (1 - glide), -0.30 + 0.08 * glide, 0.15))
    wide_target = Vector((0.0, 0.62, 0.08))
    d = 0.0 if tipw is None else C.remap(t, t_goz - 0.05, t_goz + 1.5, C.smoother)
    if tipw is not None:
        pos = pos.lerp(tipw + Vector((-0.03, -0.072, 0.034)), d)
        aim = wide_target.lerp(tipw + Vector((0.004, 0.006, -0.004)), C.smooth(d)) - pos
    else:
        aim = wide_target - pos
    return look_matrix(pos, aim), pos, d


def variants(name, res="1k"):
    """Poly Haven plant sets hold several variants side by side: return [(mesh, base)] where base is
    the variant's own base point (bbox centre xy, min z).  Originals are hidden from render."""
    objs = C.ph_model(name, res)
    bpy.context.view_layer.update()
    out = []
    for o in objs:
        if o.type != "MESH":
            continue
        pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
        base = Vector((sum(p.x for p in pts) / 8, sum(p.y for p in pts) / 8, min(p.z for p in pts)))
        h = max(p.z for p in pts) - base.z
        out.append((o, base, h))
        o.hide_render = True
    return out


def instance(var, loc, rot_z, scale, col=None, name=None):
    o0, base, h = var
    o = bpy.data.objects.new(name or ("i_" + o0.name), o0.data)
    (col.objects.link(o) if col else C.link(o))
    o.matrix_world = Matrix.Translation(loc) @ Matrix.Rotation(rot_z, 4, "Z") @ Matrix.Scale(scale, 4) @ \
        Matrix.Translation(-base) @ o0.matrix_world
    return o


def top_point(o):
    """Highest actual vertex (world space)."""
    bpy.context.view_layer.update()
    mw = o.matrix_world
    v = max(o.data.vertices, key=lambda v: (mw @ v.co).z)
    return mw @ v.co


# ============================================================================ meadow filler

def grass_carpet(rnd, n=70000):
    """Dense short grass blades (hair curves) carpeting the view wedge, taller further back."""
    cv = bpy.data.hair_curves.new("S3_grass")
    pts, rads = [], []
    k = 0
    while k < n:
        x = rnd.uniform(-2.0, 2.0); y = -0.25 + 4.5 * rnd.random() ** 1.6
        if abs(x) > 0.35 + 0.5 * max(0.0, y):
            continue
        h = rnd.uniform(0.025, 0.07) * (1 + 0.8 * min(1.0, max(0.0, y) / 1.5)) * (0.6 if -0.32 < x < 0.32 and 0.05 < y < 1.25 else 1)
        lean = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0)) * h * rnd.uniform(0.1, 0.45)
        b = Vector((x, y, 0))
        pts += [b, b + lean * 0.15 + Vector((0, 0, h * 0.4)), b + lean * 0.55 + Vector((0, 0, h * 0.78)), b + lean + Vector((0, 0, h))]
        r = rnd.uniform(0.0006, 0.0011)
        rads += [r, r * 0.8, r * 0.5, r * 0.08]
        k += 1
    cv.add_curves([4] * n)
    cv.attributes["position"].data.foreach_set("vector", [c for p in pts for c in p])
    ra = cv.attributes.get("radius") or cv.attributes.new("radius", "FLOAT", "POINT")
    ra.data.foreach_set("value", rads)
    m = bpy.data.materials.new("S3_grassblade"); m.use_nodes = True
    nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    hi = nt.nodes.new("ShaderNodeHairInfo")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    nt.links.new(hi.outputs["Random"], ramp.inputs[0])
    ramp.color_ramp.elements[0].color = (0.10, 0.20, 0.03, 1)
    ramp.color_ramp.elements[1].color = (0.42, 0.40, 0.12, 1)
    e = ramp.color_ramp.elements.new(0.6); e.color = (0.20, 0.33, 0.05, 1)
    nt.links.new(ramp.outputs[0], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.45
    p.inputs["Subsurface Weight"].default_value = 0.0
    tr = nt.nodes.new("ShaderNodeBsdfTranslucent"); nt.links.new(ramp.outputs[0], tr.inputs["Color"])
    mx = nt.nodes.new("ShaderNodeMixShader"); mx.inputs[0].default_value = 0.35
    nt.links.new(p.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    cv.materials.append(m)
    o = bpy.data.objects.new("S3_grass", cv); C.link(o)
    return o


def meadow(rnd, keep_clear):
    """Golden meadow from Poly Haven grass/flower variants: low and sparse in the subject zone,
    dense and tall behind it (backlit bokeh), a few clumps at the frame edges in the foreground."""
    grass = variants("grass_medium_01") + variants("grass_medium_02")
    flowers = variants("celandine_01") + variants("periwinkle_plant")
    col = C.collection("S3_meadow")
    n = 0
    for i in range(1400):
        x = rnd.uniform(-2.2, 2.2); y = rnd.uniform(-0.25, 6.0)
        y = -0.25 + (y + 0.25) ** 1.35 / 6.25 ** 0.35
        if abs(x) > 0.5 + 0.45 * max(0.0, y):
            continue                                       # outside the view wedge
        zone_subject = (-0.32 < x < 0.32) and (0.05 < y < 1.25)
        near = y < 0.05
        if near and abs(x) < 0.16:
            continue
        sc = rnd.uniform(0.45, 0.95)
        if zone_subject:
            if rnd.random() < 0.6:
                continue
            sc = rnd.uniform(0.25, 0.5)
        if any((Vector((x, y)) - Vector(k[:2])).length < k[2] for k in keep_clear):
            continue
        pool = flowers if rnd.random() < 0.07 else grass
        o = instance(pool[rnd.randrange(len(pool))], (x, y, 0), rnd.uniform(0, 6.28), sc, col)
        if y > 1.3:
            o.visible_shadow = False      # far clumps would put the whole set in shade at golden hour
        n += 1
    print("[sh13b] meadow instances", n)


# ============================================================================ creatures

def mat(name, base, rough=0.4, **kw):
    return C.principled(name, base=base, rough=rough, **kw)


def ellipsoid(name, r, segs=(16, 10), m=None):
    b = bmesh.new(); bmesh.ops.create_uvsphere(b, u_segments=segs[0], v_segments=segs[1], radius=1.0)
    for v in b.verts:
        v.co = Vector((v.co.x * r[0], v.co.y * r[1], v.co.z * r[2]))
    for f in b.faces:
        f.smooth = True
    return L.obj_from_bm(name, b, [m] if m else [])


def make_bee(name):
    """Honeybee ~13 mm: striped fuzzy abdomen, thorax with pile, head, smoky wings (motion-blurred)."""
    root = C.empty(name, (0, 0, 0))
    ab_m = bpy.data.materials.new("S3_bee_ab"); ab_m.use_nodes = True
    nt = ab_m.node_tree; p = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    wv = nt.nodes.new("ShaderNodeTexWave"); wv.wave_type = "BANDS"; wv.bands_direction = "X"
    wv.inputs["Scale"].default_value = 2.6; wv.inputs["Distortion"].default_value = 0.6
    nt.links.new(tc.outputs["Generated"], wv.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange"); nt.links.new(wv.outputs["Fac"], mr.inputs["Value"])
    mr.inputs["From Min"].default_value = 0.45; mr.inputs["From Max"].default_value = 0.6
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"
    nt.links.new(mr.outputs[0], mx.inputs[0])
    mx.inputs[6].default_value = (0.025, 0.018, 0.012, 1); mx.inputs[7].default_value = (0.55, 0.32, 0.06, 1)
    nt.links.new(mx.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.35; p.inputs["Coat Weight"].default_value = 0.4
    fur = mat("S3_bee_fur", (0.52, 0.38, 0.18), 0.6, sheen=1.0)
    dark = mat("S3_bee_dark", (0.03, 0.025, 0.02), 0.3, coat=0.5)
    wing = C.principled("S3_bee_wing", base=(0.9, 0.9, 0.92), rough=0.15, transmission=0.9, ior=1.4, thin_film=400)
    ab = ellipsoid(name + "_abdomen", (0.0042, 0.0026, 0.0026), m=ab_m); ab.parent = root; ab.location = (-0.004, 0, -0.0004)
    th = ellipsoid(name + "_thorax", (0.0024, 0.0022, 0.0022), m=fur); th.parent = root; th.location = (0.0012, 0, 0)
    hd = ellipsoid(name + "_head", (0.0013, 0.0019, 0.0017), m=dark); hd.parent = root; hd.location = (0.0042, 0, -0.0002)
    # fuzz on thorax & abdomen
    for o, cnt in ((th, 500), (ab, 500)):
        hairs_on(o, cnt, 0.0005, fur)
    wings = []
    for side in (-1, 1):
        w = wing_mesh(name + f"_wing{side}", 0.0062, 0.0022, wing)
        piv = C.empty(name + f"_wpiv{side}", (0.0012, side * 0.0014, 0.0016)); piv.parent = root
        w.parent = piv; w.rotation_euler = (0, 0, math.radians(-100 * side))
        wings.append(piv)
    # wing beat ~230 Hz is far above 24 fps: drive with a sinusoid keyed every 1/2 frame at an
    # aliasing-free phase so motion blur turns it into a soft blur disc
    for piv in wings:
        side = 1 if piv.name.endswith("1") else -1
        d = piv.driver_add("rotation_euler", 0).driver
        d.type = "SCRIPTED"
        d.expression = f"{side} * 1.1 * sin(frame * 59.7)"
    for leg in range(6):
        b = bmesh.new()
        seg = [(0, 0, 0), (0.0006, 0.0018, -0.0012), (0.0004, 0.0026, -0.0032)]
        bm, fr, ln = L.tube_bm(seg, [0.00016, 0.00012, 0.00008], segs=6)
        lg = L.obj_from_bm(name + f"_leg{leg}", bm, [dark]); lg.parent = root
        side = 1 if leg % 2 else -1
        lg.location = (0.0018 - 0.0012 * (leg // 2), 0, -0.0012)
        lg.scale = (1, side, 1)
    return root


def hairs_on(o, count, length, m):
    rnd = random.Random(hash(o.name) & 0xffff)
    cv = bpy.data.hair_curves.new(o.name + "_fuzz")
    cv.add_curves([2] * count)
    pos = []
    vs = o.data.vertices
    for i in range(count):
        v = vs[rnd.randrange(len(vs))]
        n = v.normal
        d = (n + Vector((rnd.uniform(-.4, .4), rnd.uniform(-.4, .4), rnd.uniform(-.4, .4)))).normalized()
        pos += [v.co, v.co + d * length * rnd.uniform(0.6, 1.2)]
    cv.attributes["position"].data.foreach_set("vector", [c for p in pos for c in p])
    ra = cv.attributes.get("radius") or cv.attributes.new("radius", "FLOAT", "POINT")
    ra.data.foreach_set("value", [0.00003, 0.00001] * count)
    h = bpy.data.objects.new(o.name + "_fuzz", cv); C.link(h); h.parent = o
    cv.materials.append(m)
    return h


def wing_mesh(name, length, width, m, venation=True):
    b = bmesh.new()
    n = 18
    pts = []
    for i in range(n):
        a = i / n * 2 * math.pi
        x = (math.cos(a) * 0.5 + 0.5) * length
        y = math.sin(a) * width * (0.6 + 0.4 * math.cos(a))
        pts.append(b.verts.new((x, y, 0)))
    f = b.faces.new(pts)
    bmesh.ops.triangulate(b, faces=[f])
    o = L.obj_from_bm(name, b, [m])
    return o


def bee_path(ctx, bee, centre):
    """Hovering/drifting near the flower: smooth noise path, body yawing toward the flower."""
    for f in range(ctx.f0 - 4, ctx.f1 + 5, 2):
        t = f / C.FPS
        p = centre + Vector((0.012 * math.sin(t * 1.7) + 0.006 * math.sin(t * 4.1),
                             0.008 * math.sin(t * 1.3 + 1), 0.008 * math.sin(t * 2.3 + 0.5)))
        bee.location = p; bee.keyframe_insert("location", frame=f)
        bee.rotation_euler = (math.radians(4 * math.sin(t * 5)), math.radians(-12), math.radians(200 + 18 * math.sin(t * 1.1)))
        bee.keyframe_insert("rotation_euler", frame=f)


def make_butterfly(name, ctx):
    """Small copper/orange butterfly (~4.5 cm span) with procedural wing pattern, breathing wings."""
    root = C.empty(name, (0, 0, 0))
    wm = bpy.data.materials.new("S3_bfly_wing"); wm.use_nodes = True
    nt = wm.node_tree; p = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    ln = nt.nodes.new("ShaderNodeVectorMath"); ln.operation = "LENGTH"; nt.links.new(tc.outputs["Object"], ln.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange"); nt.links.new(ln.outputs["Value"], mr.inputs["Value"])
    mr.inputs["From Min"].default_value = 0.017; mr.inputs["From Max"].default_value = 0.0195
    vor = nt.nodes.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 260
    nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
    sp = nt.nodes.new("ShaderNodeMapRange"); nt.links.new(vor.outputs["Distance"], sp.inputs["Value"])
    sp.inputs["From Min"].default_value = 0.18; sp.inputs["From Max"].default_value = 0.12
    m1 = nt.nodes.new("ShaderNodeMix"); m1.data_type = "RGBA"
    m1.inputs[6].default_value = (0.72, 0.28, 0.03, 1); m1.inputs[7].default_value = (0.02, 0.015, 0.01, 1)
    nt.links.new(mr.outputs[0], m1.inputs[0])
    m2 = nt.nodes.new("ShaderNodeMix"); m2.data_type = "RGBA"
    nt.links.new(m1.outputs[2], m2.inputs[6]); m2.inputs[7].default_value = (0.03, 0.02, 0.015, 1)
    mm = nt.nodes.new("ShaderNodeMath"); mm.operation = "MULTIPLY"; mm.inputs[1].default_value = 0.7
    nt.links.new(sp.outputs[0], mm.inputs[0]); nt.links.new(mm.outputs[0], m2.inputs[0])
    nt.links.new(m2.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.55; p.inputs["Sheen Weight"].default_value = 0.6
    tr = nt.nodes.new("ShaderNodeBsdfTranslucent"); nt.links.new(m2.outputs[2], tr.inputs["Color"])
    mix = nt.nodes.new("ShaderNodeMixShader"); mix.inputs[0].default_value = 0.3
    nt.links.new(p.outputs[0], mix.inputs[1]); nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    body_m = mat("S3_bfly_body", (0.05, 0.04, 0.03), 0.6, sheen=0.8)
    body = ellipsoid(name + "_body", (0.0095, 0.0013, 0.0013), m=body_m); body.parent = root
    hairs_on(body, 300, 0.0006, body_m)
    for side in (-1, 1):
        piv = C.empty(name + f"_wp{side}", (0, 0, 0.0005)); piv.parent = root
        for k, (L_, W_, off) in enumerate(((0.021, 0.015, 0.003), (0.016, 0.012, -0.006))):
            b = bmesh.new()
            pts = []
            for i in range(24):
                a = i / 24 * math.pi
                r = L_ * (0.75 + 0.25 * math.sin(a * 2 + k)) * (1 + 0.05 * math.sin(a * 9))
                pts.append(b.verts.new((off + math.cos(a) * r * 0.65, side * math.sin(a) * r, 0)))
            pts.append(b.verts.new((off, 0, 0)))
            f = b.faces.new(pts if side > 0 else pts[::-1])
            bmesh.ops.triangulate(b, faces=[f])
            w = L.obj_from_bm(name + f"_w{side}{k}", b, [wm]); w.parent = piv
        for f in range(ctx.f0 - 4, ctx.f1 + 5, 3):
            t = f / C.FPS
            ang = math.radians(55 + 35 * (0.5 + 0.5 * math.sin(t * 2.6)))
            piv.rotation_euler = (side * ang, 0, 0); piv.keyframe_insert("rotation_euler", frame=f)
    return root


def ladybug_on_blade(ctx, base):
    """A grass blade with a seven-spot ladybird crawling up it."""
    blade_m = mat("S3_blade", (0.18, 0.32, 0.06), 0.45)
    pts = [base + Vector((0, 0, 0)), base + Vector((0.004, 0.0, 0.06)), base + Vector((0.016, 0.003, 0.12)),
           base + Vector((0.034, 0.006, 0.155))]
    pp = L.catmull(pts, 20)
    bm, fr, ln = L.tube_bm(pp, [0.0016 * (1 - i / 21) + 0.0002 for i in range(20)], segs=6)
    for v in bm.verts:
        pass
    blade = L.obj_from_bm("S3_lb_blade", bm, [blade_m])
    lb = C.empty("ladybug", (0, 0, 0))
    red = C.principled("S3_lb_red", base=(0.55, 0.02, 0.01), rough=0.12, coat=1.0, coat_rough=0.02)
    # spots via voronoi on elytra
    nt = red.node_tree; p = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord"); vor = nt.nodes.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 2.2
    nt.links.new(tc.outputs["Generated"], vor.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange"); nt.links.new(vor.outputs["Distance"], mr.inputs["Value"])
    mr.inputs["From Min"].default_value = 0.2; mr.inputs["From Max"].default_value = 0.17
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; nt.links.new(mr.outputs[0], mx.inputs[0])
    mx.inputs[6].default_value = (0.55, 0.02, 0.01, 1); mx.inputs[7].default_value = (0.01, 0.01, 0.01, 1)
    nt.links.new(mx.outputs[2], p.inputs["Base Color"])
    shell = ellipsoid("ladybug_shell", (0.0036, 0.0031, 0.0024), m=red); shell.parent = lb; shell.location = (0, 0, 0.0008)
    blk = mat("S3_lb_black", (0.01, 0.01, 0.01), 0.25)
    hd = ellipsoid("ladybug_head", (0.0012, 0.0016, 0.0011), m=blk); hd.parent = lb; hd.location = (0.0029, 0, 0.0004)
    # crawl up the blade during the shot
    for f in range(ctx.f0 - 4, ctx.f1 + 5, 2):
        t = (f - ctx.f0) / (ctx.f1 - ctx.f0)
        k = 0.62 + 0.18 * t
        i = min(18, int(k * 19)); fr_ = k * 19 - i
        p_ = pp[i].lerp(pp[i + 1], fr_)
        tan = (pp[i + 1] - pp[i]).normalized()
        lb.location = p_ + Vector((0, -0.0011, 0))
        lb.rotation_euler = Euler((math.radians(90), 0, 0)).to_matrix().to_euler()
        q = Vector((1, 0, 0)).rotation_difference(tan)
        lb.rotation_mode = "QUATERNION"
        lb.rotation_quaternion = q @ Euler((math.radians(-90), 0, 0)).to_quaternion()
        lb.keyframe_insert("location", frame=f); lb.keyframe_insert("rotation_quaternion", frame=f)
    return lb, pp[-1]


def seed_head(base, rnd, height=0.27):
    """Grass stalk with a nodding panicle of spikelets (golden, backlit)."""
    stem_m = mat("S3_sh_stem", (0.42, 0.40, 0.16), 0.5)
    sp_m = C.principled("S3_spikelet", base=(0.62, 0.50, 0.22), rough=0.5, sss=0.3, sss_radius=(1, 0.8, 0.4), sss_scale=0.001)
    k_ = height / 0.27
    pts = L.catmull([base, base + Vector((0.002, 0.0, 0.12 * k_)), base + Vector((0.01, 0.0, 0.22 * k_)), base + Vector((0.03, 0.0, 0.27 * k_))], 30)
    bm, fr, ln = L.tube_bm(pts, [0.0012 * (1 - 0.6 * i / 29) for i in range(30)], segs=6)
    L.obj_from_bm("S3_seedstalk", bm, [stem_m])
    for i in range(70):
        k = 18 + int(rnd.random() * 11)
        p = pts[k]
        b = bmesh.new(); bmesh.ops.create_uvsphere(b, u_segments=8, v_segments=6, radius=1)
        for v in b.verts:
            v.co = Vector((v.co.x * 0.0008, v.co.y * 0.0008, v.co.z * 0.0032))
        for f_ in b.faces:
            f_.smooth = True
        o = L.obj_from_bm(f"S3_spk{i}", b, [sp_m])
        a = rnd.uniform(0, 6.28)
        o.location = p + Vector((math.cos(a), math.sin(a), 0)) * rnd.uniform(0.002, 0.008)
        o.rotation_euler = (rnd.uniform(-0.8, 0.8), rnd.uniform(0.3, 1.4), a)
    return pts[24]


def make_snail(name, ctx, loc):
    """Garden snail: logarithmic-spiral shell with growth lines, glistening grey body."""
    root = C.empty(name, (0, 0, 0))
    shell_m = bpy.data.materials.new("S3_shell"); shell_m.use_nodes = True
    nt = shell_m.node_tree; p = nt.nodes["Principled BSDF"]
    uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "UVMap"
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(uvn.outputs[0], sep.inputs[0])
    wv = nt.nodes.new("ShaderNodeTexWave"); wv.inputs["Scale"].default_value = 30; wv.inputs["Distortion"].default_value = 3
    nt.links.new(uvn.outputs[0], wv.inputs["Vector"])
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; nt.links.new(wv.outputs["Fac"], mx.inputs[0])
    mx.inputs[6].default_value = (0.32, 0.20, 0.09, 1); mx.inputs[7].default_value = (0.12, 0.07, 0.03, 1)
    nt.links.new(mx.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.3; p.inputs["Coat Weight"].default_value = 0.6
    b = bmesh.new(); uvl = b.loops.layers.uv.new("UVMap")
    nt_, nr = 90, 12
    rows = []
    for i in range(nt_):
        th = i / (nt_ - 1) * 3.2 * 2 * math.pi
        a = 0.0005 * math.exp(0.155 * th)
        tube_r = a * 0.55
        cx, cy, cz = a * math.cos(th), a * math.sin(th), -a * 0.55
        row = []
        for j in range(nr):
            ph = j / nr * 2 * math.pi
            n = Vector((math.cos(th), math.sin(th), 0))
            pt = Vector((cx, cy, cz)) + n * math.cos(ph) * tube_r + Vector((0, 0, 1)) * math.sin(ph) * tube_r
            row.append(b.verts.new(pt))
        rows.append(row)
    for i in range(nt_ - 1):
        for j in range(nr):
            q = (rows[i][j], rows[i][(j + 1) % nr], rows[i + 1][(j + 1) % nr], rows[i + 1][j])
            f = b.faces.new(q)
            for lo, (u, v) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))):
                lo[uvl].uv = (u / nt_, v / nr)
            f.smooth = True
    sh = L.obj_from_bm(name + "_shell", b, [shell_m]); sh.parent = root
    sh.location = (-0.002, 0, 0.0085); sh.rotation_euler = (math.radians(90), 0, math.radians(-10))
    body_m = C.principled("S3_snailbody", base=(0.30, 0.27, 0.23), rough=0.12, sss=0.4, sss_radius=(1, 0.8, 0.6), sss_scale=0.002, coat=0.8)
    pts = [(-0.008, 0, 0.001), (0.0, 0, 0.0016), (0.009, 0, 0.0022), (0.013, 0, 0.0045)]
    pp = L.catmull(pts, 16)
    bm, fr, ln = L.tube_bm(pp, [0.0018 + 0.0012 * math.sin(i / 15 * math.pi) for i in range(16)], segs=12)
    bd = L.obj_from_bm(name + "_body", bm, [body_m]); bd.parent = root
    bd.scale = (1, 1, 0.8)
    for side in (-1, 1):
        tp = L.catmull([(0.013, side * 0.0008, 0.0045), (0.016, side * 0.002, 0.008), (0.018, side * 0.003, 0.0115)], 8)
        bm, fr, ln = L.tube_bm(tp, [0.0004, 0.0003, 0.0003, 0.00025, 0.00025, 0.0002, 0.0002, 0.0004], segs=6)
        tn = L.obj_from_bm(name + f"_tent{side}", bm, [body_m]); tn.parent = root
    root.rotation_euler = (0, 0, 0.6)
    # slow glide forward
    for f in (ctx.f0 - 4, ctx.f1 + 4):
        t = (f - ctx.f0) / C.FPS
        root.location = loc + Vector((math.cos(0.6), math.sin(0.6), 0)) * 0.001 * t
        root.keyframe_insert("location", frame=f)
    return root


def daisy(base, height, rnd):
    """Ox-eye daisy on a slender stalk: white ray florets around a golden disc. Returns the disc top."""
    stem_m = mat("S3_daisy_stem", (0.16, 0.28, 0.06), 0.5)
    ray_m = C.principled("S3_daisy_ray", base=(0.85, 0.83, 0.76), rough=0.5, sss=0.25, sss_radius=(1, 1, 0.9), sss_scale=0.001)
    disc_m = mat("S3_daisy_disc", (0.62, 0.40, 0.04), 0.6)
    top = base + Vector((0.006, 0.0, height))
    pts = L.catmull([base, base + Vector((0.001, 0, height * 0.5)), top - Vector((0, 0, 0.004)), top], 24)
    bm, fr, ln = L.tube_bm(pts, [0.0011 * (1 - 0.4 * i / 23) for i in range(24)], segs=6)
    L.obj_from_bm("S3_daisy_stalk", bm, [stem_m])
    b = bmesh.new(); bmesh.ops.create_uvsphere(b, u_segments=16, v_segments=8, radius=1)
    for v in b.verts:
        v.co = Vector((v.co.x * 0.0055, v.co.y * 0.0055, max(v.co.z, -0.2) * 0.0028))
    for f in b.faces:
        f.smooth = True
    d = L.obj_from_bm("S3_daisy_disc", b, [disc_m]); d.location = top
    for i in range(24):
        a = i / 24 * 2 * math.pi + rnd.uniform(-0.05, 0.05)
        b = bmesh.new()
        n = 8
        vs = []
        for j in range(n + 1):
            u = j / n
            w = 0.0016 * math.sin(math.pi * min(1.0, u * 1.1)) + 0.0002
            r = 0.005 + u * 0.013
            droop = -0.004 * u * u
            c = Vector((math.cos(a) * r, math.sin(a) * r, droop))
            sd = Vector((-math.sin(a), math.cos(a), 0)) * w
            vs.append((b.verts.new(c - sd), b.verts.new(c + sd)))
        for j in range(n):
            b.faces.new((vs[j][0], vs[j][1], vs[j + 1][1], vs[j + 1][0]))
        for f in b.faces:
            f.smooth = True
        o = L.obj_from_bm(f"S3_daisy_ray{i}", b, [ray_m]); o.location = top + Vector((0, 0, 0.0005))
    return top + Vector((0, 0, 0.002))


def pendant_drop(r):
    b = bmesh.new()
    bmesh.ops.create_uvsphere(b, u_segments=24, v_segments=16, radius=r)
    for v in b.verts:
        if v.co.z < 0:
            v.co.z *= 1.25                           # gravity: sags into a pendant
        v.co.z -= r * 0.85
    for f in b.faces:
        f.smooth = True
    return b


C.run("sh13b", build)
