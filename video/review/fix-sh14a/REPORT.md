# fix-sh14a — finale 2240-2393

Fix commit: d712709e710ad897b2c52d5761449be32067357a (only `video/blender/shots/sh14a.py`; supersedes 127b107).

## s5-1 'her şeyi gören' (f2262-2286)
- Frames before 2240 are untouched. The v1 camera path is kept exactly for t < 2240/24, and the
  field corridor still comes from it, so the seeded plant layout is unchanged.
- The new move from f2240, C1-continuous with v1, has three steps:
  1. **Crane.** The camera rises to z 3.8 m while holding the hero and zooming 100→32 mm.
     - z ≥ 2.6 m from f2244.
     - Nearest head ≥ 1.5 m from f2253.
  2. **Orbit**, starting at f2252.5. Its angular speed is the ease envelope divided by the focal
     length, so screen speed stays constant at about 30 px/frame (180° shutter, so blur is about 15 px).
  3. **Focus rack**, after the lift. Focus distance (log) goes from the hero to 26 m over f2255-2267.
     v1 lerped the focus point instead, which swept the focus plane through the lens.
- Director round: the down-sun reveal front-lit the rays and AgX washed them to cream. The sun lamp is now eased to 50%
  over 2242-2310 and a separate keyed Film-exposure curve lifts 1.5x over 2242-2300 (highlights down, shade up).
  Petals stay golden-yellow, matching 2230/2355. The light-green centre at 2262 is the hero head's young florets,
  the same look as the approved macro.
