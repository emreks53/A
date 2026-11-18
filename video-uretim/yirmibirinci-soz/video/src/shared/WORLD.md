# WORLD.md — the shared world, as built (owner: world builder)

`src/shared/world.js` paints everything the storyboard marks "both (shared: build once)" for any absolute
time 0–24 s, owns the camera of the whole film and calls the acts' slots in the right place. An act never
draws a shared asset and never hard-codes a shared state: ask `W.state(t)`.
Numbers live in `src/shared/layout.js` (= `/storyboard.json`, loaded once); nothing else copies them.

```js
const W = await makeWorld(E)                 // main.js does this once: E.once('world', …)
W.layout                                     // storyboard numbers + helpers (below); also called L here
W.man                                        // the man of src/shared/man.js (interface: MAN.md)
W.wall                                       // bare primer wall, 1080x1920 surface: E.blit(ctx, W.wall, 0, 0)
W.cam(t)                                     // {x, y, zoom, rot}: storyboard camera path + shared drift
W.toScreen(x, y, t, parallax = 1)            // world / layer px -> frame px at time t
W.withPlane(ctx, t, parallax, fn)            // run fn with that plane's camera transform applied
W.state(t)                                   // every shared state as plain numbers (below)
W.draw(ctx, t, { pose, slots = {} })         // the whole shared picture; call it in FRAME coordinates
W.planes                                     // { sky 0.15, cloud 0.3, far 0.7, ridge 0.5, mist 0.7, specks 1.2 }
W.boxes  W.sprites                           // baked layer rectangles / sprites (inspection, tests)
W.lightFloor                                 // world y: nothing lighter than hedge_mid may reach below it while a gloss is up
```

## Layer stack and slots (what is already on screen when your slot runs)

| # | plane | what the world draws | then calls |
|---|---|---|---|
| 1 | 0 / 0.15 | wall primer; sky dabs (complete from frame 0) | |
| 2 | 1.0 | zone tints: dusk passes (left third), pre-dawn wash (right third) | |
| 3 | 0.3 | small cloud c1 (from 0.07) | **`slots.back`** (1.0) — *extension*: behind today's sun |
| 4 | 1.0 | today's sun from 8.77: warm sky pass, cobalt annulus, halo passes, disc, recede veil | **`slots.sky`** (1.0) |
| 5 | 1.0 | tomorrow's dashed ring (+ its crumble specks), light column | **`slots.far`** (0.7) |
| 6 | 0.5 / 0.7 | far ridge (opaque below its crest); mist bank | **`slots.mid`** (1.0) |
| 7 | 1.0 | the mound (lit from 10.07); the man — **`slots.hands`** inside `man.draw`; hedge; leaf rosettes, buds / flowers | **`slots.front`** (1.0) |
| 8 | 1.2 / screen | ambient specks (only where screen y < 1190) | **`slots.top`** (frame px) |

main.js then applies `E.finish(ctx)`; the engine draws the glosses.

* A slot is `(ctx, t, W)` in your act module; it is called with the plane's camera transform already
  applied and wrapped in `ctx.save()/restore()`. Draw in WORLD px (plane 1.0), LAYER px (`far`, 0.7) or
  FRAME px (`top`). Never call `W.draw` or apply the camera yourself inside a slot.
* `slots.sky` runs AFTER today's disc. Things that must sit behind today's sun (the course dots near the
  apex: k = 14, 15, 16 lie inside the disc) go into `slots.back`, or are simply not drawn while
  `W.state(t).sun.visible` — the veil cloud covers them before 8.77 anyway.
* `slots.sky` is in front of the cobalt annulus and of the recede veil: hour-beads and clock-hand take
  their own receded variants at `L.T.sun.recede` (16.83 / 16.93), as the storyboard says.
* `slots.far` is behind the far ridge (opaque from its crest + 20 px down) and behind the mist bank.
* `slots.mid` is behind the mound, the man and the hedge (the hedge is opaque from lip + 9 px down, with
  a 13 px sponge fringe above the lip line `L.lip(x)`); `slots.front` is in front of everything painted.
