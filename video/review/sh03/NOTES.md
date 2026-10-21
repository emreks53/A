# sh03 — the sofra (9.64–16.00 s) — review 4

Script `video/blender/shots/sh03.py`; set/rig in `video/blender/lib_s4.py` (shared with sh02).

## Director notes (review 2 REVISE) — point by point
1. **Brightness**: warm 4000 K bounce lights, sky fill 220 W, clamp_indirect 10, exposure lifted, wood
   saturation −15 %. Measured on stills: sun patches near-white, mean 0.40–0.64, almost nothing < 0.06
   except the deep window-wall shadow in the top-down (see `lum` numbers in the status message).
2. **Cut**: same shared boom path as sh02 through 10.45 s (28 mm and f/2.8 at the cut, easing to 35 mm and
   f/4 by 10.3 s). sh02's curtain (from the shared disk cache), shafts, motes and gust are present and
   dropped from the render after f250. The camera slides at ≤0.5 m/s.
3. **Water**: the jet is pure transmission with constant topology (radius mask instead of trim, so it
   motion-blurs), wobble 0.0025, a splash crown with flung droplets at impact, ripples, meniscus and a dense
   bubble core under the impact. A glossy/refraction-only strip light behind the glass makes the edges
   sparkle. The camera now looks across the table toward the bright lime wall. The orange half-loaf was
   moved off the sight line, so the water no longer reads as tea.
4. **Bread**: golden-brown crust, no all-over crackle, three slashes with sharp burst "ears", flour only in
   the cuts (vertex attribute), sheen 0.05. Plus a **half loaf with the open crumb** facing the camera. The
   whole loaf sits in a sun stripe at 9.4–10.0.
5. **Abundance**: olives in a small wooden bowl, beyaz peynir on a saucer, a honey jar with a spoon,
   walnuts, the tea glass on its saucer, the filled tumbler, and a loose lemon and apple, all in the same
   light. The half loaf, olives, cheese, plate, bowl and glass are inside the top-down.
6. **Takdim**: 45° oblique hold to 15.2 s. The plate slides 14 cm toward the lens (+X, 14.45 → 15.15 s),
   then the crane settles top-down by 15.95 s. The plate ends at y ≈ 1330 px.
7. **Pour hold**: PCHIP (monotone) camera interpolation. One eased push 10.45 → 11.9 s, no dip.
8. **Pomegranate membranes**: curved, irregular (no straight spokes).
9. **Top-down end**: up-vector (−1, 0, 0) (window/light at the top, matching sh04). The bowl sits at
   y ≈ 1060 px so its rim stays below the 520–820 band. The band holds only plain lit table.
10. **LIGHT_SETUP_S4.md** updated.

## Render (measured, 4 cores, 100 %, 12 spp, adaptive min 8, OIDN ACCURATE)
* Pour frames 270–272: **56.9 s/frame**. 100 % crops: `crops/sh03_crop_f270-272.png`.

## Tracker
`TRK_water` at the glass (table + 6 cm), on screen through the whole pour.
