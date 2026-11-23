#!/usr/bin/env python3
"""sfx.py - procedural, sample-free sound-effect palette for the sponge-painting short.  PALETTE v4.

v4 (after the client's review: "no coarse or unpleasant effects, and a little quieter") is deliberately small
and has two families only:
    AIR    air (camera glides, slow moves) . rise (the breath into the cover) . room_tone (end card)
    LIGHT  glow (light blooming, one tone colour for the whole film) . glint (gold catching the light)
    spare  touch (a felt-soft tap; measured with the rest, not used by the cue sheet)
Gone: dab, dab_flurry, whoosh, specks, puff, paper, shimmer, coin_ting, coin_land, coin_drop_in, wood_knock,
cloth_unroll, pop, pop_flurry, book_slide (noise bursts with hard attacks, crackle, knocks, hiss, runs of
ticks).  The v3 palette is kept in v3_backup/sfx.py.

Everything is synthesised (numpy/scipy).  No samples, no music: the light has ONE fixed colour (four soft
partials between 1.5 and 4.1 kHz, fifths and octaves only), so no two cues can form a tune, and its body is
un-pitched warm air; nothing is struck (the fastest attack of the palette takes 11 ms from 10 to 90 %).

Every public sound function
  * returns a `Sound`: a float32 numpy array shaped (n, 2) at 48 kHz with attributes
        .anchor  seconds from the start of the array to the perceptual "hit" (the mixer puts it on cue t)
        .name
  * is deterministic for a given (seed, params),
  * accepts `pan` (-1 left .. +1 right) and `seed`,
  * is delivered at its calibrated DEFAULT MIX LEVEL (see LEVELS, K-weighted max 100 ms loudness), so a
    cue `gain_db` of 0 means "recommended quiet level under a -16 LUFS narrator",
  * starts and ends on exact zero (raised-cosine edges), has no DC (30 Hz high-pass) and a gentle
    roll-off above ~8 kHz (zero-phase, -6 dB at 9 kHz, 24 dB/oct).

Use `render(name, **params)` or call the functions directly.  `python3 sfx.py` renders the demo set.
"""
import os
import sys
import zlib

import numpy as np
from scipy import fft as sfft
from scipy import signal

import meter

SR = 48000
SQ2 = np.sqrt(2.0)
HERE = os.path.dirname(os.path.abspath(__file__))

# Default level of every sound: maximum K-weighted loudness over any 100 ms window ("LK100", LUFS scale).
# Narration sits at -16 LUFS, so these are 18.5..24 LU below it before the mixer's extra ducking.
# v4: about 3 dB under the v3 defaults.
LEVELS = {
    "air": -38.0, "glow": -39.0, "glint": -39.0, "rise": -34.5, "touch": -40.0,
    "room_tone": -58.0,  # steady-state loudness (1 s window): barely perceptible
}


class Sound(np.ndarray):
    """float32 stereo samples (n, 2) @ 48 kHz + `.anchor` (seconds to the perceptual hit) + `.name`."""

    def __new__(cls, data, anchor=0.0, name=""):
        obj = np.ascontiguousarray(data, dtype=np.float32).view(cls)
        obj.anchor = float(anchor)
        obj.name = name
        obj.sr = SR
        return obj

    def __array_finalize__(self, obj):
        if obj is None:
            return
        self.anchor = getattr(obj, "anchor", 0.0)
        self.name = getattr(obj, "name", "")
        self.sr = SR


# ----------------------------------------------------------------------------------------------------------
# building blocks
# ----------------------------------------------------------------------------------------------------------
def _rng(seed, name):
    return np.random.default_rng(np.random.SeedSequence([zlib.crc32(name.encode()), int(seed) & 0x7FFFFFFF]))


def _n(seconds):
    return max(int(round(seconds * SR)), 8)


def _clip01(v):
    return float(np.clip(v, 0.0, 1.0))


def _ss(u):
    u = np.clip(u, 0.0, 1.0)
    return u * u * (3.0 - 2.0 * u)


