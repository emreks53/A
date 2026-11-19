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
W.camShift = 0                               // seconds ADDED to the time at which the CAMERA (and nothing else) is evaluated — see below
```

**`W.camShift`** (last fix round; the lead's hook for camera motion blur). A writable number, default 0. `W.cam(t)`,
`W.toScreen(…, t, …)`, `W.withPlane(ctx, t, …)` and every camera use inside `W.draw` take the camera of
`t + W.camShift`; all states, poses, events, slots, the breathing, the drift of the mist … stay at `t`. Render the same `t`
several times with small shifts and average the pictures: only the camera moves between them. With `camShift = 0` every
pixel is what it was without the hook (checked: 30 times of the film pixel-identical). USE: call `prepareFrame(t)` with
`W.camShift = 0` and set the shift only round `renderFrame(t)`. Reason: a part that is initialised by `prepareFrame` may read
the camera at fixed times for a bake — act 2 does (`act2/light.js`: the dial's place on the far plane at 17.50 / 23.80, the
cover's held boxes at 23.90) — and a shift at that moment would be baked in (a fraction of a pixel: the camera is nearly
at rest at those times, but the bake would then depend on which sub-frame happened to initialise the part).

## Layer stack and slots (what is already on screen when your slot runs)

| # | plane | what the world draws | then calls |
|---|---|---|---|
| 1 | 0 / 0.15 | wall primer; the sky — a composed bake (complete from frame 0; about a tenth of it is bare primer between the prints) | |
| 2 | 1.0 | zone tints: dusk passes (left third), pre-dawn wash (right third) — banks of cloud with lobed inner edges, never slabs | |
| 3 | 0.3 | small cloud c1 — baked but NOT shown since polish round 1 (see the notes) | **`slots.back`** (1.0) — *extension*: behind today's sun |
| 4 | 1.0 | today's sun from 8.77: warm sky pass, cobalt annulus, halo passes, disc; from 16.83 / 16.93 its receded variant (paler disc + calm pale halo, dabbed over in two steps; the annulus' outer rim taken back into the sky) | **`slots.sky`** (1.0) |
| 5 | 1.0 | tomorrow's dashed ring (it leaves with the mist: 16.63 / 16.73 / 16.83 — no re-inking, no crumble specks since the last fix round), light column | **`slots.far`** (0.7) |
| 6 | 0.5 / 0.7 | far ridge (opaque below its crest); mist bank | **`slots.mid`** (1.0) |
| 7 | 1.0 | the mound (lit from 10.07) — then **`slots.ground`** (1.0) — *extension, last fix round*: ON the rise, behind its rosettes, the flowers, the man and the hedge (act 1's bloom of light at «bil»); the rosette leaves that pass behind his legs and flower f2 with its rosette (his stepping shoe is planted in front of it); the man — **`slots.hands`** inside `man.draw` (the world eases his turn frame by frame, frames 43–48, and cross-dabs the two turn drawings on frame 45 with `E.drawThrough`); hedge (its grass overlaps only the SOLES of his shoes); the other rosette leaves, buds / flowers | **`slots.front`** (1.0) |
| 8 | 1.2 / screen | ambient specks (only where screen y < 1190) | **`slots.top`** (frame px) |

main.js then applies `E.finish(ctx)`; the engine draws the glosses.

* A slot is `(ctx, t, W)` in your act module; it is called with the plane's camera transform already
  applied and wrapped in `ctx.save()/restore()`. Draw in WORLD px (plane 1.0), LAYER px (`far`, 0.7) or
  FRAME px (`top`). Never call `W.draw` or apply the camera yourself inside a slot.
* `slots.sky` runs AFTER today's disc. Things that must sit behind today's sun (the course dots near the
  apex: k = 14, 15, 16 lie inside the disc) go into `slots.back`, or are simply not drawn while
  `W.state(t).sun.visible` — the veil cloud covers them before 8.77 anyway.
* `slots.sky` is in front of the cobalt annulus and of the receded sun: hour-beads and clock-hand take
  their own receded variants at `L.T.sun.recede` (16.83 / 16.93), as the storyboard says.
* `slots.far` is behind the far ridge (opaque from its crest + 20 px down) and behind the mist bank.
* `slots.mid` is behind the mound, the man and the hedge (the hedge is opaque from lip + 9 px down, with
  a 13 px sponge fringe above the lip line `L.lip(x)`; in front of his feet, x 478–626, it is a low grass
  fringe instead: first tufts at y 1196–1202, opaque from y 1204 down at the latest — it overlaps only the soles of
  his shoes, and anything of yours that stands on the ground there is covered from that row);
  `slots.front` is in front of everything painted.
* Other planes: `W.withPlane(ctx, t, parallax, fn)` from `slots.top` (frame space) — or compute points
  with `W.toScreen(x, y, t, parallax)`.
* Gloss windows: nothing you draw may be lighter than hedge_mid below screen y 1222 while a gloss is up
  (`L.gloss.windows`); in world px that row is `W.lightFloor` (≈ 1203: the YARIN framing at zoom 1.15 puts
  world y 1204 on screen row 1222, drift included). Above it you are free.
* world.js uses `E.drawThrough` (the engine's `frame` scratch) on ONE frame only — frame 45, the middle of the
  turn's cross-dab, drawn right after the man — and no other engine scratch; you may use them in your slots (not
  nested inside another `drawThrough`).

## `W.state(t)` — the shared timeline (storyboard §5), frame-snapped

```js
{ coat2,                       // hedge / mound second coat, rosettes, buds: TRUE FROM FRAME 0 (critics round; was 0.07)
  man:   { p, warm },          // p = opening dab-in 0, 1/3, 2/3, 1 on THREES: 0.10 / 0.20 / 0.30 (was 0.13 / 0.20 / 0.27); warm 0 | 1 (10.07)
  specks,                      // ambient specks running (0.27)
  cloud: { visible, x, y },    // layer px (parallax 0.3); visible is always false since polish round 1
  dusk:  { sunset0, sunset1, dusk1, dusk2, recede },          // booleans; recede 0..2
  mist:  { build 0..2, thick 0..3 (1 after 16.47; the passes land at 6.93 / 7.00 / 7.07 — was 7.00 / 7.07 / 7.17), recede 0..2, thinned, out 0..3, p (1 → 0 while it cross-dabs out), dx },
  ring:  { dashes 0..14, strength 0..1 (1 / .8 / .55 / .35 after 6.93 / 7.00 / 7.07, then .35 to the end), crumble 0..3 (= mist.out: it leaves WITH THE MIST), p, visible },
  sun:   { visible (8.77), bare (9.17), blaze (9.57), halo 0..3, settle 0..4, recede 0..2,
           haloR (0 | 190 | 250 | 300 | 170 | 150), annulus 0..1, breath (halo scale now),
           core, mid, rim, peach, white, warmSky },           // which halo prints are on
  column:{ on 0..1, p, leaving },
  mound: { lit },              // 10.07
  flowers: [{ id, open, tau, bob }] // f1..f6; tau = seconds since it opened; bob = 0 … 0.1: the answer to «bil» (frames 346 / 348 / 350, inside to outside)
}
```
Typical uses: `W.state(t).ring.strength`, `.sun.visible` (unveil), `.sun.recede`
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
* Ring: perfectly still. Last fix round: it is not re-inked at 16.47 and does not crumble any more (neither could be seen
  inside the camera move) — the veiled ghost ring (35 %) leaves with the mist's turn-over steps 16.63 / 16.73 / 16.83.
* Sun: disc rigid, halo breathes with `L.motion.haloBreath`. Not drawn before 8.77 (the veil cloud of act 1
  must cover (540, 340) r 110 until its dab-out 8.77–9.17; from 8.77 the calm disc is underneath).
* Paint rule of the engine (ENGINE.md §6): opaque prints with holes — no `opacity` on paint layers; the
  world only uses translucency for the mist veils. Judge the look on `--ss 2` frames.
* Flowers end at world y ≤ 1210 (they open at 10.13, after the YARIN gloss), rosette leaves and the light
  prints of the hedge lip at ≤ `W.lightFloor`; the lit rise never shows below the lip.
* Bare world for regression: scene `world` (`node tools/render.mjs still --scene world --t 11.4 …`).
* **Critics round, as built** (interface, layout numbers and palm targets unchanged; TWO retimings, both ordered by the
  lead: the opening — second coat from frame 0, the man's passes on frames 3 / 6 / 9 — and the mist's thickening passes
  with the ring's veil steps on frames 208 / 210 / 212; `layout.js` `TIMELINE`, `RETIMED`):
  * *Sky.* The light-blue ground is a pressed coat with pores and irregular gaps: bare primer shows on about a tenth
    of the sky stage (more toward the horizon, at the flanks and round the apex; pinholes only in the calm passage,
    near the frame corners and in act 2's surround bands). Cobalt and lavender are lacy, porous prints with broken
    contours (`skyMap`, `sky` in world.js). No cobalt print lies on or just above his head in any framing
    (`headClear`; the YARIN dab is gone).
  * *Dusk and pre-dawn zones, mist.* Cloud contours (`puffs` in world.js: a body, lobes along the inner edge, a top
    that feathers off, strays trailing 60–140 px toward the centre — never as far as his hanging arms); the mist bank
    has a billowing top and a scalloped inner edge. The dusk passes are open prints (about 60 % dusk paint; the day's
    blue is dabbed back over the sunset first), and the two RECEDE passes (10.73 / 10.87) now make the dusk side one
    step LIGHTER and less saturated (#B3ABCB, #C4BED9, a pale blue) instead of duskier: the centre column carries the
    colour. The wash keeps clear of the place the minted coin floats in (world 724, 758).
  * *Hedge.* Three dab families that can be told apart — the deep coat, hedge_deep as discrete prints gathered in
    200–300 px clusters with shadow pockets between, lighter greens as small prints inside the clusters — plus fine
    ochre-olive pinholes. How light a row may get follows the gloss (D3: nothing lighter than hedge_mid inside the
    field): `LIGHT_FLOOR` (≈ 1203) … `TEXT0` (≈ 1290) life up to hedge_mid one step down; `TEXT0` … `TEXT1` (≈ 1500,
    the rows the gloss ink can lie on) the calmest rows; `TEXT1` … `DECO0` (≈ 1597, the first row below the field in
    every gloss window) life again; below `DECO0` the FRIEZE: hedge_mid, yellow-green, primer pinholes, the dark
    thicket and sprigs of light stencil leaves with a lavender shadow print inside their lower-left edge.
  * *His feet.* The grass fringe in front of him overlaps only the SOLES (tufts from y 1196–1202, solid from 1204):
    13–17 px of both shoes stand in sight. Flower f2 and its rosette are printed behind him, so the shoe he plants
    with the half-step (x 581–618) is in sight too.
  * *The turn.* Eased frame by frame by the world (`TURN_EASE`), with a real cross-dab on frame 45 — see MAN.md.
  * `mound.base` / `hedge.base` are the finished coats now (the first coat alone is never shown).
* **Polish round 1, as built** (the interface, the timeline and every layout number are unchanged; superseded where the
  critics round above says otherwise):
  * *His feet.* The hedge lip in front of him is a continuous fringe of small grass prints (nothing is cut
    out round the legs). It hides his soles (y 1203.6; 1207.6 in the dip of the turn) and the lower part of
    both shoes for every root of the film (rest, turn, half-step at root x 550); a few px of the toe caps
    stay in sight above the grass. Rosette leaves that would cross the strip his legs can stand in
    (x 482–620) are printed BEHIND him, whole; all others in front of the hedge as before.
  * *Frame 0.* The first coat of mound and hedge is a painting of its own (two greens, shadow pockets,
    a lip of mid-green tufts, primer in the fringe, the foreground thicket); the second coat (0.07) adds
    lights, tone-on-tone leaf stencils, accents, rosettes and buds.
  * *Hedge.* Slow value fall-off toward the lower edge and the far flanks, a nearer row of foliage and a
    thicket of big dark leaf stencils in the strip under the gloss field (below world y ≈ 1660), very dark
    blue-green accents, a lip of small lights in several tones — all light prints end above `W.lightFloor`,
    everything below it is darker than hedge_mid.
  * *Receded sun.* No speckle veil any more: `sprites.sun.far` (the disc painted once more in paler golds)
    and `sprites.sun.haloFar` (one calm pale ring to r 150) are dabbed over the blazing ones at 16.83 / 16.93;
    `sprites.sun.rimFar` takes the annulus' outer rim back into the sky (the bead band r 188–232 keeps its
    cobalt). `sprites.sun.receded` / `.veil` remain as aliases.
  * *Far ridge.* Two ranges in three tone passes, top fringe of uneven height (never lower than before;
    solid from crest + 20 px as before, so yesterday's sun sets behind it unchanged).
  * *Sky.* An own layered bake (`E.makeSpongeTexture`) driven by composition maps in sky-layer px
    (`skyMap` in world.js): cobalt in a few masses of prints of three sizes, a calm light-blue passage
    wherever his head, the deed and the coin palm lie in any framing, primer only in deliberate islands
    low at both flanks and beside the apex — never near a frame corner. It does not depend on `E.makeSky`.
  * *Cloud c1* is not drawn (`SHOW_CLOUD_C1 = false` in world.js; `state.cloud.visible` stays false): on its
    storyboard track only a corner-cut fragment of it is ever in frame, which read as a hole in the sky.
  * *Lit rise.* More of the yellow-green light shows on the crown between the flowers from 10.07.
* Ambient specks never print over his head: a keep-clear zone round world (540, 697) (alpha 0 inside 50 px,
  full from 82 px, both times the zoom) — a pale fleck on the plain face read as a blemish at CLOSE.
* Integration checks of the film scene (from `video/`): `node out/world/integ.mjs cam | place | events | palms |
  gloss | console | det [scale]` (camera vs the Python port, the man in every framing, stepped events, palm
  points of the stub poses, gloss band with the man, console, render-order independence).
* Checks (from `video/`): `node out/world/check.mjs coverage | gloss | determinism | holds | scan | perf | state`,
  `node out/world/check.mjs stills <scene> <scale> <t1,t2,…> <outdir>` (many stills from one browser),
  `out/world/gloss_crops.sh` (the five gloss-band crops, y 1200–1600).

## Last fix round (round 3), as built

* **`W.camShift`** — see the interface above.
* **Hedge (D3 revised).** While a gloss is up only the rows of the gloss INK must stay calm and dark: SCREEN y 1330–1505,
  x 120–960. In world px (`inkTop(x)` / `inkBot(x)` in world.js, computed from every frame of the four gloss windows,
  camera drift and the «sahipsin» glide included, 3 px margin): rows 1296 (x 320–1135, set by YARIN) or 1322 (elsewhere)
  down to 1511. Nothing lighter than `hedge_mid` is printed there; everything else of the hedge is foliage in light:
  * *the lit band* — the second coat hangs down from the lip in clusters of uneven depth (45–110 px; a broken lower edge):
    mid green, yellow-green dab clusters, a pale touch, dark stencil leaves with a lit sliver between them, fine primer
    pinholes; its density fades toward the ink rows;
  * *the frieze* begins right under the ink rows (world y 1511 instead of 1600) and fades in over 64 px: a first row of
    small stencil leaves (dark and light), the larger light leaves and the foreground thicket below as before;
  * *the horizon* is not a ruled line: outside the mound (x < 262, x > 818) the top line carries tufts of uneven height
    (0–10 px), and left of the mound three dab clusters rise 13–23 px above the lip (`HUMPS`: x −22, 58, 160), the one
    at x 58 with a leaf rosette that stands 39 px above the lip (`HUMP_ROSETTES`). With bud e1 (x 228) that is four
    breaks, 80 / 102 / 68 px apart. NONE right of the mound: there stands act 2's knoll with the rug (lead's rule: never
    in front of the man, the mound's flowers, the knoll or the rug). To add one there: one entry in `HUMPS`.
  * `W.lightFloor` is unchanged (the acts' own lights keep the old rule: nothing lighter than hedge_mid below y ≈ 1203).
  Check: `out/world/integ_r3.mjs ink` (every frame of the four windows, glosses off).
* **Tomorrow's ring** leaves with the mist (see the notes above): `T.ring.reink / crumble / specksGone` are gone from
  `layout.js`; `W.state(t).ring.crumble` now counts the mist's turn-over steps.
* **The rise answers «bil»** (`T.mound.answer` 11.53): `W.state(t).flowers[i].bob` — the six flowers bob once, scale
  1 → 1.1 → 1, the pair next to him first (frame 346), then the middle pair (348), then the outer pair (350); two frames
  up, five down. `ANSWER_BOB = 0` in world.js switches it off. The bloom of light itself is act 1's (`slots.ground` +
  `slots.front`, frames 346–355).

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
