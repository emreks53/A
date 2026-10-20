# sh14c — review round 1 (studio S8)

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
| sh14c_t106.900.png | "şefkatsiz": rising/pulling back, empty cold expanse, dead wood |
| sh14c_t108.700.png | "izah": camera has stopped on the stone |
| sh14c_t109.800.png | last frame (hold) |

(The stills still show a small dry-branch prop at right; it is removed in the animatic and the current script.)

## Known issues / next round
* **Render time is over budget**: currently ~140 s/frame at final settings on this 4-core container.
  Working on it (dropping adaptive subdivision for a fixed displaced patch, fewer sand points, 12–16 spp +
  OIDN, cheaper ground shader). Will report the measured number.
* Distant ridge line is a bit uniform/CG; will add more variation and more haze layering.
* Sand sheets can read slightly "painted" at the peak of the gust; will break them up more.
