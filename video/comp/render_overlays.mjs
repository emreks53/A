// Render overlay frames with headless Chromium (Playwright).
//
//   node render_overlays.mjs --timeline T.json --out DIR --scale 1 --frames 0-99,140-160 [--pages 2]
//
// For every requested frame that has active elements, writes
//   DIR/over/ov_00000.png   straight-alpha RGBA (graphics composited OVER the plate)
//   DIR/add/ad_00000.png    RGBA whose rgb*alpha is additive light (screen-blended by the compositor)
// and appends one JSON line per frame to DIR/log.jsonl: {"f":..,"over":0|1,"add":0|1,"boxes":[[x0,y0,x1,y1,w]..]}
// Frames are deterministic functions of the frame number, so pages can split the work in any order.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']);
  return acc;
}, []));
const timeline = JSON.parse(fs.readFileSync(args.timeline, 'utf8'));
const scale = parseFloat(args.scale || '1');
const out = args.out;
const nPages = parseInt(args.pages || '2', 10);
const frames = [];
for (const r of (args.frames || '').split(',').filter(Boolean)) {
  const [a, b] = r.split('-').map(Number);
  for (let f = a; f <= (isNaN(b) ? a : b); f++) frames.push(f);
}
fs.mkdirSync(path.join(out, 'over'), { recursive: true });
fs.mkdirSync(path.join(out, 'add'), { recursive: true });
const log = fs.createWriteStream(path.join(out, 'log.jsonl'), { flags: 'a' });

const W = Math.round(timeline.W * scale), H = Math.round(timeline.H * scale);
const browser = await chromium.launch({
  args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text', '--allow-file-access-from-files',
         '--disable-gpu', '--hide-scrollbars'],
});

async function worker(idx, list) {
  const page = await browser.newPage({ viewport: { width: W, height: 2 * H }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error(`[page${idx}] ${m.text()}`); });
  page.on('pageerror', e => { console.error(`[page${idx}] ${e}`); process.exitCode = 2; });
  await page.goto(pathToFileURL(path.join(HERE, 'overlay', 'overlay.html')).href);
  const probe = await page.evaluate(([tl, s]) => window.ovInit(tl, s), [timeline, scale]);
  if (idx === 0) console.error('[render_overlays] font probe', JSON.stringify(probe));
  const cdp = await page.context().newCDPSession(page);
  const shot = async (y0) => {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false,
      clip: { x: 0, y: y0, width: W, height: H, scale: 1 } });
    return Buffer.from(r.data, 'base64');
  };
  await cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  let n = 0;
  for (const f of list) {
    const act = await page.evaluate(fr => window.ovActive(fr), f);
    if (!act) { log.write(JSON.stringify({ f, over: 0, add: 0, boxes: [] }) + '\n'); continue; }
    const res = await page.evaluate(fr => window.ovRender(fr), f);
    const tag = String(f).padStart(5, '0');
    if (res.over) fs.writeFileSync(path.join(out, 'over', `ov_${tag}.png`), await shot(0));
    if (res.add) fs.writeFileSync(path.join(out, 'add', `ad_${tag}.png`), await shot(H));
    log.write(JSON.stringify({ f, over: res.over ? 1 : 0, add: res.add ? 1 : 0, boxes: res.boxes }) + '\n');
    n++;
  }
  await page.close();
  return n;
}

const t0 = Date.now();
// contiguous blocks per page (better cache locality for cold-word bitmaps etc.)
const per = Math.ceil(frames.length / nPages);
const jobs = [];
for (let i = 0; i < nPages; i++) { const sl = frames.slice(i * per, (i + 1) * per); if (sl.length) jobs.push(worker(i, sl)); }
const counts = await Promise.all(jobs);
await browser.close();
await new Promise(r => log.end(r));
const nr = counts.reduce((a, b) => a + b, 0);
console.error(`[render_overlays] ${frames.length} frames requested, ${nr} with content, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
