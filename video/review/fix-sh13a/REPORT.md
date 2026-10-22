# fix-sh13a — REPORT

**Fix commit:** bd990b2 (changes only `video/blender/shots/sh13a.py`). **Defect:** review s5-5, sh13a wide shot, f1930-2020.

## What changed
1. **Far meadow:** grass clumps and wildflower drifts now run out to the forest edge, so the bare dark strip
   and the straight meadow edge are gone. An irregular, hazy hedgerow along the open right horizon
   breaks the meadow/sky line. All new placements use their own seeded RNGs.
2. **Treeline:** the old haze mixed an opaque emission over alpha leaf cards, which made grey fog boxes and
   pale "ghost" trunks. The new haze respects the leaf alpha and is applied evenly to ground, grass,
   shrubs and trees (in-scatter (1, .76, .5), d0 = 450 m). Tree bark albedo is x0.35.
3. **The beat:**
   - 79.0-81.0 s: the sun gains +0.6 stop and turns slightly warmer.
   - 81.0-82.6 s: the sun gains another +0.6 stop while the rise finishes.
   - 79.0-82.6 s: the sky gains +0.4 stop, and its tint moves from pink toward golden.
   - Mean display luma at res 25 (old → new): 1896 0.511 → 0.511, 1944 0.484 → 0.526, 1968 0.435 → 0.508,
     2016 0.438 → 0.524. The meadow area gains about +0.66 stop from 1896 to 1944.
4. **Splice-safe:** everything is keyed from 79.0 s.
   - The haze and bark changes settle in over 79.0-80.4 s.
   - The far additions do not exist up to f1896.
   - Over f1897-1929 they fade in from transparent, using their own material copies.
   - From f1930 on, plain copies are used instead. They look identical, and avoiding the Transparent
     BSDF saves about 6 s/frame.
   - Frames 1776-1872 render bit-identical to the old code (16-bit, same host). 1896 differs by at most 0.0004.

The camera path and the bee, grass and butterfly events are unchanged, and no visible event moves.

## Proof
- **Before/after crops** of farm frames vs the new full-quality render, at 1960 and 2010, plus a
  phone-size side-by-side at 1960.
- **Determinism:** compared each job against one started one frame earlier.
  - Start 1958 vs 1959: matches within 0.0006.
  - Start 1929 vs 1930, across the swap: blurred max 0.0013.
  - The verifier's start 1928 vs 1930: blurred max 0.0009. Its start 1894 vs 1898: max 143/65535.
- **Cost:** steady state on 4 cores.
  - Round-1 host: about 63-72 s/frame vs 66.5 s for the old code.
  - On a 1.35x slower host: 97 s vs 90 s for the old code, so about +8.5% on the same host.
  - The fade window f1897-1929 costs about 5% more than the rest.
  - Peak memory is 10.3 GB, so run one job per 16 GB node.
- **Independent verifier,** 2 rounds: PASS WITH NOTES.
  - Round 1 found that the far geometry changed frames before 1896. That is fixed in bd990b2.
  - Remaining minor note: a thin, about 5 px, slightly dark straight line at the hedgerow base, at
    y≈670-676 in 2010. It is barely visible at phone size.

## Re-render
Re-render sh13a **1896-2026** (131 frames) in 4 jobs: 1896-1928, 1929-1961, 1962-1994 and 1995-2026.
Any job may start on any frame.
