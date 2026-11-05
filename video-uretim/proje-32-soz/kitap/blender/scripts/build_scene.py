"""Procedural photoreal still: Risale-i Nur stack with the Mushaf on top (Blender 4.5, Cycles).

Run:
  blender -b -P build_scene.py -- --mode beauty --res 338x600 --samples 48 --out test.png

Modes:
  beauty  full scene (books + table + background)
  fg      books only over transparent (table/background are indirect-only: still give reflections/bounce)
  bg      scene without the books
  depth   no-DOF depth render -> writes <out>.npy (camera distance in metres, per pixel)
  tint    tint test strip (several cloth tints side by side under the final light)
"""
import argparse
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                       # .../blender
TEX = os.path.join(ROOT, "tex")
GEN = os.path.join(ROOT, "gen")

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--mode", default="beauty")
ap.add_argument("--res", default="338x600")
ap.add_argument("--samples", type=int, default=48)
ap.add_argument("--out", default=os.path.join(ROOT, "tests", "test.png"))
ap.add_argument("--tint", default="196,90,84")           # sRGB 0-255 cloth albedo
ap.add_argument("--tints", default="")                      # tint mode: "r,g,b;r,g,b;..."
ap.add_argument("--blend", default="")
ap.add_argument("--border", default="")                     # x0,y0,x1,y1 (0-1, y up) render region
ap.add_argument("--threshold", type=float, default=0.01)
ap.add_argument("--nodenoise", action="store_true")
ap.add_argument("--cam", default="")
ap.add_argument("--wb", type=float, default=5000.0)
ap.add_argument("--key_az", type=float, default=168.0)
ap.add_argument("--key_el", type=float, default=14.0)
ap.add_argument("--key_w", type=float, default=66.0)
ap.add_argument("--catch_w", type=float, default=10.0)
ap.add_argument("--exposure", type=float, default=-1.5)
ap.add_argument("--key_spread", type=float, default=80.0)
ap.add_argument("--wash_w", type=float, default=40.0)                 # white balance K (0 = off)                        # override "dist,elev,pitch,fstop"
args = ap.parse_args(argv)

with open(os.path.join(GEN, "textures.json")) as f:
    TJ = json.load(f)

CM = 0.01
rng = np.random.default_rng(7)

# ================================================================================================
# helpers
# ================================================================================================

def srgb2lin(c):
    c = np.asarray(c, float) / 255.0
    return tuple(np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4))


def resample(P, ds):
    P = np.asarray(P, float)
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    n = max(2, int(round(s[-1] / ds)) + 1)
    t = np.linspace(0, s[-1], n)
    return np.stack([np.interp(t, s, P[:, 0]), np.interp(t, s, P[:, 1])], 1)


def gsmooth(P, sigma):
    """Gaussian smoothing of an open polyline (sigma in samples); point-reflection padding keeps ends."""
    if sigma <= 0:
        return P.copy()
    k = int(3 * sigma) + 1
    w = np.exp(-0.5 * (np.arange(-k, k + 1) / sigma) ** 2)
    w /= w.sum()
    pre = 2 * P[0] - P[1:k + 1][::-1]
    post = 2 * P[-1] - P[-k - 1:-1][::-1]
    Q = np.concatenate([pre, P, post])
    return np.stack([np.convolve(Q[:, 0], w, "valid"), np.convolve(Q[:, 1], w, "valid")], 1)


def tangents(P):
    d = np.gradient(P, axis=0)
    return d / np.linalg.norm(d, axis=1)[:, None]


def arclen(P):
    return np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# ================================================================================================
# book geometry
# ================================================================================================

def book_profiles(W, T, bulge, tb, tsp, groove_off, groove_w, groove_d, ds=0.0004):
    """Cross-section (y across, z up) of the cover case: outer contour, inner contour, thickness."""
    y_sh = -W / 2 + bulge
    R = ((T / 2) ** 2 + bulge ** 2) / (2 * bulge)
    yc, zc = y_sh - bulge + R, T / 2
    a0 = math.atan2(-zc, y_sh - yc)
    a1 = math.atan2(T - zc, y_sh - yc) - 2 * math.pi
    y_g = y_sh + groove_off

    def groove(y):
        u = (y - y_g) / groove_w
        return groove_d * np.where(np.abs(u) < 1, np.cos(np.pi * u / 2) ** 2, 0.0)

    yb = np.linspace(W / 2, y_sh, 600)
    bottom = np.stack([yb, groove(yb)], 1)
    th = np.linspace(a0, a1, 400)
    arc = np.stack([yc + R * np.cos(th), zc + R * np.sin(th)], 1)
    top = np.stack([yb[::-1], T - groove(yb[::-1])], 1)
    P = np.concatenate([bottom, arc[1:], top[1:]])
    P = resample(P, ds)
    P = gsmooth(P, 0.0011 / ds)           # rounds the spine shoulders (~1-2 mm)
    tn = tangents(P)
    n_in = np.stack([tn[:, 1], -tn[:, 0]], 1)
    y_board = y_sh + groove_off + groove_w * 0.7      # boards start just past the hinge groove
    h = tsp + (tb - tsp) * smoothstep(y_board - 0.0006, y_board + 0.0006, P[:, 0])
    I = P + n_in * h[:, None]
    I = gsmooth(I, 0.0016 / ds)
    I[0] = P[0] + np.array([0, tb])
    I[-1] = P[-1] + np.array([0, -tb])
    s = arclen(P)
    # apex (spine centre): min y on the arc
    mid = np.argmin(P[:, 0])
    geo = dict(y_sh=y_sh, R=R, yc=yc, zc=zc, y_board=y_board, s_apex=s[mid], s_total=s[-1])
    return P, I, h, s, geo


