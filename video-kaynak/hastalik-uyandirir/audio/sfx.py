#!/usr/bin/env python3
"""Ses efektlerini (yordamsal) üretip anlatımla karıştırır.
Efektler kısık ve anlatımın altında: konuşma varken ayrıca bastırılır (ducking). Müzik yok.
Kullanım: python3 audio/sfx.py cues.json narration.mp3 out.wav [toplam_süre]
"""
import json, sys, math
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
rng = np.random.default_rng(1234)

def env_exp(n, tau):
    t = np.arange(n) / SR
    return np.exp(-t / tau)

def adsr(n, a=0.01, r=0.2):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    rel = np.clip((t[-1] - t) / max(r, 1e-4), 0, 1) if n else e
    return e * rel

def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos')
    return signal.sosfilt(sos, x)

def lp(x, f, order=2):
    sos = signal.butter(order, f, btype='low', fs=SR, output='sos')
    return signal.sosfilt(sos, x)

def hp(x, f, order=2):
    sos = signal.butter(order, f, btype='high', fs=SR, output='sos')
    return signal.sosfilt(sos, x)

def noise(n):
    return rng.standard_normal(n)

def sine(f, n, phase=0):
    if np.isscalar(f):
        return np.sin(2 * np.pi * f * np.arange(n) / SR + phase)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph + phase)

def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak

def pan(x, p):
    # p: -1 sol .. 1 sağ (sabit güç)
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1)

# ---------- efektler (mono, tepe ~1) ----------
def fx_tick(v):
    n = int(0.09 * SR)
    click = noise(n) * env_exp(n, 0.0025)
    ping = sine(2600 + rng.uniform(-80, 80), n) * env_exp(n, 0.012) * 0.6
    wood = sine(820, n) * env_exp(n, 0.02) * 0.5
    return norm(bp(click, 1500, 7000) + ping + wood)

def fx_rustle(v):
    n = int(rng.uniform(0.45, 0.7) * SR)
    x = bp(noise(n), 900, 6500)
    grains = np.zeros(n)
    for _ in range(40):
        c = rng.integers(0, n); w = int(rng.uniform(0.01, 0.05) * SR)
        g = signal.windows.hann(min(w, n - c)) if n - c > 4 else np.zeros(0)
        grains[c:c + len(g)] += g * rng.uniform(0.3, 1)
    return norm(x * (0.25 + grains) * adsr(n, 0.04, 0.2))

def fx_whoosh(v):
    n = int(rng.uniform(0.55, 0.85) * SR)
    x = noise(n)
    t = np.linspace(0, 1, n)
    fc = 250 * (14 ** t) if rng.random() < 0.6 else 3500 * (0.08 ** t)
    out = np.zeros(n); hop = 512
    for i in range(0, n, hop):
        seg = x[max(0, i - 2048):i + hop]
        f = float(fc[min(i, n - 1)])
        y = bp(seg, max(80, f * 0.6), min(16000, f * 1.6))[-min(hop, n - i):]
        out[i:i + len(y)] = y
    e = np.sin(np.pi * t) ** 1.6
    return norm(out * e)

def fx_pop(v):
    n = int(0.12 * SR)
    f = np.linspace(rng.uniform(520, 700), 240, n)
    x = sine(f, n) * env_exp(n, 0.035)
    c = bp(noise(n), 2000, 8000) * env_exp(n, 0.002) * 0.3
    return norm(x + c)

def bell(base, n, decay, partials=((1, 1), (2.76, 0.5), (5.4, 0.28), (8.93, 0.14))):
    x = np.zeros(n)
    for r, a in partials:
        x += a * sine(base * r * (1 + rng.uniform(-0.002, 0.002)), n) * env_exp(n, decay / (r ** 0.6))
    return x

def fx_chime(v):
    n = int(2.2 * SR)
    base = rng.choice([880, 987.8, 1174.7, 1318.5])
    x = bell(base, n, 0.9) + 0.5 * bell(base * 1.5, n, 0.7)
    return norm(x * adsr(n, 0.003, 0.4))

def fx_bell(v):
    n = int(3.2 * SR)
    x = bell(rng.choice([392, 440, 523.3]), n, 1.4)
    return norm(x * adsr(n, 0.004, 0.6))

def fx_glass(v):
    n = int(1.0 * SR)
    x = bell(rng.uniform(2200, 3200), n, 0.25, ((1, 1), (2.32, 0.6), (4.25, 0.35), (6.63, 0.2)))
    return norm(x)

def fx_sparkle(v):
    n = int(0.9 * SR)
    x = np.zeros(n)
    for _ in range(9):
        c = rng.integers(0, int(0.6 * SR)); m = int(0.25 * SR)
        f = rng.uniform(3000, 7000)
        s = sine(f, m) * env_exp(m, 0.04) * rng.uniform(0.3, 1)
        x[c:c + m] += s[:n - c]
    return norm(x)

