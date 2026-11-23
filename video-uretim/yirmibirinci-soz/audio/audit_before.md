# SFX audit BEFORE (v3 mix, as delivered in v3_master.mp4)

Cue sheet `v3_backup/cues.json`, palette `v3_backup/sfx.py`. Columns: see the docstring of `audit.py` (att = 10-90 % attack, rise10 = hardest 10 ms onset in % of the peak, flat = spectral flatness 0 tone .. 1 noise, rough = 20-150 Hz envelope modulation). Nobody listened; these are measurements.

## 1. The bus

| measure | value |
|---|---|
| cues | 30 |
| SFX bus, gated integrated | -37.1 LUFS |
| SFX bus while the narrator speaks | -43.9 LUFS (voice -16.0: 27.9 LU below) |
| SFX bus in the pauses between words | -39.2 LUFS |
| momentary max (400 ms) | -29.2 LUFS |
| short-term max (3 s) while speaking / anywhere | -33.7 / -33.7 LUFS |
| highest effect peak | -15.0 dBFS sample, -14.8 dBTP (cap -14.0) |
| bus energy above 6 kHz / 10 kHz | -18.6 / -37.9 dB re total |
| bus spectral centroid | 1044 Hz |
| side-chain duck under speech | 4.0 dB |
| final mix | -15.99 LUFS, -1.85 dBTP |

## 2. Every sound the sheet uses (default parameters, default level, seed 0)

| sound | cues | dur s | att ms | rise10 % | cent Hz | >6k dB | >10k dB | flat | crest dB | rough % | LK100 | peak dBFS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `dab_flurry` | 3 |  0.87 |     5 |   87 |   819 | -30.3 | -45.1 | 0.63 | 22.5 |   35 | -30.2 | -17.4 |
| `whoosh` | 4 |  0.70 |   119 |   24 |  1593 | -28.1 | -46.4 | 0.81 | 17.1 |   15 | -35.0 | -26.6 |
| `puff` | 2 |  0.22 |    12 |   77 |  1132 | -20.9 | -34.4 | 0.53 | 18.6 |   26 | -34.5 | -22.4 |
| `specks` | 1 |  1.02 |     1 |   81 |  3910 |  -9.5 | -28.1 | 0.93 | 29.6 |   39 | -37.0 | -17.3 |
| `paper` | 1 |  0.35 |    15 |   55 |  2846 | -11.2 | -23.7 | 0.78 | 22.4 |   31 | -35.5 | -21.8 |
| `shimmer` | 5 |  1.60 |   484 |   16 |  4042 | -11.2 | -30.5 | 0.23 | 15.4 |   11 | -37.0 | -32.7 |
| `pop_flurry` | 2 |  0.71 |     3 |   93 |   748 | -36.8 | -48.7 | 0.73 | 17.5 |   39 | -35.7 | -23.4 |
| `pop` | 1 |  0.11 |     3 |   94 |   738 | -41.8 | -53.7 | 0.06 | 13.1 |   41 | -34.7 | -23.5 |
| `coin_land` | 1 |  0.24 |     7 |   92 |   439 | -34.4 | -48.3 | 0.52 | 14.9 |   22 | -33.5 | -22.1 |
| `coin_ting` | 1 |  0.40 |     2 |   96 |  3441 | -12.9 | -71.1 | 0.00 | 17.1 |   30 | -35.0 | -27.4 |
| `wood_knock` | 1 |  0.26 |     5 |   81 |   303 | -46.4 | -62.8 | 0.37 | 16.6 |   37 | -32.5 | -20.4 |
| `cloth_unroll` | 1 |  1.07 |     7 |   82 |  1932 | -20.3 | -38.6 | 0.85 | 20.0 |   21 | -35.0 | -24.8 |
| `coin_drop_in` | 1 |  0.63 |     3 |   96 |   294 | -42.3 | -57.2 | 0.63 | 16.7 |   30 | -32.5 | -20.9 |
| `room_tone` | 1 |  6.00 |  3419 |   49 |   396 | -29.3 | -40.9 | 0.48 | 13.9 |   20 | -57.0 | -47.6 |
| `rise` | 1 |  2.40 |   482 |   36 |   561 | -29.3 | -43.5 | 0.57 | 16.7 |   20 | -32.0 | -22.9 |
| `dab` | 4 |  0.08 |    10 |   90 |   776 | -34.4 | -51.9 | 0.42 | 16.2 |   39 | -31.9 | -17.4 |

