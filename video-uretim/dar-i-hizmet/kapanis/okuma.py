"""Kapanış çekimi (fotogerçekçi, bpy / Cycles): pencere kenarında okuma köşesi, gün batımında göl manzarası.

Sahne: ceviz bir çalışma masası geniş, beyaz boyalı ahşap çerçeveli bir pencerenin önünde. Pencereden sakin bir
göl, puslu tepeler ve alçak, ılık gün batımı ışığı (Poly Haven CC0 HDRI 'small_harbour_sunset', güneşi ayrılmış;
güneş, aynı yönden bir güneş lambası olarak yeniden konur: gölgeler manzarayla tutarlı). Güneş kadrajın solunda,
pencerenin sol kanadından girer; kayıt ve orta dikme gölgeleri masaya düşer.
Masada (okur bakışı): önde açık Lem'alar (10-11. sayfalar; 11. sayfada videodaki paragraf), solda arkada pencereye
yakın, güneşte, düz yatan Kur'an-ı Kerim (#144173 deri, beyaz hat ve tezhip; üstünde hiçbir şey yok, bir
aparata dayanmıyor), sağda arkada sırtları bize dönük üç Risale-i Nur (#D68661 deri, altın sırt yazıları),
solda önde bir ince belli çay bardağı. Sağ kenarda keten bir perde.

Eksenler: X sağ, Y pencereye doğru, Z yukarı. Masa üstü z = 0. Duvarın iç yüzü y = YW.

Kullanım (python3, bpy):
    python3 okuma.py test [json]   # düşük çözünürlüklü deneme (okuma/test/)
    python3 okuma.py kare1         # 1350x2400 büyük ilk kare + derinlik (npy) + bilgi.json
    python3 okuma.py son           # hareketin son karesi 1080x1920 (2.5D doğrulaması için)
"""
import json
import math
import os
import random
import sys
import time
import zlib

import bpy  # noqa: I001
import bmesh
from mathutils import Matrix, Vector

KOK = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, KOK)
import ayarlar as A  # noqa: E402
import sahne as S  # noqa: E402
import okuma_doku as OD  # noqa: E402

OKUMA = OD.OKUMA
DOKU = OD.DOKU
ESKI_DOKU = A.DOKU                # sırt dokuları (dokular.sirt_dokusu)
VARLIK = os.path.join(OKUMA, "varlik")
TEST = os.path.join(OKUMA, "test")
HDRI_AD = "small_harbour_sunset"

YW = 0.62                         # duvarın iç yüzü
DUVAR_K = 0.22                    # duvar kalınlığı
XL, XR, XM = -1.12, 0.42, -0.36   # pencere açıklığı solu, sağı ve orta dikme
ZB, ZT = -0.06, 1.58              # açıklığın altı (masa üstünün biraz altında) ve üstü
SILL_Z = -0.06                    # kasa alt kenarı (masanın arkasında, görünmez)

RISALE = "#D68661"            # hedef görünüm rengi (kullanıcı)
RISALE_ALBEDO = "#E47A47"     # render kalibrasyonu: gölgede/yarı ışıkta sırtlar ~#D68661 okunur
RISALE_KOYU = "#9E5A3C"
KURAN = "#144173"             # hedef görünüm rengi (kullanıcı)
KURAN_ALBEDO = "#06387F"
KURAN_KOYU = "#0B2A4D"

CFG = {
    "lens": 24.0,
    "kamera": [0.0, -0.42, 0.44],
    "pitch": -22.5,
    "yaw": 0.0,
    "roll": 0.0,
    "fstop": 2.8,
    "odak": [-0.05, 0.36, 0.05],
    "rx": 540, "ry": 960,
    "samples": 96, "esik": 0.03,
    "manzara_ofset": 38.0,        # pencere doğrultusu güneşin kaç derece sağında
    "hdri_guc": 1.0,
    "gunes_kat": 4.5,             # güneş lambası ışınımı = kat * ölçülen (pus ve kırpılma telafisi)
    "gunes_aci": 0.75,
    "gunes_renk": [1.0, 0.60, 0.30],
    "pozlama": -0.25,
    "look": "AgX - Medium High Contrast",
    "dolly": 0.035,
    "dolgu_guc": 60.0,
    "kaydir_v": -0.004,
}


def cfg_yukle(ek=None):
    c = dict(CFG)
    p = os.path.join(KOK, "okuma_ayar.json")
    if os.path.exists(p):
        c.update(json.load(open(p)))
    if ek:
        c.update(ek)
    return c


# ================================================================================================= malzemeler
def baski_malzeme(M, ad, png, u_bas, W, H, renk, koyu, tur="altin", kuran=False, yon=1.0):
    """Ön kapak: deri + (altın varak | beyaz baskı) maskesi. UV.x yol boyu (metre), UV.y yükseklik (metre).
    Doku U = yon * (u - u_bas) / W (yon=-1: ters yönde ilerleyen yol), V = z / H."""
    m = S.yeni_mat(ad)
    b = S.NB(m)
    tcx = b.n("ShaderNodeTexCoord", (-2200, -900))
    sep = b.n("ShaderNodeSeparateXYZ", (-2000, -900))
    b.l(tcx.outputs["UV"], sep.inputs["Vector"])
    mu = b.n("ShaderNodeMath", (-1800, -850), operation="MULTIPLY_ADD")
    mu.inputs[1].default_value = yon / W
    mu.inputs[2].default_value = -yon * u_bas / W
    b.l(sep.outputs["X"], mu.inputs[0])
    mv = b.n("ShaderNodeMath", (-1800, -1000), operation="MULTIPLY")
    mv.inputs[1].default_value = 1.0 / H
    b.l(sep.outputs["Y"], mv.inputs[0])
    cmb = b.n("ShaderNodeCombineXYZ", (-1600, -900))
    b.l(mu.outputs["Value"], cmb.inputs["X"])
    b.l(mv.outputs["Value"], cmb.inputs["Y"])
    im = b.n("ShaderNodeTexImage", (-1400, -900), image=S.resim(png), interpolation="Cubic", extension="CLIP")
    b.l(cmb.outputs["Vector"], im.inputs["Vector"])
    sp = b.n("ShaderNodeSeparateColor", (-1100, -900))
    b.l(im.outputs["Color"], sp.inputs["Color"])
    yas = b.n("ShaderNodeMath", (-900, -1100), operation="MULTIPLY")
    yas.inputs[1].default_value = 0.5
    b.l(sp.outputs["Blue"], yas.inputs[0])
    rs, ro, no, tc = M._deri(b, renk, koyu, yas_soketi=yas.outputs["Value"], kuran=kuran, kenar_asinma=True)
    inv = b.n("ShaderNodeMath", (-700, -900), operation="SUBTRACT")
    inv.inputs[0].default_value = 1.0
    b.l(sp.outputs["Green"], inv.inputs[1])
    bump2 = b.n("ShaderNodeBump", (-400, -700), i_Strength=0.5, i_Distance=0.0002)
    b.l(inv.outputs["Value"], bump2.inputs["Height"])
    b.l(no, bump2.inputs["Normal"])
    bs = M._bsdf_deri(b, rs, ro, bump2.outputs["Normal"], (0, 0), kuran=kuran)
    if tur == "altin":
        g = M._altin(b, bump2.outputs["Normal"], (0, -700), tc)
    else:
        g = b.n("ShaderNodeBsdfPrincipled", (0, -700))
        g.inputs["Base Color"].default_value = S.srgb("#EFECE4")
        g.inputs["Roughness"].default_value = 0.42
        g.inputs["Specular IOR Level"].default_value = 0.5
        g.inputs["Coat Weight"].default_value = 0.15
        g.inputs["Coat Roughness"].default_value = 0.3
        b.l(bump2.outputs["Normal"], g.inputs["Normal"])
    mix = b.n("ShaderNodeMixShader", (400, -200))
    b.l(sp.outputs["Red"], mix.inputs["Fac"])
    b.l(bs.outputs["BSDF"], mix.inputs[1])
    b.l(g.outputs["BSDF"], mix.inputs[2])
    out = b.n("ShaderNodeOutputMaterial", (700, -200))
    b.l(mix.outputs["Shader"], out.inputs["Surface"])
    return m


