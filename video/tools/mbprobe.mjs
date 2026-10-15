#!/usr/bin/env node
// Motion-blur budget probe: per scene, the number of sub-frame renders the final clip needs (no rendering).
//   node tools/mbprobe.mjs --scene s01,s12
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2); const opt = {};
for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); opt[k] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; }
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf', '.hdr': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=4096'] });
for (const id of String(opt.scene).split(',')) {
  const info = tl.scenes.find(s => s.id === id); const dur = info.end - info.start;
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?scene=${id}&scale=0.25&msaa=0&smaa=0&fps=30`);
  await page.waitForFunction('window.ENGINE && (window.ENGINE.ready || window.ENGINE.error)', null, { timeout: 300000 });
  const n0 = -Math.round(0.5 * 30), n1 = Math.round((dur + Math.min(0.5, tl.audioDuration - info.end)) * 30);
  const ts = []; for (let k = n0; k < n1; k++) ts.push(k / 30);
  const smp = await page.evaluate(ts => ts.map(t => { window.ENGINE.probeCamera(t); const p = window.ENGINE._dbg.post(); return Math.max(1, Math.round((p.motionBlur && p.motionBlur.samples) || 1)); }), ts);
  await page.close();
  const total = smp.reduce((x, y) => x + y, 0), mx = Math.max(...smp), blurred = smp.filter(x => x > 1).length;
  const hist = {}; smp.forEach(x => hist[x] = (hist[x] || 0) + 1);
  console.log(JSON.stringify({ id, frames: smp.length, subframes: total, blurredFrames: blurred, max: mx, hist }));
}
await browser.close(); server.close();
