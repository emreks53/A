import json, re, sys, torch, torchaudio, soundfile as sf, numpy as np
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
MODEL = sys.argv[1] if len(sys.argv) > 1 else 'mpoyraz/wav2vec2-xls-r-300m-cv7-turkish'
proc = Wav2Vec2Processor.from_pretrained(MODEL)
model = Wav2Vec2ForCTC.from_pretrained(MODEL).eval()
vocab = proc.tokenizer.get_vocab()
print('vocab', sorted(vocab.keys()))
raw = open('align/text.txt', encoding='utf8').read()
# original tokens (keep original spelling for later mapping)
orig_words = re.findall(r"[^\s]+", raw)
def tr_lower(s):
    return s.replace('İ', 'i').replace('I', 'ı').lower()
def norm(w):
    w = tr_lower(w)
    w = w.replace('â', 'a').replace('î', 'i').replace('û', 'u')
    w = re.sub(r"[^a-zçğıöşü]", '', w)
    return w
words = []
for ow in orig_words:
    # split hyphenated compounds into separate spoken parts but remember origin
    parts = [p for p in re.split(r"[-]", ow) if norm(p)]
    for p in parts:
        words.append({'orig': ow, 'part': p, 'n': norm(p)})
missing = set(c for w in words for c in w['n'] if c not in vocab)
print('missing chars', missing)
wav, sr = sf.read('audio/narr16k.wav', dtype='float32')
assert sr == 16000
inp = proc(wav, sampling_rate=16000, return_tensors='pt')
with torch.inference_mode():
    # chunked inference to save memory: 20s windows with 2s overlap, stitch logits
    x = torch.tensor(wav)[None]
    win, hop = 16000*30, 16000*28
    outs = []
    pos = 0
    allp = []
    while pos < x.shape[1]:
        seg = x[:, pos:pos+win]
        lg = model(seg).logits[0]
        allp.append((pos, lg))
        if pos + win >= x.shape[1]: break
        pos += hop
    # stitch: frame rate
    fr = 320  # samples per frame
    total = x.shape[1] // fr + 1
    V = allp[0][1].shape[1]
    logits = torch.full((total, V), float('nan'))
    for p, lg in allp:
        f0 = p // fr
        n = lg.shape[0]
        for i in range(n):
            fi = f0 + i
            if fi >= total: break
            # prefer frames not in first/last 1s of a window (except edges)
            if torch.isnan(logits[fi, 0]) or (i > 50):
                logits[fi] = lg[i]
    logits = logits[~torch.isnan(logits[:, 0])]
    lp = torch.log_softmax(logits, dim=-1)
sep = vocab.get('|', None)
tokens = []
tok_word = []
for wi, w in enumerate(words):
    for c in w['n']:
        tokens.append(vocab[c]); tok_word.append(wi)
    if sep is not None and wi < len(words) - 1:
        tokens.append(sep); tok_word.append(-1)
blank = proc.tokenizer.pad_token_id
ali, scores = torchaudio.functional.forced_align(lp[None], torch.tensor([tokens], dtype=torch.int32), blank=blank)
ali = ali[0].tolist(); scores = scores[0].exp().tolist()
# merge repeats to token spans
spans = []
ti = -1; prev = blank
for f, t in enumerate(ali):
    if t != blank and (t != prev or prev == blank):
        ti += 1
        spans.append([f, f, scores[f]])
    elif t != blank and t == prev:
        spans[-1][1] = f
    prev = t
assert len(spans) == len(tokens), (len(spans), len(tokens))
sec = fr / 16000
res = []
for wi, w in enumerate(words):
    idx = [k for k, tw in enumerate(tok_word) if tw == wi]
    st = spans[idx[0]][0] * sec; en = (spans[idx[-1]][1] + 1) * sec
    chars = [{'c': w['n'][j], 's': round(spans[k][0]*sec, 3)} for j, k in enumerate(idx)]
    res.append({'orig': w['orig'], 'part': w['part'], 's': round(st, 3), 'e': round(en, 3),
                'score': round(float(np.mean([spans[k][2] for k in idx])), 3), 'chars': chars})
json.dump(res, open('align/ctc_words.json', 'w'), ensure_ascii=False, indent=0)
for r in res: print(f"{r['s']:7.2f} {r['e']:7.2f} {r['score']:.2f} {r['part']}")
