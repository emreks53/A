# Texture generation for the Risale-i Nur / Qur'an closing shot (imported by scene.py)
import os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(os.path.dirname(HERE), "fonts")
TEX = os.path.join(HERE, "tex")

BOOKS = [
    ("Sözler", 44.9), ("Mektubat", 31.4), ("Lem’alar", 27.6), ("Şuâlar", 38.0),
    ("Mesnevî-i Nûriye", 17.4), ("İşârâtü’l-İ’câz", 20.3), ("Barla Lâhikası", 24.1),
    ("Kastamonu Lâhikası", 18.0), ("Emirdağ Lâhikası", 26.3), ("Sikke-i Tasdîk-i Gaybî", 15.5),
    ("Tarihçe-i Hayat", 35.7), ("Asâ-yı Mûsâ", 21.1), ("İman ve Küfür Muvâzeneleri", 16.6),
    ("Muhâkemat", 14.7),
]
SPINE_H = 240.0  # mm
PPMM = 16        # texture pixels per mm


def font(name, px):
    return ImageFont.truetype(os.path.join(FONTS, name), max(4, int(round(px))))


def spine_geom(t):
    """Rounded-spine parameters (mm): sagitta and arc length for a book of thickness t."""
    s = min(max(0.11 * t, 2.2), 5.2)
    c = t
    R = (c * c / 4 + s * s) / (2 * s)
    half = math.asin((c / 2) / R)
    return s, R, half, 2 * half * R


def text_mask(txt, fnt, pad=8):
    """Render text tightly into an L image (horizontal)."""
    bb = fnt.getbbox(txt, anchor="ls")
    w = bb[2] - bb[0] + 2 * pad
    h = bb[3] - bb[1] + 2 * pad
    im = Image.new("L", (w, h), 0)
    ImageDraw.Draw(im).text((pad - bb[0], pad - bb[1]), txt, font=fnt, fill=255, anchor="ls")
    return im


