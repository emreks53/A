#!/usr/bin/env python3
"""Ses efektlerini yordamsal olarak sentezler ve okuyucunun sesiyle karıştırır (müzik yok).
Efektler kısıktır: tepe ~ -26 dBFS; konuşma sürerken ayrıca 4 dB kısılır (yan zincir). Çıktı 48 kHz stereo WAV.
Kullanım: python3 sentez.py veri/sesler.json veri/ses.mp3 cikti/ses-miks.wav [toplam_sure]"""
import json, sys, subprocess, numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(20)

def zarf(n, atak, birak, egri=3.0):
    t = np.arange(n) / SR
    a = np.clip(t / max(atak, 1e-4), 0, 1)
    d = np.exp(-egri * np.clip(t - atak, 0, None) / max(birak, 1e-4))
    return a * d

def bant(x, f1, f2, sira=2):
    b, a = signal.butter(sira, [f1 / (SR / 2), min(f2 / (SR / 2), 0.99)], 'band')
    return signal.lfilter(b, a, x)

def alcak(x, f, sira=2):
    b, a = signal.butter(sira, f / (SR / 2), 'low')
    return signal.lfilter(b, a, x)

def yuksek(x, f, sira=2):
    b, a = signal.butter(sira, f / (SR / 2), 'high')
    return signal.lfilter(b, a, x)

def norm(x):
    m = np.max(np.abs(x)) + 1e-9
    return x / m

def kalem(sure=0.6, **k):
    n = int(SR * sure)
    x = bant(rng.standard_normal(n), 1800, 6500)
    t = np.arange(n) / SR
    darbe = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * rng.uniform(7, 10) * t + rng.uniform(0, 6)))
    tane = alcak(np.abs(rng.standard_normal(n)), 60)
    env = np.minimum(1, t / 0.05) * np.minimum(1, (sure - t) / 0.12)
    return norm(x * darbe * (0.6 + tane) * env) * 0.8

def firca(sure=0.45, **k):
    n = int(SR * sure)
    x = bant(rng.standard_normal(n), 400, 3000)
    t = np.arange(n) / SR
    env = np.sin(np.pi * t / sure) ** 2
    return norm(x * env) * 0.7

def pop(**k):
    n = int(SR * 0.12)
    t = np.arange(n) / SR
    f0 = rng.uniform(520, 820)
    f = f0 * (1 + 1.2 * np.exp(-t / 0.012))
    faz = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(faz) * zarf(n, 0.002, 0.04)
    return norm(x) * 0.8

def whoosh(sure=1.0, **k):
    n = int(SR * sure)
    x = rng.standard_normal(n)
    t = np.arange(n) / SR
    out = np.zeros(n)
    # zamanla kayan bant geçiren (bloklar hâlinde)
    blok = 1024
    for i in range(0, n, blok):
        u = i / n
        fc = 250 + 1300 * np.sin(np.pi * u) ** 1.5
        seg = x[i:i + blok]
        out[i:i + blok] = bant(seg, fc * 0.6, fc * 1.6)
    out = alcak(out, 4000)
    env = np.sin(np.pi * np.clip(t / sure, 0, 1)) ** 2
    return norm(out * env) * 0.7

def nur(sure=2.2, **k):
    n = int(SR * (sure + 1.5))
    t = np.arange(n) / SR
    x = np.zeros(n)
    taban = 392.0 * rng.choice([1.0, 1.122, 1.335])  # Sol / La / Do
    for i, (h, a) in enumerate([(1, 1.0), (1.5, 0.5), (2, 0.55), (3, 0.25), (4, 0.18), (5.04, 0.08)]):
        for det in (-0.6, 0.6):
            x += a * np.sin(2 * np.pi * (taban * h + det) * t + rng.uniform(0, 6))
    env = np.clip(t / 0.35, 0, 1) * np.exp(-np.clip(t - 0.35, 0, None) / (sure * 0.55))
    parilti = np.zeros(n)
    for j in range(10):
        s0 = int(SR * rng.uniform(0.1, sure))
        m = int(SR * 0.25)
        if s0 + m < n:
            tt = np.arange(m) / SR
            parilti[s0:s0 + m] += np.sin(2 * np.pi * rng.uniform(2500, 4800) * tt) * np.exp(-tt / 0.06) * 0.25
    return norm(x * env + parilti * env) * 0.75

