# fix-hand4 — sh04 man's hand (review findings s2-8)

Fix commit: 980f9b4 (`video/blender/shots/sh04.py` only). Re-render **509-556 as ONE job starting at 509**
(removes the 530|531 join).

## What changed (hand/forearm only)
* Fingers and thumb thickened ~14 % (1.3 mm per side on ~18 mm fingers), blunt rather than tapering.
  The fingertips keep their reach, so the entry timing is unchanged: f514 matches a hand-hidden
  render, and the tips appear at f515.
* Bony MCP knuckles, extensor tendons, soft dorsal/forearm veins (geometry). Fine dorsal joint and
  wrist creases, and short flat nail plates (shader attributes). At this backlit exposure these are subtle.
* Body hair rebuilt (seeded, ~5.9k strands sampled on the skin): forearm (back, edges, sparse on the
  inner side) up to the cuff, the back of the hand, and the first finger segments. Hairs are 3-7 mm
  long, lifted 20-50°, with a hair BSDF mixed with a translucent component so they glow where the sun
  passes. Visible at 100 % and as hairy texture at phone size. The old hair sat only on the palm side
  and was 12 µm thin, so it was never visible.
* Skin SSS is wider and warmer (scale 2.4 → 4.0 mm, radius 1/.42/.20). The glow now runs along the
  whole finger rim, so the isolated red, nail-shaped tip caps are gone.
* The cuff is off frame (the forearm leaves the frame bottom before it) and is unchanged.

## Proof
* `f518_tips_before_after.jpg` (before: the final mp4 frame), `f530_hand_before_after.jpg`,
  `f556_hand_before_after.jpg` (full-res crops), `f556_phone_before_after.jpg` (360 px). Left = before, right = after.
* Unchanged elsewhere: f512 and f510 are pixel-identical to the base code. At 522 and 540 the area
  away from the hand differs only by noise.
* Determinism: 529-531 vs 530-531, and 539-540 vs 540: bit-identical (max diff 0).
* Cost: 30-35 s/frame on the first host (base 21-27). After a host restart, on a slower host:
  45 s/frame vs base 37 s. Budget OK.
* Independent verifier: PASS. It found two minor issues, both addressed:
  * a fingertip sliver at f514, fixed by keeping the tips' reach;
  * a pale glint on the curled finger, which comes from the sun on the knuckle, existed in base, and
    is now toned down (the nail is less pale and less glossy).
