"""Studio S3 shared helpers: THE SEEDLING (BRIEF §4 hero), cracked dry earth, cleaned sky HDRIs,
skin, water drops, heat haze and a light photographic finish.  Used by sh04, sh11 and sh13b.

Everything is procedural + CC0 downloads and seeded, so every machine builds the identical plant.
Units: metres.  The seedling is ~6 cm tall (BRIEF §4)."""
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix, Euler, noise
import numpy as np
import common as C

S3_CACHE = os.path.join(C.ASSETS, "s3")


# --------------------------------------------------------------------------- small utils

def _smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def _node(nt, kind, loc=None, **inputs):
    n = nt.nodes.new(kind)
    for k, v in inputs.items():
        n.inputs[k].default_value = v
    return n


def _mix_rgb(nt, a, b, fac, blend="MIX"):
    m = nt.nodes.new("ShaderNodeMix"); m.data_type = "RGBA"; m.blend_type = blend
    _in(nt, m.inputs[0], fac); _in(nt, m.inputs[6], a); _in(nt, m.inputs[7], b)
    return m.outputs[2]


def _in(nt, sock, v):
    """Connect socket output or set default value."""
    if isinstance(v, bpy.types.NodeSocket):
        nt.links.new(v, sock)
    else:
        if hasattr(sock, "default_value"):
            dv = sock.default_value
            if hasattr(dv, "__len__") and not isinstance(v, (tuple, list)):
                v = [v] * len(dv)
            elif hasattr(dv, "__len__") and len(v) == 3 and len(dv) == 4:
                v = (*v, 1.0)
            sock.default_value = v


def _math(nt, op, a, b=None, clamp=False):
    m = nt.nodes.new("ShaderNodeMath"); m.operation = op; m.use_clamp = clamp
    _in(nt, m.inputs[0], a)
    if b is not None:
        _in(nt, m.inputs[1], b)
    return m.outputs[0]


def _maprange(nt, x, a, b, c=0.0, d=1.0):
    m = nt.nodes.new("ShaderNodeMapRange")
    _in(nt, m.inputs["Value"], x)
    m.inputs["From Min"].default_value = a; m.inputs["From Max"].default_value = b
    m.inputs["To Min"].default_value = c; m.inputs["To Max"].default_value = d
    return m.outputs[0]


def obj_from_bm(name, bm, mats=()):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    C.link(o)
    for m in mats:
        o.data.materials.append(m)
    return o


# --------------------------------------------------------------------------- tubes (stems, petioles)