def deri_ayarla(mat, coat=None, coat_r=None, sheen=None, spec=None, puruz=None):
    """Deri BSDF'lerinin (metal olmayan, Base Color girdisi bağlı) cila ve parlaklık ayarı."""
    for n in mat.node_tree.nodes:
        if n.type != "BSDF_PRINCIPLED" or n.inputs["Metallic"].default_value > 0.5:
            continue
        if not n.inputs["Base Color"].is_linked:
            continue
        if coat is not None:
            n.inputs["Coat Weight"].default_value = coat
        if coat_r is not None:
            n.inputs["Coat Roughness"].default_value = coat_r
        if sheen is not None:
            n.inputs["Sheen Weight"].default_value = sheen
        if spec is not None:
            n.inputs["Specular IOR Level"].default_value = spec
        if puruz is not None and n.inputs["Roughness"].is_linked:
            kaynak = n.inputs["Roughness"].links[0].from_socket
            mr = mat.node_tree.nodes.new("ShaderNodeMapRange")
            mr.inputs["From Min"].default_value = 0.3
            mr.inputs["From Max"].default_value = 0.7
            mr.inputs["To Min"].default_value = puruz[0]
            mr.inputs["To Max"].default_value = puruz[1]
            mat.node_tree.links.new(kaynak, mr.inputs["Value"])
            mat.node_tree.links.new(mr.outputs["Result"], n.inputs["Roughness"])


def beyaz_sirt(M, ad, png, u0, arc, H, renk, koyu):
    """Kur'an sırtı: deri + beyaz bant maskesi."""
    return baski_malzeme(M, ad, png, u0, arc, H, renk, koyu, tur="beyaz", kuran=True)


def sayfa_yuzu(ad, png):
    """Sayfa yüzü: krem kâğıt + mürekkep örtüsü (UV 0..1)."""
    m = S.yeni_mat(ad)
    b = S.NB(m)
    tc = b.n("ShaderNodeTexCoord", (-1200, 0))
    im = b.n("ShaderNodeTexImage", (-950, 0), image=S.resim(png), interpolation="Cubic", extension="CLIP")
    b.l(tc.outputs["UV"], im.inputs["Vector"])
    sp = b.n("ShaderNodeSeparateColor", (-700, 0))
    b.l(im.outputs["Color"], sp.inputs["Color"])
    nz = b.n("ShaderNodeTexNoise", (-950, 300), i_Scale=60.0, i_Detail=4.0, i_Roughness=0.6)
    b.l(tc.outputs["Object"], nz.inputs["Vector"])
    mr = b.n("ShaderNodeMapRange", (-700, 300), i_From_Min=0.3, i_From_Max=0.7, i_To_Min=0.975, i_To_Max=1.015)
    b.l(nz.outputs["Fac"], mr.inputs["Value"])
    kag = b.n("ShaderNodeMix", (-450, 300), data_type="RGBA", blend_type="MULTIPLY")
    kag.inputs["Factor"].default_value = 1.0
    kag.inputs["A"].default_value = S.srgb("#F1E8D6")
    cm = b.n("ShaderNodeCombineColor", (-550, 200))
    for ch in ("Red", "Green", "Blue"):
        b.l(mr.outputs["Result"], cm.inputs[ch])
    b.l(cm.outputs["Color"], kag.inputs["B"])
    mk = b.n("ShaderNodeMath", (-450, 0), operation="MULTIPLY")
    mk.inputs[1].default_value = 0.92
    b.l(sp.outputs["Red"], mk.inputs[0])
    mx = b.n("ShaderNodeMix", (-200, 200), data_type="RGBA")
    mx.inputs["B"].default_value = S.srgb("#221D1A")
    b.l(kag.outputs["Result"], mx.inputs["A"])
    b.l(mk.outputs["Value"], mx.inputs["Factor"])
    bump = b.n("ShaderNodeBump", (-200, -250), i_Strength=0.08, i_Distance=0.0001)
    b.l(nz.outputs["Fac"], bump.inputs["Height"])
    bs = b.n("ShaderNodeBsdfPrincipled", (100, 0))
    b.l(mx.outputs["Result"], bs.inputs["Base Color"])
    b.l(bump.outputs["Normal"], bs.inputs["Normal"])
    bs.inputs["Roughness"].default_value = 0.78
    bs.inputs["Specular IOR Level"].default_value = 0.3
    bs.inputs["Subsurface Weight"].default_value = 0.06
    bs.inputs["Subsurface Radius"].default_value = (0.6, 0.5, 0.4)
    bs.inputs["Subsurface Scale"].default_value = 0.002
    out = b.n("ShaderNodeOutputMaterial", (400, 0))
    b.l(bs.outputs["BSDF"], out.inputs["Surface"])
    return m


def kagit_kenar_z(ad, renk):
    """Sayfa kenarı (açık kitap): yaprak katmanları z boyunca ince çizgiler."""
    m = S.yeni_mat(ad)
    b = S.NB(m)
    tc = b.n("ShaderNodeTexCoord", (-1200, 0))
    sc = b.n("ShaderNodeMapping", (-1000, -300))
    sc.inputs["Scale"].default_value = (25.0, 25.0, 2600.0)
    b.l(tc.outputs["Object"], sc.inputs["Vector"])
    nz = b.n("ShaderNodeTexNoise", (-800, -300), i_Scale=1.0, i_Detail=2.0, i_Roughness=0.5)
    b.l(sc.outputs["Vector"], nz.inputs["Vector"])
    mr = b.n("ShaderNodeMapRange", (-600, -300), i_To_Min=0.90, i_To_Max=1.04)
    b.l(nz.outputs["Fac"], mr.inputs["Value"])
    mx = b.n("ShaderNodeMix", (-400, 0), data_type="RGBA", blend_type="MULTIPLY")
    mx.inputs["Factor"].default_value = 1.0
    mx.inputs["A"].default_value = renk
    cm = b.n("ShaderNodeCombineColor", (-500, -200))
    for ch in ("Red", "Green", "Blue"):
        b.l(mr.outputs["Result"], cm.inputs[ch])
    b.l(cm.outputs["Color"], mx.inputs["B"])
    bump = b.n("ShaderNodeBump", (-400, -400), i_Strength=0.3, i_Distance=0.0001)
    b.l(nz.outputs["Fac"], bump.inputs["Height"])
    bs = b.n("ShaderNodeBsdfPrincipled", (0, 0))
    b.l(mx.outputs["Result"], bs.inputs["Base Color"])
    b.l(bump.outputs["Normal"], bs.inputs["Normal"])
    bs.inputs["Roughness"].default_value = 0.8
    bs.inputs["Specular IOR Level"].default_value = 0.3
    out = b.n("ShaderNodeOutputMaterial", (300, 0))
    b.l(bs.outputs["BSDF"], out.inputs["Surface"])
    return m


