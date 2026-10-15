// s01 hero assets (opening shot): elite Ottoman Mushaf (gold-tooled leather, şemse + köşebent, gilded edges, raised-band spine,
// headbands, fore-edge flap), carved walnut rahle with interlocking hinge, muted Anatolian rug, clay oil lamps, instanced
// lamp field with GPU ignition wave, dawn sky + matching PMREM environment, ray-lit dust motes, monotone time splines.
// Everything procedural. NO letters / script anywhere on the Mushaf (geometric + floral ornament only).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TEX from './textures.js';
import { rng, clamp } from './util.js';
import { flame as fxFlame, glow as fxGlow } from './fx.js';

const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const D2R = Math.PI / 180;
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texOf(c, srgb, o = {}) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = o.aniso ?? 8;
  t.wrapS = t.wrapT = o.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}
function heightToNormal(H, w, h, strength, wrap = false) {
  const c = cnv(w, h), x = c.getContext('2d', { willReadFrequently: true }), im = x.createImageData(w, h), d = im.data;
  for (let j = 0; j < h; j++) {
    const ju = wrap ? (j - 1 + h) % h : Math.max(j - 1, 0), jd = wrap ? (j + 1) % h : Math.min(j + 1, h - 1);
    for (let i = 0; i < w; i++) {
      const il = wrap ? (i - 1 + w) % w : Math.max(i - 1, 0), ir = wrap ? (i + 1) % w : Math.min(i + 1, w - 1);
      const nx = -(H[j * w + ir] - H[j * w + il]) * strength, ny = (H[jd * w + i] - H[ju * w + i]) * strength;
      const l = Math.sqrt(nx * nx + ny * ny + 1), p = (j * w + i) * 4;
      d[p] = (nx / l * .5 + .5) * 255; d[p + 1] = (ny / l * .5 + .5) * 255; d[p + 2] = (1 / l * .5 + .5) * 255; d[p + 3] = 255;
    }
  }
  x.putImageData(im, 0, 0); return c;
}
const gray = v => { const k = Math.round(clamp(v) * 255); return `rgb(${k},${k},${k})`; };
// fast hash noise
const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
// smooth value noise sampled on a w*h pixel grid with lattice cell size `cell` px -> Float32Array in [0,1]
function vnoise(w, h, cell, seed) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, L = new Float32Array(gw * gh), r = rng(seed);
  for (let i = 0; i < L.length; i++) L[i] = r();
  const out = new Float32Array(w * h);
  for (let j = 0; j < h; j++) { const fy = j / cell, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
    for (let i = 0; i < w; i++) { const fx = i / cell, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx); const k = iy * gw + ix;
      const a0 = L[k] + (L[k + 1] - L[k]) * sx, a1 = L[k + gw] + (L[k + gw + 1] - L[k + gw]) * sx; out[j * w + i] = a0 + (a1 - a0) * sy; } }
  return out;
}
function fbmGrid(w, h, cell, oct, seed) { const out = new Float32Array(w * h); let amp = 1, norm = 0; for (let o = 0; o < oct; o++) { const n = vnoise(w, h, cell / (1 << o), seed + o * 17); for (let k = 0; k < out.length; k++) out[k] += n[k] * amp; norm += amp; amp *= .5; } for (let k = 0; k < out.length; k++) out[k] /= norm; return out; }

