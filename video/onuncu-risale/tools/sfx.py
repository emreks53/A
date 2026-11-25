"""Ses efektlerini sentezler ve sesle karıştırır (müzik yok; efektler kısık, konuşma baskın).

python tools/sfx.py data/sfx.json <ses.mp3|wav> <çıktı.wav> [toplam_sure]
Her efekt numpy ile üretilir (lisans sorunu yok): fırça sürtmesi, yumuşak "pop", hava geçişleri,
su akışı, rüzgâr, yaprak hışırtısı, oda sesi, yumuşak tıklar, kalp atışı.
"""
import json, sys, math
import numpy as np

SR = 44100
rng = np.random.default_rng(1234)


def env_ad(n, a, d, curve=3.0):
    a = max(1, int(a * SR)); t = np.arange(n) / SR
    e = np.minimum(1.0, np.arange(n) / a)
    e *= np.exp(-np.maximum(0, t - a / SR) * curve / max(d, 1e-3))
    return e


def hann_env(n, attack_frac=0.35):
    a = max(1, int(n * attack_frac)); e = np.ones(n)
    e[:a] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    r = n - a; e[a:] = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r))
    return e


def biquad_bp(x, f0, q):
    w0 = 2 * np.pi * f0 / SR; al = np.sin(w0) / (2 * q)
    b = np.array([al, 0, -al]); a = np.array([1 + al, -2 * np.cos(w0), 1 - al])
    return lfilter(b / a[0], a / a[0], x)


def lfilter(b, a, x):
    # basit doğrudan form (scipy yoksa); x kısa olduğu için yeterli hızda
    try:
        import scipy.signal as ss
        return ss.lfilter(b, a, x)
    except Exception:
        y = np.zeros_like(x)
        for i in range(len(x)):
            y[i] = b[0] * x[i] + (b[1] * x[i - 1] if i > 0 else 0) + (b[2] * x[i - 2] if i > 1 else 0) - (a[1] * y[i - 1] if i > 0 else 0) - (a[2] * y[i - 2] if i > 1 else 0)
        return y


