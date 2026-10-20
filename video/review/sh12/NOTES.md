# sh12 — review round 1 (studio S8)

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

## Known issues / next round (already working on them)
* Land still reads CG in places: meadows too uniform (need grass/shrub/patch texture + micro relief so the
  grazing sun makes texture), mountain flanks too smooth, forest canopy too black/uniform at the edges.
* Sun reflection on the sea is a too-clean vertical bar; will become a broken glitter path.
* Rain curtains under the far clouds are too faint (barely visible) — will be strengthened.
* Veil at the start reads a bit like fog; will add more cloud structure/brightness gradient.
* Render time: final s/frame not yet measured (previews ~45 s at 50 % / 16 spp); will report next round.
