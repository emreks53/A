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

def cool_material(mat, sat=DESAT, value=1.0, tint=COLD):
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
        nt.links.new(mix.outputs[2], inp)


def import_model(name, res, loc=(0, 0, 0), rot_z=0.0, scale=1.0, sat=DESAT, value=1.0, sink=0.0):
    objs = C.ph_model(name, res)
    meshes = [o for o in objs if o.type == "MESH"]
    roots = [o for o in objs if o.parent is None]
    for o in meshes:
        for m in o.data.materials:
            cool_material(m, sat, value)
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
    return meshes


def aerial(nb, surface, dist_scale=4200.0, color=(0.56, 0.62, 0.70), strength=1.0):
    """Cold grey distance haze: mix toward the horizon colour by 1-exp(-d/L)."""
    cam = nb.n("ShaderNodeCameraData")
    fac = nb.math("SUBTRACT", 1.0, nb.math("EXPONENT", nb.math("MULTIPLY", cam.outputs["View Distance"], -1.0 / dist_scale)))
    em = nb.n("ShaderNodeEmission", inputs={"Color": (*color, 1), "Strength": strength})
    mx = nb.n("ShaderNodeMixShader")
    nb.l(fac, mx.inputs[0]); nb.l(surface, mx.inputs[1]); nb.l(em.outputs[0], mx.inputs[2])
    return mx.outputs[0]


# --------------------------------------------------------------------------- world

def build_world(mode):
    path = C.ph_hdri("kloofendal_overcast_puresky", "8k" if mode == "final" else "4k", "hdr")
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
    m.displacement_method = "BOTH"
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
    v2 = mapping(1 / 1.5, 0.9)
    def img(path, vec, noncolor):
        n = nb.n("ShaderNodeTexImage")
        n.image = bpy.data.images.load(path, check_existing=True)
        if noncolor:
            n.image.colorspace_settings.name = "Non-Color"
        nb.l(vec, n.inputs["Vector"])
        return n.outputs["Color"]
    blend = nb.mapr(nb.noise(pos, 0.09, 4, 0.55), 0.42, 0.58)
    col = nb.mixc(blend, img(tex["diff"], v1, False), img(tex2["diff"], v2, False))
    hsv = nb.n("ShaderNodeHueSaturation", inputs={"Saturation": DESAT * 0.8, "Value": 0.78})
    nb.l(col, hsv.inputs["Color"])
    col = nb.mixc(1.0, hsv.outputs[0], COLD, blend="MULTIPLY")
    # pale dusty patches (fine sand settled in hollows)
    dust = nb.mapr(nb.noise(pos, 0.6, 5, 0.6), 0.5, 0.75)
    col = nb.mixc(nb.math("MULTIPLY", dust, 0.45), col, (0.42, 0.43, 0.44))
    bsdf = nb.n("ShaderNodeBsdfPrincipled", inputs={"Specular IOR Level": 0.35})
    nb.l(col, bsdf.inputs["Base Color"])
    r = nb.mixc(blend, img(tex["rough"], v1, True), img(tex2["rough"], v2, True))
    nb.l(nb.math("ADD", nb.math("MULTIPLY", r, 0.25), 0.72, clamp=True), bsdf.inputs["Roughness"])
    nm1 = nb.n("ShaderNodeNormalMap"); nb.l(img(tex["nor"], v1, True), nm1.inputs["Color"])
    nb.l(nm1.outputs[0], bsdf.inputs["Normal"])
    h = nb.mixc(blend, img(tex["disp"], v1, True), img(tex2["disp"], v2, True))
    dn = nb.n("ShaderNodeDisplacement", inputs={"Scale": 0.045, "Midlevel": 0.5})
    nb.l(h, dn.inputs["Height"])
    nb.l(dn.outputs[0], out.inputs["Displacement"])
    nb.l(aerial(nb, bsdf.outputs[0]), out.inputs["Surface"])
    return m


def build_ground(mode):
    tex = C.ph_texture("mud_cracked_dry_riverbed_002", "2k" if mode != "final" else "4k")
    tex2 = C.ph_texture("mud_cracked_dry_03", "2k" if mode != "final" else "4k")
    mat = ground_material(tex, tex2)
    # near field: adaptive micro-displacement (dicing in screen space)
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=60, y_subdivisions=60, size=80, location=(0, 10, 0))
    near = bpy.context.object
    near.name = "GroundNear"
    sub = near.modifiers.new("adaptive", "SUBSURF")
    sub.subdivision_type = "SIMPLE"
    sub.use_adaptive_subdivision = True
    sub.adaptive_space = "PIXEL"
    sub.adaptive_pixel_size = 1.0 if mode == "final" else 2.0
    near.data.materials.append(mat)
    C.smooth_shade(near)
    # far field: gentle undulating desert floor out to the horizon (no displacement needed)
    n = L.Noise2(5)
    xs = np.linspace(-3000, 3000, 400)
    ys = np.linspace(-500, 6000, 420)
    X, Y = np.meshgrid(xs, ys)
    Z = L.fbm(n, X / 900, Y / 900, 5) * 10 + L.ridged(n, X / 1500 + 3, Y / 1500, 5) ** 3 * 190 * L.smoother_np((Y - 1500) / 1800)
    near_mask = L.smoother_np((np.maximum(np.abs(X) - 30, np.abs(Y - 10) - 30)) / 40)
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
    b = nb.n("ShaderNodeBsdfPrincipled", inputs={"Base Color": (0.36, 0.37, 0.38, 1), "Roughness": 0.8})
    nb.l(b.outputs[0], out.inputs["Surface"])
    return m


