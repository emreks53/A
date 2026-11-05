"""Sound-design cue sheet: (time, generator, gain dB, kwargs, pan). Quiet by design."""


def cues(shots):
    C = []
    # transitions
    for s in shots:
        tr = s.get('trans')
        if not tr:
            continue
        t = s['start']
        d = tr['dur']
        k = tr['type']
        if k == 'zoom':
            C.append((t - 0.45, 'whoosh', -27, dict(dur=0.75, f0=250, f1=2600, peak_at=0.6), 0.0))
        elif k == 'blur':
            C.append((t - 0.35, 'whoosh', -36, dict(dur=0.55, f0=400, f1=1800, peak_at=0.65), 0.0))
        elif k == 'dissolve':
            C.append((t - 0.4, 'whoosh', -38, dict(dur=0.7, f0=300, f1=1200, peak_at=0.6), 0.0))
        elif k == 'flash':
            C.append((t - 0.9, 'swell', -27, dict(dur=1.0), 0.0))
        elif k == 'iris':
            C.append((t - 0.45, 'whoosh', -27, dict(dur=0.8, f0=1200, f1=300, peak_at=0.5), 0.0))
            C.append((t + 0.05, 'pop', -30, dict(f=2600), 0.0))
        elif k == 'ripple':
            C.append((t - 0.1, 'drop', -24, {}, 0.0))
        elif k == 'smoke':
            C.append((t - 0.5, 'wind', -26, dict(dur=1.6), 0.0))
        elif k == 'splash':
            C.append((t - 0.08, 'splash', -24, dict(dur=1.0), 0.0))
    C += [
        # A
        (0.0, 'wind', -40, dict(dur=11.8), 0.0),
        (0.28, 'sparkle', -29, dict(dur=1.6, n_notes=8, seed=1), 0.0),
        (3.0, 'rain', -33, dict(dur=1.9, density=80), 0.0),
        (6.6, 'bird', -31, dict(dur=1.7, seed=3), 0.3),
        (8.30, 'rumble_wave', -24, dict(dur=2.0), 0.0),
        (8.34, 'boom', -30, dict(dur=2.0), 0.0),
        (10.08, 'chime', -31, dict(base=1567.98, decay=1.2), 0.0),
        # B
        (11.75, 'ticks', -33, dict(dur=6.9, rate=6.0), 0.0),
        (14.18, 'pop', -33, dict(f=1900), -0.4), (14.40, 'pop', -33, dict(f=2100), -0.2),
        (14.66, 'pop', -33, dict(f=2300), 0.3), (14.90, 'pop', -33, dict(f=2500), 0.1),
        (16.60, 'chime', -34, dict(base=2093, decay=3.0), 0.0), (17.20, 'chime', -34, dict(base=2349.3, decay=3.0), 0.0),
        (21.20, 'sparkle', -34, dict(dur=2.0, n_notes=6, seed=5), 0.0),
        (23.78, 'chime', -30, dict(base=1046.5, decay=1.0), 0.0),
        (24.42, 'sparkle', -32, dict(dur=1.6, n_notes=9, seed=6), 0.0),
        # C
        (26.13, 'splash', -29, dict(dur=1.2), 0.0),
        (29.02, 'sparkle', -30, dict(dur=1.8, n_notes=12, seed=7), 0.0),
        (30.95, 'wind', -37, dict(dur=3.7), 0.0),
        (34.6, 'wind', -34, dict(dur=2.1), 0.2),
        (35.30, 'drop', -35, {}, 0.0), (36.60, 'drop', -35, {}, 0.0), (37.73, 'drop', -33, {}, 0.0), (38.59, 'drop', -35, {}, 0.0),
        # D
        (40.98, 'sparkle', -28, dict(dur=1.9, n_notes=14, seed=8), 0.0),
        (40.9, 'swell', -32, dict(dur=1.5), 0.0),
        (42.90, 'chime', -28, dict(base=1318.5, decay=0.8), 0.0),
        (46.85, 'pop', -31, dict(f=1500), 0.0),
        (47.70, 'sparkle', -34, dict(dur=1.4, n_notes=6, seed=9), 0.0),
        # E
        (49.4, 'buzz', -38, dict(dur=5.7), 0.0),
        (52.49, 'sparkle', -34, dict(dur=1.8, n_notes=10, seed=10), 0.0),
        (55.1, 'wind', -42, dict(dur=1.8), 0.0),
        (57.43, 'pop', -32, dict(f=1700), -0.3), (58.29, 'pop', -32, dict(f=1900), -0.1),
        (59.21, 'pop', -32, dict(f=2100), 0.1), (60.09, 'pop', -32, dict(f=2300), 0.3),
        (57.0, 'drop', -34, {}, 0.0),
        (59.15, 'ticks', -34, dict(dur=0.9, rate=8.0, pitch=3200), 0.0),
        (60.10, 'chime', -30, dict(base=1567.98, decay=1.0), 0.0),
        # F
        (63.19, 'pop', -33, dict(f=3000), 0.0), (65.39, 'pop', -33, dict(f=3000), 0.0),
        (66.89, 'pop', -33, dict(f=3000), 0.0), (68.45, 'pop', -33, dict(f=3000), 0.0),
        (66.8, 'buzz', -42, dict(dur=1.6, voices=3), 0.0),
        (70.0, 'wind', -39, dict(dur=3.6), 0.0),
        (73.55, 'rumble_wave', -32, dict(dur=2.4), 0.0),
        (75.9, 'wind', -36, dict(dur=2.5), 0.0),
        # G (hearing: slightly more present nature sound)
        (78.5, 'bird', -26, dict(dur=2.6, seed=11), -0.2),
        (81.15, 'drop', -26, {}, 0.0),
        (82.75, 'rain', -30, dict(dur=2.9, density=50, bright=0.7), 0.0),
        (85.6, 'stream', -31, dict(dur=1.6), 0.0),
        (87.1, 'wind', -40, dict(dur=5.3), 0.0),
        (87.55, 'pop', -32, dict(f=1800), -0.3), (88.81, 'pop', -32, dict(f=2000), 0.0), (90.17, 'pop', -32, dict(f=2200), 0.3),
        # H
        (92.4, 'wind', -35, dict(dur=4.8), 0.1),
        (97.19, 'sparkle', -34, dict(dur=1.6, n_notes=6, seed=12), 0.0),
        (98.13, 'pop', -32, dict(f=1800), -0.3), (99.61, 'pop', -32, dict(f=2000), 0.0), (101.43, 'pop', -32, dict(f=2200), 0.3),
        # I
        (105.70, 'splash', -27, dict(dur=1.0), 0.0),
        (105.80, 'sparkle', -35, dict(dur=1.0, n_notes=8, seed=13), 0.0),
        (108.25, 'splash', -33, dict(dur=0.8), 0.0),
        (111.20, 'drop', -31, {}, 0.0),
        # J
        (112.6, 'ticks', -34, dict(dur=2.3, rate=6.0), 0.0),
        (114.97, 'chime', -28, dict(base=1046.5, decay=1.0), -0.3),
        (115.73, 'chime', -28, dict(base=1318.5, decay=1.0), 0.0),
        (116.38, 'chime', -28, dict(base=1567.98, decay=0.9), 0.3),
        (120.03, 'pop', -32, dict(f=1800), -0.3), (120.88, 'pop', -32, dict(f=2000), 0.0), (121.64, 'pop', -32, dict(f=2200), 0.3),
        # K
        (123.72, 'boom', -31, dict(dur=2.4, f=40), 0.0),
        (123.8, 'sparkle', -32, dict(dur=2.0, n_notes=8, seed=14), 0.0),
        (126.3, 'stream', -34, dict(dur=3.1), 0.0),
        (129.84, 'sparkle', -29, dict(dur=1.2, n_notes=8, seed=15), 0.0),
        (131.14, 'chime', -28, dict(base=1046.5, decay=0.7), 0.0),
        (131.6, 'swell', -25, dict(dur=1.2), 0.0),
        # L (books)
        (132.85, 'wind', -42, dict(dur=6.0), 0.0),
        (133.45, 'chime', -31, dict(base=783.99, decay=0.6), 0.0),
    ]
    return C
