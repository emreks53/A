"""build_cues.py - writes audio/cues.json, the film's sound timeline (absolute seconds).

Sync sources, in order of authority:
  1. PIC  - hits spotted frame by frame on the rendered picture (frame numbers below; re-spot when
            a shot is re-rendered).  Contacts, landings and cuts are placed here, never on word times.
  2. comp/sync_points.json - the moments the overlay graphics land (callouts, rings, network
            nodes, spiral, counter, ECG).  Every UI tick sits exactly on its graphic.
  3. the narration itself - accents tied to a word sit on the word's real voice onset, measured
            from narration.m4a (Whisper's word starts include the preceding pause).
  4. timing/shots.json word / cut times - for shots that exist only as slates (the studios
            animate those beats to these times).
Run:  python3 build_cues.py   (needs numpy and ffmpeg)

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
  lpf       optional [[t_abs, fc_hz], ...] time-varying low-pass (e.g. sound going under water)
  lf_shelf  optional dB of the <60 Hz shelf (default -5 for amb/spot, 0 = keep full weight)
  pan       optional static re-pan (-1..1)   track  optional {"shot", "name"} -> pan from tracker
  peak_cap  optional sample-peak cap (dBFS) for the levelled cue
  (ui ticks are levelled by sample peak instead: their lvl is in dBFS)
  ref       what the cue is synced to         provisional  true = graphic/picture timing not locked
"""
import difflib
import json
import os
import subprocess
import sys
import unicodedata

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import measure  # noqa: E402  (key-word list shared with the QA metrics)

SHOTS = json.load(open(os.path.join(VIDEO, "timing", "shots.json"), encoding="utf-8"))
TOTAL = SHOTS["total_seconds"]
FPS = SHOTS["fps"]
CUT = {s["id"]: s["start_s"] for s in SHOTS["shots"]}
END = {s["id"]: s["end_s"] for s in SHOTS["shots"]}
F = 1.0 / FPS                    # one frame
SR = 48000


# ------------------------------------------------------------------ word lookup (accent tolerant)
def _norm(s):
    s = s.replace("ı", "i").replace("İ", "i").lower()
    return "".join(ch for ch in unicodedata.normalize("NFKD", s) if not unicodedata.combining(ch))


def word(shot, wd, nth=0):
    """The nth word of `shot` matching `wd`: prefix match ignoring case and Turkish diacritics
    (ı/i, ş/s, ğ/g, ç/c, ö/o, ü/u, â/î/û), falling back to a fuzzy match (>= 0.75) so that a
    corrected transcription (e.g. 'Haluk' -> 'Halık') does not break the build."""
    ws = next(s for s in SHOTS["shots"] if s["id"] == shot)["words"]
    nw = _norm(wd)
    hits = [x for x in ws if _norm(x["w"]).startswith(nw)]
    if len(hits) <= nth:
        hits = [x for x in ws if difflib.SequenceMatcher(None, nw, _norm(x["w"])[:len(nw)]).ratio() >= 0.75]
    if len(hits) <= nth:
        raise KeyError(f"{wd!r} #{nth} not in {shot}: {[x['w'] for x in ws]}")
    return hits[nth]


def w(shot, wd, nth=0):
    """Transcript start time of a word (used for beats the studios animate to)."""
    return word(shot, wd, nth)["s"]


# ------------------------------------------------------------------ the narration's real onsets
def _voice_env():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(HERE, "narration.m4a"), "-f", "f32le",
                          "-ac", "1", "-ar", str(SR), "-"], check=True, capture_output=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    win, hop = int(0.01 * SR), int(0.0025 * SR)
    c = np.concatenate([[0.0], np.cumsum(v * v)])
    st = np.arange(0, len(v) - win, hop)
    return (st + win / 2) / SR, 10 * np.log10((c[st + win] - c[st]) / win + 1e-14)


ENV_T, ENV_DB = _voice_env()
VOICED = ENV_DB > -38.0


def on(shot, wd, nth=0):
    """Voice-energy onset of a word: first 10 ms frame inside the word's span that is within 22 dB
    of the word's peak (and above -38 dBFS)."""
    x = word(shot, wd, nth)
    m = (ENV_T >= x["s"] - 0.02) & (ENV_T <= x["e"])
    if not m.any():
        return x["s"]
    thr = max(-38.0, ENV_DB[m].max() - 22.0)
    i = np.where(m & (ENV_DB > thr))[0]
    return round(float(ENV_T[i[0]] - 0.005), 3) if len(i) else x["s"]


def _pauses(min_len=0.18):
    out, i, n = [], 0, len(VOICED)
    while i < n:
        if VOICED[i]:
            i += 1
            continue
        j = i
        while j < n and not VOICED[j]:
            j += 1
        if ENV_T[min(j, n - 1)] - ENV_T[i] >= min_len:
            out.append((float(ENV_T[i]), float(ENV_T[min(j, n - 1)])))
        i = j
    return out


PAUSES = _pauses()


def pause_near(t, min_len=0.3):
    """Centre of the narration pause (>= min_len s) nearest to t: where a swell or gust can bloom
    without covering a word."""
    p = min((p for p in PAUSES if p[1] - p[0] >= min_len), key=lambda p: abs((p[0] + p[1]) / 2 - t))
    return round((p[0] + p[1]) / 2, 3)


