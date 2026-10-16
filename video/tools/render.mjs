#!/usr/bin/env node
// Render a scene with headless Chromium (SwiftShader WebGL).
//   Preview stills + contact sheet:  node tools/render.mjs --scene s01 --preview 0,1.5,3,5 [--scale 0.5]
//   Motion preview (low-res mp4):    node tools/render.mjs --scene s01 --video --fps 12 --scale 0.5 --out out/preview/s01_motion.mp4
//   Final clip (with handles):       node tools/render.mjs --scene s01 --video            (-> out/clips/s01.mp4, 30fps, 1080x1920)
// Options: --from/--to (local seconds; default -handle .. dur+handle), --quality (jpeg 0..1), --shard k/n (render every n-th chunk)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2); const opt = {};
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) { const k = args[i].slice(2); const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; opt[k] = v; } }
if (!opt.scene) { console.error('need --scene'); process.exit(1); }
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
const info = timeline.scenes.find(s => s.id === opt.scene); if (!info) { console.error('unknown scene'); process.exit(1); }
const dur = info.end - info.start; const handle = timeline.handle ?? 0.5;
const scale = +(opt.scale ?? 1); const W = 1080, H = 1920;

// tiny static server
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.hdr': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port;

// --gl llvmpipe: full Chromium (headed; run under xvfb-run) with ANGLE on desktop GL -> Mesa llvmpipe (multi-threaded,
// ~3-5x faster than SwiftShader here; verified equivalent with tools/glcompare.mjs). Default: SwiftShader (headless).
// s07/s08 (arrow volleys + storm) produce NaN-driven black blocks on llvmpipe (bloom spreads them) -> always SwiftShader.
const SWIFTSHADER_ONLY = ['s06', 's07', 's08']; // s06 since its v2.2 sand/blade shaders (3 frames with black blocks on llvmpipe)
let GL = opt.gl || process.env.RENDER_GL || 'swiftshader';
if (GL === 'llvmpipe' && SWIFTSHADER_ONLY.includes(info.id)) { console.log(`  ${info.id}: llvmpipe disabled for this scene -> SwiftShader`); GL = 'swiftshader'; }
const browser = GL === 'llvmpipe'
  ? await chromium.launch({ headless: false, args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--js-flags=--max-old-space-size=4096'] })
  : await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--js-flags=--max-old-space-size=4096'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const logs = [];
page.on('console', m => { const t = `[${m.type()}] ${m.text()}`; logs.push(t); if (m.type() === 'error' || m.type() === 'warning' || opt.verbose) console.log('page', t); });
page.on('pageerror', e => { console.log('PAGE ERROR', e.message); logs.push('pageerror ' + e.message); });
const url = `http://127.0.0.1:${port}/index.html?scene=${info.id}&scale=${scale}&msaa=${opt.msaa ?? 0}&smaa=${opt.smaa ?? 1}&fps=${opt.fps ?? timeline.fps ?? 30}`;
const tSetup = Date.now();
await page.goto(url);
await page.waitForFunction('window.ENGINE && (window.ENGINE.ready || window.ENGINE.error)', null, { timeout: 180000 });
const err = await page.evaluate('window.ENGINE.error'); if (err) { console.error('ENGINE ERROR:\n' + err); await browser.close(); server.close(); process.exit(2); }
const setupMs = await page.evaluate('window.ENGINE.setupMs');
console.log(`scene ${info.id} "${info.title}" dur=${dur.toFixed(2)}s setup=${(setupMs / 1000).toFixed(1)}s (page ${(Date.now() - tSetup) / 1000}s)`);

async function grab(t, q) { return Buffer.from(await page.evaluate(([t, q]) => window.ENGINE.grab(t, q), [t, q]), 'base64'); }

if (opt.preview) {
  const times = String(opt.preview) === 'true' ? [0, dur * .25, dur * .5, dur * .75, dur - 0.05] : String(opt.preview).split(',').map(Number);
  const dir = path.join(ROOT, 'out/preview', info.id); fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.jpg')) fs.unlinkSync(path.join(dir, f));
  const files = [];
  for (const t of times) { const t0 = Date.now(); const buf = await grab(t, 0.9); const f = path.join(dir, `t_${t.toFixed(2).padStart(6, '0')}.jpg`); fs.writeFileSync(f, buf); files.push(f); console.log(`  t=${t.toFixed(2)} ${(Date.now() - t0)}ms -> ${path.relative(ROOT, f)}`); }
  const stats = await page.evaluate('window.ENGINE.stats()'); console.log('  stats', JSON.stringify(stats));
  // contact sheet: each frame 360x640 with time label
  const cols = Math.min(files.length, +(opt.cols ?? 4)); const sheet = path.join(ROOT, 'out/preview', `${info.id}_sheet.jpg`);
  const inputs = files.flatMap(f => ['-i', f]);
  const fc = files.map((f, i) => `[${i}:v]scale=360:640,drawtext=fontfile=${ROOT}/assets/fonts/Nunito-900-normal.ttf:text='${times[i].toFixed(2)}s':x=10:y=10:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.5[v${i}]`).join(';')
    + ';' + files.map((f, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=${files.map((f, i) => `${(i % cols) * 360}_${Math.floor(i / cols) * 640}`).join('|')}:fill=black[out]`;
  if (files.length > 1) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', fc, '-map', '[out]', '-q:v', '3', sheet]);
  else fs.copyFileSync(files[0], sheet);
  console.log('  sheet ->', path.relative(ROOT, sheet));
}

if (opt.video) {
  const fps = +(opt.fps ?? timeline.fps ?? 30);
  const from = opt.from !== undefined ? +opt.from : -Math.min(handle, info.start);
  const to = opt.to !== undefined ? +opt.to : dur + Math.min(handle, timeline.audioDuration - info.end);
  const n = Math.round((to - from) * fps);
  const outFile = path.join(ROOT, opt.out ?? `out/clips/${info.id}.mp4`); fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const finalQ = !opt.out || opt.final;
  const ow = Math.round(W * (finalQ ? 1 : Math.min(1, scale)) / 2) * 2, oh = Math.round(H * (finalQ ? 1 : Math.min(1, scale)) / 2) * 2;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=${ow}:${oh}:flags=lanczos`, '-c:v', 'libx264', '-preset', finalQ ? 'slow' : 'veryfast', '-crf', finalQ ? '12' : '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const tStart = Date.now();
  for (let i = 0; i < n; i++) {
    const t = from + i / fps; const buf = await grab(t, +(opt.quality ?? (finalQ ? 0.96 : 0.85)));
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 15 === 0 || i === n - 1) { const el = (Date.now() - tStart) / 1000; process.stdout.write(`  frame ${i + 1}/${n} t=${t.toFixed(2)} ${(el / (i + 1) * 1000).toFixed(0)}ms/f eta ${((n - i - 1) * el / (i + 1) / 60).toFixed(1)}min\n`); }
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  fs.writeFileSync(outFile + '.json', JSON.stringify({ scene: info.id, from, to, fps, frames: n, start: info.start, end: info.end }));
  console.log(`  video -> ${path.relative(ROOT, outFile)} (${n} frames, ${((Date.now() - tStart) / 1000).toFixed(0)}s)`);
}
const errs = logs.filter(l => l.startsWith('[error]') || l.startsWith('pageerror'));
if (errs.length) console.log(`  ${errs.length} console errors`);
await browser.close(); server.close();
