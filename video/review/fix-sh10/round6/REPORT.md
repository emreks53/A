# sh10 round 6: interior from sh09 r6 final (a82b349, look C)

**Farm commit:** `b1ac91e7bb3f658c3ec808ccbd71e274a139109d` on `render-fix-sh10`.
- `lib_s7.py` is byte-identical to a82b349.
- `sh10.py` is unchanged since the import: it calls `L.upgrade_interior_s9(inter, wave, frames)`, and its tree is identical to the tested 91e4a24 on top of the accepted fc7ed65.
- `common.py` is untouched.

## 1 Build
The build log is the same as sh09's:
- `[lib_s7] hero rolled -30.0 deg: cleared 2 myofibrils, 0 chain mitochondria`
- `294 myofibrils kept, 2 cleared, 31 T-tubule rings dropped`

## 2 f1250 gate (farm settings: final, 8 spp, OIDN, 80 % = 864x1536, sh09 rendered from a82b349)
| f | MAD /255 | 60-px block mean abs diff | 60-px block max | signed RGB | low-pass NCC |
|---|---|---|---|---|---|
| 1247 | 5.17 | 3.70 | 30.8 | +2.65 +2.77 +2.64 | 0.9872 |
| 1248 | 3.70 | 2.55 | 23.6 | +1.84 +1.92 +1.85 | 0.9940 |
| 1249 | 2.50 | 1.57 | 8.7 | +1.28 +1.20 +1.13 | 0.9983 |
| **1250** | **1.78** | **1.00** | **6.71** | +0.81 +0.48 +0.44 | **0.9994** |
| 1251 | 5.02 | 3.33 | 31.0 | -1.05 -1.96 -1.93 | 0.9853 |
| 1252 | 8.69 | 6.52 | 59.8 | -3.03 -4.54 -4.44 | 0.9597 |

**Verdict.** f1250 misses the 1/255 MAD and 3/255 block numbers. The cause is sampling, not content: sh09 cannot meet those numbers against itself either.
- **Noise floor.** sh09 against sh09 with seed+1, at the same settings: MAD **1.67**.
- **Clean renders:** 256 spp, no denoise, no compositing, 30 %, motion blur off. Metrics are 18-px blocks at 30 % (60 px at full resolution).

  | comparison | block mean | block max | signed R |
  |---|---|---|---|
  | sh09 vs sh09, seed 8 | 0.77 | 5.7 | 0.0 |
  | sh10 vs sh09 | 0.95 | 8.0 | +1.15 |
  | sh09 vs sh09 with its 6e-7 W `impulse` light removed (invisible) | 1.45 | 14.1 | +2.24 |

  - Remove `impulse` from sh09 and sh10 sits at −1.09 R.
  - Add an identical `impulse` light to sh10 and it sits at −1.6 R.
- **Mechanism.** The renders use indirect clamp 3.0 with SSS and fast GI. The converged image then depends on the light-tree composition by ±2/255. The two scenes' light sets differ only by lights that are dark at 1250, but that is enough. It is not tunable short of cloning sh09's whole light rig.
- **Content matches** (scene diff at 1250):
  - Every mesh instance within 3 m of the camera has the same camera-space transform, vertices, materials and random id.
  - Fog, exposure, look, AO, DOF and samples are equal.
  - The cristae wave is the same, expressed in sh10's frame; its front is 0.18 m away from the hero at 1250.
  - All of sh10's own objects are parked 10 km away. Deleting them changes nothing (MAD 0.001).
- **Ruled out:** probe light-linking, motion blur, AO distance 0.2 vs 10 (MAD 0.02).

Same 60° hero axis, the same mito and the same colours: see `f1250_sh09_vs_sh10_50pct.jpg`. The block-diff map `f1250_diff_12px_blocks_x12.jpg` shows only low-amplitude noise.

## 3 Dissolve 1247-1252
`dissolve_1247-1252_sh09_sh10_mix.jpg` has three rows: sh09, sh10, and a linear crossfade.
- The mito, axis, colours and background match across the whole range, and the mix row shows no ghosting.
- By 1252 the shots part slightly, by design: the two camera paths diverge away from 1250. The luma offset stays within ±4.5/255.

## 4 Determinism, any start frame, TRK
- **Determinism.** 1298 and 1299 are bit-identical between a run from 1296 and a run started at 1298.
- **Accepted frames.** 1303 is bit-identical to the fc7ed65 code, so the accepted frames ≥1298 are unchanged.
- **TRK.** `TRK_cells` is unchanged from round 5 (`round5/sh10_track.json`). At f1250 the cells' TRK is off-screen, as before. The (428,675) point is sh09's hero TRK, and sh10 shows the same mito at the same place at 1250 (see the pair).

## 5 Cost and jobs (80 %, 4 cores)
Measured in-run cost:
- interior: 53-58 s/f;
- crossing and close-up, 8 spp: ≤69 s/f;
- field, 16 spp: ≤70 s/f.

Any start frame renders identically, so the jobs can split anywhere:
| job | frames | estimate |
|---|---|---|
| 1244-1279 | 36 | ~35 min |
| 1280-1307 | 28 | ~32 min |
| 1308-1352 | 45 | ~53 min |
| 1353-1397 | 45 | ~53 min |

## 6 Independent verification (subagent): PASS on all four checks
1. In b1ac91e, `lib_s7.py` (blob 06030fe1) is byte-identical to a82b349, `sh10.py` to 91e4a24, and `common.py` to fc7ed65.
2. b1ac91e has the same tree as 91e4a24 (3135baa), and its parent is 5ae0f8e (origin).
3. The verifier recomputed every gate number exactly. At f1250 the hero is the same: same tilt, position and colours. There is no woman, text, logo or cross.
4. The dissolve sheet is continuous, with no ghosting in the mix row. At 1252 the sh10 frame is shifted slightly, as expected.
