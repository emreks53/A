"""sh12 - majestic high-altitude aerial: emerge from a cloud above a living landscape.

Coordinate system: metres, +Y = toward the sun (camera looks roughly +Y), Z up, sea level z=0.
Earth curvature is applied to all ground geometry so the horizon dips like a real 1.6 km altitude.
Aerial perspective is computed per shading point (exponential-atmosphere optical depth along the
view ray, in-scatter colour sampled from the same physical sky) so far terrain melts into the sky.
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
import bpy
from mathutils import Vector, Euler, Matrix
import common as C
import lib_s8 as L

R_EARTH = 6.371e6
SUN_ELEV = 4.8             # degrees (matches the sun in the HDRI)
SUN_AZ = 0.0               # sun straight ahead (+Y)
HAZE_BETA = 1.0 / float(os.environ.get("S8_HAZE", 27000))  # sea-level haze extinction (1/m)
HAZE_H = 1500.0            # scale height of the haze (m)
HAZE_DESCENT = 1.45        # haze multiplier reached at the end of the descent
SKY_STRENGTH = float(os.environ.get("S8_SKY", 1.0))
HDRI = "kloppenheim_06_puresky"
HDRI_SUN_U = 0.6035          # equirect u of the sun in the HDRI
HDRI_ROT = float(os.environ.get("S8_HROT", -127.0))
HORIZON_DIP = math.radians(1.33)
CAM0 = Vector((0.0, 0.0, 1700.0))   # reference for curvature
sm = L.smoother_np
MODE = ["stills"]
MEADOW = (560, 1750)
TERRAIN_GRID = [None] * 5
TREE_PTS = [None]       # golden meadow the exit descends toward
SCRUB_M = [None]        # where valley-floor scrub may grow


def curv(x, y):
    return ((x - CAM0.x) ** 2 + (y - CAM0.y) ** 2) / (2 * R_EARTH)


# --------------------------------------------------------------------------- terrain field

def river_path():
    """Main river: meanders whose amplitude (200-900 m) and wavelength (0.8-2 km) drift along the course,
    one gooseneck loop near Y~4.3 km, one nearly straight reach (Y 9-10.5 km), mouth in the bay."""
    nA, nL = L.Noise2(301), L.Noise2(302)
    s_ = np.linspace(0, 1, 3000)
    ybase = -1500 + 15000 * s_
    amp = 200 + 450 * L.smoother_np((L.fbm(nA, s_ * 6, 0.5, 3) + 0.35) / 0.7)
    amp *= 1 - 0.85 * np.exp(-((ybase - 9750) / 700) ** 2)            # straight reach
    lam = 1500 + 1300 * L.smoother_np((L.fbm(nL, s_ * 5, 1.5, 3) + 0.35) / 0.7)
    dy = np.gradient(ybase)
    phase = np.cumsum(2 * np.pi * dy / lam)
    x = -900 + 1100 * s_ + amp * np.sin(phase)
    # gooseneck: curl the meander back on itself around Y = 4.3 km
    g = np.exp(-((ybase - 4300) / 650) ** 2)
    y = ybase - 520 * g * np.cos(phase) + 0 * g
    x = x + 380 * g * np.sin(phase)
    pts = np.stack([x, y], 1)
    return pts[::3]


def tributaries():
    """Two side streams joining from the hills (polylines in XY)."""
    t1 = L.catmull([(-2900, 2400), (-2300, 3000), (-1900, 3300), (-1450, 3850), (-1050, 4200)], 30)
    t2 = L.catmull([(2900, 6200), (2400, 6700), (2050, 6950), (1650, 7500), (1250, 7800)], 30)
    return [t1, t2]


def coast_y(wx, n):
    c = 11200 + 1300 * L.fbm(n, wx / 6000, 0.3, 4) + 450 * L.fbm(n, wx / 1500, 7.7, 3)
    c += 3800 * sm((wx - 2500) / 4000.0)          # headland on the right reaches further out
    c += 1500 * sm((-wx - 6000) / 5000.0)         # and a gentler one on the far left
    return c


def blob(X, Y, cx, cy, rx, ry):
    return np.exp(-(((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2))


def height_field(X, Y):
    n1, n2, n3, n4 = L.Noise2(11), L.Noise2(23), L.Noise2(37), L.Noise2(41)
    wx = X + 700 * L.fbm(n4, X / 5000, Y / 5000, 4)
    wy = Y + 700 * L.fbm(n4, X / 5000 + 5.2, Y / 5000 - 3.1, 4)

    coast = coast_y(wx, n3)
    land = 1.0 - sm((wy - (coast - 2200)) / 2600.0)     # 1 inland -> 0 offshore
    sea_floor = 1.0 - sm((wy - coast) / 600.0)

    # mountains: a high range on the left, a lower one on the right, a far coastal massif
    m_left = blob(wx, wy, -4300, 8200, 2600, 3600)
    m_right = blob(wx, wy, 3900, 6200, 2000, 2600) * 0.6 + blob(wx, wy, 4200, 12500, 2400, 2000) * 0.5
    m_far = blob(wx, wy, -3500, 13500, 2600, 1800) * 0.0
    m_mask = np.clip(m_left + m_right + m_far, 0, 1)
    ridge = L.ridged(n1, wx / 5200, wy / 5200, 8, gain=0.5, sharp=2.0)
    ero = L.erosion_fbm(n2, wx / 3600, wy / 3600, 8, gain=0.5, k=1.8)
    mountains = (np.clip(ridge, 0, 1) ** 1.35 * 3300 + (ero + 0.3) * 700) * m_mask ** 1.2
    # fine ridges/gullies on the mountain flanks (reads as eroded rock in the grazing light)
    mountains += (L.ridged(n2, wx / 700 + 7, wy / 700, 5, gain=0.5, sharp=2.5) - 0.35) * 240 * m_mask ** 1.5
    mountains += L.erosion_fbm(n1, wx / 260 + 1, wy / 260, 5, k=2.0) * 70 * m_mask

    # forested foothills everywhere on land
    hills = (L.erosion_fbm(n2, wx / 1900 + 3.3, wy / 1900 - 1.1, 8, gain=0.52, k=1.4) * 0.5 + 0.42) * 680
    hills *= 0.45 + 0.55 * sm((L.fbm(n3, wx / 7000, wy / 7000, 3) + 0.4) / 0.8)
    coastal_plain = sm((coast - 600 - wy) / 2500.0)
    h = (hills * (0.25 + 0.75 * coastal_plain) + mountains) * land + 35 * land

    # river valley carve (flat floodplain, terraces up to the hills)
    rp = river_path()
    D, T, SIDE = L.dist_to_polyline(X, Y, rp, signed=True)
    # valley-scale quantities depend on world Y (smooth everywhere), not on the nearest-point parameter T,
    # which jumps across the medial line between two meander loops and used to leave a straight terrain step
    Tn = np.clip((Y + 1500) / 15000.0, 0, 1)
    bed = 160 * (1 - Tn) ** 1.3 + 1.5
    rw = (16 + 48 * T) * np.exp(2.4 * L.fbm(n4, T * 40, 3.3, 3))   # river half width (m), varies 2-4x
    rw = rw * (1 + 0.7 * L.fbm(n3, T * 15000 / 450, 8.1, 2))        # +-35 % over 300-600 m
    # curvature sign of the course at the closest point -> inner/outer bank
    tang = np.gradient(rp, axis=0)
    curv_k = np.sign(tang[:-1, 0] * np.diff(tang[:, 1]) - tang[:-1, 1] * np.diff(tang[:, 0]))
    curv_k = np.convolve(curv_k, np.ones(9) / 9, mode="same")
    kk = np.interp(T, np.linspace(0, 1, len(curv_k)), curv_k)
    inner = (SIDE * kk) > 0.25
    vw = 160 + 700 * Tn                    # floodplain half width (m)
    rwv = 16 + 48 * Tn                     # smooth width for the valley shaping
    plain = bed + 3 + 10 * np.clip((D - rwv) / vw, 0, 1)
    f = sm((D - rwv - vw * 0.5) / (vw * 1.6 + 500))
    h = plain * (1 - f) + np.maximum(h, plain) * f
    chan = sm((D - rw * 0.5) / (rw * 1.1))
    h = (bed - 3) * (1 - chan) + h * chan
    river = 1 - sm((D - rw * (0.85 + 0.3 * L.fbm(n1, X / 90, Y / 90, 3))) / 9.0)
    # gravel/sand bars only on inner bends, partly emerged
    few = sm((L.fbm(n4, T * 25, 9.7, 2) - 0.12) / 0.08)             # only a few bends get a bar
    bar = inner * few * np.exp(-((D - rw * 0.7) / (rw * 0.35)) ** 2) * sm((L.fbm(n2, X / 60, Y / 60, 3) - 0.0) / 0.25)
    # three islands splitting the flow
    Ltot = np.sum(np.linalg.norm(np.diff(rp, axis=0), axis=1))
    isl = np.zeros_like(D)
    for Ti, wi in ((0.33, 0.45), (0.52, 0.5), (0.71, 0.4)):
        isl = np.maximum(isl, np.exp(-((D / (wi * rw)) ** 2 + ((T - Ti) * Ltot / (5.0 * rw)) ** 2)))
    isl = sm((isl - 0.45) / 0.15)
    h = h * (1 - isl) + np.maximum(h, bed + 2.5) * isl
    river = river * (1 - isl)
    bar = np.maximum(bar, isl * 0.6)
    # tributaries: narrow channels carved into the valley sides
    tribD = np.full_like(D, 1e9)
    for tp in tributaries():
        Dt, Tt = L.dist_to_polyline(X, Y, tp)
        wt = 5 + 6 * Tt
        ht = np.interp(Tt, [0, 1], [260, 0]) + 0
        tch = 1 - sm((Dt - wt) / (wt * 6))
        h = np.minimum(h, h * (1 - tch) + (np.minimum(h, bed + 2) * 0 + (bed + 2 + (1 - Tt) * 120)) * tch)
        river = np.maximum(river, 1 - sm((Dt - wt) / 4.0))
        tribD = np.minimum(tribD, Dt - wt)
    # an oxbow lake (cut-off meander) beside the river on the floodplain (Y 3-5.5 km)
    OXC = (-1900, 4600)
    ang = np.arctan2(Y - OXC[1], X - OXC[0])
    ro = np.abs(np.sqrt((X - OXC[0]) ** 2 + (Y - OXC[1]) ** 2) - 380)
    arc = sm((np.cos(ang - 0.4) + 0.35) / 0.5)
    ox = (1 - sm((ro - 22) / 8)) * arc
    h = np.where(ox > 0.01, h * (1 - ox) + (bed - 2.5) * ox, h)
    river = np.maximum(river, (1 - sm((ro - 18) / 7)) * arc)
    h = h * sea_floor + (-25 - 50 * (1 - land)) * (1 - sea_floor)
    rough = (L.fbm(n1, X / 420 + 2.5, Y / 420, 4) * 16 + L.fbm(n1, X / 140 + 0.5, Y / 140, 4) * 7 +
             L.fbm(n2, X / 35, Y / 35, 3) * 2.0)
    h = h + rough * np.clip(h / 300, 0.15, 1) * sm((D - rw) / (rw + 20.0))
    # D returned as distance from the nearest bank (main river or tributary)
    return h, river, np.minimum(D - rw, tribD), T, land, bar


def wedge_grid(rows, cols, y0, y1, half0, spread_deg, pw=2.2):
    v = np.linspace(0, 1, rows) ** pw
    Y = y0 + (y1 - y0) * v
    half = half0 + (Y - y0) * math.tan(math.radians(spread_deg))
    u = np.linspace(-1, 1, cols)
    u = np.sign(u) * np.abs(u) ** 1.25          # denser near the centre line
    X = u[None, :] * half[:, None]
    Y = np.repeat(Y[:, None], cols, 1)
    return X, Y


# --------------------------------------------------------------------------- shaders

_HDRI_PATH = {}


def hdri_path(ctx_mode):
    res = os.environ.get("S8_HRES", "16k" if ctx_mode == "final" else "8k")
    if res not in _HDRI_PATH:
        _HDRI_PATH[res] = C.ph_hdri(HDRI, res, "hdr")
    return _HDRI_PATH[res]


_LUT = []


def haze_lut():
    """1-row equirect image: per-azimuth sky colour averaged over 3-7 deg elevation of the HDRI and
    blurred over +-3 deg azimuth. Used as the in-scatter colour of the aerial perspective, so the
    haze matches the photographed sky but never picks up the HDRI's smeared below-horizon rows."""
    if _LUT:
        return _LUT[0]
    img = bpy.data.images.load(C.ph_hdri(HDRI, "1k", "hdr"), check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    r0 = int((0.5 + 3.0 / 180) * h); r1 = int((0.5 + 7.0 / 180) * h) + 1
    row = px[r0:r1, :, :3].mean(0)
    sig = 3.0 / 360 * w
    k = np.exp(-0.5 * (np.arange(-int(4 * sig), int(4 * sig) + 1) / sig) ** 2); k /= k.sum()
    ext = np.concatenate([row[-len(k):], row, row[:len(k)]], 0)
    blur = np.stack([np.convolve(ext[:, c], k, mode="same")[len(k):-len(k)] for c in range(3)], 1)
    lut = bpy.data.images.new("HazeLUT", w, 2, float_buffer=True)
    out = np.ones((2, w, 4), np.float32); out[:, :, :3] = blur[None]
    lut.pixels.foreach_set(out.ravel())
    lut.pack()
    _LUT.append(lut)
    return lut


def env_color(nb, direction, mode, image=None):
    """Sample the HDRI along a world direction (socket). The sky is shifted down by the horizon dip so
    the photographed horizon meets the curved sea horizon seen from 1.7 km."""
    sx = nb.n("ShaderNodeSeparateXYZ"); nb.l(direction, sx.inputs[0])
    cz = nb.n("ShaderNodeCombineXYZ")
    nb.l(sx.outputs[0], cz.inputs[0]); nb.l(sx.outputs[1], cz.inputs[1])
    nb.l(nb.math("ADD", sx.outputs[2], math.sin(HORIZON_DIP)), cz.inputs[2])
    mp = nb.n("ShaderNodeMapping", vector_type="VECTOR")
    mp.inputs["Rotation"].default_value[2] = math.radians(HDRI_ROT)
    nb.l(cz.outputs[0], mp.inputs["Vector"])
    nrm = nb.n("ShaderNodeVectorMath", operation="NORMALIZE"); nb.l(mp.outputs[0], nrm.inputs[0])
    env = nb.n("ShaderNodeTexEnvironment")
    env.image = image or bpy.data.images.load(hdri_path(mode), check_existing=True)
    nb.l(nrm.outputs[0], env.inputs["Vector"])
    return env.outputs["Color"]


def aerial(nb, surface_shader, k_inscatter=float(os.environ.get("S8_K", 0.7)), beta=HAZE_BETA, H=HAZE_H, lit=None):
    """Wrap a surface shader with aerial perspective: mix toward sky in-scatter by 1-exp(-tau)."""
    geo = nb.n("ShaderNodeNewGeometry")
    cam = nb.n("ShaderNodeCameraData")
    sep_p = nb.n("ShaderNodeSeparateXYZ"); nb.l(geo.outputs["Position"], sep_p.inputs[0])
    sep_i = nb.n("ShaderNodeSeparateXYZ"); nb.l(geo.outputs["Incoming"], sep_i.inputs[0])
    d = cam.outputs["View Distance"]
    iz = nb.math("MAXIMUM", sep_i.outputs[2], 0.0005)
    zp = nb.math("MAXIMUM", sep_p.outputs[2], -50.0)
    zc = nb.math("ADD", zp, nb.math("MULTIPLY", d, iz))
    ep = nb.math("EXPONENT", nb.math("MULTIPLY", zp, -1.0 / H))
    ec = nb.math("EXPONENT", nb.math("MULTIPLY", zc, -1.0 / H))
    tau = nb.math("MULTIPLY", nb.math("DIVIDE", nb.math("SUBTRACT", ep, ec), iz), beta * H)
    # a little more haze over the descent onto the valley floor (from frame 1718 on; earlier frames unchanged)
    hk = nb.n("ShaderNodeValue")
    f0, f1 = CLOUD_DRIFT
    hk.outputs[0].default_value = 1.0
    hk.outputs[0].keyframe_insert("default_value", frame=1718)
    hk.outputs[0].default_value = HAZE_DESCENT
    hk.outputs[0].keyframe_insert("default_value", frame=f1)
    tau = nb.math("MULTIPLY", tau, hk.outputs[0])
    trans = nb.math("EXPONENT", nb.math("MULTIPLY", tau, -1.0))
    fac = nb.math("SUBTRACT", 1.0, trans, clamp=True)
    # in-scatter colour: the sky just above the horizon in this azimuth
    neg = nb.n("ShaderNodeVectorMath", operation="SCALE"); neg.inputs["Scale"].default_value = -1.0
    nb.l(geo.outputs["Incoming"], neg.inputs[0])
    sx = nb.n("ShaderNodeSeparateXYZ"); nb.l(neg.outputs[0], sx.inputs[0])
    cz = nb.n("ShaderNodeCombineXYZ")
    nb.l(sx.outputs[0], cz.inputs[0]); nb.l(sx.outputs[1], cz.inputs[1])
    cz.inputs[2].default_value = 0.0
    nrm = nb.n("ShaderNodeVectorMath", operation="NORMALIZE"); nb.l(cz.outputs[0], nrm.inputs[0])
    skyc = env_color(nb, nrm.outputs[0], MODE[0], image=haze_lut())
    em = nb.n("ShaderNodeEmission", inputs={"Strength": k_inscatter * SKY_STRENGTH})
    if lit is not None:   # air columns under cloud shadow scatter less sunlight
        nb.l(nb.math("MULTIPLY", nb.math("ADD", nb.math("MULTIPLY", lit, 0.6), 0.55), k_inscatter * SKY_STRENGTH), em.inputs["Strength"])
    nb.l(skyc, em.inputs["Color"])
    mix = nb.n("ShaderNodeMixShader")
    nb.l(fac, mix.inputs[0])
    nb.l(surface_shader, mix.inputs[1])
    nb.l(em.outputs[0], mix.inputs[2])
    return mix.outputs[0], fac


_TEXMEAN = {}


def aerial_scan(nb, pos, name, tile, rot_deg=0.0, res="2k"):
    """Poly Haven aerial photo scan (CC0) mapped in world XY at `tile` metres, returned normalised to a
    mean of 1 so it modulates our palette (photographic structure, art-directed colour)."""
    tex = C.ph_texture(name, res)
    img = bpy.data.images.load(tex["diff"], check_existing=True)
    if name not in _TEXMEAN:
        px = np.empty(img.size[0] * img.size[1] * 4, np.float32)
        img.pixels.foreach_get(px)
        _TEXMEAN[name] = px.reshape(-1, 4)[::7, :3].mean(0)
    mp = nb.n("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / tile, 1 / tile, 1 / tile)
    mp.inputs["Rotation"].default_value[2] = math.radians(rot_deg)
    nb.l(pos, mp.inputs["Vector"])
    t = nb.n("ShaderNodeTexImage")
    t.image = img
    nb.l(mp.outputs[0], t.inputs["Vector"])
    mean = _TEXMEAN[name]
    norm = nb.mixc(1.0, t.outputs["Color"], tuple(float(1 / max(1e-3, v)) for v in mean), blend="MULTIPLY")
    return norm


def scan_mix(nb, pos, name, tile, mixnoise):
    """Two tilings (different scale/rotation) blended by a macro noise so repetition never shows."""
    return nb.mixc(mixnoise, aerial_scan(nb, pos, name, tile, 0), aerial_scan(nb, pos, name, tile * 3.3, 37))


CLOUD_DRIFT = [0.0, 0.0]   # (frame0, frame1) set in build


def cloud_light(nb, pos):
    """Cloud-shadow mask for the shading point: project it along the sun direction onto a cloud layer at
    2.6 km and sample a drifting noise there (1 = sunlit patch, 0 = under a cloud shadow)."""
    st = 1 / math.tan(math.radians(SUN_ELEV))
    sep = nb.n("ShaderNodeSeparateXYZ"); nb.l(pos, sep.inputs[0])
    qy = nb.math("ADD", sep.outputs[1], nb.math("MULTIPLY", nb.math("SUBTRACT", 2600.0, sep.outputs[2]), st))
    v = nb.n("ShaderNodeCombineXYZ")
    drift = nb.n("ShaderNodeValue")
    f0, f1 = CLOUD_DRIFT
    drift.outputs[0].default_value = 0.0
    drift.outputs[0].keyframe_insert("default_value", frame=f0)
    drift.outputs[0].default_value = -10.0 * (f1 - f0) / C.FPS
    drift.outputs[0].keyframe_insert("default_value", frame=f1)
    for fc in C._fcurves(nb.nt.animation_data.action):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    nb.l(nb.math("MULTIPLY", nb.math("ADD", sep.outputs[0], drift.outputs[0]), 1 / 1700.0), v.inputs[0])
    nb.l(nb.math("MULTIPLY", qy, 1 / (1700.0 * st)), v.inputs[1])
    nz = nb.n("ShaderNodeTexNoise", noise_dimensions="3D")
    nz.inputs["Scale"].default_value = 1.0
    nz.inputs["Detail"].default_value = 3.0
    nz.inputs["Roughness"].default_value = 0.55
    nb.l(v.outputs[0], nz.inputs["Vector"])
    return nb.mapr(nz.outputs["Fac"], 0.56, 0.44)


def terrain_material():
    m = bpy.data.materials.new("Terrain")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputMaterial")
    geo = nb.n("ShaderNodeNewGeometry")
    tc = nb.n("ShaderNodeTexCoord")
    pos = geo.outputs["Position"]
    sep = nb.n("ShaderNodeSeparateXYZ"); nb.l(geo.outputs["Normal"], sep.inputs[0])
    nz = sep.outputs[2]
    sp = nb.n("ShaderNodeSeparateXYZ"); nb.l(pos, sp.inputs[0])
    z = sp.outputs[2]
    hgt = nb.attr("h")              # uncurved height above sea
    forest = nb.attr("forest")
    meadow = nb.attr("meadow")
    river = nb.attr("river")

    n_big = nb.noise(pos, 1 / 900.0, 3, 0.6)
    n_mid = nb.noise(pos, 1 / 120.0, 3, 0.6)
    n_fine = nb.noise(pos, 1 / 9.0, 2, 0.6)

    steep = nb.mapr(nz, 0.86, 0.70)                    # 1 on steep slopes (rock)
    steep = nb.math("ADD", steep, nb.math("MULTIPLY", nb.math("SUBTRACT", n_mid, 0.5), 0.6), clamp=True)
    snow = nb.mapr(nb.math("ADD", hgt, nb.math("MULTIPLY", n_big, 500)), 2350, 2650)
    snow = nb.math("MULTIPLY", snow, 0.0)      # no snow decals
    beach = nb.math("MULTIPLY", nb.mapr(hgt, 7, 2.5), nb.mapr(hgt, -8, -1))

    n_clump = nb.noise(pos, 1 / 38.0, 2, 0.55)
    n_patch = nb.noise(pos, 1 / 300.0, 2, 0.6)
    lush = (0.075, 0.135, 0.030)
    lush2 = (0.12, 0.165, 0.045)
    dry = (0.30, 0.245, 0.10)
    gold = (0.46, 0.35, 0.12)
    forest_c = (0.04, 0.085, 0.03)
    rock_a = (0.20, 0.18, 0.16)
    rock_b = (0.10, 0.095, 0.09)
    col = nb.mixc(n_mid, lush, lush2)
    col = nb.mixc(nb.math("MULTIPLY", nb.mapr(n_big, 0.56, 0.72), 0.7), col, dry)
    col = nb.mixc(nb.math("MULTIPLY", nb.mapr(n_patch, 0.55, 0.7), 0.6), col, (0.20, 0.19, 0.07))
    col = nb.mixc(nb.math("MULTIPLY", nb.mapr(hgt, 700, 1500), 0.85), col, (0.17, 0.15, 0.10))
    # meadows green-gold; true gold only on the knolls (high mid-scale noise)
    col = nb.mixc(meadow, col, (0.20, 0.30, 0.07))
    col = nb.mixc(nb.math("MULTIPLY", meadow, nb.mapr(n_mid, 0.6, 0.75, 0.0, 0.5)), col, (0.30, 0.31, 0.09))
    col = nb.mixc(nb.math("MULTIPLY", forest, nb.mapr(n_fine, 0.25, 0.7, 0.75, 1.0)), col, forest_c)
    # photographic ground structure from real aerial scans (grass/rock/scrub, bare ground)
    mixn = nb.mapr(n_big, 0.4, 0.6)
    g_scan = scan_mix(nb, pos, "aerial_grass_rock", 600.0, mixn)
    d_scan = scan_mix(nb, pos, "aerial_ground_rock", 900.0, mixn)
    scan = nb.mixc(nb.mapr(n_patch, 0.45, 0.65), g_scan, d_scan)
    scan = nb.mixc(0.25, scan, (1, 1, 1))
    # in the meadow, clamp the scan's pale rock/decal patches so they read as grass, not paper scraps
    scan = nb.mixc(meadow, scan, nb.mixc(1.0, scan, (1.02, 1.02, 1.02), blend="DARKEN"))
    col = nb.mixc(1.0, col, scan, blend="MULTIPLY")
    # near-ground grass/scrub micro-structure: tussock clumps, scrub speckle and fresh/dry patches at the
    # 2-40 m scale a 1.5 km aerial resolves; faded out with view distance (sub-pixel there anyway)
    camd = nb.n("ShaderNodeCameraData")
    lod = nb.math("MULTIPLY", nb.mapr(camd.outputs["View Distance"], 5200.0, 2800.0), nb.math("SUBTRACT", 1.0, forest))
    tus = nb.mapr(nb.noise(pos, 1 / 4.5, 4, 0.62), 0.38, 0.66)        # grass tussocks / bare gaps
    n_sp = nb.noise(pos, 1 / 6.0, 3, 0.6)
    speck = nb.math("MULTIPLY", nb.mapr(n_sp, 0.60, 0.68), nb.mapr(nb.noise(pos, 1 / 70.0, 3, 0.6), 0.42, 0.6))
    n_pt = nb.noise(pos, 1 / 26.0, 4, 0.65)
    gm = nb.mixc(n_pt, (0.80, 0.90, 0.78), (1.16, 1.08, 0.90))
    gm = nb.mixc(nb.mapr(n_clump, 0.35, 0.65), gm, nb.mixc(1.0, gm, (0.85, 0.92, 0.82), blend="MULTIPLY"))
    gm = nb.mixc(1.0, gm, nb.mixc(tus, (0.74, 0.80, 0.74), (1.12, 1.10, 1.0)), blend="MULTIPLY")
    gm = nb.mixc(speck, gm, (0.30, 0.36, 0.26))
    col = nb.mixc(lod, col, nb.mixc(1.0, col, gm, blend="MULTIPLY"))
    # stratified rock on steep ground; mountains get rock/scree earlier
    steep2 = nb.math("ADD", steep, nb.math("MULTIPLY", nb.mapr(hgt, 600, 1500), nb.mapr(nz, 0.95, 0.82)), clamp=True)
    wv = nb.n("ShaderNodeTexWave", wave_type="BANDS", bands_direction="Z", wave_profile="SIN")
    wv.inputs["Scale"].default_value = 1 / 70.0
    wv.inputs["Distortion"].default_value = 8.0
    wv.inputs["Detail"].default_value = 2.0
    wv.inputs["Detail Scale"].default_value = 1.5
    nb.l(pos, wv.inputs["Vector"])
    rock = nb.mixc(nb.math("ADD", nb.math("MULTIPLY", wv.outputs["Fac"], 0.6), nb.math("MULTIPLY", n_fine, 0.4)), rock_a, rock_b)
    rock = nb.mixc(1.0, rock, scan_mix(nb, pos, "aerial_rocks_04", 1200.0, mixn), blend="MULTIPLY")
    # scrub/grass patches clinging to the rock, darker gullies, pale scree fans
    n_veg = nb.noise(pos, 1 / 55.0, 3, 0.6)
    rock = nb.mixc(nb.math("MULTIPLY", nb.mapr(n_veg, 0.48, 0.62), nb.mapr(nz, 0.45, 0.75)), rock, (0.05, 0.075, 0.03))
    rock = nb.mixc(nb.mapr(nb.noise(pos, 1 / 160.0, 3, 0.6), 0.58, 0.7), rock, (0.17, 0.16, 0.14))
    rock = nb.mixc(1.0, rock, nb.mixc(nb.noise(pos, 1 / 25.0, 2, 0.5), (0.6, 0.6, 0.6), (1.3, 1.3, 1.3)), blend="MULTIPLY")
    col = nb.mixc(steep2, col, rock)
    # gravel bars and bare banks along the river, beaches on the coast
    bars = nb.mapr(nb.attr("bar"), 0.25, 0.6)
    barcol = nb.mixc(1.0, (0.13, 0.11, 0.08), aerial_scan(nb, pos, "aerial_ground_rock", 90.0, 23), blend="MULTIPLY")
    col = nb.mixc(bars, col, barcol)
    col = nb.mixc(beach, col, (0.46, 0.41, 0.31))
    surf = nb.math("MULTIPLY", nb.mapr(hgt, -3.5, -1.2), nb.mapr(hgt, 0.6, -0.4))
    surf = nb.math("MULTIPLY", surf, nb.mapr(nb.noise(pos, 1 / 40.0, 3, 0.6), 0.35, 0.6))
    col = nb.mixc(surf, col, (0.75, 0.76, 0.76))
    col = nb.mixc(snow, col, (0.82, 0.84, 0.88))
    col = nb.mixc(nb.math("MULTIPLY", n_fine, 0.25), col, (0.05, 0.05, 0.04), blend="MULTIPLY")
    # sunlit patches (warm raking light) vs. cloud shadow (cool, dimmer)
    lit = nb.math("MAXIMUM", cloud_light(nb, pos), nb.math("MULTIPLY", meadow, 0.9))   # the meadow lies in sun
    col = nb.mixc(1.0, col, nb.mixc(lit, (0.72, 0.76, 0.84), (1.15, 1.1, 0.92)), blend="MULTIPLY")

    bsdf = nb.n("ShaderNodeBsdfPrincipled")
    nb.l(col, bsdf.inputs["Base Color"])
    rough = nb.mapr(snow, 0, 1, 0.9, 0.55)
    nb.l(rough, bsdf.inputs["Roughness"])
    bump = nb.n("ShaderNodeBump", inputs={"Strength": 0.6, "Distance": 2.0})
    bh = nb.math("ADD", nb.math("MULTIPLY", n_fine, 1.0), nb.math("MULTIPLY", forest, nb.noise(pos, 1 / 6.0, 2, 0.5)))
    micro = nb.math("ADD", nb.math("MULTIPLY", tus, 0.25), nb.math("MULTIPLY", speck, 0.5))
    bh = nb.math("ADD", bh, nb.math("MULTIPLY", micro, lod))
    nb.l(bh, bump.inputs["Height"])
    nb.l(bump.outputs[0], bsdf.inputs["Normal"])

    # river water: dark glossy mirror of the sky
    water = nb.n("ShaderNodeBsdfPrincipled", inputs={"Base Color": (0.025, 0.03, 0.02, 1), "Roughness": 0.09,
                                                      "Specular IOR Level": 0.32, "IOR": 1.333})
    wb = nb.n("ShaderNodeBump", inputs={"Strength": 0.4, "Distance": 0.2})
    nb.l(nb.noise(pos, 1 / 3.0, 3, 0.5), wb.inputs["Height"])
    nb.l(wb.outputs[0], water.inputs["Normal"])
    mixw = nb.n("ShaderNodeMixShader")
    nb.l(nb.mapr(nb.noise(pos, 1 / 40.0, 3, 0.6), 0.35, 0.65, 0.04, 0.3), water.inputs["Roughness"])
    nb.l(nb.math("MULTIPLY", nb.mapr(river, 0.3, 0.7), nb.math("SUBTRACT", 1.0, bars)), mixw.inputs[0])
    nb.l(bsdf.outputs[0], mixw.inputs[1])
    nb.l(water.outputs[0], mixw.inputs[2])

    sh = aerial(nb, mixw.outputs[0], lit=lit)[0]
    nb.l(sh, out.inputs["Surface"])
    return m


def sea_material():
    m = bpy.data.materials.new("Sea")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputMaterial")
    geo = nb.n("ShaderNodeNewGeometry")
    pos = geo.outputs["Position"]
    # wave normals: several directional wave trains + noise chop
    w = nb.n("ShaderNodeTexWave", wave_type="BANDS", bands_direction="DIAGONAL", wave_profile="SIN")
    w.inputs["Scale"].default_value = 1 / 60.0
    w.inputs["Distortion"].default_value = 6.0
    w.inputs["Detail"].default_value = 4.0
    w.inputs["Detail Scale"].default_value = 2.0
    nb.l(pos, w.inputs["Vector"])
    chop = nb.math("ADD", nb.noise(pos, 1 / 14.0, 6, 0.62), nb.math("MULTIPLY", nb.noise(pos, 1 / 220.0, 3, 0.5), 2.0))
    fine = nb.n("ShaderNodeBump", inputs={"Strength": 0.25, "Distance": 0.2})
    nb.l(nb.noise(pos, 4.0, 2, 0.5), fine.inputs["Height"])
    hh = nb.math("ADD", nb.math("MULTIPLY", w.outputs["Fac"], 0.7), chop)
    bump = nb.n("ShaderNodeBump", inputs={"Strength": 0.7, "Distance": 1.0})
    nb.l(hh, bump.inputs["Height"])
    nb.l(fine.outputs[0], bump.inputs["Normal"])
    bsdf = nb.n("ShaderNodeBsdfPrincipled", inputs={"Base Color": (0.004, 0.018, 0.03, 1), "Roughness": 0.13,
                                                     "IOR": 1.333, "Specular IOR Level": 0.2})
    # water from the first frame: a faint sun glint under the veil (the glint core saturates at any level
    # above ~1e-3, its visible range is ~1e-6..1e-3), then it swells in geometric steps to full strength on
    # the link_sea beat (64.88 s = f1557); exactly 0.2 from f1560 (frames from 1560 on are unchanged)
    spec_in = bsdf.inputs["Specular IOR Level"]
    for f in range(1552, 1561):
        spec_in.default_value = 3e-5 * (0.2 / 3e-5) ** ((f - 1552) / 8.0) if f < 1560 else 0.2
        spec_in.keyframe_insert("default_value", frame=f)
    for fc in C._fcurves(nt.animation_data.action):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    nb.l(bump.outputs[0], bsdf.inputs["Normal"])
    wind = nb.noise(pos, 1 / 700.0, 5, 0.6)
    nb.l(nb.mapr(wind, 0.35, 0.7, 0.06, 0.22), bsdf.inputs["Roughness"])
    sh, _ = aerial(nb, bsdf.outputs[0], lit=cloud_light(nb, pos))
    nb.l(sh, out.inputs["Surface"])
    return m


def build_world(mode):
    w = bpy.context.scene.world
    nt = w.node_tree
    nt.nodes.clear()
    nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputWorld")
    tc = nb.n("ShaderNodeTexCoord")
    col = env_color(nb, tc.outputs["Generated"], mode)
    bg = nb.n("ShaderNodeBackground", inputs={"Strength": SKY_STRENGTH})
    nb.l(col, bg.inputs["Color"])
    nb.l(bg.outputs[0], out.inputs["Surface"])


# --------------------------------------------------------------------------- build

def cached_field(rows, cols):
    """Height field evaluation is ~1 min; cache it keyed by the generating source code."""
    import hashlib, inspect
    src = open(os.path.abspath(__file__), encoding="utf-8").read() + inspect.getsource(L) + f"{rows}x{cols}"
    key = hashlib.md5(src.encode()).hexdigest()[:12]
    d = os.path.join(C.ASSETS, "cache"); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, f"sh12_field_{key}.npz")
    X, Y = wedge_grid(rows, cols, -1200, 62000, 1500, 31, pw=2.1)
    if os.path.exists(p):
        z = np.load(p)
        return X, Y, z["h"], z["river"], z["D"], z["T"], z["land"], z["bar"]
    h, river, D, T, land, bar = height_field(X, Y)
    tmp = p[:-4] + f".tmp{os.getpid()}.npz"
    np.savez(tmp, h=h, river=river, D=D, T=T, land=land, bar=bar)
    os.replace(tmp, p)        # atomic: parallel renders never read a half-written cache
    return X, Y, h, river, D, T, land, bar


def build_terrain(ctx):
    rows, cols = (1900, 1300) if ctx.mode == "final" else (1500, 1000)
    if ctx.mode == "animatic":
        rows, cols = 900, 600
    if os.environ.get("S8_LOWRES"):
        rows, cols = 700, 480
    X, Y, h, river, D, T, land, bar = cached_field(rows, cols)
    # forest / meadow masks (as attributes, also drive tree scattering)
    n5 = L.Noise2(77)
    fn = L.fbm(n5, X / 1800, Y / 1800, 5)
    dhy = np.gradient(h, axis=0) / np.maximum(np.gradient(Y, axis=0), 1e-3)
    dhx = np.gradient(h, axis=1) / np.maximum(np.gradient(X, axis=1), 1e-3)
    slope = np.sqrt(dhx ** 2 + dhy ** 2)
    forest = np.clip((fn + 0.12) * 4, 0, 1) * sm((1500 - h) / 300) * sm((h - 4) / 20) * sm((D - 30) / 60)
    forest *= sm((0.85 - slope) / 0.25)
    # riparian woodland: a dense, slightly broken belt of trees lining both banks
    rip = np.exp(-((D - 10) / 10) ** 2) * sm(D / 2.0) * np.clip(0.55 + 0.8 * L.fbm(n5, X / 250 + 3, Y / 250, 3), 0, 1)
    forest = np.maximum(forest, rip * (h > 1.5) * (Y < 12500))
    meadow_c = np.exp(-(((X - MEADOW[0]) / 1050) ** 2 + ((Y - MEADOW[1]) / 850) ** 2))
    meadow = np.clip(meadow_c * 1.6 - 0.1 + 0.3 * L.fbm(n5, X / 300, Y / 300, 3), 0, 1)
    forest = forest * (1 - meadow)
    openm = np.clip(1 - forest * 1.4, 0, 1) * sm((h - 6) / 10) * sm((D - 25) / 30) * sm((0.7 - slope) / 0.2)
    openm = openm * np.clip(0.5 + 0.9 * L.fbm(n5, X / 700 + 9, Y / 700, 3), 0, 1)
    SCRUB_M[0] = openm * (1 - 0.75 * sm((meadow_c - 0.7) / 0.25))      # scrub may enter the meadow fringe
    openm = openm * (1 - meadow)
    Z = h - curv(X, Y)
    ob = L.grid_mesh("Terrain", X, Y, Z, {"h": h, "forest": forest, "meadow": meadow, "river": river, "bar": bar})
    C.assign(ob, terrain_material() if not os.environ.get("S8_PLAINT") else C.principled("plainT", (0.1, 0.12, 0.05)))
    TERRAIN_GRID[:] = [X, Y, Z, rows, cols]
    return ob, (X, Y, Z, forest, rows, cols, openm)


def tree_material(name="TreeCrown", trans=0.45, tmul=(3.2, 3.4, 1.3), dark=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputMaterial")
    oi = nb.n("ShaderNodeObjectInfo")
    geo = nb.n("ShaderNodeNewGeometry")
    rnd = oi.outputs["Random"]
    grp = nb.mapr(nb.noise(geo.outputs["Position"], 1 / 180.0, 2, 0.5), 0.45, 0.62)
    c1 = nb.mixc(rnd, (0.045, 0.080, 0.026), (0.085, 0.125, 0.034))
    c1 = nb.mixc(grp, c1, (0.13, 0.16, 0.045))
    c2 = nb.mixc(nb.mapr(rnd, 0.8, 1.0), c1, (0.09, 0.085, 0.03))      # a few yellowing crowns
    tint = nb.mixc(nb.noise(geo.outputs["Position"], 1 / 3.0, 3, 0.5), (0.7, 0.7, 0.7), (1.15, 1.15, 1.15), blend="MULTIPLY")
    col = nb.mixc(1.0, c2, tint, blend="MULTIPLY")
    if dark != 1.0:
        col = nb.mixc(1.0, col, (dark, dark, dark), blend="MULTIPLY")
    tlit = cloud_light(nb, geo.outputs["Position"])
    col = nb.mixc(1.0, col, nb.mixc(tlit, (0.72, 0.76, 0.84), (1.15, 1.1, 0.92)), blend="MULTIPLY")
    dif = nb.n("ShaderNodeBsdfDiffuse"); nb.l(col, dif.inputs["Color"])
    tr = nb.n("ShaderNodeBsdfTranslucent")
    tcol = nb.mixc(1.0, col, tmul, blend="MULTIPLY")
    nb.l(tcol, tr.inputs["Color"])
    mx = nb.n("ShaderNodeMixShader", inputs={0: trans})
    nb.l(dif.outputs[0], mx.inputs[1]); nb.l(tr.outputs[0], mx.inputs[2])
    sh = aerial(nb, mx.outputs[0], lit=tlit)[0]
    nb.l(sh, out.inputs["Surface"])
    return m


def make_tree_variants(seed=5, name="TreeVariants", mat=None):
    """Low-poly conifers and broadleaf crowns, unit-ish size (height ~1), origin at the base."""
    import bmesh
    rnd = random.Random(seed)
    col = bpy.data.collections.new(name)      # not linked to the scene: instancing source only
    mat = mat or tree_material()
    objs = []
    for k in range(8):
        bm = bmesh.new()
        conifer = k < 3
        if k >= 6:      # low rounded scrub / bush
            res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.5)
            for v in res["verts"]:
                d = v.co.normalized()
                f = 1 + 0.2 * math.sin(d.x * 6 + k) * math.sin(d.y * 5 - k) + rnd.uniform(-0.08, 0.08)
                v.co = v.co * f
                v.co.z = v.co.z * 0.6 + 0.25
            me = bpy.data.meshes.new(f"tree{k}")
            bm.to_mesh(me); bm.free()
            ob = bpy.data.objects.new(f"tree{k}", me)
            ob.data.materials.append(mat)
            col.objects.link(ob)
            objs.append(ob)
            continue
        if conifer:
            tiers = 4
            for t in range(tiers):
                z0 = 0.12 + t * 0.2
                r = 0.23 * (1 - t / (tiers + 0.6)) * rnd.uniform(0.85, 1.1)
                hgt = 0.38
                res = bmesh.ops.create_cone(bm, cap_ends=True, segments=7, radius1=r, radius2=0.0, depth=hgt)
                for v in res["verts"]:
                    v.co.z += z0 + hgt / 2
                    v.co.x += rnd.uniform(-0.02, 0.02)
                    v.co.y += rnd.uniform(-0.02, 0.02)
        else:
            res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.3)
            for v in res["verts"]:
                d = v.co.normalized()
                f = 1 + 0.18 * math.sin(d.x * 7 + k) * math.sin(d.y * 6 - k) + rnd.uniform(-0.06, 0.06)
                v.co = v.co * f
                v.co.z = v.co.z * 1.05 + 0.62
            for j in range(2):
                res = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=rnd.uniform(0.15, 0.22))
                ox, oy = rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2)
                for v in res["verts"]:
                    v.co.x += ox; v.co.y += oy; v.co.z += rnd.uniform(0.45, 0.75)
        res = bmesh.ops.create_cone(bm, cap_ends=False, segments=5, radius1=0.025, radius2=0.015, depth=0.3)
        for v in res["verts"]:
            v.co.z += 0.15
        me = bpy.data.meshes.new(f"tree{k}")
        bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(f"tree{k}", me)
        ob.data.materials.append(mat)
        col.objects.link(ob)
        objs.append(ob)
    return col


