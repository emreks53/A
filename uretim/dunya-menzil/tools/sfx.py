"""Synthesise the (quiet) sound effects from the scene cue list and mix them under the narration.

python3 tools/sfx.py cues.json data/ses.mp3 out.wav [--total 100]

No music. Every effect is synthesised here (no samples). The SFX bus is kept far below the voice and is
additionally ducked while the narrator speaks."""
import json, sys, subprocess, math
import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(7)


def env_ad(n, a=0.05, shape=3.0):
    """attack fraction a, then exponential-ish decay"""
    t = np.linspace(0, 1, n, endpoint=False)
    na = max(1, int(n * a))
    e = np.ones(n)
    e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    e[na:] = np.exp(-shape * np.linspace(0, 1, n - na))
    return e


def env_bell(n, a=0.4):
    t = np.linspace(0, 1, n, endpoint=False)
    na = max(1, int(n * a))
    e = np.ones(n)
    e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    e[na:] = np.cos(np.linspace(0, np.pi / 2, n - na)) ** 2
    return e


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype='low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype='high', fs=SR, output='sos'), x)


def noise(n):
    return rng.standard_normal(n)


def sweep_bp(x, f0, f1, q=1.2, steps=24):
    """time-varying band-pass by crossfading blocks"""
    n = len(x)
    out = np.zeros(n)
    edges = np.linspace(0, n, steps + 1).astype(int)
    win = np.hanning(2 * (edges[1] - edges[0]) + 2)
    for i in range(steps):
        f = f0 * (f1 / f0) ** (i / max(1, steps - 1))
        lo, hi = f / (1 + 1 / q), min(f * (1 + 1 / q), SR / 2 - 100)
        a, b = max(0, edges[i] - (edges[1] - edges[0])), min(n, edges[i + 1] + (edges[1] - edges[0]))
        seg = bp(x[a:b], lo, hi)
        w = np.hanning(len(seg))
        out[a:b] += seg * w
    return out


def mono_to_st(x, pan=0.0, width=0.0):
    l = x * math.cos((pan + 1) * math.pi / 4)
    r = x * math.sin((pan + 1) * math.pi / 4)
    if width:
        d = int(SR * 0.012 * width)
        r = np.concatenate([np.zeros(d), r[:-d]]) if d else r
    return np.stack([l, r], 1)


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


# ---------------- effect generators (return stereo arrays, peak ~1) ----------------

def fx_whoosh(dur=0.7, pitch=1.0):
    n = int(SR * dur)
    x = sweep_bp(noise(n), 250 * pitch, 1400 * pitch, q=1.0)
    x *= env_bell(n, 0.55)
    st = np.stack([x * np.linspace(1, 0.6, n), x * np.linspace(0.6, 1, n)], 1)
    return norm(st)


