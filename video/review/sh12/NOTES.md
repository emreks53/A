# sh12 — review-5 fixes + verification (studio S8)

63.85–74.15 s · render f1526–1785 · "İşte bütün bu ihtiyaçların karşılanması **bir tek** yaratıcının … **ondan başka olamaz**"

## Decisions
* **Sky = real photographed sky.** Procedural volumetric cumulus looked like grey blobs and cost ~70 s/frame
  at 25 % res, so the whole sky is the CC0 Poly Haven HDRI `kloppenheim_06_puresky` (16k in finals, 8k in
  previews): a real golden-hour sky with cumulus and crepuscular rays fanning from a sun just behind a cloud
  edge — "one single source" reads instantly. It is rotated so the sun sits at screen x≈540, y≈600 at the
  settle and shifted down by the 1.33° horizon dip of a 1.7 km altitude so its horizon meets our curved sea.
  A matching sun lamp (4.8°, ~4300 K) lights the land; its specular is reduced because the sun disc in the
  plate is hidden behind cloud.
* **Land** = procedural: 1.5 M-vertex frustum-aligned height field (ridged + derivative-damped
  "erosion" noise, domain warped), a meandering river carved with floodplain/terraces into a bay, coast at
  ~11–15 km, Earth curvature applied to all ground. Forests = ~490 k instanced low-poly conifer/broadleaf
  crowns (geometry nodes) on a slope/height/noise mask; a golden meadow clearing lower right (exit target).
* **Aerial perspective** is computed per shading point (exponential haze optical depth along the view ray);
  the in-scatter colour comes from a per-azimuth LUT built from the HDRI's own 3–7° band, so far land melts
  into exactly the photographed horizon colour.
* **Emergence**: camera-locked cloud veil that thins out unevenly + 16 vapour cards the camera flies through
  (cheap, motion blurred). Cleared by ~64.9 s ("bütün").
* **Move**: emerge → slow forward glide/descent, pitch from -5.5° to -12°, **settled on "bir" (66.48)** with the
  sun upper centre; slow drift through "ispat eder"; from 71.8 s ("ondan"−0.9 s) the camera pitches down
  (-27°), banks slightly right and descends toward the meadow (exit).

## Stills (50 %, preview quality)
| file | t | shows |
|---|---|---|
| sh12_t063.700.png | 63.70 | inside the cloud (first frames) |
| sh12_t064.400.png | 64.40 | breaking out: veil tearing open, sun + sea + valley appear |
| sh12_t065.300.png | 65.30 | clear, still gliding |
| sh12_t066.600.png | 66.60 | **"bir tek"**: settled, sun upper centre, sea, clouds, river, forest separated |
| sh12_t070.000.png | 70.00 | "ispat eder / çünkü": slow drift |
| sh12_t074.400.png | 74.40 | last frame: descending toward the meadow |

Trackers (`sh12.json`): TRK_sun (sun behind the cloud edge), TRK_cloud (big cumulus right), TRK_rain (rain
curtain under it), TRK_sea, TRK_river, TRK_forest — placed on screen at the settle so they are well separated.

## Round 2 changes
* Render time fixed: the aerial-haze Emission made every terrain/tree triangle a light-tree emitter
  (tree rebuilt every frame, 25 s). Emission sampling is now off for those materials; static objects have no
  object motion blur (camera blur unchanged); 8 spp + OIDN, terrain grid 1900×1300.
  **Measured final: ~51 s/frame steady state** in a chunk (1080×1920, 4 cores; frames 1598–1600: 90 s for the
  first frame incl. 16k HDRI importance map, then 50.6 s and 51.6 s). Slightly over the 45 s target; I will
  trim further (tree instance count) if you want it under 45.
* Terrain: finer ridges/gullies on the mountain flanks, mid-scale relief so the grazing sun draws texture,
  lone trees and clumped scrub on the open land (long golden-hour shadows), richer meadow/dry-grass palette,
  forest reaching down to the river banks, irregular river width with pale gravel bars.
* Forest canopy: stronger translucency so backlit crowns glow instead of reading black.
* Sea: wind patches + wave groups break the sun column up a little.
* TRK_sun now sits where the rays converge in the plate (x≈548, y≈598 at the settle).

## Approval fix (commit 7b409ab)
* Straight seam at y≈790–800 through the exit: it was a real 20–40 m terrain step on the medial line between two
  meander loops (valley floor/plain width were driven by the nearest-point parameter T, which jumps there).
  Valley shaping now uses world Y (smooth everywhere); the roughness gate near the banks is a smoothstep instead
  of a hard cut. Meadow: the scan's pale rock/decal patches are clamped so they read as grass.
* Verify: `verify/final100_f1760.jpg`, `verify/final100_f1780.jpg` (100 %, 7 spp min 7; single-frame runs
  131–139 s incl. 16k sky load + sync), `verify/strip50_f1740-1786.jpg` (every frame), settle still
  `sh12_t066.600.png` re-rendered.

## Review-5 fixes (verification in `verify/`)
* Emergence: wisps fade with view distance 40→220 m and share a linear alpha key 63.9→65.1; veil clears
  linearly 63.7→65.1. Lower-half luma f1544–66 is monotonic, max step **9.9/255** (`strip_f1544-1566.jpg`).
* Exit: pitch-down starts 0.25 s before "Çünkü"; flat last-key handles + constant extrapolation — TRK_river moves
  **≤1.4 px/f** over f1776–85; exposure −1.0 @72.4 → +0.2 at the cut; haze 1/27k → 1/38k over the last 1.5 s;
  meadow moved to (560,1750) under the final framing, kept out of cloud shadow, no lone trees inside it,
  green-gold albedo. **f1780: median luma 98, 81 % of the lower frame G≥R** (`final100_f1780.jpg`,
  `strip_f1740-1786.jpg`).
