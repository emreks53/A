# fix-sh14a — finale 2240-2393

Fix commit: 127b1071d57b05acc701c1f8a607ba58b36df5e9 (only `video/blender/shots/sh14a.py`).

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
- A separate keyed Film-exposure curve opens about 2/3 stop over the shaded-canopy span (2242-2300).
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
  exposure goes +0.07 after the 'Allah' key. Every swell term is zero before f2358.
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
  - `reveal_2256-2286_before_after.jpg`: the NEW 2286 panel was rendered before the Film-exposure key,
    so the final is slightly brighter.
  - `sunrise_before_after.jpg`
  - `her_2262_crop100.jpg`
  - `sliver_2370_crop100.jpg`
  - `seam_2240_crop100.jpg`
