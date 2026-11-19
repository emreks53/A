#!/usr/bin/env python3
"""make_sfx.py - render the procedural SFX bus for the short, driven ONLY by cues.json.

Output (48 kHz, float32, stereo, exactly cues['duration'] seconds):
  sfx_bus.wav        full SFX bus (ambience + events + their reverb), pre-ducking, at
                     "final-mix scale" (i.e. calibrated against a voice at ~-14 LUFS)
  sfx_amb.wav        ambience-only stem   (debug / measurement)
  sfx_events.wav     events-only stem     (debug / onset check)
  sfx_manifest.json  every placed cue with seed, space, gain, measured start/impact times

Everything is synthesised: spectrally-shaped noise (STFT masks), granular clouds of
resonant noise bursts, damped-sine modal models, stick-slip excitation, and a synthetic
frequency-dependent convolution reverb per acoustic space. All randomness is seeded from
crc32(type, time, ...) so a cue edit re-renders deterministically and only that cue changes.
"""
import hashlib
import json
import os
import sys
import zlib

import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import gaussian_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from audiolib import SR, N, peak_window_loudness, kweight  # noqa: E402

# ----------------------------------------------------------------------------------------
# Calibration. The bus is rendered at final-mix scale assuming the voice ends up ~-14 LUFS.
#   event : level 1.0 -> loudest 100 ms window of the dry event = REF_EVENT_LUFS
#   bed   : level 1.0 -> K-weighted loudness of the bed body      = REF_AMB_LUFS
# mix.py then ducks the bus a further ~7 dB under speech.
# ----------------------------------------------------------------------------------------
# mix.py ducks the events ~7 dB under speech but the beds only ~3 dB (and holds that through every
# pause, so they do not pump), hence the beds are calibrated 4 dB lower than before (-33 -> -37):
# under speech they sit where they did, in gaps / after the last word they rise only 3 dB.
REF_EVENT_LUFS = -23.0
REF_AMB_LUFS = -37.0
MASTER_TRIM_DB = 0.0
TYPE_TRIM_DB = {}  # optional per-type trims, e.g. {"thunder_soft": -2.0}
MASTER_FADE_OUT_S = 1.0   # the bus fades over its last second (QA #11)

# ======================================================================================
# basic helpers
# ======================================================================================

def rng_for(*key):
    return np.random.default_rng(zlib.crc32(repr(key).encode("utf-8")))


def tv(n):
    return np.arange(n) / SR


def rms(x):
    return float(np.sqrt(np.mean(np.square(x)) + 1e-30))


def unit(x):
    return x / (rms(x) + 1e-20)


def add(buf, x, i0):
    i0 = int(i0)
    a, b = max(i0, 0), min(i0 + len(x), len(buf))
    if b > a:
        buf[a:b] += x[a - i0:b - i0]


_SOS = {}


def bfilt(x, kind, f, order=2):
    key = (kind, tuple(np.atleast_1d(f).tolist()), order)
    if key not in _SOS:
        _SOS[key] = signal.butter(order, f, btype=kind, fs=SR, output="sos")
    return signal.sosfilt(_SOS[key], x, axis=0)


def soft_lp(x, fc=6500):
    """4th-order low-pass used on every transient foley layer (keeps grains round, no tick-hiss)."""
    return bfilt(x, "lowpass", fc, 4)


def reson(x, f0, Q):
    f0 = float(min(f0, 0.45 * SR))
    b, a = signal.iirpeak(f0, Q, fs=SR)
    return signal.lfilter(b, a, x)


def pan(x, p=0.0):
    th = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], axis=1)


def balance(x, p):
    """time-varying balance for a stereo signal (centre = unity)."""
    th = (np.clip(p, -1, 1) + 1) * np.pi / 4
    g = np.sqrt(2.0)
    return np.stack([x[:, 0] * g * np.cos(th), x[:, 1] * g * np.sin(th)], axis=1)


def width(x, w):
    """M/S width, w may be an array (0 = mono, 1 = unchanged, >1 wider)."""
    m = 0.5 * (x[:, 0] + x[:, 1])
    s = 0.5 * (x[:, 0] - x[:, 1]) * w
    return np.stack([m + s, m - s], axis=1)


def st(x):
    return np.stack([x, x], axis=1) if x.ndim == 1 else x


# ======================================================================================
# envelopes and control signals
# ======================================================================================

def rc_fade(n, a_s, r_s):
    e = np.ones(n)
    na, nr = min(N(a_s), n), min(N(r_s), n)
    if na > 0:
        e[:na] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(na) / na)
    if nr > 0:
        e[n - nr:] *= 0.5 + 0.5 * np.cos(np.pi * (np.arange(nr) + 1) / nr)
    return e


def env_swell(n, peak=0.5, p_up=2.0, p_dn=2.0):
    x = np.arange(n) / max(n - 1, 1)
    e = np.empty(n)
    up = x < peak
    e[up] = np.sin(0.5 * np.pi * x[up] / peak) ** p_up
    e[~up] = np.cos(0.5 * np.pi * (x[~up] - peak) / (1 - peak)) ** p_dn
    return e


def env_hit(n, attack, tau, hold=0.0):
    t = tv(n)
    e = np.exp(-np.maximum(t - attack - hold, 0) / tau)
    na = max(1, N(attack))
    e[:na] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(na) / na)
    return e * rc_fade(n, 0, min(0.006, n / SR / 4))


class Ctrl:
    """smooth random control signal in [0,1], callable on any time array (seconds)."""

    def __init__(self, dur, rate, rng, cr=200.0, contrast=1.0):
        k = int(dur * cr) + 4
        sig = cr / (2 * np.pi * rate)
        pad = int(4 * sig) + 2
        x = gaussian_filter1d(rng.standard_normal(k + 2 * pad), sig)[pad:pad + k]
        x *= np.sqrt(2 * np.sqrt(np.pi) * sig)  # unit variance, independent of length
        self.v = 0.5 + 0.5 * np.tanh(0.9 * contrast * x)
        self.t = np.arange(k) / cr

    def __call__(self, t):
        t = np.asarray(t, dtype=float)
        return np.interp(t.ravel(), self.t, self.v).reshape(t.shape)


def poisson_times(rng, dur, rate_max, rate_fn=None):
    k = rng.poisson(max(rate_max * dur, 0))
    ts = np.sort(rng.uniform(0, dur, k))
    if rate_fn is not None and len(ts):
        ts = ts[rng.uniform(0, 1, len(ts)) < rate_fn(ts) / rate_max]
    return ts


def crinkle(n, rng, rate, tau=0.006, sigma=0.7):
    """sparse positive micro-burst amplitude process (mean 1) for rustles/crackles."""
    imp = np.zeros(n)
    k = rng.poisson(rate * n / SR)
    if k:
        np.add.at(imp, rng.integers(0, n, k), rng.lognormal(0, sigma, k))
    ker = env_hit(max(N(tau * 6), 8), 0.0015, tau)
    am = signal.fftconvolve(imp, ker)[:n]
    return am / (am.mean() + 1e-9)


# ======================================================================================
# spectral (STFT-mask) noise sculpting
# ======================================================================================

def logbp(f, fc, sig):
    return np.exp(-0.5 * (np.log2((f + 1.0) / fc) / sig) ** 2)


def lowsoft(f, fc, order=2):
    return 1.0 / np.sqrt(1.0 + (f / fc) ** (2 * order))


def highsoft(f, fc, order=2):
    return 1.0 / np.sqrt(1.0 + (fc / np.maximum(f, 1e-3)) ** (2 * order))


def tilt(f, db_oct, ref=1000.0):
    return (np.maximum(f, 20.0) / ref) ** (db_oct / 6.0206)


def shape(x, mask, nfft=1024, frame_norm=True):
    hop = nfft // 4
    f, tt, Z = signal.stft(x, fs=SR, window="hann", nperseg=nfft, noverlap=nfft - hop)
    M = np.broadcast_to(mask(f[:, None], tt[None, :]), Z.shape).astype(float)
    if frame_norm:
        M = M / (np.sqrt(np.mean(M ** 2, axis=0, keepdims=True)) + 1e-12)
    _, y = signal.istft(Z * M, fs=SR, window="hann", nperseg=nfft, noverlap=nfft - hop)
    return y[: len(x)]


def mono_shaped(n, mask, rng, nfft=1024, frame_norm=True):
    return shape(rng.standard_normal(n + nfft), mask, nfft, frame_norm)[:n]


def st_shaped(n, mask, rng, corr=0.3, nfft=1024, frame_norm=True, maskR=None):
    """stereo shaped noise with inter-channel correlation `corr`."""
    wc = rng.standard_normal(n + nfft)
    wd = rng.standard_normal(n + nfft)
    a, b = np.sqrt((1 + corr) / 2), np.sqrt((1 - corr) / 2)
    L = shape(a * wc + b * wd, mask, nfft, frame_norm)[:n]
    R = shape(a * wc - b * wd, maskR or mask, nfft, frame_norm)[:n]
    return np.stack([L, R], axis=1)


# ======================================================================================
# grains / modal pieces
# ======================================================================================

def burst(rng, fc, Q, decay, attack=0.0003):
    L = decay * 6 + 4 * Q / (np.pi * fc) + 0.002
    n = max(24, N(L))
    x = rng.standard_normal(n) * env_hit(n, attack, decay)
    y = reson(x, fc, Q) * rc_fade(n, 0, min(0.004, L / 3))
    return y / (np.sqrt(np.sum(y * y)) + 1e-20)


def ping(f, tau, dur=None, attack=0.0005, phase=0.0):
    dur = dur or tau * 7
    n = max(16, N(dur))
    return np.sin(2 * np.pi * f * tv(n) + phase) * env_hit(n, attack, tau)


def modal(freqs, taus, amps, dur, attack=0.001, rng=None, detune=0.0):
    n = N(dur)
    y = np.zeros(n)
    for f, ta, a in zip(freqs, taus, amps):
        if f > 7800:
            continue
        if rng is not None and detune:
            f = f * (1 + rng.uniform(-detune, detune))
        y += a * ping(f, ta, dur, attack)
    return y


def chirp_tone(f_of_t, env):
    ph = 2 * np.pi * np.cumsum(f_of_t) / SR
    return np.sin(ph) * env


def glints(n, rng, rate, f_lo=2800, f_hi=6200, d_lo=0.025, d_hi=0.08, Q=(8, 16),
           fc_fn=None, pan_fn=None, rate_fn=None, amp_sigma=0.5, first_at=None):
    """cloud of soft, slightly pitched noise grains (noise-based shimmer, not tones)."""
    out = np.zeros((n, 2))
    ts = poisson_times(rng, max(n / SR - d_hi - 0.01, 0.01), rate, rate_fn)
    if first_at is not None:
        ts = np.r_[first_at, ts]
    for t0 in ts:
        m = N(rng.uniform(d_lo, d_hi))
        g = np.pad(rng.standard_normal(m) * np.hanning(m), (0, N(0.012)))
        fc = (fc_fn(t0) * rng.uniform(0.82, 1.22)) if fc_fn else f_lo * (f_hi / f_lo) ** rng.random()
        y = reson(g, min(fc, 6800), rng.uniform(*Q)) * rc_fade(len(g), 0, 0.005)
        y /= np.sqrt(np.sum(y * y)) + 1e-20
        p = pan_fn(t0) if pan_fn else rng.uniform(-0.8, 0.8)
        add(out, pan(y * rng.lognormal(0, amp_sigma), p), N(t0))
    return bfilt(out, "lowpass", 7200, 4)


def rustle(n, rng, lo=500, hi=4000, rate=70, tau=0.008, corr=0.7, floor=0.25):
    fc = np.sqrt(lo * hi)
    sig = np.log2(hi / lo) / 2.5
    mask = lambda f, t: logbp(f, fc, sig) * lowsoft(f, 7000, 3)  # noqa: E731
    base = st_shaped(n, mask, rng, corr)
    am = crinkle(n, rng, rate, tau)
    return base * (floor + am)[:, None]


def whoosh(n, rng, f0, f1, sig=1.0, peak=0.6, p_up=1.6, p_dn=2.0, corr=0.4,
           lp=6500, tilt_db=-2.0, curve=1.0, fc_fn=None):
    dur = n / SR
    if fc_fn is None:
        fc_fn = lambda t: f0 * (f1 / f0) ** (np.clip(t / dur, 0, 1) ** curve)  # noqa: E731
    mask = lambda f, t: (logbp(f, fc_fn(t), sig) * lowsoft(f, lp, 3)  # noqa: E731
                         * highsoft(f, 70, 2) * tilt(f, tilt_db))
    x = st_shaped(n, mask, rng, corr)
    return x * env_swell(n, peak, p_up, p_dn)[:, None]


def lpnoise(rng, n, fc, order=2):
    return bfilt(rng.standard_normal(n), "lowpass", fc, order)


