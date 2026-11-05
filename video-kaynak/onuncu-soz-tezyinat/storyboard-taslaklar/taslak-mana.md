# Storyboard: Onuncu Söz, "Tezyinat" (Sözler, page 81)
**1080×1920 · 30 fps · 72.41 s · voice ends 68.41 · canvas 2D, procedural only (Blender used only for A and K)**

---

## 0. Visual thesis: two worlds connected by lines of meaning

The light of page 81 becomes the sun of the world (A→B). The world's adornments are shown as **precious but brief** (C–G). They turn out to be **samples and images** (numune, suret), and gold lines lead from them to their luminous **originals** (H). The gate of mercy opens onto those originals (I). The world answers with gratitude and is drawn upward (J). Then the light goes back into the page (K).

**Two visual registers. Every developer must use them.**

| | WORLD (dünya) | ORIGINALS (asıl / cennet) |
|---|---|---|
| Rendering | Saturated natural color, soft shadows, normal bloom (0.30) | High-key and luminous, inner light core, bloom 0.50 |
| Motion | Things fall, wilt, melt, drift **down** | Things rise and breathe **up**, never wilt |
| Time sign | Each adornment carries a small **gold arc or hourglass** | Each original is circled by an **endless loop of light** |
| Scale | Asset at 1× | **The same asset**, ×3 scale, +2 petal rings |

**Meaning lines (the Kurzgesagt "explainer" layer), color #F3C969:**
- solid line = relation (projection: "this is the image of that")
- dotted line = attention (nazar, gaze)
- arc = duration (how long something lasts)

The film explains itself through these lines, never through written text.

---

## 1. Global rules (all sequences)

### 1.1 Frame zones
| Zone | y range (px) | Use |
|---|---|---|
| Top UI margin | 0–160 | Atmosphere only, nothing essential |
| **Hero zone** | 160–1180 | All key action |
| Buffer | 1180–1229 | Fade-out zone for motion |
| **Gloss band (64–82 %)** | **1229–1574** | Gloss text only. Background soft and slow |
| Ground / UI | 1574–1920 | Low, quiet foreground (platform UI covers it) |
| Side safe | x 60–1020 | Key items stay inside |

### 1.2 Gloss subtitles (the only on-screen text besides the end card)
- Font: **Cormorant Garamond 600 italic**, 70 px. The long cue at 51.99 uses 60 px on 2 lines with 1.12 line height. Centered at x=540, single-line baseline y=1420.
- **On dark scenes:** #FFF7EA, glow shadow `0 0 18px rgba(255,220,170,.55)` plus `0 2px 6px rgba(0,0,0,.35)`.
- **On light scenes (G page, I paradise):** #4A2A1E, halo `0 0 14px rgba(255,248,236,.9)`.
- In: 200 ms, opacity 0→1, y +14→0, blur 6→0 (easeOutCubic). Out: 200 ms, opacity →0, y →−6.
- No box, no underline ornament, no original word. Pure type only.
- **Band calming while a cue is active:** inside y 1180–1620, reduce particle spawn by 80 %, cap per-element speed at 40 px/s, and fade in over 250 ms a feathered scrim (linear gradient, alpha 0→0.18→0). The scrim uses the scene's dark tone under light text and its light tone under dark text.

### 1.3 Camera and motion
- 2D camera {x, y, zoom, rot}. Every layer has a parallax factor p (0 = sky, 1 = subject, >1 = foreground).
- Default easing: easeInOutCubic for moves, easeOutBack (overshoot ≤ 6 %) for pops, easeInExpo for rush-ins.
- Secondary motion everywhere:
  - plants sway `sin(t·0.6+φ)·2°`
  - objects breathe at scale 1±0.01, period 3–4 s
  - ribbons and tags swing as pendulums (damping 0.92)
  - wings flap: butterflies 7–9 Hz, bees 25 Hz shown as blur
- Handheld micro-drift: ±3 px, 0.2 Hz (off during diagrams).

### 1.4 Post stack (shared module, identical in every sequence)
1. Bloom: downscale ×4, blur 24 px, composite 'lighter' at the sequence's alpha.
2. Film grain: 256² noise tile, 'overlay', alpha 0.05, reseeded every 2 frames. Same tile as the Blender grade so A and K match.
3. Vignette: radial, alpha 0.22.
4. Dust and pollen motes: 30–60, r 1–3 px, alpha 0.2–0.5.

### 1.5 Sound
- **No music.** Single soft SFX only: no melodies, no tuned chime sequences.
- SFX bus peaks ≤ −28 dBFS. Duck −6 dB whenever the voice is active. High-pass at 120 Hz.
- Prefer placing cues in the gaps between phrases.

### 1.6 Forbidden imagery (applies to every frame)
- No humans and no body parts: no hands holding objects (spoon, candle and jars float by themselves), no eyes, faces or silhouettes.
- **No eye-like shapes:**
  - no nazar boncuğu
  - no peacock "eyes"
  - no butterfly eyespots
  - birds and insects drawn **without eye dots**
- No angels, no "wings of light". Mercy is light and rain only.
- No depiction or symbol of Allah. The source of light always stays **beyond the top of the frame**.
- No calligraphy, letters, numbers or price tags. Tags are blank ivory.
- No hearts, no cartoon faces on flowers.
- Sacred elements are used **twice only**: a mosque silhouette (I4) and a seccade (J1).

---

## 2. Visual vocabulary: the same word always gets the same sign

| Word / idea | Recurring sign | Occurrences |
|---|---|---|
| **tezyinat** | Gold tezhip filigree (rumi curls) draws itself around the adornments, plus a bloom pop | 2.50 · 26.16 · 50.79 |
| **kıymet** | Faceted gem glint sweeps across the item | 23.48 · 31.41 |
| **ömür / müddet kısa** | Short gold arc on a ring timer · fast-draining hourglass · melting | 18.08 · 19.66 · 24.79–25.84 · 35.49–36.81 |
| **doymak** | İznik bowl with a dotted "satiety line" that is never reached | 14.96 · 20.68–21.79 |
| **numune** | Small item under glass with a blank ivory tag; solid gold projection lines to its original | 38.91 · 57.19 |
| **suret** | Projection lines plus a translucent shimmer passing over the sample | 40.87 · 57.19 |
| **asıl / usûl-ü daimî** | The same asset ×3, luminous, inside an endless loop of light | 40.15 · 44.83 · 56.25 · 63.67 |
| **nazar** | Dotted gaze vector, **never an eye** | 44.11 · 45.41 |
| **rahmet** | Soft rain of light falling from beyond the frame (in Turkish, rain is "rahmet") | 53.09 |
| **certainty** (elbette, öyledir) | 8-point girih star seal that locks into place | 49.11 · 57.95 / 59.23 / 60.15 |
| **ibret** | The rose turns into stained glass (revzen); the camera passes *through* it | 27.15 |
| **şükür** | Flowers bow in a wave; light motes rise | 62.45 |

---

## 3. Global palette