// =============================================================================================
// MUSHAF COVER MAPS — burgundy goatskin, gold-tooled: rule + rope (zencerek) + dotted line border, central lobed şemse with
// pendants (salbek), four köşebent; stamped arabesque (rumi scrolls, leaves, palmettes) in raised polished gold on a sunken matte
// gold ground. Outputs albedo, ORM (G rough, B metal) and normal maps.
// =============================================================================================
let _coverCache = null;
export function mushafCoverMaps(o = {}) {
  if (_coverCache) return _coverCache;
  const CW = 1024, CH = Math.round(CW * (o.h ?? .27) / (o.w ?? .19));
  const C = { M: cnv(CW, CH), P: cnv(CW, CH), H: cnv(CW, CH) }, X = {};
  for (const k in C) { X[k] = C[k].getContext('2d', { willReadFrequently: true }); X[k].lineCap = 'round'; X[k].lineJoin = 'round'; }
  X.M.fillStyle = '#000'; X.M.fillRect(0, 0, CW, CH); X.P.fillStyle = '#000'; X.P.fillRect(0, 0, CW, CH); X.H.fillStyle = gray(.5); X.H.fillRect(0, 0, CW, CH);
  // paint(fn, m, p, h): run fn on each channel with that channel's value as fill+stroke
  const paint = (fn, m, p, h) => { for (const [k, v] of [['M', m], ['P', p], ['H', h]]) { if (v == null) continue; const x = X[k]; x.save(); x.fillStyle = x.strokeStyle = gray(v); fn(x); x.restore(); } };
  const LAY = cnv(CW, CH), LX = LAY.getContext('2d', { willReadFrequently: true }), TIN = cnv(CW, CH), TX = TIN.getContext('2d', { willReadFrequently: true }); LX.lineCap = 'round'; LX.lineJoin = 'round';
  // draw fn unclipped into a white layer once, then composite into each channel through clipFn (one clipped draw per channel)
  const layerPaint = (fn, clipFn, st) => { LX.setTransform(1, 0, 0, 1, 0, 0); LX.clearRect(0, 0, CW, CH); LX.save(); LX.fillStyle = LX.strokeStyle = '#fff'; fn(LX); LX.restore();
    const vals = S[st]; ['M', 'P', 'H'].forEach((k, ci) => { TX.globalCompositeOperation = 'source-over'; TX.clearRect(0, 0, CW, CH); TX.fillStyle = gray(vals[ci]); TX.fillRect(0, 0, CW, CH); TX.globalCompositeOperation = 'destination-in'; TX.drawImage(LAY, 0, 0); TX.globalCompositeOperation = 'source-over';
      const x = X[k]; x.save(); x.beginPath(); clipFn(x); x.clip(); x.drawImage(TIN, 0, 0); x.restore(); }); };
  const S = { raised: [1, 1, .66], rule: [1, .85, .62], ground: [1, .3, .40], dark: [0, 0, .36], gap: [.42, .05, .33], leather: [0, 0, .5] };
  const P = (fn, s) => paint(fn, ...S[s]);
  const cx = CW / 2, cy = CH / 2;

  // ---- border: outer rule, rope band, inner rule, dotted line ----
  const m1 = CW * .052;
  P(x => { x.lineWidth = 6; x.strokeRect(m1, m1, CW - 2 * m1, CH - 2 * m1); }, 'rule');
  const ropeIn = m1 + 17;
  const ropeAlong = (fn) => { // fn(x, px, py, angle) along the rectangle of inset ropeIn
    const sides = [[ropeIn, ropeIn, CW - ropeIn, ropeIn], [CW - ropeIn, ropeIn, CW - ropeIn, CH - ropeIn], [CW - ropeIn, CH - ropeIn, ropeIn, CH - ropeIn], [ropeIn, CH - ropeIn, ropeIn, ropeIn]];
    for (const [ax, ay, bx, by] of sides) { const L = Math.hypot(bx - ax, by - ay), n = Math.round(L / 10.5), ang = Math.atan2(by - ay, bx - ax); for (let i = 1; i < n; i++) fn(ax + (bx - ax) * i / n, ay + (by - ay) * i / n, ang); }
  };
  const ropeOval = grow => x => ropeAlong((px, py, a) => { x.save(); x.translate(px, py); x.rotate(a + .8); x.beginPath(); x.ellipse(0, 0, 7.2 + grow, 2.9 + grow, 0, 0, Math.PI * 2); x.fill(); x.restore(); });
  P(ropeOval(1.6), 'dark'); P(ropeOval(0), 'raised');
  // corner rosettes on the rope band
  for (const [qx, qy] of [[ropeIn, ropeIn], [CW - ropeIn, ropeIn], [ropeIn, CH - ropeIn], [CW - ropeIn, CH - ropeIn]]) {
    P(x => { x.beginPath(); x.arc(qx, qy, 11, 0, Math.PI * 2); x.fill(); }, 'dark');
    P(x => { for (let k = 0; k < 4; k++) { x.save(); x.translate(qx, qy); x.rotate(k * Math.PI / 2 + Math.PI / 4); x.beginPath(); x.ellipse(0, -5, 3.2, 5.5, 0, 0, Math.PI * 2); x.fill(); x.restore(); } x.beginPath(); x.arc(qx, qy, 2.6, 0, Math.PI * 2); x.fill(); }, 'raised');
  }
  const m2 = m1 + 34;
  P(x => { x.lineWidth = 4.5; x.strokeRect(m2, m2, CW - 2 * m2, CH - 2 * m2); }, 'rule');
  const m3 = m2 + 14;
  P(x => { const per = 2 * (CW - 2 * m3) + 2 * (CH - 2 * m3); const n = Math.round(per / 15); const pt = s => { const w = CW - 2 * m3, h = CH - 2 * m3; s = ((s % per) + per) % per; if (s < w) return [m3 + s, m3]; s -= w; if (s < h) return [m3 + w, m3 + s]; s -= h; if (s < w) return [m3 + w - s, m3 + h]; s -= w; return [m3, m3 + h - s]; };
    for (let i = 0; i < n; i++) { const [px, py] = pt(i * per / n); x.beginPath(); x.arc(px, py, 3.4, 0, Math.PI * 2); x.fill(); } }, 'rule');
  const fi = m3 + 10; // inner field inset (köşebent corners sit here)

  // ---- arabesque quadrant generator (Y up, origin at medallion centre); a,b = half sizes in px ----
  const spiral = (x0, y0, h0, len, k0, k1, n = 60) => { const pts = [[x0, y0, h0]]; let x = x0, y = y0, h = h0; const ds = len / n; for (let i = 0; i < n; i++) { const k = k0 + (k1 - k0) * (i + .5) / n; h += k * ds; x += Math.cos(h) * ds; y += Math.sin(h) * ds; pts.push([x, y, h]); } return pts; };
  const strokePts = (x, pts, w0, w1, grow) => { const CH_ = 6; for (let i = 0; i < pts.length - 1; i += CH_) { x.lineWidth = Math.max(.5, lerp(w0, w1, (i + CH_ / 2) / (pts.length - 1)) + grow); x.beginPath(); x.moveTo(pts[i][0], pts[i][1]); for (let j = i + 1; j <= Math.min(i + CH_, pts.length - 1); j++) x.lineTo(pts[j][0], pts[j][1]); x.stroke(); } };
  const leafPath = (x, px, py, h, L, W, bend, grow) => {
    const c = Math.cos(h), s = Math.sin(h), nx = -s, ny = c; const tx = px + Math.cos(h + bend) * L, ty = py + Math.sin(h + bend) * L;
    const g = grow; x.beginPath(); x.moveTo(px - c * g, py - s * g);
    x.quadraticCurveTo(px + c * L * .45 + nx * (W + g), py + s * L * .45 + ny * (W + g), tx + Math.cos(h + bend) * g, ty + Math.sin(h + bend) * g);
    x.quadraticCurveTo(px + c * L * .6 - nx * (W * .55 + g), py + s * L * .6 - ny * (W * .55 + g), px - c * g, py - s * g); x.fill();
  };
  // quadrant motif set, returned as draw(x, grow) for the dark (grow>0) and gold (grow=0) passes
  function quadrant(a, b, sc = 1) {
    const els = []; const k = 1 / a; const W = sc;
    const s1 = spiral(a * .05, b * .15, 70 * D2R, a * 1.2, -1.1 * k, -10.5 * k);
    const at = (pts, f) => pts[Math.round(f * (pts.length - 1))];
    const br = (pts, f, dh, len, k0, k1) => { const p = at(pts, f); return spiral(p[0], p[1], p[2] + dh, len, k0 * k, k1 * k); };
    const s2 = br(s1, .3, .55, a * .95, .9, 11), s3 = br(s1, .56, -.9, a * .52, -1.5, -13), s4 = br(s2, .42, -.7, a * .5, -2, -14);
    const s5 = br(s1, .1, -1.35, a * .62, -.8, -12), s6 = br(s2, .7, .9, a * .32, 2, 16);
    for (const [pts, w0, w1] of [[s1, 11, 4.5], [s2, 8.5, 3.6], [s3, 6.5, 3], [s4, 6, 2.8], [s5, 7, 3], [s6, 5, 2.5]]) els.push((x, g) => strokePts(x, pts, w0 * W, w1 * W, g));
    const flower = (pts, r) => (x, g) => { const p = pts[pts.length - 1]; for (let q = 0; q < 5; q++) { const an = q * Math.PI * 2 / 5 + p[2]; x.beginPath(); x.ellipse(p[0] + Math.cos(an) * r * .55 * W, p[1] + Math.sin(an) * r * .55 * W, r * .42 * W + g, r * .3 * W + g, an, 0, Math.PI * 2); x.fill(); } x.beginPath(); x.arc(p[0], p[1], r * .3 * W + g, 0, Math.PI * 2); x.fill(); };
    const bud = (pts, r) => (x, g) => { const p = pts[pts.length - 1]; x.beginPath(); x.arc(p[0], p[1], r * W + g, 0, Math.PI * 2); x.fill(); };
    els.push(flower(s1, a * .14), flower(s2, a * .12), bud(s3, 5.5), bud(s4, 5), flower(s5, a * .1), bud(s6, 4.5));
    // split rumi leaves (two lobes from one base) pointing outside the curl
    const rumi = (pts, f, side, L, Wd, bend) => (x, g) => { const p = at(pts, f); const h = p[2] + side * 1.1; leafPath(x, p[0], p[1], h, L * W, Wd * W, bend, g); leafPath(x, p[0], p[1], h + side * .42, L * .62 * W, Wd * .7 * W, bend * 1.4, g); };
    els.push(rumi(s1, .2, 1, a * .34, a * .1, -.35), rumi(s1, .44, 1, a * .36, a * .1, -.45), rumi(s1, .68, 1, a * .27, a * .085, -.5), rumi(s1, .52, -1, a * .22, a * .07, .4), rumi(s1, .32, -1, a * .2, a * .065, .4));
    els.push(rumi(s2, .22, -1, a * .3, a * .09, .4), rumi(s2, .55, -1, a * .24, a * .08, .45), rumi(s2, .38, 1, a * .2, a * .065, -.4), rumi(s2, .8, 1, a * .16, a * .055, -.4));
    els.push(rumi(s3, .35, 1, a * .22, a * .07, -.4), rumi(s4, .4, 1, a * .2, a * .065, -.4), rumi(s5, .3, 1, a * .24, a * .075, -.4), rumi(s5, .6, -1, a * .18, a * .06, .4), rumi(s6, .4, -1, a * .14, a * .05, .4));
    // palmette at the top of the axis (half; the mirror completes it)
    els.push((x, g) => { leafPath(x, 0, b * .7, 90 * D2R, b * .22, a * .08, 0, g); leafPath(x, 0, b * .7, 55 * D2R, b * .17, a * .07, .25, g); leafPath(x, 0, b * .7, 22 * D2R, b * .13, a * .06, .35, g); x.beginPath(); x.ellipse(0, b * .68, a * .085 + g, a * .06 + g, 0, 0, Math.PI * 2); x.fill(); });
    // half-palmette at the waist, pointing outward
    els.push((x, g) => { const px = a * .7, py = 0; for (const [h, l] of [[0, .24], [38, .17], [-38, .17], [70, .11], [-70, .11]]) leafPath(x, px, py, h * D2R, a * l, a * .055, 0, g); x.beginPath(); x.arc(px, py, a * .06 + g, 0, Math.PI * 2); x.fill(); });
    // ring of small leaves around the central rosette
    els.push((x, g) => { for (let q = 0; q < 2; q++) { const an = (22.5 + q * 45) * D2R; leafPath(x, Math.cos(an) * a * .2, Math.sin(an) * a * .2, an, a * .13, a * .04, 0, g); } });
    return { draw: (x, g) => els.forEach(e => e(x, g)) };
  }
  const mirror4 = (x, ox, oy, fn) => { for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { x.save(); x.translate(ox, oy); x.scale(sx, -sy); fn(x); x.restore(); } };

  // ---- şemse (almond medallion with lobed edge) ----
  const A = CW * .205, B = CH * .2;
  const lobed = (x, ax, by, lobes, bulge, grow = 0, pointy = .55, begin = true) => {
    const P0 = f => { const s = Math.sin(f), c = Math.cos(f); return [(ax + grow) * s * Math.pow(Math.abs(s), pointy * .5) * (1 + .0 * c), -(by + grow) * c]; };
    const pts = []; for (let i = 0; i <= lobes; i++) pts.push(P0(i / lobes * Math.PI * 2));
    if (begin) x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < lobes; i++) { const p = pts[i], q = pts[i + 1]; const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; let nx = mx / (ax * ax), ny = my / (by * by); const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl; const ch = Math.hypot(q[0] - p[0], q[1] - p[1]); x.quadraticCurveTo(mx + nx * ch * bulge, my + ny * ch * bulge, q[0], q[1]); }
    x.closePath();
  };
  const semse = (fn) => x => { x.save(); x.translate(cx, cy); fn(x); x.restore(); };
  // dotted contour around the medallion
  { // dots along an offset lobed outline (sample by rendering points along the param curve)
    const N = 150; P(semse(x => { for (let i = 0; i < N; i++) { const f = i / N * Math.PI * 2, s = Math.sin(f), c = Math.cos(f); const px = (A + 20) * s * Math.pow(Math.abs(s), .275), py = -(B + 20) * c; x.beginPath(); x.arc(px, py, 3, 0, Math.PI * 2); x.fill(); } }), 'rule');
  }
  // pendants (salbek) + finials on the axis
  for (const sy of [-1, 1]) {
    const py = cy + sy * (B + CH * .052);
    P(x => { x.lineWidth = 9; x.beginPath(); x.moveTo(cx, cy + sy * (B - 2)); x.lineTo(cx, py); x.stroke(); }, 'dark');
    P(x => { x.lineWidth = 5; x.beginPath(); x.moveTo(cx, cy + sy * (B - 2)); x.lineTo(cx, py); x.stroke(); }, 'rule');
    P(x => { x.save(); x.translate(cx, py + sy * 16); lobed(x, 30, 22, 12, .45, 4, .3); x.fill(); x.restore(); }, 'dark');
    P(x => { x.save(); x.translate(cx, py + sy * 16); lobed(x, 30, 22, 12, .45, 0, .3); x.fill(); x.restore(); }, 'ground');
    P(x => { x.save(); x.translate(cx, py + sy * 16); for (let k = 0; k < 6; k++) { x.save(); x.rotate(k * Math.PI / 3); x.beginPath(); x.ellipse(0, -10, 4.5, 9, 0, 0, Math.PI * 2); x.fill(); x.restore(); } x.beginPath(); x.arc(0, 0, 5, 0, Math.PI * 2); x.fill(); x.restore(); }, 'raised');
    P(x => { x.beginPath(); x.arc(cx, py + sy * 48, 6, 0, Math.PI * 2); x.fill(); }, 'rule');
  }
  // medallion body: outer gold rim, dark gap, sunken matte ground, raised arabesque
  P(semse(x => { lobed(x, A, B, 30, .42, 6); x.fill(); }), 'rule');
  P(semse(x => { lobed(x, A, B, 30, .42, -3); x.fill(); }), 'dark');
  P(semse(x => { lobed(x, A, B, 30, .42, -8); x.fill(); }), 'ground');
  const stipple = (clipFn, x0, y0, x1, y1) => { const R = rng(301); const path = new Path2D();
    for (let yy = Math.max(0, y0); yy < Math.min(CH, y1); yy += 7) for (let xx = Math.max(0, x0) + ((Math.round(yy / 7)) % 2) * 3.5; xx < Math.min(CW, x1); xx += 7) { const jx = xx + (R() - .5) * 3, jy = yy + (R() - .5) * 3; path.moveTo(jx + 1.5, jy); path.arc(jx, jy, 1.5, 0, Math.PI * 2); }
    for (const k of ['H', 'P']) { const x = X[k]; x.save(); clipFn(x); x.clip(); x.fillStyle = k === 'H' ? gray(.355) : gray(.12); x.fill(path); x.restore(); } };
  stipple(x => { x.translate(cx, cy); lobed(x, A, B, 30, .42, -8); x.setTransform(1, 0, 0, 1, 0, 0); }, cx - A, cy - B, cx + A, cy + B);
  const qd = quadrant(A, B);
  const clipSemse = x => { x.translate(cx, cy); lobed(x, A, B, 30, .42, -8); x.setTransform(1, 0, 0, 1, 0, 0); };
  layerPaint(x => mirror4(x, cx, cy, q => qd.draw(q, 2.4)), clipSemse, 'gap');
  layerPaint(x => mirror4(x, cx, cy, q => qd.draw(q, 0)), clipSemse, 'raised');
  // central rosette
  P(semse(x => { x.beginPath(); x.arc(0, 0, A * .2, 0, Math.PI * 2); x.fill(); }), 'dark');
  P(semse(x => { for (let k = 0; k < 8; k++) { x.save(); x.rotate(k * Math.PI / 4); x.beginPath(); x.ellipse(0, -A * .11, A * .035, A * .075, 0, 0, Math.PI * 2); x.fill(); x.restore(); } x.beginPath(); x.arc(0, 0, A * .045, 0, Math.PI * 2); x.fill(); }), 'raised');

  // ---- köşebent (corner quarter-medallions) ----
  const KA = CW * .25, KB = CH * .165;
  const corners = [[fi, fi, 1, 1], [CW - fi, fi, -1, 1], [fi, CH - fi, 1, -1], [CW - fi, CH - fi, -1, -1]];
  const qk = quadrant(KA * .92, KB * .92, .8);
  for (const [ox, oy, sx, sy] of corners) {
    const shape = (x, grow) => { x.save(); x.translate(ox, oy); x.scale(sx, sy); lobed(x, KA, KB, 30, .42, grow); x.restore(); };
    P(x => { x.save(); x.beginPath(); x.rect(fi, fi, CW - 2 * fi, CH - 2 * fi); x.clip(); shape(x, 6); x.fill(); x.restore(); }, 'rule');
    P(x => { x.save(); x.beginPath(); x.rect(fi, fi, CW - 2 * fi, CH - 2 * fi); x.clip(); shape(x, -3); x.fill(); x.restore(); }, 'dark');
    P(x => { x.save(); x.beginPath(); x.rect(fi + 6, fi + 6, CW - 2 * fi - 12, CH - 2 * fi - 12); x.clip(); shape(x, -8); x.fill(); x.restore(); }, 'ground');
    stipple(x => { x.beginPath(); x.rect(fi + 6, fi + 6, CW - 2 * fi - 12, CH - 2 * fi - 12); x.clip(); x.translate(ox, oy); x.scale(sx, sy); lobed(x, KA, KB, 30, .42, -8); x.setTransform(1, 0, 0, 1, 0, 0); }, ox - KA, oy - KB, ox + KA, oy + KB);
  }
  const clipK = x => { x.rect(fi + 6, fi + 6, CW - 2 * fi - 12, CH - 2 * fi - 12); x.clip(); x.beginPath(); for (const [ox, oy, sx, sy] of corners) { x.translate(ox, oy); x.scale(sx, sy); lobed(x, KA, KB, 30, .42, -8, .55, false); x.setTransform(1, 0, 0, 1, 0, 0); } };
  for (const [g, st] of [[2.3, 'gap'], [0, 'raised']]) layerPaint(x => { for (const [ox, oy, sx, sy] of corners) { x.save(); x.translate(ox, oy); x.scale(sx, sy); qk.draw(x, g); x.restore(); } }, clipK, st);

  // ---- per-pixel composition ----
  const blurH = cnv(CW, CH), bx = blurH.getContext('2d', { willReadFrequently: true }); bx.filter = 'blur(1.4px)'; bx.drawImage(C.H, 0, 0); bx.filter = 'none';
  const dM = X.M.getImageData(0, 0, CW, CH).data, dP = X.P.getImageData(0, 0, CW, CH).data, dH = bx.getImageData(0, 0, CW, CH).data;
  const MOT = fbmGrid(CW, CH, 260, 3, 71), BIG = fbmGrid(CW, CH, 150, 2, 79), G1 = vnoise(CW, CH, 6.5, 73), G2 = vnoise(CW, CH, 3.2, 74);
  const col = cnv(CW, CH), cx2 = col.getContext('2d', { willReadFrequently: true }), ic = cx2.createImageData(CW, CH), cd = ic.data;
  const orm = cnv(CW, CH), ox2 = orm.getContext('2d', { willReadFrequently: true }), io = ox2.createImageData(CW, CH), od = io.data;
  const Hf = new Float32Array(CW * CH);
  for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
    const k = j * CW + i, p = k * 4;
    const mott = MOT[k], big = BIG[k]; const gA = Math.abs(G1[k] - .5) * 2, gB = Math.abs(G2[k] - .5) * 2; const grain = sm(0, .3, gA * .65 + gB * .35);
    const e = Math.min(i, CW - 1 - i, j, CH - 1 - j); const dx = Math.min(i, CW - i), dy = Math.min(j, CH - j); const cornerD = Math.sqrt(dx * dx + dy * dy);
    const wear = clamp(sm(24, 0, e) * (.4 + .6 * big) + sm(80, 0, cornerD) * .55);
    // leather (burgundy goatskin)
    const t1 = .35 + .4 * sm(.25, .75, mott), t2 = sm(.62, .85, mott) * .25, gm = .88 + .12 * grain;
    let lr = (28 + (52 - 28) * t1), lg = (5 + (10 - 5) * t1), lb = (9 + (17 - 9) * t1);
    lr += (70 - lr) * t2; lg += (18 - lg) * t2; lb += (24 - lb) * t2; lr *= gm; lg *= gm; lb *= gm;
    const w5 = wear * .55; lr += (118 - lr) * w5; lg += (58 - lg) * w5; lb += (44 - lb) * w5;
    // gold
    let m = dM[p] / 255; const pol = dP[p] / 255;
    const rub = sm(.62, .82, big) * sm(110, 20, e) * .6 + wear * .5; m *= 1 - clamp(rub) * .75;
    const gv = sm(.3, .75, big) * .35; let gr = 212 + 40 * pol, gg = 166 + 52 * pol, gb = 92 + 50 * pol; gr += (214 - gr) * gv; gg += (168 - gg) * gv; gb += (92 - gb) * gv;
    cd[p] = lr + (gr - lr) * m; cd[p + 1] = lg + (gg - lg) * m; cd[p + 2] = lb + (gb - lb) * m; cd[p + 3] = 255;
    const rL = .44 + .2 * (1 - mott) - .08 * grain + wear * .22, rG = .52 - .24 * pol + .05 * big;
    od[p] = 255; od[p + 1] = clamp(rL + (rG - rL) * m) * 255; od[p + 2] = m * .9 * 255; od[p + 3] = 255;
    Hf[k] = dH[p] / 255 + (1 - m) * (grain * .022 - wear * .02) + m * .006 * big;
  }
  cx2.putImageData(ic, 0, 0); ox2.putImageData(io, 0, 0);
  const nrm = heightToNormal(Hf, CW, CH, 2.6);
  _coverCache = { map: texOf(col, true), orm: texOf(orm, false), normal: texOf(nrm, false), canvases: { col, orm, nrm }, CW, CH };
  return _coverCache;
}

