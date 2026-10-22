"""sh10 - out of the fibre into a field of countless living cells (52.10-58.00 s).

Scale: 1 m = 100 um (lib_s7). Opens on exactly sh09's last frame: the shared fibre interior
(lib_s7.build_fibre_interior, same seeds/materials/haze/exposure, hero mitochondrion at ~(535, 842)
px). The probe pulls back exponentially along the corridor and keeps moving straight back through
the sarcolemma: for ~4 frames the translucent membrane fills the lens (lit by the probe's own lamp,
protein particles, caveolae pits, soft folds, the interior glowing through it), then the dome falls
away and the field is already there in soft focus. The field: ~3x10^4 instanced 3-D cells (culled) (domed,
irregular outlines, +-12 % size, SSS bodies with translucent rims, nucleus, cytoplasm granules) on an
undulating tissue sheet that curves away into haze. "bildigimiz": the cell we came out of lights
first (f1317), then its ~10 neighbours one after another; "bilmedigimiz" (f1327): an amber front rolls
out over the field to the horizon (infinity from f1344). Lit cells glow amber from inside and spill
warm light onto the flanks of their neighbours (per-instance neighbour timing, see field_layout).
Exit: sparse glints receding into a cooling grey haze (-> sh11 rain).
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy, bmesh
from mathutils import Vector, Euler, Quaternion, Matrix, noise, kdtree
import common as C
import lib_s7 as L

R_CELL = 0.8
VOID = (0.006, 0.011, 0.015)

# the field
S_CELL = 1.7            # cell spacing (170 um fibres)
R_DOME = 0.95           # footprint radius before the per-cell scale (neighbours press together)
H_DOME = 0.40           # dome height above the sheet
Z0 = R_CELL * 0.5       # sheet level at the hero cell
RC = 2600.0             # global curvature of the sheet
RMAX = 1400.0           # lattice radius before culling
N_VAR = 16              # cell mesh variants
F_FIELD0 = 1283         # field exists from here (fully hazed inside the fibre before)
F_ON0 = 1316.0          # the cell we came out of starts glowing -> clearly lit at f1317
F_WAVE = 1327.0         # the amber front starts rolling from f1327
K_GLOW = 1.5            # emission inside a lit cell (x amplitude 0.6-1.6, glints x2)
K_SPILL = 0.35          # warm spill on a neighbour's flank per lit neighbour

# small exposure trims (stops) around the crossing (measured on luma strips)
EXPO_TRIM = {}
DOME_TEAL_W = {1294: 1.0}


def surf_z(x, y):
    """Height of the tissue sheet: gentle global curvature + undulations growing with distance
    (fine ripples a few cells out, rolling folds further, broad swells at the horizon)."""
    r = math.hypot(x, y)
    z = Z0 - r * r / (2 * RC)
    z += 0.10 * noise.noise(Vector((x / 7.0, y / 7.0, 3.1))) * C.smooth((r - 2.5) / 6.0)
    z += 0.8 * noise.noise(Vector((x / 18.0, y / 18.0, 5.3))) * C.smooth((r - 4.0) / 20.0)
    z += 5.0 * noise.noise(Vector((x / 50.0, y / 50.0, 7.7))) * C.smooth((r - 8.0) / 50.0)
    z += 12.0 * noise.noise(Vector((x / 180.0, y / 180.0, 1.3))) * C.smooth((r - 40.0) / 200.0)
    return z


def build(ctx):
    sc = bpy.context.scene
    t_bil = ctx.word("bildiğimiz")
    t_had = ctx.word("hadsiz")
    frames = list(range(ctx.f0 - 3, ctx.f1 + 3))
    times = [f / C.FPS for f in frames]
    HO = L.INTERIOR_HANDOFF
    C.world_color(HO["fog_color"], 1.0)
    fg = L.fog_group(color=HO["fog_color"], dist=HO["fog_dist"], strength=1.0, power=HO["fog_power"])

    # ---------------------------------------------------------------- the hero fibre (dome) + interior
    hero_c = Vector((0, 0, R_CELL * 0.55))
    m_mem = mat_membrane()
    dome = L.obj_from_mesh("heroCell", L.blob_mesh("heroCellMe", radius=R_CELL, sub=6, seed=5, amp=0.04, freq=1.2,
                                                   ruffle=0.008, ruffle_freq=14, squash=(1, 1, 0.62)), m_mem, loc=hero_c)
    # interior frame: local X -> world +X (view), local Y -> world +Z (myofibrils), local Z -> world -Y
    H = hero_c + Vector((-0.55, 0, 0))
    Mrot = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))       # columns: X, Y(local)->Z, Z(local)->-Y
    M = Matrix.Translation(H) @ Mrot.to_4x4()
    # the cristae energy wave of sh09 ("olup"), in this shot's frame (long past the hero by f1250)
    wave = dict(t0=C.word_time("sh09", "olup") - 0.05, speed=0.09, origin=M @ Vector((0, -0.03, 0)),
                axis=tuple(Mrot @ Vector((0, 1, 0))), width=0.014, gain=7.0)
    inter = L.build_fibre_interior("interiorRoot", M, fibre_c=HO["fibre_c"], fibre_r=HO["fibre_r"], seed=909,
                                   y_half=HO["y_half"], cristae_wave=wave)
    inter["objects"] = inter["objects"] + upgrade_interior(inter, wave)
    # hero matrix glow, keyed exactly as in sh09 (constant 22 here: all sh10 frames are past 1240)
    mh = bpy.data.materials["MitoInnerS9Hero"]
    L.bake_id(mh.node_tree, frames, 'nodes["matrix_emit"].inputs[1].default_value',
              [C.lerp(MITO_VOL["emit_small"], MITO_VOL["emit"], C.remap(f, 1215, 1240, C.smooth)) for f in frames])
    print(f"[sh10] interior: {inter['fibrils']} myofibrils, {inter['mitos']} mitochondria")
    # exit point: ray-cast the dome wall along -X from the hero mitochondrion
    org = H - dome.location
    hit, loc_, _, _ = dome.ray_cast(org, Vector((-1, 0, 0)))
    d_wall = (H - (loc_ + dome.location)).length if hit else 0.25
    print(f"[sh10] sarcolemma {d_wall:.3f} m behind the start")

    # ---------------------------------------------------------------- camera: exponential pull back
    cam_start = H + Mrot @ Vector(HO["cam_local"])
    cam = C.camera("cam", lens=35, loc=tuple(cam_start), fstop=HO["fstop"], focus=HO["focus"], clip_start=0.002,
                   clip_end=3000)
    cam.data.dof.aperture_blades = 0
    t_s = 1250 / C.FPS                                   # hand-off frame: d = 0.03 exactly
    d0, d1 = -HO["cam_local"][0], 130.0

    def dist_at(t):
        u = C.remap(t, t_s, ctx.t1 + 0.25, lambda v: max(0.0, min(1.0, v)))
        return d0 * (d1 / d0) ** (C.smoother(u) * 0.45 + u * 0.55)
    t_exit = next(t_s + i / 240 for i in range(2400) if dist_at(t_s + i / 240) > d_wall)
    print(f"[sh10] membrane crossing at {t_exit:.3f}s (f{t_exit * C.FPS:.2f})")
    t_set = t_had - 0.15                                 # framing settled for "HADSIZ"
    locs, rots, foc, fst, fdist, fcol, expo, fpow, filmd = [], [], [], [], [], [], [], [], []
    prev = None

    def warp(t):
        # the membrane resists: just through it (~7 mm off the film) the probe holds completely still
        # for 1295-1299 (no motion blur: the film fills the lens in focus), then eases back onto its
        # path by t_exit + 0.45 (cubic Hermite: zero speed out of the hold, path speed at the end)
        a, h, t1 = t_exit + 0.012, 0.19, t_exit + 0.45
        if t <= a:
            return t
        if t <= a + h:
            return a
        if t >= t1:
            return t
        u = (t - a - h) / (t1 - a - h)
        return a + (t1 - a) * (3 * u * u - 2 * u ** 3) + (t1 - a - h) * (u ** 3 - u * u)
    for tr in times:
        t = warp(tr)
        # once through the membrane the probe backs off faster (x up to 2.6) so the field is revealed
        # instead of the camera skimming the hero cell; the boost bleeds off by "hadsiz" (monotonic)
        boost = 2.5 * C.remap(tr, t_exit + 0.3, t_exit + 0.8, C.smooth) * (1.0 - C.remap(tr, t_exit + 0.8, t_had, C.smooth))
        dist = dist_at(t) * (1.0 + boost)
        # elevation: level inside, rising to look down on the field, then settling low
        el = C.lerp(0.0, 52.0, C.remap(t, t_exit + 0.05, t_exit + 0.75, C.smooth))
        el = C.lerp(el, 17.0, C.remap(t, t_bil + 0.4, t_set, C.smooth))
        az = C.lerp(180.0, 205.0, C.remap(t, t_exit, t_set, C.smooth))
        tgt = H.lerp(hero_c, C.remap(t, t_exit, t_exit + 1.0, C.smooth))
        dirv = Vector((math.cos(math.radians(el)) * math.cos(math.radians(az)),
                       math.cos(math.radians(el)) * math.sin(math.radians(az)),
                       math.sin(math.radians(el))))
        k_off = 1.0 - C.remap(t, t_exit - 0.2, t_exit + 0.4, C.smooth)
        off = Mrot @ Vector((0, HO["cam_local"][1], 0)) * k_off      # hand-off framing offset (mito at y~842)
        p = tgt + dirv * dist + off
        # keep >= 2 cm clear of the (lumpy) dome mesh once outside: 5 cm analytic margin, blended in
        # over the first frames outside so the camera keeps its own speed through the membrane (no snap)
        w_cl = C.remap(t, t_exit - 0.02, t_exit + 0.3, C.smooth)
        if w_cl > 0.0:
            rel = p - hero_c
            ax = Vector((R_CELL + 0.05, R_CELL + 0.05, R_CELL * 0.62 + 0.05))
            e = math.sqrt((rel.x / ax.x) ** 2 + (rel.y / ax.y) ** 2 + (rel.z / ax.z) ** 2)
            if e < 1.0:
                p = p.lerp(hero_c + rel / e, w_cl)
        look = tgt + off + Vector((0, 0, dist * C.lerp(0.0, 0.13, C.remap(t, t_bil + 0.4, t_set, C.smooth))))
        f = (look - p).normalized()
        rt = f.cross(Vector((0, 0, 1)))
        rt = rt.normalized() if rt.length > 1e-6 else Vector((0, -1, 0))
        up = rt.cross(f).normalized()
        q = Matrix((rt, up, -f)).transposed().to_quaternion()
        e = q.to_euler("XYZ", prev) if prev else q.to_euler("XYZ")
        prev = e
        locs.append(tuple(p)); rots.append(tuple(e))
        # real distance to the film along the view axis (for focus and the film lamp)
        fdh = None
        if t_exit <= t < t_exit + 0.5:
            hit_, loc2, _, _ = dome.ray_cast(p - hero_c, f)
            fdh = (loc2 + hero_c - p).length if hit_ else None
        filmd.append(fdh if fdh else max(0.0, dist - d_wall))
        # focus: the hero mito, then the membrane film while it fills the lens, then the field
        if tr < t_exit + 0.03:                             # 1295: still on the interior, seen through the veil
            fd = dist - 0.0035
        else:
            # the sarcolemma film just in front of the lens, then (1300-1304) over to the field: the top
            # of the cell domes along the view axis (only when the camera is above that plane)
            fz = (p.z - (Z0 + 0.3)) / -f.z if f.z < -0.05 else -1.0
            fld = min(fz, (tgt - p).length * 1.3) if fz > 0.05 else (tgt - p).length * 1.3
            oc = ray_ellipsoid(p, f, Vector((0, 0, Z0)), Vector((0.52, 0.52, 0.32)))   # the cell under the hero
            if oc is not None and oc > 0.03:
                fld = min(fld, oc)
            fd = C.lerp(max(0.004, filmd[-1]), max(0.05, fld), C.remap(tr * C.FPS, 1299.5, 1304, C.smooth))
        foc.append(fd)
        fst.append(C.lerp(HO["fstop"], 8.0, C.remap(t, t_exit - 0.1, t_exit + 1.0)))
        # haze: interior hand-off -> blue-black tissue haze outside (long enough that the field is
        # visible as soon as the membrane falls away), longer and cooling to sh11 grey at the end
        k_out = C.remap(tr, t_exit, t_exit + 0.3, C.smooth)
        k_end = C.remap(tr, t_had + 0.6, ctx.t1 + 0.1, C.smooth)
        fdist.append(C.lerp(HO["fog_dist"], max(2.5, dist * 1.25), k_out) * C.lerp(1.0, 1.3, k_end))
        fpow.append(C.lerp(HO["fog_power"], 2.0, k_out))
        col = C.lerp(HO["fog_color"], VOID, k_out)
        fcol.append(C.lerp(col, (0.022, 0.024, 0.027), k_end))
        expo.append(C.lerp(HO["exposure"], 0.3, k_out))
    # the camera rides in the interior's local frame (parent rig = M), so its handheld noise acts on
    # the same local axes as in sh09 -> identical f1250 camera matrix (incl. handheld)
    rig = C.empty("camRig"); rig.matrix_world = M
    cam.parent = rig
    Mi = M.inverted()
    lloc, lrot = [], []
    prev_l = Euler(HO["cam_euler_ref"])
    for p_, e_ in zip(locs, rots):
        Wm = Matrix.Translation(Vector(p_)) @ Euler(e_).to_matrix().to_4x4()
        lm = Mi @ Wm
        lloc.append(tuple(lm.translation))
        el_ = lm.to_euler("XYZ", prev_l); prev_l = el_
        lrot.append(tuple(el_))
    L.bake(cam, frames, "location", lloc)
    L.bake(cam, frames, "rotation_euler", lrot)
    # smooth the hand-over between focus targets through the reveal (3-frame mean, 1300-1312)
    foc = [sum(foc[i - 1:i + 2]) / 3 if 1300 <= f <= 1312 else fv for i, (f, fv) in enumerate(zip(frames, foc))]
    L.bake_id(cam.data, frames, "dof.focus_distance", foc)
    L.bake_id(cam.data, frames, "dof.aperture_fstop", fst)
    C.handheld(cam, **HO["handheld"])          # same noise as sh09 -> identical f1250 camera matrix
    L.bake_id(fg, frames, 'nodes["dist"].outputs[0].default_value', fdist)
    L.bake_id(fg, frames, 'nodes["power"].outputs[0].default_value', fpow)
    L.bake_id(fg, frames, 'nodes["color"].outputs[0].default_value', [(*c, 1) for c in fcol])
    wcol, wgrad = world_haze(sc)
    L.bake_id(sc.world.node_tree, frames, f'nodes["{wcol.name}"].outputs[0].default_value', [(*c, 1) for c in fcol])
    L.bake_id(sc.world.node_tree, frames, f'nodes["{wgrad.name}"].outputs[0].default_value',
              [C.remap(t, t_exit, t_exit + 0.5, C.smooth) for t in times])
    L.bake_id(sc, frames, "view_settings.exposure", [x + EXPO_TRIM.get(f, 0.0) for x, f in zip(expo, frames)])

    # ---------------------------------------------------------------- the field of cells
    f_in0 = C.t2f(t_exit + 0.15)                         # interior gone, dome starts to fall away
    fl = field_layout(frames, locs, rots, fdist, t_had)
    m_cell = mat_cells()
    variants = cell_variants(m_cell)
    gn = cells_gn(variants)
    field = cells_object("cellField", fl["cells"], gn)
    origin = cells_object("cellOrigin", fl["origin"], gn)
    m_base = mat_base()
    base_holed = L.obj_from_mesh("tissueBase", sheet_mesh(size=2*RMAX, n=480, hole=R_CELL * 1.1), m_base)
    base_full = L.obj_from_mesh("tissueBaseFull", sheet_mesh(size=2*RMAX, n=480, hole=0.0), m_base)
    # inside the fibre the field sits far beyond the haze: it only exists from shortly before the crossing
    for o in (field, base_holed):
        L.bake(o, [frames[0], F_FIELD0, f_in0], "hide_render", [1.0, 0.0, 0.0], interp="CONSTANT")
    # the cell under the hero dome and the unholed base replace the dome as it falls away
    L.bake(origin, [frames[0], f_in0], "hide_render", [1.0, 0.0], interp="CONSTANT")
    L.bake(base_full, [frames[0], f_in0], "hide_render", [1.0, 0.0], interp="CONSTANT")
    L.bake(base_holed, [frames[0], F_FIELD0, f_in0], "hide_render", [1.0, 0.0, 1.0], interp="CONSTANT")

    # interior: hidden in one frame behind the membrane film once the film fills the lens
    for o in inter["objects"]:
        L.bake(o, [frames[0], f_in0], "hide_render", [0.0, 1.0], interp="CONSTANT")
    # the dome film falls away (fades to transparent) over 7 frames, then stops rendering
    fade_group_animate([dome], frames, f_in0 + 1, 3, "S7_FadeDome", ease=True)
    # the film right at the lens (1295, ~6 mm) is a thin veil over the interior, opaque from 1297
    L.bake_id(m_mem.node_tree, frames, 'nodes["veil"].outputs[0].default_value',
              [{1295: 0.5, 1296: 0.85}.get(f, 1.0) for f in frames], interp="CONSTANT")
    f_dome0 = C.t2f(t_exit - 0.5)
    L.bake(dome, [frames[0], f_dome0, f_in0 + 10], "hide_render", [1.0, 0.0, 1.0], interp="CONSTANT")

    # counter tracker: on screen from frame 1306; parked 10 m behind the lens before
    trk = C.empty("TRK_cells", tuple(hero_c + Vector((0, 0, R_CELL * 0.4))))
    base = Vector(trk.location)
    tl = []
    for f, lc, rt_ in zip(frames, locs, rots):
        if f >= 1306:
            tl.append(tuple(base))
        else:
            back = Euler(rt_).to_matrix() @ Vector((0, 0, 1))
            tl.append(tuple(Vector(lc) + back * 10.0))
    L.bake(trk, frames, "location", tl, interp="CONSTANT")

    # ---------------------------------------------------------------- light
    s1 = C.sun(elev_deg=35, azim_deg=130, strength=0.9, kelvin_k=4200, angle_deg=6, name="amberKey")
    # suns only once outside (no leak into the interior: f1250 must equal sh09)
    L.bake_id(s1.data, frames, "energy", [C.lerp(0.0, 0.9, C.remap(t, t_exit - 0.15, t_exit + 0.35, C.smooth)) *
                                          C.lerp(1.0, 0.0, C.remap(t, t_exit + 0.35, 54.6)) for t in times])
    s2 = C.sun(elev_deg=60, azim_deg=-40, strength=0.8, kelvin_k=12000, angle_deg=20, name="tealFill")
    s2.data.color = (0.45, 0.85, 1.0)
    # the teal fill lights the dome film through a separate, measured twin (light linking)
    tx = bpy.data.collections.new("tealExclude"); tx.objects.link(dome)
    s2.light_linking.receiver_collection = tx
    tx.collection_objects[0].light_linking.link_state = "EXCLUDE"
    s3 = C.sun(elev_deg=60, azim_deg=-40, strength=0.8, kelvin_k=12000, angle_deg=20, name="tealDome")
    s3.data.color = s2.data.color
    ti = bpy.data.collections.new("tealDomeOnly"); ti.objects.link(dome)
    s3.light_linking.receiver_collection = ti
    tw = sorted(DOME_TEAL_W.items())

    def _w(f):
        if f <= tw[0][0]:
            return tw[0][1]
        for (fa, wa), (fb, wb) in zip(tw, tw[1:]):
            if f <= fb:
                return C.lerp(wa, wb, (f - fa) / (fb - fa))
        return tw[-1][1]
    L.bake_id(s3.data, frames, "energy", [C.lerp(0.0, 1.2, C.remap(t, t_exit - 0.15, t_exit + 0.35, C.smooth)) * _w(f)
                                          for t, f in zip(times, frames)])
    L.bake_id(s2.data, frames, "energy", [C.lerp(0.0, 1.2, C.remap(t, t_exit - 0.15, t_exit + 0.35, C.smooth)) for t in times])
    PR = HO["probe"]
    il = C.point_light("probe", power=PR["energy"], radius=PR["radius"], kelvin_k=4500)
    il.parent = cam; il.location = PR["offset"]
    il.data.specular_factor = 0.0; il.data.color = PR["color"]
    rc = bpy.data.collections.new("probeReceivers")
    for o in inter["objects"]:
        for ob_ in [o] + list(o.children):
            if ob_.name not in rc.objects:
                rc.objects.link(ob_)
    il.light_linking.receiver_collection = rc
    L.bake_id(il.data, frames, "energy", [C.lerp(PR["energy"], 0.0, C.remap(t, t_exit + 0.05, t_exit + 0.45, C.smooth)) for t in times])
    # the probe's second lamp on the membrane as it passes the lens (film only); fades as the film
    # falls away
    fl_ = C.point_light("probeFilm", power=PR["energy"], radius=0.02, kelvin_k=4500)
    fl_.data.specular_factor = 0.05
    # off-axis (6 cm right, 5 cm up, behind the lens) so the film relief is lit at a grazing angle and
    # evenly (no hot spot on the film); per-frame weights measured on luma strips (FILM_W)
    fl_.parent = cam; fl_.location = (0.06, 0.05, 0.02); fl_.data.color = (1.0, 0.86, 0.8)
    rf = bpy.data.collections.new("filmReceivers"); rf.objects.link(dome)
    fl_.light_linking.receiver_collection = rf
    # energy follows the lamp-to-film distance squared (even exposure while the film recedes)
    L.bake_id(fl_.data, frames, "energy", [FILM_E * FILM_W.get(f, 1.0) * min(1.5, ((fd_ + 0.08) / 0.1) ** 2) *
                                           C.remap(t, t_exit - 0.06, t_exit, C.smooth) *
                                           (1.0 - C.remap(t, t_exit + 0.17, t_exit + 0.45, C.smooth)) for t, f, fd_ in zip(times, frames, filmd)])

    add_fog_glow(sc)
    L.budget_denoise(prefilter="ACCURATE", quality="BALANCED", final_res=80)
    # samples: interior, membrane and the close reveal (<= 1308) at 8 spp like sh09 (f1250 match;
    # 1301-1308 are dense close-up SSS frames, ~100 s at 12 spp), the field at 16. Keyed (constant) so
    # every chunk gets the same samples whatever its start frame.
    if ctx.mode == "final":
        L.bake_id(sc, frames, "cycles.samples", [8 if f <= 1308 else 16 for f in frames],
                  interp="CONSTANT")
    def _log(scene, *_):
        print(f"[sh10] f{scene.frame_current} spp={scene.cycles.samples}", flush=True)
    bpy.app.handlers.render_pre.append(_log)
    ov = dict(L.LEAN)
    ov.update(transmission_bounces=3, transparent_bounces=8, final_spp=8, preview_spp=12)   # = sh09 (f1250 match)
    return ov


FILM_E = 0.03
FILM_W = {}

# --------------------------------------------------------------------------- the field


def ray_ellipsoid(o, d, c, ax):
    """Distance along unit ray (o, d) to an axis-aligned ellipsoid (centre c, semi-axes ax), or None."""
    oo = Vector(((o.x - c.x) / ax.x, (o.y - c.y) / ax.y, (o.z - c.z) / ax.z))
    dd = Vector((d.x / ax.x, d.y / ax.y, d.z / ax.z))
    A, B, Cc = dd.dot(dd), 2 * oo.dot(dd), oo.dot(oo) - 1.0
    disc = B * B - 4 * A * Cc
    if disc < 0:
        return None
    t0 = (-B - math.sqrt(disc)) / (2 * A)
    return t0 if t0 > 0 else None



def field_layout(frames, locs, rots, fdist, t_had):
    """Jittered hex lattice of cells on the undulating sheet, culled to what the camera ever sees
    (frustum + haze distance over all frames with the field). Per-cell timing, brightness and the
    4 brightest neighbours (for the warm spill). Deterministic (fixed seeds, no frame dependence)."""
    import numpy as np
    rng = np.random.RandomState(1010)
    a1 = np.array([math.cos(math.pi / 6), 0.5]) * S_CELL     # no neighbour on the -X axis: the camera
    a2 = np.array([0.0, 1.0]) * S_CELL                         # leaves the hero cell between two cells
    N = int(RMAX / (S_CELL * 0.866)) + 2
    ii, jj = np.meshgrid(np.arange(-N, N + 1), np.arange(-N, N + 1), indexing="ij")
    ii = ii.ravel(); jj = jj.ravel()
    P = ii[:, None] * a1[None] + jj[:, None] * a2[None]
    P = P + rng.uniform(-1, 1, P.shape) * S_CELL * 0.2
    R7 = rng.uniform(0, 1, (len(P), 7)).astype(np.float32)
    org = (ii == 0) & (jj == 0)
    P[org] = 0.0
    r = np.hypot(P[:, 0], P[:, 1])
    keep = (r < RMAX) & ~org
    P, R7, r = P[keep], R7[keep], r[keep]
    zf = Z0 - r * r / (2 * RC)
    tx = 18.0 / 35.0 * 9.0 / 16.0
    ty = 18.0 / 35.0

    def frustum_pass(P3, margin_base, margin_k, und):
        vis = np.zeros(len(P3), bool)
        for f, lc, rt_, fd in zip(frames, locs, rots, fdist):
            if f < F_FIELD0:
                continue
            Rm = np.array(Euler(rt_).to_matrix(), np.float64)
            d = P3 - np.array(lc)[None]
            v = d @ Rm
            depth = -v[:, 2]
            m = margin_base + margin_k * depth + und
            ok = (depth > -m) & (np.abs(v[:, 0]) < depth * tx * 1.1 + m) & (np.abs(v[:, 1]) < depth * ty * 1.1 + m)
            ok &= depth < 2.2 * fd + 3.0
            vis |= ok
        return vis
    und = 0.5 + 16.0 * np.clip((r - 8.0) / 300.0, 0, 1)        # bound of the undulation
    vis = frustum_pass(np.stack([P[:, 0], P[:, 1], zf], 1), 2.0, 0.02, und)
    P, R7, r = P[vis], R7[vis], r[vis]
    z = np.array([surf_z(x, y) for x, y in P])
    vis = frustum_pass(np.stack([P[:, 0], P[:, 1], z], 1), 1.4, 0.004, 0.0)
    P, R7, r, z = P[vis], R7[vis], r[vis], z[vis]
    n = len(P)
    print(f"[sh10] field: {n} cells after culling")

    # timing: the ~10 nearest one after another from f1316, the rest in log-distance waves
    sr = 0.88 + 0.24 * R7[:, 0]
    sh = sr * (0.85 + 0.3 * R7[:, 1])
    spin = R7[:, 2] * 2 * math.pi
    var = np.minimum((R7[:, 3] * N_VAR).astype(int), N_VAR - 1)
    b = R7[:, 4]; g = R7[:, 5]; rr = R7[:, 6]
    glint = b < 0.12
    gate = b < 0.3
    near_idx = np.argsort(r)[:10]
    near = np.zeros(n, bool); near[near_idx] = True
    t_on = F_WAVE / C.FPS + 0.30 * np.log(1.0 + r / 6.0) + 0.10 * rr
    for k, i in enumerate(near_idx):
        t_on[i] = (F_ON0 + 1.0 + k * 1.0 + 0.4 * rr[i]) / C.FPS
    br = (0.6 + g ** 2) * np.where(glint, 2.0, 1.0)
    amp = np.where(gate | near, br, 0.0)
    flo = np.where(glint | near, 0.3, 0.0)

    # regional size variation (patches of larger / smaller cells) breaks the lattice regularity
    for i in range(n):
        k_ = 1.0 + 0.2 * noise.noise(Vector((P[i, 0] / 22.0, P[i, 1] / 22.0, 9.1)))
        sr[i] *= k_; sh[i] *= k_

    # clearance: no cell may come within 8 cm of the lens (the camera skims the field at 1295-1320)
    cam_pts = [Vector(lc) for f, lc in zip(frames, locs) if F_FIELD0 <= f <= 1330]
    for i in np.nonzero(r < 4.5)[0]:
        c0 = Vector((P[i, 0], P[i, 1], z[i]))
        a_h = R_DOME * sr[i] + 0.08
        for cp in cam_pts:
            d = cp - c0
            q = (d.x * d.x + d.y * d.y) / (a_h * a_h)
            if q < 1.0 and d.z > 0:
                lim = (d.z / math.sqrt(1.0 - q) - 0.08) / H_DOME
                sh[i] = max(0.2, min(sh[i], lim))

    # neighbours: the 4 brightest of the 6 nearest -> (dx, dy, t_on), (amp, floor)
    kd = kdtree.KDTree(n)
    for i in range(n):
        kd.insert((P[i, 0], P[i, 1], 0.0), i)
    kd.balance()
    nbA = np.zeros((n, 4, 3), np.float32); nbB = np.zeros((n, 4, 3), np.float32)
    nbA[:, :, 2] = 1e4
    for i in range(n):
        cand = [(amp[j], j) for (_, j, _) in kd.find_n((P[i, 0], P[i, 1], 0.0), 7) if j != i]
        cand.sort(reverse=True)
        for k, (a_, j) in enumerate(cand[:4]):
            dv = P[j] - P[i]; dl = max(1e-6, math.hypot(dv[0], dv[1]))
            nbA[i, k] = (dv[0] / dl, dv[1] / dl, t_on[j])
            nbB[i, k] = (a_ * (0.0 if a_ <= 0 else 1.0), flo[j], 0.0)

    # orientation on the sheet
    rot = np.zeros((n, 3), np.float32)
    for i in range(n):
        x, y = P[i]
        h = 0.5
        nz = Vector((-(surf_z(x + h, y) - surf_z(x - h, y)) / (2 * h), -(surf_z(x, y + h) - surf_z(x, y - h)) / (2 * h), 1.0))
        qn = Vector((0, 0, 1)).rotation_difference(nz.normalized()) @ Quaternion((0, 0, 1), float(spin[i]))
        rot[i] = tuple(qn.to_euler("XYZ"))
    cells = dict(co=np.stack([P[:, 0], P[:, 1], z - 0.02], 1), rot=rot,
                 scl=np.stack([sr, sr, sh], 1), var=var, ton=t_on, amp=amp, flo=flo, rnd=rr, nbA=nbA, nbB=nbB)
    # the cell under the hero dome: small (r 0.52) so it sits well inside the hero's film and the camera
    # leaving the film has ~25 cm of air in front of it; first to light up
    o_nb = np.zeros((1, 4, 3), np.float32); o_nb[:, :, 2] = 1e4
    oB = np.zeros((1, 4, 3), np.float32)
    origin = dict(co=np.array([[0.0, 0.0, Z0 - 0.02]]), rot=np.zeros((1, 3), np.float32),
                  scl=np.array([[0.55, 0.55, 0.8]]), var=np.array([3]), ton=np.array([F_ON0 / C.FPS]),
                  amp=np.array([1.3]), flo=np.array([0.3]), rnd=np.array([0.5]), nbA=o_nb, nbB=oB)
    # the neighbours of the origin cell see it light first
    for i in np.argsort(r)[:8]:
        dv = -P[i]; dl = max(1e-6, math.hypot(dv[0], dv[1]))
        nbA[i, 3] = (dv[0] / dl, dv[1] / dl, F_ON0 / C.FPS)
        nbB[i, 3] = (0.7, 0.3, 0.0)
    return dict(cells=cells, origin=origin)


def cell_mesh(name, seed):
    """One cell: a dome with an irregular, slightly polygonal outline (pressed by its neighbours),
    steep flanks, a nucleus bulge off-centre, soft lumps; a skirt sinks into the sheet."""
    rng = random.Random(seed)
    ph = [rng.uniform(0, 2 * math.pi) for _ in range(4)]
    k_hex = rng.uniform(0.35, 0.75); r_hex = rng.uniform(0, math.pi / 3)
    nx, ny = rng.uniform(-0.28, 0.28) * R_DOME, rng.uniform(-0.28, 0.28) * R_DOME
    nr, ns = 13, 64

    def rad(th):
        hx = math.cos(math.pi / 6) / math.cos(((th - r_hex) % (math.pi / 3)) - math.pi / 6)
        rr_ = C.lerp(1.0, hx, k_hex)
        return rr_ * (1 + 0.05 * math.sin(2 * th + ph[0]) + 0.035 * math.sin(3 * th + ph[1]) + 0.02 * math.sin(5 * th + ph[2]))

    def height(x, y, s):
        z = H_DOME * max(0.0, 1 - s ** 2.6) ** 0.5
        z += 0.10 * H_DOME * math.exp(-((x - nx) ** 2 + (y - ny) ** 2) / (0.3 * R_DOME) ** 2) * (1 - s ** 4)
        z += 0.05 * H_DOME * noise.noise(Vector((x * 3.0, y * 3.0, seed * 1.7))) * (1 - s ** 3)
        return z
    verts = [(0.0, 0.0, height(0.0, 0.0, 0.0))]
    for k in range(1, nr + 1):
        s = (k / nr) ** 0.8
        for j in range(ns):
            th = 2 * math.pi * j / ns
            R_ = R_DOME * rad(th) * s
            x, y = R_ * math.cos(th), R_ * math.sin(th)
            verts.append((x, y, height(x, y, s)))
    for s_, zz in ((1.01, -0.04), (0.97, -0.25)):        # skirt into the sheet
        for j in range(ns):
            th = 2 * math.pi * j / ns
            R_ = R_DOME * rad(th) * s_
            verts.append((R_ * math.cos(th), R_ * math.sin(th), zz))
    faces = [(0, 1 + j, 1 + (j + 1) % ns) for j in range(ns)]
    for k in range(nr + 1):
        a0 = 1 + k * ns; b0 = a0 + ns
        for j in range(ns):
            j2 = (j + 1) % ns
            faces.append((a0 + j, b0 + j, b0 + j2, a0 + j2))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    return me, (nx, ny, 0.24 * R_DOME * rng.uniform(0.85, 1.15))


NUC = []


def cell_variants(mat):
    coll = bpy.data.collections.new("cellVariants")          # not linked to the scene: instanced only
    NUC.clear()
    for v in range(N_VAR):
        me, nuc = cell_mesh(f"cellVar_{v:02d}", 4100 + v)
        me.materials.append(mat)
        o = bpy.data.objects.new(f"cellVar_{v:02d}", me)
        coll.objects.link(o)
        NUC.append(nuc)
    return coll


def cells_gn(coll):
    ng = bpy.data.node_groups.new("S7_Cells", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    gi = ng.nodes.new("NodeGroupInput"); go = ng.nodes.new("NodeGroupOutput")
    ci = ng.nodes.new("GeometryNodeCollectionInfo")
    ci.inputs["Collection"].default_value = coll
    ci.inputs["Separate Children"].default_value = True
    ci.inputs["Reset Children"].default_value = True

    def named(name, dt):
        n = ng.nodes.new("GeometryNodeInputNamedAttribute"); n.data_type = dt
        n.inputs["Name"].default_value = name
        return n.outputs["Attribute"]
    e2r = ng.nodes.new("FunctionNodeEulerToRotation")
    ng.links.new(named("rot", "FLOAT_VECTOR"), e2r.inputs["Euler"])
    iop = ng.nodes.new("GeometryNodeInstanceOnPoints")
    ng.links.new(gi.outputs[0], iop.inputs["Points"])
    ng.links.new(ci.outputs[0], iop.inputs["Instance"])
    iop.inputs["Pick Instance"].default_value = True
    ng.links.new(named("variant", "INT"), iop.inputs["Instance Index"])
    ng.links.new(e2r.outputs[0], iop.inputs["Rotation"])
    ng.links.new(named("scl", "FLOAT_VECTOR"), iop.inputs["Scale"])
    ng.links.new(iop.outputs[0], go.inputs[0])
    return ng


def cells_object(name, d, ng):
    import numpy as np
    n = len(d["co"])
    me = bpy.data.meshes.new(name)
    me.vertices.add(n)
    me.vertices.foreach_set("co", np.asarray(d["co"], np.float32).ravel())

    def put(nm, typ, vals):
        a = me.attributes.new(nm, typ, "POINT")
        a.data.foreach_set("value" if typ in ("FLOAT", "INT") else "vector", np.asarray(vals).ravel())
    put("variant", "INT", np.asarray(d["var"], np.int32))
    put("rot", "FLOAT_VECTOR", np.asarray(d["rot"], np.float32))
    put("scl", "FLOAT_VECTOR", np.asarray(d["scl"], np.float32))
    for nm in ("ton", "amp", "flo", "rnd"):
        put(nm, "FLOAT", np.asarray(d[nm], np.float32))
    put("nuc", "FLOAT_VECTOR", np.array([NUC[v] for v in d["var"]], np.float32))
    for k in range(4):
        put(f"nbA{k}", "FLOAT_VECTOR", np.asarray(d["nbA"][:, k], np.float32))
        put(f"nbB{k}", "FLOAT_VECTOR", np.asarray(d["nbB"][:, k], np.float32))
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    mod = o.modifiers.new("cells", "NODES"); mod.node_group = ng
    return o


class _NB:
    """Tiny node-building helper for one material."""
    def __init__(self, nt):
        self.nt = nt

    def n(self, kind, **kw):
        return L._n(self.nt, kind, **kw)

    def ln(self, a, b):
        self.nt.links.new(a, b)

    def m(self, op, a, b=None, c=None):
        nd = self.n("ShaderNodeMath"); nd.operation = op
        for i, v in enumerate((a, b, c)):
            if v is None:
                continue
            if hasattr(v, "is_output"):
                self.ln(v, nd.inputs[i])
            else:
                nd.inputs[i].default_value = v
        return nd.outputs[0]

    def mapr(self, v, a0, a1, b0=0.0, b1=1.0, smooth=True):
        nd = self.n("ShaderNodeMapRange")
        if smooth:
            nd.interpolation_type = "SMOOTHSTEP"
        nd.inputs["From Min"].default_value = a0; nd.inputs["From Max"].default_value = a1
        nd.inputs["To Min"].default_value = b0; nd.inputs["To Max"].default_value = b1
        self.ln(v, nd.inputs["Value"])
        return nd.outputs[0]

    def attr(self, name, out="Fac"):
        a = self.n("ShaderNodeAttribute"); a.attribute_type = "INSTANCER"; a.attribute_name = name
        return a.outputs[out]

    def sep(self, v):
        s = self.n("ShaderNodeSeparateXYZ"); self.ln(v, s.inputs[0])
        return s.outputs[0], s.outputs[1], s.outputs[2]

    def mix(self, fac, a, b):
        mx = self.n("ShaderNodeMix"); mx.data_type = "RGBA"
        for i, v in ((0, fac), (6, a), (7, b)):
            if hasattr(v, "is_output"):
                self.ln(v, mx.inputs[i])
            else:
                mx.inputs[i].default_value = v if i else v
        return mx.outputs[2]


def _on(B, t, t_on, floor):
    """Glow envelope of a cell: rise 0.15 s, decay (tau 0.35 s) to `floor`."""
    dt = B.m("SUBTRACT", t, t_on)
    rise = B.mapr(dt, 0.0, 0.15)
    ex = B.m("EXPONENT", B.m("DIVIDE", B.m("MAXIMUM", dt, 0.0), -0.35))
    dec = B.m("MULTIPLY_ADD", ex, B.m("SUBTRACT", 1.0, floor), floor)
    return B.m("MULTIPLY", rise, dec)


def mat_cells():
    """Living cell: translucent SSS body (dim blue-grey), lighter translucent rim, darker nucleus,
    cytoplasm granules, wet coat. Lit: amber glow from inside (stronger where the body is thick,
    the nucleus a soft shadow in it) + warm spill on the flanks facing lit neighbours."""
    m, nt, p = C.new_mat("FieldCell")
    B = _NB(nt)
    tc = B.n("ShaderNodeTexCoord")
    ox, oy, oz = B.sep(tc.outputs["Object"])
    t = L.time_value(nt).outputs[0]
    nuc = B.attr("nuc", "Vector")
    nx, ny, nr = B.sep(nuc)
    rnd = B.attr("rnd")
    dx = B.m("SUBTRACT", ox, nx); dy = B.m("SUBTRACT", oy, ny)
    dn = B.m("DIVIDE", B.m("SQRT", B.m("ADD", B.m("MULTIPLY", dx, dx), B.m("MULTIPLY", B.m("MULTIPLY", dy, dy), 1.5))), nr)
    top = B.mapr(oz, 0.12, 0.3)
    nucm = B.m("MULTIPLY", B.mapr(dn, 0.4, 1.15, 1.0, 0.0), top)
    nucl = B.m("MULTIPLY", B.mapr(dn, 0.0, 0.3, 1.0, 0.0), top)          # nucleolus
    gv = B.n("ShaderNodeTexVoronoi", **{"Scale": 30.0, "Randomness": 1.0}); gv.voronoi_dimensions = "3D"
    B.ln(tc.outputs["Object"], gv.inputs["Vector"])
    gran = B.m("MULTIPLY", B.mapr(gv.outputs["Distance"], 0.06, 0.2, 1.0, 0.0), B.m("GREATER_THAN", B.sep(gv.outputs["Color"])[0], 0.35))
    fn = B.n("ShaderNodeTexNoise", **{"Scale": 9.0, "Detail": 3.0}); B.ln(tc.outputs["Object"], fn.inputs["Vector"])
    lw = B.n("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.35
    facing = lw.outputs["Facing"]
    rim = B.m("POWER", facing, 2.0)
    # albedo
    cyt = B.mix(rnd, (0.12, 0.17, 0.195, 1), (0.15, 0.195, 0.215, 1))
    col = B.mix(rim, cyt, (0.24, 0.31, 0.34, 1))
    col = B.mix(B.m("MULTIPLY", nucm, 0.6), col, (0.10, 0.10, 0.14, 1))
    col = B.mix(B.m("MULTIPLY", nucl, 0.4), col, (0.07, 0.065, 0.09, 1))
    col = B.mix(B.m("MULTIPLY", gran, 0.3), col, (0.22, 0.26, 0.27, 1))
    B.ln(col, p.inputs["Base Color"])
    p.subsurface_method = L.SSS_METHOD
    p.inputs["Subsurface Weight"].default_value = 1.0
    p.inputs["Subsurface Radius"].default_value = (0.55, 0.8, 1.0)
    p.inputs["Subsurface Scale"].default_value = 0.3
    p.inputs["Roughness"].default_value = 0.55
    p.inputs["Specular IOR Level"].default_value = 0.3
    p.inputs["Coat Weight"].default_value = 0.08
    p.inputs["Coat Roughness"].default_value = 0.3
    # membrane surface: soft folds + a fine microvillus stipple (not a smooth glossy dome)
    mf = B.n("ShaderNodeTexNoise", **{"Scale": 28.0, "Detail": 5.0, "Distortion": 0.5}); B.ln(tc.outputs["Object"], mf.inputs["Vector"])
    mv = B.n("ShaderNodeTexVoronoi", **{"Scale": 140.0, "Randomness": 1.0}); mv.voronoi_dimensions = "3D"
    B.ln(tc.outputs["Object"], mv.inputs["Vector"])
    stip = B.mapr(mv.outputs["Distance"], 0.1, 0.45, 1.0, 0.0)
    L._bump_chain(nt, p, [(gran, 0.25), (fn.outputs["Fac"], 0.15), (nucm, 0.1), (mf.outputs["Fac"], 0.35), (stip, 0.2)], distance=0.03)
    # own glow
    on = B.m("MULTIPLY", _on(B, t, B.attr("ton"), B.attr("flo")), B.attr("amp"))
    body = B.m("MULTIPLY_ADD", B.m("POWER", B.m("SUBTRACT", 1.0, facing), 1.5), 0.85, 0.15)
    body = B.m("MULTIPLY", body, B.m("MULTIPLY_ADD", nucm, -0.6, 1.0))
    body = B.m("MULTIPLY", body, B.m("MULTIPLY_ADD", gran, 0.3, B.m("MULTIPLY_ADD", fn.outputs["Fac"], 0.9, 0.55)))
    glow = B.m("MULTIPLY", B.m("MULTIPLY", on, body), K_GLOW)
    glow = B.m("MULTIPLY_ADD", B.m("MULTIPLY", on, rim), 1.1, glow)          # translucent rim lit from inside
    # spill from lit neighbours onto the flank facing them (lower flank more)
    geo = B.n("ShaderNodeNewGeometry")
    gx, gy, gz = B.sep(geo.outputs["Normal"])
    low = B.mapr(oz, 0.0, H_DOME, 1.0, 0.45)
    sp = None
    for k in range(4):
        a_x, a_y, a_t = B.sep(B.attr(f"nbA{k}", "Vector"))
        b_a, b_f, _ = B.sep(B.attr(f"nbB{k}", "Vector"))
        dd = B.m("ADD", B.m("MULTIPLY", gx, a_x), B.m("MULTIPLY", gy, a_y))
        w = B.m("MULTIPLY", B.mapr(dd, 0.15, 0.95), b_a)
        s_k = B.m("MULTIPLY", _on(B, t, a_t, b_f), w)
        sp = s_k if sp is None else B.m("ADD", sp, s_k)
    spill = B.m("MULTIPLY", B.m("MULTIPLY", sp, low), K_SPILL)
    ecol = B.mix(B.m("DIVIDE", spill, B.m("ADD", B.m("ADD", spill, glow), 1e-4)), (1.0, 0.27, 0.035, 1), (1.0, 0.26, 0.035, 1))
    B.ln(ecol, p.inputs["Emission Color"])
    B.ln(B.m("ADD", glow, spill), p.inputs["Emission Strength"])
    L.fog_wrap(m)                           # also sets emission_sampling NONE (spill is shaded, not sampled)
    return m


def mat_base():
    """The tissue between the cells: dark, wet, fine fibrous matrix."""
    m, nt, p = C.new_mat("TissueBase")
    B = _NB(nt)
    tc = B.n("ShaderNodeTexCoord")
    nz = B.n("ShaderNodeTexNoise", **{"Scale": 3.0, "Detail": 6.0, "Distortion": 0.6}); B.ln(tc.outputs["Object"], nz.inputs["Vector"])
    col = B.mix(nz.outputs["Fac"], (0.03, 0.04, 0.05, 1), (0.06, 0.075, 0.085, 1))
    B.ln(col, p.inputs["Base Color"])
    # warm light pooling between the cells where they glow: the local lit fraction follows the same
    # schedule as the cells (the first cells around the origin, then the log-distance wave)
    t = L.time_value(nt).outputs[0]
    ox, oy, _ = B.sep(tc.outputs["Object"])
    r = B.m("SQRT", B.m("ADD", B.m("MULTIPLY", ox, ox), B.m("MULTIPLY", oy, oy)))
    near = B.m("MULTIPLY", _on(B, t, (F_ON0 + 1.0) / C.FPS, 0.3), B.mapr(r, 5.0, 1.5))
    tw = B.m("MULTIPLY_ADD", B.m("LOGARITHM", B.m("MULTIPLY_ADD", r, 1.0 / 6.0, 1.0), math.e), 0.30, F_WAVE / C.FPS + 0.05)
    wave = B.m("MULTIPLY", _on(B, t, tw, 0.25), 0.35)
    pool = B.m("MULTIPLY", B.m("MAXIMUM", near, wave), B.m("MULTIPLY_ADD", nz.outputs["Fac"], 0.8, 0.6))
    p.inputs["Emission Color"].default_value = (1.0, 0.3, 0.05, 1)
    B.ln(B.m("MULTIPLY", pool, 0.45), p.inputs["Emission Strength"])
    p.inputs["Roughness"].default_value = 0.45
    p.inputs["Coat Weight"].default_value = 0.2
    L._bump_chain(nt, p, [(nz.outputs["Fac"], 0.2)], distance=0.05)
    L.fog_wrap(m)
    return m


def world_haze(sc):
    """World = haze colour (animated) with a soft gradient once outside: brightest at/below the
    horizon (where the far field dissolves into the same colour), darker toward the zenith."""
    nt = sc.world.node_tree
    bg = [n for n in nt.nodes if n.type == "BACKGROUND"][0]
    B = _NB(nt)
    rgb = B.n("ShaderNodeRGB"); rgb.name = "hazeCol"
    gv = B.n("ShaderNodeValue"); gv.name = "hazeGrad"
    tc = B.n("ShaderNodeTexCoord")
    _, _, dz = B.sep(tc.outputs["Generated"])
    grad = B.mapr(dz, -0.2, 0.35, 1.0, 0.5)
    fac = B.m("MULTIPLY_ADD", gv.outputs[0], B.m("SUBTRACT", grad, 1.0), 1.0)
    vm = B.n("ShaderNodeVectorMath"); vm.operation = "SCALE"
    B.ln(rgb.outputs[0], vm.inputs[0]); B.ln(fac, vm.inputs["Scale"])
    B.ln(vm.outputs[0], bg.inputs[0])
    return rgb, gv


def sheet_mesh(size, n, hole):
    """Square grid, denser near the origin (quadratic spacing), on the undulating sheet, a few cm
    below the cells' bases."""
    import numpy as np
    u = np.linspace(-1, 1, n)
    g = np.sign(u) * (u ** 2) * size / 2
    xs, ys = np.meshgrid(g, g)
    zs = np.array([[surf_z(x, y) - 0.06 for x, y in zip(rx, ry)] for rx, ry in zip(xs, ys)])
    verts = np.stack([xs, ys, zs], -1).reshape(-1, 3)
    faces = []
    for j in range(n - 1):
        for i in range(n - 1):
            a = j * n + i
            cx, cy = xs[j, i], ys[j, i]
            if hole and abs(cx) < hole and abs(cy) < hole:
                continue
            faces.append((a, a + 1, a + n + 1, a + n))
    me = bpy.data.meshes.new("sheet")
    me.from_pydata(verts.tolist(), [], faces)
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    return me


