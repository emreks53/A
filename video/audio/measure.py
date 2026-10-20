#!/usr/bin/env python3
"""measure.py - objective checks of the soundtrack (used by mix.py's report; also standalone).

  word_band_snr   per-word voice-to-SFX ratio in octave bands 250 Hz-8 kHz, on voiced frames only
                  (voice = one channel of voice_proc, SFX = per-sample max of the two channels'
                  band energy: the pessimistic ear), plus a SII-like band-importance index
  key_word_rows   the same for the narration's key words (the on-screen keywords of
                  comp/sync_points.json and a few named ones)
  ltas            long-term third-octave spectrum voice vs SFX during words
  duck_stability  how often a gain curve swings by more than 3 dB within 0.6 s, and full cycles
  tick_sync       UI ticks of cues.json against the overlay sync points
  tonal_scan      narrow spectral peaks that persist >= 0.25 s in the SFX (anything musical/tonal)

usage: python3 measure.py [AUDIO_DIR]   (reads sfx_stem.wav / voice_proc.wav written by mix.py)
"""
import json
import os
import subprocess
import sys
import unicodedata

import numpy as np
from scipy import signal
from scipy.ndimage import binary_dilation, label, median_filter

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.dirname(HERE)
SR = 48000
OCT = [250, 500, 1000, 2000, 4000, 8000]
OCT_W = np.array([0.0617, 0.1671, 0.2373, 0.2648, 0.2142, 0.0549])   # ANSI S3.5 octave importance
NAMED_KEY = ["Allah", "örtmek", "kan", "güneş", "takdim", "içmek", "bir", "721", "Haluk", "Rahim",
             "birer", "şuursuz", "cansız", "şefkatsiz", "hakikati", "Sözler"]


def norm(s):
    s = s.replace("ı", "i").replace("İ", "i").lower()
    return "".join(ch for ch in unicodedata.normalize("NFKD", s) if not unicodedata.combining(ch))


def load_raw_voice(path=os.path.join(HERE, "narration.m4a")):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def all_words():
    shots = json.load(open(os.path.join(VIDEO, "timing", "shots.json"), encoding="utf-8"))["shots"]
    out, seen = [], set()
    for sh in shots:
        for x in sh["words"]:
            k = (x["w"], x["s"])
            if k not in seen:
                seen.add(k)
                out.append(dict(shot=sh["id"], **x))
    return out


def sync_points():
    p = os.path.join(VIDEO, "comp", "sync_points.json")
    return json.load(open(p, encoding="utf-8"))["points"] if os.path.exists(p) else []


def key_words(words, points):
    kt = [p["t"] for p in points if p.get("kind") == "keyword" and not isinstance(p["t"], list)]
    named = {norm(w) for w in NAMED_KEY}
    return [x for x in words if any(abs(x["s"] - t) < 0.12 for t in kt) or norm(x["w"]) in named]