// page-lines for gilded edges: lines vary along U (dir 'u') or V
function pageLines(dir) {
  const N = 512, c = cnv(dir === 'u' ? N : 8, dir === 'u' ? 8 : N); const H = new Float32Array(N); const r = rng(19);
  let sig = 0; for (let i = 0; i < N; i++) { if (i % 22 === 0) sig = r() * .4; H[i] = .5 + (r() - .5) * .25 + sig * .3 + (i % 22 === 0 ? -.3 : 0); }
  const w = c.width, h = c.height, Hf = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) Hf[j * w + i] = H[dir === 'u' ? i : j];
  const nrm = heightToNormal(Hf, w, h, 1.2, true);
  const rc = cnv(w, h), x = rc.getContext('2d', { willReadFrequently: true }), im = x.createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const p = (j * w + i) * 4, hv = H[dir === 'u' ? i : j]; im.data[p] = 255; im.data[p + 1] = clamp(.22 + (.5 - hv) * .25) * 255; im.data[p + 2] = 255; im.data[p + 3] = 255; }
  x.putImageData(im, 0, 0);
  return { normal: texOf(nrm, false), rough: texOf(rc, false) };
}

// =============================================================================================
// MUSHAF — book space: +x = spine (right when facing the cover), -x = fore-edge (+flap), +y = head, +z = front cover.
// =============================================================================================
export function eliteMushaf(o = {}) {
  const wb = o.w ?? .19, hb = o.h ?? .27, d = o.d ?? .056, bt = .0034, bev = .0011;
  const g = new THREE.Group();
  const maps = mushafCoverMaps({ w: wb, h: hb });
  const coverMat = new THREE.MeshPhysicalMaterial({ map: maps.map, normalMap: maps.normal, normalScale: new THREE.Vector2(1, 1), roughnessMap: maps.orm, metalnessMap: maps.orm, roughness: 1, metalness: 1, sheen: .45, sheenColor: new THREE.Color('#c8806e'), sheenRoughness: .42, clearcoat: .18, clearcoatRoughness: .5, envMapIntensity: 1 });
  const lt = TEX.leather({ a: '#4c111a', b: '#2a070c', seed: 23, repeat: [1, 1] });
  const leatherMat = new THREE.MeshPhysicalMaterial({ map: lt.map, normalMap: lt.normalMap, normalScale: new THREE.Vector2(.35, .35), roughnessMap: lt.roughnessMap, roughness: .95, sheen: .45, sheenColor: new THREE.Color('#c8806e'), sheenRoughness: .42 });
  for (const t of [lt.map, lt.normalMap, lt.roughnessMap]) { t.repeat.set(9, 9); }
  const goldMat = new THREE.MeshPhysicalMaterial({ color: '#f0c674', metalness: 1, roughness: .24 });
  const plU = pageLines('u'), plV = pageLines('v');
  const edgeU = new THREE.MeshPhysicalMaterial({ color: '#eec476', metalness: 1, roughness: 1, roughnessMap: plU.rough, normalMap: plU.normal, normalScale: new THREE.Vector2(.6, .6) });
  const edgeV = new THREE.MeshPhysicalMaterial({ color: '#eec476', metalness: 1, roughness: 1, roughnessMap: plV.rough, normalMap: plV.normal, normalScale: new THREE.Vector2(.6, .6) });
  const paperMat = new THREE.MeshStandardMaterial({ color: '#efe3c6', roughness: .9 });

  // boards: rounded-rect (fore-edge corners worn round) extruded with soft bevel; caps -> tooled cover, sides -> leather
  const board = (front) => {
    const w = wb - 2 * bev, h = hb - 2 * bev, rf = .0048, rs = .0012, x0 = -w / 2, y0 = -h / 2;
    const s = new THREE.Shape(); s.moveTo(x0 + rf, y0); s.lineTo(x0 + w - rs, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + rs); s.lineTo(x0 + w, y0 + h - rs); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - rs, y0 + h);
    s.lineTo(x0 + rf, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - rf); s.lineTo(x0, y0 + rf); s.quadraticCurveTo(x0, y0, x0 + rf, y0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: bt - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 6 });
    geo.translate(0, 0, -(bt - 2 * bev) / 2);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) { uv.setXY(i, (p.getX(i) + wb / 2) / wb, (p.getY(i) + hb / 2) / hb); }
    if (!front) geo.rotateX(Math.PI);
    const m = new THREE.Mesh(geo, [coverMat, leatherMat]); m.position.z = front ? d / 2 - bt / 2 : -d / 2 + bt / 2; return m;
  };
  const fb = board(true), bb = board(false); g.add(fb, bb);

  // text block (gilded head, tail and fore-edge; concave fore-edge)
  const fo = .0032, sq = .0034, tw = wb - fo - .002, th = hb - 2 * sq, tt = d - 2 * bt - .0006;
  const tbGeo = new THREE.BoxGeometry(tw, th, tt, 6, 1, 16);
  { const p = tbGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); if (x < -tw / 2 + 1e-5) p.setX(i, x + .0022 * (1 - Math.pow(2 * z / tt, 2))); } tbGeo.computeVertexNormals(); }
  const tb = new THREE.Mesh(tbGeo, [paperMat, edgeU, edgeV, edgeV, paperMat, paperMat]); tb.position.x = -wb / 2 + fo + tw / 2; g.add(tb);

  // rounded spine shell (+x), raised bands, gold fillets
  const B0 = .0075, x0 = wb / 2 - .0026;
  const crescent = (bulge, half, thick, n = 24) => { const s = new THREE.Shape(); for (let i = 0; i <= n; i++) { const f = -Math.PI / 2 + Math.PI * i / n; const px = x0 + bulge * Math.cos(f), pz = half * Math.sin(f); i ? s.lineTo(px, pz) : s.moveTo(px, pz); } for (let i = n; i >= 0; i--) { const f = -Math.PI / 2 + Math.PI * i / n; s.lineTo(x0 + (bulge - thick) * Math.cos(f), (half - thick) * Math.sin(f)); } return s; };
  const ext = (shape, height, bevel) => { const geo = new THREE.ExtrudeGeometry(shape, { depth: height - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * .8, bevelSegments: 3, curveSegments: 4 }); geo.translate(0, 0, -(height - 2 * bevel) / 2); geo.rotateX(Math.PI / 2); return geo; };
  // rotateX(+90deg) maps shape (x, y=z_book) & extrusion z -> book: (x, -z_ext, y_shape) -> need y_shape -> z_book; fix by swapping sign below
  const spine = new THREE.Mesh(ext(crescent(B0, d / 2, .0024), hb, .0009), leatherMat); g.add(spine);
  const bandYs = [-.088, -.03, .03, .088];
  for (const y of bandYs) {
    const band = new THREE.Mesh(ext(crescent(B0 + .0012, d / 2 + .0002, .003), .0058, .0014), leatherMat); band.position.y = y; g.add(band);
    for (const dy of [-.0068, .0068]) { const f = new THREE.Mesh(ext(crescent(B0 + .0006, d / 2 + .0001, .0014), .0014, 0), goldMat); f.position.y = y + dy; g.add(f); }
  }
  for (const y of [hb / 2 - .007, -hb / 2 + .007]) { const f = new THREE.Mesh(ext(crescent(B0 + .00035, d / 2 + .0002, .0012), .0012, 0), goldMat); f.position.y = y; g.add(f); }

  // headbands (şiraze): chevron silk in red / cream / green with gold, at head & tail of the spine
  const hbTex = (() => { const c = cnv(64, 256), x = c.getContext('2d', { willReadFrequently: true }); const cols = ['#8e2a25', '#e8d9b0', '#2f5a45', '#d0a24c']; for (let i = 0; i < 32; i++) { x.fillStyle = cols[i % 4]; x.beginPath(); const y = i * 8; x.moveTo(0, y); x.lineTo(32, y + 6); x.lineTo(64, y); x.lineTo(64, y + 8); x.lineTo(32, y + 14); x.lineTo(0, y + 8); x.fill(); } return texOf(c, true); })();
  const hbMat = new THREE.MeshPhysicalMaterial({ map: hbTex, roughness: .7, sheen: 1, sheenColor: new THREE.Color('#fff0d0'), sheenRoughness: .4 });
  for (const sy of [1, -1]) { const hbM = new THREE.Mesh(new THREE.CylinderGeometry(.0023, .0023, tt * .96, 12, 1), hbMat); hbM.rotation.x = Math.PI / 2; hbM.position.set(wb / 2 - .0045, sy * (th / 2 + .0006), 0); g.add(hbM); }

  // fore-edge flap (sertap) from the back board over the fore-edge; its envelope flap (miklep) tucks under the front board
  const flapGeo = (() => { const s = new THREE.Shape(); const fx = -wb / 2 - .0012, ft = .0026; const z0 = -d / 2, z1 = d / 2 - bt * .55;
    s.moveTo(fx, z0); s.lineTo(fx + ft, z0); s.lineTo(fx + ft, z1); s.lineTo(fx, z1); s.closePath();
    return ext(s, hb - .0006, .0009); })();
  const flap = new THREE.Mesh(flapGeo, leatherMat); g.add(flap);
  // envelope flap edge visible between front board and text block (thin leather wedge)
  const env = (() => { const s = new THREE.Shape(); const z = d / 2 - bt - .0011; s.moveTo(-wb / 2 - .0005, z); s.lineTo(-wb / 2 + .07, z); s.lineTo(-wb / 2 + .07, z + .0009); s.lineTo(-wb / 2 - .0005, z + .0009); s.closePath(); return ext(s, hb - .002, 0); })();
  g.add(new THREE.Mesh(env, leatherMat));
  // gold rule along the flap's outer face
  for (const sy of [1, -1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(.0008, .0009, d - bt * .7), goldMat); r.position.set(-wb / 2 - .0013, sy * (hb / 2 - .006), -bt * .3); g.add(r); }

  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  g.userData = { w: wb, h: hb, d, materials: [coverMat, leatherMat, goldMat, edgeU, edgeV, hbMat] };
  return g;
}

