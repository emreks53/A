# sh14c — review round 4 (studio S8)

104.20–109.80 s · render f2495–2640 · "…işleri **cansız**, **şuursuz**, **şefkatsiz** tabiatla **izah edebilir mi**?"

## Decisions
* Flat overcast plate: CC0 Poly Haven `kloofendal_overcast_puresky`, desaturated to 25 % and pushed blue;
  every albedo (ground, rocks, wood) is desaturated to ~30 % and cooled. AgX Base Contrast, exposure −0.6.
  No warm value anywhere.
* Ground: CC0 `mud_cracked_dry_riverbed_002` (2 m tile, two rotated tilings blended against repetition)
  with true micro-displacement near camera; far plain gently undulating with low hazy ridges on the horizon
  (cold distance haze, ~4 km).
* Hero: CC0 `namaqualand_boulder_03` (scaled to ~0.9 m tall) — an inert, broken granite block. Dead wood:
  `dead_tree_trunk` (lying log behind the stone) and `tree_stump_02`; two smaller namaqualand boulders.
* Wind: 90 k saltating sand grains (point cloud, deterministic, motion-blurred) + two layers of advected
  "sand snake" sheets gliding over the cracks. Calm at "cansız", a **gust on "şuursuz" (105.62)** that
  streams sand across the frame, settling to a faint drift by "izah".
* One continuous camera move, 35 mm, f/5.6: low close-up on the stone (cansız) → slow dolly back as the
  sand streams through the foreground, focus racks to the ground (şuursuz) → crane up and back to the wide,
  empty expanse with the dead wood (şefkatsiz) → **eases to a stop at "izah" (108.66)** and stares at the
  stone (tiny breathing only) to the end.
* Key-word band (y 520–820) is flat overcast sky in every frame.
* Tracker: `TRK_stone` (top of the boulder) in case post wants a ring/"?" on the stone.

## Stills (50 %, preview quality)
| file | shows |
|---|---|
| sh14c_t104.200.png | first frame: close-up of the dead stone |
| sh14c_t104.900.png | "cansız": stone, still air |
| sh14c_t105.900.png | "şuursuz": gust, sand streams across cracked ground (motion blur) |
| sh14c_t107.200.png | "şefkatsiz": the wide — empty cold expanse, one large bleached log mid-ground, layered far ridges |
| sh14c_t108.700.png | "izah": camera has drifted back in and holds a low-angle medium shot of the stone, flat sky above |
| sh14c_t109.800.png | last frame (hold) |

Round 2: dry-branch prop removed; sand sheets are calm at "cansız", gust on "şuursuz", settle by "izah".

## Round 4 (director notes, review 3)
* Gust: ribbons stretched ~5:1, cross coordinate warped by slow animated 4D noise (±0.3 m over ~4 m), cut into
  0.5–2 m bursts, grainy edges, finest along-wind detail ≥1 m; boulder wind-shadow (lee, 0.4–3 m downwind)
  clears both sheets and grains; lifted dust = two stacked veil cards (4 cm, 18 cm) faded by view distance
  (the third card cost ~10 s/frame for no visible gain).
* Travel integral: dt = 1/240 s, exactly 10 steps per frame from a fixed origin — no 4 Hz surge.
* Camera: wide ~7.5 m from the stone held 0.3 s with a small slide, 93 % of the return travel done 0.4 s
  before landing at "izah"−0.05; handheld noise on the look-at target so the hold breathes; look-at raised
  (horizon lower in the band).
* Log screened toward weathered pale grey (texture/cracks kept); far plain fades crack albedo/bump to the mean
  25→60 m, roughness → 1, specular 0.12; sheets fade beyond ~18 m; clip_end 20 km; darker rock ridges, no
  pale tops, denser haze between layers; AgX Medium High Contrast, exposure −0.75; pebble skirt at the base;
  tex2 dropped. Final refuses to run if any S8_* variable is set.
* **Final, 100 %, 12 spp + threshold 0.03** (16 spp measured 115 s/frame in the gust — over the ceiling):
  f2547–2549 (fastest push / gust) **79.8 s/frame**, f2620–2622 (hold) **65.6 s/frame** (both include the
  first-frame sync). 100 % crop: `final100_f2548_crop.jpg` — no denoise blotching.

## Round 3 (director notes)
* Ending re-staged: after the wide (107.1 s) the camera drifts back in and settles at 108.6 s on a low-angle
  medium shot — stone fills the lower half, flat grey sky above for the "?" in the band — then holds, breathing.
* Wide: small boulders/stump removed; one large bleached `dead_tree_trunk` (1.9x) reads clearly mid-ground.
  Three layered ridge lines (≈1.3 km, 3 km, 5+ km) separated by the cold haze. Pale salt-crust patches and
  large tonal variation break the floor tiling.
* Gust: thin saltation ribbons hugging the ground (advected with the grain travel curve) + a faint dust veil
  at ~12 cm; grains still streak with motion blur.
* **Final measured: ~44 s/frame steady** (f2548–2550: 53.9 s, 43.7 s, 43.9 s).

## Known issues / next round
* ~~Render time over budget~~ fixed in round 2: adaptive micro-displacement is diced once from a fixed
  dicing camera, haze emission kept out of the light tree, one sand-sheet layer, 8 spp + OIDN.
  **Measured final: ~41 s/frame steady state** (f2548–2550 at 1080×1920: 49.6 s first frame, then 41.0 s
  and 40.7 s). The full-res frame 2549 looks photographic (sand streaks, crack displacement, overcast).
* Distant ridge line is a bit uniform/CG; will add more variation and more haze layering.
* Sand sheets can read slightly "painted" at the peak of the gust; will break them up more.