# --------------------------------------------------------------------------- interior upgrade (= sh09)
# Copied verbatim from the sh09 fix (render-fix-sh09 7a82374, round 2b: upgrade_interior and helpers): the
# shared interior gets the same volumetric double-membrane mitochondria, folded 3-D cristae and soft
# T-tubules in both shots, so the sh09|sh10 cut at f1250 stays identical. Keep in sync with sh09.py.


MITO_VOL = dict(emit=22.0, emit_small=140.0, absorb=80.0, rim=0.25)   # hero / smaller chain bodies


# lib_s7 puts heroMito1/2 almost entirely inside myofibrils (the old alpha decals glowed through the
# fibril; the volumetric bodies read as dark ghosts there). Smallest offsets (local units) that clear
# the fibrils, found by an inside-mesh test; neither body is in frame at the f1250 hand-off.
HERO_NUDGE = {"heroMito1": (0.002, 0.0, -0.006), "heroMito2": (-0.005, 0.0, -0.002)}


def upgrade_interior(inter, wave):
    """Swap materials / meshes of the interior built by lib_s7 (same objects, transforms and
    hierarchy, so the hand-off framing is unchanged). Returns the new (inner-membrane) objects."""
    import re
    m_out, m_cr = mat_mito_outer_s9(), mat_cristae_s9(wave)
    m_in = mat_mito_inner_s9(MITO_VOL["emit_small"], "MitoInnerS9")        # the chains
    m_in_hero = mat_mito_inner_s9(MITO_VOL["emit"], "MitoInnerS9Hero")    # hero variants (10-12)
    new, cr_cache, in_cache = [], {}, {}
    for o in list(inter["objects"]):
        if o.type != "MESH":
            continue
        nm = o.data.name
        if nm.startswith("mitoEnv"):
            if nm not in in_cache:
                v, l_, w_ = (int(x) for x in re.match(r"mitoEnv(\d+)_(\d+)_(\d+)", nm).groups())
                env = mito_bean(nm + "_s9", length=l_ / 1e4, width=w_ / 1e4, seed=v)
                env.materials.append(m_out)
                in_cache[nm] = (env, inner_shell(env, m_in_hero if v >= 10 else m_in))
            o.data = in_cache[nm][0]
            inner = in_cache[nm][1]
            if o.name in HERO_NUDGE:                 # lib places these two inside myofibrils: move into the gap
                o.location += Vector(HERO_NUDGE[o.name])
            if o.name.startswith("fgMito"):          # the out-of-focus foreground pair: deep amber like the hero
                if nm + "_fg" not in in_cache:
                    in_cache[nm + "_fg"] = inner.copy()
                    in_cache[nm + "_fg"].materials[0] = m_in_hero
                inner = in_cache[nm + "_fg"]
                if o.name == "fgMito1":               # tilt in the screen plane: never an upright body rising from the frame edge
                    o.rotation_euler.x -= math.radians(22)
            c = L.obj_from_mesh(o.name + "_in", inner); c.parent = o
            new.append(c)
            # glowing translucent organelle: no hard shadow from the inner glow light onto the fibrils
            # (the hero itself, which holds that light, keeps its shadows: it dims its own glow)
            for x_ in (o, c):
                x_.visible_shadow = o.name == "heroMito0"
        elif nm.startswith("mitoCr"):
            if nm not in cr_cache:
                v, l_, w_ = (int(x) for x in re.match(r"mitoCr(\d+)_(\d+)_(\d+)", nm).groups())
                me = cristae_folded(nm + "_s9", length=l_ / 1e4, width=w_ / 1e4, seed=v)
                me.materials.append(m_cr)
                cr_cache[nm] = me
            o.data = cr_cache[nm]
            o.visible_shadow = o.name == "heroMito0_cr"
        elif o.name == "SR":
            soft_ttubules(o)
    return new


