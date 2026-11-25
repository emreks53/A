// Sahnelerin ortak yardımcıları.
'use strict';
const REF = { x: 540, y: 960 }; // geniş planın merkezi (paralaks referansı)

// paralakslı kamera: p=1 tam kamera, p=0 sabit
function camPar(cam, p) {
  return { x: REF.x + (cam.x - REF.x) * p, y: REF.y + (cam.y - REF.y) * p, z: Math.exp(Math.log(cam.z) * p), r: (cam.r || 0) * p };
}
function withCam(ctx, cam, fn) { ctx.save(); camApply(ctx, cam); fn(); ctx.restore(); }
// dünya noktasını ekrana çevir
function w2s(cam, x, y) { return [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2]; }

// ortak çerçeveli parçaları hizalı çiz: (ox,oy) çerçevenin (0,0) noktasının yeri, sc ölçek, rot eklem dönüşü
function drawPart(ctx, s, ox, oy, sc = 1, rot = 0, alpha = 1) {
  const k = s.k || 1; const jx = ox + (s.px * sc) / k, jy = oy + (s.py * sc) / k;
  drawSpr(ctx, s, jx, jy, sc, rot, alpha);
}
const hasSpr = (n) => !!SPRITE_DEFS[n];
const sprOr = (n, fb) => (hasSpr(n) ? spr(n) : fb ? spr(fb) : null);

// ekran boyutunda ara tuval (maske/derleme için)
const _tmp = {};
function tmpCanvas(name) { if (!_tmp[name]) _tmp[name] = makeCanvas(W, H); const c = _tmp[name]; const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, W, H); return [c, x]; }

// grup saydamlığı: sahne önce ara tuvale çizilir, sonra tek parça olarak alfa ile basılır
// (katmanlar ayrı ayrı yarı saydam görünmez, çarpma/doygunluk katmanları da birlikte söner)
function withAlpha(ctx, a, fn, name = 'grup') {
  if (a <= 0.001) return;
  if (a >= 0.999) { fn(ctx); return; }
  const [c, x] = tmpCanvas(name); fn(x);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha *= a; ctx.drawImage(c, 0, 0); ctx.restore();
}

// akan su darbeleri: yolun içinde, akış yönünde kayan kısa açık darbeler
function waterShimmer(ctx, path, t, o = {}) {
  const r = rng(o.seed ?? 3); const n = o.n ?? 70; const bb = o.bbox ?? [0, 0, W, H];
  ctx.save(); ctx.clip(path);
  for (let i = 0; i < n; i++) {
    const bx = lerp(bb[0], bb[2], r()), by = lerp(bb[1], bb[3], r());
    const sp = (o.speed ?? 40) * (0.6 + r() * 0.8); const ph = r();
    const life = ((t * sp) / 160 + ph) % 1; // 0..1 döngü
    const fx = o.flow ? o.flow(bx, by) : [1, 0];
    const x = bx + fx[0] * (life - 0.5) * 160, y = by + fx[1] * (life - 0.5) * 160;
    const a = Math.sin(life * Math.PI) * (o.alpha ?? 0.7);
    const len = (o.len ?? 34) * (0.6 + r() * 0.8), wid = (o.wid ?? 4) * (0.7 + r() * 0.6);
    const ang = Math.atan2(fx[1], fx[0]);
    ctx.globalAlpha = a; ctx.fillStyle = r() < 0.6 ? (o.c1 ?? '#E8FBFF') : (o.c2 ?? '#9FE3F0');
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.beginPath(); ctx.ellipse(0, 0, len / 2, wid / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

// süzülen parçacıklar (yaprak, çiçek): t'de konum
function driftParticles(ctx, names, t, o = {}) {
  const r = rng(o.seed ?? 9); const n = o.n ?? 10;
  for (let i = 0; i < n; i++) {
    const name = names[i % names.length]; if (!hasSpr(name)) continue;
    const x0 = lerp(o.x0 ?? -50, o.x1 ?? W + 50, r()), sp = (o.speed ?? 90) * (0.7 + r() * 0.6), ph = r() * 10;
    const tt = t - (o.start ?? 0) - r() * (o.stagger ?? 0);
    if (tt < 0) continue;
    const y = (o.y0 ?? -80) + tt * sp; if (y > H + 100) continue;
    const x = x0 + Math.sin(tt * 1.3 + ph) * 60 + tt * (o.wind ?? 20);
    const rot = Math.sin(tt * 2.1 + ph) * 0.9 + ph;
    drawSpr(ctx, spr(name), x, y, (o.scale ?? 0.5) * (0.7 + r() * 0.6), rot, (o.alpha ?? 1) * Math.min(1, tt * 3));
  }
}

// sahne içi yumuşak geçiş için alfa
const fadeIn = (t, a, d = 0.35) => E.out2(inv(a, a + d, t));
const fadeOut = (t, a, d = 0.35) => 1 - E.in2(inv(a, a + d, t));

// ses efektleri işaretleri (render sırasında okunmaz; sfx.py için kaynak)
const SFX = [];
function sfx(t, kind, gain = 0, extra = {}) { SFX.push({ t: +t.toFixed(3), kind, gain, ...extra }); }
