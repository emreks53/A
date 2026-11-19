// type.js — the source lockup of the end card (four lines on the dark walnut).
//
//   Risale-i Nur          eyebrow: small, letter-spaced, pale gold
//   ─────────────         thin gold hairline, draws from its centre
//   Sözler                the hero line
//   Yirmi Birinci Söz     italic
//   291. Sayfa            the folio
//
// House style = the film's glosses (src/engine/gloss.js): EB Garamond, warm ivory, no box, only a
// soft dark halo hugging the glyphs; every line is ONE sprite baked in init and only transformed per
// frame (quick fade, a few px rise, a horizontal settle that reads as letter-spacing closing).
// At rest every sprite sits on whole device pixels: the held card is as crisp as the font allows.
// The layout is designed for the plate's text block (meta.json -> suggested_text_block) and follows
// it if the plates are re-rendered.

const FAMILY = '"EB Garamond"';
const IVORY = '#F3EAD7', GOLD = '#E7CE9A', RULE = '#D7B36E';
const HALO = [22, 12, 6];                 // deep walnut umber

// Designed on a block 800 x 322 px (x 140..940, y 1328..1650); y = baseline, px from the block top.
export const LOCKUPS = {
  // A — the classical title card: tracked eyebrow, rule, semibold hero, italic line, tracked folio
  A: {
    lines: [
      { id: 'eyebrow', text: 'Risale-i Nur', font: '500', px: 41, track: 0.2, fill: GOLD, y: 36 },
      { id: 'hero', text: 'Sözler', font: '600', px: 112, track: 0.012, fill: IVORY, y: 162 },
      { id: 'sub', text: 'Yirmi Birinci Söz', font: 'italic 500', px: 58, track: 0.012, fill: IVORY, y: 236 },
      { id: 'folio', text: '291. Sayfa', font: '500', px: 45, track: 0.06, fill: IVORY, y: 300 },
    ],
    rule: { y: 66, half: 118, t: 1.5 },
  },
  // B — the italic hero: Sözler in a large italic, roman supporting lines
  B: {
    lines: [
      { id: 'eyebrow', text: 'Risale-i Nur', font: '500', px: 41, track: 0.2, fill: GOLD, y: 36 },
      { id: 'hero', text: 'Sözler', font: 'italic 500', px: 124, track: 0.0, fill: IVORY, y: 164 },
      { id: 'sub', text: 'Yirmi Birinci Söz', font: '500', px: 56, track: 0.02, fill: IVORY, y: 236 },
      { id: 'folio', text: '291. Sayfa', font: '500', px: 45, track: 0.06, fill: IVORY, y: 300 },
    ],
    rule: { y: 66, half: 118, t: 1.5 },
  },
  // C — the quiet one: medium weights only, a smaller hero, more air, the rule below the hero
  C: {
    lines: [
      { id: 'eyebrow', text: 'Risale-i Nur', font: '500', px: 44, track: 0.16, fill: GOLD, y: 40 },
      { id: 'hero', text: 'Sözler', font: '500', px: 100, track: 0.03, fill: IVORY, y: 146 },
      { id: 'sub', text: 'Yirmi Birinci Söz', font: 'italic 500', px: 54, track: 0.012, fill: IVORY, y: 238 },
      { id: 'folio', text: '291. Sayfa', font: '500', px: 44, track: 0.08, fill: IVORY, y: 300 },
    ],
    rule: { y: 178, half: 150, t: 1.5 },
  },
  // D — A's structure with C's voice: a medium-weight, slightly tracked hero (the same roman as the title
  //     blocked on the Sözler spine), even 33 px gaps between the three lower lines
  D: {
    lines: [
      { id: 'eyebrow', text: 'Risale-i Nur', font: '500', px: 41, track: 0.2, fill: GOLD, y: 36 },
      { id: 'hero', text: 'Sözler', font: '500', px: 116, track: 0.022, fill: IVORY, y: 166 },
      { id: 'sub', text: 'Yirmi Birinci Söz', font: 'italic 500', px: 56, track: 0.012, fill: IVORY, y: 238 },
      { id: 'folio', text: '291. Sayfa', font: '500', px: 44, track: 0.07, fill: IVORY, y: 300 },
    ],
    rule: { y: 65, half: 124, t: 2.0 },
  },
  // E — D with a semibold hero
  E: {
    lines: [
      { id: 'eyebrow', text: 'Risale-i Nur', font: '500', px: 41, track: 0.2, fill: GOLD, y: 36 },
      { id: 'hero', text: 'Sözler', font: '600', px: 112, track: 0.02, fill: IVORY, y: 166 },
      { id: 'sub', text: 'Yirmi Birinci Söz', font: 'italic 500', px: 56, track: 0.012, fill: IVORY, y: 238 },
      { id: 'folio', text: '291. Sayfa', font: '500', px: 44, track: 0.07, fill: IVORY, y: 300 },
    ],
    rule: { y: 65, half: 124, t: 2.0 },
  },
};
const DESIGN_H = 322;

