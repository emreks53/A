// overlay.js — crisp layer above the painting: word-meaning subtitles, the Arabic calligraphy, the end-card titles.
import { W, H, clamp, lerp, invlerp, smooth, E, TEX, rgb, css, mix } from './core.js';
import { GLOSSES, on } from './timing.js';

const GL_Y = 1392;          // subtitle baseline centre
const GL_MAXW = 880;
const GL_FONT = (px) => `italic 600 ${px}px "Cormorant Garamond"`;

let sceneCanvas = null;
export function setScene(c) { sceneCanvas = c; }

/** average luminance of the painted scene behind the subtitle band (0..1) */
function bandLum() {
  if (!sceneCanvas) return 0.4;
  const g = sceneCanvas.getContext('2d', { willReadFrequently: true });
  const d = g.getImageData(240, GL_Y - 90, 600, 130).data;
  let s = 0, n = 0;
  for (let i = 0; i < d.length; i += 4 * 7) { s += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; n++; }
  return s / n;
}

function wrap(o, text, px) {
  o.font = GL_FONT(px);
  if (o.measureText(text).width <= GL_MAXW) return [text];
  const words = text.split(' '); let best = [text], bestD = 1e9;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
    const wa = o.measureText(a).width, wb = o.measureText(b).width;
    if (Math.max(wa, wb) <= GL_MAXW && Math.abs(wa - wb) < bestD) { bestD = Math.abs(wa - wb); best = [a, b]; }
  }
  return best;
}

// per-gloss tone (text colour) chosen for the picture behind it, trimmed end times, and small onset corrections
// (wav2vec2 starts measured 40–70 ms late on these words)
const TONE = { 9: 'ink', 10: 'ink' };
const BLEND = { 7: true, 12: true };            // background changes under these: blend ivory↔ink by brightness
const OFF = { 4: 9.45, 6: 12.9, 7: 17.95, 10: 31.62, 12: 35.5, 14: 41.6 };
const EARLY = { 1: 0.05, 7: 0.05, 9: 0.06, 15: 0.04, 18: 0.05 };
function glossText(o, lines, y0, lh, ink, alpha) {
  if (alpha <= 0.003) return;
  o.save(); o.globalAlpha = alpha;
  lines.forEach((ln, i) => {
    const y = y0 + i * lh;
    if (ink) {
      o.fillStyle = '#2A2733';
      o.shadowColor = 'rgba(255,248,232,0.85)'; o.shadowBlur = 22; o.fillText(ln, W / 2, y);
      o.shadowBlur = 8; o.fillText(ln, W / 2, y);
    } else {
      o.fillStyle = '#FBF4E2';
      o.shadowColor = 'rgba(16,20,28,0.8)'; o.shadowBlur = 16; o.fillText(ln, W / 2, y);
      o.shadowBlur = 16; o.fillText(ln, W / 2, y);
      o.shadowColor = 'rgba(16,20,28,0.55)'; o.shadowBlur = 5; o.fillText(ln, W / 2, y);
    }
    o.shadowBlur = 0; o.fillText(ln, W / 2, y);
  });
  o.restore();
}
function drawGloss(o, g, t, lum, next, idx) {
  const on = g.on - (EARLY[idx] || 0);
  const nextOn = next ? next.on - (EARLY[idx + 1] || 0) : 99;
  const off = OFF[idx] ?? g.off;
  const stacked = next && nextOn - off < 0.45;
  const tin = invlerp(on - 0.07, on + 0.28, t);
  // stacked: the old line lifts BEFORE the new word starts, then fades while the new one rises in
  const lift = stacked ? E.outCubic(invlerp(nextOn - 0.32, nextOn - 0.05, t)) : 0;
  const tout = stacked ? invlerp(nextOn + 0.04, nextOn + 0.42, t) : invlerp(off - 0.32, off, t);
  if (tin <= 0 || tout >= 1) return;
  const a = E.outCubic(tin) * (1 - E.inCubic(tout));
  o.save();
  o.textAlign = 'center'; o.textBaseline = 'alphabetic';
  const px = 76; o.font = GL_FONT(px);
  const lines = wrap(o, g.text, px);
  o.font = GL_FONT(px);
  const nl = stacked ? wrap(o, next.text, px).length : 0;
  o.font = GL_FONT(px);
  const push = stacked ? (nl + lines.length) * px * 0.54 + (nl > 1 ? 30 : 16) : 0;
  const rise = (1 - E.outCubic(tin)) * 18 + (stacked ? -push * lift : E.inCubic(tout) * -14);
  const lh = px * 1.08; const y0 = GL_Y + rise - (lines.length - 1) * lh * 0.5;
  o.letterSpacing = `${(0.5 + (1 - E.outCubic(tin)) * 3).toFixed(2)}px`;
  if (BLEND[idx]) {
    const k = smooth(invlerp(0.45, 0.62, lum));
    glossText(o, lines, y0, lh, false, a * (1 - k));
    glossText(o, lines, y0, lh, true, a * k);
  } else {
    const tone = TONE[idx] || (idx >= 19 ? (lum > 0.62 ? 'ink' : 'ivory') : 'ivory');
    glossText(o, lines, y0, lh, tone === 'ink', a);
  }
  o.restore();
}

