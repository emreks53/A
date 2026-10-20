"""Overlay timeline resolver + renderer front-end.

    python video/comp/overlays.py --resolve                    # resolve overlays.json -> timeline.json, print summary
    python video/comp/overlays.py --render [--from F --to T] [--scale 0.5] [--pages 2]
    python video/comp/overlays.py --render --frames 200,212,1598

overlays.json (human-edited) is resolved into a per-frame timeline: word references become exact word times from
timing/shots.json, tracker JSON (comp/tracks/<shot>.json, export_tracks() format) becomes smoothed screen paths with
a soft visibility, callout labels get a side chosen to stay in the safe area and clear of key words.
The timeline is drawn by overlay/overlay.js in headless Chromium (render_overlays.mjs).

Output (large media, outside the repo): $VIDEO_OUT/overlays/s<scale>/
    over/ov_<f>.png  straight-alpha graphics      add/ad_<f>.png  additive light layer (both cropped to content)
    manifest.json    {"hash":..., "frames": {"<f>": [over_xywh|0, add_xywh|0, boxes]}}  (empty frames: 0/0)
A frame is re-rendered when the resolved timeline, the renderer code or the scale changes (hash).
"""
import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.dirname(HERE)
SCRATCH = "/tmp/claude-0/-home-user-A/b5ebf800-90e1-5468-8561-ac6e2d70f44f/scratchpad"
OUT = os.environ.get("VIDEO_OUT") or os.path.join(VIDEO, ".out")
ASSETS = os.environ.get("VIDEO_ASSETS") or os.path.join(VIDEO, ".assets")
FPS, W, H = 24, 1080, 1920
NODE = os.environ.get("NODE", "node")
CORMORANT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf"
INTER_DIR = "/usr/share/fonts/opentype/inter"


# ----------------------------------------------------------------------------------------------- basics
def load_json(p):
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)


def shots_table():
    return load_json(os.path.join(VIDEO, "timing", "shots.json"))


def font_cormorant():
    d = os.path.join(ASSETS, "fonts"); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, "CormorantGaramond-VF.ttf")
    if not os.path.exists(p) or os.path.getsize(p) < 100000:
        subprocess.run(["curl", "-sSL", "--retry", "3", "-o", p + ".part", CORMORANT_URL], check=True)
        os.replace(p + ".part", p)
    return p


_FT = {}


def text_width(text, path, size, tracking_em):
    """Approximate advance width (no kerning) for layout decisions in Python."""
    from fontTools.ttLib import TTFont
    if path not in _FT:
        f = TTFont(path, lazy=True)
        _FT[path] = (f.getBestCmap(), f["hmtx"].metrics, f["head"].unitsPerEm)
    cmap, hmtx, upm = _FT[path]
    w = 0.0
    for ch in text:
        g = cmap.get(ord(ch))
        w += (hmtx[g][0] if g in hmtx else upm * 0.6) / upm * size
    return w + tracking_em * size * max(0, len(text) - 1)


def tr_upper(s):
    return s.replace("i", "İ").replace("ı", "I").upper()


# ----------------------------------------------------------------------------------------------- times
class Clock:
    def __init__(self, shots, lead):
        self.shots = {s["id"]: s for s in shots["shots"]}
        self.lead = lead

    def word(self, shot, word, nth=0):
        ws = self.shots[shot]["words"]
        hits = [w for w in ws if w["w"] == word] or [w for w in ws if w["w"].casefold() == word.casefold()]
        if len(hits) <= nth:
            raise KeyError(f"word '{word}' (#{nth}) not in {shot}: {[w['w'] for w in ws]}")
        return hits[nth]

    def t(self, spec, shot):
        if spec is None:
            return None
        if isinstance(spec, (int, float)):
            return float(spec)
        w = self.word(spec.get("shot", shot), spec["word"], spec.get("nth", 0))
        return round(w["s"] - spec.get("lead", self.lead) + spec.get("plus", 0.0), 4)


# ----------------------------------------------------------------------------------------------- tracks
_TRACKS = {}


