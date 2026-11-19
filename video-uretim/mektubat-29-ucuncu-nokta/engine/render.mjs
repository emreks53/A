// node render.mjs out.mp4 [--from=SEC] [--to=SEC] [--workers=N] [--tl=./timeline.js] [--crf=14] [--fps=30]
// Renders frames in parallel Chromium pages; each worker encodes its chunk; chunks are concatenated (video only).
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { serve, openEngine, launch } from './tools.mjs';
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const out = path.resolve(args[0]);
const tl = opt('tl', '');
const workers = +opt('workers', 3);
const fps = +opt('fps', 30);
const crf = opt('crf', '12');
const tmp = out + '.parts'; fs.mkdirSync(tmp, { recursive: true });
globalThis.__pipes = {};
const { srv, port } = await serve(async (url, body) => {
  const w = +url.match(/w=(\d+)/)[1];
  await new Promise((res, rej) => globalThis.__pipes[w].stdin.write(body, (e) => (e ? rej(e) : res())));
});
const browser = await launch();
const probe = await openEngine(browser, port, tl ? `?tl=${encodeURIComponent(tl)}` : '');
const dur = await probe.evaluate(() => ENGINE.duration); await probe.close();
const from = Math.round(+opt('from', 0) * fps), to = Math.round(+opt('to', dur) * fps);
const N = to - from; const per = Math.ceil(N / workers);
console.log(`frames ${from}..${to} (${N}) workers ${workers}`);
const t0 = Date.now(); let done = 0;
const jobs = [];
for (let w = 0; w < workers; w++) {
  const a = from + w * per, b = Math.min(to, a + per); if (a >= b) continue;
  const part = path.join(tmp, `part_${String(w).padStart(2, '0')}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1080x1920', '-r', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', part], { stdio: ['pipe', 'inherit', 'inherit'] });
  globalThis.__pipes[w] = ff;
  jobs.push((async () => {
    const page = await openEngine(browser, port, tl ? `?tl=${encodeURIComponent(tl)}` : '');
    for (let i = a; i < b; i++) {
      await page.evaluate(([i, url, fps]) => ENGINE.frameToServer(i * (30 / fps), url), [i, `http://127.0.0.1:${port}/frame?w=${w}&i=${i}`, fps]);
      done++; if (done % 30 === 0) { const el = (Date.now() - t0) / 1000; console.log(`${done}/${N}  ${(el / done * 1000).toFixed(0)} ms/frame  eta ${((N - done) * el / done).toFixed(0)}s`); }
    }
    await page.close();
    await new Promise((r) => { ff.on('close', r); ff.stdin.end(); });
    return part;
  })());
}
const parts = (await Promise.all(jobs)).sort();
await browser.close(); srv.close();
fs.writeFileSync(path.join(tmp, 'list.txt'), parts.map((p) => `file '${p}'`).join('\n'));
await new Promise((r) => spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', out], { stdio: 'inherit' }).on('close', r));
console.log('wrote', out, ((Date.now() - t0) / 1000).toFixed(1), 's');
