import json, sys, wave, numpy as np
from faster_whisper import WhisperModel
name = sys.argv[1]
m = WhisperModel(name, device="cpu", compute_type="int8", cpu_threads=4)
prompt = "Dünya bir misafirhanedir. İnsan ise onda az duracaktır ve vazifesi çok bir misafirdir ve kısa bir ömürde hayat-ı ebediyeye lâzım olan levazımatı tedarik etmekle mükelleftir."
wf=wave.open("src16k.wav"); a=np.frombuffer(wf.readframes(wf.getnframes()),dtype=np.int16).astype(np.float32)/32768.0
segs, info = m.transcribe(a, language="tr", word_timestamps=True, beam_size=5, initial_prompt=prompt, vad_filter=False)
out=[]
for s in segs:
    for w in s.words:
        out.append({"w":w.word,"s":round(w.start,3),"e":round(w.end,3),"p":round(w.probability,3)})
        print(f"{w.start:7.3f} {w.end:7.3f} {w.probability:.2f} {w.word}")
json.dump(out, open(f"words_{name.replace('/','_')}.json","w"), ensure_ascii=False, indent=0)
