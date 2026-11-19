# Kapanış sahnesi (Blender / Cycles): ceviz okuma masasında, gerçekçi Risale-i Nur Külliyatı ve Kur'an-ı Kerim.
# Diziliş: 13 eser RNK sırasıyla dik ve hafif yay biçiminde (sırtları kameraya), Mektubat yaydan çıkarılmış ve önde
# ön kapağı üstte yatıyor (sırtındaki adı okunur, sayfaları arasından ipek kurdele sarkar); arkada ortada, ahşap bir
# sehpada dik duran fildişi deri, yaldızlı Kur'an-ı Kerim. Sol üstten pencere ışığı, sığ alan derinliği.
# Ciltler: çok açık, zarif, biraz soluk kırmızı ve açık kahverengi deriye çalan ton.
# Kullanım: blender -b -P sahne.py -- --doku /tmp/.../dokular --tex /tmp/.../tex --cikti /tmp/.../kare_ --ornek 64
#           [--kare 1] [--son 201] [--olcek 100] [--onizleme]
import bpy, bmesh, math, json, sys, os
from mathutils import Vector, Euler

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(ad, v=None):
    return argv[argv.index('--' + ad) + 1] if '--' + ad in argv else v
DOKU = arg('doku', '/tmp/claude-0/kapanis/dokular')
TEX = arg('tex', '/tmp/claude-0/kapanis/tex')
CIKTI = arg('cikti', '/tmp/claude-0/kapanis/kare_')
ORNEK = int(arg('ornek', '64'))
OLCEK = int(arg('olcek', '100'))
KARE0 = int(arg('kare', '1'))
KARE1 = int(arg('son', str(KARE0)))
KARE_SAYISI = int(arg('toplam', '201'))

# ---------------------------------------------------------------- temizlik ve render ayarları
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = ORNEK
sc.cycles.use_adaptive_sampling = True
sc.cycles.adaptive_threshold = 0.02
sc.cycles.use_denoising = True
sc.cycles.denoiser = 'OPENIMAGEDENOISE'
sc.cycles.max_bounces = 6
sc.cycles.diffuse_bounces = 3
sc.cycles.glossy_bounces = 3
sc.cycles.transparent_max_bounces = 4
sc.cycles.caustics_reflective = False
sc.cycles.caustics_refractive = False
sc.render.resolution_x = 1080
sc.render.resolution_y = 1920
sc.render.resolution_percentage = OLCEK
sc.render.film_transparent = False
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Medium High Contrast'
sc.view_settings.exposure = float(arg('pozlama', '-1.2'))
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_depth = '16'
sc.frame_start = 1
sc.frame_end = KARE_SAYISI
sc.render.fps = 30

def resim(ad, renkli=True):
    yol = os.path.join(TEX if not ad.startswith('/') else '', ad)
    img = bpy.data.images.load(yol, check_existing=True)
    if not renkli:
        img.colorspace_settings.name = 'Non-Color'
    return img

# ---------------------------------------------------------------- malzemeler
def dugum_agaci(mat):
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return nt, nt.nodes, nt.links

def kutu_doku(nodes, links, img, olcek, renkli=True):
    tc = nodes.new('ShaderNodeTexCoord')
    mp = nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (olcek, olcek, olcek)
    links.new(tc.outputs['Object'], mp.inputs['Vector'])
    t = nodes.new('ShaderNodeTexImage')
    t.image = img
    t.projection = 'BOX'
    t.projection_blend = 0.25
    links.new(mp.outputs['Vector'], t.inputs['Vector'])
    return t