## 3. Every cue in its place

| # | t s | sound | gain dB | dur s | att ms | rise10 % | cent Hz | >6k dB | >10k dB | flat | crest dB | rough % | LK100 in mix | peak in mix dBFS | on speech % | overlaps the words | what it accompanies |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0.100 | `dab_flurry` | +2.0 |  0.27 |     8 |   90 |   791 | -27.8 | -43.9 | 0.63 | 19.5 |   35 | -30.0 | -15.7 |   0 | - | b01_open: the last passes are dabbed in: four soft dabs locked to the passes at 0.07 / 0.13 / 0.20 / 0.27 |
| 1 | 1.800 | `whoosh` | +2.0 |  0.70 |   140 |   24 |  1575 | -28.4 | -46.6 | 0.80 | 15.4 |   15 | -34.1 | -28.2 |  35 | Bil ki | b03_dun: camera glide toward 'yesterday', very soft, peaks just before «Bil» |
| 2 | 3.720 | `puff` | +4.0 |  0.22 |    21 |   72 |  1255 | -20.5 | -33.3 | 0.56 | 17.6 |   21 | -34.5 | -23.5 | 100 | elinden çıktı | b03_dun: yesterday leaves the hand |
| 3 | 4.300 | `specks` | +4.0 |  0.82 |     2 |   73 |  4130 |  -8.9 | -27.5 | 0.90 | 28.4 |   36 | -33.7 | -15.2 |   0 | - | b04_pause_cross: the afterglow crumbles into specks |
| 4 | 4.570 | `whoosh` | +2.0 |  0.80 |   121 |   28 |  1636 | -27.9 | -46.5 | 0.83 | 16.2 |   15 | -33.2 | -26.2 |   0 | - | b04_pause_cross: glide from past to future (peak at the middle of the move) |
| 5 | 6.000 | `paper` | +5.0 |  0.30 |    16 |   57 |  3054 | -10.7 | -23.2 | 0.81 | 19.7 |   30 | -34.5 | -24.1 | 100 | elinde senet | b05_yarin_senet: the deed (senet): the seal is stamped |
| 6 | 6.370 | `puff` | +2.0 |  0.18 |    12 |   73 |  1213 | -20.4 | -34.1 | 0.55 | 20.0 |   20 | -36.5 | -22.3 | 100 | senet yok | b05_yarin_senet: «yok» - it is not there |
| 7 | 8.420 | `whoosh` | +2.0 |  0.70 |   143 |   30 |  1599 | -28.1 | -46.5 | 0.80 | 17.3 |   13 | -33.0 | -24.6 |   0 | - | b07_oyle_ise: the frame widens back to the centre (peak at the middle of the move) |
| 8 | 9.670 | `shimmer` | +4.0 |  1.40 |   311 |   24 |  4551 |  -7.3 | -30.3 | 0.23 | 15.7 |    7 | -37.0 | -31.7 |  70 | ise hakiki | b08_hakiki_omrunu: today lights up (peak on the second blaze pass) |
| 9 | 10.130 | `pop_flurry` | +3.0 |  0.25 |     3 |   94 |   803 | -37.8 | -50.4 | 0.63 | 16.1 |   35 | -34.5 | -23.6 | 100 | ömrünü | b08_hakiki_omrunu: flowers open: three soft pops, one per step |
| 10 | 11.630 | `shimmer` | +0.0 |  0.70 |   161 |   19 |  3726 | -12.0 | -30.5 | 0.14 | 15.3 |   12 | -41.0 | -36.2 |  63 | gün bil | «bil»: nod at its lowest 11.63-11.73, the lit rise blooms (peak f350) |
| 11 | 11.900 | `dab_flurry` | -1.0 |  0.27 |     6 |   89 |   859 | -33.7 | -50.1 | 0.70 | 19.5 |   33 | -33.0 | -16.8 |   0 | - | blaze settles + cobalt annulus 11.90-12.10 |
| 12 | 12.930 | `pop_flurry` | -1.0 |  0.58 |     4 |   87 |   718 | -36.6 | -48.6 | 0.75 | 15.7 |   38 | -37.6 | -27.3 |  58 | Lâekall | b10_laekall_bir_saat: the hours are laid round the sun: eight very soft tick-pops, one per step of the sweep |
| 13 | 13.970 | `pop` | +5.0 |  0.11 |     3 |   93 |  1128 | -42.4 | -56.5 | 0.05 | 12.7 |   37 | -34.9 | -25.4 | 100 | bir | b10_laekall_bir_saat: one hour comes out of the ring |
| 14 | 15.370 | `coin_land` | +5.0 |  0.24 |     5 |   86 |   609 | -34.0 | -48.0 | 0.18 | 17.3 |   35 | -32.5 | -19.0 | 100 | akçesi | b11_ihtiyat_akcesi: caught in the palm |
| 15 | 15.420 | `coin_ting` | +2.0 |  0.40 |     2 |   96 |  3517 |  -9.9 | -71.2 | 0.00 | 18.1 |   32 | -37.0 | -29.1 | 100 | akçesi | b11_ihtiyat_akcesi: the rim is stamped: now it rings like a coin |
| 16 | 16.330 | `whoosh` | +2.0 |  0.60 |   117 |   29 |  1639 | -28.2 | -46.4 | 0.79 | 16.9 |   16 | -34.0 | -25.6 |   0 | - | b12_hakiki_istikbal: pull back and turn to the right (peak at the middle of the move) |
| 17 | 16.970 | `shimmer` | +5.0 |  1.50 |   458 |   23 |  4139 | -10.4 | -30.7 | 0.22 | 16.2 |    9 | -36.0 | -30.3 |  84 | hakiki istikbal | b12_hakiki_istikbal: the true future (peak on the brightest pass) |
| 18 | 18.770 | `wood_knock` | +5.0 |  0.22 |     4 |   91 |   331 | -40.5 | -54.3 | 0.09 | 16.5 |   35 | -31.5 | -18.3 | 100 | bir | b13_sandukca: the lid settles on the little chest |
| 19 | 19.970 | `dab_flurry` | +1.1 |  0.42 |     5 |   90 |   759 | -29.8 | -43.9 | 0.57 | 22.6 |   41 | -33.2 | -18.3 | 100 | olan bir | b14_mescid: the chest is re-stencilled into a mescid |
| 20 | 21.930 | `cloth_unroll` | +4.0 |  0.67 |    13 |   68 |  1646 | -21.0 | -39.1 | 0.78 | 19.7 |   20 | -35.0 | -23.9 | 100 | veya bir seccadeye | b15_seccade: the rug unrolls; the soft flap lands as the fringe flicks out |
| 21 | 22.870 | `coin_drop_in` | +5.7 |  0.63 |    14 |   69 |   279 | -39.9 | -58.2 | 0.65 | 17.3 |   30 | -27.0 | -17.5 |   0 | - | b16_at: the hour sinks into the niche: soft thud and a warm low bloom |
| 22 | 23.000 | `room_tone` | +3.0 |  7.10 |  1638 |   55 |   385 | -29.4 | -41.0 | 0.48 | 13.5 |   21 | -53.8 | -44.7 |   0 | - | end-card air |
| 23 | 23.230 | `shimmer` | +2.0 |  1.10 |   321 |   20 |  4344 |  -8.6 | -30.8 | 0.17 | 15.9 |   10 | -35.0 | -29.6 |   0 | - | LINK 3: the far light swells (the hour has reached the true future) |
| 24 | 24.350 | `rise` | +4.0 |  1.70 |   374 |   32 |   554 | -29.3 | -43.9 | 0.59 | 16.9 |   17 | -28.0 | -18.9 |   0 | - | cream cover grows out of the far light (peak inside the cover) |
| 25 | 25.550 | `shimmer` | +1.0 |  1.50 |   493 |   33 |  3918 |  -9.3 | -30.6 | 0.18 | 16.4 |    8 | -36.0 | -31.1 |   0 | - | end card: warm light on the Qur'an eases on (24.5-25.5) |
| 26 | 25.800 | `dab` | -1.0 |  0.10 |    10 |   84 |   755 | -36.7 | -52.5 | 0.68 | 17.3 |   35 | -33.5 | -18.5 |   0 | - | end card: 'Risale-i Nur' |
| 27 | 26.267 | `dab` | +1.0 |  0.07 |    12 |   79 |   772 | -31.4 | -45.0 | 0.54 | 14.9 |   32 | -30.7 | -16.7 |   0 | - | end card: 'Sözler' + accent light |
| 28 | 26.733 | `dab` | -1.0 |  0.09 |    11 |   85 |   785 | -36.0 | -48.3 | 0.59 | 16.0 |   32 | -34.0 | -20.3 |   0 | - | end card: 'Yirmi Birinci Söz' |
| 29 | 27.167 | `dab` | -1.0 |  0.08 |    11 |   83 |   661 | -37.2 | -49.8 | 0.67 | 14.4 |   35 | -32.5 | -19.9 |   0 | - | end card: '291. Sayfa' |

