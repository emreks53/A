"""sh11 · 58.00–63.85 · "Ve bütün bu ihtiyaçlar bir şekilde bizim ayağımıza getiriliyor ve karşılanıyor."

The cracked earth + seedling of sh04, now under a dark rain sky.  Backlit rain streaks; on "bütün"
the first heavy drops hit the dust (crowns, dust puffs, dark wet spots).  The camera sinks to
ground level; on "ayağımıza" water runs along a crack TOWARD the camera, reaching the seedling's
base; drops hit its leaves and they bounce.  On "karşılanıyor" the sun breaks through behind, the
wet seedling glistens upright, and the camera tilts up into the bright rain sky.
Tracker: TRK_seedling."""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from mathutils import Vector, Matrix
import common as C
import lib_s3 as L


def look_matrix(pos, fwd, up=Vector((0, 0, 1))):
    f = fwd.normalized(); r = f.cross(up).normalized(); u = r.cross(f).normalized()
    return Matrix.Translation(pos) @ Matrix((r, u, -f)).transposed().to_4x4()


def build(ctx):
    rnd = random.Random(1111)
    t_but = ctx.word("bütün")
    t_ay = ctx.word("ayağımıza")
    t_kar = ctx.word("karşılanıyor")
    hf = L.Heightfield(tile=1.0, disp=0.012)

    # ---------------------------------------------------------------- layout: seedling sits beside a crack
    S = hf.lowest_near(0.0, 0.0, 0.03)                 # crack point nearest the origin
    # look for the crack direction: try several directions, keep the path that stays lowest
    best = None
    for k in range(12):
        a = k / 12 * 2 * math.pi
        d = Vector((math.cos(a), math.sin(a), 0))
        far = S + d * 0.16
        near = S - d * 0.11
        try:
            p1 = hf.crack_path(far.xy, S.xy, margin=0.025)
            p2 = hf.crack_path(S.xy, near.xy, margin=0.025)
        except Exception:
            continue
        pts = p1 + p2[1:]
        score = sum(p.z for p in pts) / len(pts) + 0.002 * (sum((pts[i] - pts[i - 1]).length for i in range(1, len(pts))) / 0.27 - 1)
        if best is None or score < best[0]:
            best = (score, a, pts)
    _, ang, path = best
    fwd_h = Vector((math.cos(ang), math.sin(ang), 0))   # camera looks along +fwd_h (water comes toward it)
    side_h = fwd_h.cross(Vector((0, 0, 1))).normalized()
    # seedling root just beside the crack
    seed_xy = S + side_h * 0.0035
    seed_xy.z = hf.z(seed_xy.x, seed_xy.y) - 0.0006
    print("[sh11] crack angle", math.degrees(ang), "path pts", len(path), "S", S)
    print("[sh11] path", [(round(p.x - S.x, 3), round(p.y - S.y, 3)) for p in path[::12]])

    near_end = path[-1]
    leg = Vector((seed_xy.x - near_end.x, seed_xy.y - near_end.y, 0)).normalized()   # camera looks up the crack
    leg_side = leg.cross(Vector((0, 0, 1))).normalized()

    # ---------------------------------------------------------------- sky: dark rain, sun breaking behind
    sun_az = math.atan2(-fwd_h.y, -fwd_h.x) + math.pi        # behind the seedling (camera looks at it)
    sun_el = math.radians(24)
    sdir = Vector((math.cos(sun_el) * math.cos(sun_az), math.cos(sun_el) * math.sin(sun_az), math.sin(sun_el)))
    sdir = (Vector((fwd_h.x, fwd_h.y, 0)) * math.cos(sun_el) + Vector((0, 0, math.sin(sun_el)))).normalized()
    sdir = (sdir + side_h * 0.12).normalized()
    world_rain(ctx, sdir, t_kar)
    sun = L.sun_from_dir(sdir, 0.0, kelvin_k=4300, angle_deg=1.2)
    for tt, v in ((ctx.t0, 0.0), (t_kar - 0.35, 0.0), (t_kar + 0.25, 4.2), (ctx.t1 + 0.4, 4.6)):
        sun.data.energy = v; sun.data.keyframe_insert("energy", frame=tt * C.FPS)

    # ---------------------------------------------------------------- ground
    em, info = L.mat_cracked_earth(tile=1.0, disp=0.012, tint=(0.80, 0.80, 0.85))   # cool rain light
    hero = []
    for k in range(18):
        tt = t_but - 0.04 + k * 0.17 + rnd.uniform(-0.05, 0.05)
        dist = rnd.uniform(0.03, 0.22); a = ang + math.pi + rnd.uniform(-0.9, 0.9)
        p = seed_xy + Vector((math.cos(a), math.sin(a), 0)) * dist + side_h * rnd.uniform(-0.05, 0.05)
        hero.append((p.x, p.y, tt, rnd.uniform(0.004, 0.009)))
    hero[0] = (seed_xy.x + fwd_h.x * -0.045 + side_h.x * 0.03, seed_xy.y + fwd_h.y * -0.045 + side_h.y * 0.03, t_but - 0.04, 0.0085)
    hero[1] = (seed_xy.x - fwd_h.x * 0.02 - side_h.x * 0.035, seed_xy.y - fwd_h.y * 0.02 - side_h.y * 0.035, t_but + 0.30, 0.007)
    # the ground-level view: many impacts around the plant, in front of and behind it, rate rising
    for k in range(46):
        tt = t_but + 0.8 + (ctx.t1 + 0.2 - t_but - 0.8) * (k / 45) ** 0.85 + rnd.uniform(-0.04, 0.04)
        d = rnd.uniform(-0.30, 0.15)                      # + toward the camera, - behind the plant
        lat = rnd.uniform(-1, 1) * (0.012 + 0.28 * abs(d))
        p = seed_xy - leg * d + leg_side * lat
        hero.append((p.x, p.y, tt, rnd.uniform(0.003, 0.008)))
    # random rain spots (baked with the hero spots): sparse at first, dense later
    rs = []
    for k in range(1600):
        u_ = rnd.random() ** 0.6
        tt = t_but + 0.2 + u_ * (t_ay + 2.2 - t_but - 0.2)
        x_ = seed_xy.x + rnd.uniform(-0.45, 0.45); y_ = seed_xy.y + rnd.uniform(-0.45, 0.45)
        rs.append((x_, y_, tt, rnd.uniform(0.003, 0.009)))
    L.wet_earth_baked(info, hero + rs, (seed_xy.x, seed_xy.y), 0.95, t_ay - 0.6, t_kar + 0.8, ctx.t0 - 0.5, ctx.t1 + 0.5)
    L.ground(mat=em, size=8.0, dicing=2.0)

    # ---------------------------------------------------------------- seedling (same plant as sh04)
    sd = L.seedling(loc=tuple(seed_xy), wilt=0.25, wet=0.0, rot_z=ang + 0.9)
    C.empty("TRK_seedling", tuple(seed_xy + Vector((0, 0, 0.045)))).parent = None
    # leaves: drooping -> lifting upright after the rain
    for i, pv in enumerate(sd["leaf_pivots"]):
        y0 = pv.rotation_euler[1]
        for tt, dy in ((ctx.t0, 0.0), (t_ay + 0.2, 0.0), (t_kar + 0.6, -math.radians(16)), (ctx.t1 + 0.5, -math.radians(19))):
            pv.rotation_euler[1] = y0 + dy
            pv.keyframe_insert("rotation_euler", index=1, frame=tt * C.FPS)
    # drop hits on the leaves -> bounce + beads
    water = C.mat_water("S3_water")
    hits = [(0, t_ay + 0.18, 9), (1, t_ay + 0.62, 7), (0, t_ay + 1.15, 6), (1, t_kar - 0.25, 8), (0, t_kar + 0.35, 5)]
    bpy.context.view_layer.update()
    bps = [bpy.data.objects[f"{sd['root'].name}_bladepivot{i}"] for i in range(2)]
    for li, tt, amp in hits:
        L.bounce(bps[li], tt, amp, freq=6.0, decay=4.0, axis=1, dur=1.0)
        hero_drop_fall(sd['tips'][li].matrix_world.translation.lerp(bps[li].matrix_world.translation, 0.5), tt, water, rnd)   # visual falling drop
    leaf_beads(sd, water, [h[1] for h in hits], rnd)
    stem_beads(sd, water, t_ay + 0.4, rnd)

    # ---------------------------------------------------------------- water along the crack
    riv_m = rivulet_material(t_ay - 0.4, t_ay + 0.75, t_kar)
    riv, rlen = L.rivulet("S3_rivulet", path, hf, mat=riv_m)
    ripples(path, hf, water, rnd, t_ay - 0.4, t_ay + 0.75, t_kar, ctx.t1)

    # ---------------------------------------------------------------- impacts: drops, crowns, dust
    dust_m = mat_dust()
    drop_tpl = L.template_drop("S3_drop_tpl", stretch=1.08, mat=water)
    grain_tpl = L.template_grain("S3_grain_tpl", mat=dust_m)
    impacts(hero, hf, water, dust_m, drop_tpl, grain_tpl, rnd, t_soak=t_ay)

    # ---------------------------------------------------------------- rain
    rain(ctx, fwd_h, side_h, seed_xy, water, rnd)
    for k, dd in enumerate((1.2, 4.5)):
        rain_card(ctx, seed_xy + fwd_h * dd, fwd_h, width=0.6 + dd * 1.4, height=0.3 + dd * 0.9, seed=k,
                  density=0.55 + 0.1 * k, t_kar=t_kar)

    # ---------------------------------------------------------------- camera
    T = seed_xy + Vector((0, 0, 0.03))
    near_end = path[-1]
    leg = Vector((seed_xy.x - near_end.x, seed_xy.y - near_end.y, 0)).normalized()   # camera looks up the crack
    cam = C.camera("cam", lens=40, loc=(0, 0, 1), fstop=4.0)
    focus = C.empty("cam_focus", tuple(T)); cam.data.dof.focus_object = focus
    prev = None
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        t = f / C.FPS
        s = C.remap(t, t_but + 0.4, t_ay - 0.1, C.smoother)            # descend to ground level
        dist = C.lerp(0.36, 0.19, s) - 0.02 * C.remap(t, t_ay, ctx.t1, C.smooth)
        hgt = C.lerp(0.13, 0.05, s)
        lat = C.lerp(0.05, 0.004, s)
        look_h = fwd_h.lerp(leg, s).normalized()
        pos = T - look_h * dist + side_h * lat
        pos.z = seed_xy.z + hgt
        aim = (T - Vector((0, 0, 0.004)) - pos).normalized()
        u = C.remap(t, t_kar + 0.45, ctx.t1 + 0.25, C.smoother)         # exit: tilt up into the sky
        up_aim = (look_h * math.cos(math.radians(30)) + Vector((0, 0, math.sin(math.radians(30))))).normalized()
        fwd = aim.lerp(up_aim, u).normalized()
        M = look_matrix(pos, fwd)
        cam.matrix_world = M
        e = cam.rotation_euler.copy()
        if prev is not None:
            e.make_compatible(prev)
        cam.rotation_euler = e; prev = e.copy()
        cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_euler", frame=f)
        focus.location = T
        focus.keyframe_insert("location", frame=f)
    C.handheld(cam, amp_loc=0.0005, amp_rot=0.0012, speed=0.5)
    vs = bpy.context.scene.view_settings
    for tt, ev in ((ctx.t0, 0.25), (t_kar - 0.3, 0.25), (t_kar + 0.5, -0.45), (ctx.t1 + 0.5, -0.55)):
        vs.exposure = ev; vs.keyframe_insert("exposure", frame=tt * C.FPS)   # the operator stops down as the sun breaks
    L.render_tuning(os.environ.get("S3_DQ", "BALANCED"))
    return L.experiment({"final_spp": 12, "final_threshold": 0.05, "preview_spp": 32, "clamp_indirect": 4.0,
                         "transmission_bounces": 6})


