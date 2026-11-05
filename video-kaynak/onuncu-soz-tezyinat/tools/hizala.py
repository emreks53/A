import torch, torchaudio, json, re, soundfile as sf
TEXT = """Hem anlarsın ki şu dünyadaki tezyinat, yalnız telezzüz veya tenezzüh için değil. Çünkü bir zaman lezzet verse, firakıyla birçok zaman elem verir. Sana tattırır, iştihanı açar fakat doyurmaz. Çünkü ya onun ömrü kısa, ya senin ömrün kısadır. Doymaya kâfi değil. Demek kıymeti yüksek, müddeti kısa olan şu tezyinat; ibret içindir, Hâşiye. Evet, madem her şeyin kıymeti ve dekaik-ı sanatı gayet yüksek ve güzel olduğu halde müddeti kısa, ömrü azdır. Demek, o şeyler numunelerdir, başka şeylerin suretleri hükmündedirler. Ve madem müşterilerin nazarlarını, asıllarına çeviriyorlar gibi bir vaziyet vardır. Öyle ise elbette şu dünyadaki o çeşit tezyinat, bir Rahman-ı Rahîm'in rahmetiyle, sevdiği ibadına hazırladığı niam-ı cennetin numuneleridir, denilebilir ve denilir ve öyledir. şükür içindir, usûl-ü daimîsine teşvik içindir. Başka gayet ulvi gayeler içindir."""
words = TEXT.split()
tr = str.maketrans({'ş':'s','ç':'c','ğ':'g','ı':'i','ö':'o','ü':'u','â':'a','î':'i','û':'u','İ':'i','Ş':'s','Ç':'c','Ö':'o','Ü':'u','Â':'a','Î':'i','Û':'u'})
def norm(w):
    w = w.replace('İ','i').lower().translate(tr)
    w = re.sub(r"[^a-z]", "", w)
    return w
nw = [norm(w) for w in words]
bundle = torchaudio.pipelines.MMS_FA
model = bundle.get_model(with_star=False)
aud, sr = sf.read("audio/voice16.wav", dtype="float32")
wav = torch.from_numpy(aud).unsqueeze(0)
with torch.inference_mode():
    emission, _ = model(wav)
dic = bundle.get_dict(star=None)
tokens = [dic[c] for w in nw for c in w]
import torchaudio.functional as F
aligned, scores = F.forced_align(emission, torch.tensor([tokens], dtype=torch.int32), blank=0)
aligned, scores = aligned[0], scores[0].exp()
spans = F.merge_tokens(aligned, scores)
ratio = wav.size(1) / emission.size(1) / sr
out = []; i = 0
for w, n in zip(words, nw):
    sp = spans[i:i+len(n)]; i += len(n)
    out.append(dict(w=w, s=round(sp[0].start*ratio,3), e=round(sp[-1].end*ratio,3), score=round(sum(s.score for s in sp)/len(sp),3)))
json.dump(out, open("audio/words_aligned.json","w"), ensure_ascii=False, indent=1)
print(' '.join(f"{o['w']}[{o['s']:.2f}-{o['e']:.2f}]" for o in out))
