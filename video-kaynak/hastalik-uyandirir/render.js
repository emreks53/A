#!/usr/bin/env node
// Kare işleyici.
//   node render.js still <t> [out.png]                 tek kare (tam boy)
//   node render.js sheet <t0> <t1> <n> [out.png]       temas sayfası (n kare, küçültülmüş ızgara)
//   node render.js scene <id> [n] [out.png]            sahnenin temas sayfası
//   node render.js frames <id|t0:t1> <n> <dir>          tam boy kareler (inceleme için)
//   node render.js video [--from s] [--to s] [--workers 4] [--out f.mp4]
//   node render.js worker <f0> <f1> <seg.mp4>          (iç kullanım)
'use strict';
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const C = require('./engine/core');
const P = require('./engine/paint');
const G = require('./engine/gloss');
const T = require('./scenes/index');

const { W, H, FPS } = C;
const END = T.END;

let _tmpA = null, _tmpB = null, _mask = null;
function tmp(which) {
  if (which === 'A') return (_tmpA = _tmpA || createCanvas(W, H));
  if (which === 'B') return (_tmpB = _tmpB || createCanvas(W, H));
  return (_mask = _mask || createCanvas(W, H));
}

function drawScene(ctx, sc, t) {
  if (!sc._init) { if (sc.init) sc.init(); sc._init = true; }
  ctx.save();
  sc.draw(ctx, t, t - sc.start, sc);
  ctx.restore();
}

// boya darbesiyle silme maskesi
// boya darbesiyle silme maskesi: hafif çapraz, üst üste binen, kuru uçlu geniş fırça darbeleri; kenarlar yumuşatılır
let _maskRaw = null;
function paintMask(mctx, p, dir = 1, seed = 3) {
  mctx.clearRect(0, 0, W, H);
  if (p <= 0) return;
  if (p >= 0.995) { mctx.fillStyle = '#fff'; mctx.fillRect(0, 0, W, H); return; }
  _maskRaw = _maskRaw || createCanvas(W, H);
  const rx = _maskRaw.getContext('2d');
  rx.setTransform(1, 0, 0, 1, 0, 0); rx.clearRect(0, 0, W, H);
  const r = C.rng(seed);
  const rows = 17, rh = (H + 300) / rows, ang = -0.1 * dir;
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < 2; k++) {
      const delay = r.range(0, 0.3) + k * 0.12 + (i % 3) * 0.03;
      const q = C.E.inOutCubic(C.clamp((p - delay) / (1 - 0.46)));
      if (q <= 0) continue;
      const y0 = -150 + (i + 0.5) * rh + r.range(-rh * 0.25, rh * 0.25) + k * rh * 0.45;
      const len = q * (W + 700) * r.range(0.95, 1.1);
      const x0 = dir > 0 ? -350 : W + 350, x1 = x0 + dir * len;
      const y1 = y0 + Math.tan(ang) * len * dir;
      P.stroke(rx, x0, y0, x1, y1, rh * r.range(1.15, 1.6), '#ffffff', r.int(1, 1e9), { detail: 0, dry: true, taper1: r.range(0.7, 1), wob: 0.12 });
    }
  }
  mctx.save(); mctx.filter = 'blur(5px)'; mctx.drawImage(_maskRaw, 0, 0); mctx.restore();
}

function renderFrame(ctx, t) {
  const act = T.active(t);
  if (act.length === 1) {
    drawScene(ctx, act[0].sc, t);
  } else {
    const [a, b] = act; // a = önceki, b = sonraki; b.p = geçiş ilerlemesi
    const tr = b.sc.trans || { type: 'cut' };
    if (tr.type === 'dissolve' || tr.type === 'zoom') {
      drawScene(ctx, a.sc, t);
      const B = tmp('B'), bx = B.getContext('2d');
      bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, W, H);
      drawScene(bx, b.sc, t);
      ctx.save(); ctx.globalAlpha = C.E.inOutSine(b.p); ctx.drawImage(B, 0, 0); ctx.restore();
    } else if (tr.type === 'paint') {
      drawScene(ctx, a.sc, t);
      const B = tmp('B'), bx = B.getContext('2d');
      bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalCompositeOperation = 'source-over'; bx.clearRect(0, 0, W, H);
      drawScene(bx, b.sc, t);
      const M = tmp('M'), mx = M.getContext('2d');
      paintMask(mx, b.p, tr.dir || 1, tr.seed || 3);
      bx.globalCompositeOperation = 'destination-in'; bx.drawImage(M, 0, 0); bx.globalCompositeOperation = 'source-over';
      ctx.drawImage(B, 0, 0);
    } else {
      drawScene(ctx, b.p < 0.5 ? a.sc : b.sc, t);
    }
  }
  P.finish(ctx, T.finishOpts ? T.finishOpts(t) : {});  // s27'de doku kalkar
  G.draw(ctx, t);
  // açılış: siyahtan çok kısa açılma
  if (t < 0.35) { ctx.fillStyle = `rgba(8,6,14,${1 - C.E.outCubic(t / 0.35)})`; ctx.fillRect(0, 0, W, H); }
  if (T.overlay) T.overlay(ctx, t);
}

function frameCanvas(t) {
  const cv = createCanvas(W, H), ctx = cv.getContext('2d');
  renderFrame(ctx, t);
  return cv;
}

