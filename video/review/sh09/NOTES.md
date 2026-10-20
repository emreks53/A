# sh09 — inside the forearm (47.40–52.10 s) · studio S7

Script: `video/blender/shots/sh09.py` (+ shared `video/blender/lib_s7.py`).

## Design decisions
* **Scale** 1 m = 100 µm (same world as sh06/sh10). Muscle fibres Ø 40–44 µm, hex-packed in
  fascicles, slightly polygonal & wavy; deep red SSS with a soft wet coat. Striation period is
  drawn at 4 µm (real sarcomere ~2.5 µm) — the true period aliased into moiré at this framing.
* **Opening** (match from sh08's push into skin): the probe glides forward down a channel between
  fascicles, yawed 14° toward the hero fascicle so bundles stream diagonally; warm amber key,
  cool rim light only in diffuse/SSS (no glossy hot-spots).
* **Nerve**: myelinated motor axon (creamy glossy myelin, narrow nodes of Ranvier) runs along the
  lower flank of the hero fibre to a neuromuscular end-plate (boutons). Internodes compressed to
  55 µm for readability (real ~1 mm).
* **"kaslarda" (48.14)**: impulse starts 2 frames before the word and jumps node→node (saltatory,
  teal emission at each node + a faint travelling glow + a moving teal light that really lights
  the tissue), reaches the end-plate at 48.40 (bouton flash), then the fibres twitch: a
  geometry-nodes contraction ripple spreads both ways from the junction (fibre thickens, shortens,
  striations visibly bunch because they ride the rest-position attribute), neighbouring fibres
  follow with 60–200 ms delays; warm amber glow where contracting.
* **"hücrelerde" (48.80)**: the probe curves toward the hero fibre, pierces the sarcolemma
  (~49.3–49.5) and settles inside among myofibrils (camera rolled so they run vertically in the
  9:16 frame), mitochondria between them glowing amber with cristae bands seen through a
  translucent envelope; haze turns from red-brown tissue to dense teal cytoplasm (colour arc).
* **Exit**: holds ~6 cm from the hero mitochondrion (`TRK_mito` at screen centre) → sh10 starts
  there and pulls back.

## Trackers
`TRK_nerve` (on the nerve, on screen 47.4–48.7), `TRK_fiber` (hero fibre flank, on screen
47.4–48.8), `TRK_mito` (hero mitochondrion, centred at the end). See `sh09.json` (`vis` flag).

## Stills (50 %, 8 spp)
`t047.450` open · `t048.120` "kaslarda", impulse launching · `t048.500` impulse at the end-plate,
twitch starts · `t048.800` "hücrelerde", contraction ripple, turn begins · `t049.400` piercing the
membrane · `t052.000` settled at the mitochondria.

## Budget
Same lean settings as sh06 (6 spp final, OIDN balanced, 2 bounces + fast-GI). Full-res timing
to be measured on the heaviest frame and added here.

## Known issues / next
* Membrane crossing (49.2–49.5) is a fast blur — may add a visible glycocalyx/membrane bilayer
  texture at close range.
* Interior could use more organelle density (SR network, T-tubule triads).
* The probe passes close over the nerve during the turn (48.9–49.2) so the myelin fills half the
  frame for ~8 frames; next pass routes the dive further from the nerve.
* sh06 director notes (SSS-dominant cells/tissue) will be carried into these materials too.
