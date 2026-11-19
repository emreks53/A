"""Kapanis sahnesi (bpy / Cycles): Risale-i Nur Kulliyati + Kur'an-i Kerim.

Eksenler: X sag, Y kameradan uzaga (derinlik), Z yukari. Masa ustu z = 0.
Basamakli kaidenin on kenari y = 0.
"""
import math
import os
import random
import sys

import bpy  # noqa: I001  (bmesh, bpy'den sonra yuklenmeli)
import bmesh
from mathutils import Euler, Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ayarlar as A  # noqa: E402
import varliklar as V  # noqa: E402

RND = random.Random(1405)

# ------------------------------------------------------------------ olculer
KAIDE_W = 0.420          # basamakli kaide eni
BASAMAK_D = 0.260        # her basamak derinligi
H1 = 0.055               # alt basamak yuksekligi
H2 = H1 + 0.130          # ust basamak yuksekligi
SIRT_PAY = 0.006         # kitap sirtlarinin basamak on kenarindan geride durusu
DUVAR_Y = 1.75           # arka duvar
LEM_Y_ARKA = -0.010      # yatan Lem'alar'in agiz tarafi (kaideye yakin)


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)


# ================================================================ yardimcilar
def temizle():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    import addon_utils
    addon_utils.enable("cycles", default_set=True)


def resim(path, data=True):
    im = bpy.data.images.load(path, check_existing=True)
    im.colorspace_settings.name = "Non-Color" if data else "sRGB"
    return im


class NB:
    """Kucuk dugum kurucu."""

    def __init__(self, mat):
        mat.use_nodes = True
        self.nt = mat.node_tree
        self.nt.nodes.clear()
        self.x = 0

    def n(self, t, loc=None, **kw):
        nd = self.nt.nodes.new(t)
        if loc:
            nd.location = loc
        for k, v in kw.items():
            if k.startswith("i_"):
                key = k[2:].replace("_", " ")
                nd.inputs[key].default_value = v
            else:
                setattr(nd, k, v)
        return nd

    def l(self, a, b):
        self.nt.links.new(a, b)


def yeni_mat(ad):
    m = bpy.data.materials.get(ad)
    if m:
        bpy.data.materials.remove(m)
    return bpy.data.materials.new(ad)


def obj_yap(ad, bm, mats=(), smooth=True):
    me = bpy.data.meshes.new(ad)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(ad, me)
    bpy.context.scene.collection.objects.link(ob)
    for m in mats:
        me.materials.append(m)
    return ob


def bevel(ob, w, seg=3, ang=30, harden=True):
    md = ob.modifiers.new("bevel", "BEVEL")
    md.width = w
    md.segments = seg
    md.limit_method = "ANGLE"
    md.angle_limit = math.radians(ang)
    md.harden_normals = harden
    md.use_clamp_overlap = True
    md.miter_outer = "MITER_ARC"
    return md


def keskin_kenar(bm, ang=28):
    lim = math.radians(ang)
    for e in bm.edges:
        if len(e.link_faces) == 2:
            a = e.link_faces[0].normal.angle(e.link_faces[1].normal, 0)
            e.smooth = a < lim
        else:
            e.smooth = False


def kutu_bm(x0, x1, y0, y1, z0, z1):
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z)) for z in (z0, z1) for y in (y0, y1) for x in (x0, x1)]
    idx = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    for f in idx:
        bm.faces.new([vs[i] for i in f])
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def kutu_uv(bm, M=None, grain="x", ofs=(0.0, 0.0)):
    """Dunya-uzayi kutu izdusumu UV (metre). Damar X boyunca."""
    uv = bm.loops.layers.uv.verify()
    M = M or Matrix.Identity(4)
    R = M.to_3x3()
    for f in bm.faces:
        n = (R @ f.normal).normalized()
        ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            p = M @ lp.vert.co
            if ax == 2:       # ust/alt: damar x
                u, v = p.x, p.y
            elif ax == 1:     # on/arka
                u, v = p.x, p.z
            else:             # yanlar
                u, v = p.y, p.z
            lp[uv].uv = (u + ofs[0], v + ofs[1])


