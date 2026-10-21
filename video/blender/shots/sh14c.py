"""sh14c - "cansiz, suursuz, sefkatsiz tabiatla izah edebilir mi?"

A cold, desaturated grey-blue desert under a flat overcast sky. One continuous crane/dolly move:
close on a dead granite boulder ("cansiz") -> sand streams aimlessly across cracked mud ("suursuz")
-> rise/pull back to a wide empty expanse with dead wood ("sefkatsiz") -> stop and stare at the
stone ("izah edebilir mi").  Scale in metres; the hero boulder sits at the origin.
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
import bpy
from mathutils import Vector, Euler
import common as C
import lib_s8 as L

COLD = (0.80, 0.90, 1.06)            # white balance push toward blue
DESAT = 0.30                          # remaining saturation of every albedo
WIND = Vector((-1.0, 0.25, 0.0)).normalized()   # sand travels toward -X (screen left)
MODE = ["stills"]


# --------------------------------------------------------------------------- helpers

def cool_material(mat, sat=DESAT, value=1.0, tint=COLD, lift=0.0):
    """Desaturate + cool an imported scan material by inserting HSV + multiply before Base Color."""
    if not mat or not mat.node_tree:
        return
    nt = mat.node_tree
    for p in [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"]:
        inp = p.inputs["Base Color"]
        if not inp.links:
            c = inp.default_value
            g = (c[0] + c[1] + c[2]) / 3
            inp.default_value = tuple(g + (c[i] - g) * sat for i in range(3)) + (1,)
            continue
        src = inp.links[0].from_socket
        hsv = nt.nodes.new("ShaderNodeHueSaturation")
        hsv.inputs["Saturation"].default_value = sat
        hsv.inputs["Value"].default_value = value
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
        mix.inputs[0].default_value = 1.0
        mix.inputs[7].default_value = (*tint, 1)
        nt.links.new(src, hsv.inputs["Color"])
        nt.links.new(hsv.outputs[0], mix.inputs[6])
        out_sock = mix.outputs[2]
        if lift > 0:      # pull a dark scan toward a weathered pale grey, keeping its texture/cracks
            lm = nt.nodes.new("ShaderNodeMix"); lm.data_type = "RGBA"; lm.blend_type = "SCREEN"
            lm.inputs[0].default_value = lift
            lm.inputs[7].default_value = (0.55, 0.57, 0.60, 1)
            nt.links.new(out_sock, lm.inputs[6])
            out_sock = lm.outputs[2]
        nt.links.new(out_sock, inp)


def import_model(name, res, loc=(0, 0, 0), rot_z=0.0, scale=1.0, sat=DESAT, value=1.0, sink=0.0, lift=0.0):
    objs = C.ph_model(name, res)
    meshes = [o for o in objs if o.type == "MESH"]
    roots = [o for o in objs if o.parent is None]
    for o in meshes:
        for m in o.data.materials:
            cool_material(m, sat, value, lift=lift)
    # put the lowest point on the ground at loc
    import mathutils
    for r in roots:
        r.scale = (scale, scale, scale)
        r.rotation_euler = (r.rotation_euler[0], r.rotation_euler[1], rot_z)
    bpy.context.view_layer.update()
    zmin = min((o.matrix_world @ Vector(c)).z for o in meshes for c in o.bound_box)
    cx = sum((o.matrix_world @ Vector(c)).x for o in meshes for c in o.bound_box) / (8 * len(meshes))
    cy = sum((o.matrix_world @ Vector(c)).y for o in meshes for c in o.bound_box) / (8 * len(meshes))
    for r in roots:
        r.location = (r.location.x + loc[0] - cx, r.location.y + loc[1] - cy, r.location.z + loc[2] - zmin - sink)
    if os.environ.get("S8_DBG"):
        bpy.context.view_layer.update()
        for o in objs:
            zs = [(o.matrix_world @ Vector(c)).z for c in o.bound_box] if o.type == "MESH" else [0]
            print("DBG", name, o.name, o.type, o.parent.name if o.parent else None, round(min(zs), 2), round(max(zs), 2),
                  tuple(round(v, 2) for v in o.matrix_world.translation), flush=True)
    return meshes


def aerial(nb, surface, dist_scale=2600.0, color=(0.56, 0.62, 0.70), strength=1.0):
    """Cold grey distance haze: mix toward the horizon colour by 1-exp(-d/L)."""
    cam = nb.n("ShaderNodeCameraData")
    fac = nb.math("SUBTRACT", 1.0, nb.math("EXPONENT", nb.math("MULTIPLY", cam.outputs["View Distance"], -1.0 / dist_scale)))
    em = nb.n("ShaderNodeEmission", inputs={"Color": (*color, 1), "Strength": strength})
    mx = nb.n("ShaderNodeMixShader")
    nb.l(fac, mx.inputs[0]); nb.l(surface, mx.inputs[1]); nb.l(em.outputs[0], mx.inputs[2])
    return mx.outputs[0]


# --------------------------------------------------------------------------- world

def build_world(mode):
    if os.environ.get("S8_PLAINW"):
        C.world_color((0.6, 0.65, 0.7)); return
    path = C.ph_hdri("kloofendal_overcast_puresky", os.environ.get("S8_HRES", "8k" if mode == "final" else "4k"), "hdr")
    w = bpy.context.scene.world
    nt = w.node_tree
    nt.nodes.clear()
    nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputWorld")
    tc = nb.n("ShaderNodeTexCoord")
    mp = nb.n("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value[2] = math.radians(150)
    nb.l(tc.outputs["Generated"], mp.inputs["Vector"])
    env = nb.n("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(path, check_existing=True)
    nb.l(mp.outputs[0], env.inputs["Vector"])
    hsv = nb.n("ShaderNodeHueSaturation", inputs={"Saturation": 0.25})
    nb.l(env.outputs["Color"], hsv.inputs["Color"])
    col = nb.mixc(1.0, hsv.outputs[0], COLD, blend="MULTIPLY")
    bg = nb.n("ShaderNodeBackground", inputs={"Strength": 1.0})
    nb.l(col, bg.inputs["Color"])
    nb.l(bg.outputs[0], out.inputs["Surface"])


# --------------------------------------------------------------------------- ground

def ground_material(tex, tex2):
    m = bpy.data.materials.new("CrackedMud")
    m.use_nodes = True
    m.displacement_method = os.environ.get("S8_DM", "BOTH")
    nt = m.node_tree; nt.nodes.clear(); nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputMaterial")
    tc = nb.n("ShaderNodeTexCoord")
    pos = tc.outputs["Object"]
    # two tilings blended by a large noise to kill visible repetition
    def mapping(scale, rot):
        mp = nb.n("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (scale, scale, scale)
        mp.inputs["Rotation"].default_value[2] = rot
        nb.l(pos, mp.inputs["Vector"])
        return mp.outputs[0]
    v1 = mapping(1 / 2.0, 0.0)
    v2 = mapping(1 / 2.6, 0.9)
    def img(path, vec, noncolor):
        n = nb.n("ShaderNodeTexImage")
        n.image = bpy.data.images.load(path, check_existing=True)
        if noncolor:
            n.image.colorspace_settings.name = "Non-Color"
        nb.l(vec, n.inputs["Vector"])
        return n.outputs["Color"]
    blend = nb.mapr(nb.noise(pos, 0.09, 2, 0.55), 0.42, 0.58)
    col = nb.mixc(blend, img(tex["diff"], v1, False), img(tex["diff"], v2, False))
    hsv = nb.n("ShaderNodeHueSaturation", inputs={"Saturation": DESAT * 0.8, "Value": 0.78})
    nb.l(col, hsv.inputs["Color"])
    col = nb.mixc(1.0, hsv.outputs[0], COLD, blend="MULTIPLY")
    # pale dusty patches (fine sand settled in hollows)
    # large-scale tonal variation: pale salt-crust patches, darker damp-looking hollows
    salt = nb.mapr(nb.noise(pos, 1 / 14.0, 3, 0.6), 0.52, 0.66)
    gpos_ = nb.n("ShaderNodeNewGeometry")
    zsep = nb.n("ShaderNodeSeparateXYZ"); nb.l(gpos_.outputs["Position"], zsep.inputs[0])
    salt = nb.math("MULTIPLY", salt, nb.mapr(zsep.outputs[2], 25.0, 4.0))     # no pale salt on the ridges
    col = nb.mixc(nb.mapr(zsep.outputs[2], 15.0, 150.0, 0.0, 0.45), col, (0.13, 0.14, 0.16))   # darker rock ridges
    col = nb.mixc(nb.math("MULTIPLY", salt, 0.55), col, (0.60, 0.62, 0.65))
    tone = nb.noise(pos, 1 / 70.0, 2, 0.5)
    col = nb.mixc(1.0, col, nb.mixc(tone, (0.82, 0.83, 0.85), (1.12, 1.12, 1.12)), blend="MULTIPLY")
    dust = nb.mapr(nb.noise(pos, 0.6, 2, 0.6), 0.5, 0.75)
    col = nb.mixc(nb.math("MULTIPLY", dust, 0.45), col, (0.42, 0.43, 0.44))
    camd = nb.n("ShaderNodeCameraData")
    far = nb.mapr(camd.outputs["View Distance"], 25.0, 60.0)
    col = nb.mixc(nb.math("MULTIPLY", far, 0.85), col, (0.30, 0.315, 0.345))
    bsdf = nb.n("ShaderNodeBsdfPrincipled", inputs={"Specular IOR Level": 0.12})
    nb.l(col, bsdf.inputs["Base Color"])
    r = img(tex["rough"], v1, True)
    rr_ = nb.math("ADD", nb.math("MULTIPLY", r, 0.25), 0.72, clamp=True)
    nb.l(nb.math("ADD", rr_, far, clamp=True), bsdf.inputs["Roughness"])
    h = img(tex["disp"], v1, True)
    dn = nb.n("ShaderNodeDisplacement", inputs={"Scale": 0.045, "Midlevel": 0.5})
    nb.l(h, dn.inputs["Height"])
    nb.l(dn.outputs[0], out.inputs["Displacement"])
    nb.l(aerial(nb, bsdf.outputs[0]), out.inputs["Surface"])
    return m


def build_ground(mode):
    tex = C.ph_texture("mud_cracked_dry_riverbed_002", "2k" if mode != "final" else "4k")
    tex2 = None
    mat = ground_material(tex, tex2) if not os.environ.get("S8_PLAIN") else C.principled("plain", (0.3, 0.3, 0.3))
    # near field: adaptive micro-displacement (dicing in screen space)
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=60, y_subdivisions=60, size=60, location=(0, 10, 0))
    near = bpy.context.object
    near.name = "GroundNear"
    sub = near.modifiers.new("adaptive", "SUBSURF")
    sub.subdivision_type = "SIMPLE"
    sub.use_adaptive_subdivision = not os.environ.get("S8_NOADAPT")
    sub.adaptive_space = "PIXEL"
    sub.adaptive_pixel_size = 2.0
    # dice once from a fixed viewpoint near the close-up (no re-tessellation while the camera moves)
    dc = bpy.data.objects.new("dicing_cam", bpy.data.cameras.new("dicing_cam"))
    bpy.context.scene.collection.objects.link(dc)
    dc.data.lens = 35; dc.data.sensor_fit = "VERTICAL"; dc.data.sensor_height = 36
    dc.location = (2.5, -3.6, 0.8)
    C.point_at(dc, (-0.2, 0.5, 0.4))
    bpy.context.scene.cycles.dicing_camera = dc
    near.cycles.use_motion_blur = False          # static: camera blur still applies, saves the motion copies
    bpy.context.scene.cycles.offscreen_dicing_scale = 8.0
    near.data.materials.append(mat)
    C.smooth_shade(near)
    # far field: gentle undulating desert floor out to the horizon (no displacement needed)
    n = L.Noise2(5)
    xs = np.linspace(-6000, 6000, 640)
    ys = np.linspace(-500, 9000, 560)
    X, Y = np.meshgrid(xs, ys)
    R = np.sqrt(X ** 2 + (Y - 10) ** 2)
    sm_ = L.smoother_np
    band = lambda y0, y1: sm_((Y - y0) / 300) * sm_((y1 - Y) / 400)
    n2 = L.Noise2(9)
    # three layered ridge lines at increasing distance (separated by the cold haze)
    Z = (L.fbm(n, X / 900, Y / 900, 5) + 0.35) * 6 * sm_((R - 60) / 600) + \
        np.clip(L.ridged(n2, X / 500, Y / 500 + 2, 5) - 0.25, 0, 1) ** 1.6 * 70 * band(900, 1700) + \
        np.clip(L.ridged(n, X / 900 + 3, Y / 900, 6) - 0.2, 0, 1) ** 1.8 * 170 * band(2300, 3800) + \
        np.clip(L.ridged(n2, X / 1600 + 7, Y / 1600, 6) - 0.1, 0, 1) ** 2.0 * 380 * sm_((Y - 4800) / 900)
    near_mask = L.smoother_np((np.maximum(np.abs(X) - 22, np.abs(Y - 10) - 22)) / 40)
    Z = Z * near_mask - 0.03 - (X ** 2 + Y ** 2) / (2 * 6.371e6)
    far = L.grid_mesh("GroundFar", X, Y, Z)
    far.data.materials.append(mat)
    return near, far


# --------------------------------------------------------------------------- blowing sand

def sand_material():
    m = bpy.data.materials.new("SandGrain")
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputMaterial")
    b = nb.n("ShaderNodeBsdfPrincipled", inputs={"Base Color": (0.55, 0.56, 0.57, 1), "Roughness": 0.8})
    nb.l(b.outputs[0], out.inputs["Surface"])
    return m


def build_sand(ctx, gust_t):
    """Saltating sand grains (point cloud) streaming downwind. Positions are a pure function of an
    animated, monotonic 'travel' value G(t) -> deterministic for any frame range, and constant point
    count/order -> Cycles deformation motion blur turns each grain into a streak."""
    rs = np.random.RandomState(7)
    n = 90000
    # grains start upwind (+X side) so nothing wraps during the shot
    u = rs.uniform(-6, 40, n)             # along-wind coordinate (upwind positive)
    v = rs.normal(-1.5, 2.5, n)           # cross-wind: concentrated around the camera's field
    side = Vector((-WIND.y, WIND.x, 0))
    px = -WIND.x * u + side.x * v
    py = -WIND.y * u + side.y * v
    spd = rs.lognormal(0.0, 0.35, n)                    # relative speed
    hop = rs.exponential(0.035, n)                      # saltation hop height (m)
    ph = rs.uniform(0, 6.283, n)
    rad = rs.uniform(0.0009, 0.0022, n)
    me = bpy.data.meshes.new("SandPts")
    me.vertices.add(n)
    me.vertices.foreach_set("co", np.stack([px, py, np.zeros(n)], 1).astype(np.float32).ravel())
    for name, arr in (("spd", spd), ("hop", hop), ("ph", ph), ("rad", rad)):
        a = me.attributes.new(name, "FLOAT", "POINT")
        a.data.foreach_set("value", arr.astype(np.float32))
    me.update()
    ob = bpy.data.objects.new("Sand", me)
    bpy.context.scene.collection.objects.link(ob)
    ng = bpy.data.node_groups.new("SandMotion", "GeometryNodeTree")
    ng.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    nb = L.NB(ng)
    gi = nb.n("NodeGroupInput"); go = nb.n("NodeGroupOutput")
    G = nb.n("ShaderNodeValue")       # travel (m) of a speed-1 grain, keyed below
    def na(name):
        a = nb.n("GeometryNodeInputNamedAttribute", data_type="FLOAT"); a.inputs["Name"].default_value = name
        return a.outputs["Attribute"]
    d = nb.math("MULTIPLY", na("spd"), G.outputs[0])
    hz = nb.math("MULTIPLY", na("hop"), nb.math("ABSOLUTE", nb.math("SINE", nb.math("ADD", na("ph"), nb.math("MULTIPLY", d, 2.2)))))
    off = nb.n("ShaderNodeCombineXYZ")
    nb.l(nb.math("MULTIPLY", d, WIND.x), off.inputs[0])
    nb.l(nb.math("MULTIPLY", d, WIND.y), off.inputs[1])
    nb.l(nb.math("ADD", hz, 0.002), off.inputs[2])
    sp = nb.n("GeometryNodeSetPosition")
    nb.l(gi.outputs[0], sp.inputs["Geometry"]); nb.l(off.outputs[0], sp.inputs["Offset"])
    m2p = nb.n("GeometryNodeMeshToPoints")
    pos_n = nb.n("GeometryNodeInputPosition")
    sepp = nb.n("ShaderNodeSeparateXYZ"); nb.l(pos_n.outputs[0], sepp.inputs[0])
    lee = lee_mask(nb, sepp.outputs[0], sepp.outputs[1])
    nb.l(sp.outputs[0], m2p.inputs["Mesh"])
    nb.l(nb.math("MULTIPLY", na("rad"), nb.math("SUBTRACT", 1.0, nb.math("MULTIPLY", lee, 0.92))), m2p.inputs["Radius"])
    sm = nb.n("GeometryNodeSetMaterial")
    sm.inputs["Material"].default_value = sand_material()
    nb.l(m2p.outputs[0], sm.inputs["Geometry"])
    nb.l(sm.outputs[0], go.inputs[0])
    mod = ob.modifiers.new("motion", "NODES"); mod.node_group = ng
    # wind speed profile (m/s for a speed-1 grain): restless breeze -> gust on "suursuz"
    def wind(t):
        base = 1.6 + 0.4 * math.sin(t * 2.1)
        g = math.exp(-((t - (gust_t + 0.6)) / 0.9) ** 2) * 3.2
        return base + g
    sock = G.outputs[0]
    # integrate wind from a fixed origin (f0 - 24) with dt = 1/240 s: exactly 10 steps per frame, so the
    # travel curve has no step-count beat and is identical for any rendered frame range
    dt = 1.0 / 240.0
    t_org = (ctx.f0 - 24) / C.FPS
    nsteps = (ctx.f1 + 13 - (ctx.f0 - 24)) * 10
    w = np.array([wind(t_org + (k + 0.5) * dt) for k in range(nsteps)])
    cum = np.concatenate([[0.0], np.cumsum(w * dt)])
    for f in range(ctx.f0 - 12, ctx.f1 + 13):
        sock.default_value = float(cum[(f - (ctx.f0 - 24)) * 10])
        sock.keyframe_insert("default_value", frame=f)
    for fc in C._fcurves(ng.animation_data.action):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    return ob


def lee_mask(nb, x, y):
    """1 inside the boulder's wind shadow: 0.4-3 m downwind of the stone, ~1 m either side."""
    a0 = nb.math("ADD", nb.math("MULTIPLY", x, WIND.x), nb.math("MULTIPLY", y, WIND.y))
    c0 = nb.math("ABSOLUTE", nb.math("ADD", nb.math("MULTIPLY", x, -WIND.y), nb.math("MULTIPLY", y, WIND.x)))
    wide = nb.math("ADD", 0.75, nb.math("MULTIPLY", a0, -0.12))          # shadow narrows downwind
    side = nb.math("SUBTRACT", 1.0, nb.math("DIVIDE", c0, nb.math("MAXIMUM", wide, 0.2)), clamp=True)
    along = nb.math("MULTIPLY", nb.mapr(a0, 0.2, 0.7), nb.mapr(a0, 3.2, 1.8))
    return nb.math("MULTIPLY", nb.mapr(side, 0.0, 0.5), along)


