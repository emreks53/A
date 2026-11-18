# THE MAN — `src/shared/man.js` (as built)

One stencil puppet, two skins (front / back), sponge-printed, 540 px tall in world px (feet y 1200, head top
y 660, x 540). Review scene: `--scene man` (`src/scenes/man.js`): every pose, zoom 1.5 pages, hands, passes
and a continuous acting test. Pure-maths check of all poses: `node out/man/poses.mjs`.

```js
import { makeMan } from '../shared/man.js';
const man = await makeMan(E);                 // bakes front (passes 1-3), back, back-warm; E.once keys 'man/…'
man.draw(ctx, t, { pose, warm = 0, p = 1, hands = null });   // world px, camera of plane 1.0 already applied
```

## Interface

| call | what it does |
|---|---|
| `man.POSES` | every named pose of storyboard §6 (+ `front_neutral`, `back_right_recoil`), complete pose objects |
| `man.mix(a, b, u)` | blend: every number lerps (u may overshoot, e.g. `E.ease.back.out`), `hand` / `flip` switch at u ≥ 0.5 |
| `man.track(keys, {overlap = 0})` | `[{t, v: pose, ease}]` → `(t) => pose`; segments ease with the ARRIVING key's ease (default cubic in-out). `overlap: 2` = the storyboard's overlap rule: upper arm on time, forearm 2 frames later, hand (wrist, shape) 2 frames after that — so an arm move ends 4 frames after its key |
| `man.reach(pose, 'L'｜'R', [wx, wy], opts)` | → pose in which that arm is solved so that the PALM CENTRE is on the world point |
| `man.point(name, pose, opts)` | → `[wx, wy]`: `palmL palmR wristL wristR elbowL elbowR shoulderL shoulderR chest neck head headTop hip footL footR` |
| `man.hand('L'｜'R', pose)` | → `{wrist, palm, rot, side, flip, shape}` (world px; `rot` = canvas angle of the hand's long axis) for props |
| `man.turn(t, t0 = 44/30)` | view value of the stepped turn when keyed by time: 0.2 / 0.4 / 0.6 / 0.8 on four frames, 1 from `t0 + 4 f` |
| `man.draw(ctx, t, {pose, warm, p, hands})` | paints him; extras for review scenes: `x, y` (root, default 540 / 1200), `scale`, `breath` (−1…1) |
| `man.prepare(skin, warm, stage)` | pre-bake another sprite set (`'front'`, 1, 3 …); sets that were not prepared are baked on first use |
| `man.drawHand(ctx, shape, x, y, {angle, flip, side, warm, scale})` | review helper: one hand alone |
| `man.G`, `man.HAND_SHAPES`, `man.REST_ARM`, `man.pose(partial)` | geometry numbers, `['rest','open','cupped','closed']`, the hanging arm, fill-in of a partial pose |

`'L'` / `'R'` are HIS left / right. Back view: R is on screen-right. Front view: R is on screen-left.
`opts` of `reach` / `point` / `hand`: `{x, y}` = another root than 540 / 1200 (only review scenes need it).

## The pose

```js
{ view: 1,                      // 0 front skin, 1 back skin; in between = the cross-dab turn (below)
  root: {x: 0, y: 0},           // px. x moves the HIPS (feet stay planted); y sinks the whole figure (dips)
  step: 0,                      // 0..1 half-step: his screen-right shoe goes 22 px to the right (use with root.x = 10)
  lean: 0,                      // deg, body roll about the hips (keep |lean| <= 1)
  sh: 0,                        // px, shoulder line shift toward screen-right (torso sheared, hem stays): +4 reach, -4 "turned right"
  shy: 0,                       // px, shoulders sink (settle of the nod)
  head: {pitch: 0, tilt: 0, turn: 0, x: 0, y: 0},
  armL: {a, fa, b, fb, w, hand, flip, pin}, armR: {…} }
```
* **Arm angles are degrees in the arm's own side frame**: `a` = upper arm, 0 straight down, +90 horizontally
  OUTWARD (away from the body on that arm's screen side), 180 up, negative = across the body. `b` = forearm
  relative to the upper arm, `w` = hand relative to the forearm. Identical numbers give mirrored arms.
* `fa`, `fb` (0.4…1) foreshorten upper arm / forearm: the 2.5-D way to say "points toward / away from us"
  (hand at his side, coin drawn in). The stencil is re-cut shorter over the same baked print — never squashed.
* `hand`: `'rest'` (relaxed, hanging: 27 × 56, the thumb a soft bulge on the body side) · `'open'` (the mitten 46 × 56 with a separate thumb) · `'cupped'`
  (palm up, seen from the side: thumb standing, finger tips curling up) · `'closed'` (fist). Silhouette swaps.
  `flip: ±1` mirrors the hand across its own axis (thumb side). Hand frame: X along the hand, +Y = thumb side;
  a hanging hand has +Y toward the body, a hand pointing outward has +Y pointing DOWN (so `'cupped'` opens upward
  with `flip: 1`, and an open hand has its thumb on top with `flip: -1`).
* `pin` (0…1): 1 = the palm stays exactly on its point while the shoulders breathe (set by `reach`); 0 = the arm
  hangs from the shoulder and breathes with it.
* **Head**: `pitch` deg, + = bowed. Front skin: the face slides down under a hair cap that shows more crown
  (6° ≈ 6 px at the chin). Back skin: a bow lifts the nape hairline and drops the crown (longer neck), a lift
  (negative) sinks the head onto the collar. `tilt` deg = roll, + = toward screen-right. `turn` −1…1 (back
  skin): + = turned to screen-right: the hair mass moves 4 px left, a sliver of cheek / jaw and the ear show on
  the right, the far ear hides. `x, y` px offsets.
* The **half-step** is `step: 1, root: {x: 10, y: 0}` (right shoe +22, hips +10; legs stay rigid and simply
  tilt). `back_release`, `back_follow_through` and `back_final_stand` carry it.
* Poses are plain objects of numbers (+ two discrete fields per arm), so `E.track` / `E.mix` also work on
  them, but only `man.mix` / `man.track` switch `hand` / `flip` at the half-way point and clamp sensibly.

### `reach(pose, which, [wx, wy], opts)`
`opts`: `hand` (shape), `flip`, `handAngle` (absolute, same convention as `a`: 90 = pointing outward
horizontally, 100 = a little upward) or `wrist` (relative, default 0), `elbow` (deg: force the upper-arm
direction — the forearm is then foreshortened as needed), `bend: 'out' | 'in'` (force a planar solution),
`pin` (default 1). Default solution: planar two-bone IK with the LOWER elbow; if that would push the elbow
across the body (`a < −16°`) the upper arm hangs (2°) and the forearm is foreshortened instead. Targets
farther than the arm (108 + 92 + palm 18…31 px from the shoulder joint) are approached as far as it goes.
The shoulder joint of the hanging stance is at world (540 ± 54, 773); `sh` moves both.

## view, the turn, warm, p

* `view` 0 / 1 pick the skin. Any value in between draws the storyboard's cross-dab: BOTH skins are composed
  and shown through one ordered set of sponge prints (the back skin through the prints that have landed, the
  front skin through the rest), with `scaleX = 1 − 0.4·sin(π·view)` (never below 0.6) and a dip of
  `4·sin(π·view)` px. The prints are stepped: `view < 0.1` front · `< 0.5` step 1 (≈ 37 % back) · `< 0.9` step 2
  (≈ 70 %) · else back. Key it on twos with `view: 1/3` (1.47), `2/3` (1.53), `1` (1.60) — as the act-1 stub
  does — or use `man.turn(t)` for a per-frame squash. Turn only with both arms hanging (figure window ±200 px).
* `warm`: `< 0.5` normal colours, `≥ 0.5` the lit state (top #CF6E48, trousers #63473A, one extra pass of light
  dabs, stronger light band on the arms). Stepped by the world.
* `p`: the opening dab-in, quantised to thirds: `1/3` dark base coat (stencil-sharp) · `2/3` + mid tones ·
  `1` + lit / shade dabs, edge prints and the arm light bands. `p <= 0` draws nothing.
* Breathing is inside `draw` (pure function of absolute `t`): shoulders, neck, head ±3 px with period 3.4 s,
  torso scaleY ±0.6 %. `man.point` returns the un-breathed position (pinned palms do not breathe).

## Draw order and the `hands` callback

1. shoes, legs, pelvis, neck, torso, head (front: face + ears, hair cap; back: cheek, ears, hair)
2. **`hands(ctx)`** — ctx is back in WORLD px (the caller's transform)
3. screen-left arm: hand, then upper arm + forearm (the cuff overlaps the wrist), then its shade / light bands;
   then the screen-right arm the same way.

So a thing drawn in `hands` lies in front of body and head and BEHIND both arms and hands: a coin whose centre
is on the palm is overlapped by the mitten (coin "in" the half-closed hand), a coin standing ON the cupped
palm (centre ≈ 46 px above the palm point) is overlapped by thumb and finger tips only. For "palm-out, coin
fully visible" (22.00) draw the coin after the man (`slots.front`). During turn frames `hands` is called
after the whole figure.

## Look (how it is built)

* Every part is a `bakeStencil` print baked at 2× world size (`man.BAKE`) and drawn at ½: razor-sharp at zoom 1.5
  and with `--ss 2`. Paint per part: dark base → dense mid tone with pores → fine mottling; torso, legs, head
  add an irregular lit patch upper right, a shade patch lower left and thin edge prints (shade inside the
  lower-left edge, light inside the upper-right edge). All parts of a garment share one fine dab size, so
  overlapping parts are statistically the same print: joints show no seam.
* Arms and hands turn, so their light is NOT baked: each arm group (upper arm + forearm) is composed in a
  scratch surface and gets a speckled dark band just inside the lower-left edge OF ITS UNION and a light band
  inside the upper-right edge, in world space (6 px, palette `man_arm_inner_edge`). This is what makes a
  forearm read on the torso (hand on chest, coin at side); it has no elbow seam and fades out at the shoulder,
  where the joint cap (r 17) melts into the torso. The torso's shoulder line is tangent to that cap.
* Scratch surfaces (`E.scratch`): `man:u / man:sh / man:li` (one arm's limb group: paint, shade stock, light
  stock) and `man:uh / man:shh / man:lih` (its hand), plus `man:tf / man:tb` on turn frames. Each has ONE fixed
  size (limb 528², hand 256² bake px) whatever the pose: the figure is baked at 2× and shown at ½ × zoom, where the
  browser resamples a canvas through mip levels of the whole canvas — a scratch whose size followed the pose (or
  the poses drawn before: engine scratches only grow) gave different pixels for the same frame depending on the
  render order (fixed at integration; `node out/world/integ.mjs det`).
* Parts: `torso(front|back) pelvis leg(±1) shoe(view:±1) neck face hairFront hairBack ear cheek upper fore
  hand(rest|open|cupped|closed)` + band stock for `upper fore hand`. Colours: `COL` in man.js (palette of the
  storyboard: #B4553A / #4A342A / #2E1F1B / #E0A47C / #3B2620, warm #CF6E48 / #63473A).

## Example for an act

```js
const M = W.man, P = M.POSES;
// 5.37-5.63: the right forearm rises, palm up at (688, 818); upper arm leads, forearm +2 f, hand +2 f, ~10 % overshoot
const pose = M.track([
  { t: 4.90, v: P.back_head_turned_right },
  { t: 5.37, v: P.back_head_turned_right },
  { t: 5.50, v: P.back_right_palm_up, ease: E.ease.back.out },     // + 4 frames of overlap = settled 5.63
  { t: 6.57, v: P.back_right_palm_up },
  { t: 6.80, v: P.back_look_at_empty_palm, ease: E.ease.sine.inOut },
], { overlap: 2 });
// a palm somewhere else (the 9 px dip when the hour lands):
const dipped = M.reach(P.back_right_palm_receive, 'R', [720, 839], { hand: 'cupped', handAngle: 94 });
// in slots.hands (drawn behind his fingers):
const [px, py] = M.point('palmR', pose(t));          // palm centre, world px
coin.draw(ctx, px, py - 46);                         // rests on the palm (720, 784)
```

## Limits (honest list)

* Flat puppet: no yaw. "Turned right" = head `turn` + `sh: -4`. The front skin ignores `head.turn`.
* The cross-dab turn expects hanging arms and has 4 in-between frames at most; held things are not handled in it.
* `'cupped'` is a side view (palm up); used with a strongly raised hand angle it reads as a hook — keep
  `handAngle` between about 85 and 110.
* Hand shapes swap, they do not morph; a swap is hidden best inside an arm move (it happens 4 frames after the
  upper arm starts when `overlap: 2`).
* Poses were authored for the default root (540, 1200); `reach` on a pose with `root.x` / `sh` already takes
  them into account (see `back_release`).
