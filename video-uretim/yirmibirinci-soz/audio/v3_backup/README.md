# Audio: procedural SFX toolkit + mixer

Narration dominates; sound effects are quiet, soft, organic and never musical. Everything is synthesised in
Python (numpy + scipy): no samples, no downloads, no licences. Everything is seeded and deterministic.

| file | what |
|---|---|
| `sfx.py` | the sound palette (17 functions) + `render(name, **params)`, `render_demo()`, `--list` |
| `mix.py` | cue sheet -> `mix.wav`, `sfx_bus.wav`, `voice_bus.wav`, `mix_report.json` |
| `meter.py` | ITU-R BS.1770-4 loudness (integrated / momentary / short-term), true peak, band energies |
| `verify.py` | measurement suite: PASS/FAIL for library, files, loudness, ducking, clicks, spectrum |
| `cues.json` | **provisional** cue sheet (replace with the real one) |
| `sfx_demo/` | every sound at default settings and level + `_audition_reel.wav` (all sounds, +14 dB) |

```
python3 sfx.py            # render sfx_demo/*.wav, print duration / peak / RMS / centroid / LK100 / anchor
python3 sfx.py --list     # every sound with its parameters and defaults
python3 mix.py [cues.json] [-v] [--voice FILE] [--out-dir DIR]     # -v adds the per-cue table
python3 verify.py [cues.json] [--bands]                            # exit code 1 if any check fails
```

Requires `pip install scipy` (numpy is already there). `mix.py` takes ~6 s, `verify.py` ~30 s.

## Cue sheet contract

```json
{
  "duration": 29.6,
  "voice": "voice_trim.wav",
  "mix": {"duck_db": 5.0},
  "cues": [
    {"t": 3.4, "sound": "whoosh", "gain_db": -6, "pan": -0.3, "params": {"duration": 0.7, "direction": "lr"}},
    {"t": 6.04, "sound": "paper"},
    {"t": 23.0, "sound": "room_tone", "align": "start", "params": {"duration": 6.6}}
  ]
}
```

| field | meaning | default |
|---|---|---|
| `duration` | length of the outputs in seconds (exact to the sample) | required |
| `voice` | narration file, relative to the cue sheet; video t=0 = its first sample | `voice_trim.wav` |
| `mix` | overrides of the mixer settings (`DEFAULTS` in `mix.py`) | none |
| `cues[].t` | **video seconds where the perceptual hit lands** (see "anchor" below) | required |
| `cues[].sound` | a name from the table below | required |
| `cues[].gain_db` | trim **relative to the sound's calibrated default level**; 0 = recommended quiet level | 0 |
| `cues[].pan` | -1 left ... +1 right (keep within about +-0.5; hard pans cost up to 3 dB of peak headroom) | 0 |
| `cues[].params` | keyword arguments of the sound function (`duration`, `brightness`, ...) | `{}` |
| `cues[].seed` | variation seed (also accepted inside `params`). If omitted, a stable seed is derived from sound + t, so two cues of the same sound are never identical | auto |
| `cues[].align` | `"anchor"` (hit on t), `"start"` (sound begins at t) or `"end"` (sound ends at t) | `anchor` |
| `cues[].note` | free text, ignored | |

Unknown sound names or parameters stop the mixer with a clear error. Cues that overlap simply sum.

**Anchor.** Every sound function returns a `Sound` (float32 numpy array `(n, 2)` at 48 kHz) with an
`.anchor` attribute: seconds from the start of the array to its perceptual hit. The mixer places the array
at `t - anchor`, so sounds with a build-up (whoosh, shimmer, rise, cloth_unroll, book_slide) start *before*
`t` and peak/land exactly on it. `python3 mix.py -v` prints start, end and anchor of every cue.
Visual beats lead the word by 2-4 frames (bible); give the SFX the time of the *visual* event.

## The palette

Default level = K-weighted loudness of the loudest 100 ms ("LK100", LUFS scale) at `gain_db` 0; the narrator
is at -16 LUFS. Peak = sample peak at defaults (varies a few dB with the seed). Useful gain = range that stays
tasteful and under the -14 dBFS peak cap (the mixer trims anything hotter and says so).

