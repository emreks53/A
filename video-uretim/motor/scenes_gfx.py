"""Timeline-driven motion-graphic events. Each event: dict(type, t0, t1, ...).
draw()      -> under the gloss subtitles
draw_top()  -> above everything (end card text)
bg_ops()    -> pixel operations on the background before post."""
import math
import numpy as np, cv2, skia
from common import *
import gfx

CX, CY = W / 2, H / 2


def _vis(ev, T, fin=0.35, fout=0.45):
    t0, t1 = ev['t0'], ev['t1']
    if T < t0 or T > t1 + fout:
        return 0.0
    a = ease_out_cubic(lin(t0, t0 + ev.get('fin', fin), T))
    b = 1 - ease_in_out_sine(lin(t1, t1 + ev.get('fout', fout), T))
    return min(a, b) * ev.get('alpha', 1.0)


def _zoomfac(ev, T, ctx):
    """Follow the plate's Ken Burns zoom so anchors stick to the footage."""
    sid = ev.get('shot')
    if not sid:
        return 1.0
    for s in ctx['tl']['shots']:
        if s['id'] == sid:
            t0 = s['start'] - s.get('_pre', 0)
            t1 = s['end'] + s.get('_post', 0)
            u = clamp((T - t0) / max(t1 - t0, 1e-3))
            umid = clamp((ev.get('ref_t', (s['start'] + s['end']) / 2) - t0) / max(t1 - t0, 1e-3))
            z = mix(s.get('z0', 1), s.get('z1', 1.08), ease_in_out_sine(u))
            zr = mix(s.get('z0', 1), s.get('z1', 1.08), ease_in_out_sine(umid))
            return z / zr
    return 1.0


def _track(ev, T, ctx, x, y):
    k = _zoomfac(ev, T, ctx)
    return CX + (x - CX) * k, CY + (y - CY) * k


# ------------------------------------------------------------------ events
def ev_rosette(c, T, ev, ctx):
    a = _vis(ev, T)
    if a <= 0:
        return
    lt = T - ev['t0']
    prog = clamp(lt / ev.get('draw', 1.2))
    grow = ev.get('grow', 0.0) * ease_in_cubic(lin(ev['t1'] - 0.2, ev['t1'] + ev.get('fout', 0.45), T))
    R = ev['R'] * (1 + grow)
    rot = ev.get('rot0', 0) + ev.get('spin', 6) * lt
    gfx.radial_glow(c, ev['cx'], ev['cy'], R * 1.6, a=0.22 * a * prog)
    gfx.rosette(c, ev['cx'], ev['cy'], R, prog, a=a, rot=rot, n=ev.get('n', 8), w=ev.get('w', 2.8))
    if ev.get('inner'):
        gfx.rosette(c, ev['cx'], ev['cy'], R * 0.52, clamp(prog * 1.2 - 0.25), a=a * 0.9, rot=-rot * 1.5 + 22.5,
                    n=ev.get('inner'), w=ev.get('w', 2.8) * 0.8)
    if 'burst_t' in ev:
        gfx.burst(c, T - ev['burst_t'], ev['cx'], ev['cy'], n=46, r0=R * 0.3, r1=R * 2.2, a=a)


def ev_attr_dots(c, T, ev, ctx):
    a = _vis(ev, T)
    if a <= 0:
        return
    ons = ev['onsets']
    n = len(ons)
    y = ev.get('y', 300)
    gap = ev.get('gap', 92)
    x0 = CX - gap * (n - 1) / 2
    lt = T - ev['t0']
    # connecting hairline
    lw = ease_out_cubic(lin(0, 0.8, lt)) * gap * (n - 1) / 2
    p = skia.Path(); p.moveTo(CX - lw, y); p.lineTo(CX + lw, y)
    gfx.stroke(c, p, w=1.2, a=a * 0.55, glow=0.3)
    for i, on in enumerate(ons):
        x = x0 + gap * i
        app = ease_out_back(lin(ev['t0'] + 0.08 * i, ev['t0'] + 0.08 * i + 0.5, T))
        if app <= 0:
            continue
        r = 14 * app
        dia = skia.Path(); dia.moveTo(x, y - r); dia.lineTo(x + r, y); dia.lineTo(x, y + r); dia.lineTo(x - r, y); dia.close()
        lit = ease_out_cubic(lin(on - 0.03, on + 0.25, T))
        cur = 1.0 if (T >= on and (i + 1 >= n or T < ons[i + 1])) else 0.0
        c.drawPath(dia, skia.Paint(AntiAlias=True, Color4f=skia.Color4f(0.04, 0.03, 0.02, 0.45 * a)))
        gfx.stroke(c, dia, w=1.6, a=a * 0.9, glow=0.5)
        if lit > 0:
            big = 1 + 0.5 * cur * (1 - ease_out_cubic(lin(on, on + 0.6, T)))
            rr = r * 0.62 * big
            d2 = skia.Path(); d2.moveTo(x, y - rr); d2.lineTo(x + rr, y); d2.lineTo(x, y + rr); d2.lineTo(x - rr, y); d2.close()
            gfx.fill_glow(c, d2, GOLD_HI, a * lit * (0.75 + 0.25 * cur), glow=0.9 + cur)
            gfx.ripple(c, T - on, x, y, n=1, dur=0.9, r_max=60, a=a * 0.9, w=1.4)