function sheet(times, out, cols = null) {
  const n = times.length;
  cols = cols || Math.min(n, n <= 4 ? n : n <= 9 ? 3 : 4);
  const rows = Math.ceil(n / cols);
  const sw = 270, sh = 480, pad = 6;
  const S = createCanvas(cols * (sw + pad) + pad, rows * (sh + pad + 22) + pad), sx = S.getContext('2d');
  sx.fillStyle = '#111'; sx.fillRect(0, 0, S.width, S.height);
  G.loadFonts();
  times.forEach((t, i) => {
    const cv = frameCanvas(t);
    const x = pad + (i % cols) * (sw + pad), y = pad + Math.floor(i / cols) * (sh + pad + 22);
    sx.drawImage(cv, x, y, sw, sh);
    sx.fillStyle = '#ddd'; sx.font = '16px "Garamond"'; sx.fillText(`t=${t.toFixed(2)}`, x + 4, y + sh + 17);
  });
  fs.writeFileSync(out, S.toBuffer('image/png'));
  console.log('yazıldı', out);
}

async function worker(f0, f1, out) {
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '10', '-pix_fmt', 'yuv444p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const cv = createCanvas(W, H), ctx = cv.getContext('2d');
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    renderFrame(ctx, f / FPS);
    const buf = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - f0) % 30 === 0) process.stderr.write(`[${f0}-${f1}] ${f} ${((Date.now() - t0) / (f - f0 + 1)).toFixed(0)}ms/kare\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
}

// Parçalı işleme: [from,to] aralığı 180 karelik parçalara bölünür; var olan parça atlanır (yalnız silinenler yeniden işlenir).
async function video(opts) {
  const from = opts.from ?? 0, to = opts.to ?? END, workers = opts.workers ?? 4, CH = opts.chunk ?? 180;
  const F0 = Math.round(from * FPS), F1 = Math.round(to * FPS);
  const dir = path.join(__dirname, 'render', 'seg'); fs.mkdirSync(dir, { recursive: true });
  const chunks = [];
  for (let a = Math.floor(F0 / CH) * CH; a < F1; a += CH) chunks.push([a, Math.min(a + CH, Math.round(END * FPS))]);
  const name = ([a, b]) => path.join(dir, `seg_${String(a).padStart(5, '0')}_${String(b).padStart(5, '0')}.mp4`);
  const todo = chunks.filter((c) => !fs.existsSync(name(c)));
  console.log(`${chunks.length} parça, işlenecek ${todo.length}`);
  let k = 0;
  const run = async () => {
    while (k < todo.length) {
      const c = todo[k++]; const tmpf = name(c) + '.part.mp4';
      await new Promise((res, rej) => { const p = spawn(process.execPath, [__filename, 'worker', c[0], c[1], tmpf], { stdio: 'inherit' }); p.on('close', (code) => (code ? rej(new Error('worker ' + code)) : res())); });
      fs.renameSync(tmpf, name(c));
    }
  };
  await Promise.all(Array.from({ length: workers }, run));
  if (opts.concat !== 0) {
    const all = []; for (let a = 0; a < Math.round(END * FPS); a += CH) all.push([a, Math.min(a + CH, Math.round(END * FPS))]);
    const missing = all.filter((c) => !fs.existsSync(name(c)));
    if (missing.length) { console.log('eksik parça var, birleştirme yapılmadı:', missing.length); return; }
    const list = path.join(dir, 'list.txt');
    fs.writeFileSync(list, all.map((c) => `file '${name(c)}'`).join('\n'));
    const out = opts.out || path.join(__dirname, 'render', 'video_noaudio.mp4');
    await new Promise((r, j) => spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out], { stdio: 'inherit' }).on('close', (c) => (c ? j(new Error('concat')) : r())));
    console.log('video:', out);
  }
}

if (require.main === module) (async () => {
  const [cmd, ...a] = process.argv.slice(2);
  if (cmd === 'still') {
    const t = parseFloat(a[0]); const cv = frameCanvas(t);
    const out = a[1] || path.join(__dirname, 'render', `still_${t.toFixed(2)}.png`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, cv.toBuffer('image/png')); console.log('yazıldı', out);
  } else if (cmd === 'sheet') {
    const t0 = parseFloat(a[0]), t1 = parseFloat(a[1]), n = parseInt(a[2] || '8');
    const times = Array.from({ length: n }, (_, i) => t0 + ((t1 - t0) * i) / Math.max(1, n - 1));
    sheet(times, a[3] || path.join(__dirname, 'render', 'sheet.png'));
  } else if (cmd === 'scene') {
    const sc = T.byId(a[0]); const n = parseInt(a[1] || '6');
    const times = Array.from({ length: n }, (_, i) => sc.start + 0.05 + ((sc.end - sc.start - 0.1) * i) / Math.max(1, n - 1));
    fs.mkdirSync(path.join(__dirname, 'render'), { recursive: true });
    sheet(times, a[2] || path.join(__dirname, 'render', `scene_${sc.id}.png`));
  } else if (cmd === 'frames') {
    let t0, t1;
    if (a[0].includes(':')) [t0, t1] = a[0].split(':').map(parseFloat); else { const sc = T.byId(a[0]); t0 = sc.start + 0.05; t1 = sc.end - 0.05; }
    const n = parseInt(a[1] || '4'), dir = a[2] || path.join(__dirname, 'render', 'frames');
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < n; i++) { const t = t0 + ((t1 - t0) * i) / Math.max(1, n - 1); fs.writeFileSync(path.join(dir, `f_${t.toFixed(2)}.png`), frameCanvas(t).toBuffer('image/png')); }
    console.log('yazıldı', dir);
  } else if (cmd === 'worker') {
    await worker(parseInt(a[0]), parseInt(a[1]), a[2]);
  } else if (cmd === 'video') {
    const o = {};
    for (let i = 0; i < a.length; i += 2) o[a[i].replace('--', '')] = a[i].includes('out') ? a[i + 1] : parseFloat(a[i + 1]);
    await video(o);
  } else {
    console.log('kullanım: still|sheet|scene|frames|video');
  }
})().catch((e) => { console.error(e); process.exit(1); });

module.exports = { renderFrame, frameCanvas };