def _mag(f, lo=None, hi=None, n_lo=2, n_hi=2, tilt=0.0, ref=1000.0):
    """Zero-phase magnitude: Butterworth-shaped high-pass at lo / low-pass at hi (orders n_lo / n_hi)
    and a spectral tilt in dB per octave around `ref`."""
    ff = np.maximum(f, 1e-6)
    m = np.ones_like(ff)
    if lo:
        m = m / np.sqrt(1.0 + (lo / ff) ** (2 * n_lo))
    if hi:
        m = m / np.sqrt(1.0 + (ff / hi) ** (2 * n_hi))
    if tilt:
        m = m * (np.maximum(ff, 20.0) / ref) ** (tilt / 6.0206)
    return m


def _noise(r, n, lo=None, hi=None, n_lo=2, n_hi=2, tilt=0.0, ch=1, corr=1.0):
    """Spectrally shaped Gaussian noise, unit RMS (shape first, envelope later -> no filter ringing at
    the edges).  ch=2 returns (n, 2) with inter-channel correlation `corr` (decorrelation = width that
    stays mono-compatible: nothing is in anti-phase)."""
    N = sfft.next_fast_len(max(n + 64, 512), real=True)
    f = sfft.rfftfreq(N, 1.0 / SR)
    m = _mag(f, lo, hi, n_lo, n_hi, tilt)
    m[0] = 0.0

    def one():
        x = sfft.irfft(sfft.rfft(r.standard_normal(N)) * m, N)[:n]
        return x / (np.sqrt(np.mean(x * x)) + 1e-12)

    if ch == 1:
        return one()
    c, a, b = one(), one(), one()
    k, u = np.sqrt(_clip01(corr)), np.sqrt(1.0 - _clip01(corr))
    return np.stack([k * c + u * a, k * c + u * b], axis=1)


def _burst(r, env, lo=None, hi=None, n_lo=2, n_hi=2, tilt=0.0, corr=1.0):
    """Stereo shaped noise under an envelope, re-normalised to the energy unit-RMS noise would have under
    that envelope (a few milliseconds of narrow-band noise otherwise vary by several dB from seed to seed,
    which would randomise the balance of the layers)."""
    y = _noise(r, len(env), lo, hi, n_lo, n_hi, tilt, ch=2, corr=corr) * env[:, None]
    return y * np.sqrt(np.mean(env * env) / (np.mean(y * y) + 1e-20))


def _tv_noise(r, n, mask_fn, nfft=1024, corr=0.6, norm=True):
    """Stereo noise whose spectrum moves in time: white noise -> STFT -> multiply by
    mask_fn(t[:, None] seconds, f[None, :] Hz) -> overlap-add.  norm=True keeps every frame at equal power
    so loudness is controlled only by the time-domain envelope applied afterwards."""
    hop = nfft // 4
    w = 0.5 - 0.5 * np.cos(2.0 * np.pi * np.arange(nfft) / nfft)
    pad = nfft
    nfr = int(np.ceil((n + 2 * pad - nfft) / hop)) + 1
    N = (nfr - 1) * hop + nfft
    f = np.fft.rfftfreq(nfft, 1.0 / SR)
    tc = (np.arange(nfr) * hop + nfft / 2.0 - pad) / SR
    M = np.array(np.broadcast_to(mask_fn(tc[:, None], f[None, :]), (nfr, len(f))), dtype=np.float64)
    M[:, 0] = 0.0
    if norm:
        M /= np.sqrt(np.mean(M * M, axis=1, keepdims=True)) + 1e-12
    idx = np.arange(nfft)[None, :] + hop * np.arange(nfr)[:, None]

    def shaped():
        y = np.fft.irfft(np.fft.rfft(r.standard_normal(N)[idx] * w, axis=1) * M, nfft, axis=1) * w
        out = np.zeros(N)
        for i in range(nfr):
            out[i * hop:i * hop + nfft] += y[i]
        return out[pad:pad + n] / 1.5

    c, a, b = shaped(), shaped(), shaped()
    k, u = np.sqrt(_clip01(corr)), np.sqrt(1.0 - _clip01(corr))
    x = np.stack([k * c + u * a, k * c + u * b], axis=1)
    return x / (np.sqrt(np.mean(x * x)) + 1e-12)


