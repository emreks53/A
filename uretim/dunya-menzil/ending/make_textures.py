#!/usr/bin/env python3
"""Generate all bitmap textures for the Külliyat ending shot.

Run with the system python3 (needs Pillow built with libraqm for correct
Arabic shaping, and numpy):  python3 make_textures.py [outdir]

Outputs (default: ./tex next to this file):
  spine_00.png .. spine_13.png  RGB  R=gold-foil mask, G=height (1=leather
                                surface, lower=pressed: deboss + 0.35 mm
                                blocking halo; the shader also darkens by it),
                                B=foil variation.  Titles auto-fit 7.0->5.8 mm cap.
  spine_layout.json             measured title placement per spine
  leather_grain.png             16-bit grey, tileable pebble grain
  quran_cover.png               RGB  (same layout): 3-fillet frame, chain roll,
                                solid gold corner pieces + şemse with reversed
                                arabesque, pendants, raqm-shaped القرآن الكريم
  quran_spine.png               RGB  (same channel layout)
  rahle_A.png / rahle_B.png     16-bit height maps: chamfered strapwork with an
                                incised centre line, raised rumi scrolls, grooves
  wood_walnut(_h).jpg           oiled walnut (cathedral figure) + pore map
  wood_table(_h).jpg            light natural oak planks (lightly limed) + pore/seam map
  vignette.png                  optical vignette multiplier for the compositor
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops, features

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import spec  # noqa: E402

FONTS = os.path.normpath(os.path.join(HERE, "..", "fonts"))
F_TITLE = os.path.join(FONTS, "EBGaramondSemiBold.ttf")
F_AR = os.path.join(FONTS, "Amiri-Bold.ttf")
CAP_EM = 0.658          # EB Garamond cap height / em

RNG = np.random.default_rng(1405)
# table: light natural oak, lightly limed (a few white-waxed pores): less orange
# than honey oak so the rose books separate from it.
TABLE_EARLY, TABLE_LATE, TABLE_LIMED = (198, 176, 148), (134, 110, 84), 0.25


# ----------------------------------------------------------------- helpers
def value_noise(h, w, cell, seed, octaves=3, tile=False):
    """Smooth value noise in [0,1] (bicubic-upsampled random grids)."""
    rng = np.random.default_rng(seed)
    acc = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    c = cell
    for _ in range(octaves):
        gh, gw = max(2, int(math.ceil(h / c)) + 1), max(2, int(math.ceil(w / c)) + 1)
        g = rng.random((gh, gw)).astype(np.float32)
        if tile:
            g[-1, :] = g[0, :]
            g[:, -1] = g[:, 0]
        im = Image.fromarray(g, mode="F").resize((int((gw - 1) * c) + 1, int((gh - 1) * c) + 1), Image.BICUBIC)
        a = np.asarray(im)[:h, :w]
        if a.shape != (h, w):
            a = np.pad(a, ((0, h - a.shape[0]), (0, w - a.shape[1])), mode="edge")
        acc += amp * a
        tot += amp
        amp *= 0.5
        c = max(1.0, c / 2.0)
    acc /= tot
    return np.clip(acc, 0, 1)


def text_image(txt, font_path, px, rtl=False):
    """Render text to an 'L' image tightly cropped to the ink, plus metrics."""
    kw = {}
    if rtl:
        kw = dict(direction="rtl", language="ar")
    f = ImageFont.truetype(font_path, px, layout_engine=ImageFont.Layout.RAQM)
    l, t, r, b = f.getbbox(txt, **kw)
    pad = px // 4
    im = Image.new("L", (r - l + 2 * pad, b - t + 2 * pad), 0)
    ImageDraw.Draw(im).text((pad - l, pad - t), txt, font=f, fill=255, **kw)
    bbox = im.getbbox()
    return im.crop(bbox), f


def cap_metrics(font_path, px):
    f = ImageFont.truetype(font_path, px, layout_engine=ImageFont.Layout.RAQM)
    _, top, _, base = f.getbbox("H")
    return base - top, base  # cap height, baseline offset from draw origin


def finish_foil(mask_hi, ss, seed, wear_rows=None, depth=0.55, ppm=12, halo_mm=0.38, halo_depth=0.22,
                breaks_amt=0.6):
    """Downsample the supersampled mask and build the 3 output channels.
    R = gold foil coverage, G = height (1 = leather surface; lower = pressed),
    B = foil variation.  The height channel also carries the 'blocking halo':
    hot foil stamping compresses (and darkens) a ~0.35 mm band of leather
    around every glyph; the shader darkens leather by (1 - G)."""
    from scipy import ndimage
    w, h = mask_hi.size[0] // ss, mask_hi.size[1] // ss
    m = np.asarray(mask_hi.resize((w, h), Image.LANCZOS), np.float32) / 255.0
    # foil imperfections: tiny breaks and slightly uneven coverage
    n1 = value_noise(h, w, 3.0, seed, 2)
    n2 = value_noise(h, w, 18.0, seed + 1, 3)
    breaks = np.clip((n1 - 0.82) * 6.0, 0, 1) * 0.85 * breaks_amt
    cover = np.clip(1.0 - breaks - np.clip((0.30 - n2) * 1.2, 0, 0.18), 0, 1)
    if wear_rows is not None:
        cover *= wear_rows[:, None]
    gold = np.clip(m * cover, 0, 1)
    # deboss: the tool presses the whole motif (also where foil broke off)
    mb = ndimage.gaussian_filter(m, 0.9)
    # blocking halo: distance from the glyph edge, in pixels
    dist = ndimage.distance_transform_edt(m < 0.5)
    halo = np.clip(1.0 - dist / (halo_mm * ppm), 0, 1) ** 0.8
    halo = ndimage.gaussian_filter(halo, 0.7) * (1.0 - m)
    height = 1.0 - depth * mb - halo_depth * halo
    var = 0.75 + 0.25 * value_noise(h, w, 9.0, seed + 2, 3)
    rgb = np.stack([gold, height, var], -1)
    return Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB")


# ------------------------------------------------------------ leather grain
def leather_grain(path, N=1024, mm=51.2):
    """Tileable pebble-grain height map (calf/goat leather)."""
    def cells(cell_mm, seed, jitter=0.85):
        n = int(round(mm / cell_mm))
        rng = np.random.default_rng(seed)
        jx = rng.random((n, n)).astype(np.float32) * jitter + (1 - jitter) / 2
        jy = rng.random((n, n)).astype(np.float32) * jitter + (1 - jitter) / 2
        g = (np.arange(N, dtype=np.float32) + 0.5) / N * n
        gx, gy = np.meshgrid(g, g)
        ix, iy = np.floor(gx).astype(np.int32), np.floor(gy).astype(np.int32)
        f1 = np.full((N, N), 9.0, np.float32)
        f2 = np.full((N, N), 9.0, np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                cx, cy = ix + dx, iy + dy
                px = cx + jx[cy % n, cx % n]
                py = cy + jy[cy % n, cx % n]
                d = np.sqrt((gx - px) ** 2 + (gy - py) ** 2)
                f2 = np.where(d < f1, f1, np.minimum(f2, d))
                f1 = np.minimum(f1, d)
        return f1, f2

    f1, f2 = cells(0.95, 11)
    edge = np.clip((f2 - f1) / 0.32, 0, 1)
    pebble = edge ** 0.55                       # rounded pebbles, sharp creases
    g1, g2 = cells(0.38, 12)
    fine = np.clip((g2 - g1) / 0.3, 0, 1) ** 0.7
    low = value_noise(N, N, N / 8, 13, 3, tile=True)
    h = 0.62 * pebble + 0.23 * fine + 0.15 * low
    # pores
    pores = value_noise(N, N, 2.0, 14, 1, tile=True)
    h -= 0.12 * np.clip((pores - 0.86) * 8, 0, 1)
    h = (h - h.min()) / (h.max() - h.min())
    Image.fromarray((h * 65535).astype(np.uint16)).save(path)


# --------------------------------------------------------------- spines
def draw_star8(d, cx, cy, R, fill=255, hole=None):
    pts = []
    ri = R * math.cos(math.pi / 4) / math.cos(math.pi / 8)
    for k in range(16):
        r = R if k % 2 == 0 else ri
        a = math.pi / 8 + k * math.pi / 8
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    d.polygon(pts, fill=fill)
    if hole:
        d.ellipse([cx - hole, cy - hole, cx + hole, cy + hole], fill=0)


def fleuron(d, k, cx, zc, s=1.0):
    """Small gold tulip / palmette fleuron, upright on the spine (image y down)."""
    up = -math.pi / 2
    # central pointed leaf
    d.polygon([(x * k, y * k) for x, y in leaf_poly(cx, zc - 2.0 * s, up, 5.2 * s, 2.3 * s)], fill=255)
    # two side leaves curling outward and up
    for sg in (-1, 1):
        a_ = up + sg * 0.95
        d.polygon([(x * k, y * k) for x, y in leaf_poly(cx + sg * 1.55 * s, zc - 0.25 * s, a_, 3.6 * s, 1.45 * s)],
                  fill=255)
    # calyx + stem + dot
    d.ellipse([(cx - 0.75 * s) * k, (zc + 0.05 * s) * k, (cx + 0.75 * s) * k, (zc + 1.25 * s) * k], fill=255)
    d.rectangle([(cx - 0.17 * s) * k, (zc + 1.1 * s) * k, (cx + 0.17 * s) * k, (zc + 2.6 * s) * k], fill=255)
    d.ellipse([(cx - 0.42 * s) * k, (zc + 2.9 * s) * k, (cx + 0.42 * s) * k, (zc + 3.74 * s) * k], fill=255)


def spine_texture(idx, title, T, outdir):
    PPM = spec.SPINE_PPM
    SS = 3
    R, half, L = spec.spine_arc(T)
    W = int(round(L * PPM))
    Hp = int(round(spec.BOOK_H * PPM))
    k = PPM * SS                      # px per mm in supersampled space
    im = Image.new("L", (W * SS, Hp * SS), 0)
    d = ImageDraw.Draw(im)
    Wm = W / PPM                      # width in mm (== arc length)
    cx = Wm / 2

    def rule(z, th, x0=0.0, x1=None):
        x1 = Wm if x1 is None else x1
        d.rectangle([x0 * k, (z - th / 2) * k, x1 * k, (z + th / 2) * k], fill=255)

    def vrule(x, th, z0, z1):
        d.rectangle([(x - th / 2) * k, z0 * k, (x + th / 2) * k, z1 * k], fill=255)

    def dots_row(z, r, pitch):
        n = int(Wm / pitch)
        off = (Wm - (n - 1) * pitch) / 2
        for i in range(n):
            x = off + i * pitch
            d.ellipse([(x - r) * k, (z - r) * k, (x + r) * k, (z + r) * k], fill=255)

    def lozenge_roll(z, hh, pitch):
        n = int(Wm / pitch) + 1
        off = (Wm - (n - 1) * pitch) / 2
        for i in range(n):
            x = off + i * pitch
            d.polygon([(x * k, (z - hh) * k), ((x + pitch * 0.42) * k, z * k), (x * k, (z + hh) * k),
                       ((x - pitch * 0.42) * k, z * k)], fill=255)
            d.ellipse([(x + pitch / 2 - 0.24) * k, (z - 0.24) * k, (x + pitch / 2 + 0.24) * k, (z + 0.24) * k], fill=255)

    H = spec.BOOK_H
    hub_off1, hub_off2 = spec.HUB_HALF + 1.3, spec.HUB_HALF + 2.25
    # head & tail: double fillet + lozenge roll
    for z0, sgn in ((0.0, 1), (H, -1)):
        rule(z0 + sgn * 5.0, 0.6)
        rule(z0 + sgn * 6.3, 0.28)
        lozenge_roll(z0 + sgn * 10.4, 1.55, 2.6)
        rule(z0 + sgn * 13.0, 0.28)
    # hubs: dotted roll on the crest, fillets either side
    for zc in spec.HUBS_FROM_TOP:
        dots_row(zc, 0.45, 1.45)
        for sgn in (-1, 1):
            rule(zc + sgn * hub_off1, 0.55)
            rule(zc + sgn * hub_off2, 0.25)
    # ornament panel: 8-point star rosette with a ring
    zo = sum(spec.ORNAMENT_PANEL) / 2
    Rs = min(4.6, (T - 4.5) / 2)
    draw_star8(d, cx * k, zo * k, Rs * k, 255, hole=Rs * 0.48 * k)
    d.ellipse([(cx - Rs * 0.26) * k, (zo - Rs * 0.26) * k, (cx + Rs * 0.26) * k, (zo + Rs * 0.26) * k], fill=255)
    for sgn in (-1, 1):  # tiny dots flanking
        zz = zo + sgn * (Rs + 1.6)
        d.ellipse([(cx - 0.45) * k, (zz - 0.45) * k, (cx + 0.45) * k, (zz + 0.45) * k], fill=255)

    # title panel frame: a double fillet inside the compartment
    hubs = spec.HUBS_FROM_TOP
    pz0, pz1 = hubs[1] + hub_off2 + 1.7, hubs[2] - hub_off2 - 1.7
    ins_o, ins_i = 1.45, 2.25
    for ins, th in ((ins_o, 0.42), (ins_i, 0.2)):
        za, zb = pz0 + (ins - ins_o), pz1 - (ins - ins_o)
        vrule(ins, th, za, zb)
        vrule(Wm - ins, th, za, zb)
        rule(za, th, ins - th / 2, Wm - ins + th / 2)
        rule(zb, th, ins - th / 2, Wm - ins + th / 2)

    # ------------------------------------------------------------ title
    stroke_px = int(round(0.075 * k))           # foil spreads ~0.15 mm wider than the type

    def place_text_vertical(lines, cap_mm, z_ref, line_pitch_mm, stroke=0, align="top"):
        """Render lines horizontally, rotate clockwise (reads top->bottom) and
        paste with the INK centred across the spine; along the spine the ink
        starts at z_ref (align='top') or is centred on it (align='center').
        Returns (length_mm, width_mm, x0, x1, ztop)."""
        px = int(round(cap_mm / CAP_EM * k))
        f = ImageFont.truetype(F_TITLE, px, layout_engine=ImageFont.Layout.RAQM)
        capp, base_off = cap_metrics(F_TITLE, px)
        widths = [f.getlength(t) for t in lines]
        bw = int(max(widths)) + px
        pitch = line_pitch_mm * k
        bh = int(capp + pitch * (len(lines) - 1) + px * 1.6)
        blk = Image.new("L", (bw, bh), 0)
        bd = ImageDraw.Draw(blk)
        top_pad = int(px * 0.6)
        for i, t in enumerate(lines):
            xw = widths[i]
            base_y = top_pad + capp + i * pitch
            bd.text(((bw - xw) / 2, base_y - base_off), t, font=f, fill=255, stroke_width=stroke, stroke_fill=255)
        rot = blk.rotate(-90, expand=True)    # clockwise
        bb = rot.getbbox()
        dx = int(round(cx * k - (bb[0] + bb[2]) / 2))
        if align == "top":
            dy = int(round(z_ref * k - bb[1]))
        else:
            dy = int(round(z_ref * k - (bb[1] + bb[3]) / 2))
        im.paste(255, (dx, dy), rot)
        return (bb[3] - bb[1]) / k, (bb[2] - bb[0]) / k, (dx + bb[0]) / k, (dx + bb[2]) / k, (dy + bb[1]) / k

    # auto-fit: one line, cap height 7.0 mm where it fits (length AND width),
    # never below 5.8 mm
    tz0 = pz0 + 3.4                      # title starts 3.4 mm below the panel frame
    maxlen = (pz1 - 3.4) - tz0
    maxw = Wm - 2 * (ins_i + 0.55)
    fprobe = ImageFont.truetype(F_TITLE, 1000, layout_engine=ImageFont.Layout.RAQM)
    em = fprobe.getlength(title) / 1000.0
    bbp = fprobe.getbbox(title)
    ink_em = (bbp[3] - bbp[1]) / 1000.0
    cap = min(7.0, maxlen / em * CAP_EM, maxw / (ink_em + 0.03) * CAP_EM)
    if cap < 5.8 - 1e-6:
        raise SystemExit("title does not fit: %s (cap %.2f)" % (title, cap))
    lines = [title]
    # top-aligned (the Kur'an hides the lower spines on the left)
    tl, tw, x0, x1, ztop = place_text_vertical(lines, cap, tz0, cap * 1.42, stroke_px, "top")
    tbot = ztop + tl
    # fleuron in the lower part of the panel when the title leaves room
    zf = pz1 - 10.5
    has_fleuron = tbot < zf - 9.0
    if has_fleuron:
        fleuron(d, k, cx, zf, s=min(1.0, (T - 3.5) / 11.0))
    # author
    a0, a1 = hubs[2] + hub_off2, hubs[3] - hub_off2
    cap_a = 2.3
    al, aw, ax0, ax1, _ = place_text_vertical([spec.AUTHOR], cap_a, (a0 + a1) / 2, 3, max(1, stroke_px - 1),
                                              "center")
    report = dict(title=title, T=T, lines=lines, cap=round(cap, 2), title_top=round(ztop, 1),
                  title_bottom=round(tbot, 1), title_len=round(tl, 1), title_w=round(tw, 1),
                  margin_l=round(x0, 2), margin_r=round(Wm - x1, 2), author_len=round(al, 1),
                  author_room=round(a1 - a0, 1), panel=(round(pz0, 1), round(pz1, 1)), fleuron=has_fleuron)

    # foil wear rows: slightly more rubbed near head/tail and on hub crests
    zz = (np.arange(Hp) + 0.5) / PPM
    wear = np.ones(Hp, np.float32)
    for zc in spec.HUBS_FROM_TOP:
        wear -= 0.22 * np.exp(-((zz - zc) / 1.2) ** 2)
    wear -= 0.25 * np.exp(-(zz / 7.0) ** 2) + 0.25 * np.exp(-((H - zz) / 7.0) ** 2)
    out = finish_foil(im, SS, 100 + idx, wear_rows=np.clip(wear, 0.5, 1.0), ppm=PPM)
    out.save(os.path.join(outdir, "spine_%02d.png" % idx))
    return report


# ----------------------------------------------------------------- Kur'an
def leaf_poly(cx, cy, ang, length, width, n=10):
    """Pointed leaf (vesica) polygon."""
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (t - 0.5) * length
        y = math.sin(math.pi * t) ** 0.8 * width / 2
        pts.append((x, y))
    for i in range(n - 1, 0, -1):
        t = i / n
        x = (t - 0.5) * length
        y = -math.sin(math.pi * t) ** 0.8 * width / 2 * 0.75
        pts.append((x, y))
    ca, sa = math.cos(ang), math.sin(ang)
    return [(cx + x * ca - y * sa, cy + x * sa + y * ca) for x, y in pts]


def spiral_vine(d, k, cx, cy, r0, turns, ang0, sense, lw, leaf_every=0.55, leaf_len=2.6):
    """Thin spiral stem with leaves (rumi/hatai flavour)."""
    pts = []
    n = int(60 * turns)
    for i in range(n + 1):
        t = i / n
        a = ang0 + sense * t * turns * 2 * math.pi
        r = r0 * (1 - 0.82 * t)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a), a, r))
    d.line([(p[0] * k, p[1] * k) for p in pts], fill=255, width=max(1, int(lw * k)), joint="curve")
    step = max(1, int(n * leaf_every / turns / 2))
    for j in range(step, n, step):
        x, y, a, r = pts[j]
        la = a + sense * math.pi / 2 + 0.5
        L = leaf_len * (0.5 + 0.5 * r / r0)
        lx, ly = x + math.cos(la) * L * 0.5, y + math.sin(la) * L * 0.5
        d.polygon([(px * k, py * k) for px, py in leaf_poly(lx, ly, la, L, L * 0.42)], fill=255)
    x, y, a, r = pts[-1]
    d.ellipse([(x - lw * 1.4) * k, (y - lw * 1.4) * k, (x + lw * 1.4) * k, (y + lw * 1.4) * k], fill=255)


def lobed_quarter(cx, cy, q, Rk, n=90, lobes=7):
    """Lobed quarter medallion polygon anchored at a frame corner."""
    a0 = q * math.pi / 2
    pts = [(cx, cy)]
    for i in range(n + 1):
        t = i / n
        a = a0 + (math.pi / 2) * t
        lob = 1.0 + 0.07 * abs(math.sin(lobes * math.pi * t)) ** 0.7
        r = Rk * lob * (1 + 0.22 * math.sin(math.pi * t) ** 8)   # pointed tip on the diagonal
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def mandorla(cx, cy, A, B, lobes=0, lobe_amp=0.0, n=900, pinch=0.16, tip=0.0):
    """Şemse outline: ogee-tipped ellipse with optional scalloped edge."""
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        st, ct = math.sin(t), math.cos(t)
        x = A * st * (1 - pinch * ct * ct)
        y = -B * ct * (1 + 0.05 * st * st) * (1 + tip * abs(ct) ** 12)
        nx, ny = x / (A + 1e-6), y / (B + 1e-6)
        nl = math.hypot(nx, ny) + 1e-9
        lob = lobe_amp * abs(math.sin(lobes * t / 2)) ** 0.55 if lobes else 0.0
        pts.append((cx + x + nx / nl * lob, cy + y + ny / nl * lob))
    return pts


def offset_curve(pts, dist):
    """Offset a closed polyline along its (approximate) normals; positive = outward
    for a clockwise-in-image (CCW in y-up) loop. Good enough for smooth curves."""
    out = []
    n = len(pts)
    cxm = sum(p[0] for p in pts) / n
    cym = sum(p[1] for p in pts) / n
    for i in range(n):
        ax, ay = pts[i - 1]
        bx, by = pts[(i + 1) % n]
        tx, ty = bx - ax, by - ay
        L = math.hypot(tx, ty) + 1e-12
        nx, ny = ty / L, -tx / L
        px, py = pts[i]
        if (px - cxm) * nx + (py - cym) * ny < 0:
            nx, ny = -nx, -ny
        out.append((px + nx * dist, py + ny * dist))
    return out


def wave_along(pts, amp, periods, phase=0.0):
    """Sinusoid riding on a closed curve (normal displacement)."""
    n = len(pts)
    cum = [0.0]
    for i in range(1, n + 1):
        cum.append(cum[-1] + math.hypot(pts[i % n][0] - pts[i - 1][0], pts[i % n][1] - pts[i - 1][1]))
    Ltot = cum[-1]
    cxm = sum(p[0] for p in pts) / n
    cym = sum(p[1] for p in pts) / n
    res = []
    for i in range(n):
        ax, ay = pts[i - 1]
        bx, by = pts[(i + 1) % n]
        tx, ty = bx - ax, by - ay
        L = math.hypot(tx, ty) + 1e-12
        nx, ny = ty / L, -tx / L
        if (pts[i][0] - cxm) * nx + (pts[i][1] - cym) * ny < 0:
            nx, ny = -nx, -ny
        w = amp * math.sin(2 * math.pi * periods * cum[i] / Ltot + phase)
        res.append((pts[i][0] + nx * w, pts[i][1] + ny * w, cum[i] / Ltot))
    return res


def quran_cover(outdir):
    """Ivory mushaf cover (fore-edge on the image left, spine on the right):
    3-fillet frame, gold chain roll (zencerek), solid gold corner pieces and
    şemse with reversed (negative) arabesque lines, pendants, and the
    calligraphy القرآن الكريم (raqm-shaped Amiri) in the şemse's reserve."""
    PPM = spec.QURAN_PPM
    SS = 3
    k = PPM * SS
    Wm, Hm = spec.QURAN_D, spec.QURAN_H
    S = Hm / 240.0
    W, H = int(Wm * PPM), int(Hm * PPM)
    im = Image.new("L", (W * SS, H * SS), 0)
    blind = Image.new("L", (W * SS, H * SS), 0)
    d = ImageDraw.Draw(im)
    db = ImageDraw.Draw(blind)
    bx0, bx1 = 0.0, Wm - 9.0
    by0, by1 = 0.0, Hm

    def P(pts):
        return [(x * k, y * k) for x, y in pts]

    def frame(inset, lw, dd=d, fill=255):
        x0, y0, x1, y1 = bx0 + inset, by0 + inset, bx1 - inset, by1 - inset
        h = lw / 2
        for r in ((x0 - h, y0 - h, x1 + h, y0 + h), (x0 - h, y1 - h, x1 + h, y1 + h),
                  (x0 - h, y0 - h, x0 + h, y1 + h), (x1 - h, y0 - h, x1 + h, y1 + h)):
            dd.rectangle([r[0] * k, r[1] * k, r[2] * k, r[3] * k], fill=fill)

    # --- outer 3-fillet frame (0.6 / 2.0 / 0.6 mm)
    frame(4.8, 0.6)
    frame(6.6, 2.0)
    frame(8.4, 0.6)
    # --- chain roll (guilloche) 7 mm wide, centred 13 mm in from the edge
    bc = 13.0
    amp, per, lw = 2.55, 6.6, 0.55
    corners = [(bx0 + bc, by0 + bc), (bx1 - bc, by0 + bc), (bx1 - bc, by1 - bc), (bx0 + bc, by1 - bc)]
    for a_, b_ in zip(corners, corners[1:] + corners[:1]):
        Ls = math.hypot(b_[0] - a_[0], b_[1] - a_[1])
        ux, uy = (b_[0] - a_[0]) / Ls, (b_[1] - a_[1]) / Ls
        nx, ny = -uy, ux
        s0, s1 = 4.6, Ls - 4.6
        n = max(2, int(round((s1 - s0) / per)))
        pp = (s1 - s0) / n
        for ph in (0.0, math.pi):
            pts = []
            for i in range(int((s1 - s0) * 6) + 1):
                s_ = s0 + i / 6.0
                w = amp * math.sin(2 * math.pi * (s_ - s0) / pp + ph)
                pts.append(((a_[0] + ux * s_ + nx * w) * k, (a_[1] + uy * s_ + ny * w) * k))
            d.line(pts, fill=255, width=int(lw * k), joint="curve")
        for j in range(n * 2):
            s_ = s0 + (j + 0.5) * pp / 2
            qx, qy = a_[0] + ux * s_, a_[1] + uy * s_
            r = 0.62
            d.ellipse([(qx - r) * k, (qy - r) * k, (qx + r) * k, (qy + r) * k], fill=255)
    for (x, y) in corners:
        draw_star8(d, x * k, y * k, 3.5 * k, 255, hole=1.5 * k)
        d.ellipse([(x - 0.6) * k, (y - 0.6) * k, (x + 0.6) * k, (y + 0.6) * k], fill=255)
    # --- inner frame (0.6 + 0.3)
    frame(17.6, 0.6)
    frame(18.9, 0.3)
    fi = 19.05                                   # field inset

    # --- corner pieces: solid gold lobed quarter medallions, negative arabesque
    cps = [(bx0 + fi, by0 + fi, 0), (bx1 - fi, by0 + fi, 1), (bx1 - fi, by1 - fi, 2), (bx0 + fi, by1 - fi, 3)]
    for (x, y, q) in cps:
        Rk = 22.0 * S
        d.polygon(P(lobed_quarter(x, y, q, Rk, lobes=7)), fill=255)
        # reversed outline 1.5 mm inside the edge
        inner = lobed_quarter(x, y, q, Rk - 1.7, lobes=7)[1:]
        d.line(P(inner), fill=0, width=max(1, int(0.5 * k)), joint="curve")
        am = q * math.pi / 2 + math.pi / 4
        # reversed spiral vine + leaves
        spiral_vine_neg = []
        sense = 1 if q % 2 == 0 else -1
        for i in range(121):
            t = i / 120
            aa = am + math.pi + sense * t * 1.25 * 2 * math.pi
            rr = 6.2 * S * (1 - 0.8 * t)
            spiral_vine_neg.append((x + math.cos(am) * 10.0 * S + rr * math.cos(aa),
                                    y + math.sin(am) * 10.0 * S + rr * math.sin(aa)))
        d.line(P(spiral_vine_neg), fill=0, width=max(1, int(0.45 * k)), joint="curve")
        for j in (25, 55, 85):
            px_, py_ = spiral_vine_neg[j]
            la = math.atan2(py_ - spiral_vine_neg[j - 3][1], px_ - spiral_vine_neg[j - 3][0]) + sense * 1.1
            d.polygon(P(leaf_poly(px_ + math.cos(la) * 1.0, py_ + math.sin(la) * 1.0, la, 2.6, 1.1)), fill=0)
        # gold finial bud beyond the tip (on the leather)
        tx, ty = x + math.cos(am) * (Rk * 1.22 + 2.6), y + math.sin(am) * (Rk * 1.22 + 2.6)
        d.polygon(P(leaf_poly(tx, ty, am, 4.4, 2.2)), fill=255)

    # --- central şemse: solid gold, scalloped, with an ivory reserve
    cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
    A, B = 29.5 * S, 47.0 * S
    outer = mandorla(cx, cy, A, B, lobes=26, lobe_amp=1.35, tip=0.10)
    d.polygon(P(outer), fill=255)
    # ring of dots just outside the scallops
    for p_ in mandorla(cx, cy, A + 3.0, B + 3.0, n=72, tip=0.10):
        d.ellipse([(p_[0] - 0.42) * k, (p_[1] - 0.42) * k, (p_[0] + 0.42) * k, (p_[1] + 0.42) * k], fill=255)
    # negative scroll riding around the gold band + reversed dots in the bays
    band_mid = mandorla(cx, cy, A - 3.0, B - 3.2, n=900, tip=0.06)
    wv = wave_along(band_mid, 1.35, 22)
    d.line([(x * k, y * k) for x, y, _ in wv] + [(wv[0][0] * k, wv[0][1] * k)], fill=0,
           width=max(1, int(0.42 * k)), joint="curve")
    for j in range(44):
        i = int((j + 0.5) / 44 * len(band_mid)) % len(band_mid)
        off = 1.0 if j % 2 == 0 else -1.0
        bx_, by_ = band_mid[i]
        ox, oy = bx_ - cx, by_ - cy
        L_ = math.hypot(ox / A, oy / B) + 1e-9
        qx, qy = bx_ + off * 1.25 * (ox / A) / L_ * 1.0, by_ + off * 1.25 * (oy / B) / L_ * 1.0
        d.ellipse([(qx - 0.38) * k, (qy - 0.38) * k, (qx + 0.38) * k, (qy + 0.38) * k], fill=0)
    # reserve (ivory leather) + thin gold line inside it
    RA, RB = A - 6.4, B - 7.0
    reserve = mandorla(cx, cy, RA, RB, tip=0.05)
    d.polygon(P(reserve), fill=0)
    d.line(P(mandorla(cx, cy, RA - 1.1, RB - 1.1, tip=0.05)) + [P([mandorla(cx, cy, RA - 1.1, RB - 1.1, tip=0.05)[0]])[0]],
           fill=255, width=max(1, int(0.32 * k)), joint="curve")
    # --- pendants (salbek): stem + solid gold lobed drop with reversed spine line + finial
    for sgn in (-1, 1):
        y_edge = cy + sgn * (B * 1.1 + 1.6)
        d.rectangle([(cx - 0.32) * k, min(y_edge, y_edge + sgn * 4.0) * k, (cx + 0.32) * k,
                     max(y_edge, y_edge + sgn * 4.0) * k], fill=255)
        pc = y_edge + sgn * 10.0
        drop = mandorla(cx, pc, 5.4, 6.6, lobes=10, lobe_amp=0.75, n=300, pinch=0.3, tip=0.25)
        d.polygon(P(drop), fill=255)
        d.line([(cx * k, (pc - 4.6) * k), (cx * k, (pc + 4.6) * k)], fill=0, width=max(1, int(0.42 * k)))
        for s2 in (-1, 1):
            d.polygon(P(leaf_poly(cx + s2 * 1.9, pc, math.pi / 2 + s2 * sgn * 0.35, 5.0, 1.5)), fill=0)
        d.polygon(P(leaf_poly(cx, pc + sgn * 11.2, math.pi / 2, 5.6, 2.6)), fill=255)
        d.ellipse([(cx - 0.6) * k, (pc + sgn * 15.4 - 0.6) * k, (cx + 0.6) * k, (pc + sgn * 15.4 + 0.6) * k], fill=255)
        for s2 in (-1, 1):   # side sprigs at the stem
            d.polygon(P(leaf_poly(cx + s2 * 2.6, y_edge + sgn * 2.6, math.pi / 2 - s2 * sgn * 1.0, 3.6, 1.4)),
                      fill=255)

    # --- calligraphy in the reserve (raqm-shaped), a tight two-line composition
    def put_text(txt, xc, yc, wmm, font=F_AR):
        ti, _ = text_image(txt, font, 1000, rtl=True)
        ti = ti.filter(ImageFilter.MaxFilter(3))
        sc = wmm * k / ti.size[0]
        ti = ti.resize((max(1, int(ti.size[0] * sc)), max(1, int(ti.size[1] * sc))), Image.LANCZOS)
        im.paste(255, (int(xc * k - ti.size[0] / 2), int(yc * k - ti.size[1] / 2)), ti)
        return ti.size[1] / k
    h1 = put_text("القرآن", cx, cy - 10.4 * S, 30.5 * S)
    h2 = put_text("الكريم", cx, cy + 10.6 * S, 33.0 * S)
    # small gold sprigs filling the reserve's tips
    for sgn in (-1, 1):
        yy = cy + sgn * (RB - 7.2)
        d.polygon(P(leaf_poly(cx, yy, math.pi / 2, 4.6, 2.1)), fill=255)
        for s2 in (-1, 1):
            d.ellipse([(cx + s2 * 2.6 - 0.45) * k, (yy - sgn * 1.4 - 0.45) * k,
                       (cx + s2 * 2.6 + 0.45) * k, (yy - sgn * 1.4 + 0.45) * k], fill=255)

    # blind (no foil) fillets
    frame(fi + 3.4, 0.32, db)
    frame(2.6, 0.32, db)

    out = finish_foil(im, SS, 300, depth=0.55, ppm=PPM, breaks_amt=0.35)
    arr = np.asarray(out).copy()
    from scipy import ndimage
    bl = ndimage.gaussian_filter(np.asarray(blind.resize((W, H), Image.LANCZOS), np.float32) / 255.0, 0.9)
    arr[..., 1] = np.clip(arr[..., 1] - bl * 0.32 * 255, 0, 255).astype(np.uint8)
    Image.fromarray(arr, "RGB").save(os.path.join(outdir, "quran_cover.png"))
    return h1, h2


