# -*- coding: utf-8 -*-
"""
sfx.py - "Dâr-ı Hizmet" kısa videosu için prosedürel, sakin ve yumuşak ses efektleri.

Bütün üreteçler 48 kHz, stereo, float32 bir (n, 2) dizisi döndürür:
  * deterministik: aynı `seed` -> aynı ses; farklı seed -> doğal varyasyon,
  * tıksız: yükseltilmiş-kosinüs giriş/çıkış zarfları, ilk ve son örnek 0,
  * DC'siz: 20 Hz yüksek geçiren süzgeç,
  * isteğe bağlı sentetik stereo yankı (`wet`, 0..1),
  * NOMINAL tablosundaki seviyeye normalize edilmiş (miks.py'deki "db" buna göreli).

Nominal ölçü türleri:
  'M'    : en yüksek anlık yükseklik (momentary, 400 ms, K-ağırlıklı, 80 Hz HPF sonrası), LUFS
           - doku/yatak sesleri için
  'peak' : örnek tepe değeri, dBFS - kısa darbe sesleri için

Hiçbir şey dışarıdan yüklenmez: süzülmüş gürültü, modal/toplamsal sentez, zarflar.
"""
from __future__ import annotations

import numpy as np
from scipy import ndimage, signal

SR = 48000

# ad: (ölçü türü, seviye)  -- miksteki db=0 karşılığı
NOMINAL = {
    "whoosh":        ("M",    -31.0),
    "swish_paper":   ("M",    -33.0),
    "bloom":         ("M",    -32.0),
    "drop":          ("peak", -27.0),
    "pour":          ("M",    -32.0),
    "rain":          ("M",    -34.0),   # intensity=0.5 için; intensity +-4 dB kaydırır
    "wind":          ("M",    -33.0),   # intensity=0.5 için; intensity +-4 dB kaydırır
    "thunder_far":   ("M",    -35.0),
    "pop_soft":      ("peak", -28.0),
    "coin_clink":    ("peak", -29.0),
    "chime":         ("peak", -27.0),
    "shimmer":       ("M",    -36.0),
    "lift_wash":     ("M",    -33.0),
    "tick":          ("peak", -30.0),
    "grow":          ("M",    -34.0),
    "leaves_rustle": ("M",    -35.0),
    "room_tone":     ("M",    -50.0),
    "book_soft":     ("M",    -35.0),
}

# 'M' türü dokularda tepe/yükseklik oranı sınırı (dB): tepe <= nominal + PLR.
# Gauss gürültüsünün seyrek tepeleri görünmez biçimde kırpılır (ileri bakışlı sınırlayıcı).
PLR = {"thunder_far": 10.0, "room_tone": 10.0, "leaves_rustle": 9.0, "grow": 9.0,
       "swish_paper": 9.0, "rain": 9.0}
PLR_DEFAULT = 8.0


# ---------------------------------------------------------------------------
# temel yardımcılar
# ---------------------------------------------------------------------------
def db2lin(db):
    return 10.0 ** (np.asarray(db, dtype=np.float64) / 20.0)


def lin2db(a):
    return 20.0 * np.log10(np.maximum(np.abs(np.asarray(a, dtype=np.float64)), 1e-12))


def _rng(seed):
    return np.random.default_rng(int(seed) & 0xFFFFFFFF)


def _ns(sec):
    return max(1, int(round(float(sec) * SR)))


def _st(x):
    """mono -> stereo (n, 2) float64."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        return np.stack([x, x], axis=1)
    return x


def _rise(n):
    """0 -> 1 yükseltilmiş kosinüs (n örnek); ilk örnek tam 0."""
    if n <= 0:
        return np.zeros(0)
    return 0.5 - 0.5 * np.cos(np.pi * np.arange(n) / n)


def _smoothstep(u):
    u = np.clip(u, 0.0, 1.0)
    return u * u * (3.0 - 2.0 * u)


def fade(x, fade_in=0.003, fade_out=0.03):
    """Yükseltilmiş-kosinüs giriş/çıkış; son örnek tam 0."""
    x = np.array(x, dtype=np.float64, copy=True)
    n = x.shape[0]
    a = min(_ns(fade_in), n // 2)
    r = min(_ns(fade_out), n - a)
    e = np.ones(n)
    if a > 0:
        e[:a] = _rise(a)
    if r > 0:
        e[n - r:] = _rise(r)[::-1]
    return x * (e[:, None] if x.ndim == 2 else e)


def curve(points, t):
    """(zaman, değer) kırılma noktalarından smoothstep ile pürüzsüz eğri."""
    p = np.asarray(points, dtype=np.float64)
    ts, vs = p[:, 0], p[:, 1]
    t = np.asarray(t, dtype=np.float64)
    i = np.clip(np.searchsorted(ts, t, side="right") - 1, 0, len(ts) - 2)
    span = np.maximum(ts[i + 1] - ts[i], 1e-9)
    u = _smoothstep((t - ts[i]) / span)
    return vs[i] + (vs[i + 1] - vs[i]) * u


def _bell_env(t, t_peak, t_end, p_up=1.5, p_dn=1.2):
    """0'dan t_peak'e yükselen, t_end'de 0'a inen yumuşak (C1) çan zarfı."""
    t = np.asarray(t, dtype=np.float64)
    up = np.clip(t / max(t_peak, 1e-6), 0, 1)
    dn = np.clip((t - t_peak) / max(t_end - t_peak, 1e-6), 0, 1)
    e_up = (0.5 - 0.5 * np.cos(np.pi * up)) ** p_up
    e_dn = (0.5 + 0.5 * np.cos(np.pi * dn)) ** p_dn
    return np.where(t <= t_peak, e_up, e_dn)


def slow_noise(n, rng, rate):
    """~`rate` Hz bant genişlikli, ortalaması 0, std'si 1 pürüzsüz rastgele eğri."""
    cr = max(200.0, 8.0 * rate)
    cr = min(cr, SR)
    m = max(64, int(n * cr / SR) + 16)
    w = rng.standard_normal(m)
    sos = signal.butter(2, min(rate / (cr / 2), 0.95), "low", output="sos")
    w = signal.sosfiltfilt(sos, w)
    w = (w - w.mean()) / (w.std() + 1e-12)
    xp = np.linspace(0, n - 1, m)
    return np.interp(np.arange(n), xp, w)


def _unit(x):
    return x / (np.sqrt(np.mean(np.square(x))) + 1e-12)


def _ms(a, b, width):
    """İki bağımsız kanaldan orta/yan ile stereo; width=0 mono, 1 tam geniş."""
    k = 1.0 / np.sqrt(1.0 + width * width)
    return np.stack([(a + width * b) * k, (a - width * b) * k], axis=1)


def _pan_gains(p):
    th = (np.clip(p, -1, 1) + 1.0) * np.pi / 4.0
    return np.cos(th) * np.sqrt(2.0), np.sin(th) * np.sqrt(2.0)