def pick_indices(P, I, max_d=0.006, max_turn=math.radians(2.0)):
    tP, tI = tangents(P), tangents(I)
    keep = [0]
    acc = 0.0
    for i in range(1, len(P) - 1):
        j = keep[-1]
        d = np.linalg.norm(P[i] - P[j])
        turn = max(math.acos(np.clip(np.dot(tP[i], tP[j]), -1, 1)), math.acos(np.clip(np.dot(tI[i], tI[j]), -1, 1)))
        if d >= max_d or turn >= max_turn:
            keep.append(i)
    keep.append(len(P) - 1)
    return np.array(keep)


def build_case(name, L, W, T, bulge, tb=0.0030, tsp=0.0013, bevel=0.0009):
    groove_off, groove_w, groove_d = 0.0042, 0.0028, 0.0011
    P, I, h, s, geo = book_profiles(W, T, bulge, tb, tsp, groove_off, groove_w, groove_d)
    idx = pick_indices(P, I)
    P, I, h, s = P[idx], I[idx], h[idx], s[idx]
    n = len(P)
    label_h = TJ["label_h"] * CM

    bm = bmesh.new()
    uv_c = bm.loops.layers.uv.new("UVMap")
    uv_l = bm.loops.layers.uv.new("UVLabel")
    uv_v = bm.loops.layers.uv.new("UVCover")
    xs = (-L / 2, L / 2)
    O = [[bm.verts.new((x, P[i, 0], P[i, 1])) for i in range(n)] for x in xs]
    In = [[bm.verts.new((x, I[i, 0], I[i, 1])) for i in range(n)] for x in xs]
    # per-vertex data for UVs
    vdata = {}
    for r, x in enumerate(xs):
        for i in range(n):
            vdata[O[r][i]] = dict(x=x, y=P[i, 0], z=P[i, 1], s=s[i], d=0.0)
            vdata[In[r][i]] = dict(x=x, y=I[i, 0], z=I[i, 1], s=s[i], d=h[i])

    def face(vs, kind, mat):
        f = bm.faces.new(vs)
        f.material_index = mat
        f.smooth = True
        for lp in f.loops:
            v = vdata[lp.vert]
            if kind == "outer":
                lp[uv_c].uv = (v["x"], v["s"])
                lp[uv_l].uv = ((v["x"] + L / 2) / L, (v["s"] - geo["s_apex"]) / label_h + 0.5)
                lp[uv_v].uv = ((v["x"] + L / 2) / L, (v["y"] + W / 2) / W)
            elif kind == "inner":
                lp[uv_c].uv = (v["x"], v["s"])
                lp[uv_l].uv = (-5, -5)
                lp[uv_v].uv = (-5, -5)
            elif kind == "fore":
                lp[uv_c].uv = (v["x"], v["s"] + v["d"])
                lp[uv_l].uv = (-5, -5)
                lp[uv_v].uv = (-5, -5)
            else:  # cap
                lp[uv_c].uv = (v["s"], v["d"])
                lp[uv_l].uv = (-5, -5)
                lp[uv_v].uv = (-5, -5)
        return f

    for i in range(n - 1):
        face([O[0][i], O[0][i + 1], O[1][i + 1], O[1][i]], "outer", 0)
        face([In[0][i], In[1][i], In[1][i + 1], In[0][i + 1]], "inner", 1)
        face([O[0][i], In[0][i], In[0][i + 1], O[0][i + 1]], "cap", 0)
        face([O[1][i], O[1][i + 1], In[1][i + 1], In[1][i]], "cap", 0)
    for i in (0, n - 1):
        face([O[0][i], O[1][i], In[1][i], In[0][i]], "fore", 0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    sharp = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(50)]
    bmesh.ops.bevel(bm, geom=sharp, offset=bevel, offset_type="OFFSET", segments=4, profile=0.5,
                    affect="EDGES", clamp_overlap=True, loop_slide=True)
    bm.normal_update()
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(35):
            e.smooth = False
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    return ob, geo


def build_pageblock(name, L, W, T, bulge, geo, tb=0.0030, tsp=0.0013, sq=0.0030, hollow=0.0011, concave=0.0022):
    """Text block: flat faces against the boards, rounded spine, slightly concave fore-edge."""
    R2 = geo["R"] - tsp - hollow
    yc, zc = geo["yc"], geo["zc"]
    z0, z1 = tb + 0.0001, T - tb - 0.0001
    y_fe = W / 2 - sq
    # spine arc between z0 and z1
    th0 = math.atan2(z0 - zc, -math.sqrt(R2 ** 2 - (z0 - zc) ** 2))
    th1 = math.atan2(z1 - zc, -math.sqrt(R2 ** 2 - (z1 - zc) ** 2))
    ths = np.linspace(th0, th1 - 2 * math.pi if th1 > 0 else th1, 48)
    arc = [(yc + R2 * math.cos(t), zc + R2 * math.sin(t)) for t in ths]
    # small shoulder rounding where arc meets the flat faces
    pts = [(y_fe, z0)] + arc + [(y_fe, z1)]
    # concave fore-edge from top back to bottom
    for k in range(1, 24):
        u = k / 24.0
        z = z1 + (z0 - z1) * u
        zz = (z - zc) / (z1 - zc)
        pts.append((y_fe - concave * (1 - zz * zz), z))
    bm = bmesh.new()
    x0, x1 = -L / 2 + sq, L / 2 - sq
    v0 = [bm.verts.new((x0, y, z)) for (y, z) in pts]
    v1 = [bm.verts.new((x1, y, z)) for (y, z) in pts]
    m = len(pts)
    for i in range(m):
        j = (i + 1) % m
        f = bm.faces.new([v0[i], v0[j], v1[j], v1[i]])
        f.smooth = True
    bm.faces.new(v0[::-1])
    bm.faces.new(v1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(40):
            e.smooth = False
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    hb_arc = [(yc + (R2 - 0.0009) * math.cos(t), zc + (R2 - 0.0009) * math.sin(t)) for t in np.linspace(ths[0], ths[-1], 40)]
    return ob, (x0, x1), hb_arc


def build_headband(name, x, arc, radius=0.0011):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 4
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(arc) - 1)
    for p, (y, z) in zip(sp.points, arc):
        p.co = (x, y, z + 0.0, 1.0)
    return bpy.data.objects.new(name, cu)


