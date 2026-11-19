// lamps.js — "two lamps" metaphor (Mektubat 29, 3. Nokta), global video time t ∈ [35.3, 42.3].   v6
// "Bâki bir lambayı, bir dakika yaşayacak ve sönecek bir lamba ile mübadele etmek gibidir."
// Night interior: plum wall, Ottoman pointed-arch niche (interior on its own parallax layer), wooden ledge.
// Brass kandil (everlasting lamp) with a braided eternity ring and an orbiting glint; a wax candle with a clock
// dial that drains in ~3 s; two hands (one person off-frame left) swap them; the candle dies → night.
import { W, H, TAU, clamp, lerp, invlerp, E, seg, env, rng, noise1, noise2, css, mix, crPts, rough, roughen, fillG, dabs, strokeG, sprite, camAt, ellipsePts, glow } from '../core.js';

// ------------------------------------------------------------------ timing (video seconds)
const T = {
  irisA: 35.6, irisB: 36.1,
  baki: 36.191, lamba: 36.751, dakika: 37.531, yasa: 38.131, sonecek: 38.852, birLamba: 39.312,
  mub: 40.152, etmek: 40.712, gibidir: 41.032, nightA: 41.4, night: 41.9,
};
const FLOOD = '#F2D79A', NIGHT = '#161D2E';
const DRAIN0 = 38.08;                       // the compressed "minute" runs DRAIN0 → gibidir

// ------------------------------------------------------------------ layout (world px; the camera maps world → screen)
const LEDGE = 985;                          // top surface of the wooden ledge where objects stand
const LIGHT_Y = 991;                        // the ledge blocks lamp light below this line
const NCX = 585, NA = 232, NR = 320, NYS = 700;   // niche centre x, half-width, arch radius, spring line
const OA = NA - 17, OR = NR - 17;           // opening (inside the tile band) = where the interior layer shows
const KP = [570, LEDGE];                    // kandil base centre (its "place")
const CP = [222, LEDGE];                    // candle base centre at first
const CL = [NCX, LEDGE];                    // candle landing: the niche centre
const K_GRIP = [-140, -83];                 // kandil local: top bar of the handle loop (the hand grips here)
const K_NOZ = [165, -103];                  // kandil local: wick at the spout mouth (flame base)
const K_CEN = [0, -80];                     // kandil local: centre of the eternity ring
const R_ETER = 178, R_DIAL = 122;
const C_CEN = [0, -105];                    // candle local: dial centre
const CW = 25;                              // candle half-width (wax)

// background sprites (world region, resolution); interior layer sprite region
const BG = { x0: -130, y0: -40, w: 1200, h: 1960, s: 1.3 };
const NI = { x0: NCX - NA - 60, y0: 330, w: 2 * NA + 120, h: LEDGE + 20 - 330, s: 1.3 };

// ------------------------------------------------------------------ palette: 4 light levels [unlit, plum, rose, warm]
const PAL = {
  wall: ['#262541', '#3B2C4D', '#664260', '#B47C68'],
  wallFar: ['#211F3A', '#332846', '#573A56', '#9C6A5E'],
  wallTop: ['#1E1D36', '#2F2542', '#4F3450', '#946256'],
  lowWall: ['#1E1D35', '#2B2340', '#45304C', '#7A5254'],
  niche: ['#1D1C35', '#33243F', '#683E55', '#B67559'],
  nicheShade: ['#17162C', '#291C35', '#4F2E47', '#8E5848'],
  nicheLine: ['#2B2945', '#463251', '#82526A', '#D59A74'],
  frame: ['#3A3752', '#574560', '#906A76', '#E3B98C'],
  frameShade: ['#2C2A43', '#433450', '#6E4E63', '#BE8E6C'],
  gold: ['#4C4659', '#6E5A62', '#A88468', '#F2D08A'],
  dot: ['#55506A', '#7A666E', '#BC9A78', '#F7E2A8'],
  ledgeTop: ['#3B2C2E', '#4F3536', '#7C4D40', '#D9A06A'],
  ledgeFront: ['#2A2024', '#2A2024', '#2A2024', '#2A2024'],
  ledgeLine: ['#1F181D', '#1F181D', '#1F181D', '#1F181D'],
  under: ['#151324', '#151324', '#151324', '#151324'],
  tileGround: ['#2C2A45', '#463B5C', '#80687E', '#E6CFA6'],
  tileA: ['#212543', '#2B335C', '#334575', '#3D6A9E'],
  tileB: ['#1F2B3B', '#283E4C', '#386064', '#4F9A96'],
};
const K_ZONES = [310, 232, 178];            // kandil light pools (world radii): plum / rose / warm (warm only inside the niche)
const C_ZONES = [175, 115, 72];
const HALO_COL = ['#D99A86', '#E9B26A', FLOOD, '#FBEFCF'];   // outer → inner (rose, amber, gold, cream)
const HALO_A = [0.5, 1, 1, 1];
const K_HALO = [112, 86, 62, 40];
const C_HALO = [54, 41, 30, 19];

// ------------------------------------------------------------------ camera (world centre x,y and zoom)
const CAM = [
  { t: 35.6, x: 618, y: 948, z: 1.4 },
  { t: 36.1, x: 614, y: 948, z: 1.37, ease: E.outCubic },
  { t: 36.8, x: 611, y: 947, z: 1.355, ease: E.inOutSine },
  { t: 37.45, x: 470, y: 930, z: 1.16, ease: E.inOutCubic },   // two-lamp framing, settled before "bir dakika"
  { t: 39.0, x: 472, y: 929, z: 1.17, ease: E.inOutSine },     // slow drift
  { t: 39.6, x: 466, y: 926, z: 1.12, ease: E.inOutSine },     // small reframe for the swap, then locked
  { t: 40.93, x: 466, y: 926, z: 1.12, ease: E.linear },
  { t: 41.9, x: 585, y: 905, z: 1.6, ease: (u) => E.inOutSine(Math.pow(clamp(u), 0.55)) },   // push in on the dying candle (smooth start, builds early)
];
const camOf = (t) => camAt(CAM, t);
const REF = { x: 470, y: 930, z: 1.16 }, KI = 0.88;           // interior (niche back wall) parallax layer
const camInt = (c) => ({ x: REF.x + (c.x - REF.x) * KI, y: REF.y + (c.y - REF.y) * KI, z: REF.z * Math.pow(c.z / REF.z, KI) });
const setCam = (ctx, c) => ctx.setTransform(c.z, 0, 0, c.z, W / 2 - c.x * c.z, H / 2 - c.y * c.z);
const toScreen = (c, p) => [W / 2 + (p[0] - c.x) * c.z, H / 2 + (p[1] - c.y) * c.z];
const visRect = (c) => [c.x - W / 2 / c.z, c.y - H / 2 / c.z, c.x + W / 2 / c.z, c.y + H / 2 / c.z];

// ------------------------------------------------------------------ small geometry helpers
const rot2 = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);
const nrm = (v) => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
function bez(P, u) { const [a, b, c, d] = P, v = 1 - u; return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]]; }
/** circle polygon with angle-anchored wobble (stable while R animates) */
function ringPoly(cx, cy, R, seed, amp, N = 120, a0 = 0, a1 = TAU) {
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((a1 - a0) * i) / N, ca = Math.cos(a), sa = Math.sin(a);
    const r = R + amp * (0.7 * noise2(ca * 2.2 + 10, sa * 2.2 + 10, seed) + 0.3 * noise2(ca * 7 + 3, sa * 7 + 3, seed + 5));
    pts.push([cx + ca * r, cy + sa * r]);
  }
  return pts;
}
function polyPath(pts, path = new Path2D()) { path.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]); path.closePath(); return path; }
/** annulus band (arc a0→a1) between radii r0<r1 as one closed polygon */
function bandPath(cx, cy, r0, r1, a0, a1, seed, amp = 0.6, N = 160, path = new Path2D()) {
  const o = ringPoly(cx, cy, r1, seed, amp, N, a0, a1), i = ringPoly(cx, cy, r0, seed + 1, amp, N, a0, a1).reverse();
  return polyPath(o.concat(i), path);
}
function capsule(a, b, wa, wb, n = 8) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1e-6, ux = dx / l, uy = dy / l, nx = -uy, ny = ux, pts = [];
  pts.push([a[0] + nx * wa, a[1] + ny * wa], [b[0] + nx * wb, b[1] + ny * wb]);
  for (let i = 1; i < n; i++) { const t = (i / n) * Math.PI, c = Math.cos(t), s = Math.sin(t); pts.push([b[0] + (nx * c + ux * s) * wb, b[1] + (ny * c + uy * s) * wb]); }
  pts.push([b[0] - nx * wb, b[1] - ny * wb], [a[0] - nx * wa, a[1] - ny * wa]);
  for (let i = 1; i < n; i++) { const t = (i / n) * Math.PI, c = Math.cos(t), s = Math.sin(t); pts.push([a[0] + (-nx * c - ux * s) * wa, a[1] + (-ny * c - uy * s) * wa]); }
  return pts;
}
function resampleN(pts, N) {
  const n = pts.length, sg = []; let tot = 0;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]); sg.push(d); tot += d; }
  const out = []; let i = 0, acc = 0;
  for (let k = 0; k < N; k++) {
    const s = (tot * k) / N;
    while (i < n - 1 && acc + sg[i] < s) { acc += sg[i]; i++; }
    const a = pts[i], b = pts[(i + 1) % n], u = (s - acc) / (sg[i] || 1);
    out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
  }
  return out;
}
/** pointed two-centred arch outline (bottom-left → up → apex → down → bottom-right) */
function archPts(cx, ys, a, R, yb, step = 3) {
  const pts = [[cx - a, yb], [cx - a, ys]];
  const c1 = cx - a + R, c2 = cx + a - R, ady = Math.sqrt(R * R - (cx - c1) ** 2);
  const aL = Math.atan2(-ady, cx - c1), aR = Math.atan2(-ady, cx - c2);
  const n = Math.max(12, Math.round((R * (aL + Math.PI)) / step));
  for (let i = 1; i <= n; i++) { const an = -Math.PI + ((aL + Math.PI) * i) / n; pts.push([c1 + Math.cos(an) * R, ys + Math.sin(an) * R]); }
  for (let i = 1; i <= n; i++) { const an = aR + ((0 - aR) * i) / n; pts.push([c2 + Math.cos(an) * R, ys + Math.sin(an) * R]); }
  pts.push([cx + a, yb]);
  return pts;
}
const archApex = (a, R) => NYS - Math.sqrt(R * R - (R - a) ** 2);
/** arc-length parameterised Catmull-Rom path */
function mkPath(pts, per = 24) {
  const P = crPts(pts, false, per), acc = [0];
  for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  return { P, acc, L: acc[acc.length - 1] };
}
function pathAt(pa, s) {
  const { P, acc } = pa; s = clamp(s, 0, pa.L);
  let lo = 0, hi = acc.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acc[m] < s) lo = m; else hi = m; }
  const u = (s - acc[lo]) / ((acc[hi] - acc[lo]) || 1);
  return [lerp(P[lo][0], P[hi][0], u), lerp(P[lo][1], P[hi][1], u)];
}
/** distance travelled with a smooth trapezoid speed profile (ramp up a s, cruise at vmax, ramp down d s, stop at L) */
function travel(tau, L, vmax, a, d) {
  if (tau <= 0) return 0;
  const cr = Math.max(0, L / vmax - (a + d) / 2);
  if (tau < a) { const x = tau / a; return vmax * a * (x * x * x - (x * x * x * x) / 2); }
  let s = (vmax * a) / 2;
  if (tau < a + cr) return s + vmax * (tau - a);
  s += vmax * cr;
  const sg = tau - a - cr;
  if (sg < d) { const y = sg / d; return s + vmax * (sg - d * (y * y * y - (y * y * y * y) / 2)); }
  return Math.min(L, s + (vmax * d) / 2);
}

