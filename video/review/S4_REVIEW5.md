# S4 — review 5 (targeted fixes from the review-4 notes for sh02 + sh03)

## Done
* **Light rig**: area lights now point INTO the room. SkyFill rot (0,−90°,0) 30 W; GroundBounce (0,−105°,0);
  RoomBounce faces −X 22 W. TableBounce is rot (π,0,0) at z +2 cm, 14 W, light-linked to walls / ceiling /
  sill / skirting / window / curtain only. The sun patches are back with grain, mullions and long cast
  shadows. One shared `ROOM_EXPOSURE` = 0.9. A skirting board was added.
* **Shafts**: density stretched 1:4 along the sun, noise amp 0.85 (from earlier), 100 % within 0.6 m of
  the glass falling to 25 % at 1.5 m, strength 0.045, biased volume.
* **Bread**: one long shallow lengthwise slash with a sharp darker ear and flour only in the cut. Rougher
  (0.85–0.95), Specular IOR level 0.25, stronger bump. The half loaf keeps its flour (bmesh layers survive
  the cut) and shows crumb.
* **Farm**: the curtain cache moved to `video/blender/cache/s4_curtain_cloth.pc2`. The path is taken from
  `__file__`, and the header is asserted (verts == 2816, frame range). Dry-run: the sh02 f204–206 finals
  below were rendered from a `git archive HEAD video/blender video/timing video/audio` export.
* **GlassStrip**: 10 W, about 40° off the lens axis, light-linked to the glass / water / jet / crown /
  bubbles / jug only. 0 W through f237, on by f246, off by 12.0 s.
* **Jet**: FRONT runs to 1.06. The jet origin slides as the level rises, so it always lands on the impact
  point. f/5.6 macro with focus 1.5 cm behind the near face. Glossy 4 / transmission 12 / max 12 for
  f248–292.
* **Haze**: the shaft and mote gains fade 1 → 0 over f237–249; the curtain stays renderable.
* **Takdim**: the plate goes from (−0.17, 0.47) to (−0.05, 0.30), 21 cm toward the lens, and ends in the
  sun. Oblique targets were pulled back 12 cm. The settle now runs 15.05 → 16.25 s (≤ ~0.7 m/s average).
* Motes gain 0.7, gust gain 1.0 with ambient 0.05, gust keys 8.00 / 8.40 / 9.80 in both shots. Olive bowl
  is matte ceramic with no holes. Bubble rims are darker, cheese is crumblier, walnut shells are deeper.

## Verification (final quality: 12 spp, adaptive min 8, OIDN ACCURATE, biased volume)
| frames | res | s/frame |
|---|---|---|
| sh02 f204–206 (from the git-archive export) | 80 % | 92.0 (first frame includes scene sync) |
| sh02 f231 | 80 % | 79.6 |
| sh03 f231 (haze carried over) | 100 % | 123.1 |
| sh03 f249/251 | 100 % | 66.6 |
| sh03 f271 / f345 / f378–383 | 100 % | 65.3 / 56.5 / 52.9 |

Files: `sh02/finals/sh02_FINALQ_f204.jpg`, `sh02/finals/sh02_f231.jpg` + `sh03/finals/sh03_f231.jpg`
(the cut pair, same composition), `sh03/finals/sh03_f249/251/271/345/378/383.jpg`,
`sh03/finals/sh03_f262_128spp_nodenoise.jpg`, `sh02/crops/sh02_crop_f204-206.png`,
`sh03/crops/sh03_darkcrop_f381-383.png`. Stills: sh02 t6.5 / t8.3 / t9.0 / t9.6 and sh03 t9.6
(50 %). Animatics and tracks were refreshed.

## Honest remaining issues
* **Jet**: the 128 spp no-denoise frame shows the jet is genuinely bright. It is a thin water cylinder
  refracting the sunlit window behind it, so this is not a denoise artifact. It is clear at the impact
  but still reads lighter than ideal above the rim.
* **sh02 cost**: averages 92 s/frame including the first-frame sync; the steady state is ~80 s.
* **Top-down curtain**: the window curtain is visible at the top-left of the sh03 top-down (frames
  378–383) and reaches the top of the 520–820 band. Hiding it would pop, so it stays.
