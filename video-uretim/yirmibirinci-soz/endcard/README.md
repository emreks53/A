# Source card plate ("endcard") — Qur'an + Risale-i Nur Külliyatı, photoreal

A Blender Cycles still that is meant to read as a photograph: the pearl-white Qur'an on a small walnut stand on a
wall shelf (highest thing in the picture, nothing on or above it) and, below it, the 14 volumes of the Risale-i Nur
Külliyatı (very pale, faded-red leather leaning to light brown, pebble grain) standing upright in one hand-arranged
row on a walnut console, spines to the camera, canonical order left → right (Sözler … Muhâkemat). **Sözler** — the
source of the quote — is pulled 40 mm out of the row and carries its own warm accent light. The lower third is the
calm, dark, straight-grained walnut of the console's upper drawer front, for the four lines of source text
(`Risale-i Nur / Sözler / Yirmi Birinci Söz / 291. Sayfa`).

Everything is procedural (`build_scene.py`: bpy + numpy + pillow) except five CC0 Poly Haven assets
(`assets/LICENSES.txt`).

```
python3 build_scene.py --res 1350x2400 --samples 192 --time-limit 1700 --out plates/   # the delivered plates
python3 build_scene.py --res 540x960 --samples 48 --out /tmp/look/                     # quick look-dev (~1 min)
python3 build_scene.py --res 1350x2400 --samples 64 --crop 0.14,0.36,0.62,0.68 --out /tmp/crop/   # 100 % crop
python3 build_scene.py --report-only                # print the frame positions, no render
python3 build_scene.py ... --set leather=#B89181 --set accent_power=70 --set cam_yaw=0.4   # any look-dev key (dict C)
python3 recombine.py --w fill=1,key=1,accent=0,quran=0 --out base.png                  # relight (numpy only)
python3 finish.py in.png out.png --frame 12 --size 1080x1920                           # camera finishing (grain ...)
```
`--regen` rebuilds the cached procedural textures in `assets/gen/` (they are also rebuilt automatically when a key
they depend on changes); at most 3 render threads are used.

## Plates (`plates/`, all pixel-aligned, 1350 × 2400 = 1.25 × the 1080 × 1920 frame)

| file | what |
|---|---|
| `beauty.png` | final still, 16-bit sRGB PNG, OIDN-denoised, **clean** (no grain / vignette). Exactly `VIEW(fill + key + accent + quran)` |
| `preview_1080.jpg` | Lanczos downscale of the beauty to 1080 × 1920 (clean) |
| `preview_1080_finished.jpg` | the same frame through `finish.py` (frame 0): how it should look in the film |
| `state_base.png` | `VIEW(fill + key)` — the same photograph with the accent and the Qur'an light switched off (16-bit) |
| `light_fill.png` | (a) ambient / fill only: interior HDRI + large bounce on the camera-left + low card on the console front + two small reflectors (wall shadow, Sözler's board); through the same view transform, 16-bit |
| `light_key.png` | (b) key only: tall soft strip, camera-right and above, plus its low specular kicker strip (a reflection card) |
| `light_accent.png` | (c) warm soft accent spot on the Sözler volume only (light-linked to that book) |
| `light_quran.png` | (d) warm soft light on the Qur'an only (light-linked to the Qur'an and its stand: nothing on the wall) |
| `linear/light_{fill,key,accent,quran}.exr` | the same four passes, **scene-linear Rec.709**, 16-bit half-float EXR |
| `linear/light_*_lin16.png` | the same linear data as 16-bit PNG: `linear = code / 65535 * 8` |
| `linear/beauty.exr` | sum of the four linear passes (half float) |
| `linear/view_lut.npy` | the view transform as a 97³ RGB LUT (float32, shape 97,97,97,3) — see below |
| `depth.png` | 16-bit gray, normalised camera distance: 0 = 1.982 m, 65535 = 2.670 m, linear in between (Cycles mist pass: anti-aliased, includes the depth of field) |
| `mask_sozler.png` | 16-bit gray coverage mask of the whole Sözler volume (anti-aliased; sampled with the beauty) |
| `mask_quran.png`, `mask_books.png` | bonus masks: the Qur'an; all 14 Risale volumes |
| `plate_meta.json` | camera, all positions, view settings, render statistics, the full look-dev config |

The four light passes are Cycles **light groups** of one single render (same samples, same camera rays), each
denoised separately with OpenImageDenoise (albedo + normal guides); the beauty is *defined* as their sum, so the
recombination below is exact, not approximate. (Internally seven groups are rendered; the bounce, the two small
reflectors and the console card are added to `fill`, the specular kicker to `key`.)

