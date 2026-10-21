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
import zlib

FOG_OUT = dict(color=(0.045, 0.012, 0.010), dist=1.6, strength=1.0, power=1.1)
HERO_C = Vector((0.47, 0.0, 0.0))      # hero fibre axis (x, -, z)
R_F = 0.22
J_Y = 2.75                             # junction position along the hero fibre
DIVE_Y = 1.86                          # where the probe enters the hero fibre



# measured on 25 % luma strips (v6): exposure trims (stops) through the membrane crossing so the
# dark film -> bright interior reads as one smooth curve, <= 15 % change per frame
EXPO_TRIM = {1175: 0.22, 1183: 0.22, 1184: 0.58, 1185: 0.75, 1186: 0.85, 1187: 0.49, 1188: 0.33, 1189: 0.2,
             1190: 0.1, 1191: 0.05}

def build(ctx):
    rng = random.Random(909)
    sc = bpy.context.scene
    t_kas = ctx.word("kaslarda")
    t_huc = ctx.word("hücrelerde")
    frames = list(range(ctx.f0 - 3, ctx.f1 + 3))
    times = [f / C.FPS for f in frames]
    t_imp0 = t_kas - 0.07                  # impulse starts just before the word
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
            wm = L.tube_mesh(f"web_{o.name}", radius=R_F + 0.014, y0=-3, y1=7, nu=64, nv=160, seed=zlib.crc32(o.name.encode()) % 97,
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
    NZ = -0.20                                # nerve runs along the lower flank of the hero fibre (>=0.15 off the dive)
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
    # the impulse starts at the first node of Ranvier that is actually in frame at t_imp0
    u_ = C.remap(t_imp0, ctx.t0 - 0.3, t_huc - 0.3, lambda x: x * 0.25 + 0.75 * C.smooth(x))
    cp_ = Vector((0.0, -0.35, 0.06)).lerp(Vector((0.03, 1.05, 0.02)), u_)
    cq_ = Euler((math.radians(82), 0, math.radians(-14))).to_matrix().inverted()
    s_start = 0.0
    for kk in range(1, int(s_end / internode)):
        sn = kk * internode
        pt = dense[min(range(len(s_acc)), key=lambda i: abs(s_acc[i] - sn))]
        d_ = cq_ @ (pt - cp_)
        if d_.z < -0.05 and abs(d_.x / -d_.z) < 0.27 and abs(d_.y / -d_.z) < 0.49:
            s_start = sn - 0.02
            break
    print(f"[sh09] impulse starts at s={s_start:.2f} (first in-frame node)")
    m_nerve = make_nerve_mat(internode, t_imp0, s_end, t_junc, s_start)
    nerve = L.obj_from_mesh("nerve", nme, m_nerve)
    # thin translucent connective sheath around the axon
    sme, _ = L.path_tube("nerveSheath", dense, lambda s_, i: nerve_r(s_, i) * 0.4 + 0.034, nu=28, store_s=False)
    L.obj_from_mesh("nerveSheath", sme, L.mat_web("Perineurium", alpha_max=0.4, stretch=(60, 4, 60)))
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
        s = s_start + (t - t_imp0) / (t_junc - t_imp0) * (s_end - s_start)
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

    # ---------------------------------------------------------------- inside the hero fibre (shared with sh10)
    exterior = set(o for o in bpy.data.objects if o.type == "MESH")
    hero_fibre = [o for o, c, h in fibres if h][0]
    # ray-cast the real sarcolemma (the fibre is polygonal/noisy, not a perfect cylinder)
    org = Vector((HERO_C.x - 0.6, DIVE_Y, -0.02)) - hero_fibre.location
    hit, loc_, nrm_, _ = hero_fibre.ray_cast(org, Vector((1, 0, 0)))
    x_mem = (loc_ + hero_fibre.location).x if hit else HERO_C.x - R_F
    print(f"[sh09] sarcolemma at x={x_mem:.3f}")
    HO = L.INTERIOR_HANDOFF
    H = Vector((HERO_C.x - 0.0105, DIVE_Y, -0.02))           # hero mitochondrion (interior origin)
    wave = dict(t0=ctx.word("olup") - 0.05, speed=0.09, origin=H - Vector((0, 0.03, 0)), axis=(0, 1, 0), width=0.014, gain=7.0)
    inter = L.build_fibre_interior("interiorRoot", Matrix.Translation(H), fibre_c=HO["fibre_c"], fibre_r=HO["fibre_r"],
                                   y_half=HO["y_half"], seed=909, cristae_wave=wave)
    interior = inter["objects"]
    print(f"[sh09] interior: {inter['fibrils']} myofibrils, {inter['mitos']} mitochondria")

    # ---------------------------------------------------------------- camera
    cam = C.camera("cam", lens=35, loc=(0, -0.4, 0), fstop=5.0, focus=0.6, clip_start=0.002, clip_end=40)
    cam.data.dof.aperture_blades = 0
    keys_loc, keys_rot, foc, fst = [], [], [], []
    prev_e = None
    # camera rig: forward glide along the channel, curving turn to face the hero fibre, a slow
    # push while its sarcolemma turns translucent, crossing at 49.45, then a creep that ends on the
    # hand-off pose (hero mitochondrion at ~(535, 842) px) on the last frame
    t_cross = 49.45
    p_a = Vector((0.0, -0.35, 0.06))
    p_b = Vector((0.03, 1.05, 0.02))
    p_c = Vector((x_mem - 0.12, DIVE_Y + HO["cam_local"][1], -0.02))
    p_x = Vector((x_mem, DIVE_Y + HO["cam_local"][1], -0.02))
    t_a, t_b = ctx.t0 - 0.3, t_huc - 0.3          # longer, gentler turn (<=15 %/frame luma change)
    t_c = t_huc + 0.42
    t_e = ctx.t1 + 0.25
    creep = lambda x: 1 - (1 - min(1.0, x)) ** 2.2
    # the creep passes EXACTLY through the hand-off pose at frame 1250 (sh10 starts there)
    u0 = creep((1250 / C.FPS - t_cross) / (t_e - t_cross))
    p_e = p_x + (H + Vector(HO["cam_local"]) - p_x) / u0
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
            c1 = p_b + Vector((0, 0.45, 0))
            c2 = p_c - Vector((0.2, 0, 0))
            p = (1 - u) ** 3 * p_b + 3 * (1 - u) ** 2 * u * c1 + 3 * (1 - u) * u * u * c2 + u ** 3 * p_c
            q = q_fwd.slerp(q_side, C.smooth(u))
        elif t < t_cross:
            u = C.remap(t, t_c, t_cross, lambda x: x * (2 - x) * 0.5 + x * 0.5)
            p = p_c.lerp(p_x, u)
            q = q_side
        else:
            u = C.remap(t, t_cross, t_e, creep)
            p = p_x.lerp(p_e, u)
            q = q_side
        e = q.to_euler("XYZ", prev_e) if prev_e else q.to_euler("XYZ")
        prev_e = e
        keys_loc.append(tuple(p)); keys_rot.append(tuple(e))
        # focus: down the channel, then the sarcolemma, then the hero mito's near envelope
        if t < t_c:
            fd = C.lerp(0.9, 0.12, C.remap(t, t_b, t_c))
        elif t < t_cross:
            fd = C.lerp(max(0.02, x_mem - p.x), (H.x - 0.0035) - p.x, C.remap(t, t_cross - 0.2, t_cross, C.smooth))
        else:
            fd = max(0.012, (H.x - 0.0035) - p.x) if t < 1250 / C.FPS - 0.3 else (H.x - 0.0035) - p.x
        foc.append(max(0.012, fd))
        fst.append(C.lerp(5.0, 9.0, C.remap(t, t_c, t_cross)) if t < t_cross else
                   C.lerp(9.0, HO["fstop"], C.remap(t, t_cross, t_cross + 1.2, C.smooth)))
    L.bake(cam, frames, "location", keys_loc)
    L.bake(cam, frames, "rotation_euler", keys_rot)
    L.bake_id(cam.data, frames, "dof.focus_distance", foc)
    L.bake_id(cam.data, frames, "dof.aperture_fstop", fst)
    C.handheld(cam, **HO["handheld"])

    # sarcolemma turns translucent near the dive point (glycocalyx bump + fresnel rim kept)
    fade_hero_membrane(m_mus_hero, t_huc - 0.1, t_huc + 0.35)

    # interior exists from t_huc-0.15 (seen through the translucent membrane); exterior tissue
    # disappears once we are inside (behind the haze)
    f_in = C.t2f(t_huc - 0.15); f_out = C.t2f(t_cross + 0.25)
    for o in interior:
        L.bake(o, [frames[0], f_in], "hide_render", [1.0, 0.0], interp="CONSTANT")
    for o in exterior:
        L.bake(o, [frames[0], f_out], "hide_render", [0.0, 1.0], interp="CONSTANT")

    # haze: salmon (sh08 skin push) -> warm red-brown tissue -> rosy interior haze; exposure eases
    # from the bright skin cut down to the hand-off value. Smooth (<=15 %/frame).
    fd_, fc_, ex_ = [], [], []
    for t in times:
        u = C.remap(t, t_huc - 0.1, t_cross + 0.3, C.smooth)
        fd_.append(C.lerp(1.6, HO["fog_dist"], u))
        col = C.lerp((0.30, 0.09, 0.05), (0.045, 0.014, 0.012), C.remap(t, ctx.t0 - 0.25, 47.95, C.smooth))
        col = C.lerp(col, HO["fog_color"], u)
        fc_.append(col)
        ex_.append(C.lerp(0.9, HO["exposure"], C.remap(t, ctx.t0 - 0.25, 47.95, C.smooth)))
    L.bake_id(fg, frames, 'nodes["dist"].outputs[0].default_value', fd_)
    L.bake_id(fg, frames, 'nodes["color"].outputs[0].default_value', [(*c, 1.0) for c in fc_])
    w_ = sc.world.node_tree
    bg = [n for n in w_.nodes if n.type == "BACKGROUND"][0]
    L.bake_id(w_, frames, f'nodes["{bg.name}"].inputs[0].default_value', [(*c, 1.0) for c in fc_])
    L.bake_id(sc, frames, "view_settings.exposure", [x + EXPO_TRIM.get(f, 0.0) for x, f in zip(ex_, frames)])

    # trackers: on screen only inside their callout windows (outside: parked far behind the lens)
    t_mito = C.empty("TRK_mito"); t_mito.parent = inter["hero"]
    for e_, (w0, w1) in ((trk_n, (ctx.t0 - 1, 1165.5 / C.FPS)), (trk_f, (48.45, 1171.5 / C.FPS)), (t_mito, (49.9, ctx.t1 + 1))):
        base = tuple(e_.location)
        locs = []
        for f in frames:
            t = f / C.FPS
            locs.append(base if w0 <= t <= w1 else (base[0], base[1] - 500.0, base[2] - 500.0))
        L.bake(e_, frames, "location", locs, interp="CONSTANT")

    # ---------------------------------------------------------------- lights
    # key close to the lens so it can never swing into a fibre during the turn (no light pops)
    key = C.area("key_amber", size=0.12, power=0.8, kelvin_k=3300)
    key.parent = cam; key.location = (-0.05, 0.07, 0.01); key.rotation_euler = (math.radians(-20), math.radians(-20), 0)
    for i, (p, pw, col) in enumerate(((Vector((0.1, 2.8, 0.45)), 9.0, (0.3, 0.85, 1.0)),
                                      (Vector((-0.35, 4.2, -0.3)), 14.0, (0.35, 0.9, 1.0)),
                                      (Vector((0.25, 1.2, -0.35)), 3.0, (1.0, 0.55, 0.25)))):
        pl = C.point_light(f"rim{i}", loc=tuple(p), power=pw, radius=0.15)
        pl.data.color = col; pl.visible_camera = False
        pl.data.specular_factor = 0.0       # rims light the SSS, no hard blob reflections
        pl.visible_glossy = False
        L.bake_id(pl.data, frames, "energy", [C.lerp(pw, 0.0, C.remap(t, t_cross - 0.1, t_cross + 0.4, C.smooth)) for t in times])
    # soft interior light carried by the probe (switched on as we enter)
    PR = HO["probe"]
    il = C.point_light("probe_in", loc=(0, 0, 0), power=0.0, radius=PR["radius"], kelvin_k=4500)
    il.parent = cam; il.location = PR["offset"]
    il.data.specular_factor = 0.0
    il.data.color = PR["color"]
    L.bake_id(il.data, frames, "energy", [C.lerp(0.0, PR["energy"], C.remap(t, t_cross - 0.45, t_cross + 0.35, C.smooth)) for t in times])
    L.bake_id(key.data, frames, "energy", [C.lerp(0.8, 0.0, C.remap(t, t_c - 0.3, t_cross - 0.05, C.smooth)) for t in times])

    sc.world.light_settings.distance = 0.2
    L.budget_denoise(prefilter="ACCURATE", quality="BALANCED", final_res=80)
    ov = dict(L.LEAN)
    ov.update(transmission_bounces=3, transparent_bounces=8, final_spp=8, preview_spp=12)
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


def make_nerve_mat(internode, t_imp0, s_end, t_junc, s_start=0.0):
    """Myelin: glossy creamy-white lamellar sheath (SSS). Impulse: teal emission at the nodes of Ranvier
    lighting one after another (saltatory), with a faint glow travelling along the axon in between."""
    m, nt, p = L.mat_wet_tissue("Myelin", base=(0.66, 0.58, 0.52), sss_radius=(1.0, 0.85, 0.7), sss_scale=0.07,
                                rough=0.62, coat=0.12, coat_rough=0.3)
    p.inputs["Sheen Weight"].default_value = 0.45
    p.inputs["Sheen Roughness"].default_value = 0.45
    tcx = L._n(nt, "ShaderNodeTexCoord")
    nzx = L._n(nt, "ShaderNodeTexNoise", **{"Scale": 35.0, "Detail": 5.0, "Roughness": 0.6})
    nt.links.new(tcx.outputs["Object"], nzx.inputs["Vector"])
    vcx = L._n(nt, "ShaderNodeValToRGB")
    vcx.color_ramp.elements[0].color = (0.55, 0.47, 0.43, 1); vcx.color_ramp.elements[1].color = (0.72, 0.64, 0.56, 1)
    nt.links.new(nzx.outputs["Fac"], vcx.inputs[0]); nt.links.new(vcx.outputs[0], p.inputs["Base Color"])
    at = L._n(nt, "ShaderNodeAttribute"); at.attribute_name = "s"
    tv = L.time_value(nt)
    # front position S(t)
    f1 = L._n(nt, "ShaderNodeMath"); f1.operation = "SUBTRACT"; f1.inputs[1].default_value = t_imp0
    nt.links.new(tv.outputs[0], f1.inputs[0])
    S = L._n(nt, "ShaderNodeMath"); S.operation = "MULTIPLY_ADD"; S.inputs[1].default_value = (s_end - s_start) / (t_junc - t_imp0)
    S.inputs[2].default_value = s_start
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
    st = L._n(nt, "ShaderNodeMath"); st.operation = "MULTIPLY"; st.inputs[1].default_value = 10.0
    nt.links.new(tot.outputs[0], st.inputs[0])
    p.inputs["Emission Color"].default_value = (0.25, 0.9, 1.0, 1)
    nt.links.new(st.outputs[0], p.inputs["Emission Strength"])
    # lamellar myelin texture
    tc = L._n(nt, "ShaderNodeTexCoord")
    nz = L._n(nt, "ShaderNodeTexNoise", **{"Scale": 120.0, "Detail": 5.0})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    L._bump_chain(nt, p, [(nzx.outputs["Fac"], 0.3), (nz.outputs["Fac"], 0.18)], distance=0.003)
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


def fade_hero_membrane(m, t0, t1):
    """Alpha 1 -> 0.25 over [t0, t1] within ~0.35 of DIVE_Y along the fibre; a fresnel rim stays
    opaque so the sarcolemma still reads as a surface while we look through it."""
    nt = m.node_tree
    p = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]
    at = L._n(nt, "ShaderNodeAttribute"); at.attribute_name = "rest"
    sep = L._n(nt, "ShaderNodeSeparateXYZ"); nt.links.new(at.outputs["Vector"], sep.inputs[0])
    dy = L._n(nt, "ShaderNodeMath"); dy.operation = "SUBTRACT"; dy.inputs[1].default_value = DIVE_Y
    nt.links.new(sep.outputs["Y"], dy.inputs[0])
    ady = L._n(nt, "ShaderNodeMath"); ady.operation = "ABSOLUTE"; nt.links.new(dy.outputs[0], ady.inputs[0])
    mask = L._n(nt, "ShaderNodeMapRange"); mask.interpolation_type = "SMOOTHSTEP"
    mask.inputs["From Min"].default_value = 0.2; mask.inputs["From Max"].default_value = 0.4
    mask.inputs["To Min"].default_value = 1.0; mask.inputs["To Max"].default_value = 0.0
    nt.links.new(ady.outputs[0], mask.inputs["Value"])
    tv = L.time_value(nt)
    k = L._n(nt, "ShaderNodeMapRange"); k.interpolation_type = "SMOOTHSTEP"
    k.inputs["From Min"].default_value = t0; k.inputs["From Max"].default_value = t1
    nt.links.new(tv.outputs[0], k.inputs["Value"])
    km = L._n(nt, "ShaderNodeMath"); km.operation = "MULTIPLY"
    nt.links.new(k.outputs[0], km.inputs[0]); nt.links.new(mask.outputs[0], km.inputs[1])
    al = L._n(nt, "ShaderNodeMath"); al.operation = "MULTIPLY_ADD"; al.inputs[1].default_value = -0.75
    al.inputs[2].default_value = 1.0; nt.links.new(km.outputs[0], al.inputs[0])
    lw = L._n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.25
    rim = L._n(nt, "ShaderNodeMath"); rim.operation = "POWER"; rim.inputs[1].default_value = 2.0
    nt.links.new(lw.outputs["Facing"], rim.inputs[0])
    mx = L._n(nt, "ShaderNodeMath"); mx.operation = "MAXIMUM"
    nt.links.new(al.outputs[0], mx.inputs[0]); nt.links.new(rim.outputs[0], mx.inputs[1])
    cd = L._n(nt, "ShaderNodeCameraData")
    near = L._n(nt, "ShaderNodeMapRange"); near.interpolation_type = "SMOOTHSTEP"
    near.inputs["From Min"].default_value = 0.006; near.inputs["From Max"].default_value = 0.08
    nt.links.new(cd.outputs["View Distance"], near.inputs["Value"])
    nm = L._n(nt, "ShaderNodeMath"); nm.operation = "MULTIPLY"
    nt.links.new(mx.outputs[0], nm.inputs[0]); nt.links.new(near.outputs[0], nm.inputs[1])
    nt.links.new(nm.outputs[0], p.inputs["Alpha"])


C.run("sh09", build)
