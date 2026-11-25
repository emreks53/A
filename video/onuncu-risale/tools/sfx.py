"""Ses efektlerini sentezler, konuşmayla karıştırır ve YouTube Shorts ölçüsüne getirir.

    python tools/sfx.py data/sfx.json <ses.mp3|wav> <çıktı.wav> [toplam_sure] [--fx fx.wav] [--report rapor.json]

Kurallar (bağlayıcı): müzik yok; ezgi, akortlu zil/çan, basamaklı yükselen perde dizisi, tonlu "pad" yok.
Bütün efektler süzgeçten geçirilmiş gürültüden üretilir (fırça, kâğıt/ahşap dokunuşu, hava, su, yaprak).
Tek istisna kalp atışının alt gövdesindeki çok kısa sönümlü vuruştur (tını değil, "küt" sesi).
Konuşma her zaman baskındır: efektler konuşma varken yan zincirle kısılır.

Kazanç kuralı (scenes/ses.js'teki gainDb):
  * dokunuş/geçiş türleri (tek kanallı): sinyal tepe = 0 dBFS'e normalize edilir → gainDb ≈ tepe dBFS (kısmadan önce)
  * zemin türleri (air, air-dusk, room-warm, air-soft, paradise, room-window, water): kararlı bölümün kanal başı
    RMS'i -20 dBFS'e normalize edilir → gainDb, bu -20 dBFS'e eklenir (ör. -24 → yaklaşık -44 dBFS RMS)
Ek alanlar: dur (sn), a / r (zeminlerde giriş/çıkış sn), peak (geçişlerde zarf tepesi 0..1), pan (-1..1),
v ('lub'|'dub'), close (su: 1 yakın), fc (dab bant merkezi Hz),
seed (aynı t/tür için başka gürültü), duck (dB, türün varsayılan kısma derinliğini ezer).

Rastgelelik belirlenimcidir: her işaretin tohumu (tür, zaman, seed) üçlüsünden türetilir; bir işareti değiştirmek
diğerlerinin sesini değiştirmez.

Son aşama: BS.1770-4 bütünleşik ölçüm → -14.0 LUFS'e kazanç → 4x örneklemeli gerçek tepe sınırlayıcı (-1.5 dBTP; AAC 256k→128k zincirinde ≤ -1.2 dBTP kalır)
→ TPDF titreşimli 16 bit WAV. Doğrulama: ffmpeg -i <çıktı.wav> -af ebur128=peak=true -f null -
"""
import json, sys, math, zlib, subprocess, wave
import numpy as np
import scipy.signal as ss
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 44100
TARGET_LUFS = -14.0
CEIL_DBTP = -1.5


# ---------------------------------------------------------------- yardımcılar
def ev_rng(ev):
    key = f"{ev['kind']}|{ev['t']:.3f}|{ev.get('seed', 0)}".encode()
    return np.random.default_rng(zlib.crc32(key))


def _sos(kind, f, order=2):
    f = np.atleast_1d(f).astype(float)
    return ss.butter(order, f / (SR / 2) if len(f) > 1 else f[0] / (SR / 2), kind, output='sos')


def lowpass(x, fc, order=2): return ss.sosfilt(_sos('low', fc, order), x, axis=0)
def highpass(x, fc, order=2): return ss.sosfilt(_sos('high', fc, order), x, axis=0)
def bandpass(x, f1, f2, order=2): return ss.sosfilt(_sos('band', [f1, f2], order), x, axis=0)


def rbj_bp(x, f0, q):
    """Geniş (q≈1) bant geçiren; dar q kullanılmaz (tını oluşmasın)."""
    w0 = 2 * np.pi * f0 / SR; al = np.sin(w0) / (2 * q)
    b = np.array([al, 0, -al]); a = np.array([1 + al, -2 * np.cos(w0), 1 - al])
    return ss.lfilter(b / a[0], a / a[0], x)


def rbj_lp(x, f0, q):
    w0 = 2 * np.pi * f0 / SR; al = np.sin(w0) / (2 * q); c = np.cos(w0)
    b = np.array([(1 - c) / 2, 1 - c, (1 - c) / 2]); a = np.array([1 + al, -2 * c, 1 - al])
    return ss.lfilter(b / a[0], a / a[0], x)