# ================================================================================================
# materials
# ================================================================================================

class NT:
    def __init__(self, mat):
        mat.use_nodes = True
        self.t = mat.node_tree
        self.t.nodes.clear()

    def new(self, typ, **props):
        nd = self.t.nodes.new(typ)
        for k, v in props.items():
            setattr(nd, k, v)
        return nd

    def set(self, sock, val):
        if isinstance(val, bpy.types.NodeSocket):
            self.t.links.new(val, sock)
        elif val is not None:
            if sock.type == "RGBA" and len(val) == 3:
                val = (*val, 1.0)
            sock.default_value = val

    def math(self, op, a, b=None, c=None, clamp=False):
        nd = self.new("ShaderNodeMath", operation=op, use_clamp=clamp)
        self.set(nd.inputs[0], a)
        if b is not None:
            self.set(nd.inputs[1], b)
        if c is not None:
            self.set(nd.inputs[2], c)
        return nd.outputs[0]

    def mixf(self, f, a, b):
        nd = self.new("ShaderNodeMix", data_type="FLOAT")
        self.set(nd.inputs[0], f)
        self.set(nd.inputs[2], a)
        self.set(nd.inputs[3], b)
        return nd.outputs[0]

    def mixc(self, f, a, b, blend="MIX"):
        nd = self.new("ShaderNodeMix", data_type="RGBA", blend_type=blend)
        self.set(nd.inputs[0], f)
        self.set(nd.inputs[6], a)
        self.set(nd.inputs[7], b)
        return nd.outputs[2]

    def maprange(self, x, a, b, c, d, clamp=True):
        nd = self.new("ShaderNodeMapRange", clamp=clamp)
        self.set(nd.inputs[0], x)
        nd.inputs[1].default_value = a
        nd.inputs[2].default_value = b
        nd.inputs[3].default_value = c
        nd.inputs[4].default_value = d
        return nd.outputs[0]

    def uv(self, name):
        return self.new("ShaderNodeUVMap", uv_map=name).outputs[0]

    def mapping(self, vec, scale=(1, 1, 1), loc=(0, 0, 0), rot=(0, 0, 0)):
        nd = self.new("ShaderNodeMapping")
        self.set(nd.inputs[0], vec)
        nd.inputs["Location"].default_value = loc
        nd.inputs["Rotation"].default_value = rot
        nd.inputs["Scale"].default_value = scale
        return nd.outputs[0]

    def img(self, path, vec, color=False, ext="REPEAT", interp="Linear"):
        im = bpy.data.images.load(path, check_existing=True)
        im.colorspace_settings.name = "sRGB" if color else "Non-Color"
        nd = self.new("ShaderNodeTexImage", extension=ext, interpolation=interp)
        nd.image = im
        self.set(nd.inputs[0], vec)
        return nd

    def noise(self, vec, scale, detail=4.0, rough=0.5, dim="3D"):
        nd = self.new("ShaderNodeTexNoise", noise_dimensions=dim)
        self.set(nd.inputs["Vector"], vec)
        nd.inputs["Scale"].default_value = scale
        nd.inputs["Detail"].default_value = detail
        nd.inputs["Roughness"].default_value = rough
        return nd.outputs[0]

    def normalmap(self, col, strength, uvname="UVMap"):
        nd = self.new("ShaderNodeNormalMap", uv_map=uvname)
        nd.inputs["Strength"].default_value = strength
        self.set(nd.inputs["Color"], col)
        return nd.outputs[0]

    def bump(self, height, strength, distance, normal=None, invert=False):
        nd = self.new("ShaderNodeBump", invert=invert)
        nd.inputs["Strength"].default_value = strength
        nd.inputs["Distance"].default_value = distance
        self.set(nd.inputs["Height"], height)
        if normal is not None:
            self.set(nd.inputs["Normal"], normal)
        return nd.outputs[0]

    def principled(self, **kw):
        nd = self.new("ShaderNodeBsdfPrincipled")
        for k, v in kw.items():
            self.set(nd.inputs[k.replace("_", " ")], v)
        return nd

    def out(self, shader, disp=None):
        o = self.new("ShaderNodeOutputMaterial", target="ALL")
        self.t.links.new(shader, o.inputs["Surface"])
        if disp is not None:
            self.t.links.new(disp, o.inputs["Displacement"])
        return o

    def objco(self):
        return self.new("ShaderNodeTexCoord").outputs["Object"]

    def sep(self, vec):
        nd = self.new("ShaderNodeSeparateXYZ")
        self.set(nd.inputs[0], vec)
        return nd.outputs

    def comb(self, x, y, z):
        nd = self.new("ShaderNodeCombineXYZ")
        self.set(nd.inputs[0], x)
        self.set(nd.inputs[1], y)
        self.set(nd.inputs[2], z)
        return nd.outputs[0]


GOLD = (0.83, 0.58, 0.24)       # linear base colour (F0) of the foil


def t(folder, kind):
    base = folder.split("/")[-1] if "/" in folder else folder
    return os.path.join(TEX, folder, f"{base}_{kind}.jpg")


