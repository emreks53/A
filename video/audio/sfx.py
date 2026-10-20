"""sfx.py - deterministic, physically-motivated procedural sound synthesis.

48 kHz, stereo float32.  No samples, no music: every sound is synthesised from noise, impulses
and physical models (Minnaert bubbles, modal resonators, stick-slip friction, Poisson impact
fields, spectrally-shaped turbulence).  Nothing here is melodic or harmonic in the musical
sense; the only resonant sources are the ones the depicted world itself makes (bubbles, a glass,
birds' single calls, a bee's wings) and they are short and randomised.

Every generator has the signature   gen(dur, rng, **params) -> np.ndarray (n, 2) float32
and is registered in GEN.  `rng` is a numpy Generator (use rng_for(cue_id) for determinism).
Parameters that vary over time accept either a scalar or a breakpoint list [[t, v], ...]
(seconds relative to the start of the cue, cosine-interpolated).  Generators that have one
main event take `sync` = time of the event inside the cue.

Building blocks (all public): shaped_noise / tv_filter (STFT-domain spectral shaping),
bubble / add_bubbles (van den Doel's Minnaert-bubble model), modal (damped inharmonic partials),
crackle_env (Poisson micro-event envelopes), click_field, pan2/add_mono, rand_curve, bpc.
"""
from __future__ import annotations

import zlib
import numpy as np
from scipy import signal

SR = 48000
TWO_PI = 2.0 * np.pi


# ============================================================================ basics
def N(sec):
    return max(0, int(round(float(sec) * SR)))


def db(x):
    return 10.0 ** (np.asarray(x, dtype=float) / 20.0)


def rng_for(*keys):
    return np.random.default_rng(zlib.crc32(repr(keys).encode("utf-8")))


def tvec(n):
    return np.arange(n) / SR


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def bpc(points, default=0.0):
    """Breakpoint curve -> f(t). points: scalar, None or [[t, v], ...] (cosine interpolation)."""
    if points is None:
        return lambda t: np.full(np.shape(t), float(default))
    if np.isscalar(points):
        v = float(points)
        return lambda t: np.full(np.shape(t), v)
    P = np.asarray(points, dtype=float)
    ts, vs = P[:, 0], P[:, 1]
    if len(ts) == 1:
        return lambda t: np.full(np.shape(t), vs[0])

    def f(t):
        t = np.asarray(t, dtype=float)
        i = np.clip(np.searchsorted(ts, t, side="right") - 1, 0, len(ts) - 2)
        t0, t1 = ts[i], ts[i + 1]
        u = np.clip((t - t0) / np.maximum(t1 - t0, 1e-9), 0.0, 1.0)
        u = 0.5 - 0.5 * np.cos(np.pi * u)
        y = vs[i] + (vs[i + 1] - vs[i]) * u
        return np.where(t <= ts[0], vs[0], np.where(t >= ts[-1], vs[-1], y))
    return f


def rand_curve(dur, rng, cutoff, ctrl_sr=100.0):
    """Smooth band-limited random curve (zero mean, unit std) -> f(t)."""
    n = int(dur * ctrl_sr) + 4
    pad = int(ctrl_sr / max(cutoff, 1e-3) * 4) + 16
    w = rng.standard_normal(n + 2 * pad)
    sos = signal.butter(2, min(cutoff / (ctrl_sr / 2), 0.99), output="sos")
    y = signal.sosfiltfilt(sos, w)
    y = (y - y.mean()) / (y.std() + 1e-12)
    y = y[pad:pad + n]
    tc = np.arange(n) / ctrl_sr
    return lambda t: np.interp(t, tc, y)


def _pg(p):
    p = np.clip(p, -1.0, 1.0)
    th = (p + 1.0) * np.pi / 4.0
    return np.cos(th), np.sin(th)


def pan2(x, p=0.0):
    """Equal-power pan of mono x; p scalar or per-sample array in [-1, 1]."""
    gl, gr = _pg(p)
    return np.stack([x * gl, x * gr], axis=1)


def add_mono(buf, x, i0, p=0.0, g=1.0):
    n = len(x)
    a, b = max(i0, 0), min(i0 + n, len(buf))
    if a >= b:
        return
    gl, gr = _pg(p)
    seg = x[a - i0:b - i0] * g
    buf[a:b, 0] += gl * seg
    buf[a:b, 1] += gr * seg


def add_st(buf, y, i0, g=1.0):
    n = len(y)
    a, b = max(i0, 0), min(i0 + n, len(buf))
    if a < b:
        buf[a:b] += y[a - i0:b - i0] * g


def ms(a, b, width):
    """Two independent signals -> stereo with given width (0 = mono, 1 = fully decorrelated)."""
    m = a
    s = b * width
    k = 1.0 / np.sqrt(1.0 + width * width)
    return np.stack([(m + s) * k, (m - s) * k], axis=1)


def fade(y, fin=0.005, fout=0.005):
    y = y.copy()
    n = len(y)
    a, b = min(N(fin), n), min(N(fout), n)
    if a > 1:
        w = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
        y[:a] *= w[:, None] if y.ndim == 2 else w
    if b > 1:
        w = np.cos(np.linspace(0, np.pi / 2, b)) ** 2
        y[n - b:] *= w[:, None] if y.ndim == 2 else w
    return y


def out(y):
    y = np.asarray(y, dtype=np.float64)
    if y.ndim == 1:
        y = pan2(y, 0.0)
    y = np.nan_to_num(y)
    return y.astype(np.float32)


def sumv(*parts):
    """Sum 1-D arrays of different lengths (aligned at 0). parts: arrays or (array, offset_samples)."""
    L = 0
    for p in parts:
        a, o = (p if isinstance(p, tuple) else (p, 0))
        L = max(L, o + len(a))
    y = np.zeros(L)
    for p in parts:
        a, o = (p if isinstance(p, tuple) else (p, 0))
        y[o:o + len(a)] += a
    return y


def fit(y, n):
    """Pad/trim (n, ...) array to n rows."""
    if len(y) >= n:
        return y[:n]
    padw = [(0, n - len(y))] + [(0, 0)] * (y.ndim - 1)
    return np.pad(y, padw)


# ============================================================================ filters
_SOS = {}


def _sos(kind, f, order):
    key = (kind, f if np.isscalar(f) else tuple(f), order)
    if key not in _SOS:
        if np.isscalar(f):
            ff = float(np.clip(f, 5.0, SR * 0.47))
        else:
            ff = (float(np.clip(f[0], 5.0, SR * 0.46)), float(np.clip(f[1], 6.0, SR * 0.47)))
        _SOS[key] = signal.butter(order, ff, btype=kind, fs=SR, output="sos")
    return _SOS[key]


def lp(x, f, order=2):
    return signal.sosfilt(_sos("lowpass", f, order), x, axis=0)


def hp(x, f, order=2):
    return signal.sosfilt(_sos("highpass", f, order), x, axis=0)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(_sos("bandpass", (lo, hi), order), x, axis=0)


def reson(x, f, q):
    """RBJ band-pass (0 dB peak) - a damped resonance excited by x."""
    w0 = TWO_PI * min(f, SR * 0.47) / SR
    al = np.sin(w0) / (2 * q)
    b = np.array([al, 0.0, -al])
    a = np.array([1 + al, -2 * np.cos(w0), 1 - al])
    return signal.lfilter(b / a[0], a / a[0], x, axis=0)


def peaking(x, f, gain_db, q):
    A = 10 ** (gain_db / 40)
    w0 = TWO_PI * f / SR
    al = np.sin(w0) / (2 * q)
    b = np.array([1 + al * A, -2 * np.cos(w0), 1 - al * A])
    a = np.array([1 + al / A, -2 * np.cos(w0), 1 - al / A])
    return signal.lfilter(b / a[0], a / a[0], x, axis=0)


def onepole_env(x, tau):
    """Leaky integrator (exponential decay kernel) - used to turn impulse trains into envelopes."""
    a = np.exp(-1.0 / (tau * SR))
    return signal.lfilter([1.0 - a], [1.0, -a], x, axis=0)


# ============================================================================ STFT shaping
NFFT, HOP = 2048, 512
_W = np.sqrt(0.5 - 0.5 * np.cos(TWO_PI * np.arange(NFFT) / NFFT))
FREQS = np.fft.rfftfreq(NFFT, 1.0 / SR)
_FQ = np.maximum(FREQS, 1.0)


def stft(x):
    xp = np.concatenate([np.zeros(NFFT), np.asarray(x, dtype=np.float64), np.zeros(NFFT)])
    fr = np.lib.stride_tricks.sliding_window_view(xp, NFFT)[::HOP]
    return np.fft.rfft(fr * _W, axis=1)


