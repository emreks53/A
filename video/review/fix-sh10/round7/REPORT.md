# sh10 round 7: no push-to-pull snap in the 1247-1252 dissolve

**Farm commit:** `4887b7b84281b9cefe29cbf0338c189d77d43db3` on `render-fix-sh10`. Only `sh10.py` changed, on top of b1ac91e.

## Fix
The change is to the camera distance only.
- `dist_at`, `t_exit` (still f1294.70), warp, look-at, focus logic, lights, handheld noise and cristae are unchanged.
- **Through f1252** the probe follows sh09's own creep. That is sh09.py's formula: local x = QX + (x_handoff − QX)·creep/creep(f1250), with QX = −0.1821183, t_cross 49.45 and t_e = sh09 end + 0.25. It reproduces every sh09 key to 1e-8, and f1250 is exactly d = 0.03.
- **From f1252 to f1288** the log-distance speed rises monotonically: v = vA + (vR − vA)·(1 − (1 − s)^n).
  - It starts at vA = −0.60 %/f, sh09's push-in, crosses zero at about 1253.5, and ends at vR = +5.89 %/f, the path's speed at f1288. There it rejoins `dist_at` in value and in speed.
  - n = 3.61 and the start acceleration is 0.65 %/f².
  - It is never faster than the path at 1288, so the catch-up adds no overshoot. b1ac91e already ran at 5.9 %/f there.
- **f1279 rejoin:** not possible within the step gate. The path is already at 5.0 %/f there, so the same ease would need a 1.15 %/f² start, or a hard-cornered 0.67 ramp.
- Per-frame distances and speeds, new and old, are in `camera_keys_1244-1291.txt`.

## Gates (farm settings: 8 spp, OIDN, 864x1536)
1. **f1250 vs sh09 (a82b349):** MAD **1.735**/255, 60-px block mean 0.98 and max 6.64. That is the seed-noise level, as in round 6. New vs old sh10 f1250: MAD 0.40, because only the motion-blur shutter changed.
2. **Scale sh10/sh09 on 1247-1252:** **+0.02 %** on every frame, measured by image registration; analytically the cameras are identical. Old b1ac91e was −3.8 % at 1251 and −7.5 % at 1252.
3. **Composite 1246-1262 with the 6-frame dissolve** (`composite_1246-1262_dissolve_1247-1252.jpg`, 100 % crops at 1248/1250/1251): **one outline**, no ghost rim.
   - Measured scale change per frame (+ = growing): 1247 +1.46, 1250 +1.03, 1252 +0.64, 1253 +0.24, 1254 −0.32, 1256 −1.44, 1258 −2.27, 1260 −3.01, 1262 −3.59.
   - The scale is monotonic after 1253. The largest step is **0.57 %/f**, the peak is **3.59 %/f** and the largest |dY| is **3.4 px** (`measure_scale_1247-1262.json`).
4. **Join (16-bit, new vs b1ac91e code):** f1288 is seed-level (max 5/65535, MAD 0.0002/255), because the shutter reaches back to the changed key at 1287. f1289 and f1290 are **bit-identical**. Every camera, focus and fstop key from 1288 on is identical.
5. **Any start:** 1255 and 1256 started at 1255 are bit-identical to the run started at 1246.
6. **TRK** (`round7/sh10_track.json`, TRK_cells 1244-1397, re-exported from 4887b7b): identical to round 5. TRK_cells is on the optical axis and hidden before 1288, so a pure dolly along that axis leaves it in place.

## Jobs
- **Re-render: 1244-1288** (1288 only seed-level). Frames 1289 onward match b1ac91e bit for bit.
- **Split:** 1244-1279 (36 frames × ~53-58 s ≈ 33 min) and 1280-1288 (9 frames, ≈ 9 min). Use 1280-1307 instead if the farm wants the old chunking (28 frames ≈ 33 min).
- **Measured in-run cost:** 1246-1262 at 50.6-65 s/f.
