#!/usr/bin/env python3
"""
make_sfx.py - procedural, licence-free soft foley library for a calm,
hand-painted (watercolour-pencil) animation.

Everything is synthesised from seeded noise, damped modal resonators and
granular processes (no samples, no downloads), so the output is fully
reproducible and free of third-party rights.

    python3 make_sfx.py            # render all WAVs + manifest + QC + spectrogram sheet
    python3 make_sfx.py --no-plot  # skip the spectrogram contact sheet

Output: 48 kHz / 24-bit PCM WAV, mono (room_tone is stereo),
each peak-normalised to -3 dBFS, with raised-cosine fades at both ends.

Requires: numpy, scipy (and matplotlib for the contact sheet).
"""
import json
import os
import sys
import wave
import zlib

import numpy as np
from scipy import signal
from scipy.interpolate import CubicSpline

SR = 48000
PEAK_DB = -3.0
OUT = os.path.dirname(os.path.abspath(__file__))


# --------------------------------------------------------------------------
# basic helpers
# --------------------------------------------------------------------------
def n_of(sec):
    return int(round(sec * SR))


def rng_for(name):
    return np.random.default_rng(zlib.crc32(name.encode()))


def white(n, rng):
    return rng.standard_normal(n)


def colored(n, rng, alpha):
    """Gaussian noise with power spectrum ~ 1/f^alpha (0 white, 1 pink, 2 brown)."""
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = f[1]
    X *= f ** (-alpha / 2)
    x = np.fft.irfft(X, n)
    return x / (np.std(x) + 1e-12)


def spectral_noise(n, rng, mag_fn):
    """Stationary noise with an arbitrary magnitude response mag_fn(f)."""
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    x = np.fft.irfft(X * mag_fn(f), n)
    return x / (np.std(x) + 1e-12)


def smooth_rand(n, rate, rng):
    """Smooth random control curve (zero mean, ~unit std, bandwidth ~rate Hz)."""
    dur = n / SR
    k = max(5, int(np.ceil(dur * rate)) + 4)
    pts = rng.standard_normal(k)
    tp = (np.arange(k) - 1.5) / rate
    return CubicSpline(tp, pts)(np.arange(n) / SR)


def rms(x):
    return float(np.sqrt(np.mean(np.square(x)) + 1e-20))


def nrm(x):
    return x / rms(x)


def pkn(x):
    return x / (np.max(np.abs(x)) + 1e-20)


def _sos(kind, freq, order):
    return signal.butter(order, freq, btype=kind, fs=SR, output="sos")


def bandpass(x, lo, hi, order=2):
    return signal.sosfilt(_sos("bandpass", [lo, min(hi, 0.45 * SR)], order), x)


def lowpass(x, fc, order=2):
    return signal.sosfilt(_sos("lowpass", fc, order), x)


def highpass(x, fc, order=2):
    return signal.sosfilt(_sos("highpass", fc, order), x)


def resonator(x, f0, q):
    b, a = signal.iirpeak(f0, q, fs=SR)
    return signal.lfilter(b, a, x)


def lgauss(f, fc, oct_sigma):
    """Gaussian band on a log2-frequency axis (broad, natural-sounding band)."""
    lf = np.log2(np.maximum(f, 1.0) / fc)
    return np.exp(-0.5 * (lf / oct_sigma) ** 2)


def hf_roll(f, fc, order=2):
    return 1.0 / np.sqrt(1.0 + (f / fc) ** (2 * order))


def lf_roll(f, fc, order=2):
    return 1.0 / np.sqrt(1.0 + (fc / np.maximum(f, 1.0)) ** (2 * order))


def fade_curve(m):
    """Raised-cosine rise from exactly 0 to ~1 over m samples."""
    return 0.5 - 0.5 * np.cos(np.pi * np.arange(m) / m)


def env_ar(n, attack, release, pa=1.0, pr=1.0, rel_k=None):
    """Attack/release envelope. With rel_k the release is exponential-like
    (roughly linear in dB, about rel_k*4.3 dB over the release) ending at 0."""
    e = np.ones(n)
    na, nr = n_of(attack), n_of(release)
    if na:
        e[:na] *= fade_curve(na) ** pa
    if nr:
        if rel_k:
            x = np.arange(1, nr + 1) / nr
            e[-nr:] *= (np.exp(-rel_k * x) - np.exp(-rel_k)) / (1 - np.exp(-rel_k))
        else:
            e[-nr:] *= fade_curve(nr)[::-1] ** pr
    return e


def burst_env(n, attack, decay):
    """Smooth onset (starts at 0) followed by an exponential decay; peak = 1."""
    t = np.arange(n) / SR
    e = (1 - np.exp(-t / attack)) ** 2 * np.exp(-t / decay)
    return e / e.max()


def bump(t, centre, width, power=1.0):
    """Raised-cosine bump (0 outside centre +- width/2)."""
    u = (t - centre) / width
    e = np.where(np.abs(u) < 0.5, 0.5 + 0.5 * np.cos(2 * np.pi * u), 0.0)
    return e ** power


def place(buf, sig, t0, gain=1.0):
    i = n_of(t0)
    if i < 0:
        sig = sig[-i:]
        i = 0
    j = min(len(buf), i + len(sig))
    if j > i:
        buf[i:j] += gain * sig[: j - i]
    return buf


def tv_shape(x, gain_fn, nper=1024, hop=256):
    """Time-varying spectral shaping by STFT overlap-add.
    gain_fn(f[1,F], t[T,1]) -> gains (T,F); t is the frame-centre time in s."""
    n = len(x)
    win = np.hanning(nper + 1)[:-1]
    pad = nper
    xp = np.concatenate([np.zeros(pad), x, np.zeros(pad + hop)])
    nfr = (len(xp) - nper) // hop + 1
    idx = np.arange(nper)[None, :] + hop * np.arange(nfr)[:, None]
    Z = np.fft.rfft(xp[idx] * win, axis=1)
    f = np.fft.rfftfreq(nper, 1 / SR)
    tt = (np.arange(nfr) * hop + nper / 2 - pad) / SR
    G = gain_fn(f[None, :], tt[:, None])
    yf = np.fft.irfft(Z * G, nper, axis=1) * win
    y = np.zeros(len(xp))
    ws = np.zeros(len(xp))
    for i in range(nfr):
        y[i * hop: i * hop + nper] += yf[i]
        ws[i * hop: i * hop + nper] += win ** 2
    y /= np.maximum(ws, 1e-6)
    return y[pad: pad + n]


