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
def leather_grain(path, N=2048, mm=51.2):
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
    zt = (p0 + p1) / 2
    maxlen = (p1 - p0) - 2 * 8.0
    words = title.split(" ")
    # choose layout
    cap = 5.4
    fprobe = ImageFont.truetype(F_TITLE, 1000, layout_engine=ImageFont.Layout.RAQM)
    em_len = fprobe.getlength(title) / 1000.0 * cap / 0.66
    if em_len <= maxlen:
        lines = [title]
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
    tl, tw, x0, x1 = place_text_vertical(lines, cap, zt, pitch)
    # author
    a0, a1 = spec.AUTHOR_PANEL
    cap_a = 2.25
    al, aw, ax0, ax1 = place_text_vertical([spec.AUTHOR], cap_a, (a0 + a1) / 2, 3)
    report = dict(title=title, T=T, lines=lines, cap=cap, title_len=round(tl, 1), title_w=round(tw, 1),
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


def quran_cover(outdir):
    PPM = spec.QURAN_PPM
    SS = 2
    k = PPM * SS
    Wm, Hm = spec.QURAN_D, spec.QURAN_H        # texture spans spine->fore-edge x height
    W, H = int(Wm * PPM), int(Hm * PPM)
    im = Image.new("L", (W * SS, H * SS), 0)
    blind = Image.new("L", (W * SS, H * SS), 0)
    d = ImageDraw.Draw(im)
    db = ImageDraw.Draw(blind)
    # board occupies x in [0, Wm - 9] (the right 9 mm is the joint/spine side)
    bx0, bx1 = 0.0, Wm - 9.0
    by0, by1 = 0.0, Hm

    def rect(x0, y0, x1, y1, lw, dd=d):
        dd.rectangle([x0 * k, y0 * k, x1 * k, y1 * k], outline=255, width=max(1, int(round(lw * k))))

    o1 = 6.0
    rect(bx0 + o1, by0 + o1, bx1 - o1, by1 - o1, 0.55)
    rect(bx0 + o1 + 1.2, by0 + o1 + 1.2, bx1 - o1 - 1.2, by1 - o1 - 1.2, 0.25)
    i1 = 17.5
    rect(bx0 + i1, by0 + i1, bx1 - i1, by1 - i1, 0.55)
    rect(bx0 + i1 + 1.2, by0 + i1 + 1.2, bx1 - i1 - 1.2, by1 - i1 - 1.2, 0.25)
    # border band: running scroll between the rule pairs
    bc = (o1 + 1.2 + i1) / 2 + 0.0   # band centre line inset
    amp, period = 2.3, 13.0

    def scroll(xa, ya, xb, yb):
        Lseg = math.hypot(xb - xa, yb - ya)
        ux, uy = (xb - xa) / Lseg, (yb - ya) / Lseg
        nx, ny = -uy, ux
        n = int(Lseg / period)
        per = Lseg / n
        pts = []
        for i in range(int(Lseg * 4) + 1):
            s = i / 4.0
            w = amp * math.sin(2 * math.pi * s / per)
            pts.append(((xa + ux * s + nx * w) * k, (ya + uy * s + ny * w) * k))
        d.line(pts, fill=255, width=int(0.5 * k), joint="curve")
        for j in range(n * 2):
            s = (j + 0.5) * per / 2
            side = 1 if j % 2 == 0 else -1
            px, py = xa + ux * s + nx * amp * side, ya + uy * s + ny * amp * side
            ang = math.atan2(uy, ux) + side * 0.9
            d.polygon([(qx * k, qy * k) for qx, qy in leaf_poly(px - nx * side * 0.6, py - ny * side * 0.6, ang, 4.4, 2.0)], fill=255)
            # small dot on opposite side
            qx, qy = xa + ux * s - nx * amp * side * 0.9, ya + uy * s - ny * amp * side * 0.9
            d.ellipse([(qx - 0.5) * k, (qy - 0.5) * k, (qx + 0.5) * k, (qy + 0.5) * k], fill=255)

    c0 = bc
    corners = [(bx0 + c0, by0 + c0), (bx1 - c0, by0 + c0), (bx1 - c0, by1 - c0), (bx0 + c0, by1 - c0)]
    rr = 3.6
    for a, b in zip(corners, corners[1:] + corners[:1]):
        ux, uy = (b[0] - a[0]), (b[1] - a[1])
        Ls = math.hypot(ux, uy)
        ux, uy = ux / Ls, uy / Ls
        scroll(a[0] + ux * (rr + 1.5), a[1] + uy * (rr + 1.5), b[0] - ux * (rr + 1.5), b[1] - uy * (rr + 1.5))
    for (x, y) in corners:   # corner rosettes
        draw_star8(d, x * k, y * k, rr * k, 255, hole=rr * 0.45 * k)
        d.ellipse([(x - 0.8) * k, (y - 0.8) * k, (x + 0.8) * k, (y + 0.8) * k], fill=255)

    # corner pieces (köşebent): lobed quarter medallions at the inner frame
    fi = i1 + 1.2
    cps = [(bx0 + fi, by0 + fi, 0), (bx1 - fi, by0 + fi, 1), (bx1 - fi, by1 - fi, 2), (bx0 + fi, by1 - fi, 3)]
    for (x, y, q) in cps:
        a0 = q * math.pi / 2
        Rk = 21.0
        pts = [(x * k, y * k)]
        for i in range(61):
            a = a0 + (math.pi / 2) * i / 60
            r = Rk * (1 + 0.055 * math.cos(a * 16 - a0 * 16) ** 2 - 0.05) * (1 + 0.18 * math.sin((i / 60) * math.pi) ** 6)
            pts.append(((x + r * math.cos(a)) * k, (y + r * math.sin(a)) * k))
        d.polygon(pts, outline=255, width=int(0.55 * k))
        # inner fill: spiral vines
        am = a0 + math.pi / 4
        spiral_vine(d, k, x + math.cos(am) * 10.5, y + math.sin(am) * 10.5, 6.0, 1.3, am, 1, 0.38, leaf_len=2.2)
        d.polygon([(px * k, py * k) for px, py in leaf_poly(x + math.cos(am) * 3.5, y + math.sin(am) * 3.5, am, 6.0, 2.6)], fill=255)

    # central şemse with pendants (salbek)
    cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
    a_, b_ = 29.0, 47.0

    def semse(scale, lobes=18, lobe_amp=1.8, n=720):
        pts = []
        for i in range(n):
            t = 2 * math.pi * i / n
            st, ct = math.sin(t), math.cos(t)
            # pointed-oval: sharpen the ends
            x = a_ * scale * st * (1 - 0.18 * ct * ct)
            y = -b_ * scale * ct * (1 + 0.06 * st * st)
            # scallops outward
            nx, ny = x / (a_ * scale + 1e-6), y / (b_ * scale + 1e-6)
            nl = math.hypot(nx, ny) + 1e-9
            lob = lobe_amp * scale * abs(math.sin(lobes * t / 2)) ** 0.6
            pts.append((cx + x + nx / nl * lob, cy + y + ny / nl * lob))
        return pts

    outer = semse(1.0)
    d.polygon([(x * k, y * k) for x, y in outer], fill=255)
    inner = semse(0.90, lobes=18, lobe_amp=0.0)
    d.polygon([(x * k, y * k) for x, y in inner], fill=0)
    inner2 = semse(0.86, lobes=18, lobe_amp=0.0)
    d.polygon([(x * k, y * k) for x, y in inner2], outline=255, width=int(0.3 * k))
    # pendants at the tips
    for sgn in (-1, 1):
        ty = cy + sgn * (b_ * 1.06 + 2.0)
        d.line([(cx * k, ty * k), (cx * k, (ty + sgn * 5.0) * k)], fill=255, width=int(0.6 * k))
        d.polygon([(px * k, py * k) for px, py in leaf_poly(cx, ty + sgn * 9.5, math.pi / 2, 10.0, 6.0)], fill=255)
        for s2 in (-1, 1):
            d.polygon([(px * k, py * k) for px, py in leaf_poly(cx + s2 * 4.2, ty + sgn * 5.5, math.pi / 2 + s2 * sgn * 0.9, 6.0, 2.8)], fill=255)
        d.ellipse([(cx - 1.0) * k, (ty + sgn * 15.4 - 1.0) * k, (cx + 1.0) * k, (ty + sgn * 15.4 + 1.0) * k], fill=255)
    # vines inside the şemse above & below the calligraphy
    for sgn in (-1, 1):
        for s2 in (-1, 1):
            spiral_vine(d, k, cx + s2 * 9.5, cy + sgn * 30.0, 6.5, 1.25, (math.pi / 2) * (1 - sgn) + s2 * 0.6, s2 * sgn, 0.34, leaf_len=2.0)
        d.polygon([(px * k, py * k) for px, py in leaf_poly(cx, cy + sgn * 37.5, math.pi / 2, 7.5, 3.6)], fill=255)

    # calligraphy: two lines, gold, correctly shaped with raqm
    for txt, yc, wmm in (("القرآن", cy - 10.5, 37.0), ("الكريم", cy + 11.0, 40.0)):
        ti, _ = text_image(txt, F_AR, 900, rtl=True)
        sc = wmm * k / ti.size[0]
        ti = ti.resize((int(ti.size[0] * sc), int(ti.size[1] * sc)), Image.LANCZOS)
        im.paste(255, (int(cx * k - ti.size[0] / 2), int(yc * k - ti.size[1] / 2)), ti)

    # blind tooling: a fine diaper lattice in the field between frames (no gold)
    step = 7.0
    for xx in np.arange(bx0 + fi + 2, bx1 - fi, step):
        pass
    # fine blind fillet just inside the border
    rect(bx0 + i1 + 3.0, by0 + i1 + 3.0, bx1 - i1 - 3.0, by1 - i1 - 3.0, 0.35, db)
    rect(bx0 + 3.2, by0 + 3.2, bx1 - 3.2, by1 - 3.2, 0.35, db)

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
    hubs = [24.0, 70.0, 170.0, 216.0]
    for zc in hubs:
        for sgn in (-1, 1):
            d.rectangle([0, (zc + sgn * 4.3 - 0.25) * k, Wm * k, (zc + sgn * 4.3 + 0.25) * k], fill=255)
        n = int(Wm / 1.5)
        for i in range(n):
            x = (Wm - (n - 1) * 1.5) / 2 + i * 1.5
            d.ellipse([(x - 0.42) * k, (zc - 0.42) * k, (x + 0.42) * k, (zc + 0.42) * k], fill=255)
    for zc in (47.0, 193.0):
        draw_star8(d, Wm / 2 * k, zc * k, 7.0 * k, 255, hole=3.2 * k)
        d.ellipse([(Wm / 2 - 1.6) * k, (zc - 1.6) * k, (Wm / 2 + 1.6) * k, (zc + 1.6) * k], fill=255)
    # central panel: small şemse
    zc = 120.0
    pts = []
    for i in range(240):
        t = 2 * math.pi * i / 240
        pts.append(((Wm / 2 + 9.0 * math.sin(t)) * k, (zc - 26.0 * math.cos(t) * (1 + 0.05 * math.sin(t) ** 2)) * k))
    d.polygon(pts, outline=255, width=int(0.7 * k))
    ti, _ = text_image("القرآن الكريم", F_AR, 600, rtl=True)
    ti = ti.rotate(-90, expand=True)
    sc = 38.0 * k / ti.size[1]
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
    # carved rosettes (relief) on solid areas
    rel = Image.new("L", (w, h), 0)
    rd = ImageDraw.Draw(rel)
    for (x, y, R) in ((0.0, 160.0 if which == 'A' else 140.0, 0.0), (0.0, 348.0, 0.0)):
        pass
    for (x, y) in ((-62.0, 48.0), (62.0, 48.0)):
        X, Y = tr((x, y))
        for kk in range(8):
            a = kk * math.pi / 4
            pts = leaf_poly(X + math.cos(a) * 3.2 * PPM, Y + math.sin(a) * 3.2 * PPM, a, 6.0 * PPM, 2.8 * PPM)
            rd.polygon(pts, fill=255)
    rr = np.asarray(rel.filter(ImageFilter.GaussianBlur(1.5)), np.float32) / 255
    hgt = 0.75 - 0.6 * g - 0.35 * g2 - 0.30 * rr
    # chamfer towards every edge (carved bevel) so cut edges read as carved
    dist = np.asarray(erode(m, 1.0).filter(ImageFilter.GaussianBlur(3.0)), np.float32) / 255
    hgt = hgt * (0.85 + 0.15 * dist)
    Image.fromarray((np.clip(hgt, 0, 1) * 255).astype(np.uint8)).save(os.path.join(outdir, "rahle_%s.png" % which))


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tex")
    os.makedirs(outdir, exist_ok=True)
    assert features.check("raqm"), "Pillow needs libraqm for Arabic shaping"
    leather_grain(os.path.join(outdir, "leather_grain.png"))
    for i, (t, T) in enumerate(spec.BOOKS):
        r = spine_texture(i, t, T, outdir)
        print("spine", i, r)
    quran_cover(outdir)
    quran_spine(outdir)
    for wch in "AB":
        rahle_texture(wch, outdir)
    print("textures written to", outdir)


if __name__ == "__main__":
    main()