def ev_spiral(c, T, ev, ctx):
    """Golden-ratio squares + spiral drawing on (latîf hikmet)."""
    a = _vis(ev, T)
    if a <= 0:
        return
    lt = T - ev['t0']
    prog = clamp(lt / ev.get('draw', 1.4))
    phi = (1 + 5 ** 0.5) / 2
    s = ev['size']
    cx, cy = ev['cx'], ev['cy']
    rot = ev.get('rot0', 0) + ev.get('spin', 0) * lt
    # convergence point of the square subdivision
    lx, ly, lw, lh = -s * phi / 2, -s / 2, s * phi, s
    for i in range(40):
        dd = i % 4
        if dd == 0: side = lh; lx += side; lw -= side
        elif dd == 1: side = lw; ly += side; lh -= side
        elif dd == 2: side = lh; lw -= side
        else: side = lw; lh -= side
    c.save(); c.translate(cx, cy); c.rotate(rot); c.scale(ev.get('flipx', 1), 1); c.translate(-lx, -ly)
    x, y, wdt, hgt = -s * phi / 2, -s / 2, s * phi, s
    sq = skia.Path(); sp = skia.Path()
    rects = []
    dirn = 0
    for i in range(9):
        if dirn == 0:   # square on the left
            side = hgt; r = (x, y, side, side); arc = (x + side, y + side, side, 180)
            x += side; wdt -= side
        elif dirn == 1:  # top
            side = wdt; r = (x, y, side, side); arc = (x, y + side, side, 270)
            y += side; hgt -= side
        elif dirn == 2:  # right
            side = hgt; r = (x + wdt - side, y, side, side); arc = (x + wdt - side, y, side, 0)
            wdt -= side
        else:            # bottom
            side = wdt; r = (x, y + hgt - side, side, side); arc = (x + side, y + hgt - side, side, 90)
            hgt -= side
        rects.append(r)
        ox, oy, rad, st = arc
        sp.arcTo(skia.Rect.MakeLTRB(ox - rad, oy - rad, ox + rad, oy + rad), st, 90, i == 0)
        dirn = (dirn + 1) % 4
    for i, (rx, ry, sd, _) in enumerate(rects):
        sq.addRect(rx, ry, rx + sd, ry + sd)
    gfx.stroke(c, sq, w=1.3, a=a * 0.55, trim=(0, ease_in_out_cubic(prog)), glow=0.3)
    gfx.stroke(c, sp, w=3.0, color=GOLD_HI, a=a, trim=(0, ease_in_out_cubic(clamp(prog * 1.25 - 0.15))), glow=1.0)
    c.restore()


def ev_focus(c, T, ev, ctx):
    """Reticle that tightens onto a small point (küçük)."""
    a = _vis(ev, T)
    if a <= 0:
        return
    lt = T - ev['t0']
    u = ease_in_out_cubic(clamp(lt / ev.get('dur', 0.9)))
    x, y = _track(ev, T, ctx, ev['x'], ev['y'])
    r = mix(ev.get('r0', 520), ev.get('r1', 70), u)
    gfx.stroke(c, gfx.circle(x, y, r), w=2.0, a=a * 0.9, glow=0.6)
    for k in range(4):
        ang = k * 90 + 45 + 30 * u
        p = skia.Path()
        r1, r2 = r + 14, r + 44
        p.moveTo(x + r1 * math.cos(math.radians(ang)), y + r1 * math.sin(math.radians(ang)))
        p.lineTo(x + r2 * math.cos(math.radians(ang)), y + r2 * math.sin(math.radians(ang)))
        gfx.stroke(c, p, w=2.0, a=a, glow=0.6)
    gfx.glow_dot(c, x, y, 3.5, a=a)


