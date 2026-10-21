# sh13b — review 4 (studio S3)

Script: `video/blender/shots/sh13b.py` (+ THE SEEDLING from `lib_s3.py`).

## Stills (50 %, preview quality)
| file | t | shows |
|---|---|---|
| sh13b_t084.100.png | 84.10 open | low glide through the golden meadow (continuing sh13a), slowing |
| sh13b_t085.900.png | 85.90 "birer birer" | the hold for the rings: 8 separated subjects (see layout), key-word band y 520–820 kept to soft grass/sky |
| sh13b_t087.500.png | 87.50 just after "gözetip" (86.74) | the camera drifting down toward the seedling |
| sh13b_t088.600.png | 88.60 | macro on the seedling's leaf tip: the single dew drop formed (grows from 86.64 to 88.1), sunbeam spot resting on it |
| sh13b_t089.250.png | 89.25 exit | focus pull off the drop into the meadow (dissolve to sh14a's sunflower) |

## Trackers (`sh13b.json`) — layout at the hold (1080×1920 px)
| tracker | subject | ≈ screen pos |
|---|---|---|
| TRK_a | dandelion flower (Poly Haven `dandelion_01`) | (300, 980) |
| TRK_b | honeybee (procedural: striped abdomen, fuzz, blurred wings), hovering | (690, 330) |
| TRK_c | small copper butterfly perched on an ox-eye daisy (procedural), wings breathing | (270, 390) |
| TRK_d | seven-spot ladybird crawling up a grass blade | (770, 1000) |
| TRK_e | grass seed head (nodding panicle) | (520, 240) |
| TRK_f | garden snail (spiral shell), gliding | (250, 1360) |
| TRK_g | pine sapling (Poly Haven `pine_sapling_small`), back right | (850, 460) |
| TRK_h | THE SEEDLING (parented to its apex) | (540, 1200) |
Subjects are placed by solving the camera hold pose in screen space, so the spread is guaranteed.

## Review 4 — final pass (director notes)
* Subjects embedded in vegetation: every subject's base is surrounded by grass/weed clumps scaled to
  hide 55-90 % of its stalk; the butterfly sits on a daisy inside a cluster of five; the ladybird now
  crawls along a broad weed leaf held up among the grasses; soft out-of-focus grass + one daisy in the
  foreground corners for depth (kept out of the key-word band and the camera path).
* Richer golden backlight: sun 6.5 (was 5), grass translucency 0.5 → rim on every blade.
* Macro drop on the leaf tip unchanged; a stray scanned grass blade that crossed the macro near the focus plane (thin dark line, director check) is removed — any meadow instance within 9 cm of the leaf tip is hidden.
* Only sh13b.py changed; lib_s3.py (seedling) is identical to the approved commit 1a56381.
* Render: `--final` steady state frame 2061 ≈ 58 s, macro frame 2121 ≈ 69 s (ceiling 90).

## Review 3 — director notes addressed
* MATCHES sh13a: Poly Haven `evening_field` 4k, its sun measured at 9.8° (lamp at 9.8°, 3000 K), placed
  just out of frame ahead-left so the grass is rim/back-lit; peach-gold sky.
* 75 mm lens (was 50): subjects ~60–150 px at full res (ladybird and snail also enlarged); stalks now
  rise out of taller grass instead of bare ground; grass kept clear just around snail/ladybird/seedling.
* Seedling: no coat/wet here, same lib materials as sh04/sh11.
* Macro: the meadow dims (a cloud edge: sun 5 → 2.4, sky ×0.7) while a warm sunbeam spot through a gap
  rests on the leaf tip — the leaf glows warm/translucent with veins, the drop holds a glint.

## Light / world (review 2, superseded above)
Poly Haven `grasslands_sunset` (sun ~3°) rotated so the sun sits ahead-left, behind the subjects,
warm-tinted; 2600 K sun lamp. Meadow = 110k hair-curve grass blades + ~900 Poly Haven grass/flower
variants (each variant re-based individually). NOTE: I don't know sh13a's exact look yet — if the
director/S-studio for sh13a uses a different HDRI or grade, tell me and I'll match it.

## Render time
`--final`, 4 cores, steady-state frame: **2061 (wide hold) ≈ 41 s**, **2121 (macro on the drop) ≈ 58 s** (review 1: 66-70 s). 12 spp + OIDN balanced, curves as ribbons. The macro end is over budget because of the huge defocus over the grass blades in front — next: thin the carpet near the macro framing.

## Changes since review 1
* fixed HDRI/sun orientation (Mapping rotates the lookup the other way) → the sun really is ahead-left
  now: warm rim light on every grass tip; far meadow clumps don't cast shadows over the set.
* warmer 2500 K sun, warm world tint; daisy replaces the oversized gazania; vein contrast up.
* macro end framing looks down onto the leaf so the venation and the dew drop read together.

## Known issues / next
* insects are small in frame (by design: ring targets); sapling reads weakly against the weeds.
* the "sunbeam" is a soft warm spot, not a visible shaft (no volumetrics, by budget).
