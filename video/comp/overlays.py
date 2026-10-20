"""Overlay timeline resolver + renderer front-end.

    python video/comp/overlays.py --resolve                    # resolve overlays.json -> timeline.json, print summary
    python video/comp/overlays.py --render [--from F --to T] [--scale 0.5] [--pages 2]
    python video/comp/overlays.py --render --frames 200,212,1598

overlays.json (human-edited) is resolved into a per-frame timeline: word references become exact word times from
timing/shots.json, tracker JSON (comp/tracks/<shot>.json, export_tracks() format) becomes smoothed screen paths with
a soft visibility, callout labels get a side chosen to stay in the safe area and clear of key words.
The timeline is drawn by overlay/overlay.js in headless Chromium (render_overlays.mjs).

Output (large media, outside the repo): $VIDEO_OUT/overlays/s<scale>/<hash>/
    over/ov_<f>.png  straight-alpha graphics      add/ad_<f>.png  additive light layer (both cropped to content)
    manifest.json    {"hash":..., "frames": {"<f>": [over_xywh|0, add_xywh|0, boxes]}}  (empty frames: 0/0)
One directory per content hash (resolved timeline + renderer code + font files + scale): a run never sees frames of
another timeline, and an edit made while a long final is running cannot strip graphics from it (old hash
directories are pruned only when no live process holds them and they are older than 6 h).
"""
import argparse
import atexit
import hashlib
import json
import math
import os
import shutil
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
# pinned: google/fonts commit 47d54ca1 (main on 2026-10-20); the file is verified by its SHA-256
CORMORANT_URL = ("https://raw.githubusercontent.com/google/fonts/47d54ca1ebb14fd864695f1d39dc734f39017c33/"
                 "ofl/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf")
CORMORANT_SHA256 = "b20b7d9626dd956b2c5e558692ad328b1f19e3275e2782db4fa07670d83f35e0"
INTER_DIR = "/usr/share/fonts/opentype/inter"
# Cormorant defaults to old-style figures and lower-case punctuation; canvas 2D cannot switch OpenType features,
# so lining figures (lnum) and the caps forms of a few punctuation marks (case) are frozen into the cmap.
FREEZE_CASE = ["hyphen", "endash", "emdash", "periodcentered", "parenleft", "parenright", "slash"]


# ----------------------------------------------------------------------------------------------- basics
def load_json(p):
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)