def ev_callouts(c, T, ev, ctx):
    a = _vis(ev, T)
    if a <= 0:
        return
    for item in ev['items']:
        t, ax, ay, bx, by, icon = item
        if T < t:
            continue
        ax2, ay2 = _track(ev, T, ctx, ax, ay)
        gfx.callout(c, T - t, ax2, ay2, bx, by, icon, a=a, r=ev.get('r', 50))


def ev_blueprint(c, T, ev, ctx):
    """Engineering rings + ticks around a mechanism (cevarih / cihazat)."""
    a = _vis(ev, T)
    if a <= 0:
        return
    x, y = _track(ev, T, ctx, ev['x'], ev['y'])
    lt = T - ev['t0']
    k = _zoomfac(ev, T, ctx)
    for i, (r, n, sp, wt) in enumerate(ev.get('rings', [(200, 72, 12, 1.4), (262, 36, -8, 2.0), (330, 120, 5, 1.0)])):
        st = ev['t0'] + 0.18 * i
        pr = ease_out_cubic(lin(st, st + 0.8, T))
        if pr <= 0:
            continue
        R = r * k
        gfx.stroke(c, gfx.xf(gfx.circle(0, 0, 1), x, y, R, -90 + sp * lt), w=wt, a=a * 0.85, trim=(0, pr), glow=0.5)
        ticks = skia.Path()
        for j in range(n):
            ang = math.radians(j * 360 / n + sp * lt)
            L = 16 if j % 6 == 0 else 7
            ticks.moveTo(x + R * math.cos(ang), y + R * math.sin(ang))
            ticks.lineTo(x + (R - L) * math.cos(ang), y + (R - L) * math.sin(ang))
        gfx.stroke(c, ticks, w=1.1, a=a * 0.7 * pr, glow=0.2)
    for t in ev.get('pings', []):
        gfx.ripple(c, T - t, x, y, n=2, dur=1.2, r_max=420 * k, a=a, w=1.6)


def ev_orbs(c, T, ev, ctx):
    """Soft constellation of luminous points (letaif ve maneviyat)."""
    a = _vis(ev, T)
    if a <= 0:
        return
    pts = ev['pts']
    lt = T - ev['t0']
    shown = []
    for i, (x, y, r) in enumerate(pts):
        app = ease_out_cubic(lin(ev['t0'] + i * ev.get('step', 0.22), ev['t0'] + i * ev.get('step', 0.22) + 0.6, T))
        if app <= 0:
            continue
        fx = x + 14 * math.sin(lt * 0.7 + i * 1.3)
        fy = y + 12 * math.cos(lt * 0.6 + i * 2.1)
        shown.append((fx, fy, app))
        gfx.radial_glow(c, fx, fy, r * 3.2, a=0.35 * a * app)
        gfx.glow_dot(c, fx, fy, r * 0.32, a=a * app)
        gfx.stroke(c, gfx.circle(fx, fy, r * (0.9 + 0.1 * math.sin(lt * 2 + i))), w=1.3, a=a * app * 0.7, glow=0.4)
    for i in range(1, len(shown)):
        x1, y1, a1 = shown[i - 1]; x2, y2, a2 = shown[i]
        p = skia.Path(); p.moveTo(x1, y1)
        mx, my = (x1 + x2) / 2 + (y2 - y1) * 0.18, (y1 + y2) / 2 - (x2 - x1) * 0.18
        p.quadTo(mx, my, x2, y2)
        gfx.stroke(c, p, w=1.1, a=a * min(a1, a2) * 0.55, trim=(0, a2), glow=0.3)


def ev_girih(c, T, ev, ctx):
    a = _vis(ev, T)
    if a <= 0:
        return
    lt = T - ev['t0']
    x, y = _track(ev, T, ctx, ev['x'], ev['y'])
    r = ev.get('speed', 900) * ease_out_cubic(clamp(lt / ev.get('dur', 1.6))) * ev.get('dur', 1.6)
    gfx.girih_field(c, x, y, ev.get('cell', 150) * _zoomfac(ev, T, ctx), r, a=a, rot=ev.get('rot', 0) + ev.get('spin', 0) * lt,
                    w=ev.get('w', 1.5))