def _ad(n, attack, tau, delay=0.0):
    """Raised-cosine attack (0 -> 1 in `attack` s) followed by an exponential decay (time constant tau)."""
    t = np.arange(n) / SR - delay
    e = np.zeros(n)
    a = (t >= 0) & (t < attack)
    e[a] = 0.5 - 0.5 * np.cos(np.pi * t[a] / attack)
    d = t >= attack
    e[d] = np.exp(-(t[d] - attack) / tau)
    return e


def _bell(n, peak=0.5, p_in=1.0, p_out=1.0):
    """Asymmetric raised-cosine bump: 0 at both ends, 1 at fraction `peak`; exponents shape rise / fall."""
    u = np.arange(n) / max(n - 1, 1)
    return _bell_u(u, peak, p_in, p_out)


def _bell_u(u, peak=0.5, p_in=1.0, p_out=1.0):
    u = np.clip(u, 0.0, 1.0)
    up = (0.5 - 0.5 * np.cos(np.pi * np.minimum(u / peak, 1.0))) ** p_in
    dn = (0.5 + 0.5 * np.cos(np.pi * np.clip((u - peak) / (1.0 - peak), 0.0, 1.0))) ** p_out
    return np.where(u < peak, up, dn)


def _hann_bump(n, centre, width):
    """Single raised-cosine bump of total `width` seconds centred at `centre` seconds."""
    t = np.arange(n) / SR
    u = (t - centre) / width
    return np.where(np.abs(u) < 0.5, 0.5 + 0.5 * np.cos(2.0 * np.pi * u), 0.0)


def _fade(x, fin=0.002, fout=0.010):
    """Raised-cosine fades so the first and last samples are exactly zero."""
    n = len(x)
    a, b = min(_n(fin), n // 2), min(_n(fout), n // 2)
    g = np.ones(n)
    g[:a] = 0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a)
    g[n - b:] = 0.5 + 0.5 * np.cos(np.pi * (np.arange(b) + 1) / b)
    return x * (g[:, None] if x.ndim == 2 else g)


def _pan(mono, pan):
    """Constant-power pan of a mono signal (unity gain per channel at centre). pan may be an array."""
    th = (np.clip(pan, -1.0, 1.0) + 1.0) * np.pi / 4.0
    return np.stack([mono * np.cos(th) * SQ2, mono * np.sin(th) * SQ2], axis=1)


def _bal(stereo, pan):
    """Constant-power balance of a stereo signal. pan may be an array."""
    th = (np.clip(pan, -1.0, 1.0) + 1.0) * np.pi / 4.0
    return np.stack([stereo[:, 0] * np.cos(th) * SQ2, stereo[:, 1] * np.sin(th) * SQ2], axis=1)


def _chirp(n, f_of_t, t0=0.0):
    """Sine with time-varying frequency f_of_t(t >= 0) starting at phase 0 at t0 (silent before)."""
    t = np.arange(n) / SR - t0
    on = t >= 0
    out = np.zeros(n)
    ph = 2.0 * np.pi * np.cumsum(f_of_t(t[on])) / SR
    out[on] = np.sin(ph - ph[0] if len(ph) else ph)
    return out


def _modes(n, freqs, amps, taus, t0=0.0, attack=0.003):
    """Bank of exponentially decaying sine modes struck at t0, with a soft raised-cosine attack
    (no excitation click)."""
    t = np.arange(n) / SR - t0
    on = t >= 0
    tt = t[on]
    out = np.zeros(n)
    acc = np.zeros(len(tt))
    for f, a, tau in zip(freqs, amps, taus):
        acc += a * np.exp(-tt / tau) * np.sin(2.0 * np.pi * f * tt)
    acc *= np.where(tt < attack, 0.5 - 0.5 * np.cos(np.pi * tt / attack), 1.0)
    out[on] = acc
    return out


