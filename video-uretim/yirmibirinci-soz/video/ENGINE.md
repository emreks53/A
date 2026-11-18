# S-050 "Sünger Boyama" — 2D engine (Canvas 2D, deterministic, headless-Chromium rendered)

Everything on screen is a list of **sponge dabs** baked once into sprites. Each colour layer is pressed
on its own canvas, round pores are punched through the whole layer, and the layers are laid over each
other — colours show through each other's **gaps**. The paint itself is **opaque matte wall paint**: a
print either covers or leaves a hole; nothing mixes by transparency unless you ask for it (§6). Soft
things (sky, clouds, glows, foliage) are dab clusters; sharp things are the same dabs cut by a
**stencil**. Every sprite can be shown at any progress `p` — the signature *dab-in / dab-out*.
Look-dev: `src/scenes/lookdev.js` (read it first, it uses most of the engine and states the layout
rules); `src/scenes/swatch.js` and `swatch2.js` are diagnostic pages with one sample of each feature
(`swatch2`: outline / path lettering, outlines of unions, ring morph, parallel + split rays, streams,
rig stretch / whole-figure reveal / density, a dark-ink gloss on a calm sky band).

```
index.html            canvas #c 1080x1920, @font-face (EB Garamond, Encode Sans, Tinos)
src/main.js           window.__ready / prepareFrame(t) / renderFrame(t) / DURATION, ?scene= ?scale=
src/scenes/index.js   registry (one line per scene)      src/scenes/lookdev.js, swatch.js, swatch2.js
src/engine/           rng ease surface sponge stencil backdrop camera gloss fx assets motion rig index
tools/render.mjs      still / sheet / video            tools/r.sh  the same behind a machine-wide semaphore
tools/lab.mjs         run a small probe module against the engine (look-dev experiments, API probes)
tools/check.mjs       self-check: same painting at scale 0.5 / 1 / 2, frozen fill table, unit checks
```

## 1. Rendering

```bash
cd /home/user/work/video
node tools/render.mjs still --scene lookdev --t 2.5 --out out/x.png [--scale 0.5] [--ss 2]
node tools/render.mjs still --scene lookdev --frame 75 --out out/x.png          # exactly video frame 75
node tools/render.mjs sheet --scene lookdev --from 0 --to 6 --step 0.5 --cols 6 --out out/sheet.png [--thumb 360]
node tools/render.mjs sheet --scene lookdev --frames 0,2,4,6,8 --cols 5 --out out/sheet.png   # exact frames
node tools/render.mjs video --scene lookdev --from 0 --to 6 --out out/x.mp4 [--scale 0.5] [--fps 30]
                            [--workers N] [--audio /home/user/work/audio/voice_trim.wav] [--crf 14] [--preset medium]
                            [--ss 1|2]
node tools/render.mjs video --scene main --from 4 --to 9 --scale 0.5 --ss 2 --out out/x.mp4   # THE motion preview
node tools/lab.mjs my_probe.js [--scale 1] [--ss 2] [--w 1080 --h 1920] [--out out/lab.png] [--arg x]
node tools/check.mjs                                                           # ~1 min, exit code 0 = fine
```
* The tool starts its own static server (random port, rooted at `/home/user/work`) and closes server,
  browsers and ffmpeg on exit, on error and on Ctrl-C. Nothing is left running. A frame upload that
  fails on a loaded machine ("Failed to fetch") is retried up to five times instead of killing the render.
* `video`: frames are INTEGER film frames — a clip from `--from X` renders the frames
  `round(X·fps) + i` at `t = frame / fps`, exactly the times `still --frame N` and a render from 0
  use, so a film rendered in chunks is bit-identical to one rendered in one go (`from + i/fps`
  differs in the last bit for a quarter of the frames — enough to put a stepped event one frame off).
  N workers (separate browsers) pull chunks of 12 frames, PNGs are piped **in index order** into one
  `libx264` encode (yuv420p, bt709 tagged and converted, `+faststart`) — frame-exact by construction.
  `--audio` is muxed as AAC, offset by the first frame's time, padded with silence to the video length.
* **Encoder: no B-frames, 10 s GOP, no macroblock-tree** (`-bf 0 -g 300 -x264-params mbtree=0`). With
  x264's default B-frames the fine sponge grain is sharper on P than on B frames and visibly breathes
  at 7.5 Hz (5–6 % detail pulsing; measured 0.3–0.6 % frame to frame without). An I-frame keeps ≈ 4 %
  more fine detail than its neighbours, so a short GOP flicks once per keyframe — hence the long one
  (x264 still puts keyframes on real cuts; `ipratio=1` does not help). With mb-tree the last ~5 frames
  of a stream (no future to look at) lose 5–7 % of their grain: off. `--gop N` and
  `--x264 "key=val:…"` (merged over `mbtree=0`) pass through. CRF 14 on this crisp stipple is ≈ 45–50
  Mbit/s (a 30 s master ≈ 180 MB); `--crf 18` roughly halves it for delivery; if the platform
  re-encodes anyway, hand it the best master (`--crf 12`) rather than tuning the GOP.
* **`--ss 2` = supersampled**: everything is baked and drawn at 2x and ffmpeg lanczos-downscales to
  1080x1920. It removes the sub-pixel shimmer of moving sponge texture (§8) and keeps stencil edges of
  rotating / zooming sprites razor-sharp; the stamp tiles are then generated at device resolution
  (same prints, stipple cut hard at 2x), so the grain stays crisp. **It is the default for every
  `video` at `--scale 1` (with 2 workers); `--ss 1` opts out and prints a note** — an ss 1 clip at
  scale 1 shows a boiling grain (17–25 % detail pulsing) that the final does not have, so it is no
  basis for a motion review. **The standard motion preview is `video --scale 0.5 --ss 2`**: rendered
  at full resolution and lanczos-scaled to 540x960 — supersampled, and as cheap as an ss 1 full-res
  clip. Use **`still --ss 2` for every style review** — only supersampled frames show the final
  texture (a scale-1 frame under a camera zoom loses about a third of its fine detail to bilinear
  resampling). `--ss 2` costs about 4x the pixels and memory.
* **Every scale is the same painting: 0.5, 1 and the supersampled 2** — same dabs, same stamps, same
  reveal stages at the same times. (Until round 3 the 2x render scattered a DIFFERENT painting: the
  number of presses of a layer came from the measured ink of the stamp tiles, which is 3–4.5 % higher
  on 2x tiles. That "fill" is now a frozen table in `sponge.js`.) Measured on lookdev frame 60 after
  a 16 px low-pass: scale 1 vs downscaled `--ss 2` mean 1.1 / p99 4 / max 12 levels (it was 5.3 / 36 /
  76); scale 0.5 vs 1 mean 1.0 / max 9. So previews and `sheet` (which bakes at thumbnail scale: a
  25-frame sheet ≈ 10 s) can be trusted for composition, patch placement, gloss-band calmness and
  dab-in timing of the FINAL. Judge only the fine texture at `--ss 2`. `node tools/check.mjs`
  asserts it: identical dab lists at 0.5 / 1 / 2 for the scatterer and every builder.
* `--scene swatch` / `swatch2` are the diagnostic pages (stamps, textures, lettering, live stencil,
  rig, rays, morph, dial, glow / outlines, path lettering, streams, whole-figure reveals, density).
* **`tools/lab.mjs`** runs `export default async function (E, ctx, {canvas, arg, scale, w, h}) {…}`
  from any file against the real engine and saves the canvas — the quick way to try a recipe or
  probe an API without touching a scene (a sky alone bakes in 2–5 s instead of a whole scene).

## 2. Writing a scene

```js
// src/scenes/myscene.js  — then add  myscene: () => import('./myscene.js'),  to src/scenes/index.js
export default {
  id: 'myscene',
  duration: 8,
  glosses: false,            // true = the 4 real glosses of timing.json (default for id "main");
                             // [{text, t, end, ink}] = custom; scenes never draw glosses themselves
  // finish: false,          // skip the global wall-grain pass (default: applied)
  async init(E) {            // bake EVERYTHING here
    this.sky = E.once('sky/a', () => E.makeSky({ w: 1300, h: 2180, seed: 21 }));   // E.once: shared cache
    this.sun = E.makeSun({ r: 84 });
  },
  draw(ctx, t, E) {          // pure function of t, LOGICAL 1080x1920 coordinates
    this.sky.draw(ctx, -110, -130);
    this.sun.draw(ctx, 800, 330, { t });
  },
  // async prepare(t, E) {}  // optional: bake / release time-windowed content; awaited before each frame
  // release(E) {}           // optional: drop baked content (see "Sequencing" in §5)
};
```
Rules that keep frames deterministic and workers interchangeable:
* `draw` depends on `t` only: no `Math.random`, no `Date`, no counters. Use `E.makeRng(seed)` in `init`,
  `Math.sin(t)` / `E.noise1(t, seed)` for motion. Frames are rendered out of order by several browsers
  (verified: any order of frames, in separate browsers, gives identical pixels).