def ev_burst(c, T, ev, ctx):
    a = ev.get('alpha', 1.0)
    for t in ev.get('times', [ev['t0']]):
        gfx.burst(c, T - t, ev['x'], ev['y'], n=ev.get('n', 70), r0=ev.get('r0', 30), r1=ev.get('r1', 700),
                  dur=ev.get('dur', 1.8), a=a, seed=int(t * 10))


def ev_segments(c, T, ev, ctx):
    """A ring divided into portions that light up one by one (aksam)."""
    a = _vis(ev, T)
    if a <= 0:
        return
    n = ev.get('n', 7)
    x, y, R = ev['x'], ev['y'], ev['R']
    lt = T - ev['t0']
    gap = 4.0
    for i in range(n):
        st = ev['t0'] + i * ev.get('step', 0.12)
        pr = ease_out_cubic(lin(st, st + 0.5, T))
        if pr <= 0:
            continue
        ang0 = -90 + i * 360 / n + gap / 2 + lt * 6
        sweep = (360 / n - gap) * pr
        p = skia.Path(); p.addArc(skia.Rect.MakeLTRB(x - R, y - R, x + R, y + R), ang0, sweep)
        gfx.stroke(c, p, w=ev.get('w', 9), a=a * (0.55 + 0.45 * (i % 2)), glow=0.7)
        p2 = skia.Path(); R2 = R + 26; p2.addArc(skia.Rect.MakeLTRB(x - R2, y - R2, x + R2, y + R2), ang0, sweep)
        gfx.stroke(c, p2, w=1.2, a=a * 0.6, glow=0.2)


def ev_layers(c, T, ev, ctx):
    """Stacked translucent arcs (tabakat)."""
    a = _vis(ev, T)
    if a <= 0:
        return
    n = ev.get('n', 6)
    x, y0 = ev['x'], ev['y']
    for i in range(n):
        st = ev['t0'] + i * ev.get('step', 0.12)
        pr = ease_out_back(lin(st, st + 0.6, T), 1.4)
        if pr <= 0:
            continue
        yy = y0 - i * ev.get('gap', 46) * pr
        wdt = ev.get('w0', 420) - i * 40
        p = skia.Path()
        p.moveTo(x - wdt, yy)
        p.cubicTo(x - wdt * 0.5, yy - 60, x + wdt * 0.5, yy - 60, x + wdt, yy)
        fillp = skia.Path(p); fillp.lineTo(x + wdt, yy + 10); fillp.cubicTo(x + wdt * 0.5, yy - 48, x - wdt * 0.5, yy - 48, x - wdt, yy + 10); fillp.close()
        c.drawPath(fillp, skia.Paint(AntiAlias=True, Color4f=col(GOLD, 0.10 * a * pr)))
        gfx.stroke(c, p, w=2.0, a=a * (1 - i * 0.08), trim=(0.5 - 0.5 * pr, 0.5 + 0.5 * pr), glow=0.6)


def ev_pulses(c, T, ev, ctx):
    for t in ev['times']:
        gfx.ripple(c, T - t, ev['x'], ev['y'], n=ev.get('n', 2), dur=ev.get('dur', 1.4), r_max=ev.get('r', 560),
                   a=ev.get('alpha', 1.0), w=ev.get('w', 2.2))


