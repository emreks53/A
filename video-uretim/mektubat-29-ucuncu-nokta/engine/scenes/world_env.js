// world_env.js — the vertical world: Dünya (garden, y≈0) · Berzah (twilight mist, y≈-1500…-2700) · Âhiret (garden above golden clouds, y≈-3050)
// Everything is drawn in WORLD coordinates (camera applied by the caller).
import { W, H, P, css, mix, rgb, lerp, clamp, invlerp, smooth, rng, noise1, fbm1, TAU, fillG, rough, ellipsePts, rectPts, crPts, bezPts, roughen, toPath, brushDab, strokeG, sprite, ringHalo, glow, E, TEX } from '../core.js';

// ------------------------------------------------------------------ sky bands (world y → colour), drawn per frame, resolution independent
export const SKY = [
  // âhiret (top): luminous cream → gold → peach → rose
  { y: -5200, c: '#FBF3DF' }, { y: -4300, c: '#F8EBC9' }, { y: -3900, c: '#F5DFAE' }, { y: -3560, c: '#F2CF98' }, { y: -3260, c: '#EDBE92' },
  // transition into berzah: rose → mauve → violet → indigo
  { y: -2980, c: '#D9A39A' }, { y: -2760, c: '#B88E9F' }, { y: -2560, c: '#8E7A9E' }, { y: -2360, c: '#665F8E' }, { y: -2140, c: '#4A4B7A' },
  { y: -1960, c: '#3D4473' }, { y: -1780, c: '#455785' },
  // dünya sky: deep blue → catalogue blues → pale horizon
  { y: -1600, c: '#3B6F95' }, { y: -1180, c: '#4A80A2' }, { y: -820, c: '#6497AE' }, { y: -520, c: '#8AB5BD' }, { y: -300, c: '#B8CCC2' }, { y: -140, c: '#D7D6C3' },
];
const BOUNDARY_STRIPS = new Map();
function boundaryStrip(cA, cB, seed) {
  const key = cA + cB;
  if (BOUNDARY_STRIPS.has(key)) return BOUNDARY_STRIPS.get(key);
  const w = 1400, h = 150;
  const c = new OffscreenCanvas(w, h); const g = c.getContext('2d');
  const R = rng(seed);
  for (let k = 0; k < 420; k++) {
    const x = R() * w, y = 20 + R() * (h - 40);
    const col = y < h / 2 ? (R() < 0.75 ? cB : cA) : (R() < 0.75 ? cA : cB);
    // horizontal wrap so the strip tiles
    const L = 80 + R() * 140, Wd = 5 + R() * 5, a = (R() - 0.5) * 0.05;
    const jitter = mix(col, R() < 0.5 ? '#ffffff' : '#000000', R() * 0.05);
    brushDab(g, x, y, L, Wd, a, jitter, R); if (x < 120) brushDab(g, x + w, y, L, Wd, a, jitter, R); if (x > w - 120) brushDab(g, x - w, y, L, Wd, a, jitter, R);
  }
  BOUNDARY_STRIPS.set(key, c); return c;
}
/** draw sky bands covering world rect [x0,x1]×[y0,y1] */
export function drawSky(ctx, x0, x1, y0, y1) {
  for (let i = 0; i < SKY.length; i++) {
    const a = SKY[i].y, b = i + 1 < SKY.length ? SKY[i + 1].y : 200;
    if (b < y0 || a > y1) continue;
    const p = new Path2D(); p.rect(x0, Math.max(a, y0) - 1, x1 - x0, Math.min(b, y1) - Math.max(a, y0) + 2);
    fillG(ctx, p, SKY[i].c, { tex: 0.3, kind: 'dabs', scale: 0.9, dir: 0 });
  }
  for (let i = 1; i < SKY.length; i++) {
    const yb = SKY[i].y; if (yb < y0 - 80 || yb > y1 + 80) continue;
    const strip = boundaryStrip(SKY[i - 1].c, SKY[i].c, 100 + i);
    const off = ((i * 377) % 1400);
    for (let x = x0 - off; x < x1; x += 1400) ctx.drawImage(strip, x, yb - 75);
  }
}

