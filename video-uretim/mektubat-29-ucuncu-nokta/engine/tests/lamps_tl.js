// test timeline for scenes/lamps.js (global video time). The mock gloss overlay is ONLY for judging subtitle-band readability.
import { W } from '../core.js';
import * as lamps from '../scenes/lamps.js';
import { GLOSSES } from '../timing.js';
export const DURATION = 42.5;
export async function init() { await lamps.init(); }
export function draw(ctx, t) { lamps.draw(ctx, t); }
const MOCK = false; // set true to preview a mock gloss in the subtitle band (y≈1385)
export function drawOverlay(o, t) {
  if (!MOCK) return;
  const g = GLOSSES.find((q) => t >= q.on && t <= q.off); if (!g) return;
  const a = Math.min(1, (t - g.on) / 0.25, (g.off - t) / 0.25);
  o.globalAlpha = Math.max(0, a); o.font = 'italic 600 66px "Cormorant Garamond"'; o.textAlign = 'center'; o.fillStyle = '#FBF5E6';
  o.shadowColor = 'rgba(20,24,30,0.55)'; o.shadowBlur = 18; o.fillText(g.text, W / 2, 1385); o.globalAlpha = 1;
}
