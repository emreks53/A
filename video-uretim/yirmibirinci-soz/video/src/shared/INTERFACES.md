# Film architecture and module interfaces (written by the lead; binding for every team)

ONE scene renders the whole film: `src/scenes/main.js` (id `main`, duration 29.6 s). It draws the shared
WORLD for every frame of the painted film and lets small per-team modules add their own things in fixed
layer slots. Because both acts draw on the same world object with absolute time, there is no seam at 12.20.
Time is ABSOLUTE video time in seconds everywhere (never act-local time).

Sources of truth: `/home/user/work/storyboard.json` (numbers; twin `storyboard.md`), `/home/user/work/BIBLE.md`
(rules), `/home/user/work/video/ENGINE.md` (engine API). The render tool serves `/home/user/work` as web root,
so `fetch('/storyboard.json')` works (as `E.timing` does for `/timing.json`).

## Files and owners (edit only what you own; ask for the rest through your final report)

| file | owner | content |
|---|---|---|
| `src/engine/*`, `tools/render.mjs`, `ENGINE.md` | engine team | do not edit; it may still receive look refinements |
| `src/shared/world.js`, `src/shared/layout.js`, `src/shared/WORLD.md` | world builder | shared world, camera, state timelines |
| `src/shared/man.js`, `src/shared/MAN.md` | man builder | the man: rig, two skins, hands, all named poses |
| `src/scenes/main.js`, `src/acts/index.js` | world builder | the film scene and the act registry |
| `src/acts/act1.js` (+ `src/acts/act1/*`) | act-1 team | everything act 1 adds, 0.00–12.20 |
| `src/acts/act2.js` (+ `src/acts/act2/*`) | act-2 team | everything act 2 adds, 12.20–23.80, incl. the cream cover |
| `src/acts/endcard.js` (+ `src/acts/endcard/*`) | end-card comp team | 23.80–29.60: primer plate → photoreal plate + source text |

## `src/shared/man.js`

```js
export async function makeMan(E)   // -> man   (bake everything here; use E.once keys prefixed 'man/')
man.POSES            // { front_neutral_bowed, front_hand_on_chest, back_neutral, ... } every pose of storyboard §6
man.mix(a, b, u)     // pose blend (angles lerp; discrete things such as hand shape / view switch at u >= 0.5 unless documented)
man.track(keys)      // [{t, v: pose, ease}] -> (t) => pose   (wrapper of E.track that understands poses)
man.reach(pose, 'L' | 'R', [wx, wy], opts) // -> pose with that arm solved by IK so the PALM CENTRE lands on the world point
man.point(name, pose, opts)   // -> [wx, wy] world position of 'palmL' | 'palmR' | 'chest' | 'headTop' | 'neck' | 'shoulderL' | 'shoulderR'
man.draw(ctx, t, { pose, warm = 0, p = 1, hands = null })
```
* World coordinates: the caller has already applied the camera for the subject plane (parallax 1.0).
  Default root: x 540, feet y 1200, 540 px tall (head top y 660). A pose may carry a root offset
  (`pose.root = {x, y}`, e.g. the half-step: +10 px) — `opts` of reach/point is `{}` unless documented.
* 'L' / 'R' are the man's own LEFT / RIGHT. In BACK view his right hand is on screen-right, in FRONT view on
  screen-left. Storyboard texts say "(screen-left arm)" etc. — follow those.
* `pose.view`: 0 = front skin, 1 = back skin; values in between = the stepped cross-dab turn of the storyboard
  (1.47 / 1.53 / 1.60: front dabs out while back dabs in, 4 px dip, scaleX 1 → 0.6 → 1). man.js implements it.
* `warm`: 0 = normal colours, 1 = lit state from 10.07 (storyboard: top #CF6E48, trousers #63473A, one extra
  pass of light dabs). The world passes it (stepped).
* `p`: opening dab-in progress of the whole figure (three passes: dark base / mid tones / lit dabs at
  0.13 / 0.20 / 0.27). The world passes it.
