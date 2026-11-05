// Ortak: Chromium + sayfa açma + E.ready bekleme
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sunucuBaslat } from './sunucu.mjs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
export const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function ac({ sayfaSayisi = 1, sorgu = '' } = {}) {
  const { srv, port } = await sunucuBaslat(KOK);
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--disable-frame-rate-limit', '--font-render-hinting=none', '--force-color-profile=srgb'] });
  const sayfalar = [];
  for (let i = 0; i < sayfaSayisi; i++) {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    const hatalar = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') hatalar.push(m.text()); });
    page.on('pageerror', (e) => hatalar.push('PAGEERROR ' + (e.stack || e.message)));
    await page.goto(`http://127.0.0.1:${port}/index.html${sorgu ? '?' + sorgu : ''}`);
    await page.waitForFunction(() => (window.E && window.E.ready) || window.INIT_ERROR, null, { timeout: 120000 });
    const ie = await page.evaluate(() => window.INIT_ERROR);
    if (ie) throw new Error('E.init hatası: ' + ie);
    page.hatalar = hatalar;
    sayfalar.push(page);
  }
  return { browser, srv, sayfalar, kapat: async () => { await browser.close(); srv.close(); } };
}
