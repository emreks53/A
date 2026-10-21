# sh02 — morning room, window, breathing curtain, the air made visible (5.24–9.64 s) — review 4

Script `video/blender/shots/sh02.py`; shared set/rig `video/blender/lib_s4.py` (also sh03).
Light rig for S5/sh08: `video/review/LIGHT_SETUP_S4.md` (updated).

## Director notes (review 2 REVISE) — point by point
1. **Shafts**: biased volume (`cycles.volume_biased`, step rate 1.0). Emission shafts ×
   Henyey-Greenstein forward phase (g 0.6), fading out 10 cm above the table, box trimmed to the sun prism.
   Strength 0.04 fogged the whole room after the exposure lift, so it is now 0.012 (≈0.04 before the
   exposure change).
2. **Motes**: 5 000 warm (3 800 K) emission-only motes, radius 0.5–1.1 mm (≥2 px), lit only inside the
   sun prism. A separate non-wrapping **gust of 1 000 motes** lifts off the curtain at 8.1 s and streams to
   0.35–1.4 m in front of the lens by 8.5 s (warm bokeh). It drifts on past the camera and fades out by
   ~9.4 s.
3. **Room brightness**: warm 4000 K bounce lights (sun patch facing up + card behind camera), sky fill
   220 W, clamp_indirect 10, world not importance-sampled. Measured on the stills: no pixels < 0.06,
   mean 0.52–0.56, walls ≈0.45–0.6 (brighter than the 0.25–0.35 asked for — say if you want it
   darker).
4. **Cut continuity**: ONE boom path `lib_s4.BOOM_P/T` (8.6 → 10.45 s) used by both shots. PCHIP
   interpolation, camera moving down through f236, 28 mm and f/2.8 at the cut (sh03 eases to 35 mm and
   f/4 by 10.3 s), same handheld seed, same exposure. sh02 f230 and sh03 f230 render identically.
5. **Curtain**: cloth quality 16, wind ×1.7. Baked once single-threaded (`S4_BAKE_CURTAIN=1 blender -t 1 …
   sh02.py -- --track`) to `video/renders/sh02/curtain_cloth.pc2`, played back through a Mesh Cache
   modifier in both shots. The build raises an error if the file is missing.
6. **TRK_air** is keyed per frame to a fixed screen spot (x 700, y 380) inside the mote cloud, with depth
   easing 1.6 → 0.9 m. It stays on screen the whole shot.
7. **Start**: camera z 1.07, sun hot spot upper right. Exposure +1.5 EV on the flare, settling to the
   room value by 6.2 s. Light compositor bloom.
8. **Wind**: small breath 5.6–6.9 s; big inhale wind peak 0.3 s earlier (curtain peak ≈8.25–8.35).
9. **Window paint chips**: fewer, softer, grey-brown.
10. **Bread**: see sh03.

## Render (measured, 4 cores)
* Full res, 12 spp, adaptive min 8, OIDN ACCURATE, biased volume: **124.5 s/frame** (f199–201).
* As you allowed for haze/defocus shots, **sh02 finals render at 80 %** (864×1536; set in the script via
  `perf_settings(final_res_pct=80)`; samples not reduced; post upscales). Measured at 80 %: **78.2 s/frame** (f199–201).
* 100 % crops of a flat defocused area across 3 consecutive final frames: `crops/sh02_crop_f199-201.png`.
  No blotches or flicker.

## Stills (50 % preview)
`sh02_t005.000` flare open · `t006.500` small breath · `t008.300` "oksijen" inhale + gust · `t009.000`
boom down · `t009.600` the cut region (identical to sh03 `t009.600`).
