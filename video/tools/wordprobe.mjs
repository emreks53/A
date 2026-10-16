#!/usr/bin/env node
// Which word does every ctx.wordTime()/wordEnd() lookup match? Runs each scene's logic over all frames (no rendering)
// twice - scene word window on original timings (default) vs on refined timings (?wwin=aligned) - and lists lookups
// that matched a different word.   node tools/wordprobe.mjs --scene s02,s03 | --all
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2); const opt = {};
for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); opt[k] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; }
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
const W = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/words.json'), 'utf8'));
const ids = opt.all ? tl.scenes.map(s => s.id) : String(opt.scene).split(',');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf', '.hdr': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=4096'] });
async function probe(id, extra) {
  const info = tl.scenes.find(s => s.id === id); const dur = info.end - info.start;
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?scene=${id}&scale=0.25&msaa=0&smaa=0&fps=30${extra}`);
  await page.waitForFunction('window.ENGINE && (window.ENGINE.ready || window.ENGINE.error)', null, { timeout: 300000 });
  const ts = []; for (let k = -15; k <= Math.round((dur + 0.5) * 30); k++) ts.push(k / 30);
  const m = await page.evaluate(ts => { ts.forEach(t => window.ENGINE.probeCamera(t)); return window.__wt || {}; }, ts);
  await page.close(); return m;
}
let bad = 0;
for (const id of ids) {
  const fixed = await probe(id, ''), old = await probe(id, '&wwin=aligned');
  const keys = [...new Set([...Object.keys(fixed), ...Object.keys(old)])];
  const diff = keys.filter(k => fixed[k] !== old[k]);
  console.log(`${id}: ${keys.length} lookups, ${diff.length} changed` + diff.map(k => `\n   ${k}: windowed-on-refined -> "${W[old[k]]?.w}" (#${old[k]}) | fixed -> "${W[fixed[k]]?.w}" (#${fixed[k]})`).join(''));
  bad += diff.length;
}
console.log('total changed lookups:', bad);
await browser.close(); server.close();
