# sh13b — review 1 (studio S3)

Script: `video/blender/shots/sh13b.py` (+ THE SEEDLING from `lib_s3.py`).

## Stills (50 %, preview quality)
| file | t | shows |
|---|---|---|
| sh13b_t084.100.png | 84.10 open | low glide through the golden meadow (continuing sh13a), slowing |
| sh13b_t085.900.png | 85.90 "birer birer" | the hold for the rings: 8 separated subjects (see layout), key-word band y 520–820 kept to soft grass/sky |
| sh13b_t087.400.png | 87.40 just after "gözetip" (86.74) | the camera drifting down toward the seedling |
| sh13b_t088.600.png | 88.60 | macro on the seedling's leaf tip: the single dew drop formed (grows from 86.64 to 88.1), sunbeam spot resting on it |
| sh13b_t089.250.png | 89.25 exit | focus pull off the drop into the meadow (dissolve to sh14a's sunflower) |

## Trackers (`sh13b.json`) — layout at the hold (1080×1920 px)
| tracker | subject | ≈ screen pos |
|---|---|---|
| TRK_a | dandelion flower (Poly Haven `dandelion_01`) | (300, 980) |
| TRK_b | honeybee (procedural: striped abdomen, fuzz, blurred wings), hovering | (690, 330) |
| TRK_c | small copper butterfly perched on an ox-eye daisy, wings breathing | (270, 390) |
| TRK_d | seven-spot ladybird crawling up a grass blade | (770, 1000) |
| TRK_e | grass seed head (nodding panicle) | (520, 240) |
| TRK_f | garden snail (spiral shell), gliding | (250, 1360) |
| TRK_g | pine sapling (Poly Haven `pine_sapling_small`), back right | (850, 460) |
| TRK_h | THE SEEDLING (parented to its apex) | (540, 1200) |
Subjects are placed by solving the camera hold pose in screen space, so the spread is guaranteed.

## Light / world
Poly Haven `grasslands_sunset` (sun ~3°) rotated so the sun sits ahead-left, behind the subjects,
warm-tinted; 2600 K sun lamp. Meadow = 110k hair-curve grass blades + ~900 Poly Haven grass/flower
variants (each variant re-based individually). NOTE: I don't know sh13a's exact look yet — if the
director/S-studio for sh13a uses a different HDRI or grade, tell me and I'll match it.

## Render time
`--final` (16 spp, OIDN balanced): frame 2061 **~66 s/frame**, frame 2101 **~70 s/frame** — over budget (grass carpet curves + many grass instances); optimising next.

## Known issues / next
* golden-hour warmth still too weak (looks closer to dusk overcast) → more backlight/rim + warmer sky.
* insects are small in frame (by design: ring targets); sapling reads weakly against the weeds.
* the "sunbeam" spot is subtle; want a visible warm beam glow on the leaf.
