# sh02 — morning room, window, breathing curtain, dust motes (5.24–9.64 s) — review 1

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
* Dust motes: 7 000 Cycles point-cloud particles, pure function of scene time (4D-noise swirl + drift +
  keyed gust toward camera at "oksijen") → deterministic, motion-blurred. Lit by the real sun, so they
  only sparkle inside the beam.
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

## Render cost (honest)
Preview stills: ~65 s each at 50 % / 24 spp. Measured full final before the latest light optimisations:
248 s/frame (4 cores) — **over budget**. Since then: HDRI no longer samples diffuse light (sky fill area
light instead), OIDN prefilter FAST, bounces trimmed, motes as point cloud, emission-only shafts.
New full-frame measurement is running next; plan to hit ≤45 s: final_spp 16 + adaptive 0.03, curtain
subsurf off at render, step-rate tuning. Will report the number in the next push.

## Known issues / next
* Lime plaster still reads too dark/granite in the shadowed wall areas → lighter, smoother lime wash.
* A few motes very close to the lens become large white discs → keep the cloud ≥0.4 m from the lens,
  more motes deeper in the beam.
* Shafts are subtle when looking into the sun; considering a touch more density near the window.