// =============================================================================================
// WALNUT texture (grain along V) + carved relief height; returns {map, rough, normal}
// =============================================================================================
function walnutMaps(W, L, carve) {
  const TW = 512, TH = 1024;
  const hc = cnv(TW, TH), hx = hc.getContext('2d', { willReadFrequently: true }); hx.fillStyle = gray(.5); hx.fillRect(0, 0, TW, TH); hx.lineCap = 'round'; hx.lineJoin = 'round';
  const toPx = (X, Y) => [(X / W + .5) * TW, (1 - Y / L) * TH];
  if (carve) carve(hx, toPx, TW / W);
  const hb = cnv(TW, TH), hbx = hb.getContext('2d', { willReadFrequently: true }); hbx.filter = 'blur(1.6px)'; hbx.drawImage(hc, 0, 0);
  const dH = hbx.getImageData(0, 0, TW, TH).data;
  const nw = TEX.fbmField(5, 2, 4), nf = TEX.fbmField(9, 24, 3), np = TEX.fbmField(13, 64, 1);
  const col = cnv(TW, TH), cx = col.getContext('2d', { willReadFrequently: true }), ic = cx.createImageData(TW, TH);
  const rc = cnv(TW, TH), rx = rc.getContext('2d', { willReadFrequently: true }), ir = rx.createImageData(TW, TH);
  const Hf = new Float32Array(TW * TH);
  const cD = [42, 24, 13], cM = [68, 41, 24], cL = [90, 58, 34], cLn = [32, 18, 10];
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const u = i / TW, v = j / TH, k = j * TW + i, p = k * 4;
    const warp = nw(u * .5, v * .5);
    const gx = u * 7 + warp * 1.1 + Math.sin(v * 4 + u * 2) * .08;
    const band = .5 + .5 * Math.sin(gx * Math.PI * 2);
    const fineX = u * 170 + warp * 14 + nf(u, v * .25) * 2.5;
    const line = Math.pow(Math.abs(Math.sin(fineX * Math.PI)), 14);
    const pore = sm(.55, .75, Math.abs(np(u * 1, v * .12))) * .0 + sm(.62, .9, nf(u * 2 % 1, v * .5 % 1) * .5 + .5) * .25;
    let c = mix3(cM, cL, sm(.25, .95, band) * .55 + (nf(u, v) * .5 + .5) * .2);
    c = mix3(c, cD, (1 - band) * .25); c = mix3(c, cLn, line * .32 + pore * .5);
    ic.data[p] = c[0]; ic.data[p + 1] = c[1]; ic.data[p + 2] = c[2]; ic.data[p + 3] = 255;
    const carveH = dH[p] / 255; const inGroove = sm(.47, .35, carveH);
    const r = .34 + line * .08 + pore * .2 + inGroove * .25;
    ir.data[p] = 255; ir.data[p + 1] = clamp(r) * 255; ir.data[p + 2] = 0; ir.data[p + 3] = 255;
    Hf[k] = carveH + line * .012 - pore * .01;
  }
  cx.putImageData(ic, 0, 0); rx.putImageData(ir, 0, 0);
  // darken grooves in albedo (carving dirt/shadow) using the blurred height
  cx.globalCompositeOperation = 'multiply'; const sh = cnv(TW, TH), shx = sh.getContext('2d', { willReadFrequently: true }); const sd = shx.createImageData(TW, TH);
  for (let k = 0; k < TW * TH; k++) { const h = dH[k * 4] / 255; const dk = 1 - sm(.47, .3, h) * .45; sd.data[k * 4] = sd.data[k * 4 + 1] = sd.data[k * 4 + 2] = dk * 255; sd.data[k * 4 + 3] = 255; }
  shx.putImageData(sd, 0, 0); cx.drawImage(sh, 0, 0); cx.globalCompositeOperation = 'source-over';
  const nrm = heightToNormal(Hf, TW, TH, 3.2);
  return { map: texOf(col, true), rough: texOf(rc, false), normal: texOf(nrm, false) };
}

