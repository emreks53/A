# fix-sh12 round 3: sea glint pop at f1554->1555

Fix commit: d1e001f, which replaces the timing of 136bd88. It changes only the sea's Specular IOR Level keys in `sh12.py`.

## Cause and change
* **Cause:** the specular was keyed 0 -> 0.2 over f1554-1559. The glint core saturates at any level
  above ~1e-3, so the whole glint and the sea reflection switched on in one frame. The visible range of
  the glint core turned out to be roughly 1e-6..1e-3, measured at f1550 under the veil:

  | Specular | Glint core (luma) |
  |---|---|
  | 5e-7 | 211 |
  | 1e-5 | 218 |
  | 5e-5 | 225 |
  | 2e-3 | 234 |
  | 1.2e-2 | 236 |

  The keys suggested in the round-3 notes (0.03, 0.05 ... 0.2) were tested. They saturate from the
  first frame, so there was no swell.
* **First attempt (136bd88):** 3e-5, then a geometric ramp to 0.2 over f1552-1560. The verifier failed
  it: glint-mask steps reached +12.9 at f1554->1555, and the swell peaked about 3 frames early.
* **New schedule (d1e001f):**
  * Until f1549: 1e-5, a faint glint column, so the sea reads as water from the first frame.
  * f1549-1557: a quarter decade per frame up to 1e-3, so the glint is fully on at the link_sea beat
    (f1557).
  * f1557-1560: up to exactly 0.2. This range is already saturated, so the change is invisible.

## Proof (`glint_stats.txt`, `strip_1546_1564_old_over_new.jpg`)
* **Pop removed:**
  * The glint mask is the pixels that jumped by more than 40 at the old pop.
  * Old step at f1555: glint +76.0, box +15.3.
  * New glint steps: at most +7.6 (f1554->1555); the swell runs f1550-1558.
  * New box-mean steps run from -6.3 to -0.7, because the veil keeps clearing.
* **Identity:** frames 1560-1563 are bit-identical to a 16-bit render of 9273247 (max diff 0). Versus
  the farm encode, the difference at 1561-1563 is encode noise only (mean 0.5-0.8 of 255).
* **Determinism:** a run started at 1554 matches the run started at 1546 at 1554-1555 (max diff 0).
* **Cost:** about 112-118 s/frame on this machine for 1546-1564. That is the same cost as 9273247 over
  1558-1563 (114.9 s/frame), so the change adds nothing. The veil/wisp section is heavier than the
  descent.
* **Re-render range:** 1526-1559. The specular before f1549 changed from 0 to 1e-5, so frames from
  1526 on differ; frames from 1560 on are unchanged.
* **Independent verifier:** round 1 FAIL (136bd88: steps of +12.9, swell early). Round 2 marginal PASS:
  * On its own glint mask, the largest step is +9.2 at f1554->1555, a little over ~8 (+7.6 on the mask
    above). The old pop was +74.6.
  * Core box at most +6.5; wide box at most 6.3.
  * Water look, identity, determinism and "nothing else changed" all pass.
  * The swell is at 97% of peak at the f1557 tick; its midpoint is about f1554.
