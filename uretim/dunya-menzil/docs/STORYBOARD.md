# Dünya Menzil — storyboard

Source text: Risale-i Nur, *İman ve Küfür Muvazeneleri*, s. 155 (Birinci Mektup, Dördüncü Sual).
Narration: 93.9 s. Then a photoreal ending (Külliyat + Kur'an + source), 94.1–100 s.

Visual through-line (keep these designs identical wherever they recur — they come from `E.props`):
- **The man** (E.man): our everyman traveller.
- **The big world** (`E.props.bigWorld`): the world as a decorated round garden-globe floating on paper — a
  "süslü menzil": gardens, hills, trees, flowers, a river, a caravanserai (han) with an arched portal, colourful
  awnings and lanterns, a road that enters and leaves (travellers pass through — a stopover, not a home).
- **The personal world** (`E.props.personalWorld`): a small translucent globe (glass/soap-bubble sphere) with a
  tiny landscape inside: a little house with a door, one tree, a garden plot. Each person has one. It can
  glow, dissolve (pigment washing out), flicker (unstable), inflate.
- **The mirror** (`E.props.mirror`): a tall full-length (endam) mirror with an ornate arched frame.
- **The hourglass** (`E.props.hourglass`): life's running time.
- **The heart-light** (`E.props.heartLight`): the man's love — a soft luminous rose-coloured heart.
- Light from above = divine manifestation (never a depicted source).

Gloss subtitles are automatic (engine/gloss.js); keep the 64–82% band calm.

Word times below are global seconds (onsets). `[i]` = index in E.WORDS.

---

## s01 · 0.00–2.55 · "İşte dünya süslü bir menzildir."
İşte[0] 0.20 · dünya[1] 0.52 · süslü[2] 0.94 · bir[3] 1.28 · menzildir[4] 1.46 · (gloss "konaklama yeridir" 1.41)
- Open on bare paper: a wet wash blooms open (first 0.4 s) revealing the **big world** floating in a soft warm
  sky. Gentle slow push-in throughout.
- "dünya" 0.52: the globe is fully formed, slowly rotating/breathing; "süslü" 0.94: decorations pop in with
  soft springs across the globe (lanterns light, awnings, flowers, little flags) — the world gets "adorned".
- "menzildir" 1.46: the caravanserai on top becomes the focal point: its gate glows warmly; tiny travellers on
  the road walk in at one side and out at the other (a stopover).
- Outgoing transition: `zoom` into the han gate at screen (540, 1010) — put the gate there by ~2.5 s.

## s02 · 2.55–5.85 · "Her birimizin hayatı, bir endam âyinesidir."
Her[5] 2.74 · birimizin[6] 2.98 · hayatı[7] 3.48 · bir[8] 4.12 · endam[9] 4.38 · âyinesidir[10] 4.76 · (gloss "boy aynasıdır" 4.33)
- Arriving through the gate: a calm interior courtyard of the han (arches, soft light). The man (side view,
  walking) enters and stops before a **tall mirror** ("Her birimizin" — he is one of us).
- "hayatı" 3.48: in the mirror, his reflection appears — but the reflection is luminous, as if showing his life
  (the reflection softly glows, maybe faint scenes of his life swirl inside the glass like watercolour).
- "endam âyinesidir" 4.38–5.3: camera eases so the full mirror and full figure read clearly: he is reflected
  head to toe (full-length = "endam"). A soft gleam sweeps across the glass at 4.76.
- Outgoing `bleed` (centre 540, 900).

## s03 · 5.85–10.35 · "Şu dünyadan her birimize birer dünya var, birer âlemimiz var."
Şu[11] 6.12 · dünyadan[12] 6.28 · her[13] 6.82 · birimize[14] 7.06 · birer[15] 7.52 · dünya[16] 7.84 · var[17] 8.20 · birer[18] 8.88 · âlemimiz[19] 9.28 · var[20] 9.82
- The big world in the upper part of the frame. "dünyadan" 6.28: small glowing droplets/bubbles lift off its
  surface. "her birimize" 6.82–7.4: below, a row of 4–5 people (the man in the centre, others are the same
  simple figure style in different coat colours) — each bubble floats down to one person.
- "birer dünya" 7.52–8.1: each bubble settles above its person and becomes a **personal world** (each a little
  different inside: a garden, a seaside, a city, a field — the man's: the canonical house+tree+garden).
- "birer âlemimiz var" 8.88–9.96: the personal worlds glow and their interiors come alive (tiny motion inside:
  smoke from chimney, birds, waves), camera starts drifting toward the man's world.
- Outgoing `zoom` into the man's personal world at (540, 760).

## s04 · 10.35–14.85 · "Fakat direği, merkezi, kapısı, hayatımızdır."
Fakat[21] 10.70 · direği[22] 11.10 · merkezi[23] 11.96 · kapısı[24] 12.98 · hayatımızdır[25] 13.62
- Close on the man's personal world (big, centred ~y 700). We see it as a little domed dwelling/world whose
  structure is revealed like a cutaway drawing (pencil construction lines).
- "direği" 11.10: a central pillar/pole (direk) inside lights up from bottom to top; pencil label "direk".
- "merkezi" 11.96: the centre point pulses with concentric rings; label "merkez".
- "kapısı" 12.98: the little door opens, warm light spilling out; label "kapı".
- "hayatımızdır" 13.62: reveal that all three are **his life**: the man stands below/inside; a luminous thread
  (his heartbeat/life line) rises from his chest and *is* the pillar, the centre and the door's light — the
  labels gently fade as the life-light unifies them. Hold.
- Ends on the personal world centred (s05 begins with a cut and transforms it into a page — make the last
  frame clean and centred, the globe at about (540, 720), radius ~300).

## s05 · 14.85–18.75 · "Belki o hususi dünyamız ve âlemimiz, bir sahifedir."
Belki[26] 15.20 · o[27] 15.56 · hususi[28] 15.66 · dünyamız[29] 16.18 · ve[30] 16.74 · âlemimiz[31] 16.92 · bir[32] 17.58 · sahifedir[33] 17.80 · (gloss "sayfadır" 17.75)
- Begins (cut) with the same personal world centred (match s04's last frame). "Belki" 15.2: it softly
  unfolds / flattens like a globe-map peeling open into a flat **page** of fine paper with a delicate
  tezhip (gold illumination) border; its landscape (house, tree, garden) is now an illustration on the page.
- "sahifedir" 17.80: the page settles, slightly tilted, catching light; a faint ruled margin appears — it is a
  page ready to be written on.

## s06 · 18.75–24.70 · "Hayatımız bir kalem, onunla sahife-i a'malimize geçecek çok şeyler yazılıyor."
Hayatımız[34] 19.04 · bir[35] 19.68 · kalem[36] 19.86 · onunla[37] 20.82 · sahife[38] 21.30 · i[39] 21.72 · a'malimize[40] 21.84 · geçecek[41] 22.42 · çok[42] 22.84 · şeyler[43] 22.88 · yazılıyor[44] 23.50 · (gloss "amel defterimize" 21.25)
- "Hayatımız" 19.04: the man's luminous life-thread (same as s04) gathers and forms a **reed pen (kamış
  kalem)** above the page — "bir kalem" 19.86: the pen is complete, tip glinting.
- "onunla" 20.82: the pen writes: flowing ink lines across the page and small ink vignettes of deeds appear one
  after another (a hand giving bread, planting a sapling, a person praying on a mat, helping someone up — tiny,
  iconic, ink+wash).
- "sahife-i a'malimize" 21.30: the page lifts and flies into an open book (the **book of deeds**), joining many
  pages; the book glows softly.
- "geçecek çok şeyler yazılıyor" 22.4–24.0: the book's pages keep filling (pen continues, lines appear on new
  pages); gently close at the end or keep writing into the transition.
- Outgoing `bleed` (540, 960).

## s07 · 24.70–31.55 · "Eğer dünyamızı sevdikse sonra gördük ki dünyamız hayatımız üstünde bina edildiği için"
Eğer[45] 25.64 · dünyamızı[46] 25.94 · sevdikse[47] 26.56 · sonra[48] 27.66 · gördük[49] 28.02 · ki[50] 28.42 · dünyamız[51] 28.96 · hayatımız[52] 29.50 · üstünde[53] 29.88 · bina[54] 30.41 · edildiği[55] 30.70 · için[56] 31.16
- Warm, intimate: the man holds his personal world (`hold`/`embrace` pose) and "sevdikse" 26.56: a rose
  heart-light glows in his chest, warmth radiates to the globe (he loves his world).
- "sonra gördük ki" 27.66: the camera tilts/pans DOWN smoothly (vertical move) revealing what the world is
  standing on: "dünyamız hayatımız üstünde bina edildiği için" 28.96–31.4 — the personal world actually rests
  on top of an **hourglass** (his life) like a dome on a pillar; the man steps back. Sand is running. A pencil
  label "hayat" on the hourglass at "hayatımız" 29.50.

## s08 · 31.55–36.70 · "hayatımız gibi zâil, fâni, kararsızdır, hissedip bildik."
hayatımız[57] 31.96 · gibi[58] 32.56 · zâil[59] 32.88 · fâni[60] 33.77 · kararsızdır[61] 34.41 · hissedip[62] 35.27 · bildik[63] 35.77 · (glosses "geçici, sonlu" 32.83 / 33.72)
- Cut to a closer view of the world on the hourglass. "zâil" 32.88: the sand flow quickens; the world's
  colours begin to run — watercolour pigment trickling down (it is passing). "fâni" 33.77: leaves fall,
  petals drift off, the house's colour fades toward bare paper (it is finite). "kararsızdır" 34.41: the
  globe wobbles/flickers, its outline breaks and reforms (unstable).
- "hissedip bildik" 35.27–36.1: the man (side view) puts his hand on his heart, looking at it, understanding.
- Outgoing `bleed` (540, 800).

## s09 · 36.70–44.65 · "Ona ait muhabbetimiz, o hususi dünyamız âyine olduğu ve temsil ettiği güzel nukuş-u esma-i İlahiyeye döner;"
Ona[64] 37.07 · ait[65] 37.33 · muhabbetimiz[66] 37.61 · o[67] 38.73 · hususi[68] 38.83 · dünyamız[69] 39.29 · âyine[70] 39.87 · olduğu[71] 40.21 · ve[72] 40.73 · temsil[73] 40.91 · ettiği[74] 41.33 · güzel[75] 42.21 · nukuş[76] 42.55 · esma[78] 43.01 · İlahiyeye[80] 43.43 · döner[81] 44.03 · (glosses "ayna" 39.82, "Allah'ın isimlerinin nakışlarına" 42.50)
- "muhabbetimiz" 37.61: the heart-light leaves the man's chest and floats toward his personal world.
- "âyine olduğu" 39.87: the world's surface turns into a **mirror** (silvery, reflective sheen sweeps over it).
- "temsil ettiği güzel nukuş-u esma-i İlahiye" 40.9–44.0: on the mirror surface exquisite golden patterns bloom
  outward (`E.props.nakis` — tezhip-like floral arabesques and an eight-fold star lattice), as if the world's
  flowers, trees and stars were engravings of a deeper beauty. Elegant, slow, luminous.
- "döner" 44.03: the heart-light turns away from the world itself and flows along the golden patterns.

## s10 · 44.65–47.65 · "ondan, cilve-i esmaya intikal eder."
ondan[82] 44.99 · cilve[83] 45.51 · esmaya[85] 45.93 · intikal[86] 46.45 · eder[87] 46.89 · (gloss "isimlerin yansımasına geçer" 45.46/46.40)
- From the patterns, rays of light descend from above (no source) and reflect off the mirror-world ("cilve" =
  manifestation/reflection). "intikal eder" 46.45: the heart-light rises up along the rays, the camera tilting up
  with it into a field of warm golden light. Sacred, quiet.
- Outgoing `bleed` (540, 300) — the light dissolves into a morning garden.

## s11 · 47.65–53.60 · "Hem o hususi dünyamız, âhiret ve cennetin muvakkat bir fidanlığı olduğunu derk edip"
Hem[88] 47.95 · o[89] 48.29 · hususi[90] 48.37 · dünyamız[91] 48.87 · âhiret[92] 49.89 · ve[93] 50.37 · cennetin[94] 50.51 · muvakkat[95] 51.15 · bir[96] 51.67 · fidanlığı[97] 51.83 · olduğunu[98] 52.37 · derk[99] 52.79 · edip[100] 53.07 · (glosses "geçici" 51.10, "anlayıp" 52.74)
- The personal world (globe) on the ground opens into a small **nursery garden (fidanlık)**: neat rows of
  tiny saplings in a fenced plot, the man as gardener.
- "âhiret ve cennetin" 49.89–51.0: beyond the nursery, a tall pointed arch gate (`E.props.archGate`) opens onto a
  vast luminous garden (cennet) with great trees — soft and glowing, far away.
- "muvakkat bir fidanlığı" 51.15–52.3: emphasise the saplings are temporary/small: pencil label "fidanlık";
  the saplings are for transplanting into that garden.
- "derk edip" 52.79: the man looks from saplings to the gate and understands (a small nod, a gentle light
  accent).

## s12 · 53.60–58.45 · "ona karşı şedit hırs ve talep ve muhabbet gibi hissiyatımızı"
ona[101] 53.85 · karşı[102] 54.05 · şedit[103] 54.65 · hırs[104] 55.09 · talep[106] 55.91 · muhabbet[108] 56.53 · gibi[109] 57.01 · hissiyatımızı[110] 57.21 · (glosses "şiddetli" 54.60, "hislerimizi" 57.16)
- Closer on the man (front or 3/4) with the nursery. From his chest, three strong flowing watercolour
  **ribbons/streams** burst out one by one: "hırs" 55.09 (vermilion/red-orange), "talep" 55.91 (amber/gold),
  "muhabbet" 56.53 (rose). Each with a small pencil label (hırs / talep / muhabbet). "şedit" = intense: the
  streams are vigorous, swirling.
- "hissiyatımızı" 57.21: the three streams braid together into one strong current, hovering, ready to be
  directed.

## s13 · 58.45–63.75 · "onun neticesi ve semeresi ve sümbülü olan uhrevî fevaidine çevirsek"
onun[111] 58.67 · neticesi[112] 58.97 · semeresi[114] 60.07 · sümbülü[116] 60.97 · olan[117] 61.39 · uhrevî[118] 61.81 · fevaidine[119] 62.21 · çevirsek[120] 62.81 · (glosses "meyvesi" 60.02, "âhirete ait faydalarına" 61.76/62.16)
- The braided current turns (redirects) and pours into the saplings' roots like irrigation.
- "neticesi" 58.97: the saplings grow (fast, organic, satisfying) into young trees. "semeresi" 60.07: fruits
  ripen on them (pomegranates, apples — luminous). "sümbülü" 60.97: golden ears of wheat (başak) spring up
  between the trees.
- "uhrevî fevaidine" 61.81–62.75: fruits and grain lift off as small glowing lights and float through the
  arch gate into the paradise garden beyond. "çevirsek" 62.81: the current fully flows into the garden.

## s14 · 63.75–67.70 · "o vakit o mecazî aşk, hakiki aşka inkılab eder."
o[121] 64.05 · vakit[122] 64.11 · o[123] 64.47 · mecazî[124] 64.55 · aşk[125] 65.19 · hakiki[126] 65.69 · aşka[127] 66.19 · inkılab[128] 66.51 · eder[129] 66.93 · (gloss "dönüşür" 66.46)
- A still pond in the garden at dusk-gold light. "mecazî aşk" 64.55: in the water, the reflection of the
  heart-light (only a reflection — wavering, metaphorical). "hakiki aşka" 65.69: the reflection rises out of the
  water and becomes a real, solid, radiant heart-light (or a blooming rose of light), much brighter.
  "inkılab eder" 66.51: it transforms with a beautiful bloom of light and ascends upward, leaving ripples.
- End by fading light down — s15 enters with a quick `fade` into darkness.

## s15 · 67.70–72.65 · "Yoksa — نَسُوا اللّٰهَ فَاَنْسٰيهُمْ اَنْفُسَهُمْ اُولٰٓئِكَ هُمُ الْفَاسِقُونَ"
Yoksa[130] 68.07 · verse: nesullahe[131] 68.81 · feensahum[132] 69.45 · enfusehum[133] 70.35 · ulaike[134] 71.17 · humul[135] 71.67 · fasikun[136] 71.99 (ends 72.59) · (gloss: verse meaning, 3 lines at y≈1250–1400, 68.76–74.35)
- "Yoksa" 68.07: the palette turns: deep night indigo washes spread over the paper; a single drop of ink falls
  and blooms. Silence and weight.
- Verse 68.81–72.6: the Qur'anic verse appears in beautiful Arabic (font "Amiri Quran", correct harakat, exactly:
  نَسُوا اللّٰهَ فَاَنْسٰيهُمْ اَنْفُسَهُمْ اُولٰٓئِكَ هُمُ الْفَاسِقُونَ) in luminous gold ink on the dark wash, centred around y≈720–900
  (two lines if needed, right-to-left reveal synchronised word by word with the recitation: first two words at
  68.81, then 69.45, 70.35, 71.17, 71.67, 71.99). Reverent, crisp (overlay or ink layer), subtle gold glow,
  a thin gold rule or delicate tezhip ornament above/below. No human figure in this shot.