def pan(x, p):
    """Sabit güçlü kaydırma. x mono/stereo; p sabit ya da (n,) dizi, -1 sol .. +1 sağ."""
    x = _st(x)
    p = np.clip(np.broadcast_to(np.asarray(p, dtype=np.float64), (x.shape[0],)), -1, 1)
    gl, gr = _pan_gains(p)
    mid = 0.5 * (x[:, 0] + x[:, 1])
    side = 0.5 * (x[:, 0] - x[:, 1]) * (1.0 - 0.4 * np.abs(p))
    return np.stack([mid * gl + side, mid * gr - side], axis=1)


def _add(out, y, pos, gains=(1.0, 1.0)):
    n = out.shape[0]
    if pos >= n or pos < 0:
        return
    m = min(len(y), n - pos)
    if y.ndim == 1:
        out[pos:pos + m, 0] += y[:m] * gains[0]
        out[pos:pos + m, 1] += y[:m] * gains[1]
    else:
        out[pos:pos + m] += y[:m] * np.asarray(gains)[None, :]


# ---------------------------------------------------------------------------
# süzgeçler
# ---------------------------------------------------------------------------
def lowpass(x, fc, order=2):
    sos = signal.butter(order, min(fc, 0.45 * SR), "lowpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def highpass(x, fc, order=2):
    sos = signal.butter(order, fc, "highpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def bandpass(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, min(hi, 0.45 * SR)], "bandpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def resonator(x, f, q):
    """RBJ bant geçiren (0 dB tepe) rezonatör."""
    w0 = 2 * np.pi * f / SR
    al = np.sin(w0) / (2 * q)
    b = np.array([al, 0.0, -al])
    a = np.array([1 + al, -2 * np.cos(w0), 1 - al])
    return signal.lfilter(b / a[0], a / a[0], x, axis=0)


# spektral biçim fonksiyonları (STFT kazancı için, genlik)
def _lp_shape(f, fc, order=2):
    return 1.0 / np.sqrt(1.0 + (f / fc) ** (2 * order))


def _hp_shape(f, fc, order=2):
    return 1.0 / np.sqrt(1.0 + (fc / np.maximum(f, 1e-3)) ** (2 * order))


def _bell(f, fc, sig_oct):
    return np.exp(-0.5 * (np.log2(np.maximum(f, 1.0) / fc) / sig_oct) ** 2)


def _tilt(f, ref, slope):
    return (np.maximum(f, 20.0) / ref) ** slope


def shaped_noise(n, rng, gain, ch=1, nper=1024):
    """Beyaz gürültüyü STFT'de zamanla değişen kazanç G(f, t) ile boyar.

    gain(f[:, None], t[None, :]) -> (F, T) genlik kazancı (t: sn, sinyal başına göre).
    Her kanal bağımsız gürültüdür (stereo için ilintisiz). Dönüş (n,) ya da (n, ch).
    """
    hop = nper // 4
    out = np.zeros((n, ch))
    G = None
    for c in range(ch):
        w = rng.standard_normal(n)
        f, tt, Z = signal.stft(w, fs=SR, window="hann", nperseg=nper, noverlap=nper - hop)
        if G is None:
            G = np.broadcast_to(gain(f[:, None], tt[None, :]), Z.shape)
        _, y = signal.istft(Z * G, fs=SR, window="hann", nperseg=nper, noverlap=nper - hop)
        if len(y) < n:
            y = np.pad(y, (0, n - len(y)))
        out[:, c] = y[:n]
    return out[:, 0] if ch == 1 else out


# ---------------------------------------------------------------------------
# yükseklik ölçümü (ITU-R BS.1770-4, 48 kHz)
# ---------------------------------------------------------------------------
_K_SOS = np.array([
    [1.53512485958697, -2.69169618940638, 1.19839281085285, 1.0, -1.69065929318241, 0.73248077421585],
    [1.0, -2.0, 1.0, 1.0, -1.99004745483398, 0.99007225036621],
])


def _block_power(x, win, hop):
    y = signal.sosfilt(_K_SOS, _st(x), axis=0)
    s = np.sum(y * y, axis=1)
    W = int(round(win * SR))
    H = max(1, int(round(hop * SR)))
    if len(s) < W:
        s = np.pad(s, (0, W - len(s)))
    c = np.concatenate([[0.0], np.cumsum(s)])
    st = np.arange(0, len(s) - W + 1, H)
    return (c[st + W] - c[st]) / W, st


def _lk(z):
    return -0.691 + 10.0 * np.log10(np.maximum(z, 1e-30))


def integrated_lufs(x):
    z, _ = _block_power(x, 0.4, 0.1)
    l = _lk(z)
    z1 = z[l > -70.0]
    if len(z1) == 0:
        return float("-inf")
    gr = _lk(np.mean(z1)) - 10.0
    z2 = z[(l > -70.0) & (l > gr)]
    return float(_lk(np.mean(z2)))


def momentary_max(x, hop=0.02):
    z, _ = _block_power(x, 0.4, hop)
    return float(_lk(z.max()))


def shortterm_max(x, hop=0.1):
    z, _ = _block_power(x, 3.0, hop)
    return float(_lk(z.max()))


def loudness_curve(x, win=0.4, hop=0.1):
    """(zaman [blok sonu, sn], LUFS) - ffmpeg ebur128 M/S eğrisine denk."""
    z, st = _block_power(x, win, hop)
    return (st + int(round(win * SR))) / SR, _lk(z)


def true_peak_db(x):
    y = signal.resample_poly(_st(x), 4, 1, axis=0)
    return float(lin2db(np.max(np.abs(y))))


def peak_db(x):
    return float(lin2db(np.max(np.abs(x))))


def limiter(x, ceiling_db, lookahead=0.004, release_db_s=40.0, true_peak=True):
    """İleri bakışlı, yumuşak tepe sınırlayıcı (çevrimdışı, sıfır gecikme).

    Gereken zayıflatma (dB) +-lookahead boyunca tutulur, sabit dB/sn ile bırakılır, iki
    kayan ortalamayla yumuşatılır; tepe noktasındaki kazanç her zaman tavanın altında kalır.
    Dönüş: (y, en büyük kazanç azaltma dB).
    """
    x = _st(x)
    n = x.shape[0]
    pk = np.abs(x).max(axis=1)
    if true_peak:
        up = np.abs(signal.resample_poly(x, 4, 1, axis=0)).max(axis=1)
        pk = np.maximum(pk, up[:4 * n].reshape(n, 4).max(axis=1))
    if pk.max() <= db2lin(ceiling_db):
        return x.copy(), 0.0
    att = np.maximum(0.0, lin2db(pk) - ceiling_db)
    L = max(2, int(lookahead * SR))
    a = ndimage.maximum_filter1d(att, size=2 * L + 1)
    k = np.arange(n) * (release_db_s / SR)
    a = np.maximum.accumulate(a + k) - k
    h = L // 2 + 1
    a = ndimage.uniform_filter1d(ndimage.uniform_filter1d(a, size=h), size=h)
    return x * db2lin(-a)[:, None], float(a.max())


# ---------------------------------------------------------------------------
# sentetik stereo yankı (süzülmüş gürültü patlaması dürtü yanıtı)
# ---------------------------------------------------------------------------
_IR_CACHE = {}


def make_ir(rt60=1.2, predelay=0.012, seed=0, damp=0.5):
    """Stereo IR: 3 bantta farklı sönümlü gürültü + erken yansımalar, birim enerji."""
    key = (round(float(rt60), 3), round(float(predelay), 4), int(seed), round(float(damp), 3))
    if key in _IR_CACHE:
        return _IR_CACHE[key]
    rng = _rng(91711 + int(seed))
    pd = int(round(predelay * SR))
    L = _ns(rt60 * 1.05)
    t = np.arange(L) / SR
    bands = [  # (süzgeç, sönüm çarpanı, kazanç)
        (lambda w: lowpass(w, 450, 2), 1.15, 0.85),
        (lambda w: bandpass(w, 450, 3800, 2), 1.0, 1.0),
        (lambda w: highpass(w, 3800, 2), 0.62 - 0.3 * damp, 0.5),
    ]
    ir = np.zeros((pd + L, 2))
    for c in range(2):
        d = np.zeros(L)
        for filt, kt, g in bands:
            w = filt(rng.standard_normal(L + 2048))[2048:]
            T = rt60 * kt
            d += g * _unit(w) * np.exp(-6.9078 * t / T)
        d *= 1.0 - np.exp(-t / 0.007)          # yumuşak yoğunlaşma
        early = np.zeros(L)
        for _ in range(7):                     # erken yansımalar (kanal başına farklı)
            te = rng.uniform(0.003, 0.034)
            k = int(te * SR)
            early[k] += rng.choice([-1, 1]) * 0.55 * np.exp(-te / 0.03) * rng.uniform(0.5, 1.0)
        early = np.convolve(early, np.hanning(26), mode="same")
        h = d / (np.sqrt(np.sum(d * d)) + 1e-12) + early * 0.6
        tail = _ns(rt60 * 0.15)
        h[-tail:] *= _rise(tail)[::-1]
        ir[pd:, c] = h / (np.sqrt(np.sum(h * h)) + 1e-12)
    _IR_CACHE[key] = ir
    return ir


def reverb(x, wet=0.2, rt60=1.2, predelay=0.012, seed=0, damp=0.5):
    """Eşit güçlü kuru/ıslak karışım; çıkış = giriş + kuyruk uzunluğu."""
    x = _st(x)
    if wet <= 0:
        return x
    ir = make_ir(rt60, predelay, seed, damp)
    n, m = x.shape[0], ir.shape[0]
    y = np.zeros((n + m - 1, 2))
    for c in range(2):
        y[:, c] = signal.fftconvolve(x[:, c], ir[:, c])
    dry = np.zeros_like(y)
    dry[:n] = x
    w = np.clip(wet, 0.0, 1.0) * np.pi / 2
    return dry * np.cos(w) + y * np.sin(w)


# ---------------------------------------------------------------------------
# bitiş: DC, yankı, zarf, nominal seviye
# ---------------------------------------------------------------------------
def nominal_measure(x, mode):
    if mode == "peak":
        return peak_db(x)
    return momentary_max(highpass(_st(x), 80.0, 2))


def _finish(x, name, wet=0.0, rt60=1.2, seed=0, predelay=0.012, fade_in=0.002,
            fade_out=0.04, level_offset_db=0.0, damp=0.5):
    x = highpass(_st(x), 20.0, 2)
    if wet > 0:
        x = reverb(x, wet, rt60, predelay, seed, damp)
        x = highpass(x, 20.0, 2)
    x = fade(x, fade_in, fade_out)
    mode, lvl = NOMINAL[name]
    lvl = lvl + level_offset_db
    cur = nominal_measure(x, mode)
    if not np.isfinite(cur):
        return np.zeros_like(x, dtype=np.float32)
    x = x * db2lin(lvl - cur)
    if mode == "M":
        y = x
        for _ in range(3):      # sınırla -> yeniden ölç -> düzelt (yakınsar)
            y, _gr = limiter(x, lvl + PLR.get(name, PLR_DEFAULT), lookahead=0.003, release_db_s=60.0)
            err = lvl - nominal_measure(y, mode)
            if abs(err) < 0.1:
                break
            x = x * db2lin(err)
        x = y
    return x.astype(np.float32)


# ---------------------------------------------------------------------------
# taneli yardımcılar
# ---------------------------------------------------------------------------
def _events(rate, rng):
    """Değişken hızlı Poisson olayları; rate: (n,) olay/sn -> sıralı örnek indeksleri."""
    rate = np.maximum(np.asarray(rate, dtype=np.float64), 0.0)
    cum = np.cumsum(rate) / SR
    total = cum[-1] if len(cum) else 0.0
    k = rng.poisson(total) if total > 0 else 0
    if k == 0:
        return np.zeros(0, dtype=int)
    u = np.sort(rng.uniform(0, total, k))
    return np.minimum(np.searchsorted(cum, u), len(rate) - 1)


def _bubble(f0, rng, xi=0.1, damp=1.0, attack=0.0015, max_len=0.25):
    """Van den Doel kabarcık modeli: yükselen perdeli sönümlü sinüs ('plip')."""
    d = (0.043 * f0 + 0.0014 * f0 ** 1.5) * damp
    m = _ns(min(7.0 / d, max_len))
    t = np.arange(m) / SR
    f = np.minimum(f0 * (1.0 + xi * d * t), 0.45 * SR)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-d * t)
    a = min(_ns(max(attack, 0.8 / f0)), m)     # en az ~1 periyot: alçak kabarcıkta 'tok' vuruş yok
    y[:a] *= _rise(a)
    r = min(_ns(0.004), m)
    y[-r:] *= _rise(r)[::-1]
    return y


def _burst(rng, length, lo, hi, attack=0.25, order=2):
    """Kısa bant sınırlı gürültü patlaması (birim RMS, yumuşak zarf)."""
    m = _ns(length)
    w = bandpass(rng.standard_normal(m + 1024), lo, hi, order)[1024:]
    a = max(1, int(m * attack))
    env = np.concatenate([_rise(a), _rise(m - a)[::-1] ** 2])
    return _unit(w) * env


def _modal(freqs, amps, taus, attack, length, rng):
    """Sönümlü kipler toplamı (modal sentez) + yumuşak vuruş."""
    m = _ns(length)
    t = np.arange(m) / SR
    y = np.zeros(m)
    for f, a, tau in zip(freqs, amps, taus):
        if f >= 0.45 * SR:
            continue
        y += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi)) * np.exp(-t / tau)
    k = min(_ns(attack), m)
    y[:k] *= _rise(k)
    r = min(_ns(0.005), m)
    y[-r:] *= _rise(r)[::-1]
    return y


