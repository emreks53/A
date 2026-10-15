#!/usr/bin/env node
// Frame-cost breakdown for a scene at given local times: full frame vs scene-only render vs depth pre-pass.
//   node tools/benchframe.mjs --scene s20 --t 5.0,2.0
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2); const opt = {};
for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); opt[k] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; }
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf', '.hdr': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
// --gl llvmpipe: full Chromium (headed, needs an X display e.g. xvfb-run) with ANGLE on desktop GL -> Mesa llvmpipe
const browser = opt.gl === 'llvmpipe'
  ? await chromium.launch({ headless: false, args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-gpu-driver-bug-workarounds', '--js-flags=--max-old-space-size=4096'] })
  : await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=4096'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?scene=${opt.scene}&scale=${opt.scale ?? 1}&msaa=0&smaa=1&fps=30${opt.extra ?? ''}`);
await page.waitForFunction('window.ENGINE && (window.ENGINE.ready || window.ENGINE.error)', null, { timeout: 300000 });
console.log('GL', await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); }), 'err', await page.evaluate('window.ENGINE.error || ""'));
if (opt.grab) { // timed full grabs (incl. motion blur) -> jpg files <grab>_<t>.jpg
  for (const t of String(opt.t).split(',').map(Number)) { const t0 = Date.now(); const b64 = await page.evaluate(t => window.ENGINE.grab(t, 0.95), t); fs.writeFileSync(`${opt.grab}_${t.toFixed(2)}.jpg`, Buffer.from(b64, 'base64')); console.log(JSON.stringify({ t, grabMs: Date.now() - t0, mb: await page.evaluate(() => { const p = window.ENGINE._dbg.post(); return p.motionBlur ? p.motionBlur.samples : 1; }) })); }
  await browser.close(); server.close(); process.exit(0);
}
for (const t of String(opt.t).split(',').map(Number)) {
  const r = await page.evaluate(async (t) => {
    const E = window.ENGINE, D = E._dbg, { renderer, scene, camera } = D; const THREE_RT = renderer.getRenderTarget();
    const gl = renderer.getContext(); const sync = () => { const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    const time = (fn, n = 2) => { fn(); sync(); const t0 = performance.now(); for (let i = 0; i < n; i++) { fn(); sync(); } return (performance.now() - t0) / n; };
    const full = time(() => E.renderFrame(t, true));
    const rt = D.pp.composer.readBuffer; // HDR target
    const sceneOnly = time(() => { renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); });
    const post = D.post(); return { t, full: Math.round(full), sceneOnly: Math.round(sceneOnly), dof: !!(post.dof && post.dof.enabled), mb: post.motionBlur ? post.motionBlur.samples : 1 };
  }, t);
  console.log(JSON.stringify(r));
}
await browser.close(); server.close();
