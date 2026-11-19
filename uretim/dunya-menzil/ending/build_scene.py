"""Procedurally build the photoreal Külliyat closing shot (Blender 4.2, Cycles).

Usage (headless):
  blender -b --factory-startup -P build_scene.py -- \
      --blend /path/kulliyat.blend            # where to save the .blend
      [--render 1,90,180] [--samples 64]      # optional preview renders
      [--outdir /path/previews] [--prefix name] [--pct 100]

Everything (geometry, materials, lights, camera move, compositor) is created
here. Bitmaps (spine artwork, Kur'an cover, leather grain, rahle carving,
vignette) come from make_textures.py, which is run automatically with the
system python3 when ./tex is missing.
"""
import bpy
import bmesh  # noqa: F401
import math
import os
import random
import subprocess
import sys
import time
from mathutils import Vector, Matrix, Euler, noise

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import spec  # noqa: E402

TEX = os.path.join(HERE, "tex")
MM = 0.001
FPS = 30
F_START, F_END = 1, 180


# ------------------------------------------------------------------ args
def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    a = dict(blend=None, render=None, samples=None, outdir=None, prefix="prev", pct=100, threads=3)
    i = 0
    while i < len(argv):
        k = argv[i].lstrip("-")
        if k in a:
            a[k] = argv[i + 1]
            i += 2
        else:
            i += 1
    return a


def ensure_textures():
    need = ["spine_%02d.png" % i for i in range(len(spec.BOOKS))] + [
        "leather_grain.png", "quran_cover.png", "quran_spine.png", "rahle_A.png", "rahle_B.png", "vignette.png",
        "wood_table.jpg", "wood_table_h.jpg", "wood_walnut.jpg", "wood_walnut_h.jpg"]
    srcs = [os.path.join(HERE, "spec.py"), os.path.join(HERE, "make_textures.py")]
    newest_src = max(os.path.getmtime(p) for p in srcs)
    if all(os.path.exists(os.path.join(TEX, n)) and os.path.getmtime(os.path.join(TEX, n)) >= newest_src
           for n in need):
        return
    print("[build] generating textures with system python3 ...")
    subprocess.check_call(["python3", os.path.join(HERE, "make_textures.py"), TEX])


# --------------------------------------------------------------- helpers
def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def link(obj, coll=None):
    (coll or bpy.context.scene.collection).objects.link(obj)
    return obj


