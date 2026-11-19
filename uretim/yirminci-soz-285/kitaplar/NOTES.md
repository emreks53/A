# Risale-i Nur + Qur'an closing still (revision 2)

This folder is a revision of `../books/`, which was left untouched.

## Deliverables
- `hero.png`: 1296×2304, 8-bit sRGB, finished. It is 1.2× the 1080×1920 delivery size, so the edit can do a slow push-in crop.
- `hero_depth.exr`: camera-space Z depth in metres, float32 in R=G=B, rendered without depth of field.
- `hero_depth.png`: the same depth, normalised to 16 bits (near is dark, far is light). The range is given under "Render settings".
- `hero_raw.png`: the 16-bit render before finishing, kept so the finishing can be redone.
- `scene.py`: the whole pipeline. It imports `textures.py`, which generates the spine and cover art with PIL. `tex/` and `assets/` are copied from the old folder; the spine textures were regenerated.
- `render_final.log`: the final render log. `tests/` holds the low-res iteration renders.

### Reproduce
```
python3 scene.py --tex      # regenerate spine + Qur'an cover textures
python3 scene.py --pct 100 --spp 160 --noise 0.02 --out hero_raw.png --depth hero_depth.exr
python3 scene.py --post hero_raw.png hero.png
python3 scene.py --measure hero.png
```
`--measure` prints the median RGB of patches on the spines. The patches are projected from 3D, so they always sit on the same leather, and their coordinates are written to `patches.json`.

## What changed, and why

### 1. Leather colour
**Target.** The client's target for the lit middle of the Sözler spine is about (210,168,150), hue 15–20°, saturation at most about 30%. I aimed at **(207,171,153)**: hue about 19–20°, saturation about 26%. That is inside the ±8 tolerance on every channel, but on the dustier, browner side of it.

**Why not hit (210,168,150) exactly?** The old render already measured about (212,170,154) on that patch, and the client still read it as salmon-pink.

**Calibration**
- The old ALBEDO_COMP and the "AgX - Punchy" look were dropped. The view is now plain **AgX, look None ("natural")**, at exposure −1.85.
- AgX desaturates bright colours strongly. To display (207,171,153), the spine has to send scene-linear light in a ratio of about 1 : 0.43 : 0.26.
- I calibrated on Blender's own AgX transform. `agx_forward()` saves a probe image through the scene's view transform; `agx_inverse()` and `calibrate()` invert it.
- Each step: measure the finished render, then convert the measured and target display values to scene-linear. The per-channel ratio sets the albedo, and the common part goes into exposure.
- It took three iterations, and every measurement was made on the **finished** image (after vignette and grain).
- Final base albedo (linear): **(0.5637, 0.2627, 0.1669)**. Each volume gets a ±3 % value variation and a ±1 % warmth variation as dye lots.

**The volumes behind Sözler**
- They stand in the window shade of the book in front. Under AgX, darker areas of the same albedo become more saturated, and these spines read as peach.
- Their albedo is therefore a touch paler: luminance-preserving chroma ×0.90→0.84 along the row, value ×1.04. The hue is kept.
- They render darker than Sözler but with the same hue, at saturation 28–31 %. See the measurements below.

### 2. Realism
**Light**
- **Key: a window at camera-left.** It is a low, raking 1.0×1.1 m area light at 62° left of the camera axis and 12° elevation, 2 m away.
- The old key was 2.0×1.6 m, 34° left and 23° up, which is why it looked flat.
- The key rakes across the spines. It picks out the pebble grain, the rib relief, the embossed lace and the walls of the debossed titles, and it lights Sözler's board and the rahle from the left.
- **Fill: a broad, warm bounce card at camera-right** (35° right, 12° up).
  - With a camera-left key, every volume behind Sözler is shaded by its neighbour. That is pure geometry of the echelon, so they are lit mostly by the bounce.
  - The fill is set so they sit about −0.5 stop below Sözler.
- There is a little frontal room light and the clamped HDRI (window sky).
- The back wall keeps its own light-linked soft spill, as in the old pipeline.

**Bug fixed: the left wall blocked the key.** The invisible-to-camera "window wall" (`LeftWall`) used to sit at x = −0.95. Any key placed further left than that was silently blocked. The wall is now at x = −2.4.