DERI_RENK = (0.50, 0.292, 0.208)  # doğrusal (sRGB ~ #BC9482): çok açık, soluk kırmızı, açık kahve deriye çalan: çok açık, soluk kırmızı + açık kahve deri
def deri(ad, renk=DERI_RENK, yaldiz=None, yuk=None, yaldiz_renk=(0.92, 0.80, 0.62), yaldiz_metal=0.85, uv=False, olcek=4.2, cilali=0.1):
    mat = bpy.data.materials.new(ad)
    nt, nodes, links = dugum_agaci(mat)
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    dif = kutu_doku(nodes, links, resim('leather_white_Diffuse.jpg'), olcek)
    rgh = kutu_doku(nodes, links, resim('leather_white_Rough.jpg', False), olcek, False)
    nrm = kutu_doku(nodes, links, resim('leather_white_nor_gl.jpg', False), olcek, False)
    # renk: deri dokusunun parlaklık değişimini tonla çarp
    bw = nodes.new('ShaderNodeRGBToBW'); links.new(dif.outputs['Color'], bw.inputs['Color'])
    mr = nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.4; mr.inputs['From Max'].default_value = 0.9
    mr.inputs['To Min'].default_value = 0.8; mr.inputs['To Max'].default_value = 1.08
    links.new(bw.outputs['Val'], mr.inputs['Value'])
    ton = nodes.new('ShaderNodeRGB'); ton.outputs[0].default_value = (*renk, 1)
    carp = nodes.new('ShaderNodeMix'); carp.data_type = 'RGBA'; carp.blend_type = 'MULTIPLY'; carp.inputs['Factor'].default_value = 1.0
    links.new(ton.outputs[0], carp.inputs['A']); links.new(mr.outputs['Result'], carp.inputs['B'])
    rr = nodes.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = 0.42; rr.inputs['To Max'].default_value = 0.72
    links.new(rgh.outputs['Color'], rr.inputs['Value'])
    nm = nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.15
    links.new(nrm.outputs['Color'], nm.inputs['Color'])
    renk_cikis, prl_cikis, metal = carp.outputs['Result'], rr.outputs['Result'], None
    normal_cikis = nm.outputs['Normal']
    if yaldiz:
        uvn = nodes.new('ShaderNodeUVMap')
        my = nodes.new('ShaderNodeTexImage'); my.image = resim(yaldiz, False); my.interpolation = 'Cubic'
        links.new(uvn.outputs['UV'], my.inputs['Vector'])
        yy = nodes.new('ShaderNodeTexImage'); yy.image = resim(yuk, False); yy.interpolation = 'Cubic'
        links.new(uvn.outputs['UV'], yy.inputs['Vector'])
        # yaldız: renk / metal / pürüz karışımı
        ycol = nodes.new('ShaderNodeRGB'); ycol.outputs[0].default_value = (*yaldiz_renk, 1)
        mix = nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
        links.new(my.outputs['Color'], mix.inputs['Factor']); links.new(renk_cikis, mix.inputs['A']); links.new(ycol.outputs[0], mix.inputs['B'])
        renk_cikis = mix.outputs['Result']
        mixr = nodes.new('ShaderNodeMix'); mixr.data_type = 'FLOAT'
        links.new(my.outputs['Color'], mixr.inputs['Factor']); links.new(prl_cikis, mixr.inputs['A']); mixr.inputs['B'].default_value = 0.3
        prl_cikis = mixr.outputs['Result']
        mixm = nodes.new('ShaderNodeMath'); mixm.operation = 'MULTIPLY'; mixm.inputs[1].default_value = yaldiz_metal
        links.new(my.outputs['Color'], mixm.inputs[0])
        metal = mixm.outputs['Value']
        bump = nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.85; bump.inputs['Distance'].default_value = 0.0012
        links.new(yy.outputs['Color'], bump.inputs['Height']); links.new(nm.outputs['Normal'], bump.inputs['Normal'])
        normal_cikis = bump.outputs['Normal']
    links.new(renk_cikis, bsdf.inputs['Base Color'])
    links.new(prl_cikis, bsdf.inputs['Roughness'])
    if metal is not None:
        links.new(metal, bsdf.inputs['Metallic'])
    links.new(normal_cikis, bsdf.inputs['Normal'])
    bsdf.inputs['Coat Weight'].default_value = cilali
    bsdf.inputs['Coat Roughness'].default_value = 0.35
    bsdf.inputs['Sheen Weight'].default_value = 0.15
    return mat

