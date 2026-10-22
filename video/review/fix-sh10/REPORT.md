# fix-sh10 — field of living cells, membrane crossing, mitochondria (s4-1, s4-2)

Code: `video/blender/shots/sh10.py` only, fix commit **0d777cc** (parent of this evidence commit).
Re-render **1244-1397** with the job split below (each job MUST start on its first frame).

## What changed
1. **Field (1298-1397)** – instanced 3-D cells (GN instances of 16 dome variants, ~28 k after
   frustum/haze culling): irregular pressed outlines, ±12 % size plus regional patches, nucleus
   bulge + nucleolus, cytoplasm granules, SSS bodies with lighter translucent rims, wet coat; on an
   undulating sheet (ripples 18 m, folds 50 m, swells 180 m, 2.6 km curvature) dissolving into
   haze (fog power 2, haze-coloured sky gradient) – no flat plane, no hard horizon.
   Lighting-up = amber emission inside the body (thick centre bright, nucleus shadow, rim glow)
   + per-instance warm spill on the flanks facing lit neighbours + warm light pooling on the
   tissue between cells + bloom. Timing kept: the cell we exit lights at **f1317** (1316 dark),
   its ~10 neighbours one by one to ~1326, the front rolls out from **f1327**, glints to the
   horizon from **f1344**.
2. **Crossing (1294-1302)** – the probe keeps moving through the wall (no 6 cm clamp snap):
   1295 = the interior seen through a half-transparent veil, **1296-1299** the sarcolemma fills
   the lens in focus (protein particles, caveolae pits, mottling; lit by an off-axis probe lamp),
   the probe pauses there (camera time-warp, no zoom smear), then the dome falls away
   1300-1301 and the field is revealed in soft focus from 1302. No dark gap (min luma 36.8).
3. **Mitochondria (1244-1297)** – sh09 round 2b ported verbatim (render-fix-sh09 7a82374:
   bean bodies, inner-fold cristae, hero matrix key, HERO_NUDGE, MITO_VOL).

## Proof
* f1250 vs sh09 7a82374 f1250 (both full quality): whole-frame MAD **1.62**, mito box
  (x330-560, y380-1150) MAD **2.29**, phase shift **0.005 / -0.011 px**.
* Cristae mesh check over every mitochondrion in sh10: 112 cristae objects (8 meshes), 138 crista
  pairs, **0 overlaps**, **0 crista-envelope intersections**. Stills 1248-1288 every 4th
  frame: no crossing cristae (`interior_1248-1288_every4.jpg`).
* Luma (25 %, every frame, rendered in the job split): `luma25.txt`. 1294→1295 MAD 14.7 (the
  preceding fast frames 12-16); largest step 17.7 at the 1302 reveal; 1317/18 +15.9 is the
  intended first-light beat.
* Determinism (full quality, 16-bit PNG): start-on-frame vs start-one-earlier bit-identical at
  1299/1300, 1309/1310, 1352; 1284 differs by ≤ 11/65535 (invisible) after the 1283 toggle, which
  is a job start.
* Cost (s/frame, 80 %, 4 cores, incl. sync): interior 57-62, crossing 50-60, reveal 52-64,
  first light 60-62, wave 40-55, wide 40-42. Max measured 64.

## Job split (MUST start on these frames)
1244-1282 · 1283-1297 · 1298-1307 · 1308-1350 · 1351-1397
(`bash video/farm/render.sh sh10 A B 48`). Reasons: object visibility toggles at 1283 (field /
dome appear) and 1298 (interior hidden, dome fade, base swap); the glare is set per job from its
start frame (compositor ignores per-frame edits): off before 1298, on from 1298. Samples are
keyed (8 ≤ 1308, 16 from 1309).

## Moved / new event frames
* Membrane crossing now 1295-1301 (veil 1295, film 1296-1299, falls away 1300-1301), field
  readable from 1302 (was: snap at 1294|1295, murk to ~1305).
* Camera after the crossing pulls back faster (boost ≤ 3.5x, back on its path by 1344):
  TRK_cells moved – new track `sh10_track.json` (same format as video/review/sh10/sh10.json).
* Light-up frames unchanged (1317 / 1327 / 1344).

## Known / not done
* `DOME_TEAL_W`/`EXPO_TRIM` tables left neutral. The field is ~28 k cells (culled), not 10^5.
