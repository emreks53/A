export const meta = {
  name: 'dunya-menzil-scenes',
  description: 'Implement and art-direct a group of watercolour scenes for the Dünya Menzil video',
  phases: [
    { title: 'Implement', detail: 'scene author paints and animates the shots, previewing as they go' },
    { title: 'Direct', detail: 'independent art director reviews against storyboard and polishes' },
  ],
}

const ROOT = '/home/user/A/uretim/dunya-menzil'
const SCR = '/tmp/claude-0/-home-user-A/3737c98a-16c9-5b73-ba90-75aaf1cd832c/scratchpad'
// args: [{ name: 'A', shots: ['s01','s02'] }, ...]
const GROUPS = args

const CONTEXT = (g) => `
You are part of a small studio making a world-class 9:16 narrated short: Kurzgesagt-style motion design
(each sentence's meaning visualised by clear, elegant, continuously-alive animated metaphors) rendered as a
hand-painted WATERCOLOUR film (catalogue style S-001 Suluboya). Turkish narration from the Risale-i Nur.
The user expects quality above Kurzgesagt's. Your shots: ${g.shots.join(', ')}.

Read fully before working:
- ${ROOT}/docs/ENGINE.md — engine guide (layers, helpers, rules, previewing). Follow it strictly.
- ${ROOT}/docs/STORYBOARD.md — the whole film; your shots' sections are your brief. Know the shots before and
  after yours (continuity, transitions).
- ${ROOT}/engine/core.js, paint.js, man.js — APIs.
- ${ROOT}/engine/props-a.js and ${ROOT}/engine/props-b.js — shared props (read their API headers). Use them for
  every recurring element (big world, personal world, mirror, hourglass, heart-light, nakış, page, pen, book,
  trees, flowers, clouds, ground, arch gate, pond, ribbons, lanterns, thorns...) so the film is consistent.
  Prop preview sheets: ${ROOT}/scenes/_props_a.js, _props_b.js (render them with
  DM_HASH=solo=_props_a node tools/render.cjs stills --times ... to see what the props look like).
- ${ROOT}/data/words.js (word onsets) and ${ROOT}/data/plan.js (your shots' start/end/transitions).
- Style reference: ${SCR}/s001.png (view it).
- The man pose sheet: DM_HASH=solo=_man node tools/render.cjs stills --times 0.5,1.5,2.5 --out <dir>.

Hard rules:
- Edit ONLY your scene files: ${g.shots.map((s) => ROOT + '/scenes/' + s + '.js').join(', ')}. Never edit engine/,
  data/, props, docs or other scenes. Helpers you need go inside your scene file (IIFE, no globals except
  E.scene registration). If you believe an engine/prop bug blocks you, work around it locally and report it.
- Pure function of time; deterministic; no Math.random; no state between frames. Render time per frame
  should stay under ~1.5 s (check the ms/frame the renderer prints when using 'clip').
- Keep the subtitle band (y 1230–1575) calm and the bottom 8% free of important things; main action in the
  upper ~62%.
- Pacing at Kurzgesagt's level: one clear visual beat per key clause (≈1.2–2.5 s), synced to the word onsets
  listed in the storyboard (an element starts ≈0.05–0.15 s before its word), always-alive subtle motion,
  never frantic, never static. Smooth eased camera moves; parallax depth.
- Respect: no depiction of God/prophets/angels; divine presence only as light from above. The man is the same
  everyman in every shot (E.man), male, featureless face by design.
- Add sfx() cues (see ENGINE.md) — subtle and meaningful, not on every event.
`

const IMPLEMENT = (g) => CONTEXT(g) + `
## Your job: implement your shots
For each shot write scenes/<id>.js: E.scene('<id>', { draw(L, lt, t, shot) {...}, wc?, sfx() {...} }).
Paint each frame like a master watercolourist and animate like a top motion designer:
- composition with a clear focal point, value structure, depth (2–4 parallax layers), generous negative space;
- transparent glazes, pigment-pooling edges (automatic), wet blooms, bare paper highlights, light pencil
  underdrawing/contours, small splatters/dry-brush texture where it adds life;
- every metaphor instantly readable; transitions designed (see plan.js) — the outgoing/incoming moments must
  look good with the next/previous shot.
Workflow: build a first version of the whole shot quickly, preview (node tools/render.cjs shot <id> --n 12
--out ${SCR}/prev/<id>), LOOK at the contact sheet and several full-size frames (Read), especially at the
word onsets of the storyboard beats (render stills at those exact times), then iterate many times on
composition, painting quality, timing and motion until it is genuinely excellent. Also check the boundaries
with neighbouring shots (stills just before/after the cut/transition times; neighbours may still be
placeholders). Finish with a final contact sheet per shot.
Final answer: per shot — a short description of what is on screen beat by beat with times, the final contact
sheet path, sfx cues, render ms/frame, and any concerns.`

const DIRECT = (g, report) => CONTEXT(g) + `
## Your job: independent art direction + polish
Another artist implemented these shots. Their report (may be optimistic):
${report}

1. Render and inspect everything yourself: contact sheets (node tools/render.cjs shot <id> --n 16 --out
   ${SCR}/direct/<id>), full-size stills at every storyboard beat (word onsets) and at transitions/boundaries
   with neighbouring shots, plus mid-motion frames. Make zoomed crops (python PIL) to inspect painting detail,
   the man's anatomy/poses, edges, text.
2. Critique against: storyboard fidelity and beat timing (is each beat on its word?), clarity of each metaphor,
   composition (focal point, balance, subtitle band calm, safe areas), painting quality (watercolour
   authenticity, colour harmony, value structure, no muddy or flat areas, no artefacts/aliasing/slivers/
   accidental overlaps, ink lines not showing through opaque objects), motion quality (easing, overlap,
   always-alive but not busy, no pops/jumps between frames — check consecutive frames 1/30 s apart at key
   moments), continuity with neighbouring shots and consistency with the shared props/man, sfx cue sense.
3. FIX everything you find directly in the scene files, re-render, verify. Push the quality to world-class:
   if a shot is weak, rework it boldly (better staging, richer painting, more elegant motion) while keeping the
   storyboard beats.
Final answer: what you changed per shot, remaining concerns, final contact sheet paths.`

const results = await pipeline(
  GROUPS,
  (g) => agent(IMPLEMENT(g), { label: `implement ${g.name}: ${g.shots.join('+')}`, phase: 'Implement' }),
  (report, g) => agent(DIRECT(g, report || '(no report)'), { label: `direct ${g.name}: ${g.shots.join('+')}`, phase: 'Direct' })
    .then((d) => ({ group: g.name, shots: g.shots, implement: report, direct: d })),
)
return results