// ------------------------------------------------------------------ Arabic calligraphy (gold), revealed right→left with the recitation
const AR_LINES = ['اَلْحَمْدُ لِلّٰهِ', 'عَلٰى كُلِّ حَالٍ'];
const AR = { y: [440, 625], px: 150 };
let arCache = null;
function arabicLines() {
  if (arCache) return arCache;
  const PADT = AR.px * 1.45, HGT = Math.ceil(AR.px * 2.5);
  arCache = AR_LINES.map((ln) => {
    const c = new OffscreenCanvas(W, HGT); const g = c.getContext('2d');
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.direction = 'rtl'; g.font = `700 ${AR.px}px Amiri`;
    const y = PADT;
    g.save(); g.shadowColor = 'rgba(255,240,205,0.9)'; g.shadowBlur = 46; g.fillStyle = 'rgba(255,238,200,0.85)'; g.fillText(ln, W / 2, y); g.restore();
    g.save(); g.strokeStyle = 'rgba(92,58,20,0.75)'; g.lineWidth = 7; g.lineJoin = 'round'; g.strokeText(ln, W / 2, y + 2); g.restore();
    const gr = g.createLinearGradient(0, y - AR.px, 0, y + AR.px * 0.5);
    gr.addColorStop(0, '#FCEBB0'); gr.addColorStop(0.3, '#EDC163'); gr.addColorStop(0.55, '#D59B3A'); gr.addColorStop(0.75, '#F3D17E'); gr.addColorStop(1, '#B9802C');
    g.fillStyle = gr; g.strokeStyle = 'rgba(110,70,22,0.85)'; g.lineWidth = 2.6; g.lineJoin = 'round';
    g.strokeText(ln, W / 2, y); g.fillText(ln, W / 2, y);
    if (TEX.bristle) { g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.35; const p = g.createPattern(TEX.bristle, 'repeat'); p.setTransform(new DOMMatrix().rotateSelf(-8).scaleSelf(0.5, 0.5)); g.fillStyle = p; g.fillRect(0, 0, W, HGT); g.restore(); }
    const w = g.measureText(ln).width;
    return { c, top: PADT, ext: [W / 2 - w / 2, W / 2 + w / 2], HGT };
  });
  return arCache;
}
function drawArabic(o, t) {
  const t0 = on('elhamdülillahi') - 0.05;
  const fadeOut = 1 - smooth(invlerp(54.25, 54.6, t));
  if (t < t0 || fadeOut <= 0) return;
  const L = arabicLines();
  const reveals = [E.inOutSine(invlerp(t0, on('ala') - 0.08, t)), E.inOutSine(invlerp(on('ala') - 0.06, on('halin') + 0.3, t))];
  o.save(); o.globalAlpha = fadeOut;
  reveals.forEach((r, i) => {
    if (r <= 0) return;
    const { c, top, ext, HGT } = L[i];
    const edge = lerp(ext[1] + 40, ext[0] - 60, r);
    const tmp = new OffscreenCanvas(W, HGT); const tg = tmp.getContext('2d');
    tg.drawImage(c, 0, 0);
    tg.globalCompositeOperation = 'destination-in';
    const gr = tg.createLinearGradient(edge - 70, 0, edge + 10, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    tg.fillStyle = gr; tg.fillRect(0, 0, W, HGT);
    o.drawImage(tmp, 0, AR.y[i] - top);
  });
  o.restore();
}

// ------------------------------------------------------------------ end-card titles
function regionLum(x, y, w, h) {
  if (!sceneCanvas) return 0.5;
  const d = sceneCanvas.getContext('2d', { willReadFrequently: true }).getImageData(x, y, w, h).data;
  let s = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 11) { s += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; n++; }
  return s / n;
}
function drawEndTitles(o, t) {
  const a1 = E.outCubic(invlerp(55.15, 55.95, t)), a2 = E.outCubic(invlerp(55.6, 56.4, t));
  if (a1 <= 0) return;
  const dark = regionLum(200, 280, 680, 320) > 0.58;   // light wall → dark ink, mid/dark wall → ivory
  o.save(); o.textAlign = 'center'; o.textBaseline = 'alphabetic';
  const ink = dark ? '#3A2A1F' : '#FBF3E3';
  const halo = dark ? 'rgba(255,246,232,0.75)' : 'rgba(28,18,10,0.6)';
  o.shadowColor = halo; o.shadowBlur = 20;
  o.globalAlpha = a1; o.fillStyle = ink; o.font = '600 84px "Cormorant Garamond"'; o.letterSpacing = `${(10 - 4 * a1).toFixed(1)}px`;
  o.fillText('RİSALE-İ NUR', W / 2, 360 + (1 - a1) * 16);
  // thin gold rule with a small diamond
  const rw = 230 * a2; o.shadowBlur = 0; o.globalAlpha = a2; o.fillStyle = dark ? '#A9792E' : '#E7C77E';
  o.fillRect(W / 2 - rw - 14, 404, rw, 2.2); o.fillRect(W / 2 + 14, 404, rw, 2.2);
  o.save(); o.translate(W / 2, 405); o.rotate(Math.PI / 4); o.fillRect(-6, -6, 12, 12); o.restore();
  o.shadowColor = halo; o.shadowBlur = 18; o.fillStyle = ink; o.letterSpacing = '1px';
  o.font = 'italic 600 74px "Cormorant Garamond"';
  o.fillText('Mektubat', W / 2, 492 + (1 - a2) * 14);
  o.font = '500 46px "Cormorant Garamond"'; o.letterSpacing = '3px';
  o.fillText('sf. 502', W / 2, 560 + (1 - a2) * 14);
  o.restore();
}

export function drawOverlay(o, t) {
  const lum = bandLum();
  GLOSSES.forEach((g, i) => drawGloss(o, g, t, lum, GLOSSES[i + 1], i));
  drawArabic(o, t);
  drawEndTitles(o, t);
}
