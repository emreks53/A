# sh10 — out of the cell into countless cells (52.10–58.00 s) · studio S7

## v5 (review-4 notes)
1. Opens inside sh09's fibre interior (shared builder, same seeds, materials, haze, exposure);
   frame 1250 is identical to sh09's (hero mito at ~535,844). Old mito cloud / ER / granules gone.
   Interior frames 1244–1310 render at 8 spp like sh09 (frame handler), the field at 16 spp.
2. The sheet under the dome is holed; a full copy replaces it once the dome starts fading (no
   cyan bars inside, no black hole).
3. Probe light off over t_exit−0.35…−0.05; the membrane fades when < 3 mm from the lens (no flash
   / fog wall); focus sits on the film for the crossing frames (bilayer thin-film sheen).
4. Dome + interior fade to transparent over 12 frames (shared fade group), then stop rendering.
5. ~35 % of cells light (per-cell gate; the ~10 nearest always), unlit stay blue-grey; void
   (0.004, 0.009, 0.013); amber key off by 54.6; emission 1.3 × (0.6–1.6), colour (1, 0.40, 0.06);
   rise 0.15 s, decay to ~30 % (τ 0.25 s); near set within 2.9 m one after another; far front
   t = t_bilmediğimiz + 0.30 ln(1 + d/6) + 0.10 jitter → an amber ring rolls over dark tissue.
6. Membranes 0.02 wide, emission only; dome bump 0.12, fine bump 0.02; 1–3 small oval peripheral
   nuclei per polygon (muscle cross-section); granular glow; compositor Fog Glow (CPU).
7. Camera elevation/look offsets settle at t_hadsiz − 0.15; band stays dark from 55.95.
8. Exit: sparse glints, haze 3× longer and cooling to sh11 grey.
Minor: TRK_cells on screen from frame 1320.

## v4 (director pivot — tissue honeycomb)
* The field is now ONE continuous tissue sheet shaded like a confocal micrograph: 2-D Voronoi
  polygonal cells (varied size), thin bright membranes, darker nucleus, translucent dim
  blue-grey SSS cytoplasm, wet coat, per-cell dome bump; the sheet curves away (2.6 km radius) to a
  hazy horizon. No instanced spheres on black.
* Light-up is computed per cell in the shader from the Voronoi cell centre: near cells one after
  another from "bildiğimiz", the rest in log-distance waves from "bilmediğimiz"; lit cells glow
  warm amber from within (cytoplasm, not nucleus), membranes warm up; unlit cells stay dim
  blue-grey. Band y 520–820 stays dark above the horizon.
* The hero cell we exit is a translucent dome slightly raised out of the sheet.
* The hero cell and its contents vanish ~0.5 s after the probe clears the membrane (tiny by then),
  so the sheet cell beneath takes over — no dark disc in the field.
* Per-cell brightness is random⁴ (few bright, many dim) so the far field twinkles as glints.
* Cheaper than before (no 360 k instances): **29.4 s/frame (field) / ≤ 41 s/frame (interior)**.

## v3 (review-2 notes)
1. Cells: full SSS (scale 0.22) for translucency, darker unlit body, wet micro-specular coat,
   darker nucleus core inside the glow.
2. Glow from within: emission ×1.7 and the amber sun dims to 0.18 as the field ignites, so lit cells
   contrast strongly with the dark ones.
3. Exit: camera ends at 19° looking slightly down so the field fills the lower two-thirds and
   recedes to a hazy horizon just below the key-word band (band stays dark).
4. Membrane crossing: thin-film (lipid bilayer) interference sheen, sheen fuzz and a fine bump
   texture on the membrane, slightly more opaque, so the pass-through reads.

## v2 (director review-1 notes applied)
1. Interior matches sh09 v2: translucent double-membrane mitochondria with real 3-D cristae and a
   faint warm glow, rough-ER lace (branching translucent tubules, kept clear of the probe's
   path), ~2 500 ribosome/granule specks, haze + DOF layers.
2. Field: cells tightly packed (scale 0.98–1.2 on a jittered grid, so neighbours press into
   polygonal contacts), SSS bodies with fine coat sheen, darker nucleus inside each glowing cell.
3. Lighting-up reads as glow from within: warm amber emission through the translucent body with a
   darker nucleus core; the amber sun dims as the field ignites so the cells' own light carries
   the image; waves roll outward (near cells one by one, the rest in log-distance waves).
4. "hadsiz": field is now ~360 000 instances to the horizon; the camera ends lower (13°) so the
   luminous field fills the lower frame and recedes into a warm haze ("city at night", organic);
   band 520–820 px stays a dark soft void.
Budget: 12 spp, ACCURATE/BALANCED, blue noise, 80 % res. **Measured 41.0 s/frame (interior, 1256) / 26.9 s/frame (field, 1360).**

Script: `video/blender/shots/sh10.py` (+ shared `video/blender/lib_s7.py`).

## Design decisions
* **Match from sh09**: opens ~6 cm above a hero mitochondrion standing vertical in frame, same
  amber cristae glow, translucent envelope and dense teal cytoplasm haze as sh09's last frame.
* **Pull-back**: exponential (log-distance) dolly from 0.06 m to 130 m (≈ 6 µm → 13 mm real),
  first straight up out of the organelle cluster, through the plasma membrane of the hero cell
  (measured crossing 53.96 s; membrane is an alpha film so light reaches the interior), then
  tilting from top-down to an oblique view of a sheet of ~90 000 instanced cells (GN instances on
  a jittered hex grid, size/rotation/height variation).
* **"bildiğimiz" (54.68)**: cells within ~9 cell-diameters light warmly one after another
  (per-instance `ton` attribute, 0.55 s spread + jitter), starting 1–2 frames before the word.
* **"bilmediğimiz" (55.40)**: the rest, "in shadow", ignite in log-distance waves with angular
  ripples rolling out to the horizon; brightness per cell is random³ so the far field twinkles
  rather than turning into a carpet.
* **"hadsiz" (56.0) / key-word band**: the camera pitches up so the tissue horizon sits below
  y ≈ 850 px; the band (520–820) is the dark blue-black void above, with only faint haze.
* **Exit**: the field recedes into tiny amber glints under deep haze (→ rain glints in sh11).
* Lighting: warm amber key sun + cool teal fill sun (scale independent), probe light inside.

## Trackers
`TRK_cells` — on top of the hero cell (counter "~37 trilyon hücre").

## Budget
Lean settings (see sh06). Field instances are cheap; the interior is the heavier part.

## Stills (50 %, 12 spp)
`t052.150` match from sh09 (hero mitochondrion) · `t053.600` rising through the organelles ·
`t054.300` reaching the membrane · `t054.750` "bildiğimiz": outside the hero cell, first
neighbours igniting · `t055.500` "bilmediğimiz": the field ignites in waves · `t056.100`
"hadsiz": uncountable, band dark · `t057.900` exit glints.

## Known issues / next
* Field cells read a little like matte beige spheres up close (55.5); next pass gives them a
  translucent membrane + visible nucleus and deeper amber.
* Interior mitochondria are still slightly graphic (cristae stripe pattern) — will soften.
* Will carry the sh06 v2 SSS material approach into these cells.