def poisson_impulses(rate, rng, sigma=0.6, cap=2.5, signed=True):
    """Impulse train with time-varying Poisson rate (events/s, per sample) and
    log-normal amplitudes (tail capped to avoid single harsh spikes)."""
    n = len(rate)
    ev = rng.random(n) < np.clip(rate, 0, None) / SR
    z = np.clip(rng.standard_normal(n), -cap, cap)
    amp = np.exp(sigma * z)
    if signed:
        amp *= np.where(rng.random(n) < 0.5, -1.0, 1.0)
    out = np.zeros(n)
    out[ev] = amp[ev]
    return out


def soften(x, ms):
    """Short Hann smoothing kernel - rounds off grain edges (gentle lowpass)."""
    L = max(3, n_of(ms / 1000.0))
    k = np.hanning(L + 2)[1:-1]
    return np.convolve(x, k / k.sum(), mode="same")


def soft_pulse(tau, k=2):
    """Gamma-shaped contact force pulse t^k e^(-t/tau): smooth onset, no click."""
    L = n_of(tau * (k + 1) * 10) + 2
    t = np.arange(L) / SR
    p = (t / tau) ** k * np.exp(-t / tau)
    return p / p.sum()


def modal_ir(n, modes, rng=None):
    """Sum of exponentially damped sinusoids. modes: [(freq Hz, tau s, amp)].
    With rng the mode phases are randomised (less coherent, softer onset peak)."""
    t = np.arange(n) / SR
    y = np.zeros(n)
    for f, tau, a in modes:
        ph = 0.0 if rng is None else rng.uniform(0, 2 * np.pi)
        y += a * np.exp(-t / tau) * np.sin(2 * np.pi * f * t + ph)
    return y


def strike(dur, modes, tau_c, k=2, rng=None):
    """Soft contact pulse convolved with a modal impulse response (always starts at 0)."""
    n = n_of(dur)
    return signal.fftconvolve(soft_pulse(tau_c, k), modal_ir(n, modes, rng))[:n]


def jitter_modes(modes, rng, fj=0.04, tj=0.1, aj=0.15, fscale=1.0):
    return [(f * fscale * (1 + fj * rng.uniform(-1, 1)),
             tau * (1 + tj * rng.uniform(-1, 1)),
             a * (1 + aj * rng.uniform(-1, 1))) for f, tau, a in modes]


def event_times(rate, rng):
    return np.nonzero(rng.random(len(rate)) < np.clip(rate, 0, None) / SR)[0] / SR


def grain_cloud(n, times, amps, sources, probs, len_range, rng):
    """Overlap-add Hann-windowed snippets of pre-filtered noise sources."""
    y = np.zeros(n)
    for t0, a in zip(times, amps):
        src = sources[rng.choice(len(sources), p=probs)]
        L = max(8, n_of(rng.uniform(*len_range)))
        i = n_of(t0)
        if i + L >= n:
            continue
        o = rng.integers(0, len(src) - L)
        y[i: i + L] += a * np.hanning(L) * src[o: o + L]
    return y


def grit(n, t_start, count, spread, rng, band=(1500, 6000), dur_ms=(0.7, 2.2),
         level=1.0, decay=0.05, sigma=0.6):
    """Sparse tiny grit/grain contacts after an impact (exponentially thinning)."""
    src = bandpass(white(n_of(0.5), rng), band[0], band[1], 3)
    dt = rng.exponential(spread, count)
    times = t_start + dt
    amps = level * np.exp(sigma * np.clip(rng.standard_normal(count), -2, 2)) * np.exp(-dt / decay)
    return grain_cloud(n, times, amps, [src], [1.0], (dur_ms[0] / 1000, dur_ms[1] / 1000), rng)


def bubble(f0, tau, xi, rng):
    """Tiny liquid bubble: damped sine with slightly rising pitch (Minnaert-style)."""
    L = n_of(6 * tau)
    t = np.arange(L) / SR
    freq = f0 * (1 + xi * t / tau)
    ph = 2 * np.pi * np.cumsum(freq) / SR
    env = (1 - np.exp(-t / 0.0004)) ** 2 * np.exp(-t / tau)
    return np.sin(ph) * env


# --------------------------------------------------------------------------
# room
# --------------------------------------------------------------------------
def room_ir(rng, rt=(0.30, 0.24, 0.15), length=0.7, er_level=0.6):
    """Small, soft, absorptive room: a few early reflections plus a diffuse
    tail whose decay is frequency dependent (highs die first)."""
    n = n_of(length)
    t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    lo = lowpass(nz, 500, 2)
    mid = bandpass(nz, 500, 3500, 2)
    hi = highpass(nz, 3500, 2)
    ir = (lo * np.exp(-6.91 * t / rt[0]) + mid * np.exp(-6.91 * t / rt[1])
          + hi * np.exp(-6.91 * t / rt[2]))
    ir *= 1 - np.exp(-t / 0.007)
    diffuse_e = np.sum(ir ** 2)
    A = er_level * np.sqrt(diffuse_e)
    for d_ms, g in [(2.9, .42), (5.1, .35), (7.6, .30), (10.8, .24),
                    (14.1, .19), (18.7, .15), (23.5, .11)]:
        ir[n_of(d_ms / 1000)] += g * A * (1 if rng.random() < 0.5 else -1)
    ir = lowpass(ir, 8000, 2)
    return ir / np.sqrt(np.sum(ir ** 2))


def add_room(x, rng, wet=0.11, rt=(0.30, 0.24, 0.15)):
    ir = room_ir(rng, rt=rt, length=max(0.4, 3 * max(rt)))
    return x + wet * signal.fftconvolve(x, ir)[: len(x)]


# --------------------------------------------------------------------------
# finishing + IO
# --------------------------------------------------------------------------
def finalize(x, fade_in=0.005, fade_out=0.03, hp=35.0, lp=15000.0):
    x = np.atleast_2d(np.asarray(x, dtype=float).T).T.copy()  # (n, ch)
    for c in range(x.shape[1]):
        y = highpass(x[:, c], hp, 2)
        if lp:
            y = lowpass(y, lp, 2)
        ni, no = max(n_of(fade_in), 1), max(n_of(fade_out), 1)
        y[:ni] *= fade_curve(ni)
        y[-no:] *= fade_curve(no)[::-1]
        x[:, c] = y
    x *= 10 ** (PEAK_DB / 20) / np.max(np.abs(x))
    return x[:, 0] if x.shape[1] == 1 else x


def write_wav24(path, x):
    x = np.atleast_2d(np.asarray(x).T).T
    q = np.clip(np.round(x * 8388607.0), -8388608, 8388607).astype("<i4")
    raw = q.reshape(-1).view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with wave.open(path, "wb") as w:
        w.setnchannels(x.shape[1])
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(raw)


