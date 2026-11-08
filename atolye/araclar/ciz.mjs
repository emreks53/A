#!/usr/bin/env node
// Atölye çizim aracı: bir stilin ornek.html dosyasını gerçek tarayıcıda açar, SAHNE.hazir() işaretini
// bekler ve 1024 × 1024 görseli ornek.webp olarak kaydeder. Bakmak için aynı görselin PNG'si
// atolye/.onizleme/ klasörüne de yazılır (depoya girmez).
//
// Kullanım:
//   node atolye/araclar/ciz.mjs atolye/stiller/S-001-suluboya [başka klasör ya da .html ...]
//   node atolye/araclar/ciz.mjs --hepsi
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Playwright: projede kuruluysa oradan, değilse genel kurulumdan (NODE_PATH) alınır.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const onizleme = path.join(kok, '.onizleme');
let hedefler = process.argv.slice(2);
if (hedefler.includes('--hepsi')) {
  const dizin = path.join(kok, 'stiller');
  hedefler = fs
    .readdirSync(dizin)
    .filter((d) => /^S-\d{3}-/.test(d))
    .sort()
    .map((d) => path.join(dizin, d));
}
if (!hedefler.length) {
  console.error('Kullanım: node atolye/araclar/ciz.mjs <stil-klasörü | dosya.html> ... | --hepsi');
  process.exit(1);
}
fs.mkdirSync(onizleme, { recursive: true });

const tarayici = await chromium.launch();
let hataSayisi = 0;
for (const hedef of hedefler) {
  const mutlak = path.resolve(hedef);
  const klasorMu = fs.existsSync(mutlak) && fs.statSync(mutlak).isDirectory();
  const html = klasorMu ? path.join(mutlak, 'ornek.html') : mutlak;
  if (!fs.existsSync(html)) {
    console.error(`✗ ${hedef}: ${path.basename(html)} bulunamadı`);
    hataSayisi++;
    continue;
  }
  const ad = klasorMu ? path.basename(mutlak) : path.basename(html, '.html');
  const cikti = html.replace(/\.html$/, '.webp');
  const sayfa = await tarayici.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  const notlar = [];
  sayfa.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') notlar.push(`konsol ${m.type()}: ${m.text()}`);
  });
  sayfa.on('pageerror', (e) => notlar.push(`HATA: ${e.message}`));
  sayfa.on('requestfailed', (r) => notlar.push(`HATA: yüklenemedi ${r.url()}`));
  const t0 = Date.now();
  await sayfa.goto(pathToFileURL(html).href);
  try {
    await sayfa.waitForFunction(() => window.__hazir === true, null, { timeout: 90000 });
  } catch {
    notlar.push('HATA: 90 sn içinde SAHNE.hazir() çağrılmadı; o anki görüntü alındı');
  }
  const png = path.join(onizleme, `${ad}.png`);
  await sayfa.screenshot({ path: png, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  await sayfa.close();
  const bilgi = execFileSync('python3', [path.join(kok, 'araclar', 'webp.py'), png, cikti]).toString().trim();
  console.log(`✓ ${ad} → ${path.relative(process.cwd(), cikti)} (${bilgi}, ${Date.now() - t0} ms)`);
  console.log(`  önizleme: ${png}`);
  for (const n of notlar) console.log(`  ${n}`);
  if (notlar.some((n) => n.startsWith('HATA'))) hataSayisi++;
}
await tarayici.close();
process.exit(hataSayisi ? 1 : 0);
