# Studio S4 — morning-room light rig (sh02 / sh03) — for S5 (sh08) to match

All values live in `video/blender/lib_s4.py` (`light_rig()` + constants at the top). S5 can simply
`import lib_s4 as S; S.light_rig(exposure=...); S.build_room(); S.build_table()` to get the identical
room, window and table, or copy the numbers below.

| item | value |
|---|---|
| HDRI | Poly Haven **`garden_nook`** 2k EXR (morning garden). Measured sun pixel u=0.5994 → elevation **25.9°** |
| HDRI mapping | Z rotation = `S.hdri_rotation_deg()` (≈ −13.8°) so the HDRI's sun sits exactly behind the sun lamp; HDRI values clamped at 60 (sun lamp replaces the HDRI sun) |
| HDRI strength | 1.0. World is visible to camera / glossy / transmission rays only (`world.cycles_visibility.diffuse = False`) |
| Sun lamp | `C.sun(elev_deg=25.9, azim_deg=-112, strength=9.0, kelvin_k=5000, angle_deg=0.9)` → light travels **+X (into the room) and slightly −Y**, i.e. from the LEFT of a camera looking +Y along the table |
| Sky fill | Area light 0.90 × 1.30 m filling the window opening (outside face, x = −1.47), **220 W, 7500 K**, spread 160°, invisible to camera/glossy. World is NOT importance-sampled inside the room (`world.cycles.sampling_method = NONE`) |
| Warm bounce | `TableBounce` 0.9 × 0.75 m lying on the sun patch facing up (45 W, 4000 K) + `RoomBounce` card 1.6 × 1.2 m at x = 1.9 behind the cameras facing −X (90 W, 4000 K); both invisible to camera/glossy |
| Ground bounce | Area light 0.90 × 0.50 m at the lower window, tilted 75°, **77 W**, colour (1.0, 0.86, 0.66) |
| View | AgX, "Medium High Contrast" (library). Exposure **0.55** (`S.ROOM_EXPOSURE`; sh02 opens +1.5 EV on the flare and settles by 6.2 s). Render: clamp_indirect 10, diffuse 2 / glossy 2 bounces, light tree off |
| Geometry | Window wall interior face x = −1.00 (0.45 m deep reveal), opening y −0.05…0.85, z 0.98…2.28; table top **z = 0.76**, table x −0.97…0.58, y −0.12…0.86, `wood_table_worn` box-mapped at 0.62 repeats/m |
| Lens look | f/2.8, 7 blades, 180° shutter (library). Light shafts: emission volume masked by the analytic window projection × HG(g 0.6) phase (`S.build_beam_emission`, biased volume); light compositor bloom (`S.comp_sunbeams(beams=False)`). |

Apple in sh03: Poly Haven `food_apple_01` 1k, unmodified material. Table wood is `wood_table_worn` at 0.85 saturation.
