# fix-sh09 round 2: the hero mitochondrion (f1188-1255)

The farm renders from the fix commit ca62af2, which changes only `video/blender/shots/sh09.py`. The re-render range is 1174-1255. Frame 1173 is unchanged: a fresh render differs from the farm frame by a mean of 0.4/255, which is the mp4 noise level. The 1173|1174 join is therefore invisible.

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

## Numbers (f1236/1244/1250/1255, hero body away from the glow core)
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
