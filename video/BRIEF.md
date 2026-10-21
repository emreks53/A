# BRIEF — "İhtiyaçlar ve Hâlık-ı Rahîm" (vertical short, 9:16)

Read this whole file before touching Blender. It is the director's brief for every shot.

## 1. What we are making

A 2-minute vertical (1080×1920, 24 fps) narrated short. A Turkish narrator reads a text (from the
Risale-i Nur tradition) about how every need of every living being — oxygen, food, water, blood
flow, sunlight, even the cellular work behind reaching out a hand — is met for us, and how this
points to one Creator who knows, sees and cares for every creature one by one.

The *model* is Kurzgesagt: every sentence is mirrored by a visual that shows its meaning *at the
moment it is spoken*, the camera never stops moving with purpose, scenes flow into each other
through clever match-cuts, and small "interactive" graphics (labels, tracking rings, leader lines,
counters) explain what we see. The *look* is the opposite of Kurzgesagt's flat style:

> **REALISM IS PRINCIPLE NUMBER ONE.** Every frame must look as if it was filmed with a real
> cinema camera and real lenses in the real world (or, for microscopic shots, like the very best
> medical/scientific CGI — e.g. high-end documentary micro-photography). No toy look, no plastic,
> no CG-clean surfaces, no perfect symmetry, no flat lighting.

> **NO WOMEN.** (binding user requirement) No woman or female figure may appear anywhere in the film. The only
> human element is an adult **man's** hand/forearm (sh04, sh08): broad palm, thick fingers and knuckles,
> visible tendons/veins, hair on the back of the hand and forearm, short plain nails, no jewellery, a man's
> shirt cuff. Never anything that reads as a female hand.

There is **no music**. Sound effects only (done in post — but design moments that deserve a sound:
a drop landing, a bubble popping, a heartbeat pulse, a page turning).

On-screen text (done in post, NOT in Blender) is limited to **key words** at the moment they are
spoken plus a few small factual callouts. You must leave clean negative space for them (see §5).

## 2. The audio and the clock

* `audio/narration.m4a` — the voice. `timing/shots.json` — master shot table with every narrated
  word's start/end time. **All times are absolute seconds from the start of the film.**
* Frame `f` shows time `f/24`. Each shot owns `[cut_f0, cut_f1)` in the final cut and renders
  `[render_f0, render_f1)` (6 extra frames each side for dissolves — make them valid, continuing
  motion).
* Sync visual events to words with `ctx.word("güneş")` (start time of that word in your shot) —
  never hard-code a time you could look up. Visual events should land ~0–2 frames *before* the
  word starts (the eye leads the ear).

## 3. Global look ("style bible")

**Camera**
* Physical camera: `C.camera(...)` (vertical sensor 36 mm). Lenses 24–135 mm; macro work 60–100 mm
  with real close focus distances. Always DOF (f/1.8–f/8 chosen deliberately), always motion blur
  (180° shutter = 0.5, set by the library).
* Moves are real-world rigs: dolly, slider, crane/jib, drone, macro rail, handheld (tiny). Ease in
  and out (no linear starts/stops), slight overshoot-free settling. Add `C.handheld(cam)` with tiny
  amplitudes on most shots — a perfectly locked CG camera reads as fake.
* Every shot must have *continuous* purposeful motion (camera and/or subject). No dead frames.
* Rack focus is our friend: it makes macro shots read as real photography.

**Light & colour**
* Physically plausible light only: Poly Haven HDRIs (`C.ph_hdri`) and/or Nishita/multiple-scattering
  sky (`C.world_sky`) + a matching sun (`C.sun`), practical area lights shaped like windows.
* Natural light directions, motivated sources, real exposure (bright skies may clip softly, deep
  shadows keep a little detail). AgX view with "Medium High Contrast" is set by the library —
  tune `bpy.context.scene.view_settings.exposure` per shot rather than cranking light strengths.
* The film's emotional colour arc (keep to it):
  dawn gold (sh01) → morning interior warm/neutral (sh02–03) → harsh dry noon (sh04) → cool clear
  underwater cyan (sh05) → deep warm red micro-world (sh06) → sunrise orange-gold (sh07) → morning
  interior (sh08) → bio-luminous teal/amber micro-world (sh09–10) → grey rain turning to sun
  (sh11) → majestic golden aerial (sh12) → golden-hour meadow (sh13) → sunrise sunflowers (sh14a)
  → darkness (sh14b) → cold, desaturated grey-blue (sh14c) → warm amber sunbeam on red books (sh15).

