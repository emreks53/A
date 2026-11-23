#!/usr/bin/env python3
"""audit.py - "how coarse is it?"  Measures every sound a cue sheet uses and every cue in its place in the mix.

    python3 audit.py [cues.json] [--lib DIR] [--title TEXT] [--out FILE.md] [--json FILE.json]

  --lib DIR   folder with the sfx.py / mix.py / meter.py to audit (default: this folder).  The v3 palette lives in
              v3_backup/, so `python3 audit.py v3_backup/cues.json --lib v3_backup` reproduces audit_before.md.

Per sound / per cue (measured on the sound exactly as the cue renders it, before the side-chain):
  dur      length in seconds
  att      attack: 10 % -> 90 % of the peak of the amplitude envelope (2 ms smoothing), first rise to the peak, ms
  rise10   hardest onset anywhere in the sound: largest gain of the 10 ms RMS envelope within 10 ms, in % of that
           envelope's peak (a dab / tick / knock: 70-100 %; a noise swell: 10-30 %; a tonal swell: < 10 %)
  cent     spectral centroid (power-weighted), Hz
  >6k >10k energy above 6 kHz / 10 kHz, dB relative to the sound's total energy
  flat     spectral flatness (geometric / arithmetic mean of the PSD) inside the band that holds the middle 90 % of
           the energy (at least one octave wide): 0 = pure tones, about 0.6-0.9 = noise
  crest    peak / RMS over the audible part (envelope above 1 % of its peak), dB
  rough    roughness: RMS of the envelope's 20-150 Hz modulation / mean envelope, % (flutter, crackle, rattling
           runs and bare noise are high; smooth tonal swells are low)
In the mix (after cue gain, peak trim and the side-chain; "LK100" = loudest 100 ms, K-weighted, LUFS scale):
  LK100, peak dBFS, share of the cue's energy that falls on speech, the words it overlaps.
"""
import argparse
import importlib
import json
import os
import sys

import numpy as np
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))


