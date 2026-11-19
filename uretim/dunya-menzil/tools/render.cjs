#!/usr/bin/env node
/* Headless renderer for the Dünya Menzil video engine (Playwright + Chromium/SwiftShader WebGL2).

   node tools/render.cjs stills --times 1.2,3.4 --out DIR            PNG per time (t_<time>.png)
   node tools/render.cjs shot s05 [--n 12] --out DIR                   N frames spread over a shot + contact sheet
   node tools/render.cjs clip --from 10 --to 15 [--fps 15] [--scale 0.5] --out clip.mp4   quick preview with audio
   node tools/render.cjs video --frames A:B --out part.mp4             final frames A..B-1 at 30 fps (intermediate)
   node tools/render.cjs sfx --out cues.json                           sound cue list from all scenes
*/
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const AUDIO = process.env.DM_AUDIO || path.join(ROOT, 'data', 'ses.mp3');
const args = process.argv.slice(2);
const mode = args[0];
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
};

async function open() {
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
      '--allow-file-access-from-files', '--disable-web-security', '--font-render-hinting=none'],
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.join(ROOT, 'index.html') + (process.env.DM_HASH ? '#' + process.env.DM_HASH : ''));
  await page.evaluate(() => window.E.ready);
  const cdp = await page.context().newCDPSession(page);
  const shoot = async () => {
    // wait for compositor to present the WebGL frame
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    return Buffer.from(data, 'base64');
  };
  const frame = async (t) => {
    await page.evaluate((tt) => window.E.renderFrame(tt), t);
    if (errors.length) { const e = errors.splice(0); console.error('PAGE ERROR at t=' + t + ':\n' + e.join('\n')); }
    return shoot();
  };
  return { browser, page, frame, errors };
}

(async () => {
  if (mode === 'stills') {
    const out = opt('out', 'stills');
    fs.mkdirSync(out, { recursive: true });
    const times = opt('times').split(',').map(Number);
    const r = await open();
    for (const t of times) {
      const png = await r.frame(t);
      const f = path.join(out, `t_${t.toFixed(2).padStart(6, '0')}.png`);
      fs.writeFileSync(f, png);
      console.log(f);
    }
    await r.browser.close();
  } else if (mode === 'shot') {
    const id = args[1];
    const out = opt('out', 'shot_' + id);
    const n = Number(opt('n', 12));
    fs.mkdirSync(out, { recursive: true });
    const r = await open();
    const shot = await r.page.evaluate((sid) => {
      const s = window.E.SHOTS.find((x) => x.id === sid);
      return { start: s.start, end: s.end, tail: s.tail };
    }, id);
    const a = shot.start, b = shot.end + shot.tail - 0.001;
    const files = [];
    for (let k = 0; k < n; k++) {
      const t = a + ((b - a) * k) / (n - 1);
      const png = await r.frame(t);
      const f = path.join(out, `${id}_${String(k).padStart(2, '0')}_t${t.toFixed(2)}.png`);
      fs.writeFileSync(f, png);
      files.push(f);
    }
    await r.browser.close();
    execFileSync('python3', [path.join(__dirname, 'contact.py'), path.join(out, `${id}_contact.jpg`), ...files], { stdio: 'inherit' });
    console.log(path.join(out, `${id}_contact.jpg`));
  } else if (mode === 'clip' || mode === 'video') {
    const fps = Number(opt('fps', mode === 'video' ? 30 : 15));
    let f0, f1;
    if (mode === 'video') {
      [f0, f1] = opt('frames').split(':').map(Number);
    } else {
      f0 = Math.round(Number(opt('from', 0)) * fps);
      f1 = Math.round(Number(opt('to', 5)) * fps);
    }
    const scale = Number(opt('scale', mode === 'video' ? 1 : 0.5));
    const out = opt('out', 'clip.mp4');
    const vf = scale !== 1 ? ['-vf', `scale=${Math.round(1080 * scale / 2) * 2}:${Math.round(1920 * scale / 2) * 2}:flags=lanczos`] : [];
    const enc = mode === 'video'
      ? ['-c:v', 'libx264', '-preset', 'medium', '-crf', '9', '-pix_fmt', 'yuv444p']
      : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p'];
    const audio = mode === 'clip' && fs.existsSync(AUDIO) && !args.includes('--noaudio')
      ? ['-ss', String(f0 / fps), '-t', String((f1 - f0) / fps), '-i', AUDIO] : [];
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      ...audio, ...vf, ...enc, ...(audio.length ? ['-c:a', 'aac', '-b:a', '160k', '-shortest'] : []), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const r = await open();
    const t0 = Date.now();
    for (let f = f0; f < f1; f++) {
      const png = await r.frame(f / fps);
      if (!ff.stdin.write(png)) await new Promise((res) => ff.stdin.once('drain', res));
      if ((f - f0) % 30 === 0) console.log(`frame ${f} (${((Date.now() - t0) / (f - f0 + 1)).toFixed(0)} ms/frame)`);
    }
    ff.stdin.end();
    await new Promise((res) => ff.on('close', res));
    await r.browser.close();
    console.log(out);
  } else if (mode === 'sfx') {
    const r = await open();
    const cues = await r.page.evaluate(() => window.E.collectSfx());
    fs.writeFileSync(opt('out', 'cues.json'), JSON.stringify(cues, null, 1));
    console.log(cues.length + ' cues');
    await r.browser.close();
  } else {
    console.log('modes: stills | shot | clip | video | sfx');
  }
})().catch((e) => { console.error(e); process.exit(1); });