// ------------------------------------------------------------------ clouds (gouache: white body, lilac-grey underside, warm top light)
/** puffy cumulus: union of circles along a flat-ish base. returns list of [cx,cy,r] (local, base at y=0) */
function puffs(seed, w, h) {
  const R = rng(seed); const out = [];
  const n = 5 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n; const x = lerp(-w / 2, w / 2, u) + (R() - 0.5) * w / n * 0.4;
    const prof = Math.sin(u * Math.PI); const r = h * (0.35 + 0.65 * prof) * (0.75 + R() * 0.35);
    out.push([x, -r * 0.62, r]);
  }
  // a couple of top puffs
  for (let i = 0; i < 2; i++) { const u = 0.35 + R() * 0.3; out.push([lerp(-w / 2, w / 2, u), -h * (0.8 + R() * 0.25), h * (0.45 + R() * 0.2)]); }
  return out;
}
function puffPath(P0, grow = 0, seed = 0, clipBottom = 1e9) {
  const path = new Path2D();
  P0.forEach(([x, y, r], i) => {
    const pts = ellipsePts(x, y, r + grow, r + grow, Math.max(20, (r + grow) * 0.5)).map(([px, py]) => [px, Math.min(py, clipBottom)]);
    toPath(roughen(pts, { amp: 1.6, freq: 0.05, seed: seed + i, step: 6 }), true, path);
  });
  return path;
}
export function drawCloud(ctx, x, y, w, h, seed, { body = '#F4EEE2', shade = '#B9AFBE', light = '#FFFFFF', alpha = 1 } = {}) {
  const key = `cloud${seed}_${w | 0}_${h | 0}_${body}_${shade}`;
  const pad = 40;
  const spr = sprite(key, w + h + pad * 2, h * 2.2 + pad * 2, (g) => {
    g.translate((w + h) / 2 + pad, h * 1.9 + pad);
    const P0 = puffs(seed, w, h);
    // shade silhouette (whole), then body shifted straight up so the shade remains only as the underside band
    fillG(g, puffPath(P0, 0, seed, 0), shade, { tex: 0.35, dir: 0, scale: 0.5 });
    g.save(); g.translate(0, -h * 0.12);
    fillG(g, puffPath(P0, 0, seed + 20, h * 0.12 - 4), body, { tex: 0.35, dir: 0, scale: 0.5 });
    g.restore();
    // light: one opaque union on the upper-right of the big puffs
    const lp = new Path2D();
    P0.forEach(([cx, cy, r], i) => { if (r < h * 0.45) return; toPath(roughen(ellipsePts(cx + r * 0.2, cy - r * 0.24 - h * 0.12, r * 0.6, r * 0.52, 22), { amp: 1.2, seed: seed + 40 + i }), true, lp); });
    fillG(g, lp, light, { tex: 0.3, dir: 0, scale: 0.4 });
  });
  ctx.save(); if (alpha < 1) ctx.globalAlpha *= alpha; ctx.drawImage(spr, x - (w + h) / 2 - pad, y - h * 1.9 - pad); ctx.restore();
}

