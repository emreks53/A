# Dünya Menzil — engine guide (for scene / prop authors)

A 9:16 (1080×1920, 30 fps) narrated short, Kurzgesagt-style motion design (sentence-synchronised visual
metaphors, continuous gentle motion, clear iconic staging) rendered in a **watercolour** look (catalogue style
S-001 Suluboya). The whole video is a deterministic function of time `t` rendered in headless Chromium.

Project root: `/home/user/A/uretim/dunya-menzil/`

```
index.html            loads fonts, engine, data, props, scenes
engine/core.js        E.W/E.H, math, easing (E.ease, E.ep, E.tween, E.spring), noise (E.noise1/2, E.fbm1/2, E.drift),
                      colour (E.P palette, E.mix, E.shade, E.desat, E.rgba), timing (E.T(i), E.Te(i), E.Tw(word,n))
engine/paint.js       watercolour drawing helpers (E.wash, E.lift, E.bloom, E.dryBrush, E.splatter, E.blob,
                      E.wobblyShape, E.smoothPath, E.pencil, E.note, E.arrow, E.glow, E.rays, E.motes,
                      E.camera, E.save/restore/translate/scale/rotate/alpha (all three layers), E.skyWash)
engine/man.js         the man (E.man.draw / pose / lerp / walkSpeed / shadow)
engine/props-a.js     shared world & nature props (E.props.*)        — read-only for scene authors
engine/props-b.js     shared objects & symbols (E.props.*)            — read-only for scene authors
engine/post.js        WebGL watercolour pass (do not edit)
engine/gloss.js       meaning subtitles (automatic, do not draw your own)
engine/main.js        shot scheduler (do not edit)
data/words.js         E.WORDS: forced-aligned words [{i, w, s, e}] (onset/offset seconds, ±0.04 s)
data/plan.js          E.SHOTS (start/end/transition) and E.GLOSSES
scenes/sNN.js         one file per shot: E.scene('sNN', { draw(L, lt, t, shot), wc?, sfx?, overlay? })
tools/render.cjs      headless renderer (see "Previewing")
```

## Layers (what you draw into)

`draw(L, lt, t, shot)` receives `L = { paint, ink, light }`, three 1080×1920 Canvas2D contexts, freshly cleared:

- **L.paint** — pigment. Starts **white = bare paper**. The post pass turns it into watercolour: wavy edges,
  pigment pooling (darker rim) at the inner edge of every wash, mottling, granulation, cold-press paper.
  - `E.wash(ctx, path, color, {mode:'glaze'|'over', alpha, grad, soft, light})`
    - `'glaze'` (default) = multiply: transparent layering, exactly like real watercolour glazes. Use it for
      skies, shadows, second layers, blooms, colour variation inside objects.
    - `'over'` = opaque: for objects that must hide what is behind them (foreground objects, characters).
  - Paint like a watercolourist: light first, then mid tones, then a few darks. Build volume with 2–3 glazes of
    the same pigment (shadow side), leave **bare paper** for highlights and for the brightest light
    (`E.lift` puts paper back). Use `E.bloom` for wet-in-wet blossoms, `soft:` for wet edges,
    `E.dryBrush` for texture, `E.splatter` sparingly. Let some washes go slightly past the pencil line and
    others stop short (lost & found edges).
- **L.ink** — pencil/ink lines on transparent; multiplied over the watercolour and broken up by the paper tooth.
  `E.pencil(ctx, path|points, {w, a, double})`: light sketchy contour lines and a few construction lines give
  the "illustrated sketchbook" quality of the reference. Keep them subtle (a ≈ 0.25–0.5). `E.note` writes a
  handwritten pencil label (Caveat) with write-on reveal; `E.arrow` draws a pencil arrow.
  **Occlusion:** ink is composited above paint, so ink of background objects would show through opaque
  foreground objects. Draw back-to-front and erase ink/light under an opaque foreground object:
  `L.ink.save(); L.ink.globalCompositeOperation='destination-out'; L.ink.fill(path); L.ink.restore();`
  (the man does this automatically).