// ------------------------------------------------------------------ background: wall layer (with the niche opening cut out)
const OPEN_PTS = roughen(archPts(NCX, NYS, OA, OR, 980), { amp: 1.2, seed: 24, step: 4 });
let _openPath = null;
const openPath = () => _openPath || (_openPath = polyPath(OPEN_PTS));
function nearCols(c, k = 1) { return [mix(c, '#FFF6E8', 0.055 * k), mix(c, '#0E0C18', 0.1 * k), mix(c, '#7A4A6A', 0.07 * k), mix(c, '#FFF6E8', 0.028 * k), mix(c, '#0E0C18', 0.05 * k)]; }
function paintWall(g, li) {
  const C = (k) => PAL[k][li];
  const X0 = BG.x0, Y0 = BG.y0, X1 = BG.x0 + BG.w, Y1 = BG.y0 + BG.h;
  g.save(); g.scale(BG.s, BG.s); g.translate(-X0, -Y0);
  const full = new Path2D(); full.rect(X0, Y0, BG.w, BG.h);
  // flat value bands: darker high wall (above the frieze), mid wall, darker low wall (below the ledge)
  g.fillStyle = css(C('wall')); g.fillRect(X0, Y0, BG.w, BG.h);
  const dn = (x, y) => Math.hypot((x - NCX) * 0.85, (y - 690) * 0.75);   // distance from the niche → dab size/density
  // far wall: larger, sparser, darker dabs; near the niche: tighter, finer
  dabs(g, full, { colors: nearCols(C('wallFar'), 1.1), n: 900, len: [110, 240], wid: [16, 28], dirJit: 0.05, seed: 204, bbox: [X0, 300, X1, 1110], mask: (x, y) => dn(x, y) > 330 });
  dabs(g, full, { colors: nearCols(C('wall')), n: 1300, len: [50, 130], wid: [9, 17], dirJit: 0.05, seed: 202, bbox: [X0, 300, X1, 1110], mask: (x, y) => dn(x, y) < 470 });
  // high wall band
  fillG(g, rough([[X0 - 20, Y0 - 20], [X1 + 20, Y0 - 20], [X1 + 20, 300], [700, 306], [200, 298], [X0 - 20, 302]], { amp: 5, seed: 3 }), C('wallTop'), { tex: 0.4, scale: 0.7 });
  dabs(g, full, { colors: nearCols(C('wallTop'), 1.1), n: 420, len: [100, 230], wid: [14, 26], dirJit: 0.05, seed: 203, bbox: [X0, Y0, X1, 300] });
  // frieze band
  fillG(g, rough([[X0 - 10, 286], [X1 + 10, 286], [X1 + 10, 312], [X0 - 10, 312]], { amp: 1.5, seed: 9 }), C('frameShade'), { tex: 0.5, dir: 0, scale: 0.5 });
  fillG(g, rough([[X0 - 10, 291], [X1 + 10, 291], [X1 + 10, 294], [X0 - 10, 294]], { amp: 0.6, seed: 10 }), C('gold'), { tex: 0.3 });
  { const p = new Path2D(); for (let x = X0 + 8; x < X1; x += 26) { const y = 303; p.moveTo(x, y - 5); p.lineTo(x + 5, y); p.lineTo(x, y + 5); p.lineTo(x - 5, y); p.closePath(); } fillG(g, p, C('dot'), { tex: 0.2 }); }
  // low wall (wainscot) below the ledge: flat darker band, sparse broad dabs, a quiet border with tiny lozenges
  fillG(g, rough([[X0 - 10, 1096], [X1 + 10, 1092], [X1 + 10, Y1 + 10], [X0 - 10, Y1 + 10]], { amp: 2, seed: 60 }), C('lowWall'), { tex: 0.45, dir: 0, scale: 0.7 });
  dabs(g, full, { colors: nearCols(C('lowWall'), 0.8), n: 520, len: [120, 260], wid: [16, 30], dirJit: 0.04, seed: 205, bbox: [X0, 1110, X1, Y1] });
  fillG(g, rough([[X0 - 10, 1092], [X1 + 10, 1088], [X1 + 10, 1100], [X0 - 10, 1104]], { amp: 1, seed: 61 }), mix(C('lowWall'), C('frameShade'), 0.5), { tex: 0.35 });
  { const p = new Path2D(); for (let x = X0 + 10; x < X1; x += 30) { const y = 1096; p.moveTo(x, y - 3.5); p.lineTo(x + 6, y); p.lineTo(x, y + 3.5); p.lineTo(x - 6, y); p.closePath(); } fillG(g, p, mix(C('lowWall'), C('dot'), 0.28), { tex: 0.1 }); }

  // niche frame (stone band) + frame shade + dotted border + gold line
  const FW = 34;
  fillG(g, rough(archPts(NCX, NYS, NA + FW, NR + FW, LEDGE + 4), { amp: 1.8, seed: 21, step: 4 }), C('frame'), { tex: 0.5, dir: Math.PI / 2, scale: 0.5 });
  const outer2 = archPts(NCX, NYS, NA + FW, NR + FW, LEDGE + 4), inner2 = archPts(NCX, NYS, NA + FW - 8, NR + FW - 8, LEDGE + 4).reverse();
  fillG(g, rough(outer2.concat(inner2), { amp: 1.2, seed: 22, step: 4 }), C('frameShade'), { tex: 0.4, dir: Math.PI / 2, scale: 0.5 });
  { const mid = archPts(NCX, NYS, NA + 20, NR + 20, LEDGE - 6, 2); const p = new Path2D(); let acc = 0;
    for (let i = 1; i < mid.length; i++) { const a = mid[i - 1], b = mid[i]; acc += Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc > 21) { acc = 0; p.addPath(rough(ellipsePts(b[0], b[1], 3.4, 3.4, 10), { amp: 0.5, seed: i, step: 2 })); } }
    fillG(g, p, C('dot'), { tex: 0.2 }); }
  const gl1 = archPts(NCX, NYS, NA + 9, NR + 9, LEDGE), gl2 = archPts(NCX, NYS, NA + 5, NR + 5, LEDGE).reverse();
  fillG(g, rough(gl1.concat(gl2), { amp: 0.7, seed: 23, step: 3 }), C('gold'), { tex: 0.3, dir: Math.PI / 2 });
  // Iznik-style tile band on the arch intrados: cream ground with cobalt / turquoise lozenges
  { const o = archPts(NCX, NYS, NA + 1, NR + 1, LEDGE), i2 = archPts(NCX, NYS, OA - 1, OR - 1, LEDGE).reverse();
    fillG(g, rough(o.concat(i2), { amp: 0.8, seed: 28, step: 3 }), C('tileGround'), { tex: 0.35, dir: Math.PI / 2, scale: 0.4 });
    const mid = archPts(NCX, NYS, NA - 8, NR - 8, LEDGE - 4, 1.5); const pa = new Path2D(), pb = new Path2D(); let acc = 0, k = 0;
    for (let q = 1; q < mid.length; q++) { const a = mid[q - 1], b = mid[q]; acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc > 15) { acc = 0; k++; const an = Math.atan2(b[1] - a[1], b[0] - a[0]), ux = Math.cos(an), uy = Math.sin(an), L = 6.4, Wd = 5.4;
        const P2 = k % 2 ? pa : pb; P2.moveTo(b[0] + ux * L, b[1] + uy * L); P2.lineTo(b[0] - uy * Wd, b[1] + ux * Wd); P2.lineTo(b[0] - ux * L, b[1] - uy * L); P2.lineTo(b[0] + uy * Wd, b[1] - ux * Wd); P2.closePath(); } }
    fillG(g, pa, C('tileA'), { tex: 0.2 }); fillG(g, pb, C('tileB'), { tex: 0.2 }); }
  // spandrels: bold rumi rosettes (8 petals + leaf curls)
  for (const sx of [-1, 1]) {
    const rc = [NCX + sx * (NA + FW + 40), 430];
    const p = new Path2D();
    for (let k = 0; k < 8; k++) { const an = (k / 8) * TAU; p.addPath(rough(ellipsePts(rc[0] + Math.cos(an) * 14, rc[1] + Math.sin(an) * 14, 10, 5.5, 14, an), { amp: 0.5, seed: 40 + k, step: 2 })); }
    fillG(g, p, C('frameShade'), { tex: 0.3 });
    const lf = new Path2D();
    for (const s2 of [-1, 1]) lf.addPath(rough(crPts([[rc[0], rc[1] + 26], [rc[0] + s2 * 22, rc[1] + 40], [rc[0] + s2 * 44, rc[1] + 30], [rc[0] + s2 * 30, rc[1] + 46], [rc[0] + s2 * 6, rc[1] + 34]], true, 6), { amp: 0.5, seed: 46 + s2, step: 2 }));
    fillG(g, lf, C('frameShade'), { tex: 0.3, alpha: 0.9 });
    fillG(g, rough(ellipsePts(rc[0], rc[1], 7, 7, 12), { amp: 0.4, seed: 49 }), C('gold'), { tex: 0.2 });
  }
  // apex finial (alem): knob + crescent on the frame
  { const ay = archApex(NA + FW, NR + FW); const cx = NCX;
    fillG(g, rough([[cx - 3, ay + 4], [cx + 3, ay + 4], [cx + 3, ay - 22], [cx - 3, ay - 22]], { amp: 0.4, seed: 51 }), C('gold'), { tex: 0.2 });
    fillG(g, rough(ellipsePts(cx, ay - 26, 7, 6, 14), { amp: 0.4, seed: 52 }), C('gold'), { tex: 0.2 });
    const cres = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * 0.15 + (i / 16) * Math.PI * 1.7; cres.push([cx + Math.cos(a + Math.PI / 2) * 13, ay - 46 + Math.sin(a + Math.PI / 2) * 13]); }
    for (let i = 16; i >= 0; i--) { const a = Math.PI * 0.15 + (i / 16) * Math.PI * 1.7; cres.push([cx + Math.cos(a + Math.PI / 2) * 10 + 0, ay - 50 + Math.sin(a + Math.PI / 2) * 10]); }
    fillG(g, rough(cres, { amp: 0.3, seed: 53, step: 2 }), C('gold'), { tex: 0.2 }); }
  // cut the opening (the interior layer shows through)
  g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fill(openPath()); g.restore();
  // ledge: crisp flat under-shadow band, corbels, front face, top face
  fillG(g, rough([[X0 - 10, 1024], [X1 + 10, 1024], [X1 + 10, 1062], [X0 - 10, 1058]], { amp: 1.6, seed: 50 }), C('under'), { tex: 0.3, dir: 0 });
  for (const cx of [NCX - NA - 17, NCX + NA + 17, -60, 1180]) {
    const cb = rough([[cx - 17, 1020], [cx + 17, 1020], [cx + 15, 1046], [cx + 6, 1068], [cx - 6, 1068], [cx - 15, 1046]], { amp: 1, seed: cx | 0 });
    fillG(g, cb, C('ledgeFront'), { tex: 0.5, dir: Math.PI / 2, scale: 0.4 });
    fillG(g, rough([[cx + 5, 1022], [cx + 17, 1022], [cx + 15, 1046], [cx + 6, 1068], [cx + 2, 1066]], { amp: 0.8, seed: (cx | 0) + 1 }), C('ledgeLine'), { tex: 0.4, alpha: 0.8 });
  }
  const front = rough([[X0 - 10, 990], [X1 + 10, 990], [X1 + 10, 1026], [X0 - 10, 1026]], { amp: 1.4, seed: 51 });
  fillG(g, front, C('ledgeFront'), { tex: 0.7, dir: 0, scale: 0.5, squash: 0.6 });
  dabs(g, front, { colors: nearCols(C('ledgeFront'), 0.8), n: 90, len: [60, 200], wid: [3, 6], seed: 52, bbox: [X0, 990, X1, 1026] });
  fillG(g, rough([[X0 - 10, 1019], [X1 + 10, 1019], [X1 + 10, 1026], [X0 - 10, 1026]], { amp: 0.8, seed: 53 }), C('ledgeLine'), { tex: 0.3 });
  const top = rough([[X0 - 10, 972], [X1 + 10, 972], [X1 + 10, 991], [X0 - 10, 991]], { amp: 1.1, seed: 54 });
  fillG(g, top, C('ledgeTop'), { tex: 0.6, dir: 0, scale: 0.45, squash: 0.6 });
  dabs(g, top, { colors: nearCols(C('ledgeTop'), 0.8), n: 70, len: [60, 200], wid: [3, 5], seed: 55, bbox: [X0, 972, X1, 991] });
  g.restore();
}
// ------------------------------------------------------------------ background: niche interior layer (back wall, shell fan, reveals)
function paintInterior(g, li) {
  const C = (k) => PAL[k][li];
  g.save(); g.scale(NI.s, NI.s); g.translate(-NI.x0, -NI.y0);
  const box = new Path2D(); box.rect(NI.x0, NI.y0, NI.w, NI.h);
  fillG(g, box, C('niche'), { tex: 0.5, dir: Math.PI / 2, scale: 0.55 });
  dabs(g, box, { colors: nearCols(C('niche'), 0.7), n: 300, len: [40, 110], wid: [10, 18], dir: Math.PI / 2, dirJit: 0.05, seed: 241, bbox: [NI.x0, NI.y0, NI.x0 + NI.w, NI.y0 + NI.h] });
  // shell / fan at the top of the niche
  { const fc = [NCX, 640]; const p = new Path2D();
    for (let k = 0; k <= 12; k++) { const an = -Math.PI + (k / 12) * Math.PI; const r0 = 34, r1 = 250; const a2 = an + 0.03;
      p.moveTo(fc[0] + Math.cos(an) * r0, fc[1] + Math.sin(an) * r0); p.lineTo(fc[0] + Math.cos(an) * r1, fc[1] + Math.sin(an) * r1); p.lineTo(fc[0] + Math.cos(a2) * r1, fc[1] + Math.sin(a2) * r1); p.lineTo(fc[0] + Math.cos(a2) * r0, fc[1] + Math.sin(a2) * r0); p.closePath(); }
    fillG(g, p, C('nicheLine'), { tex: 0.3, alpha: 0.8 });
    fillG(g, bandPath(fc[0], fc[1], 28, 35, -Math.PI, 0, 31, 0.4, 40), C('nicheLine'), { tex: 0.3 });
    fillG(g, bandPath(fc[0], fc[1], 0, 18, -Math.PI, 0, 33, 0.4, 30), C('nicheLine'), { tex: 0.3, alpha: 0.8 }); }
  // depth shade under the arch (crescent) and along the jambs (reveals of the recess)
  const sh = rough(archPts(NCX, NYS + 58, OA + 5, OR + 5, LEDGE + 400), { amp: 2.5, seed: 25, step: 5 });
  const inv = new Path2D(); inv.rect(NI.x0, NI.y0, NI.w, NI.h); inv.addPath(sh);
  g.fillStyle = css(C('nicheShade')); g.fill(inv, 'evenodd');
  fillG(g, rough([[NCX - OA - 30, NYS + 40], [NCX - OA + 22, NYS + 72], [NCX - OA + 22, LEDGE + 10], [NCX - OA - 30, LEDGE + 10]], { amp: 1.2, seed: 26 }), C('nicheShade'), { tex: 0.4, dir: Math.PI / 2, alpha: 0.85 });
  fillG(g, rough([[NCX + OA + 30, NYS + 40], [NCX + OA - 22, NYS + 72], [NCX + OA - 22, LEDGE + 10], [NCX + OA + 30, LEDGE + 10]], { amp: 1.2, seed: 27 }), C('nicheShade'), { tex: 0.4, dir: Math.PI / 2, alpha: 0.85 });
  g.restore();
}

