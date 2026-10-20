# sh10 — out of the cell into countless cells (52.10–58.00 s) · studio S7

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
Budget: 12 spp, ACCURATE/BALANCED, blue noise, 80 % res.

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
