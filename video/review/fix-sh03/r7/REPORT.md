# fix-sh03 round 3 (QA r7): spoon cross, curtain switch, window corner blocks

Fix commit: **5064de1** (sh03.py only, on top of 500a9c5; lib_s4 untouched).

* **a) cross shape:** SpoonBowl and SpoonHandle get hide_render for the whole shot. f242/f295 have no handle above the jar (`a_*`).
  Whole-shot scan at phone size (farm b100-b107, every 6th frame): no other stick+rim or crossbar shapes. The only
  T/L junctions are the window's glazing bars meeting the sash stiles (architecture); the curtain rod is not in frame.
* **b) curtain switch:** Sub render_levels keys moved to (247, 0)/(248, 2), inside the fast push-in. There is no switch in 251-285.
  Bottom-left mean (full res, farm-encoded): 260/261/262 = 144.59/143.73/141.69. Same settings on all three, so the change is
  ordinary drift (b100: 140.00/139.12/141.71 = +2.6 step at the old switch).
  247|248 step +9.29 (b100 +3.92; the switch adds about +5.4; limit 22), during a 25-30 level/frame push-in (`b_phone_*`).
* **c) black window corner blocks:** FrameB/FrameT/Transom and the sash _b/_t rails are set 1 mm back on both faces via a shape key,
  CONSTANT 0 -> 1 at 247|248, so f230 (dissolve) is pixel-identical (max 1/255). f295: pure-black px 3370 -> 0; the only
  other changed pixels are the blocks' reflections in the jet and glass (`c_*`).
* **gate:** f230 vs b100 changes only where the spoon was (735 px block) plus mote noise (mean 1.06/255). Hem smooth at f342/f376 (`d_*`).
* **determinism:** f248 started at 246 vs started at 248: max 1/255.
* **s/frame (4 cores):** f230 94, f242 85, f246-248 ~89, f260-262 46, f294-296 42, f342 41, f376 39 (same as 500a9c5).
