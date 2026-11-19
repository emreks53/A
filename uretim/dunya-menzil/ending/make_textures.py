#!/usr/bin/env python3
"""Generate all bitmap textures for the Külliyat ending shot.

Run with the system python3 (needs Pillow built with libraqm for correct
Arabic shaping, and numpy):  python3 make_textures.py [outdir]

Outputs (default: ./tex next to this file):
  spine_00.png .. spine_13.png  RGB  R=gold-foil mask, G=height (1=leather
                                surface, lower=debossed), B=foil variation
  leather_grain.png             16-bit grey, tileable, 51.2 mm square
  quran_cover.png               RGB  R=gold mask, G=height, B=foil variation
  quran_spine.png               RGB  (same channel layout)
  rahle_A.png / rahle_B.png     grey height map for the carved leaves
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

RNG = np.random.default_rng(1405)


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


def finish_foil(mask_hi, ss, seed, wear_rows=None, depth=0.55):
    """Downsample supersampled mask and build the 3 output channels."""
    w, h = mask_hi.size[0] // ss, mask_hi.size[1] // ss
    m = np.asarray(mask_hi.resize((w, h), Image.LANCZOS), np.float32) / 255.0
    # foil imperfections: tiny breaks and slightly uneven coverage
    n1 = value_noise(h, w, 3.0, seed, 2)
    n2 = value_noise(h, w, 18.0, seed + 1, 3)
    breaks = np.clip((n1 - 0.80) * 6.0, 0, 1) * 0.85
    cover = np.clip(1.0 - breaks - np.clip((0.30 - n2) * 1.2, 0, 0.25), 0, 1)
    if wear_rows is not None:
        cover *= wear_rows[:, None]
    gold = np.clip(m * cover, 0, 1)
    # deboss: the tool presses the whole motif (also where foil broke off)
    mb = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1)), np.float32) / 255.0
    height = 1.0 - depth * mb
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
            d.ellipse([(x + pitch / 2 - 0.22) * k, (z - 0.22) * k, (x + pitch / 2 + 0.22) * k, (z + 0.22) * k], fill=255)

    H = spec.BOOK_H
    # head & tail: double fillet + lozenge roll
    for z0, sgn in ((0.0, 1), (H, -1)):
        rule(z0 + sgn * 5.0, 0.55)
        rule(z0 + sgn * 6.25, 0.25)
        lozenge_roll(z0 + sgn * 10.4, 1.55, 2.6)
        rule(z0 + sgn * 13.0, 0.25)
    # hubs: dotted roll on the crest, fillets either side
    for zc in spec.HUBS_FROM_TOP:
        dots_row(zc, 0.42, 1.45)
        for sgn in (-1, 1):
            rule(zc + sgn * (spec.HUB_HALF + 1.3), 0.5)
            rule(zc + sgn * (spec.HUB_HALF + 2.25), 0.22)
    # ornament panel: 8-point star rosette with a ring
    zo = sum(spec.ORNAMENT_PANEL) / 2
    Rs = min(4.6, (T - 4.5) / 2)
    draw_star8(d, cx * k, zo * k, Rs * k, 255, hole=Rs * 0.48 * k)
    d.ellipse([(cx - Rs * 0.26) * k, (zo - Rs * 0.26) * k, (cx + Rs * 0.26) * k, (zo + Rs * 0.26) * k], fill=255)
    for sgn in (-1, 1):  # tiny dots flanking
        zz = zo + sgn * (Rs + 1.6)
        d.ellipse([(cx - 0.45) * k, (zz - 0.45) * k, (cx + 0.45) * k, (zz + 0.45) * k], fill=255)

    # ------------------------------------------------------------ title
    def place_text_vertical(lines, cap_mm, z_center, line_pitch_mm):
        """Render lines horizontally, rotate clockwise (reads top->bottom),
        paste centred on the spine at z_center. Returns (length_mm, width_mm)."""
        px = int(round(cap_mm / 0.66 * k))
        f = ImageFont.truetype(F_TITLE, px, layout_engine=ImageFont.Layout.RAQM)
        capp, base_off = cap_metrics(F_TITLE, px)
        widths = [f.getlength(t) for t in lines]
        bw = int(max(widths)) + px
        pitch = line_pitch_mm * k
        bh = int(capp + pitch * (len(lines) - 1) + px * 1.2)
        blk = Image.new("L", (bw, bh), 0)
        bd = ImageDraw.Draw(blk)
        top_pad = int(px * 0.45)
        for i, t in enumerate(lines):
            xw = widths[i]
            base_y = top_pad + capp + i * pitch
            bd.text(((bw - xw) / 2, base_y - base_off), t, font=f, fill=255)
        # centre of the cap band block (between first cap-top and last baseline)
        band_c = top_pad + (capp + pitch * (len(lines) - 1)) / 2
        rot = blk.rotate(-90, expand=True)    # clockwise
        # after clockwise rotation: old y -> new x mirrored: x' = bh-1-y ; old x -> y'
        cxp = (bh - 1 - band_c)
        cyp = bw / 2
        dx = int(round(cx * k - cxp))
        dy = int(round(z_center * k - cyp))
        im.paste(255, (dx, dy), rot)
        bb = rot.getbbox()
        return (bb[3] - bb[1]) / k, (bb[2] - bb[0]) / k, (dx + bb[0]) / k, (dx + bb[2]) / k

    p0, p1 = spec.TITLE_PANEL
    maxlen = (p1 - p0) - 2 * 7.0
    words = title.split(" ")
    # choose layout
    cap = 5.8
    fprobe = ImageFont.truetype(F_TITLE, 1000, layout_engine=ImageFont.Layout.RAQM)
    em_len = fprobe.getlength(title) / 1000.0 * cap / 0.66
    if em_len <= maxlen:
        lines = [title]
    elif em_len * 5.2 / cap <= maxlen + 6.0:
        # long title: keep one line, shrink slightly and use slimmer end margins
        lines = [title]
        cap = cap * min(1.0, (maxlen + 6.0) / em_len)
    else:
        best = None
        for i in range(1, len(words)):
            a, b = " ".join(words[:i]), " ".join(words[i:])
            m = max(fprobe.getlength(a), fprobe.getlength(b))
            if best is None or m < best[0]:
                best = (m, [a, b])
        lines = best[1]
        cap = 4.6
    pitch = cap * 1.42
    # top-aligned: the title starts 7 mm below the upper hub fillets and reads
    # downward (keeps every title clear of the Kur'an in front of the row)
    fprobe2 = ImageFont.truetype(F_TITLE, 1000, layout_engine=ImageFont.Layout.RAQM)
    est = max(fprobe2.getlength(t) for t in lines) / 1000.0 * cap / 0.66
    zt = p0 + 7.0 + est / 2
    tl, tw, x0, x1 = place_text_vertical(lines, cap, zt, pitch)
    # author
    a0, a1 = spec.AUTHOR_PANEL
    cap_a = 2.25
    al, aw, ax0, ax1 = place_text_vertical([spec.AUTHOR], cap_a, (a0 + a1) / 2, 3)
    report = dict(title=title, T=T, lines=lines, cap=round(cap, 2), title_top=round(zt - tl / 2, 1),
                  title_bottom=round(zt + tl / 2, 1), title_len=round(tl, 1), title_w=round(tw, 1),
                  margin_l=round(x0, 2), margin_r=round(Wm - x1, 2), author_len=round(al, 1), panel_len=p1 - p0)

    # foil wear rows: slightly more rubbed near head/tail and on hub crests
    zz = (np.arange(Hp) + 0.5) / PPM
    wear = np.ones(Hp, np.float32)
    for zc in spec.HUBS_FROM_TOP:
        wear -= 0.22 * np.exp(-((zz - zc) / 1.2) ** 2)
    wear -= 0.25 * np.exp(-(zz / 7.0) ** 2) + 0.25 * np.exp(-((H - zz) / 7.0) ** 2)
    out = finish_foil(im, SS, 100 + idx, wear_rows=np.clip(wear, 0.5, 1.0))
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


def quran_cover(outdir):
    PPM = spec.QURAN_PPM
    SS = 2
    k = PPM * SS
    Wm, Hm = spec.QURAN_D, spec.QURAN_H        # texture spans spine->fore-edge x height
    S = Hm / 240.0
    W, H = int(Wm * PPM), int(Hm * PPM)
    im = Image.new("L", (W * SS, H * SS), 0)
    blind = Image.new("L", (W * SS, H * SS), 0)
    d = ImageDraw.Draw(im)
    db = ImageDraw.Draw(blind)
    # board occupies x in [0, Wm - 9]  (the right 9 mm is the joint / spine side;
    # image left = fore-edge, image right = spine: an Arabic binding)
    bx0, bx1 = 0.0, Wm - 9.0
    by0, by1 = 0.0, Hm

    def rect(x0, y0, x1, y1, lw, dd=d):
        dd.rectangle([x0 * k, y0 * k, x1 * k, y1 * k], outline=255, width=max(1, int(round(lw * k))))

    o1 = 5.5
    rect(bx0 + o1, by0 + o1, bx1 - o1, by1 - o1, 0.55)
    rect(bx0 + o1 + 1.1, by0 + o1 + 1.1, bx1 - o1 - 1.1, by1 - o1 - 1.1, 0.22)
    i1 = 15.5
    rect(bx0 + i1, by0 + i1, bx1 - i1, by1 - i1, 0.55)
    rect(bx0 + i1 + 1.1, by0 + i1 + 1.1, bx1 - i1 - 1.1, by1 - i1 - 1.1, 0.22)
    bc = (o1 + 1.1 + i1) / 2
    amp, period = 2.0, 11.5

    def scroll(xa, ya, xb, yb):
        Lseg = math.hypot(xb - xa, yb - ya)
        ux, uy = (xb - xa) / Lseg, (yb - ya) / Lseg
        nx, ny = -uy, ux
        n = max(1, int(Lseg / period))
        per = Lseg / n
        pts = []
        for i in range(int(Lseg * 4) + 1):
            s_ = i / 4.0
            w = amp * math.sin(2 * math.pi * s_ / per)
            pts.append(((xa + ux * s_ + nx * w) * k, (ya + uy * s_ + ny * w) * k))
        d.line(pts, fill=255, width=int(0.42 * k), joint="curve")
        for j in range(n * 2):
            s_ = (j + 0.5) * per / 2
            side = 1 if j % 2 == 0 else -1
            px, py = xa + ux * s_ + nx * amp * side, ya + uy * s_ + ny * amp * side
            ang = math.atan2(uy, ux) + side * 0.9
            d.polygon([(qx * k, qy * k) for qx, qy in leaf_poly(px - nx * side * 0.5, py - ny * side * 0.5, ang, 3.9, 1.8)], fill=255)
            qx, qy = xa + ux * s_ - nx * amp * side * 0.95, ya + uy * s_ - ny * amp * side * 0.95
            d.ellipse([(qx - 0.42) * k, (qy - 0.42) * k, (qx + 0.42) * k, (qy + 0.42) * k], fill=255)

    corners = [(bx0 + bc, by0 + bc), (bx1 - bc, by0 + bc), (bx1 - bc, by1 - bc), (bx0 + bc, by1 - bc)]
    rr = 3.3
    for a_, b_ in zip(corners, corners[1:] + corners[:1]):
        ux, uy = (b_[0] - a_[0]), (b_[1] - a_[1])
        Ls = math.hypot(ux, uy)
        ux, uy = ux / Ls, uy / Ls
        scroll(a_[0] + ux * (rr + 1.4), a_[1] + uy * (rr + 1.4), b_[0] - ux * (rr + 1.4), b_[1] - uy * (rr + 1.4))
    for (x, y) in corners:   # corner rosettes
        draw_star8(d, x * k, y * k, rr * k, 255, hole=rr * 0.45 * k)
        d.ellipse([(x - 0.7) * k, (y - 0.7) * k, (x + 0.7) * k, (y + 0.7) * k], fill=255)

    # corner pieces (köşebent): solid gold lobed quarter medallions with a
    # reversed-out inner quarter holding a small gold palmette
    fi = i1 + 1.1
    cps = [(bx0 + fi, by0 + fi, 0), (bx1 - fi, by0 + fi, 1), (bx1 - fi, by1 - fi, 2), (bx0 + fi, by1 - fi, 3)]
    for (x, y, q) in cps:
        Rk = 19.0 * S
        d.polygon([(px * k, py * k) for px, py in lobed_quarter(x, y, q, Rk)], fill=255)
        d.polygon([(px * k, py * k) for px, py in lobed_quarter(x, y, q, Rk - 1.6, lobes=7)], fill=0)
        d.polygon([(px * k, py * k) for px, py in lobed_quarter(x, y, q, Rk - 2.4, lobes=7)], outline=255,
                  width=max(1, int(0.25 * k)))
        am = q * math.pi / 2 + math.pi / 4
        spiral_vine(d, k, x + math.cos(am) * 9.0 * S, y + math.sin(am) * 9.0 * S, 5.0 * S, 1.2, am + math.pi,
                    1 if q % 2 == 0 else -1, 0.32, leaf_len=1.9)
        d.polygon([(px * k, py * k) for px, py in leaf_poly(x + math.cos(am) * 3.2, y + math.sin(am) * 3.2, am,
                                                             5.5 * S, 2.4 * S)], fill=255)

    # central şemse with pendants (salbek)
    cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
    a_, b_ = 27.0 * S, 45.0 * S

    def semse(scale, lobes=20, lobe_amp=1.5, n=900):
        pts = []
        for i in range(n):
            t = 2 * math.pi * i / n
            st, ct = math.sin(t), math.cos(t)
            x = a_ * scale * st * (1 - 0.16 * ct * ct)
            y = -b_ * scale * ct * (1 + 0.05 * st * st)
            nx, ny = x / (a_ * scale + 1e-6), y / (b_ * scale + 1e-6)
            nl = math.hypot(nx, ny) + 1e-9
            lob = lobe_amp * abs(math.sin(lobes * t / 2)) ** 0.55
            pts.append((cx + x + nx / nl * lob, cy + y + ny / nl * lob))
        return pts

    d.polygon([(x * k, y * k) for x, y in semse(1.0)], fill=255)
    d.polygon([(x * k, y * k) for x, y in semse(0.955, lobe_amp=0.0)], fill=0)
    d.polygon([(x * k, y * k) for x, y in semse(0.915, lobe_amp=0.0)], outline=255, width=max(1, int(0.28 * k)))
    # ring of tiny dots just outside the scallops
    for i in range(64):
        t = 2 * math.pi * (i + 0.5) / 64
        st, ct = math.sin(t), math.cos(t)
        x = (a_ + 3.2) * st * (1 - 0.16 * ct * ct)
        y = -(b_ + 3.2) * ct * (1 + 0.05 * st * st)
        d.ellipse([(cx + x - 0.38) * k, (cy + y - 0.38) * k, (cx + x + 0.38) * k, (cy + y + 0.38) * k], fill=255)
    for sgn in (-1, 1):
        ty = cy + sgn * (b_ * 1.05 + 2.4)
        d.line([(cx * k, ty * k), (cx * k, (ty + sgn * 4.5 * S) * k)], fill=255, width=int(0.55 * k))
        d.polygon([(px * k, py * k) for px, py in leaf_poly(cx, ty + sgn * 9.0 * S, math.pi / 2, 9.5 * S, 5.6 * S)], fill=255)
        for s2 in (-1, 1):
            d.polygon([(px * k, py * k) for px, py in leaf_poly(cx + s2 * 3.9 * S, ty + sgn * 5.0 * S,
                                                                 math.pi / 2 + s2 * sgn * 0.9, 5.6 * S, 2.6 * S)], fill=255)
        d.ellipse([(cx - 0.9) * k, (ty + sgn * 14.6 * S - 0.9) * k, (cx + 0.9) * k, (ty + sgn * 14.6 * S + 0.9) * k], fill=255)
    for sgn in (-1, 1):
        for s2 in (-1, 1):
            spiral_vine(d, k, cx + s2 * 8.5 * S, cy + sgn * 28.5 * S, 5.8 * S, 1.2, (math.pi / 2) * (1 - sgn) + s2 * 0.6,
                        s2 * sgn, 0.30, leaf_len=1.8)
        d.polygon([(px * k, py * k) for px, py in leaf_poly(cx, cy + sgn * 35.5 * S, math.pi / 2, 6.5 * S, 3.2 * S)], fill=255)

    # calligraphy: two lines, gold, correctly shaped with raqm
    for txt, yc, wmm in (("القرآن", cy - 10.0 * S, 35.0 * S), ("الكريم", cy + 10.5 * S, 38.0 * S)):
        ti, _ = text_image(txt, F_AR, 900, rtl=True)
        sc = wmm * k / ti.size[0]
        ti = ti.resize((int(ti.size[0] * sc), int(ti.size[1] * sc)), Image.LANCZOS)
        im.paste(255, (int(cx * k - ti.size[0] / 2), int(yc * k - ti.size[1] / 2)), ti)

    # blind (no foil) fillets
    rect(bx0 + i1 + 3.0, by0 + i1 + 3.0, bx1 - i1 - 3.0, by1 - i1 - 3.0, 0.32, db)
    rect(bx0 + 3.0, by0 + 3.0, bx1 - 3.0, by1 - 3.0, 0.32, db)

    out = finish_foil(im, SS, 300, depth=0.55)
    arr = np.asarray(out).copy()
    bl = np.asarray(blind.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.0)), np.float32) / 255.0
    arr[..., 1] = np.clip(arr[..., 1] - bl * 0.45 * 255, 0, 255).astype(np.uint8)
    Image.fromarray(arr, "RGB").save(os.path.join(outdir, "quran_cover.png"))


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
def rahle_texture(which, outdir, PPM=4):
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

    def erode(img, mm):
        n = int(round(mm * PPM))
        out = img
        while n > 0:
            s = min(n, 4)
            out = out.filter(ImageFilter.MinFilter(2 * s + 1))
            n -= s
        return out

    e1 = erode(m, 4.2)
    e2 = erode(e1, 1.1)
    groove = ImageChops.subtract(e1, e2)
    e3 = erode(e2, 2.2)
    e4 = erode(e3, 0.6)
    groove2 = ImageChops.subtract(e3, e4)
    g = np.asarray(groove.filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255
    g2 = np.asarray(groove2.filter(ImageFilter.GaussianBlur(0.9)), np.float32) / 255
    # relief: incised mihrab outline + vine scrolls in the side margins + rosettes
    rel = Image.new("L", (w, h), 0)
    rd = ImageDraw.Draw(rel)
    win = spec.rahle_window()
    # outline 2.5 mm outside the lattice window
    cxw = sum(p[0] for p in win) / len(win)
    cyw = sum(p[1] for p in win) / len(win)
    for off, lw in ((3.0, 1.0), (5.2, 0.6)):
        pts = []
        for (x, y) in win:
            dx, dy = x - cxw, y - cyw
            L_ = math.hypot(dx, dy) + 1e-9
            pts.append(tr((x + dx / L_ * off, y + dy / L_ * off)))
        rd.line(pts + [pts[0]], fill=255, width=max(1, int(lw * PPM)), joint="curve")
    k = PPM
    yh = spec.RAHLE_HINGE
    for sgn in (-1, 1):
        xv = sgn * 0.405 * W
        for j in range(4):
            yv = yh + 34.0 + j * 30.0
            X, Y = tr((xv, yv))
            spiral_vine(rd, 1.0, X, Y, 9.0 * k, 1.15, (j % 2) * math.pi + (0 if sgn > 0 else math.pi), 1 if (j + (sgn > 0)) % 2 else -1,
                        0.9 * k, leaf_len=4.2 * k)
    cart = spec.rahle_cartouche()
    for off, lw in ((2.6, 0.9), (4.6, 0.55)):
        cxc = sum(p[0] for p in cart) / len(cart)
        cyc = sum(p[1] for p in cart) / len(cart)
        pts = []
        for (x, y) in cart:
            dx, dy = x - cxc, y - cyc
            L_ = math.hypot(dx, dy) + 1e-9
            pts.append(tr((x + dx / L_ * off, y + dy / L_ * off)))
        rd.line(pts + [pts[0]], fill=255, width=max(1, int(lw * PPM)), joint="curve")
    for (x, y) in ((-0.40 * W, 0.70 * yh + 26.0), (0.40 * W, 0.70 * yh + 26.0)):
        X, Y = tr((x, y))
        for kk in range(8):
            a_ = kk * math.pi / 4
            rd.polygon(leaf_poly(X + math.cos(a_) * 2.6 * PPM, Y + math.sin(a_) * 2.6 * PPM, a_, 5.0 * PPM, 2.2 * PPM), fill=255)
    rr = np.asarray(rel.filter(ImageFilter.GaussianBlur(1.5)), np.float32) / 255
    hgt = 0.75 - 0.6 * g - 0.35 * g2 - 0.45 * rr
    Image.fromarray((np.clip(hgt, 0, 1) * 65535).astype(np.uint16)).save(os.path.join(outdir, "rahle_%s.png" % which))


def wood_planks(path_col, path_h, size_m, mm_per_px, boards, early, late, seed, pore=0.5, figure=1.0,
                board_axis_y=True, flecks=0.0, spacing_mm=(2.6, 4.2), late_amt=0.85, zpith=(0.06, 0.20), quarter=0.0):
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
    n_lo = value_noise(H, W, 90.0 / mm_per_px, seed + 1, 3)          # ~9 cm warps
    n_mid = value_noise(H, W, 14.0 / mm_per_px, seed + 2, 3)
    n_ring = value_noise(H, W, 40.0 / mm_per_px, seed + 3, 2)
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
        if rng.random() < quarter:
            # rift / quarter sawn: pith far to one side -> fine, nearly straight grain
            y0 = yc + rng.choice([-1, 1]) * rng.uniform(0.22, 0.45)
            z0 = rng.uniform(0.02, 0.12)
        taper = rng.uniform(-0.05, 0.05)
        sway = rng.uniform(0.004, 0.012) * figure
        spacing = rng.uniform(spacing_mm[0], spacing_mm[1]) / 1000.0
        zz = z0 + taper * (X - size_m[0] / 2)
        yy = Y - y0 + sway * (n_lo - 0.5) * 1.6 + 0.0010 * (n_mid - 0.5)
        r = np.sqrt(yy * yy + zz * zz)
        phase = r / spacing + 0.7 * (n_ring - 0.5)
        f = phase - np.floor(phase)
        latew = np.clip((f - 0.62) / 0.30, 0, 1) ** 1.6 * (1 - np.clip((f - 0.96) / 0.04, 0, 1))
        tint = rng.uniform(0.95, 1.05)
        warm = rng.uniform(-0.05, 0.05)
        c = early[None, None, :] * (1 - late_amt * latew[..., None]) + late[None, None, :] * (late_amt * latew[..., None])
        c = c * tint
        c[..., 0] *= 1 + warm
        c[..., 2] *= 1 - warm
        # pores: dark fine streaks, mostly in the earlywood
        pr = np.clip((pores - (1 - 0.10 * pore)) * 12, 0, 1) * (1 - 0.6 * latew)
        pr2 = np.clip((pores2 - (1 - 0.06 * pore)) * 10, 0, 1)
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
        seam = np.clip(1 - d / 0.35, 0, 1)
        col *= (1 - 0.55 * seam[..., None])
        hgt -= 0.6 * seam
    mott = value_noise(H, W, 160.0 / mm_per_px, seed + 6, 2)
    col *= (0.94 + 0.12 * mott)[..., None]
    Image.fromarray((np.clip(col, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path_col, quality=92)
    Image.fromarray((np.clip(hgt, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path_h, quality=92)


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
    # table: honey oak, five boards; covers x 1.4 m x y 1.6 m of the table top
    wood_planks(os.path.join(outdir, "wood_table.jpg"), os.path.join(outdir, "wood_table_h.jpg"), (1.4, 1.6), 0.6,
                9, (200, 156, 110), (156, 110, 72), 21, pore=0.8, figure=0.6, spacing_mm=(1.4, 2.4), late_amt=0.5,
                zpith=(0.10, 0.30), quarter=0.75)
    # rahle: dark walnut (two leaves cut from one plank)
    wood_planks(os.path.join(outdir, "wood_walnut.jpg"), os.path.join(outdir, "wood_walnut_h.jpg"), (0.40, 0.20), 0.25,
                1, (96, 62, 41), (56, 35, 23), 33, pore=1.0, figure=0.9, spacing_mm=(1.0, 1.8), late_amt=0.45,
                zpith=(0.25, 0.5), quarter=1.0)
    print("textures written to", outdir)


if __name__ == "__main__":
    main()
