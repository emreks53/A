# fix-sh05 — fake light shafts, cross-like silhouette, hard TIR blobs (review s2-5)

**Fix** (`video/blender/shots/sh05.py`, code-only commit):
- **Look-up rays (f551-593):** 44 broad, faint wedges along the refracted sun ray, starting near the sun's point
  on the surface and ending in front of the lens, so on screen they fan out from the sun disc (vanishing point =
  sun at frame centre). Uneven length and brightness, faint at the core. They follow the "Allah" light swell
  only partly and fade out in the first 0.3 s of the tilt. Own seeded RNG stream.
- **Column shafts (plant section):** tapered cones, soft cross profile (axis-aware, no hard sides),
  near-exponential depth fade, shimmer drifting down them. Culled: shafts crossing the left 20% of the frame in
  f600-645 (the bar that made the cross at f614-626) and shafts passing within 0.3 m of the lens (broad posts).
- **TIR patches (look-up):** the Snell's-window edge blends into a slightly rough reflection, veiled by graded
  in-scatter (brighter toward the sun): no ink-black blobs. Keyed back to the plain glass over f600-640.
- **Fog:** camera rays seen through a transparent shaft use the camera distance (no dark streaks behind shafts).
  Transparent bounces 12 -> 64 (the converging rays exceeded 12 layers near the sun).
- **Kept:** caustic drift fix (W = wspeed*100/scale), timing (tilt f588.5, hero bubble into lens ~f720).

**Proof** (left = current film, right = fix): `f575_lookup`, `f589_tilt_start`, `f620_cross_crop`,
`f620_plant`, `f640_plant`, `f584_tir_patches_crop`. TIR region pixels < 45: 7-17% -> 0% (verifier).

**Unchanged frames:** f683+ are bit-identical to the old code (f690 and f700: max diff 0); the shafts are hidden
from f683.

**Determinism:** runs started one frame earlier give identical pixels (f590/591 from 589 vs 590; f620 from 619
vs 620, inside the surface ramp; max diff 0). Every change is a keyed F-curve or seeded.

**Cost** (alone, 4 cores, 80% res as before): ~38 s/frame look-up, 34-49 s/frame plant section.

**Re-render:** f545-682 in 3 jobs, which can start on any frame: 545-604 (~40 min), 605-650 (~37 min),
651-682 (~25 min). No event moved.

**Independent verifier:** round 1 failed (star-filter look, TIR not softer). Round 2 PASSED (a)-(e). Minor note:
a few veiled reflection specks at the top right of the look-up look slightly pale green; hardly visible at phone size.
