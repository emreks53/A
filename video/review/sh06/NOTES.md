# sh06 — inside a blood vessel (30.10–35.70 s) · studio S7

## v2 (director review-1 notes applied)
1. RBC material is subsurface-dominant: deep crimson, red-weighted SSS (radius 1/0.07/0.045,
   scale 2.2 µm) so thin centre and rims glow when backlit, darker central dimple (radial mask in
   the disc plane), broad soft spec (rough 0.42, coat 0.18 @ 0.3), faint sheen, membrane bumps.
2. Light from the depth: three warm point lights 0.9/2.2/3.6 m down the lumen ride with the
   probe (the far ones excluded from glossy rays, so no streaks); frontal key halved.
3. Wall: translucent pink-red, subtle elongated mosaic (bump 0.35), thin soft coat (0.22,
   rough 0.16–0.32), darker/redder into the depth via the haze; near-lens wall stays defocused.
4. Denoise: OIDN prefilter ACCURATE (quality BALANCED). 16 spp is clean (top-band crop checked).
   Measured full-res steady state: 16 spp 116 s/frame, 10 spp 74 s/frame (see budget below).
   Script currently set to 12 spp pending the director's budget decision.
5. Far lumen: +420 low-poly cells 1.6–6.5 m ahead fading into the haze.
6. Red wipe holds to the last render frame (bolus extended to 110 cells streaming past the lens);
   when the lens passes *through* a cell its interior glows haemoglobin-red (backface emission)
   instead of going black.
* v2 stills: t030.150, t031.500 ("kan"), t033.200, t035.350 (bolus), t035.620 (wipe),
  t035.900 (last render frame, still red).


Script: `video/blender/shots/sh06.py` (+ shared `video/blender/lib_s7.py`).

## Design decisions
* **Scale**: 1 Blender m = 100 µm. Arteriole lumen Ø 60 µm (r 0.30). RBCs use the measured
  Evans–Fung biconcave profile (D 7.4–8.2 µm, rim 2.4 µm, centre ~0.8 µm), 8 deformed variants
  (cupping in shear, membrane wobble) so no two read identical. 35 mm lens, f/4.5 (scaled-world
  f-number chosen to give the hero cell ~3 cm of sharpness → microscope-probe macro feel).
* **Camera** rides the current looking upstream, so cells come *at* the lens. Opens with the hero
  RBC face-on at frame centre (circle → shape match to sh05's O₂ bubble), approaches, then floats
  ahead tumbling to show its biconcave profile while the probe pitches ~8° down.
* **Pulse**: arterial waveform at 72 bpm (sharp systolic upstroke, run-off, dicrotic bump); one
  systolic peak lands 1 frame before "kan" (31.50) with 1.9× gain → strongest surge (whole flow and
  the hero lurch toward the lens). Beats at 30.62 / 31.45 / 32.29 / 33.12 / 33.95 / 34.79 / 35.62.
* **Key-word band**: while "KAN" is up (31.4–32.6) no near cell is allowed to project into
  y 440–900 px (rejected at placement); the band shows the dark, hazy vanishing point of the lumen.
* **Exit**: a scripted bolus of ~46 cells rides the last beat (35.62) into the lens → full red wipe
  (last frames are a defocused crimson field, ideal for the colour-match dissolve to sh07).
* Wall: endothelial mosaic (elongated cells along flow, grooves at borders, nucleus bulges)
  baked as a seamless numpy texture (3D Voronoi was 75 % of render time), wet tinted coat.
  Platelets (36) marginated near the wall, one neutrophil rolling along the lower-left wall
  (enters from behind the lens ~32.3 s and recedes), plasma particulate motes for parallax.
* Haze: no volumes — every material blends to an emissive plasma-haze by camera distance
  (shared `S7_Fog` node group, emission kept out of the light tree).

## Trackers
* `TRK_rbc` — parented to the hero cell centre ("Alyuvar").
* `TRK_heart` — fixed to the camera at (300, 1260) px, lower left, clear of the band ("Kalp…").

## Stills (50 %, 8 spp)
* `t030.150` first frame: hero face-on at centre coming at lens, tunnel of cells.
* `t031.500` "kan": strongest surge, band calm/dark, hero lower-centre.
* `t033.200` hero tumbled showing the dimple; flow streaming.
* `t035.350` the bolus floods in.
* `t035.620` red wipe (frame fully covered).

## Render budget (v1 numbers; v2 above supersedes)
* Full-res 1080×1920 single frame `--final --from 756 --to 756`: **~50 s incl. first-frame
  sync/BVH**; steady state in a 48-frame chunk is lower (persistent data). Settings: 6 spp + OIDN,
  2 bounces + fast-GI AO, wall without SSS. Profiling showed ~6.5 s per sample at full res on
  this machine and ~11 s for OIDN HIGH/ACCURATE, so finals use OIDN BALANCED/FAST via a
  render_init handler (`lib_s7.budget_denoise`, common.py untouched).

## Known issues / next
* Wall reads slightly tan at grazing angles (wet coat Fresnel); being tuned.
* Low spp → occasional soft denoise blotches in deep bokeh.
