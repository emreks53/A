"""Speech intelligibility check: for every narrated word (data/words_aligned.json), the voice-to-SFX level margin in the
speech band (300-3400 Hz) from the mix stems out/_stem_voice.wav and out/_stem_sfx.wav. Prints words below --min dB."""
import json, os, sys, numpy as np, soundfile as sf
from scipy import signal
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
a = sys.argv[1:]; MIN = float(a[a.index('--min') + 1]) if '--min' in a else 12
v, sr = sf.read(os.path.join(ROOT, 'out/_stem_voice.wav')); s, _ = sf.read(os.path.join(ROOT, 'out/_stem_sfx.wav'))
v = v.mean(1) if v.ndim == 2 else v; s = s.mean(1) if s.ndim == 2 else s
bp = signal.butter(4, [300, 3400], 'bandpass', fs=sr, output='sos'); v = signal.sosfiltfilt(bp, v); s = signal.sosfiltfilt(bp, s)
W = json.load(open(os.path.join(ROOT, 'data/words_aligned.json')))
rows = []
for w in W:
    i, j = int(w['s'] * sr), int(w['e'] * sr)
    if j - i < sr * 0.05: continue
    rv = np.sqrt(np.mean(v[i:j] ** 2)) + 1e-9; rs = np.sqrt(np.mean(s[i:j] ** 2)) + 1e-9
    rows.append((w['s'], w['w'], 20 * np.log10(rv / rs)))
m = np.array([r[2] for r in rows])
print(f'words {len(rows)}  margin median {np.median(m):.1f} dB  p10 {np.percentile(m, 10):.1f}  min {m.min():.1f}')
for t, ww, d in rows:
    if d < MIN: print(f'  {t:7.2f}  {ww:18s} {d:5.1f} dB')