def ev_converge(c, T, ev, ctx):
    """1001 points stream in and settle into a 12-fold rosette, then radiate (bin bir esma)."""
    a = _vis(ev, T)
    if a <= 0:
        return
    if 'pts' not in ev:
        n = ev.get('n', 1001)
        pts = []
        k = 0
        rings = [(1.0, 48), (0.86, 96), (0.72, 120), (0.6, 144), (0.48, 168), (0.37, 156), (0.27, 132), (0.18, 96), (0.1, 60), (0.03, 12)]
        for rr, cnt in rings:
            for j in range(cnt):
                th = 2 * math.pi * j / cnt
                # 12-fold petal modulation
                m = 1 + 0.07 * math.cos(12 * th) * (1 if rr > 0.5 else -1)
                pts.append((rr * m * math.cos(th), rr * m * math.sin(th)))
        pts = pts[:n]
        while len(pts) < n:
            pts.append((0, 0))
        ev['pts'] = pts
    pts = ev['pts']
    x0, y0, R = ev['x'], ev['y'], ev['R']
    lt = T - ev['t0']
    dur = ev.get('dur', 1.6)
    rot = lt * ev.get('spin', 8)
    cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    rad = ev.get('radiate_t')
    pr_rad = ease_out_cubic(lin(rad, rad + 1.2, T)) if rad else 0
    paint = skia.Paint(AntiAlias=True)
    for i, (px, py) in enumerate(pts):
        d = hash01(i, 3) * 0.55
        u = ease_in_out_cubic(clamp((lt - d) / dur))
        if u <= 0:
            continue
        sa = hash01(i, 5) * 2 * math.pi
        sd = 900 + 600 * hash01(i, 7)
        sx, sy = x0 + sd * math.cos(sa), y0 + sd * math.sin(sa)
        tx = x0 + R * (px * cr - py * sr) * (1 + 0.12 * pr_rad)
        ty = y0 + R * (px * sr + py * cr) * (1 + 0.12 * pr_rad)
        x = mix(sx, tx, u); y = mix(sy, ty, u)
        tw = 0.6 + 0.4 * math.sin(T * 3 + i)
        al = a * min(1, u * 1.5) * tw
        r = 2.6 + 2.6 * hash01(i, 9)
        if i % 9 == 0:
            gfx.glow_dot(c, x, y, r * 0.9, GOLD_HI, al, halo=2.5)
        else:
            paint.setColor4f(col(GOLD_HI, al))
            c.drawCircle(x, y, r, paint)
    gfx.radial_glow(c, x0, y0, R * (1.3 + 0.6 * pr_rad), a=a * (0.18 + 0.3 * pr_rad))
    if rad:
        gfx.rays(c, x0, y0, T, a=a * pr_rad * 0.9, n=18, spread=360, length=1300)


def ev_scale(c, T, ev, ctx):
    a = _vis(ev, T)
    if a <= 0:
        return
    tt = ev.get('tilt_t', ev['t0'] + 1)
    tilt = 14 * math.sin(max(0, T - tt) * 5.0) * math.exp(-max(0, T - tt) * 1.6) if T > tt else 0
    gfx.badge(c, ev['x'], ev['y'], ev.get('r', 120), gfx.icon_scale(tilt), T - ev['t0'], a=a, w=2.6, icon_scale=0.6)


def ev_hexgrid(c, T, ev, ctx):
    """Honeycomb lattice; cells light up individually (her birisinin ayrı ayrı hizmeti)."""
    a = _vis(ev, T)
    if a <= 0:
        return
    R = ev.get('cell', 64)
    x0, y0 = ev['x'], ev['y']
    lt = T - ev['t0']
    hexp = gfx.icon_hex(1.0)
    cols, rows = ev.get('cols', 7), ev.get('rows', 7)
    lit_t0, lit_t1 = ev.get('lit', (ev['t0'] + 1, ev['t0'] + 2.5))
    for j in range(rows):
        for i in range(cols):
            x = x0 + (i - cols / 2 + 0.5) * R * 1.732 + (R * 0.866 if j % 2 else 0)
            y = y0 + (j - rows / 2 + 0.5) * R * 1.5
            d = math.hypot(x - x0, y - y0)
            app = ease_out_cubic(lin(ev['t0'] + d / 900, ev['t0'] + d / 900 + 0.5, T))
            if app <= 0:
                continue
            fade = clamp(1 - d / (R * 5.2))
            if fade <= 0:
                continue
            gfx.stroke(c, gfx.xf(hexp, x, y, R * 0.94, 0), w=1.4, a=a * app * fade * 0.8, trim=(0, app), glow=0.3)
            lt_i = lit_t0 + hash01(i, j, 4) * (lit_t1 - lit_t0)
            lp = pulse(lt_i, 0.15, 0.4, 0.8, T)
            if lp > 0:
                hp = gfx.xf(hexp, x, y, R * 0.80, 0)
                gfx.fill_glow(c, hp, GOLD, a * lp * fade * 0.35, glow=0.8)
                gfx.stroke(c, hp, w=2.2, color=GOLD_HI, a=a * lp * fade, glow=0.9)