// ------------------------------------------------------------------ dünya: hills, ground, garden
function hillPts(x0, x1, base, amp, freq, seed, step = 18) {
  const pts = [];
  for (let x = x0 - 60; x <= x1 + 60; x += step) pts.push([x, base - (fbm1(x * freq, seed, 3) * 0.5 + 0.5) * amp]);
  return pts;
}
export function hillY(x, base, amp, freq, seed) { return base - (fbm1(x * freq, seed, 3) * 0.5 + 0.5) * amp; }
export function drawTreeRound(ctx, x, y, s, c1, c2, seed, t = 0) {
  const sw = Math.sin(t * 0.9 + seed) * 2 * s;
  strokeG(ctx, [[x, y], [x + sw * 0.3, y - 30 * s]], 7 * s, '#6B5444', { tex: 0.3, taper: false });
  fillG(ctx, rough(ellipsePts(x + sw, y - 52 * s, 30 * s, 34 * s, 22), { amp: 1.2 * s, seed }), c1, { tex: 0.45, dir: -0.8, scale: 0.3 });
  fillG(ctx, rough(ellipsePts(x + sw - 9 * s, y - 56 * s, 17 * s, 24 * s, 18), { amp: 1 * s, seed: seed + 1 }), c2, { tex: 0.4, dir: -0.8, scale: 0.3 });
}
export function drawCypress(ctx, x, y, s, c1, c2, seed) {
  const pts = [[x, y - 150 * s], [x + 16 * s, y - 80 * s], [x + 13 * s, y - 10 * s], [x - 13 * s, y - 10 * s], [x - 16 * s, y - 80 * s]];
  fillG(ctx, rough(crPts(pts, true, 5), { amp: 1 * s, seed }), c1, { tex: 0.45, dir: Math.PI / 2, scale: 0.3 });
  const p2 = [[x - 2 * s, y - 145 * s], [x - 3 * s, y - 15 * s], [x - 12 * s, y - 15 * s], [x - 15 * s, y - 80 * s]];
  fillG(ctx, rough(crPts(p2, true, 5), { amp: 1 * s, seed: seed + 1 }), c2, { tex: 0.4, dir: Math.PI / 2, scale: 0.3 });
}
function drawMosqueSilhouette(ctx, x, y, s, c, cS) {
  // small distant mosque: dome + minaret, pale blue-green, two tones
  fillG(ctx, rough(rectPts(x - 60 * s, y - 50 * s, 120 * s, 50 * s), { amp: 0.8, seed: 801 }), c, { tex: 0.3, dir: Math.PI / 2, scale: 0.25 });
  const dome = []; for (let i = 0; i <= 18; i++) { const a = Math.PI + (i / 18) * Math.PI; dome.push([x + Math.cos(a) * 42 * s, y - 50 * s + Math.sin(a) * 40 * s]); }
  fillG(ctx, rough(dome, { amp: 0.8, seed: 802 }), c, { tex: 0.3, scale: 0.25 });
  fillG(ctx, rough(dome.map(([px, py]) => [Math.min(px, x - 8 * s), py]), { amp: 0.6, seed: 803 }), cS, { tex: 0.25, scale: 0.25, alpha: 0.9 });
  fillG(ctx, rough(rectPts(x + 72 * s, y - 150 * s, 13 * s, 150 * s), { amp: 0.6, seed: 804 }), c, { tex: 0.3, dir: Math.PI / 2, scale: 0.25 });
  const cap = [[x + 72 * s, y - 150 * s], [x + 78.5 * s, y - 182 * s], [x + 85 * s, y - 150 * s]];
  fillG(ctx, rough(cap, { amp: 0.4, seed: 805 }), cS, { tex: 0.2 });
  fillG(ctx, rough(rectPts(x + 68 * s, y - 118 * s, 21 * s, 6 * s), { amp: 0.4, seed: 806 }), cS, { tex: 0.2 });
}
export function drawHills(ctx, x0, x1, camY, t) {
  const par = (k) => (camY + 340) * k;
  // far range (bluish)
  let d = par(0.22);
  fillG(ctx, rough([...hillPts(x0, x1, -150 + d, 120, 0.0016, 3), [x1 + 60, 300], [x0 - 60, 300]], { amp: 1.5, seed: 3 }), '#A9C2B8', { tex: 0.4, kind: 'dabs', scale: 0.7 });
  drawMosqueSilhouette(ctx, 210, hillY(210, -150 + d, 120, 0.0016, 3) + 14, 0.75, '#93AFAA', '#7F9C98');
  // middle hills (sage)
  d = par(0.12);
  fillG(ctx, rough([...hillPts(x0, x1, -78 + d, 90, 0.0027, 5), [x1 + 60, 300], [x0 - 60, 300]], { amp: 1.5, seed: 5 }), '#8DB08E', { tex: 0.42, kind: 'dabs', scale: 0.7 });
  // light top band on middle hills
  const R = rng(17);
  for (let i = 0; i < 9; i++) { const x = lerp(x0 - 40, x1 + 40, (i + R() * 0.6) / 9); const y = hillY(x, -78 + d, 90, 0.0027, 5); drawTreeRound(ctx, x, y + 26, 0.55 + R() * 0.25, '#5E8E62', '#77A473', 900 + i, t); }
  // near hills (green)
  d = par(0.05);
  fillG(ctx, rough([...hillPts(x0, x1, -18 + d, 60, 0.0036, 8), [x1 + 60, 300], [x0 - 60, 300]], { amp: 1.5, seed: 8 }), '#6F9C62', { tex: 0.45, kind: 'dabs', scale: 0.7 });
  for (let i = 0; i < 5; i++) { const x = lerp(x0, x1, (i + 0.3 + R() * 0.4) / 5); if (x > 380 && x < 900) continue; const y = hillY(x, -18 + d, 60, 0.0036, 8); drawCypress(ctx, x, y + 30, 0.7 + R() * 0.3, '#3F6E47', '#2F5A3B', 950 + i); }
}
export function drawGround(ctx, x0, x1) {
  // grass band + soil plot
  const g = [];
  for (let x = x0 - 40; x <= x1 + 40; x += 20) g.push([x, -4 + noise1(x * 0.01, 4) * 5]);
  g.push([x1 + 40, 4200], [x0 - 40, 4200]);
  fillG(ctx, rough(g, { amp: 1.5, seed: 21 }), '#6E9A55', { tex: 0.5, kind: 'dabs', scale: 0.7 });
  const g2 = []; for (let x = x0 - 40; x <= x1 + 40; x += 20) g2.push([x, 70 + noise1(x * 0.008, 7) * 10]);
  g2.push([x1 + 40, 4200], [x0 - 40, 4200]);
  fillG(ctx, rough(g2, { amp: 2, seed: 22 }), '#5B864A', { tex: 0.5, kind: 'dabs', scale: 0.7 });
  const g3 = []; for (let x = x0 - 40; x <= x1 + 40; x += 20) g3.push([x, 230 + noise1(x * 0.006, 9) * 14]);
  g3.push([x1 + 40, 4200], [x0 - 40, 4200]);
  fillG(ctx, rough(g3, { amp: 2, seed: 23 }), '#4A7440', { tex: 0.5, kind: 'dabs', scale: 0.7 });
  // soil plot (where things are planted)
  const plot = rough(ellipsePts(800, 26, 230, 34), { amp: 2.5, seed: 30 });
  fillG(ctx, plot, P.soil, { tex: 0.55, dir: 0, scale: 0.5 });
  const plotL = rough(ellipsePts(785, 18, 185, 18), { amp: 2, seed: 31 });
  fillG(ctx, plotL, '#80604A', { tex: 0.45, dir: 0, scale: 0.4 });
}
/** grass tufts & flowers in the foreground (sway with t) */
export function drawGrassTufts(ctx, x0, x1, t, yBase = 30, n = 34, seed = 40, scale = 1) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, R()), y = yBase + R() * 60;
    if (x > 470 && x < 1060 && y < 70) continue; // keep the plot clear
    const hgt = (24 + R() * 30) * scale, sw = Math.sin(t * 1.3 + x * 0.02) * 4;
    const col = R() < 0.5 ? '#3E6A3A' : '#7FAE62';
    for (let k = -2; k <= 2; k++) {
      const bx = x + k * 5;
      strokeG(ctx, [[bx, y], [bx + k * 3 + sw * 0.5, y - hgt * 0.55], [bx + k * 6 + sw, y - hgt * (1 - Math.abs(k) * 0.12)]], 5 * scale, col, { tex: 0.3, seed: i * 7 + k });
    }
  }
}
export function drawFlowerSmall(ctx, x, y, s, petal, center, seed, t = 0) {
  const R = rng(seed);
  const sw = Math.sin(t * 1.4 + seed) * 3;
  strokeG(ctx, [[x, y + 40 * s], [x + sw * 0.5, y + 20 * s], [x + sw, y]], 4 * s, '#4C7A44', { tex: 0.3 });
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU + R() * 0.3;
    const px = x + sw + Math.cos(a) * 9 * s, py = y + Math.sin(a) * 9 * s;
    fillG(ctx, rough(ellipsePts(px, py, 8 * s, 5.5 * s, 14, a), { amp: 0.6, seed: seed + k }), petal, { tex: 0.3, dir: a, scale: 0.25 });
  }
  fillG(ctx, rough(ellipsePts(x + sw, y, 4.5 * s, 4.5 * s, 12), { amp: 0.5, seed: seed + 9 }), center, { tex: 0.2 });
}