# ------------------------------------------------------------------ overlay graphics
_SP = json.load(open(os.path.join(VIDEO, "comp", "sync_points.json"), encoding="utf-8"))["points"]
SYNC = {p["id"]: p["t"] for p in _SP}
SYNC_ALIAS = {"sh08.callout_hand": "co_hand"}


def graphic_t(cue_id, fallback):
    """Time the overlay graphic for this tick lands (comp/sync_points.json), else the fallback."""
    t = SYNC.get(cue_id, SYNC.get(SYNC_ALIAS.get(cue_id, ""), None))
    return (fallback, True) if t is None or isinstance(t, list) else (float(t), False)


# ------------------------------------------------------------------ picture-spotted hits
# film frame numbers (24 fps) read off the shot renders/animatics, frame-by-frame contact sheets.
PIC = {
    # sh01 animatic (review/sh01, 22:02): neck pinches f89-90, drop free at f91-92 (satellite
    # droplet above), touches the leaf between f100 and f101, flattened at f101
    "sh01.detach": 91.5, "sh01.land": 100.6,
    # sh08 animatic (review/sh08, 22:06): hand enters top right f989, fingertip touches the apple
    # f993, grip closes f1011-1013, apple's shadow separates (lift-off) f1022
    "sh08.enter": 989, "sh08.touch": 993, "sh08.grip": 1012, "sh08.lift": 1022,
    # sh14b animatic (review/sh14b, 22:25): cloth enters f2453, top of the cloth over the chimney
    # and the flame gone f2461, hem lands on the table f2463, fully draped f2465
    "sh14b.enter": 2453, "sh14b.flame_out": 2461, "sh14b.land": 2463,
    # sh15 animatic (sh15/anim1, 22:20 - shot still in work, re-spot on the final render): hard cut
    # from the closed cover to the open book at f2721.5; pages land f2728, f2735.5, last page
    # settles on 721 at f2744 (in the pause after '721')
    "sh15.open_cut": 2721.5, "sh15.page1": 2728, "sh15.page2": 2735.5, "sh15.page3": 2744,
}
P = {k: round(v / FPS, 4) for k, v in PIC.items()}
PIC_PROVISIONAL = {"sh15.open_cut", "sh15.page1", "sh15.page2", "sh15.page3"}

# ------------------------------------------------------------------ key words (birds stay off them)
KEY = measure.key_words(measure.all_words(), _SP)
KEY_SPANS = sorted({(round(x["s"], 3), round(x["e"], 3)) for x in KEY})


def avoid_spans(a, b):
    """Key-word spans overlapping [a, b], cue-relative."""
    return [[round(s - a, 3), round(e - a, 3)] for s, e in KEY_SPANS if e > a and s < b]


CUES = []


def cue(id, shot, t, dur, gen, lvl, cls="spot", pre=0.0, space=None, send=-60.0, fade_in=0.005,
        fade_out=0.02, params=None, ref="", env=None, pan=None, track=None, provisional=False, note="", **extra):
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
    c.update(extra)
    CUES.append(c)


def bed(id, shot, a, b, gen, lvl, fin, fout, params=None, space="outdoor", send=-22.0, ref="", env=None, cls="amb",
        note="", **extra):
    """Ambience bed covering [a, b] (absolute), with equal-power fades at both ends."""
    cue(id, shot, a, b - a, gen, lvl, cls=cls, pre=0.0, space=space, send=send, fade_in=fin, fade_out=fout,
        params=params, ref=ref, env=env, note=note, **extra)


def birds(id, shot, a, b, lvl, fin, fout, space, n_birds=4, fmin=2600, fmax=6200, start=0.6, density=None, ref="",
          rate=0.18):
    """Distant bird bed: ~0.18 bouts/s, far away (air absorption, ground reflection), dry-ish,
    never on a key word."""
    p = dict(n_birds=n_birds, rate=rate, dist=(0.65, 1.0), fmin=fmin, fmax=fmax, start=start,
             avoid=avoid_spans(a, b))
    if density:
        p["density"] = density
    bed(id, shot, a, b, "birds", lvl, fin, fout, space=space, send=-20, params=p, ref=ref,
        note="sparse distant calls (FM-sweep syllables), kept off the key words")


def tick(id, shot, t_fallback, kind="callout", lvl=-19.0, pan=0.0, track=None, ref=""):
    t, prov = graphic_t(id, t_fallback)
    cue(id, shot, t, 0.15, "ui_tick", lvl, cls="ui", pre=0.02, space="ui", send=-30.0,
        params=dict(sync=0.02, kind=kind), pan=pan, track=track, provisional=prov,
        ref=ref + (" [graphic: comp/sync_points.json]" if not prov else " [graphic time not in sync_points]"))


# ============================================================== sh01 dawn meadow macro
s = "sh01"
X12 = CUT["sh02"]                      # light dissolve sh01 -> sh02, 0.8 s centred on the cut
bed("sh01.wind", s, 0.0, X12 + 0.4, "wind", -29, 0.35, 0.8, space="meadow", send=-22,
    params=dict(strength=1.0, gustiness=0.35, bright=0.8, low=0.03, veg=1.3, veg_lo=1600, veg_hi=10000,
                veg_density=0.8, width=0.95), ref="cut 0.00 (film start)", note="dawn breeze in dewy grass")
birds("sh01.birds", s, 0.0, X12 + 0.4, -35, 0.5, 0.8, "meadow", n_birds=4, fmin=2800, fmax=6500, start=0.35,
      ref="cut 0.00")
