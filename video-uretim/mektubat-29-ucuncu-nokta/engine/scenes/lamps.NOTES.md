# lamps.js (v6): "two lamps" (Bâki bir lambayı … mübadele etmek gibidir), t ∈ [35.3, 42.3]

Module: `scenes/lamps.js` exports `init()` and `draw(ctx, t)`, where t is global video time. It also exports
`__dbg`, which holds pure-math hooks for the offline kinematics tool; the renderer does not use it.
Test timeline: `tests/lamps_tl.js` (DURATION 42.5). Set `MOCK = true` there to preview a fake gloss in the subtitle band.
The module draws no text. v5 is backed up at `work/lamps_tools/lamps_v5.js`.

## Handoffs (verified on the raw scene canvas)
- **t ≤ 35.633:** flat `#F2D79A` (mean 242,215,154, std 0).
- **Iris:** the flood disk starts at the farthest corner and contracts with an out-type ease, `1-(1-u)^2.4` over
  35.64–36.1. The first visible change is at 35.667, after the integrator's 35.5–35.66 crossfade. The disk lands
  exactly on the halo's gold ring, using the same polygon, seed, texture scale and offset in screen space.
  The amber ring travels with it, and the rose ring cross-fades so it does not double. From 35.93 the cream core
  ring, the kandil and its flame fade in over the flood, so the iris becomes the lamp's light. From 36.1 the
  flood is no longer drawn and nothing pops. The glow and motes fade in over 36.1–36.4.
- **Night:** fades in over 41.4–41.9. From 41.9 the frame is screen-space `#161D2E` with very faint dabs
  (mean 23.7,30.6,47.6, std ≈4) and holds to 42.3 and beyond. The step from 41.867 to 41.9 is at most 0.3 levels.

## Layers, back to front
1. **Niche interior** (back wall, shell fan, reveals): its own parallax layer, k = 0.88 against the REF camera
   (470,930,1.16). The interior sprite extends 60 px beyond the opening.
2. **Wall:** plum wall with the opening cut out, Iznik tile intrados, stone frame, alem crescent finial,
   rumi spandrels and ledge.
   - Value bands: darker high wall above the frieze, mid wall, darker low wall (wainscot) below the ledge with a
     quiet lozenge border. The subtitle band sits on the plain low wall.
   - Dabs: larger, sparser and darker away from the niche; finer and tighter near it.
3. **Light:** 4 pre-lit copies of both layers (unlit indigo, plum, rose, warm). Each pool level is an **opaque**
   blit of the next copy, clipped to a wobbly circle with tangential dab fringes.
   - Levels: plum 310 / rose 232 / warm 178 world px for the kandil; 175 / 115 / 72 for the candle.
   - The warm level is clipped to the niche opening, so the recess glows and the arch shapes the light.
     The candle on the open wall only ever makes a dim rose pool.
   - All light is clipped above the ledge top (y 991). Below the ledge there is a crisp flat under-shadow band
     and a thin warm bounce line on the ledge lip.
   - Pools are centred on the flame (kandil cheated 40 px toward its body). Overlapping pools are a union, with no lenses.
   - When the candle dies the levels step out one after another: warm, then rose, then plum
     (gibidir +0.05 → +0.28).
4. **Kandil cast shadow** on the back wall, clipped to the opening. Then the flame halos (4 flat rings,
   radii 40/62/86/112: cream, gold `#F2D79A`, amber, rose at alpha 0.5), the eternity ring and the dial.
5. **Arm back layers:** a tapered Bézier sleeve ribbon plus the palm and fingers. Then the candle, the kandil,
   and the arm front layers (thumbs over the handle and the saucer rim), so the hands wrap the objects.
6. **Swap arrows** (annotation layer, on top), then smoke and motes.
7. **Foreground drape** at the top-left: its own parallax layer, k = 1.3. It slides in during the pull-out and
   frames the two-lamp shot. The far arm emerges from behind it, the departing kandil disappears behind it,
   and it slides out during the push-in. It never enters y 1290–1440.

## Objects
- **Kandil:** low, wide, faceted brass lamp drawn at world scale, base (570, 985).
  - Short flared spout to the right with a tiny dark wick; loop handle with a thumb-rest to the left; domed lid
    with a tulip finial; three large tulip engravings.
  - Warm palette (`#D6A040`, `#9A5E24`, `#5E3418`), ivory specular slivers, warm rim on the flame side.