def sweep_bp(x, f_path, q=1.0, block=256):
    """Merkez frekansı f_path(0..1) boyunca kayan geniş bant geçiren (blok blok, durum korunur)."""
    n = len(x); out = np.zeros(n); zi = np.zeros(2)
    for s in range(0, n, block):
        e = min(n, s + block); f0 = f_path(s / max(1, n - 1))
        w0 = 2 * np.pi * f0 / SR; al = np.sin(w0) / (2 * q)
        b = np.array([al, 0, -al]) / (1 + al); a = np.array([1, -2 * np.cos(w0) / (1 + al), (1 - al) / (1 + al)])
        out[s:e], zi = ss.lfilter(b, a, x[s:e], zi=zi)
    return out


def white(rng, n): return rng.standard_normal(n)


def pink(rng, n):
    X = np.fft.rfft(rng.standard_normal(n)); f = np.arange(len(X), dtype=float); f[0] = 1
    y = np.fft.irfft(X / np.sqrt(f), n); return y / (np.std(y) + 1e-12)


def smooth(rng, n, rate):
    """Yavaşça değişen rastgele eğri (ortalama 0, std 1); rate ≈ değişim hızı (Hz)."""
    cr = 200.0; m = int(n / SR * cr) + 8
    v = rng.standard_normal(m)
    v = ss.sosfiltfilt(ss.butter(2, min(0.45, rate / (cr / 2)), 'low', output='sos'), v) if m > 15 else v
    v = (v - v.mean()) / (v.std() + 1e-12)
    return np.interp(np.arange(n) / SR, np.arange(m) / cr, v)


def rms(x): return float(np.sqrt(np.mean(np.square(x))) + 1e-12)
def peak_norm(x): return x / (np.max(np.abs(x)) + 1e-12)


def rcos(n):  # 0→1 yükselen yarım kosinüs
    return 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, max(1, n)))


def asr(n, a, r):
    """Giriş a sn (yarım kosinüs), sabit, çıkış r sn."""
    e = np.ones(n); na = min(n, int(a * SR)); nr = min(n - na, int(r * SR))
    if na: e[:na] = rcos(na)
    if nr: e[n - nr:] = rcos(nr)[::-1]
    return e


def stroke_env(n, a, hold_drop=0.35, rel_frac=0.45):
    """Fırça baskısı: hızlı giriş, hafif düşen gövde, yumuşak bırakış."""
    e = np.ones(n); na = max(1, int(a * SR)); nr = max(1, int(n * rel_frac))
    e[:na] = rcos(na)
    body = n - na - nr
    if body > 0: e[na:na + body] = np.linspace(1, 1 - hold_drop, body)
    e[n - nr:] = (1 - hold_drop) * rcos(nr)[::-1] ** 1.3
    return e


def decay(n, tau, att=0.0015):
    t = np.arange(n) / SR
    return np.exp(-t / tau) * np.minimum(1, t / max(att, 1e-4))


def pan(x, p):
    p = float(np.clip(p, -1, 1)); l = np.cos((p + 1) * np.pi / 4); r = np.sin((p + 1) * np.pi / 4)
    return np.stack([x * l, x * r], 1)


def stereo(gen, corr):
    """gen() → mono gürültü; kısmen ilintili iki kanal (doğal genişlik)."""
    c, l, r = gen(), gen(), gen()
    return np.stack([np.sqrt(corr) * c + np.sqrt(1 - corr) * l, np.sqrt(corr) * c + np.sqrt(1 - corr) * r], 1)


def bed_norm(x, a, r):
    """Zemin: kararlı bölümün kanal başı RMS'i -20 dBFS, sonra giriş/çıkış zarfı."""
    n = len(x); s0, s1 = int(a * SR), max(int(a * SR) + 1, n - int(r * SR))
    ref = np.sqrt(np.mean(np.square(x[s0:s1]))) + 1e-12
    return x * (0.1 / ref) * asr(n, a, r)[:, None]


