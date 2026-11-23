"""meter.py - ITU-R BS.1770-4 / EBU R128 loudness and true-peak metering (numpy + scipy only).

All functions take float arrays shaped (n,) or (n, channels) at 48 kHz (other rates supported).
Loudness values are in LUFS (stereo: both channel weights = 1.0).
"""
import numpy as np
from scipy import signal

SR = 48000
_EPS = 1e-20


def k_sos(sr=SR):
    """K-weighting pre-filter (high shelf + RLB high-pass) as second-order sections.
    Analytic design (as libebur128); at 48 kHz it reproduces the BS.1770 table coefficients."""
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = np.tan(np.pi * f0 / sr)
    Vh = 10.0 ** (G / 20.0)
    Vb = Vh ** 0.4996667741545416
    a0 = 1.0 + K / Q + K * K
    s1 = [(Vh + Vb * K / Q + K * K) / a0, 2.0 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0,
          1.0, 2.0 * (K * K - 1.0) / a0, (1.0 - K / Q + K * K) / a0]
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = np.tan(np.pi * f0 / sr)
    a0 = 1.0 + K / Q + K * K
    s2 = [1.0, -2.0, 1.0, 1.0, 2.0 * (K * K - 1.0) / a0, (1.0 - K / Q + K * K) / a0]
    return np.array([s1, s2])


def _2d(x):
    x = np.asarray(x, dtype=np.float64)
    return x[:, None] if x.ndim == 1 else x


def k_weight(x, sr=SR):
    return signal.sosfilt(k_sos(sr), _2d(x), axis=0)


def k_power(x, sr=SR):
    """Per-sample K-weighted power summed over channels (n,)."""
    y = k_weight(x, sr)
    return np.sum(y * y, axis=1)


def to_lufs(mean_square):
    return -0.691 + 10.0 * np.log10(np.maximum(mean_square, _EPS))


def _block_means(p, win, hop):
    """Mean of p over sliding windows of `win` samples every `hop` samples (complete windows only)."""
    if len(p) < win:
        p = np.concatenate([p, np.zeros(win - len(p))])
    c = np.concatenate([[0.0], np.cumsum(p)])
    starts = np.arange(0, len(p) - win + 1, hop)
    return (c[starts + win] - c[starts]) / win, starts


def integrated(x, sr=SR):
    """Gated integrated loudness (BS.1770-4): 400 ms blocks, 75 % overlap, -70 LUFS abs gate, -10 LU rel gate."""
    z, _ = _block_means(k_power(x, sr), int(round(0.4 * sr)), int(round(0.1 * sr)))
    l = to_lufs(z)
    keep = l > -70.0
    if not np.any(keep):
        return -np.inf
    rel = to_lufs(np.mean(z[keep])) - 10.0
    keep &= l > rel
    if not np.any(keep):
        return -np.inf
    return float(to_lufs(np.mean(z[keep])))


def ungated(x, sr=SR, mask=None):
    """Plain K-weighted loudness of the whole signal (or of the samples where mask is True)."""
    p = k_power(x, sr)
    if mask is not None:
        p = p[np.asarray(mask, bool)[: len(p)]]
    if len(p) == 0:
        return -np.inf
    return float(to_lufs(np.mean(p)))


def windowed(x, win_s, hop_s=0.1, sr=SR):
    """Sliding-window loudness. Returns (t_start, t_end, lufs) arrays. 0.4 s = momentary, 3 s = short-term."""
    win, hop = int(round(win_s * sr)), int(round(hop_s * sr))
    z, starts = _block_means(k_power(x, sr), win, hop)
    return starts / sr, (starts + win) / sr, to_lufs(z)


def momentary(x, sr=SR):
    return windowed(x, 0.4, 0.1, sr)


def short_term(x, sr=SR):
    return windowed(x, 3.0, 0.1, sr)


def max_window_lufs(x, win_s=0.1, sr=SR):
    """Maximum K-weighted loudness over any `win_s` window (zero-padded, so short sounds are diluted
    over the window just like on a meter). Used to calibrate short sound effects ('LK100')."""
    x = _2d(x)
    win = int(round(win_s * sr))
    pad = np.zeros((win, x.shape[1]))
    p = k_power(np.concatenate([pad, x, pad]), sr)
    c = np.concatenate([[0.0], np.cumsum(p)])
    z = (c[win:] - c[:-win]) / win
    return float(to_lufs(np.max(z)))


def sample_peak_db(x):
    return float(20.0 * np.log10(max(np.max(np.abs(x)) if np.size(x) else 0.0, 1e-10)))


def true_peak_db(x, oversample=4):
    """True peak (dBTP): maximum of the 4x oversampled signal (polyphase FIR), per BS.1770 Annex 2."""
    x = _2d(x)
    if x.shape[0] == 0:
        return -200.0
    y = signal.resample_poly(x, oversample, 1, axis=0)
    return float(20.0 * np.log10(max(np.max(np.abs(y)), np.max(np.abs(x)), 1e-10)))


def rms_db(x):
    x = np.asarray(x, dtype=np.float64)
    return float(10.0 * np.log10(max(np.mean(x * x), _EPS))) if x.size else -200.0


def spectral_centroid(x, sr=SR):
    """Power-weighted spectral centroid in Hz of the mono sum."""
    m = _2d(x).mean(axis=1)
    if len(m) < 8:
        return 0.0
    P = np.abs(np.fft.rfft(m * np.hanning(len(m)))) ** 2
    f = np.fft.rfftfreq(len(m), 1.0 / sr)
    return float(np.sum(f * P) / max(np.sum(P), _EPS))


BANDS = [(0, 60), (60, 150), (150, 400), (400, 1000), (1000, 2500), (2500, 5000), (5000, 10000), (10000, 24000)]


def band_energies_db(x, sr=SR, bands=BANDS):
    """Energy per band in dB relative to the total energy (list aligned with `bands`)."""
    x = _2d(x)
    P = np.sum(np.abs(np.fft.rfft(x, axis=0)) ** 2, axis=1)
    f = np.fft.rfftfreq(x.shape[0], 1.0 / sr)
    tot = max(np.sum(P), _EPS)
    return [float(10.0 * np.log10(max(np.sum(P[(f >= lo) & (f < hi)]), _EPS) / tot)) for lo, hi in bands]


if __name__ == "__main__":
    # self-test: EBU Tech 3341 style check - 1 kHz stereo sine at -23 dBFS must read -23.0 LUFS
    t = np.arange(SR * 20) / SR
    s = 10 ** (-23 / 20) * np.sin(2 * np.pi * 1000 * t)
    st = np.stack([s, s], 1)
    print("1 kHz stereo -23 dBFS sine: I = %.2f LUFS (expect -23.0), TP = %.2f dBTP (expect -23.0)"
          % (integrated(st), true_peak_db(st)))
    print("48k K-weight sos:\n", np.array2string(k_sos(48000), precision=11))