def sweep_bp(x, f_start, f_end, q=1.2, blocks=64):
    """Merkez frekansı zamanla kayan bant geçiren (blok blok)."""
    n = len(x); out = np.zeros(n); bl = max(256, n // blocks)
    import scipy.signal as ss
    zi = None
    for s in range(0, n, bl):
        e = min(n, s + bl); fr = s / max(1, n - 1)
        f0 = f_start * (f_end / f_start) ** fr
        w0 = 2 * np.pi * f0 / SR; al = np.sin(w0) / (2 * q)
        b = np.array([al, 0, -al]) / (1 + al); a = np.array([1, -2 * np.cos(w0) / (1 + al), (1 - al) / (1 + al)])
        if zi is None: zi = np.zeros(2)
        out[s:e], zi = ss.lfilter(b, a, x[s:e], zi=zi)
    return out


def lowpass(x, fc, order=2):
    import scipy.signal as ss
    b, a = ss.butter(order, fc / (SR / 2), 'low'); return ss.lfilter(b, a, x)


def highpass(x, fc, order=2):
    import scipy.signal as ss
    b, a = ss.butter(order, fc / (SR / 2), 'high'); return ss.lfilter(b, a, x)


def bandpass(x, f1, f2, order=2):
    import scipy.signal as ss
    b, a = ss.butter(order, [f1 / (SR / 2), f2 / (SR / 2)], 'band'); return ss.lfilter(b, a, x)


def noise(n):
    return rng.standard_normal(n)


def pink(n):
    w = noise(n); X = np.fft.rfft(w); f = np.arange(len(X)); f[0] = 1
    return np.fft.irfft(X / np.sqrt(f), n)


def norm(x):
    m = np.max(np.abs(x)) + 1e-9; return x / m


def pan(x, p):
    p = np.clip(p, -1, 1); l = np.cos((p + 1) * np.pi / 4); r = np.sin((p + 1) * np.pi / 4)
    return np.stack([x * l, x * r], 1)


# ---------------- efektler (mono, tepe 1'e normalize)
def fx_brush(ev, big=False):
    d = 0.55 if big else 0.24; n = int(d * SR)
    x = bandpass(noise(n), 500 if big else 1300, 4200 if big else 6500)
    grain = lowpass(np.abs(noise(n)), 60) ; grain = 0.6 + 0.4 * norm(grain)
    e = env_ad(n, 0.03 if big else 0.012, d * 0.55, 2.2) * grain
    return norm(x * e)


def fx_whoosh(ev, f0, f1, q=1.4):
    d = ev.get('dur', 1.0); n = int(d * SR)
    x = sweep_bp(pink(n) * 3, f0, f1, q)
    return norm(x * hann_env(n, 0.55))


def fx_pop(ev):
    p = ev.get('pitch', 1.0); n = int(0.16 * SR); t = np.arange(n) / SR
    f = (520 + 420 * np.exp(-t * 55)) * p
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env_ad(n, 0.003, 0.06, 3.5)
    x += 0.08 * lowpass(noise(n), 3000) * env_ad(n, 0.001, 0.01, 4)
    return norm(lowpass(x, 5000))


def fx_chime(ev):
    n = int(1.8 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for f, a, dcy in [(1318.5, 1.0, 1.1), (2637 * 1.0021, 0.35, 0.7), (3959 * 0.998, 0.18, 0.45), (5274, 0.07, 0.3)]:
        x += a * np.sin(2 * np.pi * f * t) * np.exp(-t / dcy)
    x *= np.minimum(1, t / 0.006)
    return norm(x)


def fx_crunch(ev):
    n = int(0.22 * SR); x = np.zeros(n)
    for k in range(7):
        s = int(rng.uniform(0, 0.15) * SR); m = int(0.025 * SR)
        if s + m < n: x[s:s + m] += bandpass(noise(m), 1800, 7000) * env_ad(m, 0.001, 0.012, 4) * rng.uniform(0.4, 1)
    return norm(x)


def fx_shimmer(ev):
    d = ev.get('dur', 1.2); n = int(d * SR); x = np.zeros(n); t = np.arange(int(0.06 * SR)) / SR
    for k in range(int(d * 22)):
        s = int(rng.uniform(0, d - 0.07) * SR); f = rng.uniform(3200, 7800)
        g = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.018) * rng.uniform(0.3, 1)
        x[s:s + len(g)] += g
    return norm(x * hann_env(n, 0.2))


def fx_wind(ev):
    d = ev.get('dur', 3); n = int(d * SR)
    x = bandpass(pink(n), 180, 900)
    mod = 0.65 + 0.35 * np.sin(2 * np.pi * 0.35 * np.arange(n) / SR + 1.3)
    return norm(x * mod * hann_env(n, 0.4))


def fx_leaves(ev):
    d = ev.get('dur', 2); n = int(d * SR)
    x = bandpass(noise(n), 2200, 7500)
    gate = lowpass((rng.random(n) < 0.0009).astype(float) * 40, 18); gate = np.clip(gate, 0, 1)
    return norm(x * (0.15 + gate) * hann_env(n, 0.3))


def fx_tick(ev, warm=False):
    p = ev.get('pitch', 1.0); n = int(0.12 * SR); t = np.arange(n) / SR
    if warm: x = (np.sin(2 * np.pi * 880 * p * t) + 0.5 * np.sin(2 * np.pi * 1320 * p * t)) * np.exp(-t / 0.035)
    else: x = np.sin(2 * np.pi * 1760 * p * t) * np.exp(-t / 0.014) + 0.15 * highpass(noise(n), 3000) * np.exp(-t / 0.004)
    x *= np.minimum(1, t / 0.0015)
    return norm(x)


def fx_heartbeat(ev):
    n = int(0.55 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for s, f, a in [(0.0, 58, 1.0), (0.2, 66, 0.7)]:
        tt = t - s; m = tt >= 0
        x[m] += a * np.sin(2 * np.pi * f * tt[m]) * np.exp(-tt[m] / 0.06) * np.minimum(1, tt[m] / 0.006)
    return norm(lowpass(x, 220))


def fx_bubble(ev):
    n = int(0.5 * SR); x = np.zeros(n)
    for k in range(5):
        s = int(rng.uniform(0, 0.35) * SR); m = int(0.07 * SR); t = np.arange(m) / SR
        f = rng.uniform(500, 900) * (1 + 2.5 * t / 0.07)
        x[s:s + m] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.025) * rng.uniform(0.4, 1)
    return norm(x)


def fx_scan(ev):
    d = ev.get('dur', 1.0); n = int(d * SR); t = np.arange(n) / SR
    f = 2100 + 700 * t / d
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * t))
    x = 0.4 * x + bandpass(noise(n), 3000, 7000) * 0.4
    return norm(x * hann_env(n, 0.3))


def fx_bloom(ev):
    d = ev.get('dur', 1.4); n = int(d * SR)
    x = biquad_bp(pink(n), 2100, 6) + 0.7 * biquad_bp(pink(n), 3300, 7) + 0.5 * biquad_bp(pink(n), 4700, 8)
    x = norm(x) * hann_env(n, 0.35) + 0.35 * fx_shimmer({'dur': d})
    return norm(x)


