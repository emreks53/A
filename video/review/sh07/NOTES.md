# sh07 · 35.70–40.60 · "…kendimize bir güneş üretemezdik" — studio S6

Open sea at dawn, 100 mm lens (sun disc ≈ 50 px), f/8, camera ~1.25 m over the water rising to ~3.6 m
while drifting forward 9 m (boat/drone feel, tiny handheld noise). Horizon held just above frame centre
(y ≈ 940–960) so the GÜNEŞ band (y 520–820) is a clean sky gradient with no cloud or detail.

## Stills (50 % res, preview quality)
| file | t | what it shows |
|---|---|---|
| sh07_animatic.mp4 | — | 25 % animatic with narration |
| sh07.json | — | TRK_sun screen track |
| sh07_t035.500.png | 35.50 | first frame (handle): deep red-orange pre-dawn sky, dark violet sea reflecting it |
| sh07_t037.400.png | 37.40 | camera rising; horizon glow brightening where the sun will appear |
| sh07_t038.920.png | 38.92 | **"güneş" (38.88)** — the sun's rim (a thin sliver) breaks the horizon, first glints run toward camera |
| sh07_t039.550.png | 39.55 | half disc up, glitter path now reaches the foreground |
| sh07_t040.200.png | 40.20 | exposure/veiling glare building, glitter path explodes toward lens |
| sh07_t040.790.png | 40.79 | last frame (handle): warm glare fills the frame (light dissolve to sh08) |

## How it is built
* Water: Blender Ocean modifier (60 m tiles, res 16, 6×16 tiles ≈ 360×960 m) + a second Ocean modifier in
  DISPLACE mode (14 m) for short wind chop, + two procedural normal-ripple layers in the shader. Beyond
  960 m a rough far-sea plane carries the distant sheen. Dark deep-water base colour, IOR 1.333, foam layer
  wired (little foam at this wind).
* Sky: Multiple-scattering sky with the sun a little below the horizon (twilight), saturation/tint graded
  warm near the horizon → violet overhead, a horizon haze band and an aerosol forward-scatter glow around
  the sun (animated up as it rises). Lookup clamped above the horizon so reflections never see the dark
  "ground" of the sky model.
* Sun: an emissive disc 9 km away (true 0.53° size, limb colour ramp, brightness rising to mimic
  atmospheric extinction near the horizon), camera-visible only. A matching sun lamp (energy ∝ fraction
  of disc above the horizon) makes the glitter path. The lamp sits ~2° higher than the disc — cheat so wave
  crests don't fully self-shadow at grazing light; reads correctly on screen.
* Timing: rim touches horizon one frame before `ctx.word("güneş")`; sun rises 0.30°/s (accelerated).
* Glare: compositor Fog Glow ramps with the sunrise; exposure +2.8 EV over the last ~0.9 s for the exit glare.
* TRK_sun parented to the sun disc centre.

## Render cost
Measured `--final --from 955 --to 955` (sunrise + full glitter, the heaviest kind of frame): **45.1 s/frame**
on 4 cores (12 spp + OIDN, adaptive 0.04). Optimisations: near/mid ocean LOD (near patch 60 m wide × 180 m,
res 16 + chop; mid patch res 8 to 945 m), no deformation blur on the waves (camera motion blur kept), world
importance sampling off (water is near-specular, the sun is a lamp; saved 11 s with no visible change),
reduced noise octaves, glossy bounce 1. First measurement before these was 118 s.

## Known issues / next
* v2: thin high cirrus bands now visible at the top (y < ~450, clear of the GÜNEŞ band); exit glare ramp
  starts at 40.15 s (was 39.9) so 40.2 s still shows the glitter path before the glare takes over.
* One large defocused glint occasionally passes in the near foreground (~39.5 s) — physically correct, can
  tame it if the director prefers.
