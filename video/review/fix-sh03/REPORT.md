# fix-sh03: clear water jet + real cut pomegranate

Fix commit: c25357a (code only). Base 4e8a13d (render-jobs).

## Changes
* `lib_s4.build_stream`: the GN tree output a mesh with no material, so the jet rendered as default
  diffuse (cream, "milk"). A `GeometryNodeSetMaterial` (water material) now sits before the output.
  The jet is clear, refracts the window and has rim highlights (`stream_f264_before/after.jpg`).
* `lib_s4.build_open_pomegranate_v2` + `replace_open_pomegranate` (called only from sh03.py, right after
  `build_sofra`, keeping the old object's parent/transform): 5 mm cream rind wall with a thin red
  skin edge, a sunk dark chamber floor, 7 wavy cream pith membranes + core, ~369 rounded, slightly
  faceted, glossy SSS ruby arils (two layers). All arils sit inside the cut outline, so there is no loose ring of seeds.
  The old builder had arils mostly below a broken holes_fill cap. The scan is split at UV seams, so
  that cap filled the wrong loops. (`pom_f376_*`, `pom_f340_*`, `pom_f360_after_motionblur.jpg`)
* sh02 is untouched: `build_sofra` and the old builder are unchanged, and `build_stream` is used only by sh03.

## Proof
* Determinism: started at 247 vs 248, and at 327 vs 328. Frames 248 and 328 differ by at most 1/255 (float noise).
* Cost on this 4-core box, new vs base: f264 109 vs 106 s, f310 99 vs 97 s, f280 118 vs 113 s,
  f376 91 vs 91 s, f248 220 vs 218 s. The fix adds <= 4%. f240-250 were already ~200 s here (haze and motes).
* Event frames are unchanged: jet hits at f251, plate slides f347.5-363.6, bounce window 225-326.
* f247 (chunk 225-247) also showed the cream jet tip, so the pour range starts at 247.
* The old pomegranate is visible small and soft at the right edge in ~f225-242 (this is optional to re-render; it does not pop).
* Independent verifier: PASS. Should-fix noted: mid-slide (f360) motion blur smears the arils, so
  the face reads a little like a blood orange at 100%. It is correct once the plate settles.