def track_file(shot):
    if shot not in _TRACKS:
        p = os.path.join(HERE, "tracks", f"{shot}.json")
        _TRACKS[shot] = load_json(p) if os.path.exists(p) else None
    return _TRACKS[shot]


def _gauss(a, sigma):
    if sigma <= 0 or len(a) < 3:
        return np.asarray(a, float)
    from scipy.ndimage import gaussian_filter1d
    return gaussian_filter1d(np.asarray(a, float), sigma, mode="nearest")


def _fallback_xy(fb, t):
    if fb is None:
        return np.full_like(t, W / 2), np.full_like(t, H / 2)
    if isinstance(fb[0], (int, float)):
        return np.full_like(t, fb[0]), np.full_like(t, fb[1])
    ks = sorted(fb)
    tk = np.array([k[0] for k in ks]); xk = np.array([k[1] for k in ks]); yk = np.array([k[2] for k in ks])
    i = np.clip(np.searchsorted(tk, t) - 1, 0, len(tk) - 2) if len(tk) > 1 else np.zeros_like(t, int)
    if len(tk) == 1:
        return np.full_like(t, xk[0]), np.full_like(t, yk[0])
    u = np.clip((t - tk[i]) / (tk[i + 1] - tk[i]), 0, 1)
    u = u * u * (3 - 2 * u)
    return xk[i] + (xk[i + 1] - xk[i]) * u, yk[i] + (yk[i + 1] - yk[i]) * u


def make_track(shot, name, fallback, f_lo, f_hi, warn, sig_fine=0.6, sig_label=6.0, keep_depth=False):
    """Per-frame screen path for frames [f_lo, f_hi): exact (lightly smoothed) x,y; heavily smoothed xs,ys for
    labels; soft visibility v (0 when behind the camera / outside the frame, eased at the edges)."""
    frames = np.arange(f_lo, f_hi)
    t = frames / FPS
    d = track_file(shot)
    src = "fallback"
    x = y = dep = vis = None
    if d is not None:
        fr = d.get("frames", {})
        rows = [fr.get(str(f), {}).get(name) for f in frames]
        if any(r is not None for r in rows):
            src = "track"
            have = np.array([r is not None for r in rows])
            arr = np.array([r if r is not None else [np.nan, np.nan, -1, 0] for r in rows], float)
            x, y, dep, vis = arr[:, 0], arr[:, 1], arr[:, 2], arr[:, 3]
            valid = have & (dep > 0) & (np.abs(x) < 3e4) & (np.abs(y) < 3e4)
            if not valid.any():
                warn(f"{shot}/TRK_{name}: never in front of the camera in frames {f_lo}-{f_hi - 1}")
                valid[:] = False
            if valid.any():
                idx = np.where(valid)[0]
                x = np.interp(np.arange(len(x)), idx, x[idx]); y = np.interp(np.arange(len(y)), idx, y[idx])
                dep = np.interp(np.arange(len(dep)), idx, dep[idx])
            else:
                fx, fy = _fallback_xy(fallback, t); x, y, dep = fx, fy, np.ones_like(fx)
            m = 80.0
            inside = np.clip(np.minimum.reduce([x + 30, W + 30 - x, y + 30, H + 30 - y]) / m, 0, 1)
            vis = np.where(valid, inside, 0.0)
        else:
            warn(f"{shot}: tracker TRK_{name} missing in tracks/{shot}.json -> fallback")
    elif fallback is not None:
        warn(f"{shot}: no tracks/{shot}.json -> fallback position for TRK_{name}")
    if x is None:
        x, y = _fallback_xy(fallback, t)
        dep = np.ones_like(x); vis = np.ones_like(x)
    xf, yf = _gauss(x, sig_fine), _gauss(y, sig_fine)
    xs, ys = _gauss(x, sig_label), _gauss(y, sig_label)
    v = np.clip(_gauss(vis, 2.0), 0, 1)
    v = np.where(v < 0.01, 0, v)
    out = {"f0": int(f_lo), "x": np.round(xf, 1).tolist(), "y": np.round(yf, 1).tolist(),
           "xs": np.round(xs, 1).tolist(), "ys": np.round(ys, 1).tolist(), "v": np.round(v, 3).tolist(), "src": src}
    if keep_depth:
        out["d"] = np.round(_gauss(dep, 1.0), 4).tolist()
    return out


