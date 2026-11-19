"""CTC forced alignment of the known narration text (torchaudio MMS_FA).

Outputs word list with onset/offset (seconds) and per-word score.
"""
import json, re, sys, wave
import numpy as np
import torch, torchaudio
from torchaudio.pipelines import MMS_FA as bundle

WAV, OUT = sys.argv[1], sys.argv[2]

# Text exactly as narrated (display form). Arabic verse given with its spoken romanization in [ ].
TEXT = """İşte dünya süslü bir menzildir. Her birimizin hayatı, bir endam âyinesidir. Şu dünyadan her birimize birer dünya var, birer âlemimiz var. Fakat direği, merkezi, kapısı, hayatımızdır. Belki o hususi dünyamız ve âlemimiz, bir sahifedir. Hayatımız bir kalem, onunla sahife-i a'malimize geçecek çok şeyler yazılıyor.
Eğer dünyamızı sevdikse sonra gördük ki dünyamız hayatımız üstünde bina edildiği için hayatımız gibi zâil, fâni, kararsızdır, hissedip bildik. Ona ait muhabbetimiz, o hususi dünyamız âyine olduğu ve temsil ettiği güzel nukuş-u esma-i İlahiyeye döner; ondan, cilve-i esmaya intikal eder.
Hem o hususi dünyamız, âhiret ve cennetin muvakkat bir fidanlığı olduğunu derk edip ona karşı şedit hırs ve talep ve muhabbet gibi hissiyatımızı onun neticesi ve semeresi ve sümbülü olan uhrevî fevaidine çevirsek o vakit o mecazî aşk, hakiki aşka inkılab eder.
Yoksa [nesullahe] [feensahum] [enfusehum] [ulaike] [humul] [fasikun] sırrına mazhar olup nefsini unutup hayatın zevalini düşünmeyerek hususi kararsız dünyasını, aynı umumî dünya gibi sabit bilip kendini lâyemut farz ederek dünyaya saplansa, şedit hissiyat ile ona sarılsa onda boğulur, gider. O muhabbet onun için hadsiz bela ve azaptır."""

TR = str.maketrans({"â": "a", "Â": "a", "î": "i", "Î": "i", "û": "u", "Û": "u", "ı": "i", "İ": "i", "I": "i",
                    "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g", "ç": "c", "Ç": "c", "ö": "o", "Ö": "o", "ü": "u", "Ü": "u"})

def roman(w):
    w = w.translate(TR).lower()
    w = re.sub(r"[^a-z]", "", w)
    return w

display, tokens_words = [], []
for raw in TEXT.split():
    disp = raw
    arabic = raw.startswith("[")
    for part in re.split(r"-", raw.strip("[]")) if not arabic else [raw.strip("[]")]:
        r = roman(part)
        if not r:
            continue
        display.append({"word": part.strip(".,;:"), "arabic": arabic, "raw": raw})
        tokens_words.append(r)

wf = wave.open(WAV)
sr = wf.getframerate()
audio = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
wav = torch.from_numpy(audio)[None]
assert sr == bundle.sample_rate, sr

model = bundle.get_model(with_star=False)
model.eval()
dictionary = bundle.get_dict(star=None)
with torch.inference_mode():
    emission, _ = model(wav)

targets = [dictionary[c] for w in tokens_words for c in w]
t = torch.tensor([targets], dtype=torch.int32)
aligned, scores = torchaudio.functional.forced_align(emission, t, blank=0)
aligned, scores = aligned[0], scores[0].exp()
token_spans = torchaudio.functional.merge_tokens(aligned, scores)

ratio = wav.size(1) / emission.size(1) / sr  # seconds per frame
out = []
i = 0
for k, w in enumerate(tokens_words):
    spans = token_spans[i:i + len(w)]
    i += len(w)
    s = spans[0].start * ratio
    e = spans[-1].end * ratio
    sc = float(sum(sp.score * (sp.end - sp.start) for sp in spans) / sum(sp.end - sp.start for sp in spans))
    out.append({"w": display[k]["word"], "rom": w, "s": round(s, 3), "e": round(e, 3), "score": round(sc, 3),
                "arabic": display[k]["arabic"]})

json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=1)
for o in out:
    flag = "  <-- low" if o["score"] < 0.4 else ""
    print(f"{o['s']:7.3f} {o['e']:7.3f} {o['score']:.2f} {o['w']}{flag}")
