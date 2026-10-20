# sh13a — review 2 (studio S1)

## Round 2 changes (director notes 1-4)
1. Golden hour: sun 9.8° just out of frame right-ahead (back/side light, rim glow on blades, seed heads, flowers),
   warmer peach sky (HDRI tint), cloud shadow thinner (72 % max) so the glide keeps its backlight; on "Halık" the
   ragged edge slides off and the meadow turns visibly warmer/brighter.
2. Reveal: gently rolling terrain (flat only where the glide happens); every species grows in its own drifts with
   bare gaps (poppy clusters, white daisy drift, blue cornflower patches, buttercups, Poly Haven flowers); grasses
   lean (random + wind bias) with varied patchy heights; forest edge = continuous layered mass (two species, near
   edge + deep background 95-170 m) with warm aerial haze by camera distance; two lone meadow trees.
3. Life: a fritillary crosses ~1.2 m in front of the lens 75.6-77.8 s (motion-blurred wingbeats); bees hover at
   flower height 1.4-4 m; dandelion seeds drift on the breeze.
4. Render: **80.5 s/frame measured** (frame 1990, reveal = heaviest; glide frame 1836 is lighter) at final_spp 6 +
   OIDN and **final resolution 90 % = 972x1728** (post upscales to 1080x1920; the director allowed reduced
   resolution for defocus-heavy shots). Frames 1990/1991 at 100 % crop: no blotches / flicker.
   Geometry cuts barely moved the number (cost is per-sample shading of dense near grass), so resolution was the
   lever that keeps the look. The override lives in sh13a.py only (wraps C.configure_render; common.py untouched).


Script: `video/blender/shots/sh13a.py` (+ `video/blender/lib_s1.py`). CC0 only: Poly Haven `evening_field`
4k HDRI (golden hour, sun 9.8°), `grass_medium_02`, `shrub_02`, `island_tree_02`, `tree_small_02`,
`celandine_01`, `dandelion_01`, `flower_gazania`, `flower_ursinia`, `periwinkle_plant`, `nettle_plant`,
`sparse_grass` texture; procedural oxeye daisies, poppies, cornflowers, grasses in seed, butterflies
(fritillary-orange + whites), bees, dandelion seeds.

## Action
| t (s) | event |
|---|---|
| 74.15–79.0 | low gimbal glide (35 mm, f/2.8, lens 30 cm above ground, ~0.55 m/s, gentle S-weave + roll) through tall grasses in seed and wildflower drifts; flowers planted just off the path brush past the lens at 75.0 / 76.3 / 77.4 / 78.4 / 79.3; butterflies and bees work the flowers 1.5–9 m ahead; dandelion seeds drift on the breeze. The near meadow is under a soft broken cloud shadow, the far meadow already glows. |
| 78.98 ("Halık" 79.06) | the camera starts a smooth rise (0.30 → 1.45 m over 3.6 s, tilting down 9°, slight pan) while the cloud shadow's ragged edge slides off the meadow toward and past the camera — warm low sun spreads over the whole meadow ("geniş şefkat"). |
| 82.6–84.4 | settles high over the sunlit wildflower meadow, forest edge on the left, open golden sky; continues drifting forward (valid motion for the dissolve into sh13b). |

Key-word bands (79.1–81.2, 82.8–84.0, y 520–820): during the rise that band holds the soft defocused
treeline/sky (focus 1.6–3.8 m at f/2.8 keeps the trees soft); after the rise it is open warm sky/horizon.

## Light
Sun lamp matched to the HDRI sun (9.8°, ~3000 K), placed 26° right of the view so grasses are rim/back-lit
but the sun stays just out of frame; forest edge on the left so its very long low-sun shadows fall away from
the view. The cloud-shadow sweep is a shadow-only plane 60 m up with a noisy edge (≈3 m natural penumbra).

## Stills (50 %)
`sh13a_t074.300` opening glide · `t076.400` glide, butterfly crossing · `t078.900` just before the rise
· `t080.400` rising, light sweeping in · `t082.200` reveal, meadow in drifts · `t084.100` last frame.

## Render cost
Measured `--final` frame 1836 (low glide, densest): **~112 s/frame** at 8 spp + OIDN on 4 cores (27k
blades, 7k grass clumps, 11.7k flowers, all instanced, frustum-culled at build). Will optimise next
(thin out-of-view/far instances, 6 spp test). Same hardware note as sh01: a trivial scene costs ~2 s/spp.

## Known issues / next
* sky in the low-glide part reads a little grey-white; trees could be more varied; butterflies are small
  in frame — will bring one through closer · render time over budget (see above).
