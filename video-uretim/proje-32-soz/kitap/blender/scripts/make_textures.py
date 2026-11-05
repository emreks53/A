#!/usr/bin/env python3
"""Generate gold-foil / tooling masks for the book scene (run with system python3 + PIL).

Outputs (in ../gen/):
  spine_<n>.png        foil mask for Risale spine n (white = gold), 200 px/cm
  spine_<n>_h.png      softened copy used as deboss height
  quran_cover.png      gold tooling mask for the Quran top board
  quran_cover_h.png    deboss height (gold + blind tooling)
  quran_spine.png      gold tooling for the Quran spine (no lettering)
  quran_spine_h.png
  textures.json        physical sizes of every canvas (cm), read by build_scene.py
"""
import json
import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "gen")
FONTS = os.path.join(os.path.dirname(ROOT), "fonts")
os.makedirs(OUT, exist_ok=True)

PPC = 200          # final pixels per cm
SS = 2             # supersampling factor while drawing

# Physical sizes (cm) -- must match build_scene.py
RISALE = dict(L=24.0, W=17.0, T=4.4, bulge=0.55)
QURAN = dict(L=21.6, W=15.2, T=3.7, bulge=0.48)
LABEL_H = 5.0      # height of the spine label canvas (arc length, cm), centred on spine apex


class Canvas:
    """Drawing surface addressed in cm, origin at the centre, +y up."""

    def __init__(self, w_cm, h_cm, ppc=PPC, ss=SS):
        self.w_cm, self.h_cm = w_cm, h_cm
        self.s = ppc * ss
        self.ppc = ppc
        self.W = int(round(w_cm * self.s))
        self.H = int(round(h_cm * self.s))
        self.img = Image.new("L", (self.W, self.H), 0)
        self.d = ImageDraw.Draw(self.img)

    def P(self, x, y):
        return (self.W / 2 + x * self.s, self.H / 2 - y * self.s)

    def line(self, pts, w_cm, fill=255):
        self.d.line([self.P(*p) for p in pts], fill=fill, width=max(1, int(round(w_cm * self.s))), joint="curve")
        r = w_cm * self.s / 2
        for p in (pts[0], pts[-1]):          # round caps
            X, Y = self.P(*p)
            self.d.ellipse([X - r, Y - r, X + r, Y + r], fill=fill)

    def poly(self, pts, fill=255):
        self.d.polygon([self.P(*p) for p in pts], fill=fill)

    def circle(self, x, y, r, fill=255):
        X, Y = self.P(x, y)
        R = r * self.s
        self.d.ellipse([X - R, Y - R, X + R, Y + R], fill=fill)

    def ring(self, x, y, r, w, n=720):
        pts = [(x + r * math.cos(2 * math.pi * i / n), y + r * math.sin(2 * math.pi * i / n)) for i in range(n + 1)]
        self.line(pts, w)

    def rect(self, x0, y0, x1, y1, w):
        self.line([(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)], w)

    def text(self, s, font_path, cap_cm, cx, baseline_y, tracking_em=0.1):
        """Draw centred text with cap height cap_cm, baseline at baseline_y (cm)."""
        # find font size giving the requested cap height
        probe = ImageFont.truetype(font_path, 1000)
        bb = probe.getbbox("H")
        cap_px_per_size = (bb[3] - bb[1]) / 1000.0
        size = int(round(cap_cm * self.s / cap_px_per_size))
        f = ImageFont.truetype(font_path, size)
        asc, _ = f.getmetrics()
        adv = [f.getlength(ch) for ch in s]
        track = tracking_em * size
        total = sum(adv) + track * (len(s) - 1)
        X0, Yb = self.P(cx, baseline_y)
        x = X0 - total / 2
        for ch, a in zip(s, adv):
            self.d.text((x, Yb - asc), ch, font=f, fill=255)
            x += a + track

    def finish(self):
        return self.img.resize((int(round(self.w_cm * self.ppc)), int(round(self.h_cm * self.ppc))), Image.LANCZOS)


def save_pair(img, name, blur_cm=0.012, extra=None):
    img.save(os.path.join(OUT, name + ".png"))
    h = img if extra is None else Image.fromarray(
        __import__("numpy").maximum(__import__("numpy").asarray(img), __import__("numpy").asarray(extra)))
    h = h.filter(ImageFilter.GaussianBlur(blur_cm * PPC))
    h.save(os.path.join(OUT, name + "_h.png"))