def _grain_train(n, rng, rate, len_range=(0.003, 0.02), amp_sigma=0.6, buckets=4):
    """Poisson zamanlı kısa Hann taneciklerinin toplamı -> genlik zarfı (n,)."""
    pos = _events(rate, rng)
    env = np.zeros(n)
    if len(pos) == 0:
        return env
    amps = np.minimum(rng.lognormal(0.0, amp_sigma, len(pos)), np.exp(1.6 * amp_sigma))
    lens = np.exp(np.linspace(np.log(len_range[0]), np.log(len_range[1]), buckets))
    which = rng.integers(0, buckets, len(pos))
    for b in range(buckets):
        sel = which == b
        if not np.any(sel):
            continue
        imp = np.zeros(n)
        np.add.at(imp, pos[sel], amps[sel])
        L = max(3, _ns(lens[b]))
        win = np.hanning(L + 2)[1:-1]
        env += signal.fftconvolve(imp, win)[:n]
    return env


def _bubble_cloud(n, rng, rate, fmin, fmax, amp=(0.2, 0.6), pan_spread=0.5,
                  xi=(0.06, 0.16), damp=1.0, env=None):
    out = np.zeros((n, 2))
    for p in _events(rate, rng):
        f0 = np.exp(rng.uniform(np.log(fmin), np.log(fmax)))
        g = _bubble(f0, rng, xi=rng.uniform(*xi), damp=damp)
        a = rng.uniform(*amp) * (f0 / fmin) ** -0.3
        if env is not None:
            a *= env[p]
        _add(out, g * a, p, _pan_gains(rng.uniform(-pan_spread, pan_spread)))
    # sönümlü sinüslerin doğal DC/alçak frekans payını temizle
    return highpass(out, 0.4 * fmin, 2)


