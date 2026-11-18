#!/usr/bin/env node
// Kare kare render. Örnekler:
//   node render.mjs --kareler 3.2,14.5 --png deneme/        (tek kareler, PNG)
//   node render.mjs --sahne s01 --png deneme/ --adim 1      (sahnenin her saniyesinden bir kare)
//   node render.mjs --bas 0 --son 10 --cikti deneme/a.mp4 --olcek 0.5 --ses   (önizleme videosu, sesli)
//   node render.mjs --bas 0 --son 117 --cikti cikti/ham.mp4 --isci 4          (tam render, 4 süreç)
import { spawn, fork } from 'node:child_process';
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { tuval, W, H, FPS, fontlariYukle, KOK } from './motor/temel.mjs';
import { kompozisyon } from './motor/sahne.mjs';
import { SAHNELER, TOPLAM_SURE } from './sahneler/index.mjs';

const arg = (ad, varsayilan) => {
  const i = process.argv.indexOf('--' + ad);
  if (i < 0) return varsayilan;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};

fontlariYukle();
const olcek = parseFloat(arg('olcek', '1'));
const fps = parseFloat(arg('fps', String(FPS)));
const altyazi = arg('altyazisiz', false) ? false : true;
const ciz = kompozisyon(SAHNELER, { altyazi });
const cw = Math.round(W * olcek), ch = Math.round(H * olcek);
const c = tuval(cw, ch);
const ctx = c.getContext('2d');

function kare(t) {
  ctx.save();
  ctx.setTransform(olcek, 0, 0, olcek, 0, 0);
  ciz(ctx, t);
  ctx.restore();
}

let bas = parseFloat(arg('bas', '0'));
let son = parseFloat(arg('son', String(TOPLAM_SURE)));
const sahneAdi = arg('sahne', null);
if (sahneAdi) {
  const s = SAHNELER.find((x) => x.ad === sahneAdi);
  if (!s) throw new Error('sahne yok: ' + sahneAdi);
  bas = s.bas;
  son = s.son;
}

const pngDir = arg('png', null);
if (pngDir) {
  mkdirSync(pngDir, { recursive: true });
  let zamanlar;
  if (arg('kareler', null)) zamanlar = String(arg('kareler')).split(',').map(Number);
  else {
    const adim = parseFloat(arg('adim', '1'));
    zamanlar = [];
    for (let t = bas; t < son; t += adim) zamanlar.push(+t.toFixed(3));
  }
  for (const t of zamanlar) {
    const t0 = Date.now();
    kare(t);
    const ad = path.join(pngDir, `${sahneAdi || 'kare'}-${t.toFixed(2).padStart(6, '0')}.png`);
    writeFileSync(ad, c.toBuffer('image/png'));
    console.log(ad, Date.now() - t0, 'ms');
  }
  process.exit(0);
}

const cikti = arg('cikti', 'deneme/onizleme.mp4');
const isci = parseInt(arg('isci', '1'));
const parca = arg('parca', null); // "k/N"

const kareBas = Math.round(bas * fps), kareSon = Math.round(son * fps);

async function videoYaz(k0, k1, dosya, sesli) {
  mkdirSync(path.dirname(dosya), { recursive: true });
  const kalite = arg('crf', olcek < 1 ? '20' : '12');
  const args = ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${cw}x${ch}`, '-r', String(fps), '-i', '-'];
  if (sesli) args.push('-ss', String(k0 / fps), '-t', String((k1 - k0) / fps), '-i', path.join(KOK, 'veri', 'ses.mp3'));
  args.push('-c:v', 'libx264', '-preset', olcek < 1 ? 'veryfast' : 'medium', '-crf', String(kalite), '-pix_fmt', 'yuv420p');
  if (sesli) args.push('-c:a', 'aac', '-b:a', '160k', '-shortest');
  args.push(dosya);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let k = k0; k < k1; k++) {
    kare(k / fps);
    const buf = c.data();
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((k - k0) % 30 === 0) process.stderr.write(`\r${dosya}: ${k - k0}/${k1 - k0} kare, ${((Date.now() - t0) / Math.max(1, k - k0 + 1)).toFixed(0)} ms/kare   `);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  process.stderr.write(`\n${dosya} bitti (${((Date.now() - t0) / 1000).toFixed(1)} sn)\n`);
}

if (parca) {
  const [k, N] = parca.split('/').map(Number);
  const n = kareSon - kareBas;
  const a = kareBas + Math.floor((n * k) / N), b = kareBas + Math.floor((n * (k + 1)) / N);
  await videoYaz(a, b, cikti, false);
} else if (isci > 1) {
  const parcalar = [];
  const procs = [];
  for (let k = 0; k < isci; k++) {
    const dosya = cikti.replace(/\.mp4$/, `.parca${k}.mp4`);
    parcalar.push(dosya);
    const argv = process.argv.slice(2).filter((x, i, arr) => !(x === '--isci' || arr[i - 1] === '--isci') && !(x === '--cikti' || arr[i - 1] === '--cikti') && x !== '--ses');
    procs.push(new Promise((res, rej) => {
      const p = fork(new URL(import.meta.url).pathname, [...argv, '--parca', `${k}/${isci}`, '--cikti', dosya], { stdio: 'inherit' });
      p.on('exit', (code) => (code === 0 ? res() : rej(new Error('parça ' + k + ' hata ' + code))));
    }));
  }
  await Promise.all(procs);
  const liste = cikti.replace(/\.mp4$/, '.liste.txt');
  writeFileSync(liste, parcalar.map((p) => `file '${path.resolve(p)}'`).join('\n'));
  const sesli = !!arg('ses', false);
  const args = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', liste];
  if (sesli) args.push('-ss', String(bas), '-t', String(son - bas), '-i', path.join(KOK, 'veri', 'ses.mp3'), '-c:a', 'aac', '-b:a', '160k', '-shortest');
  args.push('-c:v', 'copy', cikti);
  await new Promise((r) => spawn('ffmpeg', args, { stdio: 'inherit' }).on('close', r));
  for (const p of parcalar) if (existsSync(p)) unlinkSync(p);
  unlinkSync(liste);
  console.log('yazıldı:', cikti);
} else {
  await videoYaz(kareBas, kareSon, cikti, !!arg('ses', false));
}
