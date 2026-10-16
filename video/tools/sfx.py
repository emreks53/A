"""Procedural sound-effect synthesis + final audio mix (no samples, no external services).
Usage: python tools/sfx.py [--cues data/sfx_cues.json] [--out out/mix.wav] [--audition out/sfx_audition.wav]
Cue format: [{"t": global_seconds, "dur": s, "kind": "...", "desc": "...", "gain": dB(optional), "pan": -1..1(optional)}]"""
import json, os, sys, re, subprocess, math
import numpy as np
from scipy import signal
import soundfile as sf

SR = 48000
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

# ---------------------------------------------------------------- primitives
def rng(seed): return np.random.default_rng(seed)
def tvec(d): return np.arange(int(d * SR)) / SR
def white(n, r): return r.standard_normal(n)
def pink(n, r):
    X = np.fft.rfft(r.standard_normal(n)); f = np.arange(len(X)); f[0] = 1
    y = np.fft.irfft(X / np.sqrt(f), n); return y / (np.std(y) + 1e-9)
def brown(n, r):
    X = np.fft.rfft(r.standard_normal(n)); f = np.arange(len(X)); f[0] = 1
    y = np.fft.irfft(X / f, n); return y / (np.std(y) + 1e-9)
def sos(kind, f, order=2):
    f = np.atleast_1d(f) / (SR / 2); f = np.clip(f, 1e-4, 0.999)
    return signal.butter(order, f if len(f) > 1 else f[0], btype=kind, output='sos')
def lp(x, f, o=2): return signal.sosfilt(sos('lowpass', f, o), x)
def hp(x, f, o=2): return signal.sosfilt(sos('highpass', f, o), x)
def bp(x, f1, f2, o=2): return signal.sosfilt(sos('bandpass', [f1, f2], o), x)
def svf_bp(x, fc, q):
    """time-varying bandpass (TPT state-variable filter); fc array per-sample"""
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    g = np.tan(np.pi * np.clip(fc, 20, SR * 0.45) / SR); k = 1.0 / q
    y = np.empty_like(x); s1 = s2 = 0.0
    a1 = 1 / (1 + g * (g + k))
    for i in range(len(x)):
        gi = g[i]; a = a1[i]
        v3 = x[i] - s2; v1 = a * (s1 + gi * v3); v2 = s2 + gi * v1
        s1 = 2 * v1 - s1; s2 = 2 * v2 - s2; y[i] = v1
    return y
def addm(*xs):
    n = max(len(x) for x in xs); out = np.zeros((n, 2))
    for x in xs: out[:len(x)] += x if x.ndim == 2 else stereo(x)
    return out
def expdec(n, tau): return np.exp(-np.arange(n) / (tau * SR))
def bell(n, a=0.3):  # rise/fall window
    x = np.linspace(0, 1, n); return np.where(x < a, np.sin(x / a * np.pi / 2) ** 2, np.cos((x - a) / (1 - a) * np.pi / 2) ** 2)
