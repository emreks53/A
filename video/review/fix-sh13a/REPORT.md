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
   - Mean display luma, new, full res (director's farm measurement): 0.510 / 0.520 / 0.496 / 0.510 at
     1896 / 1944 / 1968 / 2016. The farm frames before the fix fell to about 0.44 after 1944. The meadow area
     gains about +0.66 stop from 1896 to 1944.
4. **Splice-safe:** everything is keyed from 79.0 s.
   - The haze and bark changes settle in over 79.0-80.4 s.
   - The far additions do not exist up to f1896.
   - Over f1897-1929 they fade in from transparent, using their own material copies.
     Correction: f1897 is not a perfectly clean start. On the farm render, about 1650 px (render y850-910,
     x450-970) step darker at f1897: the band by -0.011, single specks by up to -0.25. That is about 40% of
     their final value, most likely from the transparent-bounce limit of 8. It is invisible at phone size.
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

## Round 2 (director notes on the farm render of bd990b2): line at the hedge base

**Fix commit: 43ab22a.** It renders on top of the accepted frames. Keep 1774-1943 exactly as rendered.

- **Defect:** a ruler-straight dark + pale line along the hedge base, at render y672-675, x≈530-940, from
  about f1958 to the end. Cause: the ground grid ended about 280 m out, and rays past it reached the HDRI's
  unhazed dark field band.
- **Fix,** all keyed in over f1944-1952:
  - A far ground ring out to about 3 km, using the same hazed ground material. It is built from fine 2 m
    quads near the grid, so it cannot poke through, and coarse quads beyond.
  - Between 290 and 420 m its surface blends into the sky radiance of the view direction. The ring only shows
    past the 200 m grass tops, at more than about 350 m.
  - Below +1.6° elevation the world is looked up at +1.6°, so the HDRI's own dark field/bush band is replaced
    by the sky just above it.
  - The ring uses a fading copy over f1945-1951 and a plain copy from f1952.
  - No hedge placement, RNG draw or animated element changed.
- **Dip,** measured as the row-mean luma over render x528-888. A dark line is a row darker than both side
  windows; a pale line is a row brighter than both.

  | frame | before (bd990b2): dark / pale | after (43ab22a): dark / pale |
  |---|---|---|
  | 1960 | 0.014 / 0.004 | 0.0002 / 0.017 |
  | 1990 | 0.046 / 0.047 | 0.000 / 0.016 |
  | 2016 | 0.051 / 0.047 | 0.000 / 0.019 |

  - Every 6th frame from 1958 to 2026, plus 1959, 1960, 1990 and 2016: the dark dip is ≤ 0.002 throughout.
  - The remaining pale bump of 0.016-0.023 at y≈668 is the horizon sky seen under the darker hedge canopy.
    It is soft and irregular, not a straight line (see the 100% crops).
- **Identity:**
  - Frames 1940-1944 rendered with 43ab22a vs bd990b2 on the same host: max raw difference 0.0016,
    blurred 0.0003. Not bit-identical (float noise from the extra nodes), but invisible.
  - The 1943|1944 join is therefore clean.
- **Determinism:** a run started at 1951 vs one started at 1952, across the swap: max 0.0005 on 1952-1953.
- **ŞEFKAT background** (render y590-660), relative luminance, with the contrast ratio against white text:

  | frame | before | after |
  |---|---|---|
  | 1960 | 0.239 (3.64) | 0.239 (3.63) |
  | 1990 | 0.242 (3.60) | 0.253 (3.47) |
  | 2016 | 0.245 (3.56) | 0.253 (3.46) |

  Both stay above the 2.5 gate.
- **Cost,** same host: about 80 s/frame, versus 85-86 for bd990b2 at 1958-1960. This host is slower than
  round 1's, so there is no extra cost.
- **Evidence:** `r2_<f>_{before,after}_hedgebase_100pct.jpg` and `r2_<f>_phone390_before_after.jpg`
  for f1960, f1990 and f2016.
- **Re-render:** 1944-2026 in 3 jobs: 1944-1971, 1972-1999, 2000-2026. Any job may start on any frame.