def mat_cloth(name, tint_srgb, label_idx):
    m = bpy.data.materials.new(name)
    n = NT(m)
    F = "Fabric036_2K-JPG"
    uvm = n.mapping(n.uv("UVMap"), scale=(1 / 0.11, 1 / 0.11, 1), loc=(0.137 * label_idx, 0.291 * label_idx, 0))
    col = n.img(t(F, "Color"), uvm, color=True).outputs[0]
    nrm = n.img(t(F, "NormalGL"), uvm).outputs[0]
    rgh = n.img(t(F, "Roughness"), uvm).outputs[0]
    dsp = n.img(t(F, "Displacement"), uvm).outputs[0]
    # weave modulation of the dye: normalise texture around 1, boost contrast a little
    bw = n.new("ShaderNodeRGBToBW")
    n.set(bw.inputs[0], col)
    lum = n.math("DIVIDE", bw.outputs[0], 0.49)
    mod = n.math("MULTIPLY_ADD", n.math("SUBTRACT", lum, 1.0), 1.15, 1.0)
    # gentle macro mottling / sun-fading
    oc = n.mapping(n.objco(), loc=(3.1 * label_idx, 1.7 * label_idx, 0.9 * label_idx))
    macro = n.maprange(n.noise(oc, 9.0, 3.0, 0.55), 0.3, 0.7, 0.955, 1.045)
    # dye-lot / fading variation between the four volumes (very small)
    lot = (1.0, 0.988, 1.010, 0.994)[label_idx]
    tint = tuple(np.clip(np.array(srgb2lin(tint_srgb)) * lot, 0, 1))
    # rubbed, slightly lighter cloth along the spine shoulders (|arc distance from apex| ~2.0-2.7 cm)
    uvl0 = n.sep(n.uv("UVLabel"))
    dcm = n.math("MULTIPLY", n.math("ABSOLUTE", n.math("SUBTRACT", uvl0[1], 0.5)), TJ["label_h"])
    wear = n.math("MULTIPLY", n.maprange(dcm, 1.95, 2.3, 0.0, 1.0), n.maprange(dcm, 2.6, 2.9, 1.0, 0.0))
    macro = n.math("MULTIPLY_ADD", wear, 0.07, macro)
    base = n.mixc(1.0, n.mixc(1.0, (*tint, 1), n.comb(mod, mod, mod), "MULTIPLY"), n.comb(macro, macro, macro), "MULTIPLY")
    rough = n.maprange(rgh, 0.0, 1.0, 0.66, 0.95)
    nm = n.normalmap(nrm, 1.3)
    nm_gold = n.normalmap(nrm, 0.45)
    # foil mask + deboss
    uvl = n.uv("UVLabel")
    mask = n.img(os.path.join(GEN, f"spine_{label_idx}.png"), uvl, ext="CLIP").outputs[0]
    mh = n.img(os.path.join(GEN, f"spine_{label_idx}_h.png"), uvl, ext="CLIP").outputs[0]
    # tiny foil voids where the weave is deepest
    voids = n.maprange(n.math("ADD", dsp, n.math("MULTIPLY", n.noise(uvm, 6.0, 2.0), 0.25)), 0.22, 0.34, 0.0, 1.0)
    fmask = n.math("MULTIPLY", mask, voids)
    height = n.math("SUBTRACT", 1.0, mh)
    N_cloth = n.bump(height, 1.0, 0.00022, nm)
    N_gold = n.bump(height, 1.0, 0.00022, nm_gold)
    cloth = n.principled(Base_Color=base, Roughness=rough, Normal=N_cloth,
                         Sheen_Weight=0.55, Sheen_Roughness=0.45, Sheen_Tint=(1.0, 0.93, 0.90, 1),
                         Specular_IOR_Level=0.32)
    groughn = n.maprange(n.noise(uvl, 220.0, 3.0, 0.6), 0.3, 0.7, 0.18, 0.36)
    gold = n.principled(Base_Color=(*GOLD, 1), Metallic=1.0, Roughness=groughn, Normal=N_gold,
                        Specular_Tint=(1.0, 0.92, 0.75, 1))
    mix = n.new("ShaderNodeMixShader")
    n.set(mix.inputs[0], fmask)
    n.set(mix.inputs[1], cloth.outputs[0])
    n.set(mix.inputs[2], gold.outputs[0])
    n.out(mix.outputs[0])
    return m


def mat_leather(name):
    m = bpy.data.materials.new(name)
    n = NT(m)
    F = "Leather026_2K-JPG"
    uvm = n.mapping(n.uv("UVMap"), scale=(1 / 0.075, 1 / 0.075, 1))
    col = n.img(t(F, "Color"), uvm, color=True).outputs[0]
    nrm = n.img(t(F, "NormalGL"), uvm).outputs[0]
    rgh = n.img(t(F, "Roughness"), uvm).outputs[0]
    bw = n.new("ShaderNodeRGBToBW")
    n.set(bw.inputs[0], col)
    lum = n.math("DIVIDE", bw.outputs[0], 0.0105)          # texture mean (linear) ~0.0105
    mod = n.math("MULTIPLY_ADD", n.math("SUBTRACT", lum, 1.0), 0.6, 1.0)
    green = srgb2lin((14, 44, 33))
    oc = n.objco()
    macro = n.maprange(n.noise(oc, 6.0, 3.0, 0.5), 0.3, 0.7, 0.88, 1.12)
    base = n.mixc(1.0, n.mixc(1.0, (*green, 1), n.comb(mod, mod, mod), "MULTIPLY"), n.comb(macro, macro, macro), "MULTIPLY")
    rough = n.maprange(rgh, 0.0, 1.0, 0.52, 0.80)
    nm = n.normalmap(nrm, 0.7)
    # gold tooling: top cover + spine
    uvv = n.uv("UVCover")
    uvl = n.uv("UVLabel")
    cmask = n.img(os.path.join(GEN, "quran_cover.png"), uvv, ext="CLIP").outputs[0]
    ch = n.img(os.path.join(GEN, "quran_cover_h.png"), uvv, ext="CLIP").outputs[0]
    smask = n.img(os.path.join(GEN, "quran_spine.png"), uvl, ext="CLIP").outputs[0]
    sh = n.img(os.path.join(GEN, "quran_spine_h.png"), uvl, ext="CLIP").outputs[0]
    blind = n.img(os.path.join(GEN, "quran_cover_blind.png"), uvv, ext="CLIP").outputs[0]
    gmask = n.math("MAXIMUM", cmask, smask)
    hgt = n.math("SUBTRACT", 1.0, n.math("MAXIMUM", ch, sh))
    N_l = n.bump(hgt, 1.0, 0.0004, nm)
    N_g = n.bump(hgt, 1.0, 0.0004, n.normalmap(nrm, 0.15))
    # blind tooling darkens the leather slightly (burnished)
    base2 = n.mixc(n.math("MULTIPLY", blind, 0.55), base, (0.0015, 0.008, 0.005, 1))
    leather = n.principled(Base_Color=base2, Roughness=rough, Normal=N_l, Specular_IOR_Level=0.30,
                           Coat_Weight=0.0, Coat_Roughness=0.35)
    groughn = n.maprange(n.noise(uvv, 300.0, 3.0, 0.6), 0.3, 0.7, 0.16, 0.34)
    gold = n.principled(Base_Color=(*GOLD, 1), Metallic=1.0, Roughness=groughn, Normal=N_g,
                        Specular_Tint=(1.0, 0.92, 0.75, 1))
    mix = n.new("ShaderNodeMixShader")
    n.set(mix.inputs[0], gmask)
    n.set(mix.inputs[1], leather.outputs[0])
    n.set(mix.inputs[2], gold.outputs[0])
    n.out(mix.outputs[0])
    return m


