"""Gold line-art motion-graphics primitives (Kurzgesagt-like, but in an elegant
Ottoman/Islamic illumination language): draw-on strokes with glow, rosettes,
girih fields, icons, particles, callouts, ripples, rays."""
import math
import numpy as np
import skia
from common import *

SCREEN = skia.BlendMode.kScreen
PLUS = skia.BlendMode.kPlus
STROKE_SCALE = 1.65
UNDERLAY = 0.42


# ---------------------------------------------------------------- strokes
def stroke(c, path, w=3.0, color=GOLD, a=1.0, trim=(0.0, 1.0), glow=0.8, blend=None, fill=None):
    if a <= 0.003:
        return
    t0, t1 = trim
    if t1 - t0 <= 0.0005:
        return
    w = w * STROKE_SCALE
    pe = None
    if t0 > 0.0005 or t1 < 0.9995:
        pe = skia.TrimPathEffect.Make(t0, t1)
    if fill is not None:
        fp = skia.Paint(AntiAlias=True, Color4f=col(fill[0], fill[1] * a))
        c.drawPath(path, fp)
    if UNDERLAY > 0:
        up = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=w + 4.0,
                        StrokeCap=skia.Paint.kRound_Cap, StrokeJoin=skia.Paint.kRound_Join,
                        Color4f=skia.Color4f(0.07, 0.045, 0.02, UNDERLAY * a),
                        MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 2.6))
        if pe: up.setPathEffect(pe)
        c.drawPath(path, up)
    if glow > 0:
        for sig, wm, am in ((10, 3.2, 0.28), (3.0, 1.8, 0.45)):
            gp = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=w * wm,
                            StrokeCap=skia.Paint.kRound_Cap, StrokeJoin=skia.Paint.kRound_Join,
                            Color4f=col(color, a * am * glow),
                            MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, sig))
            gp.setBlendMode(SCREEN)
            if pe: gp.setPathEffect(pe)
            c.drawPath(path, gp)
    p = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=w,
                   StrokeCap=skia.Paint.kRound_Cap, StrokeJoin=skia.Paint.kRound_Join,
                   Color4f=col(color, a))
    if blend is not None:
        p.setBlendMode(blend)
    if pe: p.setPathEffect(pe)
    c.drawPath(path, p)


def fill_glow(c, path, color=GOLD, a=1.0, glow=0.8):
    if a <= 0.003:
        return
    if glow > 0:
        gp = skia.Paint(AntiAlias=True, Color4f=col(color, a * 0.5 * glow),
                        MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 9))
        gp.setBlendMode(SCREEN)
        c.drawPath(path, gp)
    c.drawPath(path, skia.Paint(AntiAlias=True, Color4f=col(color, a)))


def xf(path, cx, cy, s, rot=0.0):
    m = skia.Matrix()
    m.setRotate(rot)
    m.postScale(s, s)
    m.postTranslate(cx, cy)
    p = skia.Path(path)
    p.transform(m)
    return p


def circle(cx, cy, r):
    p = skia.Path(); p.addCircle(cx, cy, r); return p


def glow_dot(c, x, y, r, color=GOLD_HI, a=1.0, halo=3.5):
    if a <= 0.003 or r <= 0.05:
        return
    hp = skia.Paint(AntiAlias=True, Color4f=col(color, 0.35 * a),
                    MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, r * halo))
    hp.setBlendMode(SCREEN)
    c.drawCircle(x, y, r * 2.2, hp)
    c.drawCircle(x, y, r, skia.Paint(AntiAlias=True, Color4f=col(color, a)))


# ---------------------------------------------------------------- geometry
def star_polygon(n=8, k=3, r=1.0, rot=0.0):
    p = skia.Path()
    pts = [(r * math.cos(2 * math.pi * i / n + rot), r * math.sin(2 * math.pi * i / n + rot)) for i in range(n)]
    i = 0
    p.moveTo(*pts[0])
    for _ in range(n):
        i = (i + k) % n
        p.lineTo(*pts[i])
    p.close()
    return p


def star_outline(n=8, r_out=1.0, r_in=0.62, rot=-math.pi / 2):
    p = skia.Path()
    for i in range(2 * n):
        r = r_out if i % 2 == 0 else r_in
        a = rot + math.pi * i / n
        x, y = r * math.cos(a), r * math.sin(a)
        p.moveTo(x, y) if i == 0 else p.lineTo(x, y)
    p.close()
    return p


