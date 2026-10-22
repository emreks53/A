# FIX ISSUE FILE: sh13a

Read video/fix/FIX_BRIEF.md first.

* Shot(s): sh13a
* Your branch: render-fix-sh13a
* Base commit: a9d18535b8d637fd08d6bc3fba700b2d12a20e17 on origin/render-jobs
* Files you may edit: video/blender/shots/<your shot>.py
* Current final frames (chunks in git, branch:path):
  - sh13a: 1774-1821 from render-dev-s2:video/renders/sh13a/sh13a_01774_01821.mp4; 1822-1824 from render-dev-s2:video/renders/sh13a/sh13a_01822_01824.mp4; 1825-1872 from render-dev-s6:video/renders/sh13a/sh13a_01825_01872.mp4; 1873-1875 from render-dev-s6:video/renders/sh13a/sh13a_01873_01875.mp4; 1876-1923 from render-out-n1:video/renders/sh13a/sh13a_01876_01923.mp4; 1924-1926 from render-out-n1:video/renders/sh13a/sh13a_01924_01926.mp4; 1927-1974 from render-dev-s2:video/renders/sh13a/sh13a_01927_01974.mp4; 1975-1977 from render-dev-s2:video/renders/sh13a/sh13a_01975_01977.mp4; 1978-2025 from render-out-b01:video/renders/sh13a/sh13a_01978_02025.mp4; 2026-2026 from render-out-b01:video/renders/sh13a/sh13a_02026_02026.mp4

## What to fix
Scope: sh13a wide 1927-2026 under 'HALIK-I RAHIM ... SEFKAT': (1) no ruler-straight meadow edge and no dark bare strip at y~760-820: carry grass and flowers to the trees (or keep the far edge hidden); (2) the treeline must not be grey fog with whitish 'ghost' trunks and splayed white root flares: correct trunk albedo, uniform lighter haze, real tree silhouettes; (3) the beat: the meadow must GAIN about +0.5 stop of warm golden light from 79.0 to 81.0 s (f1896-1944) as the camera rises ('Halik-i Rahim ... genis sefkat'), instead of getting darker. KEEP the camera path and the bee/grass events, and the handles to 2026 (sh13a->sh13b dissolve).
Expected re-render: from where the change first shows (likely ~1900) to 2026.

## The verified review findings (verbatim)
### s5-5 - f1930-2020 (80.4-84.2 s), sh13a wide, under HALIK-I RAHÎM and ŞEFKAT [should_fix]
PROBLEM: When the camera rises, the background gives the shot away as CG.
- The meadow stops at a ruler-straight edge, with a dark bare strip about 40 px tall at y≈760-800 (right under the band) and small grey shrubs on it.
- The treeline is a flat grey fog layer with white trunks and splayed white root flares, like billboards.
The meaning beat is also inverted: for 'Halık-ı Rahîm … geniş şefkat' the frame should fill with warm light, but it gets darker.
EVIDENCE: Full-res crops at 1960 and 2010 show the hard field edge, the bare strip and the grey trees with white trunks. Mean luma falls from 0.53 at 1900 to 0.427 at 1960 and 0.412 at 1980 as the camera rises; it never brightens. The sky is pale grey-pink (R/B 1.1-1.3), not golden.
PROPOSED FIX: Re-render sh13a 1927-2026:
- Carry grass and flowers to the tree trunks with no bare strip, or keep the crane low enough that the far edge stays hidden behind grass.
- Use a uniform, lighter haze over the field and trees, and give the trunks a correct albedo.
- Ramp the sun or HDRI so the meadow gains about +0.5 stop of warm light from 79.0 to 81.0.
Stop-gap if there is no re-render: a time-keyed warm exposure ramp in post.
INDEPENDENT VERIFIER: Confirmed at full res on 1960 and 2010:
- The meadow ends at a straight edge with a dark bare strip at about y 780-820 and grey shrubs on it.
- The treeline is grey fog silhouettes with whitish trunks and splayed white root flares, which read as ghost trees and are clearly CG.
- The light inverts the beat: mean luma (my measure) is 0.475 at 1920, 0.453 at 1930, 0.416 at 1950, 0.394 at 1960 and 0.379 at 1980. It gets darker through 'Halık-ı Rahîm … şefkat' instead of warming, and sky R/B is only 1.13-1.33.
The re-render is the right fix. A time-keyed warm exposure ramp is a reasonable stop-gap.