def fx_wind(v):
    n = int(rng.uniform(1.6, 2.4) * SR)
    x = lp(noise(n), 900)
    t = np.linspace(0, 1, n)
    mod = 0.6 + 0.4 * np.sin(2 * np.pi * (0.7 * t + rng.random())) * np.sin(2 * np.pi * 1.9 * t)
    x = x * mod * np.sin(np.pi * t) ** 1.2
    return norm(x + 0.3 * bp(noise(n), 1500, 4000) * mod * np.sin(np.pi * t) ** 2)

def fx_thud(v):
    n = int(0.45 * SR)
    f = np.linspace(95, 48, n)
    x = sine(f, n) * env_exp(n, 0.09) + 0.3 * lp(noise(n), 300) * env_exp(n, 0.03)
    return norm(x)

def fx_swell(v):
    n = int(1.4 * SR)
    t = np.linspace(0, 1, n)
    pad = sum(sine(f, n) for f in (220, 277.2, 329.6, 440)) / 4
    x = (pad * 0.6 + 0.4 * bp(noise(n), 400, 3000)) * (t ** 2) * (1 - np.clip((t - 0.9) / 0.1, 0, 1))
    return norm(x)

def fx_bubble(v):
    n = int(0.16 * SR)
    f = np.linspace(300, 1100, n)
    return norm(sine(f, n) * env_exp(n, 0.05) * adsr(n, 0.005, 0.05))

def fx_coin(v):
    n = int(0.9 * SR)
    x = np.zeros(n)
    for k, d in enumerate([0, 0.11, 0.19]):
        c = int(d * SR); m = n - c
        hit = bell(rng.uniform(2000, 2400), m, 0.12, ((1, 1), (1.62, 0.7), (2.47, 0.5), (3.55, 0.35))) * (0.9 ** k) * (1 if k == 0 else 0.5)
        x[c:] += hit
    return norm(x)

def fx_birds(v):
    n = int(1.4 * SR)
    x = np.zeros(n)
    for _ in range(rng.integers(3, 6)):
        c = rng.integers(0, int(1.0 * SR)); m = int(rng.uniform(0.06, 0.14) * SR)
        f0 = rng.uniform(2500, 4200)
        f = f0 + 900 * np.sin(np.linspace(0, np.pi * rng.uniform(1, 3), m))
        s = sine(f, m) * signal.windows.hann(m)
        x[c:c + m] += s[:n - c]
    return norm(x)

def fx_sand(v):
    n = int(rng.uniform(1.2, 1.8) * SR)
    x = hp(noise(n), 3000)
    grains = (rng.random(n) < 0.02) * rng.uniform(0.5, 1, n)
    t = np.linspace(0, 1, n)
    return norm((x * 0.4 + grains * hp(noise(n), 5000)) * np.sin(np.pi * t))

def fx_crack(v):
    n = int(0.5 * SR)
    x = hp(noise(n), 2500) * env_exp(n, 0.01)
    for _ in range(6):
        c = rng.integers(0, int(0.25 * SR)); m = int(0.01 * SR)
        x[c:c + m] += hp(noise(m), 4000) * rng.uniform(0.4, 1)
    return norm(x + 0.4 * bell(4200, n, 0.05))

def fx_heartbeat(v):
    n = int(0.9 * SR)
    x = np.zeros(n)
    for d, a in ((0, 1), (0.22, 0.7)):
        c = int(d * SR); m = int(0.18 * SR)
        f = np.linspace(70, 45, m)
        x[c:c + m] += sine(f, m) * env_exp(m, 0.045) * a
    return norm(lp(x, 200))

def fx_water(v):
    n = int(rng.uniform(2.0, 3.0) * SR)
    t = np.linspace(0, 1, n)
    x = lp(noise(n), 700) * (0.5 + 0.5 * np.sin(2 * np.pi * (0.6 * t * 3)) ** 2)
    return norm(x * np.sin(np.pi * t) + 0.2 * bp(noise(n), 1500, 5000) * np.sin(np.pi * t) ** 3)

def fx_step(v):
    n = int(0.14 * SR)
    return norm(lp(noise(n), 600) * env_exp(n, 0.03) + 0.2 * bp(noise(n), 1500, 4000) * env_exp(n, 0.01))

def fx_paper(v):
    n = int(0.6 * SR)
    x = bp(noise(n), 1800, 7000)
    e = np.abs(lp(noise(n), 30)); e = e / (e.max() + 1e-9)
    return norm(x * e * adsr(n, 0.02, 0.15))

def fx_flame(v):
    n = int(1.2 * SR)
    x = 0.4 * lp(noise(n), 400)
    for _ in range(25):
        c = rng.integers(0, n - 200)
        x[c:c + 120] += hp(noise(120), 3000) * rng.uniform(0.2, 1)
    t = np.linspace(0, 1, n)
    return norm(x * np.sin(np.pi * t) ** 0.5)