def parilti(**k):
    n = int(SR * 0.9)
    x = np.zeros(n)
    for j in range(7):
        s0 = int(SR * rng.uniform(0, 0.55))
        m = int(SR * 0.3)
        tt = np.arange(m) / SR
        x[s0:s0 + m] += np.sin(2 * np.pi * rng.uniform(2200, 5200) * tt) * np.exp(-tt / 0.05) * rng.uniform(0.4, 1)
    return norm(x) * 0.6

def kanat(sure=0.5, **k):
    n = int(SR * sure)
    t = np.arange(n) / SR
    x = bant(rng.standard_normal(n), 300, 2500)
    am = np.clip(np.sin(2 * np.pi * 13 * t), 0, 1) ** 2
    env = np.sin(np.pi * t / sure)
    return norm(x * am * env) * 0.6

def damla(**k):
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    f = 900 + 1700 * (1 - np.exp(-t / 0.02))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * zarf(n, 0.001, 0.07)
    return norm(x) * 0.7

def ruzgar(sure=2.5, **k):
    n = int(SR * sure)
    t = np.arange(n) / SR
    x = alcak(rng.standard_normal(n), 700)
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t + rng.uniform(0, 6))
    env = np.sin(np.pi * t / sure) ** 1.2
    return norm(x * lfo * env) * 0.7

def gok(sure=2.8, **k):
    n = int(SR * sure)
    t = np.arange(n) / SR
    x = alcak(rng.standard_normal(n), 110, 3)
    env = np.clip(t / 0.4, 0, 1) * np.exp(-np.clip(t - 0.4, 0, None) / (sure * 0.4))
    return norm(x * env) * 0.8

def yagmur(sure=2.5, **k):
    n = int(SR * sure)
    t = np.arange(n) / SR
    x = yuksek(rng.standard_normal(n), 2500) * 0.25
    tik = (rng.random(n) < 0.0025) * rng.uniform(0.3, 1, n)
    tik = bant(tik, 2000, 7000)
    env = np.minimum(1, t / 0.5) * np.minimum(1, (sure - t) / 0.6)
    return norm((x + tik * 3) * env) * 0.6

def kalp(**k):
    n = int(SR * 0.9)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for s0, a in ((0.0, 1.0), (0.22, 0.7)):
        tt = t - s0
        m = tt >= 0
        x[m] += a * np.sin(2 * np.pi * 52 * tt[m]) * np.exp(-tt[m] / 0.07)
    return norm(x) * 0.9

def zincir(**k):
    n = int(SR * 0.6)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for j in range(4):
        s0 = rng.uniform(0, 0.25); tt = t - s0; m = tt >= 0
        for f in (2350, 3810, 5200):
            x[m] += np.sin(2 * np.pi * f * rng.uniform(0.95, 1.05) * tt[m]) * np.exp(-tt[m] / 0.05) * 0.3
    return norm(x) * 0.5

def toz(sure=1.3, **k):
    n = int(SR * sure)
    t = np.arange(n) / SR
    x = bant(rng.standard_normal(n), 1500, 8000) * (rng.random(n) < 0.08)
    x += bant(rng.standard_normal(n), 200, 1500) * 0.15
    env = np.clip(t / 0.15, 0, 1) * np.exp(-t / (sure * 0.5))
    return norm(x * env) * 0.6

def adim(**k):
    n = int(SR * 0.18)
    t = np.arange(n) / SR
    x = alcak(rng.standard_normal(n), 400) * zarf(n, 0.004, 0.04)
    return norm(x) * 0.6

def kapi(**k):
    n = int(SR * 1.0)
    t = np.arange(n) / SR
    f = 140 + 60 * np.sin(2 * np.pi * 0.8 * t)
    x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * t))
    x = bant(x, 400, 2500)
    env = np.sin(np.pi * t / 1.0)
    return norm(x * env) * 0.35

