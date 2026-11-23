# Audio: procedural SFX palette v4 + mixer

Narration dominates. The effects are few, soft and round: **air** and **light**, nothing struck, nothing that
crackles, hisses or knocks, no music. Everything is synthesised in Python (numpy + scipy): no samples, no
downloads, no licences; seeded and deterministic.

**Round of Nov 23 (client: "no coarse or unpleasant effects, and a little quieter"; new ending without the
coin throw):** palette rewritten (v3 kept in `v3_backup/`), cue sheet 30 -> 18 cues, bus about 5 dB lower
(each remaining cue about 3 dB lower), peaks -15 -> -23 dBFS. Numbers and reasons: `audit_before.md`,
`audit_after.md`. Nobody has listened to any of it: see "Not verified by ear" at the end.

| file | what |
|---|---|
| `sfx.py` | the palette (5 sounds + 1 spare) + `render(name, **params)`, `render_demo()`, `--list` |
| `cues.json` | **cue sheet v4** (18 cues, final video seconds) |
| `mix.py` | cue sheet -> `mix.wav`, `sfx_bus.wav`, `voice_bus.wav`, `mix_report.json` |
| `verify.py` | measurement suite: PASS/FAIL for library, files, loudness, ducking, clicks, spectrum |
| `audit.py` | "how coarse is it?": attack, onset hardness, centroid, hiss, flatness, crest, roughness, level and words per cue, masking model |
| `audit_before.md` / `audit_after.md` | the v3 and v4 audits, the comparison, what happened to every v3 cue |
| `meter.py` | ITU-R BS.1770-4 loudness (integrated / momentary / short-term), true peak, band energies |
| `sfx_demo/` | every sound at default settings and level + `_audition_reel.wav` (all sounds, +14 dB) |
| `v3_backup/` | the delivered v3 state: `sfx.py mix.py verify.py cues.json mix_report.json sfx_bus.wav`, its demo set |
| `mix_v5.log`, `verify_v5.log` | logs of this round (`_v2` ... `_v4` = earlier rounds) |

```
python3 mix.py cues.json [-v]                 # ~6 s; -v adds the per-cue table
python3 verify.py cues.json [--bands]         # ~30 s; exit code 1 if any check fails
python3 audit.py cues.json --out audit.md     # ~15 s
python3 audit.py v3_backup/cues.json --lib v3_backup      # the same audit of the old palette
python3 sfx.py                                # re-render sfx_demo/
```

## The palette

Default level = K-weighted loudness of the loudest 100 ms ("LK100", LUFS scale) at `gain_db` 0; the narrator
is at -16 LUFS. att = 10-90 % attack. Nothing has more than -31 dB of its energy above 6 kHz.

| sound | use | what lands on `t` (anchor) | main params (default) | LK100 / peak | att |
|---|---|---|---|---|---|
| `air` | camera glides, slow moves | the loudest point = fastest point of the move (`peak` x duration) | `duration` .8, `direction` lr\|rl\|up\|down\|none, `warmth` .5, `sweep` .45, `peak` .5 | -38 / -30 | 110-300 ms (55 ms with `peak` .25) |
| `glow` | light blooming | the peak of the bloom (`peak` x duration) | `duration` 1.4, `peak` .5, `brightness` .5, `rising` 0 (1 = a bloom that climbs), `shimmer` .5 (0 = only the warm air, 1 = mostly shimmer) | -39 / -31 | 100-360 ms |
| `glint` | gold catching the light | the middle of the soft attack (peak about 10 ms later) | `duration` .6 (= T60), `softness` .6, `brightness` .5, `pitch` 1 | -39 / -35 | 11 ms (7-14) |
| `rise` | the breath into the cover | the peak (`peak` x duration, default 70 %) | `duration` 2.4, `brightness` .5; `air` 0 and `bed` 0 bring back the v3 air layer / sine bed | -34.5 / -26.5 | 360-450 ms |
| `room_tone` | end-card air; hides the step from the recording's noise floor to digital silence | the start (`"align": "start"`) | `duration` 6, `warmth` .5, `fade_in`, `fade_out` | -58 steady | seconds |
| `touch` (spare, **not in the sheet**) | a felt-soft tap, if a print should ever need one | the middle of the attack | `softness` .6, `pitch` 1 | -40 / -29 | 9 ms |