# ================================================================ malzemeler
class Malzeme:
    def __init__(self):
        self.leather_disp = resim(V.yol("leather_red_02", "Displacement"))
        self.leather_rough = resim(V.yol("leather_red_02", "Rough"))
        self.lw_disp = resim(V.yol("leather_white", "Displacement"))
        self.lw_rough = resim(V.yol("leather_white", "Rough"))
        self.cache = {}

    # --- ortak deri katmani: (renk soketi, puruzluluk, normal) dondurur
    def _deri(self, b, renk, koyu, yas_soketi=None, kuran=False, x0=-1400):
        tc = b.n("ShaderNodeTexCoord", (x0, 0))
        oi = b.n("ShaderNodeObjectInfo", (x0, -500))
        mp = b.n("ShaderNodeMapping", (x0 + 200, 0))
        s = 1.0 / (0.075 if not kuran else 0.11)    # gren olcegi
        mp.inputs["Scale"].default_value = (s, s, s)
        b.l(tc.outputs["UV"], mp.inputs["Vector"])
        # rastgele kaydirma (her kitap farkli gren)
        vm = b.n("ShaderNodeVectorMath", (x0 + 100, -300), operation="MULTIPLY")
        vm.inputs[1].default_value = (7.31, 3.17, 0.0)
        cmb = b.n("ShaderNodeCombineXYZ", (x0 - 100, -300))
        b.l(oi.outputs["Random"], cmb.inputs["X"])
        b.l(oi.outputs["Random"], cmb.inputs["Y"])
        b.l(cmb.outputs["Vector"], vm.inputs[0])
        b.l(vm.outputs["Vector"], mp.inputs["Location"])
        disp = b.n("ShaderNodeTexImage", (x0 + 400, 100), image=self.lw_disp if kuran else self.leather_disp)
        rgh = b.n("ShaderNodeTexImage", (x0 + 400, -200), image=self.lw_rough if kuran else self.leather_rough)
        b.l(mp.outputs["Vector"], disp.inputs["Vector"])
        b.l(mp.outputs["Vector"], rgh.inputs["Vector"])
        bump = b.n("ShaderNodeBump", (x0 + 700, 100), i_Strength=0.35 if not kuran else 0.25, i_Distance=0.00025)
        b.l(disp.outputs["Color"], bump.inputs["Height"])
        # renk: hafif lekelenme
        nz = b.n("ShaderNodeTexNoise", (x0 + 400, 450), i_Scale=9.0, i_Detail=6.0, i_Roughness=0.55)
        b.l(tc.outputs["Object"], nz.inputs["Vector"])
        mr = b.n("ShaderNodeMapRange", (x0 + 650, 450), i_From_Min=0.3, i_From_Max=0.7, i_To_Min=0.0, i_To_Max=1.0)
        b.l(nz.outputs["Fac"], mr.inputs["Value"])
        c1 = b.n("ShaderNodeMix", (x0 + 900, 450), data_type="RGBA")
        c1.inputs["A"].default_value = renk
        r2 = tuple(min(1.0, x * 1.06) for x in renk[:3]) + (1.0,)
        c1.inputs["B"].default_value = r2
        b.l(mr.outputs["Result"], c1.inputs["Factor"])
        # kitaptan kitaba cok kucuk ton farki
        hsv = b.n("ShaderNodeHueSaturation", (x0 + 1100, 450))
        mrr = b.n("ShaderNodeMapRange", (x0 + 900, 700), i_To_Min=0.975, i_To_Max=1.025)
        b.l(oi.outputs["Random"], mrr.inputs["Value"])
        b.l(mrr.outputs["Result"], hsv.inputs["Value"])
        mrs = b.n("ShaderNodeMapRange", (x0 + 900, 900), i_To_Min=0.96, i_To_Max=1.04)
        b.l(oi.outputs["Random"], mrs.inputs["Value"])
        b.l(mrs.outputs["Result"], hsv.inputs["Saturation"])
        b.l(c1.outputs["Result"], hsv.inputs["Color"])
        renk_s = hsv.outputs["Color"]
        if yas_soketi is not None:
            c2 = b.n("ShaderNodeMix", (x0 + 1300, 450), data_type="RGBA")
            c2.inputs["B"].default_value = koyu
            b.l(renk_s, c2.inputs["A"])
            b.l(yas_soketi, c2.inputs["Factor"])
            renk_s = c2.outputs["Result"]
        # puruzluluk
        rr = b.n("ShaderNodeMapRange", (x0 + 700, -200), i_To_Min=0.40, i_To_Max=0.62)
        b.l(rgh.outputs["Color"], rr.inputs["Value"])
        return renk_s, rr.outputs["Result"], bump.outputs["Normal"], tc

    def _bsdf_deri(self, b, renk_s, rough_s, normal_s, loc=(0, 0), kuran=False):
        bs = b.n("ShaderNodeBsdfPrincipled", loc)
        b.l(renk_s, bs.inputs["Base Color"])
        b.l(rough_s, bs.inputs["Roughness"])
        b.l(normal_s, bs.inputs["Normal"])
        bs.inputs["Specular IOR Level"].default_value = 0.45
        bs.inputs["Coat Weight"].default_value = 0.18 if not kuran else 0.25
        bs.inputs["Coat Roughness"].default_value = 0.32
        bs.inputs["Sheen Weight"].default_value = 0.12
        bs.inputs["Sheen Roughness"].default_value = 0.4
        bs.inputs["Sheen Tint"].default_value = (1.0, 0.95, 0.9, 1.0)
        return bs

    def _altin(self, b, normal_s, loc, tc):
        g = b.n("ShaderNodeBsdfPrincipled", loc)
        g.inputs["Base Color"].default_value = srgb("#E3C27F")
        g.inputs["Metallic"].default_value = 1.0
        nz = b.n("ShaderNodeTexNoise", (loc[0] - 400, loc[1] - 300), i_Scale=600.0, i_Detail=3.0)
        b.l(tc.outputs["Object"], nz.inputs["Vector"])
        mr = b.n("ShaderNodeMapRange", (loc[0] - 200, loc[1] - 300), i_To_Min=0.24, i_To_Max=0.40)
        b.l(nz.outputs["Fac"], mr.inputs["Value"])
        b.l(mr.outputs["Result"], g.inputs["Roughness"])
        b.l(normal_s, g.inputs["Normal"])
        return g

    def deri(self, ad, renk, koyu, kenar=False):
        key = ("deri", ad)
        if key in self.cache:
            return self.cache[key]
        m = yeni_mat(ad)
        b = NB(m)
        rs, ro, no, tc = self._deri(b, renk, koyu)
        if kenar:
            mx = b.n("ShaderNodeMix", (-100, 400), data_type="RGBA")
            b.l(rs, mx.inputs["A"])
            mx.inputs["B"].default_value = koyu
            mx.inputs["Factor"].default_value = 0.30
            rs = mx.outputs["Result"]
        bs = self._bsdf_deri(b, rs, ro, no, (200, 0))
        out = b.n("ShaderNodeOutputMaterial", (500, 0))
        b.l(bs.outputs["BSDF"], out.inputs["Surface"])
        self.cache[key] = m
        return m

    def sirt(self, kitap_ad, png, u0, arc, H, renk, koyu):
        m = yeni_mat("sirt_" + A.DOSYA[kitap_ad])
        b = NB(m)
        tcx = b.n("ShaderNodeTexCoord", (-2200, -900))
        sep = b.n("ShaderNodeSeparateXYZ", (-2000, -900))
        b.l(tcx.outputs["UV"], sep.inputs["Vector"])
        mu = b.n("ShaderNodeMath", (-1800, -850), operation="MULTIPLY_ADD")
        mu.inputs[1].default_value = 1.0 / arc
        mu.inputs[2].default_value = -u0 / arc
        b.l(sep.outputs["X"], mu.inputs[0])
        mv = b.n("ShaderNodeMath", (-1800, -1000), operation="MULTIPLY")
        mv.inputs[1].default_value = 1.0 / H
        b.l(sep.outputs["Y"], mv.inputs[0])
        cmb = b.n("ShaderNodeCombineXYZ", (-1600, -900))
        b.l(mu.outputs["Value"], cmb.inputs["X"])
        b.l(mv.outputs["Value"], cmb.inputs["Y"])
        im = b.n("ShaderNodeTexImage", (-1400, -900), image=resim(png), interpolation="Cubic", extension="EXTEND")
        b.l(cmb.outputs["Vector"], im.inputs["Vector"])
        sp = b.n("ShaderNodeSeparateColor", (-1100, -900))
        b.l(im.outputs["Color"], sp.inputs["Color"])
        yas = b.n("ShaderNodeMath", (-900, -1000), operation="MULTIPLY")
        yas.inputs[1].default_value = 0.55
        b.l(sp.outputs["Blue"], yas.inputs[0])
        rs, ro, no, tc = self._deri(b, renk, koyu, yas_soketi=yas.outputs["Value"])
        # varak gomme kabartmasi (deriye bastirilmis)
        inv = b.n("ShaderNodeMath", (-700, -900), operation="SUBTRACT")
        inv.inputs[0].default_value = 1.0
        b.l(sp.outputs["Green"], inv.inputs[1])
        bump2 = b.n("ShaderNodeBump", (-400, -700), i_Strength=0.55, i_Distance=0.00018)
        b.l(inv.outputs["Value"], bump2.inputs["Height"])
        b.l(no, bump2.inputs["Normal"])
        bs = self._bsdf_deri(b, rs, ro, bump2.outputs["Normal"], (0, 0))
        g = self._altin(b, bump2.outputs["Normal"], (0, -700), tc)
        mix = b.n("ShaderNodeMixShader", (400, -200))
        b.l(sp.outputs["Red"], mix.inputs["Fac"])
        b.l(bs.outputs["BSDF"], mix.inputs[1])
        b.l(g.outputs["BSDF"], mix.inputs[2])
        out = b.n("ShaderNodeOutputMaterial", (700, -200))
        b.l(mix.outputs["Shader"], out.inputs["Surface"])
        return m

    def kuran_kapak(self, png, u0, W, H, renk, koyu, ters=False):
        m = yeni_mat("kuran_kapak")
        b = NB(m)
        tcx = b.n("ShaderNodeTexCoord", (-2200, -900))
        sep = b.n("ShaderNodeSeparateXYZ", (-2000, -900))
        b.l(tcx.outputs["UV"], sep.inputs["Vector"])
        mu = b.n("ShaderNodeMath", (-1800, -850), operation="MULTIPLY_ADD")
        mu.inputs[1].default_value = (1.0 / W) * (-1 if ters else 1)
        mu.inputs[2].default_value = (-u0 / W) * (-1 if ters else 1)
        b.l(sep.outputs["X"], mu.inputs[0])
        mv = b.n("ShaderNodeMath", (-1800, -1000), operation="MULTIPLY")
        mv.inputs[1].default_value = 1.0 / H
        b.l(sep.outputs["Y"], mv.inputs[0])
        cmb = b.n("ShaderNodeCombineXYZ", (-1600, -900))
        b.l(mu.outputs["Value"], cmb.inputs["X"])
        b.l(mv.outputs["Value"], cmb.inputs["Y"])
        im = b.n("ShaderNodeTexImage", (-1400, -900), image=resim(png), interpolation="Cubic", extension="CLIP")
        b.l(cmb.outputs["Vector"], im.inputs["Vector"])
        sp = b.n("ShaderNodeSeparateColor", (-1100, -900))
        b.l(im.outputs["Color"], sp.inputs["Color"])
        rs, ro, no, tc = self._deri(b, renk, koyu, kuran=True)
        inv = b.n("ShaderNodeMath", (-700, -900), operation="SUBTRACT")
        inv.inputs[0].default_value = 1.0
        b.l(sp.outputs["Green"], inv.inputs[1])
        bump2 = b.n("ShaderNodeBump", (-400, -700), i_Strength=0.5, i_Distance=0.00022)
        b.l(inv.outputs["Value"], bump2.inputs["Height"])
        b.l(no, bump2.inputs["Normal"])
        bs = self._bsdf_deri(b, rs, ro, bump2.outputs["Normal"], (0, 0), kuran=True)
        g = self._altin(b, bump2.outputs["Normal"], (0, -700), tc)
        mix = b.n("ShaderNodeMixShader", (400, -200))
        b.l(sp.outputs["Red"], mix.inputs["Fac"])
        b.l(bs.outputs["BSDF"], mix.inputs[1])
        b.l(g.outputs["BSDF"], mix.inputs[2])
        out = b.n("ShaderNodeOutputMaterial", (700, -200))
        b.l(mix.outputs["Shader"], out.inputs["Surface"])
        return m

    def kagit(self, ad, renk, yaldiz=0.0):
        key = ("kagit", ad)
        if key in self.cache:
            return self.cache[key]
        m = yeni_mat(ad)
        b = NB(m)
        tc = b.n("ShaderNodeTexCoord", (-1200, 0))
        mp = b.n("ShaderNodeMapping", (-1000, 0))
        mp.inputs["Scale"].default_value = (1.0, 1.0, 1.0)
        b.l(tc.outputs["Object"], mp.inputs["Vector"])
        # sayfa cizgileri: kitap kalinlik yonunde (yerel x) ince cizgiler
        sc = b.n("ShaderNodeMapping", (-1000, -300))
        sc.inputs["Scale"].default_value = (2600.0, 25.0, 25.0)
        b.l(tc.outputs["Object"], sc.inputs["Vector"])
        nz = b.n("ShaderNodeTexNoise", (-800, -300), i_Scale=1.0, i_Detail=2.0, i_Roughness=0.5)
        b.l(sc.outputs["Vector"], nz.inputs["Vector"])
        mr = b.n("ShaderNodeMapRange", (-600, -300), i_To_Min=0.94, i_To_Max=1.04)
        b.l(nz.outputs["Fac"], mr.inputs["Value"])
        mx = b.n("ShaderNodeMix", (-400, 0), data_type="RGBA", blend_type="MULTIPLY")
        mx.inputs["Factor"].default_value = 1.0
        mx.inputs["A"].default_value = renk
        cm = b.n("ShaderNodeCombineColor", (-500, -200))
        for ch in ("Red", "Green", "Blue"):
            b.l(mr.outputs["Result"], cm.inputs[ch])
        b.l(cm.outputs["Color"], mx.inputs["B"])
        bump = b.n("ShaderNodeBump", (-400, -400), i_Strength=0.25, i_Distance=0.0001)
        b.l(nz.outputs["Fac"], bump.inputs["Height"])
        bs = b.n("ShaderNodeBsdfPrincipled", (0, 0))
        b.l(mx.outputs["Result"], bs.inputs["Base Color"])
        b.l(bump.outputs["Normal"], bs.inputs["Normal"])
        bs.inputs["Roughness"].default_value = 0.72
        bs.inputs["Specular IOR Level"].default_value = 0.35
        bs.inputs["Subsurface Weight"].default_value = 0.0
        out = b.n("ShaderNodeOutputMaterial", (600, 0))
        if yaldiz > 0:
            g = b.n("ShaderNodeBsdfPrincipled", (0, -500))
            g.inputs["Base Color"].default_value = srgb("#E8CF9A")
            g.inputs["Metallic"].default_value = 1.0
            g.inputs["Roughness"].default_value = 0.42
            b.l(bump.outputs["Normal"], g.inputs["Normal"])
            ms = b.n("ShaderNodeMixShader", (350, 0))
            ms.inputs["Fac"].default_value = yaldiz
            b.l(bs.outputs["BSDF"], ms.inputs[1])
            b.l(g.outputs["BSDF"], ms.inputs[2])
            b.l(ms.outputs["Shader"], out.inputs["Surface"])
        else:
            b.l(bs.outputs["BSDF"], out.inputs["Surface"])
        self.cache[key] = m
        return m

    def kaptal(self, ad, c1, c2):
        key = ("kaptal", ad)
        if key in self.cache:
            return self.cache[key]
        m = yeni_mat(ad)
        b = NB(m)
        tc = b.n("ShaderNodeTexCoord", (-800, 0))
        wv = b.n("ShaderNodeTexWave", (-600, 0), wave_type="BANDS", bands_direction="X",
                 i_Scale=1.0 / 0.0011 / 20 * 2 * math.pi * 0.5, i_Distortion=0.0)
        b.l(tc.outputs["Object"], wv.inputs["Vector"])
        mx = b.n("ShaderNodeMix", (-300, 0), data_type="RGBA")
        mx.inputs["A"].default_value = c1
        mx.inputs["B"].default_value = c2
        rr = b.n("ShaderNodeMapRange", (-450, 0), i_From_Min=0.45, i_From_Max=0.55)
        b.l(wv.outputs["Fac"], rr.inputs["Value"])
        b.l(rr.outputs["Result"], mx.inputs["Factor"])
        bs = b.n("ShaderNodeBsdfPrincipled", (0, 0))
        b.l(mx.outputs["Result"], bs.inputs["Base Color"])
        bs.inputs["Roughness"].default_value = 0.5
        bs.inputs["Sheen Weight"].default_value = 0.5
        bump = b.n("ShaderNodeBump", (-200, -300), i_Strength=0.6, i_Distance=0.0002)
        b.l(wv.outputs["Fac"], bump.inputs["Height"])
        b.l(bump.outputs["Normal"], bs.inputs["Normal"])
        out = b.n("ShaderNodeOutputMaterial", (300, 0))
        b.l(bs.outputs["BSDF"], out.inputs["Surface"])
        self.cache[key] = m
        return m

    def ahsap(self, ad, varlik, tint, scale, rough_mul=1.0, coat=0.0, normal_str=0.6):
        key = ("ahsap", ad)
        if key in self.cache:
            return self.cache[key]
        m = yeni_mat(ad)
        b = NB(m)
        tc = b.n("ShaderNodeTexCoord", (-1200, 0))
        mp = b.n("ShaderNodeMapping", (-1000, 0))
        mp.inputs["Scale"].default_value = (scale, scale, scale)
        b.l(tc.outputs["UV"], mp.inputs["Vector"])
        d = b.n("ShaderNodeTexImage", (-750, 200), image=resim(V.yol(varlik, "Diffuse"), data=False))
        r = b.n("ShaderNodeTexImage", (-750, -100), image=resim(V.yol(varlik, "Rough")))
        nm = b.n("ShaderNodeTexImage", (-750, -400), image=resim(V.yol(varlik, "nor_gl")))
        for t in (d, r, nm):
            b.l(mp.outputs["Vector"], t.inputs["Vector"])
        mx = b.n("ShaderNodeMix", (-400, 200), data_type="RGBA", blend_type="MULTIPLY")
        mx.inputs["Factor"].default_value = 1.0
        mx.inputs["B"].default_value = tint
        b.l(d.outputs["Color"], mx.inputs["A"])
        rm = b.n("ShaderNodeMath", (-400, -100), operation="MULTIPLY")
        rm.inputs[1].default_value = rough_mul
        b.l(r.outputs["Color"], rm.inputs[0])
        nmap = b.n("ShaderNodeNormalMap", (-400, -400), i_Strength=normal_str)
        b.l(nm.outputs["Color"], nmap.inputs["Color"])
        bs = b.n("ShaderNodeBsdfPrincipled", (0, 0))
        b.l(mx.outputs["Result"], bs.inputs["Base Color"])
        b.l(rm.outputs["Value"], bs.inputs["Roughness"])
        b.l(nmap.outputs["Normal"], bs.inputs["Normal"])
        bs.inputs["Specular IOR Level"].default_value = 0.5
        if coat > 0:
            bs.inputs["Coat Weight"].default_value = coat
            bs.inputs["Coat Roughness"].default_value = 0.22
        out = b.n("ShaderNodeOutputMaterial", (300, 0))
        b.l(bs.outputs["BSDF"], out.inputs["Surface"])
        self.cache[key] = m
        return m

    def duvar(self):
        m = yeni_mat("duvar")
        b = NB(m)
        tc = b.n("ShaderNodeTexCoord", (-1200, 0))
        mp = b.n("ShaderNodeMapping", (-1000, 0))
        mp.inputs["Scale"].default_value = (0.6, 0.6, 0.6)
        b.l(tc.outputs["UV"], mp.inputs["Vector"])
        d = b.n("ShaderNodeTexImage", (-750, 200), image=resim(V.yol("plastered_wall_04", "Diffuse"), data=False))
        nm = b.n("ShaderNodeTexImage", (-750, -300), image=resim(V.yol("plastered_wall_04", "nor_gl")))
        for t in (d, nm):
            b.l(mp.outputs["Vector"], t.inputs["Vector"])
        # griyi krem siva tonuna cevir: parlaklik al, krem ile carp
        bw = b.n("ShaderNodeRGBToBW", (-500, 200))
        b.l(d.outputs["Color"], bw.inputs["Color"])
        mr = b.n("ShaderNodeMapRange", (-350, 200), i_From_Min=0.2, i_From_Max=0.8, i_To_Min=0.86, i_To_Max=1.04)
        b.l(bw.outputs["Val"], mr.inputs["Value"])
        mx = b.n("ShaderNodeMix", (-150, 200), data_type="RGBA", blend_type="MULTIPLY")
        mx.inputs["Factor"].default_value = 1.0
        mx.inputs["A"].default_value = srgb("#EFE3CF")
        cm = b.n("ShaderNodeCombineColor", (-250, 50))
        for ch in ("Red", "Green", "Blue"):
            b.l(mr.outputs["Result"], cm.inputs[ch])
        b.l(cm.outputs["Color"], mx.inputs["B"])
        nmap = b.n("ShaderNodeNormalMap", (-400, -300), i_Strength=0.8)
        b.l(nm.outputs["Color"], nmap.inputs["Color"])
        bs = b.n("ShaderNodeBsdfPrincipled", (100, 0))
        b.l(mx.outputs["Result"], bs.inputs["Base Color"])
        b.l(nmap.outputs["Normal"], bs.inputs["Normal"])
        bs.inputs["Roughness"].default_value = 0.92
        bs.inputs["Specular IOR Level"].default_value = 0.2
        out = b.n("ShaderNodeOutputMaterial", (400, 0))
        b.l(bs.outputs["BSDF"], out.inputs["Surface"])
        return m

    def kurdele(self):
        m = yeni_mat("kurdele")
        b = NB(m)
        tc = b.n("ShaderNodeTexCoord", (-800, 0))
        wv = b.n("ShaderNodeTexWave", (-600, -200), wave_type="BANDS", bands_direction="X", i_Scale=900.0,
                 i_Distortion=2.0, i_Detail=4.0)
        b.l(tc.outputs["UV"], wv.inputs["Vector"])
        bump = b.n("ShaderNodeBump", (-300, -200), i_Strength=0.08, i_Distance=0.00005)
        b.l(wv.outputs["Fac"], bump.inputs["Height"])
        bs = b.n("ShaderNodeBsdfPrincipled", (0, 0))
        bs.inputs["Base Color"].default_value = srgb("#7E3540")
        bs.inputs["Roughness"].default_value = 0.33
        bs.inputs["Anisotropic"].default_value = 0.7
        bs.inputs["Sheen Weight"].default_value = 0.6
        bs.inputs["Sheen Tint"].default_value = srgb("#E7B7B5")
        bs.inputs["Specular IOR Level"].default_value = 0.6
        b.l(bump.outputs["Normal"], bs.inputs["Normal"])
        tang = b.n("ShaderNodeTangent", (-300, -500), direction_type="UV_MAP")
        b.l(tang.outputs["Tangent"], bs.inputs["Tangent"])
        out = b.n("ShaderNodeOutputMaterial", (300, 0))
        b.l(bs.outputs["BSDF"], out.inputs["Surface"])
        return m

    def basit(self, ad, renk, rough=0.5):
        m = yeni_mat(ad)
        b = NB(m)
        bs = b.n("ShaderNodeBsdfPrincipled", (0, 0))
        bs.inputs["Base Color"].default_value = renk
        bs.inputs["Roughness"].default_value = rough
        out = b.n("ShaderNodeOutputMaterial", (300, 0))
        b.l(bs.outputs["BSDF"], out.inputs["Surface"])
        return m


