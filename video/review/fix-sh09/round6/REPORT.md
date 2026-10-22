# fix-sh09 round 6

**Farm commit: a82b349 (round 6d).** It builds on 440f25c (6c), 9c5b448 (6b) and 442c6f4 (6a). All changes are in `lib_s7.py`, inside `upgrade_interior_s9` and its helpers. `common.py` and `sh09.py` are untouched this round, and nothing that sh06 uses changed.

* **Jobs:** 1174-1214 and 1215-1255. Any start frame gives the same pixels.
* **Event frames:** no event frame moved.
* **Track:** `comp/tracks/sh09.json` (committed in 48b2f00) is unchanged, and a re-export is byte-identical.

## Look C (director pick), now on every mitochondrion
* **Materials:** `MITO_LOOK = "C"` is the default: a teal glass outer membrane over an amber matrix. `S7_LOOK` selects the other looks for lookdev only.
* **6c, after skeptic B failed the chains on 6b ("golden loaves"):**
  * **Corridor chains:** a dimmer matrix (emission 140 -> 55), a denser teal film (face alpha 0.42) and dim folds (edge glow max 5.4 -> 2.2). They now read as teal-grey organelles with faint amber folds, not glowing loaves.
  * **Near out-of-focus pair:** its own unkeyed dim interior (4.0) under the 0.08 teal veil. These are soft grey-teal shapes, not amber "linked sausages".
  * **Hero:** a warmer matrix (end emission 3.5 -> 7.0), and the inner-membrane rim line is x3 (was x2).
* **6d, after skeptic B2 on 6c ("interior teal-grey, folds pale cream, reads as baguette scoring"):**
  * The matrix absorption now transmits amber (0.85, 0.55, 0.22), where it was a grey-green (0.55, 0.60, 0.55).
  * The teal face alpha is thinner (0.30 -> 0.20), so the amber interior shows through the glass.
  * The folds are a saturated amber (emission colour (1.0, 0.42, 0.04), hero edge glow max 2.8 -> 2.4) instead of pale cream.

## Folds (hero)
* **Placement:** 7 folds are rooted on the inner membrane on alternating walls. Reach is 75-95 % of 2R; end folds are 70 %. That is about 60-75 % of the visible width, where 6b reached 40-50 %.
* **Shape and thickness:** th is 0.0007, and the folds are sinuous (1-2 periods) with some Y-forked tips.
* **Shading:** `_shelf_shading` gives a lit edge on +Y, a shadowed side on -Y and a brighter root at the wall.
* **Spacing:** strict y-disjointness is relaxed (gap 1.35 x ext) per the client's rule change. Natural crossings are allowed; prominent crosses are not, and there are none.

## Gates on a82b349 (full quality, 864x1536; hero = exact projected silhouette)
| Frame | R>=254 | OLD box contrast | Silhouette centroid |
|---|---|---|---|
| 1236 | 0 | 32.6 % | (422, 699) |
| 1244 | 0 | 19.3 % | (420, 686) |
| 1248 | 0 | 16.6 % | (420, 680) |
| 1250 | 0 | 14.8 % | (419, 678) vs TRK_mito (428, 675) |
| 1255 | 0 | 14.5 % | (418, 677) |

* **Clipping elsewhere:** R>=254 is also 0 at 1173, 1192, 1200, 1214, 1220 and 1228.
* **Clearance:** 0 of 112 bodies have vertices inside a fibril.
* **Determinism:** 1229-1231 vs 1230-1231 is bit-identical (maxdiff 0).
* **Join:** a fresh 1173 is 0.40/255 from the farm frame.
* **Track:** re-exported, byte-identical to the committed `sh09.json`.
* **Cost:** 64-88 s/frame on this session's host, which is about 1.41x slower than the round-4 host. That is about 45-62 s/frame normalised; the hold is 70-75 s here.

## Skeptics (independent subagents, fresh each pass)
| Pass | Code | Skeptic | Verdict | Main points |
|---|---|---|---|---|
| 1 | 6b | A: crosses, artefacts, geometry | Crosses, clipping, flicker and geometry PASS; food read FAIL | Lower-left near pair read as linked amber sausages; a pale T-tubule hook at 1196-1208 |
| 1 | 6b | B: phone read | FAIL | Hero no longer bread; folds short; corridor chain still "golden loaves" -> fixed in 6c |
| 2 | 6c | A: artefacts | All PASS except folds partly not touching the inner membrane | No cross, R>=254 0, no fireflies, smooth 1236-1255, left cap x 81/71, low end never cut |
| 2 | 6c | B: phone read | FAIL | Interior teal-grey, cream folds read as scoring -> 6d warmer |
| 3 | 6d | C: phone read | FAIL (crosses and clipping PASS; fold roots a marginal PASS) | 1214-1233 hero still reads as a hot dog/baguette; near defocus bodies "spotted"; fold alternation weak |

* **Hard rules on 6d:** no prominent cross, no clipping, no fireflies, no text, no human element, left cap >= 40 px, and the low end is not cut after 1205.
* **Open judgment call:** the phone-size food read. The skeptics disagree with each other and drift between passes: A2 says the corridor reads as organelles, while C says the defocus bodies read as seeded loaves.
  * I tried moving the hero glow key earlier (1200-1222 instead of 1215-1240) for 1214-1233. It made no visible difference, so I reverted it.
  * If the director still sees food at 1214-1233, the next lever is the look itself: a thicker teal film on the mid-distance hero, or fewer and thinner folds. That would go beyond look C as picked.
* **Known, left as is:** one T-tubule ring shows as a soft pale hook at the left edge at 1196-1214. It is an anatomically correct T-tubule partly hidden by its fibril, and it carries no cross read.

## sh10 hand-off
sh10 calls `L.upgrade_interior_s9(inter, wave, frames)` with the same wave right after `build_fibre_interior()`. It gets look C, the folds, the membranes, the T-tubule clean-up and the hero matrix key from this commit, so the f1250 cut matches by construction.

## Files
* `phone_strip_1188-1255_step4.jpg`: 50 % renders scaled to 180x320.
* `hold_1236_1250_1255.jpg` and `f1250_100pct.jpg`
* `corridor_100pct_1192_1200.jpg` and `topleft_100pct_1214_1220_1228.jpg`
* `co_mito_overlay_1213-1243.jpg`: the callout overlay composited on the track.
