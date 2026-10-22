/* Overlay renderer — Kurzgesagt-style "interactive" graphics for the photoreal short.
 *
 * Draws ONE frame of the resolved overlay timeline (built by comp/overlays.py) into two canvases:
 *   #over : straight-alpha graphics, composited OVER the plate
 *   #add  : additive light (glows, light points), composited with a screen blend
 * Everything is a pure function of the frame number (no wall clock, seeded randomness only), so any frame
 * can be rendered in any order and is identical every time.
 *
 * API (called by render_overlays.mjs):
 *   await window.ovInit(timeline, scale)        -> loads fonts, sizes canvases (1080*scale x 1920*scale)
 *   window.ovRender(frame)                      -> {over: bool, add: bool, boxes: [[x0,y0,x1,y1,w], ...]}
 *     boxes: legibility boxes for the compositor; [.., w, 1] = a callout label (local darkening),
 *     [.., w, 0, s] = a key-word line with a scrim of strength s (a floor on the darkening behind it)
 * Coordinates everywhere are in the 1080x1920 layout space; `S` maps them to device pixels.
 */
'use strict';

let TL = null, S = 1, W = 1080, H = 1920, FPS = 24;
let cOver, cAdd, X, A, cKOver, cKAdd, KX, KA;
const OFF = 6000;                 // offscreen offset for the shadow-blur trick (layout px)
let drewOver = false, drewAdd = false, BOXES = [], KWBOXES = [];
const CACHE = new Map();

// ------------------------------------------------------------------ maths / easing
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const lin = (t, t0, t1) => (t1 <= t0 ? (t >= t1 ? 1 : 0) : clamp((t - t0) / (t1 - t0)));
const smooth = x => x * x * (3 - 2 * x);
const smoother = x => x * x * x * (x * (x * 6 - 15) + 10);
const eOutCubic = x => 1 - Math.pow(1 - x, 3);
const eInCubic = x => x * x * x;
const eInQuad = x => x * x;
const eOutQuad = x => 1 - (1 - x) * (1 - x);
const eInOutCubic = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eInOutSine = x => -(Math.cos(Math.PI * x) - 1) / 2;
const eOutExpo = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a).toFixed(4)})`;

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {               // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function vnoise(x, y, seed) {      // smooth value noise in [0,1]
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (i, j) => { let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 1442695041);
    n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const u = smooth(xf), v = smooth(yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
function fbm(x, y, seed) { return 0.6 * vnoise(x, y, seed) + 0.3 * vnoise(x * 2.03, y * 2.03, seed + 7) + 0.1 * vnoise(x * 4.1, y * 4.1, seed + 13); }

// ------------------------------------------------------------------ text helpers
const fontStr = (fam, wt, size) => `${wt} ${size.toFixed(3)}px "${fam}"`;
const upperTR = s => s.toLocaleUpperCase('tr-TR');

/** Layout a run of text: per-character x (kerning + tracking included) relative to the run start. */
function layoutRun(text, fam, wt, size, trackEm) {
  const key = `${text}|${fam}|${wt}|${size.toFixed(3)}|${trackEm}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const ls = trackEm * size;
  X.save();
  X.font = fontStr(fam, wt, size); X.letterSpacing = `${ls}px`;
  const chars = [];
  const cps = Array.from(text);
  let pre = '';
  for (const ch of cps) { chars.push({ ch, x: X.measureText(pre).width }); pre += ch; }
  const full = X.measureText(text);
  X.letterSpacing = '0px';
  const mH = X.measureText('H');
  X.restore();
  const r = { chars, w: Math.max(0, full.width - ls), capH: mH.actualBoundingBoxAscent, size, fam, wt, ls };
  CACHE.set(key, r);
  return r;
}

function setFont(ctx, fam, wt, size) { ctx.font = fontStr(fam, wt, size); ctx.letterSpacing = '0px'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }

/** Fill one glyph, optionally Gaussian-blurred (sigma in layout px) via the shadow trick (ctx.filter is far too slow). */
function glyph(ctx, ch, x, y, rgb, alpha, sigma) {
  if (alpha < 0.003) return;
  if (ctx === X) drewOver = true; else drewAdd = true;
  if (sigma < 0.3) { ctx.globalAlpha = clamp(alpha); ctx.fillStyle = rgba(rgb, 1); ctx.fillText(ch, x, y); ctx.globalAlpha = 1; return; }
  ctx.save();
  ctx.shadowColor = rgba(rgb, alpha); ctx.shadowBlur = 2 * sigma * S; ctx.shadowOffsetX = OFF * S; ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#000'; ctx.fillText(ch, x - OFF, y);
  ctx.restore();
}
/** Soft black (or coloured) shadow of a glyph only. */
function glyphShadow(ctx, ch, x, y, alpha, sigma, dy, rgb = [0, 0, 0]) {
  if (alpha < 0.003) return;
  if (ctx === X) drewOver = true; else drewAdd = true;
  ctx.save();
  ctx.shadowColor = rgba(rgb, alpha); ctx.shadowBlur = 2 * Math.max(0.5, sigma) * S; ctx.shadowOffsetX = OFF * S; ctx.shadowOffsetY = dy * S;
  ctx.fillStyle = '#000'; ctx.fillText(ch, x - OFF, y);
  ctx.restore();
}

/** Soft companion of a stroke WITHOUT Skia shadow blurs (those cost ~bbox area in software):
 *  - on the additive layer: a sharp emitter stroke; the compositor blooms the whole light layer (multi-scale glow)
 *  - on the over layer: a dark halo built from two wide, faint strokes (reads as a soft legibility shadow). */
