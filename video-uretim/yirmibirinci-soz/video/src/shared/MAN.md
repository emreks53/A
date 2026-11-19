# THE MAN — `src/shared/man.js` (as built)

One stencil puppet, two skins (front / back), sponge-printed, 540 px tall in world px (feet y 1200, head top
y 660, x 540). Review scene: `--scene man` (`src/scenes/man.js`): every pose, zoom 1.5 pages, the two turn
drawings, hands, passes and a continuous acting test. Pure-maths check of all poses (palms, elbows, wrists, and
the reaches the acts make with their own options): `node out/man/poses.mjs`.

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
| `man.draw(ctx, t, {pose, warm, p, hands})` | paints him; extras: `squash: {sx, dip}` (the body narrowed to `sx` about the root, the hips sunk `dip` px — the world eases the turn with it, see "the turn"), and for review scenes `x, y` (root, default 540 / 1200), `scale`, `breath` (−1…1) |
| `man.prepare(skin, warm, stage)` | pre-bake another sprite set (`'front'`, 1, 3 …); sets that were not prepared are baked on first use |
| `man.drawHand(ctx, shape, x, y, {angle, flip, side, warm, scale})` | review helper: one hand alone |
| `man.G`, `man.HAND_SHAPES`, `man.REST_ARM`, `man.pose(partial)` | geometry numbers, `['rest','open','cupped','closed','flat','hold']`, the hanging arm, fill-in of a partial pose |

`'L'` / `'R'` are HIS left / right. Back view: R is on screen-right. Front view: R is on screen-left.
`opts` of `reach` / `point` / `hand`: `{x, y}` = another root than 540 / 1200 (only review scenes need it).

## The pose

