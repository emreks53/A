/* Glosses: the modern-Turkish meaning of an archaic word appears, as an elegant subtitle, at the very first
   phoneme of that word. Only the meaning is written (no source word, no box). Words spoken < 1 s apart are
   joined on one line so neither flashes by. Drawn crisp on the overlay canvas (not watercolour-processed).
   Vertical band: 64-82% of the frame (the app's own buttons stay above it). */
(function () {
  const E = window.E;

  const FONT_FAMILY = '"Cormorant Garamond"';
  const SIZE = 74;            // px, single line
  const VERSE_SIZE = 56;
  const Y_CENTER = 1435;      // ~74.7% of 1920
  const MAX_W = 900;
  const FADE_IN = 0.26, FADE_OUT = 0.42;

  let groups = null;
  function build() {
    groups = [];
    for (const g of E.GLOSSES) {
      const item = { ...g, t0: E.T(g.from) - E.GLOSS_LEAD, wordEnd: E.Te(g.to) };
      if (g.join && groups.length) groups[groups.length - 1].items.push(item);
      else groups.push({ items: [item], tone: g.tone || 'dark', verse: !!g.verse, hold: g.hold });
    }
    groups.forEach((gr) => { gr.t0 = gr.items[0].t0; });
    groups.forEach((gr, i) => {
      const last = gr.items[gr.items.length - 1];
      let end = Math.max(last.wordEnd + 1.25, last.t0 + 2.0);
      if (gr.hold) end = gr.hold;
      const next = groups[i + 1];
      if (next && !gr.verse) end = Math.min(end, next.t0 - 0.06);
      gr.t1 = end;
    });
    E.GLOSS_GROUPS = groups;
  }

  function wrap(ctx, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /** draw a line of text with a per-character ink-flow reveal (p 0..1 per char via timing) */
  function drawLine(ctx, text, x, y, t, tStart, tone, size, alphaOut) {
    ctx.font = `600 italic ${size}px ${FONT_FAMILY}`;
    ctx.textBaseline = 'alphabetic';
    const chars = Array.from(text);
    const total = ctx.measureText(text).width;
    let cx = x - total / 2;
    const fill = tone === 'light' ? '#F7EEDB' : '#232B44';
    const halo = tone === 'light' ? 'rgba(14,16,30,0.78)' : 'rgba(250,247,238,0.95)';
    const stagger = Math.min(0.022, 0.32 / Math.max(1, chars.length));
    // halo pass (soft, no box): a blurred copy behind the text for legibility on busy paint.
    // Fast: glyphs are drawn far off-canvas and only their blurred shadow lands in place
    // (ctx.filter blur would cost ~30 ms per call).
    ctx.save();
    const OFF = 20000;
    ctx.setTransform(new DOMMatrix().translate(-OFF, 0).multiply(ctx.getTransform()));
    ctx.shadowColor = halo;
    ctx.shadowBlur = tone === 'light' ? 18 : 14;
    ctx.shadowOffsetX = OFF;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = halo;
    ctx.strokeStyle = halo;
    ctx.lineWidth = size * 0.16;
    ctx.lineJoin = 'round';
    let hx = cx;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const w = ctx.measureText(ch).width;
      const k = E.clamp((t - tStart - i * stagger) / FADE_IN);
      if (k > 0) {
        ctx.globalAlpha = E.ease.outCubic(k) * alphaOut * 0.9;
        ctx.fillText(ch, hx, y);
        ctx.strokeText(ch, hx, y);
      }
      hx += w;
    }
    ctx.restore();
    // letters
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      // measure with kerning context: advance = width(prefix+ch) - width(prefix)
      const pre = chars.slice(0, i).join('');
      const adv = ctx.measureText(pre + ch).width - ctx.measureText(pre).width;
      const k = E.clamp((t - tStart - i * stagger) / FADE_IN);
      if (k > 0) {
        const e = E.ease.outCubic(k);
        ctx.save();
        ctx.globalAlpha = e * alphaOut;
        ctx.fillStyle = fill;
        ctx.fillText(ch, x - total / 2 + ctx.measureText(pre).width, y + (1 - e) * 9);
        ctx.restore();
      }
      cx += adv;
    }
  }

  E.drawGlosses = (ctx, t) => {
    if (!groups) build();
    for (const gr of groups) {
      if (t < gr.t0 || t > gr.t1 + FADE_OUT) continue;
      const out = 1 - E.ease.inOutSine(E.seg(t, gr.t1, gr.t1 + FADE_OUT));
      const lift = E.ease.inQuad(E.seg(t, gr.t1, gr.t1 + FADE_OUT)) * 8;
      if (gr.verse) {
        const size = VERSE_SIZE;
        ctx.font = `600 italic ${size}px ${FONT_FAMILY}`;
        const lines = wrap(ctx, gr.items[0].text, 880);
        const lh = size * 1.22;
        const y0 = 1318 - ((lines.length - 1) * lh) / 2;
        lines.forEach((ln, i) => drawLine(ctx, ln, E.W / 2, y0 + i * lh - lift, t, gr.t0 + i * 0.18, gr.tone, size, out));
        continue;
      }
      // joined items: build the line progressively; earlier items keep position as later ones arrive
      ctx.font = `600 italic ${SIZE}px ${FONT_FAMILY}`;
      const sep = gr.items.length > 1 && gr.items.some((it) => /^(sonlu)$/.test(it.text)) ? ', ' : ' ';
      const full = gr.items.map((it) => it.text).join(sep);
      let size = SIZE;
      while (ctx.measureText(full).width > MAX_W && size > 48) { size -= 2; ctx.font = `600 italic ${size}px ${FONT_FAMILY}`; }
      const lines = wrap(ctx, full, MAX_W);
      const y = (gr.items[0].text && gr.tone === 'light' && E.GLOSS_GROUPS.some((g2) => g2.verse && t < g2.t1 + FADE_OUT && t > g2.t0)) ? 1530 : Y_CENTER;
      if (lines.length === 1) {
        // each item reveals at its own onset
        const totalW = ctx.measureText(full).width;
        let x = E.W / 2 - totalW / 2;
        gr.items.forEach((it, j) => {
          const txt = it.text + (j < gr.items.length - 1 ? sep : '');
          const w = ctx.measureText(txt).width;
          drawLine(ctx, txt, x + w / 2, y - lift, t, it.t0, gr.tone, size, out);
          x += w;
        });
      } else {
        const lh = size * 1.2;
        lines.forEach((ln, i) => drawLine(ctx, ln, E.W / 2, y - ((lines.length - 1) * lh) / 2 + i * lh - lift, t, gr.t0 + i * 0.15, gr.tone, size, out));
      }
    }
  };
})();
