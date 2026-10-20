"""sh03 · 9.64-16.00 · the sofra. Continues sh02's move down onto the table, slides low past the bread
and fruit toward the sunlit window end ("yemek"), arrives macro on the clear glass as water is poured
into it, backlit by the sun ("içmek"), cranes up and swings round over the whole table ("bütün"), and
settles TOP-DOWN with the round fruit bowl at frame centre while the plate with the opened
pomegranate slides gently toward camera ("takdim")."""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from mathutils import Vector, Matrix, Quaternion
import common as C
import lib_s4 as S

TZ = S.TABLE_Z
BOWL = Vector((-0.22, 0.42, TZ))
GLASS = Vector((-0.50, 0.08, TZ))
BREAD = Vector((-0.02, 0.02, TZ))
PLATE0 = Vector((-0.235, 0.185, TZ))
PLATE1 = Vector((-0.22, 0.115, TZ))


def look_quat(eye, target, up):
    d = (Vector(target) - Vector(eye)).normalized()
    up = Vector(up).normalized()
    x = d.cross(up)
    if x.length < 1e-6:
        x = d.orthogonal()
    x.normalize()
    y = x.cross(d).normalized()
    m = Matrix((x, y, -d)).transposed()
    return m.to_quaternion()


def curve(keys, t):
    """Piecewise smootherstep interpolation through (time, value-tuple) keys (ease in/out each segment,
    velocity-continuous enough for a crane/slider operator; segments are chosen to flow)."""
    if t <= keys[0][0]:
        return Vector(keys[0][1])
    for (t0, a), (t1, b) in zip(keys, keys[1:]):
        if t <= t1:
            x = (t - t0) / (t1 - t0)
            return Vector(a).lerp(Vector(b), x)
    return Vector(keys[-1][1])


def catmull(keys, t):
    """Centripetal-free uniform Catmull-Rom through (time, vec) keys, time-reparameterised: smooth
    velocity through the keys (no stop at every key) - like a real operator's continuous move."""
    ts = [k[0] for k in keys]; ps = [Vector(k[1]) for k in keys]
    if t <= ts[0]:
        return ps[0].copy()
    if t >= ts[-1]:
        return ps[-1].copy()
    i = max(j for j in range(len(ts) - 1) if ts[j] <= t)
    p0 = ps[max(i - 1, 0)]; p1 = ps[i]; p2 = ps[i + 1]; p3 = ps[min(i + 2, len(ps) - 1)]
    t0 = ts[max(i - 1, 0)]; t1 = ts[i]; t2 = ts[i + 1]; t3 = ts[min(i + 2, len(ts) - 1)]
    u = (t - t1) / (t2 - t1)
    # tangents scaled by segment durations (non-uniform Catmull-Rom / cardinal)
    m1 = (p2 - p0) / max(1e-6, (t2 - t0)) * (t2 - t1) if i > 0 else Vector((0, 0, 0))
    m2 = (p3 - p1) / max(1e-6, (t3 - t1)) * (t2 - t1) if i + 2 < len(ps) else Vector((0, 0, 0))
    u2, u3 = u * u, u * u * u
    return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2


