# fix-sh12 — valley floor of the descent (review s4-7)

Fix commit: 9273247 (code only, `video/blender/shots/sh12.py`). Base: 7b409ab22.

## What changed
* **Scrub/copses:** a new instanced layer, `Scrub`, with its own RNG (270,598 instances).
  * Each lone tree is now the edge of a tight copse (about 12 trees and 30 bushes, r 6-14 m).
  * Tight, elongated thickets and hedge-like strips (40-80 overlapping bushes of 3-7 m each) merge into
    dark masses that share one shadow.
  * Scrub material: less translucent glow than the tree crowns.
  * The existing trees, the forest points and every TRK_* are unchanged (track JSON is byte-identical).
* **Ground:** the terrain shader gets near-ground micro-structure: tussocks, scrub speckle, fresh/dry
  patches and a light bump. It fades out between 2.8 and 5.2 km view distance.
* **Haze:** a little more aerial haze. The keyed multiplier is 1.0 at f1718 and 1.45 at f1786; it used
  to thin to 0.71. Frames before 1718 have unchanged haze.

## Evidence (left = before, right = after)
* `f1745_*`, `f1772_*`: `crop100` = 100% crop (x 160-920, y 1280-1900), `phone` = 360 px wide.
* Before frames: f1772 is a local base render of 7b409ab22. f1745 is the farm encode (b17).

## Proof
* **Determinism:** started one frame earlier vs started on the frame, max pixel diff 0
  (1717-19 vs 1718-19, 1771-72 vs 1772, 1744-45).
* **Cost:** steady state is 62-66 s/frame on 4 cores. The first frame of a job takes about 2 min, and
  a fresh worker's build takes about 6 min because the terrain field cache is keyed by source.
* **Moved events:** the camera and all events are unchanged, and no event frames moved.
* **Re-render range:** the scrub and ground detail are visible on the valley floor in every frame, so
  this is the WHOLE SHOT, 1526-1785. At f1717 the fix differs visibly from the old frame, so splicing at
  1718 would pop. Sky, sea and mountains are pixel-identical before 1718.
* **Independent verifier:** round 1 FAIL (peppered single bushes). Round 2 PASS. Nit: the thickets are
  slightly ball-cluster-like at 100%.