// ------------------------------------------------------------------ kandil: low, wide, faceted brass lamp; short flared spout → right, loop handle ← left, tulip finial
const KN = {
  foot: [[-46, 0], [-42, -5], [-27, -10], [-18, -21], [18, -21], [27, -10], [42, -5], [46, 0]],
  body: [[-58, -22], [-88, -30], [-105, -44], [-106, -60], [-90, -76], [-56, -86], [56, -86], [90, -76], [106, -60], [105, -44], [88, -30], [58, -22]],
  spout: [[86, -72], [112, -80], [136, -88], [152, -96], [160, -105], [170, -103], [169, -94], [157, -86], [137, -74], [115, -58], [98, -48]],
  lid: [[-50, -86], [-49, -95], [-43, -105], [-31, -113], [-16, -118], [0, -120], [16, -118], [31, -113], [43, -105], [49, -95], [50, -86]],
  hOut: [[-96, -68], [-120, -86], [-146, -92], [-163, -82], [-167, -62], [-153, -46], [-126, -40], [-102, -44]],
  hIn: [[-110, -62], [-128, -74], [-146, -76], [-154, -66], [-150, -55], [-134, -51], [-114, -53]],
  rest: [[-150, -90], [-160, -101], [-143, -105], [-126, -97], [-133, -89]],
  tulip: [[0, -133], [-8, -136], [-12, -144], [-12, -154], [-7, -150], [-4, -160], [0, -153], [4, -160], [7, -150], [12, -154], [12, -144], [8, -136]],
};
const KB = { base: '#D6A040', shade: '#9A5E24', deep: '#5E3418', light: '#ECC46C', ivory: '#FBF0D0', band: '#6E3F1A', dot: '#F6DB98', rim: '#FFE2A2' };
const KSPR = { x0: -178, y0: -170, w: 356, h: 176, s: 2 };
function kandilShapes() {
  const cr = (pts) => crPts(pts, true, 6);
  const rp = (pts, seed, amp = 0.8, smooth = true) => rough(smooth ? cr(pts) : pts, { amp, seed, step: 3, freq: 0.06 });
  const handle = new Path2D(); handle.addPath(rp(KN.hOut, 11)); handle.addPath(rp(KN.hIn.slice().reverse(), 12));
  return { handle, rest: rp(KN.rest, 10, 0.5), foot: rp(KN.foot, 13, 0.6, false), body: rp(KN.body, 14, 0.7, false), spout: rp(KN.spout, 15, 0.7), lid: rp(KN.lid, 16, 0.6),
    collar: rough([[-56, -91], [56, -91], [56, -84], [-56, -84]], { amp: 0.5, seed: 17 }), stem: rough([[-5, -116], [5, -116], [5, -127], [-5, -127]], { amp: 0.4, seed: 18 }),
    knop: rough(ellipsePts(0, -130, 8, 5, 18), { amp: 0.4, seed: 19 }), tulip: rough(cr(KN.tulip), { amp: 0.3, seed: 20, step: 1.5 }),
    neck: rough(ellipsePts(0, -22, 20, 4.5, 20), { amp: 0.4, seed: 21 }) };
}
function paintKandil(g) {
  const S = kandilShapes();
  const F = (p, c, o = {}) => fillG(g, p, c, { tex: 0.42, scale: 0.3, ...o });
  const clip = (cp, fn) => { g.save(); g.clip(cp); fn(); g.restore(); };
  const R = (pts, seed, amp = 0.6) => rough(pts, { amp, seed, step: 2.5 });
  // handle + thumb rest (lit from the right: inner right edge light, outer left shade)
  F(S.handle, KB.base, { dir: 0.8 });
  clip(S.handle, () => { F(R(ellipsePts(-160, -62, 14, 30, 20), 30), KB.shade); F(R(ellipsePts(-130, -42, 26, 8, 20), 31), KB.deep); F(R(ellipsePts(-128, -91, 20, 4, 16, 0.2), 32), KB.light); });
  F(S.rest, KB.light, { tex: 0.3 });
  // foot + neck
  F(S.foot, KB.base, { dir: 0 });
  clip(S.foot, () => { F(R([[-50, 2], [-6, 2], [-10, -24], [-50, -24]], 33), KB.shade); F(R([[18, -12], [50, -2], [50, 3], [16, 3]], 34), KB.light); F(R([[-50, -3], [50, -3], [50, 3], [-50, 3]], 35), KB.deep, { alpha: 0.7 }); });
  F(S.neck, KB.deep, { tex: 0.3 });
  // body: facet panels (shade → base → light → rim side)
  F(S.body, KB.base, { dir: 0.05 });
  clip(S.body, () => {
    F(R([[-120, -100], [-70, -100], [-66, -10], [-120, -10]], 36), KB.deep, { dir: Math.PI / 2 });
    F(R([[-70, -100], [-24, -100], [-22, -10], [-66, -10]], 37), KB.shade, { dir: Math.PI / 2 });
    F(R([[24, -100], [70, -100], [66, -10], [22, -10]], 38), KB.light, { dir: Math.PI / 2 });
    F(R([[70, -100], [120, -100], [120, -10], [66, -10]], 39), mix(KB.light, KB.ivory, 0.25), { dir: Math.PI / 2 });
    // shoulder ridge (engraved), upper body lighter, lower body darker band
    F(R([[-120, -66], [120, -66], [120, -59], [-120, -59]], 41, 0.4), KB.band, { tex: 0.25 });
    F(R([[-120, -30], [120, -30], [120, -10], [-120, -10]], 42, 0.5), KB.deep, { alpha: 0.45 });
    // dot row on the shoulder
    const dp = new Path2D(); for (let k = 0; k < 13; k++) { const x = -72 + k * 12; dp.addPath(rough(ellipsePts(x, -75, 2.4, 2.4, 8), { amp: 0.25, seed: 60 + k, step: 1.5 })); }
    F(dp, KB.dot, { tex: 0.1 });
    // three large tulip engravings (readable at phone size)
    for (const [x, sd] of [[-46, 70], [0, 71], [46, 72]]) {
      const tl = [[0, 15], [-3, 7], [-10, 3], [-11, -6], [-7, -13], [-4, -6], [0, -14], [4, -6], [7, -13], [11, -6], [10, 3], [3, 7]].map(([a, b]) => [x + a, -44 + b]);
      F(rough(crPts(tl, true, 4), { amp: 0.3, seed: sd, step: 1.5 }), KB.band, { tex: 0.15, alpha: 0.85 });
      F(rough([[x - 1.2, -30], [x + 1.2, -30], [x + 1.2, -24], [x - 1.2, -24]], { amp: 0.2, seed: sd + 5 }), KB.band, { tex: 0, alpha: 0.85 });
    }
    // ivory specular streak + warm rim on the flame side
    F(rough(crPts([[30, -80], [44, -81], [56, -78], [44, -77]], true, 5), { amp: 0.3, seed: 43, step: 1.5 }), KB.ivory, { tex: 0.12 });
    F(rough(crPts([[34, -50], [40, -51], [44, -38], [38, -37]], true, 5), { amp: 0.3, seed: 143, step: 1.5 }), KB.ivory, { tex: 0.1, alpha: 0.4 });
    F(R([[98, -73], [106, -62], [105, -46], [100, -46], [100, -62], [94, -72]], 44, 0.3), KB.rim, { tex: 0.1 });
  });
  // spout
  F(S.spout, KB.base, { dir: -0.25 });
  clip(S.spout, () => {
    F(R([[86, -73], [112, -82], [137, -90], [154, -99], [162, -106], [160, -98], [136, -84], [112, -75], [90, -66]], 45), KB.light, { dir: -0.25 });
    F(R([[100, -46], [118, -60], [140, -76], [158, -88], [170, -96], [170, -88], [150, -78], [126, -62], [108, -46]], 46), KB.shade, { dir: -0.25 });
    F(R([[96, -80], [104, -80], [104, -44], [96, -44]], 47, 0.4), KB.band, { tex: 0.2 });
  });
  F(R(ellipsePts(165, -100, 4, 6.5, 14, 0.5), 48, 0.3), KB.light, { tex: 0.15 });
  // tiny dark wick at the mouth
  F(R([[162, -104], [166, -104], [167, -110], [163, -110]], 49, 0.25), '#2A1F1A', { tex: 0 });
  // lid + collar + finial (tulip)
  F(S.collar, KB.band, { tex: 0.25 });
  { const dp = new Path2D(); for (let k = 0; k < 11; k++) dp.addPath(rough(ellipsePts(-45 + k * 9, -87.5, 1.7, 1.7, 8), { amp: 0.2, seed: 90 + k, step: 1 })); F(dp, KB.dot, { tex: 0.1 }); }
  F(S.lid, KB.base, { dir: 0 });
  clip(S.lid, () => { F(R([[-60, -80], [-14, -80], [-10, -125], [-60, -125]], 50), KB.shade); F(R([[16, -112], [34, -106], [44, -96], [30, -98], [14, -106]], 51, 0.4), KB.light); });
  F(S.stem, KB.shade, { tex: 0.2 });
  F(S.knop, KB.base, { tex: 0.25 });
  clip(S.knop, () => F(R(ellipsePts(-4, -129, 5, 5, 10), 52, 0.3), KB.shade));
  F(S.tulip, KB.light, { tex: 0.2 });
  clip(S.tulip, () => { F(R([[-14, -132], [-2, -132], [-2, -162], [-14, -162]], 53, 0.3), KB.base); F(R([[4, -150], [8, -148], [5, -140], [3, -142]], 54, 0.2), KB.ivory, { tex: 0 }); });
}
function paintKandilSil(g) {
  const S = kandilShapes();
  g.fillStyle = '#000';
  for (const p of [S.handle, S.rest, S.foot, S.body, S.spout, S.lid, S.collar, S.stem, S.knop, S.tulip]) g.fill(p);
}
const kandilSprite = () => sprite('lamps6_kandil', KSPR.w * KSPR.s, KSPR.h * KSPR.s, (g) => { g.scale(KSPR.s, KSPR.s); g.translate(-KSPR.x0, -KSPR.y0); paintKandil(g); });
const kandilSil = () => sprite('lamps6_kandil_sil', KSPR.w, KSPR.h, (g) => { g.translate(-KSPR.x0, -KSPR.y0); paintKandilSil(g); });

