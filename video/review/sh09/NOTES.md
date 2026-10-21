# sh09 — inside the forearm (47.40–52.10 s) · studio S7

## v5 (review-4 notes)
1. Crossing: the sarcolemma is ray-cast (x = 0.277 at the dive point) and turns translucent
   (alpha 1 → 0.25 over t_huc−0.1 … +0.35 within ±0.3 of DIVE_Y; glycocalyx bump + fresnel rim kept);
   the interior is visible through it from t_huc−0.15; the probe crosses at 49.45 and then creeps
   (no stop) to the hand-off pose; nerve moved to ≥0.15 off the dive path; haze/exposure eased.
2. Myonuclei and granules are generated only ≥ 0.012 inside the fibre; one nucleus soft at the
   end-frame edge.
3. Myofibrils: sarcomere 2.4 µm, band contrast 0.7, dark Z-lines, SSS 0.5 µm, sheen 0.15, no coat;
   mitochondria sit in rows on the Z-lines.
4. Hero mito 0.7 µm wide (rows 0.5 µm), lumps 0.02, cristae follow the envelope's bend and stay
   inside (0.75 r), envelope alpha 0.35–0.55 and no coat; the lattice is anchored so the hero sits
   in a natural gap with a clear sightline (camera 0.03 away, f/16 at the end); foreground mitos
   inside the frustum edges.
5. Hand-off: the whole interior lives in `lib_s7.build_fibre_interior` (same seeds/materials) and
   `lib_s7.INTERIOR_HANDOFF`; frame 1250 of sh09 and sh10 match exactly (TRK_mito 535,844);
   `handoff_f1250.json` records camera/haze/exposure.
6. Endomysium seeds use zlib.crc32 (deterministic across runs).
7. Build ~4 s (numpy/from_pydata geometry; myofibrils are single-ring tubes, bands in shader).
8. Impulse starts at the first node actually in frame (t_kas−0.07); node emission 10.
9. Opening: exposure 1.4 → 0.4 and salmon haze over 1132–1150 (matches sh08's skin push).
10. Twitch glow 0.3; no teal void at 48.6 (haze stays warm until the dive).
11. Camera creeps to the last frame; an amber energy wave travels up the mitochondria on
    "olup bittiğini".
12. Granules dark/matte; tracker windows: nerve ≤48.7, fibre 48.45–48.85, mito ≥49.9 (outside
    their window the empties are parked far off-screen, vis = 0).

## v4 (director pivot — "no empty space")
* 49.3–52.1: the probe pierces the hero fibre and the frame stays filled with tissue: myofibrils
  packed at 1.95 µm pitch (soft A/I banding, translucent SSS), rows of small mitochondria nestled
  between them (envelopes 55–92 % opaque so cristae read as soft internal layering, warm faint
  glow), three elongated myonuclei under the sarcolemma, granules at many depths, out-of-focus
  mitochondria in the foreground, dense rosy tissue haze (never a void). Ends close on one
  mitochondrion between myofibrils.
* Budget: finals 8 spp (+ ACCURATE/BALANCED, blue noise, 80 % res). **Measured 52.0 s/frame
  (interior 1236–1238) / 42.0 s/frame (exterior 1166)**; 100 % crop of the top-left (darkest
  defocused) region checked over 3 consecutive frames: clean, stable.

## v3 (review-2 notes)
1. Cell interior: desaturated blue-grey cytoplasm haze with depth gradient; myofibrils are now
   translucent pink-red SSS bundles with soft banding and a light-catching sheen (no opaque bars);
   ~4 000 granules at many depths and sizes; out-of-focus mitochondria in the foreground framing
   the hero.
2. Nerve: satin/matte organic myelin (rough 0.62, faint coat, sheen), irregular colour/bump
   texture, deeper SSS for a translucent edge, more visible connective sheath.

## v2 (director review-1 notes applied)
1. Fibres: striations now low-contrast banding under the wet surface (bump 0.07, colour
   modulation 0.22, no moiré), glycocalyx fuzz sheen + fine bump; each fibre bordering the channel
   wrapped in a wispy semi-transparent endomysium web (fibrous alpha); two capillaries in the
   grooves between fibres with translucent walls and erythrocytes squeezing through in single
   file (cup-deformed, slowly moving — sh06 callback); fibre diameter/spacing jitter kept.
2. Nerve: organic myelinated axon — diameter variation, Schwann-nucleus bulge on every internode,
   narrow nodes of Ranvier, thin translucent perineurial sheath, SSS myelin (rough 0.48, thin coat)
   instead of glossy pipe. Teal saltatory impulse kept, with a moving teal light spilling on the
   tissue (diffuse only).
3. Cell interior: dense and layered — vertical myofibrils on both sides of a narrow probe pocket,
   rows of mitochondria packed between them (≈ 1 000, shared meshes), each a translucent double
   membrane (rim-opaque alpha) with real solidified 3-D lamellar cristae inside and a faint warm
   humming glow (no stripe texture any more); sarcoplasmic reticulum as a lacy translucent
   tubular network (rings at Z-lines + longitudinal tubules); glycogen granules; brighter teal
   cytoplasm haze; DOF layers.
4. Membrane crossing: sarcolemma carries glycocalyx sheen/fuzz + fine bump.
5. Same SSS-first material language as sh06 v2.
Budget: 10 spp + OIDN ACCURATE/BALANCED + blue-noise sampling, finals at 80 % res; interior
objects only render once the probe reaches the membrane and exterior tissue is hidden once inside
(both behind the haze). **Measured 52.3 s/frame (exterior, 1166) / 52.9 s/frame (interior, 1236).**


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
