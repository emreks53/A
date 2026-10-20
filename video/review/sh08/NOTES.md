# sh08 — review v1 (Studio S5)

40.60–47.40 s · "Hatta uzanıp bir şey alırken bile elimizi uzatmak aslında … değil"
Render range f968–1143. Script: `video/blender/shots/sh08.py`, helpers: `video/blender/lib_s5.py`.

## Stills (50 % res, preview quality 16 spp)
| file | t | shows |
|---|---|---|
| sh08_t040.620.png | 40.62 | First frame of the cut: morning table, sunbeam through the window (left), mullion shadow stripe across the foreground; exposure still +1.3 EV and settling (light dissolve from sh07's glare: +2.6 EV at f968 → 0 by 41.05 s). |
| sh08_t041.400.png | 41.40 | "uzanıp": the hand reaches in. **Known bug:** it comes down from above and the fingers clip the apple top; v2 changes the path so it comes in from the right at apple height. |
| sh08_t042.300.png | 42.30 | "alırken": fingers closed on the apple (contact solved per finger by curling each finger until it touches the apple surface, ~0.8 mm press for skin compression). |
| sh08_t043.600.png | 43.60 | apple lifted ~8 cm, hand holding it; camera starting to drift right. |
| sh08_t045.400.png | 45.40 | "aslında … başımıza": camera gliding along the forearm (already too close at this point; v2 slows the push). |
| sh08_t047.050.png | 47.05 | "değil": macro skin of the dorsal forearm — fine body hairs lying flat, SSS, f/7.1 macro DOF. Exit into tissue for sh09. |

## How it is built
* Hand: CC0 Human Base Meshes `Hand  - Realistic` (note: in bundle v1.4.1 the object called `realistic_hand`
  is a thumbnail **camera**, so `C.human_mesh("realistic_hand")` returns a camera; I load the mesh by its real
  name in lib_s5). Multires baked, the flat-capped stub extended into a 33 cm forearm, 1 level pre-subdiv,
  render subsurf 2.
* Rig: 17-bone armature (forearm, hand, 3 bones × 5 digits), joints measured from orthographic grid renders,
  bone-heat weights. Pose curls are solved against the apple mesh (BVH) so fingers touch without intersecting.
* Skin: Principled random-walk skin SSS, radii (1, 0.37, 0.19) × 3.2 mm (red deepest), procedural rest-space
  detail (pores 2 scales, polygonal micro-relief net, knuckle wrinkle bands, lumps, raised bluish veins on the
  back of the hand), colour variation (blotches, melanin, redder knuckles/fingertips, paler palm, freckles),
  roughness breakup + partial oily coat + faint sheen. Nails: analytic per-finger ellipses (coat, lunula,
  free edge, cuticle, longitudinal ridges). ~1200 fine body hairs (Principled hair, melanin 0.72) on the dorsal
  forearm, lying toward the wrist.
* Sleeve: rolled chambray cuff (procedural weave) around the forearm at ~17 cm from the wrist.
* Set (matching S4's description): Poly Haven `wood_table_worn`, `food_apple_01`, window + sun from the LEFT
  (4200 K sun through a real window opening with mullions → sunbeam + mullion shadow on the table), cool sky
  fill from the window, `lythwood_room` HDRI at low strength; out-of-focus sofra items: pomegranate,
  croissant, wooden bowl with Asian pears, lime, jug, tulip tea glass.
* Camera: 100 mm macro, f/2.8 → f/7.1 at macro, baked per frame (phase 1 world framing, phase 2 defined in
  forearm space so the glide stays locked to the moving arm), tiny handheld noise, motion blur on.
* `TRK_hand` = wrist (bone tail of the forearm bone). Visible f≈1008–1080; off-frame during the macro end.

## Render time
Preview stills at 50 %/16 spp: 47 s (empty table) … 250 s (macro with hair). **Final s/frame not yet
measured — the hair is currently the dominant cost (5 s → 33 s at 25 % in a profile).** v2 will optimise
(hair only near the macro area, cheaper curves) and report the measured `--final` number.

## Known issues (being fixed now for v2)
1. Reach path comes from above/clips the apple (41.4). → re-choreograph: enter from the right, low.
2. At the grasp the hand reads CG: too pale, waxy, uniform; fingers look thick. → warmer/darker tone, less
   SSS scale, stronger mid-scale relief (pointiness-driven crease darkening), more specular breakup.
3. Push reaches macro too early (45.4 already macro) → slower, reaching pores exactly on "değil" (46.98).
4. Pores not readable at 50 % preview; bump amplitude to be increased and checked at 100 %.