def fade(x, fi=0.005, fo=0.02):
    n = len(x); a = min(n // 2, int(fi * SR)); b = min(n // 2, int(fo * SR))
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x
def norm(x, peak=0.9): m = np.max(np.abs(x)) + 1e-9; return x / m * peak
def partials(d, freqs, amps, decays, r=None, detune=0.0):
    t = tvec(d); y = np.zeros_like(t)
    for f, a, dc in zip(freqs, amps, decays):
        ph = (r.random() * 6.28) if r is not None else 0
        y += a * np.sin(2 * np.pi * f * (1 + detune * np.sin(2 * np.pi * 3 * t)) * t + ph) * np.exp(-t / dc)
    return y
def stereo(x, pan=0.0, width=0.0, r=None):
    """mono -> stereo with constant-power pan; width adds decorrelated copy"""
    L = np.cos((pan + 1) * np.pi / 4); R = np.sin((pan + 1) * np.pi / 4)
    y = np.stack([x * L, x * R], 1) * math.sqrt(2)
    if width > 0:
        d = int(0.011 * SR); xd = np.concatenate([np.zeros(d), x[:-d]]) if len(x) > d else x
        y[:, 0] += width * 0.5 * xd; y[:, 1] -= width * 0.5 * xd
    return y
def pan_sweep(x, p0, p1):
    p = np.linspace(p0, p1, len(x)); L = np.cos((p + 1) * np.pi / 4); R = np.sin((p + 1) * np.pi / 4)
    return np.stack([x * L, x * R], 1) * math.sqrt(2)
_IR = {}
def ir(kind):
    if kind in _IR: return _IR[kind]
    size = {'room': .45, 'hall': 1.6, 'outdoor': .35, 'cave': 2.2, 'small': .25}[kind]
    r = rng(hash(kind) % 1000); n = int(size * SR); t = np.arange(n) / SR
    e = np.exp(-t / (size / 6.9))
    L = r.standard_normal(n) * e; R = r.standard_normal(n) * e
    L = lp(L, 6000 if kind != 'outdoor' else 3500); R = lp(R, 6000 if kind != 'outdoor' else 3500)
    if kind == 'outdoor': L[: int(.04 * SR)] *= .2; R[: int(.04 * SR)] *= .2
    _IR[kind] = (L / np.sqrt(np.sum(L ** 2)), R / np.sqrt(np.sum(R ** 2))); return _IR[kind]
def reverb(y, kind='room', wet=0.25):
    L, R = ir(kind); cl = signal.fftconvolve(y[:, 0], L); cr = signal.fftconvolve(y[:, 1], R); n = len(cl)
    out = np.zeros((n, 2)); out[:len(y)] += y * (1 - wet * 0.5)
    out[:, 0] += wet * cl; out[:, 1] += wet * cr
    return out

# ---------------------------------------------------------------- recipes (return stereo float arrays)
def s_whoosh(d=0.8, seed=1, f0=300, f1=2200, pan=(-0.6, 0.6), q=1.4, rumble=0.3):
    r = rng(seed); n = int(d * SR); x = pink(n, r)
    e = bell(n, 0.55); fc = f0 + (f1 - f0) * np.sin(np.linspace(0, np.pi, n)) ** 1.5
    y = svf_bp(x, fc, q) * e + lp(brown(n, r), 160) * e * rumble
    return pan_sweep(norm(fade(y)), *pan)
def s_swish(d=0.45, seed=2): return s_whoosh(d, seed, 200, 1100, (-0.3, 0.3), 1.0, 0.1) * 0.7
def s_impact(d=1.2, seed=3, deep=1.0):
    r = rng(seed); t = tvec(d); n = len(t)
    f = 38 + 70 * np.exp(-t / 0.06); body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.35 * deep))
    nz = lp(white(n, r), 900) * np.exp(-t / 0.05) * 0.8; click = hp(white(n, r), 3000) * np.exp(-t / 0.004) * 0.4
    return reverb(stereo(norm(body + nz + click), 0, 0.3), 'hall', 0.25)
def s_thud(d=0.5, seed=4, f=110):
    r = rng(seed); t = tvec(d); n = len(t)
    y = np.sin(2 * np.pi * (f * (1 + 0.6 * np.exp(-t / 0.02))) * t) * np.exp(-t / 0.08) + lp(brown(n, r), 400) * np.exp(-t / 0.05) * 0.6
    return stereo(norm(y), 0, 0.2)
def s_pop(d=0.18, seed=5, f=900):
    r = rng(seed); t = tvec(d); f = f * (1 + 0.08 * (r.random() - .5))
    y = np.sin(2 * np.pi * (f * (0.55 + 0.45 * np.exp(-t / 0.025))) * t) * np.exp(-t / 0.05)
    y += hp(white(len(t), r), 2000) * np.exp(-t / 0.003) * 0.15
    return stereo(norm(fade(y, .001, .03)) * 0.8, 0, 0.1)
def s_tick(d=0.06, seed=6): r = rng(seed); t = tvec(d); return stereo(norm(bp(white(len(t), r), 1500, 5000) * np.exp(-t / 0.006)) * 0.5)
def s_chime(d=2.2, seed=7, f0=1320, glass=False):
    r = rng(seed)
    ratios = [1, 2.76, 5.40, 8.93] if glass else [1, 2.0, 2.76, 4.07, 5.43]
    amps = [1, .5, .3, .15, .08]; dec = [d * .45, d * .3, d * .2, d * .12, d * .08]
    y = partials(d, [f0 * k for k in ratios], amps, dec, r, 0.0005)
    y *= np.minimum(1, tvec(d) / 0.002)
    return reverb(stereo(norm(y) * 0.8, (r.random() - .5) * .4, 0.2), 'hall', 0.3)