function setType(ctx, L, k) {
  ctx.font = `${L.font} ${L.px * k}px ${FAMILY}`;
  ctx.letterSpacing = `${L.px * k * L.track}px`;
  ctx.fontKerning = 'normal';
  ctx.textRendering = 'optimizeLegibility';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/**
 * Bake the lockup. block = [x0, y0, x1, y1] of the plate's text block (frame px), E = engine.
 * Returns { lines: [{ id, sprite... }], rule, bbox } — draw with drawLockup.
 */
export function bakeLockup(E, block, variant = 'A', opts = {}) {
  const spec = LOCKUPS[variant] || LOCKUPS.A;
  const [bx0, by0, bx1, by1] = block;
  const cx = (bx0 + bx1) / 2;
  // the design block is 322 px tall; a smaller block shrinks the lockup, a taller one centres it
  const k = Math.min(1, (by1 - by0) / (DESIGN_H - 3), (bx1 - bx0) / 800);
  const top = Math.round((by0 + by1) / 2 - (DESIGN_H * k) / 2 + (opts.dy ?? 0));
  const shadow = opts.shadow ?? 1;
  const probe = new OffscreenCanvas(8, 8).getContext('2d');
  const lines = spec.lines.map((L) => {
    const px = L.px * k, base = Math.round(top + L.y * k);
    setType(probe, L, k);
    const m = probe.measureText(L.text);
    const inkL = m.actualBoundingBoxLeft, inkW = inkL + m.actualBoundingBoxRight;
    const asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
    const pad = Math.ceil(px * 0.55 + 10);
    const X0 = Math.floor(cx - inkW / 2 - pad), Y0 = Math.floor(base - asc - pad);
    const s = E.surface(Math.ceil(inkW + pad * 2) + 2, Math.ceil(asc + desc + pad * 2) + 2);
    const { ctx, res } = s;
    const x = cx - inkW / 2 + inkL - X0, y = base - Y0;
    setType(ctx, L, k);
    // halo: only the blurred shadow of the text is kept (the text itself is drawn far off-canvas).
    // One wide faint pass for separation from the wood grain, one tight pass that defines the edge.
    const FAR = 6000;
    const big = Math.max(0, Math.min(1, (px - 40) / 70));          // small text needs the tighter, denser halo
    const passes = [[0.30 - 0.06 * big, 0.26], [0.10, 0.46 - 0.1 * big], [0.035, 0.5]];
    ctx.fillStyle = '#000';
    for (const [blur, alpha] of passes) {
      ctx.shadowColor = `rgba(${HALO.join(', ')}, ${alpha * shadow})`;
      ctx.shadowBlur = Math.max(1.2, px * blur) * res;
      ctx.shadowOffsetX = FAR;
      ctx.shadowOffsetY = Math.max(0.8, px * 0.022) * res;
      ctx.fillText(L.text, x - FAR / res, y);
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
    ctx.fillStyle = L.fill;
    ctx.fillText(L.text, x, y);
    return {
      id: L.id, text: L.text, px, s, X0, Y0, cx, base,
      ink: [cx - inkW / 2, base - asc, cx + inkW / 2, base + desc],
    };
  });
  // the hairline: tapered, gold, with its own soft shadow; baked at full length, grown by scale
  const R = spec.rule;
  const half = R.half * k, T = R.t * Math.max(0.8, k), padX = 16, padY = 12;
  const ry = Math.round(top + R.y * k);
  const rs = E.surface(Math.ceil(half * 2) + padX * 2, padY * 2);
  {
    const { ctx, res } = rs;
    const path = () => {
      const c = rs.w / 2, y = padY, N = 40;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const u = (i / N) * 2 - 1, th = (T / 2) * (1 - Math.pow(Math.abs(u), 2.2) * 0.85);
        if (i) ctx.lineTo(c + u * half, y - th); else ctx.moveTo(c + u * half, y - th);
      }
      for (let i = N; i >= 0; i--) {
        const u = (i / N) * 2 - 1, th = (T / 2) * (1 - Math.pow(Math.abs(u), 2.2) * 0.85);
        ctx.lineTo(c + u * half, y + th);
      }
      ctx.closePath();
    };
    ctx.shadowColor = `rgba(${HALO.join(', ')}, ${0.55 * shadow})`;
    ctx.shadowBlur = 5 * res;
    ctx.shadowOffsetY = 1 * res;
    const g = ctx.createLinearGradient(rs.w / 2 - half, 0, rs.w / 2 + half, 0);
    g.addColorStop(0, 'rgba(215, 179, 110, 0)');
    g.addColorStop(0.18, RULE);
    g.addColorStop(0.82, RULE);
    g.addColorStop(1, 'rgba(215, 179, 110, 0)');
    ctx.fillStyle = g;
    path();
    ctx.fill();
  }
  const rule = { s: rs, cx, y: ry, half };
  const ink = lines.reduce((b, l) => [Math.min(b[0], l.ink[0]), Math.min(b[1], l.ink[1]), Math.max(b[2], l.ink[2]), Math.max(b[3], l.ink[3])], [1e9, 1e9, -1e9, -1e9]);
  return { variant, lines, rule, ink, k, top };
}

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const cubicOut = (u) => 1 - Math.pow(1 - u, 3);
const quartOut = (u) => 1 - Math.pow(1 - u, 4);

// the gloss constants (gloss.js): fade 0.14 s, rise settles in 0.24 s, the squeeze in 0.42 s
export const IN = 0.14, RISE_T = 0.24, SETTLE = 0.42, SQUEEZE = 0.045, RULE_T = 0.5;

/** Opacity of a line whose first visible frame is at `on` (s): exactly gloss.js — 56 %, 86 %, 98 %, 100 %. */
export function lineAlpha(t, on, fps = 30) {
  const tau = t - (on - 1 / fps);
  return tau <= 0 ? 0 : cubicOut(clamp(tau / IN));
}

/**
 * Draw the lockup at time t. `on` = { eyebrow, rule, hero, sub, folio }: the time of the first
 * visible frame of each element. ctx is in frame px.
 */
export function drawLockup(ctx, lock, t, on, fps = 30) {
  let any = false;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (const l of lock.lines) {
    const tau = t - (on[l.id] - 1 / fps);
    if (tau <= 0) continue;
    any = true;
    const alpha = cubicOut(clamp(tau / IN));
    const rise = Math.max(4, l.px * 0.11) * (1 - cubicOut(clamp(tau / RISE_T)));
    const sx = 1 + SQUEEZE * (1 - cubicOut(clamp(tau / SETTLE)));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(l.cx, l.base + rise);
    ctx.scale(sx, 1);
    ctx.drawImage(l.s.canvas, l.X0 - l.cx, l.Y0 - l.base, l.s.w, l.s.h);
    ctx.restore();
  }
  {
    const r = lock.rule, tau = t - (on.rule - 1 / fps);
    const grow = quartOut(clamp(tau / RULE_T));
    if (tau > 0 && grow > 0) {
      any = true;
      ctx.save();
      ctx.globalAlpha = clamp(tau / 0.1);
      ctx.translate(r.cx, r.y);
      ctx.scale(Math.max(0.001, grow), 1);
      ctx.drawImage(r.s.canvas, -r.s.w / 2, -r.s.h / 2, r.s.w, r.s.h);
      ctx.restore();
    }
  }
  ctx.restore();
  return any;
}

/** True once every element stands still (the text layer no longer changes). */
export function lockupSettled(t, on, fps = 30) {
  const lastLine = Math.max(on.eyebrow, on.hero, on.sub, on.folio) - 1 / fps + SETTLE;
  return t >= Math.max(lastLine, on.rule - 1 / fps + RULE_T) - 1e-9;
}