// ------------------------------------------------------------------ candle saucer (pre-rendered, ×1.4); wax body is procedural (burns down)
const SSPR = { x0: -72, y0: -30, w: 144, h: 36, s: 2 };
function paintSaucer(g) {
  const F = (p, c, o = {}) => fillG(g, p, c, { tex: 0.45, scale: 0.3, ...o });
  const body = rough(crPts([[-64, -17], [64, -17], [53, -6], [36, 0], [-36, 0], [-53, -6]], true, 6), { amp: 0.7, seed: 70, step: 2 });
  F(body, '#9C5640', { dir: 0 });
  g.save(); g.clip(body); F(rough(ellipsePts(-34, 0, 42, 12, 20), { amp: 0.6, seed: 71 }), '#7A4234'); F(rough(ellipsePts(36, -10, 22, 4, 14), { amp: 0.4, seed: 72 }), '#C07A5A'); g.restore();
  F(rough(ellipsePts(0, -17, 66, 9, 44), { amp: 0.6, seed: 73, step: 2 }), '#C27B5C', { dir: 0 });
  F(rough(ellipsePts(0, -17.4, 55, 6.2, 40), { amp: 0.5, seed: 74, step: 2 }), '#8E4C3A', { dir: 0 });
}
const saucerSprite = () => sprite('lamps6_saucer', SSPR.w * SSPR.s, SSPR.h * SSPR.s, (g) => { g.scale(SSPR.s, SSPR.s); g.translate(-SSPR.x0, -SSPR.y0); paintSaucer(g); });

// night end texture (screen space)
const nightSprite = () => sprite('lamps6_night', W, H, (g) => {
  g.fillStyle = NIGHT; g.fillRect(0, 0, W, H);
  const full = new Path2D(); full.rect(0, 0, W, H);
  dabs(g, full, { colors: [mix(NIGHT, '#FFFFFF', 0.025), mix(NIGHT, '#000000', 0.06), mix(NIGHT, '#4A3C6A', 0.05), mix(NIGHT, '#FFFFFF', 0.015)], n: 900, len: [80, 200], wid: [14, 26], dirJit: 0.04, seed: 707, bbox: [-60, -30, W + 60, H + 30] });
});
const wallSprite = (li) => sprite('lamps6_wall_' + li, BG.w * BG.s, BG.h * BG.s, (g) => paintWall(g, li));
const intSprite = (li) => sprite('lamps6_int_' + li, NI.w * NI.s, NI.h * NI.s, (g) => paintInterior(g, li));

export async function init() {
  for (let i = 0; i < 4; i++) { wallSprite(i); intSprite(i); }
  kandilSprite(); kandilSil(); saucerSprite(); nightSprite(); drapeSprite();
  // warm-up: one full frame into a throwaway canvas so the first real frame of a worker is not slow
  const c = new OffscreenCanvas(W, H), g = c.getContext('2d');
  draw(g, 38.6); draw(g, 40.45); draw(g, 41.2);
}

// ------------------------------------------------------------------ flame
function flamePath(x, y, h, w, lean) {
  const pts = [], n = 18;
  for (let i = 0; i <= n; i++) { const u = i / n, b = Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - u * 0.15); pts.push([x + w * 0.5 * b + lean * u * u, y - h * u]); }
  for (let i = n - 1; i >= 1; i--) { const u = i / n, b = Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - u * 0.15); pts.push([x - w * 0.5 * b + lean * u * u, y - h * u]); }
  return polyPath(pts);
}
function drawFlame(ctx, x, y, s, lean, big) {
  if (s <= 0.01) return;
  const h = (big ? 72 : 50) * s, w = (big ? 30 : 21) * Math.min(1, 0.45 + s * 0.55);
  const o = { dir: -Math.PI / 2, scale: 0.25, tx: x, ty: y };
  fillG(ctx, flamePath(x, y + 4, h * 1.06 + 2, w * 1.16 + 2, lean), '#B9612C', { ...o, tex: 0, alpha: 0.5 });
  fillG(ctx, flamePath(x, y + 3, h, w, lean), '#EC9D3A', { ...o, tex: 0.25 });
  fillG(ctx, flamePath(x, y + 1, h * 0.74, w * 0.68, lean * 0.8), '#F7CB66', { ...o, tex: 0.2 });
  fillG(ctx, flamePath(x, y - 1, h * 0.42, w * 0.38, lean * 0.5), '#FDF4DC', { ...o, tex: 0.1 });
}

// ------------------------------------------------------------------ state: kandil (lifted by its handle, carried up-left out of frame)
const KPATH = mkPath([[570, 985], [569, 932], [555, 860], [506, 772], [418, 694], [284, 630], [114, 584], [-86, 552], [-296, 530], [-520, 514]]);
const K_LIFT = 39.97, K_VMAX = 1000, K_A = 0.42, K_D = 0.5;   // ≈37 px/frame on screen at the swap zoom (z 1.12)
function kandilAt(t) {
  const s = travel(t - K_LIFT, KPATH.L, K_VMAX, K_A, K_D);
  const b = pathAt(KPATH, s);
  const grip = add(b, K_GRIP);
  // hanging from the handle: the body swings down a little when lifted, settles at the end
  const rot = 0.1 * E.inOutSine(clamp(s / 130)) - 0.05 * E.inOutSine(invlerp(0.55, 1, s / KPATH.L));
  return { s, grip, rot };
}
function kandilState(t) {
  const k = kandilAt(t), k1 = kandilAt(t - 1 / 60), k2 = kandilAt(t + 1 / 60);
  const W2 = (p) => add(k.grip, rot2(sub(p, K_GRIP), k.rot));
  const vel = [(k2.grip[0] - k1.grip[0]) * 30, (k2.grip[1] - k1.grip[1]) * 30];   // world px / s
  const noz = W2(K_NOZ);
  return { ...k, u: k.s / KPATH.L, W2, vel, noz, flame: [noz[0], noz[1] - 30], cen: W2(K_CEN) };
}
// ------------------------------------------------------------------ state: candle
const C_T0 = 40.3, C_T1 = 40.93;
const CPATH = [CP, [CP[0] + 120, CP[1] - 44], [CL[0] - 120, CL[1] - 44], CL];
function candleBase(t) {
  const e = E.inOutSine(invlerp(C_T0, C_T1, t));
  let b = bez(CPATH, e);
  const land = invlerp(C_T1, C_T1 + 0.12, t);
  if (land > 0 && land < 1) b = [b[0], b[1] + 2.2 * Math.sin(Math.PI * land)];
  return { b, e };
}
function candleState(t) {
  const { b: base, e } = candleBase(t);
  const rot = -0.06 * Math.sin(Math.PI * e) + 0.015 * Math.sin(Math.PI * invlerp(C_T1 - 0.05, C_T1 + 0.15, t));
  const W2 = (p) => add(base, rot2(p, rot));
  const b1 = candleBase(t - 1 / 60).b, b2 = candleBase(t + 1 / 60).b;
  const vel = [(b2[0] - b1[0]) * 30, (b2[1] - b1[1]) * 30];
  const appear = seg(t, T.dakika, T.dakika + 0.45, E.outCubic);
  const ignite = seg(t, T.dakika + 0.32, T.dakika + 0.7, E.outBackSoft);
  const drain = seg(t, DRAIN0, T.gibidir, E.linear);
  const hWax = lerp(134, 70, drain);
  const wv = env(t, T.sonecek - 0.04, T.sonecek + 0.85, 0.1, 0.4);                  // "sönecek" waver
  const wob = 0.5 + 0.5 * Math.sin(t * 17.3) * Math.cos(t * 6.1 + 0.7);
  const flare = 1 + 0.2 * env(t, T.gibidir, T.gibidir + 0.13, 0.05, 0.07, E.inOutSine);   // last flare, then out by scale
  const die = seg(t, T.gibidir + 0.08, T.gibidir + 0.21, E.inCubic);
  const flick = 1 + 0.035 * noise1(t * 3.1, 77) - wv * 0.5 * wob;
  const fs = Math.max(0, ignite * flick * (1 - 0.1 * drain) * flare * (1 - die));
  const lit = seg(t, T.dakika + 0.32, T.dakika + 0.8, E.outCubic);
  const lr = lit * (1 - 0.3 * wv * wob) * (1 - 0.12 * drain) * (1 + 0.06 * (flare - 1) / 0.2);   // light radius factor
  // painted "lights out": warm → rose → plum zones step out one after another
  const za = [1 - seg(t, T.gibidir + 0.17, T.gibidir + 0.28, E.inOutSine), 1 - seg(t, T.gibidir + 0.1, T.gibidir + 0.2, E.inOutSine), 1 - seg(t, T.gibidir + 0.05, T.gibidir + 0.13, E.inOutSine)];
  const light = lr * Math.max(za[0] * 0.4, za[1] * 0.7, za[2]);
  const wick = W2([0, -16 - hWax - 7]);
  const ember = env(t, T.gibidir + 0.16, T.gibidir + 0.62, 0.05, 0.3);
  return { base, e, rot, W2, vel, appear, ignite, drain, hWax, wv, wob, fs, lr, za, light, wick, ember, flame: [wick[0], wick[1] - 20 * Math.max(fs, 0.3)], cen: W2(C_CEN) };
}

// ------------------------------------------------------------------ light: stepped opaque pools (each level = a pre-lit copy of the wall)
const FRINGE = new Map();
function zoneShape(path, cx, cy, R, seed, M, N) {
  polyPath(ringPoly(cx, cy, R, seed, 2.5 + R * 0.008, N), path);
  let fr = FRINGE.get(seed);
  if (!fr) { const r = rng(seed); fr = []; for (let i = 0; i < M; i++) fr.push([((i + r() * 0.8) / M) * TAU, r() * 1.0 - 0.35, 0.55 + r() * 0.6, 0.7 + r() * 0.5, (r() - 0.5) * 0.25]); FRINGE.set(seed, fr); }
  const Fd = 2.5 + R * 0.009, L0 = 9 + R * 0.03, w0 = 3.5 + R * 0.006;
  for (const [a, d, l, w, j] of fr) { const rr = R + d * Fd; polyPath(ellipsePts(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, L0 * l, w0 * w, 10, a + Math.PI / 2 + j), path); }
  return path;
}
function blitLevel(ctx, li, cam, camI, box) {
  setCam(ctx, camI); ctx.drawImage(intSprite(li), NI.x0, NI.y0, NI.w, NI.h);
  setCam(ctx, cam);
  const x0 = Math.max(BG.x0, box[0]), y0 = Math.max(BG.y0, box[1]), x1 = Math.min(BG.x0 + BG.w, box[2]), y1 = Math.min(BG.y0 + BG.h, box[3]);
  if (x1 <= x0 || y1 <= y0) return;
  ctx.drawImage(wallSprite(li), (x0 - BG.x0) * BG.s, (y0 - BG.y0) * BG.s, (x1 - x0) * BG.s, (y1 - y0) * BG.s, x0, y0, x1 - x0, y1 - y0);
}
function drawLighting(ctx, cam, camI, srcs) {
  const vis = visRect(cam);
  ctx.save(); blitLevel(ctx, 0, cam, camI, vis); ctx.restore();
  for (let L = 1; L <= 3; L++) {
    const groups = new Map();
    for (const s of srcs) {
      const a = s.a[L - 1], r = s.R[L - 1]; if (a <= 0.004 || r < 3) continue;
      if (s.c[0] + r * 1.1 < vis[0] || s.c[0] - r * 1.1 > vis[2] || s.c[1] + r * 1.1 < vis[1] || s.c[1] - r * 1.1 > vis[3]) continue;
      const key = a.toFixed(3); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(s);
    }
    for (const [key, list] of groups) {
      const path = new Path2D(); const box = [1e9, 1e9, -1e9, -1e9];
      for (const s of list) {
        const r = s.R[L - 1]; zoneShape(path, s.c[0], s.c[1], r, s.seed + L * 11, s.M[L - 1], 150);
        box[0] = Math.min(box[0], s.c[0] - r * 1.12); box[1] = Math.min(box[1], s.c[1] - r * 1.12); box[2] = Math.max(box[2], s.c[0] + r * 1.12); box[3] = Math.max(box[3], s.c[1] + r * 1.12);
      }
      box[0] = Math.max(box[0], vis[0]); box[1] = Math.max(box[1], vis[1]); box[2] = Math.min(box[2], vis[2]); box[3] = Math.min(box[3], LIGHT_Y + 2, vis[3]);
      if (box[2] <= box[0] || box[3] <= box[1]) continue;
      ctx.save(); setCam(ctx, cam);
      const lim = new Path2D(); lim.rect(vis[0] - 10, vis[1] - 10, vis[2] - vis[0] + 20, LIGHT_Y - vis[1] + 10); ctx.clip(lim);
      ctx.clip(path); if (L === 3) ctx.clip(openPath());
      ctx.globalAlpha = +key;
      blitLevel(ctx, L, cam, camI, box);
      ctx.restore();
    }
  }
}
/** smooth light level (0..1) at a world point, matching the painted pools (used to tint hands, sleeves, wax) */
function lightAt(p, srcs) {
  let L = 0;
  for (const s of srcs) {
    const d = Math.hypot(p[0] - s.c[0], p[1] - s.c[1]);
    for (let k = 0; k < 3; k++) L = Math.max(L, s.a[k] * [0.35, 0.68, 1][k] * (1 - smooth01(invlerp(s.R[k] - 26, s.R[k] + 26, d))));
  }
  if (p[1] > LIGHT_Y) L *= 0.35;
  return L;
}
const smooth01 = (x) => x * x * (3 - 2 * x);
function drawHalo(ctx, c, radii, s, seed, a = 1, from = 0) {
  if (s <= 0.01) return;
  for (let i = from; i < radii.length; i++) {
    const r = radii[i] * s;
    fillG(ctx, polyPath(ringPoly(c[0], c[1], r, seed + i * 7, 1.6 + radii[i] * 0.015, 90)), HALO_COL[i], { tex: 0.3, dir: 0, scale: 0.45, tx: c[0], ty: c[1], alpha: HALO_A[i] * a });
  }
}