def inner_shell(env, mat, gap=0.075):
    """Inner boundary membrane: the envelope pulled in along its normals by `gap` x its width."""
    me = env.copy(); me.name = env.name + "_in"
    w = max(v.co.x for v in env.vertices) - min(v.co.x for v in env.vertices)
    for v, v0 in zip(me.vertices, env.vertices):
        v.co = v0.co - v0.normal * gap * w
    me.materials.clear(); me.materials.append(mat)
    me.update()
    return me


# Mitochondrion shape (round 2): an asymmetric bean, never a symmetric pointed spindle.
# Local frame as lib_s7: long axis Y; the bend and the flatter flank are in the X-Z plane along Z
# (for the hero, whose rotation is zero, Z is the screen's horizontal, so the bean reads on screen).
BEAN = dict(p=3.0, bend=0.16, flat=0.68, depth=0.92, taper=0.08)


def bean_centre(t, width):
    """Centre-line offset (z) at t = y / (L/2): a gentle ~13 deg banana bend."""
    return BEAN["bend"] * width * (1 - t * t)


def bean_radius(t, width):
    """Superellipse profile (p=3): blunt, rounded ends."""
    return width / 2 * (1 + BEAN["taper"] * t) * max(0.0, 1 - abs(t) ** BEAN["p"]) ** (1 / BEAN["p"])


