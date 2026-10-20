# sh14b — The light covered (99.50–104.20, render frames 2382–2506) — studio S2

**Review round 3.** `video/blender/shots/sh14b.py` (+ `lib_s2.py`). Assets: Poly Haven `vintage_oil_lamp`,
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
Heaviest frame f2465 (cloth tenting): 48 spp/accurate denoise = 158 s → now **12 spp + FAST/BALANCED OIDN ≈ 36 s/frame** (10 spp measured 33 s; visually identical to 20 spp). Cloth bake adds ~35 s once per Blender run (per 48-frame chunk).

## Round 3 = director's round-1 notes
1. **The light is the hero** — the chimney is rescaled to natural proportions (~0.22 m glass). The camera is an
   85 mm, f/2.8 slow push, with the lamp at ~45–50 % of frame height. The flame is the model's flame + a 70 W 1850 K
   point light with flicker, plus a soft glow halo inside the glass. Strong warm spill and falloff on the table and wall.
2. **Heavy velvet, thrown from one side** — a 1.5 m near-black burgundy velvet (sheen on the folds, a faint 2600 K
   room bounce draws them). It enters tilted from camera-left (offset 0.17 m, rolled 16°), heavier
   (mass 0.9, bending 4, air damping 4), catches the chimney top on "örtmek", then collapses asymmetrically and pools
   on the table on the left. It no longer reads as a lampshade/umbrella. A render-invisible collision cap on the
   chimney keeps the thin glass from piercing the cloth.
3. **The leak** — the short side (right/front) hangs above the table, so a glowing gap at the hem spills a pool of
   warm light onto the table. A trace of glow comes through the stretched top (0.3 % translucency). Exposure
   rises to +0.95 EV in the last second so the light that "refuses to be covered" stays clearly visible, with
   rich blacks elsewhere.
4. `crop100_f2464-2466.png`: 100 % crops of a dark, defocused area on 3 consecutive final frames — clean.

## Round 2 changes
* The cloth used to slip through the thin chimney; a render-invisible collision proxy (cylinder + rounded cap
  over the chimney top) now holds it, so the velvet tents on the lamp and drapes straight down, centred.
* Velvet now reads as heavy and dark: translucency 0.7 % (enough to glow through the thin, stretched folds near the
  flame), wine sheen tint, faint 2600 K room bounce from camera-left draws the sheen on the folds. Rich blacks.
* 12 spp + fast OIDN → **36.5 s/frame** measured on f2464–2466 (round 3).

## Known issues
1. Light spill from under the hem onto the table is subtle (hem rests close to the table) — can open a gap if wanted.
2. No key words during this shot; whole frame free.
