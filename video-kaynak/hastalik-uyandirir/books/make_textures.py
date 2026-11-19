#!/usr/bin/env python3
"""Generates the gold-foil masks for the Risale-i Nur spines and the Qur'an cover.

Run with the *system* python3 (needs Pillow + numpy):
    python3 make_textures.py <workdir>
It reads <workdir>/tex/spec.json (written by build_books.py) and writes
    tex/spine_XX.png   RGB: R = gold foil coverage, G = tooling depth (deboss), B = rub/burnish mask
    tex/quran_cover.png RGB: R = gold coverage, G = relief height, B = blind (debossed, no gold) lines
Only real text from the spec is drawn - no placeholder glyphs anywhere.
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WD = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(WD, 'tex')
spec = json.load(open(os.path.join(TEX, 'spec.json'), encoding='utf-8'))
FONT = spec['font']
SS = 2  # supersampling factor


# --------------------------------------------------------------------------- helpers
def pointed_oval(cx, cy, a, b, n=400):
    """Vesica-like pointed oval (half width a, half height b), pointed at top/bottom."""
    R = (a * a + b * b) / (2 * a)
    ys = np.linspace(-b, b, n // 2)
    xs = np.sqrt(np.maximum(R * R - ys * ys, 0)) - (R - a)
    right = np.stack([cx + xs, cy + ys], 1)
    left = np.stack([cx - xs[::-1], cy + ys[::-1]], 1)
    return np.concatenate([right, left], 0)


def resample(poly, n):
    seg = np.linalg.norm(np.diff(np.vstack([poly, poly[:1]]), axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    t = np.linspace(0, s[-1], n, endpoint=False)
    P = np.vstack([poly, poly[:1]])
    x = np.interp(t, s, P[:, 0]); y = np.interp(t, s, P[:, 1])
    return np.stack([x, y], 1), s[-1]


def normals(poly):
    d = np.roll(poly, -1, 0) - np.roll(poly, 1, 0)
    n = np.stack([d[:, 1], -d[:, 0]], 1)
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    c = poly.mean(0)
    if np.mean(np.sum((poly - c) * n, 1)) < 0:
        n = -n
    return n


def scallop(poly, lobes, amp, sharp=0.6, keep_tips=True):
    """Offset an outline outward by rounded lobes (Ottoman 'tepelik' scallops)."""
    P, L = resample(poly, 1600)
    N = normals(P)
    t = np.arange(len(P)) / len(P)
    w = np.abs(np.sin(math.pi * lobes * t)) ** sharp
    off = amp * w
    return P + N * off[:, None]


def offset(poly, d):
    P, _ = resample(poly, 1600)
    return P + normals(P) * d


def draw_poly(dr, poly, fill):
    dr.polygon([tuple(p) for p in poly], fill=fill)


def spiral(cx, cy, r0, r1, turns, ang0, sign=1, n=90):
    t = np.linspace(0, 1, n)
    r = r0 * (r1 / r0) ** t
    a = ang0 + sign * 2 * math.pi * turns * t
    return np.stack([cx + r * np.cos(a), cy + r * np.sin(a)], 1)


def draw_line(dr, pts, w, fill):
    dr.line([tuple(p) for p in pts], fill=fill, width=max(1, int(round(w))), joint='curve')
    r = w / 2
    for p in (pts[0], pts[-1]):
        dr.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=fill)


def rosette(dr, cx, cy, r, petals, fill, bg, inner=0.35):
    """Small flower: petals as ellipses around a centre dot."""
    for k in range(petals):
        a = 2 * math.pi * k / petals
        px, py = cx + math.cos(a) * r * 0.55, cy + math.sin(a) * r * 0.55
        pts = []
        for t in np.linspace(0, 2 * math.pi, 40):
            ex, ey = math.cos(t) * r * 0.45, math.sin(t) * r * 0.2
            pts.append((px + ex * math.cos(a) - ey * math.sin(a), py + ex * math.sin(a) + ey * math.cos(a)))
        dr.polygon(pts, fill=fill)
    rr = r * inner
    dr.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=fill)
    rr2 = r * inner * 0.45
    dr.ellipse([cx - rr2, cy - rr2, cx + rr2, cy + rr2], fill=bg)


def finish(gold_L, depth_L, rub_L, out, size):
    g = gold_L.resize(size, Image.LANCZOS)
    d = depth_L.resize(size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
    b = rub_L.resize(size, Image.BILINEAR)
    Image.merge('RGB', (g, d, b)).save(out, optimize=False)


# --------------------------------------------------------------------------- spine
def spine_ornament(dr, cx, cy, w, h, ppm):
    """Small şemse (pointed lobed medallion) with finials, for head/tail panels."""
    a, b = w / 2, h / 2 * 0.78
    base = pointed_oval(cx, cy, a * 0.82, b)
    outer = scallop(base, lobes=14, amp=a * 0.16, sharp=0.55)
    draw_poly(dr, outer, 255)
    draw_poly(dr, offset(base, -0.30 * ppm), 0)          # thin leather gap
    draw_poly(dr, offset(base, -0.55 * ppm), 255)        # inner gold field
    inner2 = offset(base, -(a * 0.30))
    draw_poly(dr, inner2, 0)
    rosette(dr, cx, cy, min(a * 0.62, b * 0.4), 8, 255, 0, inner=0.32)
    # finials above / below
    for s in (-1, 1):
        ty = cy + s * (b + a * 0.16 + 0.5 * ppm)
        fy = ty + s * h * 0.08
        dr.line([(cx, ty), (cx, fy)], fill=255, width=max(1, int(0.35 * ppm)))
        r = a * 0.22
        dr.ellipse([cx - r, fy - r, cx + r, fy + r], fill=255)
        r2 = r * 0.45
        dr.ellipse([cx - r2, fy - r2, cx + r2, fy + r2], fill=0)
        for sx in (-1, 1):
            lx = cx + sx * r * 1.25
            dr.ellipse([lx - r * 0.5, fy - s * r * 0.4 - r * 0.5, lx + r * 0.5, fy - s * r * 0.4 + r * 0.5], fill=255)


def small_fleuron(dr, cx, cy, r):
    rosette(dr, cx, cy, r, 4, 255, 0, inner=0.30)
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        x, y = cx + math.cos(a) * r * 0.95, cy + math.sin(a) * r * 0.95
        rr = r * 0.12
        dr.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255)


def make_spine(sp):
    ppm = sp['px_per_mm'] * SS
    Wmm, Hmm = sp['width_mm'], sp['height_mm']
    W, H = int(round(Wmm * ppm)), int(round(Hmm * ppm))
    gold = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(gold)
    Z = lambda zmm: (Hmm - zmm) * ppm          # z (mm from the foot) -> pixel row
    margin = 0.6 * ppm
    lw = sp['rule_mm'] * ppm

    def rule(zmm, w=lw):
        y = Z(zmm)
        dr.rectangle([margin, y - w / 2, W - margin, y + w / 2], fill=255)

    # rules beside the raised bands
    for (zc, bw) in sp['bands']:
        rule(zc + bw / 2 + 0.9)
        rule(zc - bw / 2 - 0.9)
    # double rules at head and tail
    for z0, s in ((sp['tail_rule_mm'], 1), (Hmm - sp['tail_rule_mm'], -1)):
        rule(z0)
        rule(z0 + s * 1.1, lw * 0.7)

    panels = sp['panels']  # list of [z0, z1] from foot to head
    # ornaments in the head and tail panels
    ow = min(Wmm * 0.50, 12.5) * ppm
    for idx in (0, len(panels) - 1):
        z0, z1 = panels[idx]
        if idx == 0:
            z0 = sp['tail_rule_mm'] + 1.1
        else:
            z1 = Hmm - sp['tail_rule_mm'] - 1.1
        ph = (z1 - z0) * ppm
        oh = min(ph * 0.72, ow * 1.9)
        spine_ornament(dr, W / 2, Z((z0 + z1) / 2), ow, oh, ppm)
    # small fleurons in the plain middle panels (all except title + head/tail)
    title_idx = sp['title_panel']
    for idx in range(1, len(panels) - 1):
        if idx == title_idx:
            continue
        z0, z1 = panels[idx]
        small_fleuron(dr, W / 2, Z((z0 + z1) / 2), min(Wmm * 0.16, 3.0) * ppm)

    # title
    z0, z1 = panels[title_idx]
    lines = sp['lines']
    usable = Wmm * sp['text_width_frac'] - 1.0
    em = sp['max_em_mm']
    font = ImageFont.truetype(FONT, 100)
    for ln in lines:
        wl = font.getlength(ln, features=['kern', 'liga']) / 100.0
        em = min(em, usable / wl)
    font = ImageFont.truetype(FONT, int(round(em * ppm)))
    cap = em * 0.655
    pitch = em * sp['leading']
    n = len(lines)
    zc = (z0 + z1) / 2
    for i, ln in enumerate(lines):
        base_z = zc + (n - 1) * pitch / 2 - i * pitch - cap / 2
        dr.text((W / 2, Z(base_z)), ln, font=font, fill=255, anchor='ms', features=['kern', 'liga'])
    sp['_em_used'] = em

    # foil spreads very slightly when stamped
    gold = gold.filter(ImageFilter.MaxFilter(3))
    # deboss depth = gold (slightly spread)
    depth = gold.filter(ImageFilter.MaxFilter(3))
    # rub mask: band crests, shoulders, head/tail
    zz = (Hmm - (np.arange(H) + 0.5) / ppm)[:, None]
    uu = ((np.arange(W) + 0.5) / W)[None, :]
    rub = np.zeros((H, W), np.float32)
    for (zc_, bw) in sp['bands']:
        rub = np.maximum(rub, np.exp(-((zz - zc_) / (bw * 0.28)) ** 2))
    edge = np.exp(-(np.minimum(uu, 1 - uu) / 0.06) ** 2)
    ends = np.exp(-(np.minimum(zz, Hmm - zz) / 2.5) ** 2)
    rub = np.maximum(rub, np.maximum(edge * 0.9, ends))
    rub_img = Image.fromarray((np.clip(rub, 0, 1) * 255).astype(np.uint8))
    out = os.path.join(TEX, 'spine_%02d.png' % sp['index'])
    finish(gold, depth, rub_img, out, (W // SS, H // SS))
    return em


# --------------------------------------------------------------------------- Qur'an cover
def filigree_layer(W, H, ppm, cx, cy, seed=7):
    """Symmetric rumi-like curls (lines) used to break up the gold fields."""
    img = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(img)
    rng = np.random.default_rng(seed)
    lw = 0.55 * ppm
    curls = []
    step = 9.0 * ppm
    # quarter-plane lattice of curls; mirrored 4 ways about (cx, cy)
    for iy in range(0, int(H / 2 / step) + 2):
        for ix in range(0, int(W / 2 / step) + 2):
            x = ix * step + (step / 2 if iy % 2 else 0)
            y = iy * step * 0.92
            ang = (ix * 1.7 + iy * 2.3) % (2 * math.pi)
            sign = 1 if (ix + iy) % 2 else -1
            r1 = step * rng.uniform(0.38, 0.48)
            curls.append((x, y, r1, ang, sign))
    for (x, y, r1, ang, sign) in curls:
        sp = spiral(0, 0, r1 * 0.12, r1, 1.35, ang, sign)
        stem = np.array([[r1 * math.cos(ang + sign * 0.0), r1 * math.sin(ang)]])
        for mx in (1, -1):
            for my in (1, -1):
                pts = sp.copy()
                pts[:, 0] = cx + mx * (x + pts[:, 0])
                pts[:, 1] = cy + my * (y + pts[:, 1])
                draw_line(dr, pts, lw, 255)
    return img


def make_quran(q):
    ppm = q['px_per_mm'] * SS
    Wmm, Hmm = q['w_mm'], q['h_mm']
    W, H = int(round(Wmm * ppm)), int(round(Hmm * ppm))
    gold = Image.new('L', (W, H), 0)
    relief = Image.new('L', (W, H), 0)
    blind = Image.new('L', (W, H), 0)
    dg = ImageDraw.Draw(gold); dre = ImageDraw.Draw(relief); db = ImageDraw.Draw(blind)
    cx, cy = W / 2, H / 2
    P = lambda mm: mm * ppm

    # ---- border: outer gold rule, blind rule, ornamental band, inner gold rule
    def rect_rule(inset, w, draw, fill=255):
        draw.rectangle([P(inset), P(inset), W - P(inset), H - P(inset)], outline=fill, width=int(P(w)))
    rect_rule(7.0, 0.7, dg)
    rect_rule(8.6, 0.35, db)
    rect_rule(16.6, 0.35, db)
    rect_rule(18.0, 0.7, dg)
    # band of small quatrefoils and lozenges between 9.4mm and 15.8mm
    band_c = 12.6
    pitch = 7.0
    def band_motifs(x0, y0, x1, y1):
        L = math.hypot(x1 - x0, y1 - y0)
        n = int(L // pitch)
        for k in range(n + 1):
            t = k / max(n, 1)
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            if k % 2 == 0:
                rosette(dg, P(x), P(y), P(2.6), 4, 255, 0, inner=0.30)
            else:
                d = P(1.3)
                dg.polygon([(P(x), P(y) - d), (P(x) + d, P(y)), (P(x), P(y) + d), (P(x) - d, P(y))], fill=255)
    band_motifs(band_c, band_c, Wmm - band_c, band_c)
    band_motifs(band_c, Hmm - band_c, Wmm - band_c, Hmm - band_c)
    band_motifs(band_c, band_c + pitch, band_c, Hmm - band_c - pitch)
    band_motifs(Wmm - band_c, band_c + pitch, Wmm - band_c, Hmm - band_c - pitch)

    fil = filigree_layer(W, H, ppm, cx, cy)
    fil_np = np.asarray(fil, np.float32) / 255.0

    # ---- central şemse
    a, b = P(q['semse_w_mm'] / 2), P(q['semse_h_mm'] / 2)
    base = pointed_oval(cx, cy, a, b)
    outer = scallop(base, lobes=22, amp=a * 0.085, sharp=0.5)
    sh = Image.new('L', (W, H), 0); ds = ImageDraw.Draw(sh)
    draw_poly(ds, outer, 255)
    field = Image.new('L', (W, H), 0); dfi = ImageDraw.Draw(field)
    draw_poly(dfi, offset(base, -P(2.2)), 255)
    gap = Image.new('L', (W, H), 0); dga = ImageDraw.Draw(gap)
    draw_poly(dga, offset(base, -P(1.2)), 255)
    draw_poly(dga, offset(base, -P(2.2)), 0)
    # pendants (salbek) above/below
    pend = Image.new('L', (W, H), 0); dp = ImageDraw.Draw(pend)
    for s in (-1, 1):
        tip = cy + s * (b + a * 0.085)
        py = tip + s * P(13)
        pa, pb = P(9.5), P(8.5)
        pbase = pointed_oval(cx, py, pa, pb)
        draw_poly(dp, scallop(pbase, lobes=8, amp=pa * 0.12, sharp=0.5), 255)
        dp.rectangle([cx - P(0.5), min(tip, py) - 1, cx + P(0.5), max(tip, py) + 1], fill=255)
        r = P(1.6)
        tt = py + s * (pb + P(3.2))
        dp.ellipse([cx - r, tt - r, cx + r, tt + r], fill=255)
    pend_np = np.asarray(pend, np.float32) / 255.0
    sh_np = np.asarray(sh, np.float32) / 255.0
    field_np = np.asarray(field, np.float32) / 255.0
    gap_np = np.asarray(gap, np.float32) / 255.0
    semse_gold = np.clip(sh_np - gap_np, 0, 1)
    semse_gold = np.maximum(semse_gold * (1 - field_np), field_np * (1 - fil_np))
    # central rosette inside the şemse
    ros = Image.new('L', (W, H), 0); drs = ImageDraw.Draw(ros)
    drs.ellipse([cx - P(11), cy - P(11), cx + P(11), cy + P(11)], fill=255)
    drs.ellipse([cx - P(10.2), cy - P(10.2), cx + P(10.2), cy + P(10.2)], fill=0)
    rosette(drs, cx, cy, P(8.8), 12, 255, 0, inner=0.28)
    ros_np = np.asarray(ros, np.float32) / 255.0
    # clear filigree under the rosette area then add rosette
    disc = Image.new('L', (W, H), 0); ImageDraw.Draw(disc).ellipse([cx - P(11.5), cy - P(11.5), cx + P(11.5), cy + P(11.5)], fill=255)
    disc_np = np.asarray(disc, np.float32) / 255.0
    semse_gold = semse_gold * (1 - disc_np) + ros_np
    pend_gold = pend_np * (1 - 0.85 * fil_np * (pend_np > 0.5))
    semse_all = np.maximum(semse_gold, pend_gold)

    # ---- corner pieces (köşebent): quarter lobed medallions in the inner corners
    corner = np.zeros((H, W), np.float32)
    rC = P(q['corner_r_mm'])
    for (ox, oy, sx, sy) in ((P(18.0), P(18.0), 1, 1), (W - P(18.0), P(18.0), -1, 1),
                             (P(18.0), H - P(18.0), 1, -1), (W - P(18.0), H - P(18.0), -1, -1)):
        img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
        th = np.linspace(0, math.pi / 2, 300)
        arc = np.stack([ox + sx * rC * np.cos(th), oy + sy * rC * np.sin(th)], 1)
        # lobes along the arc
        lob = np.abs(np.sin(th * 2 * 7)) ** 0.5 * rC * 0.07
        arc2 = np.stack([ox + sx * (rC + lob) * np.cos(th), oy + sy * (rC + lob) * np.sin(th)], 1)
        poly = np.vstack([[ox, oy], arc2])
        d.polygon([tuple(p) for p in poly], fill=255)
        inner = np.stack([ox + sx * (rC - P(2.0)) * np.cos(th), oy + sy * (rC - P(2.0)) * np.sin(th)], 1)
        img_f = Image.new('L', (W, H), 0); d2 = ImageDraw.Draw(img_f)
        d2.polygon([tuple(p) for p in np.vstack([[ox, oy], inner])], fill=255)
        img_g = Image.new('L', (W, H), 0); d3 = ImageDraw.Draw(img_g)
        inner_g = np.stack([ox + sx * (rC - P(1.1)) * np.cos(th), oy + sy * (rC - P(1.1)) * np.sin(th)], 1)
        d3.polygon([tuple(p) for p in np.vstack([[ox, oy], inner_g])], fill=255)
        a_ = np.asarray(img, np.float32) / 255; f_ = np.asarray(img_f, np.float32) / 255
        g_ = np.asarray(img_g, np.float32) / 255
        piece = np.clip(a_ - (g_ - f_), 0, 1)
        piece = np.maximum(piece * (1 - f_), f_ * (1 - fil_np))
        corner = np.maximum(corner, piece)

    gold_np = np.asarray(gold, np.float32) / 255.0
    gold_np = np.maximum(gold_np, np.maximum(semse_all, corner))
    relief_np = np.maximum(semse_all * 0.9, corner * 0.9)
    relief_np = np.maximum(relief_np, (np.asarray(gold, np.float32) / 255.0) * 0.5)
    # raised field of the şemse sits slightly higher than the leather (embossed)
    relief_np = np.maximum(relief_np, sh_np * 0.35 + pend_np * 0.3)
    blind_np = np.asarray(blind, np.float32) / 255.0
    G = Image.fromarray((np.clip(gold_np, 0, 1) * 255).astype(np.uint8))
    R_ = Image.fromarray((np.clip(relief_np, 0, 1) * 255).astype(np.uint8))
    B_ = Image.fromarray((np.clip(blind_np, 0, 1) * 255).astype(np.uint8))
    size = (W // SS, H // SS)
    out = os.path.join(TEX, 'quran_cover.png')
    Image.merge('RGB', (G.resize(size, Image.LANCZOS),
                        R_.resize(size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.0)),
                        B_.resize(size, Image.LANCZOS))).save(out)


if __name__ == '__main__':
    used = {}
    for sp in spec['spines']:
        used[sp['name']] = round(make_spine(sp), 3)
        print('spine', sp['index'], sp['name'], 'em_mm', used[sp['name']])
    make_quran(spec['quran'])
    print('quran cover done')
    json.dump(used, open(os.path.join(TEX, 'em_used.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
