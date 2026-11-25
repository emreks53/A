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
# Gentle palette: soft tonal sounds and heavily filtered air. Nothing harsh, gritty or noisy.

def pink(n):
    w = noise(n)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, w)


def smooth_env(n, att=0.1, rel=0.5):
    """raised-cosine attack (fraction) and long cosine release (fraction): click-free"""
    e = np.ones(n)
    na, nr = max(2, int(n * att)), max(2, int(n * rel))
    e[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    e[-nr:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nr))
    return e


def soft_tone(f, n, partials=((1, 1.0),), decay=3.0, att=0.006):
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * decay * (0.6 + 0.4 * m)) for m, a in partials)
    x *= np.minimum(1, t / att)
    return x


def fx_whoosh(dur=0.8, pitch=1.0):
    n = int(SR * dur)
    x = sweep_bp(pink(n), 260 * pitch, 900 * pitch, q=0.9)
    x = lp(x, 2400) * smooth_env(n, 0.5, 0.5)
    return norm(np.stack([x * np.linspace(1, 0.7, n), x * np.linspace(0.7, 1, n)], 1))


def fx_swell(dur=1.6, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f0 = 196 * pitch
    pad = sum(a * np.sin(2 * np.pi * f0 * m * t + m) for m, a in [(1, 0.55), (1.5, 0.3), (2, 0.18), (3, 0.06)])
    pad *= 1 + 0.03 * np.sin(2 * np.pi * 4.5 * t)
    air = lp(sweep_bp(pink(n), 300, 1200, q=0.7), 1800) * 0.25
    return norm(mono_to_st(lp(pad + air, 3000) * smooth_env(n, 0.55, 0.4), 0, 0.6))


def fx_bloom(dur=0.6, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = (520 * pitch) * np.exp(-t * 10) + 300 * pitch
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * np.minimum(1, t / 0.004)
    x += 0.35 * soft_tone(600 * pitch, n, ((1, 1), (2, 0.2)), decay=6)
    return norm(mono_to_st(lp(x, 3000), 0, 0.6))


def fx_pop(dur=0.3, pitch=1.0):
    n = int(SR * dur)
    x = soft_tone(523 * pitch, n, ((1, 1), (2, 0.15)), decay=14, att=0.008)
    return norm(mono_to_st(lp(x, 2500), 0, 0.3))


def fx_chime(dur=2.6, pitch=1.0):
    n = int(SR * dur)
    f0 = 660 * pitch
    x = soft_tone(f0, n, ((1, 1.0), (2.0, 0.28), (3.0, 0.08), (2.76, 0.05)), decay=1.6, att=0.01)
    return norm(mono_to_st(lp(x, 5000), 0, 0.9))


def fx_sparkle(dur=1.2, pitch=1.0):
    n = int(SR * dur)
    out = np.zeros((n, 2))
    r = np.random.default_rng(int(pitch * 1000) + 3)
    notes = [1.0, 1.25, 1.5, 2.0, 1.875]
    sub = max(0.25, min(0.9, dur * 0.6))
    for i in range(6):
        c = fx_chime(sub, pitch * 1.6 * notes[i % len(notes)]) * (0.3 + 0.4 * r.random())
        c = c[:n]
        s = max(0, int((i / 6 + 0.05 * r.random()) * (n - len(c))))
        c = c[:n - s]
        pan = r.random() * 1.2 - 0.6
        out[s:s + len(c), 0] += c[:, 0] * (1 - pan) / 2
        out[s:s + len(c), 1] += c[:, 1] * (1 + pan) / 2
    out[:, 0] = lp(out[:, 0], 5500); out[:, 1] = lp(out[:, 1], 5500)
    return norm(out)


def fx_pen(dur=1.5, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = bp(pink(n), 900, 2800) * (0.55 + 0.45 * np.sin(2 * np.pi * 2.2 * t) ** 2)
    return norm(mono_to_st(lp(x, 3200) * smooth_env(n, 0.2, 0.3), -0.1, 0.2))


def fx_page(dur=0.8, pitch=1.0):
    n = int(SR * dur)
    x = bp(pink(n), 500, 3200) * (0.6 + 0.4 * lp(np.abs(noise(n)), 30) * 3)
    return norm(mono_to_st(lp(x, 3500) * smooth_env(n, 0.3, 0.5), 0.1, 0.5))


def fx_book(dur=0.6, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 92 * pitch * t) * np.exp(-t * 12) * np.minimum(1, t / 0.006)
    x += lp(pink(n), 400) * np.exp(-t * 20) * 0.4
    return norm(mono_to_st(x, 0, 0.2))


def fx_heart(dur=1.0, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    def thump(t0, a):
        tt = np.clip(t - t0, 0, None)
        return a * np.sin(2 * np.pi * 52 * pitch * tt) * np.exp(-tt * 16) * np.minimum(1, tt / 0.012) * (t >= t0)
    x = thump(0.0, 1.0) + thump(0.27, 0.6)
    return norm(mono_to_st(lp(x, 220), 0, 0))


def fx_sand(dur=2.0, pitch=1.0):
    n = int(SR * dur)
    grains = (rng.random(n) > 0.992).astype(float) * rng.random(n)
    x = lp(hp(grains, 1500), 5000) + lp(hp(pink(n), 2000), 5000) * 0.08
    return norm(mono_to_st(x * smooth_env(n, 0.25, 0.35), 0, 0.4))


def fx_wind(dur=3.0, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = lp(pink(n), 700 * pitch) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.3 * t + 1))
    return norm(mono_to_st(x * smooth_env(n, 0.4, 0.45), 0, 1.0))


def fx_water(dur=1.2, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = lp(bp(pink(n), 300, 1800), 2000) * np.exp(-t * 3.5) * np.minimum(1, t / 0.02)
    out = mono_to_st(x, 0, 0.6)
    d = fx_bloom(0.5, pitch * 0.8)
    out[int(SR * 0.05):int(SR * 0.05) + len(d)] += d[:n - int(SR * 0.05)] * 0.5
    return norm(out)


def fx_bubbles(dur=1.5, pitch=1.0):
    n = int(SR * dur)
    out = np.zeros(n)
    r = np.random.default_rng(int(dur * 100 + pitch * 10))
    for i in range(int(dur * 6)):
        L = int(SR * (0.05 + 0.05 * r.random()))
        tt = np.arange(L) / SR
        f0 = (240 + 360 * r.random()) * pitch
        b = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.8 * tt / tt[-1])) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2
        s = int(r.random() * (n - L))
        out[s:s + L] += b * (0.3 + 0.7 * r.random())
    return norm(mono_to_st(lp(out, 1800), 0, 0.7))


def fx_grow(dur=1.6, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 220 * pitch * (1 + 0.5 * (t / dur) ** 1.4)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.7 + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    return norm(mono_to_st(lp(x, 2500) * smooth_env(n, 0.45, 0.35), 0, 0.5))


def fx_stone(dur=0.8, pitch=1.0):
    # soft, low settle (no grinding)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 70 * pitch * t) * np.exp(-t * 7) * np.minimum(1, t / 0.01)
    x += lp(pink(n), 300) * np.exp(-t * 9) * 0.3
    return norm(mono_to_st(lp(x, 500), 0, 0.3))


def fx_rumble(dur=2.0, pitch=1.0):
    # soft low pad swell instead of noise rumble
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * pitch * t + p) for f, a, p in [(55, 0.7, 0), (82.4, 0.35, 1.1), (110, 0.12, 2)])
    return norm(mono_to_st(lp(x, 400) * smooth_env(n, 0.35, 0.5), 0, 0.8))


def fx_drone(dur=4.0, pitch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * pitch * t + p) for f, a, p in [(65.4, 0.55, 0), (98, 0.3, 1), (130.8, 0.12, 2), (155.6, 0.06, 0.5)])
    x *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.18 * t)
    return norm(mono_to_st(lp(x, 600) * smooth_env(n, 0.3, 0.3), 0, 1.0))


