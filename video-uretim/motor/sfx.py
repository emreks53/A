"""Procedural, quiet sound design under the narration (no music).
Everything is synthesised here (license-free), mixed ~20 dB under the voice and
ducked further while the narrator speaks."""
import numpy as np, subprocess, json
from scipy import signal
from common import ROOT

SR = 48000
rng = np.random.default_rng(1453)


def env_adsr(n, a=0.01, d=0.2, s=0.6, r=0.3, sr=SR):
    t = np.arange(n) / sr
    tot = n / sr
    e = np.ones(n)
    e = np.where(t < a, t / max(a, 1e-4), e)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / max(d, 1e-4), e)
    e = np.where((t >= a + d) & (t < tot - r), s, e)
    e = np.where(t >= tot - r, s * np.clip((tot - t) / max(r, 1e-4), 0, 1), e)
    return e


def bandnoise(n, lo, hi, order=2):
    x = rng.standard_normal(n)
    sos = signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def lowpass(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'low', fs=SR, output='sos'), x)


def highpass(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'high', fs=SR, output='sos'), x)


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


def stereo(x, pan=0.0, width=0.0):
    l = x * np.sqrt(0.5 * (1 - pan)); r = x * np.sqrt(0.5 * (1 + pan))
    if width > 0:
        d = int(SR * 0.012)
        r = np.concatenate([np.zeros(d), r[:-d]]) * (1 - width) + r * width
    return np.stack([l, r], 1)


# ------------------------------------------------------------- generators
def whoosh(dur=0.7, f0=300, f1=2400, peak_at=0.6):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    t = np.linspace(0, 1, n)
    out = np.zeros(n)
    hop = 512
    zi = None
    fc = f0 * (f1 / f0) ** t
    # time-varying band-pass via short blocks
    for i in range(0, n, hop):
        f = fc[i]
        sos = signal.butter(2, [max(40, f * 0.6), min(SR / 2 - 100, f * 1.6)], 'band', fs=SR, output='sos')
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        y, zi = signal.sosfilt(sos, x[i:i + hop], zi=zi)
        out[i:i + hop] = y
    e = np.where(t < peak_at, (t / peak_at) ** 2, ((1 - t) / (1 - peak_at)) ** 1.5)
    return norm(out * e)