**Materials & detail**
* Real-world scale in metres. Physically based materials. Every surface needs micro-variation:
  roughness breakup, tiny bumps, dust, fingerprints on glass, fibres on cloth, imperfect edges.
* Prefer real scanned assets: Poly Haven models/textures/HDRIs (`C.ph_model`, `C.ph_texture`,
  `C.ph_hdri`) — all CC0. Catalogue: https://api.polyhaven.com/assets?t=models (also t=textures,
  t=hdris). Human anatomy base meshes (CC0): `C.human_mesh("realistic_hand")` etc.
* Natural randomness: no two leaves/drops/cells identical; seeded `random` so renders are
  deterministic across machines.

**Composition for vertical 9:16 Shorts**
* Subject inside the central safe area. The top ~10 % and bottom ~22 % of the frame and the right
  ~12 % are covered by YouTube UI — nothing important there.
* Strong depth layering: foreground element (defocused), subject, background.

**Render budget** (we have CPUs only)
* Final = 1080×1920, `final_spp` default 32 with OIDN denoising (library presets). Target **≤ 40 s
  per frame on 4 CPU cores**. Measure with `--final --from F --to F` on a representative frame and
  report the number. If you are over budget: reduce bounces, clamp, texture limits, volume step
  rate, instance counts, subdivision levels, then spp — in that order. Never drop motion blur/DOF.
* Volumetrics are expensive: prefer fake light shafts (emission cones with gradient alpha) unless a
  real volume is essential and fits budget.
* Must be deterministic & self-contained: the script builds the whole scene from code + downloaded
  CC0 assets. No manual steps, no .blend dependencies.

## 4. Continuity between shots (the Kurzgesagt flow)

Each cut is designed as a match or motivated transition. Respect your shot's entry and exit:

| cut | transition (done in post, your frames must support it) |
|---|---|
| sh01→sh02 | sh01 ends tilting up into a bright sun flare (upper right); sh02 opens on bright window light flare at the same screen spot → light dissolve |
| sh02→sh03 | same room: sh02 ends with the camera tilting/booming DOWN from the window to the table; sh03 starts mid-move continuing down onto the table |
| sh03→sh04 | sh03 ends top-down on the abundant table with a round bowl at frame centre; sh04 starts top-down on barren cracked earth with the lone seedling at frame centre → graphic match |
| sh04→sh05 | sh04 ends with a hand reaching toward the sun high in frame centre; sh05 starts underwater looking up at the sun through the rippling surface at the same spot → match cut on the sun |
| sh05→sh06 | sh05 ends with one O₂ bubble rising into the lens, filling frame centre; sh06 starts with a red blood cell at frame centre coming at the lens (blood carries the oxygen) → shape match |
| sh06→sh07 | warm red flow → deep red-orange pre-dawn horizon → colour match dissolve |
| sh07→sh08 | sun glare fills the frame → sunbeam across the table → light dissolve |
| sh08→sh09 | camera pushes into the forearm skin → continues forward through red muscle tissue (zoom-through in post) |
| sh09→sh10 | sh09 ends inside one cell near mitochondria; sh10 starts there and pulls back |
| sh10→sh11 | countless glowing cells become glints → backlit rain drops (dissolve) |
| sh11→sh12 | camera tilts up into the bright rain sky → sh12 emerges from cloud into sunlight above the land |
| sh12→sh13a | aerial descends toward a meadow at golden hour → sh13a glides low over the meadow |
| sh13a→sh13b | continuous low glide, slowing; tracking rings start in sh13b |
| sh13b→sh14a | the seedling with its dew drop → focus pull to a sunflower's spiral (dissolve) |
| sh14a→sh14b | sunlit field darkens as shadow sweeps in → a glowing light being covered by a heavy dark cloth |
| sh14b→sh14c | darkness → cold grey desert (dissolve through near-black) |
| sh14c→sh15 | lifeless stone → a warm sunbeam sweeps across a wooden reading stand and red books |

