#!/usr/bin/env python3
"""
END CARD comp bake — ONE command rebuilds every derived image of the end card from ../plates/:

    python3 /home/user/work/endcard/comp/bake.py            # ~10 s, numpy + pillow only
    python3 /home/user/work/endcard/comp/bake.py --check    # are the baked files older than the plates?

Reads   ../plates/linear/light_{fill,key,accent,quran}_lin16.png, ../plates/linear/view_lut.npy,
        ../plates/plate_meta.json
Writes  (all next to this file; the film's src/acts/endcard.js fetches them as /endcard/comp/...)
  base.u16      the photograph in its BASE light, VIEW(fill + key), through the lens part of finish.py
                (softening, lateral CA, halation) at plate resolution; raw little-endian uint16 RGB,
                interleaved, sRGB-encoded 0..65535, W x H = plate size (1350 x 2400)
  dq.i16        (state with the Qur'an light) - base : raw little-endian int16 RGB crop
  da.i16        (state with the Sozler accent light) - base : raw little-endian int16 RGB crop
  meta.json     sizes, crops, the light weights, the positions of plate_meta.json (the runtime reads
                every position from here, nothing is hard-coded), check numbers
  look_*.jpg    1080 x 1920 previews of the four light states (for the eye only; not used by the film)

Why 16-bit raw files and not PNG: the browser decodes PNG to 8 bits. The film's comp works in float
and dithers with its per-frame grain when it quantises to 8 bits, so the cream wall never bands.

Why the deltas: the two effect lights are light-linked to one object each, so in display space
    VIEW(fill + key + a*accent + q*quran)  ~=  base + a * da + q * dq
(the script measures the error of that against the true VIEW of all four passes and stores it in
meta.json -> check). The runtime animates a and q; vignette and grain belong to the frame, not to
the plate, and are applied per frame by endcard.js.

The photographer's grade (review round 1; every step is done on all four light states, so the deltas stay exact):
  LEATHER  through ../plates/mask_books.png, in CIELAB, on leather-coloured pixels only (chroma > 7..13, hue 20..88):
           the lit mid-tones are turned from tan (h 54) to a faded red (h 47), a little denser (L* x 0.945) and
           richer (C* x 1.4); the shadows, the grain valleys and the burnished tooling keep their brown; the cream
           title foil and the page edges are not touched (no chroma: not selected).   --leather 0 switches it off
  QUR'AN   through ../plates/mask_quran.png: the white cover a third of a stop down with more local contrast, so the
           embossed medallion models; the gilt frame and title about 30 % heavier.                 --qgrade 0
  WALL     through the depth pass (everything behind 2.47 m): the plaster's chroma is matched to the film's primer
           plate AS DELIVERED (frame 714 measures L* 86, C* 15.2, h 88; the plate's wall was painted to the nominal
           primer and came out at C* 10: the wall "greyed" in the dissolve). Hue and value are not touched. --wall 0
  DEPTH OF FIELD  from ../plates/depth.png: the wall 0.45-0.95 px softer than the spines (the spines, the Qur'an and
           the shelf stay as sharp as they were), the console's front edge 0.6 px; the in-focus silhouettes do not
           bleed into the soft wall (normalised blur of the out-of-focus layer).                    --dof 0
Options: --quran 1.0 --accent 1.0 (linear-light weights of the two effect lights at full strength),
         --soften 0.57 --ca 0.0015 --bloom 0.04 (finish.py's lens numbers, for a 1080-wide frame; the softening
         is 0.57 instead of 0.6 because the runtime resample adds the rest - see the comment at the option).
"""
import argparse
import json
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                      # /home/user/work/endcard
sys.path.insert(0, ROOT)
import recombine as rc                            # noqa: E402  (numpy-only helpers of the plate team)
import finish as fin                              # noqa: E402  (camera finishing reference)


# ---------------------------------------------------------------- colour helpers (CIELAB, D65, sRGB primaries)
_M = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
_WP = np.array([0.95047, 1.0, 1.08883])


