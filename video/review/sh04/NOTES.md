# sh04 — review 3 (studio S3)

Script: `video/blender/shots/sh04.py`, hero + helpers in `video/blender/lib_s3.py`.

## Stills (50 %, preview quality)
| file | t | what it shows |
|---|---|---|
| sh04_t015.900.png | 15.90 (first frames) | TOP-DOWN on Poly Haven `mud_cracked_dry_03` (4k, true adaptive displacement, 1 m tile); the seedling dead centre (graphic match to sh03's bowl), hard 49° noon sun shadow |
| sh04_t017.600.png | 17.60 "bizler" | the camera has begun its arc down and around ("canlılar" 16.76 starts it) |
| sh04_t019.600.png | 19.60 | ground level beside the plant: tiny seedling, backlit (hairs glow), cracked plates, vast hazy noon sky; the lake-bed tree line defocused on the horizon; heat-shimmer sheet over the far ground |
| sh04_t021.400.png | 21.40 "hiçbirine" | the camera has already tilted up to the sun (from ~19.9, "edemeyiz"); the man's hand enters from the lower-left frame edge close to the lens, defocused, motion-blurred |
| sh04_t021.800.png | 21.80 | rising and tilting toward the sun, focus racking onto it |
| sh04_t022.600.png | 22.60 exit | hand stretched toward the sun at upper centre, fingers stop ~650 px short of it; the gap between fingertips and sun = key-word band ("ELİMİZ YETİŞMİYOR") stays empty sky. Sun at (540, 244) — `TRK_sun` |

`sh04_animatic.mp4` (25 %, every 2nd frame, with narration) and `sh04.json` (`TRK_sun`) included.

## Decisions
* Sky = Poly Haven `dry_cracked_lake` (a real dry, cracked lake bed at noon, sun 49.5°). Its clouds
  are removed procedurally in `L.clean_sky` (clear-sky model per elevation/sun-angle, cached EXR) so
  the sky is empty; one small cloud is transplanted to sit low near the sun azimuth ("one distant
  cloud"). Lighting: cleaned HDRI + a sun lamp whose direction/irradiance are measured from the
  HDRI's sun pixels; camera rays see the original sun disc.
* THE SEEDLING (`L.seedling`, shared by sh04/sh11/sh13b, identical seed): bean-type, 6 cm,
  hypocotyl with bronze base → pale green, ~1500 fine hairs (hair curves), two fleshy SSS
  cotyledons, epicotyl, two cordate primary leaves (generated venation texture: midrib, palmate
  basal veins, brochidodromous secondaries, reticulum) with translucency, terminal bud, soil crumbs
  + heaved soil collar. `wilt` = 0.35 here (slightly drooping, duller).
* Hand: `C.human_mesh("realistic_hand")` returns a CAMERA object in bundle v1.4.1 — the actual mesh
  is its parent "Hand  - Realistic" (multires); the script uses that (workaround, common.py untouched).
  Skin SSS tuned for backlight: dark silhouette with red glow at the finger edges.
* Timing: arc starts on "canlılar" (16.76), settles at ground level ~19.2; hand rises from
  21.04 ("hiçbirine" 21.24) and is fully stretched at 22.5; focus racks plant → hand.

## Render time
`--final`, 4 cores, 2-frame runs (2nd frame = steady state): **frame 471 ≈ 40 s, frame 541 (hand)
≈ 34 s**, 3.8 GB peak. (Review 1 was 102 s: 32 spp + OIDN HIGH.) Now 16 spp, adaptive threshold 0.04,
OIDN BALANCED (set in a render_init handler because common.configure_render runs after build), and
the cracked-earth shader lost a fine-noise bump that cost ~15 % for invisible detail.

## Review 3 — director notes addressed
* HAND: an adult MAN's hand (confirmed): base mesh widened 16 % / thickened 22 % (broad palm, thick
  fingers & knuckles), plain short nails, no jewellery, forearm continuing to a blue cotton shirt cuff,
  dark arm hair on the forearm. Pose: fingers fanned and gently curved (knuckle-pivot deformation),
  wrist tilts back as it rises, faint tremble while straining. Skin is dark tanned (exposed for the sky
  behind) with low, rough specular and SSS glow at the finger edges; no sheen.
* It no longer lurks behind the plant (hidden until it enters) and no longer rises out of the ground:
  the camera tilts up to the sun first (~19.9 → 21.4, also craning up 8 cm), then the hand enters from
  the lower frame edge close to the lens with motion blur.
* Tree line lifted with aerial haze on camera rays (horizon band blended toward pale sky).
* Sky: cloud remnants removed earlier (smooth clear sky + one distant cloud).

## Changes in review 2
* seedling: matte, wrinkled, darker cotyledons; stem less lime with streaks; leaf coat/sheen down
  (no more white grazing sheen); much stronger vein contrast; tan soil crumbs.
* render time into budget (above).

## Known issues / next
* heat shimmer is subtle (deliberately - say if you want it stronger).
* hand: fingers now fanned apart (straining reach) by a knuckle-pivot deformation of the base mesh + subdivision (22.6 still updated); the bundle's multires has only 1 level, so skin micro-detail comes from the shader (pores/creases bump) — fine for a backlit silhouette.