- **Eternity ring:** R 178. An unbroken double gold band with a 22-crossing two-strand braid whose phase drifts
  slowly. A bright glint orbits it forever, one turn per 2.6 s.
  - The ring travels with the kandil and fades only as its centre leaves the frame.
- **Candle:** ×1.4 (wax 50 × 134 px, burns down to 70); clay saucer.
  - Tinted by local light: dark lavender before ignition and after death, warm when lit.
  - The flame glows through the top of the wax. The shade is on the side away from the kandil while the kandil is present.
- **Dial:** R 122, 60 ticks (12 bold, 48 faint). A hand sweeps clockwise and a thick amber remaining-time arc
  (12 px world) drains to 12 o'clock over 38.08 → 41.03.
  - On completion the hand flashes and a thin ring pulse appears.
- **Hands:** one person standing off-frame left, in rig.js skin and shirt colours.
  - Sleeves are tapered ribbons (112 px at the off-frame anchor, 52 px at the cuff) with a slight S-curve and no
    visible elbow. They are painted in 3 flat light steps, tinted toward `#2B2442` (sleeve value at or below the
    lit wall), with a shade side, a warm rim on the side facing the flame, a cuff band and two soft folds.
  - The hand opens on approach, follows a curved path with a slight overshoot and rotates the wrist.
  - The fist closes over 4–5 frames. Far hand: the bar passes between the fist and the contoured thumb.
    Near hand: palm-up under the saucer, thumb on the rim. On release the near hand's fingers curl softly.

## Key times
| t | beat |
|---|---|
| 35.64–36.1 | iris contracts onto the kandil halo (camera 1.40 → 1.37) |
| 36.19 "Bâki" | halo and pools swell ×1.14; three brass glints; eternity ring draws clockwise 36.25–37.09; glint orbit fades in from 37.04 |
| 36.8–37.45 | pull-out to the two-lamp framing (z 1.16), settled before "bir dakika"; drape slides in |
| 37.53 "bir dakika" | candle paints in (dark, unlit); dial draws 37.68–38.13; ignites 37.85–38.23 |
| 38.08 → 41.03 | the minute: hand sweeps, amber arc drains, wax burns down |
| 38.85 "sönecek" | flame wavers ~0.9 s (leans, shrinks to ~50 %, light dips) |
| 39.0–39.6 | small reframe (z 1.17 → 1.12); camera locked 39.6–40.93 |
| 39.35–39.88 | far hand reaches in past the drape; grips the handle 39.83–39.97 |
| 39.55–40.12 | near hand reaches in; holds the saucer 40.08–40.22 |
| 39.72–40.2 | ⇄ arrows draw: kandil out up and away to the upper left; candle in, a low arc along the ledge into its place. They fade 40.55–40.85 |
| 39.97 → | kandil lifted (smooth speed ramp 0.42 s to 1000 world px/s ≈ 37 screen px/frame); carried up-left behind the drape. Flame off-screen ≈41.13, halo ≈41.2; its light pool lingers at the drape edge |
| 40.3–40.93 | candle carried along a low arc into the niche centre (inOutSine, peak 34 px/frame); 2 px landing settle |
| 40.91–41.05 | near hand lets go (fingers curl); withdraws to the left 40.96–41.24 |
| 41.03 "gibidir" | dial completes (flash, ring pulse); flame flares 41.03–41.16, then shrinks by scale to an ember dot 41.19–41.65; smoke ribbon (11 → 4 px, two tones, curl, 3 puffs) 41.16–42.1; pools step out |
| 40.93–41.9 | push-in on the dying candle (z 1.12 → 1.6, smooth start that builds early: z ≈ 1.3 at 41.15) |
| 41.4–41.9 | scene sinks to night |

## Measured cost (headless Chromium, software GL, shared machine, load average 1–5.6)
- **`draw()`:** 18–60 ms best, 19–74 ms average per frame. Flood and night frames are ≈1 ms.
  - One sample hit 149 ms during a load spike; re-measured at 36 ms best / 42 ms average.
- **Full engine render** including the WebGL post: 29–92 ms.
- **First scene frame after init:** 90–98 ms. `init()` warm-up-draws 3 frames into a throwaway OffscreenCanvas.
- **`init()`:** ≈1.9 s. Sprites: 4 wall (1560×2548), 4 interior (759×891), night (1080×1920), drape, kandil,
  saucer; ≈86 MB in total.
