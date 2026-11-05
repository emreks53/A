// Tam render: kareleri paralel sekmelerde çizer, out/kareler/NNNNN.(png|jpg) olarak yazar.
// node tools/render.mjs [--from 0] [--to 72.41] [--workers 3] [--fmt png|jpg] [--out out/kareler] [--skip-existing]
import fs from 'node:fs';
import path from 'node:path';
import { ac, KOK } from './tarayici.mjs';
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf('--' + k); return i < 0 ? d : (a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : true); };
const fmt = arg('fmt', 'png'), outDir = path.resolve(KOK, arg('out', 'out/kareler')), workers = +arg('workers', 3);
fs.mkdirSync(outDir, { recursive: true });
const { sayfalar, kapat } = await ac({ sayfaSayisi: workers });
const total = await sayfalar[0].evaluate(() => E.totalFrames());
const f0 = Math.round(+arg('from', 0) * 30), f1 = Math.min(total, Math.round(+arg('to', 1e9) * 30));
const queue = []; for (let f = f0; f < f1; f++) { const fn = path.join(outDir, String(f).padStart(5, '0') + '.' + fmt); if (arg('skip-existing') && fs.existsSync(fn)) continue; queue.push(f); }
console.log(`kareler ${f0}..${f1 - 1} (${queue.length}), ${workers} işçi, ${fmt}`);
const tStart = Date.now(); let done = 0;
const CH = 6; // ardışık küçük parçalar (görsel dizisi önbelleği için)
const chunks = []; for (let i = 0; i < queue.length; i += CH) chunks.push(queue.slice(i, i + CH));
await Promise.all(sayfalar.map(async (page) => {
  while (chunks.length) {
    const ch = chunks.shift();
    for (const f of ch) {
      await page.evaluate((f) => E.renderFrame(f), f);
      const fn = path.join(outDir, String(f).padStart(5, '0') + '.' + fmt);
      await page.screenshot({ path: fn, type: fmt === 'jpg' ? 'jpeg' : 'png', ...(fmt === 'jpg' ? { quality: 95 } : {}) });
      done++;
      if (done % 30 === 0) { const el = (Date.now() - tStart) / 1000; console.log(`${done}/${queue.length}  ${(el / done).toFixed(2)} s/kare  kalan ~${((queue.length - done) * el / done / 60).toFixed(1)} dk`); }
    }
  }
}));
const errs = [...new Set(sayfalar.flatMap((p) => p.hatalar))];
if (errs.length) console.log('KONSOL HATALARI:\n' + errs.slice(0, 30).join('\n'));
await kapat();
console.log(`bitti: ${done} kare, ${((Date.now() - tStart) / 1000).toFixed(0)} s`);
