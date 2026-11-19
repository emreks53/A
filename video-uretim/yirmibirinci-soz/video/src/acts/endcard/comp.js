// comp.js — the PHOTOGRAPHIC comp of the end card: a float pipeline, one pass over the frame's pixels.
//
// Data (written by /home/user/work/endcard/comp/bake.py — ONE command re-bakes them from the plates):
//   base.u16   the photograph in its base light, lens part of the finishing baked in (softening, CA,
//              halation), 16-bit sRGB, 1.25 x the frame
//   dq.i16     + the warm light on the Qur'an   (signed 16-bit crop, added with weight 0..1)
//   da.i16     + the accent on the Sözler volume (signed 16-bit crop, added with weight 0..1)
//   meta.json  sizes, crops and every position (nothing is hard-coded here)
//
// Per frame, for every device pixel (so --scale 0.5 / 1 / --ss 2 are the same picture):
//   1. light state      cur = base + q * dq + a * da                         (16-bit, plate resolution)
//   2. camera           Catmull-Rom resample of cur, a pure scale about (pivX, pivY)
//   3. vignette         -0.25 EV in the corners, r^2.2, in linear light, anchored to the FRAME
//   4. dissolve         primer plate (the film's last painted frame) -> photograph, weight w
//   5. titles           the text layer (RGBA read back from its own canvas) composited "over"
//   6. grain            luminance grain sigma 1.3 / 255 in the mid-tones (1.6 shadows, 0.6 highlights)
//                       + chroma grain 0.4 / 255, about 1.3 px clumps, a NEW field on every frame
//                       (a pure function of the frame number), added BEFORE the 8-bit rounding:
//                       it is the dither, so the cream wall cannot band
// Everything is a pure function of the parameters: no state survives a frame except caches whose
// content depends on those parameters only.

const FW = 1080, FH = 1920;
const TS = 2048, TMASK = TS - 1;          // grain field: a 2048 x 2048 torus, larger than the frame
const GRAIN = { shadow: 1.6, mid: 1.3, high: 0.6, chroma: 0.4, seed: 2100 };   // finish.py's numbers
const VIG_EV = 0.25, VIG_POW = 2.2;
const GRAIN_Q = 32;                       // int8 grain: 32 counts per sigma
// The supersampled film (canvas 2x, lanczos to 1080) low-passes the grain a little; this restores
// the strength measured on the delivered 1080 frame (see NOTES.md, "grain").
const GRAIN_GAIN_SS = 1.08;

const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const l2s = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

function hash32(a) {
  a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (t ^ (t >>> 14)) >>> 0;
}

/** Gaussian noise, blurred to ~1.3 px clumps on a torus (no seam anywhere), unit variance, as int8. */
function makeGrainField(seed) {
  const n = TS * TS, a = new Float32Array(n), b = new Float32Array(n);
  let s = seed | 0;
  const rnd = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < n; i += 2) {
    const u = Math.sqrt(-2 * Math.log(rnd() + 1e-12)), v = 6.283185307179586 * rnd();
    a[i] = u * Math.cos(v);
    a[i + 1] = u * Math.sin(v);
  }
  // finish.py: blur sigma = (1.3 - 1) * 0.6 + 0.35 = 0.53 px
  const sg = 0.53, k1 = Math.exp(-0.5 / (sg * sg)), k2 = Math.exp(-2 / (sg * sg)), kn = 1 + 2 * k1 + 2 * k2;
  const w0 = 1 / kn, w1 = k1 / kn, w2 = k2 / kn;
  for (let y = 0; y < TS; y++) {
    const o = y * TS;
    for (let x = 0; x < TS; x++) {
      b[o + x] = w0 * a[o + x] + w1 * (a[o + ((x + 1) & TMASK)] + a[o + ((x - 1) & TMASK)])
        + w2 * (a[o + ((x + 2) & TMASK)] + a[o + ((x - 2) & TMASK)]);
    }
  }
  let sum2 = 0;
  for (let y = 0; y < TS; y++) {
    const o = y * TS, u1 = ((y + 1) & TMASK) * TS, d1 = ((y - 1) & TMASK) * TS, u2 = ((y + 2) & TMASK) * TS, d2 = ((y - 2) & TMASK) * TS;
    for (let x = 0; x < TS; x++) {
      const v = w0 * b[o + x] + w1 * (b[u1 + x] + b[d1 + x]) + w2 * (b[u2 + x] + b[d2 + x]);
      a[o + x] = v;
      sum2 += v * v;
    }
  }
  const k = GRAIN_Q / Math.sqrt(sum2 / n), out = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    const v = Math.round(a[i] * k);
    out[i] = v > 127 ? 127 : v < -127 ? -127 : v;
  }
  return out;
}