# ----------------------------------------------------------------------------------------------
# Risale spines
# ----------------------------------------------------------------------------------------------
TITLES = ["SÖZLER", "MEKTUBAT", "LEM'ALAR", "ŞUALAR"]   # top Risale -> bottom Risale
FONT_TITLE = os.path.join(FONTS, "CormorantSC-600-normal.ttf")
FONT_SUB = os.path.join(FONTS, "Cinzel-600-normal.ttf")


def lozenge(c, x, y, rx, ry):
    c.poly([(x - rx, y), (x, y + ry), (x + rx, y), (x, y - ry)])


def spine_end_ornament(c, side, half_h):
    """Gold rules + small ornament near one spine end. side=-1 (left/head) or +1 (right/tail)."""
    L = RISALE["L"]
    e = side * L / 2
    def X(d):          # distance d from the spine end, measured inwards
        return e - side * d
    y0, y1 = -half_h, half_h
    # outer double rule
    c.line([(X(0.95), y0), (X(0.95), y1)], 0.075)
    c.line([(X(1.12), y0), (X(1.12), y1)], 0.025)
    # inner double rule
    c.line([(X(2.10), y0), (X(2.10), y1)], 0.025)
    c.line([(X(2.27), y0), (X(2.27), y1)], 0.075)
    # ornament between the rule pairs: central lozenge with dots, small lozenges above/below
    xm = X(1.61)
    lozenge(c, xm, 0.0, 0.24, 0.42)
    c.poly([(xm - 0.13, 0), (xm, 0.23), (xm + 0.13, 0), (xm, -0.23)], fill=0)
    lozenge(c, xm, 0.0, 0.06, 0.10)
    for sy in (-1, 1):
        c.circle(xm, sy * 0.62, 0.055)
        lozenge(c, xm, sy * 0.98, 0.10, 0.17)
        c.circle(xm, sy * 1.32, 0.04)
    # fine dotted line along the spine edges between the rule groups (classic fillet)
    for sy in (-1, 1):
        c.line([(X(0.95), sy * half_h), (X(2.27), sy * half_h)], 0.02)


def make_spine(idx, title):
    c = Canvas(RISALE["L"], LABEL_H)
    half_h = 1.95                      # rules span +-1.95 cm of arc around the apex
    for side in (-1, 1):
        spine_end_ornament(c, side, half_h)
    # title + series line
    c.text(title, FONT_TITLE, 1.30, 0.0, -0.78, tracking_em=0.10)
    c.text("RİSALE-İ NUR", FONT_SUB, 0.42, 0.0, 1.14, tracking_em=0.22)
    # hairline rules framing the title block
    for x in (-1, 1):
        pass
    img = c.finish()
    save_pair(img, f"spine_{idx}")
    return img


# ----------------------------------------------------------------------------------------------
# Quran cover
# ----------------------------------------------------------------------------------------------
def rosette(c, cx, cy, R):
    """12-fold Islamic rosette medallion with curved lobes, star and petals."""
    n = 12
    # outer scalloped (cusped) border: 24 lobes
    pts = []
    N = 2400
    for i in range(N + 1):
        t = 2 * math.pi * i / N
        lobe = abs(math.cos(12 * t))
        r = R * (0.955 + 0.045 * lobe ** 0.6)
        pts.append((cx + r * math.cos(t), cy + r * math.sin(t)))
    c.line(pts, 0.075)
    # second concentric ring
    c.ring(cx, cy, R * 0.86, 0.04)
    # 12 curved arabesque lobes between rings (pointed arches)
    for k in range(n):
        a0 = 2 * math.pi * k / n
        arc = []
        for j in range(61):
            u = j / 60.0
            ang = a0 + (u - 0.5) * (2 * math.pi / n) * 0.92
            r = R * (0.86 - 0.20 * math.sin(math.pi * u) ** 1.4)
            arc.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
        c.line(arc, 0.045)
        # small trefoil bud at each lobe tip
        bx, by = cx + R * 0.915 * math.cos(a0 + math.pi / n), cy + R * 0.915 * math.sin(a0 + math.pi / n)
        c.circle(bx, by, R * 0.028)
    # 12-point star {12/5}
    star_r = R * 0.64
    vs = [(cx + star_r * math.cos(2 * math.pi * k / n + math.pi / 12), cy + star_r * math.sin(2 * math.pi * k / n + math.pi / 12)) for k in range(n)]
    for k in range(n):
        c.line([vs[k], vs[(k + 5) % n]], 0.042)
    # filled 12-petal flower at the centre
    for k in range(n):
        a = 2 * math.pi * k / n
        petal = []
        L, Wd = R * 0.26, R * 0.06
        for j in range(41):
            u = j / 40.0
            w = Wd * math.sin(math.pi * u) ** 0.9
            px, py = u * L, w
            petal.append((px, py))
        for j in range(40, -1, -1):
            u = j / 40.0
            w = Wd * math.sin(math.pi * u) ** 0.9
            petal.append((u * L, -w))
        rot = [(cx + (p[0] + R * 0.06) * math.cos(a) - p[1] * math.sin(a), cy + (p[0] + R * 0.06) * math.sin(a) + p[1] * math.cos(a)) for p in petal]
        c.poly(rot)
    c.circle(cx, cy, R * 0.06)
    c.ring(cx, cy, R * 0.335, 0.035)
    # ring of 24 dots
    for k in range(24):
        a = 2 * math.pi * k / 24 + math.pi / 24
        c.circle(cx + R * 0.77 * math.cos(a), cy + R * 0.77 * math.sin(a), R * 0.016)


