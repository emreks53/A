"""sh03 · 9.64-16.00 · the sofra. Continues sh02's boom down onto the table on the SAME shared path
(lib_s4.BOOM_*), lands macro on the clear glass as water is poured into it, backlit by the sun ("içmek"),
cranes up and round over the generous table ("bütün"), holds oblique while the plate with the opened
pomegranate slides toward the lens ("takdim"), then settles TOP-DOWN with the round bowl centred."""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from mathutils import Vector
import common as C
import lib_s4 as S

TZ = S.TABLE_Z
BOWL = Vector((*S.SOFRA["bowl"], TZ))
GLASS = Vector((*S.SOFRA["glass"], TZ))
G = Vector((GLASS.x, GLASS.y, TZ + 0.075))
TOP = Vector((BOWL.x - 0.073, BOWL.y, TZ + 1.10))      # bowl at y~1060 px, band 520-820 clear

P3 = S.BOOM_P + [(11.90, (0.235, -0.088, 0.862)), (12.90, (0.55, -0.05, 1.22)), (13.90, (0.48, 0.24, 1.40)),
                 (15.05, (0.40, 0.25, 1.50)), (16.25, tuple(TOP)), (16.60, tuple(TOP - Vector((0, 0, 0.03))))]
T3 = S.BOOM_T + [(11.90, tuple(G - Vector((0, 0, 0.003)))), (12.90, (-0.20, 0.20, 0.78)), (13.90, (-0.42, 0.25, 0.76)),
                 (15.05, (-0.42, 0.25, 0.76)), (16.25, (TOP.x, TOP.y, TZ)), (16.60, (TOP.x, TOP.y, TZ))]
U3 = [(9.0, (0, 0, 1)), (15.05, (0, 0, 1)), (16.0, (-1, 0, 0)), (16.60, (-1, 0, 0))]