def world_rain(ctx, sdir, t_kar):
    path = C.ph_hdri("overcast_soil", "4k")
    w = bpy.context.scene.world; nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    env = nt.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(path, check_existing=True)
    nt.links.new(tc.outputs["Generated"], env.inputs[0])
    hs = nt.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = 0.55
    hs.inputs["Value"].default_value = 1.0
    nt.links.new(env.outputs[0], hs.inputs["Color"])
    # sun glow: brightness gap in the cloud deck around the sun direction
    dot = nt.nodes.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"
    nt.links.new(tc.outputs["Generated"], dot.inputs[0]); dot.inputs[1].default_value = tuple(sdir)
    def mth(op, a, b):
        n = nt.nodes.new("ShaderNodeMath"); n.operation = op
        for i, v in enumerate((a, b)):
            if isinstance(v, bpy.types.NodeSocket): nt.links.new(v, n.inputs[i])
            else: n.inputs[i].default_value = v
        return n.outputs[0]
    cosg = dot.outputs["Value"]
    glow_wide = mth("POWER", mth("MAXIMUM", cosg, 0.0), 6.0)
    glow_tight = mth("POWER", mth("MAXIMUM", cosg, 0.0), 300.0)
    disc = mth("GREATER_THAN", cosg, math.cos(math.radians(0.6)))
    brk = nt.nodes.new("ShaderNodeValue"); brk.name = "BREAK"
    for tt, v in ((ctx.t0, 0.0), (t_kar - 0.4, 0.0), (t_kar + 0.3, 1.0), (ctx.t1 + 0.5, 1.15)):
        brk.outputs[0].default_value = v; brk.outputs[0].keyframe_insert("default_value", frame=tt * C.FPS)
    g = mth("ADD", mth("MULTIPLY", glow_wide, 0.7), mth("MULTIPLY", glow_tight, 6.0))
    g_cam = mth("ADD", g, mth("MULTIPLY", disc, 400.0))
    lp = nt.nodes.new("ShaderNodeLightPath")
    g_all = mth("ADD", g, mth("MULTIPLY", mth("MULTIPLY", disc, 400.0), lp.outputs["Is Camera Ray"]))
    g_all = mth("MULTIPLY", g_all, brk.outputs[0])
    # rain darkness: whole sky dims, brightens a little with the break
    dim = mth("ADD", 0.16, mth("MULTIPLY", brk.outputs[0], 0.16))
    mixc = nt.nodes.new("ShaderNodeMix"); mixc.data_type = "RGBA"; mixc.blend_type = "MULTIPLY"
    mixc.inputs[0].default_value = 1.0
    nt.links.new(hs.outputs[0], mixc.inputs[6])
    cc = nt.nodes.new("ShaderNodeCombineColor")
    nt.links.new(dim, cc.inputs[0]); nt.links.new(dim, cc.inputs[1]); nt.links.new(mth("MULTIPLY", dim, 1.06), cc.inputs[2])
    nt.links.new(cc.outputs[0], mixc.inputs[7])
    warm = nt.nodes.new("ShaderNodeCombineColor")
    nt.links.new(mth("MULTIPLY", g_all, 1.0), warm.inputs[0]); nt.links.new(mth("MULTIPLY", g_all, 0.92), warm.inputs[1])
    nt.links.new(mth("MULTIPLY", g_all, 0.78), warm.inputs[2])
    add = nt.nodes.new("ShaderNodeMix"); add.data_type = "RGBA"; add.blend_type = "ADD"; add.inputs[0].default_value = 1.0
    nt.links.new(mixc.outputs[2], add.inputs[6]); nt.links.new(warm.outputs[0], add.inputs[7])
    bg = nt.nodes.new("ShaderNodeBackground"); bg.inputs[1].default_value = 1.0
    nt.links.new(add.outputs[2], bg.inputs[0]); nt.links.new(bg.outputs[0], out.inputs[0])


