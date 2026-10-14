# Production brief — "Ahlâk Mu'cizesi" (vertical 9:16 short, 2:04.65)

A narrated Turkish text (Risale-i Nur theme: the Prophet's ﷺ sublime character as a miracle) becomes a
**Kurzgesagt-format explainer** — every sentence of the voice-over is mirrored, at that very moment, by a
dynamic visual metaphor + on-screen keyword typography — rendered in a **Pixar / Toy Story-like 3D look**.
Everything is made **in code** (Three.js scenes rendered frame-by-frame in headless Chromium). The user explicitly
asked: do NOT use paid/external generators (ElevenLabs, Higgsfield, image/video AI…). Build everything procedurally.
No downloads of 3D models / images. Allowed assets already in repo: fonts (`assets/fonts`), CC0 HDRIs for lighting (`assets/hdri`).

## 1. Non-negotiable content rules (religious sensitivity)
1. **Never depict the Prophet ﷺ in any form**: no figure, silhouette, shadow, hand, foot, footprint, face, back view,
   POV body, "figure of light", or anything that stands in for his body. Represent him only through places/objects/
   light/text (e.g. Medina's Green Dome, a Hilye-i Şerif calligraphy panel, an entrusted chest, a rock that shelters).
2. **Do not depict Hz. Ali or any Companion / family member** either (same rules). Use symbols (e.g. the Zülfikar sword).
3. **No human figures at all** in any scene (also keeps quality high — procedural humans look bad). Show
   places, objects, nature, light, books, desks. Anonymous crowds are represented by lights/lanterns/dots, never bodies.
4. **No fake Arabic.** Never draw pseudo-Arabic squiggles. If Arabic appears it must be real text rendered with the
   `Amiri` font (canvas `fillText`, browser shapes it correctly), using exactly the strings given in this brief.
   Never show Qur'anic text on an open Mushaf. Mushaf covers: geometric gold tooling only (see `MODELS.mushaf`).
5. **Respect**: sacred objects (Mushaf, Kaaba, Green Dome, Hilye) are framed with dignity — never on the floor
   carelessly, never cropped awkwardly, never used as a joke; no comedic animation on them.
6. Historical plausibility: 7th-century Hejaz scenes = mudbrick/stone flat-roof houses, clay oil lamps, palm trees,
   leather, wood, brass, linen; no modern buildings, no electric lights. Carlyle (London 1840s) and Gibbon (Lausanne 1780s)
   scenes: period-correct candles/oil lamps, quills, leather books, wooden desks.
7. **"Realistic, not fantasy"** (user's words): only real-world objects and physically-motivated light (sun, moon,
   flame, lamp). No magic glows from nowhere, no runes, no floating symbols, no fantasy creatures. Visual metaphors are
   fine if built from real things (water drops & ocean, a rock in a storm, a mountain summit, lamps, scales…).
   Kurzgesagt-style 2D overlays (labels, counters, callout lines) are allowed — they are the "explainer" layer.

## 2. Look (the bar: Pixar feature film + Kurzgesagt clarity)
- **Shapes**: every hard edge softened (RoundedBoxGeometry `MODELS.rbox`, lathe profiles, extrude with bevel).
  Slight hand-made irregularity (tiny rotation/scale jitter, sag, worn edges). Appealing chunky proportions.
- **Materials**: MeshPhysicalMaterial; sheen for fabric/leather, clearcoat for polished wood, subtle procedural
  normal/roughness maps (`TEX.*`). Rich, warm, harmonious palette; no pure black/white; saturated but tasteful.
- **Lighting**: warm key with soft shadows + cool fill (HDRI env at 0.15–0.8 intensity + hemisphere) + strong rim/back
  light to separate silhouettes. Practical lights (flames) get a glow sprite. Atmospheric fog/haze for depth.
  Light shafts only where a real source justifies them (window, dawn sun).
- **Camera**: ALWAYS moving (slow dolly/crane/orbit, eased; subtle `shake`), vertical 9:16 composition, subject in the
  middle third, shallow depth-of-field on hero objects (`post.dof`). FOV 30–45.
- **Animation**: anticipation + overshoot (`ease.outBack`), secondary motion (sway, settle, dust puff on landing),
  nothing linear or static. A significant visual change at least every ~1.5–3 s (new element, reveal, move, cut).
- **Kurzgesagt layer**: keyword typography that lands exactly on the spoken word (`ctx.wordTime`), counters, callout
  lines, location tags, simple diagrams. Fonts: `Nunito` (900/800/600) for labels, `Lora` italic for quotes,
  `Playfair Display`/`Cinzel` for historical titles, `Amiri` for Arabic. Keep text short, big, legible on a phone.
- **Post**: per-scene grade (`post.grade`), bloom on emissives, vignette, grain (defaults are fine; tune per mood).

## 3. Frame layout (1080×1920)
- Scene text must stay inside **x 80…1000, y 230…1330**. The band **y > 1380 is reserved** for the global subtitles
  and YouTube Shorts UI (bottom ~25%). The right edge x > 960 between y 1000–1700 is covered by Shorts buttons.
- Global word-by-word subtitles are added later by the assembler — do NOT add subtitles yourself.

## 4. Engine API (read the source; it is short)
- Scene file: `scenes/sNN.js` exporting `default { post?, async setup(ctx), update(t, ctx) }`.
  `t` = LOCAL seconds since scene start (scene window from `data/timeline.json`). The final clip is rendered from
  `t = -0.5` to `dur + 0.5` (handles for cross-fades) — make sure the scene looks right there too (no pops/blank frames).
- `ctx`: `THREE, scene, camera, renderer, W, H, ui, post, U (util), TEX, ENV, MODELS, FX, dur, words,`
  `wordTime(text, n=0)` (local start time of the n-th word in this scene starting with `text`, Turkish-normalized),
  `wordEnd(text,n)`, `loadHDR(name)`, `rng(seed)`, `setPost(obj)`.
- `engine/lib/util.js`: `ease.*`, `prog(t,t0,t1,ease)`, `kf(t, [[t0,v0],[t1,v1]…])`, `cameraRig(camera,{pos,look,t0,t1,ease,shake,fov})`,
  `rng`, `noise1`, `fbm1`, `shake`, `smoothstep`, `lerp`, `clamp`.
- `engine/lib/textures.js`: tileable procedural textures `sand, plaster, stone, wood, leather, parchment, fabric,
  brushedMetal, noiseTex, softDot, drawTexture(w,h,draw2d), gradientTex`.
- `engine/lib/env.js`: `loadHDR` (HDRIs: kiara_1_dawn, goegap_road, qwantani_dusk_2_puresky, kloppenheim_02_puresky,
  satara_night_no_lamps, fireplace, old_hall, kiara_interior, qwantani_sunset_puresky, kloofendal_48d_partly_cloudy_puresky),
  `skyDome({...})` (gradient sky, sun glow, stars, clouds), `sunLight`, `pointLight`, `flicker`.
- `engine/lib/fx.js`: `particles` (dust motes/embers), `lightShaft`, `flame`, `glow`, `dustClouds`, `ocean` (waves +
  ripple impacts via uniforms `ripples/ripples2`).
- `engine/lib/models.js`: `MAT.*` materials, `rbox`, `lathe`, `candle`, `oilLamp`, `book`, `openBook`, `rahle`, `mushaf`,
  `desk`, `inkwell` (with quill), `dunes` (heightfield with `userData.heightAt(x,z)`), `palm`, `house`, `shadowAll`.
- `engine/ui.js` (overlay, immediate mode — call every frame from `update`): `ui.text(str,{t,t0,t1,x,y,size,weight,family,
  color,anim:'pop'|'fade'|'rise'|'type'|'wipe',bg,letterSpacing,maxWidth})`, `ui.pill`, `ui.callout(str,{anchor:Vector3|[x,y],to:[x,y]})`,
  `ui.counter({from,to,t0,t1,format})`, `ui.quote(text, author, {...})`, `ui.underline`, `ui.wash`, `ui.project(v3)`, raw `ui.ctx` (2D canvas).
- Objects with `userData.uniforms.time` get time automatically; `userData.update(t,ctx)` is called every frame;
  `userData.yBillboard` faces the camera around Y; `userData.noDepth` excludes from the DOF depth pass.
- Determinism: never use `Math.random()`/`Date` — use `U.rng(seed)`; everything must be a pure function of `t`.
- **Do not edit shared engine files** (`engine/*.js`, `engine/lib/*.js`, `tools/*`, `index.html`, `data/*`). Put
  helpers inside your scene file, or in a new file `engine/lib/extra_<yourGroup>.js`. If you find an engine bug,
  work around it and describe it in your report.
- `scenes/s01.js` is a complete reference scene (lamp field → Mushaf). Read it first.

## 5. Rendering / checking your work
- Stills + contact sheet: `node tools/render.mjs --scene sNN --preview 0,1.2,2.4,3.6,5 --scale 0.5`
  → `out/preview/sNN_sheet.jpg` (view it with the Read tool!) and full-size frames in `out/preview/sNN/`.
  Use `--scale 0.85` (final quality) for the last checks; view a full-size frame too.
- Motion check: sample many close times (e.g. every 0.25 s) at `--scale 0.4` and view the sheet (`--cols 8`).
- Performance budget (final render uses `--scale 0.85`): aim ≤ 2.0 s/frame measured alone (other agents render in
  parallel, so measured times will look higher — report what you see). Prefer: 1 shadow-casting light (2048 map max),
  ≤ 4 point lights, InstancedMesh for repeats, textures ≤ 1024², build geometry once in setup (never per frame),
  setup < 30 s, triangles < 1.5 M.
- Iterate: build → render sheet → **look critically** (Read the image) → fix → repeat. At least 3 visual iterations per
  scene. Judge against: Pixar look? Kurzgesagt clarity (does the picture say what the narration says at that instant)?
  Realism rule? Religious rules? Text exact + inside safe zone + readable? Camera always moving? Pleasant colors?

## 6. Narration timing (global seconds; scenes use local time = global − scene start)
See `data/words.json` (every word with start/end) and `data/timeline.json` (scene windows).

## 7. Shot list — direction per scene (exact on-screen strings in quotes; keep Turkish characters)
Typography strings are suggestions of WHAT to show; you may shorten, but never add claims not in this brief.

**s01 0.00–7.50** (done, reference) Blue-hour desert, ~1000 clay lamps light up in a wave; counter "≈ 1.000" + "MU'CİZE";
glide to the Mushaf on a rahle caught by the dawn ray: "en büyüğü ve en parlağı" / "KUR'ÂN-I KERÎM".

**s02 7.50–13.20** "Resul-i Ekrem ﷺ'ın Kur'an'dan sonraki en büyük mu'cizesi ise, kendi zatıdır."
(a) 7.5–~11.9: Medina at dawn, the **Green Dome** (Kubbe-i Hadrâ) of al-Masjid an-Nabawi: green ribbed dome on an
octagonal drum, gilded crescent finial, a slender minaret, palm trees, warm sunrise, birds-free sky with soft clouds.
Slow majestic crane-up/push-in. Small location tag "Medine". Text "Kur'ân'dan sonra en büyük mu'cize".
(b) on "kendi zatıdır" (~11.9): cut/dissolve to a framed **Hilye-i Şerif** panel (Ottoman calligraphy panel describing
him — a real art form) on a wall/stand in warm light: marbled (ebru) border, gold frame. Real Arabic in Amiri:
top: `بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ` ; central round medallion: `مُحَمَّدٌ رَسُولُ ٱللَّهِ` ; crescent/verse band:
`وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ` ; four corner roundels: `أَبُو بَكْرٍ` `عُمَرُ` `عُثْمَانُ` `عَلِيٌّ`.
Big keyword "KENDİ ZÂTI" (gold). Optional small caption under the panel: "“Sen yüce bir ahlâk üzeresin.” (Kalem, 4)".

**s03 13.20–19.60** "Dostlarının dışında düşmanları dahi onun şahsında gözüken, üstün ve yetişilemeyen ahlaka şahittirler."
Kurzgesagt split composition without people: e.g. dusk desert valley with two encampments (tents, campfires, banners)
facing each other — left camp warm/green banners "DOSTLARI", right camp dark red banners "DÜŞMANLARI" (labels pop on the
words "Dostlarının" / "düşmanları"). Both camps' firelight/lanterns turn toward the same calm light between them; on
"şahittirler" a big "ŞAHİT" stamp/seal lands with a dust puff; "üstün ve yetişilemeyen ahlâk" small label.

**s04 19.60–25.25** "Mesela kendisine düşman olan pek çok müşrikler emanetlerini o kadar kişi arasından…"
Top-down / high oblique **map of old Mecca at night**: valley between dark rocky mountains, hundreds of flat-roof
mudbrick houses (InstancedMesh), narrow alleys; the Kaaba small at center as a plain stone cube with a dark cloth
(NO gold calligraphy band; no modern mosque). Location tag "Mekke". From many houses (many of them tagged with a red
dot = "müşrikler") warm lantern lights start moving along the alleys (no people — moving lights only), all converging
toward ONE modest house. Label "emanetler" with dotted path lines (Kurzgesagt map style). "o kadar kişi arasından" →
emphasize the many houses vs one destination.

**s05 25.25–29.75** "…Peygamberimiz ﷺ'a emanet ederlerdi."
Inside that modest house (warm oil-lamp light, plaster walls, wooden shelves/niches): entrusted items arrive and
settle with satisfying bounce: leather pouches tied with cord, small wooden chests with brass bands, a sealed clay jar,
a folded fine textile, a sheathed dagger, a small jewelry box, a parchment with a wax seal — each with a small tag.
Camera slow push. Big label "el-Emîn" + pill "Mekkeliler O'na “el-Emîn” (güvenilir) derdi". No person.

**s06 29.75–33.30** "Hem Hazret-i Ali gibi cesarette benzersiz bir zat bile,"
Hero shot of the **Zülfikar** (double-pointed sword with split tip, simple hilt) planted in desert rock/sand at golden
hour, wind-blown sand, cape of dust; strong rim light; slow orbit. Text "Hz. Ali (r.a.)" then "cesarette benzersiz".

**s07 33.30–35.60** "savaşın şiddetli anlarında"
Intense: battle dust storm over a rocky plain (Uhud-like mountain silhouette), volleys of arrows streaking through,
spears and round leather shields on the ground, sparks; fast camera move, shake, darker red-orange grade. No people.
Optional small text "savaşın en şiddetli anları".

**s08 35.60–42.00** "Resulullah ﷺ'ın arkasına sığındıklarını defalarca ifade etmiş."
Metaphor: the storm and arrows slam into a huge, unshakable rock/cliff (lit warmly) — sparks, arrows break and fall;
behind the rock it is calm: the Zülfikar rests safely in its lee, dust settles, a warm light. Then quote card (Lora):
"Savaş kızıştığında biz Resûlullah'a (a.s.m.) sığınırdık." — "Hz. Ali (r.a.)". On "defalarca" a small counter-like
repeat mark ("defalarca") can pulse.

**s09 42.00–44.60** "Bu iki damla gibi olan iki örnek"
Macro: two clear water drops fall in slow motion against a soft dark-warm background. Inside each drop a tiny refracted
image (fake via texture) of the two examples: drop 1 = the entrusted chest ("emanet"), drop 2 = the sword ("sığınak").
Labels "1" and "2" / "iki örnek".

**s10 44.60–49.25** "o deniz gibi Ahlak-ı Âliyenin iki damlası ve iki misalidir."
The drops fall into a vast calm ocean at golden hour (FX.ocean, ripple impacts), camera pulls back and up to reveal the
endless sea to the horizon. Big title "AHLÂK-I ÂLİYE" over the sky; "iki damla · iki misal".

**s11 49.25–52.85** "Hem mesela dürüstlükte en yüksek derecede olduğu gibi;"
Kurzgesagt 3D bar chart made of real materials (carved stone or wooden columns on a marble/stone base): several short
columns, one column "DÜRÜSTLÜK" rises past all others up out of frame; camera tilts up following it; label
"en yüksek derece".

**s12 52.85–70.45** the virtues list — exact word times in data/words.json: merhamette 52.92, samimiyette 54.68,
adalette 55.68, güvenilirlikte 56.46, tevazuda 57.56, vefada 58.38, sabırda 59.22, saygıda 60.00, affedicilikte 60.74,
nezakette 62.18, kanaatkârlıkta 63.30, hoşgörüde 64.56, diğerkâmlıkta 65.48, yardımseverlikte 66.60,
"ve diğer bütün güzel ahlak özelliklerinde" 67.76–70.52.
A long stone arcade / gallery (madrasa courtyard feel, warm afternoon light, columns & arches), camera tracking
smoothly past 14 pedestals; each pedestal's object lights up and its name pops EXACTLY on its word:
MERHAMET (bird's nest with eggs / clay water bowl for animals), SAMİMİYET (clear glass vessel of water),
ADALET (brass balance scale, level), GÜVENİLİRLİK (key and padlock / sealed chest), TEVAZU (wheat sheaf with bowed full
ears — "dolu başak eğilir" — or a simple straw mat with clay cup), VEFA (old letter tied with string + dried rose),
SABIR (water drop carving a stone / palm sapling), SAYGI (pair of shoes neatly placed at a doorstep),
AFFEDİCİLİK (sword sheathed and laid down with an olive branch), NEZAKET (a single red rose),
KANAATKÂRLIK (a few dates and a cup of water on a plate), HOŞGÖRÜ (a shade tree / open door),
DİĞERKÂMLIK (bread broken in two halves, one offered), YARDIMSEVERLİK (water jug pouring into a bowl).
On "ve diğer bütün güzel ahlak özelliklerinde" the camera cranes up/back revealing the gallery continues endlessly with
countless lit pedestals; text "…ve bütün güzel ahlâk".

**s13 70.45–77.75** "tarihin şehadetiyle, düşmanları bile kabul ediyor ki en yüksek ve yetişilemeyecek derecedeydi."
Stack of ancient history chronicles/scrolls (tag "tarihin şehadeti"), camera rises past them into the sky above clouds
to a single mountain summit glowing in sunrise high above all others, unreachable — ladders/stairs on lower peaks fall
short. Text "düşmanları bile kabul ediyor" then big "YETİŞİLEMEZ" / "en yüksek derece".

**s14 77.75–87.50** "Şu ana kadar yazılmış başta Şifa-i Şerif gibi çok kitaplar yüzlerce ciltlerle bu "yüksek ahlak"
mu'cizesini beyan ve ispat etmiştir."
Grand old manuscript library (wooden shelves, arches, warm window light, dust motes). A hero leather book glides out:
"Şifâ-i Şerif" with small tag "Kadı İyâz (ö. 1149)". Then on "yüzlerce ciltlerle" books fly/stack into shelves rapidly,
counter "yüzlerce cilt"; on "beyan ve ispat" a stamp-like underline "beyan ve ispat".

**s15 87.50–92.45** "Dünya çapında büyük düşünürler de Peygamberimizin ahlakını kabul etmişler."
Antique brass-and-wood globe on a stand in a dim study, spinning; small warm lights (lamps) appear across continents
(Europe emphasized). Text "Dünya çapında büyük düşünürler".

**s16 92.45–97.10** "Döneminin en önemli düşünürlerinden olan filozof Thomas Carlyle ve"
London 1840 study (Chelsea): wooden desk by a fogged sash window, candle/oil lamp, quill and inkwell, stacks of
papers, a leather book "On Heroes, Hero-Worship" (spine/cover in Playfair). Name card: "THOMAS CARLYLE" +
"Filozof · 1795–1881" + small "On Heroes (1841)". Camera slow dolly across the desk. No person.

**s17 97.10–100.50** "çağının en büyüklerinden olan İngiliz tarihçi Edward Gibbon;"
Lausanne 1787 garden summer-house at night: desk with candles, quill, a finished manuscript, six volumes "The Decline and
Fall of the Roman Empire"; open window with moonlit Lake Geneva and Alps. Name card: "EDWARD GIBBON" +
"İngiliz tarihçi · 1737–1794" + small "Roma İmparatorluğu'nun Çöküşü (1776–1789)".

**s18 100.50–106.90** "yazdıkları eserleriyle bu hakikati ifade eden Batılı düşünürlerden yalnızca iki örnektir."
The two books (On Heroes; Decline and Fall vol.) side by side on a shelf, highlighted; camera pulls back to reveal a
huge Western library wall of countless books; labels "2 örnek" → "yalnızca iki örnek".

**s19 106.90–113.30** "Daha bunlar gibi birçok düşünür Peygamberimiz ﷺ'ın ahlakına hayran kalmıştır."
A vast dark reading hall: many writing desks receding into depth, each candle lighting in sequence (no people) until the
hall glows warmly. Text "birçok düşünür" then "hayran kaldı".

**s20 113.30–124.65** "Bu tatlı hakikatten Mektubat kitabının 195. sayfasında ve 19. Söz gibi başka risalelerde çok hoş ve
etraflıca bahsedilmiştir." Warm morning light on a wooden rahle/desk with Risale-i Nur books: "MEKTUBAT" opens to page
"195" (page number visible; body text as subtle gray lines, NOT readable fake text), then "SÖZLER" with a ribbon bookmark
labeled "19. Söz"; a tea glass and rose optional. End with a calm hold + end card text: "Mektubat, s. 195 · Sözler, 19. Söz".
The last ~1 s should be a gentle, still-moving hold suitable for a fade-out.
