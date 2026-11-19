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
HUBS_FROM_TOP = [20.0, 44.0, 168.0, 222.0]
HUB_HALF = 3.0       # half width of a hub (mm)
HUB_HEIGHT = 1.45    # how far a hub stands proud of the spine (mm)
TITLE_PANEL = (48.5, 163.5)    # from top
ORNAMENT_PANEL = (24.0, 40.0)
AUTHOR_PANEL = (172.5, 217.5)

# Spine texture resolution (pixels per mm)
SPINE_PPM = 12

# Kur'an (orta boy mushaf)
QURAN_T = 44.0
QURAN_H = 240.0
QURAN_D = 168.0
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
RAHLE_W = 190.0      # width of a leaf (along world X)
RAHLE_L = 380.0      # length of a leaf
RAHLE_T = 14.0       # thickness of a leaf
RAHLE_HINGE = 150.0  # distance of the hinge from the bottom end of a leaf
RAHLE_THETA = 44.0   # leaf angle from the horizontal (degrees)
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


def rahle_leaf(which):
    """2D design of one rahle leaf (mm). x across width (centred), y along
    the length (0 = foot). Returns (outline, holes); polygons are CCW lists.
    which: 'A' or 'B' (alternate hinge fingers)."""
    W, L, yh = RAHLE_W, RAHLE_L, RAHLE_HINGE
    hw = W / 2
    nh = rahle_notch_len()
    fw = W / RAHLE_FINGERS
    # which fingers are cut away (notched) in this leaf
    cut = [1, 3] if which == 'A' else [0, 2, 4]

    out = []
    # --- foot: two legs separated by a pointed arch opening
    aw = 0.27 * W
    arch = _pointed_arch(0.0, 14.0, aw, 52.0, 16)
    out += [(-hw, 0.0), (-aw, 0.0)]
    out += arch
    out += [(aw, 0.0), (hw, 0.0)]
    # --- right side, with notch for finger 4 if cut
    if 4 in cut:
        out += [(hw, yh - nh), (hw - fw, yh - nh), (hw - fw, yh + nh), (hw, yh + nh)]
    # --- crest at the top end
    rc = 10.0
    out += _arc_pts(hw - rc, L - 10 - rc, rc, 0.0, math.pi / 2, 6)
    n = 24
    for i in range(1, n):
        x = (hw - rc) - (2 * (hw - rc)) * i / n
        t = abs(x) / 34.0
        bump = 9.0 * (math.cos(min(t, 1.0) * math.pi / 2) ** 2) if t < 1 else 0.0
        out.append((x, L - 10 + bump))
    out += _arc_pts(-hw + rc, L - 10 - rc, rc, math.pi / 2, math.pi, 6)
    # --- left side, notch for finger 0
    if 0 in cut:
        out += [(-hw, yh + nh), (-hw + fw, yh + nh), (-hw + fw, yh - nh), (-hw, yh - nh)]

    holes = []
    # hinge slots for interior fingers
    for f in cut:
        if f in (0, RAHLE_FINGERS - 1):
            continue
        x0 = -hw + f * fw
        holes.append([(x0, yh - nh), (x0 + fw, yh - nh), (x0 + fw, yh + nh), (x0, yh + nh)])
    # lower part openwork: eight-point star and side lozenges
    holes.append(_star8(0.0, 103.0, 19.0))
    holes.append(_lozenge(-55.0, 100.0, 11.0, 30.0))
    holes.append(_lozenge(55.0, 100.0, 11.0, 30.0))
    # upper part: mihrab window (straight jambs + pointed arch)
    win_arch = _pointed_arch(0.0, 262.0, 30.0, 40.0, 16)
    holes.append([(-30.0, 196.0), (30.0, 196.0)] + win_arch[::-1])
    holes.append(_circle(0.0, 326.0, 8.0))
    holes.append(_lozenge(-60.0, 246.0, 10.0, 34.0))
    holes.append(_lozenge(60.0, 246.0, 10.0, 34.0))
    return out, holes
