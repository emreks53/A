#!/usr/bin/env node
// Deterministic renderer for the S-050 canvas engine (Playwright + ffmpeg).
//
//   node tools/render.mjs still --scene lookdev --t 2.5 | --frame 75 --out out/x.png [--scale 0.5] [--ss 2]
//   node tools/render.mjs sheet --scene lookdev --from 0 --to 6 --step 0.5 --cols 6 --out out/sheet.png [--thumb 360]
//                               (or --frames 0,15,30,…  exact frame numbers instead of from/to/step)
//   node tools/render.mjs video --scene lookdev --from 0 --to 6 --out out/x.mp4 [--scale 0.5] [--fps 30]
//                               [--workers 3] [--audio /path.wav] [--crf 14] [--preset medium] [--ss 2]
//   --frame N renders exactly the time of video frame N (t = N / fps), so stills match the video; a
//   video started with --from X renders the integer frames round(X * fps) + i, so any chunk is
//   bit-identical to the same frames of the full render.
//   --ss 2 bakes and draws at 2x and lets ffmpeg lanczos-downscale (supersampled: 4x the pixels). It is
//   the DEFAULT for every `video` at --scale 1 (with 2 workers); pass --ss 1 for a rough look only — an
//   ss 1 clip at scale 1 shows a boiling grain the final does not have. The standard MOTION PREVIEW is
//   `video --scale 0.5 --ss 2` (rendered at full resolution, lanczos to 540x960: supersampled, as
//   cheap as an ss 1 full-res clip). Use `still --ss 2` for every style review.
//   The H.264 encode uses no B-frames, a 10 s GOP and no macroblock-tree (-bf 0 -g 300, mbtree=0):
//   B-frames and frequent I-frames make the sponge grain breathe / flick, mb-tree softens the last
//   frames of the stream. [--gop N] [--x264 "key=val:key=val"] (merged over mbtree=0) [--crf N].
//
// It serves /home/user/work on a random local port for the page, and always shuts the server,
// the browsers and ffmpeg down on exit (also on error / Ctrl-C).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); // /home/user/work
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.wav': 'audio/wav', '.mp4': 'video/mp4', '.exr': 'application/octet-stream',
};

const cleanups = [];
let cleaned = false;
async function cleanup() {
  if (cleaned) return;
  cleaned = true;
  for (const fn of cleanups.reverse()) {
    try { await fn(); } catch { /* best effort */ }
  }
}
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => cleanup().then(() => process.exit(130)));

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const o = {};
  for (let i = 0; i < rest.length; i++) {
    if (!rest[i].startsWith('--')) throw new Error(`unexpected argument "${rest[i]}"`);
    const k = rest[i].slice(2);
    o[k] = rest[i + 1] !== undefined && !rest[i + 1].startsWith('--') ? rest[++i] : 'true';
  }
  return { cmd, o };
}
const num = (v, d) => (v === undefined ? d : Number(v));

// Frames come back from the page as binary PNG POSTs (no base64, no CDP string transfer —
// measured ~2x faster than toDataURL / toBlob+base64 through page.evaluate).
const pendingFrames = new Map(); // id -> resolve(Buffer)
const deliveredFrames = new Set(); // ids already received (so a retried upload is acknowledged)
let frameSeq = 0;

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname === '/__frame') {
      const chunks = [];
      req.on('data', (d) => chunks.push(d));
      req.on('end', () => {
        const id = url.searchParams.get('id');
        const done = pendingFrames.get(id);
        pendingFrames.delete(id);
        // a retried upload whose first attempt did arrive is acknowledged again (idempotent)
        res.writeHead(done || deliveredFrames.has(id) ? 204 : 404).end();
        if (done) {
          deliveredFrames.add(id);
          if (deliveredFrames.size > 400) deliveredFrames.delete(deliveredFrames.values().next().value);
          done(Buffer.concat(chunks));
        }
      });
      req.on('error', () => { /* the page retries */ });
      return;
    }
    const file = path.join(ROOT, path.normalize(decodeURIComponent(url.pathname)));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(buf);
    });
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      cleanups.push(() => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }));
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