// ------------------------------------------------------------------ eternity ring: unbroken double band with a braided strand pair + an orbiting glint
const GOLD = '#EDCB7E', GOLD_D = '#C99A4E', GLINT = '#FFF6DC';
function drawEternity(ctx, t, c, a) {
  const p = seg(t, T.baki + 0.06, T.baki + 0.9, E.inOutCubic);
  if (p <= 0 || a <= 0.01) return;
  const R = R_ETER, a0 = -Math.PI / 2, sweep = TAU * p, spin = 0.11 * (t - T.baki);
  ctx.save(); ctx.globalAlpha *= a;
  const o = { tex: 0.22, tx: c[0], ty: c[1] };
  fillG(ctx, bandPath(c[0], c[1], R + 9, R + 14, a0, a0 + sweep, 501, 0.5, 220), GOLD, o);
  fillG(ctx, bandPath(c[0], c[1], R - 14, R - 9.5, a0, a0 + sweep, 503, 0.5, 220), GOLD, o);
  // braid: two sine strands crossing 22 times (a guilloche), phase drifts slowly
  const n = 22, amp = 6, hw = 1.7, N = Math.max(6, Math.round(330 * p));
  for (const sg of [1, -1]) {
    const out = [], inn = [];
    for (let k = 0; k <= N; k++) {
      const th = a0 + (sweep * k) / N, r = R + sg * amp * Math.sin(n * (th - spin));
      const ca = Math.cos(th), sa = Math.sin(th);
      out.push([c[0] + ca * (r + hw), c[1] + sa * (r + hw)]); inn.push([c[0] + ca * (r - hw), c[1] + sa * (r - hw)]);
    }
    fillG(ctx, polyPath(out.concat(inn.reverse())), sg > 0 ? GOLD : GOLD_D, { tex: 0.15 });
  }
  // the glint orbits the ring forever (≈ one turn per 2.6 s), the counterpart of the dial's draining hand
  const gk = seg(t, T.baki + 0.85, T.baki + 1.25, E.inOutSine);
  if (gk > 0.01) {
    const ph = a0 + (TAU * (t - (T.baki + 0.9))) / 2.6;
    for (let i = 0; i < 6; i++) {
      const b0 = ph - 0.16 * (i + 1), b1 = ph - 0.16 * i;
      fillG(ctx, bandPath(c[0], c[1], R + 9.5 - i * 0.25, R + 13.5 + i * 0.25 - i * 0.5, b0, b1, 520 + i, 0.2, 10), GLINT, { tex: 0, alpha: gk * 0.85 * (1 - i / 6) });
    }
    const q = [c[0] + Math.cos(ph) * (R + 11.5), c[1] + Math.sin(ph) * (R + 11.5)];
    fillG(ctx, polyPath(ellipsePts(q[0], q[1], 6.5, 6.5, 12)), GLINT, { tex: 0, alpha: gk });
    const sp = new Path2D(), rr = 15;
    for (let i = 0; i < 4; i++) { const an = (i / 4) * TAU + t * 0.8, an2 = an + Math.PI / 4; const A = [q[0] + Math.cos(an) * rr, q[1] + Math.sin(an) * rr], B = [q[0] + Math.cos(an2) * 2.6, q[1] + Math.sin(an2) * 2.6], C2 = [q[0] + Math.cos(an2 - Math.PI / 2) * 2.6, q[1] + Math.sin(an2 - Math.PI / 2) * 2.6]; if (!i) sp.moveTo(...C2); sp.lineTo(...A); sp.lineTo(...B); }
    sp.closePath(); fillG(ctx, sp, GLINT, { tex: 0, alpha: gk * 0.9 });
  }
  ctx.restore();
}
// ------------------------------------------------------------------ minute dial: unmistakably a clock (12 bold ticks, a hand, a thick draining arc)
function drawDial(ctx, t, c, a = 1) {
  const p = seg(t, T.dakika + 0.15, T.dakika + 0.6, E.inOutCubic);
  if (p <= 0 || a <= 0.01) return;
  const R = R_DIAL, a0 = -Math.PI / 2;
  const drain = seg(t, DRAIN0, T.gibidir, E.linear);
  const pale = '#E2D3AE', amber = '#EFA548', hand = '#FBE7B0';
  ctx.save(); ctx.globalAlpha *= a;
  fillG(ctx, bandPath(c[0], c[1], R - 1.6, R + 1.6, a0, a0 + TAU * p, 601, 0.4, 150), pale, { tex: 0.2, alpha: 0.9 });
  const tk = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];   // major, minor, major past, minor past
  for (let i = 0; i < 60; i++) {
    const f = i / 60; if (f > p) break;
    const major = i % 5 === 0, an = a0 + f * TAU, r0 = major ? R - 19 : R - 9, r1 = R - 3.5, hw = major ? 2.6 : 0.95;
    const ux = Math.cos(an), uy = Math.sin(an), nx = -uy, ny = ux;
    const path = tk[(major ? 0 : 1) + (f < drain && i > 0 ? 2 : 0)];
    path.moveTo(c[0] + ux * r0 + nx * hw, c[1] + uy * r0 + ny * hw); path.lineTo(c[0] + ux * r1 + nx * hw, c[1] + uy * r1 + ny * hw);
    path.lineTo(c[0] + ux * r1 - nx * hw, c[1] + uy * r1 - ny * hw); path.lineTo(c[0] + ux * r0 - nx * hw, c[1] + uy * r0 - ny * hw); path.closePath();
  }
  fillG(ctx, tk[0], pale, { tex: 0.1 }); fillG(ctx, tk[1], pale, { tex: 0, alpha: 0.42 });
  fillG(ctx, tk[2], pale, { tex: 0.1, alpha: 0.4 }); fillG(ctx, tk[3], pale, { tex: 0, alpha: 0.16 });
  // remaining time: a thick amber arc from the hand to 12 o'clock (clockwise)
  const s0 = a0 + TAU * drain, s1 = a0 + TAU * p;
  if (s1 - s0 > 0.004) fillG(ctx, bandPath(c[0], c[1], R + 8, R + 20, s0, s1, 611, 0.6, Math.max(8, Math.round((160 * (s1 - s0)) / TAU))), amber, { tex: 0.25 });
  // the hand (sweeps once, then stops at 12)
  const hk = seg(t, T.dakika + 0.45, T.dakika + 0.65);
  const fk = env(t, T.gibidir - 0.02, T.gibidir + 0.4, 0.06, 0.3, E.inOutSine);     // completion flash
  if (hk > 0.01) {
    const ux = Math.cos(s0), uy = Math.sin(s0), hw = 2.4 + 1.4 * fk, tip = 7.5 + 4 * fk;
    const col = fk > 0.01 ? css(mix(hand, GLINT, fk)) : hand;
    fillG(ctx, rough(capsule([c[0] + ux * R * 0.74, c[1] + uy * R * 0.74], [c[0] + ux * (R + 15), c[1] + uy * (R + 15)], hw, hw, 6), { amp: 0.4, seed: 620, step: 2 }), col, { tex: 0, alpha: hk });
    fillG(ctx, polyPath(ellipsePts(c[0] + ux * (R + 14), c[1] + uy * (R + 14), tip, tip, 14)), col, { tex: 0, alpha: hk });
  }
  if (fk > 0.01) {
    const rr = R + 14 + 20 * seg(t, T.gibidir, T.gibidir + 0.4, E.outCubic);
    fillG(ctx, bandPath(c[0], c[1], rr - 1.6, rr + 1.6, 0, TAU, 630, 0.4, 120), hand, { tex: 0, alpha: fk * 0.55 });
  }
  ctx.restore();
}

// ------------------------------------------------------------------ candle (×1.4; tinted by local light)
const tintW = (c, L, k = 0.78) => css(mix(c, '#4A4560', (1 - L) * k));
function drawCandle(ctx, t, Cd, Lc, kSide) {
  if (Cd.appear <= 0) return;
  const { rot, base } = Cd;
  ctx.save();
  ctx.translate(base[0], base[1]); ctx.rotate(rot);
  const sc = lerp(0.9, 1, Cd.appear); ctx.scale(sc, sc);
  if (Cd.appear < 1) {   // paint-in from the bottom with a ragged edge
    const yTop = lerp(4, -220, Cd.appear); const pts = [[-90, 10]];
    for (let x = -90; x <= 90; x += 7) pts.push([x, yTop + 11 * noise1(x * 0.07, 5)]);
    pts.push([90, 10]); ctx.clip(polyPath(pts));
    ctx.globalAlpha *= clamp(Cd.appear * 3);
  }
  fillG(ctx, polyPath(ellipsePts(0, 1, 70, 7, 30)), '#120E18', { tex: 0, alpha: 0.45 });
  ctx.save(); ctx.globalAlpha *= 1; ctx.drawImage(saucerSprite(), SSPR.x0, SSPR.y0, SSPR.w, SSPR.h);
  if (Lc < 0.98) fillG(ctx, rough(crPts([[-64, -17], [64, -17], [53, -6], [36, 0], [-36, 0], [-53, -6]], true, 6), { amp: 0.7, seed: 70, step: 2 }), '#2E2840', { tex: 0, alpha: (1 - Lc) * 0.6 });
  ctx.restore();
  const h = Cd.hWax, y0 = -16, y1 = -16 - h;
  const L = [], Rr = [];
  for (let y = y0; y >= y1; y -= 6) { L.push([-CW + 1.2 * noise1(y * 0.05, 81), y]); Rr.push([CW + 1.2 * noise1(y * 0.05, 82), y]); }
  L.push([-CW, y1]); Rr.push([CW, y1]);
  const wax = polyPath(L.concat(Rr.reverse()));
  fillG(ctx, wax, tintW('#EDE2C6', Lc), { tex: 0.35, dir: Math.PI / 2, scale: 0.3 });
  ctx.save(); ctx.clip(wax);
  // shade on the side away from the strongest light (kSide: +1 = kandil on the right → shade on the left)
  const shX = kSide > 0 ? [-CW - 3, -CW + 15] : [CW - 15, CW + 3];
  fillG(ctx, polyPath([[shX[0], y0 + 2], [shX[1], y0 + 2], [shX[1] + (kSide > 0 ? -2 : 2), y1 - 2], [shX[0], y1 - 2]]), tintW('#C9B894', Lc), { tex: 0.3, dir: Math.PI / 2, scale: 0.3 });
  const hiX = kSide > 0 ? [CW - 11, CW - 4] : [-CW + 4, -CW + 11];
  fillG(ctx, polyPath([[hiX[0], y0], [hiX[1], y0], [hiX[1], y1 + 8], [hiX[0], y1 + 8]]), tintW('#FBF4E3', Lc), { tex: 0.2, dir: Math.PI / 2, scale: 0.3, alpha: 0.9 });
  // glow of the flame through the top of the wax
  if (Cd.fs > 0.05) fillG(ctx, rough([[-CW - 2, y1 - 2], [CW + 2, y1 - 2], [CW + 2, y1 + 34], [-CW - 2, y1 + 44]], { amp: 2.5, seed: 83 }), '#F9DFA6', { tex: 0.2, alpha: 0.55 * clamp(Cd.fs) });
  // faint cool rim when unlit
  if (Lc < 0.6) fillG(ctx, polyPath([[CW - 3, y0], [CW + 1, y0], [CW + 1, y1], [CW - 3, y1]]), '#8D88B0', { tex: 0, alpha: (0.6 - Lc) * 0.6 });
  ctx.restore();
  fillG(ctx, polyPath(ellipsePts(0, y1, CW + 0.5, 6, 22)), tintW('#F6EEDB', Lc), { tex: 0.15 });
  fillG(ctx, polyPath(ellipsePts(0.6, y1 + 0.8, CW - 7, 3.8, 18)), tintW('#D6C59F', Lc), { tex: 0.1 });
  const dl = 14 + 36 * Cd.drain;
  fillG(ctx, polyPath(crPts([[-17, y1 + 3], [-10, y1 + 3], [-10.5, y1 + dl], [-13.5, y1 + dl + 4], [-16, y1 + dl]], true, 5)), tintW('#F6EEDB', Lc), { tex: 0.15 });
  const dl2 = 8 + 20 * Cd.drain;
  fillG(ctx, polyPath(crPts([[12, y1 + 3], [18, y1 + 3], [17.5, y1 + dl2], [15.4, y1 + dl2 + 3.5], [13.3, y1 + dl2]], true, 5)), tintW('#E3D6B6', Lc), { tex: 0.15 });
  strokeG(ctx, [[0, y1 + 1], [0.6, y1 - 4], [2, y1 - 9]], 3.4, '#2E241F', { tex: 0, taper: false });
  ctx.restore();
}