* `hands(ctx)`: optional callback, called between the body layers and the FRONT arm layers so that a thing
  held in a hand (deed, coin) is overlapped correctly by fingers / thumb. Document exactly which parts are
  drawn before and after it in MAN.md.
* Shared breathing (storyboard `shared_motion`) is applied inside `draw` as a pure function of absolute `t`.
* **As built** (details: `MAN.md`): `man.track(keys, { overlap: 2 })` applies the storyboard's overlap rule (upper
  arm on the key, forearm + 2 f, hand + 2 f — an arm move is complete 4 frames AFTER its key); `man.point` also
  knows `wristL/R elbowL/R head hip footL/R`; `man.hand('L' | 'R', pose)` gives wrist / palm / direction for
  props; `POSES` has two extra poses (`front_neutral`, `back_right_recoil`). The turn is keyed BY THE ACT:
  `pose.view` 1/3 at 1.47, 2/3 at 1.53, 1 from 1.60, with both arms hanging (see the act-1 stub). On those turn
  frames `hands(ctx)` is called after the whole figure. A pose is a plain object of numbers (+ `hand`, `flip`
  per arm); never blend poses with anything but `man.mix` / `man.track`.

## `src/shared/world.js`

```js
export async function makeWorld(E)           // -> W   (creates the man through makeMan)
W.layout                                     // numbers of storyboard.json (layout, cameras, palette…), plus helpers
W.man                                        // the man object above
W.cam(t)                                     // camera of the whole film: storyboard camera_path + shared drift
W.toScreen(x, y, t, parallax = 1)            // world/layer point -> frame px at time t
W.withPlane(ctx, t, parallax, fn)            // run fn with the camera transform of that plane applied
W.wall                                       // the bare primer wall surface (frame-sized) — also used by the cover / end card
W.draw(ctx, t, { pose, slots = {} })         // paints every shared layer in stack order (storyboard §2 "Layer stack")
```
`W.draw` implements exactly the "State timeline of every shared asset, 0–24 s" (storyboard §5): no act ever
hard-codes a state. It calls the slot callbacks between layers, each already inside the right camera transform:

| slot | plane | called | typical content |
|---|---|---|---|
| `slots.back(ctx, t)` | 1.0 | **added by the world builder:** after the small cloud, BEFORE today's sun | things that must lie behind today's disc (course dots k = 14–16 sit inside it) |
| `slots.sky(ctx, t)` | 1.0 | after today's sun (+halo, annulus), before the far layers | course dots, yesterday's sun, veil cloud, clock-hand, hour-beads |
| `slots.far(ctx, t)` | 0.7 | before the far ridge | deepened sky surround, the far light |
| `slots.mid(ctx, t)` | 1.0 | after the mist bank, before the mound | knoll, warm base mist, light-beads, chest / mescid, spill, rug |
| `slots.hands(ctx, t)` | 1.0 | inside `man.draw` (between body and front arm) | deed, coin while held |
| `slots.front(ctx, t)` | 1.0 | after hedge and flowers | coin in flight, niche bloom, glints, crumble specks |
| `slots.top(ctx, t)` | screen | last (after ambient specks), before the wall-grain finish | the cream cover |

**As built** (details: `WORLD.md`): the world also exposes `W.state(t)` — every shared state of the timeline as
plain numbers (`.sun.visible`, `.sun.recede`, `.ring.strength`, `.mist.p`, `.mound.lit`, `.man.warm` …): ask it
instead of hard-coding a time —, `W.planes`, `W.boxes`, `W.sprites` and `W.lightFloor` (world y ≈ 1203: while a
gloss is up nothing lighter than hedge_mid may reach below it). The world creates the man with a static
`import { makeMan } from './man.js'` (the placeholder is gone), draws him between the mound and the hedge with
the stepped `warm` / `p` of the timeline, and keeps the ambient specks clear of his head.

## `src/acts/*.js` — an act module