cue("sh01.drop_detach", s, P["sh01.detach"], 0.7, "drop_detach", -33, pre=0.05, space="outdoor", send=-20,
    params=dict(sync=0.05, fall=P["sh01.land"] - P["sh01.detach"]), ref="PIC f91.5: drop lets go of the grass tip")
cue("sh01.drop_leaf", s, P["sh01.land"], 1.1, "drop_on_leaf", -21, pre=0.1, space="outdoor", send=-16,
    params=dict(sync=0.1, size=1.0, spring=0.4), ref="PIC f100.6: drop lands on the seedling leaf")
cue("sh01.flare_air", s, X12 + 0.05, 2.6, "bloom", -33, cls="amb", pre=0.6, space="outdoor", send=-24,
    fade_out=0.5, params=dict(sync=0.6, rise=0.6, decay=1.8, bright=0.8, low=0.2),
    ref="exit tilt into sun flare / light dissolve (in the pause 5.26-5.90)")

# ============================================================== sh02 + sh03 morning room
s = "sh02"
A = X12 - 0.4
B = CUT["sh04"]                        # hard graphic match cut
bed("sh02.room", s, A, B + 0.02, "room_tone", -42, 0.8, 0.04, space="room", send=-40,
    params=dict(warmth=1.0, bright=0.9), ref="light dissolve 5.24 -> hard cut 16.00")
bed("sh02.window_air", s, A, B + 0.02, "wind", -34, 0.8, 0.04, space="room", send=-12,
    params=dict(strength=1.0, gustiness=0.4, rate=0.1, bright=0.5, low=0.0, veg=1.0, veg_lo=1500, veg_hi=6000,
                veg_density=0.7, width=0.6), ref="soft air and leaves outside the open window")
birds("sh02.window_birds", s, A, B + 0.02, -39, 0.8, 0.04, "room", n_birds=3, fmin=2600, fmax=6000,
      ref="outside the open window")
t_ox = on(s, "oksijen")
cue("sh02.curtain", s, A, 6.0, "curtain", -29, cls="spot", space="room", send=-14, fade_in=0.8, fade_out=1.0,
    params=dict(peaks=[(4.45 - A, 0.45), (t_ox + 0.2 - A, 1.0)], period=4.0, breeze=0.7),
    ref="breath rhythm 2s/2s, biggest inhale on 'oksijen'", note="linen curtain + window breeze")
tick("sh02.callout_air", s, t_ox + 0.25, track={"shot": s, "name": "air"}, pan=0.3, ref="callout O2")

s = "sh03"                              # (slate: beats on the transcript times the studio animates to)
cue("sh03.crust", s, w(s, "yemek"), 1.7, "crust_crackle", -36, pre=0.05, space="room", send=-18,
    fade_in=0.3, fade_out=0.6, params=dict(rate=16, pan=-0.35), ref="yemek (slider past the bread)")
t = w(s, "içmek") - F
cue("sh03.pour", s, t, 2.9, "pour", -28.5, pre=0.1, space="room", send=-13, fade_out=0.2,
    params=dict(sync=0.1, stop=1.72, fill0=0.1, fill1=0.72, drips=3, pan=0.1), ref="içmek (water hits the glass)",
    provisional=True, note="re-spot on the sh03 render")
tick("sh03.callout_water", s, t + 0.7, track={"shot": s, "name": "water"}, pan=0.1, ref="water callout")
cue("sh03.jug_set", s, pause_near(12.5), 0.7, "jug_set", -28, pre=0.05, space="room", send=-14,
    params=dict(sync=0.05, pan=0.3), ref="jug set down after the pour, in the pause after 'bütün'", provisional=True)
t = w(s, "takdim")
cue("sh03.plate", s, t, 0.95, "plate_slide", -28, pre=0.05, space="room", send=-15,
    params=dict(sync=0.05, length=0.55, pan=0.0), ref="takdim (plate slides toward camera)", provisional=True)

# ============================================================== sh04 cracked earth, noon
s = "sh04"
A, B = CUT["sh04"], CUT["sh05"]
t_reach = w(s, "hiçbirine")
under = [[B - 0.25, 16000.0], [B - 0.05, 2500.0], [B + 0.12, 380.0]]     # the world goes under water
bed("sh04.wind", s, A - 0.02, B + 0.35, "wind", -28, 0.04, 0.3, space="desert", send=-24,
    params=dict(strength=1.0, gustiness=0.7, rate=0.12, bright=0.9, low=0.05, veg=0.3, veg_lo=2600, veg_hi=9000,
                veg_density=0.35, width=1.0, events=[[0.25, 0.8, 0.3], [t_reach + 0.4 - A, -0.9, 0.9]]),
    lpf=under, ref="hard cut 16.00 (dry gust on the cut, in the pause before 'Halbuki'); wind falls away as the "
                   "hand reaches; muffles into the underwater cut")
bed("sh04.ticks", s, A, B + 0.1, "dry_ticks", -34, 0.1, 0.1, space="desert", send=-24, cls="amb",
    params=dict(rate=2.5), lpf=under, ref="parched ground")
cue("sh04.sleeve", s, t_reach - 0.15, 1.7, "cloth", -29, pre=0.0, space="desert", send=-22, fade_in=0.05, fade_out=0.3,
    params=dict(motion=[[0, 0], [0.25, 0.9], [0.7, 0.55], [1.2, 0.25], [1.7, 0]], fabric="cotton", air=0.6, width=0.3),
    ref="hiçbirine (hand rises into frame, stretches up)")