/** Launch one browser + page on the scene and wait until everything is baked. */
async function openScene(base, scene, scale) {
  // --expose-gc: the page releases each frame's PNG blob itself (see grab). Chromium does not count
  // blob bytes as JS memory, so without it ~2 GB of dead 20 MB blobs pile up per worker in a
  // supersampled render and the uploads start to fail ("Failed to fetch") after ~90 frames per worker.
  const browser = await chromium.launch({ args: ['--js-flags=--expose-gc'] });
  cleanups.push(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}/video/index.html?scene=${encodeURIComponent(scene)}&scale=${scale}`);
  let info;
  try {
    info = await page.evaluate(() => window.__ready);
  } catch (e) {
    throw new Error(`scene "${scene}" failed to initialise: ${(errors[0] || e.message).split('\n')[0]}`);
  }
  return { browser, page, info };
}

/** Render time t in the page and return the frame as a PNG Buffer. */
async function grab(page, t) {
  const id = String(++frameSeq);
  const png = new Promise((resolve) => pendingFrames.set(id, resolve));
  await page.evaluate(async ([time, frameId]) => {
    window.__frames = window.__frames || 0;
    await window.prepareFrame(time);
    window.renderFrame(time);
    let blob = await new Promise((r) => document.getElementById('c').toBlob(r, 'image/png'));
    if (!blob) throw new Error('canvas.toBlob returned nothing (out of memory?)');
    // the upload is retried (a long render must not die of one dropped request); if it keeps failing
    // the blob store is full: collect the dead blobs of earlier frames, encode again, try again
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await fetch(`/__frame?id=${frameId}`, { method: 'POST', body: blob });
        if (res.ok) break;
        if (attempt >= 6) throw new Error(`frame upload failed (${res.status})`);
      } catch (e) {
        if (attempt >= 6) throw new Error(`frame upload failed after ${attempt} attempts: ${e.message} (PNG ${blob ? blob.size : 0} bytes)`);
        if (typeof gc === 'function') gc();
        await new Promise((r) => setTimeout(r, 200 * attempt));
        if (attempt >= 2) blob = await new Promise((r) => document.getElementById('c').toBlob(r, 'image/png'));
      }
    }
    blob = null;
    // release the PNG blobs of finished frames now (not whenever V8 happens to collect them)
    if (typeof gc === 'function' && ++window.__frames % 4 === 0) gc();
  }, [t, id]);
  return png;
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
}

/** Lanczos-downscale a PNG buffer to w x h with ffmpeg (for supersampled stills). */
function downscalePng(png, w, h) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-i', 'pipe:0',
      '-vf', `scale=${w}:${h}:flags=lanczos`, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', 'pipe:1'], { stdio: ['pipe', 'pipe', 'pipe'] });
    cleanups.push(() => { if (ff.exitCode === null) ff.kill('SIGKILL'); });
    const chunks = [];
    let err = '';
    ff.stdout.on('data', (d) => chunks.push(d));
    ff.stderr.on('data', (d) => { err += d; });
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg exited ${code}: ${err.slice(-300)}`))));
    ff.stdin.on('error', () => {});
    ff.stdin.end(png);
  });
}

async function cmdStill(o) {
  const ss = Math.max(1, Math.min(2, num(o.ss, 1)));
  const scene = o.scene || 'main', outScale = num(o.scale, 1), scale = outScale * ss, fps = num(o.fps, 30);
  const t = o.frame !== undefined ? num(o.frame, 0) / fps : num(o.t, 0), out = o.out || `out/${scene}_${o.frame !== undefined ? 'f' + o.frame : t}.png`;
  const base = await startServer();
  const { page, info } = await openScene(base, scene, scale);
  const t0 = Date.now();
  let png = await grab(page, t);
  if (ss > 1) png = await downscalePng(png, Math.round(1080 * outScale), Math.round(1920 * outScale));
  ensureDir(out);
  fs.writeFileSync(out, png);
  console.log(`still ${scene} t=${t}${ss > 1 ? ` ss=${ss}` : ''} -> ${out}  (init ${(info.engineMs + info.sceneMs).toFixed(0)} ms, frame ${Date.now() - t0} ms)`);
}

