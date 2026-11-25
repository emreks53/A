// Sahnelerde sfx(...) ile işaretlenen ses efektlerini data/sfx.json'a yazar.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.goto('file://' + path.join(root, 'index.html'));
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
const list = await page.evaluate(() => SFX.slice().sort((a, b) => a.t - b.t));
fs.writeFileSync(path.join(root, 'data/sfx.json'), JSON.stringify(list, null, 1));
console.log(list.length, 'efekt yazıldı');
await browser.close();