| Token | Hex | Use |
|---|---|---|
| risale-red-light | #E7A39B | Book echo, ribbons |
| risale-red-mid | #D07F77 | Page rules, star marker |
| risale-red-deep | #B25A55 | Footnote rule, velvet shade |
| risale-red-hi | #F8D9D3 | Highlights |
| page-glow | #FFF4E0 | All whiteout handoffs (A→B, F→G, J→K) |
| page-paper | #F7EEDC | Page in G |
| gold | #F3C969 | Meaning lines, ring fills |
| gold-mid | #E0B451 | Filigree, frames |
| gold-deep | #B8862B | Shading |
| rose | #E8455F (base #B5173A, edge #FF8FA3, rim #FFD1DC) | Hero rose |
| cold-pain | #8FB3DA / glint #CFE6FF | C3 |
| İznik cobalt / turquoise / bole red | #1F5FA8 / #3FB4B0 / #C8323C | Bowl |
| paradise core / glow | #FFFFFF / #FFF1CC / #FFE29A | Originals |

---

## 4. Reusable assets (build once, shared module `assets/`)

1. **Rose (gül)**
   - Petals: 5 rings × (5, 6, 7, 8, 8) cupped bezier petals, radial gradient #B5173A→#FF8FA3, rim light #FFD1DC ('lighter').
   - Sepals #3E8E5A. Stem #3E7D4E with 3 thorns.
   - Params: `open 0..1`, `wilt 0..1` (droop 30°, desaturate to #9C5A5F, curl), `scatter` (per-petal physics: wind vector, flutter), `glass` (petals at 60 % alpha, lead lines #3B2417 2 px, backlit from behind), `paradise` (+2 rings, ×3, inner core #FFFFFF, edge #FFE0E6, breathing, petals never detach).
   - Used in B, C, F, G, H, I, J.
2. **Tulip (lale-i rumi, Ottoman almond tulip):** slender bloom, 6 needle-pointed petals, #E23D4E→#FF8A8A tips, long stem, 2 leaves. Same `open / wilt / paradise` params. Used in B, D (bowl motif), E, I, J.
3. **Carnation (karanfil):** zigzag-fringed petal edges, #F06A8A. **Hyacinth (sümbül):** stacked 6-point star florets, #7E6BD6. Used in B, I, J.
4. **Pomegranate (nar):** sphere #C8233A→#7A0E22, 6-point crown. `split` mode: halves rotate ±12°, hex-packed arils #FF4D6D with specular dots #FFD1DC. Used in B, G, H, I.
5. **Butterfly:** two-lobe wings with vein lines; gradients #4FC3F7 / #FFB74D / #BA68C8; **no eyespots**; capsule body #2A1E1A; flap by wing scaleX. **Bee:** stripes #F2C14E / #3A2A1A, wing blur ellipse. Used in B, G, H, I, J.
6. **Bee-eater (arıkuşu):** stylized side-profile silhouette #F2C14E / #2BB3A3 / #8A4B2A, **no eye dot**. Used in B, I.
7. **World curve:** circle center (540, 3400), radius 2700, crest at y≈700. Used **identically** in B, I2 and J1 so that "dünya" is always the same hill.
8. **Tezhip filigree:** procedural rumi spirals with leaf terminals, stroke #E9C46A 2–3 px. Drawn on with `setLineDash` offset; settles at 40 % alpha. Can be shaped as a border or as an Ottoman **şemse** medallion. Used in B, F, I.
9. **Ring timer:** track #2B4A5E 6 px, gold fill arc #F3C969 8 px with glowing tip. Used in C (sky arcs), D→E, E.
10. **Hourglass:** walnut frame #6B4429, glass #CFE6F2 at α 0.35, sand #E9C27A (particle stream). Used in F, I2.
11. **İznik bowl:** porcelain #F4EFE6, cobalt and turquoise tulip/carnation band, inner emptiness gradient #1A0F18, dotted satiety line (dash 6/10, #F3C969), measurement double-arrow glyph. Used in D, E, F.
12. **Silver spoon:** #D9DEE6 / #8E97A6, rumi-curl handle. **Candle:** wax #F5EBDD, flame core #FFF6D5, outer flame #FFB347, glow #FF9A3C, smoke #9AA7B2.
13. **Terazi (brass balance):** brass #C99A3E, highlight #F0CD7A, shadow #7A5A22. Coins #E9B949. Gems #3FB4B0 / #E2445C / #2FA36B.
14. **Snowflake:** 6-fold L-system, depth 4, `draw 0..1` / `melt 0..1`. Colors #E8F7FF / #9AD8F5, prism sweep #FF9AA2 #FFDAC1 #B5EAD7 #C7CEEA.
15. **Bell jar (fanus) + vitrin:** walnut #5A3A26, kafes lattice #3E2818, Risale-red velvet shelf, blank ivory tag on a light-red ribbon.
16. **Gate arch:** pointed arch with a 48 px girih border (gold #E8C26A plus turquoise inlay #7FD1C7), light-gold doors with geometric panels.
17. **Girih 8-point star medallion:** 3 build stages (outline → interlace → gold fill). Small version is the hâşiye marker in G.
18. **Mosque silhouette:** Ottoman central dome, 2 slender minarets with şerefe balconies, lit windows #FFD98A, a swag of dot-lights between the minarets (no text).
19. **Seccade:** green #23604E, mihrab motif #2F7A62, gold border #E0B451, fringe #F1E4C8.
20. **Particles:** pollen, petals, light rain, rising motes, sand, sparks, frost.
21. **MeaningLine utility:** solid or dotted gold line with draw-on progress, glow, and optional "lens bend" through a waypoint.

---

## 5. Meaning map at a glance

| Time | Phrase | One clear visual idea |
|---|---|---|
| 0.42 | Hem anlarsın ki | Real book opens; we enter page 81 (Blender) |
| 1.72 | şu dünyadaki tezyinat | The page's light becomes the world's sun; the garden blooms and is traced with gold filigree |
| 3.62 | yalnız telezzüz | Spotlight isolates one pomegranate; it splits open, glistening (pleasure) |
| 4.64 | veya tenezzüh için değil | A second medallion shows a garden stroll; both shrink under a greater light ("not only these") |
| 7.04 | bir zaman lezzet verse | Rose blooms under a fast sun; a short gold arc; warm fragrance ribbons reach the viewer |
| 9.18 | firakıyla | The bloom detaches; petals and warmth fly away |
| 9.78 | birçok zaman elem verir | Bare thorned stem; moons pass; the long cold arc dwarfs the short gold one; a thorn glints |
| 12.00 | Sana tattırır | One honey drop on a spoon turns toward you |
| 13.30 | iştihanı açar | The bowl widens; its emptiness grows |
| 14.60 | fakat doyurmaz | The level stays far below the dotted satiety line |
| 16.56 | ya onun ömrü kısa | Tulip's ring timer: short arc, then wilt |
| 18.80 | ya senin ömrün kısadır | Your candle: short arc, burns down |
| 20.68 | Doymaya kâfi değil | Both arcs pour into the bowl; still far from full |
| 22.96 | kıymeti yüksek | A single rose outweighs a heap of gold on the scale |
| 24.79 | müddeti kısa olan | Hourglass drains in a second |
| 26.00 | şu tezyinat | Pull back: every adornment has its hourglass, framed by a şemse filigree |
| 27.15 | ibret içindir | The rose becomes stained glass; we pass through it |
| 28.93 | Hâşiye | Page: star marker, footnote rule, camera drops below the rule |
| 30.23 | her şeyin kıymeti | Specimen tray of everything; each frame glints |
| 32.03 | dekaik-ı sanatı | Macro snowflake draws its finest branches |
| 33.23 | gayet yüksek ve güzel | Snowflake in full glory, prism sweep |
| 35.49 | müddeti kısa, ömrü azdır | It melts to a drop and falls |
| 38.03 | numunelerdir | Things placed under glass jars with blank sample tags |
| 40.15 | suretleri hükmündedirler | Projection lines from a luminous original to the sample |
| 43.07 | müşterilerin nazarlarını | Butterflies and bees (the flower's customers) with dotted gaze lines to the sample |
| 44.83 | asıllarına çeviriyorlar | The lines bend through the sample to the original; the creatures turn |
| 47.89 | Öyle ise elbette | Gate seal locks; doors open |
| 49.61 | şu dünyadaki o çeşit tezyinat | Small worldly adornments on the world curve, filigree |
| 51.89 | Rahman-ı Rahîm'in rahmetiyle | Embracing light from beyond; rain of mercy |
| 54.27 | sevdiği ibadına hazırladığı | Mosque of the servants; a lantern path is prepared up into the gate |
| 56.25 | niam-ı cennetin numuneleridir | Through the gate: luminous originals; lines link the small to the great |
| 57.95 | denilebilir / ve denilir / ve öyledir | Girih seal built in 3 steps; 3 rising waves |
| 62.45 | şükür içindir | Flowers bow around a seccade; motes rise |
| 63.67 | usûl-ü daimîsine teşvik içindir | Path of beckoning chevrons up to the eternal originals |
| 66.19 | Başka gayet ulvi gayeler içindir | Ascent through ever-higher arches; countless lights converge into the page's light |

---

## 6. Sequences

---

### A · kitap_giris · 0.00–2.70 (Blender + canvas handoff)

**Color script:** Blender warm walnut grade. Canvas overlay motes #FFE9C4. Handoff color #FFF4E0.

**A1 · "Hem anlarsın ki" · 0.42–1.16**
- **Screen:** Blender. Closed light-red Risale volume on a walnut rahle; the cover opens.
- **Canvas:** 40 dust motes in the key light beam (r 1–3 px, #FFE9C4, α 0.25–0.5, 'lighter', drifting up 6 px/s) plus the shared grain tile.
- **SFX:** 0.15 faint wood settle; 0.9 soft leather cover whisper.

**A2 · "şu dünyadaki tezyinat," (first part) · 1.72–2.70** · gloss 'süslemeler' from 2.42
- **Screen:** Blender dives into the glowing page 81.
- **Canvas transition:**
  - **2.30–2.55:** radial bloom from (540, 900), #FFF4E0, radius 200→1400 px (easeInQuad). Motes accelerate toward the center.
  - **2.55:** full cream frame.
  - **2.55–2.70:** the cream's brightest point slides to **(540, 640)** and becomes the **sun** of B. The light of the page becomes the light of the world.
- **Handoff contract:** at 2.55 the frame is a uniform #FFF4E0 with a sun hotspot at (540, 640). B starts from exactly that state.
- **SFX:** 1.9 paper rustle; 2.35 very soft airy swell.

---

### B · bahce · 2.30–6.70

**Color script:**
- Sky #3D6FA3 → #8EC9DC (y 500) → #FDE6BE (y 690). Sun #FFF4E0 / halo #FFD9A0.
- Hills: far #A9D5A0 · mid #5FB27A · near #2F7D57 · foreground meadow #1D4E3B (blur 6 px).
- Accents: rose #E8455F, tulip #E0313F, carnation #F06A8A, hyacinth #7E6BD6, filigree #E9C46A, pomegranate #C8233A / #FF4D6D, path #F3E3C3, cypress #1F4D3C.
- Bloom 0.30.

**Layers (p):** sky 0 · sun rays 0.1 · far hills 0.3 · mid hill 0.6 · garden hill (world curve) 1.0 · pollen 1.2 · foreground meadow 1.4 (blurred, fills the gloss band, sway only).

**B1 · "şu dünyadaki tezyinat," · 1.72–3.02** (canvas visible from 2.55) · gloss 2.42–3.90 'süslemeler'
- **Screen:** The world curve rises from the bottom of the cream. Its gentle curvature reads as "the world". Garden clumps across x 80–1000, y 620–1150.
- **Beats:**
  - **2.55–2.85:** the cream veil lifts top-down.
  - **2.55 ("tezyinat", 2.50–3.02):** 24 blooms (rose, tulip, carnation, hyacinth) pop open from the center outward. Stagger 40 ms, easeOutBack scale 0→1, rotation −15°→0. Each bloom throws 6 pollen sparks.
  - **2.60–3.10:** **gold tezhip filigree draws itself** between the flowers like an illuminated border wrapping the garden. This is *adornment* made literal. It then settles to 40 % alpha.
  - **2.80:** two butterflies and a bee-eater cross right→left at y≈350.
- **Camera:** zoom 1.15→1.00 (reveal pull-back), y −40, easeOutCubic 2.55–3.65.
- **SFX:** 2.6 soft pollen shimmer; 2.62–3.0 tiny bubble-like bloom ticks (−36 dB); 2.85 one distant bird chirp.

**B2 · "yalnız telezzüz" · 3.62–4.58** · gloss 4.00–4.72 'lezzet alma'
- **Screen:** A pomegranate on a branch at (620, 760), 180 px.
- **Beats:**
  - **3.62 "yalnız":** the rest of the garden desaturates 40 % and dims 30 %. A spotlight vignette (r 260) isolates the fruit. *Only* this.
  - **4.08 "telezzüz":** the fruit **splits**: halves rotate ±12° and ruby arils glisten. A juice drop forms with a specular glint. A warm halo #FFC27A pulses ('lighter'). 8 sparkles.
- **Camera:** push 1.0→1.35 toward (620, 760), easeInOutCubic 3.62–4.30.
- **SFX:** 4.10 very gentle juicy crack; 4.30 tiny glint.

**B3 · "veya tenezzüh için değil." · 4.64–5.90** · gloss 4.82–6.57 'gezinti'
- **Screen:** Diagram of "the two purposes", kept above the band.
- **Beats:**
  - **4.64 "veya":** the pomegranate view irises into a **left medallion** (center (300, 560), r 210, thin gold rim).
  - **4.90 "tenezzüh":** a **right medallion** irises open (center (780, 560), r 210). Inside it, a garden promenade: a cream S-path between flower beds and two cypresses. The inner view glides forward along the path (inner parallax: path scales from a vanishing point; flower beds stream past inside the circle). Two butterflies lead the way. This is the stroll.
  - **5.40 "için":** both rims brighten.
  - **5.66 "değil":** zoom 1.0→0.7. Both medallions shrink to r 90 and settle at y 640 inside a now-vast garden. A **broad soft column of light** (#FFF4E0, 'lighter', α 0.35, x 340–740) descends from the top to just above them, and the garden regains full color under it. **Not only these: there is something greater.** No harsh negation symbol.
- **Out (5.90–6.70):** the medallions dissolve into pollen. The light column narrows onto a **rose bud at (540, 760), 140 px** and the camera pushes in (1.0→1.25).
- **Handoff contract (6.40–6.70):** rose bud at (540, 760), 140 px on screen. C crossfades its afternoon sky behind it (α 0→1, easeInOutSine).
- **SFX:** 4.95 light breeze glide (−34 dB); 5.70 soft airy rise; 6.3 faint bird.

---

### C · gul_firak · 6.40–11.80

**Color script:**
- Afternoon: sky #F7C27C → #E98C6B, warm light #FFD08A.
- Dusk: #6A5A9A → #2A2E5C.
- Night of pain: #141B33 → #22304F. Cold accents #8FB3DA, thorn glint #CFE6FF, moon #DDE8F5.
- Bloom 0.35 when warm, 0.20 when cold.

**Layout:** hero rose at (540, 760), 420 px at full bloom. Stem down to y 1500 with thorns at (552, 1010), (528, 1120), (556, 1240). The stem in the band is static. Sun path: an arc from (120, 520) through (540, 260) to (960, 520).

**C1 · "Çünkü bir zaman lezzet verse," · 7.04–8.62**
- **Beats:**
  - **7.36 "bir zaman":** the sun travels its arc **quickly** (1.2 s). A thin **short gold arc** (70°) traces behind it: "a while". The rose unfurls in sync (5 rings, 70 ms stagger).
  - **7.88 "lezzet":** at full bloom, 3 golden fragrance ribbons (#FFD08A→transparent, width 10→2 px, 'lighter') spiral out toward the camera. A warm wash of #FFB070 ('soft-light', +8 %).
  - **8.28 "verse":** the ribbons expand past the frame edges and the frame glows warm.
- **Camera:** slow push 1.0→1.08.
- **SFX:** 7.40 petal unfurl rustle; 7.95 warm, breath-like shimmer.

**C2 · "firakıyla" · 9.18–9.72** · gloss 9.10–10.36 'ayrılmasıyla'
- **Beats:**
  - **8.62–9.18:** the sun sets at right; the sky goes to dusk. Wind streaks enter from the left at 8.9.
  - **9.18:** the bloom **detaches** at the calyx (tiny light spark).
  - **9.25–9.72:** petals separate one by one (30 ms stagger) and fly **up-right**, out of frame and above y 1180. The warm aura is dragged away behind them as a fading tail.
  - The camera **stays with the bare stem**. We remain with what is left behind: separation.
- **Camera:** drifts 0.3 s with the petals, then returns. Zoom 1.08→1.0.
- **SFX:** 9.20 tiny snap; 9.25–9.90 petal-wind whoosh, fading.

**C3 · "birçok zaman elem verir." · 9.78–11.10** · gloss 10.46–12.07 'acı'
- **Beats:**
  - **9.78 "birçok zaman":** night. Four moons in successive phases cross the sky **slowly**. A **long cold-blue arc** (#8FB3DA) keeps extending around the sky beside the ghost of the short gold arc from C1. This is the diagram: short pleasure, long pain. The stem's shadow lengthens and rotates.
  - **10.54 "elem":** push to the thorn at (552, 1010), zoom 1.0→1.4, so the thorn sits at (540, 700) on screen. A sharp 4-ray glint #CFE6FF, a cold ripple ring, and frost creeping along the stem.
  - **10.84 "verir":** the blue arc reaches 300°; the gold arc stays at 70°.
- **Out (11.10–11.80):** a dew drop (#BFE3FF) swells at the thorn tip and falls at 11.55. While falling it warms to amber #F2A93B.
- **Handoff contract:** drop r=14 at (540, 780) at 11.65, moving down at 300 px/s. D's spoon fades in beneath it.
- **SFX:** 9.90 very soft cold wind breath; 10.56 crystalline "tink"; 11.55 droplet release tick.

---

### D · tatma · 11.50–16.30

**Color script:**
- Intimate warm dark: radial #4A2C3D center → #22141F edges.
- Honey #F2A93B / #FFE39A. Spoon #D9DEE6 / #8E97A6.
- Bowl #F4EFE6 with cobalt #1F5FA8, turquoise #3FB4B0, red #C8323C. Satiety line #F3C969. Emptiness #1A0F18.
- Bloom 0.30.

**D1 · "Sana tattırır," · 12.00–12.86** (gloss 'acı' ends 12.07, so the band stays quiet)
- **Screen:** A silver tasting spoon floats horizontally at (540, 860), no hand. The drop landed in it at 11.80.
- **Beats:**
  - **12.00 "Sana":** the spoon turns from 3/4 view to frontal **toward the camera**, scale 1.0→1.2. It is offered to *you*.
  - **12.34 "tattırır":** the single drop glistens; 12 tiny gold sparks and a warm ring pulse. One drop only: a taste, not a meal.
- **SFX:** 11.85 warm drip "plip"; 12.40 tiny sweet glint.

**D2 · "iştihanı açar" · 13.30–14.12**
- **Beats:**
  - **12.86–13.30:** the drop slides off into an **İznik bowl** rising from the dark at (540, 960), width 520.
  - **13.30 "iştihanı":** the bowl's empty interior glows faintly hollow.
  - **13.82 "açar":** the rim **opens wide**: width 520→820, depth grows (easeOutCubic). The drop becomes a tiny dot at the bottom of a large emptiness. A **dotted satiety line** draws along the inner rim.
- **Camera:** zoom 1.2→0.95. Bowl bottom at y≈1150.
- **SFX:** 13.35 gentle porcelain resonance; 13.85 soft "opening" air swell.

**D3 · "fakat doyurmaz." · 14.60–15.48**
- **Beats:**
  - **14.60 "fakat":** the drop spreads into a thin honey layer. The level rises to only 8 % of the depth, slows (easeOutQuart) and stops.
  - **14.96 "doyurmaz":** a thin gold **double-headed measurement arrow** (glyph only) draws in the gap between the level and the dotted line. The line pulses once and the emptiness darkens slightly.
  - **15.2–15.48:** the honey layer thins (it doesn't last).
- **Out (15.48–16.30):** the bowl's rim ellipse rotates to face the camera and becomes a circle. The bowl body fades.
- **Handoff contract:** gold ring, 3 px, #F3C969, center (540, 700), r=320 at 16.20.
- **SFX:** 14.70 tiny pour; 15.05 hollow "empty bowl" tone, low and gentle.

---

### E · omur · 16.10–22.50

**Color script:**
- Twilight teal #0F2236 → #1C4656, faint stars #CFE3F0.
- Tulip #E23D4E / #FF8A8A, stem #3E8E5A. Ring track #2B4A5E, fill #F3C969.
- Candle: wax #F5EBDD, flame #FFF6D5 / #FFB347, glow #FF9A3C.
- Bloom 0.30.

**E1 · "Çünkü ya onun ömrü kısa," · 16.56–18.34**
- **Screen:** The ring (from D) encircles a tulip bud at (540, 700).
- **Beats:**
  - **17.14 "ya onun":** a gentle highlight on the tulip. *It.*
  - **17.76 "ömrü":** the gold fill starts at 12 o'clock while the tulip runs its life: bud→bloom (17.76–17.95), glow at 18.0.
  - **18.08 "kısa":** **the fill stops at 60°**, its tip flashes, and the tulip wilts at once (droops, drops 2 petals, desaturates to #9C5A5F).
- **SFX:** 17.80 soft unfurl; 18.10 soft wooden tick.

**E2 · "ya senin ömrün kısadır." · 18.80–20.04**
- **Beats:**
  - **18.34–18.80:** the wilted tulip and its ring shrink to 0.55 and slide to (290, 420). A candle with its own ring (r 260) rises at (600, 780).
  - **18.80 "ya senin":** the flame ignites and leans toward the camera. Warm light reaches the frame edges. Push 1.0→1.12: this light is close to *you*.
  - **19.32 "ömrün":** the ring fill starts. The wax melts fast (340→60 px) with drips running.
  - **19.66 "kısadır":** **the fill stops at 70°**. The flame shrinks to an ember with a thin smoke curl. Gentle, not dramatic.
- **SFX:** 18.82 very soft ignition "fff"; 19.70 tiny wax hiss.

**E3 · "Doymaya kâfi değil." · 20.68–21.79**
- **Beats:**
  - **20.04–20.68:** both short gold arcs peel off their rings as strands of luminous liquid and fly to center, where the **İznik bowl from D** reappears at (540, 800) with its dotted line.
  - **20.68 "Doymaya":** the strands pour in.
  - **21.14 "kâfi":** the level rises to about 15 % with ripples.
  - **21.55 "değil":** it stops far below the line. **The measurement arrow from D returns**: the same diagram language.
- **Out (21.79–22.50):** the bowl moves to (200, 820) and scales to a width of 300. Three brass chains draw up from its rim toward (200, 330).
- **Handoff contract:** bowl-pan at (200, 820), width 300, with chains, at 22.30.
- **SFX:** 20.75 liquid-light pour shimmer; 21.60 the hollow tone again, quieter; 22.1 soft chain clink.

---

### F · kiymet · 22.30–28.70

**Color script:**
- Jeweler's velvet: radial #6A3A5C spot → #4B2142 → #2A1430.
- Brass #C99A3E / #F0CD7A / #7A5A22. Coins #E9B949. Gems #3FB4B0 #E2445C #2FA36B.
- Hourglass glass #CFE6F2 α 0.35, sand #E9C27A.
- Bloom 0.32.

**Layout:** beam pivot (540, 330), beam 760 px; pans at x 200 / 880 hanging to y≈820; column and pedestal ending at y 1180. Below that, only dark velvet.

**F1 · "Demek kıymeti yüksek," · 22.96–24.43**
- **Beats:**
  - **22.50:** the right pan holds a sparkling heap of coins and gems; the scale is level.
  - **22.96 "Demek":** a single hero rose (160 px) floats down from the top into the left pan.
  - **23.48 "kıymeti":** it lands; a **faceted gem glint** sweeps across it.
  - **24.00 "yüksek":** **the rose's pan sinks decisively**: beam −14°, easeOutBack, then damped oscillation. The treasure is outweighed and the coins jiggle upward.
- **SFX:** 23.50 soft brass "tink"; 24.05 gentle balance settle.

**F2 · "müddeti kısa olan" · 24.79–25.84**
- **Beats:**
  - **24.79 "müddeti":** an hourglass materializes at (200, 520) above the rose and flips (180°, 24.79–25.10).
  - **25.30 "kısa":** the sand drains abnormally fast; the top bulb is empty by 25.80. The rose dulls and one petal falls from the pan.
  - **25.62 "olan":** last grains fall; the hourglass glows faintly, then fades.
- **SFX:** 24.85 flip whoosh; 25.30–25.80 fine sand trickle.

**F3 · "şu tezyinat;" · 26.00–26.75** · gloss 26.09–27.93 'süslemeler'
- **Beats:**
  - **26.00 "şu":** fast pull-back, zoom 1.0→0.45 (26.0–26.6). The scale is just one of many: a rosette of adornments around (540, 640), radius 330 (tulip, butterfly, pomegranate, bee-eater, carnation, hyacinth, about 120 px each). **Each has its own tiny hourglass draining.**
  - **26.16 "tezyinat":** the **tezhip filigree** draws the rosette's frame as an Ottoman **şemse** medallion, echoing the book cover.
- **Band:** dark velvet only.
- **SFX:** 26.10 delicate cascade of 6 very soft glints.

**F4 · "ibret içindir," · 27.15–27.91**
- **Beats:**
  - **27.15 "ibret":** the central rose turns to **stained glass** (`glass` mode) with backlight behind it. It is a window you look *through*, not *at*. The camera rushes in (zoom 0.45→3.5, easeInExpo 27.15–27.9). The petal-glass parts like a passage.
  - **27.49 "içindir":** we are inside the bright aperture (upper center).
- **Band rule:** parallax streaks only at the frame edges (x<160 or x>920). The band keeps the dark glass-petal vignette until 27.95.
- **Out (27.95–28.70):** full whiteout to #FFF4E0 by 28.4, then shift to page #F7EEDC.
- **Handoff contract:** uniform #FFF4E0 at 28.50.
- **SFX:** 27.15 breathy rising whoosh; 27.6 soft passing shimmer.

---

### G · hasiye · 28.50–37.80

**Color script:**
- Page: #F7EEDC with fiber noise, edge #E6D3B0. Abstract text bars #CDBBA0 α 0.55 (non-legible rounded bars).
- Page frame: double rule #D07F77. Footnote rule #B25A55. Star marker #C7615A with core #E0B451.
- Specimen tray: #0E1A2C → #1B2B45, frames #E0B451.
- Snowflake #E8F7FF / #9AD8F5, melt drop #BFE3FF.
- Bloom 0.20 on the page, 0.40 on the snowflake.

**G1 · "Hâşiye." · 28.93–29.37**
- **Screen:** Close-up of a Risale-like page: light-red double frame, 11 abstract text bars (y 300–1000).
- **Beats:**
  - **28.93:** a small **8-point star marker** (28 px) at the end of one bar, at (760, 640), pulses.
  - **29.00:** a **footnote rule** draws across at y 1080 (x 140→940, 2 px).
  - **29.0–29.8:** the camera **tilts down below the rule** (y +420). A matching star appears at the start of the footnote area, and a brief dotted line links the two stars. Footnote, understood.
- **Gloss:** none. Text color note: if anything appears over the page, use the dark style.
- **SFX:** 28.95 soft paper rustle.

**G2 · "Evet, madem her şeyin kıymeti" · 30.23–31.87**
- **Beats:**
  - **30.23 "Evet":** the footnote star blooms softly. An affirming beat.
  - **30.47 "madem":** a radial wipe from the star turns the page into the dark specimen tray.
  - **30.83 "her şeyin":** a 3×3 tray (cells 260 px, x 150–930, y 260–1040). Items pop in with a 60 ms stagger: rose, butterfly, **snowflake (center)**, feather, pomegranate, nautilus shell, dragonfly, tulip, cherries. A ghost grid continues past the frame edges at 30 % opacity: *everything*, countless.
  - **31.41 "kıymeti":** a diagonal **gem-glint sweep** lights every gold frame.
- **SFX:** 30.85 extremely soft glass-tray placement clicks; 31.45 glint sweep.

**G3 · "ve dekaik-ı sanatı" · 32.03–33.05** · gloss 32.07–34.16 'sanat incelikleri'
- **Beats:**
  - **32.03:** push into the snowflake cell (zoom 1→5, 32.03–32.70). The other cells blur away.
  - **32.15 "dekaik-ı":** a full-frame six-fold snowflake (diameter 760, center (540, 640)) **draws its own detail**: main arms → side branches → sub-branches → micro-branches (L-system depth 4, glowing 1–3 px strokes).
  - **32.67 "sanatı":** engraved inner hexagonal plates appear. Glints travel along the branches: fineness of craft.
- **SFX:** 32.20–33.0 extremely soft granular ice tinkle.

**G4 · "gayet yüksek ve güzel olduğu halde" · 33.23–35.13**
- **Beats:**
  - **33.63 "yüksek":** the snowflake rises 40 px and its halo grows (r 420, 'lighter').
  - **34.17 "güzel":** a **prism sweep** (pastel spectrum band masked to the flake) crosses the facets, with 24 sparkles at the tips.
  - **34.49–35.13:** it holds in glory, rotating 6°/s. A warm light begins to approach from the right.
- **SFX:** 34.20 soft shimmer sweep.

**G5 · "müddeti kısa, ömrü azdır." · 35.49–37.17**
- **Beats:**
  - **35.49 "müddeti":** a warm wash (#FFC88A) from the right; the tips soften.
  - **35.99 "kısa":** sub-branches **retract** (the reverse of the draw-on, easeInQuad).
  - **36.49 "ömrü":** it is now a clear droplet (r 40) at (540, 640), holding a ghost reflection of the former crystal for 0.2 s.
  - **36.81 "azdır":** the droplet trembles and falls. No gloss is active, so it may cross the band.
- **Out (37.17–37.80):** the camera follows the drop down; H's vitrin rises into view.
- **Handoff contract:** drop r=18 at (540, 640) at 37.75 striking the top of the middle bell-jar dome.
- **SFX:** 35.55 warm air; 36.0 tiny melting crackle; 37.55 soft glass "plink".

---

### H · numune · 37.60–47.80

**Color script:**
- Evening: #121838 → #262A5E.
- Vitrin walnut #5A3A26 / #8A5E3C, kafes #3E2818, velvet #C7615A / #A84A46.
- Glass #DDEBFF α 0.18 with white speculars.
- Originals: core #FFF1CC, glow #FFE29A. Meaning lines #FFE7A8.
- Butterflies #4FC3F7 #FFB74D #BA68C8, bees #F2C14E / #3A2A1A.
- Bloom 0.35.

**Layout:** arched shop window (pointed top at y 180, frame x 120–960, base y 1150). Velvet shelf at y 900. Three bell jars at x 300 / 540 / 780 (dome tops at y 640, 200 px wide). A small hanging glass shop lamp.

**H1 · "Demek, o şeyler numunelerdir," · 38.03–39.63**
- **Beats:**
  - **38.03:** the jars are empty; the drop runs down the middle dome; the lamp glows.
  - **38.51 / 38.70 / 38.91:** the **things we have seen** fly in and settle (easeOutBack): pomegranate (left), rose (center), butterfly (right). Each dome glints as it seals.
  - **38.91 "numunelerdir":** each jar receives a **light-red ribbon with a blank ivory tag**, swinging as a pendulum, with a soft spotlight. Samples.
- **Camera:** push 1.0→1.06.
- **SFX:** 38.55 / 38.75 / 38.95 three soft glass "tings"; 39.1 tiny ribbon swish.

**H2 · "başka şeylerin suretleri hükmündedirler." · 40.15–42.07** · gloss 40.79–42.67 'görüntüleri'
- **Beats:**
  - **40.15 "başka":** the vitrin's back wall dims to transparency. High behind it (center (540, 380)) a **luminous rose**, the paradise version at ×3 with inner light, fades in through soft mist. This is *the other thing*.
  - **40.47 "şeylerin":** it pulses once.
  - **40.87 "suretleri":** **24 solid gold projection lines** draw from the original's contour points down to the matching points on the sample rose (a geometry projection diagram). A translucent horizontal shimmer passes over the sample (41.0–41.4): it is an image.
  - **41.39 "hükmündedirler":** sample and original pulse **in sync** twice. Faint originals appear behind the pomegranate and butterfly jars too (8 lines each): the rule generalizes.
- **Camera:** tilt up 120 px; zoom 1.06→0.92.
- **Band:** dark wood vitrin base, static.
- **SFX:** 40.20 very soft swell; 40.90 faint glass-harmonic hum as the lines connect; 41.45 two soft synchronized pulses.

**H3 · "Ve madem müşterilerin nazarlarını," · 43.07–44.71** · gloss 44.03–45.91 'bakışlarını'
- **Beats:**
  - **42.07–43.07:** pull back (zoom 0.92→0.75). Evening air in front of the glass.
  - **43.07:** 7 butterflies and 4 bees (the flower's natural customers) flutter in from the edges and hover in an arc at y 700–1150.
  - **43.49 "müşterilerin":** they cluster at the glass, headings aimed at the samples.
  - **44.11 "nazarlarını":** **dotted gaze vectors** (dash 4/8, 2 px) draw from the front of each creature to the sample rose. Gaze is shown as direction only, **no eyes**.
- **SFX:** 43.10 very light papery wing flutters; 44.15 soft line-draw shimmer.

**H4 · "asıllarına çeviriyorlar gibi bir vaziyet vardır." · 44.83–47.27**
- **Beats:**
  - **44.83 "asıllarına":** every dotted line **bends through the sample like a lens** and continues up the projection lines to the luminous original. The path is now creature → sample → original. The original brightens.
  - **45.41 "çeviriyorlar":** the creatures **rotate their headings** up toward the original (0→~40°, 40 ms stagger). Their lines re-aim directly at it and a few begin to rise.
  - **46.09 "gibi bir vaziyet":** a clean three-tier diagram (creatures, sample, original) with all lines converging upward. A vast arch-gate outline appears faintly behind the original (#FFF6E3 α 0.25).
  - **46.91 "vardır":** settle, then the camera begins to tilt up.
- **Out (47.27–47.80):** the camera rises; the vitrin exits the bottom and the butterflies follow upward.
- **Handoff contract:** luminous glow (#FFF1CC, r 220) at **(540, 600)** at 47.70. In I, it is the light pouring from the seam of the closed gate.
- **SFX:** 44.90 soft rising harmonic glide; 45.45 group flutter turn; 47.4 airy rise.

---

### I · cennet · 47.60–61.90

**Color script:**
- High-key paradise sky #FFF8EC → #FBE6C3 → #F3C9B8.
- Gate #FFF6E3, border #E8C26A, inlay #7FD1C7.
- Paradise flora: rose #FF6F86 / #FFE0E6 / core #FFFFFF; tulip #FF5A6A; leaves #7CCB8A / #A9E3B0; pomegranate #E83A5A; grapes #8E6BD6.
- Streams: water #BDE7F2, milk #FFFDF6, honey #F6C35B.
- Pavilions #FFF1DA with domes #EBC36B. Mercy rain #FFF3D1. Mosque #3A5566, windows #FFD98A.
- Bloom 0.50. **All glosses here use dark text #4A2A1E.**

**Layout:** gate arch x 90–990, apex y 160, springline y 560, jambs to y 1180. Keystone star at (540, 220). World strip (world curve, small scale) at y 900–1180 in front of the gate.

**I1 · "Öyle ise elbette" · 47.89–49.55**
- **Beats:**
  - **47.89 "Öyle ise":** the closed doors glow along their central seam and the butterflies hover at the threshold.
  - **49.11 "elbette":** the **keystone girih star locks** (radiant 'lighter' starburst). The doors swing open (pseudo-3D: scaleX 1→0 with skew) and light pours toward the camera.
- **Camera:** push 1.0→1.1, with a "click" settle at 49.11 (scale 1.0→1.015→1.0).
- **SFX:** 47.95 soft stone or air resonance; 49.15 single soft latch-click plus air swell.

**I2 · "şu dünyadaki o çeşit tezyinat," · 49.61–51.33** · gloss 50.71–51.89 'süslemeler'
- **Beats:**
  - **49.61 "şu dünyadaki":** in front of the open gate, the **world curve** strip rises: small worldly adornments at 80 % saturation (rose, tulip, carnation, pomegranate, butterfly, bee-eater), **each with its tiny hourglass from F**.
  - **50.41 "çeşit":** the central flower morphs rose → tulip → carnation → hyacinth (120 ms each): *that kind*.
  - **50.79 "tezyinat":** the filigree traces around them (the third use of the tezyinat sign).
- **Band:** soft rose-gold ground mist, static.
- **SFX:** 49.65 very faint garden air; 50.45 tiny flicker ticks.

**I3 · "bir Rahman-ı Rahîm'in rahmetiyle," · 51.89–53.73** · gloss 51.99–54.57 (60 px, 2 lines: "sonsuz merhametli ve şefkatli / olan Allah'ın")
- **Sacred rule:** light only. The source is **never shown**; it stays beyond the top edge.
- **Beats:**
  - **51.89 "bir":** the top of the frame brightens from beyond (#FFFDF5) and a vast soft radiance descends over the gate.
  - **52.07 "Rahman-ı":** two immense curved **veils of light** sweep down from the top corners in an embracing arc that encompasses the whole frame. Mercy that encompasses all.
  - **52.55 "Rahîm'in":** the warmth gathers onto **each** small adornment, giving each its own halo. Mercy to each one.
  - **53.09 "rahmetiyle":** a **gentle rain of light** falls: 400 streaks of 18–40 px, α 0.25–0.5, 700 px/s, angle 6°. Drops touching the world strip make tiny glowing ripples and the flowers lift their heads. In the band, rain α ×0.25.
- **Camera:** very slow tilt up toward the off-frame source.
- **SFX:** 52.0 barely-there warm swell; 53.10–55.0 very soft rain hush (−36 dB), no thunder.

**I4 · "sevdiği ibadına hazırladığı" · 54.27–55.75** · gloss 54.67–56.07 'kullarına'
- **Beats:**
  - **54.27 "sevdiği":** the rain thins and a tender rose-gold pulse (#FFD6C2) flows down from above.
  - **54.75 "ibadına":** tilt down 160 px. An **Ottoman mosque silhouette** rises at (540, 1080), base at y 1180, width 360, set against the gate's glow. Its windows are lit, a swag of dot-lights hangs between the minarets, and tiny lights rise from the courtyard. The worshipping servants are represented by their place of worship, never by figures.
  - **55.21 "hazırladığı":** **preparation**. A path of light is laid from the mosque courtyard up into the gate. Lanterns light one by one going upward (60 ms stagger). Inside the gate, fruit trays and pavilions appear, each with a small pop and glint.
- **SFX:** 55.25 a soft sequence of tiny lantern-lighting "pff" ticks. **No adhan audio.**

**I5 · "niam-ı cennetin numuneleridir," · 56.25–57.87** · gloss 56.17–58.34 'cennet nimetlerinin'
- **Beats:**
  - **56.25 "niam-ı":** fly-through. Scale up from (540, 640), zoom 1.0→1.8 (56.25–56.8). The jambs exit **sideways**.
  - **Paradise reveal:** the originals of every asset (×3, +2 rings, inner light): paradise rose at (600, 640), diameter 560; trees with glowing pomegranates and grapes; four gentle S-curving streams (water, milk, honey, clear); gold-domed pavilions; luminous bee-eaters. Light petals drift **upward**.
  - **56.65 "cennetin":** full bloom, 5-layer parallax.
  - **57.19 "numuneleridir":** the **small worldly rose** floats in at (230, 1060), diameter 120. **Solid projection lines (the H callback)** link it to the great rose; the same happens for the tulip and pomegranate pairs. The small ones are the samples of these.
- **Band:** luminous ground mist #FBE6C3; streams slow and low-contrast there.
- **SFX:** 56.30 wide airy swell; 56.7 very soft stream babble; 57.25 the glass harmonic from H2.

**I6 · "denilebilir" · 57.95–58.57**
- **Beat:** the 8-point **girih medallion** at (540, 230), r 100, draws its **outline** in gold (57.95–58.4). A first soft ring wave expands to r 400 (α 0.4→0).
- **SFX:** 58.0 soft glassy resonance #1.

**I7 · "ve denilir" · 59.07–59.69**
- **Beat:** **59.23:** stage 2. The inner interlace draws (rotated square, inner circle, 8 kites). A second, larger wave (r 700). The paradise brightens +15 % and the projection lines thicken.
- **SFX:** 59.25 resonance #2, slightly brighter (not a melody).

**I8 · "ve öyledir." · 59.91–60.59**
- **Beat:** **60.15 "öyledir":** stage 3. The medallion **fills with gold** (#FFF3C4→#E8C26A) and flashes. A third wave sweeps the whole frame (r 1400). All lines lock solid and bloom peaks (0.50→0.65), then settles. Certainty.
- **Out (60.59–61.90):** the camera descends 1200 px with parallax. The paradise exits upward, leaving the medallion as a sun-like glow in the sky. We return to the world.
- **Handoff contract:** glow (#FFF4DE, r 140) at **(540, 260)** at 61.75; J's dawn sky holds the same glow.
- **SFX:** 60.17 resonance #3 with a longer decay; 61.0 soft descending air.

---

### J · gayeler · 61.60–68.60

**Color script:**
- Dawn sky #1E2C52 → #6D5C8F → #F0A07E → horizon #FFE3B0. Paradise glow #FFF4DE at the top.
- Meadow #4C8F67 / #2E6B52 / foreground #1C4436.
- Seccade #23604E / #2F7A62 / #E0B451 / #F1E4C8.
- Motes #FFE8B0, chevrons #FFF1C9, final sky #FFF8EC.
- Bloom 0.35→0.60.

**J1 · "şükür içindir," · 62.45–63.25**
- **Screen:** the **same world curve hill as B**, now at dawn: the same place with a new meaning. A seccade lies in perspective at center (trapezoid: top 300 px at y 860, bottom 420 px at y 1120), its mihrab motif pointing up toward the horizon light. Rings of reused flowers surround it.
- **Beats:**
  - **62.45 "şükür":** a wave spreads outward from the seccade. Each flower **bows its head** 25° toward it (easeInOutSine, stagger 6 ms per px of distance), like creation's prostration of thanks. From each bowed flower a light mote rises.
  - **62.81 "içindir":** the motes curl upward into the sky.
- **Camera:** push 1.0→1.08 toward the seccade.
- **SFX:** 62.5 soft grass-rustle wave panned left→right; 62.9 tiny ascending shimmer.

**J2 · "usûl-ü daimîsine teşvik içindir." · 63.67–65.51** · gloss 63.59–65.72 'daimî asıllarına'
- **Beats:**
  - **63.67 "usûl-ü":** at the top (y 120–520), within the glow, the **originals** reappear in an arc: paradise rose, tulip, pomegranate.
  - **64.07 "daimîsine":** each gets an **endless orbit of light** (a closed loop of sparkles circling continuously). Their petals never fall.
  - **64.75 "teşvik":** a path of light forms from the seccade up to the originals. **Soft chevrons travel up it** one after another, beckoning. Motes and a few butterflies are drawn up along it by gentle upward wind lines.
  - **65.13 "içindir":** the path holds steady.
- **Band:** dark meadow, minimal sway (the path starts at y 980, above the band).
- **SFX:** 64.10 very quiet sustained air tone; 64.80 three soft shimmer pulses, one per chevron.

**J3 · "Başka gayet ulvi gayeler içindir." · 66.19–68.41**
- **Beats:**
  - **66.19 "Başka":** the camera **ascends** along the path (truck up 1600 px over 2 s, easeInOutCubic), past the originals and the gate glow.
  - **66.79 "gayet":** above, more pointed-arch outlines of light appear, layered and receding (7 arches, each larger and fainter, #FFF1D6 α 0.5→0.1).
  - **67.23 "ulvi":** we **pass through** the arches one by one (they scale past the camera) and light particles stream downward. Sublime height.
  - **67.61 "gayeler":** 24–40 distant lights bloom across the upper sky, each with a small 8-point glint. *Many* purposes, beyond knowing.
  - **68.05 "içindir":** all lights and arches **converge into one cream glow** at (540, 960).
- **Out (68.10–68.60):** canvas reaches full #FFF4E0 by 68.35, then crossfades into the Blender outro 68.35–68.60.
- **Handoff contract:** uniform #FFF4E0 at 68.35, matching the first frame of the glowing page in K.
- **SFX:** 66.25 gentle rising swell; 67.65 delicate scattered sparkles; 68.1 soft resolving breath.

---

### K · kitap_kapanis · 68.10–72.41 (Blender + canvas)

- **Screen:** Blender. Pull back from the glowing page as the book closes; end on the closed light-red volume with other light-red volumes behind.
- **Canvas:**
  - **68.6–70.0:** about 20 lingering motes from J drift over the footage and fade (α 0.4→0).
  - **End card (the only non-gloss text):**
    - Line 1: "Risale-i Nur · Sözler", Cinzel 600, 52 px, tracking 0.08 em, baseline y 1370.
    - Line 2: "Onuncu Söz · 81. Sayfa", Cormorant Garamond 500 italic, 50 px, baseline y 1440.
    - Color #FFF3E6 with shadow `0 2px 12px rgba(40,15,10,.45)`. The "·" separators in gold #E0B451.
    - Fade in 69.40–70.10 (opacity plus y +10→0), hold to the end. Optional final 0.25 s dip to #1A0F0C at 72.16–72.41.
- **SFX:** 68.9 soft book-close (gentle leather and paper); 69.3 soft settle; then silence.

---

## 7. Gloss cue sheet (band content and text style)

| # | Time | Gloss | Seq | Band background | Text |
|---|---|---|---|---|---|
| 1 | 2.42–3.90 | süslemeler | A→B | Cream, then blurred meadow #1D4E3B | Dark #4A2A1E until 2.70, then light (crossfade 150 ms) |
| 2 | 4.00–4.72 | lezzet alma | B | Dimmed meadow | Light |
| 3 | 4.82–6.57 | gezinti | B | Meadow (medallions stay above) | Light |
| 4 | 9.10–10.36 | ayrılmasıyla | C | Dusk, static stem | Light |
| 5 | 10.46–12.07 | acı | C→D | Night / dark interior | Light |
| 6 | 26.09–27.93 | süslemeler | F | Velvet, glass-petal vignette | Light |
| 7 | 32.07–34.16 | sanat incelikleri | G | Navy tray | Light |
| 8 | 40.79–42.67 | görüntüleri | H | Walnut vitrin base | Light |
| 9 | 44.03–45.91 | bakışlarını | H | Indigo (creatures above y 1180) | Light |
| 10 | 50.71–51.89 | süslemeler | I | Rose-gold mist | **Dark** |
| 11 | 51.99–54.57 | sonsuz merhametli ve şefkatli / olan Allah'ın | I | Mist plus rain at ×0.25 | **Dark**, 60 px, 2 lines |
| 12 | 54.67–56.07 | kullarına | I | Mist below the mosque | **Dark** |
| 13 | 56.17–58.34 | cennet nimetlerinin | I | Ground mist, slow streams | **Dark** |
| 14 | 63.59–65.72 | daimî asıllarına | J | Dark meadow | Light |

---

## 8. Handoff contracts (summary for the overlap zones)

| Overlap | Shared element at the handoff moment |
|---|---|
| A→B 2.30–2.70 | Uniform #FFF4E0 at 2.55, sun hotspot (540, 640) |
| B→C 6.40–6.70 | Rose bud (540, 760), 140 px; sky crossfade |
| C→D 11.50–11.80 | Drop r 14 at (540, 780) at 11.65, color #BFE3FF→#F2A93B |
| D→E 16.10–16.30 | Gold ring, center (540, 700), r 320, 3 px |
| E→F 22.30–22.50 | Bowl-pan (200, 820), width 300, chains up to (200, 330) |
| F→G 28.50–28.70 | Uniform #FFF4E0 → page #F7EEDC |
| G→H 37.60–37.80 | Drop r 18 hits the middle dome top (540, 640) at 37.75 |
| H→I 47.60–47.80 | Glow #FFF1CC, r 220 at (540, 600) |
| I→J 61.60–61.90 | Glow #FFF4DE, r 140 at (540, 260) |
| J→K 68.10–68.60 | Uniform #FFF4E0 at 68.35 |

---

## 9. SFX master timeline (all soft, ≤ −28 dBFS, ducked under the voice)

0.15 wood settle · 0.9 cover whisper · 1.9 paper rustle · 2.35 airy swell · 2.6 pollen shimmer · 2.62–3.0 bloom ticks · 2.85 distant bird · 4.10 gentle fruit crack · 4.30 glint · 4.95 breeze glide · 5.70 airy rise · 6.3 faint bird · 7.40 petal unfurl · 7.95 warm shimmer · 9.20 tiny snap · 9.25–9.9 petal wind · 9.90 cold breath · 10.56 thorn "tink" · 11.55 drip tick · 11.85 honey "plip" · 12.40 glint · 13.35 porcelain resonance · 13.85 opening air · 14.70 tiny pour · 15.05 hollow bowl tone · 17.80 unfurl · 18.10 wooden tick · 18.82 flame ignite · 19.70 wax hiss · 20.75 light pour · 21.60 hollow tone (quieter) · 22.1 chain clink · 23.50 brass tink · 24.05 balance settle · 24.85 flip whoosh · 25.30–25.80 sand trickle · 26.10 six soft glints · 27.15 breathy whoosh · 27.6 passing shimmer · 28.95 page rustle · 30.85 tray clicks · 31.45 glint sweep · 32.20–33.0 ice tinkle · 34.20 shimmer sweep · 35.55 warm air · 36.0 melt crackle · 37.55 glass plink · 38.55 / 38.75 / 38.95 glass tings · 39.1 ribbon swish · 40.20 swell · 40.90 glass harmonic · 41.45 two pulses · 43.10 wing flutters · 44.15 line shimmer · 44.90 rising glide · 45.45 flutter turn · 47.4 airy rise · 47.95 stone resonance · 49.15 latch-click and swell · 49.65 garden air · 50.45 flicker ticks · 52.0 warm swell · 53.10–55.0 rain hush · 55.25 lantern ticks · 56.30 open-space swell · 56.7 stream babble · 57.25 glass harmonic · 58.0 / 59.25 / 60.17 three glassy resonances (rising brightness, no melody) · 61.0 descending air · 62.5 grass wave · 62.9 ascending shimmer · 64.10 air tone · 64.80 three chevron pulses · 66.25 rising swell · 67.65 sparkles · 68.1 resolve breath · 68.9 book close · 69.3 settle · silence to 72.41.

---

**Source data used:** word-level timings from `/home/user/A/video-kaynak/onuncu-soz-tezyinat/audio/kelimeler.json` (same as `/home/user/A/video-kaynak/onuncu-soz-tezyinat/engine/timing.js`). Fonts available in `/home/user/A/video-kaynak/onuncu-soz-tezyinat/fonts/`: Cormorant Garamond, Cinzel, Amiri.