def quran_spine(outdir):
    PPM = spec.QURAN_PPM
    SS = 2
    k = PPM * SS
    T = spec.QURAN_T
    R, half, L = spec.spine_arc(T)
    Wm, Hm = L, spec.QURAN_H
    W, H = int(round(Wm * PPM)), int(round(Hm * PPM))
    im = Image.new("L", (W * SS, H * SS), 0)
    d = ImageDraw.Draw(im)
    S = Hm / 240.0
    hubs = [v * S for v in (24.0, 70.0, 170.0, 216.0)]
    for zc in hubs:
        for sgn in (-1, 1):
            d.rectangle([0, (zc + sgn * 4.3 - 0.25) * k, Wm * k, (zc + sgn * 4.3 + 0.25) * k], fill=255)
        n = int(Wm / 1.5)
        for i in range(n):
            x = (Wm - (n - 1) * 1.5) / 2 + i * 1.5
            d.ellipse([(x - 0.42) * k, (zc - 0.42) * k, (x + 0.42) * k, (zc + 0.42) * k], fill=255)
    for zc in (47.0 * S, 193.0 * S):
        draw_star8(d, Wm / 2 * k, zc * k, 6.5 * k, 255, hole=3.0 * k)
        d.ellipse([(Wm / 2 - 1.6) * k, (zc - 1.6) * k, (Wm / 2 + 1.6) * k, (zc + 1.6) * k], fill=255)
    # central panel: small şemse
    zc = Hm / 2
    pts = []
    for i in range(240):
        t = 2 * math.pi * i / 240
        pts.append(((Wm / 2 + 9.0 * math.sin(t)) * k, (zc - 26.0 * math.cos(t) * (1 + 0.05 * math.sin(t) ** 2)) * k))
    d.polygon(pts, outline=255, width=int(0.7 * k))
    ti, _ = text_image("القرآن الكريم", F_AR, 600, rtl=True)
    ti = ti.rotate(-90, expand=True)
    sc = 34.0 * k / ti.size[1]
    ti = ti.resize((int(ti.size[0] * sc), int(ti.size[1] * sc)), Image.LANCZOS)
    im.paste(255, (int(Wm / 2 * k - ti.size[0] / 2), int(zc * k - ti.size[1] / 2)), ti)
    for z0, sgn in ((0.0, 1), (Hm, -1)):
        d.rectangle([0, (z0 + sgn * 5 - 0.3) * k, Wm * k, (z0 + sgn * 5 + 0.3) * k], fill=255)
    out = finish_foil(im, SS, 400, depth=0.5)
    out.save(os.path.join(outdir, "quran_spine.png"))