def thud(rng, fc=420, decay=0.03, body_f=110, body_tau=0.03, grit=0.25, dur=0.22):
    n = N(dur)
    nz = unit(bfilt(rng.standard_normal(n) * env_hit(n, 0.0015, decay), "lowpass", fc, 2))
    t = tv(n)
    fb = body_f * (1 - 0.12 * (1 - np.exp(-t / 0.03)))  # slight pitch drop = weight
    body = unit(chirp_tone(fb, env_hit(n, 0.002, body_tau)))
    y = nz + 0.55 * body
    if grit > 0:
        gs = np.zeros(n)
        for t0 in 0.03 * rng.beta(1.0, 2.5, 10):
            add(gs, burst(rng, rng.uniform(1100, 3000), 1.5, rng.uniform(0.0008, 0.002))
                * rng.lognormal(0, 0.4), N(t0))
        y += grit * unit(gs)
    return soft_lp(y * rc_fade(n, 0.0, 0.02), 5000)


def pop(rng, fres=700, body=230, size=1.0, tail=True, attack=None, Q=None, puff=0.5):
    """soft muted pop (bud/fruit): a rounded 'puh', not a click and not a cartoon 'bloop'.

    A short resonant noise puff (6-10 ms Hann excitation, 600-1400 Hz, Q 2-4) at half the level of
    a small body tone with only +6 % pitch rise; both layers are peak-normalised and share a
    4.5-5.5 ms raised-cosine attack, so the pop rises in ~2.5 ms (10-90 %) with a 2 ms-peak /
    20 ms-RMS crest of ~9 dB (QA #6: the old pops rose in 0.5-1.3 ms with 12.5-16.4 dB crest)."""
    attack = attack if attack is not None else rng.uniform(0.0045, 0.0055)
    Q = Q if Q is not None else rng.uniform(2.2, 3.6)
    n = N(0.24)
    t = tv(n)
    m = N(rng.uniform(0.006, 0.010))
    exc = np.zeros(n)
    exc[:m] = rng.standard_normal(m) * np.hanning(m)
    a = reson(exc, fres, Q) * env_hit(n, attack, 0.016 * size)
    a /= np.abs(a).max() + 1e-20
    fb = body * (1 + 0.06 * (1 - np.exp(-t / 0.01)))
    b = chirp_tone(fb, env_hit(n, attack, 0.026 * size))
    b /= np.abs(b).max() + 1e-20
    y = puff * a + b
    if tail:
        rt = rustle(n, rng, 1300, 4200, 120, 0.004, 1.0)[:, 0] * env_hit(n, 0.012, 0.035)
        y += 0.1 * unit(rt) * rms(y)
    y = bfilt(y, "lowpass", 4200, 4)
    y *= rc_fade(n, attack, 0.04)   # the filters cannot sharpen the onset again
    return y


# ---- non-musical pitch helpers (QA: the old chimes sat on D6/E6/F#6/G6/A6 and formed little melodies)
def et_dev_cents(f):
    """distance (cents) from the nearest equal-tempered note (A4 = 440 Hz)."""
    c = 1200.0 * np.log2(np.asarray(f, dtype=float) / 440.0)
    return np.abs(c - 100.0 * np.round(c / 100.0))


CONSONANT_CENTS = (0, 300, 400, 500, 700, 800, 900, 1200)


def offscale_freqs(rng, k, lo=1900.0, hi=3200.0, min_cents=40.0):
    """k random frequencies in [lo, hi], each >= min_cents away from every equal-tempered note,
    >= 1 semitone apart, no pair within 35 cents of a consonant interval, and in an order that is
    neither rising nor falling (so a sequence never reads as a scale or arpeggio)."""
    out = []
    tries = 0
    while len(out) < k and tries < 20000:
        tries += 1
        f = lo * (hi / lo) ** rng.random()
        if et_dev_cents(f) < min_cents:
            continue
        ok = True
        for g in out:
            iv = abs(1200 * np.log2(f / g))
            if iv < 100 or min(abs(iv - c) for c in CONSONANT_CENTS) < 35:
                ok = False
                break
        if ok:
            out.append(f)
    out = np.array(out)
    if k >= 3:
        for _ in range(100):
            d = np.diff(out)
            if not (np.all(d > 0) or np.all(d < 0)):
                break
            rng.shuffle(out)
    return out


def glass_glint(rng, f, tau=None, dur=0.8, attack=0.002):
    """a short, unpitched-sounding glint: a soft strike on a tiny glass bead.

    Fundamental decays with tau 0.08-0.11 s (-20 dB in 0.18-0.25 s, -60 dB in 0.55-0.76 s); two
    inharmonic upper modes (x2.2-2.6, x4.3-5.1, random per strike) blur the pitch, and a 2.5 ms
    noise 'tick' of the strike sits on top. No beating partner, no long ring."""
    tau = tau if tau is not None else rng.uniform(0.08, 0.11)
    freqs = [f, f * rng.uniform(2.2, 2.6), f * rng.uniform(4.3, 5.1)]
    amps = [1.0, rng.uniform(0.1, 0.2), rng.uniform(0.03, 0.06)]
    taus = [tau, tau * rng.uniform(0.45, 0.6), tau * rng.uniform(0.25, 0.35)]
    n = N(dur)
    y = np.zeros(n)
    for fr, ta, am in zip(freqs, taus, amps):
        if fr > 6500:
            continue
        y += am * np.sin(2 * np.pi * fr * tv(n) + rng.uniform(0, 2 * np.pi)) * env_hit(n, attack, ta)
    m = N(0.0025)
    exc = np.zeros(n)
    exc[:m] = rng.standard_normal(m) * np.hanning(m)
    tick = reson(exc, f * rng.uniform(1.15, 1.5), 1.8)
    y = y / (np.abs(y).max() + 1e-20)
    y += 0.3 * tick / (np.abs(tick).max() + 1e-20)
    return bfilt(y, "lowpass", 6500, 2) * rc_fade(n, 0, 0.05)


# ======================================================================================
# reverb spaces (synthetic, frequency-dependent decay)
# ======================================================================================

SPACES = {
    "garden":   dict(rt=(0.9, 0.3), pre=0.012, length=1.6, lp=6000, hp=180,
                     er=[(0.011, 0.30), (0.019, 0.22), (0.033, 0.16), (0.051, 0.10)]),
    "sky":      dict(rt=(2.6, 1.1), pre=0.030, length=4.2, lp=6500, hp=160, er=[]),
    "heaven":   dict(rt=(3.4, 1.6), pre=0.035, length=5.2, lp=7000, hp=220, er=[]),
    # short bright-but-dark-topped space for the 'shine' events (glints, swells of light): their
    # tails must not ring through the narrator's pauses (QA #1)
    "shine":    dict(rt=(1.5, 0.7), pre=0.020, length=2.6, lp=6500, hp=250,
                     er=[(0.013, 0.18), (0.024, 0.12)]),
    "hollow":   dict(rt=(2.0, 0.55), pre=0.022, length=3.2, lp=4200, hp=110,
                     er=[(0.017, 0.35), (0.029, 0.28), (0.043, 0.22)]),
    "room":     dict(rt=(0.55, 0.25), pre=0.005, length=1.2, lp=5200, hp=120,
                     er=[(0.004, 0.40), (0.007, 0.33), (0.011, 0.28), (0.016, 0.24), (0.023, 0.16)]),
    "night":    dict(rt=(1.4, 0.45), pre=0.020, length=2.4, lp=4800, hp=150,
                     er=[(0.023, 0.22), (0.041, 0.16)]),
    "mountain": dict(rt=(2.0, 0.6), pre=0.050, length=3.4, lp=5200, hp=150,
                     er=[(0.050, 0.26), (0.160, 0.20), (0.300, 0.13), (0.500, 0.07)]),
}

AMB_SPACE = {
    "meadow": "garden", "air_rise": "sky", "berzah": "hollow", "radiant": "heaven",
    "room_warm": "room", "lamp_flame": "room", "night_wind": "night",
    "mountain_wind": "mountain", "rain": "mountain", "storm_wind": "mountain",
    "dawn": "garden", "room_tone": "room", "air_drift": "sky", "air_floor": "garden",
}


def make_ir(name):
    spec = SPACES[name]
    rng = rng_for("ir", name)
    n = N(spec["length"])
    t = tv(n)
    rt_lo, rt_hi = spec["rt"]
    edges = [250, 1000, 4000]
    ir = np.zeros((n, 2))
    for ch in range(2):
        w = rng.standard_normal(n)
        bands = [bfilt(w, "lowpass", edges[0], 4),
                 bfilt(w, "bandpass", [edges[0], edges[1]], 2),
                 bfilt(w, "bandpass", [edges[1], edges[2]], 2),
                 bfilt(w, "highpass", edges[2], 4)]
        y = np.zeros(n)
        for bi, bs in enumerate(bands):
            rt = rt_lo * (rt_hi / rt_lo) ** (bi / 3)
            y += bs * np.exp(-6.9078 * t / rt)
        y *= 1 - np.exp(-t / 0.015)  # diffuse build-up, no hard initial spike
        ir[:, ch] = y / np.sqrt(np.sum(y * y))
    for dt, g in spec["er"]:
        for ch in range(2):
            i = N(dt * (1 + rng.uniform(-0.12, 0.12)))
            if i + 5 < n:
                ir[i:i + 5, ch] += g * np.hanning(7)[1:6] / 2.0 * rng.choice([-1, 1])
    ir = np.vstack([np.zeros((N(spec["pre"]), 2)), ir])[:n]
    ir = bfilt(ir, "lowpass", spec["lp"], 2)
    ir = bfilt(ir, "highpass", spec["hp"], 2)
    ir *= rc_fade(n, 0, 0.25)[:, None]
    return ir / np.sqrt(np.sum(ir * ir) / 2)


# ======================================================================================
# AMBIENCE BEDS
# ======================================================================================

def wind_layer(n, rng, fc_lo, fc_hi, sig, gust, corr=0.3, lp=4000, tilt_db=-4, depth=0.6,
               lag=0.25, nfft=2048, hp=40):
    mL = lambda f, t: (logbp(f, fc_lo * (fc_hi / fc_lo) ** gust(t), sig)  # noqa: E731
                       * lowsoft(f, lp, 2) * highsoft(f, hp, 2) * tilt(f, tilt_db))
    mR = lambda f, t: mL(f, t - lag)  # noqa: E731
    x = st_shaped(n, mL, rng, corr, nfft, True, mR)
    t = tv(n)
    x[:, 0] *= (1 - depth) + depth * gust(t)
    x[:, 1] *= (1 - depth) + depth * gust(t - lag)
    return x


def whistle_layer(n, rng, w_lo, w_hi, gust, lag=0.25, power=2.0):
    mL = lambda f, t: logbp(f, w_lo * (w_hi / w_lo) ** gust(t), 0.05)  # noqa: E731
    mR = lambda f, t: mL(f, t - lag)  # noqa: E731
    x = st_shaped(n, mL, rng, 0.5, 4096, True, mR)
    t = tv(n)
    x[:, 0] *= gust(t) ** power
    x[:, 1] *= gust(t - lag) ** power
    return x


BIRD_KINDS = ("down", "up", "arch", "chip", "slur", "warble")