def fx_thorn(dur=1.0, pitch=1.0):
    # soft dark dissonance (minor second) swelling and fading — no scraping
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 146.8 * pitch * t) + 0.7 * np.sin(2 * np.pi * 155.6 * pitch * t)
    return norm(mono_to_st(lp(x, 800) * smooth_env(n, 0.4, 0.5), 0.1, 0.4))


GEN = {k[3:]: v for k, v in globals().items() if k.startswith('fx_')}
DEFAULT_DUR = {'whoosh': 0.8, 'swell': 1.6, 'bloom': 0.6, 'pop': 0.3, 'chime': 2.6, 'sparkle': 1.2, 'pen': 1.5,
               'page': 0.8, 'book': 0.6, 'heart': 1.0, 'sand': 2.0, 'wind': 3.0, 'water': 1.2, 'bubbles': 1.5,
               'grow': 1.6, 'stone': 0.8, 'rumble': 2.0, 'drone': 4.0, 'thorn': 1.0}
# per-type loudness trims (perceived loudness differs a lot between a chime and a rumble)
TRIM = {'whoosh': 0.45, 'swell': 0.5, 'bloom': 0.4, 'pop': 0.3, 'chime': 0.3, 'sparkle': 0.22, 'pen': 0.22,
        'page': 0.3, 'book': 0.45, 'heart': 0.6, 'sand': 0.22, 'wind': 0.35, 'water': 0.35, 'bubbles': 0.3,
        'grow': 0.28, 'stone': 0.4, 'rumble': 0.55, 'drone': 0.5, 'thorn': 0.3}


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
        k = min(len(x) // 4, int(SR * 0.03))      # click-free edges
        if k > 1:
            x[:k] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, k)))[:, None]
            x[-k:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, k)))[:, None]
        s = int(max(0, c['t']) * SR)
        bus[s:s + len(x)] += x[:len(bus) - s]
    bus = bus[:N]
    bus = reverb(bus, 0.3)
    bus[:, 0] = lp(bus[:, 0], 7000); bus[:, 1] = lp(bus[:, 1], 7000)
    # duck under the voice: envelope of the narration
    venv = np.abs(v).max(1)
    win = int(SR * 0.12)
    venv = np.convolve(venv, np.ones(win) / win, mode='same')
    venv = venv / (venv.max() or 1)
    duck = 1.0 - 0.5 * np.clip(venv * 4, 0, 1)
    bus *= duck[:, None]
    # SFX bus level: clearly below the voice. RMS of the active SFX parts sits ~20 dB under the voice RMS,
    # and peaks are softly limited to -20 dBFS so no effect ever competes with the narrator.
    vpk = np.max(np.abs(v)) or 1
    v *= 10 ** (-1.5 / 20) / vpk
    active = np.abs(bus).max(1) > 1e-4
    rms_v = np.sqrt(np.mean(v[np.abs(v).max(1) > 1e-3] ** 2))
    rms_b = np.sqrt(np.mean(bus[active] ** 2)) if active.any() else 1
    bus *= (rms_v * 10 ** (-20 / 20)) / (rms_b or 1)
    lim = 10 ** (-20 / 20)
    bus = lim * np.tanh(bus / lim)
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