```js
{ view: 1,                      // 0 front skin, 1 back skin; in between = the turn drawings (below)
  root: {x: 0, y: 0},           // px. x moves the HIPS, y sinks them (dips) — the FEET stay planted on the ground line, the legs give
  step: 0,                      // 0..1 half-step: his screen-right shoe goes 22 px to the right (use with root.x = 10); on the way
                                // (0 < step < 1) the shoe is off the ground, up to 7 px at step 0.5 — it lifts and lands, it does not slide
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
* `hand`: `'rest'` (relaxed, hanging, seen edge-on: 25 × 52 beyond the cuff, the thumb a soft bulge on the body side) ·
  `'open'` (the mitten: fingers together as one tapered block 26 wide, a short round thumb standing off at 45°;
  42 × 57 with the thumb) · `'cupped'` (palm up, seen from the side: a shallow bowl — thick heel, the thumb a low lobe
  near the wrist, the fingers rising gently to the tip) · `'closed'` (fist) · `'flat'` (laid flat on something — the
  chest: fingers together as ONE tapered shape, the thumb a low bump along the index finger) · `'hold'` (half closed
  round a thing held at his side, seen from the back of the hand). Silhouette swaps; all about 0.75 of the head's
  height long, as on a real figure.
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
  tilt). `back_release`, `back_follow_through` and `back_final_stand` carry it. While `step` travels from 0 to 1 the
  stepping shoe leaves the ground (`7·sin(π·step)` px, `G.stepLift`) and its leg shortens by as much; a body dip
  (`root.y`) is taken up by both legs. The shoes are in sight above the grass now, so nothing of this is hidden.
* Poses are plain objects of numbers (+ two discrete fields per arm), so `E.track` / `E.mix` also work on
  them, but only `man.mix` / `man.track` switch `hand` / `flip` at the half-way point and clamp sensibly.

### `reach(pose, which, [wx, wy], opts)`
`opts`: `hand` (shape), `flip`, `handAngle` (absolute, same convention as `a`: 90 = pointing outward
horizontally, 100 = a little upward) or `wrist` (relative, default 0), `elbow` (deg: force the upper-arm
direction — the forearm is then foreshortened as needed), `fa` (foreshortening of the upper arm that goes with a
forced `elbow`, default 1), `bend: 'out' | 'in'` (force a planar solution), `pin` (default 1).
Default solution: planar two-bone IK with the LOWER elbow. **The upper arm never lies on the torso** (the forearm
would seem to grow out of his waist) — it stays where it hangs in the rest pose, with sky between arm and waist:
* by itself it never swings inward of the hanging arm (`a = 11°`, `HANG` in man.js) — where the planar solution would
  (`a < 11`), the upper arm stays at 11° and the forearm is foreshortened instead (continuous with the planar solution
  at `a = 11`). `back_right_palm_up`, `back_look_at_empty_palm`, `back_right_palm_receive`, `back_release` are such
  arms (forearm 0.74…0.95 of its length);
* a forced `elbow` below 3° while the hand is out at his side is replaced by the upper arm of "held at his side"
  (`elbow: 11, fa: 0.84`, `SIDE_ARM` in man.js: it hangs outside the torso silhouette exactly as in the rest pose, the
  elbow drawn back a little — 17 px higher —, the forearm foreshortened toward the side and sloping down to the
  hand). So `elbow: -10` — as older calls have it — gives that arm; the palm lands on the same point.
Targets farther than the arm (108 + 92 + palm 18…31 px from the shoulder joint) are approached as far as it goes.
The shoulder joint of the hanging stance is at world (540 ± 54, 773); `sh` moves both.

## view, the turn, warm, p

* `view` 0 / 1 pick the skin. Any value in between is the TURN, a paper-cut turn in two designed in-between
  drawings — never a mix of the two skins: `view < 0.1` front · `< 0.5` drawing 1, **three-quarter front** (the
  face slid toward screen-left, the hair mass grown round the right side, one ear; front torso with the collar
  opening shifted left) · `< 0.9` drawing 2, **three-quarter back** (the hair mass, a sliver of cheek and the
  ear at the left; back torso with a closed collar) · else back. He turns toward screen-left (where the first glow
  is). On both drawings the BODY (legs, pelvis, torso, arms) is shown narrowed about the root with
  `scaleX = 1 − 0.4·sin(π·view)` (0.65 at 1/3 and 2/3, never below 0.6) and the whole figure dips
  `4·sin(π·view)` px (hips and everything above; the feet stay on the ground); neck and head are NOT narrowed — they
  are their own stencil shapes (`TURN_HEAD` in man.js: skin patch, hair mass, ear, neckline). Key it on twos with
  `view: 1/3` (1.47), `2/3` (1.53), `1` (1.60) — as act 1 does — or use `man.turn(t)` for a per-frame squash. Turn only
  with both arms hanging.
  **In the film the WORLD eases the turn frame by frame** (critics round; `TURN_EASE` in world.js, only when the act
  supplies the pose): body width / dip on frames 43 … 48 = 0.90 / 1 · 0.77 / 3 · 0.64 / 4 · 0.64 / 4 · 0.77 / 3 ·
  0.90 / 1 (front skin on 43, drawing 1 on 44–45, drawing 2 on 46–47, back skin from 48, full width from 49), and on
  frame 45 drawing 2 is dabbed over drawing 1 through a sponge mask at one half (`E.drawThrough`) — the cross-dab's
  middle state. No frame changes the silhouette by more than about a fifth.
* `warm`: `< 0.5` normal colours, `≥ 0.5` the lit state. It is an ADDED light, not a lift of the whole garment
  (critics round): the brick coat stays as the ground and shows in the pores and gaps of an orange coat (#CF6E48)
  dabbed over it (about a sixth of the surface), the shade prints are brick again, and the light is one pass of
  peach-orange dabs (#E48A5C, a few #F0A478) on the upper right shoulder / back only — the side of the sun; the arms'
  light band is peach-orange too. Trousers #63473A, skin and hair one small step lighter. Stepped by the world.
* `p`: the opening dab-in, quantised to thirds: `1/3` dark base coat (stencil-sharp) · `2/3` + mid tones ·
  `1` + lit / shade dabs, edge prints and the arm light bands. `p <= 0` draws nothing.
* Breathing is inside `draw` (pure function of absolute `t`): shoulders, neck, head ±3 px with period 3.4 s,
  torso scaleY ±0.6 %. `man.point` returns the un-breathed position (pinned palms do not breathe).
* **Head pitch from behind** (so that 5–8° read at HOME scale without a nodding doll): a bow lifts the nape
  hairline 0.8 px per degree (a longer neck) and drops the crown 0.45 px per degree; a lift sinks the head onto
  the collar by 0.9 px per degree (at −5° the neck is a 4 px sliver) and lowers the crown 0.3 px per degree. The
  ears stay where they are while the hair mass changes round them (they drift 1 px at most). Front skin: unchanged
  (the face slides down under the hair cap).

## Draw order and the `hands` callback

1. shoes, legs, pelvis, neck, torso, head (front: face + ears, hair cap; back: cheek, ears, hair)
2. **`hands(ctx)`** — ctx is back in WORLD px (the caller's transform)
3. screen-left arm: the tone it casts on the torso (only when forearm or hand lie on the torso), its hand, then
   upper arm + forearm (the cuff overlaps the wrist), each with its shade / light prints; then the screen-right arm
   the same way.

So a thing drawn in `hands` lies in front of body and head and BEHIND both arms and hands: a coin whose centre
is on the palm is overlapped by the mitten (coin "in" the half-closed hand), a coin standing ON the cupped
palm (centre ≈ 46 px above the palm point) is overlapped by thumb and finger tips only. For "palm-out, coin
fully visible" (22.00) draw the coin after the man (`slots.front`). During turn frames `hands` is called
after the whole figure.

## Look (how it is built)

* **Critics round (the figure as a human, the paint as paint).** Front view: the hair has mass (a short cut 7 px
  above the skull, the hairline low on the forehead, side volume down to the ear line), small ears under it, a real
  neck between jaw and a round crew neck, the skin painted like his clothes (darker ground in the pores, a lighter
  dab pass on the side of the light, a soft shade pass — still a plain, featureless face). Back view: the hair mass
  ends in a curved nape hairline narrower than the head, the ears stand 5–6 px clear of it, the nape is lit skin.
  The hanging arm is 18 px shorter than the reach length (the relaxed forearm is drawn foreshortened, `REST` = `{a: 11,
  fa: 1, b: −12.2, fb: 0.8}`: elbow where it was, wrist at the crotch line, palm centre y 975, finger tips on the upper
  thigh; reaches use the full lengths, every palm target is unchanged). He has
  FEET: shoes 43 px wide (toe caps, turned out a little) / 37 px (heels from behind), 19 px of upper under a wider
  trouser hem; the world's grass overlaps only their soles. Dark shapes (hair, trousers, shoes) show the wall's
  cream primer in their pores (real pores of the coat, the primer at about 50 % over the dark ground — never white
  flecks) and carry a second-tone dab pass (`paint(…, {primer, second})`).

* Every part is a `bakeStencil` print baked at 2× world size (`man.BAKE`) and drawn at ½: razor-sharp at zoom 1.5
  and with `--ss 2`. Paint per part: dark base → dense mid tone with pores → fine mottling; torso, legs, head
  add an irregular lit patch upper right, a shade patch lower left and thin edge prints (shade inside the
  lower-left edge, light inside the upper-right edge). All parts of a garment share one fine dab size, so
  overlapping parts are statistically the same print: joints show no seam.
* Arms and hands turn, so their light is NOT baked: each arm group (upper arm + forearm) is composed in a
  scratch surface and gets its shade just inside the lower-left edge OF ITS UNION and a light print inside the
  upper-right edge, in world space. The shade is a tone that thins out, never a ruled line: a narrow close print
  (3.6 px on limbs, 2.6 px on hands) with a wider fringe of loose dabs behind it (9 / 6.5 px); the light is a lacy
  print (6 / 4.4 px). No elbow seam; all three fade out at the shoulder, where the joint cap (r 17) melts into the
  torso. The torso's shoulder line is tangent to that cap.
* A forearm or hand that lies ON the torso (hand on chest, a forearm crossing the waist) reads in front of it
  through TONE, not outline: before the arm is drawn, two porous prints of the forearm + hand silhouette are
  printed on the torso, shifted to the lower left (the light comes from the upper right) and cut to the torso's
  own stencil (`castShadow`, palette `cast`). A hanging arm casts nothing.
* Trousers break on the shoe 19 px above the sole (hem 31 px wide); the shoe is a low dome on a flat sole with
  round corners (toe cap in the front skin, a narrower heel with the shoe's outer side beyond it in the back skin).
  Legs and shoes are clean stencil shapes down to the sole line (y 1203.5); the hedge lip in front of him is the
  world's (its grass overlaps the soles only).
* Scratch surfaces (`E.scratch`): `man:u / man:sh / man:li` (one arm's limb group: paint, shade stock — also the
  cast tone —, light stock) and `man:uh / man:shh / man:lih` (its hand). Each has ONE fixed
  size (limb 528², hand 256² bake px) whatever the pose: the figure is baked at 2× and shown at ½ × zoom, where the
  browser resamples a canvas through mip levels of the whole canvas — a scratch whose size followed the pose (or
  the poses drawn before: engine scratches only grow) gave different pixels for the same frame depending on the
  render order (fixed at integration; `node out/world/integ.mjs det`).
* Parts: `torso(front|back|turn1|turn2) pelvis leg(±1) shoe(view:±1) neck(front|back) face hairFront hairBack ear cheek
  turnSkin(1|2) turnHair(1|2) upper fore hand(rest|open|cupped|closed|flat|hold)` + stock prints (`sh` shade core,
  `sf` shade fringe, `li` light, `cs` / `cf` cast tone) for `upper fore hand`. Colours: `COL` in man.js (palette of the
  storyboard: #B4553A / #4A342A / #2E1F1B / #E0A47C / #3B2620, warm #CF6E48 / #63473A).

## Last fix round (round 3), as built

* **Shoes.** One clean rounded cap per shoe, printed IN FRONT of the trouser hem (they used to lie behind the leg and stood
  out on both sides of the hem — two lobes with a notch: a cloven hoof). Front view: the toe cap, a low dome 48 x 20 px
  (70 x 29 on screen at CLOSE) on a flat sole line, a little longer on the outer side; back view: the same shoe from
  behind, the heel, 42 px wide. Warm leather brown `#6E472F` (warm state `#8A5B3A`): a step lighter and warmer than the
  trousers (`#4A342A` / `#63473A`). The hedge's grass still overlaps the sole only.