def tube_bm(pts, radii, segs=14, seed=0, wobble=0.04, cap=True):
    """Tube along a polyline with per-point radius. UV: u around, v along (0..1)."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    pts = [Vector(p) for p in pts]
    n = len(pts)
    # parallel transport frames
    tangents = []
    for i in range(n):
        a = pts[max(0, i - 1)]; b = pts[min(n - 1, i + 1)]
        tangents.append((b - a).normalized())
    up = Vector((1, 0, 0)) if abs(tangents[0].x) < 0.9 else Vector((0, 1, 0))
    nrm = tangents[0].cross(up).normalized()
    frames = []
    for i in range(n):
        if i:
            axis = tangents[i - 1].cross(tangents[i])
            if axis.length > 1e-8:
                ang = tangents[i - 1].angle(tangents[i])
                nrm = (Matrix.Rotation(ang, 3, axis.normalized()) @ nrm)
        bin_ = tangents[i].cross(nrm).normalized()
        frames.append((nrm.copy(), bin_))
    rings = []
    length = [0.0]
    for i in range(1, n):
        length.append(length[-1] + (pts[i] - pts[i - 1]).length)
    L = length[-1] or 1.0
    for i in range(n):
        ring = []
        for k in range(segs):
            a = 2 * math.pi * k / segs
            r = radii[i] * (1 + wobble * noise.noise(Vector((i * 0.7, k * 0.9, seed))))
            nn, bb = frames[i]
            ring.append(bm.verts.new(pts[i] + (nn * math.cos(a) + bb * math.sin(a)) * r))
        rings.append(ring)
    for i in range(n - 1):
        for k in range(segs):
            k2 = (k + 1) % segs
            f = bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
            for lo, (ku, iv) in zip(f.loops, ((k, i), (k + 1, i), (k + 1, i + 1), (k, i + 1))):
                lo[uv].uv = (ku / segs, length[iv] / L)
    if cap:
        for ring, rev in ((rings[0], True), (rings[-1], False)):
            c = bm.verts.new(sum((v.co for v in ring), Vector()) / len(ring))
            for k in range(segs):
                vs = (ring[k], ring[(k + 1) % segs], c)
                f = bm.faces.new(vs[::-1] if rev else vs)
                for lo in f.loops:
                    lo[uv].uv = (0.5, 0.0 if rev else 1.0)
    for f in bm.faces:
        f.smooth = True
    bm.normal_update()
    return bm, frames, length


def catmull(pts, n_out):
    """Resample control points with a Catmull-Rom spline to n_out points."""
    P = [Vector(p) for p in pts]
    P = [P[0] + (P[0] - P[1])] + P + [P[-1] + (P[-1] - P[-2])]
    out = []
    segs = len(P) - 3
    for j in range(n_out):
        t = j / (n_out - 1) * segs
        i = min(int(t), segs - 1); u = t - i
        p0, p1, p2, p3 = P[i], P[i + 1], P[i + 2], P[i + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
                          (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u))
    return out


# --------------------------------------------------------------------------- hair curves

def hair_on_tube(name, pts, radii, frames, length, count, hlen=(0.0005, 0.0012), rad=0.000016,
                 seed=0, v_range=(0.0, 1.0), up_bias=0.55, mat=None):
    """Fine trichomes on a tube built by tube_bm (same pts/radii/frames)."""
    rnd = random.Random(seed)
    cv = bpy.data.hair_curves.new(name)
    cv.add_curves([3] * count)
    L = length[-1]
    pos = []
    n = len(pts)
    for h in range(count):
        s = rnd.uniform(*v_range) * L
        i = 0
        while i < n - 2 and length[i + 1] < s:
            i += 1
        f = (s - length[i]) / max(1e-9, length[i + 1] - length[i])
        p = Vector(pts[i]).lerp(Vector(pts[i + 1]), f)
        r = radii[i] + (radii[i + 1] - radii[i]) * f
        nn, bb = frames[i]
        a = rnd.uniform(0, 2 * math.pi)
        out = (nn * math.cos(a) + bb * math.sin(a)).normalized()
        tang = (Vector(pts[i + 1]) - Vector(pts[i])).normalized()
        d = (out + tang * rnd.uniform(up_bias * 0.5, up_bias * 1.5)).normalized()
        hl = rnd.uniform(*hlen)
        root = p + out * r * 0.97
        mid = root + d * hl * 0.5 + tang * hl * 0.08
        tip = root + (d + tang * 0.35).normalized() * hl
        pos += [root, mid, tip]
    flat = [c for v in pos for c in v]
    cv.points.foreach_set("position", flat) if hasattr(cv.points, "foreach_set") else None
    try:
        cv.attributes["position"].data.foreach_set("vector", flat)
    except Exception:
        pass
    ra = cv.attributes.get("radius") or cv.attributes.new("radius", "FLOAT", "POINT")
    rads = []
    for h in range(count):
        rads += [rad, rad * 0.7, rad * 0.25]
    ra.data.foreach_set("value", rads)
    o = bpy.data.objects.new(name, cv)
    C.link(o)
    if mat:
        cv.materials.append(mat)
    return o


# --------------------------------------------------------------------------- leaf venation texture

def _seg_draw(img, pts, w0, w1, val=1.0):
    """Antialiased variable-width polyline into a float image (domain [0,1]^2, img[y,x])."""
    H, Wd = img.shape
    n = len(pts)
    for i in range(n - 1):
        a = np.array(pts[i], float); b = np.array(pts[i + 1], float)
        wa = w0 + (w1 - w0) * i / (n - 1); wb = w0 + (w1 - w0) * (i + 1) / (n - 1)
        pad = max(wa, wb) * 1.6 + 2.0 / Wd
        x0 = int(max(0, (min(a[0], b[0]) - pad) * Wd)); x1 = int(min(Wd, (max(a[0], b[0]) + pad) * Wd + 1))
        y0 = int(max(0, (min(a[1], b[1]) - pad) * H)); y1 = int(min(H, (max(a[1], b[1]) + pad) * H + 1))
        if x1 <= x0 or y1 <= y0:
            continue
        ys, xs = np.mgrid[y0:y1, x0:x1]
        P = np.stack([(xs + 0.5) / Wd, (ys + 0.5) / H], -1)
        ab = b - a
        t = np.clip(((P - a) @ ab) / max(1e-12, ab @ ab), 0, 1)
        d = np.linalg.norm(P - (a + t[..., None] * ab), axis=-1)
        w = wa + (wb - wa) * t
        v = val * _smoothstep(w, w * 0.35, d)          # rounded vein profile
        img[y0:y1, x0:x1] = np.maximum(img[y0:y1, x0:x1], v)


LEAF_X0, LEAF_X1, LEAF_HW = -0.22, 1.02, 0.62     # leaf texture domain in units of leaf length


def leaf_uv(x, y):
    return ((x - LEAF_X0) / (LEAF_X1 - LEAF_X0), (y + LEAF_HW) / (2 * LEAF_HW))


def leaf_halfwidth(t):
    """Cordate-ovate bean leaf half width (units of length) for t in [0,1]."""
    if t < 0.22:
        return 0.36 + 0.07 * math.sin(t / 0.22 * math.pi / 2)
    u = (t - 0.22) / 0.78
    return 0.43 * math.cos(u * math.pi / 2) ** 1.55


def vein_image(res=1024, seed=3):
    path = os.path.join(S3_CACHE, f"bean_veins_{res}_{seed}.png")
    if os.path.exists(path):
        im = bpy.data.images.load(path, check_existing=True)
        im.colorspace_settings.name = "Non-Color"
        return im
    os.makedirs(S3_CACHE, exist_ok=True)
    rnd = random.Random(seed)
    img = np.zeros((res, res), np.float32)
    s = 1.0 / (LEAF_X1 - LEAF_X0)            # length units -> texture units

    def P(pts):
        return [leaf_uv(x, y) for x, y in pts]

    # midrib (slightly sinuous)
    mid = [(t, 0.006 * math.sin(t * 5.0)) for t in np.linspace(0.0, 0.985, 30)]
    _seg_draw(img, P(mid), 0.012 * s, 0.0018 * s, 1.0)
    for side in (-1, 1):
        # strong basal (palmate) laterals curving up along the blade
        bl = catmull([(0.0, 0.0), (0.06, 0.10 * side), (0.17, 0.22 * side), (0.33, 0.29 * side),
                      (0.52, 0.27 * side), (0.70, 0.17 * side), (0.82, 0.09 * side)], 30)
        _seg_draw(img, P([(p.x, p.y) for p in bl]), 0.0085 * s, 0.0016 * s, 0.9)
        # veins into the basal lobes
        lb = catmull([(0.03, 0.05 * side), (-0.02, 0.15 * side), (-0.07, 0.24 * side), (-0.09, 0.30 * side)], 14)
        _seg_draw(img, P([(p.x, p.y) for p in lb]), 0.005 * s, 0.0013 * s, 0.75)
        # lobe -> margin branches of the basal lateral
        for k, tt in enumerate((0.25, 0.45, 0.62)):
            p0 = bl[int(tt * 29)]
            w = leaf_halfwidth(max(0.0, p0.x))
            br = catmull([(p0.x, p0.y), (p0.x - 0.02, p0.y + 0.06 * side), (p0.x + 0.02, side * (w - 0.025))], 10)
            _seg_draw(img, P([(p.x, p.y) for p in br]), 0.0035 * s, 0.0011 * s, 0.6)
        # pinnate secondaries from the midrib, arching to the tip (brochidodromous)
        for x0 in (0.22, 0.36, 0.50, 0.63, 0.75, 0.85):
            x0 += rnd.uniform(-0.02, 0.02)
            w = leaf_halfwidth(min(0.99, x0 + 0.12))
            sec = catmull([(x0, 0.0), (x0 + 0.05, 0.07 * side * w / 0.43),
                           (x0 + 0.13, 0.75 * w * side), (x0 + 0.24, 0.82 * leaf_halfwidth(min(0.99, x0 + 0.24)) * side)], 16)
            _seg_draw(img, P([(p.x, p.y) for p in sec]), 0.0050 * s, 0.0011 * s, 0.7)
    # tertiary / quaternary reticulum: voronoi-ish edges from random points
    pts = np.array([[rnd.random(), rnd.random()] for _ in range(1400)], np.float32)
    ys, xs = np.mgrid[0:res, 0:res]
    Pp = np.stack([(xs + 0.5) / res, (ys + 0.5) / res], -1).reshape(-1, 2)
    d1 = np.full(len(Pp), 9.0, np.float32); d2 = np.full(len(Pp), 9.0, np.float32)
    for chunk in np.array_split(pts, 20):
        d = np.sqrt(((Pp[:, None, :] - chunk[None, :, :]) ** 2).sum(-1))
        for j in range(d.shape[1]):
            dj = d[:, j]
            m = dj < d1
            d2 = np.where(m, d1, np.minimum(d2, dj)); d1 = np.where(m, dj, d1)
    edge = (d2 - d1).reshape(res, res)
    ret = _smoothstep(0.0035, 0.0008, edge) * 0.38
    img = np.maximum(img, ret)
    im = bpy.data.images.new("bean_veins", res, res, alpha=False, float_buffer=False)
    rgba = np.ones((res, res, 4), np.float32)
    rgba[..., 0] = rgba[..., 1] = rgba[..., 2] = img
    im.pixels.foreach_set(rgba.ravel())
    im.filepath_raw = path; im.file_format = "PNG"; im.save()
    im.colorspace_settings.name = "Non-Color"
    return im


# --------------------------------------------------------------------------- seedling materials

def mat_leaf(name="S3_leaf", veins=None, wilt=0.0, wet=0.0, tone=(0.16, 0.36, 0.045)):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "UVMap"
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = veins; tex.interpolation = "Cubic"
    nt.links.new(uvn.outputs[0], tex.inputs[0])
    vein = tex.outputs["Color"]
    # fine cell texture & mottling
    geo = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 900.0
    nz.inputs["Detail"].default_value = 6
    nt.links.new(geo.outputs["Object"], nz.inputs["Vector"])
    nz2 = nt.nodes.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 140.0
    nt.links.new(geo.outputs["Object"], nz2.inputs["Vector"])
    cells = nt.nodes.new("ShaderNodeTexVoronoi"); cells.feature = "DISTANCE_TO_EDGE"
    cells.inputs["Scale"].default_value = 5200.0
    nt.links.new(geo.outputs["Object"], cells.inputs["Vector"])
    tone = tuple(c * (1 - 0.25 * wilt) + d * 0.25 * wilt for c, d in zip(tone, (0.30, 0.33, 0.10)))
    base = _mix_rgb(nt, tone, (tone[0] * 1.9, tone[1] * 1.45, tone[2] * 1.3), _math(nt, "MULTIPLY", vein, 0.85))
    base = _mix_rgb(nt, base, (tone[0] * 1.25, tone[1] * 1.12, tone[2] * 0.9), _maprange(nt, nz2.outputs[0], 0.35, 0.75, 0, 0.35))
    p = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(base, p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.42 - 0.3 * wet
    p.inputs["Specular IOR Level"].default_value = 0.55
    p.inputs["Coat Weight"].default_value = 0.08 + 0.7 * wet
    p.inputs["Coat Roughness"].default_value = 0.3 - 0.25 * wet
    p.inputs["Sheen Weight"].default_value = 0.04
    p.inputs["Sheen Roughness"].default_value = 0.4
    p.inputs["Sheen Tint"].default_value = (0.8, 0.9, 0.75, 1)
    # bump: veins sunken on top, bullate puckering in between, cell texture
    b1 = nt.nodes.new("ShaderNodeBump"); b1.inputs["Strength"].default_value = 0.35
    b1.inputs["Distance"].default_value = 0.00012
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", vein, -1.0), _math(nt, "MULTIPLY", nz.outputs[0], 0.25))
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", cells.outputs["Distance"], 0.6))
    nt.links.new(h, b1.inputs["Height"])
    nt.links.new(b1.outputs[0], p.inputs["Normal"])
    # translucency: light through the lamina, veins glow lighter (less chlorophyll)
    tr = nt.nodes.new("ShaderNodeBsdfTranslucent")
    tcol = _mix_rgb(nt, (0.30, 0.55, 0.035), (0.62, 0.78, 0.16), _math(nt, "MULTIPLY", vein, 0.9))
    tcol = _mix_rgb(nt, tcol, (0.18, 0.40, 0.02), _maprange(nt, nz2.outputs[0], 0.3, 0.7, 0, 0.5))
    nt.links.new(tcol, tr.inputs["Color"])
    nt.links.new(b1.outputs[0], tr.inputs["Normal"])
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = 0.42
    nt.links.new(p.outputs[0], mix.inputs[1]); nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m


def mat_stem(name="S3_stem", wet=0.0, base_tint=(0.33, 0.17, 0.13), green=(0.27, 0.40, 0.12)):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "UVMap"
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(uvn.outputs[0], sep.inputs[0])
    geo = nt.nodes.new("ShaderNodeTexCoord")
    streak = nt.nodes.new("ShaderNodeTexNoise"); streak.inputs["Scale"].default_value = 60.0
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1.0, 1.0, 0.08)
    nt.links.new(geo.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs[0], streak.inputs["Vector"])
    # gradient: pinkish-bronze near soil, pale green up the stem
    g = _maprange(nt, _math(nt, "ADD", sep.outputs[1], _math(nt, "MULTIPLY", streak.outputs[0], 0.25)), 0.05, 0.55, 0.0, 1.0)
    col = _mix_rgb(nt, base_tint, green, g)
    col = _mix_rgb(nt, col, (green[0] * 1.35, green[1] * 1.2, green[2] * 0.9), _maprange(nt, streak.outputs[0], 0.4, 0.7, 0, 0.7))
    nt.links.new(col, p.inputs["Base Color"])
    p.inputs["Subsurface Weight"].default_value = 0.6
    p.inputs["Subsurface Radius"].default_value = (0.7, 1.0, 0.35)
    p.inputs["Subsurface Scale"].default_value = 0.0012
    p.inputs["Roughness"].default_value = 0.38 - 0.25 * wet
    p.inputs["Coat Weight"].default_value = 0.12 + 0.7 * wet
    p.inputs["Coat Roughness"].default_value = 0.25
    p.inputs["Sheen Weight"].default_value = 0.2
    b = nt.nodes.new("ShaderNodeBump"); b.inputs["Strength"].default_value = 0.25
    b.inputs["Distance"].default_value = 0.00005
    nt.links.new(streak.outputs[0], b.inputs["Height"]); nt.links.new(b.outputs[0], p.inputs["Normal"])
    return m


def mat_cotyledon(name="S3_cotyledon"):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    geo = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 420.0; nz.inputs["Detail"].default_value = 5
    nz.inputs["Distortion"].default_value = 2.0
    nt.links.new(geo.outputs["Object"], nz.inputs["Vector"])
    nz2 = nt.nodes.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 55.0
    nt.links.new(geo.outputs["Object"], nz2.inputs["Vector"])
    col = _mix_rgb(nt, (0.20, 0.30, 0.07), (0.42, 0.44, 0.12), _maprange(nt, nz2.outputs[0], 0.35, 0.7))
    col = _mix_rgb(nt, col, (0.38, 0.25, 0.10), _maprange(nt, nz2.outputs[0], 0.6, 0.78, 0, 0.6))
    col = _mix_rgb(nt, col, (0.12, 0.09, 0.05), _maprange(nt, nz.outputs[0], 0.62, 0.75, 0, 0.5))
    nt.links.new(col, p.inputs["Base Color"])
    p.inputs["Subsurface Weight"].default_value = 0.8
    p.inputs["Subsurface Radius"].default_value = (0.9, 1.0, 0.4)
    p.inputs["Subsurface Scale"].default_value = 0.002
    p.inputs["Roughness"].default_value = 0.5
    p.inputs["Coat Weight"].default_value = 0.06
    p.inputs["Coat Roughness"].default_value = 0.3
    b = nt.nodes.new("ShaderNodeBump"); b.inputs["Strength"].default_value = 0.9
    b.inputs["Distance"].default_value = 0.00025
    nt.links.new(nz.outputs[0], b.inputs["Height"]); nt.links.new(b.outputs[0], p.inputs["Normal"])
    return m


def mat_hair(name="S3_hair"):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (0.75, 0.80, 0.68, 1)
    p.inputs["Roughness"].default_value = 0.35
    p.inputs["Transmission Weight"].default_value = 0.55
    p.inputs["IOR"].default_value = 1.4
    return m


# --------------------------------------------------------------------------- leaf geometry

def leaf_bm(L=0.03, seed=0, fold=0.10, droop=0.10, wave=0.012, curl=0.0, nx=44, ny=16):
    """Cordate bean leaf in local space: base (petiole join) at origin, blade along +X, up +Z."""
    rnd = random.Random(seed)
    asym = rnd.uniform(-0.04, 0.04)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    rows = []
    xs = np.concatenate([np.linspace(-0.17, 0.0, 9)[:-1], np.linspace(0.0, 1.0, nx)])
    for side in (-1, 1):
        grid = []
        for x in xs:
            if x < 0:
                # basal lobe: circle centre (0, 0.19), radius 0.19
                r, yc = 0.185, 0.18
                hh = math.sqrt(max(0.0, r * r - x * x))
                y_in, y_out = max(0.0, yc - hh) + (0.004 if x < 0 else 0), yc + hh
                if x <= -0.168:
                    y_in = y_out = yc
            else:
                y_in, y_out = 0.0, leaf_halfwidth(x) * (1 + asym * side)
            row = []
            for j in range(ny):
                v = j / (ny - 1)
                y = y_in + (y_out - y_in) * v
                yy = y * side
                # 3D shaping (in units of L)
                z = fold * abs(yy)                                   # V-fold about the midrib
                z -= droop * max(0.0, x) ** 2                         # tip droop
                z += wave * math.sin(x * 23 + side * 1.3) * (abs(yy) / 0.43) ** 2
                z -= curl * (abs(yy) / 0.43) ** 3                     # margins curling down (wilt)
                z += 0.012 * noise.noise(Vector((x * 6, yy * 6, seed)))
                co = Vector((x * L, yy * L, z * L))
                row.append((bm.verts.new(co), leaf_uv(x, yy)))
            grid.append(row)
        for i in range(len(xs) - 1):
            for j in range(ny - 1):
                q = (grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j])
                if side < 0:
                    q = q[::-1]
                try:
                    f = bm.faces.new([a[0] for a in q])
                except ValueError:
                    continue
                for lo, a in zip(f.loops, q):
                    lo[uvl].uv = a[1]
                f.smooth = True
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=L * 0.0004)
    # drop degenerate faces at the lobe tips
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=L * 0.0002)
    bm.normal_update()
    return bm


def cotyledon_bm(size=0.013, seed=0, shrivel=0.0):
    """Thick fleshy bean cotyledon (half a bean): flat inner face, domed outer face."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=28, v_segments=18, radius=1.0)
    for v in bm.verts:
        x, y, z = v.co
        # kidney/bean outline in XY, domed in -Z (outer), flattened +Z (inner face)
        z = z * (0.30 if z < 0 else 0.10)
        xx = x * 1.0
        yy = y * 0.62 * (1 - 0.15 * math.exp(-((x + 0.1) ** 2) * 6) * (1 if y > 0 else 0))   # hilum notch
        n = noise.noise(Vector((x * 3 + seed, y * 3, z * 3)))
        sh = 1 + 0.04 * n - shrivel * 0.06 * abs(noise.noise(Vector((x * 9, y * 9, seed))))
        v.co = Vector((xx * sh, yy * sh, z * sh)) * size * 0.5
    for f in bm.faces:
        f.smooth = True
    bm.normal_update()
    return bm


