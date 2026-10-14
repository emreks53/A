// 2D overlay typography (Kurzgesagt-style labels, callouts, counters, quotes) drawn on top of the 3D render.
// Immediate mode: call these from scene.update(t, ctx) every frame. All times are LOCAL scene seconds.
// Layout safe zone (1080x1920 canvas): keep text inside x 80..1000, y 260..1320.
// The band y > 1380 is RESERVED for the global subtitles + YouTube Shorts UI — never put scene text there.
import * as THREE from 'three';
import { clamp, ease, prog } from './lib/util.js';

export const PALETTE = {
  white: '#ffffff', cream: '#fff4dc', gold: '#ffcf6b', amber: '#ffb347', ink: '#151a2e', night: 'rgba(16,20,38,0.72)',
  green: '#3fb67a', teal: '#3ec6c0', red: '#ff6b5e', sky: '#8fd3ff',
};

export class UI {
  constructor(canvas, W, H) { this.c = canvas; this.x = canvas.getContext('2d'); this.W = W; this.H = H; this.camera = null; }
  clear() { this.x.setTransform(1, 0, 0, 1, 0, 0); this.x.clearRect(0, 0, this.W, this.H); }

  // appear/disappear envelope: returns {a (0..1 in), o (0..1 overall visibility), s (scale)}
  env(t, t0, t1 = Infinity, dur = 0.45, anim = 'pop') {
    const a = clamp((t - t0) / dur);
    const outDur = Math.min(0.35, dur);
    const d = t1 === Infinity ? 1 : 1 - clamp((t - (t1 - outDur)) / outDur);
    const s = anim === 'pop' ? ease.outBack(a, 2.2) : 1;
    return { a, o: Math.min(ease.outCubic(a), ease.inOutCubic(d)), s: Math.max(0, s) * (0.9 + 0.1 * d), d };
  }

  font(size, weight = 900, family = 'Nunito', italic = false) { return `${italic ? 'italic ' : ''}${weight} ${size}px "${family}"`; }

  // Project a world position to overlay pixel coords.
  project(v) { const p = v.clone().project(this.camera); return [(p.x * .5 + .5) * this.W, (-p.y * .5 + .5) * this.H, p.z]; }

  // Text with optional pill background.
  // o: {x,y,t,t0,t1,size,weight,family,italic,color,align('center'|'left'|'right'),anim('pop'|'fade'|'rise'|'type'|'wipe'),
  //     bg (css color => pill), pad, radius, shadow(true), stroke(css color), strokeW, maxWidth, lineHeight, letterSpacing, dur, rotate}
  text(str, o) {
    const t = o.t, x0 = o.x ?? this.W / 2, y0 = o.y ?? this.H / 2;
    const anim = o.anim ?? 'pop';
    const e = this.env(t, o.t0 ?? 0, o.t1 ?? Infinity, o.dur ?? 0.45, anim);
    if (e.o <= 0.001) return;
    const X = this.x, size = o.size ?? 64;
    X.save();
    X.font = this.font(size, o.weight ?? 900, o.family ?? 'Nunito', o.italic);
    if ('letterSpacing' in X) X.letterSpacing = (o.letterSpacing ?? 0) + 'px';
    X.textAlign = o.align ?? 'center'; X.textBaseline = 'middle';
    const lines = this.wrap(str, o.maxWidth ?? 900);
    const lh = size * (o.lineHeight ?? 1.12);
    const widths = lines.map(l => X.measureText(l).width); const tw = Math.max(...widths), th = lh * lines.length;
    let dy = 0;
    if (anim === 'rise') dy = (1 - ease.outCubic(e.a)) * size * 0.6;
    X.globalAlpha = e.o;
    X.translate(x0, y0 + dy); if (o.rotate) X.rotate(o.rotate); X.scale(e.s, e.s);
    const ax = X.textAlign === 'center' ? -tw / 2 : X.textAlign === 'right' ? -tw : 0;
    if (o.bg) {
      const pad = o.pad ?? size * 0.42, r = o.radius ?? (th + pad) / 2;
      X.fillStyle = o.bg; X.shadowColor = 'rgba(0,0,0,0.35)'; X.shadowBlur = 24; X.shadowOffsetY = 8;
      this.rrect(ax - pad, -th / 2 - pad * 0.62, tw + pad * 2, th + pad * 1.24, Math.min(r, (th + pad * 1.24) / 2)); X.fill();
      X.shadowColor = 'transparent';
      if (o.border) { X.lineWidth = o.borderW ?? 4; X.strokeStyle = o.border; X.stroke(); }
    }
    let shown = lines;
    if (anim === 'type') { const total = str.length, n = Math.floor(total * clamp((t - (o.t0 ?? 0)) / (o.typeDur ?? 0.6))); let k = n; shown = lines.map(l => { const s = l.slice(0, Math.max(0, k)); k -= l.length + 1; return s; }); }
    if (anim === 'wipe') { const w = tw * ease.outCubic(e.a); X.beginPath(); X.rect(ax - 10, -th, w + 20, th * 2); X.clip(); }
    lines.forEach((l, i) => {
      const ly = -th / 2 + lh * (i + .5);
      if (o.shadow !== false && !o.bg) { X.shadowColor = o.shadowColor ?? 'rgba(0,0,0,0.55)'; X.shadowBlur = o.shadowBlur ?? 18; X.shadowOffsetY = o.shadowOffsetY ?? 4; }
      if (o.stroke) { X.lineJoin = 'round'; X.lineWidth = o.strokeW ?? size * 0.14; X.strokeStyle = o.stroke; X.strokeText(shown[i], 0, ly); }
      X.fillStyle = o.color ?? PALETTE.white; X.fillText(shown[i], 0, ly);
      X.shadowColor = 'transparent';
    });
    X.restore();
    return { w: tw, h: th };
  }

