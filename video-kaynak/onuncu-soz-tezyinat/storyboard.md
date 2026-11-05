# STORYBOARD — Onuncu Söz · Tezyinat (bağlayıcı senaryo)

> Bu dosya üç bağımsız taslaktan seçilen "sinema" önerisidir; aşağıdaki **YÖNETMEN NOTLARI** onun önüne geçer.

## YÖNETMEN NOTLARI (öncelikli)
1. **Kitap rengi (müşteri şartı):** Risale-i Nur ciltleri *çok açık elit kırmızı* — açık asil kırmızı, pembe/somon DEĞİL, bordo DEĞİL.
   Canvas'ta kitaba değen her öğe için: cilt `#D45A63`, ışık `#E7848A`, gölge `#A8343F`, yaldız `#D8B26E`, sayfa ışığı `#FFF4DC`.
   (Aşağıda geçen `#EBA9A4 / #F6CFCB / #C98580` değerleri GEÇERSİZDİR.)
2. **Gloss alt yazıları tamamen motordadır** (`engine/core.js`): dik Cormorant Garamond 600, fildişi + yumuşak koyu gölge, altın parıltı süpürmesi.
   Kutu yok, kaynak kelime yok, **altın çizgi (hairline) yok, koyu-yazı varyantı yok.** Sahneler yalnız şunu yapar: alt yazı varken
   (`E.glossActive(t)`) bant (y≈1229–1574) sakin ve **orta-koyu tonda** kalır; parlak sahnelerde (I) o bölge derin yeşil/teal
   (`#2E7F62 → #1F5E4C`) olmalı ki fildişi yazı okunsun. İsteğe bağlı çok yumuşak tüylü koyulaştırma (alfa ≤ 0.25, kutu gibi görünmemeli).
3. **Blender giriş zamanlaması:** kapak ~0.35–1.25 s açılır, kamera 1.25–2.70 s sayfaya dalar, son ~10 kare neredeyse parlak krem.
   Çıkış: 68.10'da parlak sayfadan başlar, ~70.6'dan sonra kapalı kitap. A/K canvas katmanları bu kareler gelince ayarlanır.
4. **Hat/kaligrafi yok, etiket yok, sayı yok.** Ekrandaki tek yazılar: motorun gloss'ları + K'deki künye.
5. **İnsan yok, insan uzvu yok** (el, göz, yüz, siluet, gölge). "Sen" = kandil alevi; "müşteriler" = kenarlardan giren ışık lifleri;
   "kullar" = hazırlanmış seccadeler/kandiller. Allah tasvir edilmez; rahmet = kaynaksız yukarıdan ışık ve ışık yağmuru.
6. **Ses:** müzik yok; SFX tonal melodi değil, çok kısık (bkz. §0.7). SFX listesi entegrasyonda ayrıca üretilecek.
7. **Performans:** kare başına ≲ 600 ms; çok sayıda öğeyi (180 çiçek, 400 damla) `setup()`'ta önceden çizilmiş sprite'larla çizin.
8. **Ortak öğeler** (`engine/assets_*.js`) §1'deki kütüphanedir; eşleşmeli kesmeler için aynı fonksiyonlar kullanılmalı.

---

# STORYBOARD: "Tezyinat" (Sözler, Onuncu Söz, s. 81)
**1080×1920 · 30 fps · 72.41 s · Canvas 2D (procedural), plus Blender intro and outro**

---

## 0. GLOBAL DIRECTION

### 0.1 Concept and throughline
**"The sample points to the original" (Numune → Asıl).** One continuous camera journey follows a single **Hero Rose** and the objects that grow out of it. First it falls: garden → wilting → empty bowl → hourglass → darkness. That is transience. Then it crosses over ("ibret"): through a gem → into the footnote's geometry → into a bazaar window of samples. From there it rises: gazes are redirected upward → Paradise originals → dawn gratitude → the hidden higher pattern → back into the glowing page.

- **Emotional and luminance arc:** warm bloom (B) → dusk (C) → plum night (D) → teal twilight, with the **darkest frame at 21.8 s** (a single ember) → violet jewel (F) → ivory crossing → iridescent macro (G) → amber bazaar (H) → **brightest frame at 60.15 s "öyledir"** (I) → dawn (J) → ivory page (K).
- **Bookend rhyme:** the **8-point star (Rub el Hizb / girih)** acts as the visual "footnote bracket". It is foreshadowed in A (8 motes), forms in F (8-ornament rosette), **opens** the Hâşiye at 28.93, **closes** it at about 61.0, and is revealed as the whole garden's hidden plan in J (66–68).
- **Signature rhymes:** petals fall at "firakıyla" (9.18); petals rise at "teşvik" (64.75). The bowl is empty at "doyurmaz" (14.96) and overflows at "cennetin" (56.65). The kandil dies out at "değil" (21.55) and is lit forever at "hazırladığı" (55.21). The jar-rose sample becomes the giant original at "numuneleridir" (57.19).

### 0.2 Frame bands (y in px)
| Band | y range | Use |
|---|---|---|
| Top safe | 0–154 (0–8%) | sky/atmosphere only, no key info (phone UI) |
| **Hero zone** | 192–1152 (10–60%) | all key action, focal points, and match-cut alignment |
| Buffer | 1152–1229 | soft ground and horizon details |
| **Gloss band** | **1229–1574 (64–82%)** | glosses; kept calm (see BandGuard) |
| Foot | 1574–1920 | foreground foliage, ground, and dark parallax framing |

### 0.3 Render stack per frame
1. Background vertical gradient (3–4 stops) plus a large soft radial "key light" blob.
2. Parallax layers L0 sky (p=0.05), L1 far (0.2), L2 mid (0.5), **L3 hero (1.0)**, L4 near (1.4), L5 foreground (1.9). Depth-of-field: `ctx.filter='blur(Npx)'` on L1, L2 and L5. Defaults are L1 4px, L2 1.5px, L5 6px; rack focus animates these values.
3. Particles composited `'lighter'`: pollen, dust, sparks, light rain, sand, petals (petals use normal blending).
4. **Bloom:** downsample the frame to 1/4 size, keep luminance above 0.68, blur in two stages (14px and 42px), composite `'lighter'` at 0.35–0.6 (signature moments up to 0.9).
5. **Grade:** a soft-light overlay gradient per sequence (listed in each color script).
6. **Vignette:** radial, edges rgba(0,0,0,0.32), lighter (0.18) in bright scenes.
7. **Grain:** 8 pre-generated 256×256 noise tiles cycled at 1 per frame, `'overlay'` alpha 0.055.
8. **Gloss text** on top. It is not graded and not grained.
9. Signature-moment-only extras: 1px chromatic offset (R channel −1px, B channel +1px) for ≤0.3 s, and a kaleidoscope (F dive).

### 0.4 Camera grammar and parallax rig
- The camera has `{x, y, z (zoom), r (roll°)}` in world units. Layer transform: `translate(540,960) · scale(1+(z−1)·p) · rotate(r·p·0.5) · translate(−x·p, −y·p)`.
- **Never linear.** Moves use `easeInOutCubic`, arrivals use `easeOutQuint`, and fast dives use `easeInCubic` followed by `easeOutExpo`.
- **Breathing handheld drift, always on:** `x += 3·sin(0.37t)`, `y += 2·sin(0.29t+1)`, `r += 0.15·sin(0.21t)`.
- Arrivals use a **critically-damped spring** (k=140, c=2√k·0.85) for one soft overshoot of 6–14 px.
- **Morph rule:** every morphable silhouette is resampled to **128 points**, starting at the top-most point and wound clockwise. Morphs use point-wise lerp with eased t plus a 3-frame "jelly" overshoot.

### 0.5 Motion language
- **Accent rule:** visual hits land **2–4 frames (≈0.07–0.13 s) before** the word onset. Pops use `easeOutBack(1.7)` over 0.40–0.50 s.
- **Secondary motion everywhere:** stems sway at `sin(1.3t + x·0.01)·(3–8°)`, idle objects breathe at scale 1±0.012 over 3.2 s, leaves flutter on 2-harmonic noise, and particles drift on curl-noise (precomputed 64×64 flow grid).
- **Stagger by distance:** for any wave of pops, `delay = dist / 1400 · 0.9 s`.