// ------------------------------------------------------------------ hands (rig.js colours; one person off-frame left)
const SKIN = '#CC9670', SKIN_SH = '#A9724F', SKIN_HI = '#DDAA84', SHIRT = '#F1E9D6', SHIRT_SH = '#CFC1A7', DUSK = '#2B2442';
// hand-local px: origin = wrist, +x toward the fingertips, +y = palm side
const H_OPEN = resampleN([[-4, -21], [26, -24], [52, -23], [78, -20], [100, -15], [116, -8], [121, 0], [117, 7], [102, 11], [82, 13], [62, 17], [48, 24], [28, 26], [8, 24], [-4, 21]], 48);
const H_GRIP = resampleN([[-4, -21], [26, -24], [50, -25], [68, -22], [80, -13], [85, 0], [83, 14], [75, 25], [62, 31], [48, 30], [34, 27], [16, 25], [-4, 21]], 48);
const H_HOLD = resampleN([[-4, -21], [26, -23], [52, -22], [78, -19], [97, -14], [109, -6], [113, 3], [109, 11], [97, 14], [80, 14], [62, 17], [48, 24], [28, 26], [8, 24], [-4, 21]], 48);
const H_RELAX = resampleN([[-4, -21], [26, -23], [52, -23], [74, -19], [90, -11], [96, 0], [92, 11], [80, 17], [64, 21], [48, 25], [28, 26], [8, 24], [-4, 21]], 48);
const HANDS = {
  k: { closed: H_GRIP, thumbO: [[12, 14], [30, 30], [44, 38]], thumbC: [[12, 12], [40, 14], [63, 9]], gp: [68, 7] },
  c: { closed: H_HOLD, thumbO: [[12, 14], [30, 30], [44, 38]], thumbC: [[14, 16], [40, 30], [66, 31]], gp: [92, 14] },
};
const handF = (w, ang, side) => { const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy * side, ny = ux * side; return (q) => [w[0] + ux * q[0] + nx * q[1], w[1] + uy * q[0] + ny * q[1]]; };
const skinT = (c, L, far) => css(mix(mix(c, '#E8B07C', 0.18 * L), DUSK, 0.48 - 0.3 * L + (far ? 0.06 : 0)));
const shirtT = (c, L, far) => css(mix(mix(c, '#E9B48A', 0.32 * L), DUSK, 0.7 - 0.3 * L + (far ? 0.05 : 0)));
function drawHandBack(ctx, F, H, gk, L, far, seed, ang, rel = 0) {
  const pts = H_OPEN.map((q, i) => { const c = H.closed[i], r = H_RELAX[i]; const x = lerp(q[0], c[0], gk), y = lerp(q[1], c[1], gk); return F([lerp(x, r[0], rel), lerp(y, r[1], rel)]); });
  const hp = rough(pts, { amp: 0.7, seed: seed + 3, step: 3 });
  fillG(ctx, hp, skinT(SKIN, L, far), { tex: 0.3, dir: ang, scale: 0.35, tx: pts[0][0], ty: pts[0][1] });
  ctx.save(); ctx.clip(hp);
  // palm-side shade and back-of-hand light (flat tones)
  const sh = [[-6, 12], [90, 8], [90, 40], [-6, 40]].map(F);
  fillG(ctx, rough(sh, { amp: 1, seed: seed + 4 }), skinT(SKIN_SH, L, far), { tex: 0.2, alpha: 0.8 });
  const hi = [[4, -22], [70, -24], [70, -14], [4, -12]].map(F);
  fillG(ctx, rough(hi, { amp: 0.8, seed: seed + 5 }), skinT(SKIN_HI, L, far), { tex: 0.15, alpha: 0.7 });
  // finger separations
  const fp = new Path2D();
  if (H === HANDS.k) { for (let k = 0; k < 3; k++) { const x = 57 + k * 9; polyPath(capsule(F([x, 2]), F([x + 3, 27]), 2, 1.5, 4), fp); } }
  else { for (let k = 0; k < 3; k++) { const y = -9 + k * 7; polyPath(capsule(F([64, y]), F([lerp(112, 106, gk), y + 2]), 1.7, 1.3, 4), fp); } }
  fillG(ctx, fp, skinT(SKIN_SH, L, far), { tex: 0, alpha: 0.8 * (H === HANDS.k ? clamp((gk - 0.3) / 0.4) : 1) });
  ctx.restore();
}
const THUMB_RELAX = [[12, 14], [34, 22], [54, 22]];
function drawThumb(ctx, F, H, gk, L, far, seed, rel = 0) {
  const q = H.thumbO.map((a, i) => { const x = lerp(a[0], H.thumbC[i][0], gk), y = lerp(a[1], H.thumbC[i][1], gk); return F([lerp(x, THUMB_RELAX[i][0], rel), lerp(y, THUMB_RELAX[i][1], rel)]); });
  const pts = crPts(q, false, 6);
  strokeG(ctx, pts, (u) => lerp(24, 18, u) * (1 - 0.2 * Math.pow(u, 6)), skinT(SKIN_SH, L * 0.6, far), { tex: 0, taper: false, seed: seed + 1 });
  strokeG(ctx, pts, (u) => lerp(20, 14, u) * (1 - 0.25 * Math.pow(u, 6)), skinT(SKIN, L, far), { tex: 0.2, taper: false, seed });
  const tip = pts[pts.length - 1], pre = pts[pts.length - 4];
  const d = nrm(sub(tip, pre));
  fillG(ctx, polyPath(ellipsePts(tip[0] - d[0] * 4, tip[1] - d[1] * 4, 4.2, 3, 10, Math.atan2(d[1], d[0]))), skinT(SKIN_HI, L, far), { tex: 0, alpha: 0.65 });
}
/** sleeve: one tapered Bézier ribbon from an off-frame anchor to the cuff, in 3 flat light steps, with a shade side, a warm rim and a cuff band */
function drawSleeve(ctx, A, cuff, dirC, srcs, far, seed, bend) {
  const D = len(sub(cuff, A));
  const P2 = add(cuff, dirC, -D * 0.4);
  const dA = rot2(nrm(sub(P2, A)), bend), P1 = add(A, dA, D * 0.3);
  const N = 26, pts = [], nor = [];
  for (let i = 0; i <= N; i++) pts.push(bez([A, P1, P2, cuff], i / N));
  for (let i = 0; i <= N; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)]; const tn = nrm(sub(b, a)); nor.push([-tn[1], tn[0]]); }
  const wA = 56, wC = 26;
  const wd = (u) => lerp(wA, wC, Math.pow(u, 0.75));
  const fl = srcs.length ? srcs.reduce((b, s) => (len(sub(s.c, cuff)) < len(sub(b.c, cuff)) ? s : b)).c : [cuff[0] + 100, cuff[1] - 100];
  const litSide = (nor[N][0] * (fl[0] - cuff[0]) + nor[N][1] * (fl[1] - cuff[1])) > 0 ? 1 : -1;
  const strip = (i0, i1, f0, f1) => { const l = [], r = []; for (let i = i0; i <= i1; i++) { const w = wd(i / N); l.push(add(pts[i], nor[i], w * f0)); r.push(add(pts[i], nor[i], w * f1)); } return l.concat(r.reverse()); };
  const sections = [[0, 13], [12, 21], [20, N]];
  const dir = Math.atan2(cuff[1] - A[1], cuff[0] - A[0]);
  for (let k = 0; k < 3; k++) {
    const [i0, i1] = sections[k], mid = pts[(i0 + i1) >> 1];
    const L = lightAt(mid, srcs);
    const body = rough(strip(i0, i1, 1, -1), { amp: 1.4, seed: seed + k, step: 5 });
    fillG(ctx, body, shirtT(SHIRT, L, far), { tex: 0.42, dir, scale: 0.42, tx: A[0], ty: A[1] });
    fillG(ctx, rough(strip(i0, i1, -litSide * 1, -litSide * 0.3), { amp: 1, seed: seed + 10 + k, step: 5 }), shirtT(SHIRT_SH, L * 0.7, far), { tex: 0.3, dir, alpha: 0.9 });
    if (L > 0.05) fillG(ctx, rough(strip(i0, i1, litSide * 1, litSide * 0.72), { amp: 0.7, seed: seed + 20 + k, step: 5 }), '#E3B98C', { tex: 0.2, dir, alpha: 0.5 * L });
  }
  // soft folds (two short creases)
  for (const [u, l] of [[0.55, 0.5], [0.72, 0.42]]) {
    const i = Math.round(u * N), w = wd(u);
    const a = add(pts[i], nor[i], -litSide * w * 0.9), b = add(add(pts[i], nor[i], -litSide * w * (0.9 - l)), sub(pts[Math.min(N, i + 2)], pts[i]), 0.6);
    fillG(ctx, polyPath(capsule(a, b, 1.8, 0.8, 4)), shirtT(SHIRT_SH, lightAt(pts[i], srcs) * 0.6, far), { tex: 0, alpha: 0.75 });
  }
  // cuff band
  const Lc = lightAt(cuff, srcs);
  fillG(ctx, rough(strip(N - 3, N, 1.06, -1.06), { amp: 0.6, seed: seed + 30, step: 3 }), shirtT(SHIRT_SH, Lc, far), { tex: 0.25, dir: dir + Math.PI / 2 });
}
/** whole arm in two layers: 'back' (sleeve + palm/fingers, under the object) and 'front' (thumb over the object) */
function drawArm(ctx, layer, A, w, ang, side, H, gk, srcs, far, seed, bend, rel = 0) {
  const F = handF(w, ang, side);
  const L = lightAt(F([60, 0]), srcs);
  if (layer === 'back') {
    const dirC = [Math.cos(ang), Math.sin(ang)];
    drawSleeve(ctx, A, add(w, dirC, 3), dirC, srcs, far, seed, bend);
    drawHandBack(ctx, F, H, gk, L, far, seed, ang, rel);
  } else drawThumb(ctx, F, H, gk, L, far, seed + 7, rel);
}