def pendant(c, cx, cy, d, R):
    """Pendant (salbek) on the long axis, d=+1/-1."""
    x0 = cx + d * R * 1.02
    c.line([(x0, cy), (x0 + d * R * 0.22, cy)], 0.04)
    # trefoil
    xc = x0 + d * R * 0.42
    c.circle(xc, cy, R * 0.12)
    c.circle(xc - d * R * 0.05, cy + R * 0.13, R * 0.075)
    c.circle(xc - d * R * 0.05, cy - R * 0.13, R * 0.075)
    c.poly([(xc, cy + R * 0.06), (xc + d * R * 0.34, cy), (xc, cy - R * 0.06)])
    c.circle(xc + d * R * 0.44, cy, R * 0.035)
    c.circle(xc, cy, R * 0.045, fill=0)


def corner_piece(c, x, y, sx, sy, r):
    """Quarter medallion (koesebent) in a frame corner; (sx,sy) point into the panel."""
    def P(rr, a):
        return (x + sx * rr * math.cos(a), y + sy * rr * math.sin(a))
    # scalloped outer outline: 6 lobes over the quarter circle
    pts = []
    N = 360
    for i in range(N + 1):
        a = (math.pi / 2) * i / N
        lobe = abs(math.sin(6 * a))
        pts.append(P(r * (0.90 + 0.10 * lobe ** 0.6), a))
    c.line(pts, 0.04)
    pts = [P(r * 0.74, (math.pi / 2) * i / 200) for i in range(201)]
    c.line(pts, 0.02)
    # radiating petals between 0.2r and 0.68r
    for k in range(6):
        a = (k + 0.5) * (math.pi / 2) / 6
        petal = []
        r0, L, Wd = r * 0.22, r * 0.46, r * 0.075
        for j in range(31):
            u = j / 30.0
            petal.append((r0 + u * L, Wd * math.sin(math.pi * u) ** 0.8))
        for j in range(30, -1, -1):
            u = j / 30.0
            petal.append((r0 + u * L, -Wd * math.sin(math.pi * u) ** 0.8))
        c.poly([(x + sx * (p[0] * math.cos(a) - p[1] * math.sin(a)), y + sy * (p[0] * math.sin(a) + p[1] * math.cos(a))) for p in petal])
    # dots in the lobes
    for k in range(6):
        a = (k + 0.5) * (math.pi / 2) / 6
        c.circle(*P(r * 0.83, a), r * 0.025)
    pts = [P(r * 0.16, (math.pi / 2) * i / 100) for i in range(101)]
    c.line(pts, 0.02)