def rivulet_material(t_start, t_seed, t_end):
    """Water strip revealed from its far end (u=0) toward the camera (u=1)."""
    m = C.mat_water("S3_rivulet")
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (0.36, 0.28, 0.20, 1)
    p.inputs["Transmission Weight"].default_value = 0.65
    p.inputs["Roughness"].default_value = 0.04
    outn = nt.nodes["Material Output"]
    uv = nt.nodes.new("ShaderNodeUVMap"); uv.uv_map = "UVMap"
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(uv.outputs[0], sep.inputs[0])
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 30
    nt.links.new(uv.outputs[0], nz.inputs["Vector"])
    front = nt.nodes.new("ShaderNodeValue"); front.name = "FRONT"
    for tt, v in ((t_start - 0.5, -0.05), (t_start, 0.0), (t_seed, 0.6), (t_end, 1.03)):
        front.outputs[0].default_value = v; front.outputs[0].keyframe_insert("default_value", frame=tt * C.FPS)
    a = nt.nodes.new("ShaderNodeMath"); a.operation = "SUBTRACT"
    nt.links.new(front.outputs[0], a.inputs[0])
    b = nt.nodes.new("ShaderNodeMath"); b.operation = "MULTIPLY_ADD"
    nt.links.new(nz.outputs[0], b.inputs[0]); b.inputs[1].default_value = 0.02
    nt.links.new(sep.outputs["X"], b.inputs[2])
    nt.links.new(b.outputs[0], a.inputs[1])
    mr = nt.nodes.new("ShaderNodeMapRange"); nt.links.new(a.outputs[0], mr.inputs["Value"])
    mr.inputs["From Min"].default_value = 0.0; mr.inputs["From Max"].default_value = 0.008
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(mr.outputs[0], mx.inputs[0])
    nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(p.outputs[0], mx.inputs[2])
    # surface ripples
    rn = nt.nodes.new("ShaderNodeTexNoise"); rn.inputs["Scale"].default_value = 1500; rn.noise_dimensions = "4D"
    geo = nt.nodes.new("ShaderNodeTexCoord"); nt.links.new(geo.outputs["Object"], rn.inputs["Vector"])
    rn.inputs["W"].default_value = 0.0; rn.inputs["W"].keyframe_insert("default_value", frame=t_start * C.FPS - 24)
    rn.inputs["W"].default_value = 30.0; rn.inputs["W"].keyframe_insert("default_value", frame=t_end * C.FPS + 48)
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.25; bp.inputs["Distance"].default_value = 0.0002
    nt.links.new(rn.outputs[0], bp.inputs["Height"]); nt.links.new(bp.outputs[0], p.inputs["Normal"])
    nt.links.new(mx.outputs[0], outn.inputs["Surface"])
    return m