def swell(dur=1.2):
    """Soft reverse-shimmer riser for light flashes."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    x = bandnoise(n, 2500, 9000) * t ** 3
    tones = sum(np.sin(2 * np.pi * f * np.arange(n) / SR) * a for f, a in ((880, .3), (1320, .2), (1760, .15), (2640, .08)))
    x = x * 0.6 + tones * t ** 4 * 0.5
    x *= np.clip((1 - t) / 0.06, 0, 1)
    return norm(x)


def chime(dur=2.4, base=1046.5, partials=((1, 1), (2.0, .35), (2.76, .25), (5.4, .1)), decay=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for k, (m, a) in enumerate(partials):
        x += a * np.sin(2 * np.pi * base * m * t + k) * np.exp(-t * decay * (1 + 0.6 * k))
    x *= np.clip(t / 0.004, 0, 1)
    return norm(x)


def sparkle(dur=1.4, n_notes=7, seed=0):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    x = np.zeros(n)
    scale = [1318.5, 1568, 1760, 2093, 2349, 2637, 3136]
    for i in range(n_notes):
        st = int((i / n_notes) * dur * 0.7 * SR + r.integers(0, 1200))
        c = chime(0.8, scale[r.integers(0, len(scale))], decay=4.5) * (0.5 + 0.5 * r.random())
        e = min(n, st + len(c))
        x[st:e] += c[:e - st]
    return norm(x)


def boom(dur=2.2, f=46):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fr = f * (1 + 0.6 * np.exp(-t * 8))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    x = np.sin(ph) * np.exp(-t * 1.8)
    x += lowpass(rng.standard_normal(n), 300) * np.exp(-t * 3) * 0.6
    return norm(x * np.clip(t / 0.01, 0, 1))


def rumble_wave(dur=2.0):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    x = lowpass(rng.standard_normal(n), 900) * 0.7 + bandnoise(n, 900, 5000) * 0.35
    e = np.clip(t / 0.25, 0, 1) * np.exp(-np.clip(t - 0.25, 0, None) * 2.2)
    return norm(x * e)


def rain(dur, density=60, bright=0.5):
    n = int(dur * SR)
    bed = bandnoise(n, 400, 7000) * 0.25
    x = bed.copy()
    nd = int(density * dur)
    for _ in range(nd):
        p = rng.integers(0, n - 2000)
        L = rng.integers(200, 1400)
        f = rng.uniform(1500, 6000)
        tt = np.arange(L) / SR
        x[p:p + L] += np.sin(2 * np.pi * f * tt * (1 - tt * 8)) * np.exp(-tt * rng.uniform(80, 200)) * rng.uniform(0.2, 1.0) * bright
    return norm(x)


def stream(dur):
    n = int(dur * SR)
    x = bandnoise(n, 300, 3500)
    mod = lowpass(rng.standard_normal(n), 6)
    mod = 0.6 + 0.4 * mod / (np.max(np.abs(mod)) + 1e-9)
    return norm(x * mod)


def wind(dur):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    mod = lowpass(rng.standard_normal(n), 0.8)
    mod = 0.5 + 0.5 * mod / (np.max(np.abs(mod)) + 1e-9)
    y = lowpass(x, 700) * 0.7 + bandnoise(n, 700, 2200) * 0.2
    return norm(y * mod)


def ticks(dur, rate=6.0, pitch=4200):
    n = int(dur * SR)
    x = np.zeros(n)
    for k in range(int(dur * rate)):
        p = int(k / rate * SR)
        L = 600
        tt = np.arange(L) / SR
        c = (np.sin(2 * np.pi * pitch * tt) + 0.5 * np.sin(2 * np.pi * pitch * 1.7 * tt)) * np.exp(-tt * 900)
        c *= 1.0 if k % 2 == 0 else 0.7
        if p + L < n:
            x[p:p + L] += c
    return norm(x)


def buzz(dur, voices=6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for v in range(voices):
        f = rng.uniform(190, 260)
        vib = 1 + 0.02 * np.sin(2 * np.pi * rng.uniform(4, 9) * t + v)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
        am = 0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(0.2, 0.7) * t + v * 2)
        x += saw * am
    x = signal.sosfilt(signal.butter(2, [200, 1800], 'band', fs=SR, output='sos'), x)
    return norm(x)


def bird(dur=2.4, seed=0):
    """Gentle synthetic songbird phrase (FM chirps)."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    x = np.zeros(n)
    t0 = 0.05
    while t0 < dur - 0.3:
        L = r.uniform(0.04, 0.16)
        m = int(L * SR)
        tt = np.arange(m) / SR
        f0 = r.uniform(2400, 4200)
        f1 = f0 * r.uniform(0.6, 1.5)
        f = f0 + (f1 - f0) * tt / L + 300 * np.sin(2 * np.pi * r.uniform(30, 70) * tt)
        ph = 2 * np.pi * np.cumsum(f) / SR
        c = np.sin(ph) * np.sin(np.pi * tt / L) ** 2
        p = int(t0 * SR)
        x[p:p + m] += c[:max(0, min(m, n - p))]
        t0 += L + r.uniform(0.02, 0.12)
        if r.random() < 0.15:
            t0 += r.uniform(0.2, 0.4)
    return norm(x)