Recurring hero: **the seedling** (sh01 receives the falling drop, sh04 alone in cracked earth,
sh11 receives the rain, sh13b receives the single drop/sunbeam). Spec: a real-looking bean-type
seedling ~6 cm tall, pale green slightly translucent stem with fine hairs, two thick cotyledons
plus two young heart-shaped true leaves with visible veins, subsurface scattering, a soil crumb or
two stuck to the stem. Studios that show it build it from this spec so it reads as the same plant.

## 5. Text & graphics safe zones (overlays are added in post)

Key words appear centred horizontally in the band **y = 520–820 px** (from the top of 1920). When
your shot has a scheduled key word, keep that band visually calm (sky, soft defocus, dark wall —
no busy high-contrast detail behind the text). Scheduled key words (absolute times):

| t (s) | text |  | t (s) | text |
|---|---|---|---|---|
| 2.7–5.1 | İHTİYAÇLAR KARŞILANIYOR | | 66.6–69.5 | BİR TEK YARATICI |
| 8.3–9.6 | OKSİJEN | | 72.6–74.0 | ONDAN BAŞKA OLAMAZ |
| 9.6–11.7 | YEMEK · İÇMEK | | 79.1–81.2 | HALIK-I RAHÎM |
| 14.7–15.9 | TAKDİM EDİLİYOR | | 82.8–84.0 | ŞEFKAT |
| 21.2–22.9 | ELİMİZ YETİŞMİYOR | | 85.6–88.7 | BİRER BİRER |
| 31.5–33.0 | KAN | | 90.0–93.8 | HİKMETLİ · ŞEFKATLİ · GÖRÜYORMUŞÇASINA |
| 38.9–40.5 | GÜNEŞ | | 93.8–99.3 | HER ŞEYİ GÖREN / ŞEFKAT EDEN / HİKMETLİ |
| 56.0–57.9 | HADSİZ İHTİYAÇ | | 104.3–109.7 | CANSIZ · ŞUURSUZ · ŞEFKATSİZ · ? |
| 61.0–63.5 | AYAĞIMIZA GETİRİLİYOR | | 112.0–115.1 | SÖZLER · 721 |

**Callouts / tracking.** Small labels with leader lines and tracking rings are pinned to 3D objects.
For every object that gets a callout, create an Empty named `TRK_<name>` at the point the label
should point to (parented to the moving object if it moves). The library exports their screen
positions per frame (`--track`). Required trackers are listed per shot below.

## 6. Shot specifications

Times are absolute seconds. "→ word" = event must land on that word (use `ctx.word`).

### sh01 · 0.00–5.24 · "Bu dünyaya baktığımızda tüm canlıların ihtiyaçlarının karşılandığına şahit oluyoruz."
Dawn meadow, extreme macro. Opens on a single dew drop hanging from the tip of a grass blade, frame
centre, lit from behind by the low sun; inside the drop the whole meadow and sunrise appear
refracted upside-down (real refraction). The camera on a macro rail slowly pulls back while focus
racks to reveal: hundreds of dew-covered grass blades, a few wildflowers (Poly Haven
`celandine_01`, `dandelion_01`), floating pollen motes glowing in the backlight, golden haze,
creamy bokeh. → "karşılandığına" (3.52): the drop swells, detaches and falls; → "şahit" (4.32) it
lands on the seedling's leaf below, which dips and springs back, splashing micro-droplets. Exit:
camera tilts up into a bright sun flare, upper right. Trackers: none.

### sh02 · 5.24–9.64 · "En başta kendimizden biliyoruz ki her gün oksijen ihtiyacımızdan"
Morning, a quiet real room (plaster wall, wooden window frame, linen curtain). Opens on the bright
window flare (match from sh01), exposure settling. Sun beams pour through the window; dust motes
drift and swirl in the beams; the sheer curtain breathes in and out with a soft breeze (a real
breath rhythm: inhale ~2 s, exhale ~2 s) — the air we breathe made visible. → "oksijen" (8.32):
the curtain's biggest inhale and a gust of glittering motes toward camera. Keep the key-word band
calm (curtain/wall). Exit: camera tilts/booms DOWN toward the table below the window.
Trackers: `TRK_air` in a beam of motes (callout "O₂ · havanın %21'i").

