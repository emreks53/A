# SFX audit AFTER (v4 palette, cue sheet v4)

Cue sheet `cues.json`, palette `./sfx.py`. Columns: see the docstring of `audit.py` (att = 10-90 % attack, rise10 = hardest 10 ms onset in % of the peak, flat = spectral flatness 0 tone .. 1 noise, rough = 20-150 Hz envelope modulation). Nobody listened; these are measurements.

## 1. The bus

| measure | value |
|---|---|
| cues | 18 |
| SFX bus, gated integrated | -41.9 LUFS |
| SFX bus while the narrator speaks | -50.5 LUFS (voice -16.0: 34.5 LU below) |
| SFX bus in the pauses between words | -44.2 LUFS |
| momentary max (400 ms) | -33.1 LUFS |
| short-term max (3 s) while speaking / anywhere | -38.9 / -38.7 LUFS |
| highest effect peak | -22.9 dBFS sample, -22.9 dBTP (cap -18.0) |
| bus energy above 6 kHz / 10 kHz | -41.8 / -60.3 dB re total |
| bus spectral centroid | 890 Hz |
| side-chain duck under speech | 4.0 dB |
| final mix | -16.00 LUFS, -1.88 dBTP |

## 2. Every sound the sheet uses (default parameters, default level, seed 0)

| sound | cues | dur s | att ms | rise10 % | cent Hz | >6k dB | >10k dB | flat | crest dB | rough % | LK100 | peak dBFS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `air` | 6 |  0.80 |   138 |   33 |   934 | -90.4 | -119.9 | 0.84 | 15.1 |   20 | -38.0 | -30.3 |
| `glow` | 8 |  1.40 |   223 |   29 |  1124 | -112.2 | -119.8 | 0.02 | 16.5 |   16 | -39.0 | -30.9 |
| `glint` | 2 |  0.68 |    11 |   64 |  2149 | -119.6 | -120.0 | 0.00 | 14.4 |   12 | -39.0 | -35.2 |
| `room_tone` | 1 |  6.00 |  3419 |   49 |   391 | -31.4 | -47.8 | 0.48 | 13.9 |   20 | -57.0 | -47.6 |
| `rise` | 1 |  2.40 |   448 |   36 |   627 | -38.9 | -58.3 | 0.71 | 15.8 |   19 | -34.5 | -26.5 |

Spare, not used by the sheet: `touch` (felt-soft tap) - dur 0.22 s, att 9 ms, rise10 75 %, centroid 268 Hz, -62 dB above
6 kHz, flatness 0.26, crest 14.0 dB, roughness 31 % (a single soft tap), LK100 -40.0, peak -29.3 dBFS.

## 3. Every cue in its place

