#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
miks.py - SFX cue listesini render eder, anlatımın altına ducking ile yerleştirir ve ölçer.

Kullanım:
  python3 miks.py cues.json out.wav [--video-dur 34.0] [--anlatim ses.mp3] [--anlatim-ofset 0.30]

cues.json: nesne listesi
  {"t": 1.25,              # video zamanı (sn): efektin başlangıcı (ya da "hizala": "tepe" ise tepesi)
   "tip": "whoosh",        # sfx.GENERATORS içindeki ad
   "sure": 1.4,            # isteğe bağlı süre -> üretecin `dur` parametresi
   "db": -3,               # üretecin nominal seviyesine göre kazanç (dB)
   "pan": -0.3,            # isteğe bağlı, -1 sol .. +1 sağ
   "parametreler": {...},  # isteğe bağlı üreteç argümanları (brightness, intensity, wet, ...)
   "seed": 7,              # isteğe bağlı; yoksa sıra numarasından deterministik
   "hizala": "tepe",       # isteğe bağlı: "baslangic" (varsayılan) | "tepe"
   "not": "..."}           # yok sayılır (açıklama için)

Zincir:
  cue'lar -> SFX bus -> EQ (HPF 80 Hz 24 dB/okt, 10 kHz üstü -4 dB raf + 16 kHz LPF)
          -> ducking (anlatım zarfından yan zincir: konuşurken ~-8 dB, 80 ms atak / 400 ms bırakma)
          -> SFX yükseklik güvenliği (entegre [-36, -32] LUFS dışındaysa -34'e; anlık M <= -24 LUFS
             sürücüsü; gerçek tepe <= -24 dBTP: önce yavaş 'fader sürüşü', kalan için hızlı sınırlayıcı)
  anlatım (+0.30 sn) -> -16 LUFS entegre, gerçek tepe <= -1.5 dBTP (şeffaf sınırlayıcı)
  final = anlatım + SFX -> 48 kHz stereo 24-bit WAV (+ *_sfx.wav stem), ffmpeg ile ölçüm.