def mesh_obj(name, verts, faces, smooth=True, uv_layers=None, mat_idx=None, attrs=None, coll=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    if uv_layers:
        for uvname, per_vert_uv in uv_layers.items():
            lay = me.uv_layers.new(name=uvname)
            flat = []
            for poly in me.polygons:
                for li in poly.loop_indices:
                    vi = me.loops[li].vertex_index
                    flat += per_vert_uv(poly.index, vi)
            lay.data.foreach_set("uv", flat)
    if mat_idx is not None:
        me.polygons.foreach_set("material_index", mat_idx)
    if attrs:
        for an, vals in attrs.items():
            at = me.attributes.new(an, "FLOAT", "POINT")
            at.data.foreach_set("value", vals)
    me.polygons.foreach_set("use_smooth", [smooth] * len(me.polygons))
    me.validate(clean_customdata=False)
    me.update()
    ob = bpy.data.objects.new(name, me)
    link(ob, coll)
    return ob


def smootherstep(t):
    t = min(1.0, max(0.0, t))
    return t * t * t * (t * (t * 6 - 15) + 10)


def load_img(name, noncolor=True):
    p = os.path.join(TEX, name)
    img = bpy.data.images.load(p, check_existing=True)
    img.colorspace_settings.name = "Non-Color" if noncolor else "sRGB"
    return img


# ------------------------------------------------------------- node utils
class NB:
    """Tiny node-builder helper."""

    def __init__(self, tree):
        self.t = tree
        self.n = tree.nodes
        self.l = tree.links

    def node(self, typ, loc=(0, 0), **props):
        nd = self.n.new(typ)
        nd.location = loc
        for k, v in props.items():
            setattr(nd, k, v)
        return nd

    def link(self, a, b):
        self.l.new(a, b)

    def math(self, op, a, b=None, loc=(0, 0), clamp=False):
        nd = self.node("ShaderNodeMath", loc, operation=op, use_clamp=clamp)
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                nd.inputs[i].default_value = v
            else:
                self.l.new(v, nd.inputs[i])
        return nd.outputs[0]

    def mix_rgb(self, fac, a, b, loc=(0, 0), blend="MIX"):
        nd = self.node("ShaderNodeMix", loc, data_type="RGBA", blend_type=blend)
        for sock, v in ((nd.inputs[0], fac), (nd.inputs[6], a), (nd.inputs[7], b)):
            if isinstance(v, (int, float)):
                sock.default_value = v
            elif isinstance(v, tuple):
                sock.default_value = v
            else:
                self.l.new(v, sock)
        return nd.outputs[2]

    def val(self, sock, v):
        if isinstance(v, (int, float, tuple)):
            sock.default_value = v
        else:
            self.l.new(v, sock)


def principled(nb, loc=(0, 0), **kw):
    p = nb.node("ShaderNodeBsdfPrincipled", loc)
    names = {"base": "Base Color", "metal": "Metallic", "rough": "Roughness", "spec": "Specular IOR Level",
             "normal": "Normal", "sheen": "Sheen Weight", "sheen_rough": "Sheen Roughness", "sheen_tint": "Sheen Tint",
             "coat": "Coat Weight", "coat_rough": "Coat Roughness", "ior": "IOR", "aniso": "Anisotropic",
             "sss": "Subsurface Weight", "sss_radius": "Subsurface Radius", "sss_scale": "Subsurface Scale",
             "emit": "Emission Color", "emit_strength": "Emission Strength", "spec_tint": "Specular Tint"}
    for k, v in kw.items():
        nb.val(p.inputs[names[k]], v)
    return p


def new_material(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.node_tree.nodes.clear()
    nb = NB(m.node_tree)
    out = nb.node("ShaderNodeOutputMaterial", (1400, 0))
    return m, nb, out


def srgb(h):
    """'#RRGGBB' -> linear RGBA tuple."""
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (lin[0], lin[1], lin[2], 1.0)


# ============================================================ MATERIALS
LEATHER_HEX = "#D7B099"     # pale dusty rose-tan (albedo); tuned against renders
GOLD_LIN = (0.74, 0.47, 0.18, 1.0)


def mat_leather(name, spine_img=None, base_hex=LEATHER_HEX, cover_img=None, ivory=False):
    """Fine grained leather with optional gold-foil artwork.
    spine_img: RGB (gold mask, height, foil var) mapped via 'UVMap' (CLIP).
    cover_img: same layout mapped via 'UVBoard' (used for the Kur'an cover)."""
    m, nb, out = new_material(name)
    tc = nb.node("ShaderNodeTexCoord", (-1800, 0))
    # --- leather grain (tileable 51.2 mm), box-projected in object space
    mp = nb.node("ShaderNodeMapping", (-1600, 200))
    mp.inputs["Scale"].default_value = (1 / 0.0512,) * 3
    nb.link(tc.outputs["Object"], mp.inputs["Vector"])
    gi = nb.node("ShaderNodeTexImage", (-1400, 200), image=load_img("leather_grain.png"), projection="BOX",
                 projection_blend=0.3, interpolation="Linear")
    nb.link(mp.outputs["Vector"], gi.inputs["Vector"])
    grain = gi.outputs["Color"]
    # --- mottling: large-scale tonal variation (dyed hide is never uniform)
    nz = nb.node("ShaderNodeTexNoise", (-1400, 600))
    nz.inputs["Scale"].default_value = 38.0
    nz.inputs["Detail"].default_value = 2.0
    nz.inputs["Roughness"].default_value = 0.55
    nb.link(tc.outputs["Object"], nz.inputs["Vector"])
    nz2 = nb.node("ShaderNodeTexNoise", (-1400, 900))
    nz2.inputs["Scale"].default_value = 210.0
    nz2.inputs["Detail"].default_value = 2.0
    nb.link(tc.outputs["Object"], nz2.inputs["Vector"])
    base = srgb(base_hex)
    if ivory:
        dark = (base[0] * 0.93, base[1] * 0.91, base[2] * 0.86, 1)
        light = (min(1, base[0] * 1.02), min(1, base[1] * 1.02), min(1, base[2] * 1.03), 1)
    else:
        dark = (base[0] * 0.87, base[1] * 0.80, base[2] * 0.78, 1)     # a touch deeper / redder
        light = (min(1, base[0] * 1.05), min(1, base[1] * 1.08), min(1, base[2] * 1.07), 1)  # tan-er
    mr = nb.node("ShaderNodeMapRange", (-1150, 600))
    mr.inputs["From Min"].default_value = 0.32
    mr.inputs["From Max"].default_value = 0.68
    nb.link(nz.outputs["Fac"], mr.inputs["Value"])
    col = nb.mix_rgb(mr.outputs["Result"], dark, light, (-950, 600))
    # fine grain darkening in creases
    gcol = nb.math("MULTIPLY_ADD", grain, 0.10, (-1150, 350))
    gcol.node.inputs[2].default_value = 0.90
    col = nb.mix_rgb(1.0, col, gcol, (-800, 500), blend="MULTIPLY")
    fine = nb.math("MULTIPLY_ADD", nz2.outputs["Fac"], 0.08, (-1150, 900))
    fine.node.inputs[2].default_value = 0.96
    col = nb.mix_rgb(1.0, col, fine, (-650, 600), blend="MULTIPLY")
    # --- edge wear / burnish from the per-vertex 'wear' attribute
    at = nb.node("ShaderNodeAttribute", (-1400, -300), attribute_name="wear")
    wn = nb.math("MULTIPLY", at.outputs["Fac"], nz2.outputs["Fac"], (-1150, -300))
    wn = nb.math("MULTIPLY", wn, 1.6, (-1000, -300), clamp=True)
    wear_col = (min(1, base[0] * 1.05), min(1, base[1] * 1.10), min(1, base[2] * 1.12), 1) if not ivory else \
        (base[0] * 0.95, base[1] * 0.93, base[2] * 0.88, 1)
    col = nb.mix_rgb(wn, col, wear_col, (-500, 500))
    cv = nb.node("ShaderNodeAttribute", (-1400, -450), attribute_name="cavity")
    cvf = nb.math("MULTIPLY", cv.outputs["Fac"], 0.22 if not ivory else 0.12, (-1150, -450))
    col = nb.mix_rgb(cvf, col, (base[0] * 0.55, base[1] * 0.42, base[2] * 0.38, 1), (-350, 500))
    # --- roughness (grain tops a little smoother, burnished wear glossier)
    rough_in = nb.node("ShaderNodeMath", (-700, 0), operation="MULTIPLY_ADD")
    nb.link(grain, rough_in.inputs[0])
    rough_in.inputs[1].default_value = 0.18
    rough_in.inputs[2].default_value = 0.22 if not ivory else 0.24
    rough2 = nb.node("ShaderNodeMath", (-550, 0), operation="MULTIPLY_ADD")
    nb.link(wn, rough2.inputs[0])
    rough2.inputs[1].default_value = -0.12
    nb.link(rough_in.outputs[0], rough2.inputs[2])
    # --- bump: grain then debossed artwork
    b1 = nb.node("ShaderNodeBump", (-500, -200))
    b1.inputs["Strength"].default_value = 0.85
    b1.inputs["Distance"].default_value = 0.00011
    # long soft creases along the spine (from years of opening) + grain
    mpc = nb.node("ShaderNodeMapping", (-1600, -150))
    mpc.inputs["Scale"].default_value = (120.0, 120.0, 7.0)
    nb.link(tc.outputs["Object"], mpc.inputs["Vector"])
    crz = nb.node("ShaderNodeTexNoise", (-1400, -150))
    crz.inputs["Scale"].default_value = 1.0
    crz.inputs["Detail"].default_value = 1.0
    nb.link(mpc.outputs["Vector"], crz.inputs["Vector"])
    hsum1 = nb.math("MULTIPLY_ADD", crz.outputs["Fac"], 0.45, (-900, -150))
    nb.link(grain, hsum1.node.inputs[2])
    nb.link(hsum1, b1.inputs["Height"])
    normal = b1.outputs["Normal"]
    goldmask = None
    gvar = None
    art_nodes = []
    if spine_img is not None:
        art_nodes.append(("UVMap", spine_img))
    if cover_img is not None:
        art_nodes.append(("UVBoard", cover_img))
    heights = []
    for k, (uvname, img) in enumerate(art_nodes):
        uv = nb.node("ShaderNodeUVMap", (-1600, -600 - 300 * k), uv_map=uvname)
        ti = nb.node("ShaderNodeTexImage", (-1400, -600 - 300 * k), image=img, extension="CLIP",
                     interpolation="Cubic")
        nb.link(uv.outputs["UV"], ti.inputs["Vector"])
        sep = nb.node("ShaderNodeSeparateColor", (-1150, -600 - 300 * k))
        nb.link(ti.outputs["Color"], sep.inputs["Color"])
        # CLIP gives black outside -> height 0 there; remap: outside = surface
        inside = ti.outputs["Alpha"]
        h = nb.math("SUBTRACT", 1.0, sep.outputs["Green"], (-950, -650 - 300 * k))
        h = nb.math("MULTIPLY", h, inside, (-800, -650 - 300 * k))
        heights.append(h)
        g = sep.outputs["Red"]
        goldmask = g if goldmask is None else nb.math("MAXIMUM", goldmask, g, (-800, -500))
        gvar = sep.outputs["Blue"] if gvar is None else nb.math("MAXIMUM", gvar, sep.outputs["Blue"], (-800, -800))
    if heights:
        hsum = heights[0] if len(heights) == 1 else nb.math("ADD", heights[0], heights[1], (-650, -700))
        hneg = nb.math("MULTIPLY", hsum, -1.0, (-500, -700))
        b2 = nb.node("ShaderNodeBump", (-300, -400))
        b2.inputs["Strength"].default_value = 1.0
        b2.inputs["Distance"].default_value = 0.00022
        nb.link(hneg, b2.inputs["Height"])
        nb.link(normal, b2.inputs["Normal"])
        normal = b2.outputs["Normal"]
    leather = principled(nb, (0, 300), base=col, rough=rough2.outputs[0], spec=0.55, normal=normal,
                         sheen=0.30 if not ivory else 0.22, sheen_rough=0.40, sheen_tint=(1.0, 0.94, 0.90, 1),
                         coat=0.0)
    if goldmask is None:
        nb.link(leather.outputs[0], out.inputs["Surface"])
        return m
    gold_col = nb.mix_rgb(gvar, (GOLD_LIN[0] * 0.78, GOLD_LIN[1] * 0.74, GOLD_LIN[2] * 0.70, 1), GOLD_LIN, (0, -300))
    grough = nb.math("MULTIPLY_ADD", gvar, -0.22, (0, -500))
    grough.node.inputs[2].default_value = 0.50
    gold = principled(nb, (300, -300), base=gold_col, metal=1.0, rough=grough, normal=normal)
    mix = nb.node("ShaderNodeMixShader", (900, 0))
    nb.link(goldmask, mix.inputs[0])
    nb.link(leather.outputs[0], mix.inputs[1])
    nb.link(gold.outputs[0], mix.inputs[2])
    nb.link(mix.outputs[0], out.inputs["Surface"])
    return m


def mat_paper_edge(name, gilt=False):
    m, nb, out = new_material(name)
    tc = nb.node("ShaderNodeTexCoord", (-1400, 0))
    mp = nb.node("ShaderNodeMapping", (-1200, 0))
    mp.inputs["Scale"].default_value = (5200.0, 22.0, 22.0)   # page layers along local X
    nb.link(tc.outputs["Object"], mp.inputs["Vector"])
    nz = nb.node("ShaderNodeTexNoise", (-1000, 0))
    nz.inputs["Scale"].default_value = 1.0
    nz.inputs["Detail"].default_value = 1.0
    nb.link(mp.outputs["Vector"], nz.inputs["Vector"])
    mp2 = nb.node("ShaderNodeMapping", (-1200, -300))
    mp2.inputs["Scale"].default_value = (700.0, 12.0, 12.0)    # signatures
    nb.link(tc.outputs["Object"], mp2.inputs["Vector"])
    nz2 = nb.node("ShaderNodeTexNoise", (-1000, -300))
    nz2.inputs["Scale"].default_value = 1.0
    nz2.inputs["Detail"].default_value = 0.0
    nb.link(mp2.outputs["Vector"], nz2.inputs["Vector"])
    lines = nb.math("MULTIPLY", nz.outputs["Fac"], nz2.outputs["Fac"], (-800, -100))
    if not gilt:
        cream = srgb("#DFD0B2")
        dark = (cream[0] * 0.80, cream[1] * 0.76, cream[2] * 0.68, 1)
        col = nb.mix_rgb(nb.math("POWER", lines, 1.6, (-650, 0)), cream, dark, (-450, 0))
        bump = nb.node("ShaderNodeBump", (-450, -300))
        bump.inputs["Strength"].default_value = 0.35
        bump.inputs["Distance"].default_value = 0.00005
        nb.link(lines, bump.inputs["Height"])
        p = principled(nb, (0, 0), base=col, rough=0.78, spec=0.35, normal=bump.outputs["Normal"],
                       sss=0.0)
    else:
        col = nb.mix_rgb(lines, (0.80, 0.46, 0.13, 1), (0.55, 0.30, 0.08, 1), (-450, 0))
        r = nb.math("MULTIPLY_ADD", lines, 0.20, (-450, -200))
        r.node.inputs[2].default_value = 0.42
        bump = nb.node("ShaderNodeBump", (-450, -400))
        bump.inputs["Strength"].default_value = 0.3
        bump.inputs["Distance"].default_value = 0.00004
        nb.link(lines, bump.inputs["Height"])
        p = principled(nb, (0, 0), base=col, metal=1.0, rough=r, normal=bump.outputs["Normal"])
    nb.link(p.outputs[0], out.inputs["Surface"])
    return m


def mat_headband(name, c1, c2):
    m, nb, out = new_material(name)
    tc = nb.node("ShaderNodeTexCoord", (-900, 0))
    wv = nb.node("ShaderNodeTexWave", (-700, 0), wave_type="BANDS", bands_direction="X", wave_profile="SAW")
    wv.inputs["Scale"].default_value = 260.0
    nb.link(tc.outputs["Object"], wv.inputs["Vector"])
    st = nb.math("GREATER_THAN", wv.outputs["Fac"], 0.5, (-500, 0))
    col = nb.mix_rgb(st, srgb(c1), srgb(c2), (-300, 0))
    bump = nb.node("ShaderNodeBump", (-300, -250))
    bump.inputs["Strength"].default_value = 0.6
    bump.inputs["Distance"].default_value = 0.0002
    nb.link(wv.outputs["Fac"], bump.inputs["Height"])
    p = principled(nb, (0, 0), base=col, rough=0.45, sheen=0.6, sheen_rough=0.3, normal=bump.outputs["Normal"])
    nb.link(p.outputs[0], out.inputs["Surface"])
    return m


def mat_wood(name, light, dark, axis="X", ring_period=0.0035, warp_amp=0.010, warp_scale=5.0, rough=0.32,
             coat=0.0, carve_img=None, uvname="UVMap", streak=0.5, tone_var=0.35):
    """Procedural long-grain wood. axis = local axis the grain runs along."""
    m, nb, out = new_material(name)
    tc = nb.node("ShaderNodeTexCoord", (-1800, 0))
    stretch = {"X": (0.25, 1.0, 1.0), "Y": (1.0, 0.25, 1.0), "Z": (1.0, 1.0, 0.25)}[axis]
    # low-frequency warp -> cathedral / wavy figure
    mpw = nb.node("ShaderNodeMapping", (-1600, 300))
    mpw.inputs["Scale"].default_value = tuple(warp_scale * v for v in stretch)
    nb.link(tc.outputs["Object"], mpw.inputs["Vector"])
    nz = nb.node("ShaderNodeTexNoise", (-1400, 300))
    nz.inputs["Scale"].default_value = 1.0
    nz.inputs["Detail"].default_value = 3.0
    nz.inputs["Roughness"].default_value = 0.55
    nb.link(mpw.outputs["Vector"], nz.inputs["Vector"])
    cen = nb.node("ShaderNodeVectorMath", (-1200, 300), operation="SUBTRACT")
    nb.link(nz.outputs["Color"], cen.inputs[0])
    cen.inputs[1].default_value = (0.5, 0.5, 0.5)
    warp = nb.node("ShaderNodeVectorMath", (-1000, 200), operation="MULTIPLY_ADD")
    nb.link(cen.outputs[0], warp.inputs[0])
    wv_amp = [warp_amp] * 3
    wv_amp["XYZ".index(axis)] = 0.0
    warp.inputs[1].default_value = tuple(wv_amp)
    nb.link(tc.outputs["Object"], warp.inputs[2])
    rings = nb.node("ShaderNodeTexWave", (-800, 200), wave_type="RINGS", rings_direction=axis, wave_profile="SIN")
    rings.inputs["Scale"].default_value = 2 * math.pi / (20.0 * ring_period)
    rings.inputs["Distortion"].default_value = 2.5
    rings.inputs["Detail"].default_value = 3.0
    rings.inputs["Detail Scale"].default_value = 0.6
    rings.inputs["Detail Roughness"].default_value = 0.55
    nb.link(warp.outputs[0], rings.inputs["Vector"])
    late = nb.math("POWER", rings.outputs["Fac"], 2.2, (-600, 200))       # darker latewood lines
    # fine fibre streaks / pores
    mps = nb.node("ShaderNodeMapping", (-1600, -200))
    sstr = {"X": (18.0, 700.0, 700.0), "Y": (700.0, 18.0, 700.0), "Z": (700.0, 700.0, 18.0)}[axis]
    mps.inputs["Scale"].default_value = sstr
    nb.link(tc.outputs["Object"], mps.inputs["Vector"])
    nz2 = nb.node("ShaderNodeTexNoise", (-1400, -200))
    nz2.inputs["Scale"].default_value = 1.0
    nz2.inputs["Detail"].default_value = 2.0
    nb.link(mps.outputs["Vector"], nz2.inputs["Vector"])
    fib = nb.math("MULTIPLY", nz2.outputs["Fac"], streak, (-1100, -200))
    g = nb.math("ADD", late, fib, (-450, 100))
    g = nb.math("MULTIPLY", g, 0.75, (-300, 100), clamp=True)
    # large tonal variation between boards / across the piece
    mpt = nb.node("ShaderNodeMapping", (-1600, 600))
    mpt.inputs["Scale"].default_value = tuple(1.5 * v for v in stretch)
    nb.link(tc.outputs["Object"], mpt.inputs["Vector"])
    nz3 = nb.node("ShaderNodeTexNoise", (-1400, 600))
    nz3.inputs["Scale"].default_value = 1.0
    nz3.inputs["Detail"].default_value = 2.0
    nb.link(mpt.outputs["Vector"], nz3.inputs["Vector"])
    col = nb.mix_rgb(g, srgb(light), srgb(dark), (-150, 200))
    col = nb.mix_rgb(nb.math("MULTIPLY", nz3.outputs["Fac"], tone_var, (-300, 600)), col, srgb(dark), (0, 300))
    rr = nb.math("MULTIPLY_ADD", g, 0.12, (-150, -100))
    rr.node.inputs[2].default_value = rough
    b = nb.node("ShaderNodeBump", (-150, -300))
    b.inputs["Strength"].default_value = 0.3
    b.inputs["Distance"].default_value = 0.0002
    nb.link(g, b.inputs["Height"])
    normal = b.outputs["Normal"]
    if carve_img is not None:
        uv = nb.node("ShaderNodeUVMap", (-800, -700), uv_map=uvname)
        ci = nb.node("ShaderNodeTexImage", (-600, -700), image=carve_img, interpolation="Cubic")
        nb.link(uv.outputs["UV"], ci.inputs["Vector"])
        b2 = nb.node("ShaderNodeBump", (100, -500))
        b2.inputs["Strength"].default_value = 1.0
        b2.inputs["Distance"].default_value = 0.0018
        nb.link(ci.outputs["Color"], b2.inputs["Height"])
        nb.link(normal, b2.inputs["Normal"])
        normal = b2.outputs["Normal"]
        dk = nb.math("SUBTRACT", 0.80, ci.outputs["Color"], (-300, -800))
        dk = nb.math("MULTIPLY", dk, 2.2, (-150, -800), clamp=True)
        dcol = srgb(dark)
        col = nb.mix_rgb(dk, col, (dcol[0] * 0.6, dcol[1] * 0.6, dcol[2] * 0.6, 1), (150, 100))
    p = principled(nb, (400, 0), base=col, rough=rr, spec=0.5, normal=normal, coat=coat, coat_rough=0.22)
    nb.link(p.outputs[0], out.inputs["Surface"])
    return m


def mat_wood_img(name, col_img, h_img, tex_size, coord="OBJECT", offset=(0.0, 0.0), rough=0.32, coat=0.0,
                 carve_img=None, along="X", bump=0.35):
    """Image-based wood. Texture (grain along image X) covers tex_size metres.
    coord OBJECT: object-space X/Y (grain along local X if along=='X', local Y if 'Y').
    coord UV: uses UVMap scaled by the leaf size (grain along V)."""
    m, nb, out = new_material(name)
    if coord == "OBJECT":
        tc = nb.node("ShaderNodeTexCoord", (-1600, 0))
        src = tc.outputs["Object"]
        sep = nb.node("ShaderNodeSeparateXYZ", (-1400, 0))
        nb.link(src, sep.inputs[0])
        a_, b_ = (sep.outputs[0], sep.outputs[1]) if along == "X" else (sep.outputs[1], sep.outputs[0])
        sa, sb = 1.0 / tex_size[0], 1.0 / tex_size[1]
    else:
        uvn = nb.node("ShaderNodeUVMap", (-1600, 0), uv_map="UVMap")
        sep = nb.node("ShaderNodeSeparateXYZ", (-1400, 0))
        nb.link(uvn.outputs["UV"], sep.inputs[0])
        a_, b_ = sep.outputs[1], sep.outputs[0]                      # grain along V (leaf length)
        sa = spec.RAHLE_L * MM / tex_size[0]
        sb = spec.RAHLE_W * MM / tex_size[1]
    u = nb.math("MULTIPLY_ADD", a_, sa, (-1200, 100))
    u.node.inputs[2].default_value = 0.5 + offset[0] if coord == "OBJECT" else offset[0]
    v = nb.math("MULTIPLY_ADD", b_, sb, (-1200, -100))
    v.node.inputs[2].default_value = 0.5 + offset[1] if coord == "OBJECT" else offset[1]
    cmb = nb.node("ShaderNodeCombineXYZ", (-1000, 0))
    nb.link(u, cmb.inputs[0])
    nb.link(v, cmb.inputs[1])
    ci = nb.node("ShaderNodeTexImage", (-800, 200), image=load_img(col_img, noncolor=False), interpolation="Linear")
    hi = nb.node("ShaderNodeTexImage", (-800, -200), image=load_img(h_img), interpolation="Linear")
    nb.link(cmb.outputs[0], ci.inputs["Vector"])
    nb.link(cmb.outputs[0], hi.inputs["Vector"])
    col = ci.outputs["Color"]
    h = hi.outputs["Color"]
    rr = nb.math("MULTIPLY_ADD", h, -0.08, (-500, -100))
    rr.node.inputs[2].default_value = rough + 0.05
    normal = None
    if bump > 0:
        bmp = nb.node("ShaderNodeBump", (-500, -300))
        bmp.inputs["Strength"].default_value = bump
        bmp.inputs["Distance"].default_value = 0.00025
        nb.link(h, bmp.inputs["Height"])
        normal = bmp.outputs["Normal"]
    if carve_img is not None:
        uv = nb.node("ShaderNodeUVMap", (-800, -700), uv_map="UVMap")
        cv = nb.node("ShaderNodeTexImage", (-600, -700), image=carve_img, interpolation="Cubic")
        nb.link(uv.outputs["UV"], cv.inputs["Vector"])
        b2 = nb.node("ShaderNodeBump", (-200, -500))
        b2.inputs["Strength"].default_value = 1.0
        b2.inputs["Distance"].default_value = 0.0011
        nb.link(cv.outputs["Color"], b2.inputs["Height"])
        if normal is not None:
            nb.link(normal, b2.inputs["Normal"])
        normal = b2.outputs["Normal"]
        dk = nb.math("SUBTRACT", 0.80, cv.outputs["Color"], (-400, -800))
        dk = nb.math("MULTIPLY", dk, 2.2, (-250, -800), clamp=True)
        col = nb.mix_rgb(dk, col, (0.02, 0.012, 0.008, 1), (-200, 200))
    kw = dict(base=col, rough=rr, spec=0.5, coat=coat, coat_rough=0.2)
    if normal is not None:
        kw["normal"] = normal
    p = principled(nb, (100, 0), **kw)
    nb.link(p.outputs[0], out.inputs["Surface"])
    return m


def mat_plaster(name, hexcol):
    """Matte lime plaster. The wall is always far out of focus, so only a
    gentle low-frequency tonal variation is modelled (cheap to render)."""
    m, nb, out = new_material(name)
    tc = nb.node("ShaderNodeTexCoord", (-900, 0))
    nz = nb.node("ShaderNodeTexNoise", (-700, 0))
    nz.inputs["Scale"].default_value = 2.2
    nz.inputs["Detail"].default_value = 2.0
    nz.inputs["Roughness"].default_value = 0.5
    nb.link(tc.outputs["Object"], nz.inputs["Vector"])
    c = srgb(hexcol)
    col = nb.mix_rgb(nz.outputs["Fac"], (c[0] * 0.96, c[1] * 0.955, c[2] * 0.94, 1), (c[0] * 1.01, c[1] * 1.01, c[2] * 1.005, 1),
                     (-400, 0))
    p = principled(nb, (0, 0), base=col, rough=0.95, spec=0.25)
    nb.link(p.outputs[0], out.inputs["Surface"])
    return m


def mat_simple(name, hexcol, rough=0.5, metal=0.0):
    m, nb, out = new_material(name)
    p = principled(nb, (0, 0), base=srgb(hexcol), rough=rough, metal=metal)
    nb.link(p.outputs[0], out.inputs["Surface"])
    return m


def mat_brass(name):
    m, nb, out = new_material(name)
    tc = nb.node("ShaderNodeTexCoord", (-900, 0))
    mp = nb.node("ShaderNodeMapping", (-700, 0))
    mp.inputs["Scale"].default_value = (2.0, 2.0, 900.0)   # brushed along local Z
    nb.link(tc.outputs["Object"], mp.inputs["Vector"])
    nz = nb.node("ShaderNodeTexNoise", (-500, 0))
    nz.inputs["Scale"].default_value = 1.0
    nz.inputs["Detail"].default_value = 2.0
    nb.link(mp.outputs["Vector"], nz.inputs["Vector"])
    r = nb.math("MULTIPLY_ADD", nz.outputs["Fac"], 0.12, (-300, 0))
    r.node.inputs[2].default_value = 0.24
    p = principled(nb, (0, 0), base=(0.78, 0.56, 0.30, 1), metal=1.0, rough=r)
    nb.link(p.outputs[0], out.inputs["Surface"])
    return m


# ============================================================ BOOK GEOMETRY
def chaikin(pts, iters=2, closed=False):
    for _ in range(iters):
        new = [pts[0]] if not closed else []
        rng = range(len(pts) - 1) if not closed else range(len(pts))
        for i in rng:
            p, q = pts[i], pts[(i + 1) % len(pts)]
            new.append(tuple(0.75 * a + 0.25 * b for a, b in zip(p, q)))
            new.append(tuple(0.25 * a + 0.75 * b for a, b in zip(p, q)))
        if not closed:
            new.append(pts[-1])
        pts = new
    return pts


def build_case(name, T, D, H, bt, spine_th=1.7, gd=1.15, jy0=2.6, jy1=9.5, rc=0.9, hubs_from_top=None,
               hub_h=None, coll=None, front_board_slot=False):
    """Leather case (boards + rounded spine with raised hubs) as one mesh.
    Local frame (mm -> m at the end): x across thickness, y spine(0)->fore-edge(D), z up.
    UVMap: u = arc length along the outer path / spine arc length (0..1 on the spine),
    v = z/H.  UVBoard: (y/D, z/H)."""
    R, half, Larc = spec.spine_arc(T)
    s = spec.sagitta(T)
    hubs_from_top = spec.HUBS_FROM_TOP if hubs_from_top is None else hubs_from_top
    hub_h = spec.HUB_HEIGHT if hub_h is None else hub_h

    # ---- left half outer path: fore-edge corner -> spine centre
    left = []
    # board outer face (x=-T/2), walking -y
    for y in (D - rc, D * 0.66, D * 0.33, jy1 + 3.0, jy1):
        left.append((-T / 2, y, "board"))
    n_g = 7
    for i in range(1, n_g):
        t = i / n_g
        y = jy1 - (jy1 - jy0) * t
        left.append((-T / 2 + gd * math.sin(math.pi * t) ** 2, y, "groove"))
    left.append((-T / 2, jy0, "shoulder"))
    left.append((-T / 2, jy0 * 0.45, "shoulder"))
    n_a = 12
    for i in range(n_a + 1):
        ph = -half + half * i / n_a
        left.append((R * math.sin(ph), (R - s) - R * math.cos(ph), "spine"))
    # smooth groove/shoulder/arc junctions (keep the straight board part)
    k0 = 4
    head = left[:k0]
    tail = chaikin([(p[0], p[1]) for p in left[k0 - 1:]], 1)
    kinds_src = left[k0 - 1:]

    def kind_at(px, py):
        best, bk = 1e9, "spine"
        for q in kinds_src:
            d2 = (q[0] - px) ** 2 + (q[1] - py) ** 2
            if d2 < best:
                best, bk = d2, q[2]
        return bk
    left = head + [(p[0], p[1], kind_at(p[0], p[1])) for p in tail[1:]]
    # ensure exact spine centre at end
    left[-1] = (0.0, -s, "spine")
    right = [(-p[0], p[1], p[2]) for p in reversed(left[:-1])]
    outer = left + right                       # left fore-edge -> spine -> right fore-edge
    # outward normals (CCW loop -> right-hand normal), thickness
    No = len(outer)

    def nrm(pts, i, closed=False):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, len(pts) - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) + 1e-12
        return (dy / L, -dx / L)               # right-hand normal (outward for CCW)

    def thick(kind):
        return {"board": bt, "groove": bt * 0.85, "shoulder": spine_th * 1.1, "spine": spine_th}[kind]

    # cumulative arc length -> UV u ; zero at left spine edge
    cum = [0.0]
    for i in range(1, No):
        cum.append(cum[-1] + math.hypot(outer[i][0] - outer[i - 1][0], outer[i][1] - outer[i - 1][1]))
    # locate left spine edge (first 'spine' point) and right edge (last 'spine' point)
    i_l = next(i for i, p in enumerate(outer) if p[2] == "spine")
    i_r = max(i for i, p in enumerate(outer) if p[2] == "spine")
    u0, u1 = cum[i_l], cum[i_r]
    us = [(c - u0) / (u1 - u0) for c in cum]

    loop = []   # entries: dict(x,y,n=(nx,ny),th,kind,u,outer)
    for i, p in enumerate(outer):
        n = nrm(outer, i)
        loop.append(dict(x=p[0], y=p[1], n=n, th=thick(p[2]), kind=p[2], u=us[i], outer=True,
                         side=-1 if p[0] < 0 else 1))
    # simpler explicit construction of the fore edges
    def fore_pts(side):
        xo = side * T / 2
        xi = side * (T / 2 - bt)
        r = min(rc, bt * 0.4)
        res = []
        # outer corner arc from normal (side,0) to (0,1)
        c = (xo - side * r, D - r)
        for k in range(1, 4):
            a = (k / 3) * math.pi / 2
            nx, ny = side * math.cos(a), math.sin(a)
            res.append((c[0] + r * nx, c[1] + r * ny, (nx, ny)))
        c2 = (xi + side * r, D - r)
        for k in range(0, 3):
            a = math.pi / 2 - (k / 3) * math.pi / 2
            nx, ny = -side * math.cos(a), math.sin(a)
            res.append((c2[0] + r * nx, c2[1] + r * ny, (nx, ny)))
        return res
    for (x, y, n) in fore_pts(1):
        loop.append(dict(x=x, y=y, n=n, th=bt, kind="fore", u=9.0, outer=False, side=1))
    # inner path: offset of outer, reversed order (right fore -> spine -> left fore)
    inner = []
    for i in range(No - 1, -1, -1):
        e = loop[i]
        th = e["th"]
        x = e["x"] - e["n"][0] * th
        y = e["y"] - e["n"][1] * th
        inner.append(dict(x=x, y=y, n=(-e["n"][0], -e["n"][1]), th=th, kind="inner", u=9.0, outer=False,
                          side=e["side"]))
    # clamp the inner spine so it never crosses itself
    loop += inner
    fl = fore_pts(-1)
    for (x, y, n) in reversed(fl):
        loop.append(dict(x=x, y=y, n=n, th=bt, kind="fore", u=9.0, outer=False, side=-1))
    NL = len(loop)

    # ---- z rows
    zs = set()
    z = 0.0
    while z < H:
        zs.add(round(z, 4))
        z += 4.0
    zs.add(H)
    hub_z = [H - h for h in hubs_from_top]
    for zc in hub_z:
        z = zc - 6.5
        while z <= zc + 6.5:
            zs.add(round(z, 4))
            z += 0.6
    rr = 0.9
    n_round = 5
    for zend, sgn in ((0.0, 1), (H, -1)):
        for j in range(n_round + 1):
            a = (j / n_round) * math.pi / 2
            zs.add(round(zend + sgn * (rr - rr * math.sin(a)), 5))
        for zz in (2.0, 3.2):
            zs.add(round(zend + sgn * zz, 4))
    zs = sorted(v for v in zs if -1e-6 <= v <= H + 1e-6)

    def inset_at(z, th):
        r = min(rr, 0.42 * th)
        d = min(z, H - z)
        if d >= r:
            return 0.0, 0.0
        # circle profile
        a = math.asin(max(-1.0, min(1.0, (r - d) / r)))
        return r - r * math.cos(a), r

    def hub_disp(z):
        v = 0.0
        for zc in hub_z:
            t = (z - zc) / spec.HUB_HALF
            v += math.exp(-abs(t) ** 5)
        return hub_h * min(v, 1.0)

    verts, wear, uvs_main, uvs_board, cavity = [], [], [], [], []
    kinds = []
    for z in zs:
        hd = hub_disp(z)
        for e in loop:
            ins, _ = inset_at(z, e["th"])
            x = e["x"] - e["n"][0] * ins
            y = e["y"] - e["n"][1] * ins
            w = 0.0
            if e["outer"] and e["kind"] in ("spine", "shoulder"):
                f = 1.0 if e["kind"] == "spine" else 0.55
                x += e["n"][0] * hd * f
                y += e["n"][1] * hd * f
                w = max(w, 0.85 * hd / max(hub_h, 1e-6) * f)
            dz = min(z, H - z)
            w = max(w, math.exp(-dz / 1.6))
            if e["kind"] in ("board", "fore") and e["y"] > D - 6:
                w = max(w, 0.7 * math.exp(-(D - e["y"]) / 2.0))
            if e["kind"] == "shoulder":
                w = max(w, 0.45)
            cav = 1.0 if e["kind"] == "groove" else (0.35 if e["kind"] == "shoulder" else 0.0)
            if e["outer"] and e["kind"] in ("spine", "shoulder"):
                # leather pulls into the base of each raised band
                for zc in hub_z:
                    t = abs(z - zc) / spec.HUB_HALF
                    cav = max(cav, 0.55 * math.exp(-((t - 1.15) / 0.28) ** 2))
            cavity.append(cav)
            verts.append((x * MM, y * MM, z * MM))
            wear.append(min(1.0, w))
            uvs_main.append((e["u"], z / H))
            uvs_board.append((1.0 - e["y"] / D, z / H))
            kinds.append(e["kind"])
    NZ = len(zs)
    faces, mat_idx = [], []
    for j in range(NZ - 1):
        for i in range(NL):
            a = j * NL + i
            b = j * NL + (i + 1) % NL
            c = (j + 1) * NL + (i + 1) % NL
            d = (j + 1) * NL + i
            faces.append((a, b, c, d))
            ki, kn = loop[i], loop[(i + 1) % NL]
            is_front = front_board_slot and ki["kind"] == "board" and kn["kind"] == "board" and ki["side"] < 0
            mat_idx.append(1 if is_front else 0)
    # caps: ribbon of quads between each outer point and its inner offset,
    # plus small n-gons over the fore-edge corners (separate verts, flat shaded)
    NF = 6                                   # points per fore-edge corner group
    i_in0 = No + NF                          # first inner index in the loop

    def inner_of(i):
        return i_in0 + (No - 1 - i)
    n_cap_faces = 0
    for j, top in ((0, False), (NZ - 1, True)):
        base = len(verts)
        for i in range(NL):
            verts.append(verts[j * NL + i])
            wear.append(wear[j * NL + i])
            cavity.append(cavity[j * NL + i])
            uvs_main.append((9.0, 9.0))
            uvs_board.append((9.0, 9.0))
        cap = []
        for i in range(No - 1):
            cap.append((base + i, base + i + 1, base + inner_of(i + 1), base + inner_of(i)))
        cap.append(tuple([base + No - 1] + [base + No + k for k in range(NF)] + [base + inner_of(No - 1)]))
        cap.append(tuple([base + inner_of(0)] + [base + i_in0 + No + k for k in range(NF)] + [base + 0]))
        for fc in cap:
            faces.append(fc if top else tuple(reversed(fc)))
            mat_idx.append(0)
            n_cap_faces += 1
    ob = mesh_obj(name, verts, faces, smooth=True,
                  uv_layers={"UVMap": lambda p, v: uvs_main[v], "UVBoard": lambda p, v: uvs_board[v]},
                  mat_idx=mat_idx, attrs={"wear": wear, "cavity": cavity}, coll=coll)
    # flat shade caps
    me = ob.data
    for p in me.polygons[len(me.polygons) - n_cap_faces:]:
        p.use_smooth = False
    return ob


def build_pageblock(name, T, D, H, bt, sq=3.0, spine_th=1.7, coll=None, fore_inset=None):
    R, half, Larc = spec.spine_arc(T)
    s = spec.sagitta(T)
    wp = T / 2 - bt - 0.15
    fi = sq if fore_inset is None else fore_inset
    conc = s * 0.85

    def y_sp(x):
        return (R - s) - math.sqrt(max(R * R - x * x, 0.0)) + spine_th + 0.25

    def y_fe(x):
        return D - fi - conc * (1 - (x / wp) ** 2)
    nx, ny = 14, 6
    z0, z1 = sq, H - sq
    verts, faces = [], []

    def grid(z):
        base = len(verts)
        for i in range(nx + 1):
            x = -wp + 2 * wp * i / nx
            ya, yb = y_sp(x), y_fe(x)
            for j in range(ny + 1):
                y = ya + (yb - ya) * (j / ny) ** 1.0
                verts.append((x * MM, y * MM, z * MM))
        return base
    bt0 = grid(z0)
    tp0 = grid(z1)

    def vid(base, i, j):
        return base + i * (ny + 1) + j
    for i in range(nx):
        for j in range(ny):
            faces.append((vid(tp0, i, j), vid(tp0, i + 1, j), vid(tp0, i + 1, j + 1), vid(tp0, i, j + 1)))
            faces.append((vid(bt0, i, j + 1), vid(bt0, i + 1, j + 1), vid(bt0, i + 1, j), vid(bt0, i, j)))
    # boundary ring
    ring = [(i, 0) for i in range(nx + 1)] + [(nx, j) for j in range(1, ny + 1)] + \
           [(i, ny) for i in range(nx - 1, -1, -1)] + [(0, j) for j in range(ny - 1, 0, -1)]
    for k in range(len(ring)):
        i0, j0 = ring[k]
        i1, j1 = ring[(k + 1) % len(ring)]
        faces.append((vid(bt0, i0, j0), vid(bt0, i1, j1), vid(tp0, i1, j1), vid(tp0, i0, j0)))
    ob = mesh_obj(name, verts, faces, smooth=False, coll=coll)
    return ob, y_sp, wp


def build_headband(name, y_sp, wp, zc, r=1.25, coll=None):
    n_path, n_circ = 24, 10
    verts, faces = [], []
    for i in range(n_path + 1):
        x = -wp + 2 * wp * i / n_path
        y = y_sp(x) + r * 0.85
        for k in range(n_circ):
            a = 2 * math.pi * k / n_circ
            verts.append((x * MM, (y + r * math.cos(a)) * MM, (zc + r * math.sin(a)) * MM))
    for i in range(n_path):
        for k in range(n_circ):
            a = i * n_circ + k
            b = i * n_circ + (k + 1) % n_circ
            faces.append((a, b, b + n_circ, a + n_circ))
    return mesh_obj(name, verts, faces, smooth=True, coll=coll)


def make_book(idx, title, T, mat_case, mat_paper, mat_hb, coll):
    H, D = spec.BOOK_H, spec.BOOK_D
    bt = 2.8
    root = bpy.data.objects.new("Book_%02d" % idx, None)
    root.empty_display_size = 0.05
    link(root, coll)
    case = build_case("Book_%02d_case" % idx, T, D, H, bt, coll=coll)
    case.data.materials.append(mat_case)
    case.data.materials.append(mat_case)
    pb, y_sp, wp = build_pageblock("Book_%02d_pages" % idx, T, D, H, bt, coll=coll)
    pb.data.materials.append(mat_paper)
    hb = build_headband("Book_%02d_headband" % idx, y_sp, wp, H - 3.0 + 1.25 * 0.75, coll=coll)
    hb.data.materials.append(mat_hb)
    hb2 = build_headband("Book_%02d_tailband" % idx, y_sp, wp, 3.0 - 1.25 * 0.75, coll=coll)
    hb2.data.materials.append(mat_hb)
    for o in (case, pb, hb, hb2):
        o.parent = root
    return root


# ============================================================ RAHLE
def leaf_mesh(name, which, coll):
    outline, holes = spec.rahle_leaf(which)
    cu = bpy.data.curves.new(name + "_cu", "CURVE")
    cu.dimensions = "2D"
    cu.fill_mode = "BOTH"
    cu.extrude = (spec.RAHLE_T / 2 - 0.8) * MM
    cu.bevel_depth = 0.8 * MM
    cu.bevel_resolution = 2
    cu.resolution_u = 1
    for poly in [outline] + holes:
        sp = cu.splines.new("POLY")
        sp.points.add(len(poly) - 1)
        for i, (x, y) in enumerate(poly):
            sp.points[i].co = (x * MM, y * MM, 0.0, 1.0)
        sp.use_cyclic_u = True
    tmp = bpy.data.objects.new(name + "_tmp", cu)
    link(tmp, coll)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    me.name = name
    # planar UV from local coordinates
    W, L = spec.RAHLE_W * MM, spec.RAHLE_L * MM
    lay = me.uv_layers.new(name="UVMap")
    flat = []
    for lp in me.loops:
        co = me.vertices[lp.vertex_index].co
        flat += [(co.x + W / 2) / W, co.y / L]
    lay.data.foreach_set("uv", flat)
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    ob = bpy.data.objects.new(name, me)
    link(ob, coll)
    # auto-smooth by angle (4.2: modifier-free approach via sharp edges)
    me.set_sharp_from_angle(angle=math.radians(35))
    return ob


def build_rahle(coll, mat_A, mat_B):
    th = math.radians(spec.RAHLE_THETA)
    c, s = math.cos(th), math.sin(th)
    t = spec.RAHLE_T * MM
    yh = spec.RAHLE_HINGE * MM
    hz = yh * s + (t / 2) * c
    root = bpy.data.objects.new("Rahle", None)
    link(root, coll)
    A = leaf_mesh("Rahle_leafA", "A", coll)
    B = leaf_mesh("Rahle_leafB", "B", coll)
    A.data.materials.append(mat_A)
    B.data.materials.append(mat_B)
    hinge = Vector((0, 0, hz))
    dA = Vector((0, c, s))
    dB = Vector((0, -c, s))
    A.rotation_euler = (th, 0, 0)
    A.location = hinge - yh * dA
    B.rotation_euler = (math.pi - th, 0, 0)
    B.location = hinge - yh * dB
    A.parent = root
    B.parent = root
    # hinge pins (two brass dowels at the outer knuckles, barely visible)
    return root, hinge, dA, dB, th


def quran_on_rahle(coll, root, hinge, dA, dB, th, mats):
    c, s = math.cos(th), math.sin(th)
    t = spec.RAHLE_T * MM + 0.0006       # leaf thickness (+ tiny clearance)
    T, H, D = spec.QURAN_T, spec.QURAN_H, spec.QURAN_D
    tb = T * MM
    nA = Vector((0, -s, c))
    nB = Vector((0, s, c))
    # solve a0*dA + (t/2+tb)*nA = b*dB + (t/2)*nB  (2x2 in y,z)
    rhs = (t / 2) * nB - (t / 2 + tb) * nA
    # a0*dA.y - b*dB.y = rhs.y ; a0*dA.z - b*dB.z = rhs.z
    det = dA.y * (-dB.z) - (-dB.y) * dA.z
    a0 = (rhs.y * (-dB.z) - (-dB.y) * rhs.z) / det
    a0 += 0.002
    S = H / 240.0
    case = build_case("Quran_case", T, D, H, 3.0, spine_th=1.9, gd=1.25, jy0=2.8, jy1=10.0, rc=0.9,
                      hubs_from_top=[v * S for v in (24.0, 70.0, 170.0, 216.0)], hub_h=1.25, coll=coll,
                      front_board_slot=True)
    case.data.materials.append(mats["q_spine"])
    case.data.materials.append(mats["q_cover"])
    pb, y_sp, wp = build_pageblock("Quran_pages", T, D, H, 3.0, sq=2.6, spine_th=1.9, coll=coll)
    pb.data.materials.append(mats["gilt"])
    hb = build_headband("Quran_headband", y_sp, wp, H - 2.6 + 1.0, r=1.15, coll=coll)
    hb.data.materials.append(mats["q_hb"])
    qroot = bpy.data.objects.new("Quran", None)
    link(qroot, coll)
    for o in (case, pb, hb):
        o.parent = qroot
    # local axes -> rahle space: x -> -nA, y -> -X, z -> dA
    X = Vector((1, 0, 0))
    mrot = Matrix((
        (-nA.x, -X.x, dA.x),
        (-nA.y, -X.y, dA.y),
        (-nA.z, -X.z, dA.z))).to_4x4()
    origin = hinge + (t / 2 + tb / 2) * nA + a0 * dA + Vector((D * MM / 2, 0, 0))
    qroot.matrix_world = Matrix.Translation(origin) @ mrot
    qroot.parent = root
    return qroot, a0


# ============================================================ SCENE
RAHLE_POS = (-0.025, -0.420, 0.0)   # hinge position on the table
RAHLE_YAW = 36.0                    # degrees; front turned toward camera-right


def build():
    a = parse_args()
    ensure_textures()
    clear_scene()
    sc = bpy.context.scene
    sc.name = "Kulliyat"
    random.seed(7)
    coll = sc.collection

    # ---------------- materials
    mats = {}
    mats["paper"] = mat_paper_edge("PaperEdge")
    mats["gilt"] = mat_paper_edge("GiltEdge", gilt=True)
    mats["hb"] = mat_headband("Headband", "#F1E6D2", "#B9806F")
    mats["q_hb"] = mat_headband("QuranHeadband", "#F4EEDF", "#C9A15A")
    mats["q_cover"] = mat_leather("QuranCover", spine_img=None, base_hex="#E9E0CE", ivory=True,
                                  cover_img=load_img("quran_cover.png"))
    mats["q_spine"] = mat_leather("QuranSpine", spine_img=load_img("quran_spine.png"), base_hex="#E9E0CE",
                                  ivory=True)
    walnut_l, walnut_d = "#80553A", "#3B2316"
    mats["rahleA"] = mat_wood_img("RahleWalnutA", "wood_walnut.jpg", "wood_walnut_h.jpg", (0.40, 0.20), coord="UV",
                                  offset=(0.02, 0.0), rough=0.40, coat=0.0, carve_img=load_img("rahle_A.png"), bump=0.0)
    mats["rahleB"] = mat_wood_img("RahleWalnutB", "wood_walnut.jpg", "wood_walnut_h.jpg", (0.40, 0.20), coord="UV",
                                  offset=(0.05, 0.08), rough=0.40, coat=0.0, carve_img=load_img("rahle_B.png"), bump=0.0)
    mats["table"] = mat_wood_img("TableOak", "wood_table.jpg", "wood_table_h.jpg", (1.4, 1.6), coord="OBJECT",
                                 rough=0.13, coat=0.0, bump=0.0)
    mats["wall"] = mat_plaster("Plaster", "#F3ECE0")
    mats["wall_side"] = mat_plaster("PlasterSide", "#ECE3D4")
    mats["frame"] = mat_simple("WindowFrame", "#E9E2D6", 0.6)
    mats["brass"] = mat_brass("Brass")
    mats["room_dark"] = mat_simple("RoomFrontWall", "#7C6A5A", 0.8)   # bookcases / darker side of the room
    mats["floor"] = mat_simple("Floor", "#8E6E52", 0.6)

    # ---------------- books in a gentle arc, spines to camera
    books = []
    total = sum(T for _, T in spec.BOOKS) + 0.35 * (len(spec.BOOKS) - 1)
    R_row = 1.25
    row_cx, row_y = 0.012, 0.0
    cum = -total / 2
    for i, (title, T) in enumerate(spec.BOOKS):
        m = mat_leather("Leather_%02d" % i, spine_img=load_img("spine_%02d.png" % i))
        root = make_book(i, title, T, m, mats["paper"], mats["hb"], coll)
        xc = (cum + T / 2) * MM
        cum += T + 0.35
        ang = xc / R_row
        px = row_cx + R_row * math.sin(ang)
        py = row_y - R_row * (1 - math.cos(ang))
        rz = -ang
        jitter_r = random.uniform(-0.5, 0.5)
        jitter_y = random.uniform(-0.0012, 0.0012)
        if i == spec.HERO:
            # pulled forward ~4 cm, turned a touch toward the window light
            fwd = 0.048
            px -= fwd * math.sin(ang) * 0 + 0.0
            py -= fwd
            rz += math.radians(3.0)
            jitter_r = 0.0
        root.location = (px, py + jitter_y, 0.0)
        root.rotation_euler = (0.0, 0.0, rz + math.radians(jitter_r))
        books.append(root)

    # ---------------- bookends (brushed brass, simple L with arched top)
    def bookend(name, side, book_root, T):
        # plate standing against the outer board, foot under the book
        h, w, tt = 0.150, 0.120, 0.003
        verts, faces = [], []
        n = 16
        prof = [(0.0, 0.0)]
        for k in range(n + 1):
            aa = math.pi * k / n
            prof.append((w / 2 - (w / 2) * math.cos(aa), h - 0.03 + 0.03 * math.sin(aa)))
        prof.append((w, 0.0))
        cu = bpy.data.curves.new(name, "CURVE")
        cu.dimensions = "2D"
        cu.fill_mode = "BOTH"
        cu.extrude = tt / 2
        cu.bevel_depth = 0.0006
        sp = cu.splines.new("POLY")
        sp.points.add(len(prof) - 1)
        for k, (x, y) in enumerate(prof):
            sp.points[k].co = (x, y, 0, 1)
        sp.use_cyclic_u = True
        ob = bpy.data.objects.new(name, cu)
        link(ob, coll)
        ob.data.materials.append(mats["brass"])
        # orient: plate plane = book's YZ plane; profile x -> book local y, y -> z
        ob.parent = book_root
        ob.rotation_euler = (math.pi / 2, 0, math.pi / 2)
        ob.location = (side * (T / 2 * MM + tt / 2 + 0.0004), 0.012, 0.0)
        return ob
    # (brass bookends were tried; at this framing they read as stray slabs)

    # ---------------- rahle + Kur'an
    rahle, hinge, dA, dB, th = build_rahle(coll, mats["rahleA"], mats["rahleB"])
    quran, a0 = quran_on_rahle(coll, rahle, hinge, dA, dB, th, mats)
    rahle.location = RAHLE_POS
    rahle.rotation_euler = (0, 0, math.radians(RAHLE_YAW))
    print("[build] quran a0 = %.3f m" % a0)

    # ---------------- table, walls, window
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    table = bpy.context.object
    table.name = "Table"
    table.scale = (2.2, 1.45, 0.04)
    table.location = (0.0, -0.10, -0.02)
    bpy.ops.object.transform_apply(scale=True)
    bv = table.modifiers.new("bevel", "BEVEL")
    bv.width = 0.006
    bv.segments = 4
    table.data.materials.append(mats["table"])
    bpy.ops.object.shade_smooth()

    bpy.ops.mesh.primitive_plane_add(size=1.0)
    wall = bpy.context.object
    wall.name = "WallBack"
    wall.scale = (5.0, 3.0, 1)
    wall.rotation_euler = (math.pi / 2, 0, 0)
    wall.location = (0.0, 0.625, 1.0)
    wall.data.materials.append(mats["wall"])

    # left wall with a window opening (out of frame; shapes the daylight)
    WX = -0.95
    op_y0, op_y1, op_z0, op_z1 = -1.45, 0.05, 0.10, 1.75
    depth = 0.28

    def box(name, x0, x1, y0, y1, z0, z1, mat):
        bpy.ops.mesh.primitive_cube_add(size=1.0)
        o = bpy.context.object
        o.name = name
        o.scale = (x1 - x0, y1 - y0, z1 - z0)
        o.location = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
        o.data.materials.append(mat)
        return o
    box("LW_front", WX - depth, WX, -4.0, op_y0, -1.0, 3.0, mats["wall_side"])
    box("LW_back", WX - depth, WX, op_y1, 0.65, -1.0, 3.0, mats["wall_side"])
    box("LW_bottom", WX - depth, WX, op_y0, op_y1, -1.0, op_z0, mats["wall_side"])
    box("LW_top", WX - depth, WX, op_y0, op_y1, op_z1, 3.0, mats["wall_side"])
    # window mullions / transom (thin, painted wood)
    my = (op_y0 + op_y1) / 2
    box("Mullion", WX - depth * 0.6, WX - depth * 0.6 + 0.05, my - 0.025, my + 0.025, op_z0, op_z1, mats["frame"])
    box("Transom", WX - depth * 0.6, WX - depth * 0.6 + 0.05, op_y0, op_y1, 1.18, 1.23, mats["frame"])
    # ceiling (keeps world light from above realistic)
    box("Ceiling", WX, 1.65, -2.75, 0.65, 1.95, 2.05, mats["wall_side"])
    # the rest of the room (gives bounce light and something real to reflect)
    box("WallRight", 1.60, 1.70, -2.75, 0.65, -0.80, 2.0, mats["wall_side"])
    box("WallFront", WX, 1.70, -2.75, -2.65, -0.80, 2.0, mats["room_dark"])
    box("Floor", WX, 1.70, -2.75, 0.65, -0.82, -0.76, mats["floor"])

    # ---------------- lights
    # sun through the window
    sun_d = bpy.data.lights.new("Sun", "SUN")
    sun_d.energy = 18.0
    sun_d.angle = math.radians(3.5)
    sun_d.color = (1.0, 0.93, 0.85)
    sun = bpy.data.objects.new("Sun", sun_d)
    link(sun)
    direction = Vector((0.74, 0.42, -0.56)).normalized()   # light travel direction
    sun.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    # soft skylight filling the window opening
    sky_d = bpy.data.lights.new("WindowSky", "AREA")
    sky_d.shape = "RECTANGLE"
    sky_d.size = op_z1 - op_z0          # local X -> world Z after the rotation below
    sky_d.size_y = op_y1 - op_y0
    sky_d.energy = 62.0
    sky_d.color = (0.94, 0.96, 1.0)
    sky = bpy.data.objects.new("WindowSky", sky_d)
    link(sky)
    sky.location = (WX - 0.02, my, (op_z0 + op_z1) / 2)
    sky.rotation_euler = (0, -math.pi / 2, 0)   # emit along +X (into the room)
    # room bounce from the right/front (white wall behind camera)
    fill_d = bpy.data.lights.new("RoomFill", "AREA")
    fill_d.shape = "RECTANGLE"
    fill_d.size, fill_d.size_y = 2.0, 1.4
    fill_d.energy = 7.0
    fill_d.color = (1.0, 0.95, 0.88)
    fill = bpy.data.objects.new("RoomFill", fill_d)
    link(fill)
    fill.location = (1.1, -1.9, 0.85)
    fill.rotation_euler = (Vector((0.0, 0.0, 0.18)) - fill.location).to_track_quat("-Z", "Y").to_euler()
    fill_d.cycles.cast_shadow = True
    # world = soft warm ambient (rest of the room)
    world = bpy.data.worlds.new("Room")
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.86, 0.80, 0.72, 1.0)
    bg.inputs["Strength"].default_value = 0.07

    # ---------------- camera
    cam_d = bpy.data.cameras.new("Cam")
    cam_d.lens = 50.0
    cam_d.sensor_width = 36.0
    cam_d.sensor_fit = "AUTO"
    cam_d.clip_start = 0.05
    cam_d.clip_end = 20.0
    cam_d.dof.use_dof = True
    cam_d.dof.aperture_fstop = 2.8
    cam_d.dof.aperture_blades = 9
    cam_d.dof.aperture_rotation = math.radians(12)
    cam = bpy.data.objects.new("Camera", cam_d)
    link(cam)
    sc.camera = cam
    cam.rotation_mode = "XYZ"

    # focus target empty (rack focus Kur'an -> İman ve Küfür)
    foc = bpy.data.objects.new("FocusTarget", None)
    link(foc)
    cam_d.dof.focus_object = foc
    bpy.context.view_layer.update()
    hero = books[spec.HERO]
    T_h = spec.BOOKS[spec.HERO][1]
    hero_pt = hero.matrix_world @ Vector((0.0, -spec.sagitta(T_h) * MM, (spec.BOOK_H - 106.0) * MM))
    q_case = bpy.data.objects["Quran_case"]
    quran_pt = q_case.matrix_world @ Vector((-spec.QURAN_T / 2 * MM, spec.QURAN_D / 2 * MM, spec.QURAN_H * 0.5 * MM))

    animate_camera(sc, cam, foc, hero_pt, quran_pt)

    # ---------------- render settings
    setup_render(sc, a)
    setup_compositor(sc)

    if a["blend"]:
        os.makedirs(os.path.dirname(os.path.abspath(a["blend"])), exist_ok=True)
        bpy.ops.file.pack_all()          # self-contained .blend (textures embedded)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a["blend"]), compress=True)
        print("[build] saved", a["blend"])
    if a["render"]:
        render_frames(sc, a)