def read_wav24(path):
    with wave.open(path, "rb") as w:
        ch, sw, sr, nf = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(nf)
    assert sw == 3
    b = np.frombuffer(raw, np.uint8).reshape(-1, 3)
    i32 = (b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8)
           | (b[:, 2].astype(np.int32) << 16))
    i32 = np.where(i32 >= 1 << 23, i32 - (1 << 24), i32)
    return (i32 / 8388608.0).reshape(-1, ch), sr, sw * 8


# --------------------------------------------------------------------------
# sound designs
# --------------------------------------------------------------------------
def pencil_core(dur, rng, speed=1.0, press=1.0, attack=0.025, release=None,
                bright=1.0, wobble=0.15, speed_var=0.08, speed_rate=6.0, tooth=1.0, swell=0.0):
    """One coloured-pencil stroke on cold-press paper.
    friction noise (band follows speed) + paper-tooth contact grains + faint
    low-mid body, all riding a pressure curve."""
    n = n_of(dur)
    t = np.arange(n) / SR
    u = t / dur
    release = 0.32 * dur if release is None else release
    p = env_ar(n, attack, release, 1.2, rel_k=4.0) * (1 - 0.18 * u)  # pressure eases off, then lift-off taper
    if swell:
        p *= np.clip(1 + swell * smooth_rand(n, 1.3, rng), 0.4, None)
    p *= np.clip(1 + wobble * smooth_rand(n, 9, rng), 0.3, None)
    s = (0.62 + 0.38 * np.sin(np.pi * u)) * np.clip(
        1 + speed_var * smooth_rand(n, speed_rate, rng), 0.3, None)
    fc = 2100 * bright * (0.8 + 0.3 * s)
    fr = tv_shape(white(n, rng),
                  lambda f, tt: lgauss(f, np.interp(tt, t, fc), 0.9) * hf_roll(f, 7000))
    # micro-roughness of the paper: fast random amplitude flutter of the friction
    am = np.clip(1 + 0.35 * smooth_rand(n, 160 * speed, rng), 0.0, None)
    imp = poisson_impulses(1300 * speed * s, rng, sigma=0.45)
    gr = lowpass(bandpass(soften(imp, 0.18), 1100 * bright, 5500 * bright, 2), 7500, 2)
    body = bandpass(white(n, rng), 250, 1000, 2)
    y = 0.62 * nrm(fr) * am + 0.5 * tooth * nrm(gr) + 0.12 * nrm(body)
    return y * p * press * (0.7 + 0.3 * s)


def pencil_stroke(name, active, pre=0.012, total=None, **kw):
    rng = rng_for(name)
    total = total or active + 0.09
    buf = np.zeros(n_of(total))
    place(buf, pencil_core(active, rng, **kw), pre)
    buf = add_room(buf, rng, wet=0.09)
    return finalize(buf, fade_out=0.02)


def pencil_hatch(name, n_strokes, total=1.2):
    rng = rng_for(name)
    buf = np.zeros(n_of(total))
    t = 0.012
    for i in range(n_strokes):
        d = rng.uniform(0.085, 0.125)
        down = i % 2 == 0
        press = (1.0 if down else 0.8) * rng.uniform(0.9, 1.05) * (1 - 0.25 * i / n_strokes)
        s = pencil_core(d, rng, speed=1.3, press=press, attack=0.012,
                        bright=1.04 if down else 0.93, wobble=0.12)
        place(buf, s, t)
        t += d + rng.uniform(0.035, 0.06)
    buf = add_room(buf, rng, wet=0.09)
    return finalize(buf, fade_out=0.02)


def pencil_long(name, total=1.8):
    rng = rng_for(name)
    buf = np.zeros(n_of(total))
    s = pencil_core(1.64, rng, speed=0.6, press=1.0, attack=0.06, release=0.22,
                    bright=0.9, wobble=0.16, speed_var=0.25, speed_rate=1.6, swell=0.16)
    place(buf, s, 0.015)
    buf = add_room(buf, rng, wet=0.09)
    return finalize(buf, fade_out=0.025)


def brush_wet(name, total=1.0, active=0.8, sweep=(950, 1650, 1150), wet_rate=150):
    """Wet round brush sweeping across paper: soft liquid swish, bristle flutter,
    soft wet ticks and a few tiny bubbles; gentle 'squish' at touch-down."""
    rng = rng_for(name)
    na = n_of(active)
    t = np.arange(na) / SR
    u = t / active
    e = env_ar(na, 0.09, 0.32, 1.6, rel_k=4.5) * (1 - 0.3 * u) * np.clip(
        1 + 0.12 * smooth_rand(na, 7, rng), 0.5, None)
    # centre frequency: log-interpolated through three points + small liquid wobble
    lf = np.interp(u, [0, 0.45, 1.0], np.log(sweep))
    fc = np.exp(lf) * (1 + 0.12 * smooth_rand(na, 28, rng))
    sw = tv_shape(colored(na, rng, 0.6),
                  lambda f, tt: lgauss(f, np.interp(tt, t, fc), 1.2) * hf_roll(f, 5200, 2))
    sw *= np.clip(1 + 0.22 * smooth_rand(na, 32, rng), 0.2, None)
    ticks = bandpass(soften(poisson_impulses(wet_rate * e, rng, sigma=0.6) * e, 0.5), 600, 3000, 2)
    bub = np.zeros(na)
    for _ in range(int(rng.integers(10, 16))):
        i = int(rng.choice(na, p=e / e.sum()))
        b = bubble(rng.uniform(1300, 3400), rng.uniform(0.002, 0.005), rng.uniform(0.04, 0.1), rng)
        place(bub, b * rng.uniform(0.4, 1.0) * e[i], i / SR)
    squish = bandpass(white(na, rng), 150, 900, 2) * burst_env(na, 0.02, 0.06)
    y = 0.75 * nrm(sw) * e + 0.28 * nrm(ticks) + 0.3 * pkn(bub) + 0.15 * nrm(squish)
    buf = np.zeros(n_of(total))
    place(buf, y, 0.012)
    buf = add_room(buf, rng, wet=0.1)
    return finalize(buf, fade_out=0.03, lp=12000)


