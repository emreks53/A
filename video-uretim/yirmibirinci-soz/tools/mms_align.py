import torch, torchaudio, wave, numpy as np, json, re, sys
from torchaudio.pipelines import MMS_FA as bundle
w=wave.open("audio/kaynak16k.wav"); a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768.0
wav=torch.from_numpy(a).unsqueeze(0)
text="Elhasıl Ey nefis Bil ki dünkü gün senin elinden çıktı Yarın ise senin elinde senet yok ki ona mâliksin Öyle ise hakiki ömrünü bulunduğun gün bil Lâekall günün bir saatini ihtiyat akçesi gibi hakiki istikbal için teşkil olunan bir sandukçai uhreviye olan bir mescide veya bir seccadeye at"
words=text.split()
tr=str.maketrans({'ı':'i','ş':'s','ç':'c','ğ':'g','ö':'o','ü':'u','â':'a','î':'i','û':'u','İ':'i','Ö':'o','Ü':'u','Ş':'s','Ç':'c','Â':'a'})
norm=[re.sub(r"[^a-z']","",x.translate(tr).lower()) for x in words]
model=bundle.get_model(); tok=bundle.get_tokenizer(); al=bundle.get_aligner()
with torch.inference_mode():
    em,_=model(wav)
    spans=al(em[0], tok(norm))
ratio=wav.shape[1]/em.shape[1]/16000
out=[]
for wd,sp in zip(words,spans):
    s=sp[0].start*ratio; e=sp[-1].end*ratio; sc=sum(x.score*(x.end-x.start) for x in sp)/sum((x.end-x.start) for x in sp)
    out.append({"w":wd,"s":round(s,3),"e":round(e,3),"sc":round(float(sc),2)})
    print(f"{s:7.3f} {e:7.3f} {sc:.2f} {wd}")
json.dump(out,open("audio/mms_words.json","w"),ensure_ascii=False,indent=0)