def rosette_parts(n=8):
    """Unit-radius rosette components, drawn in this order."""
    parts = []
    parts.append(circle(0, 0, 1.0))
    parts.append(star_outline(n, 0.94, 0.70))
    parts.append(star_polygon(n, 3, 0.70, -math.pi / 2))
    parts.append(star_outline(n, 0.42, 0.30, -math.pi / 2 + math.pi / n))
    parts.append(circle(0, 0, 0.18))
    # petals between star points
    petals = skia.Path()
    for i in range(n):
        a = -math.pi / 2 + 2 * math.pi * i / n + math.pi / n
        x1, y1 = 0.72 * math.cos(a), 0.72 * math.sin(a)
        x2, y2 = 1.0 * math.cos(a), 1.0 * math.sin(a)
        nx, ny = -math.sin(a) * 0.09, math.cos(a) * 0.09
        petals.moveTo(x1, y1)
        petals.quadTo((x1 + x2) / 2 + nx, (y1 + y2) / 2 + ny, x2, y2)
        petals.quadTo((x1 + x2) / 2 - nx, (y1 + y2) / 2 - ny, x1, y1)
    parts.append(petals)
    return parts


ROSETTE8 = rosette_parts(8)
ROSETTE12 = rosette_parts(12)


def rosette(c, cx, cy, R, prog, a=1.0, rot=0.0, n=8, w=2.6, color=GOLD, glow=0.9):
    parts = ROSETTE8 if n == 8 else ROSETTE12
    k = len(parts)
    for i, p in enumerate(parts):
        lp = clamp(prog * (k * 0.55 + 1) - i * 0.55)
        if lp <= 0:
            continue
        stroke(c, xf(p, cx, cy, R, rot), w=w, color=color, a=a, trim=(0, ease_in_out_cubic(lp)), glow=glow)


def girih_field(c, cx, cy, cell, reveal_r, a=1.0, rot=0.0, w=1.6, color=GOLD, max_r=1400, soft=220):
    """Tiled 8-point stars, revealed radially from (cx,cy)."""
    if a <= 0.003 or reveal_r <= 0:
        return
    base = star_outline(8, 0.5, 0.36)
    sq = skia.Path(); sq.addRect(-0.5, -0.5, 0.5, 0.5)
    nmax = int(max_r / cell) + 2
    for iy in range(-nmax, nmax + 1):
        for ix in range(-nmax, nmax + 1):
            x = cx + (ix * math.cos(math.radians(rot)) - iy * math.sin(math.radians(rot))) * cell
            y = cy + (ix * math.sin(math.radians(rot)) + iy * math.cos(math.radians(rot))) * cell
            if x < -cell or x > W + cell or y < -cell or y > H + cell:
                continue
            d = math.hypot(x - cx, y - cy)
            k = clamp((reveal_r - d) / soft)
            if k <= 0:
                continue
            k = ease_in_out_cubic(k)
            stroke(c, xf(base, x, y, cell * 0.98, rot + 22.5), w=w, color=color, a=a * k, trim=(0, k), glow=0.35)


# ---------------------------------------------------------------- icons (unit ~ [-1,1])
def icon_aperture(open_=1.0, blades=6):
    p = skia.Path()
    p.addCircle(0, 0, 1.0)
    r_in = 0.18 + 0.62 * open_
    for i in range(blades):
        a = 2 * math.pi * i / blades
        x1, y1 = math.cos(a), math.sin(a)
        a2 = a + math.pi / 2.2
        x2, y2 = r_in * math.cos(a2), r_in * math.sin(a2)
        p.moveTo(x1, y1); p.lineTo(x2, y2)
    poly = skia.Path()
    for i in range(blades):
        a2 = 2 * math.pi * i / blades + math.pi / 2.2
        x2, y2 = r_in * math.cos(a2), r_in * math.sin(a2)
        poly.moveTo(x2, y2) if i == 0 else poly.lineTo(x2, y2)
    poly.close()
    p.addPath(poly)
    return p


def icon_sound(arcs=3):
    p = skia.Path()
    for i in range(arcs):
        r = 0.35 + 0.3 * i
        p.addArc(skia.Rect.MakeLTRB(-r, -r, r, r), -50, 100)
    p.addCircle(-0.12, 0, 0.12)
    return p


def icon_scent():
    p = skia.Path()
    for k, ox in enumerate((-0.45, 0.0, 0.45)):
        p.moveTo(ox, 0.95)
        p.cubicTo(ox - 0.35, 0.5, ox + 0.35, 0.2, ox, -0.15)
        p.cubicTo(ox - 0.3, -0.45, ox + 0.25, -0.7, ox + 0.05, -0.95)
    return p


