# Figure audit — scene-level problems (from the rig verification)

Tools: /tmp/claude-0/-home-user-A/3737c98a-16c9-5b73-ba90-75aaf1cd832c/scratchpad/ver/tools/ (scan.cjs per-frame numeric scan with DM_PATCH / DM_MAN, analyze.py, slipnet.py foot-slide reports, iso.cjs isolated re-renders, vis.cjs in-scene crops). Patch diffs: scratchpad/ver/patch/.

### Problems remaining in the scenes (cannot be fixed in the rig), most serious first
Pixel figures are on-screen pixels.

1. **s07 27.73–29.25, stepping back: the feet skate.**
   - 28.47–28.73: the far toe is dragged about 145 px along the grass while its knee bends.
   - 28.03–28.17: the near toe is dragged about 60 px.
   - 27.73–28.03: the far foot hovers 1–2 px and glides as the embrace is released.
   - Causes: the two feet's swing phases overlap (near 0–0.6, far 0.4–1); the hip angles come from a straight-leg formula that ignores the knee bend; there is a 0.24 s leg blend; and the `hugPose` legs differ from the stand pose.
   - **Tested fix:** `patch/s07_planted_step.diff`. One foot at a time, two-bone IK, the step starts from exactly the stand stance, `kb = 1`, and `hugPose` legs set to 0.03/0.03/−0.03/0.03. Slide drops from 33 px/frame to under 1 px; the stance foot stays exactly in place.
   - Smaller: 25.6–26.5, the whole figure glides about 14 px toward the globe (`mx = XE − 8·(1−kHug)`). The feet are in the pencil-only area near the bottom, so this is low priority; drop the −8 term.
2. **s06 prayer vignette (21.7–23.85, largest at about 22.3–22.6): the prostration (sujood) pose is wrong.**
   - Forearms lie flat on the ground, the hands are stretched out ahead of the head, and the feet lie with the tops down (`nF`/`fF` −0.5).
   - A correct sujood has forearms raised, palms beside the head and toes tucked.
   - Partial fix for the feet: `nF`/`fF` −1.35 with `nK`/`fK` about 2.1 (toes tucked, like `kneel`).
   - The arms cannot be drawn correctly in the side view: the raised elbow needs a backward bend in profile plus foreshortening, which the elbow limit blocks. I tried bowing (rükû) and standing (qiyam) instead; neither read well with this rig. This needs a dedicated drawing or a different image.
3. **s06 help vignette: the seated person floats.** The seat is about 0.055h above the ground and the supporting hand about 0.08h above it (5–9 px at 22.3–22.6).
   - Tested pose: `{lean:-0.28, head:-0.2, nS:2.05, nE:0.05, fS:-0.30, fE:0, fW:-1.15, nH:2.25, nK:1.4, fH:2.1, fK:1.25, nF:0, fF:0}`. Seat and coat now sit on the ground and the hand is planted.
   - The clasp position moves, so the helper's hand and spacing need re-aligning.
4. **s16 75.67–75.91 and 76.47–76.71 (the turns): still as previously reported.** The figure is squashed to 0.6 width, the front view is drawn at 0.78–0.84 width, and the view switches are instant cuts. Fix: `sx = 1` and a cross-fade, or `TURN ≈ 0.36`.
5. **s18 82.82–83.25: the feet slide apart on the pedestal** (+24 / −16 px in 0.4 s). `proudPose` widens the stance (`nH` 0.03→0.11, `fH` −0.03→−0.09) with both feet planted. Fix: keep `nH` 0.03 / `fH` −0.03, or animate a planted step like the s07 patch.
6. **s02 2.55–6.65: the green background walker (h = 230) slides 6–7 px every step.** It moves at the speed for h = 250. **Tested fix:** `x2 = 690 + E.man.walkSpeed(hB*0.92, 0.95)*lt` gives zero slide.
7. **s02 3.32–3.68, walk-to-stop: the near toe slides about 20 px as the foot lands**, and the standing foot about 11 px back (up to 8 px/frame). The other agent's suggestion `ph = 0.36` tested: up to 2.3 px/frame, and the near toe's total slide drops from 44 to 5 px. Items 6 and 7 together are in `patch/s02_walker_and_stop.diff`.
8. **s17: feet shuffle** — 80.25–80.58 (far foot −14 px), 81.15–81.58 (up to 12 px), 82.0–82.3 (far foot +9 px).
   - The hold, awe, raise, press and proud poses use different hip angles, and the press pose bends the knees without adjusting the hips.
   - Fix: give all five the same `nH`/`fH` (for example 0.05 / −0.06). When a knee bends by k, add about 0.49·k to that hip so the ankle stays put.
9. **s17 81.55→81.58: one-frame elbow snap.** The press IK flips the elbow from 1.67 to 0.09 rad as the globe drops. It reads as a fast slam. Fix: blend over `B.drop + 0.2` with `'inOutCubic'`.
10. **s12: the far foot glides while hovering 1–2 px** — 54.85–55.1 (about 15 px) and 57.4–57.7 (about 8 px) — because gaze, calm, surge and direct use different hip angles.
    - Also, over the whole shot the man drifts about 5 px/s left and grows about 0.8%/s against a meadow that does not move (`MX = 188−5·lt`, `MY = 1490+2.4·lt`, `MH·push`).
    - Fix: the same `nH`/`fH` in all four poses, and keep `MX`/`MY` fixed (or push the meadow too).
11. **s13 61.8–62.4: the far foot slides about 11 px.** direct and guide use (0.06 / −0.07, `fK` 0.07); watch and offer use (0.04 / −0.04, 0.04). Fix: give all four the same leg values.
12. **s11 52.9–53.15: the far foot slides about 9 px** (tend and gaze legs differ). Same fix.
13. **s19 89.35–89.45: a bubble sits on the far palm.** It shows as a dark blob with two white dots and reads as a stain or a face. Still present.
14. **s04 13.35–13.8 and 14.38–14.82 (low priority): the man enters and leaves vertically about 3× faster than the ground band**, so he appears to glide over the meadow. Fix: move a foreground grass strip with him, or tie his height to the ground band's movement.
15. **s07, s08, s09 and s17 copy the rig's skeleton maths.** They still match, because I did not change the skeleton or grounding.


### Status (scene audit A/B/C, independently verified)
All items above are fixed in the scene files. 30 fps scans: planted-foot slide ≤ 0.19 px/frame in every shot, no pose
jumps, no view switches. s06 prostration is a dedicated anatomically correct figure (`sujood()` in s06.js); s16 no
longer turns (no doubled-body dissolve); s19 never shows a hand above the water; s09 offering gesture slowed (no jump).
Remaining, harmless: a walking foot moves ~2 px in its touchdown frame (engine `footState`), s08 standing far foot
0.4 px above ground (rig `stand()`).