def splash(dur=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = bandnoise(n, 600, 9000) * np.exp(-t * 7) + lowpass(rng.standard_normal(n), 400) * np.exp(-t * 12) * 0.8
    for _ in range(25):
        p = rng.integers(int(0.05 * SR), n - 3000)
        L = 900
        tt = np.arange(L) / SR
        x[p:p + L] += np.sin(2 * np.pi * rng.uniform(1500, 4000) * tt) * np.exp(-tt * 150) * 0.3 * np.exp(-p / SR * 3)
    return norm(x)


def drop(dur=1.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 900 + 1400 * np.exp(-t * 30)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    return norm(x * np.clip(t / 0.002, 0, 1))


def pop(dur=0.25, f=1800):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t * (1 + 0.4 * np.exp(-t * 60))) * np.exp(-t * 28)
    return norm(lowpass(x, 5000) * np.clip(t / 0.002, 0, 1))


def pad_tone(dur=4.0, f=146.8):
    """Very soft warm drone used only under the end card (not music: a single sustained tone)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * m * t + m) * a for m, a in ((1, 1), (2, .4), (3, .15), (1.5, .2)))
    e = np.clip(t / 1.2, 0, 1) * np.clip((dur - t) / 1.5, 0, 1)
    return norm(lowpass(x, 1200) * e)


GEN = dict(whoosh=whoosh, swell=swell, chime=chime, sparkle=sparkle, boom=boom, rumble_wave=rumble_wave,
           rain=rain, stream=stream, wind=wind, ticks=ticks, buzz=buzz, bird=bird, splash=splash,
           drop=drop, pop=pop, pad_tone=pad_tone)


def render(cues, total, voice_env, out_wav):
    """cues: list of (t, name, gain_db, kwargs, pan)."""
    n = int(total * SR) + SR
    bus = np.zeros((n, 2))
    for t, name, gdb, kw, pan in cues:
        x = GEN[name](**kw)
        st = stereo(x, pan, width=0.6)
        p = int(t * SR)
        e = min(n, p + len(st))
        if p >= n or e <= p:
            continue
        bus[p:e] += st[:e - p] * 10 ** (gdb / 20)
    bus *= 4.0  # global SFX trim; the voice-relative limiter below keeps speech >= 14 dB on top
    # side-chain: keep the SFX at least 14 dB under the narration whenever it speaks
    out = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', ROOT + '/audio/voice.mp3', '-ac', '1', '-ar', str(SR),
                          '-f', 'f32le', '-'], capture_output=True).stdout
    v = np.frombuffer(out, np.float32)
    v = np.pad(v, (0, max(0, n - len(v))))[:n]
    hop = SR // 100
    m = n // hop
    vr = np.sqrt(np.convolve(v[:m * hop] ** 2, np.ones(hop * 4) / (hop * 4), 'same')[::hop] + 1e-12)
    sm = np.mean(bus[:m * hop], axis=1)
    sr_ = np.sqrt(np.convolve(sm ** 2, np.ones(hop * 4) / (hop * 4), 'same')[::hop] + 1e-12)
    vdb = 20 * np.log10(vr); sdb = 20 * np.log10(sr_)
    # voice activity with hangover so tails of words count
    act = vdb > -42
    act = np.convolve(act.astype(float), np.ones(25), 'same') > 0
    g = np.ones(m)
    want = np.minimum(0.0, (vdb - 14.0) - sdb)
    want = np.maximum(want, -30.0)
    g = np.where(act, 10 ** (want / 20) * 0.75, 1.0)
    # smooth: fast attack (gain down), slow release (gain up)
    out_g = np.empty(m); cur = 1.0
    for i in range(m):
        tgt = g[i]
        cur = tgt if tgt < cur else cur + (tgt - cur) * 0.06
        out_g[i] = cur
    gg = np.interp(np.arange(n), np.arange(m) * hop, out_g)
    bus *= gg[:, None]
    bus = np.tanh(bus * 1.2) / 1.2
    import soundfile as sf
    sf.write(out_wav, bus.astype(np.float32), SR, subtype='FLOAT')