def mito_bean(name, length, width, seed=0, nu=40, nv=56):
    """Envelope: blunt-ended, slightly bent bean with one flatter flank (-Z, the concave side) and
    faint organic lumps. Same length/width as the lib mesh it replaces (framing unchanged)."""
    off = Vector((seed * 3.1, seed * 1.7, 11.0))
    q = 2.0 / BEAN["p"]
    verts, faces = [], []
    verts.append((0.0, -length / 2, bean_centre(-1, width)))
    for j in range(1, nv):
        ph = math.pi * j / nv
        c_ = -math.cos(ph)
        t = math.copysign(abs(c_) ** q, c_)
        r = width / 2 * (1 + BEAN["taper"] * t) * math.sin(ph) ** q      # one end a little fuller
        zc = bean_centre(t, width)
        for i in range(nu):
            a = 2 * math.pi * i / nu
            ca, sa = math.cos(a), math.sin(a)
            lump = 1 + 0.035 * noise.noise(Vector((ca * 1.3, t * 1.6, sa * 1.3)) + off)
            x = r * BEAN["depth"] * ca * lump
            z = zc + r * sa * (1.0 if sa > 0 else BEAN["flat"] - 0.06 * (1 - t * t)) * lump   # kidney flank
            verts.append((x, t * length / 2, z))
    verts.append((0.0, length / 2, bean_centre(1, width)))
    for i in range(nu):
        faces.append((0, 1 + (i + 1) % nu, 1 + i))
    for j in range(nv - 2):
        b0, b1 = 1 + j * nu, 1 + (j + 1) * nu
        for i in range(nu):
            faces.append((b0 + i, b0 + (i + 1) % nu, b1 + (i + 1) % nu, b1 + i))
    top = len(verts) - 1; bl = 1 + (nv - 2) * nu
    for i in range(nu):
        faces.append((bl + i, bl + (i + 1) % nu, top))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])        # outward, for the inner shell offset
    bm.to_mesh(me); bm.free()
    me.update()
    for p_ in me.polygons:
        p_.use_smooth = True
    return me