# ------------------------------------------------------------------ rahle
def rahle_texture(which, outdir, PPM=5):
    """Grey height map for a carved rahle leaf (1 = top surface): edge groove,
    chamfered strapwork with an incised centre line, raised rumi scrolls on
    the legs and the crest, incised mihrab outline and side vines."""
    from scipy import ndimage
    W, L = spec.RAHLE_W, spec.RAHLE_L
    w, h = int(W * PPM), int(L * PPM)
    outline, holes = spec.rahle_leaf(which)

    def tr(p):  # leaf mm -> image px (image row 0 = top = y=L)
        return ((p[0] + W / 2) * PPM, (L - p[1]) * PPM)

    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    d.polygon([tr(p) for p in outline], fill=255)
    for hp in holes:
        d.polygon([tr(p) for p in hp], fill=0)
    solid = np.asarray(m, np.float32) / 255.0
    # distance to the nearest edge (outline or hole), in mm
    dist = ndimage.distance_transform_edt(solid > 0.5) / PPM
    chamfer = np.clip(1.0 - dist / 1.0, 0, 1) ** 1.3          # ~0.8-1 mm eased chamfer on every edge
    # decorative groove 4.2 mm in from the outer contour (not around lattice holes)
    outer = Image.new("L", (w, h), 0)
    ImageDraw.Draw(outer).polygon([tr(p) for p in outline], fill=255)
    dist_o = ndimage.distance_transform_edt(np.asarray(outer) > 127) / PPM
    g = np.exp(-((dist_o - 4.8) / 0.55) ** 2)
    g2 = np.exp(-((dist_o - 7.6) / 0.35) ** 2) * 0.6

    rel = Image.new("L", (w, h), 0)            # incised lines
    rd = ImageDraw.Draw(rel)
    k = PPM
    # strapwork: incised centre line along every strap (interlace look)
    for cl, _hole in spec.rahle_lattice_tiles():
        rd.line([tr(p) for p in cl + [cl[0]]], fill=255, width=max(1, int(round(0.55 * PPM))), joint="curve")
    # cartouche outline around the strapwork
    cart = spec.rahle_cartouche()
    cxc = sum(p[0] for p in cart) / len(cart)
    cyc = sum(p[1] for p in cart) / len(cart)
    pts = []
    for (x, y) in cart:
        dx, dy = x - cxc, y - cyc
        L_ = math.hypot(dx, dy) + 1e-9
        pts.append(tr((x + dx / L_ * 2.2, y + dy / L_ * 2.2)))
    rd.line(pts + [pts[0]], fill=255, width=max(1, int(0.8 * PPM)), joint="curve")
    # mihrab outline 3 / 5.2 mm outside the upper lattice window
    win = spec.rahle_window()
    cxw = sum(p[0] for p in win) / len(win)
    cyw = sum(p[1] for p in win) / len(win)
    for off, lw in ((3.0, 1.0), (5.2, 0.6)):
        pts = []
        for (x, y) in win:
            dx, dy = x - cxw, y - cyw
            L_ = math.hypot(dx, dy) + 1e-9
            pts.append(tr((x + dx / L_ * off, y + dy / L_ * off)))
        rd.line(pts + [pts[0]], fill=255, width=max(1, int(lw * PPM)), joint="curve")
    yh = spec.RAHLE_HINGE
    for sgn in (-1, 1):
        xv = sgn * 0.405 * W
        for j in range(4):
            yv = yh + 34.0 + j * 30.0
            X, Y = tr((xv, yv))
            spiral_vine(rd, 1.0, X, Y, 9.0 * k, 1.15, (j % 2) * math.pi + (0 if sgn > 0 else math.pi),
                        1 if (j + (sgn > 0)) % 2 else -1, 0.9 * k, leaf_len=4.2 * k)
    rr = ndimage.gaussian_filter(np.asarray(rel, np.float32) / 255.0, 0.5 * PPM)

    # raised rumi scrolls: background of small panels cut away, vine left standing
    pan = Image.new("L", (w, h), 0)
    pd = ImageDraw.Draw(pan)
    vine = Image.new("L", (w, h), 0)
    vd = ImageDraw.Draw(vine)
    aw = 0.25 * W
    hwf = spec.rahle_half_width(12.0)
    for sgn in (-1, 1):
        xc = sgn * (aw + hwf) / 2 + sgn * 0.6
        yc, hx, hy = 22.0, (hwf - aw) / 2 - 9.5, 12.5
        poly = []
        for i in range(64):
            t = 2 * math.pi * i / 64
            c_, s_ = math.cos(t), math.sin(t)
            poly.append(tr((xc + hx * math.copysign(abs(c_) ** 0.6, c_),
                            yc + hy * math.copysign(abs(s_) ** 0.6, s_) * (1 + 0.12 * max(0, s_) ** 8))))
        pd.polygon(poly, fill=255)
        X, Y = tr((xc, yc))
        spiral_vine(vd, 1.0, X, Y, 8.6 * k, 1.35, math.pi / 2 + sgn * 0.4, sgn, 1.5 * k, leaf_len=4.6 * k)
    # crest: pair of scrolls flanking the star
    for sgn in (-1, 1):
        X, Y = tr((sgn * 19.0, L - 24.0))
        r_ = 6.5
        pd.ellipse([X - (r_ + 2.5) * k, Y - (r_ + 2.0) * k, X + (r_ + 2.5) * k, Y + (r_ + 2.0) * k], fill=255)
        spiral_vine(vd, 1.0, X, Y, r_ * k, 1.25, 0.0 if sgn > 0 else math.pi, -sgn, 1.3 * k, leaf_len=3.6 * k)
    panel = ndimage.gaussian_filter(np.asarray(pan, np.float32) / 255.0, 0.4 * PPM)
    vinef = ndimage.gaussian_filter(np.asarray(vine, np.float32) / 255.0, 0.35 * PPM)
    ground = panel * (1.0 - np.clip(vinef * 1.6, 0, 1))     # cut-away background
    hgt = 0.85 - 0.45 * chamfer - 0.45 * g - 0.3 * g2 - 0.42 * rr - 0.45 * ground
    hgt = np.where(solid > 0.5, hgt, 0.4)
    Image.fromarray((np.clip(hgt, 0, 1) * 65535).astype(np.uint16)).save(os.path.join(outdir, "rahle_%s.png" % which))