def water_bloom(name, total=1.5):
    """Pigment blooming into wet paper: faint wet bed with tiny crackles,
    micro-bubbles and a couple of minute drips; density swells then thins."""
    rng = rng_for(name)
    n = n_of(total)
    t = np.arange(n) / SR
    dens = (1 - np.exp(-t / 0.14)) * np.exp(-t / 0.5)
    dens /= dens.max()
    dens *= env_ar(n, 0.0, 0.4, 1.0, 1.5)
    bed = tv_shape(colored(n, rng, 1.0),
                   lambda f, tt: lgauss(f, 1400, 1.0) * hf_roll(f, 5000))
    bed *= dens ** 0.8 * np.clip(1 + 0.2 * smooth_rand(n, 6, rng), 0.3, None)
    cr = bandpass(soften(poisson_impulses(220 * dens, rng, sigma=0.45, cap=2.0) * (0.5 + 0.5 * dens), 0.3),
                  1800, 6000, 2)
    bub = np.zeros(n)
    for _ in range(26):
        i = int(rng.choice(n, p=dens / dens.sum()))
        b = bubble(rng.uniform(2000, 4800), rng.uniform(0.0012, 0.0035), rng.uniform(0.04, 0.12), rng)
        place(bub, b * rng.uniform(0.25, 1.0) * (0.5 + 0.5 * dens[i]), i / SR)
    for tc in (0.21, 0.58, 0.97):
        b = bubble(rng.uniform(1100, 1700), rng.uniform(0.006, 0.009), 0.06, rng)
        place(bub, lowpass(b, 3500) * 0.45, tc + rng.uniform(-0.03, 0.03))
    y = 0.15 * pkn(bed) + 0.4 * pkn(cr) + 0.4 * pkn(bub)
    buf = np.zeros(n)
    place(buf, y, 0.01)
    buf = add_room(buf, rng, wet=0.13)
    return finalize(buf, fade_out=0.05, lp=10000)


def whoosh(name, total, f_lo, f_hi, peak=0.55, a=2.2, sigma=1.35, air=0.12):
    """Soft air movement: pink-ish noise in a broad band whose centre rises and
    falls with the motion envelope, light turbulence, faint airy top."""
    rng = rng_for(name)
    n = n_of(total)
    t = np.arange(n) / SR
    u = np.arange(n) / (n - 1)
    b = a * (1 - peak) / peak
    e = (u ** a) * ((1 - u) ** b)
    e /= e.max()
    fc = f_lo * (f_hi / f_lo) ** e
    body = tv_shape(0.85 * colored(n, rng, 1.0) + 0.15 * white(n, rng),
                    lambda f, tt: lgauss(f, np.interp(tt, t, fc), sigma) * lf_roll(f, 70))
    hiss = tv_shape(white(n, rng),
                    lambda f, tt: lgauss(f, 3.2 * np.interp(tt, t, fc), 0.8) * hf_roll(f, 7000))
    turb = np.clip(1 + 0.1 * smooth_rand(n, 13, rng), 0.5, None)
    y = (nrm(body) + air * nrm(hiss) * e ** 0.5) * e * turb
    y = add_room(y, rng, wet=0.05)
    return finalize(y, fade_in=0.01, fade_out=0.04, lp=12000)


def pop_soft(name, body_f, centre, tau_c, felt=0.25, total=0.12):
    """Fingertip tap on paper / felt: soft contact pulse into a damped body mode
    plus a cluster of very low-Q paper modes (no clear pitch), a little felt
    texture and a small air puff."""
    rng = rng_for(name)
    n = n_of(total)
    modes = [(body_f, 0.007, 0.5)]
    for f in centre * 2 ** rng.uniform(-1.3, 1.3, 6):
        modes.append((f, rng.uniform(0.0025, 0.0045) * np.sqrt(1000 / f), float(lgauss(f, centre, 1.0))))
    y = pkn(strike(total, modes, tau_c, k=1, rng=rng))
    tex = bandpass(white(n, rng), 700, 3500, 3) * burst_env(n, 0.0015, 0.005)
    puff = bandpass(white(n, rng), 200, 1100, 2) * burst_env(n, 0.001, 0.008)
    y = y + felt * pkn(tex) + 0.2 * pkn(puff)
    buf = np.zeros(n)
    place(buf, y, 0.007)
    buf = add_room(buf, rng, wet=0.07, rt=(0.2, 0.16, 0.1))
    return finalize(buf, fade_out=0.025, lp=7000)


def chime_light(name, total=3.0):
    """Warm, airy shimmer: a cluster of inharmonic bell partials (each a slowly
    beating pair) with soft swelled onsets, the same partials sung by breathy
    resonant noise, and a light high-air sparkle. All start together - no tune."""
    rng = rng_for(name)
    n = n_of(total)
    t = np.arange(n) / SR
    f0 = 930.0
    parts = [(0.53, 0.30, 2.6), (1.0, 1.0, 2.5), (1.475, 0.65, 2.15), (2.116, 0.45, 1.8),
             (2.818, 0.30, 1.5), (3.643, 0.19, 1.2), (4.524, 0.11, 0.95), (5.71, 0.06, 0.75)]
    tones = np.zeros(n)
    for r, a, t60 in parts:
        f = f0 * r
        d = rng.uniform(0.0, 0.045)
        att = rng.uniform(0.05, 0.1)
        tt = np.clip(t - d, 0, None)
        env = (1 - np.exp(-tt / att)) ** 2 * np.exp(-tt * 6.91 / t60)
        df = rng.uniform(0.35, 1.3)
        p1, p2 = rng.uniform(0, 2 * np.pi, 2)
        tones += a * env * (np.sin(2 * np.pi * (f - df / 2) * tt + p1)
                            + 0.8 * np.sin(2 * np.pi * (f + df / 2) * tt + p2)) / 1.8
    exc = white(n, rng) * burst_env(n, 0.07, 0.55)
    res = np.zeros(n)
    for r, a, _ in parts:
        res += a * nrm(resonator(exc, f0 * r, 38))
    air_env = burst_env(n, 0.09, 0.42)
    air = bandpass(white(n, rng), 4500, 11000, 2) * air_env * np.clip(
        1 + 0.4 * smooth_rand(n, 16, rng), 0.0, None)
    spark = bandpass(soften(poisson_impulses(60 * air_env, rng, sigma=0.5), 0.12), 5000, 10000, 2)
    W = slice(0, n_of(1.0))
    y = (0.55 * tones / rms(tones[W]) + 0.38 * res / rms(res[W])
         + 0.10 * air / rms(air[W]) + 0.05 * spark / (rms(spark[W]) + 1e-9))
    buf = np.zeros(n)
    place(buf, y, 0.01)
    buf = add_room(buf, rng, wet=0.2, rt=(0.8, 0.7, 0.45))
    return finalize(buf, fade_in=0.01, fade_out=0.3, lp=11000)