# ===================================================================== kitap
RENK_DERI = srgb("#C98F7E")       # cok acik, solgun gul-taba deri (kalibre edilir)
RENK_KOYU = srgb("#9A6A5C")
RENK_SAYFA = srgb("#EFE5CF")
RENK_ARKA_KAGIT = srgb("#EDE2CB")
RENK_KURAN = srgb("#F2EBDD")       # inci / fildisi beyazi deri
RENK_KURAN_KOYU = srgb("#D9CDB8")


def cilt_mesh(ad, T, H, D, bt, front_face_side=+1):
    """Kapak kabugu. Malzeme yuvalari: 0 deri, 1 sirt, 2 ic kagit, 3 kenar derisi, 4 on kapak.
    UV: (dis yol boyunca metre, z metre); kapaklarda (x, y)."""
    p = A.cilt_parametreleri(T, D, bt)
    dis, ic, et = A.cilt_kesiti(p)
    n = len(dis)
    # dis yol u koordinatlari
    u = [0.0]
    for i in range(1, n):
        u.append(u[-1] + math.dist(dis[i - 1], dis[i]))
    ui = [0.0]
    for i in range(1, n):
        ui.append(ui[-1] + math.dist(ic[i - 1], ic[i]))
    sirt_idx = [i for i in range(n) if et[i] == "sirt"]
    u_s0, u_s1 = u[sirt_idx[0]], u[sirt_idx[-1]]
    # on kapak duz yuzeyi (x isareti front_face_side olan "kapak" bolumu)
    kap_idx = [i for i in range(n) if et[i] == "kapak" and dis[i][0] * front_face_side > 0]
    # mafsal olugu sonu = duz yuzey basi (ilk kapak noktasindan once gelen oluk sonu)
    oluk_idx = [i for i in range(n) if et[i] == "oluk" and dis[i][0] * front_face_side > 0]
    if front_face_side > 0:
        u_k0 = u[oluk_idx[-1]]
    else:
        u_k0 = u[oluk_idx[0]]

    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    zs = (0.0, H)
    vo = [[bm.verts.new((x, y, z)) for (x, y) in dis] for z in zs]
    vi = [[bm.verts.new((x, y, z)) for (x, y) in ic] for z in zs]

    def quad(vs, uvs, mat):
        f = bm.faces.new(vs)
        f.material_index = mat
        for lp, q in zip(f.loops, uvs):
            lp[uvl].uv = q
        return f

    for i in range(n - 1):
        a, b_ = et[i], et[i + 1]
        if a == "sirt" and b_ == "sirt":
            mat = 1
        elif a == "kapak" and b_ == "kapak" and dis[i][0] * front_face_side > 0:
            mat = 4
        else:
            mat = 0
        # dis yuzey (normal disari)
        quad([vo[0][i + 1], vo[0][i], vo[1][i], vo[1][i + 1]],
             [(u[i + 1], 0), (u[i], 0), (u[i], H), (u[i + 1], H)], mat)
        # ic yuzey
        quad([vi[0][i], vi[0][i + 1], vi[1][i + 1], vi[1][i]],
             [(ui[i], 0), (ui[i + 1], 0), (ui[i + 1], H), (ui[i], H)], 2)
        # kapaklar (bas/kuyruk kesitleri)
        for k, z in ((0, 0.0), (1, H)):
            vs = [vo[k][i], vo[k][i + 1], vi[k][i + 1], vi[k][i]]
            if k == 1:
                vs = vs[::-1]
            quad(vs, [(v.co.x, v.co.y) for v in vs], 3)
    # on kesim yuzleri
    for i, sgn in ((0, 1), (n - 1, -1)):
        vs = [vo[0][i], vi[0][i], vi[1][i], vo[1][i]]
        if sgn < 0:
            vs = vs[::-1]
        quad(vs, [(v.co.x, v.co.z) for v in vs], 3)
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    keskin_kenar(bm)
    info = dict(u_s0=u_s0, u_s1=u_s1, arc=u_s1 - u_s0, u_k0=u_k0, u_k1=u[kap_idx[-1]] if front_face_side > 0 else u[kap_idx[0]], p=p)
    return bm, info