// =============================================================================================
// RAHLE — X-shaped folding stand cut from one walnut plank; interlocking finger hinge; ogee crest with star openwork;
// pointed arch between the feet; carved border grooves + rosette. Group origin: floor under the hinge.
// userData.back = group in BACK-board local space (X across, Y along the leaf, +Z = inner face) to attach the book;
// userData.hingeY (board-local Y of the crossing), T.
// =============================================================================================
export function ottomanRahle(o = {}) {
  const L = o.L ?? .64, W = o.W ?? .3, T = o.T ?? .017, th = o.angle ?? 55 * D2R, Yc = o.Yc ?? .255, hH = .05;
  const fw = .062, archH = .105, crestY = L - .085, starY = L - .062, starR = .023;
  const crestR = (s) => { // right half crest from (W/2, crestY) to apex (0, L)
    s.bezierCurveTo(W / 2, crestY + .035, W * .3, L - .045, W * .16, L - .032);
    s.bezierCurveTo(W * .08, L - .025, W * .03, L - .018, 0, L);
  };
  const crestL = (s) => { s.bezierCurveTo(-W * .03, L - .018, -W * .08, L - .025, -W * .16, L - .032); s.bezierCurveTo(-W * .3, L - .045, -W / 2, crestY + .035, -W / 2, crestY); };
  const shapeFor = (variant) => {
    const s = new THREE.Shape(); const nw = W / 5, y0 = Yc - hH / 2, y1 = Yc + hH / 2, rr = .006;
    s.moveTo(-W / 2, 0); s.lineTo(-W / 2 + fw, 0);
    // pointed (ogee) arch between the feet
    const aw = W / 2 - fw; s.bezierCurveTo(-aw, archH * .62, -aw * .3, archH * .78, 0, archH); s.bezierCurveTo(aw * .3, archH * .78, aw, archH * .62, aw, 0);
    s.lineTo(W / 2, 0);
    // right side with small cusp + optional edge notch (finger 5)
    s.lineTo(W / 2, archH * .9); s.quadraticCurveTo(W / 2 - .008, archH * 1.05, W / 2, archH * 1.2);
    if (variant === 'B') { s.lineTo(W / 2, y0); s.lineTo(W / 2 - nw + rr, y0); s.quadraticCurveTo(W / 2 - nw, y0, W / 2 - nw, y0 + rr); s.lineTo(W / 2 - nw, y1 - rr); s.quadraticCurveTo(W / 2 - nw, y1, W / 2 - nw + rr, y1); s.lineTo(W / 2, y1); }
    s.lineTo(W / 2, crestY); crestR(s); crestL(s);
    if (variant === 'B') { s.lineTo(-W / 2, y1); s.lineTo(-W / 2 + nw - rr, y1); s.quadraticCurveTo(-W / 2 + nw, y1, -W / 2 + nw, y1 - rr); s.lineTo(-W / 2 + nw, y0 + rr); s.quadraticCurveTo(-W / 2 + nw, y0, -W / 2 + nw - rr, y0); s.lineTo(-W / 2, y0); }
    s.lineTo(-W / 2, archH * 1.2); s.quadraticCurveTo(-W / 2 + .008, archH * 1.05, -W / 2, archH * .9); s.lineTo(-W / 2, 0);
    const slot = (xa, xb) => { const h = new THREE.Path(); h.moveTo(xa + rr, y0); h.lineTo(xb - rr, y0); h.quadraticCurveTo(xb, y0, xb, y0 + rr); h.lineTo(xb, y1 - rr); h.quadraticCurveTo(xb, y1, xb - rr, y1); h.lineTo(xa + rr, y1); h.quadraticCurveTo(xa, y1, xa, y1 - rr); h.lineTo(xa, y0 + rr); h.quadraticCurveTo(xa, y0, xa + rr, y0); s.holes.push(h); };
    if (variant === 'A') { slot(-W / 2 + nw - .0015, -W / 2 + 2 * nw + .0015); slot(W / 2 - 2 * nw - .0015, W / 2 - nw + .0015); }
    else slot(-nw / 2 - .0015, nw / 2 + .0015);
    // 8-point star openwork under the crest
    const st = new THREE.Path(); for (let i = 0; i <= 16; i++) { const a = Math.PI / 2 + i * Math.PI / 8, r = i % 2 ? starR * .72 : starR; const px = Math.cos(a) * r, py = starY + Math.sin(a) * r; i ? st.lineTo(px, py) : st.moveTo(px, py); } s.holes.push(st);
    return s;
  };
  const carve = (x, P, ppm) => {
    const g = (v) => gray(v);
    // border groove around the upper leaf
    x.strokeStyle = g(.3); x.lineWidth = .0035 * ppm;
    const ins = .014, ys = Yc + hH / 2 + .02;
    x.beginPath(); let p = P(-W / 2 + ins, ys); x.moveTo(...p); p = P(-W / 2 + ins, crestY - .004); x.lineTo(...p);
    const sx = (W / 2 - ins) / (W / 2), cb = (a, b, c) => { const q1 = P(a[0], a[1]), q2 = P(b[0], b[1]), q3 = P(c[0], c[1]); x.bezierCurveTo(...q1, ...q2, ...q3); };
    cb([-W / 2 * sx, crestY + .03], [-W * .3 * sx, L - .045 - ins], [-W * .16 * sx, L - .032 - ins]); cb([-W * .08 * sx, L - .025 - ins], [-W * .03 * sx, L - .018 - ins], [0, L - ins - .004]);
    cb([W * .03 * sx, L - .018 - ins], [W * .08 * sx, L - .025 - ins], [W * .16 * sx, L - .032 - ins]); cb([W * .3 * sx, L - .045 - ins], [W / 2 * sx, crestY + .03], [W / 2 - ins, crestY - .004]);
    p = P(W / 2 - ins, ys); x.lineTo(...p); x.closePath(); x.stroke();
    // ring around the star
    x.beginPath(); p = P(0, starY); x.arc(p[0], p[1], (starR + .009) * ppm, 0, Math.PI * 2); x.stroke();
    // leg panel groove following the arch
    x.beginPath(); const aw = W / 2 - fw; p = P(-W / 2 + ins, Yc - hH / 2 - .016); x.moveTo(...p); p = P(-W / 2 + ins, archH * .2); x.lineTo(...p);
    const q = (a, b) => P(a, b); x.lineTo(...q(-aw - .012, archH * .2)); x.bezierCurveTo(...q(-aw - .012, archH * .7 + .01), ...q(-aw * .3, archH * .8 + .013), ...q(0, archH + .014)); x.bezierCurveTo(...q(aw * .3, archH * .8 + .013), ...q(aw + .012, archH * .7 + .01), ...q(aw + .012, archH * .2));
    x.lineTo(...q(W / 2 - ins, archH * .2)); x.lineTo(...q(W / 2 - ins, Yc - hH / 2 - .016)); x.closePath(); x.stroke();
    // carved rosette on the legs (8 petals in a sunken disc)
    const rc = P(0, (archH + Yc - hH / 2) / 2 + .004), R = .03 * ppm;
    x.fillStyle = g(.38); x.beginPath(); x.arc(rc[0], rc[1], R, 0, Math.PI * 2); x.fill();
    x.fillStyle = g(.62); for (let k = 0; k < 8; k++) { x.save(); x.translate(rc[0], rc[1]); x.rotate(k * Math.PI / 4); x.beginPath(); x.ellipse(0, -R * .5, R * .17, R * .42, 0, 0, Math.PI * 2); x.fill(); x.restore(); }
    x.fillStyle = g(.7); x.beginPath(); x.arc(rc[0], rc[1], R * .16, 0, Math.PI * 2); x.fill();
    // small carved roundels in the upper leaf corners (visible beside the book)
    for (const sxx of [-1, 1]) { const c = P(sxx * (W / 2 - .034), Yc + hH / 2 + .05); x.fillStyle = g(.4); x.beginPath(); x.arc(c[0], c[1], .011 * ppm, 0, Math.PI * 2); x.fill(); x.fillStyle = g(.6); x.beginPath(); x.arc(c[0], c[1], .005 * ppm, 0, Math.PI * 2); x.fill(); }
  };
  const wm = walnutMaps(W, L, carve);
  const mat = new THREE.MeshPhysicalMaterial({ map: wm.map, roughnessMap: wm.rough, normalMap: wm.normal, normalScale: new THREE.Vector2(1, 1), roughness: 1, clearcoat: .5, clearcoatRoughness: .3, sheen: .15, sheenColor: new THREE.Color('#d9a070') });
  const mkBoard = (variant) => {
    const geo = new THREE.ExtrudeGeometry(shapeFor(variant), { depth: T - .006, bevelEnabled: true, bevelThickness: .003, bevelSize: .0026, bevelSegments: 3, curveSegments: 20 });
    geo.translate(0, 0, -(T - .006) / 2);
    const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / W + .5, p.getY(i) / L);
    const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m;
  };
  const g = new THREE.Group();
  const front = new THREE.Group(), back = new THREE.Group();
  front.add(mkBoard('A')); back.add(mkBoard('B'));
  front.rotation.x = th; front.position.z = -Yc * Math.sin(th);
  back.rotation.x = -th; back.position.z = Yc * Math.sin(th);
  const lift = (T / 2) * Math.sin(th) + .0026 * Math.cos(th) + .0006; front.position.y = lift; back.position.y = lift;
  g.add(front, back);
  g.userData = { back, front, hingeY: Yc, T, th, L, W, crossY: lift + Yc * Math.cos(th), material: mat };
  return g;
}

