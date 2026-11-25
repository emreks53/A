// Tüm kareleri paralel sekmelerde üretir: node tools/render.mjs <outDir> [workers=4] [t0] [t1]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.resolve(process.argv[2] || 'frames');
const workers = +(process.argv[3] || 4);
const FPS = 30;
const DUR = JSON.parse(fs.readFileSync(path.join(root, 'data/sure.json'), 'utf8')).toplam;
const t0 = process.argv[4] != null ? +process.argv[4] : 0;
const t1 = process.argv[5] != null ? +process.argv[5] : DUR;
const f0 = Math.round(t0 * FPS), f1 = Math.round(t1 * FPS);
fs.mkdirSync(outDir, { recursive: true });
const todo = [];
for (let f = f0; f < f1; f++) if (!fs.existsSync(path.join(outDir, `f${String(f).padStart(5, '0')}.png`))) todo.push(f);
console.log(`kareler ${f0}..${f1 - 1}, yapılacak ${todo.length}, işçi ${workers}`);
const chunk = Math.ceil(todo.length / workers);
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security'] });
const start = Date.now(); let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const mine = todo.slice(w * chunk, (w + 1) * chunk); if (!mine.length) return;
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log(`[w${w}] pageerror`, e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[w${w}]`, m.text()); });
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForFunction(() => window.READY === true, null, { timeout: 600000 });
  for (const f of mine) {
    const url = await page.evaluate(async (tt) => { await window.renderFrame(tt); return document.getElementById('out').toDataURL('image/png'); }, f / FPS);
    fs.writeFileSync(path.join(outDir, `f${String(f).padStart(5, '0')}.png`), Buffer.from(url.slice(22), 'base64'));
    done++;
    if (done % 30 === 0) { const el = (Date.now() - start) / 1000; console.log(`${done}/${todo.length}  ${(done / el).toFixed(2)} kare/sn  kalan ~${Math.round((todo.length - done) / (done / el))} sn`); }
  }
  await page.close();
}));
await browser.close();
console.log('bitti', ((Date.now() - start) / 1000).toFixed(1), 'sn');
