# Storyboard — FINAL, revision 2 (supervising director's merge + review fixes)

**Yirmi Birinci Söz, s. 291** · 1080×1920 · 30 fps · painted film 0.00–23.40 s (2D frames 0–719) · photoreal end card fades up from 23.80 s, ends 29.60 s (separate team)

Machine-readable twin: `/home/user/work/storyboard.json` (same content; this file is generated from it by `python3 tools/storyboard_tools.py md`; if they ever differ, the JSON wins). All times are video seconds on the 30 fps grid and respect `/home/user/work/timing.json`; `python3 tools/storyboard_tools.py check` verifies every lead, gloss window, camera rest and frame edge with the engine's own camera maths.

## 1. The film in one paragraph

One continuous sponge-painted world, one unbroken take, one plain man. In Turkish 'gün' is both day and sun, so each day is a sun on one dotted course: yesterday's slips from his hand and sets at the left; tomorrow's is only a dashed ring in mist at the right; today's is unveiled directly above him and life blooms on the rise where its light falls. Then the day is counted out as 24 hour-beads on a dial, one turns gold, floats down and is minted into a coin in his palm, and where tomorrow's fog was the true future rises as pure light against a deepened sky. Its light sets up a little wooden coffer that is revealed to be a mosque - or a prayer rug - and with a half-step toward it he casts the hour into the rug's glowing niche; niche, doorway and far light answer one after the other. Above him the day's dial keeps its one gap: one hour of the day went there.

### One idea per clause (Kurzgesagt's measure, not more)

| # | words | the one picture idea |
|---|---|---|
| 1 | Ey nefis! | The call arrives at him: 'my own self'. |
| 2 | Bil ki dünkü gün senin elinden çıktı. | Yesterday is a sun he thinks he holds; it slips out of his hand and sets. |
| 3 | Yarın ise senin elinde senet yok | Tomorrow is only an outline; you hold no deed to it. |
| 4 | ki ona mâliksin. | It is out of reach. |
| 5 | Öyle ise | So then: the veil opens - today was above him all along. |
| 6 | hakiki ömrünü, | Your real life: light pours on the one rise he stands on, and life blooms there. |
| 7 | bulunduğun gün bil. | The day you are IN: only where he stands is lit - and he takes it to heart. |
| 8 | Lâekall günün bir saatini, | The day is counted out as 24 hours; one of them turns gold. |
| 9 | ihtiyat akçesi gibi | The hour lands in his palm and is minted into a coin - money put by. |
| 10 | hakiki istikbal için | The true future: a steady light rises where tomorrow's fog was. |
| 11 | teşkil olunan bir sandukça-i uhreviye | Its light sets up a little chest within reach - a chest that belongs to the hereafter. |
| 12 | olan bir mescide | The chest IS a mosque. |
| 13 | veya bir seccadeye | ...or a prayer rug: the same chest in its nearest form. |
| 14 | at. | He casts the hour - and it reaches the true future. |

14 ideas in 23.4 s (about one every 1.6 s), after a short opening in which the painter's hand finishes the world. Everything else inside a clause is anticipation or follow-through of its idea. Frame-synced hits are capped at two per phrase - the idea and its resolution; the two clauses that hold two phrases («Yarın ise | senin elinde senet yok», «teşkil olunan | bir sandukça-i uhreviye») carry three. 28 of the 47 words have a hit of their own (revision 1: 38).

### Visual grammar (learn it once, it explains every shot)