# ============================================================== sh05 underwater
s = "sh05"
A, B = CUT["sh05"], CUT["sh06"]
cue("sh05.immerse", s, A, 1.8, "immerse", -31, cls="amb", pre=0.3, space="underwater", send=-12,
    params=dict(sync=0.3, whoomp=0.0, n_bubbles=8, swell=0.6, muffle=900.0),
    ref="light match cut on the sun to an underwater view: soft muffled bloom + a few distant bubbles (no plunge)")
bed("sh05.water", s, A - 0.02, B + 0.25, "underwater", -29, 0.25, 0.45, space="underwater", send=-14,
    params=dict(slosh=0.6, clicks=0.3, bubbles=0.3), ref="cut 22.95 -> shape match 30.10")
t_ox = w(s, "oksijenler")
t_b = w(s, "bize")
cue("sh05.o2_streams", s, t_b, B - t_b, "bubble_streams", -27, pre=0.0, space="underwater",
    send=-12, fade_in=0.8, fade_out=0.15,
    params=dict(streams=7, rate=2.5, density=[[0, 0.3], [1.5, 1.0]],
                hero=dict(pan=0.0, rate=5.0, gain=2.2, start=t_ox - t_b), muffle=6000),
    ref="camera tilts down to the plants; hero stream from 'oksijenler'")
tick("sh05.callout_bubble", s, t_ox + 0.2, track={"shot": s, "name": "bubble"}, ref="callout O2 fotosentez")
cue("sh05.bubble_lens", s, B - 0.08, 0.95, "bubble_pass", -22, pre=0.45, space="underwater", send=-12,
    params=dict(sync=0.45, r=4.5e-3), ref="exit: hero bubble rises into the lens")

# ============================================================== sh06 blood vessel
s = "sh06"
A, B = CUT["sh06"], CUT["sh07"]
period = 60 / 72
t_kan = on(s, "kan")
R = SYNC.get("w_heart.R_peaks")
if isinstance(R, list) and R:          # lock S1 to the ECG widget: S1 follows the R wave by 30 ms
    s1 = R[0] + 0.03
    anchor = s1 + round((t_kan - 0.08 - s1) / period) * period
else:
    anchor = t_kan - 0.08
a0 = A - 0.55                          # heartbeat pre-laps under the end of sh05 (J-cut)
cue("sh06.heart", s, anchor, B + 0.9 - a0, "heartbeat", -21, pre=anchor - a0, space="body", send=-14,
    fade_in=0.3, fade_out=0.6,
    params=dict(anchor=anchor - a0, period=period, muffle=480, body=0.7,
                strength=[[0, 0.0], [0.25, 0.25], [0.6, 0.6], [anchor - a0, 1.0], [anchor - a0 + 0.5, 0.78],
                          [B - a0 - 0.5, 0.75], [B - a0 + 0.2, 0.35], [B - a0 + 0.9, 0.0]]),
    ref="72 bpm, strongest S1 on 'kan'; S1 = ECG R peak + 30 ms (comp/sync_points w_heart); J-cut")
b0 = A - 0.2
cue("sh06.flow", s, anchor, B + 0.6 - b0, "blood_flow", -28, cls="amb", pre=anchor - b0, space="body", send=-12,
    fade_in=0.3, fade_out=0.6,
    params=dict(anchor=anchor - b0, period=period, base=0.35,
                strength=[[0, 0.6], [anchor - b0, 1.3], [anchor - b0 + 0.8, 0.9], [B - b0 - 0.7, 1.0],
                          [B - b0 - 0.1, 1.6], [B - b0 + 0.6, 0.5]]),
    ref="plasma surging with each systole")
cue("sh06.surge_wipe", s, B - 0.12, 1.0, "whoosh", -26, cls="amb", pre=0.4, space="body", send=-12, fade_out=0.3,
    params=dict(sync=0.4, f_from=160, f_peak=650, f_to=260, pan_from=-0.2, pan_to=0.2, bw=1.6, rough=0.5),
    ref="exit: red surge wipes the frame")
tick("sh06.callout_rbc", s, w(s, "an") + 0.05, track={"shot": s, "name": "rbc"}, ref="callout Alyuvar")
tick("sh06.callout_heart", s, w(s, "ama") + 0.3, track={"shot": s, "name": "heart"}, ref="heart widget lands")

# ============================================================== sh07 open sea at dawn
s = "sh07"
A, B = CUT["sh07"], CUT["sh08"]
bed("sh07.sea", s, A - 0.3, B + 0.3, "ocean", -29, 0.6, 0.6, space="outdoor", send=-22,
    params=dict(period=8.0), ref="colour-match dissolve 35.70 -> light dissolve 40.60")
t_sun = on(s, "güneş")
cue("sh07.sunrise_air", s, t_sun - F, 3.1, "bloom", -28, cls="amb", pre=0.6, space="outdoor", send=-20,
    fade_out=0.6, params=dict(sync=0.6, rise=0.55, decay=2.4, bright=1.0, low=0.4),
    ref="güneş (sun rim breaks the horizon, light floods)")
tick("sh07.callout_sun", s, t_sun + 0.7, track={"shot": s, "name": "sun"}, ref="callout ~150 milyon km")

