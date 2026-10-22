# fix-sh08 (round 2, after the director's send-back)

Only `video/blender/shots/sh08.py` changed (lib_s5.py and common.py are untouched). The choreography keys and event
frames are kept, as are the OIDN albedo-only switch from 1091 and the shot ends (still a light dissolve in, the macro
skin at the 1138 zoom).

## Director notes -> what was done
1. **Hair (blocking)**: the particle hair is replaced by ~3150 explicit, seeded strands as for sh04's man, bone-parented
   (forearm / hand / proximal phalanges):
   * forearm 10-15 mm, back of the hand 8-12 mm (density 1.0e5/m2, about 2.9x the old 0.35 mask), first finger
     segments 3-5 mm;
   * radius 50-55 um at the root, tapering;
   * lifted 12-45 deg, so the silhouette carries a fringe the left window rims;
   * dark-brown root to sun-bleached tip.

   The fibre-model (Principled Hair) shader cost ~30 s/frame in the close-ups, so the strands use a glossy fibre plus
   thin-fibre translucency. Reads at 390 px on f1000/1030/1066.
2. **Waxy skin (blocking)**: added 2-6 mm albedo mottling, coarser skin lines and 1-2 mm mottling on the back of the
   hand, knuckle-crease albedo, roughness variation, and the hand hair. f1030 measures hp_std 0.0039 with the same
   high-pass (sigma 2 px) that gives sh04 0.021 and the old sh08 0.004. This is NOT the requested >=0.015.
   * The limit is the lift's motion blur: the hand moves ~9 cm/s at f1030. A 108-degree shutter is now used.
   * Without motion blur the same frame measures 0.0092, and that region is the shaded side of the dorsum.
   * The hair and skin detail read in the 100 % crops.
3. **Forearm**: radial scale about the wrist-elbow axis: +6 % at the wrist, +15 % at the cuff, +35 % under the sleeve.
   The hand is unchanged.
4. **Cuff**: own rolled-cuff mesh with a two-turn fat lip; in frame right from ~f1000.
5. **Table**: lib_s4's sh03 table material (box-projected worn wood, 0.62 repeats/m), saturation 1.5 and hue +0.018
   because this low, warm-lit view greys and reddens it. f990 table: hue 19.3, sat 0.42, v 0.46. sh03 f360 on the
   same measure: hue 21.8, sat 0.49. See table_vs_sh03_f360.jpg.
6. **Pore glints**: pores are albedo-only (a bump pit gave bead rims); pores and lines are matte (roughness up, coat
   off inside them).
7. **Mullion_h removed.**
8. **Hand entry**: lens shift_x -0.022; no hand pixels through subframe 981.5, first pixels on f982.
9. **Cost (4 cores, 864x1536, 16 spp, no sample cuts)**:
   * Render s/frame in a multi-frame run: f985 41, f1000 52, f1030 59, f1066 68, f1078-1080 66, f1090-1092 63,
     f1110 62, f1127-1129 60, f1138 60.
   * Build/setup ~50 s wall (~180 CPU-s) per job.
   * CPU-equivalent = process (user+sys)/4/frames, including the build: 3-frame runs give 74-78 (f1030, f1090,
     f1128); a single-frame run of 1080 gives 107. Single-frame runs are dominated by the build.

   What the macro saves, all keyed constants or pure functions of the frame, so any job start is exact:
   * SSS off from f1068 (no visible change);
   * knuckle-wrinkle, nail, fingertip and translucency branches pruned from f1080;
   * diffuse bounce off from 1091, with +0.11 EV make-up.

   Brightness steps: 1079->1080 +2 %, 1090->1091 -1.5 %, both within the frame-to-frame drift.
10. **Macro skin lines**: soft, wavy, non-crossing grooves in one direction (around the arm, Langer lines) replace
    lib_s5's cellular net. There are no crisp X/V/+ marks at 100 % (f1138 crop).

## Determinism
Runs started one frame early vs on the switch frame are identical (max 2.8e-5 = 16-bit rounding) at 1068, 1080 and
1091. Persistent data is back on (no particle system any more).

## Tracker
TRK_hand re-exported: `video/comp/tracks/sh08.json`. It sits on the wrist: f1023 (734,394), f1035 (748,172),
f1047 (731,349), f1056 (706,543). It is verified by overlay on f1000/1030/1066.

## Files
* phone390_before_after.jpg: 1000/1030/1066/1110/1138
* 100 % crops: f1000, f1030 (before/after), f1066, f1110, f1138 (before/after)
* table_vs_sh03_f360.jpg

## Round 3 (client rule change: only prominent cross symbols are banned, natural crossings are fine)
Hair, skin lines and everything else stay as in f3f3514. The only change is the white plastic streak at the grasp
around f1030:
* skin specular and coat are damped toward grazing angles, and the sheen is off;
* the apple peel is +0.22 rougher, so its highlight between the fingers is soft.

See f1030_streak_before_after_100pct.jpg. f1128 changes by less than 3 % in brightness. f1030 rendered from a job
start of 1029 and of 1030 is identical (max 3e-5). Cost is unchanged (f1030 59 s, f1128 56 s render). The tracker is
unchanged.
