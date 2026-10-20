"""Builds timing/shots.json: the master shot table (absolute seconds, 24 fps).
Frame index f covers time [f/24, (f+1)/24). Final video = frames 0..TOTAL_FRAMES-1."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 24
TOTAL_SECONDS = 125.5
HANDLE = 6  # extra frames rendered before/after each shot for dissolves
words = []
for seg in json.load(open(os.path.join(HERE, "words.json"))):
    for w in seg["words"]:
        words.append({"w": w["w"].strip(" .,?…"), "s": round(w["s"], 2), "e": round(w["e"], 2)})

SHOTS = [
 ("sh01", 0.00,   5.24, "Dawn meadow macro: a dew drop on a grass blade reflects the world; drop falls onto a seedling"),
 ("sh02", 5.24,   9.64, "Morning room: sunbeams through a window, curtain breathing in the breeze, dust motes = air we breathe"),
 ("sh03", 9.64,  16.00, "Sofra: bread, fruit, a glass being filled with water - everything laid out as if presented to us"),
 ("sh04", 16.00, 22.95, "Cracked dry earth, lone seedling under a vast sky; a human hand (silhouette) reaches up toward the sun - out of reach"),
 ("sh05", 22.95, 30.10, "Underwater: aquatic plant leaves release streams of oxygen bubbles rising to a sunlit surface"),
 ("sh06", 30.10, 35.70, "Inside a blood vessel: red blood cells flowing in pulses with the heartbeat"),
 ("sh07", 35.70, 40.60, "Sunrise over the sea: the sun breaks the horizon on the word 'gunes', warm light floods"),
 ("sh08", 40.60, 47.40, "A real hand reaches across the table and lifts an apple; camera pushes toward the wrist"),
 ("sh09", 47.40, 52.10, "Inside the arm: nerve impulse races along an axon into muscle fibres; push into a cell, mitochondria"),
 ("sh10", 52.10, 58.00, "Pull back from one cell to countless cells lighting up one after another - 'hadsiz ihtiyac'"),
 ("sh11", 58.00, 63.85, "Rain arrives on the cracked earth from sh04; drops reach the seedling, water flows toward camera"),
 ("sh12", 63.85, 74.15, "Aerial vista: sun, sea, clouds, rain, rivers, forests - one interconnected system; lines converge to one light"),
 ("sh13a",74.15, 84.20, "Golden-hour meadow and forest edge teeming with life; warm light blankets everything ('genis sefkat')"),
 ("sh13b",84.20, 89.10, "One by one: tracking rings find individual flowers/insects; camera dives to the single seedling receiving a drop"),
 ("sh14a",89.10, 99.50, "Sunflower: Fibonacci spiral macro (hikmet), heads turning toward the sun as if seeing (goruyormuscasina)"),
 ("sh14b",99.50,104.20, "A heavy dark cloth slowly drapes over a glowing light - trying to cover the truth; light leaks through"),
 ("sh14c",104.20,109.80,"Cold lifeless desert: inert stone, aimless blowing sand, cracked ground under grey sky - 'cansiz, suursuz, sefkatsiz'"),
 ("sh15", 109.80,125.50,"Warm sunbeam on a wooden rahle: red Risale-i Nur volumes; 'Sozler' opens to page 721; other risaleler; final frame"),
]
out = {"fps": FPS, "width": 1080, "height": 1920, "total_seconds": TOTAL_SECONDS,
       "total_frames": int(round(TOTAL_SECONDS * FPS)), "handle_frames": HANDLE, "shots": []}
for sid, a, b, desc in SHOTS:
    f0, f1 = int(round(a * FPS)), int(round(b * FPS))  # [f0, f1) are the frames this shot owns in the cut
    ws = [w for w in words if w["s"] < b and w["e"] > a]
    out["shots"].append({"id": sid, "start_s": a, "end_s": b, "cut_f0": f0, "cut_f1": f1,
        "render_f0": max(0, f0 - HANDLE), "render_f1": min(out["total_frames"], f1 + HANDLE),
        "seconds": round(b - a, 2), "desc": desc,
        "narration": " ".join(w["w"] for w in ws), "words": ws})
json.dump(out, open(os.path.join(HERE, "shots.json"), "w"), ensure_ascii=False, indent=1)
print(sum(s["render_f1"] - s["render_f0"] for s in out["shots"]), "frames to render incl. handles;", out["total_frames"], "in cut")
