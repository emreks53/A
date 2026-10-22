# fix-sh10 round 4 (director review of d935f53): crossing 1299-1306 + lit cells

Interior 1244-1297 still HELD (separate commit after the accepted sh09 SHA).

1. **1299 smear:** camera keyed at quarter frames 1293-1311 (`cfr`), so the shutter samples follow
   `warp()` exactly. In-shutter travel 1296-1300: **0.005-0.006 mm** (handheld noise only); 1301
   0.005, 1302 5.0, 1303 11.9, 1304 19.9 mm (`camera_focus_probe.txt`).
2. **1300 blank:** the probe now holds still until 1301.5 while the film fades out (1299 1.0,
   1300 0.59, 1301 0), then moves. Luma std (0-1): 1299 0.041, 1300 0.030, 1301 0.058,
   1302 0.061, 1303 0.064 (film particles at 1300, the exit cell from 1301).
3. **Focus:** 1296-1300 on the film (ray-cast), from 1301 straight on the exit cell (analytic
   ray hit), no film blend, no smoothing: 265 / 268 / 286 / 317 / 349 / 445 mm over 1301-1306
   (the hit point on the near flank); cell crisp in `f1301/1304/1306` crops.
4. **Nod:** through the reveal the lens aims at the exit cell's centre (the path's own target),
   handing back by 1322. Top edge of the exit cell (1920 grid): 197, 202, 227, 272, 322, 409,
   475, 519, 564 ... 824 at 1322 - strictly downward from 1301, one accelerating pull-back
   (speeds 5 → 177 mm/f by 1312).
5. **Lit cells 1327-1344:** footprint 0.95 → 1.02, jitter 0.20 → 0.15, regional size ±12 % (cells
   edge to edge), a bright membrane rim when lit, per-cell mottling offset and scale (6-12).

Determinism: 1303 from a run started at 1298 vs started at 1303: bit-identical. 1301 unchanged
by the 1300 tweak (bit-identical).

**TRK_cells (honest):** it does NOT stay put after 1344 - y drifts 1138 (1344) → 1180 (1360) →
1195 (1380) → 1197 (1397) as the camera keeps pulling back (the same drift existed before this
fix; the round-3 report wrongly said "unchanged"). New values: 1306 (540, 281), 1310 (540, 688),
1317 (541, 859), 1327 (541, 925), 1344 (540, 1138). Full track: `sh10_track.json`.

Cost (80 %, 4 cores, in-run average incl. sync): 1298-1312 67.7 s/frame; 1300-1301 69.7.
Jobs unchanged: 1244-1282, 1283-1297 (held), 1298-1307, 1308-1350, 1351-1397.
