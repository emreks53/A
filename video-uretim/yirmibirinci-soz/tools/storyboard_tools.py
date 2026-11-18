#!/usr/bin/env python3
"""Storyboard tools: engine-exact camera maths, derived numbers, consistency checks, Markdown twin.

    python3 tools/storyboard_tools.py check     # verify storyboard.json against timing.json + geometry
    python3 tools/storyboard_tools.py md        # regenerate storyboard.md from storyboard.json
    python3 tools/storyboard_tools.py speeds    # camera speed at every word onset

The camera maths is a line-by-line port of video/src/engine/camera.js (cameraPath in mode 'ease',
worldToFrame with parallax), so every number printed here is what the engine will draw.
"""
import json, math, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SB_JSON = os.path.join(ROOT, 'storyboard.json')
SB_MD = os.path.join(ROOT, 'storyboard.md')
TIMING = os.path.join(ROOT, 'timing.json')
FPS = 30
W, H = 1080, 1920


# ----------------------------------------------------------------------------- easing (ease.js)
def _pw(n):
    return {
        'in': lambda t: t ** n,
        'out': lambda t: 1 - (1 - t) ** n,
        'inOut': lambda t: (2 * t) ** n / 2 if t < 0.5 else 1 - (2 - 2 * t) ** n / 2,
    }


def in_then_linear(a):
    """Ease in over the first fraction a of the segment, then constant speed to the end (C1)."""
    k = 1 - a / 2
    return lambda u: (u * u / (2 * a)) / k if u < a else (u - a / 2) / k


EASE = {
    'linear': lambda t: t,
    'hold': lambda t: t,          # both keys are identical; any ease
    'start': lambda t: t,
    'quad.in': _pw(2)['in'], 'quad.out': _pw(2)['out'], 'quad.inOut': _pw(2)['inOut'],
    'cubic.in': _pw(3)['in'], 'cubic.out': _pw(3)['out'], 'cubic.inOut': _pw(3)['inOut'],
    'quart.in': _pw(4)['in'], 'quart.out': _pw(4)['out'], 'quart.inOut': _pw(4)['inOut'],
    'sine.in': lambda t: 1 - math.cos(t * math.pi / 2),
    'sine.out': lambda t: math.sin(t * math.pi / 2),
    'sine.inOut': lambda t: -(math.cos(math.pi * t) - 1) / 2,
}


def ease_fn(name, seg_dt=None):
    if name is None:
        return EASE['cubic.inOut']
    if name.startswith('inThenLinear'):
        secs = float(name[name.index('(') + 1:name.index(')')].split()[0])
        return in_then_linear(secs / seg_dt)
    return EASE[name]


# ----------------------------------------------------------------------------- camera (camera.js)
def w2f(cam, f, x, y):
    """worldToFrame: where a point of a layer with parallax f lands on the frame."""
    cx, cy, zoom = cam
    z = math.exp(math.log(zoom) * f)
    return (W / 2 + (x - (W / 2 + (cx - W / 2) * f)) * z, H / 2 + (y - (H / 2 + (cy - H / 2) * f)) * z)


def f2w(cam, f, sx, sy):
    cx, cy, zoom = cam
    z = math.exp(math.log(zoom) * f)
    return ((sx - W / 2) / z + (W / 2 + (cx - W / 2) * f), (sy - H / 2) / z + (H / 2 + (cy - H / 2) * f))


def fr(t):
    """Frame index of a storyboard time (times are written rounded to 2 decimals)."""
    return int(round(t * FPS))


def ft(t):
    """Exact time of the frame a storyboard time refers to."""
    return fr(t) / FPS


