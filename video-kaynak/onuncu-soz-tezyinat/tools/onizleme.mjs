// Önizleme: belirli zamanlardaki kareleri çizer ve etiketli bir temas sayfası (contact sheet) yapar.
// Kullanım:
//   node tools/onizleme.mjs --t 2.5,3,3.6 [--only B_bahce] [--out out/onizleme/B.jpg] [--cols 4] [--w 300] [--full] [--noglosses]
//   node tools/onizleme.mjs --range 2.3:6.7:0.4 ...
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ac, KOK } from './tarayici.mjs';
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf('--' + k); return i < 0 ? d : (a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : true); };
let times = [];
if (arg('t')) times = String(arg('t')).split(',').map(Number);
if (arg('range')) { const [s, e, st] = String(arg('range')).split(':').map(Number); for (let x = s; x <= e + 1e-6; x += st) times.push(+x.toFixed(3)); }
if (!times.length) { console.error('--t ya da --range gerekli'); process.exit(1); }
const out = path.resolve(KOK, arg('out', 'out/onizleme/sayfa.jpg'));
const cols = +arg('cols', Math.min(times.length, 5)), w = +arg('w', 300);
const sorgu = [arg('only') ? 'only=' + arg('only') : '', arg('noglosses') ? 'noglosses' : '', arg('nopost') ? 'nopost' : ''].filter(Boolean).join('&');
fs.mkdirSync(path.dirname(out), { recursive: true });
const tmp = fs.mkdtempSync(path.join(KOK, 'out', '.tmp-'));
const { sayfalar, kapat } = await ac({ sorgu });
const page = sayfalar[0];
const files = [];
for (const t of times) {
  const t0 = Date.now();
  await page.evaluate((t) => E.renderFrame(Math.round(t * E.FPS), t), t);
  const f = path.join(tmp, `t_${t.toFixed(2)}.png`);
  await page.screenshot({ path: f, type: 'png' });
  files.push([t, f]);
  process.stdout.write(`t=${t.toFixed(2)} ${Date.now() - t0}ms  `);
}
console.log();
if (page.hatalar.length) console.log('KONSOL HATALARI:\n' + [...new Set(page.hatalar)].slice(0, 20).join('\n'));
await kapat();
if (arg('full')) { const fd = path.join(path.dirname(out), path.basename(out, path.extname(out)) + '_kareler'); fs.mkdirSync(fd, { recursive: true }); for (const [t, f] of files) fs.copyFileSync(f, path.join(fd, `t_${t.toFixed(2)}.png`)); console.log('tam kareler:', fd); }
const margs = [];
for (const [t, f] of files) margs.push('-label', `${t.toFixed(2)}s`, f);
execFileSync('montage', [...margs, '-tile', `${cols}x`, '-geometry', `${w}x${Math.round(w * 16 / 9)}+4+4`, '-background', '#222', '-fill', '#fff', '-pointsize', '18', '-quality', '88', out]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('sayfa:', out);