* **Pores of dark fills (D2 revised).** Hair, trousers and shoes: the pores and flecks are a lighter tone of the SAME hue
  (the fill's colour x (1 + primer): hair `#3B2620` → `#5A3A31`), small and dense (`poreScale` 0.6) — never cream.
  The paint option is still called `primer`.
* **Front hair.** The side hair ends at the top of the ears (y −30 round the head pivot) in a blunt rounded corner; no
  downward points at the temples.
* **Head pitch, back view.** Up to 10 degrees as before. Beyond that a real NOD: the crown drops 0.9 px per further
  degree and the hair mass is seen shorter (down to 0.74 of its height at 22 degrees). Act 1's «bil»: pitch 12 → 22,
  `head.y` 3 → 7, `shy` 2 → 7 = 15 px of hair-top travel (frames 346–350), held to 352, level on 358.

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
* The turn has two in-between drawings and expects hanging arms; held things are not handled in it (`hands` is
  called after the whole figure). Its body is a narrowed front / back body, not a drawn profile.
* Named poses that changed in polish round 1 (same palm targets): `front_hand_on_chest` uses `'flat'`,
  `back_coin_held_at_side` / `back_turned_right` use `'hold'` with the arm of "held at his side" (above),
  `back_coin_shown` / `back_wind_up` the same upper arm with an open hand; every pose whose upper arm used to hang
  at 0…8° (palm up, look at palm, receive, release) now keeps it at the rest angle of 11°.
* A hand held very close to his side (act 2's `SHOWN` / `WIND` targets, 35…45 px beside the hip) leaves the forearm
  only its shortest length (0.34): it points almost straight down and the open hand is bent 70° at the wrist. Under
  the coin this is hidden; without a coin such a pose would read as a kinked wrist.
* `'cupped'` is a side view (palm up); used with a strongly raised hand angle it reads as a hook — keep
  `handAngle` between about 85 and 110.
* Hand shapes swap, they do not morph; a swap is hidden best inside an arm move (it happens 4 frames after the
  upper arm starts when `overlap: 2`).
* Poses were authored for the default root (540, 1200); `reach` on a pose with `root.x` / `sh` already takes
  them into account (see `back_release`).