### 0.6 Gloss subtitle spec (the only on-screen text)
- **Font:** Cormorant Garamond 600 italic, 76px. The 2-line gloss (51.99–54.57) uses 62px with line height 1.18.
- **Position:** centred at x=540, baseline y=1410 (one line) or 1370/1443 (two lines).
- **Default colour:** #FFF7EA, with a glow pass (`shadowBlur 18, rgba(255,214,150,0.55)`) and a second `'lighter'` pass at 0.25.
- **Bright-scene variant** (B sky-heavy frames and all of I): #2B1630, halo rgba(255,252,245,0.75), shadowBlur 16.
- **In (0.22 s):** opacity 0→1, y +14→0, letter-spacing 0.08em→0.02em, `blur(6px)`→0. A gold hairline #E8C27A (1.5px, width = text width×0.55, 18px below baseline) draws outward from the centre.
- **Out (0.18 s):** opacity →0, y →−8.
- **No box. No original word.**
- **BandGuard(t):** g ramps 0→1 over 0.25 s around each gloss cue. While g>0:
  - Feathered elliptical scrim at (540,1400), rx 640, ry 220: dark scenes use rgba(8,6,18,0.30·g), bright scenes rgba(255,250,240,0.36·g).
  - Particle alpha in the band × (1−0.7g).
  - No object crosses the band faster than 120 px/s.
  - Objects in the band get `blur(+2px·g)`.

### 0.7 SFX philosophy (no music)
- All SFX are non-melodic: air, paper, glass, water, sand, cloth, fire. **No tonal melodies, no chime sequences.** Where a "ting" is used it is a single filtered glass transient.
- **Levels:** −24 to −34 dB relative to voice peak. All SFX are side-chain ducked 6 dB while the voice is active, high-passed at 120 Hz, and low-passed at 9 kHz for softness.
- Louder or longer SFX sit inside the voice gaps (0.9). Inside words they stay at ≤−28 dB.
- **No human sounds** (no murmur, footsteps or breath).

### 0.8 Client rules applied
- Zero humans and zero body parts. "Tasting" is a bowl. "Gazes" are light filaments entering from the frame edges. "Servants" are shown only as prepared places (seccades, lamps, set tables). "You" is a kandil flame.
- Allah is never depicted. Divine names are rendered only as **sourceless light from above** and gentle light-rain (rahmet). Paradise stays suggestive: light, gardens, rivers, pavilions, and **no beings**.
- **Islamic imagery is rare and purposeful:** seccades (I, 54.75), Masjid an-Nabawi silhouette on the horizon (J, 62.45), and geometric star motifs throughout.
- No calligraphy and no labels (sample tags in H are blank).
- Books are Blender photoreal in very light elite red. Canvas overlays reference: cover #EBA9A4, highlight #F6CFCB, shadow #C98580, gilt #D8B26E, page glow #FFF4DC.

### 0.9 Breath gaps (voice silences) and what each carries
| Gap | Carries |
|---|---|
| 1.16–1.72 | Blender cover opening; motes sink |
| 3.02–3.62 | hoopoe crest settle; camera settles |
| 5.90–7.04 | **B→C** (sun sets, push to rose) |
| 8.62–9.18 | attachment filaments appear (set-up) |
| 11.10–12.00 | **C→D** fall (petal → honey drop) |
| 15.48–16.56 | **D→E** bowl + reflection = hourglass |
| 21.79–22.96 | **E→F** darkest moment, ember rises |
| 27.91–28.93 | **F→G** dive exit into parchment |
| 29.37–30.23 | star frame becomes window |
| 37.17–38.03 | **G→H** lattice pull-back |
| 42.07–43.07 | originals breathe; street lanterns sway |
| 47.27–47.89 | **H→I** through the gate |
| 60.59–62.45 | **I→J** footnote star closes → dawn sun |
| 65.51–66.19 | petals rise along path; crane begins |

### 0.10 Master color script
| Seq | BG gradient (top → bottom) | Key accents | Mean lum. |
|---|---|---|---|
| A | walnut #1E120C → #3A2416 → #5C3A24 | book #EBA9A4, gilt #D8B26E, page #FFF4DC | 0.30→0.90 |
| B | #FFF3DE → #FFD6B8 → #F7AE94 | rose #FF4F7B, gold #FFD36E, cyan #4FD6E8, hills #5DB58A | 0.75 |
| C | #F59E7A → #C9708A → #5A3D6E ⟶ #2B2A4F → #3E3560 → #1A1830 | rose #E8456F→#6B3F4A, dew #A9D4FF | 0.60→0.25 |
| D | #2A1633 → #4A2346 → #6E3448 | honey #FFB547/#FFE7A0, Iznik #1F5FA8/#3CC6C0/#D9473A | 0.20 |
| E | #0E2433 → #17485A → #2D6E74 | sand #F2C46B, flame #FFB34D/#FFF4C2, glass #CFF3FF | 0.22→0.06 |
| F | #160F38 → #34206B → #5E2C86 | gold #FFCF5A, ruby #FF3D6E, emerald #2EE6A6, sapphire #4C8DFF | 0.30→0.85 |
| G | parchment #F7EEDC → #EBD9BB; macro #0B1A2A → #10364A → #0F4F5C; frost #DDEFFF → #A8D4F5 | star #D8B26E, irid. #6FF0FF/#B48CFF/#FF7AD9/#FFE66D | 0.80/0.25/0.70 |
| H | #241634 → #4A2A45 → #6E3B3B | lantern #FFAE42/#FFE3A3, glass #BFE8FF@0.22, original #FFF6E0 | 0.30→0.55 |
| I | #FFFDF7 → #FFF1D6 → #E8F7EE → #BDEBD8 | gold #FFD27A, emerald #2FBF7F, rose #FF6F91, water #8FDCFF, milk #FFFDF5, honey #FFC15E | 0.85→1.0 |
| J | #2A2148 → #6B3F72 → #E58A78 → #FFC98F → #FFE7B5 | sun #FFF4D6, gold #FFD98A, dome #3E8E5E, silhouette #2A2140 | 0.55 |
| K | walnut, as A | as A | 0.35 |

---

## 1. REUSABLE ASSET LIBRARY (shared module `assets/`)

