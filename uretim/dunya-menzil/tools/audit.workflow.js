export const meta = {
  name: 'dunya-menzil-scene-audit',
  description: 'Fix scene-level figure defects and rule violations in a group of shots, then verify independently',
  phases: [
    { title: 'Fix', detail: 'figure defects (feet sliding, poses, overlaps) + rules (metaphors, sacred imagery)' },
    { title: 'Verify', detail: 'independent per-frame scan + visual check; fix leftovers' },
  ],
}
const ROOT = '/home/user/A/uretim/dunya-menzil'
const SCR = '/tmp/claude-0/-home-user-A/3737c98a-16c9-5b73-ba90-75aaf1cd832c/scratchpad'
// args: { name, shots: [...], notes: '...' }
const G = args
const FILES = G.shots.map((s) => `${ROOT}/scenes/${s}.js`)

const CTX = `
You work on a 9:16 watercolour explainer video (Risale-i Nur narration) rendered by a JS engine. Your shots: ${G.shots.join(', ')}.
Read fully: ${ROOT}/docs/KURALLAR.md (the user's BINDING rules), ${ROOT}/docs/FIGUR-DENETIM.md (scene-level figure problems found by
the rig audit, with tested fixes and tools), ${ROOT}/docs/ENGINE.md, ${ROOT}/docs/STORYBOARD.md (your shots + neighbours),
${ROOT}/engine/man.js header (new joint limits, E.man.limited, hands, walk), and your scene files: ${FILES.join(', ')}.
Edit ONLY your scene files. Do not edit engine/, props, data, docs or other scenes (report anything outside your scope).

The user's latest words (translated): "Human drawings can have errors or distortions — pay special attention: there must be absolutely
NO error or distortion." "Do not show a metaphorical meaning with physical objects or a metaphorical verb as a real act (e.g. for
'throw an hour of the day onto the prayer rug' do NOT show a clock thrown on a rug); sometimes showing it literally is fitting and nice
(e.g. 'dünyaya saplansa' → a person lightly sinking into the world)." "Visualise nothing about Allah: no brightness when Allah is
mentioned, no light descending/reflecting from above for His mercy, nothing tying Allah to the sky, no ornate circular symbol when a
Divine Name is read. Concepts like marifetullah/muhabbetullah may be represented by a visual element."

Tools: cd ${ROOT}; node tools/render.cjs shot sNN --n 16 --out DIR ; node tools/render.cjs stills --times ... --out DIR ;
numeric per-frame figure scan and foot-slide analysis: see the tools in ${SCR}/ver/tools/ (scan.cjs, analyze.py, slipnet.py, iso.cjs,
vis.cjs — read their headers; they let you check every figure draw at 30 fps, foot contact slide in px/frame, pose jumps and view
switches, and render isolated large close-ups of any recorded pose). Look at images with Read and zoomed crops (python3 PIL).
Keep the story beats/timing on their word onsets, the subtitle band (y 1230–1575) calm, deterministic code, < ~1.5 s/frame, gentle sfx.`

const FIX = CTX + `
## Group notes from the director
${G.notes}

## Your job
1. Fix every figure problem listed for your shots in FIGUR-DENETIM.md (apply or improve the tested patches) and every additional one you
   find: a 30 fps numeric scan of every figure in your shots must show foot slide < 1.5 px/frame on planted feet, no pose jumps, no
   unintended view switches; isolated close-ups and in-scene crops must show flawless anatomy (hands, elbows, knees, feet, neck, coat),
   no limbs through bodies/objects, nothing drawn over a hand or face that reads as a stain, no squashing/stretching of figures.
2. Audit your shots against the rules (metaphors, sacred imagery) and fix any violation in a way that keeps the meaning beautiful and
   clear.
3. Re-render, re-scan, look again; iterate until clean.
Final answer: per shot — what you changed, scan numbers before/after, evidence paths, anything outside scope.`

const VERIFY = (rep) => CTX + `
## Your job: independent verification (be strict — the user will reject any figure error)
The fixer's report:\n${rep}\n
Re-scan every figure at 30 fps, inspect isolated close-ups of the hardest poses and in-scene crops at all motion peaks and
consecutive-frame pairs, and check the rules. FIX anything still wrong in your scene files and re-verify. Final answer: verdict per
shot, what you changed, remaining concerns (if any) with exact times.`

phase('Fix')
const rep = await agent(FIX, { label: `fix ${G.name}: ${G.shots.join('+')}`, phase: 'Fix' })
phase('Verify')
const ver = await agent(VERIFY(rep || ''), { label: `verify ${G.name}: ${G.shots.join('+')}`, phase: 'Verify' })
return { group: G.name, rep, ver }