def page_lines(n, oc):
    """Return (variation 0..1, signature gaps 0..1) varying along object Z (page stacking)."""
    x, y, z = n.sep(oc)
    v = n.comb(n.math("MULTIPLY", x, 12.0), n.math("MULTIPLY", y, 12.0), n.math("MULTIPLY", z, 1100.0))
    fine = n.noise(v, 1.0, 4.0, 0.65)
    v2 = n.comb(n.math("MULTIPLY", x, 3.0), n.math("MULTIPLY", y, 3.0), n.math("MULTIPLY", z, 330.0))
    sig = n.noise(v2, 1.0, 2.0, 0.5)
    gaps = n.maprange(sig, 0.60, 0.66, 0.0, 1.0)
    return fine, gaps


def mat_pages(name):
    m = bpy.data.materials.new(name)
    n = NT(m)
    oc = n.objco()
    fine, gaps = page_lines(n, oc)
    cream = srgb2lin((236, 226, 202))
    shade = n.maprange(fine, 0.25, 0.75, 0.80, 1.05)
    shade = n.math("MULTIPLY", shade, n.math("MULTIPLY_ADD", gaps, -0.30, 1.0))
    base = n.mixc(1.0, (*cream, 1), n.comb(shade, shade, shade), "MULTIPLY")
    N = n.bump(n.math("ADD", fine, n.math("MULTIPLY", gaps, -0.8)), 1.0, 0.00025)
    p = n.principled(Base_Color=base, Roughness=0.72, Normal=N, Subsurface_Weight=0.08,
                     Subsurface_Radius=(0.004, 0.003, 0.002), Subsurface_Scale=0.5, Specular_IOR_Level=0.35)
    n.out(p.outputs[0])
    return m


def mat_gilt(name):
    m = bpy.data.materials.new(name)
    n = NT(m)
    oc = n.objco()
    fine, gaps = page_lines(n, oc)
    r = n.maprange(fine, 0.3, 0.7, 0.14, 0.32)
    r = n.math("ADD", r, n.math("MULTIPLY", gaps, 0.25))
    col = n.mixc(n.math("MULTIPLY", gaps, 0.5), (0.90, 0.68, 0.34, 1), (0.45, 0.30, 0.12, 1))
    N = n.bump(n.math("ADD", fine, n.math("MULTIPLY", gaps, -1.0)), 0.5, 0.00008)
    p = n.principled(Base_Color=col, Metallic=1.0, Roughness=r, Normal=N, Specular_Tint=(1.0, 0.9, 0.7, 1))
    n.out(p.outputs[0])
    return m


def mat_endpaper(name, rgb=(232, 222, 200)):
    m = bpy.data.materials.new(name)
    n = NT(m)
    p = n.principled(Base_Color=(*srgb2lin(rgb), 1), Roughness=0.8)
    n.out(p.outputs[0])
    return m


def mat_headband(name, c1, c2):
    m = bpy.data.materials.new(name)
    n = NT(m)
    oc = n.objco()
    x, y, z = n.sep(oc)
    w = n.new("ShaderNodeTexWave", wave_type="BANDS", bands_direction="Z")
    n.set(w.inputs["Vector"], oc)
    w.inputs["Scale"].default_value = 260.0
    w.inputs["Distortion"].default_value = 0.0
    f = n.maprange(w.outputs["Fac"], 0.45, 0.55, 0.0, 1.0)
    col = n.mixc(f, (*srgb2lin(c1), 1), (*srgb2lin(c2), 1))
    p = n.principled(Base_Color=col, Roughness=0.42, Sheen_Weight=0.6, Sheen_Roughness=0.3)
    n.out(p.outputs[0])
    return m