* Coordinates are logical (1080x1920) everywhere; `E.res` (= `?scale`) is handled inside surfaces.
* Never create canvases in `draw`. If you need a temporary surface there, use `E.scratch(w, h, 'myname')`.
* main.js draws: primer fill → `scene.draw` → `E.finish` (wall grain) → glosses.

## 3. The model: dabs → layers → `Painted`

`Painted` = baked sprite + its dab list. Every builder below returns one (or an object around some).

```js
painted.draw(ctx, x, y, { p = 1, alpha = 1, rot = 0, scale = 1, sx = 1, sy = 1, blend, mode })
//   the sprite's anchor lands on (x, y); rot/scale happen about the anchor; sx: -1 mirrors;
//   blend = globalCompositeOperation for this draw ('multiply', 'screen', …); mode overrides the reveal mode
painted.at(p, mode)        // -> surface | null  (stage for progress p)      painted.w / .h / .ax / .ay / .steps
painted.inkBounds          // {x0, y0, x1, y1, w, h} of the visible paint RELATIVE TO THE ANCHOR (±4 px): a
                           //   sprite drawn at (x, y) has its ink inside [x + x0, y + y0] … [x + x1, y + y1]
painted.masked(revealSpec) // -> Painted: the same finished picture with another mask reveal (other direction…)
painted.release()          // free reveal scratch memory (automatic after ~8 draws at p >= 1)
```
`p` is quantised to the sprite's `steps` stages (`p = 0` nothing … `p = 1` final). Two **reveal modes**:

| mode | what a stage is | default for |
|---|---|---|
| `'mask'` | the **finished** picture seen through an ordered mask of sponge prints: it appears print by print with its look intact (no flat stage, no recolouring), and leaves the same way. **Every stage uncovers the same share of the visible paint** (stage k of n shows ≈ k/n of it; transparent margins cost no stage), so `dabP` timing is literal: the first stage is the first visible paint, the last stage the last | stencils with a `base`, `makeSpongeTexture` with a `base`, clouds, `bakeSprite` / `fromSurface`, lettering |
| `'build'` | the dabs whose reveal rank is `< p`, layer over layer: a true build-up (the ground first, upper colours following, primer pores visible from the first stage); stencil prints (ribs, windows, edge blush) arrive with the last third. Ranks are spread over the dabs that actually touch the shape | sky, foliage, glows, soft clusters, textures without a base |

Drive `p` with **`E.dabP(t, t0, {steps, every = 2, grid})`**: exactly one stage lands every `every`
frames, the first ON `t0` (duration = `steps * every / fps`; 6 stages on twos = 0.4 s). Dab-out =
`1 - dabP(...)`. **One cadence per shot**: reveals that start on odd and on even frames, or mix twos
and threes, interleave into near-continuous change and stop reading as stepped. Give every reveal
of a shot the same `every` and **`grid: true`** (t0 is snapped DOWN to a multiple of `every` frames —
never later, so a beat that leads its word still leads), or put t0 on the grid yourself with
**`E.beat(t0, every)`** (for `group.draw({t, t0})`, `mosque.draw({t, t0})`, lettering). See lookdev:
its whole opening changes on even frames only.
Reveal spec, accepted by every builder as `reveal: {...}`:

