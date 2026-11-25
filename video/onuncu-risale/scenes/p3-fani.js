// Perde 3 — Fânilik (15.55 – 17.45): "rezil, zelil dünyada"
// Akşam renklerinde, uzaktan küçülmüş görünen sönük vadi; yapraklar düşer.
'use strict';
(() => {
  const T0 = 15.55, T1 = 17.45;
  function cam(t) {
    const c = camAt([
      [T0, { x: 540, y: 1150, z: 1.45 }],
      [16.35, { x: 540, y: 880, z: 0.98 }, E.out3],
      [T1, { x: 540, y: 860, z: 0.93 }, E.lin],
    ], t);
    const b = breathe(t, 0.5); c.x += b.x; c.y += b.y; c.r = b.r; return c;
  }
  Engine.add({
    name: 'p3', t0: T0, t1: T1, z: 3,
    draw(ctx, t) {
      if (!window.P1) return;
      ctx.globalAlpha = E.io2(inv(T0 + 0.04, T0 + 0.32, t));
      const c = cam(t);
      P1.drawWorld(ctx, t, c, 1);
      // sönük, soluk akşam: çarpma ile renk düşür
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.5;
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6E5A8E'); g.addColorStop(0.55, '#B0807A'); g.addColorStop(1, '#5E4A6A');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.35; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H); ctx.restore();
      driftParticles(ctx, ['yaprak-4', 'yaprak-3', 'yaprak-4', 'yaprak-2'], t, { n: 10, start: T0 - 0.6, speed: 220, y0: -100, scale: 0.7, wind: 50, stagger: 1.4, seed: 44 });
    },
  });
})();