// =============================================================================================
// RUG — muted Anatolian medallion rug (knot-grid pattern, wool pile, abrash) + fringes
// =============================================================================================
export function anatolianRug(o = {}) {
  const RW = o.w ?? .72, RL = o.l ?? 1.08; const KW = 192, KH = 288, SC = 5; const TW = KW * SC, TH = KH * SC;
  const k = cnv(KW, KH), x = k.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false;
  const C = { red: '#6e3029', red2: '#5e2a25', ind: '#29314a', ivo: '#b8aa8c', och: '#9c7c48', camel: '#8c7350', dk: '#261c18', teal: '#3e5650', rose: '#8a4c42' };
  const R = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  R(C.dk, 0, 0, KW, KH);
  R(C.ivo, 2, 2, KW - 4, KH - 4);
  // outer guard: small red lozenges
  for (let i = 6; i < KW - 6; i += 8) { R(C.red, i, 4, 2, 3); R(C.red, i, KH - 7, 2, 3); }
  for (let j = 6; j < KH - 6; j += 8) { R(C.red, 4, j, 3, 2); R(C.red, KW - 7, j, 3, 2); }
  R(C.dk, 9, 9, KW - 18, KH - 18);
  R(C.ind, 11, 11, KW - 22, KH - 22);
  // main border motifs: 8-point stars (ochre/ivory) alternating with rosettes (rose) on indigo
  const star = (cx, cy, r, c1, c2) => { x.fillStyle = c1; x.fillRect(cx - r, cy - Math.round(r * .42), 2 * r + 1, 2 * Math.round(r * .42) + 1); x.fillRect(cx - Math.round(r * .42), cy - r, 2 * Math.round(r * .42) + 1, 2 * r + 1); for (let d = 0; d <= Math.round(r * .7); d++) { x.fillRect(cx - Math.round(r * .7) + d, cy - Math.round(r * .7) + d, 1, 1); } x.save(); x.translate(cx + .5, cy + .5); x.rotate(Math.PI / 4); x.fillRect(-r * .72, -r * .72, r * 1.44, r * 1.44); x.restore(); x.fillStyle = c2; x.fillRect(cx - 1, cy - 1, 3, 3); };
  const rosette = (cx, cy, r, c1, c2) => { x.fillStyle = c1; x.beginPath(); x.arc(cx + .5, cy + .5, r, 0, Math.PI * 2); x.fill(); x.fillStyle = c2; for (let a = 0; a < 4; a++) { const px = cx + Math.round(Math.cos(a * Math.PI / 2 + Math.PI / 4) * r * .55), py = cy + Math.round(Math.sin(a * Math.PI / 2 + Math.PI / 4) * r * .55); x.fillRect(px, py, 2, 2); } };
  const bw = 22, b0 = 11, bc = b0 + bw / 2;
  for (let i = 0, cxp = 26; cxp < KW - 20; cxp += 28, i++) { (i % 2 ? rosette : star)(cxp, bc, 7, i % 2 ? C.rose : C.och, C.ivo); (i % 2 ? rosette : star)(cxp, KH - bc, 7, i % 2 ? C.rose : C.och, C.ivo); }
  for (let j = 0, cyp = 44; cyp < KH - 38; cyp += 28, j++) { (j % 2 ? star : rosette)(bc, cyp, 7, j % 2 ? C.och : C.rose, C.ivo); (j % 2 ? star : rosette)(KW - bc, cyp, 7, j % 2 ? C.och : C.rose, C.ivo); }
  // thin ivory running line in the border
  R(C.dk, b0 + bw, b0 + bw, KW - 2 * (b0 + bw), KH - 2 * (b0 + bw));
  const g0 = b0 + bw + 2; R(C.camel, g0, g0, KW - 2 * g0, KH - 2 * g0);
  for (let i = g0 + 3; i < KW - g0 - 3; i += 6) { R(C.red2, i, g0 + 2, 2, 2); R(C.red2, i, KH - g0 - 4, 2, 2); }
  for (let j = g0 + 3; j < KH - g0 - 3; j += 6) { R(C.red2, g0 + 2, j, 2, 2); R(C.red2, KW - g0 - 4, j, 2, 2); }
  const f0 = g0 + 6; R(C.ivo, f0, f0, KW - 2 * f0, KH - 2 * f0); R(C.red, f0 + 1, f0 + 1, KW - 2 * f0 - 2, KH - 2 * f0 - 2);
  // field: stepped central medallion
  const cxm = KW / 2, cym = KH / 2;
  const stepDiamond = (hw, hh, c, step = 3) => { x.fillStyle = c; for (let yy = -hh; yy <= hh; yy++) { const w = Math.round(hw * (1 - Math.abs(yy) / hh) / step) * step; x.fillRect(cxm - w, cym + yy, 2 * w + 1, 1); } };
  stepDiamond(58, 92, C.ivo); stepDiamond(55, 88, C.ind); stepDiamond(40, 64, C.ivo); stepDiamond(37, 60, C.red2); stepDiamond(20, 32, C.och); stepDiamond(14, 22, C.ind);
  star(cxm, cym, 7, C.ivo, C.red);
  for (const s of [-1, 1]) { star(cxm, cym + s * 104, 6, C.och, C.ivo); R(C.ivo, cxm, cym + s * 93, 1, 4 * s); rosette(cxm, cym + s * 76, 4, C.och, C.red); rosette(cxm + s * 46, cym, 4, C.och, C.red); }
  // corner spandrels (quarter stepped diamonds)
  for (const [ox, oy, sx, sy] of [[f0 + 1, f0 + 1, 1, 1], [KW - f0 - 2, f0 + 1, -1, 1], [f0 + 1, KH - f0 - 2, 1, -1], [KW - f0 - 2, KH - f0 - 2, -1, -1]]) {
    for (let yy = 0; yy < 40; yy++) { const w = Math.round((40 - yy) * 1.05 / 3) * 3; x.fillStyle = C.ivo; x.fillRect(sx > 0 ? ox : ox - w - 1, oy + sy * yy, w + 2, 1); }
    for (let yy = 0; yy < 37; yy++) { const w = Math.round((37 - yy) * 1.0 / 3) * 3; x.fillStyle = C.ind; x.fillRect(sx > 0 ? ox : ox - w, oy + sy * yy, w, 1); }
    star(ox + sx * 11, oy + sy * 10, 4, C.och, C.ivo);
  }
  // scattered field motifs
  for (const [px, py] of [[40, 80], [KW - 40, 80], [40, KH - 80], [KW - 40, KH - 80], [52, KH / 2], [KW - 52, KH / 2], [KW / 2, 64], [KW / 2, KH - 64], [64, 120], [KW - 64, 120], [64, KH - 120], [KW - 64, KH - 120]]) { if (Math.abs(px - cxm) < 60 && Math.abs(py - cym) < 96) continue; star(px, py, 4, C.ivo, C.ind); }
  for (const [px, py] of [[48, 104], [KW - 48, 104], [48, KH - 104], [KW - 48, KH - 104], [76, 70], [KW - 76, 70], [76, KH - 70], [KW - 76, KH - 70]]) rosette(px, py, 3, C.och, C.ivo);
  // upscale (knots) + wool per pixel
  const big = cnv(TW, TH), bx = big.getContext('2d', { willReadFrequently: true }); bx.imageSmoothingEnabled = false; bx.drawImage(k, 0, 0, TW, TH);
  const id = bx.getImageData(0, 0, TW, TH), dd = id.data; const n1 = TEX.fbmField(31, 4, 4), n2 = TEX.fbmField(37, 96, 2), ab = TEX.fbmField(41, 3, 2);
  const Hf = new Float32Array(TW * TH);
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const p = (j * TW + i) * 4, u = i / TW, v = j / TH; const kx = (i % SC) / SC - .5, ky = (j % SC) / SC - .5; const knot = 1 - (kx * kx + ky * ky) * 2.2;
    const fib = n2(u, v * TH / TW) * .5 + .5, mott = n1(u, v) * .5 + .5, abr = ab(.1, v) * .5 + .5;
    const f = (.9 + .045 * knot + .12 * fib) * (.95 + .08 * abr) * (.96 + .06 * mott);
    dd[p] = clamp(dd[p] * f * (1 + (abr - .5) * .06), 0, 255); dd[p + 1] = clamp(dd[p + 1] * f, 0, 255); dd[p + 2] = clamp(dd[p + 2] * f * (1 - (abr - .5) * .05), 0, 255);
    Hf[j * TW + i] = knot * .25 + fib * .45;
  }
  bx.putImageData(id, 0, 0);
  const nrm = heightToNormal(Hf, TW, TH, 1.1);
  const mat = new THREE.MeshPhysicalMaterial({ map: texOf(big, true), normalMap: texOf(nrm, false), normalScale: new THREE.Vector2(.7, .7), roughness: .96, sheen: .8, sheenColor: new THREE.Color('#b8957c'), sheenRoughness: .55 });
  const geo = new THREE.PlaneGeometry(RW, RL, 48, 72); geo.rotateX(-Math.PI / 2);
  { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const px = p.getX(i), pz = p.getZ(i); const e = Math.min(RW / 2 - Math.abs(px), RL / 2 - Math.abs(pz)); let y = .0075 + Math.sin(px * 7 + pz * 3) * .0012 + Math.sin(pz * 11 - px * 4) * .0008; y -= sm(.012, 0, e) * .003; p.setY(i, y); } geo.computeVertexNormals(); }
  const rug = new THREE.Mesh(geo, mat); rug.receiveShadow = true; rug.castShadow = false;
  const g = new THREE.Group(); g.add(rug);
  // fringes
  const fr = rng(55); const n = 34; const cap = new THREE.CapsuleGeometry(.0017, .03, 3, 6); cap.rotateX(Math.PI / 2);
  const fm = new THREE.InstancedMesh(cap, new THREE.MeshPhysicalMaterial({ color: '#cdbb98', roughness: .9, sheen: .6, sheenColor: new THREE.Color('#fff2d8') }), n * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let c = 0;
  for (const sz of [1, -1]) for (let i = 0; i < n; i++) { const px = -RW / 2 + .02 + (RW - .04) * i / (n - 1); e.set(-.05 + (fr() - .5) * .1, (fr() - .5) * .35, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(px, .0035, sz * (RL / 2 + .016 + fr() * .004)), q, new THREE.Vector3(1, 1, 1)); fm.setMatrixAt(c++, m4); }
  fm.castShadow = false; fm.receiveShadow = true; g.add(fm);
  g.userData = { topY: .0075, material: mat };
  return g;
}

