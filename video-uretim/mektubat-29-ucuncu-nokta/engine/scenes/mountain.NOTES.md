# scenes/mountain.js — notes (v4, after the art + meaning critiques)

The saints on the hard road, then the praise at the summit. Global time range **t ∈ [41.8, 54.9]**.
API: `init()` builds every sprite, then pre-warms by drawing 9 representative frames on a scratch canvas (about
4–8 s, runs once). `draw(ctx, t)` paints the whole opaque frame. `t ≤ 42.3` gives uniform `#161D2E`, `t ≥ 54.6`
gives uniform `#F4EBD8`. The module draws no text. The only humans are rig.js men: our man (size 360 world px),
six tiny saints on the switchbacks (35–58 px), three tiny saints in du'a on the dawn ridges (62–80 px).

Test timeline: `tests/mountain_tl.js` (DURATION 55).
- `--tl=./tests/mountain_tl.js?dbg` overlays the calligraphy box (solid: 90,330–990,640; dashed: the real glyph
  extent 90,250–990,720), the subtitle band (1290–1440), the current word and gloss.
- `?pose` draws a du'a pose test sheet from `DBG.poseVariants` (used to choose `DUA_N` / `DUA_F`).
- Helper tools used for this version (not part of the engine): `../work/mtn_tools/` — `probe.mjs` (evaluate an
  expression against `M.DBG` in the page), `perf.mjs` (scene ms/frame + forward/reverse determinism), `sheet.py`.

## Beat sheet (video seconds)
| t | word | picture |
|---|---|---|
| ≤42.30 | – | uniform night |
| 42.33–42.62 | İşte 42.49 | close-up z 3.7 on the kandil (the *same* lamp as the lamps shot: ported silhouette + palette). The flame sparks; the brass emerges with it |
| 42.38–44.15 | bu sırra binaen | darkness opens in three stepped painted rings centred on the lamp/hand; the gold eternity ring of the previous shot sweeps once around the lamp (42.62–43.3, fades by 43.75). Camera pulls back 42.7–44.3 (inOutCubic, lamp anchored) to the dusk establishing shot: rose-peach horizon band framing the massif, early stars. The lamp's amber rings fade in behind him from 43.15 |
| 43.82–44.75 | – | he lifts his head to the trail |
| 43.88–44.58 | ehl-i velayet | six saints' lamps appear one by one up the switchbacks, then their tiny climbing figures |
| 44.22 | – | first step, from a staggered stance that matches the gait phase (no over-stretched rear leg). Wide hold to 44.55, then the follow cam blends in over 44.55–45.4 |
| 44.55–44.90 | – | copper ibrik paints in (bottom-up wipe) in his far hand |
| 44.95–45.62 | hizmet 45.01 | he slows to 50 px/s, hinges +0.12 toward the sapling, lowers the ibrik to hip height and pours: a true parabola from the spout tip (head 45.05–45.20, tail 45.45–45.62), tapered 4.4→2.2 px, detached drops, splash rings, wet soil. The 0.4 S sapling perks up with a bounce when the water lands (45.18), greens and buds after he has passed (45.75–46.6) |
| 45.75–46.5 | meşakkat 45.71 | the slope rises (x 200–310) to 0.6 with rock steps; camera pulls out to z 1.0 with a −0.075 rad tilt to show the climb ahead. Lean follows the real slope under him (0.055 → 0.30), strides shorten |
| 46.2–47.6 | musibet 46.67 | storm rolls in: three opaque cloud strata fade in while sinking (inOutSine, 46.2–47.0 / 46.5–47.6), rain curtains under them, gouache rain in three parallax layers. One soft pulse at 46.9: the clouds light up from inside (lit bank sprites, 0.1 s rise, exp decay), a short soft bolt, a faint sky flash. The flame leans in the wind (up to ~0.35 of its height) and gutters on the flash, never goes out |
| 47.27–47.6 | külfeti 47.27 | the bohça drops onto his back (opaque, squash-settle), red-brown strap over the near shoulder and across the chest, under the near arm; body dips, lean +0.1 |
| 47.6–50.5 | – | storm mist capped at 0.7 (the massif survives as a darker silhouette), three saints' lamps glimmer high up the trail |
| 47.95–48.6 | hoş görüyorlar | burst of seven flowers around his feet (47.95–48.25, 0.32 s blooms with a light pop ring), then a cluster of three flowers at every heel strike to the summit; he straightens (lean −0.09) and lifts his head level; the halo warms |
| 49.06–50.0 | nazlanmıyorlar | grey wisps drift in from the storm behind his head and gather into a scribbly sigh-cloud that never completes (scribble stops at 60 %), dissolves into gold motes 49.62–50.0. Nothing comes from his mouth |
| 50.13–51.1 | şekva etmiyorlar | dark jagged grumble shards converge out of the storm darkness ahead of/above him with a tangled scribble; the gust (50.5–51.15) blows it apart |
| 50.6–51.9 | – | the same gust parts the storm: a glowing gap opens above the summit first (gap glow), the banks split there and roll out sideways (inOutSine, 640 px) while thinning (51.05–51.75); rain stops by 51.25; the dawn vista cross-fades in behind the banks (50.75–51.6); one golden shaft lands on him (50.95–51.95, fades inside the calligraphy zone from 51.45); rays break through strongly 51.0–51.6 then stay faint and uniform. Dawn light on the world ramps 50.85–52.1 |
| 50.95 | – | walk ends on the summit shoulder (double support), closing step to 51.31 |
| 51.0–51.62 | – | one hip-hinge bend (lean 0.48, knees nearly straight): lamp set on the rock step at 51.3 (near hand), ibrik at 51.4 (far hand) |
| 51.43–51.84 | – | far hand takes the strap at the chest, near shoulder dips, the bundle is lowered behind him to the ground by the strap (lands 51.84, squash-settle) |
| 51.86–52.46 | Elhamdülillâhi 51.82 | du'a: both hands rise by elbow-angle interpolation (never a straight-arm reach) to open palms at chest–shoulder height, near hand flatter, far hand ahead and more upright so two hands read; torso upright, head raised, legs straight (hip = ground − 0.522 S). Hold to 54.2 |
| 52.35–53.35 | – | three tiny saints fade in on the neighbouring dawn ridges, also in du'a with their lamps beside them (plural "diyorlar") |
| 53.7–54.25 | diyorlar 53.78 | light grows outside the calligraphy zone (soft-light wash, sun glow) |
| 54.20–54.60 | – | cream rings bloom from the sun + global fade, fully uniform `#F4EBD8` by 54.6. Hold to 54.9 |

