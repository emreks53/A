#!/usr/bin/env python3
"""sfx.py - procedural, sample-free sound-effect palette for the sponge-painting short.

Everything is synthesised (numpy/scipy): layered shaped noise, modal resonators, soft envelopes.
No samples, no music, nothing pitched on a scale.  All sounds are soft, matte, organic.

Every public sound function
  * returns a `Sound`: a float32 numpy array shaped (n, 2) at 48 kHz with attributes
        .anchor  seconds from the start of the array to the perceptual "hit" (the mixer puts it on cue t)
        .name
  * is deterministic for a given (seed, params),
  * accepts `pan` (-1 left .. +1 right) and `seed`,
  * is delivered at its calibrated DEFAULT MIX LEVEL (see LEVELS, K-weighted max 100 ms loudness), so a
    cue `gain_db` of 0 means "recommended quiet level under a -16 LUFS narrator",
  * starts and ends on exact zero (raised-cosine edges), has no DC (30 Hz high-pass) and a gentle
    roll-off above ~10 kHz (zero-phase, -6 dB at 11.5 kHz, 24 dB/oct).

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
# Narration sits at -16 LUFS, so these are 16..22 LU below it before the mixer's extra 5 dB of ducking.
LEVELS = {
    "dab": -32.0, "whoosh": -35.0, "specks": -37.0, "puff": -34.5, "paper": -35.5, "shimmer": -37.0,
    "coin_ting": -35.0, "coin_land": -33.5, "coin_drop_in": -32.5, "wood_knock": -32.5,
    "cloth_unroll": -35.0, "rise": -32.0, "pop": -35.5, "book_slide": -35.5,
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
_SOS_LP = signal.butter(2, 11500.0, "lowpass", fs=SR, output="sos")


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
# the palette
# ----------------------------------------------------------------------------------------------------------
def dab(seed=0, duration=None, brightness=0.5, wet=0.5, weight=0.5, pan=0.0):
    """One soft sponge dab on a wall: a muted, damp 'pf-thup' (40-90 ms).
    Layers: 'pf' = air squeezed from the pores (0.9-2.5 kHz, first, very short), 'thup' = damp body
    (300-1100 Hz, slightly later, longer), a soft wall thump (95-130 Hz, falling), and 0-3 faint tacky
    peel ticks on the release.  The seed varies length, band centres, layer balance, thump pitch."""
    r = _rng(seed, "dab")
    dur = float(np.clip(duration if duration else r.uniform(0.048, 0.082), 0.040, 0.090))
    b = _clip01(brightness)
    pre = 0.002
    n = _n(pre + dur + 0.012)
    v = r.uniform
    body_lo, body_hi = 300.0 * 2 ** v(-0.2, 0.2), 1050.0 * 2 ** v(-0.25, 0.25)
    body = _burst(r, _ad(n, v(0.007, 0.011), 0.26 * dur, pre + 0.002), body_lo, body_hi, 2, 3, corr=0.8)
    pf_lo, pf_hi = 900.0 * 2 ** v(-0.2, 0.2), (1900.0 + 1200.0 * b) * 2 ** v(-0.15, 0.15)
    pf = _burst(r, _ad(n, v(0.0035, 0.006), 0.10 * dur, pre), pf_lo, pf_hi, 2, 3, corr=0.7)
    f0 = v(95.0, 130.0)
    thump = _chirp(n, lambda t: f0 * (1.0 + 0.7 * np.exp(-t / 0.010)), pre + 0.001) * _ad(n, 0.006, 0.30 * dur, pre + 0.001)
    x = body + pf * (0.40 + 0.5 * b) * v(0.8, 1.25)
    x += _pan(thump * (0.35 + 0.7 * _clip01(weight)) * v(0.8, 1.2), 0.0)
    for _ in range(int(min(r.poisson(1.6 * _clip01(wet)), 3))):
        pos, ln, fc = pre + dur * v(0.35, 0.8), v(0.002, 0.004), v(1400.0, 3000.0)
        tick = _noise(r, n, fc * 0.7, fc * 1.4, 2, 2) * _hann_bump(n, pos, ln) * v(0.22, 0.42)
        x += _pan(tick, v(-0.4, 0.4))
    x = _bal(x, pan)
    return _finish(x, "dab", pre + 0.006, level=LEVELS["dab"] + v(-1.0, 1.0), fout=0.012)


def _schedule(r, n, duration, shape="decel", jitter=0.18, min_gap=0.055):
    """Irregular hit times in [0, duration]: 'decel' (quick then slowing), 'accel', 'arc' (slow-fast-slow),
    'even', or a number = exponent of the time warp.  Jittered, never closer than min_gap."""
    if n <= 1:
        return np.zeros(1)
    u = np.linspace(0.0, 1.0, n)
    if shape == "arc":
        w = u + 0.6 * np.sin(2.0 * np.pi * u) / (2.0 * np.pi)
    else:
        g = {"decel": 1.7, "accel": 1.0 / 1.7, "even": 1.0}.get(shape, shape)
        w = u ** float(g)
    t = duration * w
    gaps = np.diff(t)
    for i in range(1, n - 1):
        t[i] += r.uniform(-jitter, jitter) * min(gaps[i - 1], gaps[i])
    for i in range(1, n):
        t[i] = max(t[i], t[i - 1] + min_gap)
    return t


def _flurry(name, one, n, duration, seed, shape, fall_db, pan, spread, times, jitter, level_jit, kw):
    r = _rng(seed, name)
    if times is not None:
        t = np.asarray(sorted(float(v) for v in times))
        t = t - t[0]
        n = len(t)
    else:
        n = max(int(n), 1)
        t = _schedule(r, n, float(duration), shape, jitter)
    hits = []
    last_pan = None
    for i in range(n):
        p = pan + spread * r.uniform(-1.0, 1.0)
        if last_pan is not None and abs(p - last_pan) < 0.15 * spread:
            p = pan + spread * r.uniform(-1.0, 1.0)
        last_pan = p
        g = -fall_db * (i / max(n - 1, 1)) ** 0.9 + (r.uniform(-level_jit, level_jit) if i else 0.0)
        s = one(seed=int(r.integers(1, 2 ** 31 - 1)), pan=float(np.clip(p, -1, 1)), **kw(r, i, n))
        hits.append((t[i], 10.0 ** (g / 20.0), s))
    a0 = max(s.anchor for _, _, s in hits)
    place = [(int(round((tt + a0 - s.anchor) * SR)), g, s) for tt, g, s in hits]
    out = np.zeros((max(i0 + len(s) for i0, _, s in place), 2))
    for i0, g, s in place:
        out[i0:i0 + len(s)] += np.asarray(s, dtype=np.float64) * g
    return Sound(out, a0, name)


def dab_flurry(n=6, duration=0.8, seed=0, shape="decel", fall_db=7.0, pan=0.0, spread=0.5,
               brightness=0.5, wet=0.5, times=None, jitter=0.18):
    """A natural, irregular run of n dabs ('dabbed in').  `duration` = time from the first to the last
    hit; shape 'decel' | 'accel' | 'arc' | 'even'; levels fall by `fall_db` over the run (+-1.2 dB random),
    random pans within +-spread.  Pass `times=[0, .1, .23, ...]` (seconds after the first hit) to lock the
    dabs to stepped animation frames.  Anchor = first dab."""
    def kw(r, i, m):
        return dict(brightness=_clip01(brightness + r.uniform(-0.2, 0.2) - 0.15 * i / max(m - 1, 1)),
                    wet=wet, weight=_clip01(0.6 - 0.3 * i / max(m - 1, 1) + r.uniform(-0.15, 0.15)))
    return _flurry("dab_flurry", dab, n, duration, seed, shape, fall_db, pan, spread, times, jitter, 1.2, kw=kw)


def whoosh(duration=0.7, direction="lr", seed=0, brightness=0.5, pan=0.0, sweep=0.55, peak=0.48):
    """Airy, gentle camera-move swish: noise through a band (about 1.5 octaves wide) whose centre glides
    (lr/rl/none: up and back, 'up': rising, 'down': falling), a smooth bell envelope with slight air
    turbulence and a stereo pan sweep.  Anchor = loudest point (peak * duration) = fastest point of the move."""
    r = _rng(seed, "whoosh")
    T = float(np.clip(duration, 0.25, 4.0))
    n = _n(T)
    b = _clip01(brightness)
    f_lo, f_hi = 380.0 * 2 ** (0.6 * (b - 0.5)), 1500.0 * 2 ** (1.0 * (b - 0.5))

    def glide(tt):
        u = np.clip(tt / T, 0.0, 1.0)
        if direction == "up":
            c = _ss(u)
        elif direction == "down":
            c = 1.0 - _ss(u)
        else:
            c = _bell_u(u, max(peak - 0.06, 0.1), 1.0, 1.0)
        return f_lo * (f_hi / f_lo) ** c

    def mask(tt, ff):
        ff = np.maximum(ff, 20.0)
        air = 0.05 * (0.4 + b) * np.exp(-0.5 * (np.log2(ff / 4200.0) / 0.7) ** 2) * _bell_u(tt / T, peak)
        return np.exp(-0.5 * (np.log2(ff / glide(tt)) / 0.75) ** 2) + air

    x = _tv_noise(r, n, mask, nfft=1024, corr=0.55)
    env = _bell(n, peak, 1.6, 1.3) * (1.0 + 0.10 * _noise(r, n, 4.0, 14.0, 1, 2))
    u = np.arange(n) / n
    traj = {"lr": 2.0 * _ss(u) - 1.0, "rl": 1.0 - 2.0 * _ss(u)}.get(direction, np.zeros(n))
    x = _bal(x, pan + sweep * traj) * env[:, None]
    return _finish(x, "whoosh", peak * T, fin=0.01, fout=0.02)


def specks(duration=1.0, seed=0, density=1.0, brightness=0.5, pan=0.0, spread=0.7, peak=0.22):
    """Fine crumbling / dispersing sprinkle: sparse sand-like grains (very short damped ticks, 2-6.5 kHz,
    a few larger 'crumbs' at 0.9-1.8 kHz), log-normal levels, random pans, density rising quickly then
    thinning out, over a barely audible hiss.  Anchor = start (begin of the dissolve)."""
    r = _rng(seed, "specks")
    T = float(np.clip(duration, 0.2, 6.0))
    nd = _n(T)
    n = nd + _n(0.02)
    b = _clip01(brightness)
    s = _bell(nd, peak, 0.7, 1.8)
    idx = np.nonzero(r.random(nd) < 130.0 * density * s / SR)[0]
    kernels = []
    for k in range(12):
        if k < 2:
            kernels.append((_grain(r.uniform(1000.0, 1800.0), r.uniform(3.0, 5.0)), 0.8))
        else:
            fc = 2000.0 * (6500.0 / 2000.0) ** r.random() * 2 ** (0.6 * (b - 0.5))
            kernels.append((_grain(fc, r.uniform(1.5, 4.0)), (fc / 3000.0) ** 0.5))
    x = np.zeros((n, 2))
    for i in idx:
        k, kg = kernels[int(r.integers(2, 12)) if r.random() > 0.07 else int(r.integers(0, 2))]
        a = kg * min(np.exp(r.normal(0.0, 0.5)), 2.2) * (0.45 + 0.55 * s[i])
        j = min(len(k), n - i)
        x[i:i + j] += _pan(k[:j] * a, pan + spread * r.uniform(-1.0, 1.0))
    x = signal.sosfiltfilt(signal.butter(2, 900.0, "highpass", fs=SR, output="sos"), x, axis=0)
    bed = _noise(r, n, 2200.0, 6500.0, 2, 2, tilt=-3.0, ch=2, corr=0.3)
    x += bed * (np.concatenate([s, np.zeros(n - nd)]) ** 1.2)[:, None] * 0.05
    return _finish(_bal(x, pan * 0.5), "specks", 0.0, fin=0.004, fout=0.03)


def puff(seed=0, duration=0.22, brightness=0.5, pan=0.0):
    """Tiny soft air puff / 'poof' (something vanishing): a breath of mid noise with a soft 12 ms attack,
    a darker body that lingers a little, a whisper of air on top and a faint low plosive.
    Anchor = attack peak."""
    r = _rng(seed, "puff")
    dur = float(np.clip(duration, 0.12, 0.6))
    b = _clip01(brightness)
    k = dur / 0.22
    pre = 0.002
    n = _n(pre + dur)
    v = r.uniform
    x = _burst(r, _ad(n, v(0.009, 0.012), 0.030 * k, pre), 600.0, 2000.0 * 2 ** (0.8 * (b - 0.5)), 2, 2, corr=0.6)
    x += 0.9 * _burst(r, _ad(n, 0.016, 0.052 * k, pre + 0.003), 220.0, 800.0, 2, 2, corr=0.75)
    x += 0.22 * _burst(r, _ad(n, 0.022, 0.065 * k, pre + 0.004), 2200.0, 5200.0, 2, 2, tilt=-3.0, corr=0.4)
    f0 = v(135.0, 165.0)
    x += _pan(0.45 * _chirp(n, lambda t: f0 * (0.62 + 0.38 * np.exp(-t / 0.012)), pre) * _ad(n, 0.006, 0.018, pre), 0.0)
    return _finish(_bal(x, pan), "puff", pre + 0.012, fout=0.03)


def paper(seed=0, duration=0.35, crisp=0.5, pan=0.0, flutters=None):
    """Brief soft paper rustle / flutter: a run of irregular little crackle bursts (1.1-5 kHz, tilted
    dark so it stays soft), a papery low-mid body, and sparse fine crinkle ticks.
    Anchor = first (strongest) burst, 35 ms in."""
    r = _rng(seed, "paper")
    dur = float(np.clip(duration, 0.15, 1.5))
    c = _clip01(crisp)
    n = _n(dur)
    v = r.uniform
    hi = _noise(r, n, 1100.0, 5200.0 * 2 ** (0.7 * (c - 0.5)), 1, 2, tilt=-1.5, ch=2, corr=0.5)
    lo = _noise(r, n, 350.0, 1100.0, 2, 2, ch=2, corr=0.8)
    K = int(flutters) if flutters else max(3, int(round(dur * 14.0 + v(-1.0, 1.0))))
    first = 0.035
    centres = [first]
    span = max(dur * 0.86 - first, 0.02)
    for i in range(1, K):
        centres.append(first + span * (i / max(K - 1, 1)) ** 1.15 * v(0.88, 1.12))
    env = np.zeros(n)
    for i, cc in enumerate(centres):
        amp = 1.0 if i == 0 else v(0.35, 0.9) * (1.0 - 0.55 * cc / dur)
        env += amp * _hann_bump(n, cc, v(0.016, 0.040) if i else 0.05)
    env = env + 0.10 * _bell(n, 0.3, 1.0, 1.5)
    x = hi * env[:, None] + 0.4 * lo * (env ** 1.3)[:, None]
    ticks = np.zeros((n, 2))
    for i in np.nonzero(r.random(n) < 70.0 * env / SR)[0]:
        g = _grain(v(3000.0, 5500.0) * 2 ** (0.5 * (c - 0.5)), v(1.5, 3.0), 0.004)
        j = min(len(g), n - i)
        ticks[i:i + j] += _pan(g[:j] * np.exp(r.normal(0.0, 0.4)), v(-0.6, 0.6))
    x += ticks * (0.5 + 0.9 * c)
    return _finish(_bal(x, pan), "paper", first, fin=0.004, fout=0.03)


def shimmer(duration=1.6, seed=0, brightness=0.5, pan=0.0, peak=0.6, density=1.0, spread=0.7):
    """Gentle airy sparkle / glow rise for light blooming.  NOT melodic: a cloud of soft glimmers (each
    swells in over 40-110 ms, nothing is 'struck') at random inharmonic frequencies (2.2-8 kHz, where
    melodic pitch is weak), denser and slightly higher towards the peak, over a faint breath of air.
    Anchor = peak of the bloom (peak * duration)."""
    r = _rng(seed, "shimmer")
    T = float(np.clip(duration, 0.5, 8.0))
    n = _n(T)
    b = _clip01(brightness)
    glob = _bell(n, peak, 1.4, 1.0)
    N = max(int(round((22.0 * T + 8.0) * density)), 4)
    lim = max(n - _n(0.28), n // 2)
    cdf = np.cumsum(glob[:lim])
    cdf /= cdf[-1]
    starts = np.sort(np.interp((np.arange(N) + r.random(N)) / N, cdf, np.arange(lim))) / SR
    F0 = 4300.0 * 2 ** (0.5 * (b - 0.5))
    x = np.zeros((n, 2))
    for t0 in starts:
        fc = F0 * 2 ** (0.5 * (t0 / T - 0.5))
        f = float(np.clip(fc * 2 ** r.uniform(-0.8, 0.8), 2200.0, 8000.0))
        att, tau = r.uniform(0.040, 0.110), r.uniform(0.05, 0.14)
        ln = min(_n(att + 5.5 * tau), n - int(t0 * SR))
        if ln < 64:
            continue
        g = glob[min(int(t0 * SR), n - 1)] ** 0.5 * 10.0 ** (r.uniform(-7.0, 0.0) / 20.0) * (f / 4000.0) ** -0.8
        tt = np.arange(ln) / SR
        trem = 1.0 + 0.3 * np.sin(2.0 * np.pi * r.uniform(5.0, 11.0) * tt + r.uniform(0, 6.283))
        s = np.sin(2.0 * np.pi * f * tt) * _ad(ln, att, tau) * trem * g
        s *= 0.5 + 0.5 * np.cos(np.pi * np.clip((np.arange(ln) - 0.8 * ln) / (0.2 * ln), 0.0, 1.0))
        i0 = int(t0 * SR)
        x[i0:i0 + ln] += _pan(s, pan + spread * r.uniform(-1.0, 1.0))
    x /= np.sqrt(np.mean(x * x)) + 1e-12
    air = _noise(r, n, 3000.0, 7500.0, 2, 2, tilt=-3.0, ch=2, corr=0.3)
    x += 0.45 * air * (glob ** 1.2)[:, None]
    return _finish(_bal(x, pan * 0.5), "shimmer", peak * T, fin=0.02, fout=0.08)


_COIN_RATIOS = (1.0, 1.729, 2.328)  # free-edge circular plate: (2,0), (0,1), (3,0) -> inharmonic, metallic


def _coin_modes(r, n, t0, f1, t60, bright, attack, damp_hi=0.8, pan=0.0, width=0.12):
    """Coin ring: three inharmonic plate modes, each a slightly split doublet (gentle 5-20 Hz beating, the
    'sweet' shimmer of a real coin); higher modes decay faster; soft raised-cosine attack (no click)."""
    t = np.arange(n) / SR - t0
    on = t >= 0
    tt = t[on]
    out = np.zeros((n, 2))
    tau1 = t60 / 6.91
    amps_db = (0.0, -4.5 + 5.0 * (bright - 0.5), -9.0 + 8.0 * (bright - 0.5))
    for ratio, adb in zip(_COIN_RATIOS, amps_db):
        f = f1 * ratio * (1.0 + r.uniform(-0.006, 0.006))
        if f > 9000.0:
            continue
        tau = tau1 * ratio ** (-damp_hi)
        a = 10.0 ** (adb / 20.0)
        split = f * r.uniform(0.0012, 0.004)
        s = a * np.exp(-tt / tau) * np.sin(2.0 * np.pi * f * tt)
        s += a * r.uniform(0.45, 0.8) * np.exp(-tt / (0.9 * tau)) * np.sin(2.0 * np.pi * (f + split) * tt + r.uniform(0, 6.283))
        s *= np.where(tt < attack, 0.5 - 0.5 * np.cos(np.pi * tt / attack), 1.0)
        out[on] += _pan(s, pan + width * r.uniform(-1.0, 1.0))
    return out


def coin_ting(seed=0, pitch=1.0, duration=0.38, brightness=0.5, pan=0.0, tick=0.06):
    """Small, sweet, short coin ring: modes near 2.7 / 4.7 / 6.3 kHz (x pitch), ring-out (T60) = duration
    (0.25-0.4 s recommended), soft 2.5 ms attack, only a ghost of a contact tick.  Anchor = strike."""
    r = _rng(seed, "coin_ting")
    dur = float(np.clip(duration, 0.15, 0.9))
    pre = 0.002
    n = _n(pre + dur + 0.02)
    f1 = 2700.0 * pitch * (1.0 + r.uniform(-0.03, 0.03))
    x = _coin_modes(r, n, pre, f1, dur, _clip01(brightness), 0.0025, pan=0.0)
    x += tick * _burst(r, _ad(n, 0.0015, 0.0025, pre), 3000.0, 6000.0, 3, 3, corr=0.8)
    return _finish(_bal(x, pan), "coin_ting", pre + 0.002, fout=0.03)


def _thud(r, n, t0, lo, hi, tau, f_low, low_amp, skin=0.3):
    """Muted soft impact: low-mid noise burst + faint skin/contact noise + short falling low sine."""
    x = _burst(r, _ad(n, 0.006, tau, t0), lo, hi, 2, 2, corr=0.85)
    x += skin * _burst(r, _ad(n, 0.004, 0.008, t0), 600.0, 1700.0, 2, 2, corr=0.8)
    low = _chirp(n, lambda t: f_low * (0.74 + 0.26 * np.exp(-t / 0.015)), t0) * _ad(n, 0.007, tau * 1.25, t0)
    return x + _pan(low * low_amp, 0.0)


def coin_land(seed=0, pitch=1.0, brightness=0.4, pan=0.0, softness=0.6):
    """Coin caught in a palm: the ring is choked by the hand (T60 0.10-0.16 s, upper modes strongly
    damped) on top of a muted fleshy thud.  Anchor = contact."""
    r = _rng(seed, "coin_land")
    so = _clip01(softness)
    pre = 0.002
    n = _n(pre + 0.24)
    f1 = 2700.0 * pitch * (1.0 + r.uniform(-0.03, 0.03))
    x = _thud(r, n, pre, 130.0, 620.0, 0.024, r.uniform(108.0, 124.0), 0.6)
    x += (0.50 - 0.20 * so) * _coin_modes(r, n, pre + 0.001, f1, 0.16 - 0.06 * so, _clip01(brightness) - 0.15, 0.004, damp_hi=1.3)
    return _finish(_bal(x, pan), "coin_land", pre + 0.005, fout=0.03)


def coin_drop_in(seed=0, pitch=1.0, bloom=0.5, pan=0.0, warmth=0.5):
    """Coin sinking into something soft, with a warm low bloom: soft thud + faint choked ting, then a
    non-pitched warm swell (low noise band around 85-170 Hz plus a 170-700 Hz band whose top closes as it
    'sinks') that peaks ~0.2 s after the hit and is gone after `bloom` + 0.13 s.  Anchor = the thud."""
    r = _rng(seed, "coin_drop_in")
    bl = float(np.clip(bloom, 0.25, 1.5))
    w = _clip01(warmth)
    pre = 0.002
    n = _n(pre + bl + 0.13)
    f1 = 2700.0 * pitch * (1.0 + r.uniform(-0.03, 0.03))
    x = _thud(r, n, pre, 110.0, 480.0, 0.040, r.uniform(90.0, 100.0), 0.7, skin=0.15)
    x += 0.26 * _coin_modes(r, n, pre + 0.001, f1, 0.22, 0.3, 0.005, damp_hi=1.2)
    nb = n - _n(pre)
    T = nb / SR

    def mask(tt, ff):
        top = 700.0 * (300.0 / 700.0) ** _ss(tt / T)
        return _mag(ff, 170.0, None, 2, 2, tilt=-3.0) / np.sqrt(1.0 + (np.maximum(ff, 1.0) / top) ** 4)

    env = _bell(nb, 0.36, 1.2, 1.5)
    swell = _tv_noise(r, nb, mask, nfft=2048, corr=0.6, norm=False) * (0.30 + 0.25 * (1.0 - w))
    swell += _noise(r, nb, 85.0, 170.0, 2, 2, ch=2, corr=0.95) * (0.35 + 0.4 * w)
    x[n - nb:] += swell * env[:, None] * 0.85
    return _finish(_bal(x, pan), "coin_drop_in", pre + 0.006, fout=0.06)


def wood_knock(seed=0, pitch=1.0, style="set", hardness=0.4, pan=0.0):
    """Small wooden box set down / lid closing - soft and damped.  Modes ~205/370/545/790 Hz (x pitch),
    decays 10-30 ms, felt-soft 2-3 ms attack, a hint of contact noise.
    style 'set' = light corner touch then the firm contact 28-45 ms later; 'lid' = single, slightly higher
    knock with a breath of displaced air; 'single' = one plain knock.  Anchor = the firm contact."""
    r = _rng(seed, "wood_knock")
    h = _clip01(hardness)
    pre = 0.002
    gap = r.uniform(0.028, 0.045) if style == "set" else 0.0
    n = _n(pre + gap + 0.22)
    f = np.array([205.0, 368.0, 545.0, 790.0]) * pitch * (1.0 + r.uniform(-0.05, 0.05, 4))
    taus = np.array([0.030, 0.022, 0.015, 0.010])
    amps = 10.0 ** (np.array([0.0, -2.0, -6.0, -11.0 + 8.0 * (h - 0.4)]) / 20.0)

    def hit(t0, gain, fmul, hard):
        m = _modes(n, f * fmul, amps, taus, t0, attack=0.0032 - 0.0016 * hard)
        c = _burst(r, _ad(n, 0.002, 0.005, t0), 500.0, 1500.0 + 2200.0 * hard, 2, 3, corr=0.8)
        return gain * (_pan(m, 0.0) + (0.10 + 0.30 * hard) * c)

    if style == "set":
        x = hit(pre, 0.42, 1.07, h * 0.7) + hit(pre + gap, 1.0, 1.0, h)
    elif style == "lid":
        x = hit(pre, 1.0, 1.12, min(h + 0.1, 1.0))
        x += 0.15 * _burst(r, _ad(n, 0.008, 0.020, pre), 300.0, 1200.0, 2, 2, corr=0.6)
    else:
        x = hit(pre, 1.0, 1.0, h)
    return _finish(_bal(x, pan), "wood_knock", pre + gap + 0.003, fout=0.03)


def cloth_unroll(duration=0.9, seed=0, brightness=0.5, pan=0.0, sweep=0.3, flap=1.0):
    """Soft fabric unrolling: a 'shhh' that builds and brightens slightly as the roll speeds up
    (1.1 -> 2.1 kHz centre, gentle irregular flutter), a short breath, then a soft 'fwup' flap as the end
    lands (low-mid noise + displaced air + faint low bump).  `duration` = length of the swish;
    Anchor = the flap (the sound starts `duration` earlier)."""
    r = _rng(seed, "cloth_unroll")
    T = float(np.clip(duration, 0.3, 4.0))
    b = _clip01(brightness)
    n = _n(T + 0.17)
    u = np.arange(n) / SR / T

    def mask(tt, ff):
        fc = 1100.0 * (1.9 * 2 ** (0.8 * (b - 0.5))) ** _ss(tt / T)
        return np.exp(-0.5 * (np.log2(np.maximum(ff, 20.0) / fc) / 0.9) ** 2)

    sw = _tv_noise(r, n, mask, nfft=1024, corr=0.55)
    es = np.clip(u, 0.0, 1.0) ** 1.5 * (1.0 - 0.85 * _ss((u - 0.90) / 0.09)) * (1.0 - _ss((u - 1.0) / 0.08))
    es *= np.clip(1.0 + 0.28 * _noise(r, n, 9.0, 24.0, 1, 2), 0.3, 1.8)
    x = _bal(sw, sweep * (2.0 * np.clip(u, 0.0, 1.0) - 1.0) * 0.5) * (es * 0.62)[:, None]
    fl = _burst(r, _ad(n, 0.012, 0.050, T - 0.006), 140.0, 850.0, 2, 2, corr=0.8)
    fl += 0.35 * _burst(r, _ad(n, 0.008, 0.028, T - 0.004), 700.0, 2600.0, 2, 2, corr=0.6)
    fl += _pan(0.45 * _chirp(n, lambda t: 64.0 + 24.0 * np.exp(-t / 0.02), T - 0.006) * _ad(n, 0.012, 0.045, T - 0.006), 0.0)
    x += _bal(fl, sweep * 0.5) * flap
    return _finish(_bal(x, pan), "cloth_unroll", T + 0.004, fin=0.02, fout=0.04)


def rise(duration=2.4, seed=0, brightness=0.5, pan=0.0, peak=0.7, air=0.5, bed=0.5):
    """Broad, warm, non-pitched swell for the final moment: pink-ish noise through a low-pass that opens
    (260 Hz -> ~2 kHz) towards the peak and closes again, a breath of air near the top, over a very low
    sine bed (55->60 Hz and a non-harmonic 91 Hz partner).  Slow build, soft landing (the last 30 %).
    Anchor = the peak (peak * duration)."""
    r = _rng(seed, "rise")
    T = float(np.clip(duration, 0.8, 10.0))
    n = _n(T)
    b = _clip01(brightness)
    top = 2000.0 * 2 ** (b - 0.5)

    def mask(tt, ff):
        ff = np.maximum(ff, 1.0)
        open_ = _bell_u(tt / T, max(peak - 0.03, 0.1), 1.5, 1.0)
        fc = 260.0 * (top / 260.0) ** open_
        m = _mag(ff, 70.0, None, 2, 2, tilt=-3.0, ref=300.0) / np.sqrt(1.0 + (ff / fc) ** 4)
        return m + 0.035 * air * np.exp(-0.5 * (np.log2(ff / 4200.0) / 0.8) ** 2) * open_ ** 2

    x = _tv_noise(r, n, mask, nfft=4096, corr=0.45, norm=False) * _bell(n, peak, 2.2, 1.3)[:, None]
    t = np.arange(n) / SR
    e_bed = _bell(n, min(peak + 0.02, 0.95), 1.8, 1.4)
    low = np.sin(2.0 * np.pi * (55.0 * t + 2.5 * t * t / T)) + 0.5 * np.sin(2.0 * np.pi * 91.0 * t + 1.3)
    x += _pan(low * e_bed * 0.55 * bed, 0.0)
    return _finish(_bal(x, pan), "rise", peak * T, fin=0.05, fout=0.15)


def pop(seed=0, pitch=1.0, pan=0.0, softness=0.6):
    """Tiny soft bubbly pop (small things appearing, e.g. flowers): a 430-760 Hz blip whose pitch
    blooms upward by ~55 % in 20 ms (bubble 'bloop'), 15-24 ms decay, soft 4-6 ms attack and a ghost of
    a lip puff.  Pitch is random per seed and off any scale, so runs of pops never sound like a tune.
    Anchor = onset."""
    r = _rng(seed, "pop")
    so = _clip01(softness)
    pre = 0.002
    n = _n(pre + 0.11)
    f0 = r.uniform(430.0, 760.0) * pitch
    tau = r.uniform(0.015, 0.024)
    env = _ad(n, 0.003 + 0.004 * so, tau, pre)
    s = _chirp(n, lambda t: f0 * (1.0 + 0.55 * (1.0 - np.exp(-t / 0.018))), pre) * env
    s += 0.10 * _chirp(n, lambda t: 2.07 * f0 * (1.0 + 0.55 * (1.0 - np.exp(-t / 0.018))), pre) * env ** 1.5
    x = _pan(s, 0.0)
    x += (0.16 - 0.08 * so) * _burst(r, _ad(n, 0.003, 0.006, pre), 900.0, 2800.0, 2, 2, corr=0.7)
    return _finish(_bal(x, pan), "pop", pre + 0.004, level=LEVELS["pop"] + r.uniform(-0.8, 0.8), fout=0.02)


def pop_flurry(n=5, duration=0.6, seed=0, shape="even", fall_db=3.0, pan=0.0, spread=0.6, times=None,
               jitter=0.3, softness=0.6):
    """A loose run of n little pops (a cluster of flowers appearing).  Same scheduling rules as
    dab_flurry (`times` to lock to animation).  Anchor = first pop."""
    def kw(r, i, m):
        return dict(softness=softness, pitch=2 ** r.uniform(-0.25, 0.25))
    return _flurry("pop_flurry", pop, n, duration, seed, shape, fall_db, pan, spread, times, jitter, 1.5, kw=kw)


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


def book_slide(seed=0, duration=0.5, pan=0.0, settle=1.0, brightness=0.4, sweep=0.2):
    """A book pushed into place on a wooden shelf: dull leather-on-wood friction (centre 0.5-1.4 kHz
    following the speed, fine stick-slip grain) that starts quickly and decelerates, then a tiny soft
    settle (shelf modes ~150/260/410 Hz, 12-30 ms decays).  `duration` = length of the slide;
    Anchor = the settle (the slide starts `duration` + 16 ms earlier)."""
    r = _rng(seed, "book_slide")
    T = float(np.clip(duration, 0.2, 3.0))
    b = _clip01(brightness)
    n = _n(T + 0.16)
    tS = T + 0.012
    u = np.arange(n) / SR / T

    def speed(uu):
        return _bell_u(uu, 0.3, 1.0, 1.4)

    def mask(tt, ff):
        ff = np.maximum(ff, 20.0)
        fc = (520.0 + 900.0 * speed(tt / T)) * 2 ** (b - 0.4)
        return np.exp(-0.5 * (np.log2(ff / fc) / 1.0) ** 2) + 0.35 * np.exp(-0.5 * (np.log2(ff / 190.0) / 0.5) ** 2)

    env = speed(u) ** 0.8 * np.clip(1.0 + 0.38 * _noise(r, n, 25.0, 70.0, 1, 2), 0.2, 2.0)
    x = _tv_noise(r, n, mask, nfft=1024, corr=0.6) * (env * 0.5)[:, None]
    x = _bal(x, sweep * (np.clip(u, 0.0, 1.0) - 0.5))
    fs = np.array([150.0, 262.0, 410.0]) * (1.0 + r.uniform(-0.05, 0.05, 3))
    st = _pan(_modes(n, fs, 10.0 ** (np.array([0.0, -4.0, -9.0]) / 20.0), [0.030, 0.020, 0.012], tS, attack=0.004), 0.0)
    st += 0.25 * _burst(r, _ad(n, 0.004, 0.010, tS), 300.0, 1200.0, 2, 2, corr=0.8)
    x += _bal(st, sweep * 0.5) * 0.8 * settle
    return _finish(_bal(x, pan), "book_slide", tS + 0.004, fin=0.02, fout=0.03)


# ----------------------------------------------------------------------------------------------------------
# registry
# ----------------------------------------------------------------------------------------------------------
SOUNDS = {
    "dab": dab, "dab_flurry": dab_flurry, "whoosh": whoosh, "specks": specks, "puff": puff, "paper": paper,
    "shimmer": shimmer, "coin_ting": coin_ting, "coin_land": coin_land, "coin_drop_in": coin_drop_in,
    "wood_knock": wood_knock, "cloth_unroll": cloth_unroll, "rise": rise, "pop": pop, "pop_flurry": pop_flurry,
    "room_tone": room_tone, "book_slide": book_slide,
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
        lvl = LEVELS.get(name, LEVELS.get(name.replace("_flurry", ""), 0.0))
        print("%-13s LK100 %6.1f  %s" % (name, lvl, str(inspect.signature(fn))))


if __name__ == "__main__":
    if "--list" in sys.argv:
        list_sounds()
    else:
        render_demo(sys.argv[1] if len(sys.argv) > 1 else None)