def istft(X, n):
    fr = np.fft.irfft(X, n=NFFT, axis=1) * _W
    nfr = fr.shape[0]
    o = np.zeros((nfr + NFFT // HOP) * HOP)
    for j in range(NFFT // HOP):
        seg = fr[:, j * HOP:(j + 1) * HOP].reshape(-1)
        o[j * HOP:j * HOP + seg.size] += seg
    return o[NFFT:NFFT + n] * 0.5


def frame_times(nfr):
    return (np.arange(nfr) * HOP - NFFT / 2) / SR


def tv_filter(x, mag_fn):
    """Time-varying spectral filter: mag_fn(T[:,None], F[None,:]) -> linear gain."""
    X = stft(x)
    T = frame_times(X.shape[0])[:, None]
    return istft(X * mag_fn(T, _FQ[None, :]), len(x))


def shaped_noise(n, mag_fn, rng):
    return tv_filter(rng.standard_normal(n), mag_fn)


# spectral shape helpers (magnitudes, broadcastable)
def m_lp(F, fc, order=2):
    return 1.0 / np.sqrt(1.0 + (F / np.maximum(fc, 1.0)) ** (2 * order))


def m_hp(F, fc, order=2):
    r = (F / np.maximum(fc, 1.0)) ** (2 * order)
    return np.sqrt(r / (1.0 + r))


def m_bump(F, fc, gain_db, oct_sigma):
    return 10 ** (np.asarray(gain_db) / 20.0 * np.exp(-0.5 * (np.log2(F / np.maximum(fc, 1.0)) / oct_sigma) ** 2))


def m_tilt(F, db_per_oct, f0=1000.0):
    return (F / f0) ** (db_per_oct / 6.0206)


# ============================================================================ noise colours
def pink(n, rng):
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1.0 / SR)
    f[0] = f[1]
    y = np.fft.irfft(X / np.sqrt(f / 1000.0), n)
    return y / (y.std() + 1e-12)


def brown(n, rng, hp_f=20.0):
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1.0 / SR)
    f[0] = f[1]
    y = np.fft.irfft(X / (f / 100.0), n)
    y = hp(y, hp_f, 2)
    return y / (y.std() + 1e-12)


# ============================================================================ events & grains
def poisson_times(dur, rate_fn, rmax, rng, t0=0.0):
    rmax = max(float(rmax), 1e-9)
    k = rng.poisson(rmax * dur)
    t = np.sort(rng.uniform(t0, t0 + dur, k))
    keep = rng.uniform(0, rmax, k) < rate_fn(t)
    return t[keep]


def burst(rng, dur, tau, attack=0.0005, lo=None, hi=None, order=2):
    """Exponentially decaying noise burst, optionally band-limited."""
    n = max(N(dur), 8)
    t = tvec(n)
    e = np.exp(-t / tau) * (1.0 - np.exp(-t / max(attack, 1e-5)))
    x = rng.standard_normal(n) * e
    if lo and hi:
        x = bp(x, lo, hi, order)
    elif lo:
        x = hp(x, lo, order)
    elif hi:
        x = lp(x, hi, order)
    return x


def modal(rng, freqs, decays, amps, dur, detune=0.0, phase_rand=True):
    """Sum of exponentially damped partials (decays = T60 seconds). detune (Hz) adds a beating twin."""
    n = N(dur)
    t = tvec(n)
    y = np.zeros(n)
    for f, d, a in zip(freqs, decays, amps):
        if f >= SR * 0.45:
            continue
        k = 6.91 / max(d, 1e-3)
        ph = rng.uniform(0, TWO_PI) if phase_rand else 0.0
        y += a * np.exp(-k * t) * np.sin(TWO_PI * f * t + ph)
        if detune:
            df = rng.uniform(0.3, 1.0) * detune
            y += 0.6 * a * np.exp(-k * 1.1 * t) * np.sin(TWO_PI * (f + df) * t + ph + rng.uniform(0, TWO_PI))
    return y


def crackle_env(n, rng, rate, tau=0.004, sigma=0.9, rmax=None):
    """Envelope made of Poisson micro-events (heavy-tailed amplitudes) - friction/crumple texture.
    rate: scalar or per-sample array (events per second)."""
    rate = np.broadcast_to(np.asarray(rate, dtype=float), (n,))
    rmax = rmax or max(rate.max(), 1e-6)
    k = rng.poisson(rmax * n / SR)
    idx = rng.integers(0, n, k)
    keep = rng.uniform(0, rmax, k) < rate[idx]
    idx = idx[keep]
    imp = np.zeros(n)
    np.add.at(imp, idx, rng.lognormal(0.0, sigma, len(idx)))
    return onepole_env(imp, tau) * (tau * SR) ** 0.5


def click_field(n, rng, rate, lo, hi, sigma=1.0, order=2, rmax=None, clip_q=None):
    """Dense field of tiny clicks: Poisson impulse train through a band-pass.  clip_q (e.g. 0.99)
    caps the heavy-tailed grain amplitudes at that quantile so no single grain becomes a click."""
    rate = np.broadcast_to(np.asarray(rate, dtype=float), (n,))
    rmax = rmax or max(rate.max(), 1e-6)
    k = rng.poisson(rmax * n / SR)
    idx = rng.integers(0, n, k)
    keep = rng.uniform(0, rmax, k) < rate[idx]
    idx = idx[keep]
    imp = np.zeros(n)
    amp = rng.lognormal(0, sigma, len(idx))
    if clip_q is not None and len(amp):
        amp = np.minimum(amp, np.quantile(amp, clip_q))
    np.add.at(imp, idx, amp * rng.choice([-1.0, 1.0], len(idx)))
    return bp(imp, lo, hi, order)


# ============================================================================ physical models
def bubble(r, rng, xi=0.1, damp=1.0, maxdur=0.35):
    """Minnaert bubble (van den Doel 2005): f0 ~ 3/r Hz (r in m), damping d ~ .13 f + .0072 f^1.5,
    frequency rising as f(t) = f0 (1 + xi d t) (bubble nearing the surface / shape change)."""
    f0 = min(3.0 / r, 16000.0)
    # van den Doel's fit, scaled by 0.45 to match Devin's measured total damping (Q ~ 10-15)
    d = (0.13 * f0 + 0.0072 * f0 ** 1.5) * 0.45 * damp
    T = min(maxdur, 7.0 / d)
    n = max(N(T), 16)
    t = tvec(n)
    f = np.minimum(f0 * (1.0 + xi * d * t), 20000.0)
    ph = TWO_PI * np.cumsum(f) / SR
    onset = 1.0 - np.exp(-t * f0 * 3.0)        # pinch-off is fast but not a step
    return np.sin(ph) * np.exp(-d * t) * onset


def powerlaw_radii(rng, k, rmin, rmax, beta):
    u = rng.uniform(0, 1, k)
    a, b = rmin ** (1 - beta), rmax ** (1 - beta)
    return (a + u * (b - a)) ** (1.0 / (1 - beta))


def add_bubbles(buf, times, radii, rng, pans=0.0, gain=1.0, xi=(0.05, 0.2), damp=1.0, amp_exp=1.0,
                gains=None):
    pans = np.broadcast_to(np.asarray(pans, dtype=float), (len(times),))
    for i, (t, r) in enumerate(zip(times, radii)):
        b = bubble(r, rng, xi=rng.uniform(*xi), damp=damp)
        a = gain * (r / 1e-3) ** amp_exp * rng.lognormal(0, 0.35)
        if gains is not None:
            a *= gains[i]
        add_mono(buf, b, N(t), pans[i], a)


def _syrinx(rng, dur, fcurve, h2=0.12, h3=0.04, breath=0.25, jit=0.015, attack=0.15, decay_pow=1.8,
            am=0.0, am_rate=0.0, onset=0.35):
    """One syllable of a songbird call: a fast FM sweep from the syrinx (instantaneous frequency
    fcurve(u), u = 0..1) with micro-FM jitter, a weak 2nd/3rd harmonic whose balance drifts (the two
    sides of the syrinx), breathy narrow-band noise riding on the carrier, an optional fast AM
    flutter, an asymmetric envelope and a short noisy onset (beak opening)."""
    n = max(N(dur), 24)
    u = np.linspace(0.0, 1.0, n)
    tt = np.arange(n) / SR
    f = fcurve(u)
    j = lp(rng.standard_normal(n + 512), 260, 2)[256:256 + n]
    f = f * (1.0 + jit * j / (np.std(j) + 1e-12))
    ph = TWO_PI * np.cumsum(f) / SR + rng.uniform(0, TWO_PI)
    a = max(attack * rng.uniform(0.7, 1.3), 0.03)
    env = np.where(u < a, (u / a) ** 1.6, np.clip((1 - u) / (1 - a), 0, 1) ** (decay_pow * rng.uniform(0.8, 1.25)))
    env *= 1.0 + 0.25 * lp(rng.standard_normal(n), 120, 1) * 3
    env = np.clip(env, 0, None)
    if am:
        env = env * (1.0 - am * (0.5 + 0.5 * np.sin(TWO_PI * am_rate * tt + rng.uniform(0, TWO_PI))))
    k2 = h2 * (1 + 0.6 * lp(rng.standard_normal(n), 60, 1) * 4)
    y = np.sin(ph) + k2 * np.sin(2 * ph + rng.uniform(0, TWO_PI)) + h3 * np.sin(3 * ph + rng.uniform(0, TWO_PI))
    br = lp(rng.standard_normal(n), 420, 2)
    y = y + breath * np.sin(ph + 0.7) * br / (np.std(br) + 1e-12)
    y = y * env
    # noisy onset: 2-5 ms band of noise around the starting frequency
    m = min(N(rng.uniform(0.002, 0.005)), n)
    nz = reson(rng.standard_normal(m + 64), float(np.clip(f[0], 800, 15000)), 2.5)[:m]
    y[:m] += onset * nz / (np.abs(nz).max() + 1e-12) * np.linspace(1, 0, m) ** 2
    return y


def bird_call(rng, kind, fb):
    """One natural call of a small songbird (all syllables are fast FM sweeps, < 0.1 s each, so
    nothing is a sustained tone). kinds: tsip | chip | chirp_up | trill | chatter | twitter."""
    if kind == "tsip":        # thin high down-slur
        d = rng.uniform(0.03, 0.06)
        a, b = rng.uniform(1.18, 1.38), rng.uniform(0.72, 0.86)
        p = rng.uniform(0.6, 1.4)
        return _syrinx(rng, d, lambda u: fb * (a + (b - a) * u ** p), h2=0.08, breath=0.3, attack=0.12)
    if kind == "chip":        # very short, steep, broadband down-sweep
        d = rng.uniform(0.012, 0.024)
        a, b = rng.uniform(1.35, 1.6), rng.uniform(0.62, 0.78)
        return _syrinx(rng, d, lambda u: fb * (a + (b - a) * u ** 0.7), h2=0.2, h3=0.08, breath=0.35,
                       attack=0.2, decay_pow=1.3, onset=0.5)
    if kind == "chirp_up":    # rising slur with a small overshoot and drop at the end
        d = rng.uniform(0.045, 0.085)
        a = rng.uniform(0.62, 0.78)
        return _syrinx(rng, d, lambda u: fb * (a + (1.12 - a) * np.sin(0.5 * np.pi * np.clip(u * 1.15, 0, 1))
                                               - 0.08 * np.clip(u - 0.85, 0, None) / 0.15),
                       h2=0.14, breath=0.3, attack=0.35, decay_pow=2.2)
    if kind == "trill":       # rapid train of down-swept elements, each slightly different
        k = int(rng.integers(5, 11))
        rate = rng.uniform(14, 22)
        n = N(k / rate + 0.06)
        y = np.zeros(n)
        for jx in range(k):
            fe = fb * (1 + 0.05 * rng.standard_normal()) * (1 - 0.015 * jx)
            a, b = rng.uniform(1.25, 1.45), rng.uniform(0.7, 0.82)
            c = _syrinx(rng, rng.uniform(0.014, 0.026), lambda u, fe=fe, a=a, b=b: fe * (a + (b - a) * u),
                        h2=0.15, breath=0.35, attack=0.2, decay_pow=1.4, onset=0.4)
            c = c * (0.55 + 0.45 * np.sin(np.pi * (jx + 0.5) / k)) * rng.uniform(0.75, 1.0)
            i0 = N(jx / rate * (1 + 0.05 * rng.standard_normal()))
            mm = min(len(c), n - i0)
            if mm > 0:
                y[i0:i0 + mm] += c[:mm]
        return y
    if kind == "chatter":     # sparrow-like buzzy 'chirrup' notes: up-down contour, AM flutter, rich
        k = int(rng.integers(2, 5))
        segs = []
        for _ in range(k):
            fe = fb * rng.uniform(0.55, 0.75)
            d = rng.uniform(0.04, 0.075)
            pk = rng.uniform(0.3, 0.5)
            c = _syrinx(rng, d, lambda u, fe=fe, pk=pk: fe * (0.8 + 0.45 * np.exp(-0.5 * ((u - pk) / 0.22) ** 2) - 0.12 * u),
                        h2=0.35, h3=0.15, breath=0.45, attack=0.25, decay_pow=1.5,
                        am=rng.uniform(0.35, 0.6), am_rate=rng.uniform(110, 240), onset=0.45)
            segs.append(c * rng.uniform(0.7, 1.0))
            segs.append(np.zeros(N(rng.uniform(0.04, 0.09))))
        return np.concatenate(segs)
    if kind == "twitter":     # irregular burst of varied short elements (no repeated pitch pattern)
        k = int(rng.integers(3, 7))
        segs = []
        for _ in range(k):
            sub = ["chip", "tsip", "chirp_up"][int(rng.integers(3))]
            segs.append(bird_call(rng, sub, fb * rng.uniform(0.8, 1.25)) * rng.uniform(0.5, 1.0))
            segs.append(np.zeros(N(rng.uniform(0.025, 0.07))))
        return np.concatenate(segs)
    raise ValueError(kind)


def thump(rng, fc, tau, body_f=None, body=0.5, knock=0.15, dur=None):
    """Noise-excited low resonance (heart sound / soft heavy contact). Not a tone: Q ~ 1.5."""
    dur = dur or tau * 8 + 0.05
    x = burst(rng, dur, tau, attack=0.003)
    y = reson(x, fc, 1.4)
    if body_f:
        y = y + body * reson(x, body_f, 1.3)
    if knock:
        y = y + knock * lp(x, 700, 2)
    return y / (np.abs(y).max() + 1e-12)        # consistent level: the noise excitation is random


# ============================================================================ helpers for beds
def gust_curve(dur, rng, rate=0.08, gustiness=0.5, bias=0.0, events=None):
    """Wind strength 0..1 : slow OU-like gusts + optional scripted swells [[t, amount, width_s]]."""
    c1 = rand_curve(dur + 1, rng, rate)
    c2 = rand_curve(dur + 1, rng, rate * 4)
    ev = events or []

    def g(t):
        t = np.asarray(t, dtype=float)
        z = gustiness * (0.8 * c1(t) + 0.45 * c2(t)) + bias
        for (te, a, w) in ev:
            z = z + a * np.exp(-0.5 * ((t - te) / max(w, 1e-3)) ** 2)
        return 1.0 / (1.0 + np.exp(-2.2 * z))
    return g


def _wind_layer(n, rng, g, strength, bright, hollow, low):
    def mag(T, F):
        G = g(T)
        fc = (300.0 + 1800.0 * G ** 1.4) * bright
        a = (0.12 + G) ** 1.6 * strength
        body = m_hp(F, 90 if not hollow else 65, 2) * m_lp(F, fc, 1.5) * m_tilt(F, -0.5, 500)
        rumble = low * (G ** 2) * m_lp(F, 110, 3) * 2.5
        sh = 1.0
        if hollow:
            sh = m_bump(F, 330, 6 * hollow, 0.45) * m_bump(F, 900, 3 * hollow, 0.5) * m_lp(F, 2500, 1)
        return a * (body * sh + rumble)
    return shaped_noise(n, mag, rng)


def _veg_layer(n, rng, g, lo, hi, density, lag_t=0.25):
    t = tvec(n)
    G = g(t - lag_t)
    base = bp(rng.standard_normal(n), lo, hi, 2)
    env = 0.25 * G + 0.75 * crackle_env(n, rng, 60 + 900 * density * G ** 1.5, tau=0.006, sigma=0.8) * G
    return base * env


# ============================================================================ generators: beds
def gen_room_tone(dur, rng, warmth=1.0, bright=1.0, width=0.7):
    n = N(dur)
    mod = rand_curve(dur, rng, 0.12)

    def mag(T, F):
        return (m_hp(F, 45, 2) * m_tilt(F, -3.0, 150) * m_bump(F, 140, 4 * warmth, 0.9)
                * m_lp(F, 5000 * bright, 1) * db(0.8 * mod(T)))
    return out(ms(shaped_noise(n, mag, rng), shaped_noise(n, mag, rng), width))


def gen_wind(dur, rng, strength=1.0, gustiness=0.6, rate=0.08, bias=0.0, bright=1.0, hollow=0.0,
             low=0.12, width=0.9, veg=0.0, veg_lo=1800, veg_hi=9000, veg_density=1.0, events=None,
             lag=0.6):
    """Outdoor wind: two decorrelated channels with the same gusts arriving with a small lag,
    plus (optional) vegetation rustle driven by the gusts."""
    n = N(dur)
    g = gust_curve(dur + lag + 1, rng, rate, gustiness, bias, events)
    gl = lambda t: g(np.asarray(t) + lag * 0.5)
    gr = lambda t: g(np.asarray(t) + 0.0)
    L = _wind_layer(n, rng, gl, strength, bright, hollow, low)
    R = _wind_layer(n, rng, gr, strength, bright, hollow, low)
    m = 0.5 * (L + R)
    y = np.stack([m + (L - m) * width, m + (R - m) * width], axis=1)
    if veg:
        vl = _veg_layer(n, rng, gl, veg_lo, veg_hi, veg_density)
        vr = _veg_layer(n, rng, gr, veg_lo, veg_hi, veg_density)
        k = veg * np.std(y) / (np.std(vl) + 1e-12) * 0.6
        y = y + k * np.stack([vl, vr], axis=1)
    return out(y)


def gen_birds(dur, rng, n_birds=4, rate=0.18, dist=(0.6, 1.0), fmin=2500.0, fmax=6500.0, kinds=None,
              width=0.85, bout=(1, 2), start=0.3, density=None, avoid=None):
    """Sparse, distant natural bird calls. rate = bouts per second for the whole bed (shared by
    n_birds birds); each bird has its own call type, pitch, position and distance and calls in short
    irregular bouts (no melodic sequences).  Distance: level, air absorption (high-frequency loss
    grows with distance) and a ground reflection (short comb).  avoid: [[t0, t1], ...] (cue-relative)
    spans in which no call may sound (key words of the narration)."""
    n = N(dur)
    y = np.zeros((n, 2))
    kinds = kinds or ["tsip", "chip", "chirp_up", "trill", "chatter", "twitter"]
    dens = bpc(density, 1.0)
    av = [(float(a) - 0.12, float(b) + 0.12) for a, b in (avoid or [])]
    per = rate / max(int(n_birds), 1)
    for _b in range(int(n_birds)):
        pan = rng.uniform(-width, width)
        d = rng.uniform(*dist)
        fb = np.exp(rng.uniform(np.log(fmin), np.log(fmax)))
        kind = kinds[rng.integers(len(kinds))]
        g = 10 ** (-d * 1.4)
        cut = 12000.0 * (1 - 0.5 * d)
        gd = N(rng.uniform(0.0008, 0.0030))      # ground reflection delay
        ts = poisson_times(max(dur - start - 0.4, 0.01), lambda t: per * dens(t), per * 2.0, rng, start)
        last = -9.0
        for t0 in ts:
            if t0 - last < 1.5:
                continue
            m = int(rng.integers(bout[0], bout[1] + 1))
            calls, t = [], t0
            for _ in range(m):
                c = bird_call(rng, kind, fb * (1 + 0.03 * rng.standard_normal()))
                calls.append((t, c))
                t += len(c) / SR + rng.uniform(0.15, 0.55)
            if any(not (t - 0.0 <= a or t0 >= b) for a, b in av):
                continue                            # the bout would overlap a key word: skip it
            last = t
            for tc, c in calls:
                c = lp(c, cut, 1)
                c = c - 0.45 * np.concatenate([np.zeros(gd), c[:-gd]])
                c = c * g * rng.uniform(0.6, 1.0)
                add_mono(y, c, N(tc), pan + 0.05 * rng.standard_normal())
    return out(y)


def gen_underwater(dur, rng, slosh=0.6, clicks=0.3, depth=1.0, bubbles=0.3):
    """Muffled underwater world: low water-body rumble, muffled surface slosh, sparse distant
    bubble clusters, tiny pond-life clicks."""
    n = N(dur)
    m1 = rand_curve(dur, rng, 0.1)
    s1 = rand_curve(dur, rng, 0.35)

    def mag_body(T, F):
        return (m_hp(F, 25, 2) * m_lp(F, 380 * depth, 3) * m_bump(F, 140, 4, 0.7) * db(2.0 * m1(T)))

    def mag_slosh(T, F):
        a = np.clip(0.6 + 0.5 * s1(T), 0.05, None) ** 2
        return slosh * a * m_hp(F, 120, 2) * m_lp(F, 900, 3) * m_bump(F, 420, 3, 0.6)
    L = shaped_noise(n, mag_body, rng) + shaped_noise(n, mag_slosh, rng)
    R = shaped_noise(n, mag_body, rng) + shaped_noise(n, mag_slosh, rng)
    y = np.stack([L, R], axis=1)
    lev = np.std(y)
    if bubbles:
        bb = np.zeros((n, 2))
        for tc in poisson_times(dur, lambda t: 0.5 + 0 * t, 0.5, rng):
            k = rng.integers(3, 14)
            ts = tc + np.cumsum(rng.exponential(0.035, k))
            rr = powerlaw_radii(rng, k, 0.8e-3, 5e-3, 2.2)
            add_bubbles(bb, ts, rr, rng, pans=rng.uniform(-0.8, 0.8), gain=1.0, xi=(0.03, 0.18))
        bb = lp(bb, 1600, 2)
        y += bubbles * bb * lev / (np.std(bb) + 1e-12) * 0.5
    if clicks:
        c = np.stack([click_field(n, rng, 6.0, 1500, 6000, 1.2), click_field(n, rng, 6.0, 1500, 6000, 1.2)], 1)
        y += clicks * c * lev / (np.std(c) + 1e-12) * 0.25
    return out(y)


def gen_ocean(dur, rng, swell=0.4, wash=2.0, lap=1.0, caps=1.0, breeze=0.3, period=8.5):
    """Open sea, camera low over the water: slow swell mass, broadband wash, whitecap fizz events,
    close lapping with small gurgles, light breeze."""
    n = N(dur)
    t = tvec(n)
    ph = rng.uniform(0, TWO_PI, 3)
    pers = period * np.array([1.0, 1.37, 0.71])
    sw = lambda tt: 0.55 + 0.45 * (0.6 * np.sin(TWO_PI * tt / pers[0] + ph[0]) + 0.3 * np.sin(TWO_PI * tt / pers[1] + ph[1])
                                    + 0.1 * np.sin(TWO_PI * tt / pers[2] + ph[2]))

    def mag_swell(T, F):
        return swell * (0.35 + sw(T)) ** 2 * m_hp(F, 30, 2) * m_lp(F, 260, 3)

    def mag_wash(T, F):
        return wash * 0.25 * (0.4 + sw(T - 0.8)) * m_hp(F, 250, 2) * m_lp(F, 6500, 2) * m_tilt(F, -3.0, 1000)
    L = shaped_noise(n, mag_swell, rng) + shaped_noise(n, mag_wash, rng)
    R = shaped_noise(n, mag_swell, rng) + shaped_noise(n, mag_wash, rng)
    y = np.stack([L, R], axis=1)
    lev = np.std(y)
    if caps:   # whitecap fizz: many tiny bubbles + hiss in a 0.6-2 s envelope
        cb = np.zeros((n, 2))
        for tc in poisson_times(dur, lambda tt: 0.45 + 0 * tt, 0.45, rng):
            L2 = rng.uniform(0.6, 2.0)
            m = N(L2)
            u = np.linspace(0, 1, m)
            env = (1 - np.exp(-u * 8)) * np.exp(-u * 3.5)
            hiss = bp(rng.standard_normal(m), 900, 9000, 2) * env
            p = rng.uniform(-0.9, 0.9)
            dist = rng.uniform(0.2, 1.0)
            h = lp(hiss, 9000 * (1 - 0.6 * dist), 1) * 10 ** (-dist)
            add_mono(cb, h, N(tc), p)
            k = int(rng.uniform(40, 160) * L2)
            ts = tc + np.sort(rng.uniform(0, L2 * 0.6, k))
            rr = powerlaw_radii(rng, k, 0.25e-3, 1.5e-3, 2.5)
            add_bubbles(cb, ts, rr, rng, pans=p + 0.1 * rng.standard_normal(k), gain=0.05 * 10 ** (-dist), xi=(0.03, 0.2))
        y += caps * cb * lev / (np.std(cb) + 1e-12) * 0.45
    if lap:    # close lapping: low-mid slosh + medium bubbles
        lb = np.zeros((n, 2))
        for tc in poisson_times(dur, lambda tt: 0.6 + 0.4 * sw(tt), 1.0, rng):
            m = N(rng.uniform(0.18, 0.45))
            u = np.linspace(0, 1, m)
            env = np.sin(np.pi * u ** 0.6) ** 2
            s = bp(rng.standard_normal(m), rng.uniform(150, 300), rng.uniform(900, 1800), 2) * env
            p = rng.uniform(-0.7, 0.7)
            add_mono(lb, s, N(tc), p)
            k = rng.integers(2, 7)
            add_bubbles(lb, tc + np.sort(rng.uniform(0.02, len(s) / SR, k)), powerlaw_radii(rng, k, 1.5e-3, 6e-3, 2.0),
                        rng, pans=p, gain=0.15, xi=(0.05, 0.2))
        y += lap * lb * lev / (np.std(lb) + 1e-12) * 0.4
    if breeze:
        w = gen_wind(dur, rng, strength=1, gustiness=0.4, bright=0.8, width=0.9).astype(float)
        y += breeze * w * lev / (np.std(w) + 1e-12) * 0.5
    return out(y)


def _rain_impact(rng, kind, size):
    """One raindrop impact. kind: dust | mud | leaf | water | stone."""
    if kind == "dust":
        return sumv(burst(rng, 0.03, rng.uniform(0.002, 0.005), lo=rng.uniform(300, 600), hi=rng.uniform(1500, 3500)),
                    0.8 * size * burst(rng, 0.06, rng.uniform(0.008, 0.015), hi=rng.uniform(180, 300)),
                    0.25 * burst(rng, 0.05, 0.012, lo=3000, hi=10000))            # dust puff
    if kind == "mud":
        return sumv(burst(rng, 0.04, rng.uniform(0.003, 0.007), lo=rng.uniform(250, 500), hi=rng.uniform(1200, 2500)),
                    0.5 * burst(rng, 0.03, 0.004, lo=2500, hi=7000),
                    0.5 * size * burst(rng, 0.06, 0.01, hi=250))
    if kind == "leaf":
        return sumv(burst(rng, 0.03, rng.uniform(0.0012, 0.003), lo=rng.uniform(1200, 2200), hi=rng.uniform(4500, 8000)),
                    reson(burst(rng, 0.08, 0.002), rng.uniform(280, 900), rng.uniform(3, 6)) * 0.8)
    if kind == "water":
        x = burst(rng, 0.02, 0.0015, lo=1500, hi=9000) * 0.6
        if rng.uniform() < 0.35:
            b = bubble(rng.uniform(0.8e-3, 2.4e-3), rng, xi=rng.uniform(0.08, 0.25), damp=0.7)
            x = sumv(x, (b * rng.uniform(0.3, 0.9), N(rng.uniform(0.002, 0.006))))
        return x
    if kind == "stone":
        return sumv(burst(rng, 0.02, 0.0015, lo=1800, hi=9000), 0.3 * burst(rng, 0.03, 0.004, lo=400, hi=1500))
    raise ValueError(kind)


def gen_rain(dur, rng, near=0.0, mid=0.0, far=0.0, wet=0.0, leaf=0.15, water=0.0, width=0.9,
             near_rate=6.0, mid_rate=300.0):
    """Rain in distance layers. near/mid/far: intensity curves 0..1. wet: 0 (dry dust) .. 1 (wet mud)."""
    n = N(dur)
    fn, fm, ff, fw = bpc(near), bpc(mid), bpc(far), bpc(wet)
    y = np.zeros((n, 2))
    # far layer: continuous hiss of countless drops + low patter rumble
    tf = rand_curve(dur, rng, 0.3)

    def mag_far(T, F):
        a = ff(T) * (1 + 0.15 * tf(T))
        return a * (m_hp(F, 180, 2) * m_lp(F, 6500, 2) * m_tilt(F, -1.5, 1000) + 0.35 * m_lp(F, 300, 2) * m_hp(F, 40, 2))
    y += 0.25 * np.stack([shaped_noise(n, mag_far, rng), shaped_noise(n, mag_far, rng)], 1)

    def scatter(rate_fn, rmax, gain, cut, sizes):
        for t in poisson_times(dur, rate_fn, rmax, rng):
            wv = fw(t)
            r = rng.uniform()
            if r < leaf:
                kind = "leaf"
            elif r < leaf + water:
                kind = "water"
            else:
                kind = "mud" if rng.uniform() < wv else "dust"
            s = rng.uniform(*sizes)
            x = _rain_impact(rng, kind, s) * s
            if cut < 15000:
                x = lp(x, cut * rng.uniform(0.8, 1.2), 1)
            add_mono(y, x, N(t), rng.uniform(-width, width), gain * rng.lognormal(0, 0.4))
    scatter(lambda t: mid_rate * fm(t), mid_rate, 0.06, 7000, (0.3, 0.8))
    scatter(lambda t: near_rate * fn(t), near_rate, 0.35, 20000, (0.6, 1.3))
    return out(y)


def gen_heavy_drops(dur, rng, times=(), pans=None, amps=None, surface="dust"):
    """Scripted individual heavy drops (first drops of the storm on dry dust)."""
    n = N(dur)
    y = np.zeros((n, 2))
    pans = pans if pans is not None else [rng.uniform(-0.6, 0.6) for _ in times]
    amps = amps if amps is not None else [1.0 for _ in times]
    for t, p, a in zip(times, pans, amps):
        x = _rain_impact(rng, surface, 1.4) * 1.0
        x = np.concatenate([x, np.zeros(N(0.05))])
        # crown splash spray: micro droplets
        k = rng.integers(8, 20)
        for _ in range(k):
            i0 = N(rng.uniform(0.004, 0.06))
            c = burst(rng, 0.004, 0.0006, lo=3500, hi=12000) * rng.uniform(0.05, 0.25)
            m = min(len(c), len(x) - i0)
            if m > 0:
                x[i0:i0 + m] += c[:m]
        add_mono(y, x, N(t), p, a)
    return out(y)


def gen_leaf_hits(dur, rng, times=(), pans=None, amps=None):
    """Drops striking a small leaf: bright pat + leaf flex resonance + spray."""
    n = N(dur)
    y = np.zeros((n, 2))
    pans = pans if pans is not None else [0.0 for _ in times]
    amps = amps if amps is not None else [1.0 for _ in times]
    for t, p, a in zip(times, pans, amps):
        x = _rain_impact(rng, "leaf", 1.0)
        x = np.concatenate([x, np.zeros(N(0.1))])
        x[:N(0.12)] += lp(burst(rng, 0.12, 0.03, attack=0.006), 220, 2)[:N(0.12)] * 0.6   # leaf dip
        for _ in range(rng.integers(5, 14)):
            i0 = N(rng.uniform(0.004, 0.08))
            c = burst(rng, 0.004, 0.0005, lo=4000, hi=13000) * rng.uniform(0.04, 0.2)
            m = min(len(c), len(x) - i0)
            if m > 0:
                x[i0:i0 + m] += c[:m]
        add_mono(y, x, N(t), p, a)
    return out(y)


def gen_trickle(dur, rng, flow=1.0, approach=None, pan=0.0):
    """Shallow water trickling along cracks: clustered small bubbles + gurgling lapping noise."""
    n = N(dur)
    fl = bpc(flow)
    ap = bpc(approach, 1.0)
    t = tvec(n)
    y = np.zeros((n, 2))
    # bubble clusters (gurgle)
    for tc in poisson_times(dur, lambda tt: 9 * fl(tt), 9, rng):
        k = rng.integers(3, 12)
        ts = tc + np.cumsum(rng.exponential(0.012, k))
        rr = powerlaw_radii(rng, k, 0.5e-3, 3.5e-3, 2.0)
        add_bubbles(y, ts, rr, rng, pans=pan + 0.25 * rng.standard_normal(k), gain=0.4, xi=(0.06, 0.25), damp=0.9)
    g = rand_curve(dur, rng, 6.0)

    def mag(T, F):
        return fl(T) * np.clip(0.7 + 0.5 * g(T), 0.1, None) * m_hp(F, 250, 2) * m_lp(F, 3000, 2) * m_bump(F, 800, 4, 0.6)
    s = shaped_noise(n, mag, rng)
    y += np.stack([s, s], 1) * 0.15 * np.std(y) / (np.std(s) + 1e-12) * 2.0
    a = ap(t)
    y = y * a[:, None]
    # air absorption as it approaches: darker when far
    y = 0.5 * y + 0.5 * lp(y, 4000, 1) * 1.0
    return out(y)


def gen_thunder(dur, rng, sync=0.3, dist=1.0, length=3.5):
    """Distant thunder roll (noise rumble, no crack)."""
    n = N(dur)
    y = np.zeros((n, 2))
    k = rng.integers(4, 8)
    for j in range(k):
        t0 = sync + (0 if j == 0 else rng.uniform(0.05, 1.6))
        m = N(rng.uniform(1.0, length))
        tt = tvec(m)
        att = rng.uniform(0.08, 0.5)
        env = (1 - np.exp(-tt / att)) * np.exp(-tt / rng.uniform(0.5, 1.4))
        a = brown(m, rng) * env
        a = lp(a, rng.uniform(140, 320) / dist, 2)
        b = brown(m, rng) * env
        b = lp(b, rng.uniform(140, 320) / dist, 2)
        g = rng.uniform(0.4, 1.0) * (1.0 if j == 0 else rng.uniform(0.4, 0.9))
        i0 = N(t0)
        add_st(y, np.stack([a, b], 1) * g, i0)
    y += 0.05 * hp(lp(y, 900, 2), 300, 2)
    return out(hp(y, 32, 2))


# ---------------------------------------------------------------- body / micro world
def _beat_times(dur, anchor, period, jitter, rng):
    ts = [anchor]
    t = anchor
    while t > -period:
        t -= period * (1 + jitter * rng.standard_normal())
        ts.append(t)
    t = anchor
    while t < dur + period:
        t += period * (1 + jitter * rng.standard_normal())
        ts.append(t)
    return np.sort(np.array(ts))


def gen_heartbeat(dur, rng, anchor=0.5, period=0.8333, strength=1.0, jitter=0.012, muffle=500.0,
                  s2_delay=0.30, body=0.6, beats=None):
    """Lub-dub heart sounds heard from inside the body. S1 = two close low thumps (mitral +
    tricuspid), S2 shorter and higher.  anchor = time of a strong S1 (cue-relative).
    Body component (~100-160 Hz) keeps it audible on small speakers."""
    n = N(dur)
    y = np.zeros((n, 2))
    st = bpc(strength)
    bts = np.array(beats) if beats is not None else _beat_times(dur, anchor, period, jitter, rng)
    for t in bts:
        if t < -0.5 or t > dur:
            continue
        s = float(st(np.array(t)))
        if s <= 0.01:
            continue
        a = thump(rng, rng.uniform(42, 52), 0.028, body_f=rng.uniform(105, 135), body=body, knock=0.12)
        b = thump(rng, rng.uniform(48, 58), 0.022, body_f=rng.uniform(120, 150), body=body, knock=0.1)
        c = thump(rng, rng.uniform(60, 72), 0.018, body_f=rng.uniform(140, 175), body=body * 0.9, knock=0.15)
        add_mono(y, a, N(t), 0.0, s)
        add_mono(y, b, N(t + rng.uniform(0.018, 0.03)), 0.0, 0.7 * s)
        add_mono(y, c, N(t + s2_delay * (1 + 0.02 * rng.standard_normal())), 0.0, 0.62 * s)
    y = lp(y, muffle, 2)
    return out(y)


def _pulse_wave(t, bts, rise=0.11):
    p = np.zeros_like(t)
    for b in bts:
        u = (t - b) / rise
        m = u > 0
        p[m] += (u[m] * np.exp(1 - u[m]))
        u2 = (t - b - 0.36) / 0.07
        m2 = u2 > 0
        p[m2] += 0.18 * u2[m2] * np.exp(1 - u2[m2])
    return p


def gen_blood_flow(dur, rng, anchor=0.5, period=0.8333, strength=1.0, base=0.35, jitter=0.012, passes=3.0):
    """Plasma rushing through a vessel: turbulent low/mid noise surging with each systole,
    plus soft swooshes of cells passing close to the camera."""
    n = N(dur)
    bts = _beat_times(dur, anchor, period, jitter, rng)
    st = bpc(strength)
    sm = rand_curve(dur, rng, 1.5)

    def mag(T, F):
        P = _pulse_wave(T, bts) * st(T)
        speed = base + P
        fc = 220 + 650 * np.clip(P, 0, 2)
        return (speed ** 1.3) * m_hp(F, 30, 2) * m_lp(F, fc, 2) * db(1.2 * sm(T)) * (1 + 0.6 * m_bump(F, 90, 4, 0.8))
    L = shaped_noise(n, mag, rng)
    R = shaped_noise(n, mag, rng)
    y = np.stack([L, R], 1)
    lev = np.std(y)
    if passes:
        pb = np.zeros((n, 2))
        for tc in poisson_times(dur, lambda tt: passes + 0 * tt, passes, rng):
            m = N(rng.uniform(0.25, 0.55))
            u = np.linspace(0, 1, m)
            env = np.sin(np.pi * u) ** 3
            s = bp(rng.standard_normal(m), 120, rng.uniform(700, 1400), 2) * env
            p0 = rng.uniform(-0.9, 0.9)
            add_st(pb, pan2(s, p0 + (rng.choice([-1, 1]) * 0.6) * (u - 0.5)), N(tc))
        y += pb * lev / (np.std(pb) + 1e-12) * 0.35
    return out(y)


def gen_body_amb(dur, rng, wet=1.0, creaks=0.4, depth=1.0):
    """Inside living tissue: very low, wet, slowly moving pressure noise + rare soft tissue creaks."""
    n = N(dur)
    m1 = rand_curve(dur, rng, 0.25)

    def mag(T, F):
        return m_hp(F, 25, 2) * m_lp(F, 260 * depth, 3) * db(2.5 * m1(T)) * (1 + wet * 0.5 * m_bump(F, 70, 6, 0.6))
    y = np.stack([shaped_noise(n, mag, rng), shaped_noise(n, mag, rng)], 1)
    lev = np.std(y)
    if creaks:
        c = np.zeros((n, 2))
        for tc in poisson_times(dur, lambda tt: 0.6 + 0 * tt, 0.6, rng):
            m = N(rng.uniform(0.15, 0.4))
            u = np.linspace(0, 1, m)
            env = np.sin(np.pi * u) ** 2
            s = bp(rng.standard_normal(m), 200, 1500, 2) * crackle_env(m, rng, 300, 0.003) * env
            add_mono(c, s, N(tc), rng.uniform(-0.7, 0.7))
        y += creaks * c * lev / (np.std(c) + 1e-12) * 0.25
    return out(y)


def gen_nerve(dur, rng, sync=0.1, n_nodes=9, span=0.42, pan_from=-0.7, pan_to=0.7, arrive=1.0):
    """Action potential racing along a myelinated axon: saltatory 'node' crackles travelling
    across the stereo field, a faint continuous crackle between nodes, a stronger arrival burst."""
    n = N(dur)
    y = np.zeros((n, 2))
    times = sync + span * (np.arange(n_nodes) / max(n_nodes - 1, 1)) ** 0.92
    times += rng.normal(0, 0.006, n_nodes) * (np.arange(n_nodes) > 0)
    for j, t in enumerate(times):
        p = pan_from + (pan_to - pan_from) * j / max(n_nodes - 1, 1)
        m = N(rng.uniform(0.012, 0.022))
        imp = np.zeros(m)
        k = rng.integers(14, 40)
        idx = np.clip((rng.beta(1.2, 3.0, k) * m).astype(int), 0, m - 1)
        np.add.at(imp, idx, rng.lognormal(0, 0.9, k) * rng.choice([-1, 1], k))
        c = bp(imp, 1400, 9000, 2) + 0.3 * bp(imp, 4000, 14000, 2)
        zap = burst(rng, 0.04, 0.008, lo=300, hi=2200) * 0.35
        x = np.concatenate([c, np.zeros(max(0, len(zap) - len(c)))])
        x[:len(zap)] += zap
        g = 0.7 + 0.3 * j / n_nodes
        add_mono(y, x, N(t), p, g)
    # inter-node faint crackle along the path
    t0, t1 = times[0], times[-1]
    m = N(t1 - t0 + 0.02)
    path = click_field(m, rng, 900, 2500, 11000, 1.0) * 0.12
    add_st(y, pan2(path, np.linspace(pan_from, pan_to, m)), N(t0))
    if arrive:
        m = N(0.12)
        c = click_field(m, rng, 1600, 1200, 10000, 1.0) * np.exp(-tvec(m) / 0.03)
        c += 0.6 * burst(rng, 0.12, 0.03, lo=200, hi=1500)
        add_mono(y, c, N(t1 + 0.012), pan_to, arrive)
    return out(y)


def gen_muscle(dur, rng, sync=0.05, hold=0.35, release=0.45, pan=0.0):
    """Muscle fibres contracting: dense fibrous creak swelling and relaxing + low thump of the
    contraction wave. All noise-based."""
    n = N(dur)
    t = tvec(n)
    env = smoothstep((t - sync) / 0.12) * (1 - smoothstep((t - sync - hold) / release))
    cr = bp(rng.standard_normal(n), 180, 2600, 2) * crackle_env(n, rng, 200 + 1600 * env, 0.0025, 0.9)
    cr *= env
    st = lp(rng.standard_normal(n), 380, 2) * env * 0.8
    y = np.zeros((n, 2))
    add_st(y, np.stack([cr, cr * 0.85 + 0.15 * st], 1), 0)
    y[:, 0] += st * 0.5
    y[:, 1] += st * 0.5
    th = thump(rng, 55, 0.05, body_f=140, body=0.7, knock=0.3)
    add_mono(y, th, N(sync), pan, 1.2 * np.std(y) / (np.std(th) + 1e-12) * 1.5)
    return out(y)


def gen_sparkle(dur, rng, rate=40.0, bright=1.0, far=0.3, width=0.95, sweep=None, rmax=None):
    """Cellular sparkle: tiny granular glints (0.3-2 ms bursts, 3-14 kHz), never tonal.
    rate: grains/s curve; far: fraction of distant (darker, quieter) grains; sweep: [[t, pan]]
    centre of a travelling wave of lights."""
    n = N(dur)
    rf = bpc(rate)
    sw = bpc(sweep) if sweep is not None else None
    tt = np.linspace(0, dur, 200)
    rmax = rmax or float(np.max(rf(tt))) + 1e-6
    y = np.zeros((n, 2))
    ts = poisson_times(dur, rf, rmax, rng)
    for t in ts:
        isfar = rng.uniform() < far
        m = N(rng.uniform(0.0003, 0.002))
        x = rng.standard_normal(m + 8) * np.hanning(m + 8)
        x = np.concatenate([x, np.zeros(N(0.004))])
        lo = rng.uniform(2500, 6000) * bright
        if isfar:
            x = bp(x, lo * 0.6, 7000, 1) * 0.35
        else:
            x = bp(x, lo, 15000, 1)
            if rng.uniform() < 0.3:     # a few have a tiny glassy body (very low Q, 2 ms)
                x = x + 0.4 * reson(x, rng.uniform(4000, 11000), 2.5)
        p = rng.uniform(-width, width)
        if sw is not None:
            p = float(np.clip(sw(np.array(t)) + 0.35 * rng.standard_normal(), -1, 1))
        add_mono(y, x, N(t), p, rng.lognormal(0, 0.6))
    return out(y)


# ---------------------------------------------------------------- desert / dark / fire
def gen_sand(dur, rng, strength=1.0, gustiness=0.7, events=None, threshold=0.35, rate=0.1):
    """Wind-blown sand: saltation hiss (dense HF grain impacts) + sparse larger grain ticks,
    gated by the gust strength (sand only moves above a threshold wind speed)."""
    n = N(dur)
    t = tvec(n)
    g = gust_curve(dur + 1, rng, rate, gustiness, 0.0, events)
    G = np.clip((g(t) - threshold) / (1 - threshold), 0, 1)
    G2 = np.clip((g(t - 0.3) - threshold) / (1 - threshold), 0, 1)
    def layer(Gv):
        a = click_field(n, rng, 200 + 6000 * Gv, 3500, 14000, 0.4, rmax=6200, clip_q=0.99)
        b = click_field(n, rng, 5 + 120 * Gv, 1200, 6000, 0.4, rmax=130, clip_q=0.99)
        h = hp(rng.standard_normal(n), 5000, 2) * Gv * 0.08
        return (a + b) * (Gv ** 0.7) * 0.5 + h
    return out(np.stack([layer(G), layer(G2)], 1) * strength)


def gen_flame(dur, rng, muffle_at=None, muffle_len=0.5, muffle_gain=-7.0, muffle_cut=170.0):
    """Small oil-lamp flame: soft combustion flutter (low noise with irregular flicker) and rare
    wick ticks.  muffle_at: time a heavy cloth covers it (it becomes darker and quieter)."""
    n = N(dur)
    t = tvec(n)
    fl = rand_curve(dur, rng, 7.0)
    fl2 = rand_curve(dur, rng, 1.2)
    a = np.clip(1 + 0.35 * fl(t) + 0.2 * fl2(t), 0.2, None)
    x = lp(hp(rng.standard_normal(n), 40, 2), 420, 2) * a
    x += 0.15 * bp(rng.standard_normal(n), 600, 2500, 1) * a ** 2
    x += 0.5 * click_field(n, rng, 0.5, 1200, 5000, 1.0) * 1.5
    y = np.stack([x, x], 1)
    if muffle_at is not None:
        m = smoothstep((t - muffle_at) / muffle_len)
        dark = lp(y, muffle_cut, 2) * db(muffle_gain)
        y = y * (1 - m)[:, None] + dark * m[:, None]
    return out(y)


# ---------------------------------------------------------------- cloth
_FABRIC = {"linen": (900, 8000, 2600, 0.004), "velvet": (150, 2600, 900, 0.008),
           "cotton": (700, 6500, 1800, 0.004), "silk": (1500, 11000, 3500, 0.003)}


def gen_cloth(dur, rng, motion=0.5, fabric="linen", air=0.5, width=0.4, pan=0.0):
    """Fabric moving: friction crumple texture (rate and level follow motion) + air the cloth
    pushes (low-mid swish proportional to its velocity)."""
    n = N(dur)
    t = tvec(n)
    mo = np.clip(bpc(motion)(t), 0, None)
    lo, hi, cent, tau = _FABRIC[fabric]
    def one():
        tex = bp(rng.standard_normal(n), lo, hi, 2)
        tex = peaking(tex, cent, 4, 0.8)
        env = crackle_env(n, rng, 40 + 900 * mo, tau, 0.85) * mo + 0.15 * mo
        return tex * env
    L, R = one(), one()
    y = np.stack([L, R], 1)
    m = 0.5 * (L + R)
    y = np.stack([m + (L - m) * width, m + (R - m) * width], 1)
    if air:
        sw = bp(rng.standard_normal(n), 120, 1400, 2) * mo ** 1.5
        y += air * np.stack([sw, sw], 1) * np.std(y) / (np.std(sw) + 1e-12) * 0.7
    if pan:
        gl, gr = _pg(pan)
        y = y * np.array([gl, gr]) * np.sqrt(2)
    return out(y)


def gen_curtain(dur, rng, peaks=(), period=4.0, phase_peak=None, fabric="linen", breeze=0.6, depth=0.75):
    """Sheer curtain breathing in a window breeze: inhale/exhale cycle, soft linen rustle peaking
    as the curtain billows, the breeze itself swelling through the window."""
    n = N(dur)
    t = tvec(n)
    pk = list(peaks)
    def breath(tt):
        tt = np.asarray(tt, dtype=float)
        v = np.zeros_like(tt)
        for (tp, a) in pk:
            v += a * np.exp(-0.5 * ((tt - tp) / (period * 0.22)) ** 2)
        return v
    mot = breath(t)
    mot = mot / (mot.max() + 1e-9)
    vel = np.abs(np.gradient(lp(mot, 8, 1))) * SR
    vel = vel / (vel.max() + 1e-9)
    motion = np.clip(0.15 + 0.85 * (0.6 * mot + 0.4 * vel), 0, 1) * depth
    cl = gen_cloth(dur, rng, motion=np.stack([t, motion], 1)[::480].tolist(), fabric=fabric, air=0.25, width=0.5).astype(float)
    events = [[tp, 1.4 * a, period * 0.25] for (tp, a) in pk]
    w = gen_wind(dur, rng, strength=1.0, gustiness=0.25, bias=-1.2, bright=1.3, low=0.0, width=0.6,
                 events=events, rate=0.15).astype(float)
    w = hp(w, 150, 2)
    y = cl / (np.std(cl) + 1e-12) + breeze * w / (np.std(w) + 1e-12) * 0.8
    return out(y)


def gen_cloth_fall(dur, rng, sync=0.6, fall=0.5, weight=1.0, settle=1.2):
    """Heavy velvet cloth dropped over an object: air whoosh of the falling cloth, low heavy
    thump + puff of displaced air on landing, then the fabric slides and settles."""
    n = N(dur)
    t = tvec(n)
    y = np.zeros((n, 2))
    # falling air (velocity grows ~ t)
    u = np.clip((t - (sync - fall)) / fall, 0, 1)
    env = u ** 2 * (t < sync + 0.04)
    env = lp(env, 40, 1)
    air = bp(rng.standard_normal(n), 140, 1600, 2) * env
    air = air + 0.6 * bp(rng.standard_normal(n), 600, 3000, 1) * crackle_env(n, rng, 200 + 600 * env, 0.006) * env
    y += pan2(air, 0.0) * 0.6
    # landing
    th = thump(rng, 60, 0.07, body_f=150, body=0.9, knock=0.5, dur=0.6)
    add_mono(y, th, N(sync), 0.0, 2.2 * weight)
    puff = burst(rng, 0.4, 0.07, attack=0.008, lo=250, hi=1800)
    m = len(puff)
    pst = np.stack([puff, burst(rng, 0.4, 0.07, attack=0.008, lo=250, hi=1800)], 1)
    add_st(y, pst * 0.9, N(sync + 0.005))
    # settle: velvet slides decaying with two smaller late slides
    mot = np.zeros(n)
    s0 = N(sync)
    k = np.exp(-(t - sync) / (settle * 0.35)) * (t >= sync)
    mot += k
    for _ in range(2):
        ts = sync + rng.uniform(0.25, settle)
        mot += 0.45 * np.exp(-0.5 * ((t - ts) / 0.08) ** 2)
    cl = gen_cloth(dur, rng, motion=np.stack([t, np.clip(mot, 0, 1)], 1)[::240].tolist(), fabric="velvet",
                   air=0.6, width=0.6).astype(float)
    y += cl * np.std(air[s0 - N(0.2):s0]) / (np.std(cl[s0:s0 + N(0.5)]) + 1e-12) * 1.2
    return out(y)


# ---------------------------------------------------------------- water spot effects
def gen_drop_detach(dur, rng, sync=0.05, fall=0.75):
    """A dew drop letting go of a grass tip: tiny wet surface-tension 'tsk' + a faint air trail."""
    n = N(dur)
    y = np.zeros((n, 2))
    c = burst(rng, 0.01, 0.0012, lo=2500, hi=9000) * 0.6
    b = bubble(0.45e-3, rng, xi=0.35, damp=0.7) * 0.5
    add_mono(y, c, N(sync), 0.0)
    add_mono(y, b, N(sync + 0.0015), 0.0)
    t = tvec(n)
    u = np.clip((t - sync) / fall, 0, 1)
    env = np.sin(np.pi * u) ** 2 * u
    trail = bp(rng.standard_normal(n), 2500, 9000, 1) * env * 0.03
    y += pan2(trail, 0.0)
    return out(y)


def gen_drop_on_leaf(dur, rng, sync=0.1, size=1.0, spring=0.35, pan=0.0):
    """Macro dew drop landing on a seedling leaf: soft 'pat' of the membrane, the leaf's low
    flex, a small water plink as the drop merges, spray of micro-droplets, leaf springing back."""
    n = N(dur)
    y = np.zeros((n, 2))
    i0 = N(sync)
    pat = sumv(burst(rng, 0.03, 0.0035, attack=0.0003, lo=500, hi=4500),
               0.6 * reson(burst(rng, 0.08, 0.0025), 420, 4.0))
    add_mono(y, pat, i0, pan, 1.0 * size)
    flex = thump(rng, 160, 0.03, body_f=330, body=0.4, knock=0.25, dur=0.25)
    add_mono(y, flex, i0 + N(0.002), pan, 0.9 * size)
    pl = bubble(1.6e-3, rng, xi=0.22, damp=0.7)
    add_mono(y, pl, i0 + N(0.006), pan, 0.28 * size)
    for _ in range(rng.integers(18, 34)):
        dt = rng.exponential(0.035)
        c = burst(rng, 0.005, rng.uniform(0.0003, 0.0009), lo=3500, hi=13000)
        if rng.uniform() < 0.15:
            c = sumv(c, 0.5 * bubble(rng.uniform(0.25e-3, 0.5e-3), rng, xi=0.3))
        add_mono(y, c, i0 + N(0.003 + dt), pan + rng.uniform(-0.5, 0.5), rng.uniform(0.05, 0.25) * size * np.exp(-dt / 0.06))
    if spring:
        m = N(0.45)
        u = np.linspace(0, 1, m)
        env = np.sin(np.pi * u) ** 2 * np.exp(-u * 2)
        sw = bp(rng.standard_normal(m), 900, 6000, 1) * crackle_env(m, rng, 300, 0.004) * env
        add_mono(y, sw, i0 + N(0.06), pan, spring * 0.12)
    return out(hp(y, 55, 2))


def gen_plink(dur, rng, sync=0.05, r=2.0e-3, xi=0.2, pan=0.0):
    """Single drop into water: impact tick + entrained bubble with rising pitch."""
    n = N(dur)
    y = np.zeros((n, 2))
    add_mono(y, burst(rng, 0.006, 0.0008, lo=1500, hi=10000) * 0.4, N(sync), pan)
    add_mono(y, bubble(r, rng, xi=xi, damp=0.7), N(sync + 0.003), pan)
    return out(y)


def gen_bubble_streams(dur, rng, streams=6, rate=3.0, r=(0.35e-3, 0.8e-3), hero=None, width=0.85,
                       density=1.0, muffle=None):
    """Photosynthesis: oxygen bubbles detaching from leaves - each stream releases tiny bubbles
    at a jittered interval (Minnaert ticks 4-9 kHz).  hero = {pan, rate, gain, start}."""
    n = N(dur)
    y = np.zeros((n, 2))
    dens = bpc(density)
    for s in range(int(streams)):
        p = rng.uniform(-width, width)
        d = rng.uniform(0.2, 1.0)
        r0 = np.exp(rng.uniform(np.log(r[0]), np.log(r[1])))
        rt = rate * rng.uniform(0.5, 1.5)
        t = rng.uniform(0, 1.0 / rt)
        while t < dur:
            if rng.uniform() < dens(np.array(t)):
                b = bubble(r0 * rng.lognormal(0, 0.2), rng, xi=rng.uniform(0.05, 0.2))
                b = lp(b, 12000 * (1 - 0.6 * d), 1) * 10 ** (-d * 0.9)
                add_mono(y, b, N(t), p)
            t += rng.gamma(6.0, 1.0 / (6.0 * rt))
    if hero:
        p = hero.get("pan", 0.0)
        rt = hero.get("rate", 5.0)
        g = hero.get("gain", 2.5)
        t = hero.get("start", 0.0)
        r0 = hero.get("r", 0.7e-3)
        while t < dur:
            b = bubble(r0 * rng.lognormal(0, 0.22), rng, xi=rng.uniform(0.05, 0.22))
            add_mono(y, b, N(t), p + 0.05 * rng.standard_normal(), g * rng.lognormal(0, 0.3))
            t += rng.gamma(4.0, 1.0 / (4.0 * rt))
    if muffle:
        y = 0.4 * y + 0.6 * lp(y, muffle, 2)
    return out(y)


def gen_bubble_pass(dur, rng, sync=0.4, r=4.5e-3, pan=0.0):
    """A big bubble rising into the lens: low 'blub', a swirl of small bubbles, a soft water
    swish as it passes the camera."""
    n = N(dur)
    t = tvec(n)
    y = np.zeros((n, 2))
    add_mono(y, bubble(r * 1.1, rng, xi=0.18, damp=0.7), N(sync - 0.3), pan, 0.35)
    add_mono(y, bubble(r, rng, xi=0.22, damp=0.7), N(sync - 0.03), pan, 1.0)
    k = 14
    add_bubbles(y, sync - 0.3 + np.sort(rng.uniform(0, 0.35, k)), powerlaw_radii(rng, k, 0.8e-3, 3e-3, 2.0), rng,
                pans=pan + 0.3 * rng.standard_normal(k), gain=0.12)
    env = np.exp(-0.5 * ((t - sync) / 0.12) ** 2)
    sw = lp(bp(rng.standard_normal(n), 100, 1400, 2), 900, 2) * env
    y += pan2(sw, pan) * 0.35 * np.max(np.abs(y)) / (np.max(np.abs(sw)) + 1e-12)
    return out(lp(y, 5000, 1))


def gen_immerse(dur, rng, sync=0.15, whoomp=0.0, n_bubbles=8, bubble_gain=0.05, swell=0.6, muffle=900.0):
    """Arriving under water by a cut (not a plunge): a soft low pressure swell that blooms as the
    sound world goes muffled, and a few distant bubbles rising.  whoomp > 0 adds the 'water closing
    over the camera' thump of a real plunge (not used when the camera never enters the water)."""
    n = N(dur)
    t = tvec(n)
    y = np.zeros((n, 2))
    if swell:
        e = np.where(t < sync, smoothstep(np.clip((t - sync + 0.25) / 0.25, 0, 1)),
                     np.exp(-np.clip(t - sync, 0, None) / 0.45))
        def mag(T, F):
            return m_lp(F, muffle, 2) * m_hp(F, 35, 2) * m_tilt(F, -2.0, 200)
        sw = np.stack([shaped_noise(n, mag, rng), shaped_noise(n, mag, rng)], 1) * e[:, None]
        y += swell * sw / (np.abs(sw).max() + 1e-12)
    if whoomp:
        env = (1 - np.exp(-np.clip(t - sync + 0.08, 0, None) / 0.03)) * np.exp(-np.clip(t - sync, 0, None) / 0.35)
        wh = np.stack([lp(brown(n, rng), 260, 3) * env, lp(brown(n, rng), 260, 3) * env], 1)
        y += whoomp * wh / (np.abs(wh).max() + 1e-12)
    k = int(n_bubbles)
    if k:
        ts = sync + 0.1 + np.sort(rng.exponential(0.35, k))
        bb = np.zeros((n, 2))
        add_bubbles(bb, ts, powerlaw_radii(rng, k, 1.0e-3, 4e-3, 2.0), rng, pans=rng.uniform(-0.7, 0.7, k),
                    gain=1.0, xi=(0.05, 0.2), gains=np.exp(-(ts - sync) / 0.6))
        bb = lp(bb, 2200, 2)
        y += bubble_gain * 10 * bb / (np.abs(bb).max() + 1e-12) * (np.abs(y).max() if np.any(y) else 0.1)
    return out(y)


def gen_pour(dur, rng, sync=0.05, stop=1.8, fill0=0.1, fill1=0.7, H=0.115, D=0.072, rate=1100.0, pan=0.0,
             drips=3):
    """Water poured from a jug into a glass.  Stream hits the dry bottom first (bright splash),
    then the plunging jet entrains a dense bubble cloud + turbulent noise; the air column above
    the water acts as a quarter-wave resonator whose frequency rises as the glass fills
    (f = c / 4(L + 0.3 D)).  Ends with the stream thinning and a few last drips."""
    n = N(dur)
    t = tvec(n)
    on = smoothstep((t - sync) / 0.06)
    off = 1 - smoothstep((t - (sync + stop)) / 0.28)
    jit = 1 + 0.08 * rand_curve(dur, rng, 6.0)(t)
    flow = np.clip(on * off * jit, 0, None)
    vol = np.cumsum(flow)
    vol = vol / (vol[-1] + 1e-12)
    fill = fill0 + (fill1 - fill0) * vol
    tf = np.linspace(0, dur, 400)
    fill_f = lambda tt: np.interp(tt, tf, np.interp(tf, t, fill))
    flow_f = lambda tt: np.interp(tt, tf, np.interp(tf, t, flow))

    # turbulent stream / splash noise
    def mag_noise(T, F):
        fl = flow_f(T)
        wet = np.clip((fill_f(T) - fill0) / 0.05, 0, 1)
        dry = (1 - wet)
        return fl * (m_hp(F, 350, 2) * m_lp(F, 9000, 2) * m_tilt(F, -1.0, 2000) * (1 + 1.5 * dry * m_bump(F, 4500, 6, 0.8)))
    noise = shaped_noise(n, mag_noise, rng)
    bub = np.zeros((n, 2))
    times = poisson_times(dur, lambda tt: rate * flow_f(tt) * np.clip((fill_f(tt) - fill0) / 0.03, 0.15, 1), rate * 1.2, rng)
    radii = powerlaw_radii(rng, len(times), 0.3e-3, 4.5e-3, 2.1)
    add_bubbles(bub, times, radii, rng, pans=pan + 0.12 * rng.standard_normal(len(times)), gain=1.0, xi=(0.03, 0.18), damp=1.0)
    src = np.stack([noise, noise], 1) * (np.std(bub) / (np.std(noise) + 1e-12)) * 0.8 + bub
    # air-column resonance (and its 3rd mode)
    def mag_res(T, F):
        L = H * (1 - fill_f(T))
        f1 = 343.0 / (4 * (L + 0.3 * D))
        return 0.7 * (m_bump(F, f1, 9, 0.14) * m_bump(F, 3 * f1, 5, 0.12)) * m_hp(F, 140, 2) * (1 + 0 * T)
    y = np.stack([tv_filter(src[:, 0], mag_res), tv_filter(src[:, 1], mag_res)], 1)
    # first hit on the dry glass bottom: bright tap + short glass ring
    hit = sumv(burst(rng, 0.05, 0.006, lo=1200, hi=11000), 0.12 * modal(rng, [2600, 6900, 12400], [0.12, 0.06, 0.03], [1, 0.5, 0.25], 0.15))
    add_mono(y, hit, N(sync), pan, 0.6 * np.max(np.abs(y)) / (np.max(np.abs(hit)) + 1e-12))
    # last drips
    for j in range(int(drips)):
        td = sync + stop + 0.2 + j * rng.uniform(0.12, 0.3)
        if td < dur - 0.1:
            add_mono(y, bubble(rng.uniform(1.2e-3, 2.2e-3), rng, xi=0.2, damp=0.7), N(td), pan,
                     0.25 * np.std(bub) * 6 * 0.6 ** j)
    return out(hp(y, 120, 2))


def gen_jug_set(dur, rng, sync=0.05, pan=0.0):
    """Glass jug (with water) set down on a wooden table: wood knock, damped glass body,
    a little slosh."""
    n = N(dur)
    y = np.zeros((n, 2))
    knock = sumv(modal(rng, [140, 310, 620, 1150], [0.06, 0.05, 0.03, 0.02], [1, 0.7, 0.4, 0.2], 0.2) * 0.6,
                 burst(rng, 0.03, 0.003, lo=400, hi=4000) * 0.5)
    glass = modal(rng, [880, 2350, 4300], [0.12, 0.07, 0.04], [0.5, 0.3, 0.15], 0.25, detune=1.2) * 0.35
    add_mono(y, knock, N(sync), pan)
    add_mono(y, glass, N(sync + 0.001), pan)
    m = N(0.35)
    u = np.linspace(0, 1, m)
    sl = bp(rng.standard_normal(m), 250, 1500, 2) * np.sin(np.pi * u ** 0.5) ** 2 * 0.08
    add_mono(y, sl, N(sync + 0.02), pan)
    k = 5
    add_bubbles(y, sync + 0.03 + np.sort(rng.uniform(0, 0.2, k)), powerlaw_radii(rng, k, 1.5e-3, 4e-3, 2), rng, pans=pan, gain=0.05)
    return out(y)


def gen_glass_clink(dur, rng, sync=0.05, f1=2200.0, strength=1.0, pan=0.0, decay=1.0):
    """Two glasses touching: modal synthesis with inharmonic partials of a drinking glass."""
    n = N(dur)
    y = np.zeros((n, 2))
    ratios = np.array([1.0, 2.71, 5.15, 8.2, 11.9]) * (1 + 0.01 * rng.standard_normal(5))
    m = modal(rng, f1 * ratios, np.array([0.9, 0.5, 0.28, 0.16, 0.09]) * decay, [1, 0.55, 0.3, 0.16, 0.08], dur - sync, detune=1.5)
    m = sumv(m, burst(rng, 0.01, 0.0007, lo=3000, hi=14000) * 0.4)
    add_mono(y, m, N(sync), pan, strength)
    return out(y)


def gen_plate_slide(dur, rng, sync=0.05, length=0.55, pan=0.0):
    """Ceramic plate slid over worn wood: stick-slip micro-impacts filtered by plate modes +
    wood surface noise, gentle stop."""
    n = N(dur)
    t = tvec(n)
    u = np.clip((t - sync) / length, 0, 1)
    speed = np.sin(np.pi * u) ** 1.5 * (t >= sync) * (t <= sync + length)
    ex = crackle_env(n, rng, 150 + 1400 * speed, 0.0008, 0.8) * speed
    ex = ex * rng.standard_normal(n)
    plate = sum(reson(ex, f * rng.uniform(0.95, 1.05), q) * a
                for f, q, a in [(1150, 7, 0.5), (2480, 8, 0.35), (4100, 8, 0.25), (6200, 7, 0.12)])
    plate = plate + 0.8 * bp(ex, 900, 7000, 1) * np.std(plate) / (np.std(bp(ex, 900, 7000, 1)) + 1e-12)
    wood = bp(rng.standard_normal(n), 200, 2200, 2) * speed * 0.5
    y = plate + wood * np.std(plate) / (np.std(wood) + 1e-12) * 1.1
    stop = modal(rng, [180, 420, 1150, 2480], [0.05, 0.04, 0.05, 0.04], [0.6, 0.5, 0.25, 0.15], 0.15) * 0.4
    yy = pan2(y, pan)
    add_mono(yy, stop * np.max(np.abs(y)) / (np.max(np.abs(stop)) + 1e-12) * 0.5, N(sync + length - 0.02), pan)
    return out(yy)


def gen_crust_crackle(dur, rng, rate=25.0, pan=-0.3):
    """Fresh bread crust 'singing' as it cools - sparse tiny crackles."""
    n = N(dur)
    c = click_field(n, rng, rate, 2500, 12000, 1.1)
    c += 0.3 * click_field(n, rng, rate * 0.3, 800, 4000, 1.0)
    return out(pan2(c, pan))


def gen_grab(dur, rng, sync=0.05, pan=0.0):
    """Fingers closing around an apple: soft skin-on-waxy-skin contact + brief friction."""
    n = N(dur)
    y = np.zeros((n, 2))
    add_mono(y, burst(rng, 0.08, 0.012, attack=0.003, hi=650) * 1.0, N(sync), pan)
    m = N(0.09)
    fr = bp(rng.standard_normal(m), 900, 5000, 2) * crackle_env(m, rng, 500, 0.002) * np.hanning(m)
    add_mono(y, fr * 0.35, N(sync - 0.03), pan)
    add_mono(y, burst(rng, 0.08, 0.01, attack=0.004, hi=500) * 0.6, N(sync + 0.06), pan)
    return out(y)


def gen_lift(dur, rng, sync=0.05, pan=0.0):
    """An apple lifted off a wooden table: tiny unloading tock of the wood, a little air."""
    n = N(dur)
    y = np.zeros((n, 2))
    tock = sumv(modal(rng, [260, 610, 1300], [0.03, 0.025, 0.02], [0.6, 0.4, 0.2], 0.08) * 0.25,
                burst(rng, 0.02, 0.002, lo=500, hi=3000) * 0.15)
    add_mono(y, tock, N(sync), pan)
    m = N(0.3)
    u = np.linspace(0, 1, m)
    add_mono(y, bp(rng.standard_normal(m), 200, 1500, 1) * np.sin(np.pi * u) ** 2 * 0.05, N(sync), pan)
    return out(y)


# ---------------------------------------------------------------- paper / books
def _flick(rng, strength=1.0):
    m = N(0.06)
    c = burst(rng, 0.004, 0.0006, lo=2000, hi=12000) * 0.7
    air = bp(rng.standard_normal(m), 500, 4500, 1) * np.exp(-tvec(m) / 0.018) * (1 - np.exp(-tvec(m) / 0.003))
    cr = bp(rng.standard_normal(m), 2500, 10000, 2) * crackle_env(m, rng, 1500, 0.0015) * np.exp(-tvec(m) / 0.02)
    x = air * 0.5 + cr * 0.4
    x[:len(c)] += c
    return hp(x, 300, 2) * strength


def gen_page_turn(dur, rng, sync=0.1, length=0.45, pan=0.0, strength=1.0):
    """One page turned by hand: lift rustle, swishing flip with air, soft slap as it lands."""
    n = N(dur)
    t = tvec(n)
    y = np.zeros((n, 2))
    u = np.clip((t - sync) / length, 0, 1)
    inwin = (t >= sync) & (t <= sync + length)
    vel = np.sin(np.pi * u) ** 2 * inwin
    paper = bp(rng.standard_normal(n), 1200, 10000, 2) * (crackle_env(n, rng, 300 + 2500 * vel, 0.002, 0.9) * vel + 0.2 * vel)
    air = bp(rng.standard_normal(n), 250, 2500, 2) * vel ** 2 * 0.6
    sig = hp(paper * 0.6 + air * np.std(paper) / (np.std(air) + 1e-12) * 0.5, 180, 2)
    pp = pan + 0.6 * (0.5 - u)
    y += pan2(sig, pp)
    slap = sumv(burst(rng, 0.04, 0.004, lo=300, hi=6000), 0.5 * burst(rng, 0.05, 0.008, hi=400))
    add_mono(y, slap * np.max(np.abs(sig)) / (np.max(np.abs(slap)) + 1e-12) * 0.7, N(sync + length * 0.92), pan - 0.3)
    return out(y * strength)


def gen_riffle(dur, rng, sync=0.05, n_pages=14, length=0.7, pan_from=0.35, pan_to=-0.35, decel=1.8):
    """Pages riffling past the thumb: a decelerating train of page flicks + paper flutter bed."""
    n = N(dur)
    t = tvec(n)
    y = np.zeros((n, 2))
    k = int(n_pages)
    u = (np.arange(k) / max(k - 1, 1)) ** decel
    ts = sync + length * u + rng.normal(0, 0.006, k)
    for j, tt in enumerate(ts):
        p = pan_from + (pan_to - pan_from) * j / max(k - 1, 1)
        add_mono(y, _flick(rng, rng.uniform(0.6, 1.0)), N(tt), p)
    w = np.clip((t - sync) / length, 0, 1)
    env = (t >= sync) * (1 - w) ** 1.5 * (t <= sync + length)
    fl = bp(rng.standard_normal(n), 800, 8000, 2) * crackle_env(n, rng, 1500 * env + 1, 0.002) * env * 0.25
    y += pan2(fl, pan_from + (pan_to - pan_from) * w)
    return out(y)


def gen_book_open(dur, rng, sync=0.3, pan=0.0):
    """A hardcover opened on a wooden stand: spine/leather creak (crackle, noise-based), the
    cover swinging (air), soft board landing, pages settling."""
    n = N(dur)
    t = tvec(n)
    y = np.zeros((n, 2))
    c0 = sync - 0.28
    u = np.clip((t - c0) / 0.28, 0, 1)
    win = (t >= c0) & (t <= sync)
    env = np.sin(np.pi * u) * win
    creak = bp(rng.standard_normal(n), 500, 4000, 2) * crackle_env(n, rng, 80 + 900 * env, 0.0025, 1.0) * env
    air = bp(rng.standard_normal(n), 150, 1500, 2) * (u ** 2 * win)
    y += pan2(creak * 0.8 + air * np.std(creak) / (np.std(air) + 1e-12) * 0.6, pan)
    land = sumv(modal(rng, [170, 390, 820], [0.06, 0.05, 0.03], [1, 0.6, 0.3], 0.2) * 0.7,
                burst(rng, 0.1, 0.012, attack=0.002, hi=450) * 1.0, burst(rng, 0.03, 0.003, lo=800, hi=7000) * 0.4)
    add_mono(y, land * np.max(np.abs(y)) / (np.max(np.abs(land)) + 1e-12) * 1.2, N(sync), pan - 0.25)
    m = N(0.35)
    settle = bp(rng.standard_normal(m), 1500, 9000, 2) * crackle_env(m, rng, 400, 0.002) * np.exp(-tvec(m) / 0.08)
    add_mono(y, settle * 0.3, N(sync + 0.02), pan)
    return out(y)


# ---------------------------------------------------------------- living things
def gen_bee(dur, rng, sync=None, f0=215.0, dist=0.6, pan_from=-0.8, pan_to=0.8, speed=1.5, gain_far=0.15):
    """Honeybee passing by: wingbeat buzz (noisy pulse train ~200-230 Hz) with amplitude,
    brightness and a slight Doppler from the fly-by geometry."""
    n = N(dur)
    t = tvec(n)
    sync = dur / 2 if sync is None else sync
    x = (t - sync) * speed
    r = np.sqrt(x ** 2 + dist ** 2)
    vr = np.gradient(r) * SR
    # wingbeat rate wanders as the bee manoeuvres (+-5 %), plus slow drift (+-6 %)
    f = f0 * (1 + 0.05 * rand_curve(dur, rng, 7.0)(t) + 0.06 * rand_curve(dur, rng, 0.8)(t)) * (1 - vr / 343.0)
    ph = TWO_PI * np.cumsum(f) / SR + 0.4 * lp(rng.standard_normal(n), 80, 1) * 8
    pulse = (0.5 + 0.5 * np.cos(ph)) ** 5
    pulse = pulse - pulse.mean()
    rough = 1 + 0.45 * lp(rng.standard_normal(n), 400, 1) * 3
    rough *= 1 + 0.2 * rand_curve(dur, rng, 12.0)(t)
    buzz = bp(pulse * rough, 150, 4500, 2) + 0.12 * bp(rng.standard_normal(n), 300, 3000, 1) * np.std(pulse)
    amp = (dist / r) ** 1.6
    bright = np.clip(dist / r, 0.2, 1)
    buzz = buzz * amp
    buzz = lp(buzz, 2500, 1) * (1 - bright) + buzz * bright
    p = np.interp(t, [0, dur], [pan_from, pan_to])
    env = smoothstep(t / 0.3) * smoothstep((dur - t) / 0.3)
    return out(pan2(buzz * env, p))


def gen_grass_brush(dur, rng, times=(), pans=None, amps=None):
    """Grass stems brushing past the lens as the camera glides through: quick soft swishes."""
    n = N(dur)
    y = np.zeros((n, 2))
    pans = pans if pans is not None else [rng.uniform(-0.8, 0.8) for _ in times]
    amps = amps if amps is not None else [1.0 for _ in times]
    for tt, p, a in zip(times, pans, amps):
        m = N(rng.uniform(0.15, 0.35))
        u = np.linspace(0, 1, m)
        env = np.sin(np.pi * u ** 0.7) ** 2
        s = bp(rng.standard_normal(m), 1200, 9000, 2) * (crackle_env(m, rng, 900, 0.002, 0.8) + 0.3) * env
        s += 0.4 * bp(rng.standard_normal(m), 300, 1500, 1) * env ** 2
        add_st(y, pan2(s, np.clip(p + 0.5 * (u - 0.5) * np.sign(p + 1e-3), -1, 1)) * a, N(tt))
    return out(y)


def gen_stalks_turn(dur, rng, sync=0.1, length=1.4, width=0.9):
    """A whole field of sunflowers turning: many overlapping stem creaks (noise-based friction,
    no pitch) and big papery leaves rustling, spread across the field."""
    n = N(dur)
    t = tvec(n)
    y = np.zeros((n, 2))
    k = 26
    for _ in range(k):
        t0 = sync + rng.uniform(0, length * 0.6)
        L = rng.uniform(0.35, 0.9)
        m = N(L)
        u = np.linspace(0, 1, m)
        env = np.sin(np.pi * u) ** 2
        d = rng.uniform(0.0, 1.0)
        cr = bp(rng.standard_normal(m), rng.uniform(250, 500), rng.uniform(1500, 3000), 2) * crackle_env(m, rng, rng.uniform(150, 600), 0.003, 1.0) * env
        lf = bp(rng.standard_normal(m), 600, 6000, 2) * (crackle_env(m, rng, 500, 0.004) + 0.3) * env * 0.5
        s = (cr + lf) * 10 ** (-d * 0.8)
        s = lp(s, 9000 * (1 - 0.6 * d), 1)
        add_mono(y, s, N(t0), rng.uniform(-width, width))
    return out(y)


def gen_dry_ticks(dur, rng, rate=3.0, width=0.8):
    """Parched ground: rare tiny dry ticks of contracting soil / dry grass in the heat."""
    n = N(dur)
    y = np.zeros((n, 2))
    for tt in poisson_times(dur, lambda x: rate + 0 * x, rate, rng):
        c = burst(rng, 0.006, rng.uniform(0.0004, 0.0012), lo=2500, hi=11000)
        add_mono(y, c, N(tt), rng.uniform(-width, width), rng.lognormal(0, 0.6))
    return out(y)


# ---------------------------------------------------------------- transitions / accents / UI
def gen_whoosh(dur, rng, sync=None, f_from=300.0, f_peak=1800.0, f_to=500.0, pan_from=-0.6, pan_to=0.6,
               bw=1.4, rough=0.3, skew=0.6, muffle_end=None):
    """Transition whoosh: a band of noise whose centre moves (no pitch), bell envelope peaking at
    sync, stereo travel, light turbulence."""
    n = N(dur)
    t = tvec(n)
    sync = dur * skew if sync is None else sync

    def fc(tt):
        a = np.clip(tt / max(sync, 1e-3), 0, 1)
        b = np.clip((tt - sync) / max(dur - sync, 1e-3), 0, 1)
        lf = np.where(tt < sync, np.log(f_from) + (np.log(f_peak) - np.log(f_from)) * smoothstep(a),
                      np.log(f_peak) + (np.log(f_to) - np.log(f_peak)) * smoothstep(b))
        return np.exp(lf)

    def env(tt):
        a = np.clip(tt / max(sync, 1e-3), 0, 1)
        b = np.clip((tt - sync) / max(dur - sync, 1e-3), 0, 1)
        return np.where(tt < sync, a ** 2.2, (1 - b) ** 1.8)
    tr = rand_curve(dur, rng, 25.0)

    def mag(T, F):
        c = fc(T)
        return env(T) * (1 + rough * 0.5 * tr(T)) * np.exp(-0.5 * (np.log2(F / c) / (bw / 2)) ** 2) * m_hp(F, 60, 2)
    L = shaped_noise(n, mag, rng)
    R = shaped_noise(n, mag, rng)
    p = np.interp(t, [0, dur], [pan_from, pan_to])
    gl, gr = _pg(p)
    m = 0.5 * (L + R)
    s = 0.5 * (L - R) * 0.4
    y = np.stack([(m + s) * gl * np.sqrt(2), (m - s) * gr * np.sqrt(2)], 1)
    return out(y)


def gen_bloom(dur, rng, sync=0.6, rise=0.5, decay=2.2, bright=1.0, low=0.3, width=0.9):
    """'Air bloom' for a light reveal: a soft broadband swell of air (brightening then darkening)
    with a gentle low cushion. No pitch, no build-up: a breath, not a riser."""
    n = N(dur)
    t = tvec(n)

    def env(tt):
        a = np.clip((tt - (sync - rise)) / rise, 0, 1)
        return np.where(tt < sync, a ** 2, np.exp(-(tt - sync) / (decay / 3)))

    def mag(T, F):
        e = env(T)
        fc = 1200 + 5000 * bright * e
        return e * (m_hp(F, 50, 2) * m_lp(F, fc, 1) * m_tilt(F, -3.0, 500) + low * e * m_lp(F, 140, 2) * m_hp(F, 30, 2))
    return out(ms(shaped_noise(n, mag, rng), shaped_noise(n, mag, rng), width))


def gen_sub(dur, rng, sync=0.3, decay=2.0, body=0.5, air=0.0, pre=0.0):
    """Deep noise-based impact for a big reveal: low-passed noise with an exponential tail
    (no oscillator, no pitch sweep), a 90-220 Hz body so it survives phone speakers, a faint
    air tail.  pre>0 adds a short inhaled swell before the hit."""
    n = N(dur)
    t = tvec(n)
    tt = np.clip(t - sync, 0, None)
    e = (t >= sync) * (1 - np.exp(-tt / 0.012)) * np.exp(-tt / (decay / 4.0))
    low = lp(brown(n, rng), 75, 4) * e
    low2 = lp(brown(n, rng), 75, 4) * e
    b = bp(rng.standard_normal(n), 90, 240, 2) * (t >= sync) * (1 - np.exp(-tt / 0.006)) * np.exp(-tt / 0.18)
    y = np.stack([low, low2], 1) + body * np.stack([b, b], 1) * np.std(low) / (np.std(b) + 1e-12) * 2
    if air:
        ea = (t >= sync) * (1 - np.exp(-tt / 0.15)) * np.exp(-tt / (decay / 3))
        a = lp(hp(rng.standard_normal((n, 2)), 1500, 2), 5000, 2) * ea[:, None]
        y += air * a * np.std(low) / (np.std(a) + 1e-12)
    if pre:
        u = np.clip((t - (sync - pre)) / pre, 0, 1) * (t < sync)
        sw = lp(brown(n, rng), 160, 2) * u ** 3
        y += np.stack([sw, sw], 1) * 0.6 * np.std(low) / (np.std(sw) + 1e-12)
    return out(y)


def gen_ui_tick(dur, rng, sync=0.02, kind="ring", pan=0.0, bright=1.0):
    """Very subtle interface tick for on-screen tracking rings / callouts: a 2-5 ms band-limited
    click with a soft low 'tock' body. kind: ring | callout | link."""
    n = N(dur)
    y = np.zeros((n, 2))
    if kind == "ring":
        c = sumv(burst(rng, 0.016, 0.0018, attack=0.0005, lo=2200 * bright, hi=8000) * 0.8,
                 0.35 * burst(rng, 0.024, 0.004, attack=0.0008, lo=500, hi=1400))
    elif kind == "callout":
        c = sumv(burst(rng, 0.014, 0.0015, attack=0.0005, lo=2000 * bright, hi=8000) * 0.7,
                 (burst(rng, 0.014, 0.0013, attack=0.0005, lo=2600 * bright, hi=8500) * 0.45, N(0.022)),
                 0.3 * burst(rng, 0.02, 0.003, lo=450, hi=1200))
    else:  # link
        c = burst(rng, 0.014, 0.0014, attack=0.0005, lo=2800 * bright, hi=9000) * 0.6
    add_mono(y, c, N(sync), pan)
    return out(y)


GEN = {k[4:]: v for k, v in list(globals().items()) if k.startswith("gen_") and callable(v)}