- What is real and yours is fully sponge-painted and stencil-solid (today's sun, the hour-coin).
- What is not yours is only a dashed stencil outline over bare primer (tomorrow's sun, its title-deed).
- What is gone dabs out and breaks into drifting specks (yesterday's sun, the deed).
- What is unseen but certain is pure soft light with no hard edge, painted against a deepened sky (the true future).
- One glowing pointed arch appears four times: chest seam / lock plate, mosque doorway, mihrab niche, and the shape of the far light itself.
- One kind of stencil dot marks every path: the course of the days (deep ochre) and the descent of the far light to the chest (warm white with a brick rim).
- The hour keeps its identity to the last frame: two clock-hands on the coin, and above him the dial with one bead missing and its hand pointing at the gap.

## 2. The world and the frame

**Coordinates.** WORLD px = frame px of the HOME framing (camera cx 540, cy 960, zoom 1). A camera {cx, cy, zoom} puts world point (cx, cy) at the frame centre: screen = [540 + (x - cx) * zoom, 960 + (y - cy) * zoom]. This is the engine's camera {x: cx, y: cy, zoom}. Everything the man touches or that must line up with him lives on the subject plane (parallax 1.0) and obeys that formula. Parallax layers (sky, clouds, far ridge, mist, far light) are given in LAYER px: at HOME they sit exactly at those coordinates; in other framings use E.worldToFrame(cam, parallax, x, y). Where a parallax layer must line up with a subject-plane element in a particular framing, that framing's screen px are given too. All screen numbers in this file are computed with that function (tools/storyboard_tools.py is a port of camera.js), not by hand.

**Screen architecture.** The top 62 % (y 0-1200) is the sky stage where everything happens. Below it lies a calm, dark, richly dabbed hedge. Whenever a gloss is up, the hedge lip sits at screen y 1200-1213, so the gloss band (y 1229-1574) is always the same quiet dark-green field and the ivory text reads perfectly. Nothing essential sits below y 1651 or right of x 950 in the lower half (Shorts UI). He stands in front of a low foliage rise (the mound) that carries the flowers; the hedge lip in front hides the soles of his shoes.

| element | HOME position (world px) | size / note |
|---|---|---|
| hedge lip (ground) | y 1200 (±7 px undulation) | fills everything below; drawn in front of the man; calm and dark in the gloss field |
| the rise (mound) | x 270–810, top y 1084 | behind the man; carries the six flowers; LIT (x 300–780, never below y 1208) from 10.07 |
| far ridge (horizon) | crest y ≈ 1135 | lavender-ivory hills, parallax 0.5; painted down to layer y 1420 |
| man | x 540, feet y 1200, head top y 660 | 540 px tall; chest (540, 805); mitten 46 × 56; front view to 1.47, back view from 1.60 |
| today's sun | (540, 340) | r 110; halo r 300 blaze / 170 under the dial / 150 receded; cobalt annulus r 150–270 from 12.10; hidden by the veil cloud until 8.77 |
| veil cloud | (540, 335) | 560 × 290, peach-gold rim |
| sun-arc | feet (130, 1195) and (950, 1195), apex (540, 340) | y = 340 + 855·((x−540)/410)²; 27 deep-ochre dots r 12 every 65.6 px, ending outside tomorrow's ring |
| yesterday's sun | rests at (285, 671) on his left palm (270, 772) | r 100; out of his hand at (208, 900), gone at (124, 1220) |
| tomorrow's dashed ring | (924, 1089) | r 108, 14 ochre dashes, never filled |
| mist bank | layer x 740–1350, y 860–1300 | parallax 0.7; ends behind the hedge lip |
| deed (senet) | (672, 707) above his right palm (688, 818) | 140 × 175 ghost sheet; folded corner top-right, 36 px |
| labels | — | NONE (cut; see decisions) |
| hour dial | centre (540, 340), ring r 210 | 24 beads r 22 on the cobalt annulus; clock-hand 186 × 15; chosen bead at 5 o'clock (645, 522); stays to the end |
| coin | palm (720, 830), rest (720, 784) → side (660, 880) → release (720, 820) → niche (1040, 950) | bead r 30 → coin r 42 (105 px across in MEDIUM, 84–91 px in ACT2); clock-hands stroke 10 |
| far light (true future) | ACT2 screen x 590–990, y 60–1150, core (790, 300) | soft arch-shaped cluster in a deepened sky, parallax 0.7; white core y 180–420 |
| knoll | plateau y 770, x 890–1195 | face slopes toward us; base in warm mist |
| light-beads | x 1040, y 440 / 515 / 590 / 665 / 740 | r 13–18; three absorbed by the chest, two by the dome |
| chest | x 925–1155, base y 770, knob top y 556 | 230 × 214 wooden coffer, lid ajar (15 px seam) |
| mescid | x 850–1180, base y 770, dome finial y 388, minaret finial y 296 | 330 × 474; doorway x 1012–1068, y 674–770 |
| prayer rug | top edge y 812 (x 932–1148), bottom edge y 1085 (x 922–1158) | niche 150 × 200, glow centre (1040, 950) |
| gloss band | screen y 1229–1574, baseline 1424 | calm field: screen x 120–960, y 1222–1590 |

Flowers on the rise (open 10.13–10.27): f1 (456, 1168) r 36, f2 (624, 1168) r 36, f3 (392, 1144) r 46, f4 (688, 1146) r 44, f5 (340, 1174) r 34, f6 (744, 1174) r 36. Six flowers, 68-92 px across, on the mound: three left and three right of his legs (legs x 505-575 stay clear), neighbours overlapping by at most 20 px like a bouquet, nearer ones in front. Each sits on a rosette of deep-green stencil leaves that shows 14 px beyond its petals, and the mound is behind all of them: white on dark green (5.6 : 1), as in the reference. All exist from 0.07 as closed pink buds (r 12) at the same centres. They open only where today's light falls; one bud on the dusk side of the lip (e1) stays closed for the whole film. No foreground blooms: the three big blooms of revision 1 lay under the Shorts caption and were cut by the frame in DUN and YARIN. Positions keep the gloss field empty (all end at or above y 1210) and no flower is cut by the frame in any framing from HOME_WIDE on. All on plane 1.0.

**Layer stack, back to front** (parallax): wall primer (0) → sky dabs (0.15) → zone tints: dusk (world x < 380), pre-dawn (world x > 720) (1) → small cloud c1 (0.3) → sun-arc dots, yesterday's sun + halo, cobalt annulus, today's sun + halo + hour-beads + clock-hand, veil cloud, tomorrow's dashed ring, light column (1) → true-future surround (deep cool sky), then the far light (0.7) → far ridge (0.5) → mist bank (tomorrow) (0.7) → knoll, warm base mist, light-beads, chest / mescid, door-light spill, rug (1) → the mound (lit state from 10.07) (1) → man (and, between his arm layers: deed, coin) (1) → hedge, bud / flowers on their leaf rosettes (1) → coin in flight, niche bloom, glint dabs, crumble specks (1) → ambient specks (sky stage only: screen y < 1190) (1.2) → cream cover 23.40-24.00 (SCREEN space, top of the scene) → wall-grain finish (E.finish), then the engine gloss.

**Gloss windows** (passed to the engine by the main scene as a custom list `{text, t, end}`):

| gloss | appears | gone by | framing |
|---|---|---|---|
| `sahipsin` | 7.14 | 8.35 | YARIN (camera at rest until 8.07; the glide to HOME_WIDE starts as the 0.30 s fade-out begins; lip 1213 -> 1210 by 8.35) |
| `en az` | 12.55 | 13.95 | HOME (camera does not move; nothing in the picture moves until 12.87) |
| `gelecek` | 17.14 | 18.72 | ACT2 (camera does not move) |
| `âhirete ait sandıkçık` | 18.92 | 20.95 | ACT2, slow push from 18.90 pivoting on the lip (the band does not change) |

In every gloss window the band shows ONLY the hedge: dense deep-green sponge dabs with tone-on-tone leaf stencils. No flowers, buds, light-coloured leaves, mist, lit patch, man's feet, specks, primer gaps larger than pinholes, or moving objects. The hedge lip stays at screen y 1200-1213 in all four windows.

Hard numbers: the lit patch is the lit state of the mound and never reaches below world y 1208 (it is feathered upward only); there is no foot shadow; flowers end at or above world y 1210; the warm mist at the knoll's base ends at y 1212; hedge leaf stencils inside world y 1212-1590 differ from their ground by at most one small tone step (tone(hex, +-0.04)) and have no light or lavender edge; ambient specks are drawn only where screen y < 1190 (alpha ramps to 0 between y 1150 and 1190) in every framing; the calm field starts at screen y 1222 (the lip undulates to 1221 in YARIN). PREVIEW CHECK before any full render: stills at 7.30, 12.80, 17.50, 19.20 and 20.50 cropped to y 1200-1600 - nothing lighter than hedge_mid and nothing that differs between two consecutive frames except drift.

### Named framings

| framing | cx | cy | zoom | man x / head top / feet (screen) | used for |
|---|---|---|---|---|---|
| CLOSE | 540 | 900 | 1.45 | 540 / 612 / 1395 | Opening and «Ey nefis!»: the man large and centred, veil cloud at the top edge. |
| CLOSE_PUSH | 540 | 900 | 1.5 | 540 / 600 / 1410 | End of the slow push during «Ey nefis!» (reached at 1.60). |
| DUN | 410 | 890 | 1.2 | 696 / 684 / 1332 | Yesterday: man at right, the sun on his left palm at upper left, its setting place at lower left. |
| DUN_DRIFT | 402 | 890 | 1.2 | 706 / 684 / 1332 | End of the 8 px leftward creep while DUN is held (reached at 4.17). |
| YARIN | 760 | 980 | 1.15 | 287 / 592 / 1213 | Tomorrow: man at left, sky above his palm for the deed, dashed ring in mist at lower right. |
| YARIN_DRIFT | 770 | 980 | 1.15 | 276 / 592 / 1213 | End of the 10 px rightward creep while YARIN is held (reached at 8.07). |
| HOME_WIDE | 540 | 956.3 | 0.985 | 540 / 668 / 1200 | Arrival framing of the pull-back at 8.77; a 1.5 % push to HOME follows, pivoting on the hedge lip. |
| HOME | 540 | 960 | 1 | 540 / 660 / 1200 | The triptych / totem: today's sun over the man, dusk left, mist right. World px = frame px. HAND-OFF framing at 12.20. |
| MEDIUM | 620 | 790 | 1.25 | 440 / 798 / 1472 | The hour lands in his palm and is minted (coin 105 px across, below and beside his head); the dial large above him with its gap. |
| MEDIUM_DRIFT | 621 | 789 | 1.26 | 438 / 797 / 1478 | End of the small creep while MEDIUM is held (reached at 16.03). |
| ACT2 | 790 | 960 | 1 | 290 / 660 / 1200 | Two-column poster: left = today's dial over the man; right = far light over chest / mescid over rug. |
| ACT2_PUSH | 790 | 965.9 | 1.0257 | 284 / 646 / 1200 | SAMPLE of the one slow push at 20.90 (not a key): used for checks while the long gloss is up. |
| ACT2_END | 790 | 975.7 | 1.07 | 272 / 622 / 1200 | SAMPLE of the slow push at 23.40 (not a key): the state handed to the end card. |
| ACT2_TAIL | 790 | 978 | 1.0809 | 270 / 616 / 1200 | Where the slow push arrives at 24.00, under the cream cover (last key of the path). |

**Camera path.** Five real moves: 1.60-2.40, 4.17-4.97, 8.07-8.77, 14.27-15.17, 16.03-16.63. Three of them lie entirely inside narration pauses (4.10-4.94, 7.69-8.85, 16.03-16.67), each settled before the next word, and the frame is at rest for every picture word. The two honest exceptions: move 1 runs over the function words «Bil ki» (262 px/s at «Bil», 392 px/s at «ki») and is settled 4 frames before «dünkü»; move 4 is a follow move that tracks the falling hour - it starts after the pop on «saatini», nothing else changes during it, and it is 96 % arrived at «ihtiyat» (147 px/s). Everything else is a hold, a creep under 10 px/s or the one slow push (1.7 % per second). The camera never stops dead: one shared drift runs on every frame of both acts.

| arrives at | framing | ease |
|---|---|---|
| 00.00 | CLOSE | start |
| 00.20 | CLOSE | hold |
| 01.60 | CLOSE_PUSH | sine.inOut |
| 02.40 | DUN | cubic.inOut |
| 04.17 | DUN_DRIFT | sine.inOut |
| 04.97 | YARIN | cubic.inOut |
| 08.07 | YARIN_DRIFT | sine.inOut |
| 08.77 | HOME_WIDE | cubic.inOut |
| 12.20 | HOME | sine.out |
| 12.20 | HOME | start |
| 14.27 | HOME | hold |
| 15.17 | MEDIUM | cubic.inOut |
| 16.03 | MEDIUM_DRIFT | sine.inOut |
| 16.63 | ACT2 | cubic.inOut |
| 18.90 | ACT2 | hold |
| 24.00 | ACT2_TAIL | inThenLinear(1.0 s) |

Engine: E.cameraPath([{t, x: cx, y: cy, zoom, ease}]) in its default mode 'ease' (each segment eases from key to key with the ARRIVING key's ease and settles on it), then the shared drift. Each key is where the camera has arrived at t. The last segment is ONE slow push 18.90 -> 24.00 with the custom ease inThenLinear(1.0 s): f(u) = u < a ? u*u / (2a(1 - a/2)) : (u - a/2) / (1 - a/2), a = 1.0 / 5.1 - it eases in for one second and then runs at a constant 1.69 % per second through 23.40 and on to 24.00 with no stop anywhere. ACT2_PUSH and ACT2_END are samples of that segment, not keys.

Camera speed at the picture words (engine maths; pan in screen px/s on the subject plane, zoom in % per second):

| word | t | pan px/s | zoom %/s | camera state |
|---|---|---|---|---|
| Ey | 0.51 | 0 | +2.4 | slow 3 % push |
| Bil | 1.84 | 262 | -30.6 | move 1, 11 % done |
| ki | 2.08 | 392 | -52.9 | move 1, 75 % done |
| dünkü | 2.54 | 2 | +0.0 | at rest (hold / creep) |
| elinden | 3.38 | 8 | +0.0 | at rest (hold / creep) |
| Yarın | 4.94 | 5 | -0.1 | move 2, 100 % done |
| senet | 6.11 | 5 | +0.0 | at rest (hold / creep) |
| mâliksin | 7.14 | 5 | +0.0 | at rest (hold / creep) |
| Öyle | 8.85 | 2 | +0.7 | slow 1.5 % push |
| hakiki | 9.67 | 2 | +0.6 | slow 1.5 % push |
| ömrünü | 10.23 | 1 | +0.5 | slow 1.5 % push |
| Lâekall | 12.55 | 0 | +0.0 | at rest (hold / creep) |
| günün | 13.51 | 0 | +0.0 | at rest (hold / creep) |
| saatini | 14.07 | 0 | +0.0 | at rest (hold / creep) |
| ihtiyat | 14.97 | 147 | +14.1 | move 4 (follow), 96 % done |
| akçesi | 15.45 | 3 | +1.2 | at rest (hold / creep) |
| hakiki | 16.67 | 0 | +0.0 | at rest (hold / creep) |
| istikbal | 17.14 | 0 | +0.0 | at rest (hold / creep) |
| sandukça-i | 18.92 | 0 | +0.0 | slow push |
| mescide | 20.43 | 4 | +1.7 | slow push |
| seccadeye | 21.84 | 4 | +1.7 | slow push |
| at | 22.56 | 4 | +1.7 | slow push |

### Colour script

- **0.00-2.40** — High-key cool sky (cobalt densest at the top), dark warm-green ground with a mid-green rise, one warm figure. The only warm sky notes are the veil cloud's rim and, from 1.27, a first faint peach glow low at the left.
- **2.40-4.90** — Left third turns sunset (deep orange, peach, pink), then cools in two passes to lavender and violet-cobalt dusk. It stays dusk for the rest of the film.
- **4.90-8.07** — Right third is pre-dawn: desaturated lavender-white mist, pale pink. The dashed ring, the course dots and the deed are the only ochre / maroon notes.
- **8.77-12.20** — Centre column: clear gold, yellow, peach; the rise he stands on lights yellow-green; white flowers on dark leaf rosettes. The sides drop one value step, so only the column is saturated. 11.90-12.10 the blaze settles and a cobalt ring deepens round the sun.
- **12.20-16.03** — White beads on the cobalt annulus round the gold disc - white on cobalt, never white on primer; one deep-gold hour with a dark-ochre rim. The coin is the most saturated thing on screen.
- **16.63-23.40** — Right column: a deepened cool sky (lavender, violet-blue, cobalt) round a tall arch of peach and gold with a dense white core and a pink rim. Today's sun and its dial recede one value step. Ochre-brown wood coffer -> ivory mescid with a lead-blue dome; madder-red rug with a glowing niche.
- The darkest sharp shape in the sky stage is always the man. A matte sponge wall has no glow: every light is painted AGAINST something darker - beads on cobalt, the far light in a deepened sky, the doorway in a maroon frame, the seam on wood, flowers on dark leaves. Glosses are ivory on the dark hedge.

Value contrast that must hold (WCAG ratio of the two paints; a matte sponge style has no glow, so light reads only against something darker):

| light thing | painted against | ratio |
|---|---|---|
| hour-bead #FBF8F0 | cobalt annulus #4E94CE | 3.1 : 1 |
| receded hour-bead #D6DEE8 | cobalt annulus | 2.4 : 1 |
| far-light core #FFFDF6 | surround lavender #A498D2 / violet-blue #7F78B8 | 2.6 / 3.9 : 1 |
| far-light peach #F4C79A | surround violet-blue #7F78B8 | 2.6 : 1 |
| seam light #FFF6D8 | chest wood #A8702F | 3.9 : 1 |
| door glow #F8DC78 | door frame #4A2328 | 9.9 : 1 |
| ivory stone #EDE3D2 | its lavender inner edge #A498D2 (the peach behind it gives only 1.2) | 2.1 : 1 |
| far-light peach #F4C79A | dome base #1F4E63 | 5.8 : 1 |
| flower #FBF8F0 | leaf rosette / mound #1F5C3A / #4E9A46 | 7.5 / 3.3 : 1 |
| niche glow #FFF2C8 | rug field #A23E2E | 5.8 : 1 |
| sky light blue #80BED6 / primer #EFE4CF | course dots #9A5A1C | 2.7 / 4.3 : 1 |
| far-light peach #F4C79A | light-bead rim #B4553A | 3.1 : 1 |
| lit mound #B7DA6B | the man's trousers #4A342A | 7.3 : 1 |

### Motion grammar

- Dab-ins / dab-outs are stepped: 'on twos' (every 2 frames) or 'on threes'; every pass is listed with the frame time it lands on and with its count (dots, dashes, beads per step).
- Everything that travels is eased (cubic in-out; a few named exceptions: quad ease-in for the slip, quart ease-out for the unroll, sine ease-out for the cast). No linear moves except the creeps and the slow push.
- Arrivals overshoot 6-10 % and settle in 6-8 frames; departures get a 2-3 frame counter-move (anticipation).
- Limbs overlap: upper arm leads, forearm follows 2 frames later, hand 2 frames after that - so no arm move is shorter than 6 frames.
- Sponge textures are baked in object space and move / rotate rigidly with their object. Nothing swims, nothing flickers. Shapes that change (lid -> dome, body -> walls) are stencil-mask tweens over a pre-baked texture plus a cross-dab; no sprite is ever stretched by more than 10 %.
- The frame is at rest when a picture word lands (checked with the engine's camera maths; the two exceptions are named in the camera path). Stepped dab-ins never happen on a layer that is travelling fast.
- At most two synced hits per phrase - its idea and its resolution; everything else is unsynced anticipation or follow-through, and a hold is a real hold. A synced hit leads its word by 2-4 frames and never lags it ('leads_word', checked against timing.json).
- One region at a time: while something builds in one column the other column only breathes.

## 3. ACT1 — The three days (00.00–12.20)

### 00.00–00.43 · (no speech - the voice starts at 0.51)

**Idea:** the painter's hand finishes the world - this is the hook, not a clause

**Picture.** Never a blank or half-empty frame: frame 0 is already a complete, poster-simple landscape - the cream primer wall carrying the whole sponge-dabbed sky, the far lavender ridge, the dark hedge and the low rise. In ONE stepped pass the foliage gets its leaves and closed buds and the clouds arrive - one of them a large white 'veil' cloud with a peach-gold rim, top centre, hiding today's sun. Then the man is stencilled in at the centre in three passes: FRONT view, head slightly bowed, arms at his sides, brick top against the cool sky. He stands for five frames before anything else happens: one warm figure, cool sky, dark ground.

**Camera.** CLOSE, static while the world is finished (shared drift only).

**Gloss band.** No gloss. His shins, the mound and the far ridge cross the band (lip at screen y 1395).

| t | event |
|---|---|
| 00.00 | Frame 0 (what a feed shows first): primer wall + the complete sky (light blue, cobalt densest at the top, lavender) + far ridge + the base coats of hedge and mound. Already a full picture. |
| 00.07 | Second coat of hedge and mound with tone-on-tone leaf stencils and the leaf rosettes; closed pink buds on the mound (f1-f6) and one on the dusk side (e1); cloud c1 and the veil cloud (white, lavender under-dab, peach-gold rim). |
| 00.13 | Man, pass 1: dark base (stencil-sharp). |
| 00.20 | Man, pass 2: mid tones. |
| 00.27 | Man, pass 3: lit dabs on the upper right. He is complete. 0.27-0.43 he simply stands (5 frames): breathing, cloud drift, rim glimmer, specks. |

**SFX.** 00.07 `dab_flurry` (-2 dB) — the last passes are dabbed in: four soft dabs locked to the passes at 0.07 / 0.13 / 0.20 / 0.27

### 00.43–01.73 · Ey nefis!   (pause 1.06-1.84)

**Idea:** The call arrives at him: 'my own self'.

**Picture.** A ring of white-gold dabs appears round him and closes IN on his chest in three steps - a call reaching him, not a glow coming out of him. With the ring his head lifts and his right hand (screen-left arm) rises; it lands flat on his chest just before «nefis», the last dabs of the ring gather under it and are absorbed completely - nothing keeps glowing on him. A quiet hold. Then a first warm glow dabs in low at the left of the sky; his hand leaves his chest and he turns toward it. The turn is made in the film's own technique: the front stencil dabs out while the back stencil dabs in. From now on we see him from behind. The nefs is never a creature, shadow or double: the man himself is the one addressed.

**Camera.** CLOSE -> CLOSE_PUSH: slow push 1.45 -> 1.50 from 0.20 to 1.60 (sine in-out), then the glide to DUN begins (1.60-2.40).

**Gloss band.** No gloss. Shins, mound, far ridge, hedge lip at screen y 1395-1410.

| t | event |
|---|---|
| 00.43 | Call-ring appears: 16 white-gold dabs on a circle of world r 276 (screen r 400) round his chest (540, 805). In the same frame his head starts to lift (0.43-0.63: 6 degrees, 6 px, ease-out) and his right hand (screen-left arm) starts for his chest (0.43-0.67: 7 frames, upper arm, forearm +2 f, hand +2 f, slight overshoot). — *leads «Ey» (0.51) by 2.3 fr* |
| 00.50 | Ring closes in, step 1: r 200. |
| 00.57 | Ring step 2: r 131. |
| 00.63 | Ring step 3: r 69. |
| 00.67 | Hand lands flat on the chest; the ring's last dabs gather under the hand. — *leads «nefis» (0.76) by 2.8 fr* |
| 00.70 | 0.70-0.90 the gathered dabs dab out completely (absorbed); torso 2 % settle. No glow stays on him. |
| 00.90 | 0.90-1.27 HOLD, hand on chest: breathing, cloud drift, veil rim glimmers, specks float. |
| 01.27 | A first warm glow dabs in low at the left of the sky (sunset pass 0 of the dusk zone: faint peach, screen x 0-300 in this framing). It is what he turns to. |
| 01.30 | 1.30-1.47 his hand leaves the chest and returns to his side; his weight shifts toward screen-left. |
| 01.47 | THE TURN as a cross-dab on twos (1.47 / 1.53 / 1.60): the FRONT stencil dabs out while the BACK stencil dabs in, with a 4 px dip and scaleX 1 -> 0.6 -> 1 (never narrower: no card-flip sliver). Back view from 1.60 to the end of the film - complete 7 frames before «Bil», so he is not seen turning his back on the word. |
| 01.60 | Camera starts easing out toward DUN. |

**SFX.** none (voice only).

### 01.73–04.10 · Bil ki dünkü gün senin elinden çıktı.

**Idea:** Yesterday is a sun he thinks he holds; it slips out of his hand and sets.

**Picture.** We look INTO the picture with him. His left arm sweeps out to screen-left, palm up and cupped, and the frame glides that way. Yesterday's sun is dabbed in resting on that palm - low, mellow, sunset-orange - and the left of the sky warms. Then a clean hold of more than half a second: he has it. On «elinden» it slips: it slides down its dotted course behind his fingers, his hand follows and grasps after it, and before «çıktı» it is out of his hand and sinking, ever more slowly, toward the far ridge. His hand closes on nothing.

**Camera.** Glide CLOSE_PUSH -> DUN 1.60-2.40 (cubic in-out; pull-out 1.50 -> 1.20 with parallax): the one move that runs over words - the function words «Bil ki» - and is settled 4 frames before «dünkü». Then DUN -> DUN_DRIFT: an 8 px creep to the left until 4.17.

**Gloss band.** No gloss. Hedge lip at screen y 1332; his shins, the mound and the ridge above it.

| t | event |
|---|---|
| 01.73 | 1.73-2.03 left arm (screen-left) sweeps out, palm up and slightly cupped; overshoot; settled 2.10 with the palm at world (270, 772). Unsynced anticipation of the sun (it happens during «Bil ki»). |
| 02.40 | Camera settled on DUN. |
| 02.43 | Yesterday's sun, pass 1 (deep orange base), resting on his palm: r 100 at world (285, 671). — *leads «dünkü» (2.54) by 3.3 fr* |
| 02.50 | Sun pass 2: orange mid tone. |
| 02.57 | Sun pass 3: peach-gold lights on the upper right. |
| 02.63 | Its halo cluster (peach / pink dabs to r 180) and sunset pass 1 over the left third of the sky. Then 2.63-3.23 a real HOLD (18 frames): the sun simply rests in his hand; only halo breath and his breathing. |
| 03.23 | 3.23-3.30 anticipation: the sun lifts 7 px. |
| 03.30 | It SLIPS: slides down-left along its course, behind his fingers; quad ease-in 3.30-3.73, sponge texture rolling with it. The course dots print just ahead of it, two per step on twos at 3.30 / 3.37 / 3.43 / 3.50 / 3.57 (k = 9..0, ten dots, down to the foot of the arc). — *leads «elinden» (3.38) by 2.5 fr* |
| 03.43 | 3.43-3.57 his hand follows it down 28 px, fingers closing after it, and stops. |
| 03.73 | Its upper limb has passed below his palm (centre at world (208, 900)): OUT OF HIS HAND. From here it decelerates steadily - a setting sun sinks slowly. — *reached 2.1 fr before «çıktı» (3.80); part of the same motion, not a new hit* |
| 03.83 | 3.83-4.03 his hand closes on nothing. |
| 03.87 | Lower limb meets the far ridge; half set at 4.00. |

**SFX.** 01.80 `whoosh` (-2 dB) — camera glide toward 'yesterday', very soft, peaks just before «Bil» · 03.72 `puff` (+0 dB) — yesterday leaves the hand

### 04.10–04.83 · (pause 4.10-4.94)

**Idea:** follow-through and crossing: from the past to the not-yet

**Picture.** The last sliver sinks slowly behind the ridge at the foot of the arc. The afterglow blooms, breaks into specks and the left of the sky cools to dusk in two passes - no sun remains there for the rest of the film. His arm falls. Then ONE thing leads the eye and the camera: the dotted course keeps printing - up, over the top behind the veil cloud, and down the other side - a travelling line from past to future. Only when the frame has nearly arrived is the pre-dawn mist dabbed in at the right, and his head follows the dots.

**Camera.** Glide DUN_DRIFT -> YARIN 4.17-4.97 (cubic in-out): 360 px to the right with parallax, zoom 1.20 -> 1.15, entirely inside the pause. 98 % arrived at 4.83; 5 px/s left at «Yarın».

**Gloss band.** No gloss. Hedge only below the lip; the lip travels from screen y 1332 to 1213.

| t | event |
|---|---|
| 04.10 | 4.10-4.30 afterglow cluster (peach / pink, r 130) blooms on the ridge where the sun is setting. 4.10-4.57 his arm lowers with overlap (upper arm, forearm, hand). No head bow. |
| 04.13 | Dusk pass 1 over the left third (lavender). |
| 04.17 | Camera leaves DUN (cubic in-out: under 2 % of the way by 4.30, so the setting is seen on a still frame). |
| 04.20 | Last sliver gone behind the ridge; the sun comes to rest out of sight at world (124, 1220) by 4.27. |
| 04.27 | Dusk pass 2 (violet-blue with cobalt). The left third is now dusk. |
| 04.30 | Afterglow breaks into about 12 specks that drift up and fade by 4.90. |
| 04.33 | 4.33-4.80 the course dots keep printing, eight steps on twos (4.33 / 4.40 / ... / 4.80), two per step and three on the last (k = 10..26, seventeen dots): up the left leg, over the apex behind the veil cloud, down the right leg. The last dot stops 28 px short of where tomorrow's ring will stand. |
| 04.50 | Mist bank at the right, pass 1 of 2 (4.50 / 4.67), with the pale pre-dawn wash over the right third baked into the same two passes. 4.50-4.90 his head turns to the right, following the dots (a sliver of cheek shows). |

**SFX.** 04.30 `specks` (+0 dB) — the afterglow crumbles into specks · 04.57 `whoosh` (-2 dB) — glide from past to future (peak at the middle of the move)

### 04.83–06.57 · Yarın ise senin elinde senet yok

**Idea:** Tomorrow is only an outline; you hold no deed to it.

**Picture.** At the right end of the course, tomorrow's sun draws itself as a DASHED RING and nothing more: ochre dashes, bare primer inside, about two-thirds risen behind the far ridge, its lower part veiled by mist. He turns his right palm up. Above it a title-deed prints as a ghost in the same dashed language - a sheet of bare primer with a bold dashed maroon edge and one folded corner, dashed lines of writing - and on «senet» a round ochre seal, a miniature of tomorrow's ring, is stamped on. The sheet stands long enough to be recognised. On «yok» the dashes fall apart into specks. The palm is empty.

**Camera.** YARIN, held from 4.97; YARIN -> YARIN_DRIFT: a 10 px creep to the right until 8.07.

**Gloss band.** No gloss. Hedge only (lip at screen y 1213).

| t | event |
|---|---|
| 04.83 | The dashed ring draws itself clockwise in four steps on twos: 4 / 4 / 3 / 3 dashes at 4.83 / 4.90 / 4.97 / 5.03 (8 of 14 on at «Yarın», complete 5.03). r 108 at world (924, 1089). — *leads «Yarın» (4.94) by 3.3 fr* |
| 04.97 | Camera settled on YARIN. |
| 05.37 | 5.37-5.63 his right forearm (screen-right) rises, turning palm up; head tilts toward the palm. Settled 5.63 with the palm at world (688, 818): an open, empty hand (unsynced; it happens during «elinde»). |
| 05.67 | Deed pass 1: sheet outline above the palm - bold dashed maroon edge (12 px dashes), folded corner top-right. 140 x 175 at world (672, 707). |
| 05.77 | Deed pass 2: one thin pass of pale ivory dabs over the bare primer body. |
| 05.87 | Deed pass 3: three dashed lines of 'writing'. The sheet is readable from here. |
| 06.00 | The round seal - a miniature of the dashed ring, one full ochre pass - stamps on in one press, 2-frame squash. The deed is complete. — *leads «senet» (6.11) by 3.2 fr* |
| 06.30 | 6.30-6.37 it trembles (2 px). |
| 06.37 | It crumbles, step 1 of 3 (6.37 / 6.43 / 6.50), into about 14 specks that drift right toward the dashed ring and are gone by 6.90. The palm is empty. — *leads «yok» (6.45) by 2.4 fr* |

**SFX.** 06.00 `paper` (+1 dB) — the deed (senet): the seal is stamped · 06.37 `puff` (-2 dB) — «yok» - it is not there

### 06.57–08.07 · ki ona mâliksin.   (pause 7.69-8.85)

**Idea:** It is out of reach.

**Picture.** He looks at the empty palm, then stretches the hand toward the dashed ring. The 'not' comes FIRST: while he is still reaching, the mist thickens over the ring and it sinks to a ghost; his hand stops well short and recoils - all before the word. So when «sahipsin» appears, the picture already says: you do not. His hand closes on nothing, the same closing as a moment ago at the left, and sinks. A quiet hold while the gloss reads.

**Camera.** YARIN, held (the creep continues). No move until 8.07, when the gloss has begun its fade-out.

**Gloss band.** «sahipsin» 7.14-8.35 over pure hedge: lip at screen y 1213 with his feet on it; the mound and the mist end at the lip; no flowers or buds in the field.

| t | event |
|---|---|
| 06.57 | 6.57-6.80 his head tilts down to the empty palm; fingers curl slightly. |
| 06.83 | 6.83-7.07 he stretches the arm toward the dashed ring (full stretch, shoulders shift 4 px; no body lean). — *leads «ona» (6.97) by 4.0 fr* |
| 07.00 | Mist thickens over the ring, pass 1 of 3 (7.00 / 7.07 / 7.17): two passes are on before the gloss, and by 7.17 the ring is a ghost at about 35 % strength. |
| 07.07 | The hand STOPS at world (784, 896), a clear 150 screen px short of the ring, and recoils 10 px over two frames (7.07-7.13). — *leads «mâliksin» (7.14) by 2.2 fr* |
| 07.14 | [engine] gloss «sahipsin» appears (until 8.35). |
| 07.20 | 7.20-7.33 his hand closes empty. |
| 07.40 | 7.40-7.97 the arm sinks to his side with overlap; head returns level. |
| 07.70 | 7.70-8.07 HOLD: only mist drift, specks, his breathing. The ring is perfectly still. |

**SFX.** none (voice only).

### 08.07–09.57 · Öyle ise   (after the pause 7.69-8.85)

**Idea:** So then: the veil opens - today was above him all along.

**Picture.** As the gloss fades the frame widens and returns to the centre, and the move is finished before the word. The whole dotted course is in view: its left leg dim in the dusk, its right leg running down to the faint ring in the mist, and at its apex, directly over his head, the veil cloud. On «Öyle ise» - on a frame at rest - the cloud parts and is dabbed out: today's sun stands uncovered, a clear gold disc, distinct from yesterday's orange. He lifts his head a little toward it; his arms stay at his sides.

**Camera.** Glide YARIN_DRIFT -> HOME_WIDE 8.07-8.77 (cubic in-out), inside the pause. It starts with the gloss's fade-out and is at rest before «Öyle»: the unveiling happens on a still frame. The hedge lip travels only from screen y 1213 to 1200.

**Gloss band.** «sahipsin» fades out 8.05-8.35 over pure hedge while the glide starts softly (lip 1213 -> 1210); afterwards hedge only.

| t | event |
|---|---|
| 08.07 | Camera leaves YARIN just as «sahipsin» begins its 0.30 s fade-out (cubic in-out: 3 % of the way at 8.20, 27 % at 8.35 when the text is gone). |
| 08.77 | Camera settled on HOME_WIDE (99.6 % at 8.70). Veil cloud dab-out, step 1 of 4 (8.77 / 8.90 / 9.03 / 9.17), while its two halves drift 70 px apart (ease in-out). First gold shows. — *leads «Öyle» (8.85) by 2.4 fr* |
| 09.17 | Last cloud dabs gone: today's sun is uncovered at the apex - gold disc r 110 at (540, 340), calm, no halo yet. |
| 09.27 | 9.27-9.50 he lifts his head slightly toward it (5 degrees). Arms stay down. |

**SFX.** 08.42 `whoosh` (-2 dB) — the frame widens back to the centre (peak at the middle of the move)

### 09.57–10.70 · hakiki ömrünü,

**Idea:** Your real life: light pours on the one rise he stands on, and life blooms there.

**Picture.** Today's sun blazes: the disc saturates and its halo grows in three stepped passes. A sparse column of warm dabs steps down onto him and lands on the low rise he stands on: the mound behind him turns a lit yellow-green; his own colours warm. On «ömrünü» the buds on the lit rise open into white flowers, from his feet outward - large, each on its dark leaf rosette, so the white reads. The bud on the dusk side stays closed.

**Camera.** HOME_WIDE -> HOME: one continuous 1.5 % push from 8.77 to 12.20 (sine out), pivoting on the hedge lip.

**Gloss band.** No gloss. Hedge only; every flower ends at or above y 1210.

| t | event |
|---|---|
| 09.57 | BLAZE pass 1: the disc saturates; yellow halo to r 190. — *leads «hakiki» (9.67) by 3.0 fr* |
| 09.67 | Blaze pass 2: peach halo to r 250. |
| 09.77 | Blaze pass 3: white-cream specks to r 300, with a warm pass in the sky round the apex (it belongs to this halo pass and leaves with it). |
| 09.87 | Light column, step 1 of 3 (9.87 / 9.97 / 10.07): sparse yellow / peach dabs step down from the sun onto him. |
| 10.07 | The column lands: the mound turns lit yellow-green (x 300-780, nothing below y 1208); his colours warm one step (warm level 0 -> 1). |
| 10.13 | The first two flowers (f1, f2) pop open at his feet: bud -> flower, scale 0 -> 1.12 -> 1 with a quarter turn, then swaying. — *leads «ömrünü» (10.23) by 2.8 fr* |
| 10.20 | f3, f4 open - the two large ones (92 and 88 px across). |
| 10.27 | f5, f6 open. Six white flowers on the lit rise. |

**SFX.** 09.67 `shimmer` (+0 dB) — today lights up (peak on the second blaze pass) · 10.13 `pop_flurry` (-1 dB) — flowers open: three soft pops, one per step

### 10.70–12.20 · bulunduğun gün bil.   (pause 11.77-12.55)

**Idea:** The day you are IN: only where he stands is lit - and he takes it to heart.

**Picture.** He lowers his gaze from the sun to the lit ground he is standing on. The two sides recede one value step - the left duskier, the right mistier - and the two legs of the dotted course dab out from the feet upward: yesterday's and tomorrow's tracks leave, only today remains. On «bil» he straightens with the smallest nod. He never raises his arms or opens his palms to the sun. A hold on the triptych: dusk / day / mist - three days in one sky, one of them lit. Then, in the breath after the sentence, the blaze settles: the outer halo and the light column dab out and the sky round the sun deepens to a cobalt ring - the stage for the hours. The lit rise and his warmth stay.

**Camera.** The 1.5 % push ends exactly on HOME at 12.20 with zero velocity.

**Gloss band.** No gloss. Hedge only.

| t | event |
|---|---|
| 10.70 | 10.70-11.00 he lowers his gaze to the lit ground he stands on (head bows 8 degrees). — *leads «bulunduğun» (10.81) by 3.2 fr* |
| 10.73 | Side zones recede, pass 1 (left duskier, right mistier); second pass 10.87. 10.73-11.20 both legs of the course dab out from the feet upward, two dots per leg per step on twos (eight steps). |
| 11.20 | Course gone. Only today's sun, its column and the man on his lit rise remain saturated. |
| 11.53 | 11.53-11.73 he straightens: head comes level with the smallest nod, shoulders settle. Arms stay at his sides. — *leads «bil» (11.61) by 2.3 fr* |
| 11.77 | 11.77-11.90 HOLD on the triptych. Flowers sway, halo breathes, specks drift. |
| 11.90 | The blaze SETTLES in four steps on twos (11.90 / 11.97 / 12.03 / 12.10): halo passes 2 and 3 and the light column dab out, pass 1 draws in from r 190 to r 170, and a soft cobalt annulus (r 150-270) is dabbed into the sky round the sun. The lit rise and the warmth on him stay. |
| 12.10 | 12.10-12.20 at rest: the calm sun in its cobalt ring over the man on his lit rise. |
| 12.20 | HAND-OFF to act 2 (see handoff_out). |

**SFX.** none (voice only).

### HAND-OFF act 1 → act 2 at 12.20 (both teams must be able to render this exact frame)

- **Camera:** HOME (cx 540, cy 960, zoom 1); zero (act 1 eases out into HOME; act 2 holds until 14.27); plus the shared drift.
- **Man:** pose `back_neutral`, back view, world x 540, feet y 1200; arms at his sides (hands at y 989), head level, weight even, warm level 1 (lit state: one extra pass of light dabs, top #CF6E48, trousers #63473A); no foot shadow; shared breathing.
- **Visible:**
  - sky: cool high-key dabs; left third (world x < 380) in its dusk state (sunset passes 0 and 1 under 2 dusk passes, + 2 recede passes); right third (world x > 720) pre-dawn pale (+ 2 recede passes)
  - cloud c1 at layer x 30 + 3 * 12.20 = 67, y 10 (top-left corner, mostly cropped)
  - today's sun in its UNDER-RING state: gold disc r 110 at (540, 340), saturated; yellow halo pass only, r 170; soft cobalt annulus r 150-270 round it; shared halo breath. No light column, no warm sky pass
  - the mound in its lit state (yellow-green, x 300-780, nothing below y 1208); far ridge; hedge with tone-on-tone leaves
  - six flowers f1-f6 open on their leaf rosettes, on the shared sway; bud e1 closed
  - right: mist bank in its thickened state (2 build + 3 thickening passes, + 2 recede passes) with tomorrow's dashed ring at (924, 1089), r 108, about 35 % strength, still
  - ambient specks (shared system; sky stage only)
- **Not visible:** course dots (all dabbed out by 11.20); veil cloud (gone 9.17); light column and halo passes 2 and 3 (dabbed out 11.90-12.10); yesterday's sun, afterglow, deed (gone); any gloss ('sahipsin' ended 8.35; 'en az' starts 12.55); clock-hand, hour-beads, coin, far light and its surround, knoll, chest, mescid, rug (act 2 creates them).
- **Frames:** act 1 delivers frames 0-365 (t = 0 ... 12.167); act 2 delivers frames 366-719 (t = 12.200 ... 23.967). Frame 366 (t = 12.20) belongs to act 2 only; for the identity test the act-1 scene must also be able to draw t = 12.20, and the two stills must match pixel for pixel.
- **Shared life** (pure functions of absolute time, built once in `video/src/shared/`): camera drift: E.driftCamera(cam, t, {seed: 7, amp: 4, period: 6, zoom: 0.002, rot: 0}) applied to EVERY frame of both acts, with absolute video time t; breathing: shoulders dy = 3 * sin(2 * PI * t / 3.4) px, torso scaleY +-0.6 %; halo breath: halo scale = 1 + 0.03 * sin(2 * PI * t / 4.0); disc itself rigid; far light breath: scale = 1 + 0.02 * sin(2 * PI * (t - 17.07) / 3.0); never flickers; flower sway: flower i: rot = 0.06 * sin(1.1 * t + 1.7 * i) rad, dx = 3 * sin(0.9 * t + 1.7 * i) px (i = 1..6); clouds: x = x0 + drift_px_per_s * t (layout.clouds: one cloud); mist: x offset = 4 * t px, wraps inside its bbox; specks: one seeded system 'ambient' (12 specks; white, pale yellow, pink; size 4-9 px; rising slowly up-right), parallax 1.2, alpha 0.8, drawn only in the sky stage: alpha ramps to 0 between screen y 1150 and 1190 in every framing; identical in both acts.

## 4. ACT2 — One hour, saved (12.20–23.40)

### 12.20–14.57 · Lâekall günün bir saatini,

**Idea:** The day is counted out as 24 hours; one of them turns gold.

**Picture.** A slim clock-hand is printed on today's sun, pointing to five o'clock - and waits. «en az» appears over a picture that does not move. Only then does the hand sweep one full turn; behind it 24 round white hour-beads are laid on the cobalt ring - the day as a dial, with no numeral. The ring is complete on «günün» and holds. On «bir saatini» the bead under the hand turns gold and pops out of the ring, leaving a gap; two small clock-hands are stencilled on its face. One gold among twenty-three white is 'at the very least'. The dial with its gap - the hand still pointing at it - stays in the sky to the end of the film.

**Camera.** HOME, held (shared drift only) until 14.27 - no move while «en az» is up. Then the follow move to MEDIUM begins with the falling hour.

**Gloss band.** «en az» 12.55-13.95 over pure hedge at HOME (lip y 1200; flowers end at or above y 1210; the lit rise ends at y 1208).

| t | event |
|---|---|
| 12.30 | 12.30-12.50 he looks up (head tilts back 5 degrees). |
| 12.47 | A slim tapered stencil clock-hand (dark maroon, 186 px long, 15 px wide at the hub, round hub r 11) is printed at the sun's centre, pointing to 5 o'clock. It holds still until 12.87. (No word is hung on it: the picture of «Lâekall» is the gloss itself.) |
| 12.55 | [engine] gloss «en az» appears (until 13.95) over a still frame: nothing moves for the first 0.32 s. |
| 12.87 | 12.87-13.40 the hand sweeps ONE full clockwise turn: 16 frames, 45 degrees per two frames, eased only on its first and last two frames. |
| 12.93 | Behind the hand's tip the hour-beads (white-ivory, r 22, lavender stencil shadow) are dabbed onto the cobalt annulus: 8 steps on twos, 3 beads per step (12.93 / 13.00 / 13.07 / 13.13 / 13.20 / 13.27 / 13.33 / 13.40; k = 1..24), each a 3-frame pop (0 -> 1.15 -> 1). One sweeping gesture, not 24 events. |
| 13.40 | Ring complete: the hand rests on the 24th bead at 5 o'clock, world (645, 522); 13.40-13.50 4 degree overshoot and settle, the last pops settle. Then a HOLD on the complete dial until 13.80. — *leads «günün» (13.51) by 3.3 fr* |
| 13.80 | Anticipation of the pop (not a hit of its own): the bead under the hand is over-dabbed deep gold in two steps (13.80 / 13.87), swells 1 -> 1.25 and at 13.90 dips 6 px inward. Twenty-three stay white. |
| 13.97 | The gold bead POPS outward 40 px along the hand's direction to (665, 557), growing r 22 -> 30; overshoot, settled 14.23. A clear gap is left in the ring; the clock-hand stays, pointing at the gap. — *leads «saatini» (14.07) by 3.1 fr* |
| 14.00 | Two small maroon clock-hands (26 and 18 px, stroke 10) are stencilled on the gold bead's face in one press: it is an hour. They stay on it for the rest of the film. |
| 14.23 | 14.23-14.57 it hovers a moment, then begins to float down toward him. |
| 14.27 | Camera leaves HOME (the gloss is gone since 13.95), following the hour down. |

**SFX.** 12.93 `pop_flurry` (-5 dB) — the hours are laid round the sun: eight very soft tick-pops, one per step of the sweep · 13.97 `pop` (+1 dB) — one hour comes out of the ring

### 14.57–16.03 · ihtiyat akçesi gibi   (pause 16.03-16.67)

**Idea:** The hour lands in his palm and is minted into a coin - money put by.

**Picture.** The gold hour floats down a gentle S-curve toward him - unchanged: a matte gold bead with its two little clock-hands - and the camera goes with it. He raises his right forearm, palm up at chest height. On «akçesi» it lands in his open palm with weight and, in the same press, is MINTED: a raised beaded rim is stamped round it. The hour is now a coin, its clock-hands still on its face. A matte glint. On «gibi» he closes his fingers half over it and draws it in to his side: kept close. Above him the dial stands large with its one gap.

**Camera.** HOME -> MEDIUM 14.27-15.17 (cubic in-out): a follow move that tracks the falling hour; nothing else changes during it. It overlaps the tail of «saatini» and is 96 % arrived at «ihtiyat»; the landing and the minting happen on a frame at rest. Then a small MEDIUM -> MEDIUM_DRIFT creep until 16.03.

**Gloss band.** No gloss. (13.95-17.14 is gloss-free: the lower frame is free; lip at screen y 1472; the coin sits at screen (665, 952), 105 px across.)

| t | event |
|---|---|
| 14.57 | (continuing since 14.23, until 15.37) the gold hour-bead floats down a gentle S-curve at constant size (r 30), face to the viewer. Nothing about it changes on the way: no flip, no growth. |
| 14.67 | 14.67-15.07 he raises his right forearm (screen-right), palm up at chest height, world (720, 830); his head follows the hour down. (Unsynced; it happens round «ihtiyat».) |
| 15.17 | Camera settled on MEDIUM, ahead of the hour. |
| 15.37 | It LANDS in his palm and is MINTED in one press: the palm dips 9 px and recovers by 15.60; a raised beaded rim with a milled edge is stamped round the bead (r 30 -> 44 -> 42, 2-frame overshoot, 6 % squash). A coin (akçe) r 42 rests at world (720, 784): gold face, dark-ochre beaded rim, the same two clock-hands. No script, no figure. — *leads «akçesi» (15.45) by 2.6 fr* |
| 15.40 | Matte glint: five white-gold dabs, stepped 15.40 / 15.47 / 15.53, then gone. No gloss highlight. |
| 15.77 | 15.77-16.03 his mitten closes halfway over the coin and he draws it in to his side, world (660, 880). — *leads «gibi» (15.87) by 3.2 fr* |

**SFX.** 15.37 `coin_land` (+1 dB) — caught in the palm · 15.42 `coin_ting` (-2 dB) — the rim is stamped: now it rings like a coin

### 16.03–17.77 · hakiki istikbal için

**Idea:** The true future: a steady light rises where tomorrow's fog was.

**Picture.** In the pause the camera pulls back and pans right; he turns his head that way. As the frame arrives the mist thins and tomorrow's dashed ring shows once more. On «hakiki» it crumbles into its mist - the uncertain future drops away. Then the right column turns over from the ground up: the pale mist and its pre-dawn wash cross-dab into a green knoll below and a deeper, cooler sky above - and against that deep sky a tall, soft, arch-shaped light rises from beyond the ridge in four passes: peach, gold, a dense white core, a pink rim, brightest just before «istikbal». As it rises, today's sun and its dial recede one value step. Then the light only breathes. It is light and nothing else: no disc, no rays, no edge, no trees, no gate, no figure.

**Camera.** MEDIUM_DRIFT -> ACT2 16.03-16.63 (cubic in-out): pull back 1.26 -> 1.00 and pan right, entirely inside the pause; at rest for «hakiki», for the turn-over, for every pass of the light and for the gloss. Then held.

**Gloss band.** «gelecek» 17.14-18.72 over pure hedge at ACT2 (lip y 1200; knoll mist ends at y 1212; the lit rise ends at y 1208; rug and chest not there yet).

| t | event |
|---|---|
| 16.03 | Camera leaves MEDIUM; the whole move lies in the pause 16.03-16.67. 16.07-16.40 he turns his head to screen-right (cheek sliver; right shoulder 4 px narrower, left 4 px wider; no body lean). Nothing else happens during the move. |
| 16.47 | The cool mist thins one step: tomorrow's dashed ring shows again at about 70 % strength, so that what crumbles next is seen (camera 91 % arrived). |
| 16.57 | The dashed ring CRUMBLES in three steps on twos (16.57 / 16.63 / 16.70); its specks sink into the mist and are gone by 16.83. Camera 99.5 % arrived. — *leads «hakiki» (16.67) by 3.2 fr* |
| 16.63 | Camera settled on ACT2. The right column TURNS OVER in three steps on threes (16.63 / 16.73 / 16.83), from the ground up: the mist and the pre-dawn wash cross-dab into the green knoll (plateau y 770, base in warm mist) and into a deeper cool sky round the place where the light will stand (lavender, violet-blue, cobalt). One event, not a mist-out plus a knoll-in. |
| 16.83 | Far light, pass 1: broad peach, rising from behind the ridge and the knoll - it never floats. With passes 1 and 2 today's sun and its dial RECEDE (one pale sky-blue over-dab in two steps, 16.83 / 16.93; halo in to r 150). |
| 16.93 | Far light, pass 2: gold. |
| 17.00 | Far light, pass 3: the white core, dense (no primer gaps), centre at ACT2 screen (790, 300) - above where a dome will stand. |
| 17.07 | Far light, pass 4 - the brightest: pink rim and a few rising specks. — *leads «istikbal» (17.14) by 2.2 fr* |
| 17.14 | [engine] gloss «gelecek» appears (until 18.72). |
| 17.17 | 17.17-17.77 HOLD. The light only breathes (2 % over 3 s) and warms his right side, the knoll and the lip from the upper right. |

**SFX.** 16.33 `whoosh` (-2 dB) — pull back and turn to the right (peak at the middle of the move) · 17.07 `shimmer` (+1 dB) — the true future (peak on the brightest pass)

### 17.77–19.87 · teşkil olunan bir sandukça-i uhreviye

**Idea:** Its light sets up a little chest within reach - a chest that belongs to the hereafter.

**Picture.** Five light-beads step down from the foot of the white core to the plateau, and where they touch down a little wooden coffer is set up, pass by pass: an ochre-brown wood body with dark straps, gold corner plates and a small arched lock plate - it takes the lower three beads into itself; then, just before «sandukça-i», a barrel lid with gold bands and a gold knob drops on top and stays a finger ajar. Two beads still link it to the light. The caption reads over a picture that only breathes. On «uhreviye» one thing happens: the seam lights from inside with the far light's own white-gold. It is a savings coffer with a lid - never a box with a slot, never a draped chest.

**Camera.** ACT2 held until 18.90, then ONE slow push ACT2 -> ACT2_TAIL 18.90-24.00 (eases in for one second, then a constant 1.7 % per second with no stop), pivoting on the hedge lip at screen (540, 1200).

**Gloss band.** «gelecek» until 18.72, «âhirete ait sandıkçık» from 18.92: pure hedge; the push pivots on the lip, so the band does not change.

| t | event |
|---|---|
| 17.80 | Light-bead 1 of 5 (17.80 / 17.90 / 18.00 / 18.10 / 18.20, on threes) steps down from the foot of the white core toward the plateau: warm-white stencil dots with a brick rim at world x 1040, y 440 -> 740, each a little larger (r 13 -> 18). — *leads «teşkil» (17.91) by 3.4 fr* |
| 18.27 | Chest BODY, pass 1: ochre-brown wood base, 230 x 115, standing on the plateau where the beads touch down; beads 3-5 are absorbed into it (they dab out with this pass). A continuous build, not a hit (it happens under «olunan»). |
| 18.40 | Body pass 2: dark straps and wood-grain slits. |
| 18.53 | Body pass 3: light dabs on the upper right, gold corner plates, arched gold lock plate (48 x 64). |
| 18.83 | The barrel lid (same wood, two gold bands, gold knob) is printed on top and settles (drops 14 px, 4 % squash, recovered 18.97) - but stays a finger ajar: a 15 px seam, dark inside. Whole chest 230 x 214. Beads 1 and 2 (y 440, 515) stand above its knob (y 556). — *leads «sandukça-i» (18.92) by 2.6 fr* |
| 18.90 | The slow push begins (pivot on the hedge lip; it eases in over one second). |
| 18.92 | [engine] gloss «âhirete ait sandıkçık» appears (until 20.95). |
| 18.97 | 18.97-19.50 nothing moves but breath and drift: the caption reads. |
| 19.50 | The seam under the lid lights from inside with the far light's white-gold, two steps on twos (19.50 / 19.57): warm-white in the seam, a few gold spill dabs over the lid's lower edge. The ONLY event under the caption until 19.87. — *leads «uhreviye» (19.61) by 3.4 fr* |

**SFX.** 18.83 `wood_knock` (+1 dB) — the lid settles on the little chest

### 19.87–21.27 · olan bir mescide   (pause 20.84-21.38)

**Idea:** The chest IS a mosque.

**Picture.** On «olan» the coffer gathers itself and completes itself into a small mescid in one coordinated growth of three overlapping moves - nothing is replaced: the lid rises and rounds into a lead-blue ribbed dome on a low drum, taking the last two beads into itself; the body widens into ivory walls, its lock plate opening into the glowing doorway; a slim pencil minaret rises at the left. Gold crescents pop on just before «mescide», the dome's finial standing in the foot of the white core. Then a clean hold through the pause; the caption 'âhirete ait sandıkçık' and the mescid share the screen for half a second, and then the picture is free of text.

**Camera.** The slow push continues at its constant rate (framing ACT2_PUSH at 20.90 is a sample, not a stop).

**Gloss band.** «âhirete ait sandıkçık» until 20.95 over pure hedge (everything new is above y 1200).

| t | event |
|---|---|
| 19.87 | 19.87-19.97 anticipation: the chest squashes 6 %. — *leads «olan» (19.95) by 2.6 fr* |
| 19.97 | MOVE 1, 19.97-20.27: the lid rises 59 px and rounds into the dome (230 x 144) on a low plain drum band - a stencil-mask tween (E.drawStencil) over the pre-baked dome texture, while the lid's wood ribs cross-dab to lead-blue dome ribs; 6 % overshoot of the mask, no sprite stretching. Light-beads 1 and 2 are taken into it (gone by 20.10). |
| 20.00 | MOVE 2, 20.00-20.27: the body widens 230 -> 280 (mask tween) and cross-dabs from wood to ivory stone; the SAME passes bring the two maroon arched windows and open the lock plate into the glowing arched doorway (56 x 96, 8 px maroon frame, same arch, same light). Straps and plates dab out with them. |
| 20.13 | MOVE 3, 20.13-20.30: the pencil minaret rises at the left as ONE sprite, balcony and conical cap included (ease-out, 4 % overshoot, settled 20.33). |
| 20.33 | Gold crescent finial pops onto the dome (tiny dab-burst); the minaret's follows at 20.37 on the settled shaft. Everything is at rest by 20.43. Unmistakably a mescid. — *leads «mescide» (20.43) by 3.0 fr* |
| 20.43 | Settled. Mescid world x 850-1180, base y 770, dome finial y 388 (inside the foot of the white core), minaret finial y 296. No light-beads remain. |
| 20.47 | 20.47-21.27 HOLD. The doorway's light breathes; he lifts his head a little toward it. Nothing else. |

**SFX.** 19.97 `dab_flurry` (-2 dB) — the chest is re-stencilled into a mescid

### 21.27–22.20 · veya bir seccadeye

**Idea:** ...or a prayer rug: the same chest in its nearest form.

**Picture.** The doorway brightens and its light spills down the knoll's face; in that light a rolled prayer rug is printed just below the plateau's edge. It unrolls down the slope toward us - fast at first, then settling - flat and slightly tapering as in a miniature painting: madder-red field, ivory border, fringes, and at the mosque end, revealed first, the pointed mihrab niche, aimed at the door. Just before «seccadeye» the niche begins to glow with the same light. One light and one arch at three sizes: the coffer's seam and lock plate, the doorway, the niche. The rug ends well above the mist at the knoll's foot; he does not step onto it. Only when the rug lies still does the left column move: he opens his hand - the coin, face to us, its clock-hand ticking one notch.

**Camera.** The slow push continues.

**Gloss band.** No gloss. Hedge only; the rug's bottom fringe is at screen y 1096 at 23.40, far above the lip.

| t | event |
|---|---|
| 21.27 | The doorway brightens one step and its light spills down the knoll's face: one soft warm patch from the sill to about world y 860. — *leads «veya» (21.38) by 3.3 fr* |
| 21.33 | In that light the rolled prayer rug is printed just below the plateau's edge, two passes on twos (21.33 / 21.40): roll 216 x 46 at world y 790-836, madder red with an ivory spiral end. It does not come out of the door. |
| 21.43 | 21.43-21.93 it unrolls down the knoll's face toward us with a QUART EASE-OUT (fast first, long settle): 216 wide at the top edge (y 812), 236 at the bottom edge (y 1085), centred under the doorway. The roll front passes the niche's base (y 1040) at 21.63. |
| 21.67 | Top border, top fringe and the whole pointed mihrab niche (150 x 200, apex toward the door) are visible. |
| 21.73 | The niche begins to GLOW - the same white-gold as the seam and the doorway - in two steps on twos (21.73 / 21.80). This, the lit mihrab, is the picture of the word. — *leads «seccadeye» (21.84) by 3.1 fr* |
| 21.90 | 21.90-21.97 the roll is spent; the bottom fringe flicks out and settles. From 21.97 the rug lies still: bottom fringe at world y 1103, above the warm mist (1125). |
| 22.00 | 22.00-22.17 only now the left column moves, and with ONE small motion: his hand opens where it is, at his side, turning palm-out. The coin is fully visible at world (668, 872), face to the viewer, against the sky - and stays visible in his open fingers until it leaves them. |
| 22.17 | The coin's long clock-hand ticks one notch (6 degrees, one frame): it is the hour. |

**SFX.** 21.93 `cloth_unroll` (+0 dB) — the rug unrolls; the soft flap lands as the fringe flicks out

### 22.20–23.40 · at.

**Idea:** He casts the hour - and it reaches the true future.

**Picture.** One small, unhurried underhand swing with a half-step toward the mosque: the coin leaves his hand just before «at» and travels a low arc across the gap between the two columns, its clock face toward us the whole way - no flip - slowing as it arrives, so that it is placed, not pitched. It sinks into the glowing niche and is absorbed; no coin is left lying on the rug. Then three links, one after the other, each in its own beat: the niche's own light swells once, softly; the doorway brightens; the far light swells by one pass - the hour has reached the true future. And then stillness: his arm sinks slowly, he stands a half-step nearer, turned toward the mosque; above him the day's dial with its one gap. Settled, alive, serene.

**Camera.** The slow push runs through 23.40 (framing ACT2_END at that instant) and on to ACT2_TAIL at 24.00 under the cover; it never stops.

**Gloss band.** No gloss. Hedge only.

| t | event |
|---|---|
| 22.20 | ONE underhand swing, 22.20-22.43: the hand dips back to (655, 900) with a 4 px body dip and a 4 px counter-shift of the shoulders (22.20-22.30), then comes forward (22.30-22.43) with a half-step toward the mosque: his right shoe lands 22 px to the right, his hips follow 10 px (complete 22.57; his shoes are hidden by the hedge lip). He keeps this stance. |
| 22.43 | RELEASE at world (720, 820). 22.43-22.87 the coin travels a low arc of 367 px in 13 frames, sine ease-out by arc length: it leaves at the speed of his hand (44 px per frame) and slows to 13 / 8 / 3 px over the last three frames - placed, not pitched; apex (786, 806), over the knoll's shoulder, in front of everything. NO flip: its clock face stays toward the viewer (at most a 20 degree in-plane roll). — *leads «at» (22.56) by 3.7 fr* |
| 22.57 | His arm follows through toward the niche, hand open, to (755, 800), and rests there a moment. |
| 22.87 | 22.87-22.97 the coin reaches the niche, world (1040, 950), and sinks INTO the glow (shrinks in over 3 frames): no bounce, no coin left on the rug. |
| 22.90 | LINK 1: the niche's own light swells once - one soft dab-in bloom, no ring shapes - and settles back by 23.07. |
| 22.97 | 22.97-23.40 his arm sinks slowly to his side; his head stays turned toward the mosque. No bow. |
| 23.00 | LINK 2: the doorway brightens one step. |
| 23.10 | LINK 3: the far light swells by one stepped pass and stays swelled: the hour has reached the true future. (The cover at 23.40 grows from this same core.) |
| 23.13 | 23.13-23.40 settled tableau (8 frames), alive: halo breath, light breath, specks rising, flowers swaying. |
| 23.40 | HAND-OFF to the end card (see handoff_out / endcard). |

**SFX.** 22.87 `coin_drop_in` (+2 dB) — the hour sinks into the niche: soft thud and a warm low bloom

### HAND-OFF act 2 → end card at 23.40

- **Camera:** ACT2_END (cx 790, cy 975.7, zoom 1.07); the slow push continues at its constant rate (1.7 % per second, a pure scale about the lip pivot at screen (540, 1200)) to ACT2_TAIL at 24.00; plus the shared drift.
- **Man:** pose `back_final_stand`, back view, world x 550, feet y 1200; after his half-step toward the mosque (right shoe 22 px to the right, hips 10 px): both arms at his sides, the right one just arriving, empty right hand relaxed; head turned toward the mosque (cheek sliver), right shoulder 4 px narrower and left 4 px wider; no lean, no bow; on the hedge lip, NOT on the rug. Screen at ACT2_END: x 283, head top y 622, feet y 1200.
- **Visible:**
  - left column: today's sun in its receded state at screen [272, 280], r 118, inside its cobalt annulus with the clock-hand and 23 dimmed hour-beads - one gap at 5 o'clock (screen [385, 475]); the man on the lit rise; flowers f1-f6
  - right column, top to bottom: far light in its swelled state inside the deepened cool sky (core centre at screen [802, 256]); the small blue-domed mescid with glowing doorway on the knoll, its dome finial standing in the foot of the white core; the prayer rug on the knoll's face with its niche glowing (glow centre at screen [808, 933])
  - warm mist at the knoll's base, far ridge, hedge; cloud c1 in the top-left corner; ambient specks
  - left edge: a narrow strip of the dusk zone
- **Not visible:** the coin (it sank into the niche at 22.97; no coin lies on the rug); light-beads (absorbed by 20.10), niche bloom (settled 23.07); there are no travelling dots and no ripple rings; any gloss (last one ended 20.95); tomorrow's ring and the cool mist (gone 16.70 / 16.83); light column (gone 12.10).
- **The cover (2D, owner: act-2 team (it needs the 2D engine's sponge stamps); not the end-card team).** Cream sponge dabs cover the painted frame. They GROW OUT OF the true-future light: its swell of 23.10 simply keeps going. Layer: top-most layer of the act-2 scene, in SCREEN space (not affected by camera or drift), drawn after the ambient specks and before E.finish. Frames 702–719. Origin: screen [802, 256]. Stepped passes / coverage: 23.40 → 15 %, 23.50 → 40 %, 23.60 → 65 %, 23.70 → 85 %, 23.80 → 100 %. Order: radial from the light's core (reveal order 'radial', from the origin): pass 1 the light and the sky round it; pass 2 the mescid; pass 3 the rug, the knoll and the centre of the frame; pass 4 reaches the man and the dial; pass 5 closes the left edge and the bottom. The man's region (screen x < 400) is touched only by passes 4 and 5. Colour: warm white #FFFDF6 at the core, thinning within the first two passes to cream primer #EFE4CF with sponge pores.
- **End state of the 2D film.** From 23.80 (frame 714) the 2D frame is exactly the bare primer plate: the shared wall_primer (E.makeWall, same seed) plus E.finish - no sky dabs, nothing else. Frames 714-719 are that plate, six identical frames for the dissolve. Deliverable: video/out/cover_end_plate.png (1080 x 1920, the bare primer plate exactly as frame 714), written by the act-2 team for the end-card team.
- **Then (end-card team).** the photoreal plate fades up out of that plate from frame 714 (t = 23.80); ideally it opens with the same slow push (about 1.7 % per second, a pure scale about screen (540, 1200) - not a drift toward a corner) and eases it out.
- **Requirement on act 2.** The act-2 scene renders frames 366-719. From 23.40 it keeps the settled, living tableau running under the cover (no new events, slow push continuing to ACT2_TAIL) until the cover is full at 23.80, then holds the bare primer plate to frame 719.
- **SFX across the hand-off.** 23.85 `rise` — broad warm swell peaking inside the cover (starts about 22.2 under the last beat; non-musical).

## 5. Assets and the shared world

Everything listed as shared is built once (video/src/shared/) from this file and imported by both act scenes with the same seeds. Neither team re-implements a shared asset or a shared state. Act 1 delivers frames 0-365, act 2 frames 366-719; the still at t = 12.20 must be pixel-identical from both scenes.

**Owner of `video/src/shared/`:** the act-1 team. It builds video/src/shared/world.js as its first deliverable, directly from this file; the act-2 team codes against the interface below from the start, never copies or forks it, and sends change requests to the owner. (If the lead assigns a separate world builder, that builder is the owner instead - there is exactly one.)

**Interface:** `makeWorld(E)` returns `{ cam(t), draw(ctx, t, {pose, slots}) }`. `cam(t)` is the complete camera path of BOTH acts plus the shared drift. `draw` paints every shared layer in stack order for any t in 0-24 s with exactly the state timeline below - no act ever hard-codes 'the state at 12.20' - and calls the act's optional slot callbacks between layers, each inside the right camera transform: `slots.sky` (plane 1.0, after today's sun: course dots, yesterday's sun, veil cloud, deed-side props, clock-hand, hour-beads), `slots.far` (parallax 0.7, before the far ridge: surround and far light), `slots.mid` (plane 1.0, after the mist: knoll, base mist, beads, chest / mescid, spill, rug), `slots.hands` (between the man's arm layers: deed, coin), `slots.front` (after the hedge: coin in flight, bloom, glints, crumble specks), `slots.top` (screen space, last: the cover). The act passes the man's pose for t; the world draws him (skin, warm level, breathing).

**State timeline of every shared asset, 0–24 s** (the shared module implements exactly this; neither act hard-codes a state):

| shared asset | timeline |
|---|---|
| `sky, far_ridge, hedge, wall_primer` | complete from frame 0 (hedge second coat with leaves at 0.07); never change |
| `cloud_small` | from 0.07; layer x = 30 + 3 t, y 10 |
| `mound` | base coat frame 0, second coat + leaf rosettes 0.07; LIT state from 10.07 (one stepped change) to 24.00 |
| `bud / flower` | buds f1-f6 and e1 from 0.07; f1, f2 open 10.13; f3, f4 10.20; f5, f6 10.27; open and swaying to 24.00; e1 never opens |
| `sky_zone_dusk` | sunset pass 0 at 1.27; sunset pass 1 at 2.63; dusk pass 1 at 4.13, dusk pass 2 at 4.27 (they cover the sunset passes); recede passes 10.73 and 10.87; constant to 24.00 |
| `sky_zone_predawn + mist_bank` | build passes 4.50 and 4.67; thickening passes 7.00 / 7.07 / 7.17; recede passes 10.73 and 10.87; constant until 16.47; thins one step 16.47; cross-dabs out 16.63 / 16.73 / 16.83; gone |
| `ring_tomorrow` | draws on 4.83 / 4.90 / 4.97 / 5.03 (4 / 4 / 3 / 3 dashes); 100 % to 7.00; about 80 / 55 / 35 % after 7.00 / 7.07 / 7.17; 35 % and still to 16.47; 70 % at 16.47; crumbles 16.57 / 16.63 / 16.70; gone |
| `sun_today (disc, halo, annulus)` | not drawn before 8.77 (act 1 reveals it under the veil cloud 8.77-9.17) → disc only 9.17 → halo pass 1 (yellow r 190) 9.57, pass 2 (peach r 250) 9.67, pass 3 (white-cream specks r 300 + warm sky pass) 9.77 → SETTLE on twos 11.90 / 11.97 / 12.03 / 12.10: passes 2 and 3 dab out, pass 1 draws in to r 170, cobalt annulus r 150-270 dabs in → constant 12.10-16.83 → RECEDE over-dab 16.83 / 16.93 on disc, halo (r 150) and annulus → constant to 24.00 |
| `light_column` | steps 9.87 / 9.97 / 10.07; dabs out with the settle 11.90-12.10; gone |
| `man_back` | dabs in 1.47 / 1.53 / 1.60; warm level 0 until 10.07, level 1 from 10.07 to 24.00; pose supplied by the act |
| `ambient_specks` | from 0.27 to 24.00; sky stage only |

| asset | used in | design note |
|---|---|---|
| `wall_primer` | both (shared: build once) | Cream primer wall #EFE4CF with sandy pores (E.makeWall, one seed). The plate under everything and, bare, the plate the cover ends on (frame 714). |
| `sky` | both (shared: build once) | Soft sponge dab layers (light blue, cobalt densest at the top, lavender), primer showing between dabs; layer x -300..1600, y -150..1300; complete from frame 0 (no reveal); parallax 0.15. |
| `sky_zone_dusk` | both (shared: build once) | World-anchored (parallax 1.0) over-dab passes for the left third (world x < 380): sunset pass 0 (1.27, faint peach, low), sunset pass 1 (2.63), two dusk passes (lavender 4.13; violet-blue with cobalt 4.27), two recede passes (10.73 / 10.87). |
| `sky_zone_predawn` | both (shared: build once) | World-anchored pale lavender / white / pink wash for the right third (world x > 720), baked into the two mist passes (4.50 / 4.67), plus two recede passes; cross-dabs out 16.63 / 16.73 / 16.83. |
| `cloud_small` | both (shared: build once) | One small white cluster with lavender-grey under-dab (250 x 80), drifting in the top-left corner; parallax 0.3. |
| `veil_cloud` | act1 | Large white cloud 560 x 290 with a peach-gold rim, built as two overlapping halves that can drift apart; four-step dab-out. Plane 1.0 so it stays over the apex. |
| `far_ridge` | both (shared: build once) | Distant lavender-ivory hills with a soft sponge upper edge, crest about y 1135; painted down to layer y 1420 (no hole behind his legs in the closer framings); parallax 0.5. |
| `hedge` | both (shared: build once) | The ground in front of the man: layered foliage mass from the lip (y 1200) to the bottom, dense deep green with tone-on-tone stencil leaves (one small tone step, no light edges inside the gloss field); calm, dark and flower-free; lip lightest; larger tone-on-tone leaves below y 1640. |
| `mound` | both (shared: build once) | The low rise behind the man (x 270-810, top y 1084): mid-green foliage with deep-green leaf rosettes behind each bud. Two states: plain (0.00-10.07) and LIT (yellow-green / pale-yellow dabs at coverage <= 0.45, strongest on the top edge and upper right, never on the rosettes; from 10.07 to the end; never below y 1208). Replaces hedge_lit_patch. |
| `bud` | both (shared: build once) | Closed pink bud r 12 on a short green stem with its leaf rosette, stencil-sharp: six on the mound (they open) and e1 on the dusk side (never opens). |
| `flower` | both (shared: build once) | White five-petal stencil flower, lavender shadow inside the edge, pink blush, gold core; r 34-46 (68-92 px across); bud -> bloom pop with a quarter turn. |
| `man_front` | act1 | Stencil puppet, front view: short dark hair cap over a plain skin face patch (no features), neck, brick top, mitten hands 46 x 56 with a separate thumb, dark-brown trousers, darker shoes; rounded joint caps; arm parts with a 6 px dark inner-edge print so the forearm reads on the torso. Dabs out 1.47-1.60. |
| `man_back` | both (shared: build once) | Same rig and silhouette seen from behind: head all hair with a skin neck and two small ear bumps; 'head_turn' shows a sliver of cheek on the turned side; 'shoulder_turn' narrows the near shoulder by 4 px and widens the far one; warm level 0 / 1; 'half_step' for 22.30-22.57. Rigid legs. Dabs in 1.47-1.60, used to the end. |
| `call_ring` | act1 | 16 white-gold sponge dabs on a circle, each on a slightly larger violet-blue under-dab (as the clouds have theirs) so the light reads on the pale sky; radii 276 / 200 / 131 / 69 (world), then gathered under the hand and dabbed out completely by 0.90. |
| `arc_dots` | act1 | 27 deep-ochre stencil dots (r 12, 3 px maroon inner edge) along the sun-arc at 65.6 px spacing (layout.sun_arc.dots.centres), ending 28 px short of tomorrow's ring; printed two per step, removed two per leg per step. |
| `sun_yesterday` | act1 | Stencil disc r 100 in sunset tones (deep orange base, orange, peach-gold lights upper right) + soft peach / pink halo to r 180; the texture rolls with the disc. |
| `afterglow` | act1 | Soft peach / pink cluster r 130 on the ridge and a burst of about 12 drifting specks. |
| `mist_bank` | both (shared: build once) | Soft lavender-white fog clusters for tomorrow (layer bbox x 740-1350, y 860-1300), two build passes with the pre-dawn wash, three thickening passes, one thinning step (16.47), three-step cross-dab out (16.63-16.83); parallax 0.7. |
| `ring_tomorrow` | both (shared: build once) | Dashed ring r 108: 14 sponge-printed ochre dashes, 11 px stroke, bare inside; draws on 4 / 4 / 3 / 3; strength 100 / 35 / 70 %; crumbles in three steps into specks. Never breathes. |
| `deed` | act1 | Ghost title-deed (senet) 140 x 175: bare-primer sheet with one thin pass of pale dabs, bold dashed maroon edge (12 px dashes), folded corner top-right, three dashed text lines, round dashed seal r 23 with one full ochre pass (a miniature of the ring). No ribbon, no script. Crumble burst of about 14 specks. |
| `sun_today` | both (shared: build once) | Stencil disc r 110, clear gold with yellow / pale-yellow lights upper right (distinct from yesterday's orange); halo passes yellow r 190 (draws in to 170), peach r 250, white-cream specks r 300 with a warm sky pass; soft cobalt annulus r 150-270; receded state (pale sky-blue over-dab, halo r 150). Its full timeline is in the shared table. |
| `light_column` | both (shared: build once) | Sparse column of yellow / peach dabs from the sun to the man (about 280 px wide at the lip), three build steps (9.87-10.07); dabbed out 11.90-12.10. |
| `clock_hand` | act2 | Slim tapered dark-maroon stencil hand, 186 long, 15 px at the hub to 9 px at the tip, round hub r 11, sponge-textured (must look printed, not a vector line). Stays on the dial to the end; takes the recede over-dab at 16.83 / 16.93. |
| `hour_bead` | act2 | Round white-ivory stencil disc r 22 with a lavender shadow inside the lower-left edge; 24 instances laid on the cobalt annulus; receded variant #D6DEE8 from 16.93; a gold variant (deep gold, yellow lights, dark-ochre rim) for the chosen one. |
| `hour_coin` | act2 | The chosen hour, ONE object. State A (13.97-15.37): matte gold bead r 30, rimless, with two maroon clock-hands (26 and 18 px, stroke 10). State B (from 15.37): the same face with a raised beaded dark-ochre rim and milled edge stamped round it, r 42. Face always to the viewer - no flip anywhere in the film. The long hand can tick one notch (22.20). No script, no figure. |
| `glint` | act2 | Five small white-gold dabs, matte, stepped on and off (the minting at 15.40 only). |
| `far_light` | act2 | The true future: tall soft pointed-arch cluster 400 x 1090 (layer x 765-1165, y 60-1150) in four passes (peach, gold, dense white core y 180-420, pink rim), no white or pale gold below y 600; a few rising specks; behind it its SURROUND, a deepened cool sky (lavender, violet-blue, cobalt); edges pure sponge speckle; parallax 0.7; one extra swell pass at 23.10. |
| `knoll` | act2 | Green rise with a plateau (y 770, x 890-1195) and a face sloping toward us; lighter, bluer green and finer dabs than the hedge; cross-dabs in out of the mist in three steps from the ground up. |
| `warm_base_mist` | act2 | Warm white-gold mist dabs along the knoll's base (y 1125-1212), behind the rug and the mound. |
| `light_bead` | act2 | Warm-white stencil dot with a 4 px brick rim (r 13-18): five from the foot of the white core to the plateau; three absorbed by the chest (18.27), two by the dome (19.97-20.10). |
| `chest` | act2 | Squat wooden savings coffer 230 x 214: ochre-brown wood body with grain slits, dark straps, gold corner plates, gold pointed-arch lock plate 48 x 64; barrel lid of the same wood with two gold bands and a gold knob, drawn a finger ajar (15 px seam, dark inside); seam light (warm white + gold spill). NO coin slot, NO green lid, NO cloth. |
| `mescid` | act2 | Small generic Anatolian mescid 330 x 474 that the chest grows into: ivory stone body 280 x 130 with a lavender-grey shadow side and a 6 px lavender inner edge (two maroon arched windows; glowing arched doorway 56 x 96 in an 8 px maroon frame - gold glow, warm white only at its centre), low plain drum, lead-blue ribbed dome 230 x 144, gold crescent finials, slim pencil minaret at the left with ONE balcony and a conical lead-blue cap. Built so that lid -> dome and body -> walls are stencil-mask tweens over pre-baked textures. Not the green-domed mosque of the style reference. |
| `door_light_spill` | act2 | One soft warm cluster on the knoll's face from the door sill to about y 860 (21.27); the rolled rug is printed in it. |
| `rug_roll` | act2 | Rolled prayer rug 216 x 46, madder red with an ivory spiral end; printed at y 790-836, shrinking as it unrolls. |
| `rug` | act2 | Seccade in miniature-painting view (trapezoid 216 -> 236 wide, 273 long + 18 px fringes): madder-red field with pink sponge dabs, ivory border with brick zigzag, thin gold line, deep-green spandrels, pointed ivory-peach mihrab niche 150 x 200 at the mosque end with an inner glow (two steps); a soft shadow dab along one side. |
| `niche_bloom` | act2 | One soft cluster of the niche's own light (warm white / gold): a single dab-in bloom and back (22.90-23.07). No ring shapes. Replaces gold_ripple. |
| `cover` | act2 | Screen-space cream sponge cover, five radial passes from the far light's core (15 / 40 / 65 / 85 / 100 %), warm white at the core thinning to primer; ends as the bare wall_primer plate (frames 714-719). |
| `ambient_specks` | both (shared: build once) | Twelve slow floating specks (white, pale yellow, pink), shared by both acts; parallax 1.2; sky stage only (screen y < 1190). |

## 6. Man poses

Rig notes that the poses rely on: (1) Flat puppet - no yaw. 'Turned toward the mosque' = head_turn (cheek sliver) plus asymmetric shoulders (near shoulder 4 px narrower, far one 4 px wider); body roll never more than 1 degree. (2) Arm parts carry a 6 px dark inner-edge print (bakeStencil edge, tone -0.12) so a forearm lying on the torso still reads (hand on chest, coin at side). (3) Hands: mitten 46 x 56 world px; open / cupped / closed are three clear silhouette swaps, always staged against sky, never against his body, when they carry meaning. (4) Legs are rigid; small body dips (4 px) and the one half-step are hidden at the sole by the hedge lip in front. No knee bends.

| pose | note |
|---|---|
| `front_neutral_bowed` | Front view, arms at sides, head bowed 6 degrees (0.13-0.43). |
| `front_hand_on_chest` | Front view, head up, right hand (screen-left arm) flat on the chest (0.67-1.30); the forearm reads on the torso through its dark inner edge. |
| `turn_front_to_back` | Transition 1.47 / 1.53 / 1.60: cross-dab of the two skins on twos with a 4 px dip and scaleX 1 -> 0.6 -> 1. Not a squash-flip. |
| `back_neutral` | Back view, arms at sides, head level. The rest pose and the HAND-OFF pose at 12.20. |
| `back_left_arm_out_palm_up` | Left arm (screen-left) extended just above shoulder height, palm up and slightly cupped under yesterday's sun (settled 2.10; held still 2.63-3.23). |
| `back_left_reach_after` | Left hand follows the slipping sun 28 px down, fingers closing after it (3.43-3.57). |
| `back_left_hand_closed` | Left hand closed on nothing (3.83-4.03); then the arm lowers with overlap. No head bow. |
| `back_head_turned_right` | Head turned to screen-right (cheek sliver), body still square (4.50-4.90). |
| `back_right_palm_up` | Right forearm (screen-right) raised, palm up at chest height, world (688, 818), the deed above it; head tilted toward the palm. |
| `back_look_at_empty_palm` | Head tilted down to the empty right palm, fingers slightly curled. |
| `back_right_reach` | Right arm at full stretch toward the dashed ring, shoulders shifted 4 px, no body lean; stops short at (784, 896) and recoils 10 px. |
| `back_right_hand_closed` | Right hand closes empty (rhymes with back_left_hand_closed); arm sinks. |
| `back_head_up_small` | Head lifted 5 degrees toward today's sun / the dial. Arms stay down. |
| `back_head_bowed_to_ground` | Head bowed 8 degrees to the lit rise at his feet, arms at sides. |
| `back_nod` | Smallest nod and shoulder settle on «bil». |
| `back_right_palm_receive` | Right forearm raised, palm up and open at CHEST height, world (720, 830) - like the deed palm, never above the shoulder; casual, one hand, never two cupped hands; 9 px dip on landing. |
| `back_coin_held_at_side` | Mitten half closed over the coin, drawn in to his side (660, 880). |
| `back_turned_right` | Head turned right (cheek sliver), right shoulder 4 px narrower and left 4 px wider; no body lean. From 16.07 (toward the far light / mosque). Replaces back_lean_right. |
| `back_coin_shown` | Right hand opens where it is, at his side, palm-out: coin fully visible at (668, 872), face to the viewer, against the sky (22.00-22.20); it stays visible in his fingers through the swing. |
| `back_wind_up` | First half of the one swing (22.20-22.30): hand dips back and down to (655, 900), shoulders counter-shift 4 px, body dips 4 px (no knee bend; shoes hidden by the hedge lip). |
| `back_release` | Second half of the swing (22.30-22.43) with a half-step toward the mosque: right shoe +22 px, hips +10 px; release with the arm forward-right at (720, 820). |
| `back_follow_through` | Arm extended toward the niche, hand open, at (755, 800); then sinking slowly (22.97-23.40). |
| `back_final_stand` | A half-step nearer the mosque: arms at sides, head turned toward the mosque, shoulders asymmetric by 4 px, no lean, no bow. The HAND-OFF pose at 23.40. |

## 7. Director's notes

### Tone

- Serene, warm, unhurried and exact - a quiet word to one's own self, not a spectacle. The viewer should feel addressed, then relieved.
- Hand-made: a painter's sponge and stencils on a primed wall. Stepped dab-ins, rigid cut-outs with beautiful easing, constant small life.
- Motion on the breaths, stillness on the words. Each clause gets one picture and time to be read on a phone; holds are real holds.
- Respect: the unseen is light only; worship is implied by mosque and seccade, never performed in a hurry; the hour is placed, not thrown.
- The hand carries the acting: it loses yesterday, holds nothing of tomorrow, receives one hour, and gives it.

### What must never happen

- No on-screen text of any kind except the four engine glosses. No labels, numerals, script on the deed, coin or mosque.
- No visual hit lagging its word; no new picture idea inside a clause beyond the one listed for it; never more than two synced hits per phrase.
- Never two solid sun discs in one frame; today's disc never cut by the frame.
- No pose that can read as reverence toward the sun: no raised or opened arms, no upturned palms toward it, no head thrown back. The coin is received casually in ONE palm at chest height, never above the shoulder.
- The nefs is never drawn as a creature, shadow or double; nothing glows on him after the call.
- The true future is never a disc, never has rays, a hard edge, a gate, a figure or recognisable trees (no cypress: in Turkey it says cemetery). It must not look like a sunrise and it never floats above the horizon.
- No coin slot, green lid or cloth on the chest (donation box / sanduka). The mescid is never the green-domed mosque of the style reference.
- The coin never flips, anywhere (a flip is a coin toss), and there are no ripple rings (a wishing well). It never enters the chest or the mosque and is never left lying on the rug. Its clock-hands are always readable.
- The rug never comes out of the door. He never steps onto it (he is wearing shoes) and no prayer posture is attempted.
- Nothing light or moving inside the gloss band during a gloss window (leaf stencils there are tone-on-tone); no real camera move while a gloss is at full strength; the hedge lip stays at screen y 1200-1213 while a gloss is up.
- Two columns never act at once; no stepped dab-in on a fast-travelling layer; no event on a picture word while the camera is in a real move.
- No texture swimming, flicker, per-frame randomness, linear robotic moves, joint gaps, sprite stretching beyond 10 %, card-flip turns, body leans beyond 1 degree, or stencil shapes cut by a frame edge.
- No airbrush gradients, outlines, glossy highlights or flat vector fills: every filled area shows sponge pores. No white on primer: every light has its dark.
- No music. Sound effects stay under the voice; at most two cues per beat.

### What was decided, and why

| question | decision | taken from | why |
|---|---|---|---|
| Screen architecture | Sky stage in the top 62 %, a calm dark hedge below whose lip is pinned at screen y 1200-1213 in all four gloss windows; a low flowered rise behind the man; named framings in pixels, all derived with the engine's own camera maths. | design | It is the only layout that guarantees a calm gloss band and Shorts-safe action; the engine's ivory gloss reads best on dark green; the rise gives the white flowers a dark ground. |
| Labels DÜN / YARIN / BUGÜN | Cut. No on-screen text except the four engine glosses. | meaning + motion (against design and the draft) | Text is reserved for the glosses; the narrator names each day as its sun appears; three labels are three extra reading events; YARIN would sit beside «sahipsin». |
| The figure | Front view only for «Ey nefis!»; one turn in the pause before «Bil ki», motivated by a first glow at the left and made as a cross-dab of two skins (never narrower than 60 %); back view (Rückenfigur) for the rest. | design + review (revision 2) | We look with him, so the 'self' addressed is the viewer; his right hand is on screen-right for the deed, the coin and the cast. A squash-flip to a 25 px sliver would expose the card; turning his back ON the word 'Know!' would read as turning away from the call. |
| «Ey nefis!» ring | The ring of dabs converges ON him, is gathered under his hand and is gone by 0.90 - nothing keeps glowing on him. | meaning + review (revision 2) | A vocative arrives; an outward pulse or a lingering glow would make the nefs look luminous or read as a heartbeat. |
| Today's sun before «Öyle ise» | Hidden behind a veil cloud from 0.07, unveiled on «Öyle ise» on a frame that is at rest (the glide ends at 8.77), blazing on «hakiki». Never two solid suns in one frame. | design + motion + review (revision 2) | Set-up and pay-off for the central sentence: today was above him all along. The film's central reveal must not happen inside a camera move. |
| The sun-arc | A tall arch (820 x 855) that fits whole in 9:16, marked by 27 deep-ochre dots of r 12, printed ahead of the falling sun and on over to tomorrow, ending just outside the dashed ring; it dabs out on «bulunduğun gün». | design | It makes three positions one course, is the single guide for the eye and the camera in the crossing 4.10-4.83, and withdraws to leave only today. Dots of r 7 in pale gold would have read as sky texture. |
| The deed | A ghost in the dashed / unpainted grammar, recognisable for 0.7 s (outline 5.67, sealed 6.00, crumbling from 6.37), 12 px maroon dashes, a full-ochre seal that is a miniature of tomorrow's ring; folded corner away from the course dots; no ribbon. | meaning + motion | 'Not yours' must look not-real, yet the noun of the clause has to be read on a phone: it forms right after the palm opens, the seal is the hit on «senet», the negation lands on «yok». |
| «bulunduğun gün bil» | No raised or opened arms toward the sun. He stands inside the light column, lowers his gaze to the lit ground, nods on «bil». | meaning | Open arms under a sun has the silhouette of sun-adoration - the one misreading this audience would not forgive. |
| The 24 hours | 24 round white hour-beads laid on a cobalt annulus by one sweeping clock-hand; the hand waits 0.4 s so that «en az» reads over stillness; one bead turns gold and pops out. The dial, its gap and its hand stay in the sky to the last frame (one value step dimmer from 16.93). | meaning + design + motion + review (revision 2) | 'Saat' is hour and clock: a hand makes the ring a dial without numerals. White needs cobalt behind it (3.1 : 1; on the primer-rich sky it was 1.2 : 1). Keeping the dial keeps the equation on screen at the punchline: one of the day's 24 hours went there - an hour, not money. |
| Hour -> coin | No flip anywhere. The gold bead floats down unchanged and is MINTED on landing: a beaded rim is stamped round it in his palm, on a frame at rest, at the largest scale; received at chest height. | review (revision 2) | A mid-air flip during a camera move was invisible, and a flipping coin is a coin toss. Stamping the rim in the hand is one readable press; at chest height the coin is no 'second head' and no offering toward the sun. |
| The true future | A tall, soft, arch-shaped light rising from beyond the ridge where tomorrow's fog was, with a dense white core set ABOVE where the dome will stand, in a sky that is first deepened round it. Sequenced: ring crumbles on «hakiki» -> right column turns over -> light rises -> brightest on «istikbal». No disc, rays, trees, gate or figure. | design + meaning + review (revision 2) | A horizon strip is a few dozen pixels in 9:16; a tall column uses the format. Uncertain tomorrow versus certain future becomes one contrast: dashed versus steady. Light can only be painted with darkness round it, and it can only be seen on a frame at rest. |
| «teşkil olunan» | Five light-beads step down from the light to the plateau and the chest is set up where they touch down; it absorbs three, the dome later absorbs the other two; body under «olunan», lid just before «sandukça-i»; on «uhreviye» only the seam lights. | meaning + motion + review (revision 2) | Cause and effect in one idea: the chest is established by and for the true future. Beads that hang inside the chest or the dome, or that are 'lit' when hidden, were a geometric contradiction; the longest gloss needs the quietest picture. |
| The chest | A squat wooden savings coffer with straps, lock plate and a barrel lid ajar and glowing from within. No coin slot, no green lid. | meaning + design + review (revision 2) | A slot beside a mosque reads as a donation box; an ivory box with a green rounded lid captioned 'âhirete ait' can read as a sanduka (draped tomb chest). Built from the mosque's shapes, the morph is still a completion, not a replacement. |
| Chest -> mosque | A small generic Anatolian mescid with a lead-blue dome and a pencil minaret, grown in three overlapping moves (lid -> dome, body -> walls with door and windows, minaret as one sprite) from «olan»; crescents pop 3 frames before «mescide»; everything at rest by 20.43. | meaning + review (revision 2) | A visual hit may never lag its word. Eight separate pops under an open caption were unreadable; the green dome of the style reference is one particular mosque, not 'bir mescid', and blue separates from knoll and hedge. |
| The rug | Miniature-painting view on the knoll's face under the doorway, printed in the door's spilled light (not coming out of the door), unrolled with a quart ease-out so the mihrab niche is whole by 21.67 and begins to glow 3 frames before «seccadeye»; it ends above the base mist; the man's hand moves only when the rug lies still. | design + review (revision 2) | Only a plan view shows the mihrab arch - the one thing that says 'seccade' - at phone size, and it has to be there ON the word. A red roll sliding out of a doorway is a tongue or a red carpet. |
| The ending | No qiyam and no stepping onto the rug. A small cast with a half-step toward the mosque; the coin travels face-on and is placed; then three links, one at a time - niche, doorway, far light - and eight frames of stillness. | motion + design + review (revision 2) | Shoes off, two steps, a cast and a prayer posture do not fit in 1.4 s, and a hurried or inexact prayer pose is a worse error than none. Six relays in 0.4 s could not be followed; the half-step makes it a giving, not a toss from afar. |
| Coin destination | The coin sinks INTO the glowing niche and the niche's own light swells once; nothing is left lying on the rug; it never enters the chest or the mosque; no flip, no ripple rings. | meaning + review (revision 2) | It is an hour deposited at the place of prostration, not money given to a building, not a coin toss and not a wishing well. |
| Camera | Five real moves; three lie wholly in pauses, one runs over «Bil ki», one follows the falling hour. MEDIUM loosened to zoom 1.25. From 18.90 one single slow push to the end. Speeds at word onsets are listed, not claimed. | review (revision 2) | The frame must be at rest when a picture word lands; revision 1 claimed that and broke it at «hakiki», «Yarın», «Öyle» and «ihtiyat». |
| Gloss «sahipsin» | Ends at 8.35 instead of 8.65 (custom gloss list; inside the bible's 'by ~8.65'); the glide to the centre starts with its fade-out. | review (revision 2) | So that the text never sits over a moving frame and the veil can still open on a still frame before «Öyle». |
| Flowers | Six large flowers (68-92 px) on the lit rise, each on a dark leaf rosette; no foreground blooms; one closed bud on the dusk side. | review (revision 2) | White on ridge-ivory was 1.3 : 1; the big blooms lay under the Shorts caption and were cut by the frame in two framings. |
| Hand-off to the end card | The cream cover grows out of the true-future light and reaches the man last; it is a screen-space layer made by the act-2 team (frames 702-719), ends as the bare primer plate at frame 714, and the photoreal plate fades up from there. | meaning + motion + review (revision 2) | The light of the true future becomes the page on which the Qur'an and the Risale appear. Owner, layer, pass list, end state and deliverable were undefined. |

### Risks to check in previews (with fallbacks)

- **Donation misreading (gold coin + chest + mosque).** The coin keeps its clock-hands and ticks before the cast; no slot; it goes into the rug's niche; the dial with its one gap stays above him to the last frame; he takes a half-step toward the mosque. If tests still read 'money', enlarge the clock-hands to stroke 12.
- **The cast reads as a coin toss or a wishing well.** No flip and no rings: face-on flight with a decelerating arrival, one soft bloom of the niche's own light. If it still feels flippant, let it land at 22.93 (15 frames) and move the three links one step later.
- **The cross-dab turn (1.47-1.60) at the largest scale of the film.** Two skins on one rig, three steps on twos, scaleX never below 0.6, 4 px dip. Fallback: open already in back view; on «nefis» his elbow bends as the hand goes to his chest. Nothing after 1.6 s changes.
- **Sun 'in his hand' reads as a scale error or as the sun passing through the hand.** Sun, arc and man share plane 1.0; the hand is drawn in front and covers the sun's lowest 20 px; the texture rolls with the disc; a clean 0.6 s hold before the slip. Fallback: the hand stops a few px under the rim.
- **The ghost deed is not recognised on a phone.** It now stands 0.7 s (5.67-6.37) with 12 px dashes and a full-ochre seal, clear of head and dots. If still weak: a second ivory pass on the sheet.
- **The bead sweep strobes.** Beads are laid 3 per step on twos (8 steps), each a 3-frame pop. If it still flickers: keep the 8 steps and soften each pop (4 frames, 0 -> 1.08 -> 1) - never add steps, the ring must be closed by 13.40.
- **The dusk and mist zones look like bad lighting instead of three days.** They are zones of the painting (left third / right third), one value step down; check the still at 11.4.
- **Two light sources split the eye in act 2.** From 16.83 today's sun and dial are receded one value step (halo r 150); the far light has a dense white core in a deepened sky. Check the still at 17.5 with a squint: the eye must go right. If not, add a second recede pass.
- **Light on light (a matte style has no glow).** Every light has its dark (palette.contrast_targets). Check the stills at 13.5, 17.5, 19.6, 20.6 and 21.9 in greyscale: beads, far light, seam, doorway and niche must still read.
- **Ivory mescid against the peach light.** Lavender inner edge and shadow side, lead-blue dome, maroon windows and door frame carry the silhouette; no white or pale gold behind it (below y 600). If weak, deepen the light behind the walls toward pink.
- **The chest reads as a tomb chest or a donation box.** Wood, straps, lock, gold knob, squat proportions, lid ajar with light inside; no green, no cloth, no slot. Show the still at 19.2 to one Turkish viewer before the final render.
- **The rug reads as a banner, a tongue or a red carpet.** It is printed below the plateau's edge in the door's light, tapers, has fringes at both ends, a soft shadow dab along one side and a glowing niche. If it still reads as a banner, add the roll's cast shadow during the unroll.
- **19.9-22.9 is the densest stretch (mosque, rug, cast).** Each is one phrase in one column, strictly one after the other; the right column is at rest before the left one moves. If previews feel rushed, shorten the hold 20.47-21.27 - never the events.
- **The longest gloss is not read in time.** It has 0.95 s of stillness before the morph (18.92-19.87) with only the seam light in between. If reading tests fail, pass end 20.65 for this gloss (text-free hold on the finished mescid; still inside the bible's 'by ~20.95').
- **The hedge (38 % of the wide frames) looks heavy.** Rich tone-on-tone leaves, lit lip, the flowered rise above it, larger tone-on-tone leaves at the bottom - but the gloss field stays dense and dark.
- **Back-view acting is too subtle on a phone.** The hands carry the acting (mitten 46 x 56; open / cupped / closed as silhouette swaps against sky); head moves are 5-8 degrees with a visible neck; never rely on a head turn alone.
- **Parallax judder on the glides (4.17-4.97 and, the fastest, 16.03-16.63).** No stepped dab-in happens on a travelling layer during either. Check at full resolution. If 16.03-16.63 feels abrupt, loosen MEDIUM further to zoom 1.20.
- **The two acts do not meet, or the cover does not meet the end card.** Identity test: both scenes render t = 12.20 and the stills are diffed (must be 0). Cover test: frames 702-719 as a sheet; frame 714 must equal video/out/cover_end_plate.png.

### Sound

No music. Sound names are those of /home/user/work/audio/sfx.py; t is the perceptual hit (= the visual event). gain_db is relative to each sound's calibrated quiet default. Story sounds sit in pauses or on lead-in frames; at most two cues per beat.

## 8. Revision 2 — what changed (for anyone who read revision 1)

- TIMING THAT MOVED (re-check every tween): turn 1.47-1.60 (was 1.73-2.03); arm sweep 1.73; sun gone 4.20; camera moves 4.17-4.97, 8.07-8.77, 14.27-15.17, 16.03-16.63; one slow push 18.90-24.00; gloss «sahipsin» ends 8.35; halo settle 11.90-12.10 (now in act 1); bead sweep 12.87-13.40; minting 15.37; far light 16.83-17.07; rug 21.27-21.97; release 22.43, coin in the niche 22.87-22.97; links 22.90 / 23.00 / 23.10; cover passes 23.40-23.80.
- b15 «seccadeye»: the rug is printed in the door's light on «veya», unrolls 21.43-21.93 with a quart ease-out (niche whole by 21.67) and the niche glows from 21.73 - 3.1 frames before the word. The rug is shorter (bottom edge y 1085) and narrower at the bottom (236); the hand opens only after the rug lies still.
- b10 «en az»: the clock-hand waits until 12.87, so the gloss has 0.3 s of stillness; beads 3 per step on twos behind the hand; white beads sit on a cobalt annulus. The dial, its gap and its hand now stay to the end of the film.
- b12 «hakiki istikbal»: camera inside the pause; ring re-inked 16.47 and crumbling on «hakiki»; mist cross-dabs into knoll and deep sky; far light only on a frame at rest, with its white core raised to y 300, above the dome.
- b13 / b14: five light-beads re-laid (y 440-740) and consumed by chest and dome - none remain in the mosque stage; bead pulse, light answer and coin gleam cut; morph reduced to three moves; wooden coffer and a lead-blue generic mescid instead of the green-domed one.
- b16 «at»: no flip, no ripple rings, no hopping dots, no finial glint, no bead sequence. Face-on flight of 13 frames with a decelerating arrival and a half-step; three links (22.90 / 23.00 / 23.10); 8 frames of settled tableau.
- b11: no mid-air flip; the bead is minted in his palm at 15.37; palm at chest height (720, 830); MEDIUM loosened to zoom 1.25, so the coin sits below and beside his head.
- b04: one guide for the eye (the course dots); dusk in two passes; mist in two passes after 4.50; no head bow; ring draws 4 / 4 / 3 / 3.
- b06: the 'not' comes before the gloss - mist passes 7.00 / 7.07 / 7.17, stop and recoil at 7.07.
- b01 / b02: frame 0 is a complete landscape; the man stands five frames before the call; the hand takes 7 frames to the chest; no lingering glow; the turn is a cross-dab in the pause.
- b08: six larger flowers on a low mound behind the man, each on a dark leaf rosette; the lit patch is the lit state of that mound; no foreground blooms; one closed bud at the dusk side.
- Sync: synced hits cut from 38 to 28 words (halo pulse on «gün», finger curl on «senin», halo swell on «gün», tick on «bir», flip on «ihtiyat», body pass on «olunan» and others are gone or are unsynced anticipation); holds are real holds.
- Numbers: ridge crest in DUN corrected (1202-1218) and the sun sinks to world y 1220; course dots r 12, 27 of them, stopping outside the ring; clock-hand 15 px; seam 15 px; lock plate 48 x 64; coin hands stroke 10; mitten 46 x 56; ridge painted to y 1420; mist to y 1300; one cloud instead of two; specks only above screen y 1190.
- Colour: every light now has its dark - cobalt annulus, deepened sky round the far light, maroon door frame, wood behind the seam, leaf rosettes behind flowers; course dots and rims darker (palette.contrast_targets).
- Hand-offs: a named owner and one interface for video/src/shared/ with the full 0-24 s state timeline of every shared asset; act 1 = frames 0-365, act 2 = 366-719; the cover is a screen-space layer owned by act 2 with five passes, a defined end plate (frame 714) and a PNG deliverable.
- Tools: tools/storyboard_tools.py (engine-exact camera maths; `check`, `md`, `speeds`).
