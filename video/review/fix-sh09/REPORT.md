# fix-sh09: review finding s3-6

The farm renders from the fix commit, 9dcb88f. It builds on 380b93d. The only file changed is `video/blender/shots/sh09.py`; `lib_s7.py` and `common.py` are untouched.

## What changed
* **(a) Muscle on 'kaslarda'**
  * **Haze:** density is halved (fog distance x2) over f1140-1165, easing in over 1136-1140 and out over 1165-1173.
  * **Camera and light:** in the same window the focus is deeper (f/11, 0.55), the shutter is faster (0.15 instead of 0.5), and a soft grazing light on the probe lights the fascicles. All of these are per-frame keys.
  * **Fibre material:** the exterior fibres have real A/I band contrast, band relief and a glossy wet coat. The bands are slightly irregular.
  * **Root causes of the murk:**
    * The SSS radius (0.04-0.06) was larger than the sarcomere (0.04), so subsurface scattering blurred the bands away. It is now 0.012.
    * The band colour mapping covered only about 25% of the colour ramp.
* **(b) Mitochondria**
  * The outer membrane is now glossy amber with SSS. It is clear face-on and dense, with a soft glow, at the rim.
  * A second, inner boundary membrane sits inside it.
  * The matrix is a homogeneous emission and absorption volume, which Cycles integrates without ray marching. Its glow grows with thickness, so the core is bright and falls off to the rims.
  * New folded 3-D cristae replace the old ones, and the energy wave on 'olup' is kept.
* **(c) T-tubules**
  * Root cause: `lib_s7.tubes_from_edges` drops the material, so the tubules rendered with Blender's default grey material. That was the "white wire".
  * They now use their own tube node group with a set material and a soft rosy translucent membrane, and the rings are smoothed and resampled.

## Before and after (left = current film, right = fix; full-resolution crops at 864x1536)
* `f1146_fog_before_after.jpg`: thinner haze.
* `f1156_kaslarda_before_after.jpg`: striated, glossy fascicles beside the nerve.
* `f1190_ttubule_before_after.jpg`: the grey wire is now a soft tube.
* `f1214_mito_before_after.jpg` and `f1249_mito_before_after.jpg`: the flat decal is now a volumetric double-membrane body.

## Proof
* **Timing:** the camera path is unchanged. The impulse is still at f1153, the contraction at f1165, the dive at f1184.5, and the zoom-in at 1133-1142. The f1250 hand-off framing is identical. No event frame moved.
* **Luma:** compared on the full sequence at 25% resolution. 1132-1137 is unchanged, and 1150-1165 is 0.13-0.16 instead of 0.10-0.13. The largest frame-to-frame step is +13% at f1154 (the pulse; it was +17% before). Nothing exceeds 15%.
* **Determinism:** runs started one frame apart produced these results.

  | Runs | Result |
  |---|---|
  | 1154-1156 vs 1155-1156 | bit-identical |
  | 1164-1166 vs 1165-1166 (verifier) | bit-identical |
  | 1186-1188 vs 1187-1188 | differs by 1 LSB on fewer than 80 of 1.33M pixels (thread-level float noise, invisible) |

* **Cost on 4 cores, final settings (80% resolution, 8 spp):**

  | Frames | Seconds per frame |
  |---|---|
  | Exterior | 33-37 |
  | Interior | 37-44 |
  | Membrane crossing | up to 60 (f1180) |

* **Independent verifier:** PASS on all four items (defect gone at 100% and at phone size, nothing else changed, determinism, cost).
* **Optional polish not done:**
  * Plate-like cristae rooted in the wall.
  * A more visible inner membrane.
  * A warmer matrix.

## Hand-off note for sh10
sh10 builds the same interior from lib_s7 without this upgrade. Its frames from 1250 onward will show the old flat mitochondria and grey T-tubules unless it reuses `upgrade_interior()` from sh09.py. That function is self-contained and takes the `inter` dict plus the cristae wave. Without it, the cut at 1250 will show a change of look.