def sand_sheet_material(name, alpha_gain, feature_m, seed, Gsock_values, gain_keys=(), stretch=5.0,
                        veil=False, travel_mul=1.15):
    """Saltation ribbons over the surface. Noise in (along, cross) wind coordinates, stretched ~5:1, the
    cross coordinate warped by a slow animated 4D noise so ribbons meander, chopped into 0.5-2 m bursts,
    grainy edges, advected with the grains' travel curve, absent in the boulder's lee, faded with view
    distance so no card edge is ever seen. veil=True: soft, low-contrast lifted dust."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputMaterial")
    geo = nb.n("ShaderNodeNewGeometry")
    cam = nb.n("ShaderNodeCameraData")
    G = nb.n("ShaderNodeValue")
    for f, g in Gsock_values:
        G.outputs[0].default_value = g * travel_mul
        G.outputs[0].keyframe_insert("default_value", frame=f)
    T = nb.n("ShaderNodeValue")                      # slow time for the meander warp
    T.outputs[0].default_value = 0.0
    T.outputs[0].keyframe_insert("default_value", frame=0)
    T.outputs[0].default_value = 400 * 0.25
    T.outputs[0].keyframe_insert("default_value", frame=400 * C.FPS)
    sep = nb.n("ShaderNodeSeparateXYZ"); nb.l(geo.outputs["Position"], sep.inputs[0])
    x, y = sep.outputs[0], sep.outputs[1]
    a_w = nb.math("ADD", nb.math("MULTIPLY", x, WIND.x), nb.math("MULTIPLY", y, WIND.y))
    c_w = nb.math("ADD", nb.math("MULTIPLY", x, -WIND.y), nb.math("MULTIPLY", y, WIND.x))
    a = nb.math("SUBTRACT", a_w, G.outputs[0])
    # meander: +-0.3 m cross offset varying over 3-5 m, slowly evolving
    wv = nb.n("ShaderNodeCombineXYZ")
    nb.l(nb.math("MULTIPLY", a, 1 / 4.0), wv.inputs[0]); nb.l(nb.math("MULTIPLY", c_w, 1 / 4.0), wv.inputs[1])
    wv.inputs[2].default_value = seed
    wn = nb.n("ShaderNodeTexNoise", noise_dimensions="4D")
    wn.inputs["Scale"].default_value = 1.0
    wn.inputs["Detail"].default_value = 1.0
    nb.l(wv.outputs[0], wn.inputs["Vector"]); nb.l(T.outputs[0], wn.inputs["W"])
    c = nb.math("ADD", c_w, nb.math("MULTIPLY", nb.math("SUBTRACT", wn.outputs["Fac"], 0.5), 0.6 * 2))
    v = nb.n("ShaderNodeCombineXYZ")
    nb.l(nb.math("MULTIPLY", a, 1 / feature_m), v.inputs[0])
    nb.l(nb.math("MULTIPLY", c, stretch / feature_m), v.inputs[1])
    v.inputs[2].default_value = seed + 3.1
    nz = nb.n("ShaderNodeTexNoise", noise_dimensions="3D")
    nz.inputs["Scale"].default_value = 1.0
    nz.inputs["Detail"].default_value = 2.0 if not veil else 1.5     # finest along-wind detail >= ~1 m
    nz.inputs["Roughness"].default_value = 0.55
    nb.l(v.outputs[0], nz.inputs["Vector"])
    if veil:
        al = nb.mapr(nz.outputs["Fac"], 0.42, 0.72)
    else:
        al = nb.mapr(nz.outputs["Fac"], 0.47, 0.64)
        # bursts 0.5-2 m long
        bv = nb.n("ShaderNodeCombineXYZ")
        nb.l(nb.math("MULTIPLY", a, 1 / 1.1), bv.inputs[0]); nb.l(nb.math("MULTIPLY", c, 1 / 0.7), bv.inputs[1])
        bv.inputs[2].default_value = seed + 7.7
        bn = nb.n("ShaderNodeTexNoise", noise_dimensions="3D")
        bn.inputs["Scale"].default_value = 1.0
        bn.inputs["Detail"].default_value = 1.0
        nb.l(bv.outputs[0], bn.inputs["Vector"])
        al = nb.math("MULTIPLY", al, nb.mapr(bn.outputs["Fac"], 0.36, 0.56))
        # grainy edges: fine sand-grain noise eats into the ribbon edges
        gn = nb.n("ShaderNodeTexNoise", noise_dimensions="3D")
        gn.inputs["Scale"].default_value = 160.0
        gn.inputs["Detail"].default_value = 0.0
        gpos = nb.n("ShaderNodeCombineXYZ")
        nb.l(a, gpos.inputs[0]); nb.l(c, gpos.inputs[1])
        nb.l(gpos.outputs[0], gn.inputs["Vector"])
        al = nb.math("SUBTRACT", nb.math("MULTIPLY", al, 1.35), nb.math("MULTIPLY", nb.math("SUBTRACT", 1.0, gn.outputs["Fac"]), 0.55), clamp=True)
    gk = nb.n("ShaderNodeValue")
    for f, g in gain_keys:
        gk.outputs[0].default_value = g
        gk.outputs[0].keyframe_insert("default_value", frame=f)
    al = nb.math("MULTIPLY", nb.math("MULTIPLY", al, alpha_gain), gk.outputs[0])
    al = nb.math("MULTIPLY", al, nb.math("SUBTRACT", 1.0, nb.math("MULTIPLY", lee_mask(nb, x, y), 0.9)))
    al = nb.math("MULTIPLY", al, nb.mapr(cam.outputs["View Distance"], 18.0, 9.0))
    col = (0.44, 0.45, 0.47, 1) if not veil else (0.52, 0.54, 0.57, 1)
    b = nb.n("ShaderNodeBsdfPrincipled", inputs={"Base Color": col, "Roughness": 1.0, "Specular IOR Level": 0.1})
    tr = nb.n("ShaderNodeBsdfTransparent")
    mx = nb.n("ShaderNodeMixShader")
    nb.l(al, mx.inputs[0]); nb.l(tr.outputs[0], mx.inputs[1]); nb.l(b.outputs[0], mx.inputs[2])
    nb.l(mx.outputs[0], out.inputs["Surface"])
    return m


def build_pebbles(hero, n=130, seed=17):
    """Skirt of weathered-off granite pebbles around the boulder base (denser close to the stone)."""
    import bmesh
    rs = random.Random(seed)
    mat = hero[0].data.materials[0] if hero and hero[0].data.materials else None
    meshes = []
    for k in range(5):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        for v in bm.verts:
            d = v.co.normalized()
            f = 1 + 0.22 * math.sin(d.x * 3 + k) * math.cos(d.y * 4 - k) + rs.uniform(-0.08, 0.08)
            v.co = v.co * f
            v.co.z *= rs.uniform(0.45, 0.7)
        me = bpy.data.meshes.new(f"pebble{k}")
        bm.to_mesh(me); bm.free()
        for poly in me.polygons:
            poly.use_smooth = True
        if mat:
            me.materials.append(mat)
        meshes.append(me)
    rot = math.radians(25)
    hx, hy = 0.78, 0.98                      # boulder footprint half-extents (local)
    for i in range(n):
        a = rs.uniform(0, 2 * math.pi)
        r = 1.0 + abs(rs.gauss(0, 0.28))
        lx, ly = math.cos(a) * hx * r, math.sin(a) * hy * r
        x = lx * math.cos(rot) - ly * math.sin(rot)
        y = lx * math.sin(rot) + ly * math.cos(rot)
        sz = rs.uniform(0.007, 0.02) if rs.random() < 0.85 else rs.uniform(0.02, 0.045)
        ob = bpy.data.objects.new(f"Pebble{i}", meshes[i % 5])
        ob.location = (x, y, sz * 0.12)
        ob.scale = (sz * rs.uniform(0.8, 1.3), sz * rs.uniform(0.8, 1.3), sz)
        ob.rotation_euler = (rs.uniform(-0.3, 0.3), rs.uniform(-0.3, 0.3), rs.uniform(0, 6.28))
        bpy.context.scene.collection.objects.link(ob)


# --------------------------------------------------------------------------- camera

def camera_path(ctx, cam, focus):
    t0, t1 = ctx.f0 / C.FPS, ctx.f1 / C.FPS
    t_c = ctx.word("cansız")
    t_s = ctx.word("şuursuz")
    t_f = ctx.word("şefkatsiz")
    t_i = ctx.word("izah")
    # (time, camera location, look-at point)
    keys = [
        (t0 - 0.3, (2.55, -2.75, 0.62), (0.05, 0.1, 0.78)),
        (t_c + 0.9, (2.35, -3.25, 0.70), (0.0, 0.1, 0.74)),
        (t_s + 0.2, (2.55, -4.4, 0.9), (-0.5, 0.5, 0.65)),
        # the wide (~7.5 m from the stone), held 0.3 s with a small slide
        (t_f + 0.2, (3.25, -6.75, 1.7), (-1.0, 3.0, 1.25)),
        (t_f + 0.5, (3.05, -6.65, 1.66), (-0.9, 2.9, 1.25)),
    ]
    land_loc, land_tgt = (1.75, -2.75, 0.40), (0.0, 0.1, 0.92)
    sl, st_ = keys[-1][1], keys[-1][2]
    keys += [
        # drift back in, ~93 % of the travel done 0.4 s before landing -> gentle deceleration
        (t_i - 0.45, tuple(sl[k] + 0.93 * (land_loc[k] - sl[k]) for k in range(3)),
                     tuple(st_[k] + 0.93 * (land_tgt[k] - st_[k]) for k in range(3))),
        # low-angle medium shot of the stone, held for "izah edebilir mi"
        (t_i - 0.05, land_loc, land_tgt),
        (t1 + 0.3, (1.73, -2.72, 0.40), land_tgt),
    ]
    tgt = C.empty("cam_target", keys[0][2])
    for t, loc, look in keys:
        C.key(cam, "location", t, loc)
        C.key(tgt, "location", t, look)
    C.track_to(cam, tgt)
    C.handheld(tgt, amp_loc=0.006, speed=0.35, seed=9)      # Track To drops the camera's rotation noise
    C.key(focus, "location", t0, (0.0, 0.0, 0.7))
    C.key(focus, "location", t_s - 0.2, (0.0, -0.3, 0.6))
    C.key(focus, "location", t_s + 0.6, (0.6, -2.0, 0.2))
    C.key(focus, "location", t_f + 0.2, (0.0, 0.0, 0.7))
    C.key(focus, "location", t_i - 0.05, (0.0, -0.2, 0.6))
    C.key(focus, "location", t1, (0.0, 0.0, 0.7))
    C.handheld(cam, amp_loc=0.004, amp_rot=0.0015, speed=0.4, seed=4)


def build(ctx):
    sc = bpy.context.scene
    if ctx.mode == "final":
        bad = [k for k in os.environ if k.startswith("S8_")]
        if bad:
            raise RuntimeError(f"final render with debug overrides set: {bad}")
    MODE[0] = ctx.mode
    build_world(ctx.mode)
    build_ground(ctx.mode)
    res = "4k" if ctx.mode == "final" else "2k"
    hero = import_model("namaqualand_boulder_03", res, loc=(0, 0, 0), rot_z=math.radians(25), scale=0.62, sink=0.05)

    build_pebbles(hero)
    wres = "2k" if ctx.mode == "final" else "1k"
    # one large bleached dead trunk in the mid-ground, readable in the wide
    import_model("dead_tree_trunk", wres, loc=(-3.4, 5.8, 0), rot_z=0.5, scale=1.9, sat=0.06, value=1.4, sink=0.12, lift=0.7)
    gust_t = ctx.word("şuursuz") - 0.08
    sand = build_sand(ctx, gust_t)
    if os.environ.get("S8_NOSAND"):
        sand.hide_render = True
    # sand sheets sharing the grains' travel curve
    ng = sand.modifiers["motion"].node_group
    gvals = []
    for fc in C._fcurves(ng.animation_data.action):
        gvals = [(int(kp.co.x), kp.co.y) for kp in fc.keyframe_points]
    gk = ((ctx.f0, 0.22), (C.t2f(gust_t - 0.25), 0.3), (C.t2f(gust_t + 0.5), 1.0),
          (C.t2f(gust_t + 1.6), 0.75), (C.t2f(ctx.word("izah")), 0.4), (ctx.f1, 0.35))
    gk_veil = tuple((f, g * g) for f, g in gk)            # dust only really lifts in the gust
    layers = ((0.022, 0.95, 1.5, 5.0, False, 1.15),        # ribbons hugging the ground
              (0.04, 0.16, 3.0, 2.5, True, 1.4),            # stacked lifted-dust veil cards
              (0.18, 0.13, 5.0, 1.8, True, 1.8))
    for i, (z, gain, feat, stretch, veil, tm) in enumerate(layers):
        bpy.ops.mesh.primitive_plane_add(size=44, location=(0, 4, z))
        sh = bpy.context.object
        sh.name = f"SandSheet{i}"
        sh.data.materials.append(sand_sheet_material(f"SandSheet{i}_m", gain, feat, i * 4.1, gvals,
                                                     gain_keys=gk_veil if veil else gk, stretch=stretch,
                                                     veil=veil, travel_mul=tm))
        sh.visible_shadow = False
        sh.visible_diffuse = False
        sh.visible_glossy = False
        sh.visible_transmission = False
        sh.visible_volume_scatter = False

    cam = C.camera("cam", lens=35, loc=(2.5, -2.8, 0.62), look_at=(0, 0, 0.75), fstop=5.6, focus=(0, 0, 0.7))
    cam.data.clip_end = 20000.0
    focus = C.focus_empty(cam)
    camera_path(ctx, cam, focus)
    C.empty("TRK_stone", (0.0, 0.0, 0.9))
    sc.view_settings.exposure = float(os.environ.get("S8_EXP", -0.75))
    # emission here is aerial in-scatter / self-lit cards, never a light source: keep it out of the light
    # tree (otherwise every terrain/tree triangle is an emitter and the tree is rebuilt each frame)
    for m in bpy.data.materials:
        m.cycles.emission_sampling = "NONE"
    # static geometry: no object/deformation motion blur (camera blur still applies). Without this Cycles
    # re-evaluates and re-syncs the heavy static geometry at the shutter subframes of every frame.
    for o in sc.objects:
        if o.type in ("MESH", "EMPTY", "CURVES", "POINTCLOUD") and not o.name.startswith(("cam", "Sand", "cam_target")):
            o.cycles.use_motion_blur = False
    if os.environ.get("S8_STATS"):
        import time as _tm
        _last = [None, _tm.time()]
        def _st(stats):
            msg = str(stats).split("|")[-1].strip()[:60]
            key = msg.split(" ")[0] if msg else ""
            if key != _last[0]:
                print(f"STAT {_tm.time() - _last[1]:7.2f}s  {msg}", flush=True)
                _last[0] = key; _last[1] = _tm.time()
        bpy.app.handlers.render_stats.append(_st)
    for pre in [x for x in os.environ.get("S8_HIDE", "").split(",") if x]:
        for o in sc.objects:
            if o.name.startswith(pre):
                o.hide_render = True
    return {"final_spp": 12, "final_threshold": 0.03, "preview_spp": 24, "max_bounces": 3, "diffuse_bounces": 1, "glossy_bounces": 1,
            "transmission_bounces": 2, "texture_limit": os.environ.get("S8_TL", "4096")}


C.run("sh14c", build)