def bird_syllable(rng, f0, kind, dur):
    """one syllable of a distant songbird. Every syllable gets its own contour depth, curvature,
    envelope shape, FM trill (20-60 Hz) and AM flutter, plus a slow random pitch wander, so no two
    syllables are copies (QA #5: the old calls were one syllable repeated on an even grid)."""
    n = max(N(dur), 32)
    x = np.arange(n) / n
    t = tv(n)
    d = rng.uniform(0.85, 1.15)            # contour depth +-15 %
    cv = rng.uniform(0.6, 1.6)             # contour curvature
    if kind == "down":
        f = f0 * (1 + 0.13 * d * (1 - 2 * x ** cv))
    elif kind == "up":
        f = f0 * (1 - 0.13 * d * (1 - 2 * x ** cv))
    elif kind == "arch":
        f = f0 * (0.92 + 0.16 * d * np.sin(np.pi * x ** cv))
    elif kind == "chip":                   # short steep drop
        f = f0 * (1.18 - 0.36 * d * x ** (0.5 * cv))
    elif kind == "slur":                   # down then up
        f = f0 * (1 + 0.1 * d * np.cos(2 * np.pi * x ** cv))
    else:                                  # warble: slow wide FM
        f = f0 * (1 + 0.07 * d * np.sin(2 * np.pi * rng.uniform(9, 16) * t + rng.uniform(0, 6.3)))
    tr_rate, tr_dep = rng.uniform(20, 60), rng.choice([0.0, rng.uniform(0.008, 0.04)], p=[0.45, 0.55])
    f = f * (1 + tr_dep * np.sin(2 * np.pi * tr_rate * t + rng.uniform(0, 6.3)))
    f = f * (1 + 0.012 * (Ctrl(dur + 0.05, 25, rng)(t) - 0.5))
    a_pow, d_pow = rng.uniform(0.5, 1.6), rng.uniform(0.8, 2.2)
    e = x ** a_pow * (1 - x) ** d_pow
    e /= e.max() + 1e-12
    am_rate, am_dep = rng.uniform(20, 60), rng.uniform(0.0, 0.45)
    e *= 1 - am_dep * (0.5 + 0.5 * np.sin(2 * np.pi * am_rate * t + rng.uniform(0, 6.3)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) + 0.025 * np.sin(2.0 * ph + rng.uniform(0, 6.3))   # weak 2nd harmonic
    return y * e * rc_fade(n, 0.002, 0.004)


def birds(n, rng, rate, f_lo=2200, f_hi=3900, start=0.3, lp=4000, pan_w=0.75):
    """sparse distant calls of 2-3 syllables; per syllable pitch +-15 %, length +-30 %, gap +-40 %."""
    out = np.zeros((n, 2))
    dur = n / SR
    t = start + rng.uniform(0, 1.0 / rate)
    while t < dur - 0.6:
        f0 = f_lo * (f_hi / f_lo) ** rng.random()
        kinds = list(rng.choice(BIRD_KINDS, size=2, replace=False))
        p = rng.uniform(-pan_w, pan_w)
        a = rng.uniform(0.5, 1.0)
        base_len = rng.uniform(0.06, 0.12)
        base_gap = rng.uniform(0.05, 0.1)
        tt = t
        k_syl = int(rng.integers(2, 4))
        for k in range(k_syl):
            kind = kinds[0] if (k == 0 or rng.random() < 0.5) else kinds[1]
            ln = base_len * rng.uniform(0.7, 1.3) * (0.55 if kind == "chip" else 1.0)
            syl = bird_syllable(rng, f0 * rng.uniform(0.87, 1.15), kind, ln)
            add(out, pan(syl * a * rng.uniform(0.7, 1.0) * (1 - 0.1 * k), p + rng.uniform(-0.05, 0.05)), N(tt))
            tt += len(syl) / SR + base_gap * rng.uniform(0.6, 1.4)
        t += rng.exponential(1.0 / rate) + 0.6
    return bfilt(out, "lowpass", lp, 2)


def a_meadow(n, rng):
    dur = n / SR
    gust = Ctrl(dur, 0.15, rng)
    breeze = wind_layer(n, rng, 300, 750, 1.1, gust, 0.3, 3500, -4, 0.5, 0.3)
    m = lambda f, t: logbp(f, 3600, 0.45) * lowsoft(f, 6500, 3)  # noqa: E731
    leaves = st_shaped(n, m, rng, 0.2)
    am = crinkle(n, rng, 90, 0.006)
    leaves *= ((0.2 + am) * gust(tv(n)) ** 2)[:, None]
    b = birds(n, rng, 0.3)
    return unit(breeze) + 0.16 * unit(leaves) + 0.13 * unit(b)


def a_air_rise(n, rng):
    dur = n / SR
    gust = Ctrl(dur, 0.25, rng)
    fc = lambda t: 330 * (2300 / 330) ** (np.clip(t / dur, 0, 1) ** 1.3)  # noqa: E731
    mask = lambda f, t: logbp(f, fc(t), 1.15) * lowsoft(f, 6500, 3) * highsoft(f, 60, 2) * tilt(f, -2)  # noqa
    x = st_shaped(n, mask, rng, 0.2, 2048)
    t = tv(n)
    x *= (0.7 + 0.3 * gust(t))[:, None]
    m2 = lambda f, t: logbp(f, 4600, 0.45) * lowsoft(f, 7000, 4)  # noqa: E731
    air = st_shaped(n, m2, rng, 0.1) * (np.clip(t / dur, 0, 1) ** 2)[:, None]
    return unit(x) + 0.18 * unit(air)


def a_berzah(n, rng):
    dur = n / SR
    gust = Ctrl(dur, 0.1, rng)
    drift = Ctrl(dur, 0.2, rng)

    def mask(f, t):
        d = 1 + 0.05 * (drift(t) - 0.5)
        hollow = sum(g * logbp(f, fr * d, 0.11) for fr, g in ((205, 1.0), (440, 0.7), (930, 0.35)))
        return (logbp(f, 300, 1.3) + 0.9 * hollow) * lowsoft(f, 1800, 3) * highsoft(f, 50, 2)
    x = st_shaped(n, mask, rng, 0.35, 4096)
    x *= (0.6 + 0.4 * gust(tv(n)))[:, None]
    return x


def a_radiant(n, rng):
    """soft luminous air: a broad band around 2-2.5 kHz with gentle slopes whose centre drifts
    slowly (+-0.2 oct, 0.12 Hz), a warm 300-900 Hz body, and a sparse cloud of soft grains.
    (QA #7: the old bed was band-passed hiss centred at 4.3 kHz.)"""
    dur = n / SR
    t = tv(n)
    drift = Ctrl(dur, 0.12, rng)

    def m(f, tt):
        fc = 2250.0 * 2 ** (0.4 * (drift(tt) - 0.5))
        return logbp(f, fc, 0.9) * lowsoft(f, 5500, 2) * highsoft(f, 300, 1)
    air = st_shaped(n, m, rng, 0.15, 2048)
    c1, c2 = Ctrl(dur, 0.3, rng), Ctrl(dur, 0.3, rng)
    air[:, 0] *= 0.6 + 0.4 * c1(t)
    air[:, 1] *= 0.6 + 0.4 * c2(t)
    mb = lambda f, tt: logbp(f, 520, 0.75) * highsoft(f, 150, 2) * lowsoft(f, 1300, 2)  # noqa: E731
    body = st_shaped(n, mb, rng, 0.4, 4096) * (0.8 + 0.2 * Ctrl(dur, 0.1, rng)(t))[:, None]
    gl = glints(n, rng, 6, 1800, 4000, 0.05, 0.13, (5, 9))
    return unit(air) + 0.55 * unit(body) + 0.4 * unit(gl)


def a_air_drift(n, rng):
    """steady soft air for the wide 'whole axis' view between scenes: a gently gusting band
    around 400-1000 Hz with a faint airy top; unlike air_rise it does not brighten."""
    dur = n / SR
    gust = Ctrl(dur, 0.15, rng)
    w = wind_layer(n, rng, 380, 900, 1.1, gust, 0.25, 3200, -3, 0.45, 0.3)
    m2 = lambda f, t: logbp(f, 2600, 0.6) * lowsoft(f, 5000, 3)  # noqa: E731
    air = st_shaped(n, m2, rng, 0.2)
    return unit(w) + 0.12 * unit(air)


def a_air_floor(n, rng):
    """very low, dark continuous air floor under the whole narration (~-60 dBFS) so no pause
    ever drops into digital silence between beds (QA #2)."""
    dur = n / SR
    m = lambda f, t: logbp(f, 450, 1.3) * lowsoft(f, 1800, 2) * highsoft(f, 70, 2)  # noqa: E731
    x = st_shaped(n, m, rng, 0.3, 4096)
    return x * (0.85 + 0.15 * Ctrl(dur, 0.07, rng)(tv(n)))[:, None]


def a_room(n, rng, dark=1.0):
    dur = n / SR
    m = lambda f, t: logbp(f, 200 / dark, 1.4) * lowsoft(f, 900 / dark, 2) * highsoft(f, 45, 2)  # noqa
    x = st_shaped(n, m, rng, 0.25, 4096)
    x *= (0.85 + 0.15 * Ctrl(dur, 0.08, rng)(tv(n)))[:, None]
    m2 = lambda f, t: tilt(f, -4) * lowsoft(f, 3500, 2) * highsoft(f, 200, 2)  # noqa: E731
    air = st_shaped(n, m2, rng, 0.2)
    return unit(x) + 0.1 * unit(air)


def a_room_warm(n, rng):
    return a_room(n, rng, 1.0)


def a_room_tone(n, rng):
    return a_room(n, rng, 1.15)


def a_lamp_flame(n, rng):
    dur = n / SR
    t = tv(n)
    flick = Ctrl(dur, 7.0, rng)
    size = Ctrl(dur, 0.5, rng)
    m = lambda f, t: logbp(f, 260, 1.0) * lowsoft(f, 800, 2) * highsoft(f, 60, 2)  # noqa: E731
    body = st_shaped(n, m, rng, 0.8, 2048)
    am = (0.55 + 0.45 * flick(t)) * (0.75 + 0.25 * size(t))
    body *= am[:, None]
    mh = lambda f, t: logbp(f, 2100, 0.6) * lowsoft(f, 4500, 3)  # noqa: E731
    hiss = st_shaped(n, mh, rng, 0.8) * am[:, None]
    cr = np.zeros(n)
    for t0 in poisson_times(rng, dur - 0.1, 0.55):
        for k in range(int(rng.integers(1, 4))):
            add(cr, burst(rng, rng.uniform(1700, 3300), 2.5, rng.uniform(0.0008, 0.002))
                * rng.uniform(0.4, 1.0), N(t0 + k * rng.uniform(0.004, 0.015)))
    out = unit(body) + 0.22 * unit(hiss)
    out += pan(soft_lp(cr, 5000) * 4.0, rng.uniform(-0.1, 0.1))
    return out


def a_night_wind(n, rng):
    gust = Ctrl(n / SR, 0.12, rng)
    w = wind_layer(n, rng, 220, 520, 1.0, gust, 0.3, 2200, -5, 0.6, 0.35)
    wh = whistle_layer(n, rng, 700, 1000, gust)
    return unit(w) + 0.06 * unit(wh)


def a_mountain_wind(n, rng):
    gust = Ctrl(n / SR, 0.2, rng, contrast=1.2)
    w = wind_layer(n, rng, 340, 950, 1.0, gust, 0.25, 3000, -4, 0.7, 0.3)
    wh = whistle_layer(n, rng, 650, 1250, gust)
    return unit(w) + 0.12 * unit(wh)


def a_storm_wind(n, rng):
    gust = Ctrl(n / SR, 0.25, rng, contrast=1.3)
    w = wind_layer(n, rng, 160, 600, 1.0, gust, 0.2, 2500, -5, 0.75, 0.4)
    howl = wind_layer(n, rng, 180, 340, 0.12, gust, 0.4, 1200, 0, 0.9, 0.4, 4096)
    t = tv(n)
    howl *= (gust(t) ** 1.5)[:, None]
    wh = whistle_layer(n, rng, 700, 1400, gust)
    return unit(w) + 0.35 * unit(howl) + 0.08 * unit(wh)


def a_rain(n, rng):
    dur = n / SR
    t = tv(n)
    gust = Ctrl(dur, 0.25, rng)
    m = lambda f, t: logbp(f, 1100, 1.15) * lowsoft(f, 3400, 4) * highsoft(f, 150, 2)  # noqa: E731
    body = st_shaped(n, m, rng, 0.15, 2048) * (0.7 + 0.3 * gust(t))[:, None]
    drops = np.zeros((n, 2))
    rate_fn = lambda ts: 450 * (0.6 + 0.8 * gust(ts))  # noqa: E731
    for ch in range(2):
        for t0 in poisson_times(rng, dur - 0.05, 450 * 1.4, rate_fn):
            if rng.random() < 0.9:
                g = burst(rng, 800 * 4 ** rng.random(), rng.uniform(1.5, 3), rng.uniform(0.002, 0.006))
            else:
                g = burst(rng, rng.uniform(400, 900), 2.0, rng.uniform(0.008, 0.018))
            add(drops[:, ch], g * rng.lognormal(0, 0.6), N(t0))
    drops = bfilt(drops, "lowpass", 4500, 4)
    return unit(body) + 0.75 * unit(drops)


def a_dawn(n, rng):
    dur = n / SR
    m = lambda f, t: logbp(f, 420, 1.2) * lowsoft(f, 2200, 2) * highsoft(f, 60, 2)  # noqa: E731
    air = st_shaped(n, m, rng, 0.3, 2048)
    air *= (0.8 + 0.2 * Ctrl(dur, 0.2, rng)(tv(n)))[:, None]
    b = birds(n, rng, 0.55, 2400, 3900, start=0.6, lp=4200, pan_w=0.6)
    return unit(air) + 0.4 * unit(b)


AMB_GEN = {
    "meadow": a_meadow, "air_rise": a_air_rise, "berzah": a_berzah, "radiant": a_radiant,
    "room_warm": a_room_warm, "lamp_flame": a_lamp_flame, "night_wind": a_night_wind,
    "mountain_wind": a_mountain_wind, "rain": a_rain, "storm_wind": a_storm_wind,
    "dawn": a_dawn, "room_tone": a_room_tone, "air_drift": a_air_drift, "air_floor": a_air_floor,
}
AMB_SEND = {"meadow": 0.15, "air_rise": 0.2, "berzah": 0.3, "radiant": 0.3, "room_warm": 0.1,
            "lamp_flame": 0.2, "night_wind": 0.15, "mountain_wind": 0.15, "rain": 0.15,
            "storm_wind": 0.1, "dawn": 0.2, "room_tone": 0.05, "air_drift": 0.15, "air_floor": 0.0}

# ======================================================================================
# EVENTS - each returns stereo (onset at index 0) and a list of impact times (s, relative)
# ======================================================================================

def stem_start(x, below_db=60.0):
    """first 2 ms-RMS window above peak - below_db (seconds from the start of x)."""
    m = st(x).mean(axis=1) ** 2
    k = N(0.002)
    env = np.sqrt(np.convolve(m, np.ones(k) / k, "same"))
    return int(np.argmax(env > env.max() * 10 ** (-below_db / 20))) / SR


def e_breath_swell(c, rng):
    n = N(1.7)
    fc = lambda t: 380 * (1300 / 380) ** np.clip(t / 1.0, 0, 1)  # noqa: E731
    mask = lambda f, t: logbp(f, fc(t), 1.1) * lowsoft(f, 5000, 2) * highsoft(f, 90, 2) * tilt(f, -2)  # noqa
    x = st_shaped(n, mask, rng, 0.35)
    return x * env_swell(n, 0.45, 1.6, 2.2)[:, None], []


def e_sparkle_line(c, rng):
    """the golden dotted lines draw: ~12 soft little grains at irregular times (the picture draws
    two overlapping dotted paths), each a 12-20 ms Hann noise grain through a Q 12-18 resonance at
    2.2-3.4 kHz drifting slowly upward, random level 0..-5 dB, pan following the line, LP 5.5 kHz.
    Grains instead of ticks: 2 ms-peak / 20 ms-RMS crest ~12 dB instead of ~17-19 dB."""
    dur = c.get("dur", 0.8)
    n = N(dur + 0.3)
    out = np.zeros((n, 2))
    k = max(2, int(round(dur / 0.065)))
    ts = np.sort(np.r_[0.0, rng.uniform(0.02, dur, k - 1)])
    for t0 in ts:
        x = t0 / dur
        f = 2200 * 1.25 ** x * 1.25 ** rng.random()
        m = N(rng.uniform(0.012, 0.02))
        g = np.pad(rng.standard_normal(m) * np.hanning(m), (0, N(0.02)))
        y = reson(g, f, rng.uniform(12, 18)) + 0.15 * reson(g, f * rng.uniform(1.6, 1.9), 10)
        y *= rc_fade(len(y), 0.0, 0.008)
        y = unit(y) * 10 ** (rng.uniform(-5, 0) / 20)
        add(out, pan(y, -0.4 + 0.8 * x + rng.uniform(-0.15, 0.15)), N(t0))
    mask = lambda f, t: logbp(f, 3000, 0.6) * lowsoft(f, 6000, 3)  # noqa: E731
    air = st_shaped(n, mask, rng, 0.2) * env_swell(n, 0.35)[:, None]
    out += 0.12 * unit(air) * rms(out)
    return bfilt(out, "lowpass", 5500, 4), list(ts)


def e_light_rain(c, rng):
    dur = c.get("dur", 1.6)
    n = N(dur + 0.2)
    out = np.zeros((n, 2))
    bed = np.zeros((n, 2))
    for t0 in np.r_[0.0, poisson_times(rng, dur, 45)]:
        if rng.random() < 0.7:
            y = burst(rng, rng.uniform(1400, 3200), rng.uniform(1.5, 3), rng.uniform(0.002, 0.005))
        else:
            tau = rng.uniform(0.006, 0.012)
            m = N(tau * 6)
            tt = tv(m)
            f = rng.uniform(1500, 2800) * (1 + 0.15 * (1 - np.exp(-tt / (2 * tau))))
            y = chirp_tone(f, env_hit(m, 0.0004, tau))
            y /= np.sqrt(np.sum(y * y))
        add(out, pan(y * rng.lognormal(0, 0.5), rng.uniform(-0.7, 0.7)), N(t0))
    mask = lambda f, t: logbp(f, 1800, 1.0) * lowsoft(f, 4000, 3)  # noqa: E731
    bed = 0.3 * unit(st_shaped(n, mask, rng, 0.2)) * rms(out) * rc_fade(n, 0.35, 0.5)[:, None]
    ramp = 0.35 + 0.65 * rc_fade(n, 0.35, 0.0)          # first drops already audible at the cue
    out = out * (ramp * rc_fade(n, 0.0, 0.5))[:, None] + bed
    return soft_lp(out, 6000), []


def grain_cloud(rng, n, t0, dc, ng, amp, f_lo, f_hi, q_lo, q_hi, d_lo, d_hi, tail_tau=0.035,
                tail_frac=0.35, ping_frac=0.0):
    """a footstep grain cloud: a front-loaded cluster plus an exponentially thinning tail of
    smaller grains, so the cloud dies away instead of stopping dead (QA #8)."""
    y = np.zeros(n)
    k_tail = int(ng * tail_frac)
    ts = np.r_[t0 + dc * rng.beta(1.2, 2.8, ng - k_tail), t0 + dc * 0.5 + rng.exponential(tail_tau, k_tail)]
    ts[0] = t0
    for tt in ts:
        dec = np.exp(-max(tt - t0 - dc * 0.5, 0) / (1.3 * tail_tau))
        if rng.random() < ping_frac:
            g = ping(rng.uniform(2000, 4200), rng.uniform(0.0012, 0.003), 0.016, 0.0003)
            g /= np.sqrt(np.sum(g * g))
        else:
            g = burst(rng, rng.uniform(f_lo, f_hi), rng.uniform(q_lo, q_hi), rng.uniform(d_lo, d_hi))
        add(y, g * rng.lognormal(0, 0.5) * amp * dec, N(tt))
    return y


def step_body(rng, n, lo, hi, attack, tau, t0=0.0):
    """continuous noise body of a step (scuff/crunch) under the grains: smooth envelope, so the
    2 ms envelope of the whole step never falls by > 25 dB in 5 ms."""
    x = bfilt(rng.standard_normal(n), "bandpass", [lo, hi], 2)
    e = np.zeros(n)
    m = n - N(t0)
    e[N(t0):] = env_hit(m, attack, tau)
    return x * e


def step_grass(rng):
    n = N(0.42)
    crush = np.zeros(n)
    heel_gap = rng.uniform(0.07, 0.1)
    for t0, dc, ng, amp in ((0.0, 0.09, 70, 1.0), (heel_gap, 0.08, 50, 0.65)):
        crush += grain_cloud(rng, n, t0, dc, ng, amp, 1300, 4200, 0.8, 1.6, 0.0008, 0.0025, 0.04)
    body = step_body(rng, n, 800, 3500, 0.004, 0.06)
    m = N(0.18)
    sw = np.zeros(n)
    sw[:m] = bfilt(rng.standard_normal(m), "bandpass", [700, 2800], 2) * env_hit(m, 0.008, 0.045)
    th = np.zeros(n)
    k = N(0.1)
    th[:k] = lpnoise(rng, k, 170) * env_hit(k, 0.003, 0.018)
    y = unit(crush) + 0.35 * unit(body) + 0.45 * unit(sw) + 0.55 * unit(th)
    return soft_lp(y * rc_fade(n, 0.002, 0.08), 5500)


def step_gains(c, k):
    """optional per-step level offsets in dB (cue field 'gains_db', aligned with sorted times)."""
    g = c.get("gains_db")
    if not g:
        return np.ones(k)
    g = list(g) + [0.0] * (k - len(g))
    return 10 ** (np.array(g[:k], dtype=float) / 20)


def e_footsteps_grass(c, rng):
    rel = c["_rel_times"]
    n = N(rel[-1] + 0.5)
    out = np.zeros((n, 2))
    gs = step_gains(c, len(rel))
    for i, t0 in enumerate(rel):
        add(out, pan(step_grass(rng) * rng.uniform(0.85, 1.0) * gs[i], 0.08 * (1 if i % 2 else -1)), N(t0))
    return out, list(rel)


def water_stream(rng, dur, rate=140, f_lo=700, f_hi=3200):
    n = N(dur + 0.3)
    bub = np.zeros((n, 2))
    for t0 in poisson_times(rng, dur, rate):
        r = rng.random()
        f0 = f_lo * (f_hi / f_lo) ** r
        tau = 0.0035 + 0.01 * (1 - r)
        m = N(tau * 6)
        tt = tv(m)
        y = chirp_tone(f0 * (1 + 0.25 * tt / (6 * tau)), env_hit(m, 0.0006, tau))
        y /= np.sqrt(np.sum(y * y))
        add(bub, pan(y * rng.lognormal(0, 0.5) * (0.6 + 0.4 * (1 - r)), rng.uniform(-0.3, 0.3)), N(t0))
    fl = Ctrl(dur + 0.3, 18, rng)
    mask = lambda f, t: logbp(f, 1500, 1.1) * lowsoft(f, 5000, 3) * highsoft(f, 200, 2)  # noqa: E731
    flow = st_shaped(n, mask, rng, 0.5) * (0.65 + 0.35 * fl(tv(n)))[:, None]
    y = unit(bub) + 0.8 * unit(flow)
    e = np.zeros(n)
    e[:N(dur)] = rc_fade(N(dur), 0.06, 0.18)
    return bfilt(y * e[:, None], "lowpass", 6500, 2)


def e_water_pour(c, rng):
    return water_stream(rng, c.get("dur", 0.8)), []


def e_soft_pop(c, rng):
    return pan(pop(rng, rng.uniform(650, 800), rng.uniform(210, 250)), c.get("pan", 0.0)), [0.0]


def e_whoosh_up(c, rng):
    dur = c.get("dur", 1.0)
    n = N(dur + 0.35)
    x = whoosh(n, rng, 280, 3000, 1.0, 0.6 * dur / (n / SR), 1.5, 2.0, 0.35)
    m = lambda f, t: lowsoft(f, 220, 3) * highsoft(f, 45, 2)  # noqa: E731
    body = st_shaped(n, m, rng, 0.6, 2048) * env_swell(n, 0.35, 1.5, 2.5)[:, None]
    x = unit(x) + 0.35 * unit(body)
    x = width(x, np.linspace(0.8, 1.3, n))
    return x, []


def e_motes_twinkle(c, rng):
    dur = c.get("dur", 2.4)
    n = N(dur + 0.2)
    g = glints(n, rng, 12, 2800, 6200, 0.03, 0.09, (9, 16), first_at=0.0)
    mask = lambda f, t: logbp(f, 4500, 0.5) * lowsoft(f, 7000, 4)  # noqa: E731
    air = st_shaped(n, mask, rng, 0.1)
    out = unit(g) + 0.25 * unit(air)
    return out * rc_fade(n, 0.12, 0.6)[:, None], []


def e_settle_chimes(c, rng):
    """motes settling: 4-5 soft glass glints at irregular times, off-scale pitches in a
    non-monotonic order, decaying in level, short tails (no melody, no ring)."""
    dur = c.get("dur", 0.55)
    k = 5 if dur >= 0.45 else 4
    gaps = rng.uniform(0.6, 1.4, k - 1)
    times = np.r_[0.0, np.cumsum(gaps) / gaps.sum() * dur * 0.85]
    freqs = offscale_freqs(rng, k)
    n = N(dur + 1.0)
    out = np.zeros((n, 2))
    for i, (t0, f) in enumerate(zip(times, freqs)):
        a = (1.0 - 0.13 * i) * rng.uniform(0.8, 1.0)
        y = glass_glint(rng, f, dur=0.9)
        add(out, pan(y * a, rng.uniform(-0.5, 0.5)), N(t0))
    g = glints(n, rng, 10, 1900, 4000, 0.03, 0.08, (6, 10)) * rc_fade(n, 0.02, 0.6)[:, None]
    out = out + 0.12 * unit(g) * rms(out[:N(dur)])
    return out * rc_fade(n, 0, 0.3)[:, None], list(times)


def e_whoosh_down_fast(c, rng):
    dur = c.get("dur", 0.6)
    n = N(dur + 0.3)
    x = whoosh(n, rng, 3400, 220, 1.0, 0.3 * dur / (n / SR), 1.3, 1.6, 0.4, curve=0.7)
    m = N(0.35)
    land = np.zeros((n, 2))
    lt = st_shaped(m, lambda f, t: lowsoft(f, 160, 3) * highsoft(f, 40, 2), rng, 0.7, 2048)
    add(land, lt * env_hit(m, 0.03, 0.1)[:, None], N(dur * 0.7))
    x = unit(x) + 0.3 * unit(land)
    return x * rc_fade(n, 0.002, 0.05)[:, None], []


def e_cloth_kneel(c, rng):
    n = N(0.6)
    r = rustle(n, rng, 400, 3000, 55, 0.012, 0.7) * env_swell(n, 0.35, 1.2, 2.0)[:, None]
    out = unit(r)
    k = thud(rng, 260, 0.035, 95, 0.04, 0.35)
    add(out, pan(k, 0.0) * 0.9, N(0.28))
    return out * rc_fade(n, 0.003, 0.05)[:, None], []


def e_soil_pat(c, rng):
    n = N(0.6)
    out = np.zeros((n, 2))
    for t0, a in ((0.0, 1.0), (0.17, 0.8), (0.31, 0.45)):
        add(out, pan(thud(rng, 480, 0.03, 120, 0.03, 0.4) * a, 0.05), N(t0))
    return out, [0.0, 0.17, 0.31]


def e_sprout_pop(c, rng):
    y = pop(rng, 1000, 320, 0.7)
    n = len(y)
    gs = np.zeros(n)
    for t0 in 0.008 + 0.07 * rng.beta(1.3, 2, 14):     # soil crumbs start after the pop's attack
        add(gs, burst(rng, rng.uniform(1200, 2800), 1.5, 0.0015, 0.001) * rng.lognormal(0, 0.3), N(t0))
    y = soft_lp(y + 0.15 * unit(gs) * rms(y), 4500)
    return pan(y * rc_fade(n, 0.003, 0.04), 0.0), [0.0]


def e_grow_swish_up(c, rng):
    dur = c.get("dur", 1.0)
    n = N(dur + 0.3)
    w = whoosh(n, rng, 400, 2400, 1.1, 0.7 * dur / (n / SR), 1.6, 1.8, 0.4)
    r = rustle(n, rng, 1000, 5000, 140, 0.005, 0.5)
    r *= (np.linspace(0.3, 1.0, n) * env_swell(n, 0.7 * dur / (n / SR), 1.5, 2.0))[:, None]
    return unit(w) + 0.55 * unit(r), []


def e_bloom_swell(c, rng):
    n = N(0.95)
    w = whoosh(n, rng, 700, 3200, 1.2, 0.45, 1.6, 2.0, 0.3)
    g = glints(n, rng, 16, 3000, 6000) * env_swell(n, 0.5)[:, None]
    return unit(w) + 0.3 * unit(g), []


def e_fruit_pops(c, rng):
    """a ripple of small soft pops; each has its own resonance (600-1400 Hz, Q 2-4), body pitch,
    size and a +-3 dB level offset (the irregular timing is in cues.json)."""
    rel = c["_rel_times"]
    n = N(rel[-1] + 0.3)
    out = np.zeros((n, 2))
    gs = step_gains(c, len(rel))
    for i, t0 in enumerate(rel):
        y = pop(rng, rng.uniform(600, 1400), rng.uniform(180, 400), rng.uniform(0.5, 0.8), tail=False,
                attack=rng.uniform(0.005, 0.006), Q=rng.uniform(2.0, 4.0), puff=0.4)
        add(out, pan(y * 10 ** (rng.uniform(-3, 3) / 20) * gs[i], rng.uniform(-0.5, 0.5)), N(t0))
    return out, list(rel)


def e_whoosh_soft(c, rng):
    dur = c.get("dur", 1.1)
    n = N(dur + 0.3)
    zoom_in = "in" in c.get("desc", "")
    f0, f1 = (420, 1700) if zoom_in else (1700, 420)
    x = whoosh(n, rng, f0, f1, 1.4, 0.5 * dur / (n / SR), 1.6, 2.0, 0.3, lp=5500, tilt_db=-3)
    w = np.linspace(1.3, 0.6, n) if zoom_in else np.linspace(0.6, 1.3, n)
    return width(x, w), []


def e_cloth_move(c, rng):
    n = N(0.35)
    r = rustle(n, rng, 450, 3200, 60, 0.01, 0.7) * env_swell(n, 0.3, 1.2, 2.0)[:, None]
    return r, []


def e_falling_shimmer(c, rng):
    dur = c.get("dur", 0.7)
    n = N(dur + 0.3)
    fc = lambda t: 6200 * (2200 / 6200) ** np.clip(t / dur, 0, 1)  # noqa: E731
    g = glints(n, rng, 45, fc_fn=fc, d_lo=0.02, d_hi=0.06, Q=(7, 12),
               pan_fn=lambda t: 0.3 - 0.4 * t / dur, first_at=0.0)
    w = whoosh(n, rng, 3500, 1200, 0.8, 0.3, 1.5, 1.6, 0.3)
    return (unit(g) + 0.35 * unit(w)) * rc_fade(n, 0.03, 0.2)[:, None], []


def e_soft_catch(c, rng):
    y = thud(rng, 900, 0.018, 180, 0.025, 0.0)
    n = len(y)
    r = rustle(n, rng, 800, 4000, 80, 0.006, 0.8)[:, 0] * env_hit(n, 0.004, 0.04)
    return pan(unit(y) + 0.35 * unit(r), 0.0), [0.0]


def e_airy_rise(c, rng):
    dur = c.get("dur", 0.6)
    n = N(dur + 0.25)
    w = whoosh(n, rng, 500, 2800, 0.9, 0.75 * dur / (n / SR), 1.4, 1.8, 0.3)
    g = glints(n, rng, 12, 2800, 5500) * np.linspace(0.3, 1, n)[:, None]
    return unit(w) + 0.25 * unit(g), []


def e_airy_fall(c, rng):
    dur = c.get("dur", 0.5)
    n = N(dur + 0.3)
    w = whoosh(n, rng, 2600, 600, 0.9, 0.25, 1.3, 1.6, 0.3)
    g = glints(n, rng, 20, 2500, 5000, rate_fn=lambda t: 20 * np.clip(1 - t / dur, 0, 1))
    return unit(w) + 0.25 * unit(g), []


def e_low_sigh_wind(c, rng):
    dur = c.get("dur", 1.6)
    n = N(dur + 0.2)
    fres = lambda t: 620 * (290 / 620) ** np.clip(t / dur, 0, 1)  # noqa: E731
    mask = lambda f, t: (0.7 * logbp(f, fres(t), 0.18) + logbp(f, 260, 1.0)) * lowsoft(f, 1500, 3) * highsoft(f, 50, 2)  # noqa
    x = st_shaped(n, mask, rng, 0.5, 2048)
    return x * env_swell(n, 0.32, 1.5, 1.8)[:, None], []


def e_leaf_rustle(c, rng):
    dur = c.get("dur", 0.8)
    n = N(dur + 0.15)
    r = rustle(n, rng, 1200, 6000, 110, 0.005, 0.5)
    e = np.zeros(n)
    for t0, d, a in ((0.0, 0.35, 1.0), (0.22, 0.4, 0.8), (0.45, 0.45, 0.6)):
        m = N(min(d, dur + 0.15 - t0))
        add(e, env_swell(m, 0.35, 1.2, 2.0) * a, N(t0))
    return soft_lp(r * e[:, None], 6500), []


def e_twig_snap_pluck(c, rng):
    n = N(0.5)
    crack = np.zeros(n)
    for dt, a in ((0.0, 1.0), (0.0035, 0.6), (0.0085, 0.35)):
        w = modal([950, 1780, 2650], [0.018, 0.010, 0.006], [1, 0.6, 0.35], 0.12, 0.0004, rng, 0.03)
        piece = w / np.sqrt(np.sum(w * w)) * np.sqrt(0.5)
        b = burst(rng, rng.uniform(2300, 3000), 2.5, 0.0012)
        piece[:len(b)] += b[:len(piece)]
        add(crack, piece * a, N(dt))
    r = np.zeros((n, 2))
    m = N(0.3)
    lr = rustle(m, rng, 1000, 5000, 120, 0.005, 0.5) * env_hit(m, 0.01, 0.08)[:, None]
    add(r, lr, N(0.01))
    sw = np.zeros((n, 2))
    m2 = N(0.22)
    add(sw, whoosh(m2, rng, 1800, 900, 1.0, 0.3, 1.2, 1.6, 0.5), N(0.012))
    y = pan(unit(crack), 0.1) + 0.45 * unit(r) + 0.2 * unit(sw)
    return soft_lp(y, 6000), [0.0]


def e_regrow_chime(c, rng):
    """a new fruit fills the plucked place: two soft glass glints (off-scale, non-consonant
    interval, short tails) inside a small airy swell with a few soft grains."""
    f1, f2 = offscale_freqs(rng, 2)
    n = N(1.1)
    out = np.zeros((n, 2))
    dt = rng.uniform(0.06, 0.09)
    add(out, pan(glass_glint(rng, f1, dur=0.9), -0.15), 0)
    add(out, pan(glass_glint(rng, f2, dur=0.9) * rng.uniform(0.7, 0.85), 0.15), N(dt))
    m = N(0.65)
    sw = whoosh(m, rng, 800, 2600, 1.0, 0.4, 1.4, 2.0, 0.2, lp=5000)
    g = glints(m, rng, 10, 1900, 4000, 0.03, 0.09, (6, 10)) * env_swell(m, 0.4)[:, None]
    add(out, (0.3 * unit(sw) + 0.15 * unit(g)) * rms(out[:N(0.3)]), 0)
    return out * rc_fade(n, 0, 0.35)[:, None], [0.0, dt]


def e_ring_shimmer(c, rng):
    dur = c.get("dur", 1.0)
    n = N(dur + 0.4)
    g = glints(n, rng, 30, 3000, 6200, 0.03, 0.08, (9, 15),
               pan_fn=lambda t: 0.75 * np.sin(2 * np.pi * t / dur), first_at=0.0)
    t = tv(n)
    mask = lambda f, t: logbp(f, 4800, 0.5) * lowsoft(f, 7000, 4)  # noqa: E731
    air = balance(st_shaped(n, mask, rng, 0.3), 0.6 * np.sin(2 * np.pi * t / dur + 0.5))
    out = unit(g) + 0.35 * unit(air)
    return out * env_swell(n, 0.4, 1.2, 1.8)[:, None], []


def e_dim_fade(c, rng):
    dur = c.get("dur", 0.6)
    n = N(dur + 0.3)
    return whoosh(n, rng, 2600, 450, 1.0, 0.15, 1.2, 1.3, 0.35, lp=5000), []


def e_bite(c, rng):
    n = N(0.3)
    cr = np.zeros(n)
    ts = 0.06 * rng.beta(1.0, 2.2, 90)
    ts[0] = 0
    for t0 in ts:
        add(cr, burst(rng, rng.uniform(1200, 4200), rng.uniform(1, 2), rng.uniform(0.0006, 0.002))
            * rng.lognormal(0, 0.5), N(t0))
    m = lambda f, t: logbp(f, 1400, 0.9) * lowsoft(f, 5000, 2)  # noqa: E731
    tear = mono_shaped(n, m, rng) * crinkle(n, rng, 150, 0.004) * env_hit(n, 0.003, 0.05)
    body = lpnoise(rng, n, 300) * env_hit(n, 0.002, 0.025)
    y = unit(cr) + 0.55 * unit(tear) + 0.5 * unit(body)
    y = soft_lp(y * rc_fade(n, 0, 0.05), 6000)
    return pan(y, 0.0), [0.0]


def e_sand_crumble(c, rng):
    dur = c.get("dur", 0.5)
    n = N(dur + 0.3)
    g = np.zeros((n, 2))
    for ch in range(2):
        for t0 in poisson_times(rng, dur, 900, lambda ts: 900 * np.exp(-ts / 0.18)):
            add(g[:, ch], burst(rng, rng.uniform(1500, 4000), 1.2, rng.uniform(0.0007, 0.0015))
                * rng.lognormal(0, 0.5), N(t0))
    m = lambda f, t: logbp(f, 2500, 0.8) * lowsoft(f, 6000, 3)  # noqa: E731
    pour = st_shaped(n, m, rng, 0.4) * env_hit(n, 0.01, 0.15)[:, None]
    y = unit(g) + 0.5 * unit(pour)
    return soft_lp(y * rc_fade(n, 0.002, 0.08)[:, None], 5000), []


def e_scale_creak(c, rng):
    """stick-slip creak of the balance pivot. Each slip interval is drawn on its own (+-30 %
    jitter around a 55 -> 125 -> 55 Hz rate), with occasional 'sticks' (a 2-5 period hold) and
    'skips' (a quick 3-6 slip flurry), lognormal slip strengths and low-Q pivot modes, so it reads
    as wood/metal friction rather than a periodic buzz (QA #9)."""
    dur = c.get("dur", 0.6)
    n = N(dur + 0.2)
    ts, amps = [], []
    t = 0.0
    while t < dur:
        r = 55 + 70 * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
        p = np.clip(1.0 + 0.3 * rng.standard_normal(), 0.4, 1.9) / r
        u = rng.random()
        if u < 0.06:                                   # stick: hold, then a stronger release
            t += p * rng.uniform(2, 5)
            ts.append(t)
            amps.append(rng.lognormal(0.4, 0.3))
        elif u < 0.11:                                 # skip: a quick flurry of small slips
            for _ in range(int(rng.integers(3, 7))):
                t += p * rng.uniform(0.2, 0.4)
                ts.append(t)
                amps.append(rng.lognormal(-0.5, 0.4))
        else:
            t += p
            ts.append(t)
            amps.append(rng.lognormal(0, 0.5))
    exc = np.zeros(n)
    for t0, a in zip(ts, amps):
        i = N(t0)
        if i < n - 16:
            w = int(rng.integers(5, 14))
            exc[i:i + w] += a * np.hanning(w)
    exc = bfilt(exc, "lowpass", 2000, 2) * env_swell(n, 0.5 * dur / (n / SR), 1.2, 1.5)
    y = np.zeros(n)
    for f, gn in ((330, 1.0), (690, 0.8), (1240, 0.5), (2150, 0.3)):
        y += gn * unit(reson(exc, f * rng.uniform(0.95, 1.05), rng.uniform(10, 16)))
    fr = mono_shaped(n, lambda f, t: logbp(f, 1800, 0.7), rng) * (0.4 + crinkle(n, rng, 60, 0.008)) \
        * env_swell(n, 0.5, 1.2, 1.5)
    y = soft_lp(unit(y) + 0.18 * unit(fr), 4000)
    return pan(y * rc_fade(n, 0.005, 0.08), 0.15), []


def e_scale_settle_clunk(c, rng):
    n = N(0.6)
    y = np.zeros(n)
    for dt, a in ((0.0, 1.0), (0.085, 0.35), (0.14, 0.12)):
        m = modal([165, 410, 760, 1320, 2250], [0.11, 0.07, 0.05, 0.03, 0.015],
                  [1, 0.7, 0.5, 0.3, 0.15], 0.45, 0.003, rng, 0.01)
        k = N(0.05)
        kn = lpnoise(rng, k, 1800) * env_hit(k, 0.001, 0.008)
        piece = unit(m)
        piece[:k] += 0.6 * unit(kn)
        add(y, piece * a, N(dt))
    return pan(y * rc_fade(n, 0, 0.1), 0.0), [0.0, 0.085]


def e_bright_swell(c, rng):
    dur = c.get("dur", 0.5)
    n = N(dur + 0.35)
    w = whoosh(n, rng, 900, 4200, 1.0, 0.6 * dur / (n / SR), 1.5, 2.0, 0.3, lp=7000)
    g = glints(n, rng, 20, 3000, 6200) * env_swell(n, 0.6)[:, None]
    return unit(w) + 0.35 * unit(g), []


def e_candle_light(c, rng):
    n = N(0.6)
    t = tv(n)
    fl = Ctrl(0.6, 12, rng)
    m = lambda f, t: logbp(f, 900, 1.2) * lowsoft(f, 4000, 2)  # noqa: E731
    ign = mono_shaped(n, m, rng) * env_hit(n, 0.012, 0.12) * (0.6 + 0.4 * fl(t))
    whump = lpnoise(rng, n, 250) * env_hit(n, 0.02, 0.08)
    cr = np.zeros(n)
    for t0 in (0.004, 0.03):
        add(cr, burst(rng, 2500, 2.5, 0.001), N(t0))
    y = soft_lp(unit(ign) + 0.5 * unit(whump) + 0.15 * unit(cr), 5500)
    return pan(y * rc_fade(n, 0.001, 0.1), 0.0), [0.0]


def e_clock_ticks(c, rng):
    dur = c.get("dur", 3.2)
    period = 0.5
    ts = np.arange(0, dur - 0.05, period)
    n = N(dur + 0.2)
    y = np.zeros(n)
    for i, t0 in enumerate(ts):
        s = 1.0 if i % 2 == 0 else 0.93
        tk = modal([2350 * s, 3650 * s, 5150 * s], [0.010, 0.006, 0.004], [1, 0.45, 0.2], 0.06, 0.0004, rng, 0.004)
        tk += 0.7 * ping(880 * s, 0.012, 0.06, 0.0006)
        add(y, unit(tk) * (1.0 if i % 2 == 0 else 0.85), N(t0))
    return pan(soft_lp(y, 6000), 0.0), list(ts)


def e_flame_waver(c, rng):
    n = N(0.75)
    t = tv(n)
    fl = Ctrl(0.75, 9, rng, contrast=1.4)
    m = lambda f, t: logbp(f, 450, 1.1) * lowsoft(f, 2500, 2) * highsoft(f, 70, 2)  # noqa: E731
    x = st_shaped(n, m, rng, 0.8, 2048) * ((0.35 + 0.65 * fl(t)) * env_swell(n, 0.3, 1.4, 1.8))[:, None]
    return x, []


def e_swap_swish(c, rng):
    rel = c["_rel_times"]
    n = N(rel[-1] + 0.4)
    out = np.zeros((n, 2))
    subs = []
    for i, t0 in enumerate(rel):
        m = N(0.3)
        arc = lambda t: 700 * (2400 / 700) ** np.sin(np.pi * np.clip(t / 0.3, 0, 1)) ** 1.0  # noqa: E731
        w = whoosh(m, rng, 700, 900, 1.0, 0.45, 1.4, 1.8, 0.4, fc_fn=arc)
        p = np.linspace(-0.5, 0.5, m) * (1 if i % 2 == 0 else -1)
        add(out, balance(w, p), N(t0))
        subs.append(("g", t0, t0 + stem_start(w)))
    return out, subs


def e_candle_out_puff(c, rng):
    """blown-out candle: breath puff + dying flame flutter on the cue (under 'gibidir'), then the
    smoke curl from the wick swells softly into the narrator's pause (picture: smoke trail
    41.1-42.1 s) so the beat is actually heard (QA #13)."""
    n = N(1.6)
    t = tv(n)
    m = lambda f, t: logbp(f, 1000, 1.3) * lowsoft(f, 5000, 2) * highsoft(f, 150, 2)  # noqa: E731
    puff = mono_shaped(n, m, rng) * env_hit(n, 0.018, 0.07, 0.04)
    fl = lpnoise(rng, n, 350) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * t)) * env_hit(n, 0.005, 0.09)
    fl = np.roll(fl, N(0.02))
    fl[:N(0.02)] = 0
    curl = Ctrl(1.6, 3.0, rng)
    mh = lambda f, tt: logbp(f, 1500 * 2 ** (0.5 * (curl(tt) - 0.5)), 0.7) * lowsoft(f, 4000, 3) * highsoft(f, 300, 2)  # noqa
    smoke = st_shaped(n, mh, rng, 0.4, 2048)
    se = np.zeros(n)
    se[N(0.1):] = env_swell(n - N(0.1), 0.35, 1.6, 1.8)        # peaks ~0.6 s after the cue
    smoke *= (se * (0.7 + 0.3 * curl(t)))[:, None]
    y = pan(unit(puff) + 0.5 * unit(fl), 0.0) + 0.3 * unit(smoke)
    return soft_lp(y * rc_fade(n, 0.0, 0.15)[:, None], 5500), [0.0]