class Path:
    def __init__(self, sb):
        self.cams = sb['cameras']
        keys = []
        for act in ('act1', 'act2'):
            for k in sb['camera_path'][act]:
                c = self.cams[k['framing']]
                keys.append({'t': ft(k['t']), 'ease': k.get('ease'), 'x': c['cx'], 'y': c['cy'], 'lz': math.log(c['zoom'])})
        # drop the duplicated hand-off key
        K = []
        for k in keys:
            if K and abs(K[-1]['t'] - k['t']) < 1e-9:
                continue
            K.append(k)
        self.K = K

    def at(self, t):
        K = self.K
        if t <= K[0]['t']:
            k = K[0]
            return (k['x'], k['y'], math.exp(k['lz']))
        if t >= K[-1]['t']:
            k = K[-1]
            return (k['x'], k['y'], math.exp(k['lz']))
        i = 0
        while t > K[i + 1]['t']:
            i += 1
        a, b = K[i], K[i + 1]
        dt = b['t'] - a['t']
        u = (t - a['t']) / dt
        e = ease_fn(b['ease'], dt)(u)
        return (a['x'] + (b['x'] - a['x']) * e, a['y'] + (b['y'] - a['y']) * e, math.exp(a['lz'] + (b['lz'] - a['lz']) * e))

    def speed(self, t, h=1e-3):
        """(pan px/s on the subject plane at the frame centre, zoom %/s)."""
        a, b = self.at(t - h), self.at(t + h)
        z = self.at(t)[2]
        pan = math.hypot(b[0] - a[0], b[1] - a[1]) * z / (2 * h)
        zr = (math.log(b[2]) - math.log(a[2])) / (2 * h) * 100
        return pan, zr

    def progress(self, t):
        """Fraction of the current segment's eased travel that is done at t (1 when holding)."""
        K = self.K
        if t <= K[0]['t'] or t >= K[-1]['t']:
            return 1.0
        i = 0
        while t > K[i + 1]['t']:
            i += 1
        a, b = K[i], K[i + 1]
        if (a['x'], a['y'], a['lz']) == (b['x'], b['y'], b['lz']):
            return 1.0
        dt = b['t'] - a['t']
        return ease_fn(b['ease'], dt)((t - a['t']) / dt)


def derived(cam_def):
    cx, cy, z = cam_def['cx'], cam_def['cy'], cam_def['zoom']
    c = (cx, cy, z)
    man = w2f(c, 1, 540, 660)
    feet = w2f(c, 1, 540, 1200)
    sun = w2f(c, 1, 540, 340)
    return {
        'man_x': round(man[0]),
        'man_head_top_y': round(man[1]),
        'man_feet_and_hedge_lip_y': round(feet[1]),
        'man_height': round(540 * z),
        'today_sun_centre': [round(sun[0]), round(sun[1])],
        'today_sun_r': round(110 * z),
        'visible_world_x': [round(cx - 540 / z), round(cx + 540 / z)],
        'visible_world_y': [round(cy - 960 / z), round(cy + 960 / z)],
    }


# ----------------------------------------------------------------------------- geometry helpers
def crest(x):
    return 1135 + 18 * math.sin(x / 310 + 1.2) + 8 * math.sin(x / 97)


def arc_y(x):
    return 340 + 855 * ((x - 540) / 410) ** 2


def arc_len_table(x0, x1, n=6000):
    pts = [(x0 + (x1 - x0) * i / n, arc_y(x0 + (x1 - x0) * i / n)) for i in range(n + 1)]
    L = [0.0]
    for i in range(1, len(pts)):
        L.append(L[-1] + math.dist(pts[i], pts[i - 1]))
    return pts, L


def arc_at(pts, L, s):
    import bisect
    i = min(max(bisect.bisect_left(L, s), 1), len(L) - 1)
    a = (s - L[i - 1]) / (L[i] - L[i - 1])
    return (pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * a, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * a)


def arc_dots(n=31, ring=(924, 1089), omit_r=125):
    pts, L = arc_len_table(130, 950)
    sp = L[-1] / (n - 1)
    dots = [arc_at(pts, L, k * sp) for k in range(n)]
    return [d for d in dots if math.dist(d, ring) > omit_r], sp, L[-1]


def lum(hexc):
    h = hexc.lstrip('#')
    out = []
    for i in (0, 2, 4):
        v = int(h[i:i + 2], 16) / 255
        out.append(v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]


def contrast(a, b):
    la, lb = lum(a), lum(b)
    if la < lb:
        la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)


# ----------------------------------------------------------------------------- checks
def all_events(sb):
    for act in sb['acts']:
        for b in act['beats']:
            for e in b['events']:
                yield act, b, e


