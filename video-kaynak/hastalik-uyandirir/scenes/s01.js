// S01 — "Ey tahammülsüz hasta!" (0.0–2.6 sn)
// Gece odası. Yatakta huzursuz bir hasta: döner, dizini kaldırır; "hasta" denince elini alnına götürür.
// Duvar saatinin sarkacı sabırsızlığı vurgular; kamera ağır ağır yaklaşır.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const Room = require('./_room');
const { seg, E, lerp, clamp, rgba, deg } = C;

module.exports = {
  draw(ctx, t, lt) {
    // kamera: geniş plandan hastaya doğru yavaş itme
    const k = E.inOutSine(seg(t, 0, 2.8));
    const [bx, by] = R.breathe(t, 3, 4);
    R.camera(ctx, { zoom: lerp(1.04, 1.42, k), cx: lerp(530, 450, k) + bx, cy: lerp(1010, 1130, k) + by });
    Room.drawRoom(ctx, t, { clockSpeed: 1.25 });
    // huzursuzluk: 0.45'te dönüp diz kaldırır, 1.3'te ("hasta") el alna
    const toss = E.inOutCubic(seg(t, 0.35, 0.95));
    const settle = E.inOutCubic(seg(t, 1.6, 2.4));
    const kneeUp = toss * (1 - 0.45 * settle);
    const head = deg(-14) * Math.sin(seg(t, 0.3, 1.2) * Math.PI) + deg(6) * settle;
    const arm = E.inOutCubic(seg(t, 1.2, 1.75));
    const info = Room.drawPatient(ctx, { kneeUp, headTurn: head, armToHead: arm, eye: t > 1.25 && t < 1.55 ? 0 : 1, brow: 0.9, mouth: -0.6, t });
    // huzursuzluk çizgileri (başın üstünde kısa, titrek darbeler)
    const hx = info.head[0], hy = info.head[1] - 90;
    const a = C.win(t, 0.4, 2.5, 0.25, 0.4);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      for (let i = 0; i < 3; i++) {
        const ang = -Math.PI / 2 + (i - 1) * 0.55, j = Math.sin(t * 9 + i) * 4;
        const r0 = 34 + j, r1 = 62 + j;
        P.stroke(ctx, hx + Math.cos(ang) * r0, hy + Math.sin(ang) * r0, hx + Math.cos(ang) * r1, hy + Math.sin(ang) * r1, 9, '#F6E7C8', 50 + i, { detail: 0, taper1: 0.5 });
      }
      ctx.restore();
    }
    // "hasta": alında ateş — yumuşak sıcak nabız
    const fever = C.win(t, 1.3, 2.7, 0.3, 0.5) * (0.75 + 0.25 * Math.sin(t * 8));
    if (fever > 0) P.glow(ctx, hx + 10, hy + 90, 120, '#FF5A3A', 0.35 * fever, 'screen');
  },
  sfx: [
    { t: 0.05, type: 'tick', gain: 0.22 }, { t: 0.45, type: 'tick', gain: 0.18 }, { t: 0.85, type: 'tick', gain: 0.18 }, { t: 1.25, type: 'tick', gain: 0.18 },
    { t: 1.65, type: 'tick', gain: 0.16 }, { t: 2.05, type: 'tick', gain: 0.14 },
    { t: 0.42, type: 'rustle', gain: 0.35 }, { t: 1.22, type: 'rustle', gain: 0.25 },
  ],
};