def fx_swell(dur=1.4, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = sweep_bp(noise(n), 300 * pitch, 2400 * pitch, q=0.8) * 0.6
    pad = sum(np.sin(2 * np.pi * f * pitch * t) * a for f, a in [(220, 0.5), (330, 0.3), (440, 0.2)])
    x = x + pad * 0.25
    e = np.linspace(0, 1, n) ** 2 * np.concatenate([np.ones(n - n // 6), np.linspace(1, 0, n // 6)])
    return norm(mono_to_st(x * e, 0, 0.5))


def fx_bloom(dur=0.5, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = (900 * pitch) * np.exp(-t * 18) + 260 * pitch
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 14)
    x += bp(noise(n), 1500, 5000) * np.exp(-t * 40) * 0.15
    return norm(mono_to_st(x, 0, 0.6))


def fx_pop(dur=0.18, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 620 * pitch * (1 + 0.6 * np.exp(-t * 60))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32)
    return norm(mono_to_st(x, 0, 0.3))


def fx_chime(dur=2.2, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f0 = 880 * pitch
    x = np.zeros(n)
    for k, (m, a, d) in enumerate([(1, 1, 2.2), (2.76, 0.45, 3.5), (5.4, 0.25, 5), (8.93, 0.12, 7), (1.002, 0.6, 2.0)]):
        x += a * np.sin(2 * np.pi * f0 * m * t + k) * np.exp(-t * d)
    x *= np.minimum(1, t / 0.004)
    return norm(mono_to_st(x, 0, 0.8))


def fx_sparkle(dur=1.0, pitch=1.0):
    n = int(SR * dur)
    out = np.zeros((n, 2))
    r = np.random.default_rng(int(pitch * 1000))
    for i in range(9):
        c = fx_chime(0.5, pitch * (2.2 + r.random() * 2.5)) * (0.25 + 0.5 * r.random())
        s = int(r.random() * (n - len(c)))
        pan = r.random() * 1.6 - 0.8
        out[s:s + len(c), 0] += c[:, 0] * (1 - pan) / 2
        out[s:s + len(c), 1] += c[:, 1] * (1 + pan) / 2
    return norm(out)


def fx_pen(dur=1.5, pitch=1.0):
    n = int(SR * dur)
    x = hp(noise(n), 2500) * 0.6 + bp(noise(n), 900, 2600) * 0.4
    t = np.arange(n) / SR
    mod = 0.5 + 0.5 * np.sin(2 * np.pi * (5 + 3 * np.sin(2 * np.pi * 0.7 * t)) * t) ** 2
    strokes = (signal.sosfilt(signal.butter(1, 6, fs=SR, output='sos'), (rng.random(n) > 0.9995).astype(float) * 300) > 0.02).astype(float)
    x *= mod * (0.4 + 0.6 * lp(rng.random(n), 12))
    x *= env_bell(n, 0.1) ** 0.3
    return norm(mono_to_st(x, -0.1, 0.2))


def fx_page(dur=0.7, pitch=1.0):
    n = int(SR * dur)
    x = bp(noise(n), 1200, 7000)
    crinkle = (rng.random(n) > 0.997).astype(float)
    crinkle = signal.sosfilt(signal.butter(1, 800, fs=SR, output='sos'), crinkle) * 30
    x = x * (0.3 + np.clip(crinkle, 0, 2)) * env_bell(n, 0.35)
    return norm(mono_to_st(x, 0.1, 0.5))


def fx_book(dur=0.5, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 85 * pitch * t) * np.exp(-t * 18) + lp(noise(n), 700) * np.exp(-t * 30) * 0.6
    return norm(mono_to_st(x, 0, 0.2))


def fx_heart(dur=0.9, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    def thump(t0, a):
        tt = np.clip(t - t0, 0, None)
        return a * np.sin(2 * np.pi * 58 * pitch * tt) * np.exp(-tt * 22) * (t >= t0)
    x = thump(0.0, 1.0) + thump(0.26, 0.7)
    return norm(mono_to_st(lp(x, 300), 0, 0))


def fx_sand(dur=2.0, pitch=1.0):
    n = int(SR * dur)
    grains = (rng.random(n) > 0.985).astype(float) * rng.random(n)
    x = hp(grains, 2500) + hp(noise(n), 4000) * 0.05
    e = np.minimum(1, np.arange(n) / (SR * 0.3)) * np.minimum(1, (n - np.arange(n)) / (SR * 0.4))
    return norm(mono_to_st(x * e, 0, 0.4))


def fx_wind(dur=3.0, pitch=1.0):
    n = int(SR * dur)
    x = lp(noise(n), 600 * pitch)
    t = np.arange(n) / SR
    m = 0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * t + 1) * np.sin(2 * np.pi * 0.13 * t)
    e = env_bell(n, 0.4)
    return norm(mono_to_st(x * m * e, 0, 1.0))


def fx_water(dur=1.0, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = bp(noise(n), 400, 3000) * np.exp(-t * 7)
    out = mono_to_st(x, 0, 0.6)
    b = fx_bubbles(dur * 0.8, pitch)
    out[:len(b)] += b * 0.5
    return norm(out)


def fx_bubbles(dur=1.5, pitch=1.0):
    n = int(SR * dur)
    out = np.zeros(n)
    r = np.random.default_rng(int(dur * 100 + pitch * 10))
    k = int(dur * 9)
    for i in range(k):
        L = int(SR * (0.03 + 0.05 * r.random()))
        tt = np.arange(L) / SR
        f0 = (300 + 700 * r.random()) * pitch
        f = f0 * (1 + 1.5 * tt / tt[-1])
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1]) * (0.3 + 0.7 * r.random())
        s = int(r.random() * (n - L))
        out[s:s + L] += b
    return norm(mono_to_st(out, 0, 0.7))


def fx_grow(dur=1.5, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 180 * pitch * (1 + 1.2 * (t / dur) ** 1.5)
    x = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.01 * np.sin(2 * np.pi * 6 * t))) / SR)
    x += 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    x = x * 0.5 + bp(noise(n), 500, 2500) * 0.15
    e = np.minimum(1, t / (dur * 0.4)) * np.minimum(1, (dur - t) / (dur * 0.25))
    return norm(mono_to_st(x * e, 0, 0.5))


def fx_stone(dur=0.9, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = bp(noise(n), 90, 650) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 9 * t)))
    x *= env_bell(n, 0.2)
    return norm(mono_to_st(x, 0, 0.3))


def fx_rumble(dur=2.0, pitch=1.0):
    n = int(SR * dur)
    x = lp(noise(n), 140 * pitch, 4)
    return norm(mono_to_st(x * env_bell(n, 0.3), 0, 0.8))


