"""sh14a 89.10-99.50  Sunflowers at sunrise.
Extreme macro on the Vogel spiral of a procedurally built Helianthus annuus head -> pull back to the
full flower -> on "görüyormuşçasına" every head in the field turns toward the rising sun -> crane up and
orbit toward the sun; light grows into a radiant golden sunrise through "Allah".
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from mathutils import Vector, Matrix, Euler
import common as C
import lib_s2 as L

H_HERO = 1.80
YAW0, YAW1 = math.radians(62), math.radians(135)       # face azimuth before/after the turn
PITCH0, PITCH1 = math.radians(-4), math.radians(15)     # slightly nodding (pre-dawn) -> lifted to the low sun
SUN_ELEV = 12.5                                         # deg; constant (see NOTES: sun in frame above the key-word band)
SUN_AZ = math.radians(135)                              # direction to the sun == face direction at yaw 135
SUN_DIR2 = Vector((-math.sin(SUN_AZ), math.cos(SUN_AZ), 0))
HC_LOCAL = Vector((0, 0.07, 0.16))                      # disc centre in pivot space
FIELD_R = float(os.environ.get("S2_FIELD_R", 120))
LOD_NEAR = float(os.environ.get("S2_LODN", 9.0))
FOCUS_MIN = 0.14                                        # m; min. Cycles focus distance (approved dips: 0.143-0.18)
T_FIX = 2240 / 24                                       # s; finale re-designed from here on (earlier frames are final)
T_HER = 94.27                                           # s; true onset of 'her (şeyi gören)' (transcript says 93.82)
T_LIFT = T_FIX + 0.75                                   # crane done: lens >= 1.5 m from any head
T_ORB = T_FIX + 0.52                                    # orbit start (after the lift)
T_RACK = T_HER - 0.32                                   # far-focus rack start (after the lift): the field reads on 'her'
T_END = 99.65                                           # orbit settles (dissolve handle)
Z_TOP = 3.8                                             # m; crane height over the canopy (heads <= 2.2 m)
SUN_DIP = float(os.environ.get("S2_DIP", 0.5))         # sun lamp eased off over the down-sun reveal 2242-2310
T_SUNUP = (98.40, 99.30)                                # 'Allah': the light swells into a golden sunrise


def head_matrix(pivot, yaw, pitch):
    return Matrix.Translation(pivot) @ Matrix.Rotation(yaw, 4, "Z") @ Matrix.Rotation(pitch, 4, "X")


def sun_elev(t):
    return SUN_ELEV


# --------------------------------------------------------------------------- field (geometry nodes)

def field_gn(name, coll, t_turn, turn):
    """Instance heads from `coll` on the points of the object; yaw/pitch animate with Scene Time."""
    ng = bpy.data.node_groups.new(name, "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N = ng.nodes
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    ci = N.new("GeometryNodeCollectionInfo"); ci.inputs["Collection"].default_value = coll
    ci.inputs["Separate Children"].default_value = True; ci.inputs["Reset Children"].default_value = True
    iop = N.new("GeometryNodeInstanceOnPoints")
    ng.links.new(gi.outputs[0], iop.inputs["Points"]); ng.links.new(ci.outputs[0], iop.inputs["Instance"])
    iop.inputs["Pick Instance"].default_value = True

    def named(nm, typ="FLOAT"):
        n = N.new("GeometryNodeInputNamedAttribute"); n.data_type = typ; n.inputs["Name"].default_value = nm
        return n.outputs["Attribute"]
    ng.links.new(named("variant", "INT"), iop.inputs["Instance Index"])
    sc_t = N.new("GeometryNodeInputSceneTime")
    # k = smootherstep((t - (t_turn + delay)) / dur)
    add0 = N.new("ShaderNodeMath"); add0.operation = "ADD"; add0.inputs[1].default_value = t_turn
    ng.links.new(named("delay"), add0.inputs[0])
    add1 = N.new("ShaderNodeMath"); add1.operation = "ADD"
    ng.links.new(add0.outputs[0], add1.inputs[0]); ng.links.new(named("dur"), add1.inputs[1])
    mr = N.new("ShaderNodeMapRange"); mr.interpolation_type = "SMOOTHERSTEP"; mr.clamp = True
    ng.links.new(sc_t.outputs["Seconds"], mr.inputs["Value"])
    ng.links.new(add0.outputs[0], mr.inputs["From Min"]); ng.links.new(add1.outputs[0], mr.inputs["From Max"])
    k = mr.outputs["Result"]
    if not turn:
        k = None

    def mix(a, b):
        if k is None:
            return named(a)
        m = N.new("ShaderNodeMix"); m.data_type = "FLOAT"
        ng.links.new(k, m.inputs[0]); ng.links.new(named(a), m.inputs[2]); ng.links.new(named(b), m.inputs[3])
        return m.outputs[0]
    cx = N.new("ShaderNodeCombineXYZ")
    ng.links.new(mix("pitch0", "pitch1"), cx.inputs["X"])
    ng.links.new(named("roll"), cx.inputs["Y"])
    ng.links.new(mix("yaw0", "yaw1"), cx.inputs["Z"])
    e2r = N.new("FunctionNodeEulerToRotation")
    ng.links.new(cx.outputs[0], e2r.inputs[0])
    ng.links.new(e2r.outputs[0], iop.inputs["Rotation"])
    ng.links.new(named("scale"), iop.inputs["Scale"])
    ng.links.new(iop.outputs[0], go.inputs[0])
    return ng


def build_field(ctx, mats, hero_xy, t_turn, cam_pts):
    rng = random.Random(77)
    proto_h = bpy.data.collections.new("proto_heads")
    proto_s = bpy.data.collections.new("proto_stems")
    hide = C.collection("protos")
    hide.children.link(proto_h); hide.children.link(proto_s)
    tops = []
    NV = 6
    params = [(rng.uniform(0.06, 0.085), rng.choice([700, 800, 900]), rng.choice([34, 38, 42])) for v in range(NV)]
    # variants 0..5: near LOD (modelled florets, 9 leaves); 6..11: far LOD (textured disc, 6 leaves)
    mats_far = mats.far()
    for lod in (1, 0):
        mm = mats if lod else mats_far
        for v in range(NV):
            idx = v + (0 if lod else NV)
            R_, N_, nr = params[v]
            parts = L.build_neck_and_head(f"fh{idx:02d}", mm, seed=100 + v, detail=lod, R=R_, N=N_, n_rays=nr,
                                          head_scale=1.0)
            o = L.join(parts, f"fhead{idx:02d}")
            C.move_to_collection(o, proto_h)
            sp, top = L.build_stem_leaves(f"fs{idx:02d}", mm, H=1.6, seed=200 + v, n_leaves=9 if lod else 6, detail=1)
            so = L.join(sp, f"fstem{idx:02d}")
            C.move_to_collection(so, proto_s)
            if lod:
                tops.append(Vector(top))
    hide.hide_render = True
    hide.hide_viewport = True
    pts_h, pts_s = [], []
    keys = ("variant", "yaw0", "yaw1", "pitch0", "pitch1", "roll", "delay", "dur", "scale")
    A = {k: [] for k in keys}
    S = {k: [] for k in keys}
    row_dir = Vector((math.cos(math.radians(20)), math.sin(math.radians(20)), 0))
    col_dir = Vector((-row_dir.y, row_dir.x, 0))
    hx, hy = hero_xy
    RS, PS = 0.70, 0.26
    nrow = int(FIELD_R / RS)
    ncol = int(FIELD_R / PS)
    # low camera positions -> keep a clear corridor (the camera dolly runs in a gap between plants)
    low = [(Vector((c.x, c.y, 0)), c.z) for c in cam_pts]
    for i in range(-nrow, nrow + 1):
        for j in range(-ncol, ncol + 1):
            p = Vector((hx, hy, 0)) + col_dir * (i * RS + rng.gauss(0, 0.06) + (rng.uniform(-0.3, 0.3) if rng.random() < 0.04 else 0)) + row_dir * (j * PS + rng.gauss(0, 0.07))
            d = (p - Vector((hx, hy, 0)))
            dist = d.length
            if dist > FIELD_R or dist < 0.22:
                continue
            ang = math.degrees(math.atan2(d.y, d.x))
            if dist > 12 and not (-178 < ang < 30):
                continue
            if rng.random() < (0.05 + 0.10 * max(0.0, math.sin(p.x * 0.11) * math.cos(p.y * 0.09))):
                continue
            v = rng.randrange(NV)
            s = rng.uniform(0.78, 1.2) * (1 + 0.06 * math.sin(p.x * 0.05) + 0.06 * math.cos(p.y * 0.07))
            if dist < 3.5:
                s *= C.lerp(0.86, 1.0, dist / 3.5)     # the hero stands a little above its neighbours
            top = tops[v] * s
            hpos = p + top
            blocked = False
            for cp, cz in low:
                if cz < hpos.z + 0.35 and (cp - p).length < 0.42:
                    blocked = True
                    break
            if blocked:
                continue
            vv = v if dist < LOD_NEAR else v + NV
            pts_s.append(tuple(p))
            S["variant"].append(vv); S["yaw0"].append(rng.uniform(0, 6.283)); S["yaw1"].append(0); S["pitch0"].append(0)
            S["pitch1"].append(0); S["roll"].append(0); S["delay"].append(0); S["dur"].append(1); S["scale"].append(s)
            pts_h.append(tuple(hpos))
            jy = rng.gauss(0, math.radians(9))
            A["variant"].append(vv)
            # head size 15-35 cm (independent of plant height); ~6 % old heavy heads droop and do not follow the sun
            hs = min(1.35, max(0.6, rng.lognormvariate(0.0, 0.18)))
            old = rng.random() < 0.06
            y0 = YAW0 + jy + rng.gauss(0, math.radians(14))
            A["yaw0"].append(y0)
            A["yaw1"].append(y0 + rng.gauss(0, 0.1) if old else SUN_AZ + jy * 0.7 + rng.gauss(0, math.radians(5)))
            p0 = PITCH0 + rng.gauss(0, math.radians(9)) - math.radians(4)
            if old:
                p0 = -math.radians(rng.uniform(45, 70))
            A["pitch0"].append(p0)
            A["pitch1"].append(p0 if old else PITCH1 + rng.gauss(0, math.radians(7)))
            A["roll"].append(rng.gauss(0, math.radians(8)))
            A["delay"].append(rng.gauss(0, 0.12) + dist * 0.003)
            A["dur"].append(rng.uniform(1.4, 2.1))
            A["scale"].append(s * hs * (0.85 if old else 1.0))

    def pts_obj(name, pts, attrs, coll, turn):
        me = bpy.data.meshes.new(name)
        me.from_pydata(pts, [], [])
        for k, vals in attrs.items():
            at = me.attributes.new(k, "INT" if k == "variant" else "FLOAT", "POINT")
            at.data.foreach_set("value", vals)
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        mod = ob.modifiers.new("inst", "NODES")
        mod.node_group = field_gn(name + "_gn", coll, t_turn, turn)
        if not turn:
            ob.cycles.use_motion_blur = False   # static stems: keep them out of the (slower) motion BVH
        return ob
    pts_obj("field_heads", pts_h, A, proto_h, True)
    if not os.environ.get("S2_NOSTEMS"):
        pts_obj("field_stems", pts_s, S, proto_s, False)
    print(f"[sh14a] field plants: {len(pts_h)}", flush=True)


def build_far(ctx):
    """Beyond the instanced field: a distant sunflower carpet + low hazy hills on the horizon."""
    m, nt, p = C.new_mat("far_field")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    vo = nt.nodes.new("ShaderNodeTexVoronoi"); vo.inputs["Scale"].default_value = 3.2
    nt.links.new(tc.outputs["Object"], vo.inputs["Vector"])
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].position = 0.22; cr.color_ramp.elements[0].color = (0.55, 0.30, 0.02, 1)
    cr.color_ramp.elements[1].position = 0.55; cr.color_ramp.elements[1].color = (0.03, 0.06, 0.012, 1)
    nt.links.new(vo.outputs["Distance"], cr.inputs["Fac"])
    nt.links.new(cr.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 1.0
    p.inputs["Specular IOR Level"].default_value = 0.0   # no grazing sky reflection (read as water)
    seg = 256
    V, F = [], []
    for k in range(seg):
        a = 2 * math.pi * k / seg
        for r, z in ((FIELD_R - 6, 1.45), (FIELD_R + 30, 1.7), (2100, 1.8)):
            V.append((r * math.cos(a), r * math.sin(a), z))
    for k in range(seg):
        k2 = (k + 1) % seg
        for q in range(2):
            F.append((k * 3 + q, k2 * 3 + q, k2 * 3 + q + 1, k * 3 + q + 1))
    far = C.mesh_obj("far_field", V, F)
    C.assign(far, m)
    # layered low hills: a near ridge (~0.9 km) topped by an irregular tree line, a far ridge (~1.9 km) in haze
    rng = random.Random(9)
    tm = L.mat_green("hills", base=(0.012, 0.02, 0.01), rough=1.0, sheen=0.0, trans=0.0, veins=False, hair_bump=False)
    tm.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.0
    for name, R0, amp, base_h, trees in (("ridge_near", 900, 14, 9, True), ("ridge_far", 1900, 40, 25, False)):
        V, F = [], []
        nA = 2400 if trees else 500
        crowns = []
        xpos = -215 / 57.3 * R0
        while xpos < 55 / 57.3 * R0:
            if rng.random() < 0.8:
                crowns.append((xpos, rng.uniform(4, 9), rng.uniform(7, 15)))
                xpos += rng.uniform(3, 9)
            else:
                xpos += rng.uniform(40, 160)     # open fields between woods

        def crown_h(x):
            best = 0.0
            for cx, w, ch in crowns:
                d = abs(x - cx)
                if d < w:
                    best = max(best, ch * math.sqrt(1 - (d / w) ** 2))
            return best
        ph = rng.uniform(0, 6)
        tree_h = 0.0
        for k in range(nA):
            a = math.radians(-215 + 270 * k / (nA - 1))
            h = base_h + amp * (0.5 + 0.5 * math.sin(a * 2.3 + ph)) + amp * 0.35 * math.sin(a * 6.1 + 2 * ph) + 2 * math.sin(a * 17)
            if trees:
                h += crown_h(a * R0)
            V.append((R0 * math.cos(a), R0 * math.sin(a), 0)); V.append((R0 * math.cos(a), R0 * math.sin(a), h))
            V.append(((R0 + 300) * math.cos(a), (R0 + 300) * math.sin(a), h * 0.9))
        for k in range(nA - 1):
            for q in range(2):
                F.append((k * 3 + q, (k + 1) * 3 + q, (k + 1) * 3 + q + 1, k * 3 + q + 1))
        hills = C.mesh_obj(name, V, F)
        C.assign(hills, tm)


# --------------------------------------------------------------------------- build

def build(ctx):
    sc = bpy.context.scene
    mats = L.Mats()
    t_turn = ctx.word("görüyor") - 0.10
    t_allah = ctx.word("Allah")
    t_rise = ctx.word("her") - 0.5

    # ------------------------------------------------------------ hero plant
    stem_parts, top = L.build_stem_leaves("hero", mats, H=H_HERO, seed=3, n_leaves=9)
    pivot = Vector(top)
    hero_stem = L.join(stem_parts, "hero_stem")
    if os.environ.get("S2_HAIR"):
        L.add_hairs(hero_stem, count=2500, length=0.0028, seed=3)
    head_parts = L.build_neck_and_head("hero_head", mats, seed=5, detail=2, dew=1, R=0.078, N=1550, n_rays=46)
    hp = C.empty("hero_pivot", pivot)
    hp.rotation_mode = "XYZ"
    for o in head_parts:
        o.parent = hp
    trk = C.empty("TRK_spiral", HC_LOCAL + Vector((0, 0.006, 0)))
    trk.parent = hp

    def head_rot(t):
        k = C.remap(t, t_turn, t_turn + 1.7, C.smoother)
        return C.lerp(YAW0, YAW1, k), C.lerp(PITCH0, PITCH1, C.remap(t, t_turn - 0.1, t_turn + 1.9, C.smoother))

    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        y, p = head_rot(f / C.FPS)
        hp.rotation_euler = (p, 0, y)
        hp.keyframe_insert("rotation_euler", frame=f)

    # ------------------------------------------------------------ camera path (needed before the field: corridor)
    sun_xy = Vector((SUN_DIR2.x, SUN_DIR2.y, 0))
    D_END = Matrix.Rotation(math.radians(-14), 3, "Z") @ sun_xy
    LENS_END = 32.0
    # pitch so the sun lands at y~450 px: tan(half vfov)=18/LENS_END
    PITCH_END = math.radians(SUN_ELEV) - math.atan(((960 - 450) / 960) * 18 / LENS_END)

    def lens_v2(t):
        return math.exp(C.lerp(math.log(100), math.log(LENS_END), C.remap(t, T_FIX, T_FIX + 1.9, C.smoother)))

    # v2 orbit progress: angular speed = ease envelope / focal length -> ~constant screen speed while zooming out
    ORB_DT = 1 / 480
    orb_cum = [0.0]
    for i in range(int((T_END - T_ORB) / ORB_DT) + 1):
        tt = T_ORB + (i + 0.5) * ORB_DT
        orb_cum.append(orb_cum[-1] + C.smooth((tt - T_ORB) / 0.6) * C.smooth((T_END - tt) / 1.0) / lens_v2(tt))

    def orbit_k(t):
        x = min(max((t - T_ORB) / ORB_DT, 0.0), len(orb_cum) - 1.001)
        i = int(x)
        return C.lerp(orb_cum[i], orb_cum[i + 1], x - i) / orb_cum[-1]

    def cam_state(t, legacy=False):
        y, p = head_rot(t)
        dc = head_matrix(pivot, y, p) @ HC_LOCAL
        M0 = head_matrix(pivot, YAW0, head_rot(min(t, t_turn))[1])
        dc0 = M0 @ HC_LOCAL
        nf = (M0.to_3x3() @ Vector((0, 1, 0))).normalized()
        upv = (M0.to_3x3() @ Vector((0, 0, 1))).normalized()
        k1 = C.remap(t, 90.35, 92.1, C.smoother)
        d = C.lerp(0.33, 0.30, C.remap(t, ctx.t0, 90.35, C.smooth)) * (1 - k1) + 2.1 * k1
        d += 0.7 * C.remap(t, 92.0, 94.5, C.smooth)
        tilt = math.radians(C.lerp(14, 8, k1))
        pos = dc0 + nf * d * math.cos(tilt) + upv * d * math.sin(tilt)
        pos.z += 0.25 * k1
        ft = C.remap(t, t_turn - 0.2, t_turn + 1.4, C.smooth)
        target = dc0.lerp(dc, ft)
        # finale: crane up + orbit (~120 deg clockwise) so the camera looks ACROSS the field with the sun
        # upper-left (14 deg left of axis, 12.5 deg high -> above the key-word band, horizon below it)
        kr = C.remap(t, t_rise, ctx.t1 + 0.2, C.smoother)
        rel = Vector((pos.x - pivot.x, pos.y - pivot.y, 0))
        az0 = math.atan2(rel.y, rel.x)
        r0 = rel.length
        az1 = math.atan2(-D_END.y, -D_END.x)
        daz = (az1 - az0 + math.pi) % (2 * math.pi) - math.pi
        kz = C.remap(t, t_rise - 0.7, t_rise + 2.2, C.smoother)
        end_dir = Vector((D_END.x * math.cos(PITCH_END), D_END.y * math.cos(PITCH_END), math.sin(PITCH_END)))
        roll = C.lerp(-10, 0, k1) + 5 * C.remap(t, ctx.t0, 91.0, C.smooth)
        if legacy or t < T_FIX:
            # v1 finale: final up to f2239, and its path still carves the field corridor (-> seeded plant layout)
            az = az0 + daz * kr
            r = C.lerp(r0, 7.0, kr)
            pos = Vector((pivot.x + r * math.cos(az), pivot.y + r * math.sin(az), C.lerp(pos.z, 3.4, kz)))
            end_aim = pos + end_dir * 50
            aim = target.lerp(end_aim, kr)
            far_focus = pos + (end_aim - pos).normalized() * 26.0
            target = target.lerp(far_focus, C.remap(t, t_rise, t_rise + 1.8, C.smooth))
            lens = C.lerp(100, LENS_END, C.remap(t, t_rise, 98.6, C.smoother))
            fst = C.lerp(10, 4.0, k1) + 4.0 * kr
            return pos, aim, target, lens, fst, roll
        # v2 finale (f2240+): v1 crossed the canopy while racking to 26 m (focus plane swept through the lens,
        # 390 px/frame orbit smear under 'her şeyi gören'). Now: 1) finish the crane fast to clear the heads
        # while still holding the hero, zooming out; 2) only then rack to the far field (focus DISTANCE, log)
        # and 3) orbit at a constant, slow angular rate. All terms start with zero slope at T_FIX (C1 join).
        kz = kz + (1 - kz) * C.remap(t, T_FIX, T_LIFT, C.smoother)
        z = C.lerp(pos.z, 3.4, kz) + (Z_TOP - 3.4) * C.remap(t, T_FIX, T_FIX + 1.6, C.smoother)
        ko = orbit_k(t)
        az = az0 + daz * ko
        r = C.lerp(r0, 7.0, ko)
        pos = Vector((pivot.x + r * math.cos(az), pivot.y + r * math.sin(az), z))
        # pan = orbit rate (hero -> pivot on the vertical centre line, ends on D_END); tilt to the horizon separately
        h = target - pos
        d_hero = h.length
        yaw_h, yaw_p = math.atan2(h.y, h.x), math.atan2(pivot.y - pos.y, pivot.x - pos.x)
        yaw = yaw_h + ((yaw_p - yaw_h + math.pi) % (2 * math.pi) - math.pi) * C.remap(t, T_ORB, T_ORB + 1.5, C.smooth)
        pitch = C.lerp(math.asin(h.z / d_hero), PITCH_END, C.remap(t, T_RACK, T_END - 1.0, C.smooth))
        view = Vector((math.cos(yaw) * math.cos(pitch), math.sin(yaw) * math.cos(pitch), math.sin(pitch)))
        aim = pos + view * 50
        kf = C.remap(t, T_RACK, T_RACK + 0.5, C.smooth)
        target = pos + view * math.exp(C.lerp(math.log(d_hero), math.log(26.0), kf))
        lens = lens_v2(t)
        fst = 4.0 + 4.0 * kf
        return pos, aim, target, lens, fst, roll

    frames = list(range(ctx.f0 - 2, ctx.f1 + 3))
    cam_pts = [cam_state(f / C.FPS, legacy=True)[0] for f in frames]

    # ------------------------------------------------------------ field + ground + horizon
    if not os.environ.get("S2_NOFIELD"):
        build_field(ctx, mats, (pivot.x, pivot.y), t_turn, cam_pts)
        build_far(ctx)
    bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, 0))
    gnd = bpy.context.object
    C.assign(gnd, C.principled("soil", base=(0.03, 0.026, 0.02), rough=0.95))

    # ------------------------------------------------------------ light: sky + sun lamp + visible sun disc
    # sunrise swell on 'Allah' (added on top of the slow g ramp; all zero before T_SUNUP)
    # (deeper, more saturated sky; the lens bloom + veil carry the radiance - AgX greys out a brighter sky)
    SU = dict(sky=-0.1, tint=(1.0, 0.52, 0.16, 1), sun=18.0, kelvin=3200, glow=-6.0, disc=4000.0,
              haze=(0.80, 0.40, 0.12, 1), glare_deg=32.0, core=50.0, core_deg=1.1, wash=2.4, wash_pow=2.5,
              glare_col=(1.0, 0.40, 0.07, 1))
    SU.update(__import__("json").loads(os.environ.get("S2_SU", "{}")))
    sky, bg = C.world_sky(sun_elev_deg=2.0, sun_rot_deg=0, strength=0.2, sun_disc=False, air=1.8, aerosol=7.0)
    sky.sun_rotation = math.atan2(SUN_DIR2.x, SUN_DIR2.y)
    # humid sunrise: golden grade on the sky (the physical sky at 12 deg reads too grey under AgX)
    wnt = bpy.context.scene.world.node_tree
    tint = wnt.nodes.new("ShaderNodeMix"); tint.data_type = "RGBA"; tint.blend_type = "MULTIPLY"; tint.inputs[0].default_value = 1.0
    tint.inputs[7].default_value = (1.0, 0.80, 0.55, 1)
    wnt.links.new(sky.outputs[0], tint.inputs[6]); wnt.links.new(tint.outputs[2], bg.inputs[0])
    sun = C.sun(elev_deg=3, azim_deg=0, strength=5.0, kelvin_k=3000, angle_deg=0.6)
    disc_m = C.principled("sun_disc", base=(0, 0, 0), emission=(1.0, 0.62, 0.3), emission_strength=900)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=30.0, segments=32, ring_count=16)
    sdisc = bpy.context.object; sdisc.name = "sun_disc"
    C.assign(sdisc, disc_m)
    disc_m.cycles.emission_sampling = "NONE"
    # aerosol glow / bloom around the sun: camera-only soft emitter (Mie forward scattering seen near the disc)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=330.0, segments=48, ring_count=24)
    sglow = bpy.context.object; sglow.name = "sun_glow"
    gm, gnt, gp = C.new_mat("sun_glow"); gnt.nodes.remove(gp)
    lw = gnt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.5
    iv = gnt.nodes.new("ShaderNodeMath"); iv.operation = "SUBTRACT"; iv.inputs[0].default_value = 1.0
    gnt.links.new(lw.outputs["Facing"], iv.inputs[1])
    pw = gnt.nodes.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 4.0
    gnt.links.new(iv.outputs[0], pw.inputs[0])
    gem = gnt.nodes.new("ShaderNodeEmission"); gem.name = "glow_em"; gem.inputs["Color"].default_value = (1.0, 0.62, 0.28, 1)
    gem.inputs["Strength"].default_value = 6.0
    gtp = gnt.nodes.new("ShaderNodeBsdfTransparent")
    gad = gnt.nodes.new("ShaderNodeMixShader")
    gnt.links.new(pw.outputs[0], gad.inputs[0]); gnt.links.new(gtp.outputs[0], gad.inputs[1]); gnt.links.new(gem.outputs[0], gad.inputs[2])
    gnt.links.new(gad.outputs[0], gnt.nodes["Material Output"].inputs["Surface"])
    gm.cycles.emission_sampling = "NONE"
    C.assign(sglow, gm)
    sglow.visible_diffuse = sglow.visible_glossy = sglow.visible_transmission = sglow.visible_shadow = False
    sdisc.visible_diffuse = sdisc.visible_glossy = sdisc.visible_transmission = sdisc.visible_shadow = False
    sdisc.visible_volume_scatter = False
    for f in range(ctx.f0 - 2, ctx.f1 + 3, 2):
        t = f / C.FPS
        e = sun_elev(t)
        g = C.remap(t, 89.0, t_allah + 0.1, C.smooth)
        g2 = C.remap(t, *T_SUNUP, C.smooth)
        sky.sun_elevation = math.radians(e)
        sky.keyframe_insert("sun_elevation", frame=f)
        bg.inputs["Strength"].default_value = C.lerp(0.04, 0.05, g) * (1 + SU["sky"] * g2)
        bg.inputs["Strength"].keyframe_insert("default_value", frame=f)
        tint.inputs[7].default_value = C.lerp((1.0, 0.80, 0.55, 1), SU["tint"], g2)
        tint.inputs[7].keyframe_insert("default_value", frame=f)
        sun.rotation_euler = Euler((math.radians(90 - e), 0, SUN_AZ - math.pi), "XYZ")
        sun.keyframe_insert("rotation_euler", frame=f)
        # v2 reveal looks down-sun onto front-lit heads: AgX washes the sunlit rays to cream -> ease the sun off
        # (the shade is opened by the Film exposure below), back to full once the camera turns across the light
        dim = 1 - SUN_DIP * (C.remap(f, 2242, 2256, C.smooth) - C.remap(f, 2278, 2310, C.smooth))
        sun.data.energy = (C.lerp(3.0, 14.0, g) + SU["sun"] * g2) * dim
        sun.data.keyframe_insert("energy", frame=f)
        sun.data.color = C.kelvin(C.lerp(C.lerp(3300, 4200, g), SU["kelvin"], g2))
        sun.data.keyframe_insert("color", frame=f)
        dist = 2800
        sdisc.location = (SUN_DIR2.x * dist * math.cos(math.radians(e)), SUN_DIR2.y * dist * math.cos(math.radians(e)),
                          dist * math.sin(math.radians(e)))
        sdisc.keyframe_insert("location", frame=f)
        sglow.location = sdisc.location
        sglow.keyframe_insert("location", frame=f)
        gem.inputs["Strength"].default_value = C.lerp(2.5, 8.0, g) + SU["glow"] * g2
        gem.inputs["Strength"].keyframe_insert("default_value", frame=f)
        disc_m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = C.lerp(1500, 4000, g) + SU["disc"] * g2
        disc_m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].keyframe_insert("default_value", frame=f)

    # ------------------------------------------------------------ camera
    cam = C.camera("cam", lens=100, loc=(0, -2, 1.6), fstop=8, clip_end=6000)
    foc = C.empty("cam_focus", (0, 0, 0))
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_blades = 7
    cam.data.dof.focus_object = foc
    prev_rot, floored = None, []
    for f in frames:
        pos, aim, target, lens, fst, roll = cam_state(f / C.FPS)
        cam.location = pos
        C.point_at(cam, aim, roll_deg=roll)
        # keep the Euler keys continuous: point_at wraps yaw at +-180 deg (f2270->2271), and the motion-blur
        # shutter would interpolate that as a ~360 deg spin (ghosted frames 2270-2271). Same orientation per frame.
        e = cam.rotation_euler.copy()
        if prev_rot is not None:
            e.make_compatible(prev_rot)
        cam.rotation_euler = e
        prev_rot = e.copy()
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_euler", frame=f)
        # Cycles focuses at |dot(view axis, cam - focus)|. While the focus target swings toward the far field it
        # crosses the lens plane (0.04 m at f2253: the frame washed out to a flat gradient), so floor that distance.
        vz = e.to_matrix().col[2]
        dproj = vz.dot(pos - target)
        if abs(dproj) < FOCUS_MIN:
            target = target + vz * (dproj - math.copysign(FOCUS_MIN, dproj))
            floored.append(f)
        foc.location = target
        foc.keyframe_insert("location", frame=f)
        cam.data.lens = lens
        cam.data.keyframe_insert("lens", frame=f)
        cam.data.dof.aperture_fstop = fst
        cam.data.dof.keyframe_insert("aperture_fstop", frame=f)
    print(f"[sh14a] focus floor {FOCUS_MIN} m applied at frames {floored}", flush=True)
    C.handheld(cam, amp_loc=0.0005, amp_rot=0.0006, speed=0.4, seed=14)

    # veiling glare of the lens looking into the risen sun ('Allah'): a camera-only additive emitter 1 m out along
    # the (fixed) sun direction, riding on the camera position -> sits on the sun in frame, no keys needed but strength
    ce = math.cos(math.radians(SUN_ELEV))
    sun_dir3 = Vector((SUN_DIR2.x * ce, SUN_DIR2.y * ce, math.sin(math.radians(SUN_ELEV))))
    bpy.ops.mesh.primitive_circle_add(vertices=96, radius=math.tan(math.radians(SU["glare_deg"])), fill_type="TRIFAN",
                                      location=sun_dir3)
    glare = bpy.context.object; glare.name = "sun_glare"
    glare.rotation_euler = sun_dir3.to_track_quat("Z", "Y").to_euler()
    lm, lnt, lp = C.new_mat("sun_glare"); lnt.nodes.remove(lp)
    tco = lnt.nodes.new("ShaderNodeTexCoord")
    ln = lnt.nodes.new("ShaderNodeVectorMath"); ln.operation = "LENGTH"
    lnt.links.new(tco.outputs["Object"], ln.inputs[0])
    lr = lnt.nodes.new("ShaderNodeMapRange"); lr.inputs[1].default_value = 0.0
    lr.inputs[2].default_value = math.tan(math.radians(SU["glare_deg"])); lr.inputs[3].default_value = 1.0; lr.inputs[4].default_value = 0.0
    lnt.links.new(ln.outputs["Value"], lr.inputs[0])

    def mnode(op, a, b):
        n = lnt.nodes.new("ShaderNodeMath"); n.operation = op
        for i, v in enumerate((a, b)):
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                lnt.links.new(v, n.inputs[i])
        return n.outputs[0]
    # bloom ~ A / (1 + (r/r0)^2) (no edge; white core, golden skirt) + a broad warm veil; both fade out at the rim
    sq = mnode("DIVIDE", ln.outputs["Value"], math.tan(math.radians(SU["core_deg"])))
    bloom = mnode("MULTIPLY", mnode("DIVIDE", SU["core"], mnode("ADD", mnode("MULTIPLY", sq, sq), 1.0)), lr.outputs[0])
    veil = mnode("MULTIPLY", mnode("POWER", lr.outputs[0], SU["wash_pow"]), SU["wash"])
    lsum = mnode("ADD", bloom, veil).node
    lem = lnt.nodes.new("ShaderNodeEmission"); lem.inputs["Color"].default_value = SU["glare_col"]
    lmul = lnt.nodes.new("ShaderNodeMath"); lmul.operation = "MULTIPLY"
    lnt.links.new(lsum.outputs[0], lmul.inputs[0])
    lnt.links.new(lmul.outputs[0], lem.inputs["Strength"])
    ltr = lnt.nodes.new("ShaderNodeBsdfTransparent")
    lad = lnt.nodes.new("ShaderNodeAddShader")
    lnt.links.new(ltr.outputs[0], lad.inputs[0]); lnt.links.new(lem.outputs[0], lad.inputs[1])
    lnt.links.new(lad.outputs[0], lnt.nodes["Material Output"].inputs["Surface"])
    lm.cycles.emission_sampling = "NONE"
    C.assign(glare, lm)
    glare.visible_diffuse = glare.visible_glossy = glare.visible_transmission = glare.visible_shadow = False
    glare.visible_volume_scatter = False
    cl = glare.constraints.new("COPY_LOCATION"); cl.target = cam; cl.use_offset = True
    for f in range(C.t2f(T_SUNUP[0]) - 4, ctx.f1 + 3, 2):
        lmul.inputs[1].default_value = C.remap(f / C.FPS, *T_SUNUP, C.smooth)
        lmul.inputs[1].keyframe_insert("default_value", frame=f)

    # backlit stems/necks: v1 grazing sun glints read as white slivers (f2370 ~(1035,1320)) -> matte, hispid stems
    # once the camera turns into the sun (keyed; unchanged before f2280)
    sp = bpy.data.materials["SF_stem"].node_tree.nodes["Principled BSDF"]
    for f, rough, spec in ((2280, sp.inputs["Roughness"].default_value, sp.inputs["Specular IOR Level"].default_value),
                           (2300, 0.85, 0.04)):
        sp.inputs["Roughness"].default_value = rough
        sp.inputs["Roughness"].keyframe_insert("default_value", frame=f)
        sp.inputs["Specular IOR Level"].default_value = spec
        sp.inputs["Specular IOR Level"].keyframe_insert("default_value", frame=f)

    for f, ev in ((ctx.f0, 1.9), (C.t2f(90.3), 1.5), (C.t2f(92.0), 0.15), (C.t2f(95.0), 0.2), (C.t2f(t_allah), 0.25),
                  (C.t2f(T_SUNUP[1]), 0.32), (ctx.f1, 0.32)):
        sc.view_settings.exposure = ev
        sc.view_settings.keyframe_insert("exposure", frame=f)
    # v2: the lift looks down into the shaded canopy -> the operator opens up ~2/3 stop, then rides it back as the
    # bright sky enters (separate Film exposure curve, so the approved view-exposure keys before f2240 stay as they are)
    FILM_LIFT = float(os.environ.get("S2_LIFT", 1.5))
    for f, fe in ((2242, 1.0), (2258, FILM_LIFT), (2268, FILM_LIFT), (2300, 1.0)):
        sc.cycles.film_exposure = fe
        sc.cycles.keyframe_insert("film_exposure", frame=f)

    # aerial perspective in-shader (the compositor needs a GPU context, unavailable on the farm)
    hg = L.haze_group()
    hg2 = L.haze_group("S2_haze_hills", 0.55)       # hills keep form + a darker tree line inside the haze
    for m in bpy.data.materials:
        if m.name not in ("sun_disc", "sun_glow", "sun_glare") and m.node_tree:
            L.add_haze(m, hg2 if m.name.startswith("hills") else hg)
    hc, hd = hg.nodes["haze_col"], hg.nodes["haze_den"]
    hg2.nodes["haze_den"].outputs[0].default_value = 0.0024
    hg2.nodes["haze_col"].outputs[0].default_value = (0.20, 0.12, 0.07, 1)
    hg2.nodes["sun_dir"].inputs[0].default_value = SUN_DIR2.x
    hg2.nodes["sun_dir"].inputs[1].default_value = SUN_DIR2.y
    hd.outputs[0].default_value = 0.0024
    sdn = hg.nodes["sun_dir"]
    ce = math.cos(math.radians(SUN_ELEV))
    sdn.inputs[0].default_value, sdn.inputs[1].default_value, sdn.inputs[2].default_value = (
        SUN_DIR2.x * ce, SUN_DIR2.y * ce, math.sin(math.radians(SUN_ELEV)))
    for f in range(ctx.f0 - 6, ctx.f1 + 7, 6):
        t = f / C.FPS
        g = C.remap(t, 89.0, t_allah + 0.1, C.smooth)
        hc.outputs[0].default_value = C.lerp((C.lerp(0.16, 0.55, g), C.lerp(0.09, 0.26, g), C.lerp(0.06, 0.10, g), 1),
                                             SU["haze"], C.remap(t, *T_SUNUP, C.smooth))
        hc.outputs[0].keyframe_insert("default_value", frame=f)
    ov = {"final_spp": 6, "clamp_direct": 12.0, "clamp_indirect": 3.0, "final_threshold": 0.05, "preview_spp": 24, "max_bounces": 6, "transmission_bounces": 6, "texture_limit": "2048"}
    import json as _j
    ov.update(_j.loads(os.environ.get("S2_OV", "{}")))
    L.fast_denoise_handler(*os.environ.get("S2_DN", "FAST,BALANCED").split(","))
    if os.environ.get("S2_NODEW"):
        for o in bpy.data.objects:
            if "dew" in o.name:
                o.hide_render = True
    if os.environ.get("S2_SPLIT"):
        bpy.context.scene.cycles.debug_use_spatial_splits = True
    if os.environ.get("S2_THREADS"):
        bpy.context.scene.render.threads_mode = "FIXED"; bpy.context.scene.render.threads = int(os.environ["S2_THREADS"])
    if os.environ.get("S2_NODOF"):
        bpy.context.scene.camera.data.dof.use_dof = False
    if os.environ.get("S2_NOSKY"):
        bpy.context.scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.0
        bpy.context.scene.world.node_tree.nodes["Background"].inputs[1].driver_remove("default_value") if False else None
        bpy.context.scene.world.animation_data_clear() if bpy.context.scene.world.animation_data else None
        bpy.context.scene.world.node_tree.animation_data_clear()
    if os.environ.get("S2_CLAY"):
        bpy.context.view_layer.material_override = C.principled("clay", base=(0.5, 0.5, 0.5), rough=0.6)
    return ov


C.run("sh14a", build)