CAM = dict(
    tgt0=(0.030, -0.140, 0.100), tgt1=(0.030, -0.140, 0.100),
    dist0=1.48, dist1=1.36,          # metres to the look-at point
    pitch0=27.0, pitch1=26.0,        # degrees below horizontal
    yaw0=4.5, yaw1=1.5,              # degrees (positive = camera to the right)
    arc=1.0,                         # extra lateral bulge (deg) mid-move
    rise=0.008,                      # pedestal rise over the move (m)
    aim_dz0=0.0848, aim_dz1=0.0891,  # aim above the orbit target (book tops ~35% from the top)
)


def animate_camera(sc, cam, foc, hero_pt, quran_pt):
    """Slow dolly-in with a slight lateral arc, tiny pedestal rise and subtle
    hand-held micro drift. Keys on every frame (deterministic)."""
    sc.frame_start, sc.frame_end = F_START, F_END
    sc.render.fps = FPS
    # Camera = orbit around a look-at target: (distance, pitch-down, yaw) eased
    # from start to end; plus a lateral arc (yaw bulge) and a small pedestal rise.
    tgt0 = Vector(CAM["tgt0"])
    tgt1 = Vector(CAM["tgt1"])

    def orbit(tg, dist, pitch_deg, yaw_deg):
        p, y = math.radians(pitch_deg), math.radians(yaw_deg)
        return tg + dist * Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p)))
    rise = CAM["rise"]
    for f in range(F_START, F_END + 1):
        t = (f - F_START) / (F_END - F_START)
        e = smootherstep(t)
        tg = tgt0.lerp(tgt1, e)
        dist = CAM["dist0"] + (CAM["dist1"] - CAM["dist0"]) * e
        pitch = CAM["pitch0"] + (CAM["pitch1"] - CAM["pitch0"]) * e
        yaw = CAM["yaw0"] + (CAM["yaw1"] - CAM["yaw0"]) * e + CAM["arc"] * math.sin(math.pi * e)
        p = orbit(tg, dist, pitch, yaw) + Vector((0, 0, rise * e))
        # handheld micro-drift: low-frequency 1/f-ish noise (sub-degree)
        tt = f / FPS
        nx = noise.noise(Vector((tt * 0.35, 1.7, 3.1))) * 0.6 + noise.noise(Vector((tt * 0.9, 4.2, 0.3))) * 0.25
        ny = noise.noise(Vector((tt * 0.30, 8.1, 2.2))) * 0.6 + noise.noise(Vector((tt * 0.8, 1.1, 7.7))) * 0.25
        nr = noise.noise(Vector((tt * 0.25, 5.5, 9.9)))
        p_j = p + Vector((nx * 0.0012, 0.0, ny * 0.0010))
        aim_dz = CAM["aim_dz0"] + (CAM["aim_dz1"] - CAM["aim_dz0"]) * e
        d = (tg + Vector((0, 0, aim_dz)) - p_j).normalized()
        q = d.to_track_quat("-Z", "Y")
        eul = q.to_euler("XYZ")
        eul.x += math.radians(ny * 0.10)
        eul.z += math.radians(nx * 0.12)
        eul.y += math.radians(nr * 0.12)
        cam.location = p_j
        cam.rotation_euler = eul
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_euler", frame=f)
        # rack focus 40 -> 120
        rf = smootherstep((f - 40) / 80.0)
        foc.location = quran_pt.lerp(hero_pt, rf)
        foc.keyframe_insert("location", frame=f)
    for ob in (cam, foc):
        if ob.animation_data and ob.animation_data.action:
            for fc in ob.animation_data.action.fcurves:
                for kp in fc.keyframe_points:
                    kp.interpolation = "LINEAR"