def sayfa_bloku(T, H, D, p, kare=0.003):
    bt, ys, st = p["bt"], p["ys"], p["st"]
    x0, x1 = -T / 2 + bt + 0.0002, T / 2 - bt - 0.0002
    y0 = st + ys * 0.55
    y1 = D - kare
    z0, z1 = kare, H - kare
    bm = kutu_bm(x0, x1, y0, y1, z0, z1)
    # sirt tarafi hafif dis bukey (yuvarlatilmis sirt)
    for v in bm.verts:
        if abs(v.co.y - y0) < 1e-6:
            pass
    return bm, (x0, x1, y0, y1, z0, z1)


class KitapUretici:
    def __init__(self, M):
        self.M = M
        self.m_deri = M.deri("deri_kapak", RENK_DERI, RENK_KOYU)
        self.m_kenar = M.deri("deri_kenar", RENK_DERI, RENK_KOYU, kenar=True)
        self.m_ic = M.kagit("ic_kagit", RENK_ARKA_KAGIT)
        self.m_sayfa = M.kagit("sayfa", RENK_SAYFA)
        self.m_kaptal = M.kaptal("kaptal", srgb("#EADFC8"), srgb("#8B3A3F"))

    def kitap(self, ad, png=None):
        T = A.kalinlik(ad)
        H, D = A.KITAP_H, A.KITAP_D
        bm, info = cilt_mesh(ad, T, H, D, 0.0027)
        m_sirt = self.M.sirt(ad, png, info["u_s0"], info["arc"], H, RENK_DERI, RENK_KOYU)
        root = bpy.data.objects.new("kitap_" + A.DOSYA[ad], None)
        bpy.context.scene.collection.objects.link(root)
        cov = obj_yap("cilt_" + A.DOSYA[ad], bm, [self.m_deri, m_sirt, self.m_ic, self.m_kenar, self.m_deri])
        bevel(cov, 0.0007, 3)
        cov.parent = root
        bm2, (x0, x1, y0, y1, z0, z1) = sayfa_bloku(T, H, D, info["p"])
        pb = obj_yap("sayfa_" + A.DOSYA[ad], bm2, [self.m_sayfa])
        bevel(pb, 0.00035, 2)
        pb.parent = root
        # kaptal (bas ve kuyruk)
        for zc in (z1 - 0.0009, z0 + 0.0009):
            bmk = bmesh.new()
            bmesh.ops.create_cone(bmk, cap_ends=True, segments=12, radius1=0.0011, radius2=0.0011,
                                  depth=(x1 - x0) * 0.98)
            bmesh.ops.rotate(bmk, verts=bmk.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "Y"))
            bmesh.ops.translate(bmk, verts=bmk.verts, vec=(0, y0 + 0.0011, zc))
            k = obj_yap("kaptal_" + A.DOSYA[ad], bmk, [self.m_kaptal])
            k.parent = root
        root["T"] = T
        return root, info


