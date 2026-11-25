// Geliştirme: sayfayı açıp verilen zamanlardaki kareleri PNG olarak kaydeder.
// node tools/shot.mjs <html> <outDir> t1 t2 ...   (t: saniye)  |  --test <fnName>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , html, outDir, ...rest] = process.argv;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('file://' + path.resolve(root, html));
await page.waitForFunction(() => window.READY === true, null, { timeout: 600000 });
const t0 = Date.now();
if (rest[0] === '--test') {
  for (const fn of rest.slice(1)) {
    const url = await page.evaluate(async (f) => { await window[f](); return document.querySelector('canvas').toDataURL('image/png'); }, fn);
    fs.writeFileSync(path.join(outDir, fn + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('ok', fn, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
} else {
  for (const ts of rest) {
    const t = parseFloat(ts);
    const url = await page.evaluate(async (tt) => { await window.renderFrame(tt); return document.querySelector('#out').toDataURL('image/png'); }, t);
    const name = 't' + t.toFixed(2).padStart(6, '0') + '.png';
    fs.writeFileSync(path.join(outDir, name), Buffer.from(url.split(',')[1], 'base64'));
    console.log('ok', name, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
}
await browser.close();
