"""Yordamsal (procedural) ses efektleri + miks.
Müzik YOK. Efektler tonal melodi değildir, çok kısıktır (sese göre −24…−38 dB) ve konuşma sırasında ayrıca 6 dB bastırılır.
Kullanım:  python tools/sfx.py  →  out/ses/sfx.wav, out/ses/miks.wav (ses + efektler, −14 LUFS'a ffmpeg ile normalize edilir)
Kaynak hiçbir dış ses dosyası kullanmaz (lisans temiz): hepsi gürültü/sinüs sentezi.
"""
import json, os, subprocess, sys
import numpy as np
from scipy import signal

SR = 48000
# Genel efekt kazancı: efektlerin en yüksek anlık yüksekliği konuşmanın ~17 LU altında kalacak şekilde ayarlandı
SFX_GAIN_DB = 12.0
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'out', 'ses'); os.makedirs(OUT, exist_ok=True)
DUR = json.loads(open(os.path.join(ROOT, 'engine', 'timing.js')).read().split('=', 1)[1].rstrip().rstrip(';'))['duration']
N = int(DUR * SR) + SR

def rng(seed): return np.random.default_rng(seed)
def db(x): return 10 ** (x / 20)
def t_axis(d): return np.arange(int(d * SR)) / SR

# ---------- yapı taşları ----------
def white(d, seed): return rng(seed).standard_normal(int(d * SR))
def pink(d, seed):
    w = white(d, seed); b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
    p = signal.lfilter(b, a, w); return p / (np.std(p) + 1e-9)
def brown(d, seed):
    b = np.cumsum(white(d, seed)); b = signal.lfilter([1, -1], [1, -0.995], b); return b / (np.std(b) + 1e-9)
def bp(x, lo, hi, order=2): return signal.sosfilt(signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'highpass', fs=SR, output='sos'), x)
def env_ar(n, a, r, shape=2.0):
    """atak a sn, salınım r sn (n örnek)"""
    t = np.arange(n) / SR; e = np.ones(n)
    if a > 0: e *= np.clip(t / a, 0, 1) ** shape
    if r > 0: e *= np.clip((n / SR - t) / r, 0, 1) ** shape
    return e
def expdec(n, tau): return np.exp(-np.arange(n) / SR / tau)
def norm(x, peak=1.0): m = np.max(np.abs(x)) + 1e-12; return x / m * peak
def sweep_filter(x, f0, f1, q=1.2, steps=48):
    """zamanla kayan bant geçiren (bölütlü, çapraz geçişli)"""
    n = len(x); out = np.zeros(n); seg = max(1, n // steps); win = np.hanning(seg * 2)
    for i in range(0, n, seg):
        k = i / max(1, n - 1); fc = f0 * (f1 / f0) ** k; bw = fc / q
        lo, hi = max(30, fc - bw / 2), min(SR / 2 - 100, fc + bw / 2)
        s, e = max(0, i - seg // 2), min(n, i + seg + seg // 2)
        y = bp(x[s:e], lo, hi); w = np.hanning(len(y)); out[s:e] += y * w
    return out
def stereo(x, pan=0.0, width=0.0, seed=0):
    """pan −1..1 (sabit ya da dizi). Kanal gecikmesi YOK (mono uyumu: tarak filtresi oluşmaz).
    width yok sayılır; geniş ortam sesleri iki ayrı gürültüyle stereo2() kullanır."""
    pan = np.broadcast_to(np.asarray(pan, dtype=float), x.shape)
    return np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], 1)
def stereo2(xl, xr):
    """iki bağımsız gerçekleşme → doğal genişlik, mono toplamda faz iptali yok"""
    n = min(len(xl), len(xr)); m = max(np.max(np.abs(xl[:n])), np.max(np.abs(xr[:n]))) + 1e-12
    return np.stack([xl[:n] / m, xr[:n] / m], 1) * 0.7071

# ---------- ses tipleri (hepsi tepe ~1.0'a göre normalize; seviye cue'dan gelir) ----------
def s_whoosh(d=0.8, f0=300, f1=2500, seed=1, pan0=-0.4, pan1=0.4, a=0.45):
    x = sweep_filter(pink(d, seed), f0, f1, q=1.4) * env_ar(int(d * SR), d * a, d * (1 - a), 1.6)
    return stereo(norm(x), np.linspace(pan0, pan1, len(x)), 0.5)
