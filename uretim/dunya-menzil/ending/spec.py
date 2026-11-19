"""Shared specification for the Külliyat ending shot.

Pure Python (no bpy / PIL) so it can be imported both by the texture
generator (system python3) and by build_scene.py (Blender's python).
All lengths here are in millimetres unless stated otherwise.
"""
import math

# Canonical order, exact thicknesses (mm). Typographic apostrophe (U+2019).
BOOKS = [
    ("Sözler", 44.9),
    ("Mektubat", 31.4),
    ("Lem’alar", 27.6),
    ("Şuâlar", 38.0),
    ("Mesnevî-i Nûriye", 17.4),
    ("İşârâtü’l-İ’câz", 20.3),
    ("Barla Lâhikası", 24.1),
    ("Kastamonu Lâhikası", 18.0),
    ("Emirdağ Lâhikası", 26.3),
    ("Sikke-i Tasdîk-i Gaybî", 15.5),
    ("Tarihçe-i Hayat", 35.7),
    ("Asâ-yı Mûsâ", 21.1),
    ("İman ve Küfür Muvâzeneleri", 16.6),
    ("Muhâkemat", 14.7),
]
HERO = 12            # index of "İman ve Küfür Muvâzeneleri"
AUTHOR = "Bediüzzaman Said Nursî"

BOOK_H = 240.0       # spine height
BOOK_D = 170.0       # cover width (depth from spine to fore-edge)

# Raised bands (hubs): centre positions measured from the TOP of the spine.
HUBS_FROM_TOP = [20.0, 44.0, 172.0, 222.0]
HUB_HALF = 3.0       # half width of a hub (mm)
HUB_HEIGHT = 1.45    # how far a hub stands proud of the spine (mm)
TITLE_PANEL = (49.3, 166.7)    # from top (between the hub fillets)
ORNAMENT_PANEL = (24.0, 40.0)
AUTHOR_PANEL = (177.3, 216.7)

# Spine texture resolution (pixels per mm)
SPINE_PPM = 12

# Kur'an (orta boy mushaf)
QURAN_T = 38.0
QURAN_H = 215.0
QURAN_D = 150.0
QURAN_PPM = 10


def sagitta(T):
    """Depth of the rounded spine for a book of thickness T (mm)."""
    return max(2.0, min(5.0, 0.11 * T))


def spine_arc(T):
    """Return (R, half_angle, arc_length) of the rounded spine arc.

    The arc spans x in [-T/2, T/2] at y=0 and bulges to y=-sagitta.
    """
    c = T
    s = sagitta(T)
    R = (c * c / 4.0 + s * s) / (2.0 * s)
    half = math.asin(c / (2.0 * R))
    return R, half, 2.0 * R * half


# ---------------------------------------------------------------- rahle --
RAHLE_W = 168.0      # width of a leaf (along world X)
RAHLE_L = 300.0      # length of a leaf
RAHLE_T = 15.0       # thickness of a leaf
RAHLE_HINGE = 120.0  # distance of the hinge from the bottom end of a leaf
RAHLE_THETA = 40.0   # leaf angle from the horizontal (degrees)
RAHLE_FINGERS = 5


def _arc_pts(cx, cy, r, a0, a1, n):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / n),
             cy + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def _pointed_arch(xc, y_spring, half_w, rise, n=14):
    """Pointed (two-centred) arch outline from left spring point over the
    apex to the right spring point."""
    a = half_w
    h = rise
    c = (h * h - a * a) / (2.0 * a)
    r = a + c
    # left arc: centre (xc + c, y_spring) from angle pi to apex angle
    apex_ang_l = math.atan2(h, -c)
    left = _arc_pts(xc + c, y_spring, r, math.pi, apex_ang_l, n)
    apex_ang_r = math.atan2(h, c)
    right = _arc_pts(xc - c, y_spring, r, apex_ang_r, 0.0, n)
    return left + right[1:]


def _star8(cx, cy, R, rot=math.pi / 8):
    pts = []
    ri = R * math.cos(math.pi / 4) / math.cos(math.pi / 8)
    for k in range(16):
        r = R if k % 2 == 0 else ri
        a = rot + k * math.pi / 8
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def _lozenge(cx, cy, w, h):
    return [(cx, cy - h / 2), (cx + w / 2, cy), (cx, cy + h / 2), (cx - w / 2, cy)]


def _circle(cx, cy, r, n=28):
    return [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)]


def rahle_notch_len():
    th = math.radians(RAHLE_THETA)
    phi = math.pi - 2 * th            # angle between the two leaves
    return RAHLE_T / 2 / math.sin(phi) + RAHLE_T / 2 * abs(math.cos(phi) / math.sin(phi)) + 1.2