| sound | intended use | what lands on `t` (anchor) | main params (default) | LK100 / peak | useful `gain_db` |
|---|---|---|---|---|---|
| `dab` | one sponge dab on the wall: muted, damp "pf-thup", 40-90 ms | the contact (8 ms in) | `duration` (random 48-82 ms), `brightness` .5, `wet` .5, `weight` .5 | -32 / -17..-20 | -6 ... +2 |
| `dab_flurry` | something is dabbed in: irregular run of n dabs, falling level, random pans | the **first** dab | `n` 6, `duration` .8 (first to last hit), `shape` decel\|accel\|arc\|even, `fall_db` 7, `spread` .5, `times` [s after first hit] to lock to stepped frames | -32 first dab / -17 | -6 ... +2 |
| `whoosh` | camera move / swish, airy and very soft | the loudest point = fastest point of the move (`peak` x duration, default 48 %) | `duration` .7, `direction` lr\|rl\|up\|down\|none, `sweep` .55, `brightness` .5 | -35 / -27 | -6 ... +4 |
| `specks` | things crumbling / dissolving into drifting specks | the **start** of the dissolve (densest after ~22 %) | `duration` 1.0, `density` 1, `brightness` .5, `spread` .7 | -37 / -17..-22 | -6 ... +3 |
| `puff` | tiny air puff: something vanishes | the puff (14 ms in) | `duration` .22, `brightness` .5 | -34.5 / -22 | -6 ... +4 |
| `paper` | brief paper rustle / flutter (the deed) | the first, strongest rustle (35 ms in) | `duration` .35, `crisp` .5, `flutters` auto | -35.5 / -22 | -6 ... +4 |
| `shimmer` | light blooming: airy, non-melodic sparkle that swells | the peak of the bloom (`peak` x duration, default 60 %) | `duration` 1.6, `brightness` .5, `density` 1 | -37 / -33 | -6 ... +4 |
| `coin_ting` | small sweet coin ring (flip, glint, appear) | the strike (4 ms in) | `pitch` 1 (x2.7 kHz), `duration` .38 = ring-out, `brightness` .5 | -35 / -27 | -4 ... +5 |
| `coin_land` | coin caught in a palm: choked ting + muted thud | the contact (7 ms in) | `pitch` 1, `softness` .6 | -33.5 / -17..-22 | -4 ... +3 |
| `coin_drop_in` | coin sinks into something soft, warm low bloom after it | the soft thud (8 ms in); bloom peaks ~0.2 s later | `bloom` .5 s, `warmth` .5, `pitch` 1 | -32.5 / -19..-23 | -4 ... +4 |
| `wood_knock` | little wooden chest set down / lid closing | the firm contact (`set`: 30-47 ms in, after a light corner touch) | `style` set\|lid\|single, `pitch` 1, `hardness` .4 | -32.5 / -20 | -6 ... +4 |
| `cloth_unroll` | prayer rug unrolling: building "shhh" + soft flap | the **flap** at the end (the swish starts `duration` earlier) | `duration` .9 (swish length), `flap` 1, `sweep` .3 | -35 / -25 | -6 ... +4 |
| `rise` | broad warm non-pitched swell for the final moment | the peak (`peak` x duration, default 70 %); the last 30 % is the soft landing | `duration` 2.4, `brightness` .5, `air` .5, `bed` .5 (low sine bed) | -32 / -23 | -6 ... +3 |
| `pop` | tiny bubbly pop: a small thing appears (flower) | the pop (6 ms in) | `pitch` 1, `softness` .6 | -35.5 / -24 | -6 ... +4 |
| `pop_flurry` | a cluster of little pops | the **first** pop | `n` 5, `duration` .6, `shape` even, `times` | -35.5 / -23 | -6 ... +4 |
| `room_tone` | end card: barely perceptible warm air (also hides the step from the recording's noise floor to digital silence at 23.0 s) | the start (use `"align": "start"`); built-in 0.6 s fade in / 1.2 s fade out | `duration` 6, `warmth` .5, `fade_in`, `fade_out` | -58 steady (-61 dBFS RMS) | -6 ... +6 |
| `book_slide` | a volume pushed into place on the shelf | the tiny **settle** at the end (slide starts `duration` + 16 ms earlier) | `duration` .5 (slide length), `settle` 1, `brightness` .4 | -35.5 / -26 | -6 ... +4 |

All of them: seeded (`seed`), `pan`, zero first/last sample with raised-cosine edges, 30 Hz DC blocker,
zero-phase roll-off above ~10 kHz (-6 dB at 11.5 kHz, 24 dB/oct), slight mono-compatible stereo width
(decorrelation, nothing in anti-phase), no pitched/musical content (coin and pop partials are inharmonic or
random and off any scale; shimmer partials are random above 2.2 kHz).

Direct use from Python:

```python
import sfx
s = sfx.render("whoosh", duration=0.9, direction="up", seed=7)   # or sfx.whoosh(...)
s.shape, s.dtype, s.anchor        # (43200, 2) float32 0.432
```

## Mixer rules (what `mix.py` guarantees)

1. **Voice**: zero-phase 70 Hz high-pass (12 dB/oct), one static gain to **-16.0 LUFS integrated**, true peak
   <= -1.5 dBTP. No compression. A look-ahead limiter exists only as a guard and is idle for this recording
   (source: -15.31 LUFS / -1.30 dBTP -> gain -0.66 dB -> -16.00 LUFS / -1.93 dBTP).
2. **Every cue** is capped at -14 dBFS true peak (trimmed and reported if hotter).
3. **Side-chain ducking**: the SFX bus drops a further **5 dB** while the narrator speaks. The detector follows
   the voice itself (120 Hz-5 kHz level, hysteresis, 120 ms gap bridging); 30 ms attack with 30 ms look-ahead
   (the duck is complete when the word starts), 100 ms hold, 250 ms release. In pauses >= 0.6 s the bus is back
   at 0 dB.
4. **Short-term ceiling**: SFX bus short-term loudness (3 s window, 0.1 s hop) is kept <= voice - 14 LU
   (= -30 LUFS) in every window that contains speech, and <= voice - 12 LU elsewhere, by a slow smooth trim;
   the mixer warns when it had to act (the provisional sheet is 8 LU below the ceiling).
5. **Bus peak ceiling** -14 dBFS (look-ahead limiter, idle unless overlapping cues add up).
6. Natural tail: 0.5 s raised-cosine fade of the SFX bus at the end of the file; 10 ms fades at both file
   edges; final safety ceiling -1.5 dBTP (idle).
7. Outputs: 48 kHz stereo 16-bit PCM, exactly `duration` long. `sfx_bus.wav` is the effects exactly as they
   sit in the mix (`mix.wav` = `voice_bus.wav` + `sfx_bus.wav`).

Settings (override per sheet under `"mix"`): `voice_lufs` -16, `voice_tp_max` -1.5, `voice_hp_hz` 70,
`voice_offset` 0, `sfx_margin_lu` 14, `sfx_margin_free_lu` 12, `sfx_peak_max` -14, `duck_db` 5 (4-6),
`duck_attack` .03, `duck_release` .25, `duck_lookahead` .03, `duck_hold` .1, `final_tp_max` -1.5,
`edge_fade` .01, `tail_fade` .5, `dither` false.

## Placing cues well

- The pauses are the windows where effects are heard at full (still quiet) level: 1.06-1.84, 4.10-4.94,
  7.69-8.85, 11.77-12.55, 13.10-13.51, 14.57-14.97, 16.03-16.67, 20.84-21.38, and everything after 22.9 s.
  Under speech an effect is 5 dB lower and partly masked: fine for texture (dabs, specks), wasteful for story
  beats (coin, knock) - put those in a pause or on the lead-in frames before the word.
- Defaults are deliberately conservative ("quiet, never dominant"). For a story beat `+2 ... +4` is safe.
- Low thuds (`wood_knock`, `coin_drop_in`, `coin_land`, `rise` bed) lose their bottom on phone speakers; their
  300 Hz-3 kHz layers are what a phone plays. Do not compensate with gain.
- One clear sound per visual idea. Two or three cues in the same half second is the upper limit.

## Verification (provisional cue sheet, `python3 verify.py`)

All checks pass. Key numbers: voice -16.00 LUFS / -1.93 dBTP; SFX bus -40.8 LUFS gated, -48.4 LUFS during
speech (32 LU under the voice), short-term max while speaking -38.0 LUFS (ceiling -30.0), momentary max
-32.7 LUFS, max SFX peak -17.6 dBFS (cap -14); final mix -16.00 LUFS, true peak -1.93 dBTP, no clipped
samples; exactly 1 420 800 samples = 29.600 s; ducking measured with a steady noise cue: 4.99 dB between a
pause and speech; click detector (17 kHz residual, self-tested on 24 deliberate hard cuts) finds nothing in
the bus or at any cue boundary. ffmpeg `ebur128` agrees with `meter.py` (mix -16.0 LUFS / -1.9 dBFS,
SFX bus -40.8 LUFS / -17.6 dBFS).

Nobody has listened to these sounds: they were designed from synthesis knowledge and checked by measurement
(spectra, envelopes, loudness). A human audition of `sfx_demo/_audition_reel.wav` and `mix.wav` is still
worth a minute before the final mux.