def build_sand(ctx, gust_t):
    """Saltating sand grains (point cloud) streaming downwind. Positions are a pure function of an
    animated, monotonic 'travel' value G(t) -> deterministic for any frame range, and constant point
    count/order -> Cycles deformation motion blur turns each grain into a streak."""
    rs = np.random.RandomState(7)
    n = 160000 if ctx.mode == "final" else 70000
    # grains start upwind (+X side) so nothing wraps during the shot
    u = rs.uniform(-14, 70, n)            # along-wind coordinate (upwind positive)
    v = rs.uniform(-10, 14, n)            # cross-wind
    side = Vector((-WIND.y, WIND.x, 0))
    px = -WIND.x * u + side.x * v
    py = -WIND.y * u + side.y * v
    spd = rs.lognormal(0.0, 0.35, n)                    # relative speed
    hop = rs.exponential(0.035, n)                      # saltation hop height (m)
    ph = rs.uniform(0, 6.283, n)
    rad = rs.uniform(0.0004, 0.0011, n)
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
    nb.l(sp.outputs[0], m2p.inputs["Mesh"]); nb.l(na("rad"), m2p.inputs["Radius"])
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
    t, Gv = ctx.f0 / C.FPS - 0.5, 0.0
    sock = G.outputs[0]
    for f in range(ctx.f0 - 12, ctx.f1 + 13):
        tf = f / C.FPS
        # integrate from a fixed origin so every frame range gives the same answer
        Gv = sum(wind(ctx.f0 / C.FPS - 1.0 + k * 0.01) * 0.01 for k in range(int((tf - (ctx.f0 / C.FPS - 1.0)) / 0.01)))
        sock.default_value = Gv
        sock.keyframe_insert("default_value", frame=f)
    for fc in C._fcurves(ng.animation_data.action):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    return ob