def build_trees(ctx, grid):
    X, Y, Z, forest, rows, cols, openm = grid
    rs = np.random.RandomState(99)
    pts = []
    # bands of distance: density per m^2 falls with distance (far trees are sub-pixel anyway)
    for (ya, yb, dens) in ((-600, 2500, 1 / 70.0), (2500, 5000, 1 / 95.0), (5000, 8000, 1 / 150.0), (8000, 12500, 1 / 320.0)):
        half_b = 1500 + (yb + 1200) * math.tan(math.radians(31))
        area = (yb - ya) * 2 * half_b
        n = int(area * dens)
        if ctx.mode == "animatic" or os.environ.get("S8_LOWRES"):
            n //= 6
        px = rs.uniform(-half_b, half_b, n)
        py = rs.uniform(ya, yb, n)
        pts.append((px, py))
    px = np.concatenate([p[0] for p in pts]); py = np.concatenate([p[1] for p in pts])
    args = (X, Y, -1200, 62000, 2.1, rows, cols, 1500, 31)
    fm = L.interp_grid(forest, X, Y, px, py, *args[2:])
    keep = rs.uniform(0, 1, len(px)) < fm ** 1.3
    px, py = px[keep], py[keep]
    pz = L.interp_grid(Z, X, Y, px, py, *args[2:]) - 0.6
    n = len(px)
    TREE_PTS[0] = np.stack([px, py, pz], 1)
    var = rs.randint(0, 6, n)
    # conifers more likely higher up
    hz = L.interp_grid(forest * 0 + Z, X, Y, px, py, *args[2:])
    con = rs.uniform(0, 1, n) < np.clip(0.25 + hz / 1400, 0, 0.9)
    var = np.where(con, rs.randint(0, 3, n), rs.randint(3, 6, n))
    scale = rs.uniform(12, 26, n) * np.where(con, 1.15, 0.85)
    # lone trees and scrub on the open land (long golden-hour shadows = scale + realism cue)
    extra = []
    for dens, kind, ymax in ((1 / 10000.0 * 3.0, "lone", 9000), (1 / 250.0, "bush", 6500)):
        half_b = 1500 + (ymax + 1200) * math.tan(math.radians(31))
        m_ = int((ymax + 600) * 2 * half_b * dens)
        if ctx.mode == "animatic" or os.environ.get("S8_LOWRES"):
            m_ //= 6
        qx = rs.uniform(-half_b, half_b, m_); qy = rs.uniform(-600, ymax, m_)
        om = L.interp_grid(openm, X, Y, qx, qy, *args[2:])
        k = rs.uniform(0, 1, m_) < om
        qx, qy = qx[k], qy[k]
        qz = L.interp_grid(Z, X, Y, qx, qy, *args[2:]) - 0.3
        mm = len(qx)
        if kind == "lone":
            # lone trees follow drainage lines (ridged-noise valleys), not an even sprinkle
            dl = L.ridged(L.Noise2(77), qx / 650, qy / 650, 3)
            k2 = rs.uniform(0, 1, mm) < np.clip((dl - 0.62) * 4, 0, 1)
            qx, qy, qz = qx[k2], qy[k2], qz[k2]
            mm = len(qx)
            qv = rs.randint(3, 6, mm); qs = rs.uniform(10, 21, mm)
        else:
            # scrub grows in clumps (hedges, gully lines), not as an even polka-dot pattern
            nn = L.Noise2(123)
            cl = L.fbm(nn, qx / 160, qy / 160, 4)
            keep2 = rs.uniform(0, 1, mm) < np.clip((cl - 0.12) * 4, 0, 1)
            qx, qy, qz = qx[keep2], qy[keep2], qz[keep2]
            mm = len(qx)
        if kind != "lone":
            qv = rs.randint(6, 8, mm); qs = rs.uniform(3, 8, mm)
        extra.append((qx, qy, qz, qv, qs))
    for qx, qy, qz, qv, qs in extra:
        px = np.concatenate([px, qx]); py = np.concatenate([py, qy]); pz = np.concatenate([pz, qz])
        var = np.concatenate([var, qv]); scale = np.concatenate([scale, qs])
    n = len(px)
    rot = rs.uniform(0, 2 * np.pi, n)
    me = bpy.data.meshes.new("TreePts")
    me.vertices.add(n)
    me.vertices.foreach_set("co", np.stack([px, py, pz], 1).astype(np.float32).ravel())
    for name, arr, typ in (("tscale", scale, "FLOAT"), ("trot", rot, "FLOAT"), ("tvar", var, "INT")):
        a = me.attributes.new(name, typ, "POINT")
        a.data.foreach_set("value", arr.astype(np.float32 if typ == "FLOAT" else np.int32))
    me.update()
    ob = bpy.data.objects.new("Trees", me)
    bpy.context.scene.collection.objects.link(ob)
    scatter_instances(ob, make_tree_variants())
    print(f"[sh12] trees: {n}", flush=True)
    build_scrub(ctx, grid, extra[0])
    return ob