async function cmdSheet(o) {
  const scene = o.scene || 'main', cols = num(o.cols, 6), thumb = num(o.thumb, 360);
  const out = o.out || `out/${scene}_sheet.png`;
  const base = await startServer();
  const scale = Math.min(1, thumb / 1080);
  const { page, info } = await openScene(base, scene, scale);
  const from = num(o.from, 0), to = num(o.to, info.duration), step = num(o.step, 0.5);
  const fps = num(o.fps, 30);
  const times = [];
  if (o.frames) for (const f of String(o.frames).split(',')) times.push(Number(f) / fps);
  else for (let i = 0; from + i * step <= to + 1e-9; i++) times.push(+(from + i * step).toFixed(4));
  const b64 = await page.evaluate(async ([ts, nCols, cw]) => {
    const src = document.getElementById('c');
    const ch = Math.round((cw * src.height) / src.width), gap = 6, label = Math.max(18, Math.round(cw * 0.075));
    const rows = Math.ceil(ts.length / nCols);
    const sheet = document.createElement('canvas');
    sheet.width = nCols * (cw + gap) + gap;
    sheet.height = rows * (ch + label + gap) + gap;
    const g = sheet.getContext('2d');
    g.fillStyle = '#1b1716';
    g.fillRect(0, 0, sheet.width, sheet.height);
    g.font = `600 ${Math.round(label * 0.72)}px "Encode Sans", sans-serif`;
    g.textBaseline = 'middle';
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i];
      await window.prepareFrame(t);
      window.renderFrame(t);
      const x = gap + (i % nCols) * (cw + gap), y = gap + Math.floor(i / nCols) * (ch + label + gap);
      g.fillStyle = '#f3ead8';
      g.fillText(`${t.toFixed(2)} s`, x + 4, y + label / 2);
      g.drawImage(src, x, y + label, cw, ch);
    }
    return sheet.toDataURL('image/png').split(',')[1];
  }, [times, cols, thumb]);
  ensureDir(out);
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log(`sheet ${scene} ${times.length} frames [${from}..${to}] -> ${out}`);
}