def boya(ad, renk, rough=0.4, coat=0.0):
    m = S.yeni_mat(ad)
    b = S.NB(m)
    tc = b.n("ShaderNodeTexCoord", (-900, 0))
    nz = b.n("ShaderNodeTexNoise", (-700, 0), i_Scale=180.0, i_Detail=3.0)
    b.l(tc.outputs["Object"], nz.inputs["Vector"])
    bump = b.n("ShaderNodeBump", (-400, -200), i_Strength=0.05, i_Distance=0.0002)
    b.l(nz.outputs["Fac"], bump.inputs["Height"])
    bs = b.n("ShaderNodeBsdfPrincipled", (0, 0))
    bs.inputs["Base Color"].default_value = S.srgb(renk)
    bs.inputs["Roughness"].default_value = rough
    if coat:
        bs.inputs["Coat Weight"].default_value = coat
    b.l(bump.outputs["Normal"], bs.inputs["Normal"])
    out = b.n("ShaderNodeOutputMaterial", (300, 0))
    b.l(bs.outputs["BSDF"], out.inputs["Surface"])
    return m


def cam_malzeme(ad, golge_renk=(0.92, 0.94, 0.93), ior=1.5, yansima=1.0):
    """Pencere / bardak camı: kamera ve yansıma ışınlarında gerçek cam; gölge ışınlarında (kostik yok) hafif
    renkli saydam -> camın arkasındaki güneş lekesi kaybolmaz."""
    m = S.yeni_mat(ad)
    b = S.NB(m)
    gl = b.n("ShaderNodeBsdfGlass", (0, 100))
    gl.inputs["Roughness"].default_value = 0.0
    gl.inputs["IOR"].default_value = ior
    tr = b.n("ShaderNodeBsdfTransparent", (0, -100))
    tr.inputs["Color"].default_value = tuple(golge_renk) + (1.0,)
    lp = b.n("ShaderNodeLightPath", (-300, 300))
    mx = b.n("ShaderNodeMixShader", (300, 0))
    b.l(lp.outputs["Is Shadow Ray"], mx.inputs["Fac"])
    b.l(gl.outputs["BSDF"], mx.inputs[1])
    b.l(tr.outputs["BSDF"], mx.inputs[2])
    out = b.n("ShaderNodeOutputMaterial", (500, 0))
    b.l(mx.outputs["Shader"], out.inputs["Surface"])
    return m


def pencere_cami(ad):
    """İnce pencere camı: kırılma yok (düz levha), %4-8 Fresnel yansıması, gölge ışınlarında tam saydam."""
    m = S.yeni_mat(ad)
    b = S.NB(m)
    tr = b.n("ShaderNodeBsdfTransparent", (0, 0))
    tr.inputs["Color"].default_value = (0.96, 0.97, 0.965, 1.0)
    gs = b.n("ShaderNodeBsdfGlossy", (0, -200))
    gs.inputs["Roughness"].default_value = 0.0
    fr = b.n("ShaderNodeFresnel", (-300, 200))
    fr.inputs["IOR"].default_value = 1.52
    frk = b.n("ShaderNodeMath", (-100, 200), operation="MULTIPLY")
    frk.inputs[1].default_value = 0.2
    b.l(fr.outputs["Fac"], frk.inputs[0])
    mx = b.n("ShaderNodeMixShader", (250, 0))
    b.l(frk.outputs["Value"], mx.inputs["Fac"])
    b.l(tr.outputs["BSDF"], mx.inputs[1])
    b.l(gs.outputs["BSDF"], mx.inputs[2])
    tr2 = b.n("ShaderNodeBsdfTransparent", (250, -250))
    lp = b.n("ShaderNodeLightPath", (0, 300))
    mx2 = b.n("ShaderNodeMixShader", (450, 0))
    b.l(lp.outputs["Is Shadow Ray"], mx2.inputs["Fac"])
    b.l(mx.outputs["Shader"], mx2.inputs[1])
    b.l(tr2.outputs["BSDF"], mx2.inputs[2])
    out = b.n("ShaderNodeOutputMaterial", (650, 0))
    b.l(mx2.outputs["Shader"], out.inputs["Surface"])
    return m


def cay_malzeme(ad):
    """Demli çay: yüzey (IOR 1.33) + hacim soğurması (koyu kehribar-kızıl)."""
    m = S.yeni_mat(ad)
    b = S.NB(m)
    gl = b.n("ShaderNodeBsdfGlass", (0, 100))
    gl.inputs["Roughness"].default_value = 0.0
    gl.inputs["IOR"].default_value = 1.33
    tr = b.n("ShaderNodeBsdfTransparent", (0, -100))
    tr.inputs["Color"].default_value = (0.75, 0.28, 0.07, 1.0)
    lp = b.n("ShaderNodeLightPath", (-300, 300))
    mx = b.n("ShaderNodeMixShader", (300, 0))
    b.l(lp.outputs["Is Shadow Ray"], mx.inputs["Fac"])
    b.l(gl.outputs["BSDF"], mx.inputs[1])
    b.l(tr.outputs["BSDF"], mx.inputs[2])
    ab = b.n("ShaderNodeVolumeAbsorption", (300, -300))
    ab.inputs["Color"].default_value = (0.62, 0.16, 0.03, 1.0)
    ab.inputs["Density"].default_value = 55.0
    out = b.n("ShaderNodeOutputMaterial", (500, 0))
    b.l(mx.outputs["Shader"], out.inputs["Surface"])
    b.l(ab.outputs["Volume"], out.inputs["Volume"])
    return m


def keten(ad):
    """Keten perde: kırık beyaz, dokuma bump, ince yüzeyde ışık geçirgenliği (arkadan güneşle ılık parlar)."""
    m = S.yeni_mat(ad)
    b = S.NB(m)
    tc = b.n("ShaderNodeTexCoord", (-1200, 0))
    mp = b.n("ShaderNodeMapping", (-1000, 0))
    mp.inputs["Scale"].default_value = (900.0, 900.0, 900.0)
    b.l(tc.outputs["Object"], mp.inputs["Vector"])
    w1 = b.n("ShaderNodeTexWave", (-800, 100), wave_type="BANDS", bands_direction="X", i_Scale=1.0, i_Distortion=1.5,
             i_Detail=2.0)
    w2 = b.n("ShaderNodeTexWave", (-800, -100), wave_type="BANDS", bands_direction="Z", i_Scale=1.0, i_Distortion=1.5,
             i_Detail=2.0)
    b.l(mp.outputs["Vector"], w1.inputs["Vector"])
    b.l(mp.outputs["Vector"], w2.inputs["Vector"])
    ad_ = b.n("ShaderNodeMath", (-600, 0), operation="MULTIPLY")
    b.l(w1.outputs["Fac"], ad_.inputs[0]); b.l(w2.outputs["Fac"], ad_.inputs[1])
    nz = b.n("ShaderNodeTexNoise", (-800, 300), i_Scale=14.0, i_Detail=3.0)
    b.l(tc.outputs["Object"], nz.inputs["Vector"])
    mr = b.n("ShaderNodeMapRange", (-600, 300), i_To_Min=0.94, i_To_Max=1.02)
    b.l(nz.outputs["Fac"], mr.inputs["Value"])
    cm = b.n("ShaderNodeCombineColor", (-450, 300))
    for ch in ("Red", "Green", "Blue"):
        b.l(mr.outputs["Result"], cm.inputs[ch])
    rk = b.n("ShaderNodeMix", (-250, 300), data_type="RGBA", blend_type="MULTIPLY")
    rk.inputs["Factor"].default_value = 1.0
    rk.inputs["A"].default_value = S.srgb("#E9E1D3")
    b.l(cm.outputs["Color"], rk.inputs["B"])
    bump = b.n("ShaderNodeBump", (-300, -200), i_Strength=0.25, i_Distance=0.0003)
    b.l(ad_.outputs["Value"], bump.inputs["Height"])
    bs = b.n("ShaderNodeBsdfPrincipled", (0, 0))
    b.l(rk.outputs["Result"], bs.inputs["Base Color"])
    b.l(bump.outputs["Normal"], bs.inputs["Normal"])
    bs.inputs["Roughness"].default_value = 0.85
    bs.inputs["Sheen Weight"].default_value = 0.4
    tl = b.n("ShaderNodeBsdfTranslucent", (0, -350))
    b.l(rk.outputs["Result"], tl.inputs["Color"])
    b.l(bump.outputs["Normal"], tl.inputs["Normal"])
    mx = b.n("ShaderNodeMixShader", (300, 0))
    mx.inputs["Fac"].default_value = 0.32
    b.l(bs.outputs["BSDF"], mx.inputs[1])
    b.l(tl.outputs["BSDF"], mx.inputs[2])
    out = b.n("ShaderNodeOutputMaterial", (500, 0))
    b.l(mx.outputs["Shader"], out.inputs["Surface"])
    return m