def kagit(ad, renk=(0.86, 0.80, 0.66), yaldizli=False):
    mat = bpy.data.materials.new(ad)
    nt, nodes, links = dugum_agaci(mat)
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    tc = nodes.new('ShaderNodeTexCoord')
    wv = nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'X'
    wv.inputs['Scale'].default_value = 900; wv.inputs['Distortion'].default_value = 2.0; wv.inputs['Detail'].default_value = 3
    links.new(tc.outputs['Object'], wv.inputs['Vector'])
    mr = nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = 0.9; mr.inputs['To Max'].default_value = 1.0
    links.new(wv.outputs['Fac'], mr.inputs['Value'])
    ton = nodes.new('ShaderNodeRGB'); ton.outputs[0].default_value = (*renk, 1)
    carp = nodes.new('ShaderNodeMix'); carp.data_type = 'RGBA'; carp.blend_type = 'MULTIPLY'; carp.inputs['Factor'].default_value = 1.0
    links.new(ton.outputs[0], carp.inputs['A']); links.new(mr.outputs['Result'], carp.inputs['B'])
    links.new(carp.outputs['Result'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.4 if yaldizli else 0.85
    bsdf.inputs['Metallic'].default_value = 0.65 if yaldizli else 0.0
    bump = nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.25
    links.new(wv.outputs['Fac'], bump.inputs['Height']); links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat

def ahsap(ad, koyu=1.0, olcek=1.2):
    mat = bpy.data.materials.new(ad)
    nt, nodes, links = dugum_agaci(mat)
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    dif = kutu_doku(nodes, links, resim('european_walnut_veneer_04_Diffuse.jpg'), olcek)
    rgh = kutu_doku(nodes, links, resim('european_walnut_veneer_04_Rough.jpg', False), olcek, False)
    nrm = kutu_doku(nodes, links, resim('european_walnut_veneer_04_nor_gl.jpg', False), olcek, False)
    hsv = nodes.new('ShaderNodeHueSaturation'); hsv.inputs['Value'].default_value = koyu; hsv.inputs['Saturation'].default_value = 1.3
    links.new(dif.outputs['Color'], hsv.inputs['Color']); links.new(hsv.outputs['Color'], bsdf.inputs['Base Color'])
    rr = nodes.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = 0.36; rr.inputs['To Max'].default_value = 0.66
    links.new(rgh.outputs['Color'], rr.inputs['Value']); links.new(rr.outputs['Result'], bsdf.inputs['Roughness'])
    nm = nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0
    links.new(nrm.outputs['Color'], nm.inputs['Color']); links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Coat Weight'].default_value = 0.06
    bsdf.inputs['Coat Roughness'].default_value = 0.25
    return mat

def ipek(ad, renk):
    mat = bpy.data.materials.new(ad)
    nt, nodes, links = dugum_agaci(mat)
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    bsdf.inputs['Base Color'].default_value = (*renk, 1)
    bsdf.inputs['Roughness'].default_value = 0.72
    bsdf.inputs['Sheen Weight'].default_value = 0.12
    bsdf.inputs['Sheen Tint'].default_value = (*renk, 1)
    bsdf.inputs['Specular IOR Level'].default_value = 0.12
    return mat

# ---------------------------------------------------------------- geometri yardımcıları
def nesne(ad, mesh, mat=None, parent=None):
    ob = bpy.data.objects.new(ad, mesh)
    sc.collection.objects.link(ob)
    if mat:
        ob.data.materials.append(mat)
    if parent:
        ob.parent = parent
    return ob

def kutu(ad, x0, x1, y0, y1, z0, z1, mat, parent=None, pah=0.0008):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = x0 + (v.co.x + 0.5) * (x1 - x0)
        v.co.y = y0 + (v.co.y + 0.5) * (y1 - y0)
        v.co.z = z0 + (v.co.z + 0.5) * (z1 - z0)
    me = bpy.data.meshes.new(ad)
    bm.to_mesh(me); bm.free()
    ob = nesne(ad, me, mat, parent)
    if pah > 0:
        bv = ob.modifiers.new('pah', 'BEVEL'); bv.width = pah; bv.segments = 3; bv.limit_method = 'NONE'
    for p in me.polygons:
        p.use_smooth = True
    return ob

def bos(ad, konum=(0, 0, 0), don=(0, 0, 0)):
    e = bpy.data.objects.new(ad, None)
    sc.collection.objects.link(e)
    e.location = konum
    e.rotation_euler = don
    return e

def kitap(ad, T, sirt_mat, deri_mat, kagit_mat, H=0.24, D=0.17, konum=(0, 0, 0), don=(0, 0, 0)):
    """Yerel: x kalınlık (-T/2..T/2), y derinlik (sırt y≈0, ön kesim y=D), z boy (0..H). Sırt -y'ye bakar."""
    kok = bos('kitap-' + ad, konum, don)
    c = 0.0028  # kapak kalınlığı
    s = 0.003   # kapak taşması
    b = min(0.0075, T * 0.16)  # sırt kabarıklığı
    # kapaklar
    kutu(ad + '-kapak-on', T / 2 - c, T / 2, 0.003, D, 0, H, deri_mat, kok)
    kutu(ad + '-kapak-arka', -T / 2, -T / 2 + c, 0.003, D, 0, H, deri_mat, kok)
    # sayfa bloğu
    kutu(ad + '-sayfa', -T / 2 + c + 0.0004, T / 2 - c - 0.0004, 0.004, D - s, s, H - s, kagit_mat, kok, pah=0.0004)
    # yuvarlak sırt: yarım elips yüzey, UV: u yay boyunca, v boy
    bm = bmesh.new()
    N = 28
    satirlar = []
    uv_l = bm.loops.layers.uv.new('UVMap')
    for zi, z in enumerate([0.0, H]):
        sat = []
        for i in range(N + 1):
            f = -math.pi / 2 + math.pi * i / N
            x = (T / 2) * math.sin(f)
            y = 0.004 - b * math.cos(f)
            sat.append(bm.verts.new((x, y, z)))
        satirlar.append(sat)
    for i in range(N):
        v = [satirlar[0][i], satirlar[0][i + 1], satirlar[1][i + 1], satirlar[1][i]]
        fc = bm.faces.new(v)
        for lp in fc.loops:
            vi = satirlar[0].index(lp.vert) if lp.vert in satirlar[0] else satirlar[1].index(lp.vert)
            vz = 0.0 if lp.vert in satirlar[0] else 1.0
            lp[uv_l].uv = (vi / N, vz)
    me = bpy.data.meshes.new(ad + '-sirt')
    bm.normal_update()
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    sirt = nesne(ad + '-sirt', me, sirt_mat, kok)
    so = sirt.modifiers.new('kalinlik', 'SOLIDIFY'); so.thickness = 0.0024; so.offset = -1.0  # kabuk içe: sırt kapakların dışına taşmaz
    # sırt ile kapaklar arasında hafif oluk (eklem): ince koyu silindirler
    return kok

# ---------------------------------------------------------------- sahne
kitaplar = json.load(open(os.path.join(DOKU, 'kitaplar.json')))
deri_mat = deri('deri-kapak')
kagit_mat = kagit('sayfa')
masa_mat = ahsap('ceviz', 0.24, 2.2)
sehpa_mat = ahsap('ceviz-koyu', 0.38, 4.0)

# masa
bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0.6, 0))
masa = bpy.context.active_object
masa.data.materials.append(masa_mat)