| Asset | Geometry and states | Used in |
|---|---|---|
| **HeroRose(R, state)** | 5 petal rings (5, 5, 6, 6, 4-spiral bud). Each petal is a cubic-bezier teardrop with radial gradient base #C2185B → mid #FF4F7B → tip #FF8FA8 and rim light #FFD1DC. Params: `bloom 0..1`, `wilt 0..1` (colour lerp to #6B3F4A, tip control points curl inward 30%, stem droop 40°), `detach[i]` (petal free-body). Variants: **gem** (each petal split into 3 facet triangles, ruby shades #FF3D6E / #D41E52 / #FF8AA8, specular stars), **paradise** (8 rings, inner `'lighter'` glow #FFF0F4, luminous edge #FFD27A), **mini** (scale 0.12, in jar), **outline** (2px #FFF6E0 stroke only, the "original" ghost). Silhouette resampled to 128 pts for morph/match. | A(hint), B, C, F, H, I, J |
| **FlowerSet** | tulip (Ottoman almond lale #FF7A3D/#E03C31), carnation (karanfil #D9473A), lily #FFF4F0, lavender spikes #A88BFF, daisy #FFFFFF/#FFD36E, hyacinth #8E7CFF. Each has a `pop()` (scale 0→1.12→1, petals unfurl ±25°) and a sway. | B, I (rain blooms, jar), J |
| **Hoopoe (hüdhüd)** | body #E8A15C, wings with black/white bars #1E1A1A/#F6F0E6, crest fan 6 feathers with black tips; crest `fan 0..1`. | B, J |
| **Butterfly** | 4-wing bezier; patterns swallowtail #FFD36E/#1E1A1A or sapphire #4C8DFF/#4FD6E8; flap = scaleX by \|sin(14t)\|; macro sub-layers (scales → ridges → girih) for G. | B, E, F(gem), G, J |
| **Iznik Bowl (kase)** | 3/4-view: rim ellipse + U-profile body + foot. Porcelain #F6F0E6, shade #D9CFC0, inner tulip/saz/carnation pattern paths in #1F5FA8 / #4FA3E0 / #3CC6C0 / #D9473A. States: `dim`, `lit radius`, `widen`, `overflow` (honey-light streams). Reflection = vertical mirror, alpha 0.35, blur 3px. | D, E, I |
| **Hourglass** | built from Bowl + its reflection (wide-narrow-wide); glass #CFF3FF@0.18, two highlight streaks #FFFFFF@0.5; sand stream + conical piles #F2C46B/#FFE29A. | E |
| **Kandil** | small clay/brass oil lamp #C99A4A, glass reservoir showing oil level #E0A040@0.6, flame = 2 layered teardrops (#FFB34D outer, #FFF4C2 core) with flicker noise; light radius 380px radial #FFB34D@0.35. | E, I |
| **Pomegranate (nar)** | whole #E8384F/#9C1530 with crown; cut-open variant with seed cells #FF5A78 + `'lighter'` gloss dots; gem variant. | F, G, H, I |
| **Peacock feather (tavus tüyü)** | rachis + barbs (radial thin strokes), ocellus rings #2E1A6B / #4C8DFF / #2EE6A6 / #FFCF5A. | F, G, H |
| **Snowflake** | 6-fold recursive branch paths #E8F6FF + `'lighter'` edge; `melt 0..1` morphs to a circle droplet. | G |
| **Bell Jar (cloche)** | glass dome path, fill #BFE8FF@0.12, rim spec arc, moving spec highlight band; brass base #C99A4A; blank hanging tag on a string (sways). | H, I |
| **Ottoman Arch / Gate** | pointed (four-centred) arch, muqarnas band (stacked small arches), lattice (kafes) infill of 8-point star tiling #6E4A32. Luminous version: stroke #FFF6E0, inner fill gradient #FFFFFF → transparent. | G→H, H, I |
| **Star8** | 2 overlapped squares (Rub el Hizb) + girih extension lines; `open 0..1` (squares rotate ±22.5° and expand), `draw 0..1` (dash offset). | A, F, G, I, J |
| **Seccade** | perspective quad 120×220; field #A8323E / #2F7D5B / #2E5FA3; mihrab-arch motif #E6B85C; border, fringe strands; `unroll 0..1` (cylinder roll path). | I |
| **Mosque silhouette** | Masjid an-Nabawi abstraction: low arcade, green dome #3E8E5E (rim light #8FE3A8), 4 thin minarets with crescent finials; flat #2A2140. | J |
| **Filament** | glowing polyline/bezier, 1.5–2.5px core + 8px halo, animated dash flow, `snap()` spring recoil with sparks. | C (attachment), H (gazes), J (path ribbon) |
| **Particles** | pollen, dust motes, petals (rigid with flutter), sand grains, sparks, light rain, wisps (curling smoke-light), facet glints (4-point stars). Pooled, max 1,500. | all |
| **GardenRig** | B's layered garden (sky, sun, 3 hill strata, meadow, path, foreground leaves) parameterised by palette, so it can be recoloured for J and miniaturised for the I jar. | B, I(jar), J |

---

## 2. SEQUENCE STORYBOARDS

---

### A_kitap_giris · 0.00–2.70 (Blender photoreal plus canvas atmospherics and transition)
**Colour script:** BG (Blender) walnut #1E120C / #3A2416 / #5C3A24. Canvas accents: mote #FFD98A, halo #FFB547, sunbeam rgba(255,236,200,0.10), page glow #FFF4DC → #FFF6E6.
**Blender coordination (to confirm with the 3D artist):** cover opens 0.90–1.80; camera dives into page 81 over 1.80–2.70; page glow peaks at 2.55.

**0.00–0.42 · pre-roll (HOOK)**
- **On screen:** closed light-red book on the walnut rahle, centred about y 900–1250. Canvas adds a diagonal sunbeam from top-left (−100,0) to (900,1300), 380px wide, `'lighter'`, and 60 dust motes (r 1–3px, Brownian, alpha 0.3–0.7).
- **Beats:** at 0.10 a single **gold mote** (#FFD98A core r 5, halo r 40 #FFB547@0.4) lifts off the gilt page edge at (540,1180) and rises on a sine path, leaving a 40px fading trail. This is the first-second hook.
- **Camera:** Blender. Canvas motes use a 0.6 parallax offset relative to the Blender move.
- **SFX:** 0.05 very faint room tone and wood settle (−34 dB).

**0.42–1.16 · "Hem anlarsın ki"**
- **Beats:** "Hem" 0.42: the mote brightens (scale 1→1.4). "anlarsın" 0.56 (accent 0.50): the mote **splits into 8 motes** arranged as a Star8 (r 70) around (540,1050), which rotate 45° over 0.6 s. This foreshadows the footnote star. "ki" 1.06: the motes spiral down into the gap of the opening cover and vanish with small flashes as the cover lifts.
- **SFX:** 0.56 eight micro-sparkles (granular, non-tonal, −32 dB). Blender cover leather-flap at ~0.9 (−26 dB).

**1.72–3.02 · "şu dünyadaki tezyinat," (A part to 2.70; B overlap from 2.30)**
- **Beats:** "şu dünyadaki" 1.72–2.44: page glow intensifies (Blender). Canvas overlays **14 ink lines** (#5A2A2F@0.6, 3px) matching the page's text lines. At 2.30 the lines **lift off the page and curl** (each becomes a bezier with a growing end-curl) and their colour lerps #5A2A2F → #3F9A7A, so the lines become **stems**. "tezyinat" 2.50 (accent 2.44): radial whiteout #FFF6E6 from the centre fills the frame by 2.60. The B garden is revealed through an expanding radial mask by 2.70, and flowers pop at the stem tips (handled in B).
- **Transition → B:** the page-glow hole *is* the garden's sun position. The stems that were ink lines persist as B's foreground stems.
- **SFX:** 2.30 soft airy inhale swell (−28 dB); 2.50 bloom shimmer (−26 dB, soft granular, no pitch).

---

### B_bahce · 2.30–6.70 · "the world's adornments"
**Colour script:** sky #FFF3DE → #FFD6B8 (45%) → #F7AE94 (70%). Sun disc (760,520) r 140 #FFF8E8, glow #FFD9A0. Hills: far #9ED6B4 (haze 0.5), mid #5DB58A, near #2F8A6E, foreground #15524A. Accents: rose #FF4F7B/#FF8FA8/#C2185B, tulip #FF7A3D, lily #FFF4F0, lavender #A88BFF, gold #FFD36E, butterflies #4FD6E8 and #FFB547, path #F3D9B1. Grade: soft-light #FFB38A@0.12.
**Composition:** horizon y 1000; HeroRose (R 100) on a tall stem at (540,820); hoopoe on a branch at (250,700); meadow 1000–1500 (soft and darker in the band: #2F8A6E→#1F6A58); foreground leaves 1600–1920 (L5, blurred).

**2.30–3.02 · "…tezyinat," (gloss 2.42–3.90 'süslemeler')**
- **Beats:** 2.44 **BLOOM WAVE (signature #1)**: 180 FlowerSet pops radiate from the sun/glow centre, staggered by distance over 2.44–3.40, with pollen bursts (`'lighter'`, #FFE9A0). 2.70 HeroRose blooms (bloom 0→1, 0.5 s). 2.80 hoopoe crest **fans** (fan 0→1, easeOutBack) and settles at 3.10.
- **Camera:** zoom 2.2 → 1.0 (2.30–3.60, easeOutQuint); y −80 tilt. L5 stems rush outward (parallax 1.9).
- **SFX:** 2.50–3.20 a dozen tiny soft "tik" pops (−32 dB); 3.10 hoopoe "hup" ×2, extremely soft (−34 dB), inside the 3.02–3.62 gap.

**3.62–4.58 · "yalnız telezzüz" (gloss 4.00–4.72 'lezzet alma')**
- **Beats:** "yalnız" 3.62: **rack focus**: L1/L2/L4 blur 0→6px, HeroRose crisp, so the rose is isolated. "telezzüz" 4.08 (accent 4.00): a bee lands on the rose with a little dip-and-bounce. A golden sweetness pulse (#FFD98A radial `'lighter'`, 0→0.6→0.35) blooms from the rose, and 3 **fragrance ribbons** (#FFE3F0@0.5, 6px tapered bezier spirals) rise and curl.
- **Camera:** push in, zoom 1.0→1.25 toward (540,820).
- **SFX:** 3.90–4.60 bee buzz, faint and band-passed (−32 dB).

**4.64–5.90 · "veya tenezzüh için değil." (gloss 4.82–6.57 'gezinti')**
- **Beats:** "veya tenezzüh" 4.64–5.34: **the camera strolls**. A lateral dolly follows the winding path (tapered bezier #F3D9B1, edged #E2BE8E) with 3 butterflies flitting ahead of the camera as "strollers"; parallax is strong (L5 passes fast). "için" 5.40: slow down. **"değil" 5.66 (accent 5.58): NEGATION BEAT.** Global time-scale drops to 0.1 over 0.15 s: butterflies and pollen hang mid-air, a single clear ripple ring (#FFFFFF@0.35, 2px) expands from the HeroRose, and saturation dips 10% as a quiet "not just this". At 5.95 time resumes.
- **Camera:** dolly x +600 world (4.64–5.40, easeInOutCubic), then hold. 5.95–6.70 swing back x −600 and push in to the rose (zoom 1.25→2.6).
- **Transition → C (6.40–6.70):** the sun sinks behind the near hill (y 520→980). Sky lerps to C's dusk palette. The rose fills centre frame.
- **Handoff @6.70:** HeroRose screen (540,820), R 260 (scale 2.6), bloom 1, wilt 0; sky #F59E7A / #C9708A / #5A3D6E.
- **SFX:** 4.64 soft air dolly whoosh (−30 dB); 5.66 soft "air suck / time-slow" (−28 dB); 5.95–7.0 breeze through leaves (−30 dB).

---

### C_gul_firak · 6.40–11.80 · "pleasure, then separation and pain"
**Colour script:** dusk #F59E7A → #C9708A → #5A3D6E, lerping by 10.6 to night #2B2A4F → #3E3560 → #1A1830. Accents: rose #E8456F (fading to #8C4A63, then #6B3F4A), petals #F28BA0, rim light #FFB37A, dew #A9D4FF, cold ripple #7FA8FF, filaments #FFD98A. Grade: soft-light #6A3D8A@0.15, rising.
**Composition:** HeroRose R 260 at (540,820); soil and bed silhouette #2A1E2E at y 1120+; distant hills #4B3A66.

**7.04–8.62 · "Çünkü bir zaman lezzet verse,"**
- **Beats:** "Çünkü" 7.04: warm rim light on the right petals (#FFB37A). "bir zaman" 7.36–7.80: the rose's **sundial shadow** (soft polygon on the soil, #1A1428@0.4) rotates 40°, showing that time passes. "lezzet" 7.88 (accent 7.80): sweet golden glow pulses from the rose centre (#FFD98A, 0→0.7→0.4) and fragrance ribbons swirl. "verse" 8.28: the bee lifts off and exits right.
- 8.62–9.18 (gap): **6 attachment filaments** (Filament, #FFD98A, 1.5px, halo) draw from the rose centre down to the bottom-left and bottom-right frame edges (towards "you"), ending at y ≤1180 so they stay out of the band.
- **Camera:** roll 0→−3°, zoom 1.0→1.15.
- **SFX:** 7.88 warm air swell (−30 dB); 8.70 faint filament shimmer (−34 dB).

**9.18–9.72 · "firakıyla" (gloss 9.10–10.36 'ayrılmasıyla')**
- **Beats (signature #2):** from 9.14, the filaments **snap one by one** (6 snaps 9.14–9.62). Each recoils as a spring with a 5-spark burst. On the 3rd snap, the **5 outer petals detach** and are carried by wind up-left and off frame (flutter = rotation + sin scaleX). One **hero petal** stays, hovering at screen y ≈ 900. The stem bends 12°. Exposure −0.25 EV.
- **Camera:** pull back zoom 1.15→1.05; roll to +2°; decaying shake (4px, 0.3 s).
- **Band guard:** petal paths are kept above y 1180 until 10.36.
- **SFX:** 9.14–9.62 six tiny dry fibre snaps (−30 dB, not plucked strings); 9.30 soft gust (−26 dB).

**9.78–11.10 · "birçok zaman elem verir." (gloss 10.46–12.07 'acı')**
- **Beats:** "birçok zaman" 9.78–10.44: **time-lapse**. The sundial shadow spins 3 full turns (easeInCubic), the sky jumps to the night palette, and the rose ages (wilt 0→0.85): colour lerp, petals curl, stem droops 40°. Fallen petals settle on the soil. "elem" 10.54 (accent 10.46): one cold ripple ring (#7FA8FF@0.4) rolls out from the rose base and the rose head **bows**. A dew drop (#A9D4FF, `'lighter'` spec) gathers at the drooping tip. "verir" 10.84: the dew drop falls.
- **Camera:** 10.80–11.80 tracks the **hero petal**, which now falls with the dew: cam.y +900 world, zoom 1.15→1.6. The petal is **locked at screen (540, 880)** while the world scrolls up, so nothing crosses the band.
- **Transition → D (11.50–11.80):** while falling, the petal passes a warm side light. Its colour morphs #F28BA0 → #FFB547 and its shape morphs petal → teardrop **honey drop** (both 128 pts). The background lerps to D plum, and the bowl's rim rises into frame below.
- **Handoff @11.80:** honey drop at (540,880), r 26, #FFB547 core #FFE7A0. Bowl rim top edge entering at y ≈1200 (scrolling up). BG #2A1633 / #4A2346 / #6E3448.
- **SFX:** 10.54 low soft wind sigh (−30 dB); 10.84 single water plink (−30 dB, inside the word); 11.10–12.0 descending air fall-whoosh (−28 dB).

---

### D_tatma · 11.50–16.30 · "it lets you taste, whets the appetite, does not satisfy"
**Colour script:** BG #2A1633 → #4A2346 → #6E3448. Warm key light from the right #FF9D5C@0.3. Honey #FFB547/#FFE7A0. Bowl porcelain #F6F0E6, shade #D9CFC0, Iznik #1F5FA8/#4FA3E0/#3CC6C0/#D9473A, dim pattern state #2A3550. Dark glossy surface #1C1024 with reflection. Grade: soft-light #FF8A5C@0.08.
**Composition:** Iznik Bowl rim ellipse centre (540,780), rx 330, ry 110; body to foot y 1000; surface line y 1000; reflection 1000–1220 (alpha 0.35). There is no gloss in D after 12.07, so the reflection may occupy the band.

**12.00–12.86 · "Sana tattırır,"**
- **Beats:** "Sana" 12.00: the bowl tilts 6° toward camera, as if offered, and the warm key light ramps 0→1. "tattırır" 12.34 (accent 12.26): the **drop lands** in the bowl centre: a 12-droplet splash crown on parabolic arcs, 3 ripple ellipses in rim perspective, and a small honey pool (r 40, `'lighter'` glow). The inner çini pattern **lights up only where the honey touches** (radial reveal mask r 0→120).
- **Camera:** the fall ends at 12.34 with a spring overshoot (12px), then settles.
- **SFX:** 12.34 soft honey "blup" (−28 dB) plus a faint ripple shimmer (−34 dB).

**13.30–14.12 · "iştihanı açar"**
- **Beats:** "iştihanı" 13.30: golden **craving motes** (60 particles) spiral into the bowl like a slow vortex. **"açar" 13.82 (accent 13.74):** the bowl **opens**: rim rx 330→420, depth +30%, the inner çini tulips **unfurl** (petal rotation +25°), and the rim flares with a light sweep. Appetite visibly grows: the bowl is now bigger and emptier around the same tiny pool.
- **Camera:** crane up and push in (13.30–14.30): the rim ellipse ry 110→220 as we look *into* the bowl; zoom 1.0→1.4.
- **SFX:** 13.30 soft ceramic air-resonance swell (filtered noise, −32 dB); 13.82 airy bloom (−30 dB).

**14.60–15.48 · "fakat doyurmaz."**
- **Beats:** "fakat" 14.60: the vortex freezes and the motes hang. **"doyurmaz" 14.96 (accent 14.88):** the honey pool **evaporates** into 20 rising golden wisps that fade by 15.6. The pattern dims back to #2A3550. Faint concentric "hollow" rings travel out to the rim. The huge empty bowl floor dominates the frame.
- **Camera:** slow pull-back zoom 1.4→1.0, crane back down to 3/4 view (15.0–16.0).
- **Transition → E (16.10–16.30) MATCH-MORPH:** the bowl standing on the mirror surface plus its reflection already form a wide-narrow-wide silhouette. A glass outline (#CFF3FF) draws around **bowl + reflection** and the reflection turns solid: **it is an hourglass**. The few remaining golden glints slide to the neck and become the first falling grains. The palette lerps plum → teal.
- **Handoff @16.30:** Hourglass centred (540,1000), total height 640 (680–1320), neck at y 1000; cam zoom → 0.9; BG #0E2433 / #17485A / #2D6E74.
- **SFX:** 14.96 faint hollow room-air echo (−30 dB); 15.6–16.4 crystalline glass-forming shimmer (−30 dB).

---

### E_omur · 16.10–22.50 · "either its life is short or yours"
**Colour script:** BG #0E2433 → #17485A → #2D6E74. Rim light #7FE0D2. Glass #CFF3FF@0.18, highlights #FFFFFF@0.5. Sand #F2C46B/#FFE29A. Mini rose bud #FF6F91, mayfly/butterfly wings #CFF6FF. Kandil brass #C99A4A, oil #E0A040, flame #FFB34D/#FFF4C2, lamp light #FFB34D@0.35. Grade: soft-light #1E5A66@0.12, then darkening to #000000@0.4 at 21.8.

**16.56–18.34 · "Çünkü ya onun ömrü kısa,"**
- **Beats:** "Çünkü" 16.56: sand starts to flow (a stream line of particles plus a growing conical pile in the bottom bulb). "ya onun" 17.14–17.68: a **miniature life** sprouts on the sand surface in the top bulb: a tiny HeroRose bud (R 22) and a small butterfly. The hourglass slides left to x 320. **"ömrü kısa" 17.76–18.34 (accent 18.00):** sand flow ×4. The mini rose blooms and withers within 0.5 s, and the butterfly flutters, fades into particles, and **falls through the neck with the sand**.
- **Camera:** the frame shifts so the hourglass sits on the left third; zoom 0.9→1.05.
- **SFX:** 16.56 continuous soft sand trickle (−34 dB); 18.08 sand rush (−28 dB).

**18.80–20.04 · "ya senin ömrün kısadır."**
- **Beats:** "ya" 18.80: pan right reveals an unlit **Kandil** on a small stand at (780,880). **"senin" 18.98 (accent 18.92):** the kandil **lights** (flame scale 0→1 easeOutBack, light radius 0→380) and warm light floods the right half, throwing long teal-violet shadows. This is "your" life, with no human shown. "ömrün kısadır" 19.32–20.04: the oil level visibly drops in the glass reservoir, the flame shrinks 30% and flickers harder, and the top bulb of the hourglass empties completely at 20.0. Both lives deplete in sync.
- **Camera:** zoom out 1.05→0.92 to frame both: hourglass at (320,1000) and kandil at (780,880).
- **SFX:** 18.98 soft lamp "fwoomp" ignite (−28 dB); 19.6 faint oil sputter (−34 dB).

**20.68–21.79 · "Doymaya kâfi değil."**
- **Beats:** "Doymaya" 20.68: the hourglass **un-morphs back into the Bowl** (reflection detaches) and slides to centre (540,980). The sand inside is only a thin layer. "kâfi" 21.14: a faint fill-gauge ring on the inner wall stops at about 10%. **"değil" 21.55 (accent 21.47):** the last grain falls and stops dead, the kandil flame **gutters to an ember**, and global exposure drops 40%.
- **21.79–22.96 (gap): DARKEST MOMENT.** Near-black frame (#05101A), the faint bowl rim outline, and one ember (#FF7A3D core, r 6, glow 60).
- **Transition → F (22.30–22.50):** the ember **rises** on a slow wobble. At 22.40 it sharpens: circle → hexagonal facet polygon (morph) and turns ruby #FF3D6E. A violet radial glow (#5E2C86) blooms behind it. The camera tilts up following it.
- **Handoff @22.50:** ruby gem at (540,760), r 34; BG #160F38 / #34206B / #5E2C86 at 60%.
- **SFX:** 21.14 soft hollow (−32 dB); 21.55 sand cut to silence; 21.9–22.9 faint ember crackle (−34 dB); 22.30 rising soft shimmer (−30 dB).

---

### F_kiymet · 22.30–28.70 · "high value, short duration: for a lesson (ibret)"
**Colour script:** BG #160F38 → #34206B → #5E2C86. Top spotlight #FFE9A8@0.25. Gold #FFCF5A/#FFE9A8, ruby #FF3D6E/#B0103E, emerald #2EE6A6, sapphire #4C8DFF, amethyst #B47CFF, pearl #FFF6F0. Grade: soft-light #8A4FFF@0.10.

**22.96–24.43 · "Demek kıymeti yüksek,"**
- **Beats:** "Demek" 22.96 (accent 22.88): the ruby flashes and its facets **unfold into the gem HeroRose** (R 180), with 5 petals each made of 3 facet triangles. **"kıymeti" 23.48:** a golden plinth (arabesque-engraved, #FFCF5A body, #B8862E shadow, #FFF3C4 highlight edge) rises from below to carry the gem-rose. **"yüksek" 24.00:** the plinth lifts the rose high (screen y 760→560). 12 golden god-rays (`'lighter'`, #FFE9A8@0.18) rotate slowly behind it, and facet glints twinkle (4-point stars).
- **Camera:** tilt up (cam.y −150), slight low angle (L2 scale 0.97).
- **SFX:** 22.96 crystalline facet glint (−28 dB); 23.48 soft gold slide (−32 dB); 24.00 airy swell (−30 dB).

**24.79–25.84 · "müddeti kısa olan"**
- **Beats:** **"müddeti" 24.78:** a thin **golden life-ring** draws a full 360° around the gem-rose (r 300, 3px, glow). **"kısa" 25.30 (accent 25.22):** the ring **burns down** fast (arc 360°→50° in 0.5 s) with a sparking head. The petal tips shed a few ruby particles that drift down, so even the jewel is transient. "olan" 25.62: settle.
- **Camera:** push in, zoom 1.0→1.08.
- **SFX:** 25.30 short soft fuse fizz (−32 dB).

**26.00–26.75 · "şu tezyinat;" (gloss 26.09–27.93 'süslemeler')**
- **Beats:** **"tezyinat" 26.16 (accent 26.08):** **8 jewel-ornaments pop** in a ring (orbit r 380 around (540,720), so y 340–1100, above the band): jewel tulip, peacock feather, sapphire butterfly, ruby pomegranate, Iznik carnation, hoopoe feather, cherry pair, pearl lily. Each pops with easeOutBack and a 0.06 s stagger. Together they form a **Star8 rosette** (the second star rhyme). The ring orbits at 0.06 rad/s.
- **Camera:** hold, with breathing drift.
- **SFX:** 26.16–26.60 eight soft glass ticks, staggered (−34 dB each).

**27.15–27.91 · "ibret içindir," (signature #3: the crossing)**
- **Beats:** **"ibret" 27.15 (accent 27.08):** the ornaments align into a lens ring and the gem-rose's petals **rotate open like an iris**. "içindir" 27.49: the camera **dives through the rose's centre**. For 0.4 s the scene renders as an 8-wedge **kaleidoscope** of refracting facets (signature chromatic offset), and the light shifts violet → warm ivory.
- **Camera:** zoom 1→12 (27.15–28.40, easeInCubic, then easeOutExpo); roll +8°.
- **Band guard:** kaleidoscope energy is masked to a central circle r 520 around (540,760). The scrim is active until 27.93.
- **Transition → G (28.40–28.70):** exit into calm ivory parchment #F7EEDC with fine paper fibres (procedural thin strokes #E3D3B5@0.3). A small Star8 footnote mark (r 40, #D8B26E, glow #FFE7B0) sits at the centre.
- **Handoff @28.70:** Star8 at (540,760), r 40, open 0; parchment BG.
- **SFX:** 27.15 deep soft whoosh plus kaleidoscope shimmer (−26 dB) → 28.40 soft air pop into near-silence.

---

### G_hasiye · 28.50–37.80 · "footnote: everything's value and fine art, yet short life"
**Colour script:**
- Part 1 parchment: #F7EEDC → #EBD9BB, ink-line #5A2A2F@0.5, star #D8B26E, glow #FFE7B0, elite-red accent #E8A3A0.
- Part 2 macro: #0B1A2A → #10364A → #0F4F5C, iridescent #6FF0FF / #B48CFF / #FF7AD9 / #FFE66D.
- Part 3 frost: #DDEFFF → #A8D4F5 → #6E9CC9, melt #8FDCFF.

**28.93–29.37 · "Hâşiye."**
- **Beats:** **28.93 (accent 28.85):** the footnote **Star8 OPENS**: the squares rotate ±22.5° and expand r 40→420, and girih extension lines draw on (dash offset, 0.8 s, #D8B26E 2px plus glow). This is the bracket that opens the Hâşiye. At the same time, a thin **footnote rule** (like the real book's separator, #5A2A2F@0.4, 1px) draws across from x 140 to x 940 at y 1180.
- **Camera:** zoom 1.0→1.05.
- 29.37–30.23 (gap): the star's interior turns into a recessed **geometric window**.
- **SFX:** 28.93 soft paper turn plus a small "tick" (−28 dB); 29.4–30.2 faint quill-line drawing (−34 dB).

**30.23–31.87 · "Evet, madem her şeyin kıymeti"**
- **Beats:** **"Evet" 30.23:** the window's two geometric shutters part with a soft click and warm light spills out. **"her şeyin" 30.83–31.29:** a **gallery of six natural masterpieces** pops into a 3×2 grid inside the star (cells about 250px, centred (540,760)): swallowtail **butterfly**, **peacock feather**, **snowflake**, **nautilus shell** (spiral of chambers #F2D6C2/#C98A6A), **cut pomegranate**, **tulip**. Stagger 0.08 s. **"kıymeti" 31.41:** each gets a soft gold halo and a tiny gold Star8 "seal" beside it.
- **Camera:** drift down 40px; zoom 1.05→1.1 toward the butterfly cell (top-left, approx. (370,620)).
- **SFX:** 30.23 soft wooden shutter click (−30 dB); 30.83 six tiny pops (−34 dB).

**32.03–33.05 · "ve dekaik-ı sanatı" (gloss 32.07–34.16 'sanat incelikleri')**
- **Beats (signature #4, infinite macro zoom):** **"dekaik-ı" 32.15 (accent 32.08):** the camera zooms into the butterfly wing on a log-scale zoom (z 1→40 over 32.15–33.40). Three nested layers crossfade at z=4 and z=12. Wing → **rows of overlapping scales** (rounded tiles, each with an angle-based iridescent gradient #6FF0FF→#B48CFF) → **ridges** on one scale (fine parallel strokes) → the ridges resolve into a glowing **8-fold girih tessellation**. **"sanatı" 32.67:** light travels along the girih lines (`'lighter'` gradient sweep, #FFE66D head).
- **Band guard:** the zoom centre is locked at screen (540,700); scrim on.
- **SFX:** 32.15 macro zoom whoosh, filtered noise rising (−28 dB); 32.67 glassy shimmer sweep (−32 dB).

**33.23–35.13 · "gayet yüksek ve güzel olduğu halde"**
- **Beats:** **"gayet yüksek" 33.23–33.97:** the tessellation **rises in relief** (3 stacked offset copies give pseudo-extrusion, top face brighter) and blooms outward with radial symmetry. The central 8-fold rosette brightens. **"güzel" 34.17 (accent 34.10):** a hue wave sweeps across (#6FF0FF → #B48CFF → #FF7AD9 → #FFE66D) with glints, and bloom rises to 0.7. **"olduğu halde" 34.49–35.13:** fast reverse log-zoom (z 40→1) back out to the gallery, all six items glistening. A cold tint creeps in from the left (#A8D4F5).
- **SFX:** 34.17 soft bloom (−30 dB); 34.5 reverse whoosh (−30 dB).

**35.49–37.17 · "müddeti kısa, ömrü azdır."**
- **Beats:** **"müddeti kısa" 35.49–36.23:** quick push to the **snowflake**, which **melts**: its arms retract (melt 0→1 morph → droplet, #8FDCFF) and the droplet evaporates into mist wisps. At the same time, the butterfly's scales scatter as glitter dust, the tulip drops petals, and the pomegranate seeds dull. **"ömrü azdır" 36.49–37.17:** each gold halo shrinks to a dot and **blinks out** like a candle, staggered 0.12 s. The last one ("azdır" 36.81) is the peacock feather, which fades into a thin outline.
- 37.17–38.03 (gap): only the star window remains, and **each vanished item leaves a ghost outline** (1.5px #FFF6E0@0.6). They were *images*.
- **Camera:** pull back zoom 1.1→0.9.
- **Transition → H (37.60–37.80):** the star window's girih lattice **becomes the wooden kafes lattice** of a shop window (stroke colour #D8B26E → #6E4A32, thickness 2→14px). The camera pulls back *through* it (the lattice passes the camera as L5 foreground). The ghost outlines fly to their places on shelves.
- **Handoff @37.80:** lattice at the frame edges (L5 scale 2.4 receding); vitrine arch spanning x 140–940, y 300–1150; BG #241634 / #4A2A45 / #6E3B3B.
- **SFX:** 35.49 soft frost crackle (−30 dB) → 36.0 single melt drip (−32 dB); 36.49–37.17 five soft "puff" outs (−34 dB); 37.6 soft wood creak plus lantern hiss ambient begins (−34 dB). No crowd.

---

### H_numune · 37.60–47.80 · "samples; images of other things; they turn the customers' gazes to their originals"
**Colour script:** BG #241634 → #4A2A45 → #6E3B3B. Walls #3A2238/#5A3346, lattice wood #6E4A32/#3A2416, shelves brass #C99A4A. Lanterns #FFAE42, core #FFE3A3, pierced-pattern light dots on walls #FFAE42@0.25. Glass #BFE8FF@0.12–0.22, spec #FFFFFF. Originals #FFF6E0 with #FFD27A halo. Gaze filaments #FFE3A3@0.5. Cobbles #2A1A26 (foot band). Grade: soft-light #FF9A4A@0.10.
**Composition:** an Ottoman pointed-arch vitrine (x 140–940, y 300–1150) with lattice above y 300–460. **3 shelves × 3 bell jars** (shelf y 620, 840, 1060). The back of the vitrine is open glass onto a far luminous haze (L1). 3 hanging pierced lanterns at the top (y 120–260), swinging with pendulum motion at 0.6 Hz and ±3°.

**38.03–39.63 · "Demek, o şeyler numunelerdir,"**
- **Beats:** "Demek" 38.03: the lattice finishes rushing past and the vitrine is revealed. **"o şeyler" 38.41–38.85:** the ghost outlines **fill in** as small solid samples (mini HeroRose, pomegranate, butterfly, tulip, peacock feather, nautilus, snowflake-crystal, carnation, cherry pair). A bell jar descends over each with a spring bounce, staggered 0.07 s. **"numunelerdir" 38.91 (accent 38.84):** a specular highlight band sweeps left → right across all 9 jars (0.5 s). Blank sample tags on strings swing once. The lanterns light in sequence 39.0–39.5.
- **Camera:** push in, zoom 1.0→1.1.
- **SFX:** 38.03 lattice pass-whoosh (−28 dB); 38.41–38.85 nine soft glass "tuk" set-downs (−34 dB); 38.91 glass glint sweep (−32 dB).

**40.15–42.07 · "başka şeylerin suretleri hükmündedirler." (gloss 40.79–42.67 'görüntüleri')**
- **Beats:** **"başka şeylerin" 40.15–40.85:** beyond the vitrine's back glass, in the far plane (L1, p 0.2), **immense luminous ORIGINALS** fade in as soft outlines with inner glow (alpha 0.25, blur 8px): a giant rose, a pomegranate tree, a huge butterfly, a tulip grove. **"suretleri" 40.87 (accent 40.80):** each jar sample shows that it is the original's image. Dotted **projection lines** (#FFE3A3@0.4, dash 4/8, flowing) connect each sample's contour to its original's contour, like a projection diagram. Each sample uses the **identical path** to its original at scale 0.12, which the later match-cut needs. **"hükmündedirler" 41.39–42.07:** the lines solidify and the originals brighten (0.25→0.4).
- **Camera:** slow tilt up 60px, hinting upward.
- 42.07–43.07 (gap): the originals breathe (scale ±1.5%) and the lanterns sway.
- **SFX:** 40.87 airy projection hum (non-tonal, −34 dB).

**43.07–44.71 · "Ve madem müşterilerin nazarlarını," (gloss 44.03–45.91 'bakışlarını')**
- **Beats:** the "customers" are implied, off-screen, at the street sides. **"müşterilerin" 43.49 (accent 43.42):** **12 gaze filaments** enter from the left and right frame edges at y 980–1180 (never from below, so the band stays clean). They glide in with dash flow and **land on the jars**. Each hit jar glows brighter and shows a small impact sparkle. **"nazarlarını" 44.11:** the filaments narrow and focus (width 2.5→1.5px, alpha up). The samples hold everyone's attention.
- **Camera:** hold, slight zoom 1.1→1.12.
- **SFX:** 43.49 faint filament shimmer ticks (−34 dB).

**44.83–47.27 · "asıllarına çeviriyorlar gibi bir vaziyet vardır." (signature #5)**
- **Beats:** **"asıllarına" 44.83:** each jar's glass acts as a **prism**: the incoming filament splits into a 4-hair spectrum (#FF6F91 / #FFD27A / #6FF0FF / #B48CFF). **"çeviriyorlar" 45.41 (accent 45.33):** **all beams turn upward at once**. Bezier control points rotate 90°, spring-eased over 0.6 s. The spectra recombine into gold and shoot up to each sample's own original in the far plane. The originals **ignite** (alpha 0.4→0.85, bloom 0.8). **"gibi bir vaziyet vardır" 46.09–47.27:** the camera starts a **big tilt-up** following the beams and the vitrine slides down out of frame. The beams converge high above into one point, where a tall **luminous Ottoman Gate** (pointed arch with a muqarnas band, stroke #FFF6E0, inner gradient #FFFFFF→transparent) forms, centred (540,520).
- **Camera:** cam.y −1400 world (46.0–48.2, easeInOutCubic); zoom 1.12→1.3 into the gate.
- **Band guard:** the scrim is active until 45.91, and the beams turn up from y ≤1180.
- **Transition → I (47.60–47.80):** the camera passes **through the gate**: the arch outline scales past the frame and a white bloom flash fills the frame (#FFFDF7, 0.2 s).
- **Handoff @47.80:** full-frame #FFFDF7 bloom at 0.9, decaying; I vista underneath at blur 14px.
- **SFX:** 45.41 glassy refraction swoosh rising (−26 dB); 46.0–47.8 rising air swell (−28 dB).

---

### I_cennet · 47.60–61.90 · "the samples of Paradise's bounties, prepared by the All-Merciful for His beloved servants"
**Colour script:** sky #FFFDF7 → #FFF1D6 (35%) → #E8F7EE (70%) → #BDEBD8. Terraced gardens #A6E3C9 / #6FD1A9 / #39C98C. The band region uses deeper greens #2E7F62 → #1F5E4C so text reads. Pavilions (köşk) marble #FFFBF3 with gold trims #E6B85C. Rivers: water #8FDCFF, milk #FFFDF5, honey #FFC15E. Light rain #FFFFFF with halo #FFE7A8. Roses #FF6F91/#FF9DB5, pomegranates #E8384F, gold #FFD27A, emerald #2FBF7F, love-glow #FFC7D6. Grade: soft-light #FFE7B0@0.10. **Glosses use the bright-scene variant here.**
**Composition:** palace and domes far at y 300–500; terraces cascade 500–1150 with three rivers flowing down in S-curves toward camera; marble terrace (mid-ground) at y 900–1100; foreground flowers at the foot band. **No beings anywhere. Light is sourceless and comes from above.**

**47.89–49.55 · "Öyle ise elbette"**
- **Beats:** 47.6–47.89: the white flash decays. **"Öyle ise" 47.89–48.39:** the vista emerges, still soft-focused (blur 14→3px), with rivers glinting. **"elbette" 49.11 (accent 49.04):** a certainty beat: everything **snaps into crisp focus** (blur 3→0 in 0.12 s), one soft clear ring pulse (#FFFFFF@0.3) expands from the centre, and ambient radiance rises.
- **Camera:** crane down from gate height (cam.y +400, zoom 1.3→1.0, 47.8–49.6, easeOutQuint).
- **SFX:** 47.6 soft whiteout air (−28 dB); 48.0 onward, gentle fountain/stream ambient (−36 dB, continuous); 49.11 soft "settle" (−32 dB).

**49.61–51.33 · "şu dünyadaki o çeşit tezyinat," (gloss 50.71–51.89 'süslemeler')**
- **Beats:** **"şu dünyadaki" 49.77:** a single **bell jar** (from H, the HeroRose jar) floats into the left-centre foreground (360,860), L4. Inside it is a **miniature of the B garden** (GardenRig scale 0.18, B palette): hills, path, rose. The vista behind blurs to 4px. **"o çeşit tezyinat" 50.41–51.33:** **B's bloom-wave replays in miniature** inside the jar, a small callback to signature #1.
- **Camera:** push toward the jar, zoom 1.0→1.12, cam.x −60.
- **SFX:** 50.41 tiny bloom pops inside the jar (−36 dB).

**51.89–53.73 · "bir Rahman-ı Rahîm'in rahmetiyle," (gloss 51.99–54.57, two lines: 'sonsuz merhametli ve şefkatli / olan Allah'ın') (signature #6)**
- **Beats:** **"Rahman-ı" 52.07 (accent 52.00):** the top of the frame **brightens from above**, with no source and no disc (a vertical gradient #FFFFFF → transparent over the top 40%). A gentle **rain of light** begins: up to 400 slender drops, 18–40px long, slight 6° slant, slow fall at 380 px/s, `'lighter'`. **"Rahîm'in" 52.55:** the rain thickens a little and warms (#FFE7A8 halos). Where drops touch terraces and the jar, **small flowers bloom** (FlowerSet pop at 0.4 s) and the rivers sparkle. **"rahmetiyle" 53.09:** the whole vista gains +15% exposure and 5 soft vertical light shafts.
- **Camera:** **reverent stillness**: only a slow upward drift (cam.y −40 over 2 s), no zoom changes. This restraint is deliberate.
- **Band guard:** rain density in the band is 20%, and drops there are blurred and slowed. Scrim on (bright variant).
- **SFX:** 52.07–54.5 extremely gentle, airy light-rain hiss (−34 dB), kept under the voice.

**54.27–55.75 · "sevdiği ibadına hazırladığı" (gloss 54.67–56.07 'kullarına')**
- **Beats:** **"sevdiği" 54.27:** a warm rose-gold glow wave (#FFC7D6 → #FFD27A, radial `'lighter'` 0→0.4→0.2) radiates from the centre, showing love as warmth (no heart icons). **"ibadına" 54.75 (accent 54.68):** on the marble terrace (y 900–1100), **7 seccades unroll** one after another (stagger 0.09 s, cylinder-roll path). They alternate #A8323E / #2F7D5B / #2E5FA3 with gold mihrab motifs, all facing the same direction. **"hazırladığı" 55.21–55.75:** above each seccade a **Kandil lights** in sequence (the E kandil, here lit forever). Low tables appear with trays of pomegranates and grapes. Everything is ready and waiting, with nobody shown.
- **Camera:** lateral dolly right along the terrace (cam.x +260) with parallax (columns L4 pass faster).
- **SFX:** 54.75 seven soft cloth-unroll swishes (−34 dB); 55.21 tiny lamp-ignite puffs (−36 dB).

**56.25–57.87 · "niam-ı cennetin numuneleridir," (gloss 56.17–58.34 'cennet nimetlerinin') (signature #7, sample → original)**
- **Beats:** **"niam-ı" 56.25:** the bounties appear at grand scale in the mid-plane: the **paradise HeroRose** (R 420) at (540,700), a pomegranate tree heavy with fruit, gold grape clusters. **"cennetin" 56.65:** the **Iznik Bowl reappears, overflowing**: honey-light streams pour over its rim into a river. This answers "doyurmaz". **"numuneleridir" 57.19 (accent 57.12):** the jar with the world's mini rose glides in front of the giant rose and the camera aligns so the **two silhouettes are concentric** (same 128-pt path). The mini rose scales 0.12→1 while crossfading into the giant one. A gold contour shimmer traces the shared outline: **the sample becomes its original.** The jar glass dissolves into sparkles.
- **Camera:** push in and align (cam to the rose centre, zoom 1.0→1.15), then hold.
- **SFX:** 56.65 gentle honey pour (−34 dB); 57.19 soft shimmering match swell (−28 dB).

**57.95–58.57 · "denilebilir" → 59.07–59.69 · "ve denilir" → 59.91–60.59 · "ve öyledir." (signature #8, a 3-step crescendo)**
- **Ring 1, "denilebilir" 57.95 (accent 57.88):** a thin, faint **Star8 ring** of light (r 260, 1.5px, alpha 0.35) draws around the giant rose; exposure +5%.
- **Ring 2, "denilir" 59.23:** a thicker, brighter ring (r 420, 3px, alpha 0.6). Ring 1 rotates 22.5° and **locks** into geometric alignment with ring 2 with a micro-snap; exposure +10%.
- **Ring 3, "öyledir" 60.15 (accent 60.08):** a full radiant **8-fold rosette** (r 600, filled girih with `'lighter'` gold) and a **bloom flash** (bloom 0.9, exposure +20%) at the **brightest frame of the film**. All bounties shine, and light-petals burst outward.
- **Camera:** a small "breath" on each step: zoom 1.15→1.08→1.0→0.92, each eased over 0.35 s.
- **Band:** no gloss is active from 58.34 to 63.59, so ring 3 may reach into the band.
- **Transition → J (60.59–61.90): the footnote closes.** 60.6–61.3: the rosette **contracts back into the small footnote Star8** (r 600→40), mirroring the opening at 28.93, while the paradise vista fades to white and then to a dawn tone. 61.3–61.9: the star **descends** to the horizon line (y 1020) and morphs star → circle into **J's rising dawn sun**, as J's garden fades in.
- **Handoff @61.90:** sun disc (540,1020), r 70, #FFF4D6 with glow #FFD98A r 300; J sky gradient at 80%.
- **SFX:** three soft **ascending light swells**, airy and non-melodic, at 57.95 (−32 dB), 59.23 (−29 dB) and 60.15 (−26 dB). The third has a soft "whoomf". 60.6–61.3 reverse swell into near-silence; 61.30 one soft paper "close" tick as the footnote ends (−30 dB).

---

### J_gayeler · 61.60–68.60 · "for gratitude, encouragement toward the everlasting originals, and other most sublime purposes"
**Colour script:** dawn sky #2A2148 → #6B3F72 (30%) → #E58A78 (55%) → #FFC98F (70%) → horizon #FFE7B5. Sun #FFF4D6, glow #FFD98A. GardenRig recoloured warm: hills #3F7F6E/#2C5E58, flowers use the B palette at +10% warmth. Mosque silhouette #2A2140 with green dome #3E8E5E and rim #8FE3A8. Light path #FFE7B0 → #FFFFFF. Gold #FFD98A. Grade: soft-light #FF9A6A@0.12.
**Composition:** B's garden returns (bookend). Horizon y 1020; sun on the horizon at x 540; **Masjid an-Nabawi silhouette** small on the horizon at (800,1010), width 220; revived HeroRose at (380,1060); the garden path from B winds from the foreground up to the mid-ground (540,1120).

**62.45–63.25 · "şükür içindir,"**
- **Beats:** **"şükür" 62.45 (accent 62.38):** a gratitude wave. All flowers **turn toward the sun and gently bow** (stems rotate +12° toward the sun, flower heads dip), rippling outward from the sun by distance. The grass bends with them, like a collective prostration of the garden with no figures. The revived HeroRose (wilt 0, fresh dew #FFE7B5 glints) bows too. The mosque's green dome catches first light (rim glow) and a long thin sun shaft extends across the garden.
- **Camera:** slow push in from wide, zoom 0.9→1.0.
- **SFX:** 61.95 single faint lark trill, very distant (−38 dB, inside the gap); 62.45 soft rustle wave (−32 dB).

**63.67–65.51 · "usûl-ü daimîsine teşvik içindir." (gloss 63.59–65.72 'daimî asıllarına')**
- **Beats:** **"usûl-ü daimîsine" 63.67–64.67:** high in the dawn sky (y 200–520), the **everlasting originals** reappear as faint luminous outlines in the clouds (the H/I outlines at alpha 0.25: giant rose, pomegranate tree). The **garden path lifts**: B's path extends from (540,1120) and rises as a glowing ribbon bridge (bezier ribbon, gradient #FFE7B0 → #FFFFFF, draw-on 0.9 s) curving up to the originals. **"teşvik" 64.75 (accent 64.68):** a warm breeze pushes. Petals, pollen and 3 butterflies **lift off and travel up the light path** (particles follow the path parameter with stagger). The HeroRose's petals rise too: **firak inverted** (signature rhyme with 9.18). The grass waves toward the path.
- **Camera:** tilt up following the petals (cam.y −500, 64.7–66.2, easeInOutCubic).
- **Band guard:** the path starts at y 1120 and all particles move upward, away from the band. Scrim on.
- **SFX:** 63.67 soft rising shimmer as the path draws (−32 dB); 64.75 warm breeze whoosh (−28 dB).

**66.19–68.41 · "Başka gayet ulvi gayeler içindir." (signature #9, the finale reveal)**
- **Beats:**
  - **"Başka" 66.19:** the camera keeps rising and **cranes over to a top-down view**. Garden layers compress (scaleY 1→0.3, fading) while a **plan-view layer** fades in. From above, the garden's beds, paths and water channels form a vast **8-fold charbagh rosette** (Star8 girih, centre (540,800), r 480): the hidden higher order.
  - **"gayet ulvi" 66.79–67.45:** the pattern lights up **line by line from the centre outward** (gold #FFD98A draw-on, `'lighter'`) and rotates slowly (0.04 rad/s). It then **tessellates outward**: the rosette becomes one tile in an endless pattern (scale out 1→0.45).
  - **"gayeler" 67.61 (accent 67.54):** a ring of **7 surrounding rosettes** blooms, each tinted with one sequence's key colour: B #FF4F7B, D #FFB547, E #7FE0D2, F #B47CFF, G #6FF0FF, H #FFAE42, I #2FBF7F. This is the film's colour script recapped as "many purposes".
  - **"içindir" 68.05:** everything **converges into the central rosette**, which flares to ivory #FFF6E6.
- **Camera:** crane/tilt (66.19–67.0), then zoom out 1→0.45 (67.0–67.9), then fast push to the centre 0.45→3.0 (68.0–68.5, easeInCubic).
- **Transition → K (68.10–68.60):** ivory flare → crossfade (radial mask) into the Blender **glowing page**. For 0.3 s the rosette's gold lines remain faintly visible and morph into horizontal **ink text lines** (#5A2A2F), the reverse of A's ink → stem morph.
- **Handoff @68.60:** full ivory #FFF6E6 at 0.8, decaying over the Blender page glow; 14 ink-line overlays at alpha 0.3 → 0.
- **SFX:** 66.19 big gentle air lift (−28 dB); 66.79–67.6 soft line-draw shimmer (−34 dB); 68.05 soft bloom swell into K (−26 dB).

---

### K_kitap_kapanis · 68.10–72.41 (Blender photoreal outro plus canvas overlay and end card)
**Colour script:** as A. Walnut #1E120C / #3A2416 / #5C3A24; books #EBA9A4 / #F6CFCB / #C98580; gilt #D8B26E; end-card ivory #FFF4E8, sub #F2D9C8.
**Blender:** pull back from the glowing page while the book closes; end on the closed book on the rahle with other light-red volumes behind (soft DOF).

- **68.10–68.60:** the J→K glow crossfade (above).
- **68.6–70.6 · canvas atmospherics:** **8 golden motes** (rhyming with A) drift out of the closing pages and settle one by one onto the gilt cover, each absorbed with a tiny flash (69.6–70.6, stagger 0.12 s). The sunbeam and dust motes from A return at 0.7 alpha.
- **70.2–70.9 · end card (lower band, 64–82%):**
  - Line 1 "**Risale-i Nur**": Cinzel 600, 66px, tracking 0.14em, #FFF4E8, baseline y 1360.
  - Gold hairline #D8B26E 1.5px, width 360, y 1392, draws from the centre at 70.4.
  - Line 2 "**Sözler · Onuncu Söz · 81. Sayfa**": Cormorant Garamond 500 italic, 46px, #F2D9C8, baseline y 1452.
  - Shadow rgba(20,10,8,0.6) blur 20 for legibility over walnut.
  - In-animation: opacity 0→1, letter-spacing 0.30em→0.14em, blur 6→0, y +10→0, 0.7 s.
- **70.9–72.41:** hold. Breathing drift only, with grain and vignette deepening slightly (0.32→0.40) over the last 0.5 s. No fade to black (end on the book).
- **SFX:** 68.6 soft page flutter (−30 dB); ~69.8 (synced to the Blender close) soft leather book-close thud (−24 dB); 70.4 gentle air settle (−34 dB); then room tone to the end.

---

## 3. HANDOFF CONTRACTS (overlap zones, for both developers to match)

| Boundary | Overlap | Shared element at handoff end | Screen position / scale | Palette at handoff end |
|---|---|---|---|---|
| A→B | 2.30–2.70 | page glow = sun; 14 ink lines → stems | glow centre (540,960) → sun (760,520) | whiteout #FFF6E6 → B sky |
| B→C | 6.40–6.70 | HeroRose bloom 1 | (540,820), R 260 | #F59E7A / #C9708A / #5A3D6E |
| C→D | 11.50–11.80 | hero petal → honey drop (128-pt morph) | locked (540,880), r 26 | #2A1633 / #4A2346 / #6E3448 |
| D→E | 16.10–16.30 | bowl + reflection → hourglass | neck (540,1000), h 640, zoom 0.9 | #0E2433 / #17485A / #2D6E74 |
| E→F | 22.30–22.50 | kandil ember → ruby gem | (540,760), r 34 | #160F38 / #34206B / #5E2C86 @60% |
| F→G | 28.50–28.70 | dive exit; Star8 footnote mark | (540,760), r 40 | parchment #F7EEDC / #EBD9BB |
| G→H | 37.60–37.80 | girih window → kafes lattice; ghost outlines → jars | lattice at L5 scale 2.4; vitrine x 140–940, y 300–1150 | #241634 / #4A2A45 / #6E3B3B |
| H→I | 47.60–47.80 | luminous gate → white flash | gate past frame | #FFFDF7 flash 0.9 |
| I→J | 61.60–61.90 | footnote Star8 → dawn sun | (540,1020), r 70 | J dawn gradient @80% |
| J→K | 68.10–68.60 | central rosette flare → page glow; gold lines → ink lines | full frame | ivory #FFF6E6 → Blender |

---

## 4. SIGNATURE MOMENTS (the "wow" list, all voice-locked)
1. **2.44 "tezyinat":** the page's ink lines become stems and 180 flowers bloom in a radial wave.
2. **5.66 "değil":** time freezes mid-stroll; one ripple says "not just this".
3. **9.14–9.62 "firakıyla":** attachment filaments snap one by one and the petals tear away.
4. **11.1–12.34:** a continuous fall in which the petal morphs into a honey drop and lands at "tattırır".
5. **13.82 / 14.96:** the bowl widens with appetite, then the honey evaporates and leaves it empty.
6. **16.1–16.3:** the bowl and its reflection *are* the hourglass.
7. **21.8:** the darkest frame, one ember, which rises and becomes a ruby.
8. **27.15 "ibret":** the camera crosses through the gem-rose in a kaleidoscope dive.
9. **28.93 "Hâşiye":** the footnote star opens like a geometric window.
10. **32.15 "dekaik-ı":** infinite macro zoom from wing to scales to ridges to girih.
11. **45.41 "çeviriyorlar":** every gaze bends upward through prisms to the originals.
12. **52.07 "Rahman-ı Rahîm'in":** sourceless rain of light; flowers bloom where it falls.
13. **57.19 "numuneleridir":** the world's jar-rose aligns with and becomes the paradise rose.
14. **57.95 / 59.23 / 60.15:** the three-ring crescendo of certainty, peaking at the brightest frame.
15. **60.6–61.9:** the footnote star closes and sets as the dawn sun.
16. **64.75 "teşvik":** petals rise along a light path (firak reversed).
17. **66.19–68.05 "ulvi gayeler":** the top-down reveal shows the garden is a vast 8-fold rosette; it tessellates, recaps the film's colours, and collapses into the glowing page.