def _grain(fc, q, length=0.006):
    """Tiny band-limited tick: a heavily damped resonance (centre fc, quality q), unit peak."""
    n = _n(length)
    t = np.arange(n) / SR
    k = np.sin(2.0 * np.pi * fc * t) * np.exp(-t * np.pi * fc / q) * (1.0 - np.exp(-t * fc / 0.35))
    k *= 0.5 + 0.5 * np.cos(np.pi * np.arange(n) / n)
    return k / (np.max(np.abs(k)) + 1e-12)


_SOS_HP = signal.butter(2, 30.0, "highpass", fs=SR, output="sos")
_SOS_LP = signal.butter(2, 9000.0, "lowpass", fs=SR, output="sos")


def _finish(x, name, anchor, level=None, fin=0.002, fout=0.010, win=0.1):
    """Common mastering of a sound: DC blocker, gentle top-end roll-off, zero edges, level calibration."""
    x = np.asarray(x, dtype=np.float64)
    n = len(x)
    y = np.concatenate([x, np.zeros((_n(0.05), 2))])
    y = signal.sosfilt(_SOS_HP, y, axis=0)
    y = signal.sosfiltfilt(_SOS_LP, y, axis=0)[:n]
    y = _fade(y, fin, fout)
    level = LEVELS[name] if level is None else level
    y *= 10.0 ** ((level - meter.max_window_lufs(y, win)) / 20.0)
    return Sound(y, anchor, name)


# ----------------------------------------------------------------------------------------------------------
# the palette (v4): two families only - AIR (air, rise, room_tone) and LIGHT (glow, glint).
# Nothing is struck: the fastest attack in the palette is the glint's (10-90 % in about 11 ms).
# ----------------------------------------------------------------------------------------------------------
def air(duration=0.8, direction="lr", seed=0, warmth=0.5, pan=0.0, sweep=0.45, peak=0.5):
    """Soft air for a camera glide or a slow move: low-passed noise in a band about 1.7 octaves wide whose
    centre glides 300 -> 820 Hz and back (lr / rl / none), up ('up') or down ('down'); a 4th-order low-pass
    at 2.4 kHz removes every trace of hiss, a high-pass at 170 Hz every rumble.  Slow bell envelope (attack about a quarter of the duration),
    a breath of slow turbulence, a gentle pan sweep.  `warmth` 0..1 = darker.
    Anchor = the loudest point (peak * duration) = the fastest point of the move."""
    r = _rng(seed, "air")
    T = float(np.clip(duration, 0.4, 4.0))
    n = _n(T)
    w = _clip01(warmth)
    f_lo, f_hi = 300.0 * 2 ** (0.6 * (0.5 - w)), 820.0 * 2 ** (1.0 * (0.5 - w))

    def glide(tt):
        u = np.clip(tt / T, 0.0, 1.0)
        if direction == "up":
            c = _ss(u)
        elif direction == "down":
            c = 1.0 - _ss(u)
        else:
            c = _bell_u(u, peak, 1.0, 1.0)
        return f_lo * (f_hi / f_lo) ** c

    def mask(tt, ff):
        ff = np.maximum(ff, 20.0)
        band = np.exp(-0.5 * (np.log2(ff / glide(tt)) / 0.85) ** 2)
        return band / np.sqrt(1.0 + (170.0 / ff) ** 4) / np.sqrt(1.0 + (ff / 2400.0) ** 8)

    x = _tv_noise(r, n, mask, nfft=2048, corr=0.5)
    env = _bell(n, peak, 1.8, 1.5) * (1.0 + 0.05 * np.clip(_noise(r, n, 1.5, 6.0, 1, 2), -2.5, 2.5))
    u = np.arange(n) / n
    traj = {"lr": 2.0 * _ss(u) - 1.0, "rl": 1.0 - 2.0 * _ss(u)}.get(direction, np.zeros(n))
    x = _bal(x, pan + sweep * traj) * env[:, None]
    return _finish(x, "air", peak * T, fin=0.03, fout=0.05)