def fx_drone(dur=4.0, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * pitch * t + p) for f, a, p in [(55, 0.6, 0), (82.4, 0.4, 1), (110.3, 0.2, 2), (164.9, 0.08, 0.5)])
    x = x * (0.8 + 0.2 * np.sin(2 * np.pi * 0.2 * t)) + lp(noise(n), 300) * 0.25
    e = np.minimum(1, t / min(1.5, dur / 3)) * np.minimum(1, (dur - t) / min(1.5, dur / 3))
    return norm(mono_to_st(x * e, 0, 1.0))


def fx_thorn(dur=0.8, pitch=1.0):
    n = int(SR * dur)
    x = sweep_bp(noise(n), 2600 * pitch, 700 * pitch, q=3)
    t = np.arange(n) / SR
    x += 0.3 * np.sin(2 * np.pi * 1730 * pitch * t) * np.exp(-t * 6) * bp(noise(n), 1000, 3000)
    return norm(mono_to_st(x * env_ad(n, 0.1, 4), 0.1, 0.3))


GEN = {k[3:]: v for k, v in globals().items() if k.startswith('fx_')}
DEFAULT_DUR = {'whoosh': 0.7, 'swell': 1.4, 'bloom': 0.5, 'pop': 0.18, 'chime': 2.2, 'sparkle': 1.0, 'pen': 1.5,
               'page': 0.7, 'book': 0.5, 'heart': 0.9, 'sand': 2.0, 'wind': 3.0, 'water': 1.0, 'bubbles': 1.5,
               'grow': 1.5, 'stone': 0.9, 'rumble': 2.0, 'drone': 4.0, 'thorn': 0.8}
# per-type loudness trims (perceived loudness differs a lot between a chime and a rumble)
TRIM = {'whoosh': 0.55, 'swell': 0.5, 'bloom': 0.45, 'pop': 0.35, 'chime': 0.32, 'sparkle': 0.3, 'pen': 0.35,
        'page': 0.45, 'book': 0.6, 'heart': 0.8, 'sand': 0.35, 'wind': 0.5, 'water': 0.5, 'bubbles': 0.4,
        'grow': 0.3, 'stone': 0.5, 'rumble': 0.9, 'drone': 0.7, 'thorn': 0.35}


def reverb(st, mix=0.22, seconds=1.4):
    n = int(SR * seconds)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t * 4.2)[:, None]
    ir[:, 0] = lp(ir[:, 0], 6000)
    ir[:, 1] = lp(ir[:, 1], 6000)
    wet = np.stack([signal.fftconvolve(st[:, c], ir[:, c])[:len(st)] for c in range(2)], 1)
    wet = wet / (np.max(np.abs(wet)) or 1) * (np.max(np.abs(st)) or 1)
    return st * (1 - mix) + wet * mix


def load_audio(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def main():
    cues_path, voice_path, out = sys.argv[1:4]
    total = float(sys.argv[sys.argv.index('--total') + 1]) if '--total' in sys.argv else 100.0
    cues = json.load(open(cues_path))
    N = int(SR * total)
    voice = load_audio(voice_path)
    v = np.zeros((N, 2))
    v[:min(N, len(voice))] = voice[:N]
    bus = np.zeros((N + SR * 8, 2))
    for c in cues:
        typ = c['type']
        if typ not in GEN:
            print('unknown sfx type', typ, file=sys.stderr)
            continue
        dur = float(c.get('dur') or DEFAULT_DUR[typ])
        x = GEN[typ](dur, float(c.get('pitch') or 1.0)) * TRIM[typ] * float(c.get('gain', 0.5))
        s = int(max(0, c['t']) * SR)
        bus[s:s + len(x)] += x[:len(bus) - s]
    bus = bus[:N]
    bus = reverb(bus, 0.25)
    # duck under the voice: envelope of the narration
    venv = np.abs(v).max(1)
    win = int(SR * 0.12)
    venv = np.convolve(venv, np.ones(win) / win, mode='same')
    venv = venv / (venv.max() or 1)
    duck = 1.0 - 0.5 * np.clip(venv * 4, 0, 1)
    bus *= duck[:, None]
    # SFX bus level: peaks around -27 dBFS (voice peaks near -1 dBFS)
    sfx_gain = 10 ** (-27 / 20) / (np.max(np.abs(bus)) or 1) if np.max(np.abs(bus)) > 10 ** (-27 / 20) else 1.0
    bus *= sfx_gain
    vpk = np.max(np.abs(v)) or 1
    v *= 10 ** (-1.5 / 20) / vpk
    mix = v + bus
    mix = np.clip(mix, -0.999, 0.999)
    import wave
    w = wave.open(out, 'wb')
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
    w.close()
    rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
    print(f'{len(cues)} cues; voice rms {rms(v):.1f} dBFS, sfx rms {rms(bus):.1f} dBFS, sfx peak {20*np.log10(np.max(np.abs(bus))+1e-9):.1f} dBFS -> {out}')


if __name__ == '__main__':
    main()