# arka duvar (çok uzakta, bulanık; sıcak, açık)
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 3.2, 1.5), rotation=(math.radians(90), 0, 0))
duvar = bpy.context.active_object
dm = bpy.data.materials.new('duvar'); nt, nodes, links = dugum_agaci(dm)
o = nodes.new('ShaderNodeOutputMaterial'); bs = nodes.new('ShaderNodeBsdfPrincipled'); links.new(bs.outputs['BSDF'], o.inputs['Surface'])
bs.inputs['Base Color'].default_value = (0.075, 0.055, 0.042, 1); bs.inputs['Roughness'].default_value = 0.9
duvar.data.materials.append(dm)

# yay biçiminde dik ciltler (Mektubat hariç), RNK sırasıyla soldan sağa. Yayın merkezi ÖNDE (kamera tarafında):
# sırtlar yay üzerinde yan yana durur, ciltlerin arka uçları dışa doğru açılır; hiçbir cilt ötekinin içine girmez.
# Ciltler dik durur (yana eğilme yok; üst köşeler birbirine değmez).
R = 0.9
Y_ORTA = 0.06  # ortadaki cildin sırtının y'si
C = Vector((0.0, Y_ORTA - R, 0.0))
ara = 0.005
dizi = [k for k in kitaplar if k['id'] != 'mektubat']
toplam = sum(k['kalinlik'] / 1000 for k in dizi) + ara * (len(dizi) - 1)
aci_top = toplam / R
a = -aci_top / 2
import random
random.seed(7)
for k in dizi:
    T = k['kalinlik'] / 1000
    am = a + (T / 2) / R
    tn = random.uniform(0.965, 1.035)
    sm = deri('deri-sirt-' + k['id'], renk=(DERI_RENK[0] * tn, DERI_RENK[1] * tn * random.uniform(0.985, 1.015), DERI_RENK[2] * tn), yaldiz=os.path.join(DOKU, f"sirt-{k['id']}-yaldiz.png"), yuk=os.path.join(DOKU, f"sirt-{k['id']}-yuk.png"))
    poz = C + Vector((math.sin(am) * R, math.cos(am) * R, 0))
    poz.y += random.uniform(-0.0015, 0.0015)
    # sırt C'ye (kameraya) bakar: yerel -y → (-sin am, -cos am)  ⇒  z dönüşü -am
    kitap(k['id'], T, sm, deri_mat, kagit_mat, konum=poz, don=(0, 0, -am + random.uniform(-0.004, 0.004)))
    a += (T + ara) / R