def mat_wood(name):
    m = bpy.data.materials.new(name)
    n = NT(m)
    F = "Wood027_2K-JPG"
    oc = n.objco()
    uvm = n.mapping(oc, scale=(1 / 1.1, 1 / 1.1, 1), rot=(0, 0, 0))
    col = n.img(t(F, "Color"), uvm, color=True).outputs[0]
    nrm = n.img(t(F, "NormalGL"), uvm).outputs[0]
    rgh = n.img(t(F, "Roughness"), uvm).outputs[0]
    # object-space projection: use tangent-free bump from colour instead of the tangent normal map
    bw = n.new("ShaderNodeRGBToBW")
    n.set(bw.inputs[0], col)
    N = n.bump(bw.outputs[0], 0.25, 0.0004)
    col2 = n.mixc(1.0, col, (0.55, 0.50, 0.48, 1), "MULTIPLY")
    rough = n.maprange(rgh, 0.0, 1.0, 0.28, 0.5)
    micro = n.maprange(n.noise(oc, 35.0, 6.0, 0.6), 0.3, 0.7, 0.16, 0.26)
    Nc = n.bump(n.noise(oc, 900.0, 2.0, 0.5), 0.08, 0.00002)
    p = n.principled(Base_Color=col2, Roughness=rough, Normal=N, Coat_Weight=0.85, Coat_Roughness=micro,
                     Coat_IOR=1.5, Coat_Normal=Nc, Specular_IOR_Level=0.5)
    n.out(p.outputs[0])
    return m


def mat_wall(name):
    m = bpy.data.materials.new(name)
    n = NT(m)
    oc = n.objco()
    v = n.maprange(n.noise(oc, 1.2, 4.0, 0.6), 0.3, 0.7, 0.85, 1.15)
    base = n.mixc(1.0, (*srgb2lin((70, 56, 46)), 1), n.comb(v, v, v), "MULTIPLY")
    p = n.principled(Base_Color=base, Roughness=0.92, Normal=n.bump(n.noise(oc, 40.0, 4.0, 0.6), 0.1, 0.002))
    n.out(p.outputs[0])
    return m


def mat_emit(name, kelvin, strength, soft=False):
    m = bpy.data.materials.new(name)
    n = NT(m)
    bb = n.new("ShaderNodeBlackbody")
    bb.inputs[0].default_value = kelvin
    e = n.new("ShaderNodeEmission")
    n.set(e.inputs[0], bb.outputs[0])
    if soft:
        g = n.sep(n.new("ShaderNodeTexCoord").outputs["Generated"])
        def fall(u, pw):
            q = n.math("MULTIPLY", n.math("SUBTRACT", n.math("MULTIPLY", u, 2.0), 1.0), n.math("SUBTRACT", n.math("MULTIPLY", u, 2.0), 1.0))
            return n.math("POWER", n.math("SUBTRACT", 1.0, q, clamp=True), pw)
        f = n.math("MULTIPLY", fall(g[0], 1.5), fall(g[1], 0.8))
        n.set(e.inputs[1], n.math("MULTIPLY", f, strength))
    else:
        e.inputs[1].default_value = strength
    n.out(e.outputs[0])
    return m


# ================================================================================================
# scene
# ================================================================================================
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"

col_books = bpy.data.collections.new("Books")
col_env = bpy.data.collections.new("Env")
scene.collection.children.link(col_books)
scene.collection.children.link(col_env)
col_lights = bpy.data.collections.new("Lights")
scene.collection.children.link(col_lights)

tint = tuple(float(v) for v in args.tint.split(","))

R_ = TJ["risale"]
Q_ = TJ["quran"]
RL, RW, RT, RB = R_["L"] * CM, R_["W"] * CM, R_["T"] * CM, R_["bulge"] * CM
QL, QW, QT, QB = Q_["L"] * CM, Q_["W"] * CM, Q_["T"] * CM, Q_["bulge"] * CM

m_pages = mat_pages("Pages")
m_gilt = mat_gilt("Gilt")
m_end = mat_endpaper("Endpaper")
m_endq = mat_endpaper("EndpaperQ", (200, 184, 150))
m_hb = mat_headband("Headband", (238, 228, 205), (150, 46, 48))
m_hbq = mat_headband("HeadbandQ", (220, 180, 90), (20, 70, 50))
m_leather = mat_leather("QuranLeather")


def make_book(name, L, W, T, bulge, mat_cover, mat_inner, mat_block, mat_hb, parent_coll):
    case, geo = build_case(name + "_case", L, W, T, bulge)
    case.data.materials.append(mat_cover)
    case.data.materials.append(mat_inner)
    block, (x0, x1), hb_arc = build_pageblock(name + "_block", L, W, T, bulge, geo)
    block.data.materials.append(mat_block)
    hb0 = build_headband(name + "_hb0", x0 - 0.0002, hb_arc)
    hb1 = build_headband(name + "_hb1", x1 + 0.0002, hb_arc)
    for o in (hb0, hb1):
        o.data.materials.append(mat_hb)
    root = bpy.data.objects.new(name, None)
    for o in (root, case, block, hb0, hb1):
        parent_coll.objects.link(o)
    for o in (case, block, hb0, hb1):
        o.parent = root
    return root, geo


def place(root, x, y, z, rz_deg):
    root.location = (x, y, z)
    root.rotation_euler = (0, 0, math.radians(rz_deg))


STACK_YAW = -25.0
stack = bpy.data.objects.new("Stack", None)
col_books.objects.link(stack)
stack.rotation_euler = (0, 0, math.radians(STACK_YAW))

# bottom -> top : SUALAR(3), LEM'ALAR(2), MEKTUBAT(1), SOZLER(0)
offsets = [(0.000, 0.000, 0.0), (0.004, -0.003, 2.1), (-0.005, 0.002, -1.6), (0.003, -0.004, 3.2)]
books = []
tint_list = None
if args.mode == "tint" and args.tints:
    tint_list = [tuple(float(v) for v in s.split(",")) for s in args.tints.split(";")]
for k in range(4):
    li = 3 - k
    tk = tint if tint_list is None else tint_list[k % len(tint_list)]
    mc = mat_cloth(f"Cloth_{li}", tk, li)
    root, geo = make_book(f"Risale_{li}", RL, RW, RT, RB, mc, m_end, m_pages, m_hb, col_books)
    dx, dy, rz = offsets[k]
    place(root, dx, dy, k * RT + 0.00005 * k, rz)
    root.parent = stack
    books.append((root, geo))

