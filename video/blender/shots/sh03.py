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
BOWL = Vector((*S.SOFRA["bowl"], TZ))
GLASS = Vector((*S.SOFRA["glass"], TZ))


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
    S.light_rig(exposure=1.7)
    S.build_room()
    S.build_table()
    t_yemek, t_icmek, t_butun, t_takdim = ctx.word("yemek"), ctx.word("içmek"), ctx.word("bütün"), ctx.word("takdim")
    so = S.build_sofra()
    water = so["water"]
    r_in = S.inner_radius(0.05)

    # ---------------------------------------------------------------- the pour
    t_hit = t_icmek - 0.04                    # jet reaches the glass bottom just before the word
    t_end = t_butun - 0.12
    lvl1 = 0.082                              # final water height above the inner bottom

    def level(t):
        x = C.remap(t, t_hit, t_end + 0.15, lambda v: 1 - (1 - min(1.0, max(0.0, v))) ** 1.6)
        return lvl1 * x
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        water.scale = (1, 1, max(0.002, level(f / C.FPS) / 0.1))
        water.keyframe_insert("scale", index=2, frame=f)
    jug, jw = S.build_glass_jug((0, 0, 0))
    bpy.data.objects.remove(jw)              # the jug body stays above frame while pouring
    tip_local = Vector((0.0485 * 1.55 + 0.004, 0.0, 0.2325 + 0.012))
    piv = C.empty("JugPivot", (0, 0, 0))
    jug.parent = piv
    jug.location = -tip_local
    impact = Vector((GLASS.x + 0.004, GLASS.y + 0.003, 0))
    v0 = 0.30
    spout_h = 0.215                           # spout height above the inner bottom of the glass
    fall_t = math.sqrt(2 * spout_h / 9.81)
    spout = Vector((impact.x + v0 * fall_t, impact.y, TZ + 0.009 + spout_h))
    stream, sng = S.build_stream("Stream", spout, v0=(v0, 0, 0), r0=0.0036)
    stream.rotation_euler.z = math.radians(180)       # pours toward -X (enters from frame right)
    for t, off in [(t_hit - 1.3, (0.25, 0.10, 0.60)), (t_hit - 0.5, (0.10, 0.0, 0.45)), (t_hit - 0.25, (0.02, 0.0, 0.03)), (t_hit - 0.10, (0, 0, 0)),
                   (t_end, (0.003, 0, 0.004)), (t_end + 0.4, (0.10, 0.05, 0.15)), (t_end + 1.0, (0.45, 0.30, 0.70))]:
        C.key(piv, "location", t, tuple(spout + Vector(off)))
    for t, a in [(t_hit - 1.3, 10), (t_hit - 0.5, 25), (t_hit - 0.25, 50), (t_hit - 0.12, 60), (t_end - 0.1, 67), (t_end + 0.4, 30), (t_end + 1.0, 15)]:
        piv.rotation_euler = (0, math.radians(a), math.radians(180))
        piv.keyframe_insert("rotation_euler", frame=t * C.FPS)
    t_leave = t_hit - fall_t
    S.key_node_value(sng, "FRONT", [(t_leave - 0.01, 0.0), (t_hit, 1.0)], interp="LINEAR")
    S.key_node_value(sng, "TAIL", [(t_end, 0.0), (t_end + 0.2, 1.0)], interp="LINEAR")
    S.key_node_value(sng, "FLOW", [(t_leave, 0.55), (t_leave + 0.12, 1.0), (t_end - 0.25, 1.0), (t_end, 0.45)])
    hk = [(f / C.FPS, spout_h - level(f / C.FPS)) for f in range(ctx.f0 - 2, ctx.f1 + 3, 2)]
    S.key_node_value(sng, "HEIGHT", hk, interp="LINEAR")
    bub, bng = S.build_bubbles("Bubbles", (impact.x, impact.y, TZ + 0.0092), r_in)
    S.key_node_value(bng, "LEVEL", [(t, level(t)) for t, _ in hk], interp="LINEAR")
    S.key_node_value(bng, "FLOW", [(t_hit - 0.02, 0.0), (t_hit + 0.15, 1.0), (t_end, 1.0), (t_end + 0.8, 0.0)])
    C.empty("TRK_water", (GLASS.x, GLASS.y, TZ + 0.06))
    # the water body's material lives on the glass-water lathe (GlassWaterMat): impact rings while pouring
    wm = water.data.materials[0]
    S.add_water_ripples(wm, (impact.x - GLASS.x, impact.y - GLASS.y, 0.1), ctx.t0, ctx.t1,
                        [(t_hit, 0.0), (t_hit + 0.1, 1.0), (t_end, 1.0), (t_end + 0.9, 0.15), (ctx.t1, 0.05)])

    # ---------------------------------------------------------------- takdim: the plate is offered
    pr = so["plate_root"]
    C.key(pr, "location", t_takdim - 0.5, (*S.SOFRA["plate0"], TZ))
    C.key(pr, "location", t_takdim + 0.85, (*S.SOFRA["plate1"], TZ))

    # ---------------------------------------------------------------- camera (keyed every frame)
    cam = C.camera("cam", lens=35, loc=(0.6, -0.2, 1.1), fstop=4.0)
    cam.rotation_mode = "QUATERNION"
    cam.data.dof.focus_object = None
    top = BOWL + Vector((0, 0.005, 0.86))
    G = Vector((GLASS.x, GLASS.y, TZ + 0.075))
    P = [(ctx.t0 - 0.30, (0.63, -0.22, 1.10)),
         (t_yemek + 0.10, (0.30, -0.32, 0.90)),
         (t_icmek - 0.45, (-0.15, -0.30, 0.875)),
         (t_icmek - 0.05, (-0.505, -0.255, 0.862)),
         (t_icmek + 0.70, (-0.511, -0.244, 0.860)),
         (t_butun - 0.05, (-0.518, -0.232, 0.858)),
         (t_butun + 1.0, (-0.40, -0.30, 1.22)),
         (t_butun + 2.1, (-0.33, -0.12, 1.46)),
         (t_takdim + 0.75, tuple(top)),
         (ctx.t1 + 0.4, tuple(top - Vector((0, 0, 0.035))))]
    T = [(ctx.t0 - 0.30, (-0.40, 0.30, 0.68)),
         (t_yemek + 0.10, (0.00, 0.15, 0.80)),
         (t_icmek - 0.45, (-0.30, 0.15, 0.80)),
         (t_icmek - 0.05, tuple(G)),
         (t_icmek + 0.70, tuple(G - Vector((0, 0, 0.002)))),
         (t_butun - 0.05, tuple(G - Vector((0, 0, 0.004)))),
         (t_butun + 1.0, (-0.28, 0.24, 0.76)),
         (t_butun + 2.1, (-0.26, 0.30, TZ)),
         (t_takdim + 0.75, (BOWL.x, BOWL.y + 0.005, TZ)),
         (ctx.t1 + 0.4, (BOWL.x, BOWL.y + 0.005, TZ))]
    U = [(ctx.t0 - 0.30, (0, 0, 1)), (t_butun + 0.3, (0, 0, 1)), (t_butun + 2.1, (-0.03, 1, 0.9)),
         (t_takdim + 0.6, (0, 1, 0)), (ctx.t1 + 0.4, (-0.07, 1, 0))]
    for f in range(ctx.f0 - 3, ctx.f1 + 4):
        t = f / C.FPS
        e = catmull(P, t); g = catmull(T, t); u = curve([(a, b) for a, b in U], t)
        # smooth the up-vector blend
        cam.location = e
        cam.rotation_quaternion = look_quat(e, g, u)
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_quaternion", frame=f)
        # focus on the near face of the glass during the macro (target is the glass axis)
        near = 0.03 * C.remap(t, t_icmek - 0.6, t_icmek - 0.2) * (1 - C.remap(t, t_butun, t_butun + 0.5))
        cam.data.dof.focus_distance = (g - e).length - near
        cam.data.dof.keyframe_insert("focus_distance", frame=f)
    for fc in C.fcurves(cam):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    C.handheld(cam, amp_loc=0.0008, amp_rot=0.0, speed=0.3, seed=5)
    S.fast_denoise()
    S.perf_settings(light_tree=False, fast_gi=False)
    return {"final_spp": 12, "final_threshold": 0.05, "max_bounces": 7, "diffuse_bounces": 2,
            "glossy_bounces": 1, "transmission_bounces": 6, "transparent_bounces": 8, "clamp_indirect": 4.0}


C.run("sh03", build)