# ---------------------------------------------------------------- dokunuşlar (mono, tepe 1)
def fx_brush(ev, rng):
    """Akrilik fırça darbesi: kıl hışırtısı (geniş bant gürültü + kayan vurgu + tanecik), büyükte tuval gövdesi."""
    big = ev['kind'] == 'brush-big'
    d = ev.get('dur', 0.24 if big else 0.18); n = int(d * SR)
    lo = 650 if big else 1000
    x = bandpass(white(rng, n), lo, 7200)
    f0 = rng.uniform(1500, 2300); f1 = f0 * rng.choice([rng.uniform(0.65, 0.8), rng.uniform(1.25, 1.5)])
    x = 0.7 * x / rms(x) + 0.6 * (lambda y: y / rms(y))(sweep_bp(white(rng, n), lambda p: f0 * (f1 / f0) ** p, 0.9))
    grain = lowpass(np.abs(white(rng, n)), 260); grain = 0.55 + 0.45 * grain / (grain.max() + 1e-9)
    x *= grain
    if big: x += 0.45 * (lambda y: y / rms(y))(lowpass(pink(rng, n), 450))
    return peak_norm(x * stroke_env(n, 0.016 if big else 0.012))


def fx_brush_ring(ev, rng):
    """Madalyon çevresine fırçayla çizilen halka: dairesel gezinen geniş vurgulu kıl sesi (tınısız)."""
    d = ev.get('dur', 0.5); n = int(d * SR)
    base = bandpass(white(rng, n), 1100, 7000)
    f0 = rng.uniform(1700, 2000)
    mv = sweep_bp(white(rng, n), lambda p: f0 * (1 + 0.38 * np.sin(2 * np.pi * p * 0.9 + 0.4)), 1.0)
    x = 0.6 * base / rms(base) + 0.7 * mv / rms(mv)
    grain = lowpass(np.abs(white(rng, n)), 240); x *= 0.6 + 0.4 * grain / (grain.max() + 1e-9)
    return peak_norm(x * stroke_env(n, 0.06, hold_drop=0.25, rel_frac=0.4))


def fx_dab(ev, rng):
    """Kâğıt/ahşap üstüne yumuşak boya dokunuşu: geniş bantlı kısa gürültü + alçak gövde. Perdesiz."""
    n = int(0.11 * SR)
    fc = ev.get('fc', rng.uniform(700, 1500)); tau = rng.uniform(0.009, 0.016)
    x = rbj_bp(white(rng, n), fc, rng.uniform(0.8, 1.1)); x = x / rms(x[:int(0.02 * SR)]) * decay(n, tau)
    body = lowpass(white(rng, n), 340, 2); body = body / rms(body[:int(0.02 * SR)]) * decay(n, 0.022, 0.003) * 0.55
    tick = highpass(white(rng, n), 3500); tick = tick / rms(tick[:200]) * decay(n, 0.0025, 0.0005) * 0.12
    return peak_norm(highpass(x + body + tick, 90))


def fx_tap(ev, rng):
    """Keçe üstüne yumuşak parmak dokunuşu."""
    n = int(0.09 * SR)
    x = bandpass(white(rng, n), rng.uniform(220, 320), rng.uniform(1800, 2600)); x = x / rms(x[:400]) * decay(n, rng.uniform(0.006, 0.010))
    body = lowpass(white(rng, n), 300); body = body / rms(body[:600]) * decay(n, 0.018, 0.003) * 0.6
    return peak_norm(highpass(x + body, 80))


def fx_flick(ev, rng):
    e = dict(ev); e['kind'] = 'brush'; e.setdefault('dur', rng.uniform(0.12, 0.16))
    return fx_brush(e, rng)