CRISTAE = dict(rad=0.70, yspan=0.30, amp=0.025, cup=0.02, tilt=5.0, reach=(0.52, 0.68), reach_end=0.48)


def cristae_folded(name, length, width, seed=0):
    """Cristae = INNER folds seen through the membranes: rounded tongues rooted alternately on the
    two side walls (+Z / -Z) inside 0.70 x the local half-width, each reaching at most ~60 % across
    (the outermost ones <= 0.48), so no fold ever spans the body as a ring or collar. Folds
    undulate and tilt in depth only (X), and the y-extents of neighbours are disjoint by
    construction, so two cristae can never cross."""
    K = CRISTAE
    rng = random.Random(1000 + seed)
    th = min(0.00042, width * 0.06)
    amp, cup = K["amp"] * width, K["cup"] * width
    R0 = K["rad"] * width / 2
    ext = 1.45 * amp + cup + math.tan(math.radians(K["tilt"])) * R0 * BEAN["depth"] + th   # half y-extent
    span = 2 * K["yspan"] * length
    n = max(3, int(span / (2.3 * ext)) + 1)
    step = span / (n - 1)
    jit = max(0.0, (step - 2.15 * ext) / 2)
    bm = bmesh.new()
    NS, NA = 14, 12
    for i in range(n):
        y0 = -K["yspan"] * length + i * step + rng.uniform(-jit, jit)
        t0 = y0 / (length / 2)
        te = (abs(y0) + ext) / (length / 2)                      # narrowest point over the extent
        R = K["rad"] * bean_radius(min(1.0, te), width)
        zc = bean_centre(t0, width)
        side = 1 if (i + seed) % 2 else -1
        Rs = R * (1.0 if side > 0 else BEAN["flat"])            # the root wall
        reach = K["reach_end"] if i in (0, n - 1) else rng.uniform(*K["reach"])
        ph1, ph2 = rng.uniform(0, 6.28), rng.uniform(0, 6.28)
        tilt = math.tan(math.radians(rng.uniform(-K["tilt"], K["tilt"])))
        cu = rng.uniform(-1, 1) * cup
        pts = []
        for js in range(NS + 1):
            sfr = js / NS
            row = []
            for ja in range(NA + 1):
                a = -1 + 2 * ja / NA
                d = sfr * reach * 2 * R * (1 - 0.30 * a * a)          # distance from the root wall
                zl = side * (Rs - d)                                  # local z (from the centre line)
                Rz = R if zl > 0 else R * BEAN["flat"]
                chord = math.sqrt(max(0.0, Rz * Rz - zl * zl)) * BEAN["depth"]
                x = a * max(chord * 0.92, R * 0.15)
                yy = (y0 + amp * math.sin(x / R * 2.6 + ph1) * (0.4 + 0.6 * sfr)
                      + 0.45 * amp * math.sin(sfr * 5.0 + ph2) * abs(a) + cu * sfr * sfr + tilt * x)
                row.append((x, yy, zc + zl))
            pts.append(row)
        # a closed sac of thickness th (two layers +-th/2 in y, rim stitched; rounded by smooth shading)
        lay = [[[bm.verts.new((x, y + sg * th / 2 * (0.35 if js == NS or ja in (0, NA) else 1.0), z))
                 for ja, (x, y, z) in enumerate(row)] for js, row in enumerate(pts)] for sg in (1, -1)]
        for js in range(NS):
            for ja in range(NA):
                bm.faces.new((lay[0][js][ja], lay[0][js + 1][ja], lay[0][js + 1][ja + 1], lay[0][js][ja + 1]))
                bm.faces.new((lay[1][js][ja + 1], lay[1][js + 1][ja + 1], lay[1][js + 1][ja], lay[1][js][ja]))
        rim = ([(js, 0) for js in range(NS + 1)] + [(NS, ja) for ja in range(1, NA + 1)]
               + [(js, NA) for js in range(NS - 1, -1, -1)] + [(0, ja) for ja in range(NA - 1, 0, -1)])
        for k in range(len(rim)):
            (j0, a0), (j1, a1) = rim[k], rim[(k + 1) % len(rim)]
            bm.faces.new((lay[0][j0][a0], lay[0][j1][a1], lay[1][j1][a1], lay[1][j0][a0]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


def mat_mito_outer_s9():
    """Outer mitochondrial membrane: glossy wet amber film with SSS; nearly clear face-on and dense
    at the silhouette (a membrane seen edge-on), so the body reads as a translucent volume."""
    m, nt, p = L.mat_wet_tissue("MitoOuterS9", base=(0.34, 0.09, 0.02), sss_radius=(1.0, 0.55, 0.25),
                                sss_scale=0.0025, rough=0.32, coat=0.6, coat_rough=0.14)
    lw = L._n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.3
    pw = L._n(nt, "ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 1.6
    nt.links.new(lw.outputs["Facing"], pw.inputs[0])
    al = L._n(nt, "ShaderNodeMapRange"); al.inputs["To Min"].default_value = 0.20; al.inputs["To Max"].default_value = 0.92
    nt.links.new(pw.outputs[0], al.inputs["Value"]); nt.links.new(al.outputs[0], p.inputs["Alpha"])
    tc = L._n(nt, "ShaderNodeTexCoord")
    nz = L._n(nt, "ShaderNodeTexNoise", **{"Scale": 420.0, "Detail": 3.0})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    L._bump_chain(nt, p, [(nz.outputs["Fac"], 0.06)], distance=0.0004)
    # the matrix glow shines through the membrane where it is seen edge-on (luminous rim, not an outline)
    p.inputs["Emission Color"].default_value = (1.0, 0.36, 0.08, 1)
    em = L._n(nt, "ShaderNodeMath"); em.operation = "MULTIPLY"; em.inputs[1].default_value = MITO_VOL["rim"]
    nt.links.new(pw.outputs[0], em.inputs[0]); nt.links.new(em.outputs[0], p.inputs["Emission Strength"])
    L.fog_wrap(m)
    return m


def mat_mito_inner_s9(emit, name):
    """Inner boundary membrane: thinner, warmer, mostly clear (second rim inside the first)."""
    m, nt, p = L.mat_wet_tissue(name, base=(0.70, 0.28, 0.08), sss_radius=(1.0, 0.5, 0.2),
                                sss_scale=0.0015, rough=0.4, coat=0.3, coat_rough=0.15)
    lw = L._n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.25
    pw = L._n(nt, "ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 2.2
    nt.links.new(lw.outputs["Facing"], pw.inputs[0])
    al = L._n(nt, "ShaderNodeMapRange"); al.inputs["To Min"].default_value = 0.05; al.inputs["To Max"].default_value = 0.7
    nt.links.new(pw.outputs[0], al.inputs["Value"]); nt.links.new(al.outputs[0], p.inputs["Alpha"])
    L.fog_wrap(m)
    # matrix: homogeneous warm emission + absorption (analytic in Cycles, no ray marching): the glow
    # grows with the thickness looked through, so the body is brightest in its core and falls off to
    # the rims like a real translucent volume; the cristae inside shadow it
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
    ve = L._n(nt, "ShaderNodeEmission"); ve.name = "matrix_emit"; ve.inputs["Color"].default_value = (1.0, 0.36, 0.08, 1)
    ve.inputs["Strength"].default_value = emit
    va = L._n(nt, "ShaderNodeVolumeAbsorption"); va.inputs["Color"].default_value = (0.75, 0.22, 0.06, 1)
    va.inputs["Density"].default_value = MITO_VOL["absorb"]
    ad = L._n(nt, "ShaderNodeAddShader")
    nt.links.new(ve.outputs[0], ad.inputs[0]); nt.links.new(va.outputs[0], ad.inputs[1])
    nt.links.new(ad.outputs[0], out.inputs["Volume"])
    return m


def mat_cristae_s9(wave):
    """Cristae: warm SSS folds with a humming inner glow (energy wave on 'olup' kept); the glow is
    stronger where a fold is seen edge-on (more tissue along the ray) so the folds shade in 3-D."""
    m = L.mat_cristae_sss(wave=wave)
    m.name = "CristaeS9"
    nt = m.node_tree
    p = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]
    p.inputs["Base Color"].default_value = (0.42, 0.12, 0.025, 1)   # saturated amber folds (never cream)
    p.inputs["Emission Color"].default_value = (1.0, 0.30, 0.05, 1)
    p.inputs["Coat Weight"].default_value = 0.5
    p.inputs["Coat Roughness"].default_value = 0.12
    src = p.inputs["Emission Strength"].links[0].from_socket
    lw = L._n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.4
    sh = L._n(nt, "ShaderNodeMapRange"); sh.inputs["To Min"].default_value = 0.15; sh.inputs["To Max"].default_value = 1.1
    nt.links.new(lw.outputs["Facing"], sh.inputs["Value"])
    mm = L._n(nt, "ShaderNodeMath"); mm.operation = "MULTIPLY"
    nt.links.new(src, mm.inputs[0]); nt.links.new(sh.outputs[0], mm.inputs[1])
    nt.links.new(mm.outputs[0], p.inputs["Emission Strength"])
    return m


def soft_ttubules(so):
    """T-tubule rings: resample each 14-gon into a smooth, gently wandering loop and re-tube it
    thicker with a soft translucent membrane material (dense rim, clear core = a hollow tube)."""
    me = so.data
    adj = {v.index: [] for v in me.vertices}
    for e in me.edges:
        a, b = e.vertices
        adj[a].append(b); adj[b].append(a)
    seen, loops = set(), []
    for v0 in adj:
        if v0 in seen or len(adj[v0]) != 2:
            continue
        loop, prev, cur = [v0], None, v0
        seen.add(v0)
        while True:
            nx = [x for x in adj[cur] if x != prev]
            if not nx or nx[0] == v0:
                break
            prev, cur = cur, nx[0]
            if cur in seen:
                break
            loop.append(cur); seen.add(cur)
        pts = [Vector(me.vertices[i].co) for i in loop]
        # smooth the per-vertex jitter (radius and y) around the loop, keeping the ring's size
        c = sum(pts, Vector()) / len(pts)
        rad = [Vector((q.x - c.x, 0, q.z - c.z)).length for q in pts]
        ys = [q.y for q in pts]
        for _ in range(4):
            rad = [0.5 * rad[i] + 0.25 * (rad[i - 1] + rad[(i + 1) % len(rad)]) for i in range(len(rad))]
            ys = [0.5 * ys[i] + 0.25 * (ys[i - 1] + ys[(i + 1) % len(ys)]) for i in range(len(ys))]
        out = []
        for q, r_, y_ in zip(pts, rad, ys):
            d = Vector((q.x - c.x, 0, q.z - c.z)).normalized()
            out.append(Vector((c.x + d.x * r_, y_, c.z + d.z * r_)))
        loops.append(out)
    verts, edges = [], []
    SUB = 4
    for k, pts in enumerate(loops):
        n = len(pts); i0 = len(verts)
        for i in range(n):
            p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
            for j in range(SUB):
                t = j / SUB
                q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
                q.y += 0.00035 * noise.noise(Vector((q.x * 900, k * 1.7, q.z * 900)))
                verts.append(tuple(q))
        m_ = n * SUB
        edges += [(i0 + i, i0 + (i + 1) % m_) for i in range(m_)]
    nm = bpy.data.meshes.new("SR_s9"); nm.from_pydata(verts, edges, []); nm.update()
    mt = mat_ttubule()
    nm.materials.append(mt)
    so.data = nm
    for md in list(so.modifiers):
        so.modifiers.remove(md)
    # own mesh->curve->mesh group: lib_s7's drops the material (the old T-tubules rendered with
    # Blender's default grey material = the 'white wire' of the review)
    g = bpy.data.node_groups.new("S9_TTubes", "GeometryNodeTree"); g.is_modifier = True
    g.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    g.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    gi = g.nodes.new("NodeGroupInput"); go = g.nodes.new("NodeGroupOutput")
    m2c = g.nodes.new("GeometryNodeMeshToCurve")
    cc = g.nodes.new("GeometryNodeCurvePrimitiveCircle")
    cc.inputs["Resolution"].default_value = 10; cc.inputs["Radius"].default_value = 0.00062
    c2m = g.nodes.new("GeometryNodeCurveToMesh")
    sm = g.nodes.new("GeometryNodeSetMaterial"); sm.inputs["Material"].default_value = mt
    ss = g.nodes.new("GeometryNodeSetShadeSmooth")
    g.links.new(gi.outputs[0], m2c.inputs["Mesh"]); g.links.new(m2c.outputs[0], c2m.inputs["Curve"])
    g.links.new(cc.outputs["Curve"], c2m.inputs["Profile Curve"]); g.links.new(c2m.outputs[0], sm.inputs["Geometry"])
    g.links.new(sm.outputs[0], ss.inputs[0]); g.links.new(ss.outputs[0], go.inputs[0])
    so.modifiers.new("tubes", "NODES").node_group = g


def mat_ttubule():
    """Soft rosy membrane tube: clear core, denser rim, wet sheen; tinted like the sarcoplasm."""
    m, nt, p = L.mat_wet_tissue("TTubule", base=(0.50, 0.24, 0.23), sss_radius=(1.0, 0.6, 0.5), sss_scale=0.0008,
                                rough=0.4, coat=0.5, coat_rough=0.15)
    lw = L._n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.3
    al = L._n(nt, "ShaderNodeMapRange"); al.inputs["To Min"].default_value = 0.06; al.inputs["To Max"].default_value = 0.5
    nt.links.new(lw.outputs["Facing"], al.inputs["Value"]); nt.links.new(al.outputs[0], p.inputs["Alpha"])
    L.fog_wrap(m)
    return m


# --------------------------------------------------------------------------- helpers


def fade_group_animate(objs, frames, f0, n, name="S7_Fade", ease=True):
    """Insert a shared fade group (mix-to-transparent) into every material of `objs`; animate 1 -> 0."""
    g = bpy.data.node_groups.new(name, "ShaderNodeTree")
    g.interface.new_socket("Shader", in_out="INPUT", socket_type="NodeSocketShader")
    g.interface.new_socket("Shader", in_out="OUTPUT", socket_type="NodeSocketShader")
    gi = g.nodes.new("NodeGroupInput"); go = g.nodes.new("NodeGroupOutput")
    v = g.nodes.new("ShaderNodeValue"); v.name = "fade"; v.outputs[0].default_value = 1.0
    tr = g.nodes.new("ShaderNodeBsdfTransparent")
    mx = g.nodes.new("ShaderNodeMixShader")
    g.links.new(v.outputs[0], mx.inputs[0]); g.links.new(tr.outputs[0], mx.inputs[1]); g.links.new(gi.outputs[0], mx.inputs[2])
    g.links.new(mx.outputs[0], go.inputs[0])
    mats = set()
    for o in objs:
        if o.type == "MESH":
            for m in o.data.materials:
                if m:
                    mats.add(m)
            for c in o.children:
                if c.type == "MESH":
                    for m in c.data.materials:
                        if m:
                            mats.add(m)
    for m in mats:
        nt = m.node_tree
        out = [x for x in nt.nodes if x.type == "OUTPUT_MATERIAL"][0]
        src = out.inputs["Surface"].links[0].from_socket
        gn = nt.nodes.new("ShaderNodeGroup"); gn.node_tree = g
        nt.links.new(src, gn.inputs[0]); nt.links.new(gn.outputs[0], out.inputs["Surface"])
    k = (lambda v: C.smooth(max(0.0, v))) if ease else (lambda v: max(0.0, v))
    vals = [k(1 - (f - f0) / n) if f >= f0 else 1.0 for f in frames]
    L.bake_id(g, frames, 'nodes["fade"].outputs[0].default_value', vals)


def add_fog_glow(sc):
    """Soft 'Fog Glow' bloom on the glowing cells (compositor). Silently skipped if unavailable."""
    try:
        tree = bpy.data.node_groups.new("S7_Comp", "CompositorNodeTree")
        tree.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        rl = tree.nodes.new("CompositorNodeRLayers")
        gl = tree.nodes.new("CompositorNodeGlare")
        try:
            gl.glare_type = "FOG_GLOW"
            gl.quality = "MEDIUM"
            gl.threshold = 1.0
            gl.size = 7
            gl.mix = -0.6
        except Exception:
            for k_, v_ in (("Type", "Fog Glow"), ("Threshold", 0.6), ("Strength", 0.6), ("Size", 0.65)):
                if k_ in gl.inputs:
                    try:
                        gl.inputs[k_].default_value = v_
                    except Exception:
                        pass
        # glare only outside the fibre: strength = 0.6 * (frame > 1297.5), from the compositor's own
        # frame (stateless: identical for any job start frame)
        st = tree.nodes.new("CompositorNodeSceneTime")
        gt = tree.nodes.new("ShaderNodeMath"); gt.operation = "GREATER_THAN"; gt.inputs[1].default_value = 1297.5
        ml = tree.nodes.new("ShaderNodeMath"); ml.operation = "MULTIPLY"; ml.inputs[1].default_value = 0.6
        tree.links.new(st.outputs["Frame"], gt.inputs[0]); tree.links.new(gt.outputs[0], ml.inputs[0])
        tree.links.new(ml.outputs[0], gl.inputs["Strength"])
        go = tree.nodes.new("NodeGroupOutput")
        tree.links.new(rl.outputs["Image"], gl.inputs["Image"])
        tree.links.new(gl.outputs["Image"], go.inputs[0])
        sc.render.compositor_device = "CPU"
        sc.compositing_node_group = tree
        sc.render.use_compositing = True
        print("[sh10] fog glow on")
    except Exception as e:
        print(f"[sh10] fog glow unavailable: {e}")


def mat_membrane():
    """Hero fibre sarcolemma, built to be seen from 0.5-10 cm as the probe backs through it: a
    translucent pink-grey film with lipid-bilayer thin-film sheen, a carpet of membrane-protein
    particles (~0.5 mm in scene units), sparse caveolae pits, soft folds and
    mottling. Alpha: more transparent face-on, denser at grazing; a keyed veil factor right at the lens."""
    m, nt, p = C.new_mat("Membrane")
    B = _NB(nt)
    p.inputs["Roughness"].default_value = 0.3
    p.inputs["Coat Weight"].default_value = 0.5
    p.inputs["Coat Roughness"].default_value = 0.08
    p.inputs["Thin Film Thickness"].default_value = 420.0
    p.inputs["Thin Film IOR"].default_value = 1.45
    p.inputs["Sheen Weight"].default_value = 0.2
    tc = B.n("ShaderNodeTexCoord")
    ob = tc.outputs["Object"]
    fold = B.n("ShaderNodeTexNoise", **{"Scale": 90.0, "Detail": 3.0, "Distortion": 0.4}); B.ln(ob, fold.inputs["Vector"])
    mot = B.n("ShaderNodeTexNoise", **{"Scale": 600.0, "Detail": 4.0}); B.ln(ob, mot.inputs["Vector"])
    pv = B.n("ShaderNodeTexVoronoi", **{"Scale": 6000.0, "Randomness": 1.0}); pv.voronoi_dimensions = "3D"
    B.ln(ob, pv.inputs["Vector"])
    prot = B.m("MULTIPLY", B.mapr(pv.outputs["Distance"], 0.05, 0.4, 1.0, 0.0), B.m("GREATER_THAN", B.sep(pv.outputs["Color"])[0], 0.45))
    cv = B.n("ShaderNodeTexVoronoi", **{"Scale": 1000.0, "Randomness": 1.0}); cv.voronoi_dimensions = "3D"
    B.ln(ob, cv.inputs["Vector"])
    pit = B.m("MULTIPLY", B.mapr(cv.outputs["Distance"], 0.05, 0.22, -1.0, 0.0), B.m("GREATER_THAN", B.sep(cv.outputs["Color"])[0], 0.8))
    col = B.mix(B.mapr(mot.outputs["Fac"], 0.35, 0.65), (0.42, 0.26, 0.28, 1), (0.70, 0.50, 0.46, 1))
    col = B.mix(B.m("MULTIPLY", prot, 0.55), col, (0.85, 0.72, 0.64, 1))
    col = B.mix(B.m("MULTIPLY", pit, -0.7), col, (0.18, 0.1, 0.11, 1))
    B.ln(col, p.inputs["Base Color"])
    L._bump_chain(nt, p, [(fold.outputs["Fac"], 0.8), (pit, 0.7), (prot, 0.5)], distance=0.0002)
    lw = B.n("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.3
    al = B.mapr(lw.outputs["Facing"], 0.0, 1.0, 0.92, 0.98, smooth=False)
    al = B.m("MULTIPLY_ADD", B.m("MULTIPLY", prot, 0.12), 1.0, al)
    veil = B.n("ShaderNodeValue"); veil.name = "veil"; veil.outputs[0].default_value = 1.0
    B.ln(B.m("MINIMUM", B.m("MULTIPLY", al, veil.outputs[0]), 1.0), p.inputs["Alpha"])
    L.fog_wrap(m)
    return m


C.run("sh10", build)
