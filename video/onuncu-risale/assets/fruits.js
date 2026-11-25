// Meyveler ve yiyecekler (dünya sofrası ve cennet ziyafeti için ortak).
'use strict';

const RED_RAMP = (base) => ramp(base, 5, { span: 0.46, cool: 16, warm: 5, chromaLight: 0.92, chromaDark: 1.02 });

// Nar (bütün). Tepesinde taç, sol üstten ışık. o.wither: 0..1 kuruma (büzüşme, solma, kahverengileşme)
function paintPomegranate(o = {}) {
  const w = 520, h = 560, seed = o.seed ?? 11, wi = o.wither ?? 0;
  const S = Paint.sprite(w, h, { seed, k: o.k ?? 1 });
  const cx = 260, cy = 318, R = 205 * (1 - wi * 0.16);
  const base = mix(o.color ?? '#B71E2C', '#6E4A2E', wi * 0.75);
  const tx = cx + 8, ty = cy - R * 0.9;
  const body = smoothPath(blobPts(cx, cy, R, R * 0.93, 30, 0.035 + wi * 0.09, seed + 1));
  S.region(body, {
    ramp: RED_RAMP(base),
    shade: Paint.sphere(cx - 14, cy - 14, R * 1.05),
    // meridyenler: tepedeki taçtan aşağı doğru
    dir: (x, y) => Math.atan2(y - (ty - 60), x - tx) + (S.r() - 0.5) * 0.3,
    len: [34, 70], wid: [12, 20], cover: 3.0, jitter: 16, jitterFreq: 0.008, noise: 0.03,
  });
  if (wi > 0.05) {
    // kırışıklar
    for (let i = 0; i < 9 * wi; i++) {
      const a = S.r() * Math.PI * 2, rr = R * (0.3 + S.r() * 0.6);
      S.dab(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, a + Math.PI / 2 + (S.r() - 0.5), 40, 5, shade(base, -0.18));
    }
  }
  // parlak ışık lekesi: kalın, açık pembe darbeler (solmuşta yok)
  const hl = 1 - wi;
  if (hl > 0.2) {
    for (let i = 0; i < 7; i++) {
      const a = -2.3 + (i / 6) * 0.75 + (S.r() - 0.5) * 0.1; const rr = R * (0.6 + S.r() * 0.12);
      S.dab(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, a + Math.PI / 2, 30 + S.r() * 22, 8 + S.r() * 5, shade(base, 0.24, 0.7, 10), { alpha: hl });
    }
    S.dab(cx - 96, cy - 112, -0.8, 40, 12, mix('#F4C2B6', base, 0.1), { alpha: hl });
    S.dab(cx - 78, cy - 132, -0.65, 18, 7, '#FFEDE4', { alpha: hl });
  }
  // taç (kaliks): kısa, dışa kıvrık çanak yapraklar
  const crown = new Path2D();
  const nS = 6, cw = 56;
  crown.moveTo(tx - cw, ty + 30);
  const tips = [];
  for (let i = 0; i < nS; i++) {
    const t0 = i / nS, t1 = (i + 1) / nS, tm = (t0 + t1) / 2;
    const xm = tx - cw + tm * 2 * cw; const out = (tm - 0.5) * 2; // -1..1
    const tipX = xm + out * (18 + S.r() * 8), tipY = ty - 30 - S.r() * 10 + Math.abs(out) * 14;
    tips.push([tipX, tipY]);
    crown.quadraticCurveTo(xm - 10 + out * 6, ty + 4, tipX, tipY);
    crown.quadraticCurveTo(xm + 8 + out * 6, ty + 2, tx - cw + t1 * 2 * cw, ty + 8);
  }
  crown.lineTo(tx + cw, ty + 30);
  crown.quadraticCurveTo(tx, ty + 46, tx - cw, ty + 30);
  crown.closePath();
  const cbase = mix(shade(base, -0.05, 1, -6), '#5A3A26', wi * 0.5);
  S.region(crown, { ramp: ramp(cbase, 4, { span: 0.36, warm: 4 }), shade: Paint.grad(tx - 60, ty - 40, tx + 70, ty + 34, 0.95, 0.12), dir: -Math.PI / 2, len: [14, 26], wid: [6, 10], cover: 3.2, rim: { w: 2.2 } });
  S.region(ellipsePath(tx, ty + 6, 34, 9), { ramp: ['#33101A', '#481622'], shade: Paint.cst(0.4), len: [10, 18], wid: [4, 7], rim: false });
  return { canvas: S.finish({ emboss: 0.6 }), px: cx, py: cy, k: S.k };
}
defSprite('nar', () => paintPomegranate());
defSprite('nar-kuru', () => paintPomegranate({ wither: 1, seed: 11 }));
