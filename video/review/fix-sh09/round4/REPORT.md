# fix-sh09 round 4: diagonal hero, visible folds and rim

The fix commit is c17c93b, which builds on bdb3e3d. It changes `lib_s7.py` only, by additions and edits to the round-3 functions. No pre-existing lib function is changed. The re-render range is 1174-1255.

## What changed (all inside `lib_s7.upgrade_interior_s9`, so sh10 gets it unchanged)
* **Roll:** the hero is rolled -30 deg about the view axis around its own centre. It lies diagonally like the textbook mitochondrion. TRK_mito is a child at its centre, so the callout is unchanged. The near out-of-focus pair (fgMito0/1) is rolled -30 deg too, parallel to the hero and never pointing at it.
* **Clearing:**
  * The two myofibrils that the rolled hero would cut are removed, along with their T-tubule rings.
  * No chain mitochondrion is in the way. All 112 bodies still have 0 vertices inside a fibril.
  * The near out-of-focus myonucleus0 moves 0.006 to the right, so the hero's lower end is no longer clipped into a pointed look.
* **Identity:**
  * The folds are back at the r2b visibility (alpha 0.95, glow up to 3.0). They keep the irregular, soft, no-crossing construction: 35 pairs, 0 overlaps.
  * The translucent outer membrane gets a lighter rim (rim glow 0.45, colour (1,.36,.05)) around the darker matrix, which reads as a double membrane.
  * The rough coat is kept, so there are no streaks.

## Gates (full quality, 864x1536, exact projected hero silhouette, image rotated so the long axis is vertical)
| Frame | H | S | V | R>=254 px | Ridges touching a fold | Axis band contrast |
|---|---|---|---|---|---|---|
| 1248 | 26.2 | 83% | 66% | 48 | 0 | 8.6% |
| 1250 | 26.2 | 83% | 67% | 0 | 0 | 7.0% |
| 1255 | 26.4 | 83% | 68% | 0 | 0 | 7.0% |
| 1244 | 26.0 | 84% | 65% | 121 | 0 | 9.4% |
| 1236 | 25.1 | 83% | 55% | 0 | 0 | 12.7% |
| 1210-1220 | 22-25 | - | - | 0 | 0 | 6-26% |

* **Band contrast scale:** the r2b frame scores 6.4% at f1250 on this same axis measure (13% on the earlier box measure).
* **Centre:** the silhouette centroid at f1250 is (417, 680) vs TRK_mito (428, 675).
* **Foreground glints:** on the foreground bodies' own silhouettes they are at most +10 at 1250-1255. The higher peaks elsewhere are silhouette edges against dark fibrils, or bodies seen through the near veil.
* **TRK_mito:** the visible path (58 frames) is identical to before, 0.00 px. Only the parked off-screen positions outside the callout window changed. comp/tracks/sh09.json needs no update. The real co_mito overlay lands centred on the body over 1213-1243.
* **Checks:**

  | Check | Result |
  |---|---|
  | Join | 1173 is 0.40/255 from the farm frame |
  | Determinism | 1229-1231 vs 1230-1231: bit-identical frames 1230 and 1231 |
  | Cost | 50-62 s/frame on 4 cores (65 s at f1173) |

## sh10 import note
After `inter = L.build_fibre_interior("interiorRoot", Matrix.Translation(H), fibre_c=HO["fibre_c"], fibre_r=HO["fibre_r"], y_half=HO["y_half"], seed=909, cristae_wave=wave)`, sh10 calls:

```python
new = L.upgrade_interior_s9(inter, wave, frames)      # frames = the shot's absolute frame list
interior = inter["objects"] + new                      # inter["objects"] is pruned in place
```

* **Same arguments as sh09:** `wave` must be the same dict as sh09's (t0 = word('olup') - 0.05, speed 0.09, origin H - (0, 0.03, 0), axis (0, 1, 0), width 0.014, gain 7.0).
* **Absolute frames:** the hero key (HERO_KEY 1215-1240) uses absolute frames, so sh10 frames 1244 and later get the end value.
* **What it does:** the roll, fibril clearing, nucleus shift and nudges all happen inside the call, so sh10 needs no other change.
* **Key every interior object:** any `hide_render` keys must be applied to the returned and pruned lists, as sh09 does.

## Files
* `phone_strip_1210-1255_step5_r3_top_r4_bottom.jpg`
* `f1236_100pct_r3_r4.jpg` and `f1250_100pct_r3_r4.jpg`: 100% crops.
* `ridge_maps_axis_aligned_*.jpg`
* `co_mito_overlay_*.jpg`