def icon_drop():
    p = skia.Path()
    p.moveTo(0, -1.0)
    p.cubicTo(0.25, -0.55, 0.72, -0.1, 0.72, 0.3)
    p.cubicTo(0.72, 0.72, 0.38, 1.0, 0, 1.0)
    p.cubicTo(-0.38, 1.0, -0.72, 0.72, -0.72, 0.3)
    p.cubicTo(-0.72, -0.1, -0.25, -0.55, 0, -1.0)
    p.close()
    p.addArc(skia.Rect.MakeLTRB(-0.42, -0.05, 0.42, 0.79), 110, 60)
    return p


def icon_gear(teeth=10):
    p = skia.Path()
    n = teeth * 4
    for i in range(n):
        a = 2 * math.pi * i / n
        r = 1.0 if (i % 4) in (1, 2) else 0.78
        x, y = r * math.cos(a), r * math.sin(a)
        p.moveTo(x, y) if i == 0 else p.lineTo(x, y)
    p.close()
    p.addCircle(0, 0, 0.32)
    return p


def icon_scale(tilt=0.0):
    p = skia.Path()
    p.moveTo(0, -0.9); p.lineTo(0, 0.85)
    p.moveTo(-0.45, 0.85); p.lineTo(0.45, 0.85)
    a = math.radians(tilt)
    lx, ly = -0.8 * math.cos(a), -0.62 - 0.8 * math.sin(a)
    rx, ry = 0.8 * math.cos(a), -0.62 + 0.8 * math.sin(a)
    p.moveTo(lx, ly); p.lineTo(rx, ry)
    for (x, y) in ((lx, ly), (rx, ry)):
        p.moveTo(x, y); p.lineTo(x - 0.3, y + 0.55)
        p.moveTo(x, y); p.lineTo(x + 0.3, y + 0.55)
        p.addArc(skia.Rect.MakeLTRB(x - 0.32, y + 0.3, x + 0.32, y + 0.8), 0, 180)
    p.addCircle(0, -0.92, 0.07)
    return p


def icon_lamp():
    """Hanging mosque lamp (kandil)."""
    p = skia.Path()
    p.moveTo(0, -1.0); p.lineTo(0, -0.62)
    p.moveTo(-0.3, -0.62); p.lineTo(0.3, -0.62)
    p.moveTo(-0.3, -0.62)
    p.cubicTo(-0.75, -0.3, -0.85, 0.25, -0.35, 0.55)
    p.lineTo(0.35, 0.55)
    p.cubicTo(0.85, 0.25, 0.75, -0.3, 0.3, -0.62)
    p.moveTo(-0.22, 0.55); p.lineTo(-0.14, 0.82); p.lineTo(0.14, 0.82); p.lineTo(0.22, 0.55)
    p.moveTo(0, 0.82); p.lineTo(0, 1.0)
    p.moveTo(-0.62, -0.05); p.lineTo(0.62, -0.05)
    return p


def icon_network():
    pts = [(0, -0.85), (-0.75, -0.3), (0.75, -0.35), (-0.45, 0.6), (0.5, 0.65), (0.05, 0.05)]
    p = skia.Path()
    edges = [(0, 5), (1, 5), (2, 5), (3, 5), (4, 5), (0, 1), (0, 2), (1, 3), (2, 4), (3, 4)]
    for a, b in edges:
        p.moveTo(*pts[a]); p.lineTo(*pts[b])
    for x, y in pts:
        p.addCircle(x, y, 0.1)
    return p


def icon_light():
    """Ruh: a flame-like luminous drop with rays."""
    p = skia.Path()
    p.moveTo(0, -0.62)
    p.cubicTo(0.3, -0.25, 0.42, 0.05, 0.42, 0.25)
    p.cubicTo(0.42, 0.52, 0.22, 0.68, 0, 0.68)
    p.cubicTo(-0.22, 0.68, -0.42, 0.52, -0.42, 0.25)
    p.cubicTo(-0.42, 0.05, -0.3, -0.25, 0, -0.62)
    p.close()
    for i in range(8):
        a = -math.pi / 2 + 2 * math.pi * i / 8
        p.moveTo(0.78 * math.cos(a), 0.78 * math.sin(a) + 0.05)
        p.lineTo(1.0 * math.cos(a), 1.0 * math.sin(a) + 0.05)
    return p


