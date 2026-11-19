#!/usr/bin/env python3
"""mix.py - voice + SFX (beds and events) -> final_audio.wav (48 kHz stereo, exact video length).

  voice : audio48k.wav, repaired before anything else with two local, transparent fixes:
            * declip: every run of full-scale samples (23 L + 18 R samples in 2.617-2.665 s of the
              file) is re-estimated by least-squares AR interpolation (order 32, 15 ms context),
              constrained to stay at or beyond the clip level;
            * de-click: three lip ticks (video 0.534 / 6.429 / 6.432 s) - the exact spike sample is
              found within +-3 ms of each mark on the >3 kHz signal and 0.8 ms around it is
              re-estimated the same way.
          Then trimmed from 1.52 s (video t=0), 10 ms raised-cosine fade-in, 30 ms fade-out at the
          end of the take, zero-phase Butterworth high-pass with its -3 dB point at 70 Hz (4th
          order, forward+backward). No EQ, no compression.
  sfx   : sfx_amb.wav (beds) and sfx_events.wav (events) - the two halves of sfx_bus.wav - are
          ducked separately by the same voice-keyed sidechain:
            beds   3 dB, 250 ms attack ramp that ends at the word (= look-ahead), 1.0 s hold,
                   1.2 s release: every pause in this narration is < 1.2 s, so the beds sit at a
                   steady -3 dB through the whole narration and only come back after the last word.
            events 7 dB, 110 ms attack ramp ending at the word, 200 ms hold, 400 ms release.
          Safety net (events only, max 3 dB): only on 10 ms frames where the narrator is actually
          speaking (VAD p95-40 dB, no spreading into pauses), the events are pulled down by any
          shortfall of the 400 ms voice/SFX ratio below 19 dB RMS / 16 LU K-weighted.
  master: linear gain to -14.0 LUFS integrated (BS.1770-4, gated) followed by a transparent
          look-ahead true-peak limiter (4x oversampled detection, ceiling -1.7 dBTP), iterated
          until the integrated loudness is within 0.02 LU of target.

Writes final_audio.wav, stem_voice_final.wav, stem_sfx_final.wav (= beds + events, post-duck),
stem_amb_final.wav, stem_events_final.wav, stem_sfx_preduck_final.wav (all post master gain and
limiter gain curve), duck_curves.npz and mix_info.json for analyze.py.
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from scipy import signal
from scipy.linalg import solve_toeplitz
from scipy.optimize import lsq_linear
from scipy.ndimage import minimum_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from audiolib import SR, N, integrated_lufs, true_peak_dbtp, true_peak_env  # noqa: E402

VOICE = os.path.join(HERE, "..", "work", "audio48k.wav")
VOICE_OFFSET = 1.52
TARGET_LUFS = -14.0
TP_CEIL_DB = -1.7          # limiter ceiling (spec: <= -1.5 dBTP, 0.2 dB safety)
VAD_DUCK_REL_DB = 30.0     # ducking key: 20 ms RMS above p95 - 30 dB
VAD_STRICT_REL_DB = 40.0   # 'is he speaking' for the safety net and the strict ratio check
BED_DUCK = dict(depth_db=3.0, attack_s=0.25, hold_s=1.0, release_s=1.2)
EV_DUCK = dict(depth_db=7.0, attack_s=0.11, hold_s=0.20, release_s=0.40)
GUARD_RMS_DB = 19.0        # keep SFX >= this many dB under the voice (400 ms RMS) while he speaks
GUARD_K_DB = 16.0          # same, K-weighted (perceptual cross-check)
GUARD_MAX_DB = 3.0
DECLICK_AT_VIDEO_S = [0.534, 6.429, 6.432]   # lip ticks (QA #12), video seconds


# ------------------------------------------------------------------------------- voice repair
def lsar_fill(seg, unknown, p=32, bounds=None):
    """least-squares AR interpolation (Janssen et al.): re-estimate seg[unknown] so that the AR(p)
    prediction error over the whole segment is minimal. AR model from the known samples.
    bounds=(lb, ub) per unknown sample turns it into consistent (bound-constrained) declipping."""
    seg = seg.astype(np.float64)
    known = ~unknown
    v = np.where(known, seg, 0.0) * np.hanning(len(seg))
    r = np.correlate(v, v, "full")[len(v) - 1:len(v) + p]
    r[0] *= 1.0 + 1e-6
    a = solve_toeplitz(r[:p], r[1:p + 1])
    c = np.r_[1.0, -a]
    n = len(seg)
    nrow = n - p
    A = np.zeros((nrow, n))
    for k in range(p + 1):
        A[np.arange(nrow), np.arange(nrow) + p - k] = c[k]
    Au, Ak = A[:, unknown], A[:, known]
    rhs = -(Ak @ seg[known])
    if bounds is None:
        xu, *_ = np.linalg.lstsq(Au, rhs, rcond=None)
    else:
        xu = lsq_linear(Au, rhs, bounds=bounds, method="bvls").x
    out = seg.copy()
    out[unknown] = xu
    return out


def declip(x, thr=0.999, ctx=0.015):
    """returns repaired copy and a log. Clipped samples of a channel are grouped into clusters
    (gaps < 10 ms) and each cluster is re-estimated in one LSAR solve."""
    y = x.copy()
    log = []
    for ch in range(x.shape[1]):
        idx = np.flatnonzero(np.abs(x[:, ch]) >= thr)
        if not len(idx):
            continue
        groups = np.split(idx, np.flatnonzero(np.diff(idx) > N(0.01)) + 1)
        for g in groups:
            a0, b0 = max(0, g[0] - N(ctx)), min(len(x), g[-1] + 1 + N(ctx))
            seg = x[a0:b0, ch]
            unk = np.zeros(len(seg), bool)
            unk[g - a0] = True
            orig = seg[unk]
            lb = np.where(orig > 0, orig, -1.6)          # a clipped sample was at least as large
            ub = np.where(orig > 0, 1.6, orig)           # as the clip level, with the same sign
            new = lsar_fill(seg, unk, bounds=(lb, ub))[unk]
            y[g, ch] = new
            log.append(dict(channel=ch, start_s=round(g[0] / SR, 4), end_s=round(g[-1] / SR, 4), samples=int(len(g)),
                            max_restored_peak=round(float(np.abs(new).max()), 3)))
    return y, log


def declick(x, marks_file_s, search=0.003, half=0.0004):
    y = x.copy()
    sos = signal.butter(4, 3000, "highpass", fs=SR, output="sos")
    h = signal.sosfiltfilt(sos, x.mean(axis=1))
    log = []
    for tm in marks_file_s:
        a, b = N(tm - search), N(tm + search)
        i = a + int(np.argmax(np.abs(h[a:b])))
        a0, b0 = i - N(0.012), i + N(0.012)
        for ch in range(x.shape[1]):
            seg = y[a0:b0, ch]
            unk = np.zeros(len(seg), bool)
            unk[N(0.012) - N(half):N(0.012) + N(half) + 1] = True
            y[a0:b0, ch] = lsar_fill(seg, unk)
        hb = signal.sosfiltfilt(sos, y.mean(axis=1)[a0:b0])
        log.append(dict(mark_video_s=round(tm - VOICE_OFFSET, 3), spike_video_s=round(i / SR - VOICE_OFFSET, 4),
                        hf_peak_before=round(float(np.abs(h[i])), 4),
                        hf_peak_after=round(float(np.abs(hb[N(0.012) - 24:N(0.012) + 25]).max()), 4)))
    return y, log


# ------------------------------------------------------------------------------- ducking
def voice_activity(v, rel_db, cr=1000):
    """voice activity at control rate cr, from 20 ms RMS vs (p95 - rel_db), floor -55 dBFS."""
    hop = SR // cr
    k = N(0.02)
    env = np.sqrt(np.convolve(v ** 2, np.ones(k) / k, "same"))[::hop]
    edb = 20 * np.log10(env + 1e-9)
    ref = np.percentile(edb[edb > -70], 95)
    thr = max(ref - rel_db, -55.0)
    return edb > thr, thr


def duck_curve(act, depth_db, attack_s, hold_s, release_s, n_out, cr=1000):
    """gain reduction (dB, per output sample). The reduction ramps up linearly over attack_s and is
    at full depth exactly when the voice starts (the ramp is the look-ahead), holds for hold_s after
    the voice stops, then recovers with a one-pole release (time constant release_s)."""
    a = act.astype(float)
    H = int(hold_s * cr)
    held = (np.convolve(a, np.ones(H + 1))[:len(a)] > 0.5).astype(float)   # held[i] = max(a[i-H..i])
    A = max(1, int(attack_s * cr))
    ramp = np.linspace(1.0, 0.0, A + 1)
    pre = np.zeros_like(held)
    for k in range(A + 1):                          # r[i] = max_k held[i+k] * (1 - k/A)
        pre[:len(held) - k] = np.maximum(pre[:len(held) - k], held[k:] * ramp[k])
    tgt = depth_db * pre
    red = np.zeros_like(tgt)
    ar = np.exp(-1.0 / (release_s * cr))
    r = 0.0
    for i, tg in enumerate(tgt):
        r = tg if tg >= r else ar * r + (1 - ar) * tg
        red[i] = r
    k = int(0.02 * cr)                              # 20 ms raised-cosine smoothing of the corners
    w = np.hanning(2 * k + 3)[1:-1]
    red = np.convolve(np.pad(red, k, mode="edge"), w / w.sum(), "valid")
    return np.interp(np.arange(n_out) / SR, np.arange(len(red)) / cr, red)


def _one_pole(target, attack, release, cr):
    out = np.zeros_like(target)
    aa, ar = np.exp(-1.0 / (attack * cr)), np.exp(-1.0 / (release * cr))
    r = 0.0
    for i, tg in enumerate(target):
        co = aa if tg > r else ar
        r = co * r + (1 - co) * tg
        out[i] = r
    return out


def event_guard(voice, sfx_total, n_out):
    """extra EVENT attenuation (dB per sample): only on frames where he is speaking (strict VAD,
    10 ms frames), by the shortfall of the 400 ms window centred on that frame; max GUARD_MAX_DB."""
    from audiolib import window_rms_db, window_loudness
    cr = 100
    hop = 1.0 / cr
    act100, _ = voice_activity(voice.mean(axis=1), VAD_STRICT_REL_DB, cr)
    tw, vdb = window_rms_db(voice, 0.4, hop)
    _, sdb = window_rms_db(sfx_total, 0.4, hop)
    _, vl = window_loudness(voice, 0.4, hop)
    _, sl = window_loudness(sfx_total, 0.4, hop)
    need = np.maximum(sdb - (vdb - GUARD_RMS_DB), sl - (vl - GUARD_K_DB))
    fr = np.clip(np.round(tw * cr).astype(int), 0, len(act100) - 1)
    need = np.where(act100[fr], np.clip(need, 0, GUARD_MAX_DB), 0.0)
    grid = np.arange(0, n_out / SR + hop, hop)
    tgt = np.interp(grid, tw, need, left=0, right=0)
    sm = np.maximum(_one_pole(tgt, 0.02, 0.04, cr), _one_pole(tgt[::-1], 0.02, 0.02, cr)[::-1])
    return np.interp(np.arange(n_out) / SR, grid, sm)


# ------------------------------------------------------------------------------- master
def tp_limiter_gain(x, ceil_db=TP_CEIL_DB, attack_ms=2.0, release_ms=60.0):
    """look-ahead true-peak limiter gain curve. Guaranteed g[n]*tp[n] <= ceiling."""
    c = 10 ** (ceil_db / 20)
    tp = true_peak_env(x)
    r = np.minimum(1.0, c / np.maximum(tp, 1e-12))
    if r.min() >= 1.0:
        return np.ones(len(x))
    W = max(1, int(attack_ms * 1e-3 * SR))
    gmin = minimum_filter1d(r, size=2 * W + 1, mode="nearest")
    win = np.hanning(2 * W + 3)[1:-1]
    win /= win.sum()
    g = np.convolve(np.pad(gmin, W, mode="edge"), win, "valid")
    g = np.minimum(g, gmin)
    a = np.exp(-1.0 / (release_ms * 1e-3 * SR))
    idx = np.nonzero(g < 1.0)[0]
    out = g.copy()
    if len(idx):
        y = 1.0
        start = idx[0]
        stop = min(len(g), idx[-1] + int(10 * release_ms * 1e-3 * SR))
        for i in range(start, stop):
            y = min(g[i], a * y + (1 - a))
            out[i] = y
    return out


def _regions(gdb, thr=0.5):
    on = gdb > thr
    edges = np.flatnonzero(np.diff(np.r_[0, on.astype(int), 0]))
    return [[round(a / SR, 2), round(b / SR, 2), round(float(gdb[a:b].max()), 1)]
            for a, b in zip(edges[::2], edges[1::2])]


def main():
    cues = json.load(open(os.path.join(HERE, "cues.json")))
    D = float(cues["duration"])
    NT = N(D)

    # ---------------- voice ----------------
    v, sr = sf.read(VOICE, always_2d=True)
    assert sr == SR
    if v.shape[1] == 1:
        v = np.repeat(v, 2, axis=1)
    v = v.astype(np.float64)
    v, clip_log = declip(v)
    v, click_log = declick(v, [t + VOICE_OFFSET for t in DECLICK_AT_VIDEO_S])
    v = v[N(VOICE_OFFSET):]
    v[:N(0.01)] *= (0.5 - 0.5 * np.cos(np.pi * np.arange(N(0.01)) / N(0.01)))[:, None]
    k = N(0.03)
    v[-k:] *= (0.5 + 0.5 * np.cos(np.pi * (np.arange(k) + 1) / k))[:, None]
    fc_hp = 70.0 * (np.sqrt(2.0) - 1.0) ** (1.0 / 8.0)   # fwd+bwd squares |H|: -3 dB at 70 Hz
    sos = signal.butter(4, fc_hp, "highpass", fs=SR, output="sos")
    v = signal.sosfiltfilt(sos, v, axis=0)
    voice = np.zeros((NT, 2))
    m = min(NT, len(v))
    voice[:m] = v[:m]

    # ---------------- sfx: beds and events, ducked separately ----------------
    rd = lambda f: sf.read(os.path.join(HERE, f), always_2d=True)  # noqa: E731
    (amb, s1), (ev, s2), (bus, s3) = rd("sfx_amb.wav"), rd("sfx_events.wav"), rd("sfx_bus.wav")
    assert s1 == s2 == s3 == SR and len(amb) == len(ev) == len(bus) == NT
    bus_err = float(np.abs(amb + ev - bus).max())
    assert bus_err < 1e-5, bus_err   # sfx_bus.wav == beds + events (float32 rounding only)
    act, thr = voice_activity(voice.mean(axis=1), VAD_DUCK_REL_DB)
    bed_db = duck_curve(act, n_out=NT, **BED_DUCK)
    ev_db = duck_curve(act, n_out=NT, **EV_DUCK)
    amb_d = amb * 10 ** (-bed_db / 20)[:, None]
    ev_d = ev * 10 ** (-ev_db / 20)[:, None]
    guard_db = np.zeros(NT)
    for _ in range(3):   # iterate: the windows overlap
        add_db = event_guard(voice, amb_d + ev_d * 10 ** (-guard_db / 20)[:, None], NT)
        if add_db.max() < 0.05:
            break
        guard_db = np.minimum(guard_db + add_db, GUARD_MAX_DB)
    ev_d = ev_d * 10 ** (-guard_db / 20)[:, None]
    sfx_d = amb_d + ev_d

    mix = voice + sfx_d

    # ---------------- loudness + true-peak ----------------
    gain_db = TARGET_LUFS - integrated_lufs(mix)
    for it in range(8):
        g = 10 ** (gain_db / 20)
        lim = tp_limiter_gain(mix * g)
        out = mix * g * lim[:, None]
        L = integrated_lufs(out)
        if abs(L - TARGET_LUFS) < 0.02:
            break
        gain_db += TARGET_LUFS - L
    tp = true_peak_dbtp(out)
    assert tp <= -1.5, tp
    assert len(out) == NT

    sf.write(os.path.join(HERE, "final_audio.wav"), out.astype(np.float32), SR, subtype="PCM_24")
    gl = (g * lim)[:, None]
    for name, data in (("stem_voice_final.wav", voice), ("stem_sfx_final.wav", sfx_d), ("stem_amb_final.wav", amb_d),
                       ("stem_events_final.wav", ev_d), ("stem_sfx_preduck_final.wav", amb + ev)):
        sf.write(os.path.join(HERE, name), (data * gl).astype(np.float32), SR, subtype="FLOAT")
    dec = SR // 1000
    np.savez_compressed(os.path.join(HERE, "duck_curves.npz"), t=np.arange(0, NT, dec) / SR, bed_db=bed_db[::dec],
                        ev_db=ev_db[::dec], guard_db=guard_db[::dec], vad=np.repeat(act, 1)[:len(bed_db[::dec])])
    gr = -20 * np.log10(lim)
    narr = (np.arange(NT) > N(0.6)) & (np.arange(NT) < N(54.2))
    info = dict(target_lufs=TARGET_LUFS, measured_lufs=round(L, 3), true_peak_dbtp=round(tp, 3),
                master_gain_db=round(gain_db, 3), iterations=it + 1, bus_equals_beds_plus_events_max_err=bus_err,
                limiter=dict(ceiling_dbtp=TP_CEIL_DB, max_gr_db=round(float(gr.max()), 3),
                             samples_gr_over_0_1db=int((gr > 0.1).sum()),
                             pct_time_gr_over_0_1db=round(100 * float((gr > 0.1).mean()), 4),
                             pct_time_gr_over_0_5db=round(100 * float((gr > 0.5).mean()), 4)),
                vad=dict(duck_key_rel_db=VAD_DUCK_REL_DB, duck_key_threshold_dbfs=round(float(thr), 2),
                         strict_rel_db=VAD_STRICT_REL_DB),
                bed_duck=dict(BED_DUCK, range_during_narration_db=[round(float(bed_db[narr].min()), 2),
                                                                   round(float(bed_db[narr].max()), 2)]),
                event_duck=dict(EV_DUCK, pct_time_over_6db=round(100 * float((ev_db > 6).mean()), 2)),
                guard=dict(applies_to="events only, frames where he speaks (strict VAD), no spreading",
                           rms_target_db=GUARD_RMS_DB, k_target_db=GUARD_K_DB, max_db=GUARD_MAX_DB,
                           max_applied_db=round(float(guard_db.max()), 2),
                           pct_time_active_over_0_5db=round(100 * float((guard_db > 0.5).mean()), 2),
                           regions=_regions(guard_db)),
                voice=dict(offset_s=VOICE_OFFSET, fade_in_s=0.01, highpass_minus3db_hz=70,
                           highpass="zero-phase Butterworth, 4th order fwd+bwd (48 dB/oct)",
                           declip=clip_log, declick=click_log))
    json.dump(info, open(os.path.join(HERE, "mix_info.json"), "w"), indent=1)
    print(json.dumps({k: v for k, v in info.items() if k != "voice"}, indent=1))
    print("declip:", clip_log)
    print("declick:", click_log)


if __name__ == "__main__":
    main()