## 4. Under the narrator (a rough masking model: 1-ERB bands 100 Hz - 8 kHz, 43 ms frames)

Masked threshold of the voice in a band = the voice's level there and in the neighbouring bands (spread -9 dB per ERB upward, -20 dB per ERB downward), held for 30 ms, minus 8 dB. `excess` = effect level minus that threshold, maximum over the bands (dB): below 0 the voice hides the effect completely, 0-10 dB it is faintly there, far above it stands in the clear (a pause, or a gap between syllables). "heard" = share of the cue's frames (those within 20 dB of its own loudest frame) with excess above 0; "clear" = above +15 dB. A model, not a listening test.

While the narrator is inside a word (voice within 15 dB of its median speech level) and the bus is sounding (3.7 s in all): excess median **5.9 dB**, 95th percentile **22.1 dB**, maximum **34.8 dB**; the effect is above the voice's threshold in 71 % of those frames and more than 10 dB above it in 34 %.

| # | t s | sound | frames | heard % | clear % | excess while inside a word: median / max dB |
|---|---|---|---|---|---|---|
| 0 | 0.100 | `dab_flurry` | 18 | 100 | 100 | never inside a word |
| 1 | 1.800 | `whoosh` | 47 | 100 |  60 | 5.3 / 34.8 |
| 2 | 3.720 | `puff` | 14 |  93 |  21 | 13.6 / 18.9 |
| 3 | 4.300 | `specks` | 44 | 100 | 100 | never inside a word |
| 4 | 4.570 | `whoosh` | 51 | 100 | 100 | never inside a word |
| 5 | 6.000 | `paper` | 17 |  76 |   6 | 7.2 / 18.4 |
| 6 | 6.370 | `puff` | 11 |  82 |  64 | -0.4 / 7.1 |
| 7 | 8.420 | `whoosh` | 49 | 100 | 100 | never inside a word |
| 8 | 9.670 | `shimmer` | 102 |  69 |  35 | 1.2 / 24.3 |
| 9 | 10.130 | `pop_flurry` | 21 |  71 |  14 | 2.5 / 19.6 |
| 10 | 11.630 | `shimmer` | 52 | 100 |  50 | 7.3 / 14.5 |
| 11 | 11.900 | `dab_flurry` | 26 | 100 | 100 | never inside a word |
| 12 | 12.930 | `pop_flurry` | 46 |  74 |  50 | -2.3 / 12.4 |
| 13 | 13.970 | `pop` | 8 | 100 | 100 | 26.9 / 34.4 |
| 14 | 15.370 | `coin_land` | 8 |  75 |  50 | 0.2 / 24.0 |
| 15 | 15.420 | `coin_ting` | 16 | 100 |  25 | 16.4 / 24.0 |
| 16 | 16.330 | `whoosh` | 42 | 100 | 100 | never inside a word |
| 17 | 16.970 | `shimmer` | 110 |  85 |  40 | 5.3 / 18.7 |
| 18 | 18.770 | `wood_knock` | 9 |  67 |  44 | 11.7 / 27.6 |
| 19 | 19.970 | `dab_flurry` | 20 |  95 |   0 | 6.3 / 12.2 |
| 20 | 21.930 | `cloth_unroll` | 47 |  81 |  26 | 11.4 / 24.7 |
| 21 | 22.870 | `coin_drop_in` | 48 | 100 | 100 | never inside a word |
| 23 | 23.230 | `shimmer` | 80 | 100 | 100 | never inside a word |
| 24 | 24.350 | `rise` | 98 | 100 | 100 | never inside a word |
| 25 | 25.550 | `shimmer` | 106 | 100 | 100 | never inside a word |
| 26 | 25.800 | `dab` | 8 | 100 | 100 | never inside a word |
| 27 | 26.267 | `dab` | 6 | 100 | 100 | never inside a word |
| 28 | 26.733 | `dab` | 8 | 100 | 100 | never inside a word |
| 29 | 27.167 | `dab` | 7 | 100 | 100 | never inside a word |