# ================================================================ sahne kur
def sahne_kur(cfg):
    temizle()
    sc = bpy.context.scene
    M = Malzeme()
    KU = KitapUretici(M)

    # ---------------- masa
    m_masa = M.ahsap("masa", "walnut_veneer", srgb("#F4E6D6"), 1.0 / 1.8, rough_mul=0.9, coat=0.12, normal_str=0.35)
    bm = kutu_bm(-2.2, 2.2, -3.2, DUVAR_Y, -0.03, 0.0)
    kutu_uv(bm, ofs=(0.37, 0.11))
    masa = obj_yap("masa", bm, [m_masa], smooth=False)

    # ---------------- duvar
    m_duvar = M.duvar()
    bm = kutu_bm(-3.0, 3.0, DUVAR_Y, DUVAR_Y + 0.1, -0.05, 2.6)
    kutu_uv(bm)
    obj_yap("duvar", bm, [m_duvar], smooth=False)

    # ---------------- basamakli kaide (iki parca)
    m_kaide = M.ahsap("kaide", "walnut_veneer_02", srgb("#E9D4C2"), 1.0 / 1.0, rough_mul=0.85, coat=0.25, normal_str=0.5)
    w2 = KAIDE_W / 2
    bm = kutu_bm(-w2, w2, 0.0, BASAMAK_D, 0.0, H1)
    kutu_uv(bm, ofs=(0.13, 0.41))
    alt = obj_yap("kaide_alt", bm, [m_kaide], smooth=True)
    bevel(alt, 0.0022, 4)
    bm = kutu_bm(-w2, w2, BASAMAK_D, 2 * BASAMAK_D, 0.0, H2)
    kutu_uv(bm, ofs=(0.52, 0.07))
    ust = obj_yap("kaide_ust", bm, [m_kaide], smooth=True)
    bevel(ust, 0.0022, 4)

    # ---------------- kitaplar
    rnd = random.Random(cfg.get("tohum", 7))

    def sira(adlar, z, y_on, ileri=None):
        Ts = [A.kalinlik(a) for a in adlar]
        bos = [rnd.uniform(0.0, 0.0019) for _ in adlar[:-1]]
        bos[rnd.randrange(len(bos))] = 0.0
        W = sum(Ts) + sum(bos)
        x = -W / 2 + rnd.uniform(-0.002, 0.002)
        out = []
        for i, a in enumerate(adlar):
            png = os.path.join(A.DOKU, f"sirt_{A.DOSYA[a]}.png")
            root, info = KU.kitap(a, png)
            T = Ts[i]
            dy = rnd.uniform(-0.0012, 0.0012)
            if ileri is not None and i == ileri:
                dy -= 0.0042
            yaw = math.radians(rnd.uniform(-0.6, 0.6))
            lean = math.radians(rnd.uniform(-0.45, 0.45))
            # bosluk izin verdigi olcude yana yaslanma
            root.location = (x + T / 2, y_on + dy, z)
            root.rotation_euler = Euler((0.0, lean, yaw), "XYZ")
            x += T + (bos[i] if i < len(bos) else 0)
            out.append(root)
        return out

    ust_kitaplar = sira(A.UST_SIRA, H2, BASAMAK_D + SIRT_PAY, ileri=3)
    alt_kitaplar = sira(A.ALT_SIRA, H1, SIRT_PAY + 0.002, ileri=None)

    # ---------------- yatan Lem'alar (on kapak yukarida, sirt kameraya)
    png = os.path.join(A.DOKU, f"sirt_{A.DOSYA[A.YATAN]}.png")
    lem, linfo = KU.kitap(A.YATAN, png)
    T = A.kalinlik(A.YATAN)
    lem.rotation_euler = Euler((0.0, math.radians(-90.0), math.radians(0.8)), "XYZ")
    # yerel x [-T/2,T/2] -> z; bas (yerel z=H) -> -x
    lem.location = (A.KITAP_H / 2 + 0.003, LEM_Y_ARKA - A.KITAP_D, T / 2)

    # ---------------- kurdele (Lem'alar'dan sarkan)
    kurdele_kur(M, lem, T)

    # ---------------- Kur'an-i Kerim + rahle
    kuran_ve_rahle(M, KU, cfg)

    # ---------------- isik ve kamera
    isiklar(cfg)
    kamera(cfg)
    render_ayar(cfg)
    return sc