def check(sb, timing, verbose=True):
    """Returns a list of problems (empty = clean)."""
    bad = []
    words = timing['words']
    wt = {}
    for w in words:
        wt.setdefault(w['w'], []).append(w['t'])
    # 1. beats are contiguous and inside their act; events inside their beat; times on the frame grid
    prev = None
    for act in sb['acts']:
        beats = act['beats']
        if abs(beats[0]['t0'] - act['t0']) > 1e-6 or abs(beats[-1]['t1'] - act['t1']) > 1e-6:
            bad.append(f"{act['id']}: beats do not span the act")
        for b in beats:
            if prev is not None and abs(prev - b['t0']) > 1e-6:
                bad.append(f"{b['id']}: t0 {b['t0']} does not continue from {prev}")
            prev = b['t1']
            last = -1
            for e in b['events']:
                t = e['t']
                if not e['what'].startswith('[engine]') and abs(round(t * FPS) / FPS - t) > 0.006:
                    bad.append(f"{b['id']} event {t}: not on the 30 fps grid")
                if not (b['t0'] - 1e-6 <= t <= b['t1'] + 1e-6):
                    bad.append(f"{b['id']} event {t}: outside the beat {b['t0']}-{b['t1']}")
                if t < last - 1e-6:
                    bad.append(f"{b['id']} event {t}: events not sorted")
                last = t
            for s in b.get('sfx', []):
                if not (b['t0'] - 0.06 <= s['t'] <= b['t1'] + 0.06):
                    bad.append(f"{b['id']} sfx {s['sound']} {s['t']}: outside the beat")
            if len(b.get('sfx', [])) > 2:
                bad.append(f"{b['id']}: more than two sound cues")
    # 2. every synced hit leads its word by 2-4 frames (never lags); word times equal timing.json
    hits = {}
    for act, b, e in all_events(sb):
        for key in ('leads_word', 'deadline_word'):
            lw = e.get(key)
            if not lw:
                continue
            cands = wt.get(lw['word'])
            if not cands or not any(abs(c - lw['word_t']) < 1e-6 for c in cands):
                bad.append(f"{b['id']} {e['t']}: word «{lw['word']}» at {lw['word_t']} is not in timing.json")
                continue
            lead = (lw['word_t'] - ft(e['t'])) * FPS
            if abs(lead - lw['lead_frames']) > 0.06:
                bad.append(f"{b['id']} {e['t']}: lead_frames {lw['lead_frames']} should be {lead:.2f}")
            if not (1.95 <= lead <= 4.05):
                bad.append(f"{b['id']} {e['t']}: lead of {lead:.2f} frames on «{lw['word']}» is outside 2-4")
            if key == 'leads_word':
                hits.setdefault(b['id'], []).append(lw['word'])
    for bid, ws in hits.items():
        if len(ws) > 3:
            bad.append(f"{bid}: {len(ws)} synced hits")
    # 3. glosses start exactly on their word and match timing.json
    gl = {g['text']: g for g in timing['glosses']}
    for wdw in sb['layout']['gloss_band']['windows']:
        g = gl.get(wdw['text'])
        if not g or abs(g['t'] - wdw['t0']) > 1e-6:
            bad.append(f"gloss «{wdw['text']}»: start {wdw['t0']} differs from timing.json")
    # 4. no real camera motion while a gloss is at full strength (fade-in 0.14 s, fade-out 0.30 s)
    P = Path(sb)
    for wdw in sb['layout']['gloss_band']['windows']:
        t = wdw['t0']
        while t <= wdw['t1'] - 0.30 + 1e-6:
            pan, zr = P.speed(t)
            if pan > 12 or abs(zr) > 2.6:
                bad.append(f"gloss «{wdw['text']}»: camera moves at {t:.2f} ({pan:.0f} px/s, {zr:.1f} %/s)")
                break
            t += 1 / FPS
        # the lip must stay at screen y 1200-1213 for the whole window
        t = wdw['t0']
        while t <= wdw['t1'] + 1e-6:
            lip = w2f(P.at(t), 1, 540, 1200)[1]
            if not (1199.0 <= lip <= 1213.6):
                bad.append(f"gloss «{wdw['text']}»: hedge lip at screen y {lip:.1f} at {t:.2f}")
                break
            t += 1 / FPS
    # 5. camera keys: monotonic, hand-off continuity, named framings carry correct derived numbers
    for name, c in sb['cameras'].items():
        d = derived(c)
        if c.get('derived_screen_px') != d:
            bad.append(f"camera {name}: derived_screen_px is stale")
    for act in ('act1', 'act2'):
        ks = sb['camera_path'][act]
        for a, b in zip(ks, ks[1:]):
            if b['t'] <= a['t']:
                bad.append(f"camera_path {act}: keys not increasing at {b['t']}")
    if sb['camera_path']['act1'][-1]['framing'] != sb['camera_path']['act2'][0]['framing']:
        bad.append('camera_path: acts do not meet on the same framing')
    for s in sb['camera_path'].get('samples', []):
        c = sb['cameras'][s['framing']]
        got = P.at(ft(s['t']))
        if abs(got[0] - c['cx']) > 0.3 or abs(got[1] - c['cy']) > 0.3 or abs(got[2] - c['zoom']) > 0.0006:
            bad.append(f"camera sample {s['framing']} at {s['t']}: path gives {got}, framing says {(c['cx'], c['cy'], c['zoom'])}")
    for r in sb['camera_path'].get('speed_at_words', []):
        pan, zr = P.speed(r['t'])
        if abs(pan - r['pan_px_s']) > 1.5 or abs(zr - r['zoom_pct_s']) > 0.15:
            bad.append(f"speed_at_words «{r['word']}» {r['t']}: stale ({pan:.0f} px/s, {zr:.1f} %/s)")
    # 6. picture words land on a frame that is (nearly) at rest
    for chk in sb['camera_path'].get('at_rest_for', []):
        pan, zr = P.speed(chk['word_t'])
        if pan > chk.get('max_px_s', 12):
            bad.append(f"camera not at rest for «{chk['word']}» ({chk['word_t']}): {pan:.0f} px/s")
    # 7. stencil-sharp shapes are never cut by a frame edge in a held framing
    for it in sb['layout'].get('frame_edge_checks', []):
        x0, y0, x1, y1 = it['world_bbox']
        for name in it['framings']:
            c = sb['cameras'][name]
            cam = (c['cx'], c['cy'], c['zoom'])
            a = w2f(cam, 1, x0, y0)
            b = w2f(cam, 1, x1, y1)
            inside = a[0] >= 0 and a[1] >= 0 and b[0] <= W and b[1] <= H
            outside = b[0] <= 0 or a[0] >= W or b[1] <= 0 or a[1] >= H
            if not (inside or outside):
                bad.append(f"frame edge cuts {it['what']} in {name}: screen {a[0]:.0f},{a[1]:.0f} - {b[0]:.0f},{b[1]:.0f}")
            if it.get('shorts_safe') and inside:
                if b[1] > 1651 or (b[0] > 950 and b[1] > 960):
                    bad.append(f"{it['what']} leaves the Shorts-safe area in {name}: right {b[0]:.0f}, bottom {b[1]:.0f}")
    # 8. hand-off text mirrors
    a1, a2 = sb['acts']
    if a1['handoff_out'] != a2['handoff_in'] or a1['handoff_out_state']['summary'] != a1['handoff_out']:
        bad.append('act1 -> act2 hand-off summaries differ')
    if a2['handoff_out_state'] != sb['endcard']['handoff_in']:
        bad.append('act2 hand-off state and endcard.handoff_in differ')
    if verbose:
        n_hits = sum(len(v) for v in hits.values())
        print(f"beats {sum(len(a['beats']) for a in sb['acts'])}, events {sum(1 for _ in all_events(sb))}, synced hits {n_hits} of {len(words)} words")
        print('hits per beat:', ', '.join(f"{k[:3]} {len(v)}" for k, v in hits.items()))
        for p in bad:
            print('PROBLEM', p)
        print('OK' if not bad else f'{len(bad)} problem(s)')
    return bad


