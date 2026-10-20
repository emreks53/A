# sh05 · 22.95–30.10 · "Mesela Allah bize oksijeni yaratmasaydı…" — studio S6

Clear sunlit pond, 28 mm lens (underwater housing feel), f/3.5, focus tracked throughout.

## Stills (50 % res, preview quality)
| file | t | shows |
|---|---|---|
| sh05_animatic.mp4 | — | 25 % animatic with narration |
| sh05.json | — | TRK_bubble screen track |
| sh05_t022.750.png | 22.75 | first frame: sun at frame centre through the rippled surface, Snell's-window edge + TIR at bottom |
| sh05_t023.980.png | 23.98 | "Allah": light swell |
| sh05_t025.400.png | 25.40 | mid-tilt: TIR ceiling reflecting the bed, the window seen edge-on, elodea bed |
| sh05_t026.500.png | 26.50 | hero crown close: O₂ bubbles on the leaves, the hero bubble swelling at an axil |
| sh05_t027.400.png | 27.40 | "oksijenler üretip": following the hero bubble + its string upward |
| sh05_t028.600.png | 28.60 | still rising with it, bed below |
| sh05_t030.250.png | 30.25 | last frame (handle): the bubble fills frame centre (silver TIR upper rim) |

## Shot design
1. **22.7–24.4 (match from sh04):** camera ~0.8 m deep looking up along the refracted sun ray; the sun sits at
   frame centre, broken by the ripples into dancing glints. The edge of **Snell's window** (real refraction
   through the rippled surface, IOR 1.333) and the total internal reflection beyond it are visible at the bottom
   of frame. Volumetric light shafts converge on the sun.
2. **"Allah" (23.96):** light shafts, caustic gobo and sun lamp ramp up ~+35–90 % over 0.5 s (subtle swell).
3. **24.4–26.1:** a slerped tilt down + glide to the crown of a hero elodea stem (procedural *Elodea/Egeria*:
   whorls of 3–4 lanceolate leaves, dense at the apex, keeled midrib, cell texture, translucency).
   Dwell/push-in: strings of O₂ bubbles grow on the leaves, detach and rise wobbling.
4. **"oksijenler" (26.88):** a ~3.4 mm hero bubble (it swelled for 1.45 s at a leaf axil) detaches right on
   the word; the camera picks it up and rises with it (string of following bubbles below it).
5. **exit (30.1):** the camera swings from slightly below to ~30° above the bubble and closes to ~1 cm — the
   bubble rises into the lens and fills frame centre (shape match to sh06's red cell). Looking slightly down
   keeps the silver total-reflection rim (the bright surface) on the bubble's upper half.

## Physics / look choices
* Bubbles: glass with IOR 1/1.333 (air in water) → correct TIR silver rims; radius 0.6–1.1 mm for the
  strings, rise speed v = 0.07 + 110·r m/s (≈0.15–0.19 m/s), 0.08 s acceleration, zig-zag wobble 4–8 Hz,
  bubbles > 1.2 mm flattened 10 %. Hero bubble 1.7 mm radius (rises ≈0.26 m/s), flattened 14 %.
* Water: no volume object (a ray-marched volume cost 2.5–4 s per sample). Instead every material blends toward
  the in-scatter colour by 1 − exp(−σ·ray length) (σ ≈ 0.6 /m), with the in-scatter brighter toward the
  surface and toward the sun (view-dependent forward scattering). The underwater lights are tinted cyan (~1 m
  of water already took the reds). Pond walls at ±4.3 m end sideways rays in fully fogged water.
* Caustics: an animated warped-voronoi gobo on a spot lamp along the refracted sun ray (no real refractive
  caustics). The surface casts no shadow and is invisible to diffuse rays (sun/sky light reach the bed
  directly); the sky's sun disc is only visible to rays that refracted out (avoids a double sun).
* ~420 particulate specks drift through the water (DOF bokeh). Pebble bed: Poly Haven `ganges_river_pebbles`.
* TRK_bubble parented to the hero bubble.

## Render cost
**First measurement: 361 s/frame** (frame 660, `--final`) — far over the 40–45 s budget. Profiling now
… → optimised: per-material ray-length fog instead of the volume, FAST denoise prefilter (ACCURATE alone
cost 10.7 s at 1080×1920), no motion blur on objects moving < 1 px/shutter (specks, plants, distant
bubbles; camera + near bubbles keep it), 5 spp + OIDN with clamps, glossy 1 / transmission 6 bounces,
cheaper surface ripple bump, fewer far stems. **Measured: 41.1 s/frame** at frame 700 (one of the heaviest:
bubble string over the sunlit bed). This version (stills in this folder): **42.3 s/frame** at frame 700.

## Known issues / next
* v2: light shafts are back as 24 soft camera-only emissive cylinders along the refracted sun ray (emission
  sampling off so they are not lights), swelling on "Allah", fading out by 28.3 s for the close bubble chase.
  Re-measured: 42.6 s (f700), 42.7 s (f636), 26.6 s (f600).
* Phase A sky in the window is a bit flat; the sun could use more burst.

## Round 1 notes applied (v3)
1. **Opening:** the surface ripples are 3× finer with more chop (Ocean 2 m tiles plus a 38/m capillary bump), so
   the blobs became many small glints. Exposure is −2.4 EV while looking up (deep-blue window, sun dominates),
   and the shafts converge on the sun. *Still improving: more sun dazzle/sparkle.*
2. **Mid-shot ceiling:** extra haze on the underside of the surface when it is seen at grazing angles (1 − exp
   with a facing-dependent σ), so the top of frame is soft luminous water instead of a blotchy mirror or stripe.
3. **Photosynthesis:** 520 static "pearls" (0.25–0.75 mm) cling to leaf tips and edges, concentrated on the hero
   crown. Bubble strings went from ~20 to ~70 (8 on the hero stem, 1–2 on most clump stems, 0.2–0.55 s periods):
   about 2000 bubbles in the shot.
4. **Plant:** desaturated, translucency raised to 55 %, and older/deeper leaves carry a brown algae film with
   sediment specks. The caustic gobo is sharper and ~1.5× stronger, and the flat sun is reduced by half, so the
   caustic lines visibly slide over leaves and bed.
5. **Water:** 1000 particulate specks (was 420) and 40 thinner, varied shafts.
6. **Render:** ACCURATE denoise prefilter (FAST left grain in defocused bubble bokeh), 12 spp, **80 % resolution**
   (864×1536; the director allows this for mostly-defocus shots, post upscales).
   **Measured: 67.2 s/frame** (frames 636–638, the heaviest). I checked a 100 % crop of a defocused area across
   these 3 frames: clean, no blotches.
