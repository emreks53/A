/* s15 · 67.70–72.65 · "Yoksa — نَسُوا اللّٰهَ فَاَنْسٰيهُمْ اَنْفُسَهُمْ اُولٰٓئِكَ هُمُ الْفَاسِقُونَ"
   - Yoksa (68.07): the palette turns: a single drop of ink falls and blooms; night-indigo washes flood the paper.
   - The verse (68.81–72.59) is written in gold ink, right to left, word by word with the recitation (a soft
     mask), between two plain gold rules. Crisp text on the overlay.
   KURALLAR 3 (the verse contains the Name of Allah): no brightness of any kind is tied to it — no travelling
   light at the writing point, no sheen, no glow pulse, no lifted paper or light-layer glow behind it, no
   twinkling dust; the gold is steady with only a very faint, constant, uniform warmth. The rules carry no
   medallion or other ornament at their centres (only small leaf tips at their ends) and never glint.
   No figure in this shot. */
(function () {
  const E = window.E;
  const PR = E.props;

  // ---------------------------------------------------------------- the verse (exact text, two lines)
  const WORDS = ['نَسُوا', 'اللّٰهَ', 'فَاَنْسٰيهُمْ', 'اَنْفُسَهُمْ', 'اُولٰٓئِكَ', 'هُمُ', 'الْفَاسِقُونَ'];
  const LINES = [
    { words: [0, 1, 2, 3], y: 742 },
    { words: [4, 5, 6], y: 942 },
  ];
  // reveal groups: [first word, last word, recitation word index in E.WORDS]
  const GROUPS = [[0, 1, 131], [2, 2, 132], [3, 3, 133], [4, 4, 134], [5, 5, 135], [6, 6, 136]];
  const FONT_PX = 98;
  // Scheherazade New (SIL, designed for Qur'anic text) seats every haraka tightly on its letter;
  // Amiri's marks float high above medial letters at this size.
  const FONT = `700 ${FONT_PX}px "Scheherazade New"`;
  const VC = { x: 540, y: 805 };       // verse centre (camera push-in centre)
  const DROP = { x: 540, y: 812 };     // where the ink drop lands

  // ---------------------------------------------------------------- timing
  let TM = null;
  function times(shot) {
    if (TM && TM.s === shot.start) return TM;
    const T = (i) => E.T(i) - shot.start, Te = (i) => E.Te(i) - shot.start;
    TM = { s: shot.start, yoksa: T(130) };
    TM.land = TM.yoksa + 0.06;            // the drop hits the paper on "Yoksa"
    TM.drop0 = TM.land - 0.3;
    TM.flood0 = TM.land + 0.16;           // the bloom reads on its own for a moment, then its ink runs out
    TM.frame0 = T(131) - 0.45;            // the gold rules open (from the centre) inside the spreading night...
    TM.frame1 = TM.frame0 + 0.8;          // ...and reach full width as the first word is written (never behind it)
    TM.groups = GROUPS.map(([a, b, wi]) => {
      const s0 = T(wi) - 0.07;
      const d = Math.max(0.26, (Te(wi) - T(wi)) * 0.85);
      return { a, b, t0: s0, t1: s0 + d };
    });
    TM.last = TM.groups[TM.groups.length - 1].t1;
    return TM;
  }

  // ---------------------------------------------------------------- text layout (measured once; deterministic)
  let LAY = null;
  function layout() {
    if (LAY) return LAY;
    const c = document.createElement('canvas').getContext('2d');
    c.font = FONT;
    c.direction = 'rtl';
    const lines = LINES.map((ln) => {
      const text = ln.words.map((i) => WORDS[i]).join(' ');
      const w = c.measureText(text).width;
      const xr = VC.x + w / 2;
      // right edge of every word boundary: prefix widths in logical (reading) order
      const pre = [0];
      for (let k = 1; k <= ln.words.length; k++) pre.push(c.measureText(ln.words.slice(0, k).map((i) => WORDS[i]).join(' ')).width);
      const m = c.measureText(text);
      return { ...ln, text, w, xr, xl: xr - w, pre, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
    });
    LAY = { lines };
    return LAY;
  }

  /** reveal front of a line at time lt: the line is visible for x > front (right-to-left writing).
      Returns {front, writing (0..1 activity of the pen head)} */
  function frontOf(li, lt, tm) {
    const ln = layout().lines[li];
    let front = ln.xr + 40, writing = 0;
    for (const g of tm.groups) {
      const k0 = ln.words.indexOf(g.a), k1 = ln.words.indexOf(g.b);
      if (k0 < 0) continue;
      const xa = ln.xr - ln.pre[k0] + (k0 === 0 ? 12 : -ln.pre[0]);
      const xb = ln.xr - ln.pre[k1 + 1] - (k1 + 1 === ln.words.length ? 14 : 0);
      if (lt <= g.t0) break;
      const u = E.seg(lt, g.t0, g.t1);
      front = E.lerp(xa, xb, E.ease.inOutSine(u));
      writing = u > 0 && u < 1 ? Math.sin(Math.PI * u) ** 0.5 : 0;
      if (u < 1) break;
    }
    return { front, writing };
  }

  // ---------------------------------------------------------------- camera (slow reverent push-in)
  function camAt(lt) {
    const zoom = 1 + 0.05 * E.ease.inOutSine(E.seg(lt, 0, 5.8));
    // zoom about the verse centre (VC stays where it is on screen), with a breath of drift
    return { x: VC.x + (540 - VC.x) / zoom + E.drift(lt, 5, 0.2) * 3, y: VC.y + (960 - VC.y) / zoom + E.drift(lt, 9, 0.2) * 3, zoom };
  }
  const camXf = (c) => new DOMMatrix().translate(540, 960).scale(c.zoom).translate(-c.x, -c.y);

  /** soft round wet-in-wet patch without blur filters (radial gradient; cheap at any size) */
  function softSpot(ctx, x, y, rx, ry, color, a, mode = 'multiply') {
    if (a <= 0.003 || rx <= 1) return;
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, E.rgba(color, a));
    g.addColorStop(0.55, E.rgba(color, a * 0.6));
    g.addColorStop(1, E.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
    ctx.restore();
  }

  // ---------------------------------------------------------------- night washes
  /** periodic noise around a circle (closed outlines without a seam) */
  const nC = (a, seed, f) => E.noise2(Math.cos(a) * f + 7.3, Math.sin(a) * f - 3.1, seed);
  /** organic wet-wash outline: a few broad lobes (the water finds its way), smaller cauliflower bumps at the
      edge only; the lobes scale with r, so the front keeps its character while it spreads.
      rx/ry stretch it (the paper is tall). */
  function washShape(x, y, r, seed, irr, sy = 1, n = 160) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * E.TAU;
      const k = 1 + irr * (0.85 * nC(a, seed, 1.15) + 0.32 * nC(a, seed + 5, 3.2) + 0.1 * nC(a, seed + 9, 8.5));
      pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * sy]);
    }
    return E.smoothPath(pts, true, 0.5);
  }
  /** the drop's ink floods the paper: a pale water front running ahead, then the hard-edged indigo body.
      (Values stay in the s16 night range: deep indigo, never black.) */
  function flood(pa, x, y, r, a) {
    if (r <= 2 || a <= 0) return;
    E.wash(pa, washShape(x, y, r * 1.08, 41, 0.22, 1.12), '#8A96BA', { alpha: 0.35 * a, soft: 10 });
    E.wash(pa, washShape(x, y, r, 43, 0.21, 1.12), '#3E5890', { alpha: 0.8 * a });
  }
  /** night closing in from the edges: an organic dark glaze over the whole paper except an inner pool that
      shrinks to (rx, ry) and leaves a hard drying edge there (layered, like real dried washes) */
  function edgeWash(pa, x, y, rx, ry, seed, col, a) {
    if (a <= 0.003) return;
    const p = new Path2D();
    p.rect(-200, -200, 1480, 2320);
    p.addPath(washShape(x, y, rx, seed, 0.14, ry / rx));
    pa.save();
    pa.globalCompositeOperation = 'multiply';
    pa.globalAlpha *= a;
    pa.fillStyle = col;
    pa.fill(p, 'evenodd');
    pa.restore();
  }

  // ---------------------------------------------------------------- verse rendering (overlay)
  let SC = null; // scratch canvas, fully redrawn every use
  function scratch() {
    if (!SC) { SC = document.createElement('canvas'); SC.width = 1080; SC.height = 340; }
    return SC;
  }
  const SC_TOP = 200; // line baseline sits this far below the scratch top
  let GT = null;
  /** deterministic gilding texture: warm darker and lighter blotches (built once from seeded noise) */
  function gildTex() {
    if (GT) return GT;
    GT = document.createElement('canvas');
    GT.width = GT.height = 128;
    const g = GT.getContext('2d');
    const img = g.createImageData(128, 128);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      // tileable: sample noise on a torus-ish blend of two offsets
      const n = 0.6 * E.fbm2(x / 22, y / 22, 11, 3) + 0.4 * E.noise2(x / 6, y / 6, 13);
      const k = (x + 128 * y) * 4;
      const v = n > 0 ? [255, 248, 220] : [120, 72, 24];
      img.data[k] = v[0]; img.data[k + 1] = v[1]; img.data[k + 2] = v[2];
      img.data[k + 3] = Math.min(255, Math.abs(n) * 2.2 * 255);
    }
    g.putImageData(img, 0, 0);
    return GT;
  }

  function drawLine(octx, li, lt, tm, alpha) {
    const ln = layout().lines[li];
    const { front } = frontOf(li, lt, tm);
    if (front >= ln.xr + 30) return;
    const sc = scratch();
    const s = sc.getContext('2d');
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalCompositeOperation = 'source-over';
    s.globalAlpha = 1;
    s.clearRect(0, 0, sc.width, sc.height);
    s.font = FONT;
    s.direction = 'rtl';
    s.textAlign = 'right';
    s.textBaseline = 'alphabetic';
    const by = SC_TOP;
    // a very faint, constant warmth around the ink (uniform for every word, never animated)
    s.save();
    s.shadowColor = 'rgba(214,160,80,0.22)';
    s.shadowBlur = 10;
    s.fillStyle = 'rgba(200,150,80,0.3)';
    s.fillText(ln.text, ln.xr, by);
    s.restore();
    // gold body
    const g = s.createLinearGradient(0, by - ln.asc * 0.8, 0, by + ln.desc);
    g.addColorStop(0, '#FFF2C8');
    g.addColorStop(0.45, '#F0CB7A');
    g.addColorStop(0.8, '#D49E48');
    g.addColorStop(1, '#B9843A');
    s.fillStyle = g;
    s.fillText(ln.text, ln.xr, by);
    // gold-leaf variation (soft deterministic blotches), very subtle
    s.globalCompositeOperation = 'source-atop';
    s.globalAlpha = 0.22;
    s.fillStyle = s.createPattern(gildTex(), 'repeat');
    s.fillRect(0, 0, sc.width, sc.height);
    s.globalAlpha = 1;
    // reveal mask (right to left, soft front)
    s.globalCompositeOperation = 'destination-in';
    const soft = 46;
    const mg = s.createLinearGradient(front - soft / 2, 0, front + soft / 2, 0);
    mg.addColorStop(0, 'rgba(0,0,0,0)');
    mg.addColorStop(1, 'rgba(0,0,0,1)');
    s.fillStyle = mg;
    s.fillRect(0, 0, sc.width, sc.height);
    // composite onto the overlay in verse space
    octx.save();
    octx.globalAlpha *= alpha;
    octx.drawImage(sc, 0, ln.y - by);
    octx.restore();
  }

  // ---------------------------------------------------------------- gold rules (frame lines for the verse)
  /** two horizontal gold rule groups at y ± h/2 (a main rule and a hairline outside it), each ending in a
      small slender leaf at both ends. Opaque warm gold for the dark ground, a darker edge for definition.
      Deliberately no centre ornament (no medallion / rosette) and no glow (KURALLAR 3). */
  function goldRules(L, x, y, w, h, a) {
    if (a <= 0.003) return;
    const pa = L.paint;
    const hw = w / 2, gold = '#ECCF88', edge = '#9C7434';
    pa.save();
    pa.globalAlpha *= a;
    pa.lineCap = 'round';
    for (const sy of [-1, 1]) {
      const yy = y + sy * h / 2, y2 = yy + sy * 15.5, x1 = hw * 0.9, x2 = hw * 0.84;
      // main rule and hairline
      pa.globalCompositeOperation = 'source-over';
      pa.strokeStyle = gold; pa.lineWidth = 5.2;
      pa.beginPath(); pa.moveTo(x - x1, yy); pa.lineTo(x + x1, yy); pa.stroke();
      pa.lineWidth = 2.2; pa.globalAlpha *= 0.85;
      pa.beginPath(); pa.moveTo(x - x2, y2); pa.lineTo(x + x2, y2); pa.stroke();
      pa.globalAlpha /= 0.85;
      // slender leaf tips continuing each end of the main rule (curving gently away from the verse)
      const leaves = new Path2D(), edges = new Path2D(); // (edges: the curved outline only, no seam at the rule)
      for (const sx of [-1, 1]) {
        const x0 = x + sx * x1, L1 = 46, W1 = 7.5;
        for (const P of [leaves, edges]) {
          P.moveTo(x0 - sx * 4, yy - 2.6);
          P.bezierCurveTo(x0 + sx * L1 * 0.35, yy - W1 - sy * 1, x0 + sx * L1 * 0.75, yy - sy * W1 * 0.9, x0 + sx * L1, yy + sy * 9);
          P.bezierCurveTo(x0 + sx * L1 * 0.7, yy + sy * W1 * 0.2 + 2, x0 + sx * L1 * 0.3, yy + W1 * 0.5, x0 - sx * 4, yy + 2.6);
        }
        leaves.closePath();
      }
      pa.fillStyle = gold;
      pa.fill(leaves);
      pa.globalCompositeOperation = 'multiply';
      pa.strokeStyle = E.rgba(edge, 0.7); pa.lineWidth = 1.2;
      pa.stroke(edges);
      // a fine darker line along the lower edge of the main rule gives it a gilded edge
      pa.strokeStyle = E.rgba(edge, 0.55); pa.lineWidth = 1;
      pa.beginPath(); pa.moveTo(x - x1, yy + 2.4); pa.lineTo(x + x1, yy + 2.4); pa.stroke();
    }
    pa.restore();
  }

  // ---------------------------------------------------------------- the scene
  E.scene('s15', {
    wc: [1, 1.1, 3, 0.6],
    draw(L, lt, t, shot) {
      const tm = times(shot);
      const c = camAt(lt);
      const pa = L.paint;

      // ---- the dusky paper at the end of the day (matches s14's dimmed light)
      E.skyWash(pa, '#9086A6', '#978799', { mid: '#9A8EA8', seed: 4, mottle: 0.2 });
      E.wash(pa, E.rrect(-10, -10, 1100, 1940, 0), '#5E587A', { grad: { from: [540, 820], r0: 420, r: 1200, stops: [[0, 'rgba(94,88,122,0)'], [1, 'rgba(94,88,122,0.45)']] } });

      E.camera(L, c);
      // ---- the drop: falls, lands on "Yoksa", and blooms
      // (the bloom stays as a faint cauliflower texture once the night has soaked into the paper — no dark hole
      //  behind the verse)
      const pDrop = lt < tm.land ? 0.3 * E.seg(lt, tm.drop0, tm.land) : 0.3 + 0.7 * E.seg(lt, tm.land, tm.land + 2.6);
      // (it soaks away completely before the verse reaches the centre: no blot under the sacred text)
      const dropA = 1 - 0.85 * E.ep(lt, tm.land + 0.2, tm.land + 0.95, 'inOutSine') - 0.15 * E.ep(lt, tm.land + 0.95, tm.land + 1.6, 'inOutSine');
      if (lt >= tm.drop0 && dropA > 0.002) PR.dropBloom(L, DROP.x, DROP.y, 330, { p: pDrop, color: '#26314F', seed: 7, fall: 600, dropSize: 11, alpha: dropA });
      // ---- ...and its ink floods the whole paper: night-indigo spreads out from it
      const fl = E.ease.outQuad(E.seg(lt, tm.flood0, tm.flood0 + 2.1)); // weighty: fast at first, then it slows
      flood(pa, DROP.x, DROP.y, 60 + 1750 * fl, E.clamp(fl * 8));
      // the night closes in from the edges: two organic glazes, each leaving a hard dried inner edge
      const cl1 = E.ep(lt, tm.flood0 + 0.45, tm.flood0 + 2.4, 'outCubic'), cl2 = E.ep(lt, tm.flood0 + 0.8, tm.flood0 + 2.9, 'outCubic');
      edgeWash(pa, 540, 812, E.lerp(1500, 690, cl1), E.lerp(2100, 960, cl1), 61, '#56628E', 0.42 * cl1);
      edgeWash(pa, 545, 800, E.lerp(1300, 560, cl2), E.lerp(1800, 830, cl2), 67, '#4E5684', 0.3 * cl2);
      // slow wet-in-wet blooms drifting in the dark (desaturated crimson, slate), lost edges
      const bl = E.ep(lt, tm.land + 0.5, tm.land + 2.2, 'inOutSine');
      if (bl > 0) {
        softSpot(pa, 190 + E.drift(lt, 1, 0.15) * 40, 330, 300 + 30 * lt, 260 + 26 * lt, '#7A4A62', 0.34 * bl);
        softSpot(pa, 900 + E.drift(lt, 2, 0.15) * 40, 1420, 340 + 25 * lt, 300 + 22 * lt, '#6A4A6E', 0.3 * bl);
        softSpot(pa, 880, 260 + E.drift(lt, 3, 0.15) * 30, 260 + 20 * lt, 230 + 18 * lt, '#4A5A80', 0.34 * bl);
        softSpot(pa, 150, 1300, 290 + 20 * lt, 260 + 18 * lt, '#43507A', 0.34 * bl);
      }
      // unify into night: a soft indigo vignette (darker toward the edges, the centre stays open)
      E.resetCamera(L);
      const night = E.ep(lt, tm.land + 0.2, tm.land + 1.8, 'inOutSine');
      if (night > 0) {
        E.wash(pa, E.rrect(-10, -10, 1100, 1940, 0), '#2A3156', { alpha: night, grad: { from: [540, 830], r0: 300, r: 1200, stops: [[0, 'rgba(42,49,86,0)'], [0.5, 'rgba(42,49,86,0.2)'], [1, 'rgba(36,42,74,0.45)']] } });
      }
      E.camera(L, c);
      // gold rules above and below the verse: plain double rules with small leaf tips, opening from the centre
      // (a clip that widens; no glow, no glints, no medallion) as the night arrives, just before the recitation
      const fr = E.ep(lt, tm.frame0, tm.frame1, 'inOutSine');
      if (fr > 0) {
        E.save(L);
        const hw = 30 + 480 * fr;
        E.each(L, (cx) => { cx.beginPath(); cx.rect(VC.x - hw, 0, 2 * hw, 1920); cx.clip(); });
        goldRules(L, VC.x, VC.y + 8, 860, 520, E.ep(lt, tm.frame0, tm.frame0 + 0.5, 'inOutSine'));
        E.restore(L);
      }
    },
    overlay(octx, lt, t) {
      const shot = E.SHOTS.find((s) => s.id === 's15');
      const tm = times(shot);
      const c = camAt(lt);
      octx.save();
      octx.setTransform(camXf(c));
      const out = 1 - E.ep(lt, shot.dur - 0.16, shot.dur - 0.01, 'inOutSine');   // gone before s16 shows (never over the man)
      for (let i = 0; i < LINES.length; i++) drawLine(octx, i, lt, tm, out);
      octx.restore();
    },
    sfx(shot) {
      const tm = times(shot);
      const g = (x) => shot.start + x;
      return [
        { t: g(tm.drop0 + 0.05), type: 'drone', gain: 0.28, dur: 5.4 },
        { t: g(tm.land - 0.02), type: 'bloom', gain: 0.34, pitch: 0.6 },
        { t: g(tm.land), type: 'rumble', gain: 0.18, dur: 1.8 },
      ];
    },
  });
})();
