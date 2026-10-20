#!/usr/bin/env python3
"""mix.py - final soundtrack of the film.

  1. renders every cue of cues.json with sfx.py (level-matched by momentary loudness, faded,
     panned - from the studios' tracker JSON when available - and placed on the timeline),
  2. sends each cue to its environment's reverb (synthetic stereo IRs; SFX only),
  3. processes the narration: 70 Hz high-pass, light split-band de-esser, light RMS
     compression - sample-exact, no timing change,
  4. ducks the SFX under the voice: 3-band side-chain (the 250 Hz-5 kHz band ducks most, so
     the voice band stays clean), depth per cue class, look-ahead, smooth attack/release,
  5. masters voice + SFX to -14 LUFS integrated with a 4x-oversampled true-peak limiter
     (ceiling -1.3 dBTP), and writes 48 kHz / 24-bit stereo WAVs of exactly 125.5 s:
       sfx_stem.wav, voice_proc.wav (same master gain + limiter gain, so they sum to the mix)
       and final_mix.wav, plus mix_report.json.

usage: python3 mix.py [--out DIR] [--only-sfx] [--no-report]
(DIR defaults to $VIDEO_OUT/audio, else <repo>/video/.out/audio)
"""
import argparse
import glob
import json
import os
import subprocess
import sys
import time

import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import minimum_filter1d, uniform_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import sfx  # noqa: E402

SR = sfx.SR
TARGET_LUFS = -14.0
VOICE_LUFS = -14.3          # voice alone is calibrated to this before the SFX are added, so cue
                            # "lvl" values are (approximately) final-mix loudness
CEILING_DBTP = -1.3
db = sfx.db

# --------------------------------------------------------------------------- loudness (BS.1770-4)
_KW1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
_KW2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def kweight(x):
    return signal.lfilter(*_KW2, signal.lfilter(*_KW1, x, axis=0), axis=0)


def _power(x):
    k = kweight(x)
    return (k * k).sum(axis=1) if k.ndim == 2 else k * k


def momentary(x, win=0.4, hop=0.1):
    """Momentary loudness series (LUFS) and block start times."""
    p = _power(x)
    c = np.concatenate([[0.0], np.cumsum(p)])
    w, h = int(win * SR), int(hop * SR)
    starts = np.arange(0, max(len(p) - w, 0) + 1, h)
    ms = (c[starts + w] - c[starts]) / w
    return -0.691 + 10 * np.log10(np.maximum(ms, 1e-20)), starts / SR


def momentary_max(x):
    if len(x) < int(0.4 * SR):
        x = np.concatenate([x, np.zeros((int(0.4 * SR) - len(x),) + x.shape[1:])])
    return float(momentary(x, 0.4, 0.02)[0].max())


def integrated(x):
    L, _ = momentary(x, 0.4, 0.1)
    L = L[L > -70]
    if not len(L):
        return -70.0
    rel = -0.691 + 10 * np.log10(np.mean(10 ** ((L + 0.691) / 10))) - 10
    L = L[L > rel]
    return float(-0.691 + 10 * np.log10(np.mean(10 ** ((L + 0.691) / 10))))


def true_peak_db(x, os_=8):
    m = 0.0
    for ch in range(x.shape[1]):
        y = signal.resample_poly(x[:, ch], os_, 1)
        m = max(m, float(np.abs(y).max()))
    return 20 * np.log10(max(m, 1e-12))


# --------------------------------------------------------------------------- narration
def load_voice(path, n_total):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    if len(v) > n_total:
        raise SystemExit(f"narration ({len(v) / SR:.2f}s) longer than the film")
    return np.concatenate([v, np.zeros(n_total - len(v))]), len(v)