### Integrator zones (measured on post-processed previews)
- Calligraphy box 51.6–54.2 (90–990 × 330–640, and the real glyph extent 250–720): one flat dusty rose-mauve band
  `#BF9EAA` (mean luminance **0.65**), dabs at 12 % contrast and 20 % count; luminance SD **3.9–4.3** (box), 4.5–4.8
  (250–720); sky band boundaries at 205 and 765 (interlock dabs stay outside 245–725); puffy dawn clouds above 250
  or below 740; sun disc below (205, 842), only the faint outer ring reaches into the zone. From 54.2 the outro
  bloom enters the zone (by design of the handoff).
- Subtitle band 1290–1440: low-contrast mountain face; rain at 35 %; mean luminance at the summit 0.43–0.47, rising
  smoothly to **0.584 at 54.35** (< 0.6, so overlay.js's > 0.62 tone test never flips before the gloss ends).
- The late light (53.7+) grows only below a ragged horizon edge at y ≈ 748; above it (the calligraphy zone) it ramps in
  with the outro from 54.2 (box mean 0.652 at 54.2 → 0.722 at 54.35), so no rectangle ever shows.
- Man at the summit: head top ≈ y 745, feet ≈ y 1215, hands ≈ y 860–900 (against the mid-value mound).

## Structure of the module
- **Ground**: `slopeAt` → 1 px table `ground(x)`. Gentle start, steep 0.6 from x 200–310 with rock noise (250–700),
  summit shoulder ~800–1240, falls away to the right. The **summit crest** (`SLAB`, `slabPts`, `paintSlab`) is a
  hip-height rock step in front of where he stops, painted in the mountain's own face colour with rock planes only at
  the top/front, its top running on as the mountain's right flank — it is the summit, not a separate stone.
- **Walk**: speed track `VK` (px/s) → time→distance table. Step length scales with speed (0.2 S standing → 0.305 S
  at 150 px/s), −0.035 on the steep part, −0.015 under the load, +0.012 serene; phase table `phiAt`; the last 320 px
  are corrected so the walk ends in double support. Standing foot spots are the gait's own plant positions at PHI0.
  `footAt` IK-plants feet on fixed spots; hip clamped to keep both feet reachable.
- **Summit choreography** constants `T_BEND`, `T_LAMP_DOWN`, `T_IBRIK_DOWN`, `T_STRAP`, `T_LOWER`, `T_DUA`; du'a arm
  angles `DUA_N`, `DUA_F` (chosen on the `?pose` sheet); `specTo()` converts an IK wrist target to angles so the
  far arm can be interpolated by angle from where it lowered the bundle.
- **Kandil**: `paintKandil` is the lamps.js art (ported, mirrored), sprite `mtn_kandil` + night-tint silhouette;
  `flameTip`, `lampCentre`; lamps-style teardrop flame with inner core and wind lean; `drawEternity` echo.
- **Light**: `lampRings` = three opaque flat rings, tints of the local background toward the flame colour
  (reference-sun style), radius 0.25–0.3 S, clipped to the sky (`SKY_CLIP`, includes the crest). The man is lit by
  two clip-redraws in warmer colours inside stepped circles around the flame; a small warm pool lies on the ground
  (rotated to the slope). At dawn: warm rim (offset warm copy behind him), long cast shadow, contact shadows.
- **Layers** (parallax k): dusk sky 0.03, far range 0.1, massif + saints 0.25, hills 0.5, ground 1.0 (sprite at 1.2 px
  per world px). Storm strata, curtains and lightning 0.06–0.12. Dawn vista referenced to the summit camera `CAM_S`:
  sky 0.03, sun/rays 0.05, far range 0.08, puffy clouds 0.04, sea of clouds 0.12, hills + summit saints 0.3.
- **Rain**: three tiles of tapered textured strokes (`mtn_rain0..2`), drawn at half resolution into one scratch
  canvas; the quiet zones (two stepped rings around him, the subtitle band) are erased there; one upscaled blit.
- Flowers: bloomed flowers are cached sprites (pre-built in `init`), only blooming ones are drawn procedurally.
- `PROF` (export) has profiling marks and feature-skip switches (off by default, no effect on output); `DBG` gives
  tools read access to internals.

## Measured cost (final, v5)
Scene `draw()` only (median of 2 incl. `getImageData` flush), headless Chromium + SwiftShader, every 0.2 s over
41.8–54.9, load average 5.6–6.2 on 4 cores (`../work/mtn_tools/perf.mjs 0.2`):
- **median 72 ms, p90 135 ms, max 169 ms** (51.0, the storm parting: dusk + dawn backgrounds cross-fading under split banks).
- Opening 35–73 ms; walk + pour 34–65 ms; storm 94–144 ms; summit 52–86 ms; outro ≤ 86 ms; flat handoff frames 1 ms.
- Determinism: forward pass vs reverse pass on a fresh page, 66 times hashed, **0 differences**.
- First-use spikes removed: `init()` pre-builds all sprites (incl. bloomed-flower sprites) and pre-draws 9 frames.
- Cost savers: rain at half resolution in one scratch canvas, cached bloomed flowers, merged storm darkening + mist fill,
  dusk sky sprite replaced by its mean colour when the storm fill hides it (≥ 85 %), lit cloud variants only on 2 banks.
- `render.mjs --workers=2`: 0.78–0.86 s/frame wall (mostly post, readback, encode); full clip 393 frames ≈ 5 min.
- Motion energy (mean |Δ| per frame, 270×480 grey, v5): walk 0.5–2.7, storm 3.4–3.9 (rain), lightning pulse peak 8.4
  (one soft pulse), parting 5.8–6.5 (incl. rain), summit hold 0.3, outro bloom peak 16 (the 0.4 s handoff).

## Where I disagree with (or could not literally follow) a critique point, and why
- **Set-down bend "lean ≤ 0.2"** (art #8): with this rig the arm reaches only 0.32 S from the shoulder, so a surface
  low enough not to read as a tombstone/altar (≈0.45 S) needs a hip hinge of ~0.48 rad. I kept the knees nearly
  straight (hip drops only 0.022 S), so it reads as a bow, not the old "invisible chair" squat.
- **Boulder "h ≈ 0.22 S, separate flat rock"** (meaning #4): same reach constraint; instead the lamp is set on a rock
  step that is part of the summit itself (mountain colour, top continues as the right flank), which removes both the
  gravestone read and the "lump" during the storm.
- **Sigh "starts as an exhale wisp from the mouth"** (art #16) vs **"no mouth puffs"** (meaning #6): I followed the
  meaning critic — anything leaving his mouth says "he sighs", the opposite of *nazlanmıyorlar*. The wisps come from the
  storm behind his head instead.
- **Grass sway in the wind** (art #10): grass exists only at the foot of the path, which is off-screen during the
  storm; the wind is carried by the flame lean, the bundle swing, rain slant, curtains and the gust strokes.
- **Flowers above y 1270** (meaning #12): during the walk they stay above it (camera `sy` lowered 47.6–51); at the
  summit the trail of flowers behind him necessarily runs down-left into the band at x < ~250. They are the visual
  memory of *hoş görüyorlar*, so I kept them; the gloss is centred and the rim strokes there are thin and broken.
- **Rays at 0.18 outside / 0.05 inside the box** (meaning #13): a hard box clip made the zone's rectangle visible in
  the sky. Instead the rays are strong (0.17) only during the break-through 51.0–51.6 and then uniformly faint (0.05)
  everywhere, plus the shaft on him.

## Known weaknesses / ideas
- The storm strata are stylised lobed bands; good at phone size, but their lobes are more regular than hand-painted
  clouds.
- The tiny saints read as lamps + silhouettes at phone size; the figures only read at full resolution.
- The du'a palms are a profile mitten shape (rig limitation); two hands read, palms-up is suggested by angle only.
- The summit crest's front face is fairly geometric in the establishing shot (far right, small).