def kurdele_kur(M, lem, T):
    """Lem'alar'in kuyruk tarafindan (sag) cikip masaya sarkan ipek kurdele (dunya uzayi)."""
    bpy.context.view_layer.update()
    mw = lem.matrix_world
    # kitap dunya sinirlari
    xr = mw.translation.x + A.KITAP_H / 2          # kuyruk ucu (sag)
    ysp = mw.translation.y                          # sirt tepe
    y_r = ysp + 0.034                               # sirtin 3.4 cm gerisi
    z_c = T * 0.52
    bt = 0.0027
    pts = [
        (xr - 0.020, y_r, z_c),
        (xr - 0.0030, y_r, z_c),
        (xr - 0.0005, y_r - 0.0004, z_c - 0.0015),
        (xr + 0.0006, y_r - 0.0010, bt + 0.0010),
        (xr + 0.0020, y_r - 0.0016, bt + 0.0002),
        (xr + 0.0034, y_r - 0.0022, bt - 0.0010),
        (xr + 0.0046, y_r - 0.0030, 0.0012),
        (xr + 0.0075, y_r - 0.0050, 0.00018),
        (xr + 0.0140, y_r - 0.0095, 0.00012),
        (xr + 0.0230, y_r - 0.0170, 0.00012),
        (xr + 0.0300, y_r - 0.0260, 0.00012),
        (xr + 0.0335, y_r - 0.0350, 0.00012),
    ]
    # Catmull-Rom ornekleme
    P = [Vector(p) for p in pts]
    samp = []
    for i in range(len(P) - 1):
        p0 = P[max(0, i - 1)]; p1 = P[i]; p2 = P[i + 1]; p3 = P[min(len(P) - 1, i + 2)]
        for k in range(10):
            t = k / 10
            t2, t3 = t * t, t * t * t
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
            samp.append(q)
    samp.append(P[-1])
    w = 0.0045
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    prev_side = Vector((0, 1, 0))
    rows = []
    L = 0.0
    for i, q in enumerate(samp):
        if i < len(samp) - 1:
            tng = (samp[i + 1] - q).normalized()
        else:
            tng = (q - samp[i - 1]).normalized()
        if i > 0:
            L += (q - samp[i - 1]).length
        side = tng.cross(Vector((0, 0, 1)))
        if side.length < 0.25:
            side = prev_side
        side.normalize()
        if side.dot(prev_side) < 0:
            side = -side
        # dikey kisimda kurdele genisligi y boyunca kalir
        prev_side = side
        twist = 0.0
        a = bm.verts.new(q - side * w / 2)
        b_ = bm.verts.new(q + side * w / 2)
        rows.append((a, b_, L))
    for i in range(len(rows) - 1):
        a0, b0, l0 = rows[i]
        a1, b1, l1 = rows[i + 1]
        f = bm.faces.new((a0, b0, b1, a1))
        for lp, uvq in zip(f.loops, ((l0, 0), (l0, w), (l1, w), (l1, 0))):
            lp[uvl].uv = uvq
    # V kesik uc
    a, b_, l = rows[-1]
    tip = bm.verts.new((a.co + b_.co) / 2 - (samp[-1] - samp[-2]).normalized() * 0.0025)
    f = bm.faces.new((a, b_, tip))
    bm.normal_update()
    ob = obj_yap("kurdele", bm, [M.kurdele()])
    sol = ob.modifiers.new("kalinlik", "SOLIDIFY")
    sol.thickness = 0.00016
    sol.offset = 1.0