def e_lamp_swell(c, rng):
    dur = c.get("dur", 0.9)
    n = N(dur + 0.4)
    t = tv(n)
    fc = lambda t: 250 * (700 / 250) ** np.clip(t / dur, 0, 1)  # noqa: E731
    m = lambda f, t: logbp(f, fc(t), 1.2) * lowsoft(f, 3000, 2) * highsoft(f, 60, 2)  # noqa: E731
    fl = Ctrl(dur + 0.4, 6, rng)
    x = st_shaped(n, m, rng, 0.6, 2048) * ((0.7 + 0.3 * fl(t)) * env_swell(n, 0.55 * dur / (n / SR), 1.5, 2.0))[:, None]
    return x, []


def step_gravel(rng):
    """heel + roll grain clouds with thinning tails, a continuous crunch body, and a scatter of
    3-7 displaced pebbles ticking/rolling 30-200 ms after the step (QA #8)."""
    n = N(0.45)
    y = np.zeros(n)
    roll = rng.uniform(0.055, 0.09)
    for t0, dc, ng, amp in ((0.0, 0.06, 120, 1.0), (roll, 0.07, 80, 0.7)):
        y += grain_cloud(rng, n, t0, dc, ng, amp, 1200, 4800, 2, 6, 0.0006, 0.003, 0.035, 0.35, 0.35)
    for _ in range(int(rng.integers(3, 8))):           # pebble scatter
        t0 = roll + 0.03 + rng.exponential(0.06)
        if t0 > 0.38:
            continue
        g = ping(rng.uniform(1800, 4000), rng.uniform(0.0015, 0.004), 0.025, 0.0004)
        g /= np.sqrt(np.sum(g * g))
        add(y, g * rng.uniform(0.15, 0.4) * np.exp(-(t0 - roll) / 0.12), N(t0))
    body = step_body(rng, n, 900, 4000, 0.003, 0.05)
    body += 0.6 * step_body(rng, n, 900, 4000, 0.004, 0.05, roll)
    k = N(0.1)
    th = np.zeros(n)
    th[:k] = lpnoise(rng, k, 160) * env_hit(k, 0.003, 0.018)
    y = unit(y) + 0.3 * unit(body) + 0.5 * unit(th)
    return soft_lp(y * rc_fade(n, 0.002, 0.08), 6000)


