"""sh05 · 22.95-30.10 · underwater in a clear sunlit pond: sun through the rippling surface (Snell's window)
-> tilt down to elodea releasing O2 bubble strings -> follow one bubble up until it rises into the lens."""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from mathutils import Vector, Matrix, Quaternion
import common as C
import lib_s6 as L

SUN_EL, SUN_AZ = 74.0, 0.0          # sun high, toward +Y (Snell's-window edge just outside the opening frame)
DEPTH = 1.70                        # pond bottom
N_W = 1.333


def refracted_up():
    """Direction (from underwater) in which the sun is seen through a flat surface."""
    th_a = math.radians(90 - SUN_EL)
    th_w = math.asin(math.sin(th_a) / N_W)
    return Vector((0.0, math.sin(th_w), math.cos(th_w)))


# --------------------------------------------------------------------------- world / lights

def build_world(ctx, t_allah):
    w = bpy.context.scene.world; nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    def sky(disc):
        s = nt.nodes.new("ShaderNodeTexSky"); s.sky_type = "MULTIPLE_SCATTERING"
        s.sun_disc = disc; s.sun_elevation = math.radians(SUN_EL); s.sun_rotation = math.radians(SUN_AZ)
        s.sun_size = math.radians(1.6 if disc else 0.545); s.sun_intensity = 0.4 if disc else 1.0   # disc smeared by forward scatter
        s.air_density = 1.0; s.aerosol_density = 0.6
        return s
    s_disc, s_flat = sky(True), sky(False)
    lp = nt.nodes.new("ShaderNodeLightPath")
    # the visible sun disc only for rays that reached the sky by refraction (camera -> surface -> sky);
    # lighting rays use the disc-less sky because the sun lamp carries the direct sun.
    inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
    nt.links.new(lp.outputs["Is Shadow Ray"], inv.inputs[1])
    fac = nt.nodes.new("ShaderNodeMath"); fac.operation = "MULTIPLY"
    nt.links.new(lp.outputs["Is Transmission Ray"], fac.inputs[0]); nt.links.new(inv.outputs[0], fac.inputs[1])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    nt.links.new(fac.outputs[0], mix.inputs[0]); nt.links.new(s_flat.outputs[0], mix.inputs[6]); nt.links.new(s_disc.outputs[0], mix.inputs[7])
    bg = nt.nodes.new("ShaderNodeBackground"); bg.inputs[1].default_value = 0.35
    nt.links.new(mix.outputs[2], bg.inputs[0]); nt.links.new(bg.outputs[0], out.inputs[0])
    return bg


def build_lights(ctx, t_allah):
    # broad sun (soft: the ripples smear the sun disc)
    sun = C.sun(elev_deg=SUN_EL, azim_deg=180 + SUN_AZ, strength=1.6, kelvin_k=5600, angle_deg=4.0)
    sun.data.color = (0.62, 0.95, 0.9)      # ~1 m of water already took the reds
    L.aim_sun_lamp(sun, SUN_EL, SUN_AZ)
    # caustic gobo: a spot far up along the refracted sun ray, projecting an animated caustic web
    d_up = refracted_up()
    dist = 30.0
    sp = bpy.data.lights.new("Caustics", "SPOT")
    sp.spot_size = math.radians(16); sp.spot_blend = 0.3; sp.shadow_soft_size = 0.0
    sp.color = (0.62, 0.95, 0.9)
    o = bpy.data.objects.new("Caustics", sp); bpy.context.scene.collection.objects.link(o)
    o.location = Vector((0, 0.5, -0.9)) + d_up * dist
    C.point_at(o, (0, 0.5, -0.9))
    sp.use_nodes = True; nt = sp.node_tree
    em = nt.nodes["Emission"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    def web(scale, wspeed, sharp, seed):
        vo = nt.nodes.new("ShaderNodeTexVoronoi"); vo.voronoi_dimensions = "4D"
        vo.feature = "DISTANCE_TO_EDGE"; vo.inputs["Scale"].default_value = scale
        vo.inputs["Randomness"].default_value = 0.9
        mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Location"].default_value = (seed, seed * 1.7, 0)
        nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = scale * 0.35
        nz.inputs["Detail"].default_value = 0
        nt.links.new(tc.outputs["Normal"], nz.inputs["Vector"])
        # warp the cells so they read as liquid, not as a voronoi diagram
        wv = nt.nodes.new("ShaderNodeVectorMath"); wv.operation = "MULTIPLY_ADD"
        wv.inputs[1].default_value = (0.9 / scale, 0.9 / scale, 0)
        nt.links.new(nz.outputs["Color"], wv.inputs[0]); nt.links.new(tc.outputs["Normal"], wv.inputs[2])
        nt.links.new(wv.outputs[0], mp.inputs[0]); nt.links.new(mp.outputs[0], vo.inputs["Vector"])
        vo.inputs["W"].default_value = 0.0
        vo.inputs["W"].keyframe_insert("default_value", frame=0)
        vo.inputs["W"].default_value = wspeed * 100 / scale     # Cycles multiplies W by Scale: wspeed = cells/s
        vo.inputs["W"].keyframe_insert("default_value", frame=100 * 24)
        mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.0
        mr.inputs["From Max"].default_value = sharp; mr.inputs["To Min"].default_value = 1.0
        mr.inputs["To Max"].default_value = 0.0; mr.interpolation_type = "SMOOTHSTEP"
        nt.links.new(vo.outputs["Distance"], mr.inputs[0])
        pw = nt.nodes.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 1.6
        nt.links.new(mr.outputs[0], pw.inputs[0])
        return pw
    a = web(300.0, 0.6, 0.075, 0.0)
    ad = nt.nodes.new("ShaderNodeMath"); ad.operation = "MULTIPLY"; ad.inputs[1].default_value = 1.6
    nt.links.new(a.outputs[0], ad.inputs[0])
    ml = nt.nodes.new("ShaderNodeMath"); ml.operation = "MULTIPLY"; ml.inputs[1].default_value = 1.0
    nt.links.new(ad.outputs[0], ml.inputs[0]); nt.links.new(ml.outputs[0], em.inputs["Strength"])
    for fc in C._fcurves(nt.animation_data.action):
        for k in fc.keyframe_points: k.interpolation = "LINEAR"
    base = 10.0 * 4 * math.pi * dist * dist / 0.55
    for t, k in ((ctx.t0 - 0.3, 1.0), (t_allah - 0.1, 1.0), (t_allah + 0.5, 1.35), (ctx.t1 + 0.3, 1.3)):
        sp.energy = base * k; sp.keyframe_insert("energy", frame=t * 24)
    for t, k in ((ctx.t0 - 0.3, 1.1), (t_allah - 0.1, 1.1), (t_allah + 0.5, 1.4), (ctx.t1 + 0.3, 1.35)):
        sun.data.energy = k; sun.data.keyframe_insert("energy", frame=t * 24)
    return sun, o


FOG_SIGMA = (1.0, 0.50, 0.44)      # per-metre extinction (red goes first)
FOG_COL = (0.014, 0.090, 0.080)     # in-scatter radiance the water converges to (teal)


def add_fog(mat, glow_gain=1.6, grazing_haze=0.0, halo=0.0):
    """Cheap water fog without a volume: blend each shading point toward the in-scatter colour by the
    length of the ray segment that reached it (1 - exp(-sigma * L)). The in-scatter is
    brighter toward the surface and toward the sun (forward scattering)."""
    nt = mat.node_tree
    out = nt.nodes["Material Output"]
    if not out.inputs["Surface"].links:
        return
    src = out.inputs["Surface"].links[0].from_socket
    lp = nt.nodes.new("ShaderNodeLightPath")
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(geo.outputs["Position"], sep.inputs[0])
    zr = nt.nodes.new("ShaderNodeMapRange"); zr.inputs["From Min"].default_value = -DEPTH
    zr.inputs["From Max"].default_value = 0.0; zr.inputs["To Min"].default_value = 0.5; zr.inputs["To Max"].default_value = 1.25
    nt.links.new(sep.outputs["Z"], zr.inputs[0])
    d_up = refracted_up()
    dp = nt.nodes.new("ShaderNodeVectorMath"); dp.operation = "DOT_PRODUCT"
    dp.inputs[1].default_value = (-d_up.x, -d_up.y, -d_up.z)
    nt.links.new(geo.outputs["Incoming"], dp.inputs[0])
    cl = nt.nodes.new("ShaderNodeMath"); cl.operation = "MAXIMUM"; cl.inputs[1].default_value = 0.0
    nt.links.new(dp.outputs["Value"], cl.inputs[0])
    pw = nt.nodes.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 6.0
    nt.links.new(cl.outputs[0], pw.inputs[0])
    fw = nt.nodes.new("ShaderNodeMath"); fw.operation = "MULTIPLY_ADD"
    fw.inputs[1].default_value = glow_gain; fw.inputs[2].default_value = 1.0
    nt.links.new(pw.outputs[0], fw.inputs[0])
    g = nt.nodes.new("ShaderNodeMath"); g.operation = "MULTIPLY"
    nt.links.new(zr.outputs[0], g.inputs[0]); nt.links.new(fw.outputs[0], g.inputs[1])
    # shader mixes are scalar: blend with the luminance-weighted extinction; the teal fog colour carries the
    # colour shift (distant things go blue-green, red is lost first)
    sig_m = 0.25 * FOG_SIGMA[0] + 0.5 * FOG_SIGMA[1] + 0.25 * FOG_SIGMA[2]
    mlt = nt.nodes.new("ShaderNodeMath"); mlt.operation = "MULTIPLY"; mlt.inputs[1].default_value = -sig_m
    nt.links.new(lp.outputs["Ray Length"], mlt.inputs[0])
    if grazing_haze > 0:
        # extra extinction when the surface is seen at a grazing angle (long, scattering paths under it)
        lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.5
        gz = nt.nodes.new("ShaderNodeMath"); gz.operation = "POWER"; gz.inputs[1].default_value = 2.0
        nt.links.new(lw.outputs["Facing"], gz.inputs[0])
        gk = nt.nodes.new("ShaderNodeMath"); gk.operation = "MULTIPLY_ADD"; gk.inputs[1].default_value = -grazing_haze
        gk.inputs[2].default_value = -sig_m; nt.links.new(gz.outputs[0], gk.inputs[0])
        mlt.operation = "MULTIPLY"; nt.links.new(gk.outputs[0], mlt.inputs[1])
    ex = nt.nodes.new("ShaderNodeMath"); ex.operation = "EXPONENT"; nt.links.new(mlt.outputs[0], ex.inputs[0])
    f = nt.nodes.new("ShaderNodeMath"); f.operation = "SUBTRACT"; f.inputs[0].default_value = 1.0
    nt.links.new(ex.outputs[0], f.inputs[1])
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*FOG_COL, 1)
    mat.cycles.emission_sampling = "NONE"      # the fog term is not a light source
    nt.links.new(g.outputs[0], em.inputs["Strength"])
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(f.outputs[0], mx.inputs[0]); nt.links.new(src, mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2])
    final = mx.outputs[0]
    if halo:
        # forward-scattering halo around the sun seen from below: hot core + wide soft glow (camera rays only)
        hsum = None
        for n_, k_ in ((2500.0, halo * 25.0), (180.0, halo * 1.6), (24.0, halo * 0.12)):
            pp = nt.nodes.new("ShaderNodeMath"); pp.operation = "POWER"; pp.inputs[1].default_value = n_
            nt.links.new(cl.outputs[0], pp.inputs[0])
            kk = nt.nodes.new("ShaderNodeMath"); kk.operation = "MULTIPLY"; kk.inputs[1].default_value = k_
            nt.links.new(pp.outputs[0], kk.inputs[0])
            if hsum is None:
                hsum = kk
            else:
                a_ = nt.nodes.new("ShaderNodeMath"); a_.operation = "ADD"
                nt.links.new(hsum.outputs[0], a_.inputs[0]); nt.links.new(kk.outputs[0], a_.inputs[1]); hsum = a_
        cam_ = nt.nodes.new("ShaderNodeMath"); cam_.operation = "MULTIPLY"
        nt.links.new(hsum.outputs[0], cam_.inputs[0]); nt.links.new(lp.outputs["Is Camera Ray"], cam_.inputs[1])
        he = nt.nodes.new("ShaderNodeEmission"); he.inputs["Color"].default_value = (0.85, 0.97, 1.0, 1)
        nt.links.new(cam_.outputs[0], he.inputs["Strength"]); he.name = "sun_halo"
        ad = nt.nodes.new("ShaderNodeAddShader")
        nt.links.new(final, ad.inputs[0]); nt.links.new(he.outputs[0], ad.inputs[1]); final = ad.outputs[0]
    nt.links.new(final, out.inputs["Surface"])