// =============================================================================================
// CLAY OIL LAMP (early Islamic / late-antique type): oval body, concave discus with filling hole, long nozzle, knob handle
// =============================================================================================
export function clayLampGeometry(lod = 1) {
  const prof = [[0, 0], [.026, 0], [.038, .005], [.045, .014], [.045, .022], [.038, .031], [.026, .036], [.02, .0375], [.016, .0355], [.009, .0335], [.0075, .03], [.007, .02], [.0001, .02]];
  const body = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), lod ? 28 : 10); body.scale(1.1, 1, .95);
  const nz = new THREE.LatheGeometry([[.0001, 0], [.0135, 0], [.013, .02], [.0115, .04], [.011, .05], [.0095, .056], [.0055, .059], [.0035, .0575], [.003, .052], [.0001, .052]].map(([r, y]) => new THREE.Vector2(r, y)), lod ? 16 : 6);
  nz.scale(1, 1, .82); nz.rotateZ(-Math.PI / 2 + .12); nz.translate(.028, .021, 0);
  const knob = new THREE.SphereGeometry(.009, lod ? 12 : 5, lod ? 8 : 4); knob.scale(.9, 1.5, .7); knob.translate(-.048, .028, 0);
  const geo = mergeGeometries([body.toNonIndexed(), nz.toNonIndexed(), knob.toNonIndexed()].map(gg => { gg.deleteAttribute('uv'); return gg; }));
  return { geo, flameAt: new THREE.Vector3(.0855, .0335, 0) };
}
let _clayMat = null;
export function clayMaterial() {
  if (_clayMat) return _clayMat;
  const t = TEX.plaster({ a: '#a66a4c', b: '#7c4c36', seed: 33, repeat: [2, 2] });
  _clayMat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(.4, .4), roughness: .82 });
  return _clayMat;
}
export function heroLamp(o = {}) {
  const g = new THREE.Group(); const { geo, flameAt } = clayLampGeometry();
  const body = new THREE.Mesh(geo, clayMaterial()); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const f = fxFlame({ height: .03, seed: o.seed ?? 1 }); f.position.copy(flameAt); g.add(f);
  const gl = fxGlow({ size: .2, opacity: .32, color: '#ffae5a' }); gl.position.copy(flameAt).add(new THREE.Vector3(0, .028, 0)); g.add(gl);
  g.userData.flameAt = flameAt; g.userData.flame = f; g.userData.glow = gl; g.scale.setScalar(o.scale ?? 1); return g;
}

// =============================================================================================
// LAMP FIELD — instanced bodies (emissive top when lit), flame points & ground light pools driven by per-lamp ignition time.
// items: [{x,y,z,rot,s,on,seed,nx,ny,nz}]
// =============================================================================================
export function lampField(items, o = {}) {
  const N = items.length; const U = { uTime: { value: 0 }, uFpx: { value: 1000 }, uMinPx: { value: 2 }, uFog: { value: o.fog ?? .0065 }, uMaster: { value: 1 }, uFocus: { value: 10 }, uAperture: { value: 0 }, uCocMax: { value: 120 } };
  const aOn = new Float32Array(N), aSeed = new Float32Array(N); items.forEach((it, i) => { aOn[i] = it.on; aSeed[i] = it.seed; });
  const { geo, flameAt } = clayLampGeometry(0);
  const bgeo = geo.clone(); bgeo.setAttribute('aOn', new THREE.InstancedBufferAttribute(aOn, 1));
  const bmat = clayMaterial().clone();
  bmat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aOn; uniform float uTime; varying float vLit; varying float vUp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLit = smoothstep(aOn, aOn + .3, uTime); vUp = clamp(position.y / .037, 0., 1.);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vLit; varying float vUp;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1., .4, .12) * vLit * (.03 + .22 * vUp * vUp);');
  };
  const bodies = new THREE.InstancedMesh(bgeo, bmat, N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const fpos = new Float32Array(N * 3);
  items.forEach((it, i) => {
    const nrm = new THREE.Vector3(it.nx ?? 0, it.ny ?? 1, it.nz ?? 0).normalize(); q.setFromUnitVectors(up, nrm).multiply(new THREE.Quaternion().setFromAxisAngle(up, it.rot));
    m4.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.s, it.s, it.s)); bodies.setMatrixAt(i, m4);
    const fp = flameAt.clone().multiplyScalar(it.s).applyQuaternion(q).add(new THREE.Vector3(it.x, it.y, it.z)); fpos.set([fp.x, fp.y + .012 * it.s, fp.z], i * 3);
  });
  bodies.castShadow = false; bodies.receiveShadow = false; bodies.frustumCulled = false;
  // flames as camera-facing points (size from focal length, clamped to >= uMinPx with energy compensation)
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); fg.setAttribute('aOn', new THREE.BufferAttribute(aOn, 1)); fg.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
  const fm = new THREE.ShaderMaterial({ uniforms: { ...U, map: { value: TEX.softDot(64, .2) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime, uFpx, uMinPx, uFog, uMaster, uFocus, uAperture, uCocMax; attribute float aOn, aSeed; varying float vB; varying float vCore; varying float vBk;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; float dz = max(-mv.z, .05);
        float lit = smoothstep(aOn, aOn + .22, uTime); float flare = 1. + 1.6 * exp(-max(uTime - aOn, 0.) * 6.) * step(aOn, uTime);
        float fl = .86 + .14 * sin(uTime * 11. + aSeed * 7.) * sin(uTime * 5.3 + aSeed * 3.);
        float px = .1 * uFpx / dz; float fs = clamp(px, uMinPx, 140.); float en = min(1., pow(px / fs, 1.2));
        float coc = min(uAperture * uFpx * abs(1. / uFocus - 1. / dz), uCocMax); float bk = smoothstep(fs * 1.3, fs * 3., coc);
        float fog = exp(-pow(uFog * dz, 2.) * .7);
        vB = lit * flare * fl * en * fog * uMaster; vCore = clamp(px / 14., 0., 1.); vBk = bk; gl_PointSize = max(fs, coc * bk) * (.75 + .25 * lit); }`,
    fragmentShader: `uniform sampler2D map; varying float vB; varying float vCore; varying float vBk; void main(){ vec2 pc = gl_PointCoord - .5; float r = length(pc) * 2.;
        float halo = texture2D(map, gl_PointCoord).a; float core = smoothstep(.32, .0, length(vec2(pc.x * 2.2, (pc.y + .05) * 1.4)) * 2.);
        vec3 c = vec3(1., .5, .16) * halo * .6 + vec3(1., .86, .58) * core * mix(1.8, .7, vCore);
        float disc = smoothstep(1., .86, r) * (.7 + .3 * smoothstep(.55, .95, r)); vec3 bc = vec3(1., .6, .28) * disc * .32;
        gl_FragColor = vec4(mix(c * 2.4, bc, vBk) * vB, 1.); }` });
  const flames = new THREE.Points(fg, fm); flames.frustumCulled = false; flames.userData.noDepth = true; flames.renderOrder = 6;
  // light pools on the sand (tilted to the local terrain normal)
  const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2);
  const pgi = pg; pgi.setAttribute('aOn', new THREE.InstancedBufferAttribute(aOn, 1)); pgi.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
  const pm = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
    vertexShader: `uniform float uTime, uFog, uMaster; attribute float aOn, aSeed; varying float vB; varying vec2 vUv;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
        float lit = smoothstep(aOn, aOn + .3, uTime); float fl = .88 + .12 * sin(uTime * 9. + aSeed * 5.);
        vB = lit * fl * exp(-pow(uFog * -mv.z, 2.) * .9) * uMaster; }`,
    fragmentShader: `varying float vB; varying vec2 vUv; void main(){ float r = length(vUv - .5) * 2.; float a = exp(-r * r * 4.5) * smoothstep(1., .7, r);
        gl_FragColor = vec4(vec3(1., .46, .17) * a * .15 * vB, 1.); }` });
  const pools = new THREE.InstancedMesh(pgi, pm, N);
  items.forEach((it, i) => { const nrm = new THREE.Vector3(it.nx ?? 0, it.ny ?? 1, it.nz ?? 0).normalize(); q.setFromUnitVectors(up, nrm); const s = 1.0 * it.s; m4.compose(new THREE.Vector3(it.x, it.y, it.z).addScaledVector(nrm, .03), q, new THREE.Vector3(s, 1, s)); pools.setMatrixAt(i, m4); });
  pools.frustumCulled = false; pools.userData.noDepth = true; pools.renderOrder = 3;
  const g = new THREE.Group(); g.add(bodies, pools, flames);
  g.userData = { U, bodies, pools, flames, setTime(t) { U.uTime.value = t; } };
  return g;
}

// =============================================================================================
// DAWN SKY — blue hour gradient with azimuthal dawn glow, Belt of Venus, earth shadow, round stars, low lit cloud streaks.
// =============================================================================================
export function dawnSkyMaterial(o = {}) {
  const u = {
    sunDir: { value: new THREE.Vector3(...(o.sunDir ?? [1, -.03, .08])).normalize() }, time: { value: 0 }, glow: { value: o.glow ?? 1 }, sunUp: { value: 0 },
    stars: { value: o.stars ?? 1 }, starPx: { value: .0012 }, lift: { value: o.lift ?? 0 }, clouds: { value: o.clouds ?? 1 }, ground: { value: new THREE.Color(o.ground ?? '#1a1d33') }, gain: { value: o.gain ?? 1 },
  };
  return new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix * vec4(position, 0.)).xyz); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 sunDir, ground; uniform float time, glow, sunUp, stars, starPx, clouds, gain, lift; varying vec3 vDir;
      float h21(vec2 p){ p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0., w = .5; for (int i = 0; i < 5; i++){ a += w * vn(p); p = p * 2.03 + 17.1; w *= .5; } return a; }
      void main(){
        vec3 d = normalize(vDir); float y = d.y; float e = max(y, 0.);
        vec2 hz = normalize(d.xz + 1e-5), sz = normalize(sunDir.xz + 1e-5); float caz = dot(hz, sz); float side = smoothstep(-.35, 1., caz);
        vec3 zen = vec3(.003, .008, .034), up = vec3(.007, .02, .095), mid = vec3(.016, .038, .14), low = vec3(.045, .062, .165);
        vec3 c = mix(low, mid, smoothstep(0., .12, e)); c = mix(c, up, smoothstep(.08, .35, e)); c = mix(c, zen, smoothstep(.35, 1., e));
        // anti-sun side: dark-blue earth shadow capped by the pink Belt of Venus
        float anti = 1. - side; vec3 belt = vec3(.2, .11, .17), shadow = vec3(.035, .045, .12);
        c = mix(c, belt, anti * exp(-pow((e - .05) / .04, 2.)) * .35 * glow); c = mix(c, shadow, anti * smoothstep(.05, 0., e) * .7);
        // dawn glow toward the sun azimuth (narrow, hot near the horizon)
        float hot = pow(max(caz, 0.), 3.); vec3 warm = mix(vec3(.38, .17, .13), vec3(1.1, .5, .2), hot);
        float band = exp(-e / (.022 + .05 * side)) * side; c = mix(c, warm, clamp(band * (.15 + .85 * side) * glow, 0., 1.));
        c += vec3(1., .48, .2) * pow(max(dot(d, sunDir), 0.), 10.) * .25 * glow * smoothstep(-.05, .15, e + .05);
        // sun rising: bright halo at the horizon
        float sd = max(dot(d, sunDir), 0.); c += vec3(1.6, 1., .5) * (pow(sd, 90.) * .9 + pow(sd, 1600.) * 6.) * sunUp;
        // low cloud streaks lit from below
        if (clouds > 0. && y > -.01) { vec2 q = d.xz / (y + .06); float n = fbm(q * vec2(.55, 1.6) + vec2(time * .006, 0.)); float cl = smoothstep(.56, .78, n) * smoothstep(.0, .03, y) * smoothstep(.22, .05, y) * clouds;
          vec3 cc = mix(vec3(.035, .045, .11), mix(vec3(.22, .12, .15), vec3(1.0, .48, .26), hot), side * glow); c = mix(c, cc, cl * .6); }
        // stars: jittered cell grid in (azimuth, elevation), round anti-aliased discs
        if (stars > 0. && y > 0.) { float az = atan(d.x, d.z), el = asin(clamp(y, 0., 1.)); vec2 gp = vec2(az * cos(el), el) / .0105; vec2 cid = floor(gp);
          for (int ox = 0; ox <= 1; ox++) for (int oy = 0; oy <= 1; oy++) { vec2 id = cid + vec2(ox, oy) - .5 + .5; vec2 cc = floor(gp - .5) + vec2(ox, oy);
            float rh = h21(cc + 7.1); if (rh > .32) continue; vec2 sp = cc + vec2(h21(cc + 1.3), h21(cc + 2.7)); float dd = length(gp - sp) * .0105;
            float mag = pow(h21(cc + 4.4), 8.) * 1.6 + .07; float tw = .75 + .25 * sin(time * (2. + 3. * h21(cc + 9.)) + rh * 60.);
            float s = smoothstep(starPx * (1. + mag * .5), 0., dd); c += vec3(.85, .9, 1.) * s * mag * tw * stars * smoothstep(.04, .35, e) * (1. - .7 * side * glow * smoothstep(.25, 0., e)); } }
        c += vec3(.045, .06, .11) * lift * smoothstep(-.05, .5, e);
        if (y < 0.) c = mix(c, ground, smoothstep(0., -.035, y));
        c *= gain;
        c += (h21(gl_FragCoord.xy + fract(time) * 31.) - .5) / 255. * 1.5; // dither vs banding
        gl_FragColor = vec4(max(c, 0.), 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
}
export function dawnSky(o = {}) { const m = dawnSkyMaterial(o); const mesh = new THREE.Mesh(new THREE.SphereGeometry(o.radius ?? 450, 64, 32), m); mesh.frustumCulled = false; mesh.renderOrder = -1000; mesh.userData.noDepth = true; mesh.userData.uniforms = m.uniforms; return mesh; }
// Environment for reflections: the same dawn sky (no stars) + warm glow of the lamp-lit ground and haze
export function dawnEnv(renderer, o = {}) {
  const sc = new THREE.Scene(); const m = dawnSkyMaterial({ ...o, stars: 0, clouds: .6, ground: o.ground ?? '#1c1a24', gain: o.gain ?? 2.2, lift: o.lift ?? 1 }); m.uniforms.glow.value = 1.2;
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), m));
  // warm lamp-lit haze ring near the ground + soft broad warm "glow" above-front (lamp field bounce in the haze)
  const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.lampGlow ?? '#ff8a3c').multiplyScalar(o.lampAmt ?? .16), side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 3.5, 48, 1, true), ringM); ring.position.y = -1.2; sc.add(ring);
  const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(sc, .02, .1, 200); pm.dispose();
  return rt.texture;
}

// =============================================================================================
// Dust motes that light up inside the dawn ray (world-space beam test) + faint warm motes elsewhere
// =============================================================================================
export function rayMotes(o = {}) {
  const n = o.count ?? 300, r = rng(o.seed ?? 77), box = o.box ?? [2.4, 1.4, 2.4], c = o.center ?? [0, .7, 0];
  const pos = new Float32Array(n * 3), rnd = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { pos.set([(r() - .5) * box[0], (r() - .5) * box[1], (r() - .5) * box[2]], i * 3); rnd.set([r(), r(), r(), r()], i * 4); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 4));
  const u = { time: { value: 0 }, box: { value: new THREE.Vector3(...box) }, rayO: { value: new THREE.Vector3() }, rayD: { value: new THREE.Vector3(1, 0, 0) }, rayR: { value: .5 }, rayAmt: { value: 0 }, base: { value: o.base ?? .12 }, fpx: { value: 1000 }, size: { value: o.size ?? .006 }, map: { value: TEX.softDot(64, .35) }, master: { value: 1 } };
  const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time, rayR, rayAmt, base, fpx, size; uniform vec3 box, rayO, rayD; attribute vec4 rnd; varying float vA;
      void main(){ vec3 p = position + vec3(.012, .02, -.008) * time + .05 * vec3(sin(time * .4 + rnd.x * 40.), sin(time * .33 + rnd.y * 40.) * .7, cos(time * .37 + rnd.z * 40.));
        p = mod(p + box * .5, box) - box * .5; vec4 wp = modelMatrix * vec4(p, 1.); vec3 w = wp.xyz - rayO; float along = dot(w, rayD); float dist = length(w - rayD * along);
        float inRay = smoothstep(rayR, rayR * .25, dist) * rayAmt; vec3 e = abs(p) / (box * .5); float edge = 1. - smoothstep(.75, 1., max(max(e.x, e.y), e.z));
        float tw = .6 + .4 * sin(time * (1. + rnd.w * 2.) + rnd.x * 30.);
        vec4 mv = viewMatrix * wp; gl_Position = projectionMatrix * mv; float px = size * (.5 + rnd.y) * fpx / max(-mv.z, .05);
        vA = (base + inRay * 1.6) * edge * tw * min(1., px / 1.5); gl_PointSize = clamp(px, 1.5, 40.); }`,
    fragmentShader: `uniform sampler2D map; uniform float master; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vec3(1., .86, .62) * a * vA * master, 1.); }` });
  const pts = new THREE.Points(g, m); pts.position.set(...c); pts.frustumCulled = false; pts.userData.uniforms = u; pts.userData.noDepth = true; pts.renderOrder = 12; return pts;
}