def sand_trickle(name, total=2.0):
    """Fine sand running through an hourglass neck: dense tiny grain ticks,
    a lower pile-settling stream, faint glass colouring, slow flow wander."""
    rng = rng_for(name)
    n = n_of(total)
    flow = env_ar(n, 0.3, 0.45, 1.2, 1.2) * np.clip(
        1 + 0.12 * smooth_rand(n, 4, rng) + 0.06 * smooth_rand(n, 15, rng), 0.3, None)
    imp1 = poisson_impulses(6500 * (0.6 + 0.4 * flow), rng, sigma=0.7)
    g1 = lowpass(bandpass(soften(imp1, 0.12), 2000, 7000, 2), 8000, 2)
    imp2 = poisson_impulses(2500 * np.ones(n), rng, sigma=0.6)
    g2 = bandpass(soften(imp2, 0.2), 900, 3500, 2)
    glass = sum(resonator(g1, f, 18) * a for f, a in [(2950, 1.0), (4720, 0.7), (7310, 0.4)])
    hiss = bandpass(white(n, rng), 2500, 7000, 2)
    y = (0.7 * nrm(g1) + 0.35 * nrm(g2) + 0.12 * nrm(glass) + 0.15 * nrm(hiss)) * flow
    y = add_room(y, rng, wet=0.07)
    return finalize(y, fade_in=0.01, fade_out=0.05, lp=9000)


def stone_set(name, settle=False, total=0.5):
    """Stone block set down gently on stone/earth: soft heavy contact into
    damped low modes, short mid knock, a little grit trickling after."""
    rng = rng_for(name)
    n = n_of(total)
    t0 = 0.03 if not settle else 0.045
    base = [(95, 0.034, 0.8), (165, 0.027, 0.85), (310, 0.016, 0.75), (560, 0.009, 0.55),
            (980, 0.005, 0.32), (1700, 0.003, 0.15), (2600, 0.002, 0.06)]
    buf = np.zeros(n)
    th = pkn(strike(0.4, jitter_modes(base, rng), 0.0003, k=1))
    noise = bandpass(white(n_of(0.2), rng), 150, 1800, 2) * burst_env(n_of(0.2), 0.0015, 0.016)
    place(buf, th + np.pad(0.3 * pkn(noise), (0, n_of(0.2))), t0)
    buf += grit(n, t0 + 0.002, 24, 0.035, rng, band=(1500, 6000), level=0.1, decay=0.06)
    if settle:
        buf += grit(n, t0 - 0.03, 6, 0.008, rng, band=(1800, 6000), level=0.05, decay=0.02)
        th2 = pkn(strike(0.3, jitter_modes(base, rng, fscale=1.08), 0.00035, k=1))
        place(buf, th2, t0 + 0.068, 0.32)
        buf += grit(n, t0 + 0.07, 8, 0.025, rng, band=(1500, 6000), level=0.05, decay=0.04)
    buf = add_room(buf, rng, wet=0.11, rt=(0.32, 0.25, 0.15))
    return finalize(buf, fade_out=0.06, lp=9000)


def cloth_curtain(name, total=1.3):
    """Heavy fabric curtain drawn and dropping: soft fabric rustle grains,
    a low air swoosh, and a gentle low 'flump' as it settles."""
    rng = rng_for(name)
    n = n_of(total)
    t = np.arange(n) / SR
    m = 0.95 * bump(t, 0.42, 0.78, 1.2) + 0.3 * bump(t, 0.8, 0.46, 1.0) + 0.08 * bump(t, 1.0, 0.3)
    srcs = [bandpass(white(n_of(1.0), rng), lo, hi, 4)
            for lo, hi in [(400, 1000), (750, 1800), (1300, 3000), (2300, 5000)]]
    times = event_times(220 * m, rng)
    amps = np.exp(0.35 * rng.standard_normal(len(times))) * np.interp(times, t, m)
    rustle = lowpass(grain_cloud(n, times, amps, srcs, [0.4, 0.33, 0.2, 0.07], (0.006, 0.028), rng), 6000, 2)
    motion = bump(t, 0.47, 0.9, 1.3)
    sw = tv_shape(colored(n, rng, 1.4),
                  lambda f, tt: lgauss(f, 150 * (1 + 2.2 * np.interp(tt, t, motion)), 1.2) * lf_roll(f, 60))
    sw *= motion
    fl_n = n_of(0.35)
    flump = (bandpass(white(fl_n, rng), 70, 450, 2) * burst_env(fl_n, 0.02, 0.07)
             + 0.6 * pkn(strike(0.35, [(105, 0.04, 1.0), (190, 0.025, 0.5), (340, 0.012, 0.2)], 0.004)))
    y = 0.55 * nrm(rustle) + 0.42 * nrm(sw)
    place(y, 0.45 * pkn(flump) * np.max(np.abs(y)), 0.79)
    buf = np.zeros(n)
    place(buf, y, 0.0)
    buf = add_room(buf, rng, wet=0.12, rt=(0.35, 0.28, 0.16))
    return finalize(buf, fade_in=0.01, fade_out=0.06, lp=9000)


def coin_glint(name, total=0.6):
    """A coin settling with a few ever-smaller, ever-more-damped contacts.
    Soft-onset split (beating) partials give the glint; strongly low-passed."""
    rng = rng_for(name)
    n = n_of(total)
    t = np.arange(n) / SR
    modes = [(2890, 1.0, 0.085), (4730, 0.7, 0.07), (6470, 0.42, 0.055),
             (8150, 0.2, 0.04), (10050, 0.08, 0.03)]
    contacts = [(0.012, 1.0, 1.0), (0.098, 0.55, 0.72), (0.166, 0.32, 0.5), (0.212, 0.17, 0.32)]
    y = np.zeros(n)
    for tc, amp, damp in contacts:
        tt = np.clip(t - tc, 0, None)
        on = (t >= tc)
        for f, a, tau in modes:
            df = rng.uniform(3, 11)
            aa = a * amp * rng.uniform(0.5, 1.15)
            env = (1 - np.exp(-tt / 0.0008)) ** 2 * np.exp(-tt / (tau * damp)) * on
            y += aa * env * (np.sin(2 * np.pi * (f - df / 2) * tt)
                             + 0.7 * np.sin(2 * np.pi * (f + df / 2) * tt)) / 1.7
        m = n_of(0.05)
        tick = bandpass(white(m, rng), 2500, 7000, 2) * burst_env(m, 0.0002, 0.0012)
        knock = strike(0.05, [(650, 0.004, 1.0), (1400, 0.002, 0.4)], 0.00015)
        place(y, 0.12 * amp * pkn(tick) + 0.1 * amp * pkn(knock), tc)
    y = lowpass(y, 6500, 2)
    y = add_room(y, rng, wet=0.1)
    return finalize(y, fade_out=0.06, lp=10000)