# --------------------------------------------------------------------------- water

def build_surface(ctx):
    bpy.ops.mesh.primitive_plane_add(size=2)
    s = bpy.context.object; s.name = "Surface"
    oc = s.modifiers.new("Ripples", "OCEAN")
    oc.resolution = 11; oc.viewport_resolution = 4
    oc.spatial_size = 2; oc.repeat_x = 5; oc.repeat_y = 5
    oc.wind_velocity = 2.4; oc.wave_scale = 0.06; oc.choppiness = 0.9; oc.wave_scale_min = 0.0
    oc.wave_alignment = 0.3; oc.wave_direction = math.radians(30); oc.depth = 2.0; oc.random_seed = 3
    oc.use_normals = True
    oc.time = ctx.t0; oc.keyframe_insert("time", frame=0)
    oc.time = ctx.t0 + 100; oc.keyframe_insert("time", frame=100 * 24)
    for fc in C.fcurves(s):
        for k in fc.keyframe_points: k.interpolation = "LINEAR"
    s.location = (-4.0, -4.0 + 0.6, 0)
    s.cycles.use_deform_motion = False
    C.smooth_shade(s)
    m, nt, p = C.new_mat("surface"); nt.nodes.remove(p)
    g = nt.nodes.new("ShaderNodeBsdfGlass"); g.inputs["IOR"].default_value = N_W
    g.inputs["Roughness"].default_value = 0.0
    # capillary ripples on top of the simulated wavelets
    tcs = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 38.0
    nz.inputs["Detail"].default_value = 1
    smp = nt.nodes.new("ShaderNodeMapping")        # drift instead of 4D evolution (much cheaper)
    smp.inputs["Location"].default_value = (0, 0, 0); smp.inputs["Location"].keyframe_insert("default_value", frame=0)
    smp.inputs["Location"].default_value = (2.0, 1.2, 6.0); smp.inputs["Location"].keyframe_insert("default_value", frame=100 * 24)
    nt.links.new(tcs.outputs["Object"], smp.inputs["Vector"]); nt.links.new(smp.outputs[0], nz.inputs["Vector"])
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 1.0; bp.inputs["Distance"].default_value = 0.008
    nt.links.new(nz.outputs[0], bp.inputs["Height"]); nt.links.new(bp.outputs[0], g.inputs["Normal"])
    nt.links.new(g.outputs[0], nt.nodes["Material Output"].inputs[0])
    C.assign(s, m)
    s.visible_shadow = False
    s.visible_diffuse = False        # diffuse bounces see the sky directly (cheaper, same look)
    return s