def _rustle(n, rng, rate, bands=((1100, 2600, 1.0), (2400, 5200, 0.7), (4800, 8500, 0.3)),
            glen=(0.003, 0.025)):
    """Yaprak hışırtısı: bant gürültüsü x tanecik zarfı, kanal başına bağımsız."""
    out = np.zeros((n, 2))
    for lo, hi, amp in bands:
        for c in range(2):
            e = _grain_train(n, rng, rate * rng.uniform(0.8, 1.2), glen, 0.5)
            nb = bandpass(rng.standard_normal(n), lo, hi, 2)
            out[:, c] += amp * _unit(nb) * e
    out = highpass(out, 250.0, 2)
    return out / (np.sqrt(np.mean(out ** 2)) + 1e-12)


# ---------------------------------------------------------------------------
# ÜRETEÇLER
# ---------------------------------------------------------------------------
def whoosh(dur=1.2, brightness=0.5, direction=1.0, peak=0.55, width=0.5, seed=0, wet=0.18):
    """Yumuşak, havadar geçiş: bant geçiren süpürülen pembe gürültü + doppler ve kaydırma.

    brightness 0..1 (koyu..parlak), direction -1..1 (sağdan sola .. soldan sağa; 0 = ortada),
    peak: en yakın geçiş anı (sürenin oranı).
    """
    rng = _rng(seed)
    n = _ns(dur)
    t = np.arange(n) / SR
    b = float(np.clip(brightness, 0, 1))
    tp = dur * float(np.clip(peak, 0.2, 0.85)) * (1 + 0.04 * rng.uniform(-1, 1))
    spread = dur * (0.17 + 0.04 * rng.random())
    f_lo = 160 + 380 * b
    f_hi = (650 + 3200 * b) * (1 + 0.1 * rng.uniform(-1, 1))
    sig = 0.55 + 0.2 * rng.random()
    f_air = 5200 + 2600 * b
    d_m = 2.5 + rng.random()                   # en yakın geçiş mesafesi (m)
    u = (t - tp) / spread
    D = d_m * np.sqrt(1 + u * u) / 343.0 * SR  # yayılım gecikmesi (örnek) -> doppler
    pad = int(np.ceil(D.max())) + 16
    t0 = pad / SR

    def G(f, tt):
        uu = (tt - t0 - tp) / spread
        prox = 1 / (1 + uu * uu)
        dop = 1 - 0.13 * np.tanh(1.3 * uu)    # yaklaşırken parlak, uzaklaşırken koyu
        fc = (f_lo + (f_hi - f_lo) * prox ** 0.85) * dop
        lf = np.log2(np.maximum(f, 1) / fc)
        g = np.exp(-0.5 * (lf / sig) ** 2) + 0.25 * np.exp(-0.5 * (lf / (2.2 * sig)) ** 2)
        g = g + (0.08 + 0.3 * b) * prox ** 2 * _bell(f, f_air, 0.7)
        return g * _lp_shape(f, 9000, 2) * _hp_shape(f, 60, 2)

    nn = shaped_noise(n + pad, rng, G, ch=2)
    src = np.arange(n) + pad - D
    xs = np.arange(n + pad)
    a = np.interp(src, xs, nn[:, 0])
    bb = np.interp(src, xs, nn[:, 1])
    x = _ms(_unit(a), _unit(bb), width)
    prox = 1 / (1 + u * u)
    env = prox ** 1.25 * np.clip(1 + 0.10 * slow_noise(n, rng, 12), 0.6, 1.4)
    env *= _smoothstep(t / max(tp * 0.7, 1e-3))
    env *= _smoothstep((dur - t) / max((dur - tp) * 0.7, 1e-3))
    x = x * env[:, None]
    p = float(np.clip(direction, -1, 1)) * 0.8 * u / np.sqrt(1 + u * u)
    x = pan(x, p)
    return _finish(x, "whoosh", wet, rt60=1.1, seed=seed, fade_out=0.05)


def swish_paper(dur=0.8, direction=0.4, roughness=0.5, seed=0, wet=0.12):
    """Kâğıt üstünde fırça / kâğıt kayması: hız profiline bağlı sürtünme gürültüsü + lif çıtırtısı."""
    rng = _rng(seed)
    n = _ns(dur)
    t = np.arange(n) / SR
    a = 0.32 + 0.08 * rng.uniform(-1, 1)
    k = 2.2 + 0.6 * rng.random()

    def speed(tt):
        xr = np.maximum(np.asarray(tt) / dur, 1e-6) / a
        return xr ** k * np.exp(k * (1 - xr))

    def G(f, tt):
        s = speed(tt)
        fc = 1100 + 1800 * s
        g = _bell(f, fc, 0.95) + 0.3 * _bell(f, 480, 0.6) * (0.4 + 0.6 * s)
        return g * _lp_shape(f, 7000, 3) * _hp_shape(f, 90, 2)

    nz = shaped_noise(n, rng, G, ch=2)
    base = _ms(_unit(nz[:, 0]), _unit(nz[:, 1]), 0.35)
    grit = np.clip(1 + roughness * 0.55 * np.clip(slow_noise(n, rng, 90), -1.8, 1.8), 0.15, None)
    s = speed(t)
    env = s ** 0.85
    y = base * (grit * env)[:, None]
    for p in _events(140 * roughness * s, rng):    # lif çıtırtıları
        g = _burst(rng, rng.uniform(0.0012, 0.003), 2500, 6500) * rng.lognormal(-1.6, 0.4) * env[p]
        _add(y, g, p, _pan_gains(rng.uniform(-0.3, 0.3)))
    y = pan(y, float(direction) * 0.5 * (2 * t / dur - 1))
    return _finish(y, "swish_paper", wet, rt60=0.9, seed=seed, fade_out=0.04)