| # | t s | sound | gain dB | dur s | att ms | rise10 % | cent Hz | >6k dB | >10k dB | flat | crest dB | rough % | LK100 in mix | peak in mix dBFS | on speech % | overlaps the words | what it accompanies |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 1.800 | `air` | +1.5 |  0.90 |   295 |   29 |   918 | -89.9 | -119.9 | 0.83 | 17.6 |   18 | -38.6 | -30.1 |  43 | Bil ki | camera glide toward 'yesterday' (1.60-2.40, the one move that runs over words): soft air that peaks in the pause just before «Bil» |
| 1 | 4.230 | `glow` | +2.0 |  0.75 |   184 |   28 |  1219 | -112.0 | -119.8 | 0.02 | 16.6 |   14 | -41.0 | -32.6 |  27 | çıktı | the afterglow blooms where yesterday's sun met the ridge (passes 4.10 / 4.17 / 4.23) and dabs out 4.30-4.43: one dim, warm bloom that fades (was: crackling specks) |
| 2 | 4.570 | `air` | +1.5 |  0.80 |   108 |   43 |   930 | -90.2 | -119.9 | 0.83 | 16.8 |   18 | -37.0 | -27.9 |   0 | - | glide from past to future (camera 4.17-4.97, peak at the middle of the move) |
| 3 | 8.420 | `air` | +1.5 |  0.70 |   116 |   31 |   946 | -90.8 | -119.9 | 0.90 | 16.6 |   17 | -36.5 | -27.3 |   0 | - | the frame widens back to the centre (camera 8.07-8.77, peak at the middle) |
| 4 | 9.670 | `glow` | +4.0 |  1.40 |   181 |   36 |  1116 | -115.1 | -119.9 | 0.03 | 15.1 |   15 | -39.0 | -32.3 |  66 | Öyle ise hakiki | today lights up: the veil parts 8.77-9.17, the blaze passes 9.57 / 9.67 / 9.77 (peak on the second pass); its tail carries the flowers opening 10.13-10.27 |
| 5 | 11.650 | `glow` | +0.5 |  0.70 |   104 |   24 |  1176 | -114.0 | -119.9 | 0.02 | 15.8 |   13 | -42.5 | -34.8 |  83 | gün bil | «bil»: the nod at its lowest, the lit rise blooms warm gold (11.53-11.87, peak f350 = 11.667) |
| 6 | 13.970 | `glint` | +1.0 |  0.42 |    12 |   62 |  2124 | -119.7 | -120.0 | 0.00 | 13.6 |   15 | -42.0 | -37.2 | 100 | bir saatini | one hour comes out of the ring, gold (pop f419 = 13.967): the small first glint of the gold hour |
| 7 | 14.720 | `air` | +0.0 |  0.80 |   166 |   28 |   668 | -105.3 | -119.9 | 0.82 | 16.5 |   18 | -41.5 | -32.8 |  16 | saatini ihtiyat | the follow move that tracks the hour floating down into his palm (camera 14.27-15.17, peak at the middle, in the pause before «ihtiyat») |
| 8 | 15.370 | `glint` | +3.0 |  0.79 |    11 |   64 |  2164 | -119.5 | -120.0 | 0.00 | 15.2 |   12 | -40.0 | -36.7 | 100 | akçesi | it lands in his palm and is minted in one press (f461 = 15.367; glint dabs 15.40-15.53): the same glint, fuller |
| 9 | 16.330 | `air` | +1.5 |  0.60 |   115 |   25 |   971 | -90.2 | -120.0 | 0.87 | 16.1 |   15 | -37.9 | -29.8 |   0 | - | pull back and turn to the right (camera 16.03-16.63, peak at the middle) |
| 10 | 16.970 | `glow` | +4.0 |  1.20 |   285 |   22 |  1294 | -113.1 | -119.9 | 0.03 | 17.0 |   12 | -39.0 | -30.7 |  98 | hakiki istikbal | the true future: the far light in three passes 16.83 / 16.90 / 16.97 (peak on the brightest pass) |
| 11 | 20.330 | `glow` | +0.5 |  1.00 |   198 |   35 |  1128 | -115.1 | -119.9 | 0.26 | 17.0 |   15 | -42.5 | -34.4 | 100 | olan bir mescide | the chest opens into a mescid (dome, body and minaret 19.97-20.33): the gold crescents pop 20.33 / 20.37 over the glowing doorway - one soft bloom under «mescide» (was: a flurry of four dabs) |
| 12 | 21.550 | `air` | +1.0 |  0.60 |    55 |   33 |   810 | -97.1 | -119.9 | 0.84 | 17.2 |   19 | -41.0 | -31.1 | 100 | veya bir seccadeye | the rug unrolls 21.43-21.93 with a quart ease-out (fastest at the start): the softest air, no cloth hiss, no flap |
| 13 | 22.870 | `glow` | +1.5 |  0.65 |   178 |   22 |  1320 | -113.3 | -119.9 | 0.06 | 17.2 |   15 | -41.3 | -32.7 |  13 | at | NEW ENDING: the gold hour dissolves upward into light in four stepped passes (22.57-22.87) and a stream of light dabs rises to the far light: one soft, warm, climbing bloom (starts 22.51, top on the last pass); no impact |
| 14 | 23.000 | `room_tone` | +3.0 |  7.10 |  1638 |   55 |   380 | -31.5 | -47.9 | 0.48 | 13.5 |   21 | -53.8 | -44.7 |   0 | - | end-card air (also hides the step from the recording's noise floor to digital silence) |
| 15 | 23.230 | `glow` | +3.0 |  1.50 |   238 |   34 |  1091 | -113.5 | -119.9 | 0.29 | 18.0 |   15 | -36.2 | -26.8 |   0 | at | the answers: the niche swells in its glow 22.90, the mosque's door and windows 23.07, the far light swells 23.23 - one continuous warm swell that peaks on the far light |
| 16 | 24.350 | `rise` | +2.5 |  1.70 |   363 |   37 |   619 | -38.9 | -58.8 | 0.72 | 16.6 |   19 | -32.0 | -23.3 |   0 | - | the cream cover grows out of the far light (23.90-24.30), the end card comes up as light (peak inside the cover) |
| 17 | 25.550 | `glow` | +0.0 |  1.60 |   364 |   35 |  1095 | -114.7 | -119.9 | 0.26 | 16.5 |   13 | -39.0 | -30.7 |   0 | - | end card: the warm light on the Qur'an eases on (25.0-26.0) |

## 4. Under the narrator (a rough masking model: 1-ERB bands 100 Hz - 8 kHz, 43 ms frames)

Masked threshold of the voice in a band = the voice's level there and in the neighbouring bands (spread -9 dB per ERB upward, -20 dB per ERB downward), held for 30 ms, minus 8 dB. `excess` = effect level minus that threshold, maximum over the bands (dB): below 0 the voice hides the effect completely, 0-10 dB it is faintly there, far above it stands in the clear (a pause, or a gap between syllables). "heard" = share of the cue's frames (those within 20 dB of its own loudest frame) with excess above 0; "clear" = above +15 dB. A model, not a listening test.

While the narrator is inside a word (voice within 15 dB of its median speech level) and the bus is sounding (3.2 s in all): excess median **2.9 dB**, 95th percentile **12.6 dB**, maximum **29.3 dB**; the effect is above the voice's threshold in 59 % of those frames and more than 10 dB above it in 13 %.

| # | t s | sound | frames | heard % | clear % | excess while inside a word: median / max dB |
|---|---|---|---|---|---|---|
| 0 | 1.800 | `air` | 59 |  93 |  54 | 3.2 / 29.3 |
| 1 | 4.230 | `glow` | 54 |  76 |  72 | -8.1 / -1.9 |
| 2 | 4.570 | `air` | 51 | 100 | 100 | never inside a word |
| 3 | 8.420 | `air` | 46 | 100 | 100 | never inside a word |
| 4 | 9.670 | `glow` | 95 |  66 |  17 | 0.3 / 13.0 |
| 5 | 11.650 | `glow` | 52 |  85 |  42 | 4.7 / 10.6 |
| 6 | 13.970 | `glint` | 13 |  92 |   0 | 7.9 / 13.1 |
| 7 | 14.720 | `air` | 52 |  67 |  56 | -9.4 / 12.3 |
| 8 | 15.370 | `glint` | 19 |  63 |  16 | -2.4 / 22.0 |
| 9 | 16.330 | `air` | 37 | 100 |  97 | never inside a word |
| 10 | 16.970 | `glow` | 83 |  78 |  22 | 6.8 / 16.6 |
| 11 | 20.330 | `glow` | 68 |  53 |   1 | -2.4 / 9.2 |
| 12 | 21.550 | `air` | 39 |  49 |   0 | -0.9 / 12.9 |
| 13 | 22.870 | `glow` | 48 |  90 |  62 | 0.6 / 3.7 |
| 15 | 23.230 | `glow` | 101 | 100 | 100 | never inside a word |
| 16 | 24.350 | `rise` | 98 | 100 | 100 | never inside a word |
| 17 | 25.550 | `glow` | 110 | 100 | 100 | never inside a word |

## 5. Before / after

| the effects bus | v3 (delivered) | v4 | change dB |
|---|---|---|---|
| gated integrated loudness | -37.1 LUFS | -41.9 LUFS | -4.7 |
| while the narrator speaks | -43.9 LUFS | -50.5 LUFS | -6.5 |
| in the pauses between words | -39.2 LUFS | -44.2 LUFS | -5.0 |
| momentary maximum (400 ms) | -29.2 LUFS | -33.1 LUFS | -3.9 |
| short-term maximum (3 s) while speaking | -33.7 LUFS | -38.9 LUFS | -5.1 |
| highest effect peak (sample) | -15.0 dBFS | -22.9 dBFS | -7.9 |
| energy above 6 kHz (re total) | -18.6 dB | -41.8 dB | -23.2 |
| energy above 10 kHz (re total) | -37.9 dB | -60.3 dB | -22.5 |
| spectral centroid | 1044 Hz | 890 Hz | (-155 Hz) |
| cues | 30 | 18 | |
| cues with a hard onset (`rise10` above 55 %) | 19 | 2 (the two glints: 62-64 % at a 10-90 % attack of 11-12 ms, a pure tone without contact noise) | |
| cues with a 10-90 % attack under 8 ms | 9 | 0 (fastest attack in the sheet: 11 ms; v3: 2 ms) | |
| cues lying entirely on words (more than 95 % of their energy) | 10 | 5 | |
| on words (masking model, section 4): median / 95th percentile excess over the voice's threshold | 5.9 / 22.1 dB | 2.9 / 12.6 dB | -3.0 / -9.5 |
| on words: frames more than 10 dB above the voice's threshold | 34 % | 13 % | |
| voice | -16.00 LUFS | -16.00 LUFS | untouched |
| final mix | -15.99 LUFS, -1.85 dBTP | -16.00 LUFS, -1.88 dBTP | |

Why the bus numbers fell by more than the 3 dB that were asked for: the single cues are about 3 dB under their v3
counterparts (camera airs -36.5 ... -38.6 LK100 in the mix against -33.0 ... -34.1 for the v3 whooshes; light blooms in the
clear -36.2 / -39.0 against -35.0 / -36.0; cues under words -39 ... -42.5 against -31.5 ... -41; `rise` -32.0 against
-28.0), but 12 cues are gone without a replacement (six that lay on words, six bumps in pauses and on the end card) and
with them every transient: the six hottest v3 peaks were -15.2 / -15.7 / -16.7 / -16.8 / -17.5 / -18.3 dBFS, the three
hottest now are -23.3 / -26.8 / -27.3 dBFS. Integrated loudness counts events; the level of what is still heard is "a
little quieter", as asked. By the masking model the typical effect on a word is 3 dB closer to the voice's threshold than
in v3 and the intrusive tail (95th percentile) 9.5 dB closer. If the bus should sit nearer the -40 / -47 LUFS aim: +2 dB on
every cue gain gives about -39.9 gated, about -48.5 during speech, peaks about -20.9 dBFS (still under the -18 cap).

## 6. What happened to every v3 cue

| v3 cue | v4 | why |
|---|---|---|
| 0.10 `dab_flurry` (opening passes) | removed | three bumps before the first word; the picture needs nothing there |
| 1.80 `whoosh` | `air` 1.80 | same event, darker (centroid 0.9 kHz, was 1.6), slower, no 4 kHz layer, 2.5 dB lower |
| 3.72 `puff` (sun leaves the hand) | removed | a noise plosive on «elinden çıktı» |
| 4.30 `specks` (afterglow crumbles) | `glow` 4.23 | the crackle is gone; the afterglow itself blooms dimly and fades |
| 4.57 `whoosh` | `air` 4.57 | as 1.80 |
| 6.00 `paper`, 6.37 `puff` (deed, «yok») | removed | crackle and a plosive on «elinde senet yok»; "it is not there" is silence |
| 8.42 `whoosh` | `air` 8.42 | as 1.80 |
| 9.67 `shimmer` | `glow` 9.67 | warm air + four soft partials 1.5-4.1 kHz instead of hiss + random sines up to 8 kHz |
| 10.13 `pop_flurry` x3 (flowers) | removed | a run of three on «ömrünü»; the tail of the 9.67 bloom carries the flowers |
| 11.63 `shimmer` | `glow` 11.65 | the bloom's peak is frame 350 = 11.667 (within one frame) |
| 11.90 `dab_flurry` x4 | removed | four bumps in a pause |
| 12.93 `pop_flurry` x8 (hours laid) | removed | a run of eight ticks; the dial is built in silence under the gloss «en az» |
| 13.97 `pop` (+5 dB) | `glint` 13.97 (short, soft) | the gold hour's first small glint instead of a "bloop" |
| - | `air` 14.72 (new) | the one camera move that had no sound (14.27-15.17, follows the hour down) |
| 15.37 `coin_land` + 15.42 `coin_ting` | `glint` 15.37 | one soft glint (attack 11 ms, no thud, no tick; 2.0 / 3.5 / 4.8 kHz instead of 2.7 / 4.7 / 6.3) |
| 16.33 `whoosh` | `air` 16.33 | as 1.80 |
| 16.97 `shimmer` | `glow` 16.97 | as 9.67 |
| 18.77 `wood_knock` (lid) | removed | a knock on «bir»; the felt-soft spare `touch` would be masked there anyway |
| 19.97 `dab_flurry` x4 (chest -> mescid) | `glow` 20.33 | one soft bloom when the gold crescents and the doorway light up |
| 21.93 `cloth_unroll` | `air` 21.55 | no "shhh", no flap: the softest downward air on the fast start of the unrolling |
| 22.87 `coin_drop_in` | `glow` 22.87 (`rising`) | NEW ENDING: no impact; a bloom that climbs while the hour dissolves upward |
| 23.00 `room_tone` | `room_tone` 23.00 | unchanged |
| 23.23 `shimmer` | `glow` 23.23 | the three answers as one warm swell that peaks on the far light |
| 24.35 `rise` | `rise` 24.35 | no sine bed (hum), no rumble (high-pass 200 Hz), darker top, 4 dB lower |
| 25.55 `shimmer` | `glow` 25.55 | as 9.67, darker (`brightness` 0.4) |
| 25.80 / 26.267 / 26.733 / 27.167 `dab` | removed | the four lines fade in exactly like the film's glosses, which are silent; four bumps at 2.2 per second in an otherwise still room read as a metronome. The spare `touch` exists if a touch is wanted after all (README) |

## 7. Clicks, edges, stereo

* `verify.py`: ALL CHECKS PASSED (log: `verify_v5.log`). Click detector (17 kHz residual, self-tested on 24 deliberate hard
  cuts that score 0.096-0.152): whole bus 0.0002, every cue boundary (+-2 ms and, separately measured, +-5 ms) at most 0.0001;
  limit 0.006; v3 had 0.0022 / 0.0010.
* Largest sample-to-sample step anywhere on the bus: -41.2 dBFS (at 24.26 s, inside `rise`).
* Every sound starts and ends on exact zero; first / last 0.5 ms are at least 126 dB under the sound's peak.
* Side-chain: 4 dB under speech, in place when a word starts (50 ms attack with 50 ms look-ahead, 350 ms release); the
  fastest gain movement is 2.7 dB in 20 ms and falls on word onsets.
* Cue times: every cue time lies inside the stretch where its sound is within 1 dB of its own maximum (swells), the two
  glints start on their frame (middle of the attack on t, waveform peak about 10 ms later).
* Stereo: L / R correlation +0.52, mono fold-down loses 1.1 LU (nothing in anti-phase).
* Files: `mix.wav`, `sfx_bus.wav`, `voice_bus.wav` 48 kHz stereo 16-bit, 1 444 800 samples = 30.100 s, identical to a fresh render.

## 8. Not verified by ear

Nobody listened. The measurements say: no hard onsets, no crackle, no hiss, no rumble, no clicks, a narrator who is
34.5 LU above the bus while speaking. They cannot say whether a sound is *beautiful*. The three judgements that rest on
synthesis knowledge alone:

1. the shimmer of `glow` (sine partials at 1536 / 2048 / 3072 / 4096 Hz) reads as soft glassy light and not as a thin
   ringing or "a tone" - if it does, `"shimmer": 0.3` (or `0`: only the warm air) in the glow cues' `params` removes it;
2. `glint` (2048 Hz + two coin modes, 19 ms attack) reads as gold catching the light and not as a notification "ding" -
   if it does, `"duration": 0.3` or delete the two cues (13.97, 15.37);
3. the level: each cue is about 3 dB under its v3 counterpart and the transients are gone, so the effects may feel more
   than "a little" quieter - +2 dB on every `gain_db` is safe (gated -39.9, during speech -48.5, peak -20.9 dBFS).

Pictures (spectrograms, looked at): `pictures/bus_v4.png` (bus and voice, 0-30 s, cue times marked),
`pictures/palette_v4.png` (every sound), `pictures/ending_v4.png` (22.2-26.6 s).