# =================================================================================================== geometri
def kutu(ad, x0, x1, y0, y1, z0, z1, mat, bev=0.0, uv_ofs=None, smooth=False):
    bm = S.kutu_bm(x0, x1, y0, y1, z0, z1)
    S.kutu_uv(bm, ofs=uv_ofs or (random.random(), random.random()))
    ob = S.obj_yap(ad, bm, [mat], smooth=smooth)
    if bev > 0:
        S.bevel(ob, bev, 3)
    return ob


def oda(M, cfg):
    m_duvar = M.duvar()
    W0 = 3.2
    # pencereli duvar (açıklığın çevresi), iç yüz y = YW
    y0, y1 = YW, YW + DUVAR_K
    kutu("duvar_sol", -W0, XL, y0, y1, -0.8, 1.9, m_duvar)
    kutu("duvar_sag", XR, W0, y0, y1, -0.8, 1.9, m_duvar)
    kutu("duvar_ust", XL, XR, y0, y1, ZT, 1.9, m_duvar)
    kutu("duvar_alt", XL, XR, y0, y1, -0.8, ZB, m_duvar)
    # oda: tavan, yan duvarlar, arka duvar (kameranın arkasında), zemin
    kutu("tavan", -W0, W0, -3.0, y1, 1.75, 1.85, m_duvar)
    kutu("yan_sol", -1.6, -1.5, -3.0, y0, -0.8, 1.75, m_duvar)
    kutu("yan_sag", 1.5, 1.6, -3.0, y0, -0.8, 1.75, m_duvar)
    kutu("arka", -W0, W0, -3.1, -3.0, -0.8, 1.75, m_duvar)
    m_zemin = M.ahsap("zemin", "walnut_veneer_02", S.srgb("#9C8574"), 1.0, rough_mul=0.9, coat=0.2, normal_str=0.4,
                      doygunluk=0.7)
    kutu("zemin", -W0, W0, -3.0, y0, -0.82, -0.75, m_zemin)


def masa(M, cfg):
    m_masa = M.masa("walnut_veneer_02", S.srgb(cfg.get("masa_ton", "#FFF4EA")), cfg.get("masa_olcek", 0.9),
                    kazanc=cfg.get("masa_kazanc", 1.25), doygunluk=cfg.get("masa_doygunluk", 0.92),
                    kontrast=cfg.get("masa_kontrast", 0.92), coat=cfg.get("masa_cila", 0.35), normal_str=0.3)
    bm = S.kutu_bm(-1.05, 1.05, -0.40, YW, -0.035, 0.0)
    S.kutu_uv(bm, ofs=(0.21, 0.37))
    ob = S.obj_yap("masa", bm, [m_masa], smooth=True)
    S.bevel(ob, 0.003, 3)
    return ob


def pencere(M, cfg):
    m_cerceve = boya("cerceve", cfg.get("cerceve_renk", "#ECE7DD"), rough=0.32, coat=0.1)
    m_denizlik = M.ahsap("denizlik", "white_oak_veneer", S.srgb("#E8D9C4"), 1.0, rough_mul=0.8, coat=0.3,
                         normal_str=0.4, kazanc=1.6, doygunluk=0.8)
    m_cam = pencere_cami("pencere_cami")
    # iç denizlik tahtası (masaya oturur, odaya 2.5 cm taşar)
    yf0, yf1 = YW + 0.025, YW + 0.09                 # kasa derinliği (sığ pervaz: köşe yarığı kararmasın)
    k = 0.05                                         # kasa genişliği
    kutu("kasa_alt", XL, XR, yf0, yf1, SILL_Z, SILL_Z + 0.045, m_cerceve, bev=0.003, smooth=True)
    kutu("kasa_ust", XL, XR, yf0, yf1, ZT - k, ZT, m_cerceve, bev=0.003, smooth=True)
    kutu("kasa_sol", XL, XL + k, yf0, yf1, SILL_Z, ZT, m_cerceve, bev=0.003, smooth=True)
    kutu("kasa_sag", XR - k, XR, yf0, yf1, SILL_Z, ZT, m_cerceve, bev=0.003, smooth=True)
    # tek, geniş kanat (sabit pencere): manzara bölünmesin
    ys0, ys1 = YW + 0.015, YW + 0.07
    p = 0.055
    zs0, zs1 = SILL_Z + 0.04, ZT - k
    x0, x1 = XL + k, XR - k
    alt_ust = cfg.get("kanat_alt_ust", 0.010)            # alt kayıt masanın ardından ~1 cm görünür
    kutu("kanat_alt", x0, x1, ys0, ys1, zs0, alt_ust, m_cerceve, bev=0.0035, smooth=True)
    kutu("kanat_ust", x0, x1, ys0, ys1, zs1 - p, zs1, m_cerceve, bev=0.0035, smooth=True)
    kutu("kanat_sol", x0, x0 + p, ys0, ys1, zs0, zs1, m_cerceve, bev=0.0035, smooth=True)
    kutu("kanat_sag", x1 - p, x1, ys0, ys1, zs0, zs1, m_cerceve, bev=0.0035, smooth=True)
    for j, yc in enumerate((YW + 0.042,)):
        bm = bmesh.new()
        e = 0.004
        vs = [bm.verts.new(v) for v in ((x0 + p - e, yc, alt_ust - e), (x1 - p + e, yc, alt_ust - e),
                                        (x1 - p + e, yc, zs1 - p + e), (x0 + p - e, yc, zs1 - p + e))]
        bm.faces.new(vs)
        ob = S.obj_yap(f"cam{j}", bm, [m_cam], smooth=False)
        ob.visible_shadow = False


