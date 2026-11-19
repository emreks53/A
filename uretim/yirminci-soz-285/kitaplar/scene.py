#!/usr/bin/env python3
"""Risale-i Nur Kulliyati (14 vols) + Qur'an on rahle -- photoreal closing still (revision 2).

Build + render with Blender-as-a-module (bpy 5.3), Cycles CPU, 3 threads.
Usage:
  python3 scene.py --tex                                   # (re)generate PIL spine / cover textures
  python3 scene.py --pct 25 --spp 32 --out t.png           # quick test still
  python3 scene.py --pct 100 --spp 160 --noise 0.02 --out hero_raw.png --depth hero_depth.exr   # final (24 min, 3 threads)
  python3 scene.py --post hero_raw.png hero.png            # photographic finishing -> 8-bit sRGB
  python3 scene.py --measure hero.png                      # Sozler spine patch RGB
"""
import os, sys, math, time, argparse, random, json
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import textures as TX  # noqa: E402

ASSETS = os.path.join(HERE, "assets")
TEX = os.path.join(HERE, "tex")
MM = 0.001
RES = (1296, 2304)           # hero still (9:16), allows a slow push-in crop to 1080x1920

# ----------------------------------------------------------------------------- helpers


def srgb2lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def hexlin(h, *, mul=1.0):
    h = h.lstrip('#')
    rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    l = srgb2lin(rgb) * mul
    return (float(l[0]), float(l[1]), float(l[2]), 1.0)


def _bpy():
    import bpy, bmesh  # noqa
    from mathutils import Vector, Matrix, Euler  # noqa
    g = globals()
    g.update(bpy=bpy, bmesh=bmesh, Vector=Vector, Matrix=Matrix, Euler=Euler)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def new_obj(name, data, coll=None):
    ob = bpy.data.objects.new(name, data)
    (coll or bpy.context.scene.collection).objects.link(ob)
    return ob


def load_img(path, noncolor=True):
    img = bpy.data.images.load(path, check_existing=True)
    if noncolor:
        img.colorspace_settings.name = 'Non-Color'
    return img