def envelope(x, smooth_ms=2.0):
    """Amplitude envelope of a stereo sound: sqrt(|hilbert(L)|^2 + |hilbert(R)|^2), Hann-smoothed."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    pad = 2400
    xp = np.concatenate([np.zeros((pad, x.shape[1])), x, np.zeros((pad, x.shape[1]))])
    e = np.sqrt(np.sum(np.abs(signal.hilbert(xp, axis=0)) ** 2, axis=1))
    w = np.hanning(int(smooth_ms * 1e-3 * SR) | 1)
    e = np.convolve(e, w / w.sum(), "same")
    return e[pad:pad + len(x)]


def intrinsic(x):
    """Measurements of one sound (float array (n, 2))."""
    x = np.asarray(x, dtype=np.float64)
    n = len(x)
    e = envelope(x)
    pk = float(e.max()) + 1e-20
    i90 = int(np.argmax(e >= 0.9 * pk))
    below = np.nonzero(e[:i90 + 1] <= 0.1 * pk)[0]
    i10 = int(below[-1]) if len(below) else 0
    att = (i90 - i10) / SR * 1000.0
    # hardest onset: largest gain of the 10 ms RMS envelope within 10 ms, in % of that envelope's peak
    k = int(0.010 * SR)
    pw = np.concatenate([np.zeros(k), np.sum(x * x, axis=1), np.zeros(k)])
    cs = np.concatenate([[0.0], np.cumsum(pw)])
    er = np.sqrt(np.maximum(cs[k:] - cs[:-k], 0.0) / k)
    rise5 = float(np.max(er[k:] - er[:-k]) / (er.max() + 1e-20) * 100.0)
    # spectrum (Welch, both channels)
    nper = min(2048, n)
    f, P = signal.welch(x, SR, nperseg=nper, nfft=4096, axis=0, window="hann", noverlap=nper // 2)
    P = P.sum(axis=1)
    tot = P.sum() + 1e-30
    cent = float((f * P).sum() / tot)
    hf6 = 10 * np.log10(P[f >= 6000].sum() / tot + 1e-12)
    hf10 = 10 * np.log10(P[f >= 10000].sum() / tot + 1e-12)
    c = np.cumsum(P) / tot
    lo, hi = int(np.searchsorted(c, 0.05)), int(np.searchsorted(c, 0.95)) + 1
    # ... but never narrower than one octave round its middle (a single partial would otherwise be measured
    # across its own spectral peak and come out "flat")
    fm = np.sqrt(max(f[lo], 20.0) * max(f[min(hi, len(f) - 1)], 20.0))
    lo, hi = min(lo, int(np.searchsorted(f, fm / 1.4142))), max(hi, int(np.searchsorted(f, fm * 1.4142)))
    band = P[lo:max(hi, lo + 4)] + 1e-30
    flat = float(np.exp(np.mean(np.log(band))) / np.mean(band))
    act = np.nonzero(e > 0.01 * pk)[0]
    a, b = int(act[0]), int(act[-1]) + 1
    seg = x[a:b]
    crest = 20 * np.log10(np.abs(seg).max() / (np.sqrt(np.mean(seg ** 2)) + 1e-20))
    # roughness: 20-150 Hz modulation of the envelope relative to its mean, over the audible part
    pad = SR // 4
    ep = np.concatenate([np.zeros(pad), e, np.zeros(pad)])
    mod = signal.sosfiltfilt(signal.butter(2, [20.0, 150.0], "bandpass", fs=SR, output="sos"), ep)[pad:pad + n]
    aud = e > 0.1 * pk
    rough = float(np.sqrt(np.mean(mod[aud] ** 2)) / (np.mean(e[aud]) + 1e-20) * 100.0)
    return dict(dur=n / SR, att=att, rise5=rise5, cent=cent, hf6=float(hf6), hf10=float(hf10), flat=flat,
                crest=float(crest), rough=rough)


def erb_bands(x, fmin=100.0, fmax=8000.0):
    """Power in 1-ERB-wide bands (Glasberg & Moore), 43 ms Hann frames every 10 ms.  -> (t_centres, f_centres, P[frames, bands])"""
    x = np.asarray(x, dtype=np.float64)
    nper, hop = 2048, 480
    pad = np.zeros((nper // 2, x.shape[1]))
    f, t, S = signal.stft(np.concatenate([pad, x, pad]), SR, window="hann", nperseg=nper, noverlap=nper - hop, axis=0,
                          boundary=None, padded=False)
    Pw = (np.abs(S) ** 2).sum(axis=1)                      # (freq, frames), both channels
    e = lambda fr: 21.4 * np.log10(4.37e-3 * fr + 1.0)   # noqa: E731  ERB-number scale
    inv = lambda q: (10 ** (q / 21.4) - 1.0) / 4.37e-3   # noqa: E731
    edges = inv(np.arange(e(fmin), e(fmax) + 1e-9, 1.0))
    out = np.stack([Pw[(f >= lo) & (f < hi)].sum(axis=0) for lo, hi in zip(edges[:-1], edges[1:])], axis=1)
    return t - (nper // 2) / SR, np.sqrt(edges[:-1] * edges[1:]), out


def fmt_intr(m):
    return "%5.2f | %5.0f | %4.0f | %5.0f | %5.1f | %5.1f | %4.2f | %4.1f | %4.0f" % (
        m["dur"], m["att"], m["rise5"], m["cent"], m["hf6"], m["hf10"], m["flat"], m["crest"], m["rough"])


HEAD_INTR = "dur s | att ms | rise10 % | cent Hz | >6k dB | >10k dB | flat | crest dB | rough %"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cues", nargs="?", default=os.path.join(HERE, "cues.json"))
    ap.add_argument("--lib", default=HERE)
    ap.add_argument("--title", default="SFX audit")
    ap.add_argument("--out", default=None)
    ap.add_argument("--json", default=None)
    ap.add_argument("--timing", default=os.path.join(HERE, "..", "timing.json"))
    a = ap.parse_args()
    sys.path.insert(0, os.path.abspath(a.lib))
    mixer = importlib.import_module("mix")
    sfx = importlib.import_module("sfx")
    meter = importlib.import_module("meter")
    with open(a.cues) as fh:
        sheet = json.load(fh)
    with open(a.timing) as fh:
        words = json.load(fh)["words"]
    base = os.path.dirname(os.path.abspath(a.cues))
    voice = os.path.join(HERE, sheet.get("voice", "voice_trim.wav"))
    r = mixer.build(sheet, voice, base)
    rep, S = r["report"], r["settings"]
    speech, duck = r["speech"], r["duck_db"]
    n_total = len(speech)
    out = []
    P = out.append
    P("# %s" % a.title)
    P("")
    P("Cue sheet `%s`, palette `%s/sfx.py`. Columns: see the docstring of `audit.py` (att = 10-90 %% attack, rise10 = "
      "hardest 10 ms onset in %% of the peak, flat = spectral flatness 0 tone .. 1 noise, rough = 20-150 Hz envelope "
      "modulation). Nobody listened; these are measurements." % (os.path.relpath(a.cues, HERE), os.path.relpath(a.lib, HERE)))
    P("")
    P("## 1. The bus")
    P("")
    bus = np.asarray(r["sfx"])
    f, Pb = signal.welch(bus, SR, nperseg=8192, axis=0)
    Pb = Pb.sum(axis=1)
    hf6 = 10 * np.log10(Pb[f >= 6000].sum() / Pb.sum() + 1e-12)
    hf10 = 10 * np.log10(Pb[f >= 10000].sum() / Pb.sum() + 1e-12)
    cent = float((f * Pb).sum() / Pb.sum())
    busnum = dict(gated=rep["sfx_lufs_gated"], speech=rep["sfx_lufs_speech"], pauses=rep["sfx_lufs_pauses"],
                  mom_max=rep["sfx_mom_max"], st_max_speech=rep["sfx_st_max_speech"], st_max_any=rep["sfx_st_max_any"],
                  peak=rep["sfx_peak"], tp=rep["sfx_tp"], whole=rep["sfx_lufs_whole"], hf6=float(hf6), hf10=float(hf10),
                  centroid=cent, voice=rep["voice_lufs"], mix_lufs=rep["mix_lufs"], mix_tp=rep["mix_tp"],
                  n_cues=rep["n_cues"], duck_db=S["duck_db"], peak_cap=S["sfx_peak_max"])
    P("| measure | value |")
    P("|---|---|")
    P("| cues | %d |" % rep["n_cues"])
    P("| SFX bus, gated integrated | %.1f LUFS |" % busnum["gated"])
    P("| SFX bus while the narrator speaks | %.1f LUFS (voice %.1f: %.1f LU below) |" % (busnum["speech"], busnum["voice"], busnum["voice"] - busnum["speech"]))
    P("| SFX bus in the pauses between words | %.1f LUFS |" % busnum["pauses"])
    P("| momentary max (400 ms) | %.1f LUFS |" % busnum["mom_max"])
    P("| short-term max (3 s) while speaking / anywhere | %.1f / %.1f LUFS |" % (busnum["st_max_speech"], busnum["st_max_any"]))
    P("| highest effect peak | %.1f dBFS sample, %.1f dBTP (cap %.1f) |" % (busnum["peak"], busnum["tp"], busnum["peak_cap"]))
    P("| bus energy above 6 kHz / 10 kHz | %.1f / %.1f dB re total |" % (hf6, hf10))
    P("| bus spectral centroid | %.0f Hz |" % cent)
    P("| side-chain duck under speech | %.1f dB |" % S["duck_db"])
    P("| final mix | %.2f LUFS, %.2f dBTP |" % (rep["mix_lufs"], rep["mix_tp"]))
    P("")

    # ---- per sound (as the sheet uses them: one row per sound name, default parameters, default level) ----
    used = []
    for c in sheet["cues"]:
        if c["sound"] not in used:
            used.append(c["sound"])
    P("## 2. Every sound the sheet uses (default parameters, default level, seed 0)")
    P("")
    P("| sound | cues | " + HEAD_INTR + " | LK100 | peak dBFS |")
    P("|---|---|" + "---|" * 11)
    snd_rows = {}
    for name in used:
        s = sfx.render(name, seed=0)
        m = intrinsic(s)
        m.update(lk100=meter.max_window_lufs(s, 0.1), peak=meter.sample_peak_db(s),
                 n=sum(1 for c in sheet["cues"] if c["sound"] == name))
        snd_rows[name] = m
        P("| `%s` | %d | %s | %5.1f | %5.1f |" % (name, m["n"], fmt_intr(m), m["lk100"], m["peak"]))
    P("")

    # ---- per cue, in context ----
    P("## 3. Every cue in its place")
    P("")
    P("| # | t s | sound | gain dB | " + HEAD_INTR + " | LK100 in mix | peak in mix dBFS | on speech % | overlaps the words | what it accompanies |")
    P("|---|---|---|---|" + "---|" * 14)
    cue_rows = []
    for k, (c, row) in enumerate(zip(sheet["cues"], rep["cues"])):
        params = dict(c.get("params", {}))
        if "pan" in c:
            params["pan"] = c["pan"]
        if "seed" in c:
            params["seed"] = c["seed"]
        import zlib
        params.setdefault("seed", zlib.crc32(("%s@%.3f" % (c["sound"], float(c["t"]))).encode()) & 0x7FFFFFFF)
        s = np.asarray(sfx.render(c["sound"], **params), dtype=np.float64)
        s = s * 10 ** ((row["gain_db"] + row["trim_db"]) / 20.0)
        m = intrinsic(s)
        i0 = int(round(row["start"] * SR))
        a0, b0 = max(i0, 0), min(i0 + len(s), n_total)
        seg = s[a0 - i0:b0 - i0] * (10 ** (duck[a0:b0] / 20.0))[:, None]
        e2 = np.sum(seg ** 2, axis=1)
        on_speech = float(e2[speech[a0:b0]].sum() / (e2.sum() + 1e-30) * 100.0)
        env = envelope(seg)
        aud = np.nonzero(env > 0.03 * env.max())[0]
        ta, tb = (a0 + aud[0]) / SR, (a0 + aud[-1]) / SR
        ws = [w["w"] for w in words if w["t"] < tb and w["end"] > ta]
        m["_seg"], m["_a0"] = seg, a0
        m.update(i=k, t=float(c["t"]), sound=c["sound"], gain=row["gain_db"] + row["trim_db"],
                 lk100_mix=meter.max_window_lufs(seg, 0.1), peak_mix=meter.sample_peak_db(seg), on_speech=on_speech,
                 words=ws, start=row["start"], end=row["end"], audible=(ta, tb), note=c.get("note", ""))
        cue_rows.append(m)
        P("| %d | %.3f | `%s` | %+.1f | %s | %5.1f | %5.1f | %3.0f | %s | %s |" % (
            k, m["t"], m["sound"], m["gain"], fmt_intr(m), m["lk100_mix"], m["peak_mix"], on_speech,
            " ".join(ws) if ws else "-", m["note"]))
    P("")

    # ---- under the narrator: effect level against the voice's masked threshold, critical band by critical band ----
    P("## 4. Under the narrator (a rough masking model: 1-ERB bands 100 Hz - 8 kHz, 43 ms frames)")
    P("")
    P("Masked threshold of the voice in a band = the voice's level there and in the neighbouring bands (spread "
      "-9 dB per ERB upward, -20 dB per ERB downward), held for 30 ms, minus 8 dB. `excess` = effect level minus that "
      "threshold, maximum over the bands (dB): below 0 the voice hides the effect completely, 0-10 dB it is faintly "
      "there, far above it stands in the clear (a pause, or a gap between syllables). "
      "\"heard\" = share of the cue's frames (those within 20 dB of its own loudest frame) with excess above 0; "
      "\"clear\" = above +15 dB. A model, not a listening test.")
    P("")
    tb, fb, Pbus = erb_bands(np.asarray(r["sfx"]))
    _, _, Pvoice = erb_bands(np.asarray(r["voice"]))
    nb = Pvoice.shape[1]
    d = np.arange(nb)[None, :] - np.arange(nb)[:, None]              # d[i, j] = j - i  (target band minus masker band)
    W = 10.0 ** (-np.where(d >= 0, 9.0 * d, -20.0 * d) / 10.0)       # masker i -> band j
    from scipy import ndimage
    Ev = ndimage.maximum_filter1d(Pvoice @ W, size=5, origin=1, axis=0, mode="nearest")   # frames t-3 .. t+1
    thr = 10 * np.log10(Ev + 1e-13) - 8.0

    def excess_of(Pc):
        return (10 * np.log10(Pc + 1e-16) - thr).max(axis=1)

    exm = excess_of(Pbus)
    lev = 10 * np.log10(Pbus.sum(axis=1) + 1e-16)
    sp_fr = speech[np.clip((tb * SR).astype(int), 0, n_total - 1)]
    vlev = 10 * np.log10(Pvoice.sum(axis=1) + 1e-13)
    loud = sp_fr & (vlev > np.median(vlev[sp_fr]) - 15.0)             # frames well inside words
    act = lev > -60.0                                                # the bus is sounding (same absolute gate for any sheet)
    sel = loud & act
    domin = dict(max_excess_in_words=float(exm[sel].max()) if sel.any() else -200.0,
                 p95_excess_in_words=float(np.percentile(exm[sel], 95)) if sel.any() else -200.0,
                 median_excess_in_words=float(np.median(exm[sel])) if sel.any() else -200.0,
                 share_heard_in_words=float((exm[sel] > 0.0).mean() * 100.0) if sel.any() else 0.0,
                 share_above_10_in_words=float((exm[sel] > 10.0).mean() * 100.0) if sel.any() else 0.0,
                 seconds_with_sfx_in_words=float(sel.sum() * 0.01))
    P("While the narrator is inside a word (voice within 15 dB of its median speech level) and the bus is sounding "
      "(%.1f s in all): excess median **%.1f dB**, 95th percentile **%.1f dB**, maximum **%.1f dB**; "
      "the effect is above the voice's threshold in %.0f %% of those frames and more than 10 dB above it in %.0f %%."
      % (domin["seconds_with_sfx_in_words"], domin["median_excess_in_words"], domin["p95_excess_in_words"],
         domin["max_excess_in_words"], domin["share_heard_in_words"], domin["share_above_10_in_words"]))
    P("")
    P("| # | t s | sound | frames | heard % | clear % | excess while inside a word: median / max dB |")
    P("|---|---|---|---|---|---|---|")
    for m in cue_rows:
        if m["sound"] == "room_tone":
            continue
        full = np.zeros((n_total, 2))
        full[m["_a0"]:m["_a0"] + len(m["_seg"])] = m["_seg"]
        _, _, Pc = erb_bands(full)
        lc = 10 * np.log10(Pc.sum(axis=1) + 1e-16)
        on = lc > lc.max() - 20.0
        exc = excess_of(Pc)
        heard = float((exc[on] > 0.0).mean() * 100.0)
        clear = float((exc[on] > 15.0).mean() * 100.0)
        w = on & loud
        mx = float(exc[w].max()) if w.any() else float("nan")
        md = float(np.median(exc[w])) if w.any() else float("nan")
        m.update(heard=heard, clear=clear, max_excess_in_words=mx, median_excess_in_words=md)
        P("| %d | %.3f | `%s` | %d | %3.0f | %3.0f | %s |" % (m["i"], m["t"], m["sound"], int(on.sum()), heard, clear,
                                                             "%.1f / %.1f" % (md, mx) if mx == mx else "never inside a word"))
    P("")
    busnum.update(domin)
    for m in cue_rows:
        m.pop("_seg", None)
        m.pop("_a0", None)
    text = "\n".join(out) + "\n"
    if a.out:
        with open(a.out, "w") as fh:
            fh.write(text)
    else:
        sys.stdout.write(text)
    if a.json:
        with open(a.json, "w") as fh:
            json.dump(dict(bus=busnum, sounds=snd_rows, cues=cue_rows), fh, indent=1, default=float)


if __name__ == "__main__":
    main()