### sh03 · 9.64–16.00 · "yemek ve içmek ihtiyaçlarımıza kadar bütün ihtiyaçlarımız sanki bize takdim ediliyor."
Same room, the table (worn wood, Poly Haven `wood_table_worn`) set like a generous Turkish sofra:
bread (crusty round loaf or Poly Haven `croissant`/`hamburger_buns`), fruit in a wooden bowl
(`food_apple_01`, `food_pomegranate_01` — one cut open showing jewel seeds — `food_pears_asian_01`,
`food_kiwi_01`, `food_lime_01`, `lemon`), a glass jug, a clear drinking glass, a small tea glass.
→ "yemek" (9.64): slow slider move past the bread & fruit. → "içmek" (10.52): water is poured into
the clear glass (stream with real refraction, rising level, bubbles, meniscus) — a hero macro
moment. → "bütün" (12.0): the camera cranes up revealing the whole table. → "takdim" (14.9): a
plate with the opened pomegranate slides gently toward camera — offered to the viewer — while the
camera settles into a TOP-DOWN view with the round fruit bowl at frame centre (graphic match to
sh04). Trackers: `TRK_water` on the glass.

### sh04 · 16.00–22.95 · "Halbuki canlılar da bizler de bu ihtiyaçlarımızı kendimiz elde edemeyiz, hiçbirine elimiz yetişmiyor."
Opens TOP-DOWN on barren cracked dry earth (Poly Haven `mud_cracked_dry_03` / `dry_ground_01`
with real displacement) — the lone seedling at frame centre, wilting slightly, harsh high sun,
heat shimmer. → "canlılar" (16.76): camera descends and swings to ground level beside the
seedling: it is tiny, the sky is vast, empty, a single distant cloud far out of reach. → "bizler"
(17.56): continue — we are no different. → "hiçbirine" (21.24): a real human hand (Blender
`realistic_hand`, backlit, SSS glowing at the finger edges, mostly silhouette) rises into frame
from below, fingers stretching up toward the sun at upper centre — clearly unable to reach.
Exit: sun at upper centre. Trackers: `TRK_sun`.