// ------------------------------------------------------------------ arms: choreography
const ANG_K = 0.86, ANG_C = -0.1;
const A_FAR = [-60, 200], A_NEAR = [-118, 1102];
function farArm(t, K) {
  const inn = seg(t, 39.35, 39.88, E.inOutCubic);
  if (inn <= 0) return null;
  const settle = 0.035 * Math.sin(Math.PI * clamp((inn - 0.82) / 0.18));          // tiny overshoot at the end of the reach
  const gk = seg(t, 39.83, 39.97, E.inOutSine);
  const gWorld = K.W2(K_GRIP);
  const ang = ANG_K + K.rot * 0.7 - 0.4 * (1 - inn);
  const H = HANDS.k, F0 = handF([0, 0], ang, 1), off = F0(H.gp);
  const wGrip = sub(gWorld, off);
  const d = 1 - inn - settle;                                                     // 1 = fully out, 0 = at the handle
  const path = [[0, 0], [-120, -40], [-330, -170], [-470, -330]];                 // curved approach from the upper left
  const o = bez(path, clamp(d));
  const w = add(wGrip, o);
  const carry = sub(gWorld, add(KP, K_GRIP));
  const A = add(add(A_FAR, carry), o, 0.6);                                        // the shoulder moves less than the hand (reach)
  return { A, w, ang, gk, H };
}
function nearArm(t, Cd) {
  const inn = seg(t, 39.55, 40.12, E.inOutCubic);
  const back = seg(t, C_T1 + 0.03, C_T1 + 0.31, E.inOutCubic);
  if (inn <= 0 || back >= 1) return null;
  const settle = 0.035 * Math.sin(Math.PI * clamp((inn - 0.82) / 0.18));
  const gk = seg(t, 40.08, 40.22, E.inOutSine);
  const rel = seg(t, C_T1 - 0.02, C_T1 + 0.12, E.inOutSine);                     // lets go: fingers curl softly
  const ang = ANG_C + Cd.rot * 0.8 + 0.35 * (1 - inn) + 0.06 * back;
  const H = HANDS.c, F0 = handF([0, 0], ang, -1), off = F0(H.gp);
  const sp = Cd.W2([-20, 2]);                                                       // under the saucer's left half
  const wHold = sub(sp, off);
  const d = 1 - inn - settle;
  const path = [[0, 0], [-90, 50], [-250, 120], [-400, 170]];
  const carry = Cd.e;
  const A0 = add(A_NEAR, [-20 * carry, 22 * carry]);
  const toA = nrm(add(nrm(sub(A0, wHold)), [-1, -0.25]));
  const o = add(bez(path, clamp(d)), toA, 470 * back);
  const w = add(wHold, o);
  const A = add(add(A0, bez(path, clamp(d)), 0.55), toA, 300 * back);
  return { A, w, ang, gk, H, rel };
}

// ------------------------------------------------------------------ dashed gouache arrows (annotation layer: on top, dark under-stroke)
function drawArrow(ctx, P, prog, alpha, seed) {
  if (prog <= 0 || alpha <= 0.01) return;
  const N = 100, pts = [], acc = [0]; let tot = 0;
  for (let i = 0; i <= N; i++) { pts.push(bez(P, i / N)); if (i) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc.push(tot); } }
  const L = tot * prog, dash = 24, gap = 15, col = '#F6E6B8', under = '#2B2442';
  const at = (s) => { let i = 1; while (i < acc.length - 1 && acc[i] < s) i++; const u = (s - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1); return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]; };
  const headLen = 30, hk = clamp((prog - 0.82) / 0.18);
  const dp = new Path2D(), up = new Path2D();
  const Lb = L - headLen * 0.75 * hk;
  for (let s = 0, k = 0; s < Lb - 4; s += dash + gap, k++) {
    const s1 = Math.min(s + dash, Lb - 2); if (s1 <= s + 3) break;
    const a = at(s + 3), b = at(s1 - 3);
    polyPath(roughen(capsule(a, b, 5, 5, 6), { amp: 0.6, seed: seed + k, step: 2.5 }), dp);
    polyPath(capsule(add(a, [1.5, 2.5]), add(b, [1.5, 2.5]), 8, 8, 6), up);
  }
  let head = null, headU = null;
  if (hk > 0) {
    const tip = at(L), bk = at(Math.max(0, L - 14)); const an = Math.atan2(tip[1] - bk[1], tip[0] - bk[0]);
    const l = headLen * E.outBackSoft(hk), wv = l * 0.62;
    const ux = Math.cos(an), uy = Math.sin(an);
    const tri = [[tip[0] + ux * 4, tip[1] + uy * 4], [tip[0] - ux * l - uy * wv, tip[1] - uy * l + ux * wv], [tip[0] - ux * l * 0.72, tip[1] - uy * l * 0.72], [tip[0] - ux * l + uy * wv, tip[1] - uy * l - ux * wv]];
    head = rough(tri, { amp: 0.8, seed: seed + 60, step: 3 });
    headU = polyPath(tri.map((q) => add(q, [1.5, 2.5])).map((q, i) => i === 2 ? q : add(q, [(q[0] - tip[0]) * 0.12, (q[1] - tip[1]) * 0.12])));
  }
  ctx.save(); ctx.globalAlpha *= alpha;
  fillG(ctx, up, under, { tex: 0, alpha: 0.5 });
  if (headU) fillG(ctx, headU, under, { tex: 0, alpha: 0.5 });
  fillG(ctx, dp, col, { tex: 0.2 });
  if (head) fillG(ctx, head, col, { tex: 0.2 });
  ctx.restore();
}

// ------------------------------------------------------------------ brass glints at "Bâki" (precious, everlasting)
function drawGlints(ctx, t, K) {
  for (const [lp, t0, sz] of [[[0, -160], T.baki + 0.12, 16], [[44, -80], T.baki + 0.42, 13], [[150, -96], T.baki + 0.7, 11]]) {
    const k = env(t, t0, t0 + 0.55, 0.22, 0.33, E.inOutSine); if (k <= 0.01) continue;
    const p = K.W2(lp), r = sz * k, a = 0.4 * (t - t0);
    const path = new Path2D();
    for (let i = 0; i < 4; i++) { const an = a + (i / 4) * TAU, an2 = an + Math.PI / 4; const q = (rr, aa) => [p[0] + Math.cos(aa) * rr, p[1] + Math.sin(aa) * rr];
      const A = q(r, an), B = q(r * 0.16, an2), C = q(r * 0.16, an2 - Math.PI / 2); if (i === 0) path.moveTo(...C); path.lineTo(...A); path.lineTo(...B); }
    path.closePath();
    fillG(ctx, path, '#FFF4D6', { tex: 0, alpha: 0.95 * k });
  }
}
// ------------------------------------------------------------------ motes & smoke & ember
function drawMotes(ctx, t, c, a) {
  if (a <= 0.01) return;
  const R = rng(4242); const p = new Path2D(), p2 = new Path2D();
  for (let i = 0; i < 18; i++) {
    const per = 3.2 + R() * 2.4, ph = R() * per, x0 = (R() - 0.5) * 300, y0 = 30 + R() * 80, sz = 2.2 + R() * 2.8, sw = 8 + R() * 14, fr = 0.5 + R() * 0.6;
    const q = ((((t + ph) % per) + per) % per) / per;
    const x = c[0] + x0 + Math.sin(t * fr + i) * sw, y = c[1] + y0 - q * 230;
    const s = sz * (0.4 + 0.6 * Math.sin(Math.PI * q));
    polyPath(ellipsePts(x, y, s, s, 8), i % 3 ? p : p2);
  }
  fillG(ctx, p, '#F8E8C3', { tex: 0, alpha: a * 0.85 });
  fillG(ctx, p2, '#F2C878', { tex: 0, alpha: a * 0.85 });
}
function drawSmoke(ctx, t, wick) {
  const s = invlerp(T.gibidir + 0.13, T.gibidir + 1.05, t);
  if (s <= 0 || s >= 1) return;
  const L = 270 * E.outCubic(Math.min(1, s * 1.25)), s0 = 210 * E.inQuad(s), pts = [];
  const sx = (d) => wick[0] + (3 + d * 0.11) * Math.sin(d * 0.034 - t * 1.7) + d * 0.07;
  for (let d = s0; d <= L; d += 5) pts.push([sx(d), wick[1] - d]);
  const fade = 1 - E.inQuad(s);
  if (pts.length >= 3) {
    const wf = (u) => lerp(11, 4, u) * (1 - 0.35 * s);
    strokeG(ctx, pts, wf, '#A69EB6', { tex: 0.3, alpha: 0.85 * fade, seed: 9, taper: false });
    strokeG(ctx, pts.map(([x, y]) => [x - 1.2, y]), (u) => wf(u) * 0.38, '#D2CBDD', { tex: 0.2, alpha: 0.7 * fade, seed: 10, taper: false });
  }
  // puffs breaking off the top and drifting
  for (let k = 0; k < 3; k++) {
    const tk = invlerp(T.gibidir + 0.45 + k * 0.17, T.gibidir + 1.05 + k * 0.17, t); if (tk <= 0 || tk >= 1) continue;
    const d = 200 + 70 * tk + k * 18, r = 6 + 9 * tk;
    fillG(ctx, rough(ellipsePts(sx(d) + 8 * tk * (k % 2 ? 1 : -1), wick[1] - d, r, r * 0.75, 14), { amp: 1, seed: 940 + k }), '#A69EB6', { tex: 0.2, alpha: 0.6 * Math.sin(Math.PI * tk) * fade });
  }
}


// ------------------------------------------------------------------ foreground drape (top-left, its own parallax layer k = 1.3)
// Designed in screen px at the REF camera; it slides in during the pull-out, frames the two-lamp shot, hides the far
// arm's shoulder and the departing kandil, and slides out during the final push-in.
const KF = 1.3;
const DR = { x0: -80, y0: -80, w: 420, h: 1140, s: 1.15 };
const camFg = (c) => ({ x: REF.x + (c.x - REF.x) * KF, y: REF.y + (c.y - REF.y) * KF, z: REF.z * Math.pow(c.z / REF.z, KF) });
const DRAPE_EDGE = [[252, -80], [240, 30], [212, 150], [172, 285], [130, 410], [102, 512], [112, 566], [100, 690], [66, 820], [22, 958], [-80, 1060]];
function paintDrape(g) {
  g.save(); g.scale(DR.s, DR.s); g.translate(-DR.x0, -DR.y0);
  const edge = crPts(DRAPE_EDGE, false, 8);
  const body = rough([[-90, -90]].concat(edge, [[-90, 1070]]), { amp: 1.6, seed: 801, step: 5 });
  fillG(g, body, '#1A1428', { tex: 0.45, dir: Math.PI / 2, scale: 0.6 });
  g.save(); g.clip(body);
  // folds converge on the tie-back
  const tie = [100, 512];
  for (const [x, w, c, sd] of [[-30, 70, '#120E1D', 811], [52, 34, '#241C35', 812], [118, 46, '#120E1D', 813], [186, 30, '#261D37', 814]]) {
    fillG(g, rough(crPts([[x - w / 2, -90], [x + w / 2, -90], [lerp(x + w / 2, tie[0] + 6, 0.6), 300], [tie[0] + 4, tie[1] - 4], [tie[0] - 4, tie[1] - 4], [lerp(x - w / 2, tie[0] - 6, 0.6), 300]], true, 6), { amp: 2, seed: sd, step: 6 }), c, { tex: 0.35, dir: Math.PI / 2, scale: 0.6 });
  }
  for (const [x, w, c, sd] of [[-20, 60, '#120E1D', 821], [50, 26, '#251C36', 822]]) {
    fillG(g, rough(crPts([[tie[0] - 6, tie[1] + 10], [tie[0] + 6, tie[1] + 10], [x + w / 2 + 40, 900], [x + w / 2, 1070], [x - w / 2, 1070], [x - w / 2 + 30, 900]], true, 6), { amp: 2, seed: sd, step: 6 }), c, { tex: 0.35, dir: Math.PI / 2, scale: 0.6 });
  }
  g.restore();
  // trim along the inner edge (muted gold braid)
  const trim = []; const tr2 = [];
  for (let i = 0; i < edge.length; i++) { const a = edge[Math.max(0, i - 1)], b = edge[Math.min(edge.length - 1, i + 1)]; const tn = nrm(sub(b, a)); trim.push(add(edge[i], [tn[1], -tn[0]], 1)); tr2.push(add(edge[i], [tn[1], -tn[0]], 7)); }
  fillG(g, rough(trim.concat(tr2.reverse()), { amp: 0.8, seed: 830, step: 4 }), '#4C3C30', { tex: 0.3, dir: Math.PI / 2 });
  // tie-back cord + tassel
  fillG(g, rough(crPts([[-90, 492], [40, 494], [108, 500], [120, 516], [108, 530], [40, 528], [-90, 526]], true, 6), { amp: 1, seed: 831, step: 3 }), '#5E4B36', { tex: 0.35, dir: 0 });
  fillG(g, rough(crPts([[-90, 500], [60, 502], [112, 508], [60, 512], [-90, 510]], true, 6), { amp: 0.6, seed: 832, step: 3 }), '#7A6244', { tex: 0.2, dir: 0, alpha: 0.7 });
  fillG(g, rough(ellipsePts(114, 534, 9, 10, 14), { amp: 0.5, seed: 833 }), '#6B5640', { tex: 0.2 });
  fillG(g, rough(crPts([[106, 544], [122, 544], [128, 600], [100, 600]], true, 5), { amp: 1.2, seed: 834, step: 2 }), '#4E3D2F', { tex: 0.4, dir: Math.PI / 2, scale: 0.3 });
  fillG(g, rough([[104, 552], [124, 552], [124, 558], [104, 558]], { amp: 0.4, seed: 835 }), '#7A6244', { tex: 0.2 });
  g.restore();
}
const drapeSprite = () => sprite('lamps6_drape', DR.w * DR.s, DR.h * DR.s, paintDrape);
function drawDrape(ctx, cam, rimL) {
  const f = camFg(cam);
  // REF-screen px → fg world: P = REF + (Q − C) / REF.z
  const P0 = [REF.x + (DR.x0 - W / 2) / REF.z, REF.y + (DR.y0 - H / 2) / REF.z];
  const x0 = W / 2 + (P0[0] - f.x) * f.z, sc = f.z / REF.z;
  if (x0 + DR.w * sc < 0) return;   // fully off-frame
  ctx.save(); ctx.setTransform(sc, 0, 0, sc, x0, H / 2 + (P0[1] - f.y) * f.z);
  ctx.drawImage(drapeSprite(), 0, 0, DR.w, DR.h);
  // warm rim on the inner edge where the kandil light reaches it
  if (rimL > 0.02) {
    const e = crPts(DRAPE_EDGE, false, 8).map(([x, y]) => [x - DR.x0, y - DR.y0]);
    const l = [], r = [];
    for (let i = 0; i < e.length; i++) { const a = e[Math.max(0, i - 1)], b = e[Math.min(e.length - 1, i + 1)], tn = nrm(sub(b, a)); l.push(add(e[i], [tn[1], -tn[0]], 8)); r.push(add(e[i], [tn[1], -tn[0]], 15)); }
    fillG(ctx, rough(l.concat(r.reverse()), { amp: 0.8, seed: 840, step: 4 }), '#8A5A58', { tex: 0.2, alpha: 0.55 * rimL });
  }
  ctx.restore();
}