# --------------------------------------------------------------------------- the seedling

def seedling(name="SEEDLING", loc=(0, 0, 0), rot_z=0.0, wilt=0.0, wet=0.0, seed=7, height=0.06,
             hairs=True, crumbs=True, collar=True, soil_mat=None):
    """Build THE SEEDLING (BRIEF §4).  Returns dict with:
       root (empty: whole-plant transform), leaf_pivots [2], cot_pivots [2], leaves [2],
       tips [world-space empties at leaf tips], top (empty at apex), objects (all)."""
    rnd = random.Random(seed)
    veins = vein_image()
    m_leaf = mat_leaf(name + "_leaf", veins, wilt=wilt, wet=wet)
    m_stem = mat_stem(name + "_stem", wet=wet)
    m_cot = mat_cotyledon(name + "_cot")
    m_hair = mat_hair(name + "_hair")
    root = C.empty(name, loc)
    root.rotation_euler = (0, 0, rot_z)
    objs = []
    k = height / 0.06

    def parent(o, p):
        o.parent = p
        o.matrix_parent_inverse = Matrix.Identity(4)
        return o

    # hypocotyl: slight S-curve; slight lean when wilting
    hy_h = 0.036 * k
    lean = 0.003 + 0.004 * wilt
    hy_ctrl = [(0, 0, -0.004), (0.0006, 0.0, 0.008 * k), (-0.0008, 0.0004, 0.02 * k),
               (lean * 0.5, -0.0006, 0.03 * k), (lean, -0.0002, hy_h)]
    hy_pts = catmull(hy_ctrl, 26)
    hy_r = [0.00125 * k * (1.12 - 0.22 * (i / 25)) for i in range(26)]
    bm, fr, ln = tube_bm(hy_pts, hy_r, segs=16, seed=seed)
    hyp = parent(obj_from_bm(name + "_hypocotyl", bm, [m_stem]), root); objs.append(hyp)
    if hairs:
        objs.append(parent(hair_on_tube(name + "_hair_hy", hy_pts, hy_r, fr, ln, 900, seed=seed + 1,
                                        v_range=(0.1, 1.0), mat=m_hair), root))
    top = Vector(hy_pts[-1])
    # cotyledons: opposite, drooping outward/down from the node
    cot_pivots = []
    for i, side in enumerate((-1, 1)):
        az = math.radians((0 if side > 0 else 180) + rnd.uniform(-12, 12))
        pv = C.empty(f"{name}_cotpivot{i}", top + Vector((0, 0, -0.0016 * k)))
        parent(pv, root)
        pv.rotation_euler = (math.radians(rnd.uniform(-8, 8)), math.radians(16 + 14 * wilt + rnd.uniform(-6, 6)), az)
        cot = parent(obj_from_bm(f"{name}_cotyledon{i}", cotyledon_bm(0.0135 * k, seed + i, shrivel=0.3 + 0.5 * wilt), [m_cot]), pv)
        cot.location = (0.0062 * k, 0, 0.0)
        cot.rotation_euler = (math.radians(rnd.uniform(-10, 10)), 0, 0)
        cot_pivots.append(pv); objs.append(cot)
    # epicotyl
    ep_h = 0.017 * k
    ep_ctrl = [top + Vector((0, 0, -0.001)), top + Vector((0.0004, 0.0003, ep_h * 0.4)),
               top + Vector((-0.0002, 0.0004, ep_h * 0.8)), top + Vector((0.0001, 0.0002, ep_h))]
    ep_pts = catmull(ep_ctrl, 14)
    ep_r = [0.00085 * k * (1 - 0.18 * i / 13) for i in range(14)]
    bm, fr, ln = tube_bm(ep_pts, ep_r, segs=12, seed=seed + 3)
    epi = parent(obj_from_bm(name + "_epicotyl", bm, [m_stem]), root); objs.append(epi)
    if hairs:
        objs.append(parent(hair_on_tube(name + "_hair_ep", ep_pts, ep_r, fr, ln, 450, seed=seed + 4,
                                        hlen=(0.0003, 0.0007), mat=m_hair), root))
    apex = Vector(ep_pts[-1])
    topE = parent(C.empty(name + "_apex", apex), root)
    # terminal bud (next trifoliate leaf folded)
    bmb = bmesh.new(); bmesh.ops.create_uvsphere(bmb, u_segments=12, v_segments=8, radius=0.0011 * k)
    for v in bmb.verts:
        v.co.z *= 2.0; v.co.z += 0.0012 * k
    for f in bmb.faces:
        f.smooth = True
    bud = parent(obj_from_bm(name + "_bud", bmb, [m_leaf]), root); bud.location = apex; objs.append(bud)
    # two opposite heart-shaped primary leaves on short petioles
    leaf_pivots, leaves, tips = [], [], []
    for i, side in enumerate((1, -1)):
        az = math.radians(90 * side + rnd.uniform(-10, 10) + 0)
        dirv = Vector((math.cos(az), math.sin(az), 0))
        pv = parent(C.empty(f"{name}_leafpivot{i}", apex + Vector((0, 0, 0.0006))), root)
        rest_el = math.radians(28 - 30 * wilt + rnd.uniform(-5, 5))
        pv.rotation_euler = (0, -rest_el, az)          # local +X = petiole direction
        # petiole (local coords: along +X, rising)
        pet_len = 0.0085 * k
        pp = catmull([(0, 0, 0), (pet_len * 0.5, 0, 0.0012 * k), (pet_len, 0, 0.0008 * k)], 10)
        pr = [0.00055 * k * (1.15 - 0.2 * j / 9) for j in range(10)]
        pr[-1] *= 1.35; pr[-2] *= 1.2                    # pulvinus swelling
        bm, fr, ln = tube_bm(pp, pr, segs=10, seed=seed + 10 + i)
        pet = parent(obj_from_bm(f"{name}_petiole{i}", bm, [m_stem]), pv); objs.append(pet)
        if hairs:
            objs.append(parent(hair_on_tube(f"{name}_hair_pet{i}", pp, pr, fr, ln, 220, seed=seed + 20 + i,
                                            hlen=(0.0002, 0.0005), mat=m_hair), pv))
        # blade pivot at petiole tip: blade tilts down from the pulvinus
        bp = parent(C.empty(f"{name}_bladepivot{i}", Vector(pp[-1])), pv)
        bp.rotation_euler = (math.radians(rnd.uniform(-6, 6)), math.radians(10 + 25 * wilt), 0)
        L = 0.031 * k * rnd.uniform(0.95, 1.05)
        leaf = parent(obj_from_bm(f"{name}_leaf{i}", leaf_bm(L, seed + 30 + i, fold=0.10 + 0.06 * wilt,
                                                              droop=0.12 + 0.25 * wilt, curl=0.04 + 0.12 * wilt), [m_leaf]), bp)
        C.subsurf(leaf, 0, 1)
        tip = parent(C.empty(f"{name}_tip{i}", Vector((0, 0, 0))), leaf)
        # tip position: evaluate leaf mesh vertex with max x
        vmax = max(leaf.data.vertices, key=lambda v: v.co.x)
        tip.location = vmax.co
        leaf_pivots.append(pv); leaves.append(leaf); tips.append(tip)
    # soil crumbs stuck to the stem + heaved soil collar
    if crumbs or collar:
        sm = soil_mat or mat_soil_crumb()
        rc = random.Random(seed + 99)
        lumps = []
        if crumbs:
            for (z, r) in ((0.004, 0.0009), (0.0095, 0.0006), (0.017, 0.00045)):
                a = rc.uniform(0, 6.28)
                i = min(25, int(z / hy_h * 25))
                p = Vector(hy_pts[i]) + Vector((math.cos(a), math.sin(a), 0)) * (hy_r[i] + r * 0.45)
                lumps.append((p, r * k))
        if collar:
            for j in range(16):
                a = j / 16 * 6.28 + rc.uniform(-0.2, 0.2)
                d = rc.uniform(0.002, 0.006)
                r = rc.uniform(0.0007, 0.0024)
                lumps.append((Vector((math.cos(a) * d, math.sin(a) * d, -0.0004)), r))
        for j, (p, r) in enumerate(lumps):
            b = bmesh.new(); bmesh.ops.create_icosphere(b, subdivisions=2, radius=r)
            for v in b.verts:
                v.co *= 1 + 0.45 * noise.noise(v.co * (2.0 / r) + Vector((j, 0, 0)))
                v.co.z *= 0.55
            o = parent(obj_from_bm(f"{name}_crumb{j}", b, [sm]), root)
            o.location = p
            o.rotation_euler = (rc.random() * 3, rc.random() * 3, rc.random() * 3)
            objs.append(o)
    return {"root": root, "leaf_pivots": leaf_pivots, "cot_pivots": cot_pivots, "leaves": leaves,
            "tips": tips, "apex": topE, "objects": objs, "mats": {"leaf": m_leaf, "stem": m_stem}}


