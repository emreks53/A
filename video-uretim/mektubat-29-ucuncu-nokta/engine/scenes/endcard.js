// endcard.js — the photographic Risale-i Nur shot (Blender frames) after the mountain scene's cream bloom.
import { W, H, clamp, invlerp, smooth, E } from '../core.js';
export const T0 = 54.6;          // first photo frame time
const N = 150, CREAM = '#F4EBD8';
const cache = new Map();
const dir = 'endframes/';
function load(i) {
  if (cache.has(i)) return cache.get(i);
  const p = new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `${dir}f_${String(i).padStart(4, '0')}.png`; });
  cache.set(i, p);
  if (cache.size > 12) { const k = cache.keys().next().value; cache.delete(k); }
  return p;
}
export async function draw(ctx, t) {
  const fi = clamp(Math.round((t - T0) * 30) + 1, 1, N);
  const im = await load(fi);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (im) ctx.drawImage(im, 0, 0, W, H); else { ctx.fillStyle = '#5a4636'; ctx.fillRect(0, 0, W, H); }
  // dissolve in from the cream bloom of the previous scene
  const k = 1 - E.inOutSine(invlerp(T0, T0 + 0.75, t));
  if (k > 0) { ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // gentle fade at the very end
  const f = smooth(invlerp(59.25, 59.6, t));
  if (f > 0) { ctx.save(); ctx.globalAlpha = f * 0.0; ctx.restore(); }
}
/** how much of the gouache finishing to keep (photo must stay photographic) */
export const gouacheAmount = (t) => 1 - smooth(invlerp(T0 + 0.05, T0 + 0.6, t));
