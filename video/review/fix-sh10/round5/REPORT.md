# fix-sh10 round 5 (director review of 7cd746d + lookdev pick A)

## 1 Lit cells: lookdev A + tweaks (`../lookdev/` for A/B/C)
Teal translucent bodies lit from the core (radial mask in the cell's own space, range 0.15-0.85,
k 1.2, glow capped at 1.0 = amber, never peach-white), cool teal membrane rim, fine bright
granules (also on the lit flanks), subtle broad wet sheen (coat 0.04-0.20, roughness 0.28: no thin
glint lines). Nucleus off the apex (15-35 % of the radius), oval (1.38) with a soft noisy edge,
-30 % contrast, no nucleolus dot, halo 0.10 (no visible ring). The amber light pool in mat_base
is gone. First-ring cells off the camera path are enlarged to touch the exit cell (moat closed).
## 2 1299-1302: film opacity .8/.6/.4/.2 (1299-1302), camera still until 1302.5; focus racked film →
exit cell over 1299-1302 linearly in diopters (each layer blurs in step with its fade); film lamp
held until 1302. Full quality: MAD 4.5 / 5.0 / 3.3 / 4.5 (≤ 8.5), low-pass NCC .991 / .863 /
.862 / .903 (≥ .85). Luma std 1299 .035, 1300 .021, 1301 .025, 1302 .042 (1300/1301 are
mid-rack, soft by nature).
## 3 Veil 1293-1296 .2/.4/.65/.85 (was 1295 .5 / 1296 .85).
## 4 Elevation on the real clock after the hold: max pitch change **2.9 deg/frame** (table).
Exit-cell top edge still strictly descending 1301 → 1322 (probe table).
## 5 Cost and determinism
* In-run s/frame (one run 1292-1312, 80 %, 4 cores): 8 spp 38-69 (max 1299 69.4, 1302 68.3);
  16 spp 1309-1311: 70.2 / 68.5 / 68.4. Two fixes made this fit: from 1300 a bump-free twin of the
  fading film takes over (the film's bump graph was ~30 % of those frames), and cheaper cell-bump
  inputs (noise octaves, no nucleus bump).
* All visibility changes are now done by **parking objects 10 km away** (constant location keys at
  half frames) instead of hide_render, so the object set never changes: bit-identical for any
  start frame. Tested (16-bit PNG): run 1292→ vs start 1300 (1300, 1301), vs start 1308 (1308,
  1309), vs start 1309 (1309): all **0 differing pixels**; earlier 1281→ vs start 1284: 0.
## Track (re-exported, `sh10_track.json`)
TRK_cells 1306 (540, 314), 1317 (541, 820), 1327 (541, 924), 1344 (540, 1138), 1360 (539, 1180),
1397 (540, 1197): it keeps drifting down after 1344 as the camera pulls back.
## Jobs (any start frame now renders identically): 1244-1282, 1283-1297 (interior held),
1298-1307, 1308-1350, 1351-1397.
