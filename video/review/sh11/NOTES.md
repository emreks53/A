# sh11 — review 1 (studio S3)

Script: `video/blender/shots/sh11.py` (+ `lib_s3.py`: seedling, cracked earth, wet ground, GN particles).

## Stills (50 %, preview quality, WITH motion blur)
| file | t | shows |
|---|---|---|
| sh11_t058.200.png | 58.20 open | sh04's cracked earth + same seedling (wilting) under a dark rain sky (Poly Haven `overcast_soil`, dimmed/desaturated); first light rain streaks |
| sh11_t059.000.png | 59.00 just after "bütün" (58.60) | first heavy drops have hit the dust: dark wet spots spreading, crowns/splash droplets, dust grains kicked up; rain thickening |
| sh11_t061.500.png | 61.50 "ayağımıza" | ground level, the camera looks up the crack that runs to the seedling; muddy water advances along the crack toward the camera; streaks over the backlit sky |
| sh11_t062.500.png | 62.50 | drops have hit the leaves (bounces) - beads on the leaves/stem; leaves starting to lift; sun disc beginning to break through behind |
| sh11_t063.300.png | 63.30 "karşılanıyor" (62.84) | sun broken through behind: backlit rain glowing, wet ground glistening, seedling upright |
| sh11_t063.950.png | 63.95 exit | tilted up into the bright rain sky with the sun glow (→ sh12 emerges from cloud into sunlight) |

`sh11_animatic.mp4`: NOTE the library renders animatics without motion blur, so rain reads as white
dots ("snow") there — in stills/final it is streaks. `sh11.json` = `TRK_seedling`.

## How it works
* Rain = 52k drops in a geometry-nodes point cloud moved analytically by scene time (constant
  topology → real deformation motion blur streaks, deterministic for any frame range); plus 5
  far-field rain cards (procedural scrolling streaks) at 0.7–8 m for the distant curtain.
* Impacts: 18 hero drops (keyed falls) on/after "bütün"; each: crown sheet, 14 GN splash droplets,
  dust grains (only while the ground is dry), and an expanding wet spot in the ground shader; plus
  procedural random spots; global soak from "ayağımıza" (darker, glossier, water pooling in cracks).
* Water along the crack: the crack is found on the real displacement map (Dijkstra on the
  Poly Haven heightfield) → a water strip lies in the crack floor; its front advances far→near,
  passing the seedling's base just before "karşılanıyor".
* Leaves: 5 drop hits → damped bounces (pulvinus pivots); beads appear; leaves rise upright.
* Sun break on "karşılanıyor": world glow + sun lamp ramp behind the plant (backlight).

## Render time
`--final` frame 1500: **~107 s/frame** — OVER budget; optimising next (rain mesh size, card
transparency, ground). Will report.

## Known issues / next
* rain density/brightness still being tuned; crowns read a bit "coin-like" in some frames.
* ground still too warm/dry-looking in the first second for a dark rain sky.