def mat_soil_crumb(name="S3_crumb"):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    geo = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 2500; nz.inputs["Detail"].default_value = 8
    nt.links.new(geo.outputs["Object"], nz.inputs["Vector"])
    col = _mix_rgb(nt, (0.36, 0.25, 0.16), (0.62, 0.47, 0.33), nz.outputs[0])
    nt.links.new(col, p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.95
    b = nt.nodes.new("ShaderNodeBump"); b.inputs["Distance"].default_value = 0.0002
    nt.links.new(nz.outputs[0], b.inputs["Height"]); nt.links.new(b.outputs[0], p.inputs["Normal"])
    return m


def bounce(pivot, t_hit, amp_deg, freq=5.5, decay=3.2, axis=1, dur=1.4, rest=None):
    """Damped oscillation keyed on a pivot's rotation axis (a drop hitting a leaf)."""
    base = pivot.rotation_euler[axis] if rest is None else rest
    fps = C.FPS
    f0 = int(math.floor(t_hit * fps)) - 1
    C.key(pivot, "rotation_euler", None, None, index=axis, frame=f0)
    for j in range(0, int(dur * fps) + 1):
        tt = j / fps
        val = base + math.radians(amp_deg) * math.exp(-decay * tt) * math.sin(2 * math.pi * freq * tt + 0.0) \
            if j else base
        pivot.rotation_euler[axis] = val
        pivot.keyframe_insert("rotation_euler", index=axis, frame=t_hit * fps + j)
    pivot.rotation_euler[axis] = base


# --------------------------------------------------------------------------- ground

def mat_cracked_earth(name="S3_earth", tile=1.0, disp=0.012, res="4k", tint=(1.0, 0.95, 0.9),
                      wet_input=False):
    tex = C.ph_texture("mud_cracked_dry_03", res)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    outn = nt.nodes["Material Output"]
    geo = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / tile, 1 / tile, 1 / tile)
    nt.links.new(geo.outputs["Object"], mp.inputs["Vector"])

    def img(k, noncolor):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(tex[k], check_existing=True)
        if noncolor:
            n.image.colorspace_settings.name = "Non-Color"
        n.interpolation = "Linear"
        nt.links.new(mp.outputs[0], n.inputs[0])
        return n.outputs["Color"]
    diff = img("diff", False); rough = img("rough", True); dsp = img("disp", True)
    nor = img("nor", True); ao = img("ao", True)
    # large-scale tonal variation so tiling never reads
    big = nt.nodes.new("ShaderNodeTexNoise"); big.inputs["Scale"].default_value = 0.6; big.inputs["Detail"].default_value = 2
    nt.links.new(geo.outputs["Object"], big.inputs["Vector"])
    fine = nt.nodes.new("ShaderNodeTexNoise"); fine.inputs["Scale"].default_value = 900; fine.inputs["Detail"].default_value = 1.5
    nt.links.new(geo.outputs["Object"], fine.inputs["Vector"])
    col = _mix_rgb(nt, diff, tint, 1.0, "MULTIPLY")
    col = _mix_rgb(nt, col, (0.80, 0.70, 0.60), _maprange(nt, big.outputs[0], 0.3, 0.7, 0, 0.45), "MULTIPLY")
    col = _mix_rgb(nt, col, ao, 0.6, "MULTIPLY")
    wet = None
    if wet_input:
        # value node 'WET' (0..1) animated by the shot; per-pixel wetness mask from a texture node
        wet = nt.nodes.new("ShaderNodeValue"); wet.name = "WET"; wet.outputs[0].default_value = 0.0
    p.inputs["Roughness"].default_value = 0.9
    nt.links.new(col, p.inputs["Base Color"])
    rr = _math(nt, "MULTIPLY", rough, 1.05)
    nt.links.new(rr, p.inputs["Roughness"])
    nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(nor, nm.inputs["Color"])
    b = nt.nodes.new("ShaderNodeBump"); b.inputs["Strength"].default_value = 0.3; b.inputs["Distance"].default_value = 0.0002
    nt.links.new(fine.outputs[0], b.inputs["Height"]); nt.links.new(nm.outputs[0], b.inputs["Normal"])
    nt.links.new(b.outputs[0], p.inputs["Normal"])
    dn = nt.nodes.new("ShaderNodeDisplacement")
    dn.inputs["Scale"].default_value = disp; dn.inputs["Midlevel"].default_value = 0.55
    nt.links.new(dsp, dn.inputs["Height"])
    nt.links.new(dn.outputs[0], outn.inputs["Displacement"])
    m.displacement_method = os.environ.get("S3_DISPM", "BOTH")
    return m, {"col": col, "p": p, "diff": diff, "rough": rr, "disp": dsp, "nt": nt, "wet": wet}