// ------------------------------------------------------------------ the sapling in the world garden (grows a little at "hikmet")
export function drawSapling(ctx, x, y, grow, t) {
  const h = 150 + grow * 40; const sw = Math.sin(t * 1.1) * 3;
  strokeG(ctx, [[x, y], [x + 2, y - h * 0.5], [x + sw, y - h]], (u) => 11 - u * 6, '#6B4C38', { tex: 0.4, dir: Math.PI / 2 });
  const leaves = [[-0.35, 0.55, -1.0], [0.4, 0.62, 0.9], [-0.3, 0.8, -0.8], [0.32, 0.86, 0.7], [0.0, 1.0, 0.0], [-0.42, 0.4, -1.2], [0.45, 0.45, 1.15]];
  leaves.forEach(([dx, fy, ang], i) => {
    const g = i >= 5 ? clamp(grow * 1.3 - 0.3) : 1;
    if (g <= 0) return;
    const lx = x + sw * fy + dx * 20, ly = y - h * fy;
    const L = 52 * g, Wd = 24 * g;
    const a = -Math.PI / 2 + ang;
    const pts = [[0, 0], [L * 0.35, -Wd * 0.5], [L * 0.8, -Wd * 0.3], [L, 0], [L * 0.8, Wd * 0.3], [L * 0.35, Wd * 0.5]];
    const pp = pts.map(([px, py]) => [lx + px * Math.cos(a) - py * Math.sin(a), ly + px * Math.sin(a) + py * Math.cos(a)]);
    fillG(ctx, rough(crPts(pp, true, 4), { amp: 0.8, seed: 60 + i }), i % 2 ? '#4E8A4F' : '#6FA65A', { tex: 0.4, dir: a, scale: 0.3 });
    strokeG(ctx, [[lx, ly], [lx + Math.cos(a) * L * 0.85, ly + Math.sin(a) * L * 0.85]], 2, '#3A6B3E', { tex: 0, taper: false });
  });
}