def icon_thorn():
    p = skia.Path()
    p.moveTo(-0.15, 1.0); p.cubicTo(0.1, 0.4, -0.1, -0.3, 0.15, -1.0)
    for y, s in ((0.55, 1), (0.05, -1), (-0.45, 1)):
        x = 0.0
        p.moveTo(x, y + 0.12); p.lineTo(x + 0.45 * s, y - 0.12); p.lineTo(x, y - 0.08)
    return p


def icon_star():
    return star_outline(8, 1.0, 0.55)


def icon_hex(r=1.0):
    p = skia.Path()
    for i in range(6):
        a = math.pi / 6 + math.pi / 3 * i
        x, y = r * math.cos(a), r * math.sin(a)
        p.moveTo(x, y) if i == 0 else p.lineTo(x, y)
    p.close()
    return p


def icon_mihrab():
    p = skia.Path()
    p.moveTo(-0.62, 1.0); p.lineTo(-0.62, -0.1)
    p.cubicTo(-0.62, -0.62, -0.25, -0.82, 0, -1.0)
    p.cubicTo(0.25, -0.82, 0.62, -0.62, 0.62, -0.1)
    p.lineTo(0.62, 1.0)
    p.moveTo(-0.36, 1.0); p.lineTo(-0.36, 0.0)
    p.cubicTo(-0.36, -0.35, -0.14, -0.5, 0, -0.62)
    p.cubicTo(0.14, -0.5, 0.36, -0.35, 0.36, 0.0)
    p.lineTo(0.36, 1.0)
    p.moveTo(-0.85, 1.0); p.lineTo(0.85, 1.0)
    return p


def icon_heartlamp():
    return icon_lamp()


ICONS = dict(aperture=icon_aperture, sound=icon_sound, scent=icon_scent, drop=icon_drop,
             gear=icon_gear, scale=icon_scale, lamp=icon_lamp, network=icon_network,
             light=icon_light, thorn=icon_thorn, star=icon_star, hex=icon_hex, mihrab=icon_mihrab)


def badge(c, cx, cy, r, icon, lt, a=1.0, color=GOLD, w=2.4, ring=True, icon_scale=0.55, dur=0.7, rot=0.0):
    """Circular badge that draws itself, then the icon draws in."""
    if a <= 0.003 or lt <= 0:
        return
    p1 = ease_out_cubic(lin(0, dur * 0.7, lt))
    p2 = ease_in_out_cubic(lin(dur * 0.25, dur, lt))
    pop = ease_out_back(lin(0, dur * 0.6, lt), 2.2)
    rr = r * (0.6 + 0.4 * pop)
    if ring:
        bgp = skia.Paint(AntiAlias=True, Color4f=skia.Color4f(0.04, 0.03, 0.02, 0.38 * a * p1),
                         MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 6))
        c.drawCircle(cx, cy, rr, bgp)
        stroke(c, xf(circle(0, 0, 1), cx, cy, rr, -90), w=w, color=color, a=a, trim=(0, p1), glow=0.9)
    ip = icon if isinstance(icon, skia.Path) else ICONS[icon]()
    stroke(c, xf(ip, cx, cy, rr * icon_scale, rot), w=w, color=GOLD_HI, a=a, trim=(0, p2), glow=0.8)


# ---------------------------------------------------------------- particles
def dust(c, T, n=60, seed=1, a=1.0, region=(0, 0, W, H), color=GOLD_HI, speed=1.0, size=(1.0, 4.5)):
    x0, y0, x1, y1 = region
    for i in range(n):
        r1, r2, r3, r4 = hash01(seed, i, 1), hash01(seed, i, 2), hash01(seed, i, 3), hash01(seed, i, 4)
        depth = r3
        sp = (8 + 30 * depth) * speed
        x = x0 + (r1 * (x1 - x0) + 22 * math.sin(T * 0.35 + r4 * 6.28) * (0.5 + depth)) % (x1 - x0)
        y = y0 + ((r2 * (y1 - y0) - T * sp) % (y1 - y0))
        rad = mix(size[0], size[1], depth ** 1.7)
        tw = 0.55 + 0.45 * math.sin(T * (0.8 + r4 * 1.7) + r1 * 20)
        al = a * tw * mix(0.25, 0.85, 1 - abs(depth - 0.4))
        if depth > 0.75:  # out-of-focus bokeh
            bp = skia.Paint(AntiAlias=True, Color4f=col(color, al * 0.22),
                            MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, rad * 1.4))
            bp.setBlendMode(SCREEN)
            c.drawCircle(x, y, rad * 2.6, bp)
        else:
            glow_dot(c, x, y, rad * 0.55, color, al, halo=3.0)