def ev_inventory(c, T, ev, ctx):
    """Row of badges popping at word onsets (lezzet, elem, vazife, mükâfat)."""
    a = _vis(ev, T)
    if a <= 0:
        return
    items = ev['items']  # (t, icon)
    n = len(items)
    gap = ev.get('gap', 210)
    y = ev.get('y', 470)
    x0 = CX - gap * (n - 1) / 2
    for i, (t, icon) in enumerate(items):
        if T < t:
            continue
        x = x0 + gap * i
        cur = 1.0 if (i + 1 >= n or T < items[i + 1][0]) else 0.0
        hl = 0.65 + 0.35 * cur
        gfx.badge(c, x, y, ev.get('r', 74) * (1 + 0.08 * cur), icon, T - t, a=a * hl, w=2.4)


def ev_viewfinder(c, T, ev, ctx):
    a = _vis(ev, T)
    if a <= 0:
        return
    lt = T - ev['t0']
    u = ease_out_cubic(clamp(lt / 0.6))
    x, y, w0, h0 = ev['x'], ev['y'], ev['w'], ev['h']
    ww = mix(w0 * 1.3, w0, u); hh = mix(h0 * 1.3, h0, u)
    L = 60
    p = skia.Path()
    for sx in (-1, 1):
        for sy in (-1, 1):
            cx, cy = x + sx * ww / 2, y + sy * hh / 2
            p.moveTo(cx - sx * L, cy); p.lineTo(cx, cy); p.lineTo(cx, cy - sy * L)
    gfx.stroke(c, p, w=2.6, a=a, glow=0.7)
    # focus ticks
    for t in ev.get('snaps', []):
        if 0 < T - t < 0.5:
            k = 1 - (T - t) / 0.5
            gfx.stroke(c, gfx.circle(x, y, 40 + 30 * k), w=1.6, a=a * k, glow=0.5)
    gfx.glow_dot(c, x, y, 2.6, a=a * 0.8)


def ev_waveform(c, T, ev, ctx):
    """Live sound line driven by the narration envelope (kulak)."""
    a = _vis(ev, T)
    if a <= 0 or ctx.get('env') is None:
        return
    env = ctx['env']
    y0 = ev.get('y', 560)
    p = skia.Path()
    N = 120
    for i in range(N + 1):
        x = 80 + (W - 160) * i / N
        u = i / N
        # sample envelope slightly in the past for a travelling feel
        tt = T - (1 - u) * 0.9
        fi = int(tt * FPS)
        e = env[fi] if 0 <= fi < len(env) else 0
        win = math.sin(math.pi * u) ** 1.5
        yv = y0 + win * e * ev.get('amp', 120) * math.sin(u * 38 + T * 9) * (0.6 + 0.4 * math.sin(u * 9 - T * 3))
        p.moveTo(x, yv) if i == 0 else p.lineTo(x, yv)
    lt = T - ev['t0']
    gfx.stroke(c, p, w=2.4, a=a, trim=(0.5 - 0.5 * ease_out_cubic(clamp(lt / 0.7)), 0.5 + 0.5 * ease_out_cubic(clamp(lt / 0.7))), glow=0.9)


def ev_scent(c, T, ev, ctx):
    """Flowing ribbons rising and curling (kuvve-i şâmme)."""
    a = _vis(ev, T)
    if a <= 0:
        return
    lt = T - ev['t0']
    for k in range(ev.get('n', 5)):
        xb = ev['x'] + (k - 2) * 120
        p = skia.Path()
        for i in range(60):
            u = i / 59
            yy = ev['y'] - u * ev.get('h', 900)
            xx = xb + 70 * math.sin(u * 5 + lt * 1.4 + k) * (0.3 + u) + 40 * math.sin(u * 11 - lt * 2 + k * 2) * u
            p.moveTo(xx, yy) if i == 0 else p.lineTo(xx, yy)
        st = clamp(lt / 1.4 - k * 0.12)
        gfx.stroke(c, p, w=2.0, a=a * (0.5 + 0.1 * k), trim=(0, ease_out_cubic(st)), glow=0.8)
    gfx.dust(c, T, n=26, seed=31, a=a * 0.8, region=(ev['x'] - 400, ev['y'] - 1000, ev['x'] + 400, ev['y']), speed=3)