def perde(M, cfg):
    """Sağ kenarda, pencere pervazından masaya kadar inen keten perde (kıvrımlı)."""
    m = keten("perde")
    x0, x1 = cfg.get("perde_x", (0.30, 0.66))
    yc = YW - 0.05
    nx, nz = 140, 70
    z0, z1 = 0.035, 1.70
    rnd = random.Random(5)
    faz = [rnd.uniform(0, 6.28) for _ in range(4)]
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    V = []
    for j in range(nz + 1):
        t = j / nz
        z = z0 + (z1 - z0) * t
        row = []
        for i in range(nx + 1):
            s = i / nx
            # kıvrım sayısı ~8; aşağıda kıvrımlar biraz açılır (perde altta hafif dağılır)
            gen = 0.032 * (0.85 + 0.25 * (1 - t))
            ph = 2 * math.pi * s * 8.0 + 0.35 * math.sin(3.1 * t + faz[0])
            y = yc - gen * (0.5 + 0.5 * math.sin(ph)) - 0.006 * math.sin(2 * math.pi * s * 2.3 + faz[1])
            x = x0 + (x1 - x0) * s + 0.01 * (1 - t) * math.sin(2 * math.pi * s * 1.3 + faz[2])
            row.append(bm.verts.new((x, y, z)))
        V.append(row)
    for j in range(nz):
        for i in range(nx):
            f = bm.faces.new((V[j][i], V[j][i + 1], V[j + 1][i + 1], V[j + 1][i]))
            for lp, (a, c_) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uvl].uv = (a / nx, c_ / nz)
    ob = S.obj_yap("perde", bm, [m], smooth=True)
    sd = ob.modifiers.new("kalinlik", "SOLIDIFY")
    sd.thickness = 0.0015
    return ob


def kitap_kur(M, ad, renk, koyu, png_sirt, m_on=None, kuran=False):
    """Kapalı kitap (yerel uzayda: x kalınlık, y sırttan ön kesime, z alttan üste). Kök boş nesneyi döndürür."""
    if kuran:
        T, H, D, bt = A.KURAN_T, A.KURAN_H, A.KURAN_D, A.KURAN_BT
        ffs = -1
    else:
        T, H, D, bt = A.kalinlik(ad), A.KITAP_H, A.KITAP_D, 0.0027
        ffs = +1
    bm, info = S.cilt_mesh(ad, T, H, D, bt, front_face_side=ffs)
    m_deri = M.deri(("kuran" if kuran else "risale") + "_deri", renk, koyu, kuran=kuran)
    m_kenar = M.deri(("kuran" if kuran else "risale") + "_kenar", renk, koyu, kenar=True, kuran=kuran)
    if kuran:
        m_sirt = beyaz_sirt(M, "kuran_sirt", png_sirt, info["u_s0"], info["arc"], H, renk, koyu)
    else:
        m_sirt = M.sirt(ad, png_sirt, info["u_s0"], info["arc"], H, renk, koyu)
    m_ic = M.kagit("ic_kagit_k" if kuran else "ic_kagit", S.srgb("#EEE6D4"))
    m_sayfa = M.kagit("sayfa_k" if kuran else "sayfa_r", S.srgb("#F3EBDA" if kuran else "#ECE1CA"))
    if m_on is None:
        m_on = m_deri
    elif callable(m_on):
        m_on = m_on(info)
    if kuran:
        # Kur'an derisi: gün batımı güneşinde rengin (#144173) solmaması için çok az parlaklık (cilasız, mat)
        for mm in (m_deri, m_kenar, m_sirt, m_on):
            deri_ayarla(mm, coat=CFG_AKTIF.get("kuran_cila", 0.0), coat_r=0.45, sheen=CFG_AKTIF.get("kuran_sheen", 0.0),
                        spec=CFG_AKTIF.get("kuran_spec", 0.012), puruz=CFG_AKTIF.get("kuran_puruz", (0.75, 0.92)))
    root = bpy.data.objects.new("kok_" + A.DOSYA.get(ad, ad), None)
    bpy.context.scene.collection.objects.link(root)
    cov = S.obj_yap("cilt_" + A.DOSYA.get(ad, ad), bm, [m_deri, m_sirt, m_ic, m_kenar, m_on])
    S.bevel(cov, 0.0008, 3)
    cov["u_tot"] = info["u_tot"]
    cov["H"] = H
    cov["ton"] = (0.0, 0.0, 0.0)
    cov.parent = root
    bm2, (x0, x1, y0, y1, z0, z1) = S.sayfa_bloku(T, H, D, info["p"], rnd=random.Random(zlib.crc32(ad.encode("utf-8"))))
    pb = S.obj_yap("sayfa_" + A.DOSYA.get(ad, ad), bm2, [m_sayfa])
    S.bevel(pb, 0.0004, 2)
    pb.parent = root
    kp = M.kaptal("kaptal_k" if kuran else "kaptal_r", S.srgb("#F2EEE6"), S.srgb("#1E4C80" if kuran else "#8B3A3F"))
    for zc in (z1 - 0.0009, z0 + 0.0009):
        bmk = bmesh.new()
        bmesh.ops.create_cone(bmk, cap_ends=True, segments=12, radius1=0.0011, radius2=0.0011, depth=(x1 - x0) * 0.98)
        bmesh.ops.rotate(bmk, verts=bmk.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "Y"))
        bmesh.ops.translate(bmk, verts=bmk.verts, vec=(0, y0 + 0.0011, zc))
        k = S.obj_yap("kaptal_" + A.DOSYA.get(ad, ad), bmk, [kp])
        k.parent = root
    return root, info, (T, H, D)


def yerlestir_yatik_risale(root, T, H, D, xc, y_sirt, z_alt, aci_der):
    """Ön kapak yukarı, sırt kameraya (-y), baş sola. Yerel x -> +z, y -> +y, z -> -x."""
    R = Matrix(((0, 0, -1, 0), (0, 1, 0, 0), (1, 0, 0, 0), (0, 0, 0, 1)))
    Tm = Matrix.Translation((xc + H / 2, y_sirt, z_alt + T / 2))
    Rz = Matrix.Translation((xc, y_sirt + D / 2, 0)) @ Matrix.Rotation(math.radians(aci_der), 4, "Z") @ \
        Matrix.Translation((-xc, -(y_sirt + D / 2), 0))
    root.matrix_world = Rz @ Tm @ R


def yerlestir_kuran(root, T, H, D, xc, yc, z_alt, aci_der):
    """Ön kapak (yerel -x) yukarı, sırt sağda (+x), baş pencereye (+y). Yerel x -> -z, y -> -x, z -> +y."""
    R = Matrix(((0, -1, 0, 0), (0, 0, 1, 0), (-1, 0, 0, 0), (0, 0, 0, 1)))
    Tm = Matrix.Translation((xc + D / 2, yc - H / 2, z_alt + T / 2))
    Rz = Matrix.Translation((xc, yc, 0)) @ Matrix.Rotation(math.radians(aci_der), 4, "Z") @ Matrix.Translation((-xc, -yc, 0))
    root.matrix_world = Rz @ Tm @ R