def kus(**k):
    n = int(SR * 0.6)
    x = np.zeros(n)
    for s0 in (0.0, 0.16, 0.3):
        m = int(SR * 0.08); i0 = int(SR * s0)
        tt = np.arange(m) / SR
        f = 3200 + 2200 * (tt / 0.08)
        x[i0:i0 + m] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.08)
    return norm(x) * 0.5

def para(**k):
    n = int(SR * 0.7)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for j in range(5):
        s0 = rng.uniform(0, 0.35); tt = t - s0; m = tt >= 0
        for f in (3100, 4700, 6900):
            x[m] += np.sin(2 * np.pi * f * rng.uniform(0.97, 1.03) * tt[m]) * np.exp(-tt[m] / 0.09) * 0.25
    return norm(x) * 0.5

TURLER = dict(kalem=kalem, firca=firca, pop=pop, whoosh=whoosh, nur=nur, parilti=parilti, kanat=kanat, damla=damla,
              ruzgar=ruzgar, gok=gok, yagmur=yagmur, kalp=kalp, zincir=zincir, toz=toz, adim=adim, kapi=kapi, kus=kus, para=para)

def main():
    ipuclari = json.load(open(sys.argv[1]))
    ses_yolu, cikti = sys.argv[2], sys.argv[3]
    toplam = float(sys.argv[4]) if len(sys.argv) > 4 else 117.0
    ham = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', ses_yolu, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    konusma = np.frombuffer(ham, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    N = int(SR * toplam)
    kon = np.zeros((N, 2)); kon[:min(N, len(konusma))] = konusma[:N]
    efekt = np.zeros((N, 2))
    for ip in ipuclari:
        tur = ip.get('tur')
        f = TURLER.get(tur)
        if not f:
            print('bilinmeyen ses türü:', tur); continue
        tekrar = int(ip.get('tekrar', 1)); ara = float(ip.get('ara', 0.1))
        for r in range(tekrar):
            x = f(sure=float(ip.get('sure', 0) or {'kalem': 0.6, 'whoosh': 1.0, 'nur': 2.2, 'ruzgar': 2.5, 'gok': 2.8, 'yagmur': 2.5, 'toz': 1.3, 'firca': 0.45, 'kanat': 0.5}.get(tur, 0.5)))
            g = float(ip.get('guc', 0.4)) * (0.85 ** r if tekrar > 1 else 1)
            i0 = int(SR * (float(ip['t']) + r * ara))
            if i0 >= N or i0 < 0:
                continue
            m = min(len(x), N - i0)
            pan = rng.uniform(-0.25, 0.25)
            efekt[i0:i0 + m, 0] += x[:m] * g * (1 - pan)
            efekt[i0:i0 + m, 1] += x[:m] * g * (1 + pan)
    # yumuşak oda yankısı (kısa, dağınık)
    ir_n = int(SR * 0.9)
    ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR / 0.22)
    ir = alcak(ir, 5000); ir /= np.sqrt(np.sum(ir ** 2))
    for c in range(2):
        efekt[:, c] = efekt[:, c] * 0.82 + signal.fftconvolve(efekt[:, c], ir)[:N] * 0.18
    # efekt seviyesi: tepe -26 dBFS civarı; konuşma varken 4 dB daha kısık (yan zincir)
    efekt *= 10 ** (-26 / 20) / (np.max(np.abs(efekt)) + 1e-9) * 1.0
    kenv = alcak(np.abs(kon).mean(axis=1), 6)
    kenv = kenv / (np.max(kenv) + 1e-9)
    kis = 10 ** (-4 * np.clip(kenv * 6, 0, 1) / 20)
    efekt *= kis[:, None]
    # konuşma: hafif seviye düzeltme (tepe -1 dBFS)
    kon *= 10 ** (-1 / 20) / (np.max(np.abs(kon)) + 1e-9)
    miks = kon + efekt
    miks /= max(1.0, np.max(np.abs(miks)) / 0.98)
    pcm = (np.clip(miks, -1, 1) * 32767).astype(np.int16)
    import wave
    with wave.open(cikti, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('yazıldı:', cikti, f'{len(ipuclari)} ipucu')

if __name__ == '__main__':
    main()
