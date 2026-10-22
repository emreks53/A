# fix-sh09 round 5

The fix commit is 97ddb78 (round 5b), which builds on 1d2681c. It changes `lib_s7.py` only, all inside `upgrade_interior_s9` and its helpers. The re-exported track is `video/comp/tracks/sh09.json`, committed in 48b2f00. The re-render range is 1174-1255.

## 1. Hard rule: T-tubule rings uncovered by the cleared fibrils
* **Rings dropped:** soft_ttubules drops the rings of the two cleared fibrils and every ring they used to hide: centre x > x_c and |z - z_c| < 0.017. That is 31 rings. The round-4 REPORT was wrong on this point: round 4 dropped 0 rings. 294 fibrils are kept and 2 cleared.
* **Independent skeptic A, at 100% over 1188-1245: PASS.**
  * The wire across the gap at the top-left of the hero at 1214-1236 is gone.
  * The corridor at 1188-1205 has only short hooks and stubs: no bars, no '+', no ladder.
  * Crops: `topleft_100pct_1214_1220_1228.jpg`, `corridor_100pct_1192_1200.jpg`.

## 2-3. Hero: identity and shape (hero only)
* **Shape:** length x0.82 (about 2.8:1). The bend is 0.09 for both the envelope and the cristae, and `_BEAN_ZMID` is keyed by width and bend. `_roll_and_clear` keeps L=0.024. The left cap is at x 81 at f1250 and x 71 at f1255 (864 grid).
* **Pillar:** the corridor-edge fibril (-0.0195, 0.0113) cut 2-21 % of the hero's low end at 1205-1220. It is now a little thinner (r 0.0058) and moved 0.0025 to the right, with its rings. Ray-cast check: 0 % of the low half is occluded at 1200, 1205, 1210, 1214, 1220 and 1228.
* **Cristae:** 9 alternating folds (mesh check: 0 crossings). They are rooted on the inner membrane (rad 0.83, flat-side root on the real flank), with yspan 0.35 and reach 0.45-0.72. They are thinner and use their own moderate-glow material, and they cast no shadow, so there is no lit box between them.
* **Double membrane:** the inner membrane sits further in (gap 0.11) and has its own rim line (0.7 x the outer rim).
* **Glow:** the inner glow light is x0.6 and the hero's end matrix emission is 3.5.
* **Foreground pair:** fainter (alpha 0.08), with fgMito1 moved left. The myonucleus is fully out of frame, so the sliver at x≈770 is gone.

## Gates (full quality; hero silhouette; image rotated so the hero's long axis is vertical)
| Frame | H | S | V | R>=254 | Ridges touching a fold | OLD box band contrast |
|---|---|---|---|---|---|---|
| 1236 | 24.5 | 85% | 56% | 0 | 0 | 24.1% |
| 1244 | 25.8 | 83% | 67% | 0 | 0 | 15.7% |
| 1248 | 26.0 | 81% | 69% | 0 | 0 | 14.6% |
| 1250 | 26.0 | 80% | 70% | 0 | 0 | 12.6% |
| 1255 | 25.9 | 79% | 71% | 0 | 0 | 12.4% |

* **OLD box measure:** mstat.py's 100x400 px box with p95-p5 of the detrended row luma, laid along the hero's axis on the lower half of the body. On this measure r4 (c17c93b) scored 10.9 % at f1250.
* **Centre:** the silhouette centroid is (419, 678) vs TRK_mito (428, 675).
* **Track:** the re-exported `comp/tracks/sh09.json` replaces the committed one, which was 41.7 px off on average (61 px max) in the callout window 1206-1248. The new export's visible TRK_mito path is unchanged from round 3/4.
* **Determinism:** 1229-1231 vs 1230-1231 gives bit-identical frames 1230 and 1231.
* **Join:** 1173 is 0.40/255 from the farm frame.
* **Cost:** 70-94 s/frame on this session's host, which is about 1.41x slower than before. The round-4 code measures 79.6 s here vs 56.5 s then, so the normal-host equivalent is about 50-66 s/frame.

## Skeptic B (phone size, 405x720): FAIL, an open judgment call
* Round 5 (1d2681c) read as a scored baguette.
* 5b is "somewhat better, but not past the food threshold": a warm capsule with roughly parallel light strokes.
* Its must-fix list: wavy or curved folds, angles varied by 15 deg or more, darker folds, a visible double membrane.
* I tried two variants within the hue, V and contrast gates:
  * **Dark, opaque folds:** invisible behind the semi-opaque outer membrane; box contrast 0.7-2.2 %.
  * **12 interdigitating, angled, wavy short shelves:** still provably non-crossing, because each fold stays in its own half of the body. Box contrast was 6.3 %, below the 11-13 % gate, and it read about the same at phone size.
* Neither beat 5b, so 5b is delivered. A clear non-food read probably needs a gate relaxed: a cooler, more see-through body (outside H 24-27 / V <= 70), or a wider framing with more organelle context around the hero.

## Files
* `phone_strip_1188-1255_step4.jpg`
* `topleft_100pct_1214_1220_1228.jpg` and `corridor_100pct_1192_1200.jpg`
* `hold_1236_1250_1255.jpg`
* `ridge_maps_axis_aligned_1236-1255.jpg`
* `co_mito_overlay_1213-1243.jpg`