def sand_sheet_material(name, alpha_gain, scale_along, seed, Gsock_values):
    """Streams of sand gliding over the surface ('sand snakes'): horizontal card, alpha from noise
    stretched along the wind and advected with the same travel curve as the grains."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputMaterial")
    tc = nb.n("ShaderNodeTexCoord")
    G = nb.n("ShaderNodeValue")
    for f, g in Gsock_values:
        G.outputs[0].default_value = g * 1.15
        G.outputs[0].keyframe_insert("default_value", frame=f)
    pos = tc.outputs["Object"]
    sep = nb.n("ShaderNodeSeparateXYZ"); nb.l(pos, sep.inputs[0])
    # along/cross wind coordinates
    a = nb.math("ADD", nb.math("MULTIPLY", sep.outputs[0], WIND.x), nb.math("MULTIPLY", sep.outputs[1], WIND.y))
    c = nb.math("ADD", nb.math("MULTIPLY", sep.outputs[0], -WIND.y), nb.math("MULTIPLY", sep.outputs[1], WIND.x))
    a = nb.math("SUBTRACT", a, G.outputs[0])
    v = nb.n("ShaderNodeCombineXYZ")
    nb.l(nb.math("MULTIPLY", a, 1.0 / scale_along), v.inputs[0]); nb.l(nb.math("MULTIPLY", c, 4.0 / scale_along), v.inputs[1])
    v.inputs[2].default_value = seed
    nz = nb.n("ShaderNodeTexNoise", noise_dimensions="3D")
    nz.inputs["Scale"].default_value = 1.0
    nz.inputs["Detail"].default_value = 6.0
    nz.inputs["Roughness"].default_value = 0.62
    nz.inputs["Distortion"].default_value = 0.4
    nb.l(v.outputs[0], nz.inputs["Vector"])
    al = nb.math("MULTIPLY", nb.mapr(nz.outputs["Fac"], 0.55, 0.78), alpha_gain)
    # fade with distance from the camera area so the card edges never show
    rr = nb.n("ShaderNodeVectorMath", operation="LENGTH"); nb.l(pos, rr.inputs[0])
    al = nb.math("MULTIPLY", al, nb.mapr(rr.outputs["Value"], 26, 12))
    b = nb.n("ShaderNodeBsdfPrincipled", inputs={"Base Color": (0.40, 0.41, 0.42, 1), "Roughness": 0.9})
    tr = nb.n("ShaderNodeBsdfTransparent")
    mx = nb.n("ShaderNodeMixShader")
    nb.l(al, mx.inputs[0]); nb.l(tr.outputs[0], mx.inputs[1]); nb.l(b.outputs[0], mx.inputs[2])
    nb.l(mx.outputs[0], out.inputs["Surface"])
    return m


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
        (t_s + 0.2, (2.6, -5.2, 0.95), (-0.6, 0.6, 0.55)),
        (t_f + 0.4, (5.6, -13.5, 3.0), (-1.2, 4.0, 0.6)),
        (t_i - 0.05, (5.2, -14.6, 3.2), (-0.4, 2.2, 0.8)),
        (t1 + 0.3, (5.19, -14.62, 3.2), (-0.4, 2.2, 0.8)),
    ]
    tgt = C.empty("cam_target", keys[0][2])
    for t, loc, look in keys:
        C.key(cam, "location", t, loc)
        C.key(tgt, "location", t, look)
    C.track_to(cam, tgt)
    C.key(focus, "location", t0, (0.0, 0.0, 0.7))
    C.key(focus, "location", t_s - 0.2, (0.0, -0.3, 0.6))
    C.key(focus, "location", t_s + 0.6, (0.2, -1.4, 0.3))
    C.key(focus, "location", t_f + 0.2, (0.0, 0.0, 0.7))
    C.key(focus, "location", t1, (0.0, 0.0, 0.7))
    C.handheld(cam, amp_loc=0.004, amp_rot=0.0015, speed=0.4, seed=4)


def build(ctx):
    sc = bpy.context.scene
    MODE[0] = ctx.mode
    build_world(ctx.mode)
    build_ground(ctx.mode)
    res = "4k" if ctx.mode == "final" else "2k"
    hero = import_model("namaqualand_boulder_03", res, loc=(0, 0, 0), rot_z=math.radians(25), scale=0.62, sink=0.05)
    import_model("namaqualand_boulder_05", "1k", loc=(-3.2, 4.5, 0), rot_z=1.1, scale=0.8, sink=0.04)
    import_model("namaqualand_boulder_06", "1k", loc=(5.5, 9.0, 0), rot_z=2.0, scale=0.7, sink=0.04)
    import_model("namaqualand_boulder_05", "1k", loc=(-14, 30, 0), rot_z=0.4, scale=1.3, sink=0.06)
    wres = "2k" if ctx.mode == "final" else "1k"
    import_model("dead_tree_trunk", wres, loc=(-3.6, 5.5, 0), rot_z=0.35, scale=1.0, sat=0.12, value=0.95, sink=0.07)
    import_model("tree_stump_02", wres, loc=(7.5, 17.0, 0), rot_z=1.3, scale=1.0, sat=0.12, value=0.9, sink=0.05)
    import_model("dry_branches_medium_01", wres, loc=(1.9, 2.4, 0), rot_z=2.4, scale=1.0, sat=0.12, value=0.95, sink=0.01)
    import_model("dead_tree_trunk_02", wres, loc=(-11.0, 26.0, 0), rot_z=-0.9, scale=1.2, sat=0.12, value=0.9, sink=0.08)
    gust_t = ctx.word("şuursuz") - 0.08
    sand = build_sand(ctx, gust_t)
    # sand sheets sharing the grains' travel curve
    ng = sand.modifiers["motion"].node_group
    gvals = []
    for fc in C._fcurves(ng.animation_data.action):
        gvals = [(int(kp.co.x), kp.co.y) for kp in fc.keyframe_points]
    for i, (z, gain, sc_al) in enumerate(((0.004, 0.75, 2.2), (0.02, 0.35, 3.5))):
        bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 6, z))
        sh = bpy.context.object
        sh.name = f"SandSheet{i}"
        sh.data.materials.append(sand_sheet_material(f"SandSheet{i}_m", gain, sc_al, i * 4.1, gvals))
        sh.visible_shadow = False

    cam = C.camera("cam", lens=35, loc=(2.5, -2.8, 0.62), look_at=(0, 0, 0.75), fstop=4.0, focus=(0, 0, 0.7))
    focus = C.focus_empty(cam)
    camera_path(ctx, cam, focus)
    C.empty("TRK_stone", (0.0, 0.0, 0.9))
    sc.view_settings.exposure = float(os.environ.get("S8_EXP", -0.6))
    sc.view_settings.look = "AgX - Base Contrast"
    return {"final_spp": 32, "preview_spp": 24, "max_bounces": 4, "diffuse_bounces": 2, "glossy_bounces": 1,
            "transmission_bounces": 2, "texture_limit": "4096"}


C.run("sh14c", build)