* Near river: bars dark (0.13,0.11,0.08)×aerial_ground_rock, noise-broken, only a few inner bends; water
  (0.025,0.03,0.02), ripple bump 0.4, 1/40 m roughness patches; ±35 % width over 300–600 m; riparian trees
  from the waterline (`crop100_f1601.jpg`).
* Sea: sun specular 0.08, sea Specular 0.2 keyed in 64.75→64.95, 4/m chop bump 0.25.
* Trackers (settle f1598): sea (690,839) open water, forest (839,1007) dense stand (≥25 trees within 80 m),
  river (590,1212) on the centreline; build asserts the sea hit / dense stand.
* Right-peak scree (0.17,0.16,0.14); lone trees −60 % and on drainage lines; forest_c (0.04,0.085,0.03).
* cached_field keyed by the whole sh12.py + lib_s8.py source, atomic write.
* **Final 100 %, 7 spp (min 7) + OIDN:** f1600–02 **76.4 s/f**, f1771–73 **84.6 s/f** (incl. the one-time 16k sky
  load per run); 3-frame 100 % crops `crops100_f1600-1602.jpg`, `crops100_f1771-1773.jpg` — no crawl seen, so
  7 spp everywhere.

## Round 5 (director notes, review 4)
* River rebuilt: meanders with drifting amplitude (200–650 m) and wavelength (1.5–2.8 km — the requested
  0.8–2 km foreshortens into a zigzag from this altitude), a gooseneck loop near Y 4.3 km, a straight reach
  (Y 9–10.5 km), two tributaries, width from fbm(T·40) (2–4x), three islands, gravel only on inner bends (no
  bank band), riparian trees from ~2 m off the water, water roughness 0.04–0.3 by noise, oxbow at Y≈4.6 km.
* Land: meadows green-gold, gold only on knolls; forest_c (0.045,0.075,0.03), lighter deciduous groups; scan
  layer tiles 0.6–5 km; haze 1/27 k; snow removed.
* Cloud light: shadow-only cloud layer (2.6 km) + aerial in-scatter scaled by the same projected mask (darker
  air columns under cloud shadow — the effect that reads when looking into the sun) + mild albedo modulation.
* Trackers re-picked with checks: TRK_sea must hit the Sea object, TRK_river = closest main-river centreline
  point to the wanted pixel, TRK_forest = an actual forest tree; build fails if the sea isn't hit.
* Emergence: cards fade to 0 within 25 m of the lens; veil clears over ~11 frames (64.45→64.92); hotspot moves
  from sh11's sun (724,1076) to TRK_sun.
* Exit: pitch-down starts on "Çünkü" (69.82), yaw −12°, ends on the sunlit green-gold meadow (eased).
* Sea specular 0.3 (bar below clip), denser rain core, final_min_spp 7. Final refuses S8_* overrides.
* **Final, 100 %, 7 spp (min 7) + OIDN:** f1600–1602 **72.6 s/frame**, f1771–1773 **78.5 s/frame** (incl. the
  one-time 16k sky load in each 3-frame run). 100 % crops `final100_f1601_crop.jpg`, `final100_f1772_crop.jpg`:
  no crawl/blotching visible, so 7 spp kept.
* Known: haze at 1/27 k makes the land quite milky at the exit — happy to go back to ~1/40 k if you prefer.

## Round 4 (director recipe)
* Photographic ground: Poly Haven aerial scans `aerial_grass_rock` (55 m and 180 m tilings),
  `aerial_ground_rock` (70/230 m) and `aerial_rocks_04` (260/860 m on rock) modulate the palette, blended by
  macro noise so tiling never shows.
* Sunlit patches vs cloud shadow: real cast shadows from a cloud layer were invisible here (sun 4.8° and in
  front of the camera, so we see the shade sides). Instead the land and tree crowns are modulated by a
  cloud-shadow mask projected along the sun direction from a layer at 2.6 km, drifting ~10 m/s: warm raking
  patches vs cool dim ones, ~40 % in shadow.
* River: width varies 2–4x, darker less mirror-like water, riparian trees to the banks, an oxbow lake.
* Forest crowns greener with lighter deciduous groups; faint surf line on the coast; rain curtain kept.
* **Final measured: ~52 s/frame steady** (f1680–1682: 95.5 s first incl. 16k HDRI load, then 51.8 s, 51.7 s) —
  within the revised 90 s ceiling / ~60 aim.

## Round 3 changes
* **Render time now ~45 s/frame** (7 spp + OIDN; measured f1680–1682 at 1080×1920: 84.6 s first frame incl.
  one-time 16k HDRI importance map, then 44.7 s and 45.4 s). Tree instances trimmed to ~410 k.
* Riparian woodland lines both river banks (shadows fall across the water) — the river no longer reads as a
  road. Pale gravel bars on some bends.
* One clear rain curtain hangs from the big cumulus at right (TRK_rain); the faint left ones were removed.
* Mountain flanks: scrub patches, scree fans and darker gullies so the shadowed faces have texture.
* Fixed a transparency-depth bug that showed rectangular card edges in the cloud emergence (round-2 stills).

## Known issues / next round (already working on them)
* Land still reads CG in places: meadows too uniform (need grass/shrub/patch texture + micro relief so the
  grazing sun makes texture), mountain flanks too smooth, forest canopy too black/uniform at the edges.
* Sun reflection on the sea is a too-clean vertical bar; will become a broken glitter path.
* Veil at the start reads a bit like fog; will add more cloud structure/brightness gradient.