def e_footsteps_gravel(c, rng):
    rel = c["_rel_times"]
    n = N(rel[-1] + 0.5)
    out = np.zeros((n, 2))
    gs = step_gains(c, len(rel))
    for i, t0 in enumerate(rel):
        add(out, pan(step_gravel(rng) * rng.uniform(0.85, 1.0) * gs[i], 0.06 * (1 if i % 2 else -1)), N(t0))
    return out, list(rel)


def e_thunder_soft(c, rng):
    dur = c.get("dur", 3.0)
    n = N(dur + 1.5)
    t = tv(n)
    # QA #10: high-pass at 48 Hz (phones cannot play it and it inflated the RMS ratio) and give
    # the audible 150-500 Hz roll more weight
    m1 = lambda f, t: tilt(f, -6, 100) * lowsoft(f, 220, 3) * highsoft(f, 52, 4)  # noqa: E731
    m2 = lambda f, t: tilt(f, -3, 300) * lowsoft(f, 600, 3) * highsoft(f, 140, 2)  # noqa: E731
    low = st_shaped(n, m1, rng, 0.3, 4096, False)
    mid = st_shaped(n, m2, rng, 0.3, 4096, False)
    e = np.zeros(n)
    starts = [0.0, rng.uniform(0.3, 0.8), rng.uniform(0.9, 1.5), rng.uniform(1.4, 2.1), rng.uniform(2.0, 2.6)]
    for s, a in zip(starts, [0.7, 1.0, 0.75, 0.55, 0.35]):
        att = rng.uniform(0.08, 0.25)
        tau = rng.uniform(0.3, 0.8)
        seg = np.where(t < s, 0, np.where(t < s + att, 0.5 - 0.5 * np.cos(np.pi * (t - s) / att),
                                           np.exp(-(t - s - att) / tau)))
        e += a * seg
    e /= e.max()
    y = (unit(low) + 1.0 * unit(mid)) * e[:, None]
    return bfilt(y * rc_fade(n, 0.0, 0.8)[:, None], "highpass", 45, 2), []