def kuran_ve_rahle(M, KU, cfg):
    H, D, T, bt = A.KURAN_H, A.KURAN_D, A.KURAN_T, A.KURAN_BT
    # On kapak: Kur'an sagdan acilir -> kameraya bakan kapak yerel -x tarafi
    bm, info = cilt_mesh("kuran", T, H, D, bt, front_face_side=-1)
    m_deri = M.deri("kuran_deri", RENK_KURAN, RENK_KURAN_KOYU)
    m_kenar = M.deri("kuran_kenar", RENK_KURAN, RENK_KURAN_KOYU, kenar=True)
    p = info["p"]
    Wk = D - p["ys"] - p["gw"]
    m_kap = M.kuran_kapak(os.path.join(A.DOKU, "kuran_kapak.png"), info["u_k0"], Wk, H, RENK_KURAN, RENK_KURAN_KOYU, ters=True)
    m_ic = M.kagit("kuran_ic", srgb("#EEE6D4"))
    m_sayfa = M.kagit("kuran_sayfa", srgb("#F1E7CF"), yaldiz=0.22)
    root = bpy.data.objects.new("kuran", None)
    bpy.context.scene.collection.objects.link(root)
    cov = obj_yap("kuran_cilt", bm, [m_deri, m_deri, m_ic, m_kenar, m_kap])
    bevel(cov, 0.0009, 3)
    cov.parent = root
    bm2, (x0, x1, y0, y1, z0, z1) = sayfa_bloku(T, H, D, p)
    pb = obj_yap("kuran_sayfa", bm2, [m_sayfa])
    bevel(pb, 0.0004, 2)
    pb.parent = root
    for zc in (z1 - 0.001, z0 + 0.001):
        bmk = bmesh.new()
        bmesh.ops.create_cone(bmk, cap_ends=True, segments=12, radius1=0.0012, radius2=0.0012, depth=(x1 - x0) * 0.98)
        bmesh.ops.rotate(bmk, verts=bmk.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "Y"))
        bmesh.ops.translate(bmk, verts=bmk.verts, vec=(0, y0 + 0.0012, zc))
        k = obj_yap("kuran_kaptal", bmk, [M.kaptal("kuran_kaptal", srgb("#F0E6CF"), srgb("#C9A65E"))])
        k.parent = root

    # --- Egik cerceve (L-birimi) yerel uzayi: kitap y in [-T,0] (on yuz -T), z in [0,H]
    lean = math.radians(cfg.get("kuran_egim", 15.0))
    yaw = math.radians(cfg.get("kuran_yaw", -3.0))
    m_ahsap = M.ahsap("rahle", "walnut_veneer_02", srgb("#CDB09A"), 1.0, rough_mul=0.8, coat=0.3, normal_str=0.5)
    # L-birimi sinirlari (yerel)
    RW = 0.236
    sirt_d = 0.011
    raf_on = -T - 0.016
    # rahle kokeni dunya: ust basamak uzerinde, kitaplarin arkasinda
    y_kok = BASAMAK_D + cfg.get("rahle_y", 0.252)
    z_kok = H2 + cfg.get("rahle_z", 0.262)
    R = Matrix.Rotation(yaw, 4, "Z") @ Matrix.Rotation(-lean, 4, "X")
    Mk = Matrix.Translation((0.0, y_kok, z_kok)) @ R

    def parca(ad, x0, x1, y0, y1, z0, z1, bev=0.0016):
        bm = kutu_bm(x0, x1, y0, y1, z0, z1)
        bm.transform(Mk)
        kutu_uv(bm, ofs=(RND.random(), RND.random()))
        ob = obj_yap(ad, bm, [m_ahsap])
        bevel(ob, bev, 3)
        return ob

    parca("rahle_sirt", -RW / 2, RW / 2, 0.0, sirt_d, -0.012, 0.215)
    parca("rahle_raf", -RW / 2, RW / 2, raf_on, sirt_d, -0.013, 0.0)
    parca("rahle_dudak", -RW / 2, RW / 2, raf_on, raf_on + 0.010, 0.0, 0.017, bev=0.0025)
    # yan ayaklar (dunya YZ profili), kalinlik 0.014
    bpy.context.view_layer.update()
    p_raf_on_alt = Mk @ Vector((0, raf_on, -0.013))
    p_sirt_arka_alt = Mk @ Vector((0, sirt_d, -0.013))
    p_sirt_arka_ust = Mk @ Vector((0, sirt_d, 0.12))
    y_on_ayak = BASAMAK_D + A.KITAP_D + 0.012
    y_arka = 2 * BASAMAK_D - 0.004
    prof = [
        (y_on_ayak, 0.0),
        (y_arka, 0.0),
        (y_arka, H2 + 0.03),
        (p_sirt_arka_alt.y + 0.002, p_sirt_arka_alt.z),
        (p_sirt_arka_ust.y + 0.001, p_sirt_arka_ust.z),
        (p_sirt_arka_ust.y - 0.022, p_sirt_arka_ust.z - 0.01),
        (p_raf_on_alt.y + 0.012, p_raf_on_alt.z + 0.010),
        (p_raf_on_alt.y + 0.002, p_raf_on_alt.z),
    ]
    # on kenar: hafif bel (icbukey) egrisi
    on_ust = prof[-1]
    egri = []
    for k in range(1, 12):
        t = k / 12
        zz = on_ust[1] + (0.0 - on_ust[1]) * t
        yy = on_ust[0] + (y_on_ayak - on_ust[0]) * t + 0.016 * math.sin(math.pi * t)
        egri.append((yy, zz))
    prof = prof + egri
    for sgn in (-1, 1):
        bm = bmesh.new()
        xa = sgn * (RW / 2 + 0.0005)
        xb = sgn * (RW / 2 + 0.0145)
        top = [bm.verts.new((xa, y, z)) for (y, z) in prof]
        bot = [bm.verts.new((xb, y, z)) for (y, z) in prof]
        bm.faces.new(top)
        bm.faces.new(bot[::-1])
        n = len(prof)
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((top[i], top[j], bot[j], bot[i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4], quad_method="BEAUTY", ngon_method="BEAUTY")
        Mz = Matrix.Rotation(yaw, 4, "Z")
        bm.transform(Matrix.Translation((0, y_kok, 0)) @ Mz @ Matrix.Translation((0, -y_kok, 0)))
        kutu_uv(bm, ofs=(RND.random(), RND.random()))
        keskin_kenar(bm)
        ob = obj_yap("rahle_yan", bm, [m_ahsap])
        bevel(ob, 0.0018, 3)

    # Kur'an yerlesimi: yerel kitap -> L-cerceve: Rz(+90) ile on kapak (-x) kameraya
    # kitap koken: sirt tepe (y=0), alt (z=0). Rz(90): (x,y)->(-y,x). Kitap govdesi -x yonunde.
    # on yuz (yerel -x) -> L-cerceve -y. Kalinlik yonu yerel x in [-T/2,T/2] -> L y in [-T/2,T/2]
    root.matrix_world = Mk @ Matrix.Translation((D / 2, -T / 2, 0.0005)) @ Matrix.Rotation(math.pi / 2, 4, "Z")
    return root


# ================================================================ isiklar
def isiklar(cfg):
    sc = bpy.context.scene
    w = bpy.data.worlds.new("dunya")
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(cfg.get("hdri_rot", 110)))
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(V.yol("brown_photostudio_05", "hdri"), check_existing=True)
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = cfg.get("hdri_guc", 0.35)
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

    def alan(ad, loc, hedef, sx, sy, guc, renk, spread=180):
        ld = bpy.data.lights.new(ad, "AREA")
        ld.shape = "RECTANGLE"
        ld.size, ld.size_y = sx, sy
        ld.energy = guc
        ld.color = renk
        ld.spread = math.radians(spread)
        ob = bpy.data.objects.new(ad, ld)
        sc.collection.objects.link(ob)
        ob.location = loc
        d = Vector(hedef) - Vector(loc)
        ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return ob

    def kelvin(K):
        # yaklasik siyah cisim rengi (lineer)
        t = K / 100.0
        if t <= 66:
            r = 255
            g = 99.4708025861 * math.log(t) - 161.1195681661
            b = 0 if t <= 19 else 138.5177312231 * math.log(t - 10) - 305.0447927307
        else:
            r = 329.698727446 * ((t - 60) ** -0.1332047592)
            g = 288.1221695283 * ((t - 60) ** -0.0755148492)
            b = 255
        c = [max(0, min(255, v)) / 255 for v in (r, g, b)]
        return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c)

    # pencere (sol-on-ust): yumusak ana isik
    alan("pencere", (-1.55, -0.55, 1.15), (0.0, 0.25, 0.30), 1.1, 1.5, cfg.get("pencere_guc", 260), kelvin(5600))
    # sag dolgu (krem duvardan yansima gibi)
    alan("dolgu", (1.6, -0.9, 0.7), (0.0, 0.2, 0.25), 1.4, 1.2, cfg.get("dolgu_guc", 60), kelvin(4800))
    # arkadan hafif tepe/kenar isigi (sayfa kenarlarina parilti)
    alan("tepe", (0.4, 0.9, 1.6), (0.0, 0.3, 0.3), 1.0, 0.6, cfg.get("tepe_guc", 25), kelvin(5000))
    # on alt dolgu (kameranin arkasindan, masaya ve sirtlara yumusak)
    alan("on", (0.2, -2.6, 0.9), (0.0, 0.0, 0.25), 1.6, 0.8, cfg.get("on_guc", 40), kelvin(5200))

    # gunes (sabah, sol ust): pencere kasasi golgesi (gobo) ile
    ld = bpy.data.lights.new("gunes", "SUN")
    ld.energy = cfg.get("gunes_guc", 3.2)
    ld.angle = math.radians(cfg.get("gunes_aci", 2.2))
    ld.color = kelvin(4300)
    sun = bpy.data.objects.new("gunes", ld)
    sc.collection.objects.link(sun)
    d = Vector(cfg.get("gunes_yon", (0.92, 0.42, -0.48))).normalized()
    sun.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()

    # gobo: sol duvar + pencere acikligi (kamerada gorunmez)
    gobo_kur(cfg, d)