def bloom(dur=2.5, shimmer_amt=0.5, seed=0, wet=0.35):
    """Suluboya açılması: açılan alçak geçirenli yumuşak gürültü kabarması + çok hafif camsı parıltı."""
    rng = _rng(seed)
    n = _ns(dur)
    t = np.arange(n) / SR
    tpk = dur * (0.6 + 0.05 * rng.uniform(-1, 1))

    def E(tt):
        return _bell_env(tt, tpk, dur, 1.6, 1.2)

    def G(f, tt):
        e = E(tt)
        fc = 380 + 2800 * e ** 1.3
        g = _lp_shape(f, fc, 2) * _hp_shape(f, 180, 2) * _tilt(f, 500, -0.3)
        return g + 0.12 * e ** 2 * _bell(f, 5500, 0.6)

    nz = shaped_noise(n, rng, G, ch=2)
    x = _ms(_unit(nz[:, 0]), _unit(nz[:, 1]), 0.6)
    env = E(t) * np.clip(1 + 0.06 * slow_noise(n, rng, 5), 0.8, 1.2)
    y = x * env[:, None]
    if shimmer_amt > 0:
        fg = rng.uniform(1700, 2300)
        ratios = np.array([1.0, 1.498, 2.013, 2.69, 3.21]) * (1 + 0.006 * rng.standard_normal(5))
        sh = np.zeros((n, 2))
        for i, r in enumerate(ratios):
            f = fg * r
            if f > 9000:
                continue
            ts = rng.uniform(0.15, 0.55) * tpk
            ta = rng.uniform(0.25, 0.5) * dur
            ek = _smoothstep((t - ts) / ta) * np.exp(-np.maximum(t - ts - ta, 0) / (0.35 * dur))
            trem = 1 + 0.25 * np.sin(2 * np.pi * rng.uniform(3, 6) * t + rng.uniform(0, 6.28))
            s = np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * ek * trem / (1 + i)
            _add(sh, s, 0, _pan_gains(rng.uniform(-0.5, 0.5)))
        act = env > 0.1
        ry = np.sqrt(np.mean(y[act] ** 2)) if np.any(act) else 1.0
        rs = np.sqrt(np.mean(sh[act] ** 2)) if np.any(act) else 1.0
        sh *= ry / (rs + 1e-12) * db2lin(-30 + 12 * float(np.clip(shimmer_amt, 0, 1)))
        y = y + sh
    return _finish(y, "bloom", wet, rt60=1.5, seed=seed, fade_out=0.08)


def drop(pitch=1000.0, splash=0.3, seed=0, wet=0.22):
    """Tek su damlası: yumuşak rezonant kabarcık 'plip' + çok hafif çarpma + ikincil küçük kabarcık."""
    rng = _rng(seed)
    f0 = float(pitch) * (1 + 0.05 * rng.uniform(-1, 1))
    out = np.zeros(_ns(0.32))
    imp = _burst(rng, 0.003, 400, 3000) * 0.10 * splash / 0.3
    out[:len(imp)] += imp * 0.25
    y = _bubble(f0, rng, xi=rng.uniform(0.08, 0.14), damp=0.85, attack=0.0016)
    o = _ns(0.002)
    out[o:o + len(y)] += y[:len(out) - o]
    if rng.random() < 0.6:
        f1 = f0 * rng.uniform(1.35, 1.9)
        y1 = _bubble(f1, rng, xi=0.1, damp=1.0) * rng.uniform(0.18, 0.35)
        d = _ns(rng.uniform(0.012, 0.04))
        m = min(len(y1), len(out) - d)
        out[d:d + m] += y1[:m]
    out = highpass(lowpass(out, 6500, 2), 0.3 * f0, 2)
    return _finish(out, "drop", wet, rt60=1.0, seed=seed, fade_out=0.03)


def pour(dur=3.0, flow=0.6, seed=0, wet=0.2):
    """İbrikten toprağa/yapraklara dökülen su: akış türbülansı + kabarcık bulutu + sıçramalar + damlalar."""
    rng = _rng(seed)
    dur = max(float(dur), 1.2)
    n = _ns(dur)
    t = np.arange(n) / SR
    t_stop = dur - min(0.8, 0.28 * dur)
    t_sus = max(0.45, t_stop - 0.3)
    fl = curve([(0, 0), (0.16, 0.8), (0.4, 1.0), (t_sus, 0.92), (t_stop, 0.0), (dur, 0.0)], t)
    fl *= np.clip(1 + 0.10 * slow_noise(n, rng, 3) + 0.05 * slow_noise(n, rng, 11), 0.5, 1.5)

    def G(f, tt):
        return (_bell(f, 900, 0.9) + 0.2 * _bell(f, 2400, 0.6)) * _hp_shape(f, 200, 2) * _lp_shape(f, 6000, 2)

    nz = shaped_noise(n, rng, G, ch=2)
    gurgle = np.clip(1 + 0.4 * slow_noise(n, rng, 18), 0.2, None)   # akışın çalkantısı
    stream = _ms(_unit(nz[:, 0]), _unit(nz[:, 1]), 0.3) * (fl ** 1.2 * gurgle)[:, None] * 0.22
    bub = _bubble_cloud(n, rng, (160 + 320 * flow) * fl, 450, 2400, (0.2, 0.7), 0.4, (0.06, 0.18), 0.9)
    spl = np.zeros((n, 2))
    for p in _events(6 * fl, rng):                 # yapraklara sıçrama
        g = lowpass(_burst(rng, rng.uniform(0.008, 0.02), 1200, 4500), 4500, 2) * rng.uniform(0.12, 0.28)
        pg = _pan_gains(rng.uniform(-0.6, 0.6))
        _add(spl, g, p, pg)
        for _ in range(rng.integers(2, 4)):
            q = p + _ns(rng.uniform(0.001, 0.02))
            _add(spl, _bubble(rng.uniform(900, 2400), rng, 0.12) * rng.uniform(0.15, 0.35), q, pg)
    soil = bandpass(rng.standard_normal(n), 250, 700, 2)
    soil = _unit(soil) * np.clip(1 + 0.5 * slow_noise(n, rng, 40), 0, None) * fl * 0.18
    y = stream + bub + spl + _st(soil)
    tt = t_stop + rng.uniform(0.05, 0.12)          # son damlalar
    amp = 0.55
    for _ in range(rng.integers(3, 6)):
        if tt > dur - 0.12:
            break
        g = _bubble(rng.uniform(700, 1500), rng, 0.11, 0.9) * amp
        _add(y, g, _ns(tt), _pan_gains(rng.uniform(-0.3, 0.3)))
        tt += rng.uniform(0.08, 0.22) * (1.25 ** _)
        amp *= rng.uniform(0.55, 0.8)
    y = lowpass(y, 7500, 2)
    return _finish(y, "pour", wet, rt60=1.0, seed=seed, fade_in=0.01, fade_out=0.06)