- Sharpness (Laplacian variance, quarter res, verifier's measurement), old → new:

  | Frame | Old | New |
  |---|---|---|
  | 2256 | 1.3 | 514 |
  | 2262 | 1.6 | 501 |
  | 2280 | 19 | 1026 |

- Head motion (px/frame) is above the ~30 px target in two short spans:
  - 2244-2250 crane: up to about 99. The background is defocused and the hero stays sharp.
  - 2258-2276 reveal: 45-70, while the zoom finishes.

## s5-6 'Allah' sunrise (98.4-99.3 s, f2362-2383)
- **Lens bloom.** A camera-only additive emitter sits 1 m out along the fixed sun direction (no keys
  except strength). Its profile is a Lorentzian bloom plus a broad warm veil over the field.
- **Sky.** It turns a deeper, more saturated gold. A brighter sky goes cream under AgX.
- **Sun lamp and haze.** The sun lamp gets warmer and stronger, the haze turns golden, and view
  exposure goes +0.07 after the 'Allah' key. The sky tint was softened so the far side of the sky reads as lens veil. Every swell term is zero before f2358.
- **Mean luma** (0-255), measured on 50% test renders of the final settings:

  | Frame | Mean luma |
  |---|---|
  | 2362 | 124 |
  | 2378 | 134 |
  | 2392 | 129 |

  The drop after 2378 is mostly the camera still panning to its end framing.
- **Sliver.** The thin white sliver was a grazing sun glint on the head necks (SF_stem). It is fixed
  by keying the stem material matte (roughness 0.85, spec 0.04) over 2280-2300.

## Proof
- **Determinism.**
  - 2255-2256 vs 2256 (with the round-2 keys): 0 px differ.
  - 2261-2263 vs 2262-2263: 0 px differ.
  - 2257-2258 vs 2258: 0 px differ.
  - Verifier, 2361-2362 vs 2362: 0 px differ.
- **Seam.** The new f2240 matches the old final f2240 (RMSE 0.6%, against 5.7% between consecutive
  frames). Verifier: 2238-2240 at 44-46 dB.
- **Cost** at full quality on 4 cores:

  | Frames | s/frame |
  |---|---|
  | 2240-2250 | 57-59 |
  | 2256-2274 | 46-51 |
  | 2286-2300 | 39-42 |
  | 2340-2392 | 30-31 |

- **Files.**
  - `reveal_2256-2300_before_after.jpg`
  - `sunrise_before_after.jpg`
  - `her_2262_crop100.jpg`
  - `sliver_2370_crop100.jpg`
  - `seam_2240_crop100.jpg`

## Round 3 (director notes) — fix 337ae851d5d011ca012e42fd74f975e5c9f97afe
The final look is baked into the code defaults; no env overrides are needed. The build log prints SUN_DIP, SUN_WHITE, FILM_LIFT and SU.

**Swell SU values:**

| Key | Value |
|---|---|
| sun | +0.5 |
| kelvin | 3800 |
| haze | (.80,.55,.20) |
| glare_col | (1,.70,.40) |
| wash | 0.4 |
| tint | (1,.72,.45) |

The sun and wash were lowered further than the director's suggested values (sun 7, wash 1.4) to meet the field-mean range. All other values are as specified.

**Film exposure keys:** 1.0 at 2242, 1.5 over 2258-2300, 1.0 at 2336.

**Sun lamp:** the sun dip recovers over 2278-2300. The sun also whitens by +600 K over 2270-2296; without this, petals at 2286-2298 read peach 0.20-0.24.

**Metrics** (`r3_metrics.txt`, 50% final spp; my own metric script):

| Frames | Measure | Result |
|---|---|---|
| 2384 / 2393 | lit-petal hue | 38.1 |
| 2384 / 2393 | lit-petal sat | .94 / .93 |
| 2384 / 2393 | peach share | .01 / .02 |
| 2384 / 2393 | top-right sky R-B | 56 |
| 2384 / 2393 | field mean | 69.6 / 68.6 |
| 2384 / 2393 | frame mean | 128.7 / 127.5 |
| 2296 / 2300 | frame mean | 57.8 / 61.1 |
| 2296 / 2300 | field mean | 28.0 / 28.7 |
| 2296 / 2300 | sky | 149 / 153 |
| 2256-2312 (25% sweep) | peach | ≤ .13 |
| 2256-2312 (25% sweep) | hue | ≥ 38.4 |
| 2256-2312 (25% sweep) | cream | ≤ .026 |

Frame mean (25% sweeps of 2256-2344 at step 2 and 2348-2393 at step 4) peaks at about 131 over 2372-2380. The largest drop between sampled frames is 1.02%.

**Determinism:** 2383-2384 vs 2384 alone: 0 px differ.

**Full-quality render time** (4 cores): 53-54 s/frame at 2296, 42-44 s/frame at 2384 and 2393.

**Evidence image:** `r3_compassion_allah.jpg`

## Round 4 (director notes): fix fd913f0db1935d8fae02a6bf5b616eb413ffb4b8
In r3, several front-lit heads at the left edge bleached to cream "daisies" over 2286-2310. The cause was sun x film reaching 16-17.5, plus SUN_WHITE.

**Changes:**
- The sun dip now recovers over 2296-2326.
- SUN_WHITE is removed.
- Sun x film is now 8.2 @2290, 8.5 @2296, 9.1 @2300 and 12.3 @2310, with a max of 14.5 after that. The build log prints these values.
- The lift on 'her şeye şefkat eden' now comes from the sky:
  - The tint moves from the base to the SU tint over 2280-2300.
  - Over 2280-2340 the tint is a richer SKY_WARM (1,.66,.36). With k = .25 and the SU tint alone, the sky8 saturation was only .23-.24.
  - bg strength is multiplied by (1 + 0.40 * sky_up(2278-2340)). k = .40 is the allowed maximum, needed for the 2296 mean floor.

**'Allah' is locked:** a curve dump shows all 44 animated curves equal 337ae85 over 2384-2393. The 50% stills are identical to r3 (mean 128.68 / 127.53).

**Pass checks** (my metric script; 50% stills in `r4_metrics.txt`):

| Check | Frames | Result |
|---|---|---|
| Cream / lit S / lit hue / peach | 2290, 2296, 2300, 2310 (50%) | 0 / .79-.95 / 37.1-38.2 / ≤ .13 |
| Cream / peach / sat (25% sweep) | 2286-2312 | ≤ .001 / ≤ .15 / ≥ .78 |
| Lit hue (25% sweep) | 2286-2312 | ≥ 37.1, except **36.94 at 2298** (about 860-px sample) |
| Mean / field / sky25 / sky8 S / sky8 hue / G>B | 2296 | 53.7 / 22.4 / 136 / .29 / 32.3 / yes |
| Mean / field / sky25 / sky8 S / sky8 hue / G>B | 2300 | 57.3 / 22.7 / 147 / .28 / 33.3 / yes |
| Largest drop between sweep frames | 2256-2393 | -0.92% |
| Luma peak | sweep | 2376 (130.8) |

**Determinism:** 2309-2310 vs 2310 alone: 0 px differ.

**Full-quality render time** (4 cores): about 46-47 s/frame at 2310. The rest is unchanged from r3.

**Evidence images:**
- `r2_r3_r4_2290-2310.jpg`: phone-size side-by-side at 2290, 2296, 2300 and 2310.
- `r2_r3_r4_2296_leftedge.jpg`: left-edge heads at 2296.