def ev_flavor(c, T, ev, ctx):
    """Flavour wheel: radial segments in warm tones (ezvak)."""
    a = _vis(ev, T)
    if a <= 0:
        return
    x, y, R = ev['x'], ev['y'], ev['R']
    n = ev.get('n', 12)
    lt = T - ev['t0']
    cols = [(240, 190, 110), (226, 120, 90), (250, 214, 140), (200, 90, 80), (244, 170, 96), (255, 226, 170)]
    for i in range(n):
        st = ev['t0'] + i * 0.07
        pr = ease_out_back(lin(st, st + 0.5, T), 1.6)
        if pr <= 0:
            continue
        a0 = -90 + i * 360 / n + lt * 10
        sweep = 360 / n - 3
        r1 = R * (0.55 + 0.45 * pr * (0.75 + 0.25 * hash01(i, 2)))
        p = skia.Path()
        p.arcTo(skia.Rect.MakeLTRB(x - r1, y - r1, x + r1, y + r1), a0, sweep, True)
        r0 = R * 0.42
        p.arcTo(skia.Rect.MakeLTRB(x - r0, y - r0, x + r0, y + r0), a0 + sweep, -sweep, False)
        p.close()
        cc = cols[i % len(cols)]
        c.drawPath(p, skia.Paint(AntiAlias=True, Color4f=col(cc, 0.22 * a)))
        gfx.stroke(c, p, w=1.6, color=cc, a=a * 0.95, glow=0.6)
    gfx.badge(c, x, y, R * 0.36, 'drop', lt, a=a, ring=True)


def ev_trio(c, T, ev, ctx):
    """kalp / akıl / ruh badges."""
    a = _vis(ev, T)
    if a <= 0:
        return
    for (t, icon, x, y) in ev['items']:
        if T >= t:
            gfx.radial_glow(c, x, y, 190, a=0.25 * a * ease_out_cubic(lin(t, t + 0.6, T)))
            gfx.badge(c, x, y, ev.get('r', 82), icon, T - t, a=a, w=2.6)
    if ev.get('link'):
        its = ev['items']
        for i in range(1, len(its)):
            t = its[i][0]
            if T >= t:
                p = skia.Path(); p.moveTo(its[i - 1][2], its[i - 1][3]); p.lineTo(its[i][2], its[i][3])
                gfx.stroke(c, p, w=1.2, a=a * 0.5, trim=(0, ease_out_cubic(lin(t, t + 0.5, T))), glow=0.3)


def ev_finale(c, T, ev, ctx):
    """All faculties in a ring; each receives its reward (golden spark) in turn, then all glow."""
    a = _vis(ev, T)
    if a <= 0:
        return
    icons = ev['icons']
    n = len(icons)
    x0, y0, R = ev['x'], ev['y'], ev['R']
    lt = T - ev['t0']
    rot = lt * 4
    rew0, rew1 = ev['reward']
    allglow = ease_out_cubic(lin(ev.get('glow_t', rew1), ev.get('glow_t', rew1) + 0.6, T))
    for i, ic in enumerate(icons):
        ang = math.radians(-90 + i * 360 / n + rot)
        x, y = x0 + R * math.cos(ang), y0 + R * math.sin(ang)
        st = ev['t0'] + i * 0.12
        if T < st:
            continue
        tr = rew0 + (rew1 - rew0) * i / max(n - 1, 1)
        got = ease_out_cubic(lin(tr, tr + 0.35, T))
        gfx.badge(c, x, y, 54, ic, T - st, a=a * (0.75 + 0.25 * got), w=2.0)
        if T > tr:
            p = skia.Path(); p.moveTo(x0, y0); p.lineTo(x, y)
            gfx.stroke(c, p, w=1.4, color=GOLD_HI, a=a * 0.5 * got, trim=(0, got), glow=0.8)
            if T - tr < 0.8:
                gfx.burst(c, T - tr, x, y, n=16, r0=30, r1=140, dur=0.8, a=a, seed=i + 40)
            gfx.radial_glow(c, x, y, 120, a=a * got * (0.25 + 0.35 * allglow))
    gfx.rosette(c, x0, y0, R * 0.42, clamp(lt / 1.2), a=a, rot=-rot * 2, n=12, w=2.2)
    gfx.radial_glow(c, x0, y0, R * 1.5, a=a * 0.25 * allglow)


def ev_dust(c, T, ev, ctx):
    a = _vis(ev, T, 0.8, 0.8)
    if a <= 0:
        return
    gfx.dust(c, T, n=ev.get('n', 50), seed=ev.get('seed', 1), a=a, speed=ev.get('speed', 1.0),
             region=tuple(ev.get('region', (0, 0, W, H))))


