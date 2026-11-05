"""Risale-i Nur - Sozler : fotogercekci kitap sahnesi (Blender 4.5, Cycles CPU).

Kullanim (headless):
  blender -b -P kitap.py -- --shot intro --anim               # tum intro dizisi
  blender -b -P kitap.py -- --shot outro --anim
  blender -b -P kitap.py -- --shot hero --still                 # out/blender/hero_cover.png
  blender -b -P kitap.py -- --shot intro --frames 0,20,40 --pct 25 --samples 16   # test kareleri

Dokular once uretilmeli:  python3 dokular.py
Birimler metre. Kitap yerel ekseni: x = sirttan on kenara, y = kitabin ustu, z = kalinlik (on kapak +z).
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
OUT = os.path.abspath(os.path.join(HERE, '..', 'out', 'blender'))
PRM = json.load(open(os.path.join(TEX, 'params.json')))

# ------------------------------------------------------------------ argumanlar
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None, cast=str):
    if name in argv:
        i = argv.index(name)
        if i + 1 < len(argv) and not argv[i + 1].startswith('--'):
            return cast(argv[i + 1])
        return True
    return default
SHOT = arg('--shot', 'intro')
PCT = arg('--pct', 100, int)
SAMPLES = arg('--samples', None, int)
FRAMES = arg('--frames', None)
ANIM = bool(arg('--anim', False))
STILL = bool(arg('--still', False))
THREADS = arg('--threads', 3, int)
SAVE = arg('--save', None)
TESTDIR = arg('--testdir', os.path.join(OUT, 'test'))
COVER_RGB = arg('--cover', None)  # "r,g,b" lineer, ayar icin
PROF = arg('--prof', '')  # profil: nomb,nodof,nodn,lowb

# ------------------------------------------------------------------ olculer
T = 0.045            # kalinlik
BT = 0.0028          # karton kalinligi
JW = 0.007           # mafsal olugu genisligi
XF = 0.170           # karton on kenari
HB = 0.240           # karton yuksekligi
HP = PRM['page_h'] / 1000.0  # 0.234
LEFT_FRAC = 80.0 / 750.0

FPS = 30
INTRO_N, OUTRO_N = 81, 130

# acilis acisi: kapagin serbest kenari masaya degecek kadar (> 180)
PIVOT_Z = T - 0.0008

def solve_open_angle():
    best = 180.0
    for k in range(0, 4000):
        th = 180.0 + k * 0.005
        t = math.radians(th)
        x, zl = XF, (T - PIVOT_Z)        # karton dis yuzu, serbest kenar
        z = PIVOT_Z + x * math.sin(t) + zl * math.cos(t)
        if z <= 0.0012:
            return th
        best = th
    return best
TH_OPEN = solve_open_angle()

# ------------------------------------------------------------------ yardimcilar
def clean():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def link(ob, coll=None):
    (coll or bpy.context.scene.collection).objects.link(ob)
    return ob

def mesh_obj(name, verts, faces, coll=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.validate()
    me.update()
    ob = bpy.data.objects.new(name, me)
    return link(ob, coll)

def fix_normals(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data); bm.free(); ob.data.update()

def smooth(ob, angle=40):
    me = ob.data
    me.shade_smooth()
    try:
        me.set_sharp_from_angle(angle=math.radians(angle))
    except Exception:
        pass

def empty(name, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    e.empty_display_size = 0.02
    return link(e)

def parent_keep(child, par):
    bpy.context.view_layer.update()
    child.parent = par
    child.matrix_parent_inverse = par.matrix_world.inverted()

def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)

def load_img(name, noncolor=False):
    p = os.path.join(TEX, name)
    im = bpy.data.images.load(p, check_existing=True)
    if noncolor:
        im.colorspace_settings.name = 'Non-Color'
    return im

# ------------------------------------------------------------------ dugum yardimcilari
class NB:
    """Kucuk shader dugum kurucu."""
    def __init__(self, mat):
        mat.use_nodes = True
        self.nt = mat.node_tree
        self.n = self.nt.nodes
        self.l = self.nt.links
        self.n.clear()
        self.x = 0
    def new(self, t, **kw):
        nd = self.n.new(t)
        for k, v in kw.items():
            setattr(nd, k, v)
        return nd
    def link(self, a, b):
        self.l.new(a, b)
    def val(self, v, label=None):
        nd = self.new('ShaderNodeValue'); nd.outputs[0].default_value = v
        if label: nd.label = label; nd.name = label
        return nd.outputs[0]
    def math(self, op, a, b=None, clamp=False):
        nd = self.new('ShaderNodeMath', operation=op); nd.use_clamp = clamp
        for i, v in enumerate((a, b)):
            if v is None: continue
            if isinstance(v, (int, float)): nd.inputs[i].default_value = v
            else: self.link(v, nd.inputs[i])
        return nd.outputs[0]
    def mixf(self, f, a, b):
        nd = self.new('ShaderNodeMix', data_type='FLOAT')
        for i, v in ((0, f), (2, a), (3, b)):
            if isinstance(v, (int, float)): nd.inputs[i].default_value = v
            else: self.link(v, nd.inputs[i])
        return nd.outputs[0]
    def mixc(self, f, a, b, blend='MIX'):
        nd = self.new('ShaderNodeMix', data_type='RGBA', blend_type=blend)
        for i, v in ((0, f), (6, a), (7, b)):
            if isinstance(v, (int, float)): nd.inputs[i].default_value = v
            elif isinstance(v, tuple): nd.inputs[i].default_value = (*v[:3], 1.0)
            else: self.link(v, nd.inputs[i])
        return nd.outputs[2]
    def maprange(self, v, a, b, c=0.0, d=1.0, clamp=True):
        nd = self.new('ShaderNodeMapRange'); nd.clamp = clamp
        self.link(v, nd.inputs[0])
        nd.inputs[1].default_value = a; nd.inputs[2].default_value = b
        nd.inputs[3].default_value = c; nd.inputs[4].default_value = d
        return nd.outputs[0]
    def texco(self):
        return self.new('ShaderNodeTexCoord')
    def mapping(self, vec, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0)):
        nd = self.new('ShaderNodeMapping')
        self.link(vec, nd.inputs['Vector'])
        nd.inputs['Location'].default_value = loc
        nd.inputs['Rotation'].default_value = rot
        nd.inputs['Scale'].default_value = scale
        return nd.outputs[0]
    def noise(self, vec, scale, detail=2.0, rough=0.5, dim='3D'):
        nd = self.new('ShaderNodeTexNoise', noise_dimensions=dim)
        if vec is not None: self.link(vec, nd.inputs['Vector'])
        nd.inputs['Scale'].default_value = scale
        nd.inputs['Detail'].default_value = detail
        nd.inputs['Roughness'].default_value = rough
        return nd
    def voronoi(self, vec, scale, feature='F1'):
        nd = self.new('ShaderNodeTexVoronoi', feature=feature)
        self.link(vec, nd.inputs['Vector'])
        nd.inputs['Scale'].default_value = scale
        return nd
    def image(self, img, vec=None, interp='Linear', ext='EXTEND'):
        nd = self.new('ShaderNodeTexImage'); nd.image = img; nd.interpolation = interp; nd.extension = ext
        if vec is not None: self.link(vec, nd.inputs['Vector'])
        return nd
    def bump(self, h, strength, dist, normal=None):
        nd = self.new('ShaderNodeBump')
        self.link(h, nd.inputs['Height'])
        nd.inputs['Strength'].default_value = strength
        nd.inputs['Distance'].default_value = dist
        if normal is not None: self.link(normal, nd.inputs['Normal'])
        return nd.outputs[0]
    def principled(self, **kw):
        nd = self.new('ShaderNodeBsdfPrincipled')
        for k, v in kw.items():
            s = nd.inputs[k]
            if isinstance(v, (int, float)): s.default_value = v
            elif isinstance(v, tuple): s.default_value = (*v, 1.0) if len(v) == 3 and s.type == 'RGBA' else v
            else: self.link(v, s)
        return nd
    def out(self, shader):
        o = self.new('ShaderNodeOutputMaterial')
        self.link(shader, o.inputs['Surface'])
        return o

# ------------------------------------------------------------------ malzemeler
COVER_LIN = (0.25, 0.0112, 0.0325)
if COVER_RGB:
    COVER_LIN = tuple(float(c) for c in COVER_RGB.split(','))
# varak: doygun sicak altin (#D4AF37 / #C9A24A civari okunacak sekilde); kenar (F82) tinti da altin
GOLD_LIN = (0.80, 0.50, 0.095)
GOLD_HI = (0.88, 0.60, 0.15)
GOLD_OCHRE = (0.36, 0.19, 0.03)
GOLD_EDGE = (0.95, 0.66, 0.20)
GOLD_ROUGH = (arg('--grmin', 0.24, float), arg('--grmax', 0.40, float))
LSPEC = arg('--spec', 0.06, float)
LROUGH = arg('--lrough', 0.72, float)

LEATHER_BAKED = os.path.join(TEX, 'deri_doku.png')
CEVIZ_COL = os.path.join(TEX, 'ceviz_renk.png')
CEVIZ_DAT = os.path.join(TEX, 'ceviz_veri.png')
BAKE = bool(arg('--bake', False))

def leather_grain(b, obj, bake=False):
    """(crease, height, colornoise) soketleri. Pisirilmis doku: R=kirisik G=(h+0.6)/1.1 B=renk gurultusu."""
    if not bake and os.path.exists(LEATHER_BAKED):
        vec = b.mapping(obj, loc=(0.006 / 0.18, 0.5, 0.0), scale=(1 / 0.18, 1 / 0.24, 1 / 0.18))
        t = b.image(load_img('deri_doku.png', True), vec, 'Linear', 'REPEAT')
        t.projection = 'BOX'; t.projection_blend = 0.2
        sep = b.new('ShaderNodeSeparateColor'); b.link(t.outputs['Color'], sep.inputs[0])
        h = b.math('SUBTRACT', b.math('MULTIPLY', sep.outputs[1], 1.1), 0.6)
        return sep.outputs[0], h, sep.outputs[2]
    v1 = b.voronoi(obj, 1100.0, 'DISTANCE_TO_EDGE')
    crease = b.maprange(v1.outputs['Distance'], 0.0, 0.10, 1.0, 0.0)       # 1 = kirisik
    v2 = b.voronoi(obj, 420.0, 'F1')
    pebble = b.maprange(v2.outputs['Distance'], 0.0, 0.8, 1.0, 0.0)
    n1 = b.noise(obj, 60.0, 3.0, 0.55)
    n2 = b.noise(obj, 2600.0, 2.0, 0.5)
    grain_h = b.math('ADD', b.math('MULTIPLY', crease, -0.6), b.math('MULTIPLY', pebble, 0.25))
    grain_h = b.math('ADD', grain_h, b.math('MULTIPLY', n2.outputs['Fac'], 0.25))
    return crease, grain_h, n1.outputs['Fac']

def mat_leather(name, mask_img=None, blur_img=None, mode=None, obj_map=None):
    """Acik asil kirmizi deri/buckram + altin varak (maske ile)."""
    m = bpy.data.materials.new(name)
    b = NB(m)
    tc = b.texco()
    obj = tc.outputs['Object']
    # --- deri grenli doku (pisirilmis doku varsa onu kullan: cok daha hizli)
    crease, grain_h, n1f = leather_grain(b, obj, bake=False)
    # --- renk
    base = b.mixc(b.math('MULTIPLY', crease, 0.55), COVER_LIN, tuple(c * 0.72 for c in COVER_LIN))
    cvar = b.maprange(n1f, 0.3, 0.7, 0.93, 1.06)
    hsv = b.new('ShaderNodeHueSaturation')
    b.link(base, hsv.inputs['Color']); b.link(cvar, hsv.inputs['Value'])
    hsv.inputs['Saturation'].default_value = 1.0
    leather_col = hsv.outputs['Color']
    rough = b.math('ADD', LROUGH, b.math('MULTIPLY', crease, 0.12))
    rough = b.math('ADD', rough, b.math('MULTIPLY', b.math('SUBTRACT', n1f, 0.5), 0.12))
    # --- maske
    fac = None; hmask = None
    if mask_img is not None:
        if mode == 'obj':
            sx, sy, ox, oy = obj_map
            uv = b.mapping(obj, loc=(ox, oy, 0), scale=(sx, sy, 1))
        else:
            uv = tc.outputs['UV']
        mk = b.image(mask_img, uv)
        mval = b.maprange(mk.outputs['Color'], 0.22, 0.78, 0.0, 1.0)
        if blur_img is not None:
            hb = b.image(blur_img, uv)
            hmask = hb.outputs['Color']
        else:
            hmask = mk.outputs['Color']
        # kabartma duvarlari / cukurlar: keskin maske - bulanik maske > 0 -> koyu okr
        recess = b.maprange(b.math('SUBTRACT', mk.outputs['Color'], hmask), 0.02, 0.45, 0.0, 1.0)
        # yalniz dis yuzeyde
        if mode == 'obj':
            sep = b.new('ShaderNodeSeparateXYZ'); b.link(tc.outputs['Normal'], sep.inputs[0])
            face = b.maprange(sep.outputs['Z'], 0.6, 0.9, 0.0, 1.0)
            mval = b.math('MULTIPLY', mval, face)
            hmask = b.math('MULTIPLY', hmask, face)
        # varak kusurlari (cok az)
        nd = b.noise(obj, 900.0, 1.0, 0.5)
        defect = b.maprange(nd.outputs['Fac'], 0.70, 0.74, 0.0, 1.0)
        mval = b.math('MULTIPLY', mval, b.math('SUBTRACT', 1.0, b.math('MULTIPLY', defect, 0.8)))
        fac = mval
    # --- altin
    brush = b.noise(b.mapping(obj, scale=(40.0, 1.0, 40.0)), 1800.0, 2.0, 0.6)
    glint = b.noise(obj, 260.0, 2.0, 0.5)
    gold_r = b.maprange(brush.outputs['Fac'], 0.3, 0.7, GOLD_ROUGH[0], GOLD_ROUGH[1])
    gold_r = b.math('SUBTRACT', gold_r, b.maprange(glint.outputs['Fac'], 0.55, 0.75, 0.0, 0.08))
    gnoise = b.noise(obj, 180.0, 2.0, 0.5)
    gold_col = b.mixc(b.maprange(gnoise.outputs['Fac'], 0.35, 0.65, 0.0, 1.0), GOLD_LIN, GOLD_HI)
    if mask_img is not None:
        gold_col = b.mixc(b.math('MULTIPLY', recess, 0.85), gold_col, GOLD_OCHRE)
        gold_r = b.math('ADD', gold_r, b.math('MULTIPLY', recess, 0.12))
    # --- yukseklik
    if fac is not None:
        g_h = b.math('MULTIPLY', grain_h, b.math('SUBTRACT', 1.0, b.math('MULTIPLY', fac, 0.85)))
        h = b.math('ADD', b.math('MULTIPLY', g_h, 0.10), b.math('MULTIPLY', hmask, -0.32))
    else:
        h = b.math('MULTIPLY', grain_h, 0.10)
    nrm = b.bump(h, 1.0, 0.001)
    leather = b.principled(**{'Base Color': leather_col, 'Roughness': rough, 'Normal': nrm,
                              'Coat Weight': 0.04 * LSPEC / 0.16, 'Coat Roughness': 0.5, 'Sheen Weight': 0.05,
                              'Sheen Roughness': 0.5, 'Specular IOR Level': LSPEC})
    if fac is None:
        b.out(leather.outputs[0]); return m
    gold = b.principled(**{'Base Color': gold_col, 'Metallic': 1.0, 'Roughness': gold_r, 'Normal': nrm,
                           'Specular Tint': GOLD_EDGE})
    mix = b.new('ShaderNodeMixShader')
    b.link(fac, mix.inputs[0]); b.link(leather.outputs[0], mix.inputs[1]); b.link(gold.outputs[0], mix.inputs[2])
    b.out(mix.outputs[0])
    return m

def mat_page_edge(name):
    m = bpy.data.materials.new(name)
    b = NB(m)
    obj = b.texco().outputs['Object']
    s1 = b.noise(b.mapping(obj, scale=(25, 25, 2600)), 1.0, 2.0, 0.6)
    s2 = b.noise(b.mapping(obj, scale=(8, 8, 650)), 1.0, 1.0, 0.5)
    st = b.math('ADD', b.math('MULTIPLY', s1.outputs['Fac'], 0.6), b.math('MULTIPLY', s2.outputs['Fac'], 0.4))
    shade = b.maprange(st, 0.3, 0.7, 0.80, 1.04)
    dirt = b.noise(obj, 25.0, 3.0, 0.6)
    dshade = b.maprange(dirt.outputs['Fac'], 0.3, 0.7, 0.93, 1.02)
    base_c = (0.80, 0.70, 0.52)
    c = b.mixc(0.0, base_c, base_c, 'MIX')
    col = b.new('ShaderNodeHueSaturation'); b.link(c, col.inputs['Color'])
    b.link(b.math('MULTIPLY', shade, dshade), col.inputs['Value'])
    nrm = b.bump(st, 0.35, 0.0003)
    p = b.principled(**{'Base Color': col.outputs['Color'], 'Roughness': 0.82, 'Normal': nrm,
                        'Specular IOR Level': 0.3})
    b.out(p.outputs[0])
    return m

def mat_page(name, img, glow=False, two_sided_img=None, mirror_back=False):
    m = bpy.data.materials.new(name)
    b = NB(m)
    tc = b.texco()
    uv = tc.outputs['UV']
    if mirror_back:
        geo = b.new('ShaderNodeNewGeometry')
        sep = b.new('ShaderNodeSeparateXYZ'); b.link(uv, sep.inputs[0])
        u2 = b.mixf(geo.outputs['Backfacing'], sep.outputs['X'], b.math('SUBTRACT', 1.0, sep.outputs['X']))
        cmb = b.new('ShaderNodeCombineXYZ'); b.link(u2, cmb.inputs[0]); b.link(sep.outputs['Y'], cmb.inputs[1])
        uv = cmb.outputs[0]
    t = b.image(img, uv, 'Cubic' if glow else 'Linear')
    fib = b.noise(tc.outputs['Object'], 3500.0, 2.0, 0.6)
    nrm = b.bump(fib.outputs['Fac'], 0.04, 0.0002)
    kw = {'Base Color': t.outputs['Color'], 'Roughness': 0.74, 'Normal': nrm, 'Specular IOR Level': 0.35}
    if glow:
        g = b.val(0.0, 'GLOW')
        kw['Emission Color'] = (1.0, 0.70, 0.40)
        kw['Emission Strength'] = g
    p = b.principled(**kw)
    b.out(p.outputs[0])
    return m

def mat_headband(name):
    m = bpy.data.materials.new(name)
    b = NB(m)
    obj = b.texco().outputs['Object']
    w = b.new('ShaderNodeTexWave', wave_type='BANDS', bands_direction='Z')
    b.link(b.mapping(obj, scale=(300, 300, 1.0), rot=(0.0, 0.5, 0.0)), w.inputs['Vector'])
    w.inputs['Scale'].default_value = 650.0
    w.inputs['Distortion'].default_value = 0.0
    f = b.maprange(w.outputs['Fac'], 0.45, 0.55, 0.0, 1.0)
    col = b.mixc(f, (0.55, 0.03, 0.04), (0.95, 0.68, 0.30))
    p = b.principled(**{'Base Color': col, 'Metallic': b.math('MULTIPLY', f, 0.7),
                        'Roughness': 0.35, 'Sheen Weight': 0.5})
    b.out(p.outputs[0])
    return m

def mat_ribbon(name):
    m = bpy.data.materials.new(name)
    b = NB(m)
    tc = b.texco()
    tan = b.new('ShaderNodeTangent', direction_type='UV_MAP')
    n = b.noise(b.mapping(tc.outputs['UV'], scale=(60, 1, 1)), 30.0, 2.0, 0.5)
    rough = b.maprange(n.outputs['Fac'], 0.3, 0.7, 0.26, 0.36)
    p = b.principled(**{'Base Color': (0.78, 0.50, 0.13), 'Roughness': rough, 'Anisotropic': 0.75,
                        'Tangent': tan.outputs[0], 'Sheen Weight': 0.6, 'Sheen Tint': (1.0, 0.85, 0.5),
                        'Metallic': 0.15})
    b.out(p.outputs[0])
    return m

def mat_walnut_img(name):
    m = bpy.data.materials.new(name)
    b = NB(m)
    uv = b.texco().outputs['UV']
    c = b.image(load_img('ceviz_renk.png'), uv, 'Linear')
    d = b.image(load_img('ceviz_veri.png', True), uv, 'Linear')
    sep = b.new('ShaderNodeSeparateColor'); b.link(d.outputs['Color'], sep.inputs[0])
    nrm = b.bump(sep.outputs[0], 0.25, 0.0005)
    rough = b.maprange(sep.outputs[1], 0.3, 0.7, 0.30, 0.48)
    p = b.principled(**{'Base Color': c.outputs['Color'], 'Roughness': rough, 'Normal': nrm,
                        'Coat Weight': 0.35, 'Coat Roughness': 0.24, 'Specular IOR Level': 0.4})
    b.out(p.outputs[0])
    return m

def mat_walnut(name, bake=None):
    m = bpy.data.materials.new(name)
    b = NB(m)
    obj = b.texco().outputs['Object']
    warp = b.noise(b.mapping(obj, scale=(1.2, 6.0, 1.0)), 2.0, 4.0, 0.6)
    wv = b.new('ShaderNodeVectorMath', operation='ADD')
    b.link(b.mapping(obj, scale=(0.5, 26.0, 1.0)), wv.inputs[0])
    sc = b.new('ShaderNodeVectorMath', operation='SCALE'); b.link(warp.outputs['Color'], sc.inputs[0])
    sc.inputs['Scale'].default_value = 1.6
    b.link(sc.outputs[0], wv.inputs[1])
    wave = b.new('ShaderNodeTexWave', wave_type='BANDS', bands_direction='Y')
    b.link(wv.outputs[0], wave.inputs['Vector'])
    wave.inputs['Scale'].default_value = 1.3
    wave.inputs['Distortion'].default_value = 6.0
    wave.inputs['Detail'].default_value = 4.0
    wave.inputs['Detail Roughness'].default_value = 0.65
    fib = b.noise(b.mapping(obj, scale=(1.5, 55.0, 3.0)), 3.0, 8.0, 0.62)
    fib.inputs['Distortion'].default_value = 0.6
    big = b.noise(obj, 1.6, 2.0, 0.5)
    g1 = b.mixf(0.55, wave.outputs['Fac'], fib.outputs['Fac'])
    g1 = b.mixf(0.25, g1, big.outputs['Fac'])
    ramp = b.new('ShaderNodeValToRGB')
    b.link(b.maprange(g1, 0.28, 0.72, 0.0, 1.0), ramp.inputs[0])
    el = ramp.color_ramp.elements
    el[0].position = 0.0; el[0].color = (0.016, 0.0085, 0.0045, 1)
    el[1].position = 1.0; el[1].color = (0.060, 0.032, 0.017, 1)
    e = el.new(0.5); e.color = (0.032, 0.017, 0.009, 1)
    pores = b.noise(b.mapping(obj, scale=(30.0, 900.0, 30.0)), 1.0, 2.0, 0.5)
    fine = b.noise(obj, 40.0, 3.0, 0.55)
    col = b.new('ShaderNodeHueSaturation'); b.link(ramp.outputs['Color'], col.inputs['Color'])
    b.link(b.maprange(fine.outputs['Fac'], 0.3, 0.7, 0.85, 1.12), col.inputs['Value'])
    h = b.math('ADD', b.math('MULTIPLY', pores.outputs['Fac'], 0.6), b.math('MULTIPLY', wave.outputs['Fac'], 0.25))
    if bake:
        em = b.new('ShaderNodeEmission')
        if bake == 'col':
            b.link(col.outputs['Color'], em.inputs['Color'])
        else:
            cc = b.new('ShaderNodeCombineColor'); b.link(h, cc.inputs[0]); b.link(fine.outputs['Fac'], cc.inputs[1])
            b.link(cc.outputs[0], em.inputs['Color'])
        b.out(em.outputs[0])
        return m
    nrm = b.bump(h, 0.25, 0.0005)
    rough = b.maprange(fine.outputs['Fac'], 0.3, 0.7, 0.30, 0.48)
    p = b.principled(**{'Base Color': col.outputs['Color'], 'Roughness': rough, 'Normal': nrm,
                        'Coat Weight': 0.35, 'Coat Roughness': 0.24, 'Specular IOR Level': 0.4})
    b.out(p.outputs[0])
    return m

def mat_simple(name, col, rough=0.8, emit=None, estr=0.0):
    m = bpy.data.materials.new(name)
    b = NB(m)
    kw = {'Base Color': col, 'Roughness': rough}
    if emit:
        kw['Emission Color'] = emit; kw['Emission Strength'] = estr
    p = b.principled(**kw)
    b.out(p.outputs[0])
    return m

# ------------------------------------------------------------------ geometri
def rounded_board(name, x0, x1, y0, y1, z0, z1, r_fore=0.0032, r_edge=0.0007, coll=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = x0 if v.co.x < 0 else x1
        v.co.y = y0 if v.co.y < 0 else y1
        v.co.z = z0 if v.co.z < 0 else z1
    bm.edges.ensure_lookup_table()
    vert_fore = [e for e in bm.edges if all(abs(v.co.x - x1) < 1e-6 for v in e.verts)
                 and abs(e.verts[0].co.z - e.verts[1].co.z) > 1e-6]
    bmesh.ops.bevel(bm, geom=vert_fore, offset=r_fore, segments=7, profile=0.5, affect='EDGES', clamp_overlap=True)
    sharp = [e for e in bm.edges if e.is_manifold and e.calc_face_angle(0) > math.radians(50)]
    bmesh.ops.bevel(bm, geom=sharp, offset=r_edge, segments=3, profile=0.5, affect='EDGES', clamp_overlap=True)
    bm.normal_update()
    for f in bm.faces:
        n = f.normal
        f.smooth = not (abs(n.z) > 0.9999 or abs(n.x) > 0.9999 or abs(n.y) > 0.9999)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    return link(ob, coll)

def extrude_profile(name, prof, y0, y1, ny=2, coll=None):
    N = len(prof)
    verts, faces = [], []
    for k in range(ny + 1):
        y = y0 + (y1 - y0) * k / ny
        for (x, z) in prof:
            verts.append((x, y, z))
    for k in range(ny):
        for i in range(N):
            a = k * N + i; b_ = k * N + (i + 1) % N
            faces.append((a, b_, b_ + N, a + N))
    faces.append(tuple(range(N))[::-1])
    faces.append(tuple(ny * N + i for i in range(N)))
    ob = mesh_obj(name, verts, faces, coll)
    fix_normals(ob)
    return ob

def book_dims(Tk):
    z0 = BT + 0.0003
    z1 = Tk - BT - 0.0003
    Tp = z1 - z0
    zc = (z0 + z1) / 2
    def q(z):
        return max(0.0, 1 - ((z - zc) / (Tp / 2)) ** 2)
    xsp = lambda z: 0.0030 - 0.0042 * q(z) * min(1.0, Tk / 0.045)
    xfo = lambda z: 0.1668 - 0.0020 * q(z)
    return z0, z1, xsp, xfo

def block_profile(za, zb, xsp, xfo, ntop=56, nside=None):
    if nside is None:
        nside = max(2, int((zb - za) / 0.0015))
    pts = []
    def xs(z, i, n):  # ust/alt kenar boyunca, sirta yakin sik
        t = i / n
        t = t ** 1.7
        return xsp(z) + (xfo(z) - xsp(z)) * t
    for i in range(ntop + 1):              # alt: sirt -> on kenar
        pts.append((xs(za, i, ntop), za))
    for j in range(1, nside):              # on kenar: alttan uste
        z = za + (zb - za) * j / nside
        pts.append((xfo(z), z))
    for i in range(ntop, -1, -1):          # ust: on kenar -> sirt
        pts.append((xs(zb, i, ntop), zb))
    for j in range(nside - 1, 0, -1):      # sirt: ustten alta
        z = za + (zb - za) * j / nside
        pts.append((xsp(z), z))
    return pts

def set_uv_faces(ob, pred, uvfun, mat_index=None):
    me = ob.data
    uvl = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        cos = [me.vertices[me.loops[li].vertex_index].co for li in p.loop_indices]
        if pred(p, cos):
            if mat_index is not None:
                p.material_index = mat_index
            for li in p.loop_indices:
                c = me.vertices[me.loops[li].vertex_index].co
                uvl.data[li].uv = uvfun(c)

def spine_shell(name, Tk, SB, bands_mm, coll=None, ns=36, ny=300, band_h=0.0011):
    verts, faces, uvs = [], [], []
    def band(y):
        ymm = (HB / 2 - y) * 1000.0
        h = 0.0
        for bc in bands_mm:
            d = abs(ymm - bc)
            if d < 3.0:
                h = max(h, math.cos(d / 3.0 * math.pi / 2) ** 2)
        return h * band_h
    for k in range(ny + 1):
        y = -HB / 2 + HB * k / ny
        bh = band(y)
        for i in range(ns + 1):
            s = i / ns
            sn = math.sin(math.pi * s)
            x = -SB * sn - bh * sn ** 0.35
            z = s * Tk
            verts.append((x, y, z))
            uvs.append((s, k / ny))
    W = ns + 1
    for k in range(ny):
        for i in range(ns):
            a = k * W + i
            faces.append((a, a + W, a + W + 1, a + 1))
    ob = mesh_obj(name, verts, faces, coll)
    me = ob.data
    uvl = me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        for li in p.loop_indices:
            uvl.data[li].uv = uvs[me.loops[li].vertex_index]
    # normaller disari (-x) baksin
    mid = me.polygons[(ny // 2) * ns + ns // 2]
    if mid.normal.x > 0:
        me.flip_normals()
    sol = ob.modifiers.new('kalinlik', 'SOLIDIFY')
    sol.thickness = 0.0015; sol.offset = -1.0; sol.use_even_offset = True
    me.shade_smooth()
    return ob

def joint_strip(name, ztop, outward=+1, coll=None, depth=0.0013):
    """Mafsal olugu: x 0..JW, ust yuzeyi oluklu. outward=+1 on (ust), -1 arka (alt)."""
    n = 14
    prof = []
    for i in range(n + 1):
        x = JW * i / n
        g = depth * math.sin(math.pi * i / n) ** 1.3
        prof.append((x, ztop - outward * g))
    for i in range(n, -1, -1):
        x = JW * i / n
        prof.append((x, ztop - outward * BT))
    ob = extrude_profile(name, prof, -HB / 2, HB / 2, 2, coll)
    smooth(ob, 50)
    return ob

def headband(name, Tk, xsp, z0, z1, y, coll=None):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 0.00125
    cu.bevel_resolution = 3
    sp = cu.splines.new('POLY')
    n = 20
    sp.points.add(n)
    for i in range(n + 1):
        z = z0 + 0.0008 + (z1 - z0 - 0.0016) * i / n
        sp.points[i].co = (xsp(z) + 0.0009, y, z, 1.0)
    ob = bpy.data.objects.new(name, cu)
    return link(ob, coll)

def ribbon(name, coll=None):
    ctrl = [(0.046, -0.100, 0.0205), (0.047, -0.1168, 0.0200), (0.048, -0.1205, 0.0150),
            (0.0495, -0.1235, 0.0065), (0.051, -0.1270, 0.0016), (0.054, -0.1330, 0.00045),
            (0.059, -0.1480, 0.00040), (0.067, -0.1650, 0.00040), (0.080, -0.1800, 0.00040),
            (0.096, -0.1900, 0.00040)]
    # Catmull-Rom
    P = [Vector(c) for c in ctrl]
    P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    path = []
    for i in range(1, len(P) - 2):
        for t in [j / 10 for j in range(10)]:
            p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
            path.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
                               (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    path.append(P[-2])
    w = 0.0042
    verts, faces, uvs = [], [], []
    L = 0.0
    for i, p in enumerate(path):
        if i > 0:
            L += (p - path[i - 1]).length
        tng = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        side = tng.cross(Vector((0, 0, 1)))
        if side.length < 1e-6:
            side = Vector((1, 0, 0))
        side.normalize()
        if side.x < 0: side = -side
        last = (i == len(path) - 1)
        off_l = -0.004 if last else 0.0     # verev kesik uc
        verts.append(p - side * w / 2 + tng * off_l)
        verts.append(p + side * w / 2)
        uvs += [(0.0, L * 50), (1.0, L * 50)]
    for i in range(len(path) - 1):
        a = 2 * i
        faces.append((a, a + 2, a + 3, a + 1))
    ob = mesh_obj(name, verts, faces, coll)
    me = ob.data
    uvl = me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        for li in p.loop_indices:
            uvl.data[li].uv = uvs[me.loops[li].vertex_index]
    sol = ob.modifiers.new('k', 'SOLIDIFY'); sol.thickness = 0.00022; sol.offset = 0.0
    me.shade_smooth()
    return ob

# ------------------------------------------------------------------ kitap
MATS = {}

def build_book(prefix, Tk, spine_mask, spine_blur=None, bands_mm=PRM['bands'], main=False, coll=None):
    parts = {}
    z0, z1, xsp, xfo = book_dims(Tk)
    SB = 0.0055 * math.sqrt(Tk / 0.045)
    deri = MATS['deri']
    # arka karton + mafsal
    bb = rounded_board(prefix + 'arka_karton', JW, XF, -HB / 2, HB / 2, 0.0, BT, coll=coll)
    bb.data.materials.append(deri)
    js_b = joint_strip(prefix + 'arka_mafsal', 0.0, -1, coll); js_b.data.materials.append(deri)
    # sirt
    sp = spine_shell(prefix + 'sirt', Tk, SB, bands_mm, coll)
    sp.data.materials.append(mat_leather(prefix + 'sirt_mat', spine_mask, spine_blur, 'uv'))
    # on kapak (kapak maskesi)
    fb = rounded_board(prefix + 'on_karton', JW, XF, -HB / 2, HB / 2, Tk - BT, Tk, coll=coll)
    if main:
        fb.data.materials.append(MATS['kapak'])
    else:
        fb.data.materials.append(deri)
    js_f = joint_strip(prefix + 'on_mafsal', Tk, +1, coll); js_f.data.materials.append(deri)
    parts.update(back=bb, spine=sp, front=fb, joint_f=js_f, joint_b=js_b)
    # kapitalbent
    for sgn, nm in ((1, 'ust'), (-1, 'alt')):
        hb = headband(prefix + 'kapitalbent_' + nm, Tk, xsp, z0, z1, sgn * (HP / 2 - 0.0006), coll)
        hb.data.materials.append(MATS['kapital'])
    edge = MATS['kenar']
    if not main:
        blk = extrude_profile(prefix + 'sayfalar', block_profile(z0, z1, xsp, xfo, 20), -HP / 2, HP / 2, 2, coll)
        smooth(blk, 40)
        blk.data.materials.append(edge)
        parts['block'] = blk
        return parts
    # --- ana kitap: sag blok (s. 81 ustte) + sol blok (kapakla doner)
    Lt = (z1 - z0) * LEFT_FRAC
    zr = z1 - Lt - 0.0004
    zl0 = zr + 0.0004
    rb = extrude_profile(prefix + 'sag_blok', block_profile(z0, zr, xsp, xfo, 64), -HP / 2, HP / 2, 18, coll)
    rb.data.materials.append(edge); rb.data.materials.append(MATS['s81'])
    lb = extrude_profile(prefix + 'sol_blok', block_profile(zl0, z1, xsp, xfo, 64), -HP / 2, HP / 2, 18, coll)
    lb.data.materials.append(edge); lb.data.materials.append(MATS['s80'])
    def top_pred(zv):
        return lambda p, cos: all(abs(c.z - zv) < 1e-7 for c in cos) and abs(p.normal.z) > 0.5
    xs_r0, xs_r1 = xsp(zr), xfo(zr)
    set_uv_faces(rb, top_pred(zr), lambda c: ((c.x - xs_r0) / (xs_r1 - xs_r0), (c.y + HP / 2) / HP), 1)
    xs_l0, xs_l1 = xsp(zl0), xfo(zl0)
    set_uv_faces(lb, top_pred(zl0), lambda c: (1 - (c.x - xs_l0) / (xs_l1 - xs_l0), (c.y + HP / 2) / HP), 1)
    smooth(rb, 40); smooth(lb, 40)
    parts.update(right=rb, left=lb, zr=zr, zl0=zl0, z0=z0, z1=z1, xsp=xsp, xfo=xfo)
    # sag blok: acilinca cilt olugu egrisi (shape key)
    rb.shape_key_add(name='Basis')
    sk = rb.shape_key_add(name='acik', from_mix=False)
    Gd, Lr = 0.0052, 0.030
    xg0 = xsp(zr)
    for i, v in enumerate(rb.data.vertices):
        c = v.co
        drop = Gd * (1 - smoothstep(xg0, xg0 + Lr, c.x)) ** 2
        lift = 0.0011 * math.exp(-((c.x - (xg0 + 0.042)) / 0.03) ** 2)
        f = (c.z - z0) / (zr - z0)
        sk.data[i].co = (c.x, c.y, c.z + (lift - drop) * f)
    parts['gutter_pt'] = Vector((xg0 + 0.0012, 0.0, zr - Gd + 0.0004))
    return parts

def left_gutter_key(lb, pivot, th, gutter_pt, xsp, zl0):
    """Sol blok: tam acik pozda sirt kenarini olugun icine dogru indir."""
    R = Matrix.Rotation(-math.radians(th), 3, 'Y')
    Rin = R.inverted()
    P = Vector((0.0, 0.0, PIVOT_Z))
    S_loc = Vector((xsp(zl0), 0.0, zl0))
    S = P + R @ (S_loc - P)
    lb.shape_key_add(name='Basis')
    sk = lb.shape_key_add(name='oluk', from_mix=False)
    Lg = 0.040
    for i, v in enumerate(lb.data.vertices):
        c = v.co
        wgt = (1 - smoothstep(xsp(zl0), xsp(zl0) + Lg, c.x)) ** 2
        dW = (gutter_pt - S) * wgt
        dW.y = 0.0
        dl = Rin @ dW
        sk.data[i].co = c + dl
    return sk

def leaf_obj(name, k, coll=None):
    LW = 0.1605
    nx, nyy = 48, 4
    verts, faces, uvs = [], [], []
    for j in range(nyy + 1):
        y = -HP / 2 + 0.0006 + (HP - 0.0012) * j / nyy
        for i in range(nx + 1):
            x = LW * i / nx
            verts.append((x, y, 0.0))
            uvs.append((i / nx, j / nyy))
    W = nx + 1
    for j in range(nyy):
        for i in range(nx):
            a = j * W + i
            faces.append((a, a + 1, a + W + 1, a + W))
    ob = mesh_obj(name, verts, faces, coll)
    me = ob.data
    uvl = me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        for li in p.loop_indices:
            uvl.data[li].uv = uvs[me.loops[li].vertex_index]
    me.shade_smooth()
    return ob

# ------------------------------------------------------------------ toz zerreleri (GN)
def dust(name, box_min, box_max, count=110, seed=3):
    me = bpy.data.meshes.new(name)
    ob = link(bpy.data.objects.new(name, me))
    ng = bpy.data.node_groups.new(name + '_gn', 'GeometryNodeTree')
    ng.interface.new_socket(name='Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket(name='Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    N = ng.nodes; L = ng.links
    gout = N.new('NodeGroupOutput')
    pts = N.new('GeometryNodePoints'); pts.inputs['Count'].default_value = count
    rv = N.new('FunctionNodeRandomValue'); rv.data_type = 'FLOAT_VECTOR'
    vin = [s for s in rv.inputs if s.type == 'VECTOR']
    vin[0].default_value = box_min; vin[1].default_value = box_max
    [s for s in rv.inputs if s.name == 'Seed'][0].default_value = seed
    L.new([s for s in rv.outputs if s.type == 'VECTOR'][0], pts.inputs['Position'])
    st = N.new('GeometryNodeInputSceneTime')
    nz = N.new('ShaderNodeTexNoise'); nz.noise_dimensions = '4D'
    nz.inputs['Scale'].default_value = 6.0
    pos = N.new('GeometryNodeInputPosition')
    L.new(pos.outputs[0], nz.inputs['Vector'])
    wmul = N.new('ShaderNodeMath'); wmul.operation = 'MULTIPLY'; wmul.inputs[1].default_value = 0.12
    L.new(st.outputs['Seconds'], wmul.inputs[0]); L.new(wmul.outputs[0], nz.inputs['W'])
    sub = N.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'
    L.new(nz.outputs['Color'], sub.inputs[0]); sub.inputs[1].default_value = (0.5, 0.5, 0.5)
    scl = N.new('ShaderNodeVectorMath'); scl.operation = 'SCALE'
    L.new(sub.outputs[0], scl.inputs[0]); scl.inputs['Scale'].default_value = 0.05
    drift = N.new('ShaderNodeVectorMath'); drift.operation = 'SCALE'
    drift.inputs[0].default_value = (0.004, 0.003, 0.0025)
    L.new(st.outputs['Seconds'], drift.inputs['Scale'])
    add = N.new('ShaderNodeVectorMath'); add.operation = 'ADD'
    L.new(scl.outputs[0], add.inputs[0]); L.new(drift.outputs[0], add.inputs[1])
    setp = N.new('GeometryNodeSetPosition')
    L.new(pts.outputs[0], setp.inputs['Geometry']); L.new(add.outputs[0], setp.inputs['Offset'])
    ico = N.new('GeometryNodeMeshIcoSphere'); ico.inputs['Radius'].default_value = 0.00042
    ico.inputs['Subdivisions'].default_value = 1
    rs = N.new('FunctionNodeRandomValue'); rs.data_type = 'FLOAT'
    fin = [s for s in rs.inputs if s.type == 'VALUE']
    fin[0].default_value = 0.45; fin[1].default_value = 1.5
    iop = N.new('GeometryNodeInstanceOnPoints')
    L.new(setp.outputs[0], iop.inputs['Points']); L.new(ico.outputs[0], iop.inputs['Instance'])
    L.new([s for s in rs.outputs if s.type == 'VALUE'][0], iop.inputs['Scale'])
    rl = N.new('GeometryNodeRealizeInstances'); L.new(iop.outputs[0], rl.inputs[0])
    sm = N.new('GeometryNodeSetMaterial'); L.new(rl.outputs[0], sm.inputs['Geometry'])
    sm.inputs['Material'].default_value = MATS['toz']
    L.new(sm.outputs[0], gout.inputs[0])
    mod = ob.modifiers.new('gn', 'NODES'); mod.node_group = ng
    ob.visible_shadow = False
    ob.visible_diffuse = False
    ob.visible_glossy = False
    return ob

# ------------------------------------------------------------------ kamera yardimcilari
def sph(tgt, az, el, dist):
    a, e = math.radians(az), math.radians(el)
    return Vector(tgt) + dist * Vector((math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e)))

def key_cam(cam, aim, foc, f, tgt, az, el, dist, focus, fstop, lens=None):
    cam.location = sph(tgt, az, el, dist); cam.keyframe_insert('location', frame=f)
    aim.location = tgt; aim.keyframe_insert('location', frame=f)
    foc.location = focus; foc.keyframe_insert('location', frame=f)
    cam.data.dof.aperture_fstop = fstop; cam.data.dof.keyframe_insert('aperture_fstop', frame=f)
    if lens:
        cam.data.lens = lens; cam.data.keyframe_insert('lens', frame=f)

def set_interp(idblock, kind='BEZIER', handle='AUTO_CLAMPED', easing=None):
    ad = idblock.animation_data
    if not ad or not ad.action:
        return
    for fc in ad.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = kind
            if kind == 'BEZIER':
                kp.handle_left_type = handle; kp.handle_right_type = handle
            if easing:
                kp.easing = easing

# ------------------------------------------------------------------ sahne
def build():
    clean()
    sc = bpy.context.scene
    sc.unit_settings.system = 'METRIC'
    # malzemeler
    if 'flatleather' in PROF:
        globals()['mat_leather'] = lambda name, *a, **k: mat_simple(name, COVER_LIN, 0.55)
    MATS['deri'] = mat_leather('deri')
    obj_map = (1.0 / (XF - JW), 1.0 / HB, -JW / (XF - JW), 0.5)
    MATS['kapak'] = mat_leather('kapak', load_img('kapak_maske.png', True), load_img('kapak_maske_blur.png', True),
                                'obj', obj_map)
    MATS['kenar'] = mat_page_edge('sayfa_kenar')
    MATS['s81'] = mat_page('sayfa81', load_img('sayfa81.png'), glow=True)
    MATS['s80'] = mat_page('sayfa80', load_img('sayfa80.png'))
    MATS['yaprak'] = mat_page('yaprak', load_img('yaprak.png'), mirror_back=True)
    MATS['kapital'] = mat_headband('kapitalbent')
    MATS['kurdele'] = mat_ribbon('kurdele')
    MATS['ceviz'] = mat_walnut_img('ceviz') if os.path.exists(CEVIZ_DAT) else mat_walnut('ceviz')
    MATS['toz'] = mat_simple('toz', (0.95, 0.9, 0.8), 0.5, (1.0, 0.86, 0.62), 0.03)
    MATS['duvar'] = mat_simple('duvar', (0.035, 0.022, 0.015), 0.9)

    # --- masa
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0.1, 0.35, 0.0))
    desk = bpy.context.active_object; desk.name = 'masa'
    desk.scale = (2.4, 2.5, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    # masa on kenari (kalinlik, gorunmez ama golge/yansima tutarli)
    desk.data.materials.append(MATS['ceviz'] if 'flatdesk' not in PROF else mat_simple('d', (0.04, 0.02, 0.01), 0.4))
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0.3, 1.6, 0.6), rotation=(math.radians(90), 0, 0))
    wall = bpy.context.active_object; wall.name = 'duvar'; wall.scale = (4.0, 1.6, 1.0)
    wall.data.materials.append(MATS['duvar'])

    # --- ana kitap
    book = build_book('', T, load_img('sirt_maske.png', True), load_img('sirt_maske_blur.png', True), main=True)
    pivot = empty('mentese', (0.0, 0.0, PIVOT_Z))
    for k in ('front', 'joint_f', 'left'):
        parent_keep(book[k], pivot)
    lsk = left_gutter_key(book['left'], pivot, TH_OPEN, book['gutter_pt'], book['xsp'], book['zl0'])
    rib = ribbon('kurdele'); rib.data.materials.append(MATS['kurdele'])
    # ucusan yapraklar
    leaves = []
    for k in range(3):
        pz = book['zr'] + 0.00008 * (k + 1)
        lp = empty(f'yaprak_mentese{k}', (book['xsp'](book['zr']) + 0.0012, 0.0, pz))
        lf = leaf_obj(f'yaprak{k}', k)
        lf.location = lp.location
        lf.data.materials.append(MATS['yaprak'])
        parent_keep(lf, lp)
        sd = lf.modifiers.new('bukum', 'SIMPLE_DEFORM'); sd.deform_method = 'BEND'; sd.deform_axis = 'Y'
        sd.origin = lp
        sd.angle = 0.0
        leaves.append((lp, lf, sd))

    # --- diger ciltler (arka plan)
    vols = []
    vcoll = bpy.data.collections.new('ciltler'); sc.collection.children.link(vcoll)
    v_az = -26.0
    vdir = Vector((-math.sin(math.radians(v_az)), math.cos(math.radians(v_az)), 0.0))
    row = Vector((vdir.y, -vdir.x, 0.0))
    origin = Vector((0.085, 0.0, 0.0)) + vdir * 0.34 - row * 0.040
    cur = 0.0
    for k, vinfo in enumerate(PRM['volumes']):
        tk = vinfo['thick'] / 1000.0
        parts = build_book(f'cilt{k}_', tk, load_img(f'cilt{k}_maske.png', True), None, main=False, coll=vcoll)
        e = empty(f'cilt{k}')
        M = Matrix(((vdir.x, 0.0, row.x), (vdir.y, 0.0, row.y), (0.0, 1.0, 0.0)))
        lean = 0.0
        e.matrix_world = Matrix.Translation(origin + row * cur + Vector((0, 0, HB / 2 + 0.0005))) @ M.to_4x4()
        bpy.context.view_layer.update()
        for o in vcoll.objects:
            if o.name.startswith(f'cilt{k}_') and o.parent is None:
                o.parent = e
        cur += tk + 0.0025
        vols.append(e)
    # sola dogru biraz yatik son cilt
    # --- toz
    dz = dust('toz', (-0.18, -0.12, 0.07), (0.22, 0.30, 0.45), 90, 7)

    # --- isiklar
    def area(name, loc, tgt, size, energy, color, shape='DISK', spread=None, size_y=None):
        L = bpy.data.lights.new(name, 'AREA'); L.shape = shape; L.size = size
        if size_y: L.size_y = size_y
        L.energy = energy; L.color = color
        if spread: L.spread = math.radians(spread)
        o = link(bpy.data.objects.new(name, L)); o.location = loc
        d = (Vector(tgt) - Vector(loc)).normalized()
        o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        o.visible_camera = False
        return o
    key = area('anahtar', (-0.50, 0.40, 0.80), (0.12, 0.06, 0.0), 0.42, 3.0, (1.0, 0.88, 0.78), 'DISK', 28)
    fill = area('dolgu', (0.95, -0.55, 0.45), (0.08, 0.0, 0.03), 1.1, 0.35, (0.72, 0.82, 1.0), 'DISK')
    rim = area('kontur', (0.35, 0.85, 0.30), (0.08, 0.0, 0.03), 0.5, 2.5, (1.0, 0.86, 0.70), 'DISK', 70)
    back = area('arka', (0.3, 1.3, 0.9), (0.3, 1.6, 0.4), 1.0, 1.2, (1.0, 0.75, 0.5), 'DISK', 90)
    sweep = area('parilti', (0, 0, 1), (0.08, 0, 0.04), 0.9, 0.0, (1.0, 0.9, 0.75), 'RECTANGLE', None, 0.035)
    for o in (sweep,):
        o.visible_diffuse = False; o.visible_transmission = False; o.visible_volume_scatter = False
    lk = bpy.data.collections.new('parilti_alici')
    lk.objects.link(book['front']); lk.objects.link(book['spine'])
    sweep.light_linking.receiver_collection = lk
    vl = area('cilt_isik', (-0.35, -0.25, 0.55), (0.25, 0.42, 0.12), 0.6, 1.6, (1.0, 0.88, 0.76), 'DISK', 60)
    vrc = bpy.data.collections.new('cilt_alici')
    vrc.children.link(vcoll); vrc.objects.link(book['spine'])
    vl.light_linking.receiver_collection = vrc
    # on dolgu: yalniz kitaba (sayfa kenarlari / sirt golgede kapkara kalmasin)
    fr = area('on_dolgu', (0.02, -0.95, 0.30), (0.08, 0.0, 0.02), 0.9, 0.5, (0.95, 0.93, 1.0), 'DISK')
    frc = bpy.data.collections.new('on_dolgu_alici')
    for k in ('right', 'left', 'spine', 'front', 'back', 'joint_f', 'joint_b'):
        frc.objects.link(book[k])
    frc.objects.link(rib)
    fr.light_linking.receiver_collection = frc
    # sayfa isigi (parlama icin cevreye sicak isik)
    glowL = bpy.data.lights.new('sayfa_isik', 'POINT'); glowL.shadow_soft_size = 0.05
    glowL.energy = 0.0; glowL.color = (1.0, 0.80, 0.55)
    glowO = link(bpy.data.objects.new('sayfa_isik', glowL)); glowO.location = (0.085, 0.0, book['zr'] + 0.035)
    glowO.visible_camera = False; glowO.visible_glossy = False

    # --- dunya
    w = bpy.data.worlds.new('dunya'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.006, 0.0045, 0.0035, 1); bg.inputs[1].default_value = 1.0

    # --- kamera
    camd = bpy.data.cameras.new('kamera'); camd.lens = 50; camd.sensor_width = 36; camd.sensor_fit = 'AUTO'
    camd.clip_start = 0.01; camd.clip_end = 20
    cam = link(bpy.data.objects.new('kamera', camd)); sc.camera = cam
    aim = empty('hedef'); foc = empty('odak')
    tr = cam.constraints.new('TRACK_TO'); tr.target = aim; tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'
    camd.dof.use_dof = True; camd.dof.focus_object = foc; camd.dof.aperture_blades = 7
    camd.dof.aperture_rotation = math.radians(10)

    S = dict(sc=sc, book=book, pivot=pivot, leaves=leaves, vols=vols, vcoll=vcoll, dust=dz, cam=cam, aim=aim,
             foc=foc, key=key, fill=fill, rim=rim, sweep=sweep, glowL=glowL, glowO=glowO, lsk=lsk,
             rib=rib, desk=desk)
    return S

# ------------------------------------------------------------------ animasyon
def glow_node():
    return MATS['s81'].node_tree.nodes['GLOW'].outputs[0]

def key_glow(f, v, S, light=None):
    g = glow_node(); g.default_value = v
    g.keyframe_insert('default_value', frame=f)
    S['glowL'].energy = (light if light is not None else v * 0.12)
    S['glowL'].keyframe_insert('energy', frame=f)

def key_open(S, f, th):
    S['pivot'].rotation_euler = (0.0, -math.radians(th), 0.0)
    S['pivot'].keyframe_insert('rotation_euler', frame=f)

def key_sk(sk, f, v):
    sk.value = v; sk.keyframe_insert('value', frame=f)

def sweep_path(S, cam_pos, f0, f1, p_start, p_end, dist=0.7, energy=55.0):
    sw = S['sweep']
    cz = T
    for f in range(f0, f1 + 1, 2):
        t = (f - f0) / max(1, (f1 - f0))
        t = t * t * (3 - 2 * t)
        p = Vector(p_start).lerp(Vector(p_end), t)
        d = p - Vector(cam_pos); d.z = -d.z
        d.normalize()
        L = p + d * dist
        sw.location = L
        z_ax = (L - p).normalized()
        strip = (Vector(p_end) - Vector(p_start)).normalized()
        x_ax = strip.cross(Vector((0, 0, 1))).normalized()
        x_ax = (x_ax - z_ax * x_ax.dot(z_ax)).normalized()
        y_ax = z_ax.cross(x_ax)
        sw.rotation_euler = Matrix((x_ax, y_ax, z_ax)).transposed().to_euler()
        sw.keyframe_insert('location', frame=f); sw.keyframe_insert('rotation_euler', frame=f)
    L = sw.data
    for f, e in ((f0 - 1, 0.0), (f0 + 1, energy), (f1 - 2, energy), (f1, 0.0)):
        L.energy = e; L.keyframe_insert('energy', frame=f)

TEXT_C = (0.0835, -0.004, 0.0)

def anim_intro(S):
    sc = S['sc']; sc.frame_start = 0; sc.frame_end = INTRO_N - 1
    book = S['book']
    zr = book['zr']
    for o in S['vcoll'].all_objects:
        o.hide_render = True
    # kapak acilisi 0.35s -> 1.25s  (kare 10.5 -> 37.5)
    key_open(S, 0, 0.0); key_open(S, 10, 0.0)
    key_open(S, 37, TH_OPEN); key_open(S, 40, TH_OPEN - 1.6); key_open(S, 44, TH_OPEN)
    set_interp(S['pivot'])
    rsk = book['right'].data.shape_keys.key_blocks['acik']
    key_sk(rsk, 12, 0.0); key_sk(rsk, 36, 1.0)
    key_sk(S['lsk'], 26, 0.0); key_sk(S['lsk'], 37, 1.0)
    set_interp(book['right'].data.shape_keys); set_interp(book['left'].data.shape_keys)
    # yapraklar
    timings = [(15, 27, 41), (18, 31, 45), (21, 35, 49)]
    for (lp, lf, sd), (fa, fm, fl) in zip(S['leaves'], timings):
        th_end = TH_OPEN - 4.0
        for f, th, bend in ((0, 0, 0), (fa, 0, 0), (fa + 4, 18, 22), (fm, 95, 38), (fm + 5, 150, -10),
                            (fl - 3, th_end - 6, -26), (fl, th_end, -4)):
            lp.rotation_euler = (0.0, -math.radians(th), 0.0); lp.keyframe_insert('rotation_euler', frame=f)
            sd.angle = math.radians(bend); sd.keyframe_insert('angle', frame=f)
        g = book['gutter_pt']
        p0 = lp.location.copy()
        lp.keyframe_insert('location', frame=12)
        lp.location = (g.x, 0.0, g.z + 0.0002 * (S['leaves'].index((lp, lf, sd)) + 1))
        lp.keyframe_insert('location', frame=36)
        lf.hide_render = False; lf.keyframe_insert('hide_render', frame=0)
        lf.hide_render = True; lf.keyframe_insert('hide_render', frame=fl + 1)
        set_interp(lp); set_interp(lf)
        for fc in lf.animation_data.action.fcurves:
            if fc.data_path == 'hide_render':
                for kp in fc.keyframe_points: kp.interpolation = 'CONSTANT'
    # parlama
    key_glow(0, 0.0, S); key_glow(30, 0.0, S); key_glow(37, 0.02, S); key_glow(52, 0.025, S)
    key_glow(62, 0.04, S); key_glow(67, 0.10, S); key_glow(70, 0.32, S); key_glow(73, 0.9, S); key_glow(76, 2.0, S)
    key_glow(78, 2.9, S); key_glow(80, 3.8, S)
    set_interp(MATS['s81'].node_tree); set_interp(S['glowL'])
    # kamera
    cam, aim, foc = S['cam'], S['aim'], S['foc']
    cover_c = (0.0885, 0.0, T)
    tx = TEXT_C
    key_cam(cam, aim, foc, 0, (0.078, -0.014, 0.030), 21.0, 58.0, 0.70, cover_c, 7.1)
    key_cam(cam, aim, foc, 10, (0.078, -0.014, 0.030), 20.0, 58.5, 0.685, cover_c, 7.1)
    key_cam(cam, aim, foc, 37, (0.060, 0.000, 0.030), 12.0, 63.0, 0.64, (0.08, 0.0, zr), 6.3)
    key_cam(cam, aim, foc, 58, (tx[0], tx[1] - 0.002, zr), 3.0, 77.0, 0.45, (tx[0], tx[1], zr), 7.1)
    key_cam(cam, aim, foc, 69, (tx[0], tx[1] - 0.004, zr), 0.8, 81.0, 0.35, (tx[0], tx[1], zr), 8.0)
    key_cam(cam, aim, foc, 80, (0.085, -0.004, zr), 0.0, 84.0, 0.265, (0.085, 0.0, zr), 8.0)
    for ob in (cam, aim, foc):
        set_interp(ob)
    set_interp(cam.data)
    # altin uzerinde isik suzulmesi (0 - 0.4s)
    cp = sph((0.078, -0.014, 0.030), 21.0, 58.0, 0.70)
    sweep_path(S, cp, 0, 13, (0.03, 0.10, T), (0.16, -0.10, T), 0.7, 6.0)

def anim_outro(S):
    sc = S['sc']; sc.frame_start = 0; sc.frame_end = OUTRO_N - 1
    book = S['book']; zr = book['zr']
    for lp, lf, sd in S['leaves']:
        lf.hide_render = True
    # kapak kapanisi (eased)  kare 28 -> 72
    key_open(S, 0, TH_OPEN); key_open(S, 28, TH_OPEN); key_open(S, 72, 0.0)
    set_interp(S['pivot'])
    rsk = book['right'].data.shape_keys.key_blocks['acik']
    key_sk(rsk, 0, 1.0); key_sk(rsk, 30, 1.0); key_sk(rsk, 68, 0.0)
    key_sk(S['lsk'], 0, 1.0); key_sk(S['lsk'], 28, 1.0); key_sk(S['lsk'], 38, 0.0)
    set_interp(book['right'].data.shape_keys); set_interp(book['left'].data.shape_keys)
    key_glow(0, 3.8, S); key_glow(5, 2.2, S); key_glow(10, 0.9, S); key_glow(15, 0.3, S); key_glow(21, 0.08, S)
    key_glow(30, 0.025, S)
    key_glow(48, 0.0, S)
    set_interp(MATS['s81'].node_tree); set_interp(S['glowL'])
    cam, aim, foc = S['cam'], S['aim'], S['foc']
    tx = TEXT_C
    cover_c = (0.088, 0.0, T)
    fin_t = (0.080, -0.078, 0.012)
    key_cam(cam, aim, foc, 0, (0.085, -0.004, zr), 0.0, 84.0, 0.265, (0.085, 0.0, zr), 8.0)
    key_cam(cam, aim, foc, 18, (tx[0], tx[1] - 0.006, zr), -1.5, 80.0, 0.35, (tx[0], tx[1], zr), 7.1)
    key_cam(cam, aim, foc, 48, (0.070, -0.040, 0.025), -14.0, 56.0, 0.55, (0.08, 0.0, 0.035), 5.0)
    key_cam(cam, aim, foc, 78, fin_t, -26.0, 33.0, 0.70, cover_c, 3.2)
    key_cam(cam, aim, foc, 129, (fin_t[0] + 0.004, fin_t[1], fin_t[2]), -24.3, 32.2, 0.675, cover_c, 3.2)
    for ob in (cam, aim, foc):
        set_interp(ob)
    set_interp(cam.data)
    # kapandiktan sonra baslikta yumusak parilti
    cp = sph(fin_t, -25.0, 32.6, 0.69)
    sweep_path(S, cp, 84, 120, (0.02, 0.09, T), (0.17, -0.08, T), 0.8, 4.0)

def setup_hero(S):
    sc = S['sc']; sc.frame_start = 0; sc.frame_end = 0
    for lp, lf, sd in S['leaves']:
        lf.hide_render = True
    S['pivot'].rotation_euler = (0, 0, 0)
    cam, aim, foc = S['cam'], S['aim'], S['foc']
    ht = (0.090, -0.012, 0.030)
    cam.location = sph(ht, -19.0, 37.0, 0.67)
    aim.location = ht
    foc.location = (0.088, -0.01, T)
    cam.data.dof.aperture_fstop = 3.2

# ------------------------------------------------------------------ render ayarlari
def render_setup(S, samples):
    sc = S['sc']
    r = sc.render
    r.engine = 'CYCLES'
    cy = sc.cycles
    cy.device = 'CPU'
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.035
    cy.adaptive_min_samples = 0
    cy.use_denoising = True
    cy.denoiser = 'OPENIMAGEDENOISE'
    cy.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    DNQ = arg('--dnq', 'BALANCED')
    try:
        cy.denoising_prefilter = 'ACCURATE' if DNQ == 'HIGH' else 'FAST'
        cy.denoising_quality = DNQ
    except Exception as e:
        print('denoise opt', e)
    cy.max_bounces = 6; cy.diffuse_bounces = 2; cy.glossy_bounces = 3
    cy.transmission_bounces = 2; cy.transparent_max_bounces = 4; cy.volume_bounces = 0
    cy.caustics_reflective = False; cy.caustics_refractive = False
    cy.blur_glossy = 1.0
    cy.sample_clamp_indirect = 6.0
    cy.use_light_tree = True
    r.threads_mode = 'FIXED'; r.threads = THREADS
    r.use_persistent_data = True
    r.resolution_x = 1080; r.resolution_y = 1920; r.resolution_percentage = PCT
    r.fps = FPS
    r.use_motion_blur = SHOT != 'hero' and 'nomb' not in PROF
    if 'nodof' in PROF: S['cam'].data.dof.use_dof = False
    if 'nodn' in PROF: cy.use_denoising = False
    if 'lowb' in PROF:
        cy.max_bounces = 3; cy.diffuse_bounces = 1; cy.glossy_bounces = 1; cy.transparent_max_bounces = 2
    r.motion_blur_shutter = 0.5
    r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'; r.image_settings.color_depth = '8'
    r.film_transparent = False
    BORDER = arg('--border', None)   # "x0,y0,x1,y1" piksel (1080x1920, ust-sol orijin) - test icin bolge render
    if BORDER:
        x0, y0, x1, y1 = [float(v) for v in BORDER.split(',')]
        r.use_border = True; r.use_crop_to_border = True
        r.border_min_x, r.border_max_x = x0 / 1080, x1 / 1080
        r.border_min_y, r.border_max_y = 1 - y1 / 1920, 1 - y0 / 1920
    vs = sc.view_settings
    vs.view_transform = 'AgX'
    try:
        vs.look = 'AgX - Medium High Contrast'
    except Exception:
        pass
    vs.exposure = 0.0
    # compositor: hafif bloom
    sc.use_nodes = True
    nt = sc.node_tree
    nt.nodes.clear()
    rl = nt.nodes.new('CompositorNodeRLayers')
    comp = nt.nodes.new('CompositorNodeComposite')
    gl = nt.nodes.new('CompositorNodeGlare')
    try:
        gl.glare_type = 'BLOOM'
    except Exception:
        gl.glare_type = 'FOG_GLOW'
    gl.quality = 'HIGH'
    gl.inputs['Threshold'].default_value = 1.6
    gl.inputs['Strength'].default_value = 0.35
    gl.inputs['Size'].default_value = 0.6
    nt.links.new(rl.outputs['Image'], gl.inputs['Image'])
    nt.links.new(gl.outputs['Image'], comp.inputs['Image'])

def report_bbox(S, f):
    from bpy_extras.object_utils import world_to_camera_view
    sc = S['sc']; cam = S['cam']
    bpy.context.view_layer.update()
    def proj(pts):
        xs, ys = [], []
        for p in pts:
            c = world_to_camera_view(sc, cam, Vector(p))
            xs.append(c.x * 1080); ys.append((1 - c.y) * 1920)
        return f'x {min(xs):.0f}..{max(xs):.0f}  y {min(ys):.0f}..{max(ys):.0f}'
    box = [(x, y, z) for x in (-0.006, XF) for y in (-HB/2, HB/2) for z in (0, T)]
    pg = [(x, y, z) for x in (0.019, 0.142) for y in (HP/2 - 0.031, -HP/2 + 0.024) for z in (S['book']['zr'],)]
    print(f'[bbox] f{f} kitap {proj(box)} | metin {proj(pg)}', flush=True)

# ------------------------------------------------------------------ pisirme (bir kez)
def bake_all(res_desk=8192):
    clean()
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
    sc.render.threads_mode = 'FIXED'; sc.render.threads = THREADS
    def do_bake(ob, mat, w, h, path, noncolor):
        ob.data.materials.clear(); ob.data.materials.append(mat)
        img = bpy.data.images.new(os.path.basename(path), w, h, alpha=False, float_buffer=False)
        if noncolor:
            img.colorspace_settings.name = 'Non-Color'
        nd = mat.node_tree.nodes.new('ShaderNodeTexImage'); nd.image = img
        mat.node_tree.nodes.active = nd
        for o in sc.objects: o.select_set(False)
        ob.select_set(True); bpy.context.view_layer.objects.active = ob
        t0 = time.time()
        bpy.ops.object.bake(type='EMIT', margin=2)
        img.filepath_raw = path; img.file_format = 'PNG'; img.save()
        print(f'[bake] {path} {w}x{h} {time.time()-t0:.1f}s', flush=True)
    # masa
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0.1, 0.35, 0.0))
    desk = bpy.context.active_object; desk.scale = (2.4, 2.5, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    do_bake(desk, mat_walnut('ceviz_c', 'col'), res_desk, res_desk, CEVIZ_COL, False)
    do_bake(desk, mat_walnut('ceviz_d', 'dat'), res_desk, res_desk, CEVIZ_DAT, True)
    # deri: 0.18 x 0.24 m duzlem, nesne koordinatlari render ile ayni
    x0, x1, y0, y1 = -0.006, 0.174, -0.12, 0.12
    ob = mesh_obj('deri_bake', [(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0)], [(0, 1, 2, 3)])
    uvl = ob.data.uv_layers.new(name='UVMap')
    for li, uv in zip(range(4), [(0, 0), (1, 0), (1, 1), (0, 1)]):
        uvl.data[li].uv = uv
    m = bpy.data.materials.new('deri_b'); b = NB(m)
    crease, gh, n1f = leather_grain(b, b.texco().outputs['Object'], bake=True)
    cc = b.new('ShaderNodeCombineColor')
    b.link(crease, cc.inputs[0]); b.link(b.math('DIVIDE', b.math('ADD', gh, 0.6), 1.1), cc.inputs[1])
    b.link(n1f, cc.inputs[2])
    em = b.new('ShaderNodeEmission'); b.link(cc.outputs[0], em.inputs['Color']); b.out(em.outputs[0])
    do_bake(ob, m, 2400, 3200, LEATHER_BAKED, True)

# ------------------------------------------------------------------ main
def main():
    t0 = time.time()
    S = build()
    if SHOT == 'intro':
        anim_intro(S); samples = 40
    elif SHOT == 'outro':
        anim_outro(S); samples = 40
    else:
        setup_hero(S); samples = 192
    if SAMPLES:
        samples = SAMPLES
    render_setup(S, samples)
    print(f'[kitap] build {time.time()-t0:.1f}s  shot={SHOT} th_open={TH_OPEN:.2f} samples={samples} pct={PCT}')
    if SAVE:
        bpy.ops.wm.save_as_mainfile(filepath=SAVE)
    sc = S['sc']
    if FRAMES:
        os.makedirs(TESTDIR, exist_ok=True)
        for f in [int(x) for x in str(FRAMES).split(',')]:
            sc.frame_set(f)
            sc.render.filepath = os.path.join(TESTDIR, f'{SHOT}_{f:04d}.png')
            t1 = time.time()
            report_bbox(S, f)
            bpy.ops.render.render(write_still=True)
            print(f'[kitap] frame {f} {time.time()-t1:.1f}s -> {sc.render.filepath}', flush=True)
    elif ANIM:
        d = os.path.join(OUT, SHOT)
        os.makedirs(d, exist_ok=True)
        sc.render.filepath = os.path.join(d, '####')
        state = {'t': time.time()}
        def post(scene, *a):
            now = time.time()
            with open(os.path.join(OUT, 'render.log'), 'a') as lf:
                lf.write(f'{time.strftime("%H:%M:%S")} {SHOT} frame {scene.frame_current:04d} {now-state["t"]:.1f}s\n')
            state['t'] = now
        bpy.app.handlers.render_post.append(post)
        bpy.ops.render.render(animation=True)
    elif STILL or SHOT == 'hero':
        sc.frame_set(0)
        sc.render.filepath = os.path.join(OUT, 'hero_cover.png')
        bpy.ops.render.render(write_still=True)
    print(f'[kitap] done {time.time()-t0:.1f}s')

if BAKE:
    bake_all()
else:
    main()