def ground(name="S3_ground", size=6.0, mat=None, dicing=2.0, max_sub=8):
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=64, y_subdivisions=64, size=size)
    g = bpy.context.object
    g.name = name
    m = g.modifiers.new("Subsurf", "SUBSURF")
    m.subdivision_type = "SIMPLE"
    m.levels = 0
    m.render_levels = max_sub
    m.use_adaptive_subdivision = True
    m.adaptive_space = "PIXEL"
    m.adaptive_pixel_size = dicing
    cy = bpy.context.scene.cycles
    cy.max_subdivisions = max_sub
    cy.offscreen_dicing_scale = 25.0
    g.cycles.use_motion_blur = False          # static ground: no extra motion-step tessellation
    if mat:
        g.data.materials.append(mat)
    return g


# --------------------------------------------------------------------------- sky: clean HDRI (one cloud)

def _load_exr(path):
    im = bpy.data.images.load(path, check_existing=True)
    w, h = im.size
    a = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(a)
    return im, a.reshape(h, w, 4)


def _box_blur(a, r, axis):
    c = np.cumsum(np.pad(a, [(r + 1, r) if i == axis else (0, 0) for i in range(a.ndim)], mode="edge"), axis=axis)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return (hi - lo) / (2 * r + 1)


def _blur(a, r):
    for _ in range(3):
        a = _box_blur(_box_blur(a, r, 0), r, 1)
    return a


def hdri_sun(path):
    """Direction (elev, azim in Blender world, degrees) + irradiance of the sun in an equirect HDRI."""
    im, a = _load_exr(path)
    h, w = a.shape[:2]
    lum = a[..., :3].mean(-1)
    y, x = np.unravel_index(lum.argmax(), lum.shape)
    el = (y + 0.5) / h * 180 - 90
    u = (x + 0.5) / w
    return el, u, im, a


def clean_sky(name="dry_cracked_lake", res="4k", keep_cloud=None, move_cloud=None, sky_el_min=13.0, tag="clean"):
    """Remove all clouds from an HDRI's sky (keeps horizon/ground), optionally keeping one cloud
    (keep_cloud = (u0,u1,el0,el1)) and moving it by du (move_cloud = du in [0,1]).
    Also removes the sun disc (re-added as a lamp + camera-only disc).  Cached as EXR."""
    out = os.path.join(S3_CACHE, f"{name}_{res}_{tag}.exr")
    src = C.ph_hdri(name, res)
    el_s, u_s, im, a = hdri_sun(src)
    info = {"sun_el": el_s, "sun_u": u_s, "src": src, "path": out, "cam": out.replace(".exr", "_sun.exr")}
    h, w = a.shape[:2]
    # sun irradiance (pixels much brighter than surroundings within 2 deg)
    ys = (np.arange(h) + 0.5) / h * 180 - 90
    us = (np.arange(w) + 0.5) / w
    EL = np.radians(ys)[:, None]; AZ = (us[None, :] * 2 * np.pi)
    dvec = np.stack([np.cos(EL) * np.cos(AZ), np.cos(EL) * np.sin(AZ), np.sin(EL) * np.ones_like(AZ)], -1)
    sel, saz = math.radians(el_s), u_s * 2 * math.pi
    sdir = np.array([math.cos(sel) * math.cos(saz), math.cos(sel) * math.sin(saz), math.sin(sel)])
    cosg = dvec @ sdir
    gamma = np.degrees(np.arccos(np.clip(cosg, -1, 1)))
    lum = a[..., :3].mean(-1)
    domega = (2 * np.pi / w) * (np.pi / h) * np.cos(EL)
    core = gamma < 1.6
    ring = (gamma > 2.0) & (gamma < 3.0)
    ring_val = a[ring][:, :3].mean(0)
    sun_rgb = ((a[..., :3] - ring_val) * core[..., None] * domega[..., None]).sum((0, 1))
    info["sun_irr_rgb"] = [float(c) for c in sun_rgb]
    if os.path.exists(out):
        return info
    os.makedirs(S3_CACHE, exist_ok=True)
    b = a.copy()
    # remove sun disc: replace core by ring level blend
    blend = _smoothstep(2.0, 1.2, gamma)[..., None]
    b[..., :3] = b[..., :3] * (1 - blend) + ring_val * blend
    # clear-sky model per (elev, gamma) bins: lower-quartile of sky pixels
    sky = ys[:, None] * np.ones((1, w)) > sky_el_min
    el_bins = np.clip(((ys[:, None] * np.ones((1, w))) / 3).astype(int), 0, 45)
    g_bins = np.clip((gamma / 4).astype(int), 0, 60)
    model = np.zeros_like(b[..., :3])
    key = el_bins * 61 + g_bins
    lumb = b[..., :3].mean(-1)
    for kk in np.unique(key[sky]):
        msk = sky & (key == kk)
        vals = b[msk][:, :3]
        lv = vals.mean(-1)
        med = np.median(lv)
        ok = lv > 0.75 * med                     # ignore tree tops / dark objects
        q = np.percentile(lv[ok], 30)
        sel_ = vals[ok & (lv <= q)]
        model[msk] = np.median(sel_, 0)
    # smooth the model
    msk_f = sky.astype(np.float32)
    mod_s = _blur(model * msk_f[..., None], 48) / np.maximum(_blur(msk_f, 48), 1e-4)[..., None]
    # cloud mask: brighter or whiter than the model
    ratio = lumb / np.maximum(mod_s.mean(-1), 1e-6)
    blue = b[..., 2] / np.maximum(b[..., 0], 1e-6)
    mblue = mod_s[..., 2] / np.maximum(mod_s[..., 0], 1e-6)
    cloud = np.clip(np.minimum((ratio - 1.02) / 0.08, 0.3 + (mblue - blue) / 0.06), 0, 1) * sky * (ratio > 0.85)
    cloud = np.clip(_blur(cloud.astype(np.float32), 3) * 1.6, 0, 1)
    if keep_cloud:
        u0, u1, e0, e1 = keep_cloud
        km = (us[None, :] >= u0) & (us[None, :] <= u1) & (ys[:, None] >= e0) & (ys[:, None] <= e1)
        keep = cloud * km
        patch = b[..., :3] - mod_s
        cloud = cloud * (1 - km)
    # horizon feather: fade the replacement in over sky_el_min..+4 deg
    fe = _smoothstep(sky_el_min, sky_el_min + 4, ys)[:, None]
    cloud = cloud * fe
    b[..., :3] = b[..., :3] * (1 - cloud[..., None]) + mod_s * cloud[..., None]
    if keep_cloud and move_cloud:
        du, dv = move_cloud if isinstance(move_cloud, (tuple, list)) else (move_cloud, 0.0)
        sh = int(round(du * w)); sv = int(round(dv / 180.0 * h))
        km2 = np.roll(np.roll(keep, sh, axis=1), sv, axis=0)
        pt2 = np.roll(np.roll(patch, sh, axis=1), sv, axis=0)
        # transplant: the moved cloud = local clear sky + the cloud's excess radiance (x1.15: it
        # now sits nearer the sun, so it is lit a little brighter)
        b[..., :3] = b[..., :3] * (1 - km2[..., None]) + (mod_s + pt2 * 1.15) * km2[..., None]
    elif keep_cloud:
        b[..., :3] = b[..., :3] * (1 - keep[..., None]) + (mod_s + patch) * keep[..., None]
    sun_core = _smoothstep(1.4, 0.9, gamma)[..., None]
    c2 = b.copy()
    c2[..., :3] = b[..., :3] * (1 - sun_core) + a[..., :3] * sun_core
    nim2 = bpy.data.images.new(name + "_sun", w, h, alpha=True, float_buffer=True)
    nim2.pixels.foreach_set(c2.astype(np.float32).ravel())
    nim2.filepath_raw = out.replace(".exr", "_sun.exr"); nim2.file_format = "OPEN_EXR"; nim2.save()
    nim = bpy.data.images.new(name + "_clean", w, h, alpha=True, float_buffer=True)
    nim.pixels.foreach_set(b.astype(np.float32).ravel())
    nim.filepath_raw = out
    nim.file_format = "OPEN_EXR"
    nim.save()
    return info


