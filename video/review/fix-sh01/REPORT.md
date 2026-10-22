# fix-sh01 — black hole on the f103 impact (review s1-2)

**Cause.** The flattened impact bead (`SessileDrop`) was placed with its centre at 0.92 x its half-height above
the leaf, so 8% of it was sunk into the leaf mesh. The water/leaf intersection disc rendered solid black on the
impact frame (the bead is flattest there: sz = 0.42), and as a brown-black blob in the lower half of the settling
bead (f104-110). More bounces did not help (tested 16/16/16/8: no change); lifting the bead did.

**Fix** (`video/blender/shots/sh01.py`, code-only commit): the bead rests on the leaf (20 um gap ≈ 0.7 px, contact
reads correctly). The hidden pre-impact keys now hold the impact pose instead of the 1 m mesh scale, so motion blur
cannot pick up the giant sphere.

**Proof** (full quality, 1080x1920): dark pixels (<40) in the issue box x506-580, y1169-1233: f103 3405 -> 0,
f107 589 -> 0, f108 295 -> 0 (verifier). Crops: `f103/f107/f110_before_after.jpg` (left = current film, right = fix),
`f103_phone_before_after.jpg`.

**Determinism.** A run started at f104 vs one started at f103: max diff 1/255 (float noise). Keys are built over the
whole shot whatever the start frame is.

**Cost.** 68.7-74 s/frame on 4 cores (unchanged from the base; no geometry or sample change).

**Re-render.** f103-124 (the bead is visible and moved up ~80 um until it leaves frame at ~f123; f124 is safety).
f102 is unchanged (the bead is hidden there). One job, start at f103: 22 frames ≈ 27 min + setup.
No event moved (impact stays on f103).

**Independent verifier.** PASS on (a) defect gone at 100% and phone size, (b) f102 and far-from-bead areas at the
encode-noise floor, (c) determinism, (d) cost, (e) range.
