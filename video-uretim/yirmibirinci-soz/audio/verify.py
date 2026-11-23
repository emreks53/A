#!/usr/bin/env python3
"""verify.py - measure, don't hope.  Checks the SFX library and the mix that mix.py wrote.

    python3 verify.py [cues.json] [--bands]

Prints PASS/FAIL lines (exit code 1 on any FAIL):
  library : every sound - stereo float32, deterministic, zero first/last sample, soft edges, no DC,
            default peak well under the peak cap, no hiss (energy above 6 kHz / 10 kHz), nothing struck
            (10-90 % attack of at least 8 ms)                                     (--bands prints the table)
  files   : mix.wav / sfx_bus.wav / voice_bus.wav - 48 kHz stereo 16-bit, exact duration, up to date with the
            cue sheet, no clipped samples, zero at the file edges
  loudness: voice -16 LUFS, true peaks, SFX short-term ceiling while speaking, SFX peak cap
  ducking : SFX gain measured in speech vs. pauses, plus a functional test with a steady noise cue
  clicks  : discontinuity detector on the SFX bus and the mix (self-tested against deliberate hard cuts),
            smoothness of the gain automation, every cue boundary
"""
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import audit  # noqa: E402
import meter  # noqa: E402
import mix as mixer  # noqa: E402
import sfx  # noqa: E402

SR = 48000
FAILS = []


def check(ok, text):
    print(("PASS  " if ok else "FAIL  ") + text)
    if not ok:
        FAILS.append(text)
    return ok


_SOS_CLICK = None


def click_curve(x):
    """Discontinuity detector (per-sample score).  Every sound rolls off above ~11 kHz, so the band above 17 kHz is almost empty
    unless the waveform has a step / hard cut / stuck sample, which splatters energy up to Nyquist.
    Score = |17 kHz high-passed signal| / (local +-1 ms peak of the signal + a -80 dBFS floor).
    Clean material scores <= 0.002; a hard cut scores 0.01-0.5."""
    from scipy import ndimage, signal
    global _SOS_CLICK
    if _SOS_CLICK is None:
        _SOS_CLICK = signal.butter(8, 17000.0, "highpass", fs=SR, output="sos")
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    pad = np.zeros((256, x.shape[1]))
    xp = np.concatenate([pad, x, pad])
    hp = np.abs(signal.sosfiltfilt(_SOS_CLICK, xp, axis=0))
    loc = ndimage.maximum_filter1d(np.abs(xp), size=97, axis=0, mode="constant")
    return (hp / (loc + 1e-4)).max(axis=1)[256:-256]


def click_score(x):
    s = click_curve(x)
    i = int(np.argmax(s))
    return float(s[i]), i / SR


CLICK_LIMIT = 0.006


