// test timeline for scenes/mountain.js (global video time). Append "?dbg" to the tl path for safe-zone/word overlay,
// "?pose" for a du'a pose test sheet (variants of DUA_N / DUA_F side by side).
import * as M from '../scenes/mountain.js';
import { WORDS, GLOSSES } from '../timing.js';
import { W, H } from '../core.js';
import { drawMan } from '../rig.js';
export const DURATION = 55.0;
const DBG = import.meta.url.includes('dbg');
const POSE = import.meta.url.includes('pose');
export async function init() { await M.init(); }
export function draw(ctx, t) {
  if (!POSE) { M.draw(ctx, t); return; }
  ctx.fillStyle = '#C9A9AE'; ctx.fillRect(0, 0, W, H);
  const V = M.DBG.poseVariants || [];
  V.forEach((v, i) => {
    const x = 160 + (i % 3) * 330, y = 900 + Math.floor(i / 3) * 820, s = 600;
    const pose = { hip: [x, y - 0.522 * s], torso: 0, neck: -0.1, head: -0.12, breath: 0.5,
      legN: { ik: [x + 0.03 * s, y], ft: 0 }, legF: { ik: [x - 0.025 * s, y], ft: 0 }, armN: v.N, armF: v.F };
    drawMan(ctx, pose, { size: s, facing: 1, seed: 7 });
    ctx.fillStyle = '#222'; ctx.font = '600 30px "EB Garamond"'; ctx.fillText(String(i), x - 60, y + 40);
  });
}
export function drawOverlay(o, t) {
  if (!DBG) return;
  o.save();
  o.strokeStyle = 'rgba(255,80,80,0.8)'; o.lineWidth = 3;
  if (t >= 51.6 && t <= 54.4) { o.strokeRect(90, 330, 900, 310); o.setLineDash([10, 10]); o.strokeRect(90, 250, 900, 470); o.setLineDash([]); } // calligraphy zone (+ real glyph extent)
  o.strokeStyle = 'rgba(80,200,255,0.8)'; o.strokeRect(0, 1290, W, 150); // subtitle band
  o.fillStyle = 'rgba(0,0,0,0.5)'; o.fillRect(0, 1500, W, 160);
  o.fillStyle = '#fff'; o.font = '600 44px "EB Garamond"'; o.textAlign = 'center';
  const w = WORDS.filter((x) => x.s <= t + 0.001).pop();
  const g = GLOSSES.find((x) => t >= x.on && t <= x.off);
  o.fillText(`${t.toFixed(2)}  ${w ? w.w : ''}`, W / 2, 1560);
  if (g) o.fillText(g.text, W / 2, 1620);
  o.restore();
}
