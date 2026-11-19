# End card: Risale-i Nur + Kur'an-ı Kerim (photoreal, Blender 4.5 / Cycles CPU)

## Files
- `build_scene.py`: a single script with two jobs. Run with system `python3`, it generates every texture into `tex/` (Pillow, numpy, scipy). Run in Blender (`blender -b -P build_scene.py [-- --skip-tex]`), it first regenerates the textures by calling itself with python3, then builds the scene procedurally and saves `scene.blend`. All the tunables (camera, lights, staging, exposure, samples) are constants near the top of the file.
- `scene.blend`: the finished scene. Frames 1–150, 30 fps, 1080x1920. The output path is preset to `frames/endcard_####.png`.
- `render_stills.py`: renders and times stills. Usage: `nice -n 10 blender -b scene.blend -P render_stills.py -- --frames 1 75 150 [--samples N] [--pct P] [--border x0 y0 x1 y1] [--exposure E] [--nocomp] [--nodenoise]`. It prints the wall time, the CPU time and the load average for each frame.
- `check_comp.py`: prints the screen boxes of the books, the Mushaf and the rahle, and where the riser edge falls, for frames 1, 75 and 150.
- `camstats.py`: prints the slider move (distances, velocity and acceleration profile) and the depth-of-field blur (circle of confusion in px) for frames 1, 75 and 150.
- `probe.py`: `python3 probe.py image.png '{"name":[x0,y0,x1,y1],...}'` prints the median sRGB, HSV and CIELAB of each region (full-res coordinates). **Colour is signed off with this tool, not by eye.** Both critics showed that the image viewer and our perception adapt heavily.
- `flicker.py`: the temporal stability test. Run it on a rendered frame range: `python3 flicker.py frames_test/t_%04d.png 60 90`.
- `camtry.sh`: quick framing iteration. It patches the camera constants, rebuilds and runs check_comp.
- `stills/frame_0001.png`, `frame_0075.png`, `frame_0150.png`: round-2 stills. `stills/r1/` holds the round-1 stills, and `it*_` are older iterations.
- `frames_test/`: frames 60–90 at final settings, rendered for the flicker test (no compositor).
- `build_scene_r1_backup.py`: the round-1 script, for reference.

## Round 2: what changed (critic by critic)

### Light (photoreal 1, 2, 5, 6, 9; spec 1, 3)
- **Window key moved in front of the row plane.** It now sits at (−0.88, −1.08, 0.80), about 47° off the spine normal and 25° high. It is window-sized (1.2 x 1.6 m), with spread 45° so the edges of the frame fall off. Colour is 4600 K.
  - Round 1 grazed the spines at about 1.5°, which gave striped spines and the 170 mm Mektubat shadow.
  - Mektubat's shadow on Lem'alar is now a short soft strip. Lem'alar measures L* 69 against L* 78–81 for the lit spines. In round 1 it was L* 29.
- Mektubat's pull was reduced from 30 to 24 mm (inside the 2–4 cm spec), and its yaw changed to +0.8° so that it no longer hides Lem'alar's title.
- **Fill:** BounceRight is 18 W, 2.0 x 1.5 m, 6800 K. The world is a cool tint at 0.05. Diffuse bounces went from 2 to 3.
- **Flags:** two camera-invisible black flags. One sits 4.5 cm above the heads and starts 3 cm behind the spine line. The other stands beside Sözler's exposed board. The row angle was reduced from 11° to 8°, so Sözler's board is now nearly edge-on.
- **Kicker:** a light-linked kicker on Mektubat only (+~0.3 EV). Mektubat measures L* 81 against L* 78–79 for its neighbours.
- **Back wall:**
  - The window key and the fill are flagged off the wall.
  - The wall gets a broad window-side area light (WallGrad, linked to the wall), which falls from L* ~76 on the left to ~62 on the right. That replaces the centred wash.
  - The wall also gets a sun patch: 3300 K, angle 1.5°, through a window gobo, so the mullion pattern is crisp. The patch sits on the left, entirely below the 30% line.
  - The wall albedo is warmer greige with ±4% mottling at about 0.5 m scale.
  - Measured in the title zone: (175,158,138), s 0.21, which is about the critic's target (170,155,138).
- **QuranKey:** 24 W, 4200 K, from the left side so it grazes the carving. It now also reaches the wall and the riser, so the rahle and Mushaf cast real shadows.
- **Colour management:**
  - AgX look changed from "Medium High Contrast" to "Base Contrast".
  - The Blender 4.5 view white balance is on at 5200 K, so the key reads slightly warm, the fill cool and the sun warm. That replaces round 1's all-orange palette.
  - Exposure is −1.45. The scene is lit about 1.4 stops hotter than round 1 and exposed down, so the shadows are fuller.