def rain(dur=8.0, intensity=0.5, fade_time=None, seed=0, wet=0.15):
    """Hafif-orta yağmur yatağı: uzak yıkanma + orta mesafe serpinti + tek tek yakın damlalar."""
    rng = _rng(seed)
    I = float(np.clip(intensity, 0, 1))
    n = _ns(dur)
    t = np.arange(n) / SR
    ft = fade_time if fade_time is not None else min(2.0, 0.25 * dur)
    env = fade(np.ones(n), ft, ft) * np.clip(1 + 0.07 * slow_noise(n, rng, 0.25), 0.8, 1.2)

    def G(f, tt):
        g = _bell(f, 2200 + 700 * I, 1.25) * _hp_shape(f, 300, 2) * _lp_shape(f, 8000, 2)
        return g + 0.25 * _bell(f, 600, 0.8)

    nz = shaped_noise(n, rng, G, ch=2, nper=2048)
    bed = np.stack([_unit(nz[:, 0]), _unit(nz[:, 1])], 1) * 0.35
    for lo, hi, rate, amp in [(1200, 3500, 350 + 1500 * I, 0.55), (3000, 6500, 250 + 1200 * I, 0.25)]:
        for c in range(2):
            e = _grain_train(n, rng, np.full(n, rate), (0.0015, 0.008), 0.6)
            nb = bandpass(rng.standard_normal(n), lo, hi, 2)
            bed[:, c] += _unit(nb * e) * amp
    y = bed * env[:, None]
    for p in _events((1.2 + 5.0 * I) * env, rng):  # yakın damlalar
        if rng.random() < 0.35:
            g = _bubble(np.exp(rng.uniform(np.log(800), np.log(2400))), rng, 0.1, 1.1)
            g *= rng.uniform(0.6, 1.4)
        else:
            raw = np.concatenate([_burst(rng, rng.uniform(0.002, 0.006), 500, 6000), np.zeros(_ns(0.03))])
            g = resonator(raw, rng.uniform(900, 2600), rng.uniform(4, 10))
            g = fade(g / (np.max(np.abs(g)) + 1e-12), 0.0005, 0.008) * rng.uniform(0.5, 1.2)
        _add(y, g * 1.4 * env[p], p, _pan_gains(rng.uniform(-0.85, 0.85)))
    return _finish(y, "rain", wet, rt60=1.2, seed=seed, fade_out=0.1,
                   level_offset_db=8.0 * (I - 0.5))


def wind(dur=4.0, intensity=0.5, seed=0, wet=0.1):
    """Yumuşak rüzgâr esintisi: esinti zarfıyla kayan bant gürültüsü + çok hafif ıslık."""
    rng = _rng(seed)
    I = float(np.clip(intensity, 0, 1))
    n = _ns(dur)
    t = np.arange(n) / SR
    tpk = dur * rng.uniform(0.38, 0.52)
    gst = _bell_env(t, tpk, dur, 1.2, 1.0) * np.clip(1 + 0.25 * slow_noise(n, rng, 0.9), 0.4, 1.6)
    gst = gst / (gst.max() + 1e-12)
    fw = 780 * (1 + 0.15 * slow_noise(n, rng, 0.3))
    br = 1 + 0.15 * slow_noise(n, rng, 0.6)          # rezonansın yavaş "nefesi"

    def G(f, tt):
        g_ = np.interp(tt, t, gst)
        fw_ = np.interp(tt, t, fw)
        fc = (230 + 420 * I) * (1 + 0.9 * g_) * np.interp(tt, t, br)
        main = _bell(f, fc, 0.95) * _hp_shape(f, 70, 2)
        body = 0.35 * _bell(f, 140, 0.6)
        whis = 0.22 * I * g_ ** 2 * _bell(f, fw_ * (1 + 0.3 * g_), 0.05)
        hi = 0.12 * I * g_ ** 2 * _bell(f, 3500, 0.8)
        return main + body + whis + hi

    nz = shaped_noise(n, rng, G, ch=2, nper=2048)
    flutter = np.clip(1 + 0.10 * slow_noise(n, rng, 3.0), 0.7, 1.3)
    x = _ms(_unit(nz[:, 0]), _unit(nz[:, 1]), 0.7) * (gst ** 1.1 * flutter)[:, None]
    x = pan(x, np.clip(0.3 * slow_noise(n, rng, 0.2), -0.5, 0.5))
    return _finish(x, "wind", wet, rt60=1.2, seed=seed, fade_in=0.05, fade_out=0.2,
                   level_offset_db=8.0 * (I - 0.5))


def thunder_far(dur=5.0, seed=0, wet=0.45):
    """Çok uzak, çok yumuşak alçak gürleme; çatırtı yok. Üst üste binen yuvarlanan kabarmalar."""
    rng = _rng(seed)
    n = _ns(dur)
    t = np.arange(n) / SR
    env = np.zeros(n)
    k = int(rng.integers(4, 7))
    for i, t0 in enumerate(np.sort(rng.uniform(0.05, 0.55, k)) * dur):
        a = rng.uniform(0.25, 0.7)
        tau = rng.uniform(0.5, 1.3) * dur / 5
        amp = rng.uniform(0.4, 1.0) * (0.8 if i == 0 else 1.0)
        rise = _smoothstep((t - t0) / a)
        dec = np.exp(-np.maximum(t - t0 - a, 0) / tau)
        env += amp * rise * dec
    env /= env.max() + 1e-12
    env *= _smoothstep(t / 0.3) * _smoothstep((dur - t) / (0.3 * dur))
    am = np.clip(1 + 0.35 * slow_noise(n, rng, 4), 0.3, 1.7)

    def G(f, tt):
        e = np.interp(tt, t, env)
        low = _lp_shape(f, 230, 2) * _hp_shape(f, 45, 2) * _tilt(f, 80, -0.3)
        return low + 0.18 * e * _bell(f, 350, 0.6)

    nz = shaped_noise(n, rng, G, ch=2, nper=4096)
    x = _ms(_unit(nz[:, 0]), _unit(nz[:, 1]), 0.6) * (env * am)[:, None]
    return _finish(x, "thunder_far", wet, rt60=1.6, seed=seed, predelay=0.03, damp=0.9,
                   fade_in=0.1, fade_out=0.4)


