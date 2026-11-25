// Perde 2 — Lezzet (10.95 – 15.95): "cismanî olan rızıklardaki lezzetlerdir. Bu fâni,"
// Sofra, adamın yakın profili, tat halkaları; sonra akşam ışığında nimetlerin solması.
'use strict';
(() => {
  const T0 = 10.92, T1 = 15.95;
  const tLez = () => WT(20) ?? 12.75; // lezzetlerdir
  const tFani = () => WT(22);           // fâni

  defSprite('p2-duvar', () => {
    const S = Paint.sprite(W, H, { seed: 202 });
    const f = (x, y) => { const d = Math.hypot((x - 330) / 900, (y - 760) / 1250); return clamp(1.05 - d * 1.15); };
    S.region(rectPath(0, 0, W, H), {
      ramp: ['#8E3E2C', '#B1543A', '#C96E3E', '#DA8A45', '#E8A653', '#F2C06A'], shade: f,
      dir: (x, y) => -0.55 + NOISE(x * 0.002, y * 0.002) * 0.5, len: [60, 130], wid: [16, 28], cover: 2.6, rim: false, jitter: 30, jitterFreq: 0.004, noise: 0.03,
    });
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: 0 };
  });

  // sofra üstü yerleşim: yiyecek grubunun önerdiği ana takım (sofra pivotuna göre), temas gölgeleriyle
  const SOFRA = [600, 1712];
  const FALLBACK = [
    { n: 'ekmek', x: 352, y: 1724, s: 0.62, w: null }, { n: 'bal', x: 1004, y: 1528, s: 0.5, w: null },
    { n: 'uzum', x: 942, y: 1640, s: 0.62, w: 'uzum-kuru' }, { n: 'nar-acik', x: 704, y: 1648, s: 0.78, w: 'nar-acik-kuru' },
    { n: 'hurma', x: 538, y: 1806, s: 0.46, w: null },
  ];
  let _items = null;
  function items() {
    if (_items) return _items;
    const Y = window.YIYECEK; const T = Y && Y.onTableSpots;
    if (!T || !Object.keys(T).length) return (_items = FALLBACK);
    _items = Object.entries(T).filter(([, o]) => o.main).sort((a, b) => a[1].z - b[1].z)
      .map(([n, o]) => ({ n, x: SOFRA[0] + o.x, y: SOFRA[1] + o.y, s: o.s, w: o.wither, sh: o.shadow }));
    return _items;
  }
  const narAt = () => { const it = items().find((q) => q.n === 'nar-acik'); return it ? [it.x, it.y] : [704, 1648]; };

  function cam(t) {
    const c = camAt([
      // açılış: sofradaki nar altta, üstünde nar taneleri tutan el (rızık → lezzet); sonra geri çekilip adam görünür
      [T0, { x: narAt()[0], y: narAt()[1] - 235, z: 2.0 }],
      [11.22, { x: narAt()[0] - 4, y: narAt()[1] - 245, z: 1.9 }, E.lin],
      [12.1, { x: 540, y: 960, z: 1.0 }, E.io3],
      [14.4, { x: 556, y: 990, z: 1.045 }, E.ioSine],
      [15.5, { x: 640, y: 1240, z: 1.12 }, E.io2],
      [T1, { x: 640, y: 1300, z: 0.5 }, E.in3],
    ], t);
    const b = breathe(t, 0.6); c.x += b.x; c.y += b.y; c.r = b.r; return c;
  }

  function drawMan(ctx, t) {
    if (!window.ADAM || !hasSpr('adam-yakin-govde')) { ctx.fillStyle = '#2B5D78'; ctx.beginPath(); ctx.ellipse(300, 1100, 260, 380, 0, 0, 7); ctx.fill(); return; }
    const A = ADAM.yakin; const sc = 1;
    const ox = 300 - A.neck[0], oy = 1112 - A.neck[1];
    // kol: aşağıdan ağza, sonra hafifçe iner
    const up = E.io3(inv(11.15, 12.6, t)); const down = E.io2(inv(13.15, 14.2, t));
    const armRot = lerp(0.4, 0, up) + down * 0.3;
    // baş: tatma anında hafif öne/aşağı; fânilikte düşünceli eğilir
    const headRot = 0.025 * E.ioSine(inv(12.6, 13.0, t)) - 0.025 * E.ioSine(inv(13.0, 13.6, t)) + 0.09 * E.io3(inv(tFani(), tFani() + 0.9, t)) + Math.sin(t * 1.3) * 0.004; // + öne/aşağı
    drawPart(ctx, spr('adam-yakin-govde'), ox, oy, sc);
    drawPart(ctx, spr('adam-yakin-bas'), ox, oy, sc, headRot);
    drawPart(ctx, spr('adam-yakin-kol'), ox, oy, sc, armRot);
    return { mouth: [ox + A.mouth[0], oy + A.mouth[1]] };
  }

  Engine.add({
    name: 'p2', t0: T0, t1: T1, z: 2,
    draw(ctx, t) {
      const inA = E.out2(inv(10.97, 11.14, t));
      ctx.globalAlpha = inA;
      const c = cam(t);
      ctx.save(); camApply(ctx, camPar(c, 0.35)); drawSpr(ctx, spr('p2-duvar'), -60, -40, 1.12); ctx.restore();
      const wither = E.io2(inv(tFani() + 0.05, tFani() + 1.0, t));
      withCam(ctx, c, () => {
        const man = drawMan(ctx, t);
        if (hasSpr('sofra')) drawSpr(ctx, spr('sofra'), 600, 1712, 1.0);
        const Y = window.YIYECEK;
        for (const it of items()) {
          if (!hasSpr(it.n)) continue;
          const sh = it.sh && hasSpr(it.sh) ? it.sh : null;
          if (sh) drawSpr(ctx, spr(sh), it.x, it.y, it.s);
          if (it.w && wither > 0 && hasSpr(it.w)) {
            drawSpr(ctx, spr(it.n), it.x, it.y, it.s * lerp(1, 0.985, wither), 0, 1 - wither);
            drawSpr(ctx, spr(it.w), it.x, it.y, it.s, 0, wither);
          } else drawSpr(ctx, spr(it.n), it.x, it.y, it.s);
        }
        // tat: ağızdan sıcak halkalar, tanelerde parıltı
        const tl = tLez();
        if (window.UI && man && t > tl - 0.05 && t < tl + 1.8) UI.ripple(ctx, man.mouth[0] + 26, man.mouth[1], t - tl, '#FFE2B0', 210, { sector: [-1.1, 1.1] });
        if (window.UI && t > tl && t < tl + 1.5) {
          const r = rng(77);
          for (let i = 0; i < 6; i++) { const st = tl + i * 0.16; if (t < st) continue; UI.sparkle(ctx, 640 + r() * 140, 1590 + r() * 90, 26 + r() * 12, t - st, '#FFFFFF'); }
        }
      });
      // akşam: ışık turuncuya sonra mora döner
      const dusk = E.io2(inv(tFani() - 0.1, tFani() + 1.2, t));
      if (dusk > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = dusk * 0.55;
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9A6A9A'); g.addColorStop(0.6, '#C98A6A'); g.addColorStop(1, '#7A5A7A');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      // sararan yapraklar düşer
      if (t > tFani() - 0.1) driftParticles(ctx, ['yaprak-3', 'yaprak-4', 'yaprak-3', 'yaprak-2'], t, { n: 9, start: tFani() - 0.1, speed: 260, y0: -90, scale: 0.85, wind: 40, stagger: 1.0, seed: 31 });
    },
  });
  sfx(10.95, 'whoosh-out', -12, { dur: 0.9 });
  sfx(12.62, 'crunch', -22); sfx(12.75, 'shimmer', -22, { dur: 1.3 });
  sfx(14.62, 'wind', -24, { dur: 3.4 }); sfx(14.8, 'leaves', -26, { dur: 2.5 });
})();