def s_shimmer(d=1.5, seed=8):  # soft warm swell for light-ups
    r = rng(seed); n = int(d * SR); x = pink(n, r)
    y = svf_bp(x, 2500 + 1500 * np.linspace(0, 1, n), 3) * bell(n, .6) * 0.5
    for k in range(5): y += partials(d, [r.uniform(1800, 4200)], [0.08], [0.6], r) * np.roll(np.r_[np.zeros(int(r.uniform(0, d * .5) * SR)), np.ones(n)][:n], 0)
    return reverb(stereo(norm(y) * .6, 0, .6), 'hall', .4)
def s_metal(d=0.5, seed=9, f0=2400):
    r = rng(seed); ratios = [1, 1.58, 2.31, 3.17, 4.4]
    y = partials(d, [f0 * k * r.uniform(.98, 1.02) for k in ratios], [1, .7, .5, .35, .2], [d * .4, d * .3, d * .2, d * .15, d * .1], r)
    y += hp(white(len(y), r), 3000) * expdec(len(y), .003) * .3
    return reverb(stereo(norm(y) * .7, (r.random() - .5) * .5, .2), 'room', .25)
def s_sword(d=1.8, seed=10):
    r = rng(seed); n = int(d * SR); t = tvec(d)
    scrape = bp(white(n, r), 2500, 9000) * np.exp(-t / 0.18) * 0.6
    ring = partials(d, [1870, 1873, 3020, 4410, 5650], [1, .8, .5, .3, .2], [.9, .9, .6, .4, .3], r)
    return reverb(stereo(norm(scrape + ring * .7), 0, .3), 'outdoor', .3)
def s_wood(d=0.35, seed=11, f=(190, 420, 880)):
    r = rng(seed); n = int(d * SR); x = np.zeros(n); x[:int(.002 * SR)] = white(int(.002 * SR), r)
    y = sum(signal.lfilter(*signal.iirpeak(fi / (SR / 2), 18), x) * a for fi, a in zip(f, (1, .7, .4)))
    y += lp(white(n, r), 1200) * expdec(n, .02) * .3
    return reverb(stereo(norm(y) * .8, 0, .15), 'room', .2)
def s_creak(d=0.8, seed=12):
    r = rng(seed); n = int(d * SR); t = tvec(d)
    rate = 60 + 40 * np.sin(2 * np.pi * 0.8 * t + r.random())
    pulses = (np.sin(2 * np.pi * np.cumsum(rate) / SR) > 0.97).astype(float)
    y = sum(signal.lfilter(*signal.iirpeak(fi / (SR / 2), 12), pulses) for fi in (520, 1100, 1900)) * bell(n, .3)
    return reverb(stereo(norm(y) * .5), 'room', .2)
def s_stone(d=0.6, seed=13):
    r = rng(seed); n = int(d * SR); t = tvec(d)
    y = lp(brown(n, r), 250) * np.exp(-t / .1) + hp(white(n, r), 1500) * (r.random(n) > .985) * np.exp(-t / .2) * 2
    return reverb(stereo(norm(y) * .9, 0, .2), 'outdoor', .25)
def s_cloth(d=0.6, seed=14): r = rng(seed); n = int(d * SR); y = bp(pink(n, r), 300, 3000) * bell(n, .4); return stereo(norm(y) * .45, 0, .3)
def s_paper(d=0.6, seed=15):
    r = rng(seed); n = int(d * SR); y = np.zeros(n)
    for k in range(int(8 + d * 14)):
        p = int(r.uniform(0, n - int(.03 * SR))); m = int(r.uniform(.008, .03) * SR)
        y[p:p + m] += bp(white(m, r), 1800, 7000) * np.hanning(m) * r.uniform(.3, 1)
    y += bp(pink(n, r), 500, 4000) * bell(n, .4) * .25
    return reverb(stereo(norm(y) * .6, 0, .3), 'room', .2)
def s_book(d=0.5, seed=16): return addm(s_thud(d, seed, 130) * .8, s_paper(d, seed) * .3)
def s_drop(d=0.5, seed=17, f0=700):
    r = rng(seed); t = tvec(d); f = f0 * (1 + 1.3 * (1 - np.exp(-t / 0.012)))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05) + hp(white(len(t), r), 4000) * np.exp(-t / .004) * .2
    return reverb(stereo(norm(y) * .8, (r.random() - .5) * .3, .1), 'room', .3)