def build_scrub(ctx, grid, lone):
    """Valley floor the camera descends onto: copses around the lone trees and dense clumped scrub /
    young trees (hedges, gully lines, thickets), so nothing reads as isolated sprites. Own RNG, so the
    trees above (and the trackers that use them) are unchanged."""
    X, Y, Z, forest, rows, cols, openm = grid
    args = (-1200, 62000, 2.1, rows, cols, 1500, 31)
    rs = np.random.RandomState(1207)
    low = ctx.mode == "animatic" or os.environ.get("S8_LOWRES")
    P = []      # (x, y, var, scale)
    # copses: each lone tree becomes the edge of a small stand of trees with scrub underneath
    lx, ly = lone[0], lone[1]
    for i in range(len(lx)):
        if ly[i] > 8000:
            continue
        nt_, nb_ = rs.poisson(12), rs.poisson(30)
        r = rs.uniform(6, 14)
        P.append((lx[i] + rs.normal(0, r, nt_), ly[i] + rs.normal(0, r * 0.8, nt_), rs.randint(3, 6, nt_), rs.uniform(7, 19, nt_)))
        P.append((lx[i] + rs.normal(0, r * 1.5, nb_), ly[i] + rs.normal(0, r * 1.2, nb_), rs.randint(6, 8, nb_), rs.uniform(2.5, 6, nb_)))
    # thickets and hedge-like scrub lines: clump centres, each a tight elongated cluster of overlapping
    # bushes that merges into one dark mass with one shared shadow (plus a few young trees)
    half_b = 1500 + (7000 + 1200) * math.tan(math.radians(31))
    nc = int(7600 * 2 * half_b / 5000.0)
    if low:
        nc //= 6
    cx = rs.uniform(-half_b, half_b, nc); cy = rs.uniform(-600, 7000, nc)
    cl = L.fbm(L.Noise2(131), cx / 400, cy / 400, 3)
    ck = rs.uniform(0, 1, nc) < np.clip((cl + 0.15) * 2.5, 0, 1) * np.where(cy < 4000, 1.0, 0.5)
    cx, cy = cx[ck], cy[ck]
    for i in range(len(cx)):
        nb_ = rs.poisson(rs.uniform(40, 80)); nt_ = rs.poisson(2.5)
        r = rs.uniform(3, 8); el = rs.uniform(1, 3); a_ = rs.uniform(0, np.pi)
        for cnt, kind in ((nb_, 0), (nt_, 1)):
            u = rs.normal(0, r * el, cnt); v = rs.normal(0, r, cnt)
            x = cx[i] + u * math.cos(a_) - v * math.sin(a_); y = cy[i] + u * math.sin(a_) + v * math.cos(a_)
            if kind == 0:
                P.append((x, y, rs.randint(6, 8, cnt), rs.uniform(3.0, 7.0, cnt)))
            else:
                P.append((x, y, rs.randint(3, 6, cnt), rs.uniform(6, 13, cnt)))
    px = np.concatenate([p[0] for p in P]); py = np.concatenate([p[1] for p in P])
    var = np.concatenate([p[2] for p in P]); scale = np.concatenate([p[3] for p in P])
    # only on open grassland / meadow fringe / forest edges, never in the river or on steep rock
    om = L.interp_grid(SCRUB_M[0], X, Y, px, py, *args)
    fm = L.interp_grid(forest, X, Y, px, py, *args)
    k = (om * 1.5 + fm * 0.6) > rs.uniform(0.1, 0.9, len(px))
    px, py, var, scale = px[k], py[k], var[k], scale[k]
    pz = L.interp_grid(Z, X, Y, px, py, *args) - np.where(var >= 6, 0.25, 0.6)
    n = len(px)
    rot = rs.uniform(0, 2 * np.pi, n)
    me = bpy.data.meshes.new("ScrubPts")
    me.vertices.add(n)
    me.vertices.foreach_set("co", np.stack([px, py, pz], 1).astype(np.float32).ravel())
    for name, arr, typ in (("tscale", scale, "FLOAT"), ("trot", rot, "FLOAT"), ("tvar", var, "INT")):
        a = me.attributes.new(name, typ, "POINT")
        a.data.foreach_set("value", arr.astype(np.float32 if typ == "FLOAT" else np.int32))
    me.update()
    ob = bpy.data.objects.new("Scrub", me)
    bpy.context.scene.collection.objects.link(ob)
    mat = tree_material("ScrubCrown", trans=0.3, tmul=(2.2, 2.4, 1.0), dark=0.8)
    scatter_instances(ob, make_tree_variants(name="ScrubVariants", mat=mat))
    print(f"[sh12] scrub: {n}", flush=True)
    return ob