def build_volume(ctx, t_allah):
    """Water body: red-absorbing, with an in-scatter 'fog' (emission) that is brighter toward the surface and
    toward the sun, plus light shafts: emission striped along the refracted sun direction."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    v = bpy.context.object; v.name = "WaterVolume"
    v.scale = (12, 12, DEPTH + 0.2); v.location = (0, 0.6, -(DEPTH + 0.2) / 2 - 0.02)
    m, nt, p = C.new_mat("water_volume"); nt.nodes.remove(p)
    outn = nt.nodes["Material Output"]
    ab = nt.nodes.new("ShaderNodeVolumeAbsorption")
    ab.inputs["Color"].default_value = (0.16, 0.66, 0.72, 1); ab.inputs["Density"].default_value = 0.7
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(geo.outputs["Position"], sep.inputs[0])
    zr = nt.nodes.new("ShaderNodeMapRange"); zr.inputs["From Min"].default_value = -DEPTH
    zr.inputs["From Max"].default_value = 0.0; zr.inputs["To Min"].default_value = 0.45; zr.inputs["To Max"].default_value = 1.3
    nt.links.new(sep.outputs["Z"], zr.inputs[0])
    # forward scattering glow toward the sun (view dependent)
    d_up = refracted_up()
    dp = nt.nodes.new("ShaderNodeVectorMath"); dp.operation = "DOT_PRODUCT"
    dp.inputs[1].default_value = (-d_up.x, -d_up.y, -d_up.z)
    nt.links.new(geo.outputs["Incoming"], dp.inputs[0])
    # Incoming points back toward the viewer, so -dot = cos(angle between view ray and sun dir)
    ng = nt.nodes.new("ShaderNodeMath"); ng.operation = "MULTIPLY"; ng.inputs[1].default_value = -1.0
    nt.links.new(dp.outputs["Value"], ng.inputs[0])
    cl = nt.nodes.new("ShaderNodeMath"); cl.operation = "MAXIMUM"; cl.inputs[1].default_value = 0.0
    nt.links.new(ng.outputs[0], cl.inputs[0])
    pw = nt.nodes.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 6.0
    nt.links.new(cl.outputs[0], pw.inputs[0])
    fw = nt.nodes.new("ShaderNodeMath"); fw.operation = "MULTIPLY_ADD"
    fw.inputs[1].default_value = 3.0; fw.inputs[2].default_value = 1.0
    nt.links.new(pw.outputs[0], fw.inputs[0])
    # shafts: noise on the plane perpendicular to the refracted ray (so stripes converge toward the sun)
    q = d_up.to_track_quat("Z", "Y")
    Mi = q.to_matrix().inverted()
    vt = nt.nodes.new("ShaderNodeVectorTransform") if False else None
    # rotate position into the ray frame with a Mapping node (rotation = inverse of q)
    mp = nt.nodes.new("ShaderNodeMapping"); mp.vector_type = "POINT"
    eul = Mi.to_euler("XYZ"); mp.inputs["Rotation"].default_value = eul
    mp.inputs["Scale"].default_value = (1, 1, 0.05)
    nt.links.new(geo.outputs["Position"], mp.inputs[0])
    sh = nt.nodes.new("ShaderNodeTexNoise"); sh.noise_dimensions = "4D"
    sh.inputs["Scale"].default_value = 7.0; sh.inputs["Detail"].default_value = 3; sh.inputs["Roughness"].default_value = 0.55
    sh.inputs["W"].default_value = 0; sh.inputs["W"].keyframe_insert("default_value", frame=0)
    sh.inputs["W"].default_value = 0.35 * 100; sh.inputs["W"].keyframe_insert("default_value", frame=100 * 24)
    nt.links.new(mp.outputs[0], sh.inputs["Vector"])
    shr = nt.nodes.new("ShaderNodeMapRange"); shr.inputs["From Min"].default_value = 0.52
    shr.inputs["From Max"].default_value = 0.75; shr.interpolation_type = "SMOOTHSTEP"
    nt.links.new(sh.outputs[0], shr.inputs[0])
    shk = nt.nodes.new("ShaderNodeMath"); shk.operation = "MULTIPLY"; shk.name = "shaft_gain"
    nt.links.new(shr.outputs[0], shk.inputs[0]); shk.inputs[1].default_value = 1.2
    # shafts fade with depth (they spread and lose contrast)
    sz = nt.nodes.new("ShaderNodeMapRange"); sz.inputs["From Min"].default_value = -1.4
    sz.inputs["From Max"].default_value = -0.05; sz.inputs["To Min"].default_value = 0.15
    nt.links.new(sep.outputs["Z"], sz.inputs[0])
    shz = nt.nodes.new("ShaderNodeMath"); shz.operation = "MULTIPLY"
    nt.links.new(shk.outputs[0], shz.inputs[0]); nt.links.new(sz.outputs[0], shz.inputs[1])
    one = nt.nodes.new("ShaderNodeMath"); one.operation = "ADD"; one.inputs[1].default_value = 1.0
    nt.links.new(shz.outputs[0], one.inputs[0])
    # total emission = fogcol * depthgain * (forward glow) * (1 + shafts)
    t1 = nt.nodes.new("ShaderNodeMath"); t1.operation = "MULTIPLY"
    nt.links.new(zr.outputs[0], t1.inputs[0]); nt.links.new(fw.outputs[0], t1.inputs[1])
    t2 = nt.nodes.new("ShaderNodeMath"); t2.operation = "MULTIPLY"
    nt.links.new(t1.outputs[0], t2.inputs[0]); nt.links.new(one.outputs[0], t2.inputs[1])
    em = nt.nodes.new("ShaderNodeEmission")
    sig = tuple(0.7 * x for x in (1 - 0.16, 1 - 0.66, 1 - 0.72))
    fog = (0.016, 0.085, 0.078)
    em.inputs["Color"].default_value = (fog[0] * sig[0], fog[1] * sig[1], fog[2] * sig[2], 1)
    nt.links.new(t2.outputs[0], em.inputs["Strength"])
    ad = nt.nodes.new("ShaderNodeAddShader")
    nt.links.new(ab.outputs[0], ad.inputs[0]); nt.links.new(em.outputs[0], ad.inputs[1])
    nt.links.new(ad.outputs[0], outn.inputs["Volume"])
    C.assign(v, m)
    for t, k in ((ctx.t0 - 0.3, 1.0), (t_allah - 0.1, 1.0), (t_allah + 0.6, 1.9), (26.0, 1.6), (ctx.t1 + 0.3, 1.4)):
        shk.inputs[1].default_value = k; shk.inputs[1].keyframe_insert("default_value", frame=t * 24)
    return v


def build_bottom():
    bpy.ops.mesh.primitive_plane_add(size=12)
    b = bpy.context.object; b.name = "Bottom"; b.location = (0, 0.6, -DEPTH)
    sub = b.modifiers.new("sub", "SUBSURF"); sub.subdivision_type = "SIMPLE"; sub.levels = 0; sub.render_levels = 5
    tex = C.ph_texture("ganges_river_pebbles", "1k")
    m = C.mat_from_textures("bottom", tex, scale=7.0, disp_scale=0.0, base_tint=(0.55, 0.62, 0.45))
    C.assign(b, m)
    # gentle mounds
    dt = bpy.data.textures.new("mound", "CLOUDS"); dt.noise_scale = 0.8
    dm = b.modifiers.new("disp", "DISPLACE"); dm.texture = dt; dm.strength = 0.18; dm.mid_level = 0.5
    return b


# --------------------------------------------------------------------------- elodea

def leaf_geom(verts, faces, uvs, base, axis, out, length, width, curl, rng):
    """Append one lanceolate, slightly keeled leaf. axis = stem tangent, out = outward direction."""
    nL, nW = 7, 2
    side = axis.cross(out).normalized()
    up = out.cross(side).normalized()
    start = len(verts)
    for i in range(nL + 1):
        v = i / nL
        # outline: widest at ~35 %, acute tip
        wv = width * (math.sin(math.pi * min(1.0, v ** 0.75)) ** 0.8) * (1 - 0.15 * v)
        along = out * (length * v)
        bend = up * (curl * length * v * v)            # curls up toward the stem tip
        for j in range(-nW, nW + 1):
            u = j / nW
            keel = -up * (0.18 * wv * (1 - abs(u)))     # midrib raised
            p = base + along + bend + side * (u * wv) + keel
            verts.append(tuple(p)); uvs.append((0.5 + 0.5 * u, v))
    row = 2 * nW + 1
    for i in range(nL):
        for j in range(row - 1):
            a = start + i * row + j
            faces.append((a, a + 1, a + row + 1, a + row))


def build_elodea(rng, stems):
    """stems: list of dict(base, tip_z, sway, phase). Returns one mesh object (stems + leaves)."""
    verts, faces, uvs = [], [], []
    sv, sf = [], []
    for st in stems:
        bx, by = st["base"]
        z0, z1 = -DEPTH + 0.02, st["tip_z"]
        H = z1 - z0
        def path(s, st=st, bx=bx, by=by, z0=z0, H=H):
            # s in [0,1] from base to tip
            sw = st["sway"]
            x = bx + sw[0] * math.sin(s * 2.2 + st["phase"]) * s + sw[2] * s * s
            y = by + sw[1] * math.sin(s * 1.7 + st["phase"] * 1.3) * s + sw[3] * s * s
            return Vector((x, y, z0 + H * s))
        # stem tube
        nseg = 60
        ring = 5
        r0 = 0.0011
        base_i = len(sv)
        for i in range(nseg + 1):
            s = i / nseg
            p = path(s)
            t = (path(min(1, s + 0.01)) - path(max(0, s - 0.01))).normalized()
            a = t.orthogonal().normalized(); bvec = t.cross(a)
            r = r0 * (1 - 0.5 * s)
            for k in range(ring):
                ang = 2 * math.pi * k / ring
                sv.append(tuple(p + (a * math.cos(ang) + bvec * math.sin(ang)) * r))
        for i in range(nseg):
            for k in range(ring):
                a0 = base_i + i * ring + k; a1 = base_i + i * ring + (k + 1) % ring
                sf.append((a0, a1, a1 + ring, a0 + ring))
        # whorls from the tip downward
        Ls = H * 1.08
        d = 0.0015
        rot = rng.random() * math.pi
        n_whorl = 0
        while d < Ls - 0.05:
            s = 1 - d / Ls
            p = path(s)
            t = (path(min(1, s + 0.005)) - path(max(0, s - 0.005))).normalized()
            a = t.orthogonal().normalized(); bvec = t.cross(a)
            age = min(1.0, d / 0.22)                       # 0 at apex -> 1 mature
            nleaf = 4 if rng.random() < 0.7 else 3
            for k in range(nleaf):
                ang = rot + 2 * math.pi * k / nleaf + rng.uniform(-0.25, 0.25)
                radial = (a * math.cos(ang) + bvec * math.sin(ang)).normalized()
                # angle from the stem: young leaves hug the apex, mature ones spread out / droop slightly
                tilt = math.radians(18 + 72 * age + rng.uniform(-10, 10) + (12 * age if rng.random() < 0.3 else 0))
                outd = (t * math.cos(tilt) + radial * math.sin(tilt)).normalized()
                length = (0.009 + 0.019 * age ** 0.6) * rng.uniform(0.85, 1.15)
                width = length * rng.uniform(0.14, 0.18)
                curl = rng.uniform(0.05, 0.25) * (1.5 - age)
                if age > 0.95 and rng.random() < 0.06:
                    continue                                # a missing / broken leaf
                leaf_geom(verts, faces, uvs, p + radial * 0.0008, t, outd, length, width, curl, rng)
                st.setdefault("leaves", []).append((p + radial * 0.0008, t.copy(), outd, length, width, curl, age))
            rot += math.pi / 4 + rng.uniform(-0.2, 0.2)
            d += 0.0025 + 0.022 * min(1.0, d / 0.18) ** 1.1 * rng.uniform(0.85, 1.15)
            n_whorl += 1
        st["path"] = path
    # leaves mesh
    me = bpy.data.meshes.new("elodea_leaves"); me.from_pydata(verts, [], faces); me.update()
    uvl = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            uvl.data[li].uv = uvs[me.loops[li].vertex_index]
    lo = C.link(bpy.data.objects.new("ElodeaLeaves", me)); C.smooth_shade(lo)
    sme = bpy.data.meshes.new("elodea_stems"); sme.from_pydata(sv, [], sf); sme.update()
    so = C.link(bpy.data.objects.new("ElodeaStems", sme)); C.smooth_shade(so)
    return lo, so


def leaf_material():
    m, nt, p = C.new_mat("elodea_leaf")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["UV"], sep.inputs[0])
    # midrib: thin paler line along u = 0.5
    du = nt.nodes.new("ShaderNodeMath"); du.operation = "SUBTRACT"; du.inputs[1].default_value = 0.5
    nt.links.new(sep.outputs["X"], du.inputs[0])
    ab = nt.nodes.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"; nt.links.new(du.outputs[0], ab.inputs[0])
    vein = nt.nodes.new("ShaderNodeMapRange"); vein.inputs["From Min"].default_value = 0.07
    vein.inputs["From Max"].default_value = 0.0; vein.interpolation_type = "SMOOTHSTEP"
    nt.links.new(ab.outputs[0], vein.inputs[0])
    # per-leaf / per-region colour variation + cell texture
    ob = nt.nodes.new("ShaderNodeTexNoise"); ob.inputs["Scale"].default_value = 9.0; ob.inputs["Detail"].default_value = 3
    nt.links.new(tc.outputs["Object"], ob.inputs["Vector"])
    cell = nt.nodes.new("ShaderNodeTexVoronoi"); cell.inputs["Scale"].default_value = 2200.0
    nt.links.new(tc.outputs["Object"], cell.inputs["Vector"])
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (0.13, 0.36, 0.05, 1); cr.color_ramp.elements[1].color = (0.34, 0.55, 0.12, 1)
    cr.color_ramp.elements.new(0.5).color = (0.21, 0.47, 0.08, 1)
    nt.links.new(ob.outputs["Fac"], cr.inputs[0])
    vm = nt.nodes.new("ShaderNodeMix"); vm.data_type = "RGBA"; vm.blend_type = "MIX"
    vm.inputs[7].default_value = (0.42, 0.62, 0.20, 1)
    vk = nt.nodes.new("ShaderNodeMath"); vk.operation = "MULTIPLY"; vk.inputs[1].default_value = 0.55
    nt.links.new(vein.outputs[0], vk.inputs[0]); nt.links.new(vk.outputs[0], vm.inputs[0])
    nt.links.new(cr.outputs[0], vm.inputs[6])
    cm = nt.nodes.new("ShaderNodeMix"); cm.data_type = "RGBA"; cm.blend_type = "MULTIPLY"
    cmr = nt.nodes.new("ShaderNodeMapRange"); cmr.inputs["To Min"].default_value = 0.88
    nt.links.new(cell.outputs["Distance"], cmr.inputs[0])
    cm.inputs[0].default_value = 1.0
    nt.links.new(vm.outputs[2], cm.inputs[6])
    cc = nt.nodes.new("ShaderNodeCombineColor"); nt.links.new(cmr.outputs[0], cc.inputs[0]); nt.links.new(cmr.outputs[0], cc.inputs[1]); nt.links.new(cmr.outputs[0], cc.inputs[2])
    nt.links.new(cc.outputs[0], cm.inputs[7])
    # older (deeper) leaves: brownish algae film + sediment specks
    gz = nt.nodes.new("ShaderNodeNewGeometry")
    sz = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(gz.outputs["Position"], sz.inputs[0])
    old = nt.nodes.new("ShaderNodeMapRange"); old.inputs["From Min"].default_value = -1.0
    old.inputs["From Max"].default_value = -1.45; nt.links.new(sz.outputs["Z"], old.inputs[0])
    sp = nt.nodes.new("ShaderNodeTexNoise"); sp.inputs["Scale"].default_value = 260.0; sp.inputs["Detail"].default_value = 2
    nt.links.new(tc.outputs["Object"], sp.inputs["Vector"])
    spr = nt.nodes.new("ShaderNodeMapRange"); spr.inputs["From Min"].default_value = 0.45; spr.inputs["From Max"].default_value = 0.7
    nt.links.new(sp.outputs[0], spr.inputs[0])
    alg = nt.nodes.new("ShaderNodeMath"); alg.operation = "MULTIPLY_ADD"; alg.inputs[2].default_value = 0.0
    nt.links.new(spr.outputs[0], alg.inputs[0]); nt.links.new(old.outputs[0], alg.inputs[1])
    am = nt.nodes.new("ShaderNodeMix"); am.data_type = "RGBA"; am.inputs[7].default_value = (0.22, 0.18, 0.07, 1)
    nt.links.new(alg.outputs[0], am.inputs[0]); nt.links.new(cm.outputs[2], am.inputs[6])
    nt.links.new(am.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.32
    p.inputs["Specular IOR Level"].default_value = 0.25       # underwater: small IOR contrast
    p.inputs["Subsurface Weight"].default_value = 0.0
    tr = nt.nodes.new("ShaderNodeBsdfTranslucent")
    tcol = nt.nodes.new("ShaderNodeMix"); tcol.data_type = "RGBA"; tcol.blend_type = "MULTIPLY"
    tcol.inputs[0].default_value = 1.0; tcol.inputs[7].default_value = (0.9, 1.25, 0.35, 1)
    nt.links.new(cm.outputs[2], tcol.inputs[6]); nt.links.new(tcol.outputs[2], tr.inputs["Color"])
    mx = nt.nodes.new("ShaderNodeMixShader"); mx.inputs[0].default_value = 0.55
    nt.links.new(p.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes["Material Output"].inputs[0])
    return m


# --------------------------------------------------------------------------- bubbles

def bubble_material():
    m, nt, p = C.new_mat("o2_bubble"); nt.nodes.remove(p)
    g = nt.nodes.new("ShaderNodeBsdfGlass"); g.inputs["IOR"].default_value = 1.0 / N_W   # air in water
    g.inputs["Roughness"].default_value = 0.0
    nt.links.new(g.outputs[0], nt.nodes["Material Output"].inputs[0])
    return m


def rise_v(r):
    """Terminal rise speed (m/s) for an air bubble of radius r (m) in water (approx. 0.5 mm..2 mm)."""
    return min(0.30, 0.07 + 110.0 * r)


def bubble_track(src, t_emit, r, grow, rng, t_end):
    """Positions/scales sampled per frame for one bubble: grows at src during [t_emit, t_emit+grow], then rises."""
    t_det = t_emit + grow
    vT = rise_v(r)
    amp = (0.25 + 0.6 * rng.random()) * r * (1.0 if r > 0.6e-3 else 0.4)
    fz = 4 + 4 * rng.random(); ph = rng.random() * 6.28
    drift = Vector((rng.uniform(-0.004, 0.004), rng.uniform(-0.004, 0.004), 0))
    def at(t):
        if t < t_emit:
            return None
        if t < t_det:
            g = C.smooth((t - t_emit) / grow) ** 0.7
            return src + Vector((0, 0, r * g)), max(0.02, g)
        dt = t - t_det
        tau = 0.08
        zt = vT * (dt - tau * (1 - math.exp(-dt / tau)))
        wob = Vector((amp * math.sin(2 * math.pi * fz * dt + ph), amp * math.cos(2 * math.pi * fz * 0.8 * dt + ph), 0))
        return src + Vector((0, 0, r)) + Vector((0, 0, zt)) + wob * min(1, dt / 0.15) + drift * dt, 1.0
    return at


def leaf_point(lf, v, u):
    """Point on a leaf (same parametrisation as leaf_geom): v along 0..1, u across -1..1; plus its normal."""
    base, axis, out, length, width, curl, age = lf
    side = axis.cross(out).normalized(); up = out.cross(side).normalized()
    wv = width * (math.sin(math.pi * min(1.0, v ** 0.75)) ** 0.8) * (1 - 0.15 * v)
    pt = base + out * (length * v) + up * (curl * length * v * v) + side * (u * wv)
    return pt, up


def build_pearls(stems_sel, rng, mat, n_max=520):
    """'Pearling': tiny O2 bubbles clinging to leaf tips and edges of the actively photosynthesising crowns."""
    bpy.ops.mesh.primitive_ico_sphere_add(radius=1.0, subdivisions=2)
    proto = bpy.context.object; pv = [v.co.copy() for v in proto.data.vertices]
    pf = [tuple(f.vertices) for f in proto.data.polygons]; bpy.data.objects.remove(proto)
    verts, faces = [], []
    pts = []
    for st in stems_sel:
        for lf in st.get("leaves", []):
            hero = st is stems_sel[0]
            if lf[6] > (0.9 if hero else 0.6) or rng.random() > (0.95 if hero else 0.3):
                continue
            k = rng.random()
            if k < 0.55:
                v, u = rng.uniform(0.88, 1.0), rng.uniform(-0.2, 0.2)          # at the tip
            else:
                v, u = rng.uniform(0.35, 0.85), rng.choice((-1, 1)) * rng.uniform(0.75, 1.0)   # on an edge
            pt, nrm = leaf_point(lf, v, u)
            pts.append((pt, nrm))
    rng.shuffle(pts)
    for pt, nrm in pts[:n_max]:
        r = rng.uniform(0.25e-3, 0.75e-3) * (1.6 if rng.random() < 0.08 else 1.0)
        c = pt + nrm * (r * 0.8 * (1 if rng.random() < 0.5 else -1))
        b0 = len(verts)
        verts += [tuple(c + Vector((q.x * r, q.y * r, q.z * r * 0.92))) for q in pv]
        faces += [tuple(b0 + i for i in f) for f in pf]
    me = bpy.data.meshes.new("pearls"); me.from_pydata(verts, [], faces); me.update()
    o = C.link(bpy.data.objects.new("Pearls", me)); C.smooth_shade(o); C.assign(o, mat)
    o.cycles.use_motion_blur = False
    print(f"[sh05] pearls: {min(len(pts), n_max)}")
    return o


def build_bubbles(ctx, streams, hero, rng):
    """streams: list of (src Vector, period, r_mean). Bubbles are keyframed objects sharing one sphere mesh."""
    mat = bubble_material()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, segments=24, ring_count=12)
    proto = bpy.context.object; me = proto.data; C.smooth_shade(proto); C.assign(proto, mat)
    bpy.data.objects.remove(proto)
    col = C.collection("Bubbles")
    f_a, f_b = ctx.f0 - 3, ctx.f1 + 3
    count = 0
    def make(at, r, flat, name):
        nonlocal count
        o = bpy.data.objects.new(name, me); col.objects.link(o)
        hidden_before = True
        for f in range(f_a, f_b + 1):
            st = at(f / 24.0)
            if st is None:
                o.location = (0, 0, -5); o.scale = (1e-5,) * 3
            else:
                pos, g = st
                if pos.z > -0.004:                         # reached the surface: vanish
                    o.location = (pos.x, pos.y, -5); o.scale = (1e-5,) * 3
                else:
                    o.location = pos; o.scale = (r * g, r * g, r * g * flat)
            o.keyframe_insert("location", frame=f); o.keyframe_insert("scale", frame=f)
        for fc in C.fcurves(o):
            for k in fc.keyframe_points: k.interpolation = "LINEAR"
        count += 1
        return o
    for si, (src, period, rm) in enumerate(streams):
        t = ctx.t0 - 6.0 + rng.random() * period
        while t < ctx.t1 + 0.3:
            r = rm * rng.uniform(0.8, 1.2)
            grow = period * rng.uniform(0.6, 0.85)
            at = bubble_track(src, t, r, grow, rng, ctx.t1)
            # skip bubbles whose whole life is outside the shot (cheap cull)
            if at(ctx.t0 - 0.3) is not None and at(ctx.t0 - 0.3)[0].z > -0.004:
                t += period * rng.uniform(0.85, 1.15); continue
            make(at, r, 0.9 if r > 0.6e-3 else 0.97, f"bub_{si}_{count}")
            t += period * rng.uniform(0.85, 1.15)
    # hero
    hsrc, ht_emit, hr, hgrow = hero
    hat = bubble_track(hsrc, ht_emit, hr, hgrow, random.Random(99), ctx.t1)
    ho = make(hat, hr, 0.86, "HeroBubble")
    print(f"[sh05] bubbles: {count}")
    return ho, hat


# --------------------------------------------------------------------------- particulates

def build_particles(rng, n=700):
    mat = C.principled("speck", base=(0.55, 0.52, 0.42), rough=0.6, sss=0.0)
    bpy.ops.mesh.primitive_ico_sphere_add(radius=1.0, subdivisions=1)
    proto = bpy.context.object; me = proto.data; C.assign(proto, mat); bpy.data.objects.remove(proto)
    col = C.collection("Specks")
    for i in range(n):
        o = bpy.data.objects.new(f"speck_{i}", me); col.objects.link(o)
        p = Vector((rng.uniform(-0.55, 0.55), rng.uniform(-0.2, 1.1), rng.uniform(-1.35, -0.06)))
        s = rng.uniform(0.00012, 0.0005) * (3 if rng.random() < 0.05 else 1)
        o.scale = (s, s * rng.uniform(0.6, 1.4), s * rng.uniform(0.5, 1.0))
        o.rotation_euler = (rng.random() * 6, rng.random() * 6, rng.random() * 6)
        v = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.6, 0.8))) * 0.006
        o.location = p; o.keyframe_insert("location", frame=0)
        o.location = p + v * 40; o.keyframe_insert("location", frame=40 * 24)
        for fc in C.fcurves(o):
            for k in fc.keyframe_points: k.interpolation = "LINEAR"
            fc.extrapolation = "LINEAR"
        for a in ("visible_shadow",):
            setattr(o, a, False)



def t2f_(t):
    return C.t2f(t)


def build_shafts(ctx, t_allah, rng, n=56):
    """Fake god rays: thin soft emissive cylinders along the refracted sun ray, camera-visible only.
    They converge on the sun in perspective when looking up, flicker with the ripples and fade with depth."""
    d_dn = -refracted_up()
    m, nt, p = C.new_mat("shaft"); nt.nodes.remove(p)
    m.cycles.emission_sampling = "NONE"        # camera-only glow, must not become a sampled mesh light
    out = nt.nodes["Material Output"]
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.5
    edge = nt.nodes.new("ShaderNodeMath"); edge.operation = "SUBTRACT"; edge.inputs[0].default_value = 1.0
    nt.links.new(lw.outputs["Facing"], edge.inputs[1])        # 1 where the cylinder faces the camera
    soft = nt.nodes.new("ShaderNodeMath"); soft.operation = "POWER"; soft.inputs[1].default_value = 2.5
    nt.links.new(edge.outputs[0], soft.inputs[0])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    # Generated Z: 0 at the bottom end, 1 at the surface end -> brighter near the surface, soft ends
    fade = nt.nodes.new("ShaderNodeFloatCurve")
    cv = fade.mapping.curves[0]
    cv.points[0].location = (0.0, 0.0); cv.points[1].location = (1.0, 0.0)
    for x, y in ((0.25, 0.25), (0.7, 0.8), (0.93, 1.0)):
        cv.points.new(x, y)
    fade.mapping.update()
    nt.links.new(sep.outputs["Z"], fade.inputs["Value"])
    ob = nt.nodes.new("ShaderNodeObjectInfo")
    fl = nt.nodes.new("ShaderNodeTexNoise"); fl.noise_dimensions = "2D"; fl.inputs["Scale"].default_value = 1.0
    fl.inputs["Detail"].default_value = 1
    fm = nt.nodes.new("ShaderNodeMapping")
    fm.inputs["Location"].default_value = (0, 0, 0); fm.inputs["Location"].keyframe_insert("default_value", frame=0)
    fm.inputs["Location"].default_value = (0, 260.0, 0); fm.inputs["Location"].keyframe_insert("default_value", frame=100 * 24)
    cmb = nt.nodes.new("ShaderNodeCombineXYZ")
    rnd = nt.nodes.new("ShaderNodeMath"); rnd.operation = "MULTIPLY"; rnd.inputs[1].default_value = 37.0
    nt.links.new(ob.outputs["Random"], rnd.inputs[0]); nt.links.new(rnd.outputs[0], cmb.inputs[0])
    nt.links.new(cmb.outputs[0], fm.inputs[0]); nt.links.new(fm.outputs[0], fl.inputs["Vector"])
    flk = nt.nodes.new("ShaderNodeMapRange"); flk.inputs["From Min"].default_value = 0.3
    flk.inputs["From Max"].default_value = 0.7; flk.inputs["To Min"].default_value = 0.0
    nt.links.new(fl.outputs[0], flk.inputs[0])
    a1 = nt.nodes.new("ShaderNodeMath"); a1.operation = "MULTIPLY"
    nt.links.new(soft.outputs[0], a1.inputs[0]); nt.links.new(fade.outputs[0], a1.inputs[1])
    a2 = nt.nodes.new("ShaderNodeMath"); a2.operation = "MULTIPLY"
    nt.links.new(a1.outputs[0], a2.inputs[0]); nt.links.new(flk.outputs[0], a2.inputs[1])
    gain = nt.nodes.new("ShaderNodeMath"); gain.operation = "MULTIPLY"; gain.name = "shaft_gain"
    nt.links.new(a2.outputs[0], gain.inputs[0])
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (0.70, 0.97, 0.92, 1)
    nt.links.new(gain.outputs[0], em.inputs["Strength"])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    ad = nt.nodes.new("ShaderNodeAddShader")
    nt.links.new(tr.outputs[0], ad.inputs[0]); nt.links.new(em.outputs[0], ad.inputs[1])
    nt.links.new(ad.outputs[0], out.inputs["Surface"])
    for t, k in ((ctx.t0 - 0.3, 1.2), (t_allah - 0.1, 1.2), (t_allah + 0.6, 2.0), (24.9, 0.5), (25.4, 0.2), (27.5, 0.15), (28.3, 0.0)):
        gain.inputs[1].default_value = k; gain.inputs[1].keyframe_insert("default_value", frame=t * 24)
    col = C.collection("Shafts")
    for i in range(n):
        r = rng.uniform(0.012, 0.045)
        L = rng.uniform(0.9, 1.7)
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=r, depth=L, end_fill_type="NOTHING")
        o = bpy.context.object; o.name = f"shaft_{i}"
        for c in list(o.users_collection): c.objects.unlink(o)
        col.objects.link(o)
        C.smooth_shade(o)
        # top end just under the surface, spread over the area the camera looks through
        if i < 18:   # around the opening view (looking up), so rays stream down past the lens
            a_ = rng.uniform(0, 6.283); r_ = rng.uniform(0.06, 0.45)
            top = Vector((math.cos(a_) * r_, 0.12 + math.sin(a_) * r_, -0.02))
        else:
            top = Vector((rng.uniform(-1.1, 1.1), rng.uniform(-0.6, 1.6), -0.02))
        o.rotation_mode = "QUATERNION"
        # local +Z toward the surface so Generated z = 1 is the top end
        o.rotation_quaternion = (-d_dn).to_track_quat("Z", "Y")
        o.location = top + d_dn * (L / 2)
        C.assign(o, m)
        for a in ("visible_diffuse", "visible_glossy", "visible_transmission", "visible_volume_scatter", "visible_shadow"):
            setattr(o, a, False)
        o.cycles.use_motion_blur = False
        # shafts only matter while the view looks across the water column; drop them for the close bubble chase
        o.hide_render = False; o.keyframe_insert("hide_render", frame=t2f_(28.4))
        o.hide_render = True; o.keyframe_insert("hide_render", frame=t2f_(28.4) + 1)
    return m

# --------------------------------------------------------------------------- build

def build(ctx):
    rng = random.Random(ctx.seed)
    t_allah = ctx.word("Allah")
    t_oks = ctx.word("oksijenler")
    build_world(ctx, t_allah)
    build_lights(ctx, t_allah)
    build_surface(ctx)
    # pond walls far away: rays that would escape sideways end in fully fogged water
    hx, z0, z1 = 4.3, -DEPTH - 0.1, 0.06      # inside the simulated surface patch, poking out of the water
    vs_ = [(-hx, -hx + 0.6, z0), (hx, -hx + 0.6, z0), (hx, hx + 0.6, z0), (-hx, hx + 0.6, z0),
           (-hx, -hx + 0.6, z1), (hx, -hx + 0.6, z1), (hx, hx + 0.6, z1), (-hx, hx + 0.6, z1)]
    wall = C.mesh_obj("PondWalls", vs_, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])   # open top/bottom
    C.assign(wall, C.principled("pond_wall", base=(0.02, 0.03, 0.02), rough=0.9))
    wall.visible_shadow = False
    # (build_volume kept for reference: a ray-marched/homogeneous water volume cost ~25-40 % of the frame;
    #  replaced by add_fog() on every material)
    build_bottom()

    # ---- plants: a hero clump in front of the camera, a midground bed, a far bed, a defocused foreground stem
    stems = []
    def add(x, y, tip, sway=0.05):
        stems.append(dict(base=(x, y), tip_z=tip, phase=rng.random() * 6.28,
                          sway=(rng.uniform(-sway, sway), rng.uniform(-sway, sway), rng.uniform(-sway, sway), rng.uniform(-sway, sway))))
    HERO_APEX = Vector((0.0, 0.50, -0.93))
    add(HERO_APEX.x, HERO_APEX.y, HERO_APEX.z, sway=0.0)
    stems[0]["sway"] = (0.02, -0.015, 0.0, 0.0)
    for i in range(26):                       # hero clump
        a = rng.random() * 6.28; rr = 0.03 + 0.16 * rng.random()
        add(math.cos(a) * rr * 1.3, 0.55 + math.sin(a) * rr, rng.uniform(-1.20, -0.86))
    for i in range(44):                       # midground bed
        add(rng.uniform(-0.9, 0.9), rng.uniform(0.85, 1.9), rng.uniform(-1.35, -0.75), 0.08)
    for i in range(14):                       # far bed (fog)
        add(rng.uniform(-2.2, 2.2), rng.uniform(2.0, 4.5), rng.uniform(-1.4, -0.6), 0.1)
    for x, y, tip in ((-0.095, 0.15, -0.47), (0.105, 0.13, -0.50)):
        add(x, y, tip, 0.03)                  # behind the start position: crowns silhouetted at the bottom edge looking up
    for i in range(3):                        # foreground, close to the lens in the tilt-down
        add(rng.uniform(-0.28, -0.16) if i % 2 else rng.uniform(0.14, 0.24), rng.uniform(0.18, 0.3), rng.uniform(-1.0, -0.8), 0.03)
    leaves, stemso = build_elodea(rng, stems)
    C.assign(leaves, leaf_material())
    C.assign(stemso, C.principled("elodea_stem", base=(0.22, 0.42, 0.10), rough=0.4, spec=0.25, sss=0.0))
    # gentle sway of the whole bed (current)
    for ob, sd in ((leaves, 3), (stemso, 3)):
        ob.keyframe_insert("rotation_euler", frame=0)
        for fc in C.fcurves(ob):
            m = fc.modifiers.new("NOISE"); m.scale = 24 * 2.5; m.strength = 0.004; m.phase = sd + fc.array_index

    # ---- O2 bubble streams on leaf tips/axils of the hero clump + midground
    streams = []
    hp = stems[0]["path"]
    for s, per, rm in ((0.985, 0.26, 0.6e-3), (0.97, 0.3, 0.75e-3), (0.955, 0.34, 0.95e-3), (0.94, 0.22, 0.55e-3),
                       (0.93, 0.4, 0.7e-3), (0.91, 0.28, 0.8e-3), (0.90, 0.33, 1.05e-3), (0.88, 0.25, 0.65e-3)):
        p = hp(s); off = Vector((rng.uniform(-0.009, 0.009), rng.uniform(-0.009, 0.009), 0))
        streams.append((p + off, per, rm))
    for st in stems[1:27]:
        for _ in range(2 if rng.random() < 0.5 else 1):
            if rng.random() < 0.8:
                s = rng.uniform(0.86, 0.99)
                p = st["path"](s) + Vector((rng.uniform(-0.01, 0.01), rng.uniform(-0.01, 0.01), 0))
                streams.append((p, rng.uniform(0.2, 0.55), rng.uniform(0.5e-3, 1.0e-3)))
    for st in stems[27:71]:
        if rng.random() < 0.22:
            s = rng.uniform(0.85, 0.99)
            streams.append((st["path"](s), rng.uniform(0.35, 0.9), rng.uniform(0.5e-3, 1.0e-3)))
    # hero bubble: an accumulated ~3 mm bubble swelling at a leaf axil just under the apex, detaching just before
    # "oksijenler" so the camera can pick it up and follow it to the lens
    hsrc = hp(0.965) + Vector((0.006, -0.004, 0))
    hr = 1.7e-3
    streams.append((hsrc + Vector((0.0015, 0.001, 0)), 0.30, 1.0e-3))   # the hero's own string (follows it up)
    hero = (hsrc, t_oks - 1.6, hr, 1.45)
    hobj, hat = build_bubbles(ctx, streams, hero, rng)
    build_pearls(stems[:27], rng, bpy.data.materials["o2_bubble"])
    trk = C.empty("TRK_bubble", (0, 0, 0)); trk.parent = hobj
    trk.scale = (1 / 1.0,) * 3

    build_particles(rng, n=1000)
    build_shafts(ctx, t_allah, rng)

    # ---- camera
    cam = C.camera("cam", lens=28, loc=(0, 0, -0.8), fstop=3.5, focus=0.6, clip_start=0.002)
    cam.rotation_mode = "QUATERNION"
    foc = C.empty("cam_focus", (0, 0, 0)); cam.data.dof.focus_object = foc
    up_dir = refracted_up()
    t_tilt0, t_tilt1 = t_allah + 0.45, t_oks - 0.75
    t_follow = t_oks - 0.12
    def hero_pos(t):
        st = hat(t)
        return st[0] if st else hsrc
    P0 = Vector((0.0, -0.05, -0.78))
    apex = stems[0]["path"](1.0)
    PB = apex + Vector((0.004, -0.115, -0.035))          # just below/in front of the hero crown
    PB2 = apex + Vector((0.002, -0.095, -0.03))          # slow push-in while the bubbles grow
    def pose(t):
        # A: looking up at the sun through the surface (slow drift)
        if t <= t_tilt0:
            u = C.remap(t, ctx.t0 - 0.3, t_tilt0, lambda x: x)
            loc = P0 + Vector((0.0, 0.03 * u, -0.02 * u))
            return loc, loc + up_dir * 2.0, 0.85
        A_end = P0 + Vector((0.0, 0.03, -0.02))
        # B: tilt down while gliding to the hero crown, then a slow push-in (bubbles growing on the leaves)
        if t <= t_follow:
            u = C.remap(t, t_tilt0, t_tilt1, C.smoother)
            if t <= t_tilt1:
                loc = A_end.lerp(PB, C.smoother(C.remap(t, t_tilt0 + 0.15, t_tilt1, lambda x: x)))
            else:
                loc = PB.lerp(PB2, C.smooth(C.remap(t, t_tilt1, t_follow + 0.6, lambda x: x)))
            d0 = up_dir; d1 = (hsrc + Vector((0, 0, 0.012)) - loc).normalized()
            q = d0.to_track_quat("-Z", "Y").slerp(d1.to_track_quat("-Z", "Y"), u)
            fd = C.lerp(0.85, (hsrc - loc).length, C.smooth(u))
            return loc, loc + q @ Vector((0, 0, -1)), fd
        # C/D: rise with the hero bubble; camera swings from slightly below it to slightly above and closes in
        h = hero_pos(t)
        k = C.smoother(C.remap(t, t_follow, ctx.t1 - 0.02, lambda x: x))
        ang = math.radians(C.lerp(-15, 30, k))
        locB = PB.lerp(PB2, C.smooth(C.remap(t, t_tilt1, t_follow + 0.6, lambda x: x)))
        d_start = (h - locB).length
        dist = C.lerp(d_start, 0.0115, k ** 1.25)
        side = Vector((0.0, -1.0, 0.0))
        off = (side * math.cos(ang) + Vector((0, 0, 1)) * math.sin(ang)) * dist
        loc = h + off
        b = C.smooth(C.remap(t, t_follow, t_follow + 0.7, lambda x: x))
        loc = locB.lerp(loc, b)
        tgt = (hsrc + Vector((0, 0, 0.012))).lerp(h, C.smooth(C.remap(t, t_follow - 0.05, t_follow + 0.4, lambda x: x)))
        return loc, tgt, (h - loc).length
    last_q = None
    for f in range(ctx.f0 - 3, ctx.f1 + 4):
        t = f / 24.0
        loc, tgt, fd = pose(t)
        cam.location = loc
        d = (tgt - loc).normalized()
        q = d.to_track_quat("-Z", "Y")
        if last_q is not None and last_q.dot(q) < 0:
            q.negate()
        cam.rotation_quaternion = q; last_q = q
        cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_quaternion", frame=f)
        foc.location = loc + d * fd; foc.keyframe_insert("location", frame=f)
    C.handheld(cam, amp_loc=0.0005, amp_rot=0.0, speed=0.4, seed=5)

    sc = bpy.context.scene
    if os.environ.get("S6_DEBUG") == "caustics":
        bpy.data.objects["Sun"].data.animation_data_clear(); bpy.data.objects["Sun"].data.energy = 0
    if os.environ.get("S6_DEBUG") in ("caustics", "lights"):
        sc.world.node_tree.nodes["Background"].inputs[1].default_value = 0.0
        vm = bpy.data.materials["water_volume"].node_tree.nodes["Emission"]
        for l in list(vm.inputs["Strength"].links): bpy.data.materials["water_volume"].node_tree.links.remove(l)
        vm.inputs["Strength"].default_value = 0.0
        print("SURF shadow", bpy.data.objects["Surface"].visible_shadow)
    vs = sc.view_settings
    for t, ev in ((ctx.t0 - 0.3, -2.4), (t_tilt0, -2.4), (t_tilt0 + 1.3, 0.2), (ctx.t1 + 0.3, 0.3)):
        vs.exposure = ev; vs.keyframe_insert("exposure", frame=t * 24)      # camera exposure follows the tilt
    comp = L.compositor(bloom=0.0, fog=0.06, fog_size=0.8, threshold=1.5)
    g = comp["fog"]
    for t, v in ((ctx.t0 - 0.3, 0.32), (t_allah - 0.1, 0.32), (t_allah + 0.5, 0.42), (t_tilt0 + 0.3, 0.3), (t_tilt0 + 1.2, 0.06)):
        g.inputs["Strength"].default_value = v; g.inputs["Strength"].keyframe_insert("default_value", frame=t * 24)
    g.inputs["Threshold"].default_value = 1.0
    nt_c = sc.compositing_node_group
    stk = nt_c.nodes.new("CompositorNodeGlare")
    stk.inputs["Type"].default_value = "Streaks"; stk.inputs["Quality"].default_value = "High"
    stk.inputs["Threshold"].default_value = 3.0; stk.inputs["Streaks"].default_value = 6
    stk.inputs["Fade"].default_value = 0.88
    outn = [n for n in nt_c.nodes if n.bl_idname == "NodeGroupOutput"][0]
    src_ = outn.inputs[0].links[0].from_socket
    nt_c.links.new(src_, stk.inputs["Image"]); nt_c.links.new(stk.outputs["Image"], outn.inputs[0])
    for t, v in ((ctx.t0 - 0.3, 0.10), (t_allah - 0.1, 0.10), (t_allah + 0.5, 0.16), (t_tilt0 + 0.3, 0.08), (t_tilt0 + 1.0, 0.0)):
        stk.inputs["Strength"].default_value = v; stk.inputs["Strength"].keyframe_insert("default_value", frame=t * 24)
    # ---- render-cost choices (see NOTES): homogeneous water volume (analytic, no ray marching), FAST denoise
    # prefilter, no motion blur on things that move < 1 px per shutter (specks, plants, distant bubbles)
    for m in list(bpy.data.materials):
        if m.name != "shaft":
            add_fog(m, grazing_haze=2.6 if m.name == "surface" else 0.0, halo=1.0 if m.name == "surface" else 0.0)
    # (denoise prefilter stays ACCURATE: FAST leaves grain in defocused bubble bokeh)
    if ctx.mode == "final" and not ctx.args.res:
        # mostly defocus/haze: director allows 80 % resolution (post upscales) to afford clean bokeh samples
        bpy.app.handlers.render_init.append(lambda *_: setattr(bpy.context.scene.render, "resolution_percentage", 80))
    for o in bpy.data.collections["Specks"].objects: o.cycles.use_motion_blur = False
    for o in (leaves, stemso): o.cycles.use_motion_blur = False
    apex0 = stems[0]["path"](1.0)
    for o in bpy.data.collections["Bubbles"].objects:
        fc = [f for f in C.fcurves(o) if f.data_path == "location"]
        p0 = Vector([f.evaluate(ctx.f0 + 90) for f in fc]) if len(fc) == 3 else apex0
        if (Vector((p0.x, p0.y, 0)) - Vector((apex0.x, apex0.y, 0))).length > 0.35 and o.name != "HeroBubble":
            o.cycles.use_motion_blur = False
    prof = os.environ.get("S6_PROF", "")
    if "fastdn" in prof:
        def _dn(*_):
            bpy.context.scene.cycles.denoising_prefilter = "FAST"
        bpy.app.handlers.render_init.append(_dn)
    if "nodn" in prof:
        def _dn2(*_):
            bpy.context.scene.cycles.use_denoising = False
        bpy.app.handlers.render_init.append(_dn2)
    if "nocaust" in prof: bpy.data.lights["Caustics"].use_nodes = False
    lowb = "lowb" in prof
    if "nomb" in prof:
        bpy.app.handlers.render_init.append(lambda *_: setattr(bpy.context.scene.render, "use_motion_blur", False))
    if "nodof" in prof: cam.data.dof.use_dof = False
    if "nocomp" in prof: sc.render.use_compositing = False
    if "nowmis" in prof: sc.world.cycles.sampling_method = "NONE"
    if "nobub" in prof:
        for o in bpy.data.collections["Bubbles"].objects: o.hide_render = True
    if "nospeck" in prof:
        for o in bpy.data.collections["Specks"].objects: o.hide_render = True
    if "nosurf" in prof: bpy.data.objects["Surface"].hide_render = True
    if "noplant" in prof:
        bpy.data.objects["ElodeaLeaves"].hide_render = True; bpy.data.objects["ElodeaStems"].hide_render = True
    if "noshaft" in prof:
        for o in bpy.data.collections["Shafts"].objects: o.hide_render = True
    if "nobot" in prof: bpy.data.objects["Bottom"].hide_render = True
    return {"final_spp": 12, "preview_spp": 20, "clamp_direct": 12.0, "max_bounces": 6, "diffuse_bounces": 1, "glossy_bounces": 1,
            "transmission_bounces": 6, "transparent_bounces": 12, "volume_bounces": 0, "volume_step_rate": 8.0,
            "clamp_indirect": 2.5}


C.run("sh05", build)