def s_splash(d=1.4, seed=18):
    r = rng(seed); n = int(d * SR); t = tvec(d)
    y = bp(white(n, r), 700, 6000) * np.exp(-t / .18) * (1 - np.exp(-t / .004))
    for k in range(12):
        p = int(r.uniform(.05, d * .7) * SR); m = int(.05 * SR); tt = np.arange(m) / SR
        if p + m < n: y[p:p + m] += np.sin(2 * np.pi * r.uniform(600, 1600) * (1 + 3 * tt) * tt) * np.exp(-tt / .015) * .25
    return reverb(stereo(norm(y) * .8, 0, .4), 'outdoor', .3)
def s_ocean(d=6, seed=19):
    r = rng(seed); n = int(d * SR); t = tvec(d)
    def ch(s):
        rr = rng(seed + s); am = 0.55 + 0.45 * np.sin(2 * np.pi * 0.13 * t + rr.random() * 6) ** 2
        return lp(brown(n, rr), 700) * am * .7 + hp(pink(n, rr), 2500) * am ** 3 * .25
    y = np.stack([ch(1), ch(2)], 1); return fade(norm(y) * .7, .5, .8) if False else norm(y) * .7 * np.minimum(1, np.minimum(t, d - t)[:, None] / .6)
def s_wind(d=4, seed=20, strength=1.0):
    r = rng(seed); n = int(d * SR); t = tvec(d)
    def ch(s):
        rr = rng(seed + s); g = 0.5 + 0.5 * np.clip(np.convolve(rr.standard_normal(n // 4800 + 3), np.ones(3) / 3, 'same'), -1, 1)
        g = np.interp(t, np.linspace(0, d, len(g)), g)
        return svf_bp(pink(n, rr), 350 + 500 * g, 0.8) * (0.4 + 0.6 * g)
    y = np.stack([ch(1), ch(2)], 1); env = np.minimum(1, np.minimum(t, d - t) / .5)[:, None]
    return norm(y) * .6 * env * strength
def s_fire(d=3, seed=21, crackle=1.0):
    r = rng(seed); n = int(d * SR); t = tvec(d)
    bed = lp(brown(n, r), 300) * .35
    cr = np.zeros(n); k = int(d * 18 * crackle)
    for i in range(k):
        p = int(r.uniform(0, n - 400)); m = int(r.uniform(40, 300)); cr[p:p + m] += hp(white(m, r), 1500) * np.hanning(m) * r.uniform(.2, 1)
    y = bed + cr; env = np.minimum(1, np.minimum(t, d - t) / .3)
    return stereo(norm(y * env) * .5, 0, .5)
def s_ignite(d=0.7, seed=22):
    r = rng(seed); n = int(d * SR); t = tvec(d)
    y = svf_bp(pink(n, r), 300 + 2500 * (1 - np.exp(-t / .08)), 1.2) * np.exp(-t / .2) * (1 - np.exp(-t / .01))
    return addm(stereo(norm(y) * .6, (r.random() - .5) * .4, .3), s_fire(d, seed, 2) * .3)
def s_arrow(d=0.35, seed=23, pan=None):
    r = rng(seed); p = pan if pan is not None else r.uniform(-.8, .8)
    return s_whoosh(d, seed, 3500, 1200, (p, -p * .5), 3, 0) * .7
def s_arrow_hit(d=0.4, seed=24):
    r = rng(seed); t = tvec(d); n = len(t)
    y = lp(white(n, r), 2500) * np.exp(-t / .012) + np.sin(2 * np.pi * 180 * t) * np.exp(-t / .04) * .6
    return reverb(stereo(norm(y) * .7, r.uniform(-.6, .6), .2), 'outdoor', .25)
def s_volley(d=1.5, seed=25, count=14):
    r = rng(seed); n = int(d * SR); y = np.zeros((n + SR, 2))
    for k in range(count):
        p = int(r.uniform(0, d * .8) * SR); a = s_arrow(r.uniform(.25, .45), seed + k * 7) * r.uniform(.4, 1)
        y[p:p + len(a)] += a
    return y[:n] / max(1, count ** .5) * 1.4
def s_rumble(d=3, seed=26):
    r = rng(seed); n = int(d * SR); t = tvec(d); y = lp(brown(n, r), 120) * (0.7 + 0.3 * np.sin(2 * np.pi * .3 * t))
    return stereo(norm(y) * .7, 0, .6) * np.minimum(1, np.minimum(t, d - t) / .4)[:, None]
def s_crickets(d=4, seed=27):
    r = rng(seed); n = int(d * SR); t = tvec(d); y = np.zeros((n, 2))
    for b in range(3):
        f = r.uniform(4200, 5200); p = r.uniform(-.8, .8); per = r.uniform(.45, .8); ph = r.random() * per
        gate = ((t + ph) % per) < .12; am = (np.sin(2 * np.pi * 32 * t) > 0) * gate
        y += stereo(np.sin(2 * np.pi * f * t) * am * .15 * r.uniform(.5, 1), p)
    return y * np.minimum(1, np.minimum(t, d - t) / .4)[:, None]
def s_birds(d=4, seed=28):
    r = rng(seed); n = int(d * SR); y = np.zeros((n, 2))
    for b in range(int(d * 2.2)):
        p0 = int(r.uniform(0, d - .5) * SR); base = r.uniform(2800, 5200); pan = r.uniform(-.8, .8)
        for s in range(r.integers(2, 6)):
            m = int(r.uniform(.04, .11) * SR); tt = np.arange(m) / SR; sw = r.uniform(-1, 1)
            f = base * (1 + sw * .35 * tt / tt[-1]) + 250 * np.sin(2 * np.pi * r.uniform(20, 60) * tt)
            syl = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.hanning(m) * r.uniform(.3, 1)
            q = p0 + s * int(r.uniform(.06, .14) * SR)
            if q + m < n: y[q:q + m] += stereo(syl, pan)
    return reverb(y * .25, 'outdoor', .35)[:n]
def s_rain(d=4, seed=29):
    r = rng(seed); n = int(d * SR); t = tvec(d); bed = lp(pink(n, r), 3000) * .3
    drops = (r.random(n) > .996) * r.random(n); y = bed + hp(signal.lfilter([1], [1, -.6], drops), 2000) * 1.5
    return stereo(norm(y) * .45, 0, .8) * np.minimum(1, np.minimum(t, d - t) / .5)[:, None]
def s_room(d=4, seed=30):
    r = rng(seed); n = int(d * SR); t = tvec(d); y = lp(brown(n, r), 200) * .5 + lp(pink(n, r), 900) * .1
    return stereo(norm(y) * .25, 0, .8) * np.minimum(1, np.minimum(t, d - t) / .5)[:, None]
def s_quill(d=1.0, seed=31):
    r = rng(seed); n = int(d * SR); t = tvec(d)
    strokes = (np.sin(2 * np.pi * r.uniform(5, 8) * t + np.sin(2 * np.pi * 1.3 * t)) > -.2).astype(float)
    y = bp(white(n, r), 2500, 8000) * lp(strokes, 40) * (0.6 + .4 * r.random(n))
    return stereo(norm(y) * .35, .2, .2)
def s_clock(d=3, seed=32):
    n = int(d * SR); y = np.zeros((n, 2))
    for k in range(int(d)):
        a = s_wood(.12, seed + k, (1800, 3200, 5200)) * (.5 if k % 2 else .35); p = int(k * SR)
        y[p:p + len(a)] += a[: max(0, min(len(a), n - p))]
    return y * .5
def s_lake(d=4, seed=33):
    r = rng(seed); n = int(d * SR); t = tvec(d); y = lp(brown(n, r), 500) * (0.6 + .4 * np.sin(2 * np.pi * .25 * t)) * .5
    for k in range(int(d * 1.5)):
        p = int(r.uniform(0, d - .2) * SR); a = s_drop(.2, seed + k, r.uniform(300, 500))[:, 0] * .15; a = a[: max(0, min(len(a), n - p))]; y[p:p + len(a)] += a
    return stereo(norm(y) * .45, 0, .6) * np.minimum(1, np.minimum(t, d - t) / .5)[:, None]
def s_jingle(d=0.8, seed=34):
    r = rng(seed); n = int(d * SR); y = np.zeros((n, 2))
    for k in range(6):
        p = int(r.uniform(0, d * .5) * SR); a = s_metal(r.uniform(.2, .4), seed + k * 3, r.uniform(2600, 4800)) * r.uniform(.3, .8); y[p:p + len(a)] += a[: max(0, min(len(a), n - p))]
    return y
def s_stamp(d=0.6, seed=35): return addm(s_thud(d, seed, 90), s_paper(d, seed) * .2, s_impact(d, seed, .4) * .3)
def s_rustle(d=0.8, seed=36): r = rng(seed); n = int(d * SR); y = bp(pink(n, r), 1500, 7000) * bell(n, .4) * (0.5 + .5 * (r.random(n) > .7)); return stereo(norm(y) * .4, 0, .4)
def s_pour(d=1.5, seed=37):
    r = rng(seed); n = int(d * SR); t = tvec(d); y = bp(white(n, r), 400, 3000) * .3
    for k in range(int(d * 40)):
        p = int(r.uniform(0, d - .05) * SR); m = int(.03 * SR); tt = np.arange(m) / SR
        if p + m < n: y[p:p + m] += np.sin(2 * np.pi * r.uniform(500, 1400) * (1 + 2 * tt) * tt) * np.exp(-tt / .008) * .4
    return stereo(norm(y) * .5 * np.minimum(1, np.minimum(t, d - t) / .15), 0, .3)
def s_globe(d=2, seed=38): return addm(s_creak(d, seed) * .6, s_rumble(d, seed) * .3, s_whoosh(d, seed, 150, 500, (-.3, .3), 1, .2) * .3)

RECIPES = [  # (regex on kind+desc, function, default gain dB)
    (r'volley|arrows', s_volley, -14), (r'arrow.*(hit|impact|thunk)|thunk', s_arrow_hit, -14), (r'\barrow', s_arrow, -16),
    (r'sword|blade|zülfikar|zulfikar|shing|unsheath', s_sword, -16),
    (r'stamp|\bseal\b', s_stamp, -14), (r'globe', s_globe, -16),
    (r'ignit|light(s|ing)? up|candle.*(on|light)|match', s_ignite, -20),
    (r'crackl|fire|flame|candle|torch|campfire', s_fire, -24),
    (r'boom|deep impact|\bsub\b|slam|impact', s_impact, -13), (r'thud|land|drop.*book|settle|thump', s_thud, -16),
    (r'splash', s_splash, -15), (r'drip|plink|\bdrop', s_drop, -15), (r'pour', s_pour, -17), (r'ocean|wave|sea|surf', s_ocean, -18),
    (r'lake|lapping', s_lake, -22), (r'rain', s_rain, -22), (r'wind|gust|sand|storm|dust', s_wind, -18),
    (r'cricket', s_crickets, -26), (r'bird', s_birds, -22), (r'clock|tick', s_clock, -24),
    (r'quill|scratch|writ', s_quill, -22), (r'page|paper|parchment|scroll|letter', s_paper, -18), (r'book', s_book, -16),
    (r'jingle|coin|jewel', s_jingle, -18), (r'\bkey|\block|clink|metal|brass|scale|chain', s_metal, -18),
    (r'glass|ting', lambda d=1.8, seed=1: s_chime(d, seed, 2200, True), -20),
    (r'chime|bell|sparkle|shimmer|glow|reveal|light', s_shimmer, -22),
    (r'creak|\bdoor|\blid\b|hinge', s_creak, -18), (r'wood|knock|shelf|crate|chest|box', s_wood, -15),
    (r'stone|rock|rumble|grind|crumble|pillar|column', s_stone, -15), (r'rustle|wheat|leaf|leaves', s_rustle, -20),
    (r'cloth|fabric|swish|flap|banner|flag', s_cloth, -20), (r'\broom|ambience|ambient|room tone|\bhall\b', s_room, -26),
    (r'\bpop|\bui\b|label|text|counter|blip', s_pop, -20), (r'tick', s_tick, -22),
    (r'whoosh|swoosh|swipe|transition|fly|zoom|rise|move|glide|push', s_whoosh, -19),
]

def synth(cue, seed):
    key = (cue.get('kind', '') + ' ' + cue.get('desc', '')).lower()
    for rx, fn, g in RECIPES:
        if re.search(rx, key):
            d = float(cue.get('dur') or 0.6); d = max(0.08, min(d, 12))
            try: y = fn(d=d, seed=seed)
            except TypeError: y = fn(d, seed)
            return np.asarray(y, dtype=float), g + float(cue.get('gain', 0)), fn.__name__
    return s_pop(seed=seed), -24 + float(cue.get('gain', 0)), 's_pop'

def load_audio(path):
    tmp = os.path.join(ROOT, 'out', '_narr.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-ar', str(SR), '-ac', '1', tmp], check=True)
    x, sr = sf.read(tmp); return x

def main():
    a = sys.argv[1:]; opt = {a[i][2:]: a[i + 1] for i in range(0, len(a) - 1, 2) if a[i].startswith('--')}
    cues = json.load(open(os.path.join(ROOT, opt.get('cues', 'data/sfx_cues.json'))))
    tl = json.load(open(os.path.join(ROOT, 'data/timeline.json')))
    total = tl['audioDuration'] + 0.6
    voice = load_audio(os.path.join(ROOT, tl['audio']))
    voice = hp(voice, 75); voice = voice[: int(total * SR)]
    vbuf = np.zeros(int(total * SR)); vbuf[:len(voice)] = voice
    bus = np.zeros((int(total * SR) + SR * 4, 2)); log = []
    for i, c in enumerate(cues):
        y, g, name = synth(c, 1000 + i * 17)
        if 'pan' in c and y.ndim == 2: p = float(c['pan']); y = y * np.array([math.cos((p + 1) * math.pi / 4), math.sin((p + 1) * math.pi / 4)]) * math.sqrt(2)
        if y.ndim == 1: y = stereo(y)
        y = y / (np.max(np.abs(y)) + 1e-9) * 10 ** (g / 20)
        p = int(max(0, float(c['t'])) * SR); bus[p:p + len(y)] += y[: max(0, min(len(y), len(bus) - p))]
        log.append(f"{c['t']:7.2f}s {name:12s} {g:6.1f}dB  {c.get('kind','')}: {c.get('desc','')[:60]}")
    bus = bus[: int(total * SR)]
    bus = signal.sosfilt(sos('highpass', 38, 4), bus, axis=0)
    # duck SFX under the voice - multiband sidechain: the speech band (300-4000 Hz) of the SFX bus is carved out much deeper
    # (up to -15 dB) than lows/highs (up to -6 dB), so impacts keep their weight while every word stays clear.
    # 30 ms look-ahead so the dip is in place when a word starts. Zero-phase band split -> the bands sum back exactly.
    env = np.sqrt(np.maximum(signal.sosfilt(sos('lowpass', 8), vbuf ** 2), 0) * 2 + 1e-12); env = env / (np.percentile(env, 99) + 1e-9)
    la = int(0.03 * SR); env = np.concatenate([env[la:], np.repeat(env[-1:], la)])
    # activation in dB relative to loud speech: full duck from -22 dB, none below -40 dB, so the narrator's soft trailing
    # syllables (sentence ends drop 20-25 dB) still carve the bed out instead of letting it swell over them
    act = np.clip((20 * np.log10(env + 1e-9) + 40) / 18, 0, 1)
    g_mid = signal.sosfiltfilt(sos('lowpass', 6), 1 - 0.82 * act); g_rest = signal.sosfiltfilt(sos('lowpass', 6), 1 - 0.50 * act)
    mid = signal.sosfiltfilt(signal.butter(4, [300, 4000], 'bandpass', fs=SR, output='sos'), bus, axis=0)
    bus = (bus - mid) * g_rest[:, None] + mid * g_mid[:, None]
    out = opt.get('out', 'out/mix.wav')
    mix = np.stack([vbuf, vbuf], 1) * 0.5 + bus
    if 'stems' in opt:
        sc = 0.89 / (np.max(np.abs(mix)) + 1e-9)
        sf.write(os.path.join(ROOT, 'out/_stem_voice.wav'), np.stack([vbuf, vbuf], 1) * 0.5 * sc, SR, subtype='FLOAT')
        sf.write(os.path.join(ROOT, 'out/_stem_sfx.wav'), bus * sc, SR, subtype='FLOAT')
    if 'audition' in opt: sf.write(os.path.join(ROOT, opt['audition']), bus / (np.max(np.abs(bus)) + 1e-9) * .9, SR)
    sf.write(os.path.join(ROOT, 'out/_mix_raw.wav'), mix / (np.max(np.abs(mix)) + 1e-9) * 0.89, SR, subtype='FLOAT')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(ROOT, 'out/_mix_raw.wav'), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), os.path.join(ROOT, out)], check=True)
    print('\n'.join(log)); print('->', out, f'{len(cues)} cues')

if __name__ == '__main__':
    main()