def scatter_instances(ob, col):
    ng = bpy.data.node_groups.new("TreeScatter", "GeometryNodeTree")
    ng.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    nb = L.NB(ng)
    gi = nb.n("NodeGroupInput"); go = nb.n("NodeGroupOutput")
    ci = nb.n("GeometryNodeCollectionInfo")
    ci.inputs["Collection"].default_value = col
    ci.inputs["Separate Children"].default_value = True
    ci.inputs["Reset Children"].default_value = True
    iop = nb.n("GeometryNodeInstanceOnPoints")
    iop.inputs["Pick Instance"].default_value = True
    a_var = nb.n("GeometryNodeInputNamedAttribute", data_type="INT"); a_var.inputs["Name"].default_value = "tvar"
    a_sc = nb.n("GeometryNodeInputNamedAttribute", data_type="FLOAT"); a_sc.inputs["Name"].default_value = "tscale"
    a_rot = nb.n("GeometryNodeInputNamedAttribute", data_type="FLOAT"); a_rot.inputs["Name"].default_value = "trot"
    cxyz = nb.n("ShaderNodeCombineXYZ")
    nb.l(a_rot.outputs["Attribute"], cxyz.inputs[2])
    nb.l(gi.outputs[0], iop.inputs["Points"])
    nb.l(ci.outputs[0], iop.inputs["Instance"])
    nb.l(a_var.outputs["Attribute"], iop.inputs["Instance Index"])
    nb.l(cxyz.outputs[0], iop.inputs["Rotation"])
    nb.l(a_sc.outputs["Attribute"], iop.inputs["Scale"])
    nb.l(iop.outputs[0], go.inputs[0])
    mod = ob.modifiers.new("scatter", "NODES")
    mod.node_group = ng