# Mektubat: önde, ön kapağı üstte yatar; sırtı kameraya bakar, adı soldan sağa okunur
mk = next(k for k in kitaplar if k['id'] == 'mektubat')
Tm = mk['kalinlik'] / 1000
sm = deri('deri-sirt-mektubat', yaldiz=os.path.join(DOKU, 'sirt-mektubat-yaldiz.png'), yuk=os.path.join(DOKU, 'sirt-mektubat-yuk.png'))
MK_KONUM = (0.012, -0.195, Tm / 2)
mektubat = kitap('mektubat', Tm, sm, deri_mat, kagit_mat, konum=MK_KONUM, don=(0, math.radians(-90), math.radians(-8)))
# yerel z (boy) ekseni yatayda sola uzanır; kitabı ortala
mektubat.location.x += 0.12

# kurdele: sayfaların arasından, kitabın alt ucundan çıkıp masaya sarkan ipek şerit (kitabın yerel koordinatında:
# x kalınlık (+x ön kapak, yukarı), y derinlik, z boy (0: alt uç); masa yerel x = -Tm/2)
def kurdele():
    m = -Tm / 2 + 0.0006
    noktalar = [(0.0, 0.098, 0.03), (0.0, 0.1, -0.003), (-0.006, 0.104, -0.016), (m + 0.0012, 0.109, -0.03), (m, 0.114, -0.058), (m, 0.12, -0.085)]
    cu = bpy.data.curves.new('kurdele', 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(noktalar) - 1)
    for p, c in zip(sp.bezier_points, noktalar):
        p.co = c; p.handle_left_type = p.handle_right_type = 'AUTO'
    cu.extrude = 0.0055; cu.twist_mode = 'MINIMUM'
    ob = bpy.data.objects.new('kurdele', cu); sc.collection.objects.link(ob)
    ob.data.materials.append(ipek('ipek', (0.13, 0.012, 0.02)))
    return ob
kur = kurdele()
kur.parent = mektubat