def fx_heart(ev, rng):
    """Kalp atışı (lub/dub): 80-250 Hz boğuk gövde + 220-800 Hz vuruş (telefonda duyulan kısım) + çok hafif deri tıkı."""
    lub = ev.get('v', 'lub') == 'lub'
    n = int(0.4 * SR); t = np.arange(n) / SR
    fb = 105 if lub else 135; tau = 0.055 if lub else 0.038
    body = rbj_lp(white(rng, n), fb * 1.6, 1.3); body = body / rms(body[:int(0.03 * SR)]) * decay(n, tau, 0.006)
    f = fb * 1.35 * np.exp(-t / 0.05) + fb * 0.8  # aşağı kayan çok kısa vuruş (küt)
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(n, tau * 0.75, 0.004)
    knock = bandpass(white(rng, n), 220, 800); knock = knock / rms(knock[:400]) * decay(n, 0.009, 0.002)
    skin = bandpass(white(rng, n), 1200, 3500); skin = skin / rms(skin[:200]) * decay(n, 0.003, 0.0008)
    x = 0.55 * peak_norm(body) + 0.5 * thump + 0.5 * peak_norm(knock) + 0.06 * peak_norm(skin)
    return peak_norm(highpass(x, 45))


def fx_whoosh(ev, rng, f0, f1, q=1.2):
    """Hava geçişi: pembe gürültü, kayan geniş bant (tınısız). peak: zarfın tepe noktası (0..1, varsayılan 0.55)."""
    d = ev.get('dur', 1.0); n = int(d * SR)
    x = sweep_bp(pink(rng, n), lambda p: f0 * (f1 / f0) ** p, q)
    e = np.ones(n); na = int(n * ev.get('peak', 0.55)); e[:na] = rcos(na) ** 1.4; e[na:] = rcos(n - na)[::-1]
    return peak_norm(x * e)


def fx_breath(ev, rng):
    """Yumuşak hava kabarması (ışık/feyiz anları için): 1.8-6.5 kHz pembe gürültü, tınısız, kıvılcımsız."""
    d = ev.get('dur', 0.7); n = int(d * SR)
    x = bandpass(pink(rng, n), 1800, 6500)
    e = np.ones(n); na = int(n * 0.4); e[:na] = rcos(na); e[na:] = rcos(n - na)[::-1] ** 1.3
    return peak_norm(x * e)


def fx_leaves(ev, rng):
    """Düşen kuru yapraklar / akşam ağacı: yumuşak kabaran hışırtı + seyrek, çok hafif kuru çıtırtı."""
    d = ev.get('dur', 2.5); n = int(d * SR)
    base = bandpass(white(rng, n), 1400, 7000)
    env = np.full(n, 0.12)
    for _ in range(int(d * 3.2)):
        s = rng.uniform(-0.1, d); L = rng.uniform(0.15, 0.5); i0 = int(s * SR); m = int(L * SR)
        bump = np.sin(np.linspace(0, np.pi, m)) ** 2 * rng.lognormal(0, 0.5)
        a, b = max(0, i0), min(n, i0 + m)
        if b > a: env[a:b] += bump[a - i0:b - i0]
    x = base / rms(base) * env
    tick = np.zeros(n)
    for _ in range(int(d * 7)):
        i0 = int(rng.uniform(0, d - 0.01) * SR); m = int(rng.uniform(0.002, 0.005) * SR)
        tick[i0:i0 + m] += white(rng, m) * np.hanning(m) * rng.uniform(0.3, 1.0)
    x += 0.5 * highpass(tick, 2200) * env.mean()
    return peak_norm(x * asr(n, 0.35, 0.5))


def fx_foliage(ev, rng):
    """Cennet dalı: pürüzsüz, yumuşak yaprak salınımı (çıtırtısız)."""
    d = ev.get('dur', 1.6); n = int(d * SR)
    base = bandpass(white(rng, n), 600, 4200)
    env = np.exp(0.55 * smooth(rng, n, 2.2))
    return peak_norm(base * env * asr(n, 0.45, 0.6))