### Gold foil (photoreal 2, 10; spine part of spec 4)
- **Root cause of the "brown/dead" gold.** It was not only the dark environment. The deboss height map was a Gaussian blur of the letter mask, so every thin stroke was a V-groove with 45–55° flanks. Those flanks scattered the foil's mirror lobe into random directions.
  - Fix: the deboss is now dilated past the letter edge before blurring. The foil sits on a flat floor and the walls fall on the leather. The depth went from 0.30 to 0.16 mm.
  - I did the same for the Mushaf cover.
- **Reflector cards.** These are glossy-only area lights: visible_diffuse off, camera off, light-linked to the books.
  - **I did not use the critic's card position (−0.7, −1.5, 0.4).** A vertical spine seen from above mirrors the desk in front of it, because the mirror ray keeps the downward view angle of about 14°. With gold roughness ~0.2 (GGX α ≈ 0.04) a card at +9° elevation is about 23° off the mirror direction and gives nothing.
  - The script computes the mirror geometry from the actual camera and row. It lays a 1.1 x 0.72 m card almost flat on the desk 0.5 m in front of the books, out of frame, where a photographer would lay a white card. A smaller, brighter strip card is added for the title band.
  - A third card sits in the Mushaf cover's computed mirror direction, up and to the left, light-linked to the Quran set.
  - It is kept dim (3.5 W) and the Mushaf gold is a richer base (0.80, 0.50, 0.15). The ivory sits at AgX's shoulder (L* 84), and a gold as bright as the ivory renders as pale khaki.
  - The şemse now measures (199,177,154), L* 73.5, which reads as ochre gold on (217,209,198) ivory, with bright rims on the raised edges.
- Gold base changed to (0.80, 0.52, 0.18), roughness about 0.18–0.24.
  - Under AgX, a gold brighter than the pale leather desaturates toward cream. So the foil is tuned to sit at about the leather's luminance but much more saturated, like antique gold, with glints on the bands.
  - The burnished (pressed) leather halo around each letter is darker. That outlines the letters at screen scale.
- **Titles are larger.** Horizontal 9–10 mm cap heights are physically impossible on 27–31 mm spines with 8-letter words: the maximum em is 6.2 mm, a cap height of about 4 mm. So the layout changed:
  - Volumes 34 mm or thicker (Sözler, Şuâlar, Tarihçe-i Hayat) keep horizontal titles: 10 mm em (cap about 6.5 mm), and Tarihçe two-line at 7.9 mm.
  - All the others, including **Mektubat**, read top-to-bottom at up to 11 mm em (cap about 7 mm). The hero title is about 1.8x larger than in round 1.
  - Long titles are limited by the panel length. "İman ve Küfür Muvâzeneleri" now has clearance from its frame.
  - All 14 titles were re-checked on the texture sheet (`preview/spine_sheet.png`): exact spelling, â î û ş ı İ ğ ’.

### Leather and colour (photoreal 3, 6; spec 1, 7)
- **Albedo is now (212,153,125)**, with ±3.5% per-volume value and slight hue drift, plus sun-fading toward the heads (10–18%).
  - AgX keeps only about 40% of the log-chroma of a pale colour at L* ~80. The albedo was pushed so that the **rendered** spine lands on the targets.
- **Measured in frame 75** (median of the title panel, `probe.py`):
  - Lit spines (216–223, 186–196, 172–184): L* 77.7–81.1, C* 12–14, hab 51–54, HSV s 0.17–0.21.
  - Lem'alar (Mektubat's soft shadow): L* 69.5.
  - These sit between the two critics' targets: the spec critic asked for L* 75–79, C* 14–18, hab 40–50, and the photoreal critic for lit ≤ (230,200,185) and shadow ≥ (175,140,125). The result is a very light, faded dusty red-tan, not saturated, not candy, not burgundy. I kept the hue at hab ~52, between the spec critic's 40–50 and a tan, because of the user's "leaning a little toward light brown".
- **Leather shading:**
  - Roughness 0.29 + 0.12 in the grain crevices + slow mottled variation (±0.08). Specular IOR level 0.58.
  - A cheap grazing-angle sheen (LayerWeight Facing³ x 0.12) instead of the costly Sheen lobe.
  - Grain bump 0.07 mm (was 0.028), wrinkles 0.05 mm. Darker crevices. Mottling contrast raised (0.84–1.10).
  - At 2.5 px/mm the pebble grain is still near the screen's resolution limit. Pushing it further would shimmer in motion.