## 5. Reading of the tables: what the client most probably heard as "kaba"

Hard = attack under 8 ms or `rise10` above 70 %; noisy = flatness above 0.5; crackly / rattling = roughness above 30 %;
hissy = more than -13 dB of the energy above 6 kHz.

| sound | cues | verdict | why (numbers above) |
|---|---|---|---|
| `dab`, `dab_flurry` | 7 (0.10, 11.90, 19.97, end card x 4) | **coarse: remove** | noise bursts with 5-12 ms attacks and a 100 Hz thump, `rise10` 79-90 %, the hottest peaks of the bus (-15.7 ... -20 dBFS); runs of 3-4 at 15 Hz (roughness 33-41 %). Heard alone on the end card and at t = 0.1 they are bumps on a microphone. The 19.97 flurry had to be trimmed by the peak cap. |
| `specks` | 1 (4.30) | **coarse: remove** | 1-2 ms ticks at 2-6.5 kHz, crest 28 dB, flatness 0.9, -9 dB above 6 kHz, peak -15.2 dBFS in a pause: crackle / static. |
| `paper` | 1 (6.00) | **coarse: remove** | crackle bursts, centroid 3 kHz, -11 dB above 6 kHz, flatness 0.8; entirely on «elinde senet». |
| `puff` | 2 (3.72, 6.37) | **coarse: remove** | noise bursts with a plosive, `rise10` 72 %; both entirely on words («elinden çıktı», «senet yok»): reads as a pop on the recording. |
| `pop`, `pop_flurry` | 3 (10.13, 12.93, 13.97) | **remove (runs), replace (single)** | 3 ms attacks, `rise10` 87-94 %; a run of eight and a run of three at 12-15 Hz (roughness 35-38 %), all on words. |
| `coin_land` + `coin_ting` | 2 (15.37, 15.42) | **replace** | thud (5 ms attack) plus a 2 ms-attack ring at 2.7 / 4.7 / 6.3 kHz (-10 dB above 6 kHz): thin, metallic, clicky. |
| `wood_knock` | 1 (18.77) | **coarse: remove** | 4 ms attack, `rise10` 91 %, peak -18.3 dBFS, on «bir». |
| `cloth_unroll` | 1 (21.93) | **coarse: remove** | 0.5 s of hiss-like "shhh" (flatness 0.8, centroid 1.6 kHz) and a flap, all on «veya bir seccadeye». |
| `coin_drop_in` | 1 (22.87) | **remove (new ending)** | the loudest cue of the film (LK100 -27, peak -17.5 dBFS), a thud: there is no impact any more. |
| `whoosh` | 4 | **keep the idea, soften** | already a swell (attack 120-140 ms) but bright for "air": centroid 1.6 kHz with an air layer at 4.2 kHz. |
| `shimmer` | 5 | **keep the idea, replace the sound** | soft attack, but it is 45 % hiss (3-7.5 kHz noise) under a cloud of random sines at 2.2-8 kHz: centroid 4 kHz, -7 ... -12 dB above 6 kHz. Bright, glassy, slightly sour. |
| `rise` | 1 (24.35) | **keep, soften, lower** | broad swell, fine in character, but the loudest sustained thing in the film (LK100 -28) and it carries a 55-60 / 91 Hz sine bed that reads as hum on headphones. |
| `room_tone` | 1 | **keep** | -54 LUFS brown air; hides the step from the recording's noise floor to digital silence. |

In numbers: 19 of the 30 cues were hard-attack sounds (`rise10` above 55 %), 11 of them sat entirely on words, and the six
hottest peaks of the bus (-15.2 ... -17.5 dBFS) were a crackle, four bumps and a thud.