// ------------------------------------------------------------------ kandil drawing pieces (also re-used over the iris flood)
function drawKandilBody(ctx, K, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(K.grip[0], K.grip[1]); ctx.rotate(K.rot); ctx.translate(-K_GRIP[0], -K_GRIP[1]);
  ctx.drawImage(kandilSprite(), KSPR.x0, KSPR.y0, KSPR.w, KSPR.h); ctx.restore();
}
function drawKandilFlame(ctx, t, K, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  drawFlame(ctx, K.noz[0], K.noz[1] + 2, 1 + 0.04 * noise1(t * 1.7, 5), 2.5 * noise1(t * 1.1, 3) - clamp(K.vel[0] * 0.012, -14, 14) + K.rot * 20, true);
  ctx.restore();
}

// ------------------------------------------------------------------ main draw
export function draw(ctx, t) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (t < T.irisA) { ctx.fillStyle = FLOOD; ctx.fillRect(0, 0, W, H); ctx.restore(); return; }
  if (t >= T.night) { ctx.drawImage(nightSprite(), 0, 0); ctx.restore(); return; }
  const cam = camOf(t), camI = camInt(cam), vis = visRect(cam);
  const K = kandilState(t), Cd = candleState(t);
  const kScale = (1 + 0.14 * seg(t, T.baki, T.baki + 0.75, E.inOutCubic)) * (1 + 0.012 * noise1(t * 0.8, 12) * seg(t, T.irisB, T.irisB + 0.4));
  const kOnScreen = K.flame[0] + 300 > vis[0] && K.flame[1] + 300 > vis[1];
  const kSpd = clamp(len(K.vel) / K_VMAX);
  const kHalo = kScale * (1 - 0.32 * smooth01(kSpd)), kZone = kScale * (1 - 0.14 * smooth01(kSpd));
  const srcs = [];
  if (kOnScreen) srcs.push({ c: [K.flame[0] - 40, K.flame[1] + 14], R: K_ZONES.map((r) => r * kZone), a: [1, 1, 1], seed: 300, M: [56, 44, 32] });
  if (Cd.lr > 0.01) srcs.push({ c: [Cd.flame[0], Cd.flame[1] + 14], R: C_ZONES.map((r) => r * Cd.lr), a: Cd.za, seed: 340, M: [34, 26, 20] });

  // 1) wall + niche interior (parallax) with stepped light pools
  drawLighting(ctx, cam, camI, srcs);
  setCam(ctx, cam);
  // 2) kandil cast shadow on the niche back wall (light from its flame on the right), clipped to the opening
  const restK = 1 - seg(K.s, 0, 60, smooth01);
  if (restK > 0.01) {
    ctx.save(); ctx.clip(openPath()); ctx.globalAlpha = 0.2 * restK; ctx.translate(KP[0] - 70, KP[1] - 30); ctx.scale(1.14, 1.2);
    ctx.drawImage(kandilSil(), KSPR.x0, KSPR.y0, KSPR.w, KSPR.h); ctx.restore();
  }
  // 3) thin warm bounce line on the ledge lip under each light
  for (const s of srcs) {
    const k = (s.a[2] * 0.6 + s.a[1] * 0.4) * clamp(1 - (LEDGE - s.c[1]) / 320); if (k <= 0.02) continue;
    const r = s.R[1] * 0.7;
    fillG(ctx, rough([[s.c[0] - r, 990], [s.c[0] + r, 990], [s.c[0] + r * 0.9, 994], [s.c[0] - r * 0.9, 994]], { amp: 0.8, seed: s.seed + 7 }), '#C98552', { tex: 0.2, alpha: 0.55 * k });
  }
  // 4) flame halos (air glow: concentric flat rings)
  if (kOnScreen) drawHalo(ctx, K.flame, K_HALO, kHalo, 700);
  drawHalo(ctx, Cd.flame, C_HALO, Cd.lr * (1 + 0.05 * noise1(t * 4, 3)) * lerp(0.35, 1, Math.max(Cd.fs, Cd.za[0] * 0.3)), 720, Math.max(Cd.za[1], Cd.za[2]));
  // 5) rings: eternity ring travels with the kandil (fades only once its centre leaves the frame); dial with the candle
  if (kOnScreen) {
    const cs = toScreen(cam, K.cen);
    drawEternity(ctx, t, K.cen, smooth01(clamp(invlerp(-170, 70, Math.min(cs[0], cs[1])))));
  }
  drawDial(ctx, t, Cd.cen, 1 - seg(t, T.gibidir + 0.2, T.gibidir + 0.6, E.inOutSine));
  // 6) arms — back layers (sleeves, palms/fingers under the objects)
  const fa = farArm(t, K), na = nearArm(t, Cd);
  if (fa) drawArm(ctx, 'back', fa.A, fa.w, fa.ang, 1, fa.H, fa.gk, srcs, true, 1200, 0.12);
  if (na) drawArm(ctx, 'back', na.A, na.w, na.ang, -1, na.H, na.gk, srcs, false, 1300, -0.1, na.rel);
  // 7) candle + its flame
  const Lc = Math.max(Cd.light * 0.95, lightAt(Cd.cen, srcs.length && srcs[0].seed === 300 ? [srcs[0]] : []));
  drawCandle(ctx, t, Cd, Lc, K.u < 0.15 ? 1 : -1);
  if (Cd.fs > 0.01) glow(ctx, Cd.flame[0], Cd.flame[1] - 4, 80 * Cd.lr, '#F6C46A', 0.2);
  drawFlame(ctx, Cd.wick[0], Cd.wick[1], Cd.fs, 3 * noise1(t * 2.2, 8) + Cd.wv * 14 * Math.sin(t * 13.1) * (0.6 + 0.4 * Math.cos(t * 5.3)) - clamp(Cd.vel[0] * 0.014, -12, 12), false);
  if (Cd.ember > 0.01) {
    fillG(ctx, polyPath(ellipsePts(Cd.wick[0] + 1.5, Cd.wick[1] - 1, 11 * Cd.ember, 9 * Cd.ember, 14)), '#E8703A', { tex: 0, alpha: 0.25 * Cd.ember });
    fillG(ctx, polyPath(ellipsePts(Cd.wick[0] + 1.5, Cd.wick[1] - 1, 4, 3.6, 10)), '#E8703A', { tex: 0, alpha: Cd.ember });
    fillG(ctx, polyPath(ellipsePts(Cd.wick[0] + 1.2, Cd.wick[1] - 1.5, 1.8, 1.6, 8)), '#FFC27A', { tex: 0, alpha: Cd.ember });
  }
  // 8) kandil
  const revealA = seg(t, T.irisB, T.irisB + 0.3);                        // glow + motes fade in after the iris lands
  if (kOnScreen) {
    if (restK > 0.01) fillG(ctx, polyPath(ellipsePts(KP[0], KP[1] + 1, 58, 7, 30)), '#120E18', { tex: 0, alpha: 0.5 * restK });
    drawKandilBody(ctx, K);
    glow(ctx, K.flame[0], K.flame[1] - 6, 150 * kHalo, '#F6C46A', 0.18 * revealA);
    drawKandilFlame(ctx, t, K);
    drawGlints(ctx, t, K);
  }
  // 9) arms — front layers (thumbs over the handle / the saucer rim)
  if (fa) drawArm(ctx, 'front', fa.A, fa.w, fa.ang, 1, fa.H, fa.gk, srcs, true, 1200);
  if (na) drawArm(ctx, 'front', na.A, na.w, na.ang, -1, na.H, na.gk, srcs, false, 1300, 0, na.rel);
  // 10) swap arrows (⇄): kandil out — up and away to the upper left; candle in — low arc along the ledge into its place
  const arrA = 1 - seg(t, 40.55, 40.85, E.inOutSine);
  drawArrow(ctx, [[574, 722], [560, 600], [452, 520], [246, 506]], seg(t, 39.72, 40.1, E.inOutCubic), arrA, 900);
  drawArrow(ctx, [[298, 1010], [362, 1046], [470, 1046], [530, 1008]], seg(t, 39.82, 40.2, E.inOutCubic), arrA, 950);
  // 11) smoke + motes
  drawSmoke(ctx, t, Cd.wick);
  if (kOnScreen) drawMotes(ctx, t, K.flame, revealA * (1 - seg(K.s, 0, 220)));
  // 12) foreground drape (parallax)
  { const f = camFg(cam); const edgeW = [REF.x + (150 - W / 2) / REF.z, REF.y + (420 - H / 2) / REF.z];
    drawDrape(ctx, cam, kOnScreen ? lightAt(edgeW, srcs.length && srcs[0].seed === 300 ? [srcs[0]] : []) : 0); }

  // 13) screen space: sink to night, then the flood iris
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const nk = seg(t, T.nightA, T.night, E.inOutSine);
  if (nk > 0) { ctx.globalAlpha = nk; ctx.drawImage(nightSprite(), 0, 0); ctx.globalAlpha = 1; }
  if (t < T.irisB) {
    // the flood contracts (starting at the farthest corner, decelerating) onto the halo's gold ring, then becomes the lamp's light
    const fc = toScreen(cam, K.flame), z = cam.z;
    const u = invlerp(35.64, T.irisB, t), e = 1 - Math.pow(1 - u, 2.4);
    const far = Math.max(Math.hypot(fc[0], fc[1]), Math.hypot(W - fc[0], fc[1]), Math.hypot(fc[0], H - fc[1]), Math.hypot(W - fc[0], H - fc[1]));
    const rEnd = K_HALO[2] * kScale * z, r = lerp(far + 8, rEnd, e), k = r / rEnd;
    const tex = 0.3 * seg(t, T.irisA + 0.1, T.irisB, E.inOutSine);
    const ring = (i, a) => fillG(ctx, polyPath(ringPoly(fc[0], fc[1], K_HALO[i] * kScale * z * k, 700 + i * 7, (1.6 + K_HALO[i] * 0.015) * z * Math.min(k, 3), 90)), HALO_COL[i], { tex, dir: 0, scale: 0.45 * z, tx: fc[0], ty: fc[1], alpha: a });
    ring(0, 0.5 * (1 - seg(t, 35.98, T.irisB)));
    ring(1, 1);
    ring(2, 1);
    // the lamp shows through the landing flood: cream core ring, kandil body and flame fade in on top
    const ra = seg(t, 35.93, 36.07, E.inOutSine);
    if (ra > 0) { setCam(ctx, cam); drawHalo(ctx, K.flame, K_HALO, kScale, 700, ra, 3); drawKandilBody(ctx, K, ra); drawKandilFlame(ctx, t, K, ra); }
  }
  ctx.restore();
}
// debug hooks for offline kinematics checks (pure math; not used by the renderer)
export const __dbg = { kandilState, candleState, camOf, toScreen, K_HALO, KPATH };