def fx_paper(ev, rng):
    """Kâğıda çok hafif dokunuş/kayma (son sahne)."""
    d = ev.get('dur', 0.45); n = int(d * SR)
    x = sweep_bp(white(rng, n), lambda p: 2600 * (0.75 ** p), 0.8) + 0.5 * bandpass(white(rng, n), 900, 7000)
    cr = np.zeros(n)
    for _ in range(int(d * 18)):
        i0 = int(rng.uniform(0.05, d - 0.01) * SR); m = int(rng.uniform(0.001, 0.003) * SR)
        cr[i0:i0 + m] += white(rng, m) * np.hanning(m) * rng.uniform(0.2, 0.7)
    x = x / rms(x) + 0.6 * highpass(cr, 2000) / (rms(cr) + 1e-9) * 0.25
    e = np.ones(n); na = int(n * 0.3); e[:na] = rcos(na); e[na:] = rcos(n - na)[::-1] ** 1.5
    return peak_norm(x * e)


# ---------------------------------------------------------------- zeminler (stereo, kararlı RMS -20 dBFS)
def water_layer(rng, n, close):
    """Akarsu: pembe gürültü akışı + bağımsız, yavaş-orta hızda kabaran geniş gürültü bantları (çağıltı)
    + hafif köpük hışırtısı. Sinüs/kabarcık tonu yok."""
    flow = bandpass(pink(rng, n), 180, 3200)
    bab = np.zeros(n)
    for fc, rate in [(380, 2.6), (600, 3.4), (900, 4.4), (1350, 5.3), (2000, 6.4), (3000, 7.6)]:
        b = rbj_bp(white(rng, n), fc * rng.uniform(0.9, 1.1), 1.2)
        m = np.exp((0.55 + 0.2 * close) * smooth(rng, n, rate * rng.uniform(0.8, 1.25)))
        bab += b / rms(b) * m / rms(m)
    hiss = lowpass(highpass(white(rng, n), 3800), 9000); hiss *= np.exp(0.5 * smooth(rng, n, 9.0))
    x = 0.65 * flow / rms(flow) + 0.75 * bab / rms(bab) + (0.15 + 0.1 * close) * hiss / rms(hiss)
    if not close: x = lowpass(x, 5200)  # uzak ırmak: yumuşak üst uç
    return x


def bed_water(ev, rng, n):
    close = int(ev.get('close', 0))
    x = np.stack([water_layer(rng, n, close), water_layer(rng, n, close)], 1)
    if not close:  # uzak: daha dar
        m = x.mean(1, keepdims=True); x = 0.55 * m + 0.45 * x
    x *= np.exp(0.12 * smooth(rng, n, 0.15))[:, None]
    return x


def bed_air(ev, rng, n):
    """Sabah çayırı havası: yumuşak geniş hava + uzak ağaç hışırtısı, çok yavaş esinti."""
    base = stereo(lambda: lowpass(bandpass(pink(rng, n), 120, 7000), 1700, 1), 0.35)  # doğal eğim (tıslama olmasın)
    leafy = stereo(lambda: bandpass(pink(rng, n), 2500, 7000), 0.2)
    leafy *= np.exp(0.6 * smooth(rng, n, 0.4))[:, None]
    x = base / rms(base) + 0.16 * leafy / rms(leafy)
    return x * np.exp(0.22 * smooth(rng, n, 0.12))[:, None]


def bed_air_dusk(ev, rng, n):
    """Akşam esintisi: daha alçak ve biraz daha hareketli hava."""
    base = stereo(lambda: bandpass(pink(rng, n), 100, 2600), 0.4)
    hi = stereo(lambda: bandpass(pink(rng, n), 2000, 6500), 0.2)
    x = base / rms(base) + 0.18 * hi / rms(hi)
    return x * np.exp(0.35 * smooth(rng, n, 0.25))[:, None]


def bed_room_warm(ev, rng, n):
    """Sıcak iç mekân: alçak, kararlı oda sesi + çok hafif hava."""
    base = stereo(lambda: lowpass(highpass(pink(rng, n), 60), 900, 4), 0.5)
    air = stereo(lambda: bandpass(pink(rng, n), 900, 4500), 0.3)
    x = base / rms(base) + 0.16 * air / rms(air)
    return x * np.exp(0.06 * smooth(rng, n, 0.1))[:, None]