def lace_band(width_px, height_px, ppmm):
    """Repeating motif: a teardrop followed by an arrowhead chevron, between two thin fillets."""
    S = 4  # supersample
    W, H = width_px * S, height_px * S
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    p = ppmm * S
    fil = 0.42 * p
    d.rectangle([0, 0, W, fil], fill=255)
    d.rectangle([0, H - fil, W, H], fill=255)
    motif_w = 5.0 * p
    n = max(2, int((W - 0.6 * p) // motif_w))
    x0 = (W - n * motif_w) / 2
    cy = H / 2
    r = 1.30 * p
    for i in range(n):
        mx = x0 + i * motif_w
        # teardrop pointing right: circle + tapered tip
        cx = mx + 0.30 * p + r
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
        tip = (cx + 2.15 * r, cy)
        a = math.radians(48)
        d.polygon([(cx + r * math.cos(a), cy - r * math.sin(a)), tip,
                   (cx + r * math.cos(a), cy + r * math.sin(a)), (cx, cy)], fill=255)
        # arrowhead chevron '>'
        bx = mx + 3.55 * p
        hh = 1.55 * p
        th = 0.55 * p
        d.polygon([(bx, cy - hh), (bx + 0.95 * p, cy), (bx, cy + hh), (bx - th * 0.2, cy + hh - th),
                   (bx + 0.95 * p - th * 1.1, cy), (bx - th * 0.2, cy - hh + th)], fill=255)
    return im.resize((width_px, height_px), Image.LANCZOS)


def blur(a, px):
    if px <= 0:
        return a
    k = int(px * 3) | 1
    import cv2
    return cv2.GaussianBlur(a, (k, k), px)


def make_spine(idx, title, t, ppmm=PPMM, seed=0):
    """Return (mask RGB uint8 [R=foil, G=tool-darkening, B=rib], height uint16) for one spine."""
    rng = np.random.default_rng(1000 + idx)
    s, R, half, arc = spine_geom(t)
    W = int(round(arc * ppmm))
    H = int(round(SPINE_H * ppmm))
    foil = Image.new("L", (W, H), 0)
    lace = Image.new("L", (W, H), 0)   # lace bands only (embossed, not debossed)
    rib = np.zeros((H, W), np.float32)
    flat_w = t * 0.86  # usable width across the spine (mm)
    mm = lambda v: int(round(v * ppmm))

    # --- ribs (three thin raised horizontal ribs) near head and tail
    ys = np.arange(H, dtype=np.float32) / ppmm
    rib_cent = [10.6, 13.1, 15.6]
    for c in rib_cent + [SPINE_H - v for v in rib_cent]:
        prof = np.exp(-0.5 * ((ys - c) / 0.42) ** 2)
        rib = np.maximum(rib, prof[:, None] * np.ones((1, W), np.float32))
    # ribs fade near spine edges (they wrap into the joints)
    xs = (np.arange(W) + 0.5) / W
    edge = np.clip(np.minimum(xs, 1 - xs) / 0.04, 0, 1)
    rib *= edge[None, :]

    # --- lace bands
    band_h = mm(6.8)
    lb = lace_band(W - mm(1.2), band_h, ppmm)
    for top in (18.4, SPINE_H - 18.4 - 6.8):
        foil.paste(lb, (mm(0.6), mm(top)), lb)
        lace.paste(lb, (mm(0.6), mm(top)), lb)

    # --- title (reads top->bottom: rotate 90 deg clockwise)
    zone_top, zone_bot = 34.0, 196.0
    max_len = zone_bot - zone_top - 10
    words = title.split(" ")
    # single-line candidate
    fn = "EBGaramond-SemiBold.ttf"
    def fit(lines, max_cross):
        # font px such that every line fits max_len and stack fits max_cross (mm)
        lo, hi = 10, 400
        for _ in range(18):
            mid = (lo + hi) / 2
            f = font(fn, mid)
            ims = [text_mask(l, f, pad=0) for l in lines]
            L = max(i.size[0] for i in ims) / ppmm
            C = (sum(i.size[1] for i in ims) + (len(lines) - 1) * mid * 0.18) / ppmm
            if L <= max_len and C <= max_cross:
                lo = mid
            else:
                hi = mid
        return lo
    cap_limit = 0.62 * flat_w
    px = min(fit([title], cap_limit), 15.0 * ppmm)
    lines = [title]
    f = font(fn, px)
    ims = [text_mask(l, f, pad=6) for l in lines]
    gap = int(px * 0.10)
    blk_w = max(i.size[0] for i in ims)
    blk_h = sum(i.size[1] for i in ims) + gap * (len(ims) - 1)
    blk = Image.new("L", (blk_w, blk_h), 0)
    y = 0
    for im in ims:
        blk.paste(im, ((blk_w - im.size[0]) // 2, y))
        y += im.size[1] + gap
    blk = blk.rotate(-90, expand=True)  # top->bottom reading, letter tops toward front board (+u)
    cy = mm((zone_top + zone_bot) / 2 - 8)
    foil.paste(blk, ((W - blk.size[0]) // 2, cy - blk.size[1] // 2), blk)
    title_end = (cy + blk.size[1] / 2) / ppmm

    # --- author line (small)
    fa = font("EBGaramond-Medium.ttf", 2.7 * ppmm)
    am = text_mask("Bediüzzaman Said Nursî", fa, pad=4).rotate(-90, expand=True)
    alen = am.size[1] / ppmm
    a_c = min((title_end + 190.0) / 2 + 2, 192.0 - alen / 2)
    if a_c - alen / 2 > title_end + 4 and am.size[0] < W * 0.8:
        foil.paste(am, ((W - am.size[0]) // 2, mm(a_c) - am.size[1] // 2), am)

    F = np.asarray(foil, np.float32) / 255.0
    # foil imperfections: slightly irregular edges and tiny gaps
    noise = blur(rng.random((H, W)).astype(np.float32), 1.2)
    noise = (noise - noise.mean()) / (noise.std() + 1e-6)
    Fs = np.clip((blur(F, 0.6) - 0.5) * 2.2 + 0.5 + 0.10 * noise, 0, 1)
    speck = blur(rng.random((H, W)).astype(np.float32), 0.8)
    speck = (speck - speck.mean()) / (speck.std() + 1e-6)
    Fs *= np.clip(1.0 - np.clip(speck - 2.6, 0, 1) * 3, 0, 1)
    # leather darkening where the hot tool pressed (around foil)
    Lc = np.asarray(lace, np.float32) / 255.0
    Ft = np.clip(F - Lc, 0, 1)                      # title + author only (hot-stamped, debossed)
    dark = np.clip(blur(Ft, 0.9 * ppmm / 4) * 1.25 + blur(Lc, 0.5 * ppmm / 4) * 0.35, 0, 1)
    # height: 0.5 base, ribs up, lace bands embossed (raised), title/author debossed with a soft shoulder
    deb = blur(Ft, 0.10 * ppmm)
    emb = blur(Lc, 0.07 * ppmm)
    # very slight irregularity of the tool impression depth along the spine
    irr = blur(rng.random((H, W)).astype(np.float32), 6.0)
    irr = (irr - irr.mean()) / (irr.std() + 1e-6)
    hgt = 0.5 + 0.42 * blur(rib, 0.5) - 0.30 * deb * (1 + 0.12 * irr) + 0.20 * emb
    hgt = np.clip(hgt, 0, 1)
    rgb = np.stack([Fs, dark, np.clip(blur(rib, 0.5), 0, 1)], -1)
    rgb8 = (np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8)
    h16 = (hgt * 65535 + 0.5).astype(np.uint16)
    return rgb8, h16, dict(arc=arc, s=s, R=R, lines=lines, px=px)


def save_spines():
    os.makedirs(TEX, exist_ok=True)
    meta = []
    for i, (title, t) in enumerate(BOOKS):
        rgb, h16, m = make_spine(i, title, t)
        Image.fromarray(rgb, "RGB").save(os.path.join(TEX, f"spine_{i:02d}_mask.png"))
        Image.fromarray(h16).save(os.path.join(TEX, f"spine_{i:02d}_height.png"))
        meta.append(m)
        print(i, title, t, m["lines"], round(m["px"] / PPMM, 2), "mm font")
    return meta


# ------------------------------------------------------------------ Qur'an cover
def _mandorla(cx, cy, w, h, n=200):
    """Pointed almond (vesica) outline points, tips slightly softened."""
    R = (w * w + h * h) / (4 * w)
    c = R - w / 2
    amax = math.asin((h / 2) / R)
    pts = []
    half = n // 2
    for i in range(half):  # right arc (circle centred at -c), from top tip to bottom tip
        a = amax - 2 * amax * i / half
        pts.append((cx - c + R * math.cos(a), cy - R * math.sin(a)))
    for i in range(half):  # left arc (circle centred at +c), bottom tip to top tip
        a = -amax + 2 * amax * i / half
        pts.append((cx + c - R * math.cos(a), cy - R * math.sin(a)))
    return pts


def _vines(d, inside, x0, y0, x1, y1, scale, seed, n_start=14):
    """Dense arabesque-like vine scroll inside a region (inside(x,y) -> bool)."""
    rnd = random.Random(seed)
    w = 0.018 * scale
    for k in range(n_start * 4):
        if k >= n_start and rnd.random() < 0.5:
            continue
        for _ in range(40):
            x = rnd.uniform(x0, x1); y = rnd.uniform(y0, y1)
            if inside(x, y):
                break
        else:
            continue
        ang = rnd.uniform(0, 2 * math.pi)
        curv = rnd.choice([-1, 1]) * rnd.uniform(1.5, 3.0) / scale
        L = rnd.uniform(0.35, 0.8) * scale
        step = 0.012 * scale
        pts = [(x, y)]
        n = int(L / step)
        for i in range(n):
            ang += curv * step
            curv *= 1.035  # tighten into a spiral
            x += step * math.cos(ang); y += step * math.sin(ang)
            if not inside(x, y):
                break
            pts.append((x, y))
            if i % 9 == 4 and rnd.random() < 0.35:
                _leaf(d, x, y, ang + rnd.choice([-1, 1]) * 1.2, 0.09 * scale, 0.03 * scale)
        if len(pts) > 3:
            for i in range(len(pts) - 1):
                tt = i / len(pts)
                ww = max(1, int(w * (1.0 - 0.6 * tt)))
                d.line([pts[i], pts[i + 1]], fill=255, width=ww)
            xe, ye = pts[-1]
            r = w * 0.9
            d.ellipse([xe - r, ye - r, xe + r, ye + r], fill=255)
            if rnd.random() < 0.6:
                xs, ys = pts[0]
                _leaf(d, xs, ys, rnd.uniform(0, 6.28), 0.11 * scale, 0.04 * scale)


def _scallop(pts, depth, nlobes):
    """Add scalloped lobes to a closed outline (outward bumps)."""
    P = np.array(pts)
    n = len(P)
    cen = P.mean(0)
    out = []
    for i in range(n):
        v = P[i] - cen
        r = np.linalg.norm(v)
        ph = (i / n) * nlobes * 2 * math.pi
        bump = depth * abs(math.sin(ph / 2))
        out.append(tuple(cen + v / r * (r + bump)))
    return out


def _spiral(d, cx, cy, r0, turns, w0, rot, mirror=1, S=1.0):
    pts = []
    N = 90
    for i in range(N):
        tt = i / (N - 1)
        a = rot + mirror * tt * turns * 2 * math.pi
        r = r0 * (1 - 0.82 * tt)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a), w0 * (1 - 0.75 * tt)))
    for i in range(N - 1):
        x0, y0, w = pts[i]
        x1, y1, _ = pts[i + 1]
        d.line([(x0, y0), (x1, y1)], fill=255, width=max(1, int(w)))
        d.ellipse([x1 - w / 2, y1 - w / 2, x1 + w / 2, y1 + w / 2], fill=255)
    return pts[-1]


def _leaf(d, x, y, ang, L, Wd):
    """Rumi split-leaf (teardrop) at (x,y) pointing at angle."""
    pts = []
    for i in range(41):
        tt = i / 40
        a = math.pi * tt
        px = L * (1 - math.cos(a)) / 2
        py = Wd * math.sin(a) * (1 - tt) ** 0.6
        pts.append((px, py))
    pts += [(px, -py * 0.6) for px, py in reversed(pts)]
    ca, sa = math.cos(ang), math.sin(ang)
    d.polygon([(x + px * ca - py * sa, y + px * sa + py * ca) for px, py in pts], fill=255)


def _arabesque_quadrant(d, ox, oy, sx, sy, scale, seed):
    """Draw one quadrant of a symmetric arabesque; sx/sy are mirror signs."""
    rnd = random.Random(seed)
    def P(x, y):
        return (ox + sx * x * scale, oy + sy * y * scale)
    # main stem
    stem = [(0, 0.02), (0.18, 0.10), (0.30, 0.28), (0.26, 0.48), (0.12, 0.62), (0.02, 0.80)]
    pts = [P(*p) for p in stem]
    for a, b in zip(pts[:-1], pts[1:]):
        d.line([a, b], fill=255, width=max(2, int(0.022 * scale)))
    # spirals off the stem
    spec = [(0.30, 0.28, 0.13, 0.0), (0.12, 0.62, 0.11, 2.2), (0.18, 0.10, 0.09, 3.6)]
    for x, y, r, rot in spec:
        cx, cy = P(x + 0.10 * (1 if x < 0.25 else -1), y)
        m = sx * sy
        _spiral(d, cx, cy, r * scale, 1.15, 0.020 * scale, rot if m > 0 else math.pi - rot, mirror=m)
    # leaves
    for (x, y, ang, L) in [(0.26, 0.48, 0.3, 0.16), (0.02, 0.80, 1.5, 0.12), (0.30, 0.28, -0.9, 0.14),
                           (0.40, 0.18, -0.2, 0.12), (0.10, 0.36, 2.4, 0.11)]:
        X, Y = P(x, y)
        a = math.atan2(sy * math.sin(ang), sx * math.cos(ang))
        _leaf(d, X, Y, a, L * scale, 0.045 * scale)
    # small dots
    for (x, y) in [(0.36, 0.40), (0.20, 0.72), (0.06, 0.20)]:
        X, Y = P(x, y)
        r = 0.016 * scale
        d.ellipse([X - r, Y - r, X + r, Y + r], fill=255)


def make_quran_cover(Wmm=175.0, Hmm=250.0, ppmm=12, with_text=True):
    W, H = int(Wmm * ppmm), int(Hmm * ppmm)
    S = 2
    big = Image.new("L", (W * S, H * S), 0)
    d = ImageDraw.Draw(big)
    p = ppmm * S
    # double-fillet border
    for inset, wd in ((9.0, 0.55), (11.2, 0.30)):
        a = inset * p
        d.rectangle([a, a, W * S - a, H * S - a], outline=255, width=max(1, int(wd * p)))
    # dotted inner rule
    a = 13.0 * p
    step = 2.2 * p
    x = a
    while x < W * S - a:
        r = 0.32 * p
        for yy in (a, H * S - a):
            d.ellipse([x - r, yy - r, x + r, yy + r], fill=255)
        x += step
    y = a
    while y < H * S - a:
        r = 0.32 * p
        for xx in (a, W * S - a):
            d.ellipse([xx - r, y - r, xx + r, y + r], fill=255)
        y += step
    # corner ornaments (quarter medallions)
    for (cx, cy, sx, sy) in [(15 * p, 15 * p, 1, 1), (W * S - 15 * p, 15 * p, -1, 1),
                             (15 * p, H * S - 15 * p, 1, -1), (W * S - 15 * p, H * S - 15 * p, -1, -1)]:
        R = 26 * p
        pts = []
        for i in range(61):
            ang = (math.pi / 2) * i / 60
            rr = R * (1 + 0.07 * abs(math.sin(ang * 10)))
            pts.append((cx + sx * rr * math.cos(ang), cy + sy * rr * math.sin(ang)))
        d.line(pts, fill=255, width=int(0.5 * p))
        pts2 = [(cx + sx * (R - 2.2 * p) * math.cos((math.pi / 2) * i / 60),
                 cy + sy * (R - 2.2 * p) * math.sin((math.pi / 2) * i / 60)) for i in range(61)]
        d.line(pts2, fill=255, width=int(0.25 * p))
        # arabesque inside corner (rotated quadrant)
    # corner vine fill: draw once (top-left), symmetrise about the diagonal, mirror to all corners
    cimg = Image.new("L", big.size, 0)
    cdr = ImageDraw.Draw(cimg)
    ccx, ccy, RR = 15 * p, 15 * p, 26 * p - 3.4 * p
    insc = lambda x, y: (x - ccx > 0.6 * p and y - ccy > 0.6 * p and (x - ccx) ** 2 + (y - ccy) ** 2 < RR * RR
                         and (y - ccy) <= (x - ccx))
    _vines(cdr, insc, ccx, ccy, ccx + RR, ccy + RR, 0.55 * RR, 21, n_start=10)
    C = np.asarray(cimg)
    n = int(ccx + RR + 2 * p)
    patch = C[:n, :n]
    patch = np.maximum(patch, patch.T)
    B = np.asarray(big).copy()
    Hh, Ww = B.shape
    B[:n, :n] = np.maximum(B[:n, :n], patch)
    B[:n, Ww - n:] = np.maximum(B[:n, Ww - n:], patch[:, ::-1])
    B[Hh - n:, :n] = np.maximum(B[Hh - n:, :n], patch[::-1, :])
    B[Hh - n:, Ww - n:] = np.maximum(B[Hh - n:, Ww - n:], patch[::-1, ::-1])
    big = Image.fromarray(B)
    d = ImageDraw.Draw(big)
    # central semse (almond medallion) with scalloped double outline
    cx, cy = W * S / 2, H * S / 2
    mw, mh = 78 * p, 128 * p
    outer = _scallop(_mandorla(cx, cy, mw, mh, 400), 2.6 * p, 26)
    d.line(outer + [outer[0]], fill=255, width=int(0.7 * p))
    inner = _mandorla(cx, cy, mw - 7 * p, mh - 9 * p, 400)
    d.line(inner + [inner[0]], fill=255, width=int(0.35 * p))
    # pendants (salbek) above and below
    for sgn in (-1, 1):
        ty = cy + sgn * (mh / 2 + 3.5 * p)
        d.line([(cx, cy + sgn * (mh / 2 + 0.5 * p)), (cx, ty)], fill=255, width=int(0.5 * p))
        rr = 3.6 * p
        for dx in (-rr * 0.9, 0, rr * 0.9):
            yy = ty + sgn * (rr * 0.9 if dx == 0 else rr * 0.2)
            d.ellipse([cx + dx - rr * 0.62, yy - rr * 0.62, cx + dx + rr * 0.62, yy + rr * 0.62], fill=255)
        _leaf(d, cx, ty + sgn * 1.6 * rr, sgn * math.pi / 2, 6 * p, 2.0 * p)
    # inner arabesque: field mask = inside the inner mandorla
    orn = Image.new("L", big.size, 0)
    q = Image.new("L", big.size, 0)
    qd = ImageDraw.Draw(q)
    fpoly = _mandorla(cx, cy, mw - 9.5 * p, mh - 12 * p, 400)
    fimg = Image.new("L", big.size, 0)
    ImageDraw.Draw(fimg).polygon(fpoly, fill=255)
    FA = np.asarray(fimg)
    ins = lambda x, y: (x >= cx - 1 and y <= cy + 1 and 0 <= int(y) < FA.shape[0] and 0 <= int(x) < FA.shape[1]
                        and FA[int(y), int(x)] > 0)
    _vines(qd, ins, cx, cy - mh / 2, cx + mw / 2, cy, 0.42 * mh / 2, 5, n_start=26)
    Q = np.asarray(q)
    Q = np.maximum(Q, Q[:, ::-1][:, :] if False else Q)
    # mirror quadrant about the centre lines
    Qm = np.zeros_like(Q)
    icx, icy = int(round(cx)), int(round(cy))
    tl = Q[:icy, icx:]
    Qm[:icy, icx:icx + tl.shape[1]] = np.maximum(Qm[:icy, icx:icx + tl.shape[1]], tl)
    Qm[:icy, icx - tl.shape[1]:icx] = np.maximum(Qm[:icy, icx - tl.shape[1]:icx], tl[:, ::-1])
    top = Qm[:icy].copy()
    Qm[icy:icy + top.shape[0]] = np.maximum(Qm[icy:icy + top.shape[0]], top[::-1][:Qm.shape[0] - icy])
    orn = Image.fromarray(Qm)
    field = Image.new("L", big.size, 0)
    ImageDraw.Draw(field).polygon(_mandorla(cx, cy, mw - 9.5 * p, mh - 12 * p, 400), fill=255)
    if with_text:
        # clear a cartouche in the centre and put the Arabic title in it
        cart = Image.new("L", big.size, 0)
        cd = ImageDraw.Draw(cart)
        cw, ch = 52 * p, 22 * p
        cd.rounded_rectangle([cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2], radius=ch / 2, fill=255)
        orn = Image.fromarray(np.where(np.asarray(cart) > 0, 0, np.asarray(orn)).astype(np.uint8))
        d.rounded_rectangle([cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2], radius=ch / 2,
                            outline=255, width=int(0.45 * p))
        fa = ImageFont.truetype(os.path.join(FONTS, "Amiri-Bold.ttf"), int(9.5 * p))
        txt = Image.new("L", big.size, 0)
        ImageDraw.Draw(txt).text((cx, cy + 0.5 * p), "القرآن الكريم", font=fa, fill=255, anchor="mm",
                                 direction="rtl", language="ar")
        big = Image.fromarray(np.maximum(np.asarray(big), np.asarray(txt)))
    orn = Image.fromarray((np.asarray(orn).astype(np.float32) * (np.asarray(field) / 255.0)).astype(np.uint8))
    big = Image.fromarray(np.maximum(np.asarray(big), np.asarray(orn)))
    big = big.filter(ImageFilter.MaxFilter(5))   # thicken tooling so it survives the lens blur
    m = big.resize((W, H), Image.LANCZOS)
    F = np.asarray(m, np.float32) / 255.0
    rng = np.random.default_rng(77)
    noise = blur(rng.random((H, W)).astype(np.float32), 1.0)
    noise = (noise - noise.mean()) / (noise.std() + 1e-6)
    Fs = np.clip((blur(F, 0.5) - 0.5) * 2.0 + 0.5 + 0.08 * noise, 0, 1)
    dark = np.clip(blur(F, 2.5) * 1.6, 0, 1)
    hgt = np.clip(0.5 - 0.30 * blur(F, 0.8), 0, 1)
    rgb = (np.stack([Fs, dark, np.zeros_like(Fs)], -1) * 255 + 0.5).astype(np.uint8)
    return rgb, (hgt * 65535).astype(np.uint16)


def save_quran():
    os.makedirs(TEX, exist_ok=True)
    rgb, h = make_quran_cover(with_text=True)
    Image.fromarray(rgb, "RGB").save(os.path.join(TEX, "quran_cover_mask.png"))
    Image.fromarray(h).save(os.path.join(TEX, "quran_cover_height.png"))


if __name__ == "__main__":
    save_spines()
    save_quran()