def speeds(sb, timing):
    P = Path(sb)
    rows = []
    for w in timing['words']:
        pan, zr = P.speed(w['t'])
        rows.append((w['w'], w['t'], pan, zr))
    return rows


# ----------------------------------------------------------------------------- Markdown twin
def tfmt(t):
    return f"{t:05.2f}"


def element_table(L):
    """Rows of the 'world' table, built from the layout numbers so that the two files cannot drift apart."""
    g, m, su, arc = L['ground'], L['man'], L['suns'], L['sun_arc']
    mo, d, hr, co = g['mound'], L['deed'], L['hours_ring'], L['coin']
    fl, kn, ch, mq, rug, gb = L['far_horizon_light'], L['knoll'], L['chest'], L['mosque'], L['rug'], L['gloss_band']
    lb = L['light_beads']['from_glow_to_chest']
    t, y, tm = su['today'], su['yesterday'], su['tomorrow_ring']
    c = lambda p: f"({p[0]}, {p[1]})"
    cf = gb['calm_field_screen']
    return [
        ('hedge lip (ground)', f"y {g['lip_y']} (±7 px undulation)", 'fills everything below; drawn in front of the man; calm and dark in the gloss field'),
        ('the rise (mound)', f"x {mo['x0']}–{mo['x1']}, top y {mo['top_y']}", f"behind the man; carries the six flowers; LIT (x {g['lit_patch_x'][0]}–{g['lit_patch_x'][1]}, never below y {g['lit_patch_y'][1]}) from 10.07"),
        ('far ridge (horizon)', f"crest y ≈ {L['horizon']['far_ridge_crest_y']}", f"lavender-ivory hills, parallax {L['horizon']['parallax']}; painted down to layer y {L['horizon']['layer_filled_down_to_y']}"),
        ('man', f"x {m['x']}, feet y {m['foot_y']}, head top y {m['head_top_y']}", f"{m['height']} px tall; chest {c(m['chest'])}; mitten {m['hand']['w']} × {m['hand']['h']}; front view to 1.47, back view from 1.60"),
        ("today's sun", c(t['centre']), f"r {t['r']}; halo r {t['halo_r']['blaze']} blaze / {t['halo_r']['under_hours_ring']} under the dial / {t['halo_r']['receded']} receded; cobalt annulus r {t['annulus']['r_in']}–{t['annulus']['r_out']} from 12.10; hidden by the veil cloud until 8.77"),
        ('veil cloud', c(L['veil_cloud']['centre']), f"{L['veil_cloud']['w']} × {L['veil_cloud']['h']}, peach-gold rim"),
        ('sun-arc', f"feet {c(arc['left_foot'])} and {c(arc['right_foot'])}, apex {c(arc['apex'])}", f"y = 340 + 855·((x−540)/410)²; {arc['dots']['count']} deep-ochre dots r {arc['dots']['r']} every {arc['dots']['spacing_px']} px, ending outside tomorrow's ring"),
        ("yesterday's sun", f"rests at {c(y['rest_centre'])} on his left palm {c(y['left_palm'])}", f"r {y['r']}; out of his hand at {c(y['clear_of_hand_at'])}, gone at {c(y['gone_at'])}"),
        ("tomorrow's dashed ring", c(tm['centre']), f"r {tm['r']}, {tm['dashes']} ochre dashes, never filled"),
        ('mist bank', f"layer x {L['mist_bank']['layer_bbox']['x0']}–{L['mist_bank']['layer_bbox']['x1']}, y {L['mist_bank']['layer_bbox']['y0']}–{L['mist_bank']['layer_bbox']['y1']}", f"parallax {L['mist_bank']['parallax']}; ends behind the hedge lip"),
        ('deed (senet)', f"{c(d['centre'])} above his right palm {c(d['right_palm'])}", f"{d['w']} × {d['h']} ghost sheet; folded corner {d['folded_corner']}"),
        ('labels', '—', 'NONE (cut; see decisions)'),
        ('hour dial', f"centre {c(hr['centre'])}, ring r {hr['ring_r']}", f"{hr['count']} beads r {hr['bead_r']} on the cobalt annulus; clock-hand {hr['clock_hand']['length']} × {hr['clock_hand']['width']}; chosen bead at 5 o'clock {c(hr['chosen_bead']['centre'])}; stays to the end"),
        ('coin', f"palm {c(co['right_palm_receive'])}, rest {c(co['rest_on_palm'])} → side {c(co['held_at_side'])} → release {c(co['release'])} → niche {c(co['flight']['target_niche_centre'])}", f"bead r {co['bead_r_when_it_leaves_the_ring']} → coin r {co['r']} ({co['in_MEDIUM_screen']['diameter']} px across in MEDIUM, 84–91 px in ACT2); clock-hands stroke {co['clock_hands']['stroke']}"),
        ('far light (true future)', f"ACT2 screen x {fl['in_ACT2_screen']['bbox']['x0']}–{fl['in_ACT2_screen']['bbox']['x1']}, y {fl['in_ACT2_screen']['bbox']['y0']}–{fl['in_ACT2_screen']['bbox']['y1']}, core {c(fl['in_ACT2_screen']['core_centre'])}", f"soft arch-shaped cluster in a deepened sky, parallax {fl['parallax']}; white core y {fl['in_ACT2_screen']['core_y'][0]}–{fl['in_ACT2_screen']['core_y'][1]}"),
        ('knoll', f"plateau y {kn['plateau_y']}, x {kn['plateau_x'][0]}–{kn['plateau_x'][1]}", 'face slopes toward us; base in warm mist'),
        ('light-beads', f"x {lb['x']}, y {' / '.join(str(v) for v in lb['ys'])}", f"r {lb['r'][0]}–{lb['r'][-1]}; three absorbed by the chest, two by the dome"),
        ('chest', f"x {ch['body']['x0']}–{ch['body']['x1']}, base y {ch['base_y']}, knob top y {ch['knob_top_y']}", f"{ch['size'][0]} × {ch['size'][1]} wooden coffer, lid ajar ({ch['lid']['seam_gap_px']} px seam)"),
        ('mescid', f"x {mq['minaret']['x0']}–{mq['body']['x1']}, base y {mq['base_y']}, dome finial y {mq['dome_finial_top_y']}, minaret finial y {mq['minaret']['finial_top_y']}", f"{mq['size'][0]} × {mq['size'][1]}; doorway x {mq['door']['x0']}–{mq['door']['x1']}, y {mq['door']['y0']}–{mq['door']['y1']}"),
        ('prayer rug', f"top edge y {rug['top_edge']['y']} (x {rug['top_edge']['x0']}–{rug['top_edge']['x1']}), bottom edge y {rug['bottom_edge']['y']} (x {rug['bottom_edge']['x0']}–{rug['bottom_edge']['x1']})", f"niche {rug['niche']['w']} × {rug['niche']['h']}, glow centre {c(rug['niche']['centre'])}"),
        ('gloss band', f"screen y {gb['y0']}–{gb['y1']}, baseline {gb['baseline_y']}", f"calm field: screen x {cf['x0']}–{cf['x1']}, y {cf['y0']}–{cf['y1']}"),
    ]