def build(ctx):
    S.light_rig(exposure=S.ROOM_EXPOSURE)
    S.build_room()
    S.build_table()
    t_yemek, t_icmek, t_butun, t_takdim = ctx.word("yemek"), ctx.word("içmek"), ctx.word("bütün"), ctx.word("takdim")
    so = S.build_sofra()
    so["pom"] = S.replace_open_pomegranate(so["pom"])     # fix s1-3: real cut face (sh02 keeps build_sofra as is)
    water = so["water"]
    r_in = S.inner_radius(0.05)

    # ---------------------------------------------------------------- sh02's air, carried over the cut
    S.build_curtain(ctx, [], y0=-0.30, y1=0.36, drop=1.40, wall=None)
    S.build_beam_emission((-0.99, -0.75, 0.765), (0.45, 0.92, 2.42), strength=0.045, curtain_y=0.36,
                          time_keys=[(5.24 - 1, 0.0), (9.64 + 1, 0.9)])
    S.build_motes("Motes", (-0.97, -0.6, 0.80), (0.12, 1.0, 2.30), count=5000, seed=21, r_min=0.0005,
                  r_max=0.0011, material=S.mat_mote_beamlit())

    S.build_gust_motes("GustMotes", 8.00, 8.40, 9.80, S.sh02_cam_at)
    # the carried-over haze and motes fade out f237-249 (no pop), then leave the render; the curtain stays
    for m in bpy.data.materials:
        nd = m.node_tree.nodes.get("GAIN") if m.node_tree else None
        if nd is not None:
            v = nd.inputs[1].default_value
            nd.inputs[1].keyframe_insert("default_value", frame=237)
            nd.inputs[1].default_value = 0.0
            nd.inputs[1].keyframe_insert("default_value", frame=249)
    for o in bpy.data.objects:
        if o.name.split(".")[0] in ("ShaftVolume", "Motes", "GustMotes"):
            o.hide_render = False; o.keyframe_insert("hide_render", frame=250)
            o.hide_render = True; o.keyframe_insert("hide_render", frame=251)

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
    impact = Vector((GLASS.x - 0.003, GLASS.y + 0.004, 0))
    v0 = 0.30
    spout_h = 0.215                           # spout height above the inner bottom of the glass
    fall_t = math.sqrt(2 * spout_h / 9.81)
    spout = Vector((impact.x, impact.y + v0 * fall_t, TZ + 0.009 + spout_h))
    stream, sng = S.build_stream("Stream", spout, v0=(v0, 0, 0), r0=0.0036)
    stream.rotation_euler.z = math.radians(-90)       # pours toward -Y (enters from frame right)
    for t, off in [(t_hit - 1.3, (0.0, 0.25, 0.60)), (t_hit - 0.5, (0.0, 0.10, 0.45)), (t_hit - 0.25, (0.0, 0.02, 0.03)),
                   (t_hit - 0.10, (0, 0, 0)), (t_end, (0, 0.003, 0.004)), (t_end + 0.4, (0.05, 0.10, 0.15)),
                   (t_end + 1.0, (0.30, 0.45, 0.70))]:
        C.key(piv, "location", t, tuple(spout + Vector(off)))
    for t, a in [(t_hit - 1.3, 10), (t_hit - 0.5, 25), (t_hit - 0.25, 50), (t_hit - 0.12, 60), (t_end - 0.1, 67),
                 (t_end + 0.4, 30), (t_end + 1.0, 15)]:
        piv.rotation_euler = (0, math.radians(a), math.radians(-90))
        piv.keyframe_insert("rotation_euler", frame=t * C.FPS)
    t_leave = t_hit - fall_t
    S.key_node_value(sng, "FRONT", [(t_leave - 0.01, 0.0), (t_hit, 1.06)], interp="LINEAR")
    # as the level rises the fall gets shorter: slide the jet origin (and the jug with it) so it keeps landing
    # exactly on the impact point
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        t = f / C.FPS
        dy = v0 * (math.sqrt(2 * spout_h / 9.81) - math.sqrt(2 * max(1e-4, spout_h - level(t)) / 9.81))
        stream.location = spout - Vector((0, dy, 0))
        stream.keyframe_insert("location", index=1, frame=f)
    S.key_node_value(sng, "TAIL", [(t_end, 0.0), (t_end + 0.2, 1.0)], interp="LINEAR")
    S.key_node_value(sng, "FLOW", [(t_leave, 0.55), (t_leave + 0.12, 1.0), (t_end - 0.25, 1.0), (t_end, 0.45)])
    hk = [(f / C.FPS, spout_h - level(f / C.FPS)) for f in range(ctx.f0 - 2, ctx.f1 + 3, 2)]
    S.key_node_value(sng, "HEIGHT", hk, interp="LINEAR")
    bub, bng = S.build_bubbles("Bubbles", (impact.x, impact.y, TZ + 0.0092), r_in)
    S.key_node_value(bng, "LEVEL", [(t, level(t)) for t, _ in hk], interp="LINEAR")
    S.key_node_value(bng, "FLOW", [(t_hit - 0.02, 0.0), (t_hit + 0.15, 1.0), (t_end, 1.0), (t_end + 0.8, 0.0)])
    crown = S.build_crown("Crown", (impact.x, impact.y, TZ + 0.0092), S.mat_water_s4("CrownWater"))
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        t = f / C.FPS
        k = C.remap(t, t_hit - 0.02, t_hit + 0.08) * (1 - C.remap(t, t_end - 0.1, t_end + 0.15))
        k *= 1 + 0.12 * math.sin(t * 47.0)
        crown.location.z = TZ + 0.0092 + level(t)
        crown.scale = (max(k, 0.001), max(k, 0.001), max(k * (0.9 + 0.2 * math.sin(t * 31.0)), 0.001))
        crown.keyframe_insert("location", index=2, frame=f); crown.keyframe_insert("scale", frame=f)
    C.empty("TRK_water", (GLASS.x, GLASS.y, TZ + 0.06))
    wm = water.data.materials[0]
    S.add_water_ripples(wm, (impact.x - GLASS.x, impact.y - GLASS.y, 0.1), ctx.t0, ctx.t1,
                        [(t_hit, 0.0), (t_hit + 0.1, 1.0), (t_end, 1.0), (t_end + 0.9, 0.15), (ctx.t1, 0.05)])
    # a bright window-edge strip behind the glass, seen only in reflections/refraction: sparkle on the jet
    # ~40 deg off the lens axis, behind the glass; lights ONLY the glass/water/jet (light linking);
    # off through the cut (f237), on by f246, off again by 12.0 s
    sl = S.strip_light("GlassStrip", (GLASS.x - 0.295, GLASS.y - 0.125, TZ + 0.17), (0.03, 0.34), 10.0,
                       (GLASS.x, GLASS.y, TZ + 0.10))
    rc = bpy.data.collections.new("GlassStripReceivers")
    for o in bpy.data.objects:
        if o.type == "MESH" and o.name.split(".")[0] in ("Glass", "GlassWater", "Stream", "Crown", "CrownDrop", "Bubbles", "Jug", "JugHandle"):
            rc.objects.link(o)
    sl.light_linking.receiver_collection = rc
    for f, w in ((237, 0.0), (246, 10.0), (t_butun * C.FPS - 6, 10.0), (t_butun * C.FPS, 0.0)):
        sl.data.energy = w; sl.data.keyframe_insert("energy", frame=f)

    # ---------------------------------------------------------------- takdim: the plate is offered
    pr = so["plate_root"]
    C.key(pr, "location", t_takdim - 0.45, (*S.SOFRA["plate0"], TZ))
    C.key(pr, "location", t_takdim + 0.25, (*S.SOFRA["plate1"], TZ))

    # ---------------------------------------------------------------- camera (shared boom, then own path)
    cam = C.camera("cam", lens=28, loc=P3[0][1], fstop=2.8)
    for t, fs in ((9.95, 2.8), (10.30, 5.6), (12.0, 5.6), (12.6, 4.0)):   # f/2.8 at the cut, f/5.6 macro
        cam.data.dof.aperture_fstop = fs; cam.data.dof.keyframe_insert("aperture_fstop", frame=t * C.FPS)

    def focus_off(t):          # near face of the glass during the macro
        return 0.015 * C.remap(t, t_icmek - 0.6, t_icmek - 0.2) * (1 - C.remap(t, t_butun, t_butun + 0.5))
    S.key_camera(cam, ctx, P3, T3, U3, focus_off=focus_off)
    C.handheld(cam, amp_loc=0.0008, amp_rot=0.0, speed=0.3, seed=5)
    S.comp_sunbeams(ctx, cam, beams=False, bloom=0.05, bloom_threshold=3.0)
    S.perf_settings(light_tree=False, fast_gi=False)
    # the glass/water macro; the deep paths stay on until the glass has left the frame (326), so the
    # bounce switch never lands on the hero glass (QA r3: a 292|293 switch popped -8.5 levels on the glass)
    S.frame_bounces(225, 326, glossy=4, transmission=12, max_b=12)   # whole time the glass is on screen (QA r5: no switch on the glass at 247|248)
    return S.RENDER_OV


C.run("sh03", build)