async function cmdVideo(o) {
  const scene = o.scene || 'main', fps = num(o.fps, 30), crf = num(o.crf, 14);
  const outScale = num(o.scale, 1);
  // every full-size clip is supersampled unless told otherwise (an ss 1 clip at scale 1 shows grain
  // shimmer the final does not have); reduced-scale previews default to ss 1 (pass --ss 2 for motion review)
  const ss = Math.max(1, Math.min(2, num(o.ss, outScale >= 1 ? 2 : 1)));
  const scale = outScale * ss;
  const workers = Math.max(1, Math.min(8, num(o.workers, scale > 1 ? 2 : 3)));
  const out = o.out || `out/${scene}.mp4`;
  const base = await startServer();
  const tStart = Date.now();
  const pages = await Promise.all(Array.from({ length: workers }, () => openScene(base, scene, scale)));
  const info = pages[0].info;
  // integer frame indices: frame i of this clip is film frame f0 + i at t = (f0 + i) / fps — exactly
  // the time `still --frame` and a render from 0 use (from + i / fps differs in the last bit for a
  // quarter of the frames, enough to put a stepped event one frame off)
  const f0 = Math.round(num(o.from, 0) * fps), f1 = Math.round(num(o.to, info.duration) * fps);
  const from = f0 / fps, total = f1 - f0;
  if (!(total > 0)) throw new Error('empty frame range');
  const initS = (Date.now() - tStart) / 1000;

  ensureDir(out);
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', 'pipe:0'];
  if (o.audio) args.push('-ss', String(from), '-i', o.audio);
  args.push('-map', '0:v:0');
  if (o.audio) args.push('-map', '1:a:0', '-af', 'apad', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000');
  args.push(
    '-vf', (ss > 1 ? `scale=${Math.round(1080 * outScale)}:${Math.round(1920 * outScale)}:flags=lanczos,` : '')
      + 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p',
    // no B-frames: with them the fine sponge grain is sharper on P than on B frames and visibly
    // "breathes" at 7.5 Hz (measured 5–6 % detail pulsing vs < 1 % without). Long GOP (10 s; x264 still
    // puts keyframes on real cuts): an I-frame keeps ~4 % more fine detail than the P-frames around
    // it, so a 1 s GOP shows as a one-frame flick every second (ipratio=1 does not change that).
    // mbtree=0: with macroblock-tree the last frames of a stream (no future to look at) lose 5–7 % of
    // their fine grain — a visible softening at the end of every clip
    '-c:v', 'libx264', '-preset', o.preset || 'medium', '-crf', String(crf), '-bf', '0', '-g', String(num(o.gop, Math.round(fps * 10))),
    '-x264-params', ['mbtree=0', ...(o.x264 ? [o.x264] : [])].join(':'), '-pix_fmt', 'yuv420p',
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-r', String(fps), '-frames:v', String(total), '-t', (total / fps).toFixed(6), '-movflags', '+faststart', out,
  );
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  cleanups.push(() => { if (ff.exitCode === null) ff.kill('SIGKILL'); });
  let ffErr = '';
  ff.stderr.on('data', (d) => { ffErr += d; });
  const ffDone = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${ffErr.slice(-600)}`))));
  });
  ff.stdin.on('error', () => { /* surfaced through ffDone */ });

  // Workers pull contiguous chunks of frames; frames are piped to the single encoder strictly in
  // index order (small reorder buffer), so the result is frame-exact by construction.
  const CHUNK = 12;
  let nextChunk = 0, nextWrite = 0, done = 0, lastLog = 0;
  const ready = new Map();
  let writing = Promise.resolve();
  const flush = () => {
    writing = writing.then(async () => {
      while (ready.has(nextWrite)) {
        const buf = ready.get(nextWrite);
        ready.delete(nextWrite++);
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      }
    });
    return writing;
  };
  const tRender = Date.now();
  const work = async ({ page }) => {
    for (;;) {
      const a = nextChunk, b = Math.min(total, a + CHUNK);
      if (a >= total) return;
      nextChunk = b;
      for (let i = a; i < b; i++) {
        while (i - nextWrite > workers * CHUNK * 2) await new Promise((r) => setTimeout(r, 20)); // bound memory
        ready.set(i, await grab(page, (f0 + i) / fps));
        done++;
        await flush();
        const now = Date.now();
        if (now - lastLog > 2000) {
          lastLog = now;
          const el = (now - tRender) / 1000;
          console.log(`  ${done}/${total} frames  ${(el / done).toFixed(2)} s/frame  eta ${(((total - done) * el) / done).toFixed(0)} s`);
        }
      }
    }
  };
  await Promise.race([Promise.all(pages.map(work)), ffDone.then(() => { if (done < total) throw new Error('ffmpeg ended early'); })]);
  await flush();
  ff.stdin.end();
  await ffDone;
  const renderS = (Date.now() - tRender) / 1000;
  console.log(`video ${scene} ${total} frames @${fps} ss=${ss} -> ${out}  (init ${initS.toFixed(1)} s, render ${renderS.toFixed(1)} s = ${(renderS / total).toFixed(3)} s/frame, ${workers} workers)`);
  if (ss === 1 && outScale === 1) console.log('  note: ss=1 at scale 1 shows grain shimmer the final does not have — for motion review use --scale 0.5 --ss 2, for the final --ss 2');
}

const { cmd, o } = parseArgs(process.argv.slice(2));
const commands = { still: cmdStill, sheet: cmdSheet, video: cmdVideo };
if (!commands[cmd]) {
  console.error('usage: render.mjs <still|sheet|video> --scene <id> [options]   (see header of this file)');
  process.exit(2);
}
commands[cmd](o).then(cleanup, async (e) => {
  console.error(`render failed: ${e.message}`);
  await cleanup();
  process.exit(1);
});