def rahle_half_width(y):
    """Right-hand contour of a leaf (mm): flared feet, slight waist at the
    hinge, widening again toward the top."""
    hw = RAHLE_W / 2
    yh = RAHLE_HINGE
    if y <= 6.0:
        return hw + 4.0 * (1 - y / 6.0) ** 2           # small flare at the foot
    if y <= yh:
        t = (y - 6.0) / (yh - 6.0)
        return hw - 7.0 * math.sin(t * math.pi / 2) ** 1.5
    t = min(1.0, (y - yh) / ((RAHLE_L - yh) * 0.55))
    return hw - 7.0 + 7.0 * math.sin(t * math.pi / 2) ** 2


FOOT_ARCH_RISE = 0.22  # x RAHLE_HINGE


def cart_y0():
    return 0.10 * RAHLE_HINGE + FOOT_ARCH_RISE * RAHLE_HINGE + 6.0


def rahle_cartouche():
    """Lobed horizontal cartouche (lattice field) in the lower part of a leaf."""
    y0 = cart_y0()
    y1 = RAHLE_HINGE - rahle_notch_len() - 5.0
    yc, hh = (y0 + y1) / 2, (y1 - y0) / 2
    hx = 0.40 * RAHLE_W
    pts = []
    n = 80
    for i in range(n):
        t = 2 * math.pi * i / n
        c, s_ = math.cos(t), math.sin(t)
        # superellipse with pointed (ogee) ends
        x = hx * math.copysign(abs(c) ** 0.55, c)
        y = hh * math.copysign(abs(s_) ** 0.35, s_) * (1 - 0.35 * abs(c) ** 6)
        pts.append((x, yc + y))
    return pts


LATTICE_P = 26.0       # star-and-cross pitch (mm)
LATTICE_STRAP = 4.4    # strap width (mm)


def offset_poly(poly, d):
    """Mitred inward offset of a CCW polygon (y up) by d (mm)."""
    n = len(poly)
    lines = []
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        nx, ny = -dy / L, dx / L                 # left normal = inward for CCW
        lines.append(((x1 + nx * d, y1 + ny * d), (dx / L, dy / L)))
    out = []
    for i in range(n):
        (p0, u0), (p1, u1) = lines[i - 1], lines[i]
        den = u0[0] * u1[1] - u0[1] * u1[0]
        if abs(den) < 1e-9:
            out.append(p1)
            continue
        t = ((p1[0] - p0[0]) * u1[1] - (p1[1] - p0[1]) * u1[0]) / den
        out.append((p0[0] + u0[0] * t, p0[1] + u0[1] * t))
    return out


def star_cross_tiles(P):
    """Exact star-and-cross tiling: {8/2} stars on a square lattice (pitch P,
    touching tip to tip) and pointed four-armed crosses at the cell centres.
    Returns (star, cross) polygons centred on the origin, CCW."""
    r = P / 2
    ri = r * math.cos(math.pi / 4) / math.cos(math.pi / 8)
    star = [((r if k % 2 == 0 else ri) * math.cos(k * math.pi / 8),
             (r if k % 2 == 0 else ri) * math.sin(k * math.pi / 8)) for k in range(16)]
    a, b = 0.1464466 * P, 0.3535534 * P
    cross = [(0, -r), (a, -b), (a, -a), (b, -a), (r, 0), (b, a), (a, a), (a, b),
             (0, r), (-a, b), (-a, a), (-b, a), (-r, 0), (-b, -a), (-a, -a), (-a, -b)]
    return star, cross


def rahle_lattice_tiles():
    """Tiles of the lower strapwork lattice kept inside the cartouche:
    list of (centreline polygon, hole polygon)."""
    cart = rahle_cartouche()
    yc = sum(p[1] for p in cart) / len(cart)
    P, w = LATTICE_P, LATTICE_STRAP
    star, cross = star_cross_tiles(P)
    cands = []
    for i in range(-3, 3):
        cands.append((star, (i + 0.5) * P, yc))
    for i in range(-3, 4):
        for sg in (-1, 1):
            cands.append((cross, i * P, yc + sg * 0.5 * P))
    tiles = []
    for shape, x0, y0 in cands:
        cl = [(x0 + x, y0 + y) for x, y in shape]
        hole = offset_poly(cl, w / 2)
        if all(_inside(cart, x, y) and _dist_to_poly(cart, x, y) > w * 0.55 for x, y in hole):
            tiles.append((cl, hole))
    return tiles


def rahle_window(yh=None, U=None):
    """Pointed-arch (mihrab) window polygon in the upper part of a leaf."""
    W = RAHLE_W
    yh = RAHLE_HINGE if yh is None else yh
    U = RAHLE_L - yh if U is None else U
    wx = 0.29 * W
    y0 = yh + 20.0
    spring = yh + 0.56 * U
    arch = _pointed_arch(0.0, spring, wx, 0.26 * U, 20)
    return [(-wx, y0), (wx, y0)] + arch[::-1]