def word_band_snr(voice_ch, sfx_st, raw_voice, words):
    n = len(voice_ch)
    raw = np.concatenate([raw_voice, np.zeros(max(n - len(raw_voice), 0))])[:n]
    w = int(0.02 * SR)
    c = np.concatenate([[0.0], np.cumsum(raw ** 2)])
    e = 10 * np.log10((c[w:] - c[:-w]) / w + 1e-14)
    voiced = np.zeros(n, bool)
    voiced[w // 2:w // 2 + len(e)] = e > -32
    VB, SB = [], []
    for f in OCT:
        sos = signal.butter(4, [f / np.sqrt(2), min(f * np.sqrt(2), 20000)], "bandpass", fs=SR, output="sos")
        VB.append(signal.sosfiltfilt(sos, voice_ch) ** 2)
        sb = signal.sosfiltfilt(sos, sfx_st, axis=0)
        SB.append(np.maximum(sb[:, 0] ** 2, sb[:, 1] ** 2))
    VB, SB = np.array(VB) * voiced, np.array(SB) * voiced
    z = np.zeros((len(OCT), 1))
    cV, cS = np.concatenate([z, np.cumsum(VB, 1)], 1), np.concatenate([z, np.cumsum(SB, 1)], 1)
    cN = np.concatenate([[0], np.cumsum(voiced)])
    rows = []
    for x in words:
        a, b = int(x["s"] * SR), min(int(x["e"] * SR), n)
        nv = cN[b] - cN[a]
        if nv < int(0.04 * SR):
            continue
        ev, es = (cV[:, b] - cV[:, a]) / nv, (cS[:, b] - cS[:, a]) / nv
        snr = 10 * np.log10(ev / (es + 1e-20) + 1e-20)
        sii = float(((np.clip(snr, -15, 15) + 15) / 30 * OCT_W).sum())
        rows.append(dict(w=x["w"], s=x["s"], shot=x["shot"], sii=round(sii, 3), snr=[round(float(v), 1) for v in snr]))
    return rows


def summarize_snr(rows):
    A = np.array([r["snr"] for r in rows])
    return {"words": len(rows),
            "median_snr_db_250_8k": [round(float(v), 1) for v in np.median(A, 0)],
            "p10_snr_db_250_8k": [round(float(v), 1) for v in np.percentile(A, 10, 0)],
            "frac_words_sfx_louder_1k_2k_4k": [round(float((A[:, i] < 0).mean()), 3) for i in (2, 3, 4)],
            "frac_words_below_6db_2k": round(float((A[:, 3] < 6).mean()), 3),
            "frac_words_below_10db_1k_2k_4k": [round(float((A[:, i] < 10).mean()), 3) for i in (2, 3, 4)],
            "mean_index": round(float(np.mean([r["sii"] for r in rows])), 3),
            "worst": sorted(rows, key=lambda r: r["sii"])[:10]}


def ltas(voice_ch, sfx_st, words):
    mask = np.zeros(len(voice_ch), bool)
    for x in words:
        mask[int(x["s"] * SR):int(x["e"] * SR)] = True
    f, Pv = signal.welch(voice_ch[mask], fs=SR, nperseg=4096)
    _, P0 = signal.welch(sfx_st[mask, 0], fs=SR, nperseg=4096)
    _, P1 = signal.welch(sfx_st[mask, 1], fs=SR, nperseg=4096)
    Ps = (P0 + P1) / 2
    out = {}
    for cf in [63, 125, 250, 500, 1000, 2000, 3150, 4000, 6300, 8000, 12500]:
        m = (f >= cf / 2 ** (1 / 6)) & (f < cf * 2 ** (1 / 6))
        out[cf] = round(float(10 * np.log10(Pv[m].sum() / Ps[m].sum())), 1)
    return out


def duck_stability(g_db, fs):
    """g_db: gain curve (dB) sampled at fs. Fraction of time with > 3 dB swing inside 0.6 s, and
    number of full duck/recover cycles (crossing below -75 % and back above -25 % of the depth)."""
    from scipy.ndimage import maximum_filter1d, minimum_filter1d
    k = int(0.6 * fs)
    sw = maximum_filter1d(g_db, k) - minimum_filter1d(g_db, k)
    depth = -g_db.min() if g_db.min() < 0 else 1.0
    lo, hi = -0.75 * depth, -0.25 * depth
    st, cyc = 0, 0
    for x in g_db:
        if st == 0 and x < lo:
            st = 1
        elif st == 1 and x > hi:
            st, cyc = 0, cyc + 1
    return {"swing_gt3db_in_0.6s_pct": round(float((sw > 3).mean() * 100), 1), "full_cycles": cyc,
            "cycles_per_min": round(cyc / (len(g_db) / fs / 60), 1)}


def tick_sync(cues, points):
    pts = {p["id"]: p["t"] for p in points if not isinstance(p["t"], list)}
    pts["sh08.callout_hand"] = pts.get("co_hand", pts.get("sh08.callout_hand"))
    rows, worst = [], 0.0
    for c in cues:
        if c["gen"] != "ui_tick":
            continue
        t = pts.get(c["id"])
        d = None if t is None else round(c["t"] - t, 3)
        if d is not None:
            worst = max(worst, abs(d))
        rows.append((c["id"], c["t"], t, d))
    tick_ids = {c["id"] for c in cues if c["gen"] == "ui_tick"}
    graphic_kinds = {"callout", "ring", "network_node", "spiral", "counter_land", "widget"}
    missing = [p["id"] for p in points if p.get("kind") in graphic_kinds
               and p["id"] not in tick_ids and not (p["id"] == "co_hand" and "sh08.callout_hand" in tick_ids)]
    return {"ticks": len(rows), "matched": sum(r[3] is not None for r in rows), "max_abs_offset_s": worst,
            "unmatched_ticks": [r[0] for r in rows if r[3] is None], "graphics_without_tick": missing}


def tonal_scan(sfx_st, shots=None):
    m = (sfx_st[:, 0] + sfx_st[:, 1]) / 2
    nfft, hop = 8192, 2048
    f, t, Z = signal.stft(m, fs=SR, nperseg=nfft, noverlap=nfft - hop, boundary=None)
    P = 20 * np.log10(np.abs(Z) + 1e-10)
    prom = P - median_filter(P, size=(41, 1))
    mask = (prom > 12) & (P > P.max(0)[None, :] - 35) & (f[:, None] > 150) & (f[:, None] < 12000)
    lab, nl = label(binary_dilation(mask, structure=np.ones((3, 1))), structure=np.ones((3, 3)))
    hits = []
    for k in range(1, nl + 1):
        ii, jj = np.where(lab == k)
        dur = (jj.max() - jj.min() + 1) * hop / SR
        if dur >= 0.25:
            hits.append(dict(t=round(float(t[jj.min()]), 2), dur=round(dur, 2), f_lo=round(float(f[ii].min())),
                             f_hi=round(float(f[ii].max())), prom_db=round(float(prom[ii, jj].max()), 1)))
    return sorted(hits, key=lambda h: h["t"])


def main():
    import soundfile as sf
    d = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.environ.get("VIDEO_OUT", os.path.join(VIDEO, ".out")), "audio")
    V, _ = sf.read(os.path.join(d, "voice_proc.wav"), dtype="float64")
    S, _ = sf.read(os.path.join(d, "sfx_stem.wav"), dtype="float64")
    words = all_words()
    pts = sync_points()
    rows = word_band_snr(V[:, 0], S, load_raw_voice(), words)
    print(json.dumps(summarize_snr(rows), ensure_ascii=False, indent=1))
    keys = {(x["w"], x["s"]) for x in key_words(words, pts)}
    print("key words (SNR dB at 250/500/1k/2k/4k/8k):")
    for r in rows:
        if (r["w"], r["s"]) in keys:
            print(f"  {r['s']:7.2f} {r['w']:18s} {r['snr']}")
    print("LTAS voice-SFX during words:", ltas(V[:, 0], S, words))
    cues = json.load(open(os.path.join(HERE, "cues.json"), encoding="utf-8"))["cues"]
    print("tick sync:", tick_sync(cues, pts))
    print("tonal:", tonal_scan(S))


if __name__ == "__main__":
    main()