quran, qgeo = make_book("Quran", QL, QW, QT, QB, m_leather, m_endq, m_gilt, m_hbq, col_books)
place(quran, 0.004, 0.017, 4 * RT + 0.0002, 7.5)
quran.parent = stack

# focus target: centre of SOZLER spine (top Risale), on the spine apex
top_root, top_geo = books[3]
focus = bpy.data.objects.new("Focus", None)
col_books.objects.link(focus)
focus.parent = top_root
focus.location = (0.0, -RW / 2 + 0.0002, RT / 2)

# ---------------------------------------------------------------- table, room
m_wood = mat_wood("Walnut")
bpy.ops.mesh.primitive_cube_add(size=1)
table = bpy.context.active_object
for c in table.users_collection:
    c.objects.unlink(table)
col_env.objects.link(table)
table.name = "Table"
for v in table.data.vertices:
    v.co = Vector((v.co.x * 3.2, v.co.y * 3.6, v.co.z * 0.04))
table.location = (0, 0.6, -0.02)
bpy.ops.object.select_all(action="DESELECT")
table.data.materials.append(m_wood)
bev = table.modifiers.new("bev", "BEVEL")
bev.width = 0.004
bev.segments = 3

m_wall = mat_wall("Wall")


def plane(name, size, loc, rot, mat, coll=col_env):
    bpy.ops.mesh.primitive_plane_add(size=1)
    o = bpy.context.active_object
    for c in o.users_collection:
        c.objects.unlink(o)
    coll.objects.link(o)
    o.name = name
    for v in o.data.vertices:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], 0))
    o.location = loc
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


wall = plane("BackWall", (10, 5), (0, 4.6, 1.0), (math.radians(90), 0, 0), m_wall)
floor = plane("Floor", (10, 10), (0, 2, -0.76), (0, 0, 0), m_wall)

# window glow (back-left) and two distant warm lamps for bokeh
m_win = mat_emit("WindowGlow", 5000, 1.35, soft=True)
win = plane("Window", (0.9, 1.8), (-0.95, 4.55, 0.35), (math.radians(90), 0, 0), m_win)
m_lamp = mat_emit("LampBulb", 2400, 12.0)
for i, (x, y, z, r) in enumerate([(0.34, 4.2, -0.16, 0.018), (0.52, 4.0, -0.26, 0.014), (-0.30, 4.4, -0.10, 0.010)]):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, z), segments=24, ring_count=12)
    o = bpy.context.active_object
    for c in o.users_collection:
        c.objects.unlink(o)
    col_env.objects.link(o)
    o.name = f"Lamp{i}"
    o.data.materials.append(m_lamp)
    o.visible_shadow = False
    o.visible_diffuse = False
    o.visible_glossy = False

# ---------------------------------------------------------------- lights
def area_light(name, size, loc, target, power, kelvin, spread=180):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape = "RECTANGLE"
    ld.size, ld.size_y = size
    ld.energy = power
    ld.spread = math.radians(spread)
    ld.use_nodes = True
    nt = ld.node_tree
    em = nt.nodes.get("Emission")
    bb = nt.nodes.new("ShaderNodeBlackbody")
    bb.inputs[0].default_value = kelvin
    nt.links.new(bb.outputs[0], em.inputs["Color"])
    ob = bpy.data.objects.new(name, ld)
    col_lights.objects.link(ob)
    ob.location = loc
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return ob


def light_at(name, size, az, el, dist, power, kelvin, target=(0.0, 0.0, 0.10), spread=180):
    """Area light placed by azimuth/elevation (degrees, world frame) around the stack, aimed at target."""
    a, e = math.radians(az), math.radians(el)
    loc = Vector(target) + dist * Vector((math.cos(e) * math.cos(a), math.cos(e) * math.sin(a), math.sin(e)))
    return area_light(name, size, tuple(loc), target, power, kelvin, spread)


# late-afternoon window: low and from the left so it rakes along the spines (spine normals face az -115)
key = light_at("Key_Window", (0.9, 1.3), args.key_az, args.key_el, 1.30, args.key_w, 4300, spread=args.key_spread)
# narrow low strip front-left (a reflector/edge of the window) -> specular catch on the gold foil
catch = light_at("FoilCatch", (0.6, 0.04), -138.0, 4.0, 1.0, args.catch_w, 4500, target=(0.0, -0.04, 0.12))
rim = light_at("Rim", (0.7, 0.35), 84.0, 24.0, 1.5, 24.0, 3600)
# the rim is flagged/snooted onto the books only (no hot spot on the table behind the stack)
rim.light_linking.receiver_collection = col_books
# dim warm practical washing the far wall (keeps the negative space softly lit, not black)
wash = area_light("WallWash", (2.0, 0.6), (0.1, 3.3, 1.6), (0.0, 4.6, 0.0), args.wash_w, 2700)
wash.light_linking.receiver_collection = bpy.data.collections.new("WashReceivers")
for o in (wall, floor):
    wash.light_linking.receiver_collection.objects.link(o)
# soft bounce from the right (very low) so shadows stay warm, not black
fill = light_at("Fill", (1.0, 1.0), -20.0, 18.0, 1.7, 3.0, 3900)

# world HDRI at low strength (reflections)
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
wn = world.node_tree
wn.nodes.clear()
env = wn.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(TEX, "IndoorEnvironmentHDRI013", "IndoorEnvironmentHDRI013_2K_HDR.exr"))
mp = wn.nodes.new("ShaderNodeMapping")
tc = wn.nodes.new("ShaderNodeTexCoord")
mp.inputs["Rotation"].default_value = (0, 0, math.radians(110))
wn.links.new(tc.outputs["Generated"], mp.inputs[0])
wn.links.new(mp.outputs[0], env.inputs[0])
bg = wn.nodes.new("ShaderNodeBackground")
bg.inputs["Strength"].default_value = 0.15
wn.links.new(env.outputs[0], bg.inputs[0])
wo = wn.nodes.new("ShaderNodeOutputWorld")
wn.links.new(bg.outputs[0], wo.inputs[0])

