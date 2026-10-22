# fix-sh15: no cross shapes anywhere in sh15

The fix is two code commits on `render-fix-sh15`: `a42901e` and then `c5857be` (verifier round 1).
The farm renders `c5857be`. The design sheets are now v17; the farm generates them on first use, in about 4 min.

## What changed (video/blender/shots/sh15.py only)

**Window (kafes)**
- One row of vertical louvre slats (2.8 x 2.8 cm, 5 cm pitch) inside the plain rectangular frame. The diagonal lattice and the mid rail are gone, so nothing crosses inside the opening.
- The sun on the table, cover, rahle and pages is now parallel stripes.
- The `beam_mask` node group and `beam_static_np` use the same geometry.
- The slat phase (`KAFES_PH = 0.016`) puts a light stripe on the "721" page number at camB.

**Roller shutter**
- The slits are closed and the boards are flat and flush. While the shutter is down, no light lines or highlight bands show through the slats.

**Light shafts**
- The shaft-card mask is blurred over 3 cm instead of 1.2 cm.
- Behind vertical slats the shafts became sheets of light whose bands crossed the window slats and the jamb in camE. At 3 cm they average into one soft beam.

**Ornaments (design v17)**
- Semse medallion: now a vertical row only (leaf, ring-and-dot boss, leaf), plus the oval ring and the top and bottom pendants. The side discs and the rosette are gone.
- Every rosette is now five broad petals, used for the spine fleurons. An odd count has no opposite petals, so it reads as a blossom, not an asterisk.
- Title flourishes: the upper and lower curls leave the rule at different points, so there is no four-way junction.
- Page body: the footnote "*" is removed, and the alif strokes start on the baseline instead of crossing it. The body is pre-blurred anyway.
- Rahle carving: a vine scroll (one undulating stem, tendrils branching at Y junctions, leaves on the crests). It replaces the 8-point star strapwork and the 4-point stars at its nodes.

**Rahle**
- Approved by the director. The V book rest (upper boards, book, page and cameras) is unchanged.
- The crossed lower legs are removed. The V stands on two carved walnut end frames with a pointed-arch opening, so it reads as a V on a block (a Y) in camA's side view and in camE.

## Ornament audit (every ornament the script draws)

| Ornament | Result |
|---|---|
| Cover border | Nested rectangles (L corners) and a chain of lozenges along the band |
| Corner fans | Five petals in a quarter circle, plus an arc with dots |
| Title and author flourishes | Fixed (curls staggered) |
| Semse | Fixed |
| Plain covers | Same semse |
| Spines | Roll rules, lozenge rolls, hub rules with dotted crests, panel frames (L corners), titles, 5-petal blossoms (fixed) |
| Page running head | Title, number and one rule |
| Page body and Arabic lines | Fixed, and pre-blurred |
| Headband | Parallel bands |
| Rahle carving | Fixed (vine scroll) |
| Rahle silhouette | Fixed (V on end frames) |

No four-arm, '+', 'X' or crossing-stroke figure is left.

## Evidence (before | after; full-res crops unless noted)

| File | Shows |
|---|---|
| `strip_before.jpg`, `strip_after.jpg` | 2640-3008 every 8 frames at phone size. "After" is 40% res, 8 spp. |
| `crop_2690_table.jpg` | Lattice grid on the table becomes parallel stripes |
| `crop_2700_medallion.jpg` | Four discs around a rosette become a vertical row |
| `crop_2724_page.jpg`, `crop_2760_page.jpg` | Page in camB; "721" sits in a stripe |
| `crop_2790_spines.jpg` | 8-point stars become 5-petal blossoms |
| `crop_2636_window.jpg` | Lattice and shutter slits become plain vertical slats on a dark shutter |
| `phone_2900_camE.jpg` | Window, shafts and rahle at phone size |

## Unchanged

- Camera plan and cut frames: 2722, 2778, 2814, 2879.
- Shutter and beam timing: the beam reaches the cover around 2680, as before.
- The 24-spp hold 2687-2721, the key-word band logic, typography, exposure keys, and the TRK_ empties (no track export needed).
- Mean brightness shifts slightly with the new light pattern: cover hold +9 to +12%, camB about -5%, camE about -1%.

## Determinism

- A run started at 2759 and one started at 2760 differ at 2760 and 2761 by at most 13-36 out of 65535 (16-bit). The verifier also tested a start at 2659 against 2660: at most 40 out of 65535.
- Both are below one 8-bit step, and the same spread appears between two runs started on the same frame (denoiser).
- All new geometry is static or seeded.
- Do not set the `SH15_KPH` environment variable on the farm.

## Cost (4 cores, full quality, per frame)

| Shot | New | Old |
|---|---|---|
| camA, 10 spp | 75-89 s (2636: 74.9, 2650: 89.4, 2679-2681: 81.9) | 2650: 84.6 |
| 24-spp hold | 166 s | 169.6 s |
| camB | 51.6 s | 47.7 s |
| camC | 45.6 s | |
| camD | about 49 s | |
| camE | 43-52 s | |

## Independent verification (subagent, 2 rounds)

**Round 1** (on `a42901e`):
- Defects named in the issue: gone.
- Determinism: PASS.
- Cost: PASS.
- Found two new cross readings, both fixed in `c5857be`:
  - camE: light-sheet shaft bands crossed the window slats and the jamb.
  - camA 2629-2645: shutter highlight dashes formed a grid behind the slats.

**Round 2** (on `c5857be`): **PASS.**
- Both problems are gone at phone size and at 100%, including 2.5-4x contrast-boosted checks.
- No new problem, and nothing else changed.
- A whole-strip rescan finds no cross reading.

**Non-blocking notes:**
- The camE haze is now an even glow; the visible beam shafts are gone.
- The closed shutter is a near-featureless dark plane.
- The camD window openings are blown-out white, as before.
- The rahle reads more like a lectern on a block than a folding rahle.
- Borderline items for the director:
  - The soft stripe edges cross the thin gold rules on the cover (2688-2721).
  - The stripe edges cross the blurred text lines on the pages.