def world_from_hdri(path, rot_z_deg=0.0, strength=1.0, cam_path=None, cam_strength=None, tint=(1, 1, 1)):
    """World with an HDRI; optionally a different image for camera rays (e.g. with the sun disc)."""
    w = bpy.context.scene.world
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Rotation"].default_value[2] = math.radians(rot_z_deg)
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    env = nt.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(path, check_existing=True)
    nt.links.new(mp.outputs[0], env.inputs[0])
    bg = nt.nodes.new("ShaderNodeBackground"); bg.inputs[1].default_value = strength
    col = _mix_rgb(nt, env.outputs[0], tint, 1.0, "MULTIPLY")
    nt.links.new(col, bg.inputs[0])
    final = bg.outputs[0]
    if cam_path:
        env2 = nt.nodes.new("ShaderNodeTexEnvironment"); env2.image = bpy.data.images.load(cam_path, check_existing=True)
        nt.links.new(mp.outputs[0], env2.inputs[0])
        bg2 = nt.nodes.new("ShaderNodeBackground"); bg2.inputs[1].default_value = cam_strength or strength
        col2 = _mix_rgb(nt, env2.outputs[0], tint, 1.0, "MULTIPLY")
        nt.links.new(col2, bg2.inputs[0])
        lp = nt.nodes.new("ShaderNodeLightPath")
        mx = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(lp.outputs["Is Camera Ray"], mx.inputs[0])
        nt.links.new(bg.outputs[0], mx.inputs[1]); nt.links.new(bg2.outputs[0], mx.inputs[2])
        final = mx.outputs[0]
    nt.links.new(final, out.inputs[0])
    return nt


def sun_dir_world(el_deg, u, rot_z_deg=0.0):
    """World direction (unit Vector) of an equirect pixel column u / elevation (degrees), given the
    world mapping Z rotation.  Blender: u = -atan2(d.y, d.x) / (2 pi) + 0.5."""
    az = (u - 0.5) * 2 * math.pi
    el = math.radians(el_deg)
    d = Vector((math.cos(az) * math.cos(el), -math.sin(az) * math.cos(el), math.sin(el)))
    d.rotate(Euler((0, 0, math.radians(rot_z_deg))))
    return d.normalized()


def sun_from_dir(d, strength, kelvin_k=5600, angle_deg=0.53, name="Sun", color=None):
    s = C.sun(elev_deg=45, azim_deg=0, strength=strength, kelvin_k=kelvin_k, angle_deg=angle_deg, name=name)
    s.rotation_euler = (-Vector(d)).to_track_quat("-Z", "Y").to_euler()
    if color:
        s.data.color = color
    return s


# --------------------------------------------------------------------------- water drops

def mat_water_drop(name="S3_water"):
    m = C.mat_water(name)
    return m


def drop_bm(r=0.001, flat=0.75, seed=0):
    b = bmesh.new()
    bmesh.ops.create_uvsphere(b, u_segments=20, v_segments=12, radius=r)
    for v in b.verts:
        if v.co.z < 0:
            v.co.z *= 0.35
        else:
            v.co.z *= flat
        v.co.z += r * 0.3
    for f in b.faces:
        f.smooth = True
    return b


# --------------------------------------------------------------------------- photographic finish

def finish(glare=True, grain=0.018, vignette=0.22, ca=0.004):
    """Compositor: soft bloom around highlights, mild lens vignette, tiny chromatic aberration, grain."""
    sc = bpy.context.scene
    tree = bpy.data.node_groups.new("S3_finish", "CompositorNodeTree")
    sc.compositing_node_group = tree
    nt = tree
    rl = nt.nodes.new("CompositorNodeRLayers")
    out = nt.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    go = nt.nodes.new("NodeGroupOutput")
    cur = rl.outputs["Image"]
    if glare:
        g = nt.nodes.new("CompositorNodeGlare")
        try:
            g.glare_type = "FOG_GLOW"
        except Exception:
            pass
        for k, v in (("Threshold", 1.2), ("Strength", 0.25), ("Size", 0.6), ("Quality", "Medium")):
            if k in g.inputs:
                try:
                    g.inputs[k].default_value = v
                except Exception:
                    pass
        nt.links.new(cur, g.inputs["Image"]); cur = g.outputs["Image"]
    if ca:
        ld = nt.nodes.new("CompositorNodeLensdist")
        for k, v in (("Distortion", 0.0), ("Dispersion", ca)):
            if k in ld.inputs:
                ld.inputs[k].default_value = v
        nt.links.new(cur, ld.inputs["Image"]); cur = ld.outputs["Image"]
    if vignette:
        em = nt.nodes.new("CompositorNodeEllipseMask")
        for k, v in (("Size", (1.25, 1.05)),):
            if k in em.inputs:
                try:
                    em.inputs[k].default_value = v
                except Exception:
                    pass
        bl = nt.nodes.new("CompositorNodeBlur")
        try:
            bl.inputs["Size"].default_value = (400, 400)
        except Exception:
            pass
        nt.links.new(em.outputs[0], bl.inputs["Image"])
        mx = nt.nodes.new("ShaderNodeMix") if False else None
        mul = nt.nodes.new("CompositorNodeMixRGB") if hasattr(bpy.types, "CompositorNodeMixRGB") else nt.nodes.new("ShaderNodeMix")
        if mul.bl_idname == "ShaderNodeMix":
            mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"
            mul.inputs[0].default_value = vignette
            ml = nt.nodes.new("ShaderNodeMapRange")
            nt.links.new(bl.outputs[0], ml.inputs["Value"])
            ml.inputs["To Min"].default_value = 0.0
            nt.links.new(cur, mul.inputs[6]); nt.links.new(ml.outputs[0], mul.inputs[7])
            cur = mul.outputs[2]
    nt.links.new(cur, go.inputs[0])
    return tree


def heat_haze(loc, size=(3.0, 0.4), rot=(math.radians(90), 0, 0), strength=0.6, scale=40.0, speed=1.0,
              t0=0.0, t1=10.0, name="S3_haze"):
    """A thin refractive sheet (IOR ~1.0) with animated noise normals: shimmers what is behind it."""
    bpy.ops.mesh.primitive_plane_add(size=1)
    o = bpy.context.object; o.name = name
    o.scale = (size[0], size[1], 1); o.location = loc; o.rotation_euler = rot
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    gl = nt.nodes.new("ShaderNodeBsdfRefraction"); gl.inputs["IOR"].default_value = 1.0
    gl.inputs["Roughness"].default_value = 0.0
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.noise_dimensions = "4D"
    nz.inputs["Scale"].default_value = scale; nz.inputs["Detail"].default_value = 2
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1, 3.5, 1)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs[0], nz.inputs["Vector"])
    # animate 'W' and an upward drift
    wsock = nz.inputs["W"]
    wsock.default_value = 0.0
    wsock.keyframe_insert("default_value", frame=t0 * C.FPS)
    wsock.default_value = (t1 - t0) * speed * 2.2
    wsock.keyframe_insert("default_value", frame=t1 * C.FPS)
    for fc in C._fcurves(m.node_tree.animation_data.action):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = strength
    bump.inputs["Distance"].default_value = 0.02
    nt.links.new(nz.outputs[0], bump.inputs["Height"]); nt.links.new(bump.outputs[0], gl.inputs["Normal"])
    # IOR 1.0 does not bend: use a tiny IOR offset instead
    gl.inputs["IOR"].default_value = 1.012
    nt.links.new(gl.outputs[0], out.inputs["Surface"])
    o.data.materials.append(m)
    o.visible_shadow = False
    o.visible_diffuse = False
    o.visible_glossy = False
    return o


# --------------------------------------------------------------------------- procedural particles (GN)
#  A point cloud whose vertices carry p0 (position), 'vel' (initial velocity), 't0' (birth time),
#  'size'.  Geometry nodes move every point analytically with scene time: deterministic for any
#  frame range, constant topology (so Cycles' deformation motion blur turns rain into streaks).