def srgb_to_lab(img):
    lin = fin._s2l(img.astype(np.float64))
    xyz = lin @ _M.T / _WP
    f = np.where(xyz > 216 / 24389, np.cbrt(np.maximum(xyz, 0)), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def lab_to_srgb(lab):
    fy = (lab[..., 0] + 16) / 116
    f = np.stack([fy + lab[..., 1] / 500, fy, fy - lab[..., 2] / 200], -1)
    xyz = np.where(f ** 3 > 216 / 24389, f ** 3, (116 * f - 16) / (24389 / 27)) * _WP
    lin = xyz @ np.linalg.inv(_M).T
    return np.clip(fin._l2s(np.clip(lin, 0, None)), 0, 1).astype(np.float32)


def sstep(x, a, b):
    u = np.clip((x - a) / (b - a), 0, 1)
    return u * u * (3 - 2 * u)


# The leather grade. Targets (lead, review round 1): lit mid-tone L* 69-72, C* 24-27, hue 46-48 deg (never below 45:
# that reads baby pink), shadows / grain valleys / tooling staying brown.  Numbers measured on the delivered frame
# with video/out/endcard/tools/leather.py.  The grade works on the LOCAL MEAN of the lit leather (a 10 px low-pass
# of L*, C*, h), so the grain and the modelling of every volume keep their own contrast, and it lands on the target
# whatever the plates' leather is: `*_to` is where the row's mean goes, `*_keep` how much of the volume-to-volume
# jitter survives.
LEATHER = dict(h_to=47.5, h_keep=0.4,
               l_to=69.5, l_keep=0.5,
               c_to=26.9, c_keep=0.2, c_shadow=1.06,   # chroma: lit leather to c_to; shadows x c_shadow only
               lit=(54.0, 72.0),                       # L* range over which "shadow" turns into "lit"
               sigma=10.0)                             # low-pass of the local mean (plate px)


def _leather_sel(lab, mask):
    C = np.hypot(lab[..., 1], lab[..., 2])
    h = np.degrees(np.arctan2(lab[..., 2], lab[..., 1]))
    sel = mask * sstep(C, 7.0, 13.0) * sstep(h, 20.0, 35.0) * (1 - sstep(h, 72.0, 88.0))
    return C, h, sel, sstep(lab[..., 0], *LEATHER['lit'])


def leather_fields(lab, mask):
    """The correction fields, from the photograph with both effect lights on (the look of the hold):
    dh (deg, subtracted from the hue), cg / lg (gains of C* / L*) for LIT leather."""
    P = LEATHER
    C, h, sel, lit = _leather_sel(lab, mask)
    w = (sel * lit).astype(np.float32)
    den = fin._gauss(w, P['sigma'])
    ok = den > 0.02
    g = {}
    for key, v in (('L', lab[..., 0]), ('C', C), ('h', h)):
        mean = float((v * w).sum() / w.sum())
        loc = fin._gauss((v * w).astype(np.float32), P['sigma']) / np.maximum(den, 0.02)
        g[key] = (mean, np.where(ok, loc, mean).astype(np.float64))
    (Lm, Lb), (Cm, Cb), (hm, hb) = g['L'], g['C'], g['h']
    return dict(dh=hb - (P['h_to'] + P['h_keep'] * (hb - hm)),
                cg=(P['c_to'] + P['c_keep'] * (Cb - Cm)) / Cb,
                lg=(P['l_to'] + P['l_keep'] * (Lb - Lm)) / Lb,
                means=dict(L=Lm, C=Cm, h=hm))


def grade_leather(lab, mask, F, k=1.0):
    """lab (H, W, 3) float64, mask (H, W) 0..1 coverage of the 14 volumes, F = leather_fields().  Returns a new array."""
    if k <= 0:
        return lab
    P = LEATHER
    C, h, sel, lit = _leather_sel(lab, mask)
    sel = sel * k
    h2 = h - sel * lit * F['dh']
    C2 = C * (1 + sel * (P['c_shadow'] - 1 + (F['cg'] - P['c_shadow']) * lit))
    L2 = lab[..., 0] * (1 + sel * (F['lg'] - 1))
    r = np.radians(h2)
    return np.stack([L2, C2 * np.cos(r), C2 * np.sin(r)], -1)


QURAN = dict(drop=3.6, knee=(74.0, 93.0),           # the white cover: L* 93 -> 89.4 (ramp from L* 74)
             clarity=0.75, clarity_sigma=5.0,        # + local contrast (plate px) so the embossing models
             gilt_c=(12.0, 22.0), gilt_h=(55.0, 105.0), heavier=0.34, gilt_gain=1.12, gilt_drop=2.0)


def grade_quran(lab, mask, k=1.0):
    """The Qur'an: cover a third of a stop down + clarity; gilt lines about 30 % heavier and a little deeper."""
    if k <= 0:
        return lab
    P = QURAN
    m = mask * k
    lab = lab.copy()
    # gilt, heavier: a grey erosion (3 x 3 cross) of the gilt-coloured neighbourhood, mixed in at `heavier`
    C = np.hypot(lab[..., 1], lab[..., 2])
    hh = np.degrees(np.arctan2(lab[..., 2], lab[..., 1]))
    gilt = sstep(C, *P['gilt_c']) * sstep(hh, P['gilt_h'][0], P['gilt_h'][0] + 12) * (1 - sstep(hh, P['gilt_h'][1] - 12, P['gilt_h'][1]))
    pad = np.pad(lab, ((1, 1), (1, 1), (0, 0)), mode='edge')
    gp = np.pad(gilt, 1, mode='edge')
    best_g, best = gilt.copy(), lab.copy()
    for dy, dx in ((0, 1), (2, 1), (1, 0), (1, 2)):
        g2 = gp[dy:dy + lab.shape[0], dx:dx + lab.shape[1]]
        take = g2 > best_g
        best_g = np.where(take, g2, best_g)
        best = np.where(take[..., None], pad[dy:dy + lab.shape[0], dx:dx + lab.shape[1]], best)
    grow = (m * P['heavier'] * np.clip(best_g - gilt, 0, 1))[..., None]
    lab = lab + grow * (best - lab)
    C = np.hypot(lab[..., 1], lab[..., 2])
    hh = np.degrees(np.arctan2(lab[..., 2], lab[..., 1]))
    g = m * sstep(C, *P['gilt_c']) * sstep(hh, P['gilt_h'][0], P['gilt_h'][0] + 12) * (1 - sstep(hh, P['gilt_h'][1] - 12, P['gilt_h'][1]))
    lab[..., 1] *= 1 + g * (P['gilt_gain'] - 1)
    lab[..., 2] *= 1 + g * (P['gilt_gain'] - 1)
    lab[..., 0] -= g * P['gilt_drop']
    # the cover: down, with clarity (only where it is nearly white: not the gilt, not the stand)
    L = lab[..., 0]
    white = m * (1 - sstep(C, 8.0, 16.0))
    # local mean of the COVER only (normalised blur): no halo against the stand, the wall or the gilt
    wc = (mask * (1 - sstep(C, 8.0, 16.0)) * sstep(L, 70.0, 84.0)).astype(np.float32)
    den = fin._gauss(wc, P['clarity_sigma'])
    low = np.where(den > 0.05, fin._gauss((L * wc).astype(np.float32), P['clarity_sigma']) / np.maximum(den, 0.05), L)
    L2 = L - white * sstep(L, *P['knee']) * P['drop'] + white * sstep(L, 70.0, 84.0) * P['clarity'] * (L - low)
    lab[..., 0] = L2
    return lab


# The wall: chroma of the lit plaster -> the film's primer plate as delivered (measured on frame 714 of the film).
WALL = dict(c_to=15.0, depth=(2.455, 2.485), lit=(60.0, 78.0))


def grade_wall(lab, wall, gain, k=1.0):
    """wall (H, W) 0..1 = the wall mask; gain = chroma gain of the lit wall (from wall_gain())."""
    if k <= 0:
        return lab
    f = (1 + wall * k * (gain - 1) * sstep(lab[..., 0], *WALL['lit']))[..., None]
    out = lab.copy()
    out[..., 1:] *= f
    return out


def wall_gain(lab, wall):
    w = wall * sstep(lab[..., 0], 74.0, 82.0)                 # the lit wall
    C = np.hypot(lab[..., 1], lab[..., 2])
    mean = float((C * w).sum() / w.sum())
    return WALL['c_to'] / mean, mean


# depth of field: sigma (px of a 1080-wide frame) from the camera distance d (m); df = the focus distance
DOF = dict(far_dead=0.022, far_k=36.0, near_dead=0.009, near_k=85.0, cap=1.0)


def dof_sigma(depth_m, df, k=1.0):
    delta = 1.0 / depth_m - 1.0 / df                       # > 0: nearer than the focus plane
    P = DOF
    s = np.where(delta < 0, P['far_k'] * np.clip(-delta - P['far_dead'], 0, None), P['near_k'] * np.clip(delta - P['near_dead'], 0, None))
    return fin._gauss(np.clip(s, 0, P['cap']).astype(np.float32) * k, 2.0)


def apply_dof(lin, sig):
    """Variable gaussian blur of linear light. sig = sigma per pixel (plate px). The soft layer is blurred with a
    normalised convolution, so sharp (in-focus) pixels do not bleed into it."""
    top = float(sig.max())
    if top < 0.05:
        return lin
    w = np.clip(sig / 0.3, 0, 1).astype(np.float32)        # weight of a pixel as part of the out-of-focus layer
    n = 3
    levels = [top * (i + 1) / n for i in range(n)]
    stack = [lin]
    for s in levels:
        num = fin._gauss(lin * w[..., None], s)
        den = fin._gauss(w, s)
        b = np.where(den[..., None] > 1e-3, num / np.maximum(den, 1e-3)[..., None], lin)
        stack.append(b.astype(np.float32))
    x = np.clip(sig / top * n, 0, n - 1e-4)
    i0 = np.floor(x).astype(np.int32)
    f = (x - i0)[..., None].astype(np.float32)
    out = np.zeros_like(lin)
    for i in range(n):
        sel = (i0 == i)[..., None]
        out += np.where(sel, stack[i] * (1 - f) + stack[i + 1] * f, 0)
    return out


def lens(img, soften, ca, bloom, bloom_sigma=12.0, bloom_thr=0.9, dof=None):
    """Depth of field, then finish.py steps 1-3 (softening, lateral CA, halation) at plate resolution.
    float sRGB 0..1 -> float sRGB 0..1."""
    h, w = img.shape[:2]
    k = w / 1080.0
    lin = fin._s2l(img).astype(np.float32)
    if dof is not None:
        lin = apply_dof(lin, dof)
    if soften > 0:
        lin = fin._gauss(lin, soften * k)
    if ca > 0:
        lin[..., 0] = fin._scale_about_centre(lin[..., 0], 1 + ca / 2)
        lin[..., 2] = fin._scale_about_centre(lin[..., 2], 1 - ca / 2)
    if bloom > 0:
        t = float(fin._s2l(np.float32(bloom_thr)))
        hi = np.clip((lin - t) / (1 - t), 0, None)
        glow = fin._gauss(hi.max(-1), bloom_sigma * k)
        lin = lin + bloom * glow[..., None] * np.array([1.0, 0.93, 0.82], np.float32)
    return np.clip(fin._l2s(lin), 0, 1).astype(np.float32)


def crop_of(delta, thr, margin, feather):
    """Bounding box of |delta| > thr (in 0..1 units), grown by margin; the delta is feathered to 0 on the box edge."""
    m = np.abs(delta).max(-1) > thr
    ys, xs = np.where(m.any(1))[0], np.where(m.any(0))[0]
    h, w = m.shape
    y0, y1 = max(0, ys[0] - margin), min(h, ys[-1] + 1 + margin)
    x0, x1 = max(0, xs[0] - margin), min(w, xs[-1] + 1 + margin)
    # even origin and size: the runtime halves the plate for small preview scales
    x0, y0 = x0 - x0 % 2, y0 - y0 % 2
    x1, y1 = min(w, x1 + (x1 - x0) % 2), min(h, y1 + (y1 - y0) % 2)
    c = delta[y0:y1, x0:x1].copy()
    fy = np.clip(np.minimum(np.arange(y1 - y0) + 0.5, (y1 - y0) - np.arange(y1 - y0) - 0.5) / feather, 0, 1)
    fx = np.clip(np.minimum(np.arange(x1 - x0) + 0.5, (x1 - x0) - np.arange(x1 - x0) - 0.5) / feather, 0, 1)
    # no feather on a side that is the plate border itself
    if y0 == 0: fy[: (y1 - y0) // 2] = 1
    if y1 == h: fy[(y1 - y0) // 2:] = 1
    if x0 == 0: fx[: (x1 - x0) // 2] = 1
    if x1 == w: fx[(x1 - x0) // 2:] = 1
    c *= (fy[:, None] * fx[None, :])[..., None]
    return [int(x0), int(y0), int(x1 - x0), int(y1 - y0)], c


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--quran', type=float, default=1.0)
    ap.add_argument('--accent', type=float, default=1.0)
    # 0.57 px here + the cubic resample of the push-in = finish.py's 0.6 px at delivery size (measured on the film's
    # frames against finish.py --no-grain: gradient energy of the spine titles / the Qur'an / the ornaments within 1 %)
    ap.add_argument('--soften', type=float, default=0.57)
    ap.add_argument('--ca', type=float, default=0.0015)
    ap.add_argument('--bloom', type=float, default=0.04)
    ap.add_argument('--leather', type=float, default=1.0, help='strength of the leather grade (0 = the plates as rendered)')
    ap.add_argument('--qgrade', type=float, default=1.0, help="strength of the Qur'an grade")
    ap.add_argument('--wall', type=float, default=1.0, help='strength of the wall chroma match')
    ap.add_argument('--dof', type=float, default=1.0, help='strength of the added depth of field')
    ap.add_argument('--no-looks', action='store_true')
    ap.add_argument('--check', action='store_true', help='only tell whether the baked files are older than the plates')
    a = ap.parse_args()
    if a.check:
        try:
            with open(os.path.join(HERE, 'meta.json'), encoding='utf-8') as f:
                baked = json.load(f).get('plates_mtime', 0)
        except OSError:
            baked = 0
        now = max(os.path.getmtime(os.path.join(rc.LIN, f'light_{g}_lin16.png')) for g in rc.GROUPS)
        print('STALE: the plates are newer than the bake - run this script without --check' if now > baked + 1e-3 else 'OK: the bake is up to date')
        sys.exit(1 if now > baked + 1e-3 else 0)
    t0 = time.time()

    with open(os.path.join(rc.PLATES, 'plate_meta.json'), encoding='utf-8') as f:
        pm = json.load(f)
    L = {g: rc.load_light(g) for g in rc.GROUPS}
    H, W = L['fill'].shape[:2]
    fk = L['fill'] + L['key']

    def plate_gray(name):
        m = rc.read_png(os.path.join(rc.PLATES, name))[..., 0]
        assert m.shape == (H, W), f'{name}: size differs from the light passes'
        return m.astype(np.float32) / 65535.0

    m_books, m_quran = plate_gray('mask_books.png'), plate_gray('mask_quran.png')
    cam = pm.get('camera') or pm.get('positions_1080x1920', {}).get('camera', {})
    depth_m = 1.982 + plate_gray('depth.png') * (2.670 - 1.982)          # README: 0 = 1.982 m, 65535 = 2.670 m
    sig = dof_sigma(depth_m, float(cam.get('focus_distance_m', 2.3048)), a.dof) * (W / 1080.0) if a.dof > 0 else None
    m_wall = sstep(depth_m, *WALL['depth']).astype(np.float32)
    del depth_m

    lab_full = srgb_to_lab(rc.apply_view(fk + a.quran * L['quran'] + a.accent * L['accent']).astype(np.float32) / 65535.0)
    LF = leather_fields(lab_full, m_books) if a.leather > 0 else None
    WG, wall_c = wall_gain(lab_full, m_wall)
    del lab_full

    def state(q, ac):
        lin = fk
        if q: lin = lin + q * L['quran']
        if ac: lin = lin + ac * L['accent']
        img = rc.apply_view(lin).astype(np.float32) / 65535.0
        if a.leather > 0 or a.qgrade > 0 or a.wall > 0:
            lab = srgb_to_lab(img)
            lab = grade_wall(lab, m_wall, WG, a.wall)
            lab = grade_leather(lab, m_books, LF, a.leather)
            lab = grade_quran(lab, m_quran, a.qgrade)
            img = lab_to_srgb(lab)
        return lens(img, a.soften, a.ca, a.bloom, dof=sig)

    base = state(0, 0)
    sq = state(a.quran, 0)
    sa = state(0, a.accent)
    full = state(a.quran, a.accent)
    del L, fk
    dq_full, da_full = sq - base, sa - base
    thr = 0.08 / 255.0                                   # below a twelfth of an 8-bit level the delta is dropped
    q_crop, dq = crop_of(dq_full, thr, 24, 16)
    a_crop, da = crop_of(da_full, thr, 24, 16)

    # check: base + dq + da against the true state with both lights (8-bit levels)
    approx = base.copy()
    for (x0, y0, w, h), d in ((q_crop, dq), (a_crop, da)):
        approx[y0:y0 + h, x0:x0 + w] += d
    err = np.abs(approx - full) * 255.0
    check = {
        'both_lights_vs_true_8bit': {'mean': float(err.mean()), 'p999': float(np.percentile(err, 99.9)), 'max': float(err.max())},
        'dropped_quran_8bit_max': float(_outside_max(dq_full, q_crop) * 255),
        'dropped_accent_8bit_max': float(_outside_max(da_full, a_crop) * 255),
    }

    def u16(x):
        return np.clip(x * 65535.0 + 0.5, 0, 65535).astype('<u2')

    def i16(x):
        return np.clip(np.round(x * 65535.0), -32768, 32767).astype('<i2')

    u16(base).tofile(os.path.join(HERE, 'base.u16'))
    i16(dq).tofile(os.path.join(HERE, 'dq.i16'))
    i16(da).tofile(os.path.join(HERE, 'da.i16'))

    pos = pm['positions_1080x1920']
    # the photograph's wall tone where it is brightest (beside the row): the film's dissolve matches the primer to it
    kk = W / 1080.0
    patches = [base[int(820 * kk):int(1080 * kk), int(x0 * kk):int(x1 * kk)].reshape(-1, 3).mean(0) for x0, x1 in ((40, 150), (930, 1040))]
    wall_ref = max(patches, key=lambda c: float(c @ np.array([0.2126, 0.7152, 0.0722])))
    # the leather as delivered (both lights on): lit mid-tone per volume, CIELAB (same definition as tools/leather.py)
    leather_lit = {}
    for name, (x0, y0, x1, y1) in pos.get('spines', {}).items():
        dx, dy = 0.22 * (x1 - x0), 0.16 * (y1 - y0)
        reg = srgb_to_lab(full[int((y0 + dy) * kk):int((y1 - dy) * kk), int((x0 + dx) * kk):int((x1 - dx) * kk)].reshape(-1, 3))
        Cc = np.hypot(reg[:, 1], reg[:, 2]); hh = np.degrees(np.arctan2(reg[:, 2], reg[:, 1]))
        lea = (Cc > 10) & (hh > 25) & (hh < 75)
        p50, p90 = np.percentile(reg[lea, 0], [50, 90])
        mm = reg[lea & (reg[:, 0] >= p50) & (reg[:, 0] <= p90)].mean(0)
        leather_lit[name] = [round(float(mm[0]), 1), round(float(np.hypot(mm[1], mm[2])), 1), round(float(np.degrees(np.arctan2(mm[2], mm[1]))), 1)]
    meta = {
        'about': 'written by endcard/comp/bake.py - do not edit; re-run the script after the plates change',
        'plate': {'w': int(W), 'h': int(H), 'scale': W / 1080.0},
        'frame': {'w': 1080, 'h': 1920},
        'files': {
            'base': {'file': 'base.u16', 'dtype': 'uint16le', 'channels': 3, 'w': int(W), 'h': int(H), 'encoding': 'sRGB 0..65535'},
            'dq': {'file': 'dq.i16', 'dtype': 'int16le', 'channels': 3, 'crop': q_crop, 'light': 'quran', 'weight': a.quran},
            'da': {'file': 'da.i16', 'dtype': 'int16le', 'channels': 3, 'crop': a_crop, 'light': 'accent', 'weight': a.accent},
        },
        'lens': {'soften_px_at_1080': a.soften, 'ca': a.ca, 'bloom': a.bloom, 'bloom_sigma_px_at_1080': 12.0, 'bloom_thr': 0.9},
        'grade': {'leather': dict(LEATHER, strength=a.leather, plate_means=(LF or {}).get('means')), 'quran': dict(QURAN, strength=a.qgrade), 'dof': dict(DOF, strength=a.dof),
                  'wall': dict(WALL, strength=a.wall, chroma_before=wall_c, gain=WG),
                  'leather_lit_LCh_plate': leather_lit},
        'wall_ref_srgb': [float(v) for v in wall_ref],
        'positions_1080x1920': {k: pos[k] for k in (
            'quran_medallion_centre', 'quran_bbox', 'row_bbox', 'sozler_spine_bbox', 'sozler_volume_bbox', 'shelf_bbox',
            'quran_stand_bbox', 'console_top_front_edge_y', 'console_slab_bottom_y', 'drawer1_top_y', 'drawer1_bottom_y',
            'drawer2_top_y', 'row_centre_x', 'suggested_text_block') if k in pos},
        'check': check,
        'plates_mtime': max(os.path.getmtime(os.path.join(rc.LIN, f'light_{g}_lin16.png')) for g in rc.GROUPS),
        'baked_at': time.strftime('%Y-%m-%d %H:%M:%S'),
    }
    # walnut colours behind the text block (8-bit sRGB, base state) - for the contrast report in NOTES.md
    x0, y0, x1, y1 = [int(round(v * W / 1080.0)) for v in pos['suggested_text_block']]
    blk = base[y0:y1, x0:x1]
    rows = np.linspace(0, blk.shape[0] - 1, 9).astype(int)
    meta['walnut_rows_srgb8'] = {str(int(round((y0 + r) / (W / 1080.0)))): [float(v) for v in (blk[r].mean(0) * 255).round(1)] for r in rows}
    with open(os.path.join(HERE, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)

    if not a.no_looks:
        from PIL import Image
        for name, img in (('base', base), ('quran', sq), ('accent', sa), ('both', full)):
            im = Image.fromarray(np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8)).resize((1080, 1920), Image.LANCZOS)
            im.save(os.path.join(HERE, f'look_{name}.jpg'), quality=95, subsampling=0)
    print(json.dumps({'plate': [int(W), int(H)], 'dq_crop': q_crop, 'da_crop': a_crop, 'check': check,
                      'seconds': round(time.time() - t0, 1)}, indent=1))


def _outside_max(d, crop):
    x0, y0, w, h = crop
    m = np.abs(d).max(-1).copy()
    m[y0:y0 + h, x0:x0 + w] = 0
    return float(m.max())


if __name__ == '__main__':
    main()