## s16 · 72.65–77.45 · "sırrına mazhar olup nefsini unutup hayatın zevalini düşünmeyerek"
sırrına[137] 72.71 · mazhar[138] 73.09 · olup[139] 73.49 · nefsini[140] 74.23 · unutup[141] 74.71 · hayatın[142] 75.55 · zevalini[143] 76.07 · düşünmeyerek[144] 76.57 · (glosses "sahip olup" 73.04, "yok oluşunu" 76.02)
- Night palette. The man before the tall mirror (same mirror design), cold moonlit tones.
- "nefsini unutup" 74.23–75.1: his reflection in the mirror fades away (he forgets himself) — the glass goes
  empty/dark.
- "hayatın zevalini düşünmeyerek" 75.55–77.2: behind him the hourglass, nearly empty, sand running; he turns his
  back to it / looks away (does not think of life's end).

## s17 · 77.45–82.45 · "hususi kararsız dünyasını, aynı umumî dünya gibi sabit bilip"
hususi[145] 77.71 · kararsız[146] 78.29 · dünyasını[147] 78.85 · aynı[148] 80.05 · umumî[149] 80.39 · dünya[150] 80.79 · gibi[151] 81.15 · sabit[152] 81.47 · bilip[153] 81.89 · (gloss "genel" 80.34)
- His fragile personal world (flickering, translucent, trembling — "kararsız" 78.29) next to him; the big world
  far in the background.
- "aynı umumî dünya gibi" 80.05–81.1: in his eyes the small world inflates to the size of the big world and looks
  solid like it (an illusion: show the true small outline as a dashed pencil circle inside).
- "sabit bilip" 81.47: he plants it down as if fixed and permanent (a heavy "thud", the flicker freezes into a
  false stillness).

## s18 · 82.45–86.40 · "kendini lâyemut farz ederek dünyaya saplansa,"
kendini[154] 82.69 · lâyemut[155] 83.13 · farz[156] 83.61 · ederek[157] 83.89 · dünyaya[158] 84.77 · saplansa[159] 85.25 · (gloss "ölümsüz" 83.08)
- "kendini lâyemut farz ederek" 82.7–84.2: the man stands on a pedestal in a proud pose; his body turns to grey
  stone like a monument (assuming himself immortal) — a pencil-grey statue.
- "dünyaya saplansa" 84.77–85.8: the ground (the world) turns to thick mud/clay; the statue-man sinks/gets stuck
  in it up to the knees.

## s19 · 86.40–90.55 · "şedit hissiyat ile ona sarılsa onda boğulur, gider."
şedit[160] 86.57 · hissiyat[161] 86.93 · ile[162] 87.43 · ona[163] 87.67 · sarılsa[164] 87.91 · onda[165] 88.89 · boğulur[166] 89.23 · gider[167] 89.73 · (gloss "şiddetli hisler" 86.52/86.88)
- He clutches the (inflated, false) world with both arms (`clutch`); dark red tangled ribbons (the intense
  feelings, now dark) wrap around him and the world, tightening.
- "onda boğulur" 88.89: the world liquefies into dark water and swallows him — he sinks below the surface,
  bubbles rising. "gider" 89.73: he is gone; the surface closes.

## s20 · 90.55–94.10 · "O muhabbet onun için hadsiz bela ve azaptır."
O[168] 90.97 · muhabbet[169] 91.05 · onun[170] 91.79 · için[171] 92.01 · hadsiz[172] 92.43 · bela[173] 92.93 · ve[174] 93.23 · azaptır[175] 93.39 (ends 93.87)
- From the dark water rises the heart-light — but it is darkened: "muhabbet" 91.05 it glows a sick dark
  crimson; "hadsiz" 92.43: thorns grow around it, dark washes swirl endlessly outward (an endless spiral/vortex);
  "bela ve azaptır" 92.93–93.9: thunderous dark blooms, cracks of cold light; the heart is caught in the thorns.
- End at 94.1 into the photoreal ending (`fade`).

## end · 94.10–100.0 · photoreal ending (handled separately)
Külliyat (14 volumes, pale faded-rose leather) + Kur'an on a rahle; source text: Risale-i Nur ·
İman ve Küfür Muvazeneleri · sf. 155.