def library_checks(show_bands):
    print("--- library (%d sounds x 3 seeds) ---" % len(sfx.SOUNDS))
    worst = dict(edge=-200.0, dc=-200.0, peak=-200.0, hf=-200.0, hf6=-200.0, click=0.0, att=1e9, attname="")
    ok_shape = ok_det = ok_zero = True
    rows = []
    for name in sfx.SOUNDS:
        for seed in range(3):
            s = sfx.render(name, seed=seed)
            x = np.asarray(s, dtype=np.float64)
            ok_shape &= (s.dtype == np.float32 and s.ndim == 2 and s.shape[1] == 2 and 0.0 <= s.anchor <= len(s) / SR)
            ok_det &= bool(np.array_equal(np.asarray(s), np.asarray(sfx.render(name, seed=seed))))
            ok_zero &= bool(np.all(x[0] == 0.0) and np.all(x[-1] == 0.0))
            pk = np.abs(x).max()
            edge = 20 * np.log10(max(np.abs(x[:24]).max(), np.abs(x[-24:]).max(), 1e-12) / pk)
            worst["edge"] = max(worst["edge"], edge)
            worst["dc"] = max(worst["dc"], 20 * np.log10(np.abs(x.mean(axis=0)).max() / pk + 1e-12))
            worst["peak"] = max(worst["peak"], meter.sample_peak_db(x))
            be = meter.band_energies_db(x)
            worst["hf"] = max(worst["hf"], be[-1])
            worst["click"] = max(worst["click"], click_score(x)[0])
            m = audit.intrinsic(x)
            worst["hf6"] = max(worst["hf6"], m["hf6"])
            if m["att"] < worst["att"]:
                worst["att"], worst["attname"] = m["att"], name
            if seed == 0:
                rows.append((name, be))
    if show_bands:
        print("      band energy, dB re total: " + " ".join("%6s" % ("%g" % (b[1] / 1000.0) + "k") for b in meter.BANDS)
              + "   (upper band edges; first band 0-60 Hz)")
        for name, be in rows:
            print("      %-13s             " % name + " ".join("%6.1f" % v for v in be))
    check(ok_shape, "all sounds are float32 (n, 2) with a valid anchor")
    check(ok_det, "all sounds are deterministic (same seed -> identical samples)")
    check(ok_zero, "first and last sample of every sound are exactly 0")
    check(worst["edge"] < -40.0, "edges are soft: first/last 0.5 ms <= %.0f dB re the sound's peak" % worst["edge"])
    check(worst["dc"] < -60.0, "no DC: worst mean offset %.0f dB re peak" % worst["dc"])
    cap = mixer.DEFAULTS["sfx_peak_max"]
    check(worst["peak"] < cap - 1.0, "default peaks leave headroom under the %.0f dBFS cap: loudest %.1f dBFS" % (cap, worst["peak"]))
    # v4 (was: above 10 kHz <= -18 dB): no hiss at all
    check(worst["hf"] < -40.0 and worst["hf6"] < -25.0,
          "no hiss: energy above 6 kHz <= %.1f dB, above 10 kHz <= %.1f dB re total in every sound (limits -25 / -40)"
          % (worst["hf6"], worst["hf"]))
    # v4, new: nothing is struck
    check(worst["att"] >= 8.0, "nothing is struck: the fastest 10-90 %% attack in the palette is %.1f ms (%s; limit >= 8 ms)"
          % (worst["att"], worst["attname"]))
    check(worst["click"] < CLICK_LIMIT, "no discontinuity inside any sound (max click score %.4f, limit %g)" % (worst["click"], CLICK_LIMIT))