### Kur'an-ı Kerim and rahle (photoreal 4; spec 5)
- **Staging.** The rahle stands on a 255 mm walnut riser with a moulded overhanging top. That is 15 mm above the book tops.
  - In frame, the riser edge sits about 38 px above the book tops (about 2.3 cm at its depth), and the rahle's feet and the whole X stand clear of the books.
  - The riser is narrower in frame than the row, so only its top board and a sliver show. A full-width step read as a big flat cabinet, so I replaced it.
  - The wall moved to 0.80 m, closer, so the stand's shadow lands on it.
- **Rahle:**
  - 205 mm wide, 175 mm legs, 150 mm arms, 16 mm boards, phi 33°, yaw −20° (was −35°).
  - The arm crown has a deep ogee dip, so the longer front arm frames the şemse instead of hiding it.
  - Openwork: an 8-point star with a crown of 5 drilled pearls on the arm; a tall mihrab window flanked by two lancets and a small star on the leg.
  - Relief carving (bump 2.2 mm): border grooves, a lobed rosette ring, raised arch frames round the openings, and rumi scrolls on the shoulders. Grime sits in the recesses.
  - Lighter oiled walnut with a cathedral figure and pores. Measured: arm (117,76,49) about the critic's #6B4A33, lit leg (153,117,94).
- **The Mushaf is not counter-rotated against the rahle.** A book resting flat on the arm cannot turn relative to it. The yaw was reduced instead.
- **Mushaf:**
  - Now 250 x 178 x 46 mm, slightly larger than the Risale volumes.
  - Ivory (242,232,208). It renders at (214,204,193): s 0.10, L* 82.6, the brightest object, above the spines' L* 78–81.
  - Its spine is flat with no European bands: head/tail fillets, two small star ornaments and the title.
  - Cover relief raised (1.8).
- **Placement:** the Mushaf top is at 31–32.5% of frame height, never above the 30% line. It is always above the books.

### Page block (photoreal 5; spec 6)
- Signature groups 1.5 mm apart (wave bands with low-frequency waviness), per-signature tone ±5%, sub-pixel sheet lines, and dust.
- Cream albedo (226,208,170). The head flag cuts the window key on the heads, so they no longer out-shine the spines. The block stays recessed 2.5 mm below the boards.

### Wood (photoreal 7)
- **New generator:** flat-sawn walnut. Each board cuts tangentially through tapering growth cones, which gives nested 3–6 cm cathedral arches. The flanks are straight.
  - Colour shifts between boards, light streaks, and pores as 1–2 px ticks along the grain.
  - Satin roughness 0.30 ± slow variation, faint finish scratches, and a cloth wipe smear plus one fingerprint in the roughness near the front of the desk.
  - Darker desk: (135,93,73) measured.

### Lens, move, grain (photoreal 8, 11; spec 3)
- **Lens:** 62 mm, f/5. Measured circles of confusion: Mektubat in focus, Muhâkemat 0.8 px, Mushaf 4.8–5.0 px, wall ~6.8 px.
  - **Judgment call between the critics.** The row recedes only about 6 cm beyond the hero, so any visible fall-off along it (≥3 px, as the spec critic asked) would blur the Mushaf beyond about 15 px. Keeping the honoured Mushaf legible wins. The depth cue comes from the Mushaf, the stand and the wall.
- **Slider move:** an inclined straight line with fixed orientation: 60 mm lateral, 65 mm push-in, 20 mm rise, 90.7 mm in total.
  - The clip is cut in mid-move: 0.97 mm/frame at frame 1, easing smoothly to 0.04 mm/frame at frame 150. Maximum acceleration is 0.012 mm/frame².
  - There is a key on every frame with linear interpolation, so the profile is exact.
  - Parallax between the row and the Mushaf is about 25 px over the shot (round 1: about 9 px).
- **Spine maps** stay 2560 px tall (the spec asks for 2048+), but the foil mask is pre-filtered (Gaussian σ 1.35 texels, about 0.13 mm). That band-limits it near the on-screen density, because Cycles has no mip-mapping.
- **Grain:** the 24 grain plates are now offset to a random wrap-around position every frame (Translate node, constant keys), so all 150 frames have unique grain. σ about 2.0% multiplicative.