**Leather shader** (`leather_core`)
- **Pebble grain:** two octaves of distorted 3D Voronoi distance-to-edge at 1.7 mm and about 0.7 mm cell size, plus the Poly Haven leather scan. The bump is 0.4 mm deep, with domed pebbles and narrow creases.
- **Grain colour and finish:** dye pools slightly darker and browner in the creases, and the pebble tops are slightly polished.
- **Roughness:** a satin 0.33–0.55, varied by the scan and by a low-frequency "handled" noise.
- **Sheen:** light (0.08).
- **Wear:** a very light analytic edge and corner wear mask. It is computed from object-space distance to the head and tail edges, the fore-edge, the board corners and the spine shoulders, broken up by noise.
  - It costs no Bevel or AO rays.
  - Worn leather is a touch darker, browner and more burnished, with the grain pressed flatter.
- **Foil:** inside the hot-stamped foil the grain is ironed flat, so titles read as solid metal. Small rubbed specks remain.

**Spine tooling** (`textures.py`)
- The **lace bands are now embossed (raised)** and enlarged so the motif resolves at hero size: a teardrop and an arrowhead chevron between two fillets, 6.8 mm high.
- The title and author line stay **debossed**, with a slightly irregular impression depth.
- The three raised ribs at head and tail are kept. The rib bump is 1.2 mm.
- The champagne gold is slightly warmer.

**Imperfections**
- Volume heights vary randomly by up to ±1 mm.
- Three volumes lean:
  - Mesnevî-i Nûriye: 0.3° forward
  - Emirdağ Lâhikası: 0.5° back
  - Muhâkemat: 0.55° sideways, onto nothing
- **Page blocks:**
  - warmer cream
  - a per-volume tint (different paper stock or age)
  - soft dusty mottling
  - signature-level unevenness of the trimmed head (a low-frequency bump)
- Contact shadows come from the smaller, lower key plus path tracing.

**Desk:** the walnut normal map is now actually connected; in the old shader it was created but never linked. The desk and rahle walnut are slightly darker and richer. The rahle's clear coat is reduced so it does not glare white in the window light.

**Lens and finishing** (`finish()`)
- 56 mm, f/3.2. It was f/2.8; the change brings the Qur'an a little closer to legible while the wall stays creamy and soft.
- A very faint halation from the brightest areas.
- A natural vignette, flat in the centre (Sözler is attenuated by less than 1 %).
- 0.03 % lateral chromatic aberration.
- Very fine luminance-weighted film grain (σ about 1.7/255 in the mid-tones) with a faint chroma component.

### 3. Rahle and Qur'an
- **Construction unchanged:** carved X-crossed walnut boards with interlocking hinge tongues, pierced pointed-arch windows, an arched cut between the feet and ogee finials. The Qur'an rests in the V of the upper arms, and nothing sits on it.
- **Highest object:** the Qur'an's top is at y ≈ 0.17 of the frame, against y ≈ 0.42 for the tallest volume (Sözler), so it remains the highest object.
- **Changes:** with the new raking key the rahle reads as lit walnut, not a dark silhouette. The Qur'an's gold tooling is darker and warmer (border, corner quarter-medallions, scalloped şemse with its cartouche) so it holds against the ivory, and the leather grain was added to the cover.
- **Rahle view:** from this camera, Sözler hides the rear leg, so the X reads best at the hinge and in the upper arms. I judged that acceptable and did not rebuild it.

## Composition and push-in crop
- Normalised frame positions, y measured down:
  - Qur'an: x 0.14–0.49, top y 0.169
  - Sözler: x 0.26–0.39, bottom y 0.686
  - Muhâkemat: x 0.77–0.81
- Below y ≈ 0.69 there is only the soft walnut desk. That is the bottom 31 % of the hero frame.
- With a centred 1080×1920 crop (83.3 %), the Qur'an top lands at y ≈ 0.10, Sözler's bottom at y ≈ 0.72, and the bottom 28 % stays calm.
- The faint curtain glow at the far left edge falls outside that crop.

## Measured colour in the final `hero.png` (8-bit sRGB, after finishing)
Each value is the median of a 13×13 grid of points projected from 3D onto the spine centre (u 0.38–0.62). Each sample is a 3×3 pixel mean. All patches avoid gold tooling. Run `python3 scene.py --measure hero.png` to repeat the measurement.

| Patch | RGB | Hex | Hue | Sat (HSV) | Δ vs (210,168,150) |
|---|---|---|---|---|---|
| **Sözler, lit middle** (z 165–200 mm, between head lace and title) | **(206, 169, 152)** | #CEA998 | **19.0°** | **26.4 %** | −4, +1, +2 |
| Sözler, lower (z 33–60 mm) | (203, 164, 146) | #CBA492 | 19.1° | 27.9 % | −7, −4, −4 |
| Mektubat | (195, 157, 139) | #C39D8B | 18.9° | 28.9 % | darker (shade) |
| Şuâlar | (194, 156, 138) | #C29C8A | 18.9° | 28.9 % | |
| Barla Lâhikası | (193, 155, 137) | #C19B89 | 18.7° | 29.0 % | |
| Tarihçe-i Hayat | (189, 150, 133) | #BD9685 | 18.6° | 30.0 % | |
| Muhâkemat (furthest) | (183, 144, 126) | #B7907E | 18.6° | 31.1 % | |