def e_load_thump(c, rng):
    n = N(0.5)
    t = tv(n)
    body = chirp_tone(95 * (1 - 0.25 * (1 - np.exp(-t / 0.05))), env_hit(n, 0.004, 0.08))
    nz = lpnoise(rng, n, 300) * env_hit(n, 0.003, 0.04)
    r = rustle(n, rng, 400, 3000, 60, 0.01, 0.8)[:, 0] * env_hit(n, 0.01, 0.07)
    y = unit(body) + 0.7 * unit(nz) + 0.3 * unit(r)
    y = bfilt(y, "highpass", 40, 2)
    return pan(y * rc_fade(n, 0, 0.08), 0.0), [0.0]


def e_bloom_chimes(c, rng):
    """hardship blooming into light: four soft glass glints at irregular times, off-scale and in a
    non-monotonic order (no arpeggio), spreading L->R, over a faint airy bloom."""
    dur = c.get("dur", 0.9)
    gaps = rng.uniform(0.6, 1.4, 3)
    times = np.r_[0.0, np.cumsum(gaps) / gaps.sum() * dur * 0.7]
    freqs = offscale_freqs(rng, 4)
    n = N(dur + 1.0)
    out = np.zeros((n, 2))
    for i, (t0, f) in enumerate(zip(times, freqs)):
        y = glass_glint(rng, f, dur=0.9) * rng.uniform(0.7, 1.0)
        add(out, pan(y, -0.4 + 0.27 * i + rng.uniform(-0.08, 0.08)), N(t0))
    w = whoosh(n, rng, 700, 2400, 1.1, 0.4, 1.5, 2.0, 0.3, lp=5000)
    out = out + 0.2 * unit(w) * rms(out[:N(dur)])
    return out * rc_fade(n, 0, 0.35)[:, None], list(times)


def e_puff_dissolve(c, rng):
    n = N(0.8)
    m = lambda f, t: logbp(f, 1100, 1.2) * lowsoft(f, 5000, 2) * highsoft(f, 150, 2)  # noqa: E731
    puff = st_shaped(n, m, rng, 0.6) * env_hit(n, 0.012, 0.12)[:, None]
    g = glints(n, rng, 30, 1800, 4500, 0.01, 0.03, (4, 8), rate_fn=lambda t: 30 * np.clip(1 - t / 0.6, 0, 1))
    return unit(puff) + 0.35 * unit(g), [0.0]


def e_clearing_swell(c, rng):
    dur = c.get("dur", 1.3)
    n = N(dur + 0.5)
    w = whoosh(n, rng, 380, 2600, 1.3, 0.45 * dur / (n / SR), 1.6, 2.0, 0.1)
    g = glints(n, rng, 10, 3000, 6000) * env_swell(n, 0.5)[:, None]
    return width(unit(w) + 0.12 * unit(g), 1.2), []


def e_load_down(c, rng):
    y = thud(rng, 350, 0.04, 105, 0.06, 0.2, 0.4)
    n = len(y)
    r = rustle(n, rng, 400, 3000, 60, 0.01, 0.8)[:, 0] * env_hit(n, 0.01, 0.09)
    return pan(unit(y) + 0.35 * unit(r), 0.0), [0.0]


def e_gilding_shimmer(c, rng):
    dur = c.get("dur", 2.0)
    n = N(dur + 0.4)
    m = lambda f, t: logbp(f, 2200, 0.7) * lowsoft(f, 6000, 3)  # noqa: E731
    brush = mono_shaped(n, m, rng)
    se = np.zeros(n)
    t0 = 0.0
    while t0 < dur - 0.1:
        d = rng.uniform(0.15, 0.35)
        add(se, env_swell(N(d), 0.3, 1.3, 1.8) * rng.uniform(0.6, 1.0), N(t0))
        t0 += d + rng.uniform(0.02, 0.1)
    brush = pan(brush * se, np.linspace(-0.4, 0.4, n))
    g = glints(n, rng, 14, 3000, 6000, pan_fn=lambda t: -0.4 + 0.8 * t / dur, first_at=0.0)
    out = 0.6 * unit(brush) + unit(g)
    return out * rc_fade(n, 0.08, 0.5)[:, None], []


