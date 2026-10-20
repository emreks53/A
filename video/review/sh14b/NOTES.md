# sh14b — The light covered (99.50–104.20, render frames 2382–2506) — studio S2

**Review round 1.** `video/blender/shots/sh14b.py` (+ `lib_s2.py`). Assets: Poly Haven `vintage_oil_lamp`,
`dark_wood`, `plastered_wall_04` (CC0).

## Build
* Dark room: worn dark-wood table, rough plaster wall 1.15 m behind, near-black world.
* Poly Haven `vintage_oil_lamp` (0.8 m with its tall chimney). The model's alpha-card chimney was replaced by real
  thin clear glass with a soot film toward the top; shadow rays pass through it so the flame lights the room
  without caustics. Flame = the model's flame card made emissive + a 1850 K point light (+ soft fill) with
  flicker (energy + flame-scale noise).
* **"Shadow sweeps in"** (opening beat, continues sh14a's exit): warm 3600 K window light from the right lights wall,
  table and lamp; 99.45 → 100.6 an occluder slides across it so a soft shadow edge sweeps over the wall/table and
  leaves only the lamp's glow → chiaroscuro.
* **Velvet cloth:** 1.7 m square, 72×72 grid, cloth sim (mass 0.35, bending 1.2, self-collision, high friction)
  **baked inside the script** with the point cache starting at the drop frame (örtmek − 0.42 s), so any render range
  gives the same result. It is held motionless above the frame until then, falls, tents on the chimney exactly
  on **"örtmek" (102.38)**, then slumps and drapes around the globe down to the table. Material: near-black
  burgundy velvet (Principled sheen 1.0 with low-frequency pile-crush variation, fibre bump) with 16 % translucency
  so the flame glows through the thin peaks and folds.
* Camera: 50 mm, f/2.4, slow push-in + drift, light handheld. Exposure rides +0.35 → +0.8 EV after the cover so the
  leaking glow stays readable (rich blacks preserved).

## Stills (50 %)
* `099.300` first frame — daylight on the lamp, about to be cut off
* `100.000` shadow sweeping across
* `101.500` dark space, lamp glow, wall falloff
* `102.380` "örtmek" — cloth descending into frame, lit from below
* `102.700` cloth tenting over the chimney, glow at the peak
* `104.400` last frame — draped; light leaking through the folds

## Measured render time
*pending* (posted after the sh14a measurement).

## Known issues / next round
1. Final drape hangs asymmetrically (slides to camera-right) — will tune initial offset/friction so it settles
   centred and spreads on the table, and add a visible light spill from under the hem.
2. Light leak under the hem is still weak; plan: raise flame light + slightly lift hem gap.
3. No key words during this shot; whole frame free.