# ----------------------------------------------------------------------------------------------- resolve
def resolve(spec_path=None, verbose=True):
    spec = load_json(spec_path or os.path.join(HERE, "overlays.json"))
    shots = shots_table()
    clk = Clock(shots, spec.get("lead", 0.06))
    sh = {s["id"]: s for s in shots["shots"]}
    styles = spec["styles"]
    warnings = []
    warn = warnings.append
    els = []
    cs = styles["callout"]
    inter_med = os.path.join(INTER_DIR, "Inter-Medium.otf")
    inter_reg = os.path.join(INTER_DIR, "Inter-Regular.otf")
    sync_points = []

    def rng_of(shot):
        s = sh[shot]
        return s["render_f0"], s["render_f1"]

    # ---------------- keywords
    kw_boxes = []   # (t0, t1, x0, y0, x1, y1) for callout placement
    for k in spec["keywords"]:
        st = styles[k["style"]]
        lines = []
        tmin = 1e9
        for ln in k["lines"]:
            parts = []
            for p in ln:
                tp = clk.t(p["at"], k["shot"])
                tmin = min(tmin, tp)
                d = {"text": tr_upper(p["text"]), "t": tp}
                if "sep" in p:
                    d["sep"] = p["sep"]
                parts.append(d)
            lines.append({"parts": parts})
        el = {"id": k["id"], "type": "keyword", "style": k["style"], "shot": k["shot"], "lines": lines,
              "y": k.get("y", 670)}
        for opt in ("size", "line_height", "max_width", "tracking"):
            if opt in k:
                el[opt] = k[opt]
        if "swell" in k:
            el["swell"] = {"t": clk.t(k["swell"]["at"], k["shot"]), "gain": k["swell"].get("gain", 0.8),
                           "dur": k["swell"].get("dur", 1.0)}
        if "dust" in st:
            tlast = max(p["t"] for l in lines for p in l["parts"])
            t_end = tlast + st["dust"]["delay"] + st["dust"]["dur"] + st["dust"]["life"][1] + 0.15
            el["out"] = None
        else:
            el["out"] = float(k["out"])
            t_end = el["out"]
        el["f0"] = int(math.floor(tmin * FPS)) - 1
        el["f1"] = int(math.ceil(t_end * FPS)) + 2
        els.append(el)
        size = k.get("size", st["size"])
        hgt = len(lines) * size * k.get("line_height", st["line_height"])
        kw_boxes.append((tmin, t_end, 90, el["y"] - hgt / 2 - 10, 990, el["y"] + hgt / 2 + 10))
        for l in lines:
            for p in l["parts"]:
                sync_points.append({"id": f"{k['id']}.{p['text']}", "t": round(p["t"] + clk.lead, 3), "kind": "keyword"})

    # ---------------- callouts (+ counter use the same placement)
    placed = []   # (frames array, boxes array) of placed labels

    def place(cid, shot, trk, t_on, t_off, wlab, has_sec, prefer):
        L = cs["leader"] * 0.7071
        shelf = wlab + 2 * cs["pad"]
        h_above = cs["text_gap"] + cs["primary"]["size"] * 0.73 + 6
        h_below = (cs["text_gap"] + cs["secondary"]["size"] * 0.73 + 10) if has_sec else 6
        f_a, f_b = int(t_on * FPS), int(t_off * FPS)
        i0, i1 = f_a - trk["f0"], f_b - trk["f0"]
        xs = np.array(trk["xs"][max(0, i0):max(1, i1)]); ys = np.array(trk["ys"][max(0, i0):max(1, i1)])
        vv = np.array(trk["v"][max(0, i0):max(1, i1)])
        fr = np.arange(len(xs)) + f_a
        sf = spec["safe"]
        best = None
        for cand in ["ur", "ul", "dr", "dl"]:
            sx = 1 if cand[1] == "r" else -1
            sy = -1 if cand[0] == "u" else 1
            ex, ey = xs + sx * L, ys + sy * L
            bx0 = np.where(sx > 0, ex, ex - shelf); bx1 = bx0 + shelf
            by0, by1 = ey - h_above, ey + h_below
            over = (np.clip(sf["x0"] - bx0, 0, None) + np.clip(bx1 - sf["x1"], 0, None) +
                    np.clip(sf["y0"] - by0, 0, None) + np.clip(by1 - sf["y1"], 0, None))
            pen = 2.5 * float(np.mean(over * vv)) if len(over) else 0
            tt = fr / FPS
            for (k0, k1, kx0, ky0, kx1, ky1) in kw_boxes:
                act = (tt >= k0) & (tt <= k1)
                if act.any():
                    ox = np.clip(np.minimum(bx1, kx1) - np.maximum(bx0, kx0), 0, None)
                    oy = np.clip(np.minimum(by1, ky1) - np.maximum(by0, ky0), 0, None)
                    pen += float(np.mean(ox * oy * act * vv)) / 60.0
            for (pf, pb) in placed:
                common, ia, ib = np.intersect1d(fr, pf, return_indices=True)
                if len(common):
                    ox = np.clip(np.minimum(bx1[ia], pb[ib, 2]) - np.maximum(bx0[ia], pb[ib, 0]), 0, None)
                    oy = np.clip(np.minimum(by1[ia], pb[ib, 3]) - np.maximum(by0[ia], pb[ib, 1]), 0, None)
                    pen += float(np.sum(ox * oy)) / max(1, len(fr)) / 40.0
            # leader / ring must not sit under another label either
            pen += (prefer.index(cand) * 25 if cand in prefer else 60) if prefer else 0
            toward = np.sign(W / 2 - np.mean(xs)) if len(xs) else 1
            pen += 0 if sx == toward else 18
            pen += 0 if sy < 0 else 6
            if best is None or pen < best[0]:
                best = (pen, cand, sx, sy, np.stack([bx0, by0, bx1, by1], 1))
        placed.append((fr, best[4]))
        if best[0] > 400:
            warn(f"{cid}: label placement is cramped (penalty {best[0]:.0f})")
        return best[1], best[2], best[3]

    for c in spec["callouts"]:
        f_lo, f_hi = rng_of(c["shot"])
        trk = make_track(c["shot"], c["track"], c.get("fallback"), f_lo, f_hi, warn)
        ts, to = float(c["sync"]), float(c["out"])
        wl = max(text_width(c["primary"], inter_med, cs["primary"]["size"], cs["primary"]["tracking"]),
                 text_width(c.get("secondary", ""), inter_reg, cs["secondary"]["size"], cs["secondary"]["tracking"]))
        cand, sx, sy = place(c["id"], c["shot"], trk, ts, to, wl, bool(c.get("secondary")), c.get("prefer", []))
        i0, i1 = int(ts * FPS) - f_lo, int(to * FPS) - f_lo
        vmean = float(np.mean(trk["v"][max(0, i0):max(1, i1)])) if i1 > i0 else 0
        if vmean < 0.6:
            warn(f"{c['id']}: TRK_{c['track']} visible only {vmean:.0%} of the callout's life")
        el = {"id": c["id"], "type": "callout", "shot": c["shot"], "primary": c["primary"],
              "secondary": c.get("secondary"), "sync": ts, "out": to, "sx": sx, "sy": sy, "side": cand,
              "trk": trk, "f0": int(math.floor((ts - 0.15) * FPS)), "f1": int(math.ceil(to * FPS)) + 1}
        if "leader" in c:
            el["leader"] = c["leader"]
        els.append(el)
        sync_points.append({"id": c.get("cue", c["id"]), "t": ts, "kind": "callout"})

    # ---------------- widgets
    for wd in spec["widgets"]:
        ty = wd["type"]
        shot = wd["shot"]
        f_lo, f_hi = rng_of(shot)
        if ty == "ecg":
            el = {k: wd[k] for k in ("id", "primary", "secondary", "x", "y", "width", "height", "beat_anchor",
                                      "period", "sweep_s")}
            el.update(type="ecg", shot=shot, sync=float(wd["sync"]), out=float(wd["out"]),
                      f0=int(math.floor(wd["sync"] * FPS)) - 1, f1=int(math.ceil(wd["out"] * FPS)) + 1)
            els.append(el)
            sync_points.append({"id": wd.get("cue", wd["id"]), "t": wd["sync"], "kind": "widget"})
            beats = [round(wd["beat_anchor"] + k * wd["period"], 3) for k in range(-3, 8)
                     if wd["sync"] - 0.1 <= wd["beat_anchor"] + k * wd["period"] <= wd["out"]]
            sync_points.append({"id": wd["id"] + ".R_peaks", "t": beats, "kind": "ecg"})
        elif ty == "counter":
            trk = make_track(shot, wd["track"], wd.get("fallback"), f_lo, f_hi, warn)
            wl = max(text_width("37.000.000.000.000", inter_med, cs["primary"]["size"], cs["primary"]["tracking"]),
                     text_width(wd["unit"], inter_reg, cs["secondary"]["size"], 0))
            t0, land, out = clk.t(wd["t0"], shot), float(wd["land"]), float(wd["out"])
            cand, sx, sy = place(wd["id"], shot, trk, t0, out, wl, True, wd.get("prefer", []))
            els.append({"id": wd["id"], "type": "counter", "shot": shot, "t0": t0, "land": land, "out": out,
                        "count_from": wd["count_from"], "count_to": wd["count_to"], "final": wd["final"],
                        "unit": wd["unit"], "sx": sx, "sy": sy, "side": cand, "trk": trk,
                        "f0": int(math.floor((t0 - 0.15) * FPS)), "f1": int(math.ceil(out * FPS)) + 1})
            sync_points.append({"id": wd.get("cue", wd["id"]), "t": land, "kind": "counter_land"})
        elif ty == "network":
            names = [n["track"] for n in wd["nodes"]]
            d0, d1 = clk.t(wd["draw"]["t0"], shot), clk.t(wd["draw"]["t1"], shot)
            seg = wd["draw"]["seg_dur"]
            ne = len(names) - 1
            step = (d1 - d0 - seg) / max(1, ne - 1)
            edges = [{"a": names[k], "b": names[k + 1], "t0": round(d0 + k * step, 3),
                      "t1": round(d0 + k * step + seg, 3)} for k in range(ne)]
            edges[0]["collapse"] = True
            out = float(wd["out"])
            nodes = []
            for i, n in enumerate(wd["nodes"]):
                t_on = d0 if i == 0 else edges[i - 1]["t1"]
                nodes.append({"name": n["track"], "label": n.get("label"), "t_on": round(t_on, 3),
                              "trk": make_track(shot, n["track"], n.get("fallback"), f_lo, f_hi, warn)})
                sync_points.append({"id": f"sh12.link_{n['track']}", "t": round(t_on, 3), "kind": "network_node"})
            conv = wd["converge"]
            c0 = clk.t(conv["t0"], shot)
            light_t = clk.t(wd["light"]["at"], shot)
            els.append({"id": wd["id"], "type": "network", "shot": shot, "nodes": nodes, "edges": edges,
                        "center": names[0], "extra": names[-1], "labels": wd.get("labels", True),
                        "converge": {"t0": c0, "dur": conv["dur"], "stagger": conv["stagger"]},
                        "light_t": light_t, "out": out,
                        "f0": int(math.floor((d0 - 0.1) * FPS)), "f1": int(math.ceil(out * FPS)) + 1})
            sync_points.append({"id": "sh12.converge", "t": c0, "kind": "network"})
            sync_points.append({"id": "sh12.one_light", "t": light_t, "kind": "network"})
        elif ty == "rings":
            rings = []
            for i, r in enumerate(wd["rings"]):
                land = float(r["land"]) if not isinstance(r["land"], dict) else clk.t(r["land"], shot)
                ro = float(wd["out"]) if r.get("final") else min(float(wd["out"]), land + wd["hold"])
                rings.append({"land": land, "out": ro, "final": bool(r.get("final")),
                              "trk": make_track(shot, r["track"], r.get("fallback"), f_lo, f_hi, warn)})
                sync_points.append({"id": f"sh13b.ring_{r['track']}", "t": land, "kind": "ring"})
            els.append({"id": wd["id"], "type": "rings", "shot": shot, "rings": rings, "radius": wd["radius"],
                        "f0": int(math.floor((rings[0]["land"] - 0.25) * FPS)),
                        "f1": int(math.ceil(max(r["out"] for r in rings) * FPS)) + 1})
        elif ty == "spiral":
            trk = make_track(shot, wd["track"], wd.get("fallback"), f_lo, f_hi, warn, sig_fine=0.8, keep_depth=True)
            t0 = clk.t(wd["t0"], shot)
            el = {"id": wd["id"], "type": "spiral", "shot": shot, "trk": trk, "families": wd["families"],
                  "n_max": wd["n_max"], "k_px_m": wd["k_px_m"], "rot_deg": wd.get("rot_deg", 0.0),
                  "t0": t0, "t_mid": float(wd["t_mid"]), "fade0": float(wd["fade0"]), "out": float(wd["out"]),
                  "numbers": wd.get("numbers", True),
                  "f0": int(math.floor((t0 - 0.1) * FPS)), "f1": int(math.ceil(float(wd["out"]) * FPS)) + 1}
            pj = os.path.join(HERE, "tracks", f"{shot}_disc.json")
            if os.path.exists(pj):
                pd = load_json(pj)
                fr = sorted(int(k) for k in pd["frames"])
                el["proj"] = {"f0": fr[0], "m": [pd["frames"][str(f)] for f in range(fr[0], fr[-1] + 1)],
                              "c": pd["c"], "R": pd["R"], "dome": pd.get("dome", 0.0)}
            else:
                warn(f"{shot}: no tracks/{shot}_disc.json -> spiral uses TRK_{wd['track']} + depth scale (approximate phase)")
            els.append(el)
            sync_points.append({"id": "sh14a.spiral", "t": t0, "kind": "spiral"})
        else:
            raise ValueError(f"unknown widget type {ty}")

    faces = [["Cormorant Garamond", "file://" + font_cormorant(), "300 700"]]
    tl = {"W": W, "H": H, "fps": FPS, "safe": spec["safe"], "styles": styles, "fonts": {"faces": faces},
          "elements": els, "sync_points": sorted(sync_points, key=lambda s: s["t"] if isinstance(s["t"], float) else s["t"][0])}
    if verbose:
        for w in warnings:
            print("[overlays] note:", w, file=sys.stderr)
    tl["warnings"] = warnings
    return tl