def s_swell(d=1.2, f0=200, f1=1800, seed=2, sub=0.3):
    n = int(d * SR); x = sweep_filter(pink(d, seed), f0, f1, q=0.9) * (np.linspace(0, 1, n) ** 2.2) * env_ar(n, 0, 0.12, 1)
    tt = t_axis(d); x = norm(x) + sub * np.sin(2 * np.pi * 55 * tt) * (np.linspace(0, 1, n) ** 3) * env_ar(n, 0, 0.15, 1)
    return stereo(norm(x), 0, 1.0)
def s_revswell(d=0.8, seed=3): return np.flipud(s_swell(d, 300, 1600, seed, 0.1))
def s_sparkle(d=0.6, n=14, seed=4, lo=3500, hi=9000):
    out = np.zeros((int(d * SR) + SR // 4, 2)); r = rng(seed)
    for i in range(n):
        st = int(r.uniform(0, d) * SR); L = int(r.uniform(0.008, 0.03) * SR)
        g = bp(r.standard_normal(L), r.uniform(lo, hi * 0.8), hi) * expdec(L, r.uniform(0.004, 0.012))
        out[st:st + L] += stereo(norm(g) * r.uniform(0.4, 1), r.uniform(-0.8, 0.8))
    return norm(out)
def s_pop(f0=700, f1=260, d=0.09, seed=5):
    tt = t_axis(d); f = f1 + (f0 - f1) * np.exp(-tt / 0.012); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * expdec(len(tt), 0.025) + 0.15 * hp(white(d, seed), 3000) * expdec(len(tt), 0.003)
    return stereo(norm(lp(x, 4000)), rng(seed).uniform(-0.5, 0.5))
def s_pops(d=0.7, n=12, seed=6):
    out = np.zeros((int(d * SR) + SR // 5, 2)); r = rng(seed)
    for i in range(n):
        st = int(r.uniform(0, d) * SR); p = s_pop(r.uniform(500, 1100), r.uniform(180, 320), 0.09, seed + i) * r.uniform(0.35, 1)
        out[st:st + len(p)] += p
    return norm(out)
def s_glass(d=0.35, seed=7, base=2100):
    tt = t_axis(d); r = rng(seed); x = np.zeros(len(tt))
    for k, ratio in enumerate([1.0, 1.59, 2.47, 3.31]):
        x += np.sin(2 * np.pi * base * ratio * r.uniform(0.98, 1.02) * tt + r.uniform(0, 6)) * expdec(len(tt), 0.09 / (1 + k * 0.8)) * (0.9 ** k)
    x += 0.3 * hp(white(d, seed), 4000) * expdec(len(tt), 0.004)
    return stereo(norm(x), r.uniform(-0.4, 0.4))
def s_ticks(d=0.5, n=8, seed=8, base=2300):
    out = np.zeros((int(d * SR) + SR // 2, 2)); r = rng(seed)
    for i in range(n):
        st = int(i / max(1, n - 1) * d * SR * r.uniform(0.9, 1.0)); g = s_glass(0.3, seed + i, base * r.uniform(0.85, 1.25)) * r.uniform(0.5, 1)
        out[st:st + len(g)] += g
    return norm(out)
def s_snaps(d=0.5, n=6, seed=9):
    out = np.zeros((int(d * SR) + SR // 4, 2)); r = rng(seed)
    for i in range(n):
        st = int(i / max(1, n - 1) * d * SR); L = int(0.04 * SR)
        g = bp(r.standard_normal(L), 1500, 6000) * expdec(L, 0.006) + 0.5 * bp(r.standard_normal(L), 300, 900) * expdec(L, 0.01)
        out[st:st + L] += stereo(norm(g) * r.uniform(0.6, 1), r.uniform(-0.6, 0.6))
    return norm(out)
def _wind1(d, seed, f, mod):
    n = int(d * SR); tt = t_axis(d); x = lp(pink(d, seed), f)
    am = 0.6 + 0.4 * np.sin(2 * np.pi * mod * tt + rng(seed).uniform(0, 6)) * np.sin(2 * np.pi * mod * 0.37 * tt + 1)
    return x * am * env_ar(n, d * 0.35, d * 0.45, 1.5)
def s_wind(d=2.0, seed=10, f=900, mod=0.35):
    return stereo2(_wind1(d, seed, f, mod), _wind1(d, seed + 777, f, mod * 1.13))
def s_drop(f0=1100, f1=2600, d=0.16, seed=11):
    tt = t_axis(d); f = f0 + (f1 - f0) * (1 - np.exp(-tt / 0.02)); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * expdec(len(tt), 0.035)
    return stereo(norm(x), 0.1)
def s_bubble(d=0.25, seed=12):
    tt = t_axis(d); f = 160 + 380 * (1 - np.exp(-tt / 0.05)); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ar(len(tt), 0.01, 0.0, 1) * expdec(len(tt), 0.07)
    return stereo(norm(lp(x, 2000)), 0)
def s_paper(d=0.45, seed=13):
    n = int(d * SR); r = rng(seed); x = bp(white(d, seed), 900, 6500)
    am = np.clip(signal.lfilter([1], [1, -0.985], r.standard_normal(n) * 0.2), 0, None) + 0.2
    return stereo(norm(x * am * env_ar(n, 0.05, 0.25, 1.4)), np.linspace(-0.3, 0.3, n), 0.6)
def s_cloth(d=0.3, seed=14):
    n = int(d * SR); x = sweep_filter(white(d, seed), 700, 2600, q=1.5) * env_ar(n, 0.06, 0.2, 1.5)
    return stereo(norm(x), rng(seed).uniform(-0.5, 0.5), 0.5)
def s_click(d=0.12, seed=15, f=850):
    n = int(d * SR); x = bp(white(d, seed), f * 0.8, f * 1.3) * expdec(n, 0.012) + 0.6 * bp(white(d, seed + 1), f * 1.8, f * 2.4) * expdec(n, 0.008)
    return stereo(norm(x), 0)
def s_thud(d=0.6, seed=16):
    tt = t_axis(d); n = len(tt); x = np.sin(2 * np.pi * (70 + 30 * np.exp(-tt / 0.03)) * tt) * expdec(n, 0.12)
    x = x + 0.5 * lp(white(d, seed), 400) * expdec(n, 0.05) + 0.35 * bp(white(d, seed + 1), 500, 1800) * expdec(n, 0.02)
    return stereo(norm(x), 0, 0.3)
def s_fwoomp(d=0.7, seed=17):
    n = int(d * SR); x = sweep_filter(pink(d, seed), 200, 900, q=0.8) * env_ar(n, 0.09, 0.5, 1.3) + 0.4 * lp(brown(d, seed), 150) * env_ar(n, 0.05, 0.4, 1.2)
    return stereo(norm(x), 0.2, 0.6)
def s_crackle(d=1.0, rate=14, seed=18):
    n = int(d * SR); r = rng(seed); x = np.zeros(n)
    for _ in range(int(rate * d)):
        st = r.integers(0, n - 400); L = r.integers(60, 300); x[st:st + L] += r.standard_normal(L) * expdec(L, 0.0015) * r.uniform(0.3, 1)
    x = bp(x, 1200, 7000) * env_ar(n, 0.1, 0.3, 1)
    return stereo(norm(x), 0.1, 0.5)
def s_sand(d=3.0, seed=19, dens=0.6):
    n = int(d * SR); r = rng(seed); g = (r.random(n) < 0.02 * dens) * r.standard_normal(n)
    x = hp(signal.lfilter([1], [1, -0.6], g), 2500) + 0.15 * hp(white(d, seed), 5000)
    return stereo(norm(x * env_ar(n, 0.3, 0.4, 1)), 0, 0.8)
def s_fizz(d=0.5, seed=20):
    n = int(d * SR); tt = t_axis(d); x = hp(white(d, seed), 3000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 37 * tt))) * env_ar(n, 0.03, 0.25, 1)
    return stereo(norm(x), 0.2)
def s_buzz(d=0.8, seed=21, f=215):
    tt = t_axis(d); fm = f * (1 + 0.03 * np.sin(2 * np.pi * 7 * tt)); ph = 2 * np.pi * np.cumsum(fm) / SR
    x = signal.sawtooth(ph) * (0.7 + 0.3 * np.sin(2 * np.pi * 23 * tt)); x = bp(x, 180, 1600) * env_ar(len(tt), 0.15, 0.3, 1.2)
    return stereo(norm(x), np.linspace(0.6, -0.2, len(tt)))
def s_hoop(d=0.5, seed=22):
    out = np.zeros(int(d * SR))
    for st in (0.0, 0.2):
        tt = t_axis(0.13); f = 420 - 60 * tt / 0.13; x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.13) ** 1.5
        i = int(st * SR); out[i:i + len(x)] += x
    return stereo(norm(lp(out, 1500)), -0.5)
def s_lark(d=0.6, seed=23):
    out = np.zeros(int(d * SR)); r = rng(seed)
    for k in range(7):
        st = int((0.02 + k * 0.07) * SR); L = int(0.045 * SR); tt = np.arange(L) / SR
        f = r.uniform(3000, 4200) + 900 * np.sin(2 * np.pi * r.uniform(30, 60) * tt); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1])
        out[st:st + L] += x * r.uniform(0.5, 1)
    return stereo(norm(out), 0.6)
def _water1(d, seed):
    n = int(d * SR); r = rng(seed); x = bp(white(d, seed), 400, 3500)
    am = np.abs(signal.lfilter([1], [1, -0.995], r.standard_normal(n))) ; am = am / (am.max() + 1e-9)
    return (x * (0.3 + am) + 0.3 * lp(brown(d, seed), 300)) * env_ar(n, 1.0, 1.5, 1)
def s_water(d=10.0, seed=24): return stereo2(_water1(d, seed), _water1(d, seed + 777))
def _rain1(d, seed):
    """seyrek, yumuşak damlacıklar + orta bantta hafif yağmur dokusu (tıslama değil)"""
    n = int(d * SR); r = rng(seed); x = 0.35 * bp(pink(d, seed), 700, 4500)
    for _ in range(int(d * 70)):
        st = r.integers(0, n - 2000); L = r.integers(300, 1400)
        x[st:st + L] += bp(r.standard_normal(L), r.uniform(1500, 2800), r.uniform(3200, 5200)) * expdec(L, r.uniform(0.002, 0.006)) * r.uniform(0.3, 1.0)
    return x * env_ar(n, 0.5, 0.8, 1)
def s_rain(d=2.5, seed=25): return stereo2(_rain1(d, seed), _rain1(d, seed + 777))
def _room1(d, seed):
    n = int(d * SR); return (lp(brown(d, seed), 250) + 0.1 * bp(pink(d, seed), 400, 1200)) * env_ar(n, 0.8, 1.2, 1)
def s_room(d=4.0, seed=26): return stereo2(_room1(d, seed), _room1(d, seed + 777))
def s_creak(d=0.5, seed=27):
    tt = t_axis(d); n = len(tt); r = rng(seed); pulses = np.zeros(n)
    rate = 60 + 40 * np.sin(np.pi * tt / d); ph = np.cumsum(rate) / SR; idx = np.where(np.diff(np.floor(ph)) > 0)[0]
    pulses[idx] = r.uniform(0.5, 1, len(idx)); x = bp(signal.lfilter([1], [1, -0.97], pulses), 300, 2200) * env_ar(n, 0.08, 0.2, 1)
    return stereo(norm(x), -0.3)
def s_flutter(d=0.6, seed=28):
    n = int(d * SR); tt = t_axis(d); x = bp(white(d, seed), 800, 5000) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 18 * tt * (1 - 0.5 * tt / d))))
    return stereo(norm(x * env_ar(n, 0.04, 0.35, 1.3)), 0, 0.6)