def gobo_kur(cfg, d):
    """Pencere kasasi + tul perde golgesi. Duzlemin gunes yonune dik oldugu bir 'pencere duvari'."""
    sc = bpy.context.scene
    # hedef nokta: Kur'an civari; gobo, gunes yonunde geriye 1.6 m
    hedef = Vector(cfg.get("gobo_hedef", (-0.05, 0.75, 0.62)))
    mer = hedef - d * cfg.get("gobo_mesafe", 1.7)
    # duzlem eksenleri
    nrm = -d
    up = Vector((0, 0, 1))
    ax_u = up.cross(nrm).normalized()
    ax_v = nrm.cross(ax_u).normalized()
    bm = bmesh.new()
    # pencere: 2 x 3 cam, kasa 0.06, kayitlar 0.04
    W, Hh = cfg.get("pencere_w", 0.95), cfg.get("pencere_h", 1.25)
    du, dv = cfg.get("pencere_kaydir", (0.0, 0.0))
    kas, kay = 0.07, 0.045
    # buyuk duz levha + delikler yerine: cevreleyen 4 levha + kayitlar
    def dik(u0, u1, v0, v1):
        c = [mer + ax_u * u + ax_v * v for (u, v) in ((u0, v0), (u1, v0), (u1, v1), (u0, v1))]
        vs = [bm.verts.new(p) for p in c]
        bm.faces.new(vs)
    BIG = 4.0
    u0, u1 = du - W / 2, du + W / 2
    v0, v1 = dv - Hh / 2, dv + Hh / 2
    dik(-BIG, u0, -BIG, BIG)
    dik(u1, BIG, -BIG, BIG)
    dik(u0, u1, v1, BIG)
    dik(u0, u1, -BIG, v0)
    # dikey kayit (ortada) + iki yatay kayit
    dik(du - kay / 2, du + kay / 2, v0, v1)
    for f in (1 / 3, 2 / 3):
        vv = v0 + (v1 - v0) * f
        dik(u0, u1, vv - kay / 2, vv + kay / 2)
    ob = obj_yap("gobo", bm, [], smooth=False)
    ob.visible_camera = False
    ob.visible_glossy = False
    ob.visible_diffuse = True
    mat = Malzeme.basit(None, "gobo_m", srgb("#E8DECE"), 0.9)
    ob.data.materials.append(mat)
    # tul perde: yari gecirgen, gunes isigini yumusatir
    if cfg.get("perde", True):
        bm = bmesh.new()
        off = d * 0.05
        c = [mer + off + ax_u * u + ax_v * v for (u, v) in ((u0, v0), (u1, v0), (u1, v1), (u0, v1))]
        vs = [bm.verts.new(p) for p in c]
        bm.faces.new(vs)
        pob = obj_yap("perde", bm, [], smooth=False)
        pob.visible_camera = False
        pob.visible_glossy = False
        pm = yeni_mat("perde_m")
        b = NB(pm)
        tc = b.n("ShaderNodeTexCoord", (-900, 0))
        wv = b.n("ShaderNodeTexWave", (-700, 0), wave_type="BANDS", bands_direction="X", i_Scale=6.0,
                 i_Distortion=3.0, i_Detail=2.0)
        b.l(tc.outputs["Object"], wv.inputs["Vector"])
        mr = b.n("ShaderNodeMapRange", (-500, 0), i_To_Min=0.55, i_To_Max=0.85)
        b.l(wv.outputs["Fac"], mr.inputs["Value"])
        tr = b.n("ShaderNodeBsdfTransparent", (-200, 100))
        tl = b.n("ShaderNodeBsdfTranslucent", (-200, -100))
        tl.inputs["Color"].default_value = srgb("#FFF6EA")
        ms = b.n("ShaderNodeMixShader", (100, 0))
        b.l(mr.outputs["Result"], ms.inputs["Fac"])
        b.l(tl.outputs["BSDF"], ms.inputs[1])
        b.l(tr.outputs["BSDF"], ms.inputs[2])
        out = b.n("ShaderNodeOutputMaterial", (300, 0))
        b.l(ms.outputs["Shader"], out.inputs["Surface"])
        pob.data.materials.append(pm)


# ================================================================ kamera
def kamera(cfg):
    sc = bpy.context.scene
    cd = bpy.data.cameras.new("kamera")
    cd.lens = cfg.get("lens", 75)
    cd.sensor_fit = "VERTICAL"
    cd.sensor_height = 36.0
    cd.sensor_width = 36.0
    cd.clip_start = 0.1
    cd.clip_end = 30
    cd.dof.use_dof = cfg.get("dof", True)
    cd.dof.aperture_fstop = cfg.get("fstop", 4.0)
    cd.dof.aperture_blades = 7
    cd.dof.aperture_rotation = math.radians(12)
    cam = bpy.data.objects.new("kamera", cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    # odak: Lem'alar sirti / alt sira arasi
    odak = bpy.data.objects.new("odak", None)
    sc.collection.objects.link(odak)
    odak.location = cfg.get("odak", (0.0, LEM_Y_ARKA - A.KITAP_D + 0.045, 0.02))
    cd.dof.focus_object = odak
    kamera_konum(cam, cfg)
    return cam


def kamera_konum(cam, cfg, t=0.0):
    """t: 0..1 hareket ilerlemesi (dolly)."""
    pitch = math.radians(cfg.get("pitch", 12.5))
    dist = cfg.get("mesafe", 3.05)
    hedef = Vector(cfg.get("hedef", (0.0, 0.18, 0.30)))
    fwd = Vector((0.0, math.cos(pitch), -math.sin(pitch)))
    dolly = cfg.get("dolly", 0.0) * t
    pos = hedef - fwd * dist * (1.0 - dolly)
    pos += Vector(cfg.get("kaydir", (0.0, 0.0, 0.0))) * t
    cam.location = pos
    cam.rotation_euler = fwd.to_track_quat("-Z", "Y").to_euler()


# ================================================================ render
def render_ayar(cfg):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = cfg.get("samples", 128)
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = cfg.get("esik", 0.02)
    cy.adaptive_min_samples = 0
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    try:
        cy.denoising_prefilter = "ACCURATE"
        cy.denoising_quality = "HIGH"
    except Exception:
        pass
    cy.max_bounces = 6
    cy.diffuse_bounces = 3
    cy.glossy_bounces = 3
    cy.transmission_bounces = 4
    cy.transparent_max_bounces = 6
    cy.volume_bounces = 0
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.blur_glossy = 0.4
    cy.sample_clamp_indirect = 6.0
    try:
        cy.use_light_tree = True
    except Exception:
        pass
    sc.render.use_persistent_data = True
    sc.render.threads_mode = "FIXED"
    sc.render.threads = cfg.get("threads", 4)
    sc.render.resolution_x = cfg.get("rx", 540)
    sc.render.resolution_y = cfg.get("ry", 960)
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "8"
    sc.render.image_settings.color_mode = "RGB"
    vs = sc.view_settings
    vs.view_transform = "AgX"
    vs.look = cfg.get("look", "AgX - Medium High Contrast")
    vs.exposure = cfg.get("pozlama", 0.0)
    vs.gamma = 1.0
    if hasattr(vs, "use_white_balance"):
        vs.use_white_balance = True
        vs.white_balance_temperature = cfg.get("beyaz_k", 6100)   # <6500: sicak goster
        vs.white_balance_tint = cfg.get("beyaz_tint", 4.0)
    sc.display_settings.display_device = "sRGB"