# ---------------------------------------------------------------- camera
dist, elev, pitch, fstop = 1.59, 23.0, 18.8, 2.8
if args.cam:
    dist, elev, pitch, fstop = (float(v) for v in args.cam.split(","))
target = Vector((0.0, 0.0, 0.10))
cam_d = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_d)
scene.collection.objects.link(cam)
scene.camera = cam
cam.location = target + Vector((0, -dist * math.cos(math.radians(elev)), dist * math.sin(math.radians(elev))))
cam.rotation_euler = (math.radians(90 - pitch), 0, 0)
cam_d.lens = 85
cam_d.sensor_fit = "VERTICAL"
cam_d.sensor_height = 36
cam_d.sensor_width = 36
cam_d.clip_start = 0.05
cam_d.clip_end = 50
cam_d.dof.use_dof = args.mode != "depth"
cam_d.dof.focus_object = focus
cam_d.dof.aperture_fstop = fstop
cam_d.dof.aperture_blades = 9
cam_d.dof.aperture_rotation = math.radians(10)

# ---------------------------------------------------------------- render settings
W_, H_ = (int(v) for v in args.res.split("x"))
r = scene.render
r.engine = "CYCLES"
r.resolution_x, r.resolution_y = W_, H_
r.resolution_percentage = 100
r.film_transparent = args.mode == "fg"
c = scene.cycles
c.device = "CPU"
c.samples = args.samples
c.use_adaptive_sampling = True
c.adaptive_threshold = args.threshold
c.adaptive_min_samples = 0
c.use_denoising = not args.nodenoise
c.denoiser = "OPENIMAGEDENOISE"
c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
c.denoising_prefilter = "ACCURATE"
c.max_bounces = 10
c.diffuse_bounces = 4
c.glossy_bounces = 4
c.transmission_bounces = 4
c.transparent_max_bounces = 8
c.caustics_reflective = False
c.caustics_refractive = False
c.blur_glossy = 0.5
c.sample_clamp_indirect = 6.0
c.light_tree = True
c.pixel_filter_type = "BLACKMAN_HARRIS"
c.filter_width = 1.5
c.seed = 11
r.threads_mode = "FIXED"
r.threads = 4
c.use_auto_tile = True
c.tile_size = 512

vs = scene.view_settings
scene.display_settings.display_device = "sRGB"
vs.view_transform = "AgX"
vs.look = "AgX - Medium Low Contrast"
vs.exposure = args.exposure
vs.gamma = 1.0
if args.wb > 0:
    vs.use_white_balance = True
    vs.white_balance_temperature = args.wb
    vs.white_balance_tint = 0.0

if args.border:
    x0, y0, x1, y1 = (float(v) for v in args.border.split(","))
    r.use_border = True
    r.use_crop_to_border = True
    r.border_min_x, r.border_min_y, r.border_max_x, r.border_max_y = x0, y0, x1, y1

vl = scene.view_layers[0]
lc_books = vl.layer_collection.children["Books"]
lc_env = vl.layer_collection.children["Env"]
if args.mode == "fg":
    lc_env.indirect_only = True
elif args.mode == "bg":
    lc_books.exclude = True

r.image_settings.file_format = "PNG"
r.image_settings.color_mode = "RGBA" if args.mode == "fg" else "RGB"
r.image_settings.color_depth = "8"

if args.mode == "depth":
    c.samples = 16
    c.use_denoising = False
    c.use_adaptive_sampling = False
    vl.use_pass_z = True
    c.filter_width = 0.75
    r.image_settings.file_format = "OPEN_EXR"
    r.image_settings.color_mode = "RGB"
    r.image_settings.color_depth = "32"
    scene.use_nodes = True
    ct = scene.node_tree
    ct.nodes.clear()
    rl = ct.nodes.new("CompositorNodeRLayers")
    comp = ct.nodes.new("CompositorNodeComposite")
    ct.links.new(rl.outputs["Depth"], comp.inputs["Image"])

if args.blend:
    try:
        bpy.ops.file.pack_all()
    except Exception as e:
        print("pack failed", e)
    bpy.ops.wm.save_as_mainfile(filepath=args.blend, compress=True)

os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
outp = args.out
if args.mode == "depth":
    outp = os.path.splitext(args.out)[0] + ".exr"
r.filepath = outp
bpy.ops.render.render(write_still=True)

if args.mode == "depth":
    im = bpy.data.images.load(outp)
    px = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], im.channels)[::-1, :, 0]
    np.save(os.path.splitext(args.out)[0] + ".npy", px)
    print("DEPTH range", float(px.min()), float(px.max()))

# report projected bounding box of the book stack (for composition checks)
from bpy_extras.object_utils import world_to_camera_view
dg = bpy.context.evaluated_depsgraph_get()
xs, ys = [], []
for o in col_books.all_objects:
    if o.type not in ("MESH", "CURVE"):
        continue
    oe = o.evaluated_get(dg)
    try:
        me = oe.to_mesh()
    except Exception:
        me = None
    if me is None:
        continue
    for v in me.vertices:
        p = world_to_camera_view(scene, cam, oe.matrix_world @ v.co)
        xs.append(p.x)
        ys.append(p.y)
    oe.to_mesh_clear()
if xs:
    print("STACK_BBOX_NORM x[%.3f,%.3f] y_from_top[%.3f,%.3f]" % (min(xs), max(xs), 1 - max(ys), 1 - min(ys)))
for o in col_env.objects:
    if o.name.startswith("Lamp"):
        p = world_to_camera_view(scene, cam, o.matrix_world.translation)
        print("LAMP", o.name, "x %.3f y_from_top %.3f" % (p.x, 1 - p.y))
print("FOCUS_DIST", (cam.matrix_world.inverted() @ focus.matrix_world.translation).length)
