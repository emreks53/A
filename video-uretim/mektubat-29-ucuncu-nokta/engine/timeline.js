// timeline.js — integrates all scenes, transitions, overlay and post parameters.
import { W, H } from './core.js';
import * as world from './scenes/world.js';
import * as endcard from './scenes/endcard.js';
import { drawOverlay as overlay, setScene } from './overlay.js';
export const DURATION = 59.6;
let lamps = null, mountain = null;
const SEG = { worldEnd: 35.6, lampsEnd: 42.0, mountainEnd: endcard.T0 };
let off = null;
export async function init() {
  await world.init();
  try { lamps = await import('./scenes/lamps.js'); if (lamps.init) await lamps.init(); } catch (e) { console.warn('lamps missing', e.message); lamps = null; }
  try { mountain = await import('./scenes/mountain.js'); if (mountain.init) await mountain.init(); } catch (e) { console.warn('mountain missing', e.message); mountain = null; }
  off = new OffscreenCanvas(W, H);
}
const flat = (ctx, c) => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); };
async function drawSeg(name, ctx, t) {
  ctx.save();
  if (name === 'world') world.draw(ctx, t);
  else if (name === 'lamps') { if (lamps) lamps.draw(ctx, t); else flat(ctx, t < 36 ? '#F2D79A' : '#161D2E'); }
  else if (name === 'mountain') { if (mountain) mountain.draw(ctx, t); else flat(ctx, t < 42.5 ? '#161D2E' : '#F4EBD8'); }
  else await endcard.draw(ctx, t);
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// short dissolves across the (colour-matched) handoffs
const X = [['world', 'lamps', 35.5, 35.66], ['lamps', 'mountain', 41.9, 42.1], ['mountain', 'endcard', 54.58, 54.62]];
export async function draw(ctx, t) {
  setScene(ctx.canvas);
  for (const [a, b, t0, t1] of X) {
    if (t >= t0 && t < t1) {
      await drawSeg(a, ctx, t);
      const g = off.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, W, H);
      await drawSeg(b, g, t);
      ctx.save(); ctx.globalAlpha = (t - t0) / (t1 - t0); ctx.drawImage(off, 0, 0); ctx.restore();
      return;
    }
  }
  const name = t < SEG.worldEnd ? 'world' : t < SEG.lampsEnd ? 'lamps' : t < SEG.mountainEnd ? 'mountain' : 'endcard';
  await drawSeg(name, ctx, t);
}
export function drawOverlay(o, t) { overlay(o, t); }
export function postParams(t) {
  const k = t < endcard.T0 ? 1 : endcard.gouacheAmount(t);
  return { edgeAmp: 0.7 * k, relief: 0.2 * k, grain: 0.07 * k, matte: 0.6 * k, vign: 0.18 * k, overlayPaper: 0.05 * k };
}