def timeline_hash(tl, scale):
    h = hashlib.sha1()
    h.update(json.dumps({k: v for k, v in tl.items() if k != "warnings"}, sort_keys=True).encode())
    for p in ("overlay/overlay.js", "overlay/overlay.html", "render_overlays.mjs"):
        h.update(open(os.path.join(HERE, p), "rb").read())
    h.update(str(scale).encode())
    return h.hexdigest()[:16]


def out_dir(scale):
    return os.path.join(OUT, "overlays", f"s{scale:g}")


def active_frames(tl, f_from, f_to):
    fs = set()
    for e in tl["elements"]:
        fs.update(range(max(f_from, e["f0"]), min(f_to + 1, e["f1"])))
    return sorted(fs)


def _ranges(frames):
    out, a = [], None
    for f in frames:
        if a is None:
            a = b = f
        elif f == b + 1:
            b = f
        else:
            out.append(f"{a}-{b}"); a = b = f
    if a is not None:
        out.append(f"{a}-{b}")
    return out


def ensure(f_from, f_to, scale=1.0, pages=2, frames=None, tl=None, quiet=False):
    """Make sure overlay frames for [f_from, f_to] (or the explicit list) exist for the current timeline.
    Returns the manifest {"hash", "dir", "frames": {f: [over, add, boxes]}}."""
    tl = tl or resolve(verbose=not quiet)
    hsh = timeline_hash(tl, scale)
    d = out_dir(scale)
    os.makedirs(d, exist_ok=True)
    mp = os.path.join(d, "manifest.json")
    man = load_json(mp) if os.path.exists(mp) else None
    if not man or man.get("hash") != hsh:
        man = {"hash": hsh, "scale": scale, "frames": {}}
        for sub in ("over", "add"):
            sd = os.path.join(d, sub)
            if os.path.isdir(sd):
                for fn in os.listdir(sd):
                    os.remove(os.path.join(sd, fn))
    want = sorted(set(frames)) if frames is not None else active_frames(tl, f_from, f_to)
    want = [f for f in want if any(e["f0"] <= f < e["f1"] for e in tl["elements"])]
    todo = [f for f in want if str(f) not in man["frames"]]
    if todo:
        tp = os.path.join(d, "timeline.json")
        with open(tp, "w", encoding="utf-8") as fh:
            json.dump(tl, fh, ensure_ascii=False)
        logp = os.path.join(d, "log.jsonl")
        if os.path.exists(logp):
            os.remove(logp)
        t0 = time.time()
        cmd = [NODE, os.path.join(HERE, "render_overlays.mjs"), "--timeline", tp, "--out", d, "--scale", str(scale),
               "--pages", str(pages), "--frames", ",".join(_ranges(todo))]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            print(r.stderr, file=sys.stderr)
            raise RuntimeError("render_overlays.mjs failed")
        if not quiet:
            print(r.stderr.strip(), file=sys.stderr)
        with open(logp) as fh:
            for line in fh:
                j = json.loads(line)
                man["frames"][str(j["f"])] = [j["over"], j["add"], j["boxes"]]
        os.remove(logp)
        with open(mp, "w") as fh:
            json.dump(man, fh)
        if not quiet:
            print(f"[overlays] rendered {len(todo)} frames in {time.time() - t0:.1f}s "
                  f"({(time.time() - t0) / max(1, len(todo)):.3f} s/frame) -> {d}", file=sys.stderr)
    man["dir"] = d
    return man


