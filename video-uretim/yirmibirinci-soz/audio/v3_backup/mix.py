#!/usr/bin/env python3
"""mix.py - cue-sheet mixer: the narrator dominates, procedural SFX (sfx.py) sit far underneath.

    python3 mix.py [cues.json] [--voice voice_trim.wav] [--out-dir DIR] [-v]

Cue sheet (JSON):
    {"duration": 29.6,
     "voice": "voice_trim.wav",                # optional, relative to the cue sheet (video t=0 = first sample)
     "mix": {"duck_db": 5.0},                  # optional overrides of DEFAULTS below
     "cues": [{"t": 3.4, "sound": "whoosh", "gain_db": -6, "pan": -0.3, "params": {"duration": 0.7}}, ...]}

  t        video seconds where the sound's perceptual hit lands (the sound's own `.anchor` is put on t)
  sound    a name from sfx.SOUNDS
  gain_db  trim relative to the sound's calibrated default level (0 = recommended quiet level)   [default 0]
  pan      -1 (left) .. +1 (right)                                                                [default 0]
  params   keyword arguments of the sfx function (duration, seed, brightness, ...)              [default {}]
  seed     shortcut for params.seed (omit it and a stable seed is derived from sound + t, so two cues of
           the same sound never come out identical)
  align    "anchor" (default) | "start" | "end": which point of the sound is put on t
  note     free text, ignored

Outputs (48 kHz stereo 16-bit, exactly `duration` long): mix.wav, sfx_bus.wav (effects exactly as mixed),
voice_bus.wav (processed narration) and mix_report.json.

Chain
  voice : 70 Hz high-pass (12 dB/oct, zero-phase) -> gain to -16 LUFS integrated (BS.1770-4) -> true peak <= -1.5 dBTP
          (a look-ahead limiter engages only if the gain alone would exceed it; no compression).
  sfx   : every cue is capped at -14 dBFS true peak -> summed -> ducked 5 dB under speech (side-chain from the
          voice, 30 ms attack with 30 ms look-ahead, 100 ms hold, 250 ms release) -> short-term loudness ceiling
          (voice - 14 LU in every 3 s window that contains speech; voice - 12 LU elsewhere) -> bus peak ceiling
          -14 dBFS -> natural tail fade.
  final : voice + sfx -> safety true-peak ceiling -1.5 dBTP (normally idle) -> 10 ms fades at the file edges.
"""
import argparse
import json
import os
import sys
import zlib

import numpy as np
from scipy import ndimage, signal
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import meter  # noqa: E402
import sfx  # noqa: E402

SR = 48000

DEFAULTS = dict(
    voice_lufs=-16.0,          # integrated loudness target of the narration
    voice_tp_max=-1.5,         # dBTP ceiling of the narration
    voice_hp_hz=70.0,          # gentle high-pass (2nd order)
    voice_offset=0.0,          # seconds; video time of the first voice sample
    sfx_margin_lu=14.0,        # SFX short-term loudness must stay this far below the voice while it speaks
    sfx_margin_free_lu=12.0,   # same guard for windows without speech (None = off)
    sfx_peak_max=-14.0,        # dBFS: no SFX peak above this, anywhere
    duck_db=5.0,               # extra attenuation of the SFX bus under speech (4..6)
    duck_attack=0.030, duck_release=0.250, duck_lookahead=0.030, duck_hold=0.100,
    speech_on_db=-22.0, speech_off_db=-30.0,   # speech detector thresholds relative to the voice LUFS
    final_tp_max=-1.5,         # dBTP ceiling of the final mix
    edge_fade=0.010,           # fade in/out at the file edges
    tail_fade=0.5,             # raised-cosine fade of the SFX bus at the very end of the file
    dither=False,              # TPDF dither on the 16-bit outputs
)


def db2lin(d):
    return 10.0 ** (d / 20.0)


