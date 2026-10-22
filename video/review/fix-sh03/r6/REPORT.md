# fix-sh03 round 2 (QA r6): water clamp, whole-shot bounces, sill, curtain hem, aril smear

Fix commit: 8860abd. It changes only sh03.py (on top of c25357a/2f6385a); lib_s4 is untouched, so sh02 still matches its frames.

| item | change | check (full res, full spp) |
|---|---|---|
| a water outside glass | GN radial clamp on GlassWater, input SZ keyed = scale.z per frame; hide_render until f251 | water edge 0.05 mm = 0.25-0.37 px INSIDE inner wall at f252/256/260/266/270/274/290/330 (old code: up to ~5 mm outside); no disc before f252 (`a_*`) |
| b 326/327 pop | frame_bounces(225, 389), no switch in the shot | tea glass lower half: old 125.9->117.6 (-8, rings gone), new rings kept in both frames (`b_*`). f342 38.5 s base vs 39.4 s new |
| c black slot | Sill top +3 mm via shape key, ramped f252-272 (window defocused), sh03 only | pure-black px f342: 39286 -> 1557 (rest is not the slot); f230 sill edge row 599/600 base vs 598/599 new = no dissolve jump (`c_*`) |
| d curtain hem | curtain Sub levels 1 / render 2 | f376 hem is smooth (`d_*`) |
| e aril smear | Cycles takes motion_blur_shutter once per render job: keyed 0.2 and a frame handler both rendered as 0.5, while a static 0.2 was sharp. Instead object.cycles.use_motion_blur is keyed off for plate + pomegranate from f348 (plate 1.5 px/frame) to the end | f357 arils crisp (`e_*`, `phone_f357_*`); 347/348 seamless; an off->on switch at 364 stepped sharpness, so it stays off |

Determinism: start-1 vs start, frames 262/357/365: max diff 0, 0 and 1.4/255 (16-bit float noise).
s/frame on this 4-core box: f230 93, f252 45, f262 45, f326 41, f327 41, f342 39, f357 40, f365 39, f376 38.5.