def build(ctx):
    sc = bpy.context.scene
    rng = random.Random(77)
    S.light_rig(exposure=2.4)
    S.build_room()
    S.build_table()
    t_yemek, t_icmek, t_butun, t_takdim = ctx.word("yemek"), ctx.word("içmek"), ctx.word("bütün"), ctx.word("takdim")

    # ---------------------------------------------------------------- sofra
    bowl = [o for o in C.ph_model("wooden_bowl_01", "2k") if o.type == "MESH"][0]
    bowl.location = (BOWL.x, BOWL.y, TZ - min((bowl.matrix_world @ Vector(c)).z for c in bowl.bound_box))
    bpy.context.view_layer.update()
    fruit = []

    def add_fruit(name, n=1, pick=None):
        objs = [o for o in C.ph_model(name, "1k") if o.type == "MESH"]
        if pick is not None:
            for o in objs[pick:]:
                bpy.data.objects.remove(o)
            objs = objs[:pick]
        for o in objs:
            # centre origin on geometry for the rigid body
            bpy.context.view_layer.update()
            cen = sum((Vector(c) for c in o.bound_box), Vector()) / 8
            o.data.transform(Matrix.Translation(-cen))
            o.location = o.location + o.matrix_world.to_3x3() @ cen
            fruit.append(o)
        return objs
    for _ in range(2):
        add_fruit("food_apple_01")
    add_fruit("food_pomegranate_01")
    add_fruit("food_pears_asian_01", pick=3)
    for _ in range(2):
        add_fruit("food_kiwi_01")
    for _ in range(2):
        add_fruit("food_lime_01")
    for _ in range(2):
        add_fruit("lemon")
    # drop positions: a loose spiral above the bowl, staggered in height
    order = list(range(len(fruit))); rng.shuffle(order)
    for k, i in enumerate(order):
        o = fruit[i]
        a = k * 2.4
        r = 0.035 + 0.05 * ((k * 0.37) % 1.0)
        o.location = (BOWL.x + r * math.cos(a), BOWL.y + r * math.sin(a), TZ + 0.12 + 0.07 * k)
        o.rotation_euler = (rng.uniform(-0.6, 0.6), rng.uniform(-0.6, 0.6), rng.uniform(0, 6.28))
    S.settle_fruit(bowl, fruit, frames=120)

    # loose fruit on the table, in the sun near the window
    lem = [o for o in C.ph_model("lemon", "1k") if o.type == "MESH"][0]
    lem.rotation_euler = (math.radians(88), 0, math.radians(30))
    bpy.context.view_layer.update()
    lem.location = (-0.70, 0.52, 0)
    bpy.context.view_layer.update()
    lem.location.z += TZ - min((lem.matrix_world @ Vector(c)).z for c in lem.bound_box)
    app = [o for o in C.ph_model("food_apple_01", "1k") if o.type == "MESH"][0]
    bpy.context.view_layer.update()
    app.location = (0.10, 0.50, TZ - min((app.matrix_world @ Vector(c)).z for c in app.bound_box))
    app.rotation_euler.z = 1.3

    # bread
    S.build_bread(BREAD, rot=0.6)

    # glass, jug, tea
    glass = S.build_tumbler(GLASS)
    r_in = S.inner_radius(0.05)
    wprof = [(0.0, 0.0)]
    for k in range(12):
        z = 0.0005 + 0.1 * k / 11
        wprof.append((S.inner_radius(0.009 + z) + 0.0003, z))
    wprof += [(S.inner_radius(0.109) - 0.0006, 0.1012), (S.inner_radius(0.109) - 0.0025, 0.1006), (0.0, 0.1004)]
    water = S.lathe("GlassWater", wprof, 96, S.mat_water_s4("GlassWaterMat"))
    water.location = (GLASS.x, GLASS.y, TZ + 0.0092)
    S.build_tea_glass((0.22, 0.46, TZ), fill=0.82)

    # pour timeline
    t_hit = t_icmek - 0.04                    # jet reaches the glass bottom just before the word
    t_end = t_butun - 0.12
    lvl0, lvl1 = 0.0, 0.082                   # water height above the inner bottom
    def level(t):
        x = C.remap(t, t_hit, t_end + 0.15, lambda v: 1 - (1 - min(1.0, max(0.0, v))) ** 1.6)
        return lvl0 + (lvl1 - lvl0) * x
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        t = f / C.FPS
        water.scale = (1, 1, max(0.002, level(t) / 0.1))
        water.keyframe_insert("scale", index=2, frame=f)
    # jug: spout tip at the pivot; pivot tilts / moves
    jug, jw = S.build_glass_jug((0, 0, 0))
    bpy.data.objects.remove(jw)              # no visible body of water in the tilted jug (it stays above frame)
    tip_local = Vector((0.0485 * 1.55 + 0.004, 0.0, 0.2325 + 0.012))
    piv = C.empty("JugPivot", (0, 0, 0))
    jug.parent = piv
    jug.location = -tip_local
    jug.rotation_euler = (0, 0, 0)
    impact = Vector((GLASS.x - 0.006, GLASS.y + 0.004, 0))
    v0 = 0.30
    spout_h = 0.215                           # spout height above the inner bottom of the glass
    fall_t = math.sqrt(2 * spout_h / 9.81)
    spout = Vector((impact.x, impact.y + v0 * fall_t, TZ + 0.009 + spout_h))
    stream, sng = S.build_stream("Stream", spout, v0=(v0, 0, 0), r0=0.0040)
    stream.rotation_euler.z = math.radians(-90)       # pour direction -Y (from frame right to left)
    piv_keys_loc = [(t_hit - 0.75, spout + Vector((0.0, 0.10, 0.20))), (t_hit - 0.28, spout + Vector((0, 0.004, 0.006))),
                    (t_hit - 0.1, spout), (t_end, spout + Vector((0, 0.003, 0.004))),
                    (t_end + 0.35, spout + Vector((0.02, 0.10, 0.12))), (t_end + 1.0, spout + Vector((0.25, 0.45, 0.65)))]
    piv_keys_tilt = [(t_hit - 0.75, 15), (t_hit - 0.3, 48), (t_hit - 0.15, 60), (t_end - 0.1, 66), (t_end + 0.3, 35), (t_end + 1.0, 20)]
    for t, p in piv_keys_loc:
        C.key(piv, "location", t, tuple(p))
    for t, a in piv_keys_tilt:
        piv.rotation_euler = (0, math.radians(a), math.radians(-90))
        piv.keyframe_insert("rotation_euler", frame=t * C.FPS)
    # stream controls
    t_leave = t_hit - math.sqrt(2 * spout_h / 9.81)
    S.key_node_value(sng, "FRONT", [(t_leave - 0.01, 0.0), (t_hit, 1.0)], interp="LINEAR")
    S.key_node_value(sng, "TAIL", [(t_end, 0.0), (t_end + 0.2, 1.0)], interp="LINEAR")
    S.key_node_value(sng, "FLOW", [(t_leave, 0.55), (t_leave + 0.12, 1.0), (t_end - 0.25, 1.0), (t_end, 0.45)])
    hk = []
    for f in range(ctx.f0 - 2, ctx.f1 + 3, 2):
        t = f / C.FPS
        hk.append((t, spout_h - level(t)))
    S.key_node_value(sng, "HEIGHT", hk, interp="LINEAR")
    bub, bng = S.build_bubbles("Bubbles", (impact.x, impact.y, TZ + 0.0092), r_in)
    S.key_node_value(bng, "LEVEL", [(t, level(t)) for t, _ in hk], interp="LINEAR")
    S.key_node_value(bng, "FLOW", [(t_hit - 0.02, 0.0), (t_hit + 0.15, 1.0), (t_end, 1.0), (t_end + 0.8, 0.0)])
    C.empty("TRK_water", (GLASS.x, GLASS.y, TZ + 0.06)).parent = None

    # plate with the opened pomegranate
    ts = C.ph_model("tea_set_01", "1k")
    plate = None
    for o in ts:
        if o.name.startswith("tea_set_01_plate_large_circular_03"):
            plate = o
        elif o.type == "MESH":
            bpy.data.objects.remove(o)
    plate.location = (0, 0, 0)
    pom, arils, zc = S.build_open_pomegranate()
    bpy.context.view_layer.update()
    pz = max((plate.matrix_world @ Vector(c)).z for c in plate.bound_box) - 0.004
    pmin = min((pom.matrix_world @ Vector(c)).z for c in pom.bound_box)
    pom.location = (0.012, -0.008, pz - pmin)
    pom.rotation_euler = (math.radians(8), math.radians(-5), 0.4)
    pom.parent = plate
    plate_root = C.empty("PlateRoot", tuple(PLATE0))
    plate.parent = plate_root
    plate.location = (0, 0, -min((plate.matrix_world @ Vector(c)).z for c in plate.bound_box) + 0.0005)
    C.key(plate_root, "location", t_takdim - 0.55, tuple(PLATE0))
    C.key(plate_root, "location", t_takdim + 0.75, tuple(PLATE1))

    # ---------------------------------------------------------------- camera (keyed every frame)
    cam = C.camera("cam", lens=40, loc=(0.6, -0.2, 1.1), fstop=2.8)
    cam.rotation_mode = "QUATERNION"
    cam.data.dof.focus_object = None
    top = BOWL + Vector((0, 0.005, 1.02))
    P = [(ctx.t0 - 0.30, (0.63, -0.22, 1.10)),
         (t_yemek + 0.15, (0.36, -0.20, 0.96)),
         (t_icmek - 0.55, (-0.04, -0.06, 0.880)),
         (t_icmek - 0.05, (-0.235, 0.020, 0.862)),
         (t_butun - 0.05, (-0.290, 0.040, 0.858)),
         (t_butun + 0.9, (-0.30, 0.02, 1.10)),
         (t_takdim - 0.9, (-0.24, 0.30, 1.62)),
         (t_takdim + 0.6, tuple(top)),
         (ctx.t1 + 0.4, tuple(top + Vector((0, 0, 0.03))))]
    T = [(ctx.t0 - 0.30, (-0.40, 0.30, 0.68)),
         (t_yemek + 0.15, (-0.35, 0.18, 0.78)),
         (t_icmek - 0.55, (-0.50, 0.10, 0.83)),
         (t_icmek - 0.05, (-0.52, 0.085, 0.840)),
         (t_butun - 0.05, (-0.52, 0.083, 0.836)),
         (t_butun + 0.9, (-0.42, 0.25, 0.78)),
         (t_takdim - 0.9, (-0.22, 0.40, TZ)),
         (t_takdim + 0.6, (BOWL.x, BOWL.y + 0.005, TZ)),
         (ctx.t1 + 0.4, (BOWL.x, BOWL.y + 0.005, TZ))]
    U = [(ctx.t0 - 0.30, (0, 0, 1)), (t_butun + 0.3, (0, 0, 1)), (t_takdim - 0.9, (-0.2, 1, 1.2)),
         (t_takdim + 0.4, (0, 1, 0)), (ctx.t1 + 0.4, (0, 1, 0))]
    F = [(ctx.t0 - 0.3, 1.0), (t_yemek + 0.15, 0.62), (t_icmek - 0.55, 0.30), (t_icmek - 0.08, 0.30),
         (t_butun, 0.30), (t_butun + 0.9, 0.55), (t_takdim + 0.6, 1.02)]
    for f in range(ctx.f0 - 3, ctx.f1 + 4):
        t = f / C.FPS
        e = catmull(P, t); g = catmull(T, t); u = curve([(a, b) for a, b in U], t)
        # smooth the up-vector blend
        cam.location = e
        cam.rotation_quaternion = look_quat(e, g, u)
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_quaternion", frame=f)
        cam.data.dof.focus_distance = (g - e).length if t > t_icmek - 0.6 else curve([(a, (b, 0, 0)) for a, b in F], t).x
        cam.data.dof.keyframe_insert("focus_distance", frame=f)
    for fc in C.fcurves(cam):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    C.handheld(cam, amp_loc=0.0008, amp_rot=0.0, speed=0.3, seed=5)
    S.fast_denoise()
    S.comp_sunbeams(ctx, cam, beams=False, bloom=0.05, bloom_threshold=4.0)
    return {"final_spp": 32, "max_bounces": 10, "diffuse_bounces": 2, "glossy_bounces": 2,
            "transmission_bounces": 10, "transparent_bounces": 8, "clamp_indirect": 4.0}


C.run("sh03", build)
