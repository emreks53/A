#!/usr/bin/env node
// Renderer consistency check: render the same frames (no motion blur) with SwiftShader and with Mesa llvmpipe and
// compare (PSNR + side-by-side). Must run under an X display: xvfb-run -a node tools/glcompare.mjs --scene s04 --t 1,3,5
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2); const opt = {};
for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); opt[k] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; }
const OUT = opt.out || path.join(ROOT, 'out/glcompare'); fs.mkdirSync(OUT, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf', '.hdr': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const R = {
  sw: await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=4096'] }),
  lp: await chromium.launch({ headless: false, args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=4096'] }),
};
for (const id of String(opt.scene).split(',')) {
  const times = String(opt.t).split(',').map(Number);
  const files = {};
  for (const [k, b] of Object.entries(R)) {
    const page = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?scene=${id}&scale=1&msaa=0&smaa=1&fps=30&nomb=1`);
    await page.waitForFunction('window.ENGINE && (window.ENGINE.ready || window.ENGINE.error)', null, { timeout: 300000 });
    const err = await page.evaluate('window.ENGINE.error || ""'); if (err) { console.log(id, k, 'ERROR', err.split('\n')[0]); await page.close(); continue; }
    files[k] = [];
    for (const t of times) { const t0 = Date.now(); const b64 = await page.evaluate(t => window.ENGINE.grab(t, 0.95), t); const f = path.join(OUT, `${id}_${k}_${t.toFixed(2)}.jpg`); fs.writeFileSync(f, Buffer.from(b64, 'base64')); files[k].push([f, Date.now() - t0]); }
    await page.close();
  }
  times.forEach((t, i) => {
    const [fs_, msS] = files.sw[i], [fl, msL] = files.lp[i];
    const ps = execFileSync('ffmpeg', ['-i', fs_, '-i', fl, '-lavfi', 'psnr', '-f', 'null', '-'], { stdio: ['ignore', 'pipe', 'pipe'] }).toString() + '';
    let psnr = null; try { psnr = +execFileSync('sh', ['-c', `ffmpeg -i "${fs_}" -i "${fl}" -lavfi psnr -f null - 2>&1 | grep -o 'average:[0-9.inf]*' | cut -d: -f2`]).toString().trim(); } catch (e) {}
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', fs_, '-i', fl, '-filter_complex', '[0]scale=540:960[a];[1]scale=540:960[b];[a][b]hstack', path.join(OUT, `${id}_cmp_${t.toFixed(2)}.jpg`)]);
    console.log(JSON.stringify({ id, t, psnr, swMs: msS, lpMs: msL }));
  });
}
await R.sw.close(); await R.lp.close(); server.close();