"""
import argparse
import inspect
import json
import os
import re
import struct
import subprocess
import sys

import numpy as np
from scipy import ndimage, signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sfx  # noqa: E402

SR = sfx.SR
VARSAYILAN_ANLATIM = os.environ.get(
    "ANLATIM",
    "/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/ses.mp3")


# ---------------------------------------------------------------------------
# G/Ç
# ---------------------------------------------------------------------------
def load_audio(path):
    """Herhangi bir ses dosyasını 48 kHz stereo float64'e çöz (ffmpeg, soxr)."""
    base = ["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "2"]
    tail = ["-f", "f32le", "-acodec", "pcm_f32le", "-"]
    for af in (["-af", "aresample=48000:resampler=soxr:precision=28"], ["-ar", "48000"]):
        r = subprocess.run(base + af + tail, capture_output=True)
        if r.returncode == 0 and r.stdout:
            return np.frombuffer(r.stdout, dtype="<f4").reshape(-1, 2).astype(np.float64)
    raise RuntimeError(f"ses çözülemedi: {path}\n{r.stderr.decode(errors='replace')}")


def write_wav24(path, x, seed=0):
    """48 kHz stereo 24-bit PCM WAV (TPDF titreşimli)."""
    x = np.asarray(x, dtype=np.float64)
    rng = np.random.default_rng(seed)
    lsb = 1.0 / 2 ** 23
    d = (rng.random(x.shape) - rng.random(x.shape)) * lsb
    q = np.clip(np.round((x + d) * 2 ** 23), -2 ** 23, 2 ** 23 - 1).astype("<i4")
    raw = q.reshape(-1).view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    ch = x.shape[1]
    with open(path, "wb") as fh:
        fh.write(b"RIFF" + struct.pack("<I", 36 + len(raw)) + b"WAVE")
        fh.write(b"fmt " + struct.pack("<IHHIIHH", 16, 1, ch, SR, SR * ch * 3, ch * 3, 24))
        fh.write(b"data" + struct.pack("<I", len(raw)))
        fh.write(raw)


# ---------------------------------------------------------------------------
# cue render
# ---------------------------------------------------------------------------
def render_cue(cue, idx):
    tip = cue["tip"]
    if tip not in sfx.GENERATORS:
        raise KeyError(f"bilinmeyen tip '{tip}' (cue #{idx}); seçenekler: {', '.join(sfx.GENERATORS)}")
    fn = sfx.GENERATORS[tip]
    params = inspect.signature(fn).parameters
    kw = dict(cue.get("parametreler") or {})
    if cue.get("sure") is not None:
        if "dur" in params:
            kw.setdefault("dur", float(cue["sure"]))
        else:
            print(f"  uyarı: cue #{idx} ({tip}) süre parametresi almıyor; 'sure' yok sayıldı", file=sys.stderr)
    kw.setdefault("seed", int(cue.get("seed", 1009 + 7919 * idx)))
    y = np.asarray(fn(**kw), dtype=np.float64)
    if cue.get("pan") is not None:
        y = sfx.pan(y, float(cue["pan"]))
    return y * sfx.db2lin(float(cue.get("db", 0.0)))


def _peak_offset(y):
    """Efektin 20 ms RMS zarfındaki tepe anı (sn)."""
    p = np.sum(y ** 2, axis=1)
    w = int(0.02 * SR)
    c = np.concatenate([[0.0], np.cumsum(p)])
    r = c[w:] - c[:-w]
    return (int(np.argmax(r)) + w // 2) / SR


def render_bus(cues, n):
    bus = np.zeros((n, 2))
    log = []
    for i, cue in enumerate(cues):
        y = render_cue(cue, i)
        start = float(cue["t"])
        if str(cue.get("hizala", "baslangic")).lower() in ("tepe", "peak"):
            start -= _peak_offset(y)
        pos = int(round(start * SR))
        if pos < 0:                       # video başından önce kalan kısım: yumuşak giriş
            y = sfx.fade(y[-pos:], 0.01, 0.0)
            pos = 0
        if pos >= n:
            print(f"  uyarı: cue #{i} ({cue['tip']}) video süresinin dışında, atlandı", file=sys.stderr)
            continue
        m = min(len(y), n - pos)
        bus[pos:pos + m] += y[:m]
        log.append((i, cue["tip"], pos / SR, len(y) / SR, sfx.peak_db(y)))
    return bus, log


# ---------------------------------------------------------------------------
# EQ, ducking
# ---------------------------------------------------------------------------
def _high_shelf(f0, gain_db, S=0.8):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    cw, sw = np.cos(w0), np.sin(w0)
    al = sw / 2 * np.sqrt((A + 1 / A) * (1 / S - 1) + 2)
    b0 = A * ((A + 1) + (A - 1) * cw + 2 * np.sqrt(A) * al)
    b1 = -2 * A * ((A - 1) + (A + 1) * cw)
    b2 = A * ((A + 1) + (A - 1) * cw - 2 * np.sqrt(A) * al)
    a0 = (A + 1) - (A - 1) * cw + 2 * np.sqrt(A) * al
    a1 = 2 * ((A - 1) - (A + 1) * cw)
    a2 = (A + 1) - (A - 1) * cw - 2 * np.sqrt(A) * al
    return np.array([[b0 / a0, b1 / a0, b2 / a0, 1.0, a1 / a0, a2 / a0]])


def bus_eq(x):
    """80 Hz altını kes (4. derece HPF + 25 Hz infrasonik), 10 kHz üstünü yumuşat (-4 dB raf, 16 kHz LPF)."""
    sos = np.vstack([
        signal.butter(2, 25, "highpass", fs=SR, output="sos"),
        signal.butter(4, 80, "highpass", fs=SR, output="sos"),     # 24 dB/oct
        _high_shelf(10000, -4.0),
        signal.butter(2, 16000, "lowpass", fs=SR, output="sos"),
    ])
    return signal.sosfilt(sos, x, axis=0)


def duck_gain(narr, depth_db=8.0, attack=0.08, release=0.40, lookahead=0.08, hold=0.12, cr=1000):
    """Anlatım zarfından yan zincir kazancı (dB, kontrol hızında) ve ses hızında doğrusal kazanç.

    Ses bandı (150 Hz-4 kHz) 30 ms RMS -> konuşma etkinliği 0..1 (yumuşak eşik, anlatımın
    kendi seviyesine göre uyarlanır) -> ileri bakış + tutma -> asimetrik tek kutuplu süzgeç.
    """
    n = narr.shape[0]
    v = sfx.bandpass(narr.mean(axis=1), 150, 4000, 2)
    hop = SR // cr
    w = int(0.03 * SR)
    c = np.concatenate([[0.0], np.cumsum(v * v)])
    centers = np.arange(0, n, hop)
    lo_i = np.clip(centers - w // 2, 0, n)
    hi_i = np.clip(centers + w // 2, 0, n)
    ms = (c[hi_i] - c[lo_i]) / np.maximum(hi_i - lo_i, 1)
    env_db = 10 * np.log10(ms + 1e-14)
    act = env_db[env_db > env_db.max() - 60]
    ref = np.percentile(act, 90) if len(act) else -20.0
    hi_t, lo_t = ref - 14.0, ref - 26.0
    key = sfx._smoothstep((env_db - lo_t) / (hi_t - lo_t))
    la = int(lookahead * cr)
    key = np.concatenate([key[la:], np.zeros(la)])
    h = max(1, int(hold * cr))
    key = np.lib.stride_tricks.sliding_window_view(np.concatenate([np.zeros(h - 1), key]), h).max(axis=1)
    target = -depth_db * key
    a_att = np.exp(-1.0 / (attack * cr))
    a_rel = np.exp(-1.0 / (release * cr))
    g = np.empty_like(target)
    s = 0.0
    for i, x in enumerate(target):
        a = a_att if x < s else a_rel
        s = a * s + (1 - a) * x
        g[i] = s
    t_ctrl = centers / SR
    lin = sfx.db2lin(np.interp(np.arange(n) / SR, t_ctrl, g))
    return lin, t_ctrl, g, key


# ---------------------------------------------------------------------------
# anlatım
# ---------------------------------------------------------------------------
def prepare_narration(path, offset, n, target_lufs=-16.0, tp_max=-1.5):
    x = load_audio(path)
    x = x - x.mean(axis=0)
    x = sfx.fade(x, 0.003, 0.01)
    L0 = sfx.integrated_lufs(x)
    y = x * sfx.db2lin(target_lufs - L0)
    gr = 0.0
    ceiling = tp_max - 0.3
    for _ in range(4):
        yl, gr = sfx.limiter(y, ceiling, lookahead=0.005, release_db_s=30.0)
        err = target_lufs - sfx.integrated_lufs(yl)
        if abs(err) < 0.05:
            break
        y = y * sfx.db2lin(err)
    out = np.zeros((n, 2))
    pos = int(round(offset * SR))
    m = max(0, min(len(yl), n - pos))
    out[pos:pos + m] = yl[:m]
    if pos + len(yl) > n:
        out = sfx.fade(out, 0.0, 0.05)
    return out, {"ham_lufs": L0, "sinirlayici_gr_db": gr, "uzunluk_s": len(x) / SR}


# ---------------------------------------------------------------------------
# ölçüm (ffmpeg)
# ---------------------------------------------------------------------------
def _num(s):
    return float("-inf") if s.strip() in ("-inf", "inf") else float(s)


def ffmpeg_olcum(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True)
    log = r.stderr
    out = {}
    summ = log[log.rfind("Summary:"):]
    m = re.search(r"I:\s+(-?[\d.]+|-inf)\s+LUFS", summ)
    out["I_lufs"] = _num(m.group(1)) if m else None
    m = re.search(r"LRA:\s+(-?[\d.]+)\s+LU", summ)
    out["LRA_lu"] = _num(m.group(1)) if m else None
    m = re.search(r"Peak:\s+(-?[\d.]+|-inf)\s+dBFS", summ)
    out["TP_dbtp"] = _num(m.group(1)) if m else None
    Ms = [_num(a) for a in re.findall(r"\sM:\s*(-?[\d.]+|-inf)\s", log)]
    Ss = [_num(a) for a in re.findall(r"\sS:\s*(-?[\d.]+|-inf)\s", log)]
    out["M_max_lufs"] = max(Ms) if Ms else None
    out["S_max_lufs"] = max(Ss) if Ss else None
    r2 = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af",
                         "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                        capture_output=True, text=True)
    t = r2.stderr
    j = t[t.rfind("{"):t.rfind("}") + 1]
    try:
        ln = json.loads(j)
        out["loudnorm"] = {k: ln[k] for k in ("input_i", "input_tp", "input_lra", "input_thresh")}
    except Exception:
        out["loudnorm"] = None
    return out


def m_guard(x, ceiling_lufs, iters=5):
    """Anlık yükseklik (M, 400 ms) tavanı: aşan bloklarda yumuşak kazanç sürücüsü (çevrimdışı)."""
    W, H = int(0.4 * SR), int(0.01 * SR)
    n = x.shape[0]
    total = np.zeros(n)
    for _ in range(iters):
        z, st = sfx._block_power(x, 0.4, 0.01)
        over = sfx._lk(z) - ceiling_lufs
        idx = np.nonzero(over > 0)[0]
        if len(idx) == 0:
            break
        a = np.zeros(n)
        for j in idx:
            a[st[j]:st[j] + W] = np.maximum(a[st[j]:st[j] + W], over[j] + 0.15)
        a = ndimage.uniform_filter1d(ndimage.uniform_filter1d(a, 4801), 4801)
        x = x * sfx.db2lin(-a)[:, None]
        total += a
    return x, float(total.max())


def peak_rider(x, ceiling_db, hold=0.15, smooth=0.15):
    """Yavaş, ileri bakışlı 'fader sürüşü': gerçek tepe tavanı aşılacak bölgeyi ~300 ms'lik
    yumuşak rampalarla kısar (dinamiği ezmez; olay bütünüyle biraz kısılır).
    Garanti: tutma yarıçapı >= yumuşatma desteğinin yarısı -> her örnekte kazanç <= gereken."""
    n = x.shape[0]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=0)).max(axis=1)[:4 * n].reshape(n, 4).max(axis=1)
    pk = np.maximum(np.abs(x).max(axis=1), up)
    att = np.maximum(0.0, sfx.lin2db(pk) - ceiling_db)
    if att.max() <= 0:
        return x, 0.0, 0.0
    H = int(hold * SR)
    a = ndimage.maximum_filter1d(att, size=2 * H + 1)
    w = int(smooth * SR) | 1
    a = ndimage.uniform_filter1d(ndimage.uniform_filter1d(a, w), w)
    return x * sfx.db2lin(-a)[:, None], float(a.max()), float(np.mean(a > 0.5))


def sfx_safety(x, a):
    """M tavanı sürücüsü -> yavaş gerçek-tepe sürüşü -> hızlı gerçek-tepe sınırlayıcı."""
    x, m_gr = m_guard(x, a.sfx_m_tavan)
    x, ride_gr, ride_frac = peak_rider(x, a.sfx_tp - 0.4)
    y, lim_gr = sfx.limiter(x, a.sfx_tp - 0.3, lookahead=0.006, release_db_s=25.0)
    gr_db = sfx.lin2db(np.maximum(np.abs(x).max(axis=1), 1e-9) / np.maximum(np.abs(y).max(axis=1), 1e-9))
    return y, m_gr, ride_gr, ride_frac, lim_gr, float(np.mean(gr_db > 1.0))


def ic_olcum(x):
    return {"I_lufs": sfx.integrated_lufs(x), "M_max_lufs": sfx.momentary_max(x, 0.1),
            "S_max_lufs": sfx.shortterm_max(x), "TP_dbtp": sfx.true_peak_db(x), "peak_dbfs": sfx.peak_db(x)}


# ---------------------------------------------------------------------------
def main(argv=None):
    ap = argparse.ArgumentParser(description="SFX cue listesini anlatımın altına miksler.")
    ap.add_argument("cues")
    ap.add_argument("out")
    ap.add_argument("--video-dur", type=float, default=34.0)
    ap.add_argument("--anlatim", default=VARSAYILAN_ANLATIM, help="anlatım ses dosyası")
    ap.add_argument("--anlatim-ofset", type=float, default=0.30)
    ap.add_argument("--ses-lufs", type=float, default=-16.0)
    ap.add_argument("--ses-tp", type=float, default=-1.5)
    ap.add_argument("--duck-db", type=float, default=8.0)
    ap.add_argument("--duck-atak", type=float, default=0.08)
    ap.add_argument("--duck-birak", type=float, default=0.40)
    ap.add_argument("--sfx-lufs", type=float, default=None,
                    help="SFX stem'i bu entegre seviyeye zorla (varsayılan: yalnız [-36,-32] dışındaysa -34)")
    ap.add_argument("--sfx-aralik", type=float, nargs=2, default=(-36.0, -32.0))
    ap.add_argument("--sfx-m-tavan", type=float, default=-24.0,
                    help="SFX anlık yükseklik (M, 400 ms) tavanı, LUFS")
    ap.add_argument("--sfx-tp", type=float, default=-24.0,
                    help="SFX gerçek tepe sınırlayıcı tavanı (dBTP); yalnız yükseklik tavanı isteniyorsa ör. -18")
    ap.add_argument("--teshis", help="duck eğrisi vb. için .npz yolu")
    ap.add_argument("--rapor", help="ölçümleri JSON olarak yaz")
    a = ap.parse_args(argv)

    n = int(round(a.video_dur * SR))
    with open(a.cues, encoding="utf-8") as fh:
        cues = json.load(fh)
    if isinstance(cues, dict):
        cues = cues.get("cues", [])

    print(f"[1/5] {len(cues)} cue render ediliyor ...")
    bus, log = render_bus(cues, n)
    for i, tip, t0, d, pk in log:
        print(f"   #{i:02d} {tip:14s} t={t0:6.2f}s  uzunluk={d:5.2f}s  tepe={pk:6.1f} dBFS")

    print("[2/5] anlatım hazırlanıyor ...")
    narr, ninfo = prepare_narration(a.anlatim, a.anlatim_ofset, n, a.ses_lufs, a.ses_tp)

    print("[3/5] EQ + ducking ...")
    bus = bus_eq(bus)
    gain, t_ctrl, g_db, key = duck_gain(narr, a.duck_db, a.duck_atak, a.duck_birak)
    sfx_bus = bus * gain[:, None]

    print("[4/5] SFX seviye güvenliği ...")
    ducked = sfx_bus
    I0 = sfx.integrated_lufs(ducked)
    lo, hi = a.sfx_aralik
    trim = 0.0
    if np.isfinite(I0) and a.sfx_lufs is not None:
        trim = a.sfx_lufs - I0
    for _ in range(5):          # tüm güvenlik zinciri sonrası entegre seviye aralıkta kalsın
        sfx_bus, m_gr, ride_gr, ride_frac, sfx_gr, gr_frac = sfx_safety(ducked * sfx.db2lin(trim), a)
        I1 = sfx.integrated_lufs(sfx_bus)
        if not np.isfinite(I1):
            break
        if a.sfx_lufs is not None:
            err = a.sfx_lufs - I1
            if abs(err) < 0.2:
                break
        elif lo <= I1 <= hi:
            break
        else:
            err = 0.5 * (lo + hi) - I1                 # aralık dışı: ortaya çek
        trim += err
    sfx_bus = sfx.fade(sfx_bus, 0.0, 0.05)

    print("[5/5] final miks + yazma ...")
    mix = narr + sfx_bus
    mix, mix_gr = sfx.limiter(mix, a.ses_tp - 0.1, lookahead=0.005, release_db_s=30.0)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    stem = os.path.splitext(a.out)[0] + "_sfx.wav"
    write_wav24(a.out, mix, 1)
    write_wav24(stem, sfx_bus, 2)
    tmp_voice = os.path.join(os.path.dirname(os.path.abspath(a.out)), ".anlatim_olcum_tmp.wav")
    write_wav24(tmp_voice, narr, 3)
    if a.teshis:
        np.savez_compressed(a.teshis, t_ctrl=t_ctrl, duck_db=g_db, key=key)

    rapor = {
        "ayarlar": {"video_dur": a.video_dur, "anlatim_ofset": a.anlatim_ofset, "duck_db": a.duck_db,
                    "duck_atak": a.duck_atak, "duck_birak": a.duck_birak,
                    "sfx_m_tavan": a.sfx_m_tavan, "sfx_tp": a.sfx_tp},
        "anlatim_bilgi": ninfo,
        "sfx_trim_db": trim, "sfx_onceki_I": I0, "sfx_m_guard_gr_db": m_gr,
        "sfx_tepe_surusu_gr_db": ride_gr, "sfx_tepe_surusu_zaman_orani": ride_frac,
        "sfx_sinirlayici_gr_db": sfx_gr,
        "sfx_sinirlayici_1dB_ustu_zaman_orani": gr_frac,
        "final_sinirlayici_gr_db": mix_gr,
        "ffmpeg": {"anlatim": ffmpeg_olcum(tmp_voice), "sfx": ffmpeg_olcum(stem), "final": ffmpeg_olcum(a.out)},
        "ic": {"anlatim": ic_olcum(narr), "sfx": ic_olcum(sfx_bus), "final": ic_olcum(mix)},
    }
    os.remove(tmp_voice)
    # konuşma sırasında ses/SFX farkı (400 ms M eğrileri)
    tv, lv = sfx.loudness_curve(narr)
    _, ls = sfx.loudness_curve(sfx_bus)
    sp = lv > a.ses_lufs - 10          # konuşmanın dolu olduğu 400 ms bloklar
    if sp.any():
        dd = lv[sp] - ls[sp]
        rapor["konusma_sirasinda_ses_eksi_sfx_LU"] = {"min": float(dd.min()), "p5": float(np.percentile(dd, 5)),
                                                    "medyan": float(np.median(dd))}
    gap = (lv < -45) & (tv < a.anlatim_ofset + ninfo["uzunluk_s"])
    rapor["konusma_bosluklarinda_sfx_M_max"] = float(ls[gap].max()) if gap.any() else None

    F = rapor["ffmpeg"]
    print("\n=== Ölçümler (ffmpeg ebur128 peak=true; M/S maks. 100 ms adımlı kayıttan) ===")
    for k, lab in (("anlatim", "Anlatım (yalnız)"), ("sfx", "SFX stem"), ("final", "Final miks")):
        f = F[k]
        print(f"  {lab:17s} I = {f['I_lufs']:6.1f} LUFS   TP = {f['TP_dbtp']:6.1f} dBTP   "
              f"M maks = {f['M_max_lufs']:6.1f}   S maks = {f['S_max_lufs']:6.1f}   LRA = {f['LRA_lu']:4.1f} LU")
    for k in ("anlatim", "sfx", "final"):
        print(f"  loudnorm[{k}]: {json.dumps(F[k]['loudnorm'])}")
    print(f"  Ses - SFX (entegre): {F['anlatim']['I_lufs'] - F['sfx']['I_lufs']:.1f} LU")
    if "konusma_sirasinda_ses_eksi_sfx_LU" in rapor:
        k = rapor["konusma_sirasinda_ses_eksi_sfx_LU"]
        print(f"  Konuşma sırasında ses - SFX (M, ses > {a.ses_lufs - 10:.0f} LUFS blokları): en az {k['min']:.1f} LU, "
              f"%5 {k['p5']:.1f} LU, medyan {k['medyan']:.1f} LU")
    if rapor["konusma_bosluklarinda_sfx_M_max"] is not None:
        print(f"  Konuşma boşluklarında (ses M < -45) SFX M maks: {rapor['konusma_bosluklarinda_sfx_M_max']:.1f} LUFS")
    I_ic = rapor["ic"]
    print(f"  İç ölçüm (BS.1770): anlatım I {I_ic['anlatim']['I_lufs']:.1f}, SFX I {I_ic['sfx']['I_lufs']:.1f} / "
          f"M maks {I_ic['sfx']['M_max_lufs']:.1f} / TP {I_ic['sfx']['TP_dbtp']:.1f}, final I {I_ic['final']['I_lufs']:.1f} "
          f"/ TP {I_ic['final']['TP_dbtp']:.1f}")
    print(f"  SFX M-tavan sürücüsü en çok {m_gr:.2f} dB; yavaş tepe sürüşü en çok {ride_gr:.2f} dB "
          f"(zamanın %{100 * ride_frac:.1f}'inde > 0.5 dB); hızlı TP sınırlayıcı en çok {sfx_gr:.2f} dB "
          f"(zamanın %{100 * gr_frac:.2f}'inde > 1 dB)")
    print(f"  SFX trim: {trim:+.2f} dB (önce I = {I0:.1f} LUFS), SFX TP sınırlayıcı en çok {sfx_gr:.2f} dB, "
          f"final sınırlayıcı en çok {mix_gr:.2f} dB, anlatım sınırlayıcı en çok {ninfo['sinirlayici_gr_db']:.2f} dB")
    print(f"  Yazıldı: {a.out}\n           {stem}")
    if a.rapor:
        with open(a.rapor, "w", encoding="utf-8") as fh:
            json.dump(rapor, fh, indent=1, ensure_ascii=False, default=float)
    return rapor


if __name__ == "__main__":
    main()