def pop_soft(pitch=660.0, seed=0, wet=0.15):
    """Öğe belirmesi için minik, yuvarlak 'blup' (hafif yükselen perde, yumuşak vuruş)."""
    rng = _rng(seed)
    f0 = float(pitch) * (1 + 0.02 * rng.uniform(-1, 1))
    m = _ns(0.22)
    t = np.arange(m) / SR
    f = f0 * (1 + 0.16 * (1 - np.exp(-t / 0.012)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = (np.sin(ph) * np.exp(-t / 0.045)
         + 0.10 * np.sin(2 * ph + 0.3) * np.exp(-t / 0.018)
         + 0.04 * np.sin(2.92 * ph) * np.exp(-t / 0.010))
    a = _ns(0.0045)
    y[:a] *= _rise(a)
    puff = _burst(rng, 0.008, f0 * 1.2, min(f0 * 4, 9000)) * 0.05
    y[:len(puff)] += puff
    y = lowpass(y, 5000, 2)
    return _finish(y, "pop_soft", wet, rt60=0.9, seed=seed, fade_out=0.02)


def coin_clink(n=3, muted=0.6, seed=0, wet=0.15):
    """Birkaç küçük altın paranın yumuşakça değmesi (kısa, boğuk, yerleşerek azalan)."""
    rng = _rng(seed)
    n = max(1, int(n))
    times = 0.005 + np.concatenate([[0.0], np.cumsum(rng.uniform(0.045, 0.15, n - 1))])
    out = np.zeros((_ns(times[-1] + 0.35), 2))
    for i, t0 in enumerate(times):
        amp = 0.85 ** i * rng.uniform(0.7, 1.0)
        for c in range(1 if rng.random() < 0.6 else 2):
            fb = rng.uniform(2300, 3300)
            ratios = np.array([1.0, 1.47, 2.09, 2.72, 3.41]) * (1 + 0.01 * rng.standard_normal(5))
            amps = np.array([1.0, 0.6, 0.35, 0.18, 0.09]) * (1 - muted * 0.6) ** np.arange(5)
            taus = 0.045 * (1 - 0.45 * muted) / ratios ** 0.9 * rng.uniform(0.8, 1.2)
            y = _modal(fb * ratios, amps, taus, 0.0007, 0.3, rng)
            y[:_ns(0.0018)] += _burst(rng, 0.0018, 1500, 5000) * 0.25
            pos = _ns(t0 + c * rng.uniform(0.003, 0.012))
            _add(out, y * amp * (0.6 if c else 1.0), pos, _pan_gains(rng.uniform(-0.35, 0.35)))
    out = lowpass(out, 7500, 2)
    return _finish(out, "coin_clink", wet, rt60=0.8, seed=seed, fade_out=0.04)


def chime(pitch=880.0, dur=3.5, hardness=0.3, seed=0, wet=0.3):
    """Yumuşak çan/cam tını: uyumsuz kısmi sesler (serbest çubuk oranları), vuruşlu ikizler, uzun sönüm."""
    rng = _rng(seed)
    f0 = float(pitch) * (1 + 0.003 * rng.uniform(-1, 1))
    m = _ns(dur)
    t = np.arange(m) / SR
    h = float(np.clip(hardness, 0, 1))
    ratios = [1.0, 2.756, 5.404, 8.933]
    amps = [1.0, 0.30 + 0.3 * h, 0.08 + 0.2 * h, 0.03 + 0.1 * h]
    t60 = [dur, dur * 0.5, dur * 0.26, dur * 0.14]
    y = np.zeros((m, 2))
    for r, a, T in zip(ratios, amps, t60):
        f = f0 * r * (1 + 0.0015 * rng.standard_normal())
        if f > 12000:
            continue
        beat = rng.uniform(0.3, 0.9)           # hafif dalgalanma (~4 dB), titreme değil
        s = (np.sin(2 * np.pi * (f - beat / 2) * t + rng.uniform(0, 6.28))
             + 0.25 * np.sin(2 * np.pi * (f + beat / 2) * t + rng.uniform(0, 6.28)))
        s *= a * np.exp(-6.9078 * t / T) / 1.25
        _add(y, s, 0, _pan_gains(rng.uniform(-0.25, 0.25)))
    atk = _ns(0.004 + 0.006 * (1 - h))
    y[:atk] *= _rise(atk)[:, None]
    th = _burst(rng, 0.012, f0 * 0.5, f0 * 2) * 0.03
    y[:len(th)] += th[:, None]
    tail = _ns(0.12 * dur)
    y[-tail:] *= _rise(tail)[::-1][:, None]
    return _finish(y, "chime", wet, rt60=1.6, seed=seed, fade_out=0.05)


def shimmer(dur=3.0, density=14.0, seed=0, wet=0.45):
    """Işık/parıltı için narin pırıltı yatağı: yüksek perdeli yumuşak tanecikler + hava."""
    rng = _rng(seed)
    n = _ns(dur)
    t = np.arange(n) / SR
    env = curve([(0, 0), (0.3 * dur, 1), (0.62 * dur, 1), (dur, 0)], t)
    y = np.zeros((n + _ns(0.3), 2))
    for p in _events(density * env, rng):
        f = np.exp(rng.uniform(np.log(2600), np.log(7200)))
        L = rng.uniform(0.07, 0.28)
        m = _ns(L)
        tt = np.arange(m) / SR
        g = np.sin(2 * np.pi * f * tt + rng.uniform(0, 6.28)) * np.exp(-tt / (L / 4.5))
        if 1.5 * f < 9000:
            g += 0.15 * np.sin(2 * np.pi * 1.5 * f * tt) * np.exp(-tt / (L / 7))
        a = _ns(rng.uniform(0.010, 0.030))
        g[:a] *= _rise(a)
        g = fade(g, 0.0, 0.003)
        _add(y, g * rng.lognormal(0, 0.25) * env[p], p, _pan_gains(rng.uniform(-0.8, 0.8)))
    nz = shaped_noise(n, rng, lambda f, tt: _bell(f, 7000, 0.5), ch=2)
    y[:n] += np.stack([_unit(nz[:, 0]), _unit(nz[:, 1])], 1) * (0.03 * env)[:, None]
    return _finish(y, "shimmer", wet, rt60=1.6, seed=seed, fade_out=0.1)


def lift_wash(dur=1.6, seed=0, wet=0.2):
    """Islak sünger / su girdabıyla boya kaldırma: 'şşvup' rezonanslı gürültü + alçak kabarcıklar + dönen kaydırma."""
    rng = _rng(seed)
    n = _ns(dur)
    t = np.arange(n) / SR
    tpk = dur * rng.uniform(0.4, 0.5)
    E = _bell_env(t, tpk, dur, 1.2, 1.4)
    logfc = curve([(0, np.log2(450)), (tpk, np.log2(1500)), (dur, np.log2(650))], t)

    def G(f, tt):
        fc = 2 ** np.interp(tt, t, logfc)
        e = np.interp(tt, t, E)
        return (_bell(f, fc, 0.65) + 0.25 * e * _bell(f, 2600, 0.9)) * _hp_shape(f, 150, 2)

    nz = shaped_noise(n, rng, G, ch=2)
    base = _ms(_unit(nz[:, 0]), _unit(nz[:, 1]), 0.4)
    am = np.clip(1 + 0.35 * slow_noise(n, rng, 9), 0.2, None)
    gur = _bubble_cloud(n, rng, 70 * E, 280, 1100, (0.2, 0.7), 0.5, (0.2, 0.45), 1.4)
    sw = 0.45 * np.sin(2 * np.pi * t / dur + rng.uniform(0, 6.28))
    y = pan(base * (E * am)[:, None], sw) * 0.6 + gur * 0.5
    return _finish(y, "lift_wash", wet, rt60=1.0, seed=seed, fade_out=0.06)


def tick(n=4, interval=0.5, seed=0, wet=0.12):
    """Yumuşak saat tıkırtısı (ahşap, boğuk); tik/tak dönüşümlü, hafif zaman/seviye oynaması."""
    rng = _rng(seed)
    n = max(1, int(n))
    out = np.zeros((_ns((n - 1) * interval + 0.3), 2))
    for k in range(n):
        tock = (k % 2) == 1
        fb = (1720 if tock else 2050) * (1 + 0.015 * rng.uniform(-1, 1))
        y = _modal(fb * np.array([1.0, 1.57, 2.33, 3.12]), [1.0, 0.5, 0.28, 0.12],
                   np.array([0.016, 0.011, 0.008, 0.005]) * rng.uniform(0.9, 1.1), 0.0005, 0.12, rng)
        y += _modal([480 * (0.95 if tock else 1.0)], [0.45], [0.012], 0.0008, 0.12, rng)
        y[:_ns(0.0015)] += _burst(rng, 0.0015, 1500, 4500) * 0.4
        lvl = db2lin(rng.uniform(-0.8, 0.8) - (1.5 if tock else 0.0))
        pos = _ns(0.003 + k * interval + rng.uniform(-0.003, 0.003))
        _add(out, y * lvl, pos)
    out = lowpass(out, 4800, 2)
    return _finish(out, "tick", wet, rt60=0.8, seed=seed, fade_out=0.04)


def grow(dur=3.0, seed=0, wet=0.25):
    """Organik büyüme: yumuşak yaprak hışırtısı + yavaşça yükselen havadar ton (gıcırtısız)."""
    rng = _rng(seed)
    n = _ns(dur)
    t = np.arange(n) / SR
    prog = _smoothstep(t / (0.85 * dur))
    env = curve([(0, 0), (0.65 * dur, 1), (0.82 * dur, 1), (dur, 0)], t)
    f_s = rng.uniform(240, 300)
    f_e = f_s * rng.uniform(3.6, 4.4)
    logf = np.log2(f_s) + (np.log2(f_e) - np.log2(f_s)) * prog

    def G(f, tt):
        fc = 2 ** np.interp(tt, t, logf)
        tone = _bell(f, fc, 0.11) + 0.25 * _bell(f, 2 * fc, 0.1)
        return (tone + 0.18 * _bell(f, 2.5 * fc, 1.0)) * _hp_shape(f, 120, 2)

    nz = shaped_noise(n, rng, G, ch=2, nper=4096)
    airy = _ms(_unit(nz[:, 0]), _unit(nz[:, 1]), 0.5)
    rust = _rustle(n, rng, (15 + 140 * prog) * env)
    y = airy * env[:, None] * 0.7 + rust * (0.45 * env ** 0.5)[:, None]
    return _finish(y, "grow", wet, rt60=1.3, seed=seed, fade_out=0.1)


def leaves_rustle(dur=2.5, density=1.0, seed=0, wet=0.12):
    """Yaprak hışırtısı: esintiyle yoğunluğu değişen geniş stereo tanecik dokusu."""
    rng = _rng(seed)
    n = _ns(dur)
    gust = 0.25 + 0.75 * np.clip(0.5 + 0.35 * slow_noise(n, rng, 0.7), 0, 1)
    env = fade(np.ones(n), 0.25 * dur, 0.3 * dur)
    rate = (60 + 380 * density) * gust * env
    rust = _rustle(n, rng, rate)
    nz = shaped_noise(n, rng, lambda f, tt: _bell(f, 3800, 0.9), ch=2)
    hiss = np.stack([_unit(nz[:, 0]), _unit(nz[:, 1])], 1) * (0.12 * gust * env)[:, None]
    y = rust * (gust ** 0.5 * env)[:, None] + hiss
    return _finish(y, "leaves_rustle", wet, rt60=1.0, seed=seed, fade_out=0.08)


def room_tone(dur=6.0, seed=0, wet=0.0):
    """Son derece sessiz, sıcak iç mekân ambiyansı (ton/uğultu yok)."""
    rng = _rng(seed)
    n = _ns(dur)

    def G(f, tt):
        g = _tilt(f, 100, -0.75) * _hp_shape(f, 45, 2) * _lp_shape(f, 2200, 1)
        return g * (1 + 0.6 * _bell(f, 170, 0.7))

    nz = shaped_noise(n, rng, G, ch=2, nper=4096)
    x = _ms(_unit(nz[:, 0]), _unit(nz[:, 1]), 0.8)
    x *= np.clip(1 + 0.08 * slow_noise(n, rng, 0.15), 0.8, 1.2)[:, None]
    x = fade(x, min(1.0, 0.2 * dur), min(1.0, 0.2 * dur))
    return _finish(x, "room_tone", wet, rt60=1.0, seed=seed, fade_in=0.05, fade_out=0.1)


def book_soft(dur=1.2, seed=0, wet=0.15):
    """Deri/kâğıt kitabın çok yumuşak fısıltısı ve yerine oturması (kapanış çekimi)."""
    rng = _rng(seed)
    dur = max(float(dur), 0.6)
    n = _ns(dur)
    t = np.arange(n) / SR
    ts = dur * rng.uniform(0.55, 0.65)
    w_env = curve([(0, 0), (0.55 * ts, 1), (ts, 0.5), (ts + 0.1, 0), (dur, 0)], t)

    def G(f, tt):
        return (_bell(f, 1800, 0.9) * _hp_shape(f, 300, 2) + 0.3 * _bell(f, 700, 0.6))

    nz = shaped_noise(n, rng, G, ch=2)
    wh = _ms(_unit(nz[:, 0]), _unit(nz[:, 1]), 0.3)
    wh *= np.clip(1 + 0.3 * slow_noise(n, rng, 45), 0.2, None)[:, None]
    y = wh * (w_env * 0.5)[:, None]
    m = _ns(0.4)
    tt = np.arange(m) / SR
    a = _ns(0.008)
    env_t = np.exp(-tt / 0.045)
    env_t[:a] *= _rise(a)
    thud = _unit(bandpass(rng.standard_normal(m + 1024), 90, 500, 2)[1024:]) * env_t * 0.6
    thud += _modal([175, 290, 420], [1.0, 0.5, 0.25], [0.05, 0.035, 0.02], 0.006, 0.4, rng) * 0.5
    env_p = np.exp(-tt / 0.09)
    a2 = _ns(0.01)
    env_p[:a2] *= _rise(a2)
    thud += _unit(bandpass(rng.standard_normal(m + 1024), 250, 1400, 2)[1024:]) * env_p * 0.35
    thud = fade(thud, 0.0, 0.05)
    _add(y, thud, _ns(ts))
    return _finish(y, "book_soft", wet, rt60=0.9, seed=seed, fade_out=0.06)


GENERATORS = {
    "whoosh": whoosh,
    "swish_paper": swish_paper,
    "bloom": bloom,
    "drop": drop,
    "pour": pour,
    "rain": rain,
    "wind": wind,
    "thunder_far": thunder_far,
    "pop_soft": pop_soft,
    "coin_clink": coin_clink,
    "chime": chime,
    "shimmer": shimmer,
    "lift_wash": lift_wash,
    "tick": tick,
    "grow": grow,
    "leaves_rustle": leaves_rustle,
    "room_tone": room_tone,
    "book_soft": book_soft,
}


def generate(name, **kw):
    """Ada göre üreteç çağır: generate('rain', dur=6, intensity=0.4, seed=3)."""
    return GENERATORS[name](**kw)
