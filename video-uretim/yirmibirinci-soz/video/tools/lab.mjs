#!/usr/bin/env node
// Engine lab: run a small module against the real engine in headless Chromium, save the canvas and
// print whatever the module returns. For look-dev experiments, API probes and tests — no scene needed.
//
//   node tools/lab.mjs path/to/probe.js [--scale 1] [--ss 2] [--w 1080] [--h 1920] [--out out/lab.png] [--arg anything]
//
// probe.js (may live anywhere on disk; import engine files as '/video/src/engine/…'):
//   export default async function (E, ctx, { canvas, arg, scale }) {
//     const sky = E.makeSky({ w: 1080, h: 1200, seed: 3 });
//     sky.draw(ctx, 0, 0);                      // ctx is in LOGICAL px, primer-filled, w x h
//     return { anything: 'JSON-able' };         // printed as one line of JSON
//   }
// --ss 2 bakes at 2x and lanczos-downscales the PNG (what the final film does). Nothing is left running.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); // /home/user/work
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };

const argv = process.argv.slice(2);
const file = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv.shift()) : null;
const o = {};
for (let i = 0; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, '');
  o[k] = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
}
if (!file || !fs.existsSync(file)) {
  console.error('usage: lab.mjs <probe.js> [--scale 1] [--ss 2] [--w 1080] [--h 1920] [--out out/lab.png] [--arg x]');
  process.exit(2);
}
const ss = Math.max(1, Math.min(2, Number(o.ss ?? 1))), outScale = Number(o.scale ?? 1), scale = outScale * ss;
const W = Number(o.w ?? 1080), H = Number(o.h ?? 1920);

const PAGE = fs.readFileSync(path.join(ROOT, 'video/index.html'), 'utf8')
  .replace(/<script type="module" src="src\/main\.js"><\/script>/, `<script type="module">
    import { createEngine } from '/video/src/engine/index.js';
    const FACES = ['500 40px "EB Garamond"', 'italic 500 40px "EB Garamond"', '600 40px "EB Garamond"', '500 40px "Encode Sans"', '600 40px "Encode Sans"', '700 40px "Encode Sans"', 'italic 700 40px "Tinos"'];
    window.__run = async (scale, w, h, arg) => {
      await Promise.all(FACES.map((f) => document.fonts.load(f, 'Aşğıİâîû öçü 291')));
      await document.fonts.ready;
      const E = await createEngine({ res: scale });
      const canvas = document.getElementById('c');
      canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'medium';
      ctx.fillStyle = E.PAL.primer; ctx.fillRect(0, 0, w, h);
      const mod = await import('/__lab_module.js');
      const out = await mod.default(E, ctx, { canvas, arg, scale, w, h });
      return out === undefined ? null : out;
    };
  </script>`)
  .replace(/url\("\.\.\/fonts\//g, 'url("/fonts/');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__lab.html') { res.writeHead(200, { 'Content-Type': MIME['.html'] }).end(PAGE); return; }
  const f = url.pathname === '/__lab_module.js' ? file : path.join(ROOT, path.normalize(decodeURIComponent(url.pathname)));
  if (f !== file && !f.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(buf);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
let code = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); else if (o.verbose) console.log('[page]', m.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/__lab.html`);
  let result;
  try {
    result = await page.evaluate(([s, w, h, arg]) => window.__run(s, w, h, arg), [scale, W, H, o.arg ?? null]);
  } catch (e) {
    throw new Error((errors[0] || e.message).split('\n').slice(0, 3).join(' | '));
  }
  if (o.out) {
    const b64 = await page.evaluate(() => document.getElementById('c').toDataURL('image/png').split(',')[1]);
    let png = Buffer.from(b64, 'base64');
    if (ss > 1) {
      const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-i', 'pipe:0', '-vf',
        `scale=${Math.round(W * outScale)}:${Math.round(H * outScale)}:flags=lanczos`, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', 'pipe:1'], { input: png, maxBuffer: 1 << 28 });
      if (r.status !== 0) throw new Error(`ffmpeg: ${String(r.stderr).slice(-200)}`);
      png = r.stdout;
    }
    fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
    fs.writeFileSync(o.out, png);
  }
  console.log(JSON.stringify(result));
} catch (e) {
  console.error(`lab failed: ${e.message}`);
  code = 1;
} finally {
  await browser.close();
  server.closeAllConnections?.();
  await new Promise((r) => server.close(r));
}
process.exit(code);