# Kur'an-ı Kerim: fildişi deri, yaldızlı; arkada ortada ahşap sehpada dik
kuran_deri = deri('kuran-deri', renk=(0.010, 0.042, 0.024), cilali=0.2, olcek=9)
kuran_on = deri('kuran-on', renk=(0.010, 0.042, 0.024), yaldiz=os.path.join(DOKU, 'kuran-kapak-yaldiz.png'), yuk=os.path.join(DOKU, 'kuran-kapak-yuk.png'),
                yaldiz_renk=(0.95, 0.70, 0.30), yaldiz_metal=1.0, cilali=0.15, olcek=9)
kuran_kagit = kagit('kuran-sayfa', (0.92, 0.74, 0.42), yaldizli=True)
KW, KH, KT = 0.175, 0.245, 0.052
kuran = bos('kuran', (0.0, 0.42, 0.0757), (math.radians(-12), 0, 0))
# yerel: x en (-KW/2..KW/2), y kalınlık (ön kapak y=-KT/2), z boy
kutu('kuran-arka', -KW / 2, KW / 2, KT / 2 - 0.003, KT / 2, 0, KH, kuran_deri, kuran)
kutu('kuran-sayfa', -KW / 2 + 0.002, KW / 2 - 0.004, -KT / 2 + 0.003, KT / 2 - 0.003, 0.003, KH - 0.003, kuran_kagit, kuran)
kutu('kuran-sirt', -KW / 2 - 0.004, -KW / 2 + 0.003, -KT / 2, KT / 2, 0, KH, kuran_deri, kuran, pah=0.003)
# ön kapak: UV'li düzlem kutu
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
uvl = bm.loops.layers.uv.new('UVMap')
for v in bm.verts:
    v.co.x = -KW / 2 + (v.co.x + 0.5) * KW
    v.co.y = -KT / 2 + (v.co.y + 0.5) * 0.003
    v.co.z = (v.co.z + 0.5) * KH
for f in bm.faces:
    for lp in f.loops:
        lp[uvl].uv = ((lp.vert.co.x + KW / 2) / KW, lp.vert.co.z / KH)
me = bpy.data.meshes.new('kuran-on'); bm.to_mesh(me); bm.free()
on = nesne('kuran-on', me, kuran_on, kuran)
bv = on.modifiers.new('pah', 'BEVEL'); bv.width = 0.0009; bv.segments = 3
# sehpa: eğik sırt tahtası + ön dudak + taban
sehpa = bos('sehpa', (0.0, 0.46, -0.03))
kutu('sehpa-taban', -0.13, 0.13, -0.09, 0.07, 0.0, 0.10, sehpa_mat, sehpa, pah=0.004)
kutu('sehpa-dudak', -0.12, 0.12, -0.095, -0.07, 0.10, 0.118, sehpa_mat, sehpa, pah=0.003)
sirt_tahta = kutu('sehpa-sirt', -0.10, 0.10, -0.01, 0.005, 0.10, 0.36, sehpa_mat, sehpa, pah=0.003)
sirt_tahta.rotation_euler = (math.radians(-12), 0, 0)
sirt_tahta.location = (0, 0.02, 0.0)

# ---------------------------------------------------------------- ışık
w = sc.world = bpy.data.worlds.new('dunya')
w.use_nodes = True
wn = w.node_tree.nodes; wl = w.node_tree.links
for n in list(wn): wn.remove(n)
wo = wn.new('ShaderNodeOutputWorld'); bg = wn.new('ShaderNodeBackground'); env = wn.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(os.path.join(TEX, 'reading_room_4k.hdr'))
tc = wn.new('ShaderNodeTexCoord'); mp = wn.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, 0, math.radians(110))
wl.new(tc.outputs['Generated'], mp.inputs['Vector']); wl.new(mp.outputs['Vector'], env.inputs['Vector'])
wl.new(env.outputs['Color'], bg.inputs['Color']); wl.new(bg.outputs['Background'], wo.inputs['Surface'])
bg.inputs['Strength'].default_value = 0.09

def isik(ad, tip, konum, hedef, guc, boyut, renk):
    li = bpy.data.lights.new(ad, tip)
    li.energy = guc
    li.color = renk
    if tip == 'AREA':
        li.shape = 'RECTANGLE'; li.size = boyut; li.size_y = boyut * 0.7
    ob = bpy.data.objects.new(ad, li); sc.collection.objects.link(ob)
    ob.location = konum
    d = Vector(hedef) - Vector(konum)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob
