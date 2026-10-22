# FIX STUDIO BRIEF (final quality round)

The film is fully rendered and composited. A whole-film review of the full-quality cut found
verified defects in some approved shots. You are a **fix studio**: you fix ONE well-defined set of
defects at source, prove the fix, and hand the director a commit the render farm can render from.
The user (owner of this account) approved this setup in the director session
`session_01TnAztP4sfBEASZPBF9ZjgS`: parallel cloud sessions, temporary `render-*` branches of
emreks53/A, one-shot render workers. Pushing to your branch `render-fix-<key>` is part of that setup.

## Binding rules of the film (never break)
* Photoreal: every frame must look filmed by a real camera. Read `video/BRIEF.md` (realism rules).
* **No women anywhere. The only human element in the whole film is an adult MAN's hand/forearm**
  ("never anything that reads as a female hand" - the user's explicit rule).
* No text/logos in renders (book typography in sh15 excepted). No music (not your concern).
* Picture events that the sound is synced to must keep their frames unless your issue says
  otherwise. If any visible event moves (contact, landing, entry, light change, camera move), report
  the new frame in your final message.

## How to work
1. `bash video/farm/setup.sh`, then `export VIDEO_ASSETS=$PWD/video/.assets VIDEO_OUT=$PWD/video/.out`.
   Read `video/STUDIO.md` (commands: --stills / --final --from F --to T / --track) and your issue file.
2. `git fetch origin <base branch>` and `git checkout -b render-fix-<key> <base sha>` (both in your
   issue file). Work ONLY on the files of your shot(s) (`video/blender/shots/<shot>.py`, and the
   studio lib only if your issue file allows it). Never edit `common.py`.
3. See the defect yourself first: the current final frames are in git on the branches listed in your
   issue file (`git fetch origin <branch>` then `git show origin/<branch>:<path> > x.mp4`, extract
   frames with ffmpeg; chunk file AAAAA_BBBBB = absolute frames).
4. Fix with the smallest change that makes the shot read as real footage. Test cheaply (crops,
   reduced resolution/samples, single frames); render full-quality `--final` only for the proof
   frames. Render budget: hard ceiling 90 s/frame on 4 cores (aim 60); 80-90% resolution is allowed
   for mostly-defocused/hazy shots; never cut samples to save time; no denoiser blotches/flicker.
5. Determinism: the farm renders in separate Blender runs that start at arbitrary frames with
   `use_persistent_data=True`. Anything random must be seeded; caches must give the same result for
   any start frame; render settings that change during the shot must be keyed F-curves (or the job
   must start exactly on the change frame - say which). Prove it: a 2-3 frame run started one frame
   earlier must give the same pixels as a run started on the frame.
6. Independent verification: when you believe it is done, spawn a subagent (Agent tool) as an
   INDEPENDENT, skeptical verifier: give it the issue file, your diff and the proof frame paths; it
   must render/inspect on its own and judge (a) the defect is gone at 100% and at phone size,
   (b) nothing else in the shot changed (compare unchanged frames), (c) determinism, (d) cost.
   Fix what it finds (max 2 rounds).
7. Commit 1 = the code fix only (this SHA is what the farm renders). Commit 2 (on top) = evidence:
   before/after full-res crops as JPG (q 90, < 1.5 MB total) in `video/review/fix-<key>/` plus a
   short `video/review/fix-<key>/REPORT.md`. Push: `git push -u origin render-fix-<key>`.
8. Send ONE short message to the director (send_message, session_id
   session_01TnAztP4sfBEASZPBF9ZjgS), under 1500 characters: fix SHA, evidence SHA, exact
   re-render ranges with the job split (each job <= ~45 min on 4 cores incl. ~2 min setup; say which
   frames a job must start on), measured s/frame, verifier verdict, and any moved event frames.
   Then stop. Do not open pull requests, do not render the final frames (the farm does that).
