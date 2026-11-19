# -*- coding: utf-8 -*-
"""Ses miksi: anlatıcı baskın (dokunulmaz), görüntüye senkron kısık efektler, müzik yok."""
import os, subprocess, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SFX = os.path.join(HERE, '..', 'sfx')
SR = 48000
END = 43.0
GAIN_ALL = 7.0  # bütün efektlere ortak kazanç (dB)

# (zaman sn, dosya, kazanç dB)
CUES = [
    # S1 — dünya / han
    (0.00, 'pencil_long', -33), (0.12, 'pencil_hatch_a', -36), (0.22, 'brush_wet_a', -33), (0.62, 'brush_wet_b', -38),
    (0.76, 'stone_set_a', -35), (1.06, 'pop_soft_a', -40), (1.19, 'pop_soft_b', -40),
    (1.27, 'pop_soft_c', -43), (1.41, 'pop_soft_a', -43), (1.55, 'pop_soft_b', -43), (1.69, 'pop_soft_c', -43),
    (1.72, 'whoosh_long', -37),
    # S2 — yolcu, kum saati
    (2.22, 'footsteps_soft', -35), (3.08, 'pop_soft_c', -35), (3.36, 'whoosh_soft_a', -39), (3.80, 'sand_trickle', -37),
    # S3 — vazife pulları, kapı ışığı
    (4.50, 'pop_soft_a', -37), (4.615, 'pop_soft_b', -37), (4.73, 'pop_soft_c', -37), (4.845, 'pop_soft_a', -37),
    (4.96, 'pop_soft_b', -37), (5.075, 'pop_soft_c', -37), (5.19, 'pop_soft_a', -37), (5.34, 'chime_light', -38),
    # S4 — yol, ömür, nur
    (6.60, 'brush_wet_a', -35), (6.95, 'brush_wet_b', -39), (7.00, 'pop_soft_b', -40), (7.42, 'pop_soft_b', -40),
    (8.16, 'chime_light', -33),
    # S5 — erzak, heybe
    (9.04, 'brush_wet_a', -37), (9.18, 'pop_soft_c', -40),
    (9.32, 'pop_soft_a', -41), (9.80, 'bag_thump_a', -35), (9.78, 'pop_soft_b', -41), (10.26, 'bag_thump_b', -35),
    (10.22, 'pop_soft_c', -41), (10.70, 'bag_thump_a', -35), (10.68, 'pop_soft_a', -41), (11.16, 'bag_thump_b', -35),
    (11.40, 'whoosh_soft_b', -39), (11.98, 'footsteps_soft', -38),
    # S6 — öncelik
    (12.28, 'whoosh_long', -37), (12.50, 'pop_soft_a', -40), (12.60, 'pop_soft_b', -40), (12.70, 'pop_soft_c', -40),
    (12.80, 'pop_soft_a', -40), (12.90, 'pop_soft_b', -40), (13.48, 'coin_glint', -36), (13.62, 'whoosh_soft_a', -40),
    (14.38, 'coin_glint', -36), (14.52, 'whoosh_soft_b', -40), (15.08, 'pencil_stroke_a', -37),
    # S7 — kalabalık
    (16.90, 'brush_wet_b', -35), (17.00, 'pencil_hatch_b', -38), (17.76, 'brush_wet_a', -38), (17.90, 'water_bloom', -40),
    (19.10, 'whoosh_long', -35),
    # S8 — fanilik, saray, göz
    (19.58, 'paper_rustle', -37), (19.70, 'sand_trickle', -40), (20.60, 'stone_set_b', -35), (20.78, 'stone_set_a', -40),
    (21.40, 'whoosh_long', -38), (21.56, 'pencil_long', -38),
    # S9 — tül perde
    (23.04, 'cloth_curtain', -33),
    # S10 — altın küre, nakış, çerçeve
    (24.72, 'water_bloom', -37), (25.10, 'coin_glint', -39), (25.80, 'pencil_hatch_a', -39), (25.95, 'coin_glint', -41),
    (26.35, 'pencil_hatch_b', -40), (26.85, 'coin_glint', -41), (27.18, 'pencil_long', -38),
    # S11 — sütunlar, kemer
    (28.86, 'brush_wet_b', -35), (29.82, 'stone_set_a', -33), (29.94, 'chime_light', -38), (30.88, 'stone_set_b', -33),
    (31.96, 'pencil_hatch_a', -39),
    (32.92, 'stone_set_a', -42), (32.98, 'stone_set_b', -42), (33.04, 'stone_set_a', -42), (33.10, 'stone_set_b', -42),
    (33.16, 'stone_set_a', -42), (33.22, 'stone_set_b', -42), (33.28, 'stone_set_a', -42), (33.34, 'stone_set_b', -42),
    (33.42, 'stone_set_a', -35),
    # S12 — seccade, hisse
    (33.80, 'paper_rustle', -40), (34.48, 'pencil_long', -40), (35.42, 'brush_wet_a', -37),
    # S13 — kaynak
    (36.14, 'brush_wet_b', -35), (36.55, 'book_set', -36), (37.06, 'paper_rustle', -44),
]


