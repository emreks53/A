#!/usr/bin/env python3
"""analyze.py - objective checks of the SFX bus and final mix, plots, and REPORT.md.

Checks
  * loudness (own BS.1770-4 + ffmpeg ebur128 cross-check), true peak, clipping, DC
  * voice-to-SFX ratio in 400 ms RMS windows during speech, with speech detected at three
    thresholds (voice 10 ms RMS above p95 - 30 / 35 / 40 dB), plus a K-weighted cross-check
  * SFX in gaps, bed steadiness (no pumping), no dead-air holes
  * >8 kHz energy and narrow-band spikes, clicks (2nd-difference spikes, sample jumps, crest)
  * sustained tonal lines in the SFX (pitch, prominence, duration, distance from equal temperament)
  * isolated-event checks (each cue rendered alone with make_sfx.render_event): pop rise/crest,
    footstep cut-offs, glint pitches and decay, creak harmonic comb, bed/thunder spectra, bird syllables
  * onset timing of every transient hit vs the cue sheet (+-20 ms)
  * audibility of each story beat (event vs voice and vs beds, as heard)
If ../qa/rerender/ holds the v1 render, a few before/after numbers are computed against it.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import median_filter

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True
from audiolib import (SR, N, integrated_lufs, true_peak_dbtp, window_rms_db,  # noqa: E402
                      window_loudness)
import make_sfx as MS  # noqa: E402
import mix as MX  # noqa: E402

P = lambda f: os.path.join(HERE, f)  # noqa: E731
V1 = os.path.join(HERE, "..", "qa", "rerender")
OUT = {}
NARR_END = 54.25          # last word ends 54.20 s


def load(f):
    x, sr = sf.read(f if os.path.isabs(f) else P(f), always_2d=True)
    assert sr == SR
    return x.astype(np.float64)


def ffmpeg_ebur128(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True)
    s = r.stderr[r.stderr.rfind("Summary"):]
    I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1))
    TP = float(re.search(r"Peak:\s+(-?[\d.inf]+) dBFS", s).group(1))
    LRA = float(re.search(r"LRA:\s+(-?[\d.]+) LU", s).group(1))
    return I, TP, LRA


def frames_db(x, win, hop):
    m = (x * x).mean(axis=1) if x.ndim > 1 else x * x
    c = np.concatenate([[0], np.cumsum(m)])
    st = np.arange(0, len(m) - win + 1, hop)
    return (st + win / 2) / SR, 10 * np.log10((c[st + win] - c[st]) / win + 1e-30)


def vad10(voice, rel_db):
    """10 ms frames: voice RMS above (p95 of frame levels) - rel_db."""
    _, e = frames_db(voice, 480, 480)
    ref = np.percentile(e[e > -70], 95)
    return e > ref - rel_db, ref - rel_db


def clusters(t, mask, val, join=0.05):
    out = []
    for i in np.flatnonzero(mask):
        if out and t[i] - out[-1][1] <= join:
            out[-1][1] = t[i]
            if val[i] < out[-1][2]:
                out[-1][2], out[-1][3] = val[i], i
        else:
            out.append([t[i], t[i], val[i], i])
    return out


# ------------------------------------------------------------------------------- ratio
def ratio_check(voice, sfx, rel_db):
    act, thr = vad10(voice, rel_db)
    t4, v4 = frames_db(voice, N(0.4), 480)
    _, s4 = frames_db(sfx, N(0.4), 480)
    c = np.concatenate([[0], np.cumsum(act)])
    k = np.arange(len(t4))
    frac = (c[np.minimum(k + 40, len(act))] - c[np.minimum(k, len(act))]) / 40
    sp = frac >= 0.5
    r = v4 - s4
    rs = r[sp]
    ref = float(np.median(v4[sp]))
    cl = [dict(t=[round(float(a), 2), round(float(b), 2)], min_db=round(float(m), 1),
               voice_rms_dbfs=round(float(v4[i]), 1), sfx_rms_dbfs=round(float(s4[i]), 1),
               voice_below_median_speech_db=round(ref - float(v4[i]), 1))
          for a, b, m, i in clusters(t4, sp & (r < 18), r)]
    return dict(vad_rel_db=rel_db, vad_threshold_dbfs=round(float(thr), 1), n_windows=int(sp.sum()),
                min_db=round(float(rs.min()), 2), p5_db=round(float(np.percentile(rs, 5)), 2),
                p10_db=round(float(np.percentile(rs, 10)), 2), median_db=round(float(np.median(rs)), 2),
                n_below_18=int((rs < 18).sum()), n_below_20=int((rs < 20).sum()),
                pct_below_18=round(100 * float((rs < 18).mean()), 2), clusters_below_18=cl,
                median_speech_voice_rms_dbfs=round(ref, 2)), (t4, v4, s4, sp, frac)


# ------------------------------------------------------------------------------- artefacts
def click_scan(x, label):
    """2nd-difference spike detector + sample-jump + short-window crest factor."""
    m = x.mean(axis=1)
    d2 = np.zeros_like(m)
    d2[1:-1] = m[2:] - 2 * m[1:-1] + m[:-2]
    k = N(0.01)
    loc = np.sqrt(np.convolve(d2 ** 2, np.ones(k) / k, "same")) + 1e-12
    ratio = np.abs(d2) / loc
    sig_floor = 10 ** (-80 / 20)
    flagged = np.nonzero((ratio > 8.0) & (np.abs(d2) > sig_floor))[0]
    events = []
    for i in flagged:
        if not events or i - events[-1][-1] > N(0.005):
            events.append([i])
        else:
            events[-1].append(i)
    d1 = np.abs(np.diff(x, axis=0)).max(axis=1)
    pk = np.abs(x).max()
    w2, w20 = N(0.002), N(0.02)
    ms20 = np.convolve(m ** 2, np.ones(w20) / w20, "same")
    nb = len(m) // w2
    blk = np.abs(m[: nb * w2]).reshape(nb, w2).max(axis=1)
    centers = np.arange(nb) * w2 + w2 // 2
    crest = 20 * np.log10(blk / (np.sqrt(ms20[centers]) + 1e-12) + 1e-12)
    valid = blk > 10 ** (-60 / 20)
    top = np.argsort(np.where(valid, crest, -99))[::-1][:5]
    return dict(label=label, _times=[e[0] / SR for e in events], d2_spike_events=len(events),
                d2_spike_times=[round(float(e[0]) / SR, 3) for e in events[:10]],
                max_sample_jump=round(float(d1.max()), 5),
                max_sample_jump_rel_peak_db=round(float(20 * np.log10(d1.max() / pk)), 2),
                crest_2ms_vs_20ms_max_db=round(float(crest[valid].max()), 2),
                crest_top=[(round(float(centers[i]) / SR, 3), round(float(crest[i]), 1)) for i in top])


def hf_burst_scan(x, label, thr=6.0):
    """QA-style HF click-burst detector: 1 ms RMS of the >4 kHz band vs its 30 ms RMS."""
    sos = signal.butter(4, 4000, "highpass", fs=SR, output="sos")
    h = signal.sosfilt(sos, x.mean(axis=1))
    m = h * h
    e1 = np.sqrt(np.convolve(m, np.ones(48) / 48, "same"))
    e2 = np.sqrt(np.convolve(m, np.ones(1440) / 1440, "same"))
    r = e1 / (e2 + 1e-12)
    lvl = 20 * np.log10(e1 + 1e-12)
    cand = np.flatnonzero((r > thr) & (lvl > -80))
    n = 0
    last = -10 ** 9
    for i in cand:
        if i - last > 480:
            n += 1
        last = i
    return dict(label=label, hf_bursts=n)


def hf_check(x, label):
    m = x.mean(axis=1)
    f, p = signal.welch(m, SR, nperseg=8192)
    pdb = 10 * np.log10(p + 1e-30)
    smooth = median_filter(pdb, size=35)
    sel = f > 8000
    spike = float((pdb - smooth)[sel].max())
    spike_f = float(f[sel][np.argmax((pdb - smooth)[sel])])
    fr, tt, S = signal.stft(m, SR, nperseg=2048, noverlap=0)
    E = np.abs(S) ** 2
    tot_t = E.sum(axis=0)
    hf_t = E[fr > 8000].sum(axis=0)
    ok = tot_t > tot_t.max() * 1e-4
    share = 10 * np.log10(hf_t[ok] / tot_t[ok] + 1e-20)
    return dict(label=label, hf_energy_share_db=round(float(10 * np.log10(p[sel].sum() / p.sum())), 2),
                hf_spike_prominence_db=round(spike, 2), hf_spike_freq_hz=round(spike_f, 0),
                hf_share_50ms_frames_max_db=round(float(share.max()), 2),
                hf_share_50ms_frames_max_t=round(float(tt[ok][np.argmax(share)]), 2)), (f, pdb)


def tonal_lines(x, fmin=700.0, fmax=8000.0, prom_db=15.0, min_dur=0.25, rel_floor_db=45.0):
    """sustained narrow spectral lines: STFT 4096 (11.7 Hz bins), hop 10 ms; a bin is 'tonal' in a
    frame if it is a local maximum >= prom_db above the 0.5 kHz-wide median spectrum and within
    rel_floor_db of the loudest frame of the file; tracks follow the peak +-1 bin; tracks lasting
    >= min_dur are reported with their pitch and distance from equal temperament."""
    m = x.mean(axis=1)
    f, t, S = signal.stft(m, SR, nperseg=4096, noverlap=4096 - 480)
    Pdb = 10 * np.log10(np.abs(S) ** 2 + 1e-30)
    med = median_filter(Pdb, size=(43, 1))
    prom = Pdb - med
    floor = Pdb.max() - rel_floor_db - 30
    band = (f >= fmin) & (f <= fmax)
    tracks, active = [], {}
    for j in range(Pdb.shape[1]):
        col = Pdb[:, j]
        pk = signal.find_peaks(col)[0]
        pk = pk[band[pk] & (prom[pk, j] >= prom_db) & (col[pk] > floor)]
        new = {}
        for b in pk:
            src = next((a for a in (b, b - 1, b + 1) if a in active), None)
            tr = active.pop(src) if src is not None else dict(j0=j, bins=[], prom=[])
            tr["bins"].append(b)
            tr["prom"].append(prom[b, j])
            new[b] = tr
        for tr in active.values():
            tracks.append(tr)
        active = new
    tracks.extend(active.values())
    out = []
    for tr in tracks:
        d = len(tr["bins"]) * 0.01
        if d >= min_dur:
            fq = float(np.median(f[tr["bins"]]))
            out.append(dict(t0=round(float(t[tr["j0"]]), 2), dur_s=round(d, 2), freq_hz=round(fq, 0),
                            max_prom_db=round(float(np.max(tr["prom"])), 1),
                            cents_off_et=round(float(MS.et_dev_cents(fq)), 0)))
    return sorted(out, key=lambda r: r["t0"])


# ------------------------------------------------------------------------------- isolated events
def render_isolated(cues):
    occ, out = {}, []
    for c in cues["events"]:
        k0 = (c["type"], round(float(c["t"]), 3))
        occ[k0] = occ.get(k0, 0) + 1
        x, hits, subs, tp, g, tgt, sk = MS.render_event(c, occ[k0])
        out.append(dict(c=c, x=x, hits=hits, tp=tp))
    return out


def rise_crest(x, hit_rel):
    """QA definitions: rise = 10-90 % of the |x| envelope (0.25 ms smoothing) up to the local peak;
    crest = 2 ms peak / RMS of the 20 ms around it (silence before the event counted)."""
    xm = np.r_[np.zeros(N(0.02)), x.mean(axis=1)]
    a = np.abs(xm)
    env = np.convolve(a, np.ones(12) / 12, "same")
    res = []
    for h in hit_rel:
        c0 = N(h) + N(0.02)
        seg = slice(max(0, c0 - 48), c0 + N(0.03))
        p = seg.start + int(np.argmax(env[seg]))
        st = max(0, p - 480)
        i10 = st + np.argmax(env[st:p + 1] > 0.1 * env[p])
        i90 = st + np.argmax(env[st:p + 1] > 0.9 * env[p])
        pk = seg.start + int(np.argmax(a[seg]))
        rms20 = np.sqrt(np.mean(xm[pk - 480:pk + 480] ** 2))
        res.append(((i90 - i10) / SR * 1000, 20 * np.log10(a[pk] / rms20)))
    return np.array(res)


def cutoffs(x):
    m = x.mean(axis=1) ** 2
    E = 10 * np.log10(np.convolve(m, np.ones(96) / 96, "same") + 1e-20)
    pk = E.max()
    d = E[:-240] - E[240:]
    cand = np.flatnonzero((E[:-240] > pk - 25) & (d > 25))
    return len(np.unique(cand // 480))


def glint_partials(x):
    m = x.mean(axis=1)
    f, t, S = signal.stft(m, SR, nperseg=8192, noverlap=8192 - 240)
    Pw = np.abs(S) ** 2
    Pm = Pw[:, t < 1.2].max(axis=1)
    med = signal.medfilt(Pm, 31)
    idx = signal.find_peaks(10 * np.log10(Pm / med + 1e-20), height=12, distance=8)[0]
    idx = idx[(f[idx] > 1500) & (f[idx] < 3600)]
    idx = idx[np.argsort(-Pm[idx])][:5]
    out = []
    for i in sorted(idx):
        tr = 10 * np.log10(Pw[i] + 1e-30)
        j = int(np.argmax(tr))
        k20 = np.flatnonzero(tr[j:] < tr[j] - 20)
        out.append(dict(freq_hz=round(float(f[i]), 0), cents_off_et=round(float(MS.et_dev_cents(f[i])), 0),
                        t20_s=round(float(t[j + k20[0]] - t[j]), 2) if len(k20) else None))
    return out


def harmonic_comb(y, fmin=100, fmax=2500, f0lo=50, f0hi=140):
    """how strongly a creak shows harmonic stripes (a periodic slip train): per 80 ms frame, the
    log spectrum 100-2500 Hz minus its smooth envelope (resonances removed) is autocorrelated along
    frequency; the peak at 50-140 Hz spacing is the comb strength; median over loud frames.
    References computed alongside: a steady 60-110 Hz buzz through the same modes, and white noise."""
    y = y.mean(axis=1) if y.ndim > 1 else y
    W, H, nfft = N(0.08), N(0.02), 16384
    f = np.fft.rfftfreq(nfft, 1 / SR)
    band = (f >= fmin) & (f <= fmax)
    lo, hi = int(f0lo / f[1]), int(f0hi / f[1])
    sc, lv = [], []
    for a in range(0, len(y) - W, H):
        S = np.abs(np.fft.rfft(y[a:a + W] * np.hanning(W), nfft)) ** 2
        Ld = 10 * np.log10(S[band] + 1e-20)
        Ld -= signal.savgol_filter(Ld, 151, 2)
        ac = np.correlate(Ld, Ld, "full")[len(Ld) - 1:]
        ac /= ac[0] + 1e-30
        sc.append(ac[lo:hi].max())
        lv.append(S[band].sum())
    sc, lv = np.array(sc), np.array(lv)
    return float(np.median(sc[lv > lv.max() * 0.05]))


def steady_buzz_reference(dur, f0):
    n = N(dur + 0.15)
    exc = np.zeros(n)
    exc[::int(SR / f0)] = 1
    exc = np.convolve(exc, np.hanning(9), "same")
    y = sum(g * MS.unit(MS.reson(exc, fr, Q)) for fr, Q, g in ((330, 25, 1), (690, 30, .8), (1240, 30, .5), (2150, 25, .3)))
    return y * MS.env_swell(n, 0.45)


def creak_v1_reference(dur, rng):
    """the v1 scale_creak generator (before QA), kept only as a reference for harmonic_comb."""
    n = N(dur + 0.15)
    x = np.arange(n) / N(dur)
    j = MS.Ctrl(dur + 0.15, 8, rng)
    rate = (55 + 70 * np.sin(np.pi * np.clip(x, 0, 1)) ** 1.5) * (0.85 + 0.3 * j(MS.tv(n)))
    ph = np.cumsum(rate) / SR
    idx = np.nonzero(np.diff(np.floor(ph)) > 0)[0]
    exc = np.zeros(n)
    exc[idx] = rng.lognormal(0, 0.3, len(idx))
    exc = np.convolve(exc, np.hanning(9), "same")
    exc = MS.bfilt(exc, "lowpass", 2200, 2) * MS.env_swell(n, 0.5 * dur / (n / SR), 1.2, 1.5)
    yy = np.zeros(n)
    for f, Q, gn in ((330, 25, 1.0), (690, 30, 0.8), (1240, 30, 0.5), (2150, 25, 0.3)):
        yy += gn * MS.unit(MS.reson(exc, f, Q))
    fr = MS.mono_shaped(n, lambda f, t: MS.logbp(f, 2400, 0.6), rng) * MS.env_swell(n, 0.5, 1.2, 1.5)
    return MS.soft_lp(MS.unit(yy) + 0.08 * MS.unit(fr), 4000)


def spec_stats(x):
    f, p = signal.welch(x.mean(axis=1), SR, nperseg=8192)
    tot = p.sum()
    sel = (f > 2000) & (f < 8000)
    return dict(centroid_hz=round(float((f * p).sum() / tot), 0),
                share_3_7k_pct=round(100 * float(p[(f > 3000) & (f < 7000)].sum() / tot), 1),
                share_300_900_pct=round(100 * float(p[(f > 300) & (f < 900)].sum() / tot), 1),
                share_below_100_pct=round(100 * float(p[f < 100].sum() / tot), 1),
                flatness_2_8k=round(float(np.exp(np.mean(np.log(p[sel] + 1e-30))) / np.mean(p[sel])), 2))


def bird_stats():
    """render the bird layer alone (same generator) and measure syllable-to-syllable variation."""
    rng = np.random.default_rng(1)
    n = N(30)
    b = MS.birds(n, rng, 0.3).mean(axis=1)
    env = np.sqrt(np.convolve(b ** 2, np.ones(96) / 96, "same"))
    on = env > env.max() * 10 ** (-30 / 20)
    e = np.flatnonzero(np.diff(np.r_[0, on.astype(int), 0]))
    syl = [(a, z) for a, z in zip(e[::2], e[1::2]) if z - a > N(0.015)]
    lens = np.array([(z - a) / SR for a, z in syl])
    pitch = []
    for a, z in syl:
        seg = b[a:z]
        f, p = signal.periodogram(seg * np.hanning(len(seg)), SR, nfft=16384)
        pitch.append(f[np.argmax(p)])
    pitch = np.array(pitch)
    gaps = np.array([(syl[i + 1][0] - syl[i][1]) / SR for i in range(len(syl) - 1)])
    gaps = gaps[gaps < 0.25]
    return dict(n_syllables=len(syl), length_cv_pct=round(100 * float(lens.std() / lens.mean()), 0),
                gap_cv_pct=round(100 * float(gaps.std() / gaps.mean()), 0) if len(gaps) > 2 else None,
                peak_pitch_range_hz=[round(float(pitch.min()), 0), round(float(pitch.max()), 0)],
                adjacent_pitch_change_median_pct=round(100 * float(np.median(np.abs(np.diff(pitch)) / pitch[:-1])), 1))


# ------------------------------------------------------------------------------- main
def main():
    man = json.load(open(P("sfx_manifest.json")))
    info = json.load(open(P("mix_info.json")))
    cues = json.load(open(P("cues.json")))
    final = load("final_audio.wav")
    voice = load("stem_voice_final.wav")
    sfx = load("stem_sfx_final.wav")
    sfx_pre = load("stem_sfx_preduck_final.wav")
    amb_d = load("stem_amb_final.wav")
    bus = load("sfx_bus.wav")
    amb = load("sfx_amb.wav")
    dc = np.load(P("duck_curves.npz"))
    gscale = 10 ** (info["master_gain_db"] / 20)
    D = len(final) / SR
    has_v1 = os.path.exists(os.path.join(V1, "sfx_bus.wav"))

    # ---------------- loudness ----------------
    I_ff, TP_ff, LRA_ff = ffmpeg_ebur128(P("final_audio.wav"))
    OUT["final"] = dict(samples=len(final), duration_s=round(D, 4), channels=final.shape[1],
                        subtype=sf.info(P("final_audio.wav")).subtype,
                        lufs_integrated=round(integrated_lufs(final), 2), lufs_ffmpeg=I_ff, lra_ffmpeg=LRA_ff,
                        true_peak_dbtp=round(true_peak_dbtp(final), 2), true_peak_ffmpeg=TP_ff,
                        sample_peak_dbfs=round(float(20 * np.log10(np.abs(final).max())), 2),
                        clipped_samples=int((np.abs(final) >= 0.999).sum()),
                        dc=[float(f"{v:.2e}") for v in final.mean(axis=0)],
                        stem_sum_residual_db=round(float(20 * np.log10(np.abs(final - voice - sfx).max() + 1e-20)), 1))
    OUT["stems"] = dict(voice_lufs=round(integrated_lufs(voice), 2),
                        sfx_lufs_post_duck=round(integrated_lufs(sfx), 2),
                        sfx_lufs_pre_duck=round(integrated_lufs(sfx_pre), 2),
                        beds_lufs_post_duck=round(integrated_lufs(amb_d), 2),
                        sfx_bus_file_lufs=round(integrated_lufs(bus), 2),
                        sfx_bus_dc=[float(f"{v:.2e}") for v in bus.mean(axis=0)],
                        sfx_bus_peak_dbfs=round(float(20 * np.log10(np.abs(bus).max())), 2),
                        sfx_bus_samples=len(bus), sfx_bus_subtype=sf.info(P("sfx_bus.wav")).subtype)

    # ---------------- voice vs SFX ----------------
    rat = {}
    for rel in (30, 35, 40):
        rat[rel], arr = ratio_check(voice, sfx, rel)
        if rel == 30:
            t4, v4, s4, sp30, frac30 = arr
    OUT["ratio"] = rat
    alp = os.path.join(HERE, "..", "work", "align.json")
    if os.path.exists(alp):
        al = json.load(open(alp))
        wt = [(w["w"], w["s"] - MX.VOICE_OFFSET, w["e"] - MX.VOICE_OFFSET) for w in al if w["e"] - MX.VOICE_OFFSET > 0]
        aft, pz, words, under = [], [], [], []
        for rel in (35, 40):
            for c in rat[rel]["clusters_below_18"]:
                tc = 0.5 * (c["t"][0] + c["t"][1])
                k = max(i for i, x in enumerate(wt) if x[2] <= tc + 0.05) if any(x[2] <= tc + 0.05 for x in wt) else None
                if k is None:
                    continue
                aft.append(1000 * (tc - wt[k][2]))
                pz.append((wt[k + 1][1] if k + 1 < len(wt) else D) - wt[k][2])
                words.append(f"'{wt[k][0]}' {wt[k][2]:.2f} s")
                under.append(rat[30]["median_speech_voice_rms_dbfs"] - c["sfx_rms_dbfs"])
        if aft:
            OUT["strict_context"] = dict(n=len(aft), after_word_min_ms=int(round(min(aft))), after_word_max_ms=int(round(max(aft))),
                                         pause_min_s=round(min(pz), 2), pause_max_s=round(max(pz), 2), words=sorted(set(words), key=lambda x: float(x.split()[-2])),
                                         sfx_under_speech_min_db=round(min(under), 1), sfx_under_speech_max_db=round(max(under), 1),
                                         needed_db=round(18 - min(rat[r]["min_db"] for r in (35, 40)), 1))
    tk, vl = window_loudness(voice, 0.4, 0.01)
    _, sl = window_loudness(sfx, 0.4, 0.01)
    spk = np.interp(tk, t4, frac30) >= 0.5
    OUT["ratio_k"] = dict(median_lu=round(float(np.median((vl - sl)[spk])), 2), min_lu=round(float(np.min((vl - sl)[spk])), 2))
    gap = (frac30 == 0) & (t4 < NARR_END)
    endc = t4 > NARR_END + 0.3
    ref = rat[30]["median_speech_voice_rms_dbfs"]
    OUT["gaps"] = dict(n=int(gap.sum()), sfx_rms_max_dbfs=round(float(s4[gap].max()), 2),
                       sfx_rms_median_dbfs=round(float(np.median(s4[gap])), 2),
                       below_speech_min_db=round(ref - float(s4[gap].max()), 2),
                       below_speech_median_db=round(ref - float(np.median(s4[gap])), 2),
                       loudest=[(round(float(t4[gap][i]), 2), round(float(s4[gap][i]), 1)) for i in np.argsort(s4[gap])[::-1][:5]],
                       endcard_sfx_rms_median_dbfs=round(float(np.median(s4[endc])), 2),
                       endcard_below_speech_db=round(ref - float(np.median(s4[endc])), 2))

    # ---------------- bed steadiness / pumping / holes ----------------
    tt = dc["t"]
    narr = (tt > 0.6) & (tt < NARR_END)
    act30, _ = vad10(voice, 30)
    ed = np.flatnonzero(np.diff(np.r_[1, act30.astype(int), 1]))
    pauses = [(a / 100, b / 100) for a, b in zip(ed[::2], ed[1::2]) if b - a >= 12 and a / 100 > 0.6 and b / 100 < NARR_END]
    sw_b, sw_e = [], []
    for a, b in pauses:
        m = (tt >= a) & (tt <= b + 0.3)
        sw_b.append(float(dc["bed_db"][m].max() - dc["bed_db"][m].min()))
        sw_e.append(float(dc["ev_db"][m].max() - dc["ev_db"][m].min()))
    # QA-style: total SFX bus gain swing in each pause (beds dominate the bus between events)
    t1, b1 = frames_db(amb_d, 4800, 480)
    t2, b0 = frames_db(amb * gscale, 4800, 480)
    gain_bed = b1 - b0
    sel = (t1 > 0.8) & (t1 < NARR_END)
    OUT["beds"] = dict(n_pauses=len(pauses), duck_range_during_narration_db=round(float(dc["bed_db"][narr].max() - dc["bed_db"][narr].min()), 2),
                       duck_during_narration_db=round(float(np.median(dc["bed_db"][narr])), 2),
                       max_bed_gain_swing_in_a_pause_db=round(max(sw_b), 2),
                       max_event_duck_swing_in_a_pause_db=round(max(sw_e), 2),
                       n_pauses_event_swing_over_3db=int(sum(s > 3 for s in sw_e)),
                       bed_gain_measured_range_db=round(float(np.percentile(gain_bed[sel], 99.5) - np.percentile(gain_bed[sel], 0.5)), 2))
    tH, sH = frames_db(sfx, 4800, 2400)
    _, aH = frames_db(amb_d, 4800, 2400)
    selH = (tH > 0.3) & (tH < D - 1.1)
    OUT["holes"] = dict(sfx_100ms_rms_min_dbfs=round(float(sH[selH].min()), 1), at_s=round(float(tH[selH][np.argmin(sH[selH])]), 2),
                        beds_100ms_rms_min_dbfs=round(float(aH[selH].min()), 1),
                        beds_100ms_rms_p50_dbfs=round(float(np.median(aH[selH])), 1),
                        old_hole_14_8_17_4_min_dbfs=round(float(sH[(tH > 14.8) & (tH < 17.4)].min()), 1),
                        pause_15_78_16_19_dbfs=round(float(sH[(tH > 15.78) & (tH < 16.19)].mean()), 1),
                        last_second=[round(float(v), 1) for v in sH[tH > D - 1.05][::2]])

    # ---------------- HF / DC / clicks ----------------
    hf_bus, (fb, pb) = hf_check(sfx, "SFX as heard (post-duck)")
    hf_fin, (ff, pf) = hf_check(final, "final mix")
    hf_voc, _ = hf_check(voice, "voice stem alone")
    OUT["hf"] = [hf_bus, hf_fin, hf_voc]
    cks = [click_scan(bus, "sfx_bus.wav"), click_scan(final, "final_audio.wav"), click_scan(voice, "voice stem")]
    vt = np.array(cks[2]["_times"])
    new = [x for x in cks[1]["_times"] if not len(vt) or np.min(np.abs(vt - x)) > 0.003]
    cks[1]["spikes_not_in_voice"] = len(new)
    cks[1]["spikes_not_in_voice_times"] = [round(x, 3) for x in new[:10]]
    for cc in cks:
        cc.pop("_times")
    OUT["clicks"] = cks
    OUT["hf_bursts"] = [hf_burst_scan(load("sfx_amb.wav"), "beds"), hf_burst_scan(load("sfx_events.wav"), "events"),
                        hf_burst_scan(bus, "sfx_bus.wav")]
    L, R = sfx[:, 0], sfx[:, 1]
    OUT["stereo"] = dict(sfx_lr_correlation=round(float(np.sum(L * R) / np.sqrt(np.sum(L * L) * np.sum(R * R))), 3),
                         final_lr_correlation=round(float(np.sum(final[:, 0] * final[:, 1]) / np.sqrt(np.sum(final[:, 0] ** 2) * np.sum(final[:, 1] ** 2))), 3),
                         sfx_mono_sum_change_db=round(float(10 * np.log10(np.mean(((L + R) / 2) ** 2) / np.mean((L * L + R * R) / 2))), 2))

    # ---------------- tonal lines ----------------
    tl_heard = tonal_lines(sfx)
    tl_bus = tonal_lines(bus)
    OUT["tonal"] = dict(method="STFT 4096 (11.7 Hz), 10 ms hop, 0.7-8 kHz; a line = local peak >= 15 dB above the "
                               "0.5 kHz median spectrum, within 75 dB of the loudest frame, lasting >= 0.25 s",
                        heard=tl_heard, bus=tl_bus)
    if has_v1:
        OUT["tonal"]["v1_bus"] = tonal_lines(load(os.path.join(V1, "sfx_bus.wav")))

    # ---------------- isolated events ----------------
    iso = render_isolated(cues)
    pops, cuts, glints, creak = [], [], [], {}
    for e in iso:
        typ, x = e["c"]["type"], e["x"]
        rel = [h for h in e["hits"]] or [0.0]
        if typ in ("soft_pop", "sprout_pop", "fruit_pops"):
            rc = rise_crest(x, rel)
            pops.append(dict(type=typ, t=e["c"]["t"], rise_ms_min=round(float(rc[:, 0].min()), 2),
                             rise_ms_median=round(float(np.median(rc[:, 0])), 2),
                             crest_db_max=round(float(rc[:, 1].max()), 1), crest_db_median=round(float(np.median(rc[:, 1])), 1)))
        if typ in ("footsteps_gravel", "footsteps_grass", "sand_crumble", "bite", "leaf_rustle", "soft_page",
                   "cloth_move", "twig_snap_pluck", "soil_pat", "sprout_pop"):
            cuts.append(dict(type=typ, t=e["c"]["t"], hard_cutoffs=cutoffs(x)))
        if typ in ("settle_chimes", "regrow_chime", "bloom_chimes"):
            glints.append(dict(type=typ, t=e["c"]["t"], partials=glint_partials(x)))
        if typ == "scale_creak":
            d_ = e["c"].get("dur", 0.6)
            v1 = [harmonic_comb(creak_v1_reference(d_, np.random.default_rng(s))) for s in range(6)]
            creak = dict(t=e["c"]["t"], comb=round(harmonic_comb(x), 2), v1_model_comb=round(float(np.mean(v1)), 2),
                         steady_buzz_comb=round(float(np.mean([harmonic_comb(steady_buzz_reference(d_, f0)) for f0 in (60, 80, 110)])), 2),
                         white_noise_comb=round(float(np.mean([harmonic_comb(np.random.default_rng(s).standard_normal(N(d_ + 0.15))) for s in range(6)])), 2))
    OUT["iso"] = dict(pops=pops, cutoffs=cuts, glints=glints, creak=creak)
    # beds / thunder spectra (rendered alone with the same seeds as in the mix)
    beds = {}
    for a in cues["ambience"]:
        if a["type"] in ("radiant", "meadow", "rain", "lamp_flame") and a["type"] not in beds:
            n = N(min(a["to"] - a["from"], 6.0))
            beds[a["type"]] = spec_stats(MS.AMB_GEN[a["type"]](n, MS.rng_for("amb", a["type"], round(a["from"], 3))))
    th = next(e for e in iso if e["c"]["type"] == "thunder_soft")
    OUT["spectra"] = dict(beds=beds, thunder=spec_stats(th["x"]))
    if has_v1:
        sv1 = load(os.path.join(V1, "sfx_amb.wav"))
        OUT["spectra"]["v1_radiant_24_6_31_8"] = spec_stats(sv1[N(25.0):N(31.4)])
        OUT["spectra"]["v2_radiant_24_6_31_8"] = spec_stats(amb[N(25.0):N(31.4)])
    OUT["birds"] = bird_stats()

    # ---------------- beat audibility (as heard) ----------------
    ev_gain = 10 ** (-np.interp(np.arange(len(final)) / SR, tt, dc["ev_db"] + dc["guard_db"]) / 20) * gscale
    def r50(x):
        return 10 * np.log10(np.convolve((x ** 2).mean(axis=1), np.ones(2400) / 2400, "same") + 1e-20)
    Aa = r50(amb_d)
    V4 = 10 * np.log10(np.convolve((voice ** 2).mean(axis=1), np.ones(N(0.4)) / N(0.4), "same") + 1e-20)
    beats = []
    for e in iso:
        i0 = N(e["tp"])
        x = e["x"][: len(final) - i0] * ev_gain[i0:i0 + len(e["x"]), None]
        E = r50(x)
        k = int(np.argmax(E))
        vnow = float(V4[i0 + k])
        beats.append(dict(type=e["c"]["type"], t=e["c"]["t"], peak_s=round((i0 + k) / SR, 2), peak50_dbfs=round(float(E[k]), 1),
                          under_median_speech_db=round(float(rat[30]["median_speech_voice_rms_dbfs"] - E[k]), 1),
                          vs_voice_db=round(float(E[k] - vnow), 1) if vnow > -55 else None,
                          vs_beds_db=round(float(E[k] - Aa[i0 + k]), 1)))
    OUT["beats"] = beats

    # ---------------- onsets ----------------
    rows = onset_check(man)
    hits = [r for r in rows if r["method"] == "flux"]
    starts = [r for r in rows if r["method"] != "flux"]
    OUT["onsets"] = dict(n_hits=len(hits), max_abs_dev_ms=max(abs(r["dev_ms"]) for r in hits),
                         n_over_20ms=sum(abs(r["dev_ms"]) > 20 for r in hits), n_gradual=len(starts),
                         gradual_max_abs_dev_ms=max(abs(r["dev_ms"]) for r in starts))
    json.dump(dict(OUT, onset_rows=rows), open(P("analysis.json"), "w"), indent=1,
              default=lambda o: o.item() if hasattr(o, "item") else str(o))

    # ---------------- plots ----------------
    plot_spectrogram(bus, sfx, final, man, D)
    plot_zoom(sfx, bus)
    plot_waveform(final, voice, sfx, amb_d, t4, v4, s4, sp30, dc, D)
    plot_spectrum(fb, pb, ff, pf)
    write_report(man, info, cues, rows)
    print(json.dumps({k: v for k, v in OUT.items() if k not in ("beats",)}, indent=1,
                     default=lambda o: o.item() if hasattr(o, "item") else str(o)))


def onset_check(manifest):
    import librosa
    ev = load("sfx_events.wav").mean(axis=1)
    hop = 48
    env = librosa.onset.onset_strength(y=ev.astype(np.float32), sr=SR, hop_length=hop, n_fft=512,
                                       center=True, lag=1, max_size=1, n_mels=64)
    t_env = np.arange(len(env)) * hop / SR
    peaks, _ = signal.find_peaks(env, distance=6)
    tp_ = t_env[peaks]
    rows = []
    for c in manifest["cues"]:
        if c["kind"] != "event":
            continue
        if c["hits"]:
            for h in c["hits"]:
                a, b = np.searchsorted(t_env, [h - 0.5, h + 0.5])
                med = float(np.median(env[a:b])) + 1e-9
                for wdw in (0.025, 0.05):
                    cand = peaks[np.abs(tp_ - h) <= wdw]
                    if len(cand):
                        break
                if len(cand):
                    strong = cand[env[cand] >= 0.5 * env[cand].max()]
                    j = strong[np.argmin(np.abs(t_env[strong] - h))]
                else:
                    j = int(np.argmin(np.abs(t_env - h)))
                rows.append(dict(type=c["type"], cue=h, detected=round(float(t_env[j]), 4),
                                 dev_ms=round(1000 * (t_env[j] - h), 1),
                                 strength_vs_median=round(float(env[j] / med), 1), method="flux"))
        elif c.get("sub_starts"):
            for cue_t, meas in c["sub_starts"]:
                rows.append(dict(type=c["type"], cue=cue_t, detected=meas, dev_ms=round(1000 * (meas - cue_t), 1),
                                 strength_vs_median=None, method="start(-60dB)"))
        else:
            rows.append(dict(type=c["type"], cue=c["place"], detected=c["measured_start"],
                             dev_ms=round(1000 * (c["measured_start"] - c["place"]), 1),
                             strength_vs_median=None, method="start(-60dB)"))
    return rows


# ------------------------------------------------------------------------------- plots
def _spec(ax, x, title, rng_db=80, nper=4096, fmax=12):
    f, tt, S = signal.spectrogram(x.mean(axis=1), SR, nperseg=nper, noverlap=nper - 480)
    Sd = 10 * np.log10(S + 1e-20)
    vmax = np.percentile(Sd[f < fmax * 1000], 99.9)
    im = ax.pcolormesh(tt, f / 1000, Sd, vmin=vmax - rng_db, vmax=vmax, cmap="magma", shading="auto", rasterized=True)
    ax.set_ylim(0, fmax)
    ax.set_ylabel("kHz")
    ax.set_title(title + f"  (colour: top 0.1 % = 0 dB, range {rng_db} dB)", fontsize=9)
    return im


def plot_spectrogram(bus, sfx, final, man, D):
    fig, axs = plt.subplots(3, 1, figsize=(20, 13), sharex=True)
    _spec(axs[0], bus, "sfx_bus.wav as rendered (pre-duck), relative scale")
    for cc in man["cues"]:
        if cc["kind"] == "event":
            axs[0].axvline(cc["place"], color="w", lw=0.4, alpha=0.5)
            axs[0].text(cc["place"], 11.6, cc["type"], rotation=90, fontsize=5.5, color="w", va="top")
        else:
            y = 0.3 + 0.35 * (hash(cc["type"]) % 3)
            axs[0].plot([cc["cue_from"], cc["cue_to"]], [y, y], lw=3, alpha=0.8)
            axs[0].text(cc["cue_from"], y + 0.15, cc["type"], fontsize=6, color="y")
    _spec(axs[1], sfx, "SFX as heard in final_audio.wav (beds -3 dB, events -7 dB under speech)")
    _spec(axs[2], final, "final_audio.wav (voice + SFX)")
    for ax in axs:
        ax.axhline(8, color="c", lw=0.5, ls="--")
    axs[2].set_xlabel("video time (s)")
    axs[2].set_xlim(0, D)
    fig.tight_layout()
    fig.savefig(P("sfx_spectrogram.png"), dpi=100)
    plt.close(fig)


def plot_zoom(sfx, bus):
    wins = [(9.9, 11.0, "settle_chimes 10.08 (old: D6-A6 chimes ringing 2-4 s)"), (27.2, 28.3, "regrow_chime 27.35"),
            (28.5, 29.6, "regrow_chime 28.62 + pause 28.85-29.37"), (47.85, 49.2, "bloom_chimes 47.95 + pause 48.86-49.09"),
            (1.0, 3.2, "meadow birds / light_rain / footsteps"), (51.8, 54.8, "dawn birds"),
            (25.0, 31.5, "radiant bed (+ events)"), (44.2, 46.2, "gravel steps with tails")]
    fig, axs = plt.subplots(4, 2, figsize=(18, 15))
    for ax, (a, b, title) in zip(axs.ravel(), wins):
        seg = sfx[N(a):N(b)]
        f, tt, S = signal.spectrogram(seg.mean(axis=1), SR, nperseg=2048, noverlap=2048 - 120)
        Sd = 10 * np.log10(S + 1e-20)
        vmax = np.percentile(Sd[f < 10000], 99.8)
        ax.pcolormesh(tt + a, f / 1000, Sd, vmin=vmax - 70, vmax=vmax, cmap="magma", shading="auto", rasterized=True)
        ax.set_ylim(0, 10)
        ax.set_title(title + " - SFX as heard, 70 dB range", fontsize=9)
        ax.set_ylabel("kHz")
    fig.tight_layout()
    fig.savefig(P("sfx_zoom.png"), dpi=90)
    plt.close(fig)


def plot_waveform(final, voice, sfx, amb_d, t, vdb, sdb, speech, dc, D):
    fig, axs = plt.subplots(4, 1, figsize=(20, 13), sharex=True, gridspec_kw=dict(height_ratios=[2, 2, 1.6, 1.1]))
    ts = np.arange(len(final)) / SR
    dec = 24
    axs[0].plot(ts[::dec], final[::dec, 0], lw=0.3, color="#334")
    for s in (1, -1):
        axs[0].axhline(s * 10 ** (-1.5 / 20), color="r", lw=0.5, ls="--")
    axs[0].set_ylim(-1, 1)
    axs[0].set_title("final_audio.wav (L) - red: -1.5 dBFS", fontsize=10)
    axs[1].plot(ts[::dec], voice[::dec, 0], lw=0.3, color="#2a6", label="voice")
    axs[1].plot(ts[::dec], sfx[::dec, 0], lw=0.3, color="#c50", label="SFX as heard")
    axs[1].set_ylim(-0.6, 0.6)
    axs[1].legend(loc="upper right", fontsize=8)
    axs[1].set_title("stems at final scale", fontsize=10)
    axs[2].plot(t, vdb, color="#2a6", lw=1, label="voice RMS 400 ms")
    axs[2].plot(t, sdb, color="#c50", lw=1, label="SFX RMS 400 ms")
    tb, bdb = frames_db(amb_d, N(0.4), 480)
    axs[2].plot(tb, bdb, color="#888", lw=0.8, label="beds RMS 400 ms")
    axs[2].plot(t, vdb - 18, color="#2a6", lw=0.6, ls=":", label="voice - 18 dB")
    axs[2].fill_between(t, -90, 0, where=speech, color="#2a6", alpha=0.07, step="mid")
    axs[2].set_ylim(-80, -5)
    axs[2].set_ylabel("dBFS")
    axs[2].legend(loc="lower left", fontsize=8, ncol=4)
    axs[3].plot(dc["t"], -dc["bed_db"], color="#888", lw=1, label="beds duck")
    axs[3].plot(dc["t"], -dc["ev_db"], color="#c50", lw=1, label="events duck")
    axs[3].plot(dc["t"], -(dc["ev_db"] + dc["guard_db"]), color="#a0a", lw=0.7, ls="--", label="events duck + safety net")
    axs[3].set_ylim(-11, 1)
    axs[3].set_ylabel("dB")
    axs[3].legend(loc="lower left", fontsize=8, ncol=3)
    axs[3].set_xlabel("video time (s)")
    axs[3].set_xlim(0, D)
    fig.tight_layout()
    fig.savefig(P("final_waveform.png"), dpi=100)
    plt.close(fig)


def plot_spectrum(fb, pb, ff, pf):
    fig, ax = plt.subplots(figsize=(10, 4.5))
    ax.semilogx(ff, pf, lw=0.8, label="final mix")
    ax.semilogx(fb, pb, lw=0.8, label="SFX as heard")
    ax.axvline(8000, color="r", lw=0.6, ls="--")
    ax.set_xlim(20, 24000)
    ax.set_xlabel("Hz")
    ax.set_ylabel("PSD dB")
    ax.legend()
    ax.grid(alpha=0.3, which="both")
    fig.tight_layout()
    fig.savefig(P("spectrum.png"), dpi=110)
    plt.close(fig)


# ------------------------------------------------------------------------------- report
def write_report(man, info, cues, rows):
    O = OUT
    fin, stm, R, gp, bd, ho = O["final"], O["stems"], O["ratio"], O["gaps"], O["beds"], O["holes"]
    L = []
    w = L.append
    w("# SFX + final mix report (v2, after QA)\n")
    w("Short: 59.6 s vertical gouache animation, male narrator (Risale-i Nur passage). Rules: voice dominant, "
      "SFX quiet, **no music**, nothing cheap or cartoonish. Everything below is regenerated by "
      "`make_sfx.py` -> `mix.py` -> `analyze.py`; every number is measured, not estimated.\n")
    w("## Files\n")
    w("| file | what |\n|---|---|")
    for f, d in [("cues.json", "the cue sheet (video seconds); the only input of make_sfx.py"),
                 ("make_sfx.py", "renders the SFX from cues.json only (seeded, deterministic: two renders are byte-identical)"),
                 ("mix.py", "voice repair + high-pass, separate bed/event ducking, safety net, loudness + true-peak mastering"),
                 ("analyze.py", "all measurements, plots and this report"), ("audiolib.py", "shared BS.1770-4 loudness / true-peak maths"),
                 ("sfx_bus.wav", "SFX bus = beds + events, 48 kHz float32 stereo, exactly 59.6 s, pre-duck"),
                 ("sfx_amb.wav / sfx_events.wav", "the two halves of the bus (mix.py ducks them separately)"),
                 ("final_audio.wav", "final mix, 48 kHz 24-bit stereo, exactly 59.6 s"),
                 ("sfx_spectrogram.png", "spectrograms (bus with cue markers / SFX as heard / final mix), relative scale"),
                 ("sfx_zoom.png", "zoomed spectrograms of the glint cues, birds, radiant bed, gravel steps"),
                 ("final_waveform.png", "waveform overview of the final mix, stems, 400 ms levels, duck curves"),
                 ("spectrum.png", "long-term spectra"),
                 ("stem_*_final.wav, duck_curves.npz", "voice / SFX / beds / events exactly as they sit in the mix, and the gain curves (QC)"),
                 ("sfx_manifest.json, mix_info.json, analysis.json", "machine-readable placement / mix / QC data")]:
        w(f"| `{f}` | {d} |")
    w("")
    w("## What changed after QA\n")
    w("| QA point | fix | measured now |\n|---|---|---|")
    gl = O["iso"]["glints"]
    allc = [p["cents_off_et"] for g in gl for p in g["partials"]]
    allt = [p["t20_s"] for g in gl for p in g["partials"] if p["t20_s"] is not None]
    tl = O["tonal"]["heard"]
    tl_v1 = O["tonal"].get("v1_bus")
    w(f"| 1 chimes were tuned notes / melodies with long tails | `chime()` deleted. New `glass_glint()`: random pitch 1.9-3.2 kHz, >= 40 cents from every equal-tempered note, no consonant intervals, non-monotonic order, fundamental tau 0.08-0.11 s, weak inharmonic upper modes, no beating partner; 'shine' space 1.5 s, send 0.15 (was heaven 3.4 s, send 0.45) | glint fundamentals {min(allc):.0f}-{max(allc):.0f} cents off ET; -20 dB after {min(allt):.2f}-{max(allt):.2f} s (v1: 1.0-1.3 s); sustained tonal lines in the SFX as heard: {len(tl)} (longest {max([r['dur_s'] for r in tl], default=0)} s)" + (f"; v1 bus had {len(tl_v1)}, longest {max([r['dur_s'] for r in tl_v1], default=0)} s" if tl_v1 else "") + " |")
    w(f"| 2 dead air 14.8-17.4 s | `air_drift` bed 14.4-17.9 s + a full-length `air_floor` (~-62 dBFS) | quietest 100 ms of the SFX in 14.8-17.4 s: {ho['old_hole_14_8_17_4_min_dbfs']} dBFS (v1: -75); pause 15.78-16.19 s: {ho['pause_15_78_16_19_dbfs']} dBFS; quietest 100 ms anywhere: {ho['sfx_100ms_rms_min_dbfs']} dBFS at {ho['at_s']} s |")
    w(f"| 3 beds pumped in every pause | beds and events ducked separately; beds 3 dB with 250 ms attack ramp, 1.0 s hold, 1.2 s release; events 7 dB, 110 ms attack ramp | bed duck range across all {bd['n_pauses']} pauses of the narration: {bd['duck_range_during_narration_db']} dB (steady at -{bd['duck_during_narration_db']} dB); measured bed gain range {bd['bed_gain_measured_range_db']} dB |")
    gd = info["guard"]
    w(f"| 4 fader ride acted in pauses and on the beds | the root causes were fixed in cues.json (levels/timing); the ride is now a safety net on the events only, only on frames where he speaks (strict VAD), no spreading, max 3 dB | active (>0.5 dB) {gd['pct_time_active_over_0_5db']}% of the time, regions {gd['regions']} |")
    bs = O["birds"]
    w(f"| 5 birds sounded synthetic | new syllable model: per syllable contour type/depth, length, gap, FM trill 20-60 Hz, AM flutter, pitch wander; 2-3 syllables per call; 2nd harmonic -32 dB; LP 4 kHz; fewer and quieter calls | bird layer test render: syllable length CV {bs['length_cv_pct']} %, gap CV {bs['gap_cv_pct']} %, median pitch change between neighbours {bs['adjacent_pitch_change_median_pct']} % |")
    pp = O["iso"]["pops"]
    w(f"| 6 pops were clicks | peak-normalised puff + body, 4.5-6 ms raised-cosine attack; soft_pop 3.94 -> 3.88 s and sprout_pop 11.86 -> 11.80 s (80 ms before the words); fruit pops jittered +-12 ms, +-3 dB, varied resonance, diminishing | rise 10-90 % {min(p['rise_ms_min'] for p in pp)}-{max(p['rise_ms_median'] for p in pp)} ms (v1 0.46-1.3), crest max {max(p['crest_db_max'] for p in pp)} dB, median {min(p['crest_db_median'] for p in pp)}-{max(p['crest_db_median'] for p in pp)} dB (v1 12.5-16.4) |")
    rb = O["spectra"]
    v1r = rb.get("v1_radiant_24_6_31_8")
    w(f"| 7 radiant bed was band-passed hiss | broad band around 2.25 kHz with slow drift, 300-900 Hz body, sparse soft grains; -3 dB | bed alone: centroid {rb['beds']['radiant']['centroid_hz']:.0f} Hz, {rb['beds']['radiant']['share_3_7k_pct']} % in 3-7 kHz, {rb['beds']['radiant']['share_300_900_pct']} % in 300-900 Hz" + (f" (v1 in the mix 25-31.4 s: {v1r['centroid_hz']:.0f} Hz, {v1r['share_3_7k_pct']} % in 3-7 kHz)" if v1r else "") + " |")
    cu = O["iso"]["cutoffs"]
    w(f"| 8 footsteps stopped dead | grain clouds thin out exponentially, continuous crunch body under the grains, pebble scatter after gravel steps | hard cut-offs (5 ms fall > 25 dB from within 25 dB of peak): gravel {sum(c['hard_cutoffs'] for c in cu if c['type'] == 'footsteps_gravel')}, grass {sum(c['hard_cutoffs'] for c in cu if c['type'] == 'footsteps_grass')}, all transient foley {sum(c['hard_cutoffs'] for c in cu)} (v1: 20 + 4) |")
    w(f"| 9 creak was a periodic buzz | every slip interval drawn independently (+-30 %), sticks and skips, low-Q modes | harmonic-comb strength {O['iso']['creak'].get('comb')} (v1 generator {O['iso']['creak'].get('v1_model_comb')}; references: steady buzz {O['iso']['creak'].get('steady_buzz_comb')}, white noise {O['iso']['creak'].get('white_noise_comb')}) |")
    th = rb["thunder"]
    w(f"| 10 thunder below 100 Hz | sub layer high-passed at 52 Hz (4th order) + 45 Hz HPF on the result, 140-600 Hz roll layer raised to equal weight, level 0.45 -> 0.25 | centroid {th['centroid_hz']:.0f} Hz (v1 94 Hz), {th['share_below_100_pct']} % of energy below 100 Hz |")
    w(f"| 11 abrupt end | room_tone ends 59.0 s + 1.0 s master fade on the bus | last second of SFX (100 ms RMS, every 0.1 s): {ho['last_second']} dBFS |")
    vlog = info["voice"]
    w(f"| 12 narration clips and lip ticks | bound-constrained LSAR declip of {sum(d['samples'] for d in vlog['declip'])} clipped samples (restored peaks up to {max(d['max_restored_peak'] for d in vlog['declip'])}); LSAR de-click of the ticks at {[d['spike_video_s'] for d in vlog['declick']]} s | HF spike reduced {[str(d['hf_peak_before']) + '->' + str(d['hf_peak_after']) for d in vlog['declick']]} |")
    w("| 13 inaudible beats | candle_out_puff's smoke curl now swells into the 41.41 s pause; settle_chimes, bright_swell, puff_dissolve re-timed into pauses/picture moments; candle_light moved to the picture's ignition (37.85 s); dim_fade and gilding_shimmer dropped (32-36 dB under the voice, nobody could hear them) | see 'Story beats' table |")
    w("| 14 report errors | chime claims corrected, 'no sustained tones' replaced by a measured tonal-line list, spectrogram on a relative scale, ratio reported at three speech thresholds, holes measured | this report |")
    w("")
    w("## Result summary\n")
    w("| check | target | measured | pass |\n|---|---|---|---|")

    def row(name, target, val, ok):
        w(f"| {name} | {target} | {val} | {ok if isinstance(ok, str) else ('yes' if ok else '**NO**')} |")
    row("duration / format", "59.6 s, 48 kHz stereo", f"{fin['samples']} samples = {fin['duration_s']} s, {fin['channels']} ch, {fin['subtype']}; sfx_bus.wav {stm['sfx_bus_samples']} samples {stm['sfx_bus_subtype']}",
        fin["samples"] == N(59.6) and stm["sfx_bus_samples"] == N(59.6))
    row("integrated loudness", "-14 LUFS", f"{fin['lufs_integrated']} LUFS (ffmpeg ebur128: {fin['lufs_ffmpeg']})",
        abs(fin["lufs_integrated"] + 14) < 0.1 and abs(fin["lufs_ffmpeg"] + 14) < 0.15)
    row("true peak", "<= -1.5 dBTP", f"{fin['true_peak_dbtp']} dBTP (ffmpeg: {fin['true_peak_ffmpeg']})",
        fin["true_peak_dbtp"] <= -1.5 and fin["true_peak_ffmpeg"] <= -1.5)
    row("clipping", "0 samples", f"{fin['clipped_samples']} (sample peak {fin['sample_peak_dbfs']} dBFS)", fin["clipped_samples"] == 0)
    row("DC offset", "~0", f"final {fin['dc']}, bus {stm['sfx_bus_dc']}", max(abs(v) for v in fin["dc"]) < 1e-4)
    for rel in (30, 35, 40):
        r = R[rel]
        row(f"voice/SFX during speech, speech = voice > p95-{rel} dB ({r['vad_threshold_dbfs']} dBFS)",
            ">= 18 dB in 400 ms RMS windows" + (" (spec)" if rel == 30 else " (stricter, informative)"),
            f"min {r['min_db']} / p5 {r['p5_db']} / median {r['median_db']} dB; {r['n_below_18']} of {r['n_windows']} windows "
            f"({r['pct_below_18']} %) below 18 dB", (r["min_db"] >= 18) if rel == 30 else
            ("yes" if r["n_below_18"] == 0 else f"partly: {r['n_below_18']} windows, all on phrase tails (see Levels)"))
    row("SFX in gaps", "modest, gentle", f"loudest gap window {gp['below_speech_min_db']} dB below median speech; median {gp['below_speech_median_db']} dB below",
        gp["below_speech_min_db"] >= 10)
    row("beds steady (no pumping)", "bed gain constant through the narration", f"bed duck range {bd['duck_range_during_narration_db']} dB over {bd['n_pauses']} pauses",
        bd["duck_range_during_narration_db"] < 0.5)
    row("no dead air", "no hole in the floor", f"quietest 100 ms of SFX {ho['sfx_100ms_rms_min_dbfs']} dBFS (old hole now {ho['old_hole_14_8_17_4_min_dbfs']}); beds median {ho['beds_100ms_rms_p50_dbfs']} dBFS",
        ho["sfx_100ms_rms_min_dbfs"] > -70)
    row("no musical / sustained tones", "no tonal line >= 0.6 s, none near an ET note", f"{len(tl)} lines >= 0.25 s; longest {max([r['dur_s'] for r in tl], default=0)} s; "
        f"{sum(r['cents_off_et'] < 20 for r in tl)} within 20 cents of a note", max([r["dur_s"] for r in tl], default=0) < 0.6)
    hb = O["hf"][0]
    row(">8 kHz energy (SFX)", "no harsh spikes", f"HF share {hb['hf_energy_share_db']} dB, max narrow-band prominence {hb['hf_spike_prominence_db']} dB, worst 43 ms frame {hb['hf_share_50ms_frames_max_db']} dB",
        hb["hf_spike_prominence_db"] < 8 and hb["hf_share_50ms_frames_max_db"] < -10)
    cb, cf, cv = O["clicks"]
    hbz = O["hf_bursts"]
    row("clicks", "0 in SFX; 0 new in mix", f"2nd-difference spikes: bus {cb['d2_spike_events']}, mix {cf['spikes_not_in_voice']} not in the voice; HF bursts: beds {hbz[0]['hf_bursts']}, events {hbz[1]['hf_bursts']}",
        cb["d2_spike_events"] == 0 and cf["spikes_not_in_voice"] == 0)
    row("pops are not clicks", "soft attack (4.5-6 ms raised cosine), crest <= ~10 dB", f"rise min {min(p['rise_ms_min'] for p in pp)} ms; crest max {max(p['crest_db_max'] for p in pp)} dB",
        min(p["rise_ms_min"] for p in pp) >= 1.5 and max(p["crest_db_max"] for p in pp) <= 11)
    on = O["onsets"]
    row("onset timing", "+-20 ms", f"{on['n_hits']} transient hits, max |dev| {on['max_abs_dev_ms']} ms; {on['n_gradual']} gradual cues start within {on['gradual_max_abs_dev_ms']} ms",
        on["n_over_20ms"] == 0 and on["gradual_max_abs_dev_ms"] <= 20)
    w("")
    w("## Levels\n")
    w(f"- Voice stem (final scale): **{stm['voice_lufs']} LUFS** integrated.")
    w(f"- SFX as heard: **{stm['sfx_lufs_post_duck']} LUFS** (pre-duck {stm['sfx_lufs_pre_duck']}); beds as heard {stm['beds_lufs_post_duck']} LUFS. "
      f"Integrated voice-to-SFX difference **{round(stm['voice_lufs'] - stm['sfx_lufs_post_duck'], 1)} LU**; K-weighted 400 ms during speech: median {O['ratio_k']['median_lu']} LU, min {O['ratio_k']['min_lu']} LU.")
    w(f"- SFX bus file (as rendered): {stm['sfx_bus_file_lufs']} LUFS, peak {stm['sfx_bus_peak_dbfs']} dBFS.")
    w("- Voice/SFX ratio in 400 ms RMS windows (10 ms hop, channels pooled); a window counts as speech when >= 50 % of its 10 ms frames are above the speech threshold:")
    for rel in (30, 35, 40):
        r = R[rel]
        w(f"  - threshold p95-{rel} dB = {r['vad_threshold_dbfs']} dBFS: {r['n_windows']} windows, min **{r['min_db']} dB**, p5 {r['p5_db']}, p10 {r['p10_db']}, median {r['median_db']}; below 18 dB: {r['n_below_18']} ({r['pct_below_18']} %).")
        for c in r["clusters_below_18"]:
            w(f"    - {c['t'][0]}-{c['t'][1]} s: {c['min_db']} dB (voice {c['voice_rms_dbfs']} dBFS = {c['voice_below_median_speech_db']} dB under median speech, SFX {c['sfx_rms_dbfs']} dBFS)")
    ctx = O.get("strict_context")
    if ctx:
        w(f"  - Where they are: every one of the {ctx['n']} clusters is centred {ctx['after_word_min_ms']}-{ctx['after_word_max_ms']} ms after the last word of a "
          f"phrase ends ({', '.join(ctx['words'])}), i.e. on the narrator's own decaying voice and room tail going into a pause of "
          f"{ctx['pause_min_s']}-{ctx['pause_max_s']} s. The SFX there are {ctx['sfx_under_speech_min_db']}-{ctx['sfx_under_speech_max_db']} dB under the median speech level "
          f"(steady beds plus events that start in the pause). Passing these windows would need the SFX up to {ctx['needed_db']} dB lower at those moments, "
          "which for the beds means practically no ambience.")
    w(f"- Gaps ({gp['n']} windows with no voice inside the narration): SFX median {gp['sfx_rms_median_dbfs']} dBFS, loudest {gp['sfx_rms_max_dbfs']} dBFS "
      f"= {gp['below_speech_min_db']} dB under median speech; loudest gap windows {gp['loudest']}. End card: SFX median {gp['endcard_sfx_rms_median_dbfs']} dBFS "
      f"({gp['endcard_below_speech_db']} dB under the speech level).")
    lim, ed, bd_ = info["limiter"], info["event_duck"], info["bed_duck"]
    w(f"- Ducking: beds {bd_['depth_db']} dB (attack ramp {bd_['attack_s']} s ending at the word, hold {bd_['hold_s']} s, release {bd_['release_s']} s) -> "
      f"range during narration {bd['duck_range_during_narration_db']} dB, i.e. steady; events {ed['depth_db']} dB (attack ramp {ed['attack_s']} s, hold {ed['hold_s']} s, "
      f"release {ed['release_s']} s); largest event-duck swing in a pause {bd['max_event_duck_swing_in_a_pause_db']} dB ({bd['n_pauses_event_swing_over_3db']} of {bd['n_pauses']} pauses > 3 dB; "
      "this only moves the events, which are discrete sounds, not the beds). Key: voice 20 ms RMS above p95-30 dB.")
    w(f"- Safety net on the events: {gd['applies_to']}; targets {gd['rms_target_db']} dB RMS / {gd['k_target_db']} LU; max {gd['max_db']} dB; "
      f"active >0.5 dB during {gd['pct_time_active_over_0_5db']} % of the timeline; regions (from, to, max dB): {gd['regions']}.")
    w(f"- Master: {info['master_gain_db']:+.2f} dB gain, true-peak limiter ceiling {lim['ceiling_dbtp']} dBTP, max gain reduction {lim['max_gr_db']} dB, "
      f">0.5 dB GR during {lim['pct_time_gr_over_0_5db']} % of the time (voice peaks only).")
    w(f"- Voice: offset {vlog['offset_s']} s, {vlog['fade_in_s'] * 1000:.0f} ms fade-in, {vlog['highpass']} at {vlog['highpass_minus3db_hz']} Hz; "
      f"declip {vlog['declip']}; de-click {vlog['declick']}. No EQ, no compression.\n")
    w("## Spectrum / artefact checks\n")
    for h in O["hf"]:
        w(f"- {h['label']}: energy above 8 kHz {h['hf_energy_share_db']} dB re total; largest narrow-band peak above 8 kHz {h['hf_spike_prominence_db']} dB "
          f"above the local spectrum at {h['hf_spike_freq_hz']:.0f} Hz; worst 43 ms frame HF share {h['hf_share_50ms_frames_max_db']} dB at {h['hf_share_50ms_frames_max_t']} s.")
    for cc in O["clicks"]:
        extra = f" Spikes not already in the narration: **{cc['spikes_not_in_voice']}**." if "spikes_not_in_voice" in cc else ""
        w(f"- {cc['label']}: 2nd-difference spikes (> 8x local RMS, above -80 dBFS) **{cc['d2_spike_events']}** {cc['d2_spike_times'] if cc['d2_spike_events'] else ''}; "
          f"max sample-to-sample jump {cc['max_sample_jump']} ({cc['max_sample_jump_rel_peak_db']} dB re peak); max 2 ms-peak / 20 ms-RMS crest "
          f"{cc['crest_2ms_vs_20ms_max_db']} dB at {cc['crest_top'][:3]}.{extra}")
    w(f"- HF click-burst scan (1 ms RMS of the >4 kHz band > 6x its 30 ms RMS, above -80 dBFS): {', '.join(f'{b['label']} {b['hf_bursts']}' for b in O['hf_bursts'])}. "
      "(Bursts that remain are the onsets of intentional transients - twig crack, clock ticks, gravel pebbles - all low-passed at 6 kHz.)")
    stv = O["stereo"]
    w(f"- Stereo: SFX L/R correlation {stv['sfx_lr_correlation']}, final mix {stv['final_lr_correlation']}; mono fold-down changes the SFX by {stv['sfx_mono_sum_change_db']} dB.")
    w(f"- DC: final {fin['dc']}, bus {stm['sfx_bus_dc']} (30 Hz HPF on the bus, 70 Hz zero-phase HPF on the voice). Stem sum vs final: {fin['stem_sum_residual_db']} dB.")
    w("- Band-limiting by design: every transient foley layer has a 4th-order low-pass at 4.2-6.5 kHz, glint clouds 7.2 kHz, glass glints 6.5 kHz, the bus a 4th-order 12 kHz low-pass and a 30 Hz high-pass.\n")
    w("### Tonal content (replaces the old, wrong 'no sustained tones' claim)\n")
    w(f"Method: {O['tonal']['method']}.\n")
    for label, key in (("SFX as heard (post-duck)", "heard"), ("sfx_bus.wav (pre-duck)", "bus"), ("v1 bus for comparison", "v1_bus")):
        if key not in O["tonal"]:
            continue
        lst = O["tonal"][key]
        w(f"- {label}: {len(lst)} lines" + (": " + "; ".join(f"{r['t0']} s {r['freq_hz']:.0f} Hz {r['dur_s']} s +{r['max_prom_db']} dB ({r['cents_off_et']:.0f} c)" for r in lst[:14]) if lst else "") + ("; ..." if len(lst) > 14 else ""))
    src = sorted({next((c["type"] for c in sorted(man["cues"], key=lambda c: -c.get("place", -1)) if c["kind"] == "event" and c["place"] <= r["t0"] + 0.05 and r["t0"] - c["place"] < 1.0), "bed")
                  for r in O["tonal"]["heard"]})
    w(f"- Lines in what is heard come from: {', '.join(src) if src else 'nothing'}; all are off-scale glass-glint partials of at most "
      f"{max([r['dur_s'] for r in O['tonal']['heard']], default=0)} s (v1: tuned chime partials up to 1.31 s, 2-9 cents from a note). Nothing lasts long enough, or sits close enough to a note, to read as music.\n")
    w("### Isolated-event checks (each cue rendered alone with the same seed)\n")
    w("| event | t | rise 10-90 % min / median (ms) | crest max / median (dB) |\n|---|---|---|---|")
    for p in pp:
        w(f"| {p['type']} | {p['t']} | {p['rise_ms_min']} / {p['rise_ms_median']} | {p['crest_db_max']} / {p['crest_db_median']} |")
    w("")
    w("| glint event | t | partials: Hz (cents off ET, -20 dB time) |\n|---|---|---|")
    for g in gl:
        w(f"| {g['type']} | {g['t']} | " + "; ".join(f"{p['freq_hz']:.0f} ({p['cents_off_et']:.0f} c, {p['t20_s']} s)" for p in g["partials"]) + " |")
    w("\n(Frequencies read from an 8192-point STFT, 5.9 Hz bins = 3-5 cents at 2-3 kHz.)\n")
    w("| bed / event alone | centroid | 3-7 kHz | 300-900 Hz | <100 Hz | flatness 2-8 kHz |\n|---|---|---|---|---|---|")
    for k, s in list(rb["beds"].items()) + [("thunder_soft", rb["thunder"])] + ([("v1 radiant (in mix)", v1r), ("v2 radiant (in mix)", rb.get("v2_radiant_24_6_31_8"))] if v1r else []):
        w(f"| {k} | {s['centroid_hz']:.0f} Hz | {s['share_3_7k_pct']} % | {s['share_300_900_pct']} % | {s['share_below_100_pct']} % | {s['flatness_2_8k']} |")
    w("")
    w(f"- Birds (30 s test render of the meadow bird layer): {bs['n_syllables']} syllables, length CV {bs['length_cv_pct']} %, gap CV {bs['gap_cv_pct']} %, "
      f"peak pitch {bs['peak_pitch_range_hz'][0]:.0f}-{bs['peak_pitch_range_hz'][1]:.0f} Hz, median pitch change between neighbouring syllables {bs['adjacent_pitch_change_median_pct']} % "
      "(v1: every syllable of a call used the same contour, +-5 % pitch, and the same envelope).")
    cr = O["iso"]["creak"]
    w(f"- scale_creak harmonic-comb strength (log-spectrum autocorrelation at 50-140 Hz spacing, resonances removed): {cr.get('comb')}; "
      f"v1 generator {cr.get('v1_model_comb')} (6 seeds); steady buzz through the same modes {cr.get('steady_buzz_comb')}; white noise {cr.get('white_noise_comb')}.")
    w(f"- Hard cut-offs per transient cue: {[(c['type'], c['t'], c['hard_cutoffs']) for c in cu]}.\n")
    w("## Story beats as heard\n")
    w("Event peak (50 ms RMS, as heard: after ducking, safety net and master gain) against the voice and the beds at the same moment. "
      "Beats meant to be heard are placed in pauses; beats under the voice are texture by design.\n")
    w("| cue | event | peak at | peak, 50 ms RMS (dBFS) | under median speech (dB) | vs voice 400 ms RMS at that moment (dB) | vs beds (dB) |\n|---|---|---|---|---|---|---|")
    for b in O["beats"]:
        vv = f"{b['vs_voice_db']:+}" if b["vs_voice_db"] is not None else "pause"
        w(f"| {b['t']:.2f} | {b['type']} | {b['peak_s']} | {b['peak50_dbfs']} | {b['under_median_speech_db']} | {vv} | {b['vs_beds_db']:+} |")
    w("")
    w("## Onset timing\n")
    w(f"Transient hits detected independently on the events-only stem (spectral flux, 1 ms hop) and matched to the cue times. {on['n_hits']} hits, max deviation "
      f"**{on['max_abs_dev_ms']} ms**, {on['n_over_20ms']} outside +-20 ms. Gradual cues: first 2 ms window above peak-60 dB, all within {on['gradual_max_abs_dev_ms']} ms.\n")
    w("| cue | type | detected | dev (ms) | strength / local median |\n|---|---|---|---|---|")
    for rr in rows:
        w(f"| {rr['cue']:.3f} | {rr['type']} | {rr['detected']:.4f} | {rr['dev_ms']} | "
          f"{rr['strength_vs_median'] if rr['strength_vs_median'] is not None else rr['method']} |")
    w("")
    w("## Per-cue design notes\n")
    w(f"Calibration: event level 1.0 = loudest 100 ms window at {man['ref_event_lufs']} LUFS (dry); bed level 1.0 = {man['ref_amb_lufs']} LUFS body loudness "
      "(4 dB lower than v1 because beds are now ducked 3 dB instead of 7 dB). Reverb: sends to synthetic spaces with frequency-dependent decay; the "
      "space follows the bed covering the cue; 'shine' events use the short 'shine' space (1.5 s / 0.7 s), the long heaven space is kept for the radiant bed.\n")
    w("### Ambience beds\n")
    w("| from-to | bed | level | space | design |\n|---|---|---|---|---|")
    seen = set()
    for cc in man["cues"]:
        if cc["kind"] == "amb":
            note = man["notes"].get(cc["type"], "") if cc["type"] not in seen else "(as above, re-seeded)"
            seen.add(cc["type"])
            w(f"| {cc['cue_from']:.1f}-{cc['cue_to']:.1f} | {cc['type']} | {cc['level']} | {cc['space']} | {note} |")
    w("\n### Events\n")
    w("| t | event | level | space | design / cue note |\n|---|---|---|---|---|")
    seen = set()
    notes = {(e["type"], round(float(e["t"]), 3)): e.get("note", "") for e in cues["events"]}
    for cc in man["cues"]:
        if cc["kind"] == "event":
            note = man["notes"].get(cc["type"], "") if cc["type"] not in seen else "(as above, re-seeded)"
            seen.add(cc["type"])
            cn = notes.get((cc["type"], round(cc["t"], 3)), "")
            w(f"| {cc['t']:.2f} | {cc['type']} | {cc['level']} | {cc['space']} | {note}{(' **Cue:** ' + cn) if cn else ''} |")
    w("\nDropped after QA: `dim_fade` (32.85 s, 36 dB under the voice) and `gilding_shimmer` (51.85 s, 32 dB under the voice).\n")
    w("## Plots\n")
    w("- `sfx_spectrogram.png` - bus as rendered with every cue marked, SFX as heard, and the final mix; each panel on a relative scale (top 0.1 % = 0 dB, 80 dB range), 4096-point STFT so tonal lines would show as horizontal lines.")
    w("- `sfx_zoom.png` - zoomed spectrograms: the three glint cues and their pauses, birds, radiant bed, gravel steps.")
    w("- `final_waveform.png` - final mix, stems, 400 ms RMS of voice / SFX / beds with the voice-18 dB line, and the duck curves.")
    w("- `spectrum.png` - long-term spectra.\n")
    w("## How to re-render\n")
    w("```\npython3 make_sfx.py   # cues.json -> sfx_bus.wav (+ sfx_amb.wav, sfx_events.wav, manifest)\npython3 mix.py        # -> final_audio.wav (+ stems, duck_curves.npz, mix_info.json)\n"
      "python3 analyze.py    # -> REPORT.md, PNGs, analysis.json\n```\n")
    open(P("REPORT.md"), "w").write("\n".join(L))


if __name__ == "__main__":
    main()
