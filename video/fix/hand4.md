# FIX ISSUE FILE: hand4

Read video/fix/FIX_BRIEF.md first.

* Shot(s): sh04
* Your branch: render-fix-hand4
* Base commit: ba591e81a1abec154bae4b8f92c8e9bdd75f3bbf on origin/render-jobs
* Files you may edit: video/blender/shots/<your shot>.py
* Current final frames (chunks in git, branch:path):
  - sh04: 378-400 from render-out-b30:video/renders/sh04/sh04_00378_00400.mp4; 401-425 from render-out-b02:video/renders/sh04/sh04_00378_00425.mp4; 426-467 from render-dev-s5:video/renders/sh04/sh04_00426_00467.mp4; 468-506 from render-out-n9:video/renders/sh04/sh04_00468_00515.mp4; 507-530 from render-out-b30:video/renders/sh04/sh04_00507_00554.mp4; 531-556 from render-out-b56:video/renders/sh04/sh04_00531_00556.mp4

## What to fix
Scope: the man's hand/forearm in sh04 (enters f514-516, holds toward the sun to the cut at 551, handles to 556). The approved commit already extends the forearm out of frame (fix ba591e8) - keep that.
Goal: it must read unmistakably as an ADULT MAN's hand at phone size and at 100%: broader palm and thicker fingers (+10-15%), short square nails, knuckle/wrist creases and visible tendons/veins (normal/displacement), hair on the back of the hand and forearm that the backlight rim-lights on the silhouette (it must actually be visible at this exposure/focus), NO isolated glowing red fingertip caps that read as painted nails (backlit SSS should glow along the whole finger edge, warm orange-red, not as nail-shaped caps), a man's shirt cuff where the forearm leaves frame if it is visible. Keep the motion, the pose, the timing (fingertips enter f515-516) and everything else.
Expected re-render: 509-556 as ONE job starting at 509 (so the 530|531 join disappears).

## The verified review findings (verbatim)
### s2-8 - sh04 f514-530 (hand entry; the 531-556 re-render uses the same hand) [blocking]
PROBLEM: The only human element reads as an adult hand: broad palm and wrist at f530. However, it is completely smooth, with no visible hair on the rim-lit silhouette edges, no knuckle creases and no veins, and the fingers taper to slim tips. Against the bright sky this gives a mannequin-like look. The script adds rim-lit arm and hand hair (S3_armhair) and a man's cuff, but at this exposure and focus none of those male cues is visible, so the 'man's hand' read rests on proportions alone. The user's rule is binding ('never anything that reads as a female hand').
EVIDENCE: 1:1 crops of f524 and f530 (final_review/s2/p_hand2.png): smooth wax-like skin, no glowing hair fringe on the backlit outline, slender finger tips. The current b51 re-render (531-556) only changes forearm geometry (commit ba591e8).
PROPOSED FIX: Optional but recommended, given the hard rule. In sh04.py make the backlit hair read on the outline: longer (4-6 mm), denser on the forearm and hand edges, and bright in backlight. Add knuckle and wrist crease normal detail and scale finger girth up about 10-15%. If changed, re-render 509-556 in one job so there is no pop at the 530|531 join. In any case, when b51 lands, check that the 530|531 join shows no shading or silhouette change on the hand (its frame-diff should match its neighbours).
INDEPENDENT VERIFIER: Confirmed, and I rate it higher than the reviewer. At f520-548 the hand is a smooth, hairless silhouette with no knuckle creases, veins or tendons, and long, slender, tapering fingers. The only masculine cue is the broad palm and wrist. In addition, at the entry (f516-524) only the fingertips glow, as small deep-red caps on otherwise dark-brown slender fingers. At half or phone scale these read uncomfortably like red-painted nails (see final_review/v2/tips.png), which is exactly the 'reads as a female hand' risk the binding rule forbids. The band low on the forearm at f548 reads more like a mannequin wrist edge than a man's shirt cuff. The brief lists thick fingers, knuckles, veins, hair and a cuff as part of the binding NO-WOMEN rule, and none of these is visible. Fix in sh04.py: thicken the fingers 10-15%, spread the SSS glow along the whole backlit rim (not just tip caps) or warm it toward orange, make the backlit hair fringe visible (longer and brighter in backlight), and add knuckle and wrist crease normals. Re-render 509-556 in one job so the 530|531 join with the pending b56 forearm re-render does not pop.