function strokeGlow(ctx, buildPath, width, rgb, alpha, sigma, dy = 0) {
  if (alpha < 0.003) return;
  if (ctx === X) drewOver = true; else drewAdd = true;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (ctx === A) {
    ctx.strokeStyle = rgba(rgb, alpha); ctx.lineWidth = width * 1.6;
    ctx.beginPath(); buildPath(ctx, 0); ctx.stroke();
  } else {
    // energy-preserving stand-in for a Gaussian-blurred thin line: same integral of alpha across the line
    ctx.translate(0, dy);
    const w1 = width + 2.4 * sigma, w2 = width + 1.0 * sigma;
    ctx.strokeStyle = rgba(rgb, alpha * 0.5 * width / w1); ctx.lineWidth = w1;
    ctx.beginPath(); buildPath(ctx, 0); ctx.stroke();
    ctx.strokeStyle = rgba(rgb, alpha * 0.5 * width / w2); ctx.lineWidth = w2;
    ctx.beginPath(); buildPath(ctx, 0); ctx.stroke();
  }
  ctx.restore();
}
function strokeSolid(ctx, buildPath, width, rgb, alpha) {
  if (alpha < 0.003) return;
  if (ctx === X) drewOver = true; else drewAdd = true;
  ctx.save();
  ctx.strokeStyle = rgba(rgb, alpha); ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); buildPath(ctx, 0); ctx.stroke();
  ctx.restore();
}
/** A line drawn the premium way: soft dark legibility shadow + crisp core (over) + light glow (add). */
function premiumStroke(buildPath, width, alpha, st, glowMul = 1) {
  const sh = st.shadow, gl = st.glow;
  strokeGlow(X, buildPath, width, [0, 0, 0], alpha * sh[0], sh[1], sh[2]);
  strokeSolid(X, buildPath, width, st.color, alpha * st.line_alpha);
  strokeGlow(A, buildPath, width, gl, alpha * gl[3] * glowMul, gl[4]);
}
function fillCircle(ctx, x, y, r, rgb, alpha) {
  if (alpha < 0.003 || r <= 0) return;
  if (ctx === X) drewOver = true; else drewAdd = true;
  ctx.save(); ctx.fillStyle = rgba(rgb, alpha); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function glowDot(ctx, x, y, r, rgb, alpha) {     // radial gradient light blob (r = 1/e^2-ish radius)
  if (alpha < 0.003 || r <= 0) return;
  if (ctx === X) drewOver = true; else drewAdd = true;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(rgb, alpha)); g.addColorStop(0.25, rgba(rgb, alpha * 0.55));
  g.addColorStop(0.55, rgba(rgb, alpha * 0.18)); g.addColorStop(1, rgba(rgb, 0));
  ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

// ------------------------------------------------------------------ tracks
function tk(trk, f) {
  if (!trk) return { x: W / 2, y: H / 2, xs: W / 2, ys: H / 2, v: 1, d: 1 };
  const i = clamp(f - trk.f0, 0, trk.x.length - 1) | 0;
  return { x: trk.x[i], y: trk.y[i], xs: trk.xs[i], ys: trk.ys[i], v: trk.v[i], d: trk.d ? trk.d[i] : 1 };
}

// ================================================================== KEYWORDS
function inkOf(ch, fam, wt, size) {
  const key = `ink|${ch}|${fam}|${wt}|${size.toFixed(3)}`;
  if (CACHE.has(key)) return CACHE.get(key);
  X.save(); X.font = fontStr(fam, wt, size); X.letterSpacing = '0px';
  const m = X.measureText(ch);
  X.restore();
  const r = { l: -m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent };
  CACHE.set(key, r);
  return r;
}

/** Key-word layout. Lines are centred on one block centre; the block is shrunk until its ink (glyph outlines,
 *  at the largest drift scale) fits between the safe edges, and shifted left of the frame centre only when the
 *  widest line would otherwise reach into the right-hand UI column (x > safe.x1). */
function keywordLayout(el) {
  const key = 'kwl|' + el.id;
  if (CACHE.has(key)) return CACHE.get(key);
  const st = TL.styles[el.style];
  const lhEm = el.line_height || st.line_height;
  let size = el.size || st.size;
  const maxW = el.max_width || st.max_width;
  const sf = TL.safe, MARGIN = 20;
  const XL = sf.x0 + MARGIN, XR = sf.x1 - MARGIN;
  const kmax = 1 + (st.drift || 0);
  const trk = el.tracking !== undefined ? el.tracking : st.tracking;
  let lines, inkL, inkR;
  for (;;) {
    lines = el.lines.map(ln => {
      const parts = ln.parts.map(p => ({ ...p, text: upperTR(p.text), run: layoutRun(upperTR(p.text), st.family, st.weight, size, trk) }));
      let x = 0; const segs = [];
      parts.forEach((p, k) => {
        if (k > 0) {
          const sep = p.sep === undefined ? '·' : p.sep;
          if (sep === ' ') { const sp = layoutRun('I I', st.family, st.weight, size, trk); const gap = sp.w - 2 * layoutRun('I', st.family, st.weight, size, trk).w; segs.push({ kind: 'space', x, w: gap }); x += gap; }
          else { const gap = (st.sep_gap || 0.5) * size * 2; segs.push({ kind: 'dot', x, w: gap, t: p.t }); x += gap; }
        }
        p.x0 = x; x += p.run.w;
      });
      // ink extent of the line relative to its left edge
      let il = 1e9, ir = -1e9;
      parts.forEach(p => p.run.chars.forEach(c => {
        if (c.ch === ' ') return;
        const g = inkOf(c.ch, st.family, st.weight, size);
        il = Math.min(il, p.x0 + c.x + g.l); ir = Math.max(ir, p.x0 + c.x + g.r);
      }));
      return { parts, segs, w: x, il, ir };
    });
    const mw = Math.max(...lines.map(l => l.w));
    // block ink relative to the block centre (lines are centred on it)
    inkL = Math.min(...lines.map(l => l.il - l.w / 2)); inkR = Math.max(...lines.map(l => l.ir - l.w / 2));
    const inkW = (inkR - inkL) * kmax;
    if ((mw <= maxW && inkW <= XR - XL) || size <= st.min_size) break;
    size = Math.max(st.min_size, size * Math.max(0.9, Math.min(maxW / mw, (XR - XL) / inkW) * 0.995));
  }
  let cx = W / 2;
  if (cx + inkR * kmax > XR) cx = XR - inkR * kmax;
  if (cx + inkL * kmax < XL) cx = XL - inkL * kmax;
  const capH = layoutRun('H', st.family, st.weight, size, 0).capH;
  // punctuation that should sit on the cap-height centre in an all-caps setting (no 'case' feature in canvas)
  X.save(); X.font = fontStr(st.family, st.weight, size);
  const capsDy = {};
  for (const ch of ['-', '–', '—']) { const m = X.measureText(ch); capsDy[ch] = -(capH / 2 - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2); }
  X.restore();
  const yc = el.y || 670;
  const lh = lhEm * size;
  const n = lines.length;
  lines.forEach((l, i) => {
    l.cy = yc - (n - 1) / 2 * lh + i * lh;      // optical centre of the caps
    l.base = l.cy + capH / 2;
    l.x0 = cx - l.w / 2;
  });
  // global letter index (for exit stagger) and letter metadata
  let g = 0;
  const letters = [];
  lines.forEach((l, li) => {
    let ia = 1e9, id = -1e9;
    l.parts.forEach((p, pi) => {
      const nch = p.run.chars.length;
      p.run.chars.forEach((c, i) => {
        if (c.ch === ' ') return;
        const base = l.base + (capsDy[c.ch] || 0);
        const gi = inkOf(c.ch, st.family, st.weight, size);
        ia = Math.min(ia, base - gi.a); id = Math.max(id, base + gi.d);
        letters.push({ ch: c.ch, li, pi, i, n: nch, g: g++, x: l.x0 + p.x0 + c.x, base, t: p.t, part: p, line: l });
      });
    });
    l.ink = [l.x0 + l.il, ia, l.x0 + l.ir, id];      // settled ink box (layout px)
  });
  const r = { st, size, capH, lines, letters, lh, yc, cx, kmax };
  CACHE.set(key, r);
  return r;
}

/** Ink boxes of every key-word line at their largest extent (drift scale about the block centre) - for the
 *  resolve-time safe-area assertion (overlays.py layout_check). */
window.ovLayoutReport = function () {
  const out = [];
  for (const el of TL.elements) {
    if (el.type !== 'keyword') continue;
    const L = keywordLayout(el);
    out.push({ id: el.id, size: +L.size.toFixed(2), cx: +L.cx.toFixed(1), lines: L.lines.map(l => ({
      ink: [L.cx + (l.ink[0] - L.cx) * L.kmax, L.yc + (l.ink[1] - L.yc) * L.kmax, L.cx + (l.ink[2] - L.cx) * L.kmax, L.yc + (l.ink[3] - L.yc) * L.kmax].map(v => +v.toFixed(1)),
      text: l.parts.map(p => p.text).join(' ') })) });
  }
  return { keywords: out };
};

/** Scrim strength at t (overlays.json keyword "scrim": {from, to, k, fade, fade_out}): k at full strength, easing
 *  in over 'fade' s after 'from' and out over 'fade_out' s (default 'fade') before 'to'. */
function scrimAt(sc, t) {
  if (!sc) return 0;
  const fi = sc.fade || 0.15, fo = sc.fade_out != null ? sc.fade_out : fi;
  return sc.k * smooth(lin(t, sc.from, sc.from + fi)) * (1 - smooth(lin(t, sc.to - fo, sc.to)));
}
/** The scrim's legibility box: [x0, y0, x1, y1, 0, 0, s] (+ [shape, soft] for a 'rect' scrim, composite.py). */
function scrimBox(sc, bb, s) {
  const b = [bb[0], bb[1], bb[2], bb[3], 0, 0, s];
  if (sc.shape === 'rect') b.push(1, sc.soft || 160);
  return b;
}

function drawKeyword(el, t) {
  const L = keywordLayout(el);
  const st = L.st, size = L.size;
  if (st.dust) return drawColdKeyword(el, t, L);
  const IN = el.in ? { ...st.in, ...el.in } : st.in, OUT = st.out;
  const tFirst = Math.min(...L.letters.map(l => l.t));
  const nTot = L.letters.length;
  // short, light exit that starts late (overlays.py checks it starts after the last word has been spoken)
  const outStag = Math.min(OUT.stagger, (OUT.max_stagger !== undefined ? OUT.max_stagger : 0.26) / Math.max(1, nTot - 1));
  const te0 = el.out - OUT.dur - outStag * (nTot - 1);
  // slow drift (scale about the block centre) over the element's life
  const life = clamp((t - tFirst) / Math.max(0.5, el.out - tFirst));
  const k = 1 + (st.drift || 0) * eInOutSine(life);
  const sz = size * k;
  const cx = L.cx, cy = L.yc;
  const swell = el.swell ? Math.exp(-Math.pow(Math.max(0, el.swell.t - t) / 0.18, 2)) * Math.exp(-Math.max(0, t - el.swell.t) / el.swell.dur) * el.swell.gain : 0;
  const breathe = st.breathe ? 1 + st.breathe * Math.sin(2 * Math.PI * (t - tFirst) / 4.2) : 1;
  const P = [];
  const boxLines = new Map();
  for (const l of L.letters) {
    const n = l.n;
    const stag = Math.min(IN.stagger, (IN.max_stagger || 0.3) / Math.max(1, n - 1));
    const ta = l.t + l.i * stag;
    if (t < ta - 0.001) continue;
    const u = clamp((t - ta) / IN.dur);
    let alpha = eOutCubic(clamp((t - ta) / IN.fade));
    let dy = (1 - eOutExpo(u)) * IN.rise * size;
    let blur = (1 - eOutCubic(clamp((t - ta) / (IN.dur * 0.8)))) * IN.blur;
    const settle = (1 - eOutCubic(clamp((t - l.t) / 1.15))) * st.tracking_in * size;
    let dx = (l.i - (n - 1) / 2) * settle;
    let scl = 1;
    if (IN.scale) scl = 1 + IN.scale * (1 - eOutCubic(clamp((t - ta) / (IN.dur * 1.3))));
    // exit
    let glowOut = 0;
    if (el.out !== undefined && el.out !== null) {
      const tl = te0 + l.g * outStag;
      const v = clamp((t - tl) / OUT.dur);
      if (v > 0) {
        alpha *= 1 - smooth(v);
        blur += eInQuad(v) * OUT.blur;
        dy += eInCubic(v) * OUT.rise * size;
        dx += (l.i - (n - 1) / 2) * (OUT.tracking || 0) * size * eOutCubic(v);
        glowOut = (OUT.glow_boost || 0) * Math.sin(Math.PI * v);
      }
      if (t > el.out) continue;
    }
    if (alpha < 0.003) continue;
    // final position (drift scale about block centre)
    const x = cx + ((l.x + dx) - cx) * k;
    const y = cy + ((l.base + dy) - cy) * k;
    P.push({ l, x, y, alpha, blur, scl, glowOut });
    const bl = boxLines.get(l.line) || { a: 0 };
    bl.a = Math.max(bl.a, alpha); boxLines.set(l.line, bl);
  }
  if (!P.length) return;
  const fam = st.family, wt = st.weight;
  // separators (middle dots), revealed with the part that follows them
  const seps = [];
  for (const ln of L.lines) for (const sg of ln.segs) {
    if (sg.kind !== 'dot') continue;
    const ta = sg.t;
    if (t < ta) continue;
    let a = eOutCubic(clamp((t - ta) / 0.35));
    if (el.out != null) { const v = clamp((t - (te0 + 0.05)) / OUT.dur); a *= 1 - smooth(v); if (t > el.out) a = 0; }
    const sx = cx + ((ln.x0 + sg.x + sg.w / 2) - cx) * k, sy = cy + (ln.cy - cy) * k;
    seps.push({ x: sx, y: sy, a, r: 0.052 * sz * (0.6 + 0.4 * eOutCubic(clamp((t - ta) / 0.3))) });
  }
  // pass 1: legibility shadows (per-keyword 'shadow' / 'shadow2' override the style's)
  const shRGB = st.shadow_rgb || [0, 0, 0];
  const sh = el.shadow || st.shadow, sh2 = el.shadow2 || st.shadow2;
  for (const p of P) {
    setFont(X, fam, wt, sz * p.scl);
    glyphShadow(X, p.l.ch, p.x, p.y, p.alpha * sh[0], Math.hypot(sh[1], p.blur), sh[2], shRGB);
    glyphShadow(X, p.l.ch, p.x, p.y, p.alpha * sh2[0], Math.hypot(sh2[1], p.blur), sh2[2], shRGB);
  }
  for (const s of seps) { glowDot(X, s.x, s.y + 1.5, s.r * 5, [0, 0, 0], s.a * 0.35); }
  // pass 2: glyphs
  for (const p of P) { setFont(X, fam, wt, sz * p.scl); glyph(X, p.l.ch, p.x, p.y, st.color, p.alpha, p.blur); }
  for (const s of seps) fillCircle(X, s.x, s.y, s.r, st.color, s.a);
  // pass 3: additive light (sacred words)
  if (st.glow) {
    const SW = st.sweep;
    for (const p of P) {
      const part = p.l.part, line = p.l.line;
      let boost = 0;
      if (SW) {
        const sp = lin(t, part.t, part.t + SW.dur);
        if (sp > 0 && sp < 1) {
          const px0 = line.x0 + part.x0, pw = part.run.w;
          const sx = lerp(px0 - 0.25 * pw, px0 + 1.25 * pw, eInOutSine(sp));
          boost = SW.gain * Math.exp(-Math.pow((p.l.x - sx) / Math.max(30, SW.width * pw + 40), 2));
        }
      }
      const gmul = (breathe + boost + swell + p.glowOut);
      setFont(A, fam, wt, sz * p.scl);
      for (const g of st.glow) glyph(A, p.l.ch, p.x, p.y, g, p.alpha * g[3] * gmul, p.blur);
    }
    for (const s of seps) glowDot(A, s.x, s.y, s.r * 6, st.glow[0], s.a * 0.35 * breathe);
  }
  // legibility boxes for the compositor + knock-out boxes (graphics never cross a key word)
  // optional scrim (overlays.json "scrim": {from, to, k}): a soft dark vignette behind the line, k at full
  // strength, easing in/out inside [from, to] (scrimAt) and never stronger than the line itself is visible
  const scr = scrimAt(el.scrim, t);
  for (const [ln, b] of boxLines) {
    const y0 = cy + ((ln.cy - L.capH * 0.5) - cy) * k, y1 = cy + ((ln.cy + L.capH * 0.5) - cy) * k;
    const x0 = cx + (ln.x0 - cx) * k, x1 = cx + (ln.x0 + ln.w - cx) * k;
    const box = [x0, y0, x1, y1, b.a * (st.legibility || 1)];
    if (scr * b.a > 0.001) box.push(0, scr * Math.min(1, b.a));
    BOXES.push(box);
    KWBOXES.push([cx + (ln.ink[0] - cx) * k, cy + (ln.ink[1] - cy) * k, cx + (ln.ink[2] - cx) * k, cy + (ln.ink[3] - cy) * k, b.a]);
  }
}

// ------------------------------------------------------------------ cold words: crumble into dust
function coldBitmap(el, L, line) {
  const key = `cold|${el.id}|${L.lines.indexOf(line)}|${S}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const st = L.st, size = L.size;
  const pad = 24;
  const x0 = Math.floor((line.x0 - pad) * S) / S, y0 = Math.floor((line.base - L.capH - pad - size * 0.25) * S) / S;
  const wL = line.w + 2 * pad, hL = L.capH + 2 * pad + size * 0.5;
  const cw = Math.ceil(wL * S) + 2, ch = Math.ceil(hL * S) + 2;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.setTransform(S, 0, 0, S, -x0 * S, -y0 * S);
  setFont(c, st.family, st.weight, size);
  c.fillStyle = rgba(st.color, 1);
  for (const l of L.letters) if (l.line === line) c.fillText(l.ch, l.x, l.base);
  const img = c.getImageData(0, 0, cw, ch);
  // per-pixel death time (fraction of the dust duration): a front moving along the word + grainy noise
  const seed = hash32(key);
  const D = new Float32Array(cw * ch);
  const grains = [];
  const r = rng(seed);
  const cand = [];
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const lx = x0 + i / S, ly = y0 + j / S;
    const xn = clamp((lx - line.x0) / Math.max(1, line.w));
    const nz = fbm(lx / 9, ly / 9, seed & 0xffff);
    const nz2 = vnoise(lx / 2.2, ly / 2.2, (seed >>> 8) & 0xffff);
    const front = st.dust.dir >= 0 ? xn : 1 - xn;
    D[j * cw + i] = clamp(0.70 * front + 0.22 * nz + 0.08 * nz2);
    if (img.data[(j * cw + i) * 4 + 3] > 140) cand.push(j * cw + i);
  }
  const ds = st.dust;
  const nG = Math.min(ds.grains, cand.length);
  for (let k = 0; k < nG; k++) {
    const idx = cand[Math.floor(r() * cand.length)];
    const i = idx % cw, j = (idx / cw) | 0;
    grains.push({
      x: x0 + i / S, y: y0 + j / S, d: D[idx],
      life: lerp(ds.life[0], ds.life[1], r()),
      vx: lerp(ds.vel[0][0], ds.vel[0][1], Math.pow(r(), 1.4)) * (ds.dir >= 0 ? 1 : -1),
      vy: lerp(ds.vel[1][0], ds.vel[1][1], r()),
      ph: r() * 6.283, ph2: r() * 6.283, fq: 0.8 + r() * 1.6,
      s: lerp(ds.size[0], ds.size[1], Math.pow(r(), 2.2)),
      b: 0.82 + r() * 0.3,
    });
  }
  const scratch = document.createElement('canvas'); scratch.width = cw; scratch.height = ch;
  const out = { x0, y0, cw, ch, img, D, grains, scratch, sctx: scratch.getContext('2d'), work: new ImageData(cw, ch) };
  CACHE.set(key, out);
  return out;
}

function drawColdKeyword(el, t, L) {
  const st = L.st, size = L.size, IN = st.in, ds = st.dust;
  const fam = st.family, wt = st.weight;
  const shRGB = st.shadow_rgb || [0, 0, 0];
  // optional scrim (as drawKeyword), but ONE steady box for the whole block (all lines), gated by whichever line
  // is visible: per-line scrims would drag a dark patch down the flat sky as each word arrives and crumbles.
  // 'gate': false = not gated by the words at all: a steady shade over [from, to] (e.g. a darker sky from the
  // dip into the shot to the dissolve out of it), so it never appears or moves with a word
  const scr = scrimAt(el.scrim, t);
  const ungated = el.scrim && el.scrim.gate === false;
  if (ungated && scr > 0.001) BOXES.push(scrimBox(el.scrim, el.scrim.box, scr));
  // everything (letters and every grain) is gone by the cut: a gentle fade over the last 0.35 s
  const km = el.kill != null ? 1 - smooth(clamp((t - (el.kill - 0.35)) / 0.35)) : 1;
  if (km < 0.003) return;
  let allA = 0;
  for (const line of L.lines) {
    const tw = line.parts[0].t;
    if (t < tw) continue;
    const td = tw + ds.delay;
    const tEnd = td + ds.dur + ds.life[1] + 0.1;
    if (t > tEnd) continue;
    const letters = L.letters.filter(l => l.line === line);
    const n = letters.length;
    const inDone = t >= tw + IN.dur + 0.02;
    let maxA = 0;
    if (!inDone || t < td - 0.15) {
      // reveal (vector glyphs; identical to the bitmap once settled)
      const P = [];
      for (const l of letters) {
        const stag = Math.min(IN.stagger, (IN.max_stagger || 0.12) / Math.max(1, n - 1));
        const ta = tw + l.i * stag;
        if (t < ta) continue;
        const u = clamp((t - ta) / IN.dur);
        const a = eOutCubic(clamp((t - ta) / IN.fade));
        const blur = (1 - eOutCubic(clamp((t - ta) / (IN.dur * 0.85)))) * IN.blur;
        const settle = (1 - eOutCubic(clamp((t - tw) / IN.dur))) * st.tracking_in * size;   // fully settled before the bitmap takes over
        const dx = (l.i - (n - 1) / 2) * settle;
        const dy = (1 - eOutExpo(u)) * IN.rise * size;
        P.push({ l, x: l.x + dx, y: l.base + dy, a: a * km, blur });
        maxA = Math.max(maxA, a * km);
      }
      setFont(X, fam, wt, size);
      for (const p of P) { glyphShadow(X, p.l.ch, p.x, p.y, p.a * st.shadow[0], Math.hypot(st.shadow[1], p.blur), st.shadow[2], shRGB); }
      if (st.shadow2) for (const p of P) { glyphShadow(X, p.l.ch, p.x, p.y, p.a * st.shadow2[0], Math.hypot(st.shadow2[1], p.blur), st.shadow2[2], shRGB); }
      for (const p of P) glyph(X, p.l.ch, p.x, p.y, st.color, p.a, p.blur);
    } else {
      // settled / crumbling: per-pixel erosion of the cached bitmap + dust grains
      const B = coldBitmap(el, L, line);
      const src = B.img.data, dst = B.work.data, D = B.D;
      const fade = 0.07;   // seconds a pixel takes to vanish once its time has come
      let alive = 0;
      for (let p = 0, q = 0; p < D.length; p++, q += 4) {
        const a0 = src[q + 3];
        if (a0 === 0) { dst[q + 3] = 0; continue; }
        const tdie = td + D[p] * ds.dur;
        const m = t <= tdie - fade ? 1 : (t >= tdie ? 0 : (tdie - t) / fade);
        dst[q] = src[q]; dst[q + 1] = src[q + 1]; dst[q + 2] = src[q + 2];
        dst[q + 3] = a0 * m; if (m > 0) alive++;
      }
      if (alive > 0) {
        B.sctx.putImageData(B.work, 0, 0);
        X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = km;
        const bx = Math.round(B.x0 * S), by = Math.round(B.y0 * S);
        for (const sh of [st.shadow, st.shadow2]) {          // shadow-only passes (image drawn off-canvas)
          if (!sh) continue;
          X.shadowColor = rgba(shRGB, sh[0]); X.shadowBlur = 2 * sh[1] * S; X.shadowOffsetX = OFF * S; X.shadowOffsetY = sh[2] * S;
          X.drawImage(B.scratch, bx - OFF * S, by);
        }
        X.shadowColor = 'rgba(0,0,0,0)'; X.shadowBlur = 0; X.shadowOffsetX = 0; X.shadowOffsetY = 0;
        X.drawImage(B.scratch, bx, by);
        X.restore(); drewOver = true;
        maxA = Math.max(maxA, Math.min(1, alive / 400) * km);
      }
      // grains
      X.save();
      for (const g of B.grains) {
        const tb = td + g.d * ds.dur;
        const a = t - tb;
        if (a <= 0 || a >= g.life) continue;
        const k = a / g.life;
        const tur = ds.turb;
        const px = g.x + g.vx * a + 0.5 * 26 * a * a + tur * a * Math.sin(g.fq * 2.1 * a + g.ph);
        const py = g.y + g.vy * a - 0.5 * 18 * a * a + tur * 0.7 * a * Math.cos(g.fq * 2.7 * a + g.ph2);
        let al = Math.pow(1 - k, 1.5) * 0.92 * clamp(a / 0.05) * km;
        const s = g.s * (1 - 0.45 * k);
        X.fillStyle = rgba([st.color[0] * g.b, st.color[1] * g.b, st.color[2] * g.b].map(v => Math.min(255, v | 0)), al);
        X.fillRect(px - s / 2, py - s / 2, s, s);
        drewOver = true;
      }
      X.restore();
    }
    if (maxA > 0) {
      BOXES.push([line.x0, line.cy - L.capH / 2, line.x0 + line.w, line.cy + L.capH / 2, maxA * (st.legibility || 1)]);
      allA = Math.max(allA, maxA);
      KWBOXES.push([...line.ink.slice(0, 4), maxA]);
    }
  }
  if (!ungated && scr * allA > 0.001) {
    // 'box' (layout px) pins the scrim to a fixed region, so two elements (the cold words, then the '?') share
    // one steady patch of shade instead of handing over between two differently placed ones
    const ls = L.lines;
    const bb = el.scrim.box || [Math.min(...ls.map(l => l.x0)), ls[0].cy - L.capH / 2,
      Math.max(...ls.map(l => l.x0 + l.w)), ls[ls.length - 1].cy + L.capH / 2];
    BOXES.push(scrimBox(el.scrim, bb, scr * Math.min(1, allA)));
  }
}

// ================================================================== CALLOUTS
/* Callout choreography (seconds relative to sync = dot lands / UI tick, and to out = fully gone):
 * ring + dot land, the leader grows out of the ring, the shelf grows from the elbow, the label is wiped on
 * from the elbow outward right behind the shelf head (never ahead of its line). Text is complete at
 * sync + 0.36 s and starts leaving at out - 0.22 s (overlays.py callout_legibility mirrors these numbers). */
function calloutPhases(t, ts, to) {
  const on = (a, b) => eInOutCubic(lin(t, ts + a, ts + b));
  const off = (a, b) => 1 - eInOutCubic(lin(t, to + a, to + b));
  return {
    ring: on(-0.10, 0.10) * off(-0.10, 0.0),
    ringR: eOutCubic(lin(t, ts - 0.10, ts + 0.12)),
    dot: eOutCubic(lin(t, ts - 0.04, ts + 0.05)) * off(-0.06, 0.0),
    diag: on(0.0, 0.13), diagOff: lin(t, to - 0.14, to - 0.04),
    shelf: on(0.08, 0.26), shelfOff: lin(t, to - 0.20, to - 0.09),
    prim: lin(t, ts + 0.10, ts + 0.32), sec: lin(t, ts + 0.15, ts + 0.38),
    text: off(-0.22, -0.10),
    flash: t >= ts ? Math.exp(-(t - ts) / 0.22) : 0,
  };
}

function labelBlock(prim, sec, secWeight) {
  const st = TL.styles.callout;
  const P = prim ? layoutRun(prim, st.primary.family, st.primary.weight, st.primary.size, st.primary.tracking) : null;
  const Q = sec ? layoutRun(sec, st.secondary.family, secWeight || st.secondary.weight, st.secondary.size, st.secondary.tracking) : null;
  return { P, Q, w: Math.max(P ? P.w : 0, Q ? Q.w : 0) };
}

/** Draw a run with a soft left-to-right (or right-to-left) wipe; x is the run's left edge. */
function drawRunWipe(run, x, y, rgb, alpha, wipeX, dir, soft, shadow) {
  if (alpha < 0.003) return;
  setFont(X, run.fam, run.wt, run.size);
  const items = [];
  for (const c of run.chars) {
    if (c.ch === ' ') continue;
    const gx = x + c.x;
    const k = dir > 0 ? clamp((wipeX - gx) / soft) : clamp((gx + run.size * 0.55 - wipeX) / soft);
    if (k <= 0) continue;
    items.push([c.ch, gx, k]);
  }
  if (shadow) for (const [ch, gx, k] of items) glyphShadow(X, ch, gx, y, alpha * k * shadow[0], shadow[1], shadow[2]);
  for (const [ch, gx, k] of items) glyph(X, ch, gx, y, rgb, alpha * k, 0);
}

function drawCalloutCore(el, f, t, prim, sec, opts = {}) {
  const st = TL.styles.callout;
  const ts = el.sync, to = el.out;
  if (t < ts - 0.12 || t > to) return;
  const ph = calloutPhases(t, ts, to);
  const p = tk(el.trk, f);
  const vis = p.v;
  if (vis < 0.003) return;
  const lb = opts.block || labelBlock(prim, sec, el.secondary_weight);
  const secA = el.secondary_alpha !== undefined ? el.secondary_alpha : st.secondary.alpha;   // per-callout overrides
  const txtSh = el.text_shadow || st.text_shadow;
  const pad = st.pad;
  const shelf = lb.w + 2 * pad;
  const capP = lb.P ? lb.P.capH : 0, capQ = lb.Q ? lb.Q.capH : 0;
  const hAbove = st.text_gap + capP + 6, hBelow = lb.Q ? st.text_gap + capQ + 10 : 6;
  const Ld = (el.leader || st.leader) * 0.7071;
  let ex = p.xs + el.sx * Ld, ey = p.ys + el.sy * Ld;
  const sf = TL.safe;
  let bx0 = el.sx > 0 ? ex : ex - shelf, bx1 = bx0 + shelf;
  if (bx0 < sf.x0) ex += sf.x0 - bx0; else if (bx1 > sf.x1) ex -= bx1 - sf.x1;
  if (ey - hAbove < sf.y0) ey = sf.y0 + hAbove; else if (ey + hBelow > sf.y1) ey = sf.y1 - hBelow;
  const r = st.ring * (0.62 + 0.38 * ph.ringR);
  const px = p.x, py = p.y;
  // leader: from the ring edge to the elbow
  const vx = ex - px, vy = ey - py, vl = Math.hypot(vx, vy) || 1;
  const sx0 = px + vx / vl * (st.ring + st.gap), sy0 = py + vy / vl * (st.ring + st.gap);
  const dOn = ph.diag, dOff = ph.diagOff;            // line grows from the ring, retracts toward the ring
  const dA = dOn, dB = 1 - dOff;
  const a = vis;
  const ringStart = -Math.PI / 2 + 0.35;
  // ring + dot
  if (ph.ring > 0.002) {
    const k = ph.ring;
    const build = (c, o) => { c.arc(px + o, py, r, ringStart, ringStart + k * Math.PI * 2 * 0.999); };
    premiumStroke(build, st.line, a, st, 1 + 1.5 * ph.flash);
  }
  if (ph.dot > 0.002) {
    fillCircle(X, px, py + 1, st.dot * ph.dot + 1.6, [0, 0, 0], a * 0.25);
    fillCircle(X, px, py, st.dot * ph.dot, st.color, a * 0.98);
    glowDot(A, px, py, 14 + 10 * ph.flash, st.glow, a * (0.35 + 0.55 * ph.flash) * ph.dot);
  }
  // diagonal
  const dlen = Math.hypot(ex - sx0, ey - sy0);
  if (dA > 0.002 && dB > 0.002 && dlen > 2) {
    const u0 = 0, u1 = Math.min(dA, dB);
    const build = (c, o) => { c.moveTo(sx0 + o + (ex - sx0) * u0, sy0 + (ey - sy0) * u0); c.lineTo(sx0 + o + (ex - sx0) * u1, sy0 + (ey - sy0) * u1); };
    premiumStroke(build, st.line, a, st);
  }
  // shelf
  const shK = Math.min(ph.shelf, 1 - ph.shelfOff);
  if (shK > 0.002) {
    const x1 = ex + el.sx * shelf * shK;
    const build = (c, o) => { c.moveTo(ex + o, ey); c.lineTo(x1 + o, ey); };
    premiumStroke(build, st.line, a, st);
    if (ph.shelf < 1) glowDot(A, x1, ey, 9, st.glow, a * 0.5 * (1 - ph.shelf));
  }
  // labels: wiped on from the elbow outward, gated by the shelf head (the text never runs ahead of its line)
  const ta = ph.text * a;
  const tx = el.sx > 0 ? ex + pad : ex - pad - lb.w;
  const prY = ey - st.text_gap, seY = ey + st.text_gap + capQ;
  const head = ex + el.sx * shelf * ph.shelf;            // where the growing shelf has got to
  const SOFT = 36;
  const wipeAt = (prog, w) => {
    if (el.sx > 0) return Math.min(lerp(tx - SOFT, tx + w + SOFT, prog), head + SOFT * 0.5);
    return Math.max(lerp(tx + lb.w + SOFT, tx + lb.w - w - SOFT, prog), head - SOFT * 0.5);
  };
  if (lb.P && ph.prim > 0 && ta > 0.003) {
    const prog = eOutCubic(ph.prim);
    const slide = (1 - prog) * 10 * el.sx;
    const px0 = el.sx > 0 ? tx : tx + lb.w - lb.P.w;     // right-aligned to the elbow on the left side
    if (opts.drawPrimary) opts.drawPrimary(tx - slide, prY, ta, prog);
    else drawRunWipe(lb.P, px0 - slide, prY, st.color, ta, wipeAt(prog, lb.P.w), el.sx, SOFT, txtSh);
  }
  if (lb.Q && ph.sec > 0 && ta > 0.003) {
    const prog = eOutCubic(ph.sec);
    const slide = (1 - prog) * 8 * el.sx;
    const qx0 = el.sx > 0 ? tx : tx + lb.w - lb.Q.w;
    drawRunWipe(lb.Q, qx0 - slide, seY, st.color, ta * secA, wipeAt(prog, lb.Q.w), el.sx, SOFT, txtSh);
  }
  // optional per-callout scrim (overlays.json callout "scrim": k): a soft, NOT luma-gated vignette behind the label
  // for a label on a flat bright plate (the luma-gated local darkening backs off on flat backgrounds). A callout
  // with a scrim eases the scrim AND its local box in with the ring + label reveal (smoothstep over sync - 0.04 ..
  // 0.46 s; the label wipes on over sync + 0.10 .. 0.38) and out over the last 0.31 s (across the text exit,
  // out - 0.22 .. - 0.10), so the darkening never pops on or off in a frame
  let bw = ta;
  if (el.scrim) bw = a * smooth(lin(t, ts - 0.04, ts + 0.46)) * (1 - smooth(lin(t, to - 0.31, to)));
  if (bw > 0.05) BOXES.push([tx - 6, prY - capP - 4, tx + lb.w + 6, lb.Q ? seY + 6 : prY + 6, 0.6 * bw, 1]);
  if (el.scrim && bw * el.scrim > 0.001) BOXES.push([tx - 6, prY - capP - 4, tx + lb.w + 6, lb.Q ? seY + 6 : prY + 6, 0, 0, el.scrim * bw]);
}

function drawCallout(el, f, t) { drawCalloutCore(el, f, t, el.primary, el.secondary); }

// ------------------------------------------------------------------ live counter (sh10)
function fmtTR(n) {                  // Turkish thousands grouping with dots
  const s = Math.max(0, Math.floor(n)).toString();
  let out = '';
  for (let i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) out += '.'; out += s[i]; }
  return out;
}
/** Free-standing counter: big light tabular numerals, caption below; crossfades to the rounded figure on landing. */
function drawCounterFree(el, f, t) {
  if (t < el.t0 - 0.05 || t > el.out) return;
  const st = TL.styles.callout;
  const fam = 'Inter Display', wt = 300, size = 66, trk = 0.02;
  const p = clamp((t - el.t0) / (el.land - el.t0));
  const L1 = Math.log10(el.count_to), L0 = Math.log10(Math.max(1, el.count_from));
  const lg = L0 + (L1 - L0) * (0.12 * p + 0.88 * p * p);
  const val = p >= 1 ? el.count_to : Math.pow(10, lg);
  const numStr = fmtTR(val);
  const aIn = eOutCubic(lin(t, el.t0, el.t0 + 0.45)), aOut = 1 - eInOutCubic(lin(t, el.out - 0.4, el.out));
  const a = aIn * aOut;
  if (a < 0.003) return;
  const rise = (1 - eOutCubic(lin(t, el.t0, el.t0 + 0.6))) * 14;
  // landing, in sequence (never a double exposure): on the tick the running number lifts away and fades
  // (0.12 s), then the rounded figure rises in with a short glint
  const qOut = clamp((t - el.land) / 0.12), qIn = clamp((t - el.land - 0.10) / 0.30);
  const land = eOutCubic(qIn);
  setFont(X, fam, wt, size);
  const dW = Math.max(...'0123456789'.split('').map(d => X.measureText(d).width)) + trk * size;
  const dotW = X.measureText('.').width + trk * size;
  const numW = [...numStr].reduce((s2, c) => s2 + (c === '.' ? dotW : dW), 0) - trk * size;
  const cx = el.x, base = el.y + rise;
  const sh = [0.5, 12, 2];
  const aNum = a * (1 - eInQuad(qOut));
  if (aNum > 0.003) {
    const nb = base - 16 * eInQuad(qOut);
    let x = cx - numW / 2;
    const items = [];
    for (const c of numStr) { const w = c === '.' ? dotW : dW; items.push([c, x + (w - trk * size - X.measureText(c).width) / 2]); x += w; }
    for (const [c, gx] of items) glyphShadow(X, c, gx, nb, aNum * sh[0], Math.hypot(sh[1], 3 * qOut), sh[2]);
    for (const [c, gx] of items) glyph(X, c, gx, nb, st.color, aNum, 2.5 * qOut);
  }
  const fin = layoutRun(el.final, fam, wt, size, trk);
  const aFin = a * eOutCubic(clamp(qIn / 0.7));
  let capH = fin.capH;
  if (aFin > 0.003) {
    const fb = base + 12 * (1 - land);
    const fx = cx - fin.w / 2;
    setFont(X, fam, wt, size);
    const items = fin.chars.filter(c => c.ch !== ' ').map(c => [c.ch, fx + c.x]);
    const bl = 3 * (1 - eOutCubic(clamp(qIn / 0.6)));
    for (const [c, gx] of items) glyphShadow(X, c, gx, fb, aFin * sh[0], Math.hypot(sh[1], bl), sh[2]);
    for (const [c, gx] of items) glyph(X, c, gx, fb, st.color, aFin, bl);
    const g = t >= el.land + 0.12 ? Math.exp(-(t - el.land - 0.12) / 0.4) : 0;
    setFont(A, fam, wt, size);
    for (const [c, gx] of items) glyph(A, c, gx, fb, st.glow, aFin * 0.6 * g, 0);
  }
  // caption + hairline
  const unit = layoutRun(el.unit, st.secondary.family, st.secondary.weight, 30, 0.04);
  const uy = base + 22 + unit.capH + 14;
  const ua = a * st.secondary.alpha * eOutCubic(lin(t, el.t0 + 0.15, el.t0 + 0.6));
  const rw = Math.max(numW * (1 - land) + fin.w * land, 120) * 0.42;
  const ry = base + 22;
  strokeGlow(X, (c, o) => { c.moveTo(cx - rw / 2 + o, ry); c.lineTo(cx + rw / 2 + o, ry); }, 1.5, [0, 0, 0], ua * 0.6, 4, 1);
  strokeSolid(X, (c, o) => { c.moveTo(cx - rw / 2 + o, ry); c.lineTo(cx + rw / 2 + o, ry); }, 1.5, st.color, ua * 0.8);
  drawRunWipe(unit, cx - unit.w / 2, uy, st.color, ua, 1e9, 1, 30, st.text_shadow);
  BOXES.push([cx - Math.max(numW, fin.w) / 2 - 10, base - capH - 8, cx + Math.max(numW, fin.w) / 2 + 10, uy + 8, 0.7 * a, 1]);
}

function drawCounter(el, f, t) {
  if (el.mode === 'free') return drawCounterFree(el, f, t);
  const st = TL.styles.callout;
  const pS = st.primary;
  const p = clamp((t - el.t0) / (el.land - el.t0));
  const L1 = Math.log10(el.count_to), L0 = Math.log10(Math.max(1, el.count_from));
  const lg = L0 + (L1 - L0) * (0.12 * p + 0.88 * p * p);
  const val = p >= 1 ? el.count_to : Math.pow(10, lg);
  const numStr = fmtTR(val);
  // tabular figures: fixed advance per digit
  setFont(X, pS.family, pS.weight, pS.size);
  const dW = Math.max(...'0123456789'.split('').map(d => X.measureText(d).width)) + pS.tracking * pS.size;
  const dotW = X.measureText('.').width + pS.tracking * pS.size;
  const numW = [...numStr].reduce((s, c) => s + (c === '.' ? dotW : dW), 0) - pS.tracking * pS.size;
  const fin = layoutRun(el.final, pS.family, pS.weight, pS.size, pS.tracking);
  const land = clamp((t - el.land) / 0.22);
  const unit = layoutRun(el.unit, st.secondary.family, st.secondary.weight, st.secondary.size, st.secondary.tracking);
  const wP = lerp(numW, fin.w, eInOutCubic(land));
  const block = { P: { w: wP, capH: fin.capH, size: pS.size }, Q: unit, w: Math.max(wP, unit.w) };
  const opts = {
    block,
    drawPrimary: (x, y, a, prog) => {
      const aNum = a * (1 - land) * prog, aFin = a * land;
      if (aNum > 0.003) {
        setFont(X, pS.family, pS.weight, pS.size);
        let cx = el.sx > 0 ? x : x + wP - numW;
        const items = [];
        for (const c of numStr) {
          const w = c === '.' ? dotW : dW;
          const gw = X.measureText(c).width;
          items.push([c, cx + (w - pS.tracking * pS.size - gw) / 2]);
          cx += w;
        }
        for (const [c, gx] of items) glyphShadow(X, c, gx, y, aNum * st.text_shadow[0], st.text_shadow[1], st.text_shadow[2]);
        for (const [c, gx] of items) glyph(X, c, gx, y, st.color, aNum, 0);
      }
      if (aFin > 0.003) {
        const scl = 1 + 0.06 * (1 - eOutCubic(land));
        const fx = el.sx > 0 ? x : x + wP - fin.w;
        setFont(X, pS.family, pS.weight, pS.size * scl);
        const items = fin.chars.filter(c => c.ch !== ' ').map(c => [c.ch, fx + c.x * scl]);
        for (const [c, gx] of items) glyphShadow(X, c, gx, y, aFin * st.text_shadow[0], st.text_shadow[1], st.text_shadow[2]);
        for (const [c, gx] of items) glyph(X, c, gx, y, st.color, aFin, 0);
        // a short light glint on landing
        const g = Math.exp(-Math.max(0, t - el.land) / 0.35) * (t >= el.land ? 1 : 0);
        setFont(A, pS.family, pS.weight, pS.size * scl);
        for (const [c, gx] of items) glyph(A, c, gx, y, st.glow, aFin * 0.55 * g, 0);
      }
    },
  };
  drawCalloutCore({ ...el, sync: el.t0 }, f, t, null, null, opts);
}

// ------------------------------------------------------------------ ECG corner widget (sh06)
function ecgWave(tau) {             // tau = seconds relative to an R peak; amplitude ~[-0.3, 1]
  const g = (m, s, a) => a * Math.exp(-0.5 * Math.pow((tau - m) / s, 2));
  return g(-0.19, 0.028, 0.11) + g(-0.032, 0.009, -0.10) + g(0, 0.0105, 1.0) + g(0.027, 0.011, -0.26) + g(0.24, 0.048, 0.25) + g(0.40, 0.03, 0.02);
}
function ecgAt(el, tt) {
  const k = Math.round((tt - el.beat_anchor) / el.period);
  let v = 0;
  for (let j = k - 1; j <= k + 1; j++) v += ecgWave(tt - (el.beat_anchor + j * el.period));
  return v;
}
function drawECG(el, f, t) {
  const st = TL.styles.callout;
  const ts = el.sync, to = el.out;
  if (t < ts - 0.05 || t > to) return;
  const aIn = eOutCubic(lin(t, ts, ts + 0.45)), aOut = 1 - eInOutCubic(lin(t, to - 0.35, to));
  const a = aIn * aOut;
  if (a < 0.003) return;
  const x0 = el.x, y0 = el.y;
  const P = layoutRun(el.primary, st.primary.family, st.primary.weight, 34, 0.01);
  const Q = layoutRun(el.secondary, st.secondary.family, st.secondary.weight, 25, 0.015);
  // pulse dot (beats with the R peak)
  const kb = Math.floor((t - el.beat_anchor) / el.period);
  const tR = el.beat_anchor + kb * el.period;
  const pulse = Math.exp(-(t - tR) / 0.16);
  const dotX = x0 + 7, dotY = y0 + 30 - P.capH / 2 + 2;
  const red = [255, 92, 84];
  fillCircle(X, dotX, dotY, 5.5 + 2.5 * pulse, red, a * 0.95);
  glowDot(A, dotX, dotY, 18 + 16 * pulse, red, a * (0.35 + 0.5 * pulse));
  // labels (wipe in)
  const wp = lerp(x0 + 10, x0 + 30 + P.w + 60, eOutCubic(lin(t, ts + 0.05, ts + 0.45)));
  drawRunWipe(P, x0 + 24, y0 + 30, st.color, a, wp, 1, 30, st.text_shadow);
  const wq = lerp(x0 + 10, x0 + 30 + Q.w + 60, eOutCubic(lin(t, ts + 0.15, ts + 0.6)));
  drawRunWipe(Q, x0 + 24, y0 + 30 + 14 + Q.capH + 6, st.color, a * st.secondary.alpha, wq, 1, 30, st.text_shadow);
  // trace: classic monitor sweep with a fading trail and an erase gap ahead of the head
  const gx = x0 + 2, gy = y0 + 92, gw = el.width, gh = el.height;
  const speed = gw / el.sweep_s;
  const run = t - ts;
  const head = (run * speed) % gw;
  const wraps = Math.floor(run * speed / gw);
  const step = 1.5;
  const pts = [];
  for (let xx = 0; xx <= gw; xx += step) {
    let age = (head - xx) / speed;
    if (age < 0) { if (wraps === 0) continue; age += gw / speed; }
    if (age > el.sweep_s - 0.12) continue;                  // erase gap ahead of the head
    const tt = t - age;
    const v = ecgAt(el, tt);
    pts.push([gx + xx, gy + gh * 0.62 - v * gh * 0.78, age]);
  }
  // draw as short segments with alpha by age
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    if (Math.abs(pts[i][2] - pts[i - 1][2]) > 0.2) continue;
    segs.push([pts[i - 1], pts[i]]);
  }
  const col = [255, 236, 230];
  // baseline hint
  strokeSolid(X, (c, o) => { c.moveTo(gx + o, gy + gh * 0.62); c.lineTo(gx + gw + o, gy + gh * 0.62); }, 1, col, a * 0.10);
  const NB = 10, buckets = Array.from({ length: NB }, () => []);
  for (const sg of segs) {
    const fade = Math.pow(1 - clamp(sg[1][2] / el.sweep_s), 1.3);
    buckets[Math.min(NB - 1, Math.floor(fade * NB))].push(sg);
  }
  buckets.forEach((bk, bi) => {
    if (!bk.length) return;
    const fade = (bi + 0.5) / NB;
    const al = a * (0.18 + 0.82 * fade);
    const build = (c, o) => { for (const [p0, p1] of bk) { c.moveTo(p0[0] + o, p0[1]); c.lineTo(p1[0] + o, p1[1]); } };
    strokeGlow(X, build, 2, [0, 0, 0], al * 0.35, 3, 1);
    strokeSolid(X, build, 2, col, al * 0.95);
    strokeGlow(A, build, 2, red, al * 0.55 * fade, 5);
  });
  // head
  const hv = ecgAt(el, t);
  const hx = gx + head, hy = gy + gh * 0.62 - hv * gh * 0.78;
  fillCircle(X, hx, hy, 2.6, [255, 255, 255], a);
  glowDot(A, hx, hy, 16, [255, 160, 140], a * 0.8);
  BOXES.push([x0 - 4, y0, x0 + Math.max(gw, P.w + 30), gy + gh + 4, 0.5 * a, 1]);
}

// ------------------------------------------------------------------ network (sh12)
function bezQ(a, c, b, u) { const v = 1 - u; return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]; }
function polyPath(pts) { return (c, o) => { pts.forEach((p, i) => (i ? c.lineTo(p[0] + o, p[1]) : c.moveTo(p[0] + o, p[1]))); }; }

function drawNetwork(el, f, t) {
  const st = TL.styles.callout;
  if (t > el.out) return;
  const aOut = 1 - eInOutCubic(lin(t, el.out - 0.6, el.out));
  const nodes = el.nodes.map(n => ({ ...n, p: tk(n.trk, f) }));
  const byName = Object.fromEntries(nodes.map(n => [n.name, n]));
  const C = byName[el.center].p;
  // the point of light the lines converge on: offset from the centre node (above the sun, between it and the
  // words), so the sun stays one of the provisions pointing up to the One light rather than being the light
  const off = el.converge.to_offset || [0, 0];
  const Cp = [C.x + off[0], C.y + off[1]];
  const conv0 = el.converge.t0, cdur = el.converge.dur, cstag = el.converge.stagger;
  const warm = [255, 240, 214], gold = [255, 206, 140];
  const lineW = 2;
  const chainFade = 1;
  // edges
  el.edges.forEach((e, k) => {
    const A0 = byName[e.a].p, B0 = byName[e.b].p;
    if (t < e.t0) return;
    const u = eInOutSine(lin(t, e.t0, e.t1));
    const m = eInOutCubic(lin(t, conv0 + k * cstag, conv0 + k * cstag + cdur));
    const a = [A0.x, A0.y], b0 = [B0.x, B0.y];
    const len = Math.hypot(b0[0] - a[0], b0[1] - a[1]) || 1;
    const nx = -(b0[1] - a[1]) / len, ny = (b0[0] - a[0]) / len;
    const bend = (k % 2 ? -1 : 1) * 0.16 * len;
    const c0 = [(a[0] + b0[0]) / 2 + nx * bend, (a[1] + b0[1]) / 2 + ny * bend];
    // converge target: from this edge's start node straight up and into the light
    const b1 = Cp;
    const c1 = [a[0] + (Cp[0] - a[0]) * 0.12, Cp[1] + (a[1] - Cp[1]) * 0.42];
    const b = [lerp(b0[0], b1[0], m), lerp(b0[1], b1[1], m)];
    const c = [lerp(c0[0], c1[0], m), lerp(c0[1], c1[1], m)];
    let alpha = aOut * Math.min(A0.v, lerp(B0.v, 1, m));
    if (e.collapse) alpha *= 1 - smooth(m);
    if (alpha < 0.003) return;
    const N = 48, pts = [];
    for (let i = 0; i <= N; i++) { const uu = (i / N) * u; pts.push(bezQ(a, c, b, uu)); }
    premiumStroke(polyPath(pts), lineW, alpha * chainFade, { ...st, color: warm, glow: [...gold, 0.45, 6] }, 1);
    // spark at the drawing head
    if (u > 0 && u < 1) { const hp = pts[pts.length - 1]; glowDot(A, hp[0], hp[1], 22, gold, alpha * 0.9); fillCircle(X, hp[0], hp[1], 2.4, [255, 255, 255], alpha); }
    // light pulses travelling into the source after the convergence
    if (m >= 1 && !e.collapse) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let q = 0; q < 2; q++) {
        const ph = ((t - (conv0 + cdur) + q * 0.9 + k * 0.37) / 1.8) % 1;
        if (ph < 0) continue;
        const pp = bezQ(a, c, b, eInQuad(ph));
        glowDot(A, pp[0], pp[1], 16, gold, alpha * 0.55 * Math.sin(Math.PI * ph));
      }
    }
  });
  // extra rising line for the last node (it has no outgoing chain edge)
  if (el.extra) {
    const n = byName[el.extra].p;
    const k = el.edges.length;
    const m = eInOutCubic(lin(t, conv0 + k * cstag, conv0 + k * cstag + cdur));
    if (m > 0) {
      const a = [n.x, n.y], c1 = [a[0] + (Cp[0] - a[0]) * 0.12, Cp[1] + (a[1] - Cp[1]) * 0.42];
      const pts = []; for (let i = 0; i <= 48; i++) pts.push(bezQ(a, c1, Cp, (i / 48) * m));
      const alpha = aOut * n.v;
      premiumStroke(polyPath(pts), lineW, alpha, { ...st, color: warm, glow: [...gold, 0.45, 6] }, 1);
      if (m < 1) { const hp = pts[pts.length - 1]; glowDot(A, hp[0], hp[1], 22, gold, alpha * 0.9); }
    }
  }
  // nodes: ring + dot + small caps label when the line reaches them
  for (const n of nodes) {
    if (t < n.t_on - 0.08) continue;
    const k = eOutCubic(lin(t, n.t_on - 0.08, n.t_on + 0.22));
    const flash = t >= n.t_on ? Math.exp(-(t - n.t_on) / 0.25) : 0;
    const conv = eInOutCubic(lin(t, conv0, conv0 + cdur + cstag * 5));
    let a = aOut * n.p.v;
    if (n.name === el.center && !el.converge.center_line) a *= 1 - conv;   // (legacy: the source became the light)
    if (a < 0.003) continue;
    // 'center_node' (the sun): it stays a named provision node through the convergence, under the light it points
    // to: full-size ring (the other rings shrink 35 %), its label kept, and its own small warm glow
    const keep = el.center_node && n.name === el.center ? el.center_node : null;
    const r = 9 * (0.6 + 0.4 * k) * (keep && keep.ring ? 1 : 1 - 0.35 * conv);
    const build = (c, o) => c.arc(n.p.x + o, n.p.y, r, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2 * 0.999);
    premiumStroke(build, 1.8, a, { ...st, color: warm, glow: [...gold, 0.4, 5] }, 1 + flash);
    fillCircle(X, n.p.x, n.p.y, 2.8 * k, [255, 255, 255], a);
    glowDot(A, n.p.x, n.p.y, 18 + 14 * flash, gold, a * (0.3 + 0.6 * flash));
    if (keep && keep.glow) glowDot(A, n.p.x, n.p.y, keep.glow[0], [255, 214, 160], a * k * keep.glow[1]);
    if (el.labels && n.label) {
      const lf = keep && keep.label ? 1 : 1 - eInOutCubic(lin(t, conv0, conv0 + 0.5));
      const la = a * eOutCubic(lin(t, n.t_on + 0.05, n.t_on + 0.4)) * lf;
      if (la > 0.003) {
        const run = layoutRun(upperTR(n.label), 'Inter', 600, 27, 0.12);
        const side = keep && keep.label_side ? keep.label_side : (n.p.x > W / 2 ? -1 : 1);   // the sun's label never flips
        const lx = side > 0 ? n.p.x + 18 : n.p.x - 18 - run.w, ly = n.p.y + run.capH / 2;
        drawRunWipe(run, lx, ly, [255, 246, 232], la * 0.9, side > 0 ? lx + run.w + 40 : lx - 40, side, 30, [0.55, 6, 1]);
      }
    }
  }
  // the single point of light
  const tl = el.light_t;
  if (t >= tl - 0.25) {
    const k = eOutCubic(lin(t, tl - 0.25, tl + 0.35));
    const flash = t >= tl ? Math.exp(-(t - tl) / 0.45) : 0;
    const breathe = 1 + 0.08 * Math.sin(2 * Math.PI * (t - tl) / 3.2);
    const a = aOut * k;
    const G = (el.light && el.light.glow) || 120, RR = (el.light && el.light.ring) || 150;
    // the 'tek' flash: outer glow grows by FL[0] * G, the core by FL[1] px (light.flash; legacy [1, 30])
    const FL = (el.light && el.light.flash) || [1, 30];
    glowDot(A, Cp[0], Cp[1], G * breathe + FL[0] * G * flash, gold, a * (0.30 + 0.35 * flash));
    glowDot(A, Cp[0], Cp[1], 42 * breathe + FL[1] * flash, [255, 236, 200], a * (0.7 + 0.3 * flash));
    fillCircle(X, Cp[0], Cp[1], 3.6 * k, [255, 255, 255], a);
    // one expanding ring of light at the moment of 'tek'
    if (t >= tl && t < tl + 1.2) {
      const q = (t - tl) / 1.2;
      const rr = 18 + RR * eOutCubic(q);
      const build = (c, o) => c.arc(Cp[0] + o, Cp[1], rr, 0, Math.PI * 2);
      strokeSolid(A, build, 2, gold, a * 0.55 * (1 - q) * (1 - q));
      strokeGlow(A, build, 2, gold, a * 0.35 * (1 - q), 6);
    }
  }
}

// ------------------------------------------------------------------ tracking rings (sh13b)
function drawRings(el, f, t) {
  const st = TL.styles.callout;
  const R0 = el.radius;
  for (const rg of el.rings) {
    const tl = rg.land, to = rg.out;
    if (t < tl - 0.2 || t > to) continue;
    const p = tk(rg.trk, f);
    const k = eInOutCubic(lin(t, tl - 0.18, tl + 0.04));
    const off = eInOutCubic(lin(t, to - 0.3, to));
    const a = p.v * (1 - off);
    if (a < 0.003) continue;
    const flash = t >= tl ? Math.exp(-(t - tl) / 0.25) : 0;
    const breathe = rg.final ? 1 + 0.035 * Math.sin(2 * Math.PI * (t - tl) / 2.2) : 1;
    const r = R0 * (rg.final ? 1.15 : 1) * (0.78 + 0.22 * eOutCubic(lin(t, tl - 0.18, tl + 0.12))) * breathe * (1 + 0.15 * off);
    const rot = -Math.PI / 2 + (1 - eOutCubic(lin(t, tl - 0.18, tl + 0.25))) * 0.9;
    const build = (c, o) => c.arc(p.x + o, p.y, r, rot, rot + k * (1 - off * 0.0) * Math.PI * 2 * 0.999);
    premiumStroke(build, 2, a, st, 1 + 1.6 * flash);
    // four tiny ticks lock in (rotate + slide in) as the ring lands
    const tk4 = eOutCubic(lin(t, tl - 0.02, tl + 0.2));
    if (tk4 > 0.002) {
      const trot = (1 - tk4) * 0.6 + Math.PI / 4;
      for (let q = 0; q < 4; q++) {
        const ang = trot + q * Math.PI / 2;
        const r1 = r + 5 + (1 - tk4) * 8, r2 = r1 + 7;
        const bt = (c, o) => { c.moveTo(p.x + o + Math.cos(ang) * r1, p.y + Math.sin(ang) * r1); c.lineTo(p.x + o + Math.cos(ang) * r2, p.y + Math.sin(ang) * r2); };
        premiumStroke(bt, 2, a * tk4, st);
      }
    }
    // a soft 'found it' ping
    if (t >= tl && t < tl + 0.55) {
      const q = (t - tl) / 0.55;
      const rr = r * (1 + 0.9 * eOutCubic(q));
      strokeSolid(A, (c, o) => c.arc(p.x + o, p.y, rr, 0, Math.PI * 2), 1.5, st.glow, a * 0.5 * (1 - q) * (1 - q));
    }
    glowDot(A, p.x, p.y, r * 0.5, st.glow, a * 0.25 * flash);
  }
}

// ------------------------------------------------------------------ Fibonacci / Vogel spiral (sh14a)
/* Parastichies of Vogel's model: florets n = j + m*F (family F, arm j) sit at angle j*GA + m*delta_F with
   delta_F = F*GA (mod 2pi) small, so each arm is the smooth curve n(s) = j + s*F, th(s) = j*GA + s*delta_F,
   r(s) = c*sqrt(n(s)) passing exactly through its florets. With tracks/sh14a_disc.json the curve is projected
   through the shot's own camera + head transform (exact matchmove); otherwise centred on TRK_spiral. */
function drawSpiral(el, f, t) {
  if (t < el.t0 - 0.05 || t > el.out) return;
  const p = tk(el.trk, f);
  if (p.v < 0.003) return;
  const GA = 137.50776405 * Math.PI / 180;
  let proj = null;
  if (el.proj) { const i = f - el.proj.f0; if (i >= 0 && i < el.proj.m.length) proj = el.proj.m[i]; }
  const cPx = el.k_px_m / Math.max(1e-4, p.d);
  const rot = (el.rot_deg || 0) * Math.PI / 180;
  let ctr = [p.x, p.y];
  const mapPt = (n, th) => {
    if (proj) {
      const c = el.proj.c, R = el.proj.R, dome = el.proj.dome || 0;
      const r = c * Math.sqrt(n);
      const lx = r * Math.cos(th), ly = r * Math.sin(th), lz = dome * (1 - (r / R) * (r / R));
      const m = proj;
      const hw = m[8] * lx + m[9] * ly + m[10] * lz + m[11];
      return [(m[0] * lx + m[1] * ly + m[2] * lz + m[3]) / hw, (m[4] * lx + m[5] * ly + m[6] * lz + m[7]) / hw];
    }
    const r = cPx * Math.sqrt(n);
    return [p.x + r * Math.cos(th + rot), p.y + r * Math.sin(th + rot)];
  };
  if (proj) ctr = mapPt(0, 0);
  // the annulus where the drawn families are the eye's contact parastichies (21/34: n ~ 60..300)
  const nA = el.n_band ? el.n_band : [34, 70, 250, 430];
  const rOf = n => { let acc = 0; for (let k = 0; k < 6; k++) { const q = mapPt(n, k * 1.047 + 0.3); acc += Math.hypot(q[0] - ctr[0], q[1] - ctr[1]); } return acc / 6; };
  const rB = nA.map(rOf);
  // on-screen floret spacing: the pattern is only drawn while florets are big enough to read
  const q1 = mapPt(150, 150 * GA), q2 = mapPt(150 + el.families[0], (150 + el.families[0]) * GA);
  const spacing = Math.hypot(q1[0] - q2[0], q1[1] - q2[1]);
  // the pattern lives as long as the florets read on screen (it survives well into the camera's pull-back)
  const ms = el.min_spacing || [8, 16];
  const scaleFade = smooth(clamp((spacing - ms[0]) / (ms[1] - ms[0])));
  const fadeOut = 1 - eInOutCubic(lin(t, el.fade0, el.out));
  const aGlob = p.v * fadeOut * scaleFade * eOutCubic(lin(t, el.t0 - 0.05, el.t0 + 0.3));
  if (aGlob < 0.003) return;
  const famCols = [[255, 212, 138], [255, 244, 222]];
  const famA = [0.66, 0.46];
  const mkGrad = (ctx, col, a) => {
    const R = Math.max(rB[3], 1);
    const g = ctx.createRadialGradient(ctr[0], ctr[1], 0, ctr[0], ctr[1], R);
    const st = x => clamp(x / R, 0, 1);
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(st(rB[0]), rgba(col, 0));
    g.addColorStop(st(rB[1]), rgba(col, a)); g.addColorStop(st(rB[2]), rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    return g;
  };
  el.families.forEach((F, fi) => {
    let dl = (F * GA) % (2 * Math.PI); if (dl > Math.PI) dl -= 2 * Math.PI;
    const tStart = el.t0 + fi * el.fam_delay;
    const grow = eInOutSine(lin(t, tStart, tStart + el.grow));
    if (grow <= 0) return;
    const paths = [];
    for (let j = 0; j < F; j++) {
      const stag = ((j * 7) % F) / F * 0.3;
      const g = clamp((grow - stag) / 0.7);
      if (g <= 0) continue;
      const nEnd = lerp(nA[0], nA[3], g);
      const pts = [];
      const s0 = Math.max(0, (nA[0] - j) / F);
      for (let s = s0; ; s += 0.2) {
        const n = j + s * F;
        if (n > nEnd) break;
        if (n < 1) continue;
        pts.push(mapPt(n, j * GA + s * dl));
      }
      if (pts.length > 1) paths.push(pts);
    }
    if (!paths.length) return;
    const build = (c, o) => { for (const pts of paths) pts.forEach((q, i) => (i ? c.lineTo(q[0] + o, q[1]) : c.moveTo(q[0] + o, q[1]))); };
    const lw = clamp(spacing / 40, 0.45, 1.15);       // ~world-space width: thins with the florets
    X.save(); X.lineCap = 'round'; X.lineJoin = 'round';
    X.strokeStyle = mkGrad(X, [0, 0, 0], aGlob * 0.32); X.lineWidth = 3.4 * lw; X.beginPath(); build(X, 0); X.stroke();
    X.strokeStyle = mkGrad(X, famCols[fi], aGlob * famA[fi]); X.lineWidth = (fi === 0 ? 1.8 : 1.4) * lw; X.beginPath(); build(X, 0); X.stroke();
    X.restore(); drewOver = true;
    A.save(); A.lineCap = 'round';
    A.strokeStyle = mkGrad(A, famCols[fi], aGlob * famA[fi] * 0.5); A.lineWidth = 5 * lw; A.beginPath(); build(A, 0); A.stroke();
    A.restore(); drewAdd = true;
    if (el.numbers) {
      const na = aGlob * eOutCubic(lin(t, tStart + 0.25, tStart + 0.6));
      if (na > 0.003) {
        const run = layoutRun(String(F), 'Inter', 500, 30, 0.02);
        // below the head, clear of the key-word band
        const ang = (el.num_angles || [1.0, 2.15])[fi];
        const rr = clamp(rB[2] * 1.02, 160, 420);
        const band = [TL.safe.band[0] - 20, TL.safe.band[1] + 40];
        const lx = clamp(ctr[0] + Math.cos(ang) * rr - run.w / 2, TL.safe.x0 + 10, TL.safe.x1 - 10 - run.w);
        let ly = clamp(ctr[1] + Math.sin(ang) * rr + run.capH / 2, TL.safe.y0 + 40, TL.safe.y1 - 10);
        if (ly > band[0] && ly - run.capH < band[1]) ly = band[1] + run.capH;
        drawRunWipe(run, lx, ly, famCols[fi], na, lx + run.w + 40, 1, 30, [0.6, 7, 1]);
        setFont(A, 'Inter', 500, 30);
        for (const c of run.chars) glyph(A, c.ch, lx + c.x, ly, famCols[fi], na * 0.35, 0);
      }
    }
  });
  glowDot(A, ctr[0], ctr[1], 30, [255, 214, 140], aGlob * 0.35);
}

// ================================================================== frame
const DRAW = { keyword: (el, f, t) => drawKeyword(el, t), callout: drawCallout, counter: drawCounter, ecg: drawECG,
  network: drawNetwork, rings: drawRings, spiral: drawSpiral };

window.ovActive = function (f) { return TL.elements.some(e => f >= e.f0 && f < e.f1); };

/** Bounding box (device px) of non-transparent content: 2x box-filter pyramid down to ~1/16, then scan. */
let PYR = null;
function contentBox(cv) {
  if (!PYR) {
    PYR = [];
    let w = cv.width, h = cv.height;
    for (let i = 0; i < 4; i++) {
      w = Math.ceil(w / 2); h = Math.ceil(h / 2);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      PYR.push(c);
    }
  }
  let src = cv;
  for (const c of PYR) {
    const g = c.getContext('2d', { willReadFrequently: c === PYR[PYR.length - 1] });
    g.globalCompositeOperation = 'copy'; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'low';
    g.drawImage(src, 0, 0, c.width, c.height);
    src = c;
  }
  const last = PYR[PYR.length - 1];
  const d = last.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, last.width, last.height).data;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < last.height; y++) for (let x = 0; x < last.width; x++) {
    if (d[(y * last.width + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  const k = cv.width / last.width, m = Math.ceil(20 * S) + 2 * k;
  const bx0 = Math.max(0, Math.floor(x0 * k - m)), by0 = Math.max(0, Math.floor(y0 * k - m));
  const bx1 = Math.min(cv.width, Math.ceil((x1 + 1) * k + m)), by1 = Math.min(cv.height, Math.ceil((y1 + 1) * k + m));
  return [bx0, by0, bx1 - bx0, by1 - by0];
}

/** Knock the graphics layer out under the key words: soft feathered boxes (ink box + ~26 px, 40 px feather)
 *  painted at 1/8 resolution and scaled up, removed from both layers with destination-out. */
let KM = null;
function knockout(ctxs, boxes) {
  const k = 8, feather = 40, grow = 26;
  if (!KM) { KM = document.createElement('canvas'); KM.width = Math.ceil(W / k) + 2; KM.height = Math.ceil(H / k) + 2; }
  const m = KM.getContext('2d');
  m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, KM.width, KM.height);
  let any = false;
  for (const b of boxes) {
    const a = clamp(b[4]);
    if (a < 0.01) continue;
    any = true;
    m.save();
    m.shadowColor = `rgba(0,0,0,${a.toFixed(4)})`; m.shadowBlur = (feather * 0.7) / k; m.shadowOffsetX = 4000; m.shadowOffsetY = 0;
    m.fillStyle = '#000';
    m.fillRect((b[0] - grow) / k - 4000, (b[1] - grow) / k, (b[2] - b[0] + 2 * grow) / k, (b[3] - b[1] + 2 * grow) / k);
    m.restore();
  }
  if (!any) return;
  for (const c of ctxs) {
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'destination-out'; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(KM, 0, 0, KM.width * k * S, KM.height * k * S);
    c.restore();
  }
}

window.ovRender = function (f) {
  const t = f / FPS;
  for (const [c, cv] of [[X, cOver], [A, cAdd], [KX, cKOver], [KA, cKAdd]]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); }
  X.setTransform(S, 0, 0, S, 0, 0); A.setTransform(S, 0, 0, S, 0, 0);
  A.globalCompositeOperation = 'lighter';
  drewOver = false; drewAdd = false; BOXES = []; KWBOXES = [];
  const kws = [], rest = [];
  for (const el of TL.elements) {
    if (f < el.f0 || f >= el.f1) continue;
    (el.type === 'keyword' ? kws : rest).push(el);
  }
  const draw = el => { X.save(); A.save(); try { DRAW[el.type](el, f, t); } finally { X.restore(); A.restore(); } };
  // graphics first ...
  rest.forEach(draw);
  // ... then the key words, on their own layers, drawn last over a knocked-out hole in the graphics
  if (kws.length) {
    const restOver = drewOver, restAdd = drewAdd;
    const X0 = X, A0 = A;
    X = KX; A = KA;
    X.setTransform(S, 0, 0, S, 0, 0); A.setTransform(S, 0, 0, S, 0, 0); A.globalCompositeOperation = 'lighter';
    drewOver = false; drewAdd = false;
    try { kws.forEach(draw); } finally { X = X0; A = A0; }
    const kwOver = drewOver, kwAdd = drewAdd;
    if (restOver || restAdd) knockout([X, A].filter((c, i) => (i ? restAdd : restOver)), KWBOXES);
    if (kwOver) { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalCompositeOperation = 'source-over'; X.drawImage(cKOver, 0, 0); X.restore(); }
    if (kwAdd) { A.save(); A.setTransform(1, 0, 0, 1, 0, 0); A.globalCompositeOperation = 'lighter'; A.drawImage(cKAdd, 0, 0); A.restore(); }
    drewOver = restOver || kwOver; drewAdd = restAdd || kwAdd;
  }
  const ob = drewOver ? contentBox(cOver) : null;
  const ab = drewAdd ? contentBox(cAdd) : null;
  // (the scrim strength, index 6, keeps 3 decimals so its fades stay smooth)
  return { over: ob, add: ab, boxes: BOXES.map(b => b.map((v, i) => (i === 6 ? Math.round(v * 1000) / 1000 : Math.round(v * 10) / 10))) };
};

window.ovInit = async function (timeline, scale) {
  TL = timeline; S = scale; W = TL.W; H = TL.H; FPS = TL.fps;
  cOver = document.getElementById('over'); cAdd = document.getElementById('add');
  const cw = Math.round(W * S), chh = Math.round(H * S);
  cOver.width = cw; cOver.height = chh; cAdd.width = cw; cAdd.height = chh;
  cOver.style.top = '0px'; cAdd.style.top = chh + 'px';
  cOver.style.width = cw + 'px'; cOver.style.height = chh + 'px'; cAdd.style.width = cw + 'px'; cAdd.style.height = chh + 'px';
  X = cOver.getContext('2d', { willReadFrequently: false });
  A = cAdd.getContext('2d');
  // key-word layers (drawn last, over a knocked-out hole in the graphics)
  cKOver = document.createElement('canvas'); cKAdd = document.createElement('canvas');
  cKOver.width = cKAdd.width = cw; cKOver.height = cKAdd.height = chh;
  KX = cKOver.getContext('2d'); KA = cKAdd.getContext('2d');
  for (const [fam, src, wt] of TL.fonts.faces) {
    const ff = new FontFace(fam, `url("${src}")`, { weight: wt });
    await ff.load(); document.fonts.add(ff);
  }
  const need = [['Inter Display', 600], ['Inter Display', 400], ['Inter Display', 300], ['Inter Display', 200], ['Inter', 400], ['Inter', 500], ['Inter', 600], ['Cormorant Garamond', 600]];
  for (const [fam, wt] of need) await document.fonts.load(fontStr(fam, wt, 40), 'AİŞĞÇÖÜÎ0123456789₂');
  await document.fonts.ready;
  // sanity: report the resolved fonts (width differs from the generic fallback if the face is real)
  const probe = {};
  for (const [fam, wt] of need) { X.font = fontStr(fam, wt, 100); probe[`${fam} ${wt}`] = Math.round(X.measureText('HAMBURGEFONTSİV').width); }
  X.font = '100px monospace'; probe.monospace = Math.round(X.measureText('HAMBURGEFONTSİV').width);
  // pre-resolve word-ref'd times etc. are already absolute in the timeline
  return probe;
};
