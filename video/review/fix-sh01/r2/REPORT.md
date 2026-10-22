# fix-sh01 round 2: sunk LeafDew beads, floating residual bead (director QA notes)

**Code-only fix commit d22d09c** (on top of the accepted 265890c; the sessile drop, camera, timing, impact f103,
lighting and grade are unchanged):
1. **LeafDew beads:** they were placed from the leaf mid-plane, ignoring the solidify half-thickness and subsurf,
   so 30 of 36 cut into the leaf (leafR_16 by 123 um) and rendered with dark lower halves. Each bead is now
   ray-cast onto the evaluated top skin (render-level subsurf), sits 10 um (~1 px) above it, and is lifted further
   where the leaf curves under its footprint. The RNG order is unchanged.
2. **TipBead (residual bead):** it was keyed at a static world point while the blade recoils and sways, so it hung
   50-104 px below the tip on f89-116. It is now parented to the blade and keyed in the blade's frame, a constant
   21 px below the tip. Its bottom edge on f100-104 is at y 548-508, above the y573 cap line.

**Evidence** (left = approved n1/n2 film, right = fix, 100% crops): `leafR_16_f96/f110/f114.jpg`,
`leafR_12_f96/f110/f114.jpg`, `tipbead_f89/f102/f110/f116.jpg`. Phone sheet:
`phone390_top_before_bottom_after.jpg` (f89, f102, f110, f116). Luma stats per frame and per bead, f96-114:
`luma_stats.md`. The total of bead pixels below 45 went from 6414 to 263, all of the remainder on leafR_16 at
f108-114; those pixels are a refracted dark vein and the lens's rim, not an intersection.

**Unchanged elsewhere:** compared with the old code on the same host, outside the beads (+30-40 px), f20 differs by
at most 5/255 and f70 by at most 7/255 (noise). Differences at f89/f102/f110 are only inside the hero drops, which
refract the moved beads.

**Determinism:** f110 from a start at 109 vs a start at 110: at most 1/255. f103 from 102 vs 103: at most 2/65535
(verifier). The proof frames were rendered just before the commit and differ from post-commit renders by at most
3/255 near the drop.

**Cost:** 86.7 s/frame vs 86.0 for the old code on this host, idle (the verifier's measurement). Unchanged, near
the 90 s ceiling.

**Re-render:** the whole shot 0-131. The beads are in frame from f30 to f131, and the old frames 0-29 render the
same code path, so this gives seamless joins. Five jobs of up to 30 frames (~43 min + setup each), any start
frame: 0-29, 30-59, 60-89, 90-119, 120-131. No event moved.

**Independent verifier:** PASS on (a)-(f). Off-screen only: two leafL beads remain mis-seated (never in frame).
