# Polish pass v2 — "make it flawless"

The user watched v1 and asked for: **much higher overall quality, debugging & correction checks on everything**, plus
three specific realism fixes: (1) the Qur'an Mushaf must look more realistic and elite, (2) the Green Dome must look like
the real one, (3) the Risale-i Nur books **Sözler and Mektubat must both be RED** like the real editions. (Subtitles are
being redesigned globally by the director — do not touch `tools/captions*` or add subtitles.)

All rules of `BRIEF.md` still apply (no human figures, never depict the Prophet ﷺ or companions, no fake Arabic, realism,
safe zones, no shared engine edits — put helpers in your scene file or your `engine/lib/extra_<X>.js`, no git).

## What changed in the pipeline
- **Final render is now `--scale 1.0`** (full 1080×1920 internal). Do final checks at `--scale 1.0` on full-size frames.
- **Motion blur** is available per scene: `post: { motionBlur: { samples: 3, shutter: 0.5 } }` (or set `ctx.post.motionBlur`
  in update). Cost multiplies by `samples`. Use it ONLY where motion is fast enough to strobe (fast camera swoops, arrows,
  flying objects, whip moves); keep 1 (off) for slow scenes. Typography stays crisp automatically.
- Performance: aim ≤ ~3 s/frame at scale 1.0 measured alone (without blur). Others render in parallel — measured times will be inflated.

## Adversarial self-review checklist (do it at full size, many timestamps — every ~0.3 s and on every word beat)
Hunt for and FIX:
1. Geometry defects: z-fighting/flicker, interpenetration/clipping, floating objects (no contact shadow), gaps/cracks,
   backfaces/holes, stretched or swimming textures, visible seams, wrong scale relationships.
2. Image defects: aliasing/shimmer on fine detail (thin lines, distant patterns) — fix with mip/AA-friendly textures, thicker
   lines, DOF; blown-out whites, crushed muddy blacks, banding in gradients (add subtle noise), noisy shadows (shadow acne,
   peter-panning), bloom halos that look cheap, flat lighting.
3. Motion defects: pops/jumps between frames, sudden speed changes, jitter, objects appearing without anticipation,
   camera stops (camera must never be dead still), anything strobing (→ motion blur).
4. Typography defects: typos/missing Turkish characters, overlap with other text or important objects, text outside
   x 80–1000 / y 230–1330, illegible over busy backgrounds (add scrim/shadow), labels that don't land on their spoken word.
5. Storytelling: does every second clearly show what the narration says at that instant? Is the hero subject readable on a
   phone in under 0.5 s? Is the composition balanced for 9:16?
6. Handles: frames at t = −0.5 … 0 and dur … dur+0.5 must be clean (cross-fades use them).
7. Pixar-level finish: appealing shapes, rich but harmonious color, soft warm key + cool fill + rim light, believable
   materials (micro-roughness variation, edge highlights/bevels, subtle wear), atmospheric depth.
Then make deliberate quality upgrades where the scene is weakest (lighting, materials, set dressing, camera, animation).

Work loop: list the defects you find (with timestamps) → fix → re-render the same timestamps → verify → repeat until clean.
Do at least 3 full passes. Render one job at a time.

## Reply format
Reply with ONLY JSON: {"scenes":[{"id":"sNN","defects_found":["t=… what"],"fixed":["…"],"upgrades":["…"],
"remaining":"…","motionBlur":<samples or 1>,"ms_per_frame_at_1.0":<n>,"sfx_changes":[{"t":<global s>,"dur":<s>,"kind":"…","desc":"…"}]}]}
(`sfx_changes` only if your timing of visual events changed; otherwise []).