def build_sea():
    X, Y = wedge_grid(300, 300, 8000, 140000, 6000, 36, pw=2.0)
    Z = -curv(X, Y)
    ob = L.grid_mesh("Sea", X, Y, Z)
    C.assign(ob, sea_material())
    return ob


# --------------------------------------------------------------------------- clouds & rain

def cloud_material(name, seed, dens=0.02, ambient=1.0, warp=0.35, billow_scale=3.0, cover=0.15, flat_base=-0.45):
    """Procedural cumulus in a unit cube (object coords -1..1): warped ellipsoid + billows, flat base.
    Single scattering from the sun (forward lobe) + ambient emission ~ multiple scattering."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputMaterial")
    tc = nb.n("ShaderNodeTexCoord")
    p = tc.outputs["Object"]
    wn = nb.n("ShaderNodeTexNoise", noise_dimensions="4D")
    wn.inputs["Scale"].default_value = 1.1
    wn.inputs["Detail"].default_value = 3.0
    wn.inputs["W"].default_value = seed * 3.7
    nb.l(p, wn.inputs["Vector"])
    off = nb.n("ShaderNodeVectorMath", operation="SUBTRACT"); nb.l(wn.outputs["Color"], off.inputs[0])
    off.inputs[1].default_value = (0.5, 0.5, 0.5)
    sc_ = nb.n("ShaderNodeVectorMath", operation="SCALE"); nb.l(off.outputs[0], sc_.inputs[0])
    sc_.inputs["Scale"].default_value = warp * 2
    q = nb.n("ShaderNodeVectorMath", operation="ADD"); nb.l(p, q.inputs[0]); nb.l(sc_.outputs[0], q.inputs[1])
    qs = nb.n("ShaderNodeVectorMath", operation="MULTIPLY"); nb.l(q.outputs[0], qs.inputs[0])
    qs.inputs[1].default_value = (1.0, 1.0, 1.15)
    ln = nb.n("ShaderNodeVectorMath", operation="LENGTH"); nb.l(qs.outputs[0], ln.inputs[0])
    shape = nb.math("SUBTRACT", 1.0, ln.outputs["Value"])
    bn = nb.n("ShaderNodeTexNoise", noise_dimensions="4D")
    bn.inputs["Scale"].default_value = billow_scale
    bn.inputs["Detail"].default_value = 7.0
    bn.inputs["Roughness"].default_value = 0.58
    bn.inputs["W"].default_value = seed * 1.3 + 0.7
    nb.l(p, bn.inputs["Vector"])
    d = nb.math("ADD", nb.math("MULTIPLY", shape, 1.7), nb.math("MULTIPLY", nb.math("SUBTRACT", bn.outputs["Fac"], 0.5), 1.1))
    d = nb.math("MULTIPLY", nb.math("SUBTRACT", d, cover), 5.0, clamp=True)
    sep = nb.n("ShaderNodeSeparateXYZ"); nb.l(p, sep.inputs[0])
    base = nb.mapr(sep.outputs[2], flat_base - 0.06, flat_base + 0.12)
    d = nb.math("MULTIPLY", d, base)
    vol = nb.n("ShaderNodeVolumePrincipled")
    vol.inputs["Color"].default_value = (1, 1, 1, 1)
    vol.inputs["Anisotropy"].default_value = 0.62
    nb.l(nb.math("MULTIPLY", d, dens), vol.inputs["Density"])
    # ambient (multiple-scatter) light: brighter toward the top of the cloud
    amb = nb.mapr(sep.outputs[2], flat_base, 0.9, 0.35, 1.0)
    vol.inputs["Emission Color"].default_value = (0.78, 0.80, 0.86, 1)
    nb.l(nb.math("MULTIPLY", nb.math("MULTIPLY", d, amb), dens * ambient * SKY_STRENGTH * 3.0), vol.inputs["Emission Strength"])
    nb.l(vol.outputs[0], out.inputs["Volume"])
    return m


def cloud(name, loc, dims, seed, **kw):
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.scale = (dims[0] / 2, dims[1] / 2, dims[2] / 2)
    ob.data.materials.append(cloud_material(name + "_m", seed, **kw))
    return ob


def rain_shaft(name, top, bottom_z, radius, lean=(0.0, 0.0), dens=1 / 2500.0, segs=14, seed=0):
    """Homogeneous-volume rain curtain (cheap: constant density -> analytic transmittance).
    Irregular tapered cylinder from the cloud base to the ground."""
    import bmesh
    rnd = random.Random(seed)
    bm = bmesh.new()
    rings = 6
    vs = []
    for r in range(rings + 1):
        f = r / rings
        z = top[2] + (bottom_z - top[2]) * f
        cx = top[0] + lean[0] * f
        cy = top[1] + lean[1] * f
        ring = []
        for k in range(segs):
            a = 2 * math.pi * k / segs
            rr = radius * (0.75 + 0.5 * f) * (1 + 0.25 * math.sin(a * 3 + seed) + rnd.uniform(-0.12, 0.12))
            ring.append(bm.verts.new((cx + rr * math.cos(a), cy + rr * math.sin(a) * 0.6, z)))
        vs.append(ring)
    for r in range(rings):
        for k in range(segs):
            bm.faces.new((vs[r][k], vs[r][(k + 1) % segs], vs[r + 1][(k + 1) % segs], vs[r + 1][k]))
    bm.faces.new(vs[0][::-1]); bm.faces.new(vs[-1])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    m = bpy.data.materials.new(name + "_m")
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputMaterial")
    vol = nb.n("ShaderNodeVolumePrincipled")
    vol.inputs["Color"].default_value = (0.85, 0.87, 0.9, 1)
    vol.inputs["Density"].default_value = dens
    vol.inputs["Anisotropy"].default_value = 0.55
    nb.l(vol.outputs[0], out.inputs["Volume"])
    ob.data.materials.append(m)
    return ob


def build_cloud_shadows(ctx):
    """Invisible layer that only blocks the sun: soft, slowly drifting cloud shadows on the land.
    The sun is 4.8 deg high, so a layer at 2.6 km projects ~30 km toward the camera; the noise is
    stretched along Y by 1/tan(elev) so the shadows land as roundish 1-3 km patches."""
    zc = 2600.0
    st = 1 / math.tan(math.radians(SUN_ELEV))
    ob = plane("CloudShadow", 70000, 60000, (0, 45000, zc), (0, 0, 0))
    m = bpy.data.materials.new("CloudShadow_m")
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputMaterial")
    geo = nb.n("ShaderNodeNewGeometry")
    mp = nb.n("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / 1700.0, 1 / (1700.0 * st), 1.0)
    nb.l(geo.outputs["Position"], mp.inputs["Vector"])
    # slow drift (wind ~10 m/s across the view)
    mp.inputs["Location"].default_value[0] = 0.0
    mp.inputs["Location"].keyframe_insert("default_value", index=0, frame=ctx.f0)
    mp.inputs["Location"].default_value[0] = -10.0 * (ctx.f1 - ctx.f0) / C.FPS / 1700.0
    mp.inputs["Location"].keyframe_insert("default_value", index=0, frame=ctx.f1)
    for fc in C._fcurves(nt.animation_data.action):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    nz = nb.n("ShaderNodeTexNoise", noise_dimensions="3D")
    nz.inputs["Scale"].default_value = 1.0
    nz.inputs["Detail"].default_value = 4.0
    nz.inputs["Roughness"].default_value = 0.55
    nb.l(mp.outputs[0], nz.inputs["Vector"])
    cover = nb.mapr(nz.outputs["Fac"], 0.44, 0.56, 0.0, 0.92)
    # hole over the meadow's sun-ward projection so the exit meadow stays sunlit
    sp_ = nb.n("ShaderNodeSeparateXYZ"); nb.l(geo.outputs["Position"], sp_.inputs[0])
    my = MEADOW[1] + (zc - 60.0) * st
    dxm = nb.math("DIVIDE", nb.math("SUBTRACT", sp_.outputs[0], MEADOW[0]), 1500.0)
    dym = nb.math("DIVIDE", nb.math("SUBTRACT", sp_.outputs[1], my), 1300.0 * st)
    rm = nb.math("ADD", nb.math("MULTIPLY", dxm, dxm), nb.math("MULTIPLY", dym, dym))
    cover = nb.math("MULTIPLY", cover, nb.mapr(rm, 0.6, 1.0))
    tr = nb.n("ShaderNodeBsdfTransparent")
    df = nb.n("ShaderNodeBsdfDiffuse", inputs={"Color": (0, 0, 0, 1)})
    mx = nb.n("ShaderNodeMixShader")
    nb.l(cover, mx.inputs[0]); nb.l(tr.outputs[0], mx.inputs[1]); nb.l(df.outputs[0], mx.inputs[2])
    nb.l(mx.outputs[0], out.inputs["Surface"])
    ob.data.materials.append(m)
    ob.visible_camera = False
    ob.visible_diffuse = False
    ob.visible_glossy = False
    ob.visible_transmission = False
    ob.visible_volume_scatter = False
    return ob


def build_sky_objects(ctx):
    objs = {}
    # distant cumulus congestus over the sea, left and right of the sun, with rain curtains
    objs["cloudL"] = cloud("CloudL", (-3300, 21500, 2700 - curv(-3300, 21500)), (4200, 2600, 2600), 1, dens=0.012)
    cloud("CloudL2", (-1900, 22800, 2200 - curv(-1900, 22800)), (2600, 1800, 1500), 2, dens=0.012)
    objs["cloudR"] = cloud("CloudR", (3600, 17500, 2500 - curv(3600, 17500)), (3400, 2400, 2300), 3, dens=0.012)
    objs["rainL"] = rain_shaft("RainL", (-3100, 21500, 1450 - curv(-3100, 21500)), -60 - curv(-3100, 21500), 900,
                               lean=(500, -300), seed=1)
    rain_shaft("RainL2", (-2500, 21800, 1400 - curv(-2500, 21800)), -60 - curv(-2500, 21800), 450,
               lean=(450, -200), dens=1 / 1600.0, seed=2)
    objs["rainR"] = rain_shaft("RainR", (3500, 17500, 1300 - curv(3500, 17500)), -60 - curv(3500, 17500), 650,
                               lean=(420, -250), seed=3)
    # small fair-weather cumulus below the camera, casting shadows on the land
    cloud("CuA", (-1400, 3800, 1150), (900, 700, 420), 5, dens=0.02, cover=0.25)
    cloud("CuB", (1600, 6400, 1250), (1300, 900, 500), 6, dens=0.02, cover=0.25)
    # the cloud the camera emerges from
    cloud("Emerge", (0, -1700, 1850), (2600, 2200, 700), 9, dens=0.012, warp=0.5, billow_scale=4.0, cover=-0.25,
          flat_base=-0.8)
    return objs


def camera_path(ctx, cam):
    t0, t1 = ctx.f0 / C.FPS, ctx.f1 / C.FPS
    t_settle = ctx.word("bir") - 0.1           # settled on 'bir tek'
    t_exit = ctx.word("çünkü") - 0.25         # begin pitching down toward the meadow just before "Çünkü"
    keys = [
        (t0,         (0, -960, 1790), (84.5, 0, 0.0)),
        (64.6,       (0, -800, 1772), (82.0, 0, 0.0)),
        (t_settle,   (0, -430, 1730), (78.0, 0, 0.0)),
        (t_exit,     (25, -150, 1716), (77.6, 0, -0.3)),
        (t1,         (260, 520, 1470), (51.0, 0, -12.0)),
    ]
    for t, loc, rot in keys:
        C.key(cam, "location", t, loc)
        C.key(cam, "rotation_euler", t, tuple(math.radians(v) for v in rot))
    C.key(cam, "rotation_euler", t0, math.radians(1.5), index=1)
    C.key(cam, "rotation_euler", t_settle, 0.0, index=1)
    C.key(cam, "rotation_euler", t_exit, 0.0, index=1)
    C.key(cam, "rotation_euler", t1, math.radians(-2.5), index=1)
    C.set_extrapolation(cam, "CONSTANT")
    # land the move: flat handles on the last key so the camera decelerates into the cut (<= 3 px/f)
    for fc in C.fcurves(cam):
        kps = fc.keyframe_points
        if len(kps) >= 2:
            k = kps[-1]
            k.handle_left_type = "FREE"; k.handle_right_type = "FREE"
            k.handle_left.y = k.co.y; k.handle_right.y = k.co.y
            k.handle_left.x = k.co.x - (k.co.x - kps[-2].co.x) * 0.55
    C.handheld(cam, amp_loc=0.5, amp_rot=0.0010, speed=0.3, seed=12)
    # exposure opens up as we descend onto the sunlit meadow (sh13a is brighter)
    sc = bpy.context.scene
    sc.view_settings.exposure = -1.0
    sc.view_settings.keyframe_insert("exposure", frame=C.t2f(72.4))
    sc.view_settings.exposure = 0.2
    sc.view_settings.keyframe_insert("exposure", frame=t1 * C.FPS)
    return t_settle


def emission_card_mat(name, color, strength, alpha_fn):
    """Unlit-ish card: Emission x alpha over Transparent. alpha_fn(nb, uv) -> fac socket."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputMaterial")
    tc = nb.n("ShaderNodeTexCoord")
    alpha = alpha_fn(nb, tc)
    em = nb.n("ShaderNodeEmission", inputs={"Color": (*color, 1), "Strength": strength})
    tr = nb.n("ShaderNodeBsdfTransparent")
    mx = nb.n("ShaderNodeMixShader")
    nb.l(alpha, mx.inputs[0]); nb.l(tr.outputs[0], mx.inputs[1]); nb.l(em.outputs[0], mx.inputs[2])
    nb.l(mx.outputs[0], out.inputs["Surface"])
    return m, nb, em