How they are made (and why they should be pleasant):

* **`air`**: noise in a band 1.7 octaves wide whose centre glides 300 -> 820 Hz and back (or up / down), high-pass
  170 Hz (no rumble), 4th-order low-pass 2.4 kHz (no hiss), slow bell envelope, a gentle pan sweep.
  Against the v3 `whoosh`: centroid 0.93 kHz instead of 1.6, no 4.2 kHz layer.
* **`glow`**: a body of warm un-pitched air (noise round 650 Hz, 250 Hz - 1.8 kHz) + a shimmer of four soft sine
  partials at 1536 / 2048 / 3072 / 4096 Hz. The partials stand a fourth, a fifth or an octave apart (nothing
  sour, no two in one critical band = no roughness) and are too high and soft to read as a note; each has two
  quieter companions 0.5-1.8 Hz away (in phase at the peak, a slow shimmer of at most 12 dB afterwards) and a
  slow random twinkle. The upper partials arrive later and leave earlier: the light brightens towards its
  peak. Every `glow` in the film has the SAME four frequencies, so no two cues can form a tune.
  Against the v3 `shimmer`: no hiss layer (was 45 % of it), nothing above 4.2 kHz (was up to 8), centroid
  1.1 kHz instead of 4.
* **`glint`**: the three lowest modes of a small plate (a coin) at 2048 / 3541 / 4768 Hz (0 / -9 / -17 dB), each a
  slow doublet; NOT struck: raised-cosine attack of 19 ms, no contact noise; fixed pitch (two glints are the
  same object, never an interval). Against v3 `coin_land` + `coin_ting`: no thud, no tick, attack 11 ms
  instead of 2, top partial 4.8 kHz instead of 6.3.
* **`rise`**: pink-ish noise from 200 Hz up through a low-pass that opens 340 Hz -> 1.4 kHz and closes again.
  Against v3: no 55-60 / 91 Hz sine bed (hum on headphones), no rumble, darker top.

All of them: seeded (`seed`), `pan`, exact zero at both ends with raised-cosine edges, 30 Hz DC blocker,
zero-phase roll-off above 9 kHz, mono-compatible width (L/R correlation of the bus +0.52, fold-down -1.1 LU).

Removed in v4 (still in `v3_backup/sfx.py`): `dab`, `dab_flurry`, `specks`, `puff`, `paper`, `pop`, `pop_flurry`,
`coin_land`, `coin_ting`, `coin_drop_in`, `wood_knock`, `cloth_unroll`, `book_slide`, `whoosh`, `shimmer`.

## Cue sheet v4 (`cues.json`)

Level = loudest 100 ms as it sits in the mix (after cue gain and the side-chain). The voice is at -16 LUFS.

| t | sound | gain | level in the mix | what it accompanies |
|---|---|---|---|---|
| 1.80 | `air` | +1.5 | -38.6 | camera glide toward 'yesterday' (1.60-2.40), peaks in the pause just before «Bil» |
| 4.23 | `glow` | +2.0 | -41.0 | the afterglow where yesterday's sun set blooms (4.10 / 4.17 / 4.23) and fades |
| 4.57 | `air` | +1.5 | -37.0 | glide from past to future (4.17-4.97) |
| 8.42 | `air` | +1.5 | -36.5 | the frame widens back to the centre (8.07-8.77) |
| 9.67 | `glow` | +4.0 | -39.0 | today lights up: veil parts 8.77-9.17, blaze passes 9.57 / 9.67 / 9.77; the tail carries the flowers |
| 11.65 | `glow` | +0.5 | -42.5 | «bil»: the lit rise blooms warm gold (peak f350 = 11.667) |
| 13.97 | `glint` | +1.0 | -42.0 | one hour comes out of the ring, gold: its small first glint |
| 14.72 | `air` | 0 | -41.5 | the follow move that tracks the hour down into his palm (14.27-15.17) |
| 15.37 | `glint` | +3.0 | -40.0 | it lands in his palm and is minted in one press: the same glint, fuller |
| 16.33 | `air` | +1.5 | -37.9 | pull back and turn to the right (16.03-16.63) |
| 16.97 | `glow` | +4.0 | -39.0 | the true future: far light in three passes 16.83 / 16.90 / 16.97 |
| 20.33 | `glow` | +0.5 | -42.5 | the chest opens into a mescid; gold crescents 20.33 / 20.37 over the glowing doorway |
| 21.55 | `air` | +1.0 | -41.0 | the rug unrolls 21.43-21.93 (fastest at the start) |
| 22.87 | `glow` `rising` | +1.5 | -41.3 | NEW ENDING: the gold hour dissolves upward in four passes 22.57-22.87, light dabs rise to the far light (starts 22.51, top on the last pass) |
| 23.00 | `room_tone` | +3.0 | -53.8 | end-card air (start; runs to the end of the file) |
| 23.23 | `glow` | +3.0 | -36.2 | the answers - niche 22.90, door and windows 23.07, far light 23.23 - as one warm swell that peaks on the far light (22.60-24.10) |
| 24.35 | `rise` | +2.5 | -32.0 | the cream cover grows out of the far light (23.90-24.30), the end card comes up as light |
| 25.55 | `glow` | 0 | -39.0 | end card: the warm light on the Qur'an |

