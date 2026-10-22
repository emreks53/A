# fix-sh01 round 3: grass/stalk dew beads with dark cores (f43-70)

**Code-only fix commit 74b8ce9** (sh01.py only; lib_s1.py and common.py untouched):
- **(b) Seating:** an sh01-local copy of `grass_blade` (same geometry, same rng draws in the same order) seats
  each dew bead ON the blade sheet (lift until clear, +10 um) instead of sinking it through the blade.
- **(a) Translucency through dew:** the grass materials (sh01's instances of `lib_s1.mat_grass`) are translucent
  for camera rays as before, and now also for rays that came out of grass dew:
  Is Transmission Ray x (Transmission Depth >= 2) x NOT Is Singular Ray. Grass dew (sh01's own `m_dew`; LeafDew,
  HeroDrop and TipBead use the separate "HeroDrop" material) gets an imperceptible 0.02 roughness, which makes its
  refraction non-singular. An ungated (a) brightened the hero drop interior by a mean of 15-22 levels and shifted
  the grade through the lens diffusion filter, so it was not used.
- **(c) Shadow-transparent dew** was tested and dropped: it changed LeafDew and the leaf shading.

**Result** (`luma_stats.md`): dark pixels (<45) in changed beads, old -> new: f43 234 -> 0, f54 795 -> 5,
f60 702 -> 0 (verifier: f48 943 -> 5, f65 616 -> 16, f120 195 -> 0). Director's regions at f54:
(85-160,1085-1140) 369 -> 5 (min luma 22 -> 48); the bead in (335-418,0-200) 475 -> 0. The remaining <45 px
there lie on the dark edge of the brown stalk, as in the old frames. Strip: `strip390_f43_54_60_70...jpg`.
100% crops: `region1_f54...`, `region2_f54...` (left = film, right = fix).

**Side effect (not zero):** the gate also fires on some non-dew path that I have not identified. Diffuse-depth,
glossy-depth and depth == 2 conditions were tested and did not isolate it. The result is a small, uniform
brightening:
- whole frame: mean luma +0.4 to +0.6;
- seedling leaf: +1 to +2.6 levels;
- hero drop box: mean +0.1 to +0.3 (max 2-8);
- LeafDew boxes: max 4-10;
- f103 SessileDrop box: +1.4 (mostly the leaf seen through it).
It is uniform over the shot, so there is no flicker, and the verifier found it below a visible threshold in
side-by-sides.

**sh13a unaffected:** the diff is sh01.py only. lib_s1.py blob c6c8cfd is identical at HEAD, HEAD~1 and bd990b2;
sh13a does not import sh01.

**Determinism:** start-1 vs start: max 1/255 (f70, f54), the same float noise as the old code.

**Cost:** new vs old on the same host: 93.5 vs 92.0 s/frame at f102-103; the verifier's 5-frame mean is 92.6 vs
91.9 (+0.8%). Both sit around the 90 ceiling on this host, as the accepted code already did.

**Re-render:** the whole shot 0-131, same 5 jobs: 0-29, 30-59, 60-89, 90-119, 120-131. No event moved.

**Independent verifier:** PASS on the bead fix, sh13a isolation, determinism, cost and artefacts. CONDITIONAL on
"unchanged": the small brightening above needs the director's sign-off, or a tighter gate.
