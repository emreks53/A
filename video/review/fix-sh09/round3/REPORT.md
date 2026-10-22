# fix-sh09 round 3

The fix commit is 67f3496. It changes `lib_s7.py`, by additions only, and `sh09.py`. The re-render range is 1174-1255.

## What changed
* **Shared code:** the interior upgrade now lives in lib_s7 as new functions. `upgrade_interior_s9(inter, wave, frames)` covers the bean bodies, cristae, membranes, T-tubules, the HERO_NUDGE offsets and the hero matrix-glow key (HERO_KEY, absolute frames 1215-1240). sh10 calls the same function right after `build_fibre_interior()`, so the f1250 cut matches by construction. No existing lib_s7 function changed, so sh06 is untouched.
* **Centre:** the bean cross-section is re-centred on its axis by subtracting (zmax+zmin)/2. The flat flank is 0.92 and there is no taper. The body midline, TRK_mito and the glow light are back at the body centre, and the light no longer pokes out of the flank onto the fibril.
* **Cross:** the membrane and fold coats are 0.08 or less, with roughness 0.5 or more, so no long specular streak crosses a fold.
* **Colour:** the director's values. The hero's end emission is 11, and the outer membrane's face-on alpha is 0.4.
* **Folds:**
  * Parameters: yspan 0.24, radius 0.64 x the half-width, te clamped at 0.95.
  * Spacing and reach are irregular, with a slight bow in the screen plane. Every term sits inside each fold's y-extent, and neighbouring extents are disjoint, so folds can never cross. Mesh check: 32 pairs, 0 overlaps.
  * They are soft and slightly translucent.
* **Clearance:** HERO_NUDGE is re-tuned (heroMito1, heroMito2, fgMito0). None of the 112 bodies has a vertex inside a myofibril.

## Gates (full-quality frames)

**Centre, colour and folds:**

| Frame | Midline x | R>=254 px | H / S / V | Box band contrast |
|---|---|---|---|---|
| 1250 | 455 (farm 456) | 380 | 26.6 / 73% / 69% | 8.0% |
| 1255 | 456 | 398 | 26.4 / 72% / 70% | 7.6% |
| 1244 | 447 | 46 | 26.5 / 73% / 68% | 7.4% |
| 1236 | 432 | 0 | 25.3 / 76% / 58% | 7.7% |

At 7a82374 the f1250 values were midline 491, 44.9k px at R>=254, and H 18.

**Crossing ridges:** at 1210, 1214, 1220, 1236, 1244, 1250 and 1255, the number of vertical ridges (>8 luma after a 12 px Gaussian high-pass, >20 px long) that touch a fold dash is 0 in every frame. The remaining vertical ridges are the body's silhouette rim.

**Foreground tip glints:** at most +10. The only high-pass blobs above +10 in the left third of the frame lie on the hero's own rim.

**TRK_mito at f1250:** (535, 844) in 1080 coordinates, which is (428, 675) at 864 px wide, on the body. The real co_mito overlay (comp/overlays.py with this track) is composited over 1213-1243 and lands centred on the body.

**Join and hand-off:** 1173 is 0.39/255 from the farm frame, so the join is invisible. sh10's farm f1250 still differs by 16.2/255, but that frame shows the old mitochondria look. Once sh10 calls `upgrade_interior_s9`, both shots render the same interior.

**Determinism:** 1229-1231 and 1230-1231 give bit-identical frames 1230 and 1231.

**Cost:** 53-63 s/frame on 4 cores (final settings, 80% resolution).

## Files
* `phone_strip_1210-1255_step5.jpg`
* `phone_compare_farm_r2b_r3_*.jpg`: rows are the farm frame, round 2b, then round 3.
* `f1236_100pct_*` and `f1250_100pct_*`: 100% crops, farm | round 2b | round 3.
* `ridge_maps_*.jpg`: yellow marks high-pass above 8 inside the body.
* `co_mito_overlay_*.jpg`