def plane(name, size_x, size_y, loc, rot_deg=(90, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.scale = (size_x, size_y, 1)
    ob.rotation_euler = tuple(math.radians(v) for v in rot_deg)
    return ob


def build_emergence(ctx, cam):
    """The cloud we fly out of: a camera-locked milky veil that thins out, plus world-space vapour
    cards that rush past the lens (motion blurred) as we leave the cloud."""
    rnd = random.Random(31)
    cloud_col = (1.0, 0.93, 0.84)

    def wisp_alpha(seed):
        def fn(nb, tc):
            uv = tc.outputs["UV"]
            sep = nb.n("ShaderNodeSeparateXYZ"); nb.l(uv, sep.inputs[0])
            du = nb.math("ABSOLUTE", nb.math("SUBTRACT", sep.outputs[0], 0.5))
            dv = nb.math("ABSOLUTE", nb.math("SUBTRACT", sep.outputs[1], 0.5))
            r = nb.math("MAXIMUM", du, dv)
            edge = nb.mapr(r, 0.5, 0.18)
            nz = nb.n("ShaderNodeTexNoise", noise_dimensions="4D")
            nz.inputs["Scale"].default_value = 2.2
            nz.inputs["Detail"].default_value = 8.0
            nz.inputs["Roughness"].default_value = 0.62
            nz.inputs["W"].default_value = seed
            nb.l(uv, nz.inputs["Vector"])
            a = nb.mapr(nz.outputs["Fac"], 0.42, 0.78)
            camd = nb.n("ShaderNodeCameraData")
            near = nb.mapr(camd.outputs["View Distance"], 40.0, 220.0)    # never a card wall at the lens
            kv = nb.n("ShaderNodeValue")                                     # all wisps thin out together
            kv.outputs[0].default_value = 1.0
            kv.outputs[0].keyframe_insert("default_value", frame=C.t2f(63.9))
            kv.outputs[0].default_value = 0.0
            kv.outputs[0].keyframe_insert("default_value", frame=C.t2f(65.1))
            for fc in C._fcurves(nb.nt.animation_data.action):
                for kp in fc.keyframe_points:
                    kp.interpolation = "LINEAR"
            near = nb.math("MULTIPLY", near, kv.outputs[0])
            return nb.math("MULTIPLY", nb.math("MULTIPLY", nb.math("MULTIPLY", a, edge), 0.85), near)
        return fn

    for i in range(16):
        y = rnd.uniform(-930, -700)
        x = rnd.uniform(-160, 160)
        z = rnd.uniform(1700, 1860)
        sx, sy = rnd.uniform(160, 420), rnd.uniform(90, 220)
        ob = plane(f"Wisp{i}", sx, sy, (x, y, z), (90 + rnd.uniform(-10, 10), rnd.uniform(-20, 20), rnd.uniform(-25, 25)))
        m, nb, em = emission_card_mat(f"Wisp{i}_m", cloud_col, SKY_STRENGTH * rnd.uniform(1.3, 2.2), wisp_alpha(i * 2.3))
        ob.data.materials.append(m)
        ob.visible_shadow = False
        ob.visible_diffuse = False
        ob.visible_glossy = False

    # camera-locked veil
    veil = plane("Veil", 12, 12, (0, 0, -4.0), (0, 0, 0))
    veil.parent = cam
    def veil_alpha(nb, tc):
        uv = tc.outputs["Object"]
        nz = nb.n("ShaderNodeTexNoise", noise_dimensions="4D")
        nz.inputs["Scale"].default_value = 2.6
        nz.inputs["Detail"].default_value = 6.0
        nz.inputs["Roughness"].default_value = 0.6
        nb.l(uv, nz.inputs["Vector"])
        nz.inputs["W"].keyframe_insert("default_value", frame=ctx.f0)
        nz.inputs["W"].default_value = 1.6
        nz.inputs["W"].keyframe_insert("default_value", frame=C.t2f(65.2))
        val = nb.n("ShaderNodeValue")
        val.outputs[0].default_value = 1.0
        val.outputs[0].keyframe_insert("default_value", frame=ctx.f0)
        val.outputs[0].default_value = 0.97
        val.outputs[0].keyframe_insert("default_value", frame=C.t2f(63.7))
        val.outputs[0].default_value = 0.0
        val.outputs[0].keyframe_insert("default_value", frame=C.t2f(65.1))
        for fc in C._fcurves(nb.nt.animation_data.action):     # even, linear clearing (no luma jump)
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"
        # thins out unevenly: noise threshold rises as the veil fades
        thr = nb.math("SUBTRACT", 1.0, val.outputs[0])
        a = nb.math("SUBTRACT", nz.outputs["Fac"], nb.math("MULTIPLY", thr, 1.1))
        a = nb.math("MULTIPLY", nb.math("ADD", a, 0.62), 1.6, clamp=True)
        return nb.math("MULTIPLY", a, val.outputs[0])
    m, nb, em = emission_card_mat("Veil_m", cloud_col, SKY_STRENGTH * 3.2, veil_alpha)
    tc = nb.n("ShaderNodeTexCoord")
    mot = nb.n("ShaderNodeTexNoise", noise_dimensions="4D")
    mot.inputs["Scale"].default_value = 1.8
    mot.inputs["Detail"].default_value = 5.0
    nb.l(tc.outputs["Object"], mot.inputs["Vector"])
    mot.inputs["W"].keyframe_insert("default_value", frame=ctx.f0)
    mot.inputs["W"].default_value = 1.2
    mot.inputs["W"].keyframe_insert("default_value", frame=C.t2f(65.0))
    lum = nb.mixc(nb.mapr(mot.outputs["Fac"], 0.3, 0.7), (0.80, 0.78, 0.76), (1.12, 1.05, 0.95))
    # sun hotspot glowing through the cloud: from sh11's exit sun (724,1076) to our sun (548,598)
    hs = nb.n("ShaderNodeCombineXYZ")
    def px2loc(px, py):
        f = 26.0 / 36.0 * 1920
        return ((px - 540) / f * 4.0) / 12.0, (-(py - 960) / f * 4.0) / 12.0
    for t, (px, py) in ((ctx.f0 / C.FPS, (724, 1076)), (64.9, (548, 598))):
        lx, ly = px2loc(px, py)
        hs.inputs[0].default_value = lx; hs.inputs[1].default_value = ly
        hs.inputs[0].keyframe_insert("default_value", frame=t * C.FPS)
        hs.inputs[1].keyframe_insert("default_value", frame=t * C.FPS)
    dv = nb.n("ShaderNodeVectorMath", operation="DISTANCE")
    nb.l(tc.outputs["Object"], dv.inputs[0]); nb.l(hs.outputs[0], dv.inputs[1])
    glow = nb.math("EXPONENT", nb.math("MULTIPLY", nb.math("POWER", nb.math("DIVIDE", dv.outputs["Value"], 0.09), 2.0), -1.0))
    gcol = nb.mixc(nb.math("MULTIPLY", glow, 0.85), (1, 1, 1), (2.6, 2.3, 1.8), blend="MULTIPLY")
    lum = nb.mixc(1.0, lum, gcol, blend="MULTIPLY")
    nb.l(nb.mixc(1.0, lum, cloud_col, blend="MULTIPLY"), em.inputs["Color"])
    veil.data.materials.append(m)
    veil.visible_shadow = False
    veil.visible_diffuse = False
    veil.visible_glossy = False


def rain_card(name, x, y, z0, z1, width, seed, strength):
    """Distant precipitation curtain under a cloud base: vertical streaky veil, soft edges, fading into
    the cloud above. Its radiance is the local horizon sky (haze LUT) slightly darkened - rain seen
    against a bright low sun reads as a grey translucent curtain."""
    ob = plane(name, width, z1 - z0, (x, y, (z0 + z1) / 2), (90, 0, 0))
    m = bpy.data.materials.new(name + "_m")
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); nb = L.NB(nt)
    out = nb.n("ShaderNodeOutputMaterial")
    tc = nb.n("ShaderNodeTexCoord")
    geo = nb.n("ShaderNodeNewGeometry")
    uv = tc.outputs["UV"]
    sep = nb.n("ShaderNodeSeparateXYZ"); nb.l(uv, sep.inputs[0])
    u, v = sep.outputs[0], sep.outputs[1]
    us = nb.math("ADD", u, nb.math("MULTIPLY", nb.math("SUBTRACT", 1.0, v), 0.22))      # wind shear slant
    cx = nb.n("ShaderNodeCombineXYZ"); nb.l(nb.math("MULTIPLY", us, 9.0), cx.inputs[0])
    nb.l(nb.math("MULTIPLY", v, 0.7), cx.inputs[1]); cx.inputs[2].default_value = seed
    st = nb.n("ShaderNodeTexNoise", noise_dimensions="3D")
    st.inputs["Scale"].default_value = 1.0
    st.inputs["Detail"].default_value = 6.0
    st.inputs["Roughness"].default_value = 0.6
    nb.l(cx.outputs[0], st.inputs["Vector"])
    streak = nb.mapr(st.outputs["Fac"], 0.3, 0.75)
    wn = nb.n("ShaderNodeTexNoise", noise_dimensions="3D")
    wn.inputs["Scale"].default_value = 2.5
    wn.inputs["Detail"].default_value = 3.0
    nb.l(uv, wn.inputs["Vector"])
    warp = nb.math("MULTIPLY", nb.math("SUBTRACT", wn.outputs["Fac"], 0.5), 0.4)
    dx = nb.math("ABSOLUTE", nb.math("SUBTRACT", nb.math("ADD", us, warp), 0.6))
    side = nb.mapr(dx, 0.45, 0.05)
    top = nb.mapr(v, 1.0, 0.82)
    bot = nb.mapr(v, 0.0, 0.06)
    a = nb.math("MULTIPLY", nb.math("MULTIPLY", side, top), bot)
    a = nb.math("MULTIPLY", a, nb.math("ADD", nb.math("MULTIPLY", streak, 0.6), 0.4))
    alpha = nb.math("MULTIPLY", a, strength)
    neg = nb.n("ShaderNodeVectorMath", operation="SCALE"); neg.inputs["Scale"].default_value = -1.0
    nb.l(geo.outputs["Incoming"], neg.inputs[0])
    col = env_color(nb, neg.outputs[0], MODE[0], image=haze_lut())
    col = nb.mixc(1.0, col, (0.50, 0.51, 0.56), blend="MULTIPLY")
    em = nb.n("ShaderNodeEmission", inputs={"Strength": SKY_STRENGTH})
    nb.l(col, em.inputs["Color"])
    tr = nb.n("ShaderNodeBsdfTransparent")
    mx = nb.n("ShaderNodeMixShader")
    nb.l(alpha, mx.inputs[0]); nb.l(tr.outputs[0], mx.inputs[1]); nb.l(em.outputs[0], mx.inputs[2])
    nb.l(mx.outputs[0], out.inputs["Surface"])
    ob.data.materials.append(m)
    ob.visible_shadow = False
    ob.visible_diffuse = False
    ob.visible_glossy = False
    return ob


def screen_point(cam_loc, cam_rot_deg, sx, sy, dist, lens=26.0):
    """World point along the ray through pixel (sx, sy) of the 1080x1920 frame at distance dist."""
    f = lens / 36.0 * 1920
    d = Vector(((sx - 540) / f, -(sy - 960) / f, -1.0)).normalized()
    R = Euler(tuple(math.radians(v) for v in cam_rot_deg), "XYZ").to_matrix()
    return Vector(cam_loc) + (R @ d) * dist


def build(ctx):
    sc = bpy.context.scene
    if ctx.mode == "final":
        bad = [k for k in os.environ if k.startswith("S8_")]
        if bad:
            raise RuntimeError(f"final render with debug overrides set: {bad}")
    MODE[0] = ctx.mode
    CLOUD_DRIFT[0], CLOUD_DRIFT[1] = ctx.f0, ctx.f1
    build_world(ctx.mode)
    sun = C.sun(elev_deg=SUN_ELEV, azim_deg=SUN_AZ + 180, strength=float(os.environ.get("S8_SUN", 9.0)), kelvin_k=4300, angle_deg=0.55)
    sun.data.specular_factor = 0.08
    import time as _t
    _a = _t.time()
    terrain, grid = build_terrain(ctx)
    print(f"[sh12] terrain {_t.time() - _a:.1f}s", flush=True); _a = _t.time()
    if not os.environ.get("S8_NOTREES"):
        build_trees(ctx, grid)
    print(f"[sh12] trees {_t.time() - _a:.1f}s", flush=True); _a = _t.time()
    build_sea()
    build_cloud_shadows(ctx)
    sky = build_sky_objects(ctx) if os.environ.get("S8_VOLCLOUDS") else {}

    cam = C.camera("cam", lens=26, loc=(0, 0, 1700), rot_deg=(78, 0, 0), sensor=36.0, clip_end=300000)
    cam.data.dof.use_dof = False
    t_settle = camera_path(ctx, cam)
    build_emergence(ctx, cam)
    # settle pose (used to place trackers / distant elements in screen space)
    sloc, srot = (0, -430, 1730), (78.0, 0, 0.0)
    # rain curtains under the HDRI cloud bases (left bank and the big cumulus on the right)
    for i, (sx, sy_top, w, dist, a) in enumerate(() if os.environ.get("S8_NORAIN") else (
            (900, 590, 3600, 30000, 1.0), (980, 575, 1800, 31000, 0.6), (895, 600, 1300, 29800, 0.85))):
        p = screen_point(sloc, srot, sx, sy_top, dist)
        rain_card(f"Rain{i}", p.x, p.y, -100 - curv(p.x, p.y), p.z + 200, w, i * 1.7, a)
        if i == 0:
            C.empty("TRK_rain", (p.x, p.y, (p.z - curv(p.x, p.y)) * 0.45))
    C.empty("TRK_cloud", tuple(screen_point(sloc, srot, 905, 430, 30000)))
    # ground trackers: ray-cast through chosen pixels of the settle frame
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    def ground_pt(sx, sy):
        o = Vector(sloc)
        d = (screen_point(sloc, srot, sx, sy, 1.0) - o).normalized()
        hit, loc, *_ = bpy.context.scene.ray_cast(dg, o, d)
        return tuple(loc) if hit else tuple(o + d * 20000)
    def ray_hit(sx, sy):
        o = Vector(sloc)
        d = (screen_point(sloc, srot, sx, sy, 1.0) - o).normalized()
        for _ in range(12):      # step through cards / the shadow layer to the first solid surface
            hit, loc, nrm, idx, obj, mtx = bpy.context.scene.ray_cast(dg, o, d)
            if not hit:
                return (None, "")
            if obj.name.startswith(("Terrain", "Sea", "Trees")):
                return (tuple(loc), obj.name)
            o = loc + d * 0.5
        return (None, "")
    # sea: first pixel (scanning outward from x=330, y=905) that really hits the sea surface
    sea_pt, seen = None, set()
    for sy in (840, 850, 860, 870, 880, 895):
        for sx in (690, 720, 660, 750, 630, 780):
            p_, name = ray_hit(sx, sy)
            seen.add(name)
            if p_ and name.startswith("Sea"):
                sea_pt = p_; break
        if sea_pt: break
    assert sea_pt, f"TRK_sea: no sea hit (saw {seen})"
    C.empty("TRK_sea", sea_pt)
    # river: the main-river centreline point whose projection is closest to the wanted pixel
    from bpy_extras.object_utils import world_to_camera_view
    sc_ = bpy.context.scene
    cam.location, cam.rotation_euler = Vector(sloc), Euler(tuple(math.radians(v) for v in srot))
    bpy.context.view_layer.update()
    X_, Y_, Z_, rows_, cols_ = TERRAIN_GRID
    rp = river_path()
    best = None
    for (rx, ry) in rp[::2]:
        rz = float(L.interp_grid(Z_, X_, Y_, np.array([rx]), np.array([ry]), -1200, 62000, 2.1, rows_, cols_, 1500, 31)[0])
        co = world_to_camera_view(sc_, cam, Vector((rx, ry, rz)))
        if co.z <= 0: continue
        dpx = math.hypot(co.x * 1080 - 585, (1 - co.y) * 1920 - 1200)
        if best is None or dpx < best[0]:
            best = (dpx, (rx, ry, rz + 1.0))
    C.empty("TRK_river", best[1])
    # forest: the tree (from the scatter) nearest pixel (790,1330) that sits in dense forest
    tp = TREE_PTS[0]
    bestf = None
    sub = tp[np.random.RandomState(3).choice(len(tp), min(len(tp), 40000), replace=False)]
    for (tx, ty, tz) in sub:
        co = world_to_camera_view(sc_, cam, Vector((tx, ty, tz)))
        if co.z <= 0: continue
        dpx = math.hypot(co.x * 1080 - 840, (1 - co.y) * 1920 - 1010)
        if dpx > 60 or (bestf is not None and dpx >= bestf[0]):
            continue
        # must stand in a dense stand: >= 25 trees within 80 m
        nn = np.count_nonzero((tp[:, 0] - tx) ** 2 + (tp[:, 1] - ty) ** 2 < 80 ** 2)
        if nn >= 25:
            bestf = (dpx, (tx, ty, tz + 15.0))
    assert bestf, "TRK_forest: no dense stand near (840,1010)"
    C.empty("TRK_forest", bestf[1])
    bpy.context.scene.frame_set(bpy.context.scene.frame_current)
    if os.environ.get("S8_PROBE"):          # debug: what lies under given pixels at a given frame
        f, pts = os.environ["S8_PROBE"].split(":")
        bpy.context.scene.frame_set(int(f)); bpy.context.view_layer.update()
        dg2 = bpy.context.evaluated_depsgraph_get()
        mw = cam.matrix_world
        fpx = 26.0 / 36.0 * 1920
        for pp in pts.split(";"):
            sx, sy = map(float, pp.split(","))
            d = (mw.to_3x3() @ Vector(((sx - 540) / fpx, -(sy - 960) / fpx, -1.0))).normalized()
            o = mw.translation.copy()
            for _ in range(8):
                hit, loc, nrm, idx, obj, mtx = bpy.context.scene.ray_cast(dg2, o, d)
                if not hit or obj.name.startswith(("Terrain", "Sea", "Trees")): break
                o = loc + d * 0.5
            print("PROBE", pp, obj.name if hit else None, tuple(round(v, 1) for v in loc), flush=True)
    # the visible sun (behind the cloud edge in the plate, where the crepuscular rays converge)
    C.empty("TRK_sun", tuple(screen_point(sloc, srot, 548, 598, 150000)))
    if os.environ.get("S8_EXP"):
        sc.view_settings.exposure = float(os.environ["S8_EXP"])
    # emission here is aerial in-scatter / self-lit cards, never a light source: keep it out of the light
    # tree (otherwise every terrain/tree triangle is an emitter and the tree is rebuilt each frame)
    for m in bpy.data.materials:
        m.cycles.emission_sampling = "NONE"
    # static geometry: no object/deformation motion blur (camera blur still applies). Without this Cycles
    # re-evaluates and re-syncs the heavy static geometry at the shutter subframes of every frame.
    for o in sc.objects:
        if o.type in ("MESH", "EMPTY", "CURVES", "POINTCLOUD") and not o.name.startswith(("cam", "Veil")):
            o.cycles.use_motion_blur = False
    if os.environ.get("S8_STATS"):
        import time as _tm
        _last = [None, _tm.time()]
        def _st(stats):
            msg = str(stats).split("|")[-1].strip()[:60]
            key = msg.split(" ")[0] if msg else ""
            if key != _last[0]:
                print(f"STAT {_tm.time() - _last[1]:7.2f}s  {msg}", flush=True)
                _last[0] = key; _last[1] = _tm.time()
        bpy.app.handlers.render_stats.append(_st)
    for pre in [x for x in os.environ.get("S8_HIDE", "").split(",") if x]:
        for o in sc.objects:
            if o.name.startswith(pre):
                o.hide_render = True
    return {"final_spp": int(os.environ.get("S8_FSPP", 7)), "final_threshold": 0.05, "final_min_spp": 7, "preview_spp": 24,
            "max_bounces": 3, "diffuse_bounces": 1, "glossy_bounces": 1, "transparent_bounces": 32,
            "transmission_bounces": 2, "texture_limit": "2048"}


C.run("sh12", build)