/** Halve a 3-channel image (box 2 x 2). w and h must be even. */
function halve(src, w, h, Type) {
  const W2 = w >> 1, H2 = h >> 1, out = new Type(W2 * H2 * 3);
  for (let y = 0; y < H2; y++) {
    const a = (y * 2) * w * 3, b = a + w * 3;
    for (let x = 0; x < W2; x++) {
      const i = x * 6, o = (y * W2 + x) * 3;
      for (let c = 0; c < 3; c++) out[o + c] = Math.round((src[a + i + c] + src[a + i + 3 + c] + src[b + i + c] + src[b + i + 3 + c]) / 4);
    }
  }
  return out;
}

/** Fetch and unpack the baked plates. `res` = device px per logical px (E.res). */
export async function loadPlates(res, baseUrl = new URL('../../../../endcard/comp/', import.meta.url)) {
  const get = async (f, as) => {
    const r = await fetch(new URL(f, baseUrl));
    if (!r.ok) throw new Error(`endcard: cannot load ${f} (${r.status}) — run python3 /home/user/work/endcard/comp/bake.py`);
    return as === 'json' ? r.json() : r.arrayBuffer();
  };
  const meta = await get('meta.json', 'json');
  const F = meta.files;
  const [bb, qb, ab] = await Promise.all([get(F.base.file), get(F.dq.file), get(F.da.file)]);
  let PW = F.base.w, PH = F.base.h;
  let base = new Uint16Array(bb);
  if (base.length !== PW * PH * 3) throw new Error('endcard: base.u16 has the wrong size — re-run bake.py');
  let deltas = [[F.dq, qb], [F.da, ab]].map(([f, buf]) => {
    const [x, y, w, h] = f.crop, d = new Int16Array(buf);
    if (d.length !== w * h * 3) throw new Error(`endcard: ${f.file} has the wrong size — re-run bake.py`);
    return { x, y, w, h, d };
  });
  // small preview scales (sheets, --scale 0.5 without --ss 2): work from a half-size plate so the
  // cubic resample never minifies by more than ~0.6
  if (res <= 0.5 && PW % 2 === 0 && PH % 2 === 0 && deltas.every((c) => (c.x | c.y | c.w | c.h) % 2 === 0)) {
    base = halve(base, PW, PH, Uint16Array);
    deltas = deltas.map((c) => ({ x: c.x >> 1, y: c.y >> 1, w: c.w >> 1, h: c.h >> 1, d: halve(c.d, c.w, c.h, Int16Array) }));
    PW >>= 1;
    PH >>= 1;
  }
  return { meta, PW, PH, base, dq: deltas[0], da: deltas[1], cur: new Uint16Array(base), lq: 0, la: 0 };
}

/** cur = base + q * dq + a * da (only the two crops are touched). */
function setLights(P, q, a) {
  if (P.lq === q && P.la === a) return;
  const { PW, base, cur } = P;
  for (const c of [P.dq, P.da]) {
    for (let y = 0; y < c.h; y++) {
      const o = ((c.y + y) * PW + c.x) * 3;
      cur.set(base.subarray(o, o + c.w * 3), o);
    }
  }
  for (const [c, w] of [[P.dq, q], [P.da, a]]) {
    if (!(w > 0)) continue;
    const d = c.d, n = c.w * 3;
    for (let y = 0; y < c.h; y++) {
      let o = ((c.y + y) * PW + c.x) * 3, j = y * n;
      for (let i = 0; i < n; i++, o++, j++) {
        const v = cur[o] + w * d[j] + 0.5;
        cur[o] = v < 0 ? 0 : v > 65535 ? 65535 : v;
      }
    }
  }
  P.lq = q;
  P.la = a;
}