def acik_kitap(M, cfg):
    """Açık Lem'alar (11. sayfada): sol tarafta birkaç yaprak, sağda kalın blok; sayfalar cilt yerinden yükselir."""
    renk, koyu = S.srgb(CFG_AKTIF.get("risale_albedo", RISALE_ALBEDO)), S.srgb(RISALE_KOYU)
    m_deri = M.deri("risale_deri", renk, koyu)
    m_sol = sayfa_yuzu("sayfa10", os.path.join(DOKU, "sayfa_10.png"))
    m_sag = sayfa_yuzu("sayfa11", os.path.join(DOKU, "sayfa_11.png"))
    m_kenar = kagit_kenar_z("sayfa_kenar_z", S.srgb("#EADFC8"))
    Wp, Hp = 0.163, 0.236
    bt = 0.0027
    Tr, Tl = cfg.get("blok_sag", 0.0205), cfg.get("blok_sol", 0.0018)
    g = 0.0012
    root = bpy.data.objects.new("acik_kitap", None)
    bpy.context.scene.collection.objects.link(root)
    # kapak tahtaları (deri), sırt şeridi
    for ad, x0, x1 in (("tahta_sol", -0.171, -0.009), ("tahta_sag", 0.009, 0.171)):
        ob = kutu(ad, x0, x1, -0.120, 0.120, 0.0, bt, m_deri, bev=0.0009, smooth=True)
        ob.parent = root
    bm = bmesh.new()
    n = 16
    vs = []
    for i in range(n + 1):
        a = math.pi * i / n
        x = -0.012 * math.cos(a)
        z = 0.0006 + 0.0022 * (1 - math.sin(a)) * 0.0
        vs.append((bm.verts.new((x, -0.1195, z)), bm.verts.new((x, 0.1195, z))))
    for i in range(n):
        bm.faces.new((vs[i][0], vs[i + 1][0], vs[i + 1][1], vs[i][1]))
    ob = S.obj_yap("sirt_serit", bm, [m_deri])
    ob.parent = root
    zg = bt + 0.23 * Tr      # cilt yerindeki (oluk) yükseklik

    def yuz_sag(x, y):
        s = (x - g) / (Wp - g)
        z = bt + Tr * (0.23 + 0.77 * (1 - math.exp(-(x - g) / 0.0105)))
        z -= 0.0022 * s * s                                  # ön kesime doğru hafif sarkma
        z += 0.0016 * (s ** 4) * (abs(2 * y / Hp) ** 3)       # köşelerde hafif kıvrılma
        z += 0.0006 * math.sin(math.pi * (y / Hp + 0.5)) * (1 - s)
        return z

    def yuz_sol(x, y):
        d = (-x - g)
        s = d / (Wp - g)
        z = bt + Tl + (zg - bt - Tl) * math.exp(-d / 0.0085)
        z += 0.0012 * (s ** 3) * (abs(2 * y / Hp) ** 2.5)
        z += 0.0009 * math.sin(math.pi * s) * 0.6
        return z

    def blok(ad, sag, m_ust):
        nx, ny = 70, 36
        bm = bmesh.new()
        uvl = bm.loops.layers.uv.verify()
        xs = [g + (Wp - g) * (i / nx) ** 1.7 for i in range(nx + 1)]
        if not sag:
            xs = [-x for x in xs][::-1]
        ys = [-Hp / 2 + Hp * j / ny for j in range(ny + 1)]
        f = yuz_sag if sag else yuz_sol
        top = [[bm.verts.new((x, y, f(x, y))) for x in xs] for y in ys]
        bot = [[bm.verts.new((x, y, bt)) for x in xs] for y in ys]
        x_min = -Wp if not sag else 0.0

        def uv(x, y):
            return ((x - x_min) / Wp, (y + Hp / 2) / Hp)
        for j in range(ny):
            for i in range(nx):
                q = (top[j][i], top[j][i + 1], top[j + 1][i + 1], top[j + 1][i])
                fc = bm.faces.new(q)
                fc.material_index = 0
                for lp in fc.loops:
                    lp[uvl].uv = uv(lp.vert.co.x, lp.vert.co.y)
                fc2 = bm.faces.new((bot[j][i], bot[j + 1][i], bot[j + 1][i + 1], bot[j][i + 1]))
                fc2.material_index = 1
        # baş/kuyruk yüzleri
        for j, ters in ((0, False), (ny, True)):
            for i in range(nx):
                q = [bot[j][i], bot[j][i + 1], top[j][i + 1], top[j][i]]
                if ters:
                    q = q[::-1]
                bm.faces.new(q).material_index = 1
        # ön kesim ve cilt yeri yüzleri
        for i, ters in ((nx, False), (0, True)):
            for j in range(ny):
                q = [bot[j][i], bot[j + 1][i], top[j + 1][i], top[j][i]]
                if ters:
                    q = q[::-1]
                bm.faces.new(q).material_index = 1
        bm.normal_update()
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        ob = S.obj_yap(ad, bm, [m_ust, m_kenar], smooth=True)
        ob.parent = root
        return ob

    blok("blok_sag", True, m_sag)
    blok("blok_sol", False, m_sol)
    # kurdele: sağ sayfanın başından çıkar, sayfa üstünde çapraz uzanır, kuyruktan sarkar
    if cfg.get("kurdele", True):
        m_k = M.kurdele()
        bm = bmesh.new()
        uvl = bm.loops.layers.uv.verify()
        pts = []
        N = 40
        for i in range(N + 1):
            t = i / N
            x = 0.006 + 0.050 * t + 0.010 * math.sin(math.pi * t)
            y = Hp / 2 + 0.004 - (Hp + 0.020) * t
            if y > Hp / 2:
                z = yuz_sag(max(x, g + 0.001), Hp / 2) + 0.0004
            elif y < -Hp / 2:
                z = max(bt + 0.0003, yuz_sag(x, -Hp / 2) - (-Hp / 2 - y) * 1.6)
            else:
                z = yuz_sag(max(x, g + 0.001), y) + 0.00035
            pts.append(Vector((x, y, z)))
        w = 0.0018
        L = 0.0
        prev = None
        for i, p in enumerate(pts):
            if prev is not None:
                L += (p - prev).length
            prev = p
            a = bm.verts.new((p.x - w, p.y, p.z))
            b_ = bm.verts.new((p.x + w, p.y, p.z))
            if i:
                fc = bm.faces.new((la, lb, b_, a))
                for lp, uvv in zip(fc.loops, ((0, Lp), (1, Lp), (1, L), (0, L))):
                    lp[uvl].uv = uvv
            la, lb, Lp = a, b_, L
        ob = S.obj_yap("kurdele", bm, [m_k], smooth=True)
        ob.parent = root
    xc, yc = cfg.get("kitap_xy", (-0.01, 0.008))
    aci = cfg.get("kitap_aci", -4.0)
    root.matrix_world = Matrix.Translation((xc, yc, 0.0)) @ Matrix.Rotation(math.radians(aci), 4, "Z")
    return root


def doner(ad, profil, mat, seg=64, kapali=True):
    """Z ekseni etrafında döndürülmüş profil (r, z) listesi -> mesh."""
    bm = bmesh.new()
    halkalar = []
    for (r, z) in profil:
        halka = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            halka.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        halkalar.append(halka)
    for i in range(len(halkalar) - 1):
        for k in range(seg):
            k2 = (k + 1) % seg
            bm.faces.new((halkalar[i][k], halkalar[i][k2], halkalar[i + 1][k2], halkalar[i + 1][k]))
    if kapali:
        bm.faces.new(halkalar[0][::-1])
        bm.faces.new(halkalar[-1])
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return S.obj_yap(ad, bm, [mat], smooth=True)


