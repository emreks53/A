"""Refine Whisper word timings against the narration's energy envelope.
Whisper tends to start a word at the end of the previous one, i.e. inside the pause before it. For every word boundary,
look for a real pause (>=120 ms of non-speech) just after the reported boundary and, if found, end the previous word at the
pause start and start the next word at the pause end. Breaths (runs that never exceed -30 dBFS) count as non-speech.
Usage: python tools/align_words.py [--voice out/_stem_voice.wav] [--out data/words_energy.json]   (then tools/fa_align.py --write)"""
import json, subprocess, sys, os
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
args = sys.argv[1:]
opt = lambda k, d: args[args.index('--' + k) + 1] if '--' + k in args else d
voice = os.path.join(ROOT, opt('voice', 'out/_stem_voice.wav')); out = os.path.join(ROOT, opt('out', 'data/words_energy.json'))
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', voice, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32); hop = 160; n = len(x) // hop
db = 20 * np.log10(np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
def runs(b):
    r, i = [], 0
    while i < len(b):
        j = i
        while j < len(b) and b[j] == b[i]: j += 1
        r.append((bool(b[i]), i, j)); i = j
    return r
sp = db > -42
for v, i, j in runs(sp):          # breaths / blips are not speech
    if v and (db[i:j].max() < -36 or j - i < 4): sp[i:j] = False
for v, i, j in runs(sp):          # bridge tiny holes inside speech (< 50 ms)
    if not v and 0 < i and j < len(sp) and j - i < 5: sp[i:j] = True
for v, i, j in runs(sp):          # a tiny speech burst (< 160 ms, e.g. 'şid' before the geminate closure of 'şid-detli')
    if v and j - i < 16:           # followed by a short silence is part of the next word: bridge that silence
        k2 = j
        while k2 < len(sp) and not sp[k2]: k2 += 1
        if k2 < len(sp) and k2 - j < 15: sp[j:k2] = True
used = set()
def speech_after(t0):   # seconds of speech from t0 until the next pause of >= 120 ms
    i = int(round(t0 * 100)); j = i
    while j < len(sp):
        if not sp[j]:
            k2 = j
            while k2 < len(sp) and not sp[k2]: k2 += 1
            if k2 - j >= 12: break
            j = k2; continue
        j += 1
    return (j - i) / 100
W = json.load(open(os.path.join(ROOT, 'data/words.json'))); A = [dict(w) for w in W]
JB = np.array([w['s'] for w in W[1:]])   # Whisper word boundaries
# pauses: >= 120 ms anywhere, or >= 90 ms when close (<= 0.25 s) to a reported word boundary (not a stop closure)
gaps = [(i / 100, j / 100) for v, i, j in runs(sp) if not v and (j - i >= 12 or (j - i >= 9 and np.abs(JB - i / 100).min() <= 0.12))]
for k in range(len(A) - 1):
    a, b = A[k], A[k + 1]
    B = min(a['e'], b['s'])
    lo, hi = B - 0.15, b['e'] - 0.10
    nb = max(1, sum(ch in 'aeıioöuüâîûAEIİOÖUÜÂÎÛ' for ch in b['w']))
    # a pause can only start the next word if enough speech follows it before the next real pause (>= 60 ms per syllable)
    cand = [g for g in gaps if g[1] > lo and g[0] < hi and g[1] > a['s'] + 0.12 and speech_after(g[1]) >= 0.06 * nb]
    if not cand: continue
    g = min(cand, key=lambda g: g[0])   # the pause right after the reported boundary
    used.add(g)
    if g[0] > a['s'] + 0.10: a['e'] = round(min(a['e'], g[0]) if g[0] < a['e'] else g[0], 2)
    b['s'] = round(min(g[1], b['e'] - 0.08), 2)
    if a['e'] > b['s']: a['e'] = b['s']
# 2) inside each continuous speech run (between pauses), re-distribute the words by syllable count (Turkish is
#    syllable-timed) blended with Whisper's relative durations, so a run of early Whisper starts is corrected too.
VOW = set('aeıioöuüâîûAEIİOÖUÜÂÎÛ')
syl = lambda w: max(1, sum(ch in VOW for ch in w))
speech_runs = [(i / 100, j / 100) for v, i, j in runs(sp) if v]
merged = []
for r in speech_runs:   # split runs only at pauses used as word boundaries above, or at long (>= 0.25 s) pauses
    if merged and r[0] - merged[-1][1] < 0.25 and not any(abs(g[0] - merged[-1][1]) < 0.011 for g in used): merged[-1] = (merged[-1][0], r[1])
    else: merged.append(r)
# a run in which no word starts is the continuation of the previous word (e.g. a pause inside 'ne… zakette'): join it
starts = [w['s'] for w in A]
joined = []
for (r0, r1) in merged:
    if joined and not any(r0 - 0.10 <= s0 < r1 - 0.05 for s0 in starts): joined[-1] = (joined[-1][0], r1)
    else: joined.append((r0, r1))
merged = joined
k = 0
for (r0, r1) in merged:
    idx = [i for i, w in enumerate(A) if r0 - 0.10 <= w['s'] < r1 - 0.05 and i >= k]
    if not idx: continue
    idx = list(range(idx[0], idx[-1] + 1)); k = idx[-1] + 1
    c = np.array([syl(W[i]['w']) for i in idx], float); r = np.array([max(.05, W[i]['e'] - W[i]['s']) for i in idx], float)
    wgt = 0.65 * c / c.sum() + 0.35 * r / r.sum()
    s0 = max(r0, A[idx[0]]['s'] - 0.02) if A[idx[0]]['s'] > r0 else r0
    edges = s0 + np.concatenate([[0], np.cumsum(wgt)]) * (r1 - s0)
    for j, i in enumerate(idx): A[i]['s'] = round(float(edges[j]), 2); A[i]['e'] = round(float(edges[j + 1]), 2)
# 3) a word whose window holds no speech (short words parked in a pause) moves to the next speech onset
for k, w in enumerate(A):
    i, j = int(w['s'] * 100), max(int(w['s'] * 100) + 1, int(w['e'] * 100))
    if sp[i:j].any(): continue
    lim = int((A[k + 1]['e'] if k + 1 < len(A) else w['e'] + 0.8) * 100)
    on = next((q for q in range(j, min(lim, len(sp))) if sp[q]), None)
    if on is None: continue
    dur = max(0.12, w['e'] - w['s']); w['s'] = round(on / 100, 2); w['e'] = round(w['s'] + dur, 2)
    q = k + 1
    while q < len(A) and A[q]['s'] < A[q - 1]['e']:   # keep the timeline monotonic
        A[q]['s'] = A[q - 1]['e']; A[q]['e'] = round(max(A[q]['e'], A[q]['s'] + 0.08), 2); q += 1
json.dump(A, open(out, 'w'), ensure_ascii=False, indent=0)
d = np.array([A[k]['s'] - W[k]['s'] for k in range(len(W))])
print(f'{len(W)} words; shifted >= 0.15 s: {(np.abs(d) >= 0.15).sum()}; min {d.min():+.2f} max {d.max():+.2f} -> {os.path.relpath(out, ROOT)}')
