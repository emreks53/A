# fix-sh09 round 2: the hero mitochondrion (f1188-1255)

The farm renders from the fix commit 7a82374, which builds on ca62af2. It changes only `video/blender/shots/sh09.py`. The re-render range is 1174-1255. Frame 1173 is unchanged: a fresh render differs from the farm frame by a mean of 0.4/255, which is the mp4 noise level. The 1173|1174 join is therefore invisible.

## What changed
* **Shape:** `mito_bean()` replaces the lib spindle for every mitochondrion. It has blunt superellipse ends (p=3), a bend of about 15 degrees, a flatter kidney flank, and one end slightly fuller. Length, width and object transforms are unchanged, so the f1250 framing and the hero's scale are kept.
* **Cristae:** `cristae_folded()` builds them as tongues rooted alternately on the two side walls.
  * They sit inside 0.70 x the local half-width, with centres within 0.30 x the length.
  * Reach is at most 0.68 across, and at most 0.48 for the end folds, so no fold spans the body or reaches the silhouette.
  * Tilt and undulation are in depth only.
  * Neighbouring folds have disjoint y-ranges by construction, so two folds can never cross. Mesh check: 43 neighbouring pairs, 0 overlaps.
* **Colour:** the outer membrane is a darker, saturated amber (face-on alpha 0.2) and the matrix glow is redder.
  * The hero's matrix emission is keyed from 140 down to 22 over f1215-1240, so it stays as bright as the chains while small and becomes deep amber at the cut.
  * The chain mitochondria use a brighter matrix (140).
* **sh10 port:** the helpers `upgrade_interior`, `mito_bean`, `cristae_folded`, the `mat_*_s9` materials and the BEAN/CRISTAE/MITO_VOL constants are self-contained.

## Round 2b (verifier findings on ca62af2)
* **Ghost tail (f1196-1228):** lib_s7 places heroMito1/2 almost entirely inside myofibrils. The old alpha decals glowed through the fibril; the volumetric bodies read there as dark ghosts. Both are nudged into the gap, by (+0.002, 0, -0.006) and (-0.005, 0, -0.002). These are the smallest clear offsets by an inside-mesh test, and neither body is in frame at f1250.
* **Shadows:** mitochondria no longer cast shadows, except the hero, which holds the glow light.
* **Front-left body (fgMito1, f1236-1255):** previously skin-tan with a tip highlight. The fg pair now uses the hero's keyed deep-amber matrix, fgMito1 is tilted -22 deg in the screen plane away from the hero, and the coat highlight is softer.
* **Bend:** 0.11 -> 0.16, about 10 deg on screen.
* **f1250 hand-off:** framing unchanged. The mean difference from the pre-nudge render is 0.19/255 (indirect light only).

## Numbers (final, hue-gated hero body mask)
| Frame | Hue | S | V | V without the brightest 20% | Band contrast |
|---|---|---|---|---|---|
| 1244 | 18 | 75% | 62% | 55% | 12.9% |
| 1250 | 19 | 75% | 65% | 58% | 13.2% |
| 1255 | 19 | 75% | 65% | 59% | 11.5% |

Crossing check: 43 neighbouring crista pairs, 0 overlaps. Determinism: 1230 and 1231 are bit-identical when started at 1229 or at 1230. Frame 1173 is unchanged (0.4/255 from the farm frame). Cost: 45-58 s/frame.

## Numbers from round 2a (ca62af2, box measurement)
| Frame | Hue | S | V | Band contrast |
|---|---|---|---|---|
| 1236 | 21 | 77% | 55% | 11.4% |
| 1244 | 21 | 79% | 64% | 12.3% |
| 1250 | 22 | 78% | 68% | 13.5% |
| 1255 | 22 | 79% | 70% | 11.4% |

The previous version at f1250 measured 4.3% band contrast and hue 27 / S 49% / V 82% (skin-tan).
* **Determinism:** 1229-1231 and 1230-1231, run across the emission ramp, produce bit-identical frames 1230 and 1231.
* **Cost:** 45-58 s/frame on 4 cores (final settings, 80% resolution).

## Files
* `phone_strip_*.jpg`: frames 1200/1220/1236/1244/1250 at phone size, before on the top row and after on the bottom.
* `f1200`, `f1236`, `f1250_100pct_before_after.jpg`: 100% crops, before on the left and after on the right.
