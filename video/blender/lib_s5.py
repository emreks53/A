"""Studio S5 helpers: a rigged, photoreal human hand + forearm built from the CC0 Human Base Meshes
bundle ('Hand  - Realistic'), with procedural skin, nails, fine hair and a rolled shirt cuff.

Rest space = the base mesh's local space (metres): fingers point -Z, back of the hand faces -Y,
palm +Y, thumb +X, wrist at z~0, forearm runs +Z.
"""
import bpy, bmesh, math, os, glob, random
from mathutils import Vector, Matrix, Euler
from mathutils.bvhtree import BVHTree
import common as C

# --------------------------------------------------------------------------- joints (rest space)
# Measured on orthographic grid renders of the base mesh (front px -> x/z, side view -> y).
_PX = {
    "little": [(122, 610), (95, 705), (78, 770), (65, 830)],
    "ring":   [(200, 620), (195, 757), (192, 843), (190, 925)],
    "middle": [(268, 625), (279, 776), (285, 870), (290, 960)],
    "index":  [(324, 610), (363, 745), (387, 829), (410, 910)],
    "thumb":  [(330, 400), (430, 520), (490, 590), (538, 648)],
}
_Y = {"little": [0.0, 0.004, 0.008, 0.012], "ring": [0.0, 0.003, 0.007, 0.011],
      "middle": [0.0, 0.003, 0.007, 0.011], "index": [0.0, 0.003, 0.007, 0.010],
      "thumb": [0.010, 0.020, 0.024, 0.026]}


def _p2w(px, py, y):
    return Vector((0.02 + (px - 300) * 0.0003, y, -0.065 + (500 - py) * 0.0003))


JOINTS = {k: [_p2w(px, py, _Y[k][i]) for i, (px, py) in enumerate(v)] for k, v in _PX.items()}
WRIST = Vector((0.0005, -0.005, -0.005))
ELBOW = Vector((0.004, -0.008, 0.30))
FINGERS = ["thumb", "index", "middle", "ring", "little"]


# --------------------------------------------------------------------------- mesh

def _append_hand():
    blend = glob.glob(os.path.join(C.ASSETS, "human", "**", "human_base_meshes_bundle.blend"), recursive=True)
    if not blend:
        C.human_mesh("realistic_hand")          # triggers the bundle download
        for o in list(bpy.data.objects):
            if o.type != "MESH" and o.name.startswith("realistic_hand"):
                bpy.data.objects.remove(o)
        blend = glob.glob(os.path.join(C.ASSETS, "human", "**", "human_base_meshes_bundle.blend"), recursive=True)
    # NOTE: in bundle v1.4.1 the object called 'realistic_hand' is a thumbnail CAMERA; the mesh is
    # 'Hand  - Realistic' (two spaces). C.human_mesh('realistic_hand') therefore returns a camera.
    with bpy.data.libraries.load(blend[0], link=False) as (src, dst):
        dst.objects = ["Hand  - Realistic"]
    o = dst.objects[0]
    bpy.context.scene.collection.objects.link(o)
    o.name = "Hand"
    o.location = (0, 0, 0)
    return o