def ripples(path, hf, water, rnd, t_start, t_seed, t_end, t_last):
    """Rain rings on the running water: thin expanding water ridges once the front has passed."""
    import bmesh
    def arrival(u):
        if u <= 0.6:
            return t_start + (t_seed - t_start) * u / 0.6
        return t_seed + (t_end - t_seed) * (u - 0.6) / 0.43
    n = len(path)
    for k in range(22):
        u = rnd.uniform(0.25, 0.98)
        p = path[int(u * (n - 1))]
        t0 = arrival(u) + rnd.uniform(0.08, 1.4)
        if t0 > t_last:
            continue
        b = bmesh.new()
        bmesh.ops.create_circle(b, cap_ends=False, segments=28, radius=1.0)
        o = L.obj_from_bm(f"S3_ring{k}", b, [water])
        sk = o.modifiers.new("Skin", "SKIN")
        for v in o.data.skin_vertices[0].data:
            v.radius = (0.03, 0.03)
        C.subsurf(o, 1, 1)
        o.location = (p.x, p.y, hf.z(p.x, p.y) + 0.0011)
        o.scale = (0, 0, 0); o.keyframe_insert("scale", frame=t0 * C.FPS - 1)
        for dt, r, h in ((0.0, 0.0006, 0.4), (0.12, 0.0022, 0.3), (0.3, 0.0040, 0.15), (0.45, 0.0048, 0.0)):
            o.scale = (r, r, r * h); o.keyframe_insert("scale", frame=(t0 + dt) * C.FPS)