def setup_render(sc, a):
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    sc.render.threads_mode = "FIXED"
    sc.render.threads = int(a.get("threads") or 3)
    sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
    sc.render.resolution_percentage = int(a.get("pct") or 100)
    sc.render.pixel_aspect_x = sc.render.pixel_aspect_y = 1
    cy.samples = 8
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.06
    cy.adaptive_min_samples = 4
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    cy.denoising_prefilter = "FAST"
    cy.denoising_quality = "BALANCED"
    cy.max_bounces = 3
    cy.diffuse_bounces = 2
    cy.glossy_bounces = 1
    cy.transmission_bounces = 0
    cy.volume_bounces = 0
    cy.transparent_max_bounces = 2
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.blur_glossy = 1.0
    cy.sample_clamp_indirect = 4.0
    cy.use_light_tree = True
    cy.light_sampling_threshold = 0.01
    cy.seed = 11
    cy.use_animated_seed = False      # stable residual noise -> less denoiser shimmer on a slow move
    sc.render.use_persistent_data = True
    sc.render.film_transparent = False
    sc.render.filter_size = 1.5
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.image_settings.color_depth = "8"
    vs = sc.view_settings
    vs.view_transform = "AgX"
    try:
        vs.look = "AgX - Medium High Contrast"
    except TypeError:
        try:
            vs.look = "Medium High Contrast"
        except TypeError:
            pass
    vs.exposure = -0.55
    print("[build] view", vs.view_transform, "look", vs.look)
    vs.gamma = 1.0
    sc.display_settings.display_device = "sRGB"
    sc.sequencer_colorspace_settings.name = "sRGB"
    sc.render.use_compositing = True
    sc.render.use_sequencer = False