def cay(M, cfg):
    """İnce belli çay bardağı (tabağıyla), demli çay."""
    x, y = cfg.get("cay_xy", (-0.205, -0.04))
    m_cam = cam_malzeme("bardak_cam", golge_renk=(0.93, 0.95, 0.94))
    m_cay = cay_malzeme("cay")
    m_tabak = boya("tabak", "#F4F1EA", rough=0.18, coat=0.6)
    # tabak (porselen): alçak, kenarı kalkık
    tabak = [(0.0, 0.0), (0.030, 0.0), (0.034, 0.0015), (0.052, 0.0045), (0.058, 0.0085), (0.0595, 0.0098),
             (0.0585, 0.0105), (0.051, 0.0072), (0.034, 0.0050), (0.020, 0.0052), (0.0, 0.0052)]
    ob = doner("tabak", tabak, m_tabak, seg=96, kapali=False)
    ob.location = (x, y, 0.0)
    # bardak: dış profil yukarı, iç profil aşağı (kalın taban)
    zt = 0.0052
    dis = [(0.0, 0.0), (0.0205, 0.0), (0.0222, 0.0015), (0.0215, 0.006), (0.0185, 0.022), (0.0158, 0.040),
           (0.0160, 0.050), (0.0190, 0.068), (0.0228, 0.085), (0.0250, 0.096), (0.0252, 0.0985)]
    ic = [(0.0240, 0.0985), (0.0238, 0.096), (0.0216, 0.085), (0.0178, 0.068), (0.0148, 0.050), (0.0146, 0.040),
          (0.0173, 0.022), (0.0198, 0.010), (0.0150, 0.0075), (0.0, 0.0072)]
    ob = doner("bardak", dis + ic, m_cam, seg=96, kapali=False)
    ob.location = (x, y, zt)
    # çay: iç profilin 0.25 mm içinde, 8.0 cm'ye kadar
    def ic_r(z):
        pts = sorted(ic, key=lambda p: p[1])
        for (r0, z0), (r1, z1) in zip(pts[:-1], pts[1:]):
            if z0 <= z <= z1:
                return r0 + (r1 - r0) * (z - z0) / max(1e-9, z1 - z0)
        return pts[-1][0]
    zs = [0.0076, 0.010, 0.016, 0.022, 0.030, 0.040, 0.050, 0.058, 0.068, 0.075, 0.080]
    cay_p = [(0.0, zs[0])] + [(max(0.0, ic_r(z) - 0.00025), z) for z in zs] + [(0.0, zs[-1])]
    ob = doner("cay", cay_p, m_cay, seg=96, kapali=False)
    ob.location = (x, y, zt)


# =================================================================================================== ışıklar
def hdri_ve_gunes(cfg):
    sc = bpy.context.scene
    g = json.load(open(os.path.join(VARLIK, HDRI_AD + "_gunes.json")))
    az_g, el_g = g["az"], g["el"]
    # sahne yönü (x ekseninden saat yönü tersine açı) theta <-> HDRI az = -(theta + R)
    R = -(az_g + cfg["manzara_ofset"]) - 90.0
    th_g = math.radians(-az_g - R)
    w = bpy.data.worlds.new("dunya")
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(R))
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    hd = os.path.join(VARLIK, HDRI_AD + ("_8k_gunessiz.hdr" if cfg.get("hdri_8k", True) else "_2k_gunessiz.hdr"))
    env.image = bpy.data.images.load(hd, check_existing=True)
    env.interpolation = "Cubic"
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.name = "Background"
    bg.inputs["Strength"].default_value = cfg["hdri_guc"]
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    # güneş
    el = math.radians(el_g)
    yon = Vector((math.cos(el) * math.cos(th_g), math.cos(el) * math.sin(th_g), math.sin(el)))
    ld = bpy.data.lights.new("gunes", "SUN")
    ld.energy = g["isinim"] * cfg["gunes_kat"]
    ld.angle = math.radians(cfg["gunes_aci"])
    ld.color = tuple(cfg["gunes_renk"])
    sun = bpy.data.objects.new("gunes", ld)
    sc.collection.objects.link(sun)
    sun.rotation_euler = (-yon).to_track_quat("-Z", "Y").to_euler()
    # pencere portalı (gök ışığının örneklenmesi)
    pd = bpy.data.lights.new("portal", "AREA")
    pd.shape = "RECTANGLE"
    pd.size, pd.size_y = (XR - XL), (ZT - ZB)
    try:
        pd.cycles.is_portal = True
    except Exception:
        pass
    po = bpy.data.objects.new("portal", pd)
    sc.collection.objects.link(po)
    po.location = ((XL + XR) / 2, YW + DUVAR_K - 0.01, (ZB + ZT) / 2)
    po.rotation_euler = (math.radians(-90), 0, 0)     # -Z -> -Y (odaya doğru)
    if cfg.get("dolgu_guc", 0) > 0:
        ld = bpy.data.lights.new("dolgu", "AREA")
        ld.shape = "RECTANGLE"
        ld.size, ld.size_y = 1.0, 1.3
        ld.energy = cfg["dolgu_guc"]
        ld.color = S.kelvin(cfg.get("dolgu_k", 7200))
        ob = bpy.data.objects.new("dolgu", ld)
        sc.collection.objects.link(ob)
        ob.location = tuple(cfg.get("dolgu_konum", (1.45, -1.3, 0.75)))
        d = Vector((0.0, 0.25, 0.05)) - ob.location
        ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return yon