def mat_dust():
    m = C.principled("S3_dust", base=(0.55, 0.42, 0.30), rough=0.95)
    return m


def hero_drop_fall(target, t_hit, mat, rnd, r=0.0021):
    b = L.drop_bm(r, 1.25)
    o = L.obj_from_bm(f"S3_herodrop_{t_hit:.2f}", b, [mat])
    v = 7.5
    start = target + Vector((rnd.uniform(-0.02, 0.02), 0.0, v * 0.5))
    for tt, p, sc in ((t_hit - 0.5, start, 1.0), (t_hit, target, 1.0)):
        o.location = p; o.keyframe_insert("location", frame=tt * C.FPS)
    for fc in C.fcurves(o):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    o.scale = (1, 1, 1); o.keyframe_insert("scale", frame=t_hit * C.FPS - 0.01)
    o.scale = (0, 0, 0); o.keyframe_insert("scale", frame=t_hit * C.FPS + 0.5)
    for fc in C.fcurves(o):
        if fc.data_path == "scale":
            for kp in fc.keyframe_points:
                kp.interpolation = "CONSTANT"
    o.scale = (0, 0, 0); o.keyframe_insert("scale", frame=t_hit * C.FPS - 13)
    return o


def leaf_beads(sd, mat, times, rnd):
    """Water beads sitting on the leaf blades (bean leaves are slightly hydrophobic)."""
    for li, leaf in enumerate(sd["leaves"]):
        vs = [v for v in leaf.data.vertices]
        for j in range(16):
            v = vs[rnd.randrange(len(vs))]
            r = rnd.uniform(0.0004, 0.0013)
            b = L.drop_bm(r, 0.8)
            o = L.obj_from_bm(f"S3_bead{li}_{j}", b, [mat])
            o.parent = leaf; o.location = v.co + Vector((0, 0, r * 0.05))
            tt = times[min(len(times) - 1, j % len(times))] + rnd.uniform(0.0, 0.08)
            o.scale = (0, 0, 0); o.keyframe_insert("scale", frame=tt * C.FPS - 1)
            o.scale = (1, 1, 1); o.keyframe_insert("scale", frame=tt * C.FPS + 1)