// =============================================================================================
// Monotone cubic (Fritsch–Carlson) spline over time keys: keys = [[t, v], ...] -> f(t); linear extrapolation keeps drifting
// =============================================================================================
export function mono(keys) {
  const n = keys.length, T = keys.map(k => k[0]), V = keys.map(k => k[1]); const dl = []; for (let i = 0; i < n - 1; i++) dl.push((V[i + 1] - V[i]) / (T[i + 1] - T[i]));
  const m = new Array(n); m[0] = dl[0]; m[n - 1] = dl[n - 2];
  for (let i = 1; i < n - 1; i++) { if (dl[i - 1] * dl[i] <= 0) m[i] = 0; else { const w1 = 2 * (T[i + 1] - T[i]) + (T[i] - T[i - 1]), w2 = (T[i + 1] - T[i]) + 2 * (T[i] - T[i - 1]); m[i] = (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i]); } }
  return t => {
    if (t <= T[0]) return V[0] + m[0] * (t - T[0]); if (t >= T[n - 1]) return V[n - 1] + m[n - 1] * (t - T[n - 1]);
    let i = 0; while (t > T[i + 1]) i++; const h = T[i + 1] - T[i], s = (t - T[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * V[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * V[i + 1] + (s3 - s2) * h * m[i + 1];
  };
}

// =============================================================================================
// DESERT — heightfield: flat pad at the hero, gentle swells in the lamp field, real dunes rising toward the horizon.
// =============================================================================================
export function desertDunes(o = {}) {
  const size = o.size ?? 380, seg = o.seg ?? 280; const f = TEX.fbmField(o.seed ?? 12, 2, 5), f2 = TEX.fbmField((o.seed ?? 12) + 5, 9, 3);
  const hAt = (x, z) => { const u = x / size + .5, v = z / size + .5, r = Math.hypot(x, z);
    let h = f(u, v) * .5 + .5; const ridge = 1 - Math.abs(f(u + .3, v * .7) * 2); h = h * .55 + Math.pow(Math.max(ridge, 0), 2.5) * .65;
    const sv = f2(u, v), swell = (Math.pow(1 - Math.abs(sv), 2.2) * .7 + (sv * .5 + .5) * .5) * (o.swell ?? 2.2); const amp = (o.near ?? .5) + (o.height ?? 7) * sm(o.r0 ?? 22, o.r1 ?? 110, r);
    return (h * amp + swell * sm(5, 24, r)) * sm(o.pad ?? 2.6, o.padFade ?? 10, r); };
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, hAt(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const t = TEX.sand({ a: o.a ?? '#b8936f', b: o.b ?? '#8c6547', repeat: [size / 5, size / 5] });
  const mat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(.45, .45), roughness: 1 });
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.userData.heightAt = hAt; return m;
}

// fine sand patch around the hero (close-up grain), fading out at the rim
export function sandPatch(o = {}) {
  const R = o.r ?? 2.8; const t = TEX.sand({ a: o.a ?? '#c4a07c', b: o.b ?? '#977054', seed: 8, repeat: [1, 1] });
  const map = t.map.clone(), nm = t.normalMap.clone(); for (const x of [map, nm]) { x.repeat.set(R * 2 / .7, R * 2 / .7); x.needsUpdate = true; }
  const alpha = TEX.gradientTex([[0, 'rgba(255,255,255,1)'], [.7, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']], { w: 128, h: 128, radial: true });
  const m = new THREE.MeshStandardMaterial({ map, normalMap: nm, normalScale: new THREE.Vector2(.8, .8), roughness: 1, alphaMap: alpha, transparent: true, depthWrite: false });
  const g = new THREE.CircleGeometry(R, 48); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; // alphaMap uses the same uv: map radial texture over the disc
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.userData.depthOk = false; mesh.renderOrder = 1; return mesh;
}
