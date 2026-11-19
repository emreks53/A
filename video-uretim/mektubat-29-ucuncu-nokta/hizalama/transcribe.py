import json, sys
from faster_whisper import WhisperModel
m = WhisperModel("large-v3", device="cpu", compute_type="int8", cpu_threads=4)
prompt = "Üçüncü Nokta: Bu dünya dârü'l-hikmettir, dârü'l-hizmettir; dârü'l-ücret ve mükâfat değil. Buradaki a'mal ve hizmetlerin ücretleri berzahta ve âhirettedir. Elhamdülillahi alâ külli hâl. Risale-i Nur, Mektubat."
import wave, numpy as np
wf=wave.open("audio16k.wav"); a=np.frombuffer(wf.readframes(wf.getnframes()),dtype=np.int16).astype(np.float32)/32768.0
segs, info = m.transcribe(a, language="tr", word_timestamps=True, initial_prompt=prompt, beam_size=5, vad_filter=False)
out=[]
for s in segs:
    out.append({"start":s.start,"end":s.end,"text":s.text,"words":[{"w":w.word,"s":w.start,"e":w.end,"p":w.probability} for w in s.words]})
    print(f"{s.start:7.2f} {s.end:7.2f} {s.text}", flush=True)
json.dump(out, open("whisper.json","w"), ensure_ascii=False, indent=1)