def wood_planks(path_col, path_h, size_m, mm_per_px, boards, early, late, seed, pore=0.5, figure=1.0,
                board_axis_y=True, flecks=0.0, spacing_mm=(2.6, 4.2), late_amt=0.85, zpith=(0.06, 0.20), quarter=0.0,
                ring_noise=0.7, warm_var=0.05, tint_var=0.05, quarter_boards=None, limed=0.0):
    """Realistic flat-sawn plank texture: growth rings from an off-surface pith
    (cathedral arches), ring-width variation, pores, per-board tint, seams.
    Grain runs along image X. Writes an sRGB JPEG colour map and a grey map
    (R: height, used for bump and roughness)."""
    rng = np.random.default_rng(seed)
    W = int(round(size_m[0] * 1000 / mm_per_px))
    H = int(round(size_m[1] * 1000 / mm_per_px))
    x = (np.arange(W, dtype=np.float32) + 0.5) * mm_per_px / 1000.0      # metres
    y = (np.arange(H, dtype=np.float32) + 0.5) * mm_per_px / 1000.0
    X, Y = np.meshgrid(x, y)
    col = np.zeros((H, W, 3), np.float32)
    hgt = np.zeros((H, W), np.float32)
    bw = size_m[1] / boards
    def aniso(cell_mm, sd, octaves, stretch=6.0):
        """Value noise stretched along the grain (image X), like real figure."""
        w2 = max(8, int(W / stretch))
        n = value_noise(H, w2, cell_mm / mm_per_px, sd, octaves)
        return np.asarray(Image.fromarray(n).resize((W, H), Image.BICUBIC), np.float32)
    n_lo = aniso(90.0, seed + 1, 3)          # ~9 cm warps, long along the grain
    n_mid = aniso(14.0, seed + 2, 3)
    n_ring = aniso(40.0, seed + 3, 2)
    stretch_h = max(2, int(1.2 / mm_per_px))
    pores = value_noise(H, W // 40 + 2, 1.0, seed + 4, 1)            # stretched along X
    pores = np.asarray(Image.fromarray(pores).resize((W, H), Image.BILINEAR))
    pores2 = value_noise(H, W // 12 + 2, 1.0, seed + 5, 1)
    pores2 = np.asarray(Image.fromarray(pores2).resize((W, H), Image.BILINEAR))
    early = np.array(early, np.float32) / 255.0
    late = np.array(late, np.float32) / 255.0
    for b in range(boards):
        m = (Y >= b * bw) & (Y < (b + 1) * bw)
        yc = (b + 0.5) * bw
        z0 = rng.uniform(zpith[0], zpith[1])         # pith depth below the surface
        y0 = yc + rng.uniform(-0.6, 0.6) * bw
        is_q = rng.random() < quarter
        if quarter_boards is not None:
            is_q = b in quarter_boards
        if is_q:
            # rift / quarter sawn: pith far to one side -> fine, nearly straight grain
            y0 = yc + rng.choice([-1, 1]) * rng.uniform(0.22, 0.45)
            z0 = rng.uniform(0.02, 0.12)
        taper = rng.uniform(-0.05, 0.05)
        sway = rng.uniform(0.004, 0.012) * figure
        spacing = rng.uniform(spacing_mm[0], spacing_mm[1]) / 1000.0
        zz = z0 + taper * (X - size_m[0] / 2)
        yy = Y - y0 + sway * (n_lo - 0.5) * 1.6 + 0.0010 * (n_mid - 0.5)
        r = np.sqrt(yy * yy + zz * zz)
        phase = r / spacing + ring_noise * (n_ring - 0.5)
        f = phase - np.floor(phase)
        latew = np.clip((f - 0.62) / 0.30, 0, 1) ** 1.6 * (1 - np.clip((f - 0.96) / 0.04, 0, 1))
        tint = rng.uniform(1 - tint_var, 1 + tint_var)
        warm = rng.uniform(-warm_var, warm_var)
        c = early[None, None, :] * (1 - late_amt * latew[..., None]) + late[None, None, :] * (late_amt * latew[..., None])
        c = c * tint
        c[..., 0] *= 1 + warm
        c[..., 2] *= 1 - warm
        # pores: dark fine streaks, mostly in the earlywood
        pr = np.clip((pores - (1 - 0.10 * pore)) * 12, 0, 1) * (1 - 0.6 * latew)
        pr2 = np.clip((pores2 - (1 - 0.06 * pore)) * 10, 0, 1)
        if limed > 0:
            # limed oak: open pores filled with white wax read as pale flecks/streaks
            wax = np.array([0.93, 0.91, 0.87], np.float32)
            a_ = np.clip(limed * (0.85 * pr + 0.5 * pr2), 0, 1)[..., None]
            c = c * (1 - a_) + wax[None, None, :] * a_
        else:
            c *= (1 - 0.35 * pr[..., None]) * (1 - 0.18 * pr2[..., None])
        if flecks > 0:
            fl = np.clip((value_noise(H, W, 3.0, seed + 10 + b, 1) - 0.93) * 12, 0, 1)
            c = c * (1 - fl[..., None] * 0) + fl[..., None] * flecks * early[None, None, :] * 0.15
        col[m] = c[m]
        hgt[m] = (0.7 - 0.25 * latew - 0.45 * pr - 0.2 * pr2)[m]
    # seams between boards
    for b in range(1, boards):
        yy = b * bw
        d = np.abs(Y - yy) * 1000.0
        seam = np.clip(1 - d / 0.55, 0, 1) ** 1.5          # 0.5 mm V-groove (eased edges)
        col *= (1 - 0.45 * seam[..., None])
        hgt -= 0.7 * seam
    mott = value_noise(H, W, 160.0 / mm_per_px, seed + 6, 2)
    col *= (0.94 + 0.12 * mott)[..., None]
    Image.fromarray((np.clip(col, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path_col, quality=92)
    Image.fromarray((np.clip(hgt, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path_h, quality=92)


def walnut(path_col, path_h, size_m=(0.40, 0.20), mm_per_px=0.2, seed=33):
    """Oiled American walnut, flat sawn: cathedral arches from an off-surface
    pith, chocolate-to-caramel streaks, dark mineral lines and open pores.
    Grain runs along image X.  Writes an sRGB colour map and a grey 'pore' map
    (1 = smooth wood, lower = open pores; used for roughness, not bump)."""
    from scipy import ndimage
    rng = np.random.default_rng(seed)
    W = int(round(size_m[0] * 1000 / mm_per_px))
    H = int(round(size_m[1] * 1000 / mm_per_px))
    x = (np.arange(W, dtype=np.float32) + 0.5) * mm_per_px          # mm
    y = (np.arange(H, dtype=np.float32) + 0.5) * mm_per_px
    X, Y = np.meshgrid(x, y)

    def stretched(cell_along, cell_across, sd, octaves=3):
        gw = max(4, int(W * mm_per_px / cell_along * 4))
        gh = max(4, int(H * mm_per_px / cell_across * 4))
        n = value_noise(gh, gw, 4.0, sd, octaves)
        return np.asarray(Image.fromarray(n).resize((W, H), Image.BICUBIC), np.float32)
    warp = stretched(160.0, 40.0, seed + 1, 3) - 0.5
    warp2 = stretched(40.0, 6.0, seed + 2, 2) - 0.5
    # cathedral figure: pith 18-40 mm below the surface, tilted along the board
    y0 = size_m[1] * 1000 * 0.55
    z = 26.0 + 0.085 * (X - x.mean()) + 6.0 * warp
    yy = Y - y0 + 14.0 * warp + 1.6 * warp2
    r = np.sqrt(yy * yy + z * z)
    spacing = 3.1 + 0.9 * stretched(200.0, 60.0, seed + 3, 2)
    phase = r / spacing
    f = phase - np.floor(phase)
    late = np.clip((f - 0.55) / 0.30, 0, 1) ** 1.3 * (1 - np.clip((f - 0.93) / 0.07, 0, 1))
    # broad colour streaks along the grain (walnut is never uniform)
    streak = stretched(140.0, 7.0, seed + 4, 3)
    streak2 = stretched(60.0, 2.2, seed + 5, 2)
    mineral = np.clip((stretched(90.0, 1.2, seed + 6, 1) - 0.80) * 6.0, 0, 1)
    t = 0.40 + 0.40 * late + 0.85 * (streak - 0.5) + 0.30 * (streak2 - 0.5) + 0.30 * mineral
    t = np.clip(t, 0, 1)
    light = np.array([160, 116, 80], np.float32) / 255.0     # caramel
    mid = np.array([92, 60, 40], np.float32) / 255.0
    dark = np.array([40, 23, 14], np.float32) / 255.0        # chocolate / mineral
    tt = t[..., None]
    col = np.where(tt < 0.5, light + (mid - light) * (tt / 0.5), mid + (dark - mid) * ((tt - 0.5) / 0.5))
    # open pores: short dark dashes along the grain, mostly in the earlywood
    pn = value_noise(H, max(8, W // 30), 1.0, seed + 7, 1)
    pn = np.asarray(Image.fromarray(pn).resize((W, H), Image.BILINEAR), np.float32)
    pores = np.clip((pn - 0.80) * 7.0, 0, 1) * (1 - 0.5 * late)
    col *= (1 - 0.30 * pores[..., None])
    # subtle chatoyant lightness ripple across the grain
    col *= (0.96 + 0.08 * stretched(25.0, 1.5, seed + 8, 1))[..., None]
    Image.fromarray((np.clip(col, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path_col, quality=93)
    hgt = 0.85 - 0.6 * pores - 0.12 * late
    hgt = ndimage.gaussian_filter(hgt, 0.6)
    Image.fromarray((np.clip(hgt, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path_h, quality=93)


def vignette(path, w=1080, h=1920):
    """Smooth optical vignette (multiplier) for the compositor."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    nx = (x + 0.5) / w * 2 - 1
    ny = (y + 0.5) / h * 2 - 1
    ar = h / w
    r = np.sqrt((nx * 1.0) ** 2 + (ny * 1.0) ** 2) / math.sqrt(2)
    r2 = np.sqrt(nx ** 2 * 0.62 + ny ** 2) / math.sqrt(1.62)
    v = np.cos(np.clip(r2 * 1.08, 0, 1.4)) ** 3.0   # cos^4-ish natural falloff
    v = 0.70 + 0.30 * (v - v.min()) / (v.max() - v.min())
    Image.fromarray((v * 255 + 0.5).astype(np.uint8)).save(path)


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tex")
    os.makedirs(outdir, exist_ok=True)
    assert features.check("raqm"), "Pillow needs libraqm for Arabic shaping"
    leather_grain(os.path.join(outdir, "leather_grain.png"))
    layout = []
    for i, (t, T) in enumerate(spec.BOOKS):
        r = spine_texture(i, t, T, outdir)
        layout.append(r)
        print("spine", i, r)
    import json
    with open(os.path.join(outdir, "spine_layout.json"), "w", encoding="utf-8") as fh:
        json.dump(layout, fh, ensure_ascii=False, indent=1)
    quran_cover(outdir)
    quran_spine(outdir)
    for wch in "AB":
        rahle_texture(wch, outdir)
    vignette(os.path.join(outdir, "vignette.png"))
    # table: honey oak (less saturated, a little darker, clearer grain), 9 boards
    wood_planks(os.path.join(outdir, "wood_table.jpg"), os.path.join(outdir, "wood_table_h.jpg"), (1.4, 1.6), 0.6,
                9, TABLE_EARLY, TABLE_LATE, 21, pore=1.0, figure=0.6, spacing_mm=(1.5, 2.6), late_amt=0.62,
                limed=TABLE_LIMED,
                zpith=(0.14, 0.32), quarter=0.5, ring_noise=0.35, warm_var=0.02, tint_var=0.035,
                quarter_boards=(0, 2, 3, 5, 6, 7, 8))   # straight rift grain at the front edge (boards 6-8)
    # rahle: oiled walnut with real figure (two leaves cut from one plank)
    walnut(os.path.join(outdir, "wood_walnut.jpg"), os.path.join(outdir, "wood_walnut_h.jpg"))
    print("textures written to", outdir)


if __name__ == "__main__":
    main()