def fx_rumble(v):
    n = int(2.0 * SR)
    t = np.linspace(0, 1, n)
    x = lp(noise(n), 120, 4) * (np.exp(-3 * t) * (1 - np.exp(-40 * t)))
    return norm(x)

FX = {k[3:]: v for k, v in globals().items() if k.startswith('fx_')}

# ---------- basit oda yankısı ----------
def reverb(x, wet=0.18, length=1.6):
    n = int(length * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t / 0.35)[:, None]
    ir = lp(ir.T, 5000).T
    ir[0] = [1, 1]
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
    y = y / (np.max(np.abs(y)) + 1e-9) * (np.max(np.abs(x)) + 1e-9)
    return (1 - wet) * x + wet * y

def lufs(x):
    # ITU-R BS.1770 yaklaşık (K ağırlığı + kapılama)
    b1, a1 = signal.iirfilter(2, 1500, btype='highpass', ftype='butter', fs=SR)
    sos_hs = signal.butter(2, 1500, 'highpass', fs=SR, output='sos')
    pre = signal.sosfilt(signal.butter(2, 38, 'highpass', fs=SR, output='sos'), x, axis=0)
    shelf = pre + 0.58 * signal.sosfilt(sos_hs, pre, axis=0)
    blk = int(0.4 * SR); hop = int(0.1 * SR)
    ms = []
    for i in range(0, len(shelf) - blk, hop):
        s = shelf[i:i + blk]; ms.append(np.mean(np.sum(s ** 2, axis=1)))
    ms = np.array(ms) + 1e-12
    l = -0.691 + 10 * np.log10(ms)
    g = ms[l > -70]
    if not len(g): return -70
    lg = -0.691 + 10 * np.log10(np.mean(g))
    g2 = ms[(l > -70) & (l > lg - 10)]
    return -0.691 + 10 * np.log10(np.mean(g2))

def limiter(x, ceil=0.93, look=0.004, rel=0.08):
    a = np.abs(x).max(1)
    g = np.minimum(1, ceil / (a + 1e-9))
    w = int(look * SR)
    # ileriye bakan en küçük kazanç
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(g, size=2 * w + 1)
    # bırakma: tek kutuplu yumuşatma (yalnız yükselirken)
    k = np.exp(-1 / (rel * SR))
    out = np.empty_like(g); cur = 1.0
    for i in range(len(g)):
        v = g[i]
        cur = v if v < cur else k * cur + (1 - k) * v
        out[i] = cur
    return x * out[:, None]

def main():
    cues = json.load(open(sys.argv[1]))
    narr, sr = sf.read(sys.argv[2], always_2d=True)
    if sr != SR:
        narr = signal.resample_poly(narr, SR, sr, axis=0)
    total = float(sys.argv[4]) if len(sys.argv) > 4 else len(narr) / SR
    N = int(total * SR) + SR
    voice = np.zeros((N, 2)); voice[:len(narr)] = narr[:N]
    bus = np.zeros((N, 2))
    for c in cues:
        typ = c['type']
        if typ not in FX:
            print('bilinmeyen efekt', typ); continue
        x = FX[typ](c)
        p = c.get('pan', float(rng.uniform(-0.35, 0.35)))
        s = int(c['t'] * SR)
        if s >= N: continue
        st = pan(x, p) * float(c.get('gain', 0.3))
        e = min(N, s + len(st))
        bus[s:e] += st[:e - s]
    bus = reverb(bus, 0.22)
    # konuşma zarfı ile bastırma
    venv = np.abs(voice).max(1)
    venv = signal.sosfilt(signal.butter(1, 6, fs=SR, output='sos'), venv)
    duck = 1 - 0.55 * np.clip(venv / (np.percentile(venv[venv > 1e-4], 80) + 1e-9), 0, 1)
    bus *= duck[:, None]
    # efekt veriyolunu konuşmanın ~16 LU altına oturt
    lv = lufs(voice[:len(narr)])
    lb = lufs(bus) if np.max(np.abs(bus)) > 0 else -70
    target_b = lv - 17.0
    if lb > -69:
        bus *= 10 ** ((target_b - lb) / 20)
    mix = voice + bus
    # toplamı -14 LUFS'a getir, tepe sınırla
    lm = lufs(mix)
    mix *= 10 ** ((-14.0 - lm) / 20)
    mix = limiter(mix, 0.93)
    sf.write(sys.argv[3], mix[:int(total * SR)].astype(np.float32), SR, subtype='PCM_24')
    print(f'konuşma {lv:.1f} LUFS, efekt önce {lb:.1f} → hedef {target_b:.1f}, toplam {lufs(mix):.1f} LUFS, tepe {np.max(np.abs(mix)):.2f}')

if __name__ == '__main__':
    main()
