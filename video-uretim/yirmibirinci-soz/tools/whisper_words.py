import sys, json, wave, numpy as np
from faster_whisper import WhisperModel
model_name = sys.argv[1] if len(sys.argv)>1 else "large-v3"
m = WhisperModel(model_name, device="cpu", compute_type="int8", cpu_threads=4)
prompt = "Elhasıl: Ey nefis! Bil ki dünkü gün senin elinden çıktı. Yarın ise senin elinde senet yok ki ona mâliksin. Öyle ise hakiki ömrünü, bulunduğun gün bil. Lâekall günün bir saatini, ihtiyat akçesi gibi hakiki istikbal için teşkil olunan bir sandukça-i uhreviye olan bir mescide veya bir seccadeye at."
_w=wave.open("audio/kaynak16k.wav"); _a=np.frombuffer(_w.readframes(_w.getnframes()),dtype=np.int16).astype(np.float32)/32768.0
segs, info = m.transcribe(_a, language="tr", word_timestamps=True, initial_prompt=prompt, beam_size=5, vad_filter=False, condition_on_previous_text=False)
out=[]
for s in segs:
    for w in s.words:
        out.append({"w":w.word.strip(),"s":round(w.start,3),"e":round(w.end,3),"p":round(w.probability,3)})
        print(f"{w.start:7.3f} {w.end:7.3f} {w.probability:.2f} {w.word}")
json.dump(out, open(f"audio/whisper_{model_name.replace('/','_')}.json","w"), ensure_ascii=False, indent=0)