# ============================================================== sh08 hand & apple
s = "sh08"
A, B = CUT["sh08"], CUT["sh09"]
bed("sh08.room", s, A - 0.3, B + 0.2, "room_tone", -40, 0.6, 0.5, space="room", send=-40,
    params=dict(warmth=1.0, bright=0.9), ref="light dissolve 40.60")
bed("sh08.window_air", s, A - 0.3, B + 0.2, "wind", -33, 0.6, 0.5, space="room", send=-12,
    params=dict(strength=1.0, gustiness=0.4, rate=0.1, bright=0.5, low=0.0, veg=1.0, veg_lo=1500, veg_hi=6000,
                veg_density=0.7, width=0.6), ref="soft air and leaves outside the window")
birds("sh08.window_birds", s, A - 0.3, B - 0.2, -36, 0.6, 0.8, "room", n_birds=3, fmin=2600, fmax=6000,
      start=0.5, ref="outside the window")
cue("sh08.sleeve", s, P["sh08.enter"] - 0.08, 1.7, "cloth", -28, space="room", send=-16, fade_out=0.3,
    params=dict(motion=[[0, 0], [0.25, 0.85], [0.8, 0.6], [1.2, 0.2], [1.7, 0]], fabric="cotton", air=0.5, width=0.3, pan=0.45),
    ref="PIC f989: hand enters from the top right")
cue("sh08.touch", s, P["sh08.touch"], 0.3, "grab", -35, pre=0.05, space="room", send=-16, params=dict(sync=0.05, pan=0.05),
    ref="PIC f993: fingertip touches the apple")
cue("sh08.grab", s, P["sh08.grip"], 0.35, "grab", -31, pre=0.05, space="room", send=-16, params=dict(sync=0.05, pan=0.1),
    ref="PIC f1012: fingers close around the apple")
cue("sh08.lift", s, P["sh08.lift"], 0.45, "lift", -32, pre=0.03, space="room", send=-16, params=dict(sync=0.03, pan=0.1),
    ref="PIC f1022: apple leaves the table (shadow separates)")
tick("sh08.callout_hand", s, 42.62, pan=0.4, track={"shot": s, "name": "hand"}, ref="callout 'Bir uzanış'")
t = w(s, "aslında")
cue("sh08.pulse_in", s, t, B + 4.9 - t, "heartbeat", -26, cls="amb", pre=0.0, space="body", send=-14,
    fade_in=1.5, fade_out=0.8,
    params=dict(anchor=1.0, period=60 / 70, muffle=320, body=0.6,
                strength=[[0, 0.0], [1.0, 0.2], [B - t - 0.4, 0.55], [B - t + 0.6, 0.8], [B - t + 4.9, 0.6]]),
    ref="aslında: camera pushes along the forearm - the body's pulse rises (runs on under sh09)")
cue("sh08.into_skin", s, B, 1.1, "whoosh", -26, cls="amb", pre=0.45, space="body", send=-12, fade_out=0.3,
    params=dict(sync=0.45, f_from=2600, f_peak=1100, f_to=200, pan_from=0.3, pan_to=0.0, bw=1.5, rough=0.4),
    ref="push into the skin -> tissue (zoom-through at the cut 47.40, in the pause 47.28-47.94)")

# ============================================================== sh09 nerve, muscle, cell
s = "sh09"
A, B = CUT["sh09"], CUT["sh10"]
bed("sh09.body", s, A - 0.2, B + 0.4, "body_amb", -30, 0.4, 0.6, space="body", send=-10,
    params=dict(wet=1.0, creaks=0.4), ref="inside the forearm")