def stem_beads(sd, mat, t, rnd):
    hyp = bpy.data.objects[sd["root"].name + "_hypocotyl"]
    vs = list(hyp.data.vertices)
    for j in range(7):
        v = vs[rnd.randrange(len(vs))]
        r = rnd.uniform(0.0004, 0.0009)
        b = L.drop_bm(r, 1.1)
        o = L.obj_from_bm(f"S3_stembead{j}", b, [mat]); o.parent = hyp
        o.location = v.co + v.normal * r * 0.5
        tt = t + j * 0.18
        o.scale = (0, 0, 0); o.keyframe_insert("scale", frame=tt * C.FPS - 2)
        o.scale = (1, 1, 1); o.keyframe_insert("scale", frame=tt * C.FPS + 3)


def impacts(hero, hf, water, dust_m, drop_tpl, grain_tpl, rnd, t_soak):
    """Falling hero drops, splash droplets (crowns) and dust puffs at each hero impact."""
    sp_p, sp_v, sp_t, sp_s, sp_zg = [], [], [], [], []
    du_p, du_v, du_t, du_s, du_zg = [], [], [], [], []
    for k, (x, y, tt, rmax) in enumerate(hero):
        z = hf.z(x, y) + 0.0004
        hit = Vector((x, y, z))
        hero_drop_fall(hit, tt, water, rnd, r=rnd.uniform(0.0018, 0.0026))
        dry = max(0.0, min(1.0, (t_soak + 0.5 - tt) / 1.5))
        for j in range(14):
            a = j / 14 * 2 * math.pi + rnd.uniform(-0.2, 0.2)
            sp = rnd.uniform(0.35, 0.9)
            v = Vector((math.cos(a) * sp, math.sin(a) * sp, rnd.uniform(0.7, 1.6)))
            sp_p.append(hit + Vector((math.cos(a), math.sin(a), 0)) * 0.002); sp_v.append(v)
            sp_t.append(tt); sp_s.append(rnd.uniform(0.00025, 0.0006)); sp_zg.append(z - 0.0004)
        n_d = int(40 * dry)
        for j in range(n_d):
            a = rnd.uniform(0, 2 * math.pi)
            sp = rnd.uniform(0.05, 0.45)
            v = Vector((math.cos(a) * sp, math.sin(a) * sp, rnd.uniform(0.05, 0.5)))
            du_p.append(hit + Vector((math.cos(a), math.sin(a), 0)) * 0.003); du_v.append(v)
            du_t.append(tt + rnd.uniform(0, 0.03)); du_s.append(rnd.uniform(0.00008, 0.0002)); du_zg.append(z - 0.0006)
        crown(hit, tt, water)
    L.particles("S3_splash", sp_p, sp_v, sp_t, sp_s, drop_tpl, mat=water, drag=1.0, gravity=9.81,
                ground_z=None, zg=sp_zg, life=0.6, as_points=True)
    if du_p:
        L.particles("S3_dustpuff", du_p, du_v, du_t, du_s, grain_tpl, mat=dust_m, drag=9.0, gravity=1.2,
                    ground_z=None, zg=du_zg, life=1.2, as_points=True)


