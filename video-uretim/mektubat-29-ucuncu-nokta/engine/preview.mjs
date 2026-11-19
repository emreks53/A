// node preview.mjs out_dir t1 t2 ... [--raw] [--tl=./x.js]
import fs from 'node:fs'; import path from 'node:path';
import { serve, openEngine, launch } from './tools.mjs';
const args = process.argv.slice(2);
const out = args[0]; const raw = args.includes('--raw'); const tl = (args.find((a) => a.startsWith('--tl=')) || '').slice(5);
const times = args.slice(1).filter((a) => !a.startsWith('--')).map(Number);
fs.mkdirSync(out, { recursive: true });
const { srv, port } = await serve(async () => {});
const browser = await launch();
const page = await openEngine(browser, port, tl ? `?tl=${encodeURIComponent(tl)}` : '');
for (const t of times) {
  const t0 = Date.now();
  const url = await page.evaluate(async ([t, raw]) => (raw ? ENGINE.rawScenePNG(t) : ENGINE.framePNG(t)), [t, raw]);
  const f = path.join(out, `t_${t.toFixed(2).padStart(6, '0')}.png`);
  fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
  console.log(f, Date.now() - t0, 'ms');
}
await browser.close(); srv.close();