# The light.  ONE colour for the whole film: four high partials in fifths and octaves (1536 / 2048 / 3072 /
# 4096 Hz = 3, 4, 6, 8 x GLOW_ROOT).  They are too high and too soft to be heard as a note, they never form an
# interval other than a fifth or an octave (nothing that could be called a tune, nothing sour), and no two of
# them share a critical band (no roughness).  The glint's fundamental (2048 Hz) is one of them.
GLOW_ROOT = 512.0
_SHIMMER = ((3.0, 0.0), (4.0, -1.5), (6.0, -5.0), (8.0, -9.5))  # ratio to GLOW_ROOT, dB at brightness 0.5


def glow(duration=1.4, seed=0, brightness=0.5, pan=0.0, peak=0.5, rising=0.0, shimmer=0.5, spread=0.5):
    """Warm light blooming - the shimmer without hiss.  Two layers under one slow bell envelope:
      body     a breath of warm air (noise band round 650 Hz, 250 Hz - 1.8 kHz, nothing hissy), not pitched;
      shimmer  four soft high partials (1.5 / 2 / 3 / 4.1 kHz).  Each is a sine with two quieter companions
               0.5-1.8 Hz above and below it: they are in phase at the partial's own peak and drift apart
               afterwards (a slow shimmer of at most 12 dB, never a flutter), each with a slow random
               twinkle (0.7-4 Hz) and its own place in the stereo field; the upper partials arrive later
               and leave earlier, so the light brightens towards its peak.  Nothing is struck (attacks of
               100 ms and more), nothing above 4.2 kHz.
    `shimmer` 0..1 = balance (0 = only the warm air, 0.5 = equal loudness, 1 = mostly shimmer);
    `rising` 0..1 = a bloom that climbs: the partials come in from low to high (the low ones up to 45 %
    earlier) and the body's band glides upward; `brightness` tilts the shimmer (+-6 dB) and the body.
    Anchor = the peak (peak * duration)."""
    r = _rng(seed, "glow")
    T = float(np.clip(duration, 0.4, 8.0))
    n = _n(T)
    b = _clip01(brightness)
    ri = _clip01(rising)
    sh = _clip01(shimmer)
    u = np.arange(n) / max(n - 1, 1)
    t = np.arange(n) / SR
    glob = _bell(n, peak, 1.5, 1.1)

    # ---- body: warm air ----
    f_c = 650.0 * 2 ** (0.5 * (b - 0.5))

    def mask(tt, ff):
        ff = np.maximum(ff, 20.0)
        c = f_c * 2 ** (0.8 * ri * (_ss(np.clip(tt / (peak * T), 0.0, 1.0)) - 0.6))
        m = np.exp(-0.5 * (np.log2(ff / c) / 0.7) ** 2)
        return m / np.sqrt(1.0 + (250.0 / ff) ** 6) / np.sqrt(1.0 + (ff / 1800.0) ** 8)

    body = _tv_noise(r, n, mask, nfft=2048, corr=0.45) * (glob ** 1.1)[:, None]

    # ---- shimmer: four high partials ----
    K = len(_SHIMMER)
    lite = np.zeros((n, 2))
    for k, (ratio, adb) in enumerate(_SHIMMER):
        q = k / (K - 1.0)
        f = GLOW_ROOT * ratio
        pk = peak * (1.0 - 0.45 * ri * (1.0 - q))
        e = _bell_u(u, pk, 1.6 + 1.2 * q, 1.1 + 0.8 * q * (1.0 - ri))
        if ri > 0.0 and pk < peak:
            # a climbing bloom: a partial that has arrived (at 62 %) keeps growing gently until the top one is
            # there, so the level grows all the way to the anchor; afterwards the low ones leave first
            hold = 0.62 + 0.38 * _ss((u - pk) / (peak - pk))
            fall = (0.5 + 0.5 * np.cos(np.pi * np.clip((u - peak) / (1.0 - peak), 0.0, 1.0))) ** (1.7 - 0.6 * q)
            e = np.where(u < pk, 0.62 * e, np.where(u < peak, hold, fall))
        a = 10.0 ** ((adb + 12.0 * (b - 0.5) * (q - 0.3)) / 20.0)
        tc = t - pk * T
        for j in range(3):
            df = 0.0 if j == 0 else r.uniform(0.5, 1.8) * (1.0 if j == 1 else -1.0)
            tw = np.clip(1.0 + 0.30 * _noise(r, n, 0.7, 4.0, 1, 2), 0.3, 1.8)
            comp = np.sin(2.0 * np.pi * (f + df) * tc + 0.5 * r.uniform(-1.0, 1.0)) * tw * (1.0 if j == 0 else 0.3)
            lite += _pan(comp * e * a, pan + spread * r.uniform(-1.0, 1.0))

    # ---- balance: equal K-weighted loudness at shimmer = 0.5 ----
    lb, ll = meter.max_window_lufs(body, 0.1), meter.max_window_lufs(lite, 0.1)
    x = body * 10.0 ** (-lb / 20.0) * np.cos(sh * np.pi / 2.0) * SQ2
    x += lite * 10.0 ** (-ll / 20.0) * np.sin(sh * np.pi / 2.0) * SQ2
    return _finish(_bal(x, pan * 0.5), "glow", peak * T, fin=0.03, fout=0.10)