def e_light_bloom(c, rng):
    dur = c.get("dur", 0.6)
    n = N(dur + 0.45)
    w = whoosh(n, rng, 600, 3000, 1.2, 0.45 * dur / (n / SR), 1.5, 2.0, 0.3)
    m = lambda f, t: logbp(f, 250, 1.0) * highsoft(f, 50, 2)  # noqa: E731
    body = st_shaped(n, m, rng, 0.5, 2048) * env_swell(n, 0.4)[:, None]
    g = glints(n, rng, 14, 3000, 6000) * env_swell(n, 0.5)[:, None]
    return unit(w) + 0.4 * unit(body) + 0.25 * unit(g), []


def e_soft_page(c, rng):
    n = N(0.55)
    r = rustle(n, rng, 700, 6000, 100, 0.004, 0.6) * env_swell(n, 0.35, 1.2, 2.0)[:, None]
    k = N(0.15)
    flap = np.zeros(n)
    add(flap, lpnoise(rng, k, 600) * env_hit(k, 0.01, 0.05), N(0.3))
    y = unit(r) + 0.5 * pan(unit(flap), 0.1)
    return soft_lp(y, 6500), []


EV_GEN = {k[2:]: v for k, v in globals().items() if k.startswith("e_") and callable(v)}

# reverb send per event type; "shine" types always go to the short 'shine' space (1.5 s / 0.7 s),
# the long heaven space is reserved for the radiant bed
SHINE = {"sparkle_line", "motes_twinkle", "settle_chimes", "falling_shimmer", "regrow_chime",
         "ring_shimmer", "bright_swell", "bloom_chimes", "gilding_shimmer", "light_bloom",
         "airy_rise", "airy_fall", "bloom_swell", "clearing_swell"}
SHINE_SPACE = "shine"
EV_SEND = {"sparkle_line": 0.25, "motes_twinkle": 0.35, "settle_chimes": 0.15, "regrow_chime": 0.15,
           "ring_shimmer": 0.3, "bloom_chimes": 0.15, "gilding_shimmer": 0.3, "light_bloom": 0.3,
           "falling_shimmer": 0.3, "bright_swell": 0.25, "airy_rise": 0.3, "airy_fall": 0.3,
           "bloom_swell": 0.25, "clearing_swell": 0.3, "whoosh_up": 0.2, "whoosh_down_fast": 0.18,
           "whoosh_soft": 0.2, "thunder_soft": 0.3, "footsteps_gravel": 0.12, "footsteps_grass": 0.1,
           "clock_ticks": 0.15, "scale_settle_clunk": 0.2, "scale_creak": 0.15, "candle_out_puff": 0.2,
           "low_sigh_wind": 0.25}
DEFAULT_SEND = 0.15

DESIGN_NOTES = {
    # ambience
    "meadow": "Pink-ish noise breeze (log-Gaussian band 300-750 Hz whose centre and level follow a 0.15 Hz gust process, L/R gust offset 0.3 s) + a gust-gated leaf layer (3.6 kHz band x sparse micro-burst AM) + rare distant birds (~0.3 calls/s, 2-3 syllables per call; every syllable has its own contour type/depth +-15 %, length +-30 %, gap +-40 %, 20-60 Hz FM trill, AM flutter and pitch wander; 2nd harmonic at -32 dB; 2.2-3.9 kHz, low-passed 4 kHz for distance; -18 dB re breeze; garden reverb).",
    "air_rise": "Airy wind whose band centre glides 330 Hz -> 2.3 kHz over the bed (brightening) with gentle gusts; a 4.6 kHz air band fades in quadratically. Very wide (corr 0.2), sky reverb.",
    "berzah": "Hushed night air: dark noise (LP 1.8 kHz) plus three broad drifting resonances (205/440/930 Hz, sigma 0.11 oct) that give a hollow, cavernous quality without any pitch you could hum; slow 0.1 Hz swell; long dark 'hollow' reverb.",
    "radiant": "Soft luminous air (noise only, no pad): a broad band (0.9 oct) around 2.25 kHz whose centre drifts +-0.2 oct at 0.12 Hz, gentle 1st/2nd-order slopes, independently breathing L/R levels; a warm 300-900 Hz body at -5 dB; a sparse cloud of 6/s soft resonant grains (1.8-4 kHz, Q 5-9, 50-130 ms). Heaven reverb (3.4 s). Spectral centroid ~2 kHz (was 4.3 kHz hiss); 3 dB lower than v1.",
    "room_warm": "Warm room tone: decorrelated noise centred ~200 Hz (LP 900 Hz) with a 10% slow drift and a faint -20 dB air layer.",
    "lamp_flame": "Oil-lamp flame: low body (260 Hz band) with 7 Hz flicker and 0.5 Hz size modulation, flicker-locked soft hiss (2.1 kHz, -13 dB), and ~0.5/s tiny crackle clusters (1-3 resonant 1-2 ms bursts at 1.7-3.3 kHz).",
    "night_wind": "Low night wind (220-520 Hz gusting band, 0.12 Hz gusts, L/R lag 0.35 s) with a barely-there narrow-band whistle that only appears in gust peaks.",
    "mountain_wind": "Open mountain wind (340-950 Hz gusting band, stronger 0.2 Hz gusts) + gust-gated narrow-band noise whistle 650-1250 Hz at -18 dB; mountain reverb with long pre-delay/echo taps.",
    "rain": "Wind-driven rain kept in the mid-low band: body noise centred 1.1 kHz, LP 3.4 kHz (8th-order soft), plus ~450/s/channel resonant droplet bursts (0.8-3.2 kHz, 2-6 ms) and 10% heavier 400-900 Hz drops, density following a gust process; droplet layer LP 4.5 kHz so it never hisses.",
    "storm_wind": "Heavy low wind 160-600 Hz with deep gusts (0.25 Hz, contrast 1.3, L/R lag 0.4 s) + a narrow howl resonance 180-340 Hz riding the gusts + faint whistle.",
    "dawn": "Calm, soft air (420 Hz band, LP 2.2 kHz) and a few soft, closer birds (same varied-syllable model, ~0.55 calls/s, 2.4-3.9 kHz, LP 4.2 kHz) starting 0.6 s into the bed.",
    "room_tone": "Same warm room model as room_warm, slightly darker, for the photographic end card; cue ends 59.0 s (equal-power fade 58.6-59.4) and the whole bus fades over its last 1.0 s.",
    "air_drift": "Steady soft air for the wide zoom-out/zoom-in between the hereafter and the world: a gently gusting band 380-900 Hz (0.15 Hz gusts, L/R lag 0.3 s) with a faint 2.6 kHz air top; unlike air_rise it never brightens. Bridges the old 14.6-17.8 s hole.",
    "air_floor": "Very low, dark continuous floor (450 Hz band, LP 1.8 kHz, slow 0.07 Hz drift) under the whole narration at ~-62 dBFS, so no pause ever drops into digital silence between beds; no reverb.",
    # events
    "breath_swell": "1.7 s noise swell, band centre rising 380 -> 1.3 kHz, sin^1.6 attack peaking at 45%.",
    "sparkle_line": "~12 soft little grains at random times over the cue (the picture draws two overlapping dotted paths): 12-20 ms Hann noise grains through Q 12-18 resonances at 2.2-3.4 kHz drifting slowly upward, random level 0..-5 dB, pan following the line; faint 3 kHz air underlay; 4th-order LP 5.5 kHz; short 'shine' space. Grains, not ticks: crest ~12 dB.",
    "light_rain": "Sparse (45/s) leaf taps (resonant 2-5 ms bursts) and soft water 'plips' (rising-pitch bubble model, first drop exactly on the cue) with a quiet 1.8 kHz bed, 0.35/0.5 s fades, LP 6 kHz.",
    "footsteps_grass": "Per step: heel + toe roll (70-100 ms later) of 50-70 grass-crush micro-grains with an exponentially thinning tail, a continuous 0.8-3.5 kHz crush body (tau 60 ms), a 700-2800 Hz swish and a 170 Hz LP heel thump; 4th-order LP 5.5 kHz; alternating +-0.08 pan, every step re-randomised (level 0.3, was 0.5).",
    "water_pour": "Watering-can stream: 140/s small bubbles (van den Doel style rising-pitch damped sines, 0.7-3.2 kHz) over a flow-noise band with 18 Hz turbulence AM; LP 6.5 kHz.",
    "soft_pop": "Muted bud pop: 6-10 ms Hann noise puff through a low-Q (2.2-3.6) 650-800 Hz resonator at half the level of a 210-250 Hz body tone with only +6 % pitch rise; both share a 4.5-5.5 ms raised-cosine attack (10-90 % rise ~2.5 ms, crest ~9 dB, not a click), tiny rustle tail, 4th-order LP 4.2 kHz.",
    "whoosh_up": "Pink noise band (1 oct sigma) sweeping 280 Hz -> 3 kHz, peak at 60% of dur, LF air body, stereo width opening 0.8 -> 1.3.",
    "motes_twinkle": "12/s soft resonant noise glints 2.8-6.2 kHz scattered across the stereo field + faint air band; short 'shine' space.",
    "settle_chimes": "Motes settling: 5 soft glass-bead glints at irregular times over 0.47 s. Pitches random in 1.9-3.2 kHz, every one >= 40 cents from any equal-tempered note, >= 1 semitone apart, no consonant intervals, in a non-monotonic order (never a scale or arpeggio). Each glint: fundamental tau 0.08-0.11 s (-20 dB in ~0.2-0.25 s), two weak inharmonic upper modes (x2.2-2.6 at -14..-20 dB, x4.3-5.1 at -24..-30 dB, none above 6.5 kHz) and a 2.5 ms noise tick; no beating partner. Faint grain dust; short 'shine' space, send 0.15. Moved into the 10.04-10.81 s pause.",
    "whoosh_down_fast": "Band sweep 3.4 kHz -> 220 Hz with a fast front (curve 0.7) peaking at 30% + soft LF 'landing' air at 70% of dur.",
    "cloth_kneel": "Cloth rustle (400-3000 Hz band x micro-burst AM) followed by a soft knee-on-soil thud at +0.28 s.",
    "soil_pat": "Three soft hand pats (0 / 0.17 / 0.31 s): LP-noise thud + 120 Hz body with slight pitch drop + soil grit grains; LP 5 kHz.",
    "sprout_pop": "Smaller, higher muted pop (1 kHz puff, 320 Hz body, same soft 5 ms attack) with a few soil-crumble grains that start after the attack; 80 ms ahead of the next word.",
    "grow_swish_up": "Organic rising swish: band 400 Hz -> 2.4 kHz plus an accelerating leafy rustle, peak at 70%.",
    "bloom_swell": "Airy swell 700 Hz -> 3.2 kHz with a light glint dusting (level 0.24, was 0.45); short 'shine' space (1.5 s).",
    "fruit_pops": "12 small soft pops on an irregular grid (+-12 ms around the picture's 70 ms rhythm); each with its own resonance (600-1400 Hz, Q 2-4), body pitch (180-400 Hz), size, +-3 dB level offset and 5-6 ms soft attack; random pan +-0.5; a diminishing ripple (last six 2-7 dB smaller, they sit on the soft end of 'verir').",
    "whoosh_soft": "Broad (1.4 oct) gentle whoosh; 'zoom out' sweeps 1.7 kHz -> 420 Hz while widening, 'zoom in' the reverse while narrowing.",
    "cloth_move": "Short soft cloth rustle (0.35 s).",
    "falling_shimmer": "45/s glints whose centre falls 6.2 -> 2.2 kHz, panning slightly R->L, with a soft falling air band; short 'shine' space (1.5 s).",
    "soft_catch": "Soft hand catch: 900 Hz-LP thud + 180 Hz body + short skin/cloth rustle.",
    "airy_rise": "Breathy band rising 500 Hz -> 2.8 kHz with thin glints (ghost appears); short 'shine' space (1.5 s).",
    "airy_fall": "Breathy band falling 2.6 kHz -> 600 Hz with glints thinning to nothing (ghost dissolves); short 'shine' space (1.5 s).",
    "low_sigh_wind": "Low sigh: broad 260 Hz wind + a soft resonance gliding 620 -> 290 Hz, swell peaking at 32%.",
    "leaf_rustle": "Three overlapping bursts of crisp leaf rustle (1.2-6 kHz band x fast micro-burst AM), LP 7 kHz.",
    "twig_snap_pluck": "Pluck: 3 micro-cracks (0/3.5/8.5 ms, resonant 2.3-3 kHz bursts + small wood modes 950/1780/2650 Hz) then branch-leaf rustle and a tiny spring-back swish.",
    "regrow_chime": "A new fruit fills the plucked place: two soft glass-bead glints 60-90 ms apart (off-scale pitches, non-consonant interval, -20 dB in ~0.2-0.25 s) inside a small airy swell (800 Hz -> 2.6 kHz) with a few soft grains; short 'shine' space, send 0.15.",
    "ring_shimmer": "30/s glints whose pan circles once per dur + an air band with rotating balance (the ring/halo); short 'shine' space (1.5 s).",
    "dim_fade": "Soft descending air 2.6 kHz -> 450 Hz, front-loaded, LP 5 kHz.",
    "bite": "Crisp but soft bite: ~90 crunch grains in 60 ms + wet 'tear' band with micro-burst AM + 300 Hz body; 4th-order LP 6 kHz.",
    "sand_crumble": "Fruit turning to sand: dense grain trickle (900/s decaying, 1.5-4 kHz, 0.7-1.5 ms) + soft pour noise, 4th-order LP 5 kHz.",
    "scale_creak": "Stick-slip creak: every slip interval drawn on its own (+-30 % around a 55 -> 125 -> 55 Hz rate), occasional sticks (2-5 period hold, stronger release) and skips (3-6 quick small slips), lognormal slip strengths, 5-14-sample smooth slip pulses exciting four low-Q (10-16) pivot modes around 330/690/1240/2150 Hz (+-5 %), friction noise with micro-burst AM; LP 4 kHz.",
    "scale_settle_clunk": "Pan settling: modal clunk (165/410/760/1320/2250 Hz, soft 3 ms mallet) with two small bounces at +85 and +140 ms.",
    "bright_swell": "Brightening swell 900 Hz -> 4.2 kHz with glints; starts 35.32 s as the scale finishes settling so it blooms into the pause; short 'shine' space (1.5 s).",
    "candle_light": "Wick ignition at the picture's ignite moment (37.85 s): soft 'fff' band (900 Hz) with flicker + LP 'whump' body + two tiny crackles. Under the voice by design (texture).",
    "clock_ticks": "Tick/tock every 0.5 s: small metal escapement modes (2.35/3.65/5.15 kHz, 4-10 ms) + 880 Hz wooden case mode; 'tock' 7% lower; LP 6.5 kHz.",
    "flame_waver": "Flame flutter: 450 Hz band with 9 Hz high-contrast flicker AM, 0.75 s swell.",
    "swap_swish": "Two quick arc-shaped swishes (700 -> 2.4 kHz -> 700 Hz), panning L->R then R->L.",
    "candle_out_puff": "Blown-out candle: breath puff (1 kHz band, 18 ms attack) and dying 14 Hz flame flutter on the cue, then the smoke curl (1.5 kHz band drifting +-0.25 oct, -10 dB) swells to its peak ~0.6 s later, inside the 41.41-42.47 s pause.",
    "lamp_swell": "Warm oil-lamp swell: flicker-modulated band rising 250 -> 700 Hz.",
    "footsteps_gravel": "Per step: heel + roll grain clouds (120 + 80 grains; 65 % resonant bursts, 35 % tiny 2-4.2 kHz pebble pings) whose density thins out exponentially (tau 35 ms) instead of stopping, a continuous 0.9-4 kHz crunch body under the grains (tau 50 ms), 3-7 displaced pebbles ticking 30-200 ms later, 160 Hz heel thump; 4th-order LP 6 kHz; every step re-randomised; step 2 -6 dB (lands on the end of 'velayet'); mountain reverb.",
    "thunder_soft": "Distant thunder: brown-tilted noise 52-220 Hz (4th-order 52 Hz high-pass, plus a 45 Hz HPF on the result) and an equally weighted 140-600 Hz roll layer under five rolling bursts; no crack; 0.8 s fade tail; mountain reverb; level 0.25 (was 0.45).",
    "load_thump": "Burden on the back: 95 -> 71 Hz body with pitch drop + 300 Hz LP noise + cloth rustle; HP 40 Hz.",
    "bloom_chimes": "Four soft glass-bead glints at irregular times over 0.63 s, off-scale pitches in a non-monotonic order (no arpeggio), spreading L->R, -20 dB in ~0.2-0.25 s, over a faint airy bloom; short 'shine' space, send 0.15.",
    "puff_dissolve": "Soft 1.1 kHz breath puff + glint grains thinning out over 0.6 s; re-timed to the picture's dissolve moments (49.62 s sigh cloud turns to light, 50.62 s grumble blown away).",
    "clearing_swell": "Very wide airy swell 380 Hz -> 2.6 kHz (corr 0.1) with a little shimmer at the top; short 'shine' space (1.5 s).",
    "load_down": "Load set down: soft 350 Hz-LP thud with 105 Hz body + cloth rustle.",
    "gilding_shimmer": "Gold leaf writing: sequence of soft 'brush stroke' swells of a 2.2 kHz band panned L->R with glints following the pen.",
    "light_bloom": "Soft bloom swell 600 Hz -> 3 kHz with a warm 250 Hz body and glints; short 'shine' space (1.5 s).",
    "soft_page": "Page turn: crisp paper rustle (0.7-6 kHz x fast micro-burst AM) + a soft LP flap at +0.3 s; LP 7 kHz.",
}

