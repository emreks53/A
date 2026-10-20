"""sh06 - inside a blood vessel (30.10-35.70 s).

Scale: 1 m = 100 um (see lib_s7). Arteriole lumen radius 0.30 (60 um diameter). Flow is toward -Y;
the camera rides the current looking upstream (+Y), so cells come at the lens. A hero erythrocyte
starts face-on at frame centre (shape match from sh05's O2 bubble), approaches, then floats ahead
of the probe tumbling slowly while the pulse (72 bpm, strongest beat on "kan") surges everything
toward the lens. Exit: a dense bolus of cells floods the lens -> red wipe.
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from mathutils import Vector, Euler, Quaternion, Matrix
import common as C
import lib_s7 as L

R_LUMEN = 0.30
FOG = dict(color=(0.075, 0.0055, 0.004), dist=1.05, strength=1.0, power=1.2)


def build(ctx):
    rng = random.Random(606)
    sc = bpy.context.scene
    t_kan = ctx.word("kan")
    beat0 = t_kan - 0.05                     # systolic peak lands ~1 frame before the word
    period = 60.0 / 72.0
    frames = list(range(ctx.f0 - 3, ctx.f1 + 3))
    times = [f / C.FPS for f in frames]
    dt = 1.0 / C.FPS

    def vmax(t):
        return 1.15 * (0.42 + 0.58 * L.heartbeat(t, beat0, period, big=t_kan, big_gain=1.9))

    def vprof(r):
        return 1.0 - 0.88 * (r / R_LUMEN) ** 2

    C.world_color(FOG["color"], 1.0)
    L.fog_group(**FOG)

    # ---------------------------------------------------------------- vessel wall
    def bend(y):
        return (0.03 * math.sin(y * 0.23 + 0.4), 0.035 * math.sin(y * 0.17 + 1.3))
    wall_me = L.tube_mesh("lumen", radius=R_LUMEN + 0.02, y0=-12, y1=8, nu=192, nv=800, amp=0.07, bend=bend)
    L.tube_uv(wall_me, 192, 800, u_rep=1.0, v_len=4.0, y0=-12, y1=8)
    wall = L.obj_from_mesh("Lumen", wall_me, L.mat_endothelium_fast())

    # ---------------------------------------------------------------- hero cell + camera path
    hero_r = 0.07
    hero_phi = math.radians(250)
    y_h = 0.0
    hero_y, cam_pos = [], []
    for t in times:
        # distance hero->lens: approach, then float ahead, with beat-driven lurches
        d = C.lerp(0.50, 0.25, C.remap(t, ctx.t0 - 0.1, ctx.t0 + 1.0))
        d -= 0.035 * (L.heartbeat(t, beat0 + 0.04, period, big=t_kan, big_gain=2.0) - 0.35) * C.remap(t, ctx.t0 + 0.4, ctx.t0 + 1.0, C.smooth)
        hero_y.append(None); cam_pos.append(d)
    # integrate hero along the flow
    ys = []
    for t in times:
        ys.append(y_h)
        y_h -= vmax(t) * vprof(hero_r) * dt
    # lateral: hero drifts from the optical axis (frame centre) down/left into the lower frame
    cam_off = Vector((-0.03, 0, -0.015))      # probe sits off-axis toward the lower-left wall
    hero_pts, cam_pts, cam_rot, focus_d = [], [], [], []
    for i, t in enumerate(times):
        d = cam_pos[i]
        cy = ys[i] - d
        bx, bz = bend(cy)
        cpos = Vector((bx + cam_off.x, cy, bz + cam_off.z))
        k = C.remap(t, ctx.t0 + 0.15, ctx.t0 + 1.6)
        hx = C.lerp(cpos.x, cpos.x + 0.012, k)
        hz = C.lerp(cpos.z, cpos.z - 0.055, k)
        hb = bend(ys[i])
        hero_pts.append(Vector((hx, ys[i], hz)))
        # camera pitch: from level (hero centred) to ~8 deg down so the dark vanishing point sits
        # in the key-word band (y 520-820) while "KAN" is on screen
        pitch = C.lerp(0.0, -8.5, C.remap(t, ctx.t0 + 0.2, ctx.t0 + 1.3))
        yaw = C.lerp(0.0, 2.0, C.remap(t, ctx.t0, ctx.t1))
        cam_pts.append(cpos)
        cam_rot.append((math.radians(90 + pitch), 0.0, math.radians(yaw)))
        focus_d.append(d)
    cam = C.camera("cam", lens=35, loc=cam_pts[0], fstop=4.5, focus=0.3, clip_start=0.005, clip_end=60)
    cam.data.dof.aperture_blades = 0
    L.bake(cam, frames, "location", [tuple(p) for p in cam_pts])
    L.bake(cam, frames, "rotation_euler", cam_rot)
    L.bake_id(cam.data, frames, "dof.focus_distance", focus_d)
    C.handheld(cam, amp_loc=0.0012, amp_rot=0.004, speed=0.6, seed=6)

    # ---------------------------------------------------------------- materials / meshes
    m_rbc = L.mat_rbc(fog=FOG)
    variants = [L.rbc_mesh(f"rbc{k}", D=rng.uniform(0.074, 0.082), seed=k, cup=rng.choice([0, 0, 0.15, -0.12, 0.3]),
                           wobble=rng.uniform(0.02, 0.06)) for k in range(8)]
    for me in variants:
        me.materials.append(m_rbc)

    def tumble_rots(seed, w0, spin, n):
        r = random.Random(seed)
        q = Euler((r.uniform(0, 6.3), r.uniform(0, 6.3), r.uniform(0, 6.3))).to_quaternion()
        ax = Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-1, 1))).normalized()
        out, prev = [], None
        for i in range(n):
            t = times[i]
            w = w0 * (1 + 0.8 * (L.heartbeat(t, beat0, period) - 0.3)) + spin
            q = Quaternion(ax, w * dt) @ q
            ax = (ax + Vector((r.gauss(0, 0.02), r.gauss(0, 0.02), r.gauss(0, 0.02)))).normalized()
            e = q.to_euler("XYZ", prev) if prev else q.to_euler("XYZ")
            prev = e
            out.append(tuple(e))
        return out

    hero = L.obj_from_mesh("RBC_hero", L.rbc_mesh("rbc_hero", D=0.079, seed=99, cup=0.05, wobble=0.025))
    hero.data.materials.append(m_rbc)
    L.bake(hero, frames, "location", [tuple(p) for p in hero_pts])
    hq = []
    prev = None
    for i, t in enumerate(times):
        # face-on to lens at first (disc normal along Y), then rolls to show its biconcave profile
        a = C.lerp(0.0, 1.05, C.remap(t, ctx.t0 + 0.5, ctx.t1 + 0.2, C.smooth))
        s = C.lerp(0.0, 0.9, C.remap(t, ctx.t0, ctx.t1, C.smooth))
        q = Euler((math.radians(90), 0, 0)).to_quaternion()
        q = Quaternion((0, 0, 1), s * 0.5) @ Quaternion((1, 0.2, 0), a) @ q
        e = q.to_euler("XYZ", prev) if prev else q.to_euler("XYZ")
        prev = e; hq.append(tuple(e))
    L.bake(hero, frames, "rotation_euler", hq)
    trk = C.empty("TRK_rbc"); trk.parent = hero

    # ---------------------------------------------------------------- the crowd
    n_frames = len(frames)
    cam_y = [p.y for p in cam_pts]

    def flow_track(r, phi, y_start, drift_seed):
        dr = random.Random(drift_seed)
        ph = dr.uniform(0, 6.28); fr = dr.uniform(0.2, 0.6)
        y = y_start; pts = []
        for i, t in enumerate(times):
            rr = min(R_LUMEN - 0.045, max(0.0, r + 0.012 * math.sin(fr * t + ph)))
            bx, bz = bend(y)
            pts.append(Vector((bx + rr * math.cos(phi), y, bz + rr * math.sin(phi))))
            y -= vmax(t) * vprof(rr) * dt
        return pts

    # keep the key-word band (y 480-860 px) calm while "KAN" is on screen: no near cells there
    t_band0, t_band1 = t_kan - 0.1, ctx.word("her") + 0.6
    band_idx = [i for i, t in enumerate(times) if t_band0 <= t <= t_band1][::2]
    cam_mats = [Euler(cam_rot[i]).to_matrix().transposed() for i in range(n_frames)]
    vfov = math.atan(18.0 / 35.0)

    def in_band(pts):
        for i in band_idx:
            d = cam_mats[i] @ (pts[i] - cam_pts[i])
            if d.z > -0.03 or -d.z > 1.3:
                continue
            ys = 960 - (d.y / (-d.z * math.tan(vfov))) * 960
            xs = 540 + (d.x / (-d.z * math.tan(vfov))) * 960
            if 440 < ys < 900 and -60 < xs < 1140:
                return True
        return False

    placed = []
    def ok(p0, p1, md=0.085):
        for (a0, a1) in placed:
            if (a0 - p0).length < md or (a1 - p1).length < md:
                return False
        return True

    cells = 0
    tries = 0
    while cells < 300 and tries < 20000:
        tries += 1
        r = R_LUMEN * math.sqrt(rng.uniform(0, 0.93))
        phi = rng.uniform(0, 2 * math.pi)
        y0 = rng.uniform(cam_y[0] - 0.5, cam_y[0] + 12.0)
        pts = flow_track(r, phi, y0, tries)
        rel = [pts[i].y - cam_y[i] for i in range(n_frames)]
        if max(rel) < -0.05 or min(rel) > 6.0:        # never in view
            continue
        # keep the hero's neighbourhood clear so it reads as the subject
        if min((pts[i] - hero_pts[i]).length for i in range(0, n_frames, 6)) < 0.11:
            continue
        if min((pts[i] - cam_pts[i]).length for i in range(0, 14)) < 0.22:
            continue
        if in_band(pts):
            continue
        if not ok(pts[0], pts[-1]):
            continue
        placed.append((pts[0], pts[-1]))
        o = L.obj_from_mesh(f"rbc_{cells:03d}", variants[cells % len(variants)])
        L.bake(o, frames, "location", [tuple(p) for p in pts])
        shear = 2.5 * (r / R_LUMEN)
        L.bake(o, frames, "rotation_euler", tumble_rots(cells + 7, rng.uniform(0.4, 1.6), shear, n_frames))
        cells += 1

    # far crowd: cheap low-poly cells 1.8-6 m ahead, fading into the haze (scale cue)
    far_me = [L.rbc_mesh(f"rbcfar{k}", D=rng.uniform(0.074, 0.082), seed=40 + k, seg=20, nprof=8, wobble=0.04) for k in range(3)]
    for me in far_me:
        me.materials.append(m_rbc)
    nf = 0
    tries = 0
    while nf < 420 and tries < 6000:
        tries += 1
        r = R_LUMEN * math.sqrt(rng.uniform(0, 0.9)); phi = rng.uniform(0, 2 * math.pi)
        y0 = rng.uniform(cam_y[0] + 1.8, cam_y[0] + 14.0)
        pts = flow_track(r, phi, y0, 7000 + tries)
        rel = [pts[i].y - cam_y[i] for i in range(n_frames)]
        if min(rel) < 1.6 or min(rel) > 6.5:
            continue
        o = L.obj_from_mesh(f"rbcfar_{nf:03d}", far_me[nf % 3])
        L.bake(o, frames, "location", [tuple(p) for p in pts])
        L.bake(o, frames, "rotation_euler", tumble_rots(9000 + nf, rng.uniform(0.4, 1.6), 1.0, n_frames))
        nf += 1

    # exit bolus: a packet of cells that reaches the lens on the last beat -> red wipe
    t_wipe = beat0 + 5 * period + 0.02
    i_w = min(range(n_frames), key=lambda i: abs(times[i] - t_wipe))
    for k in range(110):
        # spread along the stream so the packet keeps covering the lens through the dissolve tail
        tgt = rng.uniform(-0.03, 0.18) + (rng.uniform(0.0, 1.4) if k >= 46 else 0.0)
        ox, oz = rng.uniform(-0.06, 0.06), rng.uniform(-0.09, 0.07)
        # scripted relative to the probe: far upstream, then carried at the lens by the last surge
        rel = [0.0] * n_frames
        acc = tgt
        for i in range(i_w, -1, -1):
            rel[i] = acc; acc += (0.35 + 1.6 * L.heartbeat(times[i], beat0, period)) * dt
        acc = tgt
        for i in range(i_w, n_frames):
            rel[i] = acc; acc -= (0.35 + 1.6 * L.heartbeat(times[i], beat0, period)) * dt
        pts = [Vector((cam_pts[i].x + ox * (1 + 2 * max(0, rel[i])), cam_y[i] + rel[i] + 0.04, cam_pts[i].z + oz * (1 + 2 * max(0, rel[i]))))
               for i in range(n_frames)]
        o = L.obj_from_mesh(f"bolus_{k:02d}", variants[k % len(variants)])
        L.bake(o, frames, "location", [tuple(p) for p in pts])
        L.bake(o, frames, "rotation_euler", tumble_rots(500 + k, rng.uniform(1.0, 2.5), 1.0, n_frames))

    # platelets (marginated toward the wall) and one neutrophil rolling along the lower-left wall
    m_plt = L.mat_wet_tissue("Platelet", base=(0.48, 0.30, 0.17), sss_radius=(1.0, 0.6, 0.3), sss_scale=0.01,
                             rough=0.4, coat=0.5, coat_rough=0.2)[0]
    L.fog_wrap(m_plt, **FOG)
    plt_me = [L.blob_mesh(f"plt{k}", radius=0.013, sub=4, seed=40 + k, amp=0.10, freq=1.2, squash=(1, 0.8, 0.4))
              for k in range(4)]
    for me in plt_me:
        me.materials.append(m_plt)
    for k in range(24):
        r = R_LUMEN * rng.uniform(0.55, 0.9); phi = rng.uniform(0, 2 * math.pi)
        y0 = rng.uniform(cam_y[0] - 0.3, cam_y[0] + 10)
        pts = flow_track(r, phi, y0, 3000 + k)
        o = L.obj_from_mesh(f"plt_{k:02d}", plt_me[k % 4])
        L.bake(o, frames, "location", [tuple(p) for p in pts])
        L.bake(o, frames, "rotation_euler", tumble_rots(3000 + k, rng.uniform(1, 3), 0.5, n_frames))

    m_wbc = L.mat_wet_tissue("WBC", base=(0.72, 0.62, 0.56), sss_radius=(1.0, 0.75, 0.6), sss_scale=0.03,
                             rough=0.5, coat=0.6, coat_rough=0.25)[0]
    L.fog_wrap(m_wbc, **FOG)
    wbc = L.obj_from_mesh("WBC", L.blob_mesh("wbc", radius=0.058, sub=6, seed=77, amp=0.12, freq=1.4,
                                             ruffle=0.10, ruffle_freq=11.0, squash=(1, 1, 0.9)))
    wbc.data.materials.append(m_wbc)
    i32 = min(range(n_frames), key=lambda i: abs(times[i] - 32.2))
    wphi = math.radians(205)
    wr = R_LUMEN - 0.06
    wy = cam_y[i32] - 0.15 + 0.0
    wpts, wrot = [], []
    # rolling: slow, sticky, with pulse-driven nudges
    y = wy + sum(0.18 * vmax(times[i]) * dt for i in range(i32))
    ang = 0.0
    for i, t in enumerate(times):
        bx, bz = bend(y)
        wpts.append((bx + wr * math.cos(wphi), y, bz + wr * math.sin(wphi)))
        v = 0.18 * vmax(t)
        y -= v * dt
        ang += v * dt / 0.058
        wrot.append((ang, 0.3, 0.2))
    L.bake(wbc, frames, "location", wpts)
    L.bake(wbc, frames, "rotation_euler", wrot)

    # plasma motes: tiny suspended particles for parallax
    import bmesh
    m_mote = L.mat_wet_tissue("Mote", base=(0.35, 0.12, 0.08), rough=0.3, coat=0.0, sss_scale=0.002)[0]
    L.fog_wrap(m_mote, **FOG)
    for g in range(3):
        bm = bmesh.new()
        rr0, rr1 = [(0.0, 0.12), (0.12, 0.2), (0.2, 0.27)][g]
        for k in range(120):
            rr = rng.uniform(rr0, rr1); ph = rng.uniform(0, 6.28)
            c = Vector((rr * math.cos(ph), rng.uniform(-2, 12), rr * math.sin(ph)))
            m = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=rng.uniform(0.0012, 0.003))
            bmesh.ops.translate(bm, vec=c, verts=m["verts"])
        me = bpy.data.meshes.new(f"motes{g}"); bm.to_mesh(me); bm.free()
        for pz in me.polygons:
            pz.use_smooth = True
        me.materials.append(m_mote)
        o = L.obj_from_mesh(f"motes{g}", me)
        rmid = (rr0 + rr1) / 2
        y = cam_y[0] - 1.0; loc = []
        for t in times:
            loc.append((0, y, 0)); y -= vmax(t) * vprof(rmid) * dt
        L.bake(o, frames, "location", loc)

    # ---------------------------------------------------------------- light (probe light + tunnel glow)
    key = C.area("probe_key", loc=(0, 0, 0), size=0.15, power=0.4, kelvin_k=4300)
    key.parent = cam; key.location = (0.07, 0.10, 0.02); key.rotation_euler = (math.radians(-12), math.radians(10), 0)
    fill = C.area("probe_fill", loc=(0, 0, 0), size=0.12, power=0.35, kelvin_k=4200)
    fill.parent = cam; fill.location = (-0.12, -0.08, 0.03); fill.rotation_euler = (math.radians(15), math.radians(-18), 0)
    # light from the depth of the lumen: backlights the cells (glowing translucent rims) and gives
    # the space depth; kept out of glossy rays so the wet wall shows no streaky hot-spots
    for k, (dz, pw, dx) in enumerate(((0.9, 2.0, -0.05), (2.2, 5.0, 0.06), (3.6, 16.0, 0.0))):
        pl = C.point_light(f"tunnel{k}", loc=(0, 0, 0), power=pw, radius=0.12, kelvin_k=3400)
        pl.parent = cam; pl.location = (dx, 0.05 + 0.03 * k, -dz)
        pl.visible_camera = False
        pl.visible_glossy = k == 0
    sc.view_settings.exposure = 0.5

    th = L.cam_child_empty("TRK_heart", cam, (300, 1260), depth=0.6)

    sc.world.light_settings.distance = 0.3        # fast-GI AO reach (scene metres)
    L.budget_denoise(prefilter="ACCURATE", quality="BALANCED")
    ov = dict(L.LEAN)
    ov.update(final_spp=12, preview_spp=16)
    return ov


C.run("sh06", build)