def burst(c, lt, cx, cy, n=40, seed=3, a=1.0, r0=20, r1=420, dur=1.4, color=GOLD_HI):
    if lt <= 0 or lt > dur:
        return
    for i in range(n):
        ang = hash01(seed, i) * 2 * math.pi
        spd = 0.4 + 0.6 * hash01(seed, i, 7)
        u = ease_out_expo(lt / dur)
        d = mix(r0, r1 * spd, u)
        al = a * (1 - ease_in_cubic(lt / dur))
        glow_dot(c, cx + d * math.cos(ang), cy + d * math.sin(ang), 1.2 + 2.2 * hash01(seed, i, 9), color, al)


def ripple(c, lt, cx, cy, n=3, gap=0.28, dur=1.6, r_max=520, a=1.0, w=2.2, color=GOLD):
    for k in range(n):
        u = (lt - k * gap) / dur
        if u <= 0 or u >= 1:
            continue
        r = r_max * ease_out_cubic(u)
        stroke(c, circle(cx, cy, r), w=w * (1 - u * 0.6), color=color, a=a * (1 - u) ** 1.3, glow=0.6)


def rays(c, cx, cy, T, a=1.0, n=14, length=1900, spread=70, seed=5, color=(255, 226, 170)):
    """Soft volumetric god rays from a point (additive)."""
    if a <= 0.003:
        return
    for i in range(n):
        r = hash01(seed, i)
        ang = math.radians(90 + (r - 0.5) * spread + 3 * math.sin(T * 0.25 + i))
        wdt = 18 + 60 * hash01(seed, i, 2)
        al = a * (0.05 + 0.08 * hash01(seed, i, 3)) * (0.7 + 0.3 * math.sin(T * 0.6 + i * 1.7))
        p = skia.Path()
        dx, dy = math.cos(ang), math.sin(ang)
        nx, ny = -dy, dx
        p.moveTo(cx + nx * 2, cy + ny * 2)
        p.lineTo(cx + dx * length + nx * wdt * 3, cy + dy * length + ny * wdt * 3)
        p.lineTo(cx + dx * length - nx * wdt * 3, cy + dy * length - ny * wdt * 3)
        p.lineTo(cx - nx * 2, cy - ny * 2)
        p.close()
        pt = skia.Paint(AntiAlias=True)
        pt.setShader(skia.GradientShader.MakeLinear(
            [skia.Point(cx, cy), skia.Point(cx + dx * length, cy + dy * length)],
            [col(color, al), col(color, 0)]))
        pt.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 18))
        pt.setBlendMode(SCREEN)
        c.drawPath(p, pt)


def radial_glow(c, cx, cy, r, color=(255, 220, 160), a=1.0):
    if a <= 0.003:
        return
    p = skia.Paint(AntiAlias=True)
    p.setShader(skia.GradientShader.MakeRadial(skia.Point(cx, cy), r,
                                               [col(color, a), col(color, a * 0.35), col(color, 0)], [0, 0.35, 1]))
    p.setBlendMode(SCREEN)
    c.drawCircle(cx, cy, r, p)


def callout(c, lt, ax, ay, bx, by, icon, a=1.0, r=46, color=GOLD):
    """Anchor ring at (ax,ay) -> elbow line -> badge at (bx,by)."""
    if lt <= 0 or a <= 0.003:
        return
    p0 = ease_out_cubic(lin(0, 0.35, lt))
    stroke(c, circle(ax, ay, 9 + 5 * p0), w=2.2, color=color, a=a, trim=(0, p0), glow=0.9)
    glow_dot(c, ax, ay, 3.2 * p0, GOLD_HI, a)
    dl = skia.Path(); dl.moveTo(ax, ay)
    # diagonal then straight into the badge edge
    vx, vy = bx - ax, by - ay
    L = math.hypot(vx, vy) + 1e-6
    ex, ey = bx - vx / L * r, by - vy / L * r
    dl.lineTo(ex, ey)
    pl = ease_in_out_cubic(lin(0.15, 0.6, lt))
    stroke(c, dl, w=1.8, color=color, a=a * 0.9, trim=(0, pl), glow=0.6)
    if lt > 0.45:
        badge(c, bx, by, r, icon, lt - 0.45, a=a, color=color)
