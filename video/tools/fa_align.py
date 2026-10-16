"""Phoneme-level forced alignment of the narration (torchaudio MMS_FA, CTC) -> data/words_fa.json
The energy aligner (tools/align_words.py) snaps word starts to stop-closure releases and mis-splits long unpaused runs;
a CTC aligner sees the actual phones. Words are romanised to MMS_FA's a-z alphabet and spoken forms are used for numerals
and foreign names. The audio is aligned in chunks split at clear pauses, each padded and wrapped in <star> tokens.
  python tools/fa_align.py [--compare] [--write]   (needs torch + torchaudio; --write also replaces data/words_aligned.json)"""
import json, os, re, subprocess, sys
import numpy as np, torch, torchaudio, torchaudio.functional as F

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SR = 16000
SPOKEN = {'195.': 'yüz doksan beşinci', '19.': 'on dokuzuncu', 'Thomas': 'tomas', 'Carlyle': 'karlayl', 'Edward': 'edvırd', 'Gibbon;': 'gibın'}
# Onsets re-measured by hand (phonetic review of every word against the waveform, then an independent re-check). Each is the
# perceptual onset: the first audible phone (a stop's release, a fricative's rise), ignoring mouth clicks / lip smacks.
OVERRIDES = {
    51: 25.925,   # Peygamberimiz - CTC snapped to a lip smack at 25.84; p burst 25.928
    107: 59.35,   # sabırda - s frication rises 59.348 (CTC fired mid-s)
    108: 60.11,   # saygıda - s frication rises 60.108
    110: 62.625,  # nezakette - CTC snapped to a mouth click at 62.54; n murmur 62.625
    115: 68.29,   # ve - the 67.80 syllable is the '-te' of yardımseverlikte (after its kt closure); reduced 've' at 68.29
    158: 90.505,  # Peygamberimizin - lip/breath thump at 90.43; p burst 90.505
    165: 94.36,   # düşünürlerinden - d release 94.365 (CTC fired at the ş)
    195: 109.455, # Peygamberimiz - mouth thump at 109.39; p burst 109.452
    205: 115.73,  # kitabının - k burst 115.735 (CTC started inside the final t closure of Mektubat)
}
ROMAN = str.maketrans({'ş': 's', 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u'})

def norm(w):
    w = SPOKEN.get(w, w).replace('I', 'ı').replace('İ', 'i').lower().translate(ROMAN)
    return [p for p in re.sub(r'[^a-z ]', '', w).split() if p]

def main():
    words = json.load(open(os.path.join(ROOT, 'data/words.json')))
    prior = json.load(open(os.path.join(ROOT, 'data/words_energy.json')))  # tools/align_words.py: chunking + low-confidence fallback
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, 'data/narration.m4a'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    wav = torch.from_numpy(np.frombuffer(pcm, dtype=np.float32).copy())[None]
    bundle = torchaudio.pipelines.MMS_FA
    model = bundle.get_model(with_star=True).eval(); DICT = bundle.get_dict(star='*')
    ratio = bundle.sample_rate / 1  # samples per second
    # chunks: split at gaps >= 0.25 s in the prior alignment, at most ~14 s each
    chunks, cur = [], [0]
    for k in range(1, len(words)):
        gap = prior[k]['s'] - prior[k - 1]['e']
        if gap >= 0.25 and prior[k - 1]['e'] - prior[cur[0]]['s'] > 4.0 or prior[k]['e'] - prior[cur[0]]['s'] > 14:
            chunks.append(cur); cur = []
        cur.append(k)
    chunks.append(cur)
    out = [None] * len(words)
    for ch in chunks:
        a = max(0.0, prior[ch[0]]['s'] - 0.6); b = min(wav.shape[1] / SR, prior[ch[-1]]['e'] + 0.6)
        seg = wav[:, int(a * SR):int(b * SR)]
        with torch.inference_mode():
            em, _ = model(seg)
        em = torch.log_softmax(em, dim=-1)
        toks, owner = [DICT['*']], [-1]
        for k in ch:
            for p in norm(words[k]['w']):
                for c in p: toks.append(DICT[c]); owner.append(k)
        toks.append(DICT['*']); owner.append(-1)
        ali, scores = F.forced_align(em, torch.tensor([toks], dtype=torch.int32), blank=0)
        spans = F.merge_tokens(ali[0], scores[0].exp())
        fdur = seg.shape[1] / SR / em.shape[1]
        assert len(spans) == len(toks), (len(spans), len(toks))
        for sp, k in zip(spans, owner):
            if k < 0: continue
            s, e = a + sp.start * fdur, a + sp.end * fdur
            if out[k] is None: out[k] = {'s': s, 'e': e, 'sc': [sp.score]}
            else: out[k]['e'] = e; out[k]['sc'].append(sp.score)
    # Refine against the waveform (10 ms RMS envelope, dBFS):
    #  - CTC fires a little after the acoustic onset: if the voice rises out of silence (< -50 dB -> > -45 dB) within 0.25 s
    #    before (or 60 ms after) the CTC start and after the previous word's CTC end, start the word there (the latest rise
    #    before it, else the first one after it); else start 30 ms early.
    #  - CTC end spans are one frame long: extend the end while the voice stays above -42 dB, up to the next word's start.
    #  - Words the CTC model is unsure of (mean token prob < 0.10) keep the energy aligner's times.
    x = wav[0].numpy(); H = SR // 100
    env = np.array([20 * np.log10(np.sqrt(np.mean(x[i:i + H] ** 2)) + 1e-9) for i in range(0, len(x) - H, H)])
    db = env - np.percentile(env, 99)  # relative to loud speech
    T = lambda f: f * 0.01
    rows = []
    for k, w in enumerate(words):
        o = out[k]; conf = float(np.mean(o['sc']))
        if k in OVERRIDES: rows.append((OVERRIDES[k], o['e'], conf, 'hand')); continue
        if conf < 0.10: rows.append((prior[k]['s'], prior[k]['e'], conf, 'prior')); continue
        s, e, how = o['s'], o['e'], 'ctc'
        lo = max(o['s'] - 0.25, out[k - 1]['e'] if k else 0); f0, f1 = int(lo * 100), int((o["s"] + 0.06) * 100)
        rise = [f for f in range(max(f0, 1), f1 + 1) if db[f] > -45 and db[f - 1:f].max() < -45 and db[max(0, f - 4):f].min() < -50]
        before = [f for f in rise if T(f) <= o['s'] + 1e-6]
        if rise: s, how = T(before[-1] if before else rise[0]), 'rise'
        else: s = o['s'] - 0.03
        rows.append((s, e, conf, how))
    res = []
    for k, w in enumerate(words):
        s, e, conf, how = rows[k]
        nxt = rows[k + 1][0] if k + 1 < len(words) else len(db) * 0.01
        f = int(e * 100)
        while f + 1 < len(db) and T(f + 1) < nxt - 0.01 and db[f + 1] > -42: f += 1
        e = min(max(e, T(f + 1)), nxt - 0.01)
        res.append({**w, 's': round(s, 3), 'e': round(min(max(e, s + 0.06), nxt), 3), 'conf': round(conf, 3), 'how': how})
    json.dump(res, open(os.path.join(ROOT, 'data/words_fa.json'), 'w'), ensure_ascii=False, indent=0)
    print(len(chunks), 'chunks ->', 'data/words_fa.json')
    if '--write' in sys.argv:
        json.dump([{k: v for k, v in r.items() if k not in ('conf', 'how')} for r in res], open(os.path.join(ROOT, 'data/words_aligned.json'), 'w'), ensure_ascii=False)
        print('-> data/words_aligned.json')
    if '--compare' in sys.argv:
        for k, (r, p) in enumerate(zip(res, prior)):
            d = r['s'] - p['s']
            flag = ' <<<' if abs(d) > 0.12 else ''
            print(f"{k:3d} {r['w']:22s} fa {r['s']:7.3f}-{r['e']:7.3f} {r['how']:5s} conf {r['conf']:.2f}  prior {p['s']:7.3f}-{p['e']:7.3f}  ds {d:+.3f}{flag}")

if __name__ == '__main__':
    main()