  wrap(str, maxW) {
    const X = this.x; const out = [];
    for (const para of String(str).split('\n')) {
      const words = para.split(' '); let line = '';
      for (const w of words) { const test = line ? line + ' ' + w : w; if (X.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test; }
      out.push(line);
    }
    return out;
  }

  rrect(x, y, w, h, r) { const X = this.x; X.beginPath(); X.moveTo(x + r, y); X.arcTo(x + w, y, x + w, y + h, r); X.arcTo(x + w, y + h, x, y + h, r); X.arcTo(x, y + h, x, y, r); X.arcTo(x, y, x + w, y, r); X.closePath(); }

  // Pill label (Kurzgesagt chip).
  pill(str, o) { return this.text(str, { size: 46, weight: 800, bg: o.bg ?? PALETTE.night, color: o.color ?? PALETTE.cream, ...o }); }

  // Callout: line from anchor (world Vector3 or [sx,sy]) to label position, with dot at anchor.
  callout(str, o) {
    const t = o.t; const e = this.env(t, o.t0 ?? 0, o.t1 ?? Infinity, o.dur ?? 0.5, 'fade'); if (e.o <= 0.001) return;
    const [ax, ay] = o.anchor.isVector3 ? this.project(o.anchor) : o.anchor;
    const [lx, ly] = o.to; const X = this.x; const p = ease.outCubic(clamp((t - (o.t0 ?? 0)) / 0.4));
    X.save(); X.globalAlpha = e.o; X.strokeStyle = o.lineColor ?? 'rgba(255,255,255,0.9)'; X.lineWidth = 4; X.lineCap = 'round';
    X.shadowColor = 'rgba(0,0,0,.4)'; X.shadowBlur = 8;
    X.beginPath(); X.arc(ax, ay, 9 * ease.outBack(clamp((t - (o.t0 ?? 0)) / .3)), 0, Math.PI * 2); X.fillStyle = o.dotColor ?? PALETTE.gold; X.fill();
    X.beginPath(); X.moveTo(ax, ay); X.lineTo(ax + (lx - ax) * p, ay + (ly - ay) * p); X.stroke(); X.restore();
    if (p > 0.6) this.pill(str, { ...o, x: lx, y: ly, t, t0: (o.t0 ?? 0) + 0.25 });
  }

  // Animated number counter: from->to between t0..t1 (ease), with format(n) -> string
  counter(o) {
    const p = prog(o.t, o.t0, o.t1, o.ease ?? 'outCubic');
    const n = o.from + (o.to - o.from) * p; const s = (o.format ?? (v => Math.round(v).toLocaleString('tr-TR')))(n);
    return this.text(s, { ...o, t0: o.appear ?? o.t0, t1: o.hide ?? Infinity, anim: o.anim ?? 'pop' });
  }

  // Quote card: italic serif text + author line, on soft dark card.
  quote(str, author, o) {
    const t = o.t, e = this.env(t, o.t0 ?? 0, o.t1 ?? Infinity, 0.6, 'fade'); if (e.o <= 0.001) return;
    const X = this.x, w = o.w ?? 860, size = o.size ?? 50, x = o.x ?? this.W / 2, y = o.y ?? 700;
    X.save(); X.font = this.font(size, 500, 'Lora', true); const lines = this.wrap(str, w - 100); const lh = size * 1.3;
    const h = lines.length * lh + (author ? 90 : 40) + 60;
    X.globalAlpha = e.o; X.translate(0, (1 - ease.outCubic(e.a)) * 30);
    X.fillStyle = o.bg ?? 'rgba(14,16,30,0.62)'; X.shadowColor = 'rgba(0,0,0,.4)'; X.shadowBlur = 30; this.rrect(x - w / 2, y - h / 2, w, h, 36); X.fill(); X.shadowColor = 'transparent';
    X.fillStyle = PALETTE.gold; X.font = this.font(140, 900, 'Lora', true); X.textAlign = 'left'; X.textBaseline = 'alphabetic'; X.fillText('“', x - w / 2 + 26, y - h / 2 + 120);
    X.font = this.font(size, 500, 'Lora', true); X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillStyle = PALETTE.cream;
    const n = Math.floor(str.length * clamp((t - (o.t0 ?? 0)) / (o.typeDur ?? 1.2))); let k = n;
    lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, k)); k -= l.length + 1; X.fillText(s, x, y - h / 2 + 50 + lh * (i + .5)); });
    if (author) { X.font = this.font(36, 800, 'Nunito'); X.fillStyle = PALETTE.gold; X.globalAlpha = e.o * clamp((t - (o.t0 ?? 0) - 0.8) / 0.4); X.fillText('— ' + author, x, y + h / 2 - 50); }
    X.restore();
  }

  // Thin animated underline / highlight bar under a point
  underline(o) { const p = ease.outCubic(clamp((o.t - o.t0) / (o.dur ?? .4))); const e = this.env(o.t, o.t0, o.t1 ?? Infinity, .3, 'fade'); if (e.o <= 0) return; const X = this.x; X.save(); X.globalAlpha = e.o; X.strokeStyle = o.color ?? PALETTE.gold; X.lineWidth = o.width ?? 8; X.lineCap = 'round'; X.beginPath(); X.moveTo(o.x - o.w / 2, o.y); X.lineTo(o.x - o.w / 2 + o.w * p, o.y); X.stroke(); X.restore(); }

  // Full-frame color wash (e.g. flash on cut)
  wash(color, alpha) { if (alpha <= 0) return; const X = this.x; X.save(); X.globalAlpha = alpha; X.fillStyle = color; X.fillRect(0, 0, this.W, this.H); X.restore(); }

  // Raw access for custom drawing
  get ctx() { return this.x; }
}
