# Source card plate ("endcard") — Qur'an + Risale-i Nur Külliyatı, photoreal

A Blender Cycles still that is meant to read as a photograph: the pearl-white Qur'an on a small walnut stand on a
wall shelf (highest thing in the picture, nothing on or above it) and, below it, the 14 volumes of the Risale-i Nur
Külliyatı (pale faded-red / tan pebble-grain leather) standing upright in one hand-arranged row on a walnut console,
spines to the camera, canonical order left → right (Sözler … Muhâkemat). **Sözler** — the source of the quote — is
pulled 40 mm out of the row and carries its own warm accent light. The lower third is the calm, dark, straight-grained
walnut of the console's upper drawer front, for the four lines of source text
(`Risale-i Nur / Sözler / Yirmi Birinci Söz / 291. Sayfa`).

Everything is procedural (`build_scene.py`: bpy + numpy + pillow) except five CC0 Poly Haven assets
(`assets/LICENSES.txt`).

```
python3 build_scene.py --res 1350x2400 --samples 192 --time-limit 1500 --out plates/   # the delivered plates
python3 build_scene.py --res 540x960 --samples 48 --out /tmp/look/                     # quick look-dev (~1 min)
python3 build_scene.py --res 1350x2400 --samples 64 --crop 0.14,0.36,0.62,0.68 --out /tmp/crop/   # 100 % crop
python3 build_scene.py --report-only                # print the frame positions, no render
python3 build_scene.py ... --set leather=#BF8F7B --set accent_power=60 --set cam_yaw=1.5   # any look-dev key (dict C)
python3 recombine.py --w fill=1,key=1,accent=0,quran=0 --out base.png                  # relight (numpy only)
python3 finish.py in.png out.png --frame 12 --size 1080x1920                           # camera finishing (grain ...)
```
`--regen` rebuilds the cached procedural textures in `assets/gen/`; at most 3 render threads are used.

## Plates (`plates/`, all pixel-aligned, 1350 × 2400 = 1.25 × the 1080 × 1920 frame)

| file | what |
|---|---|
| `beauty.png` | final still, 16-bit sRGB PNG, OIDN-denoised, **clean** (no grain / vignette). Exactly `VIEW(fill + key + accent + quran)` |
| `preview_1080.jpg` | Lanczos downscale of the beauty to 1080 × 1920 (clean) |
| `preview_1080_finished.jpg` | the same frame through `finish.py` (frame 0): how it should look in the film |
| `state_base.png` | `VIEW(fill + key)` — the same photograph with the accent and the Qur'an light switched off (16-bit) |
| `light_fill.png` | (a) ambient / fill only: interior HDRI + large frontal bounce + low card on the console front; through the same view transform, 16-bit |
| `light_key.png` | (b) key only: tall soft strip, camera-right and above, plus its low specular kicker strip (a reflection card) |
| `light_accent.png` | (c) warm soft accent spot on the Sözler volume only (light-linked to that book) |
| `light_quran.png` | (d) warm soft light on the Qur'an only (linked to Qur'an, stand, shelf, wall behind) |
| `linear/light_{fill,key,accent,quran}.exr` | the same four passes, **scene-linear Rec.709**, 16-bit half-float EXR |
| `linear/light_*_lin16.png` | the same linear data as 16-bit PNG: `linear = code / 65535 * 8` |
| `linear/beauty.exr` | sum of the four linear passes (half float) |
| `linear/view_lut.npy` | the view transform as a 97³ RGB LUT (float32, shape 97,97,97,3) — see below |
| `depth.png` | 16-bit gray, normalised camera distance: 0 = 1.977 m, 65535 = 2.664 m, linear in between (Cycles mist pass: anti-aliased, includes the depth of field) |
| `mask_sozler.png` | 16-bit gray coverage mask of the whole Sözler volume (anti-aliased; sampled with the beauty) |
| `mask_quran.png`, `mask_books.png` | bonus masks: the Qur'an; all 14 Risale volumes |
| `plate_meta.json` | camera, all positions, view settings, render statistics, the full look-dev config |

The four light passes are Cycles **light groups** of one single render (same samples, same camera rays), each
denoised separately with OpenImageDenoise (albedo + normal guides); the beauty is *defined* as their sum, so the
recombination below is exact, not approximate. (Internally seven groups are rendered; the bounce and the console card
are added to `fill`, the specular kicker to `key`.)

## View transform