## View transform

`VIEW` = Blender **AgX**, look "AgX - High Contrast", exposure 0, sRGB display, followed by a small display-referred
"print" finishing step: white-point lift ×1.245 in display-linear with a soft tanh shoulder above 0.85
(`print_grade()` in `build_scene.py`). Because the whole chain is a per-pixel colour function it is baked into
`linear/view_lut.npy` and every PNG in `plates/` went through exactly this chain. (Unchanged since the first version.)

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
reader — identical data; prefer the EXRs for weights above 1: a few gold glints in the key pass reach 8.0).
`apply_view` is the trilinear LUT lookup described above. Measured on the delivered plate: `recombine.py` with all
weights 1 reproduces `beauty.png` to 0.07 8-bit levels on average (99.9 % of the pixels within 0.39, worst
pixel 2.8); `VIEW(fill + key)` equals `state_base.png` (mean 0.06, worst 2.9); each display `light_*.png`
equals `VIEW(linear pass)` (max 4.1); the EXRs equal the lin16 PNGs (relative error ≤ 1.3e-3, half-float
precision) and `beauty.exr` equals their sum (≤ 1e-3 relative). No fireflies; 0.020 % of the plate's pixels are ≥ 254,
all of them small specular glints on the Qur'an (gold foil, edges of the embossing).

Useful weights:

| pass | weight 1 does | range |
|---|---|---|
| `accent` | Sözler mid-spine L* 71.5 → 76.2 (**+4.7 L\***, warm; chroma stays ≈ 20); 91 % of its energy is inside `mask_sozler` | 0 → 1.0. Keep ≤ 1.0: Sözler's title contrast is 1.93 : 1 at 0, 1.84 at 0.5, 1.77 at 1.0, 1.75 at 1.2 (the cream foil is near display white, so every extra bit of light on the leather costs title contrast) |
| `quran` | Qur'an cover L* 89.2 – 92.9 → 92.7 – 95.3 (**+2.4 … 3.5 L\***) and the gilt lights up; the wall does not change at all; 98 % of its energy is on the Qur'an, the rest on its stand | 0 → 1.3 |
| `key` | time of day / contrast | 0.8 – 1.15 (at 1.15 the wall beside the row reaches the film's primer, L* 91.6, and the Qur'an cover 96) |
| `fill` | shadow depth (0.7: the row's shadow on the wall falls from L* 67 to 57; 1.3: 74) | 0.7 – 1.3 |

Animate the weights in linear light and view-transform every frame, or — cheaper — cross-fade in 2D between a few
pre-baked states (`state_base.png` → `beauty.png`); a cross-fade of display-referred states is visually very close for
changes this small. Do **not** add the display-referred `light_*.png` files to each other: `VIEW(a) + VIEW(b) ≠ VIEW(a + b)`.

## Positions in the 1080 × 1920 delivery frame (px; multiply by 1.25 for the 1350 × 2400 plates)

Verified against the rendered masks (all within 1 px). They moved by at most 1 px against the previous version.

| thing | position |
|---|---|
| Qur'an medallion (şemse) centre, gold "Kur’an" | **x 540, y 386  (y = 20.1 %)** |
| Qur'an (book) bounding box | x 412 … 685, y 222 … 562 (top at 11.6 %) |
| Qur'an stand (ledge + apron) | x 410 … 698, y 543 … 607 |
| wall shelf (front face + top) | x 136 … 938, y 594 … 650 (front face centred on x 543, whole silhouette on x 537: they straddle the centre line) |
| cream wall between shelf and book tops | y 650 … 739 (≈ 88 px) |
| row of 14 volumes, bounding box | x **184 … 896, y 739 … 1232**, centre x 540 |
| Sözler spine bounding box | x **203 … 289, y 776 … 1232** |
| Sözler whole volume (incl. visible left cover and top) | x 184 … 290, y 745 … 1232 |
| console top, front arris (thin highlight line) | y ≈ 1266.5 at the left border, 1265.7 at x 540, 1264.8 at the right border (slope 0.09°: level) |
| console top slab (22 mm edge) | y ≈ 1266 … 1308 |
| shadow gap under the slab | y ≈ 1308 … 1310 (3 mm, dark line) |
| upper drawer front (plain, straight-grained) | y ≈ 1310 … 1706 |
| shadow gap between the drawer fronts | y ≈ 1706 … 1712 (1707.3 → 1704.9 across the frame; inside the Shorts bottom 14 %) |
| **text block** (calm dark walnut, Shorts-safe) | **x 140 … 940, y 1328 … 1650** (centre x = 540) |

Medallion, row and text block share the centre line x = 540; the shelf is centred on it to ± 3 px. Spine boxes of
all volumes (x0, y0, x1, y1) are in `plate_meta.json → positions_1080x1920.spines`.

**Text on the walnut (hand-over).** Set the four lines in **ivory `#F3EAD7`**, never dark: inside the text block the
drawer front measures sRGB ≈ #714C30 at y 1340, #6B472B at y 1490, #553823 at y 1640 (and #472E1C at y 1745), slightly lighter
on the right (#724C30) than on the left (#664226) — the soft sheen sweep. Ivory gives 6.3 : 1 at the top of the block
rising to 8.9 : 1 at the bottom; a very soft dark shadow (radius ≈ 12 px, 25 – 45 %) is enough, no box. Row-mean
luminance varies by 2.6 levels (σ, after removing the gradient; the strongest streak is 7 levels at y 1559):
no streak competes with a text line. Keep the block strictly inside **y 1328 … 1650** (above it are the bright slab
edge and the shadow gap, below it the Shorts bottom 14 % and the drawer gap at y 1706): e.g. 54 / 80 / 54 / 44 px with
1.3 leading, centred on x 540. The console edge and the drawer gap are now level to 0.09° (1.7 px and 2.4 px across the
whole frame), so they no longer run against the level baselines; keeping the last baseline ≥ 50 px above the drawer
gap is still good practice. Nothing important is within 6 % of the frame edges; the right-hand 12 % of the lower half
and the bottom 14 % are empty walnut.

**Push-in.** The plate is 1.25 × the frame, but keep the move small: **1.00 → 1.04** anchored on the console edge
(540, 1266) keeps the Qur'an's top at ≥ 9.4 % (a 1.10 push would take it to 6 %, under the platform's top UI).

**Hand-over from the film.** The lit wall is the film's primer cream at a lower value with a light shape (see below):
dissolve from the film rather than hard-cut, and/or start with `apply_view(lin, ev=+0.5)` (the wall beside the row is
then #F7F0E1) and ease to 0 over ≈ 12 frames.

## Finishing in comp (`finish.py`) — required

The plates are clean on purpose (wall high-pass noise σ < 1 / 255). A frozen noise-free still in a 30 fps video
reads as CG, and the smooth cream wall would band in 8-bit H.264. Finish every output frame at 1080 × 1920
(after relight / cross-fade / push-in) with `finish.py` (numpy + pillow, ≈ 1 s per frame) or an equivalent chain:

1. lens softening: gaussian σ 0.6 px (in display-linear)
2. lateral chromatic aberration 0.15 % (red × 1.00075, blue × 0.99925 about the centre). The channels are
   **edge-padded** before the resampling: the previous version let PIL fill the uncovered border with 0, which drew a
   1-px yellow line on the first and last row of every finished frame. `finish()` now asserts (`check_edges`) that
   rows / columns 0 and N−1 stay within 3 levels of their neighbours (measured: 0.9 levels).
3. halation / bloom: values above 0.9 glow, σ 12 px, 4 %, slightly warm
4. vignette −0.25 EV in the corners (r^2.2)
5. grain, **new seed every frame**: luminance σ 1.3 / 255 in the mid-tones (1.6 shadows, 0.6 highlights), ≈ 1.3 px
   clumps, chroma 0.4 / 255.

`plates/preview_1080_finished.jpg` is frame 0 of that chain.

## Camera, light, design notes

* **Camera:** 80 mm on a 36 × 20.25 mm (portrait full-frame) sensor, **f/11**, 9 blades, focal plane at 2.30 m,
  between the Sözler spine (2.25 m) and the Qur'an's cover (≈ 2.38 m): both stay under 1 px of blur on the plate.
  It stands 8° to the left of the row's normal, 0.47 m above the console top, but is turned only 0.4° (was 1.5°) and
  pitched 3°: the off-axis view comes from lens shift (view-camera style), so verticals are parallel and the console
  edge and drawer gap are level to 0.09°. Because the camera is off-axis, the Qur'an (+10.7 mm) and the shelf (+5.4 mm)
  are slid sideways so that medallion, shelf and row share the frame's centre line.
* **Light** (short lighting; key + kicker, fill, 2 effect lights):
  `key` = 0.56 × 1.85 m soft strip, 2.4 m away, 48° to the camera-**right**, 32° up, near-neutral (1.0, 0.95, 0.86):
  every rounded spine gets a form shadow on its left; cast shadows fall to the left. A low, narrow **specular kicker**
  strip (0.25 × 1.6 m, 50° right, 5° up, in the key group; a pure reflection card, invisible to diffuse shading, so no
  second set of shadows) draws the highlight line down the right shoulder of every spine. Şuâlar, across the spine:
  L* 31 → 53 → 66 → 70 → 72 → 74 → 77 → 80 → 49 (left shoulder → right shoulder; the highlight is +9 L* over the centre). The key is now clearly the stronger light on the spine faces: **key : fill = 1.56 : 1** at the centre
  of the Şuâlar spine (was 1.06 : 1), so the grain and the blocked titles are modelled, and the row falls off
  naturally from the key's end to the far end.
  The key is "flagged": its rays are dimmed by where they land on the console front (lower third falls off) and by
  where they land on the wall (wall L* 89.7 beside the row, 85.5 beside the Qur'an, 82.3 at the top centre).
  `fill` = Poly Haven interior HDRI (desaturated, window on the key side) + a 1.2 × 1.6 m white bounce 25° to the
  camera-left (was 15°, and 13 % weaker) + a low card in front of the console that puts a soft sheen sweep on the
  walnut front (linked to the console only) + two small reflectors on the far left: one opens the row's shadow on
  the wall (L* 67.4, was a murky 61; linked to the wall only, so it adds no fill to the spines), one stands square
  to Sözler's left board, behind the plane of its spine (linked to that volume).
  `accent` = 7° warm (3800 K) spot raking Sözler from the front right; `quran` = 9° warm (4300 K) spot from the
  front, above and right, no wider than the book, light-linked to the **Qur'an and its stand only**: the wall keeps
  the key's single soft shadow (no pool of light, no second harder shadow).
* **White balance / wall:** the cream is in the paint (albedo #E5DCBD), not in the light. The lit wall is the film's
  primer cream at a lower value with a light shape: #EAE1CF (L* 89.7) beside the row, #DFD5C1 (85.5) beside
  the Qur'an, #D6CCB7 (82.3) at the top centre, against the primer's #EFE4CF = L* 91, hue 89°, chroma 11.6: same
  hue and chroma, 0.2 – 0.6 EV lower.
* **Books:** spine height 240 mm (± 0.4 %), cover depth 165 mm, thickness = `KALINLIK` × 240 mm (`ortak.ts`), rounded
  spines (roundness ± 12 %) with a raised head/tail cap, double raised bands, hinge groove, the blind lace strip of
  `menba-cizim.ts` (teardrop + arrow, pointing to the title; pressed 0.4 mm and burnished darker / browner) and the title
  in EB Garamond 600 with the app's metrics. The title is **blocked**: pressed 0.30 mm into the leather with a crisp
  0.07 mm shoulder (the key draws a dark edge on one side of every letter and a light one on the other) and a shallow
  pillow, cream pigment foil (#FFF7EE, its own smoother gloss, no sheen) that breaks on ≈ 3 % of the deepest grain
  valleys, a heat-darkened rim ≈ 0.3 mm wide hard against the die (45 % towards #8A5F4B) and a faint 1 mm halo.
  Font size by the app's rule `min(cap, length/em, k·thickness/0.9)` with cap 13.5 mm and **k = 0.62** (app: 0.5), so
  the thin volumes went from 8.2 – 10 mm to 10.2 – 12.4 mm em (x-height ≈ 7.5 px in the 1080 frame); nine volumes sit
  at the 13.5 mm cap. Title / leather contrast 1.79 – 2.05 : 1 (Sözler under its accent 1.77 : 1).
  The row is hand-arranged (table `ARRANGE`): depths ± 4 mm (Barla Lâhikası and Asâ-yı Mûsâ pushed 6 mm back), yaw
  ± 0.5°, gaps 0.2 – 1.5 mm, five volumes lean 0.2 – 0.4° onto a neighbour, Muhâkemat 1.05°; three volumes have a
  knocked (softened) head corner; Mektubat and Asâ-yı Mûsâ are more burnished with slightly softer caps. Volumes are
  packed by a contact solver so that neighbours touch but never intersect.
* **Leather:** albedo **#B89181** (L* 63.5, C* 18.6, h 49°; was #BF8F7B, C* 23.5) with a per-volume jitter (value
  ± 5.5 % or set by hand, hue ± 1.5°, saturation ± 5 %, top-coat roughness ± 0.05); pebble grain (Poly Haven "Leather
  Red 02" height map at a 0.11 m tile ≈ 2 mm cells, 0.20 mm on the spines, 0.30 mm on the boards) + fine pores
  ("Leather White"), crests polished / valleys matt and slightly darker, soft dye mottling whose darker clouds lean to
  tan, handling patina on the head of the spine and the shoulders, lighter wear on the band crests, aniline top coat
  (coat 0.34 / roughness 0.17 ± 0.05) and a trace of fibre sheen (0.05).
  New: (1) recesses, joints and the gaps between the volumes lean to **tan-brown** (#967863) by up to 65 %, driven by
  ambient occlusion (32 mm); (2) light that has bounced diffusely off the leather is 70 % desaturated (the directly
  seen colour is untouched), so neighbouring spines no longer dye each other's shadow side salmon; (3) the tooling
  and the title rim use a burnt brown (#8A5F4B) instead of a more saturated red; (4) coat and specular fall off at
  grazing angles (the grain masks its own gloss), so the board of Sözler, seen at 82°, keeps the leather's colour.
  **Measured** (1080 frame, centre 30 % of the Şuâlar spine): lit mid-tone **#CFA691 = L* 71.3, C* 20.3, h 54°** at y 880 – 930 and #CB9F89 = L* 69.0, C* 22.1, h 54°
  at y 1120 – 1170 (target #CEA692 / #C89C86; window L* 71 – 72, C* 19 – 21, h 53 – 55); the shadow shoulders
  (book pixels at L* 44 – 50) average **#94644B = L* 47.0, C* 27.7, h 54°** (target #976548; before #A65D3C = C* 41), and all book pixels at
  L* 35 – 62 have a median C* of 26.9 at h 53.8° (before 34.4 at 50.7°): the shadows are now browner and *less*
  saturated than they were, not redder. The 14 volumes lie within L* 70.8 – 74.1 (Sözler under its accent #DAAF9A, L* 74.8),
  C* 17.7 – 20.5, h 50 – 56°. Sözler's visible left board: #AF846B = L* 58.6, C* 23.9, h 57° at y 820 – 1000, #A1745C at y 1000 – 1180 (was a grey #917358).
* **Qur'an:** 134 × 190 × 34 mm, pearl-white, single gilt frame (app width × 1.6 ≈ 3 px in the 1080 frame), same-tone
  embossed scalloped şemse (0.8 mm relief) with two salbeks, gilt hairline round the şemse, pressed vesica with the
  app's small gold Latin **"Kur’an"** inside it (EB Garamond 600, 8.6 units ≈ 10.7 mm), two pairs of gilt bands across
  the spine (all as in `kuran-cizim.ts`). No Arabic lettering anywhere. New: the gilt is a real **gold foil** (metal,
  linear base colour (1.0, 0.69, 0.12) — deliberately more saturated than gold's (1.0, 0.77, 0.34), which AgX renders
  as pale cream when it mirrors a bright card —, roughness 0.19 ± 0.06 in ≈ 1 mm patches, 0.02 mm crackle); the front
  board has a 2.4 mm pillow (padded board, bump only), so every part of the frame mirrors a slightly different part
  of the room: the bars run from #BB9123 to #F3CE8E (median #D5AB4E, hue 84°; was a flat #DA9931). The cover has
  a fine grain (0.075 mm, 0.07 m tile, roughness 0.42 ± 0.05) and a breath of shading from the pillow; the page block
  is gilt with leaf lines and a 2.5 mm square (a hair of gold shows at the fore-edge), has a rounded back and head /
  tail bands. The stand now carries the whole book (it is centred on the book's full width and a little wider), so the
  tail of the spine rests on wood instead of showing its underside. Cover L* 92.7 – 95.3 against a wall at L* 85.5 on
  its right and 68.6 (its own single soft shadow) on its left.
* **Furniture:** walnut veneer (Poly Haven "Walnut Veneer 02", 4k diffuse + roughness + normal map), planar-mapped so
  that the grain runs left–right on the top, the edge and the fronts and the figure continues over the rounded arris;
  the rows of the scan are chosen so that only straight-grained veneer is in the text block. Console: 22 mm top slab
  overhanging 10 mm with a 1.5 mm radius (thin highlight line), 3 mm shadow gap, plain drawer fronts; it stands 3.5 mm
  off the wall. The shelf is 60 mm above the book tops; its end now has its own edge band (grain front → back). The
  console top and the shelf carry handling marks (low-frequency gloss variation along the grain) and sparse fine dust
  on the upward faces; both only show in the sheen. The drawer fronts (text zone) are untouched.
* **Reading direction:** the titles read head → tail (top to bottom), the orientation that makes the app's flat
  stacks (front cover up, title upright) correct; back covers face camera-left. This is a choice (many Turkish
  editions run tail → head): `--set reading=up` flips it.
* **Line breaks:** `SIRT` lists two-line forms for *Kastamonu Lâhikası* and *İman ve Küfür Muvâzeneleri*; on a real
  240 mm spine the single line is larger, so both are set on one line, exactly by the app's rule.

## Render

Cycles 5.3 (bpy module), CPU, 3 threads, 1350 × 2400, 192 samples max with adaptive sampling (noise threshold 0.012,
min 64), light tree, 7 bounces, indirect clamp 8.0, Blackman-Harris 1.5 px; seven light groups + mist + mask AOV in the
same render; OpenImageDenoise per light group in the compositor.
Measured for the delivered plates: **render + denoise 1404 s (23.4 min)**, whole script (textures, build, render,
plates) 1461 s — on the shared 4-core machine; the sampling ran into the `--time-limit 1700` cap (28 min). Noise is
at or below the previous plate's (high-pass σ on the wall 0.7 / 255, on the drawer front 2.5 including its grain).

## What changed in refinement round 2

* `finish.py`: edge-padded chromatic aberration (no yellow line on the first / last row), edge assertion.
* Leather: lower chroma, browner and *less* saturated shadows (AO-driven brown lean, desaturated inter-reflection,
  burnt tooling), slightly wider per-volume variation incl. gloss and burnish.
* Titles: larger on the thin volumes (k 0.5 → 0.62), pressed 0.30 mm with a crisp shoulder and a dark rim, 3 % foil
  break-up, brighter foil; Sözler a shade deeper so its title holds ≥ 1.7 : 1 under the accent.
* Qur'an: light linked to the book only (single shadow on the wall), gold foil instead of ochre ink, padded board,
  cover grain, gilt page block / rounded back / headbands, wider stand under the whole book.
* Sözler's board: gloss falls off at grazing angles, deeper grain, a small reflector; reads as leather.
* Light: key : fill 1.06 → 1.56 : 1 on the spine faces, bounce moved to 25°, wall-only reflector on the row's shadow.
* Camera turned 1.5° → 0.4°: console edge and drawer gap level (0.33° → 0.09°).
* Furniture: shelf end band, handling marks and dust in the sheen of the tops.

## Known weaknesses / deliberate choices

* Sözler's title has the lowest contrast of the row when its accent is at full weight (1.77 : 1 against 1.79 –
  2.05 : 1): a near-white foil on a very light leather cannot exceed ≈ 2 : 1, and the accent brightens the leather
  only. Keep the accent ≤ 1.0.
* The off-axis camera also sees the shelf's left end, so the shelf's front face (centre x 543) and its silhouette
  (centre x 537) cannot both sit on x 540; they are placed symmetrically about it. The stand is centred on the book's
  full width (incl. the spine), i.e. ≈ 8 px to the right of the medallion's axis.
* "CG flags" that keep the plate clean for relighting: the key's fall-offs (console front, wall) are projected
  gradients in the lamp shader; the specular kicker is a reflection card that does not light diffusely; the low card is
  linked to the console, the two small reflectors to the wall / to Sözler, the accent to Sözler, the Qur'an light to
  the Qur'an and its stand. Diffuse inter-reflection of the leather and of the wall paint is partly desaturated
  (70 % / 55 %); the directly visible colours are not affected.
* The view transform is AgX plus a custom display-referred white-point lift (baked into the LUT), not a stock Blender
  look. LUT recombination differs from the OCIO-rendered PNGs by ≤ 3.6 8-bit levels in a few saturated dark pixels.
* `depth.png` and the masks come from the same depth-of-field render, so their edges carry the (small) lens blur.
  Depth is camera distance, not planar z.
* Hairline scratches on the console top were not added: at this camera angle (11° above the top) a 0.1 mm scratch is
  0.01 px tall; the handling marks and dust are what a camera would resolve.
* The Qur'an's pillow, the leather grain and the title blocking are bump maps, not displaced geometry.
* There is no publisher mark, volume ornament or cover decoration (the app design has none); the Risale volumes'
  fore-edges and headbands are modelled but hidden from this camera.
* Reading direction of the spine titles (head → tail) is a choice (see above); one flag flips it.
