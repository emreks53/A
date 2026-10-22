# fix-sh07: pre-dawn near sea reads as water

**Defect (s2-7, s3-5):** before sunrise (f851-~930) the near sea looked like matte purple dunes with
hard-edged blotches that re-formed every frame.

**Root cause:** two things, both in the shot file:
1. The near ocean's FFT grid is 0.23 m (resolution 16 over 60 m). At 7-20 m from a 100 mm lens, each
   cell is 100-180 px wide, so the smooth-shaded triangles showed up as flat facets in the mirror
   reflection. The chop displace (0.12 m field) also aliased on that grid. It was the same at 64 spp
   without the denoiser, so the cause was geometry, not samples or the denoiser.
2. The sub-pixel ripple bump octaves (Noise detail 4, 70/m and 190/m layers) acted as heavy roughness
   at this grazing angle. With no sun to make glitter, they only blurred the sky mirror into a matte
   sheen.

**Fix (`video/blender/shots/sh07.py` only):**
* Added a Subdivision Surface modifier (render level 2) between the Ocean generate modifier and the
  Chop displace modifier on the near patch. The swell keeps its shape, the surface is now ~6 cm
  (smooth), and the chop no longer aliases.
* For the `sea` material only, added a pre-dawn normal chain: smooth swell ripples (3/m) plus
  resolvable capillaries (28/m, faded with distance). A keyed Value node (`dawn_ripples`, linear
  F-curve) crossfades it to the original glitter ripple chain over f930-938, as the rim breaks the horizon
  at ~f932, so the glitter arrives with the sun. From f938 on, the material is exactly as before.
  (Verifier round 1 caught that an earlier f912-930 crossfade brought the mottled look back
  around f925-931.)
* Water BSDF is unchanged: roughness 0.025, IOR 1.333. Not changed: camera, sky, clouds, sun timing,
  exposure keys, comp, samples.

**Evidence** (left = before, from the final chunks; right = after, the `--final` render):
* `f870_nearsea_crop100_before_after.jpg`: 100% crop x0-540 y1300-1800 (the s3-5 crop).
* `f862_nearsea_crop100_before_after.jpg`: 100% crop x540-1080 y1150-1650.
* `f929_nearsea_crop100_before_after.jpg`: 100% crop x200-740 y1300-1700, just before sunrise.
* `f870_phone_before_after.jpg`, `f950_phone_before_after.jpg`: phone size. f950 shows that the
  look after sunrise is kept.

**Measurements**
* Frame-to-frame best-match correlation of the near water (half-res y700-880, ±20 px), f879-882:
  before 0.78/0.78/0.79, after 0.87/0.88/0.90.
* Determinism: a run of 879-882 and a run started at 880 gave identical pixels for 880-882
  (max diff 0). Inside the crossfade, f933 rendered alone matched a run started at 927 (max diff 0).
* Cost: 41-44 s/frame before sunrise, 48-52 s/frame around and after sunrise (4 cores, full quality).

**Re-render:** 851-979 (the whole shot). The subdivision changes the near geometry in every frame,
so re-rendering only up to 930 would leave a visible pop at the join. Jobs can start on any frame.

**Independent verifier:** PASS on determinism, cost and the unchanged sky, camera and sun timing
(rim ~f932). Round 1 failed f925-931 (crossfade too early); that is fixed and re-checked at f927-935.
After sunrise the near sea is about 6% darker in red at f950, and individual glints shift slightly;
the glitter column layout is unchanged.

## Round 2 (director notes after the farm render of da9e92d)

**1) Clipped white dash at f903-907 (x520-555, y1007-1011): fixed.**
* **Cause (corrected):** the SunDisc proxy (emission 40, visible to camera) was seen through hairline
  cracks at the near/mid ocean seam (y = 165 m). The two patches have different FFT resolutions, so
  their edges don't meet. While the sun is below the horizon, a ray through the crack keeps descending
  under the far-sea plane and hits the disc. The cause was not the lamp or the world glow. (Round 1
  wrongly put it down to a glint while the sun was below the horizon.)
* **Fix:** a `SeamCatcher` plane 3 m under the patches (x ±400, y 100-2100 m), using the far-sea
  water material. Rays through a crack now find water. It is static, so any chunk start gives the
  same result.
* **Result:** peak luma in the box went from 216 to 103 at f903, and from 255 to 112 at f905. Sea max
  (y > 960) is 113 at f903 and 114 at f905 (target ≤ 115). With the catcher alone (no sway) the box
  max at f905 is 109.

**2) Fan of lines converging on the horizon centre, f905-932: fixed.**
* **Cause:** the OceanMid 60 m tile repeats 13 times along y, so every line of constant world x meets
  the same wave phases again and again, and they line up as rays.
* **Tests on f923** (fan ratio before 2.36):

  | Change | Fan ratio | Effect |
  |---|---|---|
  | Slicks off | 2.36 | none |
  | Slicks isotropic | 2.38 | none |
  | Normal detail off | 2.36 | none |
  | Subsurf on mid | 2.40-2.54 | none |
  | Mid resolution 12 | 2.71 | none |
  | Stratus, clouds or far plane hidden | 2.37-2.40 | none |
  | OceanMid hidden | 1.28 | fan gone |

* **Fix:** a geometry-nodes `mid_sway` on OceanMid shifts the mesh sideways by
  x += 30 m · sin(2π(y_local + 30)/640). The shift is 0 at the near seam, so the seam is unchanged,
  and the slope is ≤ 0.29. This breaks the alignment with no new seams and no time dependence.
* **Fan ratio** (my metric: std of the line-averaged high-pass luma, rows 953-1000, along lines
  through the horizon centre (540, 950), divided by the same for lines through control points 40, 100
  and 250 px higher; 1.0 = no fan). Before is the farm frame, after is the new render:

  | Frame | Before | After |
  |---|---|---|
  | f870 | 0.78 | — |
  | f884 | 1.00 | — |
  | f905 | 1.44 | 0.91 |
  | f923 | 2.39 | 1.01 |
  | f932 | 2.25 | 0.90 |

* **Side effect:** the faint bright column under the horizon centre before sunrise (the same aligned
  waves) is gone too.

**Unchanged.** Against the old code rendered here at f923:
* Rows 0-940 (sky) and rows 1100-1920 (near sea) are bit-identical (mean |d| 0.001, p99 0).
* Only the mid-sea band, rows 940-1100, changes.

Camera, sunrise timing (the rim shows at f932), the near-sea water look and the glitter path at f950
are kept.

**Evidence:**
* `r2_f903/905/923/932_midsea_crop100_before_top_after_bottom.jpg`: 100% crops x240-840 y900-1150;
  before is the farm render of da9e92d.
* `r2_phone_905_923_932_950_before_top_after_bottom.jpg`: phone size.

**Determinism:** f905 from a run started at 904 is identical to f905 rendered alone (max diff 0).

**Cost:** this round's container is slower. The old code (da9e92d) measured 62.7 s/frame at f923 and
the new code 61.5 s/frame, so the change costs nothing measurable. The new code measured 62-63 s/frame
at f903-923 and 71-74 s/frame at f932-950 here, against 41-52 s/frame for the same code in round 1's
container.

**Re-render:** the whole of 851-979, because the mid sea changes in every frame. Four jobs of about
32 frames: 851-883, 884-916, 917-948, 949-979. Jobs can start on any frame.
