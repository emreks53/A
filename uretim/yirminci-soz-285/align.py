# CTC forced alignment with MMS_FA emissions + own Viterbi (character level)
import json, wave, numpy as np, torch, torchaudio, unicodedata, re
from torchaudio.pipelines import MMS_FA as B
wf=wave.open("src16k.wav"); a=np.frombuffer(wf.readframes(wf.getnframes()),dtype=np.int16).astype(np.float32)/32768.0
model=B.get_model(with_star=False); model.eval()
labels=B.get_labels(star=None); d={c:i for i,c in enumerate(labels)}
#print(labels)
with torch.inference_mode():
    em,_=model(torch.from_numpy(a)[None])
em=torch.log_softmax(em,-1)[0].numpy()  # T x C
T=em.shape[0]; fr=len(a)/16000/T
print("frames",T,"sec/frame",fr)
# spoken words (as read; whisper confirmed). Romanize Turkish
spoken="Dünya bir misafirhanedir İnsan ise onda az duracaktır ve vazifesi çok bir misafirdir ve kısa bir ömürde hayatı ebediyeye lâzım olan levazımatı tedarik etmekle mükelleftir En ehemm ve en elzem işler takdim edilecektir Halbuki siz ekseriyet itibarıyla şu fâni dünyayı bir makarrı ebedî noktai nazarında ve gaflet perdesi altında dünyaperestlik hissiyle işlenmiş bir suret sizde görülüyor Öyle ise hakperestlik ve âhireti düşünmeklik esasları üzerine müesses olan ubudiyetten hisseniz pek azdır"
words=spoken.split()
tr=str.maketrans({'ç':'c','ş':'s','ğ':'g','ı':'i','İ':'i','ö':'o','ü':'u','â':'a','î':'i','û':'u'})
def rom(w):
    w=w.translate(tr).lower()
    w=unicodedata.normalize('NFKD',w); w=''.join(c for c in w if c in d and c!='-')
    return w
rw=[rom(w) for w in words]
toks=[]; wid=[]; cid=[]
for i,w in enumerate(rw):
    for j,c in enumerate(w):
        toks.append(d[c]); wid.append(i); cid.append(j)
blank=0
L=len(toks); S=2*L+1
ext=[blank if s%2==0 else toks[s//2] for s in range(S)]
NEG=-1e30
dp=np.full((T,S),NEG,np.float64); bp=np.zeros((T,S),np.int8)
dp[0,0]=em[0,blank]; dp[0,1]=em[0,ext[1]]
for t in range(1,T):
    prev=dp[t-1]
    c0=prev
    c1=np.concatenate([[NEG],prev[:-1]])
    c2=np.concatenate([[NEG,NEG],prev[:-2]])
    allow2=np.array([s%2==1 and s>=2 and ext[s]!=ext[s-2] for s in range(S)])
    c2=np.where(allow2,c2,NEG)
    stack=np.stack([c0,c1,c2]); arg=stack.argmax(0)
    dp[t]=stack.max(0)+em[t,ext]
    bp[t]=arg
s=S-1 if dp[T-1,S-1]>dp[T-1,S-2] else S-2
path=[0]*T
for t in range(T-1,-1,-1):
    path[t]=s; s-=int(bp[t,s])
# token spans
spans={}
for t,s in enumerate(path):
    if s%2==1:
        k=s//2; spans.setdefault(k,[t,t]); spans[k][1]=t
res=[]
for i,w in enumerate(words):
    ks=[k for k in range(L) if wid[k]==i]
    st=spans[ks[0]][0]*fr; en=(spans[ks[-1]][1]+1)*fr
    res.append({"w":w,"s":round(st,3),"e":round(en,3),"chars":[[rw[i][cid[k]],round(spans[k][0]*fr,3)] for k in ks]})
    print(f"{st:7.3f} {en:7.3f} {w}")
json.dump(res,open("align_mms.json","w"),ensure_ascii=False,indent=0)