def _extend_forearm(o, z_end=0.33, steps=14):
    """Remove the flat cap of the forearm stub and extend it into a forearm that widens toward the elbow."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    bm.faces.ensure_lookup_table()
    cap = [f for f in bm.faces if f.normal.z > 0.7 and f.calc_center_median().z > 0.068]
    bmesh.ops.delete(bm, geom=cap, context="FACES_ONLY")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bnd = [e for e in bm.edges if e.is_boundary]
    # order the boundary loop
    loop = [bnd[0].verts[0]]
    used = {bnd[0]}
    cur = bnd[0].verts[1]
    while cur is not loop[0]:
        loop.append(cur)
        nxt = [e for e in cur.link_edges if e.is_boundary and e not in used]
        if not nxt:
            break
        used.add(nxt[0]); cur = nxt[0].other_vert(cur)
    c0 = sum((v.co for v in loop), Vector()) / len(loop)
    z0 = max(v.co.z for v in loop)
    base = [v.co.copy() for v in loop]
    prev = loop
    for i in range(1, steps + 1):
        s = i / steps
        z = z0 + (z_end - z0) * s
        grow = 1.0 + 0.30 * s ** 1.2
        ring = []
        for p in base:
            d = p - c0
            ring.append(bm.verts.new((c0.x + d.x * grow + 0.004 * s, c0.y + d.y * (grow + 0.12 * s) - 0.003 * s, z)))
        n = len(ring)
        for k in range(n):
            bm.faces.new((prev[k], prev[(k + 1) % n], ring[(k + 1) % n], ring[k]))
        prev = ring
    bm.faces.new(list(reversed(prev)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data); bm.free()
    o.data.update()


def build_hand_mesh(pre_subdiv=1):
    o = _append_hand()
    C.apply_modifiers(o)                       # bake the Multires level
    _extend_forearm(o)
    for p in o.data.polygons:
        p.use_smooth = True
    if pre_subdiv:
        m = o.modifiers.new("pre", "SUBSURF"); m.levels = pre_subdiv
        C.apply_modifiers(o)
    for p in o.data.polygons:
        p.use_smooth = True
    _rest_attributes(o)
    return o


def _seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(1e-12, ab.length_squared)))
    return (p - (a + ab * t)).length, t


def _rest_attributes(o):
    me = o.data
    n = len(me.vertices)
    rest = me.attributes.new("rest", "FLOAT_VECTOR", "POINT")
    attrs = {k: me.attributes.new(k, "FLOAT", "POINT") for k in ("dorsal", "knuckle", "tip", "hairmask", "palm")}
    joints_d = []          # dorsal joint points for knuckle redness/wrinkles
    for k in FINGERS:
        J = JOINTS[k]
        for i in range(3 if k != "thumb" else 2):
            joints_d.append((J[i + (0 if k == "thumb" else 0)] if k != "thumb" else J[i + 1], 0.010 if i == 0 else 0.007))
    tips = [JOINTS[k][3] for k in FINGERS]
    for v in me.vertices:
        p = v.co; nrm = v.normal
        rest.data[v.index].vector = p
        dors = max(0.0, min(1.0, (-nrm.y + 0.15) / 0.6))
        attrs["dorsal"].data[v.index].value = dors
        attrs["palm"].data[v.index].value = max(0.0, min(1.0, (nrm.y - 0.1) / 0.5))
        kn = 0.0
        for c, r in joints_d:
            d = (p - c); d.y = 0
            kn = max(kn, math.exp(-(d.length / r) ** 2))
        attrs["knuckle"].data[v.index].value = kn * dors
        tp = 0.0
        for t in tips:
            tp = max(tp, math.exp(-((p - t).length / 0.011) ** 2))
        attrs["tip"].data[v.index].value = tp
        # hair: dorsal forearm and a little on the back of the hand / proximal phalanges
        # concentrated on the dorsal forearm where the macro push lands (cost scales with strand count)
        fa = C.smooth((p.z - 0.01) / 0.03) * (1.0 - C.smooth((p.z - 0.13) / 0.03))
        hb = C.smooth((p.z + 0.05) / 0.03) * 0.15
        attrs["hairmask"].data[v.index].value = max(fa * C.smooth((dors - 0.2) / 0.5), hb * dors)


# --------------------------------------------------------------------------- armature

def build_armature(hand):
    arm_d = bpy.data.armatures.new("HandRig")
    arm = bpy.data.objects.new("HandRig", arm_d)
    C.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_d.edit_bones
    fa = eb.new("forearm"); fa.head = ELBOW; fa.tail = WRIST; fa.align_roll(Vector((0, -1, 0)))
    hb = eb.new("hand"); hb.head = WRIST; hb.tail = JOINTS["middle"][0]; hb.parent = fa; hb.use_connect = True
    hb.align_roll(Vector((0, -1, 0)))
    for k in FINGERS:
        J = JOINTS[k]
        prev = hb
        for i in range(3):
            b = eb.new(f"{k}_{i + 1}")
            b.head = J[i]; b.tail = J[i + 1]
            b.parent = prev
            b.use_connect = i > 0
            if k == "thumb":
                b.align_roll(Vector((0.55, -0.83, 0.0)))     # thumbnail faces mostly dorsal/radial
            else:
                b.align_roll(Vector((0, -1, 0)))
            prev = b
    bpy.ops.object.mode_set(mode="OBJECT")
    # bone-heat weights
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    hand.select_set(True); arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    ok = any(g.name == "index_3" for g in hand.vertex_groups)
    print("[s5] bone heat weights:", ok, len(hand.vertex_groups), flush=True)
    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"
    return arm


# --------------------------------------------------------------------------- materials

def _node(nt, t, loc=None, **kw):
    n = nt.nodes.new(t)
    for k, v in kw.items():
        setattr(n, k, v)
    return n


def _math(nt, op, a=None, b=None, clamp=False):
    n = nt.nodes.new("ShaderNodeMath"); n.operation = op; n.use_clamp = clamp
    for i, x in enumerate((a, b)):
        if x is None:
            continue
        if isinstance(x, (int, float)):
            n.inputs[i].default_value = x
        else:
            nt.links.new(x, n.inputs[i])
    return n.outputs[0]


def _mixc(nt, fac, a, b):
    n = nt.nodes.new("ShaderNodeMix"); n.data_type = "RGBA"; n.blend_type = "MIX"; n.clamp_factor = True
    for sock, val in ((n.inputs[0], fac), (n.inputs[6], a), (n.inputs[7], b)):
        if isinstance(val, (tuple, list)):
            sock.default_value = (*val, 1) if len(val) == 3 else val
        elif isinstance(val, (int, float)):
            sock.default_value = val
        else:
            nt.links.new(val, sock)
    return n.outputs[2]


def _attr(nt, name, out="Fac"):
    a = nt.nodes.new("ShaderNodeAttribute"); a.attribute_name = name; a.attribute_type = "GEOMETRY"
    return a.outputs["Vector" if out == "Vector" else "Fac"]


def _smoothstep(nt, x, e0, e1):
    m = nt.nodes.new("ShaderNodeMapRange"); m.interpolation_type = "SMOOTHSTEP"
    nt.links.new(x, m.inputs[0]); m.inputs[1].default_value = e0; m.inputs[2].default_value = e1
    m.inputs[3].default_value = 0.0; m.inputs[4].default_value = 1.0
    return m.outputs[0]


def _vor(nt, vec, scale, feature="F1", out="Distance", rand=1.0, dims="3D"):
    v = nt.nodes.new("ShaderNodeTexVoronoi"); v.voronoi_dimensions = dims; v.feature = feature
    v.inputs["Scale"].default_value = scale; v.inputs["Randomness"].default_value = rand
    nt.links.new(vec, v.inputs["Vector"])
    return v.outputs[out]


def _noise(nt, vec, scale, detail=4.0, rough=0.55, out="Fac"):
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail; n.inputs["Roughness"].default_value = rough
    nt.links.new(vec, n.inputs["Vector"])
    return n.outputs[out]


def _scalevec(nt, vec, s):
    m = nt.nodes.new("ShaderNodeVectorMath"); m.operation = "MULTIPLY"
    nt.links.new(vec, m.inputs[0]); m.inputs[1].default_value = s if isinstance(s, (tuple, list)) else (s, s, s)
    return m.outputs[0]


def nail_frames(hand):
    """Per finger: nail centre / axes on the rest surface (found by ray casting from the distal bone)."""
    bvh = BVHTree.FromObject(hand, bpy.context.evaluated_depsgraph_get(), deform=False)
    out = {}
    for k in FINGERS:
        J = JOINTS[k]
        a, b = J[2], J[3]
        u = (b - a).normalized()                   # along the finger (toward tip)
        dors = Vector((0.55, -0.83, 0)) if k == "thumb" else Vector((0, -1, 0))
        dors = (dors - u * dors.dot(u)).normalized()
        c = a.lerp(b, 0.62 if k != "thumb" else 0.58)
        hit = bvh.ray_cast(c + dors * 0.03, -dors)
        if hit[0] is None:
            continue
        n = hit[1].normalized()
        v = n.cross(u).normalized()
        u2 = v.cross(n).normalized()
        out[k] = (hit[0], u2, v, n, 0.0062 if k == "thumb" else (0.0052 if k != "little" else 0.0042))
    return out


def skin_material(hand, nails):
    m = bpy.data.materials.new("Skin")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = _node(nt, "ShaderNodeOutputMaterial")
    R = _attr(nt, "rest", "Vector")
    dorsal = _attr(nt, "dorsal"); knuck = _attr(nt, "knuckle"); tip = _attr(nt, "tip"); palm = _attr(nt, "palm")

    # ---------------- micro relief (heights in arbitrary units, ~1 = 50 microns)
    pores = _math(nt, "SUBTRACT", 1.0, _smoothstep(nt, _vor(nt, R, 2600.0), 0.0, 0.22))           # 1 at pore centres
    pores2 = _math(nt, "SUBTRACT", 1.0, _smoothstep(nt, _vor(nt, R, 1300.0), 0.0, 0.16))
    net1 = _math(nt, "SUBTRACT", 1.0, _smoothstep(nt, _vor(nt, R, 650.0, "DISTANCE_TO_EDGE"), 0.0, 0.09))
    net2 = _math(nt, "SUBTRACT", 1.0, _smoothstep(nt, _vor(nt, R, 230.0, "DISTANCE_TO_EDGE"), 0.0, 0.06))
    # knuckle wrinkles: bands across the fingers (fingers run along rest Z), wobbly
    wv = nt.nodes.new("ShaderNodeTexWave"); wv.wave_type = "BANDS"; wv.bands_direction = "Z"
    wv.wave_profile = "SIN"
    wv.inputs["Scale"].default_value = 520.0; wv.inputs["Distortion"].default_value = 9.0
    wv.inputs["Detail"].default_value = 3.0; wv.inputs["Detail Scale"].default_value = 1.6
    nt.links.new(R, wv.inputs["Vector"])
    wr = _math(nt, "POWER", wv.outputs["Fac"], 3.0)
    wrinkles = _math(nt, "MULTIPLY", wr, _smoothstep(nt, knuck, 0.15, 0.8))
    lumpy = _noise(nt, R, 90.0, 6.0, 0.6)
    # veins on the back of hand / forearm: stretched cellular edges
    vs = nt.nodes.new("ShaderNodeMapping"); vs.inputs["Scale"].default_value = (1.6, 1.6, 0.45)
    nt.links.new(R, vs.inputs["Vector"])
    vn = _noise(nt, R, 30.0, 2.0, 0.5, "Color")
    vmix = nt.nodes.new("ShaderNodeMix"); vmix.data_type = "VECTOR"; vmix.inputs[0].default_value = 0.012
    nt.links.new(vs.outputs[0], vmix.inputs[4]); nt.links.new(vn, vmix.inputs[5])
    vedge = _vor(nt, vmix.outputs[1], 26.0, "DISTANCE_TO_EDGE")
    vein = _math(nt, "SUBTRACT", 1.0, _smoothstep(nt, vedge, 0.0, 0.09))
    vmask = _math(nt, "MULTIPLY", _smoothstep(nt, dorsal, 0.4, 0.9),
                  _smoothstep(nt, _sep(nt, R, 2), -0.075, -0.03))
    vein = _math(nt, "MULTIPLY", vein, vmask)
    vein = _math(nt, "MULTIPLY", vein, _smoothstep(nt, _noise(nt, R, 14.0, 2.0), 0.42, 0.62))

    h = _math(nt, "MULTIPLY", pores, -0.9)
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", pores2, -0.35))
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", net1, -0.55))
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", net2, -0.45))
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", wrinkles, -1.6))
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", lumpy, 0.8))
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", vein, 6.0))
    bump = _node(nt, "ShaderNodeBump")
    bump.inputs["Strength"].default_value = 1.0
    bump.inputs["Distance"].default_value = 0.00004
    nt.links.new(h, bump.inputs["Height"])
    # broad bump for the coat (oily layer follows the large forms, not the pores)
    bump2 = _node(nt, "ShaderNodeBump")
    bump2.inputs["Strength"].default_value = 1.0; bump2.inputs["Distance"].default_value = 0.00004
    nt.links.new(_math(nt, "ADD", _math(nt, "MULTIPLY", lumpy, 0.8), _math(nt, "MULTIPLY", wrinkles, -1.2)), bump2.inputs["Height"])

    # ---------------- colour
    base = (0.50, 0.275, 0.185)
    blotch = _noise(nt, R, 45.0, 5.0, 0.6)
    melan = _noise(nt, R, 7.0, 3.0, 0.5)
    col = _mixc(nt, _math(nt, "MULTIPLY", _smoothstep(nt, blotch, 0.42, 0.68), 0.35), base, (0.52, 0.22, 0.165))
    col = _mixc(nt, _math(nt, "MULTIPLY", _smoothstep(nt, melan, 0.45, 0.7), 0.35), col, (0.40, 0.235, 0.16))
    col = _mixc(nt, _math(nt, "MULTIPLY", palm, 0.45), col, (0.60, 0.30, 0.22))                # palm lighter, pinker
    col = _mixc(nt, _math(nt, "MULTIPLY", knuck, 0.55), col, (0.50, 0.20, 0.16))               # red knuckles
    col = _mixc(nt, _math(nt, "MULTIPLY", tip, 0.45), col, (0.56, 0.21, 0.17))                 # flushed fingertips
    col = _mixc(nt, _math(nt, "MULTIPLY", vein, 0.30), col, (0.30, 0.25, 0.28))                # bluish veins
    col = _mixc(nt, _math(nt, "MULTIPLY", net1, 0.10), col, (0.36, 0.20, 0.14))                # dirt-free darker furrows
    # sparse freckles / tiny moles
    fr = _vor(nt, R, 60.0)
    frm = _math(nt, "SUBTRACT", 1.0, _smoothstep(nt, fr, 0.03, 0.06))
    frc = _vor(nt, R, 60.0, out="Color")
    frs = _sep(nt, frc, 0)
    frm = _math(nt, "MULTIPLY", frm, _smoothstep(nt, frs, 0.93, 0.94))
    col = _mixc(nt, _math(nt, "MULTIPLY", frm, 0.5), col, (0.22, 0.11, 0.07))

    rough = _math(nt, "ADD", 0.40, _math(nt, "MULTIPLY", _noise(nt, R, 220.0, 3.0), 0.18))
    rough = _math(nt, "ADD", rough, _math(nt, "MULTIPLY", net1, 0.16))
    rough = _math(nt, "ADD", rough, _math(nt, "MULTIPLY", knuck, 0.08))

    skin = _node(nt, "ShaderNodeBsdfPrincipled")
    skin.subsurface_method = "RANDOM_WALK_SKIN"
    nt.links.new(col, skin.inputs["Base Color"])
    nt.links.new(rough, skin.inputs["Roughness"])
    skin.inputs["Subsurface Weight"].default_value = 1.0
    skin.inputs["Subsurface Radius"].default_value = (1.0, 0.37, 0.19)
    skin.inputs["Subsurface Scale"].default_value = 0.0032
    skin.inputs["Subsurface IOR"].default_value = 1.40
    skin.inputs["Subsurface Anisotropy"].default_value = 0.8
    skin.inputs["IOR"].default_value = 1.42
    skin.inputs["Specular IOR Level"].default_value = 0.5
    oily = _smoothstep(nt, _noise(nt, R, 35.0, 3.0), 0.45, 0.75)
    nt.links.new(_math(nt, "MULTIPLY", oily, 0.22), skin.inputs["Coat Weight"])
    skin.inputs["Coat Roughness"].default_value = 0.28
    skin.inputs["Coat IOR"].default_value = 1.45
    skin.inputs["Sheen Weight"].default_value = 0.12
    skin.inputs["Sheen Roughness"].default_value = 0.45
    skin.inputs["Sheen Tint"].default_value = (0.95, 0.85, 0.8, 1)
    nt.links.new(bump.outputs[0], skin.inputs["Normal"])
    nt.links.new(bump2.outputs[0], skin.inputs["Coat Normal"])

    # ---------------- nails (analytic ellipses in rest space)
    nail_mask = None; lun = None; free = None; cut = None; ridge_v = None
    for k, (c, u, v, n, half_w) in nails.items():
        d = nt.nodes.new("ShaderNodeVectorMath"); d.operation = "SUBTRACT"
        nt.links.new(R, d.inputs[0]); d.inputs[1].default_value = c
        du = _dot(nt, d.outputs[0], u); dv = _dot(nt, d.outputs[0], v); dn = _dot(nt, d.outputs[0], n)
        half_l = half_w * 1.25
        # nail extends from u = -half_l (cuticle) to u = +half_l*1.05 (free edge)
        eu = _math(nt, "DIVIDE", du, half_l); ev = _math(nt, "DIVIDE", dv, half_w)
        eu_sq = _math(nt, "POWER", _math(nt, "ABSOLUTE", eu), 2.6)
        ev_sq = _math(nt, "POWER", _math(nt, "ABSOLUTE", ev), 2.4)
        r = _math(nt, "ADD", eu_sq, ev_sq)
        mk = _math(nt, "SUBTRACT", 1.0, _smoothstep(nt, r, 0.86, 1.0))
        mk = _math(nt, "MULTIPLY", mk, _smoothstep(nt, dn, -0.003, -0.0012))
        # lunula: whitish half moon near the cuticle
        ln = _math(nt, "SUBTRACT", 1.0, _smoothstep(nt, _math(nt, "ADD", _math(nt, "POWER", _math(nt, "ABSOLUTE", _math(nt, "DIVIDE", _math(nt, "ADD", du, half_l * 0.95), half_l * 0.42)), 2.0), _math(nt, "POWER", _math(nt, "ABSOLUTE", _math(nt, "DIVIDE", dv, half_w * 0.62)), 2.0)), 0.8, 1.0))
        fe = _smoothstep(nt, du, half_l * 0.70, half_l * 0.86)
        ct = _math(nt, "MULTIPLY", _smoothstep(nt, r, 0.78, 0.98), _math(nt, "SUBTRACT", 1.0, _smoothstep(nt, du, -half_l * 0.3, 0.0)))
        rv = dv if ridge_v is None else ridge_v
        nail_mask = mk if nail_mask is None else _math(nt, "MAXIMUM", nail_mask, mk)
        lmk = _math(nt, "MULTIPLY", ln, mk)
        lun = lmk if lun is None else _math(nt, "MAXIMUM", lun, lmk)
        fmk = _math(nt, "MULTIPLY", fe, mk)
        free = fmk if free is None else _math(nt, "MAXIMUM", free, fmk)
        cmk = _math(nt, "MULTIPLY", ct, mk)
        cut = cmk if cut is None else _math(nt, "MAXIMUM", cut, cmk)
        # longitudinal ridges (bands across v)
        rw = _math(nt, "SINE", _math(nt, "MULTIPLY", dv, 2 * math.pi / 0.00042))
        rw = _math(nt, "MULTIPLY", rw, mk)
        ridge_v = rw if ridge_v is None else _math(nt, "ADD", ridge_v, rw)
    nail = _node(nt, "ShaderNodeBsdfPrincipled")
    ncol = _mixc(nt, lun, (0.62, 0.36, 0.32), (0.80, 0.66, 0.60))
    ncol = _mixc(nt, free, ncol, (0.86, 0.80, 0.72))
    ncol = _mixc(nt, _math(nt, "MULTIPLY", cut, 0.6), ncol, (0.55, 0.36, 0.28))
    nt.links.new(ncol, nail.inputs["Base Color"])
    nail.inputs["Roughness"].default_value = 0.22
    nail.inputs["Subsurface Weight"].default_value = 0.35
    nail.inputs["Subsurface Radius"].default_value = (1.0, 0.45, 0.3)
    nail.inputs["Subsurface Scale"].default_value = 0.002
    nail.inputs["Coat Weight"].default_value = 0.8
    nail.inputs["Coat Roughness"].default_value = 0.08
    nbump = _node(nt, "ShaderNodeBump"); nbump.inputs["Distance"].default_value = 0.00001
    nt.links.new(_math(nt, "ADD", _math(nt, "MULTIPLY", ridge_v, 0.6), _math(nt, "MULTIPLY", lumpy, 0.3)), nbump.inputs["Height"])
    nt.links.new(nbump.outputs[0], nail.inputs["Normal"])
    nt.links.new(nbump.outputs[0], nail.inputs["Coat Normal"])
    mix = _node(nt, "ShaderNodeMixShader")
    nt.links.new(nail_mask, mix.inputs[0])
    nt.links.new(skin.outputs[0], mix.inputs[1]); nt.links.new(nail.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m


def _sep(nt, vec, i):
    s = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(vec, s.inputs[0])
    return s.outputs[i]


def _dot(nt, vec, const):
    d = nt.nodes.new("ShaderNodeVectorMath"); d.operation = "DOT_PRODUCT"
    nt.links.new(vec, d.inputs[0]); d.inputs[1].default_value = const
    return d.outputs["Value"]


def hair_material():
    m = bpy.data.materials.new("BodyHair"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = _node(nt, "ShaderNodeOutputMaterial")
    h = _node(nt, "ShaderNodeBsdfHairPrincipled")
    try:
        h.model = "CHIANG"
    except Exception:
        pass
    h.parametrization = "MELANIN"
    h.inputs["Melanin"].default_value = 0.72
    h.inputs["Melanin Redness"].default_value = 0.35
    h.inputs["Roughness"].default_value = 0.32
    h.inputs["Radial Roughness"].default_value = 0.4
    h.inputs["Random Roughness"].default_value = 0.3
    h.inputs["Random Color"].default_value = 0.25
    nt.links.new(h.outputs[0], out.inputs["Surface"])
    return m


def add_body_hair(hand, count=5000, seed=5):
    vg = hand.vertex_groups.new(name="hairdens")
    attr = hand.data.attributes["hairmask"]
    for i, d in enumerate(attr.data):
        if d.value > 0.01:
            vg.add([i], d.value, "REPLACE")
    hand.modifiers.new("hair", "PARTICLE_SYSTEM")
    ps = hand.particle_systems[-1]
    ps.seed = seed
    p = ps.settings
    p.type = "HAIR"
    p.count = count
    p.hair_length = 0.011
    p.use_advanced_hair = True
    p.emit_from = "FACE"
    p.use_emit_random = True
    p.normal_factor = 0.12
    p.object_align_factor = (0.0, 0.0, -1.0)
    p.factor_random = 0.25
    if hasattr(p, "length_random"):
        p.length_random = 0.6
    p.hair_step = 4
    p.display_step = 2; p.render_step = 3
    p.child_type = "SIMPLE"
    p.child_percent = 1; p.rendered_child_count = 2
    p.child_radius = 0.003
    p.roughness_endpoint = 0.0006
    p.roughness_1 = 0.0004; p.roughness_1_size = 0.3
    p.radius_scale = 0.000022
    p.root_radius = 1.0
    p.tip_radius = 0.15
    p.use_close_tip = True
    p.material_slot = "BodyHair"
    ps.vertex_group_density = "hairdens"
    ps.vertex_group_length = "hairdens"
    return ps


def cuff(hand, arm, z0=0.165, z1=0.33, seed=3):
    """Rolled linen/chambray shirt sleeve around the forearm (rest space), bone-parented to 'forearm'."""
    rnd = random.Random(seed)
    # sample the forearm cross-section radius around its axis from the rest mesh
    me = hand.data
    axis_c = lambda z: WRIST.lerp(ELBOW, (z - WRIST.z) / (ELBOW.z - WRIST.z))
    nseg, nz = 48, 26
    rad = {}
    pts = [v.co for v in me.vertices if v.co.z > z0 - 0.03]
    verts, faces = [], []
    zs = [z0 + (z1 - z0) * (i / (nz - 1)) ** 1.0 for i in range(nz)]
    for zi, z in enumerate(zs):
        c = axis_c(z)
        ring_pts = [p for p in pts if abs(p.z - z) < 0.012]
        for s in range(nseg):
            a = 2 * math.pi * s / nseg
            d = Vector((math.cos(a), math.sin(a), 0))
            best = 0.02
            for p in ring_pts:
                q = p - c; q.z = 0
                if q.length > 1e-6 and q.normalized().dot(d) > 0.985:
                    best = max(best, q.length)
            rad[(zi, s)] = best
    for zi, z in enumerate(zs):
        c = axis_c(z)
        t = (z - z0) / (z1 - z0)
        for s in range(nseg):
            a = 2 * math.pi * s / nseg
            r = (rad[(zi, s)] + rad[(zi, (s - 1) % nseg)] + rad[(zi, (s + 1) % nseg)]) / 3
            # rolled cuff: a fat lip over the first ~3.5 cm, then a looser sleeve with folds
            lip = math.exp(-((t * (z1 - z0) - 0.008) / 0.010) ** 2) * 0.0075 + math.exp(-((t * (z1 - z0) - 0.026) / 0.009) ** 2) * 0.005
            fold = 0.0035 * math.sin(a * 3 + z * 90 + rnd.random() * 0.4) * C.smooth((t * (z1 - z0) - 0.03) / 0.03)
            fold += 0.002 * math.sin(a * 7 + z * 210) * C.smooth((t * (z1 - z0) - 0.03) / 0.03)
            off = 0.0035 + lip + fold + 0.004 * t
            p = Vector((c.x + math.cos(a) * (r + off), c.y + math.sin(a) * (r + off), z))
            verts.append(p)
    for zi in range(nz - 1):
        for s in range(nseg):
            a = zi * nseg + s; b = zi * nseg + (s + 1) % nseg
            faces.append((a, b, b + nseg, a + nseg))
    # turned-in edge at the cuff opening so the fabric has thickness
    base = len(verts)
    for s in range(nseg):
        p = verts[s]; c = axis_c(z0)
        q = p - c; q.z = 0
        verts.append(Vector((c.x, c.y, z0 + 0.004)) + q.normalized() * (q.length - 0.0035))
    for s in range(nseg):
        faces.append((base + s, base + (s + 1) % nseg, (s + 1) % nseg, s))
    ob = C.mesh_obj("Cuff", verts, faces)
    C.smooth_shade(ob)
    rest = ob.data.attributes.new("rest", "FLOAT_VECTOR", "POINT")
    for v in ob.data.vertices:
        rest.data[v.index].vector = v.co
    sol = ob.modifiers.new("thick", "SOLIDIFY"); sol.thickness = 0.0012; sol.offset = 1.0
    C.subsurf(ob, 1, 2)
    ob.parent = arm
    ob.parent_type = "BONE"
    ob.parent_bone = "forearm"
    # bone parenting is relative to the bone TAIL; cancel that so rest-space coords stay valid
    bone = arm.data.bones["forearm"]
    ob.matrix_parent_inverse = (bone.matrix_local @ Matrix.Translation((0, bone.length, 0))).inverted()
    C.assign(ob, fabric_material())
    return ob


def fabric_material():
    m = bpy.data.materials.new("Chambray"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = _node(nt, "ShaderNodeOutputMaterial")
    R = _attr(nt, "rest", "Vector")
    # plain weave: two perpendicular thread families
    sx = _math(nt, "SINE", _math(nt, "MULTIPLY", _sep(nt, R, 2), 2 * math.pi / 0.00045))
    ang = nt.nodes.new("ShaderNodeVectorMath"); ang.operation = "LENGTH"
    xy = nt.nodes.new("ShaderNodeVectorMath"); xy.operation = "MULTIPLY"
    nt.links.new(R, xy.inputs[0]); xy.inputs[1].default_value = (1, 1, 0)
    at = nt.nodes.new("ShaderNodeMath"); at.operation = "ARCTAN2"
    nt.links.new(_sep(nt, R, 1), at.inputs[0]); nt.links.new(_sep(nt, R, 0), at.inputs[1])
    sy = _math(nt, "SINE", _math(nt, "MULTIPLY", at.outputs[0], 0.04 / 0.00045))
    weave = _math(nt, "MULTIPLY", sx, sy)
    slub = _noise(nt, _scalevec(nt, R, (1.0, 1.0, 1.0)), 300.0, 2.0)
    wr = _noise(nt, R, 18.0, 4.0, 0.6)
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", weave, 0.5), _math(nt, "MULTIPLY", slub, 0.6))
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", wr, 3.0))
    b = _node(nt, "ShaderNodeBump"); b.inputs["Distance"].default_value = 0.0002
    nt.links.new(h, b.inputs["Height"])
    p = _node(nt, "ShaderNodeBsdfPrincipled")
    col = _mixc(nt, _smoothstep(nt, slub, 0.3, 0.75), (0.16, 0.20, 0.27), (0.27, 0.30, 0.34))
    col = _mixc(nt, _math(nt, "MULTIPLY", _smoothstep(nt, sx, 0.2, 1.0), 0.35), col, (0.42, 0.43, 0.44))
    nt.links.new(col, p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.85
    p.inputs["Sheen Weight"].default_value = 0.6
    p.inputs["Sheen Roughness"].default_value = 0.35
    nt.links.new(b.outputs[0], p.inputs["Normal"])
    nt.links.new(p.outputs[0], out.inputs["Surface"])
    return m