def edge_fades(x, fin, fout):
    n = len(x)
    a, b = min(int(round(fin * SR)), n // 2), min(int(round(fout * SR)), n // 2)
    g = np.ones(n)
    if a:
        g[:a] = 0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a)
    if b:
        g[n - b:] = 0.5 + 0.5 * np.cos(np.pi * (np.arange(b) + 1) / b)
    return x * g[:, None]


def limit(x, ceiling_db, lookahead=0.005, release=0.100):
    """Stereo-linked, true-peak-aware look-ahead limiter.  Gain = sliding minimum of the required gain
    (+-lookahead), exponential release, then Hann smoothing over the same span, so the gain never exceeds
    the required gain at any peak and moves without steps.  Returns (y, max_reduction_db)."""
    c = db2lin(ceiling_db)
    up = signal.resample_poly(x, 4, 1, axis=0)
    pk = np.abs(up).max(axis=1)[:4 * len(x)].reshape(len(x), 4).max(axis=1)
    pk = np.maximum(pk, np.abs(x).max(axis=1))
    need = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    if need.min() >= 1.0:
        return x, 0.0
    L = int(lookahead * SR)
    g = ndimage.minimum_filter1d(need, size=2 * L + 1, mode="nearest").tolist()
    k = float(np.exp(-1.0 / (release * SR)))
    cur = 1.0
    for i in range(len(g)):
        cur = min(g[i], 1.0 - (1.0 - cur) * k)
        g[i] = cur
    w = np.hanning(2 * L + 3)[1:-1]
    g = np.convolve(np.pad(np.array(g), L, mode="edge"), w / w.sum(), "valid")
    return x * g[:, None], float(-20.0 * np.log10(g.min()))


