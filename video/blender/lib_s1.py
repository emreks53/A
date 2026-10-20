"""Studio S1 helpers (sh01, sh13a): procedural meadow grass with dew, the hero bean seedling (BRIEF §4),
glowing pollen motes, a slow-motion time warp, lens/compositor finishing. Deterministic (seeded)."""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix, Euler, Quaternion
import common as C


# --------------------------------------------------------------------------- small utils

def smoothstep(e0, e1, x):
    if e1 == e0:
        return 1.0 if x >= e1 else 0.0
    x = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return x * x * (3 - 2 * x)


def bm_to_obj(name, bm, mats=(), smooth=True, col=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    if smooth:
        me.shade_smooth()
    o = bpy.data.objects.new(name, me)
    (col or bpy.context.scene.collection).objects.link(o)
    return o


def hidden_collection(name):
    """Collection that exists for instancing only (excluded from the view layer)."""
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    lc = bpy.context.view_layer.layer_collection.children[col.name]
    lc.exclude = True
    return col


def node(nt, t, loc=(0, 0), **inputs):
    n = nt.nodes.new(t)
    n.location = loc
    for k, v in inputs.items():
        n.inputs[k].default_value = v
    return n


def math_node(nt, op, *args, clamp=False):
    """Math node; args are inputs (sockets or numbers), optionally followed by a (x, y) location tuple."""
    loc = (0, 0)
    if args and isinstance(args[-1], tuple):
        loc, args = args[-1], args[:-1]
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    n.use_clamp = clamp
    n.location = loc
    for i, v in enumerate(args):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


# --------------------------------------------------------------------------- time warp (slow motion)

class TimeWarp:
    """Maps real (narration) time t to physical/event time tau via a smoothly varying speed.
    keys: [(t, speed), ...] sorted; speed is smoothstepped between keys."""

    def __init__(self, keys, t_start=-1.0, t_end=200.0, dt=1 / 2400):
        self.keys = keys
        self.t_start = t_start
        self.dt = dt
        n = int((t_end - t_start) / dt) + 2
        self.tab = [0.0] * n
        acc = 0.0
        for i in range(n):
            self.tab[i] = acc
            t = t_start + i * dt
            acc += self.speed(t + dt * 0.5) * dt

    def speed(self, t):
        k = self.keys
        if t <= k[0][0]:
            return k[0][1]
        for (t0, s0), (t1, s1) in zip(k, k[1:]):
            if t <= t1:
                return s0 + (s1 - s0) * smoothstep(t0, t1, t)
        return k[-1][1]

    def tau(self, t):
        x = (t - self.t_start) / self.dt
        i = int(math.floor(x))
        i = max(0, min(len(self.tab) - 2, i))
        f = x - i
        return self.tab[i] * (1 - f) + self.tab[i + 1] * f

    def t_of_tau(self, tau):
        lo, hi = self.t_start, self.t_start + (len(self.tab) - 2) * self.dt
        for _ in range(60):
            mid = 0.5 * (lo + hi)
            if self.tau(mid) < tau:
                lo = mid
            else:
                hi = mid
        return 0.5 * (lo + hi)


# --------------------------------------------------------------------------- materials

def mat_grass(name="GrassBlade", hue_shift=0.0, dry=0.0):
    """Thin backlit grass blade: principled (waxy spec) + translucency, parallel veins, colour breakup
    per instance (Object Info random) and along the blade (UV.x = 0 base .. 1 tip)."""
    m, nt, p = C.new_mat(name)
    out = nt.nodes["Material Output"]
    uv = node(nt, "ShaderNodeUVMap", (-1400, 0))
    sep = node(nt, "ShaderNodeSeparateXYZ", (-1200, 0))
    nt.links.new(uv.outputs[0], sep.inputs[0])
    oi = node(nt, "ShaderNodeObjectInfo", (-1400, -300))
    # colour ramp along the blade, random per instance
    ramp = node(nt, "ShaderNodeValToRGB", (-800, 200))
    cr = ramp.color_ramp
    cr.elements[0].position = 0.0
    cr.elements[0].color = (0.10, 0.20, 0.035, 1)
    cr.elements[1].position = 0.55
    cr.elements[1].color = (0.13, 0.26, 0.04, 1)
    e = cr.elements.new(0.95); e.color = (0.17, 0.27, 0.05, 1)
    e = cr.elements.new(1.0); e.color = (0.32, 0.26, 0.09, 1)
    # blade coordinate perturbed by instance random so tips differ
    jit = math_node(nt, "MULTIPLY", oi.outputs["Random"], 0.08, (-1000, 100))
    sx = math_node(nt, "ADD", sep.outputs[0], jit, (-950, 200))
    nt.links.new(sx, ramp.inputs[0])
    # per instance hue/value variation
    hsv = node(nt, "ShaderNodeHueSaturation", (-500, 200))
    hval = math_node(nt, "MULTIPLY_ADD", oi.outputs["Random"], 0.06, 0.47 + hue_shift, (-700, 0))
    nt.links.new(hval, hsv.inputs["Hue"])
    vval = math_node(nt, "MULTIPLY_ADD", oi.outputs["Random"], 0.5, 0.75, (-700, -120))
    nt.links.new(vval, hsv.inputs["Value"])
    nt.links.new(ramp.outputs[0], hsv.inputs["Color"])
    # fine streaky noise (cell rows) along the blade
    tc = node(nt, "ShaderNodeTexCoord", (-1400, -500))
    mp = node(nt, "ShaderNodeMapping", (-1200, -500))
    mp.inputs["Scale"].default_value = (6.0, 160.0, 1.0)
    nt.links.new(uv.outputs[0], mp.inputs[0])
    nz = node(nt, "ShaderNodeTexNoise", (-1000, -500))
    nz.inputs["Scale"].default_value = 3.0
    nz.inputs["Detail"].default_value = 6.0
    nt.links.new(mp.outputs[0], nz.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.location = (-300, 200)
    mix.inputs[0].default_value = 0.5
    nt.links.new(hsv.outputs[0], mix.inputs[6])
    nzc = node(nt, "ShaderNodeMapRange", (-600, -400))
    nzc.inputs["To Min"].default_value = 0.75
    nzc.inputs["To Max"].default_value = 1.25
    nt.links.new(nz.outputs["Fac"], nzc.inputs["Value"])
    comb = node(nt, "ShaderNodeCombineXYZ", (-450, -400))
    for i in range(3):
        nt.links.new(nzc.outputs[0], comb.inputs[i])
    nt.links.new(comb.outputs[0], mix.inputs[7])
    base = mix.outputs[2]
    if dry > 0:
        dmix = nt.nodes.new("ShaderNodeMix"); dmix.data_type = "RGBA"; dmix.location = (-150, 300)
        dmix.inputs[0].default_value = dry
        nt.links.new(base, dmix.inputs[6]); dmix.inputs[7].default_value = (0.36, 0.28, 0.12, 1)
        base = dmix.outputs[2]
    nt.links.new(base, p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.38
    p.inputs["Specular IOR Level"].default_value = 0.55
    # parallel veins as bump: UV.y across the blade (0..1)
    veins = math_node(nt, "MULTIPLY", sep.outputs[1], 11.0 * math.pi, (-1000, -800))
    vs = math_node(nt, "SINE", veins, None, (-850, -800))
    va = math_node(nt, "ABSOLUTE", vs, None, (-700, -800))
    bump = node(nt, "ShaderNodeBump", (-300, -600))
    bump.inputs["Strength"].default_value = 0.25
    bump.inputs["Distance"].default_value = 0.00004
    nt.links.new(va, bump.inputs["Height"])
    nt.links.new(bump.outputs[0], p.inputs["Normal"])
    # translucency (backlit glow)
    tr = node(nt, "ShaderNodeBsdfTranslucent", (0, -300))
    tmix = nt.nodes.new("ShaderNodeMix"); tmix.data_type = "RGBA"; tmix.blend_type = "MULTIPLY"; tmix.location = (-150, -300)
    tmix.inputs[0].default_value = 1.0
    nt.links.new(base, tmix.inputs[6]); tmix.inputs[7].default_value = (1.7, 2.05, 0.55, 1)
    nt.links.new(tmix.outputs[2], tr.inputs["Color"])
    nt.links.new(bump.outputs[0], tr.inputs["Normal"])
    ms = node(nt, "ShaderNodeMixShader", (250, 0))
    ms.inputs[0].default_value = 0.0 if __import__("os").environ.get("S1_NOTRANS") == "1" else 0.42
    nt.links.new(p.outputs[0], ms.inputs[1])
    nt.links.new(tr.outputs[0], ms.inputs[2])
    nt.links.new(ms.outputs[0], out.inputs["Surface"])
    if __import__("os").environ.get("S1_PLAIN") == "1":
        nt.links.new(p.outputs[0], out.inputs["Surface"])
        for n in list(nt.nodes):
            if n not in (p, out):
                nt.nodes.remove(n)
    return m


def mat_dew(name="Dew"):
    m = C.mat_water(name)
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (0.97, 0.99, 1.0, 1)
    p.inputs["Roughness"].default_value = 0.0
    return m


def mat_seedling(kind, name=None):
    """Seedling tissues. kind: stem / leaf / cotyledon / hair / crumb."""
    if kind == "leaf":
        return mat_leaf(name or "Seedling_leaf")
    m, nt, p = C.new_mat(name or ("Seedling_" + kind))
    out = nt.nodes["Material Output"]
    if kind == "hair":
        p.inputs["Base Color"].default_value = (0.85, 0.9, 0.75, 1)
        p.inputs["Roughness"].default_value = 0.35
        p.inputs["Transmission Weight"].default_value = 0.6
        p.inputs["IOR"].default_value = 1.45
        return m
    if kind == "crumb":
        tc = node(nt, "ShaderNodeTexCoord", (-900, 0))
        nz = node(nt, "ShaderNodeTexNoise", (-700, 0))
        nz.inputs["Scale"].default_value = 900.0
        nz.inputs["Detail"].default_value = 8.0
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        ramp = node(nt, "ShaderNodeValToRGB", (-450, 0))
        ramp.color_ramp.elements[0].color = (0.045, 0.03, 0.02, 1)
        ramp.color_ramp.elements[1].color = (0.16, 0.11, 0.07, 1)
        nt.links.new(nz.outputs["Fac"], ramp.inputs[0])
        nt.links.new(ramp.outputs[0], p.inputs["Base Color"])
        p.inputs["Roughness"].default_value = 0.85
        bump = node(nt, "ShaderNodeBump", (-300, -300))
        bump.inputs["Distance"].default_value = 0.0002
        nt.links.new(nz.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs[0], p.inputs["Normal"])
        return m
    if kind == "stem":
        col, sss_col, rough = (0.30, 0.48, 0.13), (0.45, 0.75, 0.2), 0.35
    elif kind == "cotyledon":
        col, sss_col, rough = (0.52, 0.55, 0.20), (0.8, 0.75, 0.3), 0.28
    else:
        col, sss_col, rough = (0.09, 0.26, 0.035), (0.35, 0.75, 0.12), 0.42
    p.inputs["Base Color"].default_value = (*col, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Subsurface Weight"].default_value = 0.6 if kind != "leaf" else 0.35
    p.inputs["Subsurface Radius"].default_value = sss_col
    p.inputs["Subsurface Scale"].default_value = 0.0006 if kind != "leaf" else 0.0005
    p.inputs["Specular IOR Level"].default_value = 0.5
    p.inputs["Coat Weight"].default_value = 0.08 if kind == "cotyledon" else 0.0
    tc = node(nt, "ShaderNodeTexCoord", (-1200, 0))
    uvn = node(nt, "ShaderNodeUVMap", (-1200, -300))
    # mottling
    nz = node(nt, "ShaderNodeTexNoise", (-900, 200))
    nz.inputs["Scale"].default_value = 180.0 if kind != "leaf" else 90.0
    nz.inputs["Detail"].default_value = 5.0
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    mr = node(nt, "ShaderNodeMapRange", (-700, 200))
    mr.inputs["To Min"].default_value = 0.8
    mr.inputs["To Max"].default_value = 1.2
    nt.links.new(nz.outputs["Fac"], mr.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.location = (-450, 200)
    mul.inputs[0].default_value = 1.0
    mul.inputs[6].default_value = (*col, 1)
    comb = node(nt, "ShaderNodeCombineXYZ", (-550, 50))
    for i in range(3):
        nt.links.new(mr.outputs[0], comb.inputs[i])
    nt.links.new(comb.outputs[0], mul.inputs[7])
    base = mul.outputs[2]
    height = None
    if kind == "leaf":
        # veins from leaf UV: u along midrib (0 attach .. 1 tip), v across (-1..1) stored as (u, v*0.5+0.5)
        sep = node(nt, "ShaderNodeSeparateXYZ", (-1000, -300))
        nt.links.new(uvn.outputs[0], sep.inputs[0])
        v = math_node(nt, "MULTIPLY_ADD", sep.outputs[1], 2.0, -1.0, (-850, -350))
        av = math_node(nt, "ABSOLUTE", v, None, (-700, -350))
        u = sep.outputs[0]
        # midrib
        tw = math_node(nt, "MULTIPLY_ADD", u, -0.025, 0.035, (-700, -500))
        mid = math_node(nt, "LESS_THAN", av, tw, (-550, -450))
        # pinnate laterals sweeping toward the tip
        ph = math_node(nt, "MULTIPLY_ADD", av, -1.9, u, (-550, -600))
        ph2 = math_node(nt, "MULTIPLY", ph, 6.5, (-400, -600))
        fr = math_node(nt, "FRACT", ph2, None, (-250, -600))
        d = math_node(nt, "SUBTRACT", fr, 0.5, (-100, -600))
        ad = math_node(nt, "ABSOLUTE", d, None, (50, -600))
        lat = math_node(nt, "GREATER_THAN", ad, 0.455, (200, -600))
        # reticulate network
        vor = node(nt, "ShaderNodeTexVoronoi", (-550, -800))
        vor.feature = "DISTANCE_TO_EDGE"
        vor.inputs["Scale"].default_value = 1300.0
        nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
        net = math_node(nt, "LESS_THAN", vor.outputs["Distance"], 0.06, (-350, -800))
        netw = math_node(nt, "MULTIPLY", net, 0.35, (-200, -800))
        vmax = math_node(nt, "MAXIMUM", mid, lat, (350, -500))
        vall = math_node(nt, "MAXIMUM", vmax, netw, (500, -500))
        height = vall
        lighter = nt.nodes.new("ShaderNodeMix"); lighter.data_type = "RGBA"; lighter.location = (650, 150)
        nt.links.new(vmax, lighter.inputs[0])
        nt.links.new(base, lighter.inputs[6])
        lighter.inputs[7].default_value = (0.20, 0.38, 0.08, 1)
        base = lighter.outputs[2]
    else:
        # longitudinal fibre streaks / wrinkles
        wv = node(nt, "ShaderNodeTexWave", (-900, -500))
        wv.wave_type = "BANDS"
        wv.bands_direction = "Z"
        wv.inputs["Scale"].default_value = 300.0
        wv.inputs["Distortion"].default_value = 4.0
        wv.inputs["Detail"].default_value = 3.0
        nt.links.new(tc.outputs["Object"], wv.inputs["Vector"])
        height = wv.outputs["Fac"]
    nt.links.new(base, p.inputs["Base Color"])
    bump = node(nt, "ShaderNodeBump", (800, -400))
    bump.inputs["Strength"].default_value = 0.35 if kind == "leaf" else 0.15
    bump.inputs["Distance"].default_value = 0.00008
    if kind == "leaf":
        bump.invert = True
    nt.links.new(height, bump.inputs["Height"])
    nt.links.new(bump.outputs[0], p.inputs["Normal"])
    if kind == "leaf":
        tr = node(nt, "ShaderNodeBsdfTranslucent", (900, -100))
        tm = nt.nodes.new("ShaderNodeMix"); tm.data_type = "RGBA"; tm.blend_type = "MULTIPLY"; tm.location = (750, -100)
        tm.inputs[0].default_value = 1.0
        nt.links.new(base, tm.inputs[6]); tm.inputs[7].default_value = (1.6, 1.9, 0.8, 1)
        nt.links.new(tm.outputs[2], tr.inputs["Color"])
        nt.links.new(bump.outputs[0], tr.inputs["Normal"])
        ms = node(nt, "ShaderNodeMixShader", (1100, 0))
        ms.inputs[0].default_value = 0.3
        nt.links.new(p.outputs[0], ms.inputs[1]); nt.links.new(tr.outputs[0], ms.inputs[2])
        nt.links.new(ms.outputs[0], out.inputs["Surface"])
    return m


# --------------------------------------------------------------------------- geometry builders

def _frames_along(pts):
    """Parallel-transport frames (tangent, normal, binormal) along a polyline."""
    tans = []
    for i in range(len(pts)):
        a = pts[max(0, i - 1)]; b = pts[min(len(pts) - 1, i + 1)]
        tans.append((b - a).normalized())
    ref = Vector((1, 0, 0)) if abs(tans[0].x) < 0.9 else Vector((0, 1, 0))
    n = tans[0].cross(ref).normalized()
    out = []
    for i, t in enumerate(tans):
        if i > 0:
            n = (n - t * n.dot(t)).normalized()
        b = t.cross(n)
        out.append((t, n, b))
    return out


def tube(bm, pts, radii, n_around=12, cap_end=True, uv_layer=None, jitter=0.0, rng=None):
    """Append a tube along pts (list of Vector) to bm. Returns list of rings (lists of BMVerts) + frames."""
    frames = _frames_along(pts)
    rings = []
    for i, (p, (t, n, b)) in enumerate(zip(pts, frames)):
        ring = []
        for k in range(n_around):
            a = 2 * math.pi * k / n_around
            r = radii[i] * (1 + (rng.uniform(-jitter, jitter) if rng and jitter else 0))
            ring.append(bm.verts.new(p + (n * math.cos(a) + b * math.sin(a)) * r))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(n_around):
            k2 = (k + 1) % n_around
            f = bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
            if uv_layer is not None:
                for loop, (uu, vv) in zip(f.loops, ((k / n_around, i / (len(rings) - 1)), ((k + 1) / n_around, i / (len(rings) - 1)),
                                                 ((k + 1) / n_around, (i + 1) / (len(rings) - 1)), (k / n_around, (i + 1) / (len(rings) - 1)))):
                    loop[uv_layer].uv = (uu, vv)
    if cap_end:
        tip = bm.verts.new(pts[-1] + frames[-1][0] * radii[-1] * 0.6)
        for k in range(n_around):
            bm.faces.new((rings[-1][k], rings[-1][(k + 1) % n_around], tip))
    return rings, frames


def ellipsoid(bm, center, radii, rot=Matrix.Identity(3), subdiv=2, mat_index=0, noise_amp=0.0, rng=None):
    """Append an icosphere-based ellipsoid to bm."""
    tmp = bmesh.new()
    bmesh.ops.create_icosphere(tmp, subdivisions=subdiv, radius=1.0)
    off = Vector((rng.uniform(-50, 50), rng.uniform(-50, 50), rng.uniform(-50, 50))) if rng else Vector()
    from mathutils import noise as mnoise
    vmap = {}
    for v in tmp.verts:
        d = v.co.copy()
        if noise_amp:
            d *= 1 + noise_amp * mnoise.noise(d * 2.3 + off)
        p = rot @ Vector((d.x * radii[0], d.y * radii[1], d.z * radii[2])) + Vector(center)
        vmap[v] = bm.verts.new(p)
    for f in tmp.faces:
        nf = bm.faces.new([vmap[v] for v in f.verts])
        nf.material_index = mat_index
        nf.smooth = True
    tmp.free()


def grass_blade(name, rng, length, width, lean, droop, twist, dew=0, tip_drop=0.0, col=None, mats=(), seg=22,
                dew_scale=1.0, hairy=False):
    """Grass blade standing at the origin, rising along +Z and arching toward +X.
    lean: initial angle from vertical (rad); droop: additional bend toward the tip (rad).
    Dew: number of sessile drops on the upper face; tip_drop: radius of a pendant drop at the tip (m)."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    # centreline
    pts = [Vector((0, 0, 0))]
    ds = length / seg
    angs = []
    for i in range(seg + 1):
        s = i / seg
        a = lean + droop * s ** 1.6
        angs.append(a)
        if i:
            pa = angs[i - 1]
            pts.append(pts[-1] + Vector((math.sin(pa), 0, math.cos(pa))) * ds)
    # small S wobble sideways
    ph = rng.uniform(0, 6.28)
    for i, p in enumerate(pts):
        s = i / seg
        p.y += 0.04 * length * math.sin(ph + s * 3.0) * s
    rows = []
    across = (-1.0, -0.5, 0.0, 0.5, 1.0)
    for i, p in enumerate(pts):
        s = i / seg
        t = (pts[min(seg, i + 1)] - pts[max(0, i - 1)]).normalized()
        lat = Vector((0, 1, 0))
        lat = (lat - t * lat.dot(t)).normalized()
        q = Quaternion(t, twist * s)
        lat = q @ lat
        nrm = t.cross(lat).normalized()      # faces roughly up/back (-X when arching to +X) -> upper face
        if nrm.z < 0:
            nrm = -nrm
        w = width * min(1.0, (1 - s) / 0.28) ** 0.85 * (0.75 + 0.25 * min(1.0, s / 0.12))
        if i == seg:
            w = width * 0.02
        row = []
        for v in across:
            fold = 0.22 * abs(v) * w      # keeled: edges raised (V channel)
            row.append(bm.verts.new(p + lat * (v * w) + nrm * fold))
        rows.append((row, p, t, lat, nrm, w))
    for i in range(seg):
        for k in range(len(across) - 1):
            f = bm.faces.new((rows[i][0][k], rows[i][0][k + 1], rows[i + 1][0][k + 1], rows[i + 1][0][k]))
            f.material_index = 0
            f.smooth = True
            for loop, (uu, vv) in zip(f.loops, ((i / seg, k / 4), (i / seg, (k + 1) / 4), ((i + 1) / seg, (k + 1) / 4),
                                                 ((i + 1) / seg, k / 4))):
                loop[uvl].uv = (uu, vv)
    # dew
    for _ in range(dew):
        s = rng.uniform(0.18, 0.93)
        i = int(s * seg)
        row, p, t, lat, nrm, w = rows[i]
        v = rng.uniform(-0.55, 0.55)
        r = (rng.random() ** 2.2) * 0.0011 * dew_scale + 0.00012
        r = min(r, w * 0.9)
        c = p + lat * (v * w) + nrm * (0.22 * abs(v) * w + r * 0.62)
        rot = Matrix((lat, t, nrm)).transposed()
        ellipsoid(bm, c, (r, r * 1.05, r * 0.78), rot, subdiv=2, mat_index=1)
    if tip_drop > 0:
        row, p, t, lat, nrm, w = rows[-1]
        c = p + Vector((0, 0, -tip_drop * 0.8)) + t * tip_drop * 0.2
        ellipsoid(bm, c, (tip_drop, tip_drop, tip_drop * 1.08), subdiv=3, mat_index=1)
    o = bm_to_obj(name, bm, mats, smooth=True, col=col)
    return o, [r[1] for r in rows]


def seed_head(name, rng, height, col=None, mats=()):
    """Grass flowering stem with a loose panicle of spikelets (meadow grass in seed)."""
    bm = bmesh.new()
    seg = 18
    lean = rng.uniform(-0.12, 0.12)
    pts = []
    for i in range(seg + 1):
        s = i / seg
        pts.append(Vector((math.sin(lean) * s * height + 0.02 * height * s * s, 0, s * height)))
    radii = [0.0011 * (1 - 0.5 * i / seg) for i in range(seg + 1)]
    tube(bm, pts, radii, n_around=6, cap_end=True)
    for f in bm.faces:
        f.material_index = 0
    top = pts[-1]
    n = rng.randint(14, 26)
    for k in range(n):
        s = rng.uniform(0.0, 1.0)
        z = top.z - s * height * 0.22
        a = rng.uniform(0, 6.28)
        rr = 0.004 + 0.012 * s
        c = Vector((top.x * (z / top.z) + math.cos(a) * rr, math.sin(a) * rr, z))
        dirv = (c - Vector((top.x * (z / top.z), 0, z - 0.01))).normalized()
        q = Vector((0, 0, 1)).rotation_difference(dirv).to_matrix()
        ellipsoid(bm, c, (0.0009, 0.0009, 0.0032), q, subdiv=1, mat_index=1, rng=rng)
    return bm_to_obj(name, bm, mats, col=col)


def leaf_mesh(bm, uvl, length, width, cup=0.12, curl=0.10, notch=0.18, rng=None, res_r=14, res_a=28, mat_index=0):
    """Heart-shaped (cordate, acuminate) leaf in its local frame: attachment at origin, midrib along +X,
    face normal +Z. Returns verts. UV: (u along midrib, v across)."""
    # outline r(theta): sample a smooth outline polygon then build a polar grid
    def half_width(x):  # x in [-notch, 1] (units of length)
        if x < 0:
            # basal lobes: rounded, extend backward
            return 0.62 * math.sqrt(max(0.0, 1 - (x / notch) ** 2)) * (1 - 0.15 * (x / notch) ** 2) + 0.0
        s = x
        w = (1 - s) ** 0.85 * (0.62 + 0.9 * s) * (1 if s < 0.85 else 1 - 0.6 * (s - 0.85) / 0.15)
        return max(0.0, min(w, 0.62 + 0.7 * s * (1 - s) * 1.3))
    outline = []
    na = res_a
    for k in range(na + 1):
        th = -math.pi + 2 * math.pi * k / na
        # find radius along direction th where |y| == half_width(x)*width ratio
        lo, hi = 0.0, 1.2
        for _ in range(40):
            mid = 0.5 * (lo + hi)
            x = mid * math.cos(th); y = mid * math.sin(th)
            inside = (-notch <= x <= 1.0) and abs(y) <= half_width(x) * (width / length) * 1.0
            # notch: cut a V at the back between the lobes
            if x < 0 and abs(y) < (-x) * 0.55:
                inside = False
            if inside:
                lo = mid
            else:
                hi = mid
        outline.append(max(lo, 0.02))
    verts = []
    grid = []
    from mathutils import noise as mnoise
    off = Vector((rng.uniform(-90, 90), rng.uniform(-90, 90), 0)) if rng else Vector()
    for i in range(res_r + 1):
        s = (i / res_r) ** 0.85
        row = []
        for k in range(na + 1):
            th = -math.pi + 2 * math.pi * k / na
            r = outline[k] * s
            x = r * math.cos(th); y = r * math.sin(th)
            X, Y = x * length, y * length
            yn = y / (width / length * 0.62 + 1e-9)
            z = cup * length * (abs(yn) ** 2) * 0.5 - curl * length * max(0.0, x) ** 2
            z += 0.012 * length * mnoise.noise(Vector((X * 300, Y * 300, 0)) + off) * s
            v = bm.verts.new((X, Y, z))
            row.append(v)
            verts.append(v)
        grid.append(row)
    for i in range(res_r):
        for k in range(na):
            if i == 0:
                quad = (grid[0][k], grid[1][k], grid[1][k + 1])
                # degenerate centre: make a triangle fan
                f = bm.faces.new((grid[1][k], grid[1][k + 1], grid[0][0])) if k == 0 or True else None
            else:
                f = bm.faces.new((grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1]))
            f.material_index = mat_index
            f.smooth = True
            for loop in f.loops:
                co = loop.vert.co
                loop[uvl].uv = (max(0.0, co.x / length), 0.5 + 0.5 * co.y / (width * 0.66 + 1e-9))
    bmesh.ops.remove_doubles(bm, verts=[v for row in grid[:1] for v in row], dist=1e-7)
    return verts


def build_seedling(name="Seedling", loc=(0, 0, 0), rot_z=0.0, seed=7, height=0.062, landing_leaf="R"):
    """Hero bean seedling (BRIEF §4): ~6 cm, pale translucent hairy hypocotyl, two thick cotyledons,
    two heart-shaped true leaves with veins, soil crumbs. Returns dict with root, leaf pivots, etc.
    Local frame: base at origin, up +Z; true leaves spread along ±X, cotyledons along ±Y."""
    rng = random.Random(seed)
    m_stem, m_leaf, m_cot = mat_seedling("stem"), mat_seedling("leaf"), mat_seedling("cotyledon")
    m_hair, m_crumb = mat_seedling("hair"), mat_seedling("crumb")
    root = C.empty(name, loc)
    root.rotation_euler = (0, 0, rot_z)
    root.empty_display_size = 0.01
    H = height
    node_z = H * 0.62
    # hypocotyl: slight lean and S curve
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
    hyp = []
    n = 26
    for i in range(n + 1):
        s = i / n
        hyp.append(Vector((0.0015 * math.sin(s * 3.1 + 0.4), -0.001 * math.sin(s * 2.2), -0.004 + (node_z + 0.004) * s)))
    r_h = [0.00135 * (1.08 - 0.18 * (i / n)) for i in range(n + 1)]
    rings_h, fr_h = tube(bm, hyp, r_h, n_around=16, cap_end=False, uv_layer=uvl)
    # epicotyl
    top_z = H * 0.86
    epi = []
    for i in range(13):
        s = i / 12
        epi.append(hyp[-1] + Vector((-0.0008 * s, 0.0004 * math.sin(s * 3), (top_z - node_z) * s)))
    r_e = [0.00095 * (1 - 0.15 * i / 12) for i in range(13)]
    rings_e, fr_e = tube(bm, epi, r_e, n_around=12, cap_end=True, uv_layer=uvl)
    stem = bm_to_obj(name + "_stem", bm, [m_stem])
    stem.parent = root
    # hairs on hypocotyl + epicotyl
    bm = bmesh.new()
    for path, radii, cnt in ((hyp, r_h, 520), (epi, r_e, 260)):
        frames = _frames_along(path)
        for _ in range(cnt):
            i = rng.randint(1, len(path) - 2)
            t, nn, bb = frames[i]
            a = rng.uniform(0, 6.28)
            nrm = (nn * math.cos(a) + bb * math.sin(a))
            base = path[i] + nrm * radii[i] * 0.95
            d = (nrm * 0.75 + t * 0.65).normalized()
            L = rng.uniform(0.00025, 0.0008)
            r0 = 0.000016
            side = d.cross(Vector((0, 0, 1))).normalized() if abs(d.z) < 0.99 else Vector((1, 0, 0))
            side2 = d.cross(side)
            v0 = bm.verts.new(base + side * r0); v1 = bm.verts.new(base - side * r0 * 0.5 + side2 * r0 * 0.86)
            v2 = bm.verts.new(base - side * r0 * 0.5 - side2 * r0 * 0.86)
            mid = base + d * L * 0.6 + Vector((0, 0, L * 0.12))
            tip = bm.verts.new(base + d * L + Vector((0, 0, L * 0.25)))
            for a_, b_ in ((v0, v1), (v1, v2), (v2, v0)):
                bm.faces.new((a_, b_, tip))
    hairs = bm_to_obj(name + "_hairs", bm, [m_hair], smooth=False)
    hairs.parent = root
    # soil crumbs stuck on the stem
    bm = bmesh.new()
    for (i, a, r) in ((3, 0.6, 0.00075), (6, 2.9, 0.0005), (11, 4.4, 0.00035)):
        t, nn, bb = _frames_along(hyp)[i]
        nrm = nn * math.cos(a) + bb * math.sin(a)
        c = hyp[i] + nrm * (r_h[i] + r * 0.45)
        ellipsoid(bm, c, (r, r * 0.8, r * 0.9), Euler((rng.uniform(0, 3), rng.uniform(0, 3), 0)).to_matrix(), subdiv=2,
                  noise_amp=0.45, rng=rng)
    crumbs = bm_to_obj(name + "_crumbs", bm, [m_crumb])
    crumbs.parent = root
    # cotyledons (thick, fleshy, kidney-shaped) at the node, along ±Y, drooping slightly
    for sgn in (1, -1):
        bm = bmesh.new()
        L, Wd, T = 0.0145, 0.0085, 0.0034
        c = Vector((0, sgn * (L * 0.5 + 0.0006), 0))
        ellipsoid(bm, c, (Wd * 0.5, L * 0.5, T * 0.5), subdiv=4, noise_amp=0.05, rng=rng)
        # kidney bend + flat inner face
        for v in bm.verts:
            yy = (v.co.y - c.y) / (L * 0.5)
            v.co.x += -0.0022 * (1 - yy * yy)
            if v.co.z > 0:
                v.co.z *= 0.55
        o = bm_to_obj(name + f"_cot{sgn:+d}", bm, [m_cot])
        o.parent = root
        o.location = Vector(hyp[-1]) + Vector((0, 0, -0.0012))
        o.rotation_euler = (math.radians(-28 * sgn), 0, math.radians(rng.uniform(-8, 8)))
    # true leaves: petiole + blade, opposite along ±X. Each blade hangs on a pivot (for the drop impact).
    pivots = {}
    for side, sgn in (("R", 1), ("L", -1)):
        ang_up = math.radians(24 if side == "R" else 30)
        pet_len = 0.0075
        bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
        pet = [Vector((sgn * pet_len * s * math.cos(ang_up + 0.5 * (1 - s)), 0, pet_len * s * math.sin(ang_up + 0.5 * (1 - s))))
               for s in [i / 8 for i in range(9)]]
        tube(bm, pet, [0.00055 * (1 - 0.25 * i / 8) for i in range(9)], n_around=8, cap_end=True, uv_layer=uvl)
        po = bm_to_obj(name + f"_petiole{side}", bm, [m_stem])
        po.parent = root
        po.location = epi[-1] + Vector((0, 0, -0.0008))
        piv = C.empty(name + f"_pivot{side}", (0, 0, 0))
        piv.empty_display_size = 0.005
        piv.parent = root
        piv.location = po.location + pet[-1]
        piv.rotation_euler = (0, -ang_up * 0.55, 0) if sgn > 0 else (0, -ang_up * 0.55, math.pi)
        bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
        Lb = 0.027 if side == "R" else 0.025
        leaf_mesh(bm, uvl, Lb, Lb * 0.56, cup=0.10, curl=0.12, rng=rng)
        lo = bm_to_obj(name + f"_leaf{side}", bm, [m_leaf])
        sol = lo.modifiers.new("thick", "SOLIDIFY"); sol.thickness = 0.00025; sol.offset = 0
        sub = lo.modifiers.new("sub", "SUBSURF"); sub.levels = 1; sub.render_levels = 2
        lo.parent = piv
        lo.location = (-0.0006, 0, 0)
        pivots[side] = (piv, lo, Lb)
    return {"root": root, "stem": stem, "pivots": pivots, "top": epi[-1], "node": hyp[-1]}


# --------------------------------------------------------------------------- instancing (geometry nodes)

def point_cloud(name, pts, attrs, col=None):
    """Mesh of loose verts carrying per-point attributes {name: (type, values)} (type INT/FLOAT/FLOAT_VECTOR)."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in pts], [], [])
    for an, (tp, vals) in attrs.items():
        a = me.attributes.new(an, tp, "POINT")
        if tp == "FLOAT_VECTOR":
            a.data.foreach_set("vector", [c for v in vals for c in v])
        else:
            a.data.foreach_set("value", list(vals))
    o = bpy.data.objects.new(name, me)
    (col or bpy.context.scene.collection).objects.link(o)
    return o


def clock_empty(name="TauClock"):
    """Empty whose location.x carries the warped time tau (keyframed per frame); GN reads it."""
    e = bpy.data.objects.get(name)
    if e is None:
        e = C.empty(name)
    return e


def tau_socket(nt, clock, loc=(-1000, -500)):
    oi = node(nt, "GeometryNodeObjectInfo", loc)
    oi.inputs["Object"].default_value = clock
    sp = node(nt, "ShaderNodeSeparateXYZ", (loc[0] + 200, loc[1]))
    nt.links.new(oi.outputs["Location"], sp.inputs[0])
    return sp.outputs[0]


def key_clock(clock, frames_values):
    for f, v in frames_values:
        clock.location.x = v
        clock.keyframe_insert("location", index=0, frame=f)
    for fc in C.fcurves(clock):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
        fc.extrapolation = "LINEAR"


def gn_instancer(obj, inst_col, sway=0.0, sway_scale=4.0, sway_speed=0.6, name="Instancer", clock=None, realize=False):
    """Geometry nodes: instance children of inst_col on obj's points using attributes vidx (int),
    rot (euler vector), scl (float). Optional breeze: per-instance rotation from 4D noise driven by
    the modifier input 'Tau' (keyframe it)."""
    ng = bpy.data.node_groups.new(name, "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    tau_s = ng.interface.new_socket("Tau", in_out="INPUT", socket_type="NodeSocketFloat")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    nt = ng
    gi = node(nt, "NodeGroupInput", (-1000, 0))
    go = node(nt, "NodeGroupOutput", (800, 0))
    ci = node(nt, "GeometryNodeCollectionInfo", (-800, -200))
    ci.inputs["Collection"].default_value = inst_col
    ci.inputs["Separate Children"].default_value = True
    ci.inputs["Reset Children"].default_value = True
    iop = node(nt, "GeometryNodeInstanceOnPoints", (-300, 0))
    nt.links.new(gi.outputs[0], iop.inputs["Points"])
    nt.links.new(ci.outputs[0], iop.inputs["Instance"])
    iop.inputs["Pick Instance"].default_value = True
    na = node(nt, "GeometryNodeInputNamedAttribute", (-800, 100)); na.data_type = "INT"; na.inputs["Name"].default_value = "vidx"
    nt.links.new(na.outputs["Attribute"], iop.inputs["Instance Index"])
    nr = node(nt, "GeometryNodeInputNamedAttribute", (-800, 0)); nr.data_type = "FLOAT_VECTOR"; nr.inputs["Name"].default_value = "rot"
    e2r = node(nt, "FunctionNodeEulerToRotation", (-550, 0))
    nt.links.new(nr.outputs["Attribute"], e2r.inputs[0])
    nt.links.new(e2r.outputs[0], iop.inputs["Rotation"])
    ns = node(nt, "GeometryNodeInputNamedAttribute", (-800, -100)); ns.data_type = "FLOAT"; ns.inputs["Name"].default_value = "scl"
    nt.links.new(ns.outputs["Attribute"], iop.inputs["Scale"])
    last = iop.outputs[0]
    if sway > 0:
        pos = node(nt, "GeometryNodeInputPosition", (-300, -300))
        nz = node(nt, "ShaderNodeTexNoise", (0, -300))
        nz.noise_dimensions = "4D"
        nz.inputs["Scale"].default_value = sway_scale
        nz.inputs["Detail"].default_value = 1.0
        nt.links.new(pos.outputs[0], nz.inputs["Vector"])
        tm = math_node(nt, "MULTIPLY", tau_socket(nt, clock), sway_speed, (-200, -450))
        nt.links.new(tm, nz.inputs["W"])
        sub = node(nt, "ShaderNodeVectorMath", (200, -300)); sub.operation = "SUBTRACT"
        nt.links.new(nz.outputs["Color"], sub.inputs[0]); sub.inputs[1].default_value = (0.5, 0.5, 0.5)
        sc = node(nt, "ShaderNodeVectorMath", (350, -300)); sc.operation = "MULTIPLY"
        nt.links.new(sub.outputs[0], sc.inputs[0]); sc.inputs[1].default_value = (sway, sway, sway * 0.3)
        e2 = node(nt, "FunctionNodeEulerToRotation", (500, -300))
        nt.links.new(sc.outputs[0], e2.inputs[0])
        ri = node(nt, "GeometryNodeRotateInstances", (600, 0))
        nt.links.new(last, ri.inputs["Instances"])
        nt.links.new(e2.outputs[0], ri.inputs["Rotation"])
        ri.inputs["Local Space"].default_value = False
        # pivot = instance position (blade root)
        nt.links.new(pos.outputs[0], ri.inputs["Pivot Point"])
        last = ri.outputs[0]
    if realize:
        # one flat BVH: much faster than thousands of overlapping instance BVHs for dense thin grass
        rz = node(nt, "GeometryNodeRealizeInstances", (700, 0))
        nt.links.new(last, rz.inputs[0])
        last = rz.outputs[0]
    nt.links.new(last, go.inputs[0])
    mod = obj.modifiers.new(name, "NODES")
    mod.node_group = ng
    return mod


def key_mod_input(obj, mod, sock_name, frames_values):
    ident = None
    for it in mod.node_group.interface.items_tree:
        if getattr(it, "in_out", None) == "INPUT" and it.name == sock_name:
            ident = it.identifier
    for f, v in frames_values:
        mod[ident] = v
        obj.keyframe_insert(f'modifiers["{mod.name}"]["{ident}"]', frame=f)
    for fc in C.fcurves(obj):
        if ident in fc.data_path:
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"
            fc.extrapolation = "LINEAR"


def motes(name, n, box_min, box_max, rng, r_range=(0.00003, 0.00009), strength=6.0, color=(1.0, 0.75, 0.42),
          drift=(0.004, 0.0, 0.006), wobble=0.004, clock=None):
    """Glowing pollen / dust motes as instanced tiny spheres. Positions animate with modifier input Tau:
    p = p0 + drift*tau*k + wobble*sin(...)."""
    pts, vel, ph, rad = [], [], [], []
    for _ in range(n):
        pts.append(Vector([rng.uniform(a, b) for a, b in zip(box_min, box_max)]))
        k = rng.uniform(0.5, 1.5)
        vel.append(Vector(drift) * k + Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * 0.0015)
        ph.append(Vector((rng.uniform(0, 6.28), rng.uniform(0, 6.28), rng.uniform(0, 6.28))))
        rad.append(rng.uniform(*r_range))
    o = point_cloud(name, pts, {"vel": ("FLOAT_VECTOR", vel), "ph": ("FLOAT_VECTOR", ph), "rad": ("FLOAT", rad)})
    m, nt, p = C.new_mat(name + "_mat")
    m.cycles.emission_sampling = "NONE"   # motes are tiny: never light-sample them
    out = nt.nodes["Material Output"]
    em = node(nt, "ShaderNodeEmission", (0, 0))
    em.inputs["Color"].default_value = (*color, 1)
    em.inputs["Strength"].default_value = strength
    tr = node(nt, "ShaderNodeBsdfTranslucent", (0, -150))
    tr.inputs["Color"].default_value = (*color, 1)
    ad = node(nt, "ShaderNodeAddShader", (200, 0))
    nt.links.new(em.outputs[0], ad.inputs[0]); nt.links.new(tr.outputs[0], ad.inputs[1])
    nt.links.new(ad.outputs[0], out.inputs["Surface"])
    ng = bpy.data.node_groups.new(name + "_gn", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Tau", in_out="INPUT", socket_type="NodeSocketFloat")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    nt = ng
    gi = node(nt, "NodeGroupInput", (-1200, 0)); go = node(nt, "NodeGroupOutput", (900, 0))
    def attr(nm, tp):
        a = node(nt, "GeometryNodeInputNamedAttribute"); a.data_type = tp; a.inputs["Name"].default_value = nm
        return a.outputs["Attribute"]
    vel_a, ph_a, rad_a = attr("vel", "FLOAT_VECTOR"), attr("ph", "FLOAT_VECTOR"), attr("rad", "FLOAT")
    vm1 = node(nt, "ShaderNodeVectorMath"); vm1.operation = "SCALE"
    tau = tau_socket(nt, clock)
    nt.links.new(vel_a, vm1.inputs[0]); nt.links.new(tau, vm1.inputs["Scale"])
    # wobble: sin(ph + tau*w)
    tw = math_node(nt, "MULTIPLY", tau, 1.3)
    comb = node(nt, "ShaderNodeCombineXYZ")
    for i in range(3):
        nt.links.new(tw, comb.inputs[i])
    vadd = node(nt, "ShaderNodeVectorMath"); vadd.operation = "ADD"
    nt.links.new(ph_a, vadd.inputs[0]); nt.links.new(comb.outputs[0], vadd.inputs[1])
    vs = node(nt, "ShaderNodeVectorMath"); vs.operation = "SINE"
    nt.links.new(vadd.outputs[0], vs.inputs[0])
    vw = node(nt, "ShaderNodeVectorMath"); vw.operation = "SCALE"; vw.inputs["Scale"].default_value = wobble
    nt.links.new(vs.outputs[0], vw.inputs[0])
    off = node(nt, "ShaderNodeVectorMath"); off.operation = "ADD"
    nt.links.new(vm1.outputs[0], off.inputs[0]); nt.links.new(vw.outputs[0], off.inputs[1])
    sp = node(nt, "GeometryNodeSetPosition")
    nt.links.new(gi.outputs[0], sp.inputs["Geometry"]); nt.links.new(off.outputs[0], sp.inputs["Offset"])
    ico = node(nt, "GeometryNodeMeshIcoSphere"); ico.inputs["Radius"].default_value = 1.0; ico.inputs["Subdivisions"].default_value = 2
    iop = node(nt, "GeometryNodeInstanceOnPoints")
    nt.links.new(sp.outputs[0], iop.inputs["Points"]); nt.links.new(ico.outputs["Mesh"], iop.inputs["Instance"])
    comb2 = node(nt, "ShaderNodeCombineXYZ")
    for i in range(3):
        nt.links.new(rad_a, comb2.inputs[i])
    nt.links.new(comb2.outputs[0], iop.inputs["Scale"])
    sm = node(nt, "GeometryNodeSetMaterial"); sm.inputs["Material"].default_value = m
    nt.links.new(iop.outputs[0], sm.inputs["Geometry"])
    nt.links.new(sm.outputs[0], go.inputs[0])
    mod = o.modifiers.new("motes", "NODES"); mod.node_group = ng
    return o, mod


# --------------------------------------------------------------------------- world / lens finishing

def world_hdri_clamped(path, rot_z_deg, strength=1.0, clamp=60.0, saturation=1.0, tint=(1, 1, 1)):
    """C.world_hdri + clamp of the brightest texels (the sun is supplied by a matching sun lamp, so the HDRI
    sun disc only needs to look right to camera/reflections, not light the scene)."""
    bg = C.world_hdri(path, strength=strength, rot_z_deg=rot_z_deg, saturation=saturation, tint=tint)
    nt = bpy.context.scene.world.node_tree
    src = bg.inputs["Color"].links[0].from_socket
    mn = nt.nodes.new("ShaderNodeVectorMath"); mn.operation = "MINIMUM"
    mn.inputs[1].default_value = (clamp, clamp, clamp)
    nt.links.new(src, mn.inputs[0])
    nt.links.new(mn.outputs[0], bg.inputs["Color"])
    return bg


def hdri_rot_for_sun(sun_dir_tex, want_azim_deg):
    """Rotation (deg) for C.world_hdri so that a texel direction sun_dir_tex (in unrotated world coords)
    appears at world azimuth want_azim_deg (angle from +X, CCW)."""
    phi = math.degrees(math.atan2(sun_dir_tex[1], sun_dir_tex[0]))
    return phi - want_azim_deg


def compositor_lens(glare_strength=0.35, glare_threshold=1.2, glare_size=0.6, dispersion=0.012, vignette=0.28,
                    streaks=0.0):
    """Lens finishing in the compositor: bloom/fog glow, faint sun streaks, chromatic dispersion, vignette."""
    sc = bpy.context.scene
    ng = bpy.data.node_groups.new("S1Comp", "CompositorNodeTree")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    rl = ng.nodes.new("CompositorNodeRLayers"); rl.location = (-800, 0)
    gl = ng.nodes.new("CompositorNodeGlare"); gl.location = (-500, 0)
    gl.inputs["Type"].default_value = "Bloom"
    gl.inputs["Quality"].default_value = "High"
    gl.inputs["Threshold"].default_value = glare_threshold
    gl.inputs["Strength"].default_value = glare_strength
    gl.inputs["Size"].default_value = glare_size
    ng.links.new(rl.outputs["Image"], gl.inputs["Image"])
    last = gl.outputs["Image"]
    if streaks > 0:
        g2 = ng.nodes.new("CompositorNodeGlare"); g2.location = (-300, 0)
        g2.inputs["Type"].default_value = "Ghosts"
        g2.inputs["Threshold"].default_value = 8.0
        g2.inputs["Strength"].default_value = streaks
        ng.links.new(last, g2.inputs["Image"])
        last = g2.outputs["Image"]
    ld = ng.nodes.new("CompositorNodeLensdist"); ld.location = (-100, 0)
    ld.inputs["Dispersion"].default_value = dispersion
    ld.inputs["Distortion"].default_value = 0.0
    ng.links.new(last, ld.inputs["Image"])
    last = ld.outputs["Image"]
    if vignette > 0:
        em = ng.nodes.new("CompositorNodeEllipseMask"); em.location = (-100, -300)
        em.inputs["Size"].default_value = (1.25, 1.05)
        bl = ng.nodes.new("CompositorNodeBlur"); bl.location = (100, -300)
        bl.inputs["Size"].default_value = (300, 300)
        ng.links.new(em.outputs["Mask"], bl.inputs["Image"])
        mr = ng.nodes.new("ShaderNodeMapRange"); mr.location = (300, -300)
        mr.inputs["To Min"].default_value = 1.0 - vignette
        mr.inputs["To Max"].default_value = 1.0
        ng.links.new(bl.outputs[0], mr.inputs["Value"])
        mx = ng.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MULTIPLY"; mx.location = (500, 0)
        mx.inputs[0].default_value = 1.0
        ng.links.new(last, mx.inputs[6])
        ng.links.new(mr.outputs[0], mx.inputs[7])
        last = mx.outputs[2]
    go = ng.nodes.new("NodeGroupOutput"); go.location = (700, 0)
    ng.links.new(last, go.inputs[0])
    sc.compositing_node_group = ng
    sc.render.use_compositing = True
    return ng


def diffusion_filter(cam, amount=0.035, rough=0.22, wide_amount=0.012, wide_rough=0.55, dist=0.0035, size=0.2):
    """Physical 'Pro-Mist'-style diffusion filter in front of the lens (the compositor needs EGL, which the
    farm lacks): a camera-parented plane that passes most light straight through and scatters a few %
    through rough refraction lobes -> real halation around the sun and sparkling dew, veiling glare."""
    bpy.ops.mesh.primitive_plane_add(size=size)
    p = bpy.context.object
    p.name = "DiffusionFilter"
    p.parent = cam
    p.location = (0, 0, -dist)
    p.rotation_euler = (0, 0, 0)
    for a in ("visible_diffuse", "visible_glossy", "visible_transmission", "visible_shadow", "visible_volume_scatter"):
        setattr(p, a, False)
    m = bpy.data.materials.new("DiffusionFilter")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = node(nt, "ShaderNodeOutputMaterial", (600, 0))
    tr = node(nt, "ShaderNodeBsdfTransparent", (0, 200))
    r1 = node(nt, "ShaderNodeBsdfRefraction", (0, 0))
    r1.inputs["Roughness"].default_value = rough
    r1.inputs["IOR"].default_value = 1.01
    r2 = node(nt, "ShaderNodeBsdfRefraction", (0, -200))
    r2.inputs["Roughness"].default_value = wide_rough
    r2.inputs["IOR"].default_value = 1.01
    m1 = node(nt, "ShaderNodeMixShader", (200, 100))
    m1.inputs[0].default_value = wide_amount / max(1e-6, amount + wide_amount)
    nt.links.new(r1.outputs[0], m1.inputs[1]); nt.links.new(r2.outputs[0], m1.inputs[2])
    m2 = node(nt, "ShaderNodeMixShader", (400, 0))
    m2.inputs[0].default_value = amount + wide_amount
    nt.links.new(tr.outputs[0], m2.inputs[1]); nt.links.new(m1.outputs[0], m2.inputs[2])
    nt.links.new(m2.outputs[0], out.inputs["Surface"])
    p.data.materials.append(m)
    return p


def world_hdri_sundisc(path, rot_z_deg, sun_dir, clamp=14.0, disc_deg=0.53, disc_radiance=2500.0,
                       disc_color=(1.0, 0.8, 0.55), strength=1.0, tint=(1, 1, 1), saturation=1.0):
    """HDRI with its (over-large, blurred) sun clamped away, plus a crisp physical-size sun disc with limb
    darkening that only camera / glossy / refraction rays see (diffuse light comes from the sun lamp)."""
    bg = C.world_hdri(path, strength=strength, rot_z_deg=rot_z_deg, tint=tint, saturation=saturation)
    nt = bpy.context.scene.world.node_tree
    src = bg.inputs["Color"].links[0].from_socket
    mn = nt.nodes.new("ShaderNodeVectorMath"); mn.operation = "MINIMUM"
    mn.inputs[1].default_value = (clamp, clamp, clamp)
    nt.links.new(src, mn.inputs[0])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    dot = nt.nodes.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"
    nt.links.new(tc.outputs["Generated"], dot.inputs[0])
    dot.inputs[1].default_value = tuple(Vector(sun_dir).normalized())
    # angular distance -> disc with soft limb (limb darkening)
    ac = math_node(nt, "ARCCOSINE", dot.outputs["Value"])
    rad = math.radians(disc_deg * 0.5)
    rr = math_node(nt, "DIVIDE", ac, rad)
    one = math_node(nt, "SUBTRACT", 1.0, rr)
    cl = math_node(nt, "MAXIMUM", one, 0.0)
    limb = math_node(nt, "POWER", cl, 0.35)
    edge = math_node(nt, "MULTIPLY", cl, 40.0, clamp=True)
    disc = math_node(nt, "MULTIPLY", limb, edge)
    lp = nt.nodes.new("ShaderNodeLightPath")
    notdiff = math_node(nt, "SUBTRACT", 1.0, lp.outputs["Is Diffuse Ray"])
    dm = math_node(nt, "MULTIPLY", disc, notdiff)
    dv = math_node(nt, "MULTIPLY", dm, disc_radiance)
    col = nt.nodes.new("ShaderNodeVectorMath"); col.operation = "SCALE"
    col.inputs[0].default_value = disc_color
    nt.links.new(dv, col.inputs["Scale"])
    add = nt.nodes.new("ShaderNodeVectorMath"); add.operation = "ADD"
    nt.links.new(mn.outputs[0], add.inputs[0]); nt.links.new(col.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], bg.inputs["Color"])
    return bg


def mat_leaf(name="Seedling_leaf"):
    """True leaf of the bean seedling: pinnate + reticulate venation (from leaf UVs / object coords), veins
    sunken on the upper face, fine epidermal cell texture, soft hair sheen, translucency in which the vein
    network reads darker when backlit."""
    m, nt, p = C.new_mat(name)
    out = nt.nodes["Material Output"]
    tc = node(nt, "ShaderNodeTexCoord", (-1600, 0))
    uvn = node(nt, "ShaderNodeUVMap", (-1600, -300))
    sep = node(nt, "ShaderNodeSeparateXYZ", (-1400, -300))
    nt.links.new(uvn.outputs[0], sep.inputs[0])
    u = sep.outputs[0]
    v = math_node(nt, "MULTIPLY_ADD", sep.outputs[1], 2.0, -1.0)
    av = math_node(nt, "ABSOLUTE", v)
    # midrib (tapering)
    tw = math_node(nt, "MULTIPLY_ADD", u, -0.022, 0.03)
    midd = math_node(nt, "DIVIDE", av, tw)
    mid = math_node(nt, "SUBTRACT", 1.0, midd, clamp=True)
    # laterals curving toward the tip, fading out near the margin
    ph = math_node(nt, "MULTIPLY_ADD", av, -1.6, u)
    ph2 = math_node(nt, "MULTIPLY", ph, 6.0)
    fr = math_node(nt, "FRACT", ph2)
    d = math_node(nt, "SUBTRACT", fr, 0.5)
    ad = math_node(nt, "ABSOLUTE", d)
    latw = math_node(nt, "MULTIPLY_ADD", av, -0.02, 0.475)
    latm = math_node(nt, "SUBTRACT", ad, latw)
    lat0 = math_node(nt, "MULTIPLY", latm, 40.0, clamp=True)
    fade = math_node(nt, "MULTIPLY_ADD", av, -1.1, 1.05, clamp=True)
    lat = math_node(nt, "MULTIPLY", lat0, fade)
    major = math_node(nt, "MAXIMUM", mid, lat)
    # reticulate network (areoles ~0.8 mm) + epidermal cells (~0.2 mm)
    vor = node(nt, "ShaderNodeTexVoronoi", (-900, -800))
    vor.feature = "DISTANCE_TO_EDGE"
    vor.inputs["Scale"].default_value = 1200.0
    vor.inputs["Randomness"].default_value = 0.85
    nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
    netd = math_node(nt, "SUBTRACT", 0.07, vor.outputs["Distance"])
    net = math_node(nt, "MULTIPLY", netd, 14.0, clamp=True)
    netw = math_node(nt, "MULTIPLY", net, 0.55)
    veins = math_node(nt, "MAXIMUM", major, netw)
    cells = node(nt, "ShaderNodeTexVoronoi", (-900, -1100))
    cells.inputs["Scale"].default_value = 5000.0
    nt.links.new(tc.outputs["Object"], cells.inputs["Vector"])
    # colour: lamina with mottling, lighter major veins
    nz = node(nt, "ShaderNodeTexNoise", (-900, 300))
    nz.inputs["Scale"].default_value = 140.0
    nz.inputs["Detail"].default_value = 6.0
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    ramp = node(nt, "ShaderNodeValToRGB", (-650, 300))
    ramp.color_ramp.elements[0].color = (0.050, 0.16, 0.022, 1)
    ramp.color_ramp.elements[1].color = (0.095, 0.24, 0.035, 1)
    nt.links.new(nz.outputs["Fac"], ramp.inputs[0])
    vc = nt.nodes.new("ShaderNodeMix"); vc.data_type = "RGBA"; vc.location = (-350, 300)
    nt.links.new(major, vc.inputs[0])
    nt.links.new(ramp.outputs[0], vc.inputs[6]); vc.inputs[7].default_value = (0.19, 0.34, 0.08, 1)
    base = vc.outputs[2]
    nt.links.new(base, p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.42
    p.inputs["Specular IOR Level"].default_value = 0.45
    p.inputs["Sheen Weight"].default_value = 0.35
    p.inputs["Sheen Roughness"].default_value = 0.4
    p.inputs["Sheen Tint"].default_value = (0.8, 0.9, 0.7, 1)
    p.inputs["Subsurface Weight"].default_value = 0.15
    p.inputs["Subsurface Radius"].default_value = (0.3, 0.7, 0.1)
    p.inputs["Subsurface Scale"].default_value = 0.0004
    # bump: veins sunken, fine cells raised
    hcell = math_node(nt, "MULTIPLY", cells.outputs["Distance"], 0.15)
    hv = math_node(nt, "MULTIPLY", veins, -1.0)
    h = math_node(nt, "ADD", hv, hcell)
    bump = node(nt, "ShaderNodeBump", (0, -400))
    bump.inputs["Strength"].default_value = 0.45
    bump.inputs["Distance"].default_value = 0.00006
    nt.links.new(h, bump.inputs["Height"])
    nt.links.new(bump.outputs[0], p.inputs["Normal"])
    # translucency: veins block light
    tdark = math_node(nt, "MULTIPLY_ADD", veins, -0.6, 1.0)
    tcol = nt.nodes.new("ShaderNodeVectorMath"); tcol.operation = "MULTIPLY"; tcol.location = (0, 0)
    nt.links.new(ramp.outputs[0], tcol.inputs[0]); tcol.inputs[1].default_value = (2.6, 2.6, 1.1)
    tsc = nt.nodes.new("ShaderNodeVectorMath"); tsc.operation = "SCALE"
    nt.links.new(tcol.outputs[0], tsc.inputs[0]); nt.links.new(tdark, tsc.inputs["Scale"])
    tr = node(nt, "ShaderNodeBsdfTranslucent", (300, -150))
    nt.links.new(tsc.outputs[0], tr.inputs["Color"])
    nt.links.new(bump.outputs[0], tr.inputs["Normal"])
    ms = node(nt, "ShaderNodeMixShader", (500, 0))
    ms.inputs[0].default_value = 0.4
    nt.links.new(p.outputs[0], ms.inputs[1]); nt.links.new(tr.outputs[0], ms.inputs[2])
    nt.links.new(ms.outputs[0], out.inputs["Surface"])
    return m


# --------------------------------------------------------------------------- meadow life (sh13a)

def visible_from_any(p, cam_tests, tan_w, tan_h, margin=1.15, max_dist=1e9, min_dist=0.0):
    """True if world point p is inside (an enlarged) view frustum of any sampled camera (loc, rot3x3)."""
    for loc, M in cam_tests:
        q = M.transposed() @ (p - loc)
        z = -q.z
        if z <= min_dist or z > max_dist:
            continue
        if abs(q.x / z) < tan_w * margin + 0.3 / z and abs(q.y / z) < tan_h * margin + 0.6 / z:
            return True
    return False


def mat_simple(name, col, rough=0.5, sss=0.0, trans=0.0, sheen=0.0):
    m = C.principled(name, base=col, rough=rough, sss=sss, sss_radius=(1, 0.6, 0.3), sss_scale=0.002, sheen=sheen)
    if trans:
        _, nt, p = m, m.node_tree, m.node_tree.nodes["Principled BSDF"]
        out = nt.nodes["Material Output"]
        tr = node(nt, "ShaderNodeBsdfTranslucent")
        tr.inputs["Color"].default_value = (*[min(1, c * 1.6) for c in col], 1)
        ms = node(nt, "ShaderNodeMixShader")
        ms.inputs[0].default_value = trans
        nt.links.new(p.outputs[0], ms.inputs[1]); nt.links.new(tr.outputs[0], ms.inputs[2])
        nt.links.new(ms.outputs[0], out.inputs["Surface"])
    return m


def daisy(name, rng, height, col=None, mats=None, kind="daisy"):
    """Procedural meadow flower on a stem: 'daisy' (oxeye: white rays, yellow disc), 'poppy' (4 red
    cupped petals, dark centre), 'cornflower' (blue ragged florets). Local origin at the stem base."""
    bm = bmesh.new()
    seg = 14
    lean = rng.uniform(-0.15, 0.15)
    bend = rng.uniform(-0.1, 0.1)
    pts = [Vector((math.sin(lean) * s * height + bend * s * s * height, 0.02 * height * math.sin(s * 3), s * height))
           for s in [i / seg for i in range(seg + 1)]]
    tube(bm, pts, [0.0012 * (1 - 0.35 * i / seg) for i in range(seg + 1)], n_around=6, cap_end=False)
    for f in bm.faces:
        f.material_index = 0
    top = pts[-1]
    tdir = (pts[-1] - pts[-2]).normalized()
    face = (tdir + Vector((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), 0.3))).normalized()
    R = Vector((0, 0, 1)).rotation_difference(face).to_matrix()
    if kind == "daisy":
        rd = rng.uniform(0.016, 0.024)
        ellipsoid(bm, top + R @ Vector((0, 0, 0.002)), (rd * 0.28, rd * 0.28, rd * 0.12), R, subdiv=2, mat_index=2)
        n = rng.randint(18, 24)
        for k in range(n):
            a = 2 * math.pi * k / n + rng.uniform(-0.05, 0.05)
            L_ = rd * rng.uniform(0.85, 1.05)
            w = rd * 0.13
            droop = rng.uniform(-0.25, 0.05)
            d = Vector((math.cos(a), math.sin(a), 0))
            sd = Vector((-math.sin(a), math.cos(a), 0))
            vs = []
            for i, s in enumerate((0.22, 0.6, 1.0)):
                c = d * (L_ * s) + Vector((0, 0, droop * L_ * s * s + 0.0015))
                ww = w * (0.5 if s == 0.22 else (1.0 if s == 0.6 else 0.55))
                vs.append((bm.verts.new(top + R @ (c + sd * ww)), bm.verts.new(top + R @ (c - sd * ww))))
            for i in range(2):
                f = bm.faces.new((vs[i][0], vs[i][1], vs[i + 1][1], vs[i + 1][0]))
                f.material_index = 1; f.smooth = True
    elif kind == "poppy":
        rd = rng.uniform(0.022, 0.032)
        ellipsoid(bm, top + R @ Vector((0, 0, 0.004)), (0.004, 0.004, 0.005), R, subdiv=2, mat_index=2)
        for k in range(4):
            a = math.pi / 2 * k + rng.uniform(-0.2, 0.2)
            cupv = rng.uniform(0.5, 0.9)
            rows = []
            for i in range(6):
                s = i / 5
                ring = []
                for j in range(7):
                    u = (j / 6 - 0.5) * 1.9
                    ang = a + u * 0.75 * (0.3 + s)
                    r = rd * s
                    p = Vector((math.cos(ang) * r, math.sin(ang) * r, cupv * rd * s * s + 0.001))
                    ring.append(bm.verts.new(top + R @ p))
                rows.append(ring)
            for i in range(5):
                for j in range(6):
                    f = bm.faces.new((rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]))
                    f.material_index = 1; f.smooth = True
    else:  # cornflower
        rd = rng.uniform(0.012, 0.016)
        ellipsoid(bm, top, (0.004, 0.004, 0.006), R, subdiv=2, mat_index=0)
        for k in range(rng.randint(9, 12)):
            a = rng.uniform(0, 6.28)
            d = R @ Vector((math.cos(a), math.sin(a), rng.uniform(0.3, 0.8))).normalized()
            q = Vector((0, 0, 1)).rotation_difference(d).to_matrix()
            ellipsoid(bm, top + d * rd * 0.6, (rd * 0.22, rd * 0.22, rd * 0.5), q, subdiv=1, mat_index=1, noise_amp=0.3, rng=rng)
    # a few leaves on the stem
    for k in range(rng.randint(1, 3)):
        i = rng.randint(2, seg // 2)
        a = rng.uniform(0, 6.28)
        d = Vector((math.cos(a), math.sin(a), 0.7)).normalized()
        q = Vector((0, 0, 1)).rotation_difference(d).to_matrix()
        ellipsoid(bm, pts[i] + d * 0.015, (0.004, 0.0012, 0.018), q, subdiv=1, mat_index=0)
    return bm_to_obj(name, bm, mats, col=col)


def butterfly(name, rng, kind="fritillary"):
    """Procedural butterfly: body + 4 wings (two per side as one hinged object each side).
    Returns (root, left_wing, right_wing). Wingspan ~4.5 cm. Root faces +Y, wings hinge on local Y axis."""
    root = C.empty(name)
    root.empty_display_size = 0.02
    span = rng.uniform(0.040, 0.050) if kind != "white" else rng.uniform(0.045, 0.055)
    # body
    bm = bmesh.new()
    ellipsoid(bm, (0, 0.004, 0), (0.0018, 0.0035, 0.0018), subdiv=2)
    ellipsoid(bm, (0, -0.007, -0.0003), (0.0014, 0.0095, 0.0014), subdiv=2)
    ellipsoid(bm, (0, 0.0085, 0.0002), (0.0013, 0.0013, 0.0013), subdiv=2)
    for sgn in (1, -1):   # antennae
        pts = [Vector((sgn * 0.0006 + sgn * 0.004 * s, 0.009 + 0.011 * s, 0.001 + 0.004 * s)) for s in (0, 0.33, 0.66, 1.0)]
        tube(bm, pts, [0.00012] * 4, n_around=4, cap_end=True)
    mb = C.principled(name + "_body", base=(0.05, 0.04, 0.03), rough=0.7, sheen=0.6)
    body = bm_to_obj(name + "_body", bm, [mb])
    body.parent = root
    # wing material (UV: x = along span 0..1, y = front(1)..back(0))
    m, nt, p = C.new_mat(name + "_wing")
    out = nt.nodes["Material Output"]
    uv = node(nt, "ShaderNodeUVMap")
    vor = node(nt, "ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 7.0
    nt.links.new(uv.outputs[0], vor.inputs["Vector"])
    sep = node(nt, "ShaderNodeSeparateXYZ"); nt.links.new(uv.outputs[0], sep.inputs[0])
    if kind == "white":
        col_a, col_b = (0.85, 0.86, 0.8), (0.05, 0.05, 0.05)
        spots = math_node(nt, "LESS_THAN", vor.outputs["Distance"], 0.06)
        tipm = math_node(nt, "GREATER_THAN", sep.outputs[0], 0.86)
        tipf = math_node(nt, "MULTIPLY", tipm, sep.outputs[1])
        dark = math_node(nt, "MAXIMUM", math_node(nt, "MULTIPLY", spots, 0.7), tipf)
    else:
        col_a, col_b = (0.62, 0.24, 0.03), (0.03, 0.02, 0.015)
        spots = math_node(nt, "LESS_THAN", vor.outputs["Distance"], 0.13)
        edge = math_node(nt, "GREATER_THAN", sep.outputs[0], 0.9)
        base = math_node(nt, "LESS_THAN", sep.outputs[0], 0.12)
        dark = math_node(nt, "MAXIMUM", math_node(nt, "MAXIMUM", spots, edge), math_node(nt, "MULTIPLY", base, 0.7))
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    nt.links.new(dark, mix.inputs[0])
    mix.inputs[6].default_value = (*col_a, 1); mix.inputs[7].default_value = (*col_b, 1)
    nt.links.new(mix.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.65
    p.inputs["Sheen Weight"].default_value = 0.4
    tr = node(nt, "ShaderNodeBsdfTranslucent"); nt.links.new(mix.outputs[2], tr.inputs["Color"])
    ms = node(nt, "ShaderNodeMixShader"); ms.inputs[0].default_value = 0.35
    nt.links.new(p.outputs[0], ms.inputs[1]); nt.links.new(tr.outputs[0], ms.inputs[2])
    nt.links.new(ms.outputs[0], out.inputs["Surface"])
    wings = []
    for sgn in (1, -1):
        bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
        # forewing (front) and hindwing (back) outlines in the XY plane, hinge on Y axis at x=0
        for (y0, Lx, Ly, sweep, idx) in ((0.002, span * 0.5, span * 0.30, 0.25, 0), (-0.004, span * 0.36, span * 0.28, -0.35, 1)):
            n = 14
            ctr = bm.verts.new((0, y0, 0))
            ring = []
            for k in range(n + 1):
                a = math.pi * k / n          # 0 .. pi around the outline
                r = 1.0 - 0.08 * math.sin(3 * a)
                x = math.sin(a) * Lx * r
                y = y0 + (math.cos(a) * Ly * 0.5 + sweep * x) * (1 if idx == 0 else 1)
                ring.append(bm.verts.new((sgn * x, y, 0)))
            for k in range(n):
                f = bm.faces.new((ctr, ring[k], ring[k + 1]) if sgn > 0 else (ctr, ring[k + 1], ring[k]))
                f.smooth = True
                for loop in f.loops:
                    co = loop.vert.co
                    loop[uvl].uv = (abs(co.x) / (span * 0.5), (co.y + span * 0.3) / (span * 0.6))
        w = bm_to_obj(name + ("_wL" if sgn > 0 else "_wR"), bm, [m])
        w.parent = root
        wings.append(w)
    return root, wings[0], wings[1]


def bee(name, rng):
    root = C.empty(name)
    bm = bmesh.new()
    ellipsoid(bm, (0, 0.0035, 0), (0.0022, 0.0024, 0.0022), subdiv=2, mat_index=0)              # thorax (fuzzy)
    ellipsoid(bm, (0, -0.0035, -0.0004), (0.0026, 0.0045, 0.0024), subdiv=3, mat_index=1)       # abdomen
    ellipsoid(bm, (0, 0.0072, 0), (0.0015, 0.0012, 0.0015), subdiv=2, mat_index=2)              # head
    m_th = C.principled(name + "_th", base=(0.35, 0.22, 0.08), rough=0.9, sheen=1.0)
    m_head = C.principled(name + "_hd", base=(0.03, 0.025, 0.02), rough=0.5)
    m_ab, nt, p = C.new_mat(name + "_ab")
    tc = node(nt, "ShaderNodeTexCoord")
    sp = node(nt, "ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sp.inputs[0])
    st = math_node(nt, "MULTIPLY", sp.outputs[1], 2 * math.pi / 0.0021)
    sn = math_node(nt, "SINE", st)
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"
    nt.links.new(math_node(nt, "GREATER_THAN", sn, 0.1), mx.inputs[0])
    mx.inputs[6].default_value = (0.03, 0.025, 0.02, 1); mx.inputs[7].default_value = (0.55, 0.36, 0.05, 1)
    nt.links.new(mx.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.6
    p.inputs["Sheen Weight"].default_value = 0.8
    b = bm_to_obj(name + "_body", bm, [m_th, m_ab, m_head])
    b.parent = root
    # wings: blurred-disc look (they beat at ~230 Hz: always a translucent smear on film)
    bm = bmesh.new()
    for sgn in (1, -1):
        ellipsoid(bm, (sgn * 0.0045, 0.002, 0.0022), (0.0042, 0.0026, 0.0001), Euler((0, sgn * 0.3, 0)).to_matrix(), subdiv=2)
    mw = C.principled(name + "_wing", base=(0.9, 0.9, 0.9), rough=0.2, alpha=0.18)
    w = bm_to_obj(name + "_wings", bm, [mw])
    w.parent = root
    return root


def pappus(name, col=None):
    """Dandelion seed (pappus): achene + beak + umbrella of fine filaments. ~1.2 cm tall."""
    bm = bmesh.new()
    ellipsoid(bm, (0, 0, 0.0), (0.0005, 0.0005, 0.0018), subdiv=1, mat_index=1)
    tube(bm, [Vector((0, 0, 0.0016)), Vector((0, 0, 0.009))], [0.00008, 0.00006], n_around=3, cap_end=False)
    top = Vector((0, 0, 0.009))
    n = 48
    rng = random.Random(len(name))
    for k in range(n):
        a = 2 * math.pi * k / n + rng.uniform(-0.04, 0.04)
        el = rng.uniform(0.25, 0.55)
        d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
        L_ = rng.uniform(0.0055, 0.007)
        side = Vector((-math.sin(a), math.cos(a), 0)) * 0.000035
        v0 = bm.verts.new(top + side); v1 = bm.verts.new(top - side)
        v2 = bm.verts.new(top + d * L_ - side * 0.3 + Vector((0, 0, -0.0006))); v3 = bm.verts.new(top + d * L_ + side * 0.3 + Vector((0, 0, -0.0006)))
        bm.faces.new((v0, v1, v2, v3))
    m1 = C.principled(name + "_fil", base=(0.95, 0.93, 0.88), rough=0.4, transmission=0.3)
    m2 = C.principled(name + "_ach", base=(0.25, 0.15, 0.06), rough=0.6)
    return bm_to_obj(name, bm, [m1, m2], smooth=False, col=col)
