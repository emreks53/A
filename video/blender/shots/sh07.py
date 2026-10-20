"""sh07 · 35.70-40.60 · open sea at dawn, the sun's rim breaks the horizon on "güneş"."""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
import common as C
import lib_s6 as L

SUN_AZ = 0.0          # sun straight ahead (+Y)
DIST = 9000.0         # sun-disc proxy distance (m)


def sun_elev(t, tg):
    # disc centre elevation (deg). rim (radius 0.267) touches the horizon at tg - 1 frame
    return -0.267 + 0.30 * (t - (tg - 1 / 24))


def build(ctx):
    sc = bpy.context.scene
    tg = ctx.word("güneş")
    # ---------------------------------------------------------------- sky (camera sees disc-less sky)
    w = sc.world; nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.sky_type = "MULTIPLE_SCATTERING"
    sky.sun_disc = False
    sky.sun_rotation = math.radians(SUN_AZ)
    sky.air_density = 1.0; sky.aerosol_density = 2.2; sky.ozone_density = 1.0
    tc0 = nt.nodes.new("ShaderNodeTexCoord")
    s0 = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc0.outputs["Generated"], s0.inputs[0])
    mz = nt.nodes.new("ShaderNodeMath"); mz.operation = "MAXIMUM"; mz.inputs[1].default_value = 0.0015
    nt.links.new(s0.outputs["Z"], mz.inputs[0])
    c0 = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(s0.outputs["X"], c0.inputs[0]); nt.links.new(s0.outputs["Y"], c0.inputs[1]); nt.links.new(mz.outputs[0], c0.inputs[2])
    n0 = nt.nodes.new("ShaderNodeVectorMath"); n0.operation = "NORMALIZE"; nt.links.new(c0.outputs[0], n0.inputs[0])
    nt.links.new(n0.outputs[0], sky.inputs["Vector"])
    for t in (ctx.t0 - 0.3, ctx.t1 + 0.3):
        sky.sun_elevation = math.radians(sun_elev(t, tg) - 1.4)   # twilight glow leads the disc
        sky.keyframe_insert("sun_elevation", frame=t * 24)
    for fc in C._fcurves(nt.animation_data.action):
        for k in fc.keyframe_points: k.interpolation = "LINEAR"
    bg = nt.nodes.new("ShaderNodeBackground")
    # deepen the twilight colours (maritime haze) and add the aerosol forward-scatter glow around the sun
    hs = nt.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = 1.55
    hs.inputs["Value"].default_value = 1.0
    nt.links.new(sky.outputs[0], hs.inputs["Color"])
    tint = nt.nodes.new("ShaderNodeMix"); tint.data_type = "RGBA"; tint.blend_type = "MULTIPLY"
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sepz = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Generated"], sepz.inputs[0])
    zr = nt.nodes.new("ShaderNodeMapRange"); zr.inputs["From Min"].default_value = 0.0
    zr.inputs["From Max"].default_value = 0.22
    nt.links.new(sepz.outputs["Z"], zr.inputs[0])
    tcol = nt.nodes.new("ShaderNodeMix"); tcol.data_type = "RGBA"
    tcol.inputs[6].default_value = (1.0, 0.60, 0.40, 1); tcol.inputs[7].default_value = (0.42, 0.30, 0.42, 1)
    nt.links.new(zr.outputs[0], tcol.inputs[0])
    tint.inputs[0].default_value = 1.0; nt.links.new(tcol.outputs[2], tint.inputs[7])
    nt.links.new(hs.outputs[0], tint.inputs[6])
    dot = nt.nodes.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"
    dot.inputs[1].default_value = (0.0, 1.0, 0.004)
    nt.links.new(tc.outputs["Generated"], dot.inputs[0])
    acs = nt.nodes.new("ShaderNodeMath"); acs.operation = "ARCCOSINE"; acs.use_clamp = True
    nt.links.new(dot.outputs["Value"], acs.inputs[0])
    def glow(width, colr, name):
        dv = nt.nodes.new("ShaderNodeMath"); dv.operation = "DIVIDE"; dv.inputs[1].default_value = -width
        nt.links.new(acs.outputs[0], dv.inputs[0])
        ex = nt.nodes.new("ShaderNodeMath"); ex.operation = "EXPONENT"; nt.links.new(dv.outputs[0], ex.inputs[0])
        sc_ = nt.nodes.new("ShaderNodeMath"); sc_.operation = "MULTIPLY"; sc_.name = name
        nt.links.new(ex.outputs[0], sc_.inputs[0])
        cm = nt.nodes.new("ShaderNodeMix"); cm.data_type = "RGBA"; cm.blend_type = "MULTIPLY"
        cm.inputs[0].default_value = 1.0; cm.inputs[7].default_value = (*colr, 1)
        nt.links.new(sc_.outputs[0], cm.inputs[6])
        return sc_, cm
    g1, c1 = glow(0.035, (1.0, 0.42, 0.12), "glow_core")
    g2, c2 = glow(0.30, (1.0, 0.30, 0.10), "glow_wide")
    ad1 = nt.nodes.new("ShaderNodeMix"); ad1.data_type = "RGBA"; ad1.blend_type = "ADD"; ad1.inputs[0].default_value = 1
    nt.links.new(tint.outputs[2], ad1.inputs[6]); nt.links.new(c1.outputs[2], ad1.inputs[7])
    hzr = nt.nodes.new("ShaderNodeMapRange"); hzr.inputs["From Min"].default_value = 0.022
    hzr.inputs["From Max"].default_value = 0.0; hzr.interpolation_type = "SMOOTHERSTEP"
    nt.links.new(sepz.outputs["Z"], hzr.inputs[0])
    hzc = nt.nodes.new("ShaderNodeMix"); hzc.data_type = "RGBA"; hzc.blend_type = "MIX"
    hzc.inputs[7].default_value = (0.9, 0.36, 0.14, 1); hzc.name = "haze"
    hzs = nt.nodes.new("ShaderNodeMix"); hzs.data_type = "RGBA"; hzs.blend_type = "MULTIPLY"; hzs.inputs[0].default_value = 1
    hzs.inputs[6].default_value = (1.0, 0.42, 0.17, 1)
    vlum = nt.nodes.new("ShaderNodeRGBToBW"); nt.links.new(tint.outputs[2], vlum.inputs[0])
    vmx = nt.nodes.new("ShaderNodeMath"); vmx.operation = "MULTIPLY"; vmx.inputs[1].default_value = 1.6
    nt.links.new(vlum.outputs[0], vmx.inputs[0])
    nt.links.new(vmx.outputs[0], hzs.inputs[7]); nt.links.new(hzs.outputs[2], hzc.inputs[7])
    hzm = nt.nodes.new("ShaderNodeMath"); hzm.operation = "MULTIPLY"; hzm.inputs[1].default_value = 0.55
    nt.links.new(hzr.outputs[0], hzm.inputs[0]); nt.links.new(hzm.outputs[0], hzc.inputs[0])
    nt.links.new(ad1.outputs[2], hzc.inputs[6])
    ad2 = nt.nodes.new("ShaderNodeMix"); ad2.data_type = "RGBA"; ad2.blend_type = "ADD"; ad2.inputs[0].default_value = 1
    nt.links.new(hzc.outputs[2], ad2.inputs[6]); nt.links.new(c2.outputs[2], ad2.inputs[7])
    # keep the glow out of the "ground" hemisphere
    sepw = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Generated"], sepw.inputs[0])
    hz = nt.nodes.new("ShaderNodeMapRange"); hz.inputs["From Min"].default_value = -0.004
    hz.inputs["From Max"].default_value = 0.002
    nt.links.new(sepw.outputs["Z"], hz.inputs[0])
    gate = nt.nodes.new("ShaderNodeMix"); gate.data_type = "RGBA"; gate.inputs[7].default_value = (1, 1, 1, 1)
    gate.inputs[6].default_value = (1.0, 1.0, 1.0, 1)
    nt.links.new(hz.outputs[0], gate.inputs[0])
    fin = nt.nodes.new("ShaderNodeMix"); fin.data_type = "RGBA"; fin.blend_type = "MULTIPLY"; fin.inputs[0].default_value = 1
    nt.links.new(ad2.outputs[2], fin.inputs[6]); nt.links.new(gate.outputs[2], fin.inputs[7])
    nt.links.new(fin.outputs[2], bg.inputs[0]); nt.links.new(bg.outputs[0], out.inputs[0])
    for t, a, b in ((ctx.t0 - 0.3, 0.010, 0.010), (tg - 0.3, 0.025, 0.016), (tg + 0.5, 0.20, 0.035), (ctx.t1 + 0.3, 0.45, 0.06)):
        g1.inputs[1].default_value = a; g1.inputs[1].keyframe_insert("default_value", frame=t * 24)
        g2.inputs[1].default_value = b; g2.inputs[1].keyframe_insert("default_value", frame=t * 24)
    bg.inputs[1].default_value = 1.0

    # ---------------------------------------------------------------- sun disc proxy + lamp
    disc_r = DIST * math.tan(math.radians(0.2665))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=disc_r, segments=48, ring_count=24)
    disc = bpy.context.object; disc.name = "SunDisc"
    m, dnt, p = C.new_mat("sundisc")
    dnt.nodes.remove(p)
    em = dnt.nodes.new("ShaderNodeEmission")
    # limb darkening: facing ratio
    lw = dnt.nodes.new("ShaderNodeLayerWeight"); lw.inputs[0].default_value = 0.5
    ramp = dnt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (1.0, 0.36, 0.10, 1)
    ramp.color_ramp.elements[1].position = 1.0; ramp.color_ramp.elements[1].color = (1.0, 0.70, 0.32, 1)
    dnt.links.new(lw.outputs["Facing"], ramp.inputs[0]); dnt.links.new(ramp.outputs[0], em.inputs[0])
    em.inputs[1].default_value = 260.0
    for t, v in ((tg - 0.2, 40.0), (tg + 0.25, 70.0), (tg + 1.0, 180.0), (ctx.t1 + 0.3, 300.0)):
        em.inputs[1].default_value = v; em.inputs[1].keyframe_insert("default_value", frame=t * 24)   # extinction near horizon
    dnt.links.new(em.outputs[0], dnt.nodes["Material Output"].inputs[0])
    C.assign(disc, m)
    for a in ("visible_diffuse", "visible_glossy", "visible_transmission", "visible_volume_scatter", "visible_shadow"):
        setattr(disc, a, False)
    trk = C.empty("TRK_sun", (0, 0, 0)); trk.parent = disc
    lamp = C.sun(elev_deg=1, azim_deg=0, strength=0, kelvin_k=2400, angle_deg=0.53)
    f0, f1 = ctx.f0 - 2, ctx.f1 + 2
    for f in range(f0, f1 + 1, 2):
        t = f / 24
        e = sun_elev(t, tg)
        disc.location = L.sun_dir(e, SUN_AZ) * DIST
        disc.keyframe_insert("location", frame=f)
        L.aim_sun_lamp(lamp, max(e, 0.0) * 2.0 + 2.2, SUN_AZ)   # lamp a touch higher: crests self-shadow less
        lamp.keyframe_insert("rotation_quaternion", frame=f)
        vis = C.smooth((e + 0.267) / 0.533)          # fraction of disc above horizon (approx)
        lamp.data.energy = 70.0 * vis ** 1.5
        lamp.data.keyframe_insert("energy", frame=f)

    # ---------------------------------------------------------------- ocean (near patch dense, mid patch coarse;
    # same spectrum + seed so the swell is continuous across the seam)
    def ocean(name, res, rx, ry, loc, chop):
        bpy.ops.mesh.primitive_plane_add(size=2)
        o = bpy.context.object; o.name = name
        oc = o.modifiers.new("Ocean", "OCEAN")
        oc.resolution = res; oc.viewport_resolution = 4
        oc.spatial_size = 60
        oc.repeat_x = rx; oc.repeat_y = ry
        oc.wave_scale = 0.55
        oc.wind_velocity = 7.0
        oc.choppiness = 1.1
        oc.wave_alignment = 0.35
        oc.wave_direction = math.radians(-70)
        oc.wave_scale_min = 0.01
        oc.use_normals = True
        oc.use_foam = True; oc.foam_coverage = 0.25; oc.foam_layer_name = "foam"
        oc.random_seed = 11
        oc.depth = 200
        mods = [oc]
        if chop:
            ch = o.modifiers.new("Chop", "OCEAN")          # short wind waves riding on the swell
            ch.geometry_mode = "DISPLACE"
            ch.resolution = 11; ch.viewport_resolution = 4
            ch.spatial_size = 14; ch.wave_scale = 0.35; ch.wind_velocity = 6.0; ch.choppiness = 1.2
            ch.wave_alignment = 0.15; ch.wave_direction = math.radians(-40); ch.random_seed = 5
            ch.use_normals = True
            mods.append(ch)
        for mod in mods:
            mod.time = ctx.t0; mod.keyframe_insert("time", frame=0)
            mod.time = ctx.t0 + 100; mod.keyframe_insert("time", frame=100 * 24)
        for fc in C.fcurves(o):
            for k in fc.keyframe_points: k.interpolation = "LINEAR"
        o.location = loc    # tiles grow toward +X/+Y from the first tile centred on the origin
        C.smooth_shade(o)
        return o
    sea = ocean("Ocean", 16, 3, 3, (-60, 15, 0), True)          # x -90..90, y -15..165
    mid = ocean("OceanMid", 10, 5, 13, (-120, 195, 0), False)   # x -150..150, y 165..945
    # far ocean: big plane beyond the simulated patch, micro-facet roughness carries the glitter
    bpy.ops.mesh.primitive_plane_add(size=1)
    far = bpy.context.object; far.name = "FarSea"
    far.scale = (40000, 40000, 1); far.location = (0, 940 + 20000 - 3, -0.02)

    def water_mat(name, foam=True, rough=0.09):
        m, nt, p = C.new_mat(name)
        p.inputs["Base Color"].default_value = (0.004, 0.012, 0.016, 1)
        p.inputs["Roughness"].default_value = rough
        p.inputs["IOR"].default_value = 1.333
        p.inputs["Specular IOR Level"].default_value = 0.5
        p.inputs["Subsurface Weight"].default_value = 0.0
        # capillary ripples
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (2.2, 1.0, 1.0)
        nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 7.0
        nz.inputs["Detail"].default_value = 8; nz.inputs["Roughness"].default_value = 0.6
        nt.links.new(tc.outputs["Object" if name != "farsea" else "Generated"], mp.inputs[0])
        nt.links.new(mp.outputs[0], nz.inputs[0])
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.35
        bp.inputs["Distance"].default_value = 0.03
        nz2 = nt.nodes.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 26.0
        nz2.inputs["Detail"].default_value = 4
        mp2 = nt.nodes.new("ShaderNodeMapping"); mp2.inputs["Scale"].default_value = (1.0, 2.5, 1.0)
        nt.links.new(tc.outputs["Object" if name != "farsea" else "Generated"], mp2.inputs[0]); nt.links.new(mp2.outputs[0], nz2.inputs[0])
        bp2 = nt.nodes.new("ShaderNodeBump"); bp2.inputs["Strength"].default_value = 0.5
        bp2.inputs["Distance"].default_value = 0.008
        nt.links.new(nz2.outputs[0], bp2.inputs["Height"])
        nt.links.new(nz.outputs[0], bp.inputs["Height"]); nt.links.new(bp.outputs[0], bp2.inputs["Normal"])
        nt.links.new(bp2.outputs[0], p.inputs["Normal"])
        if foam:
            at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "foam"
            fn = nt.nodes.new("ShaderNodeTexNoise"); fn.inputs["Scale"].default_value = 9
            fn.inputs["Detail"].default_value = 8
            nt.links.new(tc.outputs["Object"], fn.inputs[0])
            mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
            nt.links.new(at.outputs["Fac"], mul.inputs[0]); nt.links.new(fn.outputs[0], mul.inputs[1])
            mr = nt.nodes.new("ShaderNodeMapRange")
            mr.inputs["From Min"].default_value = 0.28; mr.inputs["From Max"].default_value = 0.55
            nt.links.new(mul.outputs[0], mr.inputs[0])
            foamb = nt.nodes.new("ShaderNodeBsdfPrincipled")
            foamb.inputs["Base Color"].default_value = (0.75, 0.78, 0.8, 1)
            foamb.inputs["Roughness"].default_value = 0.55
            mix = nt.nodes.new("ShaderNodeMixShader")
            nt.links.new(mr.outputs[0], mix.inputs[0])
            nt.links.new(p.outputs[0], mix.inputs[1]); nt.links.new(foamb.outputs[0], mix.inputs[2])
            nt.links.new(mix.outputs[0], nt.nodes["Material Output"].inputs[0])
        return m
    C.assign(sea, water_mat("sea")); C.assign(mid, sea.data.materials[0])
    C.assign(far, water_mat("farsea", foam=False, rough=0.12))

    # ---------------------------------------------------------------- thin high clouds (emissive, sky-lit look)
    bpy.ops.mesh.primitive_plane_add(size=1)
    cl = bpy.context.object; cl.name = "Clouds"
    cl.scale = (60000, 40000, 1); cl.location = (0, 15000, 1700)
    m, nt, p = C.new_mat("clouds"); nt.nodes.remove(p)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1.5, 5.0, 1.0)
    nt.links.new(tc.outputs["Object"], mp.inputs[0])
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 2.5
    nz.inputs["Detail"].default_value = 12; nz.inputs["Roughness"].default_value = 0.62
    nz.inputs["Distortion"].default_value = 1.2
    nt.links.new(mp.outputs[0], nz.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 0.50; mr.inputs["From Max"].default_value = 0.80
    nt.links.new(nz.outputs[0], mr.inputs[0])
    # fade near the plane edges and toward the horizon (keeps the GÜNEŞ band clean)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    ry = nt.nodes.new("ShaderNodeMapRange")
    ry.inputs["From Min"].default_value = -0.02; ry.inputs["From Max"].default_value = -0.22
    nt.links.new(sep.outputs["Y"], ry.inputs[0])
    am = nt.nodes.new("ShaderNodeMath"); am.operation = "MULTIPLY"
    nt.links.new(mr.outputs[0], am.inputs[0]); nt.links.new(ry.outputs[0], am.inputs[1])
    am2 = nt.nodes.new("ShaderNodeMath"); am2.operation = "MULTIPLY"; am2.inputs[1].default_value = 0.85
    nt.links.new(am.outputs[0], am2.inputs[0])
    emc = nt.nodes.new("ShaderNodeEmission")
    # colour: hot near sun azimuth, violet-grey away
    sx = nt.nodes.new("ShaderNodeMapRange"); sx.inputs["From Min"].default_value = 0.0
    sx.inputs["From Max"].default_value = 0.25
    ab = nt.nodes.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"
    nt.links.new(sep.outputs["X"], ab.inputs[0]); nt.links.new(ab.outputs[0], sx.inputs[0])
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (1.0, 0.36, 0.14, 1)
    cr.color_ramp.elements[1].color = (0.30, 0.12, 0.13, 1)
    nt.links.new(sx.outputs[0], cr.inputs[0]); nt.links.new(cr.outputs[0], emc.inputs[0])
    emc.inputs[1].default_value = 0.10
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(am2.outputs[0], mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(emc.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], nt.nodes["Material Output"].inputs[0])
    C.assign(cl, m)
    for a in ("visible_diffuse", "visible_shadow"):
        setattr(cl, a, False)
    sc["cloud_emit"] = 0
    # clouds brighten as the sun comes up
    for t, s in ((ctx.t0 - 0.3, 0.07), (tg - 0.2, 0.10), (tg + 1.2, 0.20), (ctx.t1 + 0.3, 0.26)):
        emc.inputs[1].default_value = s; emc.inputs[1].keyframe_insert("default_value", frame=t * 24)

    # ---------------------------------------------------------------- camera: low over water, slowly rising
    cam = C.camera("cam", lens=100, loc=(0, 0, 1.3), fstop=8, focus=600.0, clip_end=60000)
    cam.rotation_mode = "XYZ"
    def campose(t):
        u = C.remap(t, ctx.t0 - 0.25, ctx.t1 + 0.25, C.smooth)
        z = C.lerp(1.25, 3.6, u)
        y = C.lerp(0.0, 9.0, u)
        pitch = 90 + C.lerp(-0.25, -0.05, u)          # horizon a bit below centre
        return (0.0, y, z), (pitch, 0, 0)
    for k in range(9):
        t = ctx.t0 - 0.25 + (ctx.t1 - ctx.t0 + 0.5) * k / 8
        loc, rot = campose(t)
        C.key(cam, "location", t, loc)
        C.key(cam, "rotation_euler", t, tuple(math.radians(v) for v in rot))
    C.handheld(cam, amp_loc=0.01, amp_rot=0.0009, speed=0.25, seed=7)   # boat/drone drift

    # ---------------------------------------------------------------- exposure + glare
    vs = sc.view_settings
    for t, ev in ((ctx.t0 - 0.3, -0.55), (tg - 0.1, -0.6), (tg + 0.7, -1.35), (39.9, -1.2), (ctx.t1 + 0.25, 1.6)):
        vs.exposure = ev; vs.keyframe_insert("exposure", frame=t * 24)
    comp = L.compositor(bloom=0.0, threshold=1.0, fog=0.25, fog_size=0.9)
    g = comp["fog"]
    for t, s in ((ctx.t0 - 0.3, 0.04), (tg, 0.05), (tg + 0.8, 0.07), (39.9, 0.12), (ctx.t1 + 0.25, 0.9)):
        g.inputs["Strength"].default_value = s; g.inputs["Strength"].keyframe_insert("default_value", frame=t * 24)
    return {"final_spp": 24, "preview_spp": 16, "max_bounces": 4, "diffuse_bounces": 1,
            "glossy_bounces": 2, "transmission_bounces": 2, "transparent_bounces": 4}


C.run("sh07", build)