def read_int16(path):
    from scipy.io import wavfile
    sr, x = wavfile.read(path)
    return sr, x


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    cue_path = args[0] if args else os.path.join(HERE, "cues.json")
    base = os.path.dirname(os.path.abspath(cue_path))
    with open(cue_path) as fh:
        sheet = json.load(fh)
    library_checks("--bands" in sys.argv)

    print("--- mix files (%s) ---" % os.path.basename(cue_path))
    r = mixer.build(sheet, None, base)
    S, rep = r["settings"], r["report"]
    n_total = int(round(float(sheet["duration"]) * SR))
    files = {}
    ok_fmt = ok_fresh = True
    for name, key in (("mix.wav", "mix"), ("sfx_bus.wav", "sfx"), ("voice_bus.wav", "voice")):
        sr, x = read_int16(os.path.join(base, name))
        ok_fmt &= (sr == SR and x.dtype == np.int16 and x.ndim == 2 and x.shape[1] == 2 and len(x) == n_total)
        if len(x) == n_total:
            ok_fresh &= bool(np.abs(x.astype(np.float64) - np.asarray(r[key]) * 32767.0).max() <= 1.01)
        files[name] = x
    check(ok_fmt, "mix.wav / sfx_bus.wav / voice_bus.wav are 48 kHz stereo 16-bit, exactly %d samples = %.3f s"
          % (n_total, n_total / SR))
    check(ok_fresh, "files on disk match a fresh render of the cue sheet (within 1 LSB)")
    m16, s16 = files["mix.wav"], files["sfx_bus.wav"]
    mixf, sfxf, voicef = m16 / 32768.0, s16 / 32768.0, files["voice_bus.wav"] / 32768.0
    check(int((np.abs(m16.astype(np.int32)) >= 32767).sum()) == 0, "no clipped samples in mix.wav (max |sample| %d of 32767)"
          % np.abs(m16.astype(np.int32)).max())
    check(not m16[0].any() and not m16[-1].any() and not s16[0].any() and not s16[-1].any(),
          "first and last sample of mix.wav and sfx_bus.wav are 0 (10 ms edge fades)")

    print("--- loudness ---")
    vl = meter.integrated(voicef)
    check(abs(vl - S["voice_lufs"]) <= 0.2, "voice %.2f LUFS integrated (target %.1f), true peak %.2f dBTP (max %.1f)"
          % (vl, S["voice_lufs"], meter.true_peak_db(voicef), S["voice_tp_max"]))
    check(meter.true_peak_db(voicef) <= S["voice_tp_max"] + 0.05, "voice true peak under its ceiling; limiter reduction %.1f dB"
          % rep["voice_limiter_db"])
    mtp = meter.true_peak_db(mixf)
    check(mtp <= S["final_tp_max"] + 0.05, "final mix true peak %.2f dBTP (max %.1f), integrated %.2f LUFS"
          % (mtp, S["final_tp_max"], meter.integrated(mixf)))
    speech = r["speech"]
    cs = np.concatenate([[0], np.cumsum(speech)])
    ts, te, L = meter.short_term(sfxf)
    a, b = (ts * SR).astype(int), np.minimum((te * SR).astype(int), n_total)
    sp = (cs[b] - cs[a]) >= int(0.1 * SR)
    st_sp = float(L[sp].max()) if sp.any() else -200.0
    ceil = vl - S["sfx_margin_lu"]
    check(st_sp <= ceil + 0.05, "SFX short-term loudness while speaking: max %.1f LUFS <= ceiling %.1f (voice - %g LU); "
          "margin %.1f LU" % (st_sp, ceil, S["sfx_margin_lu"], ceil - st_sp))
    stp = meter.true_peak_db(sfxf)
    check(stp <= S["sfx_peak_max"] + 0.05, "SFX peak: %.1f dBFS sample / %.1f dBTP <= cap %.1f"
          % (meter.sample_peak_db(sfxf), stp, S["sfx_peak_max"]))
    print("      SFX bus: gated %.1f LUFS | during speech %.1f | in pauses %.1f | momentary max %.1f  (voice %.1f)"
          % (rep["sfx_lufs_gated"], rep["sfx_lufs_speech"], rep["sfx_lufs_pauses"], rep["sfx_mom_max"], vl))
    print("      voice-to-SFX distance while speaking: %.1f LU" % (vl - rep["sfx_lufs_speech"]))

    print("--- ducking ---")
    duck = r["duck_db"]
    segs = rep["speech_segments"]
    gaps = [(segs[i][1], segs[i + 1][0]) for i in range(len(segs) - 1)]
    long_gaps = [g for g in gaps if g[1] - g[0] >= 0.6]
    print("      speech %.1f s in %d segments; pauses: %s" % (rep["speech_seconds"], len(segs),
                                                             " ".join("%.2f-%.2f" % g for g in gaps)))
    check(S["duck_db"] - 0.6 <= -rep["duck_mean_speech_db"] <= S["duck_db"] + 0.1,
          "side-chain gain while speaking: mean %.2f dB (target -%.1f)" % (rep["duck_mean_speech_db"], S["duck_db"]))
    if long_gaps:
        mid = [float(duck[int((g[0] + 0.45) * SR):int((g[1] - 0.08) * SR)].max()) for g in long_gaps]
        check(max(mid) > -1.0, "bus recovers in long pauses: gain reaches %.2f dB (pauses >= 0.6 s: %d)" % (max(mid), len(long_gaps)))
    check(float(duck[int(segs[-1][1] * SR) + SR:].min()) > -0.05 if segs else True, "bus is un-ducked 1 s after the last word")
    check(rep["duck_max_step_db"] < 0.02, "gain automation is smooth: max step %.4f dB per sample" % rep["duck_max_step_db"])
    # functional test: a steady noise bed through the real chain, measured in speech vs. a long pause
    test = dict(sheet)
    test["cues"] = [{"t": 0.0, "sound": "room_tone", "gain_db": 14.0, "align": "start",
                     "params": {"duration": float(sheet["duration"]), "fade_in": 0.02, "fade_out": 0.02, "seed": 7}}]
    tr = mixer.build(test, None, base)
    tsp = tr["speech"]
    if long_gaps and tsp.any():
        g = max(long_gaps, key=lambda q: q[1] - q[0])
        pa, pb = int((g[0] + 0.45) * SR), int((g[1] - 0.08) * SR)
        lev_pause = meter.rms_db(tr["sfx"][pa:pb]) - meter.rms_db(tr["sfx_raw"][pa:pb])
        lev_speech = meter.rms_db(tr["sfx"][tsp]) - meter.rms_db(tr["sfx_raw"][tsp])
        check(S["duck_db"] - 1.0 <= lev_pause - lev_speech <= S["duck_db"] + 0.5,
              "functional test (steady noise cue): level in speech %.2f dB, in pause %.2f-%.2f s %.2f dB -> ducking %.2f dB"
              % (lev_speech, g[0] + 0.45, g[1] - 0.08, lev_pause, lev_pause - lev_speech))

    one = dict(sheet)
    # v4: the palette has no struck sound any more, so the test uses the glint (its anchor is the middle of a
    # 19 ms attack: the waveform peak follows within 25 ms) and the air (was: pop +-5 ms, whoosh +-80 ms)
    one["cues"] = [{"t": 10.0, "sound": "glint", "seed": 1}, {"t": 26.0, "sound": "air", "seed": 1}]
    o = mixer.build(one, None, base)["sfx_raw"]
    t_gl = np.abs(o[:15 * SR]).max(axis=1).argmax() / SR
    env = np.convolve((o[20 * SR:] ** 2).sum(axis=1), np.ones(4800) / 4800.0, "same")
    t_wh = 20.0 + env.argmax() / SR
    check(0.0 <= t_gl - 10.0 <= 0.025 and abs(t_wh - 26.0) <= 0.08,
          "anchors land on t: glint cued at 10.000 s peaks at %.4f s; air cued at 26.00 s is loudest at %.2f s" % (t_gl, t_wh))

    print("--- clicks ---")
    g = np.random.default_rng(0)
    cuts = []
    for name in ("rise", "air", "glow", "room_tone"):   # deliberate hard cuts = clicks (v4 names; was rise / whoosh / dab / room_tone)
        w = np.asarray(sfx.render(name), dtype=np.float64)
        for _ in range(6):
            # cut at the largest sample within 5 ms after a random point (v4: a cut that happens to fall on a
            # zero crossing of a pure tone is no click at all, so the self-test cuts where the waveform is high)
            i = int(len(w) * g.uniform(0.15, 0.7))
            i += int(np.abs(w[i:i + 240]).max(axis=1).argmax()) + 1
            cuts.append(click_score(np.concatenate([w[:i], np.zeros((480, 2))]))[0])
    check(min(cuts) > CLICK_LIMIT and np.median(cuts) > 5 * CLICK_LIMIT,
          "detector self-test: 24 deliberate hard cuts score %.3f-%.3f (median %.3f), all above the limit %g"
          % (min(cuts), max(cuts), float(np.median(cuts)), CLICK_LIMIT))
    # measured on the float render (identical to the files within 1 LSB, see above): 16-bit rounding noise
    # is itself broadband and would mask the detector in near-silent tails
    sfx_f, resid = np.asarray(r["sfx"]), np.asarray(r["mix"]) - np.asarray(r["voice"])
    curve = click_curve(sfx_f)
    sc, at = float(curve.max()), int(np.argmax(curve)) / SR
    check(sc < CLICK_LIMIT, "sfx bus: max click score %.4f at %.3f s (limit %g)" % (sc, at, CLICK_LIMIT))
    worst, wname = 0.0, ""
    for c in rep["cues"]:
        for edge in (c["start"], c["end"]):
            i = int(round(edge * SR))
            lo, hi = max(i - 96, 0), min(i + 96, n_total)
            if hi > lo:
                v = float(curve[lo:hi].max())
                if v > worst:
                    worst, wname = v, "%s @ %.2f s" % (c["sound"], c["t"])
    check(worst < CLICK_LIMIT, "cue boundaries (+-2 ms around every start and end): max click score %.4f (%s)" % (worst, wname))
    # the narration is not ours to judge: test the mix minus the voice, and the mix edges
    sc, at = click_score(resid)
    check(sc < CLICK_LIMIT, "mix minus voice: max click score %.4f at %.3f s" % (sc, at))
    check(np.abs(m16[:48].astype(np.int32)).max() < 40 and np.abs(m16[-48:].astype(np.int32)).max() < 40,
          "mix.wav starts and ends in silence (first/last 1 ms below -58 dBFS)")

    print("--- spectral balance (energy per band, dB re total) ---")
    print("      band top Hz : " + " ".join("%6g" % b[1] for b in meter.BANDS))
    for name, x in (("voice_bus", voicef), ("sfx_bus", sfxf), ("mix", mixf)):
        print("      %-11s : " % name + " ".join("%6.1f" % v for v in meter.band_energies_db(x)))
    be = meter.band_energies_db(sfxf)
    check(be[-1] < -18.0 and be[0] < -10.0, "SFX bus: >10 kHz %.1f dB, <60 Hz %.1f dB re total (no harsh top, no rumble)"
          % (be[-1], be[0]))

    for wmsg in rep["warnings"]:
        print("mixer WARNING: " + wmsg)
    print("=== %s ===" % ("ALL CHECKS PASSED" if not FAILS else "%d CHECK(S) FAILED" % len(FAILS)))
    return 1 if FAILS else 0


if __name__ == "__main__":
    sys.exit(main())
