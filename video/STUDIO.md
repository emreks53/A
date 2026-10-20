# STUDIO GUIDE — how a shot studio session works

You are one of several parallel "studio" sessions building a photorealistic vertical short. A
director session coordinates you. Your job: build your assigned shots as procedural Blender
scripts that look indistinguishable from real camera footage, get them approved, then render them.

## 0. Setup (once)

```bash
bash video/farm/setup.sh                       # Blender 5.2.2 CPU + ffmpeg check (~1-2 min)
export VIDEO_ASSETS=$PWD/video/.assets VIDEO_OUT=$PWD/video/.out
```
Read `video/BRIEF.md` (all of it), `video/timing/shots.json` (your shots), and
`video/blender/common.py` (the API). `video/blender/shots/_selftest.py` is a tiny working example.

## 1. Build

* One file per shot: `video/blender/shots/<shot>.py`, ending with `C.run("<shot>", build)`.
  Self-contained (code + CC0 downloads via `C.ph_*`/`C.human_mesh`). Deterministic (seeded).
* Do not edit `common.py`. Put shared helpers for your shots in `video/blender/lib_<studio>.py`.
  If you hit a real bug in common.py, work around it in your file and note it in NOTES.md.
* Blender 5.2 API notes: actions are layered (use `C.fcurves(obj)`), Principled inputs are named
  "Subsurface Weight", "Transmission Weight", "Specular IOR Level", "Emission Color", "Coat
  Weight"… Sky texture types: `MULTIPLE_SCATTERING`, `SINGLE_SCATTERING`, `PREETHAM`,
  `HOSEK_WILKIE`. Physics caches (cloth/fluid/particles) must be baked inside the script before
  rendering, and must give the same result for any frame range (bake from the shot's render_f0).

## 2. Iterate on realism (the important part)

```bash
blender -b --factory-startup -noaudio -P video/blender/shots/<shot>.py -- --stills 1.2,3.4,5.0
#   -> video/.out/previews/<shot>_t<time>.png (50% res, preview quality)
blender -b --factory-startup -noaudio -P video/blender/shots/<shot>.py -- --animatic
#   -> video/.out/animatic/<shot>_animatic.mp4 (25% res, every 2nd frame, WITH narration audio)
blender -b --factory-startup -noaudio -P video/blender/shots/<shot>.py -- --final --from F --to F
#   -> one full-quality frame; prints s/frame. Budget: <= 40-45 s/frame on 4 cores.
blender -b --factory-startup -noaudio -P video/blender/shots/<shot>.py -- --track
#   -> video/.out/track/<shot>.json (screen positions of TRK_* empties)
```

Look at every still with the Read tool and critique it like a cinematographer and a VFX
supervisor: *Would anyone believe this was filmed?* Check scale, light falloff, contact shadows,
specular response, micro-detail, colour, DOF/bokeh shape, composition in 9:16, the key-word band
(BRIEF §5), and that each event lands on its word. Iterate until it is excellent. Also check a
few animatic frames at the exact word times.

## 3. Publish for review

Copy to `video/review/<shot>/`: 4–6 stills (50% res) covering the first frame, every key event,
and the last frame; the animatic mp4; the track json; and `NOTES.md` (what each still shows, the
measured final s/frame, known issues). Update `video/review/STATUS_<studio>.md` with one line per
shot, e.g. `sh01: READY_FOR_REVIEW`. Commit and push to your branch (`git push -u origin
<your-branch>`). The director polls the branches and will send you notes as a message in this
session. Keep improving while you wait; do not sit idle.

## 4. Final render (only after the director's message says `APPROVED <shot>`)

```bash
bash video/farm/render.sh <shot>            # whole shot; or: render.sh <shot> <from> <to>
```
Run it with `run_in_background` (it can take hours). It renders 48-frame chunks, encodes each to
`video/renders/<shot>/…mp4` and commits + pushes after every chunk; it is resumable — if it stops,
just run it again. Keep the session alive until it prints `ALL DONE`, then set the STATUS line
to `DONE` and push. Then wait for the director: you may be asked to render chunks of other
studios' shots (`git fetch origin <their-branch>` and `git checkout origin/<their-branch> --
video/blender/shots/<shot>.py video/blender/lib_*.py` first).

## Rules

* Never push to `main` or to another studio's branch. Only `video/blender/shots/<your shots>.py`,
  your `lib_*.py`, `video/review/**`, `video/renders/<your shots>/**` change on your branch.
* Never commit `video/.assets` or `video/.out` (gitignored).
* No text, logos or subtitles in renders (post adds them). No music. Keep CC0 sources only.
