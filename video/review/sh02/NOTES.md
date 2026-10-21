# sh02 — morning room, window, breathing curtain, dust motes (5.24–9.64 s) — review 3

Script: `video/blender/shots/sh02.py`, shared set `video/blender/lib_s4.py` (also used by sh03).
Light rig (for S5/sh08 to match): see `video/review/LIGHT_SETUP_S4.md`.

## Stills (50 % res, preview quality)
| file | t | shows |
|---|---|---|
| sh02_t005.000.png | 5.00 (first handle frame) | Seated eye height at the table end, looking up into the deep lime-plaster window. Sun hot spot + blown sky upper right (in the open casement / transom) for the light dissolve from sh01's upper-right flare. Exposure starts +0.8 EV hot and settles (auto-iris feel). |
| sh02_t006.500.png | 6.50 | Curtain exhaling back toward the glass; slow drift of the camera. |
| sh02_t008.300.png | 8.30 "oksijen" | Biggest inhale: the sheer linen billows into the room, gust of motes starts toward camera (out-of-focus specks crossing the lens). |
| sh02_t009.000.png | 9.00 | Tilt/boom down begins; sunlit mullion patterns on the table. |
| sh02_t009.900.png | 9.90 (last handle frame) | Looking down onto the table under the window — sh03 continues this move down onto the sofra. |

## What is real / simulated
* Curtain: real cloth simulation (Blender cloth, 44×64 grid, pinned ring heading, wind field keyed to a
  breath rhythm ~2 s in / ~2 s out; biggest inhale peaks at 8.17 s so the billow lands on "oksijen").
  Baked inside the script from render_f0−48 → render_f1+2 (deterministic for any chunk).
* Dust motes: 6 000 Cycles point-cloud particles, pure function of scene time (4D-noise swirl + drift +
  keyed gust toward camera at "oksijen") → deterministic, motion-blurred. Shaded by the analytic sun-beam
  mask, so they only sparkle inside the beam.
* Light shafts: emission-only volume whose density is the analytic sun-ray projection back onto the real
  window grid (frame, transom, sash bars, curtain half at ~55 % transmission) × drifting 4D noise. No light
  sampling → noise-free and cheap; the shadow pattern of the shafts matches the mullion shadows on the table.
* Sun: HDRI `garden_nook` sun direction measured from the EXR and matched to the sun lamp (25.9° elev).

## Tracker
`TRK_air` at (−0.25, 0.25, 1.45) — in the sunbeam between window and table, inside the mote cloud.
On screen frames 120–217 (to 9.04 s; ~0.7 s past "oksijen"), then it leaves the top of frame as the camera tilts down. Moving it lower is trivial if the callout needs to stay longer.

## Key-word band (y 520–820) at "OKSİJEN" 8.3–9.6
The band holds the lower window / curtain at 8.3 and the sill + plaster wall from ~8.9 as the camera
tilts down — soft, low-detail. If the director prefers darker behind the white text, I can tilt down
~0.3 s earlier.

## Render cost (measured, 1080×1920 --final, 4 cores)
* Review 1 config: 248 s/frame. **Review 2 config: ~97 s/frame** (3-frame run 199–201, 12 spp adaptive 0.05
  + OIDN; light tree off; diffuse 1 / transmission 8 bounces; the cloth cache is simulated once per Blender
  launch, ~30 s per 48-frame chunk). Still ~2× over the 40–45 s target. Profile at 12 spp: emission shafts
  ~25 s, curtain (alpha weave + transparent shadows) ~15 s, motes ~15 s, sofra ~15 s, room GI ~40 s.
* Things I tried that did not help or hurt the look: shaft card stack (233 s), compositor sun beams
  (single "saber" streak), fast-GI (room goes black — closed interior). Next: cheaper weave transparency,
  fewer/bigger motes, shaft volume only where the camera sees it. **Director: if ~95 s/frame is
  acceptable for sh02 (117 frames ≈ 3.2 h on 4 cores) I can render as is; otherwise I keep cutting.**

## Changes in review 3
* Slow dolly-in toward the window during the first 2.5 s (no static head); hotter flare-to-settle
  exposure on the first frames for the light dissolve from sh01.
* Dust motes re-done: 6 000 fine specks shaded by the same analytic sun-beam mask as the shafts
  (emission only, so no shadow rays); most are faint, a few glint as they tumble — they only appear
  inside the beam. (The first try at this was a "snowstorm" — fixed.)
* Shaft volume confined to the beam's actual path.
* Full-res final-renderer sample frame: `sh02_FINALQ_f199.jpg` (added shortly after this push).

## Changes since review 1
* The table under the window now carries the same sofra as sh03 (bowl, bread, glass, plate) — the
  boom-down into sh03 is continuous.
* Lime plaster lighter and smoother (no "granite" read); brighter sky fill; exposure 2.6 → 1.9 settle.
* Motes kept ≥0.6 m from the lens (no big white discs), cheaper material.
* Empty glass now renders clear (transmission depth 8).

## Known issues / next
* Shafts are subtle when looking into the sun; considering a touch more density near the window.
