# PRODUCTION BIBLE — "Yirmi Birinci Söz, s.291" short video

Everything every agent on this production must know. Read it fully before doing anything.
Work ONLY under `/home/user/work/`. Do NOT modify `/home/user/A` (the user's app repo) and do NOT open or
look at anything under `/home/user/A/public/videolar/` (the user explicitly said: do not look at the other
example videos in the repo). App *source code* under `/home/user/A/src` may be read when the bible says so.

## 1. What we are making

One vertical short video (9:16, 1080×1920, 30 fps, ~29–30 s) in the *format* of "Kurzgesagt – In a Nutshell":
a narrator reads a text and, in parallel, dynamic animated visuals reflect the meaning of the sentence being
read at that moment. The THEME is NOT space; the theme comes from the meaning of the text. The user demands
world-class quality, at or above Kurzgesagt's polish. This is the bar for every decision: composition, colour,
motion design (easing, anticipation, overlap, follow-through, secondary motion), cleanliness, zero glitches.

Dynamism must match Kurzgesagt's measure and NOT exceed it: one clear visual idea per clause/phrase — NOT a
new visual for every word. The viewer must be able to follow comfortably. This is important to the user.

### The narrated text (audio already trimmed; the leading word "Elhasıl" was cut on purpose)

> Ey nefis! Bil ki dünkü gün senin elinden çıktı. Yarın ise senin elinde senet yok ki ona mâliksin.
> Öyle ise hakiki ömrünü, bulunduğun gün bil. Lâekall günün bir saatini, ihtiyat akçesi gibi hakiki
> istikbal için teşkil olunan bir sandukça-i uhreviye olan bir mescide veya bir seccadeye at.

Plain meaning (for the artists): "O my soul! Know that yesterday has left your hand. As for tomorrow, you hold
no title-deed (senet) proving you own it. So know your real life to be the day you are in. At the very least,
cast one hour of the day — like reserve money (ihtiyat akçesi) — into a mosque or onto a prayer rug, which is
an otherworldly little savings-chest (sandukça-i uhreviye) set up for the true future (the hereafter)."
Source: Risale-i Nur · Sözler · Yirmi Birinci Söz · 291. Sayfa.

### Timing (video seconds). File: `/home/user/work/timing.json` (authoritative)

Voice starts 0.51, ends ≈22.89. Word onsets (video time):
```
Ey 0.51 | nefis 0.76 | Bil 1.84 | ki 2.08 | dünkü 2.54 | gün 2.92 | senin 3.12 | elinden 3.38 | çıktı 3.80 (ends 4.10)
Yarın 4.94 | ise 5.22 | senin 5.46 | elinde 5.72 | senet 6.11 | yok 6.45 | ki 6.67 | ona 6.97 | mâliksin 7.14 (ends 7.69)
Öyle 8.85 | ise 9.13 | hakiki 9.67 | ömrünü 10.23 | bulunduğun 10.81 | gün 11.39 | bil 11.61 (ends 11.77)
Lâekall 12.55 (ends 13.10) | günün 13.51 | bir 13.83 | saatini 14.07 (ends 14.57)
ihtiyat 14.97 | akçesi 15.45 | gibi 15.87 (ends 16.03)
hakiki 16.67 | istikbal 17.14 | için 17.69 | teşkil 17.91 | olunan 18.37 | bir 18.79 | sandukça-i 18.92 | uhreviye 19.61 | olan 19.95
bir 20.21 | mescide 20.43 (ends 20.84) | veya 21.38 | bir 21.66 | seccadeye 21.84 | at 22.56 (ends ~22.89)
```
Pauses (no speech): 1.06–1.84, 4.10–4.94, 7.69–8.85, 11.77–12.55, 13.10–13.51, 14.57–14.97, 16.03–16.67, 20.84–21.38.
Visual beats should LEAD the word they illustrate by ~2–4 frames (never lag).

### Word glosses (elegant subtitle of the modern-Turkish meaning)

When an archaic word is spoken, ONLY its modern meaning appears on screen as an elegant, high-quality subtitle,
exactly at the instant the first letter of the word is spoken:

| gloss text (exact)        | spoken word            | appear at | disappear by |
|---------------------------|------------------------|-----------|--------------|
| `sahipsin`                | mâliksin               | 7.14      | ~8.65        |
| `en az`                   | Lâekall                | 12.55     | ~13.95       |
| `gelecek`                 | istikbal               | 17.14     | ~18.72       |
| `âhirete ait sandıkçık`   | sandukça-i uhreviye    | 18.92     | ~20.95       |

Rules from the user: the gloss shows ONLY the meaning — the original word is NOT written above it; the gloss is
NOT inside a box/pill/banner. It must look "elit, hoş ve kaliteli". Glosses live in the vertical band 64%–82% of
the frame (y≈1229–1574 px), horizontally centred. Scenes must keep that band visually calm enough at those
times for the text to read perfectly (the engine provides the gloss renderer; scenes don't draw glosses).

## 2. Visual style: S-050 "Sünger Boyama" (Sponge Painting) — from the user's "Atölye Stil Kataloğu"

Reference image (LOOK AT IT): `/home/user/work/ref/S-050-ornek.png` (1024×1024).

Catalogue definition (translated): colour is dabbed on with a natural sea sponge instead of a brush. The pores
of the sponge leave a holed, speckled, irregular print at every dab; as several colours are dabbed over each
other they show through each other's gaps, and forms are built with soft, cloud-like edges. Where a sharp edge
is needed, a STENCIL (şablon) or masking tape is used. Feels like decorative wall paint (faux finish), matte.

Distinguishing marks (from the catalogue):
1. Every dab is a porous, holed, speckled sponge print; colour layers show through each other's gaps.
2. Sky: overlapping dabs of light blue, cobalt and lavender; yellow and peach toward the sun; clouds are
   soft-edged white clusters (lavender-grey dab under them).
3. Architecture / objects are STENCIL-masked: outer edges and openings razor-sharp, interiors sponge-speckled.
4. Shading by dabbing: dark base → mid tone → light dabs on the lit side (light from upper right); thin dark
   lines (e.g. dome ribs) are printed through narrow stencil slits.
5. Foreground foliage is a soft-edged layered mass; leaves and white petals are stencil-cut sharp, with a thin
   lavender shadow printed just inside the stencil edge; interiors speckled.
6. Cream primer (#EFE4CF) and ivory stone with a matte, sandy, faux-finish wall-paint feeling. The primer is
   visible between dabs everywhere. NO gradients-by-airbrush, NO outlines, NO glossy highlights, NO vector-flat
   fills: every filled area must show sponge pores.

Catalogue palette: `#EFE4CF` cream primer · `#80BED6` light blue · `#4E94CE` cobalt · `#A498D2` lavender ·
`#2C7048` deep green · `#96C654` yellow-green · `#F0A82E` gold/orange · `#EEA0BA` pink.
Also seen in the reference: white `#FBF8F0`, ivory stone `#EDE3D2`, dark maroon `#4A2328` (windows),
brick `#B4553A`, ochre `#C98A3C`, peach `#F4C79A`, warm skin `#E0A47C`, dark brown `#3B2620`.

**USER UPDATE (binding): the catalogue palette is NOT a limit.** The user said explicitly that we do not have to
stay within the colours listed in the catalogue. What defines S-050 is the TECHNIQUE (sponge dabs, pores,
layered colours showing through, stencil-sharp vs cloud-soft edges, matte faux-finish wall) — not those eight
hex values. Choose colours freely wherever the meaning or beauty of a shot asks for it (e.g. dusk tones for
yesterday, misty pre-dawn tones for tomorrow, radiant golds/whites for the true future, rich rug colours),
as long as each shot stays harmonious and the film keeps one coherent colour script.

How the catalogue says it is drawn in code: ~10 different sponge stamps are generated (inside an irregular
noise-distorted cloud edge, warped multi-scale noise is thresholded into a porous texture, then random circular
holes are punched). Each colour layer is dabbed on a separate canvas with hundreds of stamp presses (random
rotation, scale, opacity). Architecture/leaf/petal layers are then cut sharp with a stencil canvas
(`destination-in`); sky and foliage layers stay soft-edged. Colour density follows a light model via the
probability of pressing a dab.

### Animating this style (house rules)
- Sponge texture must be STABLE in object space: a stencil shape = clip path + pre-baked sponge texture anchored
  to the object (the texture moves/rotates with the object, never swims or flickers). No per-frame random.
- Signature transition: things are "dabbed in" — a shape/cluster builds up dab by dab in a few discrete steps
  (stepped "on twos/threes" feels hand-made), and "dabbed out" the same way or breaks into drifting specks.
- Rigid cut-out (stencil puppet) animation with excellent easing for characters and objects; soft sponge
  clusters (clouds, glows, mist, foliage, light) for atmosphere. Subtle constant life everywhere, like
  Kurzgesagt: drifting clouds, gently pulsing sun halo, swaying plants, floating specks, slow camera drift.
- Everything deterministic and seeded. 30 fps.

## 3. The human figure (if/when shown)
Male. As plain and detail-free as possible, yet clearly a normal, well-proportioned human in general outline;
flawless, careful, high quality. Stencil cut-out puppet (head with short dark hair, neck, torso, upper/lower
arms with simple mitten hands, legs, shoes). No facial features (or the barest hint) — never uncanny, never
wrong anatomy, joints must not show gaps or ugly overlaps in any pose. Warm clothing colours so he pops
against the cool sky (e.g. brick/terracotta top `#B4553A`, dark brown trousers, skin `#E0A47C`, hair `#3B2620`).

## 4. Ending: source card (photoreal)
After the narration, the source appears: `Risale-i Nur` / `Sözler` / `Yirmi Birinci Söz` / `291. Sayfa`.
While the source and page are on screen, the Risale-i Nur books that are visible must look like the real-life
books and look REALISTIC, as if shot with a camera (photoreal 3D render, Blender Cycles). The Risale-i Nur
Külliyatı and the Qur'an appear at the end. The leather colour of the Risale volumes: a VERY, VERY LIGHT, elite,
slightly faded red that also leans a little toward a light brown leather tone; very high quality. The
arrangement must not be the stock arrangement of earlier videos (we use a fresh arrangement, see end-card brief).
The Qur'an is always placed highest and nothing is ever placed on it.

## 5. Audio
Narration: `/home/user/work/audio/voice_trim.wav` (48 kHz stereo, 23.02 s, aligned so that video t=0 is its
first sample). NO background music. Sound effects are allowed but must be quiet and never dominant; the
narrator's voice dominates.

## 6. Technical pipeline & layout
```
/home/user/work/
  BIBLE.md  timing.json  storyboard.json (once final)
  ref/S-050-ornek.png            style reference
  fonts/*.woff2                  EB Garamond 500/500i/600, Encode Sans 500/600/700, Tinos 700i (latin + latin-ext)
  audio/                         voice_trim.wav, sfx + mix
  video/                         2D animation project (HTML Canvas 2D, ES modules, rendered in headless Chromium)
    index.html  src/engine/*.js  src/shared/*.js  src/scenes/*.js  tools/render.mjs  out/
  endcard/                       Blender (bpy) project for the photoreal books + rendered plates
```
- Node v22, Playwright + Chromium preinstalled: `require('playwright')` / `import {chromium} from 'playwright'`
  work from any directory; `chromium.launch()` needs no options. NEVER run `playwright install`.
- ffmpeg 6.1 at /usr/bin/ffmpeg. Python 3.13 with numpy, pillow, torch (CPU), bpy 5.3 (Blender as a module).
- The machine has 4 CPU cores shared by several agents: keep renders reasonable (preview at reduced scale,
  limited frame ranges), and never leave stray background processes (servers, browsers) running when you finish.
- Keep command output short (pipe long logs to files; tail them). Never print download progress bars.
- When you view images to judge your work, downscale contact sheets so they stay readable (≤ ~1600 px long side)
  but ALSO inspect a few frames at full resolution — quality is judged at 1080×1920.

## 7. Quality bar (non-negotiable)
- Looks like S-050 at first glance AND is beautiful: confident composition for a 9:16 phone screen, generous
  scale (elements must read on a phone), disciplined palette, harmonious values.
- Motion is professional: eased, overlapped, anticipations and settles, no linear robotic moves, no pops
  (except intentional stepped dab-ins), no texture swimming, no flicker, no z-fighting, no clipped elements,
  no elements awkwardly cut by frame edges, no stray debug marks.
- Meaning comes first: at every moment the picture must clearly express what is being said right then.
- Shorts-safe: keep essential content out of the bottom 14% and out of the right-edge 12% in the lower half.