/** Build the comp for a canvas of cw x ch device px (res = cw / 1080). */
export function makeComp(P, cw, ch, res) {
  const S2L = new Float32Array(65536), L2S = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) {
    S2L[i] = s2l(i / 65535) * 65535;
    L2S[i] = l2s(i / 65535) * 255;
  }
  const VN = 4096, VIG = new Float32Array(VN + 1);
  for (let i = 0; i <= VN; i++) VIG[i] = Math.pow(2, -VIG_EV * Math.pow(i / VN, VIG_POW / 2));   // index = r^2 * VN
  const grain = makeGrainField(GRAIN.seed);
  const gain = res > 1.5 ? GRAIN_GAIN_SS : 1;
  // luminance-dependent amplitude (8-bit levels per sigma), finish.py's curve
  const AMP0 = new Float32Array(256);
  const xs = [0, 0.12, 0.5, 0.85, 1], ys = [GRAIN.shadow, GRAIN.shadow, GRAIN.mid, GRAIN.high, GRAIN.high * 0.8];
  for (let i = 0; i < 256; i++) {
    const l = i / 255;
    let k = 1;
    while (k < xs.length - 1 && l > xs[k]) k++;
    AMP0[i] = ys[k - 1] + (ys[k] - ys[k - 1]) * Math.min(1, Math.max(0, (l - xs[k - 1]) / (xs[k] - xs[k - 1])));
  }
  const AMP = new Float32Array(256);
  const colI = new Int32Array(cw), colW = new Float32Array(cw * 4), qx = new Float32Array(cw);
  const gxs = [0, 1, 2, 3].map(() => new Int32Array(cw));
  const lxg = new Int32Array(cw);                       // logical grain column of every device column
  for (let X = 0; X < cw; X++) {
    const lx = (X + 0.5) / res, d = (lx - FW / 2) / (FW / 2);
    qx[X] = d * d * 0.5;
    lxg[X] = Math.floor(X / res);
  }
  const T = new Float32Array((P.PW + 4) * 3), R = new Float32Array(cw * 3);
  const out = new ImageData(cw, ch);
  const data = out.data;
  let camKey = '';

  /**
   * Compose one frame into `out` (ImageData).
   *   o.scale, o.pivX, o.pivY   camera: pure scale about a frame point (logical px)
   *   o.q, o.a                  weights of the Qur'an light and the Sözler accent (0..1)
   *   o.w                       dissolve: 0 = primer plate, 1 = photograph
   *   o.primer                  Uint8ClampedArray RGBA of the film's primer plate (needed while w < 1)
   *   o.text                    null or { data, x, y, w, h } — RGBA (not premultiplied) text layer in device px
   *   o.frame                   integer frame number (grain seed)
   */
  function compose(o) {
    const { PW, PH, cur } = P;
    const s = o.scale, w = o.w, primer = o.primer;
    if (w < 1 && !primer) throw new Error('endcard comp: the primer plate is needed while the dissolve runs');
    setLights(P, o.q, o.a);
    const k = PW / FW;
    const key = `${s}|${o.pivX}|${o.pivY}`;
    if (key !== camKey) {
      for (let X = 0; X < cw; X++) {
        const lx = (X + 0.5) / res, px = ((lx - o.pivX) / s + o.pivX) * k - 0.5;
        let ix = Math.floor(px), f = px - ix;
        if (ix < -1) { ix = -1; f = 0; } else if (ix > PW - 1) { ix = PW - 1; f = 0; }
        colI[X] = (ix + 1) * 3;                          // first of the four taps in the padded row T
        const f2 = f * f, f3 = f2 * f, j = X * 4;
        colW[j] = (-f3 + 2 * f2 - f) * 0.5;
        colW[j + 1] = (3 * f3 - 5 * f2 + 2) * 0.5;
        colW[j + 2] = (-3 * f3 + 4 * f2 + f) * 0.5;
        colW[j + 3] = (f3 - f2) * 0.5;
      }
      camKey = key;
    }
    // grain: four windows of the torus (luminance, three chroma fields), new offsets every frame
    const gy = [0, 0, 0, 0];
    for (let c = 0; c < 4; c++) {
      const h = hash32(Math.imul(o.frame | 0, 4) + c + 1013);
      const ox = h & TMASK, oy = (h >>> 11) & TMASK, g = gxs[c];
      gy[c] = oy;
      for (let X = 0; X < cw; X++) g[X] = (ox + lxg[X]) & TMASK;
    }
    const g0 = gxs[0], g1 = gxs[1], g2 = gxs[2], g3 = gxs[3];
    for (let i = 0; i < 256; i++) AMP[i] = (AMP0[i] * w * gain) / GRAIN_Q;
    const CH = (GRAIN.chroma * w * gain) / GRAIN_Q;
    const text = o.text, td = text ? text.data : null;
    const stride = PW * 3, last = (PW + 3) * 3;

    for (let Y = 0; Y < ch; Y++) {
      // ---- camera, vertical taps
      const ly = (Y + 0.5) / res, py = ((ly - o.pivY) / s + o.pivY) * k - 0.5;
      let iy = Math.floor(py), fy = py - iy;
      if (iy < -1) { iy = -1; fy = 0; } else if (iy > PH - 1) { iy = PH - 1; fy = 0; }
      const fy2 = fy * fy, fy3 = fy2 * fy;
      const v0 = (-fy3 + 2 * fy2 - fy) * 0.5, v1 = (3 * fy3 - 5 * fy2 + 2) * 0.5, v2 = (-3 * fy3 + 4 * fy2 + fy) * 0.5, v3 = (fy3 - fy2) * 0.5;
      const r0 = Math.min(PH - 1, Math.max(0, iy - 1)) * stride, r1 = Math.min(PH - 1, Math.max(0, iy)) * stride;
      const r2 = Math.min(PH - 1, Math.max(0, iy + 1)) * stride, r3 = Math.min(PH - 1, Math.max(0, iy + 2)) * stride;
      for (let i = 0; i < stride; i++) T[i + 6] = v0 * cur[r0 + i] + v1 * cur[r1 + i] + v2 * cur[r2 + i] + v3 * cur[r3 + i];
      for (let c = 0; c < 3; c++) {
        T[c] = T[3 + c] = T[6 + c];
        T[last + c] = T[last - 3 + c] = T[last - 6 + c];
      }
      // ---- horizontal taps, vignette, tone
      const dy = (ly - FH / 2) / (FH / 2), qy = dy * dy * 0.5;
      for (let X = 0, j = 0, m = 0; X < cw; X++, j += 4, m += 3) {
        const i = colI[X], w0 = colW[j], w1 = colW[j + 1], w2 = colW[j + 2], w3 = colW[j + 3];
        let r = T[i] * w0 + T[i + 3] * w1 + T[i + 6] * w2 + T[i + 9] * w3;
        let g = T[i + 1] * w0 + T[i + 4] * w1 + T[i + 7] * w2 + T[i + 10] * w3;
        let b = T[i + 2] * w0 + T[i + 5] * w1 + T[i + 8] * w2 + T[i + 11] * w3;
        const f = VIG[((qx[X] + qy) * VN) | 0];
        r = r < 0 ? 0 : r > 65535 ? 65535 : r;
        g = g < 0 ? 0 : g > 65535 ? 65535 : g;
        b = b < 0 ? 0 : b > 65535 ? 65535 : b;
        R[m] = L2S[(S2L[r | 0] * f) | 0];
        R[m + 1] = L2S[(S2L[g | 0] * f) | 0];
        R[m + 2] = L2S[(S2L[b | 0] * f) | 0];
      }
      // ---- dissolve from the primer plate
      const row = Y * cw * 4;
      if (w < 1) {
        for (let X = 0, m = 0, p = row; X < cw; X++, m += 3, p += 4) {
          const a = primer[p], b = primer[p + 1], c = primer[p + 2];
          R[m] = a + w * (R[m] - a);
          R[m + 1] = b + w * (R[m + 1] - b);
          R[m + 2] = c + w * (R[m + 2] - c);
        }
      }
      // ---- titles
      if (td && Y >= text.y && Y < text.y + text.h) {
        const x1 = Math.min(cw, text.x + text.w);
        for (let X = Math.max(0, text.x), p = ((Y - text.y) * text.w + (X - text.x)) * 4, m = X * 3; X < x1; X++, p += 4, m += 3) {
          const al = td[p + 3];
          if (al === 0) continue;
          const a = al / 255;
          R[m] += a * (td[p] - R[m]);
          R[m + 1] += a * (td[p + 1] - R[m + 1]);
          R[m + 2] += a * (td[p + 2] - R[m + 2]);
        }
      }
      // ---- grain (= dither) and 8-bit rounding
      const lyg = Math.floor(Y / res);
      const b0 = ((gy[0] + lyg) & TMASK) * TS, b1 = ((gy[1] + lyg) & TMASK) * TS, b2 = ((gy[2] + lyg) & TMASK) * TS, b3 = ((gy[3] + lyg) & TMASK) * TS;
      for (let X = 0, m = 0, p = row; X < cw; X++, m += 3, p += 4) {
        const r = R[m], g = R[m + 1], b = R[m + 2];
        let li = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0;
        if (li > 255) li = 255; else if (li < 0) li = 0;
        const n = grain[b0 + g0[X]] * AMP[li];
        const c0 = grain[b1 + g1[X]], c1 = grain[b2 + g2[X]], c2 = grain[b3 + g3[X]], cm = (c0 + c1 + c2) / 3;
        data[p] = r + n + CH * (c0 - cm);
        data[p + 1] = g + n + CH * (c1 - cm);
        data[p + 2] = b + n + CH * (c2 - cm);
        data[p + 3] = 255;
      }
    }
    return out;
  }

  return { compose, out, cw, ch, res };
}
