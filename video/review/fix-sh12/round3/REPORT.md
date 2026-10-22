# fix-sh12 round 3: sea glint pop at f1554->1555

Fix commit: 136bd88. It changes only the sea's Specular IOR Level keys in `sh12.py`.

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
* **New schedule:**
  * Before f1552: 3e-5, a faint glint column, so the sea reads as water from the first frame.
  * f1552-1560: geometric steps to 0.2, linear between integer frames. It crosses ~1e-2 on the link_sea
    tick (f1557).
  * From f1560: exactly 0.2.

## Proof (`glint_stats.txt`, `strip_1546_1564_old_over_new.jpg`)
* **Pop removed:**
  * The old step in the box mean at f1555 was +15.3 (core +50.8).
  * The new box-mean steps run from -6.3 to 0.0; they fall because the veil keeps clearing.
  * The new glint core rises smoothly, 217 -> 236 over f1552-1557, with steps of +1.8 to +5.1.
* **Identity:** frames 1560-1563 are bit-identical to a 16-bit render of 9273247 (max diff 0). Versus
  the farm encode, the difference at 1561-1563 is encode noise only (mean 0.5-0.8 of 255).
* **Determinism:** a run started at 1555 matches the run started at 1546 at 1555-1556 (max diff 0).
* **Cost:** about 110-115 s/frame on this machine for 1546-1564. That is the same cost as 9273247 over
  1558-1563 (114.9 s/frame), so the change adds nothing. The veil/wisp section is heavier than the
  descent.
* **Re-render range:** 1526-1559. The specular before f1552 changed from 0 to 3e-5, so frames from
  1526 on differ; frames from 1560 on are unchanged.