### Not done, and why
- **Bowed boards and fore-edge irregularity.** The fore-edges face away from the camera, and only a sliver of one board is visible. It is not worth the geometry.
- **Room geometry (ceiling, walls, V-flat).** Replaced by reflector cards and flags, which give the same reflections more cheaply and are controllable per object.

## Render settings and time
- Cycles CPU, **9 spp**, adaptive threshold 0.03, OpenImageDenoise (albedo + normal, prefilter ACCURATE, quality BALANCED).
- Fixed seed 1907, animated seed off. Bounces 5/3/2. Filter Blackman-Harris 1.7 px. Light tree off. Caustics off.
- **Measured at 1080x1920, final stills (compositor on):**
  - CPU 91–102 s per frame, which is **22.7–25.6 s when divided by 4 cores**.
  - At light load (2.8–3.8, mostly our own render) the wall time was **24.0–27.3 s**. The 27.3 s includes the first-frame scene sync.
- **Flicker-test frames 60–90 (compositor off):** CPU/4 21.9–24.1 s (median 22.9 s). Wall median 25.4 s on the 12 frames rendered at load < 5.
- Path tracing is about 20 s of the CPU/4 time, and OIDN plus compositing about 3–5 s.
- Other processes often loaded the box to 6–11 during this session. Under that load the same frames took 40–88 s wall with the same CPU time.
- 9 spp is the count that keeps a frame at about 25 s. The sequence of 150 frames is **not** rendered in this round: about 63 min at ~25 s/frame. Output path `frames/endcard_####.png`.

## Temporal stability (frames 60–90, final settings, compositor off)
The test uses `flicker.py`, the second temporal difference |f_k − (f_k−1 + f_k+1)/2|, which cancels the slow, locally linear camera motion. Results are in 8-bit levels, mean / p99:
- Wall, title zone: 0.04 / 0.5. Wall, sun patch: 0.11 / 0.5.
- Mushaf cover: 1.07 / 7. Rahle: 1.49 / 9. Desk: 0.84 / 3.5.
- **Spine titles and ornaments: 4.3 / 39.** This is the only real shimmer risk, as the spec critic predicted. It sits on the in-focus high-contrast edges: book gaps, band ridges and foil.

**The defocused Mushaf, rahle and wall do not boil.** f/5, more light on the Mushaf and the pre-filtered foil mask took care of that.

**Seed-to-seed test** (same frame, seeds 1907 and 2024), mean / p99:

| Setting | Mean | p99 |
|---|---|---|
| 9 spp | 3.7 | 25 |
| 12 spp with FAST prefilter | 3.8 | 24 |
| Filter width 2.2 | 3.7 | 26 |
| Adaptive sampling off | 3.7 | 25 |
| 24 spp | 3.0 | 21 |

The edge noise left after OIDN falls only slowly with samples, so no affordable sample count removes it.

**Recommended fix at encode time.** Apply a 3-tap temporal blend, `ffmpeg ... -vf "tmix=frames=3:weights='1 2 1'"`. It acts like the motion blur of a 180° shutter: the image moves at most ~1 px/frame, so it softens nothing visibly. On frames 60–90 it halves the spine shimmer (mean 4.3 → 2.3, p99 39 → 24) and the Mushaf/rahle residue.

The difference video is `preview/flicker_tblend.mp4` (ffmpeg tblend difference, contrast x6), and the frame-75 map is `preview/flicker_x8_0075.png`.

## Known weaknesses
- **Pale colour is a narrow target under AgX.** If the leather should read redder, lower `LEATHER_SRGB` G by about 4. If it should read browner, raise G by about 4. Re-measure with `probe.py` every time; never judge by eye.
- **Foil contrast on the brightest spine.** All titles are legible at full resolution, and Lem'alar is unclipped in frames 1, 75 and 150 (`preview/mek_lem_3frames.png`). The hero "Mektubat", though, has the lowest foil-to-leather contrast, because its kicker puts it highest on the AgX shoulder. To strengthen it, lower `KICK_W` (1.2 → ~0.8) or raise `HOT_W` slightly, then re-probe.
- **The leather grain is near the screen's resolution limit.** It reads as fine texture, not as distinct pebbles.
- **The rahle's two leaves read two-tone.** The front arm faces forward and down, and the back leg forward and up, under a high window light. That is physically right, but the stand reads somewhat darker on top.
- **The Arabic in the şemse cartouche only suggests calligraphy** at this distance and blur.
- **Compositor.** Bloom, CA, vignette and grain are still applied in the scene's compositor. Turn `use_compositing` off if another program will grade.
