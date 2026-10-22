# fix-sh09 round 3

The fix commit is dfb1df1 (round 3c), which builds on b50ccbe and 67f3496. It changes `lib_s7.py`, by additions only, and `sh09.py`. The re-render range is 1174-1255.

## What changed
* **Shared code:** the interior upgrade now lives in lib_s7 as new functions. `upgrade_interior_s9(inter, wave, frames)` covers the bean bodies, cristae, membranes, T-tubules, the HERO_NUDGE offsets and the hero matrix-glow key (HERO_KEY, absolute frames 1215-1240). sh10 calls the same function right after `build_fibre_interior()`, so the f1250 cut matches by construction. No existing lib_s7 function changed, so sh06 is untouched.
* **Centre:** the bean cross-section is re-centred on its axis by subtracting (zmax+zmin)/2. The flat flank is 0.92 and there is no taper. The body midline, TRK_mito and the glow light are back at the body centre, and the light no longer pokes out of the flank onto the fibril.
* **Cross:** the membrane and fold coats are 0.08 or less, with roughness 0.5 or more, so no long specular streak crosses a fold.
* **Colour:** the director's values. The hero's end emission is 11, and the outer membrane's face-on alpha is 0.4.
* **Folds:**
  * Parameters: yspan 0.24, radius 0.64 x the half-width, te clamped at 0.95.
  * Spacing and reach are irregular, with a slight bow in the screen plane. Every term sits inside each fold's y-extent, and neighbouring extents are disjoint, so folds can never cross. Mesh check: 32 pairs, 0 overlaps.
  * They are soft and slightly translucent.
* **Clearance:** HERO_NUDGE is re-tuned (heroMito1, heroMito2, fgMito0). None of the 112 bodie## Round 3b (independent verifier findings on 67f3496)
* **Measurement:** the gate masks are now the hero's exact projected silhouette (its faces rasterised from the scene), not a colour mask. The colour mask clipped the body edge and merged it with the overlapping body.
* **Colour:**
  * The outer membrane's face-on alpha is 0.55, with a darker, redder base.
  * The matrix and rim emission is (1, .42, .05), and the hero's end emission is 8.
  * Specular is 0.25, and the cristae coat is 0.05.
* **Foreground pair:** it gets its own faint membrane (alpha 0.15) and dim folds (an object-level material), so its folds no longer read as "bread-roll" spots. fgMito0, the out-of-focus body that sat over the hero's top, is moved up and right, still clear of the fibrils. heroMito1's y nudge is reverted.
* **Folds:** softer and more translucent, with per-fold thickness and reach variation, and a bow of 0.012 so no fold curls into a hook.

## Round 3c (second verifier pass, on b50ccbe)
* **Folds:** they are placed by a random partition of the span, with every gap at least the no-crossing minimum. Tilt, undulation and bow are smaller, so about 6 folds fit on the hero. Alpha is 0.75 and the glow is softer. The result is irregular, soft inner membranes rather than evenly spaced slashes.
* **Foreground pair:** its folds are nearly invisible (alpha 0.06, near-zero glow), so no oval spots remain.

## Gates (final frames of dfb1df1, full quality, 864x1536, on the exact projected hero silhouette)
| Frame | H | S | V | R>=254 px | Ridges touching a fold | Box band contrast | fg glint (own silhouette) |
|---|---|---|---|---|---|---|---|
| 1248 | 25.6 | 82% | 68% | 0 | 0 | 7.3% | +6.3 |
| 1250 | 25.6 | 81% | 69% | 0 | 0 | 7.0% | +7.0 |
| 1255 | 25.6 | 80% | 70% | 0 | 0 | 7.6% | +4.7 |
| 1244 | 25.3 | 83% | 66% | 0 | 0 | 7.0% | +5.7 |
| 1236 | 24.3 | 83% | 56% | 0 | 0 | 4.9% | +7.4 |
| 1210/1214/1220 | 22-25 | - | - | 0 | 0 | 13-19% | +10 to +14 |

* **Foreground glint at 1210-1220:** the foreground pair is out of focus close to the camera, and its projected silhouette spans x 256-647. The peaks above +10 there are rims of the bodies behind it, seen through the faint veil (for example heroMito2 at x 287-306), not glints on the foreground bodies.
* **Midline:** at f1250 it lies on TRK_mito (428, 675 at 864 px). The verifier measured 427-428.5 against 430.5 for the farm frame.
* **Overlay:** the real co_mito overlay lands centred on the body at 1213-1243.
* **Checks:**

  | Check | Result |
  |---|---|
  | Folds (mesh check) | 35 pairs, 0 overlaps |
  | Clearance | 0 of the 112 bodies has a vertex inside a myofibril |
  | Join | 1173 is 0.40/255 from the farm frame |
  | Determinism | 1229-1231 vs 1230-1231: bit-identical frames 1230 and 1231 |
  | Cost | 49-55 s/frame on 4 cores (58 s at f1173) |

## Files
* `phone_strip_1210-1255_step5.jpg`
* `phone_compare_farm_r2b_r3_*.jpg`: rows are the farm frame, round 2b, then round 3.
* `f1236_100pct_*` and `f1250_100pct_*`: 100% crops, farm | round 2b | round 3.
* `ridge_maps_*.jpg`: yellow marks high-pass above 8 inside the body.
* `co_mito_overlay_*.jpg`