- **render.mjs with 2 workers:** 0.78–0.89 s per frame wall clock, including readback and x264.
- **Determinism:** byte-identical PNGs for the same t across separate runs and in any frame order.
  There is no Math.random, Date or performance call in the module.
- **Frame difference** (lamps_v6.mp4, 270×480 grey): median 0.74, no single-frame spikes. Bells: iris (peak 30.7,
  inherent full-frame reveal), pull-out ≈8.8, exchange ≈5, push-in ≈5.5.

## Critic points: what was done, and where I disagreed
- **Applied, art critic:** 1 (arms and hands), 2 (opaque stepped pools, flame-centred, niche-clipped warm level,
  shadow band instead of the below-shelf disc, step-out), 3 (ring vs. clock language), 4 (candle ×1.4, light-tinted,
  shade side), 5 (camera schedule), 6 (⇄ arrows on top, under-stroke, 10 px dashes, filled heads),
  7 (release before the flame-out, scale-kill and ember, ribbon smoke, warm spill at the corner), 8 (parallax),
  9 (kandil redesign), 10 (4-ring halo, flame contour), 11 (no onion-skin ghosts, earlier and gentler lift),
  12 (shadow clipped), 13 (wall variation, value bands, framing moved up ~60 px), 14 (iris), 15 (alem, spandrels, safe margin).
- **Applied, meaning critic:** 1 (speeds: kandil 37, candle 34 px/frame during the lock), 2, 3, 4 (thick ring plus
  an orbiting glint), 5 (ring carried), 6, 7, 8 (warm-up), 9 (ring bottom ≈1155 px), 10 (content moved up), 12.
- **Disagreement, arrow routing:** the meaning critic proposed two crossing arcs on open wall; the art critic
  proposed a clean ⇄ opposing pair. I used the ⇄ pair: one arc up and away from the lamp, one low arc along the
  ledge front. Both lie on open wall or the dark ledge, never under a hand, and their ends are more than 60 px
  apart. Crossing arcs read as one tangled path last time.
- **Disagreement, candle smear:** the meaning critic suggested a 2-ghost smear on the candle; the art critic asked
  for no onion-skin ghosts. I left it out: with the smooth inOutSine carry the peak is 34 px/frame, and it reads cleanly.
- **Disagreement, eternity-ring dots:** the meaning critic suggested 4 px dots; the art critic said dots read as
  clock ticks. I used no dots; the orbiting glint carries "forever".
- **Not done:** objects at parallax k 1.03 (art critic 8). It would make them slide on the ledge they stand on, so
  objects stay at k = 1 with the wall. Parallax comes from the interior (0.88) and the drape (1.3).
- **Kandil's plum pool at the right edge:** in the two-lamp framing it still runs off the right frame edge. The
  flame sits right of the niche centre, and the suggested 300–330 radius implies this. Its edge is low-contrast plum.
- **Note for the integrator (meaning critic 11):** the gloss 'değiştirmek' stays up until 41.97, over an almost black
  frame from ~41.75. Consider trimming its end to ≈41.6 in overlay.js. That file is not mine.

## Known weaknesses
- At 41.03–41.12 the departing kandil's halo is still visible at the top-left, by the drape edge, while the candle
  flares. Leaving sooner would need more than 40 px/frame.
- At the frame edge, the push-in raises its apparent speed to about 45 px/frame for 2–3 frames as it exits.
- The far sleeve is long; the drape hides its shoulder end.
- During the exchange (40.4–40.7) the travelling eternity ring and the arriving dial overlap for about 0.3 s.
  This is meaningful (they swap places) but busy.
- In the two-lamp framing the lower ~40 % of the frame is plain dark low wall. This is deliberate: it is calm
  behind the subtitles and the player UI.

## Test commands (from engine/)
- `node preview.mjs ../work/prev6d 36.6 38.5 40.5 41.12 41.4 --tl=./tests/lamps_tl.js`
- `node render.mjs ../work/lamps_v6.mp4 --tl=./tests/lamps_tl.js --from=35.3 --to=42.3 --workers=2`
- Tools in `work/lamps_tools/`:
  - `sheet.py`: video contact sheet (`BASE=35.3`).
  - `pngsheet.py`: PNG contact sheet.
  - `fdiff.py`: frame-difference and spike check.
  - `kin.mjs`: kandil and candle screen speed and visibility, via `__dbg`.
  - `timeit.mjs`: draw cost.
  - `contract.mjs`: raw handoff frames, first-frame cost, determinism.