t = w(s, "kaslarda") - F
cue("sh09.nerve", s, t, 0.95, "nerve", -24, pre=0.05, space="body", send=-14,
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
cue("sh10.lights_one", s, t1 - F, t2 + 0.8 - (t1 - F), "sparkle", -30, pre=0.0, space="micro", send=-12, fade_out=0.6,
    params=dict(rate=11.0, bright=1.0, far=0.1, width=0.8), ref="bildiğimiz (cells light up one after another)")
cue("sh10.lights_wave", s, t2 - F, B + 0.35 - (t2 - F), "sparkle", -28, pre=0.0, space="micro", send=-10,
    fade_in=0.4, fade_out=0.5,
    params=dict(rate=[[0, 40], [t3 - t2, 450], [t3 - t2 + 0.8, 900], [B - t2 - 0.5, 700], [B - t2 + 0.35, 250]],
                bright=0.9, far=0.75, sweep=[[0, -0.9], [t3 - t2 + 0.6, 0.9], [B - t2, 0.0]]),
    ref="bilmediğimiz -> hadsiz: waves of tiny lights to infinity")
tick("sh10.counter", s, t3 + 0.15, track={"shot": s, "name": "cells"}, ref="counter ~37 trilyon hücre lands")

# ============================================================== sh11 rain on the seedling
s = "sh11"
A, B = CUT["sh11"], CUT["sh12"]
t_b, t_ay, t_k = w(s, "bütün"), w(s, "ayağımıza"), w(s, "karşılanıyor")
cue("sh11.thunder", s, A - 0.05, 5.0, "thunder", -27, cls="amb", pre=0.1, space="outdoor_big", send=-8,
    fade_out=0.8, params=dict(sync=0.1, dist=1.3), ref="dark rain sky (distant thunder roll)")
a0 = A - 0.4
r = lambda x: round(x - a0, 3)
bed("sh11.rain", s, a0, B + 0.7, "rain", -31, 0.6, 0.8, space="outdoor", send=-20,
    params=dict(near=[[0, 0], [r(t_b), 0.15], [r(t_b + 1.0), 0.4], [r(t_ay), 0.85], [r(t_k), 0.7], [r(t_k + 0.4), 0.35], [r(B + 0.7), 0.2]],
                mid=[[0, 0], [r(t_b), 0.1], [r(t_b + 1.2), 0.5], [r(t_ay), 0.9], [r(t_k), 0.8], [r(t_k + 0.6), 0.4], [r(B + 0.7), 0.3]],
                far=[[0, 0.15], [r(t_b), 0.3], [r(t_b + 1.4), 0.8], [r(t_k), 0.9], [r(t_k + 0.6), 0.6], [r(B + 0.7), 0.5]],
                wet=[[0, 0], [r(t_b + 0.8), 0.1], [r(t_ay - 0.6), 0.6], [r(t_ay + 0.4), 0.95]],
                leaf=0.1, water=0.06),
    ref="first drops on 'bütün', heavy at 'ayağımıza', thinning at 'karşılanıyor'")
cue("sh11.first_drops", s, t_b - F, 1.6, "heavy_drops", -22, pre=0.05, space="outdoor", send=-16,
    params=dict(times=[0.05, 0.27, 0.42, 0.7, 0.97, 1.12], pans=[0.0, -0.45, 0.35, -0.2, 0.55, -0.6],
                amps=[1.0, 0.6, 0.8, 0.5, 0.7, 0.45], surface="dust"),
    ref="bütün (first heavy drops hit the dust: crowns, puffs) - checked against the sh11 animatic")
cue("sh11.trickle", s, t_ay - 0.3, 2.7, "trickle", -32, pre=0.0, space="outdoor", send=-18, fade_in=0.3, fade_out=0.5,
    params=dict(flow=[[0, 0], [0.4, 0.6], [1.2, 1.0], [2.2, 0.8], [2.7, 0.4]], approach=[[0, 0.3], [1.3, 1.0]], pan=0.0),
    ref="ayağımıza (water trickles along the cracks toward camera)")
cue("sh11.leaf_hits", s, t_ay + 0.5, 1.2, "leaf_hits", -28, pre=0.05, space="outdoor", send=-16,
    params=dict(times=[0.05, 0.4, 0.86], pans=[0.0, -0.2, 0.15], amps=[1.0, 0.75, 0.9]),
    ref="drops hit the seedling's leaves, they bounce")

# ============================================================== sh12 aerial
s = "sh12"
A, B = CUT["sh12"], CUT["sh13a"]
cue("sh12.cloud", s, A + 0.25, 2.2, "whoosh", -26, cls="amb", pre=0.85, space="aerial", send=-12, fade_out=0.5,
    params=dict(sync=0.85, f_from=300, f_peak=1300, f_to=420, pan_from=-0.5, pan_to=0.5, bw=2.2, rough=0.7),
    ref="tilt up into the rain sky -> emerge from cloud into sunlight")
a0 = A - 0.25
swell = pause_near(B - 1.2)
bed("sh12.altitude", s, a0, B + 0.45, "wind", -30, 0.6, 0.8, space="aerial", send=-16,
    params=dict(strength=1.0, gustiness=0.3, rate=0.06, bright=1.0, low=0.03, width=1.0,
                events=[[swell - a0, 0.3, 0.3]]),
    ref=f"vast open air high above the land; swells as we descend, in the pause at {swell:.2f} (not on 'olamaz')")
t = on(s, "bir")
cue("sh12.one_source", s, t - F, 4.2, "sub", -22, cls="sub", pre=0.55, space="aerial", send=-14, fade_out=0.8,
    params=dict(sync=0.55, decay=3.0, body=0.6, pre=0.5),
    ref="bir tek (network converges on the sun - one single source): designed impact")
cue("sh12.one_air", s, t - F, 3.6, "bloom", -32, cls="amb", pre=0.4, space="aerial", send=-16, fade_out=0.8,
    params=dict(sync=0.4, rise=0.4, decay=3.0, bright=0.5, low=0.2), ref="bir tek")
for dt, pn, nm in [(0.45, 0.0, "sun"), (0.72, -0.55, "sea"), (0.98, 0.45, "cloud"), (1.26, 0.65, "rain"),
                   (1.52, -0.3, "river"), (1.8, -0.65, "forest")]:
    tick(f"sh12.link_{nm}", s, t + dt, kind="link", lvl=-21, pan=pn, track={"shot": s, "name": nm},
         ref=f"network node '{nm}' lights")

# ============================================================== sh13a/b golden meadow
s = "sh13a"
A, B = CUT["sh13a"], CUT["sh14a"]
t_hr = on(s, "Halık")
a0 = A - 0.35
breeze = pause_near(t_hr - 0.2)
bed("sh13.meadow", s, a0, B + 0.4, "wind", -30, 0.8, 0.8, space="meadow", send=-20,
    params=dict(strength=0.85, gustiness=0.45, rate=0.09, bright=0.9, low=0.03, veg=1.0, veg_lo=1800, veg_hi=9000,
                veg_density=1.2, width=1.0, events=[[breeze - a0, 0.8, 0.35]]),
    ref=f"golden-hour meadow; warm breeze through the grass in the pause before 'Halık-ı Rahîm' ({breeze:.2f})")
birds("sh13.birds", s, a0, B + 0.4, -34, 0.8, 0.8, "meadow", n_birds=5, fmin=2200, fmax=6800, start=0.8,
      ref="forest edge, birds far away")
gb = [0.25, 1.1, 1.85, 2.7, 3.45, 4.2]
cue("sh13a.grass_lens", s, A + gb[0], 4.6, "grass_brush", -27, pre=0.0, space="meadow", send=-18, fade_out=0.3,
    params=dict(times=[x - gb[0] for x in gb], pans=[-0.6, 0.55, -0.35, 0.7, -0.7, 0.4], amps=[0.8, 1.0, 0.7, 0.9, 0.8, 0.6]),
    ref="low glide: grass and flowers brushing past the lens (until the camera rises)")
cue("sh13a.bee", s, A + 2.2, 2.6, "bee", -41, pre=1.3, space="meadow", send=-16, fade_in=0.2, fade_out=0.3,
    params=dict(sync=1.3, dist=0.8, pan_from=-0.8, pan_to=0.6, f0=218), ref="a bee crosses, off to the side")
cue("sh13a.rahim_air", s, t_hr - F, 4.6, "bloom", -30, cls="amb", pre=0.5, space="meadow", send=-16, fade_out=1.0,
    params=dict(sync=0.5, rise=0.5, decay=3.5, bright=0.6, low=0.35),
    ref="Halık-ı Rahîm (camera rises, warm light spreads over the meadow)")

s = "sh13b"
ring_words = [("birer", 0), ("birer", 1), ("görüp", 0), ("gözetip", 0), (None, None), ("idare", 0), ("ettiğini", 0), ("gösterir", 0)]
rt = [None if wd is None else w(s, wd, k) for wd, k in ring_words]
rt[4] = round((rt[3] + rt[5]) / 2, 2)
fallback = [-0.45, 0.5, -0.2, 0.35, -0.55, 0.15, 0.6, 0.0]
for i, (tt, pn) in enumerate(zip(rt, fallback)):
    nm = "abcdefgh"[i]
    tick(f"sh13b.ring_{nm}", s, tt - F, kind="ring", lvl=-18 if i < 7 else -17, pan=pn,
         track={"shot": s, "name": nm}, ref=f"birer birer: tracking ring {i + 1}/8 snaps onto TRK_{nm}")
cue("sh13b.bee", s, SYNC.get("sh13b.ring_b", rt[1]), 2.2, "bee", -42, pre=0.7, space="meadow", send=-16, fade_in=0.2,
    fade_out=0.3, params=dict(sync=0.7, dist=0.55, pan_from=0.2, pan_to=0.45, f0=226),
    ref="the bee ring b finds, hovering right of centre and drifting right (sh13b animatic f2045-2090)")

# ============================================================== sh14a sunflowers at sunrise
s = "sh14a"
A, B = CUT["sh14a"], CUT["sh14b"]
t_allah = on(s, "Allah")
a0 = A - 0.4
stir = pause_near(t_allah - 1.4)
bed("sh14a.field", s, a0, B + 0.08, "wind", -28, 0.8, 0.35, space="meadow", send=-20,
    params=dict(strength=0.8, gustiness=0.4, rate=0.08, bright=0.85, low=0.03, veg=1.0, veg_lo=900, veg_hi=6000,
                veg_density=0.8, width=1.0, events=[[stir - a0, 0.6, 0.3]]),
    ref=f"sunrise field, big papery sunflower leaves; the leaves stir in the pause at {stir:.2f}; shadow cuts it at 99.50")
birds("sh14a.birds", s, a0, B + 0.05, -33, 0.8, 0.3, "meadow", n_birds=4, fmin=2400, fmax=6600, start=0.8,
      density=[[0, 0.6], [B - a0, 1.5]], rate=0.8, ref="dawn calls (the narration is dense with key words here, so the "
      "few bouts that survive the key-word filter fall in its pauses)")
t = w(s, "görüyormuşçasına")
cue("sh14a.turn", s, t - F, 2.7, "stalks_turn", -27, pre=0.1, space="meadow", send=-16, fade_out=0.4,
    params=dict(sync=0.1, length=1.4), ref="görüyormuşçasına (all flower heads turn toward the sun)")
tick("sh14a.spiral", s, w(s, "hikmetli") - F, kind="link", lvl=-21, track={"shot": s, "name": "spiral"},
     ref="Fibonacci spiral arcs drawn")
t_a_end = word(s, "Allah")["e"]
cue("sh14a.allah_air", s, t_a_end, 2.6, "bloom", -33, cls="amb", pre=1.1, space="meadow", send=-16, fade_out=0.7,
    params=dict(sync=1.1, rise=1.1, decay=1.8, bright=0.45, low=0.25),
    ref="Allah: the light grows into a radiant sunrise - a soft, dark breath of light that blooms through the "
        "word and opens after it; no impact")

# ============================================================== sh14b the covered light
s = "sh14b"
A, B = CUT["sh14b"], CUT["sh14c"]
cue("sh14b.shadow", s, A + 0.05, 1.7, "whoosh", -25, cls="amb", pre=0.45, space="dark", send=-10, fade_out=0.4,
    params=dict(sync=0.45, f_from=900, f_peak=420, f_to=110, pan_from=0.7, pan_to=-0.7, bw=1.6, rough=0.4),
    ref="shadow sweeps in, darkness")
bed("sh14b.dark", s, A - 0.1, B + 0.3, "room_tone", -40, 0.3, 0.6, space="dark", send=-20,
    params=dict(warmth=0.6, bright=0.5, width=0.8), ref="dark space")
land = P["sh14b.land"]
cue("sh14b.flame", s, A - 0.1, B + 0.3 - (A - 0.1), "flame", -31, pre=0.0, space="dark", send=-12, fade_in=0.5, fade_out=0.6,
    params=dict(muffle_at=P["sh14b.flame_out"] - (A - 0.1), muffle_len=0.3),
    ref="small oil-lamp flame; muffled when the cloth covers the chimney (PIC f2461)")
cue("sh14b.cloth", s, land, 2.7, "cloth_fall", -22, pre=0.6, space="dark", send=-9, fade_out=0.5,
    params=dict(sync=0.6, fall=land - P["sh14b.enter"] + 0.05, settle=1.4), lf_shelf=0.0,
    ref="PIC f2453 cloth enters, f2463 hem lands on the table (voice micro-gap 102.60-102.72): heavy velvet drape")

# ============================================================== sh14c cold lifeless desert
s = "sh14c"
A, B = CUT["sh14c"], CUT["sh15"]
t_iz = w(s, "izah")
gust = pause_near(on(s, "şuursuz") - 0.2)
a0 = A - 0.3
silence = [[a0, 0.0], [t_iz - 0.1, 0.0], [t_iz + 0.45, -15.0], [B, -22.0]]
bed("sh14c.wind", s, a0, B + 0.05, "wind", -23, 0.6, 0.05, space="desert", send=-22,
    params=dict(strength=1.0, gustiness=0.55, rate=0.1, bright=0.7, hollow=1.0, low=0.04, width=1.0,
                events=[[gust - a0, 1.2, 0.4]]),
    env=silence, ref=f"cold hollow wind; gust in the pause before 'şuursuz' ({gust:.2f}); near-silence on 'izah edebilir mi'")
cue("sh14c.sand", s, A, B - A, "sand", -24, cls="amb", space="desert", send=-24, fade_in=0.6, fade_out=0.05,
    params=dict(strength=1.0, gustiness=0.5, threshold=0.42, events=[[gust + 0.05 - A, 2.2, 0.4]]),
    env=silence, ref="sand blows aimlessly with the gust")

# ============================================================== sh15 rahle and red books
s = "sh15"
A = CUT["sh15"]
cue("sh15.sunbeam", s, A + 0.2, 3.2, "bloom", -34, cls="amb", pre=0.5, space="room_wood", send=-18, fade_out=0.8,
    params=dict(sync=0.5, rise=0.5, decay=2.5, bright=0.55, low=0.3), ref="warm sunbeam sweeps across the room")
bed("sh15.room", s, A - 0.3, TOTAL, "room_tone", -39, 0.6, 1.8, space="room_wood", send=-40,
    params=dict(warmth=1.2, bright=0.8), ref="quiet old wooden room; fades to silence at the end")
bed("sh15.window_air", s, A - 0.3, TOTAL, "wind", -33, 0.8, 1.8, space="room_wood", send=-12,
    params=dict(strength=1.0, gustiness=0.35, rate=0.08, bright=0.45, low=0.0, veg=1.0, veg_lo=1400, veg_hi=5500,
                veg_density=0.6, width=0.6), ref="warm air and leaves outside the window")
birds("sh15.window_birds", s, A - 0.3, TOTAL, -36, 0.8, 1.8, "room_wood", n_birds=3, fmin=2600, fmax=6000,
      start=1.0, ref="warm morning outside")
cue("sh15.book_open", s, P["sh15.open_cut"], 1.0, "book_open", -28, pre=0.32, space="room_wood", send=-14,
    params=dict(sync=0.32, pan=0.0), provisional=True,
    ref="PIC f2721.5: cut from the closed 'Sözler' to the open book - spine creak over the cover shot, the cover lands on the cut")
for k, nm in enumerate(["page1", "page2", "page3"]):
    L = P[f"sh15.{nm}"]
    cue(f"sh15.{nm}", s, L, 0.65, "page_turn", -30 if k < 2 else -25, pre=0.32, space="room_wood", send=-14,
        params=dict(sync=0.32 - 0.92 * 0.28, length=0.28, pan=0.15 - 0.1 * k), provisional=True,
        ref=f"PIC f{PIC['sh15.' + nm]}: page {k + 1}/3 lands" + (" - settles on 721, in the pause before 'sayfasında'" if k == 2 else ""))
tick("sh15.callout_page", s, w(s, "721") + 1.0, track={"shot": s, "name": "page"}, ref="page-number callout")

CUES.sort(key=lambda c: (c["t"] - c["pre"], c["id"]))
out = {"sr": SR, "total_seconds": TOTAL, "version": 2,
       "doc": "Sound timeline (absolute seconds). Generated by build_cues.py from picture spotting (PIC), "
              "comp/sync_points.json, the narration's voice onsets and timing/shots.json; rendered by mix.py.",
       "cuts": CUT, "picture_spots_frames": PIC, "key_word_spans": KEY_SPANS, "cues": CUES}
json.dump(out, open(os.path.join(HERE, "cues.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(CUES), "cues ->", os.path.join(HERE, "cues.json"))
