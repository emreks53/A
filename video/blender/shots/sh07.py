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
    hs = nt.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = 1.35
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
    hzr = nt.nodes.new("ShaderNodeMapRange"); hzr.inputs["From Min"].default_value = 0.045
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
    hzm = nt.nodes.new("ShaderNodeMath"); hzm.operation = "MULTIPLY"; hzm.inputs[1].default_value = 0.72
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
    disc.scale = (1.0, 1.0, 0.86)          # refraction squashes the low sun
    m, dnt, p = C.new_mat("sundisc")
    dnt.nodes.remove(p)
    em = dnt.nodes.new("ShaderNodeEmission")
    # limb darkening: facing ratio
    lw = dnt.nodes.new("ShaderNodeLayerWeight"); lw.inputs[0].default_value = 0.5
    ramp = dnt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (1.0, 0.86, 0.58, 1)
    ramp.color_ramp.elements[1].position = 1.0; ramp.color_ramp.elements[1].color = (1.0, 0.30, 0.07, 1)
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
        lamp.data.energy = 50.0 * vis ** 1.5
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
        oc.use_foam = chop; oc.foam_coverage = 0.25; oc.foam_layer_name = "foam"
        oc.random_seed = 11
        oc.depth = 200
        mods = [oc]
        if chop:
            # the 0.23 m FFT grid read as flat facets (and the chop below aliased on it): smooth it to
            # ~6 cm before the short wind waves are displaced, so the near reflections curve like water
            ss = o.modifiers.new("Smooth", "SUBSURF")
            ss.levels = 0; ss.render_levels = 2; ss.quality = 1
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
        o.cycles.use_deform_motion = False      # waves barely move in 1/48 s; camera motion blur still applies
        o.location = loc    # tiles grow toward +X/+Y from the first tile centred on the origin
        C.smooth_shade(o)
        return o
    sea = ocean("Ocean", 16, 1, 3, (0, 15, 0), True)            # x -30..30, y -15..165 (frame is ~±17 m wide there)
    mid = ocean("OceanMid", 8, 5, 13, (-120, 195, 0), False)   # x -150..150, y 165..945
    # far ocean: big plane beyond the simulated patch, micro-facet roughness carries the glitter
    bpy.ops.mesh.primitive_plane_add(size=1)
    far = bpy.context.object; far.name = "FarSea"
    far.scale = (40000, 40000, 1); far.location = (0, 940 + 20000 - 3, -0.02)

    def water_mat(name, foam=True, rough=0.025):
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
        nz.inputs["Detail"].default_value = 4; nz.inputs["Roughness"].default_value = 0.6
        nt.links.new(tc.outputs["Object" if name != "farsea" else "Generated"], mp.inputs[0])
        nt.links.new(mp.outputs[0], nz.inputs[0])
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.35
        bp.inputs["Distance"].default_value = 0.03
        nz2 = nt.nodes.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 26.0
        nz2.inputs["Detail"].default_value = 2
        mp2 = nt.nodes.new("ShaderNodeMapping"); mp2.inputs["Scale"].default_value = (1.0, 2.5, 1.0)
        nt.links.new(tc.outputs["Object" if name != "farsea" else "Generated"], mp2.inputs[0]); nt.links.new(mp2.outputs[0], nz2.inputs[0])
        bp2 = nt.nodes.new("ShaderNodeBump"); bp2.inputs["Strength"].default_value = 0.5
        bp2.inputs["Distance"].default_value = 0.008
        nt.links.new(nz2.outputs[0], bp2.inputs["Height"])
        nt.links.new(nz.outputs[0], bp.inputs["Height"]); nt.links.new(bp.outputs[0], bp2.inputs["Normal"])
        # capillaries + short wind ripples (crisp glitter points), faded with distance where they go sub-pixel;
        # roughness rises with distance instead (the far sheen) and varies in wind streaks / slicks
        lp = nt.nodes.new("ShaderNodeLightPath")
        dist = nt.nodes.new("ShaderNodeMapRange"); dist.inputs["From Min"].default_value = 15.0
        dist.inputs["From Max"].default_value = 160.0
        nt.links.new(lp.outputs["Ray Length"], dist.inputs[0])
        near = nt.nodes.new("ShaderNodeMath"); near.operation = "SUBTRACT"; near.inputs[0].default_value = 1.0
        nt.links.new(dist.outputs[0], near.inputs[1])
        cur = bp2.outputs[0]
        for sc_, st_, dd_, an_ in ((70.0, 0.8, 0.0025, (1.0, 1.8, 1.0)), (190.0, 0.6, 0.001, (1.0, 1.3, 1.0))):
            mpx = nt.nodes.new("ShaderNodeMapping"); mpx.inputs["Scale"].default_value = an_
            nt.links.new(tc.outputs["Object" if name != "farsea" else "Generated"], mpx.inputs[0])
            nzx = nt.nodes.new("ShaderNodeTexNoise"); nzx.inputs["Scale"].default_value = sc_
            nzx.inputs["Detail"].default_value = 1
            nt.links.new(mpx.outputs[0], nzx.inputs[0])
            stx = nt.nodes.new("ShaderNodeMath"); stx.operation = "MULTIPLY"; stx.inputs[1].default_value = st_
            nt.links.new(near.outputs[0], stx.inputs[0])
            bpx = nt.nodes.new("ShaderNodeBump"); bpx.inputs["Distance"].default_value = dd_
            nt.links.new(stx.outputs[0], bpx.inputs["Strength"])
            nt.links.new(nzx.outputs[0], bpx.inputs["Height"]); nt.links.new(cur, bpx.inputs["Normal"])
            cur = bpx.outputs[0]
        if name == "sea":
            # pre-dawn: without the sun the sub-pixel ripple octaves above only blur the sky mirror into a
            # matte sheen, so the near water uses smooth swell ripples + resolvable capillaries instead and
            # crossfades (keyed) to the glitter ripples just before the rim breaks the horizon
            ocd = tc.outputs["Object"]
            pre = None
            for sc_, an_, dd_, st_, fade in ((3.0, (1.0, 2.5, 1.0), 0.03, 0.15, False),
                                             (28.0, (1.0, 3.0, 1.0), 0.004, 0.3, True)):
                mpx = nt.nodes.new("ShaderNodeMapping"); mpx.inputs["Scale"].default_value = an_
                nt.links.new(ocd, mpx.inputs[0])
                nzx = nt.nodes.new("ShaderNodeTexNoise"); nzx.inputs["Scale"].default_value = sc_
                nzx.inputs["Detail"].default_value = 1.0; nzx.inputs["Roughness"].default_value = 0.5
                nt.links.new(mpx.outputs[0], nzx.inputs[0])
                bpx = nt.nodes.new("ShaderNodeBump"); bpx.inputs["Distance"].default_value = dd_
                if fade:
                    stx = nt.nodes.new("ShaderNodeMath"); stx.operation = "MULTIPLY"; stx.inputs[1].default_value = st_
                    nt.links.new(near.outputs[0], stx.inputs[0]); nt.links.new(stx.outputs[0], bpx.inputs["Strength"])
                else:
                    bpx.inputs["Strength"].default_value = st_
                nt.links.new(nzx.outputs[0], bpx.inputs["Height"])
                if pre is not None: nt.links.new(pre, bpx.inputs["Normal"])
                pre = bpx.outputs[0]
            xf = nt.nodes.new("ShaderNodeValue"); xf.name = "dawn_ripples"
            for f, v in ((930, 0.0), (938, 1.0)):
                xf.outputs[0].default_value = v; xf.outputs[0].keyframe_insert("default_value", frame=f)
            for fc in C._fcurves(nt.animation_data.action):
                for k in fc.keyframe_points: k.interpolation = "LINEAR"
            mxn = nt.nodes.new("ShaderNodeMix"); mxn.data_type = "VECTOR"
            nt.links.new(xf.outputs[0], mxn.inputs[0])
            nt.links.new(pre, mxn.inputs[4]); nt.links.new(cur, mxn.inputs[5])
            nrm = nt.nodes.new("ShaderNodeVectorMath"); nrm.operation = "NORMALIZE"
            nt.links.new(mxn.outputs[1], nrm.inputs[0]); cur = nrm.outputs[0]
        nt.links.new(cur, p.inputs["Normal"])
        sl = nt.nodes.new("ShaderNodeTexNoise"); sl.inputs["Scale"].default_value = 0.035
        sl.inputs["Detail"].default_value = 2
        msl = nt.nodes.new("ShaderNodeMapping"); msl.inputs["Scale"].default_value = (1.0, 0.35, 1.0)
        nt.links.new(tc.outputs["Object" if name != "farsea" else "Generated"], msl.inputs[0]); nt.links.new(msl.outputs[0], sl.inputs[0])
        rsl = nt.nodes.new("ShaderNodeMapRange"); rsl.inputs["From Min"].default_value = 0.4
        rsl.inputs["From Max"].default_value = 0.62; rsl.inputs["To Min"].default_value = rough
        rsl.inputs["To Max"].default_value = rough * 0.45
        nt.links.new(sl.outputs[0], rsl.inputs[0])
        rd = nt.nodes.new("ShaderNodeMath"); rd.operation = "MULTIPLY_ADD"
        nt.links.new(dist.outputs[0], rd.inputs[0]); rd.inputs[1].default_value = 0.07
        nt.links.new(rsl.outputs[0], rd.inputs[2])
        nt.links.new(rd.outputs[0], p.inputs["Roughness"])
        if foam:
            at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "foam"
            fn = nt.nodes.new("ShaderNodeTexNoise"); fn.inputs["Scale"].default_value = 9
            fn.inputs["Detail"].default_value = 3
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
    C.assign(far, water_mat("farsea", foam=False, rough=0.06))

    # ---------------------------------------------------------------- clouds (emissive cards, metre-scale noise)
    def cloud_mat(name, scale_m, stretch, thr, base_col, sun_col, sil=1.0, zfade=None):
        m, nt, p = C.new_mat(name); nt.nodes.remove(p)
        m.cycles.emission_sampling = "NONE"
        geo = nt.nodes.new("ShaderNodeNewGeometry")
        mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / (scale_m * stretch[0]), 1 / (scale_m * stretch[1]), 1 / (scale_m * stretch[2]))
        nt.links.new(geo.outputs["Position"], mp.inputs[0])
        nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.0
        nz.inputs["Detail"].default_value = 6; nz.inputs["Roughness"].default_value = 0.58
        nz.inputs["Distortion"].default_value = 0.6
        nt.links.new(mp.outputs[0], nz.inputs[0])
        vo = nt.nodes.new("ShaderNodeTexVoronoi"); vo.feature = "SMOOTH_F1"; vo.inputs["Scale"].default_value = 4.0
        nt.links.new(mp.outputs[0], vo.inputs["Vector"])
        mx = nt.nodes.new("ShaderNodeMath"); mx.operation = "MULTIPLY_ADD"; mx.inputs[1].default_value = -0.25
        nt.links.new(vo.outputs["Distance"], mx.inputs[0]); nt.links.new(nz.outputs[0], mx.inputs[2])
        mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = thr
        mr.inputs["From Max"].default_value = thr + 0.16; mr.interpolation_type = "SMOOTHSTEP"
        nt.links.new(mx.outputs[0], mr.inputs[0])
        alpha = mr.outputs[0]
        if zfade:
            sz = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(geo.outputs["Position"], sz.inputs[0])
            zf = nt.nodes.new("ShaderNodeFloatCurve"); cv = zf.mapping.curves[0]
            zf.mapping.clip_min_x, zf.mapping.clip_max_x = zfade[0], zfade[1]
            zf.mapping.use_clip = False
            cv.points[0].location = (zfade[0], 0.0); cv.points[1].location = (zfade[1], 0.0)
            for x, y in zfade[2]:
                cv.points.new(x, y)
            zf.mapping.update()
            nt.links.new(sz.outputs["Z"], zf.inputs["Value"])
            am = nt.nodes.new("ShaderNodeMath"); am.operation = "MULTIPLY"
            nt.links.new(alpha, am.inputs[0]); nt.links.new(zf.outputs[0], am.inputs[1]); alpha = am.outputs[0]
        # azimuth from the sun (x / distance): hot under-light near the sun, cooler pink away
        sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(geo.outputs["Position"], sep.inputs[0])
        dv = nt.nodes.new("ShaderNodeMath"); dv.operation = "DIVIDE"
        nt.links.new(sep.outputs["X"], dv.inputs[0]); nt.links.new(sep.outputs["Y"], dv.inputs[1])
        ab = nt.nodes.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"; nt.links.new(dv.outputs[0], ab.inputs[0])
        az = nt.nodes.new("ShaderNodeMapRange"); az.inputs["From Max"].default_value = 0.12
        nt.links.new(ab.outputs[0], az.inputs[0])
        cmix = nt.nodes.new("ShaderNodeMix"); cmix.data_type = "RGBA"
        cmix.inputs[6].default_value = (*sun_col, 1); cmix.inputs[7].default_value = (*base_col, 1)
        nt.links.new(az.outputs[0], cmix.inputs[0])
        # thick parts close to the sun go dark (backlit silhouettes), their thin edges stay bright
        if sil < 1.0:
            thick = nt.nodes.new("ShaderNodeMapRange"); thick.inputs["From Min"].default_value = thr + 0.12
            thick.inputs["From Max"].default_value = thr + 0.30
            nt.links.new(mx.outputs[0], thick.inputs[0])
            nsun = nt.nodes.new("ShaderNodeMath"); nsun.operation = "SUBTRACT"; nsun.inputs[0].default_value = 1.0
            nt.links.new(az.outputs[0], nsun.inputs[1])
            k = nt.nodes.new("ShaderNodeMath"); k.operation = "MULTIPLY"
            nt.links.new(thick.outputs[0], k.inputs[0]); nt.links.new(nsun.outputs[0], k.inputs[1])
            k2 = nt.nodes.new("ShaderNodeMath"); k2.operation = "MULTIPLY_ADD"; k2.inputs[1].default_value = -(1 - sil)
            k2.inputs[2].default_value = 1.0; nt.links.new(k.outputs[0], k2.inputs[0])
            dk = nt.nodes.new("ShaderNodeMix"); dk.data_type = "RGBA"; dk.blend_type = "MULTIPLY"; dk.inputs[0].default_value = 1
            nt.links.new(cmix.outputs[2], dk.inputs[6])
            cc = nt.nodes.new("ShaderNodeCombineColor")
            for i in range(3): nt.links.new(k2.outputs[0], cc.inputs[i])
            nt.links.new(cc.outputs[0], dk.inputs[7]); colsock = dk.outputs[2]
        else:
            colsock = cmix.outputs[2]
        emc = nt.nodes.new("ShaderNodeEmission"); nt.links.new(colsock, emc.inputs[0])
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        mix = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(alpha, mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1])
        nt.links.new(emc.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], nt.nodes["Material Output"].inputs[0])
        return m, emc
    # sparse altocumulus/cirrus high up (only above y ~ 450 on screen, clear of the GÜNEŞ band)
    bpy.ops.mesh.primitive_plane_add(size=1)
    cl = bpy.context.object; cl.name = "Clouds"
    cl.scale = (40000, 9000, 1); cl.location = (0, 6500, 1700)      # y 2000..11000 m -> elevation > ~8.8 deg
    m, emc = cloud_mat("clouds", 700.0, (1.0, 0.45, 1.0), 0.34, (0.62, 0.26, 0.30), (1.0, 0.48, 0.20))
    C.assign(cl, m)
    # low stratus streaks just above the horizon (y ~ 850-940), backlit near the sun
    vs7 = [(-1800, 7000, 22), (1800, 7000, 22), (1800, 7000, 125), (-1800, 7000, 125)]
    st = C.mesh_obj("Stratus", vs7, [(0, 1, 2, 3)])
    ms, ems = cloud_mat("stratus", 260.0, (1.8, 1.0, 0.03), 0.47, (0.42, 0.17, 0.17), (1.0, 0.5, 0.2), sil=0.35,
                       zfade=(22.0, 125.0, ((40.0, 0.8), (62.0, 0.35), (85.0, 0.7), (105.0, 0.25))))
    C.assign(st, ms)
    st.visible_shadow = False
    for t, v in ((ctx.t0 - 0.3, 0.45), (tg - 0.2, 0.55), (tg + 1.2, 1.0), (ctx.t1 + 0.3, 1.2)):
        ems.inputs[1].default_value = v; ems.inputs[1].keyframe_insert("default_value", frame=t * 24)
    for a in ("visible_diffuse", "visible_shadow"):
        setattr(cl, a, False)
    sc["cloud_emit"] = 0
    # clouds brighten as the sun comes up
    for t, s in ((ctx.t0 - 0.3, 0.5), (tg - 0.2, 0.6), (tg + 1.2, 0.95), (ctx.t1 + 0.3, 1.1)):
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
    for t, ev in ((ctx.t0 - 0.3, -0.55), (tg - 0.1, -0.6), (tg + 0.7, -1.35), (40.15, -1.15), (ctx.t1 + 0.25, 1.7)):
        vs.exposure = ev; vs.keyframe_insert("exposure", frame=t * 24)
    comp = L.compositor(bloom=0.0, threshold=1.0, fog=0.25, fog_size=0.9)
    g = comp["fog"]
    for t, s in ((ctx.t0 - 0.3, 0.04), (tg, 0.05), (tg + 0.8, 0.07), (40.15, 0.12), (ctx.t1 + 0.25, 0.95)):
        g.inputs["Strength"].default_value = s; g.inputs["Strength"].keyframe_insert("default_value", frame=t * 24)
    prof = os.environ.get("S6_PROF", "")
    if "nosky" in prof:
        sky.sky_type = "PREETHAM"
    # world NEE is useless here (water is near-specular, the sun is a lamp) and costs ~11 s/frame
    sc.world.cycles.sampling_method = "NONE"
    if "nocomp" in prof: sc.render.use_compositing = False
    if "nodof" in prof: cam.data.dof.use_dof = False
    if "noclouds" in prof: cl.hide_render = True
    if "nomb" in prof: sc["nomb"] = 1
    return {"final_spp": 12, "preview_spp": 16, "max_bounces": 2, "diffuse_bounces": 1,
            "glossy_bounces": 1, "transmission_bounces": 0, "transparent_bounces": 4, "final_threshold": 0.04}


C.run("sh07", build)