`VIEW` = Blender **AgX**, look "AgX - High Contrast", exposure 0, sRGB display, followed by a small display-referred
"print" finishing step: white-point lift ×1.245 in display-linear with a soft tanh shoulder above 0.85
(`print_grade()` in `build_scene.py`). Because the whole chain is a per-pixel colour function it is baked into
`linear/view_lut.npy` and every PNG in `plates/` went through exactly this chain. (Unchanged from the first version.)

LUT addressing (per channel): `idx = log2(L / 2**-14 + 1) / 20 * 96`, `L` = scene-linear value (0 … 64), trilinear
interpolation; LUT values are sRGB-encoded 0 … 1.

## Recombining / relighting in linear light

```python
import numpy as np
from recombine import load_light, apply_view, save_png        # numpy-only helpers next to this README

L = {g: load_light(g) for g in ('fill', 'key', 'accent', 'quran')}   # float32 (2400, 1350, 3), scene-linear
lin = 1.0 * L['fill'] + 1.0 * L['key'] + 1.0 * L['accent'] + 1.0 * L['quran']   # all weights 1  ==  beauty
img = apply_view(lin)                 # uint16 sRGB (2400, 1350, 3); apply_view(lin, ev=-0.3) to change exposure
save_png('relit.png', img)
```
`load_light(g)` is just `read_png('plates/linear/light_<g>_lin16.png') / 65535 * 8` (or read the EXR with any EXR
reader — identical data; prefer the EXRs for weights above 2). `apply_view` is the trilinear LUT lookup described
above. Measured on the delivered plate: `recombine.py` with all weights 1 reproduces `beauty.png` to 0.07 8-bit levels
on average (99.9 % of the pixels within 0.40, worst pixel 1.9); `VIEW(fill + key)` equals `state_base.png` (mean 0.07,
worst 3.1 in a few saturated dark pixels between the volumes); each display `light_*.png` equals `VIEW(linear pass)`
(max 3.5); the EXRs equal the lin16 PNGs (max 1e-3) and `beauty.exr` equals their sum (max 9e-4). No fireflies (the one
isolated bright pixel, at 1080-x 218 / y 821, is a real glint on Sözler's lace tooling), 0.002 % of the pixels ≥ 254.

Useful weights (the wall is 0.3 – 0.7 EV lower than in the first version and the effect lights are stronger, warmer
and better aimed, so both now have a visible effect and head-room):

| pass | weight 1 does | range |
|---|---|---|
| `accent` | Sözler mid-spine L* 71.5 → 76.8 (**+5.3 L\***, warm: chroma stays 24.3); 90 % of its energy is inside `mask_sozler` | 0 → 1.0; keep ≤ 1.2 (above that Sözler bleaches and its title loses contrast: 1.96 : 1 at 0, 1.76 : 1 at 1.0); 1.5 gives ≈ +7.5 L* if a stronger beat is wanted |
| `quran` | Qur'an cover L* 88.7 – 92.1 → 93.4 – 95.4 (**+3 … +5.5 L\***), wall beside it +0.4; 78 % of its energy is on the Qur'an | 0 → 1.3 |
| `key` | time of day / contrast | 0.7 – 1.15 |
| `fill` | shadow depth | 0.7 – 1.5 |

Animate the weights in linear light and view-transform every frame, or — cheaper — cross-fade in 2D between a few
pre-baked states (`state_base.png` → `beauty.png`); a cross-fade of display-referred states is visually very close for
changes this small. Do **not** add the display-referred `light_*.png` files to each other: `VIEW(a) + VIEW(b) ≠ VIEW(a + b)`.

## Positions in the 1080 × 1920 delivery frame (px; multiply by 1.25 for the 1350 × 2400 plates)

Verified against the rendered masks (all within 1 px).

| thing | position |
|---|---|
| Qur'an medallion (şemse) centre, gold "Kur’an" | **x 540, y 386  (y = 20.1 %)** |
| Qur'an (book) bounding box | x 412 … 685, y 222 … 562 (top at 11.6 %) |
| wall shelf (front face + top) | x 137 … 936, y 594 … 651 (front face centred on x 543, whole silhouette on x 536.5: they straddle the centre line) |
| cream wall between shelf and book tops | y 651 … 738 (≈ 85 px) |
| row of 14 volumes, bounding box | x **185 … 895, y 738 … 1233**, centre x 540 |
| Sözler spine bounding box | x **204 … 290, y 776 … 1233** |
| Sözler whole volume (incl. visible left cover and top) | x 185 … 290, y 746 … 1233 |
| console top, front arris (thin highlight line) | y ≈ 1269 at the left border, 1266 at x 540, 1263 at the right border (slope 0.33°) |
| console top slab (22 mm edge) | y ≈ 1266 … 1309 |
| shadow gap under the slab | y ≈ 1309 … 1310 (3 mm, dark line) |
| upper drawer front (plain, straight-grained) | y ≈ 1310 … 1706 |
| shadow gap between the drawer fronts | y ≈ 1706 … 1712 (inside the Shorts bottom 14 %) |
| **suggested text block** (calm dark walnut, Shorts-safe) | **x 140 … 940, y 1328 … 1650** (centre x = 540) |

Medallion, row and text block share the centre line x = 540; the shelf is centred on it to ± 3.5 px (see below). Spine boxes of all volumes
(x0, y0, x1, y1) are in `plate_meta.json → positions_1080x1920.spines`.

**Text on the walnut.** Inside the text block the drawer front measures sRGB ≈ #704C31 at y 1340, #69462D at y 1490,
#543823 at y 1640 (and #482F1D at y 1745); slightly lighter on the right (#6C492F) than on the left (#603F27) — the
soft sheen sweep. Row-mean luminance varies by 2.4 levels (σ, after removing the gradient): no streak crosses a text
line, the scan's dark line and cathedral figure are outside the zone. Ivory `#F3EAD7` gives 6.3 : 1 at the top of the
block rising to 8.9 : 1 at the bottom; a very soft dark shadow (radius ≈ 12 px, 25 %) is enough, no box. Nothing
important is within 6 % of the frame edges; the right-hand 12 % of the lower half and the bottom 14 % are empty walnut.

**Push-in.** The plate is 1.25 × the frame: a slow push-in up to 1.10 × anchored on the console edge (540, 1266) stays
sharper than 1 : 1 (row width 66 % → 72 %, Qur'an top 11.6 % → 6 %, text block and drawer front move down by
10 % of their distance to y 1266). For the stillest, most formal card use 1.00 → 1.03.

## Finishing in comp (`finish.py`) — required

The plates are clean on purpose (wall high-pass noise σ ≈ 0.4 / 255). A frozen noise-free still in a 30 fps video
reads as CG, and the smooth cream wall would band in 8-bit H.264. Finish every output frame at 1080 × 1920
(after relight / cross-fade / push-in) with `finish.py` (numpy + pillow, ≈ 1 s per frame) or an equivalent chain:

1. lens softening: gaussian σ 0.6 px (in display-linear)
2. lateral chromatic aberration 0.15 % (red × 1.00075, blue × 0.99925 about the centre)
3. halation / bloom: values above 0.9 glow, σ 12 px, 4 %, slightly warm
4. vignette −0.25 EV in the corners (r^2.2)
5. grain, **new seed every frame**: luminance σ 1.3 / 255 in the mid-tones (1.6 shadows, 0.6 highlights), ≈ 1.3 px
   clumps, chroma 0.4 / 255. Measured on the result: 0.9 on the wall, 1.5 on the walnut.

`plates/preview_1080_finished.jpg` is frame 0 of that chain.

## Camera, light, design notes

* **Camera:** 80 mm on a 36 × 20.25 mm (portrait full-frame) sensor, **f/11**, 9 blades, focal plane at 2.30 m,
  between the Sözler spine (2.24 m) and the Qur'an's cover (≈ 2.38 m): both stay under 1 px of blur on the plate.
  It stands 8° to the left of the row's normal, 0.47 m above the console top, but is turned only 1.5° and pitched 3°:
  the off-axis view comes from lens shift (view-camera style), so verticals are parallel and the console edge is
  level within 0.33°. Because the camera is off-axis, the Qur'an (+10.9 mm) and the shelf (+5.6 mm) are slid sideways
  so that medallion, shelf and row share the frame's centre line.
* **Light** (short lighting; key + kicker, fill, 2 effect lights):
  `key` = 0.56 × 1.85 m soft strip, 2.4 m away, 48° to the camera-**right**, 32° up, near-neutral (1.0, 0.95, 0.86):
  every rounded spine gets a form shadow on its left; cast shadows fall to the left, so Sözler no longer shades
  Mektubat (71.4 vs. row 69.2 – 72.5). Because the key stands 32° up, its mirror image in the upright spines never
  reaches the camera; a low, narrow **specular kicker** strip (0.25 × 1.6 m, 50° right, 5° up, in the key group; a pure
  reflection card, invisible to diffuse shading, so no second set of shadows) draws the highlight line down the right
  shoulder of every spine. Şuâlar, across the spine: L* 37 → 52 → 66 → 71 → 72 (centre) → 73.6 → 76.8 → **79.3** → edge,
  i.e. the highlight is +7.5 L* (≈ +24 % luminance) over the centre and the left shoulder is in shadow.
  The key is "flagged": its rays are dimmed by where they land on the console front (lower third falls off) and by
  where they land on the wall (wall falls from L* 88 beside the row to 84.6 beside the Qur'an and 79 – 81.6 at the top
  of the frame; 63 in the row's shadow on the left).
  `fill` = Poly Haven interior HDRI (desaturated, window on the key side) + a 1.2 × 1.6 m white bounce next to the
  camera (frontal, so the pulled-out Sözler cannot shade its neighbour) + a low card in front of the console that
  puts a soft sheen sweep on the walnut front (linked to the console only).
  `accent` = 7° warm (3800 K) spot raking Sözler from the front right; `quran` = 9° warm (4300 K) spot from the
  front, above and right, no wider than the book.
* **White balance / wall:** the cream is in the paint (albedo #E5DCBD), not in the light. The lit wall is the film's
  primer cream at a lower value with a light shape: #E7DCC9 (L* 88.2, hue 87°) beside the row, #DDD2BE (84.6, 88°)
  beside the Qur'an, #D1C7B2 (80.5, 90°, chroma 11.8) at the top centre, against the primer's #EFE4CF = L* 91, hue 89°,
  chroma 11.6: same hue and chroma, 0.5 – 0.7 EV lower. It is no longer a flat #EFE4CF (that flatness was what made
  the first version read as CG): dissolve from the film rather than hard-cut, or grade the first frames up with
  `apply_view(lin, ev=0.5)` and ease to 0.
* **Books:** spine height 240 mm (± 0.4 %), cover depth 165 mm, thickness = `KALINLIK` × 240 mm (`ortak.ts`), rounded
  spines (roundness ± 12 %) with a raised head/tail cap, double raised bands, hinge groove, the blind lace strip of
  `menba-cizim.ts` (teardrop + arrow, pointing to the title; pressed 0.4 mm and burnished darker / browner) and the title
  in EB Garamond 600 with the app's metrics. The title is **blocked**: pressed 0.14 mm into the leather with a soft
  shoulder and a shallow pillow, cream pigment foil (#FFF4EA, its own smoother gloss, no sheen) that breaks on ≈ 6 % of
  the deepest grain valleys, slightly ragged edges, a heat-darkened halo. Title / leather contrast 1.94 – 2.09 : 1
  (Sözler under its accent 1.76 : 1).
  Font size by the app's own rule `min(cap, length/em, 0.5·thickness/0.9)` (cap 13.5 mm).
  The row is hand-arranged (table `ARRANGE`): depths ± 4 mm (Barla Lâhikası and Asâ-yı Mûsâ pushed 6 mm back), yaw
  ± 0.5°, gaps 0.2 – 1.5 mm, five volumes lean 0.2 – 0.4° onto a neighbour, Muhâkemat 1.05°; three volumes have a
  knocked (softened) head corner. Volumes are packed by a contact solver so that neighbours touch but never intersect.
* **Leather:** albedo #BF8F7B with a per-volume jitter (value ± 5 %, hue ± 1.5°, saturation ± 6 %); pebble grain
  (Poly Haven "Leather Red 02" height map at a 0.11 m tile ≈ 2 mm cells, 0.20 mm) + fine pores ("Leather White"),
  crests polished / valleys matt and slightly darker, soft dye mottling whose darker clouds lean to tan, handling patina
  on the head of the spine and the shoulders, lighter wear on the band crests, aniline top coat (coat 0.34 / roughness
  0.16) and fibre sheen. **Measured lit mid-tone** (centre 30 % of the Şuâlar spine, x 423 – 445): **#D4A48D = L* 71.2,
  C* 23.7, h 52°** at y 880 – 930 and #CE9A80 = L* 67.9, C* 26.6, h 53° at y 1120 – 1170; all 14 volumes lie within
  L* 69.2 – 72.5, C* 21.7 – 25.1, h 50 – 53° (Sözler with its accent #E5B39B). This is deliberately between the two
  review targets (h 42 – 46° read as baby pink, h 55 – 58° as apricot): a pale faded red with density, whose shadows,
  tooling and patina carry the light-brown lean.
* **Qur'an:** 134 × 190 × 34 mm, pearl-white, single gilt frame (app width × 1.6 ≈ 3 px in the 1080 frame), same-tone
  embossed scalloped şemse (0.8 mm relief) with two salbeks, gilt hairline round the şemse, pressed vesica with the
  app's small gold Latin **"Kur’an"** inside it (EB Garamond 600, 8.6 units ≈ 10.7 mm), two pairs of gilt bands across
  the spine (all as in `kuran-cizim.ts`). No Arabic lettering anywhere. Cover L* 93.4 – 95.4 against a wall at
  L* 84.6 on its right and 66 – 72 (its own soft shadow) on its left.
* **Furniture:** walnut veneer (Poly Haven "Walnut Veneer 02", 4k diffuse + roughness + normal map), planar-mapped so
  that the grain runs left–right on the top, the edge and the fronts and the figure continues over the rounded arris;
  the rows of the scan are chosen so that only straight-grained veneer is in the text block. Console: 22 mm top slab
  overhanging 10 mm with a 1.5 mm radius (thin highlight line), 3 mm shadow gap, plain drawer fronts; it stands 3.5 mm
  off the wall. The shelf is 60 mm above the book tops.
* **Reading direction:** the titles read head → tail (top to bottom), the orientation that makes the app's flat
  stacks (front cover up, title upright) correct. `--set reading=up --regen` flips it.
* **Line breaks:** `SIRT` lists two-line forms for *Kastamonu Lâhikası* and *İman ve Küfür Muvâzeneleri*; on a real
  240 mm spine the single line is ~2× larger, so both are set on one line, exactly by the app's rule.

## Render

Cycles 5.3 (bpy module), CPU, 3 threads, 1350 × 2400, 192 samples max with adaptive sampling (noise threshold 0.012,
min 64), light tree, 7 bounces, indirect clamp 8.0, Blackman-Harris 1.5 px; seven light groups + mist + mask AOV in the
same render; OpenImageDenoise per light group in the compositor.
Measured for the delivered plates: **render + denoise 1629 s (27.2 min)**, whole script (textures, build, render,
plates) 1651 s — on the shared 4-core machine while other jobs kept it at load ≈ 9, so the sampling ran into the
`--time-limit 1500` cap (25 min). The same scene rendered in 1054 s (17.6 min) on the quieter machine an hour earlier.

## What changed in refinement round 1

Key moved to camera-right (short lighting) with a specular kicker, a frontal bounce and a wall gradient; lower base
exposure on the wall and a near-neutral key; leather rebuilt (pebble grain, coat, patina, per-volume variation, new colour); blocked titles and
deeper lace tooling; hand-arranged row with a contact solver; f/11 and a focal plane between row and Qur'an; Qur'an
cover per the app (gold "Kur’an" in the vesica, wider frame, deeper emboss, spine bands), lit from the front right;
console with real construction, 4k veneer + normal map, straight-grained text zone, sheen card; shelf raised 38 mm;
view-camera framing with all centres on x 540; page-block tops with leaf lines; `finish.py`.

## Known weaknesses / deliberate choices

* Leather hue sits between the two review targets (see above); `--set leather=#…` moves it (≈ 1 min look-dev render).
* Titles of the thin volumes are small (8 – 10 mm em, the app's sizing rule): ≈ 6 px x-height in the 1080 frame —
  legible at 100 %, borderline on a phone; the push-in helps. Sözler's title has the lowest contrast of the row
  when its accent is at full weight (1.76 : 1 against 1.94 – 2.09 : 1); keep the accent ≤ 1.0 – 1.2.
* The off-axis camera also sees the shelf's left end, so the shelf's front face (centre x 543) and its silhouette
  (centre x 536.5) cannot both sit on x 540; they are placed symmetrically about it.
* The key's fall-offs (console front, wall) are projected gradients in the lamp shader ("CG flags"), the specular
  kicker is a reflection card that does not light diffusely, the low card is linked to the console and the accent /
  Qur'an lights are light-linked (no spill on neighbours) — clean for relighting, slightly idealised.
* The view transform is AgX plus a custom display-referred white-point lift (baked into the LUT), not a stock Blender
  look. LUT recombination differs from the OCIO-rendered PNGs by ≤ 3.5 8-bit levels in a few saturated dark pixels.
* `depth.png` and the masks come from the same depth-of-field render, so their edges carry the (small) lens blur.
  Depth is camera distance, not planar z.
* There is no publisher mark, volume ornament or cover decoration (the app design has none); fore-edges and headbands
  are modelled but hidden from this camera.
* Reading direction of the spine titles (head → tail) is a choice (see above); one flag flips it.