isik('pencere', 'AREA', (-1.15, 0.0, 0.75), (0.05, 0.05, 0.1), 240, 0.9, (1.0, 0.88, 0.74))
isik('dolgu', 'AREA', (0.6, -1.0, 0.45), (0, 0.0, 0.1), 14, 1.6, (0.9, 0.94, 1.0))
isik('arka', 'AREA', (0.6, 1.0, 0.7), (0, 0.3, 0.15), 55, 0.7, (1.0, 0.84, 0.64))

duvar_isik = bpy.data.lights.new('duvar-isik', 'SPOT'); duvar_isik.energy = 380; duvar_isik.spot_size = math.radians(55); duvar_isik.spot_blend = 1.0
duvar_isik.color = (1.0, 0.82, 0.6); duvar_isik.shadow_soft_size = 0.5
dio = bpy.data.objects.new('duvar-isik', duvar_isik); sc.collection.objects.link(dio)
dio.location = (-0.6, 1.6, 2.4); dio.rotation_euler = (Vector((0.3, 3.2, 1.1)) - Vector((-0.6, 1.6, 2.4))).to_track_quat('-Z', 'Y').to_euler()

# ---------------------------------------------------------------- kamera (yavaş itme + odak kaydırma)
cam_d = bpy.data.cameras.new('kamera')
cam_d.sensor_fit = 'VERTICAL'; cam_d.sensor_height = 36.0
cam_d.lens = 58
cam_d.dof.use_dof = True
cam_d.dof.aperture_fstop = float(arg('fstop', '3.4'))
cam = bpy.data.objects.new('kamera', cam_d); sc.collection.objects.link(cam)
sc.camera = cam
hedef = bos('hedef', (0.0, 0.06, 0.10))
odak = bos('odak', (0.0, -0.17, 0.03))
tt = cam.constraints.new('TRACK_TO'); tt.target = hedef; tt.track_axis = 'TRACK_NEGATIVE_Z'; tt.up_axis = 'UP_Y'
cam_d.dof.focus_object = odak

def anahtar(ob, veri, kare):
    for k, v in veri.items():
        setattr(ob, k, v)
        ob.keyframe_insert(k, frame=kare)
anahtar(cam, {'location': (0.04, -1.16, 0.70)}, 1)
anahtar(cam, {'location': (0.008, -1.04, 0.63)}, KARE_SAYISI)
anahtar(hedef, {'location': (0.0, -0.02, 0.07)}, 1)
anahtar(hedef, {'location': (0.0, -0.03, 0.085)}, KARE_SAYISI)
# odak: önce Kur'an'a yakın (arka), sonra Külliyat ve önde Mektubat
anahtar(odak, {'location': (0.0, 0.20, 0.15)}, 1)
anahtar(odak, {'location': (0.0, 0.20, 0.15)}, 24)
anahtar(odak, {'location': (0.0, -0.16, 0.03)}, 110)
anahtar(odak, {'location': (0.0, -0.17, 0.03)}, KARE_SAYISI)
for ob in (cam, hedef, odak):
    if ob.animation_data and ob.animation_data.action:
        for fc in ob.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = 'BEZIER'; kp.easing = 'AUTO'

if '--sabit' in argv:
    for ob in (cam, hedef, odak):
        ob.animation_data_clear()
    cam.location = (0.03, -1.13, 0.675)
    hedef.location = (0.0, -0.02, 0.078)
    odak.location = (0.0, 0.29, 0.16) if arg('odak', 'kuran') == 'kuran' else (0.0, -0.165, 0.03)
bpy.ops.wm.save_as_mainfile(filepath='/tmp/claude-0/kapanis/kapanis.blend')
if '--onizleme' in argv or KARE0 > 0:
    for f in range(KARE0, KARE1 + 1):
        sc.frame_set(f)
        sc.render.filepath = f'{CIKTI}{f:04d}.png'
        bpy.ops.render.render(write_still=True)
