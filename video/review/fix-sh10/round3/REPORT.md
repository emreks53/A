# fix-sh10 round 3 (director review of 0d777cc)

Interior 1244-1297 still HELD: it carries sh09 7a82374 (incl. the hero coat streak and the T-tubule
glyphs). Both live in the shared interior; any local edit would be overwritten by the verbatim
`lib_s7.upgrade_interior_s9` import that comes as the next commit after the sh09 SHA. f1250 below is
for reference only.

## Fixed here (items 2-5)
2. **Zoom smear:** the camera is now *completely still* 1295.0-1299.5 (camera time-warp hold;
   speeds 0.0 mm/f for 1296-1299, motion-blur samples included). The keyed shutter is gone
   (it is not honoured in animation renders). Particles are round at 1296-1299
   (`f1297_100pct_crop.jpg`).
3. **Reveal:** smooth catch-up (cubic Hermite) back onto the path by t_exit+0.45 (~1305); the
   pull-back boost eases in only from t_exit+0.3. Camera speed (mm/f): 1300 2.5, 1301 19.6,
   1302 28.8, 1303 52.7, 1304 99, 1305 155, 1306 175, ... 1311 328 (peak of the reveal), then
   ~250-340 through the light-up. The dome film falls away 1299-1302. Focus follows the real
   surfaces: film → the cell under the hero (analytic ray hit) → dome tops (only when above
   them), 3-frame smoothed 1300-1312, no 0.05 m clamp. The cell under the hero is smaller
   (r 0.52) so the camera has ~25 cm of air: it is in focus from 1301, neighbours read by 1306.
4. **Glare:** driven in the compositor by its own Scene Time frame (strength 0.6 × [frame >
   1297.5]): stateless. Every per-frame state is now keyed or frame-driven.
   Determinism (full quality, 16-bit PNG), job run-through vs start-on-frame:
   1281→1284 vs 1284: identical; 1296→1300 vs 1300: max 5/65535; 1307→1309 vs 1309: max 3/65535
   (both below one 10-bit level of the farm encode = identical output).
5. **Unlit cells:** matte membrane (roughness 0.55, spec 0.3, coat 0.08), soft folds +
   microvillus stipple bump, subsurface scale 0.3 (`f1302/f1306` crops).

## Events (new / moved)
* Crossing: veil 1295, film still in the lens 1296-1299, film falls away 1300-1302, the exit cell in
  focus from 1301, neighbours 1306-1307, field from ~1308.
* Fastest pull-back in the reveal: 1311 (0.33 m/frame); overall fastest is still the exponential
  end, 1397 (3.87 m/frame).
* First light: **1317** (unchanged), wave 1327, infinity 1344.
* TRK_cells (new `sh10_track.json`): 1306 (582, 61), 1310 (560, 609), 1317 (541, 856),
  1327 (541, 923), from 1344 unchanged (540, 1138).

## Cost (80 %, 4 cores, single-frame runs incl. sync)
1296-1300 57 s avg; 1302 52; 1306 50; 1309 76; 1317 82 (incl. ~20 s sync; in-job ~60).

## Jobs (unchanged; any start frame now renders identically)
1244-1282 · 1283-1297 (interior, held) · 1298-1307 · 1308-1350 · 1351-1397