_GLINT_MODES = ((1.0, 0.0, 1.0), (1.729, -9.0, 0.6), (2.328, -17.0, 0.4))  # ratio, dB, decay: a small plate (coin)


def glint(seed=0, pitch=1.0, duration=0.6, brightness=0.5, pan=0.0, softness=0.6):
    """One sweet, small glint (gold catching the light).  The three lowest modes of a small free plate - a
    coin - at 2048 Hz (one of the glow's partials, so it belongs to the light), 3.5 kHz (9 dB down) and
    4.8 kHz (17 dB down), the upper ones gone sooner; each a doublet 1.2-2.5 Hz apart that starts in phase
    (a slow, shallow beat inside the ring-out).  Inharmonic: an object, not a note.
    NOT struck: a raised-cosine attack of 12-24 ms (10-90 % in 7-14 ms; 11 ms at the default softness), no
    contact noise at all, then an exponential ring-out (`duration` = T60 of the lowest mode).  The pitch is
    fixed: two glints are the same object, never an interval.  Anchor = the middle of the attack."""
    r = _rng(seed, "glint")
    t60 = float(np.clip(duration, 0.2, 1.5))
    A = 0.012 + 0.012 * _clip01(softness)
    pre = 0.002
    n = _n(pre + A + 1.05 * t60 + 0.03)
    t = np.arange(n) / SR - pre
    on = t >= 0
    tt = t[on]
    tau1 = t60 / 6.91
    f1 = 4.0 * GLOW_ROOT * pitch
    x = np.zeros((n, 2))
    for k, (ratio, adb, damp) in enumerate(_GLINT_MODES):
        f = f1 * ratio
        if f > 6000.0:
            continue
        df = r.uniform(1.2, 2.5)
        s = np.sin(2.0 * np.pi * (f - 0.5 * df) * tt) + 0.35 * np.sin(2.0 * np.pi * (f + 0.5 * df) * tt)
        s *= np.exp(-tt / (tau1 * damp)) * 10.0 ** ((adb + (8.0 * (_clip01(brightness) - 0.5) if k else 0.0)) / 20.0)
        s *= np.where(tt < A, 0.5 - 0.5 * np.cos(np.pi * tt / A), 1.0)
        y = np.zeros(n)
        y[on] = s
        x += _pan(y, 0.12 * r.uniform(-1.0, 1.0))
    return _finish(_bal(x, pan), "glint", pre + 0.5 * A, fout=0.03)


