import json, numpy as np, torch, soundfile as sf
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
MID = "mpoyraz/wav2vec2-xls-r-300m-cv7-turkish"
proc = Wav2Vec2Processor.from_pretrained(MID); model = Wav2Vec2ForCTC.from_pretrained(MID).eval()
vocab = proc.tokenizer.get_vocab(); print(sorted(vocab.keys()))
a, sr = sf.read('audio16k.wav'); a = a.astype(np.float32)
with torch.inference_mode():
    iv = proc(a, sampling_rate=16000, return_tensors='pt').input_values
    logits = model(iv).logits[0]
lp = torch.log_softmax(logits, -1).numpy()
T = lp.shape[0]; dur = len(a)/16000; fr = dur/T
print('frames', T, 'sec/frame', fr)
words = ("üçüncü nokta bu dünya darülhikmettir darülhizmettir darülücret ve mükafat değil buradaki amal ve hizmetlerin ücretleri berzahta ve ahirettedir "
 "buradaki amal berzahta ve ahirette meyve verir madem hakikat budur amali uhreviyeye ait neticeleri dünyada istememek gerektir verilse de memnunane değil "
 "mahzunane kabul etmek lazımdır çünkü cennetin meyveleri gibi kopardıkça yerine aynı gelmek sırrıyla baki hükmünde olan ameli uhrevi meyvesini bu dünyada "
 "fani bir surette yemek karı akıl değildir baki bir lambayı bir dakika yaşayacak ve sönecek bir lamba ile mübadele etmek gibidir işte bu sırra binaen ehli "
 "velayet hizmet ve meşakkat ve musibet ve külfeti hoş görüyorlar nazlanmıyorlar şekva etmiyorlar elhamdülillahi ala külli halin diyorlar").split()
blank = proc.tokenizer.pad_token_id; delim = vocab.get('|')
toks = []; wid = []
for i, w in enumerate(words):
    for ch in w:
        if ch not in vocab: print('missing', ch); continue
        toks.append(vocab[ch]); wid.append(i)
    if i < len(words)-1 and delim is not None:
        toks.append(delim); wid.append(-1)
# CTC viterbi
L = len(toks); S2 = 2*L+1
ext = [blank]*S2
for i,t in enumerate(toks): ext[2*i+1] = t
NEG = -1e18
dp = np.full((T, S2), NEG); bp = np.zeros((T, S2), np.int32)
dp[0,0] = lp[0,blank]; dp[0,1] = lp[0,ext[1]]
for t in range(1, T):
    prev = dp[t-1]
    s0 = prev
    s1 = np.concatenate([[NEG], prev[:-1]])
    s2 = np.concatenate([[NEG,NEG], prev[:-2]])
    allow2 = np.array([ (s>=2 and ext[s]!=blank and ext[s]!=ext[s-2]) for s in range(S2)])
    s2 = np.where(allow2, s2, NEG)
    stack = np.stack([s0,s1,s2]); arg = stack.argmax(0)
    dp[t] = stack.max(0) + lp[t, ext]
    bp[t] = arg
s = S2-1 if dp[T-1,S2-1] > dp[T-1,S2-2] else S2-2
path = [0]*T
for t in range(T-1, -1, -1):
    path[t] = s; s -= bp[t,s]
# token spans
spans = {}
for t, s in enumerate(path):
    if s % 2 == 1:
        k = (s-1)//2
        spans.setdefault(k, [t, t]); spans[k][1] = t
out = []
for i, w in enumerate(words):
    ks = [k for k in range(L) if wid[k]==i and k in spans]
    st = spans[ks[0]][0]*fr; en = (spans[ks[-1]][1]+1)*fr
    out.append({'w': w, 's': round(st,3), 'e': round(en,3), 'first_char_end': round((spans[ks[0]][1]+1)*fr,3)})
    print(f"{st:7.3f} {en:7.3f} {w}")
json.dump(out, open('align.json','w'), ensure_ascii=False, indent=1)