def s_tiks(d=0.5, n=8, seed=80, lo=2000, hi=6000):
    """tonsuz, çok kısa gürültü tıkırtıları (çan/melodi değil)"""
    out = np.zeros((int(d * SR) + SR // 10, 2)); r = rng(seed)
    for i in range(n):
        st = int((i / max(1, n - 1)) * d * SR * r.uniform(0.85, 1.0)); L = int(r.uniform(0.005, 0.01) * SR)
        g = bp(r.standard_normal(L), lo * r.uniform(0.9, 1.2), hi) * expdec(L, r.uniform(0.0015, 0.003))
        out[st:st + L] += stereo(norm(g) * r.uniform(0.45, 1.0), r.uniform(-0.5, 0.5))
    return norm(out)
def s_plop(d=0.22, seed=81):
    """yoğun bal damlası: alçak geçirilmiş gürültü 'plop' (perde kayması yok)"""
    n = int(d * SR); x = lp(white(d, seed), 700, 4) * env_ar(n, 0.004, 0.0, 1) * expdec(n, 0.045)
    x += 0.4 * bp(white(d, seed + 1), 900, 2200) * expdec(n, 0.012)
    return stereo(norm(x), 0)
def s_drip(d=0.12, seed=82):
    n = int(d * SR); x = bp(white(d, seed), 1200, 3000) * env_ar(n, 0.002, 0.0, 1) * expdec(n, 0.018)
    return stereo(norm(x), 0.1)

TYPES = {k[2:]: v for k, v in globals().items() if k.startswith('s_')}

# ---------- cue listesi: (zaman sn, tip, dB (sese göre), {param}) ----------
CUES = json.load(open(os.path.join(ROOT, 'tools', 'sfx_cues.json')))['cues']

def main():
    import soundfile as sf
    sfx = np.zeros((N, 2))
    for c in CUES:
        t0, typ, gdb = c['t'], c['type'], c['db']; prm = c.get('p', {})
        y = TYPES[typ](**prm).copy()
        fi, fo = min(len(y), int(0.002 * SR)), min(len(y), int(0.012 * SR))
        y[:fi] *= np.linspace(0, 1, fi)[:, None]; y[len(y) - fo:] *= np.linspace(1, 0, fo)[:, None]   # tık/kesik olmasın
        i = int(t0 * SR); j = min(N, i + len(y)); sfx[i:j] += y[: j - i] * db(gdb)
    # konuşma: ham ses
    v, sr = sf.read(os.path.join(OUT, 'ses_48k.wav'))
    if v.ndim == 1: v = np.stack([v, v], 1)
    voice = np.zeros((N, 2)); voice[: len(v)] = v[:N]
    # sese göre seviye: efekt dB'leri konuşmanın tepe değerine göre
    vpk = np.max(np.abs(voice)) + 1e-9
    sfx *= vpk * db(SFX_GAIN_DB)
    # konuşma zarfı (50 ms RMS) → 6 dB bastırma (yumuşak)
    mono = np.mean(voice, 1) ** 2; w = int(0.05 * SR); rms = np.sqrt(np.convolve(mono, np.ones(w) / w, 'same'))
    act = np.clip((20 * np.log10(rms / vpk + 1e-9) + 42) / 12, 0, 1)
    act = signal.lfilter([0.002], [1, -0.998], act) / 1.0; act = np.clip(act * 1.2, 0, 1)
    duck = db(-6 * act)[:, None]
    sfx = hp(sfx.T, 110).T * duck
    sfx = lp(lp(sfx.T, 8500), 8500).T   # yumuşaklık: 8,5 kHz üstü yok (tıslama olmasın)
    # sürekli, duyulmayacak kadar kısık oda tonu (dijital sıfır sessizlikler olmasın) ≈ −62 dBFS
    bed = stereo2(_room1(DUR + 1, 99), _room1(DUR + 1, 199)); bed = bed / (np.sqrt(np.mean(bed ** 2)) + 1e-12) * db(-62)
    sfx[: len(bed)] += bed[: N]
    sf.write(os.path.join(OUT, 'sfx.wav'), sfx.astype(np.float32), SR, subtype='FLOAT')
    mix = voice + sfx
    sf.write(os.path.join(OUT, 'miks_ham.wav'), mix.astype(np.float32), SR, subtype='FLOAT')
    print('sfx peak dBFS(rel voice peak):', 20 * np.log10(np.max(np.abs(sfx)) / vpk + 1e-12))

if __name__ == '__main__':
    main()