def rise(duration=2.4, seed=0, brightness=0.5, pan=0.0, peak=0.7, air=0.0, bed=0.0):
    """Broad, warm breath for the final moment: pink-ish noise (200 Hz up) through a low-pass that opens
    (340 Hz -> about 1.4 kHz) towards the peak and closes again.  Slow build, soft landing (the last 30 %).
    v4: darker top, no rumble (high-pass 200 Hz 18 dB/oct, was 70 Hz), no air layer and no low sine bed by default (`air`, `bed` > 0 bring them back; the 55-60 / 91 Hz bed read
    as hum on headphones).  Anchor = the peak (peak * duration)."""
    r = _rng(seed, "rise")
    T = float(np.clip(duration, 0.8, 10.0))
    n = _n(T)
    b = _clip01(brightness)
    top = 1400.0 * 2 ** (b - 0.5)

    def mask(tt, ff):
        ff = np.maximum(ff, 1.0)
        open_ = _bell_u(tt / T, max(peak - 0.03, 0.1), 1.5, 1.0)
        fc = 340.0 * (top / 340.0) ** open_
        m = _mag(ff, 200.0, None, 3, 2, tilt=-3.0, ref=300.0) / np.sqrt(1.0 + (ff / fc) ** 4)
        return m + 0.035 * air * np.exp(-0.5 * (np.log2(ff / 4200.0) / 0.8) ** 2) * open_ ** 2

    x = _tv_noise(r, n, mask, nfft=4096, corr=0.45, norm=False) * _bell(n, peak, 2.2, 1.3)[:, None]
    if bed > 0.0:
        t = np.arange(n) / SR
        e_bed = _bell(n, min(peak + 0.02, 0.95), 1.8, 1.4)
        low = np.sin(2.0 * np.pi * (55.0 * t + 2.5 * t * t / T)) + 0.5 * np.sin(2.0 * np.pi * 91.0 * t + 1.3)
        x += _pan(low * e_bed * 0.55 * bed, 0.0)
    return _finish(_bal(x, pan), "rise", peak * T, fin=0.05, fout=0.15)


def room_tone(duration=6.0, seed=0, warmth=0.5, pan=0.0, fade_in=0.6, fade_out=1.2):
    """Extremely quiet warm air / room tone for the end card: brown-ish noise (about -4.5 dB/oct,
    70 Hz - 1.5 kHz), wide and slowly breathing (+-0.7 dB over seconds), long fades.  Anchor = start."""
    r = _rng(seed, "room_tone")
    T = float(max(duration, 0.5))
    n = _n(T)
    w = _clip01(warmth)
    x = _noise(r, n, 80.0, 1500.0 * 2 ** (1.0 - 2.0 * w), 2, 1, tilt=-4.5, ch=2, corr=0.35)
    drift = np.stack([_noise(r, n, 0.08, 0.6, 1, 2), _noise(r, n, 0.08, 0.6, 1, 2)], axis=1)
    x *= 1.0 + 0.08 * np.clip(drift, -2.5, 2.5)
    fi, fo = min(fade_in, T * 0.4), min(fade_out, T * 0.5)
    return _finish(_bal(x, pan), "room_tone", 0.0, fin=fi, fout=fo, win=1.0)


