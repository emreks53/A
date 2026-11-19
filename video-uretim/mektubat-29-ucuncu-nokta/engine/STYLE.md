# Engine & style guide — "Bu dünya dârü'l-hikmettir" (Mektubat, 29. Mektup)

Vertical short, 1080×1920, 30 fps, ~59.6 s. Narration only (no music). Kurzgesagt-like *model*
(animated visuals that mirror what is being said, sentence by sentence) but NOT their space theme
and NOT their flat-vector look: our look is **S-041 Guaj (gouache)** from the user's style catalogue.

Reference image of the target look: `../artifact-files/7de732b9-35e2-4c1e-8a16-6ff096aa05cf/stiller/S-041-guaj/ornek.png`
(open it with the Read tool). Character reference: `../work/prev_rig/t_000.00.png` (walk strip).

## The look (S-041 Guaj)
- Opaque, matte, chalky flat colour. Light and shadow are built from **2–3 flat tones placed side by side**
  (base, shade, light), each its own rough-edged shape — never smooth gradients (a very faint `glow()` is allowed
  for light sources only, sparingly).
- Inside flat areas, visible **brush striation** following the form (sky/ground horizontal, trunks vertical,
  domes along ribs, petals outward). `fillG(ctx, path, color, {dir, tex, scale})` does this automatically.
- Large areas (sky, ground, mountains) are covered with **dabs**: short horizontal opaque strokes of near colours,
  interlocking at band boundaries (see `bandSky`, `dabs`, `brushDab`). Pre-render these into sprites once.
- Edges are hand-painted: always build shapes with `rough(points, {amp, seed})` (amp ≈ 1–3 px at 1080 width).
- Light sources are painted as **concentric flat rings** (`ringHalo`), like the sun in the reference.
- Palette: start from `P` in core.js (catalogue colours: #3B6F95 #8AB5BD #184731 #44894D #93C077 #ABA5AE #D8B47E #EAE0CA)
  plus the extensions; you may add colours that serve the meaning. Avoid pure black/white; keep it harmonious and calm.
- The WebGL finishing pass (post.js) adds paper grain, slight paint relief, edge break and matte grading to every
  frame automatically — do not try to simulate those yourself.

## Animation rules (Kurzgesagt-level, but not faster than Kurzgesagt)
- One clear visual idea per phrase; elements build up additively as the words come. Do NOT change the picture on
  every word — the viewer must be able to follow. Use the word onsets in `timing.js` to sync beats.
- Smooth, eased motion everywhere (`E.inOutCubic`, `E.inOutQuint`, `E.outBackSoft` for gentle pops, `seg()`, `env()`, `track()`, `camAt()`).
  Nothing pops on/off in one frame: appear/disappear over 0.25–0.5 s (scale + fade, or paint-in).
- Secondary motion: breathing, gentle sway of plants, floating lights, slow parallax camera drift. The image should
  never be completely static.
- Camera: slow drifts and purposeful moves (pans/zooms eased), parallax between layers.
- Composition for Shorts: keep important things inside x∈[90, 960], y∈[160, 1340]. The band y∈[1290, 1440] is
  where the word-meaning subtitles appear (drawn by another module) — keep it visually calm/readable (no busy
  high-contrast detail behind it). The bottom ~420 px is covered by the player UI: background only there.

## Human figure
Use `rig.js` only (`drawMan`, `walkPose`, `STAND`, `mixPose`). A simple, detail-less, faceless but correctly
proportioned bearded man (cream shirt, warm-brown vest, slate trousers). Never draw other human designs.
Acting is done with posture (head bowed = sorrow, upright = serenity). Hands: 'relaxed' | 'grip' | 'open' | 'cup'.
`drawMan` returns joint positions in world px (handN, wristN, handAngN, handF, head, back, …) so props
(lamp, load, jug) can be attached.

## API (read core.js / rig.js for details)
core.js: `W,H,FPS,clamp,lerp,invlerp,remap,smooth,E,seg,env,rng,noise1,fbm1,noise2,rgb,css,mix,mixc,shade,P,`
`ellipsePts,rectPts,bezPts,crPts,resample,roughen,toPath,rough,transformPts,fillG,dabs,brushDab,strokeG,`
`sprite(key,w,h,drawFn) (cached OffscreenCanvas),ringHalo,glow,applyCam,camAt,camLerp,track,withAlpha,at,bandSky`.
rig.js: `drawMan(ctx, pose, {size, facing, alpha, ghost, seed})`, `walkPose(dist, {size, x0, ground(x)->y, stride, lean, armN, armF, crouch})`,
`STAND`, `mixPose(a,b,t)`, `ik2`, `LEG` (hip height in body units). Pose arms accept `{ik:[x,y] (world px), bend, hand}`
or `{sh, el, wr, hand}` angles (radians; sh relative to torso, + = forward; el = elbow bend ≥ 0).
timing.js: `WORDS` (video-time onsets), `on(word, n)`, `off(word, n)`, `GLOSSES`.

## Scene module contract
```js
// scenes/<name>.js
export async function init() {}            // optional: pre-render sprites (may be slow, runs once)
export function draw(ctx, t) {}            // t = GLOBAL video time in seconds; paint the whole 1080x1920 frame (opaque)
```
`ctx` arrives with identity transform. Always restore state you change (`save/restore`). Deterministic: the
same `t` must give the same image (no Math.random / Date — use `rng(seed)` / `noise1`). Must work for any `t`
inside your range including the margins (hold poses before/after).
Per-frame budget: ≤ 250 ms in headless Chromium (software rendering). Pre-render static art via `sprite()`.

## Testing
- Test timeline: create `tests/<name>_tl.js` exporting `DURATION`, `init`, `draw` (delegate to your module); then
  `cd engine && node preview.mjs ../work/prev_<name> 36.0 37.5 39.0 --tl=./tests/<name>_tl.js` → PNGs (view with Read).
- Motion check: `node render.mjs ../work/<name>.mp4 --tl=./tests/<name>_tl.js --from=35.4 --to=42.3 --workers=2`
  then extract frames / contact sheets with ffmpeg + Pillow and look at them.
- Do NOT edit core.js, rig.js, post.js, main.js, timing.js, timeline.js (owned by the integrator). Put helpers in your module.