def _env_db(x, win):
    k = int(win * SR)
    c = np.concatenate([[0.0], np.cumsum(x * x)])
    e = np.empty(len(x))
    a = np.clip(np.arange(len(x)) - k // 2, 0, len(x))
    b = np.clip(a + k, 0, len(x))
    e[:] = (c[b] - c[a]) / np.maximum(b - a, 1)
    return 10 * np.log10(np.maximum(e, 1e-14))


def _smooth_gain_db(g, att, rel, fs):
    """Asymmetric one-pole smoothing of a gain-reduction curve (dB, <= 0)."""
    aa, ar = np.exp(-1 / (att * fs)), np.exp(-1 / (rel * fs))
    out = np.empty_like(g)
    y = 0.0
    for i, x in enumerate(g):
        y = (aa * y + (1 - aa) * x) if x < y else (ar * y + (1 - ar) * x)
        out[i] = y
    return out


def process_voice(v):
    info = {}
    # 1. gentle high-pass (12 dB/oct @ 70 Hz) - removes rumble and plosive thump, keeps chest
    v = signal.sosfilt(signal.butter(2, 70, "highpass", fs=SR, output="sos"), v)
    # 2. light split-band de-esser on the >5 kHz band (complementary split => transparent at 0 dB)
    hf = signal.sosfiltfilt(signal.butter(4, 5000, "highpass", fs=SR, output="sos"), v)
    fs_c = 1000
    e = _env_db(hf, 0.005)[::SR // fs_c]
    thr, ratio, maxgr = -31.0, 3.0, 6.0
    gr = -np.minimum(np.maximum(e - thr, 0) * (1 - 1 / ratio), maxgr)
    gr = _smooth_gain_db(gr, 0.001, 0.05, fs_c)
    g = db(np.interp(np.arange(len(v)) / SR, np.arange(len(gr)) / fs_c, gr))
    v = v + (g - 1.0) * hf
    info["deess_max_gr_db"] = round(float(-gr.min()), 2)
    info["deess_active_pct"] = round(float((gr < -1).mean() * 100), 2)
    # 3. light RMS compression, 2:1 above -23 dBFS, 8 dB soft knee, 8 ms / 160 ms
    e = _env_db(v, 0.012)[::SR // fs_c]
    thr, ratio, knee = -23.0, 2.0, 8.0
    over = e - thr
    gr = np.where(over <= -knee / 2, 0.0,
                  np.where(over >= knee / 2, -over * (1 - 1 / ratio),
                           -(1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee)))
    gr = _smooth_gain_db(gr, 0.008, 0.16, fs_c)
    v = v * db(np.interp(np.arange(len(v)) / SR, np.arange(len(gr)) / fs_c, gr))
    act = e > -45
    info["comp_gr_db_p50_p95_max"] = [round(float(np.percentile(-gr[act], 50)), 2),
                                      round(float(np.percentile(-gr[act], 95)), 2), round(float(-gr.min()), 2)]
    return v, info


def voice_activity(v, fs_c=200, look=0.04):
    """0..1 speech-activity curve at fs_c Hz (with look-ahead) used as the ducking side-chain."""
    e = _env_db(v, 0.03)[::SR // fs_c]
    ref = np.percentile(e[e > -55], 90)
    a = sfx.smoothstep((e - (ref - 30)) / 18)
    k = int(look * fs_c)
    a = np.concatenate([a[k:], np.zeros(k)])   # look-ahead: duck slightly before the word
    return a, ref


# --------------------------------------------------------------------------- reverb
SPACES = {   # rt = T60 at low/mid, rt_hi = T60 at high frequencies, pre = pre-delay, lp = air/damping
    "outdoor": dict(rt=0.45, rt_hi=0.22, pre=0.010, er=5, lp=9000),
    "meadow": dict(rt=0.95, rt_hi=0.45, pre=0.022, er=5, lp=7000),
    "outdoor_big": dict(rt=2.6, rt_hi=1.0, pre=0.045, er=3, lp=3200),
    "aerial": dict(rt=1.9, rt_hi=0.8, pre=0.030, er=3, lp=5000),
    "desert": dict(rt=0.65, rt_hi=0.3, pre=0.014, er=4, lp=6000),
    "room": dict(rt=0.42, rt_hi=0.28, pre=0.004, er=12, lp=8000),
    "room_wood": dict(rt=0.55, rt_hi=0.30, pre=0.005, er=12, lp=6500),
    "dark": dict(rt=1.5, rt_hi=0.7, pre=0.012, er=8, lp=4500),
    "underwater": dict(rt=0.95, rt_hi=0.5, pre=0.002, er=6, lp=1800),
    "body": dict(rt=0.7, rt_hi=0.35, pre=0.002, er=4, lp=1200),
    "micro": dict(rt=1.1, rt_hi=0.6, pre=0.006, er=4, lp=5000),
    "ui": dict(rt=0.35, rt_hi=0.25, pre=0.004, er=4, lp=9000),
}


def make_ir(name):
    s = SPACES[name]
    rng = sfx.rng_for("ir", name)
    n = sfx.N(s["rt"] * 1.5 + s["pre"] + 0.05)
    rt, rth, lpf = s["rt"], s["rt_hi"], s["lp"]

    def mag(T, F):
        rtf = rth + (rt - rth) * sfx.m_lp(F, 1500, 1)
        Tc = np.clip(T - s["pre"], 0, None)
        on = sfx.smoothstep((T - s["pre"]) / 0.02)
        return on * np.exp(-6.91 * Tc / rtf) * sfx.m_lp(F, lpf, 2) * sfx.m_hp(F, 60, 1)
    h = np.stack([sfx.shaped_noise(n, mag, rng), sfx.shaped_noise(n, mag, rng)], 1)
    er = np.zeros_like(h)
    for k in range(s["er"]):          # a few early reflections (distinct, filtered, panned)
        t = s["pre"] + rng.uniform(0.002, 0.045)
        a = rng.uniform(0.3, 1.0) * np.exp(-t / 0.05)
        p = rng.uniform(-0.9, 0.9)
        tap = sfx.lp(np.r_[1.0, np.zeros(64)], lpf * 0.7, 2)
        sfx.add_mono(er, tap, sfx.N(t), p, a)
    h = h / np.sqrt((h ** 2).sum() / 2) + er * 0.6 / np.sqrt((er ** 2).sum() / 2 + 1e-12) * 0.35
    h = h / np.sqrt((h ** 2).sum(axis=0)).max()
    return h


# --------------------------------------------------------------------------- trackers
_TRACK_CACHE = {}


def tracker_x(shot, name, t):
    """Screen x (0..1) of TRK_<name> at time t, from any tracker JSON the studios exported."""
    if shot not in _TRACK_CACHE:
        cands = sorted(glob.glob(os.path.join(VIDEO, "renders", shot, "*.json")))
        for root in [os.environ.get("VIDEO_OUT", ""), os.path.join(VIDEO, ".out"), os.path.join(VIDEO, "review", shot)]:
            if root:
                cands += glob.glob(os.path.join(root, "track", f"{shot}.json")) + glob.glob(os.path.join(root, f"{shot}*.json"))
        data = None
        for p in cands:
            try:
                d = json.load(open(p))
                if "frames" in d:
                    data = d
                    break
            except Exception:
                pass
        _TRACK_CACHE[shot] = data
    d = _TRACK_CACHE[shot]
    if not d:
        return None
    f = str(int(round(t * d.get("fps", 24))))
    row = d["frames"].get(f)
    if not row or name not in row or not row[name][3]:
        return None
    return row[name][0] / d.get("width", 1080)


# --------------------------------------------------------------------------- cue rendering
CLASSES = ("amb", "spot", "sub", "ui")
# continuous beds are levelled by their typical loudness (70th percentile of momentary loudness);
# everything else (spot effects, sparse beds such as birds) by its loudest moment
NORM_TYPICAL = {"room_tone", "wind", "underwater", "ocean", "rain", "body_amb", "blood_flow", "flame"}
# UI ticks are 2-5 ms clicks: they are levelled by sample peak (lvl = dBFS), not by loudness
NORM_PEAK = {"ui_tick"}
SFX_BUS_CEILING = -5.0      # fast look-ahead limiter on the SFX bus only (never ducks the voice)
# ducking depth (dB) per class for the bands  <250 Hz | 250 Hz-5 kHz | >5 kHz
DUCK = {"amb": (2.5, 5.0, 3.5), "spot": (1.5, 4.0, 2.5), "sub": (0.5, 2.5, 1.5), "ui": (0.0, 1.5, 1.0)}


def render_cues(cues, n_total, log):
    buses = {c: np.zeros((n_total, 2)) for c in CLASSES}
    sends = {}
    rows = []
    for c in cues:
        t0 = time.time()
        gen = sfx.GEN[c["gen"]]
        n = sfx.N(c["dur"])
        y = sfx.fit(gen(c["dur"], sfx.rng_for(c["id"]), **c.get("params", {})).astype(np.float64), n)
        mode = c.get("norm") or ("p70" if c["gen"] in NORM_TYPICAL else "peak" if c["gen"] in NORM_PEAK else "max")
        if mode == "max":
            raw = momentary_max(y)
        elif mode == "peak":
            raw = 20 * np.log10(np.abs(y).max() + 1e-12)
        else:
            Lm, tm = momentary(y, 0.4, 0.05)
            keep = (tm >= c.get("fade_in", 0)) & (tm + 0.4 <= c["dur"] - c.get("fade_out", 0))
            raw = float(np.percentile(Lm[keep] if keep.sum() > 4 else Lm, float(mode[1:])))
        y *= db(c["lvl"] - raw)
        if c.get("peak_cap") is not None:
            pk, cap = np.abs(y).max(), db(c["peak_cap"])
            if pk > cap:
                y *= cap / pk
        start = c["t"] - c.get("pre", 0.0)
        pan_src = None
        p = c.get("pan")
        if c.get("track"):
            x = tracker_x(c["track"]["shot"], c["track"]["name"], c["t"])
            if x is not None:
                p, pan_src = float(np.clip((x - 0.5) * 2 * 0.85, -0.9, 0.9)), "tracker"
        if p is not None:
            mono = (y[:, 0] + y[:, 1]) / np.sqrt(2)
            y = sfx.pan2(mono, p)
            pan_src = pan_src or "static"
        y = sfx.fade(y, c.get("fade_in", 0.005), c.get("fade_out", 0.02))
        if c.get("env"):
            tt = start + np.arange(n) / SR
            E = np.asarray(c["env"], dtype=float)
            y *= db(np.interp(tt, E[:, 0], E[:, 1]))[:, None]
        i0 = sfx.N(start)
        sfx.add_st(buses[c["class"]], y, i0)
        if c.get("space") and c.get("send", -60) > -59:
            sp = sends.setdefault(c["space"], np.zeros((n_total, 2)))
            sfx.add_st(sp, y, i0, float(db(c["send"])))
        rows.append(dict(id=c["id"], shot=c["shot"], start=round(start, 3), t=c["t"], dur=c["dur"], gen=c["gen"],
                         lvl=c["lvl"], norm=mode, cls=c["class"], pan=None if p is None else round(p, 2), pan_src=pan_src,
                         ms=round(time.time() - t0, 2)))
        log(f"  {c['id']:24s} {c['gen']:15s} t={c['t']:8.3f} lvl={c['lvl']:6.1f}  ({rows[-1]['ms']:.2f}s)")
    return buses, sends, rows


def split3(x, f1=250.0, f2=5000.0):
    lo = signal.sosfiltfilt(signal.butter(4, f1, "lowpass", fs=SR, output="sos"), x, axis=0)
    rest = x - lo
    mid = signal.sosfiltfilt(signal.butter(4, f2, "lowpass", fs=SR, output="sos"), rest, axis=0)
    return lo, mid, rest - mid


def duck(buses, act, fs_c, n_total):
    t_s = np.arange(n_total) / SR
    t_c = np.arange(len(act)) / fs_c
    out = np.zeros((n_total, 2))
    curves = {}
    for cls, y in buses.items():
        if not np.any(y):
            continue
        bands = split3(y)
        for bi, (band, depth) in enumerate(zip(bands, DUCK[cls])):
            if depth <= 0:
                out += band
                continue
            g = _smooth_gain_db(-depth * act, 0.035, 0.30, fs_c)
            curves[(cls, bi)] = g
            out += band * db(np.interp(t_s, t_c, g))[:, None]
    return out, curves


# --------------------------------------------------------------------------- mastering
def tp_limiter(x, ceiling_db=CEILING_DBTP, look=0.0015, release=0.12):
    """Look-ahead true-peak limiter: detection on 4x oversampled signal, gain <= required at
    every sample (min-filter + centred moving average), exponential release. Returns gain curve."""
    c = db(ceiling_db)
    n = len(x)
    pk = np.abs(x).max(axis=1)
    for ch in range(2):
        y4 = signal.resample_poly(x[:, ch], 4, 1)
        pk = np.maximum(pk, np.abs(y4[:4 * n]).reshape(n, 4).max(axis=1))
    g_req = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    L = max(int(look * SR), 2)
    h = minimum_filter1d(g_req, size=2 * L + 1, mode="nearest")
    s = uniform_filter1d(h, size=L + 1, mode="nearest")
    s = np.minimum(s, g_req)
    # release: z[i] = max(1 - s[i], a z[i-1]) solved in closed form with a cumulative max (log domain)
    la = -1.0 / (release * SR)
    u = np.log(np.maximum(1.0 - s, 1e-30))
    i = np.arange(n)
    w = np.maximum.accumulate(u - i * la) + i * la
    return 1.0 - np.exp(w)


def master(mix, log):
    g_db = TARGET_LUFS - integrated(mix)
    for it in range(5):
        y = mix * db(g_db)
        gl = tp_limiter(y)
        I = integrated(y * gl[:, None])
        log(f"  master pass {it}: gain {g_db:+.2f} dB -> {I:.2f} LUFS, max limiter GR {-20 * np.log10(gl.min()):.2f} dB")
        if abs(I - TARGET_LUFS) < 0.02:
            break
        g_db += TARGET_LUFS - I
    return g_db, gl


# --------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None)
    ap.add_argument("--cues", default=os.path.join(HERE, "cues.json"))
    ap.add_argument("--voice", default=os.path.join(HERE, "narration.m4a"))
    ap.add_argument("--no-report", action="store_true")
    a = ap.parse_args()
    out_dir = a.out or os.path.join(os.environ.get("VIDEO_OUT") or os.path.join(VIDEO, ".out"), "audio")
    os.makedirs(out_dir, exist_ok=True)
    T0 = time.time()
    log = lambda s: print(s, flush=True)

    spec = json.load(open(a.cues, encoding="utf-8"))
    total = float(spec["total_seconds"])
    n_total = int(round(total * SR))
    cues = spec["cues"]

    log(f"[mix] rendering {len(cues)} cues")
    buses, sends, rows = render_cues(cues, n_total, log)

    log(f"[mix] reverb: {', '.join(sorted(sends))}")
    for name, s in sends.items():
        ir = make_ir(name)
        wet = np.stack([signal.oaconvolve(s[:, ch], ir[:, ch])[:n_total] for ch in range(2)], 1)
        buses["amb"] += wet

    log("[mix] narration")
    v_raw, n_voice = load_voice(a.voice, n_total)
    v, vinfo = process_voice(v_raw)
    v *= db(VOICE_LUFS - integrated(np.stack([v, v], 1) * db(-3.0)))
    fs_c = 200
    act, vref = voice_activity(v, fs_c)
    log(f"  voice: {n_voice / SR:.3f}s, {vinfo}")

    log("[mix] ducking")
    sfx_bus, curves = duck(buses, act, fs_c, n_total)
    # remove sub-sonic energy (inaudible, costs headroom); keep everything from ~30 Hz up
    sfx_bus = signal.sosfiltfilt(signal.butter(2, 28, "highpass", fs=SR, output="sos"), sfx_bus, axis=0)
    g_sfx = tp_limiter(sfx_bus, SFX_BUS_CEILING - 20 * np.log10(db(VOICE_LUFS - TARGET_LUFS)), look=0.001, release=0.05)
    sfx_bus *= g_sfx[:, None]
    sfx_lim = {"max_gr_db": round(float(-20 * np.log10(g_sfx.min())), 2),
               "active_pct": round(float((g_sfx < db(-0.5)).mean() * 100), 3)}
    log(f"  SFX bus limiter: {sfx_lim}")
    vst = np.stack([v, v], 1) * db(-3.0)          # centred dual-mono voice

    log("[mix] mastering")
    mix = vst + sfx_bus
    g_db, gl = master(mix, log)
    G = db(g_db) * gl[:, None]
    v_out, s_out = vst * G, sfx_bus * G
    final = v_out + s_out
    fo = int(0.01 * SR)
    final[-fo:] *= np.linspace(1, 0, fo)[:, None]
    s_out[-fo:] *= np.linspace(1, 0, fo)[:, None]
    assert len(final) == n_total

    paths = {k: os.path.join(out_dir, f"{k}.wav") for k in ("sfx_stem", "voice_proc", "final_mix")}
    for k, y in (("sfx_stem", s_out), ("voice_proc", v_out), ("final_mix", final)):
        sf.write(paths[k], y.astype(np.float32), SR, subtype="PCM_24")
    log(f"[mix] wrote {', '.join(paths.values())}  ({time.time() - T0:.0f}s)")
    if a.no_report:
        return

    # ------------------------------------------------------------------ measurements
    fin, _ = sf.read(paths["final_mix"], dtype="float64")
    rep = {"files": paths, "samples": len(fin), "seconds": len(fin) / SR, "voice": vinfo,
           "master_gain_db": round(g_db, 2), "sfx_bus_limiter": sfx_lim, "limiter_max_gr_db": round(float(-20 * np.log10(gl.min())), 2),
           "limiter_active_pct": round(float((gl < db(-0.5)).mean() * 100), 3)}
    grd = -20 * np.log10(gl)
    hot = []
    for i in np.argsort(grd)[::-1]:
        if grd[i] < 1.0 or len(hot) >= 12:
            break
        if all(abs(i / SR - h[0]) > 0.25 for h in hot):
            hot.append((round(i / SR, 2), round(float(grd[i]), 2)))
    rep["limiter_hot_spots_s_db"] = hot
    rep["integrated_lufs"] = round(integrated(fin), 2)
    rep["true_peak_dbtp_8x"] = round(true_peak_db(fin), 2)
    rep["sample_peak_dbfs"] = round(20 * np.log10(np.abs(fin).max()), 2)
    try:
        import pyloudnorm as pyln
        rep["pyloudnorm_lufs"] = round(float(pyln.Meter(SR).integrated_loudness(fin)), 2)
    except Exception as e:  # pragma: no cover
        rep["pyloudnorm_lufs"] = str(e)
    try:
        r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", paths["final_mix"], "-af", "ebur128=peak=true",
                            "-f", "null", "-"], capture_output=True, text=True).stderr
        summ = r[r.rfind("Summary:"):]
        grab = lambda key: float(summ.split(key)[1].split()[0])
        rep["ffmpeg_ebur128"] = {"I": grab("I:"), "LRA": grab("LRA:"), "true_peak": grab("Peak:")}
    except Exception as e:  # pragma: no cover
        rep["ffmpeg_ebur128"] = str(e)
    for k in ("sfx_stem", "voice_proc"):
        y, _ = sf.read(paths[k], dtype="float64")
        rep[k] = {"integrated_lufs": round(integrated(y), 2), "sample_peak_dbfs": round(20 * np.log10(np.abs(y).max() + 1e-12), 2)}
    # voice vs SFX while the voice speaks / in pauses
    Lv, ts = momentary(v_out, 0.4, 0.1)
    Ls, _ = momentary(s_out, 0.4, 0.1)
    speak = Lv > TARGET_LUFS - 12
    pause = Lv < TARGET_LUFS - 30
    d = (Lv - Ls)[speak]
    rep["voice_minus_sfx_db_while_speaking"] = {p: round(float(np.percentile(d, p)), 1) for p in (5, 25, 50, 75, 95)}
    rep["sfx_lufs_m_in_pauses"] = {p: round(float(np.percentile(Ls[pause], p)), 1) for p in (50, 90, 99)} if pause.any() else {}
    rep["sfx_lufs_m_while_speaking"] = {p: round(float(np.percentile(Ls[speak], p)), 1) for p in (50, 90, 99)}
    # mono compatibility (phones)
    mono = (fin[:, 0] + fin[:, 1])[:, None] / 2
    rep["mono_downmix_lufs"] = round(integrated(np.repeat(mono, 2, 1)), 2)
    # per-cue post-mix level and what the voice is doing meanwhile
    sw = s_out
    for r_ in rows:
        a0, a1 = sfx.N(r_["start"]), min(sfx.N(r_["start"] + r_["dur"]), n_total)
        seg_v = v_out[a0:a1]
        r_["voice_lufs_m_max"] = round(momentary_max(seg_v), 1) if a1 > a0 else None
        r_["sfx_lufs_m_max"] = round(momentary_max(sw[a0:a1]), 1) if a1 > a0 else None
    rep["cues"] = rows
    shots = {}
    for c in cues:
        s = shots.setdefault(c["shot"], {"amb": 0, "spot": 0, "sub": 0, "ui": 0})
        s[c["class"]] += 1
    rep["cue_counts"] = shots
    json.dump(rep, open(os.path.join(out_dir, "mix_report.json"), "w"), indent=1, ensure_ascii=False)
    log(json.dumps({k: rep[k] for k in rep if k not in ("cues", "cue_counts", "files")}, indent=1, ensure_ascii=False))
    log(f"[mix] done in {time.time() - T0:.0f}s")


if __name__ == "__main__":
    main()