def bag_thump(name, heavy=False, total=0.35):
    """Object dropped softly into a cloth bag: muffled low thump, air puff
    through fabric, short cloth shuffle as the bag settles."""
    rng = rng_for(name)
    n = n_of(total)
    t0 = 0.025
    fs = 0.85 if heavy else 1.0
    modes = jitter_modes([(115, 0.022, 0.9), (215, 0.015, 0.8), (430, 0.008, 0.5), (820, 0.0045, 0.25),
                          (1500, 0.0025, 0.1)], rng, fscale=fs)
    th = pkn(strike(0.3, modes, 0.00055 if not heavy else 0.0007, k=1))
    m = n_of(0.2)
    puff = bandpass(white(m, rng), 90, 900, 2) * burst_env(m, 0.004, 0.03)
    srcs = [bandpass(white(n_of(0.5), rng), lo, hi, 3) for lo, hi in [(600, 1500), (1100, 2800), (2000, 4500)]]
    k = 34 if heavy else 26
    dt = rng.exponential(0.045, k)
    rustle = grain_cloud(n, t0 + dt, np.exp(0.5 * rng.standard_normal(k)) * np.exp(-dt / 0.06),
                         srcs, [0.45, 0.38, 0.17], (0.004, 0.016), rng)
    buf = np.zeros(n)
    place(buf, th, t0)
    place(buf, 0.5 * pkn(puff), t0)
    buf += 0.25 * pkn(rustle)
    if heavy:
        place(buf, pkn(strike(0.2, modes, 0.0008, k=1)), t0 + 0.062, 0.22)
    buf = add_room(buf, rng, wet=0.1)
    return finalize(buf, fade_out=0.05, lp=8000)


def paper_rustle(name, total=0.8):
    """A sheet lifted, turned and laid down: slide friction, soft crinkle
    grains, an air swish, a gentle landing flap and a few settling crackles."""
    rng = rng_for(name)
    n = n_of(total)
    t = np.arange(n) / SR
    m_slide = bump(t, 0.13, 0.22)
    m_swing = bump(t, 0.34, 0.34, 1.2)
    m = 0.65 * m_slide + m_swing + 0.15 * bump(t, 0.6, 0.14)
    cr = bandpass(soften(poisson_impulses(200 * m, rng, sigma=0.4, cap=1.8) * (0.3 + 0.7 * m), 0.4),
                  1500, 6000, 2)
    slide = tv_shape(white(n, rng), lambda f, tt: lgauss(f, 3000, 1.0) * hf_roll(f, 8000)) * m_slide
    sw = tv_shape(colored(n, rng, 1.2),
                  lambda f, tt: lgauss(f, 260 * (1 + 1.6 * np.interp(tt, t, m_swing)), 1.15) * lf_roll(f, 70))
    sw *= m_swing
    rumble = lowpass(colored(n, rng, 2.0), 300, 2) * m_swing * np.clip(1 + 0.4 * smooth_rand(n, 12, rng), 0, None)
    k = n_of(0.2)
    flap = (bandpass(white(k, rng), 150, 900, 3) * burst_env(k, 0.008, 0.025)
            + 0.7 * pkn(strike(0.2, [(240, 0.012, 1.0), (520, 0.006, 0.4)], 0.002)))
    y = 0.3 * nrm(cr) + 0.3 * nrm(slide) + 0.45 * nrm(sw) + 0.12 * nrm(rumble)
    place(y, 0.4 * pkn(flap) * np.max(np.abs(y)), 0.52)
    y = add_room(y, rng, wet=0.12)
    return finalize(y, fade_in=0.008, fade_out=0.05, lp=10000)


def book_set(name, total=0.6):
    """Leather-bound book set down on a wooden desk: a short soft slide, an
    air-cushion 'thup' as the cover meets the wood, damped desk modes, and a
    faint settle of the pages."""
    rng = rng_for(name)
    n = n_of(total)
    t_c = 0.11
    buf = np.zeros(n)
    k = n_of(0.1)
    slide = bandpass(white(k, rng), 300, 2500, 2) * np.hanning(k) ** 1.5
    place(buf, 0.05 * pkn(slide), t_c - 0.1)
    desk = jitter_modes([(140, 0.045, 0.8), (235, 0.034, 0.85), (410, 0.024, 0.8), (690, 0.016, 0.6),
                         (1150, 0.010, 0.4), (1800, 0.006, 0.22), (2700, 0.004, 0.1)], rng)
    th = pkn(strike(0.45, desk + [(320, 0.012, 0.4)], 0.00022, k=1))
    m = n_of(0.2)
    puff = bandpass(white(m, rng), 120, 900, 3) * burst_env(m, 0.003, 0.025)
    place(buf, th, t_c)
    place(buf, 0.7 * pkn(puff), t_c - 0.002)
    srcs = [bandpass(white(n_of(0.4), rng), lo, hi, 2) for lo, hi in [(1200, 3500), (2500, 6000)]]
    kk = 10
    dt = 0.012 + rng.exponential(0.04, kk)
    pages = grain_cloud(n, t_c + dt, np.exp(0.4 * rng.standard_normal(kk)) * np.exp(-dt / 0.05),
                        srcs, [0.6, 0.4], (0.004, 0.012), rng)
    buf += 0.05 * pkn(pages)
    buf = add_room(buf, rng, wet=0.12, rt=(0.34, 0.27, 0.16))
    return finalize(buf, fade_out=0.06, lp=9000)


def footsteps_soft(name, total=2.0):
    """Four unhurried steps on an earthen path: heel thud + soft dirt crunch,
    a lighter toe roll with a little grit, and a faint scuff at toe-off."""
    rng = rng_for(name)
    n = n_of(total)
    buf = np.zeros(n)
    times = [0.04, 0.53, 1.03, 1.50]
    base = [(85, 0.024, 0.8), (150, 0.018, 0.75), (300, 0.010, 0.55), (620, 0.0055, 0.32), (1200, 0.003, 0.14)]
    for i, t0 in enumerate(times):
        t0 += rng.uniform(-0.012, 0.012)
        lvl = (1.0 if i % 2 == 0 else 0.86) * rng.uniform(0.92, 1.04)
        heel = pkn(strike(0.25, jitter_modes(base, rng), 0.0008, k=1))
        k = len(heel)
        hn = bandpass(white(k, rng), 120, 1600, 3) * burst_env(k, 0.003, 0.022)
        place(buf, lvl * (heel + 0.35 * pkn(hn)), t0)
        buf += lvl * grit(n, t0 + 0.004, int(rng.integers(14, 20)), 0.03, rng,
                          band=(1100, 4500), dur_ms=(0.8, 2.4), level=0.12, decay=0.06)
        dt = rng.uniform(0.075, 0.1)
        toe = pkn(strike(0.2, jitter_modes(base, rng, fscale=1.15), 0.0006, k=1))
        place(buf, toe, t0 + dt, 0.42 * lvl)
        buf += lvl * grit(n, t0 + dt + 0.003, int(rng.integers(12, 18)), 0.03, rng,
                          band=(1300, 5000), dur_ms=(0.8, 2.2), level=0.1, decay=0.05)
        m = n_of(0.12)
        sc = bandpass(white(m, rng), 500, 2600, 2) * np.hanning(m) ** 2
        place(buf, sc, t0 + dt + 0.04, 0.035 * lvl / rms(sc))
    buf = add_room(buf, rng, wet=0.08, rt=(0.25, 0.2, 0.12))
    return finalize(buf, fade_out=0.06, lp=9000)