| key | meaning |
|---|---|
| `steps` | number of stages (default 5–10 depending on builder) |
| `mode` | `'mask'` / `'build'` (see above) |
| `order` | `'random'` (default) · `'radial'` (+ `from: [x, y]` in the builder's local coordinates) · `'sweep'` (+ `angle`, direction of travel, `-Math.PI/2` = upward) · `fn(x, y, rng) -> 0..1` |
| `jitter` | 0..1 randomness mixed into radial / sweep order (default 0.16) |
| `layerMix` | build mode: 1 = colour layers arrive strictly one after another, 0 = purely spatial; default 0.4. It only changes WHEN a dab appears — the z-order is always layer over layer |
| `even` | build mode: `'area'` re-times the ranks so that every stage lays down the same amount of PAINT (a stage of a sky is then ≈ 1/steps of its picture instead of "the ground slams in, the rest trickles"). Default for `makeSky` and `makeFoliage`; elsewhere stages hold the same NUMBER of dabs |
| `dab` | mask mode: size of the mask prints (default ≈ half the sprite's short side, 40–200 px) |

Layer spec (bottom layer first) used by `makeSpongeTexture`, `makeCluster`, `bakeStencil`:

| key | default | meaning |
|---|---|---|
| `color` / `colors[]` | – | `#RRGGBB` (any colour — `E.PAL` is only the starting family); each gets `tints` (5) small tone variants |
| `coverage` | 0.8 | inked fraction 0..~0.99 where the probability is 1 (0.3 sparse, 0.9 dense). Prints are OPAQUE with holes: what shows of the layer below is what the gaps and pores leave, so lower layers need coverage ≤ ~0.9 above them. For `'speck'` sprays it is the fraction of pixels dotted: use 0.05–0.15 |
| `size` | 90 | dab diameter in px (stamp tiles exist for 18–320 px; the stipple grain is the same absolute size on all) |
| `jitter` | 1 | dab-to-dab variation (0 = uniform); scales `sizeJitter` 0.3, `tint` 0.05, `squash` 0.18, which can also be set one by one (`tint: 0.015–0.03` for pale stone / skin, where tint wobble reads as stains) |
| `opacity` | `[0.97, 1]` | number or `[lo, hi]` per dab. Leave it alone for paint; lower it ONLY for things that are translucent by nature (a veil of mist, a light glow over a dark ground, the calm base of puppet limbs) |
| `stamps` | `'any'` | `'dense'` `'mid'` `'airy'` `'speck'` · `'body'` (dense+mid: chunky prints) · `'open'` (mid+airy: lacy prints) · `'soft'` (airy+speck: powdery). `'speck'` = a spray of fine stipple |
| `pores` | 0.6 | 0..1 round pores punched through the WHOLE layer after its dabs (they survive same-colour overlap); 0.3 = sparse (use it for light tones over dark ones, or the form turns leopard-spotted), below 0.2 = only a few stray pores (big calm fields: the sky ground), 0 = none (default 0 for `'soft'` / `'speck'` layers). `poreScale` (default 1) makes them smaller / larger (0.6 on the lit tones of the dome) |
| `even` | cov ≥ 0.9 | jittered grid instead of random scatter; with a moderate coverage (0.4–0.7) it gives DISCRETE prints (sky cobalt, rows of dabs under a cornice) |
| `maskFn(x,y)` `shadeFn(x,y)` | – | 0..1 dab probability (the **light model**). Use TIGHT ramps (`smoothstep(0.55, 0.61, lit)`) so tones meet at a stippled frontier instead of fading into each other |
| `patch` | – | `{scale, amount, sharp, seed}` low-frequency islands (higher `amount` = FEWER islands); same `seed`+`scale` on two layers makes them coincide (clumps of mid → light → highlight) |
| cluster only | – | `offset [dx,dy]`, `band [lo,hi]` (depth range), `grow` |

## 4. API reference (all on `E`)

**sponge.js**
* `makeSpongeTexture({w, h, seed, base, layers, reveal})` → Painted (anchor 0,0). `base` makes it opaque.
* `makeCluster({points: [{x,y,r | rx,ry}] | shapeFn(x,y)->0..1 + w,h, layers, edgeSoftness = 0.35, seed, anchor, reveal})`
  → Painted with a soft, stippled cloud edge. `points` = union of soft discs / ellipses (bounds are
  automatic, `anchor` in the same coordinates, default bbox centre); `shapeFn` returns depth inside the shape.
* `Painted.fromSurface(surface, {ax, ay, seed, steps, dabSize, reveal})` — wrap any finished surface (mask reveal).
* low level: `scatterDabs(layers, {w, h, seed, reveal, field, edge})` → dab list (sorted by layer then
  rank, `.meta` = per-layer pore info; identical at every render scale), `rankDabs(dabs)` (re-rank a
  filtered list), `evenRanksByArea(dabs, w, h)` (what `reveal.even: 'area'` does), `stampFillTable()`
  (diagnostics: frozen vs measured tile fill), `joinDabs(a, b, {at})`,
  `clusterDabs(spec)`, `paintLayered(surface, dabs, meta, upTo)`, `paintDabs(surface, dabs, from, to)`,
  `new Painted({w, h, ax, ay, dabs, steps, post, mode, reveal, res})`, `patchFn(spec)`, `revealOrder(spec, w, h)`,
  `makePoreTile(size, seed, opts)`, `stampCount()`, `stampsOf(kind)`, `stampCanvas(i, color, px)`.

**stencil.js**
* `shape.*` → `{path, bounds, pts}`: `rect`, `roundRect`, `ellipse(cx,cy,rx,ry,rot)`, `polygon(pts)`, `smooth(pts)`,
  `arch(cx, bottomY, w, h, point)`, `flower(cx, cy, r, petals, {notch, rot, wobble, petalJitter, seed})`, `leaf(len, wid, bend)`,
  `dome(cx, baseY, w, h)` (+ `.profile` for ribs), `ribbon(pts, width | [w0, w1])`,
  `capsule(len, r0, r1)` (tapered limb with round ends, proximal joint at 0,0),
  `sector(cx, cy, r0, r1, a0, a1)` (pie wedge when `r0 = 0`, ring segment otherwise; angles in rad,
  0 = +x, `-PI/2` = up, `a1 > a0`; has `pts`: it can morph and take dashes),
  `ring(cx, cy, r0, r1)` (annulus: coin / dial rims; works with the default fill rule; `pts` = outer
  outline, `contours` = [outer, hole]),
  `union(...shapes)` (no single `pts`, but `contours` = the outlines of its members),
  `place(shape, {x, y, rot, scale, sx, sy})`,
  `morph(a, b, u, {n = 96, mode = 'vertex' | 'radial', align})` (in-between of two outlines — for
  `drawStencil`; see "Morphing shape" in §5; shapes with several contours morph contour by contour,
  and a contour only one side has — the hole of a ring going to a disc — closes to a point),
  `dashes(ptsOrShape, {dash, gap, width, cap, phase, from, to})`, `dots(ptsOrShape, {r, gap, phase, from, to})`
  (one fillable shape with automatic bounds; `phase` marches, `from`/`to` draw on; works along an open
  point list, e.g. `E.curve(...).pts`, or around EVERY contour of a shape — a ring's rim and hole, each
  member of a union; `{ pts: ring.pts }` = the outer one only).
  A hole in a stencil: `shape.ring`, or `bakeStencil({ shape: shape.union(outer, inner), fillRule: 'evenodd' })`.
* `bakeStencil({shape | (mask(ctx) + bounds), layers, base, anchor, seed, edge, slits, details, bleed, reveal, pad, fillRule, outline, density})`
  → Painted. Razor-sharp cut, stippled interior.
  `outline: {width = 6, dash, gap, cap, join, phase, side: 'center' | 'outside' | 'inside'}` cuts the LINE
  around the shape instead of its area (a thing announced but not yet owned, a dashed frame) — for any
  shape, also custom paths; `side: 'outside'` gives the true silhouette line of a union whose members
  overlap (their inner arcs are not drawn).
  `density: 2` bakes the sprite at twice the device resolution with 2x stamp tiles (same dabs, grain
  unchanged in logical px): it stays razor-sharp under a 2x camera zoom or drawn at scale 2 — for the
  hero only (4x the memory; the first density-2 bake at scale ≤ 1 generates the 2x tiles, ≈ 7 s once).
  `edge: {color, width, opacity, dir | null, tile: 'pore' | 'fine'}` or an **array** of them = thin prints
  just inside the edge (`dir` = side it sits on, default lower-left; `null` = all round);
  `slits: {path, width, color, opacity}` (stroked) or `{shape, width, color, opacity}` (filled, e.g. a union of
  tapered ribbons) = thin lines through stencil slits, printed uneven, swelling and skipping two or
  three times along a line (vary the ribbon widths and bow the point lists a little yourself — see the
  dome ribs in `makeMosque`);
  `details`: `(ctx) => {}` = nearly solid flat prints (window openings), or
  `{draw(ctx), print: 'solid' | 'print' | 'flat'}`, or an array — `'print'` = ornaments as broken,
  stippled prints with the layer below showing through (never a vector-flat fill);
  `bleed` = subtle specks just outside the edge (`false` to disable — do so for tiny parts and puppet limbs).
* `stencilText(text, {font: '700 "Encode Sans"', size, tracking, align: 'left' | 'center', bridges, perLetter, stroke, path, pathOffset, base, layers, edge, bleed, reveal, seed, density, strictFont})`
  → Painted measured from the real glyph bounds (nothing is clipped); anchor = baseline start (or ink
  centre); `.textWidth`, `.ink = {left, right, ascent, descent}` — distances the ink reaches from the
  anchor in each direction, as in canvas `measureText` (so `left` is NEGATIVE when the ink starts to the
  right of the anchor: "DÜN" → −7). `bridges: true` cuts stencil bridges through closed counters.
  **An unknown font throws** (family not in index.html, or no face of that weight / style — the canvas
  would silently substitute or fake it; `strictFont: false` allows that).
  `stroke: {width = 6, dash, gap, cap, phase}` → the letters as (dashed) OUTLINES.
  `path: E.curve(…) | E.arc(…) | [[x, y], …]` → the baseline follows the path, each letter by arc length
  and turned to the tangent (`align: 'center'` centres the word on the path, else it starts `pathOffset`
  px in); the anchor is then the origin of the path's coordinates. Works with `perLetter` and `stroke`.
  `perLetter: true` → `{letters: [{painted, x, ch}], width, ink, letterSteps, steps, duration({every, stagger}),
  draw(ctx, x, y, {t, t0, every = 2, stagger = 0.6} | {p, stagger})}`: with `{t, t0}` letter *i* starts
  `stagger` × (one letter's duration) after letter *i − 1* and lands one of ITS OWN stages every `every`
  frames (5 letters × 6 stages on twos, stagger 0.6 → `duration()` = 1.33 s); `.steps` is the stage
  count of the whole word for `E.dabP(t, t0, {steps})` + `{p}`.
* `drawStencil(ctx, pathOrShape, texturePainted, {x, y, p, edge: {color, width, opacity, dir | null, speckle}, slits, details, bleed, outline})`
  — live clip for shapes that change every frame; the texture stays pinned at object-space (x, y). The
  edge is printed only on painted pixels (also while `p < 1`) and is directional like a baked edge;
  `details` (window openings, `{print: 'print'}` ornaments) and `bleed: {color, amount}` work as in
  `bakeStencil`; `outline: {width, dash, gap, phase, side}` draws the line around the shape instead
  (animate `phase`: marching dashes around anything, also unions).
* `bakeSprite({bounds, draw(ctx), anchor, seed, steps, dabSize, reveal, density})` — cache any drawing
  (e.g. several parts) as one Painted; mask reveal.
* `group([{node, x, y, from, to}])` — parts with staggered reveal windows: `.draw(ctx, x, y, {p})` (child
  p = `(p − from) / (to − from)`) or **`.draw(ctx, x, y, {t, t0, every = 2})`** (child *i* starts at
  `t0 + from_i × duration` and lands one of its own stages every `every` frames); `.steps` (stages until
  the whole group is complete), `.duration` (seconds on twos).
* `scratch(w, h, slot)` — engine-owned temporary surface (cleared, reused): for your own compositing in `draw`.

**backdrop.js** — `makeWall({w, h, seed})` → opaque primer surface (draw with `E.blit(ctx, wall, x, y)`);
`makeSky({w, h, seed, sun: {x, y, r} | null, horizon, mood, zenith: [y0, y1], calm: {y0, y1, amount}, solid: [[x, y, r], …], palette, clouds: [{x, y, w, h, seed}], reveal})`
→ `{w, h, paint, wall, draw(ctx, x, y, {p})}` (its own wall underneath; `p >= 1` is one opaque blit;
`clouds` are static and baked in). The recipe (reference, measured on clean sky: ≈ 15 % cobalt, 60 %
light blue, 20 % cream, 4 % lavender, mean luminance 0.5): an airy light-blue field; **islands of bare
primer that are real gaps** — every blue layer keeps away from them, the cobalt twice as far, so cream
is always bordered by light blue and never by cobalt (no "splatter"); **discrete round cobalt prints**
(~100 px, about two cells in three of a jittered grid, in loose groups) with a powdery stippled rim of
the lighter tone `dab2`; a few powdery lavender dabs; small cream flecks. The cobalt thins out between
the sky rows `zenith[0]..zenith[1]` (default `[h·0.1, h·0.36]`; below, only stray prints), `mood`
(default 0.5) scales cobalt + lavender (0.25 = calm, 1 = heavy). Around `sun` chunky opaque dabs of
yellow (inside) and peach (outside) with blue holes between them.
`calm: {y0, y1}` keeps sky rows free of cobalt / lavender (light blue + cream only: dark gloss ink reads
at ≥ 6.5 : 1 there, median 8.3 : 1 — use it for a gloss over sky). `solid: [[x, y, r]]` = discs (sky coordinates) that
stay BLUE — no primer island, no yellow / peach: put them behind ivory, white and gold things (a
minaret, a finial; see lookdev). `palette: {ground, ground2, dab, dab2, accent, warm, warm2, glow, primer}`
repaints the same recipe (dusk, pre-dawn…). `makeCloud({w, h, seed, reveal})` → Painted (anchor =
centre) for clouds that drift: white body, powdery fringe, a clear band of lavender prints underneath;
`sandGrain(surface, alpha)`, `mottle(...)`.

**camera.js** — camera = `{x, y, zoom, rot}`; home = frame centre, zoom 1 → world == frame coords.
`applyCamera(ctx, cam, f)` … `ctx.restore()` or `withCamera(ctx, cam, f, fn)`; parallax `f`: 0 = infinitely
far, 1 = subject plane, > 1 = foreground. `cameraPath(keys, {mode: 'ease' | 'spline'})` → `(t) => cam`
(keys `{t, x, y, zoom, rot, ease}`), `driftCamera(cam, t, {seed, amp, period, zoom, rot})` (sum of
incommensurate sines: never stalls; its zoom only pushes in, ≥ 1.002), `mixCamera(a, b, u)`,
`worldToFrame(cam, f, x, y)`, `homeCamera()`.

**gloss.js** — `drawGlosses(ctx, t, list?)`, `timingGlosses()` (from `/home/user/work/timing.json`, end
times from the bible), `prepareGlosses(list)` (bakes the sprites; main.js calls it), `glossAlpha(t, g)`.
A gloss is `{text, t, end, ink}`; **`ink: 'light'`** (default: warm ivory, tight dark-brown halo) or
**`ink: 'dark'`** (deep maroon-brown, tight ivory halo, umber hairline `#7A4A1E` a little thicker than
the gold one — gold vanished on blue). Applied by main.js; band
64–82 %, baseline y = 1424, ink-centred, EB Garamond 600 at 96 px (auto-shrinks to 74 % of the width:
ink never leaves x 140–940, the Shorts-safe zone; very short glosses are set up to 20 % larger). One
baked sprite per gloss, transformed continuously (fade 0.14 s, 14 px rise, 4.5 % horizontal settle — no
per-frame re-layout). **The frame that contains the spoken onset already shows the gloss at 56 %, the
next at 86 %** (it leads by up to one frame, never lags).
**Scene rule — the field behind y ≈ 1330–1500 while a gloss is up** (measured with the calm foliage
band of lookdev: median 6.9 : 1, the brightest 5 % still 4.4 : 1; dark ink on a calm sky band (swatch2):
median 8.3 : 1, the darkest 1 % 6.6 : 1; on gold / stone 8–12 : 1):
* behind **light ink**: relative luminance below 0.2 (≥ 4.5 : 1) — dense deep green, cobalt, dusk tones;
  never white flowers, light dabs, primer gaps or a stone / leaf / sky junction (`makeFoliage({calm: {…,
  amount: 1}})` does this for foliage and still gives the band dark sponge texture; see lookdev).
  Light ink on sky reads at 1.7 : 1 — do not;
* behind **dark ink**: relative luminance above 0.4 (≥ 6.5 : 1) — light blue, cream, sun glow, gold /
  white light, stone, cloud (`makeSky({calm: {y0, y1}})` keeps the cobalt out of those rows; the darkest
  tone of a default sky, cobalt, is 4.8 : 1). Use it whenever the picture is radiant at that moment
  (e.g. "gelecek", "âhirete ait sandıkçık");
* either way keep the field calm: no hard junction and no moving sprite crossing the words —
  `specks.draw(ctx, t, {exclude: [x, y, w, h], excludeAlpha: E.glossAlpha(t, g)})` fades drifting specks
  inside a frame rectangle while the gloss is up (see lookdev).

**fx.js** — `makeSpecks({seed, count, bounds, colors, size, speed, angle, spread, wobble, twinkle})`
→ `{draw(ctx, t, {alpha, exclude: [x, y, w, h], excludeAlpha, excludeFade})}` (`exclude` = a rectangle in
FRAME coordinates the specks fade out of, whatever camera they are drawn under); `makeBurst(painted, {seed, count, duration, order, wind, spread, life, size})`
→ `{draw(ctx, x, y, tau, {scale, rot, alpha})}` (specks sampled from the sprite's own pixels; they shrink
to nothing); `makeTrail({path, count = 24, duration, stagger, spread, size = [10, 22], colors, seed, easing,
head, headScale, headSpin})` → `{draw(ctx, tau, {alpha}), total, headAt(tau)}` (specks travelling along an
`E.curve` / `E.arc` / point list; `head` = a Painted that leads the trail — the coin, the bead; use
sizes ≥ 10 px for anything that must be noticed on a phone; a trail is one-shot);
`makeStream({path, count | rate, life, spread, size, colors, seed, easing})` → `{draw(ctx, t, {alpha, start,
stop}), count, life}` — a CONTINUOUS stream: every speck travels the path in `life` s and restarts on
its own, evenly spread in time (no moment at which the whole stream restarts); it starts flowing at
`start` and runs dry after `stop`;
`makeGlow({r | rx, ry, color, core, density = 0.9, falloff = 0.8, stamps, opacity, seed, reveal})` → Painted
glow cluster: **`r` is the visible radius** (coverage ≈ 0.93 in the centre, 0.6 at 0.6 r, 0.15 at 0.9 r,
≈ 2–5 % at r, nothing beyond 1.15 r), centred on the centroid of its own paint (±1 px);
`makeRays({count, angle, spread, inner, length, width: [w0, w1], jitter, colors, soft, seed, reveal, parallel, gap, split})` →
Painted anchored at the source (`soft: false` = stencil-sharp beams; `parallel: true` = PARALLEL beams
in direction `angle`, `gap` px apart — window light, a shaft through a door; `split: true` = every
ray its own sprite → `{rays, draw(ctx, x, y, {t, shimmer = 0.35, sway = 0.012, speed, alpha, p, rot, scale})}`,
each breathing on its own phase); `makeDabMask({w, h, steps, dab, seed,
order, from, angle, jitter})` + `drawThrough(ctx, mask, p, drawFn, {x, y})` = whole-frame dab transition;
`breathe(t, period, amount, phase)`; `makeFinish()` (already installed as `E.finish`). All particles are
tiny sponge-print sprites, never polygons.

**assets.js** — `makeSun({r, seed})` `.draw(ctx, x, y, {t, p, haloP, pop, glow})` (+ `.disc .inner .outer`;
three flat tones with stippled frontiers, a halo of chunky opaque dabs that breathes by scale only);
`makeMosque({scale, seed})` → `{parts, anchors, buildTime, draw(ctx, x, y, {p} | {t, t0})}`
(origin = bottom centre of the base; `{t, t0}` dabs the parts in on twos from `t0`); `makeFlower({r, seed})`
(distinct, slightly irregular petals; the shade is a patchy DABBED lavender blush on the petals away
from the light plus one thin broken edge print — never a continuous inner band),
`popScale(tau, {freq = 3, damping = 0.6})` (≈ 9 % overshoot, no visible undershoot), `popTwist(tau, amount)`,
`makeBud({r})`, `makeLeaf({len, wid, bend, seed, sliver, light, lit})` (anchor = base, tip along +x; a dark
leaf with a fine STIPPLED lighter patch of colour `light` on one half — `lit: 1 | -1` picks the +y / −y
side, default per seed — and a broken cream sliver on one edge), `makePlant({height, seed, lean, leaves, leafLen, segments = 3})`
`.draw(ctx, x, y, {t, p, sway, head, headScale})` (the stem BENDS: the sprite is drawn as a chain of
`segments` slabs, the tip leading and lagging; `segments: 1` = rigid pivot),
`makeFoliage({w, h, seed, warm, top, fade, calm: {y0, y1, amount = 0.94}, avoid: [[x, y, r], …]})` → `{mass, topAt(x), draw}`
(`top(x)` → local y of the canopy line: flat, hill, mound; `fade` = height in px of the stippled canopy
edge — the mass is solid from `topAt(x) + fade` down, default `h × 0.14`; `calm` keeps a local y band
free of light / warm / primer dabs, `amount: 1` = nothing light at all — the band is not a dead
stripe: it gets dark sponge texture and pores instead, all below luminance 0.2; `avoid` = local discs
kept free of cream primer gaps, for where white flowers sit),
`sphereLight(cx, cy, rx, ry)` → lit(x, y) 0..1, `limbLayers(color, width, {rich, len, r0, r1, joints, lit})`
and `jointCalm(len, r0, r1)` / `jointCalm([[x, y, r], …])` (paint recipe and joint mask for puppet parts,
see the puppet recipe).

**motion.js** — `curve(pts, {closed, tension})` → `{at(u), angle(u), length, pts}` (arc-length: constant speed);
`arc(p0, p1, height)` → the same interface for a ballistic throw (`u` = time fraction);
`track([{t, v, ease}], {mode: 'ease' | 'spline' | 'hold'})` → `(t) => value` for numbers, arrays and
objects of numbers. **All keys must have the same form — a mismatch throws** (it used to pop
silently, or overflow the stack in spline mode); leaves that are not numbers (strings, booleans) are
discrete: they hold and switch on arrival. For puppet poses use `E.poseTrack` (rig.js);
`mix(a, b, u)`; `dabP(t, t0, {steps, every, fps, grid})`; `beat(t0, every = 2)` (t0 snapped down to the
beat grid of the shot).

**rig.js** — `makeRig({parts})` → `{draw(ctx, x, y, pose, {p, alpha, scale, rot, flip, only, through}), joint(id, pose, o),
point(id, [x, y], pose, o), reach(pose, upperId, lowerId, [tx, ty], {bend, near, soft = 0.08, …o}),
bounds(pose), bake(pose, {reveal, steps, seed, density}), mask({pose, bounds, steps, dab, order…}), order, parts}`;
`mixPose(a, b, u, {shortest})`; `poseTrack([{t, v: pose, ease}], {mode: 'ease' | 'spline', shortest, offsets: {part: seconds}})`
→ `(t) => pose` (a part may be an angle in one key, `{rot, sprite}` in the next, or missing = rest:
nothing pops; z / sprite / hide switch on arrival; `offsets` = per-part delay for overlap);
`lagPose(poseFn, t, {part: seconds})` (the same overlap for any pose function);
`ik2(root, target, l1, l2, bend, soft)` → `[a1, a2]`; `nearestAngle(a, near)`. See the puppet recipe.

**ease.js** — `clamp lerp invLerp remap smoothstep smootherstep TAU`, `ease.{quad,cubic,quart,quint,sine,
expo,back,elastic}.{in,out,inOut}`, `tween(t, t0, t1, a, b, fn)`, `spring(tau, {freq, damping})` (analytic;
damping 1 = critical, < 1 overshoots), `springTo`, `stepped(t, fps)`, `quantize(p, n)`.
**rng.js** — `makeRng(seed | string)` `{next, range, int, pick, chance, sym, gauss, fork}`, `mulberry32`,
`hash2`, `hashInt`, `hashStr`, `seedOf(...parts)`, `valueNoise2`, `fbm2`, `simplex2`, `noise1(x, seed)`.
**surface.js** — `surface(w, h)` → `{canvas, ctx, w, h, res}` (ctx in logical px), `blit(ctx, s, x, y)`,
`clearSurface`, `copySurface`, `PAL` (the catalogue colours and a few derived ones — a starting family, not a
limit), `mixHex`, `tone(hex, ±amt)`, `rgba`, `hexToRgb`, `tintSet`.
**E** also has `W H FPS res timing`, `finish(ctx)`, `once(key, makeFn)`, `forget(prefix)`, `makeSequence(parts, opts)`.

## 5. Recipes

**Stencil object** (texture is baked in → it moves rigidly, never swims). Three bold tones with tight,
stippled frontiers and a pale core where the light hits:
```js
const L = E.sphereLight(0, 0, 120, 120), lit = (a, b) => (x, y) => E.smoothstep(a, b, L(x, y));
this.ball = E.bakeStencil({
  shape: E.shape.ellipse(0, 0, 120), base: '#174A33', seed: 7, anchor: [0, 0],
  layers: [                                             // dark base -> mid -> light -> pale core
    { color: '#439747', coverage: 0.9, size: 62, pores: 0.3, maskFn: lit(0.55, 0.61) },
    { color: '#92C456', coverage: 0.9, size: 70, pores: 0.3, maskFn: lit(0.73, 0.79) },
    { color: '#C6DF80', coverage: 0.8, size: 58, stamps: 'body', pores: 0.3, maskFn: lit(0.88, 0.93) },
    // sprays of fine stipple carry a tone a little past its frontier (the powdery boundary)
    { color: '#92C456', coverage: 0.14, size: 60, stamps: 'speck', maskFn: (x, y) => lit(0.64, 0.72)(x, y) * lit(0.82, 0.74)(x, y) },
    { color: E.PAL.primer, coverage: 0.3, size: 30, stamps: 'soft', maskFn: lit(0.56, 0.24), patch: { scale: 70, amount: 0.66 } },
  ],
  edge: { color: E.PAL.lavender, width: 6, opacity: 0.4 },               // optional inner-edge print
  reveal: { steps: 5, order: 'sweep', angle: -Math.PI / 2 },             // mask mode (there is a base)
});
// draw:  this.ball.draw(ctx, x, y, { rot, scale, p: E.dabP(t, 1.0, { steps: this.ball.steps }) });
```
Never a flat fill, never eight neighbouring tones: three tones + a core read as light; many read as moss.

**Cut-out puppet** (`makeRig`): one sprite per part, **anchored at its joint**; parts transform by the
hierarchy but are drawn by their own `z`.
```js
const limb = (len, r0, r1, col, seed) => E.bakeStencil({ shape: E.shape.capsule(len, r0, r1), anchor: [0, 0],
  base: col, layers: E.limbLayers(col, 2 * r0, { len, r0, r1, rich: 1 }), bleed: false, seed });
const torso = E.bakeStencil({ shape: torsoShape, anchor: [0, 0], base: top, bleed: false,
  layers: E.limbLayers(top, 104, { rich: 1, joints: [[36, -122, 20], [-36, -122, 20]] }) });  // calm at the shoulders
this.rig = E.makeRig({ parts: {
  torso:  { sprite: torso, parent: null, at: [0, 0], z: 0 },
  upperR: { sprite: limb(84, 20, 17, top, 1),  parent: 'torso',  at: [36, -122], z: 2, rest: Math.PI / 2,
            edge: { color: '#5A2A22', width: 4, opacity: 0.5 } },        // world-space lower-left shadow band
  foreR:  { sprite: limb(78, 16, 13, skin, 2), sprites: { fist: foreFist }, parent: 'upperR', at: [84, 0], z: 3, tip: [78, 0] },
  coin:   { node: this.coin, parent: 'foreR', at: [78, 0], z: 3.5 },     // a PROP riding on the hand
  upperL: { sprite: limb(84, 20, 17, top, 3),  parent: 'torso',  at: [-36, -122], z: -1, rest: Math.PI / 2 },
} });
// pose = { partId: angle | {rot, x, y, scale, sx, sy, z, sprite, hide} } — rot is added to `rest`
let pose = E.mixPose(this.poseA, this.poseB, E.ease.cubic.inOut(u));      // or this.acting(t), see below
const target = this.handPath(t);                                          // E.track / E.mix / E.arc of POINTS
pose = this.rig.reach(pose, 'upperR', 'foreR', target, { x, y, bend: -1 }); // IK: the hand (tip) lands on it
pose = { ...pose, foreR: { ...pose.foreR, sprite: 'fist' }, coin: { hide: t < tGrab } };
this.rig.draw(ctx, x, y, pose, { rot: lean, flip: false });
const hand = this.rig.point('foreR', [78, 0], pose, { x, y, rot: lean });  // world position of the hand
```
* **Seamless joints**: (a) the parts overlap by a full joint circle (`capsule` ends are the joint
  circles: put the child's `at` on the centre of the parent's end cap and use the same radius there),
  (b) the paint is calm inside the joint circles — `E.limbLayers(color, width, {len, r0, r1, rich: 1})`
  gives real sponge texture (darker / lighter porous prints, a few primer specks) along the limb that
  fades out inside the two joint circles; for other parts pass `joints: [[x, y, r], …]` (or use
  `E.jointCalm(...)` as the `maskFn` of your own layers); plain `E.limbLayers(color, width)` is the
  all-calm fallback (low contrast, no pores — it looks flat next to the backgrounds, use it only for
  tiny parts), and (c) parts of one garment share one base colour. A limb crossing a same-coloured body
  gets `edge` (a soft band inside its lower-left edge, given in WORLD space so it stays put while the
  limb turns; during a dab-in it arrives with the paint) or a slightly different tone — never an outline.
* **Reaching**: `reach` unwraps its angles to the turn nearest to `near` (default: the pose you pass in),
  so they never jump by 2π; with `soft = 0.08` the elbow eases straight over the last 8 % of the arm's
  length instead of snapping (the hand then stops up to ~3 % short of a target at full stretch; inside
  92 % the reach is exact; `soft: 0` = exact everywhere). **Animate the TARGET** (a point from `E.track`,
  `E.mix` or `E.arc`) and call `reach` every frame; never blend two reach results. If you must blend
  poses that came out of IK / atan2, use `E.mixPose(a, b, u, {shortest: true})`.
* **Depth and variants**: a pose value may carry `z` (an arm passing from in front of the torso to behind
  it within one shot), `sprite` (a variant from the part's `sprites`: open hand / fist, head turned) and
  `hide`. In `mixPose` these discrete values switch at u ≥ 0.5; in `E.poseTrack` on arrival at a key.
* **Props**: a part with `node` instead of `sprite` (anything with `draw(ctx, x, y, opts)`) rides on its
  parent and is layered by its own `z` — no second draw call.
* **Keyframed acting**: `this.acting = E.poseTrack([{ t: 0, v: poseA }, { t: 0.4, v: poseB, ease: E.ease.back.out },
  { t: 1.2, v: poseC }], { offsets: { foreR: 2 / 30, head: 3 / 30 } })` → `this.acting(t)`. Keys may mix
  forms freely (`{fore: 0.2}` → `{fore: {rot: 1, sprite: 'fist'}}`), a part missing in a key is at rest,
  discrete values switch on arrival, `mode: 'spline'` glides through the keys, `shortest: true` unwraps
  angles that came out of IK. **Overlap / follow-through** is `offsets` (seconds, whole frames in this
  style): the forearm reads the track two frames after the upper arm, the head three. For a pose
  function of your own: `E.lagPose(poseFn, t, { foreR: 2 / 30 })`. Lag BEFORE `reach` and never lag the
  two bones of an IK chain apart (lag the reach target).
* **Foreshortening, squash and stretch**: a pose value takes `sx` (along the bone) and `sy` (across).
  They stretch that part's sprite only; its children are not deformed, but their joints follow the
  stretched bone (a forearm at `sx: 0.7` still carries the hand on its end), and `reach` / `point`
  work with the stretched lengths. Uniform `scale` is inherited by the children as before.
* **Whole-figure reveal** — never `rig.draw(…, {p})` for a dab-in (every part would reveal through
  its own mask: unrelated speckle per limb, lower parts showing through the holes of upper ones):
  (a) the figure holds a pose while it appears → `this.figure = this.rig.bake(pose, { reveal: { steps: 6,
  order: 'sweep', angle: -Math.PI / 2 }, density })`, draw `this.figure` with `{ p: E.dabP(…) }`, then
  switch to `rig.draw`; (b) it moves while it appears → `this.mask = this.rig.mask({ pose, steps: 6 })`
  once, then `rig.draw(ctx, x, y, pose, { through: this.mask, p: E.dabP(…) })` (the mask rides on the
  rig origin; give `mask` a `bounds` that covers every pose of those frames).
* **A hero that must stay sharp under a camera zoom**: bake its parts with `density: 2` (bakeStencil /
  stencilText / bakeSprite / rig.bake) — twice the device pixels, grain unchanged in logical px. Do
  not author it at 2x units and draw it at 0.5: that halves its stipple relative to the world.
* `flip` mirrors the whole figure INCLUDING its baked light (upper-right becomes upper-left). Fine for a
  short turn; for a figure that faces left for long, bake a second sprite set with mirrored shapes and
  the normal light. `rot` turns the whole figure about its origin (pass the same `{x, y, rot, flip,
  scale}` to `joint` / `point` / `reach`).

**Stencil lettering**: `E.stencilText('BUGÜN', { font: '700 "Encode Sans"', size: 150, base: E.PAL.brick,
layers: [{ color: E.PAL.ochre, coverage: 0.45, size: 60 }], reveal: { order: 'sweep', angle: 0 } })` —
bounds are measured for you. Per-letter dab-in: `perLetter: true`, then
`word.draw(ctx, x, y, { t, t0: 2.0 })` (takes `word.duration()` seconds).
A word that is announced but not owned yet, as a dashed outline: `E.stencilText('YARIN', { size: 130,
base: '#3F6FB0', layers: […], stroke: { width: 7, dash: 16, gap: 11 }, bleed: false })`. A word on a curve:
`E.stencilText('BUGÜN', { size: 92, base, layers, path: E.curve([[0, 0], [150, -70], [300, 0]]), align: 'center' })`
and draw it where you would draw the path (see swatch2).

**Dial / clock / coin**: `E.shape.ring(0, 0, 84, 100)` (rim), `E.shape.sector(0, 0, 0, 78, a0, a0 + Math.PI / 6)`
(one hour of twelve), `E.shape.dots(E.shape.ellipse(0, 0, 66), { r: 4, gap: 34.5 })` (ticks); bake each
with `bakeStencil` and dab them in together: `this.dial = E.group([{ node: rim }, { node: ticks, from: 0.3 },
{ node: wedge, from: 0.5 }])` → `this.dial.draw(ctx, x, y, { t, t0 })` (see swatch).

**Dashed / dotted shapes, draw-on**: `E.bakeStencil({ shape: E.shape.dashes(E.shape.ellipse(0, 0, 96), { dash: 34, gap: 20, width: 14 }),
base: E.PAL.gold, layers: […], bleed: false })`; for an animated one clip a texture live:
`E.drawStencil(ctx, E.shape.dashes(path.pts, { dash: 30, gap: 18, width: 10, phase: t * 60, to: u }), tex)`.
The dashed OUTLINE of any silhouette, also a union of overlapping shapes or a custom path:
`E.bakeStencil({ shape: house, outline: { width: 7, dash: 18, gap: 12, side: 'outside' }, base, layers, bleed: false })`,
marching: `E.drawStencil(ctx, house, tex, { outline: { width: 7, dash: 18, gap: 12, side: 'outside', phase: t * 60 } })`.

**Morphing shape**: `E.drawStencil(ctx, E.shape.morph(shapeA, shapeB, E.ease.cubic.inOut(u)), tex, { edge })`
(the texture must cover both shapes; it stays put while the cut changes). `mode: 'vertex'` (default) is
exact at both ends but lumpy between DISSIMILAR shapes: keep such morphs to ≤ 8 frames or morph between
shapes with the same number of lobes; `align: angle` or `{index}` overrides its start-point match.
`mode: 'radial'` blends radius-by-angle about the centroids: smooth, symmetric in-betweens at any speed
for blob-like shapes (disc ↔ flower ↔ rounded tile ↔ drop); corners are rounded by about 1 px.

**Soft cluster** (mist, light patch, any soft form): `E.makeCluster({ points: [{x: 0, y: 0, r: 260}, {x: 180, y: 30, r: 190}],
anchor: [0, 0], edgeSoftness: 0.6, layers: [{ color: E.PAL.white, coverage: 0.9, size: 120 }], reveal: { order: 'sweep', angle: 0 } })`.
**Glow / light**: `E.makeGlow({ r: 240, color: E.PAL.sunYellow })` (or `rx, ry`; `density: 0.5` = open, airy;
`falloff: 0.3` = a full disc with a short stippled rim); pulse it with `{ scale: E.breathe(t, 4.6, 0.04) }`.
On a light ground it is opaque paint (alpha 1). **On dusk / night grounds** paint that is merely lighter
does not read as light: draw the glow with `{ blend: 'screen' }` and put a second, smaller and paler glow
on top as the core (`E.makeGlow({ r: 90, color: '#FFF3C2' })`, also `screen`); a translucent veil is
`opacity: [0.45, 0.8]`. Light rays: `E.makeRays({ count: 9, inner: 50, length: 300, width: [18, 60],
spread: Math.PI })` then `.draw(ctx, x, y, { rot: 0.05 * Math.sin(t), alpha, p })`. Window light:
`this.beams = E.makeRays({ count: 4, parallel: true, gap: 62, angle: 0.95, inner: 0, length: 300, width: [30, 44], split: true })`
→ `this.beams.draw(ctx, x, y, { t, shimmer: 0.35, p })` (every beam breathes on its own phase).

**Dab-in / dab-out**: `obj.draw(ctx, x, y, { p: E.dabP(t, 1.0, { steps: obj.steps, grid: true }) })` (one
`every` and `grid: true` for all reveals of a shot, §3); pop small things
instead: `{ scale: E.popScale(t - t0), rot: E.popTwist(t - t0) }`. **Dab-out into specks**: bake the
sprite with a spatial order, `this.burst = E.makeBurst(sprite, { duration: 0.7, wind: [78, -34] })`, then
`sprite.draw(ctx, x, y, { p: 1 - E.dabP(t, t0, { steps: sprite.steps, every: 3 }) }); this.burst.draw(ctx, x, y, t - t0);`
(for a build-mode sprite add `mode: 'mask'` to the draw, or use `sprite.masked({order…})`, so it leaves
print by print instead of colour by colour). A beat that must lead a word by 2–4 frames: put `t0` there —
the first stage is visible paint.

**Throw / stream of specks**: `const path = E.arc([x0, y0], [x1, y1], 220);`
`this.trail = E.makeTrail({ path, duration: 0.8, stagger: 0.5, head: this.coin, headSpin: 6 })` →
`this.trail.draw(ctx, t - t0)` draws the coin leading its sparkle; from `t - t0 >= 0.8` draw the landed
coin yourself (`this.trail.headAt(tau)` → its position while flying). A stream that KEEPS flowing
(light pouring in, sand): `this.stream = E.makeStream({ path, rate: 22, life: 1.4 })` →
`this.stream.draw(ctx, t, { start: tOn, stop: tOff })` — never `trail.draw(ctx, tau % total)`.

**Keyframes**: `const k = E.track([{ t: 0, v: 0 }, { t: 0.4, v: 1, ease: E.ease.back.out }, { t: 2, v: 0.2 }]); k(t)`
— also for arrays and objects of numbers (every key the same form); `{ mode: 'spline' }` for one
continuous glide. Poses: `E.poseTrack` (puppet recipe).

**Camera + parallax**:
```js
this.cam = E.cameraPath([{ t: 0 }, { t: 2 }, { t: 6, x: 548, y: 968, zoom: 1.06, ease: E.ease.sine.inOut }]);
const cam = E.driftCamera(this.cam(t), t, { seed: 4, amp: 4, period: 5 });
E.withCamera(ctx, cam, 0.2, () => this.sky.draw(ctx, -110, -130));     // far
E.withCamera(ctx, cam, 1.0, () => this.hero.draw(ctx, 540, 1400));     // subject
```
Make far layers larger than the frame (sky: frame + ~10 % per side for a 1.1 zoom / 100 px pan at f = 0.2).

**Whole-scene dab transition** (frame coordinates, cameras inside the callbacks):
```js
this.mask = E.makeDabMask({ steps: 8, order: 'sweep', angle: 0, seed: 3 });           // init
sceneA.draw(ctx, t, E);                                                                // draw
E.drawThrough(ctx, this.mask, E.dabP(t, tCut, { steps: 8 }), (c) => sceneB.draw(c, t - tCut, E));
```

**Sequencing sub-scenes in `main` with bounded memory**:
```js
import a from './s1.js'; import b from './s2.js'; import c from './s3.js';
export default {
  id: 'main', duration: 29.5,
  async init(E) {
    this.seq = E.makeSequence([{ scene: a, from: 0, to: 8.4 }, { scene: b, from: 8, to: 16.4 }, { scene: c, from: 16, to: 29.5 }],
      { lead: 0.5, keep: 1 });
    await this.seq.init();
  },
  prepare(t) { return this.seq.prepare(t); },    // bakes a part 0.5 s before it starts, releases old ones
  draw(ctx, t, E) { this.seq.draw(ctx, t); },    // each part gets LOCAL time; or draw the parts yourself
};                                               // (seq.parts[i].scene) to cross-dab them with drawThrough
```
A part is live for `from <= t < to`; the part that ends last is inclusive at its end, so `t == duration`
still draws the last frame. A sub-scene that wants its memory back implements
`release(E) { this.sky = null; … }` (and `E.forget('prefix')` for `E.once` entries). Every worker bakes a
part when it first needs it.

## 6. Look rules (what makes it read as S-050)

* **Opaque paint with holes.** A print covers or leaves a gap; lower colours show through gaps, pores
  and stippled rims — never through transparency (translucent prints turn into continuous-tone "moss /
  camouflage" and soft digital brush). The default `opacity` is `[0.97, 1]`; leave it there. Translucency
  is only for things that are translucent by nature and must be asked for explicitly: a veil of mist,
  light over a dark ground (`blend: 'screen'`), the calm base of puppet limbs. Choose a tone as a COLOUR
  (`'#DFCEBF'` pale taupe), not as a strong colour at low opacity.
* Always layer: base → 2–4 colour layers → a sparse `PAL.primer` layer (coverage 0.1–0.3 as `'soft'`
  flecks or `'body'` gaps with a `patch`) so the cream primer peeks through. Never a flat fill, never a
  gradient, never an outline — ornaments, ribs, stems and particles are prints too (`details: {print:
  'print'}`, `slits`, speck sprites).
* **Few, bold tones.** Shade by dabbing dark → mid → light with a pale core where the light hits (light
  from the upper right: `maskFn` on `sphereLight` or any 0..1 "lit" function) — three tones + core, each
  a flat field, meeting at TIGHT ramps (0.05–0.07 wide); add a `'speck'` spray (coverage 0.07–0.15) of a
  tone just past its frontier for the powdery boundary. Lights are chunky prints (60–110 px) gathered in
  clumps by a shared `patch`, not a mist of small flecks.
* Dab `size` ≈ 1/4–1/2 of the shape; 40–90 px on objects, 100–150 px in skies and masses.
* Value hierarchy: the hero form gets the deepest darks and the brightest lights; surroundings stay in a
  narrower range (the lookdev dome is cool deep green, the garden olive / yellow-green on a mid-green
  ground, leaves dark blue-green). **A dark stencil shape sits on a lighter field** (a dark leaf on dark
  foliage reads as a stain) and vice versa.
* **Sky**: an airy LIGHT-BLUE field (≈ 60 % of it), cobalt only as discrete round prints with powdery
  rims (≈ 15 %), cream as real gaps bordered by light blue (≈ 20 %) — never a dense blue "terrazzo",
  never cobalt butting against cream. Blue (no island, no cloud, no sun dab) behind ivory / white /
  gold silhouettes: `makeSky({solid})`.
* **Leaves and petals**: a leaf is dark with a fine stippled lighter patch on ONE half (a centred
  blotch in a dark frame reads as variegated / watermelon rind); the shade of a white petal is a
  patchy dabbed lavender blush on the petals away from the light plus one thin broken edge print (a
  continuous inner band reads as a digital bevel).
* Soft edge = `makeCluster`; sharp edge = `bakeStencil`. Clouds get a clear band of lavender prints
  underneath and a powdery white fringe. White things in front of ivory stone or other white things lose their silhouette
  — put blue sky or a darker field behind them (and never a white cloud behind a gold finial).
* **A stencil building never floats**: lay a warm ground strip (a soft `makeCluster` in ochre / peach,
  same parallax as the building) right under its base, and let the ground mass (foliage, hill) overlap
  the base by ≥ 24 px at every x for the whole camera move. A strip of sky under a wall is a bug.
* Staging small things: group them (3 + 2 + 1), stagger heights and sizes (≈ 1 : 0.6 : 0.35), let one
  pair overlap, tuck a stencil leaf or two under a hero flower — never an evenly spaced row on one
  line, never a mirror-symmetric layout (sprigs of 3 / 5 / 2 leaves at uneven gaps, plants 2 + 1 + 1).
  A foreground is a LAYERED THICKET: clumps of 2–4 stencil leaves fanning from a shared base at mixed
  angles, overlapping one another and the flowers, each clump on a soft field of lighter dabs (see
  lookdev `thicket` / `fields`).
* **One cadence per shot**: all stepped reveals on one beat grid (`dabP(…, {grid: true})`, `E.beat`).
* `E.PAL` is the starting family; choose colours freely per the colour script (bible §2, user update) —
  any `#RRGGBB` works everywhere, `makeSky({palette})` re-tints a whole sky.
* Shorts-safe: nothing essential below y ≈ 1651 or right of x ≈ 950 in the lower half; let the bottom
  strip be plain texture. Keep the gloss band (y ≈ 1330–1500, plus the rows a camera move brings into
  it) calm while a gloss is up and pick the gloss `ink` for it (§4 gloss.js).
* Judge the look on `still --ss 2` frames and motion on `video --scale 0.5 --ss 2` clips; the film is
  rendered with `--ss 2` (the default for every `video` at scale 1).

## 7. Performance (this 4-core machine, shared; 1080x1920, lookdev scene)

| what | scale 1 | scale 0.5 |
|---|---|---|
| engine init (stamps for 7 tile sizes, wall grain, timing) | ≈ 2.5–3 s (≈ 10 s at `--ss 2`: stamps at 2x) | ≈ 2.5–3 s |
| lookdev scene bake (sky 1300x2180 ≈ 2 s, mosque, foliage, ground, 4 plants, …) | ≈ 4.5 s (total init ≈ 7 s; ≈ 23 s at `--ss 2`) | ≈ 3 s |
| a reveal stage of a big build-mode sprite (sky 1300x2180: repainted from its dab list) | 0.45–1.6 s per stage (≈ 10 s for a 10-stage sky dab-in, once per worker that crosses it) | ¼ |
| a mask-mode stage (dome 560x360) | ≈ 40 ms | – |
| first `density: 2` bake at scale ≤ 1 (generates the 2x stamp tiles once per browser) | ≈ 7 s | ≈ 7 s |
| PNG encode (`toBlob`), ≈ 5 MB | ≈ 150 ms | ≈ 40 ms |
| `video` end to end, 3 workers, `--ss 1` | 0.12–0.2 s/frame (a 900-frame film ≈ 2–3 min + init) | ≈ 0.05 s/frame |
| `video --ss 2 --workers 2` | 0.55–0.8 s/frame depending on what else runs (init ≈ 25 s): a 900-frame film ≈ 9–12 min | – |

Rules: bake in `init`, never create canvases / call `getImageData` / use `shadowBlur` or `ctx.filter` in
`draw`; a `Painted.draw` is one `drawImage`; a reveal only costs when its stage index changes (keep
`steps` ≤ 10, prefer mask mode for big things that must dab in often, keep build-mode reveals for skies
and soft masses); `drawStencil` with an edge composes in a scratch surface (fine for a handful of
shapes); a `makePlant` draw is `segments` clipped `drawImage`s; a rig part with `edge` composes in a
scratch surface per draw; prefer one `bakeSprite` for static multi-part props; share bakes between
scenes with `E.once`.
Memory: a surface costs `w*h*4*res²` bytes; a 1300x2180 sky ≈ 34 MB (wall + paint + flat), plus two
stage surfaces while it reveals (released ~8 frames after it is complete). Measured for the lookdev
scene (whole browser, RSS): ≈ 0.8 GB per worker in steady state, ≈ 1.25 GB at the peak of the opening
dab-in (3 workers ≈ 3.8 GB); `--ss 2 --workers 2` peaks at ≈ 2.8 GB in total. A long film should bake
its sub-scenes through `E.makeSequence` so only the current and neighbouring parts are in memory, and
use `--workers 2` for the supersampled final on this shared 16 GB machine. Use `tools/r.sh` (same
arguments; the lead's semaphore: at most 2 renders run at once machine-wide, a `video` gets at most 2
workers and a full-size supersampled one 1 worker unless `RENDER_FINAL=1`); `tools/slot.sh <command>`
puts any other browser job (`node tools/lab.mjs …`, `node tools/check.mjs`) behind the same semaphore.
The renderer releases each frame's PNG blob itself (`--js-flags=--expose-gc`, `gc()` every 4 frames):
Chromium does not count blob bytes as JS memory, and without that a supersampled render piled up
≈ 2 GB of dead 20 MB blobs per worker and died with "Failed to fetch" after ~90 frames per worker.

## 8. Known limits

* **Sub-pixel shimmer of the fine stipple at `--ss 1`.** The 1–3 px sponge grain is resampled whenever a
  sprite sits at a fractional pixel position, rotates or is zoomed, and the prints are now crisp and
  opaque, so the effect is strong: in the lookdev scene (slow push-in + drift) the fine detail of a
  400x300 cell modulates by 10–20 % over half a second at scale 1 (small high-contrast cells such as the
  minaret or the sun reach 20 %; 2–5 % from frame to frame) and a zoomed scale-1 frame is about a third
  softer than the unresampled bake. With **`--ss 2` the same motions modulate by 1–2.5 %** (0.2–0.7 %
  frame to frame) — render the final film and every style still that way (it is the default for
  every `video` at scale 1; motion previews: `--scale 0.5 --ss 2`). If you must look at an `--ss 1`
  clip: drift at ≥ 30 px/s or so slowly that it does not matter, and keep zooms slow. The main canvas uses `imageSmoothingQuality = 'medium'` (bilinear on both sides of
  1:1), so there is no sharpness step when a zoom crosses 1.0, and `driftCamera` never zooms out.
* Rotating / scaling a baked sprite resamples its stencil edge (≈ 1 px soft at 2–3 px wide at scale 1;
  razor-sharp with `--ss 2`); for large scale changes bake at the largest size used, or bake the
  sprite with `density: 2`.
* A build-mode reveal of a frame-sized sprite repaints its dab list at every stage (§7); use mask mode
  (or `drawThrough`) where a big thing must appear often. Build-mode stages are even in DAB count
  unless the reveal says `even: 'area'` (default for skies and foliage: every stage lays down the same
  amount of paint; "paint" counts what a layer newly covers, so a stage of the opaque ground still
  changes more pixels than a stage of sparse top dabs); mask-mode stages are even in visible paint.
* `rig.draw({through})` composes the figure in a scratch surface at the render scale while `p < 1`
  (a part baked with `density: 2` is not sharper than that during those frames).
* `shape.dashes` / `dots` / `morph` on a `union` follow each MEMBER's outline, including arcs that lie
  inside the union where members overlap; for the true silhouette line use `outline: {side: 'outside'}`.
* Lettering on a `path` places whole glyphs (no per-glyph bending): keep the path's radius above ~2x
  the font size, or the letters fan apart on the outside of the curve.
* One Painted keeps at most two reveal stages of a big sprite in memory; drawing the same big sprite at
  three or more different `p` in one frame re-bakes stages every frame (small sprites cache all stages).
* `drawThrough` works in frame coordinates on the main canvas (not inside another `drawThrough`).
* `E.scratch(w, h, slot)` surfaces only ever GROW, and the browser resamples a canvas drawn below ~0.7x
  through mip levels of the WHOLE canvas: if you draw a scratch onto the frame much smaller than its
  own resolution, ask for ONE fixed size per slot name (never a size that follows the pose), or frames
  depend on what was drawn before them. At about 1:1 a scratch is safe (the rig keeps one scratch per
  sprite size for this reason).
* `makePlant` slabs overlap by 8 px; with `sway` above ~3 a leaf that crosses a slab border shows a
  sub-pixel step (at the default sway of 1 it is invisible).
* Soft IK (`reach`, `soft > 0`) trades the last ~3 % of reach at full stretch for a smooth elbow.
* `shape.morph` `'radial'` needs shapes that are star-shaped about their centroid (every ray from the
  centroid crosses the outline once); it takes the farthest crossing otherwise.
* H.264 4:2:0 softens the chroma of single-pixel specks a little; the encode has no B-frames on purpose
  (§1), which costs roughly 40 % more bitrate at the same CRF.
* `E.makeSky`'s palette key `glow2` is accepted but no longer used (the soft second glow layer is gone).
