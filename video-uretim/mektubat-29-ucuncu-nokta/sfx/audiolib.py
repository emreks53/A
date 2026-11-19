"""audiolib.py - shared measurement helpers (BS.1770-4 loudness, true peak, windows).

Used by make_sfx.py, mix.py and analyze.py so that every number in the report is
computed with the same maths. Pure numpy/scipy, 48 kHz.
"""
import numpy as np
from scipy import signal

SR = 48000

# ITU-R BS.1770-4 K-weighting at 48 kHz (pre-filter shelf + RLB high-pass)
K_SOS = np.array([
    [1.53512485958697, -2.69169618940638, 1.19839281085285, 1.0, -1.69065929318241, 0.73248077421585],
    [1.0, -2.0, 1.0, 1.0, -1.99004745483398, 0.99007225036621],
])


def as2d(x):
    x = np.asarray(x, dtype=np.float64)
    return x[:, None] if x.ndim == 1 else x


def N(sec):
    return int(round(sec * SR))


def db(x, floor=1e-12):
    return 20.0 * np.log10(np.maximum(np.abs(x), floor))


def kweight(x):
    return signal.sosfilt(K_SOS, as2d(x), axis=0)


def _block_ms(y2, blk, hop):
    """mean-square per block for each channel, y2 = squared signal (n, ch)."""
    c = np.concatenate([np.zeros((1, y2.shape[1])), np.cumsum(y2, axis=0)], axis=0)
    if len(y2) < blk:
        return np.empty((0, y2.shape[1])), np.empty(0, dtype=int)
    starts = np.arange(0, len(y2) - blk + 1, hop)
    return (c[starts + blk] - c[starts]) / blk, starts


def integrated_lufs(x):
    """BS.1770-4 gated integrated loudness (LUFS)."""
    y = kweight(x)
    ms, _ = _block_ms(y * y, N(0.4), N(0.1))
    if len(ms) == 0:
        return -np.inf
    z = ms.sum(axis=1)
    with np.errstate(divide="ignore"):
        l = -0.691 + 10 * np.log10(z)
    g1 = l > -70.0
    if not g1.any():
        return -np.inf
    rel = -0.691 + 10 * np.log10(z[g1].mean()) - 10.0
    g2 = g1 & (l > rel)
    return float(-0.691 + 10 * np.log10(z[g2].mean()))


def ungated_lufs(x):
    """Plain K-weighted mean-square loudness of the whole signal (no gating)."""
    y = kweight(x)
    z = np.mean(y * y, axis=0).sum()
    return float(-0.691 + 10 * np.log10(z + 1e-30))


def window_loudness(x, win_s=0.4, hop_s=0.01):
    """K-weighted loudness of sliding windows (momentary for 0.4 s). Returns (times_center, lufs)."""
    y = kweight(x)
    ms, starts = _block_ms(y * y, N(win_s), max(1, N(hop_s)))
    z = ms.sum(axis=1)
    with np.errstate(divide="ignore"):
        l = -0.691 + 10 * np.log10(z + 1e-30)
    return (starts + N(win_s) / 2) / SR, l


def peak_window_loudness(x, win_s=0.1):
    t, l = window_loudness(x, win_s, 0.0025)
    if len(l) == 0:  # shorter than the window: pad
        x2 = np.zeros((N(win_s) + 1, as2d(x).shape[1]))
        x2[: len(x)] = as2d(x)
        t, l = window_loudness(x2, win_s, 0.0025)
    return float(l.max())


def window_rms_db(x, win_s=0.4, hop_s=0.1):
    """Unweighted RMS (all channels pooled) in sliding windows, dBFS. Returns (t_center, db)."""
    x = as2d(x)
    ms, starts = _block_ms(x * x, N(win_s), N(hop_s))
    m = ms.mean(axis=1)
    return (starts + N(win_s) / 2) / SR, 10 * np.log10(m + 1e-30)


def true_peak_dbtp(x, os=4):
    x = as2d(x)
    up = signal.resample_poly(x, os, 1, axis=0)
    return float(db(np.max(np.abs(up))))


def true_peak_env(x, os=4):
    """Per-sample true-peak estimate (max |.| over the os oversampled points of each sample, all channels)."""
    x = as2d(x)
    up = signal.resample_poly(x, os, 1, axis=0)
    a = np.abs(up).max(axis=1)
    n = len(x)
    a = a[: n * os].reshape(n, os).max(axis=1)
    return np.maximum(a, np.abs(x).max(axis=1))
