"""Studio S2 helpers: procedural sunflower (Helianthus annuus) + field, oil-lamp/velvet helpers.

All geometry is built from code, seeded, in metres. Sunflower head local frame: origin at the disc
centre (receptacle surface), +Z = face normal. Plant local frame: origin on the ground, stem along +Z,
head pivot (top of stem) at (0, 0, stem_h); at yaw=0/pitch=0 the face looks along +Y.
"""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix, Euler
import common as C

GOLDEN = math.radians(137.50776405)


# --------------------------------------------------------------------------- small utils

def _mesh(name, verts, faces, mats=None, cols=None, uvs=None, smooth=True, link=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    if mats is not None:
        me.polygons.foreach_set("material_index", mats)
    if cols is not None:
        a = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        flat = []
        for c in cols:
            flat.extend((c[0], c[1], c[2], 1.0))
        a.data.foreach_set("color", flat)
    if uvs is not None:
        uvl = me.uv_layers.new(name="UVMap")
        loop_uv = []
        for p in me.polygons:
            for li in p.loop_indices:
                loop_uv.extend(uvs[me.loops[li].vertex_index])
        uvl.data.foreach_set("uv", loop_uv)
    me.update()
    if smooth:
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    ob = bpy.data.objects.new(name, me)
    if link:
        bpy.context.scene.collection.objects.link(ob)
    return ob


def _node(nt, t, loc=(0, 0), **kw):
    n = nt.nodes.new(t)
    n.location = loc
    for k, v in kw.items():
        setattr(n, k, v)
    return n


def _lnk(nt, a, b):
    nt.links.new(a, b)


def attr_node(nt, name="Col", loc=(-800, 0)):
    a = _node(nt, "ShaderNodeAttribute", loc)
    a.attribute_name = name
    return a


def frame_from_normal(p, n):
    n = Vector(n).normalized()
    t = Vector((0, 0, 1)).cross(n)
    if t.length < 1e-6:
        t = Vector((1, 0, 0))
    t.normalize()
    b = n.cross(t)
    return Matrix(((t.x, b.x, n.x, p[0]), (t.y, b.y, n.y, p[1]), (t.z, b.z, n.z, p[2]), (0, 0, 0, 1)))


# --------------------------------------------------------------------------- materials

def mat_floret():
    """Disc florets / paleae: base colour from the per-vertex 'Col' attribute, waxy, slightly translucent."""
    m, nt, p = C.new_mat("SF_floret")
    a = attr_node(nt)
    # fine tissue mottling
    nz = _node(nt, "ShaderNodeTexNoise", (-800, -300)); nz.inputs["Scale"].default_value = 2500; nz.inputs["Detail"].default_value = 4
    mul = _node(nt, "ShaderNodeMix", (-500, 0)); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"
    mul.inputs[0].default_value = 0.35
    _lnk(nt, a.outputs["Color"], mul.inputs[6]); _lnk(nt, nz.outputs["Color"], mul.inputs[7])
    _lnk(nt, mul.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.42
    p.inputs["Subsurface Weight"].default_value = float(__import__("os").environ.get("S2_FSSS", 0.0))
    p.inputs["Subsurface Radius"].default_value = (1.0, 0.6, 0.2)
    p.inputs["Subsurface Scale"].default_value = 0.0008
    p.inputs["Sheen Weight"].default_value = 0.25
    p.inputs["Sheen Roughness"].default_value = 0.4
    bm = _node(nt, "ShaderNodeBump", (-300, -300)); bm.inputs["Strength"].default_value = 0.25; bm.inputs["Distance"].default_value = 0.00005
    _lnk(nt, nz.outputs["Fac"], bm.inputs["Height"]); _lnk(nt, bm.outputs["Normal"], p.inputs["Normal"])
    return m


def mat_anther():
    """Fused anther tube: dark purple-black, satin, dusted with pollen grains (noise mask)."""
    m, nt, p = C.new_mat("SF_anther")
    a = attr_node(nt)
    nz = _node(nt, "ShaderNodeTexVoronoi", (-900, -300)); nz.inputs["Scale"].default_value = 9000
    ramp = _node(nt, "ShaderNodeValToRGB", (-650, -300))
    ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[1].position = 0.32
    ramp.color_ramp.elements[0].color = (1, 1, 1, 1); ramp.color_ramp.elements[1].color = (0, 0, 0, 1)
    _lnk(nt, nz.outputs["Distance"], ramp.inputs["Fac"])
    # pollen amount: alpha channel of Col unused -> use red channel of a second attr 'Pol'
    pol = attr_node(nt, "Pol", (-900, 100))
    mm = _node(nt, "ShaderNodeMath", (-400, -100)); mm.operation = "MULTIPLY"
    _lnk(nt, ramp.outputs["Color"], mm.inputs[0]); _lnk(nt, pol.outputs["Fac"], mm.inputs[1])
    mx = _node(nt, "ShaderNodeMix", (-200, 0)); mx.data_type = "RGBA"
    _lnk(nt, mm.outputs[0], mx.inputs[0]); _lnk(nt, a.outputs["Color"], mx.inputs[6])
    mx.inputs[7].default_value = (0.95, 0.62, 0.06, 1)
    _lnk(nt, mx.outputs[2], p.inputs["Base Color"])
    rr = _node(nt, "ShaderNodeMapRange", (-200, -250)); rr.inputs[3].default_value = 0.33; rr.inputs[4].default_value = 0.85
    _lnk(nt, mm.outputs[0], rr.inputs[0]); _lnk(nt, rr.outputs[0], p.inputs["Roughness"])
    p.inputs["Coat Weight"].default_value = 0.15
    bm = _node(nt, "ShaderNodeBump", (-100, -450)); bm.inputs["Strength"].default_value = 0.6; bm.inputs["Distance"].default_value = 0.00003
    _lnk(nt, mm.outputs[0], bm.inputs["Height"]); _lnk(nt, bm.outputs["Normal"], p.inputs["Normal"])
    return m


def mat_ray(name="SF_ray", base=(1.0, 0.56, 0.015)):
    """Ray petal: saturated yellow-orange, velvety (sheen), parallel veins from UV, translucent for backlight."""
    m, nt, p = C.new_mat(name)
    out = nt.nodes["Material Output"]
    uv = _node(nt, "ShaderNodeUVMap", (-1200, 0))
    sep = _node(nt, "ShaderNodeSeparateXYZ", (-1000, 0)); _lnk(nt, uv.outputs["UV"], sep.inputs[0])
    # veins: bands across the width (UV.y), slightly wavy along length
    nzw = _node(nt, "ShaderNodeTexNoise", (-1000, -300)); nzw.inputs["Scale"].default_value = 6
    wv = _node(nt, "ShaderNodeTexWave", (-700, -100)); wv.wave_type = "BANDS"; wv.bands_direction = "Y"
    wv.inputs["Scale"].default_value = 7.5; wv.inputs["Distortion"].default_value = 1.2; wv.inputs["Detail"].default_value = 1
    wv.inputs["Detail Scale"].default_value = 1.5
    cmb = _node(nt, "ShaderNodeCombineXYZ", (-850, -100))
    _lnk(nt, sep.outputs["Y"], cmb.inputs["Y"]); _lnk(nt, sep.outputs["X"], cmb.inputs["X"])
    _lnk(nt, cmb.outputs[0], wv.inputs["Vector"])
    vr = _node(nt, "ShaderNodeValToRGB", (-500, -100))
    vr.color_ramp.elements[0].position = 0.0; vr.color_ramp.elements[1].position = 0.18
    vr.color_ramp.elements[0].color = (0, 0, 0, 1); vr.color_ramp.elements[1].color = (1, 1, 1, 1)
    _lnk(nt, wv.outputs["Fac"], vr.inputs["Fac"])
    # colour: base, darker orange veins, greener claw at base (UV.x small)
    col = _node(nt, "ShaderNodeMix", (-300, 100)); col.data_type = "RGBA"
    col.inputs[6].default_value = (base[0] * 0.78, base[1] * 0.55, base[2] * 0.5, 1)
    col.inputs[7].default_value = (*base, 1)
    _lnk(nt, vr.outputs["Color"], col.inputs[0])
    # per-object variation (hue/val)
    oi = _node(nt, "ShaderNodeNewGeometry", (-1200, 300))
    hs = _node(nt, "ShaderNodeHueSaturation", (-100, 100))
    mr = _node(nt, "ShaderNodeMapRange", (-500, 300)); mr.inputs[3].default_value = 0.488; mr.inputs[4].default_value = 0.512
    _lnk(nt, oi.outputs["Random Per Island"], mr.inputs[0]); _lnk(nt, mr.outputs[0], hs.inputs["Hue"])
    mrv = _node(nt, "ShaderNodeMapRange", (-500, 500)); mrv.inputs[3].default_value = 0.85; mrv.inputs[4].default_value = 1.08
    _lnk(nt, oi.outputs["Random Per Island"], mrv.inputs[0]); _lnk(nt, mrv.outputs[0], hs.inputs["Value"])
    _lnk(nt, col.outputs[2], hs.inputs["Color"])
    claw = _node(nt, "ShaderNodeMapRange", (-700, 300)); claw.inputs[1].default_value = 0.0; claw.inputs[2].default_value = 0.12
    _lnk(nt, sep.outputs["X"], claw.inputs[0])
    cm = _node(nt, "ShaderNodeMix", (100, 100)); cm.data_type = "RGBA"
    cm.inputs[6].default_value = (0.35, 0.28, 0.02, 1)
    _lnk(nt, claw.outputs[0], cm.inputs[0]); _lnk(nt, hs.outputs["Color"], cm.inputs[7])
    _lnk(nt, cm.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.52
    p.inputs["Sheen Weight"].default_value = 0.45
    p.inputs["Sheen Roughness"].default_value = 0.35
    p.inputs["Sheen Tint"].default_value = (1.0, 0.8, 0.4, 1)
    p.inputs["Subsurface Weight"].default_value = 0.0
    bm = _node(nt, "ShaderNodeBump", (-100, -300)); bm.inputs["Strength"].default_value = 0.35; bm.inputs["Distance"].default_value = 0.0002
    bm.invert = True
    _lnk(nt, vr.outputs["Color"], bm.inputs["Height"]); _lnk(nt, bm.outputs["Normal"], p.inputs["Normal"])
    # translucency mix (thin petal glows when backlit)
    tr = _node(nt, "ShaderNodeBsdfTranslucent", (200, -200))
    tc = _node(nt, "ShaderNodeMix", (100, -150)); tc.data_type = "RGBA"; tc.blend_type = "MULTIPLY"; tc.inputs[0].default_value = 1
    _lnk(nt, cm.outputs[2], tc.inputs[6]); tc.inputs[7].default_value = (1.0, 0.75, 0.35, 1)
    _lnk(nt, tc.outputs[2], tr.inputs["Color"]); _lnk(nt, bm.outputs["Normal"], tr.inputs["Normal"])
    ms = _node(nt, "ShaderNodeMixShader", (400, 0)); ms.inputs[0].default_value = 0.3
    _lnk(nt, p.outputs[0], ms.inputs[1]); _lnk(nt, tr.outputs[0], ms.inputs[2])
    _lnk(nt, ms.outputs[0], out.inputs["Surface"])
    return m


def mat_green(name, base=(0.05, 0.13, 0.018), rough=0.55, sheen=0.5, trans=0.25, veins=True, hair_bump=True,
              purple=0.0):
    """Leaves / bracts / stem: green with pinnate vein pattern (UV), hispid sheen, translucency."""
    m, nt, p = C.new_mat(name)
    out = nt.nodes["Material Output"]
    oi = _node(nt, "ShaderNodeNewGeometry", (-1300, 400))
    hs = _node(nt, "ShaderNodeHueSaturation", (-200, 200))
    mr = _node(nt, "ShaderNodeMapRange", (-600, 400)); mr.inputs[3].default_value = 0.485; mr.inputs[4].default_value = 0.515
    _lnk(nt, oi.outputs["Random Per Island"], mr.inputs[0]); _lnk(nt, mr.outputs[0], hs.inputs["Hue"])
    mrv = _node(nt, "ShaderNodeMapRange", (-600, 600)); mrv.inputs[3].default_value = 0.8; mrv.inputs[4].default_value = 1.15
    _lnk(nt, oi.outputs["Random Per Island"], mrv.inputs[0]); _lnk(nt, mrv.outputs[0], hs.inputs["Value"])
    nz = _node(nt, "ShaderNodeTexNoise", (-1100, -200)); nz.inputs["Scale"].default_value = 45; nz.inputs["Detail"].default_value = 6
    colr = _node(nt, "ShaderNodeValToRGB", (-850, -200))
    colr.color_ramp.elements[0].color = (base[0] * 0.7, base[1] * 0.75, base[2] * 0.6, 1)
    colr.color_ramp.elements[1].color = (base[0] * 1.35, base[1] * 1.25, base[2] * 1.1, 1)
    _lnk(nt, nz.outputs["Fac"], colr.inputs["Fac"])
    cur = colr.outputs["Color"]
    vein_h = None
    if veins:
        uv = _node(nt, "ShaderNodeUVMap", (-1500, 0))
        sep = _node(nt, "ShaderNodeSeparateXYZ", (-1300, 0)); _lnk(nt, uv.outputs["UV"], sep.inputs[0])
        # midrib: |v-0.5| small; laterals: fract(u*K - |v-.5|*1.4)
        sub = _node(nt, "ShaderNodeMath", (-1100, 100)); sub.operation = "SUBTRACT"; sub.inputs[1].default_value = 0.5
        _lnk(nt, sep.outputs["Y"], sub.inputs[0])
        ab = _node(nt, "ShaderNodeMath", (-950, 100)); ab.operation = "ABSOLUTE"; _lnk(nt, sub.outputs[0], ab.inputs[0])
        mid = _node(nt, "ShaderNodeMapRange", (-800, 250)); mid.inputs[1].default_value = 0.0; mid.inputs[2].default_value = 0.022
        mid.inputs[3].default_value = 1.0; mid.inputs[4].default_value = 0.0
        _lnk(nt, ab.outputs[0], mid.inputs[0])
        k1 = _node(nt, "ShaderNodeMath", (-950, -50)); k1.operation = "MULTIPLY"; k1.inputs[1].default_value = 9.0
        _lnk(nt, sep.outputs["X"], k1.inputs[0])
        k2 = _node(nt, "ShaderNodeMath", (-950, -120)); k2.operation = "MULTIPLY"; k2.inputs[1].default_value = 7.0
        _lnk(nt, ab.outputs[0], k2.inputs[0])
        k3 = _node(nt, "ShaderNodeMath", (-800, -80)); k3.operation = "SUBTRACT"
        _lnk(nt, k1.outputs[0], k3.inputs[0]); _lnk(nt, k2.outputs[0], k3.inputs[1])
        fr = _node(nt, "ShaderNodeMath", (-650, -80)); fr.operation = "PINGPONG"; fr.inputs[1].default_value = 0.5
        _lnk(nt, k3.outputs[0], fr.inputs[0])
        lat = _node(nt, "ShaderNodeMapRange", (-500, -80)); lat.inputs[1].default_value = 0.0; lat.inputs[2].default_value = 0.06
        lat.inputs[3].default_value = 1.0; lat.inputs[4].default_value = 0.0
        _lnk(nt, fr.outputs[0], lat.inputs[0])
        # fine reticulate veins
        vo = _node(nt, "ShaderNodeTexVoronoi", (-800, -400)); vo.feature = "DISTANCE_TO_EDGE"; vo.inputs["Scale"].default_value = 60
        _lnk(nt, uv.outputs["UV"], vo.inputs["Vector"])
        ret = _node(nt, "ShaderNodeMapRange", (-600, -400)); ret.inputs[1].default_value = 0.0; ret.inputs[2].default_value = 0.05
        ret.inputs[3].default_value = 0.5; ret.inputs[4].default_value = 0.0
        _lnk(nt, vo.outputs["Distance"], ret.inputs[0])
        mx1 = _node(nt, "ShaderNodeMath", (-350, 0)); mx1.operation = "MAXIMUM"
        _lnk(nt, mid.outputs[0], mx1.inputs[0]); _lnk(nt, lat.outputs[0], mx1.inputs[1])
        mx2 = _node(nt, "ShaderNodeMath", (-250, -150)); mx2.operation = "MAXIMUM"
        _lnk(nt, mx1.outputs[0], mx2.inputs[0]); _lnk(nt, ret.outputs[0], mx2.inputs[1])
        vein_h = mx2.outputs[0]
        vm = _node(nt, "ShaderNodeMix", (-150, 0)); vm.data_type = "RGBA"
        _lnk(nt, mx1.outputs[0], vm.inputs[0]); _lnk(nt, cur, vm.inputs[6])
        vm.inputs[7].default_value = (base[0] * 2.2, base[1] * 2.0, base[2] * 1.6, 1)
        cur = vm.outputs[2]
    if purple > 0:
        st = _node(nt, "ShaderNodeTexWave", (-800, 500)); st.wave_type = "BANDS"; st.bands_direction = "X"
        st.inputs["Scale"].default_value = 3; st.inputs["Distortion"].default_value = 8
        tcn = _node(nt, "ShaderNodeTexCoord", (-1000, 500)); _lnk(nt, tcn.outputs["Object"], st.inputs["Vector"])
        sr = _node(nt, "ShaderNodeValToRGB", (-600, 500)); sr.color_ramp.elements[0].position = 0.7
        _lnk(nt, st.outputs["Fac"], sr.inputs["Fac"])
        pm = _node(nt, "ShaderNodeMix", (-350, 400)); pm.data_type = "RGBA"
        sm = _node(nt, "ShaderNodeMath", (-450, 500)); sm.operation = "MULTIPLY"; sm.inputs[1].default_value = purple
        _lnk(nt, sr.outputs["Color"], sm.inputs[0]); _lnk(nt, sm.outputs[0], pm.inputs[0])
        _lnk(nt, cur, pm.inputs[6]); pm.inputs[7].default_value = (0.09, 0.03, 0.03, 1)
        cur = pm.outputs[2]
    _lnk(nt, cur, hs.inputs["Color"])
    _lnk(nt, hs.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = rough
    p.inputs["Sheen Weight"].default_value = sheen
    p.inputs["Sheen Roughness"].default_value = 0.5
    p.inputs["Sheen Tint"].default_value = (0.85, 1.0, 0.8, 1)
    # bump: veins sunk on top, plus micro bumps (hispid hairs bases)
    hn = _node(nt, "ShaderNodeTexNoise", (-700, -650)); hn.inputs["Scale"].default_value = 900; hn.inputs["Detail"].default_value = 2
    hb = _node(nt, "ShaderNodeBump", (-300, -650)); hb.inputs["Strength"].default_value = 0.35 if hair_bump else 0.0
    hb.inputs["Distance"].default_value = 0.0001
    _lnk(nt, hn.outputs["Fac"], hb.inputs["Height"])
    nrm = hb.outputs["Normal"]
    if vein_h is not None:
        vb = _node(nt, "ShaderNodeBump", (-100, -450)); vb.inputs["Strength"].default_value = 0.6
        vb.inputs["Distance"].default_value = 0.0006; vb.invert = True
        _lnk(nt, vein_h, vb.inputs["Height"]); _lnk(nt, nrm, vb.inputs["Normal"])
        nrm = vb.outputs["Normal"]
    _lnk(nt, nrm, p.inputs["Normal"])
    if trans > 0:
        tr = _node(nt, "ShaderNodeBsdfTranslucent", (200, -200))
        tm = _node(nt, "ShaderNodeMix", (50, -200)); tm.data_type = "RGBA"; tm.blend_type = "MULTIPLY"; tm.inputs[0].default_value = 1
        _lnk(nt, hs.outputs["Color"], tm.inputs[6]); tm.inputs[7].default_value = (1.4, 1.6, 0.6, 1)
        _lnk(nt, tm.outputs[2], tr.inputs["Color"]); _lnk(nt, nrm, tr.inputs["Normal"])
        ms = _node(nt, "ShaderNodeMixShader", (400, 0)); ms.inputs[0].default_value = trans
        _lnk(nt, p.outputs[0], ms.inputs[1]); _lnk(nt, tr.outputs[0], ms.inputs[2])
        _lnk(nt, ms.outputs[0], out.inputs["Surface"])
    return m


def mat_dew():
    return C.principled("SF_dew", base=(1, 1, 1), rough=0.0, transmission=1.0, ior=1.333, spec=0.5)


# --------------------------------------------------------------------------- disc florets

def _lerp3(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def _floret_colour(m, rng):
    """Base colour of a floret by radial maturity m (0 centre .. 1 rim)."""
    v = rng.uniform(0.85, 1.12)
    if m < 0.30:
        c = _lerp3((0.09, 0.16, 0.025), (0.15, 0.15, 0.025), m / 0.30)
    elif m < 0.6:
        c = _lerp3((0.15, 0.15, 0.025), (0.085, 0.032, 0.014), (m - 0.30) / 0.30)
    else:
        c = (0.07, 0.026, 0.012)
    return tuple(min(1, x * v) for x in c)


def build_disc(name, R=0.075, N=1450, seed=1, seg=10, dome=0.006, detail=2, dew=0, dew_mat=None):
    """Disc of N florets on Vogel's spiral r = c*sqrt(n), theta = n*137.508 deg.
    detail 2: buds + paleae + open florets with anther tubes; 1: simple domes; returns (disc_obj, dew_obj)."""
    rng = random.Random(seed)
    c = R / math.sqrt(N)
    a0 = 0.86 * c
    V, F, M, COL, POL = [], [], [], [], []
    dew_spots = []

    def zs(r):
        return dome * (1 - (r / R) ** 2)

    if detail == 0:
        # distant LOD: one domed disc, florets reduced to per-vertex colour rings + a floret-scale bump in the shader
        segs, rings = 40, 10
        V0, F0, C0 = [(0, 0, dome + 0.6 * c)], [], [_floret_colour(0, rng)]
        for i in range(1, rings + 1):
            r = R * i / rings
            for k in range(segs):
                a = 2 * math.pi * k / segs
                V0.append((r * math.cos(a), r * math.sin(a), zs(r) + c * (0.9 + 0.6 * i / rings)))
                C0.append(_floret_colour(i / rings, rng) if i < rings * 0.7 else (0.10, 0.04, 0.012))
        for k in range(segs):
            F0.append((0, 1 + k, 1 + (k + 1) % segs))
        for i in range(rings - 1):
            for k in range(segs):
                a0 = 1 + i * segs + k; b0 = 1 + i * segs + (k + 1) % segs
                F0.append((a0, b0, b0 + segs, a0 + segs))
        ob = _mesh(name, V0, F0, cols=C0)
        pa = ob.data.attributes.new("Pol", "FLOAT", "POINT")
        return ob, None

    def add_ring_strip(rings, closed_top=None, mat=0, colfun=None, crease=0):
        """rings: list of (z, radius, colour). seg segments. Returns indices of rings."""
        base = len(V)
        for ri, (z, rad, colr, pol) in enumerate(rings):
            for k in range(seg):
                ang = 2 * math.pi * k / seg
                rr = rad * (1 - crease * (k % 2) if ri >= len(rings) - 3 else 1)
                V.append(T @ Vector((rr * math.cos(ang), rr * math.sin(ang), z)))
                COL.append(colr); POL.append(pol)
        for ri in range(len(rings) - 1):
            for k in range(seg):
                a = base + ri * seg + k
                b = base + ri * seg + (k + 1) % seg
                F.append((a, b, b + seg, a + seg)); M.append(mat)
        if closed_top is not None:
            z, colr, pol = closed_top
            top = len(V)
            V.append(T @ Vector((0, 0, z))); COL.append(colr); POL.append(pol)
            lr = base + (len(rings) - 1) * seg
            for k in range(seg):
                F.append((lr + k, lr + (k + 1) % seg, top)); M.append(mat)
        return base

    for n in range(1, N + 1):
        r = c * math.sqrt(n)
        th = n * GOLDEN
        m = r / R
        p = Vector((r * math.cos(th), r * math.sin(th), zs(r)))
        slope = 2 * dome * r / (R * R)
        nrm = Vector((math.cos(th) * slope, math.sin(th) * slope, 1)).normalized()
        nrm = (nrm + Vector((rng.gauss(0, 0.04), rng.gauss(0, 0.04), 0))).normalized()
        T = frame_from_normal(p, nrm) @ Matrix.Rotation(rng.uniform(0, 6.283), 4, "Z")
        a = a0 * rng.uniform(0.92, 1.05)
        colb = _floret_colour(m, rng)
        out_dir = Vector((math.cos(th), math.sin(th), 0))
        if detail <= 1:
            h = c * (0.9 + 0.6 * m)
            add_ring_strip([(0, a, colb, 0), (0.6 * h, a, colb, 0), (0.9 * h, 0.7 * a, colb, 0)],
                           closed_top=(h, colb, 0), mat=0)
            continue
        open_start = 0.66 + rng.uniform(-0.04, 0.04)
        if m < open_start:
            # closed bud: 5 creased lobes meeting at an apex; colour lighter toward apex
            h = c * (1.35 + 0.55 * m) * rng.uniform(0.88, 1.12)
            if m < 0.3:
                top = _lerp3((0.30, 0.40, 0.07), (0.40, 0.33, 0.05), m / 0.3)
            else:
                top = _lerp3((0.40, 0.33, 0.05), (0.16, 0.06, 0.02), min(1, (m - 0.3) / 0.25))
            if m > open_start - 0.07:
                top = _lerp3(top, (0.75, 0.42, 0.03), (m - open_start + 0.07) / 0.07)
            add_ring_strip([(0, a * 0.92, colb, 0), (0.35 * h, 0.97 * a, colb, 0), (0.58 * h, 0.85 * a, _lerp3(colb, top, 0.5), 0),
                            (0.78 * h, 0.55 * a, top, 0), (0.92 * h, 0.22 * a, top, 0)],
                           closed_top=(h, top, 0), mat=0, crease=0.3)
            # palea (chaff scale) on the outer side, leaning in over the bud: pointed, dark tip
            if m > 0.03:
                pw = 0.62 * a
                Tl = T.inverted()
                od = (Tl.to_3x3() @ out_dir).normalized()
                sd = Vector((0, 0, 1)).cross(od).normalized()
                pts = []
                hh = h * rng.uniform(1.12, 1.35)
                for j, (u, wfac) in enumerate(((0.0, 1.0), (0.5, 0.85), (0.8, 0.45), (1.0, 0.0))):
                    radial = a * (1.08 - 0.95 * u ** 1.6)
                    zc = 0.15 * h + u * (hh - 0.15 * h)
                    cen = od * radial + Vector((0, 0, zc))
                    for s in (-1, 0, 1):
                        lift = 0.0 if s == 0 else -0.12 * a
                        pts.append(T @ (cen + sd * (s * pw * wfac) + od * (abs(s) * 0.15 * a) + Vector((0, 0, lift))))
                base = len(V)
                tipc = (0.035, 0.012, 0.014)
                basec = (0.10, 0.17, 0.03) if m < 0.45 else (0.08, 0.06, 0.02)
                for j in range(4):
                    for s in range(3):
                        V.append(pts[j * 3 + s]); COL.append(_lerp3(basec, tipc, min(1, (j / 3.0) ** 0.7 * 1.2))); POL.append(0)
                for j in range(3):
                    for s in range(2):
                        q = base + j * 3 + s
                        F.append((q, q + 1, q + 4, q + 3)); M.append(3)
            if m > 0.25 and rng.random() < 0.05 * dew:
                dew_spots.append((T @ Vector((0, 0, h)), T.to_3x3() @ Vector((0, 0, 1)), c))
        else:
            # open tubular floret: corolla tube -> 5 spreading yellow lobes, dark anther tube with pollen
            age = (m - open_start) / (1 - open_start)
            h = c * (1.7 + 0.4 * age) * rng.uniform(0.9, 1.1)
            tube = _lerp3((0.30, 0.20, 0.03), (0.13, 0.06, 0.015), age)
            lobe = _lerp3((0.85, 0.52, 0.03), (0.55, 0.22, 0.02), min(1, age * 1.2))
            if age > 0.85:
                lobe = (0.25, 0.08, 0.02)
            b0 = add_ring_strip([(0, 0.8 * a, tube, 0), (0.8 * h, 0.72 * a, tube, 0), (0.97 * h, 0.95 * a, lobe, 0)], mat=0)
            lr = b0 + 2 * seg
            for j in range(5):
                k0, k1, k2 = 2 * j, 2 * j + 1, (2 * j + 2) % seg
                ang = 2 * math.pi * k1 / seg
                tip = T @ Vector((1.38 * a * math.cos(ang), 1.38 * a * math.sin(ang), 1.02 * h - 0.25 * a * age))
                ti = len(V); V.append(tip); COL.append(lobe); POL.append(0)
                F.append((lr + k0, lr + k1, ti)); M.append(0)
                F.append((lr + k1, lr + k2, ti)); M.append(0)
            # anther tube
            ar = 0.40 * a
            ah0, ah1 = 0.75 * h, h + c * (0.75 - 0.35 * age)
            dark = (0.03, 0.012, 0.012)
            pol = 1.0 if age < 0.75 else 0.35
            b1 = len(V)
            for zi, (z, rad, pl) in enumerate(((ah0, ar, 0.15), (ah1 - 0.1 * c, ar, 0.6 * pol), (ah1, 0.75 * ar, pol))):
                for k in range(8):
                    ang = 2 * math.pi * k / 8
                    V.append(T @ Vector((rad * math.cos(ang), rad * math.sin(ang), z))); COL.append(dark); POL.append(pl)
            for zi in range(2):
                for k in range(8):
                    q = b1 + zi * 8 + k; q2 = b1 + zi * 8 + (k + 1) % 8
                    F.append((q, q2, q2 + 8, q + 8)); M.append(1)
            cap = len(V); V.append(T @ Vector((0, 0, ah1 + 0.08 * c))); COL.append(dark); POL.append(pol)
            for k in range(8):
                F.append((b1 + 16 + k, b1 + 16 + (k + 1) % 8, cap)); M.append(1)
            # bifid stigma on the older florets: two curled arms
            if age > 0.4 and rng.random() < 0.8:
                for side in (-1, 1):
                    sb = len(V)
                    for q in range(4):
                        u = q / 3.0
                        ang = side * (0.3 + 1.6 * u)
                        x = side * 0.15 * c + side * 0.55 * c * math.sin(1.4 * u)
                        z = ah1 + 0.1 * c + 0.7 * c * math.sin(1.2 * u)
                        w = 0.12 * c * (1 - 0.6 * u)
                        V.append(T @ Vector((x, -w, z))); V.append(T @ Vector((x, w, z)))
                        COL.append((0.75, 0.45, 0.03)); COL.append((0.75, 0.45, 0.03)); POL.extend((0.0, 0.0))
                    for q in range(3):
                        i0 = sb + 2 * q
                        F.append((i0, i0 + 1, i0 + 3, i0 + 2)); M.append(0)
            if rng.random() < 0.06 * dew:
                dew_spots.append((T @ Vector((0, 0, h)), T.to_3x3() @ Vector((0, 0, 1)), c))
    ob = _mesh(name, [tuple(v) for v in V], F, mats=M, cols=COL)
    pa = ob.data.attributes.new("Pol", "FLOAT", "POINT")
    pa.data.foreach_set("value", POL)
    dew_ob = None
    if dew_spots:
        dew_ob = build_drops(name + "_dew", dew_spots, rng, dew_mat)
    return ob, dew_ob


def build_drops(name, spots, rng, mat, scale_mul=1.0):
    """Dew drops (flattened UV spheres) sitting on surfaces. spots: (pos, normal, size_ref)."""
    bm = bmesh.new()
    for pos, nrm, s in spots:
        rad = s * rng.uniform(0.45, 1.25) * scale_mul
        if rng.random() < 0.12:
            rad *= 1.8
        ret = bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=rad)
        vs = ret["verts"]
        flat = rng.uniform(0.6, 0.8)
        Mx = frame_from_normal(Vector(pos) + Vector(nrm) * rad * flat * 0.75, nrm)
        for v in vs:
            co = v.co.copy(); co.z *= flat
            v.co = Mx @ co
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if mat:
        ob.data.materials.append(mat)
    return ob


# --------------------------------------------------------------------------- strap organs (rays, bracts, leaves)

def strap_mesh(name, L, W, outline, nu=16, nv=7, curl=0.0, fold=0.1, twist=0.0, wave=0.0, droop=0.0,
               cup=0.0, rng=None, notch=0.0, mat=None, ridges=0.0):
    """Generic flat organ along +X (length L), width along Y, bending in Z. outline(u)->half width factor 0..1.
    Returns object (UV: x=u along length, y=v across)."""
    rng = rng or random.Random(1)
    V, F, UV = [], [], []
    ph = rng.uniform(0, 6.28)
    nk = rng.uniform(0, 1)
    for i in range(nu + 1):
        u = i / nu
        hw = 0.5 * W * outline(u)
        if notch > 0 and abs(u - nk) < 0.06:
            hw *= 1 - notch * (1 - abs(u - nk) / 0.06)
        ang = twist * u
        for j in range(nv + 1):
            v = -1 + 2 * j / nv
            y = v * hw
            z = fold * hw * (abs(v) ** 1.5)
            z += -cup * (v * v) * hw
            z += ridges * hw * math.cos(v * math.pi * 3.5) * min(1.0, u * 6) * (1 - u)
            z += wave * W * math.sin(u * 14 + ph + v * 2) * abs(v) ** 3
            x = u * L
            # bend along length (curl>0: tip rises to +Z) and droop
            bend = curl * u * u * L - droop * u ** 2.2 * L
            yy = y * math.cos(ang) - z * math.sin(ang)
            zz = y * math.sin(ang) + z * math.cos(ang) + bend
            V.append((x, yy, zz))
            UV.append((u, (v + 1) / 2))
    for i in range(nu):
        for j in range(nv):
            a = i * (nv + 1) + j
            F.append((a, a + nv + 1, a + nv + 2, a + 1))
    ob = _mesh(name, V, F, uvs=UV)
    if mat:
        ob.data.materials.append(mat)
    return ob


def ray_outline(u):
    if u < 0.18:
        s = 0.22 + 0.78 * (u / 0.18) ** 0.7
    elif u < 0.6:
        s = 1.0
    else:
        s = max(0.0, ((1 - u) / 0.4)) ** 0.75
    return s


def bract_outline(u):
    if u < 0.35:
        s = 0.55 + 0.45 * math.sin(u / 0.35 * math.pi / 2)
    else:
        s = max(0.0, (1 - u) / 0.65) ** 1.6
    return s


def leaf_outline(u):
    # cordate-ovate: broad near the base (with shallow lobes), acuminate tip, serrate margin
    if u < 0.04:
        s = 0.25 + 10 * u
    elif u < 0.35:
        s = 0.65 + 0.35 * math.sin((u - 0.04) / 0.31 * math.pi / 2)
    else:
        s = max(0.0, (1 - u) / 0.65) ** 1.15
    teeth = 1 - 0.05 * abs(math.sin(u * math.pi * 22))
    return s * teeth


def join(objs, name):
    objs = [o for o in objs if o is not None]
    ctx = bpy.context.copy()
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = objs[0]
    o.name = name
    return o


def apply_tf(ob, M):
    ob.data.transform(M)
    ob.matrix_world = Matrix.Identity(4)


# --------------------------------------------------------------------------- head

class Mats:
    def __init__(self):
        self.floret = mat_floret()
        self.anther = mat_anther()
        self.ray = mat_ray()
        self.bract = mat_green("SF_bract", base=(0.045, 0.11, 0.016), rough=0.6, sheen=0.7, trans=0.3)
        self.leaf = mat_green("SF_leaf", base=(0.05, 0.13, 0.014), rough=0.5, sheen=0.15, trans=0.3)
        self.stem = mat_green("SF_stem", base=(0.05, 0.12, 0.02), rough=0.5, sheen=0.7, trans=0.0, veins=False,
                              purple=0.5)
        self.back = mat_green("SF_back", base=(0.05, 0.11, 0.018), rough=0.6, sheen=0.6, trans=0.0, veins=False)
        self.dew = mat_dew()
        self.palea = self.floret

    def far(self):
        """Cheaper copies for the distant LOD: no translucency (paths stop at the first leaf/petal)."""
        import copy
        f = copy.copy(self)
        f.ray = _strip_translucency(self.ray.copy())
        f.leaf = _strip_translucency(self.leaf.copy())
        f.bract = _strip_translucency(self.bract.copy())
        return f


def _strip_translucency(m):
    nt = m.node_tree
    out = nt.nodes["Material Output"]
    for n in nt.nodes:
        if n.bl_idname == "ShaderNodeMixShader" and n.outputs[0].links and n.outputs[0].links[0].to_node == out:
            n.inputs[0].default_value = 0.0
    return m


def build_head(name, mats, R=0.075, N=1450, seed=1, n_rays=34, detail=2, dew=0, ray_len=0.085):
    """Full capitulum in head-local space (+Z = face). Returns list of objects (joined per material set)."""
    rng = random.Random(seed * 7 + 3)
    disc, dew_ob = build_disc(name + "_disc", R=R, N=N, seed=seed, detail=detail, dew=dew, dew_mat=mats.dew)
    for mm in (mats.floret, mats.anther, mats.floret, mats.floret):
        disc.data.materials.append(mm)
    parts = [disc]
    rays = []
    for k in range(n_rays):
        th = (N + 1 + k) * GOLDEN + rng.gauss(0, 0.04)
        L = ray_len * rng.uniform(0.82, 1.12) * (0.75 if rng.random() < 0.06 else 1)
        Wd = L * rng.uniform(0.24, 0.31)
        row = k % 3
        ob = strap_mesh(f"{name}_ray{k}", L, Wd, ray_outline, nu=18 if detail > 1 else 8, nv=10 if detail > 1 else 4,
                        curl=rng.uniform(-0.22, 0.12), fold=rng.uniform(0.10, 0.25), twist=rng.gauss(0, 0.35),
                        wave=rng.uniform(0.006, 0.025), rng=rng, notch=0.35 if rng.random() < 0.15 else 0.0, mat=mats.ray,
                        ridges=0.05 if detail > 1 else 0.0)
        pitch = math.radians(rng.uniform(2, 18) - 7 * row)
        Mx = (Matrix.Rotation(th, 4, "Z") @ Matrix.Translation((R * (0.96 + 0.025 * row), 0, -0.002 - 0.0025 * row))
              @ Matrix.Rotation(-pitch, 4, "Y"))
        apply_tf(ob, Mx)
        rays.append(ob)
        if dew and rng.random() < 0.25:
            spots = []
            for q in range(rng.randint(1, 3)):
                u = rng.uniform(0.35, 0.85); vv = rng.uniform(-0.4, 0.4)
                pt = Mx @ Vector((u * L, vv * Wd * 0.4, 0.0015))
                spots.append((pt, (Mx.to_3x3() @ Vector((0, 0, 1))).normalized(), 0.0009))
            d = build_drops(f"{name}_rdew{k}", spots, rng, mats.dew)
            parts.append(d)
    ray_ob = join(rays, name + "_rays")
    parts.append(ray_ob)
    # involucral bracts (phyllaries): 3 rows behind the rays, curling outward and back
    br = []
    nb = 40 if detail > 1 else 26
    for k in range(nb):
        th = k * GOLDEN + rng.gauss(0, 0.05)
        row = k % 3
        L = rng.uniform(0.03, 0.05) * (1 + 0.15 * row)
        ob = strap_mesh(f"{name}_br{k}", L, L * rng.uniform(0.38, 0.5), bract_outline, nu=10, nv=4,
                        curl=-rng.uniform(0.2, 0.6), fold=0.15, twist=rng.gauss(0, 0.3), rng=rng, mat=mats.bract)
        Mx = (Matrix.Rotation(th, 4, "Z") @ Matrix.Translation((R * (0.92 + 0.07 * row), 0, -0.008 - 0.006 * row))
              @ Matrix.Rotation(math.radians(25 + 15 * row), 4, "Y"))
        apply_tf(ob, Mx)
        br.append(ob)
    parts.append(join(br, name + "_bracts"))
    # receptacle back (green dome)
    prof = [(R * 1.02, -0.004), (R * 0.98, -0.014), (R * 0.85, -0.024), (R * 0.6, -0.033), (R * 0.32, -0.04), (0.018, -0.044)]
    seg = 40
    V, F = [], []
    for i, (rr, z) in enumerate(prof):
        for k in range(seg):
            a = 2 * math.pi * k / seg
            V.append((rr * math.cos(a) * (1 + 0.01 * math.sin(a * 7)), rr * math.sin(a), z))
    for i in range(len(prof) - 1):
        for k in range(seg):
            a = i * seg + k; b = i * seg + (k + 1) % seg
            F.append((a, b, b + seg, a + seg))
    bk = _mesh(name + "_back", V, F)
    bk.data.materials.append(mats.back)
    # cap the front of the receptacle under the florets
    capV = [(R * 1.0 * math.cos(2 * math.pi * k / seg), R * math.sin(2 * math.pi * k / seg), 0.0) for k in range(seg)]
    cp = _mesh(name + "_cap", capV + [(0, 0, 0.003)], [(k, (k + 1) % seg, seg) for k in range(seg)])
    cp.data.materials.append(mats.back)
    parts += [bk, cp]
    if dew_ob:
        parts.append(dew_ob)
    return parts


def tube_along(name, pts, radii, seg=12, mat=None):
    """Swept tube through points (list of Vector) with per-point radius."""
    V, F = [], []
    n = len(pts)
    prev_t = None
    up = Vector((1, 0, 0))
    for i, p in enumerate(pts):
        t = (pts[min(n - 1, i + 1)] - pts[max(0, i - 1)]).normalized()
        if abs(t.dot(up)) > 0.95:
            up = Vector((0, 1, 0))
        b = t.cross(up).normalized(); nn = b.cross(t).normalized()
        for k in range(seg):
            a = 2 * math.pi * k / seg
            V.append(tuple(p + (nn * math.cos(a) + b * math.sin(a)) * radii[i]))
        up = nn
    for i in range(n - 1):
        for k in range(seg):
            a = i * seg + k; b2 = i * seg + (k + 1) % seg
            F.append((a, b2, b2 + seg, a + seg))
    ob = _mesh(name, V, F)
    if mat:
        ob.data.materials.append(mat)
    return ob


def build_neck_and_head(name, mats, seed=1, head_scale=1.0, detail=2, dew=0, R=0.075, N=1450, n_rays=34, nod=0.0):
    """Head + curved neck in pivot space: pivot (stem top) at origin, face looking +Y (tilt by nod rad down).
    Returns joined-able list of parts."""
    rng = random.Random(seed * 31 + 5)
    parts = build_head(name, mats, R=R, N=N, seed=seed, n_rays=n_rays, detail=detail, dew=dew)
    # place head: face normal +Z -> +Y, then nod downward, positioned ahead/above the pivot
    hc = Vector((0, 0.07, 0.16)) * head_scale
    M = Matrix.Translation(hc) @ Matrix.Rotation(-nod, 4, "X") @ Matrix.Rotation(-math.pi / 2, 4, "X") \
        @ Matrix.Scale(head_scale, 4)
    for o in parts:
        apply_tf(o, M)
    back = M @ Vector((0, 0, -0.044))
    # neck curve: from pivot up, arching forward into the back of the head
    pts = []
    for i in range(9):
        u = i / 8
        p = Vector((0, 0, 0)).lerp(Vector((0, 0, back.z + 0.02)), u) * (1 - u ** 3) + back * (u ** 3)
        p.y = back.y * (u ** 2.4)
        p.z = (back.z) * math.sin(u * math.pi / 2) ** 0.9
        pts.append(p)
    rad = [0.0135 * head_scale * (1 + 0.25 * (i / 8) ** 4) for i in range(9)]
    neck = tube_along(name + "_neck", pts, rad, seg=14, mat=mats.stem)
    parts.append(neck)
    return parts


def build_stem_leaves(name, mats, H=1.7, seed=1, n_leaves=7, detail=2):
    """Straight-ish stem from the ground to the pivot at (0,0,H) with big rough leaves on long petioles."""
    rng = random.Random(seed * 17 + 11)
    pts, rad = [], []
    lean = Vector((rng.gauss(0, 0.02), rng.gauss(0, 0.02), 0))
    for i in range(13):
        u = i / 12
        p = Vector((0, 0, u * H)) + lean * (u ** 2) * H
        p.x += 0.008 * math.sin(u * 7 + seed)
        pts.append(p)
        rad.append(0.017 * (1 - 0.35 * u))
    parts = [tube_along(name + "_stem", pts, rad, seg=12 if detail > 1 else 8, mat=mats.stem)]
    end = pts[-1]
    leaves = []
    for k in range(n_leaves):
        u = 0.18 + 0.75 * k / max(1, n_leaves - 1)
        z = u * H
        p = Vector((0, 0, z)) + lean * (u ** 2) * H
        az = k * GOLDEN + rng.gauss(0, 0.2)
        L = rng.uniform(0.24, 0.34) * (1.2 - 0.45 * u)
        # petiole
        pl = L * rng.uniform(0.45, 0.6)
        d = Vector((math.cos(az), math.sin(az), 0))
        ppts = [p + d * pl * t + Vector((0, 0, pl * 0.5 * math.sin(t * 2.2))) for t in (0, 0.25, 0.5, 0.75, 1.0)]
        parts.append(tube_along(f"{name}_pet{k}", ppts, [0.005, 0.0045, 0.004, 0.0035, 0.003], seg=6, mat=mats.stem))
        lf = strap_mesh(f"{name}_leaf{k}", L, L * rng.uniform(0.75, 0.9), leaf_outline, nu=18 if detail > 1 else 10,
                        nv=10 if detail > 1 else 6, curl=0.0, fold=-0.15, twist=rng.gauss(0, 0.15), wave=0.02,
                        droop=rng.uniform(0.35, 0.7), cup=0.12, rng=rng, notch=0.4 if rng.random() < 0.2 else 0.0,
                        mat=mats.leaf)
        tip = ppts[-1]
        Mx = Matrix.Translation(tip) @ Matrix.Rotation(az, 4, "Z") @ Matrix.Rotation(math.radians(rng.uniform(-20, -5)), 4, "Y")
        apply_tf(lf, Mx)
        leaves.append(lf)
    parts += leaves
    return parts, end


# --------------------------------------------------------------------------- stem hairs (hero only)

def add_hairs(ob, count=3000, length=0.003, mat=None, seed=1):
    ps = ob.modifiers.new("hairs", "PARTICLE_SYSTEM")
    s = ps.particle_system.settings
    s.type = "HAIR"
    s.count = count
    s.hair_length = length
    s.emit_from = "FACE"
    s.use_advanced_hair = True
    s.use_rotations = True
    s.rotation_mode = "NOR"
    s.normal_factor = 1.0
    s.factor_random = 0.6
    s.brownian_factor = 0.0
    s.root_radius = 1.0
    s.radius_scale = 0.00012
    s.tip_radius = 0.1
    s.display_step = 3
    s.render_step = 3
    s.child_type = "NONE"
    ps.particle_system.seed = seed
    if mat:
        ob.data.materials.append(mat)
        s.material_slot = mat.name
    return ps


# --------------------------------------------------------------------------- in-shader aerial perspective (no compositor needed)

def haze_group():
    """Shared node group: Shader in -> mixes toward a haze emission by camera view distance.
    Inputs keyed once on the group (Color, Density) so every material follows the sunrise."""
    ng = bpy.data.node_groups.get("S2_haze")
    if ng:
        return ng
    ng = bpy.data.node_groups.new("S2_haze", "ShaderNodeTree")
    ng.interface.new_socket("Shader", in_out="INPUT", socket_type="NodeSocketShader")
    ng.interface.new_socket("Shader", in_out="OUTPUT", socket_type="NodeSocketShader")
    N = ng.nodes
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    col = N.new("ShaderNodeRGB"); col.name = "haze_col"; col.outputs[0].default_value = (0.9, 0.55, 0.3, 1)
    den = N.new("ShaderNodeValue"); den.name = "haze_den"; den.outputs[0].default_value = 0.004
    cd = N.new("ShaderNodeCameraData")
    m1 = N.new("ShaderNodeMath"); m1.operation = "MULTIPLY"
    ng.links.new(cd.outputs["View Distance"], m1.inputs[0]); ng.links.new(den.outputs[0], m1.inputs[1])
    ex = N.new("ShaderNodeMath"); ex.operation = "MULTIPLY"; ex.inputs[1].default_value = -1.0
    ng.links.new(m1.outputs[0], ex.inputs[0])
    e2 = N.new("ShaderNodeMath"); e2.operation = "EXPONENT"; ng.links.new(ex.outputs[0], e2.inputs[0])
    inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
    ng.links.new(e2.outputs[0], inv.inputs[1])
    lp = N.new("ShaderNodeLightPath")
    cap = N.new("ShaderNodeMath"); cap.operation = "MULTIPLY"; cap.inputs[1].default_value = 0.72
    ng.links.new(inv.outputs[0], cap.inputs[0])
    mm = N.new("ShaderNodeMath"); mm.operation = "MULTIPLY"
    ng.links.new(cap.outputs[0], mm.inputs[0]); ng.links.new(lp.outputs["Is Camera Ray"], mm.inputs[1])
    em = N.new("ShaderNodeEmission"); ng.links.new(col.outputs[0], em.inputs["Color"])
    ms = N.new("ShaderNodeMixShader")
    ng.links.new(mm.outputs[0], ms.inputs[0]); ng.links.new(gi.outputs[0], ms.inputs[1]); ng.links.new(em.outputs[0], ms.inputs[2])
    ng.links.new(ms.outputs[0], go.inputs[0])
    return ng


def add_haze(mat):
    nt = mat.node_tree
    out = nt.nodes["Material Output"]
    if not out.inputs["Surface"].links:
        return
    src = out.inputs["Surface"].links[0].from_socket
    mat.cycles.emission_sampling = "NONE"     # the haze "emission" must not turn every leaf into a mesh light
    g = nt.nodes.new("ShaderNodeGroup"); g.node_tree = haze_group()
    nt.links.new(src, g.inputs[0]); nt.links.new(g.outputs[0], out.inputs["Surface"])


def fast_denoise_handler(prefilter="FAST", quality="BALANCED"):
    """common.configure_render() forces ACCURATE/HIGH OIDN (~10 s/frame of fixed cost at 1080x1920 on 4 cores).
    Apply a cheaper but visually equivalent setting at render start (handler runs after configure_render)."""
    def _h(scene, *_):
        scene.cycles.denoising_prefilter = prefilter
        scene.cycles.denoising_quality = quality
    bpy.app.handlers.render_init.append(_h)
