# QA r8: sh02 + sh03 head, no spoon and window rails inset (fix ca649ba)

* lib_s4: two NEW functions only (`hide_honey_spoon`, `inset_window_rails`); no existing function changed.
* sh02.py: calls both right after build_sofra. They apply to the whole shot (static, no keys), so nothing pops.
* sh03.py: same calls. The rails are inset from 225 (the 247/248 shape-key switch is gone), which matches sh02 through the dissolve.
  The curtain subdiv switch stays at 247/248. (d) the shadow-only proxy curtain was not done: a hidden caster copy shadows the visible curtain.

No-change measurement: the same frames were rendered with old code (5064de1) and new code (ca649ba) at final settings, full spp, and pixel-diffed.
`*_phone_old_new_diffx6.jpg` = old | new | |diff| x6.

| frame | max | px > 8 levels | where |
|---|---|---|---|
| sh02 140 | 109 | 4906 | window corner blocks, rail edges (1 mm), spoon |
| sh02 190 | 116 | 6129 | same |
| sh02 215 | 127 | 7710 | same |
| sh02 228 | 124 | 7103 | same |
| sh03 228 | 122 | 10480 | window corners only (sh03 had no spoon already) |
| sh03 240 | 141 | 8295 | window corners only |

Everything else in the frame is < 2-3 levels (render noise floor). Camera, timing and other objects are untouched.
sh03 f295: ca649ba vs 5064de1 is bit-identical (max 0), so the farm frames 248-389 stay valid.
Determinism: sh02 f228, job started at 227 vs 228 = bit-identical.
Glazing bars are unchanged, with T/L junctions only; no "+".
Dissolve: `dissolve_f228/f232_*` = sh02 | sh03 | 50% blend. Window corners and the jar agree, and no spoon shows on either side.
s/frame (4 cores): sh02 60-74 (80% res), sh03 228-240 86-97.