def setup_compositor(sc):
    sc.use_nodes = True
    nt = sc.node_tree
    nt.nodes.clear()
    rl = nt.nodes.new("CompositorNodeRLayers")
    rl.location = (-600, 0)
    gl = nt.nodes.new("CompositorNodeGlare")
    gl.location = (-350, 0)
    gl.glare_type = "FOG_GLOW"
    gl.quality = "HIGH"
    gl.mix = -0.90
    gl.threshold = 1.4
    gl.size = 7
    ld = nt.nodes.new("CompositorNodeLensdist")
    ld.location = (-100, 0)
    ld.use_fit = True
    ld.inputs["Distortion"].default_value = -0.012
    ld.inputs["Dispersion"].default_value = 0.010
    vimg = nt.nodes.new("CompositorNodeImage")
    vimg.location = (-350, -300)
    vimg.image = bpy.data.images.load(os.path.join(TEX, "vignette.png"), check_existing=True)
    vimg.image.colorspace_settings.name = "Non-Color"
    mul = nt.nodes.new("CompositorNodeMixRGB")
    mul.location = (150, 0)
    mul.blend_type = "MULTIPLY"
    mul.inputs[0].default_value = 1.0
    comp = nt.nodes.new("CompositorNodeComposite")
    comp.location = (400, 0)
    nt.links.new(rl.outputs["Image"], gl.inputs["Image"])
    nt.links.new(gl.outputs["Image"], ld.inputs["Image"])
    nt.links.new(ld.outputs["Image"], mul.inputs[1])
    nt.links.new(vimg.outputs["Image"], mul.inputs[2])
    nt.links.new(mul.outputs["Image"], comp.inputs["Image"])


def render_frames(sc, a):
    outdir = a["outdir"] or os.path.join(os.path.dirname(os.path.abspath(a["blend"] or ".")), "previews")
    os.makedirs(outdir, exist_ok=True)
    if a["samples"]:
        sc.cycles.samples = int(a["samples"])
    for f in [int(x) for x in str(a["render"]).split(",") if x]:
        sc.frame_set(f)
        sc.render.filepath = os.path.join(outdir, "%s_f%03d.png" % (a["prefix"], f))
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        print("[render] frame %d -> %s  %.1fs" % (f, sc.render.filepath, time.time() - t0))


if __name__ == "__main__":
    build()