* Other planes: `W.withPlane(ctx, t, parallax, fn)` from `slots.top` (frame space) — or compute points
  with `W.toScreen(x, y, t, parallax)`.
* Gloss windows: nothing you draw may be lighter than hedge_mid below screen y 1222 while a gloss is up
  (`L.gloss.windows`); in world px that row is `W.lightFloor` (≈ 1203: the YARIN framing at zoom 1.15 puts
  world y 1204 on screen row 1222, drift included). Above it you are free.
* world.js itself uses no engine scratch surface and no `E.drawThrough`; you may use them in your slots.

## `W.state(t)` — the shared timeline (storyboard §5), frame-snapped

```js
{ coat2,                       // hedge / mound second coat, rosettes, buds, cloud c1 are on (0.07)
  man:   { p, warm },          // p = opening dab-in 0, 1/3, 2/3, 1 (0.13 / 0.20 / 0.27); warm 0 | 1 (10.07)
  specks,                      // ambient specks running (0.27)
  cloud: { visible, x, y },    // layer px (parallax 0.3)
  dusk:  { sunset0, sunset1, dusk1, dusk2, recede },          // booleans; recede 0..2
  mist:  { build 0..2, thick 0..3 (1 after 16.47), recede 0..2, thinned, out 0..3, p (1 → 0 while it cross-dabs out), dx },
  ring:  { dashes 0..14, strength 0..1 (1 / .8 / .55 / .35 / .7 / 0), crumble 0..3, p, visible },
  sun:   { visible (8.77), bare (9.17), blaze (9.57), halo 0..3, settle 0..4, recede 0..2,
           haloR (0 | 190 | 250 | 300 | 170 | 150), annulus 0..1, breath (halo scale now),
           core, mid, rim, peach, white, warmSky },           // which halo prints are on
  column:{ on 0..1, p, leaving },
  mound: { lit },              // 10.07
  flowers: [{ id, open, tau }] // f1..f6; tau = seconds since it opened
}
```
Typical uses: `W.state(t).ring.strength` (what crumbles at 16.57), `.sun.visible` (unveil), `.sun.recede`
(dim your beads), `.mist.p` (cross-dab your knoll in while it is < 1), `.mound.lit`, `.man.warm`.

## `W.layout` (L) — numbers and helpers

* time: `L.fps`, `L.fr(t)` frame index, `L.ft(t)` exact frame time of a storyboard time (4.17 → 125/30),
  `L.on(t, tEvent)` (has the stepped event happened?), `L.count(t, [times])`, `L.T` (the shared timeline:
  `T.coat2, T.man.{passes, turn, warm}, T.dusk, T.mist, T.ring, T.sun.{disc, bare, halo, settle, recede},
  T.column, T.mound, T.film`).
* geometry (world px): `L.lipY`, `L.lip(x)`, `L.mound.{x0, x1, topY, top(x), lit}`, `L.crest(x)` (ridge layer
  px), `L.man` (storyboard `layout.man`), `L.sun {x, y, r, halo, annulus}`, `L.yesterday`, `L.ring {x, y, r,
  dashes, stroke}`, `L.arc {y(x), dots, dotR, leftFoot, apex, rightFoot}`, `L.flowers [{id, i, x, y, r,
  opens}]`, `L.buds`, `L.veil`, `L.cloud`, `L.mist.box`, `L.zones`, `L.hours`, `L.coin`, `L.deed`,
  `L.farLight`, `L.knoll`, `L.lightBeads`, `L.chest`, `L.mosque`, `L.rug`, `L.layout` (the raw `layout` object),
  `L.sb` (the whole storyboard).
* gloss / safe: `L.gloss {y0, y1, baseline, calmScreen, calmWorld, windows}`, `L.glossList`, `L.safe`.
* camera: `L.cameras` / `L.framing('ACT2')` → `{x, y, zoom, rot}`, `L.camKeys`, `L.camPath(t)` (no drift),
  `L.cam(t)` (= `W.cam`), `L.toScreen(camOrName, x, y, parallax)`, `L.toWorld(camOrName, sx, sy, parallax)`,
  `L.visibleRect(parallax, margin)` (layer rectangle that can ever be on screen: bake that much).
