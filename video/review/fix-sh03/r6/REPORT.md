# fix-sh03 round 2 (QA r6): water clamp, whole-shot bounces, sill, curtain hem, aril smear

Fix commit: **500a9c5**. Only sh03.py changes (on top of c25357a); lib_s4 is untouched, so sh02 still matches its frames.

| item | change | check (full res, full spp unless noted) |
|---|---|---|
| a water outside glass | GN radial clamp on GlassWater; input SZ keyed = scale.z per frame; hide_render until f251 | water edge 0.05 mm = 0.3-0.6 px INSIDE inner wall at f252/256/260/266 (old code: up to ~5 mm outside); no disc before f252 (`a_*`) |
| b 326/327 pop | frame_bounces(225, 389): no switch in the shot | tea glass: old lower half 125.9->117.6 (-8, rings gone), new rings kept (`b_*`); 327-389 about +1-4% s/frame |
| c black slot | Sill top +3 mm via shape key ramped f252-272 (defocused macro), sh03 only | pure-black px f342 39286 -> 1557 (rest pre-existing, not the slot), f365 50130 -> 133; f230 sill identical to base (`c_*`) |
| d curtain hem | curtain Sub render_levels keyed 0 until f261, 2 from f262 (defocused macro) | hem smooth f376 (`d_hem_*`); f230 curtain identical to base/sh02 (res 50, `d_curtain_*`); 261/262 invisible (frame-to-frame change in curtain 1.43 vs 0.97 mean, defocused) |
| e aril smear | Cycles does not take a keyed motion_blur_shutter per frame (tested: results depend on job start / ignore the keys), so the shutter stays 0.5. PlateRoot's slide is re-keyed with LINEAR keys at n-0.25/n/n+0.25: whole-frame positions are bit-identical, but within each shutter window it moves at k x speed (k 1 at 346 -> 0.4 over 351-361 -> 1 at 366), i.e. a plate-only shutter of 0.2 | f357 arils crisp with a slight directional blur (`e_*`, `phone_f357_*`); no step at 346-351/361-366; plate positions diff 0.0 at f338-375 |

Determinism: a run started one frame earlier, vs one started on the frame: f262 0, f351 max 0.63/255, f357 0 (full res).
s/frame on this 4-core box: f230 93, f252 42, f262 45, f326 41, f327 41, f342 39, f351 41, f357 41, f366 39, f376 38. Base c25357a is within about 4%.
Independent verifier, 2 rounds: round 1 found the curtain dissolve mismatch and the per-object blur judder risk, both fixed; round 2 PASS on all items.