def read_wav(path):
    sr, x = wavfile.read(path)
    if x.dtype == np.int16:
        x = x.astype(np.float64) / 32768.0
    elif x.dtype == np.int32:
        x = x.astype(np.float64) / 2147483648.0
    elif x.dtype == np.uint8:
        x = (x.astype(np.float64) - 128.0) / 128.0
    else:
        x = x.astype(np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    return sr, x[:, :2]


def process_voice(path, n_total, S, rep):
    sr, v = read_wav(path)
    if sr != SR:
        raise SystemExit("voice must be 48 kHz (got %d)" % sr)
    rep["voice_in_lufs"] = meter.integrated(v)
    rep["voice_in_tp"] = meter.true_peak_db(v)
    rep["voice_in_seconds"] = len(v) / SR
    if S["voice_hp_hz"]:
        # zero-phase 2nd-order Butterworth magnitude (-3 dB at the corner, 12 dB/oct): no phase rotation, so
        # the waveform peaks are not raised the way a causal high-pass raises them
        pad = SR // 2
        V = np.fft.rfft(np.concatenate([np.zeros((pad, 2)), v, np.zeros((pad, 2))]), axis=0)
        f = np.maximum(np.fft.rfftfreq(len(v) + 2 * pad, 1.0 / SR), 1e-6)
        V *= (1.0 / np.sqrt(1.0 + (S["voice_hp_hz"] / f) ** 4))[:, None]
        v = np.fft.irfft(V, len(v) + 2 * pad, axis=0)[pad:pad + len(v)]
    v = edge_fades(v, 0.005, 0.030)
    gain = S["voice_lufs"] - meter.integrated(v)
    v = v * db2lin(gain)
    rep["voice_limiter_db"] = 0.0
    for _ in range(4):
        if meter.true_peak_db(v) <= S["voice_tp_max"]:
            break
        v, red = limit(v, S["voice_tp_max"] - 0.15)
        rep["voice_limiter_db"] = max(rep["voice_limiter_db"], red)
        trim = S["voice_lufs"] - meter.integrated(v)
        if abs(trim) < 0.05:
            break
        gain += trim
        v = v * db2lin(trim)
    if meter.true_peak_db(v) > S["voice_tp_max"]:
        v, red = limit(v, S["voice_tp_max"] - 0.15)
        rep["voice_limiter_db"] = max(rep["voice_limiter_db"], red)
    rep["voice_gain_db"] = gain
    off = int(round(S["voice_offset"] * SR))
    out = np.zeros((n_total, 2))
    a, b = max(off, 0), min(off + len(v), n_total)
    seg = v[a - off:b - off]
    if b - off < len(v):
        seg = edge_fades(seg, 0.0, 0.010)
        rep["warnings"].append("voice is longer than the mix duration and was cut at %.3f s" % (n_total / SR))
    out[a:b] = seg
    rep["voice_lufs"] = meter.integrated(out)
    rep["voice_tp"] = meter.true_peak_db(out)
    return out


def speech_activity(voice, S, voice_lufs):
    """Speech mask (per sample, bool) and duck gain (per sample, dB <= 0) from the voice itself."""
    n = len(voice)
    hop = SR // 1000  # 1 kHz control rate
    band = signal.sosfiltfilt(signal.butter(2, [120.0, 5000.0], "bandpass", fs=SR, output="sos"), voice.mean(axis=1))
    win = int(0.020 * SR)
    c = np.concatenate([[0.0], np.cumsum(band * band)])
    centres = np.arange(0, n, hop)
    lo, hi = np.clip(centres - win // 2, 0, n), np.clip(centres + win // 2, 0, n)
    lev = 10.0 * np.log10((c[hi] - c[lo]) / np.maximum(hi - lo, 1) + 1e-20)
    on_thr, off_thr = voice_lufs + S["speech_on_db"], voice_lufs + S["speech_off_db"]
    raw = np.zeros(len(lev), bool)
    state = False
    for i, l in enumerate(lev.tolist()):
        state = (l > off_thr) if state else (l > on_thr)
        raw[i] = state
    # bridge gaps shorter than 120 ms (inside words / between syllables), drop blips shorter than 30 ms
    mask = ndimage.binary_closing(np.pad(raw, 200), structure=np.ones(121))[200:-200]
    mask = ndimage.binary_opening(np.pad(mask, 200), structure=np.ones(31))[200:-200]
    # side-chain: look-ahead (duck is in place when the word starts), hold, smooth attack / release
    la, hold = int(S["duck_lookahead"] * 1000), int(S["duck_hold"] * 1000)
    act = ndimage.maximum_filter1d(mask.astype(np.float64), size=la + hold + 1, origin=(hold - la) // 2, mode="constant")
    target = (-S["duck_db"] * act).tolist()
    ka = 1.0 - np.exp(-1.0 / (max(S["duck_attack"], 1e-4) / 3.0 * 1000.0))
    kr = 1.0 - np.exp(-1.0 / (max(S["duck_release"], 1e-4) / 3.0 * 1000.0))
    g, cur = np.zeros(len(target)), 0.0
    for i, tg in enumerate(target):
        cur += (tg - cur) * (ka if tg < cur else kr)
        g[i] = cur
    duck = np.interp(np.arange(n), centres, g)
    w = np.hanning(int(0.006 * SR) | 1)
    duck = np.convolve(np.pad(duck, len(w) // 2, mode="edge"), w / w.sum(), "valid")
    return np.repeat(mask, hop)[:n], duck


def _segments(mask):
    d = np.diff(np.concatenate([[0], mask.astype(np.int8), [0]]))
    return [(a / SR, b / SR) for a, b in zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0])]


def render_cues(sheet, n_total, S, rep):
    bus = np.zeros((n_total, 2))
    cap = S["sfx_peak_max"] - 0.3
    rows = []
    for k, cue in enumerate(sheet.get("cues", [])):
        params = dict(cue.get("params", {}))
        if "pan" in cue:
            params["pan"] = cue["pan"]
        if "seed" in cue:
            params["seed"] = cue["seed"]
        # no seed given: derive a stable one from (sound, t) so repeated sounds never come out identical
        params.setdefault("seed", zlib.crc32(("%s@%.3f" % (cue["sound"], float(cue["t"]))).encode()) & 0x7FFFFFFF)
        snd = sfx.render(cue["sound"], **params)
        x = np.asarray(snd, dtype=np.float64) * db2lin(float(cue.get("gain_db", 0.0)))
        tp = meter.true_peak_db(x)
        trim = min(cap - tp, 0.0)
        x *= db2lin(trim)
        align = cue.get("align", "anchor")
        off = {"anchor": snd.anchor, "start": 0.0, "end": len(x) / SR}[align]
        i0 = int(round((float(cue["t"]) - off) * SR))
        a, b = max(i0, 0), min(i0 + len(x), n_total)
        row = dict(i=k, t=float(cue["t"]), sound=cue["sound"], gain_db=float(cue.get("gain_db", 0.0)),
                   start=i0 / SR, end=(i0 + len(x)) / SR, anchor=snd.anchor, peak_db=tp + trim, trim_db=trim)
        rows.append(row)
        if trim < -0.05:
            rep["warnings"].append("cue %d (%s @ %.2f s): peak %.1f dBFS exceeds the cap, trimmed %.1f dB"
                                   % (k, cue["sound"], row["t"], tp, trim))
        if b <= a:
            rep["warnings"].append("cue %d (%s @ %.2f s) lies outside the file - skipped" % (k, cue["sound"], row["t"]))
            continue
        seg = x[a - i0:b - i0].copy()
        if a > i0:
            seg = edge_fades(seg, 0.010, 0.0)
            rep["warnings"].append("cue %d (%s @ %.2f s) starts before t=0 - head cropped" % (k, cue["sound"], row["t"]))
        if b < i0 + len(x):
            seg = edge_fades(seg, 0.0, 0.010)
            rep["notes"].append("cue %d (%s @ %.2f s) runs past the end - tail faded" % (k, cue["sound"], row["t"]))
        bus[a:b] += seg
    rep["cues"] = rows
    return bus


def st_ceiling(bus, speech, voice_lufs, S, rep):
    """Keep the SFX bus short-term loudness (3 s) under voice-14 LU in every window that contains speech
    (and under voice-12 LU elsewhere) with a slow, smooth gain trim over the offending windows."""
    cs = np.concatenate([[0], np.cumsum(speech)])
    total = 0.0
    for _ in range(10):
        ts, te, L = meter.short_term(bus)
        a, b = (ts * SR).astype(int), np.minimum((te * SR).astype(int), len(bus))
        has_speech = (cs[b] - cs[a]) >= int(0.1 * SR)
        ceil = np.where(has_speech, voice_lufs - S["sfx_margin_lu"],
                        voice_lufs - S["sfx_margin_free_lu"] if S["sfx_margin_free_lu"] is not None else 1e9)
        over = L - ceil
        if over.max() <= 0.0:
            break
        red = np.zeros(len(bus))
        for i in np.nonzero(over > 0)[0]:
            red[a[i]:b[i]] = np.maximum(red[a[i]:b[i]], over[i] + 0.2)
        w = np.hanning(int(0.5 * SR) | 1)
        red = ndimage.maximum_filter1d(red, size=len(w), mode="nearest")
        red = np.convolve(np.pad(red, len(w) // 2, mode="edge"), w / w.sum(), "valid")
        bus = bus * db2lin(-red)[:, None]
        total += red.max()
    rep["st_ceiling_reduction_db"] = total
    if total > 0.05:
        rep["warnings"].append("SFX short-term loudness exceeded its ceiling: bus pulled down by up to %.1f dB "
                               "(lower the cue gains / thin the cues)" % total)
    return bus


def build(sheet, voice_path=None, base_dir=HERE):
    """Run the whole mix in memory.  Returns dict(voice, sfx_raw, sfx, mix, speech, duck_db, report, settings)."""
    S = dict(DEFAULTS)
    S.update(sheet.get("mix", {}))
    rep = dict(warnings=[], notes=[])
    n_total = int(round(float(sheet["duration"]) * SR))
    voice_path = voice_path or os.path.join(base_dir, sheet.get("voice", "voice_trim.wav"))
    voice = process_voice(voice_path, n_total, S, rep)
    speech, duck = speech_activity(voice, S, rep["voice_lufs"])
    raw = render_cues(sheet, n_total, S, rep)
    bus = raw * db2lin(duck)[:, None]
    bus = st_ceiling(bus, speech, rep["voice_lufs"], S, rep)
    rep["sfx_limiter_db"] = 0.0
    for _ in range(3):
        if meter.true_peak_db(bus) <= S["sfx_peak_max"]:
            break
        bus, red = limit(bus, S["sfx_peak_max"] - 0.3)
        rep["sfx_limiter_db"] = max(rep["sfx_limiter_db"], red)
    nt = min(int(S["tail_fade"] * SR), n_total)
    if nt:
        bus[n_total - nt:] *= (0.5 + 0.5 * np.cos(np.pi * (np.arange(nt) + 1) / nt))[:, None]
    bus = edge_fades(bus, S["edge_fade"], S["edge_fade"])
    voice = edge_fades(voice, S["edge_fade"], S["edge_fade"])
    mix = voice + bus
    rep["final_limiter_db"] = 0.0
    for _ in range(3):
        if meter.true_peak_db(mix) <= S["final_tp_max"]:
            break
        mix, red = limit(mix, S["final_tp_max"] - 0.15)
        rep["final_limiter_db"] = max(rep["final_limiter_db"], red)
    mix = edge_fades(mix, S["edge_fade"], S["edge_fade"])

    # ---- measurements -------------------------------------------------------------------------------------
    cs = np.concatenate([[0], np.cumsum(speech)])
    ts, te, L = meter.short_term(bus)
    a, b = (ts * SR).astype(int), np.minimum((te * SR).astype(int), n_total)
    sp = (cs[b] - cs[a]) >= int(0.1 * SR)
    segs = _segments(speech)
    inner = np.zeros(n_total, bool)
    if segs:
        inner[int(segs[0][0] * SR):int(segs[-1][1] * SR)] = True
    pause = inner & ~speech
    rep.update(
        duration=n_total / SR, samples=n_total, n_cues=len(sheet.get("cues", [])),
        speech_seconds=float(speech.sum() / SR), speech_segments=[(round(x, 3), round(y, 3)) for x, y in segs],
        sfx_lufs_gated=meter.integrated(bus), sfx_lufs_whole=meter.ungated(bus),
        sfx_lufs_speech=meter.ungated(bus, mask=speech), sfx_lufs_pauses=meter.ungated(bus, mask=pause),
        sfx_st_max_speech=float(L[sp].max()) if sp.any() else -np.inf,
        sfx_st_max_any=float(L.max()), sfx_st_ceiling=rep["voice_lufs"] - S["sfx_margin_lu"],
        sfx_mom_max=float(meter.momentary(bus)[2].max()),
        sfx_peak=meter.sample_peak_db(bus), sfx_tp=meter.true_peak_db(bus),
        duck_mean_speech_db=float(duck[speech].mean()) if speech.any() else 0.0,
        duck_mean_pause_db=float(duck[pause].mean()) if pause.any() else 0.0,
        duck_min_db=float(duck.min()), duck_max_step_db=float(np.abs(np.diff(duck)).max()),
        mix_lufs=meter.integrated(mix), mix_tp=meter.true_peak_db(mix), mix_peak=meter.sample_peak_db(mix),
    )
    return dict(voice=voice, sfx_raw=raw, sfx=bus, mix=mix, speech=speech, duck_db=duck, report=rep, settings=S)


def print_report(rep, S, verbose=False):
    f = lambda v: "%.1f" % v if np.isfinite(v) else "-inf"  # noqa: E731
    print("MIX  %d cues, %.3f s (%d samples @ 48 kHz)" % (rep["n_cues"], rep["duration"], rep["samples"]))
    print("voice  in %.2f LUFS / %.2f dBTP -> HP %g Hz, gain %+.2f dB -> %.2f LUFS, true peak %.2f dBTP "
          "(limiter %s)" % (rep["voice_in_lufs"], rep["voice_in_tp"], S["voice_hp_hz"], rep["voice_gain_db"],
                            rep["voice_lufs"], rep["voice_tp"],
                            "idle" if rep["voice_limiter_db"] < 0.01 else "%.1f dB" % rep["voice_limiter_db"]))
    print("speech %.1f s active in %d segments" % (rep["speech_seconds"], len(rep["speech_segments"])))
    print("sfx    loudness: gated %s LUFS | whole file %s | during speech %s | in pauses %s"
          % (f(rep["sfx_lufs_gated"]), f(rep["sfx_lufs_whole"]), f(rep["sfx_lufs_speech"]), f(rep["sfx_lufs_pauses"])))
    print("       short-term max while speaking %s LUFS (ceiling %.1f = voice-%g LU, margin %.1f LU) | anywhere %s"
          " | momentary max %s" % (f(rep["sfx_st_max_speech"]), rep["sfx_st_ceiling"], S["sfx_margin_lu"],
                                  rep["sfx_st_ceiling"] - rep["sfx_st_max_speech"], f(rep["sfx_st_max_any"]),
                                  f(rep["sfx_mom_max"])))
    print("       max peak %s dBFS (true peak %s, cap %.1f) | duck %.1f dB: mean gain %.1f dB in speech, %.1f dB "
          "in pauses" % (f(rep["sfx_peak"]), f(rep["sfx_tp"]), S["sfx_peak_max"], S["duck_db"],
                         rep["duck_mean_speech_db"], rep["duck_mean_pause_db"]))
    print("       safety stages: per-cue peak trims %d | short-term ceiling %.1f dB | bus limiter %.1f dB"
          % (sum(1 for c in rep["cues"] if c["trim_db"] < -0.05), rep["st_ceiling_reduction_db"], rep["sfx_limiter_db"]))
    print("final  %.2f LUFS integrated, true peak %.2f dBTP (max %.1f), sample peak %.2f dBFS, final limiter %s"
          % (rep["mix_lufs"], rep["mix_tp"], S["final_tp_max"], rep["mix_peak"],
             "idle" if rep["final_limiter_db"] < 0.01 else "%.1f dB" % rep["final_limiter_db"]))
    for w in rep["warnings"]:
        print("WARNING: " + w)
    if verbose:
        for n in rep["notes"]:
            print("note: " + n)
        print("  #     t  sound          gain   peak   start     end  anchor")
        for c in rep["cues"]:
            print("%3d %6.2f  %-13s %+5.1f %6.1f %7.3f %7.3f  %.3f" % (c["i"], c["t"], c["sound"], c["gain_db"] + c["trim_db"],
                                                                     c["peak_db"], c["start"], c["end"], c["anchor"]))


def main(argv=None):
    ap = argparse.ArgumentParser(description="Mix narration + quiet procedural SFX from a cue sheet.")
    ap.add_argument("cues", nargs="?", default=os.path.join(HERE, "cues.json"))
    ap.add_argument("--voice", default=None, help="narration wav (default: sheet 'voice' or voice_trim.wav)")
    ap.add_argument("--out-dir", default=None, help="output directory (default: folder of the cue sheet)")
    ap.add_argument("-v", "--verbose", action="store_true", help="also print the per-cue table")
    a = ap.parse_args(argv)
    with open(a.cues) as fh:
        sheet = json.load(fh)
    base = os.path.dirname(os.path.abspath(a.cues))
    out_dir = a.out_dir or base
    os.makedirs(out_dir, exist_ok=True)
    r = build(sheet, a.voice, base)
    S, rep = r["settings"], r["report"]
    for name, key in (("mix.wav", "mix"), ("sfx_bus.wav", "sfx"), ("voice_bus.wav", "voice")):
        sfx.write_wav(os.path.join(out_dir, name), r[key], dither=S["dither"])
    with open(os.path.join(out_dir, "mix_report.json"), "w") as fh:
        json.dump(rep, fh, indent=1, default=lambda o: float(o) if isinstance(o, (np.floating, np.integer)) else str(o))
    print_report(rep, S, a.verbose)
    print("wrote  mix.wav  sfx_bus.wav  voice_bus.wav  mix_report.json  -> " + out_dir)
    return r


if __name__ == "__main__":
    main()
