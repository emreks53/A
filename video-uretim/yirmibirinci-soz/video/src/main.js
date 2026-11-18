// Entry point. Exposes these globals for the renderer:
//   window.__ready            Promise — fonts loaded, engine + selected scene fully baked
//   window.prepareFrame(t)    async — lets the scene bake / release what time t needs (scene.prepare)
//   window.renderFrame(t)     draws the frame for time t (seconds) on #c; returns draw time in ms
//   window.DURATION           duration of the selected scene in seconds
//
// URL params:  ?scene=<id>   composition from src/scenes/index.js (default "main")
//              ?scale=<0.1..2> render scale (canvas = 1080*scale x 1920*scale, same framing, same painting;
//                            > 1 is for supersampled finals: tools/render.mjs --ss 2)
//
// Scene module interface (default export):
//   { id, duration,
//     async init(E)        bake everything here (E = engine namespace, see ENGINE.md)
//     draw(ctx, t, E)      draw the frame for time t in LOGICAL 1080x1920 coordinates; must be a
//                          pure function of t (no Math.random, no state that depends on call order)
//     async prepare?(t, E) optional: bake / release time-windowed content before frame t is drawn
//                          (E.makeSequence provides one); the renderer awaits it before every frame
//     release?(E)          optional: drop baked content (called by E.makeSequence when a part is done)
//     glosses?             true -> the four real glosses from timing.json; [{text,t,end}] -> custom;
//                          false -> none. Default: true for the scene with id "main", none otherwise.
//     finish?              false to skip the global wall-grain finishing pass (default true) }

import { createEngine } from './engine/index.js';
import { scenes } from './scenes/index.js';

const FONT_FACES = [
  '500 40px "EB Garamond"', 'italic 500 40px "EB Garamond"', '600 40px "EB Garamond"',
  '500 40px "Encode Sans"', '600 40px "Encode Sans"', '700 40px "Encode Sans"',
  'italic 700 40px "Tinos"',
];
const FONT_PROBE = 'Aşğıİâîû öçü 291';

async function boot() {
  const params = new URLSearchParams(location.search);
  const sceneId = params.get('scene') || 'main';
  const scale = Math.min(2, Math.max(0.1, parseFloat(params.get('scale') || '1') || 1));
  const loader = scenes[sceneId];
  if (!loader) throw new Error(`scene "${sceneId}" is not registered in src/scenes/index.js (have: ${Object.keys(scenes).join(', ')})`);

  await Promise.all(FONT_FACES.map((f) => document.fonts.load(f, FONT_PROBE)));
  await document.fonts.ready;
  for (const f of FONT_FACES) if (!document.fonts.check(f, FONT_PROBE)) throw new Error(`font not loaded: ${f}`);

  const t0 = performance.now();
  const E = await createEngine({ res: scale });
  const tEngine = performance.now();
  const scene = (await loader()).default;
  await scene.init(E);
  const tScene = performance.now();

  const canvas = document.getElementById('c');
  canvas.width = Math.round(E.W * scale);
  canvas.height = Math.round(E.H * scale);
  const ctx = canvas.getContext('2d', { alpha: false });
  const want = scene.glosses ?? sceneId === 'main';
  const glosses = want === true ? E.timingGlosses() : Array.isArray(want) ? want : null;
  if (glosses) E.prepareGlosses(glosses);

  window.DURATION = scene.duration;
  window.prepareFrame = async (t) => { if (scene.prepare) await scene.prepare(t, E); };
  window.renderFrame = (t) => {
    const s = performance.now();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // bilinear on both sides of 1:1 — no kernel switch (and no sharpness step) when a zoom crosses 1
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.fillStyle = E.PAL.primer;
    ctx.fillRect(0, 0, E.W, E.H);
    ctx.save();
    scene.draw(ctx, t, E);
    ctx.restore();
    if (scene.finish !== false) E.finish(ctx);
    if (glosses) E.drawGlosses(ctx, t, glosses);
    return performance.now() - s;
  };
  return { scene: sceneId, duration: scene.duration, scale, engineMs: tEngine - t0, sceneMs: tScene - tEngine };
}

window.__ready = boot();
window.__ready.catch((e) => {
  console.error(e);
  document.title = `ERROR: ${e.message}`;
});