# =================================================================================================== kamera
def kamera(cfg):
    sc = bpy.context.scene
    cd = bpy.data.cameras.new("kamera")
    cd.lens = cfg["lens"]
    cd.sensor_fit = "VERTICAL"
    cd.sensor_height = 36.0
    cd.sensor_width = 36.0
    cd.clip_start = 0.02
    cd.clip_end = 50
    cd.dof.use_dof = cfg.get("dof", True)
    cd.dof.aperture_fstop = cfg["fstop"]
    cd.dof.aperture_blades = 7
    cam = bpy.data.objects.new("kamera", cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    odak = bpy.data.objects.new("odak", None)
    sc.collection.objects.link(odak)
    odak.location = cfg["odak"]
    cd.dof.focus_object = odak
    kamera_konum(cam, cfg, 0.0)
    return cam


def kamera_poz0(cfg):
    pos = Vector(cfg["kamera"])
    R = (Matrix.Rotation(math.radians(cfg.get("yaw", 0.0)), 4, "Z")
         @ Matrix.Rotation(math.radians(90 + cfg["pitch"]), 4, "X")
         @ Matrix.Rotation(math.radians(cfg.get("roll", 0.0)), 4, "Z"))
    return Matrix.Translation(pos) @ R


def kamera_konum(cam, cfg, t=0.0):
    M0 = kamera_poz0(cfg)
    R = M0.to_3x3()
    fwd = -R.col[2]
    up = R.col[1]
    mesafe = (Vector(cfg["odak"]) - M0.translation).length
    pos = M0.translation + fwd * (mesafe * cfg.get("dolly", 0.0) * t) + up * (cfg.get("kaydir_v", 0.0) * t)
    cam.matrix_world = Matrix.Translation(pos) @ R.to_4x4()


# =================================================================================================== sahne
CFG_AKTIF = {}


def sahne_kur(cfg):
    CFG_AKTIF.clear(); CFG_AKTIF.update(cfg)
    S.cfgG.clear()
    S.cfgG.update({"altin": cfg.get("altin", "#C9A04E"), "deri_cila": cfg.get("deri_cila", 0.30),
                   "deri_sheen": 0.10, "duvar_renk": cfg.get("duvar_renk", "#EEE8DE")})
    S.temizle()
    random.seed(7)
    M = S.Malzeme()
    oda(M, cfg)
    masa(M, cfg)
    pencere(M, cfg)
    if cfg.get("perde", True):
        perde(M, cfg)
    # Kur'an-ı Kerim: solda arkada, pencereye yakın, güneşte, düz yatık
    kr, kc = S.srgb(CFG_AKTIF.get("kuran_albedo", KURAN_ALBEDO)), S.srgb(KURAN_KOYU)

    def kuran_on(info):
        p = info["p"]
        W = A.KURAN_D - p["ys"] - p["gw"]
        return baski_malzeme(M, "kuran_on", os.path.join(DOKU, "kuran_kapak_beyaz.png"), cfg.get("kuran_u_bas", 0.0), W,
                             A.KURAN_H, kr, kc, tur="beyaz", kuran=True, yon=cfg.get("kuran_u_yon", 1.0))
    root, info, (T, H, D) = kitap_kur(M, "kuran", kr, kc, os.path.join(DOKU, "kuran_sirt_beyaz.png"), m_on=kuran_on, kuran=True)
    kx, ky = cfg.get("kuran_xy", (-0.185, 0.375))
    yerlestir_kuran(root, T, H, D, kx, ky, 0.0, cfg.get("kuran_aci", 4.0))
    # Risale yığını: sağda arkada, sırtlar bize dönük
    rr, rk = S.srgb(CFG_AKTIF.get("risale_albedo", RISALE_ALBEDO)), S.srgb(RISALE_KOYU)
    yigin = cfg.get("yigin", ["Sözler", "Şuâlar", "Mektubat"])
    z = 0.0
    yx, yy = cfg.get("yigin_xy", (0.17, 0.27))
    rnd = random.Random(11)
    for i, ad in enumerate(yigin):
        ust = (i == len(yigin) - 1)
        m_on = None
        if ust:
            def m_on(info, ad=ad):
                p = info["p"]
                W = A.KITAP_D - p["ys"] - p["gw"]
                return baski_malzeme(M, "kapak_" + A.DOSYA[ad], os.path.join(DOKU, f"kapak_{A.DOSYA[ad]}.png"), info["u_k0"], W,
                                     A.KITAP_H, rr, rk, tur="altin")
        root, info, (T, H, D) = kitap_kur(M, ad, rr, rk, os.path.join(ESKI_DOKU, f"sirt_{A.DOSYA[ad]}.png"), m_on=m_on)
        aci = cfg.get("yigin_aci", 12.0) + rnd.uniform(-2.5, 2.5)
        dx, dy = rnd.uniform(-0.006, 0.006), rnd.uniform(-0.005, 0.005)
        yerlestir_yatik_risale(root, T, H, D, yx + dx, yy + dy, z, aci)
        z += T + 0.0002
    acik_kitap(M, cfg)
    if cfg.get("cay", False):
        cay(M, cfg)
    hdri_ve_gunes(cfg)
    kamera(cfg)
    S.render_ayar(cfg)
    sc = bpy.context.scene
    sc.cycles.max_bounces = 8
    sc.cycles.diffuse_bounces = 4
    sc.cycles.glossy_bounces = 4
    sc.cycles.transmission_bounces = 8
    sc.cycles.transparent_max_bounces = 12
    sc.cycles.volume_bounces = 1
    sc.cycles.sample_clamp_indirect = cfg.get("clamp", 8.0)
    return sc


def derinlik_modu():
    sc = bpy.context.scene
    S.derinlik_modu()
    # arka plan (gökyüzü) derinliği: çok uzak
    bg = sc.world.node_tree.nodes["Background"]
    for l in list(bg.inputs["Color"].links):
        sc.world.node_tree.links.remove(l)
    bg.inputs["Color"].default_value = (1000.0, 1000.0, 1000.0, 1.0)
    bg.inputs["Strength"].default_value = 1.0
    for o in sc.objects:
        if o.name.startswith("cam") or o.name in ("bardak", "cay"):
            o.hide_render = True


def exr_derinlik(p):
    """Derinlik EXR'ini (R kanalı, metre) Blender ile okur (OpenCV'de EXR kapalı)."""
    import numpy as np
    im = bpy.data.images.load(p)
    w, h = im.size
    px = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(px)
    return px.reshape(h, w, 4)[::-1, :, 0].copy()


def render(path, cfg):
    sc = bpy.context.scene
    sc.render.filepath = path
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"render {path} {time.time() - t0:.1f} sn", flush=True)


def main():
    kmt = sys.argv[1] if len(sys.argv) > 1 else "test"
    ek = json.loads(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].startswith("{") else None
    cfg = cfg_yukle(ek)
    os.makedirs(TEST, exist_ok=True)
    if kmt == "test":
        sahne_kur(cfg)
        ad = cfg.get("ad", "deneme")
        render(os.path.join(TEST, ad + ".png"), cfg)
    elif kmt == "kare1":
        pay = cfg.get("pay", 1.03)
        cfg.update(rx=1350, ry=2400, samples=cfg.get("samples_buyuk", 384), esik=cfg.get("esik_buyuk", 0.012))
        sc = sahne_kur(cfg)
        cam = sc.camera
        cam.data.lens = cfg["lens"] / pay
        render(os.path.join(OKUMA, "kare1_buyuk.png"), cfg)
        sc.render.image_settings.color_depth = "16"
        derinlik_modu()
        p = os.path.join(OKUMA, "kare1_derinlik.exr")
        render(p, cfg)
        np.save(os.path.join(OKUMA, "kare1_derinlik.npy"), exr_derinlik(p))
        mesafe = (Vector(cfg["odak"]) - Vector(cfg["kamera"])).length
        json.dump(dict(lens=cfg["lens"], pay=pay, mesafe=mesafe, dolly=cfg["dolly"], kaydir_v=cfg["kaydir_v"]),
                  open(os.path.join(OKUMA, "kare1_bilgi.json"), "w"), indent=1)
    elif kmt == "bolge":
        # büyük karenin bir bölgesini (ör. malzemesi değişen Kur'an) aynı ayarlarla yeniden render edip yumuşak
        # kenarlı bir dikdörtgenle kare1_buyuk.png'ye yerleştirir (eski kare: kare1_buyuk_onceki.png)
        import numpy as np
        import cv2
        pay = cfg.get("pay", 1.03)
        x0, x1, y0, y1 = cfg["bolge"]
        cfg.update(rx=1350, ry=2400, samples=cfg.get("samples_buyuk", 384), esik=cfg.get("esik_buyuk", 0.012),
                   border=[x0, x1, y0, y1])
        sc = sahne_kur(cfg)
        sc.camera.data.lens = cfg["lens"] / pay
        sc.render.use_crop_to_border = False
        sc.render.image_settings.color_mode = "RGBA"
        p = os.path.join(OKUMA, "bolge.png")
        render(p, cfg)
        yol = os.path.join(OKUMA, "kare1_buyuk.png")
        eski = os.path.join(OKUMA, "kare1_buyuk_onceki.png")
        if not os.path.exists(eski):
            import shutil
            shutil.copy(yol, eski)
        A_ = cv2.imread(eski, cv2.IMREAD_UNCHANGED).astype(np.float32)[..., :3]
        B_ = cv2.imread(p, cv2.IMREAD_UNCHANGED).astype(np.float32)
        al = (B_[..., 3] > 0).astype(np.float32)
        al = cv2.erode(al, np.ones((25, 25), np.uint8))
        al = cv2.GaussianBlur(al, (0, 0), 6.0)[..., None]
        C_ = A_ * (1 - al) + B_[..., :3] * al
        cv2.imwrite(yol, np.clip(np.round(C_), 0, 255).astype(np.uint8))
        d = np.abs(A_ - B_[..., :3]).mean(2)
        kenar = (al[..., 0] > 0.02) & (al[..., 0] < 0.98)
        print(f"BOLGE yerlestirildi; gecis bandinda ortalama fark {d[kenar].mean():.2f} (0-255)")
    elif kmt == "son":
        cfg.update(rx=1080, ry=1920, samples=cfg.get("samples_son", 160), esik=0.02)
        sc = sahne_kur(cfg)
        kamera_konum(sc.camera, cfg, 1.0)
        render(os.path.join(OKUMA, "son_kare_render.png"), cfg)


if __name__ == "__main__":
    main()
