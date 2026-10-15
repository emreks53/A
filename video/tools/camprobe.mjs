#!/usr/bin/env node
// Camera-motion probe: runs each scene's per-frame logic WITHOUT rendering and analyses the live camera path.
// Flags speed kinks (abrupt changes of linear/angular speed between consecutive frames), cuts and dead-still spans.
//   node tools/camprobe.mjs --scene s02 [--json out/camprobe/s02.json]
//   node tools/camprobe.mjs --all                        -> out/camprobe/<id>.json + summary
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2); const opt = {};
for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); opt[k] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; }
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
const FPS = tl.fps || 30, HANDLE = tl.handle ?? 0.5;
const ids = opt.all ? tl.scenes.map(s => s.id) : String(opt.scene).split(',');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf', '.hdr': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=4096'] });

const median = xs => { const s = [...xs].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const qAngle = (q1, q2) => { const d = Math.abs(q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3]); return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI; };
const outDir = path.join(ROOT, 'out/camprobe'); fs.mkdirSync(outDir, { recursive: true });
const summary = [];

for (const id of ids) {
  const info = tl.scenes.find(s => s.id === id); const dur = info.end - info.start;
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.log(id, 'PAGE ERROR', e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html?scene=${id}&scale=0.25&msaa=0&smaa=0&fps=${FPS}`);
  await page.waitForFunction('window.ENGINE && (window.ENGINE.ready || window.ENGINE.error)', null, { timeout: 300000 });
  const err = await page.evaluate('window.ENGINE.error'); if (err) { console.log(id, 'ENGINE ERROR', err.split('\n')[0]); await page.close(); continue; }
  const n0 = -Math.round(HANDLE * FPS), n1 = Math.round((dur + HANDLE) * FPS);
  const ts = []; for (let k = n0; k <= n1; k++) ts.push(k / FPS);
  const cams = await page.evaluate(ts => ts.map(t => window.ENGINE.probeCamera(t)), ts);
  await page.close();
  // per-frame linear speed (units/s), angular speed (deg/s), fov rate (deg/s)
  const v = [], w = [], f = [];
  for (let i = 1; i < cams.length; i++) {
    const p = cams[i], q = cams[i - 1];
    v.push(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) * FPS);
    w.push(qAngle(p.slice(3, 7), q.slice(3, 7)) * FPS);
    f.push(Math.abs(p[7] - q[7]) * FPS);
  }
  const mv = median(v.filter(x => x > 1e-6)) || 1e-6, mw = median(w.filter(x => x > 1e-6)) || 1e-6;
  const cuts = [], kinks = [], still = [];
  for (let i = 1; i < v.length; i++) {
    const t = ts[i + 1];
    // a cut = one frame whose motion is way above both neighbours and the scene median
    if (v[i] > 12 * mv && v[i] > 6 * Math.max(v[i - 1], v[i + 1] ?? 0)) { cuts.push(+t.toFixed(3)); continue; }
    if (cuts.length && Math.abs(cuts[cuts.length - 1] - ts[i]) < 1e-6) continue; // frame right after a cut
    const rv = Math.abs(v[i] - v[i - 1]) / Math.max((v[i] + v[i - 1]) / 2, 0.35 * mv);
    const rw = Math.abs(w[i] - w[i - 1]) / Math.max((w[i] + w[i - 1]) / 2, 0.35 * mw);
    if (rv > 0.18 || rw > 0.25) kinks.push({ t: +t.toFixed(3), local: true, v0: +v[i - 1].toFixed(3), v1: +v[i].toFixed(3), w0: +w[i - 1].toFixed(2), w1: +w[i].toFixed(2), rv: +rv.toFixed(2), rw: +rw.toFixed(2) });
  }
  // dead-still spans (camera neither moves, turns nor zooms) longer than 0.8 s inside [0, dur]
  let s0 = null;
  for (let i = 0; i < v.length; i++) {
    const t = ts[i + 1]; const isStill = v[i] < 0.02 * mv && w[i] < 0.02 * mw && f[i] < 1e-3;
    if (isStill && s0 === null) s0 = t; if ((!isStill || i === v.length - 1) && s0 !== null) { if (t - s0 > 0.8 && t > 0 && s0 < dur) still.push([+s0.toFixed(2), +t.toFixed(2)]); s0 = null; }
  }
  const res = { id, dur, medianSpeed: +mv.toFixed(4), medianAngular: +mw.toFixed(3), cuts, still, kinks };
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify({ ...res, v: v.map(x => +x.toFixed(4)), w: w.map(x => +x.toFixed(3)) }));
  const worst = [...kinks].sort((x, y) => Math.max(y.rv, y.rw) - Math.max(x.rv, x.rw)).slice(0, 6);
  console.log(`${id}: cuts=${JSON.stringify(cuts)} still=${JSON.stringify(still)} kinks=${kinks.length} worst=${JSON.stringify(worst.map(k => [k.t, k.rv, k.rw]))}`);
  summary.push(res);
}
if (opt.all) fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));
await browser.close(); server.close();
