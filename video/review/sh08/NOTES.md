# sh08 — review v4 (Studio S5) — staging per director notes on v3

Stills, prefix sh08_v4_ (50 %): t040.620 (first frame), t041.400 ("uzanıp": the hand's long shadow slides
across the sunlit table as the soft, motion-blurred hand enters top-right), t041.700 (reach), t042.300
("alırken": top grasp), t043.400 (lift, the apple leaves the focus plane, its contact shadow fades),
t045.800_final / t047.250_final (downscaled FINAL-quality frames: tilt/push to the little-finger edge
against the window -> deep red-orange translucent glow with a darker core -> dissolve into sh09).
sh08_v4_final_f1134_80pct.png = one full final frame (80 % res). Animatic and track regenerated (TRK_hand = wrist).

Staging: camera at table level looking toward the window (100 mm, f/2.4, focus held on the apple's table
position); the hand sits between camera and window, so it is backlit: camera side in soft shadow, warm rim,
red translucent edges. Exposure is set for the bright table/apple (+2.0 EV opening glare -> -0.6 EV; -1.3 EV
by the end for a saturated red). Body hair off (sub-pixel at these distances); a raised skin sheen gives the
faint rim-lit fuzz. Man's hand changes from v2 are kept.

RENDER TIME — measured --final, 80 % res (final_res override in the shot script), 16 spp, 3-frame runs
including first-frame scene sync:
* f1014-1016 (grasp):     56.9 s/frame
* f1098-1100 (push):      63.8 s/frame
* f1133-1135 (red glow):  70.8 s/frame
All under the 90 s ceiling. To get there, during the fully defocused push the skin SSS fades out and the
material crossfades to a cheap translucent-red shader (Cycles skips the zero-weight branch), invisible at
that blur level. Denoise check: a 100 % crop of the dark glow across f1133-1135 shows fine, even grain and
no blotches or flicker.

Known limits: up close the finger joints are still slightly rubbery; the backlight and shallow focus keep
that from reading.


---

# sh08 — review v3 (Studio S5) — following director notes on v2

Stills (50 %, 16 spp), prefix sh08_v3_: t040.620 (first frame, set unchanged apart from the camera angle),
t041.550 (reach from the right, hand soft, focus on the apple), t042.300 (grasp, "alırken"), t043.600 (lift,
apple tilts), t045.800 (push toward the hand edge against the window, focus sliding off), t047.300 ("değil":
backlit fingers as a warm-red translucent blur against the bright window -> dissolve into sh09's red tissue).
sh08_animatic.mp4 and sh08_track.json are regenerated for v3 (TRK_hand = wrist).

Changes for v3:
* Camera re-angled to the front-right so the window/sun sits behind-left of the hand: warm rim light, near side
  in soft shadow. 100 mm, f/2.4, focus on the apple; motion blur on the reach.
* Skin darker and more varied (redder knuckles, tan back, paler palm), tendons/veins and knuckle creases back
  (subtle), plus a small red translucency layer so thin finger edges glow when backlit.
* Extreme skin macro dropped. New ending from "aslında": push toward the little-finger edge with the window
  directly behind; focus slides to ~14 cm behind the finger; the translucency ramps up so the frame becomes a
  glowing red/warm blur. A camera-only bright exterior plane behind the window gives the backlight.
* Body hair is off in this version: at these distances it is sub-pixel, and it was the largest render cost.

RENDER TIME (measured --final, frames 1069-1070, the heaviest point of the push):
* with 500 hair strands, 32 spp, 100 % res: 369 s/frame
* without hair, 24 spp, 100 % res: 157 s/frame (2-frame average including first-frame sync)
Still over the 90 s ceiling. Next test: 80 % res for the defocused push/glow section (allowed for soft
material), 20 spp, and a check for denoise blotches on a 100 % crop across 3 frames.

Known issues: the palm still rests on the apple's upper side rather than its flank; finger joints still slightly
rubbery under close inspection. The backlight and shallow focus now hide most of it.


---

# sh08 — review v2 (Studio S5) — work in progress

Stills (50 %, 16 spp), prefix sh08_v2_: t040.620 (first frame, set unchanged), t041.550 (reach from the right,
"uzanıp"), t042.300 (grasp, "alırken"), t043.400 (lift), t045.400 (glide along the forearm), t047.050
("değil", macro skin + hairs). sh08_v2_final_f1129_full.png = one full-quality frame of the macro end.
The v1 stills/animatic/track below are kept for reference.

Director notes addressed:
* MAN'S HAND (confirmed): fingers +9 % radial, broader palm, raised MCP/PIP knuckles + extensor tendons, volume-
  preserving skinning, darker tone, short matte nails (no polish/shine), hair on the back of the hand, first
  finger segments and dorsal forearm; no jewellery; man's rolled chambray/cotton cuff.
* Grasp: enters from the right in profile, low; thumb near side, fingers wrap the far/left side, apple tilts on lift.
  Orientation chosen by a numeric fit to target palm/finger/thumb directions; per-finger contact solver.
* Push: log-paced so macro arrives on "değil".

Still wrong (next round):
* The palm still rests on the apple top rather than its side; index/middle are posed in a relaxed curl instead
  of pad contact; joint deformation still slightly rubbery. Skin still reads somewhat CG at the grasp.
* Macro micro-relief net was too strong (crackle look) -> reduced; needs pore check at 100 %.
* RENDER TIME: measured --final on f1128-1129 (macro, heaviest): 480 s/frame at 16 spp, 100 % res
  (random-walk skin SSS + 500 hair strands). Over the 90 s ceiling. Now testing Burley SSS + 12 spp +
  80 % res for the macro section; will report the number.


---

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
