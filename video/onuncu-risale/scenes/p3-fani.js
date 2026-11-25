// Perde 3 — Fânilik (15.55 – 17.45): "rezil, zelil dünyada"
// Akşam renklerinde, uzaktan küçülmüş görünen sönük vadi; yapraklar düşer.
'use strict';
(() => {
  const T0 = 15.55, T1 = 17.45;
  function cam(t) {
    const c = camAt([
      // adam alt yazı hizasının (y≈1385) solunda kalsın: kadraj vadiye doğru sağa kayık
      [T0, { x: 640, y: 1150, z: 1.45 }],
      [16.35, { x: 700, y: 900, z: 0.98 }, E.out3],
      [T1, { x: 708, y: 884, z: 0.94 }, E.lin],
    ], t);
    const b = breathe(t, 0.5); c.x += b.x; c.y += b.y; c.r = b.r; return c;
  }
  function drawScene(ctx, t) {
    if (!window.P1) return;
    const c = cam(t);
    P1.drawWorld(ctx, t, c, 1);
    // sönük, soluk akşam: çarpma ile renk düşür
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.5;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6E5A8E'); g.addColorStop(0.55, '#B0807A'); g.addColorStop(1, '#5E4A6A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.35; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H); ctx.restore();
    // birkaç yaprak ağacın tacından (gökten değil) süzülür
    driftParticles(ctx, ['yaprak-3', 'yaprak-4', 'yaprak-2', 'yaprak-3'], t, { n: 8, start: T0 - 0.5, speed: 150, x0: 20, x1: 640, y0: 760, scale: 0.7, wind: 34, stagger: 1.6, seed: 44 });
  }
  Engine.add({
    name: 'p3', t0: T0, t1: T1, z: 3,
    draw(ctx, t) { withAlpha(ctx, E.io2(inv(T0 + 0.04, T0 + 0.32, t)), (c) => drawScene(c, t), 'p3'); },
  });
})();