def frame_paths(man, f):
    """-> (over_png, over_xywh, add_png, add_xywh, boxes); PNGs are cropped to their content box."""
    e = man["frames"].get(str(f))
    if not e:
        return None, None, None, None, []
    d = man["dir"]
    over = os.path.join(d, "over", f"ov_{f:05d}.png") if e[0] else None
    add = os.path.join(d, "add", f"ad_{f:05d}.png") if e[1] else None
    return over, (e[0] or None), add, (e[1] or None), e[2]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--resolve", action="store_true")
    ap.add_argument("--render", action="store_true")
    ap.add_argument("--from", dest="ffrom", type=int, default=0)
    ap.add_argument("--to", dest="fto", type=int, default=3011)
    ap.add_argument("--frames", default=None, help="comma list of frames (overrides --from/--to)")
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--pages", type=int, default=2)
    a = ap.parse_args()
    tl = resolve()
    if a.resolve:
        os.makedirs(out_dir(a.scale), exist_ok=True)
        p = os.path.join(out_dir(a.scale), "timeline.json")
        with open(p, "w", encoding="utf-8") as fh:
            json.dump(tl, fh, ensure_ascii=False, indent=None)
        for e in tl["elements"]:
            extra = ""
            if e["type"] == "keyword":
                extra = " | ".join(" · ".join(f"{p['text']}@{p['t']:.2f}" for p in l["parts"]) for l in e["lines"])
                extra += f"  out={e['out']}"
            elif e["type"] in ("callout", "counter"):
                extra = f"{e.get('primary') or e.get('final')} side={e['side']} track={e['trk']['src']}"
            print(f"{e['id']:16s} {e['type']:8s} f{e['f0']:5d}-{e['f1']:5d}  {extra}")
        sp = os.path.join(HERE, "sync_points.json")
        with open(sp, "w", encoding="utf-8") as fh:
            json.dump({"doc": "Moments where overlay graphics land (absolute s). Generated by comp/overlays.py --resolve; "
                              "the sound mix's UI ticks (audio/cues.json, ids sh*.callout_* / link_* / ring_*) should match.",
                       "points": tl["sync_points"]}, fh, ensure_ascii=False, indent=1)
        print("->", p, "and", sp)
    if a.render:
        frames = [int(x) for x in a.frames.split(",")] if a.frames else None
        ensure(a.ffrom, a.fto, a.scale, a.pages, frames=frames, tl=tl)


if __name__ == "__main__":
    main()