Other regions:

| Region | RGB | Hue | Sat (HSV) |
|---|---|---|---|
| Sözler's window-side board | (202, 168, 151) | 20° | 25 % |
| Page-block tops (cream) | (193, 179, 159) | 35° | 18 % |
| Qur'an ivory cover | (209, 201, 191) | | |
| Wall | (192, 182, 169) | | |
| Foreground desk | (134, 104, 85) | | |

**Exposure check:** the 16-bit render peaks at 0.955 of full scale and no pixel clips. `hero.png` peaks at (247, 235, 222), and no channel reaches 254.

## Render settings and time
- **Machine:** Blender 5.3 (bpy), Cycles CPU, threads FIXED = 3.
- **Image:** 1296×2304, AgX with look None, exposure −1.85, sRGB display.
- **Sampling:** adaptive, max 160 spp, min 26, noise threshold 0.02, seed 11.
- **Denoising:** OpenImageDenoise with albedo + normal passes, prefilter ACCURATE, quality HIGH.
- **Light paths:** max 5 bounces (diffuse 2, glossy 2, transparent 2, transmission 0), caustics off, filter glossy 1.0, indirect clamp 6.
- **Timing:**
  - beauty render: **1438.8 s (24.0 min)**
  - depth pass: 8 s
  - build: 2 s
  - total wall time 24 min 10 s (see `render_final.log`)
  - finishing (`--post`): 2 s
- A low-res benchmark showed 224 spp at threshold 0.015 would take about 55 min, so the cap was set at 160 spp to stay inside the 45-minute budget. Low-res iteration renders took 15–100 s each.
- **Depth pass (`hero_depth.exr`):**
  - A second render of the same camera with depth of field off.
  - An emission material override outputs Camera Data "View Z Depth", rendered at 16 spp with no denoise and saved as float EXR in metres.
  - `hero_depth.png` is the same data normalised over its 0.05–99.95 percentile range, **1.098 m (black) to 3.124 m (white)**, near = dark.
  - Edges are anti-aliased by the 1.5 px pixel filter.
  - The faint curtain strip at the far left edge is a real (camera-visible) object, so it shows in the depth too.

## Known weaknesses (honest assessment)
- **Hitting the client's numbers does not guarantee the client will read the colour as "not salmon".**
  - The old render already measured close to (210,168,150) and was still called salmon-pink. Part of that is context: pale cream pages and wall beside a dark walnut desk.
  - I moved to the dusty, brown side of the tolerance: hue 19°, saturation 26 %, and a less saturated, paler row.
  - On a phone screen it should read as pale rose-tan, but it is still a rose-leaning tan, as specified, not a camel.
  - If the client wants it browner, the cleanest knob is `leather_albedo` G up / R down by 2–3 % (hue toward 22–24°). That would leave the requested 15–20° range.
- **The rest of the row is lit mostly by a bounce, not the key.** With a camera-left key, each volume behind Sözler is shaded by its neighbour, so the raking texture is strongest on Sözler and its board. Those volumes are flatter and softer, though still grained and readable near the front.
- **The paler row is a deliberate cheat.** The receding volumes use a paler dye lot (chroma ×0.90→0.84) so that in shade they keep the same hue and about 30 % saturation instead of drifting to peach.
- **Wear and imperfections are deliberately tiny.** The ±1 mm heights, 0.3–0.55° leans and edge wear are barely visible at this framing. Headcaps are geometric: there is no modelled turn-in or headband bulge.
- **Page tops read beige and a little flat.** They catch only the grazing key.
- **The rahle's X is not fully visible.** Sözler hides the rear leg, so the stand reads as a carved walnut stand with the crossing at the hinge rather than a fully visible X. It was not rebuilt.
- **The Qur'an is soft.** It sits about 0.45 m behind the focus plane, so even at f/3.2 it is slightly soft; the cartouche calligraphy is ornamental rather than legible. The ivory is close to the top of the AgX range, so the gold tooling is gentle.
- **Two lighting tricks remain, inherited from the old pipeline:**
  - The back wall is lit by its own light-linked spill, and the key and fill do not light the wall.
  - The curtain glow is camera- and glossy-only.
- **The film grain is static.** It is seeded once (it was rendered for a still). If the video adds its own grain during the push-in, it may be worth re-running `--post` without grain (set `amp` to 0 in `finish()`).