def ev_rays(c, T, ev, ctx):
    a = _vis(ev, T, 0.6, 0.8)
    if a <= 0:
        return
    gfx.rays(c, ev.get('x', CX), ev.get('y', -80), T, a=a, n=ev.get('n', 14), spread=ev.get('spread', 70))


def ev_glow(c, T, ev, ctx):
    a = _vis(ev, T, 0.5, 0.6)
    if a <= 0:
        return
    gfx.radial_glow(c, ev['x'], ev['y'], ev['r'], color=tuple(ev.get('color', (255, 220, 160))), a=a)


def ev_badge(c, T, ev, ctx):
    a = _vis(ev, T)
    if a <= 0:
        return
    gfx.badge(c, ev['x'], ev['y'], ev.get('r', 90), ev['icon'], T - ev['t0'], a=a, w=ev.get('w', 2.6))


def ev_source_card(c, T, ev, ctx):
    """End card: Risale-i Nur / Sözler / Otuz İkinci Söz / Sayfa 712."""
    a = _vis(ev, T, 0.8, 0.8)
    if a <= 0:
        return
    lines = ev['lines']
    y = ev.get('y', 330)
    for i, (txt, fnt, size, color, gap, track) in enumerate(lines):
        st = ev['t0'] + i * ev.get('step', 0.38)
        u = ease_out_cubic(lin(st, st + 0.9, T))
        if u <= 0:
            y += gap
            continue
        f = font(fnt, size)
        # letter tracking
        glyphs = f.textToGlyphs(txt)
        widths = f.getWidths(glyphs)
        tr = track * (1 + 0.6 * (1 - u))
        total = sum(widths) + tr * (len(txt) - 1)
        x = CX - total / 2
        sh = skia.Paint(AntiAlias=True, Color4f=skia.Color4f(0, 0, 0, 0.55 * a * u),
                        MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 14))
        fp = skia.Paint(AntiAlias=True, Color4f=col(color, a * u))
        if u < 0.999:
            fp.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 6 * (1 - u)))
        yy = y + 18 * (1 - u)
        for k, ch in enumerate(txt):
            blob = skia.TextBlob.MakeFromString(ch, f)
            c.drawTextBlob(blob, x, yy + 4, sh)
            c.drawTextBlob(blob, x, yy, fp)
            x += widths[k] + tr
        if i == 0:
            # ornament under the title
            ow = 170 * ease_out_cubic(lin(st + 0.3, st + 1.1, T))
            yo = y + 46
            pth = skia.Path(); pth.moveTo(CX - ow, yo); pth.lineTo(CX - 18, yo)
            pth.moveTo(CX + 18, yo); pth.lineTo(CX + ow, yo)
            gfx.stroke(c, pth, w=1.4, a=a * u, glow=0.5)
            d = 9 * u
            dia = skia.Path(); dia.moveTo(CX, yo - d); dia.lineTo(CX + d, yo); dia.lineTo(CX, yo + d); dia.lineTo(CX - d, yo); dia.close()
            gfx.fill_glow(c, dia, GOLD, a * u, glow=0.8)
        y += gap


DRAW = {k[3:]: v for k, v in globals().items() if k.startswith('ev_')}


def draw(c, T, events, ctx):
    for ev in events:
        if ev.get('layer') == 'top' or ev['type'] in ('dim', 'blur', 'bgzoom'):
            continue
        if T < ev['t0'] - 0.01 or T > ev['t1'] + 3.0:
            continue
        DRAW[ev['type']](c, T, ev, ctx)


def draw_top(c, T, events, ctx):
    for ev in events:
        if ev.get('layer') != 'top':
            continue
        if T < ev['t0'] - 0.01 or T > ev['t1'] + 3.0:
            continue
        DRAW[ev['type']](c, T, ev, ctx)


def bg_ops(img, T, events, ctx):
    for ev in events:
        if ev['type'] == 'dim':
            a = _vis(ev, T, 0.4, 0.5)
            if a > 0:
                img = (img.astype(np.float32) * (1 - ev.get('amount', 0.3) * a)).astype(np.uint8)
        elif ev['type'] == 'blur':
            a = _vis(ev, T, 0.4, 0.5)
            if a > 0.02:
                img = cv2.GaussianBlur(img, (0, 0), ev.get('sigma', 8) * a)
    return img
