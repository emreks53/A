"""build_cues.py - writes audio/cues.json, the film's sound timeline (absolute seconds).

Every sync time is looked up from timing/shots.json (word starts / cut times), never typed by
hand, so if the timing table changes the cue sheet follows.  Run:  python3 build_cues.py

Cue fields
  id        unique id (also the random seed)            shot   owning shot
  t         SYNC time, absolute seconds (the event the picture shows: impact, word, cut)
  pre       seconds of audio before the sync point      dur    total cue length (s)
  gen       generator name in sfx.GEN                   params generator parameters
            (times inside params are cue-relative, i.e. seconds from t - pre)
  lvl       loudness of the cue alone in final-mix LUFS, before ducking: for continuous beds the
            typical (70th-percentile) momentary loudness, for everything else the max momentary
            (400 ms) loudness  (override with "norm": "max" | "p50" | ...)
  class     amb | spot | sub | ui   (decides how hard it ducks under the voice)
  space     reverb space name        send   reverb send (dB, 0 = equal energy)
  fade_in / fade_out  (s, equal-power)        env    optional [[t_abs, dB], ...] gain automation
  pan       optional static re-pan (-1..1)   track  optional {"shot", "name"} -> pan from tracker
  ref       what the cue is synced to         provisional  true = graphic timing not yet locked
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = json.load(open(os.path.join(HERE, "..", "timing", "shots.json"), encoding="utf-8"))
TOTAL = SHOTS["total_seconds"]
CUT = {s["id"]: s["start_s"] for s in SHOTS["shots"]}
END = {s["id"]: s["end_s"] for s in SHOTS["shots"]}
F = 1.0 / SHOTS["fps"]           # one frame


def w(shot, word, nth=0):
    """Start time of the nth occurrence of `word` (prefix match, case-insensitive) in `shot`."""
    hits = [x for x in next(s for s in SHOTS["shots"] if s["id"] == shot)["words"]
            if x["w"].lower().startswith(word.lower())]
    if len(hits) <= nth:
        raise KeyError(f"{word!r} #{nth} not in {shot}")
    return hits[nth]["s"]


CUES = []


def cue(id, shot, t, dur, gen, lvl, cls="spot", pre=0.0, space=None, send=-60.0, fade_in=0.005,
        fade_out=0.02, params=None, ref="", env=None, pan=None, track=None, provisional=False, note=""):
    c = dict(id=id, shot=shot, t=round(t, 4), pre=round(pre, 4), dur=round(dur, 4), gen=gen,
             params=params or {}, lvl=lvl, **{"class": cls}, space=space, send=send,
             fade_in=fade_in, fade_out=fade_out, ref=ref)
    if env:
        c["env"] = env
    if pan is not None:
        c["pan"] = pan
    if track:
        c["track"] = track
    if provisional:
        c["provisional"] = True
    if note:
        c["note"] = note
    CUES.append(c)


def bed(id, shot, a, b, gen, lvl, fin, fout, params=None, space="outdoor", send=-22.0, ref="", env=None, cls="amb", note=""):
    """Ambience bed covering [a, b] (absolute), with equal-power fades at both ends."""
    cue(id, shot, a, b - a, gen, lvl, cls=cls, pre=0.0, space=space, send=send, fade_in=fin, fade_out=fout,
        params=params, ref=ref, env=env, note=note)


def tick(id, shot, t, kind="callout", lvl=-30.0, pan=0.0, track=None, provisional=True, ref=""):
    cue(id, shot, t, 0.15, "ui_tick", lvl, cls="ui", pre=0.02, space="ui", send=-30.0,
        params=dict(sync=0.02, kind=kind), pan=pan, track=track, provisional=provisional, ref=ref)


# ============================================================== sh01 dawn meadow macro
s = "sh01"
X12 = CUT["sh02"]                      # light dissolve sh01 -> sh02, 0.8 s centred on the cut
bed("sh01.wind", s, 0.0, X12 + 0.4, "wind", -27, 0.35, 0.8, space="meadow", send=-22,
    params=dict(strength=1.0, gustiness=0.35, bright=0.8, low=0.03, veg=1.3, veg_lo=1600, veg_hi=10000,
                veg_density=0.8, width=0.95), ref="cut 0.00 (film start)", note="dawn breeze in dewy grass")
bed("sh01.birds", s, 0.0, X12 + 0.4, "birds", -30, 0.5, 0.8, space="meadow", send=-8,
    params=dict(n_birds=5, rate=0.35, dist=(0.55, 1.0), fmin=2800, fmax=6500, start=0.35),
    ref="cut 0.00", note="sparse distant dawn calls")
t = w(s, "karşılandığına") - F
cue("sh01.drop_detach", s, t, 0.9, "drop_detach", -33, pre=0.05, space="outdoor", send=-20,
    params=dict(sync=0.05, fall=0.78), ref="karşılandığına (drop swells, detaches)")
t = w(s, "şahit") - F
cue("sh01.drop_leaf", s, t, 1.1, "drop_on_leaf", -21, pre=0.1, space="outdoor", send=-16,
    params=dict(sync=0.1, size=1.0, spring=0.4), ref="şahit (drop lands on the seedling leaf)")
cue("sh01.flare_air", s, X12 + 0.05, 2.6, "bloom", -33, cls="amb", pre=0.6, space="outdoor", send=-24,
    fade_out=0.5, params=dict(sync=0.6, rise=0.6, decay=1.8, bright=0.8, low=0.2),
    ref="exit tilt into sun flare / light dissolve")

# ============================================================== sh02 + sh03 morning room
s = "sh02"
A = X12 - 0.4
B = CUT["sh04"]                        # hard graphic match cut
bed("sh02.room", s, A, B + 0.02, "room_tone", -42, 0.8, 0.04, space="room", send=-40,
    params=dict(warmth=1.0, bright=0.9), ref="light dissolve 5.24 -> hard cut 16.00")
bed("sh02.window_air", s, A, B + 0.02, "wind", -32, 0.8, 0.04, space="room", send=-12,
    params=dict(strength=1.0, gustiness=0.4, rate=0.1, bright=0.5, low=0.0, veg=1.0, veg_lo=1500, veg_hi=6000,
                veg_density=0.7, width=0.6), ref="soft air and leaves outside the open window")
bed("sh02.window_birds", s, A, B + 0.02, "birds", -34, 0.8, 0.04, space="room", send=-12,
    params=dict(n_birds=4, rate=0.25, dist=(0.65, 1.0), fmin=2600, fmax=6000, start=0.6),
    ref="outside the window", note="distant, through the open window")
t_ox = w(s, "oksijen")
cue("sh02.curtain", s, A, 6.0, "curtain", -26, cls="spot", space="room", send=-14, fade_in=0.8, fade_out=1.0,
    params=dict(peaks=[(4.45 - A, 0.45), (t_ox + 0.2 - A, 1.0)], period=4.0, breeze=0.7),
    ref="breath rhythm 2s/2s, biggest inhale on 'oksijen'", note="linen curtain + window breeze")
tick("sh02.callout_air", s, t_ox + 0.25, track={"shot": s, "name": "air"}, ref="callout O2 (after 'oksijen')")

s = "sh03"
cue("sh03.crust", s, w(s, "yemek"), 1.7, "crust_crackle", -36, pre=0.05, space="room", send=-18,
    fade_in=0.3, fade_out=0.6, params=dict(rate=16, pan=-0.35), ref="yemek (slider past the bread)")
t = w(s, "içmek") - F
cue("sh03.pour", s, t, 2.9, "pour", -21, pre=0.1, space="room", send=-13, fade_out=0.2,
    params=dict(sync=0.1, stop=1.72, fill0=0.1, fill1=0.72, drips=3, pan=0.1), ref="içmek (water hits the glass)")
tick("sh03.callout_water", s, t + 0.7, track={"shot": s, "name": "water"}, ref="water callout (if used)")
cue("sh03.jug_set", s, t + 2.25, 0.7, "jug_set", -28, pre=0.05, space="room", send=-14,
    params=dict(sync=0.05, pan=0.3), ref="jug set down after the pour (camera craning up on 'bütün')")
t = w(s, "takdim") - F
cue("sh03.plate", s, t, 0.95, "plate_slide", -24, pre=0.05, space="room", send=-15,
    params=dict(sync=0.05, length=0.55, pan=0.0), ref="takdim (plate slides toward camera)")

# ============================================================== sh04 cracked earth, noon
s = "sh04"
A, B = CUT["sh04"], CUT["sh05"]
t_reach = w(s, "hiçbirine")
bed("sh04.wind", s, A - 0.02, B + 0.03, "wind", -25, 0.04, 0.05, space="desert", send=-24,
    params=dict(strength=1.0, gustiness=0.7, rate=0.12, bright=0.9, low=0.05, veg=0.3, veg_lo=2600, veg_hi=9000,
                veg_density=0.35, width=1.0, events=[[0.25, 0.8, 0.3], [t_reach + 0.4 - A, -0.9, 0.9]]),
    ref="hard cut 16.00 (dry gust on the cut); wind falls away as the hand reaches")
bed("sh04.ticks", s, A, B, "dry_ticks", -34, 0.1, 0.05, space="desert", send=-24, cls="amb",
    params=dict(rate=2.5), ref="parched ground")
cue("sh04.sleeve", s, t_reach - 0.15, 1.7, "cloth", -29, pre=0.0, space="desert", send=-22, fade_in=0.05, fade_out=0.3,
    params=dict(motion=[[0, 0], [0.25, 0.9], [0.7, 0.55], [1.2, 0.25], [1.7, 0]], fabric="cotton", air=0.6, width=0.3),
    ref="hiçbirine (hand rises into frame, stretches up)")

# ============================================================== sh05 underwater
s = "sh05"
A, B = CUT["sh05"], CUT["sh06"]
cue("sh05.immerse", s, A, 1.6, "immerse", -23, pre=0.12, space="underwater", send=-12,
    params=dict(sync=0.12), ref="match cut on the sun: into the water")
bed("sh05.water", s, A - 0.02, B + 0.25, "underwater", -29, 0.05, 0.45, space="underwater", send=-14,
    params=dict(slosh=0.6, clicks=0.3, bubbles=0.3), ref="cut 22.95 -> shape match 30.10")
t_ox = w(s, "oksijenler")
cue("sh05.o2_streams", s, w(s, "bize"), B - w(s, "bize"), "bubble_streams", -27, pre=0.0, space="underwater",
    send=-12, fade_in=0.8, fade_out=0.15,
    params=dict(streams=7, rate=2.5, density=[[0, 0.3], [1.5, 1.0]],
                hero=dict(pan=0.0, rate=5.0, gain=2.2, start=t_ox - w(s, "bize")), muffle=6000),
    ref="camera tilts down to the plants; hero stream from 'oksijenler'")
tick("sh05.callout_bubble", s, t_ox + 0.2, track={"shot": s, "name": "bubble"}, ref="callout O2 fotosentez")
cue("sh05.bubble_lens", s, B - 0.08, 0.95, "bubble_pass", -22, pre=0.45, space="underwater", send=-12,
    params=dict(sync=0.45, r=4.5e-3), ref="exit: hero bubble rises into the lens")

# ============================================================== sh06 blood vessel
s = "sh06"
A, B = CUT["sh06"], CUT["sh07"]
t_kan = w(s, "kan")
anchor = t_kan - 0.08                  # S1 just before the strongest surge on 'kan'
a0 = A - 0.55                          # heartbeat pre-laps under the end of sh05 (J-cut)
cue("sh06.heart", s, anchor, B + 0.9 - a0, "heartbeat", -21, pre=anchor - a0, space="body", send=-14,
    fade_in=0.3, fade_out=0.6,
    params=dict(anchor=anchor - a0, period=60 / 72, muffle=480, body=0.7,
                strength=[[0, 0.0], [0.25, 0.25], [0.6, 0.6], [anchor - a0, 1.0], [anchor - a0 + 0.5, 0.78],
                          [B - a0 - 0.5, 0.75], [B - a0 + 0.2, 0.35], [B - a0 + 0.9, 0.0]]),
    ref="72 bpm, strongest S1 on 'kan' 31.50; J-cut from 29.55")
b0 = A - 0.2
cue("sh06.flow", s, anchor, B + 0.6 - b0, "blood_flow", -28, cls="amb", pre=anchor - b0, space="body", send=-12,
    fade_in=0.3, fade_out=0.6,
    params=dict(anchor=anchor - b0, period=60 / 72, base=0.35,
                strength=[[0, 0.6], [anchor - b0, 1.3], [anchor - b0 + 0.8, 0.9], [B - b0 - 0.7, 1.0],
                          [B - b0 - 0.1, 1.6], [B - b0 + 0.6, 0.5]]),
    ref="plasma surging with each systole")
cue("sh06.surge_wipe", s, B - 0.12, 1.0, "whoosh", -26, cls="amb", pre=0.4, space="body", send=-12, fade_out=0.3,
    params=dict(sync=0.4, f_from=160, f_peak=650, f_to=260, pan_from=-0.2, pan_to=0.2, bw=1.6, rough=0.5),
    ref="exit: red surge wipes the frame")
tick("sh06.callout_rbc", s, w(s, "an") + 0.05, track={"shot": s, "name": "rbc"}, ref="callout Alyuvar")
tick("sh06.callout_heart", s, w(s, "ama") + 0.3, track={"shot": s, "name": "heart"}, ref="callout Kalp")

# ============================================================== sh07 open sea at dawn
s = "sh07"
A, B = CUT["sh07"], CUT["sh08"]
bed("sh07.sea", s, A - 0.3, B + 0.3, "ocean", -25, 0.6, 0.6, space="outdoor", send=-22,
    params=dict(period=8.0), ref="colour-match dissolve 35.70 -> light dissolve 40.60")
t_sun = w(s, "güneş")
cue("sh07.sunrise_air", s, t_sun - F, 3.1, "bloom", -28, cls="amb", pre=0.6, space="outdoor", send=-20,
    fade_out=0.6, params=dict(sync=0.6, rise=0.55, decay=2.4, bright=1.0, low=0.4),
    ref="güneş (sun rim breaks the horizon, light floods)")
tick("sh07.callout_sun", s, t_sun + 0.7, track={"shot": s, "name": "sun"}, ref="callout ~150 milyon km")

# ============================================================== sh08 hand & apple
s = "sh08"
A, B = CUT["sh08"], CUT["sh09"]
bed("sh08.room", s, A - 0.3, B + 0.2, "room_tone", -40, 0.6, 0.5, space="room", send=-40,
    params=dict(warmth=1.0, bright=0.9), ref="light dissolve 40.60")
bed("sh08.window_air", s, A - 0.3, B + 0.2, "wind", -31, 0.6, 0.5, space="room", send=-12,
    params=dict(strength=1.0, gustiness=0.4, rate=0.1, bright=0.5, low=0.0, veg=1.0, veg_lo=1500, veg_hi=6000,
                veg_density=0.7, width=0.6), ref="soft air and leaves outside the window")
bed("sh08.window_birds", s, A - 0.3, B - 0.2, "birds", -31, 0.6, 0.8, space="room", send=-12,
    params=dict(n_birds=3, rate=0.25, dist=(0.65, 1.0), fmin=2600, fmax=6000, start=0.5), ref="outside the window")
t = w(s, "uzanıp")
cue("sh08.sleeve", s, t - 0.2, 1.7, "cloth", -28, space="room", send=-16, fade_out=0.3,
    params=dict(motion=[[0, 0], [0.25, 0.85], [0.8, 0.6], [1.2, 0.2], [1.7, 0]], fabric="cotton", air=0.5, width=0.3, pan=0.45),
    ref="uzanıp (hand enters from the right)")
t = w(s, "alırken") - F
cue("sh08.grab", s, t, 0.35, "grab", -26, pre=0.05, space="room", send=-16, params=dict(sync=0.05, pan=0.1),
    ref="alırken (fingers close around the apple)")
cue("sh08.lift", s, t + 0.3, 0.45, "lift", -32, pre=0.03, space="room", send=-16, params=dict(sync=0.03, pan=0.1),
    ref="apple leaves the table")
t = w(s, "aslında")
cue("sh08.pulse_in", s, t, B + 4.9 - t, "heartbeat", -26, cls="amb", pre=0.0, space="body", send=-14,
    fade_in=1.5, fade_out=0.8,
    params=dict(anchor=1.0, period=60 / 70, muffle=320, body=0.6,
                strength=[[0, 0.0], [1.0, 0.2], [B - t - 0.4, 0.55], [B - t + 0.6, 0.8], [B - t + 4.9, 0.6]]),
    ref="aslında: camera pushes along the forearm - the body's pulse rises (runs on under sh09)")
t = w(s, "değil")
cue("sh08.into_skin", s, B, 1.4, "whoosh", -24, cls="amb", pre=0.75, space="body", send=-12, fade_out=0.3,
    params=dict(sync=0.75, f_from=2600, f_peak=1100, f_to=200, pan_from=0.3, pan_to=0.0, bw=1.5, rough=0.4),
    ref="değil: push into the skin -> tissue (zoom-through at the cut)")

# ============================================================== sh09 nerve, muscle, cell
s = "sh09"
A, B = CUT["sh09"], CUT["sh10"]
bed("sh09.body", s, A - 0.2, B + 0.4, "body_amb", -30, 0.4, 0.6, space="body", send=-10,
    params=dict(wet=1.0, creaks=0.4), ref="inside the forearm")
t = w(s, "kaslarda") - F
cue("sh09.nerve", s, t, 0.95, "nerve", -23, pre=0.05, space="body", send=-14,
    params=dict(sync=0.05, n_nodes=9, span=0.42, pan_from=-0.6, pan_to=0.6), ref="kaslarda (impulse races node to node)")
cue("sh09.muscle", s, t + 0.47, 1.4, "muscle", -25, pre=0.05, space="body", send=-12,
    params=dict(sync=0.05, hold=0.3, release=0.45), ref="impulse arrives: fibres contract in a ripple")
tick("sh09.callout_nerve", s, t + 0.2, track={"shot": s, "name": "nerve"}, ref="callout Sinir sinyali")
t = w(s, "hücrelerde")
cue("sh09.dive", s, t + 0.2, 1.2, "whoosh", -26, cls="amb", pre=0.5, space="body", send=-10, fade_out=0.3,
    params=dict(sync=0.5, f_from=1500, f_peak=650, f_to=180, pan_from=0.0, pan_to=0.0, bw=1.6, rough=0.6),
    ref="hücrelerde (camera dives into one cell)")
tick("sh09.callout_fiber", s, t + 0.1, track={"shot": s, "name": "fiber"}, ref="callout Kas lifi")
cue("sh09.mito", s, t + 0.5, B + 0.5 - (t + 0.5), "sparkle", -32, cls="amb", space="body", send=-10,
    fade_in=0.8, fade_out=0.5, params=dict(rate=[[0, 15], [1.5, 35]], bright=0.8, far=0.5, width=0.7),
    ref="cytoplasm, mitochondria humming with energy (granular, not tonal)")
tick("sh09.callout_mito", s, w(s, "olup") + 0.1, track={"shot": s, "name": "mito"}, ref="callout Mitokondri")

# ============================================================== sh10 countless cells
s = "sh10"
A, B = CUT["sh10"], CUT["sh11"]
cue("sh10.pullback", s, A + 0.45, 1.3, "whoosh", -25, cls="amb", pre=0.45, space="body", send=-10, fade_out=0.3,
    params=dict(sync=0.45, f_from=260, f_peak=1000, f_to=2200, pan_from=0.0, pan_to=0.0, bw=1.8, rough=0.5),
    ref="pull back out through the membrane")
bed("sh10.field", s, A - 0.2, B + 0.3, "body_amb", -28, 0.6, 0.6, space="micro", send=-10,
    params=dict(wet=0.5, creaks=0.2, depth=1.5), ref="vast field of living cells")
t1, t2, t3 = w(s, "bildiğimiz"), w(s, "bilmediğimiz"), w(s, "hadsiz")
cue("sh10.lights_one", s, t1 - F, t2 + 0.8 - (t1 - F), "sparkle", -28, pre=0.0, space="micro", send=-12, fade_out=0.6,
    params=dict(rate=11.0, bright=1.0, far=0.1, width=0.8), ref="bildiğimiz (cells light up one after another)")
cue("sh10.lights_wave", s, t2 - F, B + 0.35 - (t2 - F), "sparkle", -26, pre=0.0, space="micro", send=-10,
    fade_in=0.4, fade_out=0.5,
    params=dict(rate=[[0, 40], [t3 - t2, 450], [t3 - t2 + 0.8, 900], [B - t2 - 0.5, 700], [B - t2 + 0.35, 250]],
                bright=0.9, far=0.75, sweep=[[0, -0.9], [t3 - t2 + 0.6, 0.9], [B - t2, 0.0]]),
    ref="bilmediğimiz -> hadsiz: waves of tiny lights to infinity")
tick("sh10.counter", s, t3 + 0.15, track={"shot": s, "name": "cells"}, ref="counter ~37 trilyon hücre")

# ============================================================== sh11 rain on the seedling
s = "sh11"
A, B = CUT["sh11"], CUT["sh12"]
t_b, t_ay, t_k = w(s, "bütün"), w(s, "ayağımıza"), w(s, "karşılanıyor")
cue("sh11.thunder", s, A - 0.05, 5.0, "thunder", -27, cls="amb", pre=0.1, space="outdoor_big", send=-8,
    fade_out=0.8, params=dict(sync=0.1, dist=1.3), ref="dark rain sky (distant thunder roll)")
a0 = A - 0.4
r = lambda x: round(x - a0, 3)
bed("sh11.rain", s, a0, B + 0.7, "rain", -28, 0.6, 0.8, space="outdoor", send=-20,
    params=dict(near=[[0, 0], [r(t_b), 0.15], [r(t_b + 1.0), 0.4], [r(t_ay), 0.85], [r(t_k), 0.7], [r(t_k + 0.4), 0.35], [r(B + 0.7), 0.2]],
                mid=[[0, 0], [r(t_b), 0.1], [r(t_b + 1.2), 0.5], [r(t_ay), 0.9], [r(t_k), 0.8], [r(t_k + 0.6), 0.4], [r(B + 0.7), 0.3]],
                far=[[0, 0.15], [r(t_b), 0.3], [r(t_b + 1.4), 0.8], [r(t_k), 0.9], [r(t_k + 0.6), 0.6], [r(B + 0.7), 0.5]],
                wet=[[0, 0], [r(t_b + 0.8), 0.1], [r(t_ay - 0.6), 0.6], [r(t_ay + 0.4), 0.95]],
                leaf=0.1, water=0.06),
    ref="first drops on 'bütün', heavy at 'ayağımıza', thinning at 'karşılanıyor'")
cue("sh11.first_drops", s, t_b - F, 1.6, "heavy_drops", -21, pre=0.05, space="outdoor", send=-16,
    params=dict(times=[0.05, 0.27, 0.42, 0.7, 0.97, 1.12], pans=[0.0, -0.45, 0.35, -0.2, 0.55, -0.6],
                amps=[1.0, 0.6, 0.8, 0.5, 0.7, 0.45], surface="dust"),
    ref="bütün (first heavy drops hit the dust: crowns, puffs)")
cue("sh11.trickle", s, t_ay - 0.3, 2.7, "trickle", -26, pre=0.0, space="outdoor", send=-18, fade_in=0.3, fade_out=0.5,
    params=dict(flow=[[0, 0], [0.4, 0.6], [1.2, 1.0], [2.2, 0.8], [2.7, 0.4]], approach=[[0, 0.3], [1.3, 1.0]], pan=0.0),
    ref="ayağımıza (water trickles along the cracks toward camera)")
cue("sh11.leaf_hits", s, t_ay + 0.5, 1.2, "leaf_hits", -24, pre=0.05, space="outdoor", send=-16,
    params=dict(times=[0.05, 0.4, 0.86], pans=[0.0, -0.2, 0.15], amps=[1.0, 0.75, 0.9]),
    ref="drops hit the seedling's leaves, they bounce")

# ============================================================== sh12 aerial
s = "sh12"
A, B = CUT["sh12"], CUT["sh13a"]
cue("sh12.cloud", s, A + 0.25, 2.2, "whoosh", -26, cls="amb", pre=0.85, space="aerial", send=-12, fade_out=0.5,
    params=dict(sync=0.85, f_from=300, f_peak=1300, f_to=420, pan_from=-0.5, pan_to=0.5, bw=2.2, rough=0.7),
    ref="tilt up into the rain sky -> emerge from cloud into sunlight")
bed("sh12.altitude", s, A - 0.25, B + 0.45, "wind", -27, 0.6, 0.8, space="aerial", send=-16,
    params=dict(strength=1.0, gustiness=0.3, rate=0.06, bright=1.3, low=0.03, width=1.0,
                events=[[B - 0.6 - (A - 0.25), 0.3, 0.6]]),
    ref="vast open air high above the land; swells as we descend")
t = w(s, "bir")
cue("sh12.one_source", s, t - F, 4.2, "sub", -22, cls="sub", pre=0.55, space="aerial", send=-14, fade_out=0.8,
    params=dict(sync=0.55, decay=3.0, body=0.6, pre=0.5), ref="bir tek (sun upper centre - one single source)")
cue("sh12.one_air", s, t - F, 3.6, "bloom", -30, cls="amb", pre=0.4, space="aerial", send=-16, fade_out=0.8,
    params=dict(sync=0.4, rise=0.4, decay=3.0, bright=0.8, low=0.2), ref="bir tek")
for i, (dt, pn, nm) in enumerate([(0.45, 0.0, "sun"), (0.72, -0.55, "sea"), (0.98, 0.45, "cloud"), (1.26, 0.65, "rain"),
                                  (1.52, -0.3, "river"), (1.8, -0.65, "forest")]):
    tick(f"sh12.link_{nm}", s, t + dt, kind="link", lvl=-34, pan=pn, track={"shot": s, "name": nm},
         ref="post: glowing line links this element (timing provisional)")

# ============================================================== sh13a/b golden meadow
s = "sh13a"
A, B = CUT["sh13a"], CUT["sh14a"]
t_hr = w(s, "Haluk")
bed("sh13.meadow", s, A - 0.35, B + 0.4, "wind", -28, 0.8, 0.8, space="meadow", send=-20,
    params=dict(strength=0.85, gustiness=0.45, rate=0.09, bright=0.9, low=0.03, veg=1.3, veg_lo=1800, veg_hi=9000,
                veg_density=1.2, width=1.0, events=[[t_hr + 0.5 - (A - 0.35), 0.9, 0.9]]),
    ref="golden-hour meadow (warm breeze across the grass on 'Halık-ı Rahîm')")
bed("sh13.birds", s, A - 0.35, B + 0.4, "birds", -29, 0.8, 0.8, space="meadow", send=-8,
    params=dict(n_birds=7, rate=0.3, dist=(0.35, 1.0), fmin=2200, fmax=6800, start=0.8),
    ref="forest edge, birds far away")
gb = [0.25, 1.1, 1.85, 2.7, 3.45, 4.2]
cue("sh13a.grass_lens", s, A + gb[0], 4.6, "grass_brush", -27, pre=0.0, space="meadow", send=-18, fade_out=0.3,
    params=dict(times=[x - gb[0] for x in gb], pans=[-0.6, 0.55, -0.35, 0.7, -0.7, 0.4], amps=[0.8, 1.0, 0.7, 0.9, 0.8, 0.6]),
    ref="low glide: grass and flowers brushing past the lens (until the camera rises)")
cue("sh13a.bee", s, A + 2.2, 2.6, "bee", -35, pre=1.3, space="meadow", send=-16, fade_in=0.2, fade_out=0.3,
    params=dict(sync=1.3, dist=0.7, pan_from=-0.8, pan_to=0.6, f0=218), ref="a bee crosses in front of the camera")
cue("sh13a.rahim_air", s, t_hr - F, 4.6, "bloom", -29, cls="amb", pre=0.5, space="meadow", send=-16, fade_out=1.0,
    params=dict(sync=0.5, rise=0.5, decay=3.5, bright=0.7, low=0.35),
    ref="Halık-ı Rahîm (camera rises, warm light spreads over the meadow)")

s = "sh13b"
ring_words = [("birer", 0), ("birer", 1), ("görüp", 0), ("gözetip", 0), (None, None), ("idare", 0), ("ettiğini", 0), ("gösterir", 0)]
rt = []
for wd, k in ring_words:
    rt.append(None if wd is None else w(s, wd, k))
rt[4] = round((rt[3] + rt[5]) / 2, 2)
fallback = [-0.45, 0.5, -0.2, 0.35, -0.55, 0.15, 0.6, 0.0]
for i, (tt, pn) in enumerate(zip(rt, fallback)):
    nm = "abcdefgh"[i]
    tick(f"sh13b.ring_{nm}", s, tt - F, kind="ring", lvl=-29 if i < 7 else -27, pan=pn,
         track={"shot": s, "name": nm}, provisional=False,
         ref=f"birer birer: tracking ring {i + 1}/8 on TRK_{nm} (lands with the word onsets)")
cue("sh13b.bee", s, rt[1], 2.2, "bee", -35, pre=0.7, space="meadow", send=-16, fade_in=0.2, fade_out=0.3,
    params=dict(sync=0.7, dist=0.45, pan_from=0.6, pan_to=-0.1, f0=226), ref="the bee found by ring b")

# ============================================================== sh14a sunflowers at sunrise
s = "sh14a"
A, B = CUT["sh14a"], CUT["sh14b"]
t_allah = w(s, "Allah")
bed("sh14a.field", s, A - 0.4, B + 0.08, "wind", -26, 0.8, 0.35, space="meadow", send=-20,
    params=dict(strength=0.8, gustiness=0.4, rate=0.08, bright=0.85, low=0.03, veg=1.0, veg_lo=900, veg_hi=6000,
                veg_density=0.8, width=1.0, events=[[t_allah - 0.5 - (A - 0.4), 0.8, 1.2]]),
    ref="sunrise field, big papery sunflower leaves; dissolve in, shadow cuts it at 99.50")
bed("sh14a.birds", s, A - 0.4, B + 0.05, "birds", -28, 0.8, 0.3, space="meadow", send=-8,
    params=dict(n_birds=6, rate=0.3, dist=(0.4, 1.0), fmin=2400, fmax=6600, start=0.8,
                density=[[0, 0.6], [B - A, 1.5]]), ref="dawn calls, growing toward 'Allah'")
t = w(s, "görüyormuşçasına")
cue("sh14a.turn", s, t - F, 2.7, "stalks_turn", -27, pre=0.1, space="meadow", send=-16, fade_out=0.4,
    params=dict(sync=0.1, length=1.4), ref="görüyormuşçasına (all flower heads turn toward the sun)")
tick("sh14a.spiral", s, w(s, "hikmetli") - F, kind="link", lvl=-34, track={"shot": s, "name": "spiral"},
     ref="post overlays the Fibonacci spiral arcs (timing provisional)")
cue("sh14a.allah_sub", s, t_allah - F, 2.6, "sub", -23, cls="sub", pre=0.6, space="meadow", send=-14,
    fade_out=0.7, params=dict(sync=0.6, decay=2.0, body=0.5, pre=0.55),
    ref="Allah (the light grows into a radiant sunrise)")
cue("sh14a.allah_air", s, t_allah - F, 1.8, "bloom", -29, cls="amb", pre=0.6, space="meadow", send=-16, fade_out=0.5,
    params=dict(sync=0.6, rise=0.6, decay=1.4, bright=0.9, low=0.3), ref="Allah")

# ============================================================== sh14b the covered light
s = "sh14b"
A, B = CUT["sh14b"], CUT["sh14c"]
cue("sh14b.shadow", s, A + 0.05, 1.7, "whoosh", -25, cls="amb", pre=0.45, space="dark", send=-10, fade_out=0.4,
    params=dict(sync=0.45, f_from=900, f_peak=420, f_to=110, pan_from=0.7, pan_to=-0.7, bw=1.6, rough=0.4),
    ref="shadow sweeps in, darkness")
bed("sh14b.dark", s, A - 0.1, B + 0.3, "room_tone", -40, 0.3, 0.6, space="dark", send=-20,
    params=dict(warmth=0.6, bright=0.5, width=0.8), ref="dark space")
t_ort = w(s, "örtmek")
land = t_ort + 0.07
cue("sh14b.flame", s, A - 0.1, B + 0.3 - (A - 0.1), "flame", -31, pre=0.0, space="dark", send=-12, fade_in=0.5, fade_out=0.6,
    params=dict(muffle_at=land - (A - 0.1), muffle_len=0.35), ref="small oil-lamp flame; muffled under the cloth")
cue("sh14b.cloth", s, land, 2.7, "cloth_fall", -19, pre=0.6, space="dark", send=-9, fade_out=0.5,
    params=dict(sync=0.6, fall=0.5, settle=1.4), ref="örtmek (heavy velvet cloth falls over the light)")

# ============================================================== sh14c cold lifeless desert
s = "sh14c"
A, B = CUT["sh14c"], CUT["sh15"]
t_su, t_iz = w(s, "şuursuz"), w(s, "izah")
a0 = A - 0.3
silence = [[a0, 0.0], [t_iz - 0.1, 0.0], [t_iz + 0.45, -15.0], [B, -22.0]]
bed("sh14c.wind", s, a0, B + 0.05, "wind", -23, 0.6, 0.05, space="desert", send=-22,
    params=dict(strength=1.0, gustiness=0.55, rate=0.1, bright=0.7, hollow=1.0, low=0.04, width=1.0,
                events=[[t_su + 0.1 - a0, 1.2, 0.5]]),
    env=silence, ref="cold hollow wind; gust on 'şuursuz'; drops to near-silence on 'izah edebilir mi'")
cue("sh14c.sand", s, A, B - A, "sand", -24, cls="amb", space="desert", send=-24, fade_in=0.6, fade_out=0.05,
    params=dict(strength=1.0, gustiness=0.5, threshold=0.42, events=[[t_su + 0.15 - A, 2.2, 0.45]]),
    env=silence, ref="sand blows aimlessly on 'şuursuz'")

# ============================================================== sh15 rahle and red books
s = "sh15"
A = CUT["sh15"]
cue("sh15.sunbeam", s, A + 0.2, 3.2, "bloom", -32, cls="amb", pre=0.5, space="room_wood", send=-18, fade_out=0.8,
    params=dict(sync=0.5, rise=0.5, decay=2.5, bright=0.55, low=0.3), ref="warm sunbeam sweeps across the room")
bed("sh15.room", s, A - 0.3, TOTAL, "room_tone", -39, 0.6, 1.8, space="room_wood", send=-40,
    params=dict(warmth=1.2, bright=0.8), ref="quiet old wooden room; fades to silence at the end")
bed("sh15.window_air", s, A - 0.3, TOTAL, "wind", -31, 0.8, 1.8, space="room_wood", send=-12,
    params=dict(strength=1.0, gustiness=0.35, rate=0.08, bright=0.45, low=0.0, veg=1.0, veg_lo=1400, veg_hi=5500,
                veg_density=0.6, width=0.6), ref="warm air and leaves outside the window")
bed("sh15.window_birds", s, A - 0.3, TOTAL, "birds", -31, 0.8, 1.8, space="room_wood", send=-12,
    params=dict(n_birds=4, rate=0.22, dist=(0.65, 1.0), fmin=2600, fmax=6000, start=1.0), ref="warm morning outside")
t721 = w(s, "721")
cue("sh15.book_open", s, t721 + 0.22, 1.0, "book_open", -23, pre=0.32, space="room_wood", send=-14,
    params=dict(sync=0.32, pan=0.0), ref="721: Sözler opens on the rahle (creak from the word, cover lands)")
cue("sh15.riffle", s, t721 + 0.26, 0.9, "riffle", -25, pre=0.04, space="room_wood", send=-15,
    params=dict(sync=0.04, n_pages=12, length=0.5, pan_from=0.35, pan_to=-0.35), ref="pages run to 721")
cue("sh15.page_721", s, t721 + 0.64, 0.8, "page_turn", -24, pre=0.06, space="room_wood", send=-14,
    params=dict(sync=0.06, length=0.3, pan=0.15), ref="last page settles on 721 (in the pause before 'sayfasında')")
tick("sh15.callout_page", s, t721 + 1.0, track={"shot": s, "name": "page"}, ref="page-number callout")

CUES.sort(key=lambda c: (c["t"] - c["pre"], c["id"]))
out = {"sr": 48000, "total_seconds": TOTAL, "version": 1,
       "doc": "Sound timeline (absolute seconds). Generated by build_cues.py from timing/shots.json; rendered by mix.py.",
       "cuts": CUT, "cues": CUES}
json.dump(out, open(os.path.join(HERE, "cues.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(CUES), "cues ->", os.path.join(HERE, "cues.json"))