class NT:
    """Tiny node-tree builder."""
    def __init__(self, mat):
        self.t = mat.node_tree
        self.t.nodes.clear()

    def n(self, typ, **kw):
        node = self.t.nodes.new(typ)
        for k, v in kw.items():
            if k.startswith('i_'):
                key = k[2:].replace('__', ' ')
                node.inputs[key].default_value = v
            else:
                setattr(node, k, v)
        return node

    def l(self, a, b):
        self.t.links.new(a, b)

    # small math helpers ------------------------------------------------------
    def math(self, op, a, b=None, c=None, clamp=False):
        m = self.n('ShaderNodeMath', operation=op, use_clamp=clamp)
        for k, v in enumerate((a, b, c)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                m.inputs[k].default_value = v
            else:
                self.l(v, m.inputs[k])
        return m.outputs[0]

    def remap(self, v, a, b, c, d, interp='LINEAR', clamp=True):
        m = self.n('ShaderNodeMapRange', interpolation_type=interp, clamp=clamp)
        m.inputs['From Min'].default_value = a
        m.inputs['From Max'].default_value = b
        m.inputs['To Min'].default_value = c
        m.inputs['To Max'].default_value = d
        self.l(v, m.inputs['Value'])
        return m.outputs['Result']

    def mix_rgb(self, blend, a, b, fac=1.0):
        m = self.n('ShaderNodeMix', data_type='RGBA', blend_type=blend)
        for sock, v in ((m.inputs[0], fac), (m.inputs[6], a), (m.inputs[7], b)):
            if isinstance(v, (int, float, tuple, list)):
                sock.default_value = tuple(v) if isinstance(v, (tuple, list)) else v
            else:
                self.l(v, sock)
        return m.outputs[2]

    def mix_f(self, fac, a, b):
        m = self.n('ShaderNodeMix', data_type='FLOAT')
        for sock, v in ((m.inputs[0], fac), (m.inputs[2], a), (m.inputs[3], b)):
            if isinstance(v, (int, float)):
                sock.default_value = v
            else:
                self.l(v, sock)
        return m.outputs[0]


def mat_new(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, NT(m)


# ----------------------------------------------------------------------------- materials

def leather_core(nt, tint, *, dims=None, rough=(0.40, 0.62), mask_img=None, height_img=None,
                 uvmap='UVMap', foil_col=(0.74, 0.58, 0.36, 1), wear=1.0, sheen=0.10, seed=0.0,
                 bump_dist=0.0009, grain_mm=1.25, grain_depth=0.00016, tool_dark=0.70):
    """Pebble-grain leather (Principled) with optional UV-mapped foil / tooling and geometric edge wear.

    dims = dict(t=, D=, H=, s=) of the book case in object space (x across thickness, y spine->fore-edge,
    z up) -- used for the cheap analytic edge/corner wear mask (no Bevel/AO ray tracing).
    """
    tc = nt.n('ShaderNodeTexCoord')
    obj = tc.outputs['Object']
    mp = nt.n('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / 0.45,) * 3
    mp.inputs['Location'].default_value = (seed * 0.37, seed * 0.61, seed * 0.13)
    nt.l(obj, mp.inputs['Vector'])

    def boximg(fname, noncolor=True):
        im = nt.n('ShaderNodeTexImage')
        im.image = load_img(os.path.join(ASSETS, fname), noncolor)
        im.projection = 'BOX'
        im.projection_blend = 0.25
        nt.l(mp.outputs['Vector'], im.inputs['Vector'])
        return im
    disp = boximg('leather_white_disp_2k.jpg')
    rgh = boximg('leather_white_rough_2k.jpg')

    # ---- pebble grain: distorted Voronoi cells (domed pebbles, narrow creases)
    so = nt.n('ShaderNodeVectorMath', operation='ADD')
    so.inputs[1].default_value = (seed * 0.013, seed * 0.029, seed * 0.007)
    nt.l(obj, so.inputs[0])
    dn = nt.n('ShaderNodeTexNoise', i_Scale=1 / (grain_mm * MM * 2.6), i_Detail=2.0, i_Roughness=0.5)
    nt.l(so.outputs[0], dn.inputs['Vector'])
    dsub = nt.n('ShaderNodeVectorMath', operation='SUBTRACT')
    dsub.inputs[1].default_value = (0.5, 0.5, 0.5)
    nt.l(dn.outputs['Color'], dsub.inputs[0])
    dsc = nt.n('ShaderNodeVectorMath', operation='SCALE')
    dsc.inputs['Scale'].default_value = grain_mm * MM * 0.9
    nt.l(dsub.outputs[0], dsc.inputs[0])
    dadd = nt.n('ShaderNodeVectorMath', operation='ADD')
    nt.l(so.outputs[0], dadd.inputs[0])
    nt.l(dsc.outputs[0], dadd.inputs[1])
    vor = nt.n('ShaderNodeTexVoronoi', voronoi_dimensions='3D', feature='DISTANCE_TO_EDGE',
               i_Scale=1 / (grain_mm * MM), i_Randomness=1.0)
    nt.l(dadd.outputs[0], vor.inputs['Vector'])
    edge = vor.outputs['Distance']
    pebble = nt.remap(edge, 0.0, 0.26, 0.0, 1.0, 'SMOOTHSTEP')
    crease = nt.remap(edge, 0.0, 0.07, 1.0, 0.0, 'SMOOTHSTEP')
    # second, finer & shallower grain octave so the creases are not a perfect net
    vor2 = nt.n('ShaderNodeTexVoronoi', voronoi_dimensions='3D', feature='DISTANCE_TO_EDGE',
                i_Scale=1 / (grain_mm * MM * 0.42), i_Randomness=1.0)
    nt.l(dadd.outputs[0], vor2.inputs['Vector'])
    peb2 = nt.remap(vor2.outputs['Distance'], 0.0, 0.3, 0.0, 1.0, 'SMOOTHSTEP')

    # ---- low-frequency dye mottling + micro tone variation
    nz = nt.n('ShaderNodeTexNoise', i_Scale=7.0, i_Detail=4.0, i_Roughness=0.55)
    nz.noise_dimensions = '4D'
    nz.inputs['W'].default_value = seed
    nt.l(obj, nz.inputs['Vector'])
    mot = nt.remap(nz.outputs['Fac'], 0.3, 0.7, 0.955, 1.035)
    nz3 = nt.n('ShaderNodeTexNoise', i_Scale=95.0, i_Detail=3.0, i_Roughness=0.6)
    nz3.noise_dimensions = '4D'
    nz3.inputs['W'].default_value = seed + 3.3
    nt.l(obj, nz3.inputs['Vector'])
    mic = nt.remap(nz3.outputs['Fac'], 0.3, 0.7, 0.975, 1.02)

    base = nt.mix_rgb('MULTIPLY', tuple(tint), mot)
    base = nt.mix_rgb('MULTIPLY', base, mic)
    # dye pools in the creases: a little darker and browner
    cd = nt.math('MULTIPLY', crease, 0.55)
    base = nt.mix_rgb('MULTIPLY', base, (0.86, 0.81, 0.77, 1.0), cd)
    # pebble tops very slightly lighter (polished)
    pt = nt.math('MULTIPLY', pebble, 0.35)
    base = nt.mix_rgb('MULTIPLY', base, (1.03, 1.03, 1.03, 1.0), pt)

    # ---- roughness: satin finish; creases matte, pebble tops & handled areas a touch glossier
    r_scan = nt.remap(rgh.outputs['Color'], 0.0, 1.0, rough[0], rough[1])
    r1 = nt.math('ADD', r_scan, nt.math('MULTIPLY', crease, 0.10))
    nz4 = nt.n('ShaderNodeTexNoise', i_Scale=11.0, i_Detail=3.0, i_Roughness=0.5)
    nz4.noise_dimensions = '4D'
    nz4.inputs['W'].default_value = seed + 7.7
    nt.l(obj, nz4.inputs['Vector'])
    r2 = nt.math('ADD', r1, nt.remap(nz4.outputs['Fac'], 0.35, 0.65, 0.05, -0.07))
    rough_out = r2

    # ---- analytic edge / corner wear (very light)
    wear_f = None
    if dims and wear > 0:
        t, D, H, s = dims['t'], dims['D'], dims['H'], dims['s']
        sep = nt.n('ShaderNodeSeparateXYZ')
        nt.l(obj, sep.inputs['Vector'])
        x, y, z = sep.outputs['X'], sep.outputs['Y'], sep.outputs['Z']
        dz = nt.math('MINIMUM', z, nt.math('SUBTRACT', H, z))
        dy = nt.math('SUBTRACT', D, y)
        dx = nt.math('SUBTRACT', t / 2, nt.math('ABSOLUTE', x))
        e_ht = nt.remap(dz, 0.0, 2.2 * MM, 1.0, 0.0, 'SMOOTHSTEP')
        e_fe = nt.remap(dy, 0.0, 1.8 * MM, 1.0, 0.0, 'SMOOTHSTEP')
        cxy = nt.n('ShaderNodeCombineXYZ')
        nt.l(dz, cxy.inputs['X'])
        nt.l(dy, cxy.inputs['Y'])
        cl = nt.n('ShaderNodeVectorMath', operation='LENGTH')
        nt.l(cxy.outputs[0], cl.inputs[0])
        e_co = nt.remap(cl.outputs['Value'], 0.0, 9.0 * MM, 1.0, 0.0, 'SMOOTHSTEP')
        near_spine = nt.remap(y, s + 3 * MM, s + 9 * MM, 1.0, 0.0, 'SMOOTHSTEP')
        e_sh = nt.math('MULTIPLY', nt.remap(dx, 0.0, 2.0 * MM, 1.0, 0.0, 'SMOOTHSTEP'), near_spine)
        # head/tail caps of the spine are the most handled part
        e_cap = nt.math('MULTIPLY', e_ht, nt.remap(y, s + 2 * MM, s + 14 * MM, 1.0, 0.35))
        w = nt.math('MAXIMUM', nt.math('MULTIPLY', e_cap, 0.85), nt.math('MULTIPLY', e_fe, 0.45))
        w = nt.math('MAXIMUM', w, e_co)
        w = nt.math('MAXIMUM', w, nt.math('MULTIPLY', e_sh, 0.55))
        bn = nt.n('ShaderNodeTexNoise', i_Scale=260.0, i_Detail=4.0, i_Roughness=0.65)
        bn.noise_dimensions = '4D'
        bn.inputs['W'].default_value = seed + 1.9
        nt.l(obj, bn.inputs['Vector'])
        brk = nt.remap(bn.outputs['Fac'], 0.38, 0.66, 0.15, 1.15)
        wear_f = nt.math('MULTIPLY', nt.math('MULTIPLY', w, brk), wear, clamp=True)
        # handled leather: a touch darker & browner, burnished (glossier); creases fill in
        base = nt.mix_rgb('MULTIPLY', base, (0.86, 0.80, 0.74, 1.0), nt.math('MULTIPLY', wear_f, 0.75))
        rough_out = nt.math('SUBTRACT', rough_out, nt.math('MULTIPLY', wear_f, 0.13))

    # ---- normals: soft undulation -> grain -> tooling
    und = nt.n('ShaderNodeTexNoise', i_Scale=22.0, i_Detail=3.0, i_Roughness=0.5)
    nt.l(obj, und.inputs['Vector'])
    b0 = nt.n('ShaderNodeBump', i_Strength=1.0, i_Distance=0.0005)
    nt.l(und.outputs['Fac'], b0.inputs['Height'])
    gh = nt.math('MULTIPLY_ADD', pebble, 0.75, nt.math('MULTIPLY', disp.outputs['Color'], 0.55))
    gh = nt.math('MULTIPLY_ADD', peb2, 0.22, gh)
    if wear_f is not None:   # worn edges are smoother (grain pressed flat)
        gh = nt.math('MULTIPLY', gh, nt.math('SUBTRACT', 1.0, nt.math('MULTIPLY', wear_f, 0.5)))
    b1 = nt.n('ShaderNodeBump', i_Strength=1.0, i_Distance=grain_depth)
    nt.l(gh, b1.inputs['Height'])
    nt.l(b0.outputs['Normal'], b1.inputs['Normal'])
    normal_out = b1.outputs['Normal']

    bsdf = nt.n('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Specular IOR Level'].default_value = CFG.get('leather_spec', 0.42)
    bsdf.inputs['Sheen Weight'].default_value = sheen
    bsdf.inputs['Sheen Roughness'].default_value = 0.5
    bsdf.inputs['Sheen Tint'].default_value = (1.0, 0.92, 0.86, 1)
    bsdf.inputs['Diffuse Roughness'].default_value = 0.35
    if mask_img is not None:
        uv = nt.n('ShaderNodeUVMap', uv_map=uvmap)
        mk = nt.n('ShaderNodeTexImage', extension='EXTEND', interpolation='Cubic')
        mk.image = load_img(mask_img)
        nt.l(uv.outputs['UV'], mk.inputs['Vector'])
        sep2 = nt.n('ShaderNodeSeparateColor')
        nt.l(mk.outputs['Color'], sep2.inputs['Color'])
        foil = sep2.outputs['Red']
        # leather scorched slightly by the hot tool around the foil
        dk = nt.remap(sep2.outputs['Green'], 0, 1, 1.0, tool_dark)
        base = nt.mix_rgb('MULTIPLY', base, dk)
        # ribs slightly darker and burnished
        base = nt.mix_rgb('MULTIPLY', base, nt.remap(sep2.outputs['Blue'], 0, 1, 1.0, 0.92))
        # foil colour with slight variation (worn foil shows a hint of leather where rubbed)
        fv = nt.mix_rgb('MULTIPLY', tuple(foil_col), nt.remap(nz.outputs['Fac'], 0.3, 0.7, 0.93, 1.05))
        fn2 = nt.n('ShaderNodeTexNoise', i_Scale=900.0, i_Detail=2.0)
        nt.l(obj, fn2.inputs['Vector'])
        rub = nt.remap(fn2.outputs['Fac'], 0.66, 0.76, 0.0, 0.22)
        foil_eff = nt.math('MULTIPLY', foil, nt.math('SUBTRACT', 1.0, rub))
        # hot-stamping irons the grain flat inside the impression: foil areas are smooth
        nt.l(nt.math('MULTIPLY', gh, nt.math('SUBTRACT', 1.0, nt.math('MULTIPLY', foil, 0.92))),
             b1.inputs['Height'])
        base = nt.mix_rgb('MIX', base, fv, foil_eff)
        frg = nt.math('MULTIPLY_ADD', rgh.outputs['Color'], 0.14, 0.24)
        rough_out = nt.mix_f(foil_eff, rough_out, frg)
        rough_out = nt.mix_f(sep2.outputs['Blue'], rough_out, rough[0] * 0.85)
        if height_img:
            hk = nt.n('ShaderNodeTexImage', extension='EXTEND', interpolation='Cubic')
            hk.image = load_img(height_img)
            nt.l(uv.outputs['UV'], hk.inputs['Vector'])
            b2 = nt.n('ShaderNodeBump', i_Strength=1.0, i_Distance=bump_dist)
            nt.l(hk.outputs['Color'], b2.inputs['Height'])
            nt.l(normal_out, b2.inputs['Normal'])
            normal_out = b2.outputs['Normal']
        nt.l(foil_eff, bsdf.inputs['Metallic'])
        bsdf.inputs['Specular Tint'].default_value = (1.0, 0.93, 0.80, 1)
    nt.l(base, bsdf.inputs['Base Color'])
    nt.l(rough_out, bsdf.inputs['Roughness'])
    nt.l(normal_out, bsdf.inputs['Normal'])
    out = nt.n('ShaderNodeOutputMaterial')
    nt.l(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return bsdf


def mat_leather_book(i, tint, dims):
    m, nt = mat_new(f"Leather_{i:02d}")
    leather_core(nt, tint, dims=dims, mask_img=os.path.join(TEX, f"spine_{i:02d}_mask.png"),
                 height_img=os.path.join(TEX, f"spine_{i:02d}_height.png"), seed=i * 1.7,
                 bump_dist=CFG['tool_bump'], foil_col=CFG['foil_col'], sheen=CFG['sheen'],
                 rough=CFG['leather_rough'], grain_mm=CFG['grain_mm'], grain_depth=CFG['grain_depth'],
                 wear=CFG['wear'])
    return m


def mat_quran_leather(dims):
    m, nt = mat_new("QuranLeather")
    leather_core(nt, tuple(np.array(hexlin(CFG['ivory'])) * np.array(list(CFG['ivory_comp']) + [1])),
                 dims=dims, rough=(0.38, 0.56), mask_img=os.path.join(TEX, "quran_cover_mask.png"),
                 height_img=os.path.join(TEX, "quran_cover_height.png"), foil_col=CFG['quran_gold'],
                 wear=0.6, sheen=0.12, seed=31.0, bump_dist=0.0007, grain_mm=1.0, grain_depth=0.00012,
                 tool_dark=0.80)
    return m


def mat_paper(name='Paper', col='#EFE6D3', gilt=False, comp=(1.0, 0.92, 0.80)):
    """Page block: cream paper edges with page/signature lines, per-volume tint variation (Object Info
    random) and slight unevenness of the trimmed top (signatures never sit perfectly flush)."""
    m, nt = mat_new(name)
    tc = nt.n('ShaderNodeTexCoord')
    oi = nt.n('ShaderNodeObjectInfo')
    sep = nt.n('ShaderNodeSeparateXYZ')
    nt.l(tc.outputs['Object'], sep.inputs['Vector'])
    nz = nt.n('ShaderNodeTexNoise', i_Scale=60.0, i_Detail=2.0)
    nt.l(tc.outputs['Object'], nz.inputs['Vector'])
    comb = nt.n('ShaderNodeCombineXYZ')
    mulx = nt.n('ShaderNodeMath', operation='MULTIPLY_ADD')
    mulx.inputs[1].default_value = 0.0015
    nt.l(nz.outputs['Fac'], mulx.inputs[0])
    nt.l(sep.outputs['X'], mulx.inputs[2])
    nt.l(mulx.outputs[0], comb.inputs['X'])
    nt.l(oi.outputs['Random'], comb.inputs['Y'])
    wave = nt.n('ShaderNodeTexWave', wave_type='BANDS', bands_direction='X', i_Scale=1.0,
                i_Distortion=0.0, i_Detail=0.0)
    mp = nt.n('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / 0.0011, 1, 1)
    nt.l(comb.outputs['Vector'], mp.inputs['Vector'])
    nt.l(mp.outputs['Vector'], wave.inputs['Vector'])
    nz2 = nt.n('ShaderNodeTexNoise', i_Scale=900.0, i_Detail=1.0)
    nt.l(mp.outputs['Vector'], nz2.inputs['Vector'])
    lines = nt.math('MULTIPLY', wave.outputs['Fac'], nz2.outputs['Fac'])
    vr = nt.remap(lines, 0.0, 0.7, 0.92, 1.02)
    if gilt:
        c0 = (0.74, 0.50, 0.20, 1)
    else:
        c0 = tuple(np.array(hexlin(col)) * np.array(list(comp) + [1]))
    colr = nt.mix_rgb('MULTIPLY', c0, vr)
    if not gilt:
        # per-volume cream variation (slightly different paper stock / age) and soft dusty mottling
        rv = nt.remap(oi.outputs['Random'], 0.0, 1.0, 0.0, 1.0)
        cvar = nt.n('ShaderNodeMix', data_type='RGBA', blend_type='MIX')
        nt.l(rv, cvar.inputs[0])
        cvar.inputs[6].default_value = (1.02, 1.0, 0.97, 1)
        cvar.inputs[7].default_value = (0.97, 0.955, 0.90, 1)
        colr = nt.mix_rgb('MULTIPLY', colr, cvar.outputs[2])
        dn = nt.n('ShaderNodeTexNoise', i_Scale=35.0, i_Detail=3.0)
        dn.noise_dimensions = '4D'
        nt.l(tc.outputs['Object'], dn.inputs['Vector'])
        nt.l(oi.outputs['Random'], dn.inputs['W'])
        colr = nt.mix_rgb('MULTIPLY', colr, nt.remap(dn.outputs['Fac'], 0.3, 0.7, 0.955, 1.02))
    bsdf = nt.n('ShaderNodeBsdfPrincipled')
    nt.l(colr, bsdf.inputs['Base Color'])
    b0 = nt.n('ShaderNodeBump', i_Strength=1.0, i_Distance=0.0004)
    un = nt.n('ShaderNodeTexNoise', i_Scale=1.0, i_Detail=1.0)   # signatures at slightly different heights
    unm = nt.n('ShaderNodeMapping')
    unm.inputs['Scale'].default_value = (1 / 0.006, 1 / 0.05, 1 / 0.05)
    nt.l(comb.outputs['Vector'], unm.inputs['Vector'])
    nt.l(unm.outputs['Vector'], un.inputs['Vector'])
    nt.l(un.outputs['Fac'], b0.inputs['Height'])
    bump = nt.n('ShaderNodeBump', i_Strength=0.6, i_Distance=0.00015)
    nt.l(lines, bump.inputs['Height'])
    nt.l(b0.outputs['Normal'], bump.inputs['Normal'])
    nt.l(bump.outputs['Normal'], bsdf.inputs['Normal'])
    if gilt:
        bsdf.inputs['Metallic'].default_value = 1.0
        bsdf.inputs['Roughness'].default_value = 0.38
        bsdf.inputs['Specular Tint'].default_value = (1.0, 0.85, 0.6, 1)
    else:
        bsdf.inputs['Roughness'].default_value = 0.84
        bsdf.inputs['Specular IOR Level'].default_value = 0.3
    out = nt.n('ShaderNodeOutputMaterial')
    nt.l(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return m


def mat_headband():
    m, nt = mat_new('Headband')
    tc = nt.n('ShaderNodeTexCoord')
    wave = nt.n('ShaderNodeTexWave', wave_type='BANDS', bands_direction='X', i_Scale=1.0)
    mp = nt.n('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / 0.0016, 1, 1)
    nt.l(tc.outputs['Object'], mp.inputs['Vector'])
    nt.l(mp.outputs['Vector'], wave.inputs['Vector'])
    st = nt.math('GREATER_THAN', wave.outputs['Fac'], 0.5)
    mix = nt.n('ShaderNodeMix', data_type='RGBA')
    nt.l(st, mix.inputs['Factor'])
    mix.inputs[6].default_value = hexlin('#E3D6BE')
    mix.inputs[7].default_value = hexlin('#8E5A44')
    bsdf = nt.n('ShaderNodeBsdfPrincipled', i_Roughness=0.7)
    bsdf.inputs['Sheen Weight'].default_value = 0.6
    nt.l(mix.outputs[2], bsdf.inputs['Base Color'])
    out = nt.n('ShaderNodeOutputMaterial')
    nt.l(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return m


def mat_walnut(name='Walnut', scale=0.9, value=0.42, coat=0.35, rot=0.0, loc=(0, 0, 0), sat=1.0,
               contrast_gamma=1.25):
    m, nt = mat_new(name)
    tc = nt.n('ShaderNodeTexCoord')
    mp = nt.n('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / scale, 1 / scale, 1 / scale)
    mp.inputs['Rotation'].default_value = (0, 0, rot)
    mp.inputs['Location'].default_value = loc
    nt.l(tc.outputs['Object'], mp.inputs['Vector'])

    def img(fn, noncolor):
        im = nt.n('ShaderNodeTexImage', projection='BOX', projection_blend=0.2)
        im.image = load_img(os.path.join(ASSETS, fn), noncolor)
        nt.l(mp.outputs['Vector'], im.inputs['Vector'])
        return im
    d = img('black_walnut_veneer_02_diff_2k.jpg', False)
    r = img('black_walnut_veneer_02_rough_2k.jpg', True)
    n = img('black_walnut_veneer_02_nor_gl_2k.jpg', True)
    gam = nt.n('ShaderNodeGamma', i_Gamma=contrast_gamma)
    nt.l(d.outputs['Color'], gam.inputs['Color'])
    hsv = nt.n('ShaderNodeHueSaturation', i_Hue=0.49, i_Saturation=sat, i_Value=value, i_Fac=1.0)
    nt.l(gam.outputs['Color'], hsv.inputs['Color'])
    nz = nt.n('ShaderNodeTexNoise', i_Scale=1.3, i_Detail=3.0)
    nt.l(tc.outputs['Object'], nz.inputs['Vector'])
    vr = nt.remap(nz.outputs['Fac'], 0.3, 0.7, 0.86, 1.10)
    colr = nt.mix_rgb('MULTIPLY', hsv.outputs['Color'], vr)
    bsdf = nt.n('ShaderNodeBsdfPrincipled')
    nt.l(colr, bsdf.inputs['Base Color'])
    rr = nt.remap(r.outputs['Color'], 0, 1, 0.30, 0.55)
    nz2 = nt.n('ShaderNodeTexNoise', i_Scale=7.0, i_Detail=6.0, i_Roughness=0.6)
    nt.l(tc.outputs['Object'], nz2.inputs['Vector'])
    sm = nt.remap(nz2.outputs['Fac'], 0.35, 0.75, 0.10, 0.32)
    nt.l(rr, bsdf.inputs['Roughness'])
    nm = nt.n('ShaderNodeNormalMap', i_Strength=0.5)
    nt.l(n.outputs['Color'], nm.inputs['Color'])
    nt.l(nm.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Coat Weight'].default_value = coat
    nt.l(sm, bsdf.inputs['Coat Roughness'])
    bsdf.inputs['Specular IOR Level'].default_value = 0.5
    out = nt.n('ShaderNodeOutputMaterial')
    nt.l(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return m


def mat_wall():
    m, nt = mat_new('Wall')
    tc = nt.n('ShaderNodeTexCoord')
    nz = nt.n('ShaderNodeTexNoise', i_Scale=3.0, i_Detail=6.0, i_Roughness=0.6)
    nt.l(tc.outputs['Object'], nz.inputs['Vector'])
    vr = nt.remap(nz.outputs['Fac'], 0.3, 0.7, 0.95, 1.035)
    colr = nt.mix_rgb('MULTIPLY', hexlin(CFG['wall_col']), vr)
    nz2 = nt.n('ShaderNodeTexNoise', i_Scale=250.0, i_Detail=4.0)
    nt.l(tc.outputs['Object'], nz2.inputs['Vector'])
    b = nt.n('ShaderNodeBump', i_Strength=0.25, i_Distance=0.0005)
    nt.l(nz2.outputs['Fac'], b.inputs['Height'])
    bsdf = nt.n('ShaderNodeBsdfPrincipled', i_Roughness=0.9)
    bsdf.inputs['Specular IOR Level'].default_value = 0.2
    nt.l(colr, bsdf.inputs['Base Color'])
    nt.l(b.outputs['Normal'], bsdf.inputs['Normal'])
    out = nt.n('ShaderNodeOutputMaterial')
    nt.l(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return m


def mat_curtain(strength=3.0):
    m, nt = mat_new('Curtain')
    tc = nt.n('ShaderNodeTexCoord')
    wave = nt.n('ShaderNodeTexWave', wave_type='BANDS', bands_direction='X', i_Scale=1.0, i_Distortion=2.0,
                i_Detail=1.0)
    mp = nt.n('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / 0.11, 1 / 0.6, 1)
    nt.l(tc.outputs['Object'], mp.inputs['Vector'])
    nt.l(mp.outputs['Vector'], wave.inputs['Vector'])
    vr = nt.remap(wave.outputs['Fac'], 0, 1, 0.55, 1.0)
    em = nt.n('ShaderNodeEmission')
    em.inputs['Color'].default_value = (1.0, 0.91, 0.78, 1)
    nt.l(nt.math('MULTIPLY', vr, strength), em.inputs['Strength'])
    out = nt.n('ShaderNodeOutputMaterial')
    nt.l(em.outputs['Emission'], out.inputs['Surface'])
    m.cycles.emission_sampling = 'NONE'
    return m


def mat_depth():
    """Material override for the depth render: emits camera-space Z depth (metres)."""
    m, nt = mat_new('DepthOverride')
    cd = nt.n('ShaderNodeCameraData')
    em = nt.n('ShaderNodeEmission', i_Strength=1.0)
    comb = nt.n('ShaderNodeCombineColor')
    for k in range(3):
        nt.l(cd.outputs['View Z Depth'], comb.inputs[k])
    nt.l(comb.outputs['Color'], em.inputs['Color'])
    out = nt.n('ShaderNodeOutputMaterial')
    nt.l(em.outputs['Emission'], out.inputs['Surface'])
    return m


# ----------------------------------------------------------------------------- geometry

def book_profile(t, D, s, b=0.0028, groove=True):
    """Closed C-shaped cross-section of the case (boards + rounded spine), in metres.
    Returns list of (x, y, u, kind) ; u = UV across spine arc (0..1) for kind 'spine'."""
    R = (t * t / 4 + s * s) / (2 * s)
    half = math.asin((t / 2) / R)
    yj, w, dg = s + 0.0062, 0.0036, 0.0010
    pts = []

    def side(sign, forward):
        # outer side of a board from fore-edge to spine (forward=True) or reverse
        seq = [(sign * t / 2, D)]
        if groove:
            seq.append((sign * t / 2, yj + w / 2))
            n = 7
            for k in range(1, n):
                a = math.pi * k / n
                seq.append((sign * (t / 2 - dg * math.sin(a)), yj + w / 2 * math.cos(a)))
            seq.append((sign * t / 2, yj - w / 2))
        seq.append((sign * t / 2, s + 0.0006))
        return seq if forward else seq[::-1]

    # front board (+x) outer: fore-edge -> spine
    for x, y in side(+1, True):
        pts.append((x, y, None, 'out'))
    # spine arc from +x to -x  (u goes 1 -> 0)
    N = 28
    for k in range(N + 1):
        a = half - 2 * half * k / N
        x = R * math.sin(a)
        y = R - R * math.cos(a)
        pts.append((x, y, 1.0 - k / N, 'spine'))
    # back board (-x) outer: spine -> fore-edge
    for x, y in side(-1, False):
        pts.append((x, y, None, 'out'))
    # back board fore-edge, inner face
    xi = t / 2 - b
    pts.append((-xi, D, None, 'in'))
    # inner face down to inner spine arc
    Ri = R - 0.0016
    yi = R - math.sqrt(max(Ri * Ri - xi * xi, 1e-9))
    pts.append((-xi, yi + 0.0004, None, 'in'))
    M = 18
    ai = math.asin(xi / Ri)
    for k in range(M + 1):
        a = -ai + 2 * ai * k / M
        pts.append((Ri * math.sin(a), R - Ri * math.cos(a), None, 'in'))
    pts.append((xi, yi + 0.0004, None, 'in'))
    pts.append((xi, D, None, 'in'))
    return pts, dict(R=R, Ri=Ri, xi=xi, yi=yi)


def extrude_profile(name, pts, z0, z1, uv_fn=None, bevel=0.0008, bevel_angle=30, mat_slots=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    n = len(pts)
    vb = [bm.verts.new((p[0], p[1], z0)) for p in pts]
    vt = [bm.verts.new((p[0], p[1], z1)) for p in pts]
    faces = []
    for i in range(n):
        j = (i + 1) % n
        f = bm.faces.new((vb[i], vb[j], vt[j], vt[i]))
        faces.append((f, i, j))
    ftop = bm.faces.new(vt)
    fbot = bm.faces.new(vb[::-1])
    bm.normal_update()
    # ensure outward normals
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for f, i, j in faces:
        for lp in f.loops:
            k = i if lp.vert in (vb[i], vt[i]) else j
            z = lp.vert.co.z
            lp[uvl].uv = uv_fn(pts, k, z, f) if uv_fn else (-0.5, 0.5)
    for f in (ftop, fbot):
        for lp in f.loops:
            lp[uvl].uv = (-0.5, 0.5)
    if bevel > 0:
        edges = [e for e in bm.edges if e.is_manifold and len(e.link_faces) == 2 and
                 e.calc_face_angle(0) > math.radians(bevel_angle)]
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=2, profile=0.5, affect='EDGES',
                        clamp_overlap=True)
    bm.to_mesh(me)
    bm.free()
    me.shade_smooth()
    me.set_sharp_from_angle(angle=math.radians(48))
    return me


def make_book(i, title, t_mm, tint, mats, coll, D=0.170, H=0.240):
    t = t_mm * MM
    s = min(max(0.11 * t_mm, 2.2), 5.2) * MM
    pts, info = book_profile(t, D, s)

    def uvf(P, k, z, f):
        u = P[k][2]
        if u is None:
            return (-0.5, 0.5)
        return (u, z / H)
    me = extrude_profile(f"Case_{i:02d}", pts, 0.0, H, uvf)
    me.materials.append(mats['leather'][i])
    case = new_obj(f"Book_{i:02d}_{title}", me, coll)
    # page block
    xi, Ri, R = info['xi'] - 0.0003, info['Ri'] - 0.0004, info['R']
    sq = 0.003
    pb = []
    M = 18
    ai = math.asin(xi / Ri)
    for k in range(M + 1):
        a = ai - 2 * ai * k / M
        pb.append((Ri * math.sin(a), R - Ri * math.cos(a), None, 'p'))
    yb = R - math.sqrt(Ri * Ri - xi * xi)
    # left side to fore-edge (concave fore-edge)
    pb.append((-xi, D - sq, None, 'p'))
    K = 12
    for k in range(1, K):
        x = -xi + 2 * xi * k / K
        sag = s * 0.7 * (1 - (x / xi) ** 2)
        pb.append((x, D - sq - sag, None, 'p'))
    pb.append((xi, D - sq, None, 'p'))
    me2 = extrude_profile(f"Pages_{i:02d}", pb, sq, H - sq, None, bevel=0.0004, bevel_angle=40)
    me2.materials.append(mats['paper'])
    pages = new_obj(f"Pages_{i:02d}", me2, coll)
    pages.parent = case
    # headband (top and bottom) -- curve tube along inner spine arc
    for zz, nm in ((H - sq + 0.0003, 'HB_t'), (sq - 0.0003, 'HB_b')):
        cu = bpy.data.curves.new(f"{nm}_{i:02d}", 'CURVE')
        cu.dimensions = '3D'
        cu.bevel_depth = 0.0011
        cu.bevel_resolution = 3
        sp = cu.splines.new('POLY')
        Rk = Ri - 0.0011
        ak = math.asin((xi - 0.001) / Rk)
        sp.points.add(12)
        for k in range(13):
            a = -ak + 2 * ak * k / 12
            sp.points[k].co = (Rk * math.sin(a), R - Rk * math.cos(a), zz, 1)
        hb = new_obj(f"{nm}_{i:02d}", cu, coll)
        hb.data.materials.append(mats['headband'])
        hb.parent = case
    return case, dict(t=t, s=s, R=R)


def make_quran(mats, coll, Hq=0.250, Wq=0.175, Tq=0.055):
    s = 4.6 * MM
    pts, info = book_profile(Tq, Wq, s, b=0.0032)
    face_w = Wq - (s + 0.0062 + 0.0036)

    def uvf(P, k, z, f):
        x, y, u, kind = P[k]
        if kind == 'out' and x < 0 and abs(x + Tq / 2) < 1e-6:
            # -X board outer face (front cover for a right-spined book)
            return ((Wq - y) / face_w * 0.985 + 0.0, z / Hq)
        return (-0.5, -0.5)
    me = extrude_profile("QuranCase", pts, 0.0, Hq, uvf, bevel=0.0009)
    me.materials.append(mats['quran'])
    case = new_obj("Quran", me, coll)
    xi, Ri, R = info['xi'] - 0.0003, info['Ri'] - 0.0004, info['R']
    sq = 0.003
    pb = []
    M = 18
    ai = math.asin(xi / Ri)
    for k in range(M + 1):
        a = ai - 2 * ai * k / M
        pb.append((Ri * math.sin(a), R - Ri * math.cos(a), None, 'p'))
    pb.append((-xi, Wq - sq, None, 'p'))
    K = 12
    for k in range(1, K):
        x = -xi + 2 * xi * k / K
        pb.append((x, Wq - sq - s * 0.7 * (1 - (x / xi) ** 2), None, 'p'))
    pb.append((xi, Wq - sq, None, 'p'))
    me2 = extrude_profile("QuranPages", pb, sq, Hq - sq, None, bevel=0.0004, bevel_angle=40)
    me2.materials.append(mats['gilt'])
    pages = new_obj("QuranPages", me2, coll)
    pages.parent = case
    return case


def board_outline(L, W, Lc, band, kind, notch_w):
    """2D outline (u along length, v across width) for a rahle board.
    kind 'A' keeps strips 1,3 at hinge band (edge notches + centre hole), 'B' keeps 0,2,4 (2 holes)."""
    hw = W / 2
    sw = W / 5
    clr = 0.0006
    outer = []
    # foot with arched cut between two feet
    foot = 0.20 * W
    arch_h = 0.11 * L
    outer.append((0.0, -hw))
    outer.append((0.0, -hw + foot))
    n = 14
    for k in range(1, n):
        a = math.pi * k / n
        v = -hw + foot + (W - 2 * foot) * (1 - math.cos(a)) / 2
        u = arch_h * math.sin(a) ** 0.8
        outer.append((u, v))
    outer.append((0.0, hw - foot))
    outer.append((0.0, hw))
    # right side up
    if kind == 'A':
        outer += [(Lc - band, hw), (Lc - band, hw - sw - clr), (Lc + band, hw - sw - clr), (Lc + band, hw)]
    # top: pointed ogee ("onion") finial
    Hh = 0.48 * W
    top0 = L - Hh
    outer.append((top0, hw))
    n = 24
    prof = []
    for k in range(1, n + 1):
        tt = k / n
        v = hw * (1 - tt) * (1 + 0.22 * math.sin(math.pi * tt))      # bulge then taper
        u = top0 + Hh * (tt ** 1.6)
        prof.append((u, v))
    prof[-1] = (L, 0.0)
    outer += prof
    outer += [(u, -v) for (u, v) in reversed(prof[:-1])]
    outer.append((top0, -hw))
    if kind == 'A':
        outer += [(Lc + band, -hw), (Lc + band, -hw + sw + clr), (Lc - band, -hw + sw + clr), (Lc - band, -hw)]
    holes = []
    if kind == 'A':
        holes.append([(Lc - band, -sw / 2 - clr), (Lc + band, -sw / 2 - clr), (Lc + band, sw / 2 + clr),
                      (Lc - band, sw / 2 + clr)])
    else:
        for c in (-sw, sw):
            holes.append([(Lc - band, c - sw / 2 - clr), (Lc + band, c - sw / 2 - clr),
                          (Lc + band, c + sw / 2 + clr), (Lc - band, c + sw / 2 + clr)])
    # openwork in the lower leg: pointed arch window + small rosette
    u0, u1 = 0.20 * Lc + arch_h, Lc - band - 0.025
    if u1 - u0 > 0.04:
        ww = 0.16 * W
        win = []
        nn = 16
        for k in range(nn + 1):
            a = math.pi * k / nn
            win.append((u0 + (u1 - u0 - ww) * 0 + 0, 0))
        win = []
        um = u1 - ww * 1.2
        win.append((u0, -ww))
        win.append((um, -ww))
        for k in range(1, nn):
            a = (math.pi) * k / nn
            win.append((um + 1.2 * ww * math.sin(a) ** 1.3 * (1 if a < math.pi / 2 else 1), -ww * math.cos(a)))
        win.append((um, ww))
        win.append((u0, ww))
        holes.append(win)
    # upper arm: pointed-arch window + small round piercing
    ua0, ua1 = Lc + band + 0.022, L - Hh - 0.004
    if ua1 - ua0 > 0.03:
        ww = 0.13 * W
        um = ua1 - ww * 1.3
        win = [(ua0, -ww), (um, -ww)]
        nn = 16
        for k in range(1, nn):
            a = math.pi * k / nn
            win.append((um + 1.3 * ww * math.sin(a) ** 1.3, -ww * math.cos(a)))
        win += [(um, ww), (ua0, ww)]
        holes.append(win)
    cr = 0.045 * W
    cu_ = L - Hh * 0.45
    holes.append([(cu_ + cr * math.cos(2 * math.pi * k / 20), cr * math.sin(2 * math.pi * k / 20)) for k in range(20)])
    return outer, holes


def make_rahle(mats, coll, alpha=math.radians(34), L_low=0.225, L_up=0.112, W=0.15, T=0.017):
    L = L_low + L_up
    band = 1.25 * T
    root = bpy.data.objects.new("Rahle", None)
    coll.objects.link(root)
    boards = {}
    for kind in ('A', 'B'):
        outer, holes = board_outline(L, W, L_low, band, kind, W / 5)
        cu = bpy.data.curves.new(f"Rahle{kind}", 'CURVE')
        cu.dimensions = '2D'
        cu.fill_mode = 'BOTH'
        cu.extrude = T / 2 - 0.0012
        cu.bevel_depth = 0.0012
        cu.bevel_resolution = 2
        cu.offset = -0.0012 / 2
        for poly in [outer] + holes:
            sp = cu.splines.new('POLY')
            sp.points.add(len(poly) - 1)
            for k, (u, v) in enumerate(poly):
                sp.points[k].co = (u, v, 0, 1)
            sp.use_cyclic_u = True
        ob = new_obj(f"Rahle_{kind}", cu, coll)
        ob.data.materials.append(mats['rahle'])
        sgn = 1 if kind == 'A' else -1
        a = Vector((0, sgn * math.sin(alpha), math.cos(alpha)))   # long axis (foot -> top)
        w = Vector((1, 0, 0))
        nrm = a.cross(w)
        Mrot = Matrix((a, w, nrm)).transposed()  # columns
        # hinge at (0,0,hc): foot = hinge - a*L_low ; place later so min z = 0
        ob.matrix_world = Matrix.Translation(-a * L_low) @ Mrot.to_4x4()
        ob.parent = root
        boards[kind] = ob
    # lowest point: foot end, edge offset by thickness
    zmin = 1e9
    for kind, ob in boards.items():
        sgn = 1 if kind == 'A' else -1
        a = Vector((0, sgn * math.sin(alpha), math.cos(alpha)))
        nrm = a.cross(Vector((1, 0, 0)))
        foot = -a * L_low
        for o in (T / 2, -T / 2):
            zmin = min(zmin, (foot + nrm * o).z)
    hc = -zmin
    for ob in boards.values():
        ob.matrix_world = Matrix.Translation((0, 0, hc)) @ ob.matrix_world
    return root, dict(alpha=alpha, hc=hc, T=T, L_up=L_up)



# ----------------------------------------------------------------------------- configuration
# Everything that was tuned lives here (override any key from the CLI with --set key=value).
CFG = dict(
    # leather: linear albedo, calibrated through AgX (look None) on the lit Sozler spine so that the FINAL
    # finished hero.png reads ~ (210,168,150) there.  See NOTES.md for the calibration log.
    leather_albedo=(0.5637, 0.2627, 0.1669),
    leather_rough=(0.33, 0.55),
    sheen=0.08,
    grain_mm=1.70,
    grain_depth=0.00040,
    tool_bump=0.0012,
    wear=1.0,
    row_chroma=(0.90, 0.84), row_value=1.04,
    foil_col=(0.78, 0.56, 0.27, 1),       # pale champagne gold (linear)
    quran_gold=(0.62, 0.40, 0.14, 1),
    ivory='#EFE7D6', ivory_comp=(1.0, 0.95, 0.86),
    paper='#F2E8D2', paper_comp=(1.0, 0.92, 0.76),
    wall_col='#EADBC2',
    rahle_value=0.30, desk_value=0.30,
    # lights
    target=(0.02, 0.14, 0.12),
    key_phi=62.0, key_elev=12.0, key_dist=2.0, key_w=1.0, key_h=1.1, key_power=285.0,
    key_col=(1.0, 0.95, 0.88),
    front_phi=14.0, front_elev=26.0, front_dist=2.7, front_w=2.2, front_h=1.4, front_power=20.0,
    fill_phi=-35.0, fill_elev=12.0, fill_dist=1.6, fill_w=1.6, fill_h=1.0, fill_power=190.0,
    rim_power=100.0, wall_power=300.0,
    hdri_strength=0.12, hdri_rot=120.0, curtain=2.5,
    # colour management
    look_agx='None', exposure=-1.85,
    # camera (single still)
    look=(0.06, 0.30, 0.10), dist=1.86, elev=18.0, az=-5.0, lens=56.0, fstop=3.2,
    # layout
    row_origin=(-0.05, 0.0, 0.0), rahle_loc=(-0.09, 0.42, 0.0), rahle_yaw=-42.0, wall_y=1.55,
    k=(0.6, 1.4), yaw=(9.0, -9.0),
)


# ----------------------------------------------------------------------------- layout

def tint_for(i):
    rng = random.Random(500 + i)
    base = np.array(CFG['leather_albedo'])
    # small per-volume variation in value and warmth (dye lots), hue kept within ~1 degree
    v = 1.0 + rng.uniform(-0.035, 0.03)
    warm = rng.uniform(-0.012, 0.012)
    c = base * v * np.array([1.0 + warm * 0.3, 1.0, 1.0 - warm])
    if i > 0:
        # the volumes behind Sozler sit in the window shade; their dye lot is a touch paler so that in
        # shade they still read as the same very light leather (luminance-preserving, hue kept)
        lum = float(c @ np.array([0.2126, 0.7152, 0.0722]))
        f = i / (len(TX.BOOKS) - 1)
        ch = CFG['row_chroma'][0] + (CFG['row_chroma'][1] - CFG['row_chroma'][0]) * f
        c = (lum + ch * (c - lum)) * CFG['row_value']
    return (float(c[0]), float(c[1]), float(c[2]), 1.0)


def layout_books(cases, infos, D=0.170):
    """Echelon row on a gentle curve; returns positions (spine apex, base) and yaw."""
    n = len(cases)
    rng = random.Random(42)
    yaw0, yaw1 = math.radians(CFG['yaw'][0]), math.radians(CFG['yaw'][1])
    placed = []
    for i in range(n):
        f = i / (n - 1)
        yaw = yaw0 + (yaw1 - yaw0) * f + math.radians(rng.uniform(-0.8, 0.8))
        if i == 0:
            p = Vector((0, 0, 0))
        else:
            pyaw, pp, pt = placed[-1]
            t0, t1 = infos[i - 1]['t'], infos[i]['t']
            k = CFG['k'][0] + CFG['k'][1] * f
            step_back = k * (t0 + t1) / 2 + rng.uniform(-0.002, 0.002)
            Rp = Matrix.Rotation(pyaw, 3, 'Z')
            p = pp + Rp @ Vector(((t0 + t1) / 2 + 0.0004, step_back, 0))
            for _ in range(30):
                Rn = Matrix.Rotation(yaw, 3, 'Z')
                ok = True
                for yy in np.linspace(infos[i]['s'], D, 9):
                    q = p + Rn @ Vector((-t1 / 2, yy, 0))
                    loc = Rp.transposed() @ (q - pp)
                    if 0 <= loc.y <= D and loc.x < t0 / 2 + 0.0003:
                        ok = False
                        break
                if ok:
                    break
                p = p + Rp @ Vector((0.0005, 0, 0))
        placed.append((yaw, p, infos[i]['t']))
    # real-world imperfections: volumes differ in height by up to ~1 mm (z scale of case + children),
    # two volumes lean ~0.5 deg (one back, the last one sideways onto nothing)
    hr = random.Random(7)
    dh = [hr.uniform(-1.0, 1.0) * MM for _ in range(n)]
    dh[0] = 0.25 * MM
    lean = {8: (-0.5, 0.0), 13: (0.0, 0.55), 4: (0.3, 0.0)}
    for i, ((yaw, p, t), ob) in enumerate(zip(placed, cases)):
        ob.location = p
        lx, ly = lean.get(i, (0.0, 0.0))
        ob.rotation_euler = (math.radians(lx), math.radians(ly), yaw)
        ob.scale = (1.0, 1.0, 1.0 + dh[i] / 0.240)
    return placed


def clean_rows(i, u0=0.32, u1=0.68):
    """Largest run of spine heights (mm from base) where the centre of the spine has no tooling."""
    from PIL import Image
    m = np.asarray(Image.open(os.path.join(TEX, f"spine_{i:02d}_mask.png"))).astype(float)
    Hp, Wp = m.shape[:2]
    band = m[:, int(u0 * Wp):int(u1 * Wp)].max(axis=(1, 2))
    clean = band < 2
    best, cur, start = (0, 0, 0), 0, 0
    for r, c in enumerate(clean):
        if c:
            if cur == 0:
                start = r
            cur += 1
            if cur > best[0]:
                best = (cur, start, r)
        else:
            cur = 0
    _, r0, r1 = best
    ppmm = Hp / TX.SPINE_H
    # rows from top -> z from base; keep 4 mm away from tooling
    ztop = TX.SPINE_H - r0 / ppmm - 4
    zbot = TX.SPINE_H - r1 / ppmm + 4
    return zbot, ztop


# ----------------------------------------------------------------------------- scene

def place_area(name, coll, target, phi, elev, dist, w, h, power, col, spread=180):
    """Area light at azimuth phi (deg, measured from the camera axis toward camera-left), elevation elev."""
    p, e = math.radians(phi), math.radians(elev)
    tgt = Vector(target)
    pos = tgt + dist * Vector((-math.sin(p) * math.cos(e), -math.cos(p) * math.cos(e), math.sin(e)))
    ld = bpy.data.lights.new(name, 'AREA')
    ld.shape = 'RECTANGLE'
    ld.size, ld.size_y = w, h
    ld.energy = power
    ld.color = col
    ld.spread = math.radians(spread)
    ob = new_obj(name, ld, coll)
    ob.location = pos
    ob.rotation_euler = (tgt - pos).to_track_quat('-Z', 'Y').to_euler()
    ob.visible_camera = False
    return ob


def build(cfg):
    clear_scene()
    scn = bpy.context.scene
    coll = scn.collection
    D, H = 0.170, 0.240
    dims = []
    for (title, t_mm) in TX.BOOKS:
        s = min(max(0.11 * t_mm, 2.2), 5.2) * MM
        dims.append(dict(t=t_mm * MM, D=D, H=H, s=s))
    mats = {
        'leather': [mat_leather_book(i, tint_for(i), dims[i]) for i in range(len(TX.BOOKS))],
        'paper': mat_paper(col=CFG['paper'], comp=CFG['paper_comp']),
        'headband': mat_headband(),
        'quran': mat_quran_leather(dict(t=0.055, D=0.175, H=0.250, s=4.6 * MM)),
        'gilt': mat_paper('Gilt', gilt=True),
        'rahle': mat_walnut('RahleWalnut', scale=0.35, value=CFG['rahle_value'], coat=0.12, rot=0.0,
                            loc=(0.3, 0.1, 0), sat=1.05),
        'desk': mat_walnut('DeskWalnut', scale=0.95, value=CFG['desk_value'], coat=0.4, rot=0.0, sat=0.95),
        'wall': mat_wall(),
        'curtain': mat_curtain(cfg['curtain']),
    }
    cases, infos = [], []
    for i, (title, t) in enumerate(TX.BOOKS):
        ob, inf = make_book(i, title, t, None, mats, coll)
        cases.append(ob)
        infos.append(inf)
    placed = layout_books(cases, infos)
    X0 = Vector(cfg['row_origin'])
    for ob in cases:
        ob.location = ob.location + X0

    # rahle + Qur'an (unchanged construction)
    rahle, rinfo = make_rahle(mats, coll)
    q = make_quran(mats, coll)
    al, T = rinfo['alpha'], rinfo['T']
    a = Vector((0, math.sin(al), math.cos(al)))
    m = Vector((0, -math.cos(al), math.sin(al)))
    Tq = 0.055
    q1 = T / 2 + Tq
    s0 = (T / 2 + q1 * math.cos(2 * al)) / math.sin(2 * al) + 0.0004
    hinge = Vector((0, 0, rinfo['hc']))
    Mq = Matrix((-m, Vector((-1, 0, 0)), a)).transposed().to_4x4()
    Wq = 0.175
    origin = hinge + m * (T / 2 + Tq / 2) + a * s0 + Vector((Wq / 2 - 0.0035, 0, 0))
    q.matrix_world = Matrix.Translation(origin) @ Mq
    qroot = bpy.data.objects.new("QuranRig", None)
    coll.objects.link(qroot)
    rahle.parent = qroot
    q.parent = qroot
    qroot.location = Vector(cfg['rahle_loc'])
    qroot.rotation_euler = (0, 0, math.radians(cfg['rahle_yaw']))

    # desk, back wall, window wall
    bpy.ops.mesh.primitive_plane_add(size=1)
    desk = bpy.context.active_object
    desk.name = 'Desk'
    desk.scale = (2.4, 2.2, 1)
    desk.location = (0.1, 0.5, 0)
    desk.data.materials.append(mats['desk'])
    yw = cfg['wall_y']
    bpy.ops.mesh.primitive_plane_add(size=1)
    wall = bpy.context.active_object
    wall.name = 'Wall'
    wall.scale = (4, 3, 1)
    wall.rotation_euler = (math.radians(90), 0, 0)
    wall.location = (0, yw, 1.0)
    wall.data.materials.append(mats['wall'])
    bpy.ops.mesh.primitive_plane_add(size=1)
    lw = bpy.context.active_object
    lw.name = 'LeftWall'
    lw.scale = (4, 3, 1)
    lw.rotation_euler = (0, math.radians(90), 0)
    lw.location = (-2.4, 0.0, 1.0)
    lw.data.materials.append(mats['wall'])
    lw.visible_camera = False

    # sheer curtain glow at back-left (camera + glossy only, not a light source)
    me = bpy.data.meshes.new('Curtain')
    bm = bmesh.new()
    nx, nz = 80, 4
    cx0, cx1 = cfg.get('curtain_x', (-1.2, -0.27))
    verts = []
    for j in range(nz + 1):
        row = []
        for i in range(nx + 1):
            x = cx0 + (cx1 - cx0) * i / nx
            y = yw - 0.55 - 0.03 * (1 + math.sin(x / 0.06 * 1.0 + 0.7 * math.sin(x * 9)))
            row.append(bm.verts.new((x, y, -0.1 + 1.6 * j / nz)))
        verts.append(row)
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    bm.to_mesh(me)
    bm.free()
    cur = new_obj('Curtain', me, coll)
    cur.data.materials.append(mats['curtain'])
    cur.visible_diffuse = False
    cur.visible_shadow = False
    cur.visible_volume_scatter = False
    cur.visible_glossy = CFG.get('curtain_glossy', True)

    # ---- lights
    K = cfg
    tgt = K['target']
    # key: window on the camera-left wall, low and raking across the spines
    key = place_area('Key_Window', coll, tgt, K['key_phi'], K['key_elev'], K['key_dist'], K['key_w'], K['key_h'],
                     K['key_power'], K['key_col'])
    # broad soft room light from the front-left (the rest of the window + room bounce): lets light into the
    # receding spines, which the books in front shade from the raking key
    front = place_area('Front_Room', coll, tgt, K['front_phi'], K['front_elev'], K['front_dist'], K['front_w'],
                       K['front_h'], K['front_power'], (1.0, 0.94, 0.87))
    # warm bounce from camera-right
    fill = place_area('Fill_Bounce', coll, tgt, K['fill_phi'], K['fill_elev'], K['fill_dist'], K['fill_w'],
                      K['fill_h'], K['fill_power'], (1.0, 0.93, 0.85))
    # soft rim from the back-left window behind the curtain
    ld = bpy.data.lights.new('Rim_Window', 'AREA')
    ld.shape = 'RECTANGLE'
    ld.size, ld.size_y = 0.9, 1.2
    ld.energy = K['rim_power']
    ld.color = (1.0, 0.95, 0.88)
    rim = new_obj('Rim_Window', ld, coll)
    rim.location = (-0.75, yw - 0.12, 0.65)
    rim.rotation_euler = (math.radians(-90), 0, 0)
    rim.visible_camera = False

    # light linking: key/front/fill do not light the back wall (soft cast shadows of the whole set on the
    # wall read as a dark stain); the wall gets its own soft window spill instead.
    recv = bpy.data.collections.new('KeyReceivers')
    for ob in scn.objects:
        if ob.name not in ('Wall', 'LeftWall', 'Curtain') and ob.type in ('MESH', 'CURVE'):
            recv.objects.link(ob)
    for L in (key, front, fill):
        L.light_linking.receiver_collection = recv
    wonly = bpy.data.collections.new('WallOnly')
    wonly.objects.link(wall)
    wld = bpy.data.lights.new('Wall_Spill', 'AREA')
    wld.size, wld.size_y = 1.6, 1.4
    wld.energy = K['wall_power']
    wld.color = (1.0, 0.93, 0.84)
    wl = new_obj('Wall_Spill', wld, coll)
    wl.location = (-0.95, 0.35, 1.2)
    wl.rotation_euler = (Vector((0.4, yw, 0.55)) - wl.location).to_track_quat('-Z', 'Y').to_euler()
    wl.visible_camera = False
    wl.light_linking.receiver_collection = wonly

    # world HDRI (clamped copy) for ambient fill + reflections
    world = bpy.data.worlds.new('World')
    scn.world = world
    world.use_nodes = True
    wt = world.node_tree
    wt.nodes.clear()
    tc = wt.nodes.new('ShaderNodeTexCoord')
    mp = wt.nodes.new('ShaderNodeMapping')
    mp.inputs['Rotation'].default_value = (0, 0, math.radians(cfg['hdri_rot']))
    env = wt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(os.path.join(ASSETS, 'hotel_room_2k_clamped.hdr'))
    bg = wt.nodes.new('ShaderNodeBackground')
    bg.inputs['Strength'].default_value = cfg['hdri_strength']
    out = wt.nodes.new('ShaderNodeOutputWorld')
    wt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
    wt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
    wt.links.new(env.outputs['Color'], bg.inputs['Color'])
    wt.links.new(bg.outputs['Background'], out.inputs['Surface'])

    # ---- camera (single fixed still)
    camd = bpy.data.cameras.new('Cam')
    camd.lens = cfg['lens']
    camd.sensor_fit = 'VERTICAL'
    camd.sensor_height = 36.0
    camd.sensor_width = 36.0
    camd.dof.use_dof = True
    camd.dof.aperture_fstop = cfg['fstop']
    camd.dof.aperture_blades = 7
    camd.dof.aperture_rotation = math.radians(12)
    camd.clip_start = 0.05
    cam = new_obj('Camera', camd, coll)
    scn.camera = cam
    sz = cases[0]
    focus = bpy.data.objects.new('Focus', None)
    coll.objects.link(focus)
    focus.location = sz.matrix_world @ Vector((0, 0.0, 0.130))
    camd.dof.focus_object = focus
    look = Vector(cfg['look'])
    el, az = math.radians(cfg['elev']), math.radians(cfg['az'])
    dirv = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    cam.location = look + dirv * cfg['dist']
    cam.rotation_euler = (look - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    return dict(cases=cases, cam=cam, focus=focus, quran=q, rahle=rahle, placed=placed, dims=dims)


def patch_points(objs, i, u0=0.38, u1=0.62, zr=None, n=13):
    """Normalised image coords (x right, y down) of a grid on the spine of volume i."""
    from bpy_extras.object_utils import world_to_camera_view
    scn = bpy.context.scene
    ob = objs['cases'][i]
    d = objs['dims'][i]
    t, s = d['t'], d['s']
    R = (t * t / 4 + s * s) / (2 * s)
    half = math.asin((t / 2) / R)
    z0, z1 = zr if zr else clean_rows(i)
    pts = []
    for uu in np.linspace(u0, u1, n):
        a = half * (2 * uu - 1)
        for zz in np.linspace(z0, z1, n):
            co = ob.matrix_world @ Vector((R * math.sin(a), R - R * math.cos(a), zz * MM))
            v = world_to_camera_view(scn, objs['cam'], co)
            pts.append((float(v.x), float(1 - v.y)))
    return pts


def frame_report(objs):
    """Where things land in the frame (normalised, y down) -- composition checks."""
    from bpy_extras.object_utils import world_to_camera_view
    scn = bpy.context.scene
    dg = bpy.context.evaluated_depsgraph_get()

    def bbox(ob):
        ys, xs = [], []
        obe = ob.evaluated_get(dg)
        me = obe.to_mesh()
        for v in me.vertices:
            c = world_to_camera_view(scn, objs['cam'], obe.matrix_world @ v.co)
            xs.append(c.x)
            ys.append(1 - c.y)
        obe.to_mesh_clear()
        return min(xs), max(xs), min(ys), max(ys)
    rep = {'quran': bbox(objs['quran']), 'sozler': bbox(objs['cases'][0]),
           'last': bbox(objs['cases'][-1])}
    return rep


def setup_render(cfg):
    scn = bpy.context.scene
    r = scn.render
    r.engine = 'CYCLES'
    r.resolution_x, r.resolution_y = RES
    r.resolution_percentage = cfg['pct']
    r.threads_mode = 'FIXED'
    r.threads = 3
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_depth = '16'
    r.image_settings.color_mode = 'RGB'
    r.film_transparent = False
    c = scn.cycles
    c.device = 'CPU'
    c.samples = cfg['spp']
    c.use_adaptive_sampling = True
    c.adaptive_threshold = cfg['noise']
    c.adaptive_min_samples = min(48, max(16, cfg['spp'] // 6))
    c.use_denoising = True
    c.denoiser = 'OPENIMAGEDENOISE'
    c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    c.denoising_prefilter = 'ACCURATE'
    c.denoising_quality = 'HIGH'
    c.max_bounces = cfg.get('max_bounces', 5)
    c.diffuse_bounces = cfg.get('diffuse_bounces', 2)
    c.glossy_bounces = 2
    c.transmission_bounces = 0
    c.transparent_max_bounces = 2
    c.volume_bounces = 0
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.blur_glossy = 1.0
    c.sample_clamp_indirect = 6.0
    c.seed = 11
    c.use_animated_seed = False
    scn.view_settings.view_transform = 'AgX'
    scn.view_settings.look = cfg['look_agx']
    scn.view_settings.exposure = cfg['exposure']
    scn.view_settings.gamma = 1.0
    scn.display_settings.display_device = 'sRGB'


def render_depth(objs, path):
    """Camera-space Z depth (metres) via an emission material override, no DOF, saved as float EXR,
    plus a normalised 16-bit PNG (near = dark)."""
    scn = bpy.context.scene
    vl = bpy.context.view_layer
    vl.material_override = mat_depth()
    scn.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
    objs['cam'].data.dof.use_dof = False
    c = scn.cycles
    c.samples = 16
    c.use_adaptive_sampling = False
    c.use_denoising = False
    c.max_bounces = 0
    scn.view_settings.view_transform = 'Standard'
    scn.view_settings.look = 'None'
    scn.view_settings.exposure = 0.0
    r = scn.render
    r.image_settings.file_format = 'OPEN_EXR'
    r.image_settings.color_depth = '32'
    r.image_settings.color_mode = 'RGB'
    r.image_settings.exr_codec = 'ZIP'
    r.filepath = path
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"depth render {time.time() - t0:.1f}s -> {path}", flush=True)
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    dep = px.reshape(h, w, 4)[::-1, :, 0]
    lo, hi = float(np.percentile(dep, 0.05)), float(np.percentile(dep, 99.95))
    nrm = np.clip((dep - lo) / (hi - lo), 0, 1)
    from PIL import Image
    Image.fromarray((nrm * 65535 + 0.5).astype(np.uint16)).save(path.rsplit('.', 1)[0] + '.png')
    print(f"depth range {lo:.3f}..{hi:.3f} m (normalised PNG: near=0/dark, far=65535/light)", flush=True)
    return lo, hi


# ----------------------------------------------------------------------------- finishing / measuring

def finish(src, dst, seed=2024):
    """Photographic finishing: gentle natural vignette, a whisper of lateral CA, very fine film grain."""
    import cv2
    im = cv2.imread(src, cv2.IMREAD_UNCHANGED)[:, :, :3][:, :, ::-1]
    im = im.astype(np.float32) / (65535.0 if im.dtype == np.uint16 else 255.0)
    h, w = im.shape[:2]
    # vignette in linear light (cos^4-like, slightly elliptical for the portrait frame)
    lin = srgb2lin(np.clip(im, 0, 1)).astype(np.float32)
    # very slight lens halation: a wide, faint glow from the brightest areas (real glass is never perfect)
    hi = np.clip(lin - 0.55, 0, None)
    glow = cv2.GaussianBlur(hi, (0, 0), w * 0.012) * 0.6 + cv2.GaussianBlur(hi, (0, 0), w * 0.004) * 0.4
    lin = lin + 0.10 * glow
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx = (xx - w / 2) / (w / 2)
    ny = (yy - h * 0.47) / (h / 2)
    r2 = nx * nx * 0.85 + ny * ny * 0.6
    vig = 1.0 - 0.17 * np.clip(r2, 0, 3) ** 1.5
    lin *= vig[..., None]
    out = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(np.maximum(lin, 0), 1 / 2.4) - 0.055)

    def rscale(ch, s):
        M = np.float32([[s, 0, (1 - s) * w / 2], [0, s, (1 - s) * h / 2]])
        return cv2.warpAffine(ch, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    out = out.astype(np.float32)
    out[..., 0] = rscale(out[..., 0], 1.0003)
    out[..., 2] = rscale(out[..., 2], 0.9997)
    # film grain: luminance-weighted, fine, slightly soft; mostly in the mid-tones
    rng = np.random.default_rng(seed)
    g = rng.normal(0, 1, (h, w)).astype(np.float32)
    g = cv2.GaussianBlur(g, (0, 0), 0.6)
    g /= g.std() + 1e-6
    gc = rng.normal(0, 1, (h, w, 3)).astype(np.float32)
    gc = cv2.GaussianBlur(gc, (0, 0), 0.8)
    gc /= gc.std() + 1e-6
    lum = 0.2126 * out[..., 0] + 0.7152 * out[..., 1] + 0.0722 * out[..., 2]
    amp = 0.0065 * (0.35 + 0.65 * np.sqrt(np.clip(lum * (1 - lum) * 4, 0, 1)))
    out = out + (g * amp)[..., None] + gc * (amp * 0.25)[..., None]
    out8 = np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8)
    cv2.imwrite(dst, out8[:, :, ::-1])
    return out8


def measure(img_path, pts_path):
    from PIL import Image
    import colorsys
    im = np.asarray(Image.open(img_path).convert('RGB')).astype(float)
    h, w = im.shape[:2]
    P = json.load(open(pts_path))
    res = {}
    for name, pts in P.items():
        vals = []
        for (x, y) in pts:
            xi, yi = int(x * w), int(y * h)
            if 0 <= xi < w and 0 <= yi < h:
                vals.append(im[max(0, yi - 1):yi + 2, max(0, xi - 1):xi + 2].reshape(-1, 3).mean(0))
        v = np.median(np.array(vals), 0)
        hh, ss, vv = colorsys.rgb_to_hsv(*(v / 255))
        res[name] = (v.round(1).tolist(), round(hh * 360, 1), round(ss * 100, 1))
        print(f"{name:14s} RGB {v.round(1)}  #{''.join('%02X' % int(round(c)) for c in v)}  "
              f"hue {hh * 360:5.1f}  sat {ss * 100:4.1f}%", flush=True)
    return res



def read_exr(path):
    """Linear float RGBA (h, w, 4), top row first, via Blender's image loader."""
    _bpy()
    img = bpy.data.images.load(os.path.abspath(path))
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[::-1]


def measure_lin(img_path, pts_path):
    im = read_exr(img_path)[..., :3]
    h, w = im.shape[:2]
    P = json.load(open(pts_path))
    res = {}
    for name, pts in P.items():
        vals = []
        for (x, y) in pts:
            xi, yi = int(x * w), int(y * h)
            if 0 <= xi < w and 0 <= yi < h:
                vals.append(im[max(0, yi - 1):yi + 2, max(0, xi - 1):xi + 2].reshape(-1, 3).mean(0))
        v = np.median(np.array(vals), 0)
        res[name] = v.tolist()
        print(f"{name:14s} lin {np.round(v, 4)}", flush=True)
    return res


def agx_forward(lin, exposure, look='None'):
    """Scene-linear Rec.709 colours -> display sRGB 0..255 through Blender's own AgX view (same OCIO config
    as the render), by saving a tiny float image with the scene's view settings."""
    _bpy()
    lin = np.asarray(lin, np.float32).reshape(-1, 3)
    n = len(lin)
    scn = bpy.context.scene
    scn.view_settings.view_transform = 'AgX'
    scn.view_settings.look = look
    scn.view_settings.exposure = exposure
    scn.display_settings.display_device = 'sRGB'
    img = bpy.data.images.new('agx_probe', n, 1, float_buffer=True, alpha=False)
    img.colorspace_settings.name = 'Linear Rec.709'
    px = np.ones((1, n, 4), np.float32)
    px[0, :, :3] = lin
    img.pixels.foreach_set(px.ravel())
    s = scn.render.image_settings
    s.file_format = 'PNG'
    s.color_depth = '16'
    s.color_mode = 'RGB'
    p = os.path.join(HERE, 'tests', '_agx_probe.png')
    img.save_render(p, scene=scn)
    import cv2
    out = cv2.imread(p, cv2.IMREAD_UNCHANGED)[0, :, ::-1].astype(np.float64) / 257.0
    bpy.data.images.remove(img)
    return out



def agx_inverse(disp, exposure, look='None', iters=12):
    """Display sRGB 0..255 -> scene-linear (fixed-point iteration on agx_forward)."""
    t = np.asarray(disp, np.float64).reshape(-1, 3)
    tl = srgb2lin(np.clip(t / 255.0, 1e-4, 1))
    lin = tl * 1.0
    for _ in range(iters):
        f = agx_forward(lin, exposure, look)
        fl = srgb2lin(np.clip(f / 255.0, 1e-4, 1))
        lin = lin * (tl / fl) ** 1.6
    return lin


def calibrate(measured, target, exposure, look='None'):
    lm = agx_inverse(measured, exposure, look)[0]
    lt = agx_inverse(target, exposure, look)[0]
    return lt / lm, lm, lt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tex', action='store_true')
    ap.add_argument('--pct', type=int, default=25)
    ap.add_argument('--spp', type=int, default=32)
    ap.add_argument('--noise', type=float, default=0.03)
    ap.add_argument('--out', default=os.path.join(HERE, 'test.png'))
    ap.add_argument('--depth', default=None)
    ap.add_argument('--set', nargs='*', default=[], help='key=value overrides (python literals)')
    ap.add_argument('--blend', default=None)
    ap.add_argument('--exr', action='store_true')
    ap.add_argument('--border', default=None, help='x0,x1,y0,y1 in 0..1 (y from top)')
    ap.add_argument('--post', nargs=2, default=None)
    ap.add_argument('--measure', default=None)
    ap.add_argument('--norender', action='store_true')
    ap.add_argument('--measure_lin', default=None)
    a = ap.parse_args()
    if a.tex:
        TX.save_spines()
        TX.save_quran()
        return
    if a.post:
        finish(*a.post)
        return
    if a.measure:
        measure(a.measure, os.path.join(HERE, 'patches.json'))
        return
    if a.measure_lin:
        measure_lin(a.measure_lin, os.path.join(HERE, 'patches.json'))
        return
    _bpy()
    for kv in a.set:
        k, v = kv.split('=', 1)
        CFG[k] = eval(v)
    CFG.update(pct=a.pct, spp=a.spp, noise=a.noise)
    t0 = time.time()
    objs = build(CFG)
    setup_render(CFG)
    pts = {'sozler_upper': patch_points(objs, 0, zr=(165, 200)),
           'sozler_lower': patch_points(objs, 0, zr=(33, 60))}
    for i in (1, 3, 6, 10, 13):
        pts[f'vol{i:02d}'] = patch_points(objs, i, 0.40, 0.60)
    json.dump(pts, open(os.path.join(HERE, 'patches.json'), 'w'))
    rep = frame_report(objs)
    print('frame', {k: [round(x, 3) for x in v] for k, v in rep.items()}, flush=True)
    print(f"build {time.time() - t0:.1f}s", flush=True)
    if a.blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.blend))
    if a.norender:
        return
    scn = bpy.context.scene
    if a.exr:
        scn.render.image_settings.file_format = 'OPEN_EXR'
        scn.render.image_settings.color_depth = '32'
    if a.border:
        x0, x1, y0, y1 = map(float, a.border.split(','))
        scn.render.use_border = True
        scn.render.use_crop_to_border = False
        scn.render.border_min_x, scn.render.border_max_x = x0, x1
        scn.render.border_min_y, scn.render.border_max_y = 1 - y1, 1 - y0
    scn.render.filepath = a.out
    t1 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"render {time.time() - t1:.1f}s -> {a.out}", flush=True)
    if a.depth:
        scn.render.use_border = False
        render_depth(objs, os.path.abspath(a.depth))


if __name__ == '__main__':
    main()
