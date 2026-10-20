"""sh09 - inside the forearm (47.40-52.10 s).

Scale: 1 m = 100 um (lib_s7). Muscle fibres r = 0.22 (44 um) run along +Y, grouped in fascicles
wrapped by translucent perimysium; the probe glides forward along a channel between fascicles where
a myelinated motor nerve (nodes of Ranvier compressed to 0.55 m spacing for readability) runs to a
neuromuscular junction on the hero fibre. On "kaslarda" an impulse jumps node to node, fires the
junction and the fibres twitch (GN contraction ripple, striations bunch). On "hucrelerde" the probe
turns, pierces the sheath and the sarcolemma and settles inside the fibre among myofibrils next to
glowing mitochondria (camera rolled 90 deg so the myofibrils run vertically in the 9:16 frame).
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy, bmesh
from mathutils import Vector, Euler, Quaternion, Matrix, noise
import common as C
import lib_s7 as L

FOG_OUT = dict(color=(0.045, 0.012, 0.010), dist=1.6, strength=1.0, power=1.1)
HERO_C = Vector((0.47, 0.0, 0.0))      # hero fibre axis (x, -, z)
R_F = 0.22
J_Y = 2.75                             # junction position along the hero fibre
DIVE_Y = 1.86                          # where the probe enters the hero fibre


def build(ctx):
    rng = random.Random(909)
    sc = bpy.context.scene
    t_kas = ctx.word("kaslarda")
    t_huc = ctx.word("hücrelerde")
    frames = list(range(ctx.f0 - 3, ctx.f1 + 3))
    times = [f / C.FPS for f in frames]
    t_imp0 = t_kas - 0.08                  # impulse starts just before the word
    t_junc = t_kas + 0.26                  # reaches the junction
    C.world_color(FOG_OUT["color"], 1.0)
    fg = L.fog_group(**FOG_OUT)

    # ---------------------------------------------------------------- fibres & fascicles
    m_mus = L.mat_muscle(fog=FOG_OUT)
    m_mus_hero = L.mat_muscle("MuscleHero", fog=FOG_OUT)
    fibres = []
    # fascicle centres around the channel (channel axis = x 0, z 0)
    fasc = [(Vector((0.95, 0, 0.05)), 0.75, True), (Vector((-0.92, 0, 0.12)), 0.72, False),
            (Vector((0.05, 0, -1.02)), 0.78, False), (Vector((-0.2, 0, 1.15)), 0.8, False),
            (Vector((1.2, 0, -1.25)), 0.7, False)]
    sheath_mat = make_sheath_mat()
    k = 0
    for fi, (fc, frad, is_hero_fasc) in enumerate(fasc):
        # hex-packed fibres inside the fascicle
        pts = []
        sp = 2 * R_F + 0.05
        for a in range(-4, 5):
            for b in range(-4, 5):
                p = Vector((a * sp + b * sp * 0.5, 0, b * sp * 0.866))
                if p.length + R_F < frad + 0.02:
                    pts.append(p)
        if is_hero_fasc:
            # make sure one fibre sits exactly at HERO_C (inner edge, facing the channel)
            shift = HERO_C - fc
            best = min(pts, key=lambda p: (p - shift).length)
            pts = [p + (shift - best) for p in pts]
        for p in pts:
            c = fc + p
            hero = is_hero_fasc and (c - HERO_C).length < 0.01
            me = L.fibre_mesh(f"fib{k}", radius=R_F * rng.uniform(0.9, 1.0), y0=-3.0, y1=7.0, seed=k,
                              nu=48 if hero else 36, nv=420 if hero else 260)
            o = L.obj_from_mesh(f"fibre_{k:02d}" if not hero else "fibre_hero", me, m_mus_hero if hero else m_mus,
                                loc=(c.x, 0, c.z))
            fibres.append((o, c, hero))
            k += 1
        # perimysium sheath
        sm = L.tube_mesh(f"sheath{fi}", radius=frad + 0.03, y0=-3, y1=7, nu=96, nv=200, seed=50 + fi, amp=0.03,
                         inward=False)
        if fc.length > 1.5:
            so = L.obj_from_mesh(f"sheath_{fi}", sm, sheath_mat, loc=(fc.x, 0, fc.z))
    # endomysium: wispy collagen web around the fibres bordering the channel
    m_web = L.mat_web("Endomysium", alpha_max=0.18)
    for o, c, hero in fibres:
        if (Vector((c.x, 0, c.z))).length < 0.8:
            wm = L.tube_mesh(f"web_{o.name}", radius=R_F + 0.014, y0=-3, y1=7, nu=64, nv=160, seed=hash(o.name) % 97,
                             amp=0.04, inward=False)
            L.obj_from_mesh(f"web_{o.name}", wm, m_web, loc=(c.x, 0, c.z))
    build_capillaries(rng, frames, times)

    # contraction: hero + neighbours (delayed), others still
    for o, c, hero in fibres:
        d = (c - HERO_C).length
        if hero:
            L.add_contraction(o, J_Y, t_junc, amp=1.0)
        elif d < 1.3:
            L.add_contraction(o, J_Y + rng.uniform(-0.4, 0.4), t_junc + 0.06 + 0.12 * d + rng.uniform(0, 0.08),
                              amp=rng.uniform(0.5, 0.9))
        else:
            L.store_rest(o)

    # ---------------------------------------------------------------- nerve (myelinated motor axon)
    npts = []
    NZ = -0.17                                # nerve runs along the lower flank of the hero fibre
    for i in range(240):
        u = i / 239
        y = C.lerp(-1.4, J_Y - 0.05, u)
        z = C.lerp(-0.55, NZ, C.smooth(C.remap(y, -0.6, 1.1, C.smooth))) + 0.012 * math.sin(y * 2.1)
        xs = HERO_C.x - math.sqrt(max(0.0, (R_F + 0.035) ** 2 - (z - HERO_C.z) ** 2))
        x = C.lerp(0.10, xs, C.smooth(C.remap(y, -0.6, 1.1, C.smooth)))
        npts.append(Vector((x, y, z)))
    internode = 0.55
    s_end_guess = sum((npts[i] - npts[i - 1]).length for i in range(1, len(npts)))

    def nerve_r(s, i):
        x = (s % internode) / internode
        node = min(x, 1 - x) * internode          # distance to nearest node of Ranvier
        r = 0.022 + 0.020 * C.smooth(node / 0.04)
        r *= 1 + 0.06 * noise.noise(Vector((s * 3.0, 0.3, 0.7)))
        r += 0.007 * math.exp(-((x - 0.42) / 0.06) ** 2)          # Schwann-cell nucleus bulge
        if s > s_end_guess - 0.12:                # unmyelinated terminal
            r = 0.018
        return r
    # resample densely so the nodes are well formed
    dense = []
    for i in range(len(npts) - 1):
        for kk in range(6):
            dense.append(npts[i].lerp(npts[i + 1], kk / 6))
    dense.append(npts[-1])
    nme, s_acc = L.path_tube("nerve", dense, nerve_r, nu=28)
    s_end = s_acc[-1]
    m_nerve = make_nerve_mat(internode, t_imp0, s_end, t_junc)
    nerve = L.obj_from_mesh("nerve", nme, m_nerve)
    # thin translucent connective sheath around the axon
    sme, _ = L.path_tube("nerveSheath", dense, lambda s_, i: nerve_r(s_, i) * 0.4 + 0.034, nu=28, store_s=False)
    L.obj_from_mesh("nerveSheath", sme, L.mat_web("Perineurium", alpha_max=0.28, stretch=(60, 4, 60)))
    # terminal boutons (end plate) on the hero fibre
    m_bout = make_bouton_mat(t_junc)
    for b in range(9):
        a = rng.uniform(-0.9, 0.9)
        a = math.asin(max(-1, min(1, NZ / R_F))) + rng.uniform(-0.35, 0.35)
        p = Vector((HERO_C.x - R_F * math.cos(a) * 0.99, J_Y + rng.uniform(-0.09, 0.09), HERO_C.z + R_F * math.sin(a)))
        bo = L.obj_from_mesh(f"bouton{b}", L.blob_mesh(f"bt{b}", radius=rng.uniform(0.016, 0.026), sub=3, seed=200 + b,
                                                       amp=0.2), m_bout, loc=p)
    # impulse light travels with the front (real teal illumination on nearby tissue)
    imp = C.point_light("impulse", loc=(0, 0, 0), power=0.0, radius=0.03, kelvin_k=9000)
    imp.data.color = (0.35, 0.95, 1.0)
    imp.visible_camera = False
    ipos, ipow = [], []
    for t in times:
        s = (t - t_imp0) / (t_junc - t_imp0) * s_end
        sc_ = max(0.0, min(s_end, s))
        idx = min(range(len(s_acc)), key=lambda i: abs(s_acc[i] - sc_)) if 0 < s < s_end + 1 else (0 if s <= 0 else len(s_acc) - 1)
        ipos.append(tuple(dense[idx] + Vector((0, 0, 0.05))))
        on = 1.0 if 0 < s < s_end else 0.0
        flash = math.exp(-max(0, t - t_junc) / 0.25) if t >= t_junc else 0.0
        ipow.append(0.5 * on + 1.5 * flash)
    L.bake(imp, frames, "location", ipos)
    L.bake_id(imp.data, frames, "energy", ipow)
    i_n = min(range(len(dense)), key=lambda i: abs(dense[i].y - 1.55))
    trk_n = C.empty("TRK_nerve", tuple(dense[i_n] + Vector((0, 0, 0.03))))
    trk_f = C.empty("TRK_fiber", (HERO_C.x - R_F * 0.85, 1.75, HERO_C.z + R_F * 0.5))

    # ---------------------------------------------------------------- collagen strands in the channel
    m_col = L.mat_wet_tissue("Collagen", base=(0.75, 0.66, 0.58), sss_radius=(1, 0.8, 0.6), sss_scale=0.01,
                             rough=0.45, coat=0.4, coat_rough=0.2)[0]
    L.fog_wrap(m_col)
    for c_ in range(0):
        y0 = rng.uniform(-0.5, 5.5)
        p0 = Vector((rng.uniform(-0.5, 0.5), y0, rng.uniform(-0.45, 0.5)))
        d = Vector((rng.uniform(-1, 1), rng.uniform(0.6, 2.5), rng.uniform(-0.6, 0.6))).normalized()
        pts = []
        for i in range(60):
            u = (i / 59 - 0.5) * rng.uniform(1.2, 2.2)
            w = Vector((0.02 * math.sin(u * 14 + c_), 0, 0.02 * math.cos(u * 11 + c_)))
            pts.append(p0 + d * u + w)
        rr = rng.uniform(0.003, 0.009)
        me, _ = L.path_tube(f"col{c_}", pts, lambda s, i, rr=rr: rr, nu=8, store_s=False)
        L.obj_from_mesh(f"collagen{c_}", me, m_col)

    # ---------------------------------------------------------------- inside the hero fibre
    exterior = set(o for o in bpy.data.objects if o.type == "MESH")
    build_interior(rng, ctx)
    interior = [o for o in bpy.data.objects if o.type == "MESH" and o not in exterior]

    # ---------------------------------------------------------------- camera
    cam = C.camera("cam", lens=35, loc=(0, -0.4, 0), fstop=5.0, focus=0.6, clip_start=0.002, clip_end=40)
    cam.data.dof.aperture_blades = 0
    entry_x = HERO_C.x - R_F
    keys_loc, keys_rot, foc, fst = [], [], [], []
    prev_e = None
    # camera rig: forward glide along the channel, then a curving dive into the fibre
    p_a = Vector((0.0, -0.35, 0.06))
    p_b = Vector((0.03, 1.05, 0.02))
    p_c = Vector((entry_x - 0.16, DIVE_Y, -0.02))
    p_d = Vector((entry_x + 0.05, DIVE_Y, -0.02))
    p_e = Vector((HERO_C.x - 0.0105 - 0.062, DIVE_Y, -0.02))     # final: ~0.06 from the hero mito
    t_a, t_b = ctx.t0 - 0.3, t_huc - 0.05
    t_c = t_huc + 0.55
    t_d = t_huc + 0.85
    t_e = ctx.t1 - 0.6
    # looking down the fibres but yawed toward the hero fascicle so bundles cross the frame diagonally
    q_fwd = Euler((math.radians(82), 0, math.radians(-14))).to_quaternion()
    # looking +X with the camera's up = world +Y, so myofibrils run vertically in the 9:16 frame
    q_side = Matrix(((0, 0, -1), (0, 1, 0), (1, 0, 0))).to_quaternion()
    for t in times:
        if t < t_b:
            u = C.remap(t, t_a, t_b, lambda x: x * 0.25 + 0.75 * C.smooth(x))
            p = p_a.lerp(p_b, u)
            q = q_fwd
        elif t < t_c:
            u = C.remap(t, t_b, t_c, C.smooth)
            # bezier through p_b -> p_c with forward tangent
            c1 = p_b + Vector((0, 0.45, 0))
            c2 = p_c - Vector((0.2, 0, 0))
            p = (1 - u) ** 3 * p_b + 3 * (1 - u) ** 2 * u * c1 + 3 * (1 - u) * u * u * c2 + u ** 3 * p_c
            q = q_fwd.slerp(q_side, C.smooth(u))
        elif t < t_d:
            u = C.remap(t, t_c, t_d, lambda x: x)
            p = p_c.lerp(p_d, u)
            q = q_side
        else:
            u = C.remap(t, t_d, t_e, C.ease_out)
            p = p_d.lerp(p_e, u)
            q = q_side
        e = q.to_euler("XYZ", prev_e) if prev_e else q.to_euler("XYZ")
        prev_e = e
        keys_loc.append(tuple(p)); keys_rot.append(tuple(e))
        # focus: down the channel early, then the membrane, then the hero mito
        if t < t_c:
            fd = C.lerp(0.9, 0.2, C.remap(t, t_b, t_c))
        else:
            fd = max(0.03, (HERO_C.x - 0.0105) - p.x)
        foc.append(fd)
        fst.append(C.lerp(5.0, 70.0, C.remap(t, t_c - 0.15, t_d + 0.3)))
    L.bake(cam, frames, "location", keys_loc)
    L.bake(cam, frames, "rotation_euler", keys_rot)
    L.bake_id(cam.data, frames, "dof.focus_distance", foc)
    L.bake_id(cam.data, frames, "dof.aperture_fstop", fst)
    C.handheld(cam, amp_loc=0.0008, amp_rot=0.002, speed=0.5, seed=9)

    # budget: interior objects only exist once the probe reaches the membrane, exterior tissue
    # disappears once we are inside the fibre (both hidden by the haze anyway)
    f_in = C.t2f(t_c - 0.15); f_out = C.t2f(t_d + 0.2)
    for o in interior:
        L.bake(o, [frames[0], f_in], "hide_render", [1.0, 0.0], interp="CONSTANT")
    for o in exterior:
        L.bake(o, [frames[0], f_out], "hide_render", [0.0, 1.0], interp="CONSTANT")

    # haze: red-brown tissue haze outside -> dense teal cytoplasm inside
    fd_, fc_ = [], []
    for t in times:
        u = C.remap(t, t_c + 0.05, t_d + 0.1)
        fd_.append(C.lerp(1.6, 0.3, u))
        w = C.remap(t, t_kas, t_kas + 0.6)
        col = C.lerp((0.045, 0.012, 0.010), (0.018, 0.026, 0.03), w)
        col = C.lerp(col, (0.022, 0.05, 0.055), u)
        fc_.append(col)
    L.bake_id(fg, frames, 'nodes["dist"].outputs[0].default_value', fd_)
    L.bake_id(fg, frames, 'nodes["color"].outputs[0].default_value', [(*c, 1.0) for c in fc_])
    w_ = sc.world.node_tree
    bg = [n for n in w_.nodes if n.type == "BACKGROUND"][0]
    L.bake_id(w_, frames, f'nodes["{bg.name}"].inputs[0].default_value', [(*c, 1.0) for c in fc_])

    # ---------------------------------------------------------------- lights
    key = C.area("key_amber", size=0.35, power=14.0, kelvin_k=3300)
    key.parent = cam; key.location = (-0.25, 0.3, 0.05); key.rotation_euler = (math.radians(-30), math.radians(-30), 0)
    for i, (p, pw, col) in enumerate(((Vector((0.1, 2.8, 0.45)), 9.0, (0.3, 0.85, 1.0)),
                                      (Vector((-0.35, 4.2, -0.3)), 14.0, (0.35, 0.9, 1.0)),
                                      (Vector((0.25, 1.2, -0.35)), 3.0, (1.0, 0.55, 0.25)))):
        pl = C.point_light(f"rim{i}", loc=tuple(p), power=pw, radius=0.15)
        pl.data.color = col; pl.visible_camera = False
        pl.data.specular_factor = 0.0       # rims light the SSS, no hard blob reflections
        pl.visible_glossy = False
    # soft interior light carried by the probe (switched on as we enter)
    il = C.point_light("probe_in", loc=(0, 0, 0), power=0.0, radius=0.01, kelvin_k=4500)
    il.parent = cam; il.location = (0.0, 0.015, 0.0)
    il.data.specular_factor = 0.0
    il.data.color = (0.5, 0.9, 1.0)
    L.bake_id(il.data, frames, "energy", [C.lerp(0.0, 0.06, C.remap(t, t_c, t_d)) for t in times])
    L.bake_id(key.data, frames, "energy", [C.lerp(6.0, 0.0, C.remap(t, t_c - 0.1, t_d)) for t in times])
    sc.view_settings.exposure = 0.4

    sc.world.light_settings.distance = 0.2
    L.budget_denoise(prefilter="ACCURATE", quality="BALANCED", final_res=80)
    ov = dict(L.LEAN)
    ov.update(transmission_bounces=3, transparent_bounces=6, final_spp=10, preview_spp=12)
    return ov


# --------------------------------------------------------------------------- materials


def make_sheath_mat():
    """Perimysium: thin translucent connective film with wavy collagen texture and wet glints."""
    m, nt, p = C.new_mat("Sheath")
    p.inputs["Base Color"].default_value = (0.85, 0.75, 0.68, 1)
    p.inputs["Roughness"].default_value = 0.25
    p.inputs["Coat Weight"].default_value = 0.6
    p.inputs["Coat Roughness"].default_value = 0.06
    tc = L._n(nt, "ShaderNodeTexCoord")
    mp = L._n(nt, "ShaderNodeMapping"); mp.inputs["Scale"].default_value = (30, 3, 30)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    wv = L._n(nt, "ShaderNodeTexWave"); wv.wave_type = "BANDS"; wv.bands_direction = "Y"
    wv.inputs["Scale"].default_value = 3.0; wv.inputs["Distortion"].default_value = 8.0; wv.inputs["Detail"].default_value = 4
    nt.links.new(mp.outputs[0], wv.inputs["Vector"])
    nz = L._n(nt, "ShaderNodeTexNoise", **{"Scale": 4.0, "Detail": 3.0})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    a = L._n(nt, "ShaderNodeMath"); a.operation = "MULTIPLY"
    nt.links.new(wv.outputs["Fac"], a.inputs[0]); nt.links.new(nz.outputs["Fac"], a.inputs[1])
    al = L._n(nt, "ShaderNodeMapRange"); al.inputs["To Min"].default_value = 0.04; al.inputs["To Max"].default_value = 0.42
    nt.links.new(a.outputs[0], al.inputs["Value"])
    nt.links.new(al.outputs[0], p.inputs["Alpha"])
    L._bump_chain(nt, p, [(wv.outputs["Fac"], 0.2)], distance=0.003)
    L.fog_wrap(m)
    return m


def make_nerve_mat(internode, t_imp0, s_end, t_junc):
    """Myelin: glossy creamy-white lamellar sheath (SSS). Impulse: teal emission at the nodes of Ranvier
    lighting one after another (saltatory), with a faint glow travelling along the axon in between."""
    m, nt, p = L.mat_wet_tissue("Myelin", base=(0.74, 0.62, 0.50), sss_radius=(1.0, 0.8, 0.6), sss_scale=0.03,
                                rough=0.48, coat=0.35, coat_rough=0.2)
    at = L._n(nt, "ShaderNodeAttribute"); at.attribute_name = "s"
    tv = L.time_value(nt)
    # front position S(t)
    f1 = L._n(nt, "ShaderNodeMath"); f1.operation = "SUBTRACT"; f1.inputs[1].default_value = t_imp0
    nt.links.new(tv.outputs[0], f1.inputs[0])
    S = L._n(nt, "ShaderNodeMath"); S.operation = "MULTIPLY"; S.inputs[1].default_value = s_end / (t_junc - t_imp0)
    nt.links.new(f1.outputs[0], S.inputs[0])
    # node index & distance to node
    q = L._n(nt, "ShaderNodeMath"); q.operation = "DIVIDE"; q.inputs[1].default_value = internode
    nt.links.new(at.outputs["Fac"], q.inputs[0])
    rnd = L._n(nt, "ShaderNodeMath"); rnd.operation = "ROUND"; nt.links.new(q.outputs[0], rnd.inputs[0])
    sn = L._n(nt, "ShaderNodeMath"); sn.operation = "MULTIPLY"; sn.inputs[1].default_value = internode
    nt.links.new(rnd.outputs[0], sn.inputs[0])
    dn = L._n(nt, "ShaderNodeMath"); dn.operation = "SUBTRACT"
    nt.links.new(at.outputs["Fac"], dn.inputs[0]); nt.links.new(sn.outputs[0], dn.inputs[1])
    g1 = L._n(nt, "ShaderNodeMath"); g1.operation = "DIVIDE"; g1.inputs[1].default_value = 0.03
    nt.links.new(dn.outputs[0], g1.inputs[0])
    g2 = L._n(nt, "ShaderNodeMath"); g2.operation = "MULTIPLY"; nt.links.new(g1.outputs[0], g2.inputs[0]); nt.links.new(g1.outputs[0], g2.inputs[1])
    g3 = L._n(nt, "ShaderNodeMath"); g3.operation = "MULTIPLY"; g3.inputs[1].default_value = -1.0; nt.links.new(g2.outputs[0], g3.inputs[0])
    nodeglow = L._n(nt, "ShaderNodeMath"); nodeglow.operation = "EXPONENT"; nt.links.new(g3.outputs[0], nodeglow.inputs[0])
    # node fired? lag = S - s_node (>0 after the front passed), decays
    lag = L._n(nt, "ShaderNodeMath"); lag.operation = "SUBTRACT"
    nt.links.new(S.outputs[0], lag.inputs[0]); nt.links.new(sn.outputs[0], lag.inputs[1])
    fired = L._n(nt, "ShaderNodeMath"); fired.operation = "GREATER_THAN"; fired.inputs[1].default_value = 0.0
    nt.links.new(lag.outputs[0], fired.inputs[0])
    dec = L._n(nt, "ShaderNodeMath"); dec.operation = "DIVIDE"; dec.inputs[1].default_value = -0.9
    nt.links.new(lag.outputs[0], dec.inputs[0])
    dec2 = L._n(nt, "ShaderNodeMath"); dec2.operation = "EXPONENT"; nt.links.new(dec.outputs[0], dec2.inputs[0])
    nf = L._n(nt, "ShaderNodeMath"); nf.operation = "MULTIPLY"
    nt.links.new(fired.outputs[0], nf.inputs[0]); nt.links.new(dec2.outputs[0], nf.inputs[1])
    e1 = L._n(nt, "ShaderNodeMath"); e1.operation = "MULTIPLY"
    nt.links.new(nf.outputs[0], e1.inputs[0]); nt.links.new(nodeglow.outputs[0], e1.inputs[1])
    # travelling sheath glow around the front
    fr = L._n(nt, "ShaderNodeMath"); fr.operation = "SUBTRACT"
    nt.links.new(at.outputs["Fac"], fr.inputs[0]); nt.links.new(S.outputs[0], fr.inputs[1])
    fr2 = L._n(nt, "ShaderNodeMath"); fr2.operation = "DIVIDE"; fr2.inputs[1].default_value = 0.07
    nt.links.new(fr.outputs[0], fr2.inputs[0])
    fr3 = L._n(nt, "ShaderNodeMath"); fr3.operation = "MULTIPLY"; nt.links.new(fr2.outputs[0], fr3.inputs[0]); nt.links.new(fr2.outputs[0], fr3.inputs[1])
    fr4 = L._n(nt, "ShaderNodeMath"); fr4.operation = "MULTIPLY"; fr4.inputs[1].default_value = -1.0; nt.links.new(fr3.outputs[0], fr4.inputs[0])
    fr5 = L._n(nt, "ShaderNodeMath"); fr5.operation = "EXPONENT"; nt.links.new(fr4.outputs[0], fr5.inputs[0])
    act = L._n(nt, "ShaderNodeMath"); act.operation = "LESS_THAN"; act.inputs[1].default_value = s_end + 0.1
    nt.links.new(S.outputs[0], act.inputs[0])
    fr6 = L._n(nt, "ShaderNodeMath"); fr6.operation = "MULTIPLY"; nt.links.new(fr5.outputs[0], fr6.inputs[0]); nt.links.new(act.outputs[0], fr6.inputs[1])
    tot = L._n(nt, "ShaderNodeMath"); tot.operation = "MULTIPLY_ADD"; tot.inputs[1].default_value = 0.12
    nt.links.new(fr6.outputs[0], tot.inputs[0])
    e1s = L._n(nt, "ShaderNodeMath"); e1s.operation = "MULTIPLY"; e1s.inputs[1].default_value = 1.0
    nt.links.new(e1.outputs[0], e1s.inputs[0]); nt.links.new(e1s.outputs[0], tot.inputs[2])
    st = L._n(nt, "ShaderNodeMath"); st.operation = "MULTIPLY"; st.inputs[1].default_value = 25.0
    nt.links.new(tot.outputs[0], st.inputs[0])
    p.inputs["Emission Color"].default_value = (0.25, 0.9, 1.0, 1)
    nt.links.new(st.outputs[0], p.inputs["Emission Strength"])
    # lamellar myelin texture
    tc = L._n(nt, "ShaderNodeTexCoord")
    nz = L._n(nt, "ShaderNodeTexNoise", **{"Scale": 120.0, "Detail": 5.0})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    L._bump_chain(nt, p, [(nz.outputs["Fac"], 0.12)], distance=0.002)
    L.fog_wrap(m)
    return m


def make_bouton_mat(t_junc):
    m, nt, p = L.mat_wet_tissue("Bouton", base=(0.7, 0.62, 0.5), sss_radius=(1, 0.8, 0.6), sss_scale=0.01,
                                rough=0.35, coat=0.8, coat_rough=0.08)
    tv = L.time_value(nt)
    d = L._n(nt, "ShaderNodeMath"); d.operation = "SUBTRACT"; d.inputs[1].default_value = t_junc
    nt.links.new(tv.outputs[0], d.inputs[0])
    on = L._n(nt, "ShaderNodeMath"); on.operation = "GREATER_THAN"; nt.links.new(d.outputs[0], on.inputs[0])
    dd = L._n(nt, "ShaderNodeMath"); dd.operation = "DIVIDE"; dd.inputs[1].default_value = -0.35
    nt.links.new(d.outputs[0], dd.inputs[0])
    ex = L._n(nt, "ShaderNodeMath"); ex.operation = "EXPONENT"; nt.links.new(dd.outputs[0], ex.inputs[0])
    mm = L._n(nt, "ShaderNodeMath"); mm.operation = "MULTIPLY"
    nt.links.new(on.outputs[0], mm.inputs[0]); nt.links.new(ex.outputs[0], mm.inputs[1])
    s = L._n(nt, "ShaderNodeMath"); s.operation = "MULTIPLY"; s.inputs[1].default_value = 10.0
    nt.links.new(mm.outputs[0], s.inputs[0])
    p.inputs["Emission Color"].default_value = (0.3, 0.95, 1.0, 1)
    nt.links.new(s.outputs[0], p.inputs["Emission Strength"])
    L.fog_wrap(m)
    return m


# --------------------------------------------------------------------------- interior of the hero fibre


def build_interior(rng, ctx):
    """Myofibrils (vertical in frame after the camera roll), rows of mitochondria between them at
    the I-bands, SR/T-tubule rings at the Z-lines, glycogen granules; a clear pocket around the
    probe path; three hero mitochondria with real cristae at the end of the pocket."""
    import lib_s7 as L
    import bmesh as B
    x0 = HERO_C.x - R_F + 0.004
    m_myo = L.mat_muscle("Myofibril")
    # myofibrils: hex lattice in the X-Z plane (axis Y), only inside the fibre near the entry
    sp = 0.026
    bm = B.new()
    pocket_c = Vector((0, DIVE_Y, -0.02))
    count = 0
    for a in range(-10, 11):
        for b in range(-10, 11):
            x = HERO_C.x + a * sp + b * sp * 0.5
            z = HERO_C.z + b * sp * 0.866
            if (Vector((x, 0, z)) - Vector((HERO_C.x, 0, HERO_C.z))).length > R_F * 0.82:
                continue
            if x > HERO_C.x + 0.05:
                continue
            # keep a narrow pocket for the probe between the membrane and the hero mitochondrion
            if abs(z - pocket_c.z) < 0.014 and x < HERO_C.x + 0.03:
                continue
            r = rng.uniform(0.0065, 0.0085)
            res = B.ops.create_cone(bm, cap_ends=False, segments=14, radius1=r, radius2=r, depth=0.9)
            for v in res["verts"]:
                v.co = Vector((v.co.x + x, v.co.z + DIVE_Y, v.co.y + z))
            count += 1
    me = bpy.data.meshes.new("myofibrils")
    B.ops.subdivide_edges(bm, edges=[e for e in bm.edges if abs(e.verts[0].co.y - e.verts[1].co.y) > 0.5], cuts=40)
    bm.to_mesh(me); bm.free()
    for pz in me.polygons:
        pz.use_smooth = True
    o = L.obj_from_mesh("myofibrils", me, m_myo)
    L.store_rest(o)
    # mitochondria rows at the I-bands
    m_mito = L.mat_mito(fog=None)
    L.fog_wrap(m_mito)
    mito_meshes = [L.mito_mesh(f"mito{k}", length=rng.uniform(0.022, 0.034), width=rng.uniform(0.009, 0.012), seed=k)
                   for k in range(6)]
    for mm in mito_meshes:
        mm.materials.append(m_mito)
    n = 0
    for a in range(-14, 15):
        for b in range(-14, 15):
            x = HERO_C.x + a * sp + b * sp * 0.5 + sp * 0.5
            z = HERO_C.z + b * sp * 0.866 + sp * 0.29
            if (Vector((x, 0, z)) - Vector((HERO_C.x, 0, HERO_C.z))).length > R_F * 0.8 or x > HERO_C.x + 0.05:
                continue
            if abs(z - pocket_c.z) < 0.02 and x < HERO_C.x + 0.01:
                continue
            if abs(z - pocket_c.z) > 0.16 or x < HERO_C.x - 0.2:
                continue                                  # beyond the haze: never seen
            for yy in range(-6, 7):
                if rng.random() < 0.55:
                    continue
                y = DIVE_Y + yy * 0.025 + rng.uniform(-0.003, 0.003)
                rot = (rng.uniform(-0.25, 0.25), rng.uniform(0, 6.28), rng.uniform(-0.25, 0.25))
                L.mito_assembly(f"mito_{n:04d}", (x, y, z), rot, variant=n % 5,
                                length=0.022 + 0.003 * (n % 5), width=0.0095 + 0.0006 * (n % 3))
                n += 1
    # hero mitochondria with cristae at the end of the pocket
    hero_pos = [Vector((HERO_C.x - 0.0105, DIVE_Y + 0.004, -0.02)), Vector((HERO_C.x - 0.006, DIVE_Y + 0.034, -0.002)),
                Vector((HERO_C.x - 0.004, DIVE_Y - 0.03, -0.035))]
    build_sr(rng, pocket_c, sp)
    m_out = L.mat_mito_outer()
    m_cr = L.mat_mito("MitoInner", strength=3.5)
    for i, hp in enumerate(hero_pos):
        ln, wd = (0.034, 0.0135) if i == 0 else (0.028, 0.011)
        ob = L.mito_assembly(f"heroMito{i}", tuple(hp), (0.0, 0.15 * i, 0.05 * i), variant=10 + i, length=ln, width=wd)
        if i == 0:
            t = C.empty("TRK_mito"); t.parent = ob
            gl = C.point_light("mitoGlow", loc=tuple(hp + Vector((-0.012, 0, 0))), power=0.012, radius=0.006, kelvin_k=2600)
            gl.data.specular_factor = 0.0; gl.visible_camera = False; gl.visible_glossy = False
    # glycogen granules / ribosome specks in the pocket
    bmg = B.new()
    for k in range(700):
        p = Vector((rng.uniform(x0, HERO_C.x), DIVE_Y + rng.uniform(-0.12, 0.12), rng.uniform(-0.09, 0.05)))
        if abs(p.y - DIVE_Y) < 0.03 and abs(p.z + 0.02) < 0.03:
            continue
        r = B.ops.create_icosphere(bmg, subdivisions=2, radius=rng.uniform(0.0003, 0.0007))
        B.ops.translate(bmg, vec=p, verts=r["verts"])
    me = bpy.data.meshes.new("granules"); bmg.to_mesh(me); bmg.free()
    m_gr = L.mat_wet_tissue("Granule", base=(0.25, 0.16, 0.12), rough=0.3, coat=0.0, sss_scale=0.001)[0]
    L.fog_wrap(m_gr)
    L.obj_from_mesh("granules", me, m_gr)




def build_capillaries(rng, frames, times):
    """Two capillaries in the grooves between fibres, translucent walls, RBCs squeezing through in
    single file (callback to sh06)."""
    m_cap = L.mat_wet_tissue("CapWall", base=(0.55, 0.22, 0.2), sss_radius=(1, 0.4, 0.3), sss_scale=0.01,
                             rough=0.35, coat=0.6, coat_rough=0.12)[0]
    for n_ in m_cap.node_tree.nodes:
        if n_.type == "BSDF_PRINCIPLED":
            n_.inputs["Alpha"].default_value = 0.4
    L.fog_wrap(m_cap)
    m_rbc = L.mat_rbc("RBC_cap", D=0.056)
    paths = [(HERO_C.x - R_F * 0.72, HERO_C.z + R_F * 0.72 + 0.03), (-0.24, -0.16)]
    rbc_me = L.rbc_mesh("rbcCap", D=0.056, seed=3, cup=0.6, wobble=0.03, seg=32, nprof=12)
    rbc_me.materials.append(m_rbc)
    for ci, (cx, cz) in enumerate(paths):
        pts = [Vector((cx + 0.012 * math.sin(y * 1.7 + ci), y, cz + 0.012 * math.cos(y * 1.3 + ci))) for y in
               [-2.0 + 8.0 * k / 299 for k in range(300)]]
        me, _ = L.path_tube(f"cap{ci}", pts, lambda s_, i: 0.034, nu=24, store_s=False)
        L.obj_from_mesh(f"capillary{ci}", me, m_cap)
        for k in range(26):
            y0 = -0.5 + k * 0.17 + rng.uniform(-0.03, 0.03)
            o = L.obj_from_mesh(f"capRBC{ci}_{k}", rbc_me)
            loc = []
            for t in times:
                y = y0 + 0.12 * (t - times[0])
                loc.append((cx + 0.012 * math.sin(y * 1.7 + ci), y, cz + 0.012 * math.cos(y * 1.3 + ci)))
            L.bake(o, frames, "location", loc)
            o.rotation_euler = (math.radians(90) + rng.uniform(-0.2, 0.2), rng.uniform(-0.2, 0.2), rng.uniform(0, 6.28))


def build_sr(rng, pocket_c, sp):
    """Sarcoplasmic reticulum: lacy translucent tubules - rings (triads) around the myofibrils at
    each Z-line plus wavy longitudinal tubules between rings, near the probe's pocket."""
    import bmesh as B
    bm = B.new()
    for a in range(-6, 7):
        for b in range(-6, 7):
            x = HERO_C.x + a * sp + b * sp * 0.5
            z = HERO_C.z + b * sp * 0.866
            if abs(z - pocket_c.z) < 0.03 and x < HERO_C.x + 0.03:
                continue
            if rng.random() < 0.35:
                continue
            if (Vector((x, 0, z)) - pocket_c * Vector((0, 0, 1)) - Vector((HERO_C.x - 0.06, 0, 0))).length > 0.17:
                continue
            for k in range(-5, 6):
                y = DIVE_Y + k * 0.04 + rng.uniform(-0.002, 0.002)
                if rng.random() < 0.3:
                    continue
                r = B.ops.create_circle(bm, segments=16, radius=0.0102)
                for v in r["verts"]:
                    v.co = Vector((x + v.co.x * rng.uniform(0.9, 1.1), y + rng.uniform(-0.0015, 0.0015), z + v.co.y * rng.uniform(0.9, 1.1)))
                if rng.random() < 0.6:
                    ang = rng.uniform(0, 6.28)
                    p0 = Vector((x + 0.0105 * math.cos(ang), y, z + 0.0105 * math.sin(ang)))
                    v_prev = bm.verts.new(p0)
                    for j in range(1, 9):
                        pj = p0 + Vector((0.0015 * math.sin(j * 1.3 + ang), 0.04 * j / 8, 0.0015 * math.cos(j * 1.1)))
                        vj = bm.verts.new(pj); bm.edges.new((v_prev, vj)); v_prev = vj
    me = bpy.data.meshes.new("SR"); bm.to_mesh(me); bm.free()
    o = L.obj_from_mesh("SR", me)
    # edges -> tubes via skin-like geometry nodes: curve conversion with a circle profile
    g = bpy.data.node_groups.new("S7_Tubes", "GeometryNodeTree"); g.is_modifier = True
    g.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    g.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    gi = g.nodes.new("NodeGroupInput"); go = g.nodes.new("NodeGroupOutput")
    m2c = g.nodes.new("GeometryNodeMeshToCurve")
    cc = g.nodes.new("GeometryNodeCurvePrimitiveCircle"); cc.inputs["Resolution"].default_value = 6
    cc.inputs["Radius"].default_value = 0.0006
    c2m = g.nodes.new("GeometryNodeCurveToMesh")
    sm = g.nodes.new("GeometryNodeSetMaterial")
    m_sr = L.mat_wet_tissue("SR", base=(0.6, 0.75, 0.72), sss_radius=(0.8, 1, 1), sss_scale=0.002, rough=0.3,
                            coat=0.6, coat_rough=0.1)[0]
    for n_ in m_sr.node_tree.nodes:
        if n_.type == "BSDF_PRINCIPLED":
            n_.inputs["Alpha"].default_value = 0.3
    L.fog_wrap(m_sr)
    sm.inputs["Material"].default_value = m_sr
    g.links.new(gi.outputs[0], m2c.inputs["Mesh"]); g.links.new(m2c.outputs[0], c2m.inputs["Curve"])
    g.links.new(cc.outputs["Curve"], c2m.inputs["Profile Curve"]); g.links.new(c2m.outputs[0], sm.inputs["Geometry"])
    g.links.new(sm.outputs[0], go.inputs[0])
    md = o.modifiers.new("tubes", "NODES"); md.node_group = g


C.run("sh09", build)