def crown(p, tt, mat):
    """Short-lived crown sheet: thin open cone that expands and collapses in ~0.1 s."""
    import bmesh
    b = bmesh.new()
    segs = 24
    rings = []
    for k, (r, z) in enumerate(((1.0, 0.0), (1.25, 0.6), (1.5, 1.0))):
        ring = []
        for i in range(segs):
            a = i / segs * 2 * math.pi
            zz = z * (1 + (0.25 * math.sin(i * 2.3) if k == 2 else 0))
            ring.append(b.verts.new((math.cos(a) * r, math.sin(a) * r, zz)))
        rings.append(ring)
    for k in range(2):
        for i in range(segs):
            b.faces.new((rings[k][i], rings[k][(i + 1) % segs], rings[k + 1][(i + 1) % segs], rings[k + 1][i]))
    for f in b.faces:
        f.smooth = True
    o = L.obj_from_bm(f"S3_crown_{tt:.2f}", b, [mat])
    o.location = p
    seq = ((tt - 0.01, (0, 0, 0)), (tt, (0.0015, 0.0015, 0.0012)), (tt + 0.04, (0.0034, 0.0034, 0.0032)),
           (tt + 0.08, (0.0042, 0.0042, 0.0022)), (tt + 0.1, (0, 0, 0)))
    o.scale = (0, 0, 0); o.keyframe_insert("scale", frame=(tt - 0.5) * C.FPS)
    for t_, s in seq:
        o.scale = s; o.keyframe_insert("scale", frame=t_ * C.FPS)


def rain_material(ctx):
    """Rain drops: water + a faint sheen term standing in for the sky glints a real drop catches over its
    whole fall (keeps streaks readable after the 180-degree shutter smears them)."""
    t_kar = ctx.word("karşılanıyor")
    m = C.mat_water("S3_rainwater")
    nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    for tt, col in ((t_kar - 0.4, (0.8, 0.84, 0.9, 1)), (t_kar + 0.4, (1.0, 0.78, 0.45, 1))):
        p.inputs["Emission Color"].default_value = col
        p.inputs["Emission Color"].keyframe_insert("default_value", frame=tt * C.FPS)
    for tt, val in ((ctx.t0, 0.9), (t_kar - 0.4, 1.0), (t_kar + 0.4, 2.6), (ctx.t1 + 0.5, 2.8)):
        p.inputs["Emission Strength"].default_value = val
        p.inputs["Emission Strength"].keyframe_insert("default_value", frame=tt * C.FPS)
    return m