def fx_water(ev):
    d = ev.get('dur', 6); n = int(d * SR)
    base = bandpass(pink(n), 300, 2600) * 0.8 + bandpass(noise(n), 2500, 6000) * 0.12
    mod = 0.75 + 0.25 * norm(lowpass(noise(n), 3))
    x = norm(base * mod)
    # kabarcıklar
    for k in range(int(d * 9)):
        s = int(rng.uniform(0, d - 0.08) * SR); m = int(rng.uniform(0.03, 0.07) * SR); t = np.arange(m) / SR
        f = rng.uniform(450, 1500) * (1 + rng.uniform(0.8, 2.2) * t / (m / SR))
        x[s:s + m] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.018) * rng.uniform(0.08, 0.25)
    return norm(x * hann_env(n, min(0.25, 0.8 / d)))


def fx_bird(t0=0.0):
    m = int(0.18 * SR); t = np.arange(m) / SR
    f = 3400 + 900 * np.sin(2 * np.pi * 18 * t) + 1500 * t / 0.18
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.18) ** 2


def fx_room(ev):
    d = ev.get('dur', 5); n = int(d * SR)
    x = norm(lowpass(pink(n), 1800)) * 0.35 + norm(fx_water({'dur': d})) * 0.25
    for s in [0.9, 1.15, 2.6, 3.7]:
        if s + 0.2 < d:
            b = fx_bird(); i = int(s * SR); x[i:i + len(b)] += b * 0.06
    return norm(x * hann_env(n, 0.2))


def render_event(ev):
    k = ev['kind']
    if k == 'brush': return fx_brush(ev)
    if k == 'brush-big': return fx_brush(ev, True)
    if k == 'whoosh-soft': return fx_whoosh(ev, 300, 1400)
    if k == 'whoosh-in': return fx_whoosh(ev, 250, 2600, 1.6)
    if k == 'whoosh-out': return fx_whoosh(ev, 2200, 260, 1.6)
    if k == 'whoosh-deep': return fx_whoosh(ev, 110, 700, 1.1)
    if k == 'rise': return fx_whoosh(ev, 180, 2400, 1.2)
    if k == 'airy': return fx_whoosh(ev, 1400, 3400, 0.9)
    if k == 'sweep': return fx_whoosh(ev, 600, 3000, 1.3)
    if k == 'pop': return fx_pop(ev)
    if k == 'chime': return fx_chime(ev)
    if k == 'crunch': return fx_crunch(ev)
    if k == 'shimmer': return fx_shimmer(ev)
    if k == 'wind': return fx_wind(ev)
    if k == 'leaves': return fx_leaves(ev)
    if k == 'tick': return fx_tick(ev)
    if k == 'tick-warm': return fx_tick(ev, True)
    if k == 'heartbeat': return fx_heartbeat(ev)
    if k == 'bubble': return fx_bubble(ev)
    if k == 'scan': return fx_scan(ev)
    if k == 'bloom': return fx_bloom(ev)
    if k == 'water': return fx_water(ev)
    if k == 'room': return fx_room(ev)
    raise ValueError(k)


def load_voice(path):
    import subprocess
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def main():
    evs = json.load(open(sys.argv[1])); voice = load_voice(sys.argv[2]); out = sys.argv[3]
    total = float(sys.argv[4]) if len(sys.argv) > 4 else len(voice) / SR + 5
    N = int(total * SR)
    mix_v = np.zeros((N, 2)); mix_v[:min(N, len(voice))] = voice[:N]
    fx = np.zeros((N, 2))
    BUS = 10 ** (-9 / 20)  # efekt yolunun genel kısıklığı
    for i, ev in enumerate(evs):
        x = render_event(ev)
        g = 10 ** (ev.get('gain', 0) / 20) * BUS
        p = ev.get('pan', float(np.clip(rng.normal(0, 0.25), -0.6, 0.6)))
        s = int(ev['t'] * SR)
        if s >= N: continue
        st = pan(x * g, p); e = min(N, s + len(st)); fx[s:e] += st[:e - s]
    # konuşma varken efektleri biraz daha kıs (yan zincir sıkıştırma)
    venv = np.abs(mix_v).mean(1)
    import scipy.signal as ss
    b, a = ss.butter(1, 6 / (SR / 2)); venv = ss.filtfilt(b, a, venv)
    duck = 1 - 0.45 * np.clip(venv / (np.percentile(venv, 90) + 1e-9), 0, 1)
    fx *= duck[:, None]
    mix = mix_v + fx
    peak = np.max(np.abs(mix))
    if peak > 0.97: mix *= 0.97 / peak
    # rapor
    def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    print(f"ses RMS {db(mix_v):.1f} dB, efekt RMS {db(fx):.1f} dB, efekt tepe {20*np.log10(np.max(np.abs(fx))+1e-12):.1f} dB, karışım tepe {20*np.log10(np.max(np.abs(mix))):.1f} dB")
    import wave
    pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2')
    with wave.open(out, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    main()