* colour: `L.pal('hedge_dark')`, `L.pal('dusk', 1)`, `L.palette`.
* shared motion: `L.motion.breath(t)` → `{dy, sy}`, `.haloBreath(t)`, `.farLightBreath(t)`,
  `.flowerSway(i, t)` → `{rot, dx}`, `.cloudX(t)`, `.mistDx(t)`, `.specks`, `.drift`.

## Notes on the shared assets

* The man is drawn by the world: `man.draw(ctx, t, { pose: act.pose(t, W), warm, p, hands })`. Return a
  pose for every t of your range; for the turn give `pose.view` 1/3, 2/3 at 1.47 / 1.53 (see the stub).
* Mist: one rigid bank, `x = bbox + 4 px/s · (t − 7.07)`; it leaves from the ground up at 16.63 / 16.73 /
  16.83 together with the pre-dawn wash (`state.mist.p` = 2/3, 1/3, 0).
* Ring: perfectly still; its crumble specks are drawn by the world (gone by 16.83).
* Sun: disc rigid, halo breathes with `L.motion.haloBreath`. Not drawn before 8.77 (the veil cloud of act 1
  must cover (540, 340) r 110 until its dab-out 8.77–9.17; from 8.77 the calm disc is underneath).
* Paint rule of the engine (ENGINE.md §6): opaque prints with holes — no `opacity` on paint layers; the
  world only uses translucency for the mist veils. Judge the look on `--ss 2` frames.
* Flowers end at world y ≤ 1210 (they open at 10.13, after the YARIN gloss), rosette leaves and the light
  prints of the hedge lip at ≤ `W.lightFloor`; the lit rise never shows below the lip.
* Bare world for regression: scene `world` (`node tools/render.mjs still --scene world --t 11.4 …`).
* Ambient specks never print over his head: a keep-clear zone round world (540, 697) (alpha 0 inside 50 px,
  full from 82 px, both times the zoom) — a pale fleck on the plain face read as a blemish at CLOSE.
* Integration checks of the film scene (from `video/`): `node out/world/integ.mjs cam | place | events | palms |
  gloss | console | det [scale]` (camera vs the Python port, the man in every framing, stepped events, palm
  points of the stub poses, gloss band with the man, console, render-order independence).
* Checks (from `video/`): `node out/world/check.mjs coverage | gloss | determinism | holds | scan | perf | state`,
  `node out/world/check.mjs stills <scene> <scale> <t1,t2,…> <outdir>` (many stills from one browser),
  `out/world/gloss_crops.sh` (the five gloss-band crops, y 1200–1600).

## Example act module

```js
// src/acts/act9.js — add it to src/acts/index.js. Slots are called as methods of the act module (`this`).
export default {
  id: 'act9', from: 12.2, to: 23.8,
  async init(E, W) {
    const L = W.layout;
    this.E = E;
    this.dot = E.once('act9/dot', () => E.bakeStencil({ shape: E.shape.ellipse(0, 0, L.arc.dotR), anchor: [0, 0],
      base: L.pal('arc_dots'), bleed: false, layers: [{ color: L.pal('arc_dots_edge'), coverage: 0.3, size: 14 }] }));
    this.poseAt = W.man.track([{ t: 12.3, v: W.man.POSES.back_neutral }, { t: 12.5, v: W.man.POSES.back_head_up_small }]);
  },
  release(E) { this.dot = this.poseAt = null; E.forget('act9/'); },
  pose(t, W) { return this.poseAt(t); },                 // the world draws the man with it
  slots: {
    sky(ctx, t, W) {                                     // WORLD px; behind ridge, man and hedge
      const L = W.layout, p = this.E.dabP(t, L.ft(12.47), { steps: this.dot.steps });
      if (p > 0 && W.state(t).sun.recede < 2) this.dot.draw(ctx, L.sun.x, L.sun.y + 200, { p });
    },
    front(ctx, t, W) { /* WORLD px, in front of the hedge: coin in flight, glints … */ },
    top(ctx, t, W) { /* FRAME px: the cream cover; other planes: W.withPlane(ctx, t, 0.7, () => { … }) */ },
  },
};
```