No sound: the opening passes, the deed and «yok», the flowers, the dial being laid, the chest and its lid,
22.00-22.45 (both hands rise in prayer), and the four end-card lines (they fade in exactly like the film's
glosses, which are silent; four taps at 2.2 per second in a still room read as a metronome).
If a touch per line is wanted after all, these four lines do it at about -44 LUFS:
`{"t": 25.8, "sound": "touch", "gain_db": -4, "seed": 141}`, the same at `26.267` (seed 142, `"pan": -0.1`),
`26.733` (seed 143), `27.167` (seed 144).

## Cue sheet contract (unchanged)

```json
{"duration": 30.1, "voice": "voice_trim.wav", "mix": {"duck_db": 4.0},
 "cues": [{"t": 4.57, "sound": "air", "gain_db": 1.5, "pan": 0.2, "params": {"duration": 0.8, "direction": "lr", "seed": 105}},
          {"t": 23.0, "sound": "room_tone", "align": "start", "params": {"duration": 7.1}}]}
```

| field | meaning | default |
|---|---|---|
| `duration` | length of the outputs in seconds (exact to the sample) | required |
| `voice` | narration file, relative to the cue sheet; video t=0 = its first sample | `voice_trim.wav` |
| `mix` | overrides of the mixer settings (`DEFAULTS` in `mix.py`) | none |
| `cues[].t` | **video seconds where the perceptual hit lands** (the sound's `.anchor` is put on t) | required |
| `cues[].sound` | a name from the palette | required |
| `cues[].gain_db` | trim relative to the sound's calibrated default level | 0 |
| `cues[].pan` | -1 left ... +1 right (keep within about +-0.5) | 0 |
| `cues[].params` | keyword arguments of the sound function | `{}` |
| `cues[].seed` | variation seed (also accepted inside `params`); derived from sound + t if omitted | auto |
| `cues[].align` | `"anchor"` (hit on t), `"start"` or `"end"` | `anchor` |
| `cues[].note` | free text, ignored | |

Unknown sound names or parameters stop the mixer with a clear error. Cues that overlap simply sum.

## Mixer rules (what `mix.py` guarantees; v4 changes in bold)

1. **Voice**: zero-phase 70 Hz high-pass, one static gain to -16.0 LUFS integrated, true peak <= -1.5 dBTP, no
   compression (source -15.31 LUFS / -1.30 dBTP -> gain -0.66 dB -> -16.00 LUFS / -1.93 dBTP). Untouched in v4.
2. Every cue is capped at **-18 dBFS** true peak (was -14); nothing comes near it (hottest cue -23.3).
3. Side-chain ducking: **4 dB** under speech (default was 5; the sheets always used 4), **50 ms attack with 50 ms
   look-ahead, 350 ms release** (was 30 / 30 / 250: the palette is now sustained air and tones, on which a quick
   gain step would be heard), 100 ms hold. Detector: the voice itself (120 Hz-5 kHz, hysteresis, 120 ms gap bridging).
4. Short-term ceiling: SFX bus short-term loudness <= voice - 14 LU in every 3 s window with speech (idle: 8.9 LU of margin).
5. Bus peak ceiling **-18 dBFS** (look-ahead limiter, idle).
6. 0.5 s raised-cosine fade of the SFX bus at the end of the file; 10 ms fades at both file edges; final safety
   ceiling -1.5 dBTP (idle).
7. Outputs: 48 kHz stereo 16-bit PCM, exactly `duration` long; `mix.wav` = `voice_bus.wav` + `sfx_bus.wav`.

## Verification (`python3 verify.py cues.json`, log `verify_v5.log`)

ALL CHECKS PASSED. Voice -16.00 LUFS / -1.93 dBTP; SFX bus -41.9 LUFS gated, -50.5 LUFS during speech (34.5 LU
under the voice), -44.2 in the pauses, momentary max -33.1, short-term max while speaking -38.9 (ceiling -30),
highest effect peak -22.9 dBFS (cap -18); final mix -16.00 LUFS, -1.88 dBTP, no clipped samples; exactly
1 444 800 samples = 30.100 s; ducking 3.96 dB measured with a steady noise cue; click detector (17 kHz residual,
self-tested on 24 deliberate hard cuts) 0.0002 on the bus and at most 0.0001 at any cue boundary (limit 0.006).

Checks that were changed for v4 (each one is commented in `verify.py`):
* library "gentle top end (above 10 kHz <= -18 dB)" -> **"no hiss": above 6 kHz <= -25 dB and above 10 kHz <= -40 dB** in every sound (stricter);
* library **new: "nothing is struck"**: the fastest 10-90 % attack of any sound must be >= 8 ms (palette: 8.9 ms, the spare `touch`; in the sheet 11 ms);
* library "default peaks under the cap": against the new cap (-18 - 1 dB instead of a fixed -15 dBFS);
* "anchors land on t": tested with `glint` (waveform peak 0-25 ms after t: its anchor is the middle of a soft attack) and `air` instead of `pop` (+-5 ms) and `whoosh` - there is no struck sound left to test with;
* click-detector self-test: sounds `rise / air / glow / room_tone` instead of `rise / whoosh / dab / room_tone`, and the deliberate cut is made at the largest sample within 5 ms of the random point (a cut on a zero crossing of a pure tone is no click and would fail the self-test for the wrong reason).

## Placing cues well

- Pauses (effects at full, still quiet, level): 1.12-1.80, 4.22-4.88, 7.71-8.80, 9.49-9.66, 11.79-12.55,
  13.17-13.50, 14.63-14.92, 16.11-16.68, 20.91-21.38, and everything after 22.9 s.
- Under a word a cue is 4 dB lower and partly masked; `audit.py` section 4 says how much of it is heard.
- One sound per visual idea. When in doubt, leave it out: silence under the narrator is better than a sound.
- Louder / quieter as a whole: add the same number to every `gain_db` (+2 dB = gated about -40, during speech
  about -48.5, peaks about -21 dBFS).

## Not verified by ear

Everything above is measurement and synthesis knowledge. A human audition of `mix.wav` (and of
`sfx_demo/_audition_reel.wav`, +14 dB) is still worth two minutes before the final mux. What to listen for:

1. **The shimmer of `glow`** (four sine partials at 1.5-4.1 kHz): meant as a soft glassy light. If it reads as a
   thin ringing or as "a tone", lower it without touching anything else: add `"shimmer": 0.3` (or `0` = only warm
   air) to the `params` of the glow cues.
2. **`glint`** at 13.97 and 15.37: a soft 2 kHz "ting" without a strike. If it reads as a notification "ding",
   shorten it (`"duration": 0.3`) or delete the two cues.
3. **Level**: the cues are about 3 dB under their v3 counterparts and smoother, so they may feel more than
   "a little" quieter; +2 dB on every gain is safe (see above).
4. The 4 dB side-chain on sustained sounds (blooms at 9.67, 16.97, 22.87 start or end under words): measured
   smooth (at most 2.7 dB in 20 ms, on word onsets), not heard.