# ======================================================================================
# renderer
# ======================================================================================

def render_event(c, occurrence=1):
    """render one event cue dry, at final-mix scale. Returns
    (x, hits, subs, t_place, gain, target_lufs, seed_key). Shared by main() and analyze.py."""
    typ = c["type"]
    c = dict(c)
    times = c.get("times")
    t_place = float(min(times)) if times else float(c["t"])
    if times:
        c["_rel_times"] = [float(tt) - t_place for tt in sorted(times)]
    k0 = (typ, round(float(c["t"]), 3))
    seed_key = ("ev",) + k0 + (occurrence,)   # independent of list position
    res = EV_GEN[typ](c, rng_for(*seed_key))
    x, hits = res if isinstance(res, tuple) else (res, [])
    subs = [(h[1], h[2]) for h in hits if isinstance(h, tuple)]
    hits = [h for h in hits if not isinstance(h, tuple)]
    x = st(np.asarray(x, dtype=np.float64))
    x *= rc_fade(len(x), 0.0, 0.01)[:, None]   # 10 ms safety fade-out on the very end
    L = peak_window_loudness(x, 0.1)
    lev = float(c.get("level", 0.4))
    target = REF_EVENT_LUFS + 20 * np.log10(lev) + MASTER_TRIM_DB + TYPE_TRIM_DB.get(typ, 0.0)
    g = 10 ** ((target - L) / 20)
    return x * g, hits, subs, t_place, g, target, seed_key


def main(cues_path=None, out_dir=None):
    cues_path = cues_path or os.path.join(HERE, "cues.json")
    out_dir = out_dir or HERE
    cues = json.load(open(cues_path))
    D = float(cues["duration"])
    NT = N(D)
    amb_list = cues.get("ambience", [])

    def space_at(t):
        cov = [a for a in amb_list if a["from"] <= t < a["to"]]
        if cov:
            return AMB_SPACE[max(cov, key=lambda a: a["from"])["type"]]
        dist = [(min(abs(t - a["from"]), abs(t - a["to"])), a) for a in amb_list]
        return AMB_SPACE[min(dist, key=lambda d: d[0])[1]["type"]] if dist else "garden"

    buses = {"amb": {"dry": np.zeros((NT, 2)), "send": {}}, "ev": {"dry": np.zeros((NT, 2)), "send": {}}}
    manifest = []

    def place(bus, x, t0, space, send):
        b = buses[bus]
        add(b["dry"], x, N(t0))
        if send > 0:
            s = b["send"].setdefault(space, np.zeros(NT))
            add(s, x.mean(axis=1) * send, N(t0))

    # ---------------- ambience ----------------
    for i, a in enumerate(amb_list):
        typ, fr, to, lev = a["type"], float(a["from"]), float(a["to"]), float(a["level"])
        F = float(np.clip(0.25 * (to - fr), 0.15, 0.8))
        s0, s1 = max(0.0, fr - F / 2), min(D, to + F / 2)
        n = N(s1 - s0)
        seed_key = ("amb", typ, round(fr, 3))
        x = AMB_GEN[typ](n, rng_for(*seed_key))
        # equal-power fades centred on from/to (clipped to the timeline)
        e = np.ones(n)
        fi = N((fr + F / 2) - s0)
        fo = N(s1 - (to - F / 2))
        if fi > 0:
            e[:fi] *= np.sin(0.5 * np.pi * np.arange(fi) / fi)
        if fo > 0:
            e[n - fo:] *= np.cos(0.5 * np.pi * (np.arange(fo) + 1) / fo)
        core = x[fi:n - fo] if n - fo - fi > N(0.4) else x
        yk = kweight(core)
        L = -0.691 + 10 * np.log10(np.mean(yk * yk, axis=0).sum() + 1e-30)
        target = REF_AMB_LUFS + 20 * np.log10(lev) + MASTER_TRIM_DB + TYPE_TRIM_DB.get(typ, 0.0)
        g = 10 ** ((target - L) / 20)
        x = x * g * e[:, None]
        sp = AMB_SPACE[typ]
        place("amb", x, s0, sp, AMB_SEND.get(typ, 0.1))
        manifest.append(dict(kind="amb", type=typ, start=round(s0, 4), end=round(s1, 4), cue_from=fr, cue_to=to,
                             level=lev, space=sp, gain_db=round(20 * np.log10(g), 2), body_lufs=round(target, 2),
                             seed=zlib.crc32(repr(seed_key).encode())))

    # ---------------- events ----------------
    occurrence = {}
    for i, c in enumerate(cues.get("events", [])):
        typ = c["type"]
        if typ not in EV_GEN:
            print(f"WARNING: no generator for event type {typ!r} - skipped")
            continue
        k0 = (typ, round(float(c["t"]), 3))
        occurrence[k0] = occurrence.get(k0, 0) + 1
        x, hits, subs, t_place, g, target, seed_key = render_event(c, occurrence[k0])
        lev = float(c.get("level", 0.4))
        sp = SHINE_SPACE if typ in SHINE else space_at(t_place)
        place("ev", x, t_place, sp, EV_SEND.get(typ, DEFAULT_SEND))
        # measured start: first 2 ms-RMS window above (local) peak - 60 dB
        m = x.mean(axis=1) ** 2
        k = N(0.002)
        env = np.sqrt(np.convolve(m, np.ones(k) / k, "same"))
        i0 = int(np.argmax(env > env.max() * 10 ** (-60 / 20)))
        # (sub-events measure their own start on their individual stems inside the generator)
        manifest.append(dict(kind="event", type=typ, t=float(c["t"]), place=round(t_place, 4),
                             hits=[round(t_place + h, 4) for h in hits], level=lev, space=sp,
                             sub_starts=[[round(t_place + h, 4), round(t_place + mm, 4)] for h, mm in subs],
                             send=EV_SEND.get(typ, DEFAULT_SEND), gain_db=round(20 * np.log10(g), 2),
                             peak100_lufs=round(target, 2), measured_start=round(t_place + i0 / SR, 4),
                             length_s=round(len(x) / SR, 3), seed=zlib.crc32(repr(seed_key).encode())))

    # ---------------- reverb returns ----------------
    irs = {}
    out = {}
    for bname, b in buses.items():
        wet = np.zeros((NT, 2))
        for sp, s in b["send"].items():
            nz = np.nonzero(np.abs(s) > 0)[0]
            if not len(nz):
                continue
            a0, a1 = nz[0], nz[-1] + 1
            ir = irs.setdefault(sp, make_ir(sp))
            for ch in range(2):
                y = signal.fftconvolve(s[a0:a1], ir[:, ch])
                add(wet[:, ch], y, a0)
        out[bname] = b["dry"] + wet

    def finish(x):
        x = bfilt(x, "highpass", 30, 2)
        x = bfilt(x, "lowpass", 12000, 4)
        x *= rc_fade(len(x), 0.005, MASTER_FADE_OUT_S)[:, None]
        return x.astype(np.float32)

    amb = finish(out["amb"])
    ev = finish(out["ev"])
    bus = (amb.astype(np.float64) + ev).astype(np.float32)
    assert len(bus) == NT
    # scipy writes plain IEEE-float WAVs (libsndfile adds a time-stamped PEAK chunk, which would
    # make byte-identical re-renders impossible)
    for name, data in (("sfx_bus.wav", bus), ("sfx_amb.wav", amb), ("sfx_events.wav", ev)):
        wavfile.write(os.path.join(out_dir, name), SR, data)
    json.dump(dict(duration=D, samples=NT, bus_md5=hashlib.md5(bus.tobytes()).hexdigest(), ref_event_lufs=REF_EVENT_LUFS, ref_amb_lufs=REF_AMB_LUFS,
                   master_trim_db=MASTER_TRIM_DB, type_trim_db=TYPE_TRIM_DB, cues=manifest,
                   notes=DESIGN_NOTES), open(os.path.join(out_dir, "sfx_manifest.json"), "w"), indent=1)
    print(f"sfx_bus.wav: {NT} samples ({NT / SR:.3f} s), peak {np.abs(bus).max():.4f}")


if __name__ == "__main__":
    # usage: make_sfx.py [cues.json] [out_dir]   (defaults: ./cues.json, this folder)
    main(*(sys.argv[1:3]))