def bed_air_soft(ev, rng, n):
    """Perde 4 (soyut zemin): pürüzsüz, hafif aydınlık hava."""
    base = stereo(lambda: lowpass(bandpass(pink(rng, n), 200, 7000), 2000, 1), 0.4)
    return base / rms(base) * np.exp(0.1 * smooth(rng, n, 0.08))[:, None]


def bed_paradise(ev, rng, n):
    """Cennet havası: geniş, yumuşak esinti + pürüzsüz uzak yaprak salınımı."""
    base = stereo(lambda: lowpass(bandpass(pink(rng, n), 180, 8000), 2000, 1), 0.3)
    fol = stereo(lambda: lowpass(bandpass(white(rng, n), 1500, 5000), 2500, 1), 0.15)
    fol *= np.exp(0.5 * smooth(rng, n, 1.2))[:, None]
    x = base / rms(base) + 0.2 * fol / rms(fol)
    return x * np.exp(0.18 * smooth(rng, n, 0.1))[:, None]


def bed_room_window(ev, rng, n):
    """Son sahne: kitapların olduğu oda + açık pencereden gelen yumuşak hava ve uzak ırmak (kuş/ton yok)."""
    room = stereo(lambda: lowpass(highpass(pink(rng, n), 70), 1000, 4), 0.5)
    air = stereo(lambda: lowpass(bandpass(pink(rng, n), 200, 7000), 1800, 1), 0.3)
    air *= np.exp(0.25 * smooth(rng, n, 0.12))[:, None]
    river = np.stack([lowpass(water_layer(rng, n, 0), 1800), lowpass(water_layer(rng, n, 0), 1800)], 1)
    river = 0.6 * river.mean(1, keepdims=True) + 0.4 * river
    return room / rms(room) + 0.6 * air / rms(air) + 0.3 * river / rms(river)


BEDS = {'water': bed_water, 'air': bed_air, 'air-dusk': bed_air_dusk, 'room-warm': bed_room_warm,
        'air-soft': bed_air_soft, 'paradise': bed_paradise, 'room-window': bed_room_window}
BED_AR = {'water': (0.8, 0.6), 'room-window': (0.4, 0.45)}

TOUCH = {'brush': fx_brush, 'brush-big': fx_brush, 'brush-ring': fx_brush_ring, 'dab': fx_dab, 'tap': fx_tap,
         'flick': fx_flick, 'heart': fx_heart, 'leaves': fx_leaves, 'foliage': fx_foliage, 'paper': fx_paper,
         'breath': fx_breath}
WHOOSH = {'whoosh-soft': (500, 2200, 1.2), 'whoosh-in': (250, 2600, 1.6), 'whoosh-out': (2200, 260, 1.6),
          'whoosh-deep': (110, 700, 1.1), 'whoosh-down': (1600, 180, 1.1), 'rise': (180, 2400, 1.2), 'airy': (1400, 3400, 0.9),
          'sweep': (600, 3000, 1.3)}
# kısma derinliği (dB, konuşma tam varken) ve zaman sabitleri (giriş, bırakış sn)
DUCK = {'bed': (6.0, 0.12, 0.6), 'whoosh': (6.0, 0.05, 0.3), 'touch': (2.0, 0.03, 0.2)}


def kind_class(k):
    if k in BEDS: return 'bed'
    if k in WHOOSH: return 'whoosh'
    if k in TOUCH: return 'touch'
    raise ValueError(f'bilinmeyen efekt türü: {k} (müzik/zil benzeri eski türler kaldırıldı)')


def render_event(ev):
    """→ (stereo dizi, sınıf). Zeminler kendi stereo genişliğiyle, diğerleri tek kanal + pan."""
    k = ev['kind']; rng = ev_rng(ev); cls = kind_class(k)
    if cls == 'bed':
        n = int(ev.get('dur', 5) * SR); a0, r0 = BED_AR.get(k, (0.5, 0.5))
        return bed_norm(BEDS[k](ev, rng, n), ev.get('a', a0), ev.get('r', r0)), cls
    x = fx_whoosh(ev, rng, *WHOOSH[k]) if cls == 'whoosh' else TOUCH[k](ev, rng)
    p = ev.get('pan', float(np.clip(rng.normal(0, 0.2), -0.45, 0.45)))
    return pan(x, p), cls


