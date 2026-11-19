# -*- coding: utf-8 -*-
"""
inceleme.py - üreteçleri tek tek render eder, ölçer ve PNG (dalga biçimi + seviye + spektrogram) çizer.

Kullanım:
  python3 inceleme.py CIKTI_DIZINI                 # tüm üreteçler (varsayılan parametre, seed=11)
  python3 inceleme.py CIKTI_DIZINI --miks MIKS.wav --cues CUES.json [--teshis TESHIS.npz]

PNG'ler CIKTI_DIZINI/inceleme/ altına, tekil WAV'lar CIKTI_DIZINI/tek/ altına yazılır.
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage, signal
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sfx  # noqa: E402

SR = sfx.SR

_CMAP = np.array([(0, 0, 4), (31, 12, 72), (85, 15, 109), (136, 34, 106), (186, 54, 85),
                  (227, 89, 51), (249, 140, 10), (249, 201, 50), (252, 255, 164)], dtype=float)


def _font(size=14):
    for fp in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
               "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"):
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def _cmap(v):
    v = np.clip(v, 0, 1) * (len(_CMAP) - 1)
    i = np.minimum(v.astype(int), len(_CMAP) - 2)
    fr = (v - i)[..., None]
    return (_CMAP[i] * (1 - fr) + _CMAP[i + 1] * fr).astype(np.uint8)


def _spec_img(x, w, h, fmin=30.0, fmax=20000.0, rng_db=90.0, ref_db=None):
    m = x.mean(axis=1) if x.ndim == 2 else x
    n = len(m)
    nper = 2048 if n > SR else 1024
    hop = max(16, min(nper // 4, n // w + 1))
    f, tt, Z = signal.stft(m, fs=SR, window="hann", nperseg=nper, noverlap=nper - hop)
    S = 20 * np.log10(np.abs(Z) + 1e-10)
    top = S.max() if ref_db is None else ref_db
    S = (S - (top - rng_db)) / rng_db
    fy = fmin * (fmax / fmin) ** (np.arange(h)[::-1] / (h - 1))
    bi = fy / (SR / 2) * (len(f) - 1)
    b0 = np.clip(np.floor(bi).astype(int), 0, len(f) - 2)
    fr = (bi - b0)[:, None]
    rows = S[b0] * (1 - fr) + S[b0 + 1] * fr
    cols = np.clip(((np.arange(w) + 0.5) / w * (tt[-1] + hop / SR) / (hop / SR)).astype(int), 0, rows.shape[1] - 1)
    return _cmap(rows[:, cols]), fy


def _freq_y(fv, h, fmin=30.0, fmax=20000.0):
    return int(round((1 - np.log(fv / fmin) / np.log(fmax / fmin)) * (h - 1)))


def plot_sound(x, path, title, markers=None, extra=None):
    """Dalga biçimi + 10 ms RMS seviye (dBFS) + log-frekans spektrogram."""
    W, L = 1400, 70
    hw, hl, hs = 170, 150, 420
    H = 40 + hw + 12 + hl + 12 + hs + 40
    img = Image.new("RGB", (W + L + 20, H), (250, 250, 248))
    d = ImageDraw.Draw(img)
    fnt, fs = _font(15), _font(12)
    d.text((L, 10), title, fill=(20, 20, 20), font=fnt)
    n = x.shape[0]
    dur = n / SR
    # dalga biçimi (min/max)
    y0 = 40
    d.rectangle([L, y0, L + W, y0 + hw], outline=(180, 180, 180))
    pk = max(np.max(np.abs(x)), 1e-9)
    for c, col in ((0, (40, 90, 170)), (1, (220, 120, 40))):
        idx = np.linspace(0, n, W + 1).astype(int)
        mx = np.maximum.reduceat(x[:, c], idx[:-1]) / pk
        mn = np.minimum.reduceat(x[:, c], idx[:-1]) / pk
        for i in range(W):
            ya = y0 + hw / 2 - mx[i] * hw / 2 * 0.95
            yb = y0 + hw / 2 - mn[i] * hw / 2 * 0.95
            d.line([(L + i, ya), (L + i, yb)], fill=col)
    d.text((4, y0), f"{sfx.lin2db(pk):.1f}", fill=(60, 60, 60), font=fs)
    d.text((4, y0 + 14), "dBFS", fill=(60, 60, 60), font=fs)
    # seviye eğrisi
    y1 = y0 + hw + 12
    d.rectangle([L, y1, L + W, y1 + hl], outline=(180, 180, 180))
    hop = int(0.005 * SR)
    win = int(0.010 * SR)
    p = np.sum(x.astype(np.float64) ** 2, axis=1) / 2
    c = np.concatenate([[0], np.cumsum(p)])
    st = np.arange(0, max(1, n - win), hop)
    rms = 10 * np.log10((c[np.minimum(st + win, n)] - c[st]) / win + 1e-14)
    lo_db, hi_db = -90.0, -10.0
    for g in range(-90, -9, 10):
        yy = y1 + hl - (g - lo_db) / (hi_db - lo_db) * hl
        d.line([(L, yy), (L + W, yy)], fill=(225, 225, 225))
        d.text((30, yy - 7), f"{g}", fill=(110, 110, 110), font=fs)
    pts = [(L + (s + win / 2) / n * W, y1 + hl - (np.clip(v, lo_db, hi_db) - lo_db) / (hi_db - lo_db) * hl)
           for s, v in zip(st, rms)]
    if len(pts) > 1:
        d.line(pts, fill=(30, 130, 70), width=2)
    d.text((L + 6, y1 + 4), "10 ms RMS (dBFS)", fill=(30, 130, 70), font=fs)
    if extra is not None:   # (zaman dizisi, değer dizisi, renk, etiket, lo, hi)
        for te, ve, col, lab, lo, hi in extra:
            pts = [(L + tv / dur * W, y1 + hl - (np.clip(vv, lo, hi) - lo) / (hi - lo) * hl)
                   for tv, vv in zip(te, ve) if np.isfinite(vv)]
            if len(pts) > 1:
                d.line(pts, fill=col, width=2)
        yy = y1 + 18
        for te, ve, col, lab, lo, hi in extra:
            d.text((L + 6, yy), lab, fill=col, font=fs)
            yy += 14
    # spektrogram
    y2 = y1 + hl + 12
    sp, fy = _spec_img(x, W, hs)
    img.paste(Image.fromarray(sp), (L, y2))
    for fv, lab in ((50, "50"), (100, "100"), (200, "200"), (500, "500"), (1000, "1k"), (2000, "2k"),
                    (5000, "5k"), (10000, "10k"), (20000, "20k")):
        yy = y2 + _freq_y(fv, hs)
        d.line([(L - 5, yy), (L, yy)], fill=(80, 80, 80))
        d.text((L - 32, yy - 7), lab, fill=(60, 60, 60), font=fs)
    # zaman ekseni
    step = 0.1 if dur <= 1.5 else 0.25 if dur <= 4 else 0.5 if dur <= 8 else 2.0
    tv = 0.0
    yb = y2 + hs
    while tv <= dur + 1e-9:
        xx = L + tv / dur * W
        d.line([(xx, yb), (xx, yb + 5)], fill=(80, 80, 80))
        d.text((xx - 10, yb + 7), f"{tv:g}", fill=(60, 60, 60), font=fs)
        tv += step
    d.text((L + W - 60, yb + 22), "zaman (sn)", fill=(60, 60, 60), font=fs)
    if markers:
        for tm, lab in markers:
            xx = L + tm / dur * W
            d.line([(xx, y0), (xx, yb)], fill=(0, 170, 200), width=1)
            d.text((xx + 2, y2 + 2), lab, fill=(150, 240, 255), font=fs)
    img.save(path)


# ---------------------------------------------------------------------------
def metrics(x, name=None):
    x = np.asarray(x, dtype=np.float64)
    m = x.mean(axis=1)
    n = len(m)
    out = {"sure_s": n / SR, "peak_dbfs": sfx.peak_db(x), "tp_dbtp": sfx.true_peak_db(x),
           "M_max_lufs": sfx.momentary_max(x)}
    try:
        out["I_lufs"] = sfx.integrated_lufs(x)
    except Exception:
        out["I_lufs"] = float("nan")
    out["dc_db"] = float(sfx.lin2db(np.max(np.abs(x.mean(axis=0))) / max(np.max(np.abs(x)), 1e-12)))
    out["ilk_ornek"] = float(np.max(np.abs(x[0])))
    out["son_ornek"] = float(np.max(np.abs(x[-1])))
    pk = max(np.max(np.abs(x)), 1e-12)
    out["bas_1ms_db"] = float(sfx.lin2db(np.sqrt(np.mean(x[:48] ** 2)) / pk))
    out["son_5ms_db"] = float(sfx.lin2db(np.sqrt(np.mean(x[-240:] ** 2)) / pk))
    # tık skoru: 8 kHz üstü enerji 0.5 ms pencerede / yerel 30 ms medyanı
    hf = sfx.highpass(m, 8000, 4)
    w = 24
    k = n // w
    e = np.sqrt(np.mean(hf[:k * w].reshape(k, w) ** 2, axis=1))
    ref = ndimage.median_filter(e, size=61, mode="nearest")
    bb = np.sqrt(np.mean(m[:k * w].reshape(k, w) ** 2, axis=1)) if k > 0 else np.zeros(1)
    floor = 10 ** (-50 / 20) * bb.max() + 1e-12   # sinyalin 50 dB altındaki HF olayları yok sayılır
    out["tik_skoru_db"] = float(np.max(sfx.lin2db((e + floor) / (ref + floor)))) if k > 0 else 0.0
    # zarf pürüzsüzlüğü: 10 ms RMS kareler arası en büyük artış (dB), sessizlik hariç
    w2 = 480
    k2 = n // w2
    r = 10 * np.log10(np.mean(np.sum(x[:k2 * w2] ** 2, axis=1).reshape(k2, w2), axis=1) + 1e-14)
    act = r > (r.max() - 50)
    dr = np.diff(r)
    a2 = act[1:] & act[:-1]
    out["max_10ms_artis_db"] = float(dr[a2].max()) if np.any(a2) else 0.0
    # stereo ilinti, spektral ağırlık merkezi
    out["LR_ilinti"] = float(np.corrcoef(x[:, 0], x[:, 1])[0, 1]) if np.std(x[:, 1]) > 0 else 1.0
    F = np.abs(np.fft.rfft(m))
    fr = np.fft.rfftfreq(n, 1 / SR)
    out["merkez_hz"] = float(np.sum(F * fr) / (np.sum(F) + 1e-12))
    if name in sfx.NOMINAL:
        mode, lvl = sfx.NOMINAL[name]
        out["nominal"] = f"{mode} {lvl:g}"
        out["nominal_olculen"] = sfx.nominal_measure(x, mode)
    return out


def tek_tek(outdir, seed=11):
    os.makedirs(os.path.join(outdir, "inceleme"), exist_ok=True)
    os.makedirs(os.path.join(outdir, "tek"), exist_ok=True)
    rows = {}
    for name, fn in sfx.GENERATORS.items():
        y = fn(seed=seed)
        wavfile.write(os.path.join(outdir, "tek", f"{name}.wav"), SR, y)
        mt = metrics(y, name)
        rows[name] = mt
        plot_sound(y, os.path.join(outdir, "inceleme", f"{name}.png"),
                   f"{name}  (seed {seed})  peak {mt['peak_dbfs']:.1f} dBFS  TP {mt['tp_dbtp']:.1f} dBTP  "
                   f"M-max {mt['M_max_lufs']:.1f} LUFS  nominal {mt.get('nominal')}  "
                   f"tik {mt['tik_skoru_db']:.1f} dB  ilinti {mt['LR_ilinti']:.2f}")
    return rows


def _print_rows(rows):
    keys = ["sure_s", "nominal", "nominal_olculen", "peak_dbfs", "tp_dbtp", "M_max_lufs", "dc_db",
            "ilk_ornek", "son_ornek", "son_5ms_db", "tik_skoru_db", "max_10ms_artis_db", "LR_ilinti", "merkez_hz"]
    print("ad".ljust(14) + "".join(k[:12].rjust(13) for k in keys))
    for name, mt in rows.items():
        cells = []
        for k in keys:
            v = mt.get(k, "")
            cells.append((f"{v:.2f}" if isinstance(v, float) else str(v)).rjust(13))
        print(name.ljust(14) + "".join(cells))


def _read_wav(path):
    sr, x = wavfile.read(path)
    assert sr == SR, sr
    if x.dtype == np.int32:
        x = x / 2 ** 31
    elif x.dtype == np.int16:
        x = x / 2 ** 15
    return np.asarray(x, dtype=np.float64)


def miks_incele(outdir, mix_path, cues_path, teshis=None):
    os.makedirs(os.path.join(outdir, "inceleme"), exist_ok=True)
    mix = _read_wav(mix_path)
    sfxp = mix_path[:-4] + "_sfx.wav"
    sx = _read_wav(sfxp)
    voice = mix - sx
    with open(cues_path, encoding="utf-8") as fh:
        cues = json.load(fh)
    markers = [(c["t"], c["tip"]) for c in cues]
    tv, lv = sfx.loudness_curve(voice)
    ts, ls = sfx.loudness_curve(sx)
    extra = [(tv - 0.2, lv, (40, 90, 170), "ses M (LUFS, -70..-10)", -90, -10),
             (ts - 0.2, ls, (200, 40, 40), "SFX M (LUFS)", -90, -10)]
    if teshis and os.path.exists(teshis):
        z = np.load(teshis)
        extra.append((z["t_ctrl"], z["duck_db"] * 5 - 20, (130, 60, 160), "duck kazancı (x5, -20 = 0 dB)", -90, -10))
        if "ride_db" in z:
            rd = z["ride_db"]
            extra.append((z["t_ctrl"][:len(rd)], rd * 5 - 20, (230, 150, 0), "tepe sürüşü (x5, -20 = 0 dB)", -90, -10))
    plot_sound(sx, os.path.join(outdir, "inceleme", "miks_sfx.png"),
               "SFX stem (ducking sonrası) - cue işaretleri", markers=markers, extra=extra)
    plot_sound(mix, os.path.join(outdir, "inceleme", "miks_final.png"),
               "Final miks (ses + SFX)", markers=None, extra=extra[:2])
    # konuşma sırasında / boşluklarda karşılaştırma
    nb = min(len(lv), len(ls))
    lv, ls = lv[:nb], ls[:nb]
    sp = lv > -26
    print(f"Konuşma blokları (ses M > -26): {sp.sum()}  /  toplam {nb}")
    if sp.any():
        diff = lv[sp] - ls[sp]
        print(f"Konuşma sırasında ses-SFX farkı (M, 400 ms): min {diff.min():.1f} LU, medyan {np.median(diff):.1f} LU")
    gap = (lv < -45) & (ts[:nb] < 27.6)
    if gap.any():
        print(f"Konuşma boşluklarında SFX M en yüksek: {ls[gap].max():.1f} LUFS")
    print(f"SFX M en yüksek (tümü): {ls.max():.1f} LUFS @ {ts[np.argmax(ls)]:.1f} s")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("outdir")
    ap.add_argument("--seed", type=int, default=11)
    ap.add_argument("--miks")
    ap.add_argument("--cues")
    ap.add_argument("--teshis")
    ap.add_argument("--atla-tek", action="store_true", help="tekil üreteç incelemesini atla")
    a = ap.parse_args()
    if not a.atla_tek:
        rows = tek_tek(a.outdir, a.seed)
        _print_rows(rows)
        with open(os.path.join(a.outdir, "inceleme", "metrikler.json"), "w", encoding="utf-8") as fh:
            json.dump(rows, fh, indent=1, ensure_ascii=False)
    if a.miks:
        miks_incele(a.outdir, a.miks, a.cues, a.teshis)


if __name__ == "__main__":
    main()