def rain_card(ctx, centre, fwd_h, width, height, seed, density, t_kar):
    """Far-field rain: a vertical card of procedural, vertically stretched streaks scrolling down at
    terminal velocity (the curtain of distant drops a real long lens sees). Brightens when backlit."""
    bpy.ops.mesh.primitive_plane_add(size=1)
    o = bpy.context.object; o.name = f"S3_raincard{seed}"
    o.scale = (width, height, 1)
    o.location = centre + Vector((0, 0, height / 2 - 0.01))
    o.rotation_euler = (math.radians(90), 0, math.atan2(fwd_h.y, fwd_h.x) - math.radians(90))
    for a in ("visible_shadow", "visible_diffuse", "visible_glossy", "visible_transmission"):
        setattr(o, a, False)
    m = bpy.data.materials.new(o.name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    # object coords: x across (-0.5..0.5 * width), y up (plane rotated); stretch 1:90
    sx = 260.0 * width / max(0.5, (centre - centre).length + 1)
    mp.inputs["Scale"].default_value = (width * 700 / (1 + seed * 0.6), height * 6.0, 1.0)
    v = 7.0
    for tt in (ctx.t0 - 1, ctx.t1 + 1):
        mp.inputs["Location"].default_value = (seed * 3.1, (tt - ctx.t0) * v * 6.0, 0)
        mp.inputs["Location"].keyframe_insert("default_value", frame=tt * C.FPS)
    for fc in C._fcurves(nt.animation_data.action):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.0
    nz.inputs["Detail"].default_value = 0.0
    nt.links.new(mp.outputs[0], nz.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    nt.links.new(nz.outputs[0], mr.inputs["Value"])
    mr.inputs["From Min"].default_value = 0.58 - 0.03 * density; mr.inputs["From Max"].default_value = 0.68
    # fade at top/bottom edges of the card
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    edge = nt.nodes.new("ShaderNodeMapRange"); nt.links.new(sep.outputs["Y"], edge.inputs["Value"])
    edge.inputs["From Min"].default_value = 1.0; edge.inputs["From Max"].default_value = 0.8
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
    nt.links.new(mr.outputs[0], mul.inputs[0]); nt.links.new(edge.outputs[0], mul.inputs[1])
    op = nt.nodes.new("ShaderNodeMath"); op.operation = "MULTIPLY"
    nt.links.new(mul.outputs[0], op.inputs[0])
    for tt, val in ((ctx.t0, 0.22), (t_kar - 0.4, 0.3), (t_kar + 0.4, 0.55), (ctx.t1 + 0.5, 0.6)):
        op.inputs[1].default_value = val; op.inputs[1].keyframe_insert("default_value", frame=tt * C.FPS)
    em = nt.nodes.new("ShaderNodeEmission")
    for tt, col in ((t_kar - 0.4, (0.85, 0.88, 0.92, 1)), (t_kar + 0.4, (1.0, 0.80, 0.50, 1))):
        em.inputs["Color"].default_value = col; em.inputs["Color"].keyframe_insert("default_value", frame=tt * C.FPS)
    em.inputs["Strength"].default_value = 1.0
    for tt, val in ((ctx.t0, 0.35), (t_kar - 0.4, 0.4), (t_kar + 0.4, 1.6), (ctx.t1 + 0.5, 1.8)):
        em.inputs["Strength"].default_value = val; em.inputs["Strength"].keyframe_insert("default_value", frame=tt * C.FPS)
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    ad = nt.nodes.new("ShaderNodeAddShader")
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(op.outputs[0], mx.inputs[0]); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs["Surface"])
    o.data.materials.append(m)
    return o


def rain(ctx, fwd_h, side_h, centre, water, rnd):
    """Rain at terminal velocity: each drop is born 2.2 m up at its own time t0 and falls through the
    wedge in front of the camera (constant topology -> real motion-blur streaks)."""
    tpl = L.template_drop("S3_rain_tpl", stretch=1.0, mat=rain_material(ctx), segs=(6, 4))
    p0, vel, t0, size = [], [], [], []
    v = 7.0
    wind = side_h * 0.5
    z_top = 2.2
    t_a, t_b = ctx.t0 - 0.6, ctx.t1 + 0.4
    t_full = ctx.word("bütün") + 0.6
    n = 34000
    for i in range(n):
        tb = rnd.uniform(t_a, t_b)
        # intensity: light at first, heavy from just after "bütün"
        dens = 0.3 + 0.7 * C.smooth((tb + z_top / v - (t_full - 1.0)) / 1.6)
        if rnd.random() > dens:
            continue
        fd = 3.0 * rnd.random() ** 1.8
        lat = rnd.uniform(-1, 1) * (0.06 + 0.5 * fd)
        p = centre + fwd_h * (fd - 0.22) + side_h * lat - wind * (z_top / v)
        p.z = z_top
        p0.append(p); vel.append(Vector((wind.x, wind.y, -v))); t0.append(tb)
        size.append(rnd.uniform(0.0009, 0.0022))
    print("[sh11] rain drops", len(p0))
    o = L.particles("S3_rain", p0, vel, t0, size, tpl, mat=tpl.data.materials[0], drag=0.0, gravity=0.0, ground_z=-0.002, life=1.0,
                    as_points=True)
    # rain only needs to be seen (directly and through refraction): skip shadow/diffuse/glossy rays
    o.visible_shadow = False; o.visible_diffuse = False; o.visible_glossy = False


C.run("sh11", build)