# ---------------------------------------------------------------- konuşma, kısma, ölçüm
def load_voice(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


HOP = 441  # 10 ms


def speech_activity(voice):
    """10 ms adımlı konuşma etkinliği 0..1 (30 ms RMS; -55 dBFS'te 0, -30 dBFS'te 1)."""
    m2 = np.square(voice.mean(1)); c = np.concatenate([[0], np.cumsum(m2)])
    idx = np.arange(0, len(m2), HOP); lo = np.clip(idx - 660, 0, len(m2)); hi = np.clip(idx + 660, 0, len(m2))
    lvl = 10 * np.log10((c[hi] - c[lo]) / np.maximum(1, hi - lo) + 1e-12)
    return np.clip((lvl + 55) / 25, 0, 1)


def duck_gain(act, n, depth, att, rel, look=0.04):
    y = np.zeros_like(act); ka = 1 - math.exp(-0.01 / att); kr = 1 - math.exp(-0.01 / rel); v = 0.0
    for i, a in enumerate(act):
        v += (a - v) * (ka if a > v else kr); y[i] = v
    sh = int(look / 0.01); y = np.concatenate([y[sh:], np.full(sh, y[-1])])  # biraz önden kıs
    g = np.interp(np.arange(n), np.arange(len(y)) * HOP, y)
    return 10 ** (-depth * g / 20)


def _kw_sos():
    G, Q, fc = 3.99984385397, 0.7071752369554193, 1681.9744509555319
    A = 10 ** (G / 40); w0 = 2 * np.pi * fc / SR; al = np.sin(w0) / (2 * Q); c = np.cos(w0); sA = np.sqrt(A)
    b1 = [A * ((A + 1) + (A - 1) * c + 2 * sA * al), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - 2 * sA * al)]
    a1 = [(A + 1) - (A - 1) * c + 2 * sA * al, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - 2 * sA * al]
    Q, fc = 0.5003270373253953, 38.13547087613982
    w0 = 2 * np.pi * fc / SR; al = np.sin(w0) / (2 * Q); c = np.cos(w0)
    b2 = [(1 + c) / 2, -(1 + c), (1 + c) / 2]; a2 = [1 + al, -2 * c, 1 - al]
    return np.array([np.r_[np.array(b1) / a1[0], 1, np.array(a1[1:]) / a1[0]],
                     np.r_[np.array(b2) / a2[0], 1, np.array(a2[1:]) / a2[0]]])


def k_weight(x): return ss.sosfilt(_kw_sos(), x, axis=0)


def lufs_integrated(x):
    """ITU-R BS.1770-4 bütünleşik ölçüm (400 ms blok, %75 bindirme, -70 / -10 LU kapı)."""
    y = np.square(k_weight(x)).sum(1); c = np.concatenate([[0], np.cumsum(y)])
    bl, st = int(0.4 * SR), int(0.1 * SR); s = np.arange(0, len(y) - bl + 1, st)
    z = (c[s + bl] - c[s]) / bl; l = -0.691 + 10 * np.log10(z + 1e-15)
    z1 = z[l > -70]
    if not len(z1): return -120.0
    gate = -0.691 + 10 * np.log10(z1.mean()) - 10
    z2 = z[(l > -70) & (l > gate)]
    return float(-0.691 + 10 * np.log10(z2.mean()))


def true_peak_env(x):
    """4x örneklemeyle örnek başına gerçek tepe zarfı (kanalların en büyüğü)."""
    up = ss.resample_poly(x, 4, 1, axis=0)
    a = np.abs(up).max(1); n = len(x)
    a = a[:n * 4].reshape(n, 4).max(1)
    return np.maximum(a, np.abs(x).max(1))