def room_tone(name, total=6.0):
    """Very quiet, warm room air: dark broadband noise with a gentle low-mid
    body, no hum or tones, slow level drift, partly decorrelated stereo."""
    rng = rng_for(name)
    n = n_of(total)

    def mag(f):
        ff = np.maximum(f, 1.0)
        return (ff ** -0.6 * lf_roll(ff, 45, 2) * hf_roll(ff, 2600, 1)
                * (1 + 0.45 * lgauss(ff, 190, 0.8)))

    common = spectral_noise(n, rng, mag)
    L = 0.7 * common + 0.71 * spectral_noise(n, rng, mag)
    R = 0.7 * common + 0.71 * spectral_noise(n, rng, mag)
    drift = 1 + 0.07 * smooth_rand(n, 0.5, rng)
    x = np.stack([L * drift, R * drift], axis=1)
    return finalize(x, fade_in=0.5, fade_out=0.5, hp=30, lp=12000)


# --------------------------------------------------------------------------
# catalogue
# --------------------------------------------------------------------------
CATALOGUE = [
    ("pencil_stroke_a", lambda: pencil_stroke("pencil_stroke_a", 0.30),
     "Single coloured-pencil stroke on rough cold-press paper - dry fine-grained scratch, medium pressure.",
     "Short line or accent stroke being drawn."),
    ("pencil_stroke_b", lambda: pencil_stroke("pencil_stroke_b", 0.36, speed=0.85, bright=0.95, attack=0.035),
     "Slightly longer, slower and softer pencil stroke.",
     "Alternate to _a for a single drawn line."),
    ("pencil_stroke_c", lambda: pencil_stroke("pencil_stroke_c", 0.235, speed=1.2, bright=1.05, attack=0.018,
                                              release=0.05),
     "Quick, light flick of the pencil.",
     "Tiny tick marks, quick accents."),
    ("pencil_hatch_a", lambda: pencil_hatch("pencil_hatch_a", 7),
     "Quick burst of 7 back-and-forth hatching strokes.",
     "Shading / hatching an area."),
    ("pencil_hatch_b", lambda: pencil_hatch("pencil_hatch_b", 6),
     "Burst of 6 hatching strokes, slightly different rhythm.",
     "Alternate hatching take."),
    ("pencil_long", lambda: pencil_long("pencil_long"),
     "Slow continuous contour line, gentle speed and pressure changes.",
     "An outline or contour being traced."),
    ("brush_wet_a", lambda: brush_wet("brush_wet_a", total=1.0, active=0.82),
     "Wet watercolour brush sweep - soft liquid swish with tiny wet detail.",
     "Paint wash / colour being laid in."),
    ("brush_wet_b", lambda: brush_wet("brush_wet_b", total=1.15, active=0.95, sweep=(800, 1450, 1000),
                                      wet_rate=190),
     "Longer, darker and wetter brush sweep.",
     "Alternate wash; broader strokes."),
    ("water_bloom", lambda: water_bloom("water_bloom"),
     "Very soft liquid bloom - faint wet bed with micro-crackles and tiny drips.",
     "Colour blooming / spreading into wet paper."),
    ("whoosh_soft_a", lambda: whoosh("whoosh_soft_a", 0.8, 180, 1050, peak=0.58, a=2.2),
     "Soft air movement, gentle rising/falling band.",
     "Short camera move or scene transition."),
    ("whoosh_soft_b", lambda: whoosh("whoosh_soft_b", 0.8, 140, 720, peak=0.48, a=2.0, sigma=1.45, air=0.16),
     "Darker, rounder soft whoosh.",
     "Alternate transition; under a cut."),
    ("whoosh_long", lambda: whoosh("whoosh_long", 1.6, 150, 880, peak=0.6, a=2.4, sigma=1.4),
     "Long, slow soft whoosh.",
     "Slow camera drift / longer transition."),
    ("pop_soft_a", lambda: pop_soft("pop_soft_a", 220, 900, 0.00042, felt=0.3),
     "Tiny soft fingertip tap on paper.",
     "Small icon/element appearing."),
    ("pop_soft_b", lambda: pop_soft("pop_soft_b", 180, 650, 0.00055, felt=0.38),
     "Even softer, felt-like tap.",
     "Alternate pop; gentler appearance."),
    ("pop_soft_c", lambda: pop_soft("pop_soft_c", 260, 1200, 0.00036, felt=0.3),
     "Slightly lighter, higher paper tick.",
     "Alternate pop; small details/sparkles."),
    ("chime_light", lambda: chime_light("chime_light"),
     "Warm airy shimmer - soft inharmonic bell partials with breathy air, 2.5 s decay, no melody.",
     "A light/glow revealing, a moment of insight."),
    ("sand_trickle", lambda: sand_trickle("sand_trickle"),
     "Fine sand running in an hourglass.",
     "Hourglass / passing time."),
    ("stone_set_a", lambda: stone_set("stone_set_a"),
     "Stone block set down gently - soft low thud with a little grit.",
     "Building block placed, foundation laid."),
    ("stone_set_b", lambda: stone_set("stone_set_b", settle=True),
     "Stone set down with a tiny pre-touch and a small rock-and-settle.",
     "Alternate stone placement."),
    ("cloth_curtain", lambda: cloth_curtain("cloth_curtain"),
     "Heavy fabric curtain drawn/dropping - rustle, low swoosh, soft settle.",
     "Curtain/reveal or scene closing."),
    ("coin_glint", lambda: coin_glint("coin_glint"),
     "Very faint metallic glint of a coin settling.",
     "Coin, value, small reward - delicate."),
    ("bag_thump_a", lambda: bag_thump("bag_thump_a"),
     "Object dropped softly into a cloth bag.",
     "Item put away / saved."),
    ("bag_thump_b", lambda: bag_thump("bag_thump_b", heavy=True),
     "Slightly heavier object into a cloth bag, small settle.",
     "Alternate bag drop."),
    ("paper_rustle", lambda: paper_rustle("paper_rustle"),
     "A sheet of paper lifted, turned and laid down softly.",
     "Page turn, document appearing."),
    ("book_set", lambda: book_set("book_set"),
     "Leather-bound book set down gently on a wooden desk.",
     "Book / knowledge placed on the table."),
    ("footsteps_soft", lambda: footsteps_soft("footsteps_soft"),
     "Four soft footsteps on an earthen path.",
     "Character walking a few steps."),
    ("room_tone", lambda: room_tone("room_tone"),
     "6 s of very quiet, warm stereo room tone (no hum). Normalised like the rest - play it very low "
     "(roughly 40-55 dB below the voice). Stationary, so it crossfade-loops easily.",
     "Optional bed to glue the foley together."),
]