// ------------------------------------------------------------------ âhiret: golden cloud bank, pavilion arches, garden flowers
export function drawAhiretBackdrop(ctx, x0, x1, t, K = 0.55, AX = 600, AY = -3110) {
  // great soft sun-halo behind the garden
  ringHalo(ctx, 600, -3600, 480, ['#F5D9A2', '#F8E6BC', '#FBF1D9'], { seed: 70, amp: 3, spread: 1.0 });
  // distant golden trees on the cloud bank
  [[170, -3070, 1.0], [1020, -3080, 1.1], [-120, -3060, 0.9], [1300, -3070, 0.95]].forEach(([tx, ty, sc], i) => drawTreeRound(ctx, tx, ty, sc * 1.6, '#C9B970', '#E0D08A', 770 + i, t));
  // pavilion (köşk), pale and set back behind the clouds
  ctx.save(); ctx.translate(AX, AY); ctx.scale(K, K); ctx.translate(-600, 3080);
  const ax = 600, ay = -3080;
  const col = '#F6E8CC', colS = '#EAD3B0', colD = '#E2C49C';
  const body = rough(rectPts(ax - 420, ay - 520, 840, 520), { amp: 2, seed: 71 });
  fillG(ctx, body, col, { tex: 0.35, dir: Math.PI / 2, scale: 0.5 });
  // dome
  const dome = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24; const a = Math.PI + u * Math.PI; dome.push([ax + Math.cos(a) * 200, ay - 520 + Math.sin(a) * 170 - Math.sin(u * Math.PI) * 30]); }
  dome.push([ax + 200, ay - 520], [ax - 200, ay - 520]);
  fillG(ctx, rough(dome, { amp: 2, seed: 72 }), '#7FB3A6', { tex: 0.45, dir: 0.3, scale: 0.5 });
  const domeS = dome.map(([px, py]) => [px < ax - 40 ? px : lerp(ax - 40, px, 0.25), py]);
  fillG(ctx, rough(domeS, { amp: 2, seed: 73 }), '#5E9488', { tex: 0.35, dir: 0.3, scale: 0.5, alpha: 0.9 });
  fillG(ctx, rough(dome.map(([px, py]) => [ax + 60 + (px - ax) * 0.25, py + (ay - 520 - py) * 0.35]), { amp: 1.5, seed: 731 }), '#A9D0C4', { tex: 0.3, alpha: 0.85 });
  // finial
  strokeG(ctx, [[ax, ay - 735], [ax, ay - 800]], 6, '#D9A441', { tex: 0, taper: false });
  fillG(ctx, rough(ellipsePts(ax, ay - 805, 9, 9), { amp: 0.5, seed: 74 }), '#D9A441', { tex: 0 });
  // pointed arches row
  for (let i = 0; i < 5; i++) {
    const cx = ax - 320 + i * 160, top = ay - 420, bot = ay - 30, hw = 52;
    const arch = [[cx - hw, bot], [cx - hw, top + 90], ...bezPts([[[cx - hw, top + 90], [cx - hw, top + 30], [cx - 10, top + 5], [cx, top]], [[cx, top], [cx + 10, top + 5], [cx + hw, top + 30], [cx + hw, top + 90]]], 8), [cx + hw, bot]];
    fillG(ctx, rough(arch, { amp: 1.2, seed: 80 + i }), '#D9B98E', { tex: 0.35, dir: Math.PI / 2, scale: 0.4 });
    // warm inner light
    const inner = arch.map(([px, py]) => [cx + (px - cx) * 0.62, Math.max(py, top + 40) + 0]);
    fillG(ctx, rough(inner, { amp: 1, seed: 90 + i }), '#FCEFD2', { tex: 0.25, dir: Math.PI / 2, scale: 0.4 });
  }
  // cornice line
  fillG(ctx, rough(rectPts(ax - 430, ay - 535, 860, 24), { amp: 1.2, seed: 75 }), colS, { tex: 0.3 });
  ctx.restore();
  // two slender golden-green cypresses flanking
  drawCypress(ctx, AX - 330 * K - 40, AY + 20, 1.5 * K + 0.4, '#B9B07A', '#A39B66', 760);
  drawCypress(ctx, AX + 330 * K + 40, AY + 20, 1.5 * K + 0.4, '#B9B07A', '#A39B66', 762);
}
export function drawCloudBank(ctx, x0, x1, yTop, t, seed = 300) {
  // voluminous layered golden clouds forming the ground of the garden of the hereafter
  const rows = [
    { y: yTop - 30, c: '#F1D3A2', s: '#D9AE86', h: 150, n: 6 },
    { y: yTop + 50, c: '#F6DFB4', s: '#E2BC94', h: 170, n: 5 },
    { y: yTop + 150, c: '#FAEACA', s: '#E8C9A2', h: 190, n: 5 },
    { y: yTop + 260, c: '#FCF2DC', s: '#ECD2AF', h: 200, n: 4 },
    { y: yTop + 400, c: '#F3DCD0', s: '#D8B4B4', h: 170, n: 5 },
  ];
  // fixed world positions (independent of the view, so cloud sprites are created once)
  const WX0 = -1500, WX1 = 2700;
  rows.forEach((r, ri) => {
    const R = rng(seed + ri * 31);
    const step = 1080 / r.n;
    const count = Math.ceil((WX1 - WX0) / step) + 1;
    for (let i = 0; i < count; i++) {
      const w = Math.round(step * (1.45 + R() * 0.5)), hh = Math.round(r.h * (0.85 + R() * 0.4)), jx = (R() - 0.5) * step * 0.35, jy = R() * 24;
      const x = WX0 + i * step + jx + Math.sin(t * 0.22 + i * 1.7 + ri) * 8;
      if (x + w < x0 - 50 || x - w > x1 + 50) continue;
      drawCloud(ctx, x, r.y + jy, w, hh, seed + ri * 50 + (i % 9), { body: r.c, shade: r.s, light: '#FFF7E6' });
    }
  });
}
/** grassy garden mound on top of the clouds where the tree of the hereafter stands */
/** cloud puffs in front of the mound's lower edge, so the garden sits IN the clouds */
export function drawMoundFrontClouds(ctx, x, y, w, t) {
  const R = rng(640);
  for (let i = 0; i < 6; i++) {
    const cx = x - w * 1.1 + i * (w * 2.2 / 5) + (R() - 0.5) * 50 + Math.sin(t * 0.3 + i) * 5;
    drawCloud(ctx, cx, y + 96 + (R() - 0.5) * 80, 220 + R() * 110, 70 + R() * 34, 650 + i, { body: '#FBEFD6', shade: '#E7C9A2', light: '#FFF8EA' });
  }
  for (let i = 0; i < 5; i++) { const cx = x - w * 1.2 + i * (w * 2.4 / 4) + (R() - 0.5) * 60; drawCloud(ctx, cx, y + 190 + (R() - 0.5) * 40, 300 + R() * 120, 90 + R() * 30, 670 + i, { body: '#F8E6C2', shade: '#E2BC94', light: '#FFF7E6' }); }
}
export function drawGardenMound(ctx, x, y, w, t, grow = 1) {
  if (grow <= 0) return;
  const s = grow;
  const pts = [];
  for (let i = 0; i <= 30; i++) { const u = i / 30; const a = Math.PI + u * Math.PI; pts.push([x + Math.cos(a) * w * s, y + Math.sin(a) * 110 * s + noise1(u * 9, 3) * 6]); }
  for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([x + w * s - u * 2 * w * s, y + 30 * s + Math.sin(u * Math.PI) * 26 * s]); }
  fillG(ctx, rough(pts, { amp: 2, seed: 610 }), '#5E9A55', { tex: 0.45, kind: 'dabs', scale: 0.6 });
  fillG(ctx, rough(pts.map(([px, py]) => [px, py - 14 * s]), { amp: 2, seed: 6101 }), '#7FB065', { tex: 0.45, kind: 'dabs', scale: 0.6 });
  const top = pts.slice(0, 31).map(([px, py]) => [px, py]); top.push([x + w * 0.8 * s, y + 4], [x - w * 0.8 * s, y + 4]);
  fillG(ctx, rough(top, { amp: 1.6, seed: 611 }), '#9DC67A', { tex: 0.4, kind: 'dabs', scale: 0.6, alpha: 0.9 });
  const R = rng(620);
  for (let i = 0; i < 22; i++) {
    const u = R() * 2 - 1; const fx = x + u * w * 0.85 * s; const fy = y - Math.sqrt(Math.max(0, 1 - u * u)) * 100 * s + 8 + R() * 22;
    drawFlowerSmall(ctx, fx, fy - 10, 0.9 * s, R() < 0.5 ? '#FBF3E4' : '#F2C7C0', '#E8B33E', 630 + i, t);
  }
}
// ------------------------------------------------------------------ berzah: mist veils, stars, a thin crescent
export function drawBerzah(ctx, x0, x1, t, camY = -2100) {
  const par = (k) => (camY + 2100) * k;
  // stars (parallax 0.3)
  const R = rng(500);
  const dy0 = par(0.3);
  for (let i = 0; i < 170; i++) {
    const x = lerp(x0 - 200, x1 + 200, R()), y = lerp(-2600, -1650, R()) + dy0;
    const tw = 0.55 + 0.45 * Math.sin(t * (1.2 + R() * 2) + i);
    const r = 1.6 + R() * 2.6;
    ctx.save(); ctx.globalAlpha = tw * smooth(invlerp(-1600, -1880, y - dy0)); ctx.fillStyle = R() < 0.25 ? '#F5E6C0' : '#E8ECF4';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  }
  // crescent: one shape (outer disc minus inner disc via evenodd clip)
  const cx = 300, cy = -2280 + par(0.2);
  ctx.save();
  const clip = new Path2D(); clip.rect(cx - 80, cy - 80, 160, 160); toPath(ellipsePts(cx + 20, cy - 12, 42, 42, 40), true, clip);
  ctx.clip(clip, 'evenodd');
  fillG(ctx, rough(ellipsePts(cx, cy, 46, 46), { amp: 1, seed: 510 }), '#F3E7C6', { tex: 0.25 });
  ctx.restore();
  ringHalo(ctx, cx, cy, 120, ['#59588A', '#615F92'], { seed: 512, amp: 2, alpha: 0.35 });
  // veils: opaque pale gouache bands drifting at different depths
  const veils = [
    { y: -1820, c: '#8F98C2', sp: 8, s: 1, k: 0.18 }, { y: -2040, c: '#A39CC6', sp: -6, s: 2, k: -0.12 }, { y: -2250, c: '#B7A8C9', sp: 5, s: 3, k: 0.22 },
    { y: -2450, c: '#C7AEC2', sp: -7, s: 4, k: -0.15 }, { y: -2660, c: '#D9B5B6', sp: 6, s: 5, k: 0.2 },
  ];
  for (const v of veils) {
    const off = t * v.sp, vy = v.y + par(v.k);
    const pts = [];
    for (let x = x0 - 200; x <= x1 + 200; x += 30) pts.push([x, vy - 16 - (fbm1((x + off) * 0.004, v.s, 2) * 0.5 + 0.5) * 50]);
    for (let x = x1 + 200; x >= x0 - 200; x -= 30) pts.push([x, vy + 10 + (fbm1((x + off) * 0.005, v.s + 9, 2) * 0.5 + 0.5) * 26]);
    fillG(ctx, rough(pts, { amp: 3, seed: v.s }), v.c, { tex: 0.35, kind: 'dabs', dir: 0, scale: 0.8, alpha: 0.85 });
  }
}