def tp_limit(x, ceil_db, look=0.003, rel=0.08):
    """İleriye bakan gerçek tepe sınırlayıcı (yalnız gerekli yerlerde, yumuşak)."""
    ceil = 10 ** (ceil_db / 20)
    for _ in range(4):
        pk = true_peak_env(x)
        if pk.max() <= ceil: break
        g = np.minimum(1.0, ceil * 0.995 / (pk + 1e-12))
        L = int(look * SR); g = minimum_filter1d(g, 2 * L + 1); g = uniform_filter1d(g, L + 1)
        # bırakış: kazanç yavaşça 1'e döner (yalnız kazancın 1'in altında olduğu bölgelerin çevresinde döngü)
        kr = 1 - math.exp(-1 / (rel * SR)); out = g.copy(); act = np.flatnonzero(g < 0.9999)
        if len(act):
            i0 = act[0]; i1 = min(len(g), act[-1] + int(rel * SR * 8)); v = out[i0]
            for i in range(i0, i1):
                gi = g[i]; v = gi if gi < v else v + (gi - v) * kr; out[i] = v
        x = x * out[:, None]
    return x


def write_wav(path, x, seed=7):
    rng = np.random.default_rng(seed)
    d = (rng.random(x.shape) - rng.random(x.shape)) / 32767  # TPDF titreşim (±1 LSB)
    pcm = np.clip(np.round((x + d) * 32767), -32768, 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def build(evs, voice, N):
    """→ (konuşma, efekt yolu, işaret listesi [(ev, sınıf, başlangıç, kısılmış stereo dizi)])."""
    mix_v = np.zeros((N, 2)); mix_v[:min(N, len(voice))] = voice[:N]
    act = speech_activity(mix_v)
    gains = {c: duck_gain(act, N, *DUCK[c]) for c in DUCK}
    fx = np.zeros((N, 2)); stems = []
    for ev in evs:
        s = int(round(ev['t'] * SR))
        if s >= N: continue
        x, cls = render_event(ev)
        x = x * 10 ** (ev.get('gain', 0) / 20)
        e = min(N, s + len(x)); x = x[:e - s]
        dg = gains[cls][s:e]
        if 'duck' in ev:  # özel derinlik: sınıfın zarfını ölçekle
            dg = 10 ** (ev['duck'] / DUCK[cls][0] * np.log10(dg))
        x = x * dg[:, None]; fx[s:e] += x; stems.append((ev, cls, s, x))
    return mix_v, fx, stems


def master(mix):
    """-14 LUFS'e kazanç + gerçek tepe sınırlayıcı; sınırlayıcı sonrası küçük düzeltme (3 tur). → (karışım, kazanç)"""
    g = 1.0; out = mix
    for _ in range(3):
        g *= 10 ** ((TARGET_LUFS - lufs_integrated(out)) / 20)
        out = tp_limit(mix * g, CEIL_DBTP)
    return out, g


def main():
    args = sys.argv[1:]; opt = {}
    for k in ('--fx', '--report'):
        if k in args: i = args.index(k); opt[k] = args[i + 1]; del args[i:i + 2]
    evs = json.load(open(args[0])); voice = load_voice(args[1]); out = args[2]
    total = float(args[3]) if len(args) > 3 else len(voice) / SR + 5
    N = int(round(total * SR))
    mix_v, fx, stems = build(evs, voice, N)
    pre = lufs_integrated(mix_v + fx)
    mix, g = master(mix_v + fx)
    def db(x): return 20 * np.log10(rms(x))
    tp = 20 * np.log10(true_peak_env(mix).max())
    print(f"konuşma {lufs_integrated(mix_v):.2f} LUFS, karışım (ön) {pre:.2f} → {lufs_integrated(mix):.2f} LUFS, "
          f"gerçek tepe {tp:.2f} dBTP, efekt RMS {db(fx):.1f} dBFS, {len(stems)} işaret")
    write_wav(out, mix)
    if '--fx' in opt: write_wav(opt['--fx'], np.clip(fx * g, -1, 1))
    if '--report' in opt:
        json.dump({'master_gain_db': 20 * np.log10(g), 'cues': [{**ev, 'class': c, 'start': s / SR, 'end': (s + len(x)) / SR,
                   'peak_dbfs': 20 * np.log10(np.max(np.abs(x)) * g + 1e-12)} for ev, c, s, x in stems]},
                  open(opt['--report'], 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