```js
export default {
  id: 'act1', from: 0, to: 12.2,              // act2: from 12.2, to 23.8
  async init(E, W) {},                        // bake own assets (E.once keys prefixed with the act id)
  release(E) {},                              // drop them (main releases an act ~1 s after its range)
  pose(t, W) { return W.man.POSES.back_neutral; },   // the man's pose at absolute time t (W.man.track / mix / reach)
  slots: { sky(ctx, t, W) {}, far(ctx, t, W) {}, mid(ctx, t, W) {}, hands(ctx, t, W) {}, front(ctx, t, W) {}, top(ctx, t, W) {} },
};
```
Any slot may be omitted (`back` is the seventh, see the table above). Slots and `pose` are called as METHODS
of the act module (`this` = the module: keep your bakes and tracks on it), each slot inside `ctx.save()` /
`restore()`. `src/acts/act1.js` / `act2.js` are STUBS until the act teams replace them: they draw nothing and
only walk the man through the storyboard's beats with the named poses (a starting point for the real acting).
A slot draws in the coordinates of its plane (world px for 1.0; layer px for 0.7;
frame px for `top`). An act never draws shared assets and never changes shared state; if a shared timeline
needs a change, report it to the lead.

## `src/scenes/main.js`

* id `main`, duration 29.6, `finish: false` (it calls `E.finish(ctx)` itself after the world while t < 23.8),
  custom gloss list from storyboard (`sahipsin` 7.14–8.35, `en az` 12.55–13.95, `gelecek` 17.14–18.72,
  `âhirete ait sandıkçık` 18.92–20.95).
* `prepare(t)`: lazily `init`s the act whose range contains t (0.6 s ahead) and releases acts that are more
  than 1 s away, so a render worker never holds both acts' bakes for long.
* `draw`: t < 23.8 → `W.draw(ctx, t, {pose: act.pose(t, W), slots: act.slots bound with W})`, then `E.finish`.
  t ≥ 23.8 → `endcard.draw(ctx, t, E, W)` only (the end-card module paints the full frame itself, starting
  from the bare primer plate `W.wall` + finish exactly as the 2D film leaves it at frame 714).
* Preview of a part: `node tools/render.mjs video --scene main --from 0 --to 12.2 …`.

## Rendering etiquette (4 CPU cores shared by several teams)

Prefer `sheet` and `--scale 0.5` previews; full-res stills only for texture judgement; `video` with
`--workers 2`; never leave a server / browser / ffmpeg running; write test output only under
`video/out/<your-team>/`. Redirect long tool output to files and read the tail.

**Render-order independence (checked at integration: `node out/world/integ.mjs det`).** Every frame must come
out the same whatever was drawn before it — the render workers pull chunks in any order. One trap is known:
`E.scratch(w, h, slot)` surfaces only ever GROW, and the browser resamples a canvas that is drawn below ~0.7x
(`imageSmoothingQuality` medium / high) through mip levels of the WHOLE canvas. So if you draw a scratch surface
onto the frame at less than ~0.7x of its own resolution (anything baked oversampled), ask for ONE fixed scratch
size per slot name, never a size that follows the pose or the shape (man.js does this for its arm layers).
Drawn at about 1:1 (the usual case, also `E.drawStencil` with an `edge`) a scratch is safe.

**Render gate (MANDATORY for every render):** `/home/user/work/video/tools/r.sh <same args as render.mjs>`
— at most 2 renders run at once machine-wide and a render starts only when enough memory is free; extra calls
wait their turn (if a render seems to hang it is waiting; starts are staggered by 8 s). ANY other command that
opens a browser or renders (a node harness, `tools/lab.mjs`, a check script) goes through
`/home/user/work/video/tools/slot.sh <command…>`. Never call `node tools/render.mjs` directly and never run two
renders of your own at once: the machine has 16 GB without swap and was already restarted once by memory
exhaustion (all work in progress was killed). r.sh caps a video at 2 workers and a FULL-SIZE video (`--scale 1`,
supersampled) at 1 worker. The standard motion preview is `video --scale 0.5 --ss 2` (with voice: `--audio
/home/user/work/audio/voice_trim.wav`); the standard style check is `still --ss 2`; use `sheet` for overviews.
Full-size video excerpts only when really needed, and at most 3 s long.