def _gn_group(name, drag, gravity, ground_z, life, inst=None):
    ng = bpy.data.node_groups.new(name, "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Instance", in_out="INPUT", socket_type="NodeSocketObject")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N = ng.nodes; Lk = ng.links
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    st = N.new("GeometryNodeInputSceneTime")

    def attr(name_, dt="FLOAT"):
        a = N.new("GeometryNodeInputNamedAttribute"); a.data_type = dt
        a.inputs["Name"].default_value = name_
        return a.outputs["Attribute"]

    def m(op, a, b=None):
        n = N.new("ShaderNodeMath"); n.operation = op
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, bpy.types.NodeSocket):
                Lk.new(v, n.inputs[i])
            else:
                n.inputs[i].default_value = v
        return n.outputs[0]

    def vm(op, a, b=None, scale=None):
        n = N.new("ShaderNodeVectorMath"); n.operation = op
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, bpy.types.NodeSocket):
                Lk.new(v, n.inputs[i])
            else:
                n.inputs[i].default_value = v
        if scale is not None:
            if isinstance(scale, bpy.types.NodeSocket):
                Lk.new(scale, n.inputs["Scale"])
            else:
                n.inputs["Scale"].default_value = scale
        return n.outputs["Vector"] if op != "LENGTH" else n.outputs["Value"]

    dt_raw = m("SUBTRACT", st.outputs["Seconds"], attr("t0"))
    alive = m("GREATER_THAN", dt_raw, 0.0)
    dt = m("MAXIMUM", dt_raw, 0.0)
    # drag: displacement = v * (1 - e^{-k dt}) / k  (k=0 -> v*dt)
    if drag > 0:
        f = m("DIVIDE", m("SUBTRACT", 1.0, m("EXPONENT", m("MULTIPLY", dt, -drag))), drag)
    else:
        f = dt
    disp = vm("SCALE", attr("vel", "FLOAT_VECTOR"), scale=f)
    g = m("MULTIPLY", m("MULTIPLY", dt, dt), -0.5 * gravity)
    comb = N.new("ShaderNodeCombineXYZ"); Lk.new(g, comb.inputs["Z"])
    off = vm("ADD", disp, comb.outputs[0])
    sp = N.new("GeometryNodeSetPosition")
    Lk.new(gi.outputs[0], sp.inputs["Geometry"]); Lk.new(off, sp.inputs["Offset"])
    # visibility: alive, above the ground, within life
    pos = N.new("GeometryNodeInputPosition")
    sep = N.new("ShaderNodeSeparateXYZ"); Lk.new(pos.outputs[0], sep.inputs[0])
    above = m("GREATER_THAN", sep.outputs["Z"], attr("zg") if ground_z is None else ground_z)
    young = m("LESS_THAN", dt, attr("life") if life is None else life)
    vis = m("MULTIPLY", m("MULTIPLY", alive, above), young)
    sc = m("MULTIPLY", vis, attr("size"))
    iop = N.new("GeometryNodeInstanceOnPoints")
    Lk.new(sp.outputs[0], iop.inputs["Points"])
    oi = N.new("GeometryNodeObjectInfo"); oi.transform_space = "ORIGINAL"
    oi.inputs["Object"].default_value = inst
    Lk.new(oi.outputs["Geometry"], iop.inputs["Instance"])
    Lk.new(sc, iop.inputs["Scale"])
    rot = attr("rot", "FLOAT_VECTOR")
    Lk.new(rot, iop.inputs["Rotation"])
    rl = N.new("GeometryNodeRealizeInstances")
    Lk.new(iop.outputs[0], rl.inputs[0])
    Lk.new(rl.outputs[0], go.inputs[0])
    return ng


def particles(name, p0, vel, t0, size, instance_obj, mat=None, drag=0.0, gravity=9.81, ground_z=-1.0,
              life=10.0, rot=None, zg=None, lifes=None):
    """Create a GN particle object.  p0/vel: lists of Vector, t0/size: lists of float.
    ground_z/life None -> per-point attributes 'zg'/'life' (lists zg / lifes)."""
    n = len(p0)
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in p0], [], [])
    def add(nm, typ, vals, comp):
        a = me.attributes.new(nm, typ, "POINT")
        a.data.foreach_set(comp, [c for v in vals for c in (v if hasattr(v, "__len__") else (v,))])
    add("vel", "FLOAT_VECTOR", [tuple(v) for v in vel], "vector")
    add("t0", "FLOAT", t0, "value")
    add("size", "FLOAT", size, "value")
    add("rot", "FLOAT_VECTOR", rot or [(0, 0, 0)] * n, "vector")
    if ground_z is None:
        add("zg", "FLOAT", zg, "value")
    if life is None:
        add("life", "FLOAT", lifes, "value")
    o = bpy.data.objects.new(name, me)
    C.link(o)
    ng = _gn_group(name + "_gn", drag, gravity, ground_z, life, inst=instance_obj)
    md = o.modifiers.new("GN", "NODES"); md.node_group = ng
    if mat:
        o.data.materials.append(mat)
    instance_obj.hide_render = True
    instance_obj.hide_viewport = True
    return o


def template_drop(name="S3_droptpl", r=1.0, stretch=1.0, mat=None):
    """Unit water drop (radius 1 m; scale per point). stretch>1 elongates vertically."""
    b = bmesh.new()
    bmesh.ops.create_uvsphere(b, u_segments=10, v_segments=7, radius=r)
    for v in b.verts:
        v.co.z *= stretch
    for f in b.faces:
        f.smooth = True
    o = obj_from_bm(name, b, [mat] if mat else [])
    return o


def template_grain(name="S3_graintpl", mat=None):
    b = bmesh.new(); bmesh.ops.create_icosphere(b, subdivisions=1, radius=1.0)
    for v in b.verts:
        v.co *= 1 + 0.35 * noise.noise(v.co * 2.3)
    return obj_from_bm(name, b, [mat] if mat else [])


# --------------------------------------------------------------------------- crack analysis

class Heightfield:
    """CPU copy of the cracked-earth displacement map, matching mat_cracked_earth's mapping
    (object coords / tile, repeat) and its Displacement node (height - midlevel) * scale."""

    def __init__(self, tile=1.0, disp=0.012, mid=0.55, res="2k"):
        tex = C.ph_texture("mud_cracked_dry_03", res)
        im = bpy.data.images.load(tex["disp"], check_existing=True)
        im.colorspace_settings.name = "Non-Color"
        w, h = im.size
        a = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(a)
        self.a = a.reshape(h, w, 4)[..., 0].copy()
        self.w, self.h, self.tile, self.disp, self.mid = w, h, tile, disp, mid

    def px(self, x, y):
        return ((x / self.tile) % 1.0) * self.w, ((y / self.tile) % 1.0) * self.h

    def raw(self, x, y):
        u, v = self.px(x, y)
        i0, j0 = int(u) % self.w, int(v) % self.h
        i1, j1 = (i0 + 1) % self.w, (j0 + 1) % self.h
        fu, fv = u - int(u), v - int(v)
        a = self.a
        return (a[j0, i0] * (1 - fu) * (1 - fv) + a[j0, i1] * fu * (1 - fv) +
                a[j1, i0] * (1 - fu) * fv + a[j1, i1] * fu * fv)

    def z(self, x, y):
        return (self.raw(x, y) - self.mid) * self.disp

    def crack_path(self, p_from, p_to, margin=0.03, power=6.0):
        """Lowest-cost path (following crack valleys) between two XY points. Returns list of Vector."""
        import heapq
        step = self.tile / self.w
        x0 = min(p_from[0], p_to[0]) - margin; x1 = max(p_from[0], p_to[0]) + margin
        y0 = min(p_from[1], p_to[1]) - margin; y1 = max(p_from[1], p_to[1]) + margin
        nx = int((x1 - x0) / step) + 1; ny = int((y1 - y0) / step) + 1
        H = np.array([[self.raw(x0 + i * step, y0 + j * step) for i in range(nx)] for j in range(ny)], np.float32)
        Hn = (H - H.min()) / max(1e-6, H.max() - H.min())
        cost = 0.02 + Hn ** power
        si = (int((p_from[0] - x0) / step), int((p_from[1] - y0) / step))
        ti = (int((p_to[0] - x0) / step), int((p_to[1] - y0) / step))
        dist = np.full((ny, nx), np.inf, np.float32); prev = {}
        dist[si[1], si[0]] = 0
        pq = [(0.0, si)]
        nbr = [(1, 0, 1), (-1, 0, 1), (0, 1, 1), (0, -1, 1), (1, 1, 1.414), (1, -1, 1.414), (-1, 1, 1.414), (-1, -1, 1.414)]
        while pq:
            d, (i, j) = heapq.heappop(pq)
            if (i, j) == ti:
                break
            if d > dist[j, i]:
                continue
            for di, dj, w_ in nbr:
                a_, b_ = i + di, j + dj
                if 0 <= a_ < nx and 0 <= b_ < ny:
                    nd = d + w_ * 0.5 * (cost[j, i] + cost[b_, a_])
                    if nd < dist[b_, a_]:
                        dist[b_, a_] = nd; prev[(a_, b_)] = (i, j); heapq.heappush(pq, (nd, (a_, b_)))
        path = [ti]
        while path[-1] != si:
            path.append(prev[path[-1]])
        path.reverse()
        pts = [Vector((x0 + i * step, y0 + j * step, 0)) for i, j in path]
        # smooth & resample
        for _ in range(6):
            pts = [pts[0]] + [(pts[k - 1] + pts[k] * 2 + pts[k + 1]) / 4 for k in range(1, len(pts) - 1)] + [pts[-1]]
        out = [pts[0]]
        for p in pts[1:]:
            if (p - out[-1]).length > 0.0012:
                out.append(p)
        for p in out:
            p.z = self.z(p.x, p.y)
        return out

    def lowest_near(self, x, y, r=0.012):
        best = None
        n = 25
        for i in range(n):
            for j in range(n):
                xx = x + (i / (n - 1) - 0.5) * 2 * r; yy = y + (j / (n - 1) - 0.5) * 2 * r
                if (xx - x) ** 2 + (yy - y) ** 2 > r * r:
                    continue
                v = self.raw(xx, yy)
                if best is None or v < best[0]:
                    best = (v, xx, yy)
        return Vector((best[1], best[2], self.z(best[1], best[2])))


