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

**Not in scope, and there before this fix:** a faint fan of converging lines toward the horizon centre
(the OceanMid tile repeat) is visible around f915-935, and a ~50 px sun glint appears at f905-906
while the sun is still below the horizon.
