"""look.py - spectrogram + envelope picture of stereo float audio (numpy + PIL only)."""
import sys
import numpy as np
from scipy import signal
from PIL import Image, ImageDraw
SR = 48000

def spec_image(x, title="", w=1100, h=420, fmin=60.0, fmax=12000.0, floor_db=-100.0, top_db=-30.0, t0=0.0, marks=()):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 2:
        m = x.mean(axis=1)
    else:
        m = x
    nper = 2048
    hop = max(int(len(m) / w), 16)
    hop = min(hop, nper // 2)
    f, t, S = signal.spectrogram(np.concatenate([np.zeros(nper // 2), m, np.zeros(nper // 2)]), SR, window="hann", nperseg=nper, noverlap=nper - hop, mode="magnitude", scaling="spectrum")
    db = 20 * np.log10(S + 1e-12)
    fy = np.exp(np.linspace(np.log(fmax), np.log(fmin), h))
    idx = np.clip(np.searchsorted(f, fy), 0, len(f) - 1)
    tx = np.clip((np.linspace(0, db.shape[1] - 1, w)).astype(int), 0, db.shape[1] - 1)
    img = db[idx][:, tx]
    v = np.clip((img - floor_db) / (top_db - floor_db), 0, 1)
    rgb = np.stack([np.clip(v * 3, 0, 1), np.clip(v * 3 - 1, 0, 1), np.clip(v * 3 - 2, 0, 1)], axis=2)
    eh = 120
    canvas = np.zeros((h + eh + 24, w + 60, 3))
    canvas[24:24 + h, 60:] = rgb
    # envelope (RMS 10 ms) in dB
    k = 480
    p = np.sum(np.atleast_2d(x.T).T ** 2, axis=1) if x.ndim == 2 else x ** 2
    cs = np.concatenate([[0], np.cumsum(p)])
    centers = np.linspace(0, len(p) - 1, w).astype(int)
    lo, hi = np.clip(centers - k // 2, 0, len(p)), np.clip(centers + k // 2, 0, len(p))
    e = 10 * np.log10((cs[hi] - cs[lo]) / np.maximum(hi - lo, 1) + 1e-14)
    im = Image.fromarray((canvas * 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    emax = np.max(e)
    for i in range(w - 1):
        y0 = 24 + h + eh - 1 - int(np.clip((e[i] - (emax - 50)) / 50, 0, 1) * (eh - 4))
        y1 = 24 + h + eh - 1 - int(np.clip((e[i + 1] - (emax - 50)) / 50, 0, 1) * (eh - 4))
        d.line([(60 + i, y0), (61 + i, y1)], fill=(120, 255, 120))
    for fr in (100, 200, 500, 1000, 2000, 4000, 8000):
        y = 24 + int(np.interp(np.log(fr), np.log(fy[::-1]), np.arange(h)[::-1]))
        d.line([(55, y), (60 + w, y)], fill=(70, 70, 90))
        d.text((2, y - 6), "%g" % fr, fill=(220, 220, 220))
    dur = len(m) / SR
    step = 0.1 if dur < 1.5 else (0.25 if dur < 4 else (0.5 if dur < 10 else 1.0))
    tt = np.arange(0, dur + 1e-9, step)
    for q in tt:
        xx = 60 + int(q / dur * (w - 1))
        d.line([(xx, 24 + h), (xx, 24 + h + 6)], fill=(255, 255, 255))
        if abs((q / step) % 2) < 1e-6 or dur < 1.5:
            d.text((xx + 2, 24 + h + 4), "%.2f" % (t0 + q), fill=(255, 255, 255))
    for mk in marks:
        xx = 60 + int((mk - t0) / dur * (w - 1))
        d.line([(xx, 24), (xx, 24 + h + eh)], fill=(90, 200, 255))
    d.text((64, 4), "%s   (colour %g..%g dB, env: top = %.1f dB, 50 dB range)" % (title, floor_db, top_db, emax), fill=(255, 255, 255))
    return im

def stack(images, path):
    W = max(i.width for i in images)
    H = sum(i.height for i in images)
    out = Image.new("RGB", (W, H))
    y = 0
    for i in images:
        out.paste(i, (0, y))
        y += i.height
    out.save(path)
