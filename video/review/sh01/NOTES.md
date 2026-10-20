# sh01 — review 2 (studio S1)

## Round 2 changes (director notes 1-6)
1. Render: 8 spp + OIDN, field deformation blur off, far field thinned, bounces trimmed. Accepted at ~80 s/frame
   Clean measurement, frame 95 (heaviest: falling drop + leaf + bokeh), nothing else running: **89 s/frame** (round-2 additions cost ~9 s). (A later mote trim was reverted: sh01 is APPROVED at d0f3dda and frozen.)
   `flicker_check_f94-96_100pct.png`: 100 % crops of a defocused leaf/background area, 3 consecutive frames: no blotches.
2. Hero blade: own material - strong yellow-green backlit translucency, deeper parallel veins + midrib crease,
   lower sky glare (waxy, not paper), saturated, dry tan only in the last ~1.5 % at the very tip.
3. Drop: a physical solar aureole (forward-scatter glow around the sun, camera/glossy/refraction rays only) gives
   the bright caustic focus spot in the lower half of the drop and rim glints.
4. Seedling leaf: brighter lamina, stronger translucency (veins darker in transmission); dew beads now sampled on
   the surface, irregular sizes, weighted to margins + vein grooves, none in the impact zone.
5. Exit: blades/flowers cleared from the sun line; focus racks toward infinity during the tilt -> round sun disc
   with soft halation at upper right (subtle; post halation on top is fine).
6. Warmer dawn tint, ~2x pollen motes (brighter, amber) through the rack focus.


Script: `video/blender/shots/sh01.py` + helpers in `video/blender/lib_s1.py`. Fully procedural + CC0
(Poly Haven `spruit_sunrise` 4k HDRI, `celandine_01`, `dandelion_01`, `forest_ground_04`).

## What happens (all event times looked up with ctx.word)
| t (s) | event |
|---|---|
| 0.00–0.30 | extreme macro (~2:1, 100 mm, drop ≈ 1/3 of frame width) on a pendant dew drop at a grass-blade tip; the backlit meadow + sky are refracted upside-down inside it (real Cycles refraction, IOR 1.333) |
| 0.25–3.30 | macro-rail pull-back 3.8 cm → 15 cm (smootherstep), slow pan; rack focus 1.15–2.15 s into the dew-laden blades 2–7 cm behind the drop (reveal), back onto the drop 2.55–3.25 s |
| 2.75–3.45 | drop swells (r 1.38 → 1.85 mm) and necks |
| 3.475 (1 frame before "karşılandığına" 3.52) | drop pinches off. Time ramps into high-speed "slow motion" (speed 0.069 ×, like a Phantom macro shot): the drop wobbles (Rayleigh mode ~58 Hz real), a satellite droplet and a residual bead stay behind, the relieved blade springs back up |
| 4.29 (1 frame before "şahit" 4.32) | lands on the seedling's right true leaf: spread/recoil to a sessile bead, leaf dips ~10° and springs back (damped 8.5 Hz in physical time), 9 micro-droplets fly off |
| 4.55–5.46 | speed ramps back toward 0.32 ×; camera pans right + tilts up (and booms 1.2 cm) into the low sun, which sits at ≈(72 %, 25 %) of frame at 5.24 s (upper right, for the sh02 light dissolve) |

Physical timing is honest: everything after the release (drop fall, leaf dip, pollen drift, grass breeze)
runs on the same warped clock `tau(t)`; only the camera move is in real time (motion-control rig).

## Look decisions
* Dawn gold: low sun 8° elevation straight behind the subject (backlit), HDRI warmed (tint 1.0/0.86/0.68),
  matching sun lamp (≈2900 K) for diffuse/translucent light; the HDRI's blurred sun is clamped and replaced
  by a crisp 0.53° sun disc (only camera/glossy/refraction rays see it) so the drops show real sun glints.
* Lens: 100 mm macro, 9-blade round aperture, f-stop animated (very small effective aperture at 2:1 → creamy
  background bokeh, DOF ±0.3 mm on the drop). Handheld noise is tiny (macro rail on a tripod).
* The compositor aborts headless here (no libEGL in the container, even an empty compositor tree), so glare
  is physical: a "Pro-Mist" style diffusion filter plane in front of the lens (1.4 % rough-refraction
  scatter) gives halation around the sun and glints. Post may add grain / grade.
* Seedling built per BRIEF §4 in `lib_s1.build_seedling` (6.2 cm, hairy translucent hypocotyl, two thick
  cotyledons, two cordate true leaves with pinnate + reticulate venation, SSS, soil crumbs). Other studios
  can import it: `import lib_s1 as L; L.build_seedling(...)`.
* Grass: 26 procedural blade/seed-head variants with sessile dew + some pendant tip drops, ~4300 GN
  instances; blades that would block the subject from any camera position are culled at build time.

## Stills (50 %)
* `sh01_t000.200.png` opening extreme macro, refraction in the drop
* `sh01_t001.900.png` pull-back + rack focus onto the dewy blades behind
* `sh01_t003.300.png` swollen drop just before release (key-word band above it is soft bokeh)
* `sh01_t003.950.png` slow-motion fall, satellite droplet + bead on the tip
* `sh01_t004.400.png` just after impact on the leaf (bead, splash)
* `sh01_t005.240.png` exit: tilt into the sun, upper right

## Render cost (updated)
Measured `--final` (1080x1920, frames 95-96, 4 cores): **~80 s/frame** at final_spp 8 + OIDN (adaptive 0.05,
bounces 6/1/2/6). The 8-spp denoised frame is clean (drop, leaf and bokeh checked at 100 %).
Calibration: on this container a trivial HDRI+monkey scene already costs ~2 s per sample-per-pixel at
full res, so 40 s/frame leaves ~3 spp for anything non-trivial. Profiled the rest: dense near-field grass
≈ 45 % of per-sample cost, seedling/drops/flowers ≈ 30 %, motes+filter ≈ 13 %, ~15 s/frame fixed
(GN eval + BVH + 16-bit PNG + denoise). Already cut: field deformation motion blur, far-field density
(4300 → 1600 blades), emissive mote light sampling, bounces. **Request:** accept ~80 s/frame for this
132-frame shot (≈ 3 h on one 4-core box), or say "6 spp" and I set ~65 s/frame (slightly softer bokeh noise).

## Known issues / next
* render time (above) · hero blade reads a bit pale/flat · seedling stem only partly in frame (macro
  framing; the landing leaf is the hero) · motes could be warmer/more numerous in the rack focus.