def read_wav(p):
    with wave.open(p) as w:
        sr, n, ch, sw = w.getframerate(), w.getnframes(), w.getnchannels(), w.getsampwidth()
        b = w.readframes(n)
    if sw == 3:
        a = np.frombuffer(b, np.uint8).reshape(-1, 3)
        x = (a[:, 0].astype(np.int32) | (a[:, 1].astype(np.int32) << 8) | (a[:, 2].astype(np.int32) << 16))
        x = np.where(x >= 1 << 23, x - (1 << 24), x).astype(np.float32) / (1 << 23)
    elif sw == 2:
        x = np.frombuffer(b, np.int16).astype(np.float32) / 32768.0
    else:
        x = np.frombuffer(b, np.int32).astype(np.float32) / 2 ** 31
    x = x.reshape(-1, ch)
    if ch == 1:
        x = np.repeat(x, 2, 1)
    assert sr == SR, (p, sr)
    return x


def build(out_wav):
    n = int(END * SR)
    bus = np.zeros((n, 2), np.float32)
    rng = np.random.default_rng(3)
    for t, name, db in CUES:
        x = read_wav(os.path.join(SFX, name + '.wav'))
        g = 10 ** ((db + GAIN_ALL) / 20)
        # hafif stereo konum (merkez çevresinde)
        pan = rng.uniform(-0.25, 0.25)
        lr = np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)], np.float32) * 1.4142
        i0 = int(t * SR)
        i1 = min(n, i0 + len(x))
        bus[i0:i1] += x[:i1 - i0] * g * lr[None, :]
    # çok kısık oda tonu (dijital sessizlik olmasın)
    rt = read_wav(os.path.join(SFX, 'room_tone.wav'))
    reps = int(np.ceil(n / len(rt))) + 1
    tone = np.tile(rt, (reps, 1))[:n] * 10 ** (-54 / 20)
    bus += tone
    # anlatıcı
    tmp = os.path.join(HERE, 'out', 'voice48.wav')
    tmp = tmp.replace('.wav', '.f32')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', os.path.join(HERE, '..', 'audio', 'src.mp3'),
                    '-af', 'highpass=f=60', '-ar', str(SR), '-ac', '2', '-f', 'f32le', tmp], check=True)
    v = np.fromfile(tmp, dtype=np.float32).reshape(-1, 2)
    voice = np.zeros((n, 2), np.float32)
    m = min(n, len(v))
    voice[:m] = v[:m]
    mixed = voice + bus
    pk = np.abs(mixed).max()
    if pk > 0.98:
        mixed *= 0.98 / pk
    # 24-bit wav yaz
    x = np.clip(mixed, -1, 1)
    xi = (x * (2 ** 23 - 1)).astype(np.int32)
    b = np.zeros((xi.size, 3), np.uint8)
    flat = xi.reshape(-1)
    b[:, 0] = flat & 0xFF
    b[:, 1] = (flat >> 8) & 0xFF
    b[:, 2] = (flat >> 16) & 0xFF
    with wave.open(out_wav, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(b.tobytes())
    sb = 20 * np.log10(np.sqrt((bus ** 2).mean()) + 1e-9)
    sv = 20 * np.log10(np.sqrt((voice[:int(36.4 * SR)] ** 2).mean()) + 1e-9)
    print(f'efekt RMS {sb:.1f} dBFS, ses RMS {sv:.1f} dBFS, fark {sv - sb:.1f} dB, tepe {pk:.3f}')


if __name__ == '__main__':
    build(os.path.join(HERE, 'out', 'mix.wav'))