- **L.light** — glows/light on transparent, screen-blended last (`E.glow`, `E.rays`, `E.motes`). Use for
  sparkles, glow of the heart, lantern light, sunlight (never as "divine" light — see docs/KURALLAR.md). Do not overuse; watercolour light is mostly bare
  paper.

Optional scene fields:
- `wc: [edge, granulation, wobblePx, mottling]` (default `[1, 1, 3, 0.55]`) tunes the watercolour pass.
- `overlay(ctx, lt, t)`: crisp drawing above the watercolour (rarely needed — e.g. Arabic calligraphy must be
  crisp; but calligraphy can also be painted on L.paint/L.ink for an ink look).
- `sfx()` returns sound cues (see below).

## Time, sync, pacing

- `lt` = seconds since this shot's start. `t` = global seconds. `shot.dur` = nominal duration.
  Your scene may be rendered for `lt` in `[0, shot.dur + shot.tail]` (tail = next shot's transition) and
  must be a **pure function of time** (no state between frames, no Math.random: use `E.rng(seed)`, `E.noise*`).
- Word onsets: `E.T(i)` (global seconds) for word index `i` in `data/words.js`. Convert to local:
  `E.T(i) - shot.start`. Time visual beats to the word they illustrate: an element should start appearing
  about 0.05–0.15 s before (or at) the onset of its word and complete its main motion within ~0.4–0.8 s.
- Kurzgesagt pacing: one clear idea per clause, readable at a glance; motion that is always alive (slow camera
  drift, floating, breathing, particles) but **never frantic**. Do NOT animate something new on every word —
  roughly one new visual beat per 1.2–2.5 s, with the key words of the sentence getting the beats. Ease
  everything (`E.ep(t, a, b, 'inOutCubic')`, `E.spring`, `outBack` for pops). Anticipation and overshoot
  sparingly and softly. Hold important images long enough to read.
- Transitions are handled by the scheduler (see `data/plan.js`): `cut`, `fade`, `bleed` (a watercolour wet
  wash spreading from a centre), `zoom` (zoom through a point into the next shot). Design your first and last
  ~0.8 s so the transition reads well (e.g. for an incoming `zoom` keep the composition centred on the zoom
  point; for an outgoing `zoom` put the thing we fly into at the zoom centre `trans.cx, trans.cy` of the NEXT
  shot). For `cut` shots, make the cut land on a strong composition (match cuts are great).

## Composition rules (vertical video inside an app)

- Frame 1080×1920. Keep the main action in the **upper 62%** (y < 1190) and centre band; the **64–82%
  band (y 1230–1575)** is where meaning subtitles appear — keep it calm there (no important detail, no
  text, no high-contrast clutter directly behind y≈1350–1520). The bottom 8% (y > 1765) and right edge
  (x > 960, y > 1000) are covered by app UI — nothing important there.
- No on-screen narration text. Short handwritten pencil labels (`E.note`) are allowed only where the
  storyboard asks for them, and only with words that are spoken.
- Full-bleed backgrounds (a soft sky/paper wash) usually; vignettes floating on paper are allowed where it
  serves the idea. Depth: 2–4 layers with gentle parallax.

## Alpha, softness, performance

- `E.alpha(L, a)` MULTIPLIES the current alpha of all layers (use inside `E.save(L)/E.restore(L)`); every paint
  helper and prop multiplies its own `alpha` with the context's current alpha, so fades compose.
- `soft:` edges (E.wash/E.lift/E.bloom) are fast (shadow-blur trick, scales with the transform). Avoid
  `ctx.filter = 'blur()'` in scene code: it costs ~30 ms per call on a full canvas. For soft solid fills use
  `E.softFill(ctx, path, color, blurPx)`.
- `E.smoothPath` (Catmull-Rom) overshoots on sharp corners / long straight sides — for boxes use `E.rrect`
  or build polygons with straight `lineTo`, or subdivide first (`E.wobblyShape`).
- Big props cost tens of ms (bigWorld ~65 ms, personalWorld ~35 ms, ground ~37 ms, statue/stone 30–47 ms).
  Budget the frame (< ~1.5 s total incl. ~0.5 s fixed overhead).

## The man

`E.man.draw(L, {x, y, h, view:'side'|'front'|'back', facing:±1, pose, alpha, tint, tintAmt, desat, outline})`.
(x, y) = ground point between the feet. Poses: side — `stand, walk(phase), reach(k), hold(k), embrace(k),
lookUp(k), handOnHeart(k), kneel(k), clutch(k), proud(k)`; front/back — `fStand, fOpen(k), fHeart(k),
fHold(k), fRaise(k), fHug(k)`. Blend with `E.man.lerp(a, b, t)`; poses are plain objects of angles, so you
may tweak fields (see man.js header). Walking without foot sliding: `x = x0 + E.man.walkSpeed(h, cycle) * t`
with `pose.walk((t / cycle) % 1)`. `E.man.shadow(L, x, y, h)` = soft contact shadow. He has no facial
features by design. He is the same man in every shot (do not restyle him). Keep him readable: h ≥ 260 px
when he matters.

## Palette

`E.P` holds the pigments (S-001 palette extended): ultramarine `#5C7CB7`, sap green `#9FB571`, viridian
`#35694C`, warm grey `#A99E9C`, raw sienna `#C2862F`, quinacridone rose `#AD657A`, paper `#F7F4EC`, plus
cerulean, indigo, ochre, gold, gamboge, blush, crimson, terracotta, umber, sepia, lavender, skin, coat… You
may mix your own (`E.mix`, `E.shade`), but stay in this family: luminous, transparent, slightly muted,
harmonious. The light part of the film is airy and warm; from "Yoksa" (s15) on the palette turns to night
indigo, slate, desaturated crimson, still watercolour on paper (never pure black; darks are layered
indigo/sepia glazes).

Reference image of the style: `/tmp/claude-0/-home-user-A/3737c98a-16c9-5b73-ba90-75aaf1cd832c/scratchpad/s001.png`
(transparent layered washes, hard drying edges, wet blooms, white paper left as light, light pencil
underdrawing, granulation, unfinished edges fading into paper).

## Sound cues

`sfx()` returns `[{t, type, gain, dur?, pitch?}]` with global times. They are mixed **quietly** under the
voice (no music). Types: `whoosh` (soft air movement, transitions, fast moves), `swell` (airy rising),
`bloom` (soft water-drop/plip, paint blooming), `pop` (soft appear), `chime` (soft bell; pitch 0.5–2),
`sparkle` (glitter), `pen` (writing scratch, dur), `page` (paper rustle), `book` (soft book close thud),
`heart` (soft heartbeat), `sand` (hourglass trickle, dur), `wind` (dur), `water` (gentle splash), `bubbles`
(dur), `grow` (organic rising tone, dur), `stone` (stone grind), `rumble` (low dark, dur), `drone` (dark
ambient bed, dur), `thorn` (dark scrape). gain 0..1 (0.3–0.6 typical). Use them where they support the
image, not on every event.

## Previewing (do this a lot, and LOOK at the images)

```
cd /home/user/A/uretim/dunya-menzil
node tools/render.cjs shot s05 --n 12 --out /tmp/claude-0/-home-user-A/3737c98a-16c9-5b73-ba90-75aaf1cd832c/scratchpad/prev/s05
node tools/render.cjs stills --times 15.2,16.0 --out <dir>          # exact moments (e.g. word onsets)
```
`shot` writes N frames spanning the shot (including the transition tail) and `sNN_contact.jpg`. Open PNGs /
JPGs with the Read tool. Check full-size frames for detail quality, and the contact sheet for motion/pacing.
Page errors are printed by the renderer — fix them. A frame takes ~1 s to render; keep previews
proportionate.

## Quality bar

World-class motion design with the warmth of a hand-painted watercolour. Every frame should be a beautiful
painting: deliberate composition, focal point, value structure (light/mid/dark), colour harmony, depth,
generous negative space. Clean, confident shapes (no accidental slivers, no aliasing artefacts, no shapes
cut off awkwardly by the frame edge unless intended). Metaphors must be instantly clear to a general
audience. Respectful: no depiction of God, prophets or angels, and nothing visual stands for Allah — no brightness at His
Name, no light from above for His mercy, nothing tying Him to the sky, no ornate circular emblem for a Divine Name
(binding rules: docs/KURALLAR.md). The Qur'anic verse is treated with reverence.