def rivulet(name, pts, hf, width=0.0024, depth=0.0009, mat=None):
    """Water strip lying in the crack along pts (from far end u=0 to near end u=1)."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    n = len(pts)
    L = [0.0]
    for i in range(1, n):
        L.append(L[-1] + (pts[i] - pts[i - 1]).length)
    rows = []
    prof = [-1.0, -0.6, -0.25, 0.0, 0.25, 0.6, 1.0]
    for i, p in enumerate(pts):
        t = (pts[min(n - 1, i + 1)] - pts[max(0, i - 1)]); t.z = 0; t.normalize()
        sd = Vector((-t.y, t.x, 0))
        w = width * (0.75 + 0.5 * noise.noise(Vector((L[i] * 80, 0.3, 0.7))) + 0.2)
        # water level: a little above the crack floor, never above the rims
        zl = min(hf.z(p.x, p.y) + depth, max(hf.z(*(p + sd * w * 1.2).xy), hf.z(*(p - sd * w * 1.2).xy)) - 0.0002)
        row = []
        for k, s in enumerate(prof):
            q = p + sd * s * w
            z = zl + 0.00045 * (1 - s * s)       # meniscus bulge
            row.append((bm.verts.new((q.x, q.y, z)), (L[i] / L[-1], (s + 1) / 2)))
        rows.append(row)
    for i in range(n - 1):
        for k in range(len(prof) - 1):
            q = (rows[i][k], rows[i + 1][k], rows[i + 1][k + 1], rows[i][k + 1])
            f = bm.faces.new([a[0] for a in q])
            for lo, a in zip(f.loops, q):
                lo[uvl].uv = a[1]
            f.smooth = True
    o = obj_from_bm(name, bm, [mat] if mat else [])
    return o, L[-1]


def wet_earth(info, spots, t_rain0, t_rain1, t_soak0, t_soak1, t0, t1, rand_scale=38.0):
    """Add rain wetness to a mat_cracked_earth material: hero spots [(x, y, t, rmax)], random drop
    spots appearing between t_rain0..t_rain1, then a global soak (darker, glossy, water in cracks)."""
    nt = info["nt"]; p = info["p"]
    N = nt.nodes
    T = N.new("ShaderNodeValue"); T.name = "T"
    T.outputs[0].default_value = t0; T.outputs[0].keyframe_insert("default_value", frame=t0 * C.FPS)
    T.outputs[0].default_value = t1; T.outputs[0].keyframe_insert("default_value", frame=t1 * C.FPS)
    soak = N.new("ShaderNodeValue"); soak.name = "SOAK"
    for tt, v in ((t_soak0, 0.0), (t_soak1, 1.0)):
        soak.outputs[0].default_value = v; soak.outputs[0].keyframe_insert("default_value", frame=tt * C.FPS)
    ad = nt.animation_data
    for fc in C._fcurves(ad.action):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR" if "T\"" in fc.data_path or fc.data_path.endswith('["T"].outputs[0].default_value') else "BEZIER"
    for fc in C._fcurves(ad.action):
        if '"T"' in fc.data_path:
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"
    geo = N.new("ShaderNodeTexCoord")
    sepp = N.new("ShaderNodeSeparateXYZ"); nt.links.new(geo.outputs["Object"], sepp.inputs[0])
    edge_n = N.new("ShaderNodeTexNoise"); edge_n.inputs["Scale"].default_value = 700; edge_n.inputs["Detail"].default_value = 3
    nt.links.new(geo.outputs["Object"], edge_n.inputs["Vector"])
    jitter = _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", edge_n.outputs[0], 0.5), 0.0016)
    wet = None
    for (x, y, ts, rmax) in spots:
        dx = _math(nt, "SUBTRACT", sepp.outputs["X"], x); dy = _math(nt, "SUBTRACT", sepp.outputs["Y"], y)
        d = _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "MULTIPLY", dx, dx), _math(nt, "MULTIPLY", dy, dy)))
        d = _math(nt, "ADD", d, _math(nt, "MULTIPLY", jitter, rmax / 0.004))
        grow = _maprange(nt, T.outputs[0], ts, ts + 0.12, 0.0, rmax)
        grow = _math(nt, "ADD", grow, _maprange(nt, T.outputs[0], ts + 0.12, ts + 2.5, 0.0, rmax * 0.35))
        msk = _math(nt, "SUBTRACT", 1.0, _maprange(nt, _math(nt, "SUBTRACT", d, grow), -0.0004, 0.0002, 0, 1))
        msk = _math(nt, "MULTIPLY", msk, _math(nt, "GREATER_THAN", T.outputs[0], ts))
        wet = msk if wet is None else _math(nt, "MAXIMUM", wet, msk)
    # random rain spots
    vor = N.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = rand_scale
    vor.inputs["Randomness"].default_value = 1.0
    nt.links.new(geo.outputs["Object"], vor.inputs["Vector"])
    sc = N.new("ShaderNodeSeparateColor"); nt.links.new(vor.outputs["Color"], sc.inputs[0])
    r = sc.outputs[0]
    ta = _math(nt, "ADD", _math(nt, "MULTIPLY", _math(nt, "POWER", r, 0.6), t_rain1 - t_rain0), t_rain0)
    age = _math(nt, "SUBTRACT", T.outputs[0], ta)
    rad = _math(nt, "MULTIPLY", _maprange(nt, age, 0.0, 0.15, 0.0, 1.0), _math(nt, "ADD", _math(nt, "MULTIPLY", sc.outputs[1], 0.012), 0.004))
    rad = _math(nt, "DIVIDE", rad, 1.0 / rand_scale)      # voronoi distance is in cell units
    dd = _math(nt, "ADD", vor.outputs["Distance"], _math(nt, "MULTIPLY", jitter, rand_scale * 0.6))
    rmask = _math(nt, "SUBTRACT", 1.0, _maprange(nt, _math(nt, "SUBTRACT", dd, rad), -0.012, 0.008, 0, 1))
    rmask = _math(nt, "MULTIPLY", rmask, _math(nt, "GREATER_THAN", age, 0.0))
    wet = rmask if wet is None else _math(nt, "MAXIMUM", wet, rmask)
    # global soak (cracks fill first)
    dsp = info["disp"]
    crack = _maprange(nt, dsp, 0.50, 0.25, 0, 1)
    sk = soak.outputs[0]
    wet = _math(nt, "MAXIMUM", wet, _math(nt, "MULTIPLY", sk, 0.85))
    puddle = _math(nt, "MULTIPLY", _maprange(nt, sk, 0.3, 1.0, 0, 1), crack)
    wet = _math(nt, "MINIMUM", wet, 1.0)
    # apply: darker & slightly more saturated, glossy
    col = info["col"]
    dark = _mix_rgb(nt, col, (0.30, 0.24, 0.20), 1.0, "MULTIPLY")
    newcol = _mix_rgb(nt, col, dark, wet)
    newcol = _mix_rgb(nt, newcol, (0.10, 0.075, 0.06), _math(nt, "MULTIPLY", puddle, 0.6))
    nt.links.new(newcol, p.inputs["Base Color"])
    rough = _mix_rgb(nt, info["rough"], (0.22, 0.22, 0.22), wet)
    rough = _mix_rgb(nt, rough, (0.03, 0.03, 0.03), puddle)
    bw = N.new("ShaderNodeRGBToBW"); nt.links.new(rough, bw.inputs[0])
    nt.links.new(bw.outputs[0], p.inputs["Roughness"])
    p.inputs["Specular IOR Level"].default_value = 0.5
    return {"T": T, "soak": soak}


def experiment(ov):
    """Dev hook: S3_OV='{"final_spp":16}' merges render overrides; S3_HIDE='name1,name2' hides
    objects whose names start with those prefixes (render-time profiling only)."""
    import json
    ov.update(json.loads(os.environ.get("S3_OV", "{}")))
    for pre in [x for x in os.environ.get("S3_HIDE", "").split(",") if x]:
        for o in bpy.data.objects:
            if o.name.startswith(pre):
                o.hide_render = True
    return ov


def render_tuning(denoise_quality=None, prefilter=None):
    """common.configure_render() runs after build(); apply denoiser tuning just before rendering."""
    import sys as _sys
    if "--final" not in _sys.argv:
        return

    def _pre(scene, *_):
        c = scene.cycles
        if denoise_quality:
            c.denoising_quality = denoise_quality
        if prefilter:
            c.denoising_prefilter = prefilter
        if os.environ.get("S3_NODENOISE"):
            c.use_denoising = False
    bpy.app.handlers.render_init.append(_pre)
