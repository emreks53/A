# sh03 — the sofra: bread & fruit, water poured, crane to top-down (9.64–16.00 s) — review 2

Script: `video/blender/shots/sh03.py`; set, props, pour rig in `video/blender/lib_s4.py` (shared with sh02,
which now carries the same set table so the sh02→sh03 boom-down is continuous).
Light rig for S5/sh08: `video/review/LIGHT_SETUP_S4.md` (sun from the LEFT of a camera looking +Y).

## Beats (all keyed from `ctx.word`)
| t | beat |
|---|---|
| 9.34–9.74 | continues sh02's boom down onto the table (same position/aim at the cut), dropping to slider height |
| 9.64 "yemek" | low slider along the table's front edge past the village loaf, the plate with the opened pomegranate and the fruit bowl, turning toward the sunlit glass |
| 10.52 "içmek" | arrives macro (35 mm at ~0.25 m) on the clear tumbler, side/back-lit by the window; the jet hits the bottom at 10.48 (1 frame before the word) |
| 10.5–11.9 | the pour: ballistic jet (radius thins with speed, Plateau-Rayleigh varicose undulation + wobble), level rises with an ease-out, entrained bubble plume loops down and rises, meniscus at the wall; slow push in |
| 11.9 | jet tail detaches, the (unseen) pourer lifts the jug away above frame |
| 12.0 "bütün" | crane up and back revealing the whole table |
| 14.9 "takdim" | the plate with the opened pomegranate slides toward camera while the crane swings round and settles TOP-DOWN, round fruit bowl at frame centre, window light from frame left (graphic match to sh04) |

## Stills (50 % preview)
see files `sh03_t*.png` — first frame, slider, pour hit, pour rising, crane, takdim, last frame.

## How things are made
* Fruit: Poly Haven scans (food_apple_01, food_pomegranate_01, food_pears_asian_01, food_kiwi_01,
  food_lime_01, lemon) dropped into `wooden_bowl_01` with a rigid-body sim inside the script (deterministic),
  then frozen.
* Opened pomegranate: the scanned skin bisected, cut face filled with cream pith, ~400 faceted ruby arils
  (transmission + volume absorption + clear coat) packed radially in 7 chambers.
* Bread: procedural round köy ekmeği (lumpy dome, four oven-burst slashes, crackled crust, flour dust).
* Glass/jug/tea glass: lathed real profiles; glass lets ~85 % of direct light through for shadow rays
  (Cycles has no caustics) so shadows read as glass shadows, not black.
* Water: procedural, not a fluid sim (budget): Geometry-Nodes jet (see above), keyed level, bubble plume.
* Camera: keyed per frame from a smooth spline (no stops at keys), quaternion orientation, tiny handheld.

## Tracker
`TRK_water` at the glass centre (z = table + 6 cm). On screen frames 248–296 (10.33–12.33 s): the whole pour.

## Render cost (measured, 1080×1920 --final, 4 cores)
* Pour frames 273–275 (heaviest: glass + water + jet + bubbles in frame): **79.7 s/frame** (12 spp adaptive
  0.05 + OIDN, light tree off, max 7 / diffuse 2 / transmission 6 bounces). Scene build ~40 s per launch.
  Fast-GI got it to ~64 s but blackens the room behind the glass, so it is off.
* Over the 40–45 s target by ~1.8×. **Director: OK to render at ~80 s/frame (165 frames ≈ 3.7 h), or
  should I trade more (e.g. 8 spp, diffuse 1)?**

## Changes since review 1
* Water surface: travelling impact rings + chop while pouring (keyed off after the pour).
* Bubbles: 700 smaller entrained bubbles with a silvery Fresnel rim.
* Pomegranate: cream pith membranes between the 7 chambers, arils lie radially in the cut face.
* Bread: deeper-baked crust, finer fissures, less flour (was blowing out pink in the sun).
* Jug only enters frame from above right before the pour; leaves upward before the crane.
* Fruit settle is now a frozen table of the deterministic rigid-body result in lib_s4 (build ~40 s).

## Known issues / next
* Grade still warm/orange in the wood; pushing toward neutral morning.