# ---- spare: measured and verified with the rest, NOT used by the v4 cue sheet ----------------------------
def touch(seed=0, pitch=1.0, pan=0.0, softness=0.6):
    """SPARE.  A felt-soft touch (a print lands): two damped low modes (225 / 352 Hz x pitch, 28 / 20 ms) and a
    faint low-passed breath of felt (300-900 Hz, 12 dB under), raised-cosine attack 14-22 ms (10-90 % in
    8-12 ms; about 10 ms at the default softness).  No contact tick, nothing above 1 kHz.
    Anchor = the middle of the attack."""
    r = _rng(seed, "touch")
    A = 0.014 + 0.008 * _clip01(softness)
    pre = 0.002
    n = _n(pre + A + 0.20)
    t = np.arange(n) / SR - pre
    ramp = np.where(t < 0, 0.0, np.where(t < A, 0.5 - 0.5 * np.cos(np.pi * np.clip(t, 0, A) / A), 1.0))
    tp = np.maximum(t, 0.0)
    s = np.sin(2.0 * np.pi * 225.0 * pitch * tp) * np.exp(-tp / 0.028)
    s += 0.6 * np.sin(2.0 * np.pi * 352.0 * pitch * tp + r.uniform(0.0, 6.2832)) * np.exp(-tp / 0.020)
    x = _pan(s * ramp, 0.0)
    x += 0.25 * _burst(r, ramp * np.exp(-tp / 0.022), 300.0, 900.0, 2, 3, corr=0.8) * np.sqrt(np.mean((s * ramp) ** 2) / (np.mean((ramp * np.exp(-tp / 0.022)) ** 2) + 1e-20))
    return _finish(_bal(x, pan), "touch", pre + 0.5 * A, fout=0.03)


# ----------------------------------------------------------------------------------------------------------
# registry
# ----------------------------------------------------------------------------------------------------------
SOUNDS = {
    "air": air, "glow": glow, "glint": glint, "rise": rise, "room_tone": room_tone,
    "touch": touch,   # spare
}


def render(name, **params):
    """Render sound `name` with keyword params -> Sound (float32 (n, 2) @ 48 kHz, .anchor in seconds)."""
    if name not in SOUNDS:
        raise KeyError("unknown sound %r; available: %s" % (name, ", ".join(sorted(SOUNDS))))
    try:
        return SOUNDS[name](**params)
    except TypeError as e:
        raise TypeError("sound %r: %s" % (name, e)) from None


def write_wav(path, x, dither=False, seed=1):
    """Write float audio (n, 2) as 48 kHz 16-bit PCM (optional TPDF dither)."""
    from scipy.io import wavfile
    y = np.asarray(x, dtype=np.float64) * 32767.0
    if dither:
        g = np.random.default_rng(seed)
        y = y + g.random(y.shape) - g.random(y.shape)
    wavfile.write(path, SR, np.clip(np.round(y), -32768, 32767).astype(np.int16))


def describe(s):
    """One-line measurement of a Sound."""
    env = np.convolve(np.sum(np.asarray(s, np.float64) ** 2, axis=1), np.ones(144) / 144.0, "same")
    return ("%-13s dur %6.3f s  peak %6.1f dBFS  rms %6.1f dBFS  centroid %5.0f Hz  LK100 %6.1f  anchor %6.3f s"
            "  (env max @ %.3f s)" % (s.name, len(s) / SR, meter.sample_peak_db(s), meter.rms_db(s),
                                      meter.spectral_centroid(s), meter.max_window_lufs(s, 0.1), s.anchor,
                                      np.argmax(env) / SR))


def render_demo(out_dir=None):
    """Write every sound (default params, default level) to sfx_demo/<name>.wav and print its numbers.
    Also writes sfx_demo/_audition_reel.wav: all sounds in a row, +14 dB, for a human to audition."""
    out_dir = out_dir or os.path.join(HERE, "sfx_demo")
    os.makedirs(out_dir, exist_ok=True)
    reel = [np.zeros((_n(0.3), 2))]
    for name in SOUNDS:
        s = render(name)
        write_wav(os.path.join(out_dir, name + ".wav"), s)
        print(describe(s))
        reel += [np.asarray(s, np.float64) * 10 ** (14 / 20.0), np.zeros((_n(0.6), 2))]
    write_wav(os.path.join(out_dir, "_audition_reel.wav"), np.concatenate(reel))


def list_sounds():
    """Print every sound with its parameters (defaults) and default level."""
    import inspect
    for name, fn in SOUNDS.items():
        lvl = LEVELS.get(name, 0.0)
        print("%-13s LK100 %6.1f  %s" % (name, lvl, str(inspect.signature(fn))))


if __name__ == "__main__":
    if "--list" in sys.argv:
        list_sounds()
    else:
        render_demo(sys.argv[1] if len(sys.argv) > 1 else None)