# --------------------------------------------------------------------------
# QC
# --------------------------------------------------------------------------
def analyse(path):
    x, sr, bits = read_wav24(path)
    mono = x.mean(axis=1)
    n = len(x)
    peak = np.max(np.abs(x))
    tp = np.max(np.abs(signal.resample_poly(x, 4, 1, axis=0)))
    r = rms(x)
    X = np.abs(np.fft.rfft(mono * np.hanning(n))) ** 2
    f = np.fft.rfftfreq(n, 1 / sr)
    cen = float(np.sum(f * X) / np.sum(X))
    hf = float(np.sum(X[f > 8000]) / np.sum(X))
    w = int(0.005 * sr)
    db = lambda v: float(20 * np.log10(max(v, 1e-12)))
    # click check: loudest 1 ms of energy above 10 kHz, relative to the loudest
    # 1 ms of full-band energy (a click/discontinuity would push this towards 0 dB)
    hp = signal.sosfilt(signal.butter(4, 10000, 'highpass', fs=sr, output='sos'), mono)
    fr = int(0.001 * sr)
    nfr = n // fr
    e_hf = np.mean(hp[:nfr * fr].reshape(nfr, fr) ** 2, axis=1)
    e_fb = np.mean(mono[:nfr * fr].reshape(nfr, fr) ** 2, axis=1)
    hf_spike = float(10 * np.log10((e_hf.max() + 1e-20) / (e_fb.max() + 1e-20)))
    lvl = 20 * np.log10(np.abs(mono) + 1e-12)
    return {
        "channels": int(x.shape[1]), "sample_rate": sr, "bits": bits,
        "duration_s": round(n / sr, 3),
        "peak_dbfs": round(db(peak), 2), "true_peak_dbtp": round(db(tp), 2),
        "rms_dbfs": round(db(r), 2), "crest_db": round(db(peak) - db(r), 2),
        "spectral_centroid_hz": round(cen),
        "energy_above_8k_pct": round(100 * hf, 2),
        "dc_offset": float(f"{np.mean(x):.2e}"),
        "first_sample": float(x[0].max()), "last_sample": float(x[-1].max()),
        "start_5ms_max_dbfs": round(db(np.max(np.abs(x[:w]))), 1),
        "end_5ms_max_dbfs": round(db(np.max(np.abs(x[-w:]))), 1),
        "hf_spike_db": round(hf_spike, 1),
        "clipped_samples": int(np.sum(np.abs(x) >= 0.999)),
    }


def contact_sheet(names, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    cols = 5
    rows = int(np.ceil(len(names) / cols))
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 4.6, rows * 3.0), dpi=90)
    fig.patch.set_facecolor("white")
    for ax in axes.flat[len(names):]:
        ax.axis("off")
    for ax, nm in zip(axes.flat, names):
        x, sr, _ = read_wav24(os.path.join(OUT, nm + ".wav"))
        m = x.mean(axis=1)
        nper, hop = 1024, 128
        f, tt, Z = signal.stft(m, fs=sr, nperseg=nper, noverlap=nper - hop)
        S = 20 * np.log10(np.abs(Z) + 1e-9)
        S -= S.max()
        ax.pcolormesh(tt, np.maximum(f, 1), S, vmin=-90, vmax=0, cmap="magma", shading="auto")
        ax.set_yscale("log")
        ax.set_ylim(40, 20000)
        ax.set_xlim(0, len(m) / sr)
        ax.set_yticks([100, 1000, 10000])
        ax.set_yticklabels(["100", "1k", "10k"], fontsize=7)
        ax.tick_params(axis="x", labelsize=7)
        a2 = ax.twinx()
        k = int(0.005 * sr)
        env = np.sqrt(np.convolve(m ** 2, np.ones(k) / k, mode="same"))
        a2.plot(np.arange(len(m)) / sr, 20 * np.log10(env + 1e-9), color="cyan", lw=0.8)
        a2.set_ylim(-80, 0)
        a2.tick_params(axis="y", labelsize=6, colors="teal")
        q = analyse(os.path.join(OUT, nm + ".wav"))
        ax.set_title(f"{nm}  {q['duration_s']:.2f}s  rms {q['rms_dbfs']:.0f}  c {q['spectral_centroid_hz']}Hz",
                     fontsize=8)
    fig.suptitle("Soft foley SFX - spectrograms (log freq, 90 dB range) with 5 ms RMS envelope (cyan, dBFS)",
                 fontsize=11)
    fig.tight_layout(rect=(0, 0, 1, 0.98))
    fig.savefig(path)
    plt.close(fig)


def main():
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    manifest = {}
    for name, fn, desc, use in CATALOGUE:
        if only and name not in only:
            continue
        x = fn()
        p = os.path.join(OUT, name + ".wav")
        write_wav24(p, x)
        q = analyse(p)
        manifest[name + ".wav"] = {"description": desc, "duration_s": q["duration_s"],
                                   "channels": q["channels"], "suggested_use": use, "qc": q}
        print(f"{name:16s} {q['duration_s']:5.2f}s ch{q['channels']} pk {q['peak_dbfs']:6.2f} "
              f"tp {q['true_peak_dbtp']:6.2f} rms {q['rms_dbfs']:6.1f} crest {q['crest_db']:5.1f} "
              f"cen {q['spectral_centroid_hz']:5d} >8k {q['energy_above_8k_pct']:5.2f}% "
              f"st {q['start_5ms_max_dbfs']:6.1f} end {q['end_5ms_max_dbfs']:6.1f} "
              f"spike {q['hf_spike_db']:5.1f} dc {q['dc_offset']:.1e}")
    if not only:
        meta = {"_format": "48 kHz / 24-bit PCM WAV, mono unless noted, peak-normalised to -3 dBFS, "
                           "raised-cosine fades at both ends; fully procedural (no samples) - "
                           "regenerate with make_sfx.py",
                "files": manifest}
        with open(os.path.join(OUT, "manifest.json"), "w") as fh:
            json.dump(meta, fh, indent=2)
        if "--no-plot" not in sys.argv:
            contact_sheet([nm for nm, *_ in CATALOGUE], os.path.join(OUT, "sfx_spectrograms.png"))


if __name__ == "__main__":
    main()