def make_quran_cover():
    L, W, bulge = QURAN["L"], QURAN["W"], QURAN["bulge"]
    c = Canvas(L, W)
    blind = Canvas(L, W)
    # usable board area: from joint (spine side, y=-W/2) to fore-edge (y=+W/2)
    y_sp = -W / 2 + bulge + 0.55        # just past the hinge groove
    y_fe = W / 2
    x_h, x_t = -L / 2, L / 2
    def frame(inset, w, cv=c):
        cv.rect(x_h + inset, y_sp + inset, x_t - inset, y_fe - inset, w)
    frame(0.55, 0.06)
    frame(0.72, 0.022)
    # chain of small lozenges between the frame lines
    def band(inset):
        x0, x1 = x_h + inset, x_t - inset
        y0, y1 = y_sp + inset, y_fe - inset
        step = 0.36
        for edge in range(4):
            if edge < 2:
                yy = y0 if edge == 0 else y1
                n = int((x1 - x0) / step)
                for i in range(n + 1):
                    xx = x0 + (x1 - x0) * i / n
                    lozenge(c, xx, yy, 0.07, 0.07)
            else:
                xx = x0 if edge == 2 else x1
                n = int((y1 - y0) / step)
                for i in range(n + 1):
                    yy = y0 + (y1 - y0) * i / n
                    lozenge(c, xx, yy, 0.07, 0.07)
    band(0.92)
    frame(1.12, 0.022)
    frame(1.27, 0.06)
    # blind-tooled inner frame
    frame(1.75, 0.03, blind)
    # corner pieces
    ins = 1.27
    for (x, sx) in ((x_h + ins, 1), (x_t - ins, -1)):
        for (y, sy) in ((y_sp + ins, 1), (y_fe - ins, -1)):
            corner_piece(c, x, y, sx, sy, 1.9)
    # central medallion
    cx, cy = 0.0, (y_sp + y_fe) / 2
    R = 2.85
    rosette(c, cx, cy, R)
    for d in (-1, 1):
        pendant(c, cx, cy, d, R)
    # blind-tooled oval around the medallion
    pts = [(cx + R * 2.05 * math.cos(t), cy + R * 1.18 * math.sin(t)) for t in [2 * math.pi * i / 1200 for i in range(1201)]]
    blind.line(pts, 0.03)
    img = c.finish()
    bimg = blind.finish()
    save_pair(img, "quran_cover", blur_cm=0.015, extra=bimg)
    bimg.save(os.path.join(OUT, "quran_cover_blind.png"))
    return dict(cover_center_y=cy)


def make_quran_spine():
    L = QURAN["L"]
    c = Canvas(L, LABEL_H)
    hh = 1.55
    # raised-band positions (also used for geometry bumps in the shader)
    bands = [-7.6, -3.8, 0.0, 3.8, 7.6]
    for xb in bands:
        for dx, w in ((-0.32, 0.03), (-0.22, 0.06), (0.22, 0.06), (0.32, 0.03)):
            c.line([(xb + dx, -hh), (xb + dx, hh)], w)
    # small 8-petal flowers centred in panels between bands
    panels = [(-L / 2 + 0.9 + bands[0]) / 2 - 0.0] + [(bands[i] + bands[i + 1]) / 2 for i in range(4)] + [(bands[-1] + L / 2 - 0.9) / 2]
    for px in panels[1:-1]:
        for k in range(8):
            a = 2 * math.pi * k / 8
            petal = []
            Lp, Wd = 0.42, 0.075
            for j in range(31):
                u = j / 30.0
                petal.append((u * Lp, Wd * math.sin(math.pi * u)))
            for j in range(30, -1, -1):
                u = j / 30.0
                petal.append((u * Lp, -Wd * math.sin(math.pi * u)))
            c.poly([(px + p[0] * math.cos(a) - p[1] * math.sin(a), p[0] * math.sin(a) + p[1] * math.cos(a)) for p in petal])
        c.circle(px, 0, 0.07, fill=0)
        c.circle(px, 0, 0.035)
    # head/tail double rules
    for side in (-1, 1):
        for d, w in ((0.6, 0.06), (0.75, 0.025)):
            x = side * (L / 2 - d)
            c.line([(x, -hh), (x, hh)], w)
    img = c.finish()
    save_pair(img, "quran_spine", blur_cm=0.012)
    return dict(bands=bands)


if __name__ == "__main__":
    meta = dict(ppc=PPC, label_h=LABEL_H, risale=RISALE, quran=QURAN, titles=TITLES)
    for i, t in enumerate(TITLES):
        make_spine(i, t)
    meta.update(make_quran_cover())
    meta.update(make_quran_spine())
    with open(os.path.join(OUT, "textures.json"), "w") as f:
        json.dump(meta, f, indent=1, ensure_ascii=False)
    print("done", OUT)
