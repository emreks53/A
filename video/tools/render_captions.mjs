#!/usr/bin/env node
// Render the elegant subtitle layer.
//   Preview over clean scene frames:  node tools/render_captions.mjs --style serif --preview 1.0,9.0,36.5,57.0 [--cols 4]
//   Full alpha layer (qtrle .mov):   node tools/render_captions.mjs --style serif --video   -> out/captions_layer.mov
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2); const opt = {};
for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); opt[k] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; }
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
const style = opt.style || 'serif';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/captions.html?style=${style}`);
await page.waitForFunction('window.READY === true', null, { timeout: 60000 });
const grab = async t => Buffer.from(await page.evaluate(t => window.grabPNG(t), t), 'base64');

if (opt.preview) {
  const times = String(opt.preview).split(',').map(Number); const dir = path.join(ROOT, 'out/captest'); fs.mkdirSync(dir, { recursive: true });
  const outs = [];
  for (const t of times) {
    const sc = tl.scenes.find(s => t >= s.start && t < s.end) || tl.scenes[tl.scenes.length - 1];
    const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'out/clips', sc.id + '.mp4.json'), 'utf8'));
    const local = t - sc.start - meta.from; const bg = path.join(dir, `bg_${t}.png`), cap = path.join(dir, `cap_${t}.png`), comp = path.join(dir, `${style}_${t}.jpg`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(local), '-i', path.join(ROOT, 'out/clips', sc.id + '.mp4'), '-frames:v', '1', bg]);
    const yavg = +execFileSync('ffmpeg', ['-loglevel', 'error', '-i', bg, '-vf', 'crop=880:260:100:1360,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-']).toString().match(/YAVG=([\d.]+)/)[1];
    await page.evaluate(([t, v]) => window.setLuma(t, v), [t, yavg / 255]);
    fs.writeFileSync(cap, await grab(t));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', bg, '-i', cap, '-filter_complex', `overlay=0:0,drawtext=fontfile=${ROOT}/assets/fonts/Nunito-900-normal.ttf:text='${style} ${t}s':x=12:y=12:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.5`, '-q:v', '2', comp]);
    outs.push(comp);
  }
  const cols = +(opt.cols || outs.length);
  const sheet = path.join(ROOT, `out/captest/${style}_sheet.jpg`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...outs.flatMap(f => ['-i', f]), '-filter_complex', outs.map((f, i) => `[${i}:v]scale=540:960[v${i}]`).join(';') + ';' + outs.map((f, i) => `[v${i}]`).join('') + `xstack=inputs=${outs.length}:layout=${outs.map((f, i) => `${(i % cols) * 540}_${Math.floor(i / cols) * 960}`).join('|')}[o]`, '-map', '[o]', '-q:v', '3', sheet]);
  console.log('sheet ->', path.relative(ROOT, sheet));
}
if (opt.video) {
  const fps = tl.fps, n = Math.round(tl.audioDuration * fps); const outFile = path.join(ROOT, opt.out || 'out/captions_layer.mov');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-c:v', 'qtrle', '-pix_fmt', 'argb', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) { const buf = await grab(i / fps); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); if (i % 300 === 0) console.log(`  ${i}/${n} ${((Date.now() - t0) / (i + 1)).toFixed(0)}ms/f`); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('->', path.relative(ROOT, outFile));
}
await browser.close(); server.close();
