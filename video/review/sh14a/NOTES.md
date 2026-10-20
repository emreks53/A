# sh14a — Sunflowers at sunrise (89.10–99.50, render frames 2132–2393) — studio S2 — **review round 3**

Built entirely in code: `video/blender/shots/sh14a.py` + `video/blender/lib_s2.py` (no downloads).

## Round 3 = director's round-1 notes
1. **Finale logic** — the camera now cranes up and orbits ~120° to look ACROSS the field toward the sun, which sits
   upper-left (14° left of axis, y ≈ 400 px, above the key-word band; horizon ≈ y 840, just below it). The lens zooms
   100 → 32 mm. All heads face the sun, so from here we see them correctly from 3/4 behind, with rim-lit edges
   and translucent petals. A true 3/4 *profile* with the sun inside a 9:16 frame is geometrically impossible
   (the sun would have to be ~90° off-axis), so 3/4-back is the honest version.
2. **"Allah" peak** — a hot sun disc with an aerosol glow halo around it (camera-only soft emitter); in-shader
   forward-scattering haze that brightens toward the sun and layers in depth; golden grade on the sky; exposure
   and sun energy build to the peak on 98.74. The sun is fixed at 12.5° elevation for the whole shot so it can sit
   above the band (it is only in frame at the end).
3. **Field variation** — head size 15–35 cm (log-normal, independent of plant height); plant height ±20 % plus
   large-scale undulation; ~6 % old, heavy heads droop 45–70° and do NOT follow the sun; yaw/tilt/roll scatter
   doubled; row jitter, a few plants out of row, irregular gaps and bare patches; nearer plants have 9 big leaves.
4. **Hills** — two layered ridges in aerial haze: a near one at ~0.9 km topped with an irregular tree line
   (rounded crowns in woods, with open fields between them), and a far ridge at ~1.9 km. The far carpet no longer
   reflects the sky (the bright "water" strip is gone).
5. **Macro open** — wider and brighter: green closed buds in the very centre, a maroon/purple-brown middle,
   pointed dark-tipped paleae, and a ring of open florets with yellow lobes and pollen-dusted anthers. Warm
   grazing sunrise light (~74° incidence) skims across so the spiral relief reads; dew drops pick up highlights.
6. **Petals** — natural yellow (warmed by the light), less sheen, translucency glow when backlit. Leaves no longer
   pick up a glassy sheen from the sky.

## Timeline
| time | event |
|---|---|
| 89.10–90.35 | macro on the spiral centre, slow drift + roll, f/10; **TRK_spiral** at the head centre ("hikmetli" 89.98) |
| 90.35–92.1 | pull back to the full flower, field behind |
| 91.58 → 93.3 | hero + field turn ~73° toward the sun and lift (per-plant delays; old drooping heads stay) |
| 93.3 → end | crane up (to 3.4 m) + orbit + zoom to 32 mm; focus racks to the field |
| 98.74 "Allah" | sun + glow at their strongest, sun upper-left, band 520–820 = clean golden sky |

## Stills (50 %)
`089.150` first frame macro · `089.980` "hikmetli" spiral · `091.200` full flower · `092.600` mid-turn ·
`095.500` crane/orbit (heavy motion blur: this is the fastest part of the move) · `098.800` "Allah".
`crop100_f2221-2223.png`: 100 % crops of a dark, defocused area on 3 consecutive final frames — no blotches/flicker.

## Measured final render (1080×1920, 4-core Xeon 2.1 GHz)
Heaviest frames f2221–2223 (hero + dense near field, DOF, motion blur): **68.4 s/frame**
(6 spp, adaptive 0.05, OIDN prefilter FAST/quality BALANCED). Macro and finale frames ≈ 45–55 s. Within the 90 s ceiling.

## Known / next
* The 95.5 transition is very motion-blurred (an orbit of ~20°/s). I can slow it if you prefer.
* Stem hairs are sheen only (particle hair cost 2.5× render time).

## Round 4 (director's round-3 notes)
1. Petals are now rich golden-yellow (base darker and more saturated, so AgX no longer rolls the sunlit side off to
   peach/white). The sun is less orange (3300→4200 K) and the sky grade is less sepia, so yellows and greens stay saturated.
2. White confetti: the flecks were sun glints off leaf/stem/bract surfaces when looking toward the sun. Leaves are
   now rough and matte (spec 0.04, roughness 0.85), sheen ≤ 0.12 everywhere, backlit leaf translucency tint lower,
   plus clamp_direct 12 / clamp_indirect 3.
3. Hills: separate, weaker haze (cap 0.55, darker haze colour) → a darker ridge with form and a tree line inside the haze.
4. Macro exposure +0.4 EV.
Stills replaced with round-4 renders. The motion of the shot and the render setup are unchanged (≈ 68 s/frame).