def md(sb):
    o = []
    A = o.append
    L = sb['layout']
    A(f"# Storyboard — FINAL, revision 2 (supervising director's merge + review fixes)")
    A('')
    A(f"**Yirmi Birinci Söz, s. 291** · 1080×1920 · 30 fps · painted film 0.00–{sb['duration_2d']:.2f} s "
      f"(2D frames 0–719) · photoreal end card fades up from {sb['endcard']['plate_fade_up_from']:.2f} s, ends {sb['endcard']['t1']:.2f} s (separate team)")
    A('')
    A("Machine-readable twin: `/home/user/work/storyboard.json` (same content; this file is generated from it by "
      "`python3 tools/storyboard_tools.py md`; if they ever differ, the JSON wins). All times are video seconds on the 30 fps grid and "
      "respect `/home/user/work/timing.json`; `python3 tools/storyboard_tools.py check` verifies every lead, gloss window, camera rest and frame edge with the engine's own camera maths.")
    A('')
    A('## 1. The film in one paragraph')
    A('')
    A(sb['concept'])
    A('')
    A("### One idea per clause (Kurzgesagt's measure, not more)")
    A('')
    A('| # | words | the one picture idea |')
    A('|---|---|---|')
    for i, (bid, words, idea) in enumerate(sb['dynamism']['ideas'], 1):
        A(f"| {i} | {words} | {idea} |")
    A('')
    A(sb['dynamism']['note'])
    A('')
    A('### Visual grammar (learn it once, it explains every shot)')
    A('')
    for g in sb['visual_grammar']:
        A(f"- {g}")
    A('')
    A('## 2. The world and the frame')
    A('')
    A(f"**Coordinates.** {L['coordinate_system']}")
    A('')
    A(f"**Screen architecture.** {L['screen_architecture']}")
    A('')
    A('| element | HOME position (world px) | size / note |')
    A('|---|---|---|')
    for row in element_table(L):
        A(f"| {row[0]} | {row[1]} | {row[2]} |")
    A('')
    fl = L['flowers']
    A('Flowers on the rise (open 10.13–10.27): ' + ', '.join(f"{f['id']} ({f['centre'][0]}, {f['centre'][1]}) r {f['r']}" for f in fl['lip'])
      + '. ' + fl['note'])
    A('')
    A('**Layer stack, back to front** (parallax): ' + ' → '.join(
        f"{x['layer']}" + (f" ({x['parallax']:g})" if x['parallax'] is not None else '') for x in L['layers_back_to_front']) + '.')
    A('')
    gb = L['gloss_band']
    A('**Gloss windows** (passed to the engine by the main scene as a custom list `{text, t, end}`):')
    A('')
    A('| gloss | appears | gone by | framing |')
    A('|---|---|---|---|')
    for w in gb['windows']:
        A(f"| `{w['text']}` | {w['t0']:.2f} | {w['t1']:.2f} | {w['framing']} |")
    A('')
    A(gb['rule'])
    A('')
    A(f"Hard numbers: {gb['hard_numbers']}")
    A('')
    A('### Named framings')
    A('')
    A('| framing | cx | cy | zoom | man x / head top / feet (screen) | used for |')
    A('|---|---|---|---|---|---|')
    for name, c in sb['cameras'].items():
        d = c['derived_screen_px']
        A(f"| {name} | {c['cx']:g} | {c['cy']:g} | {c['zoom']:g} | {d['man_x']} / {d['man_head_top_y']} / {d['man_feet_and_hedge_lip_y']} | {c['use']} |")
    A('')
    cp = sb['camera_path']
    A(f"**Camera path.** {cp['moves_in_pauses']}")
    A('')
    A('| arrives at | framing | ease |')
    A('|---|---|---|')
    for act in ('act1', 'act2'):
        for i, k in enumerate(cp[act]):
            A(f"| {tfmt(k['t'])} | {k['framing']} | {k.get('ease', 'start')} |")
    A('')
    A(cp['note'])
    A('')
    A('Camera speed at the picture words (engine maths; pan in screen px/s on the subject plane, zoom in % per second):')
    A('')
    A('| word | t | pan px/s | zoom %/s | camera state |')
    A('|---|---|---|---|---|')
    for r in cp['speed_at_words']:
        A(f"| {r['word']} | {r['t']:.2f} | {r['pan_px_s']} | {r['zoom_pct_s']:+.1f} | {r['state']} |")
    A('')
    A('### Colour script')
    A('')
    for c in sb['palette']['colour_script']:
        A(f"- **{c['t']}** — {c['key']}")
    A(f"- {sb['palette']['value_rule']}")
    A('')
    A('Value contrast that must hold (WCAG ratio of the two paints; a matte sponge style has no glow, so light reads only against something darker):')
    A('')
    A('| light thing | painted against | ratio |')
    A('|---|---|---|')
    for r in sb['palette']['contrast_targets']:
        A(f"| {r['light']} | {r['against']} | {r['ratio']} : 1 |")
    A('')
    A('### Motion grammar')
    A('')
    for m in sb['motion_grammar']:
        A(f"- {m}")
    A('')
    for n, act in enumerate(sb['acts'], 3):
        A(f"## {n}. {act['id'].upper()} — {act['title']} ({tfmt(act['t0'])}–{tfmt(act['t1'])})")
        A('')
        for b in act['beats']:
            A(f"### {tfmt(b['t0'])}–{tfmt(b['t1'])} · {b['words']}")
            A('')
            A(f"**Idea:** {b['idea'].strip('()')}")
            A('')
            A(f"**Picture.** {b['picture']}")
            A('')
            A(f"**Camera.** {b['camera']}")
            A('')
            A(f"**Gloss band.** {b['gloss_band_content']}")
            A('')
            A('| t | event |')
            A('|---|---|')
            for e in b['events']:
                tail = ''
                if e.get('leads_word'):
                    lw = e['leads_word']
                    tail = f" — *leads «{lw['word']}» ({lw['word_t']:.2f}) by {lw['lead_frames']} fr*"
                if e.get('deadline_word'):
                    lw = e['deadline_word']
                    tail = f" — *reached {lw['lead_frames']} fr before «{lw['word']}» ({lw['word_t']:.2f}); part of the same motion, not a new hit*"
                A(f"| {tfmt(e['t'])} | {e['what']}{tail} |")
            A('')
            if b.get('sfx'):
                A('**SFX.** ' + ' · '.join(f"{tfmt(s['t'])} `{s['sound']}` ({s['gain_db']:+d} dB) — {s['note']}" for s in b['sfx']))
            else:
                A('**SFX.** none (voice only).')
            A('')
        st = act['handoff_out_state']
        if act['id'] == 'act1':
            A(f"### HAND-OFF act 1 → act 2 at {st['t']:.2f} (both teams must be able to render this exact frame)")
        else:
            A(f"### HAND-OFF act 2 → end card at {st['t']:.2f}")
        A('')
        c = st['camera']
        A(f"- **Camera:** {c['framing']} (cx {c['cx']:g}, cy {c['cy']:g}, zoom {c['zoom']:g}); {c['velocity']}; plus the shared drift.")
        m = st['man']
        extra = ''
        if 'screen_at_ACT2_END' in m:
            s = m['screen_at_ACT2_END']
            extra = f" Screen at ACT2_END: x {s['x']}, head top y {s['head_top_y']}, feet y {s['feet_y']}."
        A(f"- **Man:** pose `{m['pose']}`, {m['view']} view, world x {m['x']}, feet y {m['foot_y']}; {m['detail']}.{extra}")
        A('- **Visible:**')
        for v in st['visible']:
            A(f"  - {v}")
        A('- **Not visible:** ' + '; '.join(st['not_visible']) + '.')
        if act['id'] == 'act1':
            A(f"- **Frames:** {st['frames']}")
            sm = sb['shared_motion']
            A('- **Shared life** (pure functions of absolute time, built once in `video/src/shared/`): '
              + '; '.join(f"{k.replace('_', ' ')}: {v}" for k, v in sm.items() if k != 'rule') + '.')
        else:
            ec = sb['endcard']
            cv = ec['cover']
            A(f"- **The cover (2D, owner: {cv['owner']}).** {cv['what']} Layer: {cv['layer']}. Frames {cv['frames'][0]}–{cv['frames'][1]}. "
              f"Origin: screen [{cv['origin_screen'][0]}, {cv['origin_screen'][1]}]. Stepped passes / coverage: "
              + ', '.join(f"{t:.2f} → {p} %" for t, p in zip(cv['passes'], cv['coverage_pct']))
              + f". Order: {cv['order']}. Colour: {cv['colour']}.")
            A(f"- **End state of the 2D film.** {cv['end_state']} Deliverable: {cv['deliverable']}.")
            A(f"- **Then (end-card team).** {cv['then']}.")
            A(f"- **Requirement on act 2.** {ec['requirement_on_act2']}")
            A('- **SFX across the hand-off.** ' + ' · '.join(f"{s['t']:.2f} `{s['sound']}` — {s['note']}" for s in ec['sfx']) + '.')
        A('')
    A('## 5. Assets and the shared world')
    A('')
    T = sb['teams']
    A(T['rule'])
    A('')
    A(f"**Owner of `video/src/shared/`:** {T['shared_owner']}")
    A('')
    A(f"**Interface:** {T['shared_interface']}")
    A('')
    A('**State timeline of every shared asset, 0–24 s** (the shared module implements exactly this; neither act hard-codes a state):')
    A('')
    A('| shared asset | timeline |')
    A('|---|---|')
    for r in T['shared_state_timeline']:
        A(f"| `{r['asset']}` | {r['timeline']} |")
    A('')
    A('| asset | used in | design note |')
    A('|---|---|---|')
    for a in sb['assets']:
        A(f"| `{a['id']}` | {a['used_in']} | {a['note']} |")
    A('')
    A('## 6. Man poses')
    A('')
    A(L['man']['rig_note'])
    A('')
    A('| pose | note |')
    A('|---|---|')
    for p in sb['man_poses']:
        A(f"| `{p['id']}` | {p['note']} |")
    A('')
    A("## 7. Director's notes")
    A('')
    A('### Tone')
    A('')
    for t in sb['director_notes']['tone']:
        A(f"- {t}")
    A('')
    A('### What must never happen')
    A('')
    for t in sb['director_notes']['never']:
        A(f"- {t}")
    A('')
    A('### What was decided, and why')
    A('')
    A('| question | decision | taken from | why |')
    A('|---|---|---|---|')
    for m in sb['merge_decisions']:
        A(f"| {m['topic']} | {m['decision']} | {m['taken_from']} | {m['why']} |")
    A('')
    A('### Risks to check in previews (with fallbacks)')
    A('')
    for r in sb['risks_and_fallbacks']:
        A(f"- **{r['risk']}** {r['guard']}")
    A('')
    A('### Sound')
    A('')
    A(sb['sfx_policy'])
    A('')
    A('## 8. Revision 2 — what changed (for anyone who read revision 1)')
    A('')
    for r in sb['revision_log']:
        A(f"- {r}")
    A('')
    return '\n'.join(o)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    sb = json.load(open(SB_JSON, encoding='utf-8'))
    timing = json.load(open(TIMING, encoding='utf-8'))
    if cmd == 'check':
        sys.exit(1 if check(sb, timing) else 0)
    elif cmd == 'md':
        open(SB_MD, 'w', encoding='utf-8').write(md(sb))
        print('wrote', SB_MD)
    elif cmd == 'speeds':
        P = Path(sb)
        for w, t, pan, zr in speeds(sb, timing):
            print(f"{w:12s} {t:6.3f}  pan {pan:6.1f} px/s  zoom {zr:+6.2f} %/s  done {P.progress(t) * 100:5.1f} %")