### sh05 · 22.95–30.10 · "Mesela Allah bize oksijeni yaratmasaydı kendimiz oksijenler üretip ihtiyacımızı karşılayamazdık."
Underwater in a clear sunlit pond/aquarium. Opens looking up at the sun through the rippling
surface (Snell's window, caustic light), at frame centre (match from sh04). → "Allah" (23.96):
the light rays intensify subtly. Camera tilts down to bright green submerged plant leaves
(elodea-like whorls / cabomba fans, translucent, veins); from their surfaces strings of tiny
silver oxygen bubbles grow and detach, rising in wobbling streams (photosynthesis). → "oksijenler
üretip" (26.88): follow one bubble stream upward. Exit: one bubble rises straight into the lens,
filling frame centre. Trackers: `TRK_bubble` on a hero bubble (callout "O₂ · fotosentez").

### sh06 · 30.10–35.70 · "Ya da vücudumuzda kan her an akıyor ama bize kalsa bunu sağlayamazdık."
Inside a blood vessel (high-end medical CGI realism). Opens with one red blood cell at frame centre
coming at the lens (match from sh05). Biconcave discs tumbling in plasma, a few platelets and a
white cell, glistening endothelium wall with subtle cell pattern, plasma haze; the flow surges in
pulses with a heartbeat (~72 bpm). → "kan" (31.50): strongest surge. Warm deep reds, never flat
red: SSS, specular sheen, depth falloff. Exit: a red surge wipes the frame. Trackers: `TRK_rbc`
on a hero cell (callout "Alyuvar"), `TRK_heart` anywhere (callout "Kalp · günde ~100.000 atış").

### sh07 · 35.70–40.60 · "Veya sıcaklık ve ışık ihtiyacımız için kendimize bir güneş üretemezdik."
Open sea at dawn (ocean surface with real waves, foam, sun glitter path), deep red-orange
pre-dawn sky (match from sh06), thin clouds. Camera low over the water, slowly rising. → "güneş"
(38.88): the sun's rim breaks the horizon; light floods across the water, warm glitter path
explodes toward camera. Keep the band above the horizon calm for "GÜNEŞ". Exit: glare fills the
frame. Trackers: `TRK_sun` (callout "~150 milyon km").

### sh08 · 40.60–47.40 · "Hatta uzanıp bir şey alırken bile elimizi uzatmak aslında bizim kendi başımıza yapabileceğimiz bir iş değil."
Back at the morning table (match the sh03 set: worn wood, warm window light from left, same
apple `food_apple_01`). Sunbeam across the table (light dissolve from sh07). → "uzanıp" (41.32): a
real human hand (`realistic_hand`, rigged fingers, skin SSS, pores, knuckle wrinkles, nails, fine
hairs) enters from the right and reaches for the apple. → "alırken" (42.26): fingers close around
it, the apple is lifted (contact shadows, slight skin compression). Slow, graceful,
documentary-close (85–100 mm). → "aslında" (43.84): camera slowly pushes along the wrist/forearm;
→ "değil" (46.98): pushes into the skin surface (macro pores) — exit into tissue.
Trackers: `TRK_hand` (wrist).

### sh09 · 47.40–52.10 · "O an kaslarda ve hücrelerde ne olup bittiğini bile bilmiyoruz."
Inside the forearm (documentary micro-CGI). Opens moving forward through red muscle tissue
(match from sh08). Bundles of striated muscle fibres (fascicles in connective sheaths, glossy,
SSS), a myelinated nerve fibre running along them; → "kaslarda" (48.14): an electrical impulse
races along the nerve (glowing pulse jumping node to node), reaches the fibres, which contract in a
visible ripple. → "hücrelerde" (48.80): camera dives into one fibre/cell: cytoplasm haze, organelles,
glowing mitochondria (cristae folds visible) humming with energy. Exit: settle close to
mitochondria. Trackers: `TRK_nerve` ("Sinir sinyali · ~120 m/sn"), `TRK_fiber` ("Kas lifi"),
`TRK_mito` ("Mitokondri").

### sh10 · 52.10–58.00 · "Bunlar gibi kendimizin gideremeyeceği bildiğimiz ve bilmediğimiz hadsiz ihtiyaçlarımız var."
Pull back out of the cell (continuing sh09's look) through the membrane to reveal a tissue of
thousands of cells, then tens of thousands — a sweeping pull-back across a vast field of living
cells. → "bildiğimiz" (54.68): cells light up warmly one after another (a need being met);
→ "bilmediğimiz" (55.40): far more, in shadow, also light up — waves of tiny lights to infinity.
→ "hadsiz" (56.0): the field becomes uncountable (keep the key-word band calm/dark). Exit: cells
become tiny glints. Trackers: `TRK_cells` (counter "~37 trilyon hücre").

### sh11 · 58.00–63.85 · "Ve bütün bu ihtiyaçlar bir şekilde bizim ayağımıza getiriliyor ve karşılanıyor."
The same cracked earth and seedling as sh04 — now under a dark rain sky. Backlit rain streaks
(dissolve from sh10's glints). → "bütün" (58.6): the first heavy drops hit the dust (crowns,
dust puffs, dark wet spots). → "ayağımıza" (61.02): ground level, water trickles along the cracks
TOWARD the camera, reaching the seedling's base. Drops hit the seedling's leaves; they bounce.
→ "karşılanıyor" (62.84): the sun breaks through behind, the wet seedling glistens, upright.
Exit: camera tilts up into the bright rain sky. Trackers: `TRK_seedling`.

### sh12 · 63.85–74.15 · "İşte bütün bu ihtiyaçların karşılanması bir tek yaratıcının var olduğunu ispat eder. Çünkü bu ihtiyaçları bilip karşılayabilecek ondan başka olamaz."
Majestic aerial (drone at high altitude) — emerge from a cloud into sunlight above a living
landscape: sea coast, rivers, green valleys, forests, mountains with haze, rain shafts falling from
distant clouds, the low sun lighting everything — the whole provisioning system (sun → sea →
cloud → rain → river → life) in one view. Slow, grand camera move. → "bir tek" (66.58): the
camera settles so that the sun is upper centre and everything is visibly lit by that single
source. (Post adds fine glowing lines linking sun, sea, clouds, rain, river, forest and
converging upward into one light — design the composition so these elements are clearly
separated on screen.) Trackers: `TRK_sun`, `TRK_sea`, `TRK_cloud`, `TRK_rain`, `TRK_river`,
`TRK_forest`. Exit: descend toward golden meadow.

### sh13a · 74.15–84.20 · "Bütün dünyadaki bütün canlıların bütün ihtiyaçlarının karşılanması o Halık-ı Rahîm'in kullarına karşı ne kadar geniş şefkatinin olduğunu"
Golden-hour meadow at a forest edge, teeming with life: tall grasses, wildflowers of many kinds,
shrubs, a few trees, butterflies and bees, seeds drifting in the warm backlight, birds far away. A
slow, low, gliding camera (gimbal) through the grass, flowers brushing past the lens. → "Halık-ı
Rahîm" (79.06): the camera rises gently and the warm sunlight spreads across the whole meadow —
everything bathed in it (geniş şefkat). Key-word band: soft sky/defocus.

### sh13b · 84.20–89.10 · "ve her bir kulunu birer birer görüp gözetip idare ettiğini gösterir."
Continue in the meadow, close. → "birer birer" (85.6): post adds tracking rings that find
individual living things one by one — provide trackers on at least 8 distinct, clearly separated
subjects: a flower, a bee, a butterfly, a ladybug, a grass seed head, a snail or beetle, a sapling,
and finally the seedling (`TRK_a` … `TRK_h`, appearing in that order, spread across the frame). →
"gözetip" (86.74): the camera drifts down to the seedling; a single drop of dew forms at its leaf
tip and a sunbeam rests on it. Exit: focus pull.

### sh14a · 89.10–99.50 · "Bu hikmetli, şefkatli, görüyormuşçasına yapılan fiilleri, her şeyi gören, her şeye şefkat eden ve her işi hikmetli olan Allah'a…"
Sunflowers at sunrise. Opens extreme macro on a sunflower head's florets in perfect Fibonacci
spirals (phyllotaxis, golden angle 137.5°), dew on florets — → "hikmetli" (89.98, post overlays
the spiral arcs). Pull back: the full flower, then a field of sunflowers. → "görüyormuşçasına"
(91.68): the flower heads turn together toward the rising sun as if they could see it. → "her şeyi
gören" (93.82) … → "Allah" (98.74): the light grows into a radiant, golden sunrise over the
whole field. Trackers: `TRK_spiral` (centre of the head).

### sh14b · 99.50–104.20 · "…vermeyen bir cahil inkarcı, bu hakikati örtmek için bu işleri"
Shadow sweeps in. In a dark space a warm glowing light (an old brass oil lamp `vintage_oil_lamp`
or a glowing orb of light on a pedestal) — → "örtmek" (102.38): a heavy dark velvet cloth (cloth
simulation) falls and drapes over it, trying to cover it. Light still leaks through the folds and
from beneath the hem — the truth cannot be covered. Dark, high-contrast, chiaroscuro.

### sh14c · 104.20–109.80 · "…cansız, şuursuz, şefkatsiz tabiatla izah edebilir mi?"
A cold, desaturated grey-blue desert under a flat overcast sky. → "cansız" (104.28): a dead,
inert boulder (Poly Haven rocks) in close-up; → "şuursuz" (105.62): sand blows aimlessly across
cracked ground; → "şefkatsiz" (106.86): wide, empty, cold expanse with dead wood; → "izah edebilir
mi" (108.66): camera stops, staring at the lifeless stone — silence. Keep the key-word band calm
(sky). No warmth anywhere.

### sh15 · 109.80–125.50 · "Bu latif ve parlak hakikate Sözler kitabının 721. sayfasında ve başka risalelerde çok güzel ifadelerle işaret edilmiştir. Bu video da o metni işaret etmeye çalışıyor."
A warm golden sunbeam sweeps across a quiet room onto a carved wooden reading stand (rahle) and a
set of **red Risale-i Nur books** (real look: deep crimson/burgundy leather-grain hardcovers, gold
foil titles and ornamental frames, cream pages with gilded/aged edges, rounded spines with gold
bands). → "Sözler" (111.96): the camera arrives on the "SÖZLER" volume, the gold foil catches the
light. → "721" (113.48): the book opens on the rahle, pages turning to page 721 (page number crisp,
the text lines softly out of focus). → "başka risalelerde" (115.98): slide along the other volumes'
spines (Mektubat, Lem'alar, Şualar, Mesnevî-i Nuriye, İşarâtü'l-İ'caz, Asâ-yı Mûsâ, Barla Lâhikası
…). → final (120–125.5): settle on the open Sözler bathed in the sunbeam, dust motes, slow push.
Trackers: `TRK_page` (page number).