def _inside(poly, x, y):
    c = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if xi > x:
                c = not c
    return c


def _dist_to_poly(poly, x, y):
    best = 1e9
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        dx, dy = x2 - x1, y2 - y1
        L2 = dx * dx + dy * dy
        t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / L2))
        px, py = x1 + t * dx, y1 + t * dy
        best = min(best, math.hypot(x - px, y - py))
    return best


def rahle_leaf(which):
    """2D design of one rahle leaf (mm). x across width (centred), y along
    the length (0 = foot). Returns (outline, holes); polygons are CCW lists.
    which: 'A' or 'B' (alternate hinge fingers)."""
    W, L, yh = RAHLE_W, RAHLE_L, RAHLE_HINGE
    U = L - yh
    nh = rahle_notch_len()
    fw_n = RAHLE_FINGERS
    cut = [1, 3] if which == 'A' else [0, 2, 4]
    hw_h = rahle_half_width(yh)          # half width at the hinge
    fw = 2 * hw_h / fw_n

    out = []
    # --- foot: two legs separated by a cusped (trefoil-headed) arch
    aw = 0.25 * W
    hwf = rahle_half_width(0.0)
    out += [(-hwf, 0.0), (-aw, 0.0)]
    arch = _pointed_arch(0.0, 0.10 * yh, aw, FOOT_ARCH_RISE * yh, 22)
    out += arch
    out += [(aw, 0.0), (hwf, 0.0)]
    # --- right side up to the crest (with hinge notch for finger 4)
    ys = [3.0, 6.0] + [6.0 + (yh - nh - 6.0) * i / 10 for i in range(1, 11)]
    for y in ys:
        out.append((rahle_half_width(y), y))
    if 4 in cut:
        out += [(hw_h, yh - nh), (hw_h - fw, yh - nh), (hw_h - fw, yh + nh), (hw_h, yh + nh)]
    else:
        out += [(rahle_half_width(yh), yh)]
    y_top0 = L - 34.0
    for i in range(1, 13):
        y = yh + nh + (y_top0 - yh - nh) * i / 12
        out.append((rahle_half_width(y), y))
    # --- crest: shoulders + onion-dome ogee to the apex
    hwt = rahle_half_width(y_top0)
    n = 40
    for i in range(1, n):
        t = 1 - i / n                       # 1 -> 0 (right edge -> centre)
        x = hwt * t
        dome = (math.cos(math.pi * t / 2)) ** 2.2
        shoulder = 6.0 * math.exp(-((t - 0.78) / 0.08) ** 2)
        out.append((x, y_top0 + 34.0 * dome - shoulder))
    out.append((0.0, L))
    for i in range(n - 1, 0, -1):
        t = 1 - i / n
        x = -hwt * t
        dome = (math.cos(math.pi * t / 2)) ** 2.2
        shoulder = 6.0 * math.exp(-((t - 0.78) / 0.08) ** 2)
        out.append((x, y_top0 + 34.0 * dome - shoulder))
    # --- left side down
    for i in range(12, 0, -1):
        y = yh + nh + (y_top0 - yh - nh) * i / 12
        out.append((-rahle_half_width(y), y))
    if 0 in cut:
        out += [(-hw_h, yh + nh), (-hw_h + fw, yh + nh), (-hw_h + fw, yh - nh), (-hw_h, yh - nh)]
    else:
        out += [(-rahle_half_width(yh), yh)]
    for y in reversed(ys):
        out.append((-rahle_half_width(y), y))

    holes = []
    # hinge slots for interior fingers
    for f in cut:
        if f in (0, fw_n - 1):
            continue
        x0 = -hw_h + f * fw
        holes.append([(x0, yh - nh), (x0 + fw, yh - nh), (x0 + fw, yh + nh), (x0, yh + nh)])
    # lower part (the face turned to the viewer): interlaced star-and-cross
    # strapwork (4.4 mm straps) in a lobed cartouche between the foot arch and the hinge
    for _cl, hole in rahle_lattice_tiles():
        holes.append(hole)
    # upper part: star-and-cross lattice inside the mihrab window
    win = rahle_window()
    pitch = 15.0
    R = 5.4
    xs = [pitch * (i - 6) for i in range(13)]
    yy0 = yh + 20.0 + pitch * 0.62
    for j in range(16):
        y = yy0 + pitch * j
        for x in xs:
            if _inside(win, x, y) and _dist_to_poly(win, x, y) > R + 2.4:
                holes.append(_star8(x, y, R))
            cx, cy = x + pitch / 2, y + pitch / 2
            if _inside(win, cx, cy) and _dist_to_poly(win, cx, cy) > 4.6:
                holes.append(_lozenge(cx, cy, 4.6, 4.6))
    # crest: small star near the apex
    holes.append(_star8(0.0, L - 22.0, 6.0))
    return out, holes