def shots_table():
    return load_json(os.path.join(VIDEO, "timing", "shots.json"))


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as fh:
        for b in iter(lambda: fh.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def _freeze_features(src, dst):
    """Copy of the variable font whose cmap maps 0-9 to the lining figures (lnum) and a few punctuation marks to
    their caps forms (case), so plain canvas text gets them."""
    from fontTools.ttLib import TTFont
    f = TTFont(src)
    gs = f["GSUB"].table
    sub = {}
    for tag, want in (("lnum", None), ("case", set(FREEZE_CASE))):
        for fr in gs.FeatureList.FeatureRecord:
            if fr.FeatureTag != tag:
                continue
            for li in fr.Feature.LookupListIndex:
                lk = gs.LookupList.Lookup[li]
                for st in lk.SubTable:
                    st = getattr(st, "ExtSubTable", st)
                    for a, b in (getattr(st, "mapping", None) or {}).items():
                        if want is None or a in want:
                            sub.setdefault(a, b)
    digits = {ord(c): n for c, n in zip("0123456789", ["zero", "one", "two", "three", "four", "five", "six",
                                                       "seven", "eight", "nine"])}
    changed = 0
    for t in f["cmap"].tables:
        if not t.isUnicode():
            continue
        for cp, g in list(t.cmap.items()):
            if g in sub and (cp in digits or g in FREEZE_CASE):
                t.cmap[cp] = sub[g]
                changed += 1
    if not all(sub.get(n, "").endswith(".lf") for n in digits.values()):
        raise RuntimeError(f"{src}: no lnum substitutions for all digits")
    f["name"].setName("Cormorant Garamond LF", 1, 3, 1, 0x409)
    f.save(dst + ".part")
    os.replace(dst + ".part", dst)
    return changed


def font_cormorant():
    """Pinned, hash-verified Cormorant Garamond VF with lining figures frozen in. Returns the path."""
    d = os.path.join(ASSETS, "fonts"); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, "CormorantGaramond-VF.ttf")
    if not os.path.exists(p) or sha256(p) != CORMORANT_SHA256:
        subprocess.run(["curl", "-sSL", "--retry", "3", "-o", p + ".part", CORMORANT_URL], check=True)
        got = sha256(p + ".part")
        if got != CORMORANT_SHA256:
            raise RuntimeError(f"Cormorant download hash mismatch: {got} != {CORMORANT_SHA256}")
        os.replace(p + ".part", p)
    q = os.path.join(d, f"CormorantGaramond-VF-lnum-{CORMORANT_SHA256[:12]}.ttf")
    if not os.path.exists(q):
        _freeze_features(p, q)
    return q


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
CLOCK = None


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

    def ref(self, spec, shot):
        """The narrated word a time spec refers to (None for absolute times)."""
        if not isinstance(spec, dict):
            return None
        return self.word(spec.get("shot", shot), spec["word"], spec.get("nth", 0))

    def spoken_end(self, w):
        """End of the voice in this word: the transcript's end, but never past the next word's start."""
        for s in self.shots.values():
            ws = s["words"]
            for i, x in enumerate(ws):
                if x is w or (x["w"] == w["w"] and abs(x["s"] - w["s"]) < 1e-6):
                    nxt = ws[i + 1]["s"] if i + 1 < len(ws) else x["e"]
                    return min(x["e"], nxt)
        return w["e"]


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


def _soft_floor(d, m):
    """d (distance inside a bound, px) -> same where d >= m, smoothly saturating toward 0 below (C1, never < 0)."""
    return np.where(d >= m, d, m * np.exp(np.minimum(d, m) / m - 1.0))


def soft_clamp_safe(x, y, safe, inset, m=70.0):
    """Glide a point to a stop inside the safe area (inset px from its edges) instead of letting it leave."""
    x0, x1, y0, y1 = safe["x0"] + inset, safe["x1"] - inset, safe["y0"] + inset, safe["y1"] - inset
    x = x0 + _soft_floor(x - x0, m); x = x1 - _soft_floor(x1 - x, m)
    y = y0 + _soft_floor(y - y0, m); y = y1 - _soft_floor(y1 - y, m)
    return x, y


def safe_fade(x, y, safe, fade=60.0):
    """1 well inside the safe area, easing to 0 at its edge (graphics never sit in the YouTube UI zones)."""
    d = np.minimum.reduce([x - safe["x0"], safe["x1"] - x, y - safe["y0"], safe["y1"] - y])
    u = np.clip(d / fade, 0, 1)
    return u * u * (3 - 2 * u)


