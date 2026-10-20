# sh14a — Sunflowers at sunrise (89.10–99.50, render frames 2132–2393) — studio S2

**Review round 1 (first pass).** Built entirely in `video/blender/shots/sh14a.py` + `video/blender/lib_s2.py` (no downloads).

## What's built
* **Hero sunflower (procedural, botanical):** 1 550 disc florets on Vogel's model (θ = n·137.508°, r = c·√n),
  maturing centre → rim: green closed buds (5-creased pointed corollas) with dark-tipped paleae (chaff) in the centre,
  maroon buds in the middle, a ring of open florets (5 yellow-orange corolla lobes, black anther tube with pollen
  dusting, bifid stigmas on the oldest) toward the rim. 46 ray petals in 3 whorls (pointed outline, parallel veins,
  ridges, fold, twist, curl, random notches/short damaged rays, sheen + translucency), 40 hairy green phyllaries in
  3 rows, green receptacle back, curved neck, stem, 9 large cordate serrate leaves on petioles (vein pattern,
  translucency). Dew drops (real refraction) on florets and some rays.
* **Field:** ~140 000 plants as geometry-nodes instances of 6 head + 6 stem/leaf variants (rows 0.70 m × 0.26 m,
  jitter, height/scale variation, gaps). Head yaw/pitch are animated in GN from Scene Time with a per-plant delay
  (±0.1 s + distance ripple) → the field turns *together but not robotically*. A clear corridor is cut where the
  camera dolly runs low. Beyond 120 m: distant carpet + low hills; in-shader aerial perspective (no compositor —
  the compositor needs a GPU/EGL context that the render containers do not have).
* **Light:** Nishita multiple-scattering sky (high air/aerosol for a warm sunrise), matching sun lamp, visible sun
  disc (camera-only emitter). Sun elevation 1.5°→4.5° across the shot; sun energy, colour (2500 K→3500 K), sky,
  haze colour and exposure ride up together so the light "grows" into the golden sunrise peaking on **"Allah" (98.74)**.

## Timeline / camera (100 mm macro, ends as a 50 mm crane)
| time | event |
|---|---|
| 89.10–90.35 | extreme macro on the spiral centre (frame ≈ 6 cm wide), slow drift + roll, f/10; **TRK_spiral** on the head centre (post draws Fibonacci arcs on "hikmetli" 89.98) |
| 90.35–92.1 | pull back to the full flower, rack stays on the disc; field defocused behind |
| 91.58 ("görüyormuşçasına" −0.1 s) | hero + every head in the field turn ~73° toward the low sun and lift (−4° → +10°) over ~1.7 s |
| 93.3 ("her" −0.5) → end | crane up (+1.9 m), orbit ~92° around the hero to look into the sunrise, zoom 100 → 50 mm, focus racks to the field |
| 98.74 "Allah" | brightest, most golden moment; sun disc in frame, band 520–820 px = clean sky |

## Stills (50 %, preview quality)
* `sh14a_t089.150.png` first frame — macro of the florets
* `sh14a_t089.980.png` "hikmetli" — spiral centre for the arc overlay
* `sh14a_t091.200.png` full flower revealed
* `sh14a_t092.600.png` mid-turn: heads swinging to the sun, rim light
* `sh14a_t095.500.png` crane/orbit begins
* `sh14a_t098.800.png` "Allah" — sunrise over the whole field

## Measured render time
Heaviest frame f2222 (92.6 s, hero + dense near field, DOF, motion blur), 1080×1920 on this 4-core Xeon 2.1 GHz:
* original settings (32 spp, OIDN accurate): **346 s/frame**
* now (10 spp + adaptive 0.04, OIDN prefilter FAST/quality BALANCED via a render_init handler, floret SSS off,
  static stems out of the motion BVH): **100 s/frame** — still **over the 40–45 s budget**. Macro frames ≈ 55 s.
  Profiling: ~15 s/frame is fixed (sync + GN motion-blur evaluation + denoise + PNG); the rest is path tracing of
  dense foliage seen at grazing angles (bounces/textures barely matter; geometry/visibility does).
  Next steps: lighter near-field leaves/heads, fewer near plants in frame, try 6–8 spp. If it cannot reach ~45 s
  without visible loss, I propose spending the extra ~4 h of render (262 frames) or splitting chunks with idle
  studios — director's call.

## Known issues (being worked on now)
1. Macro: floret buds still read a little "bead-like"; adding stronger palea tips, fine hairs and pollen grains.
2. 95.5 in the review stills / animatic: focus stayed on the hero while the camera turned to the horizon → frame fully soft. **Fixed in the script** (focus racks to ~22 m during the orbit) — will show in round 2.
3. Horizon: bright haze strip between carpet and hills reads a bit like water; hills moved closer/lower, haze reduced (in script, round 2).
4. Stem hairs (particle hair) cost 2.5× render time; currently off (sheen only). Will re-enable on the hero only if budget allows.
5. Shadow sweep into sh14b is designed as the first beat of sh14b (see sh14b NOTES).