def make_track(shot, name, fallback, f_lo, f_hi, warn, sig_fine=0.6, sig_label=6.0, keep_depth=False,
               safe=None, clamp_inset=None):
    """Per-frame screen path for frames [f_lo, f_hi): exact (lightly smoothed) x,y; heavily smoothed xs,ys for
    labels; soft visibility v (0 when behind the camera, fading out over 60 px before the point leaves the safe
    area). clamp_inset: instead of fading, the point glides to a stop that many px inside the safe area (for
    diffuse subjects such as air, where a held anchor is still true)."""
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
            vis = np.where(valid, 1.0, 0.0)
        else:
            warn(f"{shot}: tracker TRK_{name} missing in tracks/{shot}.json -> fallback")
    elif fallback is not None:
        warn(f"{shot}: no tracks/{shot}.json -> fallback position for TRK_{name}")
    if x is None:
        x, y = _fallback_xy(fallback, t)
        dep = np.ones_like(x); vis = np.ones_like(x)
    if safe is not None:
        if clamp_inset is not None:
            x, y = soft_clamp_safe(_gauss(x, 1.0), _gauss(y, 1.0), safe, clamp_inset)
        vis = vis * safe_fade(x, y, safe)
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
    global CLOCK
    clk = CLOCK = Clock(shots, spec.get("lead", 0.06))
    sh = {s["id"]: s for s in shots["shots"]}
    styles = spec["styles"]
    warnings = []
    warn = warnings.append
    els = []
    cs = styles["callout"]
    inter_med = os.path.join(INTER_DIR, "Inter-Medium.otf")
    inter_reg = os.path.join(INTER_DIR, "Inter-Regular.otf")
    sync_points = []
    callout_checks = []

    def rng_of(shot):
        s = sh[shot]
        return s["render_f0"], s["render_f1"]

    # ---------------- keywords
    kw_boxes = []   # (t0, t1, x0, y0, x1, y1) for callout placement
    kw_checks = []
    for k in spec["keywords"]:
        st = styles[k["style"]]
        lines = []
        tmin = 1e9
        last_word, last_t = None, -1
        for ln in k["lines"]:
            parts = []
            for p in ln:
                tp = clk.t(p["at"], k["shot"])
                tmin = min(tmin, tp)
                d = {"text": tr_upper(p["text"]), "t": tp}
                if "sep" in p:
                    d["sep"] = p["sep"]
                parts.append(d)
                wr = clk.ref(p["at"], k["shot"])
                if wr is not None and tp >= last_t:
                    last_word, last_t = wr, tp
            lines.append({"parts": parts})
        el = {"id": k["id"], "type": "keyword", "style": k["style"], "shot": k["shot"], "lines": lines,
              "y": k.get("y", 670)}
        for opt in ("size", "line_height", "max_width", "tracking", "in"):
            if opt in k:
                el[opt] = k[opt]
        if "swell" in k:
            el["swell"] = {"t": clk.t(k["swell"]["at"], k["shot"]), "gain": k["swell"].get("gain", 0.8),
                           "dur": k["swell"].get("dur", 1.0)}
        cut_t = sh[k["shot"]]["end_s"]
        if "dust" in st:
            # crumbling words have no exit: everything (letters and every dust grain) is gone by the cut
            el["out"] = None
            el["kill"] = float(k.get("kill", cut_t))
            t_end = el["kill"]
        else:
            el["out"] = float(k["out"])
            t_end = el["out"]
        el["f0"] = int(math.floor(tmin * FPS)) - 1
        el["f1"] = int(math.ceil(t_end * FPS)) + 2
        els.append(el)
        kw_checks.append({"el": el, "st": st, "last_word": last_word, "cut": cut_t, "carry": k.get("carry")})
        size = k.get("size", st["size"])
        hgt = len(lines) * size * k.get("line_height", st["line_height"])
        kw_boxes.append((tmin, t_end, 90, el["y"] - hgt / 2 - 10, 990, el["y"] + hgt / 2 + 10))
        for l in lines:
            for p in l["parts"]:
                sync_points.append({"id": f"{k['id']}.{p['text']}", "t": round(p["t"] + clk.lead, 3), "kind": "keyword"})

    # ---------------- callouts (+ counter use the same placement)
    placed = []   # (frames array, boxes array) of placed labels

    def place(cid, shot, trk, t_on, t_off, wlab, has_sec, prefer, leader=None):
        L = (leader or cs["leader"]) * 0.7071
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

    def follow(trk, t_on, t_off, k):
        """Label path that follows only a fraction k of the anchor's motion (about its mean position over the
        callout's life): a fast-moving subject keeps a calm, readable label; the leader absorbs the rest."""
        if k >= 0.999:
            return trk
        i0, i1 = max(0, int(t_on * FPS) - trk["f0"]), max(1, int(t_off * FPS) - trk["f0"])
        xs, ys, v = (np.array(trk[n], float) for n in ("xs", "ys", "v"))
        wv = v[i0:i1] + 1e-3
        cx, cy = float(np.sum(xs[i0:i1] * wv) / wv.sum()), float(np.sum(ys[i0:i1] * wv) / wv.sum())
        out = dict(trk)
        out["xs"] = np.round(cx + k * (xs - cx), 1).tolist()
        out["ys"] = np.round(cy + k * (ys - cy), 1).tolist()
        return out

    for c in spec["callouts"]:
        if c.get("enabled", True) is False:
            continue
        f_lo, f_hi = rng_of(c["shot"])
        ts, to = float(c["sync"]), float(c["out"])
        trk = make_track(c["shot"], c["track"], c.get("fallback"), f_lo, f_hi, warn, safe=spec["safe"],
                         clamp_inset=c.get("clamp"))
        trk = follow(trk, ts, to, float(c.get("follow", 1.0)))
        wl = max(text_width(c["primary"], inter_med, cs["primary"]["size"], cs["primary"]["tracking"]),
                 text_width(c.get("secondary", ""), inter_reg, cs["secondary"]["size"], cs["secondary"]["tracking"]))
        cand, sx, sy = place(c["id"], c["shot"], trk, ts, to, wl, bool(c.get("secondary")), c.get("prefer", []),
                             c.get("leader"))
        i0, i1 = int(ts * FPS) - f_lo, int(to * FPS) - f_lo
        vmean = float(np.mean(trk["v"][max(0, i0):max(1, i1)])) if i1 > i0 else 0
        if vmean < 0.8:
            warn(f"{c['id']}: TRK_{c['track']} inside the safe area only {vmean:.0%} of the callout's life")
        el = {"id": c["id"], "type": "callout", "shot": c["shot"], "primary": c["primary"],
              "secondary": c.get("secondary"), "sync": ts, "out": to, "sx": sx, "sy": sy, "side": cand,
              "trk": trk, "f0": int(math.floor((ts - 0.15) * FPS)), "f1": int(math.ceil(to * FPS)) + 1}
        if "leader" in c:
            el["leader"] = c["leader"]
        els.append(el)
        sync_points.append({"id": c.get("cue", c["id"]), "t": ts, "kind": "callout"})
        callout_checks.append(el)

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
            trk = make_track(shot, wd["track"], wd.get("fallback"), f_lo, f_hi, warn, safe=spec["safe"])
            wl = max(text_width("37.000.000.000.000", inter_med, cs["primary"]["size"], cs["primary"]["tracking"]),
                     text_width(wd["unit"], inter_reg, cs["secondary"]["size"], 0))
            t0, land, out = clk.t(wd["t0"], shot), float(wd["land"]), float(wd["out"])
            mode = wd.get("mode", "callout")
            if mode == "callout":
                cand, sx, sy = place(wd["id"], shot, trk, t0, out, wl, True, wd.get("prefer", []))
            else:
                cand, sx, sy = "free", 1, 1
            els.append({"id": wd["id"], "type": "counter", "shot": shot, "t0": t0, "land": land, "out": out,
                        "count_from": wd["count_from"], "count_to": wd["count_to"], "final": wd["final"],
                        "unit": wd["unit"], "sx": sx, "sy": sy, "side": cand, "trk": trk, "mode": mode,
                        "x": wd.get("x", 540), "y": wd.get("y", 1175),
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
                              "trk": make_track(shot, n["track"], n.get("fallback"), f_lo, f_hi, warn,
                                                safe=spec["safe"])})
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
                trk = make_track(shot, r["track"], r.get("fallback"), f_lo, f_hi, warn, safe=spec["safe"])
                if "then" in r:
                    # hand the ring over to a second target (e.g. the seedling -> its dew drop as the camera
                    # moves in): position and visibility blend over 'dur' seconds from 'at'
                    th = r["then"]
                    t2 = make_track(shot, th["track"], th.get("fallback"), f_lo, f_hi, warn, safe=spec["safe"])
                    tt = (np.arange(f_lo, f_hi)) / FPS
                    u = np.clip((tt - float(th["at"])) / float(th["dur"]), 0, 1)
                    u = u * u * (3 - 2 * u)
                    blend = {}
                    for key in ("x", "y", "xs", "ys", "v"):
                        a_, b_ = np.array(trk[key]), np.array(t2[key])
                        blend[key] = np.round(a_ + (b_ - a_) * u, 3).tolist()
                    trk = {**trk, **blend, "src": f"{trk['src']}->{t2['src']}"}
                rings.append({"land": land, "out": ro, "final": bool(r.get("final")), "trk": trk})
                sync_points.append({"id": f"sh13b.ring_{r['track']}", "t": land, "kind": "ring"})
            els.append({"id": wd["id"], "type": "rings", "shot": shot, "rings": rings, "radius": wd["radius"],
                        "f0": int(math.floor((rings[0]["land"] - 0.25) * FPS)),
                        "f1": int(math.ceil(max(r["out"] for r in rings) * FPS)) + 1})
        elif ty == "spiral":
            trk = make_track(shot, wd["track"], wd.get("fallback"), f_lo, f_hi, warn, sig_fine=0.8, keep_depth=True,
                             safe=spec["safe"])
            t0 = clk.t(wd["t0"], shot)
            el = {"id": wd["id"], "type": "spiral", "shot": shot, "trk": trk, "families": wd["families"],
                  "n_max": wd["n_max"], "k_px_m": wd["k_px_m"], "rot_deg": wd.get("rot_deg", 0.0),
                  "t0": t0, "grow": float(wd.get("grow", 0.42)), "fam_delay": float(wd.get("fam_delay", 0.12)),
                  "min_spacing": wd.get("min_spacing", [8, 16]),
                  "fade0": float(wd["fade0"]), "out": float(wd["out"]),
                  "numbers": wd.get("numbers", True), "num_angles": wd.get("num_angles", [1.0, 2.15]),
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

    corm = font_cormorant()
    faces = [["Cormorant Garamond", "file://" + corm, "300 700"]]
    font_files = [corm] + [os.path.join(INTER_DIR, n) for n in INTER_FILES]
    tl = {"W": W, "H": H, "fps": FPS, "safe": spec["safe"], "styles": styles,
          "fonts": {"faces": faces, "sha256": {os.path.basename(p): _sha_cached(p) for p in font_files}},
          "elements": els, "sync_points": sorted(sync_points, key=lambda s: s["t"] if isinstance(s["t"], float) else s["t"][0])}
    tl["checks"] = keyword_checks(kw_checks, els, warn) + callout_legibility(callout_checks, warn)
    if verbose:
        for w in warnings:
            print("[overlays] note:", w, file=sys.stderr)
    tl["warnings"] = warnings
    return tl


INTER_FILES = ["Inter-Regular.otf", "Inter-Medium.otf", "Inter-SemiBold.otf", "InterDisplay-SemiBold.otf",
               "InterDisplay-Regular.otf", "InterDisplay-Light.otf", "InterDisplay-ExtraLight.otf"]
_SHA = {}


def _sha_cached(p):
    k = (p, os.path.getmtime(p), os.path.getsize(p))
    if k not in _SHA:
        _SHA[k] = sha256(p)
    return _SHA[k]


# ----------------------------------------------------------------------------------------------- checks
def _inv_out_cubic(y):
    """x with eOutCubic(x) = y."""
    return 1 - (1 - y) ** (1 / 3)


def keyword_hold(el, st):
    """Mirror of overlay.js drawKeyword(): the window in which EVERY letter is fully legible (alpha >= 0.9 and
    blur <= 1.5 px), and the moment the first letter starts its exit. -> (t_settled, t_exit, t_unsettle)."""
    IN, OUT = {**st["in"], **el.get("in", {})}, st.get("out")
    letters = []
    for ln in el["lines"]:
        for p in ln["parts"]:
            chars = list(p["text"])
            n = len(chars)
            stag = min(IN["stagger"], IN.get("max_stagger", 0.3) / max(1, n - 1))
            for i, ch in enumerate(chars):
                if ch != " ":
                    letters.append(p["t"] + i * stag)
    t_alpha = IN["fade"] * _inv_out_cubic(0.9)
    t_blur = IN["dur"] * 0.8 * _inv_out_cubic(1 - 1.5 / IN["blur"]) if IN["blur"] > 1.5 else 0.0
    settled = max(letters) + max(t_alpha, t_blur)
    if el.get("out") is None or OUT is None:
        return settled, None, None
    n = len(letters)
    ostag = min(OUT["stagger"], OUT.get("max_stagger", 0.26) / max(1, n - 1))
    te0 = el["out"] - OUT["dur"] - ostag * (n - 1)
    v_lim = min(0.1958, math.sqrt(1.5 / OUT["blur"]) if OUT["blur"] > 1.5 else 1.0)
    unsettle = te0 + v_lim * OUT["dur"]          # the first letter to leave is the first below 0.9
    return settled, te0, unsettle


def keyword_checks(kws, els, warn):
    """Hold / sync / cut rules for every key word (printed by --resolve, notes on violations):
    - settled hold (all letters legible) >= 0.8 s (sacred: aim >= 1.5 s, note below 1.2 s)
    - the exit starts only after the phrase's last word has been spoken
    - the word is gone by the cut (+2 frames) unless the overlays.json entry explains a deliberate 'carry'
    - two key words never share the band at the same time."""
    rows = []
    for k in kws:
        el, st = k["el"], k["st"]
        settled, te0, unsettle = keyword_hold(el, st)
        row = {"id": el["id"], "settled": round(settled, 3)}
        if te0 is not None:
            hold = unsettle - settled
            row.update(exit=round(te0, 3), out=el["out"], hold=round(hold, 3))
            need = 0.8
            if hold < need - 1e-3:
                warn(f"{el['id']}: settled hold only {hold:.2f} s (< {need:.1f} s)")
            elif el["style"] == "sacred" and hold < 1.2:
                warn(f"{el['id']}: sacred word holds {hold:.2f} s (aim 1.5 s)")
            if k["last_word"] is not None:
                spoken = CLOCK.spoken_end(k["last_word"])
                row["spoken_end"] = round(spoken, 3)
                if te0 < spoken - 0.02:
                    warn(f"{el['id']}: exit starts at {te0:.2f} s before '{k['last_word']['w']}' ends ({spoken:.2f} s)")
            if el["out"] > k["cut"] + 2 / FPS + 1e-6:
                row["carry"] = round(el["out"] - k["cut"], 3)
                if not k["carry"]:
                    warn(f"{el['id']}: runs {el['out'] - k['cut']:.2f} s past the cut at {k['cut']:.2f} s "
                         f"without a 'carry' reason")
        else:
            row["kill"] = el.get("kill")
        rows.append(row)
    # band exclusivity
    spans = sorted((min(p["t"] for l in e["lines"] for p in l["parts"]), e.get("out") or e.get("kill"), e["id"])
                   for e in els if e["type"] == "keyword")
    for (a0, a1, ia), (b0, b1, ib) in zip(spans, spans[1:]):
        if b0 < a1 - 1e-3 and not ({ia, ib} <= {"kw_cold", "kw_question"}):
            warn(f"{ib} enters at {b0:.2f} s while {ia} is still on screen (until {a1:.2f} s)")
    return rows


def callout_legibility(cos, warn):
    """Legible window of every callout label (mirror of overlay.js calloutPhases: text complete at sync + 0.36 s,
    starts leaving at out - 0.185 s)."""
    rows = []
    for e in cos:
        leg = (e["out"] - 0.185) - (e["sync"] + (0.36 if e.get("secondary") else 0.30))
        rows.append({"id": e["id"], "legible": round(leg, 3)})
        if leg < 1.0:
            warn(f"{e['id']}: label fully legible for only {leg:.2f} s")
    return rows


def timeline_hash(tl, scale):
    h = hashlib.sha1()
    h.update(json.dumps({k: v for k, v in tl.items() if k not in ("warnings", "checks")}, sort_keys=True).encode())
    for p in ("overlay/overlay.js", "overlay/overlay.html", "render_overlays.mjs"):
        h.update(open(os.path.join(HERE, p), "rb").read())
    h.update(str(scale).encode())
    return h.hexdigest()[:16]


def out_root(scale):
    return os.path.join(OUT, "overlays", f"s{scale:g}")


def out_dir(scale, hsh):
    return os.path.join(out_root(scale), hsh)


def _pid_alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _hold_dir(d):
    """Mark a hash directory as in use by this process (removed at exit)."""
    lp = os.path.join(d, f".lock_{os.getpid()}")
    if not os.path.exists(lp):
        open(lp, "w").close()
        atexit.register(lambda: os.path.exists(lp) and os.remove(lp))


def _prune(root, keep, max_age_h=6.0):
    """Delete old hash directories that no live process holds (never the one in use)."""
    now = time.time()
    for n in os.listdir(root):
        d = os.path.join(root, n)
        if n == keep or not os.path.isdir(d) or len(n) != 16:
            continue
        locks = [f for f in os.listdir(d) if f.startswith(".lock_")]
        live = [f for f in locks if f[6:].isdigit() and _pid_alive(int(f[6:]))]
        if not live and now - os.path.getmtime(d) > max_age_h * 3600:
            shutil.rmtree(d, ignore_errors=True)


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


def layout_check(tl, d, quiet=False):
    """Rendered-extent assertion: ask the renderer for the ink box of every key-word line (settled, at its
    largest drift / exit tracking) and fail if any leaves the safe area (x0..x1, y0..y1)."""
    tp = os.path.join(d, "timeline.json")
    if not os.path.exists(tp):
        with open(tp, "w", encoding="utf-8") as fh:
            json.dump(tl, fh, ensure_ascii=False)
    rp = os.path.join(d, "layout_report.json")
    if not os.path.exists(rp):
        r = subprocess.run([NODE, os.path.join(HERE, "render_overlays.mjs"), "--timeline", tp, "--out", d,
                            "--layout-report", rp], capture_output=True, text=True)
        if r.returncode != 0:
            print(r.stderr, file=sys.stderr)
            raise RuntimeError("layout report failed")
    rep = load_json(rp)
    sf = tl["safe"]
    bad = []
    for k in rep["keywords"]:
        for i, ln in enumerate(k["lines"]):
            x0, y0, x1, y1 = ln["ink"]
            if x0 < sf["x0"] - 0.5 or x1 > sf["x1"] + 0.5 or y0 < sf["y0"] or y1 > sf["y1"]:
                bad.append(f"{k['id']} line {i + 1}: ink x {x0:.0f}-{x1:.0f}, y {y0:.0f}-{y1:.0f} "
                           f"outside the safe area x {sf['x0']}-{sf['x1']}, y {sf['y0']}-{sf['y1']}")
    if bad:
        raise AssertionError("key words outside the safe area:\n  " + "\n  ".join(bad))
    if not quiet:
        print(f"[overlays] layout check: {sum(len(k['lines']) for k in rep['keywords'])} key-word lines inside "
              f"the safe area", file=sys.stderr)
    return rep


def ensure(f_from, f_to, scale=1.0, pages=2, frames=None, tl=None, quiet=False):
    """Make sure overlay frames for [f_from, f_to] (or the explicit list) exist for the current timeline.
    Returns the manifest {"hash", "dir", "frames": {f: [over, add, boxes]}}."""
    tl = tl or resolve(verbose=not quiet)
    hsh = timeline_hash(tl, scale)
    root = out_root(scale)
    d = out_dir(scale, hsh)
    os.makedirs(d, exist_ok=True)
    _hold_dir(d)
    _prune(root, hsh)
    layout_check(tl, d, quiet)
    mp = os.path.join(d, "manifest.json")
    man = load_json(mp) if os.path.exists(mp) else None
    if not man or man.get("hash") != hsh:
        man = {"hash": hsh, "scale": scale, "frames": {}}
    want = sorted(set(frames)) if frames is not None else active_frames(tl, f_from, f_to)
    want = [f for f in want if any(e["f0"] <= f < e["f1"] for e in tl["elements"])]
    todo = [f for f in want if str(f) not in man["frames"]]
    if todo:
        tp = os.path.join(d, "timeline.json")
        with open(tp, "w", encoding="utf-8") as fh:
            json.dump(tl, fh, ensure_ascii=False)
        logp = os.path.join(d, f"log_{os.getpid()}.jsonl")
        if os.path.exists(logp):
            os.remove(logp)
        t0 = time.time()
        cmd = [NODE, os.path.join(HERE, "render_overlays.mjs"), "--timeline", tp, "--out", d, "--scale", str(scale),
               "--pages", str(pages), "--frames", ",".join(_ranges(todo)), "--log", logp]
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
        # merge with whatever a concurrent process added to the same hash directory meanwhile
        if os.path.exists(mp):
            try:
                other = load_json(mp)
                if other.get("hash") == hsh:
                    for k_, v_ in other["frames"].items():
                        man["frames"].setdefault(k_, v_)
            except (json.JSONDecodeError, OSError):
                pass
        with open(mp + f".{os.getpid()}", "w") as fh:
            json.dump(man, fh)
        os.replace(mp + f".{os.getpid()}", mp)
        if not quiet:
            print(f"[overlays] rendered {len(todo)} frames in {time.time() - t0:.1f}s "
                  f"({(time.time() - t0) / max(1, len(todo)):.3f} s/frame) -> {d}", file=sys.stderr)
    missing = [f for f in want if str(f) not in man["frames"]]
    if missing:
        raise RuntimeError(f"overlay frames missing after render: {_ranges(missing)[:8]}")
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
        hsh = timeline_hash(tl, a.scale)
        d = out_dir(a.scale, hsh)
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, "timeline.json")
        with open(p, "w", encoding="utf-8") as fh:
            json.dump(tl, fh, ensure_ascii=False, indent=None)
        for e in tl["elements"]:
            extra = ""
            if e["type"] == "keyword":
                extra = " | ".join(" · ".join(f"{p['text']}@{p['t']:.2f}" for p in l["parts"]) for l in e["lines"])
                extra += f"  out={e['out']}" if e["out"] is not None else f"  kill={e.get('kill')}"
            elif e["type"] in ("callout", "counter"):
                extra = f"{e.get('primary') or e.get('final')} side={e['side']} track={e['trk']['src']}"
            print(f"{e['id']:16s} {e['type']:8s} f{e['f0']:5d}-{e['f1']:5d}  {extra}")
        print("\nkey-word holds (settled = every letter alpha >= 0.9 and blur <= 1.5 px):")
        for r in tl["checks"]:
            if "settled" in r:
                if "hold" in r:
                    print(f"  {r['id']:15s} settled {r['settled']:7.2f}  exit {r['exit']:7.2f} (spoken end "
                          f"{r.get('spoken_end', float('nan')):6.2f})  out {r['out']:7.2f}  hold {r['hold']:5.2f} s"
                          + (f"  carry +{r['carry']:.2f} s" if r.get("carry") else ""))
                else:
                    print(f"  {r['id']:15s} settled {r['settled']:7.2f}  crumbles; all gone by {r['kill']:.2f}")
            else:
                print(f"  {r['id']:15s} callout label legible {r['legible']:.2f} s")
        layout_check(tl, d)
        sp = os.path.join(HERE, "sync_points.json")
        with open(sp, "w", encoding="utf-8") as fh:
            json.dump({"doc": "Moments where overlay graphics land (absolute s). Generated by comp/overlays.py --resolve; "
                              "the sound mix's UI ticks (audio/cues.json, ids sh*.callout_* / link_* / ring_*) must "
                              "match (composite.py refuses to encode the final otherwise).",
                       "points": tl["sync_points"]}, fh, ensure_ascii=False, indent=1)
        print("->", p, "and", sp)
    if a.render:
        frames = [int(x) for x in a.frames.split(",")] if a.frames else None
        ensure(a.ffrom, a.fto, a.scale, a.pages, frames=frames, tl=tl)


if __name__ == "__main__":
    main